# Task: T03 Easy Round Session and Result Popups

## Status: done

## Goal

Run Easy attempts as independent selected-round sessions with full health and a round-local timer. Pause immediately on clear or death, persist only Easy progression/records/deaths, and provide the selected popup actions for retry, round selection, stage advance, home, and final campaign clear.

## Decision Summary

- Easy current run and elapsed time are memory-only. Round unlocks and records persist on each clear; cumulative Easy deaths persist immediately on each death and never reset in normal play.
- Retrying, selecting, or advancing to a round starts a fresh run at that round with timer `0` and full health. Easy death does not wait through Hard's automatic respawn.
- Round-clear, death, stage-clear, and overall-clear choices are popups over gameplay. Opening any popup pauses simulation and time until a choice is made.

## Implementation

### I01. Add fresh run creation at an explicitly selected round

- Related Files:
  - `src/game/sim/stage.js` :: `createStageRun`, private `startRound`; modify
  - `test/stage-lifecycle.test.js` :: fresh run and full-health round-start tests; modify

#### Details

- **Signature**:
  ```js
  export function createStageRun(stage, data = {}, options = {});
  // options: {seed?: number, startRound?: number}; startRound defaults to 1
  ```
- **Logic**:
  1. Preserve the existing snapshot restore branch: when `data` has keys, call `restoreStageRun(stage,data)` and ignore `startRound`, as Hard Continue restores its exact snapshot.
  2. For a fresh run, validate `startRound` as an integer in `1..ROUND_COUNT`; throw `RangeError` otherwise.
  3. Create the same randomized terrain, mine cart state, player, boss, and other initial state as today, then call `startRound(run,stage,startRound)` instead of hardcoding round 1.
  4. Keep `elapsedTicks=0`, `deaths=0`, `outcome=null`; existing `startRound` must continue setting player HP to `3`, positioning encounters, and applying the current round-specific boss/phase rules.
  5. Do not alter the default call behavior or Hard stage transitions.
- **Test Cases**:
  - Omitted `startRound` still creates Forest/Mine Round 1.
  - Forest/Mine fresh runs can start rounds 1..8 with timer zero, full HP, correct enemies, and the existing boss sequence for that round.
  - Invalid start rounds throw; a supplied Hard snapshot restores its stored round rather than the option.

### I02. Route StageScene through mode-specific Easy and Hard lifecycles

- Related Files:
  - `src/game/scenes/StageScene.js` :: `create`, `update`, `pauseGame`, scene shutdown handler; modify
  - `src/game/scenes/easySession.js` :: Easy run validation, completion/death persistence, and decision popup flow; new
  - `src/game/storage/saveStore.js` :: `recordEasyDeath`, `recordEasyRoundCompletion`; read-only (implemented by T01)
  - `src/game/storage/runCoordinator.js` :: `createRunCoordinator`; read-only, attach only for Hard
  - `src/game/ui/easyRoundSelector.js` :: `mountEasyRoundSelector`; read-only (implemented by T02)
  - `src/game/scenes/ResultScene.js` :: current Hard result flow; read-only
  - `src/game/storage/reloadRecovery.js` :: session flags; delete after removing all uses
  - `test/reload-recovery.test.js` :: obsolete automatic-resume behavior test; delete or replace with a focused route assertion
  - `test/easy-mode.test.js` :: Easy completion/death lifecycle tests using the extracted mode-flow functions and fake store/menu/scene context; new

#### Details

- **Scene Data & Initialization**:
  - Accept `data.mode` with values `hard` or `easy`; default missing mode to `hard` for existing callers and development presets.
  - For Easy, accept only `stageId` from `forest-1`/`mine-1` and integer `round` in `1..8`, verify that Easy currently unlocks the selection, then call `createStageRun(getStage(stageId),{}, {startRound:round})`.
  - For Hard, preserve current `data.run` restore behavior and create a new Forest Round 1 run when no run is supplied.
  - Do not persist a `mode` field inside the stage snapshot. Attach `createRunCoordinator({store})` only to Hard; Easy and existing practice runs use the current no-op coordinator contract.
  - The Easy save interface consumed here is `save.easy.totalDeaths`, `save.easy.unlockedRoundByStage[stageId]`, and `save.easy.roundRecords[stageId][String(round)]`. The selector API is `mountEasyRoundSelector({save,onSelect,onBack,titleScreen:false})`.
- **Easy Death Handling**:
  1. On the first `stage:death` event for an Easy session, set the save to `recordEasyDeath(save)` and call `store.persist()` immediately. Do not change Hard `run.deaths` or reset `easy.totalDeaths` anywhere.
  2. Pause simulation in the same update tick, clear the accumulator/input, disable gameplay input, and pause music before another simulation tick can reach the automatic respawn.
  3. Show `사망` with `다시 시도`, `라운드 선택`, `홈`. Retry restarts StageScene with the same Easy stage/round, which resets the timer and HP. Round Select replaces the death popup with `mountEasyRoundSelector` and starts the chosen currently unlocked round. Its back action restores the death popup. Home returns to title.
  4. Do not snapshot or persist Easy active state on the pause, visibility, pagehide, or scene-shutdown paths. Remove obsolete `markRunActive`/`clearRunActive` calls and delete the reload recovery helper/test once no imports remain.
- **Choice Modal Lock**:
  - Add `this.easyDecisionOpen`, initialized false. When `handleEasyDeath`, `handleEasyRoundClear`, or `handleEasyStageClear` opens a choice popup, set it true before exposing buttons. Replacing that popup with the selector and returning through Back keeps it true; starting a new round or leaving the scene clears it during scene recreation/shutdown.
  - While `easyDecisionOpen` is true, Escape must not call `resumeGame`, and `resumeGame()` must return without removing the decision popup. Only an explicit popup action can continue, restart, select, or leave. This prevents Easy's 120-tick automatic round advance or 60-tick respawn from resuming behind a dismissed popup.
  - Blur/visibility pause handlers must leave an open Easy decision popup intact. Existing regular Hard pause behavior remains unchanged.
- **Easy Clear and Timer Handling**:
  1. On `round:clear` for Easy rounds 1..7, record `{elapsedTicks:run.elapsedTicks,deaths:store.getSave().easy.totalDeaths}` via `recordEasyRoundCompletion`, persist immediately, and pause before `ROUND_CLEAR_TICKS` can advance. Use the just-updated Easy record as the displayed best.
  2. Show current time, cumulative Easy deaths, and selected round's best time/death pair. Buttons: `라운드 선택`, `다음 라운드`, `홈`. Next Round starts the same stage at `round+1`; the round selector opens as a popup over gameplay with a Back action that returns to this clear popup.
  3. On Easy `stage:clear` (Round 8), record the Round 8 result and persist before showing actions. For Forest, show `다음 스테이지` (starts Mine Round 1), `스테이지/라운드 선택`, and `홈`. Forest's unlock update from T01 must make Mine Round 1 selectable before these actions appear.
  4. For Mine, show `전체 클리어` with `라운드 선택` and `홈`; do not show a next-stage action. Keep the game view behind the popup until an action is chosen.
  5. Selecting, retrying, or advancing calls `scene.restart({mode:'easy',stageId,round})`. Fresh run creation resets `elapsedTicks` to zero and heals to 3 HP. Popup decision time is excluded because StageScene performs no simulation ticks while paused.
  6. Hard `stage:clear` still uses `ResultScene` and current stage-wide `recordCompletion`; Hard round transitions and autosave remain unchanged.
- **Popup Presentation**:
  - Build the modal with `mountMenu`; add existing `result-overlay` and `result-panel` classes, set the subtitle class, and use `result-summary`, `result-record`, `result-metrics`, `result-primary`, and `result-home` classes for clear results/actions. Use `formatTicks` for all displayed times. The death popup uses the existing menu panel and the same button focus behavior.
  - Keep every Easy popup in the current StageScene; use the shared selector from T02 rather than navigating to a separate selector scene.
- **Event & Error Handling**:
  - Persist errors continue through the existing storage notice from `mountStorageNotice`; do not silently reset Easy progress if storage is unavailable.
  - Implement distinct scene methods `handleEasyDeath`, `handleEasyRoundClear`, `handleEasyStageClear`, `showEasyChoice(kind)`, `showEasyRoundSelector(returnToKind)`, and `startEasyRound(stageId,round)` so each update event has one clear entry point. Set a per-scene death-handled flag before persisting so a single `stage:death` event increments `totalDeaths` once.
  - Remove the prior popup on every selector transition and scene shutdown. Reject locked Easy scene payloads by returning to title rather than starting an inaccessible stage/round.
- **Test Cases**:
  - Easy selection starts at the exact round with timer zero and full HP; selecting a later unlocked round preserves the Easy unlock map.
  - `test/easy-mode.test.js` constructs a StageScene instance with fake store/menu/scene methods and checks `handleEasyDeath`, `handleEasyRoundClear`, `handleEasyStageClear`, and `startEasyRound`: death persists once; clears persist result before popup; locked payloads return to title; retries and next rounds restart with the selected pair.
  - A death leaves the current round timer stopped and exposes Retry/Selector/Home. Retry returns to the same round with a zero timer but keeps the total death count.
  - A clear immediately stops the timer, saves the round record and next-round unlock, and the popup wait does not change the recorded time.
  - Forest Round 8 unlocks Mine Round 1 and offers Next Stage/Selector/Home. Mine Round 8 offers only Selector/Home.
  - Easy state is not written as `save.run`; Hard still autosaves and Hard stage completion still updates stage records.

## Acceptance Criteria

- [x] Easy can start any unlocked stage/round with full HP and a zeroed round timer.
- [x] Easy death immediately increments/persists lifetime Easy deaths once; retry preserves that counter and resets only the new attempt timer.
- [x] Easy clear freezes play and time, persists the round record/unlock, and shows the correct popup actions for normal round, Forest Round 8, or Mine Round 8.
- [x] Round selector opens as a popup and returns to the prior clear/death popup on Back.
- [x] Easy active runs never replace or autosave the Hard `run`; Hard autosave, reload-to-title, and stage-level records remain intact.
- [x] Existing boss/round rules and combat values are unchanged.

## Validation

- `node --test test/stage-lifecycle.test.js test/easy-mode.test.js test/save-store.test.js`
- `npm test`
- `npm run build`
- Manual browser flow: Easy Forest R1 → clear popup → open selector → Back → Next Round; die and retry while checking cumulative deaths; complete Forest R8 and enter Mine R1; complete Mine R8 and verify no Next Stage; reload during Easy and Hard sessions and verify Easy returns to title without an active-run save while Hard requires Hard → Continue.

### Validation Results

- Focused tests passed: 35 tests.
- Full suite passed: 193 tests.
- `npm run build` passed; Vite reported the existing large JavaScript chunk warning.
- Isolated headless browser smoke passed: title has no global Continue; Hard Continue is disabled without a run and enabled after reload with a saved Round 6 snapshot; Easy selector shows the correct disabled locks; entering Easy leaves the Hard run untouched and reload returns to title.
- The full boss-clear/death play sequence was not manually played in the browser; lifecycle, record, unlock, popup-action, and Back behavior are covered by `test/easy-mode.test.js`.

## Commit Message

```text
feat(game): add easy round flow and result popups

Plan: 2026-11-20-easy-hard-modes
Phase: P01-mode-progression
Task: T03-easy-round-session-and-result-popups

- Start Easy sessions at unlocked rounds with per-round timers
- Persist Easy records and lifetime deaths while pausing on decisions
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: recorded in the T03 implementation commit
