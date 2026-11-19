# Plan: Camera Framing and Motion Decision

## Goal
Implement the user's selected blended, zoomed camera behavior in the Forest and Mine stages.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `complete` | Record the selected direction and implement the blended zoomed framing. | [P01](../phases/2026-11-16-camera-framing-decision/P01-camera-framing-decision/phase.md) |

## Decision
- Option A selected at 1.20× zoom for all rounds in both Forest and Mine.
- Equally blend player tracking, 60px movement-direction look-ahead, and the player-boss midpoint while a boss is active.
- Smooth with factor 0.12 and constrain the visible view to stage bounds. Keep the HUD at native screen scale.

## Scope Notes
- This plan is separate from [round-based progression](./2026-11-16-round-based-progression.md).
- Replace the obsolete dead-zone helper and its tests as part of implementation.
- The round-based plan is complete. Camera behavior is tracked in T02.

## Completion
- T01 decision record: `af095d7`.
- T02 implementation: `56a575e`; focused camera tests, production build, and 640×360 Forest/Mine visual inspection completed.
