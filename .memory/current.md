# Current Context

## Previous Completed Plan
[Irregular Platforms, Charge Attacks, and Root Targeting](./plans/2026-11-17-irregular-platforms-and-charge-attacks.md) is complete.
- T01 and its saved-rectangle compatibility fix, T02 art/rendering, T03 charge behavior, and T04 root targeting are implemented and committed.
- T04 focused validation passed: 27 tests, production build, and `git diff --check`. The build retains a Vite warning for a 1.49 MB minified JavaScript chunk.
- T04 commit: `76d4eff`.

## Earlier Completed Plan
[Randomized Terrain, Piercing Attacks, and Worm Acid](./plans/2026-11-17-randomized-terrain-and-worm-acid.md) is complete.
- Its focused validations and production builds passed. Manual browser QA was unavailable for T02/T04; the prior pointer records the HTTP smoke and automated presentation checks used instead.

## Active Plan
[Camera Framing and Motion Decision](./plans/2026-11-16-camera-framing-decision.md)

## Active Phase
[P01 Camera Framing Decision](./phases/2026-11-16-camera-framing-decision/P01-camera-framing-decision/phase.md)

## Active Task
[T02 Implement Blended Camera Framing](./phases/2026-11-16-camera-framing-decision/P01-camera-framing-decision/T02-implement-blended-camera-framing.md)

## Status
- Previous plan, Title Screen Background and Text Menu, is complete; T01 was committed as `4680fe3`.
- Camera T01 decision is complete and committed as a separate planning task; T02 implements the selected camera behavior.
- Current stage definitions are 640×360, the same as the internal viewport. The older dead-zone decision's 11520px stage-width note is stale relative to the current Forest and Mine stage files.

## Queued Plan
None.

## Next Step
Implement the selected 1.20× blended camera framing and unzoomed HUD for both stages, then run focused tests/build and inspect gameplay.
