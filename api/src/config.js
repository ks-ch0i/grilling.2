const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUIRED_SCOPE = 'game.access';

function readGuid(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || !GUID_PATTERN.test(value.trim())) return null;
  return value.trim().toLowerCase();
}

function readScope(env) {
  const value = env.ENTRA_REQUIRED_SCOPE;
  return typeof value === 'string' && value.trim() === REQUIRED_SCOPE ? REQUIRED_SCOPE : null;
}

export function loadConfig(env = process.env) {
  const tenantId = readGuid(env, 'ENTRA_TENANT_ID');
  const spaClientId = readGuid(env, 'ENTRA_SPA_CLIENT_ID');
  const apiAudience = readGuid(env, 'ENTRA_API_AUDIENCE');
  const requiredScope = readScope(env);

  if (!tenantId || !spaClientId || !apiAudience || !requiredScope) return null;

  return Object.freeze({ tenantId, spaClientId, apiAudience, requiredScope });
}

// Read once during module startup. A missing or malformed setting leaves the API
// unavailable; request handlers never fall back to anonymous access.
export const config = loadConfig();
