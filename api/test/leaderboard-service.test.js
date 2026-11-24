import assert from 'node:assert/strict';
import test from 'node:test';
import { createLeaderboardService } from '../src/leaderboard/service.js';

const principal = { userId: 'user-1', displayName: 'Player' };

test('refreshes Hard boards from progress while preserving Easy candidates', async () => {
  const writes = [];
  const service = createLeaderboardService({}, { repositoryFactory: () => ({
    upsertBest: async (value) => writes.push(value),
    listBoard: async () => []
  }) });

  await service.refreshFromSave({
    records: { 'forest-1': { best: { elapsedTicks: 100, deaths: 0 } } },
    hardProgress: {
      'forest-1': { best: { roundReached: 6, cleared: false, elapsedTicks: 1800, deaths: 3 } },
      'mine-1': { best: null, recent: null }
    },
    easy: { roundRecords: {
      'forest-1': { '1': { best: { elapsedTicks: 200, deaths: 1 } } },
      'mine-1': { '2': { best: { elapsedTicks: 300, deaths: 0 } } }
    } }
  }, principal);

  assert.deepEqual(writes.map(({ boardId, roundReached, cleared, elapsedTicks, deaths }) => ({
    boardId, roundReached, cleared, elapsedTicks, deaths
  })), [
    { boardId: 'hard:forest-1', roundReached: 6, cleared: false, elapsedTicks: 1800, deaths: 3 },
    { boardId: 'easy:forest-1:1', roundReached: undefined, cleared: undefined, elapsedTicks: 200, deaths: 1 },
    { boardId: 'easy:mine-1:2', roundReached: undefined, cleared: undefined, elapsedTicks: 300, deaths: 0 }
  ]);
  assert.ok(writes.every(({ updatedAt }) => Number.isFinite(Date.parse(updatedAt))));
});

test('returns Hard progress fields and normalizes legacy completion rows', async () => {
  const rows = [
    { id: 'user-1', userId: 'user-1', displayName: 'Player', boardId: 'hard:forest-1', roundReached: 4, cleared: false, elapsedTicks: 500, deaths: 1 },
    { id: 'user-2', userId: 'user-2', displayName: 'Legacy', boardId: 'hard:forest-1', elapsedTicks: 900, deaths: 4 }
  ];
  const service = createLeaderboardService({}, { repositoryFactory: () => ({
    upsertBest: async () => {},
    listBoard: async () => rows
  }) });

  const board = await service.getBoard({ mode: 'hard', boardId: 'hard:forest-1' }, principal);
  assert.equal(board.boardId, 'hard:forest-1');
  assert.equal(board.totalParticipants, 2);
  assert.deepEqual(board.entries, [
    { rank: 1, displayName: 'Legacy', roundReached: 8, cleared: true, elapsedTicks: 900, deaths: 4 },
    { rank: 2, displayName: 'Player', roundReached: 4, cleared: false, elapsedTicks: 500, deaths: 1 }
  ]);
  assert.deepEqual(board.me, board.entries[1]);
});

test('keeps Easy board entries and ordering unchanged', async () => {
  const rows = [
    { id: 'u2', userId: 'u2', displayName: 'Beta', boardId: 'easy:forest-1:1', elapsedTicks: 100, deaths: 5 },
    { id: 'u1', userId: 'u1', displayName: 'Alpha', boardId: 'easy:forest-1:1', elapsedTicks: 100, deaths: 2 }
  ];
  const service = createLeaderboardService({}, { repositoryFactory: () => ({
    upsertBest: async () => {},
    listBoard: async () => rows
  }) });

  const board = await service.getBoard({ mode: 'easy', boardId: 'easy:forest-1:1' }, { userId: 'u2' });
  assert.deepEqual(board.entries, [
    { rank: 1, displayName: 'Alpha', elapsedTicks: 100, deaths: 2 },
    { rank: 2, displayName: 'Beta', elapsedTicks: 100, deaths: 5 }
  ]);
});
