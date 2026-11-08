import Phaser from 'phaser';
import { FOREST_STAGE } from '../content/forestStage.js';
import { InputController } from '../input/InputController.js';
import { createStageRun, stepStage, snapshotStageRun } from '../sim/stage.js';
import { diveImpactRect } from '../sim/combat.js';
import { PlayerView } from '../render/PlayerView.js';
import { EnemyView } from '../render/EnemyView.js';
import { bossDirection } from '../render/bossDirection.js';
import { getAppStore } from '../storage/appStore.js';
import { createRunCoordinator } from '../storage/runCoordinator.js';
import { markRunActive,clearRunActive } from '../storage/reloadRecovery.js';
import { getAudioManager } from '../audio/AudioManager.js';
import { mountMenu } from '../ui/menu.js';
const STEP=1000/60;
export class StageScene extends Phaser.Scene {
  constructor(){super('stage');}
  create(data={}){
    this.stage=FOREST_STAGE;this.run=createStageRun(this.stage,data.run??{});this.accumulator=0;
    this.paused=false;this.settingsOpen=false;this.pauseMenu=null;this.store=getAppStore();this.audio=getAudioManager();markRunActive();
    this.backdrop=this.add.tileSprite(0,0,640,304,'forest').setOrigin(0,0).setScrollFactor(0).setDepth(-20).setTint(0xb8b8b8);
    this.terrainBase=this.add.graphics().setDepth(-6);for(const r of this.stage.solids){this.terrainBase.fillStyle(0x392a29);this.terrainBase.fillRect(r.x,r.y,r.w,r.h);this.terrainBase.fillStyle(0x9aa36d);this.terrainBase.fillRect(r.x,r.y,r.w,2);}
    this.terrainViews=this.stage.solids.map(r=>this.add.tileSprite(r.x,r.y,r.w,r.h,r.y===304?'ground':'platform').setOrigin(0,0).setDepth(-5));
    this.pickupViews=this.stage.pickups.map(p=>this.add.sprite(p.x+8,p.y+16,'objects',5).setOrigin(.5,1).setScale(.65).setDepth(1));
    this.worldGraphics=this.add.graphics().setDepth(1);this.playerView=new PlayerView(this);this.enemyView=new EnemyView(this);this.visualEffects=[];
    this.hud=this.add.text(12,10,'',{fontFamily:'monospace',fontSize:'14px',color:'#ffffff'}).setScrollFactor(0).setDepth(10);
    this.hearts=[0,1,2].map(i=>this.add.sprite(105+i*25,32,'objects',7).setOrigin(.5,1).setScale(.5).setScrollFactor(0).setDepth(10));
    this.hudGraphics=this.add.graphics().setScrollFactor(0).setDepth(10);
    this.bossDirectionGraphics=this.add.graphics().setScrollFactor(0).setDepth(11);
    this.message=this.add.text(320,120,'',{fontFamily:'monospace',fontSize:'20px',color:'#ffffff',stroke:'#17131c',strokeThickness:4}).setOrigin(.5).setScrollFactor(0).setDepth(10);
    this.cameras.main.setBounds(0,0,this.stage.world.width,this.stage.world.height);this.cameras.main.roundPixels=true;
    this.inputController=new InputController(window,this.game.canvas);
    this.pauseReset=()=>{this.accumulator=0;this.inputController.reset();};
    this.coordinator=createRunCoordinator({store:this.store}).bind(this);
    this.onEscape=e=>{if(e.code==='Escape'&&!e.repeat&&!this.settingsOpen){e.preventDefault();if(this.paused)this.resumeGame();else this.pauseGame();}};
    this.onBlur=()=>this.pauseGame();
    this.onVisibility=()=>{if(document.hidden){this.pauseGame();this.coordinator.flush();}};
    this.onPageHide=()=>this.coordinator.flush();
    window.addEventListener('keydown',this.onEscape);window.addEventListener('blur',this.onBlur);window.addEventListener('pagehide',this.onPageHide);document.addEventListener('visibilitychange',this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      if(!this.coordinator.isFinished())this.coordinator.flush();this.coordinator.dispose();
      window.removeEventListener('keydown',this.onEscape);window.removeEventListener('blur',this.onBlur);window.removeEventListener('pagehide',this.onPageHide);document.removeEventListener('visibilitychange',this.onVisibility);
      this.pauseMenu?.remove();this.inputController.destroy();this.playerView.destroy();this.enemyView.destroy();
    });
    this.renderWorld();
    if(data.recovered)this.pauseGame('마지막 저장 지점에서 복구했습니다.');
  }
  update(_time,delta){
    if(document.hidden||!document.hasFocus())this.pauseGame();
    if(this.paused){this.pauseReset();this.renderWorld();return;}
    this.accumulator+=Math.min(delta,STEP*8);let ticks=0;
    while(this.accumulator>=STEP&&ticks++<8){
      const previousBossHp=this.run.boss.hp;
      const result=stepStage(this.run,this.inputController.sample(this),this.stage);this.run=result.run;
      if(this.run.boss.hp<previousBossHp){const boss=this.run.boss;this.showEffect(1,boss.x+boss.w/2,boss.y+boss.h/2);this.audio.playSfx('hit');}
      for(const event of result.events){
        if(event.type==='stage:death'){for(const effect of this.visualEffects)effect.sprite.destroy();this.visualEffects=[];}
        this.playEventSound(event);this.events.emit(event.type,event);
      }
      this.visualEffects=this.visualEffects.filter(effect=>{if(effect.until>this.run.elapsedTicks){if(effect.draw)effect.draw(this.run.elapsedTicks-effect.start);if(effect.fade)effect.sprite.setAlpha((effect.until-this.run.elapsedTicks)/effect.fade*(effect.strength??1));return true;}effect.sprite.destroy();return false;});
      if(this.run.player.mode==='run'&&this.run.player.grounded&&this.run.elapsedTicks%18===0)this.audio.playSfx('step');
      this.coordinator.tick();
      if(result.events.some(event=>event.type==='stage:clear')){clearRunActive();this.audio.pauseMusic();const record={elapsedTicks:this.run.elapsedTicks,deaths:this.run.deaths};this.scene.start('result',{record});return;}
      this.accumulator-=STEP;
    }
    this.renderWorld();
  }
  playEventSound(event){
    const sounds={jump:'jump',swing:'swing',roll:'roll','dive-impact':'dive',hurt:'hurt','stage:pickup':'heal','boss:intro':'bossIntro','boss:transition':'bossPhase','boss:death':'bossDeath','stage:clear':'victory'};
    let id=sounds[event.type];if(event.type==='enemy:hurt'){const enemy=this.run.enemies.find(e=>e.id===event.id);id=enemy?.state==='dead'?'enemyDeath':'hit';}
    if(id)this.audio.playSfx(id);
    const player=this.run.player;
    if(event.type==='enemy:hurt'){const enemy=this.run.enemies.find(e=>e.id===event.id);if(enemy)this.showEffect(1,enemy.x+enemy.w/2,enemy.y+enemy.h/2);}
    if(event.type==='roll')this.showEffect(2,player.x+player.w/2,player.y+player.h);
    if(event.type==='dive-impact'){this.showEffect(3,event.x,event.y);this.showImpactWave(event.x,event.y,event.canDamage);}
    if(event.type==='stage:pickup')this.showEffect(4,player.x+player.w/2,player.y+player.h/2);
    if(event.type==='boss:intro')this.audio.playMusic('boss');
    if(['enemy:hurt','boss:death','hurt'].includes(event.type)&&this.store.getSave().settings.screenShake)this.cameras.main.shake(70,.0015);
  }
  showEffect(frame,x,y){const sprite=this.add.sprite(Math.round(x),Math.round(y),'effects',frame).setDepth(7).setScale(.7);this.visualEffects.push({sprite,until:this.run.elapsedTicks+20});}
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
    this.pauseMenu=mountMenu('일시정지',notice);this.pauseMenu.button('재개',()=>this.resumeGame());this.pauseMenu.button('설정',()=>{this.settingsOpen=true;this.pauseMenu.hide();this.scene.launch('settings',{onClose:()=>{this.settingsOpen=false;this.pauseMenu?.show();}});});this.pauseMenu.button('처음 화면',()=>{clearRunActive();this.coordinator.flush();this.scene.start('title');});this.pauseMenu.focus();
  }
  resumeGame(){if(!this.paused||this.settingsOpen||document.hidden||!document.hasFocus())return;this.pauseMenu?.remove();this.pauseMenu=null;this.pauseReset();this.inputController.setEnabled(true);this.paused=false;if(!this.audio.unlocked){this.audio.setVolumes(this.store.getSave().settings);void this.audio.unlock();this.audio.resumeMusic();this.audio.playMusic('forest');}else this.audio.resumeMusic();}
  exportStageSnapshot(){return snapshotStageRun(this.run);}
  restoreStageSnapshot(data){this.run=createStageRun(this.stage,data);this.playerView.resetAttackIndicator();this.pauseReset();this.coordinator.flush();this.renderWorld();}
  renderWorld(){
    const p=this.run.player,cam=this.cameras.main,boss=this.run.boss;
    const target=boss.state==='intro'?((p.x+p.w/2-16)+(boss.x+boss.w/2+56))/2:p.x+p.w/2+p.horizontalFacing*60;
    const desired=Phaser.Math.Clamp(target-320,0,this.stage.world.width-640);
    cam.scrollX=Math.round(cam.scrollX+(desired-cam.scrollX)*.12);this.backdrop.tilePositionX=Math.round(cam.scrollX*.15);
    this.pickupViews.forEach((view,i)=>view.setVisible(!this.run.consumedPickupIds.includes(this.stage.pickups[i].id)));
    this.drawWorld();this.enemyView.sync(this.run);this.playerView.sync(p,this,this.run.elapsedTicks);
    const showBoss=boss.state!=='dormant'&&boss.state!=='dead';
    this.hud.setText(`FOREST 1${showBoss?'                         FOREST GUARDIAN':''}`);
    this.hearts.forEach((heart,i)=>heart.setFrame(i<p.hp?7:6));
    this.hudGraphics.clear();if(showBoss){this.hudGraphics.fillStyle(0x312c2d);this.hudGraphics.fillRect(390,29,220,8);this.hudGraphics.fillStyle(0xe99166);this.hudGraphics.fillRect(390,29,Math.round(220*boss.hp/boss.maxHp),8);}
    const direction=this.run.outcome?null:bossDirection(boss,{scrollX:cam.scrollX,width:640}),arrow=this.bossDirectionGraphics;
    arrow.clear();if(direction){const x=direction==='right'?626:14,y=Phaser.Math.Clamp(Math.round(boss.y+boss.h/2-cam.scrollY),72,280),tip=direction==='right'?x+5:x-5,base=direction==='right'?x-5:x+5;
      arrow.fillStyle(0xffdf9e).fillTriangle(tip,y,base,y-6,base,y+6);arrow.lineStyle(1,0x392a29).strokeTriangle(tip,y,base,y-6,base,y+6);}
    this.message.setText(this.run.outcome==='clear'?'STAGE CLEAR':p.mode==='dead'?'RESPAWNING':boss.state==='intro'?'숲의 수호자 등장':'');
  }
  drawWorld(){
    const g=this.worldGraphics,stage=this.stage;g.clear();
    if(this.run.arenaLocked){g.fillStyle(0x6d453f);for(const x of [stage.arena.left,stage.arena.right]){g.fillRect(x,0,16,304);g.lineStyle(2,0xd1a26d);g.strokeRect(x,0,16,304);}}
  }
}
