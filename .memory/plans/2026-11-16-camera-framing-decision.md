# Plan: Camera Framing and Motion Decision

## Goal
Resolve the open camera direction for round-based boss arenas and then add an implementation blueprint with the user's chosen framing and motion settings.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `pending` | Compare the two camera directions, record the user's choice, and define exact implementation settings before changing camera code. | [P01](../phases/2026-11-16-camera-framing-decision/P01-camera-framing-decision/phase.md) |

## Open Decision
- **Option A:** Zoom in modestly on the character and use more expressive camera movement.
- **Option B:** Keep the whole boss room visible and keep the camera fixed.
- No option is selected yet. Do not infer the zoom amount, camera motion, or arena framing.

## Scope Notes
- This plan is separate from [round-based progression](./2026-11-16-round-based-progression.md).
- Keep the existing dead-zone helper and tests while the camera direction remains open.
- After the user chooses, add a precise implementation task here. Update or remove the dead-zone helper and its tests only if the selected design makes them obsolete.
- This plan is queued while the round-based plan remains the active work pointer.
