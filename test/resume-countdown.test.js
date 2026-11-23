import test from 'node:test';
import assert from 'node:assert/strict';

let resumeCountdown;
try {
  resumeCountdown = await import('../src/game/ui/resumeCountdown.js');
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  resumeCountdown = {};
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.parentElement = null;
    this.className = '';
    this.textContent = '';
    this.hidden = false;
  }
  append(...children) {
    for (const child of children) {
      child.parentElement?.removeChild(child);
      child.parentElement = this;
      this.children.push(child);
    }
  }
  removeChild(child) {
    this.children = this.children.filter(candidate => candidate !== child);
    child.parentElement = null;
  }
  remove() {
    this.parentElement?.removeChild(this);
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
  querySelector(selector) {
    const className = selector.startsWith('.') ? selector.slice(1) : null;
    for (const child of this.children) {
      if (className && child.className.split(/\s+/).includes(className)) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
}

function withFakeDocument(run, { gameExists = true } = {}) {
  const game = new FakeElement('div');
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: tagName => new FakeElement(tagName),
    getElementById: id => id === 'game' && gameExists ? game : null
  };
  try {
    return run(game);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

test('resume countdown uses one-second 3-2-1 boundaries', () => {
  assert.equal(resumeCountdown.RESUME_COUNTDOWN_MS, 1000);
  assert.equal(typeof resumeCountdown.resumeCountdownValue, 'function', 'resume countdown helper must exist');
  if (typeof resumeCountdown.resumeCountdownValue !== 'function') return;
  const value = resumeCountdown.resumeCountdownValue;
  assert.equal(value(0), 3);
  assert.equal(value(333), 3);
  assert.equal(value(334), 2);
  assert.equal(value(666), 2);
  assert.equal(value(667), 1);
  assert.equal(value(999), 1);
  assert.equal(value(1000), null);
  assert.throws(() => value(-1), RangeError);
  assert.throws(() => value(Number.NaN), RangeError);
  assert.throws(() => value(Number.POSITIVE_INFINITY), RangeError);
});

test('mounted countdown is accessible, updates in place, and removes cleanly', () => {
  assert.equal(typeof resumeCountdown.mountResumeCountdown, 'function', 'countdown overlay mount helper must exist');
  if (typeof resumeCountdown.mountResumeCountdown !== 'function') return;
  withFakeDocument(game => {
    const view = resumeCountdown.mountResumeCountdown(3);
    const overlay = game.querySelector('.resume-countdown-overlay');
    assert.ok(overlay);
    assert.equal(overlay.tagName, 'section');
    assert.equal(overlay.getAttribute('role'), 'status');
    assert.equal(overlay.getAttribute('aria-live'), 'assertive');
    const number = overlay.querySelector('.resume-countdown-number');
    assert.equal(number.textContent, '3');
    view.setValue(2);
    assert.equal(number.textContent, '2');
    view.remove();
    assert.equal(game.children.length, 0);
  });
});

test('countdown mount rejects a missing game root and duplicate overlays', () => {
  assert.equal(typeof resumeCountdown.mountResumeCountdown, 'function', 'countdown overlay mount helper must exist');
  if (typeof resumeCountdown.mountResumeCountdown !== 'function') return;
  withFakeDocument(() => {
    assert.throws(() => resumeCountdown.mountResumeCountdown(3), TypeError);
  }, { gameExists: false });
  withFakeDocument(game => {
    const view = resumeCountdown.mountResumeCountdown(3);
    assert.throws(() => resumeCountdown.mountResumeCountdown(3), /already mounted/i);
    view.remove();
  });
});
