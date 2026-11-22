import { CosmosClient } from '@azure/cosmos';
import { ApiError } from '../shared/http.js';

let cosmosClient;

export function getSaveContainer(config) {
  if (!config?.cosmosEndpoint || !config.cosmosKey || !config.cosmosDatabaseId || !config.cosmosSaveContainerId) {
    throw new ApiError(503, 'service_unavailable');
  }

  if (!cosmosClient) {
    cosmosClient = new CosmosClient({ endpoint: config.cosmosEndpoint, key: config.cosmosKey });
  }

  return cosmosClient.database(config.cosmosDatabaseId).container(config.cosmosSaveContainerId);
}
