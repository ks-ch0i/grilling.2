import Phaser from 'phaser';
import {getAppStore} from '../storage/appStore.js';
import {mountMenu} from '../ui/menu.js';
export class SettingsScene extends Phaser.Scene {
  constructor(){super('settings');}
  create(data){
    this.store=getAppStore();this.onClose=data.onClose;this.menu=mountMenu('설정');const settings=this.store.getSave().settings;
    const change=patch=>{const save=this.store.getSave();this.store.setSave({...save,settings:{...save.settings,...patch}});this.store.persist();};
    this.menu.range('음악 음량',settings.musicVolume,v=>change({musicVolume:v}));
    this.menu.range('효과음 음량',settings.sfxVolume,v=>change({sfxVolume:v}));
    this.menu.checkbox('화면 흔들림',settings.screenShake,v=>change({screenShake:v}));
    this.menu.text('조작: A/D 이동 · Space 점프 · 마우스 왼쪽 공격 · Shift 구르기 · E 내려베기 · Esc 일시정지');
    this.fullscreenButton=this.menu.button('',()=>this.toggleFullscreen());this.fullscreenError=this.menu.text('');this.fullscreenError.setAttribute('role','status');
    this.menu.button('뒤로',()=>this.close());this.fullscreenChanged=()=>{this.fullscreenButton.textContent=document.fullscreenElement?'전체화면 종료':'전체화면';if(document.fullscreenElement)this.fullscreenError.textContent='';};
    this.onKey=e=>{if(e.code==='Escape'&&!e.repeat){e.preventDefault();this.close();}};
    document.addEventListener('fullscreenchange',this.fullscreenChanged);window.addEventListener('keydown',this.onKey);this.fullscreenChanged();this.menu.focus();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{document.removeEventListener('fullscreenchange',this.fullscreenChanged);window.removeEventListener('keydown',this.onKey);this.menu.remove();});
  }
  async toggleFullscreen(){
    let timer;
    try {
      let operation;
      if(document.fullscreenElement){if(!document.exitFullscreen)throw new Error('unsupported');operation=document.exitFullscreen();}
      else {if(!document.documentElement.requestFullscreen)throw new Error('unsupported');operation=document.documentElement.requestFullscreen();}
      await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),2000);})]);this.fullscreenError.textContent='';
    } catch {this.fullscreenError.textContent='전체화면을 사용할 수 없습니다.';}
    finally {clearTimeout(timer);}
  }
  close(){const onClose=this.onClose;this.scene.stop();onClose?.();}
}
