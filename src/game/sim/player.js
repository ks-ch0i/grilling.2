import * as C from './constants.js';
import { moveAxis, normalizeAim } from './geometry.js';
import { applyPlayerDamage, angleToFacing8 } from './combat.js';
export function createPlayer(x = 120, y = 276) {
  return { x, y, vx: 0, vy: 0, w: 16, h: 28, grounded: false, hp: 3, mode: 'idle', facing: 0,
    horizontalFacing: 1, aim: { x: 1, y: 0 }, invulnerableTicks: 0,
    rollCooldown: 0, rollTicks: 0, rollDirection: 1, rollInvulnerable: false, damageInvulnerable: false, jumpCut: false, diveCooldown: 0, diveUsed: false,
    attackTick: 0, hitIds: new Set(), hurtTicks: 0 };
}
function startAttack(p, events) {
  p.mode = 'attack'; p.attackTick = 0; p.hitIds.clear();
  events.push({ type: 'swing', aim: { ...p.aim } });
}
export function stepPlayer(state, input, terrain, pitDeathY = C.PIT_Y) {
  let p = { ...state, hitIds: new Set(state.hitIds), aim: { ...state.aim } };
  const events = [];
  if (p.mode === 'dead') return { player: p, events };
  if (p.y >= pitDeathY) return applyPlayerDamage(p, 'pit');
  p.rollInvulnerable = false;
  p.damageInvulnerable = p.invulnerableTicks > 0;
  const canRoll = p.rollCooldown === 0;
  const canDive = p.diveCooldown === 0;
  if (p.invulnerableTicks > 0) p.invulnerableTicks--;
  if (p.rollCooldown > 0) p.rollCooldown--;
  if (p.diveCooldown > 0) p.diveCooldown--;
  p.aim = normalizeAim(p.x + p.w/2, p.y + p.h/2, input.aimX, input.aimY, p.aim);
  p.facing = angleToFacing8(p.aim);
  if (input.move) p.horizontalFacing = input.move;
  if (p.mode === 'hurt') { if (--p.hurtTicks <= 0) p.mode = p.grounded ? 'idle' : 'fall'; }
  if (p.mode !== 'hurt' && p.mode !== 'roll' && p.mode !== 'dive') {
    if (input.rollPressed && canRoll) {
      p.mode = 'roll'; p.rollTicks = C.ROLL_TICKS; p.rollDirection = input.move || p.horizontalFacing;
      p.attackTick = 0; p.hitIds.clear(); events.push({ type: 'roll' });
    } else if (input.divePressed && !p.grounded && !p.diveUsed && canDive) {
      p.mode = 'dive'; p.diveUsed = true; p.attackTick = 0; p.hitIds.clear();
    } else {
      if (input.jumpPressed && p.grounded) { p.vy = C.JUMP_SPEED; p.grounded = false; p.jumpCut = false; events.push({ type: 'jump' }); }
      if (input.attackPressed && p.mode !== 'attack') startAttack(p, events);
    }
  }
  if (p.mode === 'roll') { p.vx = p.rollDirection * C.ROLL_SPEED; p.rollInvulnerable = true; }
  else if (p.mode === 'dive') p.vx = 0;
  else if (p.mode === 'hurt') p.vx = 0;
  else p.vx = input.move * C.MOVE_SPEED;
  let verticalDistance;
  if (p.mode === 'dive') { p.vy = C.MAX_FALL_SPEED; verticalDistance = p.vy * C.DT; }
  else {
    if (!input.jumpHeld && p.vy < 0 && !p.jumpCut) { p.vy *= C.JUMP_CUT; p.jumpCut = true; }
    const previousVy = p.vy;
    p.vy = Math.min(C.MAX_FALL_SPEED, p.vy + C.GRAVITY * C.DT);
    verticalDistance = (previousVy + p.vy) * 0.5 * C.DT;
  }
  moveAxis(p, terrain, 'x', p.vx * C.DT);
  const downward = p.vy > 0;
  const landed = moveAxis(p, terrain, 'y', verticalDistance) && downward;
  p.grounded = landed;
  if (landed && p.diveUsed) {
    if (p.mode === 'dive') events.push({ type: 'dive-impact', x: p.x + p.w/2, y: p.y + p.h });
    p.diveUsed = false; p.diveCooldown = C.DIVE_COOLDOWN;
    if (p.mode === 'dive') p.mode = 'idle';
  }
  if (p.y >= pitDeathY) { const death = applyPlayerDamage(p, 'pit'); return { player: death.player, events: [...events, ...death.events] }; }
  if (p.mode === 'roll' && --p.rollTicks === 0) { p.mode = p.grounded ? 'idle' : 'fall'; p.rollCooldown = C.ROLL_COOLDOWN; }
  else if (p.mode === 'attack') {
    p.attackTick++;
    if (p.attackTick >= C.ATTACK_TICKS) {
      p.attackTick = 0; p.hitIds.clear(); p.mode = p.grounded ? 'idle' : 'fall';
    }
  }
  if (['idle', 'run', 'jump', 'fall'].includes(p.mode)) p.mode = !p.grounded ? (p.vy < 0 ? 'jump' : 'fall') : (p.vx ? 'run' : 'idle');
  return { player: p, events };
}
export function isAttackActive(player) { return player.mode === 'attack' && player.attackTick > C.ATTACK_STARTUP && player.attackTick <= C.ATTACK_STARTUP + C.ATTACK_ACTIVE; }
