import './styles.css';
import { initializeEntraAuth } from './game/auth/entraAuth.js';
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

async function signOutAccount(auth,store){
  const game=activeGame;
  activeGame=null;gameStarted=false;gameStarting=false;
  if(game)game.destroy(true);
  clearAppStore(store);
  try{await auth.signOut();}
  catch(error){initializeAppStore(store);await startGame(store);throw error;}
  store.dispose?.();
  showScreen({title:'로그아웃 완료',message:'다른 회사 계정으로 로그인할 수 있습니다.',actions:[
    {label:'Microsoft 계정으로 로그인',primary:true,onClick:()=>void auth.signIn().catch(()=>showRetry(auth,'로그인 오류','로그인을 완료하지 못했습니다. 다시 시도해 주세요.'))}
  ]});
}

function showLoading(message='회사 계정을 확인하고 있습니다…'){
  showScreen({title:'Grill-Me',message});
}

function isOutage(error){
  return error instanceof CloudRequestError&&(error.status===0||error.status===503);
}

function showRetry(auth,title,message){
  showScreen({title,message,actions:[
    {label:'다시 시도',primary:true,onClick:()=>void boot(auth)},
    ...(auth? [{label:'다른 Microsoft 계정으로 로그인',onClick:()=>void auth.signIn().catch(()=>showRetry(auth,'로그인 오류','다시 로그인해 주세요.'))}]:[])
  ]});
}

function showAuthorizationError(auth,profileError){
  if(profileError.status===403){
    showScreen({title:'회사 구성원만 이용할 수 있습니다',message:'이 계정에는 게임 접근 권한이 없습니다.',actions:[
      {label:'다른 계정으로 로그인',primary:true,onClick:()=>void auth.signIn().catch(()=>showAuthorizationError(auth,profileError))},
      {label:'로그아웃',onClick:()=>void auth.signOut()}
    ]});
    return;
  }
  showScreen({title:'로그인이 필요합니다',message:'계정 세션을 새로 확인해 주세요. 저장된 오프라인 데이터는 인증이 확인될 때까지 열지 않습니다.',actions:[
    {label:'다시 인증',primary:true,onClick:()=>void auth.signIn().catch(()=>showAuthorizationError(auth,profileError))},
    {label:'로그아웃',onClick:()=>void auth.signOut()}
  ]});
}

async function offlineSave(userId,localSnapshot,client,reason,auth){
  const accountData=readAccountSnapshot(userId,storageProvider);
  const cloudSave=accountData.outbox?.save??accountData.cache?.save;
  if(!accountData.ok||!cloudSave)return null;
  const initialSave=fromCloudSave(cloudSave,localSnapshot.settings??DEFAULT_SETTINGS);
  let store;
  store=createAccountAppStore({userId,signOut:()=>signOutAccount(auth,store),initialSave,cloudClient:client,storageProvider,initialWarning:reason});
  store.persist({force:!accountData.outbox,immediate:!accountData.outbox});
  await startGame(store);
  return store;
}

function validProfile(profile,identity){
  return profile&&profile.userId===identity.userId&&profile.tenantId===identity.tenantId&&profile.objectId===identity.objectId&&
    typeof profile.displayName==='string'&&[...profile.displayName.trim()].length>0&&[...profile.displayName.trim()].length<=80;
}

async function openAuthorizedGame(auth,identity,client,profile,remoteSave){
  const accountData=readAccountSnapshot(identity.userId,storageProvider);
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
    userId:identity.userId,
    account:profile,
    signOut:()=>signOutAccount(auth,store),
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

async function continueWithAccount(auth,localSnapshot){
  const identity=auth.identity;
  const client=createCloudSaveClient(auth);
  showLoading();
  let profile;
  try{profile=await client.getAccount();}
  catch(error){
    if(isOutage(error)){
      if(await offlineSave(identity.userId,localSnapshot,client,'sync-unavailable',auth))return;
      showRetry(auth,'연결할 수 없습니다','서버에 연결할 수 없고 이 계정의 저장 기록도 없어 게임을 시작할 수 없습니다.');return;
    }
    if(error instanceof CloudRequestError&&(error.status===401||error.status===403)){showAuthorizationError(auth,error);return;}
    showRetry(auth,'계정을 확인할 수 없습니다','회사 계정 확인에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.');return;
  }
  if(!validProfile(profile,identity)){
    showScreen({title:'계정 정보를 확인할 수 없습니다',message:'Microsoft 계정과 게임 서비스가 확인한 계정이 일치하지 않습니다. 다시 로그인해 주세요.',actions:[
      {label:'다시 로그인',primary:true,onClick:()=>void auth.signIn().catch(()=>{})}
    ]});return;
  }

  let remoteSave;
  try{remoteSave=await client.getSave();}
  catch(error){
    if(isOutage(error)){
      if(await offlineSave(identity.userId,localSnapshot,client,'sync-unavailable',auth))return;
      showRetry(auth,'저장 데이터를 불러올 수 없습니다','서버에 연결할 수 없고 이 계정의 오프라인 저장 기록도 없습니다.');return;
    }
    if(error instanceof CloudRequestError&&(error.status===401||error.status===403)){showAuthorizationError(auth,error);return;}
    showRetry(auth,'저장 데이터를 불러올 수 없습니다','저장 데이터를 확인하지 못했습니다. 다시 시도해 주세요.');return;
  }
  await openAuthorizedGame(auth,identity,client,profile,remoteSave);
}

async function continueWithAuth(auth){
  if(auth.mode==='local'){
    await startGame(createAppStore(storageProvider));return;
  }
  if(auth.mode==='blocked'){
    showScreen({title:'게임 설정을 확인할 수 없습니다',message:'로그인 설정이 없거나 올바르지 않습니다. 배포 환경의 Entra 설정을 확인해 주세요.'});return;
  }
  if(!auth.account){
    if(auth.accounts.length>1){
      showScreen({title:'계정을 선택해 주세요',message:'기록을 연결할 Microsoft 계정을 고르세요.',accounts:auth.accounts,onSelectAccount:account=>{
        const result=auth.selectAccount(account);
        if(result.ok)void continueWithAuth(auth);else showBlockedAccount(auth,result.reason);
      },actions:[{label:'다른 계정으로 로그인',primary:true,onClick:()=>void auth.signIn().catch(()=>showRetry(auth,'로그인 오류','다른 계정으로 로그인하지 못했습니다. 다시 시도해 주세요.'))}]});
    }else showScreen({title:'회사 계정으로 시작',message:'Grill-Me 진행 기록을 계정에 안전하게 저장합니다.',actions:[
      {label:'Microsoft 계정으로 로그인',primary:true,onClick:()=>void auth.signIn().catch(()=>showRetry(auth,'로그인 오류','로그인을 완료하지 못했습니다. 다시 시도해 주세요.'))}
    ]});
    return;
  }
  if(!auth.identity?.ok){showBlockedAccount(auth,auth.identity?.reason);return;}
  await continueWithAccount(auth,localSnapshot);
}

function showBlockedAccount(auth,reason){
  const message=reason==='guest'?'게스트 계정은 사용할 수 없습니다. 회사 구성원 계정으로 로그인해 주세요.':
    reason==='wrong-tenant'?'다른 조직의 계정은 사용할 수 없습니다. 회사 계정으로 로그인해 주세요.':'회사 구성원 여부를 확인할 수 없습니다. 회사 계정으로 다시 로그인해 주세요.';
  showScreen({title:reason==='invalid-account'?'계정 확인이 필요합니다':'회사 구성원만 이용할 수 있습니다',message,actions:[
    {label:'다른 Microsoft 계정으로 로그인',primary:true,onClick:()=>void auth.signIn().catch(()=>{})},
    {label:'로그아웃',onClick:()=>void auth.signOut()}
  ]});
}

async function boot(existingAuth=null){
  showLoading('로그인 상태를 확인하고 있습니다…');
  let auth=existingAuth;
  try{auth??=await initializeEntraAuth({environment:import.meta.env});}
  catch{showRetry(auth,'로그인을 시작할 수 없습니다','인증 서비스를 초기화하지 못했습니다. 설정과 네트워크를 확인해 주세요.');return;}
  await continueWithAuth(auth);
}

void boot();
