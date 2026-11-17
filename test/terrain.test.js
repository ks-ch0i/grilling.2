import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
import {MINE_STAGE} from '../src/game/content/mineStage.js';

const terrain = await import('../src/game/sim/terrain.js').catch(() => ({}));
const platforms = await import('../src/game/sim/platforms.js').catch(() => ({}));

function validProfiles(){
  return [
    {x:80,w:48,topProfile:[280,284,280],variant:0},
    {x:192,w:48,topProfile:[276,272,276],variant:1}
  ];
}

test('terrain exports deterministic profile generation and validation',()=>{
  assert.equal(typeof terrain.createRandomPlatformLayout,'function');
  assert.equal(typeof terrain.validatePlatformLayout,'function');
  assert.equal(typeof platforms.platformTopY,'function');
  assert.equal(typeof platforms.nearestPlatformSurface,'function');
  assert.equal(typeof platforms.platformOcclusionRects,'function');
});

test('generated profile layouts are deterministic and valid in both stages',()=>{
  for(const stage of [FOREST_STAGE,MINE_STAGE])for(const seed of [0,1,42,0xffffffff]){
    const first=terrain.createRandomPlatformLayout(stage,seed);
    const second=terrain.createRandomPlatformLayout(stage,seed);
    assert.deepEqual(first,second);
    assert.equal(terrain.validatePlatformLayout(stage,{mode:'random',platforms:first.platforms}),true);
    assert.ok(first.platforms.length>=2&&first.platforms.length<=4);
    for(const platform of first.platforms){
      assert.equal(platform.topProfile.length,platform.w/16);
      assert.ok(platform.topProfile.every(y=>Number.isInteger(y)&&y>=248&&y<=288));
      assert.ok(Math.max(...platform.topProfile)-Math.min(...platform.topProfile)<=16);
      for(let i=1;i<platform.topProfile.length;i++)assert.ok(Math.abs(platform.topProfile[i]-platform.topProfile[i-1])<=4);
      assert.ok(Number.isInteger(platform.variant)&&platform.variant>=0&&platform.variant<=3);
    }
    assert.notEqual(first.rngState,seed);
  }
});

test('profile counts are uniform and width classes retain the 80/20 bias',()=>{
  const counts={2:0,3:0,4:0};let narrow=0,wide=0,total=0;
  for(let index=0;index<240;index++){
    const seed=Math.imul(index,2654435761)>>>0;
    const result=terrain.createRandomPlatformLayout(FOREST_STAGE,seed);
    counts[result.platforms.length]++;
    for(const platform of result.platforms){total++;if(platform.w<=64)narrow++;else wide++;}
  }
  for(const count of Object.values(counts))assert.ok(count>=60&&count<=100,JSON.stringify(counts));
  assert.ok(narrow/total>=.75&&narrow/total<=.85);
  assert.ok(wide/total>=.15&&wide/total<=.25);
  const fallback={mode:'random',platforms:[96,224,352,480].map(x=>({x,w:64,topProfile:[288,288,288,288],variant:0}))};
  assert.equal(terrain.validatePlatformLayout(FOREST_STAGE,fallback),true);
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
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,platforms:[profiles[0],oldRandom.platforms[1]]}),TypeError);
  const fixed={mode:'legacy-fixed',platforms:structuredClone(FOREST_STAGE.solids.slice(1))};
  assert.equal(terrain.validatePlatformLayout(FOREST_STAGE,fixed),true);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...fixed,platforms:[null,...fixed.platforms.slice(1)]}),TypeError);
});

test('generator rejects unsupported stages and non-uint32 seeds',()=>{
  assert.throws(()=>terrain.createRandomPlatformLayout({id:'unknown'},1),TypeError);
  for(const seed of [-1,1.5,0x100000000])assert.throws(()=>terrain.createRandomPlatformLayout(FOREST_STAGE,seed),RangeError);
});
