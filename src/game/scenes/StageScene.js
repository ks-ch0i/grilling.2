import Phaser from 'phaser';
import { getStage } from '../content/stages.js';
import { InputController } from '../input/InputController.js';
import { createStageRun, stepStage, snapshotStageRun } from '../sim/stage.js';
import { diveImpactRect } from '../sim/combat.js';
import { PlayerView } from '../render/PlayerView.js';
import { EnemyView } from '../render/EnemyView.js';
import { MineHazardView } from '../render/MineHazardView.js';
import { bossDirection } from '../render/bossDirection.js';
import { getAppStore } from '../storage/appStore.js';
import { createRunCoordinator } from '../storage/runCoordinator.js';
import { markRunActive,clearRunActive } from '../storage/reloadRecovery.js';
import { getAudioManager } from '../audio/AudioManager.js';
import { mountMenu } from '../ui/menu.js';
import {createPracticeRun,isRoundSelectorEnabled} from '../dev/roundSelector.js';
const STEP=1000/60;
export class StageScene extends Phaser.Scene {
  constructor(){super('stage');}
  create(data={}){
    this.practiceTarget=isRoundSelectorEnabled({development:import.meta.env.DEV,enabled:import.meta.env.VITE_DEV_ROUND_SELECTOR!=='false'})?data.practiceTarget:null;
    this.run=this.practiceTarget?createPracticeRun(this.practiceTarget):createStageRun(getStage(data.run?.stageId??'forest-1'),data.run??{});
    this.stage=getStage(this.run.stageId);this.accumulator=0;
    this.paused=false;this.settingsOpen=false;this.pauseMenu=null;this.store=getAppStore();this.audio=getAudioManager();if(!this.practiceTarget)markRunActive();
    const mine=this.stage.id==='mine-1';
    this.backdrop=this.add.tileSprite(0,0,640,304,mine?'mine-backdrop':'forest').setOrigin(0,0).setScrollFactor(0).setDepth(-20).setTint(mine?0xffffff:0xb8b8b8);
    this.terrainBase=this.add.graphics().setDepth(-6);for(const r of this.stage.solids){this.terrainBase.fillStyle(0x392a29);this.terrainBase.fillRect(r.x,r.y,r.w,r.h);this.terrainBase.fillStyle(0x9aa36d);this.terrainBase.fillRect(r.x,r.y,r.w,2);}
    this.terrainViews=this.stage.solids.map(r=>this.add.tileSprite(r.x,r.y,r.w,r.h,mine?(r.y===304?'mine-ground':'mine-platform'):(r.y===304?'ground':'platform')).setOrigin(0,0).setDepth(-5));
    this.pickupViews=this.stage.pickups.map(p=>this.add.sprite(p.x+8,p.y+16,'objects',5).setOrigin(.5,1).setScale(.65).setDepth(1));
    this.worldGraphics=this.add.graphics().setDepth(1);this.light=mine?this.add.graphics().setDepth(-4):null;this.playerView=new PlayerView(this);this.enemyView=new EnemyView(this);this.mineHazardView=mine?new MineHazardView(this):null;this.visualEffects=[];
    this.hud=this.add.text(12,10,'',{fontFamily:'monospace',fontSize:'14px',color:'#ffffff'}).setScrollFactor(0).setDepth(10);
    this.hearts=[0,1,2].map(i=>this.add.sprite(105+i*25,32,'objects',7).setOrigin(.5,1).setScale(.5).setScrollFactor(0).setDepth(10));
    this.hudGraphics=this.add.graphics().setScrollFactor(0).setDepth(10);
    this.bossDirectionGraphics=this.add.graphics().setScrollFactor(0).setDepth(11);
    this.message=this.add.text(320,120,'',{fontFamily:'monospace',fontSize:'20px',color:'#ffffff',stroke:'#17131c',strokeThickness:4}).setOrigin(.5).setScrollFactor(0).setDepth(10);
    this.cameras.main.setBounds(0,0,this.stage.world.width,this.stage.world.height);this.cameras.main.roundPixels=true;
    this.inputController=new InputController(window,this.game.canvas);
    this.pauseReset=()=>{this.accumulator=0;this.inputController.reset();};
    this.coordinator=this.practiceTarget?{tick(){},flush(){return {ok:true};},dispose(){},isFinished:()=>false}:createRunCoordinator({store:this.store}).bind(this);
    this.onEscape=e=>{if(e.code==='Escape'&&!e.repeat&&!this.settingsOpen){e.preventDefault();if(this.paused)this.resumeGame();else this.pauseGame();}};
    this.onBlur=()=>this.pauseGame();
    this.onVisibility=()=>{if(document.hidden){this.pauseGame();this.coordinator.flush();}};
    this.onPageHide=()=>this.coordinator.flush();
    window.addEventListener('keydown',this.onEscape);window.addEventListener('blur',this.onBlur);window.addEventListener('pagehide',this.onPageHide);document.addEventListener('visibilitychange',this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      if(!this.coordinator.isFinished())this.coordinator.flush();this.coordinator.dispose();
      window.removeEventListener('keydown',this.onEscape);window.removeEventListener('blur',this.onBlur);window.removeEventListener('pagehide',this.onPageHide);document.removeEventListener('visibilitychange',this.onVisibility);
      this.pauseMenu?.remove();this.inputController.destroy();this.playerView.destroy();this.enemyView.destroy();this.mineHazardView?.destroy();this.light?.destroy();
    });
    this.renderWorld();
    if(data.recovered)this.pauseGame('마지막 저장 지점에서 복구했습니다.');
    else {this.audio.resumeMusic();this.audio.playMusic(this.musicForRun());}
  }
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
      }
      this.visualEffects=this.visualEffects.filter(effect=>{if(effect.until>this.run.elapsedTicks){if(effect.draw)effect.draw(this.run.elapsedTicks-effect.start);if(effect.fade)effect.sprite.setAlpha((effect.until-this.run.elapsedTicks)/effect.fade*(effect.strength??1));return true;}effect.sprite.destroy();return false;});
      if(this.run.player.mode==='run'&&this.run.player.grounded&&this.run.elapsedTicks%18===0)this.audio.playSfx('step');
      this.coordinator.tick();
      if(result.events.some(event=>event.type==='stage:clear')){if(!this.practiceTarget)clearRunActive();this.audio.pauseMusic();const record={elapsedTicks:this.run.elapsedTicks,deaths:this.run.deaths};this.scene.start('result',{stageId:this.run.stageId,record,practice:Boolean(this.practiceTarget)});return;}
      this.accumulator-=STEP;
    }
    this.renderWorld();
  }
  playEventSound(event){
    const sounds={jump:'jump',swing:'swing',roll:'roll','dive-impact':'dive',hurt:'hurt','stage:pickup':'heal','boss:intro':'bossIntro','boss:transition':'bossPhase','boss:death':'bossDeath','stage:clear':'victory','acid:pool':'acid','boss:worm-intro':'wormEmergence'};
    let id=sounds[event.type];if(event.type==='enemy:hurt'){const enemy=this.run.enemies.find(e=>e.id===event.id);id=enemy?.state==='dead'?'enemyDeath':'hit';}
    if(id)this.audio.playSfx(id);
    const player=this.run.player;
    if(event.type==='enemy:hurt'){const enemy=this.run.enemies.find(e=>e.id===event.id);if(enemy)this.showEffect(1,enemy.x+enemy.w/2,enemy.y+enemy.h/2);}
    if(event.type==='roll')this.showEffect(2,player.x+player.w/2,player.y+player.h);
    if(event.type==='dive-impact'){this.showEffect(3,event.x,event.y);this.showImpactWave(event.x,event.y,event.canDamage);}
    if(event.type==='stage:pickup')this.showEffect(4,player.x+player.w/2,player.y+player.h/2);
    if(event.type==='hazard:shatter'||event.type==='hazard:impact')this.showMineralBurst(event);
    if(event.type==='boss:intro')this.audio.playMusic(this.stage.id==='mine-1'?'mine-boss':'forest-boss');
    if(event.type==='stage:death')this.audio.playMusic(this.stage.id==='mine-1'?'mine':'forest');
    if(['enemy:hurt','boss:death','hurt'].includes(event.type)&&this.store.getSave().settings.screenShake)this.cameras.main.shake(70,.0015);
  }
  showEffect(frame,x,y){const sprite=this.add.sprite(Math.round(x),Math.round(y),'effects',frame).setDepth(7).setScale(.7);this.visualEffects.push({sprite,until:this.run.elapsedTicks+20});}
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
    if(this.paused)return;this.paused=true;this.pauseReset();this.inputController.setEnabled(false);this.coordinator.flush();this.audio.pauseMusic();
    this.pauseMenu=mountMenu('일시정지',notice);this.pauseMenu.button('재개',()=>this.resumeGame());this.pauseMenu.button('설정',()=>{this.settingsOpen=true;this.pauseMenu.hide();this.scene.launch('settings',{onClose:()=>{this.settingsOpen=false;this.pauseMenu?.show();}});});this.pauseMenu.button('처음 화면',()=>{if(!this.practiceTarget)clearRunActive();this.coordinator.flush();this.scene.start('title');});this.pauseMenu.focus();
  }
  musicForRun(){return this.run.boss.state!=='dormant'&&this.run.player.mode!=='dead'?(this.stage.id==='mine-1'?'mine-boss':'forest-boss'):(this.stage.id==='mine-1'?'mine':'forest');}
  resumeGame(){if(!this.paused||this.settingsOpen||document.hidden||!document.hasFocus())return;this.pauseMenu?.remove();this.pauseMenu=null;this.pauseReset();this.inputController.setEnabled(true);this.paused=false;if(!this.audio.unlocked){this.audio.setVolumes(this.store.getSave().settings);void this.audio.unlock();}this.audio.resumeMusic();this.audio.playMusic(this.musicForRun());}
  exportStageSnapshot(){return snapshotStageRun(this.run);}
  restoreStageSnapshot(data){this.run=createStageRun(this.stage,data);this.playerView.resetAttackIndicator();this.pauseReset();this.coordinator.flush();this.renderWorld();}
  renderWorld(){
    const p=this.run.player,cam=this.cameras.main,boss=this.run.boss;
    const target=boss.state==='intro'?((p.x+p.w/2-16)+(boss.x+boss.w/2+56))/2:p.x+p.w/2+p.horizontalFacing*60;
    const desired=Phaser.Math.Clamp(target-320,0,this.stage.world.width-640);
    cam.scrollX=Math.round(cam.scrollX+(desired-cam.scrollX)*.12);this.backdrop.tilePositionX=Math.round(cam.scrollX*.15);
    this.pickupViews.forEach((view,i)=>view.setVisible(!this.run.consumedPickupIds.includes(this.stage.pickups[i].id)));
    this.drawWorld();if(this.light){this.light.clear();this.light.fillStyle(0xffd793,.08).fillCircle(p.x+p.w/2,p.y+p.h/2,95);this.light.fillStyle(0xffeac0,.06).fillCircle(p.x+p.w/2,p.y+p.h/2,45);}this.enemyView.sync(this.run);this.mineHazardView?.sync(this.run);this.playerView.sync(p,this,this.run.elapsedTicks);
    const showBoss=boss.state!=='dormant'&&boss.state!=='dead';
    const label=this.stage.id==='mine-1'?(boss.kind==='worm'?'거대 벌레':'채굴 기계'):'FOREST GUARDIAN';
    this.hud.setText(`${this.stage.id==='mine-1'?'MINE 2':'FOREST 1'}${showBoss?'                         '+label:''}`);
    this.hearts.forEach((heart,i)=>heart.setFrame(i<p.hp?7:6));
    this.hudGraphics.clear();if(showBoss){this.hudGraphics.fillStyle(0x312c2d);this.hudGraphics.fillRect(390,29,220,8);this.hudGraphics.fillStyle(0xe99166);this.hudGraphics.fillRect(390,29,Math.round(220*boss.hp/boss.maxHp),8);}
    const direction=this.run.outcome?null:bossDirection(boss,{scrollX:cam.scrollX,width:640}),arrow=this.bossDirectionGraphics;
    arrow.clear();if(direction){const x=direction==='right'?626:14,y=Phaser.Math.Clamp(Math.round(boss.y+boss.h/2-cam.scrollY),72,280),tip=direction==='right'?x+5:x-5,base=direction==='right'?x-5:x+5;
      arrow.fillStyle(0xffdf9e).fillTriangle(tip,y,base,y-6,base,y+6);arrow.lineStyle(1,0x392a29).strokeTriangle(tip,y,base,y-6,base,y+6);}
    this.message.setText(this.run.outcome==='clear'?'STAGE CLEAR':p.mode==='dead'?'RESPAWNING':boss.state==='intro'?(this.stage.id==='mine-1'?(boss.kind==='worm'?'거대 벌레 등장':'채굴 기계 가동'):'숲의 수호자 등장'):'');
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
