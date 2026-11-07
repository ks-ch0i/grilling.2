const attacks=[
  {kind:'branch',windup:60,active:12,recovery:50},
  {kind:'root',windup:75,active:12,recovery:50},
  {kind:'slam',windup:60,active:12,recovery:60}
];
export function createBoss(spawn) {
  return {...spawn,w:80,h:96,hp:18,maxHp:18,phase:1,state:'dormant',stateTicks:0,cycle:0,
    attackKind:null,lockedFacing:-1,telegraphs:[],hitboxes:[],secondRootDelay:0,secondRoot:null,transitioned:false};
}
export function resetBoss(spawn) { return createBoss(spawn); }
function targetRect(kind,boss,player,arena) {
  if (kind==='branch') return {x:boss.lockedFacing<0?boss.x-90:boss.x+boss.w,y:boss.y+30,w:90,h:66};
  if (kind==='slam') return {x:boss.lockedFacing<0?boss.x-64:boss.x+boss.w,y:boss.y+12,w:64,h:84};
  return {x:Math.max(arena.left+16,Math.min(arena.right-48,player.x+player.w/2-24)),y:arena.bottom-48,w:48,h:48};
}
function beginWindup(boss,player,arena,events) {
  const spec=attacks[boss.cycle%attacks.length]; boss.attackKind=spec.kind;
  boss.lockedFacing=(player.x+player.w/2 < boss.x+boss.w/2)?-1:1;
  boss.telegraphs=[targetRect(spec.kind,boss,player,arena)];
  boss.state='windup'; boss.stateTicks=boss.phase===2?Math.round(spec.windup*.75):spec.windup;
  events.push({type:'boss:windup',kind:spec.kind});
}
export function damageBoss(state, amount=1) {
  const boss={...state,telegraphs:state.telegraphs.map(r=>({...r})),hitboxes:state.hitboxes.map(r=>({...r}))};
  const events=[];
  if (['dormant','intro','transition','dying','dead'].includes(boss.state)) return {boss,events};
  boss.hp=Math.max(0,boss.hp-amount);
  if (boss.hp===0) { boss.state='dying'; boss.stateTicks=90; boss.telegraphs=[];boss.hitboxes=[];boss.secondRootDelay=0;boss.secondRoot=null;events.push({type:'boss:death'}); }
  else if (boss.hp<=9 && !boss.transitioned) { boss.transitioned=true;boss.state='transition';boss.stateTicks=90;boss.telegraphs=[];boss.hitboxes=[];boss.secondRootDelay=0;boss.secondRoot=null;events.push({type:'boss:transition'}); }
  return {boss,events};
}
export function stepBoss(state,player,arena) {
  const boss={...state,telegraphs:state.telegraphs.map(r=>({...r})),hitboxes:state.hitboxes.map(r=>({...r})),secondRoot:state.secondRoot?{...state.secondRoot}:null}, events=[];
  if (boss.state==='dormant' || boss.state==='dead') return {boss,events};
  if (boss.state==='dying') { if (--boss.stateTicks<=0) {boss.state='dead';events.push({type:'boss:defeated'});} return {boss,events}; }
  boss.hitboxes=boss.hitboxes.map(h=>({...h,ticks:h.ticks-1})).filter(h=>h.ticks>0);
  if (boss.secondRootDelay>0 && --boss.secondRootDelay===0 && boss.secondRoot) {
    boss.hitboxes.push({...boss.secondRoot,ticks:12}); boss.telegraphs=[];boss.secondRoot=null;
  }
  if (boss.state==='intro' || boss.state==='transition') {
    if (--boss.stateTicks<=0) { if(boss.state==='transition') boss.phase=2;beginWindup(boss,player,arena,events); }
  } else if (boss.state==='windup') {
    if (--boss.stateTicks<=0) {
      boss.state='attack';boss.stateTicks=12;boss.hitboxes=boss.telegraphs.map(r=>({...r,ticks:12}));boss.telegraphs=[];
      if (boss.phase===2 && boss.attackKind==='root') {
        boss.secondRoot=targetRect('root',boss,player,arena);boss.telegraphs=[{...boss.secondRoot}];boss.secondRootDelay=30;
      }
      events.push({type:'boss:attack',kind:boss.attackKind});
    }
  } else if (boss.state==='attack') {
    if (--boss.stateTicks<=0) {const spec=attacks[boss.cycle%attacks.length];boss.state='recovery';boss.stateTicks=boss.phase===2?Math.round(spec.recovery*.75):spec.recovery;}
  } else if (boss.state==='recovery' && --boss.stateTicks<=0) { boss.cycle=(boss.cycle+1)%attacks.length;beginWindup(boss,player,arena,events); }
  return {boss,events};
}
