import {getStage} from '../content/stages.js';
import {createStageRun} from '../sim/stage.js';
import {createMineBoss} from '../sim/mineBoss.js';

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
  if(targetId.endsWith('-boss')||targetId==='mine-machine'||targetId==='mine-worm'){
    run.player.x=stage.arena.left+32;run.player.y=stage.spawn.y;run.player.grounded=true;
  }
  if(targetId==='mine-worm'){
    run.arenaLocked=true;run.bossSequence='worm-intro';
    run.boss=createMineBoss('worm',{x:(stage.arena.left+stage.arena.right)/2-48,y:stage.arena.bottom-64});
    run.boss.state='intro';run.boss.stateTicks=180;
    run.bossDrop={rolled:true,spawned:false,consumed:false,x:0,y:0};
  }
  return run;
}
