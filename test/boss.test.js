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
 b=stepBoss(b,player,arena).boss;assert.equal(b.attackKind,'root');for(let i=0;i<54;i++)b=stepBoss(b,player,arena).boss;
 assert.equal(b.state,'attack');assert.equal(b.secondRootDelay,30);for(let i=0;i<30;i++)b=stepBoss(b,player,arena).boss;
 assert.equal(b.secondRootDelay,0);assert.equal(b.hitboxes.length,1);
});
test('roots use a distinct ground contact followed by phase-specific delays and locked targets',()=>{
 for(const phase of [1,2]){
  let b=createBoss(spawn);Object.assign(b,{phase,transitioned:phase===2,state:'recovery',stateTicks:1,cycle:0});b=stepBoss(b,player,arena).boss;
  const first={...b.telegraphs[0]},timeline=[],end=phase===1?84:84;
  for(let tick=1;tick<=end;tick++){
   const next=stepBoss(b,{...player,x:11150},arena);b=next.boss;
   for(const event of next.events)if(event.type.startsWith('boss:root-'))timeline.push({tick,...event});
  }
  assert.deepEqual(timeline.filter(e=>e.type==='boss:root-ground').map(e=>e.tick),[24]);
  assert.deepEqual(timeline.filter(e=>e.type==='boss:root-erupt').map(e=>e.tick),phase===1?[84]:[54,84]);
  const hits=timeline.filter(e=>e.type==='boss:root-erupt');assert.equal(hits[0].x,first.x);
  if(phase===2){assert.notEqual(hits[1].x,hits[0].x);assert.equal(b.state,'recovery');assert.equal(b.rootEffects[0].strike,2);assert.equal(b.rootEffects[0].age,0);}
 }
});
test('phase change and death cancel pending roots and their independent effects',()=>{
 let b=createBoss(spawn);Object.assign(b,{state:'recovery',attackKind:'root',hp:10,secondRootDelay:20,secondRoot:{x:10900,y:256,w:48,h:48},rootEffects:[{x:10900,y:256,w:48,h:48,age:6,strike:1}]});
 const transition=damageBoss(b).boss;assert.deepEqual(transition.rootEffects,[]);assert.equal(transition.secondRootDelay,0);assert.ok(b.rootEffects.length);
 const dying=damageBoss({...b,hp:1}).boss;assert.deepEqual(dying.rootEffects,[]);assert.equal(dying.secondRoot,null);
});
