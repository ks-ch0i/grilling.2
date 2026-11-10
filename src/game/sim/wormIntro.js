export const WORM_INTRO_TICKS=240;
export const WORM_INTRO_BURST_TICK=96;
export const WORM_INTRO_BLACKOUT_TICK=120;
export const WORM_INTRO_REVEAL_TICK=144;
export function getWormIntroTimeline(remainingTicks){
  if(!Number.isSafeInteger(remainingTicks)||remainingTicks<0||remainingTicks>WORM_INTRO_TICKS)throw new RangeError('Invalid worm intro time');
  const elapsedTicks=WORM_INTRO_TICKS-remainingTicks;
  if(remainingTicks===0)return {elapsedTicks,phase:'done',phaseTicks:0,phaseDuration:0,showBody:true,showBossHud:true,mapDimAlpha:0,blackoutAlpha:0};
  const [phase,start,phaseDuration]=elapsedTicks<96?['flicker',0,96]:elapsedTicks<120?['burst',96,24]:elapsedTicks<144?['blackout',120,24]:['reveal',144,96];
  const phaseTicks=elapsedTicks-start,showBody=phase==='reveal';
  return {elapsedTicks,phase,phaseTicks,phaseDuration,showBody,showBossHud:showBody,mapDimAlpha:phase==='flicker'?(Math.floor(elapsedTicks/16)%2?.50:.12):0,blackoutAlpha:phase==='blackout'?1:showBody?Math.max(0,1-phaseTicks/12):0};
}
