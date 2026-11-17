import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
import {MINE_STAGE} from '../src/game/content/mineStage.js';

const terrain = await import('../src/game/sim/terrain.js').catch(() => ({}));

test('terrain exports deterministic layout generation and validation',()=>{
  assert.equal(typeof terrain.createRandomPlatformLayout,'function');
  assert.equal(typeof terrain.validatePlatformLayout,'function');
});

test('generated platform layouts are deterministic and valid for both stages',()=>{
  for(const stage of [FOREST_STAGE,MINE_STAGE])for(const seed of [0,1,42,0xffffffff]){
    const first=terrain.createRandomPlatformLayout(stage,seed);
    const second=terrain.createRandomPlatformLayout(stage,seed);
    assert.deepEqual(first,second);
    assert.equal(terrain.validatePlatformLayout(stage,{mode:'random',platforms:first.platforms}),true);
    assert.notEqual(first.rngState,seed);
  }
});

test('seeded layouts retain the weighted counts and width bands, and the fixed fallback is valid',()=>{
  const counts={4:0,5:0,6:0};let narrow=0,wide=0,total=0;
  for(let index=0;index<240;index++){
    const seed=Math.imul(index,2654435761)>>>0;
    const result=terrain.createRandomPlatformLayout(FOREST_STAGE,seed);
    counts[result.platforms.length]++;
    for(const platform of result.platforms){total++;if(platform.w<=64)narrow++;else wide++;}
  }
  assert.ok(counts[4]>=35&&counts[4]<=65,JSON.stringify(counts));
  assert.ok(counts[5]>=75&&counts[5]<=115,JSON.stringify(counts));
  assert.ok(counts[6]>=75&&counts[6]<=115,JSON.stringify(counts));
  assert.ok(narrow/total>=.75&&narrow/total<=.85);
  assert.ok(wide/total>=.15&&wide/total<=.25);
  const fallback=[
    {x:96,y:288,w:64,h:16},{x:224,y:288,w:64,h:16},
    {x:352,y:288,w:64,h:16},{x:480,y:288,w:64,h:16}
  ];
  assert.equal(terrain.validatePlatformLayout(FOREST_STAGE,{mode:'random',platforms:fallback}),true);
});

test('generator rejects unsupported stages and non-uint32 seeds',()=>{
  assert.throws(()=>terrain.createRandomPlatformLayout({id:'unknown'},1),TypeError);
  for(const seed of [-1,1.5,0x100000000])assert.throws(()=>terrain.createRandomPlatformLayout(FOREST_STAGE,seed),RangeError);
});

test('layout validation rejects malformed, overlapping, blocked, and out-of-range terrain',()=>{
  const valid={mode:'random',platforms:[
    {x:80,y:288,w:64,h:16},{x:192,y:272,w:48,h:16},
    {x:304,y:256,w:64,h:16},{x:416,y:288,w:48,h:16}
  ]};
  assert.equal(terrain.validatePlatformLayout(FOREST_STAGE,valid),true);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...valid,mode:'other'}),TypeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...valid,platforms:valid.platforms.slice(0,3)}),RangeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...valid,platforms:[...valid.platforms.slice(0,3),{x:100,y:288,w:48,h:16}]}),RangeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...valid,platforms:[...valid.platforms.slice(0,3),{x:560,y:288,w:80,h:16}]}),RangeError);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...valid,platforms:[...valid.platforms.slice(0,3),{x:480,y:288,w:64,h:16.5}]}),TypeError);
});

test('legacy fixed layouts validate the original stage platforms',()=>{
  const layout={
    mode:'legacy-fixed',platforms:structuredClone(FOREST_STAGE.solids.slice(1))
  };
  assert.equal(terrain.validatePlatformLayout(FOREST_STAGE,layout),true);
  assert.throws(()=>terrain.validatePlatformLayout(FOREST_STAGE,{...layout,platforms:[null,...layout.platforms.slice(1)]}),TypeError);
});
