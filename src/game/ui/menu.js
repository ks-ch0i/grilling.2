import {getStage} from '../content/stages.js';
import {createStageRun,snapshotStageRun} from '../sim/stage.js';
export function formatTicks(ticks){const seconds=Math.floor(ticks/60);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
export function createNewRun(save,stageId='forest-1'){if(!save.unlockedStageIds.includes(stageId))throw new TypeError('Stage is locked');return {...save,run:snapshotStageRun(createStageRun(getStage(stageId)))};}
export function menuState(save){return {canContinue:save.run!==null,hasRecords:Object.values(save.records).some(r=>r.best!==null||r.recent!==null),unlockedStageIds:[...save.unlockedStageIds]};}
export function mountMenu(title,subtitle='',{variant='panel',layout='panel',showMainHeading=true,accessibleLabel}={}){
  const titleLayout=variant==='title'&&(layout==='main'||layout==='submenu')?layout:null;
  const cleanups=new Set();let removed=false;
  const root=document.createElement('section');root.className=titleLayout?`game-overlay game-overlay--title game-overlay--title-${titleLayout}`:'game-overlay';root.setAttribute('aria-label',accessibleLabel??(titleLayout==='main'&&!showMainHeading?'메인 메뉴':title));
  const titleArtBounds=titleLayout?document.createElement('div'):null;
  if(titleArtBounds){titleArtBounds.className='title-art-bounds';root.append(titleArtBounds);}
  const panel=document.createElement('div');panel.className=titleLayout?'game-panel game-panel--title':'game-panel';
  const heading=document.createElement('h2');heading.textContent=title;
  if(titleLayout==='main'){if(showMainHeading){heading.className='title-menu-heading';root.append(heading);}root.append(panel);}
  else{root.append(panel);panel.append(heading);}
  if(subtitle&&titleLayout!=='main'){const p=document.createElement('p');p.textContent=subtitle;panel.append(p);}
  const game=document.getElementById('game');
  game.append(root);
  const attachNotices=()=>{for(const notice of game.querySelectorAll('.audio-warning,.account-sync-toast'))if(titleArtBounds)titleArtBounds.append(notice);};
  const preserveNotices=()=>{for(const notice of titleArtBounds?.querySelectorAll('.audio-warning,.account-sync-toast')??[])game.append(notice);};
  if(titleArtBounds)attachNotices();
  function text(value){const p=document.createElement('p');p.textContent=value;panel.append(p);return p;}
  function button(label,action,{disabled=false}={}){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.addEventListener('click',action);panel.append(b);return b;}
  function range(label,value,onChange){const wrap=document.createElement('label');wrap.className='setting-row';const span=document.createElement('span');span.textContent=label;const control=document.createElement('input');control.type='range';control.min='0';control.max='1';control.step='0.05';control.value=String(value);control.setAttribute('aria-label',label);const output=document.createElement('output');output.textContent=`${Math.round(value*100)}%`;control.addEventListener('input',()=>{output.textContent=`${Math.round(Number(control.value)*100)}%`;onChange(Number(control.value));});wrap.append(span,control,output);panel.append(wrap);return control;}
  function checkbox(label,value,onChange){const wrap=document.createElement('label');wrap.className='setting-row';const control=document.createElement('input');control.type='checkbox';control.checked=value;control.addEventListener('change',()=>onChange(control.checked));wrap.append(control,document.createTextNode(label));panel.append(wrap);return control;}
  return {root,panel,titleArtBounds,text,button,range,checkbox,focus(){root.querySelector('button:not(:disabled):not(.account-sign-out),input')?.focus();},hide(){preserveNotices();root.hidden=true;},show(){root.hidden=false;attachNotices();this.focus();},onRemove(callback){if(typeof callback!=='function')throw new TypeError('Cleanup callback is required');if(removed)callback();else cleanups.add(callback);},remove(){if(removed)return;removed=true;for(const cleanup of cleanups)cleanup();cleanups.clear();preserveNotices();root.remove();}};
}

export function mountAccountStatus(menu,store,{showAccount=false,showSignOut=false,placement='panel',showLocalDevStatus=false}={}){
  if(!store)return null;
  const account=store.getAccount?.();
  const authenticated=store.hasAuthenticatedAccount?.()??Boolean(account);
  const localOnly=!authenticated&&showLocalDevStatus;
  if(!authenticated&&!localOnly)return null;
  const status=document.createElement('div');status.className=`account-status${placement==='root'&&menu.titleArtBounds?' account-status--title-home':''}`;
  if(showAccount){const identity=document.createElement('span');identity.className='account-status-name';identity.textContent=account?`로그인 계정 · ${account.displayName}`:localOnly?'로컬 개발 모드 · 로그인 없음':'회사 계정';status.append(identity);}
  if(showSignOut&&!localOnly){
    const signOut=document.createElement('button');signOut.type='button';signOut.className='account-sign-out';signOut.textContent='로그아웃';
    signOut.addEventListener('click',async()=>{signOut.disabled=true;try{await store.signOut();}catch{signOut.disabled=false;showAccountToast('로그아웃을 완료하지 못했습니다.');}});
    status.append(signOut);
  }
  if(!status.childElementCount)return null;
  (placement==='root'?(menu.titleArtBounds??menu.root):menu.panel).append(status);return status;
}

const errorNoticeDetails={
  invalid:{message:'저장 데이터가 손상되어 덮어쓰지 않았습니다. 현재 진행은 저장되지 않습니다.',action:'retry'},
  'unsupported-version':{message:'지원하지 않는 저장 버전입니다. 기존 데이터를 보존하며 현재 진행은 저장되지 않습니다.',action:'retry'},
  unavailable:{message:'저장 공간을 사용할 수 없습니다. 현재 진행은 메모리에만 있습니다.',action:'retry'},
  conflict:{message:'기존 저장이 발견되어 덮어쓰지 않았습니다. 저장 상태를 확인해 주세요.',action:'retry'},
  'storage-unavailable':{message:'이 기기의 저장 공간을 사용할 수 없습니다. 기록이 안전하게 보관되지 않을 수 있습니다.',action:'retry'},
  'sync-unavailable':{message:'서버에 연결할 수 없습니다. 기록은 이 기기에 보관되며 연결이 복구되면 전송합니다.',action:'retry'},
  unauthorized:{message:'로그인 세션을 다시 확인해야 합니다. 계정 저장 동기화가 멈췄습니다.',action:'reauthenticate'},
  forbidden:{message:'이 계정은 저장 데이터에 접근할 수 없습니다. 기록을 서버에 전송하지 않았습니다.',action:'signout'}
};
let activeAccountToastController=null;
function showAccountToast(message){activeAccountToastController?.showRoutine(message);}
export function mountAccountSyncToast(store,actions={}){
  const game=document.getElementById('game');if(!game||!store)return ()=>{};
  activeAccountToastController?.remove();
  const toast=document.createElement('div');toast.className='account-sync-toast';toast.hidden=true;game.append(toast);
  const authenticated=store.hasAuthenticatedAccount?.()??Boolean(store.getAccount?.());
  let hasPreviousWarning=false,previousWarning=null,currentErrorWarning=null,hideTimer=null,removeTimer=null,removed=false,observedAudioWarning=null;
  const clearTimers=()=>{clearTimeout(hideTimer);clearTimeout(removeTimer);hideTimer=null;removeTimer=null;};
  const updateToastPosition=()=>{
    if(removed||toast.hidden||!toast.classList.contains('is-visible'))return;
    const audioWarning=game.querySelector('.audio-warning');
    if(resizeObserver&&audioWarning!==observedAudioWarning){
      if(observedAudioWarning)resizeObserver.unobserve(observedAudioWarning);
      observedAudioWarning=audioWarning;
      if(observedAudioWarning)resizeObserver.observe(observedAudioWarning);
    }
    let lift=0;
    if(audioWarning?.getClientRects().length){
      const noticeBounds=toast.getBoundingClientRect(),audioBounds=audioWarning.getBoundingClientRect();
      const overlapsHorizontally=noticeBounds.left<audioBounds.right&&noticeBounds.right>audioBounds.left;
      const overlapsVertically=noticeBounds.top<audioBounds.bottom&&noticeBounds.bottom>audioBounds.top;
      if(overlapsHorizontally&&overlapsVertically)lift=Math.ceil(noticeBounds.bottom-audioBounds.top+8);
    }
    toast.style.setProperty('--account-sync-toast-y',lift?`-${lift}px`:'0px');
  };
  const schedulePosition=()=>requestAnimationFrame(updateToastPosition);
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(schedulePosition):null;
  resizeObserver?.observe(toast);
  const mutationObserver=typeof MutationObserver==='function'?new MutationObserver(schedulePosition):null;
  mutationObserver?.observe(game,{childList:true,subtree:true,characterData:true});
  window.addEventListener('resize',schedulePosition);

  function renderNotice(message,{error=false,actionType=null}={}){
    clearTimers();
    const wasHidden=toast.hidden;
    toast.className=`account-sync-toast${error?' is-error':' is-routine'}`;
    toast.setAttribute('role',error?'alert':'status');
    toast.setAttribute('aria-live',error?'assertive':'polite');
    toast.removeAttribute('aria-busy');
    const label=document.createElement('span');label.className='account-sync-toast-message';label.textContent=message;
    toast.replaceChildren(label);
    if(actionType){
      const actionButton=document.createElement('button');actionButton.type='button';actionButton.className='account-sync-toast-action';
      const invoke=actionType==='retry'?()=>store.retry():actionType==='reauthenticate'?actions.onReauthenticate:actions.onSignOut;
      actionButton.textContent=actionType==='retry'?'저장 다시 시도':actionType==='reauthenticate'?'다시 로그인':'로그아웃';
      actionButton.addEventListener('click',async()=>{
        if(actionButton.disabled||typeof invoke!=='function')return;
        actionButton.disabled=true;toast.setAttribute('aria-busy','true');
        try{await Promise.resolve(invoke());}
        catch{if(actionButton.isConnected)actionButton.disabled=false;}
        finally{
          if(actionButton.isConnected){
            toast.removeAttribute('aria-busy');
            if(actionType==='retry')actionButton.disabled=false;
          }
        }
      });
      toast.append(actionButton);
    }
    toast.hidden=false;
    if(wasHidden){toast.classList.remove('is-visible');requestAnimationFrame(()=>{if(!removed)toast.classList.add('is-visible');schedulePosition();});}
    else{toast.classList.add('is-visible');schedulePosition();}
    if(!error){
      hideTimer=setTimeout(()=>{
        toast.classList.remove('is-visible');toast.style.setProperty('--account-sync-toast-y','0px');
        removeTimer=setTimeout(()=>{toast.hidden=true;},220);
      },2500);
    }
  }

  function showRoutine(message){if(currentErrorWarning!==null)return;renderNotice(message);}
  function showError(warning){
    const details=errorNoticeDetails[warning]??{message:'저장에 실패했습니다.',action:'retry'};
    currentErrorWarning=warning;renderNotice(details.message,{error:true,actionType:details.action});
  }
  const unsubscribe=store.subscribe(warning=>{
    if(!hasPreviousWarning){
      hasPreviousWarning=true;previousWarning=warning;
      if(warning==='sync-pending')renderNotice('동기화 중');
      else if(warning!==null)showError(warning);
      return;
    }
    const priorWarning=previousWarning;previousWarning=warning;
    if(warning==='sync-pending'){
      if(currentErrorWarning===null)renderNotice('동기화 중');
      return;
    }
    if(warning===null){
      if(authenticated&&priorWarning===null)return;
      currentErrorWarning=null;
      renderNotice(authenticated?'동기화 완료':'기기에 저장됨');
      return;
    }
    if(warning===priorWarning&&currentErrorWarning===warning)return;
    showError(warning);
  });
  const controller={
    showRoutine,
    remove(){
      if(removed)return;removed=true;unsubscribe();clearTimers();mutationObserver?.disconnect();resizeObserver?.disconnect();window.removeEventListener('resize',schedulePosition);toast.remove();
      if(activeAccountToastController===controller)activeAccountToastController=null;
    }
  };
  activeAccountToastController=controller;
  return controller.remove;
}
