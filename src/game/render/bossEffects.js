export function drawMachineBossEffect(g,b){
  if(b.state==='windup'&&b.attackKind==='mineral'){
    const progress=60-b.stateTicks,oreX=b.x+(b.lockedFacing<0?b.w*.82:b.w*.18),oreY=b.y+18;
    const pulse=.16+(Math.sin(progress*.75)+1)*.1;
    g.fillStyle(0xff3f35,pulse).fillCircle(oreX,oreY,9);
    g.lineStyle(1,0xff9b67,pulse+.2).strokeCircle(oreX,oreY,6);
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
    g.fillStyle(0xa9df35,.22).fillCircle(mouthX,mouthY,7);
    g.lineStyle(1,0xe3ff99,.9).strokeCircle(mouthX,mouthY,4);
  }
  if(b.state==='windup'&&b.attackKind==='charge')for(const r of b.telegraphs){
    const x=b.lockedFacing<0?b.x+4:b.x+b.w-4,y=r.y+r.h-5;
    for(let i=0;i<3;i++){const px=x-b.lockedFacing*i*7,py=y-(i%2)*4;g.fillStyle(i%2?0x9b8062:0xd2b88a,.8).fillTriangle(px-3,py,px,py-6,px+4,py);}
  }
  if(b.state==='attack'&&b.attackKind==='charge'){
    const x=b.lockedFacing<0?b.x+b.w-2:b.x+2,y=b.y+b.h-3;
    for(let i=0;i<3;i++){const px=x-b.lockedFacing*i*5,py=y-(i%2)*3;g.fillStyle(0xc2a27a,.82).fillTriangle(px-3,py,px,py-5,px+4,py);}
  }
}
