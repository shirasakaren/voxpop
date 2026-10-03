// Keyboard, mouse, touch joystick and gamepad in one place.
export class Input {
  constructor(canvas, ui) {
    this.keys = new Set();
    this.move = { x: 0, y: 0 };
    this.run = false;
    this.camDelta = { x: 0, y: 0 };
    this.zoom = 0;
    this.handlers = {};
    this.enabled = true;
    this.lastActive = performance.now();
    this.touchMode = matchMedia('(pointer: coarse)').matches;
    this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.camTouch = { id: null, x: 0, y: 0 };

    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      this.lastActive = performance.now();
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
      if (e.repeat) { this.keys.add(k); return; }
      this.keys.add(k);
      if (k === ' ' || k === 'e' || k === 'enter') this.emit('advance');
      if (k === 'e' || k === 'enter') this.emit('interact');
      if (k === ' ') this.emit('jump');
      if (k === 'n' || k === 'tab') this.emit('notebook');
      if (k === 'escape' || k === 'p') this.emit('pause');
      if (k === 'm') this.emit('music');
      if (k === 'c') this.emit('photo');
      if (k === 'q') this.emit('wave');
      if (['1', '2', '3'].includes(k)) this.emit('choice', +k - 1);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());

    // mouse drag to orbit
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      this.lastActive = performance.now();
      if (e.pointerType === 'touch') return;
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerType === 'touch') return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      this.camDelta.x += dx; this.camDelta.y += dy;
      drag.x = e.clientX; drag.y = e.clientY;
    });
    canvas.addEventListener('pointerup', (e) => {
      if (drag && drag.moved < 6 && e.pointerType !== 'touch') this.emit('click', e);
      drag = null;
    });
    canvas.addEventListener('wheel', (e) => { this.zoom += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

    // touch
    const joyEl = document.getElementById('joystick');
    const knob = joyEl?.querySelector('.knob');
    canvas.addEventListener('touchstart', (e) => {
      this.touchMode = true;
      document.body.classList.add('touch');
      this.lastActive = performance.now();
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && this.joy.id === null) {
          this.joy = { id: t.identifier, ox: t.clientX, oy: t.clientY, x: 0, y: 0 };
          if (joyEl) { joyEl.style.left = t.clientX + 'px'; joyEl.style.top = t.clientY + 'px'; joyEl.classList.add('on'); }
        } else if (this.camTouch.id === null) {
          this.camTouch = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t: performance.now() };
        }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) {
          let dx = t.clientX - this.joy.ox, dy = t.clientY - this.joy.oy;
          const len = Math.hypot(dx, dy), max = 56;
          if (len > max) { dx *= max / len; dy *= max / len; }
          this.joy.x = dx / max; this.joy.y = -dy / max;
          if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
        } else if (t.identifier === this.camTouch.id) {
          this.camDelta.x += (t.clientX - this.camTouch.x) * 1.4;
          this.camDelta.y += (t.clientY - this.camTouch.y) * 1.4;
          this.camTouch.x = t.clientX; this.camTouch.y = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) {
          this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
          if (knob) knob.style.transform = '';
          joyEl?.classList.remove('on');
        } else if (t.identifier === this.camTouch.id) {
          const moved = Math.hypot(t.clientX - this.camTouch.sx, t.clientY - this.camTouch.sy);
          if (moved < 10 && performance.now() - this.camTouch.t < 300) this.emit('click', { clientX: t.clientX, clientY: t.clientY });
          this.camTouch = { id: null };
        }
      }
    };
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);
    if (this.touchMode) document.body.classList.add('touch');
  }

  on(evt, fn) { (this.handlers[evt] ||= []).push(fn); }
  emit(evt, arg) { (this.handlers[evt] || []).forEach((f) => f(arg)); }

  update() {
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has('w') || k.has('arrowup') || k.has('z')) y += 1;
    if (k.has('s') || k.has('arrowdown')) y -= 1;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    this.run = k.has('shift');
    if (this.joy.id !== null) {
      x = this.joy.x; y = this.joy.y;
      this.run = Math.hypot(x, y) > 0.92;
    }
    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
      if (Math.abs(dz(p.axes[0])) + Math.abs(dz(p.axes[1])) > 0) { x = dz(p.axes[0]); y = -dz(p.axes[1]); this.run = Math.hypot(x, y) > 0.92 || p.buttons[5]?.pressed; }
      this.camDelta.x += dz(p.axes[2] || 0) * 9;
      this.camDelta.y += dz(p.axes[3] || 0) * 6;
      const btn = (i, evt) => {
        const pressed = p.buttons[i]?.pressed;
        const key = 'pad' + i;
        if (pressed && !this[key]) { if (evt === 'interact') this.emit('advance'); this.emit(evt); }
        this[key] = pressed;
      };
      btn(0, 'interact'); btn(1, 'jump'); btn(3, 'notebook'); btn(9, 'pause');
      if (Math.abs(x) + Math.abs(y) > 0) this.lastActive = performance.now();
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    if (!this.enabled) { x = 0; y = 0; }
    this.move.x = x; this.move.y = y;
    if (len > 0.01) this.lastActive = performance.now();
  }

  consumeCam() { const d = { ...this.camDelta }; this.camDelta.x = 0; this.camDelta.y = 0; return d; }
  consumeZoom() { const z = this.zoom; this.zoom = 0; return z; }
}
