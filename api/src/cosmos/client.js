import { CosmosClient } from '@azure/cosmos';
import { ApiError } from '../shared/http.js';

let cosmosClient;

function getDatabase(config) {
  if (!config?.cosmosEndpoint || !config.cosmosKey || !config.cosmosDatabaseId) {
    throw new ApiError(503, 'service_unavailable');
  }

  if (!cosmosClient) {
    cosmosClient = new CosmosClient({ endpoint: config.cosmosEndpoint, key: config.cosmosKey });
  }

  return cosmosClient.database(config.cosmosDatabaseId);
}

export function getSaveContainer(config) {
  if (!config?.cosmosSaveContainerId) throw new ApiError(503, 'service_unavailable');
  return getDatabase(config).container(config.cosmosSaveContainerId);
}

export function getLeaderboardContainer(config) {
  if (!config?.cosmosLeaderboardContainerId) throw new ApiError(503, 'service_unavailable');
  return getDatabase(config).container(config.cosmosLeaderboardContainerId);
}
