# Mine stage acceptance record

Date: 2026-11-08

Environment: Windows, Orca embedded browser (Chromium 150), `http://127.0.0.1:5173/`

Browser save after verification: restored to a fresh v2 save (`run: null`, forest unlocked, empty records).

## Automated validation

| Command | Result |
| --- | --- |
| `node --test test/mine-integration.test.js` | Passed, 4/4 integration scenarios. |
| `npm.cmd test` | Passed, 104/104 tests. |
| `npm.cmd run build` | Passed. Vite reported the existing 1,447.47 kB minified JavaScript chunk (382.51 kB gzip) warning. |

The integration scenarios cover forest-to-mine unlock and stage records, death/reset and cart zone reroll, serialization/resume at cart and boss encounter states, and one-heart damage/invulnerability across mine hazards and enemies.

## Browser evidence

Screenshots are in [`screenshots/`](./screenshots/).

| Screenshot | Observation |
| --- | --- |
| `mine-start.png` | Mine stage rendered from the development round selector. |
| `machine-boss-live.png` | Machine boss and its HUD/intro were visible in the arena. |
| `worm-boss-intro.png` | Worm boss, HUD, arena, and intro state were visible. |
| `forest-recovered-pause.png` | Reload resumed the saved forest run in the pause overlay with a recovery message. The elapsed tick count stayed at 27 while paused, then advanced by 60 after resume. |
| `mine-cart-probe.png` | Mine stage rendered, but this capture did not show a cart warning. Cart warning/active/cooldown behavior is covered by deterministic integration simulation; a live browser warning was not visually captured. |

The browser network probe found no requests with status 400 or above. The exploration and machine boss music assets returned HTTP 206, and no `.audio-warning` element appeared. Audio playback continuity, sound level, and perceived quality were not audibly verified.

One console texture-key collision was caused by the verification harness temporarily holding `Math.random` constant while creating a practice run, which made Phaser texture UUIDs collide. The browser was reloaded afterward and the game rendered normally. This is recorded as a harness artifact, not as a clean-console claim.

## Synthetic play attempt

- Start: `2026-11-08T10:14:02.454Z`; stop: `2026-11-08T10:18:43.545Z` (281,091 ms wall time, about 4:41).
- Input: synthetic repeated right movement, attack clicks, timed short/long jumps, and rolls; 1,561 clicks, 196 jumps, 119 rolls.
- Result: did not clear the forest. The persisted attempt had 2 deaths, 419 elapsed ticks, player x=934.5, 2 HP, and a dormant boss; no clear record was produced.
- This is an unsuccessful synthetic attempt, not a human clear time or a measure of human handling difficulty. The user's prior approximately 2:06 automated result remains a separate reference. Human play feel, 2–5 minute target, and actual sound remain unverified.

## Scope and remaining human check

No gameplay rules were expanded. The browser's temporary save was restored to its original fresh v2 state. A person should still play and listen to confirm handling, difficulty, and audible feedback before final acceptance.
