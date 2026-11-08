import {nextRandom} from './mineCarts.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function shouldDropPotion(random){return random<.4;}
export function createMineBoss(kind,spawn){
 if(!['machine','worm'].includes(kind))throw new TypeError('Unknown mine boss');
 return {id:kind==='machine'?'mine-machine':'mine-worm',kind,x:spawn.x,y:spawn.y,w:kind==='machine'?80:96,h:64,
  hp:kind==='machine'?12:18,maxHp:kind==='machine'?12:18,phase:1,state:'dormant',stateTicks:0,
  attackKind:null,lastAttack:null,lockedFacing:-1,telegraphs:[],hitboxes:[],transitioned:false,
  targetX:0,trailStartX:spawn.x,burrowsLeft:0,attackSerial:0,cycle:0};
}
export function damageMineBoss(state,amount=1){
 const boss=structuredClone(state),events=[];
 if(['dormant','intro','transition','dying','dead'].includes(boss.state))return {boss,events};
 boss.hp=Math.max(0,boss.hp-amount);
 if(boss.hp===0){boss.state='dying';boss.stateTicks=90;boss.telegraphs=[];boss.hitboxes=[];events.push({type:'boss:death',kind:boss.kind});if(boss.kind==='machine')events.push({type:'boss:machine-defeated'});}
 else if(boss.kind==='worm'&&boss.hp<=9&&!boss.transitioned){boss.transitioned=true;boss.state='transition';boss.stateTicks=30;boss.telegraphs=[];events.push({type:'boss:transition',kind:'worm'});}
 return {boss,events};
}
export function selectMachineAttack(boss,player,rng){
 const near=Math.abs((player.x+player.w/2)-(boss.x+boss.w/2))<=120;
 const candidates=(near?['swipe','charge']:['wave','rocks']).filter(k=>k!==boss.lastAttack);
 const next=nextRandom(rng);return {kind:candidates[Math.floor(next.value*candidates.length)],rng:next.state};
}
function beginWindup(b,player,arena,rng,events,repeat=false){
 if(b.kind==='machine'){const choice=selectMachineAttack(b,player,rng);b.attackKind=choice.kind;rng=choice.rng;}
 else if(!repeat){const choices=b.phase===2?['spit','burrow','tail','charge']:['spit','burrow','tail'];b.attackKind=choices[b.cycle%choices.length];b.burrowsLeft=b.attackKind==='burrow'?(b.phase===2?2:1):0;}
 b.lockedFacing=player.x+player.w/2<b.x+b.w/2?-1:1;b.targetX=clamp(player.x+player.w/2,arena.left+40,arena.right-40);
 b.state='windup';b.stateTicks=repeat?45:b.phase===2?45:60;b.trailStartX=b.x+b.w/2;
 const front=(width,height)=>({x:b.lockedFacing<0?b.x-width:b.x+b.w,y:arena.bottom-height,w:width,h:height});
 if(b.attackKind==='swipe')b.telegraphs=[front(80,56)];
 else if(b.attackKind==='tail')b.telegraphs=[front(90,48)];
 else if(b.attackKind==='burrow')b.telegraphs=[{x:b.targetX-24,y:arena.bottom-64,w:48,h:64}];
 else if(b.attackKind==='rocks')b.telegraphs=[-50,0,50].map(offset=>({x:clamp(b.targetX+offset-10,arena.left+16,arena.right-36),y:arena.top,w:20,h:arena.bottom-arena.top}));
 else if(b.attackKind==='wave')b.telegraphs=[{x:arena.left+16,y:arena.bottom-30,w:arena.right-arena.left-32,h:30}];
 else if(b.attackKind==='charge')b.telegraphs=[{x:b.lockedFacing<0?arena.left+16:b.x+b.w,y:arena.bottom-b.h,w:b.lockedFacing<0?Math.max(1,b.x-arena.left-16):Math.max(1,arena.right-16-b.x-b.w),h:b.h}];
 else b.telegraphs=[front(80,48)];
 events.push({type:'boss:windup',kind:b.attackKind,boss:b.kind});return rng;
}
export function stepMineBoss(state,player,arena,rng){
 const boss=structuredClone(state),events=[],hazards=[];
 if(boss.state==='dormant'||boss.state==='dead')return {boss,events,hazards,rng};
 if(boss.state==='dying'){if(--boss.stateTicks<=0){boss.state='dead';events.push({type:'boss:defeated',kind:boss.kind});}return {boss,events,hazards,rng};}
 boss.hitboxes=boss.hitboxes.map(h=>({...h,ticks:h.ticks-1})).filter(h=>h.ticks>0);
 if(boss.state==='intro'||boss.state==='transition'){
  if(--boss.stateTicks<=0){if(boss.state==='transition')boss.phase=2;rng=beginWindup(boss,player,arena,rng,events);}
 }else if(boss.state==='windup'&&--boss.stateTicks<=0){
  boss.state='attack';boss.stateTicks=boss.attackKind==='charge'?72:18;boss.attackSerial++;
  const id=`${boss.id}-${boss.attackSerial}`,base={ownerId:boss.id,alive:true};
  if(['swipe','tail','burrow'].includes(boss.attackKind)){
   boss.hitboxes=boss.telegraphs.map(r=>({...r,ticks:18}));
   if(boss.attackKind==='burrow')boss.x=clamp(boss.targetX-boss.w/2,arena.left+16,arena.right-16-boss.w);
  }else if(boss.attackKind==='wave'){
   for(const direction of [-1,1])hazards.push({...base,id:`${id}-${direction}`,kind:'wave',x:direction<0?boss.x-8:boss.x+boss.w,y:arena.bottom-30,w:8,h:30,vx:direction*120,vy:0,life:Math.ceil((arena.right-arena.left)/2),remaining:arena.right-arena.left});
  }else if(boss.attackKind==='rocks'){
   for(const [i,r] of boss.telegraphs.entries())hazards.push({...base,id:`${id}-rock-${i}`,kind:'rock',x:r.x,y:arena.top,w:20,h:20,vx:0,vy:140,life:180});
  }else if(boss.attackKind==='spit'){
   hazards.push({...base,id:`${id}-acid`,kind:'acid-shot',x:boss.x+boss.w/2-4,y:boss.y,w:8,h:8,vx:boss.lockedFacing*110,vy:-180,life:180,poolTicks:240});
  }
  boss.lastAttack=boss.attackKind;boss.telegraphs=[];events.push({type:'boss:attack',kind:boss.attackKind,boss:boss.kind});
 }else if(boss.state==='attack'){
  if(boss.attackKind==='charge'){
   const speed=boss.kind==='machine'?180:240;
   const x=clamp(boss.x+boss.lockedFacing*speed/60,arena.left+16,arena.right-16-boss.w);
   if(x===boss.x)boss.stateTicks=1;boss.x=x;
  }
  if(--boss.stateTicks<=0){
   if(boss.kind==='worm'&&boss.attackKind==='burrow'&&boss.burrowsLeft>1){boss.burrowsLeft--;rng=beginWindup(boss,player,arena,rng,events,true);}
   else {boss.state='recovery';boss.stateTicks=boss.phase===2?38:50;}
  }
 }else if(boss.state==='recovery'&&--boss.stateTicks<=0){boss.cycle++;rng=beginWindup(boss,player,arena,rng,events);}
 return {boss,events,hazards,rng};
}
