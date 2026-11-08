import test from 'node:test';import assert from 'node:assert/strict';import {AudioManager,SFX} from '../src/game/audio/AudioManager.js';
function fixture(){let now=1,plays=0,pauses=0,closed=0,recoveries=0,listeners=new Set(),voices=[];
 const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
 const ctx={state:'suspended',currentTime:0,destination:{},resume(){this.state='running';return Promise.resolve();},close(){closed++;},createOscillator(){const o={frequency:param,connect(){},disconnect(){},start(){},stop(){},type:'',onended:null};voices.push(o);return o;},createGain(){return{gain:param,connect(){},disconnect(){}};}};
 const music={paused:true,currentTime:12,volume:0,loop:false,play(){plays++;this.paused=false;return Promise.resolve();},pause(){pauses++;this.paused=true;},addEventListener(_n,f){listeners.add(f);},removeEventListener(_n,f){listeners.delete(f);}};
 const errors=[];const a=new AudioManager({settings:{musicVolume:.5,sfxVolume:.7},createContext:()=>ctx,createMusic:()=>music,now:()=>now,onError:e=>errors.push(e),onRecovered:()=>recoveries++});
 return {a,ctx,music,voices,errors,advance:n=>now+=n,stats:()=>({plays,pauses,closed,recoveries,listeners:listeners.size})};}
test('unlock, sound throttling, mute, pause/resume and cleanup',async()=>{
 const f=fixture();assert.equal(f.a.playSfx('jump'),false);assert.equal(f.a.playMusic('forest'),false);await f.a.unlock();assert.equal(f.stats().listeners,1);
 assert.equal(f.a.playSfx('jump'),true);assert.equal(f.a.playSfx('jump'),false);f.advance(.2);assert.equal(f.a.playSfx('jump'),true);
 f.a.setVolumes({musicVolume:0,sfxVolume:0});assert.equal(f.music.volume,0);assert.equal(f.a.playSfx('hit'),false);
 f.a.setVolumes({musicVolume:.4,sfxVolume:.5});assert.equal(f.a.playMusic('forest'),true);await Promise.resolve();assert.equal(f.stats().recoveries,1);assert.equal(f.a.playMusic('boss'),true);assert.equal(f.stats().plays,1);assert.equal(f.stats().recoveries,2);
 f.music.currentTime=12;f.a.pauseMusic();assert.equal(f.a.playSfx('roll'),false);f.a.resumeMusic();assert.equal(f.stats().plays,2);assert.equal(f.music.currentTime,12);f.a.dispose();assert.equal(f.stats().closed,1);assert.equal(f.stats().listeners,0);
});
test('mine music changes tracks and the same boss track keeps playing through both bosses',async()=>{
 const f=fixture();await f.a.unlock();assert.equal(f.a.playMusic('mine'),true);assert.match(f.music.src,/mine-exploration/);f.music.currentTime=9;
 assert.equal(f.a.playMusic('mine-boss'),true);assert.match(f.music.src,/mine-boss/);assert.equal(f.music.currentTime,0);f.music.currentTime=7;const plays=f.stats().plays;
 assert.equal(f.a.playMusic('mine-boss'),true);assert.equal(f.stats().plays,plays);assert.equal(f.music.currentTime,7);f.a.pauseMusic();f.a.resumeMusic();assert.equal(f.music.currentTime,7);
});
test('every promised sound has a bounded, reproducible synthesis recipe',()=>{for(const id of ['step','jump','swing','hit','roll','dive','hurt','heal','enemyDeath','bossIntro','bossPhase','bossDeath','victory','cartWarning','acid','machine','wormEmergence']){assert.ok(SFX[id].duration>0&&SFX[id].duration<=1);assert.ok(SFX[id].from>0&&SFX[id].to>0&&SFX[id].interval>0);}});
test('boss phase cue uses the short descending roar recipe',()=>{assert.deepEqual(SFX.bossPhase,{from:220,to:70,duration:.55,type:'sawtooth',interval:.7});});
test('failed audio unlock is reported instead of throwing',async()=>{const errors=[];let recoveries=0;const a=new AudioManager({createContext:()=>{throw Error('blocked')},onError:e=>errors.push(e),onRecovered:()=>recoveries++});assert.equal(await a.unlock(),false);assert.equal(errors.length,1);assert.equal(recoveries,0);});
