# Decisions: Easy and Hard Game Modes

- Date: 2026-11-20
- Status: Confirmed

## D01. Mode structure
- **Chosen**: Keep the current continuous stage-and-round campaign as Hard. Add Easy as a stage-and-round selection mode. Keep enemy and boss combat values identical in both modes; the difference is progression flow.
- **Rationale**: The user defined the modes by how players enter and progress, and chose not to change combat values.
- **Source**: User confirmed.

## D02. Title and mode entry
- **Chosen**: Remove the title-level Continue button. `Start` opens Easy/Hard selection. Hard opens `New Game` and `Continue`; Easy opens its stage-and-round selector.
- **Rationale**: The user chose a mode-selection step and requested Hard-only access to New Game and Continue.
- **Source**: User confirmed.

## D03. Hard mode save and restart
- **Chosen**: Autosave Hard progress. After reload, return to the title and require `Hard → Continue`; do not auto-resume into gameplay. `Hard → New Game` immediately replaces the saved Hard run without a confirmation prompt and starts at Forest Round 1.
- **Rationale**: The user chose explicit Continue access after reload and immediate replacement for New Game.
- **Source**: User confirmed, with the Forest Round 1 start inferred from preserving the existing full campaign route.

## D04. Easy unlock progression
- **Chosen**: Keep Easy unlocks separate from Hard. Easy starts with Forest Round 1 available. Clearing a round unlocks the next round; clearing a stage's Round 8 unlocks the next stage. Only Easy-cleared stages and Easy-reached rounds are selectable.
- **Rationale**: The user chose progression-gated selection and separate mode progress.
- **Source**: User confirmed; the exact next-round unlock step follows the selected progression rule.

## D05. Easy stage-and-round selector
- **Chosen**: Use one popup grouped by stage, with that stage's round buttons. Show locked stages and unreached rounds as disabled choices with lock indicators.
- **Rationale**: The user chose a combined grouped popup and visible locked choices.
- **Source**: User confirmed.

## D06. Easy round-clear popup
- **Chosen**: After each cleared round, pause gameplay and the timer and show a popup with the current round time, that stage-round's death count, and that round's best record. Provide `Round Select`, `Next Round`, and `Home` actions.
- **Rationale**: The user requested a popup after every round, chose the three actions, and chose to exclude popup decision time from gameplay time.
- **Source**: User confirmed.

## D07. Easy stage and campaign completion
- **Chosen**: After Forest Round 8, show `Next Stage`, `Stage/Round Select`, and `Home`. After Mine Round 8, show an overall-clear popup with `Round Select` and `Home`.
- **Rationale**: The user selected the Forest next-stage action and a final Mine clear flow without a next stage.
- **Source**: User confirmed.

## D08. Easy death popup
- **Chosen**: On death, show `Retry`, `Round Select`, and `Home`.
- **Rationale**: The user selected a choice popup on death rather than an automatic restart.
- **Source**: User confirmed.

## D09. Easy timer and death counter
- **Chosen**: Reset the Easy round timer when retrying, selecting a round, or starting the next round. Count deaths independently for each stage and round; keep that round's count across retries, round changes, Home, and later Easy sessions. Add one to the active round and persist it immediately on death.
- **Rationale**: The user clarified that Easy deaths are calculated per round, while also specifying that record deaths must not reset.
- **Source**: User confirmed.

## D10. Easy attempt persistence
- **Chosen**: Do not autosave the active Easy round state or timer. After reload, return to the title and enter Easy selection again. Preserve Easy unlocks, records, and per-round death counts.
- **Rationale**: The user chose not to save the in-progress Easy attempt while keeping record and progression data.
- **Source**: User confirmed; Easy death and clear data are separate persistent fields.

## D11. Mode-specific records
- **Chosen**: Keep Hard records stage-based. Add separate Easy records by stage and round. Show both modes in the existing Records menu. On an Easy clear popup, show the current result and the selected round's best result.
- **Rationale**: The user chose per-round Easy records and the existing Records menu as the shared place to browse them.
- **Source**: User confirmed.

## D12. Existing save migration
- **Chosen**: Preserve existing Hard data. Initialize Easy progress, round records, and per-round death counts as Easy data, starting at Forest Round 1.
- **Rationale**: The user chose to keep existing progress as Hard and keep Easy progression separate.
- **Source**: User confirmed.

## D13. Easy deaths are tracked per stage and round
- **Chosen**: Each Easy stage-round has its own persistent death counter. Deaths increment only the active round's count. Retrying or returning to that round keeps its count; playing another round does not affect it.
- **Rationale**: The user clarified that Easy death counts must be calculated per round.
- **Migration**: Older Easy saves contain one lifetime total, which cannot be divided accurately by round. Initialize the new per-round counters to zero and preserve existing round times and saved record pairs as historical data.
- **Source**: User confirmed on 2026-11-22; supersedes the lifetime-wide wording in the original D09 decision.

## Existing-code conventions to retain

- The current Hard record shape stores both `best` and `recent` results. A faster completion replaces the best time and its paired death count; equal times keep the earlier best record.
- The current `createNewRun` flow replaces the active run while retaining records, settings, and unlock fields. Hard New Game will follow that behavior unless the user changes it.
- The current title menu disables Continue when no saved run exists. Keep that behavior in the Hard submenu.
- Current round starts restore full player health. Use the same full-health start for each selected Easy round.
- Current valid version-1 and version-2 saves reset to a fresh version-3 save. Preserve that existing legacy policy while migrating version 3 into the new mode-aware format.
