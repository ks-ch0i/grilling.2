import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, stepPlayer } from '../src/game/sim/player.js';
import { applyPlayerDamage } from '../src/game/sim/combat.js';
import { intersects } from '../src/game/sim/geometry.js';
import { createStageRun, stepStage, restoreCheckpoint } from '../src/game/sim/stage.js';
import { FOREST_STAGE as stage } from '../src/game/content/forestStage.js';

const floor=[{x:-1000,y:304,w:2000,h:56}];
const input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:500,aimY:290};
const step=(run,world=stage,frame=input)=>stepStage(run,frame,world);

test('valid damage pushes exactly twelve ticks away and preserves recovery input',()=>{
 for(const [origin,direction] of [[200,-1],[0,1]]){
  let p={...createPlayer(),grounded:true};p=applyPlayerDamage(p,'contact',{originX:origin}).player;const x=p.x;
  for(let i=1;i<=12;i++){const result=stepPlayer(p,{...input,attackPressed:i===12},floor);p=result.player;assert.equal(p.x,x+direction*i);assert.equal(result.pushCompleted,i===12?direction:undefined);}
  assert.equal(p.mode,'attack');assert.equal(p.hurtPushTicks,0);
 }
});
test('airborne knockback preserves gravity, and equal or absent source uses facing fallback',()=>{
 let p={...createPlayer(120,100),vy:100,horizontalFacing:1};
 assert.equal(applyPlayerDamage(p,'projectile',{originX:128}).player.hurtPushDirection,-1);
 assert.equal(applyPlayerDamage({...p,horizontalFacing:-1},'projectile').player.hurtPushDirection,1);
 p=applyPlayerDamage(p,'enemy-attack',{originX:0}).player;
 for(let i=1;i<=12;i++){const before=p.vy;const result=stepPlayer(p,input,[]);p=result.player;assert.ok(Math.abs(p.vy-Math.min(400,before+650/60))<1e-9);assert.equal(p.x,120+i);}
});
test('immune and lethal hits do not create or reset a push; pits remain lethal',()=>{
 for(const extra of [{mode:'roll'},{mode:'dive'},{diveGraceActive:true},{invulnerableTicks:5}]){
  const p={...createPlayer(),...extra,hurtPushTicks:7,hurtPushDirection:1};const result=applyPlayerDamage(p,'contact',{originX:500});assert.equal(result.player.hp,3);assert.equal(result.player.hurtPushTicks,7);assert.equal(result.player.hurtPushDirection,1);assert.equal(result.events.length,0);
  assert.equal(applyPlayerDamage(p,'pit').player.mode,'dead');
 }
 const p={...createPlayer(),hp:1};const dead=applyPlayerDamage(p,'contact',{originX:0}).player;assert.equal(dead.mode,'dead');assert.equal(dead.hurtPushTicks,0);
});
test('contact, enemy attack and actual projectile collision use their own origins',()=>{
 for(const [kind,origin,expected] of [['contact',206,-1],['contact',188,1],['enemy-attack',230,-1]]){
  let r=createStageRun(stage);Object.assign(r.player,{x:200,y:276,grounded:true});const e=r.enemies[0];Object.assign(e,{x:origin,y:276,state:kind==='contact'?'hurt':'attack',stateTicks:20,lockedFacing:-1});r.enemies=[e];
  const result=step(r);assert.equal(result.run.player.hp,2,kind);assert.equal(result.run.player.hurtPushDirection,expected,kind);
 }
 for(const [x,vx,direction] of [[213,-120,-1],[194,120,1]]){
  let r=createStageRun(stage);r.enemies=[];Object.assign(r.player,{x:200,y:276,grounded:true});r.projectiles=[{id:'p',ownerId:'distant',x,y:282,w:8,h:8,vx,vy:0,life:20,alive:true}];
  const result=step(r);assert.equal(result.run.player.hp,2);assert.equal(result.run.player.hurtPushDirection,direction);assert.equal(result.run.projectiles.length,0);
 }
});
test('boss hitbox direction comes from the hitbox and boss body can be separated',()=>{
 let r=createStageRun(stage);r.enemies=[];r.arenaLocked=true;Object.assign(r.player,{x:10980,y:276,grounded:true});Object.assign(r.boss,{state:'attack',stateTicks:5,hitboxes:[{x:10980,y:276,w:20,h:28,ticks:5}]});
 r=step(r).run;assert.equal(r.player.hp,2);assert.equal(r.player.hurtPushDirection,-1);
 r=createStageRun(stage);r.enemies=[];r.arenaLocked=true;Object.assign(r.player,{x:11075,y:276,grounded:true});Object.assign(r.boss,{state:'recovery',stateTicks:100});
 r=step(r).run;assert.equal(r.player.hp,2);for(let i=0;i<12;i++)r=step(r).run;assert.equal(intersects(r.player,r.boss),false);assert.equal(r.player.hp,2);
});
test('deep contact separates after push, while a solid wall prevents escape and damage resumes',()=>{
 function setup(world){let r=createStageRun(world);Object.assign(r.player,{x:200,y:276,grounded:true});const e=r.enemies[0];Object.assign(e,{x:200,y:276,state:'hurt',stateTicks:100});r.enemies=[e];return r;}
 let r=step(setup(stage)).run;assert.equal(r.player.hp,2);for(let i=0;i<12;i++)r=step(r).run;assert.equal(r.player.x,184);assert.equal(intersects(r.player,r.enemies[0]),false);
 const world=structuredClone(stage);world.solids.push({x:180,y:200,w:20,h:104});r=step(setup(world),world).run;for(let i=0;i<12;i++)r=step(r,world).run;assert.equal(r.player.x,200);assert.equal(intersects(r.player,r.enemies[0]),true);
 for(let i=0;i<34;i++)r=step(r,world).run;assert.equal(r.player.hp,1);assert.equal(r.player.x,200);
 const restored=restoreCheckpoint(r,world);assert.equal(restored.player.hurtPushTicks,0);
});
test('two overlapping enemies cause one hit and do not reset the initial knockback',()=>{
 let r=createStageRun(stage);Object.assign(r.player,{x:200,y:276,grounded:true});r.enemies=r.enemies.slice(0,2);
 for(const [i,e] of r.enemies.entries())Object.assign(e,{x:200+i*4,y:276,state:'hurt',stateTicks:100});
 const result=step(r);assert.equal(result.run.player.hp,2);assert.equal(result.events.filter(e=>e.type==='hurt').length,1);assert.equal(result.run.player.hurtPushTicks,12);assert.equal(result.run.player.hurtPushDirection,-1);
});
test('knockback can push off a pit edge and pit death is unchanged',()=>{
 let r=createStageRun(stage);r.enemies=[];Object.assign(r.player,{x:1563,y:276,grounded:true});r.player=applyPlayerDamage(r.player,'contact',{originX:1600}).player;
 let death=false;for(let i=0;i<100&&!death;i++){const result=step(r);r=result.run;death=result.events.some(e=>e.type==='stage:death');}assert.equal(death,true);assert.equal(r.player.mode,'dead');
});
