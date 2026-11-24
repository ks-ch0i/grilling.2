# Task: T01 Parry and Airtime-Gated Dive Simulation

## Status: done

## Goal
Change the deterministic player simulation so a parry hit is classified by its remaining timer, left-click starts a downward strike only after 30 airborne ticks when the dive is ready, and existing local/cloud saves migrate to the new player-state shape without losing progress.

## Decision Summary
- The parry window is 37 ticks: remaining values 37 through 15 are perfect (23 ticks); values 14 through 1 are regular (14 ticks). A perfect parry costs 0 HP; a regular parry costs 0.5 HP. Both retain the existing 60-tick post-block protection and 180-tick cooldown-from-press.
- Air time is an integer counter capped at 30. Left-click during air time 0–29 is a normal sword attack; at 30 or later it starts the downward strike when the existing dive rules permit. No glide mode or key is added.
- Since player snapshots have strict field validation, add the counter to the snapshot shape and migrate save version 6 to version 7 with old air-time initialized to zero.

## Implementation

### I01. Tick constants, player air-time, and contextual attack action

- Related Files:
  - src/game/sim/constants.js :: TICK_RATE, PARRY_WINDOW_TICKS, DIVE_COOLDOWN — modify; central tick and combat durations.
  - src/game/sim/player.js :: createPlayer, stepPlayer, canStartAttack — modify; deterministic player state and transitions.
  - src/game/sim/stage.js :: restoreStageRun, snapshotStageRun — modify; strict run snapshot validation and restore normalization.
  - test/player.test.js :: player movement and attack/dive tests — modify; assert the new simulation behavior.

#### Details
- **Signatures & Types**:
  ~~~text
  createPlayer(x = 120, y = 276) -> Player
  stepPlayer(state, input, terrain, pitDeathY = C.PIT_Y, platformProfiles = [], floatingPlatforms = platformProfiles) -> { player, events, pushCompleted? }
  canStartAttack(player) -> boolean
  ~~~
- **Data & Schema Fields**:
  - Add PARRY_PERFECT_TICKS = 23 and AIR_DIVE_UNLOCK_TICKS = 30 to constants.js. Set PARRY_WINDOW_TICKS = 37. Keep TICK_RATE = 60, DIVE_COOLDOWN = 36, DIVE_LANDING_PROTECTION_TICKS = 15, SHIELD_DURATION_TICKS = 60, DEFENSE_COOLDOWN_TICKS = 180, and HURT_INVULNERABLE_TICKS = 60.
  - Add Player.airborneTicks as a non-null integer with default 0 and range 0–30. This is persisted with player snapshots. It counts completed ticks for the current uninterrupted airborne interval and saturates at 30.
  - InputFrame.attackPressed remains an edge-triggered boolean. stepPlayer must no longer require input.divePressed for the downward strike; T02 will remove the E-key mapping.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Preserve the current early returns for dead/pit states and the current mode restrictions: no attack or dive start in hurt, roll, or active dive; no sword action while a shield or parry is active.
  2. Core Processing — Air timer: After resolving movement and landing for the tick, set airborneTicks to 0 if p.grounded. Otherwise increment it by one, capped at AIR_DIVE_UNLOCK_TICKS. Count walking/falling off an edge and other non-grounded simulation ticks as airborne time. A jump started on a tick counts as the first completed airborne tick at that tick's end. At the start of a later input tick, a value of 30 means the full 30 ticks have elapsed.
  3. Core Processing — Left-click priority: Keep roll priority unchanged. For attackPressed while defenseMode is none and the action is not blocked by hurt/roll/dive, start the downward strike first only when the player is airborne, airborneTicks >= 30, diveUsed is false, and diveCooldown is zero. Starting it sets mode to dive, sets diveUsed true, and clears attackTick and hitIds exactly as the existing divePressed branch does; it may interrupt an active normal attack. If any dive eligibility condition fails, attempt the existing normal attack through canStartAttack. Thus a click at 0–29 airborne ticks is an air swing; a click during dive cooldown falls back to a normal swing when the player can start one; clicks during an active attack remain unqueued when a new attack cannot start.
  4. State Transition: On landing, reset airborneTicks to 0. Keep existing dive-impact event, 15-tick landing protection, 36-tick dive cooldown, and transition from dive to idle. The next fresh attackPressed on the following simulation tick can start a normal attack because diveCooldown does not gate canStartAttack.
  5. Error & Exception Handling: No new exceptions. Keep all counters integer and bounded so snapshot validation can reject negative, fractional, or over-limit values.
- **Regression Cases**:
  - Ground click starts a normal attack.
  - Air click at 29 completed ticks starts a normal attack; at 30 completed ticks starts a dive when ready.
  - A click at 30+ ticks falls back to a normal attack if diveCooldown > 0 or diveUsed is true and a normal attack can start.
  - One dive is allowed per airborne interval; landing resets the interval, but the existing cooldown still blocks a second dive.
  - A new click immediately after dive landing starts a normal attack even while diveCooldown remains positive.
  - Existing attack cancellation, defense gating, roll precedence, dive landing wave, and landing protection remain intact.

### I02. Perfect/regular damage classification

- Related Files:
  - src/game/sim/combat.js :: applyPlayerDamage — modify; classifies a successful melee parry.
  - src/game/sim/player.js :: defense timer start/decrement — modify only if needed to preserve the specified 37 active ticks.
  - test/defense.test.js :: parry result and stage-routing tests — modify; verify perfect and regular results at their boundaries.

#### Details
- **Signatures & Types**:
  ~~~text
  applyPlayerDamage(state, source = 'contact', impact = undefined, defenseCategory = 'none') -> { player, events }
  ~~~
- **Data & Schema Fields**:
  - Do not add a second parry clock. Use defenseMode and defenseTicksRemaining. Given a 37-tick window, a successful front-facing melee block is perfect when defenseTicksRemaining >= 15 (23 values: 37–15); it is regular when defenseTicksRemaining is 1–14.
  - Perfect success emits parry:perfect. Regular success continues to emit parry:blocked. Keep event fields defense, source, originX, and originY.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Apply the perfect/regular split only after the existing defense-category, source-not-pit, and inFront conditions have established a blocked parry. Wrong-category attacks, rear attacks, pit damage, and inactive/expired parries remain unblocked.
  2. Core Processing: For parry:perfect, subtract zero HP. For parry:blocked, subtract 0.5 HP. Keep shield blocks at the existing 0.5 HP cost. For either successful parry, set invulnerableTicks to HURT_INVULNERABLE_TICKS (60), do not apply hurt mode or knockback, and retain the parry window's remaining ticks.
  3. State Transition & Return: Emit one event for the successful block. A perfect block must not emit a regular parry:blocked event as well. Apply the existing death transition only when HP reaches zero from a non-perfect hit.
  4. Boundary: stepPlayer starts a new parry at 37 ticks; StageScene resolves enemy attacks after stepPlayer on that simulation tick, so that same-tick hit is perfect. Subsequent frames decrement first. The last perfect remaining value is 15; 14 is the first regular value.
- **Regression Cases**:
  - Perfect at remaining 37 and 15: no HP loss, parry:perfect, no hurt/knockback, 60 invulnerability ticks.
  - Regular at remaining 14 and 1: 0.5 HP loss, parry:blocked, no hurt/knockback, 60 invulnerability ticks.
  - Expired timer, rear attack, ranged-category attack, ordinary contact, and pit remain outside the perfect parry.

### I03. Snapshot shape and save version 7 migration

- Related Files:
  - src/game/sim/stage.js :: snapshotStageRun, restoreStageRun — modify; add legacyAirborne normalization and range validation.
  - src/game/storage/saveStore.js :: currentV6Save, currentSnapshot, migrateV6Save, currentV7Save, freshSave, parseSave, cloud-save helpers — modify; version local/cloud saves.
  - test/save-store.test.js :: version, migration, and snapshot compatibility tests — modify.

#### Details
- **Signatures & Types**:
  ~~~text
  snapshotStageRun(run) -> serializable run snapshot
  restoreStageRun(stage, snapshot, { legacyDefense = false, legacyAirborne = false } = {}) -> restored run
  freshSave() -> version-7 save
  parseSave(raw) -> { ok, save, migrated? } | { ok: false, reason }
  ~~~
- **Data & Schema Fields**:
  - New player snapshots contain airborneTicks: integer 0–30. stage.js already derives the expected player field list from createRunState and strictly compares field names and types; add airborneTicks to createPlayer and validate its timer range.
  - Current save version is 6. Make version 7 current. Current v6 player snapshots have no airborneTicks; retain a v6 validator and add a v7 validator.
  - Add legacyAirborne to restoreStageRun options. When true and the saved player lacks airborneTicks, set airborneTicks to 0 before strict player-shape validation. Never overwrite a present invalid airborneTicks value.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Keep version 6 readable as a legacy format. V7 snapshots require airborneTicks; reject non-integer, negative, or >30 values. Keep current save key and cloud payload fields unchanged except version/run schema.
  2. Core Processing: Add currentSnapshot support for legacyDefense and legacyAirborne options. V3/V4 validators pass both flags because their player state lacks defense and air-time fields. V5/V6 validators pass legacyAirborne only. Current V7 validation passes neither.
  3. Migration: Keep existing v3→v5→v6 and v4→v5→v6 transformations, then pass the result through migrateV6Save to create v7. Route v5 through v6 then v7; route v6 directly through v7. migrateV6Save must add airborneTicks: 0 by restoring with legacyAirborne and snapshotting the run, then set version 7. V1/V2 reset behavior continues to return freshSave(), now version 7.
  4. Cloud State: CLOUD_SAVE_KEYS continues to exclude local settings. Make isValidCloudSave accept either a valid v7 snapshot or a valid v6 legacy snapshot by validating with DEFAULT_SETTINGS attached. Make toCloudSave emit v7 only. In fromCloudSave(save, localSettings), validate localSettings, then return v7 data with the supplied local settings or migrate v6 through migrateV6Save after attaching those local settings. Update unsupported-version check to reject versions >7.
  5. State Transition: Keep all unlocked stages, records, Easy counters, settings, in-progress run fields, defense cooldowns, and terrain layout intact through v6→v7 migration. Legacy airborne progress cannot be recovered, so initialize it to 0; an airborne player waits up to 30 ticks after load before a dive is available.
- **Regression Cases**:
  - Fresh save and valid current local/cloud saves use version 7 and round-trip airborneTicks.
  - A valid v6 save migrates to v7, adds airborneTicks=0, and preserves run, records, settings, Easy counters, and terrain.
  - Existing v1–v5 migration paths still produce v7 with the same preserved progress/reset behavior they had before.
  - Valid v6 local and cloud data migrate to v7; cloud migration keeps localSettings rather than introducing cloud-owned settings. Version 8 reports unsupported-version.
  - Invalid v7 air-time counters and invalid parry timers are rejected.

### I04. Simulation and migration regressions

- Related Files:
  - test/player.test.js :: player timing and attack/dive lifecycle — modify.
  - test/defense.test.js :: defense timing, damage, event, and snapshot boundaries — modify.
  - test/save-store.test.js :: current and legacy save versions — modify.

#### Details
- Add tests at the exact timer boundaries listed in I01–I03. Use the existing node:test fixtures in these files: player.test.js uses frame(overrides), tick(player,input,terrain), and a floor at y=304; defense.test.js uses frame(overrides), tick(player,input), grounded(), createStageRun(), stepStage(), and snapshotStageRun(); save-store.test.js uses freshSave(), validRun(), memory(), loadSave(), and parseSave().
- Give the new or updated focused save tests these names so the validation filters below select them: “v7 validates complete snapshots including bounded airborneTicks”, “v6 migrates to v7 and initializes airborneTicks”, and “v1-v5 migration produces v7”.
- Update existing parry assertions from 15 ticks to 37 and expected v6 save assertions to current v7; retain explicit v6 fixtures for migration.
- Do not broaden into unrelated save-store, title-screen, enemy, or full-suite failures.

## Acceptance Criteria
- [ ] Perfect and regular parry timing is exactly 23 and 14 ticks within a 37-tick window, with the specified HP outcomes and 60-tick post-block protection.
- [ ] A dive cannot start before 30 completed airborne ticks; normal air attacks, fallback when a dive is unavailable, and immediate post-landing sword attacks behave as specified.
- [ ] Player snapshots validate the bounded timer and valid v1–v6 saves continue to load through version 7 migration without losing unrelated progress.

## Validation
- node --test test/player.test.js test/defense.test.js — focused simulation and defense cases pass.
- node --test --test-name-pattern="v7 validates|v6 migrates to v7|v1-v5 migration" test/save-store.test.js — focused current-snapshot and version-migration cases pass.
- npm run build — Vite production build succeeds.
- These commands are planned only; do not run them during memory-plan.

## Commit Message
~~~text
feat(combat): add timed perfect parry and gated dive simulation

Plan: 2026-11-24-parry-and-dive-controls
Phase: P01-parry-and-dive-controls
Task: T01-parry-and-dive-simulation

- Add 23/37-tick parry outcomes and 30-tick airborne dive unlock
- Migrate strict player snapshots and saves to version 7
~~~

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
