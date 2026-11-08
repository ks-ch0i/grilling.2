// Deterministic atlas packing of source art into runtime spritesheets.
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const specs=[
  ['hero-original.png','characters/hero/actions.png',4,4,32,32],
  ['hero-dive-original.png','characters/hero/dive.png',2,2,32,32],
  ['hero-walk-original.png','characters/hero/walk.png',8,2,32,32],
  ['hero-directions-original.png','characters/hero/directions.png',4,2,32,32],
  ['hero-attacks-original.png','characters/hero/attacks.png',8,3,32,32],
  ['soldier-original.png','characters/soldier/poses.png',4,4,40,40],
  ['wisp-original.png','characters/wisp/poses.png',4,4,32,32],
  ['boar-spaced-original.png','characters/boar/poses.png',4,4,48,32],
  ['boss-attack-spaced-original.png','characters/boss/poses.png',6,4,112,112],
  ['terrain-ui-spaced-original.png','world/forest/objects.png',4,2,64,64],
  ['effects-original.png','effects/effects.png',4,2,48,48],
  ['sword-original.png','characters/hero/sword.png',1,1,32,12],
  ['mine-golem-original.png','characters/golem/poses.png',4,4,48,48],
  ['mine-insect-original.png','characters/insect/poses.png',4,4,40,40],
  ['mine-bat-original.png','characters/bat/poses.png',4,4,40,40],
  ['mine-machine-original.png','characters/machine/poses.png',4,2,112,112],
  ['mine-worm-spaced-original.png','characters/worm/poses.png',4,2,128,112],
  ['mine-cart-original.png','world/mine/cart.png',1,1,48,32]
];
const root='public/assets';
async function makeAtlas([source,dest,cols,rows,cellW,cellH]){
  const input=path.join(root,'source',source),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const bounds=[];
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const left=Math.floor(col*info.width/cols),top=Math.floor(row*info.height/rows),right=Math.floor((col+1)*info.width/cols),bottom=Math.floor((row+1)*info.height/rows);
    let x0=right,y0=bottom,x1=left-1,y1=top-1;
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(data[(y*info.width+x)*4+3]>=128){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    if(x1<x0||y1<y0)throw new Error(`${source}: empty cell ${col},${row}`);
    if(cols>1&&(x0===left||x1===right-1||y0===top||y1===bottom-1))throw new Error(`${source}: frame touches cell boundary ${col},${row}`);
    bounds.push({x0,y0,w:x1-x0+1,h:y1-y0+1});
  }
  const maxW=Math.max(...bounds.map(b=>b.w)),maxH=Math.max(...bounds.map(b=>b.h));
  const scale=Math.min((cellW-2)/maxW,(cellH-2)/maxH);const composite=[];
  for(let index=0;index<bounds.length;index++){
    const b=bounds[index],pix=Buffer.alloc(b.w*b.h*4);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){
      const from=((b.y0+y)*info.width+b.x0+x)*4,to=(y*b.w+x)*4;
      data.copy(pix,to,from,from+4);pix[to+3]=pix[to+3]>=128?255:0;
    }
    const w=Math.max(1,Math.round(b.w*scale)),h=Math.max(1,Math.round(b.h*scale));
    const buffer=await sharp(pix,{raw:{width:b.w,height:b.h,channels:4}}).resize(w,h,{kernel:'nearest'}).png().toBuffer();
    const col=index%cols,row=Math.floor(index/cols);
    composite.push({input:buffer,left:col*cellW+Math.floor((cellW-w)/2),top:row*cellH+cellH-h-1});
  }
  const output=path.join(root,dest);await mkdir(path.dirname(output),{recursive:true});
  await sharp({create:{width:cols*cellW,height:rows*cellH,channels:4,background:'#00000000'}}).composite(composite).png().toFile(output);
  console.log(`${dest}: ${bounds.length} frames`);
}
for(const spec of specs)await makeAtlas(spec);
await mkdir(path.join(root,'world/forest'),{recursive:true});
await sharp(path.join(root,'source/forest-original.png')).extract({left:0,top:0,width:1672,height:680}).resize(640,304,{kernel:'nearest'}).png().toFile(path.join(root,'world/forest/backdrop.png'));
const objects=path.join(root,'world/forest/objects.png');
for(const [name,h] of [['ground.png',56],['platform.png',16]]){
  const first=await sharp(objects).extract({left:0,top:0,width:64,height:64}).png().toBuffer();
  await sharp(first).trim({background:'#00000000'}).resize(64,h,{fit:'fill',kernel:'nearest'}).png().toFile(path.join(root,'world/forest',name));
}
await mkdir(path.join(root,'world/mine'),{recursive:true});
await sharp(path.join(root,'source/mine-backdrop-original.png')).resize(640,304,{fit:'fill',kernel:'nearest'}).png().toFile(path.join(root,'world/mine/backdrop.png'));
for(const [name,h] of [['ground.png',56],['platform.png',16]])await sharp(path.join(root,'source/mine-terrain-original.png')).resize(64,h,{fit:'fill',kernel:'nearest'}).png().toFile(path.join(root,'world/mine',name));
