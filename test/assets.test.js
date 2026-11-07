import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import sharp from 'sharp';
import {ASSETS,validateAssets} from '../src/game/assets/manifest.js';
async function inspect(bytes,asset){
 const {data,info}=await sharp(bytes,{failOn:'error'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width%asset.frameWidth,0);assert.equal(info.height%asset.frameHeight,0);assert.equal(info.width*info.height/(asset.frameWidth*asset.frameHeight),asset.count);
 if(asset.count>1||asset.key==='sword'){
  let transparent=false;const cols=info.width/asset.frameWidth;
  for(let frame=0;frame<asset.count;frame++){let opaque=0;const x0=(frame%cols)*asset.frameWidth,y0=Math.floor(frame/cols)*asset.frameHeight;
   for(let y=0;y<asset.frameHeight;y++)for(let x=0;x<asset.frameWidth;x++){const a=data[((y0+y)*info.width+x0+x)*4+3];if(a===0)transparent=true;if(a>127){opaque++;assert.ok(x>0&&x<asset.frameWidth-1&&y>0&&y<asset.frameHeight-1,`${asset.key} frame ${frame} touches border`);}}
   assert.ok(opaque>4,`${asset.key} frame ${frame} is empty`);
  }
  assert.ok(transparent,`${asset.key} lacks alpha`);
 }
}
test('real PNG files decode with valid alpha, cells and frame gutters',async()=>{for(const asset of ASSETS)await inspect(await readFile(`public${asset.url}`),asset);});
test('invalid real image fixture and missing runtime textures are rejected',async()=>{
 await assert.rejects(()=>inspect(Buffer.from('not a png'),ASSETS[0]));
 const missing=validateAssets({exists:()=>false});assert.equal(missing.ok,false);assert.ok(missing.errors.some(e=>e.includes('hero-actions')));
 const broken=validateAssets({exists:()=>true,get:()=>({getSourceImage:()=>({width:1,height:1}),has:()=>false})});assert.equal(broken.ok,false);assert.ok(broken.errors.some(e=>e.includes('Missing frame')));
});
