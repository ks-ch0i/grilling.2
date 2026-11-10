import test from 'node:test';import assert from 'node:assert/strict';
import {getWormIntroTimeline,WORM_INTRO_TICKS} from '../src/game/sim/wormIntro.js';
import {createPracticeRun} from '../src/game/dev/roundSelector.js';
import {snapshotStageRun,restoreStageRun,stepStage} from '../src/game/sim/stage.js';
import {MINE_STAGE as stage} from '../src/game/content/mineStage.js';
import {EVENT_SFX} from '../src/game/audio/eventSounds.js';
const input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:12000,aimY:290};
test('four-second timeline hides the body until blackout ends and has exact stage boundaries',()=>{
 for(const [remaining,phase,show] of [[240,'flicker',false],[145,'flicker',false],[144,'burst',false],[121,'burst',false],[120,'blackout',false],[97,'blackout',false],[96,'reveal',true],[1,'reveal',true],[0,'done',true]]){
  const t=getWormIntroTimeline(remaining);assert.equal(t.phase,phase);assert.equal(t.showBody,show);assert.equal(t.showBossHud,show);assert.equal(t.elapsedTicks,240-remaining);
  if(phase==='blackout')assert.equal(t.blackoutAlpha,1);
 }
 assert.equal(getWormIntroTimeline(96).blackoutAlpha,1);assert.equal(getWormIntroTimeline(84).blackoutAlpha,0);
 for(const bad of [-1,241,NaN,1.5])assert.throws(()=>getWormIntroTimeline(bad),RangeError);
});
test('practice intro freezes exactly 240 ticks and emits one roar at floor burst rather than creation',()=>{
 let run=createPracticeRun('mine-worm',{seed:5});const position={x:run.player.x,y:run.player.y,hp:run.player.hp},roars=[];
 assert.equal(run.boss.stateTicks,WORM_INTRO_TICKS);assert.equal(EVENT_SFX['boss:worm-intro'],undefined);
 for(let tick=1;tick<=240;tick++){
  const next=stepStage(run,{...input,move:1,jumpPressed:true,jumpHeld:true},stage);run=next.run;
  assert.deepEqual({x:run.player.x,y:run.player.y,hp:run.player.hp},position);
  for(const e of next.events)if(EVENT_SFX[e.type]==='wormEmergence')roars.push(tick);
  assert.equal(run.bossSequence,tick<240?'worm-intro':'worm');
 }
 assert.deepEqual(roars,[96]);assert.equal(run.boss.state,'windup');assert.equal(run.boss.hp,18);
});
test('intro snapshots preserve remaining time and do not replay already-passed burst audio',()=>{
 for(const remaining of [240,180,145,144,121,120,97,96,45,1]){
  const run=createPracticeRun('mine-worm',{seed:7});run.boss.stateTicks=remaining;
  const restored=restoreStageRun(stage,JSON.parse(JSON.stringify(snapshotStageRun(run))));assert.equal(restored.boss.stateTicks,remaining);
  assert.deepEqual(stepStage(restored,input,stage),stepStage(run,input,stage));assert.deepEqual(getWormIntroTimeline(restored.boss.stateTicks),getWormIntroTimeline(remaining));
  let r=restored,count=0;while(r.bossSequence==='worm-intro'){const next=stepStage(r,input,stage);r=next.run;count+=next.events.filter(e=>e.type==='boss:worm-burst').length;}
  assert.equal(count,remaining>144?1:0,`remaining ${remaining}`);
 }
 for(const remaining of [0,241]){const run=createPracticeRun('mine-worm',{seed:3});run.boss.stateTicks=remaining;assert.throws(()=>restoreStageRun(stage,snapshotStageRun(run)),TypeError);}
});
