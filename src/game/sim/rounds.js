import {createEnemy} from './enemies.js';
import {nextRandom} from './mineCarts.js';
import {nearestPlatformSurface} from './platforms.js';
import {ACTOR_OUTLINE_SCALES,actorVisualBounds} from '../assets/manifest.js';

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

function placementRandom(seed){
  let state=seed>>>0;
  return max=>{const roll=nextRandom(state);state=roll.state;return Math.floor(roll.value*max);};
}

function candidateXs(stage,width,preferred,randomIndex){
  const groups=new Map();
  for(let x=stage.arena.left;x+width<=stage.arena.right;x+=16){
    const distance=Math.abs(x-preferred),key=Math.round(distance*1e8);
    if(!groups.has(key))groups.set(key,{distance,points:[]});
    groups.get(key).points.push(x);
  }
  const ordered=[...groups.values()].sort((a,b)=>a.distance-b.distance);
  for(const group of ordered){
    const {points}=group;
    if(randomIndex&&points.length>1){
      for(let i=points.length-1;i>0;i--){const j=randomIndex(i+1);[points[i],points[j]]=[points[j],points[i]];}
    }else points.sort((a,b)=>a-b);
  }
  return ordered.flatMap(group=>group.points);
}

function enemySpawnCandidates(stage,template,preferredX,player,playerVisual,boss,id,platformProfiles=[],randomIndex=null){
  const probe=createEnemy({...template,id,x:preferredX});
  const forestBoarFloorOnly=stage.id==='forest-1'&&template.kind==='boar',candidates=[];
  for(const x of candidateXs(stage,probe.w,preferredX,randomIndex)){
    const supportSolids=forestBoarFloorOnly?[stage.solids[0]]:stage.solids;
    const supports=supportSolids.filter(s=>s.x<x+probe.w&&s.x+s.w>x);
    const canUseProfiles=!forestBoarFloorOnly&&['soldier','boar','golem','insect'].includes(template.kind);
    const profileSurface=canUseProfiles?nearestPlatformSurface(platformProfiles,x+probe.w/2):null;
    const ys=[template.y,...supports.map(s=>s.y-probe.h),...(profileSurface?[profileSurface.y-probe.h]:[])];
    for(const y of [...new Set(ys)]){
      const enemy={...probe,x,y};
      if(x<stage.arena.left||x+enemy.w>stage.arena.right||y<stage.arena.top||y+enemy.h>stage.arena.bottom)continue;
      const onRectangle=supports.some(s=>s.y===y+enemy.h);
      const onProfile=canUseProfiles&&nearestPlatformSurface(platformProfiles,x+enemy.w/2,y+enemy.h)?.y===y+enemy.h;
      if(template.kind!=='bat'&&!onRectangle&&!onProfile)continue;
      if(supports.some(s=>overlaps(enemy,s)))continue;
      if(player&&overlaps(enemy,player))continue;
      if(boss&&overlaps(enemy,boss))continue;
      if(playerVisual&&overlaps(actorVisualBounds(enemy,enemy.kind,ACTOR_OUTLINE_SCALES.enemy),playerVisual))continue;
      candidates.push(enemy);
    }
  }
  return candidates;
}

/**
 * Create one deterministic encounter. Normal rounds choose each type independently;
 * rounds 7 and 8 use each stage template once.
 */
export function createRoundEnemies(stage,round,randomState,{player=null,boss=null,platformProfiles=stage.platformProfiles??[]}={}){
  const count=roundEnemyCount(round),templates=stage.enemies;
  if(!Array.isArray(templates)||templates.length!==3)throw new TypeError('Stage must provide three enemy templates');
  let rngState=randomState>>>0;
  const chosen=[];
  if(round===7||round===8)chosen.push(...templates);
  else for(let i=0;i<count;i++){
    const roll=nextRandom(rngState);rngState=roll.state;
    chosen.push(templates[Math.floor(roll.value*templates.length)]);
  }
  const specs=[];
  for(let i=0;i<chosen.length;i++){
    const template=chosen[i];
    const preferred=round===7||round===8
      ?template.x
      :stage.arena.left+32+(i+0.5)*(stage.arena.right-stage.arena.left-64)/Math.max(1,count);
    const id=`round-${round}-enemy-${i+1}-${template.kind}`;
    specs.push({template,preferred,id});
  }
  const playerVisual=player?actorVisualBounds(player,'hero-directions',ACTOR_OUTLINE_SCALES.player):null;
  const placementIndex=placementRandom(((randomState>>>0)^Math.imul(round,0x9e3779b9))>>>0);
  for(let attempt=0;attempt<64;attempt++){
    const placed=[];
    for(const {template,preferred,id} of specs){
      const options=enemySpawnCandidates(stage,template,preferred,player,playerVisual,boss,id,platformProfiles,placementIndex);
      const enemy=options.find(candidate=>placed.every(other=>!overlaps(candidate,other)));
      if(!enemy)break;
      placed.push(enemy);
    }
    if(placed.length===specs.length)return {enemies:placed,rngState};
  }

  const candidateSets=specs.map(({template,preferred,id})=>enemySpawnCandidates(stage,template,preferred,player,playerVisual,boss,id,platformProfiles));
  const placed=new Array(specs.length);
  function search(index){
    if(index===specs.length)return true;
    for(const candidate of candidateSets[index]){
      if(placed.slice(0,index).some(other=>overlaps(candidate,other)))continue;
      placed[index]=candidate;
      if(search(index+1))return true;
    }
    placed[index]=undefined;
    return false;
  }
  if(search(0))return {enemies:placed,rngState};
  throw new RangeError('No visually safe arena spawn layout is available');
}
