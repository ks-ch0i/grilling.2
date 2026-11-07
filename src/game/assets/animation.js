import {ANIMATIONS} from './manifest.js';
export function playerAnimation(player){
 if(player.mode==='attack')return ANIMATIONS[`hero.attack.${player.facing}`];
 if(player.mode==='idle')return ANIMATIONS[`hero.idle.${player.facing}`];
 if(player.mode==='run')return ANIMATIONS[`hero.run.${player.facing}`];
 return ANIMATIONS[`hero.${player.mode}`]??ANIMATIONS['hero.idle.0'];
}
export function enemyAnimation(enemy){return ANIMATIONS[`${enemy.kind}.${enemy.state}`]??ANIMATIONS[`${enemy.kind}.idle`];}
export function bossAnimation(boss){
 let state='idle';
 if(boss.state==='intro')state='intro';else if(boss.state==='transition')state='transition';else if(['dying','dead'].includes(boss.state))state='dead';
 else if(['windup','attack'].includes(boss.state)){if(boss.attackKind==='branch')state=boss.state==='windup'?'branchWindup':'branchAttack';else state=boss.attackKind;}
 return ANIMATIONS[`boss.${state}`]??ANIMATIONS['boss.idle'];
}
export function animationFrame(clip,elapsedTicks){const index=Math.floor(Math.max(0,elapsedTicks)*clip.fps/60);return clip.frames[clip.loop?index%clip.frames.length:Math.min(index,clip.frames.length-1)];}
