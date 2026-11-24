import assert from 'node:assert/strict';
import test from 'node:test';
import * as schema from '../src/save/schema.js';
import { FOREST_STAGE } from '../../src/game/content/forestStage.js';
import { createStageRun, snapshotStageRun } from '../../src/game/sim/stage.js';
import { freshSave, isValidCloudSave, toCloudSave } from '../../src/game/storage/saveStore.js';

const principal = { userId: 'user-1', displayName: 'Player' };
const updatedAt = '2026-11-24T04:05:06.000Z';
const metadata = { id: principal.userId, ...principal, revision: 3, updatedAt };

function cloudFixture() {
  const save = freshSave();
  save.run = snapshotStageRun(createStageRun(FOREST_STAGE, {}, { seed: 123, startRound: 3 }));
  save.run.player.airborneTicks = 5;
  save.unlockedStageIds.push('mine-1');
  save.easy.unlockedRoundByStage['forest-1'] = 4;
  save.easy.roundDeaths['forest-1']['3'] = 2;
  save.easy.roundRecords['forest-1']['3'].best = { elapsedTicks: 100, deaths: 0 };
  return toCloudSave(save);
}

function legacyFixture(version, { omitAirborneTicks = false } = {}) {
  const { hardProgress, ...save } = cloudFixture();
  save.version = version;
  if (omitAirborneTicks) delete save.run.player.airborneTicks;
  return save;
}

test('accepts canonical v8 Hard progress and a v8 run', () => {
  const save = cloudFixture();
  save.hardProgress['forest-1'] = {
    best: { roundReached: 8, cleared: true, elapsedTicks: 200, deaths: 1 },
    recent: { roundReached: 3, cleared: false, elapsedTicks: 100, deaths: 2 }
  };
  assert.equal(schema.validateCloudSave(save), true);
});

test('requires exact v8 Hard progress shapes and valid counter values', async (t) => {
  const validResult = { roundReached: 8, cleared: true, elapsedTicks: 200, deaths: 1 };
  const cases = {
    'missing progress': (save) => { delete save.hardProgress; },
    'extra stage': (save) => { save.hardProgress.unknown = { best: null, recent: null }; },
    'missing stage': (save) => { delete save.hardProgress['mine-1']; },
    'missing pair key': (save) => { delete save.hardProgress['forest-1'].recent; },
    'extra pair key': (save) => { save.hardProgress['forest-1'].other = null; },
    'extra result key': (save) => { save.hardProgress['forest-1'].best.other = 1; },
    'missing result key': (save) => { delete save.hardProgress['forest-1'].best.deaths; },
    'round below 1': (save) => { save.hardProgress['forest-1'].best.roundReached = 0; },
    'round above 8': (save) => { save.hardProgress['forest-1'].best.roundReached = 9; },
    'fractional round': (save) => { save.hardProgress['forest-1'].best.roundReached = 7.5; },
    'clear before round 8': (save) => { save.hardProgress['forest-1'].best.roundReached = 7; },
    'non-boolean clear': (save) => { save.hardProgress['forest-1'].best.cleared = 1; },
    'negative ticks': (save) => { save.hardProgress['forest-1'].best.elapsedTicks = -1; },
    'unsafe deaths': (save) => { save.hardProgress['forest-1'].best.deaths = Number.MAX_SAFE_INTEGER + 1; }
  };

  for (const [name, mutate] of Object.entries(cases)) {
    await t.test(name, () => {
      const save = cloudFixture();
      save.hardProgress['forest-1'].best = { ...validResult };
      mutate(save);
      assert.equal(schema.validateCloudSave(save), false);
    });
  }
});

test('validates airborne ticks on each supported version', () => {
  assert.equal(schema.validateCloudSave(legacyFixture(6)), true);
  assert.equal(schema.validateCloudSave(legacyFixture(7)), true);
  assert.equal(schema.validateCloudSave(legacyFixture(6, { omitAirborneTicks: true })), true);
  assert.equal(schema.validateCloudSave(legacyFixture(7, { omitAirborneTicks: true })), true);
  const save = cloudFixture();
  delete save.run.player.airborneTicks;
  assert.equal(schema.validateCloudSave(save), false);
  for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    for (const version of [6, 7, 8]) {
      const payload = version === 8 ? cloudFixture() : legacyFixture(version);
      payload.run.player.airborneTicks = invalid;
      assert.equal(schema.validateCloudSave(payload), false);
    }
  }
});

test('legacy payloads reject Hard progress and unsupported save versions', () => {
  assert.equal(schema.validateCloudSave({ ...cloudFixture(), version: 6 }), false);
  assert.equal(schema.validateCloudSave({ ...cloudFixture(), version: 7 }), false);
  assert.equal(schema.validateCloudSave(legacyFixture(5)), false);
});

test('normalizes legacy v6 and v7 saves without completions', () => {
  for (const version of [6, 7]) {
    const { hardProgress, ...expectedLegacy } = toCloudSave(freshSave());
    const legacy = { ...expectedLegacy, version };
    assert.equal(schema.validateCloudSave(legacy), true);
    assert.deepEqual(schema.normalizeCloudSave(legacy), { ...legacy, version: 8, hardProgress });
  }
});

test('normalizes v7 runs using the existing airborne ticks', () => {
  const legacy = legacyFixture(7);
  assert.deepEqual(schema.normalizeCloudSave(legacy), cloudFixture());
});

test('normalizes legacy v6 runs with zero airborne ticks and preserves their state', () => {
  const legacy = legacyFixture(6, { omitAirborneTicks: true });
  const result = { elapsedTicks: 300, deaths: 3 };
  legacy.records['mine-1'].best = result;
  const normalized = schema.normalizeCloudSave(legacy);
  const expected = cloudFixture();
  expected.run.player.airborneTicks = 0;
  expected.records['mine-1'].best = result;
  expected.hardProgress['mine-1'].best = { ...result, roundReached: 8, cleared: true };
  assert.deepEqual(normalized, expected);
  assert.equal(isValidCloudSave(normalized), true);
  assert.equal(Object.hasOwn(legacy.run.player, 'airborneTicks'), false);
});

test('saves a canonical v8 document and returns its cloned v8 GET payload', () => {
  const save = cloudFixture();
  const document = schema.toSaveDocument(save, principal, metadata);
  assert.deepEqual(document, { ...metadata, ...save });
  assert.notEqual(document.run, save.run);
  const responseSave = schema.fromSaveDocument(document);
  assert.deepEqual(responseSave, save);
  assert.notEqual(responseSave.run, document.run);
});

test('normalizes legacy documents at write and read time', () => {
  const legacy = legacyFixture(6, { omitAirborneTicks: true });
  const expected = cloudFixture();
  expected.run.player.airborneTicks = 0;
  assert.deepEqual(schema.toSaveDocument(legacy, principal, metadata), { ...metadata, ...expected });
  assert.deepEqual(schema.fromSaveDocument({ ...metadata, ...legacy, _etag: 'cosmos-etag' }), expected);
});

test('rejects invalid payloads, principals and persisted document metadata', () => {
  const save = cloudFixture();
  assert.throws(() => schema.normalizeCloudSave({ ...save, version: 5 }), { status: 400, code: 'invalid_payload' });
  assert.throws(() => schema.toSaveDocument(save, { ...principal, userId: 'false/user' }), { status: 403, code: 'forbidden' });
  assert.throws(() => schema.fromSaveDocument({ ...metadata, ...save, revision: 0 }), { status: 503, code: 'service_unavailable' });
  assert.throws(() => schema.fromSaveDocument({ ...metadata, ...save, hardProgress: undefined }), { status: 503, code: 'service_unavailable' });
  assert.throws(() => schema.fromSaveDocument({ ...metadata, ...legacyFixture(6), hardProgress: undefined }), { status: 503, code: 'service_unavailable' });
});
