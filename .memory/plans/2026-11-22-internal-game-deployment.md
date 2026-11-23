# Plan: Internal Azure Deployment for Grill-Me

The release now uses the [single-app SWA authentication runbook](../../docs/azure-internal-deployment.md). Its single registration, platform session, and member role replace the original SPA/API registrations and Bearer token design described below. The existing Standard SWA, managed API, and shared Cosmos database remain the release target.

## Goal

Deploy Grill-Me as an internet-reachable company game that requires a Microsoft Entra member account before play. Use a dedicated Azure Static Web Apps Standard resource in East Asia with its Node 22 managed Functions API, and store account progress and company leaderboards in a dedicated Cosmos DB for NoSQL database inside the existing shared account. Users must be able to continue progress across devices, retain local audio/display preferences, and see the top ten plus their own rank for each challenge.

## Confirmed Decisions

- Subscription `REPLACE_WITH_AZURE_SUBSCRIPTION_ID`; resource group `REPLACE_WITH_AZURE_RESOURCE_GROUP`; existing shared Cosmos account in Korea Central. Keep its resource name and endpoint out of Git.
- New dedicated Azure Static Web App Standard in East Asia, default `azurestaticapps.net` hostname, managed `/api` Functions backend on Node 22, production deployment from GitHub `main`. Standard is selected because this subscription already uses all 10 Free SWA slots; existing Standard resources remain project-specific and are not reused.
- Use an MSAL browser client and a separately registered API resource. Both Entra app registrations are single-tenant. The API verifies signed access tokens and rejects guests (`acct` other than `0`). The static bundle remains publicly downloadable; the browser gates Phaser startup and all saved data/leaderboard operations require a valid member token.
- Create a dedicated logical Cosmos database with shared database throughput of 400 RU/s. Keep account saves, unlocks, per-round deaths, and records in Cosmos. Keep audio and screen-shake settings in local storage.
- First sign-in asks before importing an existing browser save into an empty cloud account. Imported best records join the company leaderboard.
- Keep one cloud continuation state per account; the latest accepted save replaces the run snapshot, while progression and personal-best records merge. Store an account-scoped local cache/outbox and sync it after API recovery.
- Company boards: one best per account for each Hard stage and each Easy stage-round, sorted by fastest time then fewer deaths; show top ten plus the signed-in user's rank. Scores are self-reported with basic server validation, not server-authoritative simulation.
- Preserve existing Azure apps and the separately tagged `ob-crash-*` VM stack. Do not use their app deployments or project data for Grill-Me.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Establish the member-only API identity boundary, cloud save contract, and company leaderboards. | [P01](../phases/2026-11-22-internal-game-deployment/P01-api-and-data/phase.md) |
| P02 | `done` | Add MSAL startup, cloud/local save synchronization, migration prompt, and leaderboard UI. | [P02](../phases/2026-11-22-internal-game-deployment/P02-client-and-sync/phase.md) |
| P03 | `in_progress` | Provision only the new Grill-Me resources and configure repeatable production deployment and operations. | [P03](../phases/2026-11-22-internal-game-deployment/P03-azure-release/phase.md) |

## Scope Boundaries

- Do not create a separate Functions app, new Cosmos account, custom domain, admin portal, Graph offboarding integration, or robust anti-cheat service.
- Do not repurpose the `ob-crash-vm` or other project-tagged resources. The reviewed reference project uses device IDs, nicknames, WebSockets, and SQLite; those are not Grill-Me's approved sign-in or storage design.
- Do not commit or push the current local worktree as part of this plan. The local branch was observed 10 commits ahead of `origin/main` with modified and untracked files. Review and publication of those changes is a separate pre-release decision; the production workflow must only deploy the approved `main` contents.
- Do not add implementation code or run tests while creating this plan.

## Reference Findings

- [ChaJiYoung/ob-crash-game](https://github.com/ChaJiYoung/ob-crash-game) is deployed as a project-specific Azure VM stack. Its `LoginAndPermissionGate` asks for a nickname and motion-sensor permission; `DeviceIdentity` creates a browser-local ID; SQLite on the VM stores player and game rows. It does not provide the Entra account-token flow Grill-Me needs.
- The mapped Standard apps [swa-cookie-expedition](https://github.com/kmth1214-hub/consultingTae) and [swa-dex-escape](https://github.com/Hyeongdae/edu) demonstrate Static Web Apps custom single-tenant OIDC. They require Standard and their recorded policies permit guests, so the chosen Free design instead uses MSAL-issued access tokens validated by Grill-Me's API.
- Microsoft documents the client/API app-registration split and delegated scope flow in [Configure app permissions for a web API](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-access-web-apis). The API app must request `acct` in its access token; Microsoft defines member as `0` and guest as `1` in the [optional claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference).

## Completion Criteria

- A member can sign in, start the game, and use save/leaderboard APIs; a guest, wrong-tenant account, anonymous request, invalid token, or wrong client/scope is denied by the API.
- Hard continuation and Easy unlocks/deaths/records survive another device sign-in. Browser settings remain local. A first-time import is never automatic.
- API outages retain the signed-in account's local progress and queue updates without mixing accounts or losing settings.
- Leaderboards show the correct top ten and a separate own-rank entry when the user is outside the top ten.
- Azure deployment creates a new tagged SWA and game database/containers while leaving all existing project resources untouched. `main` deploys the approved frontend and API without putting any Cosmos or Entra secret in the repository or browser bundle.

## Related Items Not Included

- Static-file-level authentication through Static Web Apps custom OIDC would require Standard and would change the selected hosting tier. The current plan gates game startup and protects all data APIs; public static assets are not confidential.
- The local branch/worktree reconciliation is not included as a task. Before production is enabled, decide which of the 10 local commits and current edits should reach GitHub `main`.
- Reusing the `ob-crash` VM would replace the selected SWA/Cosmos architecture and couple Grill-Me to a project-tagged WebSocket/SQLite deployment.

## Progress

- done: 6/7 (active: P03 T02; workflow and runbook are implemented and locally validated, while production configuration and smoke checks remain pending).
