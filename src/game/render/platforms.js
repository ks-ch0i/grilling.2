import {ARENA_PLATFORM_PRESETS} from '../content/arenaPlatformPresets.js';

const FRAME_WIDTH=16;
const VARIANT_COUNT=4;
const AUTHORED_TEXTURES={'forest-1':'forest-arena-platforms','mine-1':'mine-arena-platforms'};

export function authoredPlatformPlacements(stageId,layout){
  const presets=Object.hasOwn(ARENA_PLATFORM_PRESETS,stageId)?ARENA_PLATFORM_PRESETS[stageId]:null;
  const presetIndex=presets?.findIndex(preset=>preset.id===layout?.presetId)??-1;
  if(layout?.mode!=='authored'||presetIndex<0)throw new TypeError('Unknown authored terrain preset');
  return layout.platforms.map((platform,platformIndex)=>({
    x:platform.x-1,
    y:Math.min(...platform.topProfile)-1,
    texture:AUTHORED_TEXTURES[stageId],
    frame:presetIndex*3+platformIndex
  }));
}

export function platformModulePlacements(platform){
  if(platform&&platform.topProfile===undefined){
    const keys=Object.keys(platform).sort();
    if(keys.join(',')==='h,w,x,y'&&Number.isSafeInteger(platform.x)&&Number.isSafeInteger(platform.y)&&Number.isSafeInteger(platform.w)&&Number.isSafeInteger(platform.h))return [];
    throw new TypeError('Invalid platform profile');
  }
  if(!platform||!Number.isSafeInteger(platform.x)||!Number.isSafeInteger(platform.w)||platform.w<32||platform.w>112||platform.w%FRAME_WIDTH!==0||
    !Array.isArray(platform.topProfile)||platform.topProfile.length!==platform.w/FRAME_WIDTH||
    !Number.isInteger(platform.variant)||platform.variant<0||platform.variant>=VARIANT_COUNT||
    !platform.topProfile.every(Number.isSafeInteger))throw new TypeError('Invalid platform profile');

  const count=platform.w/FRAME_WIDTH;
  return platform.topProfile.map((y,sectionIndex)=>({
    x:platform.x+sectionIndex*FRAME_WIDTH,
    y,
    frame:platform.variant*3+(sectionIndex===0?0:sectionIndex===count-1?2:1)
  }));
}

export function terrainLayoutSignature(layout,floor){
  return JSON.stringify({mode:layout.mode,...(layout.mode==='authored'?{presetId:layout.presetId}:{}),floor:[floor.x,floor.y,floor.w,floor.h],platforms:layout.platforms.map(platform=>
    Array.isArray(platform.topProfile)?[platform.x,platform.w,platform.topProfile,platform.variant]:[platform.x,platform.y,platform.w,platform.h])});
}

export function platformTopEdgeSegments(platform){
  return platformModulePlacements(platform).map(({x,y})=>({x,y,w:FRAME_WIDTH,h:1}));
}
