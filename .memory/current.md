# Current Context

## Active Plan
[Player Dead-Zone Camera Follow](./plans/2026-11-12-camera-deadzone.md)

## Active Phase
[P01 Camera Follow](./phases/2026-11-12-camera-deadzone/P01-camera-follow/phase.md)

## Active Task
[T02 Stage Camera Integration](./phases/2026-11-12-camera-deadzone/P01-camera-follow/T02-stage-camera-integration.md)

## Status
- done: 1/2 (active: T02)
- T01 adds pure camera target math and tests; all 7 focused tests passed.
- T02 integrates the helper into `StageScene`, adds upper vertical camera bounds, and adds vertical background parallax.
- The decision record is `.memory/decisions/2026-11-12-camera-deadzone.md`.
- Logic-only verification is required; do not play the game as an agent.

## Next Step (IMPORTANT)
Read the T02 blueprint and integrate `src/game/render/cameraDeadZone.js` into `src/game/scenes/StageScene.js`.
