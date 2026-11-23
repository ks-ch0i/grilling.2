import test from 'node:test';
import assert from 'node:assert/strict';

let resumeAudio;
try {
  resumeAudio = await import('../src/game/audio/resumeAudio.js');
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  resumeAudio = {};
}

test('resume gesture starts audio unlock synchronously without starting music', () => {
  assert.equal(typeof resumeAudio.unlockAudioForResume, 'function', 'resume audio unlock helper must exist');
  if (typeof resumeAudio.unlockAudioForResume !== 'function') return;
  const calls = [];
  const settings = { musicVolume: 0.4, sfxVolume: 0.3 };
  const audio = {
    unlocked: false,
    setVolumes(value) { calls.push(['setVolumes', value]); },
    unlock() { calls.push(['unlock']); return Promise.resolve(true); }
  };

  assert.equal(resumeAudio.unlockAudioForResume(audio, settings), true);
  assert.deepEqual(calls, [['setVolumes', settings], ['unlock']]);
  assert.equal(calls.some(call => call[0] === 'playMusic'), false);
});

test('already unlocked audio is left alone', () => {
  assert.equal(typeof resumeAudio.unlockAudioForResume, 'function', 'resume audio unlock helper must exist');
  if (typeof resumeAudio.unlockAudioForResume !== 'function') return;
  let calls = 0;
  const audio = {
    unlocked: true,
    setVolumes() { calls++; },
    unlock() { calls++; }
  };
  assert.equal(resumeAudio.unlockAudioForResume(audio, {}), false);
  assert.equal(calls, 0);
});
