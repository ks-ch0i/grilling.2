import Phaser from 'phaser';
import {enemyAttackRect} from '../sim/enemies.js';
import {enemyAnimation,bossAnimation,animationFrame} from '../assets/animation.js';
export class EnemyView {
  constructor(scene){this.scene=scene;this.graphics=scene.add.graphics().setDepth(3);this.enemies=new Map();this.projectiles=[];this.boss=null;this.bossClip='';this.bossStart=0;}
  sync(run){
    const g=this.graphics,tick=run.elapsedTicks;g.clear();const activeIds=new Set();
    for(const e of run.enemies){
      activeIds.add(e.id);let view=this.enemies.get(e.id);
      if(!view){view={outline:this.scene.add.sprite(0,0,e.kind,0).setOrigin(.5,1).setDepth(3.8).setTint(0xe6cda4).setTintMode(Phaser.TintModes.FILL).setAlpha(.48).setScale(1.1),sprite:this.scene.add.sprite(0,0,e.kind,0).setOrigin(.5,1).setDepth(4),clip:'',start:tick};this.enemies.set(e.id,view);}
      const clip=enemyAnimation(e);if(view.clip!==clip.key||tick<view.start){view.clip=clip.key;view.start=tick;}
      view.outline.setVisible(e.visible).setPosition(Math.round(e.x+e.w/2),Math.round(e.y+e.h)).setFlipX(e.facing<0).setFrame(animationFrame(clip,tick-view.start));
      view.sprite.setVisible(e.visible).setPosition(Math.round(e.x+e.w/2),Math.round(e.y+e.h)).setFlipX(e.facing<0).setFrame(animationFrame(clip,tick-view.start));
      if(e.state==='windup'){g.fillStyle(0xffba54,.25);const reach=e.kind==='soldier'?28:e.kind==='boar'?120:30;g.fillRect(e.lockedFacing<0?e.x-reach:e.x+e.w,e.y,reach,e.h);}
      const hit=enemyAttackRect(e);if(hit){g.fillStyle(0xff6046,.48);g.fillRect(hit.x,hit.y,hit.w,hit.h);}
    }
    for(const [id,view] of this.enemies)if(!activeIds.has(id)){view.outline.destroy();view.sprite.destroy();this.enemies.delete(id);}
    while(this.projectiles.length<run.projectiles.length)this.projectiles.push(this.scene.add.sprite(0,0,'effects',5).setDepth(5).setScale(.4));
    this.projectiles.forEach((sprite,i)=>{const p=run.projectiles[i];sprite.setVisible(Boolean(p));if(p)sprite.setPosition(Math.round(p.x+4),Math.round(p.y+4)).setRotation(Math.atan2(p.vy,p.vx));});
    const b=run.boss;if(!this.boss){this.bossOutline=this.scene.add.sprite(0,0,'boss',0).setOrigin(.5,1).setDepth(3.8).setTint(0xe6cda4).setTintMode(Phaser.TintModes.FILL).setAlpha(.55).setScale(1.04);this.boss=this.scene.add.sprite(0,0,'boss',0).setOrigin(.5,1).setDepth(4);}
    const clip=bossAnimation(b);if(this.bossClip!==clip.key||tick<this.bossStart){this.bossClip=clip.key;this.bossStart=tick;}
    this.bossOutline.setVisible(b.state!=='dormant'&&b.state!=='dead').setPosition(Math.round(b.x+b.w/2),Math.round(b.y+b.h)).setFrame(animationFrame(clip,tick-this.bossStart));
    this.boss.setVisible(b.state!=='dormant'&&b.state!=='dead').setPosition(Math.round(b.x+b.w/2),Math.round(b.y+b.h)).setFrame(animationFrame(clip,tick-this.bossStart));
    if(b.phase===2)this.boss.setTint(0xffc6b5);else this.boss.clearTint();
    for(const r of b.telegraphs){g.fillStyle(0xffce59,.25);g.fillRect(r.x,r.y,r.w,r.h);g.lineStyle(2,0xffd577);g.strokeRect(r.x,r.y,r.w,r.h);}
    for(const r of b.hitboxes){g.fillStyle(0xff5438,.45);g.fillRect(r.x,r.y,r.w,r.h);}
  }
  destroy(){this.graphics.destroy();for(const view of this.enemies.values()){view.outline.destroy();view.sprite.destroy();}for(const p of this.projectiles)p.destroy();this.boss?.destroy();this.bossOutline?.destroy();}
}
