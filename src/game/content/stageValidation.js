const dimensions={soldier:[20,28],wisp:[20,20],boar:[28,20],golem:[32,40],insect:[24,24],bat:[24,20]};
export function validateStage(stage){
 if(!stage||!['forest-1','mine-1'].includes(stage.id)||!stage.world||!Array.isArray(stage.solids)||!Array.isArray(stage.enemies)||!Array.isArray(stage.pickups))throw new TypeError('Invalid stage structure');
 const {width,height}=stage.world;if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new RangeError('Invalid world size');
 const rect=(r,label)=>{if(!r||!['x','y','w','h'].every(k=>Number.isFinite(r[k])))throw new TypeError(`Invalid ${label}`);if(r.x<0||r.y<0||r.w<=0||r.h<=0||r.x+r.w>width||r.y+r.h>height)throw new RangeError(`${label} outside world`);};
 for(const solid of stage.solids)rect(solid,'solid');
 const supported=r=>stage.solids.some(s=>s.y===r.y+r.h&&s.x<r.x+r.w&&s.x+s.w>r.x);
 const ids=new Set();const id=item=>{if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id))throw new TypeError('Duplicate or invalid id');ids.add(item.id);};
 id(stage.boss);const bossHeight=stage.id==='forest-1'?96:64;
 if(stage.id==='forest-1'&&stage.boss.id!=='forest-guardian'||stage.id==='mine-1'&&(stage.boss.id!=='mine-machine'||stage.boss.kind!=='machine'))throw new TypeError('Invalid boss');
 for(const point of [{...stage.spawn,w:16,h:28},{...stage.boss,w:80,h:bossHeight}]){rect(point,'spawn');if(!supported(point))throw new RangeError('Spawn is not supported');}
 for(const pickup of stage.pickups){id(pickup);if(pickup.kind!=='heal')throw new TypeError('Invalid pickup kind');rect({...pickup,w:16,h:16},'pickup');}
 for(const enemy of stage.enemies){id(enemy);const d=dimensions[enemy.kind];if(!d||stage.id==='forest-1'&&!['soldier','wisp','boar'].includes(enemy.kind)||stage.id==='mine-1'&&!['golem','insect','bat'].includes(enemy.kind))throw new TypeError('Invalid enemy kind');const box={...enemy,w:d[0],h:d[1]};rect(box,'enemy');if(enemy.kind!=='bat'&&!supported(box))throw new RangeError('Enemy spawn is not supported');}
 const a=stage.arena;if(!a||![a.left,a.right,a.top,a.bottom,stage.pitDeathY].every(Number.isFinite))throw new TypeError('Invalid arena');
 if(a.left<0||a.right>width||a.top<0||a.bottom>height||a.left>=a.right||a.top>=a.bottom||stage.pitDeathY<0||stage.pitDeathY>height||stage.boss.x<a.left||stage.boss.x+80>a.right)throw new RangeError('Invalid arena or pit');
 return true;
}
