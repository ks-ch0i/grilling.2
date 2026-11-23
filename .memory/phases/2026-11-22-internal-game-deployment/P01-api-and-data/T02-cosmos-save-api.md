# Task: T02 Cosmos Save API

## Status: done

## Goal

Store each authenticated user's hard continuation state, stage unlocks, Easy round progress/deaths, and personal records in a dedicated Cosmos DB for NoSQL save item. Keep browser settings out of the cloud payload and scope every operation to the identity verified by T01.

## Decision Summary

- Database: `pixel-raid`, shared database throughput 400 RU/s, in the existing shared Cosmos account. Keep the account name and endpoint out of Git.
- Save container: `player-saves`, partition key `/userId`, one item per user. API account key is read only from server environment settings.
- Persist the current `saveStore.js` version 6 data except `settings`. Run state uses latest server-accepted write; unlocks and personal bests merge monotonically.

## Implementation

### I01. Cosmos client and save document schema

- Related Files:
  - `api/package.json` :: add `@azure/cosmos` 4.x; modify.
  - `api/src/cosmos/client.js` :: singleton Cosmos client/database/container access; new.
  - `api/src/save/schema.js` :: `validateCloudSave`, `toSaveDocument`, `fromSaveDocument`; new.
  - `api/src/save/merge.js` :: `mergeCloudSave(existing,incoming,principal,now)`; new.
  - `api/src/config.js` :: add Cosmos server settings; modify.

#### Details

- Read `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE_ID`, and `COSMOS_SAVE_CONTAINER_ID` only from the Functions process environment. Use fixed default IDs `pixel-raid` and `player-saves`; clients cannot select database/container names.
- Container partition key is `/userId`. Document fields:

  ```text
  id: string                         // exactly `${tenantId}:${objectId}`
  userId: string                     // same as id and partition key
  tenantId: string
  objectId: string
  displayName: string                // verified `name` claim
  version: 6
  run: object | null
  unlockedStageIds: string[]         // subset of forest-1, mine-1; forest-1 always present
  records: { forest-1: RecordPair, mine-1: RecordPair }
  easy: {
    unlockedRoundByStage: { forest-1: 1..8, mine-1: 0..8 },
    roundDeaths: { forest-1: {"1".."8": nonnegative safe integer}, mine-1: same },
    roundRecords: { forest-1: {"1".."8": RecordPair}, mine-1: same }
  }
  updatedAt: ISO-8601 server timestamp
  revision: positive integer
  ```

- `RecordPair` is `{ best: null | { elapsedTicks: nonnegative safe integer, deaths: nonnegative safe integer }, recent: same }`.
- `settings` is intentionally absent. `run` must be null or a JSON object no larger than the API payload limit; reject non-finite numbers, arrays where objects are expected, unknown stage IDs, and malformed required counters. Total accepted request body is at most 256 KiB.
- `mergeCloudSave` uses the verified principal for `userId`, `tenantId`, `objectId`, and `displayName`; caller-supplied identity fields are ignored. Incoming run replaces the saved run (latest accepted write). `unlockedStageIds` is a union. Each Hard/Easy best chooses the smaller `(elapsedTicks, deaths)` tuple; `recent` uses the incoming save. `easy.roundDeaths` uses the per-round maximum so an older cache cannot reduce recorded deaths. Increment `revision` and set server `updatedAt` for every accepted write.

### I02. Read/write save handlers

- Related Files:
  - `api/src/save/repository.js` :: `get(userId)` and `upsert(document)`; new.
  - `api/src/functions/save.js` :: `GET /api/save` and `PUT /api/save`; new.
  - `api/src/index.js` :: register save handlers; modify.

#### Details

- Both methods call T01 `requireEntraPrincipal` before Cosmos access.
- `GET /api/save` queries only `id=principal.userId` in that user's partition. Return `{ exists:false, save:null, revision:0 }` if absent; otherwise return the version 6 progress without server metadata or settings.
- `PUT /api/save` accepts exactly `{ save: CloudSaveV6 }`. It does not accept a user ID or leaderboard row. Validate the version 6 shape, merge with the current document, and upsert in the authenticated user's partition. Return `{ saved:true, revision, updatedAt }`.
- Use the Cosmos item ETag for conditional upserts. If another write wins between the read and upsert, re-read and re-merge before retrying so concurrent saves do not discard monotonic unlocks, deaths, or best records.
- Success and error responses set `Cache-Control: no-store`. Map invalid payload to 400, auth errors to T01 statuses, and Cosmos outage to 503 without returning SDK details or credentials.
- Build the Cosmos SDK client once per Function worker. Do not return connection strings, keys, or full Cosmos documents.

## Acceptance Criteria

- [x] A signed-in member can read only their own save and create/update it without providing an identity key.
- [x] `settings`, caller identity fields, unknown stage IDs, malformed records, and oversized payloads are rejected or omitted as specified.
- [x] Progress merge follows the declared run, unlock, round-death, and best-record rules.
- [x] A missing Cosmos item returns the explicit empty-cloud result required for the import prompt.

## Validation

- Run `npm --prefix api run check` after implementation.
- Local smoke checks cover config fail-closed behavior, both stage run snapshots, schema rejection, identity derivation, merge rules, the empty-cloud response, request size limits, and conditional-write retry behavior.
- Review the deployed database/container names, `/userId` partition key, 400 RU/s database throughput, and one member-scoped save document in Cosmos Data Explorer during P03 provisioning. The database/container is provisioned there, so this live check is deferred. Do not print the account key.

## Commit Message

```text
feat(api): persist account saves in Cosmos DB

Plan: 2026-11-22-internal-game-deployment
Phase: P01-api-and-data
Task: T02-cosmos-save-api

- Add the version 6 cloud save contract and per-user partition
- Preserve local-only settings and merge account progress safely
```

## Progress

- [x] Implementation complete
- [x] Local validation complete
- [ ] Live Cosmos resource/document review deferred to P03 provisioning
- commit: 56735c4
