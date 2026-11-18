import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMenu} from '../src/game/ui/menu.js';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.parent = null;
  }

  append(...nodes) {
    for (const node of nodes) {
      node.parent = this;
      this.children.push(node);
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  focus() {
    this.focused = true;
  }

  querySelector(selector) {
    if (selector !== 'button:not(:disabled),input') return null;
    const pending = [...this.children];
    while (pending.length) {
      const candidate = pending.shift();
      if ((candidate.tagName === 'BUTTON' && !candidate.disabled) || candidate.tagName === 'INPUT') return candidate;
      pending.unshift(...candidate.children);
    }
    return null;
  }

  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter(child => child !== this);
    this.parent = null;
  }
}

function withFakeDocument(run) {
  const game = new FakeElement('main');
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: tagName => new FakeElement(tagName),
    createTextNode: value => ({tagName:'#text',textContent:String(value),children:[],parent:null}),
    getElementById: id => id === 'game' ? game : null,
  };
  try {
    return run(game);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

test('mountMenu keeps the existing panel layout by default', () => withFakeDocument(game => {
  const menu = mountMenu('설정', '기존 패널 설명');

  assert.equal(menu.root.className, 'game-overlay');
  assert.equal(menu.panel.className, 'game-panel');
  assert.deepEqual(menu.panel.children.map(child => child.tagName), ['H2', 'P']);
  assert.equal(menu.panel.children[0].textContent, '설정');
  assert.equal(menu.panel.children[1].textContent, '기존 패널 설명');

  const action = menu.button('확인', () => {}, {disabled:true});
  assert.equal(action.type, 'button');
  assert.equal(action.disabled, true);
  assert.equal(game.children[0], menu.root);
}));

test('title main layout puts the title above the panel and omits its subtitle', () => withFakeDocument(() => {
  const menu = mountMenu('Pixel Action', '삭제 대상 부제', {variant:'title',layout:'main'});

  assert.ok(menu.root.className.includes('game-overlay--title'));
  assert.ok(menu.root.className.includes('game-overlay--title-main'));
  assert.deepEqual(menu.root.children.map(child => child.tagName), ['H2', 'DIV']);
  assert.equal(menu.root.children[0].className, 'title-menu-heading');
  assert.equal(menu.root.children[0].textContent, 'Pixel Action');
  assert.equal(menu.panel.className, 'game-panel game-panel--title');
  assert.deepEqual(menu.panel.children, []);

  const choice = menu.button('시작', () => {});
  menu.focus();
  assert.equal(choice.focused, true);
}));

test('title submenu keeps its heading and description before the choices', () => withFakeDocument(() => {
  const menu = mountMenu('새 도전', '기존 진행 상황을 교체합니다.', {variant:'title',layout:'submenu'});

  assert.ok(menu.root.className.includes('game-overlay--title-submenu'));
  assert.deepEqual(menu.root.children.map(child => child.tagName), ['DIV']);
  assert.deepEqual(menu.panel.children.map(child => child.tagName), ['H2', 'P']);
  assert.equal(menu.panel.children[0].textContent, '새 도전');
  assert.equal(menu.panel.children[1].textContent, '기존 진행 상황을 교체합니다.');
  menu.button('취소', () => {});
  assert.deepEqual(menu.panel.children.map(child => child.tagName), ['H2', 'P', 'BUTTON']);
}));

test('unknown menu variants fall back to the existing panel layout', () => withFakeDocument(() => {
  const menu = mountMenu('에셋 오류', '복구 안내', {variant:'unknown',layout:'main'});

  assert.equal(menu.root.className, 'game-overlay');
  assert.equal(menu.panel.className, 'game-panel');
  assert.deepEqual(menu.panel.children.map(child => child.tagName), ['H2', 'P']);
}));
