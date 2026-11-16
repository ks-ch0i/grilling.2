# Task: T02 Round Simulation

## Status: pending

## Goal
Implement the eight-round encounter schedule in the stage simulation. Preserve deterministic save/reload behavior, boss rules, stage deaths, and mine cart hazards.

## Decision Summary
- Monster counts by round are `[1, 2, 3, 4, 0, 6, 3, 3]`; round 5 is boss-only.
- Rounds 1–4 and 6 choose each monster independently from that stage's three species. Rounds 7–8 contain one of each species.
- Forest Guardian rounds 5 and 7 stay in phase 1 until defeated. Round 8 uses both phases.
- Mine rounds 5 and 7 use Machine alone. Mine round 8 includes all three mine species and preserves Machine → Worm phase 1 → Worm phase 2.
- Every round starts at full health. A cleared round waits 120 ticks, then starts the next round automatically.
- Death restarts the stage at round 1, adds one death, and keeps elapsed time. Deaths reset only when a cleared stage is attempted again.

## Implementation

### I01. Add deterministic round encounter generation
- Related Files:
  - `src/game/sim/rounds.js` :: round constants, schedule, species selection, spawn placement :: new
  - `src/game/sim/mineCarts.js` :: arena-bounded cart zones :: modify
  - `src/game/sim/stage.js` :: initialize, step, snapshot, and restore round state :: modify
  - `test/stage-lifecycle.test.js` :: round schedule and transition cases :: update
- Signatures & Types:
  ```js
  export const ROUND_COUNT = 8;
  export const ROUND_CLEAR_TICKS = 120;
  export function roundEnemyCount(round) {}
  export function createRoundEnemies(stage, round, randomState) {}
  ```
- Data & Schema Fields:
  - Add `round` (1–8), `roundClearTicks`, and deterministic `randomState` to the stage run and snapshot.
  - Keep enemy instances distinct from the three stage enemy templates.
  - Keep elapsed stage ticks and death count at the stage-run level so a death restart can reset combat without resetting either cumulative value.
  - Record all random state needed to reproduce future species choices and mine cart placements after reload.
- Execution Flow / Logic:
  1. Build the initial stage run at round 1 and fully restore player health.
  2. For rounds 1–4 and 6, draw the exact count from that stage's three enemy templates using the run PRNG. For rounds 7–8, create one of each template.
  3. Position enemies within the arena without overlapping the player start or boss footprint. Keep all entities inside the viewport.
  4. For round 5, create only the stage boss. For rounds 7–8, create the boss and three regular enemies.
  5. On Forest rounds 5 and 7, suppress only Guardian's phase transition. Keep its phase-1 attacks active until its health reaches zero. Preserve normal phase transitions on round 8.
  6. On Mine rounds 5 and 7, create Machine without Worm. On round 8, retain the existing Machine → Worm intro and Worm phase progression while the three regular enemies belong to that same round.
  7. Mark a round clear only after all regular enemies and every required boss segment are defeated. Keep the clear state for 120 simulation ticks, then increment the round and fully heal the player.
  8. On death, retain the current elapsed ticks and increment deaths once. Recreate combat at round 1 and the stage spawn with full health. Keep the existing death presentation timing.
  9. On round 8 completion, emit the existing stage-clear outcome. Do not auto-advance to the next stage; the result screen owns that choice.
  10. Re-anchor mine cart zones to arena bounds and preserve their warning, movement, and repeat timing. Reset them consistently with a new stage attempt.
- Error & Exception Handling:
  - Reject out-of-range rounds in round-count and encounter helpers.
  - Snapshot validation must reject missing or invalid round, timer, and random-state fields.
  - Restoring a valid snapshot must not consume extra random values or change the selected encounter.

### I02. Boss round regression coverage
- Related Files:
  - `src/game/sim/boss.js` :: configurable Guardian phase transition :: modify
  - `src/game/sim/mineBoss.js` :: preserve round-8 sequence under round state :: modify only if needed
  - `test/boss.test.js` :: phase-1-only Guardian behavior and default transition :: update
  - `test/mine-boss.test.js` :: solo Machine and full Worm sequence :: update
  - `test/mine-integration.test.js` :: round-8 integrated order :: update
- Details:
  - Keep default Guardian behavior unchanged for existing callers and round 8.
  - Prove that round-5/7 Guardian cannot enter phase 2 but can still be defeated.
  - Prove the Mine round-8 sequence preserves Worm's own phase-2 threshold and does not clear before all round enemies are defeated.

## Acceptance Criteria
- [ ] All eight encounter counts and species rules match the decision record.
- [ ] Round 5 has no regular enemies; rounds 7–8 have exactly one of each stage species.
- [ ] Guardian rounds 5/7 remain phase 1 through death; round 8 keeps its full phases.
- [ ] Mine round 8 completes Machine → Worm phase 1 → Worm phase 2 and includes the three regular enemies.
- [ ] Each round start restores full health; round clear advances after 120 ticks.
- [ ] Death restarts at round 1, increments deaths, and preserves elapsed time.
- [ ] Snapshot restore preserves the current round and future random encounter sequence.
- [ ] Mine carts remain inside the arena and retain their existing timing behavior.

## Validation
- Planned: `node --test test/stage-lifecycle.test.js test/boss.test.js test/mine-boss.test.js test/mine-integration.test.js`
- Planned: `npm run build`
- Do not run validation during the planning phase.

## Dependencies
- Requires T01's fixed arena stage templates.
- T03 consumes the round events and state. T04 persists the snapshot fields.

## Commit Message
```text
feat(sim): add eight-round stage encounters

Plan: 2026-11-16-round-based-progression
Phase: P01-round-based-gameplay
Task: T02-round-simulation
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
