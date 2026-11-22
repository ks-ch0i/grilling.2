import {
  DEFAULT_SETTINGS,
  freshSave,
  fromCloudSave,
  isValidCloudSave,
  parseSave,
  readLocalSnapshot,
  toCloudSave,
  writeLocalSettings,
  writeSave,
  SAVE_KEY
} from './saveStore.js';

const CACHE_PREFIX='pixel-action.account-cache.v1:';
const OUTBOX_PREFIX='pixel-action.account-outbox.v1:';
const IMPORT_PREFIX='pixel-action.account-import.v1:';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const sameSave=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

function parseAccountRecord(raw,userId,kind){
  if(typeof raw!=='string')return null;
  try{
    const value=JSON.parse(raw);
    if(!object(value)||value.version!==1||value.userId!==userId||!isValidCloudSave(value.save))return null;
    if(kind==='cache'&&typeof value.updatedAt==='string'&&Number.isFinite(Date.parse(value.updatedAt)))return value;
    if(kind==='outbox'&&Number.isSafeInteger(value.revision)&&value.revision>0)return value;
  }catch{}
  return null;
}

export function accountStorageKeys(userId){
  return {cache:`${CACHE_PREFIX}${userId}`,outbox:`${OUTBOX_PREFIX}${userId}`,importDecision:`${IMPORT_PREFIX}${userId}`};
}

export function readAccountSnapshot(userId,storageProvider=()=>window.localStorage){
  try{
    const storage=storageProvider(),keys=accountStorageKeys(userId);
    const decision=storage.getItem(keys.importDecision);
    return {
      ok:true,
      cache:parseAccountRecord(storage.getItem(keys.cache),userId,'cache'),
      outbox:parseAccountRecord(storage.getItem(keys.outbox),userId,'outbox'),
      importDecision:decision==='import'||decision==='skip'?decision:null
    };
  }catch{return {ok:false,cache:null,outbox:null,importDecision:null};}
}

// A failed read never authorizes overwriting an existing local save slot.
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
  if(first.ok&&first.migrated){dirty=true;persist();}
  return {
    getSave:()=>save,
    setSave:value=>{save=value;dirty=true;},
    getAccount:()=>null,
    hasAuthenticatedAccount:()=>false,
    signOut:async()=>{},
    persist,
    retry(){
      if(blocked){
        const result=read();if(!result.ok){blocked=result.reason;report(blocked);return result;}
        if(readUnknown&&dirty&&result.exists){blocked='conflict';report(blocked);return {ok:false,reason:'conflict'};}
        if(!dirty)save=result.save;
        blocked=null;readUnknown=false;
      }
      return persist();
    },
    getWarning:()=>warning,
    subscribe(listener){listeners.add(listener);listener(warning);return ()=>listeners.delete(listener);}
  };
}

export function createAccountAppStore({userId,account=null,signOut=async()=>{},initialSave,cloudClient,storageProvider=()=>window.localStorage,initialWarning=null}={}){
  if(typeof userId!=='string'||!userId||!initialSave||!isValidCloudSave(toCloudSave(initialSave))||!cloudClient){
    throw new TypeError('Invalid account store configuration');
  }
  if(account&&(account.userId!==userId||typeof account.displayName!=='string'||!account.displayName.trim())){
    throw new TypeError('Invalid verified account profile');
  }

  const keys=accountStorageKeys(userId),listeners=new Set();
  const verifiedAccount=account?{userId,displayName:account.displayName.trim()}:null;
  let save=structuredClone(initialSave),warning=initialWarning,syncPromise=null,timer=null;
  let saveVersion=0,outboxRevision=readAccountSnapshot(userId,storageProvider).outbox?.revision??0;
  let lastQueuedSave=toCloudSave(save),settingsWarning=false;
  const notify=()=>{for(const listener of listeners)listener(warning);};
  const report=reason=>{warning=reason;notify();};

  function storage(){return storageProvider();}
  function writeCache(progress){
    const item={version:1,userId,save:progress,updatedAt:new Date().toISOString()};
    storage().setItem(keys.cache,JSON.stringify(item));
  }
  function writeOutbox(progress){
    outboxRevision=Math.max(outboxRevision+1,Date.now());
    const item={version:1,userId,revision:outboxRevision,save:progress};
    storage().setItem(keys.outbox,JSON.stringify(item));
  }
  function currentOutbox(){
    const snapshot=readAccountSnapshot(userId,storageProvider);
    if(!snapshot.ok)throw new Error('storage-unavailable');
    return snapshot.outbox;
  }
  function queueSync(immediate=false){
    if(timer!==null)clearTimeout(timer);
    timer=setTimeout(()=>{timer=null;void syncNow();},immediate?0:1200);
  }
  function persist({immediate=false,force=false}={}){
    let progress;
    try{
      progress=toCloudSave(save);
      const settingsResult=writeLocalSettings(storage(),save.settings);
      settingsWarning=!settingsResult.ok;
      writeCache(progress);
      const changed=force||!sameSave(progress,lastQueuedSave);
      if(changed)writeOutbox(progress);
      lastQueuedSave=progress;
      const queued=changed||Boolean(currentOutbox());
      if(queued)queueSync(immediate);
      if(settingsWarning)report('storage-unavailable');
      else if(queued)report('sync-pending');
      return {ok:true,queued};
    }catch(error){
      report(error?.message==='Invalid save'?'invalid':'storage-unavailable');
      return {ok:false,reason:warning};
    }
  }
  async function syncNow(){
    if(syncPromise)return syncPromise;
    if(timer!==null){clearTimeout(timer);timer=null;}
    syncPromise=(async()=>{
      await Promise.resolve();
      let hadPending=false;
      try{
        while(true){
          const pending=currentOutbox();
          if(!pending){report(settingsWarning?'storage-unavailable':null);return {ok:true,synced:hadPending};}
          hadPending=true;
          const sentVersion=saveVersion;
          const result=await cloudClient.putSave(pending.save);
          const latest=await cloudClient.getSave();
          if(!latest.exists||!isValidCloudSave(latest.save))throw new Error('invalid-cloud-response');

          writeCache(latest.save);
          const afterRequest=currentOutbox();
          if(afterRequest?.revision===pending.revision)storage().removeItem(keys.outbox);
          lastQueuedSave=structuredClone(latest.save);
          if(sentVersion===saveVersion&&afterRequest?.revision===pending.revision){
            save=fromCloudSave(latest.save,save.settings);saveVersion+=1;
          }
          if(afterRequest&&afterRequest.revision!==pending.revision)continue;
          report(settingsWarning?'storage-unavailable':null);
          return {ok:true,synced:true,revision:result?.revision};
        }
      }catch(error){
        const reason=error?.status===401?'unauthorized':error?.status===403?'forbidden':'sync-unavailable';
        report(reason);return {ok:false,reason};
      }finally{
        syncPromise=null;
        if(timer===null){
          const pending=readAccountSnapshot(userId,storageProvider);
          if(pending.ok&&pending.outbox&&warning===null)queueSync(true);
        }
      }
    })();
    return syncPromise;
  }
  function markImportDecision(value){
    if(value!=='import'&&value!=='skip')return {ok:false,reason:'invalid'};
    try{storage().setItem(keys.importDecision,value);return {ok:true};}
    catch{return {ok:false,reason:'storage-unavailable'};}
  }
  const onOnline=()=>queueSync(true);
  const onVisibility=()=>{if(document.visibilityState==='visible')queueSync(true);};
  if(typeof window!=='undefined')window.addEventListener('online',onOnline);
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',onVisibility);

  return {
    getSave:()=>save,
    setSave:value=>{save=value;saveVersion+=1;},
    getAccount:()=>verifiedAccount?{...verifiedAccount}:null,
    hasAuthenticatedAccount:()=>true,
    signOut,
    persist,
    retry:syncNow,
    syncNow,
    markImportDecision,
    getLeaderboard:challenge=>cloudClient.getLeaderboard(challenge),
    getWarning:()=>warning,
    subscribe(listener){listeners.add(listener);listener(warning);return ()=>listeners.delete(listener);},
    dispose(){if(timer!==null)clearTimeout(timer);if(typeof window!=='undefined')window.removeEventListener('online',onOnline);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',onVisibility);}
  };
}

let singleton;
export function initializeAppStore(store){
  if(!store||typeof store.getSave!=='function'||typeof store.persist!=='function')throw new TypeError('Invalid app store');
  singleton=store;return singleton;
}
export function clearAppStore(expectedStore){
  if(expectedStore&&singleton!==expectedStore)return false;
  singleton=undefined;return true;
}
export function getAppStore(){
  if(!singleton)throw new Error('App store must be initialized before creating game scenes');
  return singleton;
}

export function inspectLocalSave(storageProvider=()=>window.localStorage){
  try{return readLocalSnapshot(storageProvider());}
  catch{return {ok:false,settings:{...DEFAULT_SETTINGS},legacySave:null,hasLegacyProgress:false,legacyWarning:'unavailable'};}
}
