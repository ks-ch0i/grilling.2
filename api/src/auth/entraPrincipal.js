import * as jose from 'jose';
import { ApiError } from '../shared/http.js';

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const jwksByTenant = new Map();

function unauthorized() {
  return new ApiError(401, 'unauthorized');
}

function forbidden() {
  return new ApiError(403, 'forbidden');
}

function unavailable() {
  return new ApiError(503, 'service_unavailable');
}

function isValidConfig(config) {
  return Boolean(
    config &&
    GUID_PATTERN.test(config.tenantId) &&
    GUID_PATTERN.test(config.spaClientId) &&
    GUID_PATTERN.test(config.apiAudience) &&
    config.requiredScope === 'game.access'
  );
}

function getTenantJwks(tenantId) {
  let jwks = jwksByTenant.get(tenantId);
  if (!jwks) {
    const url = new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`);
    jwks = jose.createRemoteJWKSet(url);
    jwksByTenant.set(tenantId, jwks);
  }
  return jwks;
}

function readBearerToken(request) {
  const authorization = request?.headers?.get?.('authorization');
  if (typeof authorization !== 'string' || !/^Bearer [^\s,]+$/i.test(authorization)) {
    throw unauthorized();
  }
  return authorization.slice(7);
}

function isGuid(value) {
  return typeof value === 'string' && GUID_PATTERN.test(value);
}

export async function requireEntraPrincipal(request, config) {
  if (!isValidConfig(config)) throw unavailable();

  const token = readBearerToken(request);
  let payload;

  try {
    ({ payload } = await jose.jwtVerify(token, getTenantJwks(config.tenantId), {
      algorithms: ['RS256'],
      audience: config.apiAudience,
      requiredClaims: ['exp']
    }));
  } catch (error) {
    if (error instanceof jose.errors.JWKSTimeout) throw unavailable();
    if (error instanceof jose.errors.JOSEError) throw unauthorized();
    // Network or key-provider failures are service failures, not evidence of a bad token.
    throw unavailable();
  }

  const expectedIssuer = `https://login.microsoftonline.com/${config.tenantId}/v2.0`;
  if (payload.iss !== expectedIssuer) throw forbidden();
  if (!isGuid(payload.aud) || payload.aud.toLowerCase() !== config.apiAudience) throw unauthorized();
  if (typeof payload.tid !== 'string' || payload.tid.toLowerCase() !== config.tenantId) throw forbidden();
  if (payload.acct !== 0 && payload.acct !== '0') throw forbidden();
  if (!isGuid(payload.azp) || payload.azp.toLowerCase() !== config.spaClientId) throw forbidden();
  if (typeof payload.scp !== 'string' || !payload.scp.split(/\s+/).includes(config.requiredScope)) throw forbidden();
  if (!isGuid(payload.oid)) throw forbidden();
  if (typeof payload.name !== 'string') throw forbidden();

  const displayName = payload.name.trim();
  if (!displayName || [...displayName].length > 80) throw forbidden();

  const objectId = payload.oid.toLowerCase();
  return {
    tenantId: config.tenantId,
    objectId,
    userId: `${config.tenantId}:${objectId}`,
    displayName
  };
}
