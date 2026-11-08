import Phaser from 'phaser';
import {getAppStore} from '../storage/appStore.js';
import {mountMenu,mountStorageNotice,createNewRun,menuState,formatTicks} from '../ui/menu.js';
import {preloadAssets,validateAssets} from '../assets/manifest.js';
import {getAudioManager} from '../audio/AudioManager.js';
import {shouldRecoverRun} from '../storage/reloadRecovery.js';
export class TitleScene extends Phaser.Scene {
  constructor(){super('title');}
  preload(){this.assetErrors=[];this.onAssetError=file=>this.assetErrors.push(file.key);this.load.on('loaderror',this.onAssetError);preloadAssets(this.load,this.textures);}
  create(){
    this.load.off('loaderror',this.onAssetError);this.store=getAppStore();mountStorageNotice(this.store);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.menu?.remove());
    const validation=validateAssets(this.textures),errors=[...this.assetErrors,...validation.errors];
    if(errors.length){this.menu=mountMenu('에셋을 불러오지 못했습니다',`누락 또는 손상: ${errors.join(', ')}. 파일을 확인한 뒤 다시 시도하세요.`);this.menu.button('다시 시도',()=>window.location.reload());this.menu.focus();return;}
    const run=this.store.getSave().run,navigation=performance.getEntriesByType('navigation')[0]?.type;
    if(shouldRecoverRun(navigation,run)){this.scene.start('stage',{run,recovered:true});return;}
    this.showMain();
  }
  startAudio(){const audio=getAudioManager();audio.setVolumes(this.store.getSave().settings);void audio.unlock();audio.resumeMusic();audio.playMusic('forest');}
  showMain(){
    this.menu?.remove();this.menu=mountMenu('Pixel Action','저주받은 숲');const save=this.store.getSave();
    this.menu.button('시작',()=>save.run?this.confirmNew():this.startNew());
    this.menu.button('이어하기',()=>{this.startAudio();this.scene.start('stage',{run:this.store.getSave().run,recovered:true});},{disabled:!menuState(save).canContinue});
    this.menu.button('기록',()=>this.showRecords());
    this.menu.button('설정',()=>this.openSettings());this.menu.focus();
  }
  confirmNew(){this.menu.remove();this.menu=mountMenu('새 도전','기존 진행 상황이 초기화됩니다. 최고 기록과 설정은 유지됩니다.');this.menu.button('새로 시작',()=>this.startNew());this.menu.button('취소',()=>this.showMain());this.menu.focus();}
  startNew(){this.startAudio();const save=createNewRun(this.store.getSave());this.store.setSave(save);this.store.persist();this.scene.start('stage',{run:save.run});}
  showRecords(){
    this.menu.remove();this.menu=mountMenu('기록');const {best,recent}=this.store.getSave().records['forest-1'];
    this.menu.text(best?`최고 기록: ${formatTicks(best.elapsedTicks)} / 사망 ${best.deaths}회`:'최고 기록: 없음');
    this.menu.text(recent?`최근 기록: ${formatTicks(recent.elapsedTicks)} / 사망 ${recent.deaths}회`:'최근 기록: 없음');
    this.menu.button('뒤로',()=>this.showMain());this.menu.focus();
  }
  openSettings(){this.menu.hide();this.scene.launch('settings',{onClose:()=>{this.menu.show();}});}
}
