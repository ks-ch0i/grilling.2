export const CAMERA_VIEWPORT = Object.freeze({ width: 640, height: 360 });
export const CAMERA_ZOOM = 1.2;
export const CAMERA_LOOK_AHEAD = 60;
export const CAMERA_EASING = 0.12;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getZoom(zoom) {
  if (!Number.isFinite(zoom) || zoom <= 0) throw new RangeError('Camera zoom must be a positive finite number');
  return zoom;
}

function clampScrollToWorld(scroll, viewportSize, worldSize, zoom) {
  const visibleSize = viewportSize / zoom;
  if (worldSize <= visibleSize) return (worldSize - viewportSize) / 2;
  const min = (visibleSize - viewportSize) / 2;
  const max = worldSize - (visibleSize + viewportSize) / 2;
  return clamp(scroll, min, max);
}

/** Return the world-space rectangle visible through a centered Phaser camera. */
export function visibleWorldBounds(camera, zoom = CAMERA_ZOOM) {
  const scale = getZoom(zoom);
  const width = CAMERA_VIEWPORT.width / scale;
  const height = CAMERA_VIEWPORT.height / scale;
  const centerX = camera.scrollX + CAMERA_VIEWPORT.width / 2;
  const centerY = camera.scrollY + CAMERA_VIEWPORT.height / 2;
  const left = centerX - width / 2;
  const top = centerY - height / 2;
  return { left, top, right: left + width, bottom: top + height, width, height };
}

/** Compute the target Phaser scroll coordinates for blended player/boss framing. */
export function cameraScrollTarget({ player, boss = null, worldWidth, worldHeight, zoom = CAMERA_ZOOM }) {
  const scale = getZoom(zoom);
  if (!Number.isFinite(worldWidth) || worldWidth <= 0 || !Number.isFinite(worldHeight) || worldHeight <= 0) {
    throw new RangeError('Camera world dimensions must be positive finite numbers');
  }

  const playerX = player.x + player.w / 2;
  const playerY = player.y + player.h / 2;
  const velocityX = Number.isFinite(player.vx) ? player.vx : 0;
  const velocityY = Number.isFinite(player.vy) ? player.vy : 0;
  const speed = Math.hypot(velocityX, velocityY);
  const lookAheadX = speed > 0 ? playerX + (velocityX / speed) * CAMERA_LOOK_AHEAD : playerX;
  const lookAheadY = speed > 0 ? playerY + (velocityY / speed) * CAMERA_LOOK_AHEAD : playerY;

  let focusX = (playerX + lookAheadX) / 2;
  let focusY = (playerY + lookAheadY) / 2;
  if (boss && boss.state !== 'dormant' && boss.state !== 'dead') {
    const midpointX = (playerX + boss.x + boss.w / 2) / 2;
    const midpointY = (playerY + boss.y + boss.h / 2) / 2;
    focusX = (playerX + lookAheadX + midpointX) / 3;
    focusY = (playerY + lookAheadY + midpointY) / 3;
  }

  const scrollX = focusX - CAMERA_VIEWPORT.width / 2;
  const scrollY = focusY - CAMERA_VIEWPORT.height / 2;
  return {
    scrollX: clampScrollToWorld(scrollX, CAMERA_VIEWPORT.width, worldWidth, scale),
    scrollY: clampScrollToWorld(scrollY, CAMERA_VIEWPORT.height, worldHeight, scale),
  };
}
