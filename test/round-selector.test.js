import test from 'node:test';
import assert from 'node:assert/strict';
import {isRoundSelectorEnabled,ROUND_TARGETS,createPracticeRun} from '../src/game/dev/roundSelector.js';
import {snapshotStageRun,restoreStageRun,stepStage} from '../src/game/sim/stage.js';
import {getStage} from '../src/game/content/stages.js';
import {freshSave,parseSave} from '../src/game/storage/saveStore.js';

const input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:12000,aimY:290};
test('round selector is available only in development and can be disabled',()=>{
 assert.equal(isRoundSelectorEnabled({development:true,enabled:true}),true);
 assert.equal(isRoundSelectorEnabled({development:true,enabled:false}),false);
 assert.equal(isRoundSelectorEnabled({development:false,enabled:true}),false);
 assert.equal(isRoundSelectorEnabled(),false);
});
test('stage and boss practice targets start with full health and valid state',()=>{
 assert.deepEqual(ROUND_TARGETS.map(t=>t.id),['forest-start','forest-boss','mine-start','mine-machine','mine-worm']);
 for(const target of ROUND_TARGETS){
  const run=createPracticeRun(target.id,{seed:1}),stage=getStage(target.stageId),snapshot=snapshotStageRun(run);
  assert.equal(run.player.hp,3);assert.equal(run.stageId,target.stageId);
  assert.deepEqual(snapshotStageRun(restoreStageRun(stage,JSON.parse(JSON.stringify(snapshot)))),snapshot);
  if(target.id.endsWith('-start'))assert.equal(run.player.x,stage.spawn.x);
  else assert.ok(run.player.x>=stage.arena.left+16);
  if(target.id==='mine-worm'){assert.equal(run.boss.kind,'worm');assert.equal(run.bossSequence,'worm-intro');assert.equal(run.boss.stateTicks,180);}
  if(target.id==='mine-machine')assert.equal(run.boss.kind,'machine');
  assert.doesNotThrow(()=>stepStage(run,input,stage));
 }
 assert.throws(()=>createPracticeRun('unknown'),TypeError);
});
test('creating practice rounds does not change the saved run or records',()=>{
 const save=freshSave(),before=JSON.stringify(save);
 for(const target of ROUND_TARGETS)createPracticeRun(target.id,{seed:123});
 assert.equal(JSON.stringify(save),before);assert.equal(parseSave(before).ok,true);
});
