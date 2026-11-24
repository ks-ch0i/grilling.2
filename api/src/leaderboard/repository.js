import { getLeaderboardContainer } from '../cosmos/client.js';
import { ApiError } from '../shared/http.js';
import { compareResults, normalizeHardResult } from './ranking.js';

const MAX_ATTEMPTS = 5;

function isNotFound(error) {
  return Number(error?.statusCode) === 404 || Number(error?.code) === 404;
}

function isPreconditionFailed(error) {
  return Number(error?.statusCode) === 412 || Number(error?.code) === 412;
}

function isValidStoredRow(row, boardId, userId) {
  const validBase = row && typeof row.id === 'string' && row.id === userId &&
    typeof row.userId === 'string' && row.userId === userId && row.boardId === boardId &&
    Number.isSafeInteger(row.elapsedTicks) && row.elapsedTicks >= 0 &&
    Number.isSafeInteger(row.deaths) && row.deaths >= 0 &&
    typeof row.displayName === 'string' && [...row.displayName.trim()].length > 0 && [...row.displayName].length <= 80;
  if (!validBase) return false;
  if (!boardId.startsWith('hard:')) return true;
  try {
    normalizeHardResult(row);
    return true;
  } catch {
    return false;
  }
}

export function createLeaderboardRepository(config, { containerFactory = getLeaderboardContainer } = {}) {
  const container = containerFactory(config);

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
      const isHardBoard = boardId.startsWith('hard:');
      if (!isValidStoredRow({ ...candidate, id: userId }, boardId, userId) ||
          (isHardBoard && (!Object.hasOwn(candidate, 'roundReached') || !Object.hasOwn(candidate, 'cleared')))) {
        throw new ApiError(503, 'service_unavailable');
      }

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const current = await read(boardId, userId);
        const mode = boardId.startsWith('hard:') ? 'hard' : 'easy';
        const currentResult = current && (mode === 'hard' ? normalizeHardResult(current.resource) : current.resource);
        const candidateResult = mode === 'hard' ? normalizeHardResult(candidate) : candidate;
        const best = current && compareResults(mode, currentResult, candidateResult) < 0
          ? currentResult
          : candidateResult;
        const document = {
          id: userId,
          boardId,
          userId,
          displayName: candidate.displayName,
          elapsedTicks: best.elapsedTicks,
          deaths: best.deaths,
          updatedAt: candidate.updatedAt
        };
        if (mode === 'hard') {
          document.roundReached = best.roundReached;
          document.cleared = best.cleared;
        }

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
        const scoreFields = boardId.startsWith('hard:') ? ', c.roundReached, c.cleared' : '';
        const query = {
          query: `SELECT c.id, c.boardId, c.userId, c.displayName, c.elapsedTicks, c.deaths${scoreFields} FROM c WHERE c.boardId = @boardId`,
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
