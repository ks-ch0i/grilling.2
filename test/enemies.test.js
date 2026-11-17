import test from 'node:test';import assert from 'node:assert/strict';
import {createEnemy,stepEnemy,stepProjectile,damageEnemy,enemyAttackRect} from '../src/game/sim/enemies.js';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
const ground=[{x:0,y:304,w:200,h:56}];const p={x:80,y:276,w:16,h:28,mode:'idle'};
const stageApi=await import('../src/game/sim/stage.js').catch(()=>({}));
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
test('ranged geometry omits platforms but retains world and arena-lock walls',()=>{
 assert.equal(typeof stageApi.stageRangedTerrain,'function');
 const layout={mode:'random',platforms:[{x:64,y:200,w:64,h:16}]};
 const full=stageApi.stageTerrain(FOREST_STAGE,false,layout),ranged=stageApi.stageRangedTerrain(FOREST_STAGE,false);
 assert.ok(full.some(rect=>rect.x===64&&rect.y===200));
 assert.equal(ranged.some(rect=>rect.x===64&&rect.y===200),false);
 assert.ok(ranged.some(rect=>rect.x===-16&&rect.w===16));
 assert.ok(ranged.some(rect=>rect.x===FOREST_STAGE.world.width&&rect.w===16));
 const locked=stageApi.stageRangedTerrain(FOREST_STAGE,true);
 assert.ok(locked.some(rect=>rect.x===FOREST_STAGE.arena.left&&rect.w===16));
 assert.ok(locked.some(rect=>rect.x===FOREST_STAGE.arena.right&&rect.w===16));
 const projectile={id:'crossing-shot',ownerId:'wisp',x:40,y:204,w:8,h:8,vx:1200,vy:0,life:60,alive:true};
 let current=projectile,events=[];for(let i=0;i<10&&current.alive;i++){const hit=stepProjectile(current,ranged,{x:140,y:200,w:16,h:28,mode:'idle'});current=hit.projectile;events.push(...hit.events);}
 assert.equal(current.alive,false);assert.deepEqual(events,[{type:'projectile:hit',ownerId:'wisp'}]);
 const wall=stepProjectile({...projectile,id:'wall-shot',x:632},ranged,{...p,mode:'dead'});
 assert.equal(wall.projectile.alive,false);assert.equal(wall.events.length,0);
});
test('boar charge stops at a ledge, and death hides enemy after 30 ticks',()=>{
 let e=createEnemy({id:'b',kind:'boar',x:166,y:284});e=stepEnemy(e,{...p,x:195},ground).enemy;
 for(let i=0;i<45;i++)e=stepEnemy(e,{...p,x:195},ground).enemy;
 assert.equal(e.state,'recovery');assert.ok(e.x+e.w<=200);
 e=damageEnemy(damageEnemy(damageEnemy(e)));assert.equal(e.state,'dead');for(let i=0;i<30;i++)e=stepEnemy(e,p,ground).enemy;assert.equal(e.visible,false);
});
