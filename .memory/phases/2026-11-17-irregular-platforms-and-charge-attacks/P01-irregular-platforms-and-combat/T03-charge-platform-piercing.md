# Task: T03 Charge Platform Piercing

## Status: done

## Goal

Make newly spawned Forest boars begin on the fixed arena floor and let the Forest boar, Mine Machine, and phase-two Mine Worm charge attacks cross floating platforms while preserving floor, world-wall, and arena-boundary collision.

## Decision Summary

- Platform collision is ignored only while one of the three explicit charge attacks is active. Windup, recovery, ordinary movement, and all non-charge boss attacks retain their current terrain behavior.
- The two bosses already move within the arena without using floating platforms as blockers; preserve that behavior and add regression coverage. A restored in-progress run retains the enemy's saved position.

## Implementation

### I01. Place newly spawned Forest boars on the fixed floor

- Related Files:
  - `src/game/sim/rounds.js` :: `spawnEnemy`, `createRoundEnemies` :: modify
  - `src/game/sim/stage.js` :: `stageForRun`, `startRound` :: modify only if needed to expose platform profiles separately
  - `test/round-selector.test.js` :: boar spawn support :: modify
  - `test/enemies.test.js` :: charge behavior and floor retention :: modify

#### Details
- **Signatures & Types**:
  ```js
  // New profiled layout contract:
  // ProfiledPlatform = { x:number, w:number, topProfile:number[], variant:0|1|2|3 }
  // One absolute y sample per 16px section; floor remains stage.solids[0].

  // Existing encounter entry point remains compatible:
  export function createRoundEnemies(stage, round, randomState,
    { player = null, boss = null, platformProfiles = [] } = {}) {
    // Returns { enemies, rngState } as before.
  }
  ```
- **Data & Schema Fields**:
  - Do not add or persist an enemy spawn override field. Apply the floor-only rule when selecting a new spawn for `template.kind === 'boar'` in Forest.
  - The fixed floor is `stage.solids[0]`; profile platforms are passed separately from rectangle solids.
  - New `createRoundEnemies` callers may omit `platformProfiles`; that keeps direct tests and practice encounters backward compatible.
- **Execution Flow / Logic**:
  1. Keep deterministic candidate-x ordering, RNG use, player/boss overlap checks, prior-spawn overlap checks, and arena bounds in `spawnEnemy`.
  2. For a newly spawned Forest boar, consider only the fixed floor as support and derive y from that floor's top minus the boar height. Do not select a platform top even when it overlaps the candidate x interval.
  3. For soldier, golem, and insect, retain T01's support selection across the floor and eligible platform profile sections. Bat and both bosses keep their existing spawn rules.
  4. Do not relocate saved enemies in `restoreStageRun`; this rule affects only encounters created after a new attempt or round spawn.
  5. Add deterministic tests for a boar whose preferred x overlaps a profile: it is still placed on the floor if a safe floor x exists; a no-safe-floor case retains the existing `RangeError` behavior. Verify the other ground types can still use profile support.
- **Error & Exception Handling**:
  - Keep `RangeError('No safe arena spawn is available for ...')` if no valid, non-overlapping floor spawn exists.
  - Do not bypass the player, boss, prior-enemy, floor, or arena constraints to force a floor spawn.

### I02. Pierce profiles only during the three active charges

- Related Files:
  - `src/game/sim/enemies.js` :: `stepEnemy`, boar `attack` movement :: modify
  - `src/game/sim/stage.js` :: `stepStage`, Mine boss stepping :: inspect/modify only if regression evidence shows a platform blocker
  - `src/game/sim/mineBoss.js` (or the current Mine boss simulation module) :: charge movement :: inspect; modify only if needed to satisfy the stated behavior
  - `test/enemies.test.js` :: Forest boar charge crosses a profile :: modify
  - `test/mine-boss.test.js` and `test/mine-integration.test.js` :: Machine/Worm charge regressions :: modify

#### Details
- **Signatures & Types**:
  ```js
  export function stepEnemy(state, player, solidTerrain, platformProfiles = []) {
    // Existing return: { enemy, events, projectiles, hazards }.
    // solidTerrain still includes floor and world/arena walls.
  }

  // The Mine boss simulation keeps its existing step function signature unless
  // a concrete call site currently supplies platform rectangles as blockers.
  ```
- **Execution Flow / Logic**:
  1. During a boar's `state === 'attack'`, move horizontally using `solidTerrain` only; do not apply the profile support/landing resolver or stop at a platform edge. Keep the floor in `solidTerrain`, so the boar cannot fall through the arena floor.
  2. Retain the current locked facing, speed, active duration, damage hitbox, and state transition. Stop when the world wall or locked arena wall blocks movement, using the existing rectangle movement resolver.
  3. During boar idle/chase/windup/recovery, use T01's profile support behavior unchanged. A boar that is saved on an older platform still starts its saved position and may charge through that platform after loading.
  4. Inspect the Machine charge and the Mine Worm phase-two charge paths. Their movement is constrained by the arena bounds and does not use platform rectangles; preserve their motion and ensure test fixtures include a platform crossing on the path.
  5. Only if one of those boss paths demonstrably resolves against a floating profile, bypass profile collision while that boss is in its charge active state. Continue resolving against floor and arena/world boundaries. Do not change boss spawn positions or non-charge attack movement.
  6. Add collision tests with a profile between attacker and target: each charge crosses the profile; a floor or arena wall still stops the attacker; ordinary boar movement still follows/stops at profile support; non-charge boss movement is unaffected.
- **Error & Exception Handling**:
  - Keep the existing active-state and collision return behavior; do not make projectiles or other attacks ignore the floor.
  - Preserve current boss arena clamps and wall handling. Do not globally remove platform collision from `stageTerrain` or melee/landing systems.

## Acceptance Criteria

- [ ] Newly created Forest boars spawn on the fixed floor even when a platform is available at their candidate x.
- [ ] Forest boar charge passes through platform tops while the fixed floor and world/arena walls still stop it.
- [ ] Machine and phase-two Worm charges pass through platforms; both bosses preserve their existing floor spawn and arena limits.
- [ ] Platform collision remains active for non-charge ground movement and non-charge attacks; restored enemy positions are unchanged.

## Validation

- `node --test test/enemies.test.js test/round-selector.test.js` — boar support, charge collision, and ordinary ground movement pass.
- `node --test test/mine-boss.test.js test/mine-integration.test.js` — Machine and phase-two Worm charge crossing and arena boundaries pass.

## Commit Message

```text
feat(combat): let charge attacks pass platforms

Plan: 2026-11-17-irregular-platforms-and-charge-attacks
Phase: P01-irregular-platforms-and-combat
Task: T03-charge-platform-piercing

- Spawn new Forest boars on the base floor
- Preserve floor and arena limits during platform-piercing charges
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: `83f4347`
