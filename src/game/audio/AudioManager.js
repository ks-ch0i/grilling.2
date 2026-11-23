import {getAppStore} from '../storage/appStore.js';

export const SFX=Object.freeze({
  step:{from:110,to:65,duration:.055,type:'triangle',interval:.12},jump:{from:290,to:540,duration:.14,type:'square',interval:.08},swing:{from:600,to:180,duration:.11,type:'sawtooth',interval:.10},
  hit:{from:170,to:70,duration:.11,type:'square',interval:.10},roll:{from:180,to:90,duration:.16,type:'triangle',interval:.15},dive:{from:480,to:80,duration:.19,type:'sawtooth',interval:.15},
  hurt:{from:250,to:90,duration:.22,type:'square',interval:.15},heal:{from:420,to:760,duration:.22,type:'sine',interval:.15},enemyDeath:{from:240,to:65,duration:.28,type:'triangle',interval:.16},
  bossIntro:{from:75,to:155,duration:.55,type:'sawtooth',interval:.5},bossPhase:{from:220,to:70,duration:.55,type:'sawtooth',interval:.7},bossDeath:{from:150,to:42,duration:.65,type:'sawtooth',interval:.6},victory:{from:440,to:880,duration:.5,type:'triangle',interval:.5},
  cartWarning:{from:650,to:430,duration:.25,type:'square',interval:.4},acid:{from:320,to:130,duration:.18,type:'sawtooth',interval:.15},machine:{from:110,to:240,duration:.32,type:'sawtooth',interval:.3},wormEmergence:{from:180,to:45,duration:.75,type:'sawtooth',interval:.7},
  shieldClang:{from:520,to:165,duration:.2,type:'square',interval:.12},parryDeflect:{from:980,to:420,duration:.16,type:'triangle',interval:.12}
});

export const MUSIC=Object.freeze({
  title:'/assets/audio/music/whispers-in-the-fog.ogg',
  forest:'/assets/audio/music/magic-forest.mp3',
  'forest-boss':'/assets/audio/music/magic-forest.mp3',
  boss:'/assets/audio/music/magic-forest.mp3',
  mine:'/assets/audio/music/mine-exploration.wav',
  'mine-boss':'/assets/audio/music/mine-boss.wav'
});

const clampVolume=value=>Math.max(0,Math.min(1,Number(value)||0));
const isAutoplayBlock=error=>error?.name==='NotAllowedError';
const isInterruptedPlay=error=>error?.name==='AbortError';

export class AudioManager {
  constructor({settings={musicVolume:.5,sfxVolume:.7},createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),createMusic=()=>new Audio(),now=()=>performance.now()/1000,onError=()=>{},onRecovered=()=>{}}={}){
    this.settings={...settings};
    this.createContext=createContext;
    this.createMusic=createMusic;
    this.now=now;
    this.onError=onError;
    this.onRecovered=onRecovered;
    this.context=null;
    this.channels=[];
    this.music=null;
    this.unlocked=false;
    this.sfxSuppressed=false;
    this.musicPaused=false;
    this.last=new Map();
    this.voices=new Set();
    this.musicName=null;
    this.activeUrl=null;
    this.activeChannel=null;
    this.incomingChannel=null;
    this.transition=null;
    this.suspendedTransition=null;
    this.pendingAutoplay=false;
    this.disposed=false;
    this.recoveryListeners=new Set();
    this.visibilityDocument=typeof document!=='undefined'?document:null;
    this.pageInactive=Boolean(this.visibilityDocument?.hidden);
    this.onVisibilityChange=()=>{
      if(this.visibilityDocument?.hidden)this.suspendForHiddenPage();
      else this.resumeForVisiblePage();
    };
    this.visibilityDocument?.addEventListener('visibilitychange',this.onVisibilityChange);
    this.onMusicError=()=>this.onError('배경음을 불러오지 못했습니다. 게임은 계속할 수 있습니다.');
  }

  createMusicChannels(){
    if(this.channels.length===2)return true;
    try{
      while(this.channels.length<2){
        const channel={audio:this.createMusic(),url:null,level:0,playToken:0,requesting:false,pendingPlay:null};
        if(!channel.audio)throw new Error('Music channel could not be created');
        channel.audio.loop=true;
        channel.audio.preload='auto';
        channel.audio.volume=0;
        channel.onError=()=>{
          if(channel.url&&(channel===this.activeChannel||channel===this.incomingChannel||channel.level>0))this.onMusicError();
        };
        channel.audio.addEventListener?.('error',channel.onError);
        this.channels.push(channel);
      }
      return true;
    }catch{
      for(const channel of this.channels)channel.audio.removeEventListener?.('error',channel.onError);
      this.channels=[];
      this.onError('오디오를 사용할 수 없습니다.');
      return false;
    }
  }

  unlock(){
    if(this.disposed||!this.createMusicChannels())return Promise.resolve(false);
    try{
      this.context??=this.createContext();
    }catch{
      this.onError('오디오를 사용할 수 없습니다.');
      return Promise.resolve(false);
    }
    if(this.context.state!=='suspended'){
      this.unlocked=true;
      return Promise.resolve(true);
    }
    let resumed;
    try{resumed=this.context.resume();}
    catch(error){return this.handleUnlockFailure(error);}
    return Promise.resolve(resumed).then(()=>{
      this.unlocked=true;
      return true;
    }).catch(error=>this.handleUnlockFailure(error));
  }

  handleUnlockFailure(error){
    this.unlocked=false;
    if(!isAutoplayBlock(error))this.onError('오디오를 시작하지 못했습니다.');
    return false;
  }

  setVolumes(settings){
    this.settings={...this.settings,...settings};
    if(Object.hasOwn(settings??{},'musicVolume'))this.settings.musicVolume=clampVolume(settings.musicVolume);
    if(Object.hasOwn(settings??{},'sfxVolume'))this.settings.sfxVolume=clampVolume(settings.sfxVolume);
    this.applyMusicVolumes();
  }

  setSfxSuppressed(suppressed){this.sfxSuppressed=Boolean(suppressed);}

  applyMusicVolumes(){
    for(const channel of this.channels)channel.audio.volume=clampVolume(this.settings.musicVolume)*channel.level;
  }

  playSfx(id){
    const spec=SFX[id],now=this.now();
    if(!spec||!this.unlocked||!this.context||this.context.state==='suspended'||this.settings.sfxVolume<=0||this.sfxSuppressed||this.voices.size>=12)return false;
    if(this.last.has(id)&&now-this.last.get(id)<spec.interval)return false;
    this.last.set(id,now);
    try{
      const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;
      osc.type=spec.type;osc.frequency.setValueAtTime(spec.from,t);osc.frequency.exponentialRampToValueAtTime(spec.to,t+spec.duration);
      gain.gain.setValueAtTime(Math.max(.0001,this.settings.sfxVolume*.09),t);gain.gain.exponentialRampToValueAtTime(.0001,t+spec.duration);
      osc.connect(gain);gain.connect(ctx.destination);this.voices.add(osc);
      osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect();};
      osc.start(t);osc.stop(t+spec.duration);return true;
    }catch{this.onError('효과음을 재생하지 못했습니다.');return false;}
  }

  playMusic(name,{fadeMs=1000}={}){
    const url=MUSIC[name];
    if(!url||this.disposed||!this.createMusicChannels())return false;
    const duration=Number.isFinite(fadeMs)?Math.max(0,fadeMs):1000;
    this.musicName=name;
    this.requestedFadeMs=duration;
    this.musicPaused=false;
    this.activeUrl=url;

    const existing=this.channels.find(channel=>channel.url===url);
    if(existing===this.activeChannel&&!existing.audio.paused)return true;
    if(existing===this.incomingChannel&&this.transition&&!existing.audio.paused)return true;

    this.sampleAndCancelTransition();
    const target=existing??this.channels.find(channel=>channel!==this.activeChannel)??this.channels[0];
    const outgoing=this.channels.find(channel=>channel!==target&&channel.url&&channel.level>0)??null;
    this.activeChannel=target;
    this.music=target.audio;
    this.incomingChannel=target;

    if(target.url!==url){
      target.playToken++;
      target.requesting=false;
      target.pendingPlay=null;
      target.audio.pause();
      target.audio.src=url;
      target.audio.currentTime=0;
      target.url=url;
      target.level=0;
      this.applyMusicVolumes();
    }

    if(this.pageInactive){
      this.suspendedTransition={target,outgoing,duration};
      return true;
    }
    if(!target.audio.paused){
      this.beginCrossfade(target,outgoing,duration);
      return true;
    }
    this.requestPlayback(target,()=>this.beginCrossfade(target,outgoing,duration));
    return true;
  }

  retryPendingMusicFromGesture(){
    if(!this.musicName)return false;
    const channel=this.channels.find(candidate=>candidate.url===MUSIC[this.musicName]);
    if(channel?.requesting){
      channel.playToken++;
      channel.requesting=false;
      channel.pendingPlay=null;
      channel.audio.pause();
    }
    return this.playMusic(this.musicName,{fadeMs:this.requestedFadeMs??1000});
  }

  requestPlayback(channel,onSuccess){
    if(channel.requesting)return channel.pendingPlay??Promise.resolve(true);
    const token=++channel.playToken;
    let result;
    try{result=channel.audio.play();}
    catch(error){this.handlePlaybackFailure(channel,token,error);return Promise.resolve(false);}
    if(!result||typeof result.then!=='function'){
      channel.requesting=false;
      this.markRecovered();
      onSuccess?.();
      return Promise.resolve(true);
    }
    channel.requesting=true;
    const pending=Promise.resolve(result).then(()=>{
      if(token!==channel.playToken||this.disposed)return false;
      channel.requesting=false;channel.pendingPlay=null;
      this.markRecovered();
      if(!this.pageInactive&&!this.musicPaused)onSuccess?.();
      return true;
    }).catch(error=>{
      this.handlePlaybackFailure(channel,token,error);
      return false;
    });
    channel.pendingPlay=pending;
    return pending;
  }

  handlePlaybackFailure(channel,token,error){
    if(token!==channel.playToken||this.disposed)return;
    channel.requesting=false;channel.pendingPlay=null;
    if(isAutoplayBlock(error)){this.pendingAutoplay=true;return;}
    if(isInterruptedPlay(error))return;
    this.onError('배경음을 재생하지 못했습니다. 게임은 계속할 수 있습니다.');
  }

  markRecovered(){
    this.unlocked=true;
    this.pendingAutoplay=false;
    this.onRecovered();
    for(const listener of [...this.recoveryListeners])listener();
  }

  onPlaybackRecovered(listener){
    if(typeof listener!=='function')throw new TypeError('Recovery listener must be a function');
    this.recoveryListeners.add(listener);
    return ()=>this.recoveryListeners.delete(listener);
  }

  beginCrossfade(target,outgoing,duration){
    if(this.disposed||this.pageInactive||this.musicPaused)return;
    const previous=this.transition;
    if(previous){this.cancelScheduledFrame(previous);this.transition=null;}
    this.suspendedTransition=null;
    this.incomingChannel=target;
    this.activeChannel=target;
    this.activeUrl=target.url;
    this.music=target.audio;
    const currentOutgoing=outgoing&&outgoing!==target&&outgoing.url?outgoing:null;
    if(duration<=0){
      target.level=1;
      this.applyMusicVolumes();
      this.finishCrossfade(target,currentOutgoing);
      return;
    }
    const transition={
      target,
      outgoing:currentOutgoing,
      duration,
      startedAt:this.now(),
      startTarget:target.level,
      startOutgoing:currentOutgoing?.level??0,
      frame:null
    };
    this.transition=transition;
    this.scheduleTransitionFrame(transition);
  }

  scheduleTransitionFrame(transition){
    const tick=()=>{
      if(this.transition!==transition||this.pageInactive||this.disposed)return;
      transition.frame=null;
      this.updateTransition(transition);
      if(this.transition===transition)this.scheduleTransitionFrame(transition);
    };
    if(typeof globalThis.requestAnimationFrame==='function')transition.frame={kind:'raf',id:globalThis.requestAnimationFrame(tick)};
    else transition.frame={kind:'timeout',id:setTimeout(tick,16)};
  }

  cancelScheduledFrame(transition){
    if(!transition?.frame)return;
    if(transition.frame.kind==='raf')globalThis.cancelAnimationFrame?.(transition.frame.id);
    else clearTimeout(transition.frame.id);
    transition.frame=null;
  }

  updateTransition(transition){
    const progress=Math.max(0,Math.min(1,((this.now()-transition.startedAt)*1000)/transition.duration));
    transition.target.level=transition.startTarget+(1-transition.startTarget)*progress;
    if(transition.outgoing)transition.outgoing.level=transition.startOutgoing*(1-progress);
    this.applyMusicVolumes();
    if(progress>=1){
      this.transition=null;
      this.finishCrossfade(transition.target,transition.outgoing);
    }
  }

  finishCrossfade(target,outgoing){
    target.level=1;
    this.incomingChannel=null;
    this.activeChannel=target;
    this.activeUrl=target.url;
    this.music=target.audio;
    if(outgoing&&outgoing!==target){
      outgoing.audio.pause();
      try{outgoing.audio.currentTime=0;}catch{}
      outgoing.level=0;
      outgoing.url=null;
      outgoing.requesting=false;
      outgoing.pendingPlay=null;
    }
    this.applyMusicVolumes();
  }

  sampleAndCancelTransition(){
    const transition=this.transition;
    if(!transition)return;
    this.updateTransition(transition);
    if(this.transition===transition){
      this.cancelScheduledFrame(transition);
      this.transition=null;
    }
  }

  pauseMusic(){
    this.musicPaused=true;
    this.sampleAndCancelTransition();
    this.suspendedTransition=null;
    for(const channel of this.channels){
      if(channel.requesting){channel.playToken++;channel.requesting=false;channel.pendingPlay=null;}
      channel.audio.pause();
    }
  }

  resumeMusic(){
    this.musicPaused=false;
    return this.musicName?this.playMusic(this.musicName):false;
  }

  suspendForHiddenPage(){
    if(this.pageInactive)return;
    this.pageInactive=true;
    const transition=this.transition;
    if(transition){
      this.updateTransition(transition);
      if(this.transition===transition){
        const elapsed=Math.max(0,(this.now()-transition.startedAt)*1000);
        this.cancelScheduledFrame(transition);
        this.transition=null;
        this.suspendedTransition={
          target:transition.target,
          outgoing:transition.outgoing,
          duration:Math.max(0,transition.duration-elapsed)
        };
      }
    }
    if(!this.suspendedTransition&&this.incomingChannel){
      const target=this.incomingChannel;
      const outgoing=this.channels.find(channel=>channel!==target&&channel.url&&channel.level>0)??null;
      if(outgoing&&target.url&&target.level<1){
        this.suspendedTransition={target,outgoing,duration:this.requestedFadeMs??1000};
      }
    }
    for(const channel of this.channels){
      if(channel.requesting){channel.playToken++;channel.requesting=false;channel.pendingPlay=null;}
      channel.audio.pause();
    }
  }

  resumeForVisiblePage(){
    if(!this.pageInactive)return;
    this.pageInactive=false;
    if(!this.unlocked||this.musicPaused)return;
    if(this.context?.state==='suspended'){
      try{Promise.resolve(this.context.resume()).catch(error=>{if(!isAutoplayBlock(error))this.onError('오디오를 시작하지 못했습니다.');});}
      catch(error){if(!isAutoplayBlock(error))this.onError('오디오를 시작하지 못했습니다.');}
    }
    const transition=this.suspendedTransition;
    const channels=transition?[transition.outgoing,transition.target].filter(channel=>channel?.url):[this.activeChannel].filter(channel=>channel?.url);
    if(!channels.length)return;
    Promise.all(channels.map(channel=>this.requestPlayback(channel))).then(results=>{
      if(this.pageInactive||this.musicPaused||results.some(success=>!success))return;
      if(transition&&this.suspendedTransition===transition){
        this.suspendedTransition=null;
        this.beginCrossfade(transition.target,transition.outgoing,transition.duration);
      }
    });
  }

  dispose(){
    if(this.disposed)return;
    this.disposed=true;
    this.visibilityDocument?.removeEventListener('visibilitychange',this.onVisibilityChange);
    if(this.transition)this.cancelScheduledFrame(this.transition);
    this.transition=null;this.suspendedTransition=null;
    for(const channel of this.channels){
      channel.playToken++;
      channel.audio.pause();
      channel.audio.removeEventListener?.('error',channel.onError);
      try{channel.audio.currentTime=0;}catch{}
    }
    for(const voice of this.voices){try{voice.stop();}catch{}}
    this.voices.clear();this.recoveryListeners.clear();
    this.context?.close?.();
    this.unlocked=false;this.channels=[];this.music=null;this.context=null;this.activeChannel=null;this.incomingChannel=null;this.activeUrl=null;
  }
}

let instance;
export function getAudioManager(){
  if(!instance)instance=new AudioManager({settings:getAppStore().getSave().settings,onRecovered:()=>document.querySelector('.audio-warning')?.remove(),onError:message=>{
    let node=document.querySelector('.audio-warning');
    if(!node){node=document.createElement('div');node.className='audio-warning';node.setAttribute('role','status');document.getElementById('game').append(node);}
    node.textContent=message;
  }});
  return instance;
}

export function disposeAudioManager(){instance?.dispose();instance=undefined;}
