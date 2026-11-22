# Current Context

## Active Plan
[Internal Azure Deployment for Grill-Me](./plans/2026-11-22-internal-game-deployment.md)

## Active Phase
[P01 API Identity and Cloud Data](./phases/2026-11-22-internal-game-deployment/P01-api-and-data/phase.md)

## Active Task
[T02 Cosmos Save API](./phases/2026-11-22-internal-game-deployment/P01-api-and-data/T02-cosmos-save-api.md)

## Status
- T01 Entra API Authentication is implemented and committed as `d8f0f54`.
- Local checks and synthetic signed-token validation passed. Live Entra registration/token claim review is deferred until P03 provisioning.
- T02 is active; implementation has not started.

## Next Step (IMPORTANT)
Read T02 and implement authenticated Cosmos DB save/read endpoints for the version 6 game save, excluding local audio and screen-shake settings.
