import test from 'node:test';
import assert from 'node:assert/strict';
import { canStartAttack, createPlayer, stepPlayer } from '../src/game/sim/player.js';
import { attackIndicatorState } from '../src/game/render/attackIndicator.js';

const initial=()=>({ready:null,flashUntil:0,lastTick:null});
const player=mode=>({...createPlayer(),mode,attackTick:9,rollTicks:9,hurtTicks:6});
test('attack readiness matches actionable player modes',()=>{
  for(const mode of ['idle','run','jump','fall']) assert.equal(canStartAttack(player(mode)),true,mode);
  for(const mode of ['attack','roll','dive','hurt','dead']) assert.equal(canStartAttack(player(mode)),false,mode);
});
test('unavailable modes show progress and ready transition flashes for eight ticks',()=>{
  let memory=initial();let result=attackIndicatorState(player('idle'),10,true,memory);assert.equal(result.visible,false);memory=result.memory;
  for(const [mode,progress] of [['attack',9/19],['roll',.5],['dive',0],['hurt',.5]]){
    result=attackIndicatorState(player(mode),11,true,memory);assert.equal(result.visible,true);assert.equal(result.progress,progress);assert.equal(result.flash,false);memory=result.memory;
  }
  result=attackIndicatorState(player('idle'),12,true,memory);assert.equal(result.flash,true);assert.equal(result.progress,1);memory=result.memory;
  result=attackIndicatorState(player('idle'),12,true,memory);assert.equal(result.memory.flashUntil,20);memory=result.memory;
  result=attackIndicatorState(player('idle'),19,true,memory);assert.equal(result.flash,true);memory=result.memory;
  result=attackIndicatorState(player('idle'),20,true,memory);assert.equal(result.visible,false);
});
test('pause, death and clock resets do not create spurious readiness flashes',()=>{
  let result=attackIndicatorState(player('attack'),100,true,initial());
  result=attackIndicatorState(player('attack'),100,false,result.memory);assert.equal(result.visible,false);
  result=attackIndicatorState(player('idle'),100,true,result.memory);assert.equal(result.flash,false);
  result=attackIndicatorState(player('attack'),110,true,result.memory);
  result=attackIndicatorState(player('dead'),111,false,result.memory);assert.equal(result.visible,false);
  result=attackIndicatorState(player('idle'),112,true,result.memory);assert.equal(result.flash,false);
  result=attackIndicatorState(player('attack'),200,true,result.memory);
  result=attackIndicatorState(player('idle'),50,true,result.memory);assert.equal(result.flash,false);
});
test('attack ending tick discards input and hurt ending tick accepts it',()=>{
  const floor=[{x:-1000,y:304,w:2000,h:56}],input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:true,rollPressed:false,divePressed:false,aimX:500,aimY:290};
  let p={...createPlayer(),grounded:true,mode:'attack',attackTick:18};let result=stepPlayer(p,input,floor);
  assert.equal(result.events.some(e=>e.type==='swing'),false);assert.equal(result.player.mode,'idle');
  result=stepPlayer(result.player,input,floor);assert.equal(result.events.some(e=>e.type==='swing'),true);
  p={...createPlayer(),grounded:true,mode:'hurt',hurtTicks:1};result=stepPlayer(p,input,floor);assert.equal(result.events.some(e=>e.type==='swing'),true);
});
