# Plan: Gameplay Controls and Round Safety

## Goal
Implement the confirmed gameplay changes: resume from pause through a cancellable one-second `3 → 2 → 1` countdown; drop through current and legacy floating platforms with ArrowDown+Space; use one second of shared protection after ordinary damage; and place the already-selected round roster so player and hostile character artwork do not overlap at round starts or boss appearances, including the round-8 Worm reveal.

## Source Baseline and Execution Status
- Reconciled against `origin/main` at `5ad654e14649390d22b9af60fe26508332a3b60a` and implemented on branch `feature/gameplay-round-safety`.
- T02 platform drop-through is already implemented upstream in `d7f657b3b73ec91de347251d3327326a271d82b5` and its upstream memory plan is complete.
- T01 resume countdown, T03 shared one-second hit protection, and T04 safe hostile placement are implemented; all four phase tasks are complete. Per-task validation and limitations are recorded in the phase blueprints.

## Decisions
- [Confirmed decisions](../decisions/2026-11-20-resume-countdown-platform-drop-hit-protection.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Finish the pause countdown, one-second protection, and safe hostile placement; retain the upstream-completed platform drop-through record. | [P01](../phases/2026-11-20-gameplay-round-safety/P01-gameplay-safety-and-controls/phase.md) |
