# Health and Round HUD Layout

## Goal

Keep the player's health icons at their original upper-left coordinates, put the round label directly below the stage label, and use the remaining top-row space for a long boss health bar. Remove the round indicator's opaque gray background.

## Approved layout

- Keep the three health icons at their original positions: x=105, 130, 155, bottom anchor y=32, scale=0.5.
- Put the stage label at its existing position, then the round label directly below it at x=12, y=30. Use 10px gold text with a subtle dark outline and no filled background or padding.
- Place the boss name at x=190, y=10 and extend its health bar from x=190 to x=620 at y=29. This uses the top-row area to the right of the stage label and player hearts.
- Keep the HUD fixed to the screen while the camera scrolls.

## Scope and behavior

- Change only HUD presentation in `src/game/scenes/StageScene.js`.
- Preserve health values, heart frames, round text, gameplay, and save data. Adjust the boss label/bar geometry only to use the free top-row space.
- No new assets or configuration are required.

## Verification

- Run the existing build and relevant HUD or scene tests, if present.
- Inspect the stage HUD at the normal viewport to confirm the hearts are upper-right, the round label is lower-left, the background is transparent, and neither HUD item is clipped or overlaps another label.

## Review notes

- The 640×360 canvas uses a fixed-screen HUD (`setScrollFactor(0)`).
- Each heart uses a 64×64 frame at 0.5 scale, so its visible height is 32px. The original bottom anchor at y=32 keeps hearts within y=0–32.
- The boss label and bar begin at x=190, leaving a 19px gap after the right edge of the original heart row (x=171). The long bar ends at x=620, leaving 20px at the right edge.
- The round label text must fit before the first heart: use 10px monospace text at x=12; retain stroke without background fill. The current `ROUND n / 8` string plus its 2px outline ends before x=89, the first heart's left edge.
- The stage label remains at x=12, y=10; the round line at x=12, y=30 is immediately below it and does not share the heart row's horizontal range.
