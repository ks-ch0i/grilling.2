import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import sharp from 'sharp';
import {ASSETS,validateAssets} from '../src/game/assets/manifest.js';
const visualApi=await import('../src/game/assets/manifest.js');
import {ARENA_PLATFORM_PRESETS} from '../src/game/content/arenaPlatformPresets.js';
async function inspect(bytes,asset){
 const {data,info}=await sharp(bytes,{failOn:'error'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width%asset.frameWidth,0);assert.equal(info.height%asset.frameHeight,0);assert.equal(info.width*info.height/(asset.frameWidth*asset.frameHeight),asset.count);
 if(asset.count>1||['sword','mine-cart','mine-mineral'].includes(asset.key)){
  let transparent=false;const cols=info.width/asset.frameWidth;
  for(let frame=0;frame<asset.count;frame++){let opaque=0;const x0=(frame%cols)*asset.frameWidth,y0=Math.floor(frame/cols)*asset.frameHeight;
   for(let y=0;y<asset.frameHeight;y++)for(let x=0;x<asset.frameWidth;x++){const a=data[((y0+y)*info.width+x0+x)*4+3];if(a===0)transparent=true;if(a>127){opaque++;assert.ok(x>0&&x<asset.frameWidth-1&&y>0&&y<asset.frameHeight-1,`${asset.key} frame ${frame} touches border`);}}
   assert.ok(opaque>4,`${asset.key} frame ${frame} is empty`);
  }
  assert.ok(transparent,`${asset.key} lacks alpha`);
 }
}
test('real PNG files decode with valid alpha, cells and frame gutters',async()=>{for(const asset of ASSETS)await inspect(await readFile(`public${asset.url}`),asset);});
test('hero defense sheets register eight shield directions and two parry sides',()=>{
 assert.deepEqual(ASSETS.filter(asset=>asset.key==='hero-shield').map(({url,frameWidth,frameHeight,count})=>({url,frameWidth,frameHeight,count})),[{url:'/assets/characters/hero/shield.png',frameWidth:32,frameHeight:32,count:8}]);
 assert.deepEqual(ASSETS.filter(asset=>asset.key==='hero-parry').map(({url,frameWidth,frameHeight,count})=>({url,frameWidth,frameHeight,count})),[{url:'/assets/characters/hero/parry.png',frameWidth:32,frameHeight:32,count:2}]);
});
test('actor artwork bounds use every hero frame origin and the renderer outline scales',()=>{
 const scales=visualApi.ACTOR_OUTLINE_SCALES;
 assert.deepEqual(scales,{player:1.15,enemy:1.10,boss:1.04});
 for(const key of ['hero-directions','hero-walk','hero-actions','hero-dive','hero-attacks','hero-shield','hero-parry']){
  const asset=ASSETS.find(item=>item.key===key);assert.deepEqual([asset.frameWidth,asset.frameHeight,asset.origin],[32,32,{x:.5,y:1}],key);
 }
 assert.equal(typeof visualApi.actorVisualBounds,'function');
 const bounds=visualApi.actorVisualBounds({x:10,y:20,w:16,h:28},'hero-directions',scales.player);
 assert.ok(Math.abs(bounds.x+0.4)<1e-9);assert.ok(Math.abs(bounds.y-11.2)<1e-9);
 assert.ok(Math.abs(bounds.w-36.8)<1e-9);assert.ok(Math.abs(bounds.h-36.8)<1e-9);
 assert.throws(()=>visualApi.actorVisualBounds({x:0,y:0,w:16,h:28},'missing-actor',1),TypeError);
});
test('themed platform module sheets register all 12 16x32 frames',async()=>{
 for(const [key,url] of [['forest-platform-modules','/assets/world/forest/platform-modules.png'],['mine-platform-modules','/assets/world/mine/platform-modules.png']]){
  const asset=ASSETS.find(item=>item.key===key);assert.ok(asset,`${key} is registered`);assert.equal(asset.url,url);assert.equal(asset.frameWidth,16);assert.equal(asset.frameHeight,32);assert.equal(asset.count,12);
  const info=await sharp(await readFile(`public${url}`)).metadata();assert.equal(info.width,48);assert.equal(info.height,128);
  const sourceName=key==='forest-platform-modules'?'forest-platform-modules-original.png':'mine-platform-modules-original.png';
  const sourceInfo=await sharp(await readFile(`public/assets/source/${sourceName}`)).metadata();assert.equal(sourceInfo.width,48);assert.equal(sourceInfo.height,128);
 }
});
test('authored platform sheets preserve every surface pixel and contain nine distinct frames per stage',async()=>{
 for(const stageName of ['forest','mine']){
  const asset=ASSETS.find(item=>item.key===`${stageName}-arena-platforms`);
  assert.ok(asset);
  assert.equal(asset.url,`/assets/world/${stageName}/arena-platforms.png`);
  assert.deepEqual([asset.frameWidth,asset.frameHeight,asset.count],[116,36,9]);
  const decode=async filepath=>{
   const {data,info}=await sharp(filepath).raw().toBuffer({resolveWithObject:true});
   assert.deepEqual([info.width,info.height,info.channels],[348,108,4]);
   return data;
  };
  const source=await decode(`public/assets/source/${stageName}-arena-platforms-original.png`);
  const runtime=await decode(`public${asset.url}`);
  assert.deepEqual(runtime,source);
  const frames=new Set();
  for(const [row,preset] of ARENA_PLATFORM_PRESETS[`${stageName}-1`].entries()){
   for(const [col,platform] of preset.platforms.entries()){
    const pixels=[];
    const firstRow=Math.min(...platform.topProfile);
    const maxDepth=row===1&&col===1?20:24;
    for(let x=0;x<asset.frameWidth;x++){
     let firstOpaque=-1,lastOpaque=-1;
     for(let y=0;y<asset.frameHeight;y++){
      const offset=((row*asset.frameHeight+y)*348+col*asset.frameWidth+x)*4;
      const alpha=runtime[offset+3];
      assert.ok(alpha===0||alpha===255,`${preset.id}/${col} (${x},${y})`);
      pixels.push(runtime.subarray(offset,offset+4));
      if(alpha===255){if(firstOpaque===-1)firstOpaque=y;lastOpaque=y;}
     }
     const expected= x>0&&x<=platform.w?1+platform.topProfile[Math.floor((x-1)/16)]-firstRow:-1;
     assert.equal(firstOpaque,expected,`${preset.id}/${col} column ${x}`);
     assert.ok(lastOpaque<asset.frameHeight-1&&lastOpaque<firstOpaque+maxDepth,`${preset.id}/${col} column ${x} depth`);
    }
    frames.add(Buffer.concat(pixels).toString('base64'));
   }
  }
  assert.equal(frames.size,9);
 }
});
test('invalid real image fixture and missing runtime textures are rejected',async()=>{
 await assert.rejects(()=>inspect(Buffer.from('not a png'),ASSETS[0]));
 const missing=validateAssets({exists:()=>false});assert.equal(missing.ok,false);assert.ok(missing.errors.some(e=>e.includes('hero-actions')));
 const broken=validateAssets({exists:()=>true,get:()=>({getSourceImage:()=>({width:1,height:1}),has:()=>false})});assert.equal(broken.ok,false);assert.ok(broken.errors.some(e=>e.includes('Missing frame')));
});
test('non-attack boss frames retain the exact baseline pixels',async()=>{
 const specs=[['boss','boss',[0,1,2,3,18,19,20,21,22,23],112],['machine','mine-machine',[0,1,2,3,21,22,23],112],['worm','mine-worm',[0,1,2,3,16,17,22,23],128]];
 for(const [kind,base,frames,w] of specs){
  const runtime=await readFile(`public/assets/characters/${kind}/poses.png`),original=await readFile(`public/assets/source/${base}-base-poses-v1.png`);
  for(const frame of frames){const region={left:(frame%6)*w,top:Math.floor(frame/6)*112,width:w,height:112};assert.deepEqual(await sharp(runtime).extract(region).raw().toBuffer(),await sharp(original).extract(region).raw().toBuffer(),`${kind}:${frame}`);}
 }
});
