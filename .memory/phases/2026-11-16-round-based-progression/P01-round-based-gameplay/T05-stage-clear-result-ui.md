# Task: T05 Stage Clear Result UI

## Status: pending

## Goal
Show a polished stage-clear result with the completed attempt, personal best, deaths, and the correct navigation actions for Forest and Mine.

## Decision Summary
- Forest clear offers Home, Next Stage, and Retry.
- Mine clear offers Home and Retry; it has no Next Stage action.
- Next Stage starts Mine at round 1. Retry starts the cleared stage at round 1 with a fresh timer and death count.
- Home returns to the title screen.

## Implementation

### I01. Build the stage result presentation
- Related Files:
  - `src/game/scenes/ResultScene.js` :: stage result details and actions :: modify
  - `src/game/ui/menu.js` :: shared DOM panel/button helpers :: modify only if reusable behavior is missing
  - `src/styles.css` :: responsive clear-result panel, record hierarchy, and buttons :: modify
- Details:
  - Present a clear title, stage name, stage time, death count, fastest time, and the deaths paired with that fastest record.
  - Clearly distinguish the current result from the saved personal best.
  - Use the existing visual language and create a polished, readable layout at the fixed 640×360 game size and on smaller browser windows.
  - Keep keyboard focus and button semantics consistent with existing menu screens.
  - Omit the Next Stage button on the final Mine stage rather than disabling it.

### I02. Wire result actions to fresh runs
- Related Files:
  - `src/game/scenes/ResultScene.js` :: navigation action wiring :: modify
  - `src/game/ui/menu.js` :: `createNewRun` or related run factory :: modify if necessary
  - `test/menu-state.test.js` :: home, next, and retry state transitions :: update
  - `test/run-coordinator.test.js` :: stage record handoff :: update if necessary
- Execution Flow / Logic:
  1. Home returns to the title scene without creating a new run.
  2. Forest Next Stage creates a fresh Mine stage attempt, then enters its first round.
  3. Retry creates a fresh attempt for the just-cleared stage and enters its first round.
  4. Do not expose Next Stage for Mine. Keep its record available after returning Home.
  5. Use the save store's accepted best-record result so the UI cannot pair a faster time with deaths from a slower run.

## Acceptance Criteria
- [ ] Result shows current time/deaths and best time/deaths for the cleared stage.
- [ ] Forest has Home, Next Stage, and Retry actions.
- [ ] Mine has Home and Retry actions only.
- [ ] Retry resets time and deaths and starts the same stage at round 1.
- [ ] Forest Next Stage starts Mine at round 1 with fresh time and deaths.
- [ ] The result layout remains readable and keyboard-operable at the target game dimensions.

## Validation
- Planned: `node --test test/menu-state.test.js test/run-coordinator.test.js test/save-store.test.js`
- Planned: `npm run build`
- Do not run validation during the planning phase.

## Dependencies
- Requires T03's stage-clear handoff and T04's attempt/record contracts.

## Commit Message
```text
feat(ui): add stage clear results and retry actions

Plan: 2026-11-16-round-based-progression
Phase: P01-round-based-gameplay
Task: T05-stage-clear-result-ui
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
