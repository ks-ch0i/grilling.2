function strokeInRect(g,r,points,width,color,alpha){
  const pad=Math.min(Math.max(2,width/2+1),Math.max(2,r.w/2-1),Math.max(2,r.h/2-1));
  g.lineStyle(width,color,alpha).beginPath();
  points.forEach(([x,y],i)=>{const px=r.x+Math.max(pad,Math.min(r.w-pad,x*r.w)),py=r.y+Math.max(pad,Math.min(r.h-pad,y*r.h));if(i===0)g.moveTo(px,py);else g.lineTo(px,py);});
  g.strokePath();
}
function drawChip(g,x,y,size=6){
  g.fillStyle(0x554638,.95).fillRect(Math.round(x),Math.round(y),size,size);
  g.fillStyle(0xb09368,.9).fillRect(Math.round(x+1),Math.round(y+1),Math.max(2,size-3),2);
}
export function drawMachineBossEffect(g,b){
  if(b.state==='windup'&&b.attackKind==='mineral'){
    const progress=60-b.stateTicks,oreX=b.x+(b.lockedFacing<0?b.w*.82:b.w*.18),oreY=b.y+18;
    const pulse=.16+(Math.sin(progress*.75)+1)*.1;
    g.fillStyle(0xff3f35,pulse).fillCircle(oreX,oreY,9);
    g.lineStyle(1,0xff9b67,pulse+.2).strokeCircle(oreX,oreY,6);
  }
  if(b.state==='windup'&&b.attackKind==='rocks'){
    const progress=1-Math.min(1,b.stateTicks/60);
    for(const [i,r] of b.telegraphs.entries()){
      const x=r.x+r.w/2-3+i*2,y=r.y+4+Math.round(progress*30);
      drawChip(g,x,y,5);drawChip(g,x+6,y+12,4);
    }
  }
  if(b.state==='attack'&&b.attackKind==='wave'&&b.stateTicks>=14){
    const groundY=b.y+b.h-1;
    for(const x of [b.x-4,b.x+b.w+4]){
      g.fillStyle(0xc27e4c,.82).fillTriangle(x-7,groundY,x,groundY-10,x+7,groundY);
      g.lineStyle(2,0xffd38a,.9).lineBetween(x-10,groundY,x+10,groundY);
    }
  }
}
export function drawWormBossEffect(g,b){
  if(b.state==='transition'){
    const progress=30-b.stateTicks,pulse=.35+.2*(Math.sin(progress*.8)+1)/2;
    const oreX=b.x+b.w/2+22,oreY=b.y-16;
    for(const [dx,dy,radius] of [[-9,0,6],[0,-3,8],[9,1,5]]){
      g.fillStyle(0xff3737,pulse).fillCircle(oreX+dx,oreY+dy,radius);
      g.lineStyle(1,0xffa076,pulse+.25).strokeCircle(oreX+dx,oreY+dy,radius-2);
    }
  }
  if(b.state==='windup'&&b.attackKind==='spit'){
    const mouthX=b.lockedFacing<0?b.x+12:b.x+b.w-12,mouthY=b.y+11;
    g.fillStyle(0x66f3bb,.22).fillCircle(mouthX,mouthY,7);
    g.lineStyle(1,0xb5ffe2,.9).strokeCircle(mouthX,mouthY,4);
  }
  if(b.state==='windup'&&b.attackKind==='tail')for(const r of b.telegraphs){
    strokeInRect(g,r,[[.08,.76],[.28,.56],[.52,.6],[.73,.38],[.94,.18]],3,0x5d705d,.62);
    strokeInRect(g,r,[[.12,.94],[.35,.74],[.6,.78],[.82,.53]],1,0xabe2bd,.72);
  }
  if(b.state==='attack'&&b.attackKind==='tail')for(const r of b.hitboxes){
    const sweep=b.lockedFacing<0?[[.94,.2],[.75,.42],[.54,.57],[.29,.72],[.07,.9]]:[[.07,.2],[.25,.42],[.48,.57],[.72,.72],[.94,.9]];
    strokeInRect(g,r,sweep,8,0x30413f,.92);strokeInRect(g,r,sweep,5,0x52a995,.98);strokeInRect(g,r,sweep,2,0xcaffdb,1);
  }
  if(b.state==='windup'&&b.attackKind==='charge')for(const r of b.telegraphs){
    const x=b.lockedFacing<0?b.x+4:b.x+b.w-4,y=r.y+r.h-5;
    for(let i=0;i<3;i++){const px=x-b.lockedFacing*i*7,py=y-(i%2)*4;g.fillStyle(i%2?0x9b8062:0xd2b88a,.8).fillTriangle(px-3,py,px,py-6,px+4,py);}
  }
  if(b.state==='attack'&&b.attackKind==='charge'){
    const x=b.lockedFacing<0?b.x+b.w-2:b.x+2,y=b.y+b.h-3;
    for(let i=0;i<3;i++){const px=x-b.lockedFacing*i*5,py=y-(i%2)*3;g.fillStyle(0xc2a27a,.82).fillTriangle(px-3,py,px,py-5,px+4,py);}
  }
  if(b.state==='attack'&&b.attackKind==='burrow')for(const r of b.hitboxes){
    const x=r.x+r.w/2,y=r.y+r.h-2;
    g.fillStyle(0x8a7255,.9).fillTriangle(x-10,y,x-4,y-13,x+1,y);
    g.fillStyle(0xc2a47a,.9).fillTriangle(x+1,y,x+7,y-18,x+12,y);
  }
}
