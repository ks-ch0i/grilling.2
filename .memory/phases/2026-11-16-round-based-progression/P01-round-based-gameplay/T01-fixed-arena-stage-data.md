# Task: T01 Fixed Arena Stage Data

## Status: done

## Goal
Replace the two scrolling stage layouts with validated, single-screen arenas. Keep their stage identities and the three enemy species that round generation uses.

## Decision Summary
- Both stages use the 640×360 game viewport as their world bounds.
- Each arena has a reachable player spawn, walkable combat floor, boss footprint, and bounded stage geometry.
- Keep each stage's three enemy species as spawn templates for round generation; old world-map spawn counts no longer define encounter counts.
- Keep stage art and theme selection. Remove old map pickups that cannot fit the arena; full round healing replaces health-only recovery.

## Implementation

### I01. Rebuild stage content around the viewport
- Related Files:
  - `src/game/content/forestStage.js` :: forest arena, guardian, and enemy templates :: modify
  - `src/game/content/mineStage.js` :: mine arena, machine/worm, carts, and enemy templates :: modify
- Details:
  - Set each `world` to width 640 and height 360.
  - Keep `spawn`, `solids`, `pitDeathY`, `arena`, `enemies`, `boss`, and `pickups` compatible with the current stage interface.
  - Place the player and all enemy templates inside the arena bounds. Keep a clear initial spawn area and room for the boss footprint.
  - Preserve the forest and mine visual themes, boss definitions, and enemy type identifiers.
  - Retain only arena-relevant platforms and hazards. Do not leave coordinates from the discarded 11,520 px maps.
  - Inspect pickup effects. Omit health-only map pickups made redundant by round healing; preserve any non-health function only if it remains reachable and meaningful in the arena.
  - Keep mine cart hazard definitions available for arena re-anchoring in T02.

### I02. Update stage geometry validation
- Related Files:
  - `src/game/content/stageValidation.js` :: fixed-world bounds and stage content checks :: modify
  - `test/forest-stage.test.js` :: forest arena invariants :: update
  - `test/mine-stage.test.js` :: mine arena and cart invariants :: update
- Details:
  - Validate the 640×360 world, in-bounds spawn, arena, solids, boss footprint, and three supported enemy templates.
  - Keep validation deterministic and independent of Phaser rendering.
  - Replace assumptions that each stage contains nine fixed map enemies with checks for the three species used by round selection.
  - Reject coordinates outside the viewport unless a documented rendering-only object intentionally extends beyond it.

## Acceptance Criteria
- [x] Forest and Mine stage geometry fits the fixed 640×360 viewport.
- [x] Each stage exposes exactly its existing three enemy species as usable templates.
- [x] Bosses, solids, and any retained hazards fit and remain reachable in the arena.
- [x] Stage validation and focused stage tests describe the new arena model.

## Validation
- `node --test test/forest-stage.test.js test/mine-stage.test.js` — passed, 7/7.
- `npm.cmd run build` — passed; Vite reported the existing large-chunk warning.

## Dependencies
- None. T02 uses this stage schema.

## Commit Message
```text
feat(stage): replace scrolling maps with fixed arenas

Plan: 2026-11-16-round-based-progression
Phase: P01-round-based-gameplay
Task: T01-fixed-arena-stage-data
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
