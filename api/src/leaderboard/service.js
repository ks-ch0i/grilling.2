import { canonicalBoardId } from './boardId.js';
import { createLeaderboardRepository } from './repository.js';

const STAGE_IDS = ['forest-1', 'mine-1'];
const ROUNDS = Array.from({ length: 8 }, (_, index) => index + 1);

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareResult(left, right) {
  if (left.elapsedTicks !== right.elapsedTicks) return left.elapsedTicks - right.elapsedTicks;
  return left.deaths - right.deaths;
}

function compareDisplayOrder(left, right) {
  return compareResult(left, right) || compareText(left.displayName, right.displayName) || compareText(left.userId, right.userId);
}

function entry(row, rank) {
  return { rank, displayName: row.displayName, elapsedTicks: row.elapsedTicks, deaths: row.deaths };
}

function rankBoard(rows, userId, boardId) {
  const ordered = [...rows].sort(compareDisplayOrder);
  let lastResult = null;
  let rank = 0;
  const ranked = ordered.map((row, index) => {
    if (!lastResult || compareResult(lastResult, row) !== 0) rank = index + 1;
    lastResult = row;
    return { row, rank };
  });
  const mine = ranked.find(({ row }) => row.userId === userId);
  return {
    boardId,
    totalParticipants: ranked.length,
    entries: ranked.slice(0, 10).map(({ row, rank: rowRank }) => entry(row, rowRank)),
    me: mine ? entry(mine.row, mine.rank) : null
  };
}

export function createLeaderboardService(config, { repositoryFactory = createLeaderboardRepository } = {}) {
  const repository = repositoryFactory(config);

  return {
    async refreshFromSave(document, principal) {
      const updatedAt = new Date().toISOString();
      const candidates = [];
      for (const stageId of STAGE_IDS) {
        const hardBest = document.records?.[stageId]?.best;
        if (hardBest) candidates.push({ mode: 'hard', stageId, best: hardBest });
        for (const round of ROUNDS) {
          const easyBest = document.easy?.roundRecords?.[stageId]?.[String(round)]?.best;
          if (easyBest) candidates.push({ mode: 'easy', stageId, round, best: easyBest });
        }
      }

      for (const candidate of candidates) {
        const boardId = canonicalBoardId(candidate);
        await repository.upsertBest({
          id: principal.userId,
          boardId,
          userId: principal.userId,
          tenantId: principal.tenantId,
          objectId: principal.objectId,
          displayName: principal.displayName,
          elapsedTicks: candidate.best.elapsedTicks,
          deaths: candidate.best.deaths,
          updatedAt
        });
      }
    },

    async getBoard(challenge, principal) {
      const rows = await repository.listBoard(challenge.boardId);
      return rankBoard(rows, principal.userId, challenge.boardId);
    }
  };
}
