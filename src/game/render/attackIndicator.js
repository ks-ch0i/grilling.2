import { canStartAttack } from '../sim/player.js';
import { ATTACK_TICKS, ROLL_TICKS, HURT_TICKS } from '../sim/constants.js';

export function attackIndicatorState(player, tick, active, previous) {
  let memory = { ...previous };
  if (!active || (memory.lastTick !== null && tick < memory.lastTick)) {
    memory = { ready: null, flashUntil: 0, lastTick: tick };
  }
  if (!active) return { memory, visible: false, progress: 0, flash: false };

  const ready = canStartAttack(player);
  if (memory.ready === false && ready) memory.flashUntil = tick + 8;
  const flash = ready && tick < memory.flashUntil;
  let progress = 0;
  if (flash) progress = 1;
  else if (player.mode === 'attack') progress = player.attackTick / ATTACK_TICKS;
  else if (player.mode === 'roll') progress = 1 - player.rollTicks / ROLL_TICKS;
  else if (player.mode === 'hurt') progress = 1 - player.hurtTicks / HURT_TICKS;
  memory.ready = ready;
  memory.lastTick = tick;
  return { memory, visible: !ready || flash, progress: Math.max(0, Math.min(1, progress)), flash };
}
