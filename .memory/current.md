# Current Context

## Active Plan
[Round-Based Game Progression](./plans/2026-11-16-round-based-progression.md)

## Active Phase
[P01 Round-Based Gameplay](./phases/2026-11-16-round-based-progression/P01-round-based-gameplay/phase.md)

## Active Task
[T05 Stage Clear Result UI](./phases/2026-11-16-round-based-progression/P01-round-based-gameplay/T05-stage-clear-result-ui.md)

## Status
- Plan: in progress; T01 arena data, T02 round simulation, T03 round HUD, and T04 save lifecycle are implemented and validated.
- Phase: 4/5 tasks complete; T05 is active.
- Decisions: `.memory/decisions/2026-11-16-round-based-gameplay.md`.
- Death resets the stage to round 1 and increments deaths; elapsed time continues across deaths.
- Each stage has 8 rounds. Forest advances to Mine only through the result screen; Mine is final.
- Legacy valid saves reset to a fresh schema; round and deterministic random state must survive reload.
- Camera framing and any dead-zone helper/test cleanup are tracked separately. Keep that direction open; it is not part of the round plan.

## Queued Plan
[Camera Framing and Motion Decision](./plans/2026-11-16-camera-framing-decision.md) — pending; compare the two options before changing camera code.

## Next Step
Implement the Forest/Mine clear result screen, paired best/death records, and Home/Next/Retry actions from T05. Keep the camera-framing decision queued separately.
