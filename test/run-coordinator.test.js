import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {getStage} from '../src/game/content/stages.js';
import {createStageRun,snapshotStageRun} from '../src/game/sim/stage.js';
import {freshSave} from '../src/game/storage/saveStore.js';
import {createRunCoordinator} from '../src/game/storage/runCoordinator.js';

function setup({mode='hard',round=1,elapsedTicks=0,deaths=0}={}){
 const makeSnapshot=startRound=>snapshotStageRun(createStageRun(getStage('forest-1'),{}, {startRound,seed:1234}));
 let data={...makeSnapshot(round),elapsedTicks,deaths};
 const events=new EventEmitter(),writes=[],persistOptions=[],errors=[];
 let save=freshSave(),fail=false;
 const store={
  getSave:()=>save,
  setSave:value=>{save=value;},
  persist:options=>{
   writes.push(structuredClone(save));
   persistOptions.push(options);
   return fail?{ok:false,reason:'unavailable'}:{ok:true};
  }
 };
 const scene={mode,events,exportStageSnapshot:()=>structuredClone(data)};
 const coordinator=createRunCoordinator({store,onStorageError:e=>errors.push(e)}).bind(scene);
 return {
  events,writes,persistOptions,coordinator,errors,getSave:()=>save,
  setData:patch=>{
   if(patch.round!==undefined&&patch.round!==data.round)data=makeSnapshot(patch.round);
   Object.assign(data,patch);
  },
  clearRound:()=>{
   for(const enemy of data.enemies){enemy.hp=0;enemy.state='dead';}
   data.roundClearTicks=120;
   events.emit('round:clear');
  },
  fail:()=>{fail=true;}
 };
}

test('binding a Hard scene immediately persists its resumed round',()=>{
 const s=setup({round:3,elapsedTicks:840,deaths:2});
 const milestone={roundReached:3,cleared:false,elapsedTicks:840,deaths:2};
 assert.deepEqual(s.persistOptions,[{immediate:true}]);
 assert.deepEqual(s.writes[0].hardProgress['forest-1'],{best:milestone,recent:milestone});
 assert.equal(s.writes[0].run.round,3);
});

test('pickup and death flush actual state and dispose removes listeners',()=>{
 const s=setup();
 s.setData({elapsedTicks:201});
 s.events.emit('stage:pickup');
 s.setData({deaths:1,elapsedTicks:0});
 s.events.emit('stage:death');
 assert.deepEqual(s.writes.map(w=>[w.run.deaths,w.run.elapsedTicks]),[[0,0],[0,201],[1,0]]);
 assert.deepEqual(s.writes.slice(1).map(w=>w.hardProgress),[s.writes[0].hardProgress,s.writes[0].hardProgress]);
 s.coordinator.dispose();
 s.events.emit('stage:death');
 assert.equal(s.writes.length,3);
 for(const event of ['stage:pickup','stage:death','round:clear','round:start','stage:clear']){
  assert.equal(s.events.listenerCount(event),0,event);
 }
});

test('save cadence survives time reset and storage errors surface',()=>{
 const s=setup();
 s.setData({elapsedTicks:300});
 for(let i=0;i<59;i++)s.coordinator.tick();
 assert.equal(s.writes.length,1);
 s.fail();
 s.coordinator.tick();
 assert.deepEqual(s.errors,['unavailable']);
 s.setData({elapsedTicks:0,deaths:1});
 s.events.emit('stage:death');
 for(let i=0;i<60;i++)s.coordinator.tick();
 s.coordinator.flush();
 assert.equal(s.writes.length,5);
 assert.deepEqual(s.writes.at(-1).hardProgress,s.writes[0].hardProgress);
});

test('round clear flushes the run and the next round start advances Hard progress immediately',()=>{
 const s=setup({round:3,elapsedTicks:840,deaths:1});
 s.setData({elapsedTicks:900});
 s.clearRound();
 s.setData({round:4,elapsedTicks:1020,deaths:1});
 s.events.emit('round:start');
 const [roundClear,roundStart]=s.writes.slice(-2);
 assert.deepEqual([roundClear,roundStart].map(w=>[w.run.round,w.run.roundClearTicks,w.run.elapsedTicks]),[[3,120,900],[4,null,1020]]);
 assert.deepEqual(roundClear.hardProgress['forest-1'].recent,{roundReached:3,cleared:false,elapsedTicks:840,deaths:1});
 assert.deepEqual(roundStart.hardProgress['forest-1'].recent,{roundReached:4,cleared:false,elapsedTicks:1020,deaths:1});
 assert.deepEqual(s.persistOptions.slice(-2),[{immediate:true},{immediate:true}]);
});

test('Hard stage clear records round 8 and transitions the run exactly once',()=>{
 const s=setup({round:8});
 const record={elapsedTicks:120,deaths:2};
 s.setData({...record,outcome:'clear'});
 s.events.emit('stage:clear');
 s.events.emit('stage:clear');
 s.coordinator.tick();
 s.coordinator.flush();
 const completion=s.writes.at(-1);
 const milestone={roundReached:8,cleared:true,...record};
 assert.deepEqual(completion.hardProgress['forest-1'],{best:milestone,recent:milestone});
 assert.deepEqual(completion.records['forest-1'],{best:record,recent:record});
 assert.equal(completion.run.stageId,'mine-1');
 assert.equal(s.writes.length,2);
 assert.deepEqual(s.persistOptions.at(-1),{immediate:true});
});

test('Easy scenes never write Hard progress',()=>{
 const s=setup({mode:'easy'});
 assert.equal(s.writes.length,0);
 s.setData({round:2,elapsedTicks:300});
 s.events.emit('round:start');
 s.setData({round:8,elapsedTicks:1200,outcome:'clear'});
 s.events.emit('stage:clear');
 assert.equal(s.writes.length,2);
 assert.deepEqual(s.writes.map(w=>w.hardProgress),[freshSave().hardProgress,freshSave().hardProgress]);
});
