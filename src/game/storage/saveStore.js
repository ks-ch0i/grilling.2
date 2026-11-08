import {FOREST_STAGE} from '../content/forestStage.js';
import {getStage} from '../content/stages.js';
import {restoreStageRun} from '../sim/stage.js';
export const SAVE_KEY='pixel-action.save.v1';
const pickupIds=new Set(FOREST_STAGE.pickups.map(p=>p.id));
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const shape=(x,keys)=>object(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const count=x=>Number.isSafeInteger(x)&&x>=0;
const record=x=>shape(x,['elapsedTicks','deaths'])&&count(x.elapsedTicks)&&count(x.deaths);
const settings=x=>shape(x,['musicVolume','sfxVolume','screenShake'])&&[x.musicVolume,x.sfxVolume].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1)&&typeof x.screenShake==='boolean';
const oldRun=x=>shape(x,['stageId','checkpoint','consumedPickupIds','elapsedTicks','deaths'])&&x.stageId==='forest-1'&&['start','mid'].includes(x.checkpoint)&&Array.isArray(x.consumedPickupIds)&&new Set(x.consumedPickupIds).size===x.consumedPickupIds.length&&x.consumedPickupIds.every(id=>typeof id==='string'&&pickupIds.has(id))&&count(x.elapsedTicks)&&count(x.deaths);
const oldSave=x=>shape(x,['version','run','best','recent','settings'])&&x.version===1&&(x.run===null||oldRun(x.run))&&(x.best===null||record(x.best))&&(x.recent===null||record(x.recent))&&settings(x.settings);
const records=x=>shape(x,['best','recent'])&&(x.best===null||record(x.best))&&(x.recent===null||record(x.recent));
const snapshot=x=>{try{return x.outcome===null&&Boolean(restoreStageRun(getStage(x.stageId),x));}catch{return false;}};
export function freshSave(){return {version:2,run:null,unlockedStageIds:['forest-1'],records:{'forest-1':{best:null,recent:null},'mine-1':{best:null,recent:null}},settings:{musicVolume:.5,sfxVolume:.7,screenShake:true}};}
export function parseSave(raw){
  if(raw===null)return {ok:true,save:freshSave()};
  if(typeof raw!=='string')return {ok:false,reason:'invalid'};
  let value;try{value=JSON.parse(raw);}catch{return {ok:false,reason:'invalid'};}
  if(object(value)&&Number.isSafeInteger(value.version)&&value.version>2)return {ok:false,reason:'unsupported-version'};
  if(oldSave(value))return {ok:true,save:freshSave(),migrated:true};
  if(!shape(value,['version','run','unlockedStageIds','records','settings'])||value.version!==2||
    !(value.run===null||snapshot(value.run))||!Array.isArray(value.unlockedStageIds)||
    !value.unlockedStageIds.includes('forest-1')||new Set(value.unlockedStageIds).size!==value.unlockedStageIds.length||
    !value.unlockedStageIds.every(id=>['forest-1','mine-1'].includes(id))||
    !shape(value.records,['forest-1','mine-1'])||!records(value.records['forest-1'])||!records(value.records['mine-1'])||
    !settings(value.settings))return {ok:false,reason:'invalid'};
  return {ok:true,save:value};
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
  return {...save,run:null,records:{...save.records,[stageId]:{recent:{...result},best:!previous.best||result.elapsedTicks<previous.best.elapsedTicks?{...result}:{...previous.best}}}};
}
