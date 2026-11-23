# Plan: Save and Sync Notice UX

## Goal

Replace the distracting upper-right save/sync warning with one bottom-center notice. Routine status appears briefly; errors remain visible with an action that can resolve the specific problem.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `complete` | Consolidate save/sync status and error notices, preserve recovery actions, and remove the upper-right notice. | [P01](../phases/2026-11-23-sync-notice-ux/P01-storage-sync-notices/phase.md) |

## Confirmed Decisions

- Show all save/sync states at bottom center; remove the upper-right storage/sync box.
- Show routine pending, successful sync, and local-save feedback in a rounded toast for about 2.5 seconds, then fade it out.
- Keep storage/network errors visible until resolved and offer retry.
- An expired login offers sign-in again. A forbidden account explains the denial and offers sign-out.
- Keep the independent audio playback warning unchanged; prevent it from overlapping the bottom-center notice.

## Source Decision

See [confirmed interview decisions](../decisions/2026-11-23-sync-notice-ux.md).

## Completion

- P01 and T01 completed. The implementation is in `5445a5f`; the final browser-review record is in the follow-up memory commit.
- Wide/narrow local-save, storage-error/retry, and audio-warning layout checks passed. Entra error states were verified by source review because no authenticated local session was available.
