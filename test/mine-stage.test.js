import test from 'node:test';import assert from 'node:assert/strict';
import {MINE_STAGE} from '../src/game/content/mineStage.js';import {getStage,validateStage} from '../src/game/content/stages.js';
import {createStageRun,snapshotStageRun,restoreStageRun,stepStage} from '../src/game/sim/stage.js';import {freshSave,parseSave} from '../src/game/storage/saveStore.js';
const input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:500,aimY:290};
test('mine is a supported single-screen arena with three enemy templates',()=>{
 assert.equal(getStage('mine-1'),MINE_STAGE);assert.equal(validateStage(MINE_STAGE),true);assert.throws(()=>getStage('__proto__'),TypeError);
 assert.deepEqual(MINE_STAGE.world,{width:640,height:360});assert.deepEqual(MINE_STAGE.arena,{left:16,right:624,top:0,bottom:304});
 assert.equal(MINE_STAGE.enemies.length,3);assert.deepEqual(new Set(MINE_STAGE.enemies.map(e=>e.kind)),new Set(['golem','insect','bat']));assert.deepEqual(MINE_STAGE.pickups,[]);
 assert.equal(MINE_STAGE.boss.id,'mine-machine');assert.ok(MINE_STAGE.boss.x+80<=MINE_STAGE.arena.right);
 const broken=structuredClone(MINE_STAGE);broken.enemies[0].y--;assert.throws(()=>validateStage(broken),RangeError);
 const outside=structuredClone(MINE_STAGE);outside.boss.x=600;assert.throws(()=>validateStage(outside),RangeError);
});
test('mine snapshot preserves random zones and hazard state through actual save parsing',()=>{
 const r=createStageRun(MINE_STAGE,{}, {seed:123});r.hazards.push({id:'acid-1',ownerId:'insect-1',kind:'acid-pool',x:300,y:298,w:28,h:6,vx:0,vy:0,life:37,alive:true});r.cartZones[0].state='warning';r.cartZones[0].ticks=12;
 const save={...freshSave(),run:snapshotStageRun(r),unlockedStageIds:['forest-1','mine-1']},parsed=parseSave(JSON.stringify(save));assert.equal(parsed.ok,true);
 const restored=restoreStageRun(MINE_STAGE,parsed.save.run);assert.deepEqual(stepStage(restored,input,MINE_STAGE),stepStage(r,input,MINE_STAGE));
 const broken=structuredClone(save);broken.run.cartZones[0].centerX=79;assert.equal(parseSave(JSON.stringify(broken)).ok,false);
});
test('death regenerates cart zones while continuation preserves them',()=>{
 let r=createStageRun(MINE_STAGE,{}, {seed:5}),original=structuredClone(r.cartZones);const continued=restoreStageRun(MINE_STAGE,JSON.parse(JSON.stringify(snapshotStageRun(r))));assert.deepEqual(continued.cartZones,original);
 r.player.y=344;r=stepStage(r,input,MINE_STAGE).run;for(let i=0;i<60;i++)r=stepStage(r,input,MINE_STAGE).run;assert.notDeepEqual(r.cartZones,original);assert.equal(r.deaths,1);
});
test('a swing destroys a cart and a persistent pool damages again after invulnerability',()=>{
 let r=createStageRun(MINE_STAGE,{}, {seed:1});Object.assign(r.player,{x:0,y:276,grounded:true,mode:'attack',attackTick:4,aim:{x:1,y:0}});
 r.cartZones[0].centerX=128;r.cartZones[0].state='active';r.cartZones[0].cartId='cart-1-vehicle';r.hazards.push({id:'cart-1-vehicle',ownerId:'cart-1',kind:'cart',x:24,y:284,w:32,h:20,vx:0,vy:0,life:0,alive:true});
 let result=stepStage(r,{...input,aimX:700},MINE_STAGE);r=result.run;assert.ok(result.events.some(e=>e.type==='cart:destroyed'));assert.equal(r.hazards[0].alive,false);
 r=createStageRun(MINE_STAGE,{}, {seed:1});r.hazards.push({id:'pool',ownerId:'insect-1',kind:'acid-pool',x:0,y:298,w:1000,h:6,vx:0,vy:0,life:120,alive:true});
 r=stepStage(r,input,MINE_STAGE).run;assert.equal(r.player.hp,2);for(let i=0;i<46;i++)r=stepStage(r,input,MINE_STAGE).run;assert.equal(r.player.hp,1);
});
test('live mine states remain serializable through cart warnings and spawns',()=>{
 let r=createStageRun(MINE_STAGE,{}, {seed:8});
 for(let i=0;i<300;i++){r=stepStage(r,input,MINE_STAGE).run;const result=parseSave(JSON.stringify({...freshSave(),run:snapshotStageRun(r)}));assert.equal(result.ok,true,`tick ${i}`);}
});
