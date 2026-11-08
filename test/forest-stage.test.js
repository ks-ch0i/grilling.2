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
test('nine supported enemies form two mixed pairs away from pit approaches',()=>{
 const enemies=FOREST_STAGE.enemies, widths={soldier:20,wisp:20,boar:28};
 assert.equal(enemies.length,9);assert.equal(new Set(enemies.map(e=>e.id)).size,9);
 for(const kind of Object.keys(widths))assert.equal(enemies.filter(e=>e.kind===kind).length,3,kind);
 const pits=[[1504,1568],[3136,3200],[4960,5024],[6848,6912],[8752,8816]];
 for(const e of enemies)for(const [left,right] of pits)assert.ok(e.x+widths[e.kind]<=left-128||e.x>=right+128,`${e.id} too close to pit`);
 const pairs=[['wisp-1','soldier-2'],['soldier-3','boar-2']],ids=new Set(pairs.flat());
 for(const [a,b] of pairs){const first=enemies.find(e=>e.id===a),second=enemies.find(e=>e.id===b);assert.notEqual(first.kind,second.kind);assert.equal(Math.abs(first.x-second.x),100);}
 for(const e of enemies.filter(e=>!ids.has(e.id)))for(const other of enemies.filter(other=>other.id!==e.id))assert.ok(Math.abs(e.x-other.x)>=500,`${e.id}/${other.id}`);
 const xs=enemies.map(e=>e.x).sort((a,b)=>a-b);assert.equal(Math.max(...xs.slice(1).map((x,i)=>x-xs[i])),1630);
 assert.deepEqual(FOREST_STAGE.spawn,{x:120,y:276});assert.equal('checkpoint' in FOREST_STAGE,false);assert.deepEqual(FOREST_STAGE.pickups.map(p=>p.x),[2400,6200,9600]);assert.equal(FOREST_STAGE.arena.left,10496);
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
