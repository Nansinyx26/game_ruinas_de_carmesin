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
// REQUISITO: equipar pede o nível do herói (nível da relíquia − 4). APRIMORAMENTO (ferreiro,
// js/mundo/oficios.js): +1 a +5, +10% nos atributos por nível.
// A tela (tecla B, Y abre direto o diário, ou pausa) tem as abas MOCHILA, OFÍCIOS (materiais,
// consumíveis, ofícios e reputação), DIÁRIO (js/mundo/aventuras.js), CAMPANHAS
// (js/mundo/campanhas.js) e, aberta por um morador, LOJA (mercador ou curandeiro, com o
// desconto da reputação), FERREIRO ou ARTESÃO. Tudo fica em World.state (salvamento do mundo).
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
  nome(it) { return `${it.unico || `${this.base(it).name} ${WORLD_SUFIXO[it.reg] || ''}`.trim()}${it.ap ? ` +${it.ap}` : ''}`; },   // única: prêmios
  valor(it) { return Math.round((12 + it.lv * 3) * this.rar(it).preco * (1 + (it.ap || 0) * 0.25)); },
  req(it) { return Math.max(1, it.lv - 4); },   // nível do herói para equipar
  mult(it) { return 1 + (it.ap || 0) * 0.1; },   // aprimoramento do ferreiro
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
    for (const it of this.equipados()) if (it) for (const k in it.st) WORLD_ATRIB[k].apply(S, it.st[k] * this.mult(it));
    Oficios.apply(S);   // consumíveis ativos (tônico, pele de pedra)
  },
  refazer() { if (game.player) game.player.recalc(false); },
  equipar(id) {
    const S = this.S, it = this.item(id);
    if (!it || S.equip.includes(id)) return false;
    if (game.activeProgress().level < this.req(it)) { this.aviso(`Requer nível ${this.req(it)}`); return false; }
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
  // Vende (com a loja do mercador aberta) ou desmonta (longe dele)
  vende() { return !!this.ui.shop && this.ui.loja !== 'curandeiro'; },
  vender(id) {
    const it = this.item(id);
    if (!it) return 0;
    const v = this.vende() ? this.venda(it) : this.sucata(it);
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
  precoCapsula() { return Oficios.precoCom(20 + worldRegion(World.zone.region).order * 10, World.zone.region); },
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
  // Itens além das relíquias: consumíveis, materiais e a insígnia da facção (mercador) ou só
  // remédios (curandeiro). Preços com o desconto da reputação da região
  extras() {
    const reg = World.zone.region, out = [];
    if (this.ui.loja === 'curandeiro') { for (const k of ['elixir', 'tonico', 'pele']) out.push({ cons: k }); return out; }
    for (const k of ['elixir', 'tonico', 'pele', 'retorno']) out.push({ cons: k });
    for (const k of ['sucata', WORLD_MAT_REG[reg] === 'sucata' ? 'erva' : WORLD_MAT_REG[reg]]) out.push({ mat: k });
    if (Oficios.podeInsignia(reg)) out.push({ insignia: reg });
    return out;
  },
  precoExtra(x) {
    const reg = World.zone.region;
    if (x.cons) return Oficios.precoCom(WORLD_CONSUMIVEIS[x.cons].preco + worldRegion(reg).order * 5, reg);
    if (x.mat) return Oficios.precoCom(WORLD_MATERIAIS[x.mat].preco, reg);
    return Oficios.precoInsignia(reg);
  },
  nomeExtra(x) { return x.cons ? WORLD_CONSUMIVEIS[x.cons].nome : x.mat ? WORLD_MATERIAIS[x.mat].nome : Oficios.insignia(x.insignia).unico; },
  comprar(k) {
    const g = game, list = this.ui.loja === 'curandeiro' ? [] : this.estoque();
    if (k > list.length) {   // consumível, material ou insígnia
      const x = this.extras()[k - list.length - 1];
      if (!x) return false;
      if (x.insignia) { const e = Oficios.comprarInsignia(x.insignia); if (e) return this.aviso(e); g.audio.play('memory'); return this.aviso(`Comprou ${this.nomeExtra(x)}`, true); }
      if (x.cons && Oficios.cons(x.cons) >= 9) return this.aviso('Você já carrega 9 destes');
      const v = this.precoExtra(x);
      if (g.stats.soulsBank < v) return this.aviso(`Faltam ${v - g.stats.soulsBank} células`);
      g.stats.soulsBank -= v;
      if (x.cons) Oficios.darCons(x.cons, 1); else Oficios.dar(x.mat, 1, false);
      g.audio.play('uiSelect');
      return this.aviso(`Comprou ${this.nomeExtra(x)}`, true);
    }
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
    const v = Oficios.precoCom(this.valor(it), World.zone.region);
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
  // loja: 'mercador' ou 'curandeiro'; servico: 'ferreiro' ou 'artesao' (abertos por um morador)
  abrir(tab = 'mochila', shop = false, loja = null, servico = null) {
    const U = this.ui;
    if (tab === 'missoes') tab = 'diario';
    U.tab = tab; U.shop = shop; U.loja = shop ? loja || 'mercador' : null; U.servico = servico; U.sel = 0; U.t = 0; U.msgT = 0; U.confirma = null;
    if (tab === 'diario' && !U.cat) U.cat = 'ativas';
    game.state = 'worldinv';
    game.audio.play('uiMove');
  },
  fechar() { game.state = 'playing'; World.save(); game.audio.play('uiMove'); },
  abas() {
    const a = ['mochila', 'oficios', 'diario', 'campanhas'];
    if (this.ui.shop) a.splice(1, 0, 'loja');
    if (this.ui.servico) a.splice(1, 0, this.ui.servico);
    return a;
  },
  // Itens navegáveis da aba: mochila = 3 vagas + mochila; loja = estoque + cápsula; missões: nada;
  // campanhas: os 5 heróis (js/mundo/campanhas.js)
  lista() {
    const U = this.ui;
    if (U.tab === 'mochila') return [0, 1, 2].map((k) => ({ slot: k })).concat(this.S.itens.map((it) => ({ it })));
    if (U.tab === 'loja') {
      const rel = U.loja === 'curandeiro' ? [] : this.estoque().map((it, k) => ({ loja: k, it })), n = rel.length;
      return rel.concat([{ loja: n, cap: true }], this.extras().map((x, j) => Object.assign({ loja: n + 1 + j }, x)));
    }
    if (U.tab === 'campanhas') return HERO_CAMPAIGN_ORDER.map((h) => ({ camp: h }));
    if (U.tab === 'oficios') return Oficios.lista();
    if (U.tab === 'ferreiro') return Oficios.listaFerreiro();
    if (U.tab === 'artesao') return Oficios.listaArtesao();
    if (U.tab === 'diario') return Aventuras.diarioLista(U.cat || 'ativas');
    return [];
  },
  cols() { return this.lay().cols; },
  // Ação principal do item selecionado (Enter, clique duplo ou botão)
  agir(q, alt = false) {
    if (!q) return;
    const tab = this.ui.tab;
    if (tab === 'oficios') { Oficios.agir(q, this.vende()); return; }
    if (tab === 'ferreiro' || tab === 'artesao') { Oficios.agirServico(q); return; }
    if (tab === 'diario') { Aventuras.agirDiario(q, alt); return; }
    if (q.camp) { Campanhas.comecar(q.camp); return; }
    if (q.slot !== undefined) { if (this.desequipar(q.slot)) game.audio.play('uiSelect'); return; }
    if (q.loja !== undefined) { this.comprar(q.loja); return; }
    if (alt) { const n = this.nome(q.it), v = this.vender(q.it.id); this.aviso(`${this.vende() ? 'Vendeu' : 'Desmontou'} ${n} · +${v} células`, true); return; }
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
    if (U.tab === 'diario' && (inp.pressed.left || inp.pressed.right)) {
      const C = Aventuras.CATS, i = C.indexOf(U.cat || 'ativas');
      U.cat = C[(i + (inp.pressed.right ? 1 : C.length - 1)) % C.length]; U.sel = 0; U.confirma = null;
      game.audio.play('uiMove');
    }
    if (L.length && U.tab === 'loja' && this.lojaCols(L) > 1 && (inp.pressed.left || inp.pressed.right)) {
      const per = Math.ceil(L.length / 2);
      U.sel = clamp(U.sel + (inp.pressed.right ? per : -per), 0, L.length - 1); game.audio.play('uiMove');
    }
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
      } else if (U.tab === 'diario' || U.tab === 'loja') {
        if (inp.pressed.up) mv(-1);
        if (inp.pressed.down) mv(1);
      } else {
        if (inp.pressed.up || inp.pressed.left) mv(-1);
        if (inp.pressed.down || inp.pressed.right) mv(1);
      }
      U.sel = clamp(U.sel, 0, L.length - 1);
      if (inp.pressed.confirm) this.agir(L[U.sel]);
      if (inp.pressed.erase && mochila && L[U.sel] && L[U.sel].it) this.agir(L[U.sel], true);
      if (inp.pressed.erase && U.tab === 'diario') this.agir(L[U.sel], true);   // abandonar (confirmando)
    }
    // mouse / toque: abas, células e botões de ação
    const m = inp.mouse;
    if (m.clicked) {
      for (const r of U.rects) {
        if (m.x < r.x || m.x > r.x + r.w || m.y < r.y || m.y > r.y + r.h) continue;
        if (r.tab) { U.tab = r.tab; U.sel = 0; game.audio.play('uiMove'); }
        else if (r.cat) { U.cat = r.cat; U.sel = 0; U.confirma = null; game.audio.play('uiMove'); }
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
      const label = { mochila: 'MOCHILA', loja: U.loja === 'curandeiro' ? 'REMÉDIOS' : 'LOJA', oficios: 'OFÍCIOS', diario: 'DIÁRIO', campanhas: 'CAMPANHAS', ferreiro: 'FERREIRO', artesao: 'ARTESÃO' }[a];
      const w = ctx.measureText(label).width + 30, on = a === U.tab;
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
    if (U.tab === 'diario') Aventuras.drawDiario(ctx, Ly, L, U.sel, t);
    else if (U.tab === 'oficios') Oficios.draw(ctx, Ly, L, U.sel, this.vende());
    else if (U.tab === 'ferreiro' || U.tab === 'artesao') Oficios.drawServico(ctx, Ly, L, U.sel, U.tab);
    else if (U.tab === 'campanhas') Campanhas.drawTab(ctx, Ly, U.sel, t);
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
    const dica = U.tab === 'mochila' ? `Enter: equipar / tirar · Delete: ${this.vende() ? 'vender (40%)' : 'desmontar (20%)'} · 5: cápsula · Q/E: abas · Esc: fechar`
      : U.tab === 'loja' ? 'Enter: comprar · Q/E: abas · Esc: fechar'
        : U.tab === 'campanhas' ? 'Enter: jogar a campanha (troca para o herói dela) · ★ no mapa e no radar · Q/E: abas · Esc: fechar'
          : U.tab === 'diario' ? '←/→: categoria · Enter: rastrear · Delete: abandonar · ◆ no mapa e na zona · Q/E: abas · Esc: fechar'
            : U.tab === 'oficios' ? `Enter: usar consumível${this.vende() ? ' / vender material' : ''} · Q/E: abas · Esc: fechar`
              : U.tab === 'ferreiro' ? 'Enter: aprimorar · materiais na aba OFÍCIOS · Q/E: abas · Esc: fechar'
                : U.tab === 'artesao' ? 'Enter: criar · a Criação sobe a cada item · Q/E: abas · Esc: fechar'
                  : 'Q/E: abas · Esc: fechar';
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
      const req = this.req(it), falta = game.activeProgress().level < req;
      ctx.fillText(`Relíquia ${R.name.toLowerCase()} (acessório) · nível ${it.lv} · ${worldRegion(it.reg).name}${it.ap ? ` · aprimorada +${it.ap}` : ''}`, x + 18, y + 46);
      ctx.fillStyle = falta ? '#ff8a9a' : 'rgba(160,200,170,0.85)'; ctx.textAlign = 'right';
      ctx.fillText(`Requer nível ${req}`, x + w - 18, y + 24); ctx.textAlign = 'left';
      ctx.font = `bold 14px ${FONT_UI}`;
      Object.keys(it.st).forEach((k, i) => { ctx.fillStyle = i ? 'rgba(200,214,235,0.9)' : '#ffffff'; ctx.fillText(this.fmt(k, it.st[k] * this.mult(it)), x + 18 + i * 170, y + 74); });
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
        ctx.fillText(Object.keys(it.st).map((q) => this.fmt(q, it.st[q] * this.mult(it))).join(' · '), Ly.lx + 76, y + 44);
      } else { ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.6)'; ctx.fillText('vaga livre', Ly.lx + 76, y + 32); }
    }
    // total dos bônus
    const tot = {};
    for (const it of eq) if (it) for (const k in it.st) tot[k] = (tot[k] || 0) + it.st[k] * this.mult(it);
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
      this.drawDetalhe(ctx, Ly, it, [['main', on ? 'TIRAR' : 'EQUIPAR'], ['alt', this.vende() ? `VENDER +${this.venda(it)}` : `DESMONTAR +${this.sucata(it)}`]], `Vale ${this.valor(it)} células`);
    } else this.drawDetalhe(ctx, Ly, null, [], '');
  },
  // Loja em uma ou duas colunas (muitos itens: relíquias, cápsula, consumíveis, materiais)
  lojaCols(L) { return L.length > 6 && VIEW_W >= 900 ? 2 : 1; },
  drawLoja(ctx, Ly, L, t) {
    const U = this.ui, z = World.zone, reg = z.region, d = Oficios.desconto(reg), cur = U.loja === 'curandeiro';
    ctx.textAlign = 'left'; ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(150,205,255,0.9)';
    ctx.fillText(`${cur ? 'CURANDEIRO · REMÉDIOS' : `MERCADOR · ${worldRegion(reg).name.toUpperCase()} · ESTOQUE DO DIA ${World.state.dia || 1}`}${d ? ` · REPUTAÇÃO −${Math.round(d * 100)}%` : ''}`, Ly.lx, Ly.top - 12);
    ctx.letterSpacing = '0px';
    const cols = this.lojaCols(L), per = Math.ceil(L.length / cols), cw = (VIEW_W - 72 - (cols - 1) * 16) / cols;
    const rh = Math.max(24, Math.min(62, (Ly.det - Ly.top - 24) / Math.max(1, per) - 8));
    L.forEach((q, i) => {
      const c = Math.floor(i / per), r = i % per, x = Ly.lx + c * (cw + 16), y = Ly.top + r * (rh + 8), sel = U.sel === i;
      ctx.fillStyle = sel ? 'rgba(40,70,130,0.6)' : 'rgba(12,20,36,0.85)'; ctx.fillRect(x, y, cw, rh);
      ctx.strokeStyle = sel ? '#ffffff' : 'rgba(90,120,170,0.4)'; ctx.lineWidth = sel ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, rh - 1);
      U.rects.push({ idx: i, x, y, w: cw, h: rh });
      ctx.textAlign = 'left';
      const fs = rh < 34 ? 13 : 15;
      if (q.cap || q.cons || q.mat || q.insignia) {
        const preco = q.cap ? this.precoCapsula() : this.precoExtra(q), D = q.cons ? WORLD_CONSUMIVEIS[q.cons] : q.mat ? WORLD_MATERIAIS[q.mat] : null;
        const nome = q.cap ? `✚ Cápsula de reparo (cura 40%) · você tem ${this.S.capsulas}/${this.CAPS}` : q.insignia ? `★ ${this.nomeExtra(q)} · insígnia da facção (única)`
          : q.cons ? `${D.nome} · ${D.desc} · você tem ${Oficios.cons(q.cons)}` : `${D.icon} ${D.nome} · você tem ${Oficios.mat(q.mat)}`;
        ctx.font = `bold ${fs}px ${FONT_UI}`; ctx.fillStyle = q.cap ? '#c8ffe0' : q.insignia ? '#ffb860' : D ? rgba(D.rgb, 1) : '#ffffff';
        ctx.fillText(nome, x + 14, y + rh / 2);
        ctx.textAlign = 'right'; ctx.fillStyle = game.stats.soulsBank >= preco ? '#9fd0ff' : '#ff8a9a'; ctx.fillText(`${preco}`, x + cw - 14, y + rh / 2);
        return;
      }
      const it = q.it, R = this.rar(it);
      this.drawCell(ctx, it, x + 6, y + 4, rh - 8, false, false);
      ctx.textAlign = 'left';
      ctx.font = `bold ${fs}px ${FONT_UI}`; ctx.fillStyle = rgba(R.rgb, 1); ctx.fillText(`${this.nome(it)} · ${R.name}`, x + rh + 10, y + rh * (rh < 34 ? 0.5 : 0.34));
      if (rh >= 34) { ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)'; ctx.fillText(Object.keys(it.st).map((k) => this.fmt(k, it.st[k])).join(' · '), x + rh + 10, y + rh * 0.7); }
      const v = Oficios.precoCom(this.valor(it), reg);
      ctx.textAlign = 'right'; ctx.font = `bold ${fs}px ${FONT_UI}`; ctx.fillStyle = game.stats.soulsBank >= v ? '#9fd0ff' : '#ff8a9a';
      ctx.fillText(`${v}`, x + cw - 14, y + rh / 2);
    });
    if (!cur && !L.some((q) => q.it)) { ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.7)'; ctx.textAlign = 'left'; ctx.fillText('Relíquias esgotadas hoje. Volte amanhã (no relógio do mundo).', Ly.lx, Ly.det - 12); }
    const q = L[U.sel];
    if (q && q.it) this.drawDetalhe(ctx, Ly, q.it, [['main', 'COMPRAR']], `Preço ${Oficios.precoCom(this.valor(q.it), reg)} células · você tem ${game.stats.soulsBank}`);
    else if (q && q.cap) this.drawDetalhe(ctx, Ly, null, [['main', 'COMPRAR']], `Preço ${this.precoCapsula()} células · você tem ${game.stats.soulsBank}`, 'CÁPSULA DE REPARO · CURA 40% DA VIDA');
    else if (q) this.drawDetalhe(ctx, Ly, null, [['main', 'COMPRAR']], `Preço ${this.precoExtra(q)} células · você tem ${game.stats.soulsBank}${q.mat ? ' · materiais para o artesão e o ferreiro' : ''}`, this.nomeExtra(q).toUpperCase());
    else this.drawDetalhe(ctx, Ly, null, [], '');
  },
};
