import test from 'node:test';import assert from 'node:assert/strict';
import {createEnemy,stepEnemy,stepProjectile,damageEnemy,enemyAttackRect} from '../src/game/sim/enemies.js';
const ground=[{x:0,y:304,w:200,h:56}];const p={x:80,y:276,w:16,h:28,mode:'idle'};
test('soldier locks direction during windup and cancels on damage',()=>{
 let e=createEnemy({id:'a',kind:'soldier',x:110,y:276});e=stepEnemy(e,p,ground).enemy;assert.equal(e.state,'windup');assert.equal(e.lockedFacing,-1);
 for(let i=0;i<30;i++)e=stepEnemy(e,{...p,x:180},ground).enemy;
 assert.equal(e.state,'attack');assert.equal(e.facing,-1);assert.ok(enemyAttackRect(e).x<e.x);
 e=damageEnemy(e);assert.equal(e.state,'hurt');assert.equal(enemyAttackRect(e),null);
});
test('wisp shoots once toward the locked target and projectile ends on collision',()=>{
 let e=createEnemy({id:'w',kind:'wisp',x:100,y:284});e=stepEnemy(e,p,ground).enemy;let shots=[];
 for(let i=0;i<36;i++){const r=stepEnemy(e,{...p,x:190},ground);e=r.enemy;shots.push(...r.projectiles);}
 assert.equal(shots.length,1);assert.ok(shots[0].vx<0);
 let projectile=shots[0];for(let i=0;i<40&&projectile.alive;i++)projectile=stepProjectile(projectile,ground,p).projectile;assert.equal(projectile.alive,false);
});
test('boar charge stops at a ledge, and death hides enemy after 30 ticks',()=>{
 let e=createEnemy({id:'b',kind:'boar',x:166,y:284});e=stepEnemy(e,{...p,x:195},ground).enemy;
 for(let i=0;i<45;i++)e=stepEnemy(e,{...p,x:195},ground).enemy;
 assert.equal(e.state,'recovery');assert.ok(e.x+e.w<=200);
 e=damageEnemy(damageEnemy(damageEnemy(e)));assert.equal(e.state,'dead');for(let i=0;i<30;i++)e=stepEnemy(e,p,ground).enemy;assert.equal(e.visible,false);
});
