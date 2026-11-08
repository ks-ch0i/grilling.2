import { intersects, moveAxis } from './geometry.js';
const specs={
  soldier:{w:20,h:28,hp:3,range:180,trigger:36,windup:30,active:8,recovery:40,speed:45},
  wisp:{w:20,h:20,hp:2,range:260,trigger:260,windup:36,active:1,recovery:60,speed:0},
  boar:{w:28,h:20,hp:3,range:220,trigger:220,windup:42,active:30,recovery:50,speed:240},
  golem:{w:32,h:40,hp:5,range:220,trigger:64,windup:45,active:1,recovery:55,speed:30},
  insect:{w:24,h:24,hp:3,range:260,trigger:260,windup:42,active:1,recovery:75,speed:0},
  bat:{w:24,h:20,hp:2,range:260,trigger:220,windup:40,active:55,recovery:55,speed:180}
};
export function createEnemy(spawn) {
  const spec=specs[spawn.kind]; if (!spec) throw new TypeError('Unknown enemy kind');
  return {...spawn,w:spec.w,h:spec.h,hp:spec.hp,maxHp:spec.hp,state:'idle',stateTicks:0,facing:-1,lockedFacing:-1,hitIds:new Set(),visible:true,
    ...(['golem','insect','bat'].includes(spawn.kind)?{shotCount:0}:{}),...(spawn.kind==='bat'?{homeY:spawn.y}:{})};
}
function groundAhead(enemy,terrain,dx) {
  const probe={x:dx>0?enemy.x+enemy.w+dx:enemy.x+dx-1,y:enemy.y+enemy.h,w:1,h:2};
  return terrain.some(rect=>intersects(probe,rect));
}
function walk(enemy,terrain,dx) {
  if (!groundAhead(enemy,terrain,dx)) return false;
  return !moveAxis(enemy,terrain,'x',dx);
}
export function enemyAttackRect(e) {
  if (e.state!=='attack') return null;
  if (e.kind==='soldier') return {x:e.lockedFacing>0?e.x+e.w:e.x-28,y:e.y+3,w:28,h:e.h-6};
  if (e.kind==='boar') return {x:e.x,y:e.y,w:e.w,h:e.h};
  return null;
}
export function damageEnemy(state, amount=1) {
  const enemy={...state,hitIds:new Set(state.hitIds)};
  if (enemy.state==='dead') return enemy;
  enemy.hp=Math.max(0,enemy.hp-amount); enemy.state=enemy.hp===0?'dead':'hurt';
  enemy.stateTicks=enemy.hp===0?30:15; enemy.hitIds.clear();
  return enemy;
}
export function stepEnemy(state,player,terrain) {
  const enemy={...state,hitIds:new Set(state.hitIds)}, events=[], projectiles=[],hazards=[];
  const spec=specs[enemy.kind];
  if (enemy.state==='dead') { if (enemy.stateTicks>0 && --enemy.stateTicks===0) enemy.visible=false; return {enemy,events,projectiles,hazards}; }
  if (enemy.state==='hurt') { if (--enemy.stateTicks<=0) enemy.state=enemy.kind==='bat'&&enemy.y>enemy.homeY?'return':'idle'; return {enemy,events,projectiles,hazards}; }
  const dx=(player.x+player.w/2)-(enemy.x+enemy.w/2), distance=Math.abs(dx);
  if (enemy.state==='idle' || enemy.state==='chase') {
    enemy.facing=dx<0?-1:1;
    if (distance<=spec.trigger) { enemy.state='windup'; enemy.stateTicks=spec.windup; enemy.lockedFacing=enemy.facing; enemy.lockedTarget={x:player.x+player.w/2,y:player.y+player.h/2}; enemy.hitIds.clear(); events.push({type:'enemy:windup',id:enemy.id}); }
    else if (['soldier','golem'].includes(enemy.kind) && distance<=spec.range) { enemy.state='chase'; walk(enemy,terrain,enemy.facing*spec.speed/60); }
    else enemy.state='idle';
  } else if (enemy.state==='windup') {
    if (--enemy.stateTicks<=0) {
      enemy.state='attack'; enemy.stateTicks=spec.active; enemy.facing=enemy.lockedFacing;
      if (enemy.kind==='wisp') {
        const ox=enemy.x+enemy.w/2, oy=enemy.y+enemy.h/2;
        const tx=enemy.lockedTarget.x, ty=enemy.lockedTarget.y, length=Math.hypot(tx-ox,ty-oy)||1;
        projectiles.push({id:`${enemy.id}-shot`,ownerId:enemy.id,x:ox-4,y:oy-4,w:8,h:8,vx:(tx-ox)/length*160,vy:(ty-oy)/length*160,life:180,alive:true});
      }
      if(enemy.kind==='golem'){
        const n=++enemy.shotCount;
        for(const direction of [-1,1])hazards.push({id:`${enemy.id}-wave-${n}-${direction}`,ownerId:enemy.id,kind:'wave',x:direction<0?enemy.x-8:enemy.x+enemy.w,y:enemy.y+enemy.h-8,w:8,h:8,vx:direction*120,vy:0,life:60,alive:true,remaining:120});
      }else if(enemy.kind==='insect'){
        const n=++enemy.shotCount;hazards.push({id:`${enemy.id}-acid-${n}`,ownerId:enemy.id,kind:'acid-shot',x:enemy.x+enemy.w/2-4,y:enemy.y,w:8,h:8,vx:enemy.lockedFacing*110,vy:-180,life:180,alive:true,poolTicks:120});
      }
      events.push({type:'enemy:attack',id:enemy.id});
    }
  } else if (enemy.state==='attack') {
    if (enemy.kind==='boar' && !walk(enemy,terrain,enemy.lockedFacing*spec.speed/60)) enemy.stateTicks=1;
    if(enemy.kind==='bat'){
      const dx=enemy.lockedTarget.x-(enemy.x+enemy.w/2),dy=enemy.lockedTarget.y-(enemy.y+enemy.h/2),distance=Math.hypot(dx,dy),step=spec.speed/60;
      if(distance<=step)enemy.stateTicks=1;
      else {const before={x:enemy.x,y:enemy.y};moveAxis(enemy,terrain,'x',dx/distance*step);moveAxis(enemy,terrain,'y',dy/distance*step);if(enemy.x===before.x&&enemy.y===before.y)enemy.stateTicks=1;}
    }
    if (--enemy.stateTicks<=0) { enemy.state=enemy.kind==='bat'?'return':'recovery'; enemy.stateTicks=spec.recovery; }
  } else if(enemy.state==='return'&&enemy.kind==='bat'){
    enemy.y=Math.max(enemy.homeY,enemy.y-spec.speed/60);if(enemy.y===enemy.homeY){enemy.state='recovery';enemy.stateTicks=spec.recovery;}
  } else if (enemy.state==='recovery' && --enemy.stateTicks<=0) enemy.state='idle';
  return {enemy,events,projectiles,hazards};
}
export function stepProjectile(state,terrain,player) {
  const projectile={...state}, events=[];
  if (!projectile.alive) return {projectile,events};
  const dx=projectile.vx/60, dy=projectile.vy/60, steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/2));
  for (let i=0;i<steps;i++) {
    projectile.x+=dx/steps; projectile.y+=dy/steps;
    if (terrain.some(r=>intersects(projectile,r))) {projectile.alive=false;break;}
    if (player.mode!=='dead' && intersects(projectile,player)) {projectile.alive=false;events.push({type:'projectile:hit',ownerId:projectile.ownerId});break;}
  }
  if (--projectile.life<=0) projectile.alive=false;
  return {projectile,events};
}
