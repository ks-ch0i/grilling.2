# Decisions: Internal Azure Game Deployment

- Date: 2026-11-22
- Status: Confirmed; API/client implementation and Azure resource provisioning are complete. Production Entra/GitHub configuration and application smoke checks remain pending.

## D01. Audience and network access
- **Chosen**: Require sign-in with accounts in the company's Microsoft Entra tenant. Allow tenant members and block guest accounts. The site remains reachable from the public internet, with Entra authentication required.
- **Rationale**: The game is for company members, without requiring VPN or private-network access.
- **Source**: User confirmed.
- **Implementation note**: The Standard Static Web App handles Entra sign-in. Its roles function reads the tenant-issued `acct` claim and gives only member accounts the `grill-member` role. SWA requires that role for site and API routes.

## D02. Entra app registration
- **Chosen**: Use dedicated single-tenant app registrations for this game and request tenant-admin consent from IT.
- **Rationale**: Keep the game's sign-in configuration separate from other projects.
- **Source**: User confirmed the dedicated single-tenant registration and IT consent. The implementation split into a browser SPA registration and an API registration is an agent-derived design choice for delegated API access and permission isolation. Azure subscription ownership does not itself grant Entra directory-admin permissions.
- **Implementation note**: The SPA registration is a public client with the production Static Web App and local development redirect URIs. The API registration exposes one delegated `game.access` scope and emits the `acct` and `name` access-token claims. The SPA requests only that API scope; no Microsoft Graph permission is needed.

## D03. Static hosting and API placement
- **Chosen**: Use a dedicated Azure Static Web Apps Standard resource with its managed Functions API (`/api`). Do not create a separate Functions app for the initial deployment.
- **Rationale**: The subscription has reached its limit of 10 Free Static Web Apps. Standard is available within the subscription quota, and a dedicated SWA keeps Grill-Me's deployment separate from other projects.
- **Source**: The user selected a new Standard SWA after confirming that existing Standard resources cannot be shared as independent app plans.
- **Implementation note**: Use Static Web Apps managed Functions on Node 22. The SWA gateway authenticates users and passes the verified principal to the API. Keep the Cosmos account key in server-side API settings only. Use fixed database/container names in the API. The site remains internet-reachable and requires the `grill-member` role.

## D04. Deployment region
- **Chosen**: Host the Static Web App and managed API in East Asia; keep Cosmos DB in Korea Central.
- **Rationale**: The target subscription's Static Web Apps resource provider lists East Asia as its available Asia region. Static Web Apps assets are globally distributed, while the managed API runs in the selected app region. The user accepted this split after it was explained.
- **Source**: Region derived from live subscription capabilities and the selected existing Cosmos account; user confirmed East Asia managed API with Korea Central database.

## D05. Azure resource target and reuse
- **Chosen**: Subscription `REPLACE_WITH_AZURE_SUBSCRIPTION_ID`, resource group `REPLACE_WITH_AZURE_RESOURCE_GROUP`, and the existing shared Cosmos DB account. Keep the account name and endpoint out of Git.
- **Rationale**: Reuse the common Cosmos account; keep this game's website/API configuration and logical data separate from the other projects in the resource group.
- **Source**: User supplied the target and requested reuse where practical.
- **Inventory finding**: Existing Static Web Apps and Functions are project-specific deployments, so do not replace their site content or API code. The current Azure identity has subscription-scope Owner and resource-group Contributor roles. Entra app registration/consent remains a separate directory permission.

## D06. Cosmos database isolation and throughput
- **Chosen**: Add a dedicated logical database for this game inside the shared Cosmos account. Start with 400 RU/s provisioned throughput; accept the additional Cosmos throughput charge and monitor usage before scaling.
- **Rationale**: Keep game data separated from the existing logical databases while starting at the minimum throughput level. The account's Free Tier is enabled, but at least eight existing databases already have 400 RU/s each, exceeding its 1,000 RU/s free allowance.
- **Source**: User chose a separate database, selected the name `pixel-raid`, and accepted the additional throughput after the existing account capacity was inspected.
- **Implementation note**: Use Cosmos DB for NoSQL. The account is in Korea Central. The account key used by the managed API is account-wide, so API handlers must never accept a database/container name from the client. Use fixed database/container IDs `pixel-raid`, `player-saves`, and `leaderboards`.

## D07. Cloud save scope and local settings
- **Chosen**: Store each user's hard-mode continue state, unlock/progression data, hard records, Easy stage-round unlocks, per-round deaths, and Easy records in Cosmos DB. Keep audio and screen-shake settings in browser storage.
- **Rationale**: Make progress and records available across devices while leaving device preferences local.
- **Source**: User confirmed.
- **Implementation note**: Local settings remain browser/device-scoped and are shared by accounts using the same browser profile.

## D08. First-login data migration
- **Chosen**: If the signed-in account has no cloud save and the browser has an existing local save, ask the user before importing it. If imported, its prior best records immediately appear on company leaderboards.
- **Rationale**: Existing local saves have no account owner; confirmation reduces accidental attribution on shared devices.
- **Source**: User confirmed both import confirmation and publishing imported best records.

## D09. Identity and data ownership
- **Chosen**: Scope saves and write operations to the authenticated Entra tenant/object identity. Use the Entra display name on leaderboard rows. Users may read company leaderboard entries but may only read/write their own save and submit their own results.
- **Rationale**: Preserve account ownership while making the selected company-wide rankings possible.
- **Source**: Display name and company-wide visibility are user-selected; tenant/object scoping and API ownership checks are implementation requirements derived from that choice.

## D10. Leaderboards
- **Chosen**: Show company-wide rankings, limited to the top 10 plus the signed-in user's own rank. Keep separate boards for each Hard stage and each Easy stage-round. Rank each user's personal best by shortest clear time, then fewer deaths; display Entra display name, time, and deaths.
- **Rationale**: Use comparable challenges and the existing fastest-clear record convention.
- **Source**: User confirmed.

## D11. Score integrity
- **Chosen**: Treat scores as internal, self-reported results. Require authentication and basic server-side validation, but do not build server-authoritative gameplay or robust anti-cheat for launch.
- **Rationale**: Keep the leaderboard within the game's current browser-simulated architecture.
- **Source**: User confirmed.

## D12. Cross-device conflicts
- **Chosen**: Keep one account-level continue state; the most recently saved state wins. Merge personal best records by the selected time/death ranking rule.
- **Rationale**: Allow continuation across devices without device-specific save slots.
- **Source**: User confirmed.

## D13. API outage behavior
- **Chosen**: Continue from account-specific browser cache when the API is unavailable, queue changes locally, and sync when connectivity returns. Use the latest-save-wins policy if another device has updated the account meanwhile.
- **Rationale**: Keep the game playable during transient outages while preserving pending progress.
- **Source**: User confirmed.

## D14. Departed users and deletion
- **Chosen**: Keep a user's display name and historical scores after account departure. An administrator can remove the data when needed; do not add automatic directory polling or anonymization.
- **Rationale**: Avoid extra Graph permissions and automated offboarding integration.
- **Source**: User explicitly corrected the earlier anonymization choice to this policy.

## D15. Production deployment trigger and URL
- **Chosen**: Deploy to production automatically when changes reach GitHub `main`. Use the default `*.azurestaticapps.net` hostname; no custom domain.
- **Rationale**: Match the existing resource-group convention and avoid DNS dependencies.
- **Source**: User confirmed.

## D16. Initial capacity target
- **Chosen**: Start the dedicated database at 400 RU/s while peak concurrency is unknown; observe usage/throttling and scale based on measurements.
- **Rationale**: There is no concurrency estimate yet, so begin at minimum throughput and measure real usage.
- **Source**: User chose the unknown-load option after first selecting and then correcting an earlier estimate.

## Existing code and deployment constraints

- The repository is a Vite 8 / Phaser 4.2 browser game requiring Node.js `>=22.12.0`. It currently has no backend, sign-in flow, `staticwebapp.config.json`, Functions API, or Azure/GitHub deployment workflow.
- Current data uses `localStorage` through `src/game/storage/appStore.js` and `src/game/storage/saveStore.js`. The hard-mode coordinator saves snapshots about once per 60 ticks and on gameplay events; Easy persistence is event-based.
- The managed Static Web Apps API supports Node.js 22 (`apiRuntime: node:22`); use Node 22 for that API. See [Static Web Apps supported runtimes](https://learn.microsoft.com/en-us/azure/static-web-apps/languages-runtimes).
- The existing Cosmos account is shared by multiple projects. Several existing apps contain Entra/Cosmos setting names, and one existing Function identity has Cosmos Data Contributor at account scope. Do not copy their secrets or broad role assignment. The selected managed API requires an account key, so keep it only in server settings and scope API behavior to this game's database.
- No code tests or Azure mutations were run during the interview. Existing user changes must be preserved. At interview time, local `main` was 14 commits ahead of `origin/main` and the working tree also contained modified/untracked files; automatic production deployment will use the committed GitHub branch, so those changes need review and publication before release.

## Reference project review

- The user-provided [ChaJiYoung/ob-crash-game repository](https://github.com/ChaJiYoung/ob-crash-game) is a separate, mature VM-hosted WebSocket game. Its current `main` identifies players with a browser-stored device ID and nickname; the server persists game and player data to SQLite on the VM. The schema contains an `auth_provider` column that permits `device` or `entra`, but the reviewed login and WebSocket flow does not authenticate Entra tokens.
- Its deployment guide uses one tagged `ob-crash-*` VM stack, Docker, Caddy, and SQLite on the VM disk. The matching VM/network/disk resources in `REPLACE_WITH_AZURE_RESOURCE_GROUP` are tagged `project=ob-crash-game`; keep them isolated and do not attach Grill-Me workloads to them.
- The reference is useful for explicit data validation, migration/backup documentation, scoped resource naming, and operational runbooks. Its WebSocket server and SQLite choices are not part of this plan because Grill-Me already selected the managed Static Web Apps API and shared Cosmos NoSQL account.
- Two other mapped Static Web Apps (`swa-cookie-expedition` and `swa-dex-escape-prod-384874bc`) use Standard custom single-tenant OIDC and route-level authentication. Their inspected decisions allow tenant guests, so those configurations do not implement Grill-Me's guest-blocking rule.

## Implementation details and defaults

- The user selected `pixel-raid` as the logical database name. Use the game-specific containers `player-saves` and `leaderboards`.
- Keep per-user save documents keyed by Entra tenant/object ID; store only the display name needed by leaderboard presentation.
- Put Cosmos primary/secondary key material in the Static Web App managed API settings. Never expose it through `import.meta.env`, a public `VITE_` variable, browser responses, or Git history.
- Use a separate SPA registration and API registration, both single-tenant. Request the API's delegated scope through MSAL; validate API access tokens with `jose`; require the configured tenant, SPA client, scope, API audience, `oid`, `name`, and `acct=0`.
- Gate Phaser initialization on successful MSAL authentication. Protect all game data through API token validation; do not treat public delivery of static JS/assets as authorization.
- Configure GitHub Actions on `main` for the frontend and managed API; use a Node 22 build/runtime setting and deploy secrets through repository/environment secrets.
