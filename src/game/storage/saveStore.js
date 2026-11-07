import {FOREST_STAGE} from '../content/forestStage.js';
export const SAVE_KEY='pixel-action.save.v1';
const pickupIds=new Set(FOREST_STAGE.pickups.map(p=>p.id));
const object=x=>x!==null && typeof x==='object' && !Array.isArray(x);
const shape=(x,keys)=>object(x) && Object.keys(x).length===keys.length && keys.every(k=>Object.hasOwn(x,k));
const count=x=>Number.isSafeInteger(x) && x>=0;
const record=x=>shape(x,['elapsedTicks','deaths']) && count(x.elapsedTicks) && count(x.deaths);
const run=x=>shape(x,['stageId','checkpoint','consumedPickupIds','elapsedTicks','deaths']) && x.stageId==='forest-1' && ['start','mid'].includes(x.checkpoint) && Array.isArray(x.consumedPickupIds) && new Set(x.consumedPickupIds).size===x.consumedPickupIds.length && x.consumedPickupIds.every(id=>typeof id==='string'&&pickupIds.has(id)) && count(x.elapsedTicks) && count(x.deaths);
const settings=x=>shape(x,['musicVolume','sfxVolume','screenShake']) && [x.musicVolume,x.sfxVolume].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1) && typeof x.screenShake==='boolean';
export function freshSave(){return {version:1,run:null,best:null,recent:null,settings:{musicVolume:.5,sfxVolume:.7,screenShake:true}};}
export function parseSave(raw){
  if(raw===null)return {ok:true,save:freshSave()};
  if(typeof raw!=='string')return {ok:false,reason:'invalid'};
  let value;try{value=JSON.parse(raw);}catch{return {ok:false,reason:'invalid'};}
  if(object(value)&&Number.isSafeInteger(value.version)&&value.version>1)return {ok:false,reason:'unsupported-version'};
  if(!shape(value,['version','run','best','recent','settings'])||value.version!==1||!(value.run===null||run(value.run))||!(value.best===null||record(value.best))||!(value.recent===null||record(value.recent))||!settings(value.settings))return {ok:false,reason:'invalid'};
  return {ok:true,save:value};
}
export function loadSave(storage){try{return parseSave(storage.getItem(SAVE_KEY));}catch{return {ok:false,reason:'unavailable'};}}
export function writeSave(storage,save){
  let raw;try{raw=JSON.stringify(save);}catch{return {ok:false,reason:'invalid'};}
  const parsed=parseSave(raw);if(!parsed.ok || raw===undefined)return {ok:false,reason:'invalid'};
  try{storage.setItem(SAVE_KEY,raw);return {ok:true};}catch{return {ok:false,reason:'unavailable'};}
}
export function recordCompletion(save,result){
  if(!record(result))throw new TypeError('Invalid record');
  return {...save,run:null,recent:{...result},best:!save.best||result.elapsedTicks<save.best.elapsedTicks?{...result}:{...save.best}};
}
