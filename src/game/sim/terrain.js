import {createPlayer,stepPlayer} from './player.js';
import {nextRandom} from './mineCarts.js';

const PLATFORM_HEIGHT=16;
const WIDTHS=[32,48,64,80,96,112];
const NARROW_WIDTHS=WIDTHS.slice(0,3);
const WIDE_WIDTHS=WIDTHS.slice(3);
const FALLBACK=[
  {x:96,y:288,w:64,h:16},
  {x:224,y:288,w:64,h:16},
  {x:352,y:288,w:64,h:16},
  {x:480,y:288,w:64,h:16}
];
const INPUT=(move,jumpPressed=false)=>({move,jumpPressed,jumpHeld:true,attackPressed:false,rollPressed:false,divePressed:false,aimX:320,aimY:290});
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const sameRect=(a,b)=>a.x===b.x&&a.y===b.y&&a.w===b.w&&a.h===b.h;
const hasExactKeys=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));

function getStageGeometry(stage){
  if(!stage||!['forest-1','mine-1'].includes(stage.id))throw new TypeError('Unknown terrain stage');
  const {arena,world,spawn,solids}=stage;
  if(!arena||!world||!spawn||!Array.isArray(solids)||!solids.length||
    !['left','right','top','bottom'].every(key=>Number.isFinite(arena[key]))||
    !Number.isFinite(world.width)||!Number.isFinite(world.height)||
    !Number.isFinite(spawn.x)||!Number.isFinite(solids[0].y))throw new TypeError('Malformed terrain stage');
  return {arena,world,spawn,floor:solids[0]};
}

function collisionSolids(stage,platforms){
  const {world}=getStageGeometry(stage);
  return [
    stage.solids[0],...platforms,
    {x:-16,y:0,w:16,h:world.height},
    {x:world.width,y:0,w:16,h:world.height},
    {x:0,y:-16,w:world.width,h:16}
  ];
}

function takeoffXs(source,target,isFloor,worldWidth,playerWidth){
  const min=isFloor?0:source.x-playerWidth+1;
  const max=isFloor?worldWidth-playerWidth:source.x+source.w-1;
  const candidates=new Set();
  if(isFloor){
    for(const offset of [4,12,20,28,40,56]){
      candidates.add(target.x-playerWidth-offset);
      candidates.add(target.x+target.w+offset);
    }
  }else{
    const span=source.w-playerWidth;
    for(let i=0;i<=8;i++)candidates.add(Math.round(source.x+i*span/8));
    candidates.add(target.x-playerWidth);
    candidates.add(target.x+target.w);
  }
  return [...candidates].filter(x=>Number.isInteger(x)&&x>=min&&x<=max&&
    (x+playerWidth<=target.x||x>=target.x+target.w))
    .filter(x=>x>=min&&x<=max)
    .sort((a,b)=>Math.abs((a+playerWidth/2)-(target.x+target.w/2))-Math.abs((b+playerWidth/2)-(target.x+target.w/2)));
}

function canJumpTo(stage,platforms,source,target,isFloor){
  const {world}=getStageGeometry(stage),terrain=collisionSolids(stage,platforms);
  const starts=takeoffXs(source,target,isFloor,world.width,16);
  for(const x of starts){
    for(const direction of [-1,1]){
      const player={...createPlayer(x,source.y-28),grounded:true};
      let state=player;
      for(let tick=0;tick<100;tick++){
        const clearAbove=state.y+state.h<=target.y;
        const center=state.x+state.w/2;
        const targetCenter=direction>0?target.x+Math.min(target.w/2,12):target.x+target.w-Math.min(target.w/2,12);
        const move=clearAbove?(Math.abs(center-targetCenter)<1?0:Math.sign(targetCenter-center)):0;
        const result=stepPlayer(state,INPUT(move,tick===0),terrain,stage.pitDeathY??world.height+16);
        state=result.player;
        if(state.grounded){
          if(Math.abs(state.y+state.h-target.y)<1e-6&&state.x<target.x+target.w&&state.x+state.w>target.x)return true;
          break;
        }
        if(state.y>world.height||state.x+state.w<0||state.x>world.width)break;
      }
    }
  }
  return false;
}

function reachableFromFloor(stage,platforms){
  const {floor}=getStageGeometry(stage);
  const nodes=[floor,...platforms],reachable=new Set([0]),queue=[0];
  while(queue.length){
    const sourceIndex=queue.shift(),source=nodes[sourceIndex],isFloor=sourceIndex===0;
    for(let targetIndex=1;targetIndex<nodes.length;targetIndex++){
      if(reachable.has(targetIndex))continue;
      if(canJumpTo(stage,platforms,source,nodes[targetIndex],isFloor)){
        reachable.add(targetIndex);queue.push(targetIndex);
      }
    }
  }
  return reachable.size===nodes.length;
}

export function validatePlatformLayout(stage,layout){
  const {arena,spawn,floor}=getStageGeometry(stage);
  if(!hasExactKeys(layout,['mode','platforms'])||!['random','legacy-fixed'].includes(layout.mode)||!Array.isArray(layout.platforms))throw new TypeError('Invalid terrain layout');
  const {mode,platforms}=layout;
  if(mode==='random'&&(platforms.length<4||platforms.length>6)||mode==='legacy-fixed'&&platforms.length!==stage.solids.length-1)throw new RangeError('Invalid platform count');
  const fixed=stage.solids.slice(1);
  for(const platform of platforms){
    if(!hasExactKeys(platform,['x','y','w','h'])||!['x','y','w','h'].every(key=>Number.isSafeInteger(platform[key]))||platform.h!==PLATFORM_HEIGHT)throw new TypeError('Invalid platform rectangle');
    if(platform.x<arena.left||platform.x+platform.w>arena.right||platform.y<arena.top||platform.y+platform.h>arena.bottom||
      platform.x<floor.x||platform.x+platform.w>floor.x+floor.w)throw new RangeError('Platform is outside the arena');
    if(mode==='random'&&(!WIDTHS.includes(platform.w)||platform.y<248||platform.y>288))throw new RangeError('Random platform dimensions are outside the allowed range');
    const startClearance={x:arena.left,y:arena.bottom-64,w:Math.max(0,spawn.x+64-arena.left),h:64};
    if(mode==='random'&&overlaps(platform,startClearance))throw new RangeError('Platform blocks the start corridor');
  }
  if(mode==='legacy-fixed'&&platforms.some((platform,index)=>!sameRect(platform,fixed[index])))throw new RangeError('Legacy terrain must match the fixed stage layout');
  for(let i=0;i<platforms.length;i++)for(let j=i+1;j<platforms.length;j++)if(overlaps(platforms[i],platforms[j]))throw new RangeError('Platforms overlap');
  if(!reachableFromFloor(stage,platforms))throw new RangeError('A platform cannot be reached from the floor');
  return true;
}

function draw(state){
  const result=nextRandom(state);
  return {state:result.state,value:result.value};
}

function createCandidate(stage,state,count){
  let nextState=state;
  let choice;
  const platforms=[];
  for(let i=0;i<count;i++){
    choice=draw(nextState);nextState=choice.state;
    const widthClass=choice.value<.8?NARROW_WIDTHS:WIDE_WIDTHS;
    choice=draw(nextState);nextState=choice.state;
    const width=widthClass[Math.floor(choice.value*widthClass.length)];
    choice=draw(nextState);nextState=choice.state;
    const y=248+Math.floor(choice.value*41);
    const minX=Math.ceil(stage.arena.left),maxX=Math.floor(stage.arena.right-width);
    if(maxX<minX)return {layout:null,rngState:nextState};
    let platform=null;
    for(let attempt=0;attempt<64;attempt++){
      choice=draw(nextState);nextState=choice.state;
      const x=minX+Math.floor(choice.value*(maxX-minX+1));
      const candidate={x,y,w:width,h:PLATFORM_HEIGHT};
      const clearance={x:stage.arena.left,y:stage.arena.bottom-64,w:Math.max(0,stage.spawn.x+64-stage.arena.left),h:64};
      if(overlaps(candidate,clearance)||platforms.some(existing=>overlaps(candidate,existing)))continue;
      platform=candidate;break;
    }
    if(!platform)return {layout:null,rngState:nextState};
    platforms.push(platform);
  }
  return {layout:{mode:'random',platforms},rngState:nextState};
}

export function createRandomPlatformLayout(stage,rngState){
  getStageGeometry(stage);
  if(!Number.isInteger(rngState)||rngState<0||rngState>0xffffffff)throw new RangeError('Invalid terrain RNG state');
  const countChoice=draw(rngState);
  const count=countChoice.value<.2?4:countChoice.value<.6?5:6;
  let state=countChoice.state;
  for(let attempt=0;attempt<128;attempt++){
    const candidate=createCandidate(stage,state,count);
    state=candidate.rngState;
    if(!candidate.layout)continue;
    try{
      validatePlatformLayout(stage,candidate.layout);
      return {platforms:candidate.layout.platforms.map(platform=>({...platform})),rngState:state};
    }catch(error){
      if(!(error instanceof RangeError))throw error;
    }
  }
  const fallback=FALLBACK.map(platform=>({...platform}));
  validatePlatformLayout(stage,{mode:'random',platforms:fallback});
  return {platforms:fallback,rngState:state};
}
