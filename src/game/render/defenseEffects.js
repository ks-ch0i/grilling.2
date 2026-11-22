import { PARRY_WINDOW_TICKS } from '../sim/constants.js';

export function parryBladeAngle(facing, remainingTicks) {
  const age = PARRY_WINDOW_TICKS - remainingTicks;
  const raise = Math.min(1, (age + 1) / 4);
  const tilt = (24 + 38 * raise) * Math.PI / 180;
  return facing < 0 ? Math.PI + tilt : -tilt;
}

export function drawParryGlint(graphics, x, y, angle, remainingTicks) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const edge = (start, end) => graphics.lineBetween(
    x + dx * start, y + dy * start,
    x + dx * end, y + dy * end
  );

  graphics.lineStyle(1, 0xd4e0db, 0.65);
  edge(6, 24);

  const age = PARRY_WINDOW_TICKS - remainingTicks;
  if (age >= 7) return;
  const glint = 8 + age * 2.5;
  graphics.lineStyle(2, 0xffedcf, 0.96 - age * 0.1);
  edge(glint, Math.min(25, glint + 4));
}
