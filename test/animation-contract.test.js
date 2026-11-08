import test from 'node:test';import assert from 'node:assert/strict';import {ANIMATIONS} from '../src/game/assets/manifest.js';
import {playerAnimation,enemyAnimation,bossAnimation,animationFrame,playerAttackFrame} from '../src/game/assets/animation.js';
import {createPlayer} from '../src/game/sim/player.js';import {createEnemy} from '../src/game/sim/enemies.js';import {createBoss} from '../src/game/sim/boss.js';
import {createMineBoss} from '../src/game/sim/mineBoss.js';
import {drawForestBossEffect} from '../src/game/render/bossEffects.js';
test('hero has all 8 directions for idle, walking and attack',()=>{
 const p=createPlayer();for(let direction=0;direction<8;direction++){p.facing=direction;p.mode='idle';assert.equal(playerAnimation(p).frames[0],direction);p.mode='run';assert.equal(playerAnimation(p).direction,direction);assert.deepEqual(playerAnimation(p).frames,[direction,direction+8]);p.mode='attack';assert.equal(playerAnimation(p).frames[0],direction);}
 for(const mode of ['run','jump','fall','roll','dive','hurt','dead']){p.mode=mode;p.facing=0;assert.equal(playerAnimation(p).state,mode);}
});
test('mine enemies and each boss resolve their own poses',()=>{
 for(const kind of ['golem','insect','bat']){const e=createEnemy({id:'x',kind,x:0,y:0});for(const state of ['idle','chase','windup','attack','return','recovery','hurt','dead']){e.state=state;assert.equal(enemyAnimation(e).state,state);}}
 for(const kind of ['machine','worm']){const b=createMineBoss(kind,{x:0,y:0});for(const state of ['intro','windup','attack','transition']){b.state=state;assert.equal(bossAnimation(b).owner,kind);assert.equal(bossAnimation(b).state,state);}}
});
test('attack poses follow attack ticks and current direction without restarting',()=>{
 const p=createPlayer();p.mode='attack';for(let d=0;d<8;d++){p.facing=d;assert.deepEqual(playerAnimation(p).frames,[d,d+8,d+16]);for(const [tick,row] of [[0,0],[1,0],[4,0],[5,8],[9,8],[10,16],[18,16]]){p.attackTick=tick;assert.equal(playerAttackFrame(p),d+row);}}
 p.attackTick=6;p.facing=0;assert.equal(playerAttackFrame(p),8);p.facing=4;assert.equal(playerAttackFrame(p),12);
});
test('enemy and boss states select clips and frame time depends on ticks',()=>{
 for(const kind of ['soldier','wisp','boar']){const e=createEnemy({id:'x',kind,x:0,y:0});for(const state of ['idle','chase','windup','attack','recovery','hurt','dead']){e.state=state;assert.equal(enemyAnimation(e).state,state);}}
 const boss=createBoss({id:'b',x:0,y:0});boss.state='transition';assert.equal(bossAnimation(boss).state,'transition');
 for(const kind of ['branch','root','slam'])for(const state of ['windup','attack']){boss.state=state;boss.attackKind=kind;assert.equal(bossAnimation(boss).state,`${kind}${state==='windup'?'Windup':'Attack'}`);}
 const run=ANIMATIONS['hero.run.0'];assert.equal(animationFrame(run,0),0);assert.equal(animationFrame(run,7),8);assert.equal(animationFrame(run,14),0);
});
test('forest boss attack poses map to the planned cells and their trails stay inside hitboxes',()=>{
 for(const [kind,windup,attack] of [['branch',[4,5],[6,7,8]],['root',[9,10],[11,12]],['slam',[13,14],[15,16,17]]]){
  assert.deepEqual(ANIMATIONS[`boss.${kind}Windup`].frames,windup);assert.deepEqual(ANIMATIONS[`boss.${kind}Attack`].frames,attack);
  const r={x:100,y:50,w:90,h:66},graphics={lines:[],path:[],width:1,
   lineStyle(width){this.width=width;return this;},beginPath(){this.path=[];return this;},
   moveTo(x,y){this.path.push([x,y]);return this;},lineTo(x,y){this.path.push([x,y]);return this;},
   strokePath(){this.lines.push({width:this.width,points:[...this.path]});return this;}};
  drawForestBossEffect(graphics,{state:'attack',attackKind:kind,lockedFacing:1,hitboxes:[r],telegraphs:[]});
  assert.ok(graphics.lines.length>0,`${kind} attack should draw a cue`);
  for(const line of graphics.lines)for(const [x,y] of line.points){assert.ok(x-line.width/2>=r.x&&x+line.width/2<=r.x+r.w,`${kind} cue escaped the hitbox horizontally`);assert.ok(y-line.width/2>=r.y&&y+line.width/2<=r.y+r.h,`${kind} cue escaped the hitbox vertically`);}
 }
 const r={x:40,y:80,w:48,h:48},graphics={lines:[],path:[],width:1,lineStyle(width){this.width=width;return this;},beginPath(){this.path=[];return this;},moveTo(x,y){this.path.push([x,y]);return this;},lineTo(x,y){this.path.push([x,y]);return this;},strokePath(){this.lines.push({width:this.width,points:[...this.path]});return this;}};
 drawForestBossEffect(graphics,{state:'windup',attackKind:'root',telegraphs:[r],hitboxes:[]});assert.ok(graphics.lines.length>0);
 for(const line of graphics.lines)for(const [x,y] of line.points){assert.ok(x-line.width/2>=r.x&&x+line.width/2<=r.x+r.w);assert.ok(y-line.width/2>=r.y&&y+line.width/2<=r.y+r.h);}
});
