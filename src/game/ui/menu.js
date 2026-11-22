import {getStage} from '../content/stages.js';
import {createStageRun,snapshotStageRun} from '../sim/stage.js';
export function formatTicks(ticks){const seconds=Math.floor(ticks/60);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
export function createNewRun(save,stageId='forest-1'){if(!save.unlockedStageIds.includes(stageId))throw new TypeError('Stage is locked');return {...save,run:snapshotStageRun(createStageRun(getStage(stageId)))};}
export function menuState(save){return {canContinue:save.run!==null,hasRecords:Object.values(save.records).some(r=>r.best!==null||r.recent!==null),unlockedStageIds:[...save.unlockedStageIds]};}
export function mountMenu(title,subtitle='',{variant='panel',layout='panel'}={}){
  const titleLayout=variant==='title'&&(layout==='main'||layout==='submenu')?layout:null;
  const cleanups=new Set();let removed=false;
  const root=document.createElement('section');root.className=titleLayout?`game-overlay game-overlay--title game-overlay--title-${titleLayout}`:'game-overlay';root.setAttribute('aria-label',title);
  const panel=document.createElement('div');panel.className=titleLayout?'game-panel game-panel--title':'game-panel';
  const heading=document.createElement('h2');heading.textContent=title;
  if(titleLayout==='main'){heading.className='title-menu-heading';root.append(heading,panel);}
  else{root.append(panel);panel.append(heading);}
  if(subtitle&&titleLayout!=='main'){const p=document.createElement('p');p.textContent=subtitle;panel.append(p);}
  document.getElementById('game').append(root);
  function text(value){const p=document.createElement('p');p.textContent=value;panel.append(p);return p;}
  function button(label,action,{disabled=false}={}){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.addEventListener('click',action);panel.append(b);return b;}
  function range(label,value,onChange){const wrap=document.createElement('label');wrap.className='setting-row';const span=document.createElement('span');span.textContent=label;const control=document.createElement('input');control.type='range';control.min='0';control.max='1';control.step='0.05';control.value=String(value);control.setAttribute('aria-label',label);const output=document.createElement('output');output.textContent=`${Math.round(value*100)}%`;control.addEventListener('input',()=>{output.textContent=`${Math.round(Number(control.value)*100)}%`;onChange(Number(control.value));});wrap.append(span,control,output);panel.append(wrap);return control;}
  function checkbox(label,value,onChange){const wrap=document.createElement('label');wrap.className='setting-row';const control=document.createElement('input');control.type='checkbox';control.checked=value;control.addEventListener('change',()=>onChange(control.checked));wrap.append(control,document.createTextNode(label));panel.append(wrap);return control;}
  return {root,panel,text,button,range,checkbox,focus(){root.querySelector('button:not(:disabled):not(.account-sign-out),input')?.focus();},hide(){root.hidden=true;},show(){root.hidden=false;this.focus();},onRemove(callback){if(typeof callback!=='function')throw new TypeError('Cleanup callback is required');if(removed)callback();else cleanups.add(callback);},remove(){if(removed)return;removed=true;for(const cleanup of cleanups)cleanup();cleanups.clear();root.remove();}};
}

const syncLabels={
  'sync-pending':'동기화 중',
  'sync-unavailable':'오프라인 · 전송 대기',
  'storage-unavailable':'기기 저장소 확인 필요',
  unauthorized:'로그인 확인 필요',
  forbidden:'계정 접근 거부'
};
export function mountAccountStatus(menu,store,{showAccount=false,showSignOut=false}={}){
  if(!store)return null;
  const account=store.getAccount?.();
  const authenticated=store.hasAuthenticatedAccount?.()??Boolean(account);
  if(!authenticated)return null;
  const status=document.createElement('div');status.className='account-status';status.setAttribute('aria-live','polite');
  if(showAccount){const identity=document.createElement('span');identity.className='account-status-name';identity.textContent=account?`로그인 계정 · ${account.displayName}`:'회사 계정';status.append(identity);}
  const sync=document.createElement('span');sync.className='account-status-sync';status.append(sync);
  const update=warning=>{sync.textContent=syncLabels[warning]??'동기화 완료';sync.dataset.state=warning??'saved';};
  const unsubscribe=store.subscribe(update);menu.onRemove?.(unsubscribe);
  if(showSignOut){
    const signOut=document.createElement('button');signOut.type='button';signOut.className='account-sign-out';signOut.textContent='로그아웃';
    signOut.addEventListener('click',async()=>{signOut.disabled=true;try{await store.signOut();}catch{signOut.disabled=false;sync.textContent='로그아웃을 완료하지 못했습니다.';}});
    status.append(signOut);
  }
  menu.panel.append(status);return status;
}
export function mountStorageNotice(store){
  const game=document.getElementById('game');if(game.querySelector('.storage-warning'))return;
  const box=document.createElement('div');box.className='storage-warning';box.setAttribute('role','alert');box.hidden=true;
  const label=document.createElement('span'),retry=document.createElement('button');retry.type='button';retry.textContent='저장 다시 시도';retry.addEventListener('click',()=>store.retry());box.append(label,retry);game.append(box);
  const messages={
    invalid:'저장 데이터가 손상되어 덮어쓰지 않았습니다. 현재 진행은 저장되지 않습니다.',
    'unsupported-version':'지원하지 않는 저장 버전입니다. 기존 데이터를 보존하며 현재 진행은 저장되지 않습니다.',
    unavailable:'저장 공간을 사용할 수 없습니다. 현재 진행은 메모리에만 있습니다.',
    conflict:'기존 저장이 발견되어 덮어쓰지 않았습니다. 저장 상태를 확인해 주세요.',
    'storage-unavailable':'이 기기의 저장 공간을 사용할 수 없습니다. 기록이 안전하게 보관되지 않을 수 있습니다.',
    'sync-pending':'계정 기록을 서버에 저장하고 있습니다.',
    'sync-unavailable':'서버에 연결할 수 없습니다. 기록은 이 기기에 보관되며 연결이 복구되면 전송합니다.',
    unauthorized:'로그인 세션을 다시 확인해야 합니다. 계정 저장 동기화가 멈췄습니다.',
    forbidden:'이 계정은 저장 데이터에 접근할 수 없습니다. 기록을 서버에 전송하지 않았습니다.'
  };
  store.subscribe(reason=>{box.hidden=!reason;label.textContent=messages[reason]??'저장에 실패했습니다.';});
}
