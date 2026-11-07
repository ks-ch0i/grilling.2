import test from 'node:test';import assert from 'node:assert/strict';
import {freshSave,parseSave,loadSave,writeSave,recordCompletion,SAVE_KEY} from '../src/game/storage/saveStore.js';
import {createAppStore} from '../src/game/storage/appStore.js';
function memory(raw=null){return {raw,writes:0,getItem(k){assert.equal(k,SAVE_KEY);return this.raw;},setItem(k,v){assert.equal(k,SAVE_KEY);this.raw=v;this.writes++;}};}
const validRun={stageId:'forest-1',checkpoint:'mid',consumedPickupIds:['heal-1'],elapsedTicks:600,deaths:2};
test('strict save schema validates full checkpoint, records and settings',()=>{
 assert.deepEqual(parseSave(null),{ok:true,save:freshSave()});const save={...freshSave(),run:validRun,best:{elapsedTicks:30,deaths:4},recent:{elapsedTicks:60,deaths:1}};assert.deepEqual(parseSave(JSON.stringify(save)),{ok:true,save});
 const malformed=[undefined,'{',JSON.stringify({...save,extra:true}),JSON.stringify({...save,version:0}),JSON.stringify({...save,run:{...validRun,consumedPickupIds:['heal-1','heal-1']}}),JSON.stringify({...save,run:{...validRun,consumedPickupIds:['bad']}}),JSON.stringify({...save,run:{...validRun,checkpoint:'end'}}),JSON.stringify({...save,best:{elapsedTicks:-1,deaths:0}}),JSON.stringify({...save,recent:{elapsedTicks:1.5,deaths:0}}),JSON.stringify({...save,settings:{...save.settings,musicVolume:2}})];
 for(const raw of malformed)assert.equal(parseSave(raw).ok,false,String(raw));assert.equal(parseSave('{"version":2}').reason,'unsupported-version');
});
test('storage errors are returned and write validates before touching storage',()=>{
 const storage=memory();assert.deepEqual(writeSave(storage,freshSave()),{ok:true});assert.equal(loadSave(storage).ok,true);
 assert.equal(writeSave(storage,{...freshSave(),extra:1}).reason,'invalid');assert.equal(storage.writes,1);
 assert.equal(loadSave({getItem(){throw Error('denied')}}).reason,'unavailable');assert.equal(writeSave({setItem(){throw Error('quota')}},freshSave()).reason,'unavailable');
});
test('best and recent retain paired times and deaths, including ties',()=>{
 let s=recordCompletion(freshSave(),{elapsedTicks:500,deaths:7});s=recordCompletion(s,{elapsedTicks:500,deaths:1});assert.deepEqual(s.best,{elapsedTicks:500,deaths:7});assert.deepEqual(s.recent,{elapsedTicks:500,deaths:1});
 s=recordCompletion(s,{elapsedTicks:400,deaths:3});assert.deepEqual(s.best,{elapsedTicks:400,deaths:3});assert.equal(s.run,null);
});
test('corrupt and future saves are never silently overwritten',()=>{
 for(const raw of ['bad','{"version":5}']){const storage=memory(raw),app=createAppStore(()=>storage);app.setSave({...app.getSave(),run:validRun});assert.equal(app.persist().ok,false);assert.equal(app.retry().ok,false);assert.equal(storage.raw,raw);assert.equal(storage.writes,0);}
});
test('failed write can retry the latest in-memory state without hiding failure',()=>{
 const storage=memory();let fail=true;const actual=storage.setItem;storage.setItem=function(k,v){if(fail)throw Error('quota');actual.call(this,k,v);};const app=createAppStore(()=>storage);
 app.setSave({...app.getSave(),run:validRun});assert.equal(app.persist().ok,false);assert.equal(app.getWarning(),'unavailable');fail=false;assert.equal(app.retry().ok,true);assert.equal(app.getWarning(),null);assert.deepEqual(loadSave(storage).save.run,validRun);
});
test('an initially unreadable existing slot is not overwritten after recovery',()=>{
 const existing=memory(JSON.stringify({...freshSave(),run:validRun}));let blocked=true;const app=createAppStore(()=>{if(blocked)throw Error('denied');return existing;});app.setSave({...app.getSave(),run:{...validRun,checkpoint:'start'}});blocked=false;
 assert.equal(app.retry().reason,'conflict');assert.equal(existing.writes,0);assert.equal(loadSave(existing).save.run.checkpoint,'mid');
});

test('recovery does not overwrite an existing settings-only slot',()=>{
 const existing=memory(JSON.stringify({...freshSave(),settings:{musicVolume:.1,sfxVolume:.2,screenShake:false}}));let blocked=true;
 const app=createAppStore(()=>{if(blocked)throw Error('denied');return existing;});app.setSave({...app.getSave(),run:validRun});blocked=false;
 assert.equal(app.retry().reason,'conflict');assert.equal(existing.writes,0);assert.equal(loadSave(existing).save.settings.musicVolume,.1);
});
