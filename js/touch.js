'use strict';
// ECLIPSE ZERO · Controles de toque (celular e tablet)
// ---------------------------------------------------------------------------
// Ligam sozinhos no primeiro toque na tela (ou com ?touch=1 na URL) e somem quando o
// teclado ou o controle voltam a ser usados. Só aparecem em jogo (estado 'playing'):
//   ANALÓGICO   metade esquerda: arraste a partir de onde o dedo encostar (flutuante)
//   ATAQUE (J)  leve; PESADO (K) segurado carrega; ESQUIVA (L); INTERAGIR (E)
//   HABILIDADES os 4 atalhos e a suprema do HUD viram botões (toque no losango)
//   PAUSA e TALENTOS no canto superior esquerdo, abaixo da vida
// Os botões só apertam as mesmas teclas do teclado no Input (js/controls.js), então
// tudo o que o teclado faz o toque também faz. Nos menus, o toque vira clique do mouse
// (emulação do navegador) e não precisa de nada daqui. No primeiro toque o jogo pede
// tela cheia e orientação deitada (quando o navegador deixa).
// ---------------------------------------------------------------------------
const TouchControls = {
  on: false,
  input: null,
  stick: { id: null, x0: 0, y0: 0, x: 0, y: 0 },
  cam: { id: null, x: 0, y: 0 },   // dedo girando a câmera em 3ª pessoa (metade direita, fora dos botões)
  held: new Map(),            // id do toque → botão
  R: 64,                      // raio do analógico (unidades lógicas)

  init(canvas, input) {
    this.input = input;
    if (/[?&]touch=1/.test(location.search)) this.on = true;
    const opt = { passive: false };
    canvas.addEventListener('touchstart', (e) => this.onStart(e), opt);
    canvas.addEventListener('touchmove', (e) => this.onMove(e), opt);
    canvas.addEventListener('touchend', (e) => this.onEnd(e), opt);
    canvas.addEventListener('touchcancel', (e) => this.onEnd(e), opt);
    // Teclado ou controle de volta: esconde os botões
    window.addEventListener('keydown', () => { if (this.on && !this.held.size) this.on = false; });
  },
  // Em jogo os toques são nossos; nos outros estados viram cliques (emulação do navegador)
  active() { return this.on && typeof game !== 'undefined' && game.state === 'playing' && !game.fadeCb; },

  // Botões (posições lógicas; o HUD das habilidades é lido de game.hud.L.ab)
  buttons() {
    const B = [], W = VIEW_W, H = VIEW_H;
    const granada = typeof Granada !== 'undefined' && game.player && Granada.disponivel(game.player);   // só quem leva (o Kael)
    if (H < 640) {
      // tela baixa (celular deitado): tudo na faixa entre o objetivo (canto direito, no alto) e a
      // barra de habilidades; os botões já aparecem maiores na tela
      B.push({ id: 'atk', key: 'KeyJ', x: W - 100, y: H - 158, r: 46, icon: 'sword', label: 'ATAQUE' });
      B.push({ id: 'heavy', key: 'KeyK', x: W - 205, y: H - 135, r: 32, icon: 'burst', label: 'PESADO' });
      B.push({ id: 'dash', key: 'KeyL', x: W - 250, y: H - 205, r: 32, icon: 'dash', label: 'ESQUIVA' });
      // pulo e defesa (segurar) perto do polegar; E e ARMA, de uso raro, um pouco à esquerda
      B.push({ id: 'jump', key: 'KeyN', x: W - 330, y: H - 222, r: 26, icon: null, label: 'PULO' });
      B.push({ id: 'block', key: 'ShiftLeft', x: W - 318, y: H - 150, r: 26, icon: null, label: 'DEFESA' });
      B.push({ id: 'use', key: 'KeyF', x: W - 410, y: H - 150, r: 22, icon: null, label: 'E' });
      B.push({ id: 'swap', key: 'KeyQ', x: W - 415, y: H - 222, r: 20, icon: null, label: 'ARMA' });
      if (granada) B.push({ id: 'grenade', key: 'KeyR', x: W - 492, y: H - 186, r: 20, icon: null, label: 'GRANADA' });
    } else {
      B.push({ id: 'atk', key: 'KeyJ', x: W - 132, y: H - 268, r: 54, icon: 'sword', label: 'ATAQUE' });
      B.push({ id: 'heavy', key: 'KeyK', x: W - 252, y: H - 222, r: 40, icon: 'burst', label: 'PESADO' });
      B.push({ id: 'dash', key: 'KeyL', x: W - 112, y: H - 392, r: 40, icon: 'dash', label: 'ESQUIVA' });
      B.push({ id: 'use', key: 'KeyF', x: W - 232, y: H - 340, r: 28, icon: null, label: 'E' });
      B.push({ id: 'swap', key: 'KeyQ', x: W - 330, y: H - 300, r: 24, icon: null, label: 'ARMA' });
      B.push({ id: 'jump', key: 'KeyN', x: W - 225, y: H - 418, r: 32, icon: null, label: 'PULO' });
      B.push({ id: 'block', key: 'ShiftLeft', x: W - 330, y: H - 400, r: 30, icon: null, label: 'DEFESA' });   // segurar
      if (granada) B.push({ id: 'grenade', key: 'KeyR', x: W - 425, y: H - 350, r: 24, icon: null, label: 'GRANADA' });
    }
    B.push({ id: 'pause', key: 'Escape', x: 44, y: 178, r: 24, icon: null, label: 'II' });
    B.push({ id: 'tree', key: 'Tab', x: 44, y: 236, r: 24, icon: null, label: 'TAB' });
    if (game.world) B.push({ id: 'map', key: 'KeyM', x: 44, y: 294, r: 24, icon: null, label: 'MAPA' });
    B.push({ id: 'cam', key: 'KeyV', x: 44, y: game.world ? 352 : 294, r: 24, icon: null, label: typeof ThirdView !== 'undefined' && ThirdView.on ? 'ISO' : '3D' });   // câmera
    const A = game.hud && game.hud.L && game.hud.L.ab;
    if (A && A.d) {
      for (let k = 0; k < 4; k++) B.push({ id: 'ab' + k, key: 'Digit' + (k + 1), x: A.x0 + k * A.gap, y: A.y, r: A.d * 1.25, hud: true });
      if (A.eX) B.push({ id: 'ult', key: 'KeyI', x: A.eX, y: A.eY, r: (A.D || A.d) * 1.15, hud: true });
    }
    return B;
  },
  hit(x, y) {
    let best = null, bd = Infinity;
    for (const b of this.buttons()) {
      const d = Math.hypot(x - b.x, y - b.y);
      if (d <= b.r * 1.2 && d < bd) { bd = d; best = b; }
    }
    return best;
  },
  press(key) { const I = this.input; I.keys.add(key); I.keyPressed.add(key); },
  release(key) { const I = this.input; if (!I.keys.has(key)) return; I.keys.delete(key); I.keyReleased.add(key); },

  onStart(e) {
    if (!this.on) { this.on = true; this.immersive(); }
    if (!this.active()) return;                 // menus: o navegador gera os cliques
    e.preventDefault();
    this.input.lastDevice = 'touch';
    for (const t of e.changedTouches) {
      const p = game.toLogical(t.clientX, t.clientY), b = this.hit(p.x, p.y);
      if (b) { this.held.set(t.identifier, b); this.press(b.key); continue; }
      const S = this.stick, C = this.cam;
      if (S.id === null && p.x < VIEW_W * 0.5) { S.id = t.identifier; S.x0 = S.x = p.x; S.y0 = S.y = p.y; }
      else if (C.id === null && p.x >= VIEW_W * 0.5 && typeof ThirdView !== 'undefined' && ThirdView.on) { C.id = t.identifier; C.x = p.x; C.y = p.y; }
    }
    this.syncStick();
  },
  onMove(e) {
    if (!this.active()) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      const p = game.toLogical(t.clientX, t.clientY);
      if (t.identifier === this.cam.id) { ThirdView.mouseDX += (p.x - this.cam.x) * 1.6; ThirdView.mouseDY += (p.y - this.cam.y) * 1.2; this.cam.x = p.x; this.cam.y = p.y; continue; }
      if (t.identifier !== this.stick.id) continue;
      this.stick.x = p.x; this.stick.y = p.y;
    }
    this.syncStick();
  },
  onEnd(e) {
    let mine = false;
    for (const t of e.changedTouches) {
      const b = this.held.get(t.identifier);
      if (b) { this.release(b.key); this.held.delete(t.identifier); mine = true; }
      if (t.identifier === this.stick.id) { this.stick.id = null; mine = true; }
      if (t.identifier === this.cam.id) { this.cam.id = null; mine = true; }
    }
    if (mine && e.cancelable) e.preventDefault();
    this.syncStick();
  },
  // Analógico → vetor de movimento do Input (zona morta de 18%, saturado na borda)
  syncStick() {
    const S = this.stick, A = this.input.touchAxes;
    if (S.id === null) { A.x = A.y = 0; return; }
    let dx = S.x - S.x0, dy = S.y - S.y0;
    const d = Math.hypot(dx, dy), R = this.R;
    if (d > R) { S.x0 = S.x - (dx / d) * R; S.y0 = S.y - (dy / d) * R; dx = S.x - S.x0; dy = S.y - S.y0; }   // a base segue o dedo
    const k = Math.hypot(dx, dy) / R;
    if (k < 0.18) { A.x = A.y = 0; return; }
    const m = Math.min(1, (k - 0.18) / 0.82) / (k || 1);
    A.x = (dx / R) * m; A.y = (dy / R) * m;
  },
  // Sai do jogo (pausa, árvore, morte): solta tudo o que estava apertado
  releaseAll() {
    for (const b of this.held.values()) this.release(b.key);
    this.held.clear();
    this.stick.id = null; this.cam.id = null;
    if (this.input) this.input.touchAxes.x = this.input.touchAxes.y = 0;
  },
  // Tela cheia e orientação deitada (o navegador pode recusar: segue normal)
  immersive() {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    } catch (err) { /* sem tela cheia neste navegador */ }
  },

  draw(ctx) {
    if (!this.active()) { if (this.held.size || this.stick.id !== null) this.releaseAll(); return; }
    const rgb = game.player && game.player.def ? hexToRgb(game.player.def.color) : '80,150,255';
    ctx.save();
    // Analógico: base e manche (parado: uma base apagada como dica)
    const S = this.stick, on = S.id !== null;
    const bx = on ? S.x0 : 150, by = on ? S.y0 : VIEW_H - 170;
    ctx.globalAlpha = on ? 0.9 : 0.35;
    ctx.fillStyle = 'rgba(4,8,18,0.35)'; ctx.beginPath(); ctx.arc(bx, by, this.R, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(rgb, 0.7); ctx.lineWidth = 2; ctx.stroke();
    const kx = on ? S.x : bx, ky = on ? S.y : by;
    ctx.fillStyle = rgba(rgb, 0.35); ctx.beginPath(); ctx.arc(kx, ky, this.R * 0.42, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(230,240,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    // Botões (os do HUD só ganham um anel quando apertados)
    const down = new Set([...this.held.values()].map((b) => b.id));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const b of this.buttons()) {
      const p = down.has(b.id);
      if (b.hud) {
        if (!p) continue;
        ctx.globalAlpha = 0.9; ctx.strokeStyle = rgba(rgb, 0.95); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
        continue;
      }
      ctx.globalAlpha = p ? 0.95 : 0.6;
      ctx.fillStyle = p ? rgba(rgb, 0.45) : 'rgba(4,8,18,0.45)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(rgb, p ? 1 : 0.75); ctx.lineWidth = 2; ctx.stroke();
      if (b.icon) {
        drawIcon(ctx, b.icon, b.x, b.y - (b.r > 45 ? 6 : 4), b.r * 0.8, 'rgba(235,244,255,0.95)');
        ctx.font = `bold ${b.r > 45 ? 11 : 9}px ${FONT_TITLE}`; ctx.fillStyle = 'rgba(220,232,250,0.85)';
        ctx.fillText(b.label, b.x, b.y + b.r * 0.62);
      } else {
        ctx.font = `bold ${Math.round(b.r * (b.label.length > 4 ? 0.36 : 0.55))}px ${FONT_TITLE}`; ctx.fillStyle = 'rgba(235,244,255,0.95)';
        ctx.fillText(b.label, b.x, b.y + 1);
      }
    }
    ctx.restore();
  },
};
