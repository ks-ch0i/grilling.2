import test from 'node:test';
import assert from 'node:assert/strict';
import { attackSwordOffset } from '../src/game/render/attackMotion.js';

test('sword sweeps 100 degrees during active ticks and returns to aim',()=>{
 const degrees=t=>attackSwordOffset(t)*180/Math.PI;
 for(const [tick,expected] of [[0,0],[1,-12.5],[4,-50],[5,-50],[7,0],[9,50],[10,50*8/9],[18,0],[19,0]])assert.ok(Math.abs(degrees(tick)-expected)<1e-9,`tick ${tick}`);
 for(let t=6;t<=9;t++)assert.ok(degrees(t)>degrees(t-1));
 for(const aim of [-Math.PI,-Math.PI/2,0,Math.PI/4,Math.PI/2,Math.PI])assert.ok(Math.abs((aim+attackSwordOffset(7))-aim)<1e-9);
});
