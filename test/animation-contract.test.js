import test from 'node:test';import assert from 'node:assert/strict';import {ANIMATIONS} from '../src/game/assets/manifest.js';
import {playerAnimation,enemyAnimation,bossAnimation,animationFrame,playerAttackFrame} from '../src/game/assets/animation.js';
import {createPlayer} from '../src/game/sim/player.js';import {createEnemy} from '../src/game/sim/enemies.js';import {createBoss} from '../src/game/sim/boss.js';
import {createMineBoss} from '../src/game/sim/mineBoss.js';
import {drawMachineBossEffect,drawWormBossEffect} from '../src/game/render/bossEffects.js';
import {collectForestAttackItems} from '../src/game/render/forestAttackPresentation.js';
test('hero has all 8 directions for idle, walking and attack',()=>{
 const p=createPlayer();for(let direction=0;direction<8;direction++){p.facing=direction;p.mode='idle';assert.equal(playerAnimation(p).frames[0],direction);p.mode='run';assert.equal(playerAnimation(p).direction,direction);assert.deepEqual(playerAnimation(p).frames,[direction,direction+8]);p.mode='attack';assert.equal(playerAnimation(p).frames[0],direction);}
 for(const mode of ['run','jump','fall','roll','dive','hurt','dead']){p.mode=mode;p.facing=0;assert.equal(playerAnimation(p).state,mode);}
});
test('mine enemies and each boss resolve their own poses',()=>{
 for(const kind of ['golem','insect','bat']){const e=createEnemy({id:'x',kind,x:0,y:0});for(const state of ['idle','chase','windup','attack','return','recovery','hurt','dead']){e.state=state;assert.equal(enemyAnimation(e).state,state);}}
 for(const kind of ['machine','worm']){const b=createMineBoss(kind,{x:0,y:0});for(const state of ['intro','windup','attack','transition']){b.state=state;if(kind==='worm'&&['windup','attack'].includes(state))b.attackKind='spit';assert.equal(bossAnimation(b).owner,kind);const expected=kind==='worm'&&['windup','attack'].includes(state)?`spit${state==='windup'?'Windup':'Attack'}`:state;assert.equal(bossAnimation(b).state,expected);}}
});
test('attack poses follow attack ticks and current direction without restarting',()=>{
 const p=createPlayer();p.mode='attack';for(let d=0;d<8;d++){p.facing=d;assert.deepEqual(playerAnimation(p).frames,[d,d+8,d+16]);for(const [tick,row] of [[0,0],[1,0],[4,0],[5,8],[9,8],[10,16],[18,16]]){p.attackTick=tick;assert.equal(playerAttackFrame(p),d+row);}}
 p.attackTick=6;p.facing=0;assert.equal(playerAttackFrame(p),8);p.facing=4;assert.equal(playerAttackFrame(p),12);
});
test('enemy and boss states select clips and frame time depends on ticks',()=>{
 for(const kind of ['soldier','wisp','boar']){const e=createEnemy({id:'x',kind,x:0,y:0});for(const state of ['idle','chase','windup','attack','recovery','hurt','dead']){e.state=state;assert.equal(enemyAnimation(e).state,state);}}
 const boss=createBoss({id:'b',x:0,y:0});boss.state='transition';assert.equal(bossAnimation(boss).state,'transition');
 for(const kind of ['branch','slam'])for(const state of ['windup','attack']){boss.state=state;boss.attackKind=kind;assert.equal(bossAnimation(boss).state,`${kind}${state==='windup'?'Windup':'Attack'}`);}
 const run=ANIMATIONS['hero.run.0'];assert.equal(animationFrame(run,0),0);assert.equal(animationFrame(run,7),8);assert.equal(animationFrame(run,14),0);
});
test('forest attack sheets and independent root presentation map to actual hit regions',()=>{
 for(const [kind,windup,attack] of [['branch',[4,5],[6,7,8]],['root',[9,10],[11,12]],['slam',[13,14],[15,16,17]]]){
  assert.deepEqual(ANIMATIONS[`boss.${kind}Windup`].frames,windup);assert.deepEqual(ANIMATIONS[`boss.${kind}Attack`].frames,attack);
  const r={x:100,y:50,w:kind==='root'?48:90,h:kind==='root'?48:66,ticks:12};
  const b={state:kind==='root'?'recovery':'attack',attackKind:kind,lockedFacing:1,hitboxes:[r],rootEffects:kind==='root'?[{x:r.x,y:r.y,w:r.w,h:r.h,age:0,strike:2}]:[]};
  const items=collectForestAttackItems(b,0);assert.equal(items.length,1);assert.equal(items[0].x,r.x+r.w/2);assert.equal(items[0].y,r.y+r.h/2);assert.equal(items[0].width*.75,r.w);assert.equal(items[0].height*.75,r.h);
 }
 assert.deepEqual(collectForestAttackItems({state:'windup',attackKind:'root',telegraphs:[{x:0,y:0,w:48,h:48}],rootEffects:[]},0),[]);
});
test('machine uses attack-specific poses for charge, rocks, wave and mineral spray',()=>{
 for(const [kind,windup,attack] of [['charge',[4,5],[6,7]],['rocks',[8,9],[10,11]],['wave',[12,13],[14,15]],['mineral',[16,17,18],[19,20]]]){
  assert.deepEqual(ANIMATIONS[`machine.${kind}Windup`].frames,windup);assert.deepEqual(ANIMATIONS[`machine.${kind}Attack`].frames,attack);
  const boss=createMineBoss('machine',{x:100,y:200});boss.state='windup';boss.attackKind=kind;assert.equal(bossAnimation(boss).key,`machine.${kind}Windup`);boss.state='attack';assert.equal(bossAnimation(boss).key,`machine.${kind}Attack`);
 }
 const calls=[],graphics={fillStyle(...args){calls.push(['fillStyle',...args]);return this;},fillCircle(...args){calls.push(['fillCircle',...args]);return this;},lineStyle(...args){calls.push(['lineStyle',...args]);return this;},strokeCircle(...args){calls.push(['strokeCircle',...args]);return this;}};
 drawMachineBossEffect(graphics,{x:100,y:200,w:80,state:'windup',stateTicks:30,attackKind:'mineral'});assert.ok(calls.some(call=>call[0]==='fillCircle'));
});
test('worm uses distinct attack poses and draws cues inside the existing attack bounds',()=>{
 for(const [kind,windup,attack] of [['spit',[4,5],[6,7]],['burrow',[8,9],[10,11]],['tail',[12,13],[14,15]],['charge',[18,19],[20,21]]]){
  assert.deepEqual(ANIMATIONS[`worm.${kind}Windup`].frames,windup);assert.deepEqual(ANIMATIONS[`worm.${kind}Attack`].frames,attack);
  const boss=createMineBoss('worm',{x:100,y:200});boss.state='windup';boss.attackKind=kind;assert.equal(bossAnimation(boss).key,`worm.${kind}Windup`);boss.state='attack';assert.equal(bossAnimation(boss).key,`worm.${kind}Attack`);
 }
 const r={x:40,y:80,w:90,h:48},graphics={strokes:[],triangles:[],fills:[],path:[],width:1,
  fillStyle(...args){this.fills.push(args);return this;},fillCircle(...args){this.fills.push(args);return this;},
  lineStyle(width){this.width=width;return this;},strokeCircle(){return this;},beginPath(){this.path=[];return this;},
  moveTo(x,y){this.path.push([x,y]);return this;},lineTo(x,y){this.path.push([x,y]);return this;},strokePath(){this.strokes.push({width:this.width,points:[...this.path]});return this;},
  fillTriangle(...points){this.triangles.push(points);return this;}};
 drawWormBossEffect(graphics,{state:'windup',attackKind:'tail',lockedFacing:1,telegraphs:[r],hitboxes:[]});
 drawWormBossEffect(graphics,{state:'attack',attackKind:'tail',lockedFacing:-1,telegraphs:[],hitboxes:[r]});
 assert.ok(graphics.strokes.length>=5);for(const line of graphics.strokes)for(const [x,y] of line.points)assert.ok(x-line.width/2>=r.x&&x+line.width/2<=r.x+r.w&&y-line.width/2>=r.y&&y+line.width/2<=r.y+r.h);
 drawWormBossEffect(graphics,{state:'transition',stateTicks:15,x:100,y:200,w:96});assert.ok(graphics.fills.length>0);
});
