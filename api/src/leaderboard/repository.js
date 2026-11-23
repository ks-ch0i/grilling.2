import { getLeaderboardContainer } from '../cosmos/client.js';
import { ApiError } from '../shared/http.js';

const MAX_ATTEMPTS = 5;

function isNotFound(error) {
  return Number(error?.statusCode) === 404 || Number(error?.code) === 404;
}

function isPreconditionFailed(error) {
  return Number(error?.statusCode) === 412 || Number(error?.code) === 412;
}

function isValidStoredRow(row, boardId, userId) {
  return row && typeof row.id === 'string' && row.id === userId &&
    typeof row.userId === 'string' && row.userId === userId && row.boardId === boardId &&
    Number.isSafeInteger(row.elapsedTicks) && row.elapsedTicks >= 0 &&
    Number.isSafeInteger(row.deaths) && row.deaths >= 0 &&
    typeof row.displayName === 'string' && [...row.displayName.trim()].length > 0 && [...row.displayName].length <= 80;
}

function compareResult(left, right) {
  if (left.elapsedTicks !== right.elapsedTicks) return left.elapsedTicks - right.elapsedTicks;
  return left.deaths - right.deaths;
}

export function createLeaderboardRepository(config) {
  const container = getLeaderboardContainer(config);

  async function read(boardId, userId) {
    try {
      const response = await container.item(userId, boardId).read();
      if (!response.resource) return null;
      if (!isValidStoredRow(response.resource, boardId, userId)) throw new ApiError(503, 'service_unavailable');
      return { resource: response.resource, etag: response.etag ?? response.resource._etag ?? null };
    } catch (error) {
      if (isNotFound(error)) return null;
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, 'service_unavailable');
    }
  }

  return {
    async upsertBest(candidate) {
      const { boardId, userId } = candidate;
      if (!isValidStoredRow({ ...candidate, id: userId }, boardId, userId)) {
        throw new ApiError(503, 'service_unavailable');
      }

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const current = await read(boardId, userId);
        const best = current && compareResult(current.resource, candidate) < 0 ? current.resource : candidate;
        const document = {
          id: userId,
          boardId,
          userId,
          displayName: candidate.displayName,
          elapsedTicks: best.elapsedTicks,
          deaths: best.deaths,
          updatedAt: candidate.updatedAt
        };

        try {
          await container.items.upsert(document, {
            partitionKey: boardId,
            accessCondition: current?.etag
              ? { type: 'IfMatch', condition: current.etag }
              : { type: 'IfNoneMatch', condition: '*' }
          });
          return;
        } catch (error) {
          if (isPreconditionFailed(error)) continue;
          throw new ApiError(503, 'service_unavailable');
        }
      }
      throw new ApiError(503, 'service_unavailable');
    },

    async listBoard(boardId) {
      try {
        const query = {
          query: 'SELECT c.id, c.boardId, c.userId, c.displayName, c.elapsedTicks, c.deaths FROM c WHERE c.boardId = @boardId',
          parameters: [{ name: '@boardId', value: boardId }]
        };
        const { resources } = await container.items.query(query, { partitionKey: boardId }).fetchAll();
        if (!Array.isArray(resources) || resources.some((row) => !isValidStoredRow(row, boardId, row?.userId))) {
          throw new ApiError(503, 'service_unavailable');
        }
        return resources;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(503, 'service_unavailable');
      }
    }
  };
}
