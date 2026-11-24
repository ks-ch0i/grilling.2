import {formatTicks} from './menu.js';

function element(tag,text,className){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(className)node.className=className;
  return node;
}

function validEntry(value,mode){
  const validBase=value!==null&&typeof value==='object'&&!Array.isArray(value)&&
    Number.isSafeInteger(value.rank)&&value.rank>0&&typeof value.displayName==='string'&&
    value.displayName.trim().length>0&&[...value.displayName].length<=80&&
    Number.isSafeInteger(value.elapsedTicks)&&value.elapsedTicks>=0&&
    Number.isSafeInteger(value.deaths)&&value.deaths>=0;
  if(!validBase)return false;
  if(mode!=='hard')return true;
  return Number.isInteger(value.roundReached)&&value.roundReached>=1&&value.roundReached<=8&&
    typeof value.cleared==='boolean'&&(!value.cleared||value.roundReached===8);
}

function validBoard(value,mode){
  return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
    Number.isSafeInteger(value.totalParticipants)&&value.totalParticipants>=0&&
    Array.isArray(value.entries)&&value.entries.length===Math.min(value.totalParticipants,10)&&value.entries.every(entry=>validEntry(entry,mode))&&
    (value.me===null||validEntry(value.me,mode))&&typeof value.stale==='boolean';
}

function entryRow(entry,mode,{own=false}={}){
  const row=element('tr',undefined,own?'company-board-own':'company-board-entry');
  const rank=element('th',`${entry.rank}${own?' · 내 기록':''}`);
  rank.setAttribute('scope','row');
  row.append(rank,element('td',entry.displayName));
  if(mode==='hard'){
    row.append(element('td',`${String(entry.roundReached).padStart(2,'0')}라운드`),
      element('td',entry.cleared?'클리어':'도전 중'),element('td',`${entry.deaths}회`),
      element('td',formatTicks(entry.elapsedTicks)));
  }else{
    row.append(element('td',formatTicks(entry.elapsedTicks)),element('td',`${entry.deaths}회`));
  }
  return row;
}

function renderBoard(root,value,mode){
  root.setAttribute('aria-busy','false');
  if(value.stale)root.append(element('p','저장된 순위 데이터입니다. 현재 순위보다 오래됐을 수 있습니다.','company-board-stale'));
  if(value.totalParticipants===0){
    root.append(element('p','아직 등록된 기록이 없습니다.','company-board-empty'));
    return;
  }
  root.append(element('p',`참가자 ${value.totalParticipants}명`,'company-board-count'));
  const table=element('table',undefined,mode==='hard'?'company-board-table company-board-table-hard':'company-board-table');
  table.setAttribute('aria-label','회사 도전 순위');
  const head=element('thead'),header=element('tr');
  const labels=mode==='hard'?['순위','플레이어','도달','상태','사망','시간']:['순위','플레이어','기록','사망'];
  for(const label of labels){
    const cell=element('th',label);cell.setAttribute('scope','col');header.append(cell);
  }
  head.append(header);
  const body=element('tbody');
  for(const entry of value.entries)body.append(entryRow(entry,mode));
  if(value.me&&value.me.rank>10)body.append(entryRow(value.me,mode,{own:true}));
  table.append(head,body);root.append(table);
  if(value.me&&value.me.rank>10)root.append(element('p','내 기록은 상위 10위 밖에 표시했습니다.','company-board-own-note'));
}

export function mountCompanyLeaderboard({parent,challenge,getLeaderboard}){
  if(!parent||typeof getLeaderboard!=='function')throw new TypeError('Leaderboard dependencies are required');
  const root=element('section',undefined,'company-board-view');
  root.setAttribute('aria-live','polite');root.setAttribute('aria-busy','true');
  parent.append(root);
  let disposed=false,timer=null;

  function schedule(){
    if(timer!==null)clearTimeout(timer);
    timer=setTimeout(()=>{timer=null;void load();},140);
  }
  function retryButton(){
    const button=element('button','다시 시도','company-board-retry');button.type='button';
    button.addEventListener('click',schedule);return button;
  }
  async function load(){
    if(disposed)return;
    root.setAttribute('aria-busy','true');root.replaceChildren(element('p','회사 순위를 불러오는 중…','company-board-loading'));
    try{
      const value=await getLeaderboard(challenge);
      if(disposed)return;
      root.replaceChildren();
      if(!validBoard(value,challenge.mode)){
        root.setAttribute('aria-busy','false');
        root.append(element('p','순위 응답을 확인할 수 없습니다.','company-board-error'),retryButton());
        return;
      }
      renderBoard(root,value,challenge.mode);
    }catch(error){
      if(disposed)return;
      root.setAttribute('aria-busy','false');root.replaceChildren();
      const offline=error?.status===0||['network-unavailable','token-unavailable'].includes(error?.code);
      root.append(element('p',offline?'오프라인이며 표시할 저장 순위가 없습니다.':'회사 순위를 불러오지 못했습니다.','company-board-error'),retryButton());
    }
  }
  schedule();

  return {element:root,remove(){disposed=true;if(timer!==null)clearTimeout(timer);root.remove();}};
}
