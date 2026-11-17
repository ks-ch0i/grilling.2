# Task: T03 Make Ranged Attacks Pierce Platforms

## Status: pending

## Goal

Allow regular-monster projectiles and all boss ranged or area hazards to cross fixed or randomized platforms, while retaining floor impacts, wave support behavior, world walls, and arena-lock walls.

## Decision Summary

- Ranged attacks ignore all floating platforms, including the original three in legacy-fixed runs.
- The floor remains the collision surface for acid pools and falling-rock/mineral impacts. World and arena boundaries remain solid.
- Player movement, enemy movement, player melee line-of-sight, boss bodies, and boss melee hitboxes keep their existing terrain behavior.

## Implementation

### I01. Separate full movement terrain from ranged-attack terrain

- Related Files:
  - `src/game/sim/stage.js` :: `stageTerrain`, new `stageRangedTerrain`, and `stepStage` :: modify
  - `src/game/sim/enemies.js` :: `stepProjectile` terrain input :: modify only if needed
  - `src/game/sim/hazards.js` :: `stepHazards` collision and support inputs :: modify
  - `test/enemies.test.js` :: Wisp projectile platform and wall cases :: update
  - `test/mine-enemies.test.js` :: wave ledge/platform/wall and acid landing cases :: update
  - `test/mine-boss.test.js` :: boss projectile and falling hazard cases :: update
  - `test/mine-integration.test.js` :: end-to-end Mine run behavior :: update

#### Details

- **Signatures & Types**:
  ```js
  export function stageTerrain(stage, locked, terrainLayout) {
    // Full movement and player-melee geometry: floor + platforms + boundary walls.
  }

  export function stageRangedTerrain(stage, locked) {
    // Projectile blocking geometry: floor + boundary walls; never platforms.
  }

  export function stepHazards(input, player, collisionTerrain, supportTerrain = collisionTerrain) {
    // Returns { hazards, events }.
  }

  export function stepProjectile(state, terrain, player) {
    // Existing return shape { projectile, events }.
  }
  ```
- **Data & Schema Fields**:
  - `stageTerrain` uses T02's composed run solids and returns those rectangles plus the existing world and arena-lock walls.
  - `stageRangedTerrain` contains only `stage.solids[0]` (the fixed floor) and the exact same world/arena boundary walls. Omit every platform rectangle.
  - `supportTerrain` is the complete geometry from `stageTerrain`; it exists so ground waves can still detect a ledge or the surface they travel across.
- **Execution Flow / Logic**:
  1. In `stepStage`, compute full terrain and ranged terrain once for the active run and arena-lock state.
  2. Continue to pass full terrain to `stepPlayer`, `stepEnemy`, `separateOverlappingTargets`, and player attack damage/visibility calculations.
  3. Pass ranged terrain to `stepProjectile`, so Wisp shots ignore platforms but still stop at the floor, world walls, or arena-lock walls.
  4. Pass ranged terrain as `collisionTerrain` to `stepHazards` and full terrain as `supportTerrain`.
  5. For `acid-shot`, `rock`, and `mineral`, detect solid impacts only against `collisionTerrain`. They pass through all platforms and continue to the fixed floor. Preserve player collision checks, gravity, lifetime, impact events, and damage.
  6. For `wave`, test the moving hazard rectangle against `collisionTerrain` for blocking, and test the ground probe against `supportTerrain` for support. This lets waves cross platforms while still ending at a real ledge, range limit, or wall.
  7. Keep carts, acid pools, player attacks, soldier/boar melee, boss body contact, and direct boss hitboxes unchanged.
  8. Keep the default third argument behavior for direct `stepHazards` callers: when no `supportTerrain` is given, use `collisionTerrain` for both roles. Existing isolated hazard tests remain valid.
- **Error & Exception Handling**:
  - Do not turn platforms into transparent surfaces for player or enemy body movement.
  - Do not remove the floor from ranged collision; falling acid must still form a pool there, and falling minerals must still emit floor-impact behavior.
  - Preserve the current wall and arena-lock wall coordinates and their boundary behavior.

### I02. Add focused simulation and run-level regressions

- **Execution Flow / Logic**:
  1. Test an enemy Wisp projectile crossing a platform and hitting a player beyond it; test the same projectile stops at a world wall.
  2. Test a Golem wave crossing a platform while retaining its existing range limit, ledge stop, and wall stop.
  3. Test an Insect acid shot crossing a platform, creating its unchanged 28×6, 120-tick pool only when it reaches the floor.
  4. Test Mine boss rocks, minerals, and worm acid crossing a platform and retaining floor impact/pool behavior.
  5. Test an arena-locked run so ranged hazards do not leave through either locked side wall.
  6. Assert player movement and player melee attacks still collide with or are occluded by full platform geometry as before.

## Acceptance Criteria

- [ ] Every regular-monster ranged attack and every boss ranged/area hazard crosses fixed and randomized platforms.
- [ ] Floor, world boundary, and arena-lock wall collision remains in effect.
- [ ] Acid pools and falling impacts still occur at the floor; falling hazards no longer land on a platform.
- [ ] Golem waves still stop at ledges, range limits, and walls while passing over platform surfaces.
- [ ] Player movement, enemy body movement, melee attacks, boss body movement, and boss melee damage are unchanged.
- [ ] The regular insect acid pool remains 28×6 and 120 ticks.

## Validation

- `node --test test/enemies.test.js test/mine-enemies.test.js test/mine-boss.test.js test/mine-integration.test.js` — projectile, hazard, ledge, wall, and integrated-run cases pass.
- Do not run validation during the planning phase.

## Dependencies

- Requires T02's run-specific full terrain and fixed floor composition.
- T04 relies on the floor-only acid impact behavior established here.

## Commit Message

```text
feat(combat): let ranged attacks pierce platforms

Plan: 2026-11-17-randomized-terrain-and-worm-acid
Phase: P01-randomized-arena-combat
Task: T03-ranged-attacks-pierce-platforms

- Separate platform support from ranged collision surfaces
- Keep floor impacts and arena boundary blocking
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
