import {getStage} from '../content/stages.js';
import {createStageRun,restoreStageRun,snapshotStageRun} from '../sim/stage.js';

export const SAVE_KEY='pixel-action.save.v1';
const LEGACY_PICKUP_IDS=new Set(['heal-1','heal-2','heal-3']);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const shape=(value,keys)=>object(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const keys=(value,required,optional=[])=>object(value)&&required.every(key=>Object.hasOwn(value,key))&&Object.keys(value).every(key=>required.includes(key)||optional.includes(key));
const count=value=>Number.isSafeInteger(value)&&value>=0;
const strings=value=>Array.isArray(value)&&value.every(item=>typeof item==='string'&&item.length>0)&&new Set(value).size===value.length;
const finiteTree=value=>typeof value==='number'?Number.isFinite(value):Array.isArray(value)?value.every(finiteTree):object(value)?Object.values(value).every(finiteTree):value===null||['string','boolean'].includes(typeof value);
const record=value=>shape(value,['elapsedTicks','deaths'])&&count(value.elapsedTicks)&&count(value.deaths);
const settings=value=>shape(value,['musicVolume','sfxVolume','screenShake'])&&[value.musicVolume,value.sfxVolume].every(item=>typeof item==='number'&&Number.isFinite(item)&&item>=0&&item<=1)&&typeof value.screenShake==='boolean';
const records=value=>shape(value,['best','recent'])&&(value.best===null||record(value.best))&&(value.recent===null||record(value.recent));
const unlocked=value=>Array.isArray(value)&&value.includes('forest-1')&&new Set(value).size===value.length&&value.every(id=>['forest-1','mine-1'].includes(id));
const ROUND_KEYS=Array.from({length:8},(_,index)=>String(index+1));
const easyRoundRecords=value=>shape(value,['forest-1','mine-1'])&&['forest-1','mine-1'].every(stageId=>
  shape(value[stageId],ROUND_KEYS)&&ROUND_KEYS.every(round=>records(value[stageId][round])));
const easyRoundDeaths=value=>shape(value,['forest-1','mine-1'])&&['forest-1','mine-1'].every(stageId=>
  shape(value[stageId],ROUND_KEYS)&&ROUND_KEYS.every(round=>count(value[stageId][round])));
const legacyEasyProgress=value=>shape(value,['unlockedRoundByStage','totalDeaths','roundRecords'])&&
  shape(value.unlockedRoundByStage,['forest-1','mine-1'])&&
  Number.isInteger(value.unlockedRoundByStage['forest-1'])&&value.unlockedRoundByStage['forest-1']>=1&&value.unlockedRoundByStage['forest-1']<=8&&
  Number.isInteger(value.unlockedRoundByStage['mine-1'])&&value.unlockedRoundByStage['mine-1']>=0&&value.unlockedRoundByStage['mine-1']<=8&&
  count(value.totalDeaths)&&easyRoundRecords(value.roundRecords);
const easyProgress=value=>shape(value,['unlockedRoundByStage','roundDeaths','roundRecords'])&&
  shape(value.unlockedRoundByStage,['forest-1','mine-1'])&&
  Number.isInteger(value.unlockedRoundByStage['forest-1'])&&value.unlockedRoundByStage['forest-1']>=1&&value.unlockedRoundByStage['forest-1']<=8&&
  Number.isInteger(value.unlockedRoundByStage['mine-1'])&&value.unlockedRoundByStage['mine-1']>=0&&value.unlockedRoundByStage['mine-1']<=8&&
  easyRoundDeaths(value.roundDeaths)&&easyRoundRecords(value.roundRecords);
const oldV1Run=value=>shape(value,['stageId','checkpoint','consumedPickupIds','elapsedTicks','deaths'])&&value.stageId==='forest-1'&&['start','mid'].includes(value.checkpoint)&&Array.isArray(value.consumedPickupIds)&&new Set(value.consumedPickupIds).size===value.consumedPickupIds.length&&value.consumedPickupIds.every(id=>typeof id==='string'&&LEGACY_PICKUP_IDS.has(id))&&count(value.elapsedTicks)&&count(value.deaths);

function legacyRect(value,ticks=false){
  const required=['x','y','w','h',...(ticks?['ticks']:[])];
  return shape(value,required)&&['x','y','w','h'].every(key=>Number.isFinite(value[key]))&&value.w>0&&value.h>0&&(!ticks||count(value.ticks));
}
function legacyEnemy(value,stageId){
  const kinds=stageId==='forest-1'?['soldier','wisp','boar']:['golem','insect','bat'];
  const required=['id','kind','x','y','w','h','hp','maxHp','state','stateTicks','facing','lockedFacing','hitIds','visible'];
  const optional=['homeY','shotCount','lockedTarget','vx','vy'];
  return keys(value,required,optional)&&typeof value.id==='string'&&kinds.includes(value.kind)&&
    ['x','y','w','h','hp','maxHp','stateTicks','facing','lockedFacing'].every(key=>Number.isFinite(value[key]))&&
    Number.isInteger(value.hp)&&Number.isInteger(value.maxHp)&&value.hp>=0&&value.hp<=value.maxHp&&count(value.stateTicks)&&
    ['idle','chase','windup','attack','return','recovery','hurt','dead'].includes(value.state)&&strings(value.hitIds)&&typeof value.visible==='boolean'&&
    (!Object.hasOwn(value,'homeY')||Number.isFinite(value.homeY))&&(!Object.hasOwn(value,'shotCount')||count(value.shotCount))&&
    (!Object.hasOwn(value,'lockedTarget')||shape(value.lockedTarget,['x','y'])&&Number.isFinite(value.lockedTarget.x)&&Number.isFinite(value.lockedTarget.y))&&
    ['vx','vy'].every(key=>!Object.hasOwn(value,key)||Number.isFinite(value[key]));
}
function legacyBoss(value,stageId){
  const forest=stageId==='forest-1';
  const required=forest
    ?['id','x','y','w','h','hp','maxHp','phase','state','stateTicks','cycle','attackKind','lockedFacing','telegraphs','hitboxes','secondRootDelay','secondRoot','transitioned']
    :['id','kind','x','y','w','h','hp','maxHp','phase','state','stateTicks','attackKind','lastAttack','lockedFacing','telegraphs','hitboxes','transitioned','targetX','trailStartX','burrowsLeft','attackSerial','cycle'];
  const optional=forest?['rootEffects']:[];
  if(!keys(value,required,optional)||!finiteTree(value)||typeof value.id!=='string'||
    !['x','y','w','h','hp','maxHp','phase','stateTicks','cycle','lockedFacing'].every(key=>Number.isFinite(value[key]))||
    !Number.isInteger(value.hp)||!Number.isInteger(value.maxHp)||value.hp<0||value.hp>value.maxHp||![1,2].includes(value.phase)||!count(value.stateTicks)||!count(value.cycle)||
    !['dormant','intro','transition','windup','attack','recovery','dying','dead'].includes(value.state)||typeof value.transitioned!=='boolean'||
    !Array.isArray(value.telegraphs)||!value.telegraphs.every(rect=>legacyRect(rect))||!Array.isArray(value.hitboxes)||!value.hitboxes.every(rect=>legacyRect(rect,true)))return false;
  if(forest)return value.id==='forest-guardian'&&count(value.secondRootDelay)&&[-1,1].includes(value.lockedFacing)&&
    [null,'branch','root','slam'].includes(value.attackKind)&&(value.secondRoot===null||legacyRect(value.secondRoot))&&
    (!Object.hasOwn(value,'rootEffects')||Array.isArray(value.rootEffects)&&finiteTree(value.rootEffects));
  const kinds=['charge','wave','rocks','mineral','spit','burrow','tail'];
  return ['machine','worm'].includes(value.kind)&&value.id===(value.kind==='machine'?'mine-machine':'mine-worm')&&count(value.burrowsLeft)&&count(value.attackSerial)&&
    [-1,1].includes(value.lockedFacing)&&[null,...kinds].includes(value.attackKind)&&[null,...kinds].includes(value.lastAttack);
}
function legacyV2Run(value){
  if(value===null)return true;
  if(!object(value)||!['forest-1','mine-1'].includes(value.stageId))return false;
  const mine=value.stageId==='mine-1';
  const base=['stageId','player','enemies','projectiles','boss','arenaLocked','consumedPickupIds','elapsedTicks','deaths','outcome','deathTicks'];
  const required=mine?[...base,'cartZones','rngState','hazards','bossSequence','bossDrop']:base;
  if(!shape(value,required)||!finiteTree(value)||!count(value.elapsedTicks)||!count(value.deaths)||!count(value.deathTicks)||
    typeof value.arenaLocked!=='boolean'||![null,'clear'].includes(value.outcome)||!Array.isArray(value.consumedPickupIds)||
    new Set(value.consumedPickupIds).size!==value.consumedPickupIds.length||!value.consumedPickupIds.every(id=>LEGACY_PICKUP_IDS.has(id)))return false;

  const player=value.player;
  const numeric=['x','y','vx','vy','w','h','hp','facing','horizontalFacing','invulnerableTicks','rollCooldown','rollTicks','rollDirection','diveCooldown','diveGraceTicks','attackTick','hurtTicks','hurtPushTicks','hurtPushDirection'];
  const boolean=['grounded','rollInvulnerable','damageInvulnerable','jumpCut','diveUsed','diveGraceActive'];
  const playerKeys=[...numeric,...boolean,'mode','aim','hitIds'];
  if(!keys(player,playerKeys)||!finiteTree(player)||!numeric.every(key=>Number.isFinite(player[key]))||!boolean.every(key=>typeof player[key]==='boolean')||
    player.w!==16||player.h!==28||!Number.isInteger(player.hp)||player.hp<0||player.hp>3||!['idle','run','jump','fall','attack','roll','dive','hurt','dead'].includes(player.mode)||
    !shape(player.aim,['x','y'])||!Number.isFinite(player.aim.x)||!Number.isFinite(player.aim.y)||!strings(player.hitIds))return false;
  if(!Array.isArray(value.enemies)||value.enemies.length>9||new Set(value.enemies.map(enemy=>enemy?.id)).size!==value.enemies.length||!value.enemies.every(enemy=>legacyEnemy(enemy,value.stageId)))return false;
  if(!Array.isArray(value.projectiles)||!value.projectiles.every(projectile=>shape(projectile,['id','ownerId','x','y','w','h','vx','vy','life','alive'])&&
    typeof projectile.id==='string'&&typeof projectile.ownerId==='string'&&['x','y','w','h','vx','vy'].every(key=>Number.isFinite(projectile[key]))&&projectile.w>0&&projectile.h>0&&count(projectile.life)&&typeof projectile.alive==='boolean'))return false;
  if(!legacyBoss(value.boss,value.stageId))return false;

  if(!mine)return true;
  if(!count(value.rngState)||value.rngState>0xffffffff||!Array.isArray(value.cartZones)||value.cartZones.length!==5||
    new Set(value.cartZones.map(zone=>zone?.centerX)).size!==5||!value.cartZones.every((zone,index)=>shape(zone,['id','centerX','direction','state','ticks','cartId'])&&zone.id===`cart-${index+1}`&&
      Number.isSafeInteger(zone.centerX)&&zone.centerX>=0&&zone.centerX<11520&&[-1,1].includes(zone.direction)&&['countdown','warning','active'].includes(zone.state)&&count(zone.ticks)&&(zone.cartId===null||typeof zone.cartId==='string'))||
    !Array.isArray(value.hazards)||!value.hazards.every(hazard=>object(hazard)&&finiteTree(hazard)&&typeof hazard.id==='string'&&typeof hazard.ownerId==='string'&&
      ['wave','acid-shot','acid-pool','cart','rock','mineral'].includes(hazard.kind)&&['x','y','w','h','vx','vy','life','alive'].every(key=>Object.hasOwn(hazard,key))&&
      ['x','y','w','h','vx','vy'].every(key=>Number.isFinite(hazard[key]))&&hazard.w>0&&hazard.h>0&&count(hazard.life)&&typeof hazard.alive==='boolean')||
    !['machine','worm-intro','worm','done'].includes(value.bossSequence)||!shape(value.bossDrop,['rolled','spawned','consumed','x','y'])||
    !['rolled','spawned','consumed'].every(key=>typeof value.bossDrop[key]==='boolean')||!Number.isFinite(value.bossDrop.x)||!Number.isFinite(value.bossDrop.y))return false;
  return true;
}

function oldV1Save(value){
  return shape(value,['version','run','best','recent','settings'])&&value.version===1&&(value.run===null||oldV1Run(value.run))&&
    (value.best===null||record(value.best))&&(value.recent===null||record(value.recent))&&settings(value.settings);
}
function oldV2Save(value){
  return shape(value,['version','run','unlockedStageIds','records','settings'])&&value.version===2&&legacyV2Run(value.run)&&unlocked(value.unlockedStageIds)&&
    shape(value.records,['forest-1','mine-1'])&&records(value.records['forest-1'])&&records(value.records['mine-1'])&&settings(value.settings);
}
const currentSnapshot=(value,legacyDefense=false)=>{try{return value.outcome===null&&Boolean(restoreStageRun(getStage(value.stageId),value,{legacyDefense}));}catch{return false;}};
function currentV3Save(value){
  return shape(value,['version','run','unlockedStageIds','records','settings'])&&value.version===3&&
    (value.run===null||currentSnapshot(value.run,true))&&unlocked(value.unlockedStageIds)&&
    shape(value.records,['forest-1','mine-1'])&&records(value.records['forest-1'])&&records(value.records['mine-1'])&&settings(value.settings);
}
function currentV4Save(value){
  return shape(value,['version','run','unlockedStageIds','records','easy','settings'])&&value.version===4&&
    (value.run===null||currentSnapshot(value.run,true))&&unlocked(value.unlockedStageIds)&&
    shape(value.records,['forest-1','mine-1'])&&records(value.records['forest-1'])&&records(value.records['mine-1'])&&
    legacyEasyProgress(value.easy)&&settings(value.settings);
}
function currentV5Save(value){
  return shape(value,['version','run','unlockedStageIds','records','easy','settings'])&&value.version===5&&
    (value.run===null||currentSnapshot(value.run))&&unlocked(value.unlockedStageIds)&&
    shape(value.records,['forest-1','mine-1'])&&records(value.records['forest-1'])&&records(value.records['mine-1'])&&
    legacyEasyProgress(value.easy)&&settings(value.settings);
}
function currentV6Save(value){
  return shape(value,['version','run','unlockedStageIds','records','easy','settings'])&&value.version===6&&
    (value.run===null||currentSnapshot(value.run))&&unlocked(value.unlockedStageIds)&&
    shape(value.records,['forest-1','mine-1'])&&records(value.records['forest-1'])&&records(value.records['mine-1'])&&
    easyProgress(value.easy)&&settings(value.settings);
}
function migrateLegacyRun(run){
  if(run===null)return null;
  return snapshotStageRun(restoreStageRun(getStage(run.stageId),run,{legacyDefense:true}));
}
function migrateV4Save(value){return {...value,version:5,run:migrateLegacyRun(value.run)};}
function emptyRoundCounts(){return Object.fromEntries(['forest-1','mine-1'].map(stageId=>[
  stageId,Object.fromEntries(ROUND_KEYS.map(round=>[round,0]))
]));}
function migrateV5Save(value){
  return {...value,version:6,easy:{
    unlockedRoundByStage:value.easy.unlockedRoundByStage,
    roundDeaths:emptyRoundCounts(),
    roundRecords:value.easy.roundRecords
  }};
}
function legacyFreshEasyProgress(){
  const emptyRecord=()=>({best:null,recent:null});
  const stageRoundRecords=()=>Object.fromEntries(ROUND_KEYS.map(round=>[round,emptyRecord()]));
  return {
    unlockedRoundByStage:{'forest-1':1,'mine-1':0},
    totalDeaths:0,
    roundRecords:{'forest-1':stageRoundRecords(),'mine-1':stageRoundRecords()}
  };
}
function freshEasyProgress(){
  const emptyRecord=()=>({best:null,recent:null});
  const stageRoundRecords=()=>Object.fromEntries(ROUND_KEYS.map(round=>[round,emptyRecord()]));
  return {
    unlockedRoundByStage:{'forest-1':1,'mine-1':0},
    roundDeaths:emptyRoundCounts(),
    roundRecords:{'forest-1':stageRoundRecords(),'mine-1':stageRoundRecords()}
  };
}

export function freshSave(){
  return {version:6,run:null,unlockedStageIds:['forest-1'],records:{'forest-1':{best:null,recent:null},'mine-1':{best:null,recent:null}},easy:freshEasyProgress(),settings:{musicVolume:.5,sfxVolume:.7,screenShake:true}};
}
export function parseSave(raw){
  if(raw===null)return {ok:true,save:freshSave()};
  if(typeof raw!=='string')return {ok:false,reason:'invalid'};
  let value;try{value=JSON.parse(raw);}catch{return {ok:false,reason:'invalid'};}
  if(object(value)&&Number.isSafeInteger(value.version)&&value.version>6)return {ok:false,reason:'unsupported-version'};
  if(oldV1Save(value)||oldV2Save(value))return {ok:true,save:freshSave(),migrated:true};
  if(currentV3Save(value))return {ok:true,save:migrateV5Save(migrateV4Save({...value,version:4,easy:legacyFreshEasyProgress()})),migrated:true};
  if(currentV4Save(value))return {ok:true,save:migrateV5Save(migrateV4Save(value)),migrated:true};
  if(currentV5Save(value))return {ok:true,save:migrateV5Save(value),migrated:true};
  if(currentV6Save(value))return {ok:true,save:value};
  return {ok:false,reason:'invalid'};
}
export function loadSave(storage){try{return parseSave(storage.getItem(SAVE_KEY));}catch{return {ok:false,reason:'unavailable'};}}
export function writeSave(storage,save){
  let raw;try{raw=JSON.stringify(save);}catch{return {ok:false,reason:'invalid'};}
  const parsed=parseSave(raw);if(!parsed.ok||parsed.migrated||raw===undefined)return {ok:false,reason:'invalid'};
  try{storage.setItem(SAVE_KEY,raw);return {ok:true};}catch{return {ok:false,reason:'unavailable'};}
}
export function recordCompletion(save,stageId,result){
  if(!['forest-1','mine-1'].includes(stageId)||!record(result))throw new TypeError('Invalid record');
  const previous=save.records[stageId];
  const unlockedStageIds=stageId==='forest-1'&&!save.unlockedStageIds.includes('mine-1')?[...save.unlockedStageIds,'mine-1']:save.unlockedStageIds;
  const run=stageId==='forest-1'?snapshotStageRun(createStageRun(getStage('mine-1'))):null;
  return {...save,run,unlockedStageIds,records:{...save.records,[stageId]:{recent:{...result},best:!previous.best||result.elapsedTicks<previous.best.elapsedTicks?{...result}:{...previous.best}}}};
}

export function recordEasyDeath(save,stageId,round){
  if(!currentV6Save(save)||!['forest-1','mine-1'].includes(stageId)||!Number.isInteger(round)||round<1||round>8||round>save.easy.unlockedRoundByStage[stageId])throw new TypeError('Invalid Easy round death');
  const roundKey=String(round),current=save.easy.roundDeaths[stageId][roundKey];
  if(current===Number.MAX_SAFE_INTEGER)throw new RangeError('Easy round death count is full');
  return {...save,easy:{...save.easy,roundDeaths:{...save.easy.roundDeaths,[stageId]:{...save.easy.roundDeaths[stageId],[roundKey]:current+1}}}};
}

export function recordEasyRoundCompletion(save,stageId,round,result){
  if(!currentV6Save(save)||!['forest-1','mine-1'].includes(stageId)||!Number.isInteger(round)||round<1||round>8||!record(result))throw new TypeError('Invalid Easy round record');
  if(round>save.easy.unlockedRoundByStage[stageId])throw new TypeError('Easy round is locked');
  const roundKey=String(round),previous=save.easy.roundRecords[stageId][roundKey];
  const best=!previous.best||result.elapsedTicks<previous.best.elapsedTicks?{...result}:{...previous.best};
  const unlockedRoundByStage={...save.easy.unlockedRoundByStage};
  if(round<8)unlockedRoundByStage[stageId]=Math.max(unlockedRoundByStage[stageId],round+1);
  else if(stageId==='forest-1')unlockedRoundByStage['mine-1']=Math.max(unlockedRoundByStage['mine-1'],1);
  return {
    ...save,
    easy:{
      ...save.easy,
      unlockedRoundByStage,
      roundRecords:{
        ...save.easy.roundRecords,
        [stageId]:{...save.easy.roundRecords[stageId],[roundKey]:{best,recent:{...result}}}
      }
    }
  };
}
