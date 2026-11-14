'use strict';
// ECLIPSE ZERO · Mundo aberto: relíquias com raridade, mochila, mercador (WorldInv)
// ---------------------------------------------------------------------------
// RELÍQUIAS: peças de equipamento que só valem no modo mundo. Cada uma tem uma base (o atributo
// principal), uma raridade (Comum → Mítica, seis graus: multiplica os valores e acrescenta atributos
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
  { id: 'mitico', name: 'Mítica', rgb: '255,70,90', k: 5.2, w: 0.06, preco: 40 },   // a mais rara: chefes, líderes e a Sorte alta
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
    for (let n = r >= 5 ? 3 : r >= 4 ? 2 : r >= 2 ? 1 : 0; n > 0; n--) {
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
      if (it.r >= 5) WorldInv.efeitoMitico(x, y, `RELÍQUIA ${R.name.toUpperCase()}`, this.nome(it));
      else if (it.r >= 3) { g.hud.message(this.nome(it).toUpperCase(), `RELÍQUIA ${R.name.toUpperCase()}`, 2.4, false, true); g.audio.play('memory'); }
    }
    return it;
  },
  // Item mítico no chão: coluna de luz vermelha, anéis, brasas, tela piscando de leve e o letreiro
  efeitoMitico(x, y, sub, nome) {
    const g = game, P_ = g.particles, rgb = '255,70,90';
    if (x !== undefined) {
      P_.ring(x, y, 120, rgb, 0.9, 10); P_.ring(x, y, 60, '255,210,220', 0.6, 6);
      P_.flash(x, y, 60, 220, rgb, 0.4);
      P_.embers(x, y, 0, 60, rgb, 60, 420);
    }
    g.flashScreen(rgb, 0.22);
    g.camera.shake(0.25);
    g.hud.message(nome.toUpperCase(), sub, 3, false, true);
    g.audio.play('mitico');
  },
  // Saque: chefe sempre (épica ou melhor), elite 30%, os outros 5%
  onKill(e) {
    const z = World.zone;
    if (!z) return;
    Arsenal.onKill(e);   // peças da armadura modular (js/mundo/arsenal.js)
    const sorte = Atributos.sorteSaque();   // atributo Sorte: relíquias mais raras e mais frequentes
    if (e.worldBoss) this.ganhar(this.gerar(z.lv + 2, z.region, 3, 0.5 + sorte), e.x, e.y);
    else if (e.lider) this.ganhar(this.gerar(z.lv + 1, z.region, 2, 0.4 + sorte), e.x, e.y);   // líder do bando: sempre uma rara ou melhor
    else if (Math.random() < Atributos.chanceSaque(e.elite ? 0.3 : 0.05)) this.ganhar(this.gerar(z.lv, z.region, 0, (e.elite ? 0.4 : 0) + sorte), e.x, e.y);
  },
  onChest(d, x, y) {
    const z = World.zone;
    Arsenal.onChest(d); Fabrica.onChest(d);   // peças, materiais e planos (js/mundo/fabrica.js)
    this.ganhar(this.gerar(z.lv, z.region, d.boss ? 3 : d.secret ? 2 : 0, (d.boss || d.secret ? 0.4 : 0.15) + Atributos.sorteSaque()), x, y);
  },

  // ------------------------------------------------------- efeito no herói
  // Chamado por Player.recalc no modo mundo
  apply(S) {
    for (const it of this.equipados()) if (it) for (const k in it.st) WORLD_ATRIB[k].apply(S, it.st[k] * this.mult(it));
    Oficios.apply(S);   // consumíveis ativos (tônico, pele de pedra)
    Arsenal.apply(S);   // peças vestidas e a arma aprimorada (js/mundo/arsenal.js)
    Clima.apply(S);     // frio e calor no corpo, roupa encharcada (js/mundo/clima.js)
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
    if (this.ui.loja === 'armeiro') return Arsenal.lojaArmeiro();   // peças e planos (Armaria da cidade, js/mundo/arsenal.js)
    for (const k of ['elixir', 'tonico', 'pele', 'retorno']) out.push({ cons: k });
    // na cidade, o mercado tem o material das oficinas
    const mats = World.zone && World.zone.cidade ? ['ferro', 'tecido', 'couro', 'engrenagem'] : ['sucata', WORLD_MAT_REG[reg] === 'sucata' ? 'erva' : WORLD_MAT_REG[reg]];
    for (const k of mats) out.push({ mat: k });
    if (Oficios.podeInsignia(reg)) out.push({ insignia: reg });
    return out;
  },
  precoExtra(x) {
    const reg = World.zone.region;
    if (x.cons) return Oficios.precoCom(WORLD_CONSUMIVEIS[x.cons].preco + worldRegion(reg).order * 5, reg);
    if (x.mat) return Oficios.precoCom(WORLD_MATERIAIS[x.mat].preco, reg);
    if (x.peca !== undefined) return Oficios.precoCom(Arsenal.valor(Arsenal.S.loja.itens[x.peca]), reg);
    if (x.plano) return Arsenal.precoPlano(x.plano);
    return Oficios.precoInsignia(reg);
  },
  nomeExtra(x) {
    if (x.peca !== undefined) return Arsenal.nome(Arsenal.S.loja.itens[x.peca]);
    if (x.plano) return `Plano ${ARS_FAMILIAS[x.plano].nome}`;
    return x.cons ? WORLD_CONSUMIVEIS[x.cons].nome : x.mat ? WORLD_MATERIAIS[x.mat].nome : Oficios.insignia(x.insignia).unico;
  },
  // Lojas sem relíquias nem cápsulas: curandeiro (remédios) e armeiro (peças e planos)
  semReliquias() { return this.ui.loja === 'curandeiro' || this.ui.loja === 'armeiro'; },
  comprar(k) {
    const g = game, list = this.semReliquias() ? [] : this.estoque();
    if (k > list.length) {   // consumível, material, insígnia, peça ou plano
      const x = this.extras()[k - list.length - 1];
      if (!x) return false;
      if (x.peca !== undefined || x.plano) {
        const v = this.precoExtra(x), nome = this.nomeExtra(x);
        if (g.stats.soulsBank < v) return this.aviso(`Faltam ${v - g.stats.soulsBank} células`);
        g.stats.soulsBank -= v;
        if (x.plano) Fabrica.aprender(x.plano, 'Armaria'); else Arsenal.comprarPeca(x.peca);
        g.audio.play('compra');
        return this.aviso(`Comprou ${nome}`, true);
      }
      if (x.insignia) { const e = Oficios.comprarInsignia(x.insignia); if (e) return this.aviso(e); g.audio.play('memory'); return this.aviso(`Comprou ${this.nomeExtra(x)}`, true); }
      if (x.cons && Oficios.cons(x.cons) >= 9) return this.aviso('Você já carrega 9 destes');
      const v = this.precoExtra(x);
      if (g.stats.soulsBank < v) return this.aviso(`Faltam ${v - g.stats.soulsBank} células`);
      g.stats.soulsBank -= v;
      if (x.cons) Oficios.darCons(x.cons, 1); else Oficios.dar(x.mat, 1, false);
      g.audio.play('compra');
      return this.aviso(`Comprou ${this.nomeExtra(x)}`, true);
    }
    if (k === list.length) {   // cápsula
      const c = this.precoCapsula();
      if (this.S.capsulas >= this.CAPS) return this.aviso('Mochila já tem 5 cápsulas');
      if (g.stats.soulsBank < c) return this.aviso(`Faltam ${c - g.stats.soulsBank} células`);
      g.stats.soulsBank -= c; this.S.capsulas++;
      g.audio.play('compra');
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
    g.audio.play('compra');
    return this.aviso(`Comprou ${this.nome(it)}`, true);
  },
  aviso(txt, ok = false) {
    this.ui.msg = txt; this.ui.msgT = 2.4;
    if (!ok) game.audio.play('uiDeny');
    return ok;
  },

  // ---------------------------------------------------------------- botões do HUD
  // BOLSA [B] e MAPA [M] ao lado do botão AURORA (acima do painel da arma): mouse e toque. A bolsa
  // mostra um selo com os pontos de atributo ainda livres
  botoesHud: [],
  desenharBotoesHud(ctx, L) {
    this.botoesHud = [];
    if (!game.world || !L.wp) return;
    const r = 20, xA = L.wp.x + L.wp.w - r - 4, y = L.wp.y - r - 10, pad = game.input.lastDevice === 'pad';
    const livres = typeof Atributos !== 'undefined' ? Atributos.livres(game.activeProgress()) : 0;
    const B = [{ id: 'bolsa', cx: xA - 2 * (2 * r + 16), rot: 'BOLSA', tecla: '[B]', selo: livres }, { id: 'mapa', cx: xA - (2 * r + 16), rot: 'MAPA', tecla: '[M]' }];
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const b of B) {
      const x = b.cx, m = game.input.mouse, hov = Math.hypot(m.x - x, m.y - y) <= r + 4;
      b.cy = y; b.r = r;
      ctx.fillStyle = hov ? 'rgba(30,44,70,0.95)' : 'rgba(14,18,32,0.88)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(150,205,255,0.85)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#cfe6ff'; ctx.fillStyle = '#cfe6ff'; ctx.lineWidth = 1.6;
      if (b.id === 'bolsa') {
        // mochila: corpo arredondado, alça e bolso
        ctx.beginPath(); ctx.moveTo(x - 8, y - 3); ctx.lineTo(x - 8, y + 8); ctx.lineTo(x + 8, y + 8); ctx.lineTo(x + 8, y - 3); ctx.quadraticCurveTo(x + 8, y - 8, x, y - 8); ctx.quadraticCurveTo(x - 8, y - 8, x - 8, y - 3); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y - 8, 3.5, Math.PI, 0); ctx.stroke();
        ctx.strokeRect(x - 4.5, y + 1, 9, 5);
      } else {
        // mapa dobrado em três com um marcador
        ctx.beginPath(); ctx.moveTo(x - 10, y - 6); ctx.lineTo(x - 3.5, y - 8); ctx.lineTo(x + 3.5, y - 6); ctx.lineTo(x + 10, y - 8); ctx.lineTo(x + 10, y + 6); ctx.lineTo(x + 3.5, y + 8); ctx.lineTo(x - 3.5, y + 6); ctx.lineTo(x - 10, y + 8); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 3.5, y - 8); ctx.lineTo(x - 3.5, y + 6); ctx.moveTo(x + 3.5, y - 6); ctx.lineTo(x + 3.5, y + 8); ctx.stroke();
        ctx.fillStyle = '#ff9a7a'; ctx.beginPath(); ctx.arc(x + 6.5, y - 1, 2, 0, TAU); ctx.fill();
      }
      ctx.font = `bold 8px ${FONT_TITLE}`; ctx.letterSpacing = '1px'; ctx.fillStyle = 'rgba(200,225,255,0.95)';
      ctx.fillText(b.rot, x, y + r + 9);
      if (!pad && !(typeof TouchControls !== 'undefined' && TouchControls.on)) { ctx.fillStyle = 'rgba(200,214,235,0.7)'; ctx.fillText(b.tecla, x, y - r - 8); }
      ctx.letterSpacing = '0px';
      if (b.selo) {   // pontos de atributo livres
        ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.arc(x + r * 0.72, y - r * 0.72, 8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1a1206'; ctx.font = `bold 9px ${FONT_UI}`; ctx.fillText(b.selo > 99 ? '99+' : `${b.selo}`, x + r * 0.72, y - r * 0.72 + 0.5);
      }
      this.botoesHud.push(b);
    }
    ctx.restore();
  },
  // Clique num dos botões do HUD (o toque manda a tecla, js/touch.js); true se abriu algo
  cliqueHud(m) {
    if (!m.clicked) return false;
    for (const b of this.botoesHud) {
      if (Math.hypot(m.x - b.cx, m.y - b.cy) > b.r + 4) continue;
      if (b.id === 'bolsa') this.abrir(typeof Atributos !== 'undefined' && Atributos.livres(game.activeProgress()) ? 'atributos' : 'mochila', false);
      else game.world.openMap(false);
      return true;
    }
    return false;
  },

  // ---------------------------------------------------------------- tela
  // loja: 'mercador' ou 'curandeiro'; servico: 'ferreiro' ou 'artesao' (abertos por um morador)
  abrir(tab = 'mochila', shop = false, loja = null, servico = null) {
    const U = this.ui;
    if (tab === 'missoes') tab = 'diario';
    U.tab = tab; U.shop = shop; U.loja = shop ? loja || 'mercador' : null; U.servico = servico; U.sel = 0; U.t = 0; U.msgT = 0; U.confirma = null;
    Fabrica.ui.cat = 0; Fabrica.ui.digitando = false;
    if (typeof Atributos !== 'undefined') Atributos.abrir();
    if (tab === 'diario' && !U.cat) U.cat = 'ativas';
    game.state = 'worldinv';
    game.audio.play('uiMove');
  },
  fechar() { game.state = 'playing'; World.save(); game.audio.play('uiMove'); },
  abas() {
    const a = ['mochila', 'equipamento', 'atributos', 'itens', 'oficios', 'animais', 'diario', 'campanhas'], sv = this.ui.servico;   // (animais: PETS & MONTARIAS, js/mundo/loja_animais.js)
    if (this.ui.shop) a.splice(1, 0, 'loja');
    if (sv) a.splice(1, 0, sv === 'armazem' ? 'armazem' : FAB_ESTACOES[sv] ? 'fabrica' : sv);
    return a;
  },
  // Abas dos módulos novos: EQUIPAMENTO (js/mundo/arsenal.js), INVENTÁRIO, estações e ARMAZÉM (js/mundo/fabrica.js)
  abaModulo(tab) { return tab === 'equipamento' || tab === 'atributos' || tab === 'itens' || tab === 'fabrica' || tab === 'armazem' || tab === 'animais'; },
  // Itens navegáveis da aba: mochila = 3 vagas + mochila; loja = estoque + cápsula; missões: nada;
  // campanhas: os 5 heróis (js/mundo/campanhas.js)
  lista() {
    const U = this.ui;
    if (U.tab === 'mochila') return [0, 1, 2].map((k) => ({ slot: k })).concat(this.S.itens.map((it) => ({ it })));
    if (U.tab === 'loja') {
      if (U.loja === 'armeiro') return this.extras().map((x, j) => Object.assign({ loja: j + 1 }, x));
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
      U.tab = abas[(i + (inp.pressed.tabNext ? 1 : n - 1)) % n]; U.sel = 0; Fabrica.ui.cat = 0;
      game.audio.play('uiMove');
    }
    if (this.abaModulo(U.tab)) {
      if (U.tab === 'equipamento') Arsenal.updateUI(dt, inp); else if (U.tab === 'atributos') Atributos.updateUI(dt, inp); else if (U.tab === 'animais') LojaAnimais.updateUI(dt, inp); else Fabrica.updateUI(U.tab, dt, inp);
      const m = inp.mouse;
      if (m.clicked) for (const r of U.rects) {
        if (m.x < r.x || m.x > r.x + r.w || m.y < r.y || m.y > r.y + r.h) continue;
        if (r.tab) { U.tab = r.tab; U.sel = 0; Fabrica.ui.cat = 0; game.audio.play('uiMove'); }
        else if (r.btn === 'fechar') this.fechar();
        else if (U.tab === 'equipamento') Arsenal.clique(r); else if (U.tab === 'atributos') Atributos.clique(r); else if (U.tab === 'animais') LojaAnimais.clique(r); else Fabrica.clique(U.tab, r);
        break;
      }
      return;
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
    const abas = this.abas(), rotulo = (a) => ({ mochila: 'RELÍQUIAS', loja: U.loja === 'curandeiro' ? 'REMÉDIOS' : U.loja === 'armeiro' ? 'ARMARIA' : 'LOJA', oficios: 'OFÍCIOS', animais: 'PETS & MONTARIAS', diario: 'DIÁRIO', campanhas: 'CAMPANHAS', ferreiro: 'FERREIRO', artesao: 'ARTESÃO',
        equipamento: 'EQUIPAMENTO', atributos: Atributos.livres(game.activeProgress()) ? `ATRIBUTOS · ${Atributos.livres(game.activeProgress())}` : 'ATRIBUTOS', itens: 'INVENTÁRIO', armazem: 'ARMAZÉM', fabrica: FAB_ESTACOES[U.servico] ? FAB_ESTACOES[U.servico].nome.split(' ')[0].toUpperCase() : 'OFICINA' }[a]);
    // as abas cabem antes do contador de células: letra, espaçamento e margem diminuem quando precisa
    let fs = 15, ls = 3, pad = 30;
    const larg = () => { ctx.font = `bold ${fs}px ${FONT_TITLE}`; ctx.letterSpacing = `${ls}px`; return abas.reduce((s, a) => s + ctx.measureText(rotulo(a)).width + pad + 10, 0); };
    const cabe = VIEW_W - 36 - 270;
    while (larg() > cabe && fs > 10) { fs--; if (ls > 1) ls -= 0.5; if (pad > 18) pad -= 3; }
    for (const a of abas) {
      const label = rotulo(a);
      const w = ctx.measureText(label).width + pad, on = a === U.tab;
      ctx.fillStyle = on ? 'rgba(90,150,255,0.25)' : 'rgba(20,30,50,0.6)'; ctx.fillRect(x, 28, w, 36);
      ctx.strokeStyle = on ? 'rgba(150,205,255,0.9)' : 'rgba(90,120,170,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, 28.5, w - 1, 35);
      ctx.fillStyle = on ? '#ffffff' : 'rgba(200,214,235,0.7)'; ctx.textAlign = 'left'; ctx.fillText(label, x + pad / 2, 47);
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
    if (U.tab === 'equipamento') Arsenal.draw(ctx, Ly, t);
    else if (U.tab === 'atributos') Atributos.draw(ctx, Ly, t);
    else if (U.tab === 'animais') LojaAnimais.draw(ctx, Ly, t);
    else if (this.abaModulo(U.tab)) Fabrica.draw(U.tab, ctx, Ly, t);
    else if (U.tab === 'diario') Aventuras.drawDiario(ctx, Ly, L, U.sel, t);
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
    const dica = U.tab === 'equipamento' ? Arsenal.dica() : U.tab === 'atributos' ? Atributos.dica() : U.tab === 'animais' ? LojaAnimais.dica() : this.abaModulo(U.tab) ? Fabrica.dica(U.tab) : U.tab === 'mochila' ? `Enter: equipar / tirar · Delete: ${this.vende() ? 'vender (40%)' : 'desmontar (20%)'} · 5: cápsula · Q/E: abas · Esc: fechar`
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
  // Loja: a lista à esquerda e o PAINEL DE DETALHES FIXO à direita (nome, raridade, atributos com a
  // comparação, requisito, preço, saldo depois da compra e o botão COMPRAR)
  lojaLay() {
    const pw = clamp(VIEW_W * 0.32, 290, 430), lw = VIEW_W - 72 - pw - 20;
    return { lw, pw, px: 36 + lw + 20 };
  },
  lojaCols(L) { return L.length > 6 && this.lojaLay().lw >= 760 ? 2 : 1; },
  // Texto que cabe na largura (reticências no fim)
  caber(ctx, s, larg) {
    if (ctx.measureText(s).width <= larg) return s;
    while (s.length > 2 && ctx.measureText(s + '…').width > larg) s = s.slice(0, -1);
    return s + '…';
  },
  drawLoja(ctx, Ly, L, t) {
    const U = this.ui, z = World.zone, reg = z.region, d = Oficios.desconto(reg), cur = U.loja === 'curandeiro', arm = U.loja === 'armeiro', LL = this.lojaLay();
    ctx.textAlign = 'left'; ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(150,205,255,0.9)';
    ctx.fillText(this.caber(ctx, `${cur ? 'CURANDEIRO · REMÉDIOS' : arm ? `ARMEIRO · PEÇAS E PLANOS · ESTOQUE DO DIA ${World.state.dia || 1}` : `MERCADOR · ${worldRegion(reg).name.toUpperCase()} · ESTOQUE DO DIA ${World.state.dia || 1}`}${d ? ` · REPUTAÇÃO −${Math.round(d * 100)}%` : ''}`, LL.lw), Ly.lx, Ly.top - 12);
    ctx.letterSpacing = '0px';
    const fim = VIEW_H - 46, cols = this.lojaCols(L), per = Math.ceil(L.length / cols), cw = (LL.lw - (cols - 1) * 16) / cols;
    const rh = Math.max(24, Math.min(62, (fim - Ly.top) / Math.max(1, per) - 8));
    L.forEach((q, i) => {
      const c = Math.floor(i / per), r = i % per, x = Ly.lx + c * (cw + 16), y = Ly.top + r * (rh + 8), sel = U.sel === i;
      const m = game.input.mouse, hov = m.x >= x && m.x <= x + cw && m.y >= y && m.y <= y + rh;
      ctx.fillStyle = sel ? 'rgba(40,70,130,0.6)' : hov ? 'rgba(24,36,62,0.9)' : 'rgba(12,20,36,0.85)'; ctx.fillRect(x, y, cw, rh);
      ctx.strokeStyle = sel ? '#ffffff' : 'rgba(90,120,170,0.4)'; ctx.lineWidth = sel ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, rh - 1);
      U.rects.push({ idx: i, x, y, w: cw, h: rh });
      ctx.textAlign = 'left';
      const fs = rh < 34 ? 13 : 15, info = this.infoLoja(q), larg = cw - (info.cell ? rh + 10 : 14) - 80;
      if (info.cell) this.drawCell(ctx, info.cell, x + 6, y + 4, rh - 8, false, false);
      else { ctx.fillStyle = rgba(info.rgb, 1); ctx.fillRect(x, y, 3, rh); }
      const tx = x + (info.cell ? rh + 10 : 14);
      ctx.textAlign = 'left'; ctx.font = `bold ${fs}px ${FONT_UI}`; ctx.fillStyle = rgba(info.rgb, 1);   // (o ícone deixa o texto centrado)
      ctx.fillText(this.caber(ctx, info.linha, larg), tx, y + rh * (rh >= 34 && info.sub ? 0.34 : 0.5));
      if (rh >= 34 && info.sub) { ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)'; ctx.fillText(this.caber(ctx, info.sub, larg), tx, y + rh * 0.7); }
      ctx.textAlign = 'right'; ctx.font = `bold ${fs}px ${FONT_UI}`; ctx.fillStyle = game.stats.soulsBank >= info.preco ? '#9fd0ff' : '#ff8a9a';
      ctx.fillText(`◆ ${info.preco}`, x + cw - 14, y + rh / 2);
    });
    if (arm && !L.length) { ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.7)'; ctx.textAlign = 'left'; ctx.fillText('Estoque vendido hoje. Volte amanhã (no relógio do mundo).', Ly.lx, Ly.top + 20); }
    if (!cur && !arm && !L.some((q) => q.it)) { ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.7)'; ctx.textAlign = 'left'; ctx.fillText('Relíquias esgotadas hoje. Volte amanhã (no relógio do mundo).', Ly.lx, fim - 4); }
    this.drawPainelLoja(ctx, LL.px, Ly.top - 30, LL.pw, fim - (Ly.top - 30), L[U.sel]);
  },
  // Dados de uma linha da loja (nome, sub, cor, preço e as linhas do painel)
  infoLoja(q) {
    const reg = World.zone.region;
    if (q.peca !== undefined) {
      const it = Arsenal.S.loja.itens[q.peca], R = Arsenal.rar(it);
      return { tipo: 'peca', it, rgb: R.rgb, preco: this.precoExtra(q), raridade: R, linha: `${this.nomeExtra(q)} · ${R.name}`, sub: `${ARS_VAGAS[it.slot].nome} · ${Arsenal.resumo(it)}`, titulo: this.nomeExtra(q), req: Arsenal.req(it) };
    }
    if (q.plano) return { tipo: 'plano', rgb: '255,208,138', preco: this.precoExtra(q), linha: `📜 ${this.nomeExtra(q)}`, sub: `As ${ARS_ORDEM.length} peças da família na forja`, titulo: `Plano ${ARS_FAMILIAS[q.plano].nome}`, desc: `Com o plano, a Mestra Brasa forja as ${ARS_ORDEM.length} peças da família ${ARS_FAMILIAS[q.plano].nome} (precisa dos materiais).` };
    if (q.cap) return { tipo: 'cap', rgb: '200,255,224', preco: this.precoCapsula(), linha: '✚ Cápsula de reparo', sub: `Cura 40% da vida (tecla 5) · você tem ${this.S.capsulas}/${this.CAPS}`, titulo: 'Cápsula de reparo', desc: `Cura 40% da vida na hora (tecla 5 ou pela mochila). Você leva até ${this.CAPS}; tem ${this.S.capsulas}.` };
    if (q.insignia) return { tipo: 'extra', rgb: '255,184,96', preco: this.precoExtra(q), linha: `★ ${this.nomeExtra(q)}`, sub: 'Insígnia da facção (única)', titulo: this.nomeExtra(q), desc: 'Insígnia da facção: única, mostra que você está com eles.' };
    if (q.cons || q.mat) {
      const D = q.cons ? WORLD_CONSUMIVEIS[q.cons] : WORLD_MATERIAIS[q.mat], tem = q.cons ? Oficios.cons(q.cons) : Oficios.mat(q.mat);
      return { tipo: 'extra', rgb: D.rgb, preco: this.precoExtra(q), linha: `${q.mat ? `${D.icon} ` : ''}${D.nome}`, sub: `${q.cons ? D.desc : 'Material'} · você tem ${tem}`, titulo: D.nome, desc: `${D.desc || ''}${q.mat ? ' Material para o artesão e o ferreiro.' : ''} Você tem ${tem}.` };
    }
    const it = q.it, R = this.rar(it);
    return { tipo: 'reliquia', it, cell: it, rgb: R.rgb, preco: Oficios.precoCom(this.valor(it), reg), raridade: R, linha: `${this.nome(it)} · ${R.name}`, sub: Object.keys(it.st).map((k) => this.fmt(k, it.st[k])).join(' · '), titulo: this.nome(it), req: this.req(it) };
  },
  drawPainelLoja(ctx, x, y, w, h, q) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,14,28,0.94)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(90,150,255,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    if (!q) { ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.75)'; ctx.fillText('Escolha um item da lista.', x + 18, y + 30); ctx.restore(); return; }
    const I = this.infoLoja(q), cel = game.stats.soulsBank, pode = cel >= I.preco, lv = game.activeProgress().level;
    // faixa da cor da raridade e o nome
    ctx.fillStyle = rgba(I.rgb, 0.18); ctx.fillRect(x + 1, y + 1, w - 2, 64);
    ctx.fillStyle = rgba(I.rgb, 1); ctx.fillRect(x + 1, y + 1, 4, 64);
    ctx.font = `bold 17px ${FONT_TITLE}`; ctx.fillStyle = rgba(I.rgb, 1);
    ctx.fillText(this.caber(ctx, I.titulo.toUpperCase(), w - 36), x + 18, y + 24);
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(220,230,245,0.85)';
    const tipo = I.tipo === 'peca' ? `PEÇA · ${ARS_VAGAS[I.it.slot].nome.toUpperCase()}` : I.tipo === 'reliquia' ? 'RELÍQUIA · ACESSÓRIO' : I.tipo === 'plano' ? 'PLANO DE FORJA' : 'ITEM';
    ctx.fillText(this.caber(ctx, `${I.raridade ? `${I.raridade.name.toUpperCase()} · ` : ''}${tipo}`, w - 36), x + 18, y + 48); ctx.letterSpacing = '0px';
    let yy = y + 86;
    // atributos (com ▲▼ contra a peça vestida) ou a descrição
    if (I.tipo === 'peca') {
      const vest = Arsenal.vestidos()[I.it.slot];
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(170,195,230,0.8)';
      ctx.fillText(vest ? `Comparada à vestida (${this.caber(ctx, Arsenal.nome(vest), w - 190)}):` : 'Vaga vazia: tudo é ganho', x + 18, yy); yy += 22;
      for (const c of Arsenal.comparar(I.it)) {
        if (yy > y + h - 150) break;
        const base = c.res ? `${c.v < 0 ? '−' : '+'}${Math.round(Math.abs(c.v) * 100)}% res. ${ARS_RES[c.res]}` : Arsenal.fmtSt(c.k, c.v);
        ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText(base, x + 18, yy);
        if (Math.abs(c.d) > 1e-4) {
          const up = c.d > 0, dv = c.res || WORLD_ATRIB[c.k].pct ? `${(Math.abs(c.d) * 100).toFixed(1).replace('.', ',')}%` : `${Math.round(Math.abs(c.d))}`;
          ctx.textAlign = 'right'; ctx.fillStyle = up ? '#8dffb0' : '#ff8a9a'; ctx.fillText(`${up ? '▲' : '▼'} ${dv}`, x + w - 18, yy);
        }
        yy += 21;
      }
    } else if (I.tipo === 'reliquia') {
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(170,195,230,0.8)';
      const livres = this.S.equip.filter((e) => !e).length;
      ctx.fillText(`Nível ${I.it.lv} · ${worldRegion(I.it.reg).name} · ${livres ? `${livres} vaga(s) de relíquia livre(s)` : 'as 3 vagas ocupadas'}`, x + 18, yy); yy += 22;
      Object.keys(I.it.st).forEach((k, i) => { ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = i ? 'rgba(220,230,245,0.9)' : '#ffffff'; ctx.fillText(this.fmt(k, I.it.st[k] * this.mult(I.it)), x + 18, yy); yy += 21; });
    } else {
      ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(215,225,240,0.9)';
      for (const ln of wrapText(ctx, I.desc || '', w - 36).slice(0, 7)) { ctx.fillText(ln, x + 18, yy); yy += 18; }
    }
    if (I.req) {
      const falta = lv < I.req;
      ctx.font = `bold 12px ${FONT_UI}`; ctx.textAlign = 'left'; ctx.fillStyle = falta ? '#ff8a9a' : 'rgba(160,220,180,0.9)';
      ctx.fillText(falta ? `Requer nível ${I.req} (você: ${lv})` : `Requer nível ${I.req} · ok`, x + 18, Math.min(yy + 8, y + h - 128));
    }
    // preço, saldo e COMPRAR, sempre no pé do painel
    const by = y + h - 104;
    ctx.strokeStyle = 'rgba(90,150,255,0.25)'; ctx.beginPath(); ctx.moveTo(x + 14, by - 8); ctx.lineTo(x + w - 14, by - 8); ctx.stroke();
    ctx.textAlign = 'left'; ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.8)';
    ctx.fillText('Preço', x + 18, by + 10); ctx.fillText('Você tem', x + 18, by + 30); ctx.fillText('Depois da compra', x + 18, by + 50);
    ctx.textAlign = 'right'; ctx.font = `bold 14px ${FONT_UI}`;
    ctx.fillStyle = pode ? '#9fd0ff' : '#ff8a9a'; ctx.fillText(`◆ ${I.preco}`, x + w - 18, by + 10);
    ctx.fillStyle = '#ffffff'; ctx.fillText(`◆ ${cel}`, x + w - 18, by + 30);
    ctx.fillStyle = pode ? 'rgba(160,220,180,0.95)' : '#ff8a9a'; ctx.fillText(pode ? `◆ ${cel - I.preco}` : `faltam ${I.preco - cel}`, x + w - 18, by + 50);
    const bh = 34, bw = w - 36, bx = x + 18, bt = by + 64;
    ctx.fillStyle = pode ? 'rgba(30,90,60,0.9)' : 'rgba(50,40,52,0.85)'; ctx.fillRect(bx, bt, bw, bh);
    ctx.strokeStyle = pode ? 'rgba(140,255,180,0.9)' : 'rgba(200,120,140,0.6)'; ctx.strokeRect(bx + 0.5, bt + 0.5, bw - 1, bh - 1);
    ctx.textAlign = 'center'; ctx.font = `bold 14px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = pode ? '#ffffff' : 'rgba(220,200,210,0.7)';
    ctx.fillText(pode ? 'COMPRAR' : 'CÉLULAS INSUFICIENTES', bx + bw / 2, bt + bh / 2 + 1); ctx.letterSpacing = '0px';
    this.ui.rects.push({ btn: 'main', x: bx, y: bt, w: bw, h: bh });
    ctx.restore();
  },
};
