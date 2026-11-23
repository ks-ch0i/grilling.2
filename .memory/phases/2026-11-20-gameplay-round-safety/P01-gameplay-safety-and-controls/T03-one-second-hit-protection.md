# Task: T03 One-Second Hit Protection

## Status: done

## Implementation Baseline
- Target `origin/main` at `5ad654e`. The shared ordinary-damage guard remains in `applyPlayerDamage()`, and `HURT_INVULNERABLE_TICKS` is still 45 at `TICK_RATE=60`.
- Upstream added shield/parry damage handling through the fourth `defenseCategory` argument. Both a normal hurt and a successful front-facing defense block set the shared timer; preserve that behavior when changing the duration.

## Goal
Give the player one full second of shared protection after ordinary damage so a single enemy attack followed by enemy-body contact cannot remove another heart during that interval.

## Decision Summary
- Change `HURT_INVULNERABLE_TICKS` from 45 to 60 at the 60-tick simulation rate. Keep the existing shared damage guard and keep pit death immediately lethal.
- Do not add a second timer or source-specific protection path; `applyPlayerDamage` already guards ordinary enemy, boss, projectile, and hazard damage.

## Implementation

### I01. Change the shared duration and lock the boundary with simulation tests

- Related Files:
  - `src/game/sim/constants.js` :: `HURT_INVULNERABLE_TICKS` — set 60 simulation ticks; modify
  - `src/game/sim/combat.js` :: `applyPlayerDamage` — read-only shared guard and pit exception
  - `src/game/sim/player.js` :: `stepPlayer` — read-only timer decrement and visual timer state
  - `test/player.test.js` :: exact one-second duration boundary; modify
  - `test/mine-boss.test.js` :: hazard multi-contact protection assertion/name; modify
  - `test/mine-stage.test.js` :: persistent-pool re-hit boundary after shared protection expires; modify
  - `test/knockback.test.js` :: all-source immunity regression cases; modify
  - `test/defense.test.js` :: defense-block timer and repeated-hit assertion; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export const HURT_INVULNERABLE_TICKS: 60;
  export function applyPlayerDamage(
    state: Player, source?: string, impact?: { originX?: number; originY?: number },
    defenseCategory?: 'none' | 'melee' | 'ranged'
  ): { player: Player; events: PlayerEvent[] };
  ```
- **Data & Schema Fields**:
  - No new fields, snapshot keys, save version changes, or damage-source enums.
  - The existing `Player.invulnerableTicks` remains an integer count in the range accepted by `restoreStageRun`.
- **Execution Flow / Logic**:
  1. Set `HURT_INVULNERABLE_TICKS` in `src/game/sim/constants.js` to `60`; the simulation tick rate is `TICK_RATE=60`.
  2. Preserve `applyPlayerDamage`'s existing guard for `roll`, `dive`, dive grace, roll protection, `damageInvulnerable`, and `invulnerableTicks > 0`.
  3. Preserve `source === 'pit'` bypass so pit damage still kills immediately.
  4. Keep `stepPlayer`'s existing `damageInvulnerable` update and decrement order; do not reset or restart the timer on blocked hits.
  5. Keep all current sources routed through `hurt()`/`applyPlayerDamage`; no source-specific protection path is added. Preserve the latest fourth-argument shield/parry category behavior.
- **Error & Exception Handling**:
  - No new runtime error behavior. Do not let blocked hits reduce HP, reset knockback, or extend the 60-tick interval.
- **State Transition & Return**:
  - A successful non-pit hit sets `invulnerableTicks` to 60. Each subsequent simulation tick consumes one tick; hits remain blocked for all 60 ticks, and the next ordinary hit can apply only after the timer reaches zero.

### I02. Duration and source regression assertions

- Related Files:
  - `test/player.test.js` :: `damage grants immunity and death happens once` — add an explicit 60-tick assertion; modify
  - `test/mine-boss.test.js` :: multiple mineral contacts — retain one-heart damage for same-tick hazard contacts; modify
  - `test/knockback.test.js` :: contact, enemy attack, projectile, and boss-hit cases — verify blocked damage does not change HP or knockback; modify
  - `test/defense.test.js` :: replace the hard-coded 45-tick shield-block expectation with the shared 60-tick constant and verify a second matching hit remains blocked; modify

#### Details
- Assert the constant is exactly 60 and that contact remains blocked for ticks 1 through 60 after a hit; tick 61 may apply damage.
- Retain coverage that contact, enemy attack, projectile, boss attack/contact, and hazard all share the protection.
- Assert shield-block damage still starts the same 60-tick interval; preserve front/back and melee/ranged defense-category rules.
- Retain the existing assertion that pit damage bypasses protection and that dead players do not receive repeated death events.

## Acceptance Criteria
- [x] A successful ordinary hit sets the timer to 60 ticks, equal to one second at 60 ticks per second.
- [x] Existing ordinary damage sources share the same 60-tick guard; blocked hits neither remove another heart nor reset the timer.
- [x] Pit death, roll protection, dive protection, and knockback behavior are unchanged.

## Validation
- `node --test test/player.test.js test/knockback.test.js test/mine-boss.test.js test/defense.test.js test/mine-stage.test.js` — exact boundary, all-source sharing, persistent hazard re-hit, defense-block timer, and pit exception pass.
- `npm run build` — Vite production build completes successfully.

## Commit Message
```text
fix(combat): extend hit protection to one second

Plan: 2026-11-20-gameplay-round-safety
Phase: P01-gameplay-safety-and-controls
Task: T03-one-second-hit-protection

- Set shared ordinary-hit protection to 60 ticks
- Preserve pit death and existing damage-source routing
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`node --test test/player.test.js test/knockback.test.js test/mine-boss.test.js test/defense.test.js test/mine-stage.test.js`, `npm run build`, `git diff --check`)
- review: no actionable findings
- commit: pending
