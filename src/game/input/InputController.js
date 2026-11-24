// DOM events capture edges independently of rendering; sample consumes one edge per tick.
export class InputController {
  constructor(target = window, canvas = null) {
    this.target = target; this.canvas = canvas; this.enabled = true; this.held = new Set(); this.jumps = []; this.queue = { attack: 0, roll: 0, shield: 0, parry: 0 };
    this.pointer = null; this.pointerInside = false; this.listeners = [];
    const on = (type, fn, source = target) => { source.addEventListener(type, fn); this.listeners.push([source, type, fn]); };
    const keys = { ShiftLeft: 'roll', ShiftRight: 'roll', KeyQ: 'shield' };
    on('keydown', e => {
      if (!this.enabled || e.target?.closest?.('button,input,select,textarea,[contenteditable]')) return;
      if (['KeyA','KeyD','KeyS','ArrowDown','Space','ShiftLeft','ShiftRight','KeyQ'].includes(e.code)) e.preventDefault();
      if (!e.repeat && !this.held.has(e.code)) {
        if (e.code === 'Space') this.jumps.push(this.held.has('KeyS') || this.held.has('ArrowDown'));
        else if (keys[e.code]) this.queue[keys[e.code]]++;
      }
      this.held.add(e.code);
    });
    on('keyup', e => this.held.delete(e.code));
    on('mousedown', e => {
      if (!this.enabled || e.target?.closest?.('button,input,select,textarea,[contenteditable]')) return;
      if (this.canvas && e.target !== this.canvas) return;
      if (e.button === 2) {
        if (this.held.has('Mouse2')) return;
        this.held.add('Mouse2'); this.queue.parry++; this.updatePointer(e); return;
      }
      if (e.button !== 0 || this.held.has('Mouse0')) return;
      this.held.add('Mouse0'); this.queue.attack++; this.updatePointer(e);
    });
    on('mouseup', e => { if (e.button === 0) this.held.delete('Mouse0'); else if (e.button === 2) this.held.delete('Mouse2'); });
    on('contextmenu', e => { if (this.canvas && e.target === this.canvas) e.preventDefault(); });
    on('mousemove', e => this.updatePointer(e));
    on('mouseout', e => { if (!e.relatedTarget) this.pointerInside = false; });
    on('blur', () => this.reset());
    on('visibilitychange', () => { if (typeof document !== 'undefined' && document.hidden) this.reset(); }, typeof document !== 'undefined' ? document : target);
  }
  updatePointer(e) {
    if (!this.canvas) { this.pointer = { x: e.clientX, y: e.clientY }; return; }
    const r = this.canvas.getBoundingClientRect();
    this.pointerInside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && r.width && r.height)
      this.pointer = { x: (e.clientX-r.left)*640/r.width, y: (e.clientY-r.top)*360/r.height };
  }
  sample(scene) {
    const take = key => { if (this.queue[key] > 0) { this.queue[key]--; return true; } return false; };
    const drop = this.jumps.shift();
    const world = this.pointer && (!this.canvas || this.pointerInside) ? scene.cameras.main.getWorldPoint(this.pointer.x, this.pointer.y) : null;
    return { move: Number(this.held.has('KeyD'))-Number(this.held.has('KeyA')), jumpPressed: drop !== undefined, dropPressed: drop === true,
      jumpHeld: this.held.has('Space'), attackPressed: take('attack'), rollPressed: take('roll'),
      shieldPressed: take('shield'), shieldHeld: this.held.has('KeyQ'), parryPressed: take('parry'),
      aimX: world?.x ?? NaN, aimY: world?.y ?? NaN };
  }
  setEnabled(enabled) { this.enabled = enabled; if (!enabled) this.reset(); }
  reset() { this.held.clear(); this.jumps.length = 0; for (const key of Object.keys(this.queue)) this.queue[key] = 0; }
  destroy() { for (const [source, type, fn] of this.listeners) source.removeEventListener(type, fn); this.listeners = []; this.reset(); }
}
