import {ROUND_COUNT,isBossRound} from '../sim/rounds.js';
import {appendChoiceSwitch,mountChallengePanel,setPanelStage} from './challengePanel.js';

const STAGES=[['forest-1','숲'],['mine-1','광산']];
const ROUND_KEYS=Array.from({length:ROUND_COUNT},(_,index)=>String(index+1));
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const hasExactKeys=(value,keys)=>object(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const count=value=>Number.isSafeInteger(value)&&value>=0;
const result=value=>hasExactKeys(value,['elapsedTicks','deaths'])&&count(value.elapsedTicks)&&count(value.deaths);
const record=value=>hasExactKeys(value,['best','recent'])&&(value.best===null||result(value.best))&&(value.recent===null||result(value.recent));

function validEasyProgress(save){
  const easy=save?.easy;
  if(save?.version!==5||!hasExactKeys(easy,['unlockedRoundByStage','totalDeaths','roundRecords'])||!count(easy.totalDeaths))return false;
  if(!hasExactKeys(easy.unlockedRoundByStage,['forest-1','mine-1']))return false;
  const forestRound=easy.unlockedRoundByStage['forest-1'],mineRound=easy.unlockedRoundByStage['mine-1'];
  if(!Number.isInteger(forestRound)||forestRound<1||forestRound>ROUND_COUNT||!Number.isInteger(mineRound)||mineRound<0||mineRound>ROUND_COUNT)return false;
  if(!hasExactKeys(easy.roundRecords,['forest-1','mine-1']))return false;
  return STAGES.every(([stageId])=>{
    const stageRecords=easy.roundRecords[stageId];
    return hasExactKeys(stageRecords,ROUND_KEYS)&&ROUND_KEYS.every(round=>record(stageRecords[round]));
  });
}

export function easyRoundChoices(save){
  if(!validEasyProgress(save))throw new TypeError('Invalid Easy progress');
  return STAGES.map(([stageId,label])=>{
    const maximum=save.easy.unlockedRoundByStage[stageId],unlocked=maximum>0;
    return {
      stageId,label,unlocked,
      rounds:Array.from({length:ROUND_COUNT},(_,index)=>({round:index+1,unlocked:unlocked&&index+1<=maximum}))
    };
  });
}

export function mountEasyRoundSelector({save,onSelect,onBack,titleScreen=false,initialStageId='forest-1'}){
  if(typeof onSelect!=='function'||typeof onBack!=='function')throw new TypeError('Selector callbacks are required');
  const groups=easyRoundChoices(save);
  if(!groups.some(group=>group.stageId===initialStageId))throw new TypeError('Unknown initial stage');
  const menu=mountChallengePanel('이지 모드 라운드 선택','도전할 스테이지와 라운드를 선택하세요.',{titleScreen});
  const summary=document.createElement('div');
  summary.className='challenge-round-summary';
  const stageName=document.createElement('strong'),progress=document.createElement('span');
  summary.append(stageName,progress);
  const grid=document.createElement('div');
  grid.className='challenge-round-grid';
  let handled=false;

  function renderStage(stageId){
    const group=groups.find(option=>option.stageId===stageId);
    const records=save.easy.roundRecords[stageId];
    setPanelStage(menu.panel,stageId);
    stageName.textContent=group.label;
    const cleared=group.rounds.filter(({round,unlocked})=>unlocked&&records[String(round)].best!==null).length;
    progress.textContent=`${cleared} / ${ROUND_COUNT} 클리어`;
    const tiles=group.rounds.map(choice=>{
      const boss=isBossRound(stageId,choice.round);
      const complete=choice.unlocked&&records[String(choice.round)].best!==null;
      const state=choice.unlocked?(complete?'클리어':'도전 가능'):'잠금';
      const tile=document.createElement('button');
      tile.type='button';
      tile.className='challenge-round-tile';
      tile.disabled=!choice.unlocked;
      tile.setAttribute('data-round',String(choice.round));
      tile.setAttribute('aria-label',`${choice.round}라운드, ${boss?'보스, ':''}${state}`);
      const number=document.createElement('strong');
      number.className='challenge-round-number';
      number.textContent=String(choice.round).padStart(2,'0');
      const badges=document.createElement('span');
      badges.className='challenge-round-badges';
      const status=document.createElement('span');
      status.className=complete?'challenge-round-cleared':'challenge-round-state';
      status.textContent=state;
      badges.append(status);
      if(boss){
        const badge=document.createElement('span');
        badge.className='challenge-round-boss';
        badge.textContent='보스';
        badges.append(badge);
      }
      tile.append(number,badges);
      tile.addEventListener('click',()=>{
        if(handled||!choice.unlocked)return;
        handled=true;onSelect(stageId,choice.round);
      });
      return tile;
    });
    grid.replaceChildren(...tiles);
  }

  appendChoiceSwitch(menu.panel,{
    label:'스테이지',choices:groups.map(({stageId,label})=>({value:stageId,label})),value:initialStageId,onChange:renderStage
  });
  menu.panel.append(summary,grid);
  menu.button('뒤로',()=>{if(handled)return;handled=true;onBack();}).classList.add('challenge-back');
  renderStage(initialStageId);
  menu.focus();
  return menu;
}
