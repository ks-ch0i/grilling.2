# Task: T01 Mode-Aware Save and Migration

## Status: done

## Goal

Move the save format from version 3 to version 4 while preserving valid Hard campaign data and introducing independent Easy unlocks, per-round records, and cumulative deaths. Provide validated pure functions for Easy progress updates and keep the complete repository test suite green by correcting the stale terrain fixture in an existing knockback test.

## Decision Summary

- A valid v3 save becomes v4 with its `run`, `unlockedStageIds`, `records`, and `settings` preserved as Hard data. Easy starts with only Forest Round 1 unlocked, no round records, and zero Easy deaths.
- Existing v1/v2 compatibility stays as-is: recognized legacy saves reset to a fresh current-version save; malformed and future-version saves remain protected from overwrite.
- Hard records keep their existing `{best,recent}` shape and fastest-time/tie behavior. Easy records use the same result shape independently for each stage and round.
- Existing simulation collision uses `run.terrainLayout` after random terrain generation. The knockback test's extra wall must be inserted in that active run layout; appending it to `stage.solids` after run creation no longer changes collision geometry.

## Implementation

### I01. Define and validate the version-4 save schema

- Related Files:
  - `src/game/storage/saveStore.js` :: `freshSave`, `parseSave`, `writeSave`, `records`, current-save validators; modify
  - `test/save-store.test.js` :: save parsing, migrations, and record tests; modify

#### Details

- **Data & Schema Fields**:
  - `SaveV4` has exactly these top-level keys: `version`, `run`, `unlockedStageIds`, `records`, `easy`, `settings`.
  - `version` is exactly `4`.
  - `run` remains `null` or the validated current stage snapshot and represents the Hard autosaved run.
  - `unlockedStageIds` remains a unique array containing `forest-1` and optional `mine-1`; it is Hard-only.
  - `records` remains a complete map for `forest-1` and `mine-1`, each `{best,recent}` where a non-null result has exactly `{elapsedTicks,deaths}` and both values are non-negative safe integers.
  - `easy` has exactly `unlockedRoundByStage`, `totalDeaths`, and `roundRecords`.
  - `easy.unlockedRoundByStage` has exactly `forest-1` and `mine-1`: Forest starts at `1`, Mine starts at `0` (locked); each value is an integer from `0` through `8`. A value `n` means rounds `1..n` are selectable.
  - `easy.totalDeaths` is a non-negative safe integer.
  - `easy.roundRecords` has exactly `forest-1` and `mine-1`; each maps string round keys `"1"` through `"8"` to `{best,recent}` using the existing result validator. Initialize every slot to `{best:null,recent:null}`.
  - No current Easy run, timer, or active mode is stored.
- **Required Signatures**:
  ```js
  // EasyProgress is a JSON-safe object with the exact fields listed above.
  function freshEasyProgress();
  export function freshSave();
  export function parseSave(raw);
  export function recordEasyDeath(save);
  export function recordEasyRoundCompletion(save, stageId, round, result);
  ```
- **Validation Contract**:
  - Add a private v4-save validator that checks exact top-level keys, exact Hard maps, the exact `easy` keys, both Easy stage keys, all eight string round keys for each stage, every record shape, and the settings shape. Reuse it in `parseSave`, `recordEasyDeath`, and `recordEasyRoundCompletion`; the update helpers must not accept partial Easy maps.
  - Both update helpers return a new `SaveV4` without mutating `save`. Throw `TypeError` for a malformed save or invalid stage/round/result. `recordEasyDeath` throws `RangeError` if `totalDeaths` is already `Number.MAX_SAFE_INTEGER` so it cannot produce an invalid save.
- **Migration Flow**:
  1. Keep the existing exact validators for v1 and v2. On recognized v1/v2 input, return `{ok:true,save:freshSave(),migrated:true}` using version 4.
  2. Add an exact v3 validator matching the current v3 keys and nested validation (`run`, Hard unlocks/records/settings). A non-null run must pass `currentSnapshot`.
  3. For valid v3, return `{ok:true,save:{version:4,run:value.run,unlockedStageIds:value.unlockedStageIds,records:value.records,easy:freshEasyProgress(),settings:value.settings},migrated:true}`. Preserve the original Hard run and data values.
  4. Reject malformed v3 as `{ok:false,reason:'invalid'}`. Reject safe integer versions above 4 as `unsupported-version`. Keep null storage behavior as a fresh v4 save.
  5. Keep `writeSave` validation-before-write and migration handling so `createAppStore` persists migrated data exactly once and does not overwrite blocked/corrupt saves.
- **Easy Update Logic**:
  - `recordEasyDeath(save)` returns a new save with `easy.totalDeaths + 1` and leaves all other fields unchanged.
  - `recordEasyRoundCompletion(save,stageId,round,result)` accepts only `forest-1` or `mine-1`, integer round `1..8`, and a valid `{elapsedTicks,deaths}` record. The stage must be unlocked (`unlockedRoundByStage[stageId] >= 1`) and the round must be at or below that stage's current unlocked maximum. Invalid or locked input throws `TypeError` and does not mutate the supplied save.
  - Set the selected round's `recent` to a copy of `result`. Set `best` to a copy only when no prior best exists or `result.elapsedTicks < best.elapsedTicks`; equal times retain the earlier best, including its paired deaths.
  - For rounds `1..7`, set that stage's unlocked maximum to `max(current,round+1)`. Forest Round 8 sets Mine's unlocked maximum to at least `1`. Mine Round 8 unlocks nothing further. Never change Hard `run`, unlocks, records, or settings.
- **Test Cases**:
  - Fresh save is exact v4 with all 16 empty Easy round-record slots and only Forest Round 1 available.
  - Valid current v3 with both stage records and an in-progress snapshot migrates and preserves each Hard field; Easy fields are fresh; `createAppStore` writes the migrated v4 once.
  - Invalid v3, malformed v1/v2, and future version remain protected and are not overwritten.
  - Easy death increments only `totalDeaths`; Easy completion writes recent, updates a faster best, preserves best on a tie, unlocks the next round, unlocks Mine after Forest 8, and does not alter Hard fields.
  - Invalid stage, locked stage/round, invalid round, result, and malformed Easy schema are rejected.

### I02. Align the deep-contact knockback test with active run terrain

- Related Files:
  - `test/knockback.test.js` :: `deep contact separates after push, while a solid wall prevents escape and damage resumes`; modify
  - `src/game/sim/stage.js` :: `stageTerrain`, `stageForRun`; read-only

#### Details

- **Cause**:
  - `createStageRun(stage)` creates a randomized `run.terrainLayout`. `stepStage` derives solid collision geometry from that saved run layout through `stageForRun`/`stageTerrain`; it uses the stage's fixed floor plus run platforms and arena walls. A test-only rectangle appended later to `world.solids` is ignored by the active run.
- **Change**:
  1. Keep the test's player/enemy overlap, 20px wall at `{x:180,y:200,w:20,h:104}`, and expected behavior.
  2. Create the run first, then add the wall rectangle to `run.terrainLayout.platforms` before the first `stepStage` call. Pass the original stage object to every simulation step; the snapshot's active terrain is the collision source.
  3. Keep assertions: the wall prevents the leftward push from moving the player from `x=200`, overlap remains, and a later hit after invulnerability expires reduces HP while the wall still blocks movement.
  4. Do not change production collision code or the expected gameplay behavior. This is a stale fixture correction, not a new collision rule.
- **Test Cases**:
  - `node --test test/knockback.test.js` passes all eight focused tests.
  - The full suite runs the same wall scenario using `run.terrainLayout` and passes without changing player, enemy, or stage simulation code.

## Acceptance Criteria

- [ ] `parseSave(JSON.stringify(v3Save))` returns a valid migrated v4 save that preserves the v3 Hard run, unlocks, records, and settings.
- [ ] A fresh v4 save permits only Easy Forest Round 1 and has all Easy records empty.
- [ ] Easy progress updates do not modify Hard fields; Easy round records follow the existing fastest-time and tie convention.
- [ ] Invalid or unsupported saves remain protected by the current no-overwrite behavior.
- [ ] The deep-contact knockback wall test uses the active saved terrain layout and passes without changing production combat behavior.

## Validation

- `node --test test/save-store.test.js` — migration, validation, and record tests pass.
- `node --test test/knockback.test.js` — existing terrain-aware wall collision test passes.
- `npm test` — full suite passes after updating v3-era fixtures/assertions to the new current version.

## Commit Message

```text
feat(save): add easy progress and mode-aware records

Plan: 2026-11-20-easy-hard-modes
Phase: P01-mode-progression
Task: T01-mode-aware-save-and-migration

- Migrate valid v3 Hard progress into the v4 save schema
- Persist Easy unlocks, per-round records, and total deaths separately
- Align the deep-contact wall fixture with active run terrain
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: recorded in the T01 implementation commit
