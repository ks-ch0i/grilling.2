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
- T03 implementation and production build pass. The user confirmed the heading removal, reviewed the local account row, reported its artwork overflow, then approved pushing the corrected layout. The account row is text-only at lower-left; save/sync feedback uses a transient rounded bottom-center toast. Home notices follow the 40:19 contained forest artwork bounds. The authenticated production session still needs visual confirmation after deployment.

## Next Step (IMPORTANT)
After the automatic SWA deployment, review the authenticated home at wide and narrow sizes. Confirm the text-only account/logout row is lower-left, save/sync feedback appears briefly in a rounded bottom-center toast, audio errors are lower-right, and submenu headings/keyboard focus remain intact. Then close T03.

## Suspended Plan
None.
