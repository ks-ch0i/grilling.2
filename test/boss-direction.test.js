import test from 'node:test';
import assert from 'node:assert/strict';
import { bossDirection } from '../src/game/render/bossDirection.js';

test('boss direction follows viewport edges and active boss states', () => {
  const viewport = { scrollX: 1000, width: 640 };
  const boss = { x: 0, y: 0, w: 80, h: 96, state: 'windup' };
  for (const [x, expected] of [[900,'left'],[920,'left'],[921,null],[999,null],[1000,null],[1560,null],[1639,null],[1640,'right'],[1700,'right']]) {
    assert.equal(bossDirection({...boss,x},viewport),expected,`x=${x}`);
  }
  assert.equal(bossDirection({...boss,x:1700},{...viewport,scrollX:1100}),null);
  for (const state of ['intro','windup','attack','recovery','transition','dying']) assert.equal(bossDirection({...boss,x:1700,state},viewport),'right',state);
  for (const state of ['dormant','dead']) assert.equal(bossDirection({...boss,x:1700,state},viewport),null,state);
});
