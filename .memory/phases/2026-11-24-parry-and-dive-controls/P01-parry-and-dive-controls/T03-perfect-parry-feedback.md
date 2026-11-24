# Task: T03 Perfect Parry Feedback

## Status: done

## Goal
Make a successful perfect parry immediately distinguishable from a regular parry by playing a separate synthesized sound and a stronger impact flash, while retaining the existing small cyan impact spark and sound for regular parries.

## Decision Summary
- T01 emits parry:perfect only for a successful hit inside the first 23 parry ticks; parry:blocked remains the regular-success event.
- Reuse the existing 12-tick cyan spark for regular success. Give perfect success a brighter, larger 18-tick white/gold spark and a separate high-pitched triangle sound. Do not add an asset or an on-screen text label.

## Implementation

### I01. Event-to-sound mapping and synthesized recipe

- Related Files:
  - src/game/audio/eventSounds.js :: EVENT_SFX — modify; map the perfect parry event.
  - src/game/audio/AudioManager.js :: SFX and AudioManager.playSfx — modify; add a recipe handled by the existing oscillator synthesizer.
  - test/audio-manager.test.js :: promised sound and event mapping tests — modify.

#### Details
- **Signatures & Types**:
  ~~~text
  EVENT_SFX[eventType: string] -> soundId | undefined
  AudioManager.playSfx(id: string) -> boolean
  ~~~
- **Data & Schema Fields**:
  - Add EVENT_SFX['parry:perfect'] = 'perfectParry'. Keep EVENT_SFX['parry:blocked'] = 'parryDeflect' and shield mapping unchanged.
  - Add SFX.perfectParry = { from: 1320, to: 660, duration: 0.22, type: 'triangle', interval: 0.18 }. This satisfies the existing bounded SFX recipe contract: positive frequencies/interval, duration >0 and <=1 second.
- **Execution Flow / Logic**:
  1. StageScene.playEventSound already looks up EVENT_SFX[event.type] and calls audio.playSfx(id); no new audio transport path is needed.
  2. Keep the existing parryDeflect recipe for regular success. Perfect success uses only perfectParry, not both sounds.
  3. Preserve mute, unlock, throttling, suppression, and voice-cap behavior in AudioManager.playSfx.

### I02. Impact flash differentiation

- Related Files:
  - src/game/scenes/StageScene.js :: playEventSound, showDefenseSpark — modify; route perfect events to a stronger spark.
  - src/game/render/PlayerView.js :: drawParryGlint usage — read-only; the existing startup glint stays as-is and is not the success cue.

#### Details
- **Data & Visual Values**:
  - Keep the regular parry spark exactly as it is: 12 ticks; shadow 0x315e78, core 0xe7ffff, accent 0x77d8df; six 2×2 rays; existing 8×8 shadow and 4×4 core.
  - For parry:perfect, use duration 18 ticks; shadow 0x80521f, core 0xffffff, accent 0xfff2a3; eight 3×3 rays; 8×8 shadow and 4×4 core; ray distance 4 + 14×progress. Use the same impact-origin clamping, depth 7, and fade model as the current spark.
- **Execution Flow / Logic**:
  1. Precondition: Call the success effect only for shield:blocked, parry:blocked, and parry:perfect. Missed parries produce no success spark.
  2. Core Processing: In showDefenseSpark, branch first on shield:blocked, then parry:perfect, otherwise regular parry. Use the perfect palette and dimensions only for the perfect event.
  3. State Transition: Store each effect in StageScene.visualEffects with its existing start/until/draw lifecycle so pause, scene shutdown, and cleanup keep using the established effect manager.
  4. Keep the regular cyan effect and existing parry startup blade glint unchanged. Do not create another normal-parry spark or a text popup.

### I03. Feedback contract validation

- Related Files:
  - test/audio-manager.test.js :: SFX recipe and EVENT_SFX mappings — modify.
  - test/defense.test.js :: parry event names — read-only after T01; T01 owns simulation event assertions.

#### Details
- Extend the bounded recipe assertion to include perfectParry and assert the exact recipe fields.
- Add a focused test named “perfect parry has a bounded synthesized recipe” asserting the exact recipe and the existing duration/frequency/interval bounds for perfectParry.
- Add a focused test named “shield, regular parry and perfect parry map to distinct cues” requiring parry:perfect → perfectParry, parry:blocked → parryDeflect, and shield:blocked → shieldClang. Keep existing tests for other event mappings intact.
- Use the current event flow in StageScene as the integration contract; the Vite build is the compilation check for the scene branch because this repository has no isolated StageScene rendering test.

## Acceptance Criteria
- [ ] A successful perfect event plays only perfectParry and shows the stronger white/gold flash.
- [ ] A regular parry event continues to play parryDeflect and shows only the existing small cyan impact spark.
- [ ] A failed parry produces neither success sound nor success flash; shield feedback remains unchanged.

## Validation
- node --test --test-name-pattern="perfect parry has a bounded synthesized recipe|shield, regular parry and perfect parry map to distinct cues" test/audio-manager.test.js — the new sound recipe and event-map assertions pass.
- npm run build — the new event branch and scene rendering code compile.
- These commands are planned only; do not run them during memory-plan.

## Commit Message
~~~text
feat(combat): distinguish perfect parry feedback

Plan: 2026-11-24-parry-and-dive-controls
Phase: P01-parry-and-dive-controls
Task: T03-perfect-parry-feedback

- Add a distinct perfect-parry sound and impact flash
- Retain regular parry feedback and shield effects
~~~

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
