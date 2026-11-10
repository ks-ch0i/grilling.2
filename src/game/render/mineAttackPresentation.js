import {fxItem} from '../assets/bossFx.js';
const machineKinds=new Set(['wave','rock','mineral']),wormKinds=new Set(['acid-shot','acid-pool']);
export function isBossSpriteHazard(h){return h.ownerId==='mine-machine'&&machineKinds.has(h.kind)||h.ownerId==='mine-worm'&&wormKinds.has(h.kind);}
export function collectBossHazardItems(hazards,_elapsedTicks,arena){
  const items=[];
  for(const h of hazards){
    if(!h.alive||!isBossSpriteHazard(h))continue;
    let key,age;const options={depth:5.5};
    if(h.kind==='wave'){key='machine.wave';age=Math.ceil((arena.right-arena.left)/2)-h.life;options.flipX=h.vx>0;}
    else if(h.kind==='rock'){key='machine.rock';age=180-h.life;}
    else if(h.kind==='mineral'){key='machine.mineral';age=60-h.life;options.rotation=Math.atan2(h.vy,h.vx);}
    else if(h.kind==='acid-shot'){key='worm.acid';age=180-h.life;options.rotation=Math.atan2(h.vy,h.vx);}
    else{key='worm.pool';age=240-h.life;}
    items.push(fxItem(key,h.id,h,Math.max(0,age),undefined,options));
  }
  return items;
}
export function collectMineBodyItems(boss,_elapsedTicks,arena){
  const items=[];
  if(boss.kind==='machine'&&boss.state==='windup'&&boss.attackKind==='rocks'){
    for(const [i,r] of (boss.telegraphs??[]).entries())items.push(fxItem('machine.ceiling',`machine-ceiling-${i}`,{x:r.x-6,y:Math.max(arena.top+8,44),w:r.w+12,h:28},Math.max(0,60-boss.stateTicks),60));
  }
  if(boss.kind!=='worm')return items;
  if(boss.state==='attack'&&['tail','burrow'].includes(boss.attackKind)){
    for(const [i,box] of boss.hitboxes.entries())items.push(fxItem(boss.attackKind==='tail'?'worm.tail':'worm.burrowBurst',`worm-${boss.attackKind}-${i}`,box,Math.max(0,18-box.ticks),18,{flipX:boss.attackKind==='tail'&&boss.lockedFacing>0}));
  }
  if(boss.state==='windup'&&boss.attackKind==='burrow'){
    const duration=boss.phase===2?45:60,age=Math.max(0,duration-boss.stateTicks),progress=Math.min(1,age/duration);
    const x=boss.trailStartX+(boss.targetX-boss.trailStartX)*progress,y=arena.bottom-10;
    items.push(fxItem('worm.burrowWarning','worm-burrow-travel',{x:x-12,y,w:24,h:10},age));
    items.push(fxItem('worm.burrowWarning','worm-burrow-target',{x:boss.targetX-24,y,w:48,h:10},age));
  }
  return items;
}
