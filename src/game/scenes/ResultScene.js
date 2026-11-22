import Phaser from 'phaser';
import {getAppStore} from '../storage/appStore.js';
import {mountMenu,mountAccountStatus,formatTicks,createNewRun} from '../ui/menu.js';
import {mountRecordsPopup} from '../ui/recordsPopup.js';

const STAGE_NAMES={'forest-1':'숲','mine-1':'광산'};

function metric(label,value){
  const wrapper=document.createElement('div');wrapper.className='result-metric';
  const term=document.createElement('dt');term.textContent=label;
  const amount=document.createElement('dd');amount.textContent=value;
  wrapper.append(term,amount);return wrapper;
}

function recordCard(title,record,className){
  const card=document.createElement('section');card.className=`result-record ${className}`;
  const heading=document.createElement('h3');heading.textContent=title;card.append(heading);
  if(record){
    const values=document.createElement('dl');values.className='result-metrics';
    values.append(metric('완주 시간',formatTicks(record.elapsedTicks)),metric('사망 횟수',`${record.deaths}회`));card.append(values);
  }else{
    const empty=document.createElement('p');empty.className='result-empty';empty.textContent='아직 최고 기록이 없습니다.';card.append(empty);
  }
  return card;
}

export class ResultScene extends Phaser.Scene {
  constructor(){super('result');}
  create(data){
    this.data=data;this.store=getAppStore();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.menu?.remove());
    this.showResult(data);
  }
  showResult(data){
    this.menu?.remove();
    const practice=Boolean(data.practice),stageName=STAGE_NAMES[data.stageId]??'스테이지';
    const store=this.store,best=store.getSave().records[data.stageId]?.best??null;
    const menu=this.menu=mountMenu(practice?'연습 완료':'스테이지 클리어',`${stageName} · 8라운드 완주`);
    menu.root.classList.add('result-overlay');menu.panel.classList.add('result-panel');
    menu.panel.querySelector(':scope > p')?.classList.add('result-subtitle');
    const intro=menu.text(practice?'연습 결과 · 기록은 저장되지 않습니다':'모든 라운드를 돌파했습니다');intro.className='result-eyebrow';
    const summary=document.createElement('div');summary.className=`result-summary${practice?' result-summary-single':''}`;
    summary.append(recordCard('이번 도전',data.record,'result-record-current'));
    if(!practice)summary.append(recordCard('최고 기록',best,'result-record-best'));
    menu.panel.append(summary);
    mountAccountStatus(menu,store);

    if(practice){
      const retry=menu.button('다시 연습',()=>this.scene.start('stage',{practiceTarget:data.practiceTarget}));retry.classList.add('result-primary');
      const home=menu.button('홈',()=>this.scene.start('title'));home.classList.add('result-home');
    }else{
      if(typeof store.getLeaderboard==='function'){
        const board=menu.button('회사 순위 보기',()=>this.openCompanyBoard(data));board.classList.add('result-secondary');
      }
      const home=menu.button('홈',()=>this.scene.start('title'));home.classList.add('result-home');
      if(data.stageId==='forest-1'){
        const next=menu.button('다음 스테이지',()=>this.startFreshRun('mine-1'));next.classList.add('result-primary');
      }
      const retry=menu.button('다시 시도',()=>this.startFreshRun(data.stageId));retry.classList.add(data.stageId==='mine-1'?'result-primary':'result-secondary');
    }
    menu.focus();
  }
  openCompanyBoard(data){
    this.menu?.remove();
    this.menu=mountRecordsPopup({
      save:this.store.getSave(),store:this.store,titleScreen:false,
      initialChallenge:{mode:'hard',stageId:data.stageId},
      onBack:()=>this.showResult(data)
    });
  }
  startFreshRun(stageId){
    const store=getAppStore(),save=createNewRun(store.getSave(),stageId);
    store.setSave(save);store.persist();this.scene.start('stage',{run:save.run});
  }
}
