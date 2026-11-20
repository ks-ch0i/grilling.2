import {ROUND_COUNT,isBossRound} from '../sim/rounds.js';
import {appendChoiceSwitch,mountChallengePanel,setPanelStage} from './challengePanel.js';
import {formatTicks} from './menu.js';

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

function easyTable(stageId,roundRecords){
  const table=element('table',undefined,'challenge-record-table');
  table.setAttribute('aria-label',`${STAGE_LABELS[stageId]} 이지 라운드별 기록`);
  const header=element('thead'),headRow=element('tr'),body=element('tbody');
  for(const label of ['라운드',...Object.values(RECORD_LABELS)]){
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
    body.append(row);
  }
  table.append(header,body);
  return table;
}

function hardCards(stageId,record){
  const cards=element('div',undefined,'challenge-record-cards');
  cards.setAttribute('role','group');
  cards.setAttribute('aria-label',`${STAGE_LABELS[stageId]} 하드 스테이지 기록`);
  for(const [kind,label] of Object.entries(RECORD_LABELS)){
    const card=element('section',undefined,`challenge-record-card challenge-record-${kind}`);
    card.append(element('h3',label),recordValue(record[kind]));
    cards.append(card);
  }
  return cards;
}

export function mountRecordsPopup({save,onBack}){
  if(typeof onBack!=='function')throw new TypeError('Records Back callback is required');
  const menu=mountChallengePanel('기록','',{titleScreen:true});
  menu.panel.classList.add('challenge-records');
  const content=element('div',undefined,'challenge-record-content');
  let mode='easy',stageId='forest-1';

  function render(){
    setPanelStage(menu.panel,stageId);
    content.replaceChildren(mode==='easy'
      ?easyTable(stageId,save.easy.roundRecords[stageId])
      :hardCards(stageId,save.records[stageId]));
  }

  appendChoiceSwitch(menu.panel,{
    label:'모드',choices:[{value:'easy',label:'이지'},{value:'hard',label:'하드'}],value:mode,
    onChange:value=>{mode=value;render();}
  });
  appendChoiceSwitch(menu.panel,{
    label:'스테이지',choices:Object.entries(STAGE_LABELS).map(([value,label])=>({value,label})),value:stageId,
    onChange:value=>{stageId=value;render();}
  });
  menu.panel.append(content);
  menu.button('뒤로',onBack).classList.add('challenge-back');
  render();
  menu.focus();
  return menu;
}
