'use strict';
// ECLIPSE ZERO · Entrada: teclado, gamepad e mouse unificados em ações (KEYMAP/PADMAP, Input)
// ---------------------------------------------------------------------------
// ENTRADA: teclado, gamepad e mouse unificados em "ações"
// ---------------------------------------------------------------------------
const KEYMAP = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  light: ['KeyJ'], heavy: ['KeyK'], dash: ['KeyL', 'Space'], special: ['KeyI'],
  pause: ['Escape'], confirm: ['Enter', 'NumpadEnter', 'KeyJ', 'Space'],
  debug: ['F1'], debugKill: ['F2'], debugFury: ['F3'], mute: ['KeyM'], gfx: ['KeyG'],
  reroll: ['KeyR'], buyHeal: ['KeyC'], restart: ['KeyR'], toTitle: ['KeyT'],
  one: ['Digit1', 'Numpad1'], two: ['Digit2', 'Numpad2'], three: ['Digit3', 'Numpad3'],
  ab1: ['Digit1', 'KeyU'], ab2: ['Digit2', 'KeyO'], ab3: ['Digit3', 'KeyP'], ab4: ['Digit4', 'Semicolon'],
  skills: ['Tab', 'KeyH'], tabPrev: ['KeyQ'], tabNext: ['KeyE'], back: ['Escape', 'Backspace'],
  interact: ['KeyE', 'KeyF'], debugXp: ['F4'],
};
// Layout padrão (Xbox): 0=A 1=B 2=X 3=Y 4=LB 5=RB 7=RT 8=Back 9=Start 12-15=D-pad
const PADMAP = {
  up: [12], down: [13], left: [14], right: [15],
  light: [2], heavy: [3], dash: [0, 4], special: [1, 7],
  ab1: [6], ab2: [5], ab3: [10], ab4: [11], skills: [8], tabPrev: [4], tabNext: [5], back: [1], interact: [3],
  pause: [9], confirm: [0], reroll: [2], buyHeal: [3], restart: [3], toTitle: [8],
};
const PREVENT_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'F2', 'F3', 'F4', 'Tab', 'Backspace']);

class Input {
  constructor(canvas) {
    this.keys = new Set();          // teclas seguradas
    this.keyPressed = new Set();    // teclas pressionadas neste frame
    this.keyReleased = new Set();   // teclas soltas neste frame
    this.held = {}; this.pressed = {}; this.released = {};
    this.actions = Array.from(new Set([...Object.keys(KEYMAP), ...Object.keys(PADMAP)]));
    for (const a of this.actions) { this.held[a] = this.pressed[a] = this.released[a] = false; }
    this.padNow = new Array(24).fill(false);
    this.padPrev = new Array(24).fill(false);
    this.padAxes = { x: 0, y: 0 };
    this.padConnected = false;
    this.move = { x: 0, y: 0 };      // vetor de movimento em espaço de TELA (|v| <= 1)
    this.mouse = { x: -1, y: -1, clicked: false, moved: false };
    this.lastDevice = 'kb';
    this.anyPressed = false;
    this.onFirstInput = null;        // usado para destravar o áudio

    window.addEventListener('keydown', (e) => {
      if (PREVENT_KEYS.has(e.code)) e.preventDefault();
      if (!e.repeat) { this.keys.add(e.code); this.keyPressed.add(e.code); }
      this.lastDevice = 'kb';
      if (this.onFirstInput) this.onFirstInput();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.keyReleased.add(e.code);
    });
    window.addEventListener('blur', () => {
      for (const k of this.keys) this.keyReleased.add(k);
      this.keys.clear();
      if (game && game.onBlur) game.onBlur();
    });
    canvas.addEventListener('mousemove', (e) => {
      const p = game ? game.toLogical(e.clientX, e.clientY) : { x: 0, y: 0 };
      this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.moved = true;
    });
    canvas.addEventListener('mousedown', (e) => {
      const p = game ? game.toLogical(e.clientX, e.clientY) : { x: 0, y: 0 };
      this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.clicked = true;
      this.lastDevice = 'kb';
      if (this.onFirstInput) this.onFirstInput();
    });
    window.addEventListener('gamepadconnected', () => { this.padConnected = true; });
    window.addEventListener('gamepaddisconnected', () => { this.padConnected = false; });
  }

  // Lê o primeiro gamepad conectado (suporte opcional)
  pollGamepad() {
    this.padNow.fill(false);
    this.padAxes.x = this.padAxes.y = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    if (!pads) return;
    let pad = null;
    for (let i = 0; i < pads.length; i++) { if (pads[i] && pads[i].connected) { pad = pads[i]; break; } }
    if (!pad) return;
    this.padConnected = true;
    for (let i = 0; i < pad.buttons.length && i < this.padNow.length; i++) {
      const b = pad.buttons[i];
      this.padNow[i] = typeof b === 'object' ? (b.pressed || b.value > 0.5) : b > 0.5;
    }
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    const mag = Math.hypot(ax, ay);
    if (mag > 0.25) {
      const k = Math.min(1, (mag - 0.25) / 0.65) / mag;
      this.padAxes.x = ax * k; this.padAxes.y = ay * k;
    }
    for (let i = 0; i < this.padNow.length; i++) {
      if (this.padNow[i] && !this.padPrev[i]) {
        this.lastDevice = 'pad';
        if (this.onFirstInput) this.onFirstInput();
      }
    }
    if (mag > 0.5) this.lastDevice = 'pad';
  }

  // Consolida o estado das ações para o frame atual
  update() {
    this.pollGamepad();
    this.anyPressed = this.keyPressed.size > 0 || this.mouse.clicked;
    for (const a of this.actions) {
      let h = false, p = false, r = false;
      const keys = KEYMAP[a];
      if (keys) {
        for (const k of keys) {
          if (this.keys.has(k)) h = true;
          if (this.keyPressed.has(k)) p = true;
          if (this.keyReleased.has(k)) r = true;
        }
      }
      const btns = PADMAP[a];
      if (btns) {
        for (const b of btns) {
          if (this.padNow[b]) h = true;
          if (this.padNow[b] && !this.padPrev[b]) p = true;
          if (!this.padNow[b] && this.padPrev[b]) r = true;
        }
      }
      this.held[a] = h; this.pressed[a] = p; this.released[a] = r;
      if (p) this.anyPressed = true;
    }
    // Vetor de movimento (teclado ou analógico)
    let mx = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);
    let my = (this.held.down ? 1 : 0) - (this.held.up ? 1 : 0);
    if (mx || my) { const l = Math.hypot(mx, my); mx /= l; my /= l; }
    if (Math.hypot(this.padAxes.x, this.padAxes.y) > 0.01) { mx = this.padAxes.x; my = this.padAxes.y; }
    this.move.x = mx; this.move.y = my;
  }

  // Limpa os eventos de borda ao final do frame
  endFrame() {
    this.keyPressed.clear();
    this.keyReleased.clear();
    this.mouse.clicked = false;
    this.mouse.moved = false;
    for (let i = 0; i < this.padNow.length; i++) this.padPrev[i] = this.padNow[i];
  }
}

