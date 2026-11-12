import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraScrollTarget } from '../src/game/render/cameraDeadZone.js';

const worldWidth = 11520;
const boss = { x: 11040, w: 80 };
function state(player, camera = { scrollX: 0, scrollY: 0 }, bossIntro = false) {
  return { player, boss, camera, worldWidth, bossIntro };
}

test('player movement inside the dead-zone leaves both camera axes fixed', () => {
  const camera = { scrollX: 400, scrollY: -10 };
  const player = { x: 712, y: 266, w: 16, h: 28 };
  assert.deepEqual(cameraScrollTarget(state(player, camera)), camera);
});

test('dead-zone edges are inclusive on both axes', () => {
  for (const [centerX, centerY] of [[224,266],[416,266],[224,314],[416,314]]) {
    const player = { x: centerX - 8, y: centerY - 14, w: 16, h: 28 };
    assert.deepEqual(cameraScrollTarget(state(player)), { scrollX: 0, scrollY: 0 });
  }
});

test('horizontal follow targets only the nearest edge', () => {
  const leftPlayer = { x: 292, y: 276, w: 16, h: 28 };
  assert.deepEqual(cameraScrollTarget(state(leftPlayer, { scrollX: 200, scrollY: 0 })), { scrollX: 76, scrollY: 0 });

  const rightPlayer = { x: 742, y: 276, w: 16, h: 28 };
  assert.deepEqual(cameraScrollTarget(state(rightPlayer, { scrollX: 200, scrollY: 0 })), { scrollX: 334, scrollY: 0 });
});

test('vertical upward follow targets the upper edge', () => {
  const player = { x: 312, y: 186, w: 16, h: 28 };
  assert.deepEqual(cameraScrollTarget(state(player)), { scrollX: 0, scrollY: -66 });
});

test('lower-edge exits cannot pan below the original view', () => {
  const player = { x: 312, y: 326, w: 16, h: 28 };
  assert.deepEqual(cameraScrollTarget(state(player, { scrollX: 0, scrollY: -10 })), { scrollX: 0, scrollY: 0 });
});

test('camera targets clamp at stage edges and at the upper overscan limit', () => {
  const leftPlayer = { x: 42, y: 276, w: 16, h: 28 };
  assert.deepEqual(cameraScrollTarget(state(leftPlayer)), { scrollX: 0, scrollY: 0 });

  const rightPlayer = { x: 11496, y: 276, w: 16, h: 28 };
  assert.deepEqual(cameraScrollTarget(state(rightPlayer, { scrollX: 10880, scrollY: 0 })), { scrollX: 10880, scrollY: 0 });

  const highPlayer = { x: 312, y: 136, w: 16, h: 28 };
  assert.deepEqual(cameraScrollTarget(state(highPlayer)), { scrollX: 0, scrollY: -80 });
});

test('boss intro keeps the existing player-boss midpoint framing and restores y=0', () => {
  const player = { x: 1000, y: 200, w: 16, h: 28 };
  const introBoss = { x: 1200, w: 80 };
  const camera = { scrollX: 0, scrollY: -30 };
  const input = { ...state(player, camera, true), boss: introBoss };
  const before = structuredClone(input);

  assert.deepEqual(cameraScrollTarget(input), { scrollX: 824, scrollY: 0 });
  assert.deepEqual(input, before);
});
