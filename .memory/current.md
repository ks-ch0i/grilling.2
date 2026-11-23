# Current Context

## Active Plan
[Internal Azure Deployment for Grill-Me](./plans/2026-11-22-internal-game-deployment.md)

## Active Phase
[P03 Azure Resources and Production Release](./phases/2026-11-22-internal-game-deployment/P03-azure-release/phase.md)

## Active Task
[T02 Main Deployment and Operations Runbook](./phases/2026-11-22-internal-game-deployment/P03-azure-release/T02-main-deploy-runbook.md)

## Status
- Public Git history cleanup completed. Public `main` was replaced with the scrubbed 81-commit history and verified from a fresh clone.
- Local `main` is based on the cleaned history and retains all 10 unpublished commits. Its ahead count is `0 10`. Current working changes remain present, and publishable files passed the identifier scan.
- No deployment code was committed or published. The local original-history recovery bundle and migration snapshots remain in the private temp directory.
- The production candidate now uses one Entra registration and the existing Standard SWA for login, with the same managed API and shared Cosmos database. The change is local. Azure still has both original registrations and awaits its first code deployment.

## Next Step (IMPORTANT)
Continue P03 T02 using the [updated single-app runbook](../docs/azure-internal-deployment.md). Reuse `Grill-Me SPA` for SWA web login, configure its callback and SWA server settings, and prepare the reviewed code and GitHub deployment token. Verify SWA gives members the `grill-member` role and denies guests before removing the legacy API registration. The old `game.access` grant is superseded by SWA authentication.

## Suspended Plan
None. The internal Azure deployment is active again.
