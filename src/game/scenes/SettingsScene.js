import Phaser from 'phaser';
import {getAppStore} from '../storage/appStore.js';
import {mountMenu} from '../ui/menu.js';
import {getAudioManager} from '../audio/AudioManager.js';
export class SettingsScene extends Phaser.Scene {
  constructor(){super('settings');}
  create(data){
    this.store=getAppStore();this.onClose=data.onClose;this.menu=mountMenu('설정');const settings=this.store.getSave().settings;
    const change=patch=>{const save=this.store.getSave();this.store.setSave({...save,settings:{...save.settings,...patch}});this.store.persist();getAudioManager().setVolumes(this.store.getSave().settings);if(patch.screenShake===false&&this.scene.isActive('stage'))this.scene.get('stage').cameras.main.resetFX();};
    this.menu.range('음악 음량',settings.musicVolume,v=>change({musicVolume:v}));
    this.menu.range('효과음 음량',settings.sfxVolume,v=>change({sfxVolume:v}));
    this.menu.checkbox('화면 흔들림',settings.screenShake,v=>change({screenShake:v}));
    this.menu.text('조작: A/D 이동 · Space 점프 · S 또는 ↓ + Space(발판이 있으면 내려가기, 없으면 점프) · Shift 구르기 · Esc 일시정지');
    this.menu.text('검 공격: 좌클릭(지상 일반 공격 · 공중 30틱 전 일반 베기 · 30틱 이후 준비되면 내려찍기 · 착지 후 바로 일반 공격 가능)');
    this.menu.text('원거리 방패: Q 길게 누르기(최대 1초 · 해제 후 3초 대기)');
    this.menu.text('근접 패링: 우클릭(전체 37틱≈0.618초 · 처음 23틱≈0.382초는 퍼펙트 · 입력 후 3초 대기 · 60틱/초 정수 판정)');
    this.menu.text('결과: 방패·일반 패링 성공은 체력 반 칸 감소 · 퍼펙트는 피해 없음 · 방어 성공 후 1초 보호.');
    this.menu.text('효과: 일반 패링은 작은 청록 섬광 · 퍼펙트 패링은 강한 섬광과 전용 효과음. 방어 중 이동·점프 가능, 구르기로 취소.');
    this.menu.text('배경음: Magic Forest — Kevin MacLeod (incompetech.com), CC BY 4.0');
    this.menu.text('광산 탐험·보스 음악: 프로젝트 자체 합성, 외부 음원 없음');
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
