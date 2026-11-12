# Task: T02 Stage Camera Integration

## Status: done

## Goal
Use the tested camera target helper in both stages so the camera stays still inside the player's invisible rectangle, follows its nearest edge outside it, and moves the background vertically at the existing 15% parallax rate. Preserve the current boss-intro composition and stage simulation.

## Decision Summary
- Keep all stage geometry, player coordinates, collision rules, and save data unchanged. Extend only Phaser's camera bounds to allow scrollY -80..0.
- Keep 0.12 easing, pixel rounding, the existing horizontal 15% parallax, and fixed-screen HUD/overlays. Do not play the game as an agent; the user requested logic-only checks.

## Implementation

### I01. Configure vertical camera overscan
- Related Files:
  - `src/game/scenes/StageScene.js` :: `StageScene.create` — configure camera bounds for the 80 px upper overscan; modify

#### Details
- **Signatures & Types**:
  ```js
  create(data = {})
  ```
- **Data & Schema Fields**:
  - Use `this.stage.world.width` and `this.stage.world.height`; both supported stage definitions are 11520×360.
  - Camera `setBounds` arguments must be `(0, -80, this.stage.world.width, this.stage.world.height + 80)`, producing a world bottom at y=360 and allowing `scrollY` from -80 to 0 for a 360 px camera.
- **Execution Flow / Logic**:
  1. Precondition & Validation: `this.stage` is selected before bounds are configured; keep `roundPixels = true`.
  2. Core Processing: Replace the current `setBounds(0, 0, width, height)` call with the upper-overscan bounds above. Do not alter `stage.world`, solids, spawn points, pit death y, enemy or boss coordinates.
  3. Error & Exception Handling: Use the fixed game viewport height 360; no fallback stage or dynamic resizing path is needed because `createGameConfig` sets the internal viewport to 640×360.
  4. State Transition & Return: Initial camera scroll remains x=0, y=0. Existing horizontal world bounds and camera pixel rounding remain active.

### I02. Apply dead-zone targets and parallax
- Related Files:
  - `src/game/scenes/StageScene.js` :: `StageScene.renderWorld` — replace normal-play center/look-ahead target with helper targets, preserve intro override through helper, and update parallax; modify
  - `src/game/render/cameraDeadZone.js` :: `cameraScrollTarget` — provide pure target values; read-only
  - `src/game/render/bossDirection.js` :: `bossDirection` — retain current horizontal viewport contract; read-only

#### Details
- **Signatures & Types**:
  ```js
  renderWorld()
  cameraScrollTarget({player, boss, camera, worldWidth, bossIntro})
  ```
- **Data & Schema Fields**:
  - Build helper input from `p = this.run.player`, `boss = this.run.boss`, `camera = {scrollX: cam.scrollX, scrollY: cam.scrollY}`, `worldWidth = this.stage.world.width`, and `bossIntro = boss.state === 'intro'`.
  - Target result is `{scrollX: number, scrollY: number}` in world pixels.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Keep the existing worm intro timeline, blackout, simulation rendering, and UI update order. The helper runs after `cam` and `boss` are read and before world objects are drawn.
  2. Core Processing: Replace the `p.horizontalFacing * 60` normal target and inline horizontal-only clamp with `cameraScrollTarget`. For each axis, apply the existing eased update `Math.round(current + (target - current) * 0.12)`. Update `backdrop.tilePositionX` and `backdrop.tilePositionY` to `Math.round(cam.scrollX * 0.15)` and `Math.round(cam.scrollY * 0.15)` respectively.
  3. Error & Exception Handling: Helper bounds guarantee target scroll stays inside camera bounds. If player falls below the vertical zone, y target stays clamped to 0; do not expand the stage to follow downward.
  4. State Transition & Return: Draw the world using updated camera coordinates. Keep HUD, blackout, and intro overlays at scroll factor 0. Keep boss direction arrow y calculation using `boss.y + boss.h/2 - cam.scrollY`, which already accounts for vertical camera motion.
  5. Boss intro behavior: Let `cameraScrollTarget` choose the current player/boss midpoint framing and y=0 whenever `boss.state === 'intro'`; do not apply the dead-zone during the intro.
- **Regression boundaries**:
  - Do not change `src/game/sim/`, player physics, stage geometry, persistence snapshots, practice-round selection, screen shake, HUD placement, or boss-direction x detection.
  - Do not draw the dead-zone rectangle.

## Acceptance Criteria
- [x] Both forest and mine scenes use the same helper and camera bounds.
- [x] When the player's center is inside the zone, the target scroll is current scroll; crossing an edge moves only the corresponding camera axis toward that edge.
- [x] The 0.12 easing, pixel rounding, horizontal parallax, boss-intro framing, and fixed-screen UI continue to work.
- [x] Vertical camera motion is limited to -80..0; no simulation or stage geometry coordinates change.
- [x] The dead-zone remains invisible. Do not perform agent gameplay; report that the user should judge the final movement feel.

## Validation
- `node --test test/camera-deadzone.test.js` — pure camera target cases pass.
- `npm test` — full existing and new automated suite passes.
- `npm run build` — Vite production build passes.
- Manual acceptance remains with the user because the user asked the agent to perform logic-only checks and not play the game.

## Commit Message
```text
feat(camera): follow player outside dead zone

Plan: 2026-11-12-camera-deadzone
Phase: P01-camera-follow
Task: T02-stage-camera-integration

- Apply dead-zone follow and upper vertical camera overscan in both stages.
- Preserve boss-intro framing and add vertical background parallax.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
