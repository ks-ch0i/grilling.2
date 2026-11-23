export const RESUME_COUNTDOWN_MS = 1000;

export function resumeCountdownValue(elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new RangeError('Countdown elapsed time must be a finite non-negative number');
  }
  if (elapsedMs >= RESUME_COUNTDOWN_MS) return null;
  if (elapsedMs < 334) return 3;
  if (elapsedMs < 667) return 2;
  return 1;
}

export function mountResumeCountdown(initialValue) {
  const game = document.getElementById('game');
  if (!game) throw new TypeError('Game container is required');
  if (game.querySelector('.resume-countdown-overlay')) {
    throw new Error('Resume countdown is already mounted');
  }
  if (![3, 2, 1].includes(initialValue)) {
    throw new RangeError('Countdown value must be 3, 2, or 1');
  }

  const root = document.createElement('section');
  root.className = 'resume-countdown-overlay';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'assertive');
  const number = document.createElement('span');
  number.className = 'resume-countdown-number';
  number.textContent = String(initialValue);
  root.append(number);
  game.append(root);

  let removed = false;
  return {
    setValue(value) {
      if (removed) return;
      if (![3, 2, 1].includes(value)) throw new RangeError('Countdown value must be 3, 2, or 1');
      number.textContent = String(value);
    },
    remove() {
      if (removed) return;
      removed = true;
      root.remove();
    }
  };
}
