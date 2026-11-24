import test from 'node:test';import assert from 'node:assert/strict';
import {freshSave,parseSave,loadSave,writeSave,recordCompletion,compareHardProgress,recordHardProgress,hasSaveProgress,recordEasyDeath,recordEasyRoundCompletion,isValidCloudSave,toCloudSave,fromCloudSave,SAVE_KEY} from '../src/game/storage/saveStore.js';
import {createAppStore} from '../src/game/storage/appStore.js';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
import {createStageRun,snapshotStageRun} from '../src/game/sim/stage.js';
import {createPlayer} from '../src/game/sim/player.js';
import {createEnemy} from '../src/game/sim/enemies.js';
import {createBoss} from '../src/game/sim/boss.js';
import {createMineBoss} from '../src/game/sim/mineBoss.js';
import {MINE_STAGE} from '../src/game/content/mineStage.js';
import {createCartZones} from '../src/game/sim/mineCarts.js';
import {ARENA_PLATFORM_PRESETS} from '../src/game/content/arenaPlatformPresets.js';
function memory(raw=null){const values=new Map(raw===null?[]:[[SAVE_KEY,raw]]);return {values,writes:0,getItem(k){return values.get(k)??null;},setItem(k,v){values.set(k,v);this.writes++;}};}
const validRun=()=>snapshotStageRun(createStageRun(FOREST_STAGE,{}, {seed:1234}));
const oldProfileLayout=()=>({mode:'random',platforms:[
 {x:80,w:48,topProfile:[280,284,280],variant:0},{x:192,w:48,topProfile:[276,272,276],variant:1}
]});
const v1={version:1,run:{stageId:'forest-1',checkpoint:'mid',consumedPickupIds:['heal-1'],elapsedTicks:600,deaths:2},best:{elapsedTicks:30,deaths:4},recent:{elapsedTicks:60,deaths:1},settings:{musicVolume:.2,sfxVolume:.4,screenShake:false}};
function legacyV2Run(){
 const player=createPlayer(120,276);player.grounded=true;player.hitIds=[...player.hitIds];
 for(const key of ['defenseMode','defenseTicksRemaining','shieldCooldownTicks','parryCooldownTicks','airborneTicks'])delete player[key];
 const enemies=FOREST_STAGE.enemies.map(template=>{const enemy=createEnemy(template);enemy.hitIds=[...enemy.hitIds];return enemy;});
 return {stageId:'forest-1',player,enemies,projectiles:[],boss:createBoss(FOREST_STAGE.boss),arenaLocked:false,consumedPickupIds:['heal-2'],elapsedTicks:800,deaths:3,outcome:null,deathTicks:0};
}
function legacyV2MineRun(){
 const player=createPlayer(120,276);player.grounded=true;player.hitIds=[...player.hitIds];
 for(const key of ['defenseMode','defenseTicksRemaining','shieldCooldownTicks','parryCooldownTicks','airborneTicks'])delete player[key];
 const enemies=MINE_STAGE.enemies.map(template=>{const enemy=createEnemy(template);enemy.hitIds=[...enemy.hitIds];return enemy;});
 let seed=0;const cartZones=createCartZones(MINE_STAGE,()=>((seed++%17)/17));
 return {stageId:'mine-1',player,enemies,projectiles:[],boss:createMineBoss('machine',MINE_STAGE.boss),arenaLocked:false,consumedPickupIds:[],elapsedTicks:321,deaths:1,outcome:null,deathTicks:0,cartZones,rngState:12345,hazards:[],bossSequence:'machine',bossDrop:{rolled:false,spawned:false,consumed:false,x:0,y:0}};
}
function validV2Save(){return {version:2,run:legacyV2Run(),unlockedStageIds:['forest-1','mine-1'],records:{'forest-1':{best:{elapsedTicks:20,deaths:4},recent:{elapsedTicks:25,deaths:2}},'mine-1':{best:null,recent:null}},settings:{musicVolume:.2,sfxVolume:.4,screenShake:false}};}
function validV3Save(){
 const {easy,hardProgress,...legacy}=freshSave();
 const run={...validRun(),terrainLayout:oldProfileLayout()};
 for(const key of ['defenseMode','defenseTicksRemaining','shieldCooldownTicks','parryCooldownTicks','airborneTicks'])delete run.player[key];
 return {...legacy,version:3,run,unlockedStageIds:['forest-1','mine-1'],records:{'forest-1':{best:{elapsedTicks:420,deaths:4},recent:{elapsedTicks:500,deaths:5}},'mine-1':{best:{elapsedTicks:350,deaths:2},recent:{elapsedTicks:390,deaths:3}},},settings:{musicVolume:.2,sfxVolume:.4,screenShake:false}};
}
function validV6Save(){
 const {hardProgress,...base}=freshSave();
 const save={...base,version:6,run:validRun()};
 if(save.run)delete save.run.player.airborneTicks;
 return save;
}
function legacyEasyProgress(){const easy=freshSave().easy;return {unlockedRoundByStage:easy.unlockedRoundByStage,totalDeaths:0,roundRecords:easy.roundRecords};}
function validV5Save(){
 const {hardProgress,...base}=freshSave();
 const save={...base,version:5,easy:legacyEasyProgress(),run:validRun()};
 if(save.run)delete save.run.player.airborneTicks;
 return save;
}
function validV4Save(){const v3=validV3Save();return {...v3,version:4,easy:legacyEasyProgress()};}
test('v8 validates complete snapshots including bounded airborneTicks',()=>{
 const run=validRun();run.player.airborneTicks=30;
 const save={...freshSave(),version:8,run};assert.deepEqual(parseSave(JSON.stringify(save)),{ok:true,save});
 const bad=[undefined,'{',JSON.stringify({...save,extra:true}),JSON.stringify({...save,version:0}),JSON.stringify({...save,run:{...save.run,consumedPickupIds:['heal-1','heal-1']}}),JSON.stringify({...save,run:{...save.run,consumedPickupIds:['bad']}}),JSON.stringify({...save,run:{...save.run,player:{...save.run.player,hp:4}}}),JSON.stringify({...save,run:{...save.run,player:{...save.run.player,hp:2.25}}}),JSON.stringify({...save,run:{...save.run,player:{...save.run.player,shieldCooldownTicks:181}}}),...[-1,1.5,31].map(airborneTicks=>JSON.stringify({...save,run:{...save.run,player:{...save.run.player,airborneTicks}}})),JSON.stringify({...save,unlockedStageIds:['forest-1','forest-1']}),JSON.stringify({...save,settings:{...save.settings,musicVolume:2}}),JSON.stringify({...save,easy:{...save.easy,roundDeaths:{...save.easy.roundDeaths,'forest-1':{...save.easy.roundDeaths['forest-1'],'1':-1}}}})];
 for(const raw of bad)assert.equal(parseSave(raw).ok,false,String(raw));assert.equal(parseSave('{"version":9}').reason,'unsupported-version');
});

test('v6 migrates to v8 and initializes airborneTicks',()=>{
 const legacy=validV6Save();legacy.records['forest-1'].best={elapsedTicks:900,deaths:2};legacy.easy.roundDeaths['forest-1']['1']=3;
 const parsed=parseSave(JSON.stringify(legacy));
 assert.equal(parsed.ok,true);assert.equal(parsed.migrated,true);assert.equal(parsed.save.version,8);
 assert.equal(parsed.save.run.player.airborneTicks,0);assert.deepEqual(parsed.save.records,legacy.records);
 assert.deepEqual(parsed.save.easy,legacy.easy);assert.deepEqual(parsed.save.settings,legacy.settings);
 const {settings,...cloud}=legacy;assert.equal(isValidCloudSave(cloud),true);
 const restored=fromCloudSave(cloud,{musicVolume:.2,sfxVolume:.4,screenShake:false});
 assert.equal(restored.version,8);assert.equal(restored.run.player.airborneTicks,0);
 assert.deepEqual(restored.hardProgress['forest-1'],{best:{roundReached:8,cleared:true,elapsedTicks:900,deaths:2},recent:null});
 assert.deepEqual(restored.settings,{musicVolume:.2,sfxVolume:.4,screenShake:false});
 const exported=toCloudSave(parsed.save);assert.equal(exported.version,8);assert.equal(Object.hasOwn(exported,'settings'),false);
});

test('v8 accepts a legacy terrain layout but rejects an invalid present layout',()=>{
 const save={...freshSave(),run:validRun()};delete save.run.terrainLayout;
 assert.equal(parseSave(JSON.stringify(save)).ok,true);
 const invalid={...freshSave(),run:validRun()};invalid.run.terrainLayout={mode:'random',platforms:[]};
 assert.equal(parseSave(JSON.stringify(invalid)).ok,false);
});
test('v8 round-trips authored, older profile and older rectangular runs with records intact',()=>{
 const authored=snapshotStageRun(createStageRun(FOREST_STAGE,{}, {seed:251}));
 assert.equal(authored.terrainLayout.presetId,'forest-terrace-v1');
 const oldRectangles={mode:'random',platforms:[
  {x:96,y:288,w:64,h:16},{x:224,y:288,w:64,h:16},
  {x:352,y:288,w:64,h:16},{x:480,y:288,w:64,h:16}
 ]};
 for(const terrainLayout of [authored.terrainLayout,oldProfileLayout(),oldRectangles]){
  const save={...freshSave(),version:8,run:{...authored,elapsedTicks:721,deaths:2,terrainLayout}};
  save.records['forest-1'].best={elapsedTicks:900,deaths:1};
  save.easy.roundDeaths['forest-1']['1']=3;
  const storage=memory();assert.deepEqual(writeSave(storage,save),{ok:true});
  assert.deepEqual(loadSave(storage),{ok:true,save});
 }
 const mismatched=structuredClone(authored);mismatched.terrainLayout.platforms[1].topProfile[0]++;
 assert.equal(parseSave(JSON.stringify({...freshSave(),run:mismatched})).ok,false);
});
test('v8 stores and restores an in-progress platform drop',()=>{
 const run=validRun();assert.ok(run.terrainLayout.platforms.length>0);run.player.dropPlatforms=[0];
 const storage=memory(),save={...freshSave(),run};assert.deepEqual(writeSave(storage,save),{ok:true});
 const loaded=loadSave(storage);assert.equal(loaded.ok,true);assert.equal(loaded.save.version,8);assert.deepEqual(loaded.save.run.player.dropPlatforms,[0]);
});
test('fresh save starts at v8 with only Easy Forest Round 1 unlocked',()=>{
 const save=freshSave();
 assert.equal(save.version,8);assert.equal(save.run,null);
 assert.deepEqual(save.hardProgress,{'forest-1':{best:null,recent:null},'mine-1':{best:null,recent:null}});
 assert.deepEqual(save.easy.unlockedRoundByStage,{'forest-1':1,'mine-1':0});
 assert.equal(save.easy.roundDeaths['forest-1']['1'],0);assert.equal(save.easy.roundDeaths['forest-1']['2'],0);assert.equal(save.easy.roundDeaths['mine-1']['1'],0);
 for(const stageId of ['forest-1','mine-1'])for(let round=1;round<=8;round++)assert.deepEqual(save.easy.roundRecords[stageId][String(round)],{best:null,recent:null});
 assert.equal(parseSave(JSON.stringify(save)).ok,true);
});
test('v1-v5 migration produces v8 and preserves v3 progress',()=>{
 const legacy=validV3Save(),parsed=parseSave(JSON.stringify(legacy));
 assert.equal(parsed.ok,true);assert.equal(parsed.migrated,true);assert.equal(parsed.save.version,8);
 assert.equal(parsed.save.run.stageId,legacy.run.stageId);
 const migratedPlayer={...parsed.save.run.player};for(const key of ['defenseMode','defenseTicksRemaining','shieldCooldownTicks','parryCooldownTicks','airborneTicks'])delete migratedPlayer[key];
 assert.deepEqual(migratedPlayer,legacy.run.player);assert.equal(parsed.save.run.player.defenseMode,'none');
 assert.deepEqual(parsed.save.unlockedStageIds,legacy.unlockedStageIds);assert.deepEqual(parsed.save.records,legacy.records);assert.deepEqual(parsed.save.settings,legacy.settings);
 assert.deepEqual(parsed.save.easy,freshSave().easy);
 const storage=memory(JSON.stringify(legacy)),app=createAppStore(()=>storage);
 assert.equal(storage.writes,1);assert.deepEqual(app.getSave(),parsed.save);assert.deepEqual(loadSave(storage).save,parsed.save);
});
test('v1-v5 migration produces v8 and preserves v5 progress',()=>{
 const legacy=validV5Save();legacy.easy.unlockedRoundByStage['forest-1']=4;
 const parsed=parseSave(JSON.stringify(legacy));
 assert.equal(parsed.ok,true);assert.equal(parsed.migrated,true);assert.equal(parsed.save.version,8);
 assert.equal(parsed.save.run.player.airborneTicks,0);
 assert.deepEqual(parsed.save.easy.unlockedRoundByStage,legacy.easy.unlockedRoundByStage);
 assert.deepEqual(parsed.save.easy.roundRecords,legacy.easy.roundRecords);
 assert.equal(parsed.save.easy.roundDeaths['forest-1']['1'],0);
});
test('v1-v5 migration produces v8 and initializes independent Easy round death counters',()=>{
 const legacy=validV4Save();legacy.easy.totalDeaths=17;legacy.easy.unlockedRoundByStage['forest-1']=4;
 const parsed=parseSave(JSON.stringify(legacy));assert.equal(parsed.ok,true);assert.equal(parsed.migrated,true);assert.equal(parsed.save.version,8);
 assert.equal(parsed.save.run.player.defenseMode,'none');assert.equal(parsed.save.run.player.defenseTicksRemaining,0);
 assert.equal(parsed.save.run.player.shieldCooldownTicks,0);assert.equal(parsed.save.run.player.parryCooldownTicks,0);
 const migratedRun={...parsed.save.run,player:{...parsed.save.run.player}};
 for(const key of ['defenseMode','defenseTicksRemaining','shieldCooldownTicks','parryCooldownTicks','airborneTicks'])delete migratedRun.player[key];
 assert.deepEqual(migratedRun,legacy.run);assert.deepEqual(parsed.save.records,legacy.records);assert.deepEqual(parsed.save.unlockedStageIds,legacy.unlockedStageIds);
 assert.deepEqual(parsed.save.easy.unlockedRoundByStage,legacy.easy.unlockedRoundByStage);assert.deepEqual(parsed.save.easy.roundRecords,legacy.easy.roundRecords);
 assert.equal(parsed.save.easy.roundDeaths['forest-1']['1'],0);assert.equal(parsed.save.easy.roundDeaths['mine-1']['8'],0);
 assert.deepEqual(parsed.save.settings,legacy.settings);
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
test('a structurally valid v2 save with progress is reset and persisted as a fresh v8 save',()=>{
 const storage=memory(JSON.stringify(validV2Save()));const app=createAppStore(()=>storage);
 assert.deepEqual(app.getSave(),freshSave());assert.equal(app.getSave().version,8);assert.equal(storage.writes,1);assert.deepEqual(loadSave(storage).save,freshSave());
 const mine=parseSave(JSON.stringify({...validV2Save(),run:legacyV2MineRun()}));assert.equal(mine.ok,true);assert.equal(mine.migrated,true);assert.deepEqual(mine.save,freshSave());
});
test('storage errors are returned and writes validate before touching storage',()=>{
 const storage=memory();assert.deepEqual(writeSave(storage,freshSave()),{ok:true});assert.equal(loadSave(storage).ok,true);assert.equal(writeSave(storage,{...freshSave(),extra:1}).reason,'invalid');assert.equal(storage.writes,1);
 assert.equal(loadSave({getItem(){throw Error('denied')}}).reason,'unavailable');assert.equal(writeSave({setItem(){throw Error('quota')}},freshSave()).reason,'unavailable');
});
test('records are stage-specific and ties retain the earlier paired deaths',()=>{
 let s=recordCompletion(freshSave(),'forest-1',{elapsedTicks:500,deaths:7});s=recordCompletion(s,'forest-1',{elapsedTicks:500,deaths:1});assert.deepEqual(s.records['forest-1'],{best:{elapsedTicks:500,deaths:7},recent:{elapsedTicks:500,deaths:1}});
 assert.ok(s.unlockedStageIds.includes('mine-1'));assert.equal(s.run.stageId,'mine-1');assert.equal(s.run.round,1);assert.equal(s.run.elapsedTicks,0);assert.equal(s.run.deaths,0);assert.equal(s.run.player.hp,3);assert.equal(parseSave(JSON.stringify(s)).ok,true);
 assert.equal(s.run.terrainLayout.mode,'authored');assert.ok(ARENA_PLATFORM_PRESETS['mine-1'].some(preset=>preset.id===s.run.terrainLayout.presetId));
 s=recordCompletion(s,'mine-1',{elapsedTicks:400,deaths:3});assert.equal(s.records['forest-1'].best.elapsedTicks,500);assert.equal(s.records['mine-1'].best.elapsedTicks,400);assert.equal(s.run,null);
});
test('Easy deaths persist independently per round and reject overflow',()=>{
 const save=freshSave(),after=recordEasyDeath(save,'forest-1',1);
 assert.equal(save.easy.roundDeaths['forest-1']['1'],0);assert.equal(after.easy.roundDeaths['forest-1']['1'],1);
 assert.equal(after.easy.roundDeaths['forest-1']['2'],0);assert.equal(after.easy.roundDeaths['mine-1']['1'],0);
 assert.deepEqual(after.run,save.run);assert.deepEqual(after.records,save.records);assert.deepEqual(after.unlockedStageIds,save.unlockedStageIds);assert.deepEqual(after.settings,save.settings);
 const full={...save,easy:{...save.easy,roundDeaths:{...save.easy.roundDeaths,'forest-1':{...save.easy.roundDeaths['forest-1'],'1':Number.MAX_SAFE_INTEGER}}}};
 assert.throws(()=>recordEasyDeath(full,'forest-1',1),RangeError);
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
for(const raw of ['bad','{"version":6}',JSON.stringify({...v1,extra:1}),JSON.stringify(malformedV2),JSON.stringify(malformedV3)]){const storage=memory(raw),app=createAppStore(()=>storage);app.setSave({...app.getSave(),run:validRun()});assert.equal(app.persist().ok,false);assert.equal(app.retry().ok,false);assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(storage.writes,0);}
});
test('failed writes retry and initially unreadable existing slots remain protected',()=>{
 const storage=memory();let fail=true;const actual=storage.setItem;storage.setItem=function(k,v){if(fail)throw Error('quota');actual.call(this,k,v);};const app=createAppStore(()=>storage);app.setSave({...app.getSave(),run:validRun()});assert.equal(app.persist().reason,'unavailable');fail=false;assert.equal(app.retry().ok,true);assert.deepEqual(loadSave(storage).save.run,validRun());
 let blocked=true;const existing=memory(JSON.stringify({...freshSave(),run:validRun()}));const other=createAppStore(()=>{if(blocked)throw Error('denied');return existing;});other.setSave({...other.getSave(),run:validRun()});blocked=false;assert.equal(other.retry().reason,'conflict');assert.equal(existing.writes,0);
});

const hardResult=(roundReached,cleared=false,deaths=0,elapsedTicks=100)=>({roundReached,cleared,deaths,elapsedTicks});

test('Hard best ranks round, clear, deaths, and time while recent always updates',()=>{
 const initial=freshSave();
 const ascending=[hardResult(7),hardResult(8,false,8,900),hardResult(8,true,8,900),hardResult(8,true,7,1000),hardResult(8,true,7,900)];
 let save=initial;
 for(const [index,result] of ascending.entries()){
  if(index>0){
   assert.ok(compareHardProgress(result,ascending[index-1])<0);
   assert.ok(compareHardProgress(ascending[index-1],result)>0);
  }
  save=recordHardProgress(save,'forest-1',result);
  assert.deepEqual(save.hardProgress['forest-1'],{best:result,recent:result});
  assert.notEqual(save.hardProgress['forest-1'].best,result);
 }
 const earlier=ascending[0],best=ascending.at(-1);
 assert.equal(compareHardProgress(best,{...best}),0);
 save=recordHardProgress(save,'forest-1',earlier);
 assert.deepEqual(save.hardProgress['forest-1'],{best,recent:earlier});
 assert.deepEqual(save.hardProgress['mine-1'],{best:null,recent:null});
 assert.deepEqual(initial,freshSave());
});

test('Hard Round 8 clear outranks a faster attempt with fewer deaths',()=>{
 const failed=hardResult(8,false,1,100),cleared=hardResult(8,true,5,500);
 assert.ok(compareHardProgress(cleared,failed)<0);
 const attempt=recordHardProgress(freshSave(),'forest-1',failed);
 const completed=recordHardProgress(attempt,'forest-1',cleared);
 assert.deepEqual(completed.hardProgress['forest-1'],{best:cleared,recent:cleared});
 const retried=recordHardProgress(completed,'forest-1',failed);
 assert.deepEqual(retried.hardProgress['forest-1'],{best:cleared,recent:failed});
});

test('Hard progress rejects invalid results, stage keys, and save shapes',()=>{
 const result=hardResult(4),save=freshSave();
 const invalid=[null,{},hardResult(0),hardResult(9),hardResult(1.5),hardResult(7,true),hardResult(8,1),
  hardResult(2,false,-1),hardResult(2,false,1.5),hardResult(2,false,0,Number.MAX_SAFE_INTEGER+1),{...result,extra:1}];
 const before=structuredClone(save);
 for(const bad of invalid){
  assert.throws(()=>recordHardProgress(save,'forest-1',bad),TypeError);
  if(bad!==null){
   const invalidSave={...save,hardProgress:{...save.hardProgress,'forest-1':{best:null,recent:bad}}};
   assert.deepEqual(parseSave(JSON.stringify(invalidSave)),{ok:false,reason:'invalid'});
   assert.equal(isValidCloudSave({...toCloudSave(save),hardProgress:invalidSave.hardProgress}),false);
  }
 }
 assert.throws(()=>recordHardProgress(save,'other',result),TypeError);
 for(const hardProgress of [undefined,{}, {...save.hardProgress,other:{best:null,recent:null}},
  {...save.hardProgress,'mine-1':{best:null,recent:null,extra:1}}]){
  const invalidSave={...save,hardProgress};
  assert.throws(()=>recordHardProgress(invalidSave,'forest-1',result),TypeError);
  assert.deepEqual(parseSave(JSON.stringify(invalidSave)),{ok:false,reason:'invalid'});
 }
 assert.deepEqual(save,before);
});

test('v7 local and cloud saves convert both completion record slots and preserve the run',()=>{
 const {hardProgress,...base}=freshSave(),legacy={...base,version:7,run:validRun()};
 legacy.records['forest-1']={best:{elapsedTicks:90,deaths:3},recent:{elapsedTicks:100,deaths:1}};
 legacy.records['mine-1'].recent={elapsedTicks:120,deaths:2};
 const expected={...legacy,version:8,hardProgress:{
  'forest-1':{best:hardResult(8,true,3,90),recent:hardResult(8,true,1,100)},
  'mine-1':{best:null,recent:hardResult(8,true,2,120)}
 }};
 assert.deepEqual(parseSave(JSON.stringify(legacy)),{ok:true,save:expected,migrated:true});
 const {settings,...cloud}=legacy;
 assert.equal(isValidCloudSave(cloud),true);
 assert.deepEqual(fromCloudSave(cloud,settings),expected);
});

test('Hard-only progress persists on the local app store and round-trips through cloud saves',()=>{
 const storage=memory(),app=createAppStore(()=>storage);
 assert.equal(hasSaveProgress(app.getSave()),false);
 const saved=recordHardProgress(app.getSave(),'mine-1',hardResult(5,false,2,250));
 assert.equal(hasSaveProgress(saved),true);
 app.setSave(saved);
 assert.deepEqual(app.persist(),{ok:true});
 assert.deepEqual(createAppStore(()=>storage).getSave(),saved);
 const {settings,...expectedCloud}=saved,cloud=toCloudSave(saved);
 assert.deepEqual(cloud,expectedCloud);
 assert.equal(isValidCloudSave(cloud),true);
 assert.deepEqual(fromCloudSave(cloud,settings),saved);
});
