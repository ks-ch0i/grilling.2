# Plan: Easy and Hard Game Modes

## Goal

Keep the existing continuous Forest-to-Mine campaign as Hard mode and add Easy mode, where players choose any unlocked stage and round. Preserve the existing Hard run, unlocks, and records when migrating saves; persist Easy unlocks, per-round records, and independent death counts for each stage and round. Deliver the requested title flow, round-choice popup, clear/death choices, and timer behavior without changing combat balance.

## Confirmed Decisions

- See [the confirmed decision record](../decisions/2026-11-20-easy-hard-modes.md) for the complete interview outcome.
- Hard remains the current continuous campaign and autosaves. `Start → Hard` offers `New Game` and `Continue`; a reload returns to title and requires manual Continue. New Game replaces only the active Hard run, starts at Forest Round 1, and keeps records, unlocks, settings, and Easy progress.
- Easy starts at Forest Round 1. Easy unlocks are independent from Hard. Clearing rounds unlocks the next round; clearing Forest Round 8 unlocks Mine Round 1. All stage/round choices remain visible, with locked choices disabled and marked.
- Easy does not autosave the active run or timer. It persists unlocks and records on clear, and increments/persists the current stage-round death count immediately on death. Each counter survives retries, round selection, Home, and later sessions; other rounds have independent counters. The Easy timer resets for each selected, retried, or next round.
- Easy pauses on every clear and death. Clear and death actions are popups over the current view. The round selector is also a popup, not a separate navigation screen.
- Hard combat and stage-level records remain unchanged. Easy records are per stage and round; fastest time wins, and ties retain the earlier best record with its paired death count.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | Add version-4 mode-aware persistence, title entry and selector UI, and Easy round runtime and popups. | [P01](../phases/2026-11-20-easy-hard-modes/P01-mode-progression/phase.md) |

## Status

- Complete: all tasks in P01 are committed.
- T03 commit: `79def50`.

## Scope Boundaries

- Do not alter player, enemy, boss, encounter, stage, terrain, or camera balance and behavior beyond starting an Easy run at its selected round and pausing at Easy decision popups.
- Keep the existing development-only practice-round presets gated by the existing development flag.
- Do not autosave Easy run snapshots or Easy elapsed time.

## Execution Order

1. T01 adds the version-4 save schema, v3-to-v4 migration, Easy progress validation, and record/death update functions.
2. T02 adds the mode entry flow, Hard New Game/Continue menu, Easy round-selector popup, and combined Records view.
3. T03 adds selected-round run creation and Easy clear/death handling, including per-round timing, counter persistence, and stage/final-clear choices.

The local `main` branch was fast-forwarded to `origin/main` at `7f8d3d7` before this plan was written. The confirmed decision file remains untracked and is preserved in the worktree.
