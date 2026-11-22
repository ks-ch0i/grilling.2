# Task: T02 Records and Account UI

## Status: pending

## Goal

Connect existing Hard/Easy completion flows and the records popup to the company boards while preserving the current mode/stage layout, personal records, and offline play behavior.

## Decision Summary

- Reuse the current Easy/Hard and Forest/Mine selector styling in `recordsPopup.js`.
- Easy rows open an eight-round challenge board; Hard stage cards open the selected stage board. Each board view shows the top ten and the signed-in member's rank if outside the top ten.
- Entra display name comes from T01's server-verified account response. No email or token is shown.

## Implementation

### I01. Board view and records popup integration

- Related Files:
  - `src/game/ui/recordsPopup.js` :: retain personal Easy/Hard records and add board navigation; modify.
  - `src/game/ui/companyLeaderboard.js` :: loading, entries, own-rank row, empty, stale, and error states; new.
  - `src/game/ui/challengePanel.js` :: reuse challenge panel sizing and focus behavior; read-only unless required.
  - `src/styles.css` :: responsive leaderboard rows and sync labels; modify.

#### Details

- Preserve existing mode switches (`easy|hard`) and stage switches (`forest-1|mine-1`). Keep the Easy eight-round table and Hard best/recent cards.
- Selecting an Easy round opens that challenge's board using `mode=easy`, `stageId`, and `round`. Selecting the Hard stage board uses `mode=hard` and `stageId` without a round. Provide a back action to the records view.
- Render columns `순위`, `플레이어`, `기록`, and `사망`. Use DOM `textContent` for every display name; never insert player names as HTML.
- Show the user's own row directly if within top ten. If outside the top ten, display the API `me` result in a visually distinct `내 기록` row after the top ten. Exact ties retain the server-provided shared rank.
- While loading, keep the popup usable and show an accessible loading state. On empty board, show no-record copy. If offline, use cached board only with a stale indicator; otherwise show an unavailable state without hiding the personal local records.

### I02. Save events, personal best ordering, and account controls

- Related Files:
  - `src/game/storage/saveStore.js` :: compare best records by time then deaths; modify.
  - `src/game/storage/runCoordinator.js` :: enqueue hard stage clears; modify if T01 sync hook needs it.
  - `src/game/scenes/easySession.js` :: enqueue Easy round deaths/clears; modify if T01 sync hook needs it.
  - `src/game/scenes/TitleScene.js` :: show verified display name and sign-out control; modify.
  - `src/game/scenes/ResultScene.js` :: expose a company-board action for completed challenges; modify.
  - `src/game/storage/cloudSaveClient.js` :: fetch/refresh selected board; modify.

#### Details

- Update both `recordCompletion` and `recordEasyRoundCompletion` so a best result is replaced when `elapsedTicks` is lower, or when time is equal and deaths are lower. Preserve `recent` semantics.
- Hard stage clear and Easy round clear/death continue to call `setSave`/`persist`; the T01 store queues their progress and T03 server write updates the leaderboard from personal bests. Do not add a second client score submission endpoint.
- Add a sign-out button using MSAL `logoutRedirect`. On logout, remove the in-memory identity and Phaser instance; keep account-scoped progress/cache/outbox so the same member can resume after signing in again. Never show one account's cached data to another account.
- Keep a subtle sync status in title/record/result views: `동기화 중`, `저장됨`, or `오프라인 저장 대기`. Do not add a gameplay HUD element.
- On result or title refresh, load the relevant leaderboard through `cloudSaveClient`; debounce requests while the user switches tabs or rounds.

## Acceptance Criteria

- [ ] Personal and company records remain reachable through the existing mode/stage navigation.
- [ ] Hard and Easy boards map to the correct challenge key and show top ten plus own rank.
- [ ] Equal-time personal bests prefer fewer deaths in both local save data and the API board.
- [ ] Network failure leaves personal records and queued game progress intact and visibly marks cached ranking data stale.
- [ ] Sign-out clears the active game/account from memory without mixing or deleting another account's cached save.

## Validation

- Run `npm run build` after implementation.
- In a member session, clear one Hard stage and one Easy round; confirm the matching board updates, personal best tie-break behavior, own rank outside top ten, and sign-out/account-switch isolation.

## Commit Message

```text
feat(records): show company ranks for Grill-Me challenges

Plan: 2026-11-22-internal-game-deployment
Phase: P02-client-and-sync
Task: T02-records-and-account-ui

- Add top-ten and personal-rank views to the existing records popup
- Sync completed Hard and Easy records through the account save API
```

## Progress

- [ ] Implementation complete
- [ ] Validation complete
- commit: pending
