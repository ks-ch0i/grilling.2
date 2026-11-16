const dimensions={soldier:[20,28],wisp:[20,20],boar:[28,20],golem:[32,40],insect:[24,24],bat:[24,20]};
const species={
  'forest-1':['soldier','wisp','boar'],
  'mine-1':['golem','insect','bat']
};

export function validateStage(stage){
  if(!stage||!Object.hasOwn(species,stage.id)||!stage.world||!Array.isArray(stage.solids)||!Array.isArray(stage.enemies)||!Array.isArray(stage.pickups))throw new TypeError('Invalid stage structure');
  const {width,height}=stage.world;
  if(width!==640||height!==360)throw new RangeError('Stage must use the 640x360 arena');

  const rect=(r,label)=>{
    if(!r||!['x','y','w','h'].every(k=>Number.isFinite(r[k])))throw new TypeError(`Invalid ${label}`);
    if(r.x<0||r.y<0||r.w<=0||r.h<=0||r.x+r.w>width||r.y+r.h>height)throw new RangeError(`${label} outside world`);
  };
  for(const solid of stage.solids)rect(solid,'solid');
  const supported=r=>stage.solids.some(s=>s.y===r.y+r.h&&s.x<r.x+r.w&&s.x+s.w>r.x);
  const ids=new Set();
  const addId=item=>{
    if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id))throw new TypeError('Duplicate or invalid id');
    ids.add(item.id);
  };

  const arena=stage.arena;
  if(!arena||![arena.left,arena.right,arena.top,arena.bottom,stage.pitDeathY].every(Number.isFinite))throw new TypeError('Invalid arena');
  if(arena.left<0||arena.right>width||arena.top<0||arena.bottom>height||arena.left>=arena.right||arena.top>=arena.bottom||arena.right+16>width||stage.pitDeathY<0||stage.pitDeathY>height)throw new RangeError('Invalid arena or pit');

  addId(stage.boss);
  const bossHeight=stage.id==='forest-1'?96:64;
  const bossValid=stage.id==='forest-1'
    ?stage.boss.id==='forest-guardian'&&stage.boss.kind===undefined
    :stage.boss.id==='mine-machine'&&stage.boss.kind==='machine';
  if(!bossValid)throw new TypeError('Invalid boss');
  const boss={...stage.boss,w:80,h:bossHeight};
  rect(boss,'boss');
  if(boss.x<arena.left||boss.x+boss.w>arena.right||boss.y+boss.h!==arena.bottom||!supported(boss))throw new RangeError('Boss is outside or unsupported in arena');

  const spawn={...stage.spawn,w:16,h:28};
  rect(spawn,'spawn');
  if(!supported(spawn))throw new RangeError('Spawn is not supported');

  if(stage.enemies.length!==species[stage.id].length)throw new RangeError('Stage must expose one template per enemy species');
  const kinds=new Set();
  for(const enemy of stage.enemies){
    addId(enemy);
    const size=dimensions[enemy.kind];
    if(!size||!species[stage.id].includes(enemy.kind)||kinds.has(enemy.kind))throw new TypeError('Invalid enemy template kind');
    kinds.add(enemy.kind);
    const box={...enemy,w:size[0],h:size[1]};
    rect(box,'enemy template');
    if(box.x<arena.left||box.x+box.w>arena.right||box.y+box.h>arena.bottom)throw new RangeError('Enemy template outside arena');
    if(enemy.kind!=='bat'&&!supported(box))throw new RangeError('Enemy template is not supported');
  }
  if(species[stage.id].some(kind=>!kinds.has(kind)))throw new TypeError('Missing enemy template kind');

  for(const pickup of stage.pickups){
    addId(pickup);
    if(pickup.kind!=='heal')throw new TypeError('Invalid pickup kind');
    rect({...pickup,w:16,h:16},'pickup');
  }
  return true;
}
