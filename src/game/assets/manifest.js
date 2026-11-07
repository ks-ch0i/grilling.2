const entries=[
 ['hero-actions','/assets/characters/hero/actions.png',32,32,16],['hero-dive','/assets/characters/hero/dive.png',32,32,4],['hero-walk','/assets/characters/hero/walk.png',32,32,16],['hero-directions','/assets/characters/hero/directions.png',32,32,8],['hero-attacks','/assets/characters/hero/attacks.png',32,32,24],
 ['soldier','/assets/characters/soldier/poses.png',40,40,16],['wisp','/assets/characters/wisp/poses.png',32,32,16],['boar','/assets/characters/boar/poses.png',48,32,16],['boss','/assets/characters/boss/poses.png',112,112,8],
 ['objects','/assets/world/forest/objects.png',64,64,8],['effects','/assets/effects/effects.png',48,48,8],['sword','/assets/characters/hero/sword.png',32,12,1],
 ['forest','/assets/world/forest/backdrop.png',640,304,1],['ground','/assets/world/forest/ground.png',64,56,1],['platform','/assets/world/forest/platform.png',64,16,1]
];
export const ASSETS=Object.freeze(entries.map(([key,url,frameWidth,frameHeight,count])=>Object.freeze({key,url,frameWidth,frameHeight,count,origin:Object.freeze({x:.5,y:1})})));
const clips={};
function clip(key,owner,state,texture,frames,{fps=8,loop=false,direction=null}={}){clips[key]=Object.freeze({key,owner,state,direction,texture,frames:Object.freeze(frames),fps,loop,origin:Object.freeze({x:.5,y:1})});}
for(let direction=0;direction<8;direction++){
 clip(`hero.idle.${direction}`,'hero','idle','hero-directions',[direction],{direction});
 clip(`hero.run.${direction}`,'hero','run','hero-walk',[direction,direction+8],{direction,fps:9,loop:true});
 clip(`hero.attack.${direction}`,'hero','attack','hero-attacks',[direction],{direction});
}
for(const [state,frames] of Object.entries({jump:[4],fall:[5],roll:[6,7,6],hurt:[9],dead:[10,11]}))clip(`hero.${state}`,'hero',state,'hero-actions',frames,{fps:10});
clip('hero.dive','hero','dive','hero-dive',[1],{fps:10});
for(const owner of ['soldier','wisp','boar'])for(const [state,frames] of Object.entries({idle:[0,1],chase:[4,5,6,7],windup:[8,9],attack:[10,11,12],recovery:[0],hurt:[13],dead:[14,15]}))clip(`${owner}.${state}`,owner,state,owner,frames,{fps:7,loop:['idle','chase'].includes(state)});
for(const [state,frames] of Object.entries({intro:[0,1],idle:[0,1],branchWindup:[2],branchAttack:[3],root:[4],slam:[5],transition:[6],dead:[7]}))clip(`boss.${state}`,'boss',state,'boss',frames,{fps:4,loop:state==='idle'});
export const ANIMATIONS=Object.freeze(clips);
export function preloadAssets(loader,textures=null){for(const asset of ASSETS){if(textures?.exists(asset.key))continue;if(asset.count>1)loader.spritesheet(asset.key,asset.url,{frameWidth:asset.frameWidth,frameHeight:asset.frameHeight});else loader.image(asset.key,asset.url);}}
export function validateAssets(textures){
 const errors=[];
 for(const a of ASSETS){
  if(!textures.exists(a.key)){errors.push(`Missing ${a.key}`);continue;}
  const texture=textures.get(a.key),source=texture.getSourceImage();
  if(!source || source.width<a.frameWidth || source.height<a.frameHeight || a.frameWidth<=0 || a.frameHeight<=0 || a.origin.x<0 || a.origin.x>1 || a.origin.y<0 || a.origin.y>1)errors.push(`Invalid size or origin: ${a.key}`);
  if(a.count>1)for(let i=0;i<a.count;i++)if(!texture.has(i))errors.push(`Missing frame ${a.key}:${i}`);
 }
 return {ok:errors.length===0,errors};
}
