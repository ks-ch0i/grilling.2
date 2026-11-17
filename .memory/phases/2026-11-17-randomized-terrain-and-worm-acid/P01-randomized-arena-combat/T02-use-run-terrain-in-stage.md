# Task: T02 Use the Run Layout in Stage Simulation and Rendering

## Status: pending

## Goal

Make player movement, ground-enemy movement and spawning, boss encounter start, and visible platforms use the exact layout stored in the active stage run. A new layout created after death must become visible immediately.

## Decision Summary

- Consume T01's `run.terrainLayout.platforms`; do not mutate `FOREST_STAGE` or `MINE_STAGE`.
- The full collision terrain is the fixed floor, the run's platform rectangles, world walls, and arena-lock walls when active.
- Enemy placement must use the run-specific solids. Existing stage templates remain unchanged.
- A legacy-fixed run displays and collides with its original three platforms. A randomized run keeps one layout until the next fresh attempt.

## Implementation

### I01. Pass run terrain to collision and enemy placement

- Related Files:
  - `src/game/sim/stage.js` :: `stageTerrain`, `startRound`, and `stepStage` :: modify
  - `src/game/sim/rounds.js` :: `createRoundEnemies` reads `stage.solids` for support :: read-only unless its contract requires a narrowly scoped argument change
  - `test/stage-lifecycle.test.js` :: round spawn support and death layout transition :: update
  - `test/round-selector.test.js` :: practice-run layout behavior :: update

#### Details

- **Signatures & Types**:
  ```js
  export function stageTerrain(stage, locked, terrainLayout) {
    // Returns the complete collision rectangle list.
  }

  function stageForRun(stage, run) {
    // Returns a shallow stage view with run-specific solids.
  }
  ```
- **Data & Schema Fields**:
  - `terrainLayout` is the exact T01 object: `{ mode: 'random' | 'legacy-fixed', platforms: Rect[] }`.
  - Compose run solids as `[stage.solids[0], ...run.terrainLayout.platforms]`; the first base solid is the fixed floor.
  - Keep the existing wall rectangles: left world wall at x=-16, right world wall at x=world.width, ceiling at y=-16, and arena-lock walls at arena.left/arena.right when `run.arenaLocked` is true.
- **Execution Flow / Logic**:
  1. Update `stageTerrain` to use the layout argument, while preserving the existing world-wall and arena-lock behavior.
  2. Add a private `stageForRun(stage, run)` that returns `{ ...stage, solids: [stage.solids[0], ...run.terrainLayout.platforms] }`.
  3. In `startRound`, pass `stageForRun(stage, run)` to `createRoundEnemies`. Keep boss placement based on the unchanged arena and boss templates.
  4. In `stepStage`, use the complete run terrain for player movement, enemy movement, overlap separation, and player melee line-of-sight. Pass that same geometry to all current full-solid consumers.
  5. Do not generate geometry in `startRound`; all eight rounds and the Machine-to-Worm sequence use the layout already stored on the run.
  6. Preserve the run's current `terrainLayout` on ordinary round transitions. The existing death restart calls `createStageRun`, so it replaces the old layout with a fresh random one while preserving elapsed ticks and deaths.
  7. Keep stage definitions immutable. Static stage validation continues to validate the fixed floor and spawn templates; T01's layout validator handles generated platform rectangles.
- **Error & Exception Handling**:
  - Treat a missing `terrainLayout` after run restoration as an invalid internal run; T01 is responsible for normalizing old snapshots before simulation.
  - Do not alter arena-lock walls, floor height, pit-death behavior, camera bounds, or boss movement.

### I02. Render and refresh the run-specific terrain

- Related Files:
  - `src/game/scenes/StageScene.js` :: terrain initialization, `renderWorld`, and `restoreStageSnapshot` :: modify
  - `test/stage-lifecycle.test.js` :: fresh-run and restored-run geometry behavior :: update
  - Manual browser check :: platform appearance and death reroll :: required

#### Details

- **Execution Flow / Logic**:
  1. Add a private `syncTerrainViews()` method that builds the visible rectangles from the fixed floor and `this.run.terrainLayout.platforms`.
  2. Draw each rectangle into `terrainBase` with the existing brown fill and two-pixel green top edge.
  3. Create one tile sprite per rectangle, using `ground` or `mine-ground` only for the fixed floor at y=304 and `platform` or `mine-platform` for every generated platform. Preserve origins and depths currently used by `StageScene`.
  4. Cache a geometry signature. If it is unchanged, do not recreate Phaser objects. If it changes, destroy old terrain tile sprites, clear the graphics, then draw the new layout.
  5. Call synchronization during scene creation and from the render path after every simulation update. This makes the new layout visible after the death countdown replaces `this.run`.
  6. Ensure `restoreStageSnapshot` renders the exact restored layout rather than generating or displaying a different one.
  7. Keep the forest and mine textures, backdrop, camera, and lighting unchanged.
- **Error & Exception Handling**:
  - If a layout has no platforms in legacy mode, render only the fixed floor rather than reusing stale sprites.
  - Destroy removed tile sprites before rebuilding so repeated deaths do not leak Phaser display objects.

## Acceptance Criteria

- [ ] Player and ground enemies collide with the active run's platform rectangles in both stages.
- [ ] Round enemies are supported by the active layout or the fixed floor; they do not spawn inside the player or boss.
- [ ] The same platform layout remains through rounds 1–8, practice runs, Worm intro, and save restoration.
- [ ] When the death countdown starts a fresh run, the simulation and rendered platform layout both change to that run's layout.
- [ ] A legacy-fixed snapshot continues to display and use the original fixed platforms.
- [ ] Scene updates reuse terrain display objects when geometry is unchanged and destroy them when it changes.

## Validation

- `node --test test/stage-lifecycle.test.js test/round-selector.test.js test/forest-stage.test.js test/mine-stage.test.js` — round spawning, stage geometry, practice runs, save restore, and death reroll cases pass.
- `npm.cmd run dev` — manually start each stage, confirm platform collision and appearance, save/reload to confirm the same layout, then die and confirm the new layout appears after respawn.
- Do not run validation during the planning phase.

## Dependencies

- Requires T01's generator and `run.terrainLayout` snapshot contract.
- T03 consumes the full and floor-only terrain collections introduced here.

## Commit Message

```text
feat(stage): use per-run randomized platform layouts

Plan: 2026-11-17-randomized-terrain-and-worm-acid
Phase: P01-randomized-arena-combat
Task: T02-use-run-terrain-in-stage

- Use saved run platforms for collision and enemy placement
- Refresh terrain rendering when a new attempt changes the layout
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
