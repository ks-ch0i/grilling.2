import assert from 'node:assert/strict';
import test from 'node:test';
import { compareHardProgress, completionProgressFromRecords } from '../src/save/hardProgress.js';

const progress = (roundReached, cleared, deaths, elapsedTicks) => ({ roundReached, cleared, deaths, elapsedTicks });

test('compares Hard progress by round, clear, deaths, then elapsed ticks', () => {
  const orderedPairs = [
    [progress(8, false, 9, 900), progress(7, false, 0, 100)],
    [progress(8, true, 9, 900), progress(8, false, 0, 100)],
    [progress(8, true, 1, 900), progress(8, true, 2, 100)],
    [progress(8, true, 1, 100), progress(8, true, 1, 900)]
  ];
  for (const [better, worse] of orderedPairs) {
    assert.ok(compareHardProgress(better, worse) < 0);
    assert.ok(compareHardProgress(worse, better) > 0);
  }
  assert.equal(compareHardProgress(orderedPairs[0][0], { ...orderedPairs[0][0] }), 0);
});

test('converts completion records for every stage and preserves null slots', () => {
  const records = {
    'forest-1': { best: { elapsedTicks: 100, deaths: 0 }, recent: { elapsedTicks: 130, deaths: 3 } },
    'mine-1': { best: null, recent: { elapsedTicks: 160, deaths: 1 } }
  };
  assert.deepEqual(completionProgressFromRecords(records), {
    'forest-1': { best: progress(8, true, 0, 100), recent: progress(8, true, 3, 130) },
    'mine-1': { best: null, recent: progress(8, true, 1, 160) }
  });
});
