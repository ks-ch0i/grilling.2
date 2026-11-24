import { ApiError } from '../shared/http.js';
import { compareHardProgress } from './hardProgress.js';
import { fromSaveDocument, normalizeCloudSave, toSaveDocument } from './schema.js';

const STAGE_IDS = ['forest-1', 'mine-1'];
const ROUND_KEYS = Array.from({ length: 8 }, (_, index) => String(index + 1));
const clone = (value) => structuredClone(value);

function bestRecord(existing, incoming) {
  if (existing === null) return incoming === null ? null : clone(incoming);
  if (incoming === null) return clone(existing);
  if (incoming.elapsedTicks < existing.elapsedTicks ||
    incoming.elapsedTicks === existing.elapsedTicks && incoming.deaths < existing.deaths) return clone(incoming);
  return clone(existing);
}

function mergeRecordPair(existing, incoming) {
  return {
    best: bestRecord(existing.best, incoming.best),
    recent: incoming.recent === null ? null : clone(incoming.recent)
  };
}

function mergeRecords(existing, incoming) {
  return Object.fromEntries(STAGE_IDS.map((stageId) => [stageId, mergeRecordPair(existing[stageId], incoming[stageId])]));
}

function mergeHardProgress(existing, incoming) {
  return Object.fromEntries(STAGE_IDS.map((stageId) => {
    const previous = existing[stageId];
    const next = incoming[stageId];
    const best = previous.best === null || (next.best !== null && compareHardProgress(next.best, previous.best) < 0)
      ? next.best
      : previous.best;
    return [stageId, { best, recent: next.recent ?? previous.recent }];
  }));
}

function mergeRoundRecords(existing, incoming) {
  return Object.fromEntries(STAGE_IDS.map((stageId) => [stageId,
    Object.fromEntries(ROUND_KEYS.map((round) => [round, mergeRecordPair(existing[stageId][round], incoming[stageId][round])]))
  ]));
}

function mergeRoundDeaths(existing, incoming) {
  return Object.fromEntries(STAGE_IDS.map((stageId) => [stageId,
    Object.fromEntries(ROUND_KEYS.map((round) => [round, Math.max(existing[stageId][round], incoming[stageId][round])]))
  ]));
}

export function mergeCloudSave(existing, incomingSave, principal, now = new Date().toISOString()) {
  const incoming = normalizeCloudSave(incomingSave);

  const current = existing === null ? null : fromSaveDocument(existing);
  if (existing !== null && existing.userId !== principal?.userId) throw new ApiError(503, 'service_unavailable');

  const previous = current ?? incoming;
  const unlockedStageIds = STAGE_IDS.filter((stageId) =>
    previous.unlockedStageIds.includes(stageId) || incoming.unlockedStageIds.includes(stageId));
  const easy = {
    unlockedRoundByStage: Object.fromEntries(STAGE_IDS.map((stageId) => [stageId,
      Math.max(previous.easy.unlockedRoundByStage[stageId], incoming.easy.unlockedRoundByStage[stageId])])),
    roundDeaths: mergeRoundDeaths(previous.easy.roundDeaths, incoming.easy.roundDeaths),
    roundRecords: mergeRoundRecords(previous.easy.roundRecords, incoming.easy.roundRecords)
  };
  const merged = {
    version: 8,
    run: incoming.run === null ? null : clone(incoming.run),
    unlockedStageIds,
    records: mergeRecords(previous.records, incoming.records),
    easy,
    hardProgress: mergeHardProgress(previous.hardProgress, incoming.hardProgress)
  };
  const revision = existing === null ? 1 : existing.revision + 1;
  const updatedAt = now instanceof Date ? now.toISOString() : now;

  return toSaveDocument(merged, principal, { revision, updatedAt });
}
