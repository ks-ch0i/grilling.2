import {formatTicks} from './menu.js';

function element(tag,text,className){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(className)node.className=className;
  return node;
}

function validEntry(value){
  return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
    Number.isSafeInteger(value.rank)&&value.rank>0&&typeof value.displayName==='string'&&
    value.displayName.trim().length>0&&[...value.displayName].length<=80&&
    Number.isSafeInteger(value.elapsedTicks)&&value.elapsedTicks>=0&&
    Number.isSafeInteger(value.deaths)&&value.deaths>=0;
}

function validBoard(value){
  return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
    Number.isSafeInteger(value.totalParticipants)&&value.totalParticipants>=0&&
    Array.isArray(value.entries)&&value.entries.length===Math.min(value.totalParticipants,10)&&value.entries.every(validEntry)&&
    (value.me===null||validEntry(value.me))&&typeof value.stale==='boolean';
}

function entryRow(entry,{own=false}={}){
  const row=element('tr',undefined,own?'company-board-own':'company-board-entry');
  const rank=element('th',`${entry.rank}${own?' · 내 기록':''}`);
  rank.setAttribute('scope','row');
  row.append(rank,element('td',entry.displayName),element('td',formatTicks(entry.elapsedTicks)),element('td',`${entry.deaths}회`));
  return row;
}

function renderBoard(root,value){
  root.setAttribute('aria-busy','false');
  if(value.stale)root.append(element('p','저장된 순위 데이터입니다. 현재 순위보다 오래됐을 수 있습니다.','company-board-stale'));
  if(value.totalParticipants===0){
    root.append(element('p','아직 등록된 기록이 없습니다.','company-board-empty'));
    return;
  }
  root.append(element('p',`참가자 ${value.totalParticipants}명`,'company-board-count'));
  const table=element('table',undefined,'company-board-table');
  table.setAttribute('aria-label','회사 도전 순위');
  const head=element('thead'),header=element('tr');
  for(const label of ['순위','플레이어','기록','사망']){
    const cell=element('th',label);cell.setAttribute('scope','col');header.append(cell);
  }
  head.append(header);
  const body=element('tbody');
  for(const entry of value.entries)body.append(entryRow(entry));
  if(value.me&&value.me.rank>10)body.append(entryRow(value.me,{own:true}));
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
      if(!validBoard(value)){
        root.setAttribute('aria-busy','false');
        root.append(element('p','순위 응답을 확인할 수 없습니다.','company-board-error'),retryButton());
        return;
      }
      renderBoard(root,value);
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
