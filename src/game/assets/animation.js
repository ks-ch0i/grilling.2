import {ANIMATIONS} from './manifest.js';
import {ATTACK_STARTUP,ATTACK_ACTIVE} from '../sim/constants.js';
export function playerAnimation(player){
 if(player.mode==='attack')return ANIMATIONS[`hero.attack.${player.facing}`];
 if(player.mode==='idle')return ANIMATIONS[`hero.idle.${player.facing}`];
 if(player.mode==='run')return ANIMATIONS[`hero.run.${player.facing}`];
 return ANIMATIONS[`hero.${player.mode}`]??ANIMATIONS['hero.idle.0'];
}
export function enemyAnimation(enemy){return ANIMATIONS[`${enemy.kind}.${enemy.state}`]??ANIMATIONS[`${enemy.kind}.idle`];}
export function bossAnimation(boss){
 if(boss.kind==='machine'){
  if(['windup','attack'].includes(boss.state)&&['charge','rocks','wave','mineral'].includes(boss.attackKind))return ANIMATIONS[`machine.${boss.attackKind}${boss.state==='windup'?'Windup':'Attack'}`];
  const state=boss.state==='intro'?'intro':boss.state==='transition'?'transition':['dying','dead'].includes(boss.state)?'dead':['windup','attack'].includes(boss.state)?boss.state:'idle';
  return ANIMATIONS[`machine.${state}`];
 }
 if(boss.kind==='worm'){
  if(['windup','attack'].includes(boss.state)&&['spit','burrow','tail','charge'].includes(boss.attackKind))return ANIMATIONS[`worm.${boss.attackKind}${boss.state==='windup'?'Windup':'Attack'}`];
  const state=boss.state==='intro'?'intro':boss.state==='transition'?'transition':['dying','dead'].includes(boss.state)?'dead':['windup','attack'].includes(boss.state)?boss.state:'idle';
  return ANIMATIONS[`worm.${state}`]??ANIMATIONS['worm.idle'];
 }
 let state='idle';
 if(boss.state==='intro')state='intro';else if(boss.state==='transition')state='transition';else if(['dying','dead'].includes(boss.state))state='dead';
 else if(['windup','attack'].includes(boss.state)&&['branch','root','slam'].includes(boss.attackKind))state=`${boss.attackKind}${boss.state==='windup'?'Windup':'Attack'}`;
 return ANIMATIONS[`boss.${state}`]??ANIMATIONS['boss.idle'];
}
export function animationFrame(clip,elapsedTicks){const index=Math.floor(Math.max(0,elapsedTicks)*clip.fps/60);return clip.frames[clip.loop?index%clip.frames.length:Math.min(index,clip.frames.length-1)];}
export function playerAttackFrame(player){
 const phase=player.attackTick<=ATTACK_STARTUP?0:player.attackTick<=ATTACK_STARTUP+ATTACK_ACTIVE?1:2;
 return ANIMATIONS[`hero.attack.${player.facing}`].frames[phase];
}
