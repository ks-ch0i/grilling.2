# Task: T02 Main Deployment and Operations Runbook

## Status: in_progress

The [production runbook](../../../../docs/azure-internal-deployment.md) contains the current single-app SWA authentication steps. Use it for release and verification. The SPA/API split, `game.access` grant, frontend auth variables, and `/api/account` described below belong to the earlier implementation.

## Goal

Deploy the approved frontend and managed API automatically from GitHub `main` after Azure/Entra settings are ready, and give operators a safe way to verify access, recover a release, and remove one member's data.

## Decision Summary

- Production trigger is a push to GitHub `main`; use the Azure-provided `azurestaticapps.net` hostname.
- Use GitHub Actions and `Azure/static-web-apps-deploy`; keep the SWA API token in `AZURE_STATIC_WEB_APPS_API_TOKEN` repository secret.
- The user authorized publishing the reviewed deployment code and running the first production deployment on 2026-11-23.

## Implementation

### I01. Main-branch build/deploy workflow

- Related Files:
  - `.github/workflows/azure-static-web-apps.yml` :: Node 22 build and SWA deployment; new.
  - `.gitignore` :: ensure local auth/API secrets remain ignored; modify only if required.
  - `package.json` and `package-lock.json` :: preserve deterministic Vite build; read-only unless a build script change is needed.

#### Details

- Trigger on `push` to `main` and `workflow_dispatch`. Use `actions/checkout`, setup Node 22 (compatible with the root `>=22.12.0` engine), then `npm ci`, `npm --prefix api ci`, `npm run build`, and `npm --prefix api run check`.
- SWA handles authentication using its existing tenant-specific Entra app registration. The frontend build has no Entra environment variables.
- Gate the deploy step on repository variable `AZURE_DEPLOY_ENABLED == "true"`; enable it after the SWA settings, single Entra registration, Cosmos database, and deployment token are configured. Once enabled, every approved push to `main` automatically deploys.
- Deploy the already-built `dist` app and the `api/` Functions source with `Azure/static-web-apps-deploy@v1`, `app_location: "dist"`, `api_location: "api"`, `output_location: ""`, and `skip_app_build: true`. The action builds the API by default; omit the unsupported `skip_api_build` input.
- Pass only `${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}` as the SWA deployment token. Do not echo secrets, write tokens into artifacts, or use a Cosmos key in GitHub Actions.
- The static config deployed from `dist/staticwebapp.config.json` sets the managed API runtime to Node 22. Do not add a custom domain or PR preview deployment in this release.

### I02. Operator runbook and production smoke verification

- Related Files:
  - `docs/azure-internal-deployment.md` :: add release, verification, rollback, and operations sections; modify.
  - `src/game/ui/menu.js` :: storage warning text should describe queued account sync; modify only if wording is inaccurate.

#### Details

- Runbook order: configure the existing single-tenant Entra app for SWA web login; enter its client ID/secret and Cosmos settings in SWA; add the SWA token to GitHub repository secrets; publish the reviewed code to `main`; set `AZURE_DEPLOY_ENABLED=true`; verify member and guest behavior.
- Production checks after deployment:
  - Open the default hostname signed out: the sign-in gate appears and no Phaser game starts.
  - Sign in as a tenant member: `/.auth/me` returns the `grill-member` role, game starts, save read/write and leaderboard read succeed.
  - Use a guest and a different-tenant account: game/API access is refused; no save or leaderboard data is returned.
  - Verify local settings, account cache isolation, legacy import prompt, and offline queue/recovery.
- Roll back by reverting the approved deployment commit on `main` and allowing the workflow to redeploy. Never roll back Cosmos database contents as a release rollback step.
- Document that offboarding retains display names and historical scores by default. When an administrator approves removal, delete the member's item from `player-saves` and every `leaderboards` board using the verified `userId` partition/item ID; preserve unrelated users.
- Document that API outage leaves local account progress queued, while company leaderboard data may be stale/unavailable until service recovers.
- The local `main` is ahead of `origin/main` by 10 commits with reviewed deployment changes. The user authorized their publication and the first deployment.

## Acceptance Criteria

- [x] The gated `main` workflow builds `dist/` and deploys the managed API with Node 22 when the deployment variable and token are configured.
- [x] SWA authentication is configured in `staticwebapp.config.json` without frontend auth variables.
- [x] Static build inputs use public app IDs only; Cosmos and deployment credentials remain server/GitHub secrets.
- [x] Runbook covers member/guest/wrong-tenant verification, outage sync, rollback, and targeted manual data deletion.
- [x] The reviewed deployment code was published after the user authorized release.
- [x] First production deployment succeeded from commit `9feb87d` on 2026-11-23: GitHub Actions run [45122328202](https://github.com/ks-ch0i/grilling.2/actions/runs/45122328202).
- [x] Anonymous smoke check: `/` redirects to `/.auth/login/aad`; `/.auth/me` returns HTTP 200; `/api/roles` redirects to sign-in. No signed-in identity or account data was used for this check.
- [ ] Signed-in company-member role, game load, save/leaderboard operations, guest sign-in denial, and wrong-tenant denial still require browser verification.

## Validation

- Run `npm run build` and `npm --prefix api run check` after implementation.
- Inspect the generated workflow and SWA build artifact for the expected Node 22 setting, `/api` payload, static config, and absence of secrets.
- Local build and API checks passed; the built `dist/` includes `staticwebapp.config.json` with `apiRuntime: node:22`, and no Cosmos/deployment credential identifiers were found in `dist/`.
- Production hostname is `https://happy-ocean-085e57100.6.azurestaticapps.net`; first release commit is `9feb87d`. Continue with the signed-in checks in I02.

## Commit Message

```text
ci(azure): deploy Grill-Me from approved main commits

Plan: 2026-11-22-internal-game-deployment
Phase: P03-azure-release
Task: T02-main-deploy-runbook

- Build the Vite site and managed Functions API on Node 22
- Deploy from main after identity and Cosmos configuration is ready
```

## Progress

- [x] Workflow and runbook implementation complete.
- [x] Local validation complete: `npm run build`, `npm --prefix api run check`, artifact/config inspection, and `git diff --check` passed. Vite reports the existing large Phaser bundle warning.
- [x] Configured the single-tenant `Grill-Me SPA` app for SWA sign-in and its web callback. The old API registration and delegated scope remain in Entra until production verification.
- [x] Configured all nine SWA Production API settings, including the Cosmos account key, without printing the key; verified setting names only.
- [x] Readiness audit on 2026-11-23: no organization-wide consent grant exists; GitHub repository `ks-ch0i/grilling.2` has no Actions variables, secrets, workflows, or workflow runs. SWA `repositoryUrl` and `branch` are unset.
- [x] GitHub deployment secret and `AZURE_DEPLOY_ENABLED=true` were present; first `main` deployment completed successfully. Entra sign-in/guest checks remain pending.
- [x] SWA Production settings were pruned to the four values consumed by the deployed app: `COSMOS_ENDPOINT`, `COSMOS_KEY`, `ENTRA_SWA_CLIENT_ID`, and `ENTRA_SWA_CLIENT_SECRET`.
- [ ] Signed-in company-member, guest, and wrong-tenant account checks remain pending.
- commit: deferred by the plan boundary; do not stage, commit, or push this worktree as part of this task.
