import assert from 'node:assert/strict';
import test from 'node:test';
import { createLeaderboardRepository } from '../src/leaderboard/repository.js';

function fakeContainer(initialRows = []) {
  const rows = new Map(initialRows.map((row) => [`${row.boardId}/${row.userId}`, row]));
  const queries = [];
  const writes = [];
  return {
    rows, queries, writes,
    item: (userId, boardId) => ({
      read: async () => {
        const resource = rows.get(`${boardId}/${userId}`);
        if (!resource) throw Object.assign(new Error('not found'), { statusCode: 404 });
        return { resource: structuredClone(resource), etag: resource._etag ?? 'test-etag' };
      }
    }),
    items: {
      upsert: async (document, options) => {
        writes.push({ document: structuredClone(document), options });
        rows.set(`${document.boardId}/${document.userId}`, structuredClone(document));
      },
      query: (query, options) => {
        queries.push({ query, options });
        return { fetchAll: async () => ({
          resources: [...rows.values()].filter(({ boardId }) => boardId === options.partitionKey)
            .map((row) => structuredClone(row))
        }) };
      }
    }
  };
}

const candidate = (overrides = {}) => ({
  id: 'user-1', userId: 'user-1', boardId: 'hard:forest-1', displayName: 'Player',
  roundReached: 5, cleared: false, elapsedTicks: 500, deaths: 0,
  updatedAt: '2026-11-24T00:00:00.000Z', ...overrides
});

test('normalizes legacy Hard rows as round-eight clears and preserves their best result', async () => {
  const legacy = {
    id: 'user-1', userId: 'user-1', boardId: 'hard:forest-1', displayName: 'Player',
    elapsedTicks: 1200, deaths: 3
  };
  const container = fakeContainer([legacy]);
  const repository = createLeaderboardRepository({}, { containerFactory: () => container });

  await repository.upsertBest(candidate());

  assert.equal(container.writes[0].document.roundReached, 8);
  assert.equal(container.writes[0].document.cleared, true);
  assert.equal(container.writes[0].document.elapsedTicks, 1200);
  assert.equal(container.writes[0].document.deaths, 3);
  assert.deepEqual(container.writes[0].options, {
    partitionKey: 'hard:forest-1', accessCondition: { type: 'IfMatch', condition: 'test-etag' }
  });
});

test('replaces legacy Hard progress with a better round-eight clear', async () => {
  const legacy = {
    id: 'user-1', userId: 'user-1', boardId: 'hard:forest-1', displayName: 'Player',
    elapsedTicks: 1200, deaths: 3
  };
  const container = fakeContainer([legacy]);
  const repository = createLeaderboardRepository({}, { containerFactory: () => container });

  await repository.upsertBest(candidate({ roundReached: 8, cleared: true, elapsedTicks: 1100, deaths: 2 }));

  assert.equal(container.writes[0].document.roundReached, 8);
  assert.equal(container.writes[0].document.cleared, true);
  assert.equal(container.writes[0].document.elapsedTicks, 1100);
  assert.equal(container.writes[0].document.deaths, 2);
});

test('rejects new Hard candidates without explicit progress fields', async () => {
  const container = fakeContainer();
  const repository = createLeaderboardRepository({}, { containerFactory: () => container });
  const { roundReached, cleared, ...legacyCandidate } = candidate();

  await assert.rejects(repository.upsertBest(legacyCandidate), { code: 'service_unavailable' });
  assert.equal(container.writes.length, 0);
});

test('keeps Easy stored fields and elapsed-time comparison unchanged', async () => {
  const existing = {
    id: 'user-1', userId: 'user-1', boardId: 'easy:forest-1:1', displayName: 'Player',
    elapsedTicks: 100, deaths: 2
  };
  const container = fakeContainer([existing]);
  const repository = createLeaderboardRepository({}, { containerFactory: () => container });

  await repository.upsertBest({
    id: 'user-1', userId: 'user-1', boardId: 'easy:forest-1:1', displayName: 'Player',
    elapsedTicks: 200, deaths: 0, updatedAt: '2026-11-24T00:00:00.000Z'
  });

  assert.deepEqual(container.writes[0].document, {
    id: 'user-1', boardId: 'easy:forest-1:1', userId: 'user-1', displayName: 'Player',
    elapsedTicks: 100, deaths: 2, updatedAt: '2026-11-24T00:00:00.000Z'
  });
  assert.equal(Object.hasOwn(container.writes[0].document, 'roundReached'), false);
  assert.equal(Object.hasOwn(container.writes[0].document, 'cleared'), false);
});

test('selects Hard progress fields and validates result rows when listing', async () => {
  const container = fakeContainer([candidate()]);
  const repository = createLeaderboardRepository({}, { containerFactory: () => container });

  const rows = await repository.listBoard('hard:forest-1');

  assert.equal(rows[0].roundReached, 5);
  assert.equal(rows[0].cleared, false);
  assert.match(container.queries[0].query.query, /roundReached/);
  assert.match(container.queries[0].query.query, /cleared/);
});
