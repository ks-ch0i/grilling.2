# Camera Framing Decision

## Decision
- Confirmed: 2026-11-19.
- Select the character-focused camera (Option A) at 1.20× zoom.
- Apply throughout every round of both Forest and Mine stages, including boss rounds and introductions.
- Blend three framing signals equally when a boss is active: player center, a movement-direction look-ahead point, and the midpoint between player and boss. When no boss is active, average player center and look-ahead equally.
- Derive look-ahead from normalized player velocity. Use 60 world pixels as an initial implementation value because the user requested equal blending but did not specify a distance; standing still makes it coincide with the player center.
- Smooth toward the target with a 0.12 interpolation factor and preserve integer scroll alignment.
- Keep the camera view inside the 640×360 stage. At 1.20×, the visible area is about 533.33×300 world pixels, allowing top-left view movement up to about 106.67×60 pixels.
- Keep screen-space HUD, messages, blackouts and boss direction indicators at the original 640×360 scale using a separate unzoomed HUD camera.
- Replace the old dead-zone target behavior; preserve the existing gameplay and parallax behavior otherwise.

## Rationale
The equal blend combines readable player tracking, direction anticipation and boss awareness without switching abruptly between camera modes. Stage bounds avoid exposing empty space, while the secondary camera prevents HUD enlargement.

## Follow-up
Implement and verify the behavior in `T02-implement-blended-camera-framing.md`.
