# Task: T04 Forest Root Surface Targeting

## Status: done

## Goal

Make every Forest Guardian root warning and strike in Forest rounds 5, 7, and 8 target the nearest supporting profile surface under the player's target x, including round 8 phase two's additional strike, with one locked position for warning and damage.

## Decision Summary

- At the start of each root warning, select the first walkable top surface below the player's feet; if none exists, select the fixed floor. If the player is standing on a surface, that surface is the nearest support beneath the target x.
- Clamp the root rectangle to the arena first, then sample the surface beneath that rectangle's center so its warning and hitbox occupy the selected platform even at arena edges.
- Keep the existing 48×48 root hitbox, damage, windup, phase delays, strike count, and saved boss attack records. The warning and its corresponding hit share one selected rectangle.

## Implementation

### I01. Select and lock the target surface for all root strikes

- Related Files:
  - `src/game/sim/boss.js` :: `targetRect`, `beginWindup`, `stepBoss` :: modify
  - `src/game/sim/platforms.js` :: `nearestPlatformSurface` or the T01 surface lookup :: read-only/modify only if a needed query is missing
  - `src/game/sim/stage.js` :: Forest boss call in `stepStage` :: modify
  - `test/boss.test.js` :: root target surface and timing :: modify
  - `test/forest-stage.test.js` :: Forest R5/R7/R8 wiring :: modify

#### Details
- **Signatures & Types**:
  ```js
  // Active platform records are a union:
  // ProfiledPlatform = { x:number, w:number, topProfile:number[], variant:0|1|2|3 }
  // LegacyPlatform = { x:number, y:number, w:number, h:number }

  export function stepBoss(state, player, arena, platforms = []) {
    // Existing return: { boss, events }.
  }

  function targetRect(kind, boss, player, arena, platforms = []) {
    // For root: returns a locked 48x48 rectangle whose bottom aligns to the
    // selected surface y. Other attack rectangles stay unchanged.
  }
  ```
- **Data & Schema Fields**:
- A profile's horizontal sections are 16 pixels wide and `topProfile[index]` is its absolute world y. A legacy rectangular platform's walkable top is `platform.y`. The fixed floor top is `arena.bottom`.
  - Root rectangle remains `{x, y, w:48, h:48}`; `x` is the player's center minus 24 clamped to `[arena.left+16, arena.right-48]`, and `y = selectedSurfaceY - 48`. Resolve `selectedSurfaceY` under the final rectangle center (`x + 24`).
  - Do not add persistent root-target fields. Existing `telegraphs`, `hitboxes`, `secondRoot`, and `rootEffects` rectangles already hold the selected x/y through JSON save/restore.
- **Execution Flow / Logic**:
  1. Add an optional `platforms` parameter to `stepBoss` and pass the active Forest run's entire `terrainLayout.platforms` array from `stepStage`; do not filter out legacy rectangles. Direct unit tests and callers may omit it and retain floor-only targeting.
  2. When `beginWindup` selects a root attack, compute the clamped target x first and sample beneath the resulting rectangle center (`x + 24`). For each active platform containing that x (`platform.x <= x < platform.x + platform.w`), get its surface y from the profile sample when `topProfile` exists or from `platform.y` for a legacy rectangle. Include the fixed floor. Select the eligible support with the smallest y that is at or below the player's feet (`surfaceY >= player.y + player.h`). If the player is already standing on a platform, accept that support at equal feet y. If airborne above multiple surfaces, choose the first one downward; ignore surfaces above the player's feet. If no platform is eligible, use `arena.bottom`.
  3. Use one shared helper to construct the root rectangle from the selected surface. Do not independently recompute x or y at eruption. `beginWindup` stores the first root in `telegraphs`; the existing transition from windup copies that rectangle to `hitboxes` and `rootEffects`.
  4. For phase two, when the first root erupts, choose the second target once at that second warning's start using the player's then-current position, profiles, and floor. Store the rectangle in both `secondRoot` and `telegraphs`; after the existing 30-tick delay, copy that same stored rectangle into the second hitbox/root effect. Do not re-target while the warning is active.
  5. Apply the same helper in every Forest Guardian encounter. No encounter-specific exception: R5 and R7 phase one roots, R8 phase one root, and R8 phase two's first and additional root all use surface targeting.
  6. Preserve `ROOT_PLUNGE_TICKS`, `ROOT_DELAY_TICKS`, active hitbox duration, `ROOT_EFFECT_TICKS`, root dimensions, event names/tick order, damage, phase schedule, and cancellation on boss transition/death.
- **Error & Exception Handling**:
- Ignore malformed platform records rather than passing them to rectangle collision. Normal run restoration validates either the new profile layout or an older rectangle layout before `stepBoss` receives it.
  - If no eligible profile exists under the target x, use the arena floor. Never place the strike above the player's feet solely because a platform is higher.
  - Keep old saved boss rectangles intact; do not recompute a pending telegraph or second root during restore.

### I02. Verify visual warning, eruption, and saved in-progress attacks

- Related Files:
  - `src/game/scenes/StageScene.js` :: root telegraph and root effect rendering :: inspect/read-only unless the view uses stale fixed-floor geometry
  - `test/forest-attack-presentation.test.js` :: visual record placement and JSON restore :: modify

#### Details
- Confirm the existing Forest presentation reads `telegraphs`, `hitboxes`, and `rootEffects` x/y rather than constructing a floor-only marker from player position. If the view has a fixed-floor assumption, draw from the stored 48×48 records so presentation and collision stay aligned.
- Tests must cover: player standing on a new profile and an old rectangle platform; airborne above one or more surfaces; no surface below so floor fallback is used; a surface above the player's feet is ignored; clamped arena-edge target x; exact 16-pixel section-boundary selection; phase-one timing unchanged; phase-two additional strike shares its second telegraph rectangle; JSON snapshot/restore preserves a pending first and second root unchanged.
- For rounds 5, 7, and 8, assert the Forest stage passes the exact active run profile set into the boss step. Keep Mine boss stepping and schedules unchanged.

## Acceptance Criteria

- [x] Forest Guardian root warnings in rounds 5, 7, and 8 select the nearest eligible new profile or legacy rectangle surface below the player, or the fixed floor if none exists.
- [x] The player's grounded supporting surface is eligible at equal feet y; higher surfaces are ignored when the player is airborne below them.
- [x] Each hitbox/root effect has exactly the same rectangle as its warning, including the round 8 phase-two additional strike.
- [x] Existing root timing, dimensions, damage, strike counts, phase schedule, cancellation, and saved in-progress rectangles remain unchanged.

## Validation

- `node --test test/boss.test.js test/forest-stage.test.js test/forest-attack-presentation.test.js test/stage-lifecycle.test.js` — 27 tests passed, including target selection, all Forest rounds, attack timing/presentation, and save/restore.
- `npm.cmd run build` — passed; Vite emitted the existing warning for a 1.49 MB minified JavaScript chunk.
- `git diff --check` — passed.

## Commit Message

```text
fix(boss): target Forest roots on platform surfaces

Plan: 2026-11-17-irregular-platforms-and-charge-attacks
Phase: P01-irregular-platforms-and-combat
Task: T04-forest-root-surface-targeting

- Select a walkable support when each root warning starts
- Reuse the locked rectangle for warning and eruption
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: `76d4eff`
