import Phaser from 'phaser';
import {getAppStore} from '../storage/appStore.js';
import {mountMenu,formatTicks} from '../ui/menu.js';
export class ResultScene extends Phaser.Scene {
  constructor(){super('result');}
  create(data){const menu=mountMenu(data.practice?'연습 완료':'스테이지 클리어');const best=getAppStore().getSave().records[data.stageId].best;
    menu.text(`이번 기록: ${formatTicks(data.record.elapsedTicks)} / 사망 ${data.record.deaths}회`);
    if(data.practice)menu.text('연습 기록은 저장되지 않습니다.');else menu.text(best?`최고 기록: ${formatTicks(best.elapsedTicks)} / 사망 ${best.deaths}회`:'최고 기록: 없음');
    if(!data.practice&&data.stageId==='forest-1')menu.button('다음 스테이지',()=>this.scene.start('stage',{run:getAppStore().getSave().run}));
    menu.button('처음 화면',()=>this.scene.start('title'));menu.focus();this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>menu.remove());
  }
}
