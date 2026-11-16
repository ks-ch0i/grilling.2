# Task: T04 Round Save and Records

## Status: pending

## Goal
Persist the new round run without carrying forward legacy progression data. Keep continue/reload recovery deterministic and preserve fastest-time stage records with their associated death counts.

## Decision Summary
- Start the round-based version with fresh records, unlocks, settings, and run state.
- Save the active round and random state so reload resumes the same encounter.
- Keep elapsed time across deaths within one stage attempt; add one death and restart at round 1.
- Track fastest clear time per stage and show the deaths from that record.
- Start a fresh death count when a cleared stage is retried or a new stage begins.

## Implementation

### I01. Version the save shape and reset legacy saves
- Related Files:
  - `src/game/storage/saveStore.js` :: save schema, validation, fresh data, completion records :: modify
  - `test/save-store.test.js` :: version reset and record behavior :: update
- Data & Schema Fields:
  - Bump the save data schema from version 2 to version 3.
  - Add/validate round and PRNG fields in active run snapshots through the T02 snapshot contract.
  - Keep current per-stage recent and best result shape, adding best-record deaths if not already stored with the best time.
- Execution Flow / Logic:
  1. Validate the stored envelope before resetting it.
  2. When a structurally valid version-2 save is found, return a completely fresh version-3 save and mark it migrated so the store persists the reset.
  3. Do not copy old records, unlocks, settings, or run progress into version 3.
  4. Preserve current behavior for malformed and future-version data; do not misclassify those as a valid legacy save.
  5. Update completion recording so a faster result replaces both best time and its paired death count. A slower result does not replace either best field.

### I02. Preserve the attempt lifecycle and reload recovery
- Related Files:
  - `src/game/storage/runCoordinator.js` :: round checkpoints, stage transitions, attempt lifecycle :: modify
  - `src/game/storage/reloadRecovery.js` :: active run recovery :: modify only if snapshot contract requires it
  - `test/run-coordinator.test.js` :: death, round clear, completion, and retry cases :: update
  - `test/reload-recovery.test.js` :: round and PRNG restoration :: update
  - `test/menu-state.test.js` :: fresh retry and next-stage run creation :: update if affected
- Details:
  - Persist the active round, spawned encounter, current boss sequence, elapsed ticks, deaths, and random state in the run snapshot.
  - Flush a checkpoint after round transitions and stage completion in addition to existing periodic and pickup/death checkpoints.
  - On death, restart the combat state at round 1, increment deaths once, and carry forward elapsed ticks.
  - On Forest clear and Next Stage, create a fresh Mine run with time and deaths starting at zero.
  - On Retry from a clear result, create a fresh run for that stage with time and deaths starting at zero.
  - Keep reload recovery on the saved round and encounter rather than generating a new random wave.

## Acceptance Criteria
- [ ] A valid version-2 save loads as a fully fresh version-3 save and is persisted as reset data.
- [ ] Old records, unlocks, settings, and active progress do not enter the new save.
- [ ] Malformed or future-version saves retain the existing safe handling.
- [ ] Faster times replace best time and paired deaths; slower times preserve both.
- [ ] Death restart preserves stage elapsed time and adds one death.
- [ ] Reload restores the same round, enemies, boss sequence, and next random result.
- [ ] Next Stage and Retry create new attempts with fresh elapsed time and deaths.

## Validation
- Planned: `node --test test/save-store.test.js test/run-coordinator.test.js test/reload-recovery.test.js test/menu-state.test.js`
- Planned: `npm run build`
- Do not run validation during the planning phase.

## Dependencies
- Uses T02's round snapshot fields and T05's Next Stage/Retry actions.
- Save and recovery contracts should be agreed before T05 wires the buttons.

## Commit Message
```text
feat(storage): reset legacy saves for round progression

Plan: 2026-11-16-round-based-progression
Phase: P01-round-based-gameplay
Task: T04-round-save-and-records
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
