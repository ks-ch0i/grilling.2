import {getStage} from '../content/stages.js';
import {createStageRun} from '../sim/stage.js';
import {createBoss} from '../sim/boss.js';
import {createMineBoss} from '../sim/mineBoss.js';
import {createRoundEnemies} from '../sim/rounds.js';
import {WORM_INTRO_TICKS} from '../sim/wormIntro.js';

// Client-side development convenience only. Production access requires a
// separately authenticated and authorized server-side implementation.
export function isRoundSelectorEnabled({development=false,enabled=true}={}){
  return development===true&&enabled===true;
}
export const ROUND_TARGETS=Object.freeze([
  {id:'forest-start',label:'숲 시작',stageId:'forest-1'},
  {id:'forest-boss',label:'숲 보스',stageId:'forest-1'},
  {id:'mine-start',label:'광산 시작',stageId:'mine-1'},
  {id:'mine-machine',label:'광산 기계 보스',stageId:'mine-1'},
  {id:'mine-worm',label:'광산 거대 벌레',stageId:'mine-1'}
].map(Object.freeze));
export function createPracticeRun(targetId,options={}){
  const target=ROUND_TARGETS.find(entry=>entry.id===targetId);
  if(!target)throw new TypeError('Unknown practice round');
  const stage=getStage(target.stageId),run=createStageRun(stage,{},options);
  const round=targetId==='mine-worm'?8:targetId.endsWith('-boss')||targetId==='mine-machine'?5:1;
  if(round>1){
    run.round=round;run.player.x=stage.arena.left+32;run.player.y=stage.spawn.y;run.player.grounded=true;
    run.boss=targetId==='mine-worm'
      ?createMineBoss('worm',{x:(stage.arena.left+stage.arena.right)/2-48,y:stage.arena.bottom-64})
      :target.stageId==='mine-1'?createMineBoss('machine',stage.boss):createBoss(stage.boss);
    run.boss.state='intro';run.boss.stateTicks=targetId==='mine-worm'?WORM_INTRO_TICKS:90;
    run.bossSequence=targetId==='mine-worm'?'worm-intro':target.stageId==='mine-1'?'machine':'none';
    const encounter=createRoundEnemies(stage,round,run.rngState,{player:run.player,boss:run.boss});
    run.enemies=encounter.enemies;run.rngState=encounter.rngState;
  }
  return run;
}
