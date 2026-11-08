import {FOREST_STAGE} from '../content/forestStage.js';
import {createStageRun,snapshotStageRun} from '../sim/stage.js';
export function formatTicks(ticks){const seconds=Math.floor(ticks/60);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
export function createNewRun(save){return {...save,run:snapshotStageRun(createStageRun(FOREST_STAGE))};}
export function menuState(save){return {canContinue:save.run!==null,hasRecords:Object.values(save.records).some(r=>r.best!==null||r.recent!==null)};}
export function mountMenu(title,subtitle=''){
  const root=document.createElement('section');root.className='game-overlay';root.setAttribute('aria-label',title);
  const panel=document.createElement('div');panel.className='game-panel';root.append(panel);
  const heading=document.createElement('h2');heading.textContent=title;panel.append(heading);
  if(subtitle){const p=document.createElement('p');p.textContent=subtitle;panel.append(p);}
  document.getElementById('game').append(root);
  function text(value){const p=document.createElement('p');p.textContent=value;panel.append(p);return p;}
  function button(label,action,{disabled=false}={}){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.addEventListener('click',action);panel.append(b);return b;}
  function range(label,value,onChange){const wrap=document.createElement('label');wrap.className='setting-row';const span=document.createElement('span');span.textContent=label;const control=document.createElement('input');control.type='range';control.min='0';control.max='1';control.step='0.05';control.value=String(value);control.setAttribute('aria-label',label);const output=document.createElement('output');output.textContent=`${Math.round(value*100)}%`;control.addEventListener('input',()=>{output.textContent=`${Math.round(Number(control.value)*100)}%`;onChange(Number(control.value));});wrap.append(span,control,output);panel.append(wrap);return control;}
  function checkbox(label,value,onChange){const wrap=document.createElement('label');wrap.className='setting-row';const control=document.createElement('input');control.type='checkbox';control.checked=value;control.addEventListener('change',()=>onChange(control.checked));wrap.append(control,document.createTextNode(label));panel.append(wrap);return control;}
  return {root,panel,text,button,range,checkbox,focus(){root.querySelector('button:not(:disabled),input')?.focus();},hide(){root.hidden=true;},show(){root.hidden=false;this.focus();},remove(){root.remove();}};
}
export function mountStorageNotice(store){
  const game=document.getElementById('game');if(game.querySelector('.storage-warning'))return;
  const box=document.createElement('div');box.className='storage-warning';box.setAttribute('role','alert');box.hidden=true;
  const label=document.createElement('span'),retry=document.createElement('button');retry.type='button';retry.textContent='저장 다시 시도';retry.addEventListener('click',()=>store.retry());box.append(label,retry);game.append(box);
  const messages={invalid:'저장 데이터가 손상되어 덮어쓰지 않았습니다. 현재 진행은 저장되지 않습니다.', 'unsupported-version':'지원하지 않는 저장 버전입니다. 기존 데이터를 보존하며 현재 진행은 저장되지 않습니다.',unavailable:'저장 공간을 사용할 수 없습니다. 현재 진행은 메모리에만 있습니다.',conflict:'기존 저장이 발견되어 덮어쓰지 않았습니다. 저장 상태를 확인해 주세요.'};
  store.subscribe(reason=>{box.hidden=!reason;label.textContent=messages[reason]??'저장에 실패했습니다.';});
}
