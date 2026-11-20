import {getStage} from '../content/stages.js';
import {createStageRun} from '../sim/stage.js';
import {recordEasyDeath,recordEasyRoundCompletion} from '../storage/saveStore.js';
import {formatTicks,mountMenu} from '../ui/menu.js';
import {mountEasyRoundSelector} from '../ui/easyRoundSelector.js';

const STAGE_NAMES={'forest-1':'숲','mine-1':'광산'};

function resultMetric(label,value){
  const wrapper=document.createElement('div');wrapper.className='result-metric';
  const term=document.createElement('dt');term.textContent=label;
  const amount=document.createElement('dd');amount.textContent=value;
  wrapper.append(term,amount);return wrapper;
}

function resultCard(title,record,className){
  const card=document.createElement('section');card.className=`result-record ${className}`;
  const heading=document.createElement('h3');heading.textContent=title;card.append(heading);
  if(record){
    const values=document.createElement('dl');values.className='result-metrics';
    values.append(resultMetric('완주 시간',formatTicks(record.elapsedTicks)),resultMetric('사망 횟수',`${record.deaths}회`));card.append(values);
  }else{
    const empty=document.createElement('p');empty.className='result-empty';empty.textContent='아직 최고 기록이 없습니다.';card.append(empty);
  }
  return card;
}

export function isEasyRoundUnlocked(save,stageId,round){
  if(!['forest-1','mine-1'].includes(stageId)||!Number.isInteger(round)||round<1||round>8)return false;
  const maximum=save?.easy?.unlockedRoundByStage?.[stageId];
  return Number.isInteger(maximum)&&maximum>=round;
}

export function initializeEasyRun(scene,data={}){
  if(data.mode!==undefined&&!['easy','hard'].includes(data.mode)){scene.scene.start('title');return false;}
  scene.mode=data.mode==='easy'?'easy':'hard';
  if(scene.mode==='easy'){
    if(!isEasyRoundUnlocked(scene.store.getSave(),data.stageId,data.round)){scene.scene.start('title');return false;}
    scene.run=createStageRun(getStage(data.stageId),{}, {startRound:data.round});
  }else scene.run=createStageRun(getStage(data.run?.stageId??'forest-1'),data.run??{});
  scene.stage=getStage(scene.run.stageId);return true;
}

export function handleEasyDeath(scene){
  if(scene.mode!=='easy'||scene.easyDeathHandled)return;
  scene.easyDeathHandled=true;scene.pauseEasyDecision();
  scene.store.setSave(recordEasyDeath(scene.store.getSave()));scene.store.persist();
  scene.easyCurrentRecord={elapsedTicks:scene.run.elapsedTicks,deaths:scene.store.getSave().easy.totalDeaths};
  showEasyChoice(scene,'death');
}

function recordEasyClear(scene){
  const result={elapsedTicks:scene.run.elapsedTicks,deaths:scene.store.getSave().easy.totalDeaths};
  const save=recordEasyRoundCompletion(scene.store.getSave(),scene.stage.id,scene.run.round,result);
  scene.store.setSave(save);scene.store.persist();scene.easyCurrentRecord=result;
  scene.easyBestRecord=save.easy.roundRecords[scene.stage.id][String(scene.run.round)].best;
}

export function handleEasyRoundClear(scene){
  if(scene.mode!=='easy'||scene.easyResultHandled||scene.run.round>=8)return;
  scene.easyResultHandled=true;scene.pauseEasyDecision();recordEasyClear(scene);
  showEasyChoice(scene,'round-clear');
}

export function handleEasyStageClear(scene){
  if(scene.mode!=='easy'||scene.easyResultHandled||scene.run.round!==8||scene.run.outcome!=='clear')return;
  scene.easyResultHandled=true;scene.pauseEasyDecision();recordEasyClear(scene);
  showEasyChoice(scene,'stage-clear');
}

export function showEasyChoice(scene,kind){
  scene.pauseEasyDecision();scene.easyDecisionMenu?.remove();
  const stageId=scene.stage.id,round=scene.run.round,stageName=STAGE_NAMES[stageId]??'스테이지';
  const isDeath=kind==='death',isStageClear=kind==='stage-clear';
  const title=isDeath?'사망':isStageClear?(stageId==='mine-1'?'전체 클리어':'스테이지 클리어'):'라운드 클리어';
  const menu=mountMenu(title,`${stageName} · ${round}라운드`);
  menu.root.classList.add('result-overlay');menu.panel.classList.add('result-panel');
  menu.panel.querySelector(':scope > p')?.classList.add('result-subtitle');
  const intro=menu.text(isDeath?'이번 도전이 끝났습니다':isStageClear?'스테이지의 모든 라운드를 돌파했습니다':'다음 선택을 기다리는 동안 시간은 멈춥니다');intro.className='result-eyebrow';
  const summary=document.createElement('div');summary.className=`result-summary${isDeath?' result-summary-single':''}`;
  const current=scene.easyCurrentRecord??{elapsedTicks:scene.run.elapsedTicks,deaths:scene.store.getSave().easy.totalDeaths};
  summary.append(resultCard(isDeath?'이번 도전':'이번 라운드',current,'result-record-current'));
  if(!isDeath){
    const best=scene.easyBestRecord??scene.store.getSave().easy.roundRecords[stageId][String(round)].best;
    summary.append(resultCard('최고 기록',best,'result-record-best'));
  }
  menu.panel.append(summary);
  const button=(label,action,style='result-secondary')=>{const choice=menu.button(label,action);choice.classList.add(style);return choice;};
  const selector=()=>showEasyRoundSelector(scene,kind),home=()=>leaveEasySession(scene);
  if(isDeath){
    button('다시 시도',()=>startEasyRound(scene,stageId,round),'result-primary');
    button('라운드 선택',selector);button('홈',home,'result-home');
  }else if(round<8){
    button('라운드 선택',selector);
    button('다음 라운드',()=>startEasyRound(scene,stageId,round+1),'result-primary');
    button('홈',home,'result-home');
  }else if(stageId==='forest-1'){
    button('다음 스테이지',()=>startEasyRound(scene,'mine-1',1),'result-primary');
    button('스테이지/라운드 선택',selector);button('홈',home,'result-home');
  }else{
    button('라운드 선택',selector,'result-primary');button('홈',home,'result-home');
  }
  scene.easyDecisionMenu=menu;menu.focus();
}

export function showEasyRoundSelector(scene,returnToKind){
  scene.pauseEasyDecision();scene.easyDecisionMenu?.remove();
  scene.easyDecisionMenu=mountEasyRoundSelector({save:scene.store.getSave(),initialStageId:scene.stage.id,onSelect:(stageId,round)=>startEasyRound(scene,stageId,round),onBack:()=>showEasyChoice(scene,returnToKind)});
}

export function startEasyRound(scene,stageId,round){
  if(!scene.easyDecisionOpen)return;
  if(scene.mode!=='easy'||!isEasyRoundUnlocked(scene.store.getSave(),stageId,round)){leaveEasySession(scene);return;}
  scene.easyDecisionOpen=false;scene.easyDecisionMenu?.remove();scene.easyDecisionMenu=null;
  scene.scene.restart({mode:'easy',stageId,round});
}

export function leaveEasySession(scene){
  scene.easyDecisionOpen=false;scene.easyDecisionMenu?.remove();scene.easyDecisionMenu=null;
  scene.scene.start('title');
}
