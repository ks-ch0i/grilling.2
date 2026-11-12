# Task: T01 Camera Target Math

## Status: done

## Goal
Add a deterministic, Phaser-independent function that computes the desired camera scroll from the player's center, dead-zone bounds, current camera position, and boss-intro mode. This isolates camera geometry so its edge behavior can be tested without playing the game.

## Decision Summary
- Viewport is 640×360; dead-zone screen bounds are x=224..416 (30% width) and y=250..330 (80 px height). Vertical camera bounds are -80..0.
- During normal play, follow only when the player center leaves an axis interval, bringing it to the nearest edge. During boss intro, retain the existing horizontal player/boss midpoint target and y=0.

## Implementation

### I01. Pure camera target helper

- Related Files:
  - `src/game/render/cameraDeadZone.js` :: `cameraScrollTarget` — compute un-smoothed, bounded target scroll coordinates; new

#### Details
- **Signatures & Types**:
  ```js
  /**
   * @param {{
   *   player: {x: number, y: number, w: number, h: number},
   *   boss: {x: number, w: number},
   *   camera: {scrollX: number, scrollY: number},
   *   worldWidth: number,
   *   bossIntro: boolean
   * }} state
   * @returns {{scrollX: number, scrollY: number}}
   */
  export function cameraScrollTarget(state)
  ```
- **Data & Schema Fields**:
  - Export frozen `CAMERA_VIEWPORT = {width: 640, height: 360}`.
  - Export frozen `CAMERA_DEAD_ZONE = {left: 224, right: 416, top: 250, bottom: 330, minScrollY: -80, maxScrollY: 0}`. Bounds are inclusive: a center exactly on an edge remains inside.
  - `player` and `boss` use their simulation rectangles; `camera` provides current scroll values; `worldWidth` supplies the horizontal maximum scroll `worldWidth - 640`; `bossIntro` selects cinematic framing.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Treat the scene's finite player, boss, camera, and world values as trusted inputs. Do not mutate the input objects. Do not add a Phaser import.
  2. Core Processing: Compute the player center as `(x + w/2, y + h/2)`. In normal mode, convert it to screen coordinates by subtracting current scroll. If screen x is below 224, target `centerX - 224`; if above 416, target `centerX - 416`; otherwise preserve `camera.scrollX`. For y, use the corresponding 250 and 330 edges; otherwise preserve `camera.scrollY`.
  3. Error & Exception Handling: No runtime errors are expected for validated stage state. Clamp x to `[0, max(0, worldWidth - 640)]` and y to `[-80, 0]`; this makes the bottom-side vertical target stay at 0 and explicitly prevents downward overscan.
  4. State Transition & Return: Return raw `{scrollX, scrollY}` targets. Do not ease, round, or mutate camera state in this helper; `StageScene` owns those rendering operations.
  5. Boss intro override: When `bossIntro` is true, compute `focusX = ((player.x + player.w/2 - 16) + (boss.x + boss.w/2 + 56)) / 2`, return clamped `focusX - 320` as `scrollX`, and return `scrollY: 0`. This reproduces the current introduction framing and disables dead-zone following during the intro.

### I02. Deterministic unit tests
- Related Files:
  - `test/camera-deadzone.test.js` :: camera target tests — verify edge, clamp, and intro behavior without Phaser; new
  - `src/game/render/cameraDeadZone.js` :: `cameraScrollTarget` — import under test; read-only
#### Details
- Use the repository convention `import test from 'node:test'` and `import assert from 'node:assert/strict'`.
- Verify an inside-zone player preserves both current scroll values, including when exactly on each zone edge.
- Verify crossing left and right x edges targets only the nearest edge and crossing y=250 targets the corresponding negative scroll.
- Verify a player below y=330 at scrollY=0 yields scrollY=0, documenting the chosen no-downward-overscan limit.
- Verify x targets clamp at stage start and end and y clamps at -80 for a target above the permitted range.
- Verify boss-intro mode reproduces the existing midpoint formula, returns y=0, and does not mutate the player, boss, or camera objects.

## Acceptance Criteria
- [x] The helper is deterministic and has no Phaser dependency or input mutation.
- [x] Every normal-mode target obeys the 192×80 px dead-zone and the selected scroll limits.
- [x] Boss intro target math matches the existing `StageScene.renderWorld` formula.
- [x] Focused unit tests cover inside, exact-edge, four-side exit, world clamp, vertical clamp, and boss-intro cases.

## Validation
- `node --test test/camera-deadzone.test.js` — all new camera target cases pass.

## Commit Message
```text
feat(camera): add bounded dead-zone target math

Plan: 2026-11-12-camera-deadzone
Phase: P01-camera-follow
Task: T01-camera-target-math

- Add a pure player-centered camera target function.
- Cover dead-zone edges, bounds, and boss-intro framing with unit tests.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `a2ac425`
