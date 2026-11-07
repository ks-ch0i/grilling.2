import { ATTACK_HALF_ANGLE, ATTACK_RADIUS, DIVE_IMPACT_WIDTH, DIVE_IMPACT_HEIGHT, HURT_INVULNERABLE_TICKS, HURT_TICKS } from './constants.js';
export function diveImpactRect(x,y) { return {x:x-DIVE_IMPACT_WIDTH/2,y:y-DIVE_IMPACT_HEIGHT/2,w:DIVE_IMPACT_WIDTH,h:DIVE_IMPACT_HEIGHT}; }
export function angleToFacing8(aim) {
  return ((Math.round(Math.atan2(aim.y, aim.x) / (Math.PI / 4)) % 8) + 8) % 8;
}
function segmentRectEntry(px, py, dx, dy, r) {
  let near = 0, far = 1;
  for (const [p, d, min, max] of [[px, dx, r.x, r.x + r.w], [py, dy, r.y, r.y + r.h]]) {
    if (Math.abs(d) < 1e-10) { if (p < min || p > max) return null; continue; }
    let a = (min - p) / d, b = (max - p) / d;
    if (a > b) [a, b] = [b, a];
    near = Math.max(near, a); far = Math.min(far, b);
    if (near > far) return null;
  }
  return near;
}
// Clip the displayed attack sector against the same solids used by hit testing.
export function attackRangePolygon(player, terrain=[]) {
  const px=player.x+player.w/2,py=player.y+player.h/2;
  const aimAngle=Math.atan2(player.aim.y,player.aim.x),angles=[];
  for(let i=0;i<=32;i++)angles.push(-ATTACK_HALF_ANGLE+2*ATTACK_HALF_ANGLE*i/32);
  for(const wall of terrain)for(const x of [wall.x,wall.x+wall.w])for(const y of [wall.y,wall.y+wall.h]){
    if(Math.hypot(x-px,y-py)>ATTACK_RADIUS+1e-6)continue;
    const relative=Math.atan2(y-py,x-px)-aimAngle,offset=Math.atan2(Math.sin(relative),Math.cos(relative));
    for(const n of [offset-1e-6,offset,offset+1e-6])if(n>-ATTACK_HALF_ANGLE&&n<ATTACK_HALF_ANGLE)angles.push(n);
  }
  angles.sort((a,b)=>a-b);
  return [{x:px,y:py},...angles.map(offset=>{
    const angle=aimAngle+offset,dx=Math.cos(angle)*ATTACK_RADIUS,dy=Math.sin(angle)*ATTACK_RADIUS;
    let limit=1;for(const wall of terrain){const t=segmentRectEntry(px,py,dx,dy,wall);if(t!==null)limit=Math.min(limit,t);}
    return {x:px+dx*limit,y:py+dy*limit};
  })];
}
// Test corners, sector boundaries, and circle/rectangle intersections.
export function attackIntersects(player, target, terrain = []) {
  const px = player.x + player.w / 2, py = player.y + player.h / 2;
  const aim = player.aim || { x: 1, y: 0 };
  const x0 = target.x, x1 = target.x + target.w, y0 = target.y, y1 = target.y + target.h;
  const points = [[x0, y0], [x1, y0], [x0, y1], [x1, y1],
    [Math.max(x0, Math.min(px, x1)), Math.max(y0, Math.min(py, y1))], [(x0+x1)/2, (y0+y1)/2]];
  const angles = [-ATTACK_HALF_ANGLE, 0, ATTACK_HALF_ANGLE];
  const aimAngle = Math.atan2(aim.y, aim.x);
  // Rays beside each wall corner detect a target that is only partly visible.
  for (const wall of terrain) for (const x of [wall.x, wall.x + wall.w]) for (const y of [wall.y, wall.y + wall.h]) {
    const angle = Math.atan2(y - py, x - px) - aimAngle;
    angles.push(angle - 1e-7, angle + 1e-7);
  }
  for (const angle of angles) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const dx = (aim.x*c - aim.y*s)*ATTACK_RADIUS, dy = (aim.x*s + aim.y*c)*ATTACK_RADIUS;
    const t = segmentRectEntry(px, py, dx, dy, target);
    if (t !== null) points.push([px + dx*t, py + dy*t]);
  }
  for (const x of [x0, x1]) {
    const q = ATTACK_RADIUS**2 - (x-px)**2;
    if (q >= 0) for (const y of [py-Math.sqrt(q), py+Math.sqrt(q)]) if (y >= y0 && y <= y1) points.push([x, y]);
  }
  for (const y of [y0, y1]) {
    const q = ATTACK_RADIUS**2 - (y-py)**2;
    if (q >= 0) for (const x of [px-Math.sqrt(q), px+Math.sqrt(q)]) if (x >= x0 && x <= x1) points.push([x, y]);
  }
  return points.some(([x,y]) => {
    const dx = x-px, dy = y-py, length = Math.hypot(dx,dy);
    if (length > ATTACK_RADIUS + 1e-7 || (length > 1e-9 && (dx*aim.x+dy*aim.y)/length < Math.cos(ATTACK_HALF_ANGLE)-1e-9)) return false;
    return !terrain.some(wall => { const t = segmentRectEntry(px, py, dx, dy, wall); return t !== null && t < 1 - 1e-7; });
  });
}
export function registerAttackHit(player, target, terrain = []) {
  if (player.hitIds.has(target.id) || !attackIntersects(player, target, terrain)) return false;
  player.hitIds.add(target.id);
  return true;
}
export function applyPlayerDamage(state, source = 'contact', impact = undefined) {
  const player = { ...state, hitIds: new Set(state.hitIds) }, events = [];
  if (player.mode === 'dead') return { player, events };
  if (source !== 'pit' && (player.mode === 'roll' || player.mode === 'dive' || player.diveGraceActive || player.rollInvulnerable || player.damageInvulnerable || player.invulnerableTicks > 0)) return { player, events };
  player.hp = source === 'pit' ? 0 : Math.max(0, player.hp - 1);
  player.attackTick = 0; player.hitIds.clear();
  if (player.hp === 0) { player.mode = 'dead'; player.vx = 0; player.vy = 0; player.hurtPushTicks = 0; events.push({ type: 'death', source }); }
  else {
    const dx = player.x + player.w / 2 - impact?.originX;
    player.hurtPushDirection = Number.isFinite(dx) && dx !== 0 ? Math.sign(dx) : (player.horizontalFacing === -1 ? 1 : -1);
    player.hurtPushTicks = HURT_TICKS;
    player.mode = 'hurt'; player.hurtTicks = HURT_TICKS; player.invulnerableTicks = HURT_INVULNERABLE_TICKS; events.push({ type: 'hurt', source });
  }
  return { player, events };
}
