# Task: T01 Entra API Authentication

## Status: done

## Goal

Create the Node 22 managed Functions API foundation and a single reusable verifier that accepts only Grill-Me SPA access tokens for a member of the configured company tenant. The verifier must produce a canonical account identity for all later Cosmos handlers.

## Decision Summary

- Hosting is Static Web Apps Free with managed Functions at `/api`; custom SWA OIDC and `x-ms-client-principal` are not used.
- The browser is a public MSAL client. It requests one delegated scope from a separately registered single-tenant API app. The API requires a signed v2 access token, exact tenant/audience/client/scope, valid object ID and display name, and `acct=0`.
- No Microsoft Graph permissions, client secret, or API key is needed for Entra token validation.

## Implementation

### I01. Node 22 Functions application and configuration

- Related Files:
  - `api/package.json` :: managed Functions Node package and `check` script; new.
  - `api/host.json` :: Functions host settings; new.
  - `api/src/index.js` :: register HTTP handlers; new.
  - `api/src/config.js` :: validate required server settings at startup; new.
  - `api/src/shared/http.js` :: JSON/no-store responses and safe error mapping; new.

#### Details

- Use ESM (`"type": "module"`), Node engine `>=22 <23`, Azure Functions Node programming model v4, `@azure/functions` 4.x, and `jose` 6.x. Cosmos SDK is added by T02.
- Required server settings: `ENTRA_TENANT_ID`, `ENTRA_SPA_CLIENT_ID`, `ENTRA_API_AUDIENCE`, and `ENTRA_REQUIRED_SCOPE`. Missing or malformed settings fail closed and make the API return a generic service-unavailable response; never fall back to anonymous access.
- `api/host.json` uses Functions host version `2.0`. Register HTTP functions through `app.http` from `@azure/functions`.
- Add `npm run check` that runs `node --check` on `src/index.js`, `src/auth/entraPrincipal.js`, and `src/functions/account.js`.

### I02. Verify Entra access tokens and derive identity

- Related Files:
  - `api/src/auth/entraPrincipal.js` :: `requireEntraPrincipal(request, config)`; new.
  - `api/src/config.js` :: read the four Entra settings; modify.

#### Details

- **Signature**: `async function requireEntraPrincipal(request, config): Promise<{tenantId:string, objectId:string, userId:string, displayName:string}>`.
- Require exactly one `Authorization: Bearer <token>` header. Validate with `jose.jwtVerify` and a cached `createRemoteJWKSet(new URL("https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys"))`.
- Require issuer `https://login.microsoftonline.com/{tenantId}/v2.0`, audience equal to `ENTRA_API_AUDIENCE` (the API registration's client ID), and algorithm `RS256`.
- After signature validation, require all of:
  - `tid` equals `ENTRA_TENANT_ID`.
  - `azp` equals `ENTRA_SPA_CLIENT_ID`.
  - `scp` contains the exact `ENTRA_REQUIRED_SCOPE` value `game.access`.
  - `oid` is a non-empty Entra object-ID GUID.
  - `acct` is the string or number zero. Missing claim, guest value `1`, or any other value is denied.
  - `name` is a non-empty string after trimming, at most 80 characters; use it only for display.
- Derive `userId` only on the server as `${tid}:${oid}`. Never accept `tenantId`, `objectId`, `userId`, display name, or Cosmos container names from request parameters/body as identity.
- Return HTTP 401 for missing, expired, malformed, or invalid-signature tokens; HTTP 403 for wrong tenant, guest, wrong SPA, or missing delegated scope. Responses contain no token, claim dump, or key material.
- Do not read `x-ms-client-principal`; the Free Static Web Apps default principal does not carry the claims needed for this policy.

### I03. Authenticated account endpoint

- Related Files:
  - `api/src/functions/account.js` :: `GET /api/account`; new.
  - `api/src/index.js` :: import and register the account function; modify.
  - `api/src/shared/http.js` :: consistent JSON and `Cache-Control: no-store`; modify.

#### Details

- Register with route `account`, method `GET`, and Functions `authLevel: "anonymous"`; the handler itself invokes `requireEntraPrincipal` because Entra Bearer validation is the API authorization boundary.
- Success body: `{ userId, tenantId, objectId, displayName }`. Set `Cache-Control: no-store`; do not return email, access token, or refresh token.
- Use the same `requireEntraPrincipal` function for every later private API endpoint.

## Acceptance Criteria

- [x] API startup fails closed if any required Entra setting is missing.
- [x] Only a valid v2 access token for the configured API, SPA, scope, and tenant with `acct=0` returns an account identity.
- [x] Guest, wrong-tenant, anonymous, wrong-audience, wrong-client, and expired-token requests receive 401/403 and no account data.
- [x] The handler derives its identity exclusively from verified JWT claims.

## Validation

- Run `npm --prefix api run check` after implementation.
- A local synthetic RS256 token smoke check covers the configured member claims and denial cases without storing a token or adding a test file.
- Review the actual API registration and one member access token to confirm the emitted `tid`, `oid`, `acct`, `name`, `aud`, `azp`, `iss`, and `scp` values during P03 Azure/Entra provisioning. Those registrations do not exist yet, so this live integration check is deferred and must not be represented as already verified. Do not log or commit the token.

## Commit Message

```text
feat(api): validate Grill-Me Entra member tokens

Plan: 2026-11-22-internal-game-deployment
Phase: P01-api-and-data
Task: T01-entra-api-auth

- Add the Node 22 managed Functions API foundation
- Verify tenant, member, audience, client, and delegated scope claims
```

## Progress

- [x] Implementation complete
- [x] Local validation complete
- [ ] Live Entra registration/token claim review deferred to P03 provisioning
- commit: d8f0f54
