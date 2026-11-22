# Current Context

## Active Plan
[Internal Azure Deployment for Grill-Me](./plans/2026-11-22-internal-game-deployment.md)

## Active Phase
[P03 Azure Resources and Production Release](./phases/2026-11-22-internal-game-deployment/P03-azure-release/phase.md)

## Active Task
[T01 Provision Azure and Entra](./phases/2026-11-22-internal-game-deployment/P03-azure-release/T01-provision-azure-and-entra.md)

## Status
- P02 T01 MSAL sign-in and account-scoped cloud save store is committed as `3b128cf`.
- P02 T02 company leaderboards, personal-best tie-breaks, account controls, and sign-out are committed as `a274d5a`.
- `npm run build` passed. Live member-session checks are deferred until Entra settings and the deployed `/api` are available in P03.
- P01 API identity and cloud data is complete.

## Next Step (IMPORTANT)
Read P03 T01 and provision the Free Static Web App, Cosmos database, and Entra app registrations for production.
