import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {freshSave} from '../src/game/storage/saveStore.js';import {createRunCoordinator} from '../src/game/storage/runCoordinator.js';
function setup(){let data={stageId:'forest-1',elapsedTicks:0,deaths:0};const events=new EventEmitter(),writes=[];let save={...freshSave()},fail=false;
 const store={getSave:()=>save,setSave:value=>{save=value;},persist:()=>{writes.push(structuredClone(save));return fail?{ok:false,reason:'unavailable'}:{ok:true};}};
 const scene={events,exportStageSnapshot:()=>structuredClone(data)};const errors=[];const coordinator=createRunCoordinator({store,onStorageError:e=>errors.push(e)}).bind(scene);
 return {events,writes,coordinator,errors,getSave:()=>save,setData:p=>Object.assign(data,p),fail:()=>{fail=true;}};}
test('pickup and death flush actual state and dispose removes listeners',()=>{
 const s=setup();s.setData({elapsedTicks:201});s.events.emit('stage:pickup');s.setData({deaths:1,elapsedTicks:0});s.events.emit('stage:death');
 assert.deepEqual(s.writes.map(w=>[w.run.deaths,w.run.elapsedTicks]),[[0,201],[1,0]]);s.coordinator.dispose();s.events.emit('stage:death');assert.equal(s.writes.length,2);assert.equal(s.events.listenerCount('stage:death'),0);
});
test('save cadence survives time reset, errors surface and clear is exactly once',()=>{
 const s=setup();s.setData({elapsedTicks:300});for(let i=0;i<59;i++)s.coordinator.tick();assert.equal(s.writes.length,0);s.fail();s.coordinator.tick();assert.deepEqual(s.errors,['unavailable']);
 s.setData({elapsedTicks:0,deaths:1});s.events.emit('stage:death');for(let i=0;i<60;i++)s.coordinator.tick();assert.equal(s.writes.length,3);
 s.setData({elapsedTicks:120,deaths:2});s.events.emit('stage:clear');s.events.emit('stage:clear');s.coordinator.tick();s.coordinator.flush();assert.equal(s.writes.length,4);assert.deepEqual(s.getSave().records['forest-1'].best,{elapsedTicks:120,deaths:2});assert.equal(s.getSave().run.stageId,'mine-1');s.coordinator.dispose();
});
