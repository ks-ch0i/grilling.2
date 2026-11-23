# Task: T01 Cancellable Resume Countdown

## Status: done (automated validation; manual browser unavailable)

## Implementation Baseline
- Target `origin/main` at `5ad654e`. `StageScene.resumeGame()` currently removes the pause menu, enables input, clears `paused`, and calls `audio.playMusic()` immediately.
- The current Escape handler resumes whenever paused unless `easyDecisionOpen`; preserve that Easy-mode decision guard and add countdown cancellation before normal resume.
- `mountMenu()` already appends a `.game-overlay` to `#game` and returns `hide()`, `show()`, and `remove()` methods. Keep the pause menu mounted and hidden while counting so Escape can restore it.
- `pauseGame()` suppresses sound effects but leaves music playing. `AudioManager.pauseMusic()` already exists; pause music when the countdown starts and call `playMusic(musicForRun())` only after the count completes. Keep music paused if Escape cancels back to the pause menu.

## Goal
When the player resumes from the pause menu or Escape, show `3 → 2 → 1` over approximately one second while the simulation remains frozen. Escape during the count must cancel it and restore the pause menu.

## Decision Summary
- Keep `StageScene.paused` true, gameplay input disabled, and music paused until the full 1000 ms count ends. Escape cancels; it does not skip the count.
- Reuse the existing DOM overlay layer and keep the hidden pause menu available so cancellation can restore it without rebuilding its actions.

## Implementation

### I01. Countdown timing and accessible overlay

- Related Files:
  - `src/game/ui/resumeCountdown.js` :: `RESUME_COUNTDOWN_MS`, `resumeCountdownValue`, `mountResumeCountdown` — define count boundaries and create/update/remove the overlay; new
  - `src/game/audio/resumeAudio.js` :: `unlockAudioForResume` — unlock audio synchronously in the Resume gesture without starting music; new
  - `src/game/ui/menu.js` :: existing `mountMenu` DOM contract — place the count under `#game` without blocking the playfield; read-only
  - `src/styles.css` :: `.resume-countdown-overlay`, `.resume-countdown-number` — center and style the count above the game; modify
  - `test/resume-countdown.test.js` :: count-boundary tests; new
  - `test/resume-audio.test.js` :: verify gesture-time audio unlock without starting music; new

#### Details
- **Signatures & Types**:
  ```typescript
  export const RESUME_COUNTDOWN_MS: number; // 1000
  export function resumeCountdownValue(elapsedMs: number): 3 | 2 | 1 | null;
  export function mountResumeCountdown(initialValue: 3 | 2 | 1): {
    setValue(value: 3 | 2 | 1): void;
    remove(): void;
  };
  export function unlockAudioForResume(audio: AudioManager, settings: AudioSettings): boolean;
  ```
- **Data & Schema Fields**:
  - The countdown is presentation-only and is not added to `run`, `player`, or save snapshots.
  - The DOM overlay is a `<section>` with class `resume-countdown-overlay`, `role="status"`, and `aria-live="assertive"`; it contains one text element with class `resume-countdown-number`.
- **Execution Flow / Logic**:
  1. Reject non-finite or negative elapsed values with `RangeError`; return `null` at `elapsedMs >= 1000`.
  2. Return 3 for 0–333 ms, 2 for 334–666 ms, and 1 for 667–999 ms. The overlay must not dim or cover the playfield.
  3. `mountResumeCountdown` appends the overlay under `#game`; `setValue` updates its text, and `remove` removes the root node.
- **Error & Exception Handling**:
  - `resumeCountdownValue` throws `RangeError` for invalid elapsed time. `mountResumeCountdown` uses the existing `#game` container contract; no fallback container is introduced.
- **State Transition & Return**:
  - The pure timing function returns a count value or `null` to indicate completion. Overlay methods mutate only the DOM node.

### I02. Pause-scene state transition

- Related Files:
  - `src/game/scenes/StageScene.js` :: `StageScene.create`, `update`, `pauseGame`, `resumeGame`, Escape handler, shutdown handler — own countdown lifecycle; modify
  - `src/game/audio/resumeAudio.js` :: `unlockAudioForResume` — unlock while user activation is available without starting music; new
  - `src/game/audio/AudioManager.js` :: `pauseMusic`, existing unlock and `playMusic` flow — pause only during countdown and resume after completion; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  // Existing scene entry points remain unchanged:
  update(time: number, delta: number): void;
  pauseGame(notice?: string): void;
  resumeGame(): void; // starts the countdown; does not unpause immediately
  ```
- **Data & Schema Fields**:
  - Add scene-only `resumeCountdownElapsed: number | null`, initialized to `null`; `resumeCountdownView`, initialized to `null`; and `resumeCountdownNeedsFreshFrame: boolean`, initialized to `false`.
  - Do not add countdown state to persistent run data.
- **Execution Flow / Logic**:
  1. `resumeGame()` keeps its current guards (`paused`, `easyDecisionOpen`, settings closed, visible document, focused window). Hide, but do not remove, `pauseMenu`; reset the fixed-step accumulator and input; set elapsed to 0 and `resumeCountdownNeedsFreshFrame=false`; call `audio.pauseMusic()`, then call `unlockAudioForResume(audio, settings)` synchronously within the Resume gesture. This helper must not start music. Mount the overlay with 3. Keep `paused=true` and input disabled.
  2. In the `paused` branch of `update`, advance the count only while the document is visible and the window is focused. If blur or visibility loss occurs during counting, set `resumeCountdownNeedsFreshFrame=true`; the first active frame after focus returns clears the flag and renders without advancing elapsed time, so its possibly large `delta` is discarded. Update the digit on later active frames, render the unchanged world, and return before accumulating or running simulation ticks.
  3. When the helper returns `null` at 1000 ms, remove the count overlay and pause menu, reset input/accumulator, enable input, set `paused=false`, clear `resumeCountdownNeedsFreshFrame` and SFX suppression, and call `audio.playMusic(musicForRun())`. Do not retry `unlock()` outside the Resume gesture; a failed unlock can be retried by a later user gesture.
  4. Escape while `resumeCountdownElapsed !== null` cancels the count, removes its overlay, sets elapsed to `null` and `resumeCountdownNeedsFreshFrame=false`, resets input/accumulator, and calls `pauseMenu.show()`. Keep the game paused, input disabled, and music paused. Escape while paused without an active count continues to call `resumeGame()`; Escape while playing continues to call `pauseGame()`.
  5. `onBlur` and the hidden-document handler mark the active count as requiring a fresh focused frame. Scene shutdown removes the count overlay and clears countdown state.
- **Error & Exception Handling**:
  - Count updates occur only while paused and visible/focused. Do not consume a long hidden/blurred interval from the first `delta` after returning. A cancelled or completed count sets elapsed state back to `null`; duplicate overlay roots are not allowed.
- **State Transition & Return**:
  - Paused → counting (still paused) → playing after 1000 ms; counting → paused menu on Escape. No simulation tick or audio resume occurs during counting.

## Acceptance Criteria
- [x] Countdown helper and overlay show 3, 2, and 1 across a 1000 ms interval.
- [x] Stage remains paused, simulation/input stay frozen, and music starts only after count completion.
- [x] Escape cancels to the existing pause menu; a later Resume starts from 3.
- [x] Music remains paused during counting and cancellation; audio unlock starts synchronously in the Resume gesture.
- [x] Focus/visibility recovery discards the first active frame delta; shutdown removes the overlay.

## Validation
- `node --test test/resume-countdown.test.js test/resume-audio.test.js` — count boundaries, invalid elapsed input, completion boundary, and gesture-time audio unlock pass.
- `npm run build` — Vite production build completes successfully.
- Manual browser check — not run because the available browser and native pipe connections failed (`browser access host is unavailable`; native pipe unavailable). Behavior is covered by code review plus unit/build checks, but is not visually confirmed in a browser.

## Commit Message
```text
feat(pause): add cancellable resume countdown

Plan: 2026-11-20-gameplay-round-safety
Phase: P01-gameplay-safety-and-controls
Task: T01-resume-countdown

- Show 3-2-1 for one second before simulation resumes
- Keep Escape cancellation in the paused state
```

## Progress
- [x] 구현 완료
- [x] 자동 검증 통과 (`node --test test/resume-countdown.test.js test/resume-audio.test.js`, `npm run build`, `git diff --check`)
- [ ] 수동 브라우저 확인 (사용 가능한 browser/native pipe 연결 불가)
- review: no definite correctness issues; audio unlock remains inside Resume gesture
- commit: pending
