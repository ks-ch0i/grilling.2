const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUIRED_SCOPE = 'game.access';
const DATABASE_ID = 'grill-me-game';
const SAVE_CONTAINER_ID = 'player-saves';
const LEADERBOARD_CONTAINER_ID = 'leaderboards';

function readGuid(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || !GUID_PATTERN.test(value.trim())) return null;
  return value.trim().toLowerCase();
}

function readScope(env) {
  const value = env.ENTRA_REQUIRED_SCOPE;
  return typeof value === 'string' && value.trim() === REQUIRED_SCOPE ? REQUIRED_SCOPE : null;
}

function readCosmosEndpoint(env) {
  const value = env.COSMOS_ENDPOINT;
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const endpoint = new URL(value.trim());
    if (endpoint.protocol !== 'https:' || endpoint.pathname !== '/' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return null;
    return endpoint.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function readCosmosKey(env) {
  const value = env.COSMOS_KEY;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readCosmosId(env, name, fallback) {
  const value = env[name];
  if (value === undefined || value === '') return fallback;
  return typeof value === 'string' && value.trim() === fallback ? fallback : null;
}

export function loadConfig(env = process.env) {
  const tenantId = readGuid(env, 'ENTRA_TENANT_ID');
  const spaClientId = readGuid(env, 'ENTRA_SPA_CLIENT_ID');
  const apiAudience = readGuid(env, 'ENTRA_API_AUDIENCE');
  const requiredScope = readScope(env);
  const cosmosEndpoint = readCosmosEndpoint(env);
  const cosmosKey = readCosmosKey(env);
  const cosmosDatabaseId = readCosmosId(env, 'COSMOS_DATABASE_ID', DATABASE_ID);
  const cosmosSaveContainerId = readCosmosId(env, 'COSMOS_SAVE_CONTAINER_ID', SAVE_CONTAINER_ID);
  const cosmosLeaderboardContainerId = readCosmosId(env, 'COSMOS_LEADERBOARD_CONTAINER_ID', LEADERBOARD_CONTAINER_ID);

  if (!tenantId || !spaClientId || !apiAudience || !requiredScope || !cosmosEndpoint || !cosmosKey || !cosmosDatabaseId ||
    !cosmosSaveContainerId || !cosmosLeaderboardContainerId) return null;

  return Object.freeze({
    tenantId,
    spaClientId,
    apiAudience,
    requiredScope,
    cosmosEndpoint,
    cosmosKey,
    cosmosDatabaseId,
    cosmosSaveContainerId,
    cosmosLeaderboardContainerId
  });
}

// Read once during module startup. Missing or malformed settings leave the API
// unavailable; request handlers never fall back to anonymous access or a client-selected database.
export const config = loadConfig();
