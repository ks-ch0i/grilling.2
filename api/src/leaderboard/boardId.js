import { ApiError } from '../shared/http.js';

const STAGE_IDS = new Set(['forest-1', 'mine-1']);
const MODES = new Set(['easy', 'hard']);

function invalidChallenge() {
  return new ApiError(400, 'invalid_challenge');
}

export function canonicalBoardId({ mode, stageId, round }) {
  if (!MODES.has(mode) || !STAGE_IDS.has(stageId)) throw invalidChallenge();
  if (mode === 'hard') {
    if (round !== undefined) throw invalidChallenge();
    return `hard:${stageId}`;
  }
  if (!Number.isInteger(round) || round < 1 || round > 8) throw invalidChallenge();
  return `easy:${stageId}:${round}`;
}

export function parseBoardRequest(request) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    throw invalidChallenge();
  }

  const allowed = new Set(['mode', 'stageId', 'round']);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1) throw invalidChallenge();
  }

  const mode = url.searchParams.get('mode');
  const stageId = url.searchParams.get('stageId');
  const roundValue = url.searchParams.get('round');
  let round;
  if (roundValue !== null) {
    if (!/^[1-8]$/.test(roundValue)) throw invalidChallenge();
    round = Number(roundValue);
  }
  const boardId = canonicalBoardId({ mode, stageId, round });
  return { mode, stageId, ...(round === undefined ? {} : { round }), boardId };
}
