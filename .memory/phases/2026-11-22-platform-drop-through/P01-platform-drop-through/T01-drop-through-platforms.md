# Task: T01 Drop-Through Platforms

## Status: done

## Goal

Finish the existing worktree implementation so a grounded player can descend through the raised platform they are standing on with `S` or `ArrowDown` + `Space`, while ordinary jumps, lower-platform landings, old Hard saves, and existing terrain remain correct.

## Decision Summary

- The down key must already be held when Space is pressed. If no drop-through platform supports the player, perform an ordinary jump.
- Drop only through the current non-floor platform, at 80 px/s initial downward speed. Leave other platforms and the floor solid; continue with normal gravity and horizontal control.
- Save the indexes of platforms still being cleared as optional player state in the existing v5 run snapshot. The shared input and simulation mean the control works in Easy and Hard.

## Implementation

### I01. Capture the down+jump chord

- Related Files:
  - `src/game/input/InputController.js` :: `InputController` — capture jump presses together with the modifier state; modify
  - `test/input.test.js` :: input edge behavior — cover chord ordering and reset; extend

#### Details

- **Signatures & Types**:
  ```js
  sample(scene) // returns the existing input frame plus jumpPressed:boolean and dropPressed:boolean
  reset()       // clears held keys and all queued edge inputs
  ```
- **Input rules**:
  1. Keep the existing `keydown` filter for disabled input and focused interactive elements.
  2. Prevent browser defaults for `KeyS` and `ArrowDown` while gameplay input is active.
  3. Replace the queued jump counter with a FIFO array of booleans. On a non-repeat Space keydown, before adding Space to `held`, append whether `KeyS` or `ArrowDown` is already held.
  4. `sample(scene)` consumes one array item per simulation tick. Set `jumpPressed` when an item exists; set `dropPressed` only when that consumed item is `true`. Continue reporting `jumpHeld` from the current held-key set.
  5. Pressing Space first queues `false`; pressing a down key before the next tick must not change that queued jump. Pressing S or ArrowDown first, then Space, queues `true`.
  6. Repeated Space keydown events do not enqueue extra jumps. `reset()` and `setEnabled(false)` clear queued jump items so pause, blur, or menu focus cannot trigger a delayed jump/drop.
  7. Preserve every other input field, including movement, mouse aim, attack, roll, dive, shield, and parry.

### I02. Complete platform-drop movement and save compatibility

- Related Files:
  - `src/game/sim/constants.js` :: `PLATFORM_DROP_SPEED` — define the selected initial descent speed as 80; modify
  - `src/game/sim/player.js` :: `stepPlayer`, `isStandingOn`, `isClearingPlatform` — start and finish a drop while using normal movement; modify
  - `src/game/sim/stage.js` :: `stepStage`, `restoreStageRun` — provide run-layout platforms and validate optional in-progress drop state; modify
  - `src/game/sim/platforms.js` :: `isProfiledPlatform`, `platformTopY` — read-only profile geometry helpers used to detect supports
  - `test/player.test.js` :: grounded movement and collision — extend
  - `test/stage-lifecycle.test.js` :: stage snapshot/restore — extend
  - `test/save-store.test.js` :: v5 storage serialization and parsing — extend

#### Details

- **Signatures & Types**:
  ```js
  stepPlayer(state, input, terrain, pitDeathY = C.PIT_Y, platformProfiles = [], floatingPlatforms = platformProfiles)
  // `input` uses the existing fields plus jumpPressed:boolean and dropPressed:boolean.
  // `floatingPlatforms` is the complete `run.terrainLayout.platforms` array.
  ```
- **Relevant geometry**:
  - `run.terrainLayout.platforms` contains either profiled records `{x,w,topProfile,variant}` or legacy rectangular records `{x,y,w,h}`.
  - `stageTerrain(stage, locked, run.terrainLayout)` contains the base floor, rectangular platform colliders, and arena walls. Profiled surfaces are passed separately to player movement. The base floor and walls are not entries in `run.terrainLayout.platforms`.
  - A profiled support is found with `platformTopY(platform, player.x + player.w / 2)` and matches when its top is the player's starting feet position. A rectangle supports the player when its top equals the starting feet position and the player's horizontal interval overlaps it.
- **Execution flow / logic**:
  1. At the beginning of each player step, retain only saved `dropPlatforms` indexes whose platform is still being cleared. For a profiled platform, keep ignoring it while the player's feet are at or above the deepest value in `topProfile`; remove the index after the feet pass that value. For a rectangle, keep ignoring it while `player.y < platform.y + platform.h`, except remove the index if the player is moving upward and the feet have already passed above `platform.y`.
  2. Only consider a new drop when `jumpPressed`, `dropPressed`, and `player.grounded` are all true. Find the one platform supporting the player at the starting feet/center coordinates.
  3. If a supporting platform is found, add its index in `floatingPlatforms` to `dropPlatforms`, remove only that platform object from the active rectangular and profiled collision sets for this step and subsequent steps until it is cleared, set `vy` to `C.PLATFORM_DROP_SPEED`, and set `grounded` to false. Do not emit the normal `jump` event for this branch.
  4. If no platform supports the player, take the ordinary jump path: set `vy` to `C.JUMP_SPEED`, clear `grounded` and `jumpCut`, and emit the existing `jump` event. This is required for `S`/`ArrowDown` + `Space` on the floor.
  5. Keep all other platform collision objects active. This lets the player land on a lower platform and ensures the base floor remains solid. After the selected platform is cleared, remove its index from `dropPlatforms`; remove the optional property when the list becomes empty.
  6. Continue through the existing gravity, horizontal movement, landing, and fall-mode transition. Do not add a separate animation, sound, HUD indicator, or input cooldown.
  7. In `stepStage`, pass `run.terrainLayout.platforms` as the final `floatingPlatforms` parameter while continuing to pass profiled platforms in the existing `platformProfiles` parameter. Do not change terrain layout generation or saved platform order.
- **Saved state**:
  - `player.dropPlatforms` is optional and, when present, is an array of unique nonnegative safe-integer indexes into `snapshot.terrainLayout.platforms`.
  - `snapshotStageRun` already deep-clones player fields; preserve `dropPlatforms` through this clone. In `restoreStageRun`, continue accepting existing snapshots without the optional property. If present, reject a non-array, duplicate index, negative/non-integer index, or index outside the saved platform array with the existing invalid-snapshot error path.
  - Keep save version 5. No migration or save-store schema change is needed because older v5 player snapshots omit this optional field.

### I03. Add focused regression coverage and document the control

- Related Files:
  - `test/input.test.js` :: `InputController` — verify S/ArrowDown chord capture, ordering, repeat suppression, and queue reset; extend
  - `test/player.test.js` :: `stepPlayer` — verify ordinary jump fallback, profile/rectangle drop, lower catch, floor collision, and cleanup; extend
  - `test/stage-lifecycle.test.js` :: `snapshotStageRun` / `restoreStageRun` — verify in-progress drop restoration and invalid indexes; extend
  - `test/save-store.test.js` :: `writeSave` / `loadSave` — verify v5 JSON persistence with an in-progress drop; extend
  - `README.md` :: controls table — document S/ArrowDown + Space; modify
  - `src/game/scenes/SettingsScene.js` :: controls help — document S/ArrowDown + Space without removing any existing shield/parry or other controls; modify

#### Details

- **Input test cases**:
  - S then Space reports `jumpPressed:true` and `dropPressed:true` once.
  - ArrowDown then Space reports the same.
  - Space then S/ArrowDown before sampling reports `dropPressed:false` for that queued Space press.
  - A repeated Space keydown does not enqueue another item; reset/disable removes a pending item.
- **Simulation test cases**:
  - On a raised profiled platform, the player starts descending, passes that surface, and remains able to move horizontally.
  - On a legacy rectangular platform, only the supporting rectangle is ignored until cleared.
  - A lower platform still catches the player; the floor remains solid.
  - On the floor with `dropPressed:true`, the player performs the ordinary jump and emits the existing `jump` event.
  - Airborne input does not start a second drop; after clearing the target platform the optional `dropPlatforms` field is removed.
- **Snapshot test cases**:
  - Snapshot and restore preserve a valid in-progress drop index with its saved terrain layout.
  - A snapshot with no `dropPlatforms` remains valid. Duplicate, negative, non-integer, or out-of-range indexes are rejected.
  - Writing and loading a v5 save with `player.dropPlatforms` preserves the array and accepts it through the normal storage validation path.
- **Documentation**: Say that holding `S` or `↓` and pressing `Space` drops through a platform; when no platform is underneath, the same input jumps normally. Preserve descriptions of all other controls.

## Acceptance Criteria

- [x] S/ArrowDown must be held before Space to request a drop, while the same chord on the floor performs a normal jump.
- [x] Profiled and legacy rectangular platforms can be dropped through one at a time; lower platforms and the floor still catch the player.
- [x] The descent starts at 80 px/s, continues with normal gravity and horizontal control, and returns to the existing fall state.
- [x] A Hard-mode snapshot taken during a drop resumes with the correct platform ignored until cleared; old v5 snapshots without the optional field remain valid.
- [x] README and Settings document the input without removing the existing controls.
- [x] Focused and full regression suites plus the production build pass.

## Validation

- `node --test test/input.test.js test/player.test.js test/stage-lifecycle.test.js test/save-store.test.js` — pass (48 tests).
- `npm.cmd test` — pass (221 tests).
- `npm.cmd run build` — pass; Vite reports the existing large-bundle advisory.

## Commit Message

```text
feat(gameplay): drop through arena platforms

Plan: 2026-11-22-platform-drop-through
Phase: P01-platform-drop-through
Task: T01-drop-through-platforms

- Complete down+jump input and one-way platform drop simulation.
- Preserve in-progress drops in v5 saves and document the controls.
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: d7f657b3b73ec91de347251d3327326a271d82b5
