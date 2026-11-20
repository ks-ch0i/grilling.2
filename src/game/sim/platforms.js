const WIDTHS = new Set([32, 48, 64, 80, 96, 112]);
const hasExactKeys = (value, names) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));

export function isProfiledPlatform(platform) {
  return hasExactKeys(platform, ['x', 'w', 'topProfile', 'variant']);
}

export function validatePlatformProfile(platform, { minY = 248, maxY = 288 } = {}) {
  if (!isProfiledPlatform(platform) || !Number.isSafeInteger(platform.x) || !Array.isArray(platform.topProfile)) {
    throw new TypeError('Invalid platform profile');
  }
  if (!WIDTHS.has(platform.w) || platform.topProfile.length !== platform.w / 16 ||
      !Number.isSafeInteger(platform.variant) || platform.variant < 0 || platform.variant > 3) {
    throw new RangeError('Invalid platform profile dimensions');
  }
  if (![...platform.topProfile].every(y => Number.isSafeInteger(y) && y >= minY && y <= maxY)) {
    throw new RangeError('Invalid platform profile surface');
  }
  for (let i = 1; i < platform.topProfile.length; i++) {
    if (Math.abs(platform.topProfile[i] - platform.topProfile[i - 1]) > 4) {
      throw new RangeError('Platform profile step exceeds four pixels');
    }
  }
  if (Math.max(...platform.topProfile) - Math.min(...platform.topProfile) > 16) {
    throw new RangeError('Platform profile varies by more than sixteen pixels');
  }
  return true;
}

export function platformTopY(platform, x) {
  if (!isProfiledPlatform(platform) || !Number.isFinite(x) || x < platform.x || x >= platform.x + platform.w ||
      !Array.isArray(platform.topProfile)) return null;
  const sectionIndex = Math.floor((x - platform.x) / 16);
  return Number.isFinite(platform.topProfile[sectionIndex]) ? platform.topProfile[sectionIndex] : null;
}

export function nearestPlatformSurface(platforms, x, minimumY = -Infinity) {
  let nearest = null;
  for (const platform of platforms ?? []) {
    const y = platformTopY(platform, x);
    if (y === null || y < minimumY) continue;
    const sectionIndex = Math.floor((x - platform.x) / 16);
    if (!nearest || y < nearest.y) nearest = { platform, sectionIndex, y };
  }
  return nearest;
}

export function platformOcclusionRects(platforms) {
  const rects = [];
  for (const platform of platforms ?? []) {
    if (!isProfiledPlatform(platform) || !Array.isArray(platform.topProfile)) continue;
    for (let sectionIndex = 0; sectionIndex < platform.topProfile.length; sectionIndex++) {
      const y = platform.topProfile[sectionIndex];
      if (Number.isFinite(y)) rects.push({ x: platform.x + sectionIndex * 16, y, w: 16, h: 1 });
    }
  }
  return rects;
}

export function followPlatformTop(actor, platforms, previousFeet = actor.y + actor.h, previousCenter = actor.x + actor.w / 2) {
  const hasSupport = platforms?.some(platform => {
    const top = platformTopY(platform, previousCenter);
    return top !== null && Math.abs(top - previousFeet) <= 1e-6;
  });
  if (!hasSupport) return false;
  const surface = nearestPlatformSurface(platforms, actor.x + actor.w / 2, previousFeet - 4);
  if (!surface || Math.abs(surface.y - previousFeet) > 4) return false;
  actor.y = surface.y - actor.h;
  actor.vy = 0;
  return true;
}

export function platformSupportAhead(actor, platforms, dx) {
  const x = dx > 0 ? actor.x + actor.w + dx : actor.x + dx - 1;
  const currentFeet = actor.y + actor.h;
  const surface = nearestPlatformSurface(platforms, x, currentFeet - 4);
  return surface !== null && Math.abs(surface.y - currentFeet) <= 4;
}

export function crossedPlatformSurface(actor, platforms, previousFeet, nextFeet) {
  if (nextFeet < previousFeet) return null;
  let first = null;
  const center = actor.x + actor.w / 2;
  for (const platform of platforms ?? []) {
    const y = platformTopY(platform, center);
    if (y === null || y < previousFeet - 1e-6 || y > nextFeet + 1e-6) continue;
    if (!first || y < first.y) first = { platform, sectionIndex: Math.floor((center - platform.x) / 16), y };
  }
  return first;
}
