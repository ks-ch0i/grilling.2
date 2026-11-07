export function bossDirection(boss, viewport) {
  if (boss.state === 'dormant' || boss.state === 'dead') return null;
  if (boss.x + boss.w <= viewport.scrollX) return 'left';
  if (boss.x >= viewport.scrollX + viewport.width) return 'right';
  return null;
}
