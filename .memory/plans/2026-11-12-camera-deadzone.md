# Plan: Player Dead-Zone Camera Follow

## Goal
Replace continuous horizontal camera centering with an invisible 192×48-pixel player dead zone. Keep the camera still while the player's center is inside it; smoothly move the camera toward the nearest edge after the player exits. Support x and y movement, preserve boss-intro framing, and apply 15% background parallax vertically. The camera may scroll upward to -80 px while stage geometry and simulation coordinates remain unchanged.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | Add deterministic camera target math and connect it to the stage scene. | [P01](../phases/2026-11-12-camera-deadzone/P01-camera-follow/phase.md) |

## Scope Notes
- Both game stages use a 640×360 viewport and 11520×360 world. The player's grounded center is y=290; the selected zone is x=224..416 and y=266..314. The horizontal width was narrowed from 60% to 30%, and the vertical height from 80 px to 48 px after the user reviewed the camera response.
- The camera keeps its existing 0.12 easing and pixel rounding. Normal gameplay targets the player's actual center; remove the existing 60 px facing look-ahead.
- Boss introductions keep the existing player/boss midpoint framing. The dead-zone is invisible.
- The camera's vertical scroll range is -80..0. It can follow upward jumps but cannot pan below the original view during pit falls.
- The user asked the agent not to play the game. Validate with deterministic tests and build; report that visual feel still needs the user's play check.
