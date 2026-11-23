import Phaser from 'phaser';
import {getAppStore} from '../storage/appStore.js';
import {mountMenu,mountStorageNotice,mountAccountStatus,createNewRun,menuState} from '../ui/menu.js';
import {preloadAssets,validateAssets} from '../assets/manifest.js';
import {getAudioManager} from '../audio/AudioManager.js';
import {isRoundSelectorEnabled,ROUND_TARGETS} from '../dev/roundSelector.js';
import {mountEasyRoundSelector} from '../ui/easyRoundSelector.js';
import {mountRecordsPopup} from '../ui/recordsPopup.js';
export class TitleScene extends Phaser.Scene {
  constructor(){super('title');}
  preload(){this.assetErrors=[];this.onAssetError=file=>this.assetErrors.push(file.key);this.load.on('loaderror',this.onAssetError);preloadAssets(this.load,this.textures);}
  create(){
    this.load.off('loaderror',this.onAssetError);this.store=getAppStore();mountStorageNotice(this.store);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.removeTitleAudioFallback();this.menu?.remove();});
    const validation=validateAssets(this.textures),errors=[...this.assetErrors,...validation.errors];
    if(errors.length){this.menu=mountMenu('에셋을 불러오지 못했습니다',`누락 또는 손상: ${errors.join(', ')}. 파일을 확인한 뒤 다시 시도하세요.`);this.menu.button('다시 시도',()=>window.location.reload());this.menu.focus();return;}
    this.showMain();this.startTitleAudio();
  }
  startTitleAudio(){
    this.audio=getAudioManager();this.audio.setVolumes(this.store.getSave().settings);this.audio.setSfxSuppressed(false);
    const game=document.getElementById('game');
    this.onTitleClick=event=>{if(game.contains(event.target))this.retryTitleAudioFromGesture();};
    this.onTitleKeydown=event=>{
      if(!game.contains(event.target)||event.key==='Enter'||event.key===' '||event.code==='Space')return;
      this.retryTitleAudioFromGesture();
    };
    document.addEventListener('click',this.onTitleClick);
    document.addEventListener('keydown',this.onTitleKeydown);
    this.removeAudioRecoveryListener=this.audio.onPlaybackRecovered(()=>this.removeTitleAudioFallback());
    void this.audio.unlock();
    this.audio.playMusic('title');
  }
  retryTitleAudioFromGesture(){
    void this.audio.unlock();
    this.audio.retryPendingMusicFromGesture();
  }
  removeTitleAudioFallback(){
    if(this.onTitleClick)document.removeEventListener('click',this.onTitleClick);
    if(this.onTitleKeydown)document.removeEventListener('keydown',this.onTitleKeydown);
    this.onTitleClick=null;this.onTitleKeydown=null;
    this.removeAudioRecoveryListener?.();this.removeAudioRecoveryListener=null;
  }
  startAudio(stageId){
    const audio=getAudioManager();audio.setVolumes(this.store.getSave().settings);audio.setSfxSuppressed(false);void audio.unlock();
    audio.playMusic(stageId==='mine-1'?'mine':'forest',{fadeMs:1000});
  }
  showMain(){
    this.menu?.remove();this.menu=mountMenu('Pixel Action','',{variant:'title',layout:'main'});
    mountAccountStatus(this.menu,this.store,{showAccount:true,showSignOut:true});
    this.menu.button('시작',()=>this.showModes());
    this.menu.button('기록',()=>this.showRecords());
    if(isRoundSelectorEnabled({development:import.meta.env.DEV,enabled:import.meta.env.VITE_DEV_ROUND_SELECTOR!=='false'}))this.menu.button('라운드 선택 (개발용)',()=>this.showPracticeRounds());
    this.menu.button('설정',()=>this.openSettings());this.menu.focus();
  }
  showPracticeRounds(){this.menu.remove();this.menu=mountMenu('라운드 선택','연습 기록은 저장되지 않습니다.',{variant:'title',layout:'submenu'});for(const round of ROUND_TARGETS)this.menu.button(round.label,()=>{this.startAudio(round.stageId);this.scene.start('stage',{practiceTarget:round.id});});this.menu.button('뒤로',()=>this.showMain());this.menu.focus();}
  showModes(){this.menu?.remove();this.menu=mountMenu('모드 선택','',{variant:'title',layout:'submenu'});this.menu.button('이지 모드',()=>this.showEasySelector());this.menu.button('하드 모드',()=>this.showHardMenu());this.menu.button('뒤로',()=>this.showMain());this.menu.focus();}
  showHardMenu(){this.menu?.remove();const save=this.store.getSave();this.menu=mountMenu('하드 모드','',{variant:'title',layout:'submenu'});this.menu.button('새 게임',()=>this.startHardNew());this.menu.button('이어하기',()=>this.continueHard(),{disabled:!menuState(save).canContinue});this.menu.button('뒤로',()=>this.showModes());this.menu.focus();}
  showEasySelector(){
    this.menu?.remove();
    this.menu=mountEasyRoundSelector({save:this.store.getSave(),titleScreen:true,
      onSelect:(stageId,round)=>{this.startAudio(stageId);this.scene.start('stage',{mode:'easy',stageId,round});},
      onBack:()=>this.showModes()});
  }
  startHardNew(){
    this.startAudio('forest-1');const save=createNewRun(this.store.getSave(),'forest-1');
    this.store.setSave(save);this.store.persist();this.scene.start('stage',{mode:'hard',run:save.run});
  }
  continueHard(){
    const run=this.store.getSave().run;if(!run){this.showHardMenu();return;}
    this.startAudio(run.stageId);this.scene.start('stage',{mode:'hard',run});
  }
  showRecords(){
    this.menu?.remove();
    this.menu=mountRecordsPopup({save:this.store.getSave(),store:this.store,onBack:()=>this.showMain()});
  }
  openSettings(){this.menu.hide();this.scene.launch('settings',{onClose:()=>{this.menu.show();}});}
}
