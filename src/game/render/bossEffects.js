function strokeInRect(g,r,points,width,color,alpha){
  const pad=Math.min(Math.max(2,width/2+1),Math.max(2,r.w/2-1),Math.max(2,r.h/2-1));
  g.lineStyle(width,color,alpha).beginPath();
  points.forEach(([x,y],i)=>{const px=r.x+Math.max(pad,Math.min(r.w-pad,x*r.w)),py=r.y+Math.max(pad,Math.min(r.h-pad,y*r.h));if(i===0)g.moveTo(px,py);else g.lineTo(px,py);});
  g.strokePath();
}
export function drawForestBossEffect(g,b){
  if(b.state==='windup'&&b.attackKind==='root')for(const r of b.telegraphs){
    strokeInRect(g,r,[[.5,.94],[.42,.72],[.58,.51],[.47,.29],[.53,.06]],2,0xffd28a,.9);
    strokeInRect(g,r,[[.42,.72],[.2,.61]],1,0xffe5ad,.8);strokeInRect(g,r,[[.58,.51],[.8,.4]],1,0xffe5ad,.8);
  }
  if(b.state!=='attack')return;
  for(const r of b.hitboxes){
    if(b.attackKind==='branch'){
      const points=b.lockedFacing<0?[[.92,.12],[.7,.32],[.48,.55],[.22,.68],[.08,.88]]:[[.08,.12],[.3,.32],[.52,.55],[.78,.68],[.92,.88]];
      strokeInRect(g,r,points,8,0x563b32,.86);strokeInRect(g,r,points,5,0xe59a53,.95);strokeInRect(g,r,points,2,0xffe6aa,1);
    }else if(b.attackKind==='root'){
      strokeInRect(g,r,[[.12,.98],[.18,.68],[.32,.82],[.36,.35]],6,0x664639,.98);
      strokeInRect(g,r,[[.5,.98],[.46,.58],[.62,.72],[.66,.12]],6,0x77523e,.98);
      strokeInRect(g,r,[[.86,.98],[.78,.67],[.9,.52]],5,0x664639,.98);
      strokeInRect(g,r,[[.18,.68],[.25,.49]],2,0xd6a56b,.9);strokeInRect(g,r,[[.62,.72],[.58,.46]],2,0xd6a56b,.9);
    }else if(b.attackKind==='slam'){
      strokeInRect(g,r,[[.05,.86],[.26,.75],[.41,.88],[.6,.7],[.78,.81],[.95,.65]],4,0x583a32,.96);
      strokeInRect(g,r,[[.05,.86],[.26,.75],[.41,.88],[.6,.7],[.78,.81],[.95,.65]],2,0xf0b06c,1);
      for(const [x,y] of [[.18,.62],[.42,.48],[.73,.58],[.9,.37]])strokeInRect(g,r,[[x,y],[Math.min(.94,x+.05),Math.max(.12,y-.14)]],2,0xffd496,.9);
    }
  }
}
