'use strict';
// ECLIPSE ZERO · Mundo aberto: relíquias com raridade, mochila, mercador (WorldInv)
// ---------------------------------------------------------------------------
// RELÍQUIAS: peças de equipamento que só valem no modo mundo. Cada uma tem uma base (o atributo
// principal), uma raridade (Comum → Lendária: multiplica os valores e acrescenta atributos
// secundários), o nível da zona onde caiu e a região no nome. Até 3 ficam EQUIPADAS e somam
// os atributos no Player.recalc (dano, vida, energia, crítico, velocidade, defesa, recarga).
// SAQUE: baús sempre dão uma (o secreto, rara ou melhor; o do chefe, épica ou melhor), o
// chefe regional sempre deixa uma e os outros inimigos às vezes (elite com mais chance).
// MERCADOR (NPC merchant da zona de chegada): vende 4 relíquias da região, renovadas a cada
// dia do mundo (js/mundo/tempo.js), e cápsulas de reparo; compra as suas relíquias por 40%
// do valor. Longe dele, uma relíquia pode ser desmontada por 20%.
// CÁPSULAS DE REPARO: até 5 na mochila, tecla 5 (ou pela mochila) cura 40% da vida.
// A tela (tecla B ou pausa → INVENTÁRIO) tem as abas MOCHILA, LOJA (perto do mercador) e
// MISSÕES (js/mundo/missoes.js). Tudo fica em World.state.inv (salvamento do mundo).
// ---------------------------------------------------------------------------
const WORLD_RARIDADES = [
  { id: 'comum', name: 'Comum', rgb: '200,206,220', k: 1, w: 62, preco: 1 },
  { id: 'incomum', name: 'Incomum', rgb: '90,220,120', k: 1.5, w: 25, preco: 2 },
  { id: 'raro', name: 'Rara', rgb: '80,160,255', k: 2.2, w: 9.5, preco: 4.5 },
  { id: 'epico', name: 'Épica', rgb: '190,110,255', k: 3, w: 3, preco: 9 },
  { id: 'lendario', name: 'Lendária', rgb: '255,170,50', k: 4, w: 0.5, preco: 20 },
];
// Atributos: valor base (multiplicado pela raridade e pelo nível) e como entra nos stats do herói
const WORLD_ATRIB = {
  dano: { name: 'Dano', base: 0.03, pct: true, apply: (S, v) => { S.dmgMult += v; } },
  vida: { name: 'Vida', base: 8, apply: (S, v) => { S.hpBonus += v; } },
  energia: { name: 'Energia', base: 6, apply: (S, v) => { S.energyBonus += v; } },
  critico: { name: 'Crítico', base: 0.015, pct: true, apply: (S, v) => { S.crit += v; } },
  veloc: { name: 'Velocidade', base: 0.015, pct: true, apply: (S, v) => { S.speedMult += v; } },
  defesa: { name: 'Defesa', base: 0.012, pct: true, apply: (S, v) => { S.armor += v; } },
  recarga: { name: 'Recarga', base: 0.012, pct: true, apply: (S, v) => { S.cdr = Math.max(0.3, S.cdr - v); } },
};
const WORLD_RELIQUIAS = [
  { id: 'nucleo', name: 'Núcleo de Fúria', main: 'dano', icon: '◆' },
  { id: 'placa', name: 'Placa Reforçada', main: 'vida', icon: '⬢' },
  { id: 'bateria', name: 'Bateria Fantasma', main: 'energia', icon: '▮' },
  { id: 'lente', name: 'Lente de Precisão', main: 'critico', icon: '◎' },
  { id: 'servo', name: 'Servo Ágil', main: 'veloc', icon: '➤' },
  { id: 'escudo', name: 'Escudo de Fase', main: 'defesa', icon: '⛨' },
  { id: 'chip', name: 'Chip de Sobrecarga', main: 'recarga', icon: '⌬' },
];
const WORLD_SUFIXO = { carmesin: 'Carmesim', velmora: 'de Velmora', lagoa: 'do Abismo', nexus: 'de Nexus', seraph: 'de Seraph', asterion: 'de Asterion', obsidiano: 'de Obsidiana' };

const WorldInv = {
  MAX: 24, SLOTS: 3, CAPS: 5,
  ui: { tab: 'mochila', sel: 0, shop: false, t: 0, msg: '', msgT: 0, rects: [] },

  get S() {
    const W = World.state;
    if (!W.inv) W.inv = { itens: [], equip: [null, null, null], capsulas: 1, seq: 1 };
    return W.inv;
  },
  base(it) { return WORLD_RELIQUIAS.find((b) => b.id === it.b) || WORLD_RELIQUIAS[0]; },
  rar(it) { return WORLD_RARIDADES[it.r] || WORLD_RARIDADES[0]; },
  nome(it) { return `${this.base(it).name} ${WORLD_SUFIXO[it.reg] || ''}`.trim(); },
  valor(it) { return Math.round((12 + it.lv * 3) * this.rar(it).preco); },
  venda(it) { return Math.max(1, Math.round(this.valor(it) * 0.4)); },
  sucata(it) { return Math.max(1, Math.round(this.valor(it) * 0.2)); },
  item(id) { return this.S.itens.find((q) => q.id === id) || null; },
  equipados() { return this.S.equip.map((id) => (id ? this.item(id) : null)); },
  fmt(k, v) { const A = WORLD_ATRIB[k]; return A.pct ? `+${(v * 100).toFixed(v < 0.1 ? 1 : 0)}% ${A.name}` : `+${Math.round(v)} ${A.name}`; },

  // ---------------------------------------------------------------- geração
  // Raridade sorteada por peso; 'sorte' empurra para as raras; 'min' é a raridade mínima
  rolarRaridade(min = 0, sorte = 0, rnd = Math.random) {
    let tot = 0;
    const w = WORLD_RARIDADES.map((r, i) => (i < min ? 0 : r.w * Math.pow(1 + sorte, i)));
    for (const x of w) tot += x;
    let r = rnd() * tot;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
    return Math.max(min, 0);
  },
  gerar(lv, reg, min = 0, sorte = 0, rnd = Math.random) {
    const B = WORLD_RELIQUIAS[Math.floor(rnd() * WORLD_RELIQUIAS.length)], r = this.rolarRaridade(min, sorte, rnd), R = WORLD_RARIDADES[r];
    const esc = (k, f) => WORLD_ATRIB[k].base * R.k * (1 + lv * 0.03) * f * (0.9 + rnd() * 0.2);
    const st = { [B.main]: esc(B.main, 1) };
    const outros = Object.keys(WORLD_ATRIB).filter((k) => k !== B.main);
    for (let n = r >= 4 ? 2 : r >= 2 ? 1 : 0; n > 0; n--) {
      const k = outros.splice(Math.floor(rnd() * outros.length), 1)[0];
      st[k] = esc(k, 0.5);
    }
    return { id: 0, b: B.id, r, lv, reg, st };
  },
  // Guarda na mochila (cheia: vende na hora); avisa com a cor da raridade
  ganhar(it, x, y) {
    const S = this.S, R = this.rar(it), g = game;
    if (S.itens.length >= this.MAX) {
      const v = this.venda(it);
      g.stats.soulsBank += v;
      g.hud.toast(`Mochila cheia · ${this.nome(it)} vendida por ${v} células`, '200,206,220');
      return null;
    }
    it.id = S.seq++;
    S.itens.push(it);
    g.hud.toast(`RELÍQUIA ${R.name.toUpperCase()} · ${this.nome(it)} (B: mochila)`, R.rgb);
    if (x !== undefined) {
      g.particles.ring(x, y, 46, R.rgb, 0.5, 5);
      if (it.r >= 3) { g.hud.message(this.nome(it).toUpperCase(), `RELÍQUIA ${R.name.toUpperCase()}`, 2.4, false, true); g.audio.play('memory'); }
    }
    return it;
  },
  // Saque: chefe sempre (épica ou melhor), elite 30%, os outros 5%
  onKill(e) {
    const z = World.zone;
    if (!z) return;
    if (e.worldBoss) this.ganhar(this.gerar(z.lv + 2, z.region, 3, 0.5), e.x, e.y);
    else if (Math.random() < (e.elite ? 0.3 : 0.05)) this.ganhar(this.gerar(z.lv, z.region, 0, e.elite ? 0.4 : 0), e.x, e.y);
  },
  onChest(d, x, y) {
    const z = World.zone;
    this.ganhar(this.gerar(z.lv, z.region, d.boss ? 3 : d.secret ? 2 : 0, d.boss || d.secret ? 0.4 : 0.15), x, y);
  },

  // ------------------------------------------------------- efeito no herói
  // Chamado por Player.recalc no modo mundo
  apply(S) {
    for (const it of this.equipados()) if (it) for (const k in it.st) WORLD_ATRIB[k].apply(S, it.st[k]);
  },
  refazer() { if (game.player) game.player.recalc(false); },
  equipar(id) {
    const S = this.S, it = this.item(id);
    if (!it || S.equip.includes(id)) return false;
    // vaga livre; senão, a da mesma base; senão, a de menor valor
    let k = S.equip.indexOf(null);
    if (k < 0) k = S.equip.findIndex((q) => this.item(q).b === it.b);
    if (k < 0) { let low = 1e9; S.equip.forEach((q, i) => { const v = this.valor(this.item(q)); if (v < low) { low = v; k = i; } }); }
    S.equip[k] = id;
    this.refazer();
    return true;
  },
  desequipar(k) { if (this.S.equip[k]) { this.S.equip[k] = null; this.refazer(); return true; } return false; },
  remover(id) {
    const S = this.S, k = S.equip.indexOf(id);
    if (k >= 0) { S.equip[k] = null; this.refazer(); }
    S.itens = S.itens.filter((q) => q.id !== id);
  },
  // Vende (perto do mercador) ou desmonta (longe dele)
  vender(id) {
    const it = this.item(id);
    if (!it) return 0;
    const v = this.ui.shop ? this.venda(it) : this.sucata(it);
    this.remover(id);
    game.stats.soulsBank += v;
    game.audio.play('soul');
    return v;
  },
  usarCapsula() {
    const S = this.S, p = game.player;
    if (!p || p.state === 'dead') return false;
    if (S.capsulas <= 0) { game.hud.toast('Sem cápsulas de reparo (o mercador vende)', '255,92,122'); game.audio.play('uiDeny'); return false; }
    if (p.hp >= p.maxHp) { game.hud.toast('Vida cheia', '200,214,235'); return false; }
    S.capsulas--;
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.4));
    game.particles.ring(p.x, p.y, 40, '90,255,160', 0.5, 4);
    game.audio.play('health');
    game.hud.toast(`Cápsula de reparo · +40% de vida (${S.capsulas} restantes)`, '90,255,160');
    return true;
  },

  // ---------------------------------------------------------------- mercador
  precoCapsula() { return 20 + worldRegion(World.zone.region).order * 10; },
  // Estoque da região: 4 relíquias por dia do mundo (sorteio fixo por região e dia)
  estoque() {
    const W = World.state, reg = World.zone.region, dia = W.dia || 1;
    if (!W.loja) W.loja = {};
    let L = W.loja[reg];
    if (!L || L.dia !== dia) {
      let h = dia * 9973;
      for (const ch of reg) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const rnd = mulberry32(h), z = worldZonesOf(reg).find((q) => q.hub) || World.zone;
      L = W.loja[reg] = { dia, itens: [0, 1, 2, 3].map((i) => this.gerar(z.lv + 1 + i, reg, i === 3 ? 2 : 0, 0.3, rnd)) };
    }
    return L.itens;
  },
  comprar(k) {
    const g = game, list = this.estoque();
    if (k === list.length) {   // cápsula
      const c = this.precoCapsula();
      if (this.S.capsulas >= this.CAPS) return this.aviso('Mochila já tem 5 cápsulas');
      if (g.stats.soulsBank < c) return this.aviso(`Faltam ${c - g.stats.soulsBank} células`);
      g.stats.soulsBank -= c; this.S.capsulas++;
      g.audio.play('uiSelect');
      return this.aviso(`Cápsula comprada · ${this.S.capsulas}/${this.CAPS}`, true);
    }
    const it = list[k];
    if (!it) return false;
    const v = this.valor(it);
    if (g.stats.soulsBank < v) return this.aviso(`Faltam ${v - g.stats.soulsBank} células`);
    if (this.S.itens.length >= this.MAX) return this.aviso('Mochila cheia');
    g.stats.soulsBank -= v;
    list.splice(k, 1);
    this.ganhar(Object.assign({}, it));
    g.audio.play('memory');
    return this.aviso(`Comprou ${this.nome(it)}`, true);
  },
  aviso(txt, ok = false) {
    this.ui.msg = txt; this.ui.msgT = 2.4;
    if (!ok) game.audio.play('uiDeny');
    return ok;
  },

  // ---------------------------------------------------------------- tela
  abrir(tab = 'mochila', shop = false) {
    const U = this.ui;
    U.tab = tab; U.shop = shop; U.sel = 0; U.t = 0; U.msgT = 0;
    game.state = 'worldinv';
    game.audio.play('uiMove');
  },
  fechar() { game.state = 'playing'; World.save(); game.audio.play('uiMove'); },
  abas() { return this.ui.shop ? ['mochila', 'loja', 'missoes'] : ['mochila', 'missoes']; },
  // Itens navegáveis da aba: mochila = 3 vagas + mochila; loja = estoque + cápsula; missões: nada
  lista() {
    const U = this.ui;
    if (U.tab === 'mochila') return [0, 1, 2].map((k) => ({ slot: k })).concat(this.S.itens.map((it) => ({ it })));
    if (U.tab === 'loja') return this.estoque().map((it, k) => ({ loja: k, it })).concat([{ loja: this.estoque().length, cap: true }]);
    return [];
  },
  cols() { return this.lay().cols; },
  // Ação principal do item selecionado (Enter, clique duplo ou botão)
  agir(q, alt = false) {
    if (!q) return;
    if (q.slot !== undefined) { if (this.desequipar(q.slot)) game.audio.play('uiSelect'); return; }
    if (q.loja !== undefined) { this.comprar(q.loja); return; }
    if (alt) { const n = this.nome(q.it), v = this.vender(q.it.id); this.aviso(`${this.ui.shop ? 'Vendeu' : 'Desmontou'} ${n} · +${v} células`, true); return; }
    if (this.S.equip.includes(q.it.id)) { this.desequipar(this.S.equip.indexOf(q.it.id)); game.audio.play('uiSelect'); }
    else if (this.equipar(q.it.id)) game.audio.play('uiSelect');
  },
  updateUI(dt, inp) {
    const U = this.ui;
    U.t += dt; if (U.msgT > 0) U.msgT -= dt;
    if (inp.pressed.back || inp.pressed.pause || inp.pressed.bag) { this.fechar(); return; }
    if (inp.pressed.capsule) this.usarCapsula();
    const abas = this.abas();
    if (inp.pressed.tabPrev || inp.pressed.tabNext) {
      const i = abas.indexOf(U.tab), n = abas.length;
      U.tab = abas[(i + (inp.pressed.tabNext ? 1 : n - 1)) % n]; U.sel = 0;
      game.audio.play('uiMove');
    }
    const L = this.lista(), cols = this.cols(), mochila = U.tab === 'mochila';
    if (L.length) {
      const mv = (d) => { U.sel = clamp(U.sel + d, 0, L.length - 1); game.audio.play('uiMove'); };
      if (mochila && U.sel < 3) {
        if (inp.pressed.up) mv(-1);
        if (inp.pressed.down) mv(1);
        if (inp.pressed.right && L.length > 3) { U.sel = 3; game.audio.play('uiMove'); }
      } else if (mochila) {
        const k = U.sel - 3;
        if (inp.pressed.left) { if (k % cols === 0) { U.sel = Math.min(2, Math.floor(k / cols)); game.audio.play('uiMove'); } else mv(-1); }
        if (inp.pressed.right) mv(1);
        if (inp.pressed.up) { if (k < cols) { U.sel = 0; game.audio.play('uiMove'); } else mv(-cols); }
        if (inp.pressed.down) mv(cols);
      } else {
        if (inp.pressed.up || inp.pressed.left) mv(-1);
        if (inp.pressed.down || inp.pressed.right) mv(1);
      }
      U.sel = clamp(U.sel, 0, L.length - 1);
      if (inp.pressed.confirm) this.agir(L[U.sel]);
      if (inp.pressed.erase && mochila && L[U.sel] && L[U.sel].it) this.agir(L[U.sel], true);
    }
    // mouse / toque: abas, células e botões de ação
    const m = inp.mouse;
    if (m.clicked) {
      for (const r of U.rects) {
        if (m.x < r.x || m.x > r.x + r.w || m.y < r.y || m.y > r.y + r.h) continue;
        if (r.tab) { U.tab = r.tab; U.sel = 0; game.audio.play('uiMove'); }
        else if (r.btn === 'fechar') this.fechar();
        else if (r.btn === 'capsula') this.usarCapsula();
        else if (r.btn) this.agir(L[U.sel], r.btn === 'alt');
        else if (r.idx !== undefined) { if (U.sel === r.idx) this.agir(L[r.idx]); else { U.sel = r.idx; game.audio.play('uiMove'); } }
        break;
      }
    }
    if (U.sel >= this.lista().length) U.sel = Math.max(0, this.lista().length - 1);
  },
  lay() {
    const W = VIEW_W, H = VIEW_H, lx = 36, lw = clamp(W * 0.28, 260, 360), gx = lx + lw + 28, gw = W - gx - 36;
    const cs = 64, gap = 8, cols = Math.max(3, Math.min(8, Math.floor((gw + gap) / (cs + gap))));
    return { W, H, lx, lw, gx, gw, cs, gap, cols, top: 96, det: H - 178 };
  },
  draw(ctx, t) {
    const U = this.ui, Ly = this.lay(), S = this.S, g = game, L = this.lista();
    U.rects = [];
    ctx.save();
    ctx.fillStyle = 'rgba(2,5,12,0.94)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textBaseline = 'middle';
    // abas
    let x = 36;
    ctx.font = `bold 15px ${FONT_TITLE}`; ctx.letterSpacing = '3px';
    for (const a of this.abas()) {
      const label = { mochila: 'MOCHILA', loja: 'LOJA DO MERCADOR', missoes: 'MISSÕES' }[a], w = ctx.measureText(label).width + 30, on = a === U.tab;
      ctx.fillStyle = on ? 'rgba(90,150,255,0.25)' : 'rgba(20,30,50,0.6)'; ctx.fillRect(x, 28, w, 36);
      ctx.strokeStyle = on ? 'rgba(150,205,255,0.9)' : 'rgba(90,120,170,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, 28.5, w - 1, 35);
      ctx.fillStyle = on ? '#ffffff' : 'rgba(200,214,235,0.7)'; ctx.textAlign = 'left'; ctx.fillText(label, x + 15, 47);
      U.rects.push({ tab: a, x, y: 28, w, h: 36 });
      x += w + 10;
    }
    ctx.letterSpacing = '0px';
    // células e cápsulas (topo à direita) e o botão fechar
    ctx.textAlign = 'right'; ctx.font = `bold 15px ${FONT_UI}`;
    ctx.fillStyle = '#9fd0ff'; ctx.fillText(`◆ ${g.stats.soulsBank} células`, VIEW_W - 100, 47);
    ctx.fillStyle = 'rgba(20,30,50,0.8)'; ctx.fillRect(VIEW_W - 84, 28, 48, 36);
    ctx.strokeStyle = 'rgba(150,205,255,0.6)'; ctx.strokeRect(VIEW_W - 83.5, 28.5, 47, 35);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText('✕', VIEW_W - 60, 47);
    U.rects.push({ btn: 'fechar', x: VIEW_W - 84, y: 28, w: 48, h: 36 });
    if (U.tab === 'missoes') { if (typeof WorldQuests !== 'undefined') WorldQuests.drawTab(ctx, Ly, t); }
    else if (U.tab === 'loja') this.drawLoja(ctx, Ly, L, t);
    else this.drawMochila(ctx, Ly, L, t);
    // aviso da última ação
    if (U.msgT > 0) {
      ctx.globalAlpha = clamp(U.msgT, 0, 1);
      ctx.font = `bold 14px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe2a0';
      ctx.fillText(U.msg, VIEW_W / 2, Ly.det - 18);
      ctx.globalAlpha = 1;
    }
    // dicas
    ctx.font = `12px ${FONT_UI}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(200,214,235,0.75)';
    const dica = U.tab === 'mochila' ? `Enter: equipar / tirar · Delete: ${U.shop ? 'vender (40%)' : 'desmontar (20%)'} · 5: cápsula · Q/E: abas · Esc: fechar`
      : U.tab === 'loja' ? 'Enter: comprar · Q/E: abas · Esc: fechar' : 'Fale com quem dá as missões na zona de chegada de cada região · Q/E: abas · Esc: fechar';
    ctx.fillText(dica, 36, VIEW_H - 22);
    ctx.restore();
  },
  // Célula de relíquia (ícone, borda da raridade, nível)
  drawCell(ctx, it, x, y, s, sel, eq) {
    const R = it ? this.rar(it) : null;
    ctx.fillStyle = it ? `rgba(${R.rgb},0.1)` : 'rgba(14,20,34,0.8)'; ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = sel ? '#ffffff' : it ? rgba(R.rgb, 0.85) : 'rgba(90,120,170,0.35)'; ctx.lineWidth = sel ? 2.5 : 1.2;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    if (!it) return;
    ctx.textAlign = 'center'; ctx.font = `bold ${Math.round(s * 0.42)}px ${FONT_UI}`; ctx.fillStyle = rgba(R.rgb, 1);
    ctx.fillText(this.base(it).icon, x + s / 2, y + s * 0.46);
    ctx.font = `bold 10px ${FONT_UI}`; ctx.fillStyle = 'rgba(220,230,245,0.85)';
    ctx.fillText(`Nv ${it.lv}`, x + s / 2, y + s - 10);
    if (eq) { ctx.fillStyle = '#9fd0ff'; ctx.textAlign = 'right'; ctx.fillText('E', x + s - 5, y + 9); }
  },
  // Detalhes do item selecionado e botões de ação
  drawDetalhe(ctx, Ly, it, acoes, preco, titulo) {
    const y = Ly.det, x = 36, w = VIEW_W - 72;
    ctx.fillStyle = 'rgba(8,14,28,0.92)'; ctx.fillRect(x, y, w, 132);
    ctx.strokeStyle = 'rgba(90,150,255,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 131);
    ctx.textAlign = 'left';
    if (it) {
      const R = this.rar(it);
      ctx.font = `bold 18px ${FONT_TITLE}`; ctx.fillStyle = rgba(R.rgb, 1); ctx.fillText(this.nome(it).toUpperCase(), x + 18, y + 24);
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)';
      ctx.fillText(`Relíquia ${R.name.toLowerCase()} · nível ${it.lv} · ${worldRegion(it.reg).name}`, x + 18, y + 46);
      ctx.font = `bold 14px ${FONT_UI}`;
      Object.keys(it.st).forEach((k, i) => { ctx.fillStyle = i ? 'rgba(200,214,235,0.9)' : '#ffffff'; ctx.fillText(this.fmt(k, it.st[k]), x + 18 + i * 170, y + 74); });
    } else if (titulo) { ctx.font = `bold 18px ${FONT_TITLE}`; ctx.fillStyle = '#c8ffe0'; ctx.fillText(titulo, x + 18, y + 24); }
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = '#9fd0ff';
    ctx.fillText(preco, x + 18, y + 104);
    let bx = x + w - 18;
    for (const [id, label] of acoes.slice().reverse()) {
      ctx.font = `bold 13px ${FONT_TITLE}`;
      const bw = ctx.measureText(label).width + 34;
      bx -= bw;
      ctx.fillStyle = id === 'alt' ? 'rgba(80,30,40,0.85)' : 'rgba(30,70,140,0.85)'; ctx.fillRect(bx, y + 84, bw, 34);
      ctx.strokeStyle = id === 'alt' ? 'rgba(255,120,140,0.8)' : 'rgba(150,205,255,0.85)'; ctx.strokeRect(bx + 0.5, y + 84.5, bw - 1, 33);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(label, bx + bw / 2, y + 101);
      this.ui.rects.push({ btn: id, x: bx, y: y + 84, w: bw, h: 34 });
      bx -= 12;
    }
  },
  drawMochila(ctx, Ly, L, t) {
    const U = this.ui, S = this.S, eq = this.equipados();
    // coluna da esquerda: vagas equipadas, bônus somados, cápsulas
    ctx.textAlign = 'left'; ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(150,205,255,0.9)';
    ctx.fillText('EQUIPADAS', Ly.lx, Ly.top - 12);
    ctx.fillText(`MOCHILA ${S.itens.length}/${this.MAX}`, Ly.gx, Ly.top - 12);
    ctx.letterSpacing = '0px';
    for (let k = 0; k < 3; k++) {
      const y = Ly.top + k * 74, it = eq[k];
      this.drawCell(ctx, it, Ly.lx, y, 64, U.sel === k, false);
      U.rects.push({ idx: k, x: Ly.lx, y, w: Ly.lw, h: 64 });
      ctx.textAlign = 'left';
      if (it) {
        ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = rgba(this.rar(it).rgb, 1); ctx.fillText(this.nome(it), Ly.lx + 76, y + 22);
        ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)';
        ctx.fillText(Object.keys(it.st).map((q) => this.fmt(q, it.st[q])).join(' · '), Ly.lx + 76, y + 44);
      } else { ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.6)'; ctx.fillText('vaga livre', Ly.lx + 76, y + 32); }
    }
    // total dos bônus
    const tot = {};
    for (const it of eq) if (it) for (const k in it.st) tot[k] = (tot[k] || 0) + it.st[k];
    let y = Ly.top + 3 * 74 + 14;
    ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(150,205,255,0.9)'; ctx.fillText('BÔNUS (SÓ NO MUNDO)', Ly.lx, y); ctx.letterSpacing = '0px';
    ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = '#eef3fa';
    const ks = Object.keys(tot);
    ks.forEach((k, i) => ctx.fillText(this.fmt(k, tot[k]), Ly.lx + (i % 2) * 150, y + 22 + Math.floor(i / 2) * 20));
    if (!ks.length) { ctx.fillStyle = 'rgba(160,175,200,0.6)'; ctx.fillText('nenhuma relíquia equipada', Ly.lx, y + 22); }
    // cápsulas (clique para usar)
    y = Ly.det - 64;
    if (y > Ly.top + 3 * 74 + 60) {
      ctx.fillStyle = 'rgba(20,60,40,0.8)'; ctx.fillRect(Ly.lx, y, Ly.lw, 40);
      ctx.strokeStyle = 'rgba(90,255,160,0.6)'; ctx.strokeRect(Ly.lx + 0.5, y + 0.5, Ly.lw - 1, 39);
      ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = '#c8ffe0'; ctx.textAlign = 'left';
      ctx.fillText(`✚ Cápsulas de reparo: ${S.capsulas}/${this.CAPS}  [5] usar`, Ly.lx + 12, y + 20);
      U.rects.push({ btn: 'capsula', x: Ly.lx, y, w: Ly.lw, h: 40 });
    }
    // grade da mochila
    S.itens.forEach((it, i) => {
      const c = i % Ly.cols, r = Math.floor(i / Ly.cols), x = Ly.gx + c * (Ly.cs + Ly.gap), yy = Ly.top + r * (Ly.cs + Ly.gap);
      if (yy + Ly.cs > Ly.det - 30) return;
      this.drawCell(ctx, it, x, yy, Ly.cs, U.sel === i + 3, S.equip.includes(it.id));
      U.rects.push({ idx: i + 3, x, y: yy, w: Ly.cs, h: Ly.cs });
    });
    if (!S.itens.length) { ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.7)'; ctx.textAlign = 'left'; ctx.fillText('Abra baús e derrote inimigos para achar relíquias.', Ly.gx, Ly.top + 30); }
    // detalhes
    const q = L[U.sel], it = q && (q.it || (q.slot !== undefined ? eq[q.slot] : null));
    if (q && q.slot !== undefined) this.drawDetalhe(ctx, Ly, it, it ? [['main', 'TIRAR']] : [], it ? `Vale ${this.valor(it)} células` : '');
    else if (it) {
      const on = S.equip.includes(it.id);
      this.drawDetalhe(ctx, Ly, it, [['main', on ? 'TIRAR' : 'EQUIPAR'], ['alt', U.shop ? `VENDER +${this.venda(it)}` : `DESMONTAR +${this.sucata(it)}`]], `Vale ${this.valor(it)} células`);
    } else this.drawDetalhe(ctx, Ly, null, [], '');
  },
  drawLoja(ctx, Ly, L, t) {
    const U = this.ui, z = World.zone;
    ctx.textAlign = 'left'; ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(150,205,255,0.9)';
    ctx.fillText(`MERCADOR · ${worldRegion(z.region).name.toUpperCase()} · ESTOQUE DO DIA ${World.state.dia || 1}`, Ly.lx, Ly.top - 12);
    ctx.letterSpacing = '0px';
    const w = VIEW_W - 72, rh = Math.min(62, (Ly.det - Ly.top - 40) / Math.max(1, L.length) - 8);
    L.forEach((q, i) => {
      const y = Ly.top + i * (rh + 8), sel = U.sel === i;
      ctx.fillStyle = sel ? 'rgba(40,70,130,0.6)' : 'rgba(12,20,36,0.85)'; ctx.fillRect(Ly.lx, y, w, rh);
      ctx.strokeStyle = sel ? '#ffffff' : 'rgba(90,120,170,0.4)'; ctx.lineWidth = sel ? 2 : 1; ctx.strokeRect(Ly.lx + 0.5, y + 0.5, w - 1, rh - 1);
      U.rects.push({ idx: i, x: Ly.lx, y, w, h: rh });
      ctx.textAlign = 'left';
      if (q.cap) {
        ctx.font = `bold 15px ${FONT_UI}`; ctx.fillStyle = '#c8ffe0'; ctx.fillText(`✚ Cápsula de reparo (cura 40%) · você tem ${this.S.capsulas}/${this.CAPS}`, Ly.lx + 16, y + rh / 2);
        ctx.textAlign = 'right'; ctx.fillStyle = '#9fd0ff'; ctx.fillText(`${this.precoCapsula()} células`, Ly.lx + w - 16, y + rh / 2);
        return;
      }
      const it = q.it, R = this.rar(it);
      this.drawCell(ctx, it, Ly.lx + 6, y + 4, rh - 8, false, false);
      ctx.textAlign = 'left';
      ctx.font = `bold 15px ${FONT_UI}`; ctx.fillStyle = rgba(R.rgb, 1); ctx.fillText(`${this.nome(it)} · ${R.name}`, Ly.lx + rh + 10, y + rh * 0.34);
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)';
      ctx.fillText(Object.keys(it.st).map((k) => this.fmt(k, it.st[k])).join(' · '), Ly.lx + rh + 10, y + rh * 0.7);
      ctx.textAlign = 'right'; ctx.font = `bold 15px ${FONT_UI}`; ctx.fillStyle = game.stats.soulsBank >= this.valor(it) ? '#9fd0ff' : '#ff8a9a';
      ctx.fillText(`${this.valor(it)} células`, Ly.lx + w - 16, y + rh / 2);
    });
    if (L.length === 1) { ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.7)'; ctx.textAlign = 'left'; ctx.fillText('Relíquias esgotadas hoje. Volte amanhã (no relógio do mundo).', Ly.lx, Ly.top + rh + 30); }
    const q = L[U.sel];
    if (q && q.it) this.drawDetalhe(ctx, Ly, q.it, [['main', 'COMPRAR']], `Preço ${this.valor(q.it)} células · você tem ${game.stats.soulsBank}`);
    else this.drawDetalhe(ctx, Ly, null, q ? [['main', 'COMPRAR']] : [], q ? `Preço ${this.precoCapsula()} células · você tem ${game.stats.soulsBank}` : '', q ? 'CÁPSULA DE REPARO · CURA 40% DA VIDA' : '');
  },
};
