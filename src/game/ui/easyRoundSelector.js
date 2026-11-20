import {mountMenu} from './menu.js';

const STAGES=[['forest-1','숲'],['mine-1','광산']];
const ROUND_KEYS=Array.from({length:8},(_,index)=>String(index+1));
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const hasExactKeys=(value,keys)=>object(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const count=value=>Number.isSafeInteger(value)&&value>=0;
const result=value=>hasExactKeys(value,['elapsedTicks','deaths'])&&count(value.elapsedTicks)&&count(value.deaths);
const record=value=>hasExactKeys(value,['best','recent'])&&(value.best===null||result(value.best))&&(value.recent===null||result(value.recent));

function validEasyProgress(save){
  const easy=save?.easy;
  if(save?.version!==4||!hasExactKeys(easy,['unlockedRoundByStage','totalDeaths','roundRecords'])||!count(easy.totalDeaths))return false;
  if(!hasExactKeys(easy.unlockedRoundByStage,['forest-1','mine-1']))return false;
  const forestRound=easy.unlockedRoundByStage['forest-1'],mineRound=easy.unlockedRoundByStage['mine-1'];
  if(!Number.isInteger(forestRound)||forestRound<1||forestRound>8||!Number.isInteger(mineRound)||mineRound<0||mineRound>8)return false;
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
      rounds:Array.from({length:8},(_,index)=>({round:index+1,unlocked:unlocked&&index+1<=maximum}))
    };
  });
}

export function mountEasyRoundSelector({save,onSelect,onBack,titleScreen=false}){
  if(typeof onSelect!=='function'||typeof onBack!=='function')throw new TypeError('Selector callbacks are required');
  const groups=easyRoundChoices(save);
  const menu=mountMenu('이지 모드 라운드 선택','도전할 스테이지와 라운드를 선택하세요.',titleScreen?{variant:'title',layout:'submenu'}:{});
  let handled=false;
  for(const group of groups){
    menu.text(`${group.unlocked?'':'🔒 '}${group.label}`);
    for(const choice of group.rounds){
      const label=choice.unlocked?`${choice.round}라운드`:`🔒 ${choice.round}라운드`;
      menu.button(label,()=>{
        if(handled||!choice.unlocked)return;
        handled=true;onSelect(group.stageId,choice.round);
      },{disabled:!choice.unlocked});
    }
  }
  menu.button('뒤로',()=>{if(handled)return;handled=true;onBack();});
  menu.focus();
  return menu;
}
