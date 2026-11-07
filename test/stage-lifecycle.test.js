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
test('simultaneous lethal collision wins over the player swing',()=>{
 let r=createStageRun(stage);r.player.x=11010;r.player.hp=1;r.player.mode='attack';r.player.attackTick=4;r.player.lockedAim={x:1,y:0};
 Object.assign(r.boss,{hp:1,state:'attack',stateTicks:5,phase:2,transitioned:true,hitboxes:[{x:11000,y:260,w:40,h:44,ticks:5}]});r.arenaLocked=true;
 const result=tick(r);assert.equal(result.run.player.mode,'dead');assert.equal(result.run.boss.hp,1);assert.equal(result.run.outcome,null);assert.equal(result.events.filter(e=>e.type==='stage:clear').length,0);
});
test('boss death unlocks arena and emits clear once after victory',()=>{
 let r=createStageRun(stage);r.player.x=11010;r.player.mode='attack';r.player.attackTick=4;r.player.lockedAim={x:1,y:0};
 Object.assign(r.boss,{hp:1,state:'recovery',stateTicks:40,phase:2,transitioned:true});r.arenaLocked=true;
 let result=tick(r);r=result.run;assert.equal(r.boss.state,'dying');assert.equal(r.arenaLocked,false);assert.equal(r.player.mode,'idle');assert.equal(r.player.combo,0);
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
