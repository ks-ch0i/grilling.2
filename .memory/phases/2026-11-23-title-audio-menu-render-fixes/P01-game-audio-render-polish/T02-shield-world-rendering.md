# Task: T02 Shield Follows Player in Production

## Status: done

## Goal

Correct the production defect where the player moves but the activated shield remains near map center, while preserving the existing eight-direction shield poses and defense behavior.

## Decision Summary
- The user observed this on the deployed Azure site. Checked source has no independent shield object: `hero-shield` is a composite player-with-shield sheet rendered at the player's world position.
- Reproduce and trace the deployed/source discrepancy before adding or replacing art. Do not change shield duration, cooldown, defense collision, or input.

## Implementation

### I01. Trace the production shield graphic to its render object and transform
- Related Files:
  - `src/game/render/PlayerView.js` :: constructor, `sync(player, scene, tick)`, `destroy()`; inspect/modify only if the trace identifies a defect.
  - `src/game/scenes/StageScene.js` :: `create()`, `configureCameras()`, `renderWorld()`, and `syncTerrainViews()`; inspect/modify only if camera routing or object setup is wrong.
  - `src/game/render/cameraFraming.js` :: camera scroll/visible-bounds helpers; read-only unless coordinate conversion is wrong.
  - `src/game/assets/animation.js` :: `playerAnimation()` shield clip choice; read-only unless facing selection is wrong.
  - `src/game/assets/manifest.js` and `public/assets/characters/hero/shield.png` :: 32×32 eight-frame sheet registration/art; read-only unless deployed asset differs or has a verified defect.

#### Details
- Reproduce on `https://happy-ocean-085e57100.6.azurestaticapps.net` after sign-in, in Forest and Mine. Activate with the existing right-click control, move the player, and move the camera. Confirm the reported condition: player moves while shield remains near map center.
- Verify the loaded production JS and shield texture match the current `main` deployment; perform one cache-bypassing reload to distinguish a stale asset from a current-source defect.
- In checked source, `PlayerView.sync()` computes `x = round(player.x + player.w / 2)`, `y = round(player.y + player.h)`, chooses `hero.shield.<facing>` via `playerAnimation()`, and applies `setPosition(x, y)` to body and outline. The sheet path is `/assets/characters/hero/shield.png`, 32×32 cells, count 8.
- `StageScene.configureCameras()` uses `cameras.main` for world objects and a separate `hudCamera` for screen-space objects. Confirm the shield-carrying body is not incorrectly classified as HUD, reset to arena coordinates, or recreated by another effect.
- Inspect scene children during shield activation to identify the actual rendered object containing the shield. If a separate object exists in the deployed build, update it each render from the player's world coordinates and keep it in the world camera with an appropriate depth. If deployed code differs, resolve that mismatch before changing the checked composite-frame path.
- If the current composite frame is the source, correct only the verified texture/frame/origin/transform or camera routing defect. Do not create a second shield object while the composite frame is active.
- Preserve RMB control, one-second duration, three-second cooldown, ranged-block logic, HP, and save schema.

### I02. Confirm the corrected visual in the deployed build
- Related Files:
  - `src/game/render/PlayerView.js` and the single camera/asset file identified by I01; modify.
  - `docs/azure-internal-deployment.md` :: record deployed commit and outcome if this fix is released; modify only at release.

#### Details
- Verify standing, walking, jumping, camera scroll, and all eight facings. Shield remains at its intended hand/body offset.
- Verify no shield graphic remains at map center and no duplicate shield appears when `defenseMode !== 'shield'`.
- If production still differs from the built source after cache-bypassing reload, record the deployed commit and loaded asset before adding offsets or replacing art.

## Acceptance Criteria
- [x] On production, shield follows the moving player and camera in Forest and Mine.
- [x] Eight-direction mapping and character pose remain aligned.
- [x] No stationary or duplicate shield remains near map center.
- [x] Defense timing, input, collision behavior, HP, and save data are unchanged.

## Validation
- `npm run build` — production bundle compiles after the targeted rendering correction.
- Manual browser walkthrough — authenticated production build, shield active while standing/walking/jumping in both stages, scrolling camera, and eight facings.

## Commit Message
```text
fix(render): keep the shield attached to the player

Plan: 2026-11-23-title-audio-menu-render-fixes
Phase: P01-game-audio-render-polish
Task: T02-shield-world-rendering

- Trace the shield object in the deployed render path
- Keep the shield aligned during movement and camera scroll
```

## Progress
- [x] Implementation complete — no source correction was needed: the deployed player renderer and shield texture match the checked composite-frame implementation.
- [x] Validation complete — the user rechecked the signed-in production game and confirmed the shield now appears to work correctly.
- Source trace: `PlayerView.sync()` positions the shield-carrying composite body at the player's world coordinates; the world camera renders it, while the HUD camera ignores it.
- Deployment comparison: latest successful SWA workflow is for `main` commit `3534c2c`; `PlayerView.js`, animation mapping, manifest, and `shield.png` match that commit. `StageScene.js` differs locally only for T01 audio changes; camera setup is unchanged.
- Production repro/cache-bypass check: authenticated production review is now reported as normal. The exact original cause was not confirmed; a stale client asset or session state remains a possibility.
- commit: pending
