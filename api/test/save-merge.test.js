import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeCloudSave } from '../src/save/merge.js';
import { FOREST_STAGE } from '../../src/game/content/forestStage.js';
import { createStageRun, snapshotStageRun } from '../../src/game/sim/stage.js';
import { freshSave, toCloudSave } from '../../src/game/storage/saveStore.js';

const principal = { userId: 'user-1', displayName: 'Player' };
const updatedAt = '2026-11-24T04:05:06.000Z';
const metadata = { id: principal.userId, ...principal, revision: 2, updatedAt: '2026-11-24T04:00:00.000Z' };
const progress = (roundReached, cleared, deaths, elapsedTicks) => ({ roundReached, cleared, deaths, elapsedTicks });

function cloudFixture() {
  const save = freshSave();
  save.run = snapshotStageRun(createStageRun(FOREST_STAGE, {}, { seed: 456, startRound: 3 }));
  return toCloudSave(save);
}

function legacyFixture(save, version) {
  const { hardProgress, ...legacy } = structuredClone(save);
  legacy.version = version;
  if (version === 6) delete legacy.run.player.airborneTicks;
  return legacy;
}

test('merges legacy documents and incoming saves into canonical v8', () => {
  const current = cloudFixture();
  const incoming = cloudFixture();
  current.unlockedStageIds.push('mine-1');
  current.records['forest-1'] = { best: { elapsedTicks: 100, deaths: 4 }, recent: { elapsedTicks: 110, deaths: 4 } };
  incoming.records['forest-1'] = { best: { elapsedTicks: 125, deaths: 1 }, recent: null };
  current.easy.unlockedRoundByStage['forest-1'] = 4;
  incoming.easy.unlockedRoundByStage['forest-1'] = 3;
  current.easy.unlockedRoundByStage['mine-1'] = 1;
  incoming.easy.unlockedRoundByStage['mine-1'] = 2;
  current.easy.roundDeaths['forest-1']['1'] = 6;
  incoming.easy.roundDeaths['forest-1']['1'] = 5;
  incoming.easy.roundDeaths['forest-1']['2'] = 2;
  current.easy.roundRecords['forest-1']['1'] = {
    best: { elapsedTicks: 200, deaths: 1 },
    recent: { elapsedTicks: 250, deaths: 2 }
  };
  incoming.easy.roundRecords['forest-1']['1'] = { best: { elapsedTicks: 200, deaths: 0 }, recent: null };
  incoming.easy.roundRecords['forest-1']['2'].recent = { elapsedTicks: 210, deaths: 0 };

  const merged = mergeCloudSave({ ...metadata, ...legacyFixture(current, 6) }, legacyFixture(incoming, 7), principal, new Date(updatedAt));
  const expected = cloudFixture();
  expected.unlockedStageIds.push('mine-1');
  expected.records['forest-1'] = { best: { elapsedTicks: 100, deaths: 4 }, recent: null };
  expected.hardProgress['forest-1'] = { best: progress(8, true, 1, 125), recent: progress(8, true, 4, 110) };
  expected.easy.unlockedRoundByStage = { 'forest-1': 4, 'mine-1': 2 };
  expected.easy.roundDeaths['forest-1']['1'] = 6;
  expected.easy.roundDeaths['forest-1']['2'] = 2;
  expected.easy.roundRecords['forest-1']['1'] = { best: { elapsedTicks: 200, deaths: 0 }, recent: null };
  expected.easy.roundRecords['forest-1']['2'].recent = { elapsedTicks: 210, deaths: 0 };
  assert.deepEqual(merged, { ...metadata, ...expected, revision: 3, updatedAt });
});

test('merges canonical Hard best by progress and accepts any non-null incoming recent', () => {
  const current = cloudFixture();
  const incoming = cloudFixture();
  current.hardProgress['forest-1'] = { best: progress(8, true, 9, 100), recent: progress(6, false, 0, 150) };
  incoming.hardProgress['forest-1'] = { best: progress(8, false, 0, 90), recent: progress(2, false, 1, 10) };
  current.hardProgress['mine-1'].best = progress(5, false, 0, 100);
  incoming.hardProgress['mine-1'].best = progress(6, false, 1, 125);
  const merged = mergeCloudSave({ ...metadata, ...current }, incoming, principal, updatedAt);
  assert.equal(merged.version, 8);
  assert.deepEqual(merged.hardProgress, {
    'forest-1': { best: current.hardProgress['forest-1'].best, recent: incoming.hardProgress['forest-1'].recent },
    'mine-1': { best: incoming.hardProgress['mine-1'].best, recent: null }
  });
  assert.deepEqual(merged.run, incoming.run);
  assert.notEqual(merged.run, incoming.run);
});

test('replaces an existing run with the incoming run including a null run', () => {
  const current = { ...metadata, ...cloudFixture() };
  const incoming = cloudFixture();
  incoming.run.elapsedTicks = 120;
  assert.deepEqual(mergeCloudSave(current, incoming, principal, updatedAt).run, incoming.run);
  incoming.run = null;
  assert.equal(mergeCloudSave(current, incoming, principal, updatedAt).run, null);
});

test('creates at revision one from a legacy save with no existing document', () => {
  const save = cloudFixture();
  const document = mergeCloudSave(null, legacyFixture(save, 6), principal, updatedAt);
  assert.deepEqual(document, { ...metadata, ...save, revision: 1, updatedAt });
});
