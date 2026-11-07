const pits = [[1504,1568],[3136,3200],[4960,5024],[6848,6912],[8752,8816]];
const ground = [];
let left = 0;
for (const [start, end] of pits) { ground.push({x:left,y:304,w:start-left,h:56}); left=end; }
ground.push({x:left,y:304,w:11520-left,h:56});
export const FOREST_STAGE = {
  id:'forest-1', world:{width:11520,height:360}, spawn:{x:120,y:276},
  solids:[...ground,...[1800,3488,5504,7360,9120].map(x=>({x,y:256,w:128,h:16})),...[1216,2800,4384,6624,9504].map(x=>({x,y:288,w:32,h:16}))],
  pitDeathY:344, checkpoint:{id:'mid',x:5760,y:276},
  pickups:[{id:'heal-1',kind:'heal',x:2400,y:288},{id:'heal-2',kind:'heal',x:6200,y:288},{id:'heal-3',kind:'heal',x:9600,y:288}],
  enemies:[
    ...[800,2600,7600].map((x,i)=>({id:`soldier-${i+1}`,kind:'soldier',x,y:276})),
    ...[2200,5200,8300].map((x,i)=>({id:`wisp-${i+1}`,kind:'wisp',x,y:284})),
    ...[3900,6900,9900].map((x,i)=>({id:`boar-${i+1}`,kind:'boar',x,y:284}))
  ],
  arena:{left:10496,right:11472,top:0,bottom:304}, boss:{id:'forest-guardian',x:11040,y:208}
};
export function validateStage(stage) {
  if (!stage || stage.id !== 'forest-1' || !stage.world || !Array.isArray(stage.solids) || !Array.isArray(stage.enemies) || !Array.isArray(stage.pickups)) throw new TypeError('Invalid stage structure');
  const {width,height}=stage.world;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width<=0 || height<=0) throw new RangeError('Invalid world size');
  const rect=(r, label)=>{
    if (!r || !['x','y','w','h'].every(k=>Number.isFinite(r[k]))) throw new TypeError(`Invalid ${label}`);
    if (r.x<0 || r.y<0 || r.w<=0 || r.h<=0 || r.x+r.w>width || r.y+r.h>height) throw new RangeError(`${label} outside world`);
  };
  for (const solid of stage.solids) rect(solid,'solid');
  const supported=(r)=>stage.solids.some(s=>s.y===r.y+r.h && s.x<r.x+r.w && s.x+s.w>r.x);
  const ids=new Set();
  const id=(item)=>{ if (!item || typeof item.id!=='string' || !item.id || ids.has(item.id)) throw new TypeError('Duplicate or invalid id'); ids.add(item.id); };
  if (stage.checkpoint?.id!=='mid' || stage.boss?.id!=='forest-guardian') throw new TypeError('Invalid checkpoint or boss id');
  id(stage.checkpoint); id(stage.boss);
  rect({...stage.spawn,w:16,h:28},'spawn'); rect({...stage.checkpoint,w:16,h:28},'checkpoint');
  rect({...stage.boss,w:80,h:96},'boss');
  for (const point of [{...stage.spawn,w:16,h:28},{...stage.checkpoint,w:16,h:28},{...stage.boss,w:80,h:96}]) if (!supported(point)) throw new RangeError('Spawn is not supported');
  for (const pickup of stage.pickups) { id(pickup); if (pickup.kind!=='heal') throw new TypeError('Invalid pickup kind'); rect({...pickup,w:16,h:16},'pickup'); }
  const dimensions={soldier:[20,28],wisp:[20,20],boar:[28,20]};
  for (const enemy of stage.enemies) { id(enemy); const d=dimensions[enemy.kind]; if (!d) throw new TypeError('Invalid enemy kind'); rect({...enemy,w:d[0],h:d[1]},'enemy'); if (!supported({...enemy,w:d[0],h:d[1]})) throw new RangeError('Enemy spawn is not supported'); }
  const a=stage.arena;
  if (!a || ![a.left,a.right,a.top,a.bottom,stage.pitDeathY].every(Number.isFinite)) throw new TypeError('Invalid arena');
  if (a.left<0 || a.right>width || a.top<0 || a.bottom>height || a.left>=a.right || a.top>=a.bottom || stage.pitDeathY<0 || stage.pitDeathY>height || stage.boss.x<a.left || stage.boss.x+80>a.right) throw new RangeError('Invalid arena or pit');
  return true;
}
