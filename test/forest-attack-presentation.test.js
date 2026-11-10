import test from 'node:test';import assert from 'node:assert/strict';
import {createBoss,stepBoss} from '../src/game/sim/boss.js';
import {collectForestAttackItems} from '../src/game/render/forestAttackPresentation.js';
import {bossAnimation} from '../src/game/assets/animation.js';
import {FOREST_STAGE as stage} from '../src/game/content/forestStage.js';
import {createStageRun,snapshotStageRun,restoreStageRun,stepStage} from '../src/game/sim/stage.js';
const player={x:10900,y:276,w:16,h:28},input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:12000,aimY:290};
function root(phase=2){let b=createBoss(stage.boss);Object.assign(b,{phase,transitioned:phase===2,state:'recovery',stateTicks:1,cycle:0});return stepBoss(b,player,stage.arena).boss;}
test('root preparation has no floor marker and body holds the planted arm until eruption',()=>{
 let b=root(1);assert.deepEqual(collectForestAttackItems(b,0),[]);assert.equal(bossAnimation(b).state,'rootWindup');
 for(let i=0;i<24;i++)b=stepBoss(b,player,stage.arena).boss;
 assert.equal(bossAnimation(b).state,'rootHold');assert.deepEqual(collectForestAttackItems(b,24),[]);
 for(let i=0;i<60;i++)b=stepBoss(b,player,stage.arena).boss;
 assert.equal(bossAnimation(b).state,'rootPulse');assert.equal(collectForestAttackItems(b,84).length,1);
});
test('second root remains visible during recovery and retracts after its damage ends',()=>{
 let b=root();for(let i=0;i<84;i++)b=stepBoss(b,player,stage.arena).boss;
 assert.equal(b.state,'recovery');let items=collectForestAttackItems(b,84);assert.equal(items[0].id,'forest-root-2');assert.equal(items[0].alpha,1);assert.equal(bossAnimation(b).state,'rootPulse');
 for(let i=0;i<12;i++)b=stepBoss(b,player,stage.arena).boss;
 assert.equal(b.hitboxes.length,0);items=collectForestAttackItems(b,96);assert.equal(items.length,1);assert.equal(items[0].frame,8);assert.equal(items[0].alpha,.45);
 for(let i=0;i<12;i++)b=stepBoss(b,player,stage.arena).boss;
 assert.equal(collectForestAttackItems(b,108).length,0);
});
test('branch and slam cores meet the correct body edge in both directions',()=>{
 for(const [kind,w,h,dy] of [['branch',90,66,30],['slam',64,84,12]])for(const facing of [-1,1]){
  const b=createBoss(stage.boss),r={x:facing<0?b.x-w:b.x+b.w,y:b.y+dy,w,h,ticks:12};Object.assign(b,{state:'attack',attackKind:kind,lockedFacing:facing,hitboxes:[r]});
  const before=structuredClone(b),item=collectForestAttackItems(b,4)[0];assert.equal(item.width*.75,w);assert.equal(item.height*.75,h);assert.equal(item.flipX,facing>0);
  assert.equal(facing<0?item.x+w/2:item.x-w/2,facing<0?b.x:b.x+b.w);assert.deepEqual(b,before);assert.deepEqual(collectForestAttackItems(b,4),[item]);
 }
});
test('all root stages preserve their next simulation tick and presentation through JSON saves',()=>{
 let b=root();for(let tick=0;tick<112;tick++){
  const run=createStageRun(stage);run.boss=b;run.arenaLocked=true;
  const snapshot=JSON.parse(JSON.stringify(snapshotStageRun(run))),restored=restoreStageRun(stage,snapshot);
  assert.deepEqual(stepStage(restored,input,stage),stepStage(run,input,stage),`tick ${tick}`);assert.deepEqual(collectForestAttackItems(restored.boss,tick),collectForestAttackItems(b,tick));
  b=stepBoss(b,player,stage.arena).boss;
 }
});
test('legacy snapshots get only missing presentation state; malformed new state is rejected',()=>{
 const run=createStageRun(stage);Object.assign(run.boss,{state:'recovery',stateTicks:20,phase:2,attackKind:'root',hitboxes:[{x:11000,y:256,w:48,h:48,ticks:7}]});
 const old=snapshotStageRun(run);delete old.boss.rootEffects;const restored=restoreStageRun(stage,old);
 assert.deepEqual(restored.boss.rootEffects,[{x:11000,y:256,w:48,h:48,age:5,strike:2}]);assert.deepEqual(restored.boss.hitboxes,run.boss.hitboxes);assert.equal(restored.player.x,run.player.x);
 for(const bad of [null,[{x:0,y:0,w:48,h:48,age:24,strike:1}],[{x:0,y:0,w:48,h:48,age:0,strike:3}]]){const snapshot=snapshotStageRun(run);snapshot.boss.rootEffects=bad;assert.throws(()=>restoreStageRun(stage,snapshot),TypeError);}
 const dead=createStageRun(stage);dead.player.y=344;dead.boss.rootEffects=[{x:11000,y:256,w:48,h:48,age:0,strike:1}];dead.boss.secondRootDelay=10;dead.boss.secondRoot={x:11000,y:256,w:48,h:48};const result=stepStage(dead,input,stage);assert.deepEqual(result.run.boss.rootEffects,[]);assert.equal(result.run.boss.secondRootDelay,0);
});
