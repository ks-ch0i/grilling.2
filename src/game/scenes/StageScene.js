import Phaser from 'phaser';
import { getStage } from '../content/stages.js';
import { InputController } from '../input/InputController.js';
import { createStageRun, stepStage, snapshotStageRun } from '../sim/stage.js';
import { diveImpactRect } from '../sim/combat.js';
import { PlayerView } from '../render/PlayerView.js';
import {healthHeartState} from '../render/healthHearts.js';
import { EnemyView } from '../render/EnemyView.js';
import { MineHazardView } from '../render/MineHazardView.js';
import {WormIntroView} from '../render/WormIntroView.js';
import {getWormIntroTimeline} from '../sim/wormIntro.js';
import { bossDirection } from '../render/bossDirection.js';
import { CAMERA_EASING, CAMERA_ZOOM, cameraScrollTarget, visibleWorldBounds } from '../render/cameraFraming.js';
import { getAppStore } from '../storage/appStore.js';
import { createRunCoordinator } from '../storage/runCoordinator.js';
import { getAudioManager } from '../audio/AudioManager.js';
import {EVENT_SFX} from '../audio/eventSounds.js';
import { mountMenu } from '../ui/menu.js';
import {initializeEasyRun,isEasyRoundUnlocked,handleEasyDeath as handleEasyDeathFlow,handleEasyRoundClear as handleEasyRoundClearFlow,handleEasyStageClear as handleEasyStageClearFlow,showEasyChoice as showEasyChoiceFlow,showEasyRoundSelector as showEasyRoundSelectorFlow,startEasyRound as startEasyRoundFlow,leaveEasySession as leaveEasySessionFlow} from './easySession.js';
import {createPracticeRun,isRoundSelectorEnabled} from '../dev/roundSelector.js';
import {authoredPlatformPlacements,platformModulePlacements,platformTopEdgeSegments,terrainLayoutSignature} from '../render/platforms.js';
const STEP=1000/60;
const noopCoordinator=()=>({tick(){},flush(){return {ok:true};},dispose(){},isFinished:()=>false});
export class StageScene extends Phaser.Scene {
  constructor(){super('stage');}
  create(data={}){
    this.store=getAppStore();
    this.practiceTarget=isRoundSelectorEnabled({development:import.meta.env.DEV,enabled:import.meta.env.VITE_DEV_ROUND_SELECTOR!=='false'})?data.practiceTarget:null;
    this.easyDecisionOpen=false;this.easyDecisionMenu=null;this.easyDeathHandled=false;this.easyResultHandled=false;
    if(this.practiceTarget){this.mode='hard';this.run=createPracticeRun(this.practiceTarget);this.stage=getStage(this.run.stageId);}
    else if(!this.initializeRun(data))return;
    this.accumulator=0;
    this.paused=false;this.settingsOpen=false;this.pauseMenu=null;this.audio=getAudioManager();
    const mine=this.stage.id==='mine-1';
    this.backdrop=this.add.tileSprite(0,0,640,304,mine?'mine-backdrop':'forest').setOrigin(0,0).setScrollFactor(0).setDepth(-20).setTint(mine?0xffffff:0xb8b8b8);
    this.terrainBase=this.add.graphics().setDepth(-6);this.terrainViews=[];this.terrainSignature=null;this.syncTerrainViews();
    this.pickupViews=this.stage.pickups.map(p=>this.add.sprite(p.x+8,p.y+16,'objects',5).setOrigin(.5,1).setScale(.65).setDepth(1));
    this.worldGraphics=this.add.graphics().setDepth(1);this.light=mine?this.add.graphics().setDepth(-4):null;this.bossBlackout=mine?this.add.rectangle(0,0,640,360,0x050409,1).setOrigin(0,0).setScrollFactor(0).setDepth(2).setVisible(false):null;this.playerView=new PlayerView(this);this.enemyView=new EnemyView(this);this.mineHazardView=mine?new MineHazardView(this):null;this.wormIntroView=mine?new WormIntroView(this):null;this.visualEffects=[];
    this.hud=this.add.text(12,10,'',{fontFamily:'monospace',fontSize:'14px',color:'#ffffff'}).setScrollFactor(0).setDepth(10);
    this.roundHud=this.add.text(12,30,'',{fontFamily:'monospace',fontSize:'10px',color:'#ffe4a2'}).setStroke('#17131c',2).setScrollFactor(0).setDepth(10);
    this.bossHud=this.add.text(190,10,'',{fontFamily:'monospace',fontSize:'11px',color:'#fff1d1'}).setScrollFactor(0).setDepth(10);
    this.hearts=[0,1,2].map(i=>this.add.sprite(105+i*25,32,'objects',7).setOrigin(.5,1).setScale(.5).setScrollFactor(0).setDepth(10));
    this.halfHeart=this.add.sprite(0,0,'objects',7).setOrigin(.5,1).setScale(.5).setScrollFactor(0).setDepth(10.5).setVisible(false);
    this.hudGraphics=this.add.graphics().setScrollFactor(0).setDepth(10);
    this.bossDirectionGraphics=this.add.graphics().setScrollFactor(0).setDepth(11);
    this.message=this.add.text(320,120,'',{fontFamily:'monospace',fontSize:'20px',color:'#ffffff',stroke:'#17131c',strokeThickness:4}).setOrigin(.5).setScrollFactor(0).setDepth(10);
    this.configureCameras();
    this.inputController=new InputController(window,this.game.canvas);
    this.pauseReset=()=>{this.accumulator=0;this.inputController.reset();};
    this.coordinator=this.practiceTarget||this.mode==='easy'?noopCoordinator():createRunCoordinator({store:this.store}).bind(this);
    this.onEscape=e=>{if(e.code==='Escape'&&!e.repeat&&!this.settingsOpen){e.preventDefault();if(this.paused){if(!this.easyDecisionOpen)this.resumeGame();}else this.pauseGame();}};
    this.onBlur=()=>this.pauseGame();
    this.onVisibility=()=>{if(document.hidden){this.pauseGame();this.coordinator.flush();}};
    this.onPageHide=()=>this.coordinator.flush();
    window.addEventListener('keydown',this.onEscape);window.addEventListener('blur',this.onBlur);window.addEventListener('pagehide',this.onPageHide);document.addEventListener('visibilitychange',this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      if(!this.coordinator.isFinished())this.coordinator.flush();this.coordinator.dispose();
      window.removeEventListener('keydown',this.onEscape);window.removeEventListener('blur',this.onBlur);window.removeEventListener('pagehide',this.onPageHide);document.removeEventListener('visibilitychange',this.onVisibility);
      this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE,this.routeWorldObject,this);if(this.hudCamera)this.cameras.remove(this.hudCamera);this.screenSpaceObjects?.clear();this.hudCamera=null;
      this.easyDecisionOpen=false;this.easyDecisionMenu?.remove();this.easyBoardMenu?.remove();this.pauseMenu?.remove();this.inputController.destroy();this.playerView.destroy();this.enemyView.destroy();this.mineHazardView?.destroy();this.wormIntroView?.destroy();this.light?.destroy();this.bossBlackout?.destroy();
    });
    this.renderWorld();
    this.audio.resumeMusic();this.audio.playMusic(this.musicForRun());
  }
  initializeRun(data={}){
    return initializeEasyRun(this,data);
  }
  isEasyRoundUnlocked(stageId,round){
    return isEasyRoundUnlocked(this.store.getSave(),stageId,round);
  }
  handleEasyDeath(){return handleEasyDeathFlow(this);}
  handleEasyRoundClear(){return handleEasyRoundClearFlow(this);}
  handleEasyStageClear(){return handleEasyStageClearFlow(this);}
  showEasyChoice(kind){return showEasyChoiceFlow(this,kind);}
  showEasyRoundSelector(returnToKind){return showEasyRoundSelectorFlow(this,returnToKind);}
  startEasyRound(stageId,round){return startEasyRoundFlow(this,stageId,round);}
  leaveEasySession(){return leaveEasySessionFlow(this);}
  update(_time,delta){
    if(document.hidden||!document.hasFocus())this.pauseGame();
    if(this.paused){this.pauseReset();this.renderWorld();return;}
    this.accumulator+=Math.min(delta,STEP*8);let ticks=0;
    while(this.accumulator>=STEP&&ticks++<8){
      const previousBossHp=this.run.boss.hp,wasDead=this.run.player.mode==='dead';
      const result=stepStage(this.run,this.inputController.sample(this),this.stage);this.run=result.run;
      if(this.practiceTarget&&wasDead&&this.run.player.mode!=='dead'){const deaths=this.run.deaths;this.run=createPracticeRun(this.practiceTarget);this.run.deaths=deaths;this.playerView.resetAttackIndicator();}
      if(this.run.boss.hp<previousBossHp){const boss=this.run.boss;this.showEffect(1,boss.x+boss.w/2,boss.y+boss.h/2);this.audio.playSfx('hit');}
      for(const event of result.events){
        if(event.type==='stage:death'){for(const effect of this.visualEffects)effect.sprite.destroy();this.visualEffects=[];}
        this.playEventSound(event);this.events.emit(event.type,event);
        if(this.mode==='easy'){
          if(event.type==='stage:death')this.handleEasyDeath();
          else if(event.type==='round:clear')this.handleEasyRoundClear();
          else if(event.type==='stage:clear')this.handleEasyStageClear();
        }
      }
      if(this.easyDecisionOpen){this.accumulator=0;this.renderWorld();return;}
      this.visualEffects=this.visualEffects.filter(effect=>{if(effect.until>this.run.elapsedTicks){if(effect.draw)effect.draw(this.run.elapsedTicks-effect.start);if(effect.fade)effect.sprite.setAlpha((effect.until-this.run.elapsedTicks)/effect.fade*(effect.strength??1));return true;}effect.sprite.destroy();return false;});
      if(this.run.player.mode==='run'&&this.run.player.grounded&&this.run.elapsedTicks%18===0)this.audio.playSfx('step');
      this.coordinator.tick();
      if(result.events.some(event=>event.type==='stage:clear')){this.audio.pauseMusic();const record={elapsedTicks:this.run.elapsedTicks,deaths:this.run.deaths};this.scene.start('result',{stageId:this.run.stageId,record,practice:Boolean(this.practiceTarget),practiceTarget:this.practiceTarget});return;}
      this.accumulator-=STEP;
    }
    this.renderWorld();
  }
  configureCameras(){
    this.worldCamera=this.cameras.main.setZoom(CAMERA_ZOOM).setBounds(0,0,this.stage.world.width,this.stage.world.height).setRoundPixels(true);
    const initialTarget=cameraScrollTarget({player:this.run.player,boss:this.run.boss,worldWidth:this.stage.world.width,worldHeight:this.stage.world.height});
    this.worldCamera.setScroll(initialTarget.scrollX,initialTarget.scrollY);
    this.hudCamera=this.cameras.add(0,0,640,360,false,'hud').setZoom(1).setScroll(0,0).setRoundPixels(true);
    this.screenSpaceObjects=new Set([this.hud,this.roundHud,this.bossHud,...this.hearts,this.halfHeart,this.hudGraphics,this.bossDirectionGraphics,this.message,this.bossBlackout,this.wormIntroView?.dim,this.wormIntroView?.blackout].filter(Boolean));
    this.worldCamera.ignore([...this.screenSpaceObjects]);
    this.hudCamera.ignore(this.children.list.filter(object=>!this.screenSpaceObjects.has(object)));
    this.routeWorldObject=object=>{if(!this.screenSpaceObjects.has(object))this.hudCamera?.ignore(object);};
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE,this.routeWorldObject,this);
  }
  playEventSound(event){
    let id=EVENT_SFX[event.type];if(event.type==='enemy:hurt'){const enemy=this.run.enemies.find(e=>e.id===event.id);id=enemy?.state==='dead'?'enemyDeath':'hit';}
    if(id)this.audio.playSfx(id);
    const player=this.run.player;
    if(event.type==='enemy:hurt'){const enemy=this.run.enemies.find(e=>e.id===event.id);if(enemy)this.showEffect(1,enemy.x+enemy.w/2,enemy.y+enemy.h/2);}
    if(event.type==='shield:blocked'||event.type==='parry:blocked')this.showDefenseSpark(event,player);
    if(event.type==='roll')this.showEffect(2,player.x+player.w/2,player.y+player.h);
    if(event.type==='dive-impact'){this.showEffect(3,event.x,event.y);this.showImpactWave(event.x,event.y,event.canDamage);}
    if(event.type==='stage:pickup')this.showEffect(4,player.x+player.w/2,player.y+player.h/2);
    if(event.type==='hazard:shatter'||event.type==='hazard:impact')this.showMineralBurst(event);
    if(event.type==='boss:intro')this.audio.playMusic(this.stage.id==='mine-1'?'mine-boss':'forest-boss');
    if(event.type==='stage:death')this.audio.playMusic(this.stage.id==='mine-1'?'mine':'forest');
    if(['enemy:hurt','boss:death','hurt'].includes(event.type)&&this.store.getSave().settings.screenShake)this.cameras.main.shake(70,.0015);
  }
  showEffect(frame,x,y){const sprite=this.add.sprite(Math.round(x),Math.round(y),'effects',frame).setDepth(7).setScale(.7);this.visualEffects.push({sprite,until:this.run.elapsedTicks+20});}
  showDefenseSpark(event,player){
    const px=player.x+player.w/2,py=player.y+player.h/2,aim=player.aim??{x:player.horizontalFacing,y:0};
    const x=Phaser.Math.Clamp(Number.isFinite(event.originX)?event.originX:px+aim.x*10,player.x-4,player.x+player.w+4);
    const y=Phaser.Math.Clamp(Number.isFinite(event.originY)?event.originY:py,player.y+3,player.y+player.h-3);
    const isShield=event.type==='shield:blocked',duration=12,sprite=this.add.graphics().setDepth(7);
    const core=isShield?0xfff0b0:0xe7ffff,accent=isShield?0xffa94f:0x77d8df,shadow=isShield?0x7b4338:0x315e78;
    const draw=elapsed=>{const progress=Math.min(1,elapsed/duration),alpha=1-progress*.8,distance=3+progress*10;sprite.clear();
      sprite.fillStyle(shadow,alpha).fillRect(Math.round(x-4),Math.round(y-4),8,8);
      sprite.fillStyle(core,alpha).fillRect(Math.round(x-2),Math.round(y-2),4,4);
      for(let i=0;i<6;i++){const angle=i*Math.PI/3+(isShield?0:Math.PI/6),fx=Math.round(x+Math.cos(angle)*distance),fy=Math.round(y+Math.sin(angle)*distance);sprite.fillStyle(i%2?accent:core,alpha).fillRect(fx-1,fy-1,2,2);}
    };
    draw(0);this.visualEffects.push({sprite,start:this.run.elapsedTicks,until:this.run.elapsedTicks+duration,fade:duration,draw});
  }
  showMineralBurst(event){
    const sprite=this.add.graphics().setDepth(7),duration=12,base=(event.id?.length??0)*.17;
    const pieces=Array.from({length:7},(_,i)=>{const angle=base+i*Math.PI*2/7,speed=5+(i%3)*2;return {angle,speed,size:2+i%2};});
    const draw=elapsed=>{const progress=Math.min(1,elapsed/duration);sprite.clear();for(const [i,piece] of pieces.entries()){
      const x=event.x+Math.cos(piece.angle)*piece.speed*progress,y=event.y+Math.sin(piece.angle)*piece.speed*progress+progress*progress*4;
      sprite.fillStyle(i%2?0x7de1cf:0xffca72,1-progress*.75).fillTriangle(x,y-piece.size,x-piece.size,y+piece.size,x+piece.size,y+piece.size);
    }};
    draw(0);this.visualEffects.push({sprite,start:this.run.elapsedTicks,until:this.run.elapsedTicks+duration,fade:duration,draw});
  }
  showImpactWave(x,y,canDamage){
    const r=diveImpactRect(x,y),sprite=this.add.graphics().setDepth(7),duration=18;
    const draw=elapsed=>{const progress=Math.min(1,(elapsed+2)/12),w=r.w*progress,h=r.h*progress;sprite.clear();
      sprite.lineStyle(4,0x4c3030,.65).strokeEllipse(x,y,w,h,24);
      sprite.lineStyle(2,0xffdda1,1).strokeEllipse(x,y,w,h,24);
      if(progress>.35)sprite.lineStyle(1,0xfff2cd,.8).strokeEllipse(x,y,w*.68,h*.68,24);
    };
    draw(0);this.visualEffects.push({sprite,start:this.run.elapsedTicks,until:this.run.elapsedTicks+duration,fade:duration,strength:canDamage?1:.4,draw});
  }
  pauseGame(notice=''){
    if(this.easyDecisionOpen){this.pauseReset();return;}
    if(this.paused)return;this.paused=true;this.pauseReset();this.inputController.setEnabled(false);this.coordinator.flush();this.audio.pauseMusic();
    this.pauseMenu=mountMenu('일시정지',notice);this.pauseMenu.button('재개',()=>this.resumeGame());this.pauseMenu.button('설정',()=>{this.settingsOpen=true;this.pauseMenu.hide();this.scene.launch('settings',{onClose:()=>{this.settingsOpen=false;this.pauseMenu?.show();}});});this.pauseMenu.button('처음 화면',()=>{this.coordinator.flush();this.scene.start('title');});this.pauseMenu.focus();
  }
  musicForRun(){return this.run.boss.state!=='dormant'&&this.run.player.mode!=='dead'?(this.stage.id==='mine-1'?'mine-boss':'forest-boss'):(this.stage.id==='mine-1'?'mine':'forest');}
  resumeGame(){if(!this.paused||this.easyDecisionOpen||this.settingsOpen||document.hidden||!document.hasFocus())return;this.pauseMenu?.remove();this.pauseMenu=null;this.pauseReset();this.inputController.setEnabled(true);this.paused=false;if(!this.audio.unlocked){this.audio.setVolumes(this.store.getSave().settings);void this.audio.unlock();}this.audio.resumeMusic();this.audio.playMusic(this.musicForRun());}
  pauseEasyDecision(){
    this.easyDecisionOpen=true;this.paused=true;this.pauseReset();this.inputController.setEnabled(false);this.audio.pauseMusic();
  }
  exportStageSnapshot(){return snapshotStageRun(this.run);}
  restoreStageSnapshot(data){this.run=createStageRun(this.stage,data);this.playerView.resetAttackIndicator();this.pauseReset();this.coordinator.flush();this.renderWorld();}
  syncTerrainViews(){
    if(!this.run?.terrainLayout||!Array.isArray(this.run.terrainLayout.platforms))throw new TypeError('Run terrain layout is required');
    const mine=this.stage.id==='mine-1',floor=this.stage.solids[0],layout=this.run.terrainLayout;
    const signature=terrainLayoutSignature(layout,floor);
    if(signature===this.terrainSignature)return;
    for(const view of this.terrainViews)view.destroy();
    this.terrainBase.clear();
    this.terrainBase.fillStyle(0x392a29).fillRect(floor.x,floor.y,floor.w,floor.h);
    this.terrainBase.fillStyle(0x9aa36d).fillRect(floor.x,floor.y,floor.w,2);
    this.terrainViews=[this.add.tileSprite(floor.x,floor.y,floor.w,floor.h,mine?'mine-ground':'ground').setOrigin(0,0).setDepth(-5)];
    if(layout.mode==='authored'){
      for(const {x,y,texture,frame} of authoredPlatformPlacements(this.stage.id,layout)){
        this.terrainViews.push(this.add.image(x,y,texture,frame).setOrigin(0,0).setDepth(-5));
      }
      this.terrainSignature=signature;
      return;
    }
    for(const platform of layout.platforms){
      if(Array.isArray(platform.topProfile)){
        const texture=mine?'mine-platform-modules':'forest-platform-modules';
        const topColor=mine?[0x211916,0x17181d,0x211c1f,0x2b2623][platform.variant]:[0x272517,0x302e1c,0x363322,0x2e2c1b][platform.variant];
        for(const placement of platformModulePlacements(platform)){
          this.terrainBase.fillStyle(mine?0x111116:0x321f29).fillRect(placement.x,placement.y,16,32);
          // The packed frame has a one-pixel top gutter; lift it so the visible
          // top row lines up with the saved collision surface.
          this.terrainViews.push(this.add.image(placement.x,placement.y-1,texture,placement.frame).setOrigin(0,0).setDepth(-5));
        }
        this.terrainBase.fillStyle(topColor);
        for(const segment of platformTopEdgeSegments(platform))this.terrainBase.fillRect(segment.x,segment.y,segment.w,segment.h);
      }else{
        this.terrainBase.fillStyle(0x392a29).fillRect(platform.x,platform.y,platform.w,platform.h);
        this.terrainBase.fillStyle(0x9aa36d).fillRect(platform.x,platform.y,platform.w,2);
        this.terrainViews.push(this.add.tileSprite(platform.x,platform.y,platform.w,platform.h,mine?'mine-platform':'platform').setOrigin(0,0).setDepth(-5));
      }
    }
    this.terrainSignature=signature;
  }
  renderWorld(){
    this.syncTerrainViews();
    const p=this.run.player,cam=this.cameras.main,boss=this.run.boss;
    const intro=this.run.bossSequence==='worm-intro'&&boss.kind==='worm'?getWormIntroTimeline(boss.stateTicks):null;
    this.wormIntroView?.sync(this.run,this.stage,intro);
    const blackout=boss.kind==='worm'&&boss.state==='transition';this.bossBlackout?.setVisible(blackout).setAlpha(blackout ? 0.9 : 0);
    const target=cameraScrollTarget({player:p,boss,worldWidth:this.stage.world.width,worldHeight:this.stage.world.height});
    cam.scrollX+=(target.scrollX-cam.scrollX)*CAMERA_EASING;
    cam.scrollY+=(target.scrollY-cam.scrollY)*CAMERA_EASING;
    const bounds=visibleWorldBounds(cam);
    this.backdrop.tilePositionX=Math.round(cam.scrollX*.15);this.backdrop.tilePositionY=Math.round(cam.scrollY*.15);
    this.pickupViews.forEach((view,i)=>view.setVisible(!this.run.consumedPickupIds.includes(this.stage.pickups[i].id)));
    this.drawWorld();if(this.light){this.light.clear();this.light.fillStyle(0xffd793,.08).fillCircle(p.x+p.w/2,p.y+p.h/2,95);this.light.fillStyle(0xffeac0,.06).fillCircle(p.x+p.w/2,p.y+p.h/2,45);}this.enemyView.sync(this.run,{bossVisible:intro?.showBody??true,bossElapsedTicks:intro?.phase==='reveal'?intro.phaseTicks:undefined});this.mineHazardView?.sync(this.run);this.playerView.sync(p,this,this.run.elapsedTicks);
    const showBoss=boss.state!=='dormant'&&boss.state!=='dead'&&(intro?.showBossHud??true);
    const label=this.stage.id==='mine-1'?(boss.kind==='worm'?'거대 벌레':'채굴 기계'):'FOREST GUARDIAN';
    this.hud.setText(this.stage.id==='mine-1'?'MINE 2':'FOREST 1');
    this.roundHud.setText(`ROUND ${this.run.round} / 8`);
    this.bossHud.setText(showBoss?label:'').setVisible(showBoss);
    let halfIndex=-1;
    this.hearts.forEach((heart,i)=>{const state=healthHeartState(p.hp,i);heart.setFrame(state==='full'?7:6);if(state==='half')halfIndex=i;});
    if(halfIndex>=0){const heart=this.hearts[halfIndex];this.halfHeart.setPosition(heart.x,heart.y).setFrame(7).setCrop(0,0,32,64).setVisible(true);}
    else this.halfHeart.setCrop().setVisible(false);
    this.hudGraphics.clear();if(showBoss){this.hudGraphics.fillStyle(0x312c2d);this.hudGraphics.fillRect(190,29,430,8);this.hudGraphics.fillStyle(0xe99166);this.hudGraphics.fillRect(190,29,Math.round(430*boss.hp/boss.maxHp),8);}
    const direction=this.run.outcome||intro&&!intro.showBossHud?null:bossDirection(boss,bounds),arrow=this.bossDirectionGraphics;
    arrow.clear();if(direction){const x=direction==='right'?626:14,y=Phaser.Math.Clamp(Math.round((boss.y+boss.h/2-bounds.top)*cam.zoom),72,280),tip=direction==='right'?x+5:x-5,base=direction==='right'?x-5:x+5;
      arrow.fillStyle(0xffdf9e).fillTriangle(tip,y,base,y-6,base,y+6);arrow.lineStyle(1,0x392a29).strokeTriangle(tip,y,base,y-6,base,y+6);}
    const roundCleared=this.run.roundClearTicks!==null;
    this.message.setColor(roundCleared?'#ffe49b':'#ffffff').setFontSize(roundCleared?'24px':'20px');
    this.message.setText(this.run.outcome==='clear'?'STAGE CLEAR':p.mode==='dead'?'RESPAWNING':roundCleared?'ROUND CLEAR':boss.state==='intro'&&(!intro||intro.showBossHud)?(this.stage.id==='mine-1'?(boss.kind==='worm'?'거대 벌레 등장':'채굴 기계 가동'):'숲의 수호자 등장'):'');
  }
  drawWorld(){
    const g=this.worldGraphics,stage=this.stage;g.clear();
    if(this.run.arenaLocked){g.fillStyle(0x6d453f);for(const x of [stage.arena.left,stage.arena.right]){g.fillRect(x,0,16,304);g.lineStyle(2,0xd1a26d);g.strokeRect(x,0,16,304);}}
    const boss=this.run.boss;
    if(stage.id!=='mine-1'&&boss.state==='transition'){
      const age=90-boss.stateTicks,beat=Math.sin(age*.42),base=stage.arena.bottom,cx=boss.x+boss.w/2;
      for(const side of [-1,1]){
        const rootX=cx+side*18,reach=25+beat*5,height=17+Math.abs(beat)*9,endX=rootX+side*reach;
        g.lineStyle(7,0x54383b,.8).beginPath().moveTo(rootX,base).lineTo(rootX+side*4,base-height*.55).lineTo(endX,base-height).strokePath();
        g.lineStyle(3,0x9a6458,.9).beginPath().moveTo(rootX,base).lineTo(rootX+side*4,base-height*.55).lineTo(endX,base-height).strokePath();
        g.fillStyle(0xffd38a,.22+Math.abs(beat)*.22).fillCircle(endX,base-height,4+Math.abs(beat)*2);
      }
    }
  }
}
