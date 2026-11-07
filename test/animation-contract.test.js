import test from 'node:test';import assert from 'node:assert/strict';import {ANIMATIONS} from '../src/game/assets/manifest.js';
import {playerAnimation,enemyAnimation,bossAnimation,animationFrame} from '../src/game/assets/animation.js';
import {createPlayer} from '../src/game/sim/player.js';import {createEnemy} from '../src/game/sim/enemies.js';import {createBoss} from '../src/game/sim/boss.js';
test('hero has all 8 directions for idle, walking and attack',()=>{
 const p=createPlayer();for(let direction=0;direction<8;direction++){p.facing=direction;p.mode='idle';assert.equal(playerAnimation(p).frames[0],direction);p.mode='run';assert.equal(playerAnimation(p).direction,direction);assert.deepEqual(playerAnimation(p).frames,[direction,direction+8]);p.mode='attack';assert.equal(playerAnimation(p).frames[0],direction);}
 for(const mode of ['run','jump','fall','roll','dive','hurt','dead']){p.mode=mode;p.facing=0;assert.equal(playerAnimation(p).state,mode);}
});
test('enemy and boss states select clips and frame time depends on ticks',()=>{
 for(const kind of ['soldier','wisp','boar']){const e=createEnemy({id:'x',kind,x:0,y:0});for(const state of ['idle','chase','windup','attack','recovery','hurt','dead']){e.state=state;assert.equal(enemyAnimation(e).state,state);}}
 const boss=createBoss({id:'b',x:0,y:0});boss.state='transition';assert.equal(bossAnimation(boss).state,'transition');boss.state='windup';boss.attackKind='root';assert.equal(bossAnimation(boss).state,'root');
 const run=ANIMATIONS['hero.run.0'];assert.equal(animationFrame(run,0),0);assert.equal(animationFrame(run,7),8);assert.equal(animationFrame(run,14),0);
});
