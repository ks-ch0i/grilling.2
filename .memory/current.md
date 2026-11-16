# Current Context

## Active Plan
[Round-Based Game Progression](./plans/2026-11-16-round-based-progression.md)

## Active Phase
[P01 Round-Based Gameplay](./phases/2026-11-16-round-based-progression/P01-round-based-gameplay/phase.md)

## Active Task
[T03 Stage Scene and Round Presentation](./phases/2026-11-16-round-based-progression/P01-round-based-gameplay/T03-stage-scene-round-presentation.md)

## Status
- Plan: in progress; T01 arena data and T02 round simulation are implemented and validated.
- Phase: 2/5 tasks complete; T03 is active.
- Decisions: `.memory/decisions/2026-11-16-round-based-gameplay.md`.
- Death resets the stage to round 1 and increments deaths; elapsed time continues across deaths.
- Each stage has 8 rounds. Forest advances to Mine only through the result screen; Mine is final.
- Legacy valid saves reset to a fresh schema; round and deterministic random state must survive reload.
- Camera framing and any dead-zone helper/test cleanup are tracked separately. Keep that direction open; it is not part of the round plan.

## Queued Plan
[Camera Framing and Motion Decision](./plans/2026-11-16-camera-framing-decision.md) — pending; compare the two options before changing camera code.

## Next Step
Implement the round HUD and clear feedback in the stage scene from T03. Preserve the current camera behavior and keep the camera-framing decision queued separately.
