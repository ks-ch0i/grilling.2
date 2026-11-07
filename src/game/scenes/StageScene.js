import Phaser from 'phaser';
import { FOREST_STAGE } from '../content/forestStage.js';
import { InputController } from '../input/InputController.js';
import { createStageRun, stepStage, checkpointData } from '../sim/stage.js';
import { PlayerView } from '../render/PlayerView.js';
import { EnemyView } from '../render/EnemyView.js';
const STEP=1000/60;
export class StageScene extends Phaser.Scene {
  constructor(){super('stage');}
  create(){
    this.stage=FOREST_STAGE;this.run=createStageRun(this.stage);this.accumulator=0;this.checkpointNotice=0;
    this.worldGraphics=this.add.graphics();this.playerView=new PlayerView(this);this.enemyView=new EnemyView(this);
    this.hud=this.add.text(12,10,'',{fontFamily:'monospace',fontSize:'14px',color:'#ffffff'}).setScrollFactor(0).setDepth(10);
    this.hudGraphics=this.add.graphics().setScrollFactor(0).setDepth(10);
    this.message=this.add.text(320,120,'',{fontFamily:'monospace',fontSize:'20px',color:'#ffffff'}).setOrigin(.5).setScrollFactor(0).setDepth(10);
    this.cameras.main.setBounds(0,0,this.stage.world.width,this.stage.world.height);this.cameras.main.roundPixels=true;
    this.inputController=new InputController(window,this.game.canvas);
    this.pauseReset=()=>{this.accumulator=0;this.inputController.reset();};
    window.addEventListener('blur',this.pauseReset);document.addEventListener('visibilitychange',this.pauseReset);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{window.removeEventListener('blur',this.pauseReset);document.removeEventListener('visibilitychange',this.pauseReset);this.inputController.destroy();this.playerView.destroy();this.enemyView.destroy();});
    this.renderWorld();
  }
  update(_time,delta){
    if(document.hidden||!document.hasFocus()){this.pauseReset();this.renderWorld();return;}
    this.accumulator+=Math.min(delta,STEP*8);let ticks=0;
    while(this.accumulator>=STEP&&ticks++<8){
      const result=stepStage(this.run,this.inputController.sample(this),this.stage);this.run=result.run;
      for(const event of result.events){if(event.type==='stage:checkpoint')this.checkpointNotice=120;this.events.emit(event.type,event);}
      if(this.checkpointNotice>0)this.checkpointNotice--;
      this.accumulator-=STEP;
    }
    this.renderWorld();
  }
  exportCheckpointData(){return checkpointData(this.run);}
  restoreCheckpointData(data){this.run=createStageRun(this.stage,data);this.pauseReset();this.renderWorld();}
  renderWorld(){
    const p=this.run.player, cam=this.cameras.main;
    const desired=Phaser.Math.Clamp(p.x+p.w/2+p.horizontalFacing*60-320,0,this.stage.world.width-640);
    cam.scrollX=Math.round(cam.scrollX+(desired-cam.scrollX)*.12);
    this.drawWorld();this.enemyView.sync(this.run);this.playerView.sync(p);
    const boss=this.run.boss,showBoss=boss.state!=='dormant'&&boss.state!=='dead';
    this.hud.setText(`FOREST 1   HP ${'♥'.repeat(p.hp)}${showBoss?'     FOREST GUARDIAN':''}`);
    this.hudGraphics.clear();if(showBoss){this.hudGraphics.fillStyle(0x312c2d);this.hudGraphics.fillRect(390,29,220,8);this.hudGraphics.fillStyle(0xe99166);this.hudGraphics.fillRect(390,29,Math.round(220*boss.hp/boss.maxHp),8);}
    this.message.setText(this.run.outcome==='clear'?'STAGE CLEAR':p.mode==='dead'?'RESPAWNING':this.checkpointNotice?'CHECKPOINT':'');
  }
  drawWorld(){
    const g=this.worldGraphics,stage=this.stage,cam=this.cameras.main;g.clear();
    const start=Math.max(0,Math.floor(cam.scrollX/240)*240-240),end=Math.min(stage.world.width,cam.scrollX+880);
    g.fillStyle(0x263a37);g.fillRect(start,0,end-start,304);
    for(let x=start;x<end;x+=240){g.fillStyle(0x304940);g.fillTriangle(x+20,240,x+90,42,x+160,240);g.fillStyle(0x354e40);g.fillRect(x+80,180,18,124);}
    for(const r of stage.solids){if(r.x>cam.scrollX+660||r.x+r.w<cam.scrollX-20)continue;g.fillStyle(0x52664a);g.fillRect(r.x,r.y,r.w,r.h);g.fillStyle(0x91ac70);g.fillRect(r.x,r.y,r.w,4);}
    const cp=stage.checkpoint;g.fillStyle(this.run.checkpoint==='mid'?0xffd873:0x96988e);g.fillRect(cp.x+5,cp.y-22,3,50);g.fillTriangle(cp.x+8,cp.y-22,cp.x+26,cp.y-15,cp.x+8,cp.y-8);
    for(const pickup of stage.pickups)if(!this.run.consumedPickupIds.includes(pickup.id)){g.fillStyle(0xe8716b);g.fillRect(pickup.x,pickup.y,16,16);g.fillStyle(0xffffff);g.fillRect(pickup.x+6,pickup.y+3,4,10);g.fillRect(pickup.x+3,pickup.y+6,10,4);}
    if(this.run.arenaLocked){g.fillStyle(0x9c7452);for(const x of [stage.arena.left,stage.arena.right])g.fillRect(x,0,16,304);}
  }
}
