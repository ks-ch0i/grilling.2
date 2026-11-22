# Task: T01 Defense Simulation and Save Migration

## Status: done

## Goal

Add right-button shield and Q parry behavior to the shared stage simulation, apply the confirmed half-heart defense damage rules, and preserve hard-mode run progress while migrating existing v4 saves to v5.

## Decision Summary

- At 60 simulation ticks per second: shield lasts at most 60 ticks, parry lasts 15 ticks, both cooldowns last 180 ticks, and successful defense grants the existing 45-tick invulnerability.
- Player HP remains capped at 3 and may use half-point values. Persist all defense timers; on restore, close active defense, starting the shield cooldown if a shield was active and retaining the parry cooldown already started by Q.

## Implementation

### I01. Input edges and defense state machine

- Related Files:
  - src/game/input/InputController.js :: InputController — capture right-button hold/edge and Q edge; modify
  - src/game/sim/constants.js :: simulation tick constants — define defense durations; modify
  - src/game/sim/player.js :: createPlayer, stepPlayer — store and advance defense state; modify
  - test/input.test.js :: InputController coverage — extend
  - test/defense.test.js :: defense state transitions — new

#### Details

- **Signatures & Types**:
  ~~~js
  InputController.sample(scene) -> {
    move: number,
    jumpPressed: boolean,
    dropPressed: boolean,
    jumpHeld: boolean,
    attackPressed: boolean,
    rollPressed: boolean,
    divePressed: boolean,
    shieldPressed: boolean,
    shieldHeld: boolean,
    parryPressed: boolean,
    aimX: number,
    aimY: number
  }

  stepPlayer(
    state: PlayerState,
    input: InputFrame,
    terrain: Rect[],
    pitDeathY = C.PIT_Y,
    platformProfiles = [],
    floatingPlatforms = platformProfiles
  ) -> { player: PlayerState, events: PlayerEvent[] }

  PlayerState additions:
    defenseMode: 'none' | 'shield' | 'parry'
    defenseTicksRemaining: integer
    shieldCooldownTicks: integer
    parryCooldownTicks: integer
  ~~~

- **Constants**:
  - Add SHIELD_DURATION_TICKS = 60, PARRY_WINDOW_TICKS = 15, and DEFENSE_COOLDOWN_TICKS = 180.
  - Continue using HURT_INVULNERABLE_TICKS = 45 for the post-defense invulnerability.

- **Input behavior**:
  1. Listen for right-button mousedown/up only on the game canvas. Emit shieldPressed on the down edge and shieldHeld while held. Prevent the browser context menu on the canvas.
  2. Treat KeyQ as a non-repeat press edge and expose it as parryPressed.
  3. Clear both held and queued defense input in reset(), blur, visibility loss, setEnabled(false), and destroy().
  4. Keep left mouse attack, Shift roll, E dive, Space jump/drop-through, pointer aim, and existing edge queues unchanged.

- **State transitions**:
  1. Keep locomotion in the existing player.mode field. Use defenseMode separately so movement and jumping can continue during defense.
  2. Start defense only outside roll, dive, hurt, and dead. A defense input during attack cancels attackTick/hitIds and enters the requested defense.
  3. Shield begins on shieldPressed only when cooldown is zero and no defense is active. It ends on early RMB release, after 60 active ticks, or when roll starts. On end, set shieldCooldownTicks to 180. A shield remains active after a successful block until its normal end.
  4. Q starts a 15-tick parry only when parryCooldownTicks is zero and no defense is active. Set parryCooldownTicks to 180 on Q, whether or not an attack is blocked. A successful block does not shorten the 15-tick window.
  5. Decrement timers that were already active at the start of the tick once per 60 Hz simulation tick; do not decrement a timer on the same tick it is assigned. Cooldown-zero inputs are ignored without extra effects. Do not reactivate a shield from a still-held RMB: a new mousedown edge is required after cooldown.
  6. During either defense, allow movement and jumping, ignore attack input, and allow roll. Roll cancels defense immediately; shield starts its cooldown at that end, while parry keeps its already-running cooldown.
  7. Do not overlap shield and parry. If one is active, ignore the other input without spending its cooldown. If both begin on the same tick, ignore both; if roll is pressed on that tick, roll takes precedence.
  8. Defense timers and cooldowns are player state and are included in snapshots.

- **Input edge cases to cover**:
  - Right-click on a DOM control does not activate shield; right-click on the canvas does and does not open the browser context menu.
  - Holding RMB beyond the one-second duration does not re-arm the shield. Releasing and pressing after cooldown can activate it again.
  - Q auto-repeat does not start multiple parries.
  - Defense input during roll, dive, hurt, or death is rejected. Defense during attack cancels the attack.
  - A second defense input during an active defense is ignored without consuming cooldown. Roll cancels the active defense.

### I02. Attack classification and half-heart damage

- Related Files:
  - src/game/sim/combat.js :: applyPlayerDamage — evaluate defense and chip damage; modify
  - src/game/sim/stage.js :: hurt and stepStage — supply attack category and origin; modify
  - src/game/sim/enemies.js :: stepProjectile — retain ranged impact point; modify if needed
  - src/game/sim/hazards.js :: stepHazards — include hazard kind and impact point in hit events; modify
  - test/defense.test.js :: defense category, direction, and damage rules — extend

#### Details

- **Signatures & Types**:
  ~~~js
  type DefenseCategory = 'none' | 'melee' | 'ranged'
  type ImpactOrigin = { originX: number, originY: number }

  applyPlayerDamage(
    state: PlayerState,
    source = 'contact',
    impact?: ImpactOrigin,
    defenseCategory: DefenseCategory = 'none'
  ) -> { player: PlayerState, events: DamageEvent[] }
  ~~~

- **Classification in stepStage**:
  - Ranged: all enemy projectiles, plus hazard kinds wave, acid-shot, rock, and mineral from enemies/bosses.
  - Melee: active enemyAttackRect hitboxes; forest boss hitboxes; mine boss tail/burrow hitboxes; bat contact while bat.state is attack; and mine boss body contact while attackKind is charge and state is attack.
  - None: ordinary enemy/boss body contact, acid-pool, cart, pit, pickups, and other non-attack hazards.
  - Resolve a matching active melee hitbox before ordinary body contact so a soldier/boar swing is not consumed as contact first. Only use the active bat/boss charge state as melee contact; ordinary overlaps remain undefendable.
  - Have hazard:hit events carry kind and source point so acid-pool/cart do not inherit ranged classification just because they share the hazard event channel.

- **Directional defense**:
  1. Normalize player.aim, already set from the mouse cursor each player tick.
  2. Form a normalized vector from player center to the incoming attack origin.
  3. An attack is in front if dot(player.aim, incomingVector) >= cos(60 degrees), which is a 120-degree total arc.
  4. Shield matches only ranged; parry matches only melee. Attacks from behind or outside the arc use ordinary one-HP damage.

- **Damage outcomes**:
  - Validate/retain HP values 0 through 3 in 0.5 increments; pit damage still sets HP to 0 immediately.
  - For a matching, front-facing defense, subtract exactly 0.5 HP. Do not enter hurt mode, set hurtPushTicks, or apply knockback. If HP remains above zero, set invulnerableTicks to 45 and emit shield:blocked or parry:blocked with the impact point and defense type. Keep the active defense timer running.
  - If the 0.5 damage reaches zero, use the existing dead-state and death event path.
  - An unblocked non-pit hit still subtracts 1 HP and uses the current hurt, knockback, and 45-tick invulnerability behavior.
  - Preserve the current one-HP pickup healing capped at 3 HP; a 2.5-HP player heals to 3.

- **Scenarios to cover**:
  - Front ranged hit while shielding and front melee hit while parrying each cost 0.5 HP and do not push or stun the player.
  - Behind, wrong-category, contact, pool, cart, and pit damage do not get blocked.
  - A sustained hitbox cannot repeatedly apply chip damage during the 45-tick invulnerability.
  - A half-heart hit can reduce 0.5 HP to zero and trigger the existing death path.
  - Multiple hits during one active shield remain subject to the 45-tick invulnerability; a parry remains active through all 15 ticks.

### I03. Snapshot validation and v5 save migration

- Related Files:
  - src/game/sim/stage.js :: createPlayer state initialization, snapshotStageRun, restoreStageRun — serialize and normalize defense state; modify
  - src/game/storage/saveStore.js :: currentV3Save, currentV4Save, freshSave, parseSave, record validators — migrate and validate v5; modify
  - src/game/storage/runCoordinator.js :: snapshot event cadence — read-only
  - test/stage-lifecycle.test.js :: snapshot continuation — extend
  - test/save-store.test.js :: v4/v5 migration and validation — extend

#### Details

- **Schema**:
  - Keep SAVE_KEY unchanged. The top-level save version becomes 5.
  - New player snapshots require defenseMode, defenseTicksRemaining, shieldCooldownTicks, and parryCooldownTicks. Timers are safe integers; defenseTicksRemaining is 0 in none, at most 60 for shield, and at most 15 for parry; cooldowns are 0..180.
  - HP validation accepts only half-point steps from 0 to 3. Death consistency remains mode === dead iff HP === 0.
  - Existing v5 saves strictly validate all new fields; malformed timers, modes, or half-step HP are rejected.

- **Migration and restore behavior**:
  1. Keep v1/v2 reset behavior and v3-to-v4 migration behavior.
  2. Validate v3/v4 snapshots using the legacy player shape, then add defenseMode='none', defenseTicksRemaining=0, shieldCooldownTicks=0, and parryCooldownTicks=0.
  3. Migrate a valid v4 save to v5 without changing run, records, unlocked stages, Easy progress, or settings. Preserve the old integer HP value.
  4. freshSave() creates version 5. parseSave() treats versions above 5 as unsupported and returns migrated v3/v4 data as v5.
  5. Update recordEasyDeath and recordEasyRoundCompletion to validate against current v5 save shape.
  6. On restoring a v5 run, preserve cooldown ticks. Close an active shield and set shieldCooldownTicks to 180 because RMB is not held after restore. Close an active parry window but preserve parryCooldownTicks, which began on the Q press.
  7. Keep current periodic/checkpoint save behavior; no changes to the runCoordinator cadence.

### Acceptance Criteria

- [ ] Right mouse shield and Q parry follow the exact active windows, cooldown start times, cancellation, and movement rules above.
- [ ] Defense blocks only the agreed attack categories in the front 120-degree arc.
- [ ] Successful defense applies half-heart damage without hurt-stun/knockback and with 45-tick invulnerability.
- [ ] Current and migrated saves preserve progression and validate half-heart/player defense state.
- [ ] Existing pickups, deaths, round progression, and non-defense damage remain unchanged.

### Validation

- node --test test/defense.test.js test/input.test.js test/player.test.js test/combat.test.js test/stage-lifecycle.test.js test/save-store.test.js test/mine-integration.test.js — focused simulation, input, migration, and save validation.
- npm.cmd run build — production bundle compiles.

## Commit Message

~~~text
feat(combat): add shield and parry simulation

Plan: 2026-11-22-shield-and-parry
Phase: P01-shield-parry
Task: T01-defense-simulation-and-save-migration

- Add right-button shield and timed Q parry with directional damage routing.
- Preserve v4 saves through v5 migration and store defense cooldowns.
~~~

## Progress

- [x] Implementation complete
- [x] Focused tests and production build passed
- Commit: recorded in the phase dashboard and Git history
