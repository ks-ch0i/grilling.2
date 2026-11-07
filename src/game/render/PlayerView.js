import Phaser from 'phaser';
import { isAttackActive } from '../sim/player.js';
import { playerAnimation,animationFrame } from '../assets/animation.js';
import { ATTACK_STARTUP,ATTACK_ACTIVE,ATTACK_RECOVERY } from '../sim/constants.js';
import { attackRangePolygon } from '../sim/combat.js';
import { stageTerrain } from '../sim/stage.js';
export class PlayerView {
  constructor(scene){
    this.outline=scene.add.sprite(0,0,'hero-directions',0).setOrigin(.5,1).setDepth(4.5).setTint(0xffe0ab).setTintMode(Phaser.TintModes.FILL).setAlpha(.65).setScale(1.15);
    this.body=scene.add.sprite(0,0,'hero-directions',0).setOrigin(.5,1).setDepth(5);
    this.sword=scene.add.image(0,0,'sword').setOrigin(.16,.5).setDepth(6);
    this.slash=scene.add.sprite(0,0,'effects',0).setOrigin(.5,.5).setDepth(4).setScale(.8);
    this.attackRange=scene.add.graphics().setDepth(5.5);
    this.clipKey='';this.clipStart=0;
  }
  sync(player,scene,tick=0){
    const clip=playerAnimation(player);if(!clip)return;
    if(this.clipKey!==clip.key||tick<this.clipStart){this.clipKey=clip.key;this.clipStart=tick;}
    const frame=animationFrame(clip,tick-this.clipStart);
    if(this.body.texture.key!==clip.texture)this.body.setTexture(clip.texture,frame);else this.body.setFrame(frame);
    if(this.outline.texture.key!==clip.texture)this.outline.setTexture(clip.texture,frame);else this.outline.setFrame(frame);
    const x=Math.round(player.x+player.w/2),y=Math.round(player.y+player.h),aim=player.mode==='dive'?{x:0,y:1}:player.aim;
    this.outline.setPosition(x,y).setFlipX(clip.texture==='hero-actions'&&player.horizontalFacing<0);
    this.body.setPosition(x,y).setFlipX(clip.texture==='hero-actions'&&player.horizontalFacing<0).setAlpha(player.invulnerableTicks&&player.invulnerableTicks%4<2?.55:1);
    const dead=player.mode==='dead';this.sword.setVisible(!dead).setPosition(x,Math.round(player.y+player.h/2)).setRotation(Math.atan2(aim.y,aim.x));
    this.slash.setVisible(!dead&&isAttackActive(player)).setPosition(Math.round(x+aim.x*19),Math.round(player.y+player.h/2+aim.y*19)).setRotation(Math.atan2(aim.y,aim.x));
    const g=this.attackRange;g.clear();
    const locked=['intro','transition','dying','dead'].includes(scene.run.boss.state);
    if(player.mode==='attack'){
      const active=isAttackActive(player),after=player.attackTick>ATTACK_STARTUP+ATTACK_ACTIVE;
      const fade=after?Math.max(0,1-(player.attackTick-ATTACK_STARTUP-ATTACK_ACTIVE)/ATTACK_RECOVERY):1;
      const points=attackRangePolygon(player,stageTerrain(scene.stage,scene.run.arenaLocked));
      const center=points[0],edge=points.slice(1),last=edge.length-1;
      const arc=(scale,from,to)=>{const first=Math.floor(last*from),end=Math.max(first+1,Math.floor(last*to));g.beginPath();
        for(let i=first;i<=Math.min(last,end);i++){const p=edge[i],x=center.x+(p.x-center.x)*scale,y=center.y+(p.y-center.y)*scale;if(i===first)g.moveTo(x,y);else g.lineTo(x,y);}g.strokePath();};
      const glow=(active?1:.55)*fade*(locked ? .4 : 1),sweep=Math.min(1,Math.max(0,(player.attackTick-1)/(ATTACK_STARTUP+ATTACK_ACTIVE-1)));
      g.lineStyle(4,0x4c3030,.55*glow);arc(.98,.04,.96);
      g.lineStyle(2,0xffdf9e,.95*glow);arc(.98,.04,.96);
      g.lineStyle(2,0xfff4cf,glow);arc(.91,Math.max(0,sweep-.24),Math.min(1,sweep+.22));
      g.lineStyle(1,0xe8ad7e,.75*glow);arc(.75,.08,.48);arc(.70,.57,.93);
    }
  }
  destroy(){this.outline.destroy();this.body.destroy();this.sword.destroy();this.slash.destroy();this.attackRange.destroy();}
}
