# Task: T02 Remap Controls and Update Guides

## Status: done

## Goal
Make the physical inputs unambiguous: right mouse press queues parry, Q press-and-hold controls the ranged shield, and left mouse remains the contextual sword action decided in T01. Remove the E-key dive binding and make the settings and README instructions match the runtime.

## Decision Summary
- Preserve the existing shield behavior while changing its input from right mouse to Q: a keydown starts it, holding Q sustains it, keyup ends it, and the existing 60-tick duration/180-tick cooldown rules remain in simulation.
- Right mouse becomes an edge-triggered parry press. Left mouse remains attackPressed; T01 decides whether it means an air swing or an eligible dive. E has no combat action.

## Implementation

### I01. InputController physical-to-logical mapping

- Related Files:
  - src/game/input/InputController.js :: InputController.constructor, sample, reset — modify; translate DOM input edges and held state.
  - test/input.test.js :: InputController event fixtures — modify; verify the new mapping and edge behavior.
  - src/game/sim/player.js :: stepPlayer — read-only; consumes attackPressed, shieldPressed, shieldHeld, and parryPressed.

#### Details
- **Signatures & Types**:
  ~~~text
  new InputController(target = window, canvas = null)
  InputController.sample(scene) -> InputFrame
  InputController.reset() -> void
  ~~~
- **Data & Schema Fields**:
  - Keep InputController.queue keys attack, roll, shield, and parry. Remove the unused dive queue and stop returning divePressed from sample().
  - InputFrame retains move, jumpPressed, dropPressed, jumpHeld, attackPressed, rollPressed, shieldPressed, shieldHeld, parryPressed, aimX, and aimY.
  - Track KeyQ in held alongside other held codes. shieldHeld is true exactly while KeyQ is down. shieldPressed is a one-sample edge from the initial KeyQ keydown; key-repeat events do not queue more edges.
  - Track Mouse2 in held to suppress duplicate mousedown events. The initial canvas right-mousedown queues parry; mouseup clears Mouse2. Right mouse must not set shieldPressed or shieldHeld.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Keep the current enabled, interactive-DOM-target, and canvas-only mouse filters. Keep pointer-to-world conversion and canvas contextmenu suppression.
  2. Keydown: Map ShiftLeft/ShiftRight to roll and KeyQ to shield. Keep KeyQ in the preventDefault gameplay-key list. Remove KeyE from the action map and preventDefault list so E has no game action and is not unnecessarily captured.
  3. Mouse down: Button 0 continues queuing attack and updating aim. Button 2 queues parry, stores Mouse2 as held only for duplicate-edge detection, updates aim, and returns without queuing shield.
  4. Sampling: Consume at most one queued edge per sample. Set shieldHeld from held.has('KeyQ'), parryPressed from the parry queue, and attackPressed from the left-mouse queue. Do not expose divePressed.
  5. Reset & Return: setEnabled(false), blur, visibilitychange, and destroy continue clearing queued and held input. Keyup clears KeyQ; mouseup clears Mouse0/Mouse2.
- **Regression Cases**:
  - Q initial keydown returns shieldPressed=true and shieldHeld=true; repeats do not create another press; next sample returns shieldPressed=false while shieldHeld remains true; keyup clears shieldHeld.
  - Right-mousedown on the canvas returns parryPressed=true and no shield input; duplicate mousedown while Mouse2 is held is ignored; mouseup allows a fresh parry edge.
  - Right-mousedown outside the canvas and inputs on buttons/inputs remain ignored. Context menu remains suppressed on the canvas.
  - Left-click continues to queue attack and update aim. E does not queue dive and no divePressed field is returned.
  - Blur and disabling input clear Q held state and all queued edges.

### I02. In-game and README control descriptions

- Related Files:
  - src/game/scenes/SettingsScene.js :: SettingsScene.create — modify; displays in-game control and defense guidance.
  - README.md :: 조작 table and 방어 note — modify; documents the same binding contract for players.
  - src/game/sim/constants.js :: timing values — read-only; source of 60 ticks/second, 37 parry ticks, 23 perfect ticks, and 30 dive-unlock ticks.

#### Details
- Replace the current SettingsScene control line that says left mouse attacks and E performs 내려베기:
  - State that left mouse performs a normal sword attack on the ground.
  - State that an airborne left-click before 30 ticks is a normal air swing; after 30 airborne ticks, when the dive is ready, it performs 내려찍기.
  - Remove E as a gameplay binding.
- Replace the current defense line and README rows:
  - Q: hold for ranged 방패, maximum 1 second; release/end starts a 3-second cooldown.
  - Right mouse: melee 패링; total valid time 37 ticks (about 0.617 seconds), with the first 23 ticks (about 0.383 seconds) marked 퍼펙트; cooldown starts on input and lasts 3 seconds.
  - Describe the 0.382/0.618-second wording as rounded labels if shown; the simulation uses integer ticks.
  - Preserve the existing note that movement and jumping remain available during defense and starting a roll cancels the active defense.
- Do not change menu layout, add a new help screen, or alter any attack timing.

### I03. Input regression validation

- Related Files:
  - test/input.test.js :: right mouse shield/Q parry test — modify; replace with right mouse parry/Q held shield assertions.

#### Details
- Update the existing test named “right mouse shield and Q parry are edge input that disabling clears” to assert the new binding names and held behavior in I01.
- Keep the existing Target event fixture, canvas dimensions, camera fixture, and input.destroy() cleanup pattern.
- Keep the existing generic input tests for key repeat, pointer aim, interactive elements, drop-through modifier capture, and reset behavior.

## Acceptance Criteria
- [ ] Right-click only emits parryPressed; Q emits shieldPressed once and shieldHeld while down; left-click still emits attackPressed; E has no dive mapping.
- [ ] SettingsScene and README agree on every control, duration, and conditional left-click behavior.
- [ ] Canvas filtering, UI event filtering, pointer aim, contextmenu prevention, and blur/reset behavior remain unchanged.

## Validation
- node --test test/input.test.js — all input edge, held-state, and reset assertions pass.
- npm run build — Vite production build succeeds.
- These commands are planned only; do not run them during memory-plan.

## Commit Message
~~~text
feat(input): remap defense and contextual sword controls

Plan: 2026-11-24-parry-and-dive-controls
Phase: P01-parry-and-dive-controls
Task: T02-control-remap-and-guides

- Bind right-click parry and held-Q ranged shield
- Update settings and README control guidance
~~~

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
