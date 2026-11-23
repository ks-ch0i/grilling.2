export function unlockAudioForResume(audio, settings) {
  if (audio.unlocked) return false;
  audio.setVolumes(settings);
  void audio.unlock();
  return true;
}
