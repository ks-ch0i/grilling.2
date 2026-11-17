# Task: T01 Profiled Platform Layouts and Movement

## Status: done

## Goal

Generate, save, validate, and simulate the confirmed irregular one-way platforms in Forest and Mine, while keeping every older rectangle-only run playable without changing its saved layout.

## Decision Summary

- New `mode: 'random'` layouts contain 2–4 deterministic `ProfiledPlatform` records, while old random rectangles and `mode: 'legacy-fixed'` rectangles retain their existing behavior.
- Profiles use 16-pixel horizontal sections, top samples in y=248–288, at most 4 pixels of change between neighboring sections, and at most 16 pixels of total height variation. Players and ground enemies step along these tops; bat and boss movement remain unchanged.

## Implementation

### I01. Profile model, seeded generation, validation, and save compatibility

- Related Files:
  - `src/game/sim/terrain.js` :: `createRandomPlatformLayout`, `validatePlatformLayout`, reachability helpers :: modify
  - `src/game/sim/platforms.js` :: platform profile validation and surface lookup :: new
  - `src/game/sim/stage.js` :: `createStageRun`, `restoreStageRun`, `snapshotStageRun`, `stageTerrain`, `stageForRun` :: modify
  - `test/terrain.test.js` :: generation distribution, profile validity, reachability :: modify
  - `test/stage-lifecycle.test.js` :: profile persistence, old-layout compatibility, rounds/death :: modify
  - `test/save-store.test.js` :: v3 save parsing of new and old layout shapes :: modify

#### Details

- **Signatures & Types**:
  ```js
  // New platform record. One top sample describes each 16px horizontal module.
  // topProfile values are absolute world y coordinates.
  // variant selects the visual family (0..3) used later by T02.
  // { x: number, w: number, topProfile: number[], variant: number }

  export function createRandomPlatformLayout(stage, rngState) {
    // Returns { platforms: ProfiledPlatform[], rngState: uint32 }.
  }

  export function validatePlatformLayout(stage, terrainLayout) {
    // Returns true; throws TypeError for malformed shapes and RangeError for
    // unsupported counts, dimensions, profiles, overlap, or reachability.
  }

  export function platformTopY(platform, x) {
    // Returns the section's y for x in [platform.x, platform.x + platform.w),
    // otherwise null.
  }

  export function nearestPlatformSurface(platforms, x, minimumY = -Infinity) {
    // Returns { platform, sectionIndex, y } for the smallest eligible y,
    // otherwise null. A surface is eligible when y >= minimumY.
  }

  export function createRoundEnemies(stage, round, randomState,
    { player = null, boss = null, platformProfiles = [] } = {}) {
    // Returns { enemies, rngState }; profiles are separate from rectangle solids.
  }
  ```
- **Data & Schema Fields**:
  - New random layout remains `{ mode: 'random', platforms: ProfiledPlatform[] }`; do not add a new top-level run field.
  - Keep the start-clearance rectangle used by the existing generator: `{x: arena.left, y: arena.bottom - 64, w: max(0, stage.spawn.x + 64 - arena.left), h: 64}`. No new random platform may overlap this 64px-high starting corridor.
  - `ProfiledPlatform.x` is an integer; `w` is one of `[32,48,64,80,96,112]`; `topProfile.length === w / 16`; `variant` is an integer from 0 through 3.
  - Every `topProfile` sample is an integer in `[248,288]`. For each adjacent pair, `abs(next - current) <= 4`; for one profile, `max(topProfile) - min(topProfile) <= 16`.
  - New generated layouts contain 2, 3, or 4 platforms with equal probability. Preserve the existing width bias: choose narrow `[32,48,64]` 80% of the time, wide `[80,96,112]` 20% of the time, then choose uniformly within the selected band. Choose `variant` uniformly from `[0,1,2,3]` using the run PRNG.
  - Keep accepting old shapes: `mode: 'legacy-fixed'` with the exact three stage rectangles; old `mode: 'random'` layouts whose platform records have exactly `{x,y,w,h}` and count 4–6. Disambiguate by exact record keys and count; reject mixed arrays. Do not reinterpret or resize either old layout. `restoreStageRun` continues normalizing a pre-randomization snapshot with no `terrainLayout` to the existing `legacy-fixed` rectangles.
  - Keep the outer v3 save/run keys unchanged. Extend nested validation to accept exactly one of the old rectangle layout or new profile layout forms; reject mixed arrays and unknown fields.
- **Execution Flow / Logic**:
  1. Draw count, width band, width, x, each profile sample, and art variant from the existing `nextRandom` sequence. Set count to `2 + floor(value * 3)` for uniform 2/3/4 probability. Return the final RNG state so Mine cart placement remains deterministic after terrain generation.
  2. Choose the width band with an 80% narrow / 20% wide roll, then choose one width uniformly from that band. Keep x inside the arena and reject any candidate overlapping the exact starting-clearance rectangle or any other platform's horizontal interval. Retry with the existing bounded pattern: up to 64 x candidates per platform and up to 128 whole-layout attempts.
  3. Generate each surface as 16-pixel horizontal sections. Start with a y in 248–288; choose successive integer y values no more than 4 pixels away from the previous section; reject/retry any profile whose total range exceeds 16 or leaves 248–288.
  4. Validate jump reachability from the fixed floor using the same one-way profile landing and step-up rules introduced in I02. Every platform must be reachable from the floor or another already reachable platform. Keep the existing deterministic fallback pattern, represented as four flat 64-pixel profiles at x=96,224,352,480 with y=288 and variant 0.
  5. In `createStageRun`, store the returned profiles in `terrainLayout` before `startRound`; on save, clone the layout with the rest of the run. In restore, validate new profiles or accept an old rectangle layout without changing its geometry.
  6. Keep `stageTerrain(stage, locked, terrainLayout)` and `stageForRun(stage, run)` backward-compatible for old rectangular layouts. For a profiled layout, expose floor/world/arena wall rectangles separately from its top profiles; do not pass profile records to rectangle-only `intersects` or `moveAxis` consumers.
- **Error & Exception Handling**:
  - Preserve `TypeError('Invalid terrain layout')` for unknown top-level shape/mode and `RangeError` for invalid profile dimensions or unreachable generated layouts.
  - If seeded candidate generation exhausts its retry budget, use only a validated four-platform fallback and return the advanced RNG state.
  - Parsing an old saved rectangle layout must keep the old full-solid collision behavior; do not silently convert it to a one-way profile.

### I02. One-way profile movement, actor support, and melee occlusion

- Related Files:
  - `src/game/sim/platforms.js` :: surface landing, grounded step tracking, top occlusion rectangles :: modify
  - `src/game/sim/geometry.js` :: retain rectangular world/floor movement; add or export profile-resolution helpers :: modify
  - `src/game/sim/player.js` :: `stepPlayer` :: modify
  - `src/game/sim/enemies.js` :: `stepEnemy`, `walk`, `groundAhead` :: modify
  - `src/game/sim/stage.js` :: `stepStage`, `stageTerrain`, `stageForRun` :: modify
  - `src/game/sim/rounds.js` :: `createRoundEnemies`, `spawnEnemy` :: modify
  - `src/game/dev/roundSelector.js` :: practice encounter terrain/support wiring :: modify
  - `src/game/sim/combat.js` and `src/game/render/playerAttackRange.js` :: player melee collision and displayed arc :: modify
  - `test/player.test.js`, `test/enemies.test.js`, `test/round-selector.test.js`, `test/combat.test.js` :: surface traversal and support :: modify

#### Details

- **Signatures & Types**:
  ```js
  export function stepPlayer(state, input, solidTerrain, pitDeathY, platformProfiles = []) {
    // Existing return shape remains { player, events, pushCompleted? }.
  }

  export function stepEnemy(state, player, solidTerrain, platformProfiles = []) {
    // Existing return shape remains { enemy, events, projectiles, hazards }.
  }

  export function platformOcclusionRects(platformProfiles) {
    // Returns 16x1 rectangles at each section's top, for melee line of sight only.
  }
  ```
- **Execution Flow / Logic**:
  1. Keep floor, world walls, arena-lock walls, and legacy rectangle platforms in `solidTerrain`. Pass new profile records separately to player/enemy movement.
  2. For a grounded actor moving horizontally, resolve each movement increment against its current profile section. If the next section rises or falls by up to 4 pixels, place the actor's feet on that section and keep it grounded. If there is no top surface under the actor's center, let the player fall; ground enemies keep the existing support-ahead rule and stop at a ledge.
  3. For vertical movement, only land on a profile when the actor is descending and its previous feet were at/above that section's top while its new feet cross the top. Upward movement and side entry pass through. The same rule applies while rolling or diving so existing landing effects still trigger once.
  4. Keep `moveAxis` rectangle resolution for floors, walls, and legacy layouts. Do not treat module body art as collision or use image alpha for simulation.
  5. Keep floor and legacy rectangle platforms in `stageForRun(...).solids`; pass profile records separately through `createRoundEnemies(..., {platformProfiles})`. Place soldier, boar, golem, and insect at a valid profile height when selected; preserve no-overlap checks against the player, boss, and prior spawns. T03 will add the boar floor-only exception.
  6. Generate 16x1 top rectangles from the same profile for player melee occlusion. `playerAttackRangePoints` and `registerAttackHit` use those blockers so the displayed arc and sword collision agree. `stageRangedTerrain` continues omitting every platform.
  7. `stepStage` passes the active run profiles to `stepPlayer` and `stepEnemy` on every tick. Practice encounter setup in `src/game/dev/roundSelector.js` uses the same `createRoundEnemies` support contract.
- **Acceptance Details**:
  - Player falls onto the first top surface from above, passes upward from below, and passes through sides.
  - While grounded, the player and four ground-monster kinds follow a valid 4-pixel rise/drop; a platform edge causes the player to fall and keeps a ground enemy from walking off unsupported ground.
  - The melee arc stops at a profile top while ranged terrain remains floor-and-walls only.
  - Legacy fixed and old random rectangle snapshots reproduce their previous collision and melee behavior.

## Acceptance Criteria

- [ ] New Forest and Mine attempts store 2–4 deterministic profile platforms with the specified count/width probabilities, y envelope, and top-step bounds.
- [ ] Every generated platform is jump-reachable and the start corridor remains clear.
- [ ] Player and ground enemies walk along the top profile; characters pass through from below and sides.
- [ ] Round spawning supports profile tops without spawning actors inside the player or boss.
- [ ] New and legacy layout shapes parse, save, restore, and continue without changing the active geometry.
- [ ] Player melee is blocked by the profile top while ranged attacks remain platform-piercing.

## Validation

- `node --test test/terrain.test.js test/player.test.js test/enemies.test.js test/combat.test.js test/round-selector.test.js test/stage-lifecycle.test.js test/save-store.test.js test/forest-stage.test.js test/mine-stage.test.js` — generation, movement, support, save compatibility, and existing stage behavior pass.

## Commit Message

```text
feat(terrain): add saved irregular platform profiles

Plan: 2026-11-17-irregular-platforms-and-charge-attacks
Phase: P01-irregular-platforms-and-combat
Task: T01-profiled-platform-layouts-and-movement

- Generate and persist bounded one-way platform profiles
- Let players and ground enemies follow profile tops
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: created
