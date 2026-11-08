import test from 'node:test';import assert from 'node:assert/strict';
import {freshSave,parseSave,loadSave,writeSave,recordCompletion,SAVE_KEY} from '../src/game/storage/saveStore.js';
import {createAppStore} from '../src/game/storage/appStore.js';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
import {createStageRun,snapshotStageRun} from '../src/game/sim/stage.js';
function memory(raw=null){const values=new Map(raw===null?[]:[[SAVE_KEY,raw]]);return {values,writes:0,getItem(k){return values.get(k)??null;},setItem(k,v){values.set(k,v);this.writes++;}};}
const validRun=()=>snapshotStageRun(createStageRun(FOREST_STAGE));
const v1={version:1,run:{stageId:'forest-1',checkpoint:'mid',consumedPickupIds:['heal-1'],elapsedTicks:600,deaths:2},best:{elapsedTicks:30,deaths:4},recent:{elapsedTicks:60,deaths:1},settings:{musicVolume:.2,sfxVolume:.4,screenShake:false}};
test('v2 validates complete snapshots, records and settings',()=>{
 const save={...freshSave(),run:validRun()};assert.deepEqual(parseSave(JSON.stringify(save)),{ok:true,save});
 const bad=[undefined,'{',JSON.stringify({...save,extra:true}),JSON.stringify({...save,version:0}),JSON.stringify({...save,run:{...save.run,consumedPickupIds:['heal-1','heal-1']}}),JSON.stringify({...save,run:{...save.run,consumedPickupIds:['bad']}}),JSON.stringify({...save,run:{...save.run,player:{...save.run.player,hp:4}}}),JSON.stringify({...save,unlockedStageIds:['forest-1','forest-1']}),JSON.stringify({...save,settings:{...save.settings,musicVolume:2}})];
 for(const raw of bad)assert.equal(parseSave(raw).ok,false,String(raw));assert.equal(parseSave('{"version":3}').reason,'unsupported-version');
});
test('recognized v1 is reset and written once without touching unrelated keys',()=>{
 const storage=memory(JSON.stringify(v1));storage.values.set('other','preserve');const app=createAppStore(()=>storage);
 assert.deepEqual(app.getSave(),freshSave());assert.equal(storage.writes,1);assert.equal(storage.values.get('other'),'preserve');assert.deepEqual(loadSave(storage).save,freshSave());
});
test('v1 reset write failure is visible and can retry',()=>{
 const storage=memory(JSON.stringify(v1));const write=storage.setItem;let fail=true;storage.setItem=function(k,v){if(fail)throw Error('quota');write.call(this,k,v);};
 const app=createAppStore(()=>storage);assert.equal(app.getWarning(),'unavailable');assert.equal(storage.getItem(SAVE_KEY),JSON.stringify(v1));fail=false;assert.equal(app.retry().ok,true);assert.deepEqual(loadSave(storage).save,freshSave());
});
test('storage errors are returned and writes validate before touching storage',()=>{
 const storage=memory();assert.deepEqual(writeSave(storage,freshSave()),{ok:true});assert.equal(loadSave(storage).ok,true);assert.equal(writeSave(storage,{...freshSave(),extra:1}).reason,'invalid');assert.equal(storage.writes,1);
 assert.equal(loadSave({getItem(){throw Error('denied')}}).reason,'unavailable');assert.equal(writeSave({setItem(){throw Error('quota')}},freshSave()).reason,'unavailable');
});
test('records are stage-specific and ties retain the earlier paired deaths',()=>{
 let s=recordCompletion(freshSave(),'forest-1',{elapsedTicks:500,deaths:7});s=recordCompletion(s,'forest-1',{elapsedTicks:500,deaths:1});assert.deepEqual(s.records['forest-1'],{best:{elapsedTicks:500,deaths:7},recent:{elapsedTicks:500,deaths:1}});
 assert.ok(s.unlockedStageIds.includes('mine-1'));assert.equal(s.run.stageId,'mine-1');assert.equal(s.run.player.hp,3);assert.equal(parseSave(JSON.stringify(s)).ok,true);
 s=recordCompletion(s,'mine-1',{elapsedTicks:400,deaths:3});assert.equal(s.records['forest-1'].best.elapsedTicks,500);assert.equal(s.records['mine-1'].best.elapsedTicks,400);assert.equal(s.run,null);
});
test('corrupt, malformed v1 and future saves are never overwritten',()=>{
 for(const raw of ['bad','{"version":5}',JSON.stringify({...v1,extra:1})]){const storage=memory(raw),app=createAppStore(()=>storage);app.setSave({...app.getSave(),run:validRun()});assert.equal(app.persist().ok,false);assert.equal(app.retry().ok,false);assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(storage.writes,0);}
});
test('failed writes retry and initially unreadable existing slots remain protected',()=>{
 const storage=memory();let fail=true;const actual=storage.setItem;storage.setItem=function(k,v){if(fail)throw Error('quota');actual.call(this,k,v);};const app=createAppStore(()=>storage);app.setSave({...app.getSave(),run:validRun()});assert.equal(app.persist().reason,'unavailable');fail=false;assert.equal(app.retry().ok,true);assert.deepEqual(loadSave(storage).save.run,validRun());
 let blocked=true;const existing=memory(JSON.stringify({...freshSave(),run:validRun()}));const other=createAppStore(()=>{if(blocked)throw Error('denied');return existing;});other.setSave({...other.getSave(),run:validRun()});blocked=false;assert.equal(other.retry().reason,'conflict');assert.equal(existing.writes,0);
});
