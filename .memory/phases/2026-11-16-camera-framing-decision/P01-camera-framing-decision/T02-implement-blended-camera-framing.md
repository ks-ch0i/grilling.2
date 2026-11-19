# Task: T02 Implement Blended Camera Framing

## Status: done

## Goal
Use a 1.20× smoothly moving camera across the Forest and Mine stages, blending player tracking, movement look-ahead and boss midpoint framing, while keeping the HUD at screen scale.

## Accepted Settings
- Apply to both complete stages, all rounds and boss introductions.
- Zoom: 1.20×; viewport remains 640×360 screen pixels.
- Look-ahead: initial implementation value of 60 world pixels in normalized player velocity direction; zero velocity yields no offset.
- Equal blend: normal play averages player center and look-ahead; active boss framing averages player center, look-ahead and player-boss midpoint.
- Smooth with factor 0.12 using fractional scroll values for continuous movement at non-integer zoom.
- Clamp the visible 533.33×300 world view to the 640×360 stage.
- Keep screen-space HUD and overlays unzoomed with a second camera.

## Implementation

### I01. Replace dead-zone target math with zoom-aware blended framing
- Related Files:
  - `src/game/render/cameraDeadZone.js` :: current dead-zone target :: replace with `cameraFraming.js`.
  - `src/game/scenes/StageScene.js` :: camera setup, world rendering and boss direction indicator :: update.
  - `src/game/render/bossDirection.js` :: boss offscreen checks :: make visible-world-rect aware.
- Details:
  - Export `CAMERA_VIEWPORT`, `CAMERA_ZOOM`, `CAMERA_LOOK_AHEAD`, `CAMERA_EASING`, `cameraScrollTarget`, and `visibleWorldBounds` from `cameraFraming.js`.
  - Accept player, optional boss, camera current scroll, world width/height, active-boss flag, and zoom. Center the target in the visible world rectangle, clamp to stage extents, and handle a world smaller than the visible view by centering it.
  - Use the boss midpoint only while the boss is neither dormant nor dead. Boss intro uses this same blended rule rather than the old special override.
  - Remove the old 0,-80 camera bounds and dead-zone behavior. Retain the 0.12 eased movement with fractional camera scroll values.
  - Base the boss direction indicator on the zoomed camera's visible world rectangle, and convert world Y to screen Y before drawing it on the HUD camera.

### I02. Keep screen-space objects at native size
- Related Files:
  - `src/game/scenes/StageScene.js` :: fixed HUD, overlays and dynamically added world views :: update.
  - `src/game/render/WormIntroView.js` and `src/game/render/MineHazardView.js` :: dynamically created display objects :: inspect and route as needed.
- Details:
  - Keep the main camera at zoom 1.20 and create a second camera with zoom 1 for the HUD.
  - Route HUD text, hearts, HUD graphics, message, boss blackout and worm intro dim/blackout objects to the HUD camera. Exclude them from the world camera.
  - Exclude world objects from the HUD camera, including objects added after scene creation; detach the add-event listener on shutdown.
  - Keep parallax driven by the world camera scroll and do not scale the fixed HUD coordinates.

### I03. Replace outdated camera tests and cover boss direction bounds
- Related Files:
  - `test/camera-deadzone.test.js` :: obsolete dead-zone assertions :: replace with `test/camera-framing.test.js`.
  - `test/boss-direction.test.js` :: viewport-edge behavior :: update for visible-world bounds and zoom.
- Details:
  - Cover equal non-boss and boss blends, movement direction and zero velocity, stage-edge clamping, smaller-world centering, and input immutability.
  - Cover a zoomed visible rectangle for boss direction and dormant/dead states.
  - Verify invalid zoom inputs fail clearly or use the documented default.

## Acceptance Criteria
- [x] Both complete stages render at 1.20× and camera movement combines follow, look-ahead and boss midpoint as specified.
- [x] Camera view remains within stage bounds and eases with the accepted factor.
- [x] Screen HUD/overlays keep their original scale and positions.
- [x] Boss direction indicators match the zoomed visible world area.
- [x] Focused tests and production build pass.
- [x] Browser gameplay inspection confirms framing and HUD behavior at 640×360.

## Validation
- `node --test test/camera-framing.test.js test/boss-direction.test.js`
- `npm.cmd run build`
- `git diff --check`
- Inspect the running game at 640×360 in Forest and Mine, including a boss round and HUD scaling.

## Commit Message
```text
feat(camera): blend zoomed player and boss framing

Plan: 2026-11-16-camera-framing-decision
Phase: P01-camera-framing-decision
Task: T02-implement-blended-camera-framing

- Blend player follow, movement look-ahead and boss midpoint framing.
- Keep stage bounds and screen-space HUD stable at 1.20x zoom.
```

## Progress
- [x] Failing framing tests observed before implementation; target behavior assertions failed against the old dead-zone helper.
- [x] Framing behavior implemented.
- [x] Focused tests passed: 9 tests, 0 failures; production build passed; `git diff --check` passed.
- [x] Visual check completed at 640×360: Forest start/boss and Mine start/machine-boss screens; HUD scale and separation confirmed.
- commit: 56a575e
