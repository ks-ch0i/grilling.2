export const CAMERA_VIEWPORT = Object.freeze({ width: 640, height: 360 });

export const CAMERA_DEAD_ZONE = Object.freeze({
  left: 224,
  right: 416,
  top: 266,
  bottom: 314,
  minScrollY: -80,
  maxScrollY: 0,
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the camera scroll target without applying rendering smoothing.
 *
 * @param {{
 *   player: {x: number, y: number, w: number, h: number},
 *   boss: {x: number, w: number},
 *   camera: {scrollX: number, scrollY: number},
 *   worldWidth: number,
 *   bossIntro: boolean
 * }} state
 * @returns {{scrollX: number, scrollY: number}}
 */
export function cameraScrollTarget({ player, boss, camera, worldWidth, bossIntro }) {
  const maxScrollX = Math.max(0, worldWidth - CAMERA_VIEWPORT.width);

  if (bossIntro) {
    const playerCenterX = player.x + player.w / 2;
    const bossCenterX = boss.x + boss.w / 2;
    const focusX = ((playerCenterX - 16) + (bossCenterX + 56)) / 2;
    return {
      scrollX: clamp(focusX - CAMERA_VIEWPORT.width / 2, 0, maxScrollX),
      scrollY: CAMERA_DEAD_ZONE.maxScrollY,
    };
  }

  const playerCenterX = player.x + player.w / 2;
  const playerCenterY = player.y + player.h / 2;
  const screenX = playerCenterX - camera.scrollX;
  const screenY = playerCenterY - camera.scrollY;

  const targetX = screenX < CAMERA_DEAD_ZONE.left
    ? playerCenterX - CAMERA_DEAD_ZONE.left
    : screenX > CAMERA_DEAD_ZONE.right
      ? playerCenterX - CAMERA_DEAD_ZONE.right
      : camera.scrollX;
  const targetY = screenY < CAMERA_DEAD_ZONE.top
    ? playerCenterY - CAMERA_DEAD_ZONE.top
    : screenY > CAMERA_DEAD_ZONE.bottom
      ? playerCenterY - CAMERA_DEAD_ZONE.bottom
      : camera.scrollY;

  return {
    scrollX: clamp(targetX, 0, maxScrollX),
    scrollY: clamp(targetY, CAMERA_DEAD_ZONE.minScrollY, CAMERA_DEAD_ZONE.maxScrollY),
  };
}
