const entries=[
 ['hero-actions','/assets/characters/hero/actions.png',32,32,16],['hero-dive','/assets/characters/hero/dive.png',32,32,4],['hero-walk','/assets/characters/hero/walk.png',32,32,16],['hero-directions','/assets/characters/hero/directions.png',32,32,8],['hero-attacks','/assets/characters/hero/attacks.png',32,32,24],
 ['soldier','/assets/characters/soldier/poses.png',40,40,16],['wisp','/assets/characters/wisp/poses.png',32,32,16],['boar','/assets/characters/boar/poses.png',48,32,16],['boss','/assets/characters/boss/poses.png',112,112,24],
 ['objects','/assets/world/forest/objects.png',64,64,8],['effects','/assets/effects/effects.png',48,48,8],['sword','/assets/characters/hero/sword.png',32,12,1],
 ['forest','/assets/world/forest/backdrop.png',640,304,1],['ground','/assets/world/forest/ground.png',64,56,1],['platform','/assets/world/forest/platform.png',64,16,1]
 ,['mine-backdrop','/assets/world/mine/backdrop.png',640,304,1],['mine-ground','/assets/world/mine/ground.png',64,56,1],['mine-platform','/assets/world/mine/platform.png',64,16,1],
 ['golem','/assets/characters/golem/poses.png',48,48,16],['insect','/assets/characters/insect/poses.png',40,40,16],['bat','/assets/characters/bat/poses.png',40,40,16],
 ['machine','/assets/characters/machine/poses.png',112,112,24],['worm','/assets/characters/worm/poses.png',128,112,24],['mine-cart','/assets/world/mine/cart.png',48,32,1],['mine-mineral','/assets/world/mine/mineral.png',16,16,1],
 ['boss-forest-fx','/assets/effects/boss/forest.png',128,128,16],['boss-machine-fx','/assets/effects/boss/machine.png',128,128,16],['boss-worm-fx','/assets/effects/boss/worm.png',128,128,16],['worm-entrance-fx','/assets/effects/boss/worm-entrance.png',256,192,8]
];
export const ASSETS=Object.freeze(entries.map(([key,url,frameWidth,frameHeight,count])=>Object.freeze({key,url,frameWidth,frameHeight,count,origin:Object.freeze({x:.5,y:1})})));
const clips={};
function clip(key,owner,state,texture,frames,{fps=8,loop=false,direction=null}={}){clips[key]=Object.freeze({key,owner,state,direction,texture,frames:Object.freeze(frames),fps,loop,origin:Object.freeze({x:.5,y:1})});}
for(let direction=0;direction<8;direction++){
 clip(`hero.idle.${direction}`,'hero','idle','hero-directions',[direction],{direction});
 clip(`hero.run.${direction}`,'hero','run','hero-walk',[direction,direction+8],{direction,fps:9,loop:true});
 clip(`hero.attack.${direction}`,'hero','attack','hero-attacks',[direction,direction+8,direction+16],{direction});
}
for(const [state,frames] of Object.entries({jump:[4],fall:[5],roll:[6,7,6],hurt:[9],dead:[10,11]}))clip(`hero.${state}`,'hero',state,'hero-actions',frames,{fps:10});
clip('hero.dive','hero','dive','hero-dive',[1],{fps:10});
for(const owner of ['soldier','wisp','boar'])for(const [state,frames] of Object.entries({idle:[0,1],chase:[4,5,6,7],windup:[8,9],attack:[10,11,12],recovery:[0],hurt:[13],dead:[14,15]}))clip(`${owner}.${state}`,owner,state,owner,frames,{fps:7,loop:['idle','chase'].includes(state)});
for(const owner of ['golem','insect','bat'])for(const [state,frames] of Object.entries({idle:[0,1],chase:[2,3,4,5],windup:[8,9],attack:[10,11],return:[2,3],recovery:[0],hurt:[12,13],dead:[14,15]}))clip(`${owner}.${state}`,owner,state,owner,frames,{fps:7,loop:['idle','chase','return'].includes(state)});
clip('boss.idle','boss','idle','boss',[0,1],{fps:4,loop:true});
clip('boss.intro','boss','intro','boss',[2,3],{fps:4});
clip('boss.branchWindup','boss','branchWindup','boss',[4,5],{fps:8});
clip('boss.branchAttack','boss','branchAttack','boss',[6,7,8],{fps:15});
clip('boss.rootWindup','boss','rootWindup','boss',[9,10],{fps:5});
clip('boss.rootAttack','boss','rootAttack','boss',[11,12],{fps:10});
clip('boss.rootHold','boss','rootHold','boss',[11]);
clip('boss.rootPulse','boss','rootPulse','boss',[12]);
clip('boss.slamWindup','boss','slamWindup','boss',[13,14],{fps:8});
clip('boss.slamAttack','boss','slamAttack','boss',[15,16,17],{fps:15});
clip('boss.transition','boss','transition','boss',[18,19,20],{fps:4});
clip('boss.dead','boss','dead','boss',[21,22,23],{fps:8});
clip('machine.intro','machine','intro','machine',[0,1],{fps:4});
clip('machine.idle','machine','idle','machine',[2,3],{fps:4,loop:true});
clip('machine.windup','machine','windup','machine',[4,5],{fps:8});
clip('machine.attack','machine','attack','machine',[6,7],{fps:10});
clip('machine.chargeWindup','machine','chargeWindup','machine',[4,5],{fps:8});
clip('machine.chargeAttack','machine','chargeAttack','machine',[6,7],{fps:10});
clip('machine.rocksWindup','machine','rocksWindup','machine',[8,9],{fps:8});
clip('machine.rocksAttack','machine','rocksAttack','machine',[10,11],{fps:10});
clip('machine.waveWindup','machine','waveWindup','machine',[12,13],{fps:8});
clip('machine.waveAttack','machine','waveAttack','machine',[14,15],{fps:10});
clip('machine.mineralWindup','machine','mineralWindup','machine',[16,17,18],{fps:8});
clip('machine.mineralAttack','machine','mineralAttack','machine',[19,20],{fps:10});
clip('machine.hurt','machine','hurt','machine',[21],{fps:8});
clip('machine.transition','machine','transition','machine',[1]);
clip('machine.dead','machine','dead','machine',[22,23],{fps:8});
clip('worm.intro','worm','intro','worm',[0,1],{fps:4});
clip('worm.idle','worm','idle','worm',[2,3],{fps:4,loop:true});
clip('worm.spitWindup','worm','spitWindup','worm',[4,5],{fps:8,loop:true});
clip('worm.spitAttack','worm','spitAttack','worm',[6,7],{fps:10});
clip('worm.burrowWindup','worm','burrowWindup','worm',[8,9],{fps:8,loop:true});
clip('worm.burrowAttack','worm','burrowAttack','worm',[10,11],{fps:10});
clip('worm.tailWindup','worm','tailWindup','worm',[12,13],{fps:8,loop:true});
clip('worm.tailAttack','worm','tailAttack','worm',[14,15],{fps:10});
clip('worm.transition','worm','transition','worm',[16,17],{fps:4});
clip('worm.chargeWindup','worm','chargeWindup','worm',[18,19],{fps:8,loop:true});
clip('worm.chargeAttack','worm','chargeAttack','worm',[20,21],{fps:12,loop:true});
clip('worm.dead','worm','dead','worm',[22,23],{fps:8});
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
