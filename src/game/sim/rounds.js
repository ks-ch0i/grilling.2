import {createEnemy} from './enemies.js';
import {nextRandom} from './mineCarts.js';

export const ROUND_COUNT=8;
export const ROUND_CLEAR_TICKS=120;
const ENEMY_COUNTS=[1,2,3,4,0,6,3,3];
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

export function roundEnemyCount(round){
  if(!Number.isInteger(round)||round<1||round>ROUND_COUNT)throw new RangeError('Round must be between 1 and 8');
  return ENEMY_COUNTS[round-1];
}

export function isBossRound(stageId,round){
  if(!['forest-1','mine-1'].includes(stageId))throw new TypeError('Unknown stage');
  roundEnemyCount(round);
  return round===5||round===7||round===8;
}

function candidateXs(stage,preferred){
  const points=[];
  for(let x=stage.arena.left+32;x<=stage.arena.right-48;x+=48)points.push(x);
  return points.sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred)||a-b);
}

function spawnEnemy(stage,template,preferredX,player,boss,placed,id){
  const probe=createEnemy({...template,id,x:preferredX});
  for(const x of candidateXs(stage,preferredX)){
    const supports=stage.solids.filter(s=>s.x<x+probe.w&&s.x+s.w>x);
    const ys=template.kind==='bat'
      ?[template.y,...supports.map(s=>s.y-probe.h)]
      :[template.y,...supports.map(s=>s.y-probe.h)];
    for(const y of [...new Set(ys)]){
      const enemy={...probe,x,y};
      if(x<stage.arena.left||x+enemy.w>stage.arena.right||y<stage.arena.top||y+enemy.h>stage.arena.bottom)continue;
      if(template.kind!=='bat'&&!supports.some(s=>s.y===y+enemy.h))continue;
      if(supports.some(s=>overlaps(enemy,s)))continue;
      if(player&&overlaps(enemy,player))continue;
      if(boss&&overlaps(enemy,boss))continue;
      if(placed.some(other=>overlaps(enemy,other)))continue;
      return enemy;
    }
  }
  throw new RangeError(`No safe arena spawn is available for ${template.kind}`);
}

/**
 * Create one deterministic encounter. Normal rounds choose each type independently;
 * rounds 7 and 8 use each stage template once.
 */
export function createRoundEnemies(stage,round,randomState,{player=null,boss=null}={}){
  const count=roundEnemyCount(round),templates=stage.enemies;
  if(!Array.isArray(templates)||templates.length!==3)throw new TypeError('Stage must provide three enemy templates');
  let rngState=randomState>>>0;
  const chosen=[];
  if(round===7||round===8)chosen.push(...templates);
  else for(let i=0;i<count;i++){
    const roll=nextRandom(rngState);rngState=roll.state;
    chosen.push(templates[Math.floor(roll.value*templates.length)]);
  }
  const placed=[],enemies=[];
  for(let i=0;i<chosen.length;i++){
    const template=chosen[i];
    const preferred=round===7||round===8
      ?template.x
      :stage.arena.left+32+(i+0.5)*(stage.arena.right-stage.arena.left-64)/Math.max(1,count);
    const id=`round-${round}-enemy-${i+1}-${template.kind}`;
    const enemy=spawnEnemy(stage,template,preferred,player,boss,placed,id);
    placed.push(enemy);enemies.push(enemy);
  }
  return {enemies,rngState};
}
