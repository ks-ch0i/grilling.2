import test from 'node:test';import assert from 'node:assert/strict';import {AudioManager,SFX} from '../src/game/audio/AudioManager.js';
function fixture(){let now=1,plays=0,pauses=0,closed=0,listeners=new Set(),voices=[];
 const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
 const ctx={state:'suspended',currentTime:0,destination:{},resume(){this.state='running';return Promise.resolve();},close(){closed++;},createOscillator(){const o={frequency:param,connect(){},disconnect(){},start(){},stop(){},type:'',onended:null};voices.push(o);return o;},createGain(){return{gain:param,connect(){},disconnect(){}};}};
 const music={paused:true,currentTime:12,volume:0,loop:false,play(){plays++;this.paused=false;return Promise.resolve();},pause(){pauses++;this.paused=true;},addEventListener(_n,f){listeners.add(f);},removeEventListener(_n,f){listeners.delete(f);}};
 const errors=[];const a=new AudioManager({settings:{musicVolume:.5,sfxVolume:.7},createContext:()=>ctx,createMusic:()=>music,now:()=>now,onError:e=>errors.push(e)});
 return {a,ctx,music,voices,errors,advance:n=>now+=n,stats:()=>({plays,pauses,closed,listeners:listeners.size})};}
test('unlock, sound throttling, mute, pause/resume and cleanup',async()=>{
 const f=fixture();assert.equal(f.a.playSfx('jump'),false);assert.equal(f.a.playMusic('forest'),false);await f.a.unlock();assert.equal(f.stats().listeners,1);
 assert.equal(f.a.playSfx('jump'),true);assert.equal(f.a.playSfx('jump'),false);f.advance(.2);assert.equal(f.a.playSfx('jump'),true);
 f.a.setVolumes({musicVolume:0,sfxVolume:0});assert.equal(f.music.volume,0);assert.equal(f.a.playSfx('hit'),false);
 f.a.setVolumes({musicVolume:.4,sfxVolume:.5});assert.equal(f.a.playMusic('forest'),true);assert.equal(f.a.playMusic('boss'),true);assert.equal(f.stats().plays,1);
 f.a.pauseMusic();assert.equal(f.a.playSfx('roll'),false);f.a.resumeMusic();assert.equal(f.stats().plays,2);assert.equal(f.music.currentTime,12);f.a.dispose();assert.equal(f.stats().closed,1);assert.equal(f.stats().listeners,0);
});
test('every promised sound has a bounded, reproducible synthesis recipe',()=>{for(const id of ['step','jump','swing','hit','roll','dive','hurt','heal','enemyDeath','bossIntro','bossPhase','bossDeath','victory']){assert.ok(SFX[id].duration>0&&SFX[id].duration<=1);assert.ok(SFX[id].from>0&&SFX[id].to>0&&SFX[id].interval>0);}});
test('failed audio unlock is reported instead of throwing',async()=>{const errors=[];const a=new AudioManager({createContext:()=>{throw Error('blocked')},onError:e=>errors.push(e)});assert.equal(await a.unlock(),false);assert.equal(errors.length,1);});
