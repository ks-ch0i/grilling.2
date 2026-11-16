import {validateStage} from '../content/stageValidation.js';
import {createPlayer,stepPlayer,isAttackActive} from './player.js';
import {intersects,moveAxis} from './geometry.js';
import {applyPlayerDamage,registerAttackHit,diveImpactRect} from './combat.js';
import {createEnemy,damageEnemy,enemyAttackRect,stepEnemy,stepProjectile} from './enemies.js';
import {createBoss,damageBoss,stepBoss} from './boss.js';
import {stepHazards} from './hazards.js';
import {createCartZones,stepCartZones,nextRandom} from './mineCarts.js';
import {createMineBoss,damageMineBoss,stepMineBoss,shouldDropPotion} from './mineBoss.js';
import {WORM_INTRO_TICKS,WORM_INTRO_BURST_TICK} from './wormIntro.js';
import {createRoundEnemies,isBossRound,roundEnemyCount,ROUND_COUNT,ROUND_CLEAR_TICKS} from './rounds.js';

const DEATH_TICKS=60;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const keys=(x,required,optional=[])=>object(x)&&required.every(k=>Object.hasOwn(x,k))&&Object.keys(x).every(k=>required.includes(k)||optional.includes(k));
const count=x=>Number.isSafeInteger(x)&&x>=0;
const strings=x=>Array.isArray(x)&&x.every(s=>typeof s==='string'&&s.length>0)&&new Set(x).size===x.length;
const finiteTree=x=>typeof x==='number'?Number.isFinite(x):Array.isArray(x)?x.every(finiteTree):object(x)?Object.values(x).every(finiteTree):x===null||['string','boolean'].includes(typeof x);
const sameTypes=(x,template)=>Object.entries(template).every(([k,v])=>typeof v==='number'?Number.isFinite(x[k]):typeof v==='boolean'?typeof x[k]==='boolean':typeof v==='string'?typeof x[k]==='string':true);
const rect=(r,ticks=false)=>keys(r,['x','y','w','h',...(ticks?['ticks']:[])])&&['x','y','w','h'].every(k=>Number.isFinite(r[k]))&&r.w>0&&r.h>0&&(!ticks||count(r.ticks));
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

function freshPlayer(point){const player=createPlayer(point.x,point.y);player.grounded=true;return player;}

export function stageTerrain(stage,locked){
  const {width,height}=stage.world;
  const walls=[{x:-16,y:0,w:16,h:height},{x:width,y:0,w:16,h:height},{x:0,y:-16,w:width,h:16}];
  if(locked)walls.push({x:stage.arena.left,y:stage.arena.top,w:16,h:stage.arena.bottom-stage.arena.top},{x:stage.arena.right,y:stage.arena.top,w:16,h:stage.arena.bottom-stage.arena.top});
  return [...stage.solids,...walls];
}

function safeBossX(stage,player,width,preferred){
  const candidates=[preferred,stage.arena.left+32,stage.arena.right-32-width];
  const unique=[...new Set(candidates)].filter(x=>x>=stage.arena.left&&x+width<=stage.arena.right);
  return unique.find(x=>!overlaps({x,y:stage.arena.bottom-(stage.id==='forest-1'?96:64),w:width,h:stage.id==='forest-1'?96:64},player))
    ??unique.sort((a,b)=>Math.abs((a+width/2)-(player.x+player.w/2))-Math.abs((b+width/2)-(player.x+player.w/2)))[0]
    ??preferred;
}

function bossForRound(stage,round,player){
  const active=isBossRound(stage.id,round);
  if(stage.id==='forest-1'){
    const x=active?safeBossX(stage,player,80,stage.boss.x):stage.boss.x;
    const boss=createBoss({...stage.boss,x});
    if(active){boss.state='intro';boss.stateTicks=90;}
    return {boss,bossSequence:'none'};
  }
  const x=active?safeBossX(stage,player,80,stage.boss.x):stage.boss.x;
  const boss=createMineBoss('machine',{...stage.boss,x});
  if(active){boss.state='intro';boss.stateTicks=90;}
  return {boss,bossSequence:active?'machine':'none'};
}

function startRound(run,stage,round,events=null){
  const bossState=bossForRound(stage,round,run.player);
  const bossRect=isBossRound(stage.id,round)?bossState.boss:null;
  const encounter=createRoundEnemies(stage,round,run.rngState,{player:run.player,boss:bossRect});
  run.round=round;
  run.roundClearTicks=null;
  run.player.hp=3;
  run.player.mode=run.player.grounded?'idle':'fall';
  run.player.vx=0;run.player.vy=0;run.player.attackTick=0;run.player.hitIds.clear();
  run.player.hurtTicks=0;run.player.hurtPushTicks=0;run.player.invulnerableTicks=0;
  run.enemies=encounter.enemies;
  run.rngState=encounter.rngState;
  run.projectiles=[];
  run.boss=bossState.boss;
  run.bossSequence=bossState.bossSequence;
  run.arenaLocked=false;
  run.consumedPickupIds=[];
  if(run.stageId==='mine-1'){
    run.hazards=(run.hazards??[]).filter(h=>h.kind==='cart');
    run.bossDrop={rolled:false,spawned:false,consumed:false,x:0,y:0};
  }
  events?.push({type:'round:start',round,enemyCount:encounter.enemies.length});
}

export function createStageRun(stage,data={},options={}){
  validateStage(stage);
  if(!data||typeof data!=='object'||Array.isArray(data))throw new TypeError('Invalid run data');
  if(Object.keys(data).length)return restoreStageRun(stage,data);
  const seed=(options.seed??Math.floor(Math.random()*4294967296))>>>0;
  const run={stageId:stage.id,player:freshPlayer(stage.spawn),enemies:[],projectiles:[],boss:null,arenaLocked:false,
    consumedPickupIds:[],elapsedTicks:0,deaths:0,outcome:null,deathTicks:0,round:1,roundClearTicks:null,rngState:seed,bossSequence:'none'};
  if(stage.id==='mine-1'){
    let state=seed;
    const random=()=>{const next=nextRandom(state);state=next.state;return next.value;};
    run.cartZones=createCartZones(stage,random);run.rngState=state;run.hazards=[];
    run.bossDrop={rolled:false,spawned:false,consumed:false,x:0,y:0};
  }
  startRound(run,stage,1);
  return run;
}

export function snapshotStageRun(run){
  const copy=structuredClone(run);
  copy.player.hitIds=[...copy.player.hitIds];
  for(const enemy of copy.enemies)enemy.hitIds=[...enemy.hitIds];
  return copy;
}

export function restoreStageRun(stage,snapshot){
  const s=structuredClone(snapshot),fresh=createStageRun(stage,{}, {seed:1});
  if(stage.id==='forest-1'&&object(s.boss)&&!Object.hasOwn(s.boss,'rootEffects')){
    s.boss.rootEffects=[];
    if(s.boss.attackKind==='root'&&Array.isArray(s.boss.hitboxes))s.boss.rootEffects=s.boss.hitboxes.filter(h=>rect(h,true)&&h.w===48&&h.h===48&&h.ticks>0&&h.ticks<=12).map(({x,y,w,h,ticks})=>({x,y,w,h,age:12-ticks,strike:s.boss.secondRootDelay>0?1:s.boss.phase===2&&s.boss.state==='recovery'?2:1}));
  }
  if(!keys(s,Object.keys(fresh))||s.stageId!==stage.id||!finiteTree(s)||!count(s.elapsedTicks)||!count(s.deaths)||!count(s.deathTicks)||typeof s.arenaLocked!=='boolean'||![null,'clear'].includes(s.outcome))throw new TypeError('Invalid run snapshot');
  if(!Number.isInteger(s.round)||s.round<1||s.round>ROUND_COUNT||!(s.roundClearTicks===null||Number.isSafeInteger(s.roundClearTicks)&&s.roundClearTicks>0&&s.roundClearTicks<=ROUND_CLEAR_TICKS)||!count(s.rngState)||s.rngState>0xffffffff||typeof s.bossSequence!=='string')throw new TypeError('Invalid round snapshot');
  if(s.outcome==='clear'&&s.round!==ROUND_COUNT)throw new TypeError('Only round 8 can clear a stage');

  const p=s.player,pt=snapshotStageRun(fresh).player;
  if(!keys(p,Object.keys(pt))||!sameTypes(p,pt)||!strings(p.hitIds)||!keys(p.aim,['x','y'])||!Number.isFinite(p.aim.x)||!Number.isFinite(p.aim.y)||!['idle','run','jump','fall','attack','roll','dive','hurt','dead'].includes(p.mode)||!Number.isInteger(p.hp)||p.hp<0||p.hp>3||p.w!==16||p.h!==28)throw new TypeError('Invalid player snapshot');
  for(const k of ['invulnerableTicks','rollCooldown','rollTicks','diveCooldown','diveGraceTicks','attackTick','hurtTicks','hurtPushTicks'])if(!count(p[k]))throw new RangeError('Invalid player timer');
  if((p.mode==='dead')!==(p.hp===0)||p.mode==='dead'&&s.deathTicks===0)throw new TypeError('Invalid death snapshot');
  if(!strings(s.consumedPickupIds)||s.consumedPickupIds.some(id=>!stage.pickups.some(pickup=>pickup.id===id)))throw new TypeError('Invalid pickup snapshot');

  const enemyCount=roundEnemyCount(s.round);
  if(!Array.isArray(s.enemies)||s.enemies.length!==enemyCount||new Set(s.enemies.map(e=>e?.id)).size!==s.enemies.length)throw new TypeError('Invalid enemies');
  for(const enemy of s.enemies){
    const source=stage.enemies.find(template=>template.kind===enemy?.kind);
    const template=source&&{...createEnemy({...source,id:enemy.id,x:enemy.x,y:enemy.y}),hitIds:[]};
    if(!template||!keys(enemy,Object.keys(template),['lockedTarget','vx','vy'])||!sameTypes(enemy,template)||!strings(enemy.hitIds)||enemy.kind!==source.kind||enemy.w!==template.w||enemy.h!==template.h||enemy.maxHp!==template.maxHp||!Number.isInteger(enemy.hp)||enemy.hp<0||enemy.hp>enemy.maxHp||!count(enemy.stateTicks)||!['idle','chase','windup','attack','return','recovery','hurt','dead'].includes(enemy.state)||('shotCount'in enemy&&!count(enemy.shotCount))||('lockedTarget'in enemy&&(!keys(enemy.lockedTarget,['x','y'])||!Number.isFinite(enemy.lockedTarget.x)||!Number.isFinite(enemy.lockedTarget.y))))throw new TypeError('Invalid enemy snapshot');
  }
  if(s.round===7||s.round===8){
    const kinds=s.enemies.map(enemy=>enemy.kind);
    if(stage.enemies.some(template=>kinds.filter(kind=>kind===template.kind).length!==1))throw new TypeError('Final rounds require one of each enemy kind');
  }
  if(s.roundClearTicks!==null&&(s.round===ROUND_COUNT||s.enemies.some(enemy=>enemy.state!=='dead')||isBossRound(stage.id,s.round)&&s.boss?.state!=='dead'))throw new TypeError('Invalid round clear snapshot');
  if(!Array.isArray(s.projectiles)||s.projectiles.some(v=>!keys(v,['id','ownerId','x','y','w','h','vx','vy','life','alive'])||typeof v.id!=='string'||typeof v.ownerId!=='string'||!['x','y','w','h','vx','vy'].every(k=>Number.isFinite(v[k]))||v.w<=0||v.h<=0||!count(v.life)||typeof v.alive!=='boolean'))throw new TypeError('Invalid projectile snapshot');

  const b=s.boss;
  if(stage.id==='mine-1'&&!['machine','worm'].includes(b?.kind))throw new TypeError('Invalid mine boss kind');
  const bt=stage.id==='mine-1'?createMineBoss(b.kind,{x:stage.boss.x,y:stage.boss.y}):fresh.boss;
  if(!keys(b,Object.keys(bt))||!sameTypes(b,bt)||b.id!==bt.id||b.w!==bt.w||b.h!==bt.h||b.maxHp!==bt.maxHp||!Number.isInteger(b.hp)||b.hp<0||b.hp>b.maxHp||![1,2].includes(b.phase)||!['dormant','intro','transition','windup','attack','recovery','dying','dead'].includes(b.state)||!count(b.stateTicks)||!count(b.cycle)||typeof b.transitioned!=='boolean'||!Array.isArray(b.telegraphs)||!b.telegraphs.every(v=>rect(v))||!Array.isArray(b.hitboxes)||!b.hitboxes.every(v=>rect(v,true)))throw new TypeError('Invalid boss snapshot');
  if(stage.id==='forest-1'&&(!count(b.secondRootDelay)||![null,'branch','root','slam'].includes(b.attackKind)||!(b.secondRoot===null||rect(b.secondRoot))))throw new TypeError('Invalid forest boss');
  if(stage.id==='forest-1'&&(!Array.isArray(b.rootEffects)||b.rootEffects.length>2||new Set(b.rootEffects.map(e=>e?.strike)).size!==b.rootEffects.length||!b.rootEffects.every(e=>keys(e,['x','y','w','h','age','strike'])&&rect({x:e.x,y:e.y,w:e.w,h:e.h})&&e.w===48&&e.h===48&&count(e.age)&&e.age<24&&[1,2].includes(e.strike))))throw new TypeError('Invalid root effects');
  if(stage.id==='forest-1'&&s.bossSequence!=='none')throw new TypeError('Invalid forest boss sequence');
  if(stage.id==='forest-1'&&!isBossRound(stage.id,s.round)&&!['dormant','dead'].includes(b.state))throw new TypeError('Forest boss is outside its encounter round');

  if(stage.id==='mine-1'){
    if(s.bossSequence==='worm-intro'&&(b.stateTicks<1||b.stateTicks>WORM_INTRO_TICKS))throw new TypeError('Invalid worm intro timer');
    if(!Array.isArray(s.cartZones)||s.cartZones.length!==5||new Set(s.cartZones.map(z=>z.centerX)).size!==5)throw new TypeError('Invalid mine random state');
    const min=stage.arena.left+64,max=stage.arena.right-64;
    for(const [i,zone] of s.cartZones.entries())if(!keys(zone,['id','centerX','direction','state','ticks','cartId'])||zone.id!==`cart-${i+1}`||!Number.isSafeInteger(zone.centerX)||zone.centerX<min||zone.centerX>max||![-1,1].includes(zone.direction)||!['countdown','warning','active'].includes(zone.state)||!count(zone.ticks)||!(zone.cartId===null||typeof zone.cartId==='string'))throw new TypeError('Invalid cart zone');
    if(!Array.isArray(s.hazards)||s.hazards.some(h=>!keys(h,['id','ownerId','kind','x','y','w','h','vx','vy','life','alive'],['remaining','poolTicks'])||typeof h.id!=='string'||typeof h.ownerId!=='string'||!['wave','acid-shot','acid-pool','cart','rock','mineral'].includes(h.kind)||!['x','y','w','h','vx','vy'].every(k=>Number.isFinite(h[k]))||h.w<=0||h.h<=0||!count(h.life)||typeof h.alive!=='boolean'||h.kind==='wave'&&(!Number.isFinite(h.remaining)||h.remaining<0)||h.kind==='acid-shot'&&(!count(h.poolTicks)||!h.poolTicks)))throw new TypeError('Invalid hazards');
    if(!['none','machine','worm-intro','worm','done'].includes(s.bossSequence)||['machine','none'].includes(s.bossSequence)&&b.kind!=='machine'||['worm-intro','worm','done'].includes(s.bossSequence)&&b.kind!=='worm'||s.bossSequence==='worm-intro'&&b.state!=='intro'||!keys(s.bossDrop,['rolled','spawned','consumed','x','y'])||!['rolled','spawned','consumed'].every(k=>typeof s.bossDrop[k]==='boolean')||!Number.isFinite(s.bossDrop.x)||!Number.isFinite(s.bossDrop.y)||!count(b.attackSerial)||!count(b.burrowsLeft)||![-1,1].includes(b.lockedFacing)||![null,'charge','wave','rocks','mineral','spit','burrow','tail'].includes(b.attackKind)||![null,'charge','wave','rocks','mineral','spit','burrow','tail'].includes(b.lastAttack))throw new TypeError('Invalid mine boss');
    if(isBossRound(stage.id,s.round)&&s.bossSequence==='none'||!isBossRound(stage.id,s.round)&&s.bossSequence!=='none'||s.round!==8&&['worm-intro','worm','done'].includes(s.bossSequence)||s.outcome==='clear'&&s.bossSequence!=='done')throw new TypeError('Mine boss sequence does not match its round');
  }
  if(s.outcome==='clear'&&(s.enemies.some(enemy=>enemy.state!=='dead')||b.state!=='dead'))throw new TypeError('Only a defeated round 8 can clear a stage');

  p.hitIds=new Set(p.hitIds);for(const enemy of s.enemies)enemy.hitIds=new Set(enemy.hitIds);
  return s;
}

function hurt(run,events,source,originX){
  const result=applyPlayerDamage(run.player,source,{originX});run.player=result.player;events.push(...result.events);
}

export function separateOverlappingTargets(player,direction,targets,terrain){
  for(let i=0;i<targets.length;i++){
    const overlapsNow=targets.filter(target=>intersects(player,target));if(!overlapsNow.length)break;
    const distance=direction>0?Math.max(...overlapsNow.map(target=>target.x+target.w-player.x)):Math.min(...overlapsNow.map(target=>target.x-player.x-player.w));
    const before=player.x,blocked=moveAxis(player,terrain,'x',distance);
    if(blocked||player.x===before)break;
  }
}

function damageTargets(run,rect,terrain,events){
  const diving=Boolean(rect);
  for(let i=0;i<run.enemies.length;i++){
    const enemy=run.enemies[i];if(enemy.state==='dead')continue;
    const hit=diving?intersects(rect,enemy):registerAttackHit(run.player,enemy,terrain);
    if(hit){run.enemies[i]=damageEnemy(enemy);events.push({type:'enemy:hurt',id:enemy.id});}
  }
  if(!diving&&run.hazards)for(const cart of run.hazards)if(cart.kind==='cart'&&cart.alive&&registerAttackHit(run.player,cart,terrain)){cart.alive=false;events.push({type:'cart:destroyed',id:cart.id});}
  const boss=run.boss;
  if(!['dormant','intro','transition','dying','dead'].includes(boss.state)){
    const hit=diving?intersects(rect,boss):registerAttackHit(run.player,boss,terrain);
    if(hit){
      const result=run.stageId==='mine-1'?damageMineBoss(boss):damageBoss(boss,1,{allowPhaseTransition:run.round===8});
      run.boss=result.boss;events.push(...result.events);
      if(result.boss.state==='dying'&&run.stageId==='forest-1'){
        run.arenaLocked=false;run.player.mode=run.player.grounded?'idle':'fall';run.player.attackTick=0;run.player.hitIds.clear();run.player.vx=0;run.player.vy=0;
      }
    }
  }
}

function roundIsDefeated(run){
  return run.enemies.every(enemy=>enemy.state==='dead')&&(!isBossRound(run.stageId,run.round)||run.boss.state==='dead');
}

function clearRound(run,events){
  if(run.round===ROUND_COUNT){
    run.outcome='clear';run.roundClearTicks=null;
    if(run.stageId==='mine-1')run.bossSequence='done';
    events.push({type:'stage:clear',stageId:run.stageId,round:run.round,elapsedTicks:run.elapsedTicks,deaths:run.deaths});
    return;
  }
  run.roundClearTicks=ROUND_CLEAR_TICKS;
  run.player.mode=run.player.grounded?'idle':'fall';run.player.vx=0;run.player.vy=0;run.player.attackTick=0;run.player.hitIds.clear();
  events.push({type:'round:clear',round:run.round,ticks:ROUND_CLEAR_TICKS});
}

export function stepStage(previous,input,stage){
  if(previous.outcome)return {run:previous,events:[]};
  let run=structuredClone(previous);const events=[];
  if(run.player.mode==='dead'){
    if(--run.deathTicks<=0){
      const deaths=run.deaths,elapsedTicks=run.elapsedTicks,seed=run.rngState;
      run=createStageRun(stage,{}, {seed});run.deaths=deaths;run.elapsedTicks=elapsedTicks;
      events.push({type:'round:start',round:run.round,enemyCount:run.enemies.length,respawn:true});
    }
    return {run,events};
  }
  run.elapsedTicks++;
  if(run.roundClearTicks!==null){
    run.roundClearTicks--;
    if(run.roundClearTicks===0)startRound(run,stage,run.round+1,events);
    return {run,events};
  }
  if(run.bossSequence==='worm-intro'){
    const beforeRemaining=run.boss.stateTicks;
    const result=stepMineBoss(run.boss,run.player,stage.arena,run.rngState);
    run.boss=result.boss;run.rngState=result.rng;events.push(...result.events);
    const burstRemaining=WORM_INTRO_TICKS-WORM_INTRO_BURST_TICK;
    if(beforeRemaining>burstRemaining&&run.boss.stateTicks<=burstRemaining)events.push({type:'boss:worm-burst'});
    if(run.boss.state!=='intro')run.bossSequence='worm';
    return {run,events};
  }

  const terrain=stageTerrain(stage,run.arenaLocked);let pushCompleted;
  const playerStep=stepPlayer(run.player,input,terrain,stage.pitDeathY);
  run.player=playerStep.player;pushCompleted=playerStep.pushCompleted;events.push(...playerStep.events);
  if(run.player.mode==='dead')return death(run,events);

  const interactionLocked=run.boss.state==='intro'||run.boss.state==='transition'&&run.stageId!=='mine-1'||run.boss.state==='dying'||run.boss.state==='dead';
  if(!interactionLocked){
    for(const pickup of stage.pickups)if(!run.consumedPickupIds.includes(pickup.id)&&intersects(run.player,{...pickup,w:16,h:16})){
      run.consumedPickupIds.push(pickup.id);run.player.hp=Math.min(3,run.player.hp+1);events.push({type:'stage:pickup',id:pickup.id,consumedPickupIds:[...run.consumedPickupIds]});
    }
    if(run.bossDrop?.spawned&&!run.bossDrop.consumed&&intersects(run.player,{x:run.bossDrop.x,y:run.bossDrop.y,w:16,h:16})){
      run.bossDrop.consumed=true;run.player.hp=Math.min(3,run.player.hp+1);events.push({type:'stage:pickup',id:'boss-heal'});
    }
    const solids=stageTerrain(stage,run.arenaLocked);
    for(let i=0;i<run.enemies.length;i++){
      const result=stepEnemy(run.enemies[i],run.player,solids);
      run.enemies[i]=result.enemy;events.push(...result.events);run.projectiles.push(...result.projectiles);
      if(run.hazards)run.hazards.push(...result.hazards);
      const enemy=result.enemy;if(enemy.state==='dead')continue;
      if(intersects(enemy,run.player))hurt(run,events,'contact',enemy.x+enemy.w/2);
      const hitbox=enemyAttackRect(enemy);
      if(hitbox&&!enemy.hitIds.has('player')&&intersects(hitbox,run.player)){enemy.hitIds.add('player');hurt(run,events,'enemy-attack',enemy.x+enemy.w/2);}
    }
    run.projectiles=run.projectiles.map(projectile=>{
      const result=stepProjectile(projectile,solids,run.player);
      for(const event of result.events){events.push(event);hurt(run,events,'projectile',result.projectile.x+result.projectile.w/2);}
      return result.projectile;
    }).filter(projectile=>projectile.alive);
    if(run.hazards){
      const carts=stepCartZones(run.cartZones,run.hazards,stage);run.cartZones=carts.zones;run.hazards=carts.hazards;events.push(...carts.events);
      const stepped=stepHazards(run.hazards,run.player,solids);run.hazards=stepped.hazards;
      for(const event of stepped.events){events.push(event);if(event.type==='hazard:hit')hurt(run,events,'hazard',event.originX);}
    }
  }

  const bossResult=run.stageId==='mine-1'?stepMineBoss(run.boss,run.player,stage.arena,run.rngState):stepBoss(run.boss,run.player,stage.arena);
  run.boss=bossResult.boss;events.push(...bossResult.events);
  if(run.stageId==='mine-1'){run.rngState=bossResult.rng;run.hazards.push(...bossResult.hazards);}
  if(!interactionLocked&&!['dormant','intro','dying','dead'].includes(run.boss.state)){
    if(intersects(run.player,run.boss))hurt(run,events,'contact',run.boss.x+run.boss.w/2);
    for(const box of run.boss.hitboxes)if(intersects(run.player,box))hurt(run,events,'boss-attack',box.x+box.w/2);
  }
  if(run.player.mode==='dead')return death(run,events);
  if(pushCompleted!==undefined&&!interactionLocked){
    const targets=run.enemies.filter(enemy=>enemy.state!=='dead');
    if(!['dormant','intro','transition','dying','dead'].includes(run.boss.state))targets.push(run.boss);
    separateOverlappingTargets(run.player,pushCompleted,targets,stageTerrain(stage,run.arenaLocked));
  }

  if(bossResult.events.some(event=>event.type==='boss:defeated')&&run.stageId==='mine-1'&&run.round===8&&run.bossSequence==='machine'){
    const roll=nextRandom(run.rngState);run.rngState=roll.state;
    run.bossDrop={rolled:true,spawned:shouldDropPotion(roll.value),consumed:false,x:run.boss.x+run.boss.w/2-8,y:stage.arena.bottom-16};
    run.projectiles=[];run.hazards=run.hazards.filter(hazard=>hazard.kind==='cart');run.player.attackTick=0;run.player.hitIds.clear();
    if(run.player.mode==='attack')run.player.mode=run.player.grounded?'idle':'fall';
    const wormX=safeBossX(stage,run.player,96,(stage.arena.left+stage.arena.right)/2-48);
    run.boss=createMineBoss('worm',{x:wormX,y:stage.arena.bottom-64});
    run.boss.state='intro';run.boss.stateTicks=WORM_INTRO_TICKS;run.bossSequence='worm-intro';
    events.push({type:'boss:worm-intro'});return {run,events};
  }

  for(const event of events)if(event.type==='dive-impact')event.canDamage=!interactionLocked;
  if(!interactionLocked){
    if(isAttackActive(run.player))damageTargets(run,null,terrain,events);
    for(const event of events.filter(item=>item.type==='dive-impact'))damageTargets(run,diveImpactRect(event.x,event.y),terrain,events);
  }
  if(roundIsDefeated(run))clearRound(run,events);
  return {run,events};
}

function death(run,events){
  run.deaths++;run.deathTicks=DEATH_TICKS;run.arenaLocked=false;run.roundClearTicks=null;
  run.boss.hitboxes=[];run.boss.telegraphs=[];
  if(run.stageId==='forest-1'){run.boss.rootEffects=[];run.boss.secondRootDelay=0;run.boss.secondRoot=null;}
  events.push({type:'stage:death',deaths:run.deaths,elapsedTicks:run.elapsedTicks});
  return {run,events};
}
