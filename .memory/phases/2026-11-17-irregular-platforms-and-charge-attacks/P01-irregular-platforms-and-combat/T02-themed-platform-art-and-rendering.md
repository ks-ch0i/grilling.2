# Task: T02 Themed Platform Art and Rendering

## Status: pending

## Goal

Create and pack Forest root-and-soil and Mine layered-rock-and-ore modular platform art, then render every new `ProfiledPlatform` from the same saved 16-pixel top profile used by simulation.

## Decision Summary

- Each platform is composed of 16-pixel-wide modules; its left and right ends use dedicated cap frames and any interior sections use the middle frame. One saved `variant` selects a matching visual family for the entire platform.
- New profile platforms use themed module sprites. Legacy fixed and old rectangular random layouts keep their current tile textures and rendering.

## Implementation

### I01. Generate, pack, register, and document the module sheets

- Related Files:
  - `public/assets/source/forest-platform-modules-original.png` :: 3-column × 4-row source sheet; new
  - `public/assets/source/mine-platform-modules-original.png` :: 3-column × 4-row source sheet; new
  - `scripts/pack-art.mjs` :: `specs`, `makeAtlas` :: modify
  - `src/game/assets/manifest.js` :: `entries`, `ASSETS` :: modify
  - `docs/asset-provenance.md` :: generated source/runtime asset records :: modify
  - `test/assets.test.js` :: runtime image dimension, frame, alpha, and gutter checks :: modify

#### Details
- **Signatures & Types**:
  ```js
  // Each source and runtime sheet is a 3-column x 4-row grid.
  // Each frame is 16x32 pixels; total sheet dimensions are 48x128.
  // Columns: left cap (0), middle (1), right cap (2).
  // Rows: saved visual variant (0..3).
  // Runtime assets:
  // ['forest-platform-modules','/assets/world/forest/platform-modules.png',16,32,12]
  // ['mine-platform-modules','/assets/world/mine/platform-modules.png',16,32,12]
  // Frame index = variant * 3 + roleColumn.
  ```
- **Data & Schema Fields**:
  - Forest art depicts exposed tree roots above packed soil, in the existing Forest palette and pixel-art scale.
  - Mine art depicts layered stone with occasional readable ore, in the existing Mine palette and pixel-art scale.
  - Every frame has transparent background and a one-pixel clear gutter from all four frame borders, matching `test/assets.test.js` requirements.
  - Sheet columns are left cap, repeatable middle, right cap. Rows 0–3 are four coherent visual variants; each frame must have a visibly continuous top edge and a solid lower body that can overlap neighboring modules vertically.
- **Execution Flow / Logic**:
  1. Create both source sheets under `public/assets/source/`; preserve the exact 3×4 frame ordering and dimensions. Use the existing project style and retain these sources as the editable provenance originals.
  2. Add the two sheets to `specs` in `scripts/pack-art.mjs`, each with `cols=3`, `rows=4`, `cellW=16`, and `cellH=32`; `makeAtlas` emits the corresponding runtime PNG under `public/assets/world/{forest,mine}/`.
  3. Add both runtime texture entries to `manifest.js` with frame size 16×32 and count 12. Keep the default asset validation path and all existing textures intact.
  4. Record each source sheet's visual prompt, dimensions, palette/style reference, runtime path, and `node scripts/pack-art.mjs` regeneration command in `docs/asset-provenance.md`.
  5. Extend `test/assets.test.js` to verify both assets decode, have 48×128 dimensions, expose 12 16×32 frames, contain transparent pixels, and have nonempty pixels away from each frame border.
- **Error & Exception Handling**:
  - Keep `makeAtlas`'s existing invalid-grid failure behavior. Do not add silent resizing that could shift the module seam or top edge.
  - Missing or corrupt source sheets must fail the pack command rather than leave an old runtime sheet silently accepted.

### I02. Render saved profiles as exact-width themed modules

- Related Files:
  - `src/game/scenes/StageScene.js` :: `syncTerrainViews`, `terrainSignature` :: modify
  - `src/game/render/platforms.js` :: `platformModulePlacements` :: new
  - `test/platform-rendering.test.js` :: module frame selection and placement :: new

#### Details
- **Signatures & Types**:
  ```js
  // ProfiledPlatform from T01:
  // { x: number, w: number, topProfile: number[], variant: 0|1|2|3 }
  // One top sample is the absolute world y for each 16px module.

  export function platformModulePlacements(platform) {
    // Returns [{ x, y, frame }], exactly w/16 entries.
    // frame = platform.variant * 3 + roleColumn; roleColumn is left=0,
    // middle=1, right=2. A 32px platform has only left and right caps.
  }
  ```
- **Data & Schema Fields**:
  - Each placement has `x = platform.x + sectionIndex * 16`, `y = topProfile[sectionIndex]`, and `frame` in `[0,11]`.
  - Keep the stage's fixed floor rendered with its existing `ground`/`mine-ground` tile sprite.
  - Treat a platform as profiled only when its saved platform record has `topProfile`; records `{x,y,w,h}` remain legacy rectangles.
- **Execution Flow / Logic**:
  1. `platformModulePlacements` validates the already validated platform profile's 16-pixel section count and returns one placement per section. Pick the first section's left cap, last section's right cap, and middle frames for interior sections.
  2. In `StageScene.syncTerrainViews`, render the floor as before. For each profile, create 16×32 images from `forest-platform-modules` or `mine-platform-modules`, set frame from the placement, origin `(0,0)`, and the existing terrain depth. The top row of each module is located exactly at that profile section's stored `y`.
  3. For old rectangular fixed/random layouts, retain the current `tileSprite` and stage-specific texture path without converting geometry.
  4. Include layout mode, each profile's `x`, `w`, all `topProfile` samples, and `variant` in the terrain cache signature. This ensures a restored save with a different profile or art choice destroys and rebuilds the views.
  5. Add pure helper tests for 32px, 48px, and 112px platforms, all three roles, all four variants, exact positions, and profile y changes. Add a legacy case proving rectangular records do not produce module placements.
- **Error & Exception Handling**:
  - Reject malformed width/profile lengths in the pure placement helper with `TypeError('Invalid platform profile')`; normal game entry points validate layout before rendering.
  - Do not infer surface height from art pixels or resize module images to platform width. Simulation remains driven only by saved geometry.

## Acceptance Criteria

- [ ] Forest and Mine module sheets contain four variants of three 16×32 roles and pack to runtime textures registered with 12 frames each.
- [ ] Each profiled platform renders exactly `w/16` modules at the saved section x/y coordinates, with end caps and middle pieces selected from the saved variant.
- [ ] A profile/layout/variant change invalidates the view cache; old rectangular saves keep their existing tile rendering.
- [ ] Asset provenance and automated image checks include the new sources and runtime sheets.

## Validation

- `node scripts/pack-art.mjs` — both runtime sheets are regenerated from the source sheets.
- `node --test test/assets.test.js test/platform-rendering.test.js` — PNG dimensions, frames, gutters, module mapping, and legacy rendering contract pass.
- `npm.cmd run build` — production bundle resolves both new manifest textures.

## Commit Message

```text
feat(art): add themed modular platform modules

Plan: 2026-11-17-irregular-platforms-and-charge-attacks
Phase: P01-irregular-platforms-and-combat
Task: T02-themed-platform-art-and-rendering

- Add four Forest and Mine module variants
- Render saved platform profiles from matching module frames
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
