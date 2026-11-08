import test from 'node:test';import assert from 'node:assert/strict';
import {createEnemy,stepEnemy,damageEnemy} from '../src/game/sim/enemies.js';import {stepHazards} from '../src/game/sim/hazards.js';
const floor=[{x:0,y:304,w:1000,h:56}];const player={x:840,y:276,w:16,h:28,mode:'idle'};
function attack(enemy,p=player,terrain=floor){let shots=[];for(let i=0;i<100;i++){const result=stepEnemy(enemy,p,terrain);enemy=result.enemy;shots.push(...result.hazards);if(shots.length||enemy.state==='attack')break;}return {enemy,shots};}
test('mine enemies have specified health and golem creates opposite waves',()=>{
 for(const [kind,hp] of [['golem',5],['insect',3],['bat',2]]){let e=createEnemy({id:kind,kind,x:800,y:kind==='golem'?264:kind==='insect'?280:180});assert.equal(e.hp,hp);for(let i=0;i<hp;i++)e=damageEnemy(e);assert.equal(e.state,'dead');}
 const {shots}=attack(createEnemy({id:'g',kind:'golem',x:800,y:264}));assert.equal(shots.length,2);assert.deepEqual(shots.map(s=>s.vx),[-120,120]);assert.ok(shots.every(s=>s.remaining===120));
});
test('waves stop at their range, a ledge, or a wall',()=>{
 const base={id:'w',ownerId:'g',kind:'wave',x:100,y:296,w:8,h:8,vx:120,vy:0,life:60,alive:true,remaining:120},far={...player,x:900};
 let h=[base];for(let i=0;i<59;i++)h=stepHazards(h,far,floor).hazards;assert.equal(h.length,1);assert.equal(h[0].x,218);assert.equal(stepHazards(h,far,floor).hazards.length,0);
 const ledge=[{x:0,y:304,w:120,h:56}];h=[{...base,x:110}];assert.equal(stepHazards(h,far,ledge).hazards.length,0);
 const wall=[...floor,{x:120,y:200,w:16,h:104}];h=[{...base,x:110}];h=stepHazards(h,far,wall).hazards;assert.equal(stepHazards(h,far,wall).hazards.length,0);
});
test('acid arcs and leaves a 120 tick puddle; persistent contact emits repeated hit opportunities',()=>{
 const {shots}=attack(createEnemy({id:'i',kind:'insect',x:200,y:280}),{...player,x:300});assert.equal(shots.length,1);assert.equal(shots[0].vy,-180);
 let h=shots;for(let i=0;i<180&&h[0]?.kind!=='acid-pool';i++)h=stepHazards(h,{...player,x:900},floor).hazards;
 assert.equal(h[0].kind,'acid-pool');assert.equal(h[0].life,120);const target={...player,x:h[0].x,y:276};assert.equal(stepHazards(h,target,floor).events.filter(e=>e.type==='hazard:hit').length,1);
 for(let i=0;i<120;i++)h=stepHazards(h,{...player,x:900},floor).hazards;assert.equal(h.length,0);
});
test('bat keeps the windup target and returns to its original height',()=>{
 let e=createEnemy({id:'b',kind:'bat',x:200,y:180}),p={...player,x:240};e=stepEnemy(e,p,floor).enemy;const locked={...e.lockedTarget};
 p={...p,x:500};for(let i=0;i<40;i++)e=stepEnemy(e,p,floor).enemy;assert.deepEqual(e.lockedTarget,locked);assert.equal(e.state,'attack');
 for(let i=0;i<200&&e.state!=='recovery';i++)e=stepEnemy(e,p,floor).enemy;assert.equal(e.state,'recovery');assert.equal(e.y,180);
});
