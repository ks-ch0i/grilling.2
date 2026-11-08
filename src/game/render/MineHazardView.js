export class MineHazardView {
 constructor(scene){this.scene=scene;this.graphics=scene.add.graphics().setDepth(5);this.carts=new Map();this.warned=new Set();this.drop=scene.add.sprite(0,0,'objects',5).setOrigin(.5,1).setScale(.65).setDepth(5);}
 sync(run){
  const g=this.graphics;g.clear();const active=new Set();
  for(const h of run.hazards){
   if(!h.alive)continue;
   if(h.kind==='cart'){
    active.add(h.id);let sprite=this.carts.get(h.id);if(!sprite){sprite=this.scene.add.sprite(0,0,'mine-cart').setDepth(5);this.carts.set(h.id,sprite);}
    sprite.setPosition(h.x+h.w/2,h.y+h.h/2).setDisplaySize(h.w+8,h.h+8).setFlipX(h.vx<0);
   }else if(h.kind==='acid-pool'){g.fillStyle(0x5bf0a5,.7).fillEllipse(h.x+h.w/2,h.y+h.h/2,h.w,h.h+3);g.lineStyle(1,0xc8ffcf,.9).strokeEllipse(h.x+h.w/2,h.y+h.h/2,h.w,h.h+3);}
   else if(h.kind==='acid-shot'){g.fillStyle(0x80ffc1,.95).fillCircle(h.x+h.w/2,h.y+h.h/2,5);}
   else if(h.kind==='rock'){g.fillStyle(0x9e8262).fillRect(h.x,h.y,h.w,h.h);g.lineStyle(2,0xffd287).strokeRect(h.x,h.y,h.w,h.h);}
   else if(h.kind==='wave'){g.fillStyle(0xe7ac61,.5).fillRect(h.x,h.y,h.w,h.h);g.lineStyle(2,0xffdf9f).strokeRect(h.x,h.y,h.w,h.h);}
  }
  for(const [id,sprite] of this.carts)if(!active.has(id)){sprite.destroy();this.carts.delete(id);}
  for(const z of run.cartZones){
   if(z.state==='countdown'){this.warned.delete(z.id);continue;}
   const cart=z.state==='active'?run.hazards.find(h=>h.id===z.cartId&&h.alive):null;
   const entry=z.direction>0?Math.max(0,z.centerX-96):Math.min(this.scene.stage.world.width,z.centerX+96);
   const source=cart?cart.x+cart.w/2:entry,playerX=run.player.x+run.player.w/2;
   if(Math.abs(source-playerX)>500||cart&&z.direction*(playerX-source)<0)continue;
   const cam=this.scene.cameras.main,x=Math.max(cam.scrollX+15,Math.min(cam.scrollX+625,source)),y=244;
   g.fillStyle(0xffbd50,.9);g.fillTriangle(x,y,x-z.direction*18,y-10,x-z.direction*18,y+10);
   if(!this.warned.has(z.id)&&this.scene.audio.playSfx('cartWarning'))this.warned.add(z.id);
  }
  const b=run.boss;if(b.kind==='worm'&&b.state==='windup'&&b.attackKind==='burrow'){
   const progress=1-Math.min(1,b.stateTicks/(b.burrowsLeft===1&&b.phase===2?45:b.phase===2?45:60));
   const x=b.trailStartX+(b.targetX-b.trailStartX)*progress,y=this.scene.stage.arena.bottom-3;
   g.lineStyle(3,0xc8b79a,.85).lineBetween(x-12,y,x+12,y);g.lineStyle(2,0xffd996,.95).lineBetween(b.targetX-12,y,b.targetX,y-10).lineBetween(b.targetX,y-10,b.targetX+12,y);
  }
  const d=run.bossDrop;this.drop.setVisible(d.spawned&&!d.consumed).setPosition(d.x+8,d.y+16);
 }
 destroy(){this.graphics.destroy();this.drop.destroy();for(const sprite of this.carts.values())sprite.destroy();this.carts.clear();}
}
