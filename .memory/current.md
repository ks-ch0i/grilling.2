# Current Context

## Active Plan
[Title Audio, Menu Layout, and Shield Rendering Fixes](./plans/2026-11-23-title-audio-menu-render-fixes.md)

## Active Phase
[P01 Game Audio and Screen Polish](./phases/2026-11-23-title-audio-menu-render-fixes/P01-game-audio-render-polish/phase.md)

## Active Task
[T03 Home Screen Layout](./phases/2026-11-23-title-audio-menu-render-fixes/P01-game-audio-render-polish/T03-home-screen-layout.md)

## Status
- T01 (title BGM and continuous playback) is committed as `bca6003`; the build passed and the user confirmed the BGM scenarios work in the browser.
- The selected title theme is bundled as a local CC0 OGG. `NotAllowedError` is treated as a pending request and retried on the first title interaction without showing an audio warning.
- T02 is committed as `16f5081`. The user confirmed the shield now appears correct in the signed-in production game; no source correction was needed because the deployed player renderer and shield asset already matched the composite-frame implementation.
- The latest successful SWA deployment workflow used `main` commit `3534c2c`. Its player render, shield animation mapping, texture manifest, and shield PNG match local source; the original report's cause was not established.
- Account status moves lower-left; the audio warning moves lower-right to avoid overlap.
- T03 was pushed as `d9c0f3c` and its automatic SWA deployment succeeded. The user reports the account row is too spread out and requests logout directly below Settings using the same menu styling. This follow-up is local and unpushed; the account name remains lower-left and sync feedback remains a transient bottom-center toast.

## Next Step (IMPORTANT)
Review the local home screen to confirm logout sits below Settings with matching menu styling, while account identity stays text-only at lower-left. If approved, publish the follow-up and confirm the authenticated production view, toast, audio warning, and submenu behavior before closing T03.

## Suspended Plan
None.
