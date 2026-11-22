# Plan: Platform Drop-Through

## Goal

Allow the player to descend through a raised arena platform with `S` or `ArrowDown` + `Space`, while preserving ordinary jumping, lower-platform landings, Hard-mode resume, and the existing stage layouts.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `complete` | Finish the platform-drop input, simulation, snapshot compatibility, tests, and controls text. | [P01](../phases/2026-11-22-platform-drop-through/P01-platform-drop-through/phase.md) |

## Confirmed Decisions

- See [the confirmed decision record](../decisions/2026-11-22-platform-drop-through.md).
- The user selected normal jumping when no drop-through platform is under the player.
- `S` or `ArrowDown` must be held before `Space` is pressed; a later down-key press does not change a queued jump.
- Descend through only the current non-floor platform, starting at 80 px/s. Other platforms and the floor remain collision surfaces.
- Keep the platform being cleared in the run snapshot so a Hard-mode continue can finish descending safely. Do not bump the v5 save version.

## Scope

- Finish the already-present worktree changes in `InputController`, player/stage simulation, optional snapshot validation, and the README/Settings controls text.
- Support both authored profiled platforms and legacy rectangular platforms stored in `run.terrainLayout.platforms`.
- Use the existing gravity, horizontal movement, fall pose, and ordinary jump feedback. Do not add a dedicated drop animation, sound, HUD indicator, key rebinding UI, or platform layout.
- Keep the base floor and arena walls solid. When descending through one platform, retain collisions with lower platforms so they can catch the player.
- Keep unrelated untracked `.memory/2026-11-20-*` planning documents outside this feature commit.

## Task Order

1. T01 completes and validates the input chord, drop-through collision behavior, save/restore state, and control descriptions as one cohesive change.

## Completion

- P01 completed with T01 in commit `d7f657b3b73ec91de347251d3327326a271d82b5`.
- Focused tests, full test suite, and production build passed.
