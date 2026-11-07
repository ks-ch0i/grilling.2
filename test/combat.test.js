import test from 'node:test'; import assert from 'node:assert/strict';
import { angleToFacing8, attackIntersects, registerAttackHit } from '../src/game/sim/combat.js';
import { normalizeAim, intersects } from '../src/game/sim/geometry.js';
const p={x:-8,y:-14,w:16,h:28,lockedAim:{x:1,y:0}};
test('eight directions and aim fallback',()=>{for(let i=0;i<8;i++){let a=i*Math.PI/4;assert.equal(angleToFacing8({x:Math.cos(a),y:Math.sin(a)}),i);} assert.deepEqual(normalizeAim(0,0,0,0,{x:0,y:-1}),{x:0,y:-1});});
test('sector tests full rectangles, range, directions and solid wall',()=>{
 assert.equal(attackIntersects(p,{x:30,y:-2,w:4,h:4}),true); assert.equal(attackIntersects(p,{x:37,y:-2,w:4,h:4}),false);
 assert.equal(attackIntersects(p,{x:-10,y:-2,w:4,h:4}),false); assert.equal(attackIntersects(p,{x:20,y:20,w:3,h:3}),true);
 assert.equal(attackIntersects(p,{x:30,y:-2,w:4,h:4},[{x:15,y:-20,w:2,h:40}]),false);
 const up={...p,lockedAim:{x:0,y:-1}}; assert.equal(attackIntersects(up,{x:-2,y:-35,w:4,h:5}),true);
 assert.equal(intersects({x:0,y:0,w:2,h:2},{x:2,y:0,w:1,h:1}),false);
});

test('a target takes one hit per swing and partly exposed targets remain hittable',()=>{
 const player={...p,hitIds:new Set()}; const target={id:'dummy',x:30,y:-10,w:4,h:20};
 assert.equal(registerAttackHit(player,target,[{x:15,y:-4,w:2,h:8}]),true);
 assert.equal(registerAttackHit(player,target),false); player.hitIds.clear(); assert.equal(registerAttackHit(player,target),true);
});
