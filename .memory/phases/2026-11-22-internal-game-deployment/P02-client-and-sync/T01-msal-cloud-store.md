# Task: T01 MSAL Sign-In and Cloud Save Store

## Status: done

## Goal

Require a company member account before Phaser starts, then initialize the game with that account's Cosmos save, device-local settings, and account-specific offline queue. Existing saves must never be attributed to an account without the user's confirmation.

## Decision Summary

- Use `@azure/msal-browser` 4.x with single-tenant authority and authorization-code-with-PKCE browser flow. Request only `VITE_ENTRA_API_SCOPE` for the Grill-Me API.
- Production fails closed: no account, guest account, invalid configuration, or API 401/403 must not start the game. In local development, an explicit `VITE_AUTH_MODE=local` may retain current unauthenticated development behavior.
- `settings` remain in `localStorage`. Cloud progress is cached and queued under a key derived from the signed-in `tid` and `oid`; tokens are never written to the save cache or outbox.

## Implementation

### I01. MSAL bootstrap before Phaser construction

- Related Files:
  - `package.json` :: add `@azure/msal-browser` 4.x; modify.
  - `src/game/auth/entraAuth.js` :: initialize MSAL, acquire API token, sign-in/out; new.
  - `src/game/ui/authScreen.js` :: sign-in, retry, blocked-account, and error states; new.
  - `src/main.js` :: await identity bootstrap before creating `Phaser.Game`; modify.

#### Details

- Public build settings are `VITE_AUTH_MODE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_SPA_CLIENT_ID`, and `VITE_ENTRA_API_SCOPE`. The API scope is `api://<API_APP_CLIENT_ID>/game.access`. These values are identifiers, not secrets.
- `initializeEntraAuth({ environment })` returns `{ account, getAccessToken, signIn, signOut }`. Configure `PublicClientApplication` with authority `https://login.microsoftonline.com/<tenantId>`, redirect URI `window.location.origin + "/"`, `cacheLocation:"sessionStorage"`, and the API scope. Use `handleRedirectPromise`, then `getActiveAccount` or the single cached account. If there are multiple accounts and no active account, show a chooser rather than selecting one silently.
- Require `account.idTokenClaims.tid` to equal the configured tenant, a valid `oid`, and `acct` equal to zero. Configure `acct` as an optional ID-token claim on the SPA registration so offline startup also blocks guests. The server independently checks `acct` in the API access token.
- `getAccessToken()` calls `acquireTokenSilent` for the API scope and starts `acquireTokenRedirect` if interaction is required. Never expose an ID/access token in UI, query string, logs, local save, or outbox.
- `src/main.js` must await MSAL bootstrap and `GET /api/account` before constructing `Phaser.Game` or retrieving `getAppStore()`. On sign-in, token, or authorization error, render `authScreen.js`; never silently switch a production build to local mode.
- Local bypass is allowed only when `import.meta.env.DEV` and `VITE_AUTH_MODE === "local"`. Any other missing/invalid production mode renders a configuration error without starting Phaser.

### I02. Same-origin API client and account bootstrap

- Related Files:
  - `src/game/storage/cloudSaveClient.js` :: fetch `/api/account`, `/api/save`, and `/api/leaderboards`; new.
  - `src/game/auth/entraAuth.js` :: provide fresh access tokens to requests; modify.
  - `src/main.js` :: initialize save state after authorized account is returned; modify.

#### Details

- Every private request is same-origin, `credentials:"same-origin"`, `cache:"no-store"`, with `Authorization: Bearer <access-token>` and JSON content type for writes. Do not use a hard-coded API hostname or configure CORS.
- On a valid member session, request `/api/account` first and use its verified `{userId,displayName}`. Then request `/api/save` to decide between cloud load, legacy import, or empty account state.
- Handle status groups distinctly: 401 refresh/re-authenticate; 403 show company-member access denied and do not start/sync the game; 503/network errors permit account-cache fallback if one exists.
- Keep an in-memory, short-lived leaderboard cache per account only for outage presentation. Mark it stale when used offline.

### I03. Local-first account store, import prompt, and outbox

- Related Files:
  - `src/game/storage/appStore.js` :: account-aware local-first store; modify.
  - `src/game/storage/saveStore.js` :: retain V6 validation and separate local settings from cloud progress; modify.
  - `src/game/storage/cloudSaveClient.js` :: load/save/sync calls; modify.
  - `src/game/ui/saveImportPrompt.js` :: clear import/skip choice; new.
  - `src/game/storage/runCoordinator.js` :: call local persistence without blocking simulation; modify.
  - `src/game/scenes/easySession.js` :: keep Easy death/clear persistence on the same store; modify.

#### Details

- Preserve existing settings in `pixel-action.save.v1`. Store an account's last known progress at `pixel-action.account-cache.v1:<userId>` and its one coalesced pending snapshot at `pixel-action.account-outbox.v1:<userId>`, where `userId` is the server-confirmed `${tid}:${oid}`. Never place a bearer/refresh token in these keys.
- Cloud payload is the existing `freshSave()` version 6 shape without `settings`. `getSave()` returns the cloud progress combined with the current browser's local `settings`.
- Startup order:
  1. Read existing local settings and a validated legacy `pixel-action.save.v1` snapshot.
  2. Authenticate and request the account profile and cloud save.
  3. If the cloud has no save and the legacy snapshot contains progress, show `saveImportPrompt.js`. Import uploads the progress fields without settings and marks the account's import decision. Skip creates a fresh account save and does not upload the anonymous progress. Never ask or import while the server is unreachable.
  4. If the API is unreachable and this account has a valid local cache, start from that cache and show the existing storage warning. If no account cache exists, keep the sign-in/retry screen open; do not substitute another account's save or the anonymous legacy save.
- Keep the game-facing store synchronous for simulation calls: `getSave()`, `setSave(save)`, `persist()`, `retry()`, `getWarning()`, and `subscribe(listener)`. `persist()` first writes the current account cache and replaces the outbox snapshot, then schedules background sync and returns without waiting for network I/O.
- Coalesce pending saves into one latest snapshot. Run at most one sync request at a time; debounce ordinary tick writes, flush immediately after death/round clear/stage clear, and retry on browser `online`, tab visibility restoration, or the existing retry action. On successful `PUT /api/save`, replace cache with server response and clear only the matching outbox revision. On failure retain both cache and outbox and expose a warning.
- If another device has saved while this device was offline, the API's accepted write order determines the latest run snapshot. Server-side unlock/best merging from T02/T03 prevents those values from regressing.
- Keep music volume, SFX volume, and screen-shake settings local and device-scoped. Do not upload them during import or autosave.

## Acceptance Criteria

- [x] Production Phaser startup is blocked until a valid company member identity is confirmed by `/api/account`.
- [x] A guest or wrong-tenant account cannot start play or submit saves, including when an account cache exists.
- [x] Legacy local progress is imported only after an explicit choice and only when cloud state is confirmed empty.
- [x] During API outage, a signed-in account with local cache can continue; its writes remain queued under that account and sync after recovery.
- [x] Local settings survive sign-in, cloud reload, import, and account switching without appearing in Cosmos payloads.
- [x] Network requests never block Phaser's simulation loop.

## Validation

- [x] `npm run build` passed after implementation.
- Production browser checks with member/guest accounts, a second profile, live import/skip, and offline recovery are deferred until P03 because no production Entra values or deployed `/api` are configured in this workspace.

## Commit Message

```text
feat(auth): gate Grill-Me with MSAL and sync account saves

Plan: 2026-11-22-internal-game-deployment
Phase: P02-client-and-sync
Task: T01-msal-cloud-store

- Bootstrap Entra member auth before creating Phaser
- Add account-scoped cache, explicit import, and offline outbox
```

## Progress

- [x] Implementation complete
- [x] Local build validation complete; live Entra and API behavior remains to be exercised after P03 provisioning.
- commit: pending
