# Task: T04 Enlarge Worm Boss Acid Hazards

## Status: done

## Goal

Make the Mine worm boss's ranged acid projectile and floor pool clearly larger in both simulation and rendering, while keeping one-heart damage, four-second pool lifetime, and regular Insect acid unchanged.

## Decision Summary

- Worm boss acid projectile: 16×16 hitbox, existing sprite displayed at about 21×21.
- Worm boss acid pool: 48×8 hitbox, existing sprite displayed at about 64×11.
- Keep damage and the 240-tick lifetime unchanged. Apply the larger pool only to hazards owned by `mine-worm`.
- Reuse existing frames in `public/assets/effects/boss/worm.png`; do not edit or regenerate source art.

## Implementation

### I01. Enlarge new worm boss acid projectiles and pools

- Related Files:
  - `src/game/sim/mineBoss.js` :: worm `spit` hazard emission :: modify
  - `src/game/sim/hazards.js` :: acid-shot floor collision and pool creation :: modify
  - `src/game/sim/stage.js` :: hazard snapshot validation :: modify only if the new dimensions violate an existing rule
  - `test/mine-boss.test.js` :: worm spit emission and pool geometry :: update
  - `test/mine-enemies.test.js` :: ordinary Insect acid remains unchanged :: update or preserve

#### Details

- **Signatures & Types**:
  ```js
  // Existing boss simulation API; retain its signature and return shape.
  export function stepMineBoss(state, player, arena, rng) {
    // Returns { boss, events, hazards, rng }.
  }

  // Existing hazard simulation API from T03; retain its signature.
  export function stepHazards(input, player, collisionTerrain, supportTerrain = collisionTerrain) {
    // Returns { hazards, events }.
  }
  ```
- **Data & Schema Fields**:
  - A newly emitted worm `acid-shot` has `ownerId: 'mine-worm'`, `w: 16`, `h: 16`, `life: 180`, and `poolTicks: 240`.
  - Keep the shot centered on its current horizontal origin and preserve its previous vertical center: use x=`boss.x + boss.w / 2 - 8`, y=`boss.y - 4`, w=16, h=16. Its center remains `(boss.x + boss.w / 2, boss.y + 4)`.
  - A pool created from a worm-owned acid shot has `w: 48`, `h: 8`, x centered under the shot, and y=`floor.y - 8` so its bottom rests on the floor.
  - A pool created from any regular Insect acid shot stays `w: 28`, `h: 6`, x centered under the shot, y=`floor.y - 6`, and uses the shot's existing 120-tick lifetime.
  - Existing boss-effect geometry is computed by `fxItem` using 128-pixel frames and a 96×96 core. Thus 16×16 renders at 21.33×21.33 and 48×8 at 64×10.67. Keep the current `worm.acid` and `worm.pool` clip keys and frames.
- **Execution Flow / Logic**:
  1. Change only the worm boss `spit` emission in `stepMineBoss`; preserve facing, velocity (±110 horizontally, -180 vertically), gravity, attack timing, owner, and lifetime.
  2. When an acid shot hits a solid, choose pool dimensions from `ownerId`: `mine-worm` gets 48×8; every ordinary enemy owner gets 28×6.
  3. Center each pool at the shot's impact x and place its bottom on the collision surface. T03 supplies floor-only collision for falling acid, so a pool still forms on the floor after the shot passes through platforms.
  4. Keep `poolTicks` (240 for worm, 120 for Insect), repeated contact behavior, and one-heart damage unchanged.
  5. Keep `collectBossHazardItems` and `fxItem` using the hazard rectangle; the existing sprite display size will follow the chosen hitbox size.
  6. Preserve already-saved in-flight worm hazards at their saved dimensions. Only newly emitted shots and newly created pools use the enlarged dimensions.
  7. Do not alter the Mine Insect effect drawing, the worm source PNG, other boss effects, or asset manifest frame dimensions.
- **Error & Exception Handling**:
  - Continue rejecting non-positive hazard dimensions and malformed saved hazards.
  - Do not infer pool ownership from the acid sprite key; use the existing `ownerId` so Insect and Worm retain distinct sizes.
  - Do not change damage application or invulnerability timing when enlarging the collision rectangles.

### I02. Verify persisted dimensions and visual scale

- Related Files:
  - `test/mine-attack-presentation.test.js` :: worm hazard owner filtering and sprite display dimensions :: update
  - `test/mine-integration.test.js` :: saved Worm attack continuation :: update
  - `test/mine-stage.test.js` :: current save parser accepts enlarged hazards :: update if needed

#### Details

- Test a newly emitted Worm spit shot is 16×16 and keeps its center, velocity, and 240-tick pool lifetime.
- Test a Worm shot passes through a platform, hits the floor, and creates one centered 48×8 pool.
- Test a regular Insect shot remains 8×8 and creates a centered 28×6 pool for 120 ticks.
- Test enlarged Worm hazards survive JSON snapshot, `parseSave`, restore, and the next simulation step with identical dimensions and presentation.
- Test presentation dimensions are approximately 21.33×21.33 for the shot and 64×10.67 for the pool; ordinary Insect hazards still use the existing non-boss presentation.
- Manually use the development Mine-Worm encounter to confirm the acid projectile and pool are visually legible, the pool sits on the floor, and its hit area corresponds to the visible art.

## Acceptance Criteria

- [x] Newly emitted Worm acid shots are 16×16; existing attack speed, arc, damage, and timing are unchanged.
- [x] Worm pools are 48×8, centered at the impact point and grounded on the floor; they last 240 ticks and deal the existing damage.
- [x] Regular Insect shots and pools remain 8×8 / 28×6 and 120 ticks.
- [x] Existing Worm sprite frames display at the selected approximate sizes with no source asset edit.
- [x] New and existing Worm hazard snapshots parse and resume without changing saved active hazard dimensions.

## Validation

- `node --test test/mine-boss.test.js test/mine-enemies.test.js test/mine-attack-presentation.test.js test/mine-integration.test.js test/mine-stage.test.js` — new Worm dimensions, unchanged Insect behavior, presentation, and save continuation pass.
- `npm.cmd run build` — production Vite build succeeds.
- `npm.cmd run dev` — visually inspect the development Mine-Worm encounter's spit and pool.
- Do not run validation during the planning phase.

## Dependencies

- Requires T03's floor-only landing collision and platform-piercing hazard behavior.
- Uses T01/T02 snapshot layout behavior without changing it.

## Commit Message

```text
feat(boss): enlarge worm acid projectile and pool

Plan: 2026-11-17-randomized-terrain-and-worm-acid
Phase: P01-randomized-arena-combat
Task: T04-enlarge-worm-acid-hazards

- Increase Worm spit and pool hitboxes to the confirmed sizes
- Preserve Insect acid behavior and four-second Worm pool duration
```

## Progress

- [x] Implementation complete
- [x] Focused tests and production build passed.
- [ ] Manual browser visual inspection: unavailable because the CUA host reported no browser or native apps. Automated presentation tests confirm the requested display dimensions; actual in-game appearance remains unverified.
- commit: see repository history
