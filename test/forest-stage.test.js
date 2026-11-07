import test from 'node:test';import assert from 'node:assert/strict';
import {FOREST_STAGE,validateStage} from '../src/game/content/forestStage.js';
import {createPlayer,stepPlayer} from '../src/game/sim/player.js';
const f={move:1,jumpPressed:false,jumpHeld:true,attackPressed:false,rollPressed:false,divePressed:false,aimX:0,aimY:0};
test('forest validates and its five pits stay open',()=>{
 assert.equal(validateStage(FOREST_STAGE),true);
 for(const x of [1536,3168,4992,6880,8784])assert.equal(FOREST_STAGE.solids.some(r=>r.y===304&&r.x<=x&&r.x+r.w>x),false);
 const copy=structuredClone(FOREST_STAGE);copy.enemies[0].id=copy.pickups[0].id;assert.throws(()=>validateStage(copy),TypeError);
 const bad=structuredClone(FOREST_STAGE);bad.solids[0].w=-1;assert.throws(()=>validateStage(bad),RangeError);
 const outside=structuredClone(FOREST_STAGE);outside.pickups[0].x=outside.world.width;assert.throws(()=>validateStage(outside),RangeError);
 const unsupported=structuredClone(FOREST_STAGE);unsupported.enemies[0].y--;assert.throws(()=>validateStage(unsupported),RangeError);
});
test('a normal full jump crosses each 64 pixel pit',()=>{
 for(const [start,end] of [[1504,1568],[3136,3200],[4960,5024],[6848,6912],[8752,8816]]){
  let p=createPlayer(start-24,276);p.grounded=true;
  for(let i=0;i<80;i++){p=stepPlayer(p,{...f,jumpPressed:i===0},FOREST_STAGE.solids,FOREST_STAGE.pitDeathY).player;if(p.grounded&&p.x>=end)break;}
  assert.notEqual(p.mode,'dead');assert.ok(p.x>=end,`failed at ${start}`);assert.equal(p.grounded,true);
 }
});

test('full jumps can reach all raised platforms',()=>{
 for(const platform of FOREST_STAGE.solids.filter(r=>r.y===256)){
  let p=createPlayer(platform.x-44,276);p.grounded=true;let reached=false;
  for(let i=0;i<55;i++){p=stepPlayer(p,{...f,jumpPressed:i===0},FOREST_STAGE.solids,FOREST_STAGE.pitDeathY).player;if(p.grounded&&Math.abs(p.y+p.h-platform.y)<1e-8){reached=true;break;}}
  assert.equal(reached,true,`unreachable platform at ${platform.x}`);
 }
});

test('a short jump reaches each low step',()=>{
 for(const block of FOREST_STAGE.solids.filter(r=>r.y===288)){
  let p=createPlayer(block.x-36,276);p.grounded=true;let reached=false;
  for(let i=0;i<45;i++){p=stepPlayer(p,{...f,jumpPressed:i===0,jumpHeld:i<2},FOREST_STAGE.solids,FOREST_STAGE.pitDeathY).player;if(p.grounded&&Math.abs(p.y+p.h-block.y)<1e-8){reached=true;break;}}
  assert.equal(reached,true,`unreachable low step at ${block.x}`);
 }
});
