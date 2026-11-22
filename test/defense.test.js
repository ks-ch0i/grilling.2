import test from 'node:test';
import assert from 'node:assert/strict';
import { InputController } from '../src/game/input/InputController.js';
import { FOREST_STAGE } from '../src/game/content/forestStage.js';
import { MINE_STAGE } from '../src/game/content/mineStage.js';
import { createEnemy } from '../src/game/sim/enemies.js';
import { createPlayer, stepPlayer } from '../src/game/sim/player.js';
import { applyPlayerDamage } from '../src/game/sim/combat.js';
import { createStageRun, restoreStageRun, snapshotStageRun, stepStage } from '../src/game/sim/stage.js';
import * as C from '../src/game/sim/constants.js';

const floor = [{ x: -1000, y: 304, w: 2000, h: 56 }];
const frame = overrides => ({ move: 0, jumpPressed: false, dropPressed: false, jumpHeld: false, attackPressed: false,
  rollPressed: false, divePressed: false, shieldPressed: false, shieldHeld: false, parryPressed: false,
  aimX: 500, aimY: 290, ...overrides });
const tick = (player, input = {}) => stepPlayer(player, frame(input), floor).player;
const grounded = () => tick(createPlayer());

test('right mouse shield is canvas-only; Q and shield are edge queued and reset clears them', () => {
  class Target {
    listeners = {};
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
    removeEventListener(type, fn) { this.listeners[type] = this.listeners[type].filter(item => item !== fn); }
    fire(type, event = {}) { for (const fn of this.listeners[type] ?? []) fn({ preventDefault() {}, ...event }); }
  }
  const target = new Target();
  const canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, right: 640, bottom: 360, width: 640, height: 360 }) };
  const input = new InputController(target, canvas);
  let prevented = false;
  target.fire('mousedown', { button: 2, target: { closest: () => ({}) } });
  target.fire('mousedown', { button: 2, target: canvas, clientX: 200, clientY: 100 });
  target.fire('mousedown', { button: 2, target: canvas, clientX: 200, clientY: 100 });
  target.fire('keydown', { code: 'KeyQ' }); target.fire('keydown', { code: 'KeyQ', repeat: true });
  target.fire('contextmenu', { target: canvas, preventDefault() { prevented = true; } });
  let sampled = input.sample({ cameras: { main: { getWorldPoint: (x, y) => ({ x, y }) } } });
  assert.equal(sampled.shieldPressed, true); assert.equal(sampled.shieldHeld, true); assert.equal(sampled.parryPressed, true); assert.equal(prevented, true);
  sampled = input.sample({ cameras: { main: { getWorldPoint: (x, y) => ({ x, y }) } } });
  assert.equal(sampled.shieldPressed, false); assert.equal(sampled.parryPressed, false); assert.equal(sampled.shieldHeld, true);
  input.reset(); sampled = input.sample({ cameras: { main: { getWorldPoint: (x, y) => ({ x, y }) } } });
  assert.equal(sampled.shieldHeld, false); assert.equal(sampled.parryPressed, false);
  input.destroy();
});

test('shield lasts 60 ticks, ends on release, and requires a fresh press after cooldown', () => {
  let p = grounded();
  p = tick(p, { shieldPressed: true, shieldHeld: true });
  assert.equal(p.defenseMode, 'shield'); assert.equal(p.defenseTicksRemaining, 60);
  for (let i = 0; i < 59; i++) p = tick(p, { shieldHeld: true });
  assert.equal(p.defenseMode, 'shield'); assert.equal(p.defenseTicksRemaining, 1);
  p = tick(p, { shieldHeld: true }); assert.equal(p.defenseMode, 'none'); assert.equal(p.shieldCooldownTicks, 180);
  for (let i = 0; i < 179; i++) p = tick(p);
  assert.equal(p.shieldCooldownTicks, 1);
  p = tick(p, { shieldPressed: true, shieldHeld: true });
  assert.equal(p.defenseMode, 'none'); assert.equal(p.shieldCooldownTicks, 0);
  p = tick(p); p = tick(p, { shieldPressed: true, shieldHeld: true });
  assert.equal(p.defenseMode, 'shield');
});

test('parry cooldown starts on Q; defense cancels attacks, allows movement and jump, and roll cancels it', () => {
  let p = grounded(); p = tick(p, { attackPressed: true }); assert.equal(p.mode, 'attack');
  p = tick(p, { parryPressed: true, move: 1 });
  assert.equal(p.defenseMode, 'parry'); assert.equal(p.defenseTicksRemaining, 15); assert.equal(p.parryCooldownTicks, 180);
  assert.notEqual(p.mode, 'attack'); assert.equal(p.attackTick, 0); assert.ok(p.vx > 0);
  p = tick(p, { jumpPressed: true, jumpHeld: true }); assert.equal(p.mode, 'jump'); assert.equal(p.defenseMode, 'parry');
  p = tick(p, { rollPressed: true }); assert.equal(p.mode, 'roll'); assert.equal(p.defenseMode, 'none');
  assert.equal(p.parryCooldownTicks, 178);
  assert.equal(C.PARRY_WINDOW_TICKS, 15); assert.equal(C.DEFENSE_COOLDOWN_TICKS, 180);
});

test('simultaneous defenses, active-defense replacement, and defense during forbidden modes are rejected', () => {
  let p = grounded(); p = tick(p, { shieldPressed: true, shieldHeld: true, parryPressed: true });
  assert.equal(p.defenseMode, 'none'); assert.equal(p.parryCooldownTicks, 0); assert.equal(p.shieldCooldownTicks, 0);
  p = tick(p, { shieldPressed: true, shieldHeld: true });
  p = tick(p, { parryPressed: true, shieldHeld: true }); assert.equal(p.defenseMode, 'shield'); assert.equal(p.parryCooldownTicks, 0);
  p = tick(p, { rollPressed: true, shieldHeld: true }); assert.equal(p.mode, 'roll'); assert.equal(p.defenseMode, 'none'); assert.equal(p.shieldCooldownTicks, 180);
  let hurt = applyPlayerDamage(grounded()).player;
  hurt = tick(hurt, { parryPressed: true }); assert.equal(hurt.defenseMode, 'none');
  let diving = grounded(); diving = tick(diving, { jumpPressed: true, jumpHeld: true });
  for (let i = 0; i < 8; i++) diving = tick(diving, { jumpHeld: true });
  diving = tick(diving, { divePressed: true }); assert.equal(diving.mode, 'dive');
  diving = tick(diving, { parryPressed: true }); assert.equal(diving.defenseMode, 'none');
});

test('front matching attacks chip half a heart without hurt or knockback; wrong, rear and pit hits remain unblocked', () => {
  const shielding = { ...grounded(), defenseMode: 'shield', defenseTicksRemaining: 60, aim: { x: 1, y: 0 } };
  const blocked = applyPlayerDamage(shielding, 'projectile', { originX: 200, originY: 290 }, 'ranged');
  assert.equal(blocked.player.hp, 2.5); assert.equal(blocked.player.mode, 'idle'); assert.equal(blocked.player.hurtPushTicks, 0);
  assert.equal(blocked.events[0].type, 'shield:blocked'); assert.equal(blocked.player.invulnerableTicks, 45);
  assert.equal(applyPlayerDamage(blocked.player, 'projectile', { originX: 200, originY: 290 }, 'ranged').player.hp, 2.5);
  assert.equal(applyPlayerDamage(shielding, 'enemy-attack', { originX: 200, originY: 290 }, 'melee').player.hp, 2);
  assert.equal(applyPlayerDamage(shielding, 'projectile', { originX: 80, originY: 290 }, 'ranged').player.hp, 2);
  const parrying = { ...shielding, defenseMode: 'parry', defenseTicksRemaining: 15, hp: 1 };
  const parried = applyPlayerDamage(parrying, 'enemy-attack', { originX: 200, originY: 290 }, 'melee');
  assert.equal(parried.player.hp, 0.5); assert.equal(parried.events[0].type, 'parry:blocked');
  const lastHit = applyPlayerDamage({ ...parrying, hp: 0.5 }, 'enemy-attack', { originX: 200, originY: 290 }, 'melee');
  assert.equal(lastHit.player.mode, 'dead'); assert.deepEqual(lastHit.events.map(event => event.type), ['death']);
  assert.equal(applyPlayerDamage(shielding, 'pit').player.hp, 0);
});

test('save restore validates defense timers and closes active windows safely', () => {
  const stage = FOREST_STAGE, run = createStageRun(stage, {}, { seed: 3 });
  run.player.defenseMode = 'shield'; run.player.defenseTicksRemaining = 28;
  let restored = restoreStageRun(stage, JSON.parse(JSON.stringify(snapshotStageRun(run))));
  assert.equal(restored.player.defenseMode, 'none'); assert.equal(restored.player.defenseTicksRemaining, 0);
  assert.equal(restored.player.shieldCooldownTicks, C.DEFENSE_COOLDOWN_TICKS);
  run.player.defenseMode = 'parry'; run.player.defenseTicksRemaining = 4; run.player.parryCooldownTicks = 121;
  restored = restoreStageRun(stage, JSON.parse(JSON.stringify(snapshotStageRun(run))));
  assert.equal(restored.player.defenseMode, 'none'); assert.equal(restored.player.parryCooldownTicks, 121);
  const invalid = snapshotStageRun(createStageRun(stage, {}, { seed: 4 })); invalid.player.defenseTicksRemaining = 1;
  assert.throws(() => restoreStageRun(stage, invalid), RangeError);
});

test('stage routes soldier swings and projectiles to defense, while acid pools bypass it', () => {
  let run = createStageRun(FOREST_STAGE, {}, { seed: 7 });
  const player = run.player;
  const soldier = createEnemy({ ...FOREST_STAGE.enemies.find(enemy => enemy.kind === 'soldier'), id: 'test-soldier', x: player.x + 20, y: player.y });
  soldier.state = 'attack'; soldier.stateTicks = 20; soldier.lockedFacing = -1;
  run.enemies = [soldier]; run.player.defenseMode = 'parry'; run.player.defenseTicksRemaining = 15;
  let result = stepStage(run, frame(), FOREST_STAGE);
  assert.equal(result.run.player.hp, 2.5); assert.ok(result.events.some(event => event.type === 'parry:blocked'));
  assert.equal(result.run.player.mode, 'idle');

  run = createStageRun(FOREST_STAGE, {}, { seed: 8 }); run.enemies = [];
  run.player.defenseMode = 'shield'; run.player.defenseTicksRemaining = 60;
  run.projectiles = [{ id: 'incoming', ownerId: 'wisp', x: run.player.x + 25, y: run.player.y + 11, w: 6, h: 6, vx: -600, vy: 0, life: 50, alive: true }];
  result = stepStage(run, frame({ shieldHeld: true }), FOREST_STAGE);
  assert.equal(result.run.player.hp, 2.5); assert.ok(result.events.some(event => event.type === 'shield:blocked'));

  run = createStageRun(MINE_STAGE, {}, { seed: 9 }); run.enemies = [];
  run.player.defenseMode = 'shield'; run.player.defenseTicksRemaining = 60;
  run.hazards = [{ id: 'pool', ownerId: 'insect', kind: 'acid-pool', x: run.player.x, y: run.player.y + 12, w: 24, h: 8, vx: 0, vy: 0, life: 60, alive: true }];
  result = stepStage(run, frame({ shieldHeld: true }), MINE_STAGE);
  assert.equal(result.run.player.hp, 2); assert.ok(!result.events.some(event => event.type === 'shield:blocked'));
});
