import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {freshSave} from '../src/game/storage/saveStore.js';import {createRunCoordinator} from '../src/game/storage/runCoordinator.js';
function setup(){let data={stageId:'forest-1',checkpoint:'start',consumedPickupIds:[],elapsedTicks:0,deaths:0};const events=new EventEmitter(),writes=[];let save={...freshSave(),run:{...data}},fail=false;
 const store={getSave:()=>save,setSave:value=>{save=value;},persist:()=>{writes.push(structuredClone(save));return fail?{ok:false,reason:'unavailable'}:{ok:true};}};
 const scene={events,exportCheckpointData:()=>structuredClone(data)};const errors=[];const coordinator=createRunCoordinator({store,onStorageError:e=>errors.push(e)}).bind(scene);
 return {events,writes,coordinator,errors,getSave:()=>save,setData:p=>Object.assign(data,p),fail:()=>{fail=true;}};}
test('checkpoint, pickup and death flush the snapshot after each event',()=>{
 const s=setup();s.setData({checkpoint:'mid',elapsedTicks:200});s.events.emit('stage:checkpoint');s.setData({consumedPickupIds:['heal-1'],elapsedTicks:201});s.events.emit('stage:pickup');s.setData({deaths:1,elapsedTicks:202});s.events.emit('stage:death');
 assert.deepEqual(s.writes.map(w=>[w.run.checkpoint,w.run.consumedPickupIds.length,w.run.deaths,w.run.elapsedTicks]),[['mid',0,0,200],['mid',1,0,201],['mid',1,1,202]]);
 s.coordinator.dispose();s.events.emit('stage:death');assert.equal(s.writes.length,3);assert.equal(s.events.listenerCount('stage:death'),0);
});
test('periodic ticks use play time, failures surface and clear happens only once',()=>{
 const s=setup();s.setData({elapsedTicks:59});s.coordinator.tick();assert.equal(s.writes.length,0);s.setData({elapsedTicks:60});s.fail();s.coordinator.tick();assert.deepEqual(s.errors,['unavailable']);
 s.setData({elapsedTicks:120,deaths:2});s.events.emit('stage:clear');s.events.emit('stage:clear');s.coordinator.tick();s.coordinator.flush();assert.equal(s.writes.length,2);assert.deepEqual(s.getSave().best,{elapsedTicks:120,deaths:2});assert.equal(s.getSave().run,null);s.coordinator.dispose();
});
