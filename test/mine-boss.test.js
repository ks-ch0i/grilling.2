import test from 'node:test';import assert from 'node:assert/strict';
import {createMineBoss,damageMineBoss,stepMineBoss,selectMachineAttack,shouldDropPotion,MINERAL_TARGET_HALF_WIDTH} from '../src/game/sim/mineBoss.js';
import {stepHazards} from '../src/game/sim/hazards.js';
import {HURT_INVULNERABLE_TICKS} from '../src/game/sim/constants.js';
import {createStageRun,stepStage,snapshotStageRun,restoreStageRun} from '../src/game/sim/stage.js';
import {createRoundEnemies} from '../src/game/sim/rounds.js';
import {createPlayer,stepPlayer} from '../src/game/sim/player.js';import {intersects} from '../src/game/sim/geometry.js';import {nextRandom} from '../src/game/sim/mineCarts.js';import {MINE_STAGE as stage} from '../src/game/content/mineStage.js';import {freshSave,parseSave} from '../src/game/storage/saveStore.js';
const visualApi=await import('../src/game/assets/manifest.js');
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const arena=stage.arena,input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:320,aimY:290};
const player={x:300,y:276,w:16,h:28,mode:'idle'};
const round=r=>restoreStageRun(stage,JSON.parse(JSON.stringify(snapshotStageRun(r))));
function makeRound(run,n,bossKind='machine'){
 run.round=n;run.boss=createMineBoss(bossKind,{x:stage.boss.x,y:stage.boss.y});
 const encounter=createRoundEnemies(stage,n,run.rngState,{player:run.player,boss:run.boss});run.enemies=encounter.enemies;run.rngState=encounter.rngState;
 run.bossSequence=[5,7,8].includes(n)?(bossKind==='worm'?'worm':'machine'):'none';return run;
}
test('machine selects charge at close range and varied far attacks without consecutive repetition',()=>{
 const boss=createMineBoss('machine',{x:200,y:240}),near={...player,x:boss.x+boss.w/2+120-8},far={...near,x:near.x+1};const nearSeen=new Set(),farSeen=new Set();
 for(let seed=0;seed<5000;seed+=19){nearSeen.add(selectMachineAttack(boss,near,seed).kind);farSeen.add(selectMachineAttack(boss,far,seed).kind);}
 assert.deepEqual([...nearSeen],['charge']);assert.deepEqual([...farSeen].sort(),['mineral','rocks','wave']);
 assert.equal(selectMachineAttack({...boss,lastAttack:'charge'},near,10).kind,'charge');
 for(const last of ['rocks','wave','mineral'])assert.notEqual(selectMachineAttack({...boss,lastAttack:last},far,10).kind,last);
 assert.equal(selectMachineAttack(boss,near,42).rng,nextRandom(42).state);
});
test('Machine and phase-two Worm charges cross floating platforms and stop at arena walls',()=>{
 const platform={x:180,w:64,topProfile:[260,260,260,260],variant:0};
 for(const kind of ['machine','worm']){
  let boss=createMineBoss(kind,{x:128,y:arena.bottom-64});
  Object.assign(boss,{phase:kind==='worm'?2:1,state:'attack',stateTicks:30,attackKind:'charge',lockedFacing:1});
  for(let i=0;i<20;i++)boss=stepMineBoss(boss,player,arena,1).boss;
  assert.ok(boss.x>platform.x,kind);
  assert.equal(boss.y+boss.h,arena.bottom,kind);

  const edgeX=arena.right-16-boss.w;
  boss=createMineBoss(kind,{x:edgeX,y:arena.bottom-64});
  Object.assign(boss,{phase:kind==='worm'?2:1,state:'attack',stateTicks:20,attackKind:'charge',lockedFacing:1});
  boss=stepMineBoss(boss,player,arena,1).boss;
  assert.equal(boss.x,edgeX,`${kind} right arena wall`);
 }
});
test('a short jump cannot clear the 30px wave while a long jump can',()=>{
 const floor=[{x:0,y:304,w:1000,h:56}],wave={x:120,y:274,w:16,h:30};
 function jump(hold){let p=createPlayer(120,276);p.grounded=true;let best=Infinity;for(let i=0;i<40;i++){p=stepPlayer(p,{...input,jumpPressed:i===0,jumpHeld:i<hold},floor,344).player;best=Math.min(best,p.y+p.h);}return best;}
 assert.ok(jump(1)>wave.y);assert.ok(jump(40)<wave.y);
});
test('machine death does not clear; drop is rolled once and worm entrance freezes exactly 240 ticks',()=>{
 let r=makeRound(createStageRun(stage,{}, {seed:40}),8);Object.assign(r.player,{x:312,y:276,grounded:true,hp:2,mode:'idle'});Object.assign(r.boss,{state:'dying',stateTicks:1,hp:0});r.arenaLocked=true;
 r.hazards.push({id:'pool',ownerId:'i',kind:'acid-pool',x:300,y:298,w:28,h:6,vx:0,vy:0,life:100,alive:true});
 r.projectiles.push({id:'p',ownerId:'e',x:300,y:200,w:8,h:8,vx:0,vy:0,life:100,alive:true});
 const expected=nextRandom(r.rngState);const result=stepStage(r,input,stage);r=result.run;
 assert.equal(r.bossSequence,'worm-intro');assert.equal(r.boss.stateTicks,240);assert.equal(r.player.hp,2);assert.equal(r.bossDrop.rolled,true);assert.equal(r.bossDrop.spawned,shouldDropPotion(expected.value));assert.equal(r.rngState,expected.state);assert.deepEqual(r.hazards,[]);assert.deepEqual(r.projectiles,[]);assert.equal(r.outcome,null);
 const playerVisual=visualApi.actorVisualBounds(r.player,'hero-directions',visualApi.ACTOR_OUTLINE_SCALES.player),wormVisual=visualApi.actorVisualBounds(r.boss,'worm',visualApi.ACTOR_OUTLINE_SCALES.boss);
 assert.equal(overlaps(r.player,r.boss),false);assert.equal(overlaps(playerVisual,wormVisual),false,'Worm reveal artwork clears player artwork');
 assert.equal(shouldDropPotion(.399),true);assert.equal(shouldDropPotion(.4),false);const saved=round(r);assert.deepEqual(saved.bossDrop,r.bossDrop);
 const position={x:r.player.x,y:r.player.y,hp:r.player.hp};for(let i=0;i<239;i++){r=stepStage(r,{...input,move:1,jumpPressed:true},stage).run;assert.deepEqual({x:r.player.x,y:r.player.y,hp:r.player.hp},position);}
 assert.equal(r.bossSequence,'worm-intro');assert.equal(r.boss.stateTicks,1);r=stepStage(r,input,stage).run;assert.equal(r.bossSequence,'worm');assert.equal(r.boss.kind,'worm');assert.equal(r.boss.hp,18);assert.equal(r.bossDrop.rolled,true);
});
test('worm phase 2 warns and retargets its second underground strike',()=>{
 let b=createMineBoss('worm',{x:400,y:240});b.state='recovery';b.stateTicks=10;b.hp=10;
 let damage=damageMineBoss(b);b=damage.boss;assert.equal(b.hp,9);assert.equal(b.state,'transition');assert.equal(damage.events.filter(e=>e.type==='boss:transition').length,1);
 for(let i=0;i<30;i++)b=stepMineBoss(b,player,arena,1).boss;assert.equal(b.phase,2);assert.equal(damageMineBoss(b).events.filter(e=>e.type==='boss:transition').length,0);
 b.state='recovery';b.stateTicks=1;b.cycle=0;let result=stepMineBoss(b,player,arena,1);b=result.boss;assert.equal(b.attackKind,'burrow');const first=b.targetX;assert.equal(b.telegraphs.length,1);
 for(let i=0;i<45;i++)b=stepMineBoss(b,player,arena,1).boss;assert.equal(b.state,'attack');assert.equal(b.hitboxes.length,1);
 const moved={...player,x:400};for(let i=0;i<18;i++)b=stepMineBoss(b,moved,arena,1).boss;assert.equal(b.state,'windup');assert.equal(b.stateTicks,45);assert.notEqual(b.targetX,first);const second=b.targetX;
 for(let i=0;i<20;i++)b=stepMineBoss(b,{...moved,x:500},arena,1).boss;assert.equal(b.targetX,second);
});
test('worm transition lasts 30 ticks while the player can keep moving',()=>{
 let run=makeRound(createStageRun(stage,{}, {seed:3}),8,'worm');for(const enemy of run.enemies){enemy.state='dead';enemy.hp=0;}
 run.boss=createMineBoss('worm',{x:stage.arena.right-100,y:240});
 Object.assign(run.boss,{state:'transition',stateTicks:30,hp:9,phase:1,transitioned:true});run.bossSequence='worm';run.arenaLocked=true;
 Object.assign(run.player,{x:stage.arena.left+100,y:276,grounded:true,hp:3,mode:'idle'});const startX=run.player.x;
 for(let i=0;i<29;i++){run=stepStage(run,{...input,move:1},stage).run;assert.equal(run.boss.state,'transition');}
 assert.ok(run.player.x>startX);run=stepStage(run,{...input,move:1},stage).run;assert.notEqual(run.boss.state,'transition');assert.equal(run.boss.phase,2);
});
test('worm snapshots survive introduction and second warning; only worm death clears',()=>{
 let r=makeRound(createStageRun(stage,{}, {seed:2}),8,'worm');Object.assign(r.boss,{state:'intro',stateTicks:180});r.bossSequence='worm-intro';r.arenaLocked=true;r.bossDrop={rolled:true,spawned:true,consumed:false,x:300,y:288};
 assert.deepEqual(stepStage(round(r),input,stage),stepStage(r,input,stage));assert.equal(parseSave(JSON.stringify({...freshSave(),run:snapshotStageRun(r)})).ok,true);
 Object.assign(r.boss,{state:'windup',stateTicks:45,phase:2,transitioned:true,hp:9,attackKind:'burrow',targetX:300,trailStartX:300,burrowsLeft:1,telegraphs:[{x:280,y:240,w:48,h:64}]});r.bossSequence='worm';assert.deepEqual(stepStage(round(r),input,stage),stepStage(r,input,stage));
 Object.assign(r.boss,{state:'dying',stateTicks:1,hp:0,telegraphs:[],hitboxes:[]});let result=stepStage(r,input,stage);assert.equal(result.run.outcome,null);assert.equal(result.events.filter(e=>e.type==='stage:clear').length,0);
 for(const enemy of result.run.enemies){enemy.state='dead';enemy.hp=0;}result=stepStage(result.run,input,stage);assert.equal(result.run.outcome,'clear');assert.equal(result.events.filter(e=>e.type==='stage:clear').length,1);assert.equal(stepStage(result.run,input,stage).events.length,0);
});
test('machine emits paired 30px waves and falling rocks; worm spit makes a four-second pool',()=>{
 let b=createMineBoss('machine',stage.boss);Object.assign(b,{state:'windup',stateTicks:1,attackKind:'wave'});
 let result=stepMineBoss(b,player,arena,1);assert.equal(result.hazards.length,2);assert.ok(result.hazards.every(h=>h.h===30&&Math.abs(h.vx)===120));
 b=createMineBoss('machine',stage.boss);Object.assign(b,{state:'windup',stateTicks:1,attackKind:'rocks',telegraphs:[{x:400,y:0,w:20,h:304},{x:450,y:0,w:20,h:304},{x:500,y:0,w:20,h:304}]});
 result=stepMineBoss(b,player,arena,1);assert.equal(result.hazards.filter(h=>h.kind==='rock').length,3);
 b=createMineBoss('worm',{x:400,y:240});Object.assign(b,{state:'windup',stateTicks:1,attackKind:'spit'});result=stepMineBoss(b,player,arena,1);
 assert.equal(result.hazards[0].ownerId,'mine-worm');assert.deepEqual({x:result.hazards[0].x,y:result.hazards[0].y,w:result.hazards[0].w,h:result.hazards[0].h},{x:440,y:236,w:16,h:16});
 assert.equal(result.hazards[0].x+result.hazards[0].w/2,b.x+b.w/2);assert.equal(result.hazards[0].y+result.hazards[0].h/2,b.y+4);
 assert.equal(result.hazards[0].life,180);assert.equal(result.hazards[0].poolTicks,240);
});
test('machine mineral spray launches 5–7 deterministic crystals toward the player within 120px',()=>{
 const boss=createMineBoss('machine',stage.boss);Object.assign(boss,{state:'windup',stateTicks:1,attackKind:'mineral'});
 const emitted=stepMineBoss(boss,player,arena,1234),again=stepMineBoss(boss,player,arena,1234),crystals=emitted.hazards;
 assert.deepEqual(emitted,again);assert.ok(crystals.length>=5&&crystals.length<=7);assert.ok(crystals.every(h=>h.kind==='mineral'&&h.w===12&&h.h===12&&h.life===60));
 const centers=crystals.map(h=>h.x+h.w/2+h.vx),playerCenter=player.x+player.w/2;
 assert.deepEqual(centers,[...centers].sort((a,b)=>a-b));assert.ok(centers.every(x=>x>=arena.left+16&&x<=arena.right-16&&Math.abs(x-playerCenter)<=MINERAL_TARGET_HALF_WIDTH));
 assert.equal(new Set(crystals.map(h=>h.id)).size,crystals.length);
 let active=crystals,events=[];const floor=[{x:arena.left,y:arena.bottom,w:arena.right-arena.left,h:56}];
 for(let i=0;i<75&&active.length;i++){const result=stepHazards(active,{...player,mode:'dead'},floor);active=result.hazards;events.push(...result.events);}
 assert.equal(active.length,0);assert.equal(events.filter(e=>e.type==='hazard:impact').length,crystals.length);assert.equal(events.filter(e=>e.type==='hazard:hit').length,0);
});
test('mineral flight collision and landing impact each damage at most once',()=>{
 const floor=[{x:0,y:304,w:2000,h:56}],mineral={id:'m1',ownerId:'mine-machine',kind:'mineral',x:100,y:250,w:12,h:12,vx:0,vy:0,life:60,alive:true};
 let result=stepHazards([mineral],{x:98,y:250,w:16,h:28,mode:'idle'},floor);
 assert.equal(result.hazards.length,0);assert.equal(result.events.filter(e=>e.type==='hazard:hit').length,1);assert.equal(result.events.filter(e=>e.type==='hazard:shatter').length,1);assert.equal(result.events.some(e=>e.type==='hazard:impact'),false);
 result=stepHazards([{...mineral,id:'m2',x:100,y:292}],{x:113,y:276,w:16,h:28,mode:'idle'},floor);
 assert.equal(result.hazards.length,0);assert.equal(result.events.filter(e=>e.type==='hazard:impact').length,1);assert.equal(result.events.filter(e=>e.type==='hazard:hit').length,1);
});
test('boss falling hazards pass through platforms and impact the fixed floor',()=>{
 let run=createStageRun(stage,{}, {seed:41});run.terrainLayout={mode:'random',platforms:[
  {x:96,y:288,w:64,h:16},{x:224,y:288,w:64,h:16},
  {x:352,y:288,w:64,h:16},{x:480,y:288,w:64,h:16}
 ]};
 run.enemies[0].state='hurt';run.enemies[0].stateTicks=1000;
 run.hazards=[
  {id:'worm-acid',ownerId:'mine-worm',kind:'acid-shot',x:96,y:280,w:16,h:16,vx:0,vy:0,life:180,poolTicks:240,alive:true},
  {id:'machine-rock',ownerId:'mine-machine',kind:'rock',x:120,y:260,w:20,h:20,vx:0,vy:0,life:180,alive:true},
  {id:'machine-mineral',ownerId:'mine-machine',kind:'mineral',x:140,y:250,w:12,h:12,vx:0,vy:0,life:60,alive:true}
 ];
 const events=[];let poolAtImpact=null;for(let i=0;i<40;i++){const result=stepStage(run,input,stage);run=result.run;events.push(...result.events);if(result.events.some(event=>event.type==='acid:pool'))poolAtImpact=structuredClone(run.hazards.find(h=>h.id==='worm-acid-pool'));}
 const pool=run.hazards.find(h=>h.id==='worm-acid-pool');
 assert.ok(pool);assert.equal(pool.w,48);assert.equal(pool.h,8);assert.equal(pool.x+pool.w/2,104);assert.equal(pool.y+pool.h,stage.arena.bottom);assert.equal(poolAtImpact.life,240);assert.ok(pool.life>0);
 const contact=stepHazards([poolAtImpact],{x:96,y:276,w:16,h:28,mode:'idle'},[stage.solids[0]]);
 assert.equal(contact.events.filter(event=>event.type==='hazard:hit').length,1);
 assert.ok(events.some(event=>event.type==='hazard:impact'&&event.id==='machine-mineral'&&event.y===stage.arena.bottom));
 assert.equal(run.hazards.some(h=>h.id==='machine-rock'),false);
});
test('machine mineral hazards and attack kinds survive snapshots; removed swipe is rejected',()=>{
 const run=makeRound(createStageRun(stage,{}, {seed:77}),5);run.boss.state='attack';run.boss.stateTicks=20;run.boss.attackKind='mineral';run.boss.lastAttack='mineral';run.boss.attackSerial=1;
 run.hazards.push({id:'mine-machine-1-mineral-0',ownerId:run.boss.id,kind:'mineral',x:300,y:270,w:12,h:12,vx:12,vy:-100,life:55,alive:true});
 const snapshot=snapshotStageRun(run),restored=restoreStageRun(stage,snapshot);assert.deepEqual(restored,run);assert.deepEqual(stepStage(restored,input,stage),stepStage(run,input,stage));
 const invalid=snapshotStageRun(run);invalid.boss.attackKind='swipe';assert.throws(()=>restoreStageRun(stage,invalid),/Invalid mine boss/);
});
test('multiple mineral contacts preserve the shared one-second single-heart protection',()=>{
 const run=makeRound(createStageRun(stage,{}, {seed:88}),5);run.boss.state='recovery';run.boss.stateTicks=20;run.boss.x=stage.arena.right-100;Object.assign(run.player,{x:stage.arena.left+40,y:276,hp:3,mode:'idle',grounded:true,invulnerableTicks:0});
 for(let i=0;i<2;i++)run.hazards.push({id:`m${i}`,ownerId:run.boss.id,kind:'mineral',x:run.player.x+i*2,y:276,w:12,h:12,vx:0,vy:0,life:50,alive:true});
 const result=stepStage(run,input,stage);assert.equal(result.run.player.hp,2);assert.equal(result.run.player.invulnerableTicks,HURT_INVULNERABLE_TICKS);assert.equal(result.events.filter(e=>e.type==='hurt'&&e.source==='hazard').length,1);assert.equal(result.run.hazards.length,0);
});
test('live boss simulation stays valid while saving active attacks',()=>{
 let r=makeRound(createStageRun(stage,{}, {seed:21}),5);r.player.x=stage.arena.left+20;r.boss.state='intro';r.boss.stateTicks=90;
 for(let i=0;i<650;i++){r=stepStage(r,input,stage).run;const parsed=parseSave(JSON.stringify({...freshSave(),run:snapshotStageRun(r)}));assert.equal(parsed.ok,true,`tick ${i}, boss ${r.boss.state}`);}
});
