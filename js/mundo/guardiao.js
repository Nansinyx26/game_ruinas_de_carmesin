'use strict';
// ECLIPSE ZERO · O Guardião do Mundo (GM): bênçãos, bônus de experiência e evento do mundo
// ---------------------------------------------------------------------------
// O Guardião (morador mes_gm, corpo e armas dos GLB de assets/GM: js/mundo/npc3d.js) concede
// BÊNÇÃOS: experiência 2x/3x/5x/10x, ataque, defesa, velocidade, regeneração, energia, sorte e
// recuperação. Cada uma dura de 15 minutos a 24 horas do RELÓGIO DE VERDADE (Date.now()): o tempo
// corre com o jogo fechado e a bênção acaba na hora marcada.
//  · O jogador pede a bênção na conversa e paga em células (a primeira do dia é de graça).
//  · O PAINEL DO GUARDIÃO (modo administrador: Guardiao.admin.ligar() no console, ou a tecla F9 no
//    painel) concede qualquer bênção sem custo, remove, e abre/fecha o EVENTO DE XP DO MUNDO, que
//    vale para todos os personagens deste aparelho, com avisos de início, 5 min, 1 min e fim.
//  · A HUD mostra, logo abaixo dos vitais, um ícone próprio por bênção (PNG de 512×512 em
//    assets/icons/buffs/, tools/icones_buffs.py) com o tempo que falta; o herói ganha a aura dela.
// O jogo não tem servidor: as regras (uma bênção por tipo, teto de 24 h, custo, registro) valem no
// próprio jogo e o estado fica no save do personagem (World.state.gm) e, o evento, no aparelho.
// ---------------------------------------------------------------------------
const GM_BUFFS = {
  xp: { nome: 'Bênção da Experiência', rgb: '170,130,255', niveis: [2, 3, 5, 10], desc: (n) => `Experiência ${n}x em tudo o que você derrotar e concluir`, custo: [40, 90, 220, 600] },
  ataque: { nome: 'Fúria do Guardião', rgb: '255,90,70', desc: () => '+25% de dano em todos os golpes', custo: [60] },
  defesa: { nome: 'Pele de Aço', rgb: '90,160,255', desc: () => '+20% de armadura (menos dano recebido)', custo: [60] },
  velocidade: { nome: 'Passos do Vento', rgb: '110,235,200', desc: () => '+20% de velocidade ao andar e correr', custo: [45] },
  regen: { nome: 'Sopro da Vida', rgb: '110,230,120', desc: () => 'Recupera 1,2% da vida por segundo', custo: [70] },
  mana: { nome: 'Fonte de Energia', rgb: '80,200,255', desc: () => 'A energia recarrega duas vezes mais rápido', custo: [55] },
  sorte: { nome: 'Olho da Fortuna', rgb: '255,205,70', desc: () => '+25 de Sorte: mais crítico e saque melhor', custo: [80] },
  recuperacao: { nome: 'Fôlego Renovado', rgb: '255,150,60', desc: () => 'Habilidades recarregam 25% mais rápido', custo: [65] },
};
const GM_ORDEM = ['xp', 'ataque', 'defesa', 'velocidade', 'regen', 'mana', 'sorte', 'recuperacao'];
// [minutos, nome, multiplicador do custo]
const GM_DURACOES = [[15, '15 min', 1], [30, '30 min', 1.8], [60, '1 hora', 3.2], [120, '2 horas', 5.6], [360, '6 horas', 13], [720, '12 horas', 22], [1440, '24 horas', 36]];
const GM_TETO = 24 * 3600e3, GM_EVENTO_KEY = 'ez_gm_evento', GM_ADMIN_KEY = 'ez_gm_admin';

const Guardiao = {
  ui: { t: 0, sel: 0, dur: 0, nivel: 0, aba: 0, rects: [], msg: '', msgT: 0 },
  img: {}, _avisos: {}, _ev: undefined, _passo: 0,
  agora() { return Date.now(); },
  // ------------------------------------------------------------------ estado
  S() {
    if (typeof World === 'undefined' || !World.state) return null;
    const s = World.state.gm || (World.state.gm = { buffs: {}, log: [], gratis: '' });
    if (!s.buffs) s.buffs = {}; if (!s.log) s.log = [];
    return s;
  },
  ativo(id) { const s = this.S(), b = s && s.buffs[id]; return b && b.ate > this.agora() ? b : null; },
  resta(id) { const b = this.ativo(id); return b ? (b.ate - this.agora()) / 1000 : 0; },
  lista() { return GM_ORDEM.filter((id) => this.ativo(id)); },
  evento() {
    if (this._ev === undefined) { try { this._ev = JSON.parse(localStorage.getItem(GM_EVENTO_KEY) || 'null'); } catch (e) { this._ev = null; } }
    const E = this._ev;
    return E && E.ate > this.agora() && E.de <= this.agora() ? E : null;
  },
  ehAdmin() { try { return localStorage.getItem(GM_ADMIN_KEY) === '1'; } catch (e) { return !!this._adm; } },
  registrar(txt) {
    const s = this.S(); if (!s) return;
    s.log.unshift({ t: this.agora(), txt }); if (s.log.length > 30) s.log.length = 30;
  },
  // ------------------------------------------------------------------ regras
  // Multiplicador de experiência agora: a bênção do herói e o evento do mundo não se somam (vale o maior)
  xpMult() { const b = this.ativo('xp'), E = this.evento(); return Math.max(1, b ? b.nivel : 1, E ? E.mult : 1); },
  preco(id, nivel, dur) { const B = GM_BUFFS[id], D = GM_DURACOES[dur]; return Math.round((B.custo[nivel] || B.custo[0]) * D[2]); },
  gratisHoje() { const s = this.S(); return !!s && s.gratis !== new Date().toDateString(); },
  // Concede (ou renova) uma bênção. Devolve '' ou o motivo da recusa. Uma por tipo; renovar soma o
  // tempo até o teto de 24 h; um nível de XP diferente substitui o anterior
  conceder(id, nivel, minutos, origem) {
    const B = GM_BUFFS[id], s = this.S();
    if (!B || !s) return 'Bênção desconhecida.';
    nivel = B.niveis ? clamp(nivel | 0, 0, B.niveis.length - 1) : 0;
    minutos = +minutos;
    if (!(minutos >= 1) || minutos > 1440) return 'Duração inválida (de 15 minutos a 24 horas).';
    const t = this.agora(), valor = B.niveis ? B.niveis[nivel] : 1, a = this.ativo(id);
    let ate = t + minutos * 60e3;
    if (a && a.nivel === valor) ate = Math.min(t + GM_TETO, a.ate + minutos * 60e3);   // renovar: soma, até 24 h
    s.buffs[id] = { ate, nivel: valor, de: t, dur: ate - t };
    this.registrar(`${origem || 'Guardião'} concedeu ${B.nome}${B.niveis ? ' ' + valor + 'x' : ''} por ${this.tempo((ate - t) / 1000)}`);
    this._avisos[id] = null;
    this.aplicarAgora();
    const p = game.player;
    if (p && game.particles && game.particles.burst) game.particles.burst(p.x, p.y, 30, B.rgb, 26, 150);
    game.audio.play('levelup');
    game.hud.toast(`${B.nome}${B.niveis ? ' ' + valor + 'x' : ''} · ${this.tempo((ate - t) / 1000)}`, B.rgb);
    World.save();
    return '';
  },
  // Pedido do jogador na conversa: cobra em células (a primeira do dia, de 15 min, sai de graça)
  pedir(id, nivel, dur) {
    const s = this.S(), D = GM_DURACOES[dur], gratis = this.gratisHoje() && dur === 0 && !(GM_BUFFS[id].niveis && nivel > 0);
    if (!s || !D) return 'Agora não.';
    const preco = gratis ? 0 : this.preco(id, nivel, dur);
    if (preco > 0) { const e = Oficios.cobrar(preco); if (e) return e; }
    const r = this.conceder(id, nivel, D[0], 'Guardião');
    if (!r && gratis) s.gratis = new Date().toDateString();
    if (!r) World.save();
    return r;
  },
  remover(id, origem) {
    const s = this.S(); if (!s || !s.buffs[id]) return;
    delete s.buffs[id];
    this.registrar(`${origem || 'Guardião'} removeu ${GM_BUFFS[id].nome}`);
    this.aplicarAgora(); World.save();
  },
  aplicarAgora() { const p = game.player; if (p && p.recalc) p.recalc(false); },
  // Efeito nos atributos (Player.recalc, depois das relíquias)
  aplicar(S) {
    if (this.ativo('ataque')) S.dmgMult += 0.25;
    if (this.ativo('defesa')) S.armor += 0.2;
    if (this.ativo('velocidade')) S.speedMult += 0.2;
    if (this.ativo('mana')) S.regen *= 2;
    if (this.ativo('sorte')) { S.sorte = (S.sorte || 0) + 25; S.crit += 0.05; }
    if (this.ativo('recuperacao')) S.cdr = Math.max(0.3, S.cdr * 0.75);
  },
  // ------------------------------------------------------------------ evento de XP do mundo
  abrirEvento(mult, minutos, nome) {
    mult = +mult; minutos = +minutos;
    if (![2, 3, 5, 10].includes(mult)) return 'O evento vale 2x, 3x, 5x ou 10x.';
    if (!(minutos >= 1) || minutos > 1440) return 'Duração inválida (até 24 horas).';
    const t = this.agora();
    this._ev = { mult, de: t, ate: t + minutos * 60e3, nome: nome || `EVENTO DE EXPERIÊNCIA ${mult}x` };
    try { localStorage.setItem(GM_EVENTO_KEY, JSON.stringify(this._ev)); } catch (e) { /* vale só nesta sessão */ }
    this._avisos.evento = null;
    this.registrar(`Evento do mundo aberto: XP ${mult}x por ${this.tempo(minutos * 60)}`);
    this.anunciar(`${this._ev.nome} COMEÇOU`, `Experiência ${mult}x para todos por ${this.tempo(minutos * 60)}`, '255,120,220');
    if (World.state) World.save();
    return '';
  },
  fecharEvento(quieto) {
    if (!this._ev) return;
    this._ev = null;
    try { localStorage.removeItem(GM_EVENTO_KEY); } catch (e) { /* nada */ }
    if (!quieto) { this.registrar('Evento do mundo encerrado'); this.anunciar('EVENTO DE EXPERIÊNCIA ENCERRADO', 'A experiência voltou ao normal', '255,120,220'); }
  },
  anunciar(titulo, sub, rgb) {
    const g = game;
    if (g.hud && g.hud.message) g.hud.message(titulo, sub, 4, true);
    if (g.hud && g.hud.toast) g.hud.toast(titulo, rgb);
    if (g.audio) g.audio.play('levelup');
  },
  // ------------------------------------------------------------------ a cada quadro (World.update)
  update(dt) {
    const g = game, p = g.player, s = this.S();
    if (!s || !p) return;
    // regeneração (tempo de jogo, só com o herói de pé)
    if (this.ativo('regen') && p.state !== 'dead' && p.hp > 0 && p.hp < p.maxHp) {
      this._cura = (this._cura || 0) + p.maxHp * 0.012 * dt;
      if (this._cura >= 1) { const n = Math.floor(this._cura); this._cura -= n; p.hp = Math.min(p.maxHp, p.hp + n); }
    }
    if ((this._passo -= dt) > 0) return;
    this._passo = 0.5;
    // fim e avisos de cada bênção (relógio de verdade)
    const t = this.agora();
    let mudou = false;
    for (const id of GM_ORDEM) {
      const b = s.buffs[id]; if (!b) continue;
      const r = (b.ate - t) / 1000, B = GM_BUFFS[id], A = this._avisos;
      if (r <= 0) { delete s.buffs[id]; mudou = true; g.hud.toast(`${B.nome} acabou`, '200,200,210'); this.registrar(`${B.nome} acabou`); A[id] = null; continue; }
      const marca = r <= 60 ? 1 : r <= 300 ? 5 : 0;
      if (marca && A[id] !== marca && b.dur > marca * 60e3 * 1.5) { A[id] = marca; g.hud.toast(`${B.nome}: ${marca === 1 ? 'último minuto' : 'faltam 5 minutos'}`, B.rgb); }
    }
    if (mudou) { this.aplicarAgora(); World.save(); }
    const E = this._ev === undefined ? (this.evento(), this._ev) : this._ev;
    if (E) {
      const r = (E.ate - t) / 1000, A = this._avisos;
      if (r <= 0) this.fecharEvento(false);
      else {
        const marca = r <= 60 ? 1 : r <= 300 ? 5 : 0;
        if (marca && A.evento !== marca) { A.evento = marca; this.anunciar(E.nome, marca === 1 ? 'Último minuto do evento' : 'Faltam 5 minutos para o fim', '255,120,220'); }
        else if (!A.evento && !A.eventoVisto) { A.eventoVisto = true; g.hud.toast(`${E.nome} em andamento · ${this.tempo(r)}`, '255,120,220'); }
      }
    }
  },
  tempo(seg) {
    seg = Math.max(0, Math.round(seg));
    const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s2 = seg % 60;
    return h > 0 ? `${h}h${m ? ' ' + String(m).padStart(2, '0') + 'min' : ''}` : m > 0 ? (seg < 600 ? `${m}:${String(s2).padStart(2, '0')}` : `${m} min`) : `${s2}s`;
  },
  // Tempo curto para a HUD: 23h58, 58m, 4:05, 40s
  curto(seg) {
    seg = Math.max(0, Math.round(seg));
    const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s2 = seg % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : m >= 10 ? `${m}m` : m > 0 ? `${m}:${String(s2).padStart(2, '0')}` : `${s2}s`;
  },
  icone(id) {
    let I = this.img[id];
    if (!I) { I = this.img[id] = new Image(); I.src = `assets/icons/buffs/${id}.png`; }
    return I.complete && I.naturalWidth > 0 ? I : null;
  },
  // ------------------------------------------------------------------ HUD: a barra de bênçãos
  // Uma fileira logo abaixo dos vitais: ícone próprio, aro que esvazia com o tempo e o tempo que falta
  hud(ctx, x, y) {
    const L = this.lista(), E = this.evento(), t = game.realTime, T = 34, passo = T + 8;
    const itens = L.map((id) => ({ id, rgb: GM_BUFFS[id].rgb, r: this.resta(id), dur: this.ativo(id).dur / 1000, txt: GM_BUFFS[id].niveis ? this.ativo(id).nivel + 'x' : '' }));
    if (E) itens.push({ id: 'evento', rgb: '255,120,220', r: (E.ate - this.agora()) / 1000, dur: (E.ate - E.de) / 1000, txt: E.mult + 'x' });
    this._hudRects = [];
    if (!itens.length) return 0;
    ctx.save();
    itens.forEach((q, i) => {
      const cx = x + T / 2 + i * passo, cy = y + T / 2, I = this.icone(q.id), acabando = q.r < 60;
      const a = acabando ? 0.55 + 0.45 * Math.abs(Math.sin(t * 5)) : 1;
      ctx.globalAlpha = a;
      if (I) ctx.drawImage(I, cx - T / 2, cy - T / 2, T, T);
      else { ctx.fillStyle = 'rgba(8,12,24,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, T / 2, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba(q.rgb, 0.9); ctx.lineWidth = 2; ctx.stroke(); }
      // o tempo que já passou escurece o ícone no sentido do relógio
      const k = clamp(1 - q.r / Math.max(1, q.dur), 0, 1);
      if (k > 0.004) { ctx.fillStyle = 'rgba(4,6,12,0.6)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, T / 2 - 1, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.font = `bold 10px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(4,6,12,0.9)'; ctx.strokeText(this.curto(q.r), cx, y + T + 2);
      ctx.fillStyle = acabando ? '#ff9a8a' : '#e8eefc'; ctx.fillText(this.curto(q.r), cx, y + T + 2);
      if (q.txt) { ctx.font = `bold 10px ${FONT_UI}`; ctx.textBaseline = 'alphabetic'; ctx.strokeText(q.txt, cx + T / 2 - 6, y + T - 1); ctx.fillStyle = rgba(q.rgb, 1); ctx.fillText(q.txt, cx + T / 2 - 6, y + T - 1); }
      this._hudRects.push({ id: q.id, x: cx - T / 2, y, w: T, h: T + 14 });
    });
    // o nome da bênção sob o cursor
    const m = game.input && game.input.mouse;
    if (m) for (const r of this._hudRects) if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) {
      const B = GM_BUFFS[r.id], nome = B ? `${B.nome} — ${B.desc(this.ativo(r.id).nivel)}` : `${E.nome} — experiência ${E.mult}x para todos`;
      ctx.font = `11px ${FONT_UI}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(nome).width + 14;
      ctx.fillStyle = 'rgba(5,9,20,0.94)'; ctx.fillRect(r.x, r.y + r.h + 4, w, 20);
      ctx.fillStyle = '#e8eefc'; ctx.fillText(nome, r.x + 7, r.y + r.h + 14);
    }
    ctx.restore();
    return T + 16;
  },
  // Aura do herói: um anel no chão por bênção ativa, na cor dela, e centelhas subindo
  aura(ctx, p, t) {
    const L = this.lista();
    if (!L.length || typeof GlowCache === 'undefined') return;
    const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    L.forEach((id, i) => {
      const B = GM_BUFFS[id], f = t * (1.1 + i * 0.13) + i * 1.7, r = 20 + i * 3.2;
      GlowCache.drawFlat(ctx, B.rgb, sx, sy, r + 6, 0.2 + 0.08 * Math.sin(f * 2));
      const ax = sx + Math.cos(f) * r, ay = sy + Math.sin(f) * r * 0.5;
      GlowCache.draw(ctx, B.rgb, ax, ay - 6 - 10 * (0.5 + 0.5 * Math.sin(f * 1.7)), 5, 0.75);
    });
    ctx.restore();
  },
  // ------------------------------------------------------------------ conversa com o Guardião
  servico(npc, s, o, volta) {
    if (s !== 'gm') return false;
    const E = this.evento();
    o.push({ id: 'gm_bencao', tag: '✦', txt: this.gratisHoje() ? 'Pedir uma bênção (a de hoje é por conta do Guardião)' : 'Pedir uma bênção', fn: () => { Dialogo.fechar(); this.abrir(0); } });
    if (E) o.push({ id: 'gm_evento', tag: '★', txt: `${E.nome}: faltam ${this.tempo((E.ate - this.agora()) / 1000)}`, fn: () => volta(`O mundo inteiro está com experiência ${E.mult}x. Aproveite enquanto dura.`) });
    if (this.ehAdmin()) o.push({ id: 'gm_painel', tag: '⚙', txt: 'Painel do Guardião (administrador)', fn: () => { Dialogo.fechar(); this.abrir(1); } });
    return true;
  },
  abrir(aba) { const U = this.ui; U.t = 0; U.aba = aba && this.ehAdmin() ? 1 : 0; U.msg = ''; U.msgT = 0; game.state = 'worldgm'; game.audio.play('uiSelect'); },
  fechar() { game.state = 'playing'; },
  aviso(txt) { const U = this.ui; U.msg = txt; U.msgT = 3; },
  // ------------------------------------------------------------------ o painel (estado worldgm)
  updateUI(dt, inp) {
    const U = this.ui, n = GM_ORDEM.length;
    U.t += dt; if (U.msgT > 0) U.msgT -= dt;
    this.update(dt);
    if (inp.pressed.back || inp.pressed.pause) { this.fechar(); game.audio.play('uiMove'); return; }
    const id = GM_ORDEM[U.sel], B = GM_BUFFS[id];
    if (inp.pressed.up) { U.sel = (U.sel + n - 1) % n; U.nivel = 0; game.audio.play('uiMove'); }
    if (inp.pressed.down) { U.sel = (U.sel + 1) % n; U.nivel = 0; game.audio.play('uiMove'); }
    if (inp.pressed.left) { U.dur = (U.dur + GM_DURACOES.length - 1) % GM_DURACOES.length; game.audio.play('uiMove'); }
    if (inp.pressed.right) { U.dur = (U.dur + 1) % GM_DURACOES.length; game.audio.play('uiMove'); }
    let acao = inp.pressed.confirm || inp.pressed.interact ? 'conceder' : null;
    const m = inp.mouse;
    if (m && m.clicked) for (const r of U.rects) if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) {
      if (r.id === 'fechar') { this.fechar(); return; }
      if (r.tipo === 'buff') { U.sel = r.k; U.nivel = 0; game.audio.play('uiMove'); }
      else if (r.tipo === 'dur') { U.dur = r.k; game.audio.play('uiMove'); }
      else if (r.tipo === 'nivel') { U.nivel = r.k; game.audio.play('uiMove'); }
      else if (r.tipo === 'aba') { U.aba = r.k; game.audio.play('uiMove'); }
      else acao = r.id;
      break;
    }
    if (!acao) return;
    const D = GM_DURACOES[U.dur];
    let e = '';
    if (acao === 'conceder') e = U.aba === 1 ? this.conceder(id, U.nivel, D[0], 'Administrador') : this.pedir(id, U.nivel, U.dur);
    else if (acao === 'remover') { if (U.aba === 1) this.remover(id, 'Administrador'); }
    else if (acao === 'evento') e = U.aba === 1 ? this.abrirEvento(B.niveis ? B.niveis[U.nivel] : [2, 3, 5, 10][U.nivel] || 2, D[0]) : '';
    else if (acao === 'fimevento') { if (U.aba === 1) this.fecharEvento(false); }
    if (e) { this.aviso(e); game.audio.play('uiDeny'); }
  },
  draw(ctx, t) {
    const U = this.ui, a = clamp(U.t / 0.2, 0, 1), adm = U.aba === 1;
    ctx.save();
    ctx.fillStyle = `rgba(2,5,12,${0.62 * a})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const W = Math.min(VIEW_W - 24, 860), H = Math.min(VIEW_H - 24, 560), x0 = (VIEW_W - W) / 2, y0 = (VIEW_H - H) / 2 + (1 - a) * 18;
    const cor = adm ? '255,120,220' : '255,205,90';
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(5,9,20,0.97)'; techPanelPath(ctx, x0, y0, W, H, 12); ctx.fill();
    ctx.strokeStyle = rgba(cor, 0.8); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 19px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = rgba(cor, 1);
    ctx.fillText(adm ? 'PAINEL DO GUARDIÃO' : 'BÊNÇÃOS DO GUARDIÃO', VIEW_W / 2, y0 + 26);
    ctx.letterSpacing = '0px'; ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.8)';
    ctx.fillText(adm ? 'Administrador: concede sem custo, remove e comanda o evento do mundo' : `Células: ${game.stats.soulsBank} · o tempo corre no relógio de verdade, mesmo com o jogo fechado`, VIEW_W / 2, y0 + 46);
    const R = U.rects = [{ id: 'fechar', x: x0 + W - 38, y: y0 + 8, w: 30, h: 30 }];
    ctx.font = `bold 16px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.7)'; ctx.fillText('✕', x0 + W - 23, y0 + 24);
    if (this.ehAdmin()) ['BÊNÇÃOS', 'ADMINISTRADOR'].forEach((n, k) => {
      const bx = x0 + 16 + k * 128, by = y0 + 12;
      ctx.fillStyle = rgba(cor, U.aba === k ? 0.28 : 0.08); ctx.fillRect(bx, by, 120, 22);
      ctx.font = `bold 10px ${FONT_UI}`; ctx.fillStyle = U.aba === k ? '#ffffff' : 'rgba(200,214,235,0.7)'; ctx.fillText(n, bx + 60, by + 12);
      R.push({ tipo: 'aba', k, x: bx, y: by, w: 120, h: 22 });
    });
    // lista das bênçãos (esquerda)
    const lx = x0 + 16, ly = y0 + 64, lw = Math.min(360, W * 0.44), lh = Math.min(50, (H - 150) / GM_ORDEM.length);
    GM_ORDEM.forEach((id, k) => {
      const B = GM_BUFFS[id], y = ly + k * lh, sel = k === U.sel, at = this.ativo(id), I = this.icone(id);
      ctx.fillStyle = rgba(B.rgb, sel ? 0.22 : 0.07); ctx.fillRect(lx, y, lw, lh - 5);
      if (sel) { ctx.strokeStyle = rgba(B.rgb, 0.95); ctx.lineWidth = 1.2; ctx.strokeRect(lx + 0.5, y + 0.5, lw - 1, lh - 6); }
      const T = lh - 11;
      if (I) ctx.drawImage(I, lx + 5, y + 3, T, T);
      ctx.textAlign = 'left'; ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = rgba(B.rgb, 1);
      ctx.fillText(B.nome, lx + T + 14, y + (lh - 5) * 0.34);
      ctx.font = `10px ${FONT_UI}`; ctx.fillStyle = at ? '#b6f7c2' : 'rgba(200,214,235,0.7)';
      ctx.fillText(at ? `ATIVA${B.niveis ? ' ' + at.nivel + 'x' : ''} · faltam ${this.tempo((at.ate - this.agora()) / 1000)}` : 'inativa', lx + T + 14, y + (lh - 5) * 0.72);
      R.push({ tipo: 'buff', k, x: lx, y, w: lw, h: lh - 5 });
    });
    // detalhe (direita)
    const id = GM_ORDEM[U.sel], B = GM_BUFFS[id], dx = lx + lw + 18, dw = x0 + W - 16 - dx, I = this.icone(id);
    let y = ly;
    if (I) ctx.drawImage(I, dx, y, 84, 84);
    ctx.textAlign = 'left'; ctx.font = `bold 17px ${FONT_TITLE}`; ctx.fillStyle = rgba(B.rgb, 1); ctx.fillText(B.nome.toUpperCase(), dx + 96, y + 22);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(220,230,245,0.9)';
    const nivelV = B.niveis ? B.niveis[Math.min(U.nivel, B.niveis.length - 1)] : 1;
    ctx.fillText(B.desc(nivelV), dx + 96, y + 46, dw - 100);
    ctx.font = `10px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.65)';
    ctx.fillText('Uma bênção por tipo · renovar soma o tempo (teto de 24 horas)', dx + 96, y + 66, dw - 100);
    y += 100;
    const botoes = (rot, lista, sel, tipo) => {
      ctx.font = `bold 10px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.75)'; ctx.textAlign = 'left'; ctx.fillText(rot, dx, y + 2);
      y += 14;
      const bw = Math.min(78, (dw - (lista.length - 1) * 5) / lista.length);
      lista.forEach((n, k) => {
        const bx = dx + k * (bw + 5), s = k === sel;
        ctx.fillStyle = rgba(B.rgb, s ? 0.3 : 0.08); ctx.fillRect(bx, y, bw, 26);
        if (s) { ctx.strokeStyle = rgba(B.rgb, 1); ctx.lineWidth = 1.2; ctx.strokeRect(bx + 0.5, y + 0.5, bw - 1, 25); }
        ctx.textAlign = 'center'; ctx.font = `bold 11px ${FONT_UI}`; ctx.fillStyle = s ? '#ffffff' : 'rgba(200,214,235,0.8)'; ctx.fillText(n, bx + bw / 2, y + 14);
        R.push({ tipo, k, x: bx, y, w: bw, h: 26 });
      });
      y += 40;
    };
    if (B.niveis) botoes('MULTIPLICADOR', B.niveis.map((n) => n + 'x'), Math.min(U.nivel, B.niveis.length - 1), 'nivel');
    botoes('DURAÇÃO  (◄ ►)', GM_DURACOES.map((d) => d[1]), U.dur, 'dur');
    const gratis = !adm && this.gratisHoje() && U.dur === 0 && !(B.niveis && U.nivel > 0), preco = adm || gratis ? 0 : this.preco(id, U.nivel, U.dur);
    const botao = (idB, txt, bx, bw, rgb, forte) => {
      ctx.fillStyle = rgba(rgb, forte ? 0.24 + 0.06 * Math.sin(t * 5) : 0.1); techPanelPath(ctx, bx, y, bw, 34, 7); ctx.fill();
      ctx.strokeStyle = rgba(rgb, forte ? 1 : 0.55); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.textAlign = 'center'; ctx.font = `bold 12px ${FONT_TITLE}`; ctx.fillStyle = '#ffffff'; ctx.fillText(txt, bx + bw / 2, y + 18);
      R.push({ id: idB, x: bx, y, w: bw, h: 34 });
    };
    botao('conceder', adm ? '[E]  CONCEDER SEM CUSTO' : gratis ? '[E]  RECEBER (DE GRAÇA HOJE)' : `[E]  RECEBER · ${preco} CÉLULAS`, dx, Math.min(dw, 300), B.rgb, true);
    if (adm) botao('remover', 'REMOVER', dx + Math.min(dw, 300) + 8, Math.max(60, Math.min(120, dw - 308)), '200,200,210', false);
    y += 48;
    if (adm) {
      const E = this.evento();
      ctx.textAlign = 'left'; ctx.font = `bold 11px ${FONT_UI}`; ctx.fillStyle = 'rgba(255,120,220,1)';
      ctx.fillText(E ? `EVENTO DO MUNDO: XP ${E.mult}x · faltam ${this.tempo((E.ate - this.agora()) / 1000)}` : 'EVENTO DO MUNDO: nenhum em andamento', dx, y + 4);
      y += 16;
      const mult = B.niveis ? B.niveis[Math.min(U.nivel, 3)] : 2;
      botao('evento', `ABRIR EVENTO XP ${mult}x · ${GM_DURACOES[U.dur][1]}`, dx, Math.min(dw, 300), '255,120,220', !E);
      if (E) botao('fimevento', 'ENCERRAR', dx + Math.min(dw, 300) + 8, Math.max(60, Math.min(120, dw - 308)), '200,200,210', false);
      y += 46;
    }
    // registro (as últimas concessões)
    const s = this.S(), log = (s && s.log) || [];
    ctx.textAlign = 'left'; ctx.font = `bold 10px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.75)'; ctx.fillText('REGISTRO', dx, y + 2);
    ctx.font = `10px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.6)';
    const cabe = Math.max(0, Math.floor((y0 + H - 34 - (y + 12)) / 14));
    log.slice(0, cabe).forEach((q, k) => {
      const d = new Date(q.t), hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      ctx.fillText(`${hora}  ${q.txt}`, dx, y + 18 + k * 14, dw);
    });
    if (U.msgT > 0) { ctx.textAlign = 'center'; ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(255,170,130,0.95)'; ctx.fillText(U.msg, VIEW_W / 2, y0 + H - 14); }
    else { ctx.textAlign = 'center'; ctx.font = `10px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.5)'; ctx.fillText('▲ ▼ escolhe a bênção · ◄ ► a duração · E confirma · ESC fecha', VIEW_W / 2, y0 + H - 14); }
    ctx.restore();
  },
  // ------------------------------------------------------------------ administrador (console)
  admin: {
    ligar() { Guardiao._adm = true; try { localStorage.setItem(GM_ADMIN_KEY, '1'); } catch (e) { /* só nesta sessão */ } return 'modo administrador ligado: fale com o Guardião do Mundo';
    },
    desligar() { Guardiao._adm = false; try { localStorage.removeItem(GM_ADMIN_KEY); } catch (e) { /* nada */ } return 'modo administrador desligado'; },
    conceder(id, minutos = 15, nivel = 0) { return Guardiao.conceder(id, nivel, minutos, 'Administrador') || 'concedida'; },
    remover(id) { Guardiao.remover(id, 'Administrador'); return 'removida'; },
    limpar() { for (const id of GM_ORDEM) Guardiao.remover(id, 'Administrador'); return 'todas removidas'; },
    evento(mult = 2, minutos = 60, nome) { return Guardiao.abrirEvento(mult, minutos, nome) || 'evento aberto'; },
    encerrar() { Guardiao.fecharEvento(false); return 'evento encerrado'; },
    registro() { const s = Guardiao.S(); return s ? s.log.map((q) => `${new Date(q.t).toLocaleString()}  ${q.txt}`) : []; },
    ativos() { return Guardiao.lista().map((id) => `${GM_BUFFS[id].nome}: ${Guardiao.tempo(Guardiao.resta(id))}`); },
  },
};
if (typeof window !== 'undefined') window.Guardiao = Guardiao;
