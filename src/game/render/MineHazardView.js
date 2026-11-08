export class MineHazardView {
 constructor(scene){this.scene=scene;this.graphics=scene.add.graphics().setDepth(5);this.carts=new Map();this.minerals=new Map();this.warned=new Set();this.drop=scene.add.sprite(0,0,'objects',5).setOrigin(.5,1).setScale(.65).setDepth(5);}
 sync(run){
  const g=this.graphics;g.clear();const active=new Set(),activeMinerals=new Set();
  for(const h of run.hazards){
   if(!h.alive)continue;
   if(h.kind==='cart'){
    active.add(h.id);let sprite=this.carts.get(h.id);if(!sprite){sprite=this.scene.add.sprite(0,0,'mine-cart').setDepth(5);this.carts.set(h.id,sprite);}
    sprite.setPosition(h.x+h.w/2,h.y+h.h/2).setDisplaySize(h.w+8,h.h+8).setFlipX(h.vx<0);
   }else if(h.kind==='acid-pool'){g.fillStyle(0x5bf0a5,.7).fillEllipse(h.x+h.w/2,h.y+h.h/2,h.w,h.h+3);g.lineStyle(1,0xc8ffcf,.9).strokeEllipse(h.x+h.w/2,h.y+h.h/2,h.w,h.h+3);}
   else if(h.kind==='acid-shot'){
    const cx=h.x+h.w/2,cy=h.y+h.h/2,angle=Math.atan2(h.vy,h.vx),ux=Math.cos(angle),uy=Math.sin(angle),px=-uy,py=ux;
    const tipX=cx+ux*4,tipY=cy+uy*4,baseX=cx-ux*2,baseY=cy-uy*2;
    g.fillStyle(0x286b58,.96).fillTriangle(tipX,tipY,baseX+px*3,baseY+py*3,baseX-px*3,baseY-py*3);
    g.fillStyle(0x8cffc4,.98).fillCircle(baseX,baseY,2);
   }
   else if(h.kind==='rock'){
    const x=Math.round(h.x),y=Math.round(h.y),w=Math.round(h.w),height=Math.round(h.h);
    g.fillStyle(0x504137,.98).fillPoints([{x:x+w*.24,y},{x:x+w*.65,y:y+1},{x:x+w,y:y+height*.28},{x:x+w*.84,y:y+height*.52},{x:x+w*.94,y:y+height*.78},{x:x+w*.68,y:y+height},{x:x+w*.25,y:y+height*.92},{x,y:y+height*.68},{x:x+w*.12,y:y+height*.38}],true);
    g.fillStyle(0x9b8060,.95).fillTriangle(x+w*.2,y+height*.32,x+w*.58,y+height*.14,x+w*.5,y+height*.56);
    g.fillStyle(0x715b47,.95).fillTriangle(x+w*.5,y+height*.56,x+w*.82,y+height*.38,x+w*.68,y+height*.85);
   }else if(h.kind==='mineral'){
    activeMinerals.add(h.id);let sprite=this.minerals.get(h.id);if(!sprite){sprite=this.scene.add.sprite(0,0,'mine-mineral').setOrigin(.5,.5).setDepth(5.5);this.minerals.set(h.id,sprite);}
    sprite.setPosition(Math.round(h.x+h.w/2),Math.round(h.y+h.h/2)).setDisplaySize(h.w,h.h).setRotation(Math.atan2(h.vy,h.vx));
   }else if(h.kind==='wave'){
    const x=Math.round(h.x+h.w/2),y=Math.round(h.y),bottom=Math.round(h.y+h.h);
    g.fillStyle(0x80503a,.96).fillTriangle(x-4,bottom,x,y+2,x+4,bottom);
    g.fillStyle(0xd88f54,.98).fillTriangle(x-2,bottom,x,y+8,x+2,bottom);
    g.lineStyle(1,0xffdf9f,.95).lineBetween(x,y+7,x,bottom-2);
   }
  }
  for(const [id,sprite] of this.carts)if(!active.has(id)){sprite.destroy();this.carts.delete(id);}
  for(const [id,sprite] of this.minerals)if(!activeMinerals.has(id)){sprite.destroy();this.minerals.delete(id);}
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
 destroy(){this.graphics.destroy();this.drop.destroy();for(const sprite of this.carts.values())sprite.destroy();for(const sprite of this.minerals.values())sprite.destroy();this.carts.clear();this.minerals.clear();}
}
