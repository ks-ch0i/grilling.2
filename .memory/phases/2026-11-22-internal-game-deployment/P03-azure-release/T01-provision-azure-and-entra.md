# Task: T01 Provision Azure Resources and Entra Applications

## Status: pending

## Goal

Create only the new Grill-Me Static Web App and its dedicated logical Cosmos database/containers in the existing account, then document the exact Entra, API-setting, and GitHub values required for the application to run.

## Decision Summary

- Target: subscription `REPLACE_WITH_AZURE_SUBSCRIPTION_ID`, resource group `REPLACE_WITH_AZURE_RESOURCE_GROUP`.
- Create `swa-grill-me-prod` as Static Web Apps Free in East Asia. Use existing Cosmos account `REPLACE_WITH_EXISTING_COSMOS_ACCOUNT_NAME` in Korea Central; create database `grill-me-game` with 400 RU/s shared throughput.
- Keep `ob-crash-*`, Grill-US, and all other app resources untouched. Do not create a separate Functions app, Cosmos account, Key Vault, or Graph permission grant.

## Implementation

### I01. Repeatable resource template and SWA runtime configuration

- Related Files:
  - `infra/azure/main.bicep` :: create new SWA and Cosmos child resources; new.
  - `infra/azure/parameters.example.json` :: non-secret parameter example; new.
  - `public/staticwebapp.config.json` :: Node 22 managed API and SPA fallback; new.

#### Details

- Bicep parameters: `staticWebAppName` default `swa-grill-me-prod`, `cosmosAccountName` default `REPLACE_WITH_EXISTING_COSMOS_ACCOUNT_NAME`, `databaseName` default `grill-me-game`, and `databaseThroughput` fixed at 400 for the initial deployment.
- Declare the existing `Microsoft.DocumentDB/databaseAccounts` resource with `existing` at `REPLACE_WITH_AZURE_RESOURCE_GROUP`; do not redeploy, tag, change throughput on, or retrieve keys from the parent account.
- Create a new `Microsoft.Web/staticSites` resource in `eastasia` with SKU name/tier `Free` and tags `project=grill-me`, `environment=production`. Output its generated default hostname, never an API deployment token.
- Under the existing Cosmos account, create the SQL database `grill-me-game` with database-level shared throughput 400 RU/s. Add containers `player-saves` with partition key `/userId` and `leaderboards` with partition key `/boardId`; do not configure container-level dedicated throughput.
- The static config sets `platform.apiRuntime` to `node:22`. Set navigation fallback to `/index.html` and exclude `/api/*` and built asset paths. Do not configure SWA `auth`, `rolesSource`, or an `authenticated` route because the MSAL/API token flow owns authorization.
- Bicep deployment is incremental and limited to the new SWA and child database/container resources. The existing account declaration is read-only. No script targets or deletes arbitrary resources by name prefix.

### I02. Entra registration specification and server settings runbook

- Related Files:
  - `docs/azure-internal-deployment.md` :: complete tenant setup and safe operations instructions; new.
  - `infra/azure/parameters.example.json` :: reference the non-secret IDs only; modify.

#### Details

- Document two registrations, both for accounts in this organizational directory only:
  1. **Grill-Me SPA**: public SPA client, redirect URI `https://<SWA_HOST>/` and local development URI `http://localhost:5173/`; API permission is delegated `api://<API_CLIENT_ID>/game.access`; optional ID-token claim `acct` so the browser can block guests during offline startup. No client secret.
  2. **Grill-Me API**: expose delegated scope `game.access`, use v2 access tokens, and emit optional access-token claims `acct` and `name`. The API verifier expects `aud=<API_CLIENT_ID>`, `azp=<SPA_CLIENT_ID>`, configured tenant `tid`, object ID `oid`, member `acct=0`, display name `name`, and `scp` containing `game.access`.
- Document IT admin consent for the SPA's delegated Grill-Me API scope. No Graph scope or tenant directory read permission is requested.
- Document these Static Web App managed API settings: `ENTRA_TENANT_ID`, `ENTRA_SPA_CLIENT_ID`, `ENTRA_API_AUDIENCE`, `ENTRA_REQUIRED_SCOPE=game.access`, `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE_ID=grill-me-game`, `COSMOS_SAVE_CONTAINER_ID=player-saves`, and `COSMOS_LEADERBOARD_CONTAINER_ID=leaderboards`.
- Document these GitHub Actions variables (public identifiers only): `VITE_AUTH_MODE=entra`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_SPA_CLIENT_ID`, and `VITE_ENTRA_API_SCOPE=api://<API_CLIENT_ID>/game.access`. The only deployment secret is `AZURE_STATIC_WEB_APPS_API_TOKEN`.
- Enter `COSMOS_KEY` only through Azure Static Web App server-side configuration. Do not place it in Bicep parameters, output, `VITE_*`, `.env.example`, GitHub variables, logs, or source control. The selected managed API has no managed identity and the key is account-wide.
- Document manual user-data deletion by locating the verified `userId` in both fixed containers and deleting only the matching save and board items. Do not add an admin HTTP endpoint or automatic account polling.
- Add local `.env.example` entries only for public MSAL identifiers and `VITE_AUTH_MODE`; never add API or Cosmos secrets.

## Acceptance Criteria

- [ ] Bicep creates the new Free SWA and only the named database/containers under the existing Cosmos account.
- [ ] Database throughput is 400 RU/s shared by both containers with the exact partition keys.
- [ ] Production app settings and GitHub values are documented by name and secret classification.
- [ ] Entra setup blocks other tenants and guest accounts without Graph permissions; API token claims match T01.
- [ ] The `ob-crash-*` VM/network resources and all other existing app resources remain outside the deployment template.

## Validation

- Run `az bicep build --file infra/azure/main.bicep` after implementation.
- Review the resource-group deployment change list before applying it; confirm it contains only the new SWA and the new Cosmos database/containers.
- Confirm both Entra registrations are single-tenant and their redirect URI, scope, access-token optional claims, and admin consent match the runbook. Do not copy credentials into terminal output.

## Commit Message

```text
infra(azure): define Grill-Me SWA and Cosmos resources

Plan: 2026-11-22-internal-game-deployment
Phase: P03-azure-release
Task: T01-provision-azure-and-entra

- Add a Free East Asia SWA and isolated Cosmos database containers
- Document Entra member claims and server-only Cosmos settings
```

## Progress

- [ ] Implementation complete
- [ ] Validation complete
- commit: pending
