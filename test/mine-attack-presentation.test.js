import test from 'node:test';import assert from 'node:assert/strict';
import {isBossSpriteHazard,collectBossHazardItems,collectMineBodyItems} from '../src/game/render/mineAttackPresentation.js';
import {MineHazardView} from '../src/game/render/MineHazardView.js';
import {createStageRun,stepStage,snapshotStageRun,restoreStageRun} from '../src/game/sim/stage.js';
import {createMineBoss} from '../src/game/sim/mineBoss.js';import {MINE_STAGE as stage} from '../src/game/content/mineStage.js';
const arena=stage.arena,input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:12000,aimY:290};
const h=(kind,ownerId,extra={})=>({id:ownerId+'-'+kind,ownerId,kind,x:11000,y:270,w:12,h:12,vx:120,vy:-40,life:60,alive:true,...extra});
test('only promised boss owner and kind pairs select new hazard sprites',()=>{
 const hazards=[h('wave','mine-machine',{w:8,h:30,life:488}),h('rock','mine-machine',{w:20,h:20,life:180}),h('mineral','mine-machine'),h('acid-shot','mine-worm',{w:8,h:8,life:180}),h('acid-pool','mine-worm',{w:28,h:6,life:1}),h('wave','golem-1'),h('acid-shot','insect-1'),h('acid-pool','insect-1'),h('cart','cart-1')];
 const original=structuredClone(hazards),items=collectBossHazardItems(hazards,30,arena);assert.equal(items.length,5);
 for(let i=0;i<5;i++){assert.equal(items[i].id,hazards[i].id);assert.equal(items[i].width*.75,hazards[i].w);assert.equal(items[i].height*.75,hazards[i].h);}
 for(const hazard of hazards.slice(5))assert.equal(isBossSpriteHazard(hazard),false);
 assert.equal(items[0].flipX,true);assert.equal(items[2].rotation,Math.atan2(-40,120));assert.equal(items[4].alpha,1);assert.deepEqual(hazards,original);
 assert.deepEqual(collectBossHazardItems([{...hazards[0],alive:false}],0,arena),[]);
});
test('rock warnings sit below HUD and tail core joins the proper body edge',()=>{
 const boss=createMineBoss('machine',stage.boss);Object.assign(boss,{state:'windup',attackKind:'rocks',stateTicks:30,telegraphs:[{x:10900,y:0,w:20,h:304}]});
 const cue=collectMineBodyItems(boss,0,arena)[0];assert.ok(cue.y-cue.height/2>37);assert.equal(cue.x,10910);
 for(const direction of [-1,1]){
  const b=createMineBoss('worm',{x:11000,y:240}),box={x:direction<0?10910:11096,y:256,w:90,h:48,ticks:18};Object.assign(b,{state:'attack',attackKind:'tail',lockedFacing:direction,hitboxes:[box]});
  const item=collectMineBodyItems(b,0,arena)[0];assert.equal(item.flipX,direction>0);assert.equal(direction<0?item.x+45:item.x-45,direction<0?b.x:b.x+b.w);
 }
});
test('each burrow warning follows its locked target and clears when the strike begins',()=>{
 const boss=createMineBoss('worm',{x:11000,y:240});Object.assign(boss,{phase:2,state:'windup',attackKind:'burrow',stateTicks:45,targetX:11100,trailStartX:10900});
 const a=collectMineBodyItems(boss,0,arena);assert.equal(a[0].x,10900);assert.equal(a[1].x,11100);boss.stateTicks=15;const b=collectMineBodyItems(boss,30,arena);assert.ok(b[0].x>a[0].x);assert.equal(b[1].x,11100);
 Object.assign(boss,{state:'attack',hitboxes:[{x:11076,y:240,w:48,h:64,ticks:18}]});assert.deepEqual(collectMineBodyItems(boss,45,arena).map(e=>e.id),['worm-burrow-0']);
});
test('presentation is stable across JSON restore and never changes the next simulation result',()=>{
 const run=createStageRun(stage,{}, {seed:14});run.boss.state='recovery';run.boss.stateTicks=30;run.hazards=[h('mineral','mine-machine',{life:47}),h('acid-pool','mine-worm',{w:28,h:6,life:155})];
 const before=structuredClone(run),items=collectBossHazardItems(run.hazards,run.elapsedTicks,arena);collectMineBodyItems(run.boss,run.elapsedTicks,arena);assert.deepEqual(run,before);assert.deepEqual(stepStage(run,input,stage),stepStage(before,input,stage));
 const restored=restoreStageRun(stage,JSON.parse(JSON.stringify(snapshotStageRun(run))));assert.deepEqual(collectBossHazardItems(restored.hazards,restored.elapsedTicks,arena),items);
});
test('real hazard view renders boss sprites while keeping ordinary enemy geometry and cleanup',()=>{
 const calls=[];function obj(){return new Proxy({destroyed:0,destroy(){this.destroyed++;}},{get(target,key){if(key in target)return target[key];return (...args)=>{calls.push([key,...args]);return target.proxy;};}});}
 function make(){const o=obj();o.proxy=o;return o;}
 const scene={stage,textures:{exists:()=>true},add:{graphics:make,sprite:make},cameras:{main:{scrollX:0}},audio:{playSfx:()=>true}};
 const view=new MineHazardView(scene),run=createStageRun(stage,{}, {seed:1});run.cartZones=[];run.hazards=[h('wave','mine-machine',{w:8,h:30,life:488}),h('wave','golem-1',{w:8,h:30})];
 view.sync(run);assert.equal(view.hazardLayer.items.size,1);assert.ok(view.hazardLayer.items.has('mine-machine-wave'));assert.equal(calls.filter(c=>c[0]==='fillTriangle').length,2);
 const sprite=view.hazardLayer.items.get('mine-machine-wave');run.hazards=[];view.sync(run);assert.equal(sprite.destroyed,1);view.destroy();assert.equal(view.hazardLayer.items.size,0);
});
