import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import sharp from 'sharp';
import {ASSETS,validateAssets} from '../src/game/assets/manifest.js';
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
test('themed platform module sheets register all 12 16x32 frames',async()=>{
 for(const [key,url] of [['forest-platform-modules','/assets/world/forest/platform-modules.png'],['mine-platform-modules','/assets/world/mine/platform-modules.png']]){
  const asset=ASSETS.find(item=>item.key===key);assert.ok(asset,`${key} is registered`);assert.equal(asset.url,url);assert.equal(asset.frameWidth,16);assert.equal(asset.frameHeight,32);assert.equal(asset.count,12);
  const info=await sharp(await readFile(`public${url}`)).metadata();assert.equal(info.width,48);assert.equal(info.height,128);
  const sourceName=key==='forest-platform-modules'?'forest-platform-modules-original.png':'mine-platform-modules-original.png';
  const sourceInfo=await sharp(await readFile(`public/assets/source/${sourceName}`)).metadata();assert.equal(sourceInfo.width,48);assert.equal(sourceInfo.height,128);
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
