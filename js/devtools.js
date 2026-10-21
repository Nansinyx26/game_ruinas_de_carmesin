'use strict';
// ECLIPSE ZERO · Console de desenvolvimento do elenco (só em modo dev)
// ---------------------------------------------------------------------------
// MODO DEV: abra o index.html com ?dev=1 no endereço (ex.: .../index.html?dev=1) ou
// rode localStorage.setItem('eclipse_zero_dev', '1') no console e recarregue.
// Fora do modo dev nada disto existe (sem painel, sem window.dev).
//   Tecla ` (crase): abre e fecha o painel; o jogo espera enquanto ele está aberto.
//     ↑/↓ escolhem o comando, ←/→ trocam o id, Enter executa. Também dá para digitar
//     a linha ("unlock lyra") e apertar Enter. Esc ou ` fecham. Mouse e controle
//     (direcional, A/✕ executa, B/○ fecha) também funcionam com o painel aberto.
//   Console do navegador: window.dev com os mesmos comandos
//     dev.help() · dev.unlock_all() · dev.lock_all() · dev.unlock('lyra')
//     dev.set_char('kael') · dev.run('unlock drakos') · dev.inspect()
// Comandos:
//   unlock_all     libera todos os personagens e todas as armaduras
//   lock_all       volta ao elenco inicial (só o personagem e as armaduras 'always')
//   unlock <id>    libera um personagem (ou uma armadura, pelo id de ARMOR_DEFS)
//   set_char <id>  põe o personagem em campo; recusa os bloqueados e os EM BREVE
//   inspect        abre o inspetor 3D (js/inspector3d.js): vistas do modelo, ossos e arte de referência
//   help           lista os comandos e os ids
// Dentro de uma partida as mudanças são salvas no espaço em uso; na seleção de um
// jogo novo, valem para o jogo que começar dali.
// ---------------------------------------------------------------------------
const DEV_MODE = (() => {
  try { if (/[?&]dev=1(&|$)/.test(location.search)) return true; } catch (e) { /* sem endereço */ }
  try { return localStorage.getItem('eclipse_zero_dev') === '1'; } catch (e) { return false; }
})();
const FONT_MONO = 'Consolas, "Cascadia Mono", "DejaVu Sans Mono", "Courier New", monospace';
const DEV_RGB = '255,190,90';   // cor do console (diferente da interface do jogo)

const DevTools = {
  open: false,
  sel: 0,
  ids: { unlock: 1, set_char: 0 },   // id escolhido (índice de CHARACTER_DEFS) nas linhas com <id>
  buf: '',                           // linha digitada
  log: [],                           // [{ text, rgb }]
  keys: [],                          // teclas capturadas enquanto o painel está aberto
  t: 0,
  rows: [['unlock_all', 'devRowUnlockAll'], ['lock_all', 'devRowLockAll'], ['unlock', 'devRowUnlock'], ['set_char', 'devRowSetChar'], ['inspect', 'devRowInspect'], ['help', 'devRowHelp']],

  charIds() { return CHARACTER_DEFS.map((d) => d.id); },
  idsText() { return this.charIds().join(', '); },
  push(text, rgb) { this.log.push({ text, rgb }); if (this.log.length > 7) this.log.shift(); },

  // Executa uma linha de comando. Devolve a mensagem (também vai para o console e o painel)
  exec(line) {
    const parts = String(line == null ? '' : line).trim().split(/\s+/).filter(Boolean);
    const cmd = (parts[0] || 'help').toLowerCase(), arg = (parts[1] || '').toLowerCase();
    let res;
    switch (cmd) {
      case 'help': case '?': res = [t('devHelp', { ids: this.idsText() }), true]; break;
      case 'unlock_all': res = this.unlockAll(); break;
      case 'lock_all': res = this.lockAll(); break;
      case 'unlock': res = arg ? this.unlock(arg) : [t('devNeedId', { cmd, ids: this.idsText() }), false]; break;
      case 'set_char': res = arg ? this.setChar(arg) : [t('devNeedId', { cmd, ids: this.idsText() }), false]; break;
      case 'level': case 'set_level': {
        const lvl = parseInt(arg, 10);
        if (isNaN(lvl) || lvl < 1 || lvl > PROG.maxLevel) {
          res = [`Informe um nível válido (1-${PROG.maxLevel}): level <n>`, false];
        } else if (game && game.progress) {
          const from = game.progress.level;
          game.progress.level = lvl;
          game.progress.xp = 0;
          if (lvl > from) game.onLevelUp(from, lvl);
          else { game.checkRosterUnlocks(); game.saveGame(); }
          res = [`Nível alterado para ${lvl}`, true];
        } else {
          res = ['Jogo não iniciado', false];
        }
        break;
      }
      case 'music': {
        const keys = typeof MUSIC_TRACKS !== 'undefined' ? Object.keys(MUSIC_TRACKS).join(', ') : '';
        if (!arg) {
          res = [`Faixas de música: ${keys}`, true];
        } else if (typeof MUSIC_TRACKS !== 'undefined' && MUSIC_TRACKS[arg]) {
          if (game && game.audio) game.audio.playMusic(arg, { fade: 0.5 });
          res = [`Tocando música: ${MUSIC_TRACKS[arg].title}`, true];
        } else {
          res = [`Faixa desconhecida. Opções: ${keys}`, false];
        }
        break;
      }
      case 'inspect': this.toggle(false); Inspector3D.toggle(true); res = [t('devInspect'), true]; break;
      default: res = [t('devUnknownCmd', { cmd }), false];
    }
    this.push(`> ${[cmd, arg].filter(Boolean).join(' ')}`, '150,170,200');
    this.push(res[0], res[1] ? '140,240,180' : '255,140,150');
    console.log(`[dev] ${res[0]}`);
    return res[0];
  },
  // Grava a mudança no espaço em uso (só dentro de uma partida)
  persist() { if (game && game.state !== 'menu') game.saveGame(); },
  unlockAll() {
    for (const d of CHARACTER_DEFS) RosterManager.unlock(d.id, true);
    for (const id in ARMOR_DEFS) RosterManager.unlockArmor(id, true);
    for (const id in WEAPON_DEFS) RosterManager.unlockWeapon(id, true);
    this.persist();
    return [t('devUnlockAll', { n: CHARACTER_DEFS.length, a: Object.keys(ARMOR_DEFS).length }), true];
  },
  lockAll() {
    for (const d of CHARACTER_DEFS) RosterManager.lock(d.id);   // o ativo volta a ser o inicial
    for (const id in ARMOR_DEFS) RosterManager.lockArmor(id);
    this.persist();
    return [t('devLockAll', { name: CHARACTERS_BY_ID[DEFAULT_CHARACTER].name }), true];
  },
  unlock(id) {
    const d = RosterManager.def(id);
    if (d) {
      if (!RosterManager.unlock(id)) return [t('devAlready', { name: d.name }), false];
      this.persist();
      return [t(d.devStatus === 'coming_soon' ? 'devUnlockedSoon' : 'devUnlocked', { name: d.name }), true];
    }
    const a = ARMOR_DEFS[id];
    if (a) {
      const label = `${a.name} (${a.owner === 'all' ? t('everyone') : (RosterManager.def(a.owner) || {}).name})`;
      if (!RosterManager.unlockArmor(id)) return [t('devAlready', { name: label }), false];
      this.persist();
      return [t('devUnlocked', { name: label }), true];
    }
    const w = WEAPON_DEFS[id];
    if (w) {
      const label = `${w.name} (${w.owner === 'all' ? t('everyone') : (RosterManager.def(w.owner) || {}).name})`;
      if (!RosterManager.unlockWeapon(id)) return [t('devAlready', { name: label }), false];
      this.persist();
      return [t('devUnlocked', { name: label }), true];
    }
    return [t('devUnknown', { id, ids: this.idsText() }), false];
  },
  setChar(id) {
    const d = RosterManager.def(id);
    if (!d) return [t('devUnknown', { id, ids: this.idsText() }), false];
    if (d.devStatus === 'coming_soon') return [t('comingSoonMsg', { name: d.name }), false];
    if (!RosterManager.isUnlocked(id)) return [t('devLockedHint', { msg: t('lockedMsg', { name: d.name, cond: RosterManager.describe(d.unlock) }), id }), false];
    if (RosterManager.active === id) return [t('alreadyActive', { name: d.name }), false];
    RosterManager.setActive(id);   // o jogo recria o Player com a nova ficha (characterChanged)
    this.persist();
    return [t('switched', { name: d.name }), true];
  },
  // Linha selecionada do painel → comando
  rowCommand(i) {
    const [cmd] = this.rows[i];
    return cmd in this.ids ? `${cmd} ${this.charIds()[this.ids[cmd]]}` : cmd;
  },

  // ------------------------------------------------------------- entrada
  init() {
    if (!DEV_MODE) return;
    window.dev = {
      help: () => this.exec('help'),
      unlock_all: () => this.exec('unlock_all'),
      lock_all: () => this.exec('lock_all'),
      unlock: (id) => this.exec(`unlock ${id}`),
      set_char: (id) => this.exec(`set_char ${id}`),
      music: (id) => this.exec(`music ${id || ''}`),
      inspect: (on = true) => Inspector3D.toggle(on),
      run: (line) => this.exec(line),
      panel: (on = !this.open) => { this.toggle(on); return this.open; },
    };
    // Fase de captura: o painel recebe as teclas antes do Input do jogo e as segura
    window.addEventListener('keydown', (e) => this.onKey(e), true);
    Inspector3D.init();
    console.info('[dev] Modo de desenvolvimento: tecla ` abre o console do elenco; no navegador, dev.help()');
  },
  toggle(on) {
    this.open = !!on; this.keys.length = 0; this.buf = '';
    if (this.open && !this.log.length) this.push(t('devHelp', { ids: this.idsText() }), '150,170,200');
  },
  onKey(e) {
    if (Inspector3D.open) return;   // o inspetor 3D cuida das teclas enquanto está aberto
    // ` (crase): a tecla à esquerda do 1 (Backquote) ou a crase digitada (inclusive a tecla morta do ABNT2)
    const isToggle = e.code === 'Backquote' || e.key === '`' || (e.key === 'Dead' && e.code === 'BracketLeft' && e.shiftKey);
    if (!this.open) {
      if (isToggle && !e.repeat) { this.toggle(true); e.preventDefault(); e.stopImmediatePropagation(); }
      return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
    if (isToggle) { this.keys.push('close'); return; }
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'enter', NumpadEnter: 'enter', Escape: 'close' };
    if (map[e.key] || map[e.code]) { this.keys.push(map[e.key] || map[e.code]); return; }
    if (e.key === 'Backspace') { this.buf = this.buf.slice(0, -1); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) this.buf = (this.buf + e.key).slice(0, 48);
  },
  // Com o painel aberto, consome a entrada do quadro e devolve true (o jogo não atualiza)
  update(dt, inp) {
    if (!DEV_MODE) return false;
    this.t += dt;
    if (Inspector3D.open) return Inspector3D.update(dt, inp);
    if (!this.open) return false;
    const n = this.rows.length, nc = CHARACTER_DEFS.length;
    const move = (d) => { this.sel = (this.sel + d + n) % n; game.audio.play('uiMove'); };
    const cycle = (d) => { const c = this.rows[this.sel][0]; if (c in this.ids) { this.ids[c] = (this.ids[c] + d + nc) % nc; game.audio.play('uiMove'); } };
    const run = () => {
      if (this.buf.trim()) { this.exec(this.buf); this.buf = ''; } else this.exec(this.rowCommand(this.sel));
      game.audio.play('uiSelect');
    };
    // Teclado (capturado em onKey) e controle (o Input só recebe o controle com o painel aberto)
    const ev = this.keys.splice(0);
    if (inp.pressed.up) ev.push('up');
    if (inp.pressed.down) ev.push('down');
    if (inp.pressed.left) ev.push('left');
    if (inp.pressed.right) ev.push('right');
    if (inp.pressed.confirm) ev.push('enter');
    if (inp.pressed.back || inp.pressed.pause) ev.push('close');
    for (const k of ev) {
      if (k === 'close') { this.toggle(false); game.audio.play('uiMove'); return true; }
      if (k === 'up') move(-1); else if (k === 'down') move(1);
      else if (k === 'left') cycle(-1); else if (k === 'right') cycle(1);
      else if (k === 'enter') run();
    }
    // Mouse: clique numa linha executa; nas setas, troca o id
    const m = inp.mouse, L = this.layout();
    if (m.moved || m.clicked) {
      L.rows.forEach((r, i) => {
        if (!inRect(m, r)) return;
        if (i !== this.sel) { this.sel = i; game.audio.play('uiMove'); }
        if (!m.clicked) return;
        if (r.prev && inRect(m, r.prev)) cycle(-1);
        else if (r.next && inRect(m, r.next)) cycle(1);
        else { this.buf = ''; run(); }
      });
    }
    return true;
  },

  // ------------------------------------------------------------- desenho
  layout() {
    const w = Math.min(600, VIEW_W - 40), x = Math.round((VIEW_W - w) / 2), y = 54;
    const rows = this.rows.map(([cmd], i) => {
      const r = { x: x + 16, y: y + 78 + i * 32, w: w - 32, h: 28 };
      if (cmd in this.ids) { r.prev = { x: r.x + 118, y: r.y, w: 22, h: 28 }; r.next = { x: r.x + 228, y: r.y, w: 22, h: 28 }; }
      return r;
    });
    const iy = y + 78 + this.rows.length * 32 + 10;
    return { x, y, w, h: iy - y + 36 + 7 * 18 + 40, rows, iy };
  },
  draw(ctx) {
    if (DEV_MODE && Inspector3D.open) Inspector3D.draw(ctx);
    if (!DEV_MODE || !this.open) return;
    const L = this.layout();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(5,6,10,0.97)'; techPanelPath(ctx, L.x, L.y, L.w, L.h, 12); ctx.fill();
    ctx.strokeStyle = rgba(DEV_RGB, 0.85); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 15px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = rgba(DEV_RGB, 1);
    ctx.fillText(t('devTitle'), L.x + 18, L.y + 24);
    ctx.letterSpacing = '0px';
    const tag = 'DEV', tw = ctx.measureText(tag).width + 14;
    ctx.font = `bold 10px ${FONT_TITLE}`;
    ctx.fillStyle = rgba(DEV_RGB, 0.9); ctx.fillRect(L.x + L.w - tw - 18, L.y + 16, tw, 16);
    ctx.fillStyle = '#120c02'; ctx.textAlign = 'center'; ctx.fillText(tag, L.x + L.w - tw / 2 - 18, L.y + 24.5);
    ctx.textAlign = 'left';
    // Estado atual do elenco
    const act = RosterManager.activeDef, list = CHARACTER_DEFS.filter((d) => RosterManager.isUnlocked(d.id)).map((d) => d.id);
    ctx.font = `12px ${FONT_MONO}`; ctx.fillStyle = 'rgba(214,224,240,0.85)';
    ctx.fillText(t('devState', { active: act.name, list: list.join(', ') }), L.x + 18, L.y + 50);
    ctx.fillStyle = 'rgba(255,190,90,0.22)'; ctx.fillRect(L.x + 16, L.y + 64, L.w - 32, 1);
    // Comandos
    this.rows.forEach(([cmd, desc], i) => {
      const r = L.rows[i], sel = i === this.sel;
      if (sel) { ctx.fillStyle = rgba(DEV_RGB, 0.16); ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = rgba(DEV_RGB, 1); ctx.fillRect(r.x, r.y, 3, r.h); }
      const cy = r.y + r.h / 2;
      ctx.font = `bold 13px ${FONT_MONO}`; ctx.fillStyle = sel ? '#fff4dc' : 'rgba(230,220,200,0.85)';
      ctx.fillText(cmd, r.x + 12, cy);
      if (cmd in this.ids) {
        const id = this.charIds()[this.ids[cmd]], d = CHARACTERS_BY_ID[id];
        ctx.strokeStyle = sel ? '#fff4dc' : 'rgba(230,220,200,0.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        const a = r.prev, b = r.next;
        ctx.beginPath(); ctx.moveTo(a.x + 14, cy - 5); ctx.lineTo(a.x + 9, cy); ctx.lineTo(a.x + 14, cy + 5);
        ctx.moveTo(b.x + 8, cy - 5); ctx.lineTo(b.x + 13, cy); ctx.lineTo(b.x + 8, cy + 5); ctx.stroke();
        ctx.textAlign = 'center'; ctx.fillStyle = rgba(hexToRgb(d.color), 1);
        ctx.fillText(id, (a.x + a.w + b.x) / 2, cy);
        ctx.textAlign = 'left';
      }
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(190,200,215,0.72)';
      ctx.fillText(t(desc), r.x + 268, cy);
    });
    // Linha digitada
    const iy = L.iy;
    ctx.fillStyle = 'rgba(14,12,8,0.95)'; ctx.fillRect(L.x + 16, iy, L.w - 32, 28);
    ctx.strokeStyle = rgba(DEV_RGB, 0.45); ctx.lineWidth = 1; ctx.strokeRect(L.x + 16.5, iy + 0.5, L.w - 33, 27);
    ctx.font = `13px ${FONT_MONO}`; ctx.fillStyle = rgba(DEV_RGB, 1);
    const shown = `> ${this.buf}`;
    ctx.fillText(shown, L.x + 26, iy + 14.5);
    if (Math.sin(this.t * 7) > 0) ctx.fillRect(L.x + 27 + ctx.measureText(shown).width, iy + 7, 7, 15);
    // Registro (as linhas mais recentes que couberem)
    ctx.font = `12px ${FONT_MONO}`;
    const lines = [];
    for (const e of this.log) for (const ln of wrapText(ctx, e.text, L.w - 44)) lines.push([ln, e.rgb]);
    const fit = Math.floor((L.y + L.h - 34 - (iy + 46)) / 17) + 1;
    lines.slice(-fit).forEach(([ln, rgb], k) => { ctx.fillStyle = rgba(rgb, 0.95); ctx.fillText(ln, L.x + 22, iy + 46 + k * 17); });
    ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(190,200,215,0.6)';
    ctx.fillText(t('devHints'), L.x + 18, L.y + L.h - 16);
    ctx.restore();
  },
};
DevTools.init();
