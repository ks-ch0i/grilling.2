export function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function normalizeAim(px, py, aimX, aimY, previous = { x: 1, y: 0 }) {
  const dx = aimX - px, dy = aimY - py, length = Math.hypot(dx, dy);
  return Number.isFinite(length) && length > 1e-9 ? { x: dx / length, y: dy / length } : { ...previous };
}
// Move in small increments, resolving the first solid surface on each axis.
export function moveAxis(player, terrain, axis, distance) {
  const steps = Math.max(1, Math.ceil(Math.abs(distance)));
  const amount = distance / steps;
  let collided = false;
  for (let i = 0; i < steps && amount !== 0; i++) {
    player[axis] += amount;
    for (const solid of terrain) {
      if (!intersects(player, solid)) continue;
      if (axis === 'x') player.x = amount > 0 ? solid.x - player.w : solid.x + solid.w;
      else player.y = amount > 0 ? solid.y - player.h : solid.y + solid.h;
      collided = true;
      break;
    }
    if (collided) break;
  }
  if (collided) player[axis === 'x' ? 'vx' : 'vy'] = 0;
  return collided;
}
