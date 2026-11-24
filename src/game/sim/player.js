import * as C from './constants.js';
import { moveAxis, normalizeAim } from './geometry.js';
import { applyPlayerDamage, angleToFacing8 } from './combat.js';
import { crossedPlatformSurface, followPlatformTop, isProfiledPlatform, platformTopY } from './platforms.js';
export function createPlayer(x = 120, y = 276) {
  return { x, y, vx: 0, vy: 0, w: 16, h: 28, grounded: false, hp: 3, mode: 'idle', facing: 0,
    horizontalFacing: 1, aim: { x: 1, y: 0 }, invulnerableTicks: 0,
    defenseMode: 'none', defenseTicksRemaining: 0, shieldCooldownTicks: 0, parryCooldownTicks: 0,
    rollCooldown: 0, rollTicks: 0, rollDirection: 1, rollInvulnerable: false, damageInvulnerable: false, jumpCut: false, diveCooldown: 0, diveUsed: false,
    diveGraceTicks: 0, diveGraceActive: false, airborneTicks: 0, attackTick: 0, hitIds: new Set(), hurtTicks: 0, hurtPushTicks: 0, hurtPushDirection: 1 };
}
function startAttack(p, events) {
  p.mode = 'attack'; p.attackTick = 0; p.hitIds.clear();
  events.push({ type: 'swing', aim: { ...p.aim } });
}
export function canStartAttack(player) {
  return ['idle', 'run', 'jump', 'fall'].includes(player.mode);
}
function isStandingOn(player, platform, feet, center) {
  if (isProfiledPlatform(platform)) {
    const top = platformTopY(platform, center);
    return top !== null && Math.abs(top - feet) <= 1e-6;
  }
  return Math.abs(platform.y - feet) <= 1e-6 && player.x < platform.x + platform.w && player.x + player.w > platform.x;
}

function isClearingPlatform(player, platform, feet) {
  if (isProfiledPlatform(platform)) return feet <= Math.max(...platform.topProfile) + 1e-6;
  return player.y < platform.y + platform.h && !(player.vy < 0 && feet <= platform.y);
}

export function stepPlayer(state, input, terrain, pitDeathY = C.PIT_Y, platformProfiles = [], floatingPlatforms = platformProfiles) {
  let p = { ...state, hitIds: new Set(state.hitIds), aim: { ...state.aim } };
  const startedGrounded = p.grounded;
  const modeAtStart = p.mode;
  const startingFeet = p.y + p.h;
  const startingCenter = p.x + p.w / 2;
  const events = [];
  if (p.mode === 'dead') return { player: p, events };
  if (p.y >= pitDeathY) return applyPlayerDamage(p, 'pit');
  let drops = p.dropPlatforms?.filter(index => {
    const platform = floatingPlatforms[index];
    return platform && isClearingPlatform(p, platform, startingFeet);
  });
  let ignored = drops?.length ? new Set(drops.map(index => floatingPlatforms[index])) : null;
  let activeTerrain = ignored ? terrain.filter(platform => !ignored.has(platform)) : terrain;
  const pushing = p.mode === 'hurt' && p.hurtPushTicks > 0;
  let pushCompleted;
  const startingDefense = p.defenseMode;
  const shieldReadyAtStart = p.shieldCooldownTicks === 0;
  const parryReadyAtStart = p.parryCooldownTicks === 0;
  if (p.shieldCooldownTicks > 0) p.shieldCooldownTicks--;
  if (p.parryCooldownTicks > 0) p.parryCooldownTicks--;
  if (startingDefense !== 'none') {
    p.defenseTicksRemaining--;
    if (startingDefense === 'shield' && !input.shieldHeld || p.defenseTicksRemaining <= 0) {
      p.defenseMode = 'none'; p.defenseTicksRemaining = 0;
      if (startingDefense === 'shield') p.shieldCooldownTicks = C.DEFENSE_COOLDOWN_TICKS;
    }
  }
  p.diveGraceActive = p.diveGraceTicks > 0;
  if (p.diveGraceTicks > 0) p.diveGraceTicks--;
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
  if (pushing) {
    moveAxis(p, activeTerrain, 'x', p.hurtPushDirection * C.HURT_PUSH_DISTANCE / C.HURT_TICKS);
    if (--p.hurtPushTicks === 0) pushCompleted = p.hurtPushDirection;
  }
  if (p.mode === 'hurt') { if (--p.hurtTicks <= 0) p.mode = p.grounded ? 'idle' : 'fall'; }
  if (p.mode !== 'hurt' && p.mode !== 'roll' && p.mode !== 'dive') {
    if (input.rollPressed && canRoll) {
      if (p.defenseMode === 'shield') p.shieldCooldownTicks = C.DEFENSE_COOLDOWN_TICKS;
      p.defenseMode = 'none'; p.defenseTicksRemaining = 0;
      p.mode = 'roll'; p.rollTicks = C.ROLL_TICKS; p.rollDirection = input.move || p.horizontalFacing;
      p.attackTick = 0; p.hitIds.clear(); events.push({ type: 'roll' });
    } else if (p.defenseMode === 'none' && input.attackPressed && !p.grounded && p.airborneTicks >= C.AIR_DIVE_UNLOCK_TICKS && !p.diveUsed && canDive) {
      p.mode = 'dive'; p.diveUsed = true; p.attackTick = 0; p.hitIds.clear();
    } else {
      const canStartDefense = p.defenseMode === 'none' && !['roll','dive','hurt','dead'].includes(modeAtStart);
      const startShield = canStartDefense && input.shieldPressed && shieldReadyAtStart;
      const startParry = canStartDefense && input.parryPressed && parryReadyAtStart;
      if (input.rollPressed && input.shieldPressed && input.parryPressed) {
        // Simultaneous defense starts are intentionally discarded.
      } else if (startShield && !startParry) {
        p.defenseMode = 'shield'; p.defenseTicksRemaining = C.SHIELD_DURATION_TICKS;
        p.attackTick = 0; p.hitIds.clear();
        if (p.mode === 'attack') p.mode = p.grounded ? (input.move ? 'run' : 'idle') : (p.vy < 0 ? 'jump' : 'fall');
      } else if (startParry && !startShield) {
        p.defenseMode = 'parry'; p.defenseTicksRemaining = C.PARRY_WINDOW_TICKS;
        p.parryCooldownTicks = C.DEFENSE_COOLDOWN_TICKS;
        p.attackTick = 0; p.hitIds.clear();
        if (p.mode === 'attack') p.mode = p.grounded ? (input.move ? 'run' : 'idle') : (p.vy < 0 ? 'jump' : 'fall');
      }
      if (input.jumpPressed && p.grounded) {
        const index = input.dropPressed
          ? floatingPlatforms.findIndex(platform => !ignored?.has(platform) && isStandingOn(p, platform, startingFeet, startingCenter))
          : -1;
        if (index >= 0) {
          (drops ??= []).push(index);
          (ignored ??= new Set()).add(floatingPlatforms[index]);
          activeTerrain = terrain.filter(platform => !ignored.has(platform));
          p.vy = C.PLATFORM_DROP_SPEED;
          p.grounded = false;
        } else {
          p.vy = C.JUMP_SPEED; p.grounded = false; p.jumpCut = false; events.push({ type: 'jump' });
        }
      }
      if (p.defenseMode === 'none' && input.attackPressed && canStartAttack(p)) startAttack(p, events);
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
  const activeProfiles = ignored ? platformProfiles.filter(platform => !ignored.has(platform)) : platformProfiles;
  if (drops?.length) p.dropPlatforms = drops;
  else if (p.dropPlatforms) delete p.dropPlatforms;
  moveAxis(p, activeTerrain, 'x', p.vx * C.DT);
  const downward = p.vy > 0;
  const carriedProfile = startedGrounded && p.grounded && followPlatformTop(p, activeProfiles, startingFeet, startingCenter);
  let landed = false;
  if (carriedProfile) {
    p.grounded = true;
    p.vy = 0;
    landed = true;
  } else {
    const previousFeet = p.y + p.h;
    const rectLanded = moveAxis(p, activeTerrain, 'y', verticalDistance) && downward;
    const crossed = downward ? crossedPlatformSurface(p, activeProfiles, previousFeet, p.y + p.h) : null;
    if (crossed && (!rectLanded || crossed.y < p.y + p.h)) {
      p.y = crossed.y - p.h;
      p.vy = 0;
      landed = true;
    } else landed = rectLanded;
  }
  p.grounded = landed;
  p.airborneTicks = p.grounded ? 0 : Math.min(C.AIR_DIVE_UNLOCK_TICKS, p.airborneTicks + 1);
  if (landed && p.diveUsed) {
    if (p.mode === 'dive') {
      events.push({ type: 'dive-impact', x: p.x + p.w/2, y: p.y + p.h });
      p.diveGraceTicks = C.DIVE_LANDING_PROTECTION_TICKS;
      p.diveGraceActive = true;
    }
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
  return pushCompleted === undefined ? { player: p, events } : { player: p, events, pushCompleted };
}
export function isAttackActive(player) { return player.mode === 'attack' && player.attackTick > C.ATTACK_STARTUP && player.attackTick <= C.ATTACK_STARTUP + C.ATTACK_ACTIVE; }
