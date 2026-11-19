# Task: T01 Compare Camera Framing Options

## Status: done

## Goal
Record the user's camera framing choice and measurable constraints before camera implementation or dead-zone cleanup begins.

## Decision Summary
- Compare only the two options the user named: modest character zoom with more expressive camera movement, or a fixed view that shows the whole boss room.
- The user selected Option A, 1.20× zoom, for both Forest and Mine throughout all rounds.
- Blend player follow, movement-direction look-ahead and player-boss midpoint equally when a boss is active; otherwise blend player center and look-ahead equally.
- Use 60 world pixels of velocity-direction look-ahead, 0.12 easing, stage-bounded camera movement and a separate unzoomed HUD camera.
- Implementation is specified in T02; no production code was changed in T01.

## Implementation

### I01. Present the two camera concepts and collect the decision
- Related Files:
  - `.memory/decisions/2026-11-12-camera-deadzone.md` :: current dead-zone behavior and constraints :: read-only
  - `.memory/plans/2026-11-16-round-based-progression.md` :: planned fixed arena and stage context :: read-only
  - `.memory/decisions/2026-11-16-camera-framing.md` :: selected camera direction and accepted settings :: new
- Details:
  - Present Option A as a character-focused view with a modest zoom and more expressive camera movement.
  - Present Option B as a fixed camera view that keeps the entire boss room visible.
  - Compare character size, boss and attack readability, visibility of room boundaries, camera movement during combat, and edge clipping.
  - Ask the user to choose A or B. Do not recommend one unless the user asks for a recommendation.
  - For Option A, collect the acceptable zoom amount, movement style, and movement limits. For Option B, confirm the full-room framing and that the camera does not follow combat movement.
  - Confirm whether the selected framing applies throughout each stage or only during boss rounds. Do not infer this scope.
  - Write the selection and accepted values to `.memory/decisions/2026-11-16-camera-framing.md`. If the user defers the choice, leave the decision open and do not mark this task done.
  - After a choice is recorded, extend this plan with a separate implementation task that uses the exact accepted values. Include dead-zone helper/test removal only if the selected implementation no longer uses them.

### I02. Keep camera behavior intact until the decision is recorded
- Related Files:
  - `src/game/render/cameraDeadZone.js` :: current camera target helper :: read-only
  - `test/camera-deadzone.test.js` :: current helper behavior coverage :: read-only
- Details:
  - Do not edit or delete these files while the framing choice is open.
  - Keep this plan independent from the fixed-camera work in the round-based plan.

## Acceptance Criteria
- [x] Both options were presented using the comparison points in I01.
- [x] The user selected Option A and specified zoom, movement style, and stage scope.
- [x] The decision record contains the selected option, scope, and measurable camera constraints.
- [x] A follow-up implementation task was added after the choice was recorded.
- [x] No production camera code or helper tests were changed in this decision task.

## Validation
- User review of `.memory/decisions/2026-11-16-camera-framing.md` — one option and its settings are explicit, or the record remains open.
- No automated tests; this task does not change code.

## Commit Message
```text
docs(memory): record camera framing decision

Plan: 2026-11-16-camera-framing-decision
Phase: P01-camera-framing-decision
Task: T01-compare-camera-framing-options

- Record the selected zoom, blended motion and stage scope.
- Define the follow-up implementation task.
```

## Progress
- [x] Decision recorded
- [x] Implementation blueprint added after decision
- commit: pending
