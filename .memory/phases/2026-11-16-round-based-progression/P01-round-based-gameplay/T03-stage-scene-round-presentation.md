# Task: T03 Stage Scene and Round Presentation

## Status: done

## Goal
Present round progress and clear feedback in the stage scene without deciding the camera's zoom or movement style.

## Decision Summary
- Display the current round out of 8 during play.
- Display round clear for 120 ticks before the simulation starts the next round.
- Keep stage rendering compatible with the 640×360 arena coordinates.
- Camera framing and dead-zone helper changes belong to the separate camera plan and remain undecided.

## Implementation

### I01. Render the round-based arena without changing camera policy
- Related Files:
  - `src/game/scenes/StageScene.js` :: stage coordinates, camera integration, and world rendering :: modify
  - `src/game/render/cameraDeadZone.js` :: current camera target behavior :: read-only
- Details:
  - Render stage geometry and entities using the fixed arena coordinates supplied by T01.
  - Keep the current camera zoom, scroll, easing, and target integration unchanged in this task.
  - Do not force a new fixed-camera mode, add zoom, change follow motion, or remove `cameraScrollTarget` calls.
  - Keep the current dead-zone helper and its tests intact. The separate camera plan will decide their future after the user selects a framing direction.
  - Avoid introducing render transforms that change simulation coordinates or input/physics dimensions.

### I02. Add round HUD and clear feedback
- Related Files:
  - `src/game/scenes/StageScene.js` :: round number, clear message, and round events :: modify
  - `src/game/ui/menu.js` :: shared menu style conventions :: inspect; modify only if shared UI is required
  - `src/styles.css` :: round HUD/clear overlay styling :: inspect; modify only if existing styles are insufficient
- Details:
  - Render the stage round as `ROUND n / 8` beside the existing health and boss UI.
  - On round clear, show a legible `ROUND CLEAR` state for the same 120 ticks used by simulation.
  - Update the round label and reset transient round messaging when the next round begins.
  - Let the simulation own the clear duration. Do not add a second UI timer that can drift from simulation state.
  - Keep gameplay controls responsive during normal combat. Do not add player-facing round selection.

### I03. Integrate stage events and development tooling
- Related Files:
  - `src/game/scenes/StageScene.js` :: round, death, and stage-clear event handoff :: modify
  - `test/round-selector.test.js` :: development helper compatibility :: update if affected
- Details:
  - Consume round-start and round-clear state without duplicating progression in the scene.
  - Keep death and stage-clear transitions compatible with autosave/recovery and result navigation.
  - Avoid stale round-clear text after death, reload, or a new stage attempt.
  - Keep the existing development-only practice controls; do not add production round selection.

## Acceptance Criteria
- [x] The HUD shows the current round and uses the simulation's 120-tick clear interval.
- [x] Round labels update after automatic transitions and restore correctly after reload.
- [x] Existing health, boss, death, and stage-clear presentation continues to work.
- [x] Development practice-round support remains available without adding player-facing round selection.
- [x] Camera zoom, follow motion, and dead-zone helper behavior are not changed by this task.

## Validation
- `node --test test/round-selector.test.js test/stage-lifecycle.test.js test/camera-deadzone.test.js` — passed, 18/18.
- `npm.cmd run build` — passed; Vite reported the existing large-chunk warning.
- Do not run validation during the planning phase.

## Dependencies
- Requires T01 fixed arena geometry and T02 round state/events.
- T05 consumes the stage-clear handoff. Camera implementation remains in the separate camera plan.

## Commit Message
```text
feat(scene): present round progression in stage HUD

Plan: 2026-11-16-round-based-progression
Phase: P01-round-based-gameplay
Task: T03-stage-scene-round-presentation

- Show round state and clear feedback from simulation events.
- Leave camera framing to the separate camera plan.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
