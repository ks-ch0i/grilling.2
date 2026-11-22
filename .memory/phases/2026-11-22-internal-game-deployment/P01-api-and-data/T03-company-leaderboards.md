# Task: T03 Company Leaderboards

## Status: pending

## Goal

Maintain one best result per authenticated member and challenge in Cosmos, and return the top ten plus the signed-in member's own rank for each Hard stage or Easy stage-round.

## Decision Summary

- Hard boards: `hard:<stageId>` for `forest-1` and `mine-1`.
- Easy boards: `easy:<stageId>:<round>` for rounds 1 through 8 in either stage.
- Rank by ascending `elapsedTicks`, then ascending `deaths`. Use the verified Entra display name. Scores remain client-simulated and receive basic shape/range validation only.

## Implementation

### I01. Board identity, repository, and ranking service

- Related Files:
  - `api/src/leaderboard/boardId.js` :: `parseBoardRequest` and canonical board IDs; new.
  - `api/src/leaderboard/repository.js` :: leaderboard upsert, top-ten query, own-rank query; new.
  - `api/src/leaderboard/service.js` :: derive and merge bests from save documents; new.
  - `api/src/cosmos/client.js` :: fixed `leaderboards` container; modify.
  - `api/src/config.js` :: `COSMOS_LEADERBOARD_CONTAINER_ID`; modify.

#### Details

- Use Cosmos container `leaderboards`, partition key `/boardId`, shared database throughput from `grill-me-game`. Each item has:

  ```text
  id: userId
  boardId: hard:<stageId> | easy:<stageId>:<round>
  userId: verified `${tid}:${oid}`
  tenantId, objectId, displayName: verified principal values
  elapsedTicks, deaths: nonnegative safe integers
  updatedAt: ISO-8601 server timestamp
  ```

- Validate `mode` as `hard|easy`, `stageId` as `forest-1|mine-1`, and Easy `round` as integer 1..8. Hard requests must not supply a round. Never accept a raw `boardId` or partition key from the client.
- Upsert a user's board item from their personal best after every successful `PUT /api/save`; derive Hard values from `records[stageId].best` and Easy values from `easy.roundRecords[stageId][round].best`. This also publishes imported local bests. A poorer new result never replaces the stored best.
- Rank by the tuple `(elapsedTicks ASC, deaths ASC)`. For exact ties, return the same competition rank; use `displayName ASC, userId ASC` only to make display ordering stable. Never expose `userId`, `tenantId`, or `objectId` in the response.

### I02. Leaderboard HTTP endpoint

- Related Files:
  - `api/src/functions/leaderboards.js` :: `GET /api/leaderboards`; new.
  - `api/src/index.js` :: register the endpoint; modify.
  - `api/src/save/repository.js` :: call ranking service after save upsert; modify.

#### Details

- Query forms:
  - `GET /api/leaderboards?mode=hard&stageId=forest-1`
  - `GET /api/leaderboards?mode=easy&stageId=forest-1&round=4`
- Require T01 member authorization before querying Cosmos.
- Response shape: `{ boardId, totalParticipants, entries:[{rank,displayName,elapsedTicks,deaths}], me:null | {rank,displayName,elapsedTicks,deaths} }`. `entries` contains the first ten rows. If the caller is outside those ten, `me` still contains their row and rank; if already included, `me` duplicates that row for simple UI rendering.
- Query within exactly one `/boardId` partition. Compute own rank as one plus the count of items with a strictly better `(elapsedTicks,deaths)` tuple; ties share a competition rank.
- Set `Cache-Control: no-store`; return 400 for invalid challenge parameters, T01 auth statuses for identity errors, and 503 for Cosmos failures.

## Acceptance Criteria

- [ ] Every save upsert refreshes all personal-best boards without exposing a client-selected user identity.
- [ ] The board response is limited to the top ten plus the caller's own entry and rank.
- [ ] Invalid mode, stage, round, result shape, and unauthenticated requests are rejected.
- [ ] Equal time is ranked by fewer deaths; exact ties share a rank and display in deterministic order.

## Validation

- Run `npm --prefix api run check` after implementation.
- After Azure configuration, request one Hard and one Easy board with a member token and verify top-ten/own-rank behavior using known test data entered through the app. Do not insert user identity from query parameters.

## Commit Message

```text
feat(api): add member-scoped company leaderboards

Plan: 2026-11-22-internal-game-deployment
Phase: P01-api-and-data
Task: T03-company-leaderboards

- Keep one personal-best row per challenge and member
- Return top ten and the caller's rank from Cosmos
```

## Progress

- [ ] Implementation complete
- [ ] Validation complete
- commit: pending
