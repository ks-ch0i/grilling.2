import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
import {MINE_STAGE} from '../src/game/content/mineStage.js';
import {createStageRun,stepStage,restoreStageRun,snapshotStageRun,stageTerrain} from '../src/game/sim/stage.js';
import {createEnemy} from '../src/game/sim/enemies.js';
import {roundEnemyCount,isBossRound,ROUND_COUNT,ROUND_CLEAR_TICKS} from '../src/game/sim/rounds.js';

const input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:320,aimY:290};
const tick=(run,stage,n=1)=>{let events=[];for(let i=0;i<n;i++){const result=stepStage(run,input,stage);run=result.run;events.push(...result.events);}return {run,events};};
function defeatRound(run,stage){
  for(const enemy of run.enemies){enemy.hp=0;enemy.state='dead';}
  if(isBossRound(stage.id,run.round)){run.boss.hp=0;run.boss.state='dead';run.boss.stateTicks=0;run.boss.hitboxes=[];run.boss.telegraphs=[];}
  return run;
}
function advanceTo(stage,target,seed=9){
  let run=createStageRun(stage,{}, {seed});
  while(run.round<target){
    if(run.roundClearTicks===null){run=defeatRound(run,stage);run=tick(run,stage).run;assert.equal(run.roundClearTicks,ROUND_CLEAR_TICKS);}
    run=tick(run,stage,run.roundClearTicks).run;
  }
  return run;
}

test('round schedule is fixed and rejects rounds outside the stage',()=>{
  assert.deepEqual(Array.from({length:ROUND_COUNT},(_,i)=>roundEnemyCount(i+1)),[1,2,3,4,0,6,3,3]);
  assert.throws(()=>roundEnemyCount(0),RangeError);assert.throws(()=>roundEnemyCount(9),RangeError);
  for(const stage of [FOREST_STAGE,MINE_STAGE])for(const round of [5,7,8])assert.equal(isBossRound(stage.id,round),true);
});

test('fresh runs may start at a selected round while snapshot restores keep their saved round',()=>{
  for(const stage of [FOREST_STAGE,MINE_STAGE]){
    const defaultRun=createStageRun(stage,{}, {seed:63});
    assert.equal(defaultRun.round,1);assert.equal(defaultRun.elapsedTicks,0);assert.equal(defaultRun.player.hp,3);
    for(let round=1;round<=ROUND_COUNT;round++){
      const run=createStageRun(stage,{}, {seed:63,startRound:round});
      assert.equal(run.round,round);assert.equal(run.elapsedTicks,0);assert.equal(run.deaths,0);assert.equal(run.player.hp,3);
      assert.equal(run.enemies.length,roundEnemyCount(round));
      assert.equal(run.boss.state,isBossRound(stage.id,round)?'intro':'dormant');
      if(stage===MINE_STAGE)assert.equal(run.bossSequence,isBossRound(stage.id,round)?'machine':'none');
      if(round===7||round===8)assert.deepEqual([...new Set(run.enemies.map(enemy=>enemy.kind))].sort(),stage.enemies.map(enemy=>enemy.kind).sort());
    }
    const saved=createStageRun(stage,{}, {seed:63,startRound:6});
    const continued=createStageRun(stage,snapshotStageRun(saved),{startRound:8});
    assert.equal(continued.round,6);
  }
  for(const round of [0,9,1.5])assert.throws(()=>createStageRun(FOREST_STAGE,{}, {startRound:round}),RangeError);
});

test('a fresh run retains its exact platform layout through all eight rounds',()=>{
  for(const stage of [FOREST_STAGE,MINE_STAGE]){
    const expected=createStageRun(stage,{}, {seed:91}).terrainLayout;
    for(let round=1;round<=ROUND_COUNT;round++)assert.deepEqual(advanceTo(stage,round,91).terrainLayout,expected);
  }
});

test('round waves use stage species, one of each species on rounds 7 and 8, and safe arena positions',()=>{
  for(const stage of [FOREST_STAGE,MINE_STAGE]){
    const allowed=stage.enemies.map(enemy=>enemy.kind);
    for(const round of [1,2,3,4,6,7,8]){
      const run=advanceTo(stage,round,1234);
      assert.equal(run.enemies.length,roundEnemyCount(round),`${stage.id} round ${round}`);
      assert.ok(run.enemies.every(enemy=>allowed.includes(enemy.kind)));
      assert.equal(new Set(run.enemies.map(enemy=>enemy.id)).size,run.enemies.length);
      assert.ok(run.enemies.every(enemy=>enemy.x>=stage.arena.left&&enemy.x+enemy.w<=stage.arena.right&&enemy.y>=stage.arena.top&&enemy.y+enemy.h<=stage.arena.bottom));
      for(let i=0;i<run.enemies.length;i++)for(let j=i+1;j<run.enemies.length;j++){
        const a=run.enemies[i],b=run.enemies[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
      }
      if(round===7||round===8)assert.deepEqual([...run.enemies.map(enemy=>enemy.kind)].sort(),[...allowed].sort());
    }
    for(const round of [5,7,8]){
      const run=advanceTo(stage,round,1234);assert.equal(run.boss.state,'intro');
      if(stage===MINE_STAGE)assert.equal(run.boss.kind,'machine');
    }
  }
});

test('a cleared round waits 120 ticks, then starts the next wave at full health',()=>{
  let run=createStageRun(FOREST_STAGE,{}, {seed:14});run.player.hp=1;
  run=defeatRound(run,FOREST_STAGE);let result=tick(run,FOREST_STAGE);
  assert.equal(result.run.round,1);assert.equal(result.run.roundClearTicks,ROUND_CLEAR_TICKS);assert.equal(result.run.player.hp,1);
  result=tick(result.run,FOREST_STAGE,ROUND_CLEAR_TICKS-1);assert.equal(result.run.round,1);assert.equal(result.run.roundClearTicks,1);
  result=tick(result.run,FOREST_STAGE);assert.equal(result.run.round,2);assert.equal(result.run.roundClearTicks,null);assert.equal(result.run.player.hp,3);assert.equal(result.run.enemies.length,2);
  assert.ok(result.events.some(event=>event.type==='round:start'&&event.round===2));
});

test('Guardian keeps phase 1 in rounds 5 and 7, then transitions normally in round 8',()=>{
  for(const round of [5,7,8]){
    const run=advanceTo(FOREST_STAGE,round,17);run.enemies=[];
    Object.assign(run.boss,{state:'recovery',stateTicks:100,hp:10,phase:1,transitioned:false});
    Object.assign(run.player,{x:480,y:276,grounded:true,mode:'attack',attackTick:4,aim:{x:1,y:0}});
    const result=stepStage(run,{...input,aimX:550},FOREST_STAGE);
    assert.equal(result.run.boss.hp,9);assert.equal(result.run.boss.phase,1);
    assert.equal(result.run.boss.state,round===8?'transition':'recovery');
  }
});

test('death restarts round 1, adds one death, and keeps the stage elapsed time',()=>{
  let run=advanceTo(FOREST_STAGE,6,27);run.elapsedTicks=500;run.player.y=FOREST_STAGE.pitDeathY;
  const previousTerrain=structuredClone(run.terrainLayout);
  let result=tick(run,FOREST_STAGE);assert.equal(result.run.player.mode,'dead');assert.equal(result.run.deaths,1);assert.equal(result.run.elapsedTicks,501);
  const saved=JSON.parse(JSON.stringify(snapshotStageRun(result.run))),restored=restoreStageRun(FOREST_STAGE,saved);
  assert.equal(restored.round,6);assert.equal(restored.deaths,1);assert.equal(restored.elapsedTicks,501);
  result=tick(restored,FOREST_STAGE,60);assert.equal(result.run.round,1);assert.equal(result.run.player.x,FOREST_STAGE.spawn.x);assert.equal(result.run.player.hp,3);assert.equal(result.run.enemies.length,1);assert.equal(result.run.deaths,1);assert.equal(result.run.elapsedTicks,501);assert.ok(result.events.some(event=>event.type==='round:start'&&event.respawn));
  assert.notDeepEqual(result.run.terrainLayout,previousTerrain);
});

test('JSON snapshot restore preserves the encounter, round timer, and future random sequence',()=>{
  for(const stage of [FOREST_STAGE,MINE_STAGE]){
    let run=advanceTo(stage,7,42);run.player.hp=2;
    const snapshot=JSON.parse(JSON.stringify(snapshotStageRun(run))),restored=restoreStageRun(stage,snapshot);
    assert.ok(restored.player.hitIds instanceof Set);assert.ok(restored.enemies.every(enemy=>enemy.hitIds instanceof Set));
    assert.deepEqual(tick(restored,stage),tick(run,stage));
    const invalid=structuredClone(snapshot);invalid.rngState=-1;assert.throws(()=>restoreStageRun(stage,invalid),TypeError);
    const invalidKinds=structuredClone(snapshot);invalidKinds.enemies[0].kind=invalidKinds.enemies[1].kind;assert.throws(()=>restoreStageRun(stage,invalidKinds),TypeError);
    let cleared=defeatRound(createStageRun(stage,{}, {seed:42}),stage);cleared=tick(cleared,stage).run;cleared.roundClearTicks=30;
    assert.equal(restoreStageRun(stage,JSON.parse(JSON.stringify(snapshotStageRun(cleared)))).roundClearTicks,30);
  }
});

test('fresh runs save their deterministic terrain and legacy snapshots keep fixed terrain',()=>{
  for(const stage of [FOREST_STAGE,MINE_STAGE]){
    const first=createStageRun(stage,{}, {seed:81});
    const repeat=createStageRun(stage,{}, {seed:81});
    assert.deepEqual(first.terrainLayout,repeat.terrainLayout);
    assert.ok(first.terrainLayout.platforms.length>=2&&first.terrainLayout.platforms.length<=4);
    assert.ok(first.terrainLayout.platforms.every(platform=>Array.isArray(platform.topProfile)&&Number.isInteger(platform.variant)));
    const snapshot=JSON.parse(JSON.stringify(snapshotStageRun(first)));
    const restored=restoreStageRun(stage,snapshot);
    assert.deepEqual(restored.terrainLayout,first.terrainLayout);
    assert.equal(restored.rngState,first.rngState);
    const invalid=structuredClone(snapshot);invalid.terrainLayout={mode:'random',platforms:[]};
    assert.throws(()=>restoreStageRun(stage,invalid),RangeError);

    delete snapshot.terrainLayout;
    snapshot.elapsedTicks=321;
    const legacy=restoreStageRun(stage,snapshot);
    assert.equal(legacy.terrainLayout.mode,'legacy-fixed');
    assert.deepEqual(legacy.terrainLayout.platforms,stage.solids.slice(1));
    assert.equal(legacy.elapsedTicks,321);
    assert.equal(legacy.round,1);
    assert.deepEqual(restoreStageRun(stage,JSON.parse(JSON.stringify(snapshotStageRun(legacy)))).terrainLayout,legacy.terrainLayout);
  }
});

test('profile surfaces stay outside rectangle collision and old random rectangles stay solid',()=>{
 const profiles=[
  {x:80,w:48,topProfile:[280,284,280],variant:1},
  {x:192,w:48,topProfile:[276,272,276],variant:2}
 ];
 for(const stage of [FOREST_STAGE,MINE_STAGE]){
  const profileTerrain=stageTerrain(stage,false,{mode:'random',platforms:profiles});
  assert.ok(profileTerrain.some(rect=>rect.x===stage.solids[0].x&&rect.y===stage.solids[0].y));
  assert.ok(!profileTerrain.some(rect=>Object.hasOwn(rect,'topProfile')));
  const old=[{x:96,y:288,w:64,h:16},{x:224,y:288,w:64,h:16},{x:352,y:288,w:64,h:16},{x:480,y:288,w:64,h:16}];
  const oldTerrain=stageTerrain(stage,false,{mode:'random',platforms:old});
  assert.ok(old.every(platform=>oldTerrain.includes(platform)));
 }
});

test('player collision uses the saved run platforms and keeps the floor and lock walls',()=>{
  const platforms=[
    {x:96,y:288,w:64,h:16},{x:224,y:288,w:64,h:16},
    {x:352,y:288,w:64,h:16},{x:480,y:288,w:64,h:16}
  ];
  for(const stage of [FOREST_STAGE,MINE_STAGE]){
    const run=createStageRun(stage,{}, {seed:19});
    run.terrainLayout={mode:'random',platforms:structuredClone(platforms)};
    run.enemies=[createEnemy({id:'terrain-walker',kind:'soldier',x:96,y:260})];
    const solids=stageTerrain(stage,false,run.terrainLayout);
    assert.deepEqual(solids.slice(0,platforms.length+1),[stage.solids[0],...platforms]);
    assert.equal(solids.some(solid=>solid.x===128&&solid.y===256),false);
    const locked=stageTerrain(stage,true,run.terrainLayout);
    assert.ok(locked.some(solid=>solid.x===stage.arena.left&&solid.w===16));
    assert.ok(locked.some(solid=>solid.x===stage.arena.right&&solid.w===16));
    run.player.x=260;run.player.y=276;run.player.grounded=true;run.player.mode='idle';
    const next=stepStage(run,input,stage).run;
    assert.equal(next.player.y,276);
    assert.equal(next.enemies[0].x,96.75);
  }
});

test('stage clear is emitted only after all round 8 enemies and its boss are defeated',()=>{
  let run=advanceTo(FOREST_STAGE,8,73);for(const enemy of run.enemies){enemy.hp=0;enemy.state='dead';}
  run.boss.hp=0;run.boss.state='dying';run.boss.stateTicks=1;run.boss.hitboxes=[];run.boss.telegraphs=[];
  const result=tick(run,FOREST_STAGE);assert.equal(result.run.outcome,'clear');assert.equal(result.run.boss.state,'dead');assert.ok(result.events.some(event=>event.type==='stage:clear'&&event.round===8));
  assert.equal(tick(result.run,FOREST_STAGE).events.length,0);
  assert.deepEqual(restoreStageRun(FOREST_STAGE,JSON.parse(JSON.stringify(snapshotStageRun(result.run)))),result.run);
  const incomplete=snapshotStageRun(result.run);incomplete.enemies[0].state='hurt';assert.throws(()=>restoreStageRun(FOREST_STAGE,incomplete),TypeError);
});
