import {fxItem} from '../assets/bossFx.js';
export function collectForestAttackItems(boss,_elapsedTicks){
  if(['dormant','intro','transition','dying','dead'].includes(boss.state))return [];
  const items=[];
  if(boss.state==='attack'&&['branch','slam'].includes(boss.attackKind))for(const [i,box] of boss.hitboxes.entries())items.push(fxItem(`forest.${boss.attackKind}`,`forest-${boss.attackKind}-${i}`,box,Math.max(0,12-box.ticks),12,{flipX:boss.lockedFacing>0}));
  for(const effect of boss.rootEffects??[]){
    const active=effect.age<12;
    items.push(fxItem(active?'forest.rootActive':'forest.rootRetract',`forest-root-${effect.strike}`,effect,active?effect.age:effect.age-12,12,{alpha:active?1:.45*(24-effect.age)/12}));
  }
  return items;
}
