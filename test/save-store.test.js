import test from 'node:test';import assert from 'node:assert/strict';
import {freshSave,parseSave,loadSave,writeSave,recordCompletion,recordEasyDeath,recordEasyRoundCompletion,SAVE_KEY} from '../src/game/storage/saveStore.js';
import {createAppStore} from '../src/game/storage/appStore.js';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
import {createStageRun,snapshotStageRun} from '../src/game/sim/stage.js';
import {createPlayer} from '../src/game/sim/player.js';
import {createEnemy} from '../src/game/sim/enemies.js';
import {createBoss} from '../src/game/sim/boss.js';
import {createMineBoss} from '../src/game/sim/mineBoss.js';
import {MINE_STAGE} from '../src/game/content/mineStage.js';
import {createCartZones} from '../src/game/sim/mineCarts.js';
function memory(raw=null){const values=new Map(raw===null?[]:[[SAVE_KEY,raw]]);return {values,writes:0,getItem(k){return values.get(k)??null;},setItem(k,v){values.set(k,v);this.writes++;}};}
const validRun=()=>snapshotStageRun(createStageRun(FOREST_STAGE,{}, {seed:1234}));
const v1={version:1,run:{stageId:'forest-1',checkpoint:'mid',consumedPickupIds:['heal-1'],elapsedTicks:600,deaths:2},best:{elapsedTicks:30,deaths:4},recent:{elapsedTicks:60,deaths:1},settings:{musicVolume:.2,sfxVolume:.4,screenShake:false}};
function legacyV2Run(){
 const player=createPlayer(120,276);player.grounded=true;player.hitIds=[...player.hitIds];
 const enemies=FOREST_STAGE.enemies.map(template=>{const enemy=createEnemy(template);enemy.hitIds=[...enemy.hitIds];return enemy;});
 return {stageId:'forest-1',player,enemies,projectiles:[],boss:createBoss(FOREST_STAGE.boss),arenaLocked:false,consumedPickupIds:['heal-2'],elapsedTicks:800,deaths:3,outcome:null,deathTicks:0};
}
function legacyV2MineRun(){
 const player=createPlayer(120,276);player.grounded=true;player.hitIds=[...player.hitIds];
 const enemies=MINE_STAGE.enemies.map(template=>{const enemy=createEnemy(template);enemy.hitIds=[...enemy.hitIds];return enemy;});
 let seed=0;const cartZones=createCartZones(MINE_STAGE,()=>((seed++%17)/17));
 return {stageId:'mine-1',player,enemies,projectiles:[],boss:createMineBoss('machine',MINE_STAGE.boss),arenaLocked:false,consumedPickupIds:[],elapsedTicks:321,deaths:1,outcome:null,deathTicks:0,cartZones,rngState:12345,hazards:[],bossSequence:'machine',bossDrop:{rolled:false,spawned:false,consumed:false,x:0,y:0}};
}
function validV2Save(){return {version:2,run:legacyV2Run(),unlockedStageIds:['forest-1','mine-1'],records:{'forest-1':{best:{elapsedTicks:20,deaths:4},recent:{elapsedTicks:25,deaths:2}},'mine-1':{best:null,recent:null}},settings:{musicVolume:.2,sfxVolume:.4,screenShake:false}};}
function validV3Save(){
 const {easy,...legacy}=freshSave();
 return {...legacy,version:3,run:validRun(),unlockedStageIds:['forest-1','mine-1'],records:{'forest-1':{best:{elapsedTicks:420,deaths:4},recent:{elapsedTicks:500,deaths:5}},'mine-1':{best:{elapsedTicks:350,deaths:2},recent:{elapsedTicks:390,deaths:3}},},settings:{musicVolume:.2,sfxVolume:.4,screenShake:false}};
}
test('v4 validates complete snapshots, records, Easy progress and settings',()=>{
 const save={...freshSave(),run:validRun()};assert.deepEqual(parseSave(JSON.stringify(save)),{ok:true,save});
 const bad=[undefined,'{',JSON.stringify({...save,extra:true}),JSON.stringify({...save,version:0}),JSON.stringify({...save,run:{...save.run,consumedPickupIds:['heal-1','heal-1']}}),JSON.stringify({...save,run:{...save.run,consumedPickupIds:['bad']}}),JSON.stringify({...save,run:{...save.run,player:{...save.run.player,hp:4}}}),JSON.stringify({...save,unlockedStageIds:['forest-1','forest-1']}),JSON.stringify({...save,settings:{...save.settings,musicVolume:2}}),JSON.stringify({...save,easy:{...save.easy,totalDeaths:-1}})];
 for(const raw of bad)assert.equal(parseSave(raw).ok,false,String(raw));assert.equal(parseSave('{"version":5}').reason,'unsupported-version');
});

test('v4 accepts a legacy run without terrain but rejects an invalid present layout',()=>{
 const save={...freshSave(),run:validRun()};delete save.run.terrainLayout;
 assert.equal(parseSave(JSON.stringify(save)).ok,true);
 const invalid={...freshSave(),run:validRun()};invalid.run.terrainLayout={mode:'random',platforms:[]};
 assert.equal(parseSave(JSON.stringify(invalid)).ok,false);
});
test('v4 accepts new profiles and preserves old random rectangular layouts',()=>{
 const profileSave={...freshSave(),run:validRun()};
 assert.ok(profileSave.run.terrainLayout.platforms.every(platform=>Array.isArray(platform.topProfile)));
 assert.equal(parseSave(JSON.stringify(profileSave)).ok,true);
 const oldRun=validRun();oldRun.terrainLayout={mode:'random',platforms:[
  {x:96,y:288,w:64,h:16},{x:224,y:288,w:64,h:16},
  {x:352,y:288,w:64,h:16},{x:480,y:288,w:64,h:16}
 ]};
 assert.equal(parseSave(JSON.stringify({...freshSave(),run:oldRun})).ok,true);
});
test('fresh save starts at v4 with only Easy Forest Round 1 unlocked',()=>{
 const save=freshSave();
 assert.equal(save.version,4);assert.equal(save.run,null);
 assert.deepEqual(save.easy.unlockedRoundByStage,{'forest-1':1,'mine-1':0});assert.equal(save.easy.totalDeaths,0);
 for(const stageId of ['forest-1','mine-1'])for(let round=1;round<=8;round++)assert.deepEqual(save.easy.roundRecords[stageId][String(round)],{best:null,recent:null});
 assert.equal(parseSave(JSON.stringify(save)).ok,true);
});
test('valid v3 migrates Hard data unchanged and persists the new Easy defaults once',()=>{
 const legacy=validV3Save(),parsed=parseSave(JSON.stringify(legacy));
 assert.equal(parsed.ok,true);assert.equal(parsed.migrated,true);assert.equal(parsed.save.version,4);
 assert.equal(parsed.save.run.stageId,legacy.run.stageId);assert.deepEqual(parsed.save.run,legacy.run);
 assert.deepEqual(parsed.save.unlockedStageIds,legacy.unlockedStageIds);assert.deepEqual(parsed.save.records,legacy.records);assert.deepEqual(parsed.save.settings,legacy.settings);
 assert.deepEqual(parsed.save.easy,freshSave().easy);
 const storage=memory(JSON.stringify(legacy)),app=createAppStore(()=>storage);
 assert.equal(storage.writes,1);assert.deepEqual(app.getSave(),parsed.save);assert.deepEqual(loadSave(storage).save,parsed.save);
});
test('malformed v3 is rejected rather than migrated',()=>{
 const legacy=validV3Save();assert.equal(parseSave(JSON.stringify({...legacy,extra:true})).reason,'invalid');
 const invalid=validV3Save();invalid.records['forest-1'].best.elapsedTicks=-1;
 assert.equal(parseSave(JSON.stringify(invalid)).reason,'invalid');
});
test('recognized v1 is reset and written once without touching unrelated keys',()=>{
 const storage=memory(JSON.stringify(v1));storage.values.set('other','preserve');const app=createAppStore(()=>storage);
 assert.deepEqual(app.getSave(),freshSave());assert.equal(storage.writes,1);assert.equal(storage.values.get('other'),'preserve');assert.deepEqual(loadSave(storage).save,freshSave());
});
test('v1 reset write failure is visible and can retry',()=>{
 const storage=memory(JSON.stringify(v1));const write=storage.setItem;let fail=true;storage.setItem=function(k,v){if(fail)throw Error('quota');write.call(this,k,v);};
 const app=createAppStore(()=>storage);assert.equal(app.getWarning(),'unavailable');assert.equal(storage.getItem(SAVE_KEY),JSON.stringify(v1));fail=false;assert.equal(app.retry().ok,true);assert.deepEqual(loadSave(storage).save,freshSave());
});
test('a structurally valid v2 save with progress is reset and persisted as a fresh v4 save',()=>{
 const storage=memory(JSON.stringify(validV2Save()));const app=createAppStore(()=>storage);
 assert.deepEqual(app.getSave(),freshSave());assert.equal(app.getSave().version,4);assert.equal(storage.writes,1);assert.deepEqual(loadSave(storage).save,freshSave());
 const mine=parseSave(JSON.stringify({...validV2Save(),run:legacyV2MineRun()}));assert.equal(mine.ok,true);assert.equal(mine.migrated,true);assert.deepEqual(mine.save,freshSave());
});
test('storage errors are returned and writes validate before touching storage',()=>{
 const storage=memory();assert.deepEqual(writeSave(storage,freshSave()),{ok:true});assert.equal(loadSave(storage).ok,true);assert.equal(writeSave(storage,{...freshSave(),extra:1}).reason,'invalid');assert.equal(storage.writes,1);
 assert.equal(loadSave({getItem(){throw Error('denied')}}).reason,'unavailable');assert.equal(writeSave({setItem(){throw Error('quota')}},freshSave()).reason,'unavailable');
});
test('records are stage-specific and ties retain the earlier paired deaths',()=>{
 let s=recordCompletion(freshSave(),'forest-1',{elapsedTicks:500,deaths:7});s=recordCompletion(s,'forest-1',{elapsedTicks:500,deaths:1});assert.deepEqual(s.records['forest-1'],{best:{elapsedTicks:500,deaths:7},recent:{elapsedTicks:500,deaths:1}});
 assert.ok(s.unlockedStageIds.includes('mine-1'));assert.equal(s.run.stageId,'mine-1');assert.equal(s.run.round,1);assert.equal(s.run.elapsedTicks,0);assert.equal(s.run.deaths,0);assert.equal(s.run.player.hp,3);assert.equal(parseSave(JSON.stringify(s)).ok,true);
 s=recordCompletion(s,'mine-1',{elapsedTicks:400,deaths:3});assert.equal(s.records['forest-1'].best.elapsedTicks,500);assert.equal(s.records['mine-1'].best.elapsedTicks,400);assert.equal(s.run,null);
});
test('Easy deaths persist independently from Hard state and reject overflow',()=>{
 const save=freshSave(),after=recordEasyDeath(save);
 assert.equal(save.easy.totalDeaths,0);assert.equal(after.easy.totalDeaths,1);
 assert.deepEqual(after.run,save.run);assert.deepEqual(after.records,save.records);assert.deepEqual(after.unlockedStageIds,save.unlockedStageIds);assert.deepEqual(after.settings,save.settings);
 assert.throws(()=>recordEasyDeath({...save,easy:{...save.easy,totalDeaths:Number.MAX_SAFE_INTEGER}}),RangeError);
});
test('Easy round records use fastest time, retain tied best deaths, and unlock progression',()=>{
 const save=freshSave();let next=recordEasyRoundCompletion(save,'forest-1',1,{elapsedTicks:500,deaths:4});
 assert.equal(next.easy.unlockedRoundByStage['forest-1'],2);assert.deepEqual(next.easy.roundRecords['forest-1']['1'],{best:{elapsedTicks:500,deaths:4},recent:{elapsedTicks:500,deaths:4}});
 next=recordEasyRoundCompletion(next,'forest-1',1,{elapsedTicks:500,deaths:1});assert.deepEqual(next.easy.roundRecords['forest-1']['1'].best,{elapsedTicks:500,deaths:4});
 assert.deepEqual(next.easy.roundRecords['forest-1']['1'].recent,{elapsedTicks:500,deaths:1});
 next=recordEasyRoundCompletion(next,'forest-1',1,{elapsedTicks:450,deaths:6});assert.deepEqual(next.easy.roundRecords['forest-1']['1'].best,{elapsedTicks:450,deaths:6});
 for(let round=2;round<=8;round++)next=recordEasyRoundCompletion(next,'forest-1',round,{elapsedTicks:900+round,deaths:round});
 assert.equal(next.easy.unlockedRoundByStage['forest-1'],8);assert.equal(next.easy.unlockedRoundByStage['mine-1'],1);
 for(let round=1;round<=8;round++)next=recordEasyRoundCompletion(next,'mine-1',round,{elapsedTicks:800+round,deaths:round+8});
 assert.equal(next.easy.unlockedRoundByStage['mine-1'],8);
 assert.deepEqual(next.run,save.run);assert.deepEqual(next.records,save.records);assert.deepEqual(next.unlockedStageIds,save.unlockedStageIds);assert.deepEqual(next.settings,save.settings);
 assert.equal(parseSave(JSON.stringify(next)).ok,true);
});
test('Easy record updates reject invalid saves, stages, rounds and results without mutation',()=>{
 const save=freshSave(),before=JSON.stringify(save);
 assert.throws(()=>recordEasyDeath({...save,easy:{...save.easy,roundRecords:{}}}),TypeError);
 assert.throws(()=>recordEasyRoundCompletion(save,'mine-1',1,{elapsedTicks:1,deaths:0}),TypeError);
 assert.throws(()=>recordEasyRoundCompletion(save,'forest-1',2,{elapsedTicks:1,deaths:0}),TypeError);
 assert.throws(()=>recordEasyRoundCompletion(save,'forest-1',0,{elapsedTicks:1,deaths:0}),TypeError);
 assert.throws(()=>recordEasyRoundCompletion(save,'forest-1',9,{elapsedTicks:1,deaths:0}),TypeError);
 assert.throws(()=>recordEasyRoundCompletion(save,'forest-1',1,{elapsedTicks:-1,deaths:0}),TypeError);
 assert.equal(JSON.stringify(save),before);
});
test('corrupt, malformed legacy and future saves are never overwritten',()=>{
 const malformedV2={...validV2Save(),run:{stageId:'forest-1',player:{hp:3}}};
 const malformedV3={...validV3Save(),extra:true};
 for(const raw of ['bad','{"version":5}',JSON.stringify({...v1,extra:1}),JSON.stringify(malformedV2),JSON.stringify(malformedV3)]){const storage=memory(raw),app=createAppStore(()=>storage);app.setSave({...app.getSave(),run:validRun()});assert.equal(app.persist().ok,false);assert.equal(app.retry().ok,false);assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(storage.writes,0);}
});
test('failed writes retry and initially unreadable existing slots remain protected',()=>{
 const storage=memory();let fail=true;const actual=storage.setItem;storage.setItem=function(k,v){if(fail)throw Error('quota');actual.call(this,k,v);};const app=createAppStore(()=>storage);app.setSave({...app.getSave(),run:validRun()});assert.equal(app.persist().reason,'unavailable');fail=false;assert.equal(app.retry().ok,true);assert.deepEqual(loadSave(storage).save.run,validRun());
 let blocked=true;const existing=memory(JSON.stringify({...freshSave(),run:validRun()}));const other=createAppStore(()=>{if(blocked)throw Error('denied');return existing;});other.setSave({...other.getSave(),run:validRun()});blocked=false;assert.equal(other.retry().reason,'conflict');assert.equal(existing.writes,0);
});
