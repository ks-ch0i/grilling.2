import test from 'node:test';import assert from 'node:assert/strict';import {ANIMATIONS} from '../src/game/assets/manifest.js';
import {playerAnimation,enemyAnimation,bossAnimation,animationFrame,playerAttackFrame} from '../src/game/assets/animation.js';
import {createPlayer} from '../src/game/sim/player.js';import {createEnemy} from '../src/game/sim/enemies.js';import {createBoss} from '../src/game/sim/boss.js';
import {createMineBoss} from '../src/game/sim/mineBoss.js';
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
 const boss=createBoss({id:'b',x:0,y:0});boss.state='transition';assert.equal(bossAnimation(boss).state,'transition');boss.state='windup';boss.attackKind='root';assert.equal(bossAnimation(boss).state,'root');
 const run=ANIMATIONS['hero.run.0'];assert.equal(animationFrame(run,0),0);assert.equal(animationFrame(run,7),8);assert.equal(animationFrame(run,14),0);
});
