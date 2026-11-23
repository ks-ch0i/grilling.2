# Task: T01 Title BGM and Continuous Playback

## Status: done

## Goal

Keep BGM playing through round waits, result choices, pause and settings screens; stop only while the browser page is inactive; and play the selected title theme with a one-second transition into stage music.

## Decision Summary
- Use the user-selected CC0 loop “Whispers in the Fog” for the title screen. Attempt playback after login; if blocked, retry on the first title-screen interaction.
- Preserve current stage/boss track selection. Crossfade only when the audio URL changes, over 1000 ms; same-URL requests must not restart playback.

## Implementation

### I01. Add title music asset and source record
- Related Files:
  - `public/assets/audio/music/whispers-in-the-fog.ogg` :: selected local title-theme loop; new.
  - `public/assets/audio/music/README.md` :: source, creator, license, and attribution note; new.

#### Details
- Download from `https://opengameart.org/sites/default/files/whispers_in_the_fog.ogg`.
- Source page `https://opengameart.org/content/whispers-in-the-fog` lists creator Ruhinre, CC0, a short seamless ambient loop, and an OGG file of about 204 KB. Credit is appreciated but not required.
- Keep playback local under `public/`; do not load OpenGameArt at runtime and do not add an audio service or package dependency.
- Record the title, creator, source page, direct file URL, CC0 license, and optional-credit status in the README.

### I02. Extend the audio manager for crossfades and inactive-tab handling
- Related Files:
  - `src/game/audio/AudioManager.js` :: `MUSIC`, `AudioManager`, `getAudioManager()`; modify.
  - `src/game/audio/AudioManager.js` :: existing SFX oscillator graph; preserve.

#### Details
- **Public method behavior**:
  ```js
  // MusicName = keyof typeof MUSIC
  unlock()                                  // Promise<boolean>
  setVolumes(settings: {musicVolume?: number, sfxVolume?: number}): void
  playMusic(name: MusicName, options?: {fadeMs?: number}): boolean
  pauseMusic(): void
  resumeMusic(): void
  dispose(): void
  ```
  `playMusic()` returns false for an unknown track or unavailable/unlocked audio and true when the track request is accepted. `fadeMs` defaults to `1000`.
- Add `MUSIC.title = '/assets/audio/music/whispers-in-the-fog.ogg'`; leave existing forest/mine/boss mappings unchanged.
- Reuse two HTML audio channels created through the existing `createMusic` factory. Both loop; their target volume is governed by saved `musicVolume`.
- Track desired name, active/incoming channel, URLs, per-channel fade levels, page-inactive state, and a cancellable transition. Do not allocate channels for every request.
- On a new URL, start the incoming channel at zero volume and linearly ramp it up while ramping the outgoing channel down over 1000 ms. Pause and reset only the outgoing channel after the fade. Cancel any prior ramp on a new request and start from the current levels.
- If the requested URL is already active or fading in, preserve `currentTime`; do not reload or restart it. `setVolumes()` must scale both channels during a fade, and zero volume must remain silent.
- Separate music suspension from SFX suppression. Manual pause and result-choice state must not mark music as suspended.
- Install one `visibilitychange` listener per manager. Pause both channels when `document.hidden` is true; resume the requested track/transition when the document becomes visible and audio has been unlocked. Do not suspend music solely because the window loses focus while the tab remains visible. Remove listeners and cancel transitions in `dispose()`.
- Treat autoplay `NotAllowedError` as a pending request: retain the desired track and retry on a user gesture without showing the existing persistent `.audio-warning`. Continue reporting actual media-load/play failures through `onError`.

### I03. Apply music policy to title and gameplay scenes
- Related Files:
  - `src/game/scenes/TitleScene.js` :: `create()`, `startAudio(stageId)`, `showMain()`, and menu entry handlers; modify.
  - `src/game/scenes/StageScene.js` :: `update()`, `pauseGame()`, `resumeGame()`, `pauseEasyDecision()`, and shutdown; modify.
  - `src/game/scenes/easySession.js` :: round/death/stage result transitions; read-only unless an audio call is found.
  - `src/game/scenes/ResultScene.js` :: home/retry/next-stage actions; read-only unless track selection is required.

#### Details
- When the authenticated title scene opens, request `title` and attempt autoplay. If blocked, retry unlock/play on the first title-screen click/tap/key interaction; remove one-shot listeners after success or scene shutdown.
- If that first successful user action starts a stage directly, request the stage track as the first audible track rather than audibly starting title music first.
- `startAudio(stageId)` must unlock from the user action and request `mine` for `mine-1`, otherwise `forest`; the manager performs the crossfade.
- On return to home from gameplay/results, request `title`. Returning from records/settings to the already-open home must not restart the title loop.
- Preserve `musicForRun()` decisions. Existing boss/music changes continue, but identical mapped URLs (including forest and forest-boss) do not restart.
- Remove music-pausing calls used for manual pause, easy-mode result choices, and stage-clear result transition. The game remains paused in those states while foreground music continues.
- The audio manager alone suspends music while the document is hidden and resumes it when visible again, even if a pause/settings/result overlay remains open. Do not resume the game simulation automatically.
- Preserve SFX event mapping, SFX volume, settings persistence, and actual media-error reporting.

## Acceptance Criteria
- [x] The title theme loops from the local OGG and its source/license note is present.
- [x] Music continues through round-clear waits, easy result choices, stage result, manual pause, and settings while the page is active.
- [x] Music pauses when the document is hidden and resumes when visible again without resuming the game simulation.
- [x] Title/stage URL changes crossfade for about one second; same-URL requests do not restart.
- [x] Login-time autoplay denial falls back to first title interaction without a spurious audio warning.
- [x] Existing stage/boss selection and SFX behavior remain intact.

## Validation
- `npm run build` — Vite completes and copies the OGG into the production output.
- Manual browser walkthrough — authenticated title, autoplay fallback, title-to-forest/mine, round wait, easy result, stage result, pause/settings, tab hide/show, and return home. Confirm game simulation stays paused after the tab returns.

## Commit Message
```text
feat(audio): keep music flowing through game screens

Plan: 2026-11-23-title-audio-menu-render-fixes
Phase: P01-game-audio-render-polish
Task: T01-title-audio-lifecycle

- Add the CC0 title theme and autoplay fallback
- Crossfade music and preserve it across foreground overlays
```

## Progress
- [x] Implementation complete
- [x] Validation complete
- Build: `npm.cmd run build` passed; Vite copied `whispers-in-the-fog.ogg` to `dist`.
- Manual browser walkthrough: user confirmed the BGM scenarios work, including autoplay fallback, transitions/results/pause/settings, tab hide/show, and returning home.
- commit: pending
