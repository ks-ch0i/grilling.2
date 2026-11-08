import { validateStage } from '../content/stageValidation.js';
import { createPlayer, stepPlayer, isAttackActive } from './player.js';
import { intersects, moveAxis } from './geometry.js';
import { applyPlayerDamage, registerAttackHit, diveImpactRect } from './combat.js';
import { createEnemy, damageEnemy, enemyAttackRect, stepEnemy, stepProjectile } from './enemies.js';
import { createBoss, damageBoss, stepBoss } from './boss.js';
import {stepHazards} from './hazards.js';
import {createCartZones,stepCartZones,nextRandom} from './mineCarts.js';
const DEATH_TICKS=60;
function freshPlayer(point) { const p=createPlayer(point.x,point.y);p.grounded=true;return p; }
export function stageTerrain(stage,locked) {
  const {width,height}=stage.world;
  const walls=[{x:-16,y:0,w:16,h:height},{x:width,y:0,w:16,h:height},{x:0,y:-16,w:width,h:16}];
  if (locked) walls.push({x:stage.arena.left,y:stage.arena.top,w:16,h:stage.arena.bottom-stage.arena.top},{x:stage.arena.right,y:stage.arena.top,w:16,h:stage.arena.bottom-stage.arena.top});
  return [...stage.solids,...walls];
}
export function createStageRun(stage,data={},options={}) {
  validateStage(stage);
  if (!data || typeof data!=='object' || Array.isArray(data)) throw new TypeError('Invalid run data');
  if (Object.keys(data).length) return restoreStageRun(stage,data);
  const run={stageId:stage.id,player:freshPlayer(stage.spawn),
    enemies:stage.enemies.map(createEnemy),projectiles:[],boss:createBoss(stage.boss),arenaLocked:false,
    consumedPickupIds:[],elapsedTicks:0,deaths:0,outcome:null,deathTicks:0};
  if(stage.id==='mine-1'){
    let seed=(options.seed??Math.floor(Math.random()*4294967296))>>>0;
    const random=()=>{const next=nextRandom(seed);seed=next.state;return next.value;};
    run.cartZones=createCartZones(stage,random);run.rngState=seed;run.hazards=[];
  }
  return run;
}
export function snapshotStageRun(run) {
  const copy=structuredClone(run);
  copy.player.hitIds=[...copy.player.hitIds];
  for(const enemy of copy.enemies)enemy.hitIds=[...enemy.hitIds];
  return copy;
}
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const keys=(x,required,optional=[])=>object(x)&&required.every(k=>Object.hasOwn(x,k))&&Object.keys(x).every(k=>required.includes(k)||optional.includes(k));
const count=x=>Number.isSafeInteger(x)&&x>=0;
const strings=x=>Array.isArray(x)&&x.every(s=>typeof s==='string'&&s.length>0)&&new Set(x).size===x.length;
const finiteTree=x=>typeof x==='number'?Number.isFinite(x):Array.isArray(x)?x.every(finiteTree):object(x)?Object.values(x).every(finiteTree):x===null||['string','boolean'].includes(typeof x);
const sameTypes=(x,template)=>Object.entries(template).every(([k,v])=>typeof v==='number'?Number.isFinite(x[k]):typeof v==='boolean'?typeof x[k]==='boolean':typeof v==='string'?typeof x[k]==='string':true);
const rect=(r,ticks=false)=>keys(r,['x','y','w','h',...(ticks?['ticks']:[])])&&['x','y','w','h'].every(k=>Number.isFinite(r[k]))&&r.w>0&&r.h>0&&(!ticks||count(r.ticks));
export function restoreStageRun(stage,snapshot) {
  const s=structuredClone(snapshot), fresh=createStageRun(stage,{}, {seed:1});
  if(!keys(s,Object.keys(fresh))||s.stageId!==stage.id||!finiteTree(s)||!count(s.elapsedTicks)||!count(s.deaths)||!count(s.deathTicks)||typeof s.arenaLocked!=='boolean'||![null,'clear'].includes(s.outcome))throw new TypeError('Invalid run snapshot');
  const p=s.player,pt=snapshotStageRun(fresh).player;
  if(!keys(p,Object.keys(pt))||!sameTypes(p,pt)||!strings(p.hitIds)||!keys(p.aim,['x','y'])||!Number.isFinite(p.aim.x)||!Number.isFinite(p.aim.y)||!['idle','run','jump','fall','attack','roll','dive','hurt','dead'].includes(p.mode)||!Number.isInteger(p.hp)||p.hp<0||p.hp>3||p.w!==16||p.h!==28)throw new TypeError('Invalid player snapshot');
  for(const k of ['invulnerableTicks','rollCooldown','rollTicks','diveCooldown','diveGraceTicks','attackTick','hurtTicks','hurtPushTicks'])if(!count(p[k]))throw new RangeError('Invalid player timer');
  if((p.mode==='dead')!==(p.hp===0)||p.mode==='dead'&&s.deathTicks===0)throw new TypeError('Invalid death snapshot');
  if(!strings(s.consumedPickupIds)||s.consumedPickupIds.some(id=>!stage.pickups.some(pickup=>pickup.id===id)))throw new TypeError('Invalid pickup snapshot');
  if(!Array.isArray(s.enemies)||s.enemies.length!==fresh.enemies.length||new Set(s.enemies.map(e=>e?.id)).size!==s.enemies.length)throw new TypeError('Invalid enemies');
  for(const e of s.enemies){
    const original=fresh.enemies.find(v=>v.id===e.id), template=original&&{...original,hitIds:[]};
    if(!template||!keys(e,Object.keys(template),['lockedTarget','vx','vy'])||!sameTypes(e,template)||!strings(e.hitIds)||e.kind!==original.kind||e.w!==original.w||e.h!==original.h||e.maxHp!==original.maxHp||!Number.isInteger(e.hp)||e.hp<0||e.hp>e.maxHp||!count(e.stateTicks)||!['idle','chase','windup','attack','return','recovery','hurt','dead'].includes(e.state)||('shotCount'in e&&!count(e.shotCount))||('lockedTarget'in e&&(!keys(e.lockedTarget,['x','y'])||!Number.isFinite(e.lockedTarget.x)||!Number.isFinite(e.lockedTarget.y))))throw new TypeError('Invalid enemy snapshot');
  }
  if(!Array.isArray(s.projectiles)||s.projectiles.some(v=>!keys(v,['id','ownerId','x','y','w','h','vx','vy','life','alive'])||typeof v.id!=='string'||typeof v.ownerId!=='string'||!['x','y','w','h','vx','vy'].every(k=>Number.isFinite(v[k]))||v.w<=0||v.h<=0||!count(v.life)||typeof v.alive!=='boolean'))throw new TypeError('Invalid projectile snapshot');
  const b=s.boss,bt=fresh.boss;
  if(!keys(b,Object.keys(bt))||!sameTypes(b,bt)||b.id!==bt.id||b.w!==bt.w||b.h!==bt.h||b.maxHp!==bt.maxHp||!Number.isInteger(b.hp)||b.hp<0||b.hp>b.maxHp||![1,2].includes(b.phase)||!['dormant','intro','transition','windup','attack','recovery','dying','dead'].includes(b.state)||!count(b.stateTicks)||!count(b.cycle)||!count(b.secondRootDelay)||![null,'branch','root','slam'].includes(b.attackKind)||typeof b.transitioned!=='boolean'||!Array.isArray(b.telegraphs)||!b.telegraphs.every(v=>rect(v))||!Array.isArray(b.hitboxes)||!b.hitboxes.every(v=>rect(v,true))||!(b.secondRoot===null||rect(b.secondRoot)))throw new TypeError('Invalid boss snapshot');
  if(stage.id==='mine-1'){
    if(!count(s.rngState)||s.rngState>0xffffffff||!Array.isArray(s.cartZones)||s.cartZones.length!==5||new Set(s.cartZones.map(z=>z.centerX)).size!==5)throw new TypeError('Invalid mine random state');
    for(const [i,z] of s.cartZones.entries())if(!keys(z,['id','centerX','direction','state','ticks','cartId'])||z.id!==`cart-${i+1}`||!Number.isSafeInteger(z.centerX)||z.centerX<512||z.centerX>=stage.world.width||![-1,1].includes(z.direction)||!['countdown','warning','active'].includes(z.state)||!count(z.ticks)||!(z.cartId===null||typeof z.cartId==='string'))throw new TypeError('Invalid cart zone');
    if(!Array.isArray(s.hazards)||s.hazards.some(h=>!keys(h,['id','ownerId','kind','x','y','w','h','vx','vy','life','alive'],['remaining','poolTicks'])||typeof h.id!=='string'||typeof h.ownerId!=='string'||!['wave','acid-shot','acid-pool','cart'].includes(h.kind)||!['x','y','w','h','vx','vy'].every(k=>Number.isFinite(h[k]))||h.w<=0||h.h<=0||!count(h.life)||typeof h.alive!=='boolean'||h.kind==='wave'&&(!Number.isFinite(h.remaining)||h.remaining<0)||h.kind==='acid-shot'&&(!count(h.poolTicks)||!h.poolTicks)))throw new TypeError('Invalid hazards');
  }
  p.hitIds=new Set(p.hitIds);for(const e of s.enemies)e.hitIds=new Set(e.hitIds);
  return s;
}
function hurt(run,events,source,originX) {
  const result=applyPlayerDamage(run.player,source,{originX});run.player=result.player;events.push(...result.events);
}
export function separateOverlappingTargets(player,direction,targets,terrain) {
  for(let i=0;i<targets.length;i++){
    const overlaps=targets.filter(target=>intersects(player,target));if(!overlaps.length)break;
    const distance=direction>0?Math.max(...overlaps.map(target=>target.x+target.w-player.x)):Math.min(...overlaps.map(target=>target.x-player.x-player.w));
    const before=player.x,blocked=moveAxis(player,terrain,'x',distance);
    if(blocked || player.x===before)break;
  }
}
function damageTargets(run,rect,terrain,events) {
  const diving=Boolean(rect);
  for (let i=0;i<run.enemies.length;i++) {
    const enemy=run.enemies[i]; if (enemy.state==='dead') continue;
    const hit=diving?intersects(rect,enemy):registerAttackHit(run.player,enemy,terrain);
    if (hit) {run.enemies[i]=damageEnemy(enemy);events.push({type:'enemy:hurt',id:enemy.id});}
  }
  if(!diving&&run.hazards)for(const cart of run.hazards)if(cart.kind==='cart'&&cart.alive&&registerAttackHit(run.player,cart,terrain)){cart.alive=false;events.push({type:'cart:destroyed',id:cart.id});}
  const b=run.boss;
  if (!['dormant','intro','transition','dying','dead'].includes(b.state)) {
    const hit=diving?intersects(rect,b):registerAttackHit(run.player,b,terrain);
    if (hit) {const result=damageBoss(b);run.boss=result.boss;events.push(...result.events);if(result.boss.state==='dying'){run.arenaLocked=false;run.player.mode='idle';run.player.attackTick=0;run.player.hitIds.clear();run.player.vx=0;run.player.vy=0;}}
  }
}
export function stepStage(previous,input,stage) {
  if (previous.outcome) return {run:previous,events:[]};
  let run=structuredClone(previous), events=[];
  if (run.player.mode==='dead') {
    if (--run.deathTicks<=0) {const deaths=run.deaths,seed=run.rngState;run=createStageRun(stage,{},seed===undefined?{}:{seed});run.deaths=deaths;}
    return {run,events};
  }
  run.elapsedTicks++;
  const terrain=stageTerrain(stage,run.arenaLocked);let pushCompleted;
  if (run.boss.state!=='dying' && run.boss.state!=='dead') {
    const result=stepPlayer(run.player,input,terrain,stage.pitDeathY);run.player=result.player;pushCompleted=result.pushCompleted;events.push(...result.events);
  }
  if (run.player.mode==='dead') return death(run,events);
  if (run.boss.state==='dormant' && run.player.x>=stage.arena.left+16) {
    run.arenaLocked=true;run.boss.state='intro';run.boss.stateTicks=90;events.push({type:'boss:intro'});
  }
  const interactionLocked=run.boss.state==='intro' || run.boss.state==='transition' || run.boss.state==='dying' || run.boss.state==='dead';
  if (!interactionLocked) {
    for (const pickup of stage.pickups) if (!run.consumedPickupIds.includes(pickup.id) && intersects(run.player,{...pickup,w:16,h:16})) {
      run.consumedPickupIds.push(pickup.id);run.player.hp=Math.min(3,run.player.hp+1);events.push({type:'stage:pickup',id:pickup.id,consumedPickupIds:[...run.consumedPickupIds]});
    }
    const solids=stageTerrain(stage,run.arenaLocked);
    for (let i=0;i<run.enemies.length;i++) {
      const result=stepEnemy(run.enemies[i],run.player,solids);run.enemies[i]=result.enemy;events.push(...result.events);run.projectiles.push(...result.projectiles);if(run.hazards)run.hazards.push(...result.hazards);
      const enemy=result.enemy; if (enemy.state==='dead') continue;
      if (intersects(enemy,run.player)) hurt(run,events,'contact',enemy.x+enemy.w/2);
      const hitbox=enemyAttackRect(enemy);
      if (hitbox && !enemy.hitIds.has('player') && intersects(hitbox,run.player)) {enemy.hitIds.add('player');hurt(run,events,'enemy-attack',enemy.x+enemy.w/2);}
    }
    run.projectiles=run.projectiles.map(p=>{const r=stepProjectile(p,solids,run.player);for(const event of r.events){events.push(event);hurt(run,events,'projectile',r.projectile.x+r.projectile.w/2);}return r.projectile;}).filter(p=>p.alive);
    if(run.hazards){
      const carts=stepCartZones(run.cartZones,run.hazards,stage);run.cartZones=carts.zones;run.hazards=carts.hazards;events.push(...carts.events);
      const stepped=stepHazards(run.hazards,run.player,solids);run.hazards=stepped.hazards;
      for(const event of stepped.events){events.push(event);if(event.type==='hazard:hit')hurt(run,events,'hazard',event.originX);}
    }
  }
  const bossResult=stepBoss(run.boss,run.player,stage.arena);run.boss=bossResult.boss;events.push(...bossResult.events);
  if (!interactionLocked && !['dormant','intro','transition','dying','dead'].includes(run.boss.state)) {
    if (intersects(run.player,run.boss)) hurt(run,events,'contact',run.boss.x+run.boss.w/2);
    for (const box of run.boss.hitboxes) if (intersects(run.player,box)) hurt(run,events,'boss-attack',box.x+box.w/2);
  }
  if (run.player.mode==='dead') return death(run,events);
  if (pushCompleted !== undefined && !interactionLocked) {
    const targets=run.enemies.filter(enemy=>enemy.state!=='dead');
    if (!['dormant','intro','transition','dying','dead'].includes(run.boss.state)) targets.push(run.boss);
    separateOverlappingTargets(run.player,pushCompleted,targets,stageTerrain(stage,run.arenaLocked));
  }
  if (bossResult.events.some(e=>e.type==='boss:defeated')) {run.outcome='clear';run.arenaLocked=false;events.push({type:'stage:clear',elapsedTicks:run.elapsedTicks,deaths:run.deaths});return {run,events};}
  for (const event of events) if (event.type==='dive-impact') event.canDamage=!interactionLocked;
  if (!interactionLocked) {
    if (isAttackActive(run.player)) damageTargets(run,null,terrain,events);
    for (const event of events.filter(e=>e.type==='dive-impact')) damageTargets(run,diveImpactRect(event.x,event.y),terrain,events);
  }
  return {run,events};
}
function death(run,events) {
  run.deaths++;run.elapsedTicks=0;run.deathTicks=DEATH_TICKS;run.arenaLocked=false;run.boss.hitboxes=[];run.boss.telegraphs=[];
  events.push({type:'stage:death',deaths:run.deaths});return {run,events};
}
