import test from 'node:test';
import assert from 'node:assert/strict';
import {markRunActive,clearRunActive,shouldRecoverRun} from '../src/game/storage/reloadRecovery.js';
import {MINE_STAGE} from '../src/game/content/mineStage.js';
import {createStageRun,restoreStageRun,snapshotStageRun,stepStage} from '../src/game/sim/stage.js';
import {createRoundEnemies} from '../src/game/sim/rounds.js';
import {freshSave,parseSave} from '../src/game/storage/saveStore.js';

test('only a reload of an active tab with a saved run triggers recovery',()=>{
 const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k),removeItem:k=>data.delete(k)};
 assert.equal(shouldRecoverRun('reload',true,storage),false);markRunActive(storage);
 assert.equal(shouldRecoverRun('reload',true,storage),true);
 assert.equal(shouldRecoverRun('navigate',true,storage),false);
 assert.equal(shouldRecoverRun('reload',false,storage),false);
 clearRunActive(storage);assert.equal(shouldRecoverRun('reload',true,storage),false);
});

test('unavailable session storage cannot prevent normal play',()=>{
 const storage={setItem(){throw Error('blocked');},getItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
 assert.doesNotThrow(()=>markRunActive(storage));assert.doesNotThrow(()=>clearRunActive(storage));
 assert.equal(shouldRecoverRun('reload',true,storage),false);
});

test('version-3 recovery resumes the saved round and next deterministic encounter state',()=>{
 let run=createStageRun(MINE_STAGE,{}, {seed:113});run.round=6;run.elapsedTicks=3456;run.deaths=2;
 const encounter=createRoundEnemies(MINE_STAGE,6,run.rngState,{player:run.player,boss:run.boss});run.enemies=encounter.enemies;run.rngState=encounter.rngState;
 const save={...freshSave(),unlockedStageIds:['forest-1','mine-1'],run:snapshotStageRun(run)},parsed=parseSave(JSON.stringify(save));
 assert.equal(parsed.ok,true);const restored=restoreStageRun(MINE_STAGE,parsed.save.run);
 assert.equal(restored.round,6);assert.equal(restored.elapsedTicks,3456);assert.equal(restored.deaths,2);assert.equal(restored.enemies.length,6);assert.equal(restored.rngState,run.rngState);
 assert.deepEqual(stepStage(restored,{move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:320,aimY:290},MINE_STAGE),stepStage(run,{move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:320,aimY:290},MINE_STAGE));
});
