import {ROUND_COUNT,isBossRound} from '../sim/rounds.js';
import {appendChoiceSwitch,mountChallengePanel,setPanelStage} from './challengePanel.js';
import {formatTicks,mountAccountStatus} from './menu.js';
import {mountCompanyLeaderboard} from './companyLeaderboard.js';

const STAGE_LABELS={'forest-1':'숲','mine-1':'광산'};
const RECORD_LABELS={best:'최고 기록',recent:'최근 기록'};

function element(tag,text,className){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(className)node.className=className;
  return node;
}

function recordValue(result,emptyText='기록 없음'){
  if(result===null)return element('span',emptyText,'challenge-record-empty');
  const value=element('span',undefined,'challenge-record-value');
  value.append(element('strong',formatTicks(result.elapsedTicks),'challenge-record-time'),
    element('span',`사망 ${result.deaths}회`,'challenge-record-deaths'));
  return value;
}

function boardButton(label,onBoard){
  const button=element('button',label,'challenge-company-board-button');
  button.type='button';button.addEventListener('click',onBoard);return button;
}

function easyTable(stageId,roundRecords,onBoard){
  const table=element('table',undefined,'challenge-record-table');
  table.setAttribute('aria-label',`${STAGE_LABELS[stageId]} 이지 라운드별 기록`);
  const header=element('thead'),headRow=element('tr'),body=element('tbody');
  for(const label of ['라운드',...Object.values(RECORD_LABELS),...(onBoard?['회사 순위']:[])]){
    const column=element('th',label);
    column.setAttribute('scope','col');
    headRow.append(column);
  }
  header.append(headRow);

  for(let round=1;round<=ROUND_COUNT;round++){
    const row=element('tr'),roundHeader=element('th');
    roundHeader.setAttribute('scope','row');
    roundHeader.append(element('span',String(round).padStart(2,'0'),'challenge-record-round'));
    if(isBossRound(stageId,round))roundHeader.append(element('span','보스','challenge-record-boss'));
    row.append(roundHeader);
    const record=roundRecords[String(round)];
    for(const kind of Object.keys(RECORD_LABELS)){
      const result=record[kind],cell=element('td',undefined,`challenge-record-${kind}`);
      if(result===null)cell.setAttribute('aria-label','기록 없음');
      cell.append(recordValue(result,'—'));
      row.append(cell);
    }
    if(onBoard){
      const boardCell=element('td',undefined,'challenge-record-board-action');
      boardCell.append(boardButton('보기',()=>onBoard({mode:'easy',stageId,round})));
      row.append(boardCell);
    }
    body.append(row);
  }
  table.append(header,body);
  return table;
}

function hardCards(stageId,record,onBoard){
  const cards=element('div',undefined,'challenge-record-cards');
  cards.setAttribute('role','group');
  cards.setAttribute('aria-label',`${STAGE_LABELS[stageId]} 하드 스테이지 기록`);
  for(const [kind,label] of Object.entries(RECORD_LABELS)){
    const card=element('section',undefined,`challenge-record-card challenge-record-${kind}`);
    card.append(element('h3',label),recordValue(record[kind]));
    cards.append(card);
  }
  if(onBoard)cards.append(boardButton('회사 순위 보기',()=>onBoard({mode:'hard',stageId})));
  return cards;
}

export function mountRecordsPopup({save,onBack,store=null,initialChallenge=null,titleScreen=true}){
  if(typeof onBack!=='function')throw new TypeError('Records Back callback is required');
  const menu=mountChallengePanel('기록','',{titleScreen});
  menu.panel.classList.add('challenge-records');
  const content=element('div',undefined,'challenge-record-content');
  let mode='easy',stageId='forest-1';
  const hasBoards=typeof store?.getLeaderboard==='function';
  const modeSwitch=appendChoiceSwitch(menu.panel,{
    label:'모드',choices:[{value:'easy',label:'이지'},{value:'hard',label:'하드'}],value:mode,
    onChange:value=>{mode=value;render();}
  });
  const stageSwitch=appendChoiceSwitch(menu.panel,{
    label:'스테이지',choices:Object.entries(STAGE_LABELS).map(([value,label])=>({value,label})),value:stageId,
    onChange:value=>{stageId=value;render();}
  });
  mountAccountStatus(menu,store);
  let backButton;
  let boardView=null;
  menu.onRemove(()=>boardView?.remove());

  function showBoard(challenge){
    if(!hasBoards)return;
    if(boardView){boardView.remove();boardView=null;}
    modeSwitch.root.hidden=true;stageSwitch.root.hidden=true;backButton.hidden=true;
    content.replaceChildren();
    setPanelStage(menu.panel,challenge.stageId);
    const header=element('div',undefined,'company-board-heading');
    const title=element('h3',challenge.mode==='easy'
      ?`${STAGE_LABELS[challenge.stageId]} 이지 ${challenge.round}라운드`
      :`${STAGE_LABELS[challenge.stageId]} 하드 스테이지`);
    const back=element('button','기록으로','challenge-back');back.type='button';
    back.addEventListener('click',()=>{boardView?.remove();boardView=null;render();});
    header.append(title,back);
    content.append(header);
    boardView=mountCompanyLeaderboard({parent:content,challenge,getLeaderboard:async value=>{
      await store.syncNow?.();
      return store.getLeaderboard(value);
    }});
    back.focus();
  }

  function render(){
    if(boardView){boardView.remove();boardView=null;}
    modeSwitch.root.hidden=false;stageSwitch.root.hidden=false;backButton.hidden=false;
    setPanelStage(menu.panel,stageId);
    content.replaceChildren(mode==='easy'
      ?easyTable(stageId,save.easy.roundRecords[stageId],hasBoards?showBoard:null)
      :hardCards(stageId,save.records[stageId],hasBoards?showBoard:null));
    menu.focus();
  }
  menu.panel.append(content);
  backButton=menu.button('뒤로',()=>{menu.remove();onBack();});
  backButton.classList.add('challenge-back');
  render();
  if(initialChallenge&&hasBoards){mode=initialChallenge.mode;stageId=initialChallenge.stageId;showBoard(initialChallenge);}
  else menu.focus();
  return menu;
}
