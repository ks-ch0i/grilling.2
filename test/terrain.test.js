import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
import {MINE_STAGE} from '../src/game/content/mineStage.js';
import {ARENA_PLATFORM_PRESETS} from '../src/game/content/arenaPlatformPresets.js';
import {nextRandom} from '../src/game/sim/mineCarts.js';
import {createPlayer,stepPlayer} from '../src/game/sim/player.js';
import {createEnemy,stepEnemy} from '../src/game/sim/enemies.js';
import * as terrain from '../src/game/sim/terrain.js';
import * as platforms from '../src/game/sim/platforms.js';

function validProfiles(){
  return [
    {x:80,w:48,topProfile:[280,284,280],variant:0},
    {x:192,w:48,topProfile:[276,272,276],variant:1}
  ];
}

test('authored selection uses one seeded roll and returns an independent layout',()=>{
  for(const stage of [FOREST_STAGE,MINE_STAGE]){
    const presets=ARENA_PLATFORM_PRESETS[stage.id];
    assert.ok(Object.isFrozen(ARENA_PLATFORM_PRESETS)&&Object.isFrozen(presets));
    for(const [seed,index] of [[0,0],[251,1],[1112,2],[0xffffffff,0]]){
      const first=terrain.createAuthoredPlatformLayout(stage,seed);
      assert.deepEqual(first,terrain.createAuthoredPlatformLayout(stage,seed));
      assert.equal(first.rngState,nextRandom(seed).state);
      const preset=presets[index];
      assert.deepEqual(first.layout,{mode:'authored',presetId:preset.id,platforms:preset.platforms});
      assert.equal(terrain.validatePlatformLayout(stage,first.layout),true);
      assert.ok(Object.isFrozen(preset)&&Object.isFrozen(preset.platforms)&&Object.isFrozen(preset.platforms[0])&&Object.isFrozen(preset.platforms[0].topProfile));
      first.layout.platforms[0].topProfile[0]++;
      assert.throws(()=>terrain.validatePlatformLayout(stage,first.layout),RangeError);
      assert.notEqual(first.layout.platforms[0].topProfile[0],preset.platforms[0].topProfile[0]);
    }
  }
});

test('each stage has three reachable authored layouts with one layered path',()=>{
  for(const stage of [FOREST_STAGE,MINE_STAGE]){
    const presets=ARENA_PLATFORM_PRESETS[stage.id];
    assert.equal(presets.length,3);
    const layered=[];
    for(const {id,platforms:surfaces} of presets){
      assert.equal(terrain.validateAuthoredPlatformGeometry(stage,surfaces),true,id);
      if(surfaces.some((first,index)=>surfaces.slice(index+1).some(second=>first.x<second.x+second.w&&second.x<first.x+first.w)))layered.push(id);
    }
    assert.deepEqual(layered,[presets[1].id]);
  }
});

test('authored layouts require the exact stage preset and preserve legacy geometry limits',()=>{
  const {layout}=terrain.createAuthoredPlatformLayout(FOREST_STAGE,251);
  assert.throws(()=>terrain.validatePlatformLayout(MINE_STAGE,layout),RangeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,presetId:'missing'}),RangeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,presetId:1}),TypeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,extra:true}),TypeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,platforms:[...layout.platforms].reverse()}),RangeError);
  const invalid=structuredClone(layout);
  invalid.platforms[0].extra=true;
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,invalid),TypeError);
  const [lower,upper,third]=layout.platforms;
  assert.throws(()=>platforms.validatePlatformProfile(upper),RangeError);
  assert.throws(()=>terrain.validateAuthoredPlatformGeometry(FOREST_STAGE,[lower,{...upper,topProfile:[217,219,220,220]},third]),/48 pixels/);
  assert.throws(()=>terrain.validateAuthoredPlatformGeometry(FOREST_STAGE,[{...lower,x:72},upper,third]),/start corridor/);
  assert.throws(()=>terrain.validateAuthoredPlatformGeometry(FOREST_STAGE,[lower,{...upper,x:320},third]),/cannot be reached/);
  const crossing=[
    {x:176,w:64,topProfile:[260,256,252,248],variant:0},
    {x:176,w:64,topProfile:[248,252,256,260],variant:1},third
  ];
  assert.throws(()=>terrain.validateAuthoredPlatformGeometry(FOREST_STAGE,crossing),RangeError);
});

const stepInput=(move=0,jumpPressed=false)=>({move,jumpPressed,jumpHeld:true,attackPressed:false,rollPressed:false,divePressed:false,aimX:320,aimY:290});
const feet=player=>player.y+player.h;
const center=player=>player.x+player.w/2;

function jumpTo(player,stage,surfaces,targetX,targetY){
  for(let tick=0;tick<100;tick++){
    const delta=targetX-center(player);
    const move=feet(player)<=targetY&&Math.abs(delta)>=1?Math.sign(delta):0;
    player=stepPlayer(player,stepInput(move,tick===0),[stage.solids[0]],stage.pitDeathY,surfaces).player;
    if(player.grounded)return player;
  }
  assert.fail('The jump never landed');
}

test('player can jump from floor to lower to upper and fall sideways back down in both stages',()=>{
  for(const {stage,lowerIndex,upperIndex,takeoffX,upperX,offDirection} of [
    {stage:FOREST_STAGE,lowerIndex:0,upperIndex:1,takeoffX:228,upperX:252,offDirection:-1},
    {stage:MINE_STAGE,lowerIndex:2,upperIndex:1,takeoffX:366,upperX:340,offDirection:1}
  ]){
    const surfaces=ARENA_PLATFORM_PRESETS[stage.id][1].platforms;
    const lower=surfaces[lowerIndex],upper=surfaces[upperIndex];
    const lowerY=platforms.platformTopY(lower,takeoffX),upperY=platforms.platformTopY(upper,upperX);
    const floorPlayer={...createPlayer(takeoffX-8,stage.solids[0].y-28),grounded:true};
    let player=jumpTo(floorPlayer,stage,surfaces,takeoffX,lowerY);
    assert.equal(feet(player),lowerY,stage.id);
    player=jumpTo(player,stage,surfaces,upperX,upperY);
    assert.equal(feet(player),upperY,stage.id);
    for(let tick=0;tick<90;tick++){
      const move=platforms.platformTopY(upper,center(player))===null?0:offDirection;
      player=stepPlayer(player,stepInput(move),[stage.solids[0]],stage.pitDeathY,surfaces).player;
      if(player.grounded&&feet(player)>upperY+4)break;
    }
    assert.ok(player.grounded&&feet(player)>upperY+4,stage.id);
    assert.equal(feet(player),platforms.platformTopY(lower,center(player)),stage.id);
  }
});

test('walking, falling and enemy support use the matching layer regardless of array order',()=>{
  const lower={x:200,w:80,topProfile:[272,268,266,266,264],variant:0};
  const upper={x:200,w:80,topProfile:[216,218,220,220,222],variant:1};
  const floor=[FOREST_STAGE.solids[0]];
  for(const order of [[lower,upper],[upper,lower]]){
    for(const [previous,next] of [[272,268],[216,218],[304,304]]){
      const player={...createPlayer(207,previous-28),grounded:true};
      assert.equal(feet(stepPlayer(player,stepInput(1),floor,FOREST_STAGE.pitDeathY,order).player),next);
    }
    const actor={x:212,w:16};
    assert.equal(platforms.crossedPlatformSurface(actor,order,208,276).platform,upper);
    assert.equal(platforms.crossedPlatformSurface(actor,order,228,276).platform,lower);
    assert.equal(platforms.crossedPlatformSurface(actor,order,280,304),null);
    for(const [previous,next] of [[272,268],[216,218]]){
      const enemy=createEnemy({id:'test-soldier',kind:'soldier',x:205.5,y:previous-28});
      const moved=stepEnemy(enemy,{x:350,w:16},floor,order).enemy;
      assert.ok(moved.x>enemy.x);
      assert.equal(moved.y+moved.h,next);
    }
  }
});

test('profile surface lookup returns the section and nearest eligible support',()=>{
  const [first,second]=validProfiles();
  assert.equal(platforms.platformTopY(first,80),280);
  assert.equal(platforms.platformTopY(first,95.9),280);
  assert.equal(platforms.platformTopY(first,96),284);
  assert.equal(platforms.platformTopY(first,128),null);
  assert.deepEqual(platforms.nearestPlatformSurface([first,second],100,281),{platform:first,sectionIndex:1,y:284});
  assert.deepEqual(platforms.nearestPlatformSurface([first,second],200,270),{platform:second,sectionIndex:0,y:276});
  assert.equal(platforms.nearestPlatformSurface([first,second],160,0),null);
  assert.deepEqual(platforms.platformOcclusionRects([first]),[
    {x:80,y:280,w:16,h:1},{x:96,y:284,w:16,h:1},{x:112,y:280,w:16,h:1}
  ]);
});

test('profile validation rejects malformed records and preserves old rectangle layouts',()=>{
  const profiles=validProfiles(),layout={mode:'random',platforms:profiles};
  assert.equal(terrain.validatePlatformLayout(FOREST_STAGE,layout),true);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,mode:'other'}),TypeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,platforms:profiles.slice(0,1)}),RangeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,platforms:[profiles[0],{...profiles[1],extra:true}]}),TypeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,platforms:[profiles[0],{x:192,w:48,topProfile:[276,281,276],variant:1}]}),RangeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,platforms:[profiles[0],{x:192,w:48,topProfile:[276,272,276],variant:4}]}),RangeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,platforms:[profiles[0],{x:120,w:48,topProfile:[276,272,276],variant:1}]}),RangeError);

  const oldRandom={mode:'random',platforms:[
    {x:80,y:288,w:64,h:16},{x:192,y:272,w:48,h:16},
    {x:304,y:256,w:64,h:16},{x:416,y:288,w:48,h:16}
  ]};
  assert.equal(terrain.validatePlatformLayout(FOREST_STAGE,oldRandom),true);
  const oldForestSeed13={mode:'random',platforms:[
    {x:202,y:254,w:64,h:16},{x:372,y:252,w:96,h:16},{x:578,y:258,w:32,h:16},
    {x:110,y:268,w:64,h:16},{x:113,y:252,w:64,h:16}
  ]};
  assert.equal(terrain.validatePlatformLayout(FOREST_STAGE,oldForestSeed13),true);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,platforms:[profiles[0],oldRandom.platforms[1]]}),TypeError);
  const fixed={mode:'legacy-fixed',platforms:structuredClone(FOREST_STAGE.solids.slice(1))};
  assert.equal(terrain.validatePlatformLayout(FOREST_STAGE,fixed),true);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...fixed,platforms:[null,...fixed.platforms.slice(1)]}),TypeError);
});

test('generator rejects unsupported stages and non-uint32 seeds',()=>{
  assert.throws(()=>terrain.createAuthoredPlatformLayout({id:'unknown'},1),TypeError);
  for(const seed of [-1,1.5,0x100000000])assert.throws(()=>terrain.createAuthoredPlatformLayout(FOREST_STAGE,seed),RangeError);
});
