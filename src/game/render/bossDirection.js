export function bossDirection(boss, viewport) {
  if (boss.state === 'dormant' || boss.state === 'dead') return null;
  const right = Number.isFinite(viewport.right) ? viewport.right : viewport.left + viewport.width;
  if (boss.x + boss.w <= viewport.left) return 'left';
  if (boss.x >= right) return 'right';
  return null;
}
