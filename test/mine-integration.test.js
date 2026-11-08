import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
import {MINE_STAGE} from '../src/game/content/mineStage.js';
import {createMineBoss} from '../src/game/sim/mineBoss.js';
import {createStageRun, snapshotStageRun, restoreStageRun, stepStage} from '../src/game/sim/stage.js';
import {createAppStore} from '../src/game/storage/appStore.js';
import {createRunCoordinator} from '../src/game/storage/runCoordinator.js';
import {freshSave, loadSave, parseSave, SAVE_KEY} from '../src/game/storage/saveStore.js';

const input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:12000,aimY:290};
function memoryStorage(){
 const values=new Map();
 return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}
function roundTrip(run){
 const value={...freshSave(),unlockedStageIds:['forest-1','mine-1'],run:snapshotStageRun(run)};
 const parsed=parseSave(JSON.stringify(value));assert.equal(parsed.ok,true);
 return restoreStageRun(MINE_STAGE,parsed.save.run);
}

test('forest clear persists its record and mine start together; mine clear preserves both records',()=>{
 const storage=memoryStorage(),forestStore=createAppStore(()=>storage),forestEvents=new EventEmitter();
 const forest=createStageRun(FOREST_STAGE);Object.assign(forest,{elapsedTicks:3420,deaths:2,outcome:'clear'});
 const forestCoordinator=createRunCoordinator({store:forestStore}).bind({events:forestEvents,exportStageSnapshot:()=>snapshotStageRun(forest)});
 forestEvents.emit('stage:clear');
 const afterForest=loadSave(storage);assert.equal(afterForest.ok,true);
 assert.deepEqual(afterForest.save.records['forest-1'],{best:{elapsedTicks:3420,deaths:2},recent:{elapsedTicks:3420,deaths:2}});
 assert.deepEqual(afterForest.save.unlockedStageIds,['forest-1','mine-1']);
 assert.equal(afterForest.save.run.stageId,'mine-1');assert.equal(afterForest.save.run.elapsedTicks,0);assert.equal(afterForest.save.run.player.hp,3);
 const savedAfterForest=structuredClone(afterForest.save);
 forestCoordinator.flush();forestEvents.emit('stage:clear');forestCoordinator.tick();
 assert.deepEqual(loadSave(storage).save,savedAfterForest);
 forestCoordinator.dispose();

 const reopened=createAppStore(()=>storage),mine=restoreStageRun(MINE_STAGE,reopened.getSave().run);
 assert.equal(mine.stageId,'mine-1');assert.equal(mine.player.x,MINE_STAGE.spawn.x);assert.equal(mine.outcome,null);
 mine.elapsedTicks=2710;mine.deaths=1;mine.outcome='clear';
 const mineEvents=new EventEmitter(),mineCoordinator=createRunCoordinator({store:reopened}).bind({events:mineEvents,exportStageSnapshot:()=>snapshotStageRun(mine)});
 mineEvents.emit('stage:clear');
 const completed=loadSave(storage);assert.equal(completed.ok,true);assert.equal(completed.save.run,null);
 assert.deepEqual(completed.save.records['forest-1'],afterForest.save.records['forest-1']);
 assert.deepEqual(completed.save.records['mine-1'],{best:{elapsedTicks:2710,deaths:1},recent:{elapsedTicks:2710,deaths:1}});
 assert.deepEqual(completed.save.unlockedStageIds,['forest-1','mine-1']);
 mineCoordinator.dispose();
});

test('mine death save restores the countdown then resets the full encounter and rerolls cart zones',()=>{
 const storage=memoryStorage(),store=createAppStore(()=>storage),events=new EventEmitter();let run=createStageRun(MINE_STAGE,{}, {seed:5});
 const originalZones=structuredClone(run.cartZones);
 run.consumedPickupIds=['heal-1'];run.enemies[0].state='dead';run.enemies[0].hp=0;
 run.projectiles.push({id:'saved-shot',ownerId:'insect-1',x:900,y:200,w:8,h:8,vx:0,vy:0,life:20,alive:true});
 run.hazards.push({id:'saved-pool',ownerId:'insect-1',kind:'acid-pool',x:900,y:298,w:28,h:6,vx:0,vy:0,life:50,alive:true});
 Object.assign(run.boss,{state:'recovery',stateTicks:80,hp:3});run.bossDrop={rolled:true,spawned:true,consumed:false,x:11000,y:288};
 run.player.y=344;run.player.hp=1;
 const coordinator=createRunCoordinator({store}).bind({events,exportStageSnapshot:()=>snapshotStageRun(run)});
 const death=stepStage(run,input,MINE_STAGE);run=death.run;assert.ok(death.events.some(e=>e.type==='stage:death'));
 events.emit('stage:death');
 const saved=loadSave(storage);assert.equal(saved.ok,true);assert.equal(saved.save.run.deaths,1);assert.equal(saved.save.run.elapsedTicks,0);
 assert.equal(saved.save.run.player.mode,'dead');assert.equal(saved.save.run.deathTicks,60);
 const restarted=createAppStore(()=>storage);let continued=restoreStageRun(MINE_STAGE,restarted.getSave().run);
 assert.deepEqual(continued.cartZones,run.cartZones);assert.equal(continued.deaths,1);
 for(let i=0;i<60;i++)continued=stepStage(continued,input,MINE_STAGE).run;
 assert.equal(continued.player.x,MINE_STAGE.spawn.x);assert.equal(continued.player.hp,3);assert.equal(continued.elapsedTicks,0);assert.equal(continued.deaths,1);
 assert.deepEqual(continued.consumedPickupIds,[]);assert.equal(continued.enemies[0].hp,5);assert.notEqual(continued.enemies[0].state,'dead');
 assert.deepEqual(continued.projectiles,[]);assert.deepEqual(continued.hazards,[]);assert.equal(continued.boss.state,'dormant');assert.equal(continued.boss.hp,12);
 assert.deepEqual(continued.bossDrop,{rolled:false,spawned:false,consumed:false,x:0,y:0});
 assert.notDeepEqual(continued.cartZones,originalZones);assert.equal(new Set(continued.cartZones.map(z=>z.centerX)).size,5);
 assert.ok(continued.cartZones.every(z=>z.centerX>=512&&z.centerX<MINE_STAGE.world.width));
 coordinator.dispose();
});

test('mine encounters round-trip and produce identical next ticks at each dangerous save boundary',()=>{
 const states=[];
 let run=createStageRun(MINE_STAGE,{}, {seed:21});run.cartZones[0].state='warning';run.cartZones[0].ticks=1;
 states.push(['cart warning',run]);
 run=createStageRun(MINE_STAGE,{}, {seed:26});run.cartZones[0].state='active';run.cartZones[0].direction=1;run.cartZones[0].cartId='cart-1-vehicle';run.hazards=[{id:'cart-1-vehicle',ownerId:'cart-1',kind:'cart',x:700,y:284,w:32,h:20,vx:150,vy:0,life:0,alive:true}];
 states.push(['active cart',run]);
 run=createStageRun(MINE_STAGE,{}, {seed:27});run.cartZones[0].state='countdown';run.cartZones[0].ticks=600;run.cartZones[0].cartId=null;
 states.push(['cart respawn wait',run]);
 run=createStageRun(MINE_STAGE,{}, {seed:22});run.hazards=[
  {id:'shot',ownerId:'insect-1',kind:'acid-shot',x:900,y:260,w:8,h:8,vx:30,vy:80,life:50,poolTicks:120,alive:true},
  {id:'pool',ownerId:'insect-1',kind:'acid-pool',x:950,y:298,w:28,h:6,vx:0,vy:0,life:90,alive:true}
 ];states.push(['acid shot and pool',run]);
 run=createStageRun(MINE_STAGE,{}, {seed:23});run.boss.state='attack';run.boss.stateTicks=4;run.boss.attackKind='wave';run.boss.lastAttack='wave';run.hazards=[{id:'wave',ownerId:'mine-machine',kind:'wave',x:10600,y:274,w:8,h:30,vx:120,vy:0,life:500,remaining:900,alive:true}];
 states.push(['machine wave attack',run]);
 run=createStageRun(MINE_STAGE,{}, {seed:24});run.boss=createMineBoss('worm',{x:10936,y:240});run.boss.state='intro';run.boss.stateTicks=45;run.bossSequence='worm-intro';run.bossDrop={rolled:true,spawned:true,consumed:false,x:11000,y:288};
 states.push(['worm entrance and potion',run]);
 run=createStageRun(MINE_STAGE,{}, {seed:25});run.boss=createMineBoss('worm',{x:10936,y:240});Object.assign(run.boss,{phase:2,transitioned:true,state:'windup',stateTicks:20,attackKind:'burrow',targetX:11000,trailStartX:10984,burrowsLeft:1,telegraphs:[{x:10976,y:240,w:48,h:64}]});run.bossSequence='worm';run.bossDrop={rolled:true,spawned:false,consumed:false,x:0,y:0};
 states.push(['worm second-phase warning',run]);
 for(const [label,savedRun] of states)assert.deepEqual(stepStage(roundTrip(savedRun),input,MINE_STAGE),stepStage(savedRun,input,MINE_STAGE),label);
});

test('mine enemy, both bosses, cart and shockwave each deal one heart and then respect invulnerability',()=>{
 const cases=[];
 let run=createStageRun(MINE_STAGE,{}, {seed:31});run.enemies=[{id:'golem-contact',kind:'golem',x:120,y:276,w:32,h:40,hp:5,maxHp:5,state:'hurt',stateTicks:50,homeY:276,lockedFacing:1,shotCount:0,hitIds:new Set()}];cases.push(['golem',run]);
 for(const kind of ['machine','worm']){
  run=createStageRun(MINE_STAGE,{}, {seed:32});run.enemies=[];run.boss=createMineBoss(kind,{x:120,y:276});run.boss.state='recovery';run.boss.stateTicks=80;run.bossSequence=kind==='machine'?'machine':'worm';cases.push([kind,run]);
 }
 run=createStageRun(MINE_STAGE,{}, {seed:33});run.enemies=[];run.player.x=780;run.cartZones[0]={...run.cartZones[0],centerX:700,direction:-1,state:'active',ticks:0,cartId:'test-cart'};run.hazards=[{id:'test-cart',ownerId:'cart-1',kind:'cart',x:796,y:284,w:32,h:20,vx:-150,vy:0,life:0,alive:true}];cases.push(['cart',run]);
 run=createStageRun(MINE_STAGE,{}, {seed:34});run.enemies=[];run.hazards=[{id:'test-wave',ownerId:'golem-1',kind:'wave',x:112,y:274,w:8,h:30,vx:120,vy:0,life:60,remaining:120,alive:true}];cases.push(['shockwave',run]);
 for(const [source,initial] of cases){
  const first=stepStage(initial,input,MINE_STAGE);assert.equal(first.run.player.hp,2,source);
  assert.ok(first.events.some(e=>e.type==='hurt'),source);
  const second=stepStage(first.run,input,MINE_STAGE);assert.equal(second.run.player.hp,2,source);
 }
});
