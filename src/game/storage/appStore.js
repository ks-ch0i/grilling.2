import {freshSave,parseSave,writeSave,SAVE_KEY} from './saveStore.js';
// A failed read never authorizes overwriting an existing slot.
export function createAppStore(storageProvider=()=>window.localStorage){
  let save=freshSave(),warning=null,blocked=null,dirty=false,readUnknown=false;const listeners=new Set();
  const notify=()=>{for(const listener of listeners)listener(warning);};
  const report=reason=>{warning=reason;notify();};
  const read=()=>{try{const raw=storageProvider().getItem(SAVE_KEY);return {...parseSave(raw),exists:raw!==null};}catch{return {ok:false,reason:'unavailable'};}};
  const first=read();
  if(first.ok)save=first.save;
  else {blocked=first.reason;readUnknown=first.reason==='unavailable';report(first.reason);}
  function persist(){
    if(blocked){report(blocked);return {ok:false,reason:blocked};}
    let result;try{result=writeSave(storageProvider(),save);}catch{result={ok:false,reason:'unavailable'};}
    if(result.ok){dirty=false;warning=null;notify();}else report(result.reason);
    return result;
  }
  return {
    getSave:()=>save,
    setSave:value=>{save=value;dirty=true;},
    persist,
    retry(){
      if(blocked){
        const result=read();if(!result.ok){blocked=result.reason;report(blocked);return result;}
        if(readUnknown && dirty && result.exists) {blocked='conflict';report(blocked);return {ok:false,reason:'conflict'};}
        if(!dirty)save=result.save;
        blocked=null;readUnknown=false;
      }
      return persist();
    },
    getWarning:()=>warning,
    subscribe(listener){listeners.add(listener);listener(warning);return ()=>listeners.delete(listener);}
  };
}
let singleton;
export function getAppStore(){return singleton??=createAppStore();}
