import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, stepPlayer, isAttackActive } from '../src/game/sim/player.js';
import { applyPlayerDamage, attackIntersects } from '../src/game/sim/combat.js';
import * as C from '../src/game/sim/constants.js';
const floor = [{x:-1000,y:304,w:2000,h:56}];
const frame = overrides => ({move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:500,aimY:290,...overrides});
const tick = (p, input = {}, terrain = floor) => stepPlayer(p, frame(input), terrain).player;
const grounded = () => tick(createPlayer());
test('jump height depends on hold; air jump is rejected and landing restores jump', () => {
  function height(held) { let p=grounded(), min=p.y; p=tick(p,{jumpPressed:true,jumpHeld:true}); for(let i=0;i<80;i++){p=tick(p,{jumpHeld:held,jumpPressed:i===3});min=Math.min(min,p.y);} assert.equal(p.grounded,true); return min; }
  assert.ok(height(true) < height(false)-15);
  let p=grounded(); p=tick(p,{jumpPressed:true,jumpHeld:true}); const before=p.vy; p=tick(p,{jumpPressed:true,jumpHeld:true}); assert.ok(p.vy>before);
  for(let i=0;i<100;i++) p=tick(p); assert.equal(p.grounded,true); assert.equal(tick(p,{jumpPressed:true,jumpHeld:true}).mode,'jump');
});
test('axis collisions stop at walls, ceilings, thin platforms and falling into pits kills', () => {
  let p=grounded(); const wall=[...floor,{x:145,y:200,w:1,h:104}]; for(let i=0;i<20;i++) p=tick(p,{move:1},wall); assert.equal(p.x,129); assert.equal(p.vx,0);
  p=createPlayer(120,200); p.vy=-300; p=tick(p,{jumpHeld:true},[{x:100,y:198,w:100,h:1}]); assert.equal(p.y,199); assert.equal(p.vy,0);
  p=createPlayer(120,100); p.vy=400; for(let i=0;i<20;i++) p=tick(p,{},[{x:100,y:160,w:100,h:1}]); assert.equal(p.y,132); assert.equal(p.grounded,true);
  p=createPlayer(0,359); p.vy=400; const r=stepPlayer(p,frame(),[]); assert.equal(r.player.mode,'dead'); assert.equal(r.events[0].type,'death');
});
test('roll protects every movement tick, then cooldown prevents restart', () => {
  let p=grounded(); for(let i=0;i<C.ROLL_TICKS;i++){p=tick(p,{rollPressed:i===0}); assert.equal(applyPlayerDamage(p).player.hp,3);}
  assert.equal(p.rollCooldown,C.ROLL_COOLDOWN); p=tick(p,{rollPressed:true}); assert.notEqual(p.mode,'roll');
  for(let i=0;i<C.ROLL_COOLDOWN-1;i++) p=tick(p); p=tick(p,{rollPressed:true}); assert.equal(p.mode,'roll');
  assert.equal(applyPlayerDamage(p,'pit').player.hp,0);
});
test('damage grants immunity and death happens once', () => {
  let p=grounded(); let result=applyPlayerDamage(p); p=result.player; assert.equal(p.hp,2); assert.equal(applyPlayerDamage(p).player.hp,2);
  for(let i=0;i<C.HURT_INVULNERABLE_TICKS;i++) { p=tick(p); assert.equal(applyPlayerDamage(p).player.hp,2); } p=tick(p); p=applyPlayerDamage(p).player; assert.equal(p.hp,1);
  for(let i=0;i<C.HURT_INVULNERABLE_TICKS+1;i++) p=tick(p); result=applyPlayerDamage(p); assert.equal(result.player.hp,0); assert.equal(result.events[0].type,'death'); assert.equal(applyPlayerDamage(result.player).events.length,0);
});
test('dive requires air, falls vertically and starts cooldown at landing', () => {
  let p=grounded(); p=tick(p,{divePressed:true}); assert.notEqual(p.mode,'dive'); p=tick(p,{jumpPressed:true,jumpHeld:true}); for(let i=0;i<5;i++) p=tick(p,{jumpHeld:true});
  p=tick(p,{divePressed:true,move:1}); assert.equal(p.mode,'dive'); assert.equal(p.vx,0); assert.equal(p.vy,C.MAX_FALL_SPEED);
  let impacts=0; for(let i=0;i<20;i++){const r=stepPlayer(p,frame(),floor);p=r.player;impacts+=r.events.filter(e=>e.type==='dive-impact').length;} assert.equal(impacts,1); assert.ok(p.diveCooldown>0);
  p=tick(p,{jumpPressed:true,jumpHeld:true}); p=tick(p,{divePressed:true}); assert.notEqual(p.mode,'dive');
});
test('attacks track current aim without queuing another swing', () => {
  let p=grounded(); let result=stepPlayer(p,frame({attackPressed:true,aimX:500,aimY:290}),floor);p=result.player;
  assert.equal(result.events.filter(e=>e.type==='swing').length,1);p.hitIds.add('target');
  result=stepPlayer(p,frame({attackPressed:true,aimX:0,aimY:290}),floor);p=result.player;
  assert.equal(p.facing,4);assert.ok(p.aim.x<0);assert.equal(result.events.some(e=>e.type==='swing'),false);
  for(let i=2;i<C.ATTACK_TICKS;i++){result=stepPlayer(p,frame({aimX:0,aimY:290}),floor);p=result.player;assert.equal(result.events.some(e=>e.type==='swing'),false);}
  assert.notEqual(p.mode,'attack');assert.equal(p.hitIds.size,0);
  result=stepPlayer(p,frame({attackPressed:true,aimX:0,aimY:290}),floor);assert.equal(result.player.mode,'attack');assert.equal(result.events.filter(e=>e.type==='swing').length,1);assert.ok(result.events[0].aim.x<0);
});

test('attack has four startup, five active and ten recovery ticks',()=>{
 let p=grounded(); const phases=[]; for(let i=0;i<19;i++){p=tick(p,{attackPressed:i===0});phases.push(isAttackActive(p));}
 assert.deepEqual(phases, [...Array(4).fill(false),...Array(5).fill(true),...Array(10).fill(false)]);
});

test('turning during an active swing moves the hit area with the aim',()=>{
 let p=grounded();for(let i=0;i<5;i++)p=tick(p,{attackPressed:i===0,aimX:500,aimY:290});
 const right={x:p.x+30,y:p.y+10,w:8,h:8},left={x:p.x-22,y:p.y+10,w:8,h:8};
 assert.equal(isAttackActive(p),true);assert.equal(attackIntersects(p,right),true);assert.equal(attackIntersects(p,left),false);
 p=tick(p,{aimX:0,aimY:290});assert.equal(isAttackActive(p),true);assert.equal(attackIntersects(p,right),false);assert.equal(attackIntersects(p,left),true);
});

test('a dive interrupted by damage cannot be reused until landing and cooldown',()=>{
 let p=grounded(); p=tick(p,{jumpPressed:true,jumpHeld:true}); for(let i=0;i<8;i++)p=tick(p,{jumpHeld:true});
 p=tick(p,{divePressed:true}); p=applyPlayerDamage(p).player; assert.equal(p.diveUsed,true);
 for(let i=0;i<30&&!p.grounded;i++)p=tick(p); assert.equal(p.grounded,true); assert.equal(p.diveCooldown,C.DIVE_COOLDOWN);
});
