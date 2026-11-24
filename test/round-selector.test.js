import test from 'node:test';
import assert from 'node:assert/strict';
import {isRoundSelectorEnabled,ROUND_TARGETS,createPracticeRun} from '../src/game/dev/roundSelector.js';
import {snapshotStageRun,restoreStageRun,stepStage} from '../src/game/sim/stage.js';
import {getStage} from '../src/game/content/stages.js';
import {freshSave,parseSave} from '../src/game/storage/saveStore.js';
import {stageTerrain} from '../src/game/sim/stage.js';
import {createRoundEnemies} from '../src/game/sim/rounds.js';
const platformApi=await import('../src/game/sim/platforms.js').catch(()=>({}));
const visualApi=await import('../src/game/assets/manifest.js');
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

const input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:320,aimY:290};
test('round selector is available only in development and can be disabled',()=>{
 assert.equal(isRoundSelectorEnabled({development:true,enabled:true}),true);
 assert.equal(isRoundSelectorEnabled({development:true,enabled:false}),false);
 assert.equal(isRoundSelectorEnabled({development:false,enabled:true}),false);
 assert.equal(isRoundSelectorEnabled(),false);
});
test('stage and boss practice targets start with full health and valid state',()=>{
 assert.deepEqual(ROUND_TARGETS.map(t=>t.id),['forest-start','forest-boss','mine-start','mine-machine','mine-worm']);
 for(const target of ROUND_TARGETS){
  const run=createPracticeRun(target.id,{seed:1}),stage=getStage(target.stageId),snapshot=snapshotStageRun(run);
  assert.equal(run.player.hp,3);assert.equal(run.stageId,target.stageId);
  assert.equal(run.round,target.id==='mine-worm'?8:target.id.endsWith('-boss')||target.id==='mine-machine'?5:1);
  assert.deepEqual(snapshotStageRun(restoreStageRun(stage,JSON.parse(JSON.stringify(snapshot)))),snapshot);
  if(target.id.endsWith('-start'))assert.equal(run.player.x,stage.spawn.x);
  else assert.ok(run.player.x>=stage.arena.left+16);
  if(target.id==='mine-worm'){assert.equal(run.boss.kind,'worm');assert.equal(run.bossSequence,'worm-intro');assert.equal(run.boss.stateTicks,240);}
  if(target.id==='mine-machine'){assert.equal(run.boss.kind,'machine');assert.equal(run.bossSequence,'machine');assert.equal(run.enemies.length,0);}
  if(target.id==='mine-worm')assert.equal(run.enemies.length,3);
    const solids=stageTerrain(stage,false,run.terrainLayout);
    if(run.terrainLayout.platforms[0]?.topProfile)assert.deepEqual(solids[0],stage.solids[0]);
    else assert.deepEqual(solids.slice(0,run.terrainLayout.platforms.length+1),[stage.solids[0],...run.terrainLayout.platforms]);
    for(const enemy of run.enemies){
      if(enemy.kind==='bat')continue;
      const rectSupport=solids.some(solid=>enemy.x<solid.x+solid.w&&enemy.x+enemy.w>solid.x&&solid.y===enemy.y+enemy.h);
      const center=enemy.x+enemy.w/2;
      const profileSupport=run.terrainLayout.platforms.some(platform=>platform.topProfile&&platformApi.platformTopY(platform,center)===enemy.y+enemy.h);
      assert.ok(rectSupport||profileSupport,`${target.id}:${enemy.id}`);
    }
  assert.doesNotThrow(()=>stepStage(run,input,stage));
 }
 assert.throws(()=>createPracticeRun('unknown'),TypeError);
});
test('round spawns can use profile supports when no floor is beneath the candidate x',()=>{
 const original=getStage('mine-1'),stage={...original,solids:[{x:0,y:304,w:16,h:56}],enemies:original.enemies.map(enemy=>({...enemy,x:128}))};
 const profile={x:96,w:112,topProfile:Array(7).fill(260),variant:0};
 const result=createRoundEnemies(stage,7,123,{platformProfiles:[profile]});
 for(const enemy of result.enemies.filter(value=>['golem','insect'].includes(value.kind))){
  assert.equal(platformApi.platformTopY(profile,enemy.x+enemy.w/2),enemy.y+enemy.h,enemy.kind);
 }
});
test('new Forest boars use the fixed floor even when their preferred x overlaps a platform',()=>{
 const forest=getStage('forest-1'),floor=forest.solids[0],profile={x:352,w:96,topProfile:Array(6).fill(260),variant:0};
 const enemies=forest.enemies.map(enemy=>enemy.kind==='boar'?{...enemy,x:400,y:240}:enemy);
 const profileStage={...forest,solids:[floor],enemies};
 const profiled=createRoundEnemies(profileStage,7,123,{platformProfiles:[profile]}).enemies.find(enemy=>enemy.kind==='boar');
 assert.ok(profiled.x<profile.x+profile.w&&profiled.x+profiled.w>profile.x);
 assert.equal(profiled.y,floor.y-profiled.h);

 const legacyStage={...forest,solids:[floor,{x:352,y:256,w:96,h:16}],enemies:enemies.map(enemy=>enemy.kind==='boar'?{...enemy,y:236}:enemy)};
 const legacy=createRoundEnemies(legacyStage,7,123).enemies.find(enemy=>enemy.kind==='boar');
 assert.equal(legacy.y,floor.y-legacy.h);
});
test('Forest boar floor-only spawning retains the no-safe-spawn error',()=>{
 const forest=getStage('forest-1'),boar=forest.enemies.find(enemy=>enemy.kind==='boar');
 const stage={...forest,solids:[forest.solids[0]],enemies:[boar,boar,boar]};
 assert.throws(()=>createRoundEnemies(stage,1,123,{player:{x:0,y:0,w:640,h:360},platformProfiles:[{x:352,w:96,topProfile:Array(6).fill(260),variant:0}]}),/No visually safe arena spawn layout is available/);
});
test('round placement retries visual overlaps without changing the chosen roster or gameplay RNG',()=>{
 const stage=getStage('forest-1'),player={x:280,y:276,w:16,h:28},seed=123;
 const first=createRoundEnemies(stage,7,seed,{player}),again=createRoundEnemies(stage,7,seed,{player});
 assert.deepEqual(first.enemies.map(({kind,x,y})=>({kind,x,y})),again.enemies.map(({kind,x,y})=>({kind,x,y})));
 assert.deepEqual(first.enemies.map(enemy=>enemy.kind),stage.enemies.map(enemy=>enemy.kind));
 assert.equal(first.rngState,seed);
 const playerVisual=visualApi.actorVisualBounds(player,'hero-directions',visualApi.ACTOR_OUTLINE_SCALES.player);
 for(const enemy of first.enemies){
  assert.equal(overlaps(enemy,player),false,`${enemy.kind} collision rectangle`);
  assert.equal(overlaps(visualApi.actorVisualBounds(enemy,enemy.kind,visualApi.ACTOR_OUTLINE_SCALES.enemy),playerVisual),false,`${enemy.kind} artwork`);
 }
 assert.notEqual(first.enemies.find(enemy=>enemy.kind==='wisp').x,stage.enemies.find(enemy=>enemy.kind==='wisp').x,'preferred wisp position overlaps player artwork');
});
test('creating practice rounds does not change the saved run or records',()=>{
 const save=freshSave(),before=JSON.stringify(save);
 for(const target of ROUND_TARGETS)createPracticeRun(target.id,{seed:123});
 assert.equal(JSON.stringify(save),before);assert.equal(parseSave(before).ok,true);
});
