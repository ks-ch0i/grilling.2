import {sampleFxFrame} from '../assets/bossFx.js';
import {AttackSpriteLayer} from './AttackSpriteLayer.js';
export class WormIntroView {
  constructor(scene){
    this.layer=new AttackSpriteLayer(scene);this.destroyed=false;
    this.dim=scene.add.rectangle(0,0,640,360,0x000000,1).setOrigin(0,0).setScrollFactor(0).setDepth(9).setAlpha(0).setVisible(false);
    this.blackout=scene.add.rectangle(0,0,640,360,0x000000,1).setOrigin(0,0).setScrollFactor(0).setDepth(100).setAlpha(0).setVisible(false);
  }
  sync(run,stage,timeline){
    if(this.destroyed)return;
    const dim=timeline?.mapDimAlpha??0,black=timeline?.blackoutAlpha??0;
    this.dim.setAlpha(dim).setVisible(dim>0);this.blackout.setAlpha(black).setVisible(black>0);
    if(!timeline||!['burst','reveal'].includes(timeline.phase)){this.layer.sync([]);return;}
    const burst=timeline.phase==='burst',key=burst?'entrance.burst':'entrance.settle';
    this.layer.sync([{id:burst?'worm-entrance-burst':'worm-entrance-settle',texture:'worm-entrance-fx',frame:sampleFxFrame(key,timeline.phaseTicks,timeline.phaseDuration),x:run.boss.x+run.boss.w/2,y:stage.arena.bottom-60,width:192,height:144,flipX:run.boss.lockedFacing>0,rotation:0,alpha:burst?1:1-timeline.phaseTicks/96,depth:6}]);
  }
  destroy(){if(this.destroyed)return;this.destroyed=true;this.layer.destroy();this.dim.destroy();this.blackout.destroy();}
}
