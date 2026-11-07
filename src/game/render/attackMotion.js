export function attackSwordOffset(tick) {
  let degrees = 0;
  if (tick >= 0 && tick <= 4) degrees = -50 * tick / 4;
  else if (tick >= 5 && tick <= 9) degrees = -50 + 100 * (tick - 5) / 4;
  else if (tick >= 10 && tick <= 18) degrees = 50 * (18 - tick) / 9;
  return degrees * Math.PI / 180;
}
