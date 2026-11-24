import assert from 'node:assert/strict';
import test from 'node:test';
import { compareResults, normalizeHardResult, rankBoard } from '../src/leaderboard/ranking.js';

test('ranks Hard progress by round, clear, deaths, then elapsed ticks', () => {
  const rows = [
    { userId: 'a', displayName: 'A', roundReached: 8, cleared: false, deaths: 0, elapsedTicks: 400 },
    { userId: 'b', displayName: 'B', roundReached: 8, cleared: true, deaths: 8, elapsedTicks: 900 },
    { userId: 'c', displayName: 'C', roundReached: 8, cleared: true, deaths: 2, elapsedTicks: 900 },
    { userId: 'd', displayName: 'D', roundReached: 8, cleared: true, deaths: 2, elapsedTicks: 700 },
    { userId: 'e', displayName: 'E', roundReached: 5, cleared: false, deaths: 0, elapsedTicks: 100 }
  ];

  const result = rankBoard(rows, 'a', 'hard:forest-1', 'hard');
  assert.deepEqual(result.entries.map(({ rank, displayName }) => [rank, displayName]), [
    [1, 'D'], [2, 'C'], [3, 'B'], [4, 'A'], [5, 'E']
  ]);
  assert.deepEqual(result.entries[0], {
    rank: 1, displayName: 'D', roundReached: 8, cleared: true, elapsedTicks: 700, deaths: 2
  });
  assert.deepEqual(normalizeHardResult({ elapsedTicks: 1200, deaths: 3 }), {
    roundReached: 8, cleared: true, elapsedTicks: 1200, deaths: 3
  });
});

test('gives exact result ties equal ranks regardless of display order', () => {
  const result = rankBoard([
    { userId: 'z', displayName: 'Zed', roundReached: 4, cleared: false, deaths: 2, elapsedTicks: 700 },
    { userId: 'a', displayName: 'Able', roundReached: 4, cleared: false, deaths: 2, elapsedTicks: 700 },
    { userId: 'm', displayName: 'Mia', roundReached: 3, cleared: false, deaths: 0, elapsedTicks: 10 }
  ], 'z', 'hard:mine-1', 'hard');

  assert.deepEqual(result.entries.map(({ rank, displayName }) => [rank, displayName]), [
    [1, 'Able'], [1, 'Zed'], [3, 'Mia']
  ]);
  assert.equal(result.me.rank, 1);
});

test('keeps Easy comparison by elapsed ticks, then deaths', () => {
  const rows = [
    { userId: 'a', displayName: 'A', elapsedTicks: 200, deaths: 0 },
    { userId: 'b', displayName: 'B', elapsedTicks: 100, deaths: 5 },
    { userId: 'c', displayName: 'C', elapsedTicks: 100, deaths: 2 }
  ];

  assert.ok(compareResults('easy', rows[2], rows[1]) < 0);
  const result = rankBoard(rows, 'a', 'easy:forest-1:1', 'easy');
  assert.deepEqual(result.entries.map(({ rank, displayName }) => [rank, displayName]), [
    [1, 'C'], [2, 'B'], [3, 'A']
  ]);
  assert.deepEqual(result.entries[0], { rank: 1, displayName: 'C', elapsedTicks: 100, deaths: 2 });
});

test('rejects partial or invalid Hard progress fields', () => {
  assert.throws(() => normalizeHardResult({ roundReached: 7, elapsedTicks: 10, deaths: 0 }), TypeError);
  assert.throws(() => normalizeHardResult({ roundReached: 7, cleared: true, elapsedTicks: 10, deaths: 0 }), TypeError);
  assert.throws(() => normalizeHardResult({ roundReached: 1, cleared: false, elapsedTicks: -1, deaths: 0 }), TypeError);
});
