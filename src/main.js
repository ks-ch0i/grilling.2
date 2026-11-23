import './styles.css';
import { readSwaAccount, signIn, signOut } from './game/auth/swaAuth.js';
import { createAppStore, createAccountAppStore, initializeAppStore, clearAppStore, inspectLocalSave, readAccountSnapshot } from './game/storage/appStore.js';
import { createCloudSaveClient, CloudRequestError } from './game/storage/cloudSaveClient.js';
import { DEFAULT_SETTINGS, freshSave, fromCloudSave, toCloudSave } from './game/storage/saveStore.js';
import { mountAuthScreen } from './game/ui/authScreen.js';
import { showSaveImportPrompt } from './game/ui/saveImportPrompt.js';

let authScreen=null;
let gameStarted=false;
let gameStarting=false;
let activeGame=null;
const storageProvider=()=>window.localStorage;
const localSnapshot=inspectLocalSave(storageProvider);

function showScreen(options){
  authScreen?.remove();
  authScreen=mountAuthScreen(options);
  return authScreen;
}

async function startGame(store){
  if(gameStarted||gameStarting)return;
  gameStarting=true;
  initializeAppStore(store);
  showLoading('게임을 불러오고 있습니다…');
  try{
    const [{default:Phaser},{createGameConfig},{disposeAudioManager}]=await Promise.all([
      import('phaser'),import('./game/config.js'),import('./game/audio/AudioManager.js')
    ]);
    authScreen?.remove();authScreen=null;
    const game=new Phaser.Game(createGameConfig('game'));
    activeGame=game;
    game.events.once(Phaser.Core.Events.DESTROY,()=>{
      disposeAudioManager();
      if(activeGame===game){activeGame=null;gameStarted=false;}
    });
    gameStarted=true;
  }catch{
    showScreen({title:'게임을 불러올 수 없습니다',message:'게임 파일을 불러오지 못했습니다. 페이지를 새로고침해 주세요.'});
  }finally{gameStarting=false;}
}

async function signOutAccount(store){
  const game=activeGame;
  activeGame=null;gameStarted=false;gameStarting=false;
  if(game)game.destroy(true);
  clearAppStore(store);
  try{signOut();}
  catch(error){initializeAppStore(store);await startGame(store);throw error;}
  store.dispose?.();
}

function showLoading(message='회사 계정을 확인하고 있습니다…'){
  showScreen({title:'Grill-Me',message});
}

function isOutage(error){
  return error instanceof CloudRequestError&&(error.status===0||error.status===503);
}

function showRetry(title,message){
  showScreen({title,message,actions:[
    {label:'다시 시도',primary:true,onClick:()=>void boot()}
  ]});
}

function showAuthorizationError(status){
  if(status===403){
    showScreen({title:'회사 구성원만 이용할 수 있습니다',message:'이 계정에는 게임 접근 권한이 없습니다.',actions:[
      {label:'로그아웃',primary:true,onClick:signOut}
    ]});
    return;
  }
  showScreen({title:'로그인이 필요합니다',message:'계정 세션을 새로 확인해 주세요. 저장된 오프라인 데이터는 인증이 확인될 때까지 열지 않습니다.',actions:[
    {label:'다시 인증',primary:true,onClick:signIn}
  ]});
}

async function offlineSave(account,client){
  const {userId}=account;
  const accountData=readAccountSnapshot(userId,storageProvider);
  const cloudSave=accountData.outbox?.save??accountData.cache?.save;
  if(!accountData.ok||!cloudSave)return null;
  const initialSave=fromCloudSave(cloudSave,localSnapshot.settings??DEFAULT_SETTINGS);
  let store;
  store=createAccountAppStore({userId,account,signOut:()=>signOutAccount(store),initialSave,cloudClient:client,storageProvider,initialWarning:'sync-unavailable'});
  store.persist({force:!accountData.outbox,immediate:!accountData.outbox});
  await startGame(store);
  return store;
}

async function openAuthorizedGame(account,client,remoteSave){
  const {userId}=account;
  const accountData=readAccountSnapshot(userId,storageProvider);
  const localWarning=!localSnapshot.ok?'storage-unavailable':localSnapshot.legacyWarning;
  let cloudProgress;
  let shouldQueue=false;
  let importChoice=null;

  if(remoteSave.exists){
    cloudProgress=accountData.outbox?.save??remoteSave.save;
  }else if(accountData.outbox){
    cloudProgress=accountData.outbox.save;shouldQueue=true;
  }else if(accountData.cache){
    cloudProgress=accountData.cache.save;shouldQueue=true;
  }else if(accountData.importDecision==='import'&&localSnapshot.legacySave){
    cloudProgress=localSnapshot.legacySave;shouldQueue=true;importChoice='import';
  }else if(accountData.importDecision==='skip'){
    cloudProgress=toCloudSave(freshSave());shouldQueue=true;importChoice='skip';
  }else if(localSnapshot.hasLegacyProgress&&localSnapshot.legacySave){
    showScreen({title:'저장 데이터 확인',message:'기존 기기 기록을 이 회사 계정으로 가져올지 선택해 주세요.'});
    importChoice=await showSaveImportPrompt();
    cloudProgress=importChoice==='import'?localSnapshot.legacySave:toCloudSave(freshSave());
    shouldQueue=true;
  }else{
    cloudProgress=toCloudSave(freshSave());shouldQueue=true;
  }

  const initialSave=fromCloudSave(cloudProgress,localSnapshot.settings??DEFAULT_SETTINGS);
  let store;
  store=createAccountAppStore({
    userId,
    account,
    signOut:()=>signOutAccount(store),
    initialSave,
    cloudClient:client,
    storageProvider,
    initialWarning:localWarning
  });
  const localWrite=store.persist({force:shouldQueue,immediate:shouldQueue});
  if(importChoice)store.markImportDecision(importChoice);
  if(shouldQueue&&localWrite.ok)await store.syncNow();
  else if(accountData.outbox)await store.syncNow();
  await startGame(store);
}

async function continueWithAccount(account){
  const client=createCloudSaveClient();
  let remoteSave;
  try{remoteSave=await client.getSave();}
  catch(error){
    if(isOutage(error)){
      if(await offlineSave(account,client))return;
      showRetry('저장 데이터를 불러올 수 없습니다','서버에 연결할 수 없고 이 계정의 오프라인 저장 기록도 없습니다.');return;
    }
    if(error instanceof CloudRequestError&&(error.status===401||error.status===403)){showAuthorizationError(error.status);return;}
    showRetry('저장 데이터를 불러올 수 없습니다','저장 데이터를 확인하지 못했습니다. 다시 시도해 주세요.');return;
  }
  await openAuthorizedGame(account,client,remoteSave);
}

async function boot(){
  if(import.meta.env.DEV){
    await startGame(createAppStore(storageProvider));return;
  }
  showLoading();
  let session;
  try{session=await readSwaAccount();}
  catch{showRetry('계정을 확인할 수 없습니다','회사 계정 확인에 실패했습니다. 다시 시도해 주세요.');return;}
  if(session.status==='forbidden'){showAuthorizationError(403);return;}
  if(session.status==='signed-out'){showAuthorizationError(401);return;}
  await continueWithAccount(session.account);
}

void boot();
