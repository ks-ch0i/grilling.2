const FRAME_WIDTH=16;
const VARIANT_COUNT=4;

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
  return JSON.stringify({mode:layout.mode,floor:[floor.x,floor.y,floor.w,floor.h],platforms:layout.platforms.map(platform=>
    Array.isArray(platform.topProfile)?[platform.x,platform.w,platform.topProfile,platform.variant]:[platform.x,platform.y,platform.w,platform.h])});
}

export function platformTopEdgeSegments(platform){
  return platformModulePlacements(platform).map(({x,y})=>({x,y,w:FRAME_WIDTH,h:1}));
}
