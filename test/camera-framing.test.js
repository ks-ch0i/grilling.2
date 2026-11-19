import test from 'node:test';
import assert from 'node:assert/strict';
import * as cameraFraming from '../src/game/render/cameraFraming.js';

const { cameraScrollTarget, visibleWorldBounds } = cameraFraming;
const world = { width: 640, height: 360 };
const playerAt = (x = 312, y = 166, vx = 0, vy = 0) => ({ x, y, w: 16, h: 28, vx, vy });
const frame = (input) => cameraScrollTarget({ camera: { scrollX: 0, scrollY: 0 }, ...input });

test('camera framing uses the selected zoom, look-ahead and easing values', () => {
  assert.equal(cameraFraming.CAMERA_ZOOM, 1.2);
  assert.equal(cameraFraming.CAMERA_LOOK_AHEAD, 60);
  assert.equal(cameraFraming.CAMERA_EASING, 0.12);
});

test('visible world bounds reflect the zoom around the camera center', () => {
  assert.equal(typeof visibleWorldBounds, 'function');
  if (typeof visibleWorldBounds !== 'function') return;
  const bounds = visibleWorldBounds({ scrollX: 0, scrollY: 0 });
  assert.ok(Math.abs(bounds.left - 53.3333333333) < 1e-8);
  assert.ok(Math.abs(bounds.top - 30) < 1e-8);
  assert.ok(Math.abs(bounds.width - 533.3333333333) < 1e-8);
  assert.equal(bounds.height, 300);
});

test('normal framing equally blends player center and normalized movement look-ahead', () => {
  const right = frame({ player: playerAt(312, 166, 4, 0), worldWidth: world.width, worldHeight: world.height });
  const diagonal = frame({ player: playerAt(312, 166, 3, 4), worldWidth: world.width, worldHeight: world.height });
  const still = frame({ player: playerAt(), worldWidth: world.width, worldHeight: world.height });

  assert.deepEqual(right, { scrollX: 30, scrollY: 0 });
  assert.deepEqual(diagonal, { scrollX: 18, scrollY: 24 });
  assert.deepEqual(still, { scrollX: 0, scrollY: 0 });
});

test('active boss framing equally blends player, look-ahead and their midpoint', () => {
  const target = frame({
    player: playerAt(292, 156),
    boss: { x: 460, y: 210, w: 80, h: 40, state: 'windup' },
    worldWidth: world.width,
    worldHeight: world.height,
  });
  assert.ok(Math.abs(target.scrollX - 13.3333333333) < 1e-8);
  assert.equal(target.scrollY, 0);
});

test('dormant and dead bosses do not alter normal player framing', () => {
  for (const state of ['dormant', 'dead']) {
    const target = frame({
      player: playerAt(), boss: { x: 600, y: 280, w: 80, h: 40, state },
      worldWidth: world.width, worldHeight: world.height,
    });
    assert.deepEqual(target, { scrollX: 0, scrollY: 0 }, state);
  }
});

test('camera framing clamps the zoomed view to stage edges', () => {
  const left = frame({ player: playerAt(-8, 0, -4, -4), worldWidth: world.width, worldHeight: world.height });
  const right = frame({ player: playerAt(624, 320, 4, 4), worldWidth: world.width, worldHeight: world.height });
  assert.ok(Math.abs(left.scrollX + 53.3333333333) < 1e-8);
  assert.equal(left.scrollY, -30);
  assert.ok(Math.abs(right.scrollX - 53.3333333333) < 1e-8);
  assert.equal(right.scrollY, 30);
});

test('a stage smaller than the visible area stays centered in both axes', () => {
  const target = frame({ player: playerAt(), worldWidth: 400, worldHeight: 220 });
  assert.ok(Math.abs(target.scrollX + 120) < 1e-8);
  assert.equal(target.scrollY, -70);
});

test('camera framing rejects non-positive zoom and does not mutate its input', () => {
  const input = {
    player: playerAt(312, 166, 3, 4), boss: { x: 460, y: 210, w: 80, h: 40, state: 'windup' },
    camera: { scrollX: 4, scrollY: -2 }, worldWidth: world.width, worldHeight: world.height,
  };
  const before = structuredClone(input);
  assert.throws(() => frame({ ...input, zoom: 0 }), RangeError);
  frame(input);
  assert.deepEqual(input, before);
});
