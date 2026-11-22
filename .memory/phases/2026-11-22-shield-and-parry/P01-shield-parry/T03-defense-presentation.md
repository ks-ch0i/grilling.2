# Task: T03 Defense Presentation

## Status: done

## Goal

Connect the separately created defense pose sheets to the player renderer, show half-heart health, play character-level success effects and distinct defense sounds, and document the controls.

## Decision Summary

- Defense state comes from T01; the sprite files from T02 are consumed without modifying them.
- Do not add cooldown HUD/readiness indicators. The active pose and successful-block effects provide feedback; cooldown inputs stay silent.

## Implementation

### I01. Register and select defense animations

- Related Files:
  - src/game/assets/manifest.js :: ASSETS and ANIMATIONS — load the new sprite sheets; modify
  - src/game/assets/animation.js :: playerAnimation — select shield/parry clips; modify
  - public/assets/characters/hero/shield.png :: eight frames — read-only, produced by T02
  - public/assets/characters/hero/parry.png :: two frames — read-only, produced by T02
  - test/assets.test.js :: sprite sheet registration and frame counts — extend
  - test/animation-contract.test.js :: player defense animation mapping — extend

#### Details

- **Manifest entries**:
  - Register hero-shield at /assets/characters/hero/shield.png with frame size 32x32 and count 8.
  - Register hero-parry at /assets/characters/hero/parry.png with frame size 32x32 and count 2.
  - Define shield clips for direction indices 0..7 in the same order as hero-directions: right, down-right, down, down-left, left, up-left, up, up-right.
  - Define parry clips with frame 0 right-facing and frame 1 left-facing.

- **Animation selection**:
  - In playerAnimation(player), check defenseMode before attack/idle/run. For shield, choose by player.facing (0..7). For parry, choose left when player.aim.x < 0 and right otherwise; if aim.x is zero, use player.horizontalFacing.
  - Do not add a new player.mode value; locomotion and defense remain separate.
  - Ordinary idle/run/attack/jump/fall/roll/dive/hurt/dead animation mappings remain unchanged.

### I02. Render health, active poses, and defense-success effects

- Related Files:
  - src/game/render/PlayerView.js :: sync — show active pose and position the existing sword for parry; modify
  - src/game/scenes/StageScene.js :: HUD and playEventSound/showEffect — show half-hearts and character-level feedback; modify
  - test/defense.test.js :: success event presentation contract — extend

#### Details

- **Pose rendering**:
  - Shield mode renders the selected shield frame while keeping existing locomotion/movement simulation. Preserve the existing separately rendered sword.
  - Parry mode renders the right/left body frame from aim.x and rotates/places the existing sword sprite diagonally across the front; do not create a third sword asset or render two swords.
  - Keep active animation visible only while defenseMode is shield/parry. After defense ends, return to the correct locomotion animation.

- **Half-heart HUD**:
  - Preserve three heart positions and existing objects texture frames 7 (full) and 6 (empty).
  - For hp in half-point units, set floor(hp) hearts full and the remaining hearts empty. If hp has a .5 remainder, overlay the left half of frame 7 over the next empty heart using a crop; reset crop when the overlay is hidden.
  - Keep pickups at +1 HP capped at 3; do not round half HP.

- **Successful block feedback**:
  - On shield:blocked and parry:blocked, draw a brief pixel spark/flash around the player's front at the impact point; keep it character-level and do not add cooldown state to the HUD.
  - Add separate synthesized AudioManager SFX identifiers for shield clang and parry deflection and map only successful block events in EVENT_SFX. Reuse current AudioManager volume, pause, and rate-limit rules. Do not play ready or failed-cooldown sounds.
  - A block from behind/wrong category emits no defense-success event and no block sound.

### I03. Update controls documentation

- Related Files:
  - src/game/scenes/SettingsScene.js :: controls text — add shield and parry input descriptions; modify
  - README.md :: controls table — add shield and parry controls; modify

#### Details

- Document right mouse shield (hold, at most 1 second; 3-second cooldown begins when it ends) and Q parry (0.25-second window; 3-second cooldown starts on press).
- State that active defense permits movement/jumping, blocks attacks, and roll cancels it only if existing help text has room; do not add UI cooldown indicators.
- Keep current controls for A/D, Space, S/Down+Space, left mouse, Shift, E, and Escape.

### Acceptance Criteria

- [x] Shield uses eight directional frames; parry uses the left/right frames and existing diagonal sword.
- [x] Three heart icons visibly represent full, half, and empty health without changing maximum HP or pickup value.
- [x] Successful shield/parry events produce distinct character-level visual and synthesized audio effects.
- [x] No defense cooldown HUD, ready cue, or failed-input cue appears.
- [x] Settings and README accurately explain the controls and timing.

### Validation

- `node --test test/assets.test.js test/animation-contract.test.js test/audio-manager.test.js test/defense.test.js test/health-hearts.test.js` — pass (29 tests).
- `npm.cmd test` — pass (216 tests).
- `npm.cmd run build` — pass; production bundle includes both sprite sheets. Vite reports the existing large-bundle advisory.

## Adjacent Regression Fixes

- Updated the Easy round selector's save-version guard from v4 to v5. Fresh v5 saves were rejected, which made its round-choice UI fail to open.
- Updated the projectile collision expectation to include impact coordinates already emitted by the simulation for directional defense.

## Commit Message

~~~text
feat(ui): present shield and parry states

Plan: 2026-11-22-shield-and-parry
Phase: P01-shield-parry
Task: T03-defense-presentation

- Connect shield/parry poses, half-heart health, and block feedback.
- Document defense controls and add distinct synthesized sounds.
~~~

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `f5ddc02`
