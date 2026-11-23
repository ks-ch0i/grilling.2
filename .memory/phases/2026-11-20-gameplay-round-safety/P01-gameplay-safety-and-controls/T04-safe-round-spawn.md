# Task: T04 Safe Hostile Spawn Placement

## Status: pending

## Implementation Baseline
- Target `origin/main` at `5ad654e`. `createRoundEnemies()` currently selects the roster once, then greedily places each enemy using preferred X positions on a 48-pixel candidate spacing. It checks gameplay rectangles against the player, boss, terrain, and already-placed enemies; it does not check rendered artwork bounds or retry a complete roster layout.
- `safeBossX(stage, player, width, preferred)` currently checks only the preferred X and two arena edges against the player's collision rectangle, then falls back to the nearest candidate even if it overlaps. The Round 8 Worm transition uses this same helper.
- Forest and Mine share `createStageRun()`/`startRound()` for Hard and Easy starts. Boss rounds are 5, 7, and 8; Mine Round 8 replaces the Machine with the Worm after defeat.

## Goal
At every round start and boss appearance, preserve the already-selected enemy roster while retrying positions until no hostile body/outline overlaps the player body/outline. Apply the same visual-safety rule to round-start bosses and the round-8 Worm reveal; remove boss fallbacks that can select an overlapping position.

## Decision Summary
- Existing gameplay collision rectangles remain authoritative for damage and movement. Add a separate conservative artwork rectangle derived from the exact asset frame, origin, and rendered outline scale.
- Select enemy kinds once, then retry only positions using a deterministic local placement stream. Preserve collision/support/arena checks and the saved gameplay `rngState` sequence; never accept an overlapping fallback.

## Implementation

### I01. Share actor artwork bounds between rendering and spawn selection

- Related Files:
  - `src/game/assets/manifest.js` :: `ASSETS`, `ACTOR_OUTLINE_SCALES`, `actorVisualBounds` — expose frame-based visual bounds and shared outline scales; modify
  - `src/game/render/PlayerView.js` :: player outline creation — consume the shared player outline scale; modify
  - `src/game/render/EnemyView.js` :: enemy/boss outline creation — consume shared enemy and boss outline scales; modify
  - `test/assets.test.js` :: manifest-backed frame bounds and outline-scale contract — modify
  - `test/round-selector.test.js` :: visual-bounds examples; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export const ACTOR_OUTLINE_SCALES: {
    player: 1.15; enemy: 1.10; boss: 1.04;
  };
  export function actorVisualBounds(
    actor: { x: number; y: number; w: number; h: number },
    textureKey: string,
    outlineScale: number
  ): { x: number; y: number; w: number; h: number };
  ```
- **Data & Schema Fields**:
  - The function uses the matching `ASSETS` entry's `frameWidth`, `frameHeight`, and `origin`; it adds no persistent data.
  - Use `hero-directions` as the canonical player frame for bounds only if `test/assets.test.js` confirms every player body/outline texture (`hero-directions`, `hero-walk`, `hero-actions`, `hero-dive`, `hero-attacks`, `hero-shield`, `hero-parry`) has the same 32×32 dimensions and `{x: 0.5, y: 1}` origin. Regular enemy key is `enemy.kind`; boss key is `boss` for Forest and the `machine`/`worm` kind for Mine.
- **Execution Flow / Logic**:
  1. Find the asset entry by `textureKey`; throw `TypeError` if absent.
  2. Match renderer placement: anchor X is `Math.round(actor.x + actor.w / 2)`, anchor Y is `Math.round(actor.y + actor.h)`, then apply the manifest origin and outline scale to frame dimensions.
  3. Return the outer rectangle of the larger outline sprite. This conservatively prevents body and decorative-outline artwork from overlapping; the weapon and attack effects are not actor spawn geometry.
  4. Player animation textures vary by state (`hero-directions`, `hero-walk`, `hero-actions`, `hero-dive`, `hero-attacks`, `hero-shield`, `hero-parry`); verify they retain the same 32×32 frame and `{x: 0.5, y: 1}` origin used by the player bounds. Enemy textures use `enemy.kind`; boss textures use `boss`, `machine`, or `worm`.
  5. Replace hardcoded outline scales in `PlayerView` and `EnemyView` with the shared constants so future rendering changes cannot silently invalidate spawn clearance.
- **Error & Exception Handling**:
  - Unknown texture keys throw `TypeError`; all production actor kinds must map to an existing manifest key.
- **State Transition & Return**:
  - Pure function; returns a world-coordinate AABB. Overlap uses the same strict edge-touch semantics as `rounds.js` (`a.x < b.x+b.w`, etc.).

### I02. Search full round layouts and boss positions without changing the roster

- Related Files:
  - `src/game/sim/rounds.js` :: `candidateXs`, `spawnEnemy`, `createRoundEnemies` — retry enemy positions while preserving selected templates; modify
  - `src/game/sim/stage.js` :: `safeBossX`, `bossForRound`, `startRound`, round-8 Worm transition — use one visual-safe boss-position rule for round entry and Worm reveal; modify
  - `src/game/sim/mineCarts.js` :: `nextRandom` — read-only deterministic LCG used by placement ordering
  - `test/round-selector.test.js` :: retry, deterministic roster, and artwork-clearance scenarios; modify
  - `test/stage-lifecycle.test.js` :: first and subsequent round/boss spawn checks; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export function createRoundEnemies(
    stage: Stage, round: number, randomState: number,
    options?: {
      player?: Player | null;
      boss?: Boss | null;
      platformProfiles?: ProfiledPlatform[];
    }
  ): { enemies: Enemy[]; rngState: number };

  function safeBossX(
    stage: Stage, player: Player, boss: Boss, preferredX: number
  ): number;

  // Keep the public createRoundEnemies signature and result shape.
  // Internal boss selection must return a safe x or throw RangeError.
  ```
- **Data & Schema Fields**:
  - No save fields or enemy kinds change. `chosen` enemy templates are computed once using the current round rules and current `randomState`.
  - Keep `chosen` roster selection and its returned gameplay `rngState` exactly as the latest code does; initialize a separate deterministic placement state as `(randomState ^ Math.imul(round, 0x9e3779b9)) >>> 0`, and never assign it to the returned gameplay `rngState`.
  - Replace the current 48-pixel greedy candidate spacing with a finite 16-pixel horizontal candidate grid, restricted to X values that keep each actor collision rectangle inside `stage.arena`. Prefer positions near each template's preferred X, shuffle only equal-distance candidate groups using the local placement state, cap complete-layout attempts at 64, then use deterministic backtracking over the same finite candidate positions.
- **Execution Flow / Logic**:
  1. Preserve current round selection: rounds 7/8 use one template of each stage kind; other rounds use `roundEnemyCount(round)` LCG rolls. Store the resulting `chosen` list and post-selection `rngState` once.
  2. For a boss round (5, 7, or 8), create the actual stage boss with its existing state and preferred position, then use `safeBossX(stage, player, boss, preferredX)` to search all arena-valid X candidates on the 16-pixel grid. Reject candidates whose boss artwork AABB overlaps the player artwork AABB. If no safe X exists, throw `RangeError('No visually safe boss spawn is available')`; remove the current nearest-overlapping fallback.
  3. For each full enemy-layout attempt, clear `placed`, preserve the `chosen` order, and call the placement routine with candidate-order data from the local placement stream. Keep all existing constraints: arena/collider bounds, floor/platform support, Forest boar floor-only support, no collision-rectangle overlap with saved solids, player, boss, or previously placed enemies.
  4. In addition, reject each enemy candidate if `actorVisualBounds(enemy, enemy.kind, ACTOR_OUTLINE_SCALES.enemy)` overlaps the player's visual AABB. Keep the current collision-rectangle checks even when visual checks pass.
  5. If sequential placement cannot place the full roster, retry with the next deterministic candidate order. After 64 attempts, use backtracking across the finite candidate positions, preserving the original `chosen` list. If no complete legal arrangement exists, throw `RangeError('No visually safe arena spawn layout is available')`; never relax visual/collision safety to force a spawn.
  6. For bosses created by `bossForRound` and the round-8 Worm reveal, use actual boss dimensions (`80×96` Forest; `80×64` Machine; `96×64` Worm) for collision placement and manifest-backed visual bounds (`boss` 112×112, `machine` 112×112, `worm` 128×112) for clearance. Search all valid X candidates; keep boss Y/state/intro unchanged. In the Worm transition, create the Worm at its preferred center X, pass the actual Worm object to `safeBossX`, and assign the returned safe X before setting its intro state.
  7. `createRoundEnemies` returns the same selected enemy kinds and the post-selection gameplay `rngState`; position retries do not consume the RNG sequence used by later rounds.
- **Error & Exception Handling**:
  - Preserve the existing `RangeError` behavior for a round with no valid enemy spawn, but use the explicit visual-safe message above. Do not silently place an enemy or boss on the player as fallback.
  - Missing profile supports continue to use the existing floor/rectangle rules; profile support, Mine/Forest boar rules, arena locks, and old saved rectangle layouts are unchanged.
- **State Transition & Return**:
  - A successful search returns the same roster with new safe coordinates and the same gameplay RNG state it would have returned before position retries. Initial round creation and `startRound` both use this path.

### I03. Spawn invariants and regression tests

- Related Files:
  - `test/round-selector.test.js` :: layout retries, sprite bounds, fixed roster, deterministic result; modify
  - `test/stage-lifecycle.test.js` :: initial and next-round player/boss clearance; modify
  - `test/mine-boss.test.js` :: round-8 Machine-to-Worm reveal clearance; modify
  - `test/easy-mode.test.js` :: Easy-mode initial round uses the same visual-safe placement path; modify
  - `test/assets.test.js` :: assert player animation frame dimensions/origins and shared outline scales; modify

#### Details
- Cover rounds 1, 5, 6, 7, and 8 on both Forest and Mine, including one-of-each fixed rosters, all boss-entry rounds, and the maximum six-enemy round. Also cover an Easy-mode round start through its shared `createStageRun()` path.
- Place the player at preferred enemy/boss X positions so the first candidate is rejected; assert the completed placement's player/hostile visual AABBs do not overlap.
- Assert collision boxes still do not overlap, enemies remain on valid supports, Forest boars remain floor-only, and no hostile is placed outside the arena.
- Call placement twice with identical stage/round/randomState/player/boss inputs; assert identical coordinates, enemy kinds, and returned `rngState`.
- Drive the round-8 Machine defeat transition that creates the Worm; assert the Worm's manifest-backed visual AABB does not overlap the player's AABB.
- Assert impossible geometry raises the explicit `RangeError` instead of returning an overlapping fallback.

## Acceptance Criteria
- [ ] At initial round and every subsequent round, player artwork does not overlap any spawned regular enemy or boss artwork.
- [ ] A rejected placement changes only positions; the chosen enemy roster and the RNG state used for later rounds remain unchanged.
- [ ] Boss placement at round entry and the round-8 Worm reveal search beyond the old three positions and never fall back to an overlapping location.
- [ ] Collision rectangles, arena bounds, floor/platform support, legacy terrain, and Forest boar floor-only placement rules remain valid.
- [ ] Impossible layouts fail explicitly rather than spawning overlapping actors.

## Validation
- `node --test test/round-selector.test.js test/stage-lifecycle.test.js test/mine-boss.test.js test/easy-mode.test.js test/assets.test.js` — deterministic placement, support, roster, Easy-mode, asset-bounds, and visual-clearance tests pass.
- `npm test` — complete Node test suite passes.
- `npm run build` — Vite production build completes successfully.
- Manual browser check — start rounds 1, 5, 6, 7, and 8 in Forest and Mine with the player at likely spawn positions; confirm round-entry hostiles and the round-8 Worm reveal never start on top of the player.

## Commit Message
```text
fix(spawn): keep hostiles clear of player artwork

Plan: 2026-11-20-gameplay-round-safety
Phase: P01-gameplay-safety-and-controls
Task: T04-safe-round-spawn

- Retry deterministic enemy positions without changing the round roster
- Apply visual clearance to round bosses and the Worm reveal
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
