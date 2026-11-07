import test from 'node:test';import assert from 'node:assert/strict';
import {createBoss,stepBoss,damageBoss,resetBoss} from '../src/game/sim/boss.js';
const spawn={id:'forest-guardian',x:11040,y:208},arena={left:10496,right:11472,top:0,bottom:304},player={x:10900,y:276,w:16,h:28};
test('boss intro, telegraphs and single phase transition follow fixed ticks',()=>{
 let b=createBoss(spawn);b.state='intro';b.stateTicks=90;
 for(let i=0;i<90;i++)b=stepBoss(b,player,arena).boss;assert.equal(b.state,'windup');assert.equal(b.stateTicks,60);const telegraph={...b.telegraphs[0]};
 for(let i=0;i<60;i++)b=stepBoss(b,{...player,x:11200},arena).boss;assert.equal(b.state,'attack');assert.equal(b.hitboxes[0].x,telegraph.x);
 for(let i=0;i<9;i++)b=damageBoss(b).boss;assert.equal(b.state,'transition');assert.equal(b.hitboxes.length,0);assert.equal(b.stateTicks,90);
 for(let i=0;i<90;i++)b=stepBoss(b,player,arena).boss;assert.equal(b.phase,2);assert.equal(b.stateTicks,45);assert.equal(resetBoss(spawn).hp,18);
});
test('second phase root creates a second hitbox after 30 ticks',()=>{
 let b=createBoss(spawn);Object.assign(b,{phase:2,transitioned:true,state:'recovery',stateTicks:1,cycle:0});
 b=stepBoss(b,player,arena).boss;assert.equal(b.attackKind,'root');for(let i=0;i<56;i++)b=stepBoss(b,player,arena).boss;
 assert.equal(b.state,'attack');assert.equal(b.secondRootDelay,30);for(let i=0;i<30;i++)b=stepBoss(b,player,arena).boss;
 assert.equal(b.secondRootDelay,0);assert.equal(b.hitboxes.length,1);
});
