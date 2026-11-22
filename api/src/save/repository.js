import { getSaveContainer } from '../cosmos/client.js';
import { ApiError } from '../shared/http.js';

function isNotFound(error) {
  return Number(error?.statusCode) === 404 || Number(error?.code) === 404;
}

function isPreconditionFailed(error) {
  return Number(error?.statusCode) === 412 || Number(error?.code) === 412;
}

export function createSaveRepository(config) {
  const container = getSaveContainer(config);

  return {
    async get(userId) {
      try {
        const response = await container.item(userId, userId).read();
        if (!response.resource) return null;
        return { document: response.resource, etag: response.etag ?? response.resource._etag ?? null };
      } catch (error) {
        if (isNotFound(error)) return null;
        throw new ApiError(503, 'service_unavailable');
      }
    },

    async upsert(document, etag = null) {
      try {
        await container.items.upsert(document, {
          partitionKey: document.userId,
          accessCondition: etag
            ? { type: 'IfMatch', condition: etag }
            : { type: 'IfNoneMatch', condition: '*' }
        });
        return true;
      } catch (error) {
        if (isPreconditionFailed(error)) return false;
        throw new ApiError(503, 'service_unavailable');
      }
    }
  };
}
