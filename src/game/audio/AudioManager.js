import {getAppStore} from '../storage/appStore.js';
export const SFX=Object.freeze({
 step:{from:110,to:65,duration:.055,type:'triangle',interval:.12},jump:{from:290,to:540,duration:.14,type:'square',interval:.08},swing:{from:600,to:180,duration:.11,type:'sawtooth',interval:.10},
 hit:{from:170,to:70,duration:.11,type:'square',interval:.10},roll:{from:180,to:90,duration:.16,type:'triangle',interval:.15},dive:{from:480,to:80,duration:.19,type:'sawtooth',interval:.15},
 hurt:{from:250,to:90,duration:.22,type:'square',interval:.15},heal:{from:420,to:760,duration:.22,type:'sine',interval:.15},enemyDeath:{from:240,to:65,duration:.28,type:'triangle',interval:.16},
 bossIntro:{from:75,to:155,duration:.55,type:'sawtooth',interval:.5},bossPhase:{from:220,to:70,duration:.55,type:'sawtooth',interval:.7},bossDeath:{from:150,to:42,duration:.65,type:'sawtooth',interval:.6},victory:{from:440,to:880,duration:.5,type:'triangle',interval:.5},
 cartWarning:{from:650,to:430,duration:.25,type:'square',interval:.4},acid:{from:320,to:130,duration:.18,type:'sawtooth',interval:.15},machine:{from:110,to:240,duration:.32,type:'sawtooth',interval:.3},wormEmergence:{from:180,to:45,duration:.75,type:'sawtooth',interval:.7}
});
export const MUSIC=Object.freeze({forest:'/assets/audio/music/magic-forest.mp3','forest-boss':'/assets/audio/music/magic-forest.mp3',boss:'/assets/audio/music/magic-forest.mp3',mine:'/assets/audio/music/mine-exploration.wav','mine-boss':'/assets/audio/music/mine-boss.wav'});
export class AudioManager {
 constructor({settings={musicVolume:.5,sfxVolume:.7},createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),createMusic=()=>new Audio(),now=()=>performance.now()/1000,onError=()=>{},onRecovered=()=>{}}={}){
  this.settings={...settings};this.createContext=createContext;this.createMusic=createMusic;this.now=now;this.onError=onError;this.onRecovered=onRecovered;this.context=null;this.music=null;this.unlocked=false;this.paused=false;this.last=new Map();this.voices=new Set();this.musicName=null;this.activeUrl=null;
  this.onMusicError=()=>this.onError('배경음을 불러오지 못했습니다. 게임은 계속할 수 있습니다.');
 }
 unlock(){
  try{
   this.context??=this.createContext();if(!this.music){this.music=this.createMusic();this.music.addEventListener?.('error',this.onMusicError);}this.music.loop=true;this.music.volume=this.settings.musicVolume;this.unlocked=true;
   const resumed=this.context.state==='suspended'?this.context.resume():undefined;
   return Promise.resolve(resumed).catch(()=>{this.unlocked=false;this.onError('오디오를 시작하지 못했습니다.');return false;});
  }catch{this.unlocked=false;this.onError('오디오를 사용할 수 없습니다.');return Promise.resolve(false);}
 }
 setVolumes(settings){this.settings={...this.settings,...settings};if(this.music)this.music.volume=this.settings.musicVolume;}
 playSfx(id){
  const spec=SFX[id],now=this.now();if(!spec||!this.unlocked||!this.context||this.settings.sfxVolume<=0||this.paused||this.voices.size>=12)return false;
  if(this.last.has(id)&&now-this.last.get(id)<spec.interval)return false;this.last.set(id,now);
  try{const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;osc.type=spec.type;osc.frequency.setValueAtTime(spec.from,t);osc.frequency.exponentialRampToValueAtTime(spec.to,t+spec.duration);gain.gain.setValueAtTime(Math.max(.0001,this.settings.sfxVolume*.09),t);gain.gain.exponentialRampToValueAtTime(.0001,t+spec.duration);osc.connect(gain);gain.connect(ctx.destination);this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect();};osc.start(t);osc.stop(t+spec.duration);return true;}catch{this.onError('효과음을 재생하지 못했습니다.');return false;}
 }
 playMusic(name){
  if(!MUSIC[name])return false;this.musicName=name;if(!this.unlocked||!this.music||this.paused)return false;
  if(this.activeUrl!==MUSIC[name]){if(this.activeUrl)this.music.pause();this.music.src=MUSIC[name];this.music.currentTime=0;this.activeUrl=MUSIC[name];}
  if(!this.music.paused){this.onRecovered();return true;}
  try{const result=this.music.play();if(result?.then)result.then(()=>this.onRecovered()).catch(()=>this.onError('배경음을 재생하지 못했습니다. 게임은 계속할 수 있습니다.'));else this.onRecovered();return true;}catch{this.onError('배경음을 재생하지 못했습니다. 게임은 계속할 수 있습니다.');return false;}
 }
 pauseMusic(){this.paused=true;this.music?.pause();}
 resumeMusic(){this.paused=false;if(this.musicName)this.playMusic(this.musicName);}
 dispose(){this.music?.pause();this.music?.removeEventListener?.('error',this.onMusicError);for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();this.context?.close?.();this.unlocked=false;this.music=null;this.context=null;this.activeUrl=null;}
}
let instance;
export function getAudioManager(){
 if(!instance)instance=new AudioManager({settings:getAppStore().getSave().settings,onRecovered:()=>document.querySelector('.audio-warning')?.remove(),onError:message=>{
  let node=document.querySelector('.audio-warning');if(!node){node=document.createElement('div');node.className='audio-warning';node.setAttribute('role','status');document.getElementById('game').append(node);}node.textContent=message;
 }});
 return instance;
}

export function disposeAudioManager(){instance?.dispose();instance=undefined;}
