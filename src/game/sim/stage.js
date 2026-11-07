import { validateStage } from '../content/forestStage.js';
import { createPlayer, stepPlayer, isAttackActive } from './player.js';
import { intersects } from './geometry.js';
import { applyPlayerDamage, registerAttackHit } from './combat.js';
import { createEnemy, damageEnemy, enemyAttackRect, stepEnemy, stepProjectile } from './enemies.js';
import { createBoss, damageBoss, stepBoss } from './boss.js';
const DEATH_TICKS=60;
function freshPlayer(point) { const p=createPlayer(point.x,point.y);p.grounded=true;return p; }
function boundaries(stage,locked) {
  const {width,height}=stage.world;
  const walls=[{x:-16,y:0,w:16,h:height},{x:width,y:0,w:16,h:height},{x:0,y:-16,w:width,h:16}];
  if (locked) walls.push({x:stage.arena.left,y:stage.arena.top,w:16,h:stage.arena.bottom-stage.arena.top},{x:stage.arena.right,y:stage.arena.top,w:16,h:stage.arena.bottom-stage.arena.top});
  return [...stage.solids,...walls];
}
export function createStageRun(stage,data={}) {
  validateStage(stage);
  if (!data || typeof data!=='object' || (data.stageId!==undefined && data.stageId!==stage.id)) throw new TypeError('Invalid checkpoint data');
  const checkpoint=data.checkpoint??'start'; if (!['start','mid'].includes(checkpoint)) throw new TypeError('Invalid checkpoint');
  const consumed=data.consumedPickupIds??[];
  if (!Array.isArray(consumed) || new Set(consumed).size!==consumed.length || consumed.some(id=>!stage.pickups.some(p=>p.id===id))) throw new TypeError('Invalid consumed pickup ids');
  const elapsedTicks=data.elapsedTicks??0, deaths=data.deaths??0;
  if (![elapsedTicks,deaths].every(n=>Number.isSafeInteger(n)&&n>=0)) throw new RangeError('Invalid run counters');
  return {stageId:stage.id,checkpoint,player:freshPlayer(checkpoint==='mid'?stage.checkpoint:stage.spawn),
    enemies:stage.enemies.map(createEnemy),projectiles:[],boss:createBoss(stage.boss),arenaLocked:false,
    consumedPickupIds:[...consumed],elapsedTicks,deaths,outcome:null,deathTicks:0};
}
export function checkpointData(run) {
  return {stageId:run.stageId,checkpoint:run.checkpoint,consumedPickupIds:[...run.consumedPickupIds],elapsedTicks:run.elapsedTicks,deaths:run.deaths};
}
export function restoreCheckpoint(run,stage) { return createStageRun(stage,checkpointData(run)); }
function hurt(run,events,source) {
  const result=applyPlayerDamage(run.player,source);run.player=result.player;events.push(...result.events);
}
function damageTargets(run,rect,terrain,events) {
  const diving=Boolean(rect);
  for (let i=0;i<run.enemies.length;i++) {
    const enemy=run.enemies[i]; if (enemy.state==='dead') continue;
    const hit=diving?intersects(rect,enemy):registerAttackHit(run.player,enemy,terrain);
    if (hit) {run.enemies[i]=damageEnemy(enemy);events.push({type:'enemy:hurt',id:enemy.id});}
  }
  const b=run.boss;
  if (!['dormant','intro','transition','dying','dead'].includes(b.state)) {
    const hit=diving?intersects(rect,b):registerAttackHit(run.player,b,terrain);
    if (hit) {const result=damageBoss(b);run.boss=result.boss;events.push(...result.events);if(result.boss.state==='dying'){run.arenaLocked=false;run.player.mode='idle';run.player.combo=0;run.player.attackTick=0;run.player.attackBuffered=false;run.player.hitIds.clear();run.player.vx=0;run.player.vy=0;}}
  }
}
export function stepStage(previous,input,stage) {
  if (previous.outcome) return {run:previous,events:[]};
  let run=structuredClone(previous), events=[]; run.elapsedTicks++;
  if (run.player.mode==='dead') {
    if (--run.deathTicks<=0) run=restoreCheckpoint(run,stage);
    return {run,events};
  }
  const intro=run.boss.state==='intro';
  const terrain=boundaries(stage,run.arenaLocked);
  if (!intro && run.boss.state!=='dying' && run.boss.state!=='dead') {
    const result=stepPlayer(run.player,input,terrain,stage.pitDeathY);run.player=result.player;events.push(...result.events);
  }
  if (run.player.mode==='dead') return death(run,events);
  if (run.boss.state==='dormant' && run.player.x>=stage.arena.left+16) {
    run.arenaLocked=true;run.boss.state='intro';run.boss.stateTicks=90;events.push({type:'boss:intro'});
  }
  const interactionLocked=run.boss.state==='intro' || run.boss.state==='transition' || run.boss.state==='dying' || run.boss.state==='dead';
  if (!interactionLocked) {
    const cp={x:stage.checkpoint.x,y:stage.checkpoint.y,w:16,h:28};
    if (run.checkpoint==='start' && intersects(run.player,cp)) {run.checkpoint='mid';events.push({type:'stage:checkpoint',checkpoint:'mid'});}
    for (const pickup of stage.pickups) if (!run.consumedPickupIds.includes(pickup.id) && intersects(run.player,{...pickup,w:16,h:16})) {
      run.consumedPickupIds.push(pickup.id);run.player.hp=Math.min(3,run.player.hp+1);events.push({type:'stage:pickup',id:pickup.id,consumedPickupIds:[...run.consumedPickupIds]});
    }
    const solids=boundaries(stage,run.arenaLocked);
    for (let i=0;i<run.enemies.length;i++) {
      const result=stepEnemy(run.enemies[i],run.player,solids);run.enemies[i]=result.enemy;events.push(...result.events);run.projectiles.push(...result.projectiles);
      const enemy=result.enemy; if (enemy.state==='dead') continue;
      if (intersects(enemy,run.player)) hurt(run,events,'contact');
      const hitbox=enemyAttackRect(enemy);
      if (hitbox && !enemy.hitIds.has('player') && intersects(hitbox,run.player)) {enemy.hitIds.add('player');hurt(run,events,'enemy-attack');}
    }
    run.projectiles=run.projectiles.map(p=>{const r=stepProjectile(p,solids,run.player);for(const event of r.events){events.push(event);hurt(run,events,'projectile');}return r.projectile;}).filter(p=>p.alive);
  }
  const bossResult=stepBoss(run.boss,run.player,stage.arena);run.boss=bossResult.boss;events.push(...bossResult.events);
  if (!interactionLocked && !['dormant','intro','transition','dying','dead'].includes(run.boss.state)) {
    if (intersects(run.player,run.boss)) hurt(run,events,'contact');
    for (const box of run.boss.hitboxes) if (intersects(run.player,box)) hurt(run,events,'boss-attack');
  }
  if (run.player.mode==='dead') return death(run,events);
  if (bossResult.events.some(e=>e.type==='boss:defeated')) {run.outcome='clear';run.arenaLocked=false;events.push({type:'stage:clear',elapsedTicks:run.elapsedTicks,deaths:run.deaths});return {run,events};}
  if (!interactionLocked) {
    if (isAttackActive(run.player)) damageTargets(run,null,terrain,events);
    for (const event of events.filter(e=>e.type==='dive-impact')) damageTargets(run,{x:event.x-24,y:event.y-12,w:48,h:24},terrain,events);
  }
  return {run,events};
}
function death(run,events) {
  run.deaths++;run.deathTicks=DEATH_TICKS;run.arenaLocked=false;run.boss.hitboxes=[];run.boss.telegraphs=[];
  events.push({type:'stage:death',checkpoint:run.checkpoint,deaths:run.deaths});return {run,events};
}
