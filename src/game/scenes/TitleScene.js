import Phaser from 'phaser';
import {getAppStore} from '../storage/appStore.js';
import {mountMenu,mountStorageNotice,createNewRun,menuState,formatTicks} from '../ui/menu.js';
import {preloadAssets,validateAssets} from '../assets/manifest.js';
import {getAudioManager} from '../audio/AudioManager.js';
import {shouldRecoverRun} from '../storage/reloadRecovery.js';
import {isRoundSelectorEnabled,ROUND_TARGETS} from '../dev/roundSelector.js';
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
  startAudio(stageId){const audio=getAudioManager();audio.setVolumes(this.store.getSave().settings);void audio.unlock();audio.resumeMusic();audio.playMusic(stageId==='mine-1'?'mine':'forest');}
  showMain(){
    this.menu?.remove();this.menu=mountMenu('Pixel Action','저주받은 숲');const save=this.store.getSave();
    this.menu.button('시작',()=>this.showStages());
    this.menu.button('이어하기',()=>{const run=this.store.getSave().run;this.startAudio(run.stageId);this.scene.start('stage',{run,recovered:true});},{disabled:!menuState(save).canContinue});
    this.menu.button('기록',()=>this.showRecords());
    if(isRoundSelectorEnabled({development:import.meta.env.DEV,enabled:import.meta.env.VITE_DEV_ROUND_SELECTOR!=='false'}))this.menu.button('라운드 선택 (개발용)',()=>this.showPracticeRounds());
    this.menu.button('설정',()=>this.openSettings());this.menu.focus();
  }
  showPracticeRounds(){this.menu.remove();this.menu=mountMenu('라운드 선택','연습 기록은 저장되지 않습니다.');for(const round of ROUND_TARGETS)this.menu.button(round.label,()=>{this.startAudio(round.stageId);this.scene.start('stage',{practiceTarget:round.id});});this.menu.button('뒤로',()=>this.showMain());this.menu.focus();}
  showStages(){this.menu.remove();this.menu=mountMenu('스테이지 선택');for(const id of menuState(this.store.getSave()).unlockedStageIds)this.menu.button(id==='forest-1'?'숲':'광산',()=>this.store.getSave().run?this.confirmNew(id):this.startNew(id));this.menu.button('뒤로',()=>this.showMain());this.menu.focus();}
  confirmNew(id){this.menu.remove();this.menu=mountMenu('새 도전','기존 진행 상황이 교체됩니다. 해금, 기록과 설정은 유지됩니다.');this.menu.button('새로 시작',()=>this.startNew(id));this.menu.button('취소',()=>this.showStages());this.menu.focus();}
  startNew(id){this.startAudio(id);const save=createNewRun(this.store.getSave(),id);this.store.setSave(save);this.store.persist();this.scene.start('stage',{run:save.run});}
  showRecords(){
    this.menu.remove();this.menu=mountMenu('기록');
    for(const [id,label] of [['forest-1','숲'],['mine-1','광산']]){const {best,recent}=this.store.getSave().records[id];
      this.menu.text(best?`${label} 최고: ${formatTicks(best.elapsedTicks)} / 사망 ${best.deaths}회`:`${label} 최고: 없음`);
      this.menu.text(recent?`${label} 최근: ${formatTicks(recent.elapsedTicks)} / 사망 ${recent.deaths}회`:`${label} 최근: 없음`);}
    this.menu.button('뒤로',()=>this.showMain());this.menu.focus();
  }
  openSettings(){this.menu.hide();this.scene.launch('settings',{onClose:()=>{this.menu.show();}});}
}
