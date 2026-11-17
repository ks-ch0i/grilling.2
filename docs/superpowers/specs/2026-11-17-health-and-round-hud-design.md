# Health and Round HUD Layout

## Goal

Move the player's health display to the upper-right area and separate the round indicator from it. Remove the round indicator's opaque gray background.

## Approved layout

- Keep the three existing health icons and their current horizontal order. Place them in the upper-right area below the boss health bar so the two HUD elements do not overlap.
- Move the round indicator to the lower-left edge of the fixed 640×360 screen HUD.
- Keep the round label's existing gold text. Remove its filled gray background and use a subtle dark text outline for contrast.
- Keep the HUD fixed to the screen while the camera scrolls.

## Scope and behavior

- Change only HUD presentation in `src/game/scenes/StageScene.js`.
- Preserve health values, heart frames, round text, boss HUD geometry, gameplay, and save data.
- No new assets or configuration are required.

## Verification

- Run the existing build and relevant HUD or scene tests, if present.
- Inspect the stage HUD at the normal viewport to confirm the hearts are upper-right, the round label is lower-left, the background is transparent, and neither HUD item is clipped or overlaps another label.

## Review notes

- The 640×360 canvas uses a fixed-screen HUD (`setScrollFactor(0)`).
- The boss health bar occupies the upper-right portion of the HUD, so the player hearts sit below it.
- The arena floor begins at y=304; position the round label near the lower-left screen edge with enough margin to remain fully visible.
