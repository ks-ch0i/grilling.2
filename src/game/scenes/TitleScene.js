import Phaser from 'phaser';
import {getAppStore} from '../storage/appStore.js';
import {mountMenu,mountStorageNotice,createNewRun,menuState,formatTicks} from '../ui/menu.js';
export class TitleScene extends Phaser.Scene {
  constructor(){super('title');}
  create(){this.store=getAppStore();mountStorageNotice(this.store);this.showMain();this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.menu?.remove());}
  showMain(){
    this.menu?.remove();this.menu=mountMenu('Pixel Action','저주받은 숲');const save=this.store.getSave();
    this.menu.button('시작',()=>save.run?this.confirmNew():this.startNew());
    this.menu.button('이어하기',()=>this.scene.start('stage',{run:this.store.getSave().run}),{disabled:!menuState(save).canContinue});
    this.menu.button('기록',()=>this.showRecords());
    this.menu.button('설정',()=>this.openSettings());this.menu.focus();
  }
  confirmNew(){this.menu.remove();this.menu=mountMenu('새 도전','기존 진행 상황이 초기화됩니다. 최고 기록과 설정은 유지됩니다.');this.menu.button('새로 시작',()=>this.startNew());this.menu.button('취소',()=>this.showMain());this.menu.focus();}
  startNew(){const save=createNewRun(this.store.getSave());this.store.setSave(save);this.store.persist();this.scene.start('stage',{run:save.run});}
  showRecords(){
    this.menu.remove();this.menu=mountMenu('기록');const {best,recent}=this.store.getSave();
    this.menu.text(best?`최고 기록: ${formatTicks(best.elapsedTicks)} / 사망 ${best.deaths}회`:'최고 기록: 없음');
    this.menu.text(recent?`최근 기록: ${formatTicks(recent.elapsedTicks)} / 사망 ${recent.deaths}회`:'최근 기록: 없음');
    this.menu.button('뒤로',()=>this.showMain());this.menu.focus();
  }
  openSettings(){this.menu.hide();this.scene.launch('settings',{onClose:()=>{this.menu.show();}});}
}
