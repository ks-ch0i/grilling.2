import test from 'node:test'; import assert from 'node:assert/strict';
import { angleToFacing8, attackIntersects, attackRangePolygon, diveImpactRect, registerAttackHit } from '../src/game/sim/combat.js';
import { normalizeAim, intersects } from '../src/game/sim/geometry.js';
const platformApi=await import('../src/game/sim/platforms.js').catch(()=>({}));
const p={x:-8,y:-14,w:16,h:28,aim:{x:1,y:0}};
test('eight directions and aim fallback',()=>{for(let i=0;i<8;i++){let a=i*Math.PI/4;assert.equal(angleToFacing8({x:Math.cos(a),y:Math.sin(a)}),i);} assert.deepEqual(normalizeAim(0,0,0,0,{x:0,y:-1}),{x:0,y:-1});});
test('sector tests full rectangles, range, directions and solid wall',()=>{
 assert.equal(attackIntersects(p,{x:30,y:-2,w:4,h:4}),true); assert.equal(attackIntersects(p,{x:37,y:-2,w:4,h:4}),false);
 assert.equal(attackIntersects(p,{x:-10,y:-2,w:4,h:4}),false); assert.equal(attackIntersects(p,{x:20,y:20,w:3,h:3}),true);
 assert.equal(attackIntersects(p,{x:30,y:-2,w:4,h:4},[{x:15,y:-20,w:2,h:40}]),false);
 const up={...p,aim:{x:0,y:-1}}; assert.equal(attackIntersects(up,{x:-2,y:-35,w:4,h:5}),true);
 assert.equal(intersects({x:0,y:0,w:2,h:2},{x:2,y:0,w:1,h:1}),false);
});

test('a target takes one hit per swing and partly exposed targets remain hittable',()=>{
 const player={...p,hitIds:new Set()}; const target={id:'dummy',x:30,y:-10,w:4,h:20};
 assert.equal(registerAttackHit(player,target,[{x:15,y:-4,w:2,h:8}]),true);
 assert.equal(registerAttackHit(player,target),false); player.hitIds.clear(); assert.equal(registerAttackHit(player,target),true);
});
test('the displayed attack sector is clipped by walls while exposed edges remain',()=>{
 const open=attackRangePolygon(p),blocked=attackRangePolygon(p,[{x:15,y:-40,w:2,h:80}]);
 assert.ok(open.some(q=>q.x>35));assert.ok(blocked.every(q=>q.x<=15+1e-6));
 const partial=attackRangePolygon(p,[{x:15,y:-4,w:2,h:8}]);
 assert.ok(partial.some(q=>q.x>25));assert.ok(partial.some(q=>Math.abs(q.y)<1e-6&&Math.abs(q.x-15)<1e-6));
});
test('profiled platform tops block melee line of sight but remain thin top-only blockers',()=>{
 const profile={x:15,w:32,topProfile:[0,0],variant:0};
 const blockers=platformApi.platformOcclusionRects([profile]);
 assert.equal(blockers.length,2);assert.ok(blockers.every(rect=>rect.h===1));
 assert.equal(attackIntersects(p,{x:32,y:0,w:4,h:1},blockers),false);
 assert.equal(attackIntersects(p,{x:32,y:0,w:4,h:1},[]),true);
 assert.ok(attackRangePolygon(p,blockers).some(point=>Math.abs(point.x-15)<1e-6&&Math.abs(point.y)<1e-6));
});
test('dive impact is centered and approximately 30 percent larger in each dimension',()=>{
 const r=diveImpactRect(100,200);assert.deepEqual(r,{x:69,y:184.5,w:62,h:31});
 assert.ok(Math.abs(r.w/48-1.3)<.02);assert.ok(Math.abs(r.h/24-1.3)<.02);
});
