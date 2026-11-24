# Plan: Parry and Dive Controls

## Goal
Update combat controls and timing so right-click performs a timed parry, Q holds the ranged shield, and left-click selects a normal sword attack or an airtime-gated downward strike. A parry during the first 23 of 37 ticks is perfect and costs no HP; a regular parry costs 0.5 HP. Add distinct perfect-parry feedback, keep save migration compatible, and update the in-game and README guides.

## Confirmed Decisions
- [Decisions: Parry and Dive Controls](../decisions/2026-11-24-parry-and-dive-controls.md)

## Source Baseline
- Planning checkout: HEAD 1daa0783d71ce9c4ac5fa0e0785eadeb23d823c1, equal to origin/main at planning time.
- The local branch name is feature/gameplay-round-safety and its former remote tracking branch is deleted. This plan does not include branch or push operations.
- The old current pointer refers to completed gameplay-safety work. The existing unrelated title-screen decision, plan, and phase files remain outside this plan.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Implement simulation and save compatibility, remap controls and guides, then add perfect-parry feedback. | [P01](../phases/2026-11-24-parry-and-dive-controls/P01-parry-and-dive-controls/phase.md) |

## Scope Boundaries
- Keep existing melee-only parry and ranged-only shield categories, forward aiming coverage, shield/parry cooldowns, dive landing wave, and landing protection.
- Do not add a separate glide action, melee shield, new art assets, deployment, or a push.
- This planning stage creates only .memory documents; it does not edit game source or run tests.

## Observed Out-of-Scope Validation Issue
- The previous full discovery run recorded nine failures in unchanged baseline tests, including audio-manager.test.js and save-store.test.js. Those failures are outside the requested combat behavior. T01 and T03 use named-test filters in those files so the planned checks target their new assertions without folding unrelated cleanup into this plan.
- Confirmed scope: do not add a cleanup task for the nine historical baseline failures. Keep this plan limited to parry and dive changes.
