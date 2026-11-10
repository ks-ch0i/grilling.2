import Phaser from 'phaser';
import {enemyAttackRect} from '../sim/enemies.js';
import {enemyAnimation,bossAnimation,animationFrame} from '../assets/animation.js';
import {drawMachineBossEffect,drawWormBossEffect} from './bossEffects.js';
import {AttackSpriteLayer} from './AttackSpriteLayer.js';
import {collectForestAttackItems} from './forestAttackPresentation.js';
export class EnemyView {
  constructor(scene){this.scene=scene;this.graphics=scene.add.graphics().setDepth(3);this.bossEffects=scene.add.graphics().setDepth(4.4);this.forestLayer=new AttackSpriteLayer(scene);this.enemies=new Map();this.projectiles=[];this.boss=null;this.bossClip='';this.bossStart=0;}
  sync(run){
    const g=this.graphics,tick=run.elapsedTicks;g.clear();this.bossEffects.clear();const activeIds=new Set();
    for(const e of run.enemies){
      activeIds.add(e.id);let view=this.enemies.get(e.id);
      if(!view){view={outline:this.scene.add.sprite(0,0,e.kind,0).setOrigin(.5,1).setDepth(3.8).setTint(0xe6cda4).setTintMode(Phaser.TintModes.FILL).setAlpha(.48).setScale(1.1),sprite:this.scene.add.sprite(0,0,e.kind,0).setOrigin(.5,1).setDepth(4),clip:'',start:tick};this.enemies.set(e.id,view);}
      const clip=enemyAnimation(e);if(view.clip!==clip.key||tick<view.start){view.clip=clip.key;view.start=tick;}
      view.outline.setVisible(e.visible).setPosition(Math.round(e.x+e.w/2),Math.round(e.y+e.h)).setFlipX(e.facing<0).setFrame(animationFrame(clip,tick-view.start));
      view.sprite.setVisible(e.visible).setPosition(Math.round(e.x+e.w/2),Math.round(e.y+e.h)).setFlipX(e.facing<0).setFrame(animationFrame(clip,tick-view.start));
      if(e.state==='windup'){g.fillStyle(0xffba54,.25);const reach=e.kind==='soldier'?28:e.kind==='boar'?120:e.kind==='golem'?64:30;g.fillRect(e.lockedFacing<0?e.x-reach:e.x+e.w,e.y,reach,e.h);if(e.kind==='bat'&&e.lockedTarget){g.lineStyle(2,0xffc36b,.8).lineBetween(e.x+e.w/2,e.y+e.h/2,e.lockedTarget.x,e.lockedTarget.y);}}
      const hit=enemyAttackRect(e);if(hit){g.fillStyle(0xff6046,.48);g.fillRect(hit.x,hit.y,hit.w,hit.h);}
    }
    for(const [id,view] of this.enemies)if(!activeIds.has(id)){view.outline.destroy();view.sprite.destroy();this.enemies.delete(id);}
    while(this.projectiles.length<run.projectiles.length)this.projectiles.push(this.scene.add.sprite(0,0,'effects',5).setDepth(5).setScale(.4));
    this.projectiles.forEach((sprite,i)=>{const p=run.projectiles[i];sprite.setVisible(Boolean(p));if(p)sprite.setPosition(Math.round(p.x+4),Math.round(p.y+4)).setRotation(Math.atan2(p.vy,p.vx));});
    const b=run.boss,key=['machine','worm'].includes(b.kind)?b.kind:'boss';
    if(this.boss&&this.bossKey!==key){this.boss.destroy();this.bossOutline.destroy();this.boss=null;this.bossClip='';}
    if(!this.boss){this.bossKey=key;this.bossOutline=this.scene.add.sprite(0,0,key,0).setOrigin(.5,1).setDepth(3.8).setTint(0xe6cda4).setTintMode(Phaser.TintModes.FILL).setAlpha(.55).setScale(1.04);this.boss=this.scene.add.sprite(0,0,key,0).setOrigin(.5,1).setDepth(4);}
    const clip=bossAnimation(b);if(this.bossClip!==clip.key||tick<this.bossStart){this.bossClip=clip.key;this.bossStart=tick;}
    const forestTremor=key==='boss'&&b.state==='transition'?Math.sin((90-b.stateTicks)*1.1)*1.5:0;
    const mineralTremor=key==='machine'&&b.state==='windup'&&b.attackKind==='mineral'?Math.round(Math.sin((60-b.stateTicks)*1.15)):0;
    const tremor=forestTremor+mineralTremor;
    const attackFacing=key!=='boss'||['windup','attack'].includes(b.state)||['rootHold','rootPulse'].includes(clip.state),flip=attackFacing&&b.lockedFacing>0;
    this.bossOutline.setVisible(b.state!=='dormant'&&b.state!=='dead').setPosition(Math.round(b.x+b.w/2+tremor),Math.round(b.y+b.h+forestTremor)).setFlipX(flip).setFrame(animationFrame(clip,tick-this.bossStart));
    this.boss.setVisible(b.state!=='dormant'&&b.state!=='dead').setPosition(Math.round(b.x+b.w/2+tremor),Math.round(b.y+b.h+forestTremor)).setFlipX(flip).setFrame(animationFrame(clip,tick-this.bossStart));
    if(key==='boss'&&b.state==='transition')this.boss.setTint(0xffd5a0);else if(b.phase===2)this.boss.setTint(0xffc6b5);else this.boss.clearTint();
    this.forestLayer.sync(key==='boss'?collectForestAttackItems(b,tick):[]);
    if(key==='machine')drawMachineBossEffect(this.bossEffects,b);
    else if(key==='worm')drawWormBossEffect(this.bossEffects,b);
  }
  destroy(){this.graphics.destroy();this.bossEffects.destroy();this.forestLayer.destroy();for(const view of this.enemies.values()){view.outline.destroy();view.sprite.destroy();}for(const p of this.projectiles)p.destroy();this.boss?.destroy();this.bossOutline?.destroy();}
}
