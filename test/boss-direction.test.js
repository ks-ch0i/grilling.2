import test from 'node:test';
import assert from 'node:assert/strict';
import { bossDirection } from '../src/game/render/bossDirection.js';

test('boss direction follows the visible world rectangle and active boss states', () => {
  const viewport = { left: 100, top: 30, width: 533.3333333333, height: 300 };
  const boss = { x: 0, y: 0, w: 80, h: 96, state: 'windup' };
  for (const [x, expected] of [[19,'left'],[20,'left'],[21,null],[99,null],[100,null],[600,null],[633.3333333333,'right'],[700,'right']]) {
    assert.equal(bossDirection({...boss,x},viewport),expected,`x=${x}`);
  }
  assert.equal(bossDirection({...boss,x:650},{...viewport,left:160}),null);
  for (const state of ['intro','windup','attack','recovery','transition','dying']) assert.equal(bossDirection({...boss,x:1700,state},viewport),'right',state);
  for (const state of ['dormant','dead']) assert.equal(bossDirection({...boss,x:1700,state},viewport),null,state);
});
