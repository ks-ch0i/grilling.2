const DATABASE_ID = 'pixel-raid';
const SAVE_CONTAINER_ID = 'player-saves';
const LEADERBOARD_CONTAINER_ID = 'leaderboards';

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
  const cosmosEndpoint = readCosmosEndpoint(env);
  const cosmosKey = readCosmosKey(env);
  const cosmosDatabaseId = readCosmosId(env, 'COSMOS_DATABASE_ID', DATABASE_ID);
  const cosmosSaveContainerId = readCosmosId(env, 'COSMOS_SAVE_CONTAINER_ID', SAVE_CONTAINER_ID);
  const cosmosLeaderboardContainerId = readCosmosId(env, 'COSMOS_LEADERBOARD_CONTAINER_ID', LEADERBOARD_CONTAINER_ID);

  if (!cosmosEndpoint || !cosmosKey || !cosmosDatabaseId ||
    !cosmosSaveContainerId || !cosmosLeaderboardContainerId) return null;

  return Object.freeze({
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
