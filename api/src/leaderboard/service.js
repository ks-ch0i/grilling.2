import { canonicalBoardId } from './boardId.js';
import { rankBoard } from './ranking.js';
import { createLeaderboardRepository } from './repository.js';

const STAGE_IDS = ['forest-1', 'mine-1'];
const ROUNDS = Array.from({ length: 8 }, (_, index) => index + 1);

export function createLeaderboardService(config, { repositoryFactory = createLeaderboardRepository } = {}) {
  const repository = repositoryFactory(config);

  return {
    async refreshFromSave(document, principal) {
      const updatedAt = new Date().toISOString();
      const candidates = [];
      for (const stageId of STAGE_IDS) {
        const hardBest = document.hardProgress?.[stageId]?.best;
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
          displayName: principal.displayName,
          ...(candidate.mode === 'hard' ? {
            roundReached: candidate.best.roundReached,
            cleared: candidate.best.cleared
          } : {}),
          elapsedTicks: candidate.best.elapsedTicks,
          deaths: candidate.best.deaths,
          updatedAt
        });
      }
    },

    async getBoard(challenge, principal) {
      const rows = await repository.listBoard(challenge.boardId);
      return rankBoard(rows, principal.userId, challenge.boardId, challenge.mode);
    }
  };
}
