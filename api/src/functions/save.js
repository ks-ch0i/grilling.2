import { config } from '../config.js';
import { requireEntraPrincipal } from '../auth/entraPrincipal.js';
import { createSaveRepository } from '../save/repository.js';
import { createLeaderboardService } from '../leaderboard/service.js';
import { fromSaveDocument, MAX_SAVE_BODY_BYTES, validateCloudSave } from '../save/schema.js';
import { mergeCloudSave } from '../save/merge.js';
import { ApiError, errorResponse, jsonResponse } from '../shared/http.js';

function invalidPayload() {
  return new ApiError(400, 'invalid_payload');
}

async function readJsonBody(request) {
  const contentType = request.headers.get('content-type');
  if (typeof contentType !== 'string' || !/^application\/json(?:\s*;|\s*$)/i.test(contentType)) throw invalidPayload();

  const contentLength = request.headers.get('content-length');
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_SAVE_BODY_BYTES)) throw invalidPayload();

  const reader = request.body?.getReader?.();
  if (!reader) throw invalidPayload();

  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SAVE_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        throw invalidPayload();
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size)));
  } catch {
    throw invalidPayload();
  }
}

async function getSave(request, repositoryFactory) {
  const principal = await requireEntraPrincipal(request, config);
  const repository = repositoryFactory(config);
  const current = await repository.get(principal.userId);
  if (current === null) return jsonResponse(200, { exists: false, save: null, revision: 0 });
  const { document } = current;
  if (document.userId !== principal.userId) throw new ApiError(503, 'service_unavailable');

  return jsonResponse(200, {
    exists: true,
    save: fromSaveDocument(document),
    revision: document.revision
  });
}

async function putSave(request, repositoryFactory, getLeaderboardService) {
  const principal = await requireEntraPrincipal(request, config);
  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'save') ||
    !validateCloudSave(body.save)) throw invalidPayload();

  const repository = repositoryFactory(config);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await repository.get(principal.userId);
    const document = mergeCloudSave(current?.document ?? null, body.save, principal, new Date().toISOString());
    if (await repository.upsert(document, current?.etag ?? null)) {
      await getLeaderboardService().refreshFromSave(document, principal);
      return jsonResponse(200, { saved: true, revision: document.revision, updatedAt: document.updatedAt });
    }
  }
  throw new ApiError(503, 'service_unavailable');
}

export function registerSaveFunction(functionApp, {
  repositoryFactory = createSaveRepository,
  leaderboardServiceFactory = createLeaderboardService
} = {}) {
  let leaderboardService;
  const getLeaderboardService = () => {
    leaderboardService ??= leaderboardServiceFactory(config);
    return leaderboardService;
  };

  functionApp.http('save', {
    route: 'save',
    methods: ['GET', 'PUT'],
    authLevel: 'anonymous',
    handler: async (request) => {
      try {
        if (request.method === 'GET') return await getSave(request, repositoryFactory);
        if (request.method === 'PUT') return await putSave(request, repositoryFactory, getLeaderboardService);
        return jsonResponse(405, { error: 'method_not_allowed' });
      } catch (error) {
        return errorResponse(error);
      }
    }
  });
}
