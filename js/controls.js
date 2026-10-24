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
  interact: ['KeyE', 'KeyF'], debugXp: ['F4'], erase: ['Delete'],
  charPrev: ['KeyZ'], charNext: ['KeyC'],   // árvore de habilidades: trocar de personagem
  view3d: ['KeyV'],
  worldMap: ['KeyM'],   // mapa do mundo aberto (no mundo, M deixa de ser o mudo)
  swapWeapon: ['KeyQ', 'KeyX'],   // em jogo: troca para a próxima arma liberada do personagem
  camToggle: ['KeyV'], camLeft: ['KeyZ'], camRight: ['KeyC'],   // em jogo: câmera isométrica / 3ª pessoa e girar
};
// Mapeamento padrão da Gamepad API ("standard"), igual em Xbox, PlayStation e GameSir:
// 0=A/✕ 1=B/○ 2=X/□ 3=Y/△ 4=LB/L1 5=RB/R1 6=LT/L2 7=RT/R2 8=View/Create 9=Menu/Options
// 10=L3 11=R3 12-15=D-pad. Habilidades 1–4: segure LB/L1 e aperte X, Y, B ou A.
const PADMAP = {
  up: [12], down: [13], left: [14], right: [15],
  light: [7, 2], heavy: [5, 3], dash: [1, 0], special: [6],
  skills: [8], tabPrev: [4], tabNext: [5], back: [1], interact: [2],
  pause: [9], confirm: [0], reroll: [2], buyHeal: [3], toTitle: [8], erase: [2],
  charPrev: [6], charNext: [7],   // LT/RT (L2/R2) na árvore de habilidades: trocar de personagem
  view3d: [3],
  swapWeapon: [11],     // R3
};
const PAD_LAYER = 4;                                  // LB/L1: modificador das habilidades
const PAD_LAYER_MAP = { ab1: 2, ab2: 3, ab3: 1, ab4: 0 };   // LB + X, Y, B, A
// Nomes dos botões por família de controle (detectada pelo id que o navegador informa)
const PAD_LABELS = {
  xbox: { name: 'Xbox', a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', back: 'View', start: 'Menu', ls: 'L3', rs: 'R3' },
  ps: { name: 'PlayStation', a: '✕', b: '○', x: '□', y: '△', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', back: 'Create', start: 'Options', ls: 'L3', rs: 'R3' },
  gamesir: { name: 'GameSir', a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', back: 'Select', start: 'Start', ls: 'L3', rs: 'R3' },
  generic: { name: 'Genérico', a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', back: 'Select', start: 'Start', ls: 'L3', rs: 'R3' },
};
// Do mais específico para o mais genérico ("Xbox Wireless Controller" não pode virar PlayStation)
function padKind(id) {
  const s = String(id || '').toLowerCase();
  if (/gamesir|3537/.test(s)) return 'gamesir';
  if (/045e|xbox|xinput|microsoft/.test(s)) return 'xbox';
  if (/054c|playstation|dualshock|dualsense|wireless controller|ps4|ps5/.test(s)) return 'ps';
  return 'generic';
}
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
    this.touchAxes = { x: 0, y: 0 };   // analógico de toque (js/touch.js)
    this.look = { x: 0, y: 0 };      // analógico direito (olhar ao redor)
    this.padConnected = false;
    this.pad = null;                 // { index, id, kind, mapping, buttons, axes } do controle em uso
    this.deadzone = 0.2; this.sensitivity = 1; this.vibration = true; this.invertY = false;
    this.navDir = null; this.navT = 0;   // navegação de menus pelo analógico (com repetição)
    this.onPadChange = null;
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
    // Toque solto (celular): conta como gesto para o navegador. Em jogo os toques não viram
    // cliques (js/touch.js), então é aqui que o áudio volta depois de suspenso (tela bloqueada,
    // troca de app, ligação)
    window.addEventListener('touchend', () => { if (this.onFirstInput) this.onFirstInput(); }, { passive: true });
    window.addEventListener('gamepadconnected', (e) => {
      this.padConnected = true;
      if (this.onPadChange) this.onPadChange('connected', this.describe(e.gamepad));
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      // Zera tudo para o personagem não continuar andando sozinho
      if (!this.pad || this.pad.index === e.gamepad.index) {
        this.padNow.fill(false); this.padPrev.fill(false);
        this.padAxes.x = this.padAxes.y = 0; this.look.x = this.look.y = 0;
        this.pad = null; this.padConnected = false; this.navDir = null;
        if (this.lastDevice === 'pad') this.lastDevice = 'kb';
      }
      if (this.onPadChange) this.onPadChange('disconnected', this.describe(e.gamepad));
    });
  }

  describe(gp) {
    const kind = padKind(gp && gp.id);
    return { index: gp ? gp.index : -1, id: gp ? gp.id : '', kind, mapping: gp ? gp.mapping : '', labels: PAD_LABELS[kind] };
  }
  // Zona morta radial + sensibilidade: devolve o vetor normalizado (|v| <= 1)
  stick(ax, ay, out) {
    const mag = Math.hypot(ax, ay), dz = this.deadzone;
    if (mag <= dz) { out.x = out.y = 0; return out; }
    const k = Math.min(1, ((mag - dz) / (1 - dz)) * this.sensitivity) / mag;
    out.x = ax * k; out.y = ay * k;
    return out;
  }

  // Lê o primeiro gamepad conectado (uma vez por quadro, dentro do loop do jogo)
  pollGamepad() {
    this.padNow.fill(false);
    this.padAxes.x = this.padAxes.y = 0; this.look.x = this.look.y = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    if (!pads) return;
    let pad = null;
    for (let i = 0; i < pads.length; i++) { if (pads[i] && pads[i].connected) { pad = pads[i]; break; } }
    if (!pad) { this.pad = null; return; }
    this.padConnected = true;
    if (!this.pad || this.pad.index !== pad.index || this.pad.id !== pad.id) this.pad = Object.assign(this.describe(pad), { buttons: [], axes: [] });
    const info = this.pad;
    info.buttons.length = pad.buttons.length; info.axes.length = pad.axes.length;
    for (let i = 0; i < pad.buttons.length; i++) {
      const b = pad.buttons[i], v = typeof b === 'object' ? b.value : b;
      info.buttons[i] = v;
      if (i < this.padNow.length) this.padNow[i] = typeof b === 'object' ? (b.pressed || b.value > 0.5) : b > 0.5;
    }
    for (let i = 0; i < pad.axes.length; i++) info.axes[i] = pad.axes[i] || 0;
    this.stick(pad.axes[0] || 0, pad.axes[1] || 0, this.padAxes);
    this.stick(pad.axes[2] || 0, (pad.axes[3] || 0) * (this.invertY ? -1 : 1), this.look);
    for (let i = 0; i < this.padNow.length; i++) {
      if (this.padNow[i] && !this.padPrev[i]) {
        this.lastDevice = 'pad';
        if (this.onFirstInput) this.onFirstInput();
      }
    }
    if (Math.hypot(this.padAxes.x, this.padAxes.y) > 0.3 || Math.hypot(this.look.x, this.look.y) > 0.3) this.lastDevice = 'pad';
  }

  // Vibração (se o controle e o navegador suportarem); 'force' ignora a preferência (teste nas configurações)
  rumble(strong, weak, ms, force = false) {
    if (!this.pad || (!force && (!this.vibration || this.lastDevice !== 'pad'))) return;
    try {
      const gp = navigator.getGamepads()[this.pad.index], va = gp && gp.vibrationActuator;
      if (va && va.playEffect) va.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
    } catch (e) { /* sem suporte */ }
  }
  get padLabels() { return (this.pad && this.pad.labels) || PAD_LABELS.xbox; }

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
      // Com LB/L1 segurado, A/B/X/Y viram as habilidades 1–4 (sem disparar golpes ou esquiva)
      const layer = this.padNow[PAD_LAYER];
      const lb = PAD_LAYER_MAP[a];
      const btns = lb !== undefined ? (layer ? [lb] : null) : PADMAP[a];
      if (btns) {
        for (const b of btns) {
          if (layer && b <= 3 && lb === undefined) continue;
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
    if (Math.hypot(this.touchAxes.x, this.touchAxes.y) > 0.01) { mx = this.touchAxes.x; my = this.touchAxes.y; }
    this.move.x = mx; this.move.y = my;
    // Analógico também navega nos menus: um toque = um passo; segurado repete
    let dir = null;
    if (this.pad) {
      const ax = this.pad.axes[0] || 0, ay = this.pad.axes[1] || 0;
      if (Math.max(Math.abs(ax), Math.abs(ay)) > 0.6) dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : (ay > 0 ? 'down' : 'up');
    }
    const now = performance.now();
    if (dir && (dir !== this.navDir || now >= this.navT)) {
      this.pressed[dir] = true; this.anyPressed = true;
      this.navT = now + (dir !== this.navDir ? 420 : 110);
    }
    this.navDir = dir;
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

