# Task: T02 Main Deployment and Operations Runbook

## Status: pending

## Goal

Deploy the approved frontend and managed API automatically from GitHub `main` after Azure/Entra settings are ready, and give operators a safe way to verify access, recover a release, and remove one member's data.

## Decision Summary

- Production trigger is a push to GitHub `main`; use the Azure-provided `azurestaticapps.net` hostname.
- Use GitHub Actions and `Azure/static-web-apps-deploy`; keep the SWA API token in `AZURE_STATIC_WEB_APPS_API_TOKEN` repository secret.
- Never push or commit the current dirty local worktree as part of this task. The user reviews which current local commits/edits should be published separately.

## Implementation

### I01. Main-branch build/deploy workflow

- Related Files:
  - `.github/workflows/azure-static-web-apps.yml` :: Node 22 build and SWA deployment; new.
  - `.gitignore` :: ensure local auth/API secrets remain ignored; modify only if required.
  - `package.json` and `package-lock.json` :: preserve deterministic Vite build; read-only unless a build script change is needed.

#### Details

- Trigger on `push` to `main` and `workflow_dispatch`. Use `actions/checkout`, setup Node 22 (compatible with the root `>=22.12.0` engine), then `npm ci`, `npm --prefix api ci`, `npm run build`, and `npm --prefix api run check`.
- Build the frontend with GitHub variables `VITE_AUTH_MODE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_SPA_CLIENT_ID`, and `VITE_ENTRA_API_SCOPE`. Fail the job if any required public auth variable is absent or if `VITE_AUTH_MODE` is not `entra`.
- Gate the deploy step on repository variable `AZURE_DEPLOY_ENABLED == "true"`; keep it unset until the SWA, app registrations/admin consent, API settings, Cosmos database, and deployment token are configured. Once enabled, every approved push to `main` automatically deploys.
- Deploy the already-built `dist` app and the `api/` Functions source with `Azure/static-web-apps-deploy@v1`, `app_location: "dist"`, `api_location: "api"`, `output_location: ""`, `skip_app_build: true`, and `skip_api_build: false`.
- Pass only `${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}` as the SWA deployment token. Do not echo secrets, write tokens into artifacts, or use a Cosmos key in GitHub Actions.
- The static config deployed from `dist/staticwebapp.config.json` sets the managed API runtime to Node 22. Do not add a custom domain or PR preview deployment in this release.

### I02. Operator runbook and production smoke verification

- Related Files:
  - `docs/azure-internal-deployment.md` :: add release, verification, rollback, and operations sections; modify.
  - `src/game/ui/menu.js` :: storage warning text should describe queued account sync; modify only if wording is inaccurate.

#### Details

- Runbook order: deploy Bicep; create both tenant-only registrations and obtain admin consent; enter server-only settings in Static Web Apps; add public GitHub variables and the SWA token secret; confirm remote `main` contains only approved code; then set `AZURE_DEPLOY_ENABLED=true`.
- Production checks after deployment:
  - Open the default hostname signed out: the sign-in gate appears and no Phaser game starts.
  - Sign in as a tenant member: `/api/account` succeeds, game starts, save read/write and one leaderboard read succeed.
  - Use a guest and a different-tenant account: game/API access is refused; no save or leaderboard data is returned.
  - Verify local settings, account cache isolation, legacy import prompt, and offline queue/recovery.
- Roll back by reverting the approved deployment commit on `main` and allowing the workflow to redeploy. Never roll back Cosmos database contents as a release rollback step.
- Document that offboarding retains display names and historical scores by default. When an administrator approves removal, delete the member's item from `player-saves` and every `leaderboards` board using the verified `userId` partition/item ID; preserve unrelated users.
- Document that API outage leaves local account progress queued, while company leaderboard data may be stale/unavailable until service recovers.
- The current worktree is observed ahead of `origin/main` by 14 commits and has additional modifications/untracked files. The workflow cannot deploy those until they are reviewed and intentionally published; this task itself must not stage, commit, or push them.

## Acceptance Criteria

- [ ] A ready, enabled `main` push deploys both `dist/` and the managed API with Node 22.
- [ ] Missing auth build variables stop deployment; no production build falls back to an unauthenticated local mode.
- [ ] Static assets contain public app IDs only; Cosmos and deployment credentials remain server/GitHub secrets.
- [ ] Runbook covers member/guest/wrong-tenant verification, outage sync, rollback, and targeted manual data deletion.
- [ ] The current local worktree is left unchanged by this task.

## Validation

- Run `npm run build` and `npm --prefix api run check` after implementation.
- Inspect the generated workflow and SWA build artifact for the expected Node 22 setting, `/api` payload, static config, and absence of secrets.
- After user-approved deployment, complete the production smoke checks in I02 and record the resulting hostname and commit SHA in the runbook.

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

- [ ] Implementation complete
- [ ] Validation complete
- commit: pending
