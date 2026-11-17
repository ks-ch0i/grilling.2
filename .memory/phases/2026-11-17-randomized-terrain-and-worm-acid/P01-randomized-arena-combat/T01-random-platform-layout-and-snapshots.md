# Task: T01 Generate and Persist Random Platform Layouts

## Status: done

## Goal

Give every new Forest or Mine stage attempt one deterministic, reachable platform layout and persist that layout in the run snapshot. Old active snapshots without a layout must resume on the existing fixed platforms until death starts a fresh attempt.

## Decision Summary

- Generate 4–6 platforms with count weighted toward 5–6; widths are usually 32–64 pixels and occasionally 80–112 pixels.
- Platform top edges are integer y values from 248 through 288, inclusive; every platform is 16 pixels thick.
- Keep the floor and arena bounds fixed. Every platform must be reachable from the floor through a chain of jumps, and the initial spawn corridor must remain clear.
- Use the existing run PRNG. Store generated rectangles in the run so reload never consumes randomness or changes the layout.
- Represent old snapshots as fixed-layout runs; do not clear their round, player, or encounter state.

## Implementation

### I01. Add deterministic platform layout generation and validation

- Related Files:
  - `src/game/sim/terrain.js` :: random platform generation and layout validation :: new
  - `src/game/sim/mineCarts.js` :: existing deterministic `nextRandom` PRNG :: read-only
  - `src/game/sim/constants.js` :: movement and jump constants used by reachability :: read-only
  - `src/game/sim/player.js` :: player physics used by reachability :: read-only
  - `src/game/sim/geometry.js` :: full-solid collision behavior :: read-only
  - `test/terrain.test.js` :: generator, geometry, distribution, and reachability tests :: new

#### Details

- **Signatures & Types**:
  ```js
  // A platform is an integer-pixel, full-solid rectangle.
  // { x: number, y: number, w: number, h: 16 }
  export function createRandomPlatformLayout(stage, rngState) {
    // Returns { platforms: PlatformRect[], rngState: uint32 }.
  }

  export function validatePlatformLayout(stage, layout) {
    // Returns true; throws TypeError or RangeError for invalid data.
  }
  ```
- **Data & Schema Fields**:
  - Add the run field `terrainLayout` with this exact shape:
    ```js
    {
      mode: 'random' | 'legacy-fixed',
      platforms: Array<{ x: number, y: number, w: number, h: 16 }>
    }
    ```
  - `random` layouts contain 4–6 platform rectangles. `legacy-fixed` layouts contain exactly `stage.solids.slice(1)`, which is the current three-platform layout for that stage.
  - The fixed floor stays `stage.solids[0]`; do not include it in `terrainLayout.platforms`.
  - Width choices are 32, 48, 64, 80, 96, or 112. Use an 80% narrow-width class (32/48/64, equally selected) and a 20% wide-width class (80/96/112, equally selected). This makes wide platforms occasional while keeping all values in the user's chosen bands.
  - Choose count 4 at 20%, 5 at 40%, and 6 at 40%; this weights layouts toward 5–6 platforms.
  - Choose each top edge uniformly from integer y=248..288. Keep h=16.
  - Choose x uniformly from integer arena positions where `arena.left <= x` and `x + w <= arena.right`, then reject candidates that overlap another platform or the start-clearance rectangle.
  - Define the start-clearance rectangle as x from `stage.arena.left` through `stage.spawn.x + 64`, and y from `stage.arena.bottom - 64` through `stage.arena.bottom`. No generated platform may overlap it.
  - The reachability graph has one floor node and one node per platform. Add a directed edge only when an actual simulated jump with the existing player physics can take off from the source surface and land on the target's top. Treat platforms as full solid rectangles; the player cannot jump through their undersides.
- **Execution Flow / Logic**:
  1. Reject a stage other than `forest-1` or `mine-1`, and reject an RNG state that is not an integer in the unsigned 32-bit range.
  2. Use `nextRandom(state)` for every choice and carry forward each returned state. Do not call `Math.random` inside the generator.
  3. Select the platform count and width classes with the exact weights above. Generate positions inside the arena bounds and reject overlaps or start-clearance intersections.
  4. Build the reachability graph using `MOVE_SPEED=105`, `JUMP_SPEED=-300`, `GRAVITY=650`, player size 16×28, and `moveAxis` full-solid collisions. Require every platform to be reachable from the floor node.
  5. Retry invalid candidates deterministically. Bound retries to 128 complete layouts; after that use this fixed four-platform fallback: `[{x:96,y:288,w:64,h:16}, {x:224,y:288,w:64,h:16}, {x:352,y:288,w:64,h:16}, {x:480,y:288,w:64,h:16}]`. It must pass the same validator and reachability solver; include it in the seed test.
  6. Return a new array of platform rectangles and the PRNG state after the final accepted layout. Do not mutate the stage definition or a caller-owned rectangle.
  7. Make validation reject unknown modes, wrong counts, non-integer coordinates, invalid width/height, out-of-arena rectangles, overlapping platforms, a blocked start corridor, or an unreachable platform.
- **Error & Exception Handling**:
  - Throw `TypeError` for a missing/unknown stage or malformed layout shape.
  - Throw `RangeError` for out-of-range RNG values or platform geometry outside the selected arena constraints.
  - The bounded fallback prevents a valid run seed from failing during game startup.

### I02. Persist the layout and normalize legacy snapshots

- Related Files:
  - `src/game/sim/stage.js` :: `createStageRun`, `snapshotStageRun`, and `restoreStageRun` :: modify
  - `src/game/storage/saveStore.js` :: current version-3 snapshot parsing behavior :: read-only unless required to accept a valid normalized run
  - `test/stage-lifecycle.test.js` :: deterministic layout persistence and death reroll :: update
  - `test/save-store.test.js` :: version-3 legacy snapshot acceptance :: update

#### Details

- **Signatures & Types**:
  ```js
  export function createStageRun(stage, data = {}, options = {}) {}
  export function snapshotStageRun(run) {}
  export function restoreStageRun(stage, snapshot) {}
  ```
- **Data & Schema Fields**:
  - Fresh runs contain `terrainLayout: { mode: 'random', platforms: PlatformRect[] }`.
  - `rngState` remains the run's only PRNG state. Platform generation consumes it before Mine cart placement and enemy selection; all later random choices continue from the returned state.
  - Do not bump the outer save envelope from version 3. The current `parseSave` calls `restoreStageRun` through `currentSnapshot`, so normalization in `restoreStageRun` must make old valid version-3 snapshots acceptable.
- **Execution Flow / Logic**:
  1. When `createStageRun` receives no snapshot, generate a random layout from the initial seed before Mine cart placement and round-1 enemy selection.
  2. Save the generator's returned state in `run.rngState`; use that state for carts and the first encounter so identical seeds reproduce layout, carts, enemies, and future random behavior.
  3. When restoring a snapshot that has no `terrainLayout`, add `{ mode: 'legacy-fixed', platforms: structuredClone(stage.solids.slice(1)) }` before strict run-key validation. This is the pre-feature version-3 compatibility path.
  4. When restoring a snapshot with a layout, validate its mode and rectangles without consuming PRNG state. Reject malformed or unreachable random layouts.
  5. Include the normalized layout in every new snapshot. After an old run is restored, its layout stays fixed through its remaining rounds and subsequent saves.
  6. Leave death's existing call to create a fresh stage run on the current `rngState`; the fresh run receives a new random layout, while elapsed ticks and deaths keep their existing semantics.
- **Error & Exception Handling**:
  - Preserve strict validation for all other run fields. Do not silently repair malformed layouts that are present in a snapshot.
  - A snapshot missing only `terrainLayout` is legacy-fixed; a snapshot with an invalid `terrainLayout` is invalid, not legacy.

## Acceptance Criteria

- [x] Same stage and seed produce byte-for-byte equal layouts and equal returned PRNG states.
- [x] Both stages produce 4–6 in-bounds platforms with the selected widths, y range, 16-pixel thickness, no overlaps, and a clear start corridor.
- [x] Every generated platform has a simulated jump path from the floor; the solver accounts for platforms blocking upward movement.
- [x] Snapshot/restore preserves the exact layout and does not consume random state.
- [x] A pre-feature version-3 run without `terrainLayout` resumes with the original three platforms and keeps its saved progress.
- [x] Invalid present layouts are rejected; no game code uses a new random layout for a legacy-fixed run.

## Validation

- `node --test test/terrain.test.js test/stage-lifecycle.test.js test/save-store.test.js` — generator, deterministic snapshot, legacy compatibility, and invalid-layout cases pass.
- Do not run validation during the planning phase.

## Dependencies

- None. T02–T04 consume the `run.terrainLayout` contract defined here.

## Commit Message

```text
feat(terrain): generate and persist reachable platform layouts

Plan: 2026-11-17-randomized-terrain-and-worm-acid
Phase: P01-randomized-arena-combat
Task: T01-random-platform-layout-and-snapshots

- Generate weighted platform layouts from the saved run PRNG
- Restore pre-feature runs on their existing fixed platform layout
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: see repository history
