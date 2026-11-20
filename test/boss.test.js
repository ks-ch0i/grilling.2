import test from 'node:test';import assert from 'node:assert/strict';
import {createBoss,stepBoss,damageBoss,resetBoss} from '../src/game/sim/boss.js';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
import {ARENA_PLATFORM_PRESETS} from '../src/game/content/arenaPlatformPresets.js';
import {platformTopY} from '../src/game/sim/platforms.js';
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
test('root targets use the nearest eligible profile or rectangle surface beneath the player',()=>{
 const beginRoot=(target,platforms=[],phase=1)=>{
  let boss=createBoss(spawn);Object.assign(boss,{phase,transitioned:phase===2,state:'recovery',stateTicks:1,cycle:0});
  return stepBoss(boss,target,arena,platforms).boss.telegraphs[0];
 };
 const profile={x:10896,w:64,topProfile:[248,260,256,260],variant:0};
 const boundaryPlayer={x:10904,y:224,w:16,h:28};
 const selected=beginRoot(boundaryPlayer,[profile]);
 assert.equal(selected.x,10888);
 assert.equal(selected.y,212,'the player center is exactly on the next 16px profile section');

 const standing=beginRoot({x:10896,y:232,w:16,h:28},[{x:10896,w:64,topProfile:[260,264,260,264],variant:1}]);
 assert.equal(standing.y,212,'a surface at the player feet is eligible');
 const airborne=beginRoot({x:10896,y:220,w:16,h:28},[{x:10896,w:64,topProfile:[260,264,260,264],variant:1}]);
 assert.equal(airborne.y,212,'the first profile surface below an airborne player is selected');
 const higher=beginRoot({x:10896,y:242,w:16,h:28},[{x:10896,w:64,topProfile:[260,264,260,264],variant:1}]);
 assert.equal(higher.y,arena.bottom-48,'a surface above the player feet is ignored');
 const absent=beginRoot({x:10896,y:232,w:16,h:28},[{x:11000,w:64,topProfile:[260,260,260,260],variant:0}]);
 assert.equal(absent.y,arena.bottom-48,'the floor is used when no surface lies below the player x');
 const legacy=beginRoot({x:10896,y:228,w:16,h:28},[{x:10880,y:256,w:64,h:16}]);
 assert.equal(legacy.y,208,'legacy rectangular platform tops remain eligible');

 const clamped=beginRoot({x:arena.left,y:224,w:16,h:28},[{x:arena.left+32,w:32,topProfile:[260,260],variant:0}]);
 assert.equal(clamped.x,arena.left+16);
 assert.equal(clamped.y,212,'surface lookup follows the clamped root center at the arena edge');
 assert.equal(beginRoot({x:11500,y:276,w:16,h:28}).x,arena.right-48);
});
test('phase-two additional root locks its new surface at warning start and reuses it at impact',()=>{
 const firstProfile={x:10896,w:64,topProfile:[260,260,260,260],variant:0};
 const secondProfile={x:11040,w:64,topProfile:[272,272,272,272],variant:1};
 const profiles=[firstProfile,secondProfile],firstPlayer={x:10896,y:232,w:16,h:28},secondPlayer={x:11040,y:244,w:16,h:28};
 let boss=createBoss(spawn);Object.assign(boss,{phase:2,transitioned:true,state:'recovery',stateTicks:1,cycle:0});
 boss=stepBoss(boss,firstPlayer,arena,profiles).boss;const firstWarning={...boss.telegraphs[0]};
 for(let i=0;i<53;i++)boss=stepBoss(boss,firstPlayer,arena,profiles).boss;
 boss=stepBoss(boss,secondPlayer,arena,profiles).boss;
 const secondWarning={...boss.secondRoot};
 assert.deepEqual(boss.hitboxes[0],{...firstWarning,ticks:12});
 assert.equal(secondWarning.y,secondProfile.topProfile[0]-48);
 assert.deepEqual(boss.telegraphs,[secondWarning]);
 const locked={...secondWarning};
 for(let i=0;i<30;i++)boss=stepBoss(boss,{...secondPlayer,x:10496},arena,profiles).boss;
 assert.equal(boss.secondRootDelay,0);
 assert.ok(boss.hitboxes.some(({ticks,...box})=>ticks===12&&JSON.stringify(box)===JSON.stringify(locked)));
 assert.ok(boss.rootEffects.some(({age,strike,...box})=>age===0&&strike===2&&JSON.stringify(box)===JSON.stringify(locked)));
});
test('phase-two roots lock and erupt on the active layer of the authored Forest terraces',()=>{
 const stage=FOREST_STAGE,surfaces=ARENA_PLATFORM_PRESETS[stage.id][1].platforms,[lower,upper]=surfaces;
 const targetX=248;
 const lowerY=platformTopY(lower,targetX),upperY=platformTopY(upper,targetX),floorY=stage.solids[0].y;
 const onLayer=y=>({x:targetX-8,y:y-28,w:16,h:28});
 for(const [firstY,secondY] of [[lowerY,upperY],[upperY,lowerY],[floorY,lowerY]]){
  let boss=createBoss(stage.boss);Object.assign(boss,{phase:2,transitioned:true,state:'recovery',stateTicks:1,cycle:0});
  boss=stepBoss(boss,onLayer(firstY),stage.arena,surfaces).boss;
  const first={...boss.telegraphs[0]};
  assert.deepEqual(first,{x:targetX-24,y:firstY-48,w:48,h:48});
  for(let tick=0;tick<53;tick++)boss=stepBoss(boss,onLayer(secondY),stage.arena,surfaces).boss;
  let result=stepBoss(boss,onLayer(secondY),stage.arena,surfaces);boss=result.boss;
  assert.deepEqual(result.events.find(event=>event.type==='boss:root-erupt'),{type:'boss:root-erupt',strike:1,...first});
  assert.deepEqual(boss.hitboxes[0],{...first,ticks:12});
  const second={...boss.telegraphs[0]};
  assert.deepEqual(second,{x:targetX-24,y:secondY-48,w:48,h:48});
  for(let tick=0;tick<30;tick++){
   result=stepBoss(boss,onLayer(floorY),stage.arena,surfaces);boss=result.boss;
  }
  assert.deepEqual(result.events.find(event=>event.type==='boss:root-erupt'),{type:'boss:root-erupt',strike:2,...second});
  assert.deepEqual(boss.hitboxes[0],{...second,ticks:12});
 }
});
test('phase change and death cancel pending roots and their independent effects',()=>{
 let b=createBoss(spawn);Object.assign(b,{state:'recovery',attackKind:'root',hp:10,secondRootDelay:20,secondRoot:{x:10900,y:256,w:48,h:48},rootEffects:[{x:10900,y:256,w:48,h:48,age:6,strike:1}]});
 const transition=damageBoss(b).boss;assert.deepEqual(transition.rootEffects,[]);assert.equal(transition.secondRootDelay,0);assert.ok(b.rootEffects.length);
 const dying=damageBoss({...b,hp:1}).boss;assert.deepEqual(dying.rootEffects,[]);assert.equal(dying.secondRoot,null);
});
test('phase-1-only rounds keep Guardian attacks active until defeated',()=>{
 let b=createBoss(spawn);Object.assign(b,{state:'recovery',stateTicks:20,hp:10});
 for(let i=0;i<9;i++){const result=damageBoss(b,1,{allowPhaseTransition:false});b=result.boss;assert.equal(result.events.some(event=>event.type==='boss:transition'),false);assert.equal(b.phase,1);assert.equal(b.state,'recovery');}
 const defeated=damageBoss(b,1,{allowPhaseTransition:false});assert.equal(defeated.boss.hp,0);assert.equal(defeated.boss.state,'dying');
});
