import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA_PLATFORM_PRESETS} from '../src/game/content/arenaPlatformPresets.js';
import {authoredPlatformPlacements,platformModulePlacements,platformTopEdgeSegments,terrainLayoutSignature} from '../src/game/render/platforms.js';

test('authored terrain draws one aligned whole sprite per platform in all six presets',()=>{
 for(const [stageId,presets] of Object.entries(ARENA_PLATFORM_PRESETS)){
  const texture=`${stageId==='forest-1'?'forest':'mine'}-arena-platforms`;
  for(const [presetIndex,preset] of presets.entries()){
   const layout={mode:'authored',presetId:preset.id,platforms:preset.platforms};
   const placements=authoredPlatformPlacements(stageId,layout);
   assert.deepEqual(placements,preset.platforms.map((platform,index)=>({
    x:platform.x-1,y:Math.min(...platform.topProfile)-1,texture,frame:presetIndex*3+index
   })));
  }
 }
 const preset=ARENA_PLATFORM_PRESETS['forest-1'][0];
 const layout={mode:'authored',presetId:preset.id,platforms:preset.platforms};
 assert.throws(()=>authoredPlatformPlacements('mine-1',layout),TypeError);
 assert.throws(()=>authoredPlatformPlacements('constructor',layout),TypeError);
 assert.throws(()=>authoredPlatformPlacements('forest-1',{...layout,mode:'random'}),TypeError);
});

test('profiled platforms render one module at each saved 16px surface sample',()=>{
 for(const w of [32,48,112]){
  const count=w/16,topProfile=Array.from({length:count},(_,index)=>248+index*4);
  for(let variant=0;variant<4;variant++){
   const platform={x:31,y:248,w,h:32,variant,topProfile};
   const placements=platformModulePlacements(platform);
   assert.equal(placements.length,count);
   assert.deepEqual(placements.map(({x,y})=>[x,y]),topProfile.map((y,index)=>[31+index*16,y]));
   assert.deepEqual(placements.map(({frame})=>frame),Array.from({length:count},(_,index)=>variant*3+(index===0?0:index===count-1?2:1)));
  }
 }
});

test('profile y changes are reflected and legacy rectangles do not use modules',()=>{
 const profile={x:80,y:256,w:48,h:32,variant:2,topProfile:[256,252,256]};
 const before=platformModulePlacements(profile);
 const after=platformModulePlacements({...profile,topProfile:[260,256,260]});
 assert.notDeepEqual(after.map(({y})=>y),before.map(({y})=>y));
 assert.deepEqual(platformModulePlacements({x:80,y:256,w:48,h:32}),[]);
});

test('surface edge strips cover the complete module width without seams',()=>{
 const platform={x:40,w:64,topProfile:[248,252,256,252],variant:3};
 const segments=platformTopEdgeSegments(platform);
 assert.deepEqual(segments,platform.topProfile.map((y,index)=>({x:40+index*16,y,w:16,h:1})));
 assert.equal(segments.reduce((width,segment)=>width+segment.w,0),platform.w);
 assert.deepEqual(platformTopEdgeSegments({x:40,y:248,w:64,h:16}),[]);
});

test('malformed profiled platform records are rejected',()=>{
 assert.throws(()=>platformModulePlacements({x:0,w:24,variant:0,topProfile:[248]}),{name:'TypeError',message:'Invalid platform profile'});
 assert.throws(()=>platformModulePlacements({x:0,w:32,variant:0,topProfile:[248]}),{name:'TypeError',message:'Invalid platform profile'});
 assert.throws(()=>platformModulePlacements({x:0,y:248,w:32}),{name:'TypeError',message:'Invalid platform profile'});
});

test('terrain cache signature includes layout mode, full profiles, and variants',()=>{
 const floor={x:0,y:304,w:640,h:56},platform={x:80,w:48,topProfile:[256,252,256],variant:1};
 const layout={mode:'random',platforms:[platform]},signature=terrainLayoutSignature(layout,floor);
 assert.equal(terrainLayoutSignature(layout,floor),signature);
 assert.notEqual(terrainLayoutSignature({...layout,mode:'legacy-fixed'},floor),signature);
 assert.notEqual(terrainLayoutSignature({...layout,platforms:[{...platform,x:96}]},floor),signature);
 assert.notEqual(terrainLayoutSignature({...layout,platforms:[{...platform,topProfile:[256,256,256]}]},floor),signature);
 assert.notEqual(terrainLayoutSignature({...layout,platforms:[{...platform,variant:2}]},floor),signature);
 const authored={...layout,mode:'authored',presetId:'forest-creek-v1'};
 assert.equal(terrainLayoutSignature(authored,floor),terrainLayoutSignature(structuredClone(authored),floor));
 assert.notEqual(terrainLayoutSignature(authored,floor),terrainLayoutSignature({...authored,presetId:'forest-terrace-v1'},floor));
});
