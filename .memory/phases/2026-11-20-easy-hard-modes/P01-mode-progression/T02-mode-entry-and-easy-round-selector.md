# Task: T02 Mode Entry and Easy Round Selector

## Status: done

## Goal

Change title entry to choose Easy or Hard, make Hard New Game and Continue explicit choices, provide one reusable Easy stage/round selector popup, and show Hard plus Easy records in the existing Records menu.

## Decision Summary

- Remove the title-level Continue button. `Start` opens mode selection; Hard opens New Game and Continue; Easy opens the selector popup.
- Hard New Game immediately replaces only `save.run` and starts Forest Round 1. Continue is disabled if there is no saved Hard run.
- Locked Easy stages and rounds remain visible as disabled choices with lock indicators. The selector groups all eight rounds under each stage and can be shown from title or gameplay.
- After reload, title stays visible; Hard resumes only when the player chooses Hard → Continue.

## Implementation

### I01. Add a shared Easy round-selector model and popup

- Related Files:
  - `src/game/ui/easyRoundSelector.js` :: `easyRoundChoices`, `mountEasyRoundSelector`; new
  - `src/game/ui/menu.js` :: existing `mountMenu` popup methods; read-only
  - `test/easy-round-selector.test.js` :: stage/round availability tests; new

#### Details

- **Signatures & Types**:
  ```js
  export function easyRoundChoices(save);
  export function mountEasyRoundSelector({save,onSelect,onBack,titleScreen=false});
  // easyRoundChoices returns Array<{
  //   stageId: 'forest-1'|'mine-1', label: '숲'|'광산', unlocked: boolean,
  //   rounds: Array<{round: 1..8, unlocked: boolean}>
  // }> in Forest, Mine order.
  // onSelect(stageId: 'forest-1'|'mine-1', round: 1..8): void
  // onBack(): void
  // mountEasyRoundSelector returns the mountMenu handle: {root,panel,text,button,focus,hide,show,remove}.
  ```
- **Choice Model**:
  - Return stage groups in this order: Forest (`forest-1`), Mine (`mine-1`). Each group has its Korean label, `unlocked` boolean, and rounds `1..8` with a boolean `unlocked` field.
  - A stage is unlocked when `save.easy.unlockedRoundByStage[stageId] >= 1`. A round is unlocked when its stage is unlocked and `round <= unlockedRoundByStage[stageId]`.
  - Reject missing or malformed v4 Easy progress with `TypeError`; do not infer unlocks from Hard state.
- **Popup Flow**:
  1. Mount `이지 모드 라운드 선택` with `mountMenu`. Use `{variant:'title',layout:'submenu'}` when `titleScreen` is true, otherwise the normal popup layout.
  2. For each stage, add a stage label then eight round buttons. Use `숲`/`광산` for group labels and `N라운드` for unlocked choices. Include a lock mark in locked stage labels and locked round button labels; set those buttons' `disabled` option to true.
  3. An enabled round calls `onSelect(stageId,round)` exactly once. A locked button cannot invoke the callback.
  4. Add a `뒤로` button calling `onBack`, then focus the first enabled button. Existing `.game-panel` scrolling handles the 18-choice list.
- **Test Cases**:
  - Fresh v4 produces Forest Round 1 enabled, Forest Rounds 2..8 disabled, and all Mine rounds disabled.
  - Clearing Forest Rounds 1..3 makes rounds 1..4 selectable; clearing Round 4 then unlocks Round 5. Hard `unlockedStageIds` has no effect on Easy choices.
  - Unlocking Mine Round 1 enables Mine Round 1 only.

### I02. Route title actions through Easy/Hard mode selection

- Related Files:
  - `src/game/scenes/TitleScene.js` :: `create`, `showMain`, `showModes`, `showHardMenu`, `showEasySelector`, `startHardNew`, `continueHard`, `showRecords`; modify
  - `src/game/ui/menu.js` :: `createNewRun`, `menuState`, `formatTicks`; read-only unless a small shared formatting helper is needed
  - `test/title-menu.test.js` :: menu interaction and selector popup tests; modify
  - `test/menu-state.test.js` :: Hard New Game preservation and unlock tests; modify only if the extracted menu helpers change

#### Details

- **Title Flow**:
  1. `create()` keeps asset validation and storage notice behavior but removes the `shouldRecoverRun` auto-start branch. A reload therefore reaches `showMain()`.
  2. Main menu buttons are `시작`, `기록`, the existing development-only practice-round button when its current flag allows it, and `설정`. Do not render a global `이어하기` button.
  3. `시작` opens a mode menu with `이지 모드`, `하드 모드`, and `뒤로`.
  4. `이지 모드` mounts `mountEasyRoundSelector({save,onSelect,titleScreen:true,onBack:()=>showModes()})`. On selection, call `startAudio(stageId)` and start `stage` with `{mode:'easy',stageId,round}`.
  5. `하드 모드` opens a submenu with `새 게임`, `이어하기`, and `뒤로`. Continue uses `menuState(save).canContinue`; render it disabled if `save.run===null`. Continue starts `stage` with `{mode:'hard',run:save.run}`.
  6. New Game calls existing `createNewRun(save,'forest-1')`, persists it, and starts `stage` with `{mode:'hard',run:save.run}`. Do not show a confirmation dialog. Preserve all non-run fields through `createNewRun`.
  7. Remove the old production `showStages` flow that chooses a stage for the Hard campaign and its confirmation prompt. Keep `showPracticeRounds` behind the existing development flag.
- **Method Contracts**:
  - `showModes()` replaces the current menu with mode choices and focuses the first enabled button.
  - `showHardMenu()` replaces the current menu with New Game, Continue, and Back; Continue's disabled state is derived from the current save each time the submenu opens.
  - `showEasySelector()` calls `mountEasyRoundSelector` with the latest `store.getSave()`. Its enabled `onSelect(stageId,round)` starts the `stage` scene with `{mode:'easy',stageId,round}`; its `onBack` calls `showModes()`.
  - `startHardNew()` uses `createNewRun(store.getSave(),'forest-1')`, updates and persists the store, then starts `stage` with `{mode:'hard',run:save.run}`.
  - `continueHard()` reads the current `store.getSave().run`; if null it returns to `showHardMenu()` without starting a scene, otherwise it starts `stage` with `{mode:'hard',run}` and does not route through the reload-recovery pause.
- **Records View**:
  - Keep Hard best/recent rows per stage using `save.records[stageId]`.
  - Add Easy best/recent rows for each of the eight rounds under each stage using `save.easy.roundRecords[stageId][String(round)]`.
  - Label every row with mode, stage, round where applicable, time via `formatTicks`, and the record's paired death count. Render `없음` when a slot is empty. The existing panel's max-height and overflow provide scrolling.
- **Reload Behavior**:
  - Remove only title's automatic reload-resume behavior here. T03 removes the now-unused StageScene session markers and `reloadRecovery` helper after mode-specific autosaving is wired.
- **Test Cases**:
  - The main menu has no Continue control; Start opens mode selection; Hard submenu has New Game and a disabled/enabled Continue according to `run`.
  - New Game starts Forest Round 1 and keeps records, unlocks, settings, and Easy progress.
  - Easy selection starts the selected stage and round with `mode:'easy'`; locked choices do not start a run.
  - Records render Hard stage records and Easy per-round records, including empty states and paired deaths.

## Acceptance Criteria

- [x] Title has no global Continue button and does not auto-enter a run on reload.
- [x] Hard menu offers immediate New Game and saved-run Continue; Continue is disabled without `save.run`.
- [x] Easy title entry opens a grouped popup with every stage and round visible and correct lock states.
- [x] Existing Records menu displays both Hard stage records and Easy per-round records.
- [x] The development-only practice selector remains gated by its existing environment flag.

## Validation

- `node --test test/easy-round-selector.test.js test/title-menu.test.js test/menu-state.test.js`
- `npm test`
- Manual browser check: reload while a Hard run is active; confirm title appears, then Hard → Continue resumes the saved snapshot. Confirm Easy opens the selector as a popup and locked choices cannot be activated.

### Validation Results

- Focused tests passed: 10 tests.
- Full suite passed: 188 tests.
- `npm run build` passed; Vite reported the existing large JavaScript chunk warning.
- GUI browser check was not run: the only existing Chrome window was open to the user's Oracle Cloud billing page, and this environment does not support background input. The Easy selector's lock, disabled-button, and single-selection behavior is covered by automated tests.

## Commit Message

```text
feat(menu): add easy and hard mode entry

Plan: 2026-11-20-easy-hard-modes
Phase: P01-mode-progression
Task: T02-mode-entry-and-easy-round-selector

- Route title entry through Easy and Hard mode menus
- Add the shared locked-round selector and combined records view
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: recorded in the T02 implementation commit
