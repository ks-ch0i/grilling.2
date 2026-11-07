import test from 'node:test';import assert from 'node:assert/strict';
import {FOREST_STAGE as stage} from '../src/game/content/forestStage.js';
import {createStageRun,stepStage,restoreCheckpoint,checkpointData} from '../src/game/sim/stage.js';
const input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:12000,aimY:290};
const tick=(r,n=1)=>{let events=[];for(let i=0;i<n;i++){const next=stepStage(r,input,stage);r=next.run;events.push(...next.events);}return {run:r,events};};
test('checkpoint, full health pickup and respawn preserve consumption and counters',()=>{
 const original=JSON.stringify(stage);let r=createStageRun(stage);
 r.player.x=2400;let result=tick(r);r=result.run;assert.equal(r.player.hp,3);assert.deepEqual(r.consumedPickupIds,['heal-1']);assert.ok(result.events.some(e=>e.type==='stage:pickup'));
 r.player.x=5760;result=tick(r);r=result.run;assert.equal(r.checkpoint,'mid');assert.ok(result.events.some(e=>e.type==='stage:checkpoint'));
 r.enemies[0].hp=1;r.enemies[0].state='dead';r.projectiles.push({id:'p',x:0,y:0,w:8,h:8,vx:0,vy:0,life:50,alive:true});r.player.y=344;r.player.invulnerableTicks=40;
 result=tick(r);r=result.run;assert.equal(r.deaths,1);assert.equal(r.player.mode,'dead');assert.ok(result.events.some(e=>e.type==='stage:death'));
 r=tick(r,60).run;assert.equal(r.player.x,stage.checkpoint.x);assert.equal(r.player.hp,3);assert.equal(r.enemies[0].hp,3);assert.equal(r.projectiles.length,0);assert.deepEqual(r.consumedPickupIds,['heal-1']);assert.equal(r.deaths,1);assert.equal(JSON.stringify(stage),original);
 assert.deepEqual(checkpointData(restoreCheckpoint(r,stage)),checkpointData(r));
});
test('death before checkpoint returns to start and checkpoint data is validated',()=>{
 let r=createStageRun(stage);r.player.y=344;r=tick(r).run;r=tick(r,60).run;assert.equal(r.player.x,stage.spawn.x);
 assert.throws(()=>createStageRun(stage,{checkpoint:'other'}),TypeError);assert.throws(()=>createStageRun(stage,{consumedPickupIds:['missing']}),TypeError);
});
test('arena locks on entry, death unlocks, and restore resets boss',()=>{
 let r=createStageRun(stage);r.player.x=stage.arena.left+16;r=tick(r).run;assert.equal(r.arenaLocked,true);assert.equal(r.boss.state,'intro');
 r.player.y=344;r.boss.state='recovery';r.boss.stateTicks=10;let result=tick(r);r=result.run;assert.equal(r.arenaLocked,false);r=tick(r,60).run;assert.equal(r.boss.state,'dormant');assert.equal(r.boss.hp,18);
});
test('the player can move and jump while the boss enters',()=>{
 let r=createStageRun(stage);r.player.x=stage.arena.left+16;
 r=stepStage(r,{...input,move:1},stage).run;assert.equal(r.boss.state,'intro');const startX=r.player.x,startY=r.player.y;
 for(let i=0;i<20;i++)r=stepStage(r,{...input,move:1,jumpPressed:i===0,jumpHeld:true},stage).run;
 assert.equal(r.boss.state,'intro');assert.ok(r.player.x>startX+20);assert.ok(r.player.y<startY-10);assert.equal(r.outcome,null);
});
test('the mixed enemy pairs can react together at their actual spawn positions',()=>{
 for(const [x,ids,partner] of [[2150,['soldier-2','wisp-1'],'wisp-1'],[6300,['soldier-3','boar-2'],'boar-2']]){
  let r=createStageRun(stage);r.enemies=r.enemies.filter(e=>ids.includes(e.id));r.player.x=x;
  for(let i=0;i<5;i++)r=stepStage(r,input,stage).run;
  assert.equal(r.enemies.find(e=>e.kind==='soldier').state,'chase');assert.equal(r.enemies.find(e=>e.id===partner).state,'windup');
 }
});
test('dive landing damages only enemies overlapping the impact area',()=>{
 let r=createStageRun(stage);Object.assign(r.player,{x:200,y:275,mode:'dive',diveUsed:true,grounded:false});
 const near=r.enemies.find(e=>e.id==='soldier-1'),far=r.enemies.find(e=>e.id==='soldier-2');
 Object.assign(near,{x:238,y:276,state:'hurt',stateTicks:10});Object.assign(far,{x:239,y:276,state:'hurt',stateTicks:10});r.enemies=[near,far];
 const result=tick(r),impact=result.events.find(e=>e.type==='dive-impact');assert.equal(impact.canDamage,true);
 assert.equal(result.run.enemies[0].hp,near.hp-1);assert.equal(result.run.enemies[1].hp,far.hp);
});
test('diving through an enemy and landing on it preserves hp and deals one impact',()=>{
 let r=createStageRun(stage); Object.assign(r.player,{x:200,y:240,mode:'dive',diveUsed:true,grounded:false});
 const enemy=r.enemies.find(e=>e.id==='soldier-1'); Object.assign(enemy,{x:200,y:276,state:'attack',stateTicks:8,lockedFacing:1}); r.enemies=[enemy];
 r.projectiles=[{id:'shot',ownerId:enemy.id,x:202,y:250,w:8,h:8,vx:0,vy:0,life:10,alive:true}];
 let impacts=0,projectileHit=false;
 for(let i=0;i<15&&!r.player.grounded;i++){const result=tick(r);r=result.run;impacts+=result.events.filter(e=>e.type==='dive-impact').length;projectileHit ||= result.events.some(e=>e.type==='projectile:hit'); assert.equal(r.player.hp,3);}
 assert.equal(projectileHit,true);assert.equal(r.projectiles.length,0);assert.equal(impacts,1);assert.equal(r.enemies[0].hp,2);assert.equal(r.player.diveGraceTicks,15);
 for(let i=0;i<15;i++){r=tick(r).run;assert.equal(r.player.hp,3);}
 r=tick(r).run;assert.equal(r.player.hp,2);
});
test('boss contact and attacks cannot interrupt a diving player',()=>{
 let r=createStageRun(stage);r.enemies=[];r.arenaLocked=true;
 Object.assign(r.player,{x:11040,y:150,mode:'dive',diveUsed:true,grounded:false});
 Object.assign(r.boss,{state:'attack',stateTicks:5,hitboxes:[{x:11040,y:150,w:80,h:100,ticks:5}]});
 const result=tick(r);assert.equal(result.run.player.hp,3);assert.equal(result.run.player.mode,'dive');assert.equal(result.events.some(e=>e.type==='hurt'),false);
});
test('dive landing during boss intro does not apply damage',()=>{
 let r=createStageRun(stage);Object.assign(r.player,{x:200,y:275,mode:'dive',diveUsed:true,grounded:false});
 const near=r.enemies.find(e=>e.id==='soldier-1');Object.assign(near,{x:227,y:276,state:'hurt',stateTicks:10});r.enemies=[near];
 Object.assign(r.boss,{state:'intro',stateTicks:20});const result=tick(r),impact=result.events.find(e=>e.type==='dive-impact');
 assert.equal(impact.canDamage,false);assert.equal(result.run.enemies[0].hp,near.hp);
});
test('attack input is accepted during boss intro and transition while damage stays locked',()=>{
 for(const state of ['intro','transition']){
  let r=createStageRun(stage);Object.assign(r.player,{x:200,y:276,grounded:true});
  const enemy=r.enemies.find(e=>e.id==='soldier-1');Object.assign(enemy,{x:225,y:276,state:'hurt',stateTicks:30});r.enemies=[enemy];
  Object.assign(r.boss,{state,stateTicks:30});let events=[];
  for(let i=0;i<7;i++){const next=stepStage(r,{...input,attackPressed:i===0,aimX:250,aimY:290},stage);r=next.run;events.push(...next.events);}
  assert.equal(events.filter(e=>e.type==='swing').length,1,state);assert.equal(r.enemies[0].hp,enemy.hp,state);assert.equal(events.some(e=>e.type==='enemy:hurt'),false,state);
 }
});
test('simultaneous lethal collision wins over the player swing',()=>{
 let r=createStageRun(stage);r.player.x=11010;r.player.hp=1;r.player.mode='attack';r.player.attackTick=4;r.player.aim={x:1,y:0};
 Object.assign(r.boss,{hp:1,state:'attack',stateTicks:5,phase:2,transitioned:true,hitboxes:[{x:11000,y:260,w:40,h:44,ticks:5}]});r.arenaLocked=true;
 const result=tick(r);assert.equal(result.run.player.mode,'dead');assert.equal(result.run.boss.hp,1);assert.equal(result.run.outcome,null);assert.equal(result.events.filter(e=>e.type==='stage:clear').length,0);
});
test('boss death unlocks arena and emits clear once after victory',()=>{
 let r=createStageRun(stage);r.player.x=11010;r.player.mode='attack';r.player.attackTick=4;r.player.aim={x:1,y:0};
 Object.assign(r.boss,{hp:1,state:'recovery',stateTicks:40,phase:2,transitioned:true});r.arenaLocked=true;
 let result=tick(r);r=result.run;assert.equal(r.boss.state,'dying');assert.equal(r.arenaLocked,false);assert.equal(r.player.mode,'idle');assert.equal(r.player.attackTick,0);
 result=tick(r,90);r=result.run;assert.equal(r.outcome,'clear');assert.equal(result.events.filter(e=>e.type==='stage:clear').length,1);assert.equal(tick(r).events.length,0);
});

test('all three enemy kinds can be defeated through the player combat loop',()=>{
 for(const spawn of stage.enemies.filter(e=>e.id.endsWith('-1'))){
  let r=createStageRun(stage);r.enemies=r.enemies.filter(e=>e.id===spawn.id);r.player.x=spawn.x-40;
  for(let i=0;i<150&&r.enemies[0].state!=='dead'&&r.player.mode!=='dead';i++){
   r=stepStage(r,{...input,attackPressed:i%12===0,aimX:spawn.x+8,aimY:290},stage).run;
  }
  assert.equal(r.enemies[0].state,'dead',spawn.kind);assert.ok(r.player.hp>0,spawn.kind);
 }
});

test('time includes all death and respawn ticks',()=>{
 let r=createStageRun(stage);r.player.y=344;let result=tick(r);r=result.run;const before=r.elapsedTicks;
 result=tick(r,60);assert.equal(result.run.elapsedTicks,before+60);assert.equal(result.run.deaths,1);assert.equal(result.run.player.hp,3);
});
