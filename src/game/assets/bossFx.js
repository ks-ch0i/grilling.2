const core=Object.freeze({x:16,y:16,w:96,h:96});
const clips={};
function clip(key,texture,from,to,periodTicks,loop=false,entrance=false){
  clips[key]=Object.freeze({texture,frames:Object.freeze(Array.from({length:to-from+1},(_,i)=>from+i)),frameWidth:entrance?256:128,frameHeight:entrance?192:128,core:entrance?null:core,loop,periodTicks,...(entrance?{anchor:Object.freeze({x:128,y:176})}:{})});
}
clip('forest.branch','boss-forest-fx',0,3,12);
clip('forest.rootActive','boss-forest-fx',4,7,12);
clip('forest.rootRetract','boss-forest-fx',8,11,12);
clip('forest.slam','boss-forest-fx',12,15,12);
clip('machine.wave','boss-machine-fx',0,3,12,true);
clip('machine.rock','boss-machine-fx',4,7,16,true);
clip('machine.mineral','boss-machine-fx',8,11,12,true);
clip('machine.ceiling','boss-machine-fx',12,15,60);
clip('worm.tail','boss-worm-fx',0,3,18);
clip('worm.acid','boss-worm-fx',4,7,12,true);
clip('worm.pool','boss-worm-fx',8,11,24,true);
clip('worm.burrowWarning','boss-worm-fx',12,13,16,true);
clip('worm.burrowBurst','boss-worm-fx',14,15,18);
clip('entrance.burst','worm-entrance-fx',0,3,24,false,true);
clip('entrance.settle','worm-entrance-fx',4,7,96,false,true);
export const BOSS_FX_CLIPS=Object.freeze(clips);
function getClip(key){if(!Object.hasOwn(clips,key))throw new TypeError(`Unknown boss effect: ${key}`);return clips[key];}
export function sampleFxFrame(key,ageTicks,durationTicks){
  const c=getClip(key),duration=durationTicks??c.periodTicks;
  if(!Number.isFinite(ageTicks)||ageTicks<0||!Number.isFinite(duration)||duration<=0)throw new RangeError('Invalid effect time');
  const age=c.loop?ageTicks%duration:Math.min(ageTicks,duration);
  return c.frames[Math.min(c.frames.length-1,Math.floor(age*c.frames.length/duration))];
}
export function fxItem(key,id,rect,ageTicks,durationTicks,options={}){
  const c=getClip(key);if(!c.core)throw new TypeError('Entrance effect requires its ground anchor');
  if(typeof id!=='string'||!id)throw new TypeError('Invalid effect id');
  if(!rect||!['x','y','w','h'].every(k=>Number.isFinite(rect[k]))||rect.w<=0||rect.h<=0)throw new RangeError('Invalid effect rectangle');
  const {flipX=false,rotation=0,alpha=1,depth=4.4}=options;
  if(![rotation,alpha,depth].every(Number.isFinite)||alpha<0||alpha>1)throw new RangeError('Invalid effect appearance');
  return {id,texture:c.texture,frame:sampleFxFrame(key,ageTicks,durationTicks),x:rect.x+rect.w/2,y:rect.y+rect.h/2,width:c.frameWidth*rect.w/c.core.w,height:c.frameHeight*rect.h/c.core.h,flipX:Boolean(flipX),rotation,alpha,depth};
}
