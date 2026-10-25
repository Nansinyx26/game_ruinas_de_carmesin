'use strict';
// ECLIPSE ZERO · Mundo aberto: armadura modular, peça por peça (Arsenal)
// ---------------------------------------------------------------------------
// Cada herói veste até 9 PEÇAS, trocadas uma a uma: capacete, peitoral, ombreira esquerda,
// ombreira direita, luvas, calças, botas, capa e um acessório. As peças são de FAMÍLIAS
// (Viajante, Couro Batido, Inverno, Deserto, Placas, Cristal, Obsidiana e Eclipse), que dão o
// visual (js/heroes/pecas3d.js: a peça presa ao esqueleto do herói, no tamanho de cada um), o
// TECIDO (tecido, linho leve, lã, couro, metal, cristal, liga Eclipse: resistência à água,
// absorção e secagem, isolamento, vento, neve, peso e reflexo do calor — o clima usa isso,
// js/mundo/clima.js) e as resistências (fogo, gelo, elétrico, veneno). Raridades: as das
// relíquias (Comum → Lendária) e a Eclipse, só das peças da família Eclipse.
// Atributos: defesa, vida, mobilidade (peças leves ajudam, placas pesam) e, das raras em
// diante, bônus secundários (dano, crítico, energia, recarga). O PESO total acima de 6 deixa
// o herói mais lento. Equipar pede o nível (nível da peça − 4). Tudo só vale no mundo aberto,
// como as relíquias. Combinar famílias é livre; a armadura especial inteira (Roster) cobre as
// peças no modelo (os atributos continuam). Ocultar capacete, capa ou acessório só esconde.
// Guardado em World.state.arsenal (o salvamento do mundo): mochila de peças, o que cada herói
// veste, o que está oculto, o nível das armas, a ferramenta de coleta, receitas e armazém
// (js/mundo/fabrica.js).
// A aba EQUIPAMENTO da mochila (WorldInv) mostra o herói em 3D com as peças, as vagas, as
// peças da vaga escolhida (a escolhida aparece no modelo antes de confirmar) e a comparação.
// ---------------------------------------------------------------------------
const ARS_RARIDADES = WORLD_RARIDADES.concat([{ id: 'eclipse', name: 'Eclipse', rgb: '150,130,255', k: 5.2, w: 0, preco: 26 }]);
const ARS_ECLIPSE = ARS_RARIDADES.length - 1;
// Vagas: peso relativo de defesa, vida e carga
const ARS_VAGAS = {
  capacete: { nome: 'Capacete', def: 0.012, vida: 5, peso: 1, area: 0.12 },
  peitoral: { nome: 'Peitoral', def: 0.03, vida: 14, peso: 3, area: 0.3 },
  ombroE: { nome: 'Ombreira esquerda', def: 0.008, vida: 3, peso: 0.7, area: 0.05 },
  ombroD: { nome: 'Ombreira direita', def: 0.008, vida: 3, peso: 0.7, area: 0.05 },
  luvas: { nome: 'Luvas', def: 0.01, vida: 4, peso: 0.6, area: 0.06 },
  calcas: { nome: 'Calças', def: 0.02, vida: 10, peso: 2, area: 0.22 },
  botas: { nome: 'Botas', def: 0.01, vida: 4, peso: 1, area: 0.08 },
  capa: { nome: 'Capa', def: 0.005, vida: 2, peso: 0.8, area: 0.12 },
  acessorio: { nome: 'Acessório', def: 0, vida: 0, peso: 0.3, area: 0 },
};
const ARS_ORDEM = Object.keys(ARS_VAGAS);
// Tecidos: como cada material reage ao ambiente (0 a 1). agua: resistência à água; absorve:
// quanto encharca; seca: velocidade de secagem; isola: isolamento térmico; vento: corta o
// vento; neve: protege da neve e do gelo; peso: carga relativa; reflete: devolve o calor do sol
const ARS_TECIDOS = {
  tecido: { nome: 'Tecido', agua: 0.1, absorve: 0.9, seca: 0.55, isola: 0.3, vento: 0.25, neve: 0.2, peso: 0.25, reflete: 0.35 },
  leve: { nome: 'Linho leve', agua: 0.05, absorve: 0.7, seca: 1, isola: 0.08, vento: 0.1, neve: 0.1, peso: 0.12, reflete: 0.85 },
  la: { nome: 'Lã acolchoada', agua: 0.25, absorve: 0.75, seca: 0.25, isola: 0.9, vento: 0.55, neve: 0.75, peso: 0.45, reflete: 0.15 },
  couro: { nome: 'Couro', agua: 0.55, absorve: 0.35, seca: 0.3, isola: 0.4, vento: 0.65, neve: 0.45, peso: 0.5, reflete: 0.25 },
  metal: { nome: 'Metal', agua: 0.9, absorve: 0.03, seca: 1, isola: 0.12, vento: 0.75, neve: 0.5, peso: 1, reflete: 0.65 },
  cristal: { nome: 'Cristal tecnológico', agua: 0.85, absorve: 0.05, seca: 1, isola: 0.4, vento: 0.7, neve: 0.6, peso: 0.6, reflete: 0.5 },
  eclipse: { nome: 'Liga Eclipse', agua: 1, absorve: 0, seca: 1, isola: 0.6, vento: 0.9, neve: 0.9, peso: 0.55, reflete: 0.5, aura: true },
};
// Famílias: tier (força), tecido, resistências, mobilidade, materiais da receita (por unidade de
// peso da vaga), se precisa de PLANO (receita descoberta) e o visual (cores do js/heroes/pecas3d.js)
const ARS_FAMILIAS = {
  viajante: { nome: 'do Viajante', tier: 1, tec: 'tecido', res: {}, mob: 0.01, mat: { tecido: 2, sucata: 1 },
    nomes: { capacete: 'Capuz do Viajante', peitoral: 'Túnica do Viajante', capa: 'Manto do Viajante', acessorio: 'Amuleto de Cobre' }, acc: 'amuleto', cor: ['#5c5446', '#3a342b', '#8a7a5a'] },
  couro: { nome: 'de Couro Batido', tier: 2, tec: 'couro', res: { veneno: 0.06 }, mob: 0, mat: { couro: 2, tecido: 1 },
    nomes: { capacete: 'Elmo de Couro Batido', peitoral: 'Gibão de Couro Batido', capa: 'Capa de Couro', acessorio: 'Cinto de Ferramentas' }, acc: 'cinto', cor: ['#6b4a2e', '#3f2b1b', '#b08850'] },
  inverno: { nome: 'de Inverno', tier: 2, tec: 'la', res: { gelo: 0.14 }, mob: -0.005, mat: { tecido: 2, couro: 1, gelo: 1 }, plano: true,
    nomes: { capacete: 'Gorro Forrado', peitoral: 'Casaco Forrado', capa: 'Manto de Pele', acessorio: 'Cachecol Aquecido' }, acc: 'cachecol', cor: ['#8a7d6c', '#5c5042', '#e8e2d4'] },
  deserto: { nome: 'do Deserto', tier: 2, tec: 'leve', res: { fogo: 0.1 }, mob: 0.02, mat: { tecido: 3, fragmento: 1 }, plano: true,
    nomes: { capacete: 'Turbante do Deserto', peitoral: 'Túnica de Linho', capa: 'Véu Solar', acessorio: 'Cantil do Deserto' }, acc: 'cantil', cor: ['#cbb48a', '#8f7a56', '#e9dcc0'] },
  placas: { nome: 'de Placas', tier: 3, tec: 'metal', res: {}, mob: -0.02, mat: { ferro: 3, couro: 1 }, plano: true,
    nomes: { capacete: 'Elmo de Placas', peitoral: 'Couraça de Placas', capa: 'Tabardo de Placas', acessorio: 'Mochila Tática' }, acc: 'mochila', cor: ['#7c8594', '#4a5160', '#c0c8d4'] },
  cristal: { nome: 'de Cristal', tier: 4, tec: 'cristal', res: { eletrico: 0.14 }, mob: 0, mat: { ferro: 2, cristal: 3, circuito: 1 }, plano: true,
    nomes: { capacete: 'Visor de Cristal', peitoral: 'Peitoral de Cristal', capa: 'Capa Refratária', acessorio: 'Módulo de Cristal' }, acc: 'modulo', cor: ['#3c5a7a', '#22324a', '#7fe8ff'], luz: '#7fe8ff' },
  obsidiana: { nome: 'de Obsidiana', tier: 5, tec: 'metal', res: { fogo: 0.2 }, mob: -0.015, mat: { obsidiana: 3, ferro: 2, nucleo: 1 }, plano: true,
    nomes: { capacete: 'Elmo de Obsidiana', peitoral: 'Couraça de Obsidiana', capa: 'Manto de Cinzas', acessorio: 'Braseiro de Obsidiana' }, acc: 'braseiro', cor: ['#2a2024', '#161114', '#5a4a50'], luz: '#ff7a2a' },
  eclipse: { nome: 'Eclipse', tier: 6, tec: 'eclipse', res: { fogo: 0.1, gelo: 0.1, eletrico: 0.1, veneno: 0.1 }, mob: 0.01, mat: { essencia: 2, circuito: 2, nucleo: 2 }, plano: true, rmin: ARS_ECLIPSE,
    nomes: { capacete: 'Coroa Eclipse', peitoral: 'Égide Eclipse', capa: 'Manto do Eclipse', acessorio: 'Núcleo Eclipse' }, acc: 'nucleo', cor: ['#1c1f33', '#0e0f1c', '#3a3f66'], luz: '#8fa8ff' },
};
const ARS_RES = { fogo: 'Fogo', gelo: 'Gelo', eletrico: 'Elétrico', veneno: 'Veneno' };
// Acessórios: o efeito próprio de cada um (além da defesa e dos bônus da raridade)
const ARS_ACESSORIOS = {
  amuleto: { st: { energia: 8 }, desc: '+energia' },
  cinto: { st: { recarga: 0.03 }, desc: 'recarga mais rápida' },
  cachecol: { clima: { calor: 0.25 }, desc: 'aquece no frio' },
  cantil: { clima: { fresco: 0.3 }, desc: 'refresca no calor' },
  mochila: { st: { vida: 12 }, carga: 6, desc: 'aguenta mais peso' },
  modulo: { st: { critico: 0.03 }, desc: '+crítico' },
  braseiro: { clima: { calor: 0.45 }, st: { dano: 0.03 }, desc: 'aquece muito no frio' },
  nucleo: { clima: { calor: 0.2, repele: 1 }, st: { dano: 0.04, energia: 10 }, desc: 'aura que repele a água e aquece' },
};
const ARS_MAX = 30;   // peças na mochila (o resto vai ao armazém da cidade)

const Arsenal = {
  ui: { foco: 'vagas', vaga: 0, sel: 0 },
  get S() {
    const W = World.state;
    if (!W.arsenal) {
      W.arsenal = { itens: [], vest: {}, seq: 1, ocultar: {}, armas: {}, ferramenta: 0, receitas: [], armazem: { itens: [], mat: {} } };
      // começo: três peças simples do Viajante na mochila (nada vestido: o herói continua igual)
      for (const v of ['botas', 'luvas', 'capa']) this.guardar(this.gerar(v, 'viajante', 0, 1), true);
    }
    const A = W.arsenal;
    A.itens = A.itens || []; A.vest = A.vest || {}; A.ocultar = A.ocultar || {}; A.armas = A.armas || {};
    A.receitas = A.receitas || []; A.armazem = A.armazem || { itens: [], mat: {} };
    return A;
  },
  fam(it) { return ARS_FAMILIAS[it.fam] || ARS_FAMILIAS.viajante; },
  rar(it) { return ARS_RARIDADES[it.r] || ARS_RARIDADES[0]; },
  tec(it) { return ARS_TECIDOS[this.fam(it).tec]; },
  // Nome: o próprio da família (capacete, peitoral, capa e acessório) ou a vaga + a família
  nomeBase(slot, fam) { const F = ARS_FAMILIAS[fam]; return F.nomes[slot] || `${ARS_VAGAS[slot].nome} ${F.nome}`; },
  nome(it) { return `${this.nomeBase(it.slot, it.fam)}${it.ap ? ` +${it.ap}` : ''}`; },
  req(it) { return Math.max(1, it.lv - 4); },
  mult(it) { return 1 + (it.ap || 0) * 0.1; },
  // Materiais da receita da peça (por família e peso da vaga)
  custoMat(slot, fam) {
    const F = ARS_FAMILIAS[fam], k = Math.max(0.5, ARS_VAGAS[slot].peso), out = {};
    for (const m in F.mat) out[m] = Math.max(1, Math.round(F.mat[m] * k));
    return out;
  },
  // Valor das peças: preço dos materiais da receita; a venda paga menos que comprar o material
  // (nunca dá lucro fabricar para vender), mesmo nas raras
  valorBase(slot, fam) { const M = this.custoMat(slot, fam); let v = 0; for (const m in M) v += (WORLD_MATERIAIS[m] ? WORLD_MATERIAIS[m].preco : 10) * M[m]; return v; },
  valor(it) { return Math.round(this.valorBase(it.slot, it.fam) * (1.3 + it.r * 0.6) * (1 + (it.ap || 0) * 0.2)); },   // preço de compra
  venda(it) { return Math.max(1, Math.round(this.valorBase(it.slot, it.fam) * (0.3 + it.r * 0.04))); },
  item(id) { return this.S.itens.find((q) => q.id === id) || null; },

  // ---------------------------------------------------------------- geração
  gerar(slot, fam, r = 0, lv = 1) {
    const F = ARS_FAMILIAS[fam], V = ARS_VAGAS[slot];
    r = Math.max(r, F.rmin || 0);
    const R = ARS_RARIDADES[r], tk = 0.7 + 0.3 * F.tier, rk = 1 + (R.k - 1) * 0.35, nk = 1 + lv * 0.01;
    const st = {};
    if (V.def) st.defesa = V.def * tk * rk * nk;
    if (V.vida) st.vida = Math.round(V.vida * tk * rk * nk);
    const mob = (F.mob || 0) * (slot === 'botas' ? 2 : slot === 'peitoral' || slot === 'calcas' ? 1 : 0.4);
    if (mob) st.veloc = mob;
    if (slot === 'acessorio') { const A = ARS_ACESSORIOS[F.acc]; if (A && A.st) for (const k in A.st) st[k] = (st[k] || 0) + A.st[k] * rk; }
    // bônus secundários: um na rara, dois na épica em diante
    const extras = ['dano', 'critico', 'energia', 'recarga'], n = r >= 3 ? 2 : r >= 2 ? 1 : 0;
    for (let i = 0; i < n; i++) { const k = extras[(slot.length * 3 + i * 2 + F.tier) % extras.length]; st[k] = (st[k] || 0) + WORLD_ATRIB[k].base * R.k * 0.5 * nk; }
    const res = {};
    for (const k in F.res) res[k] = F.res[k] * (ARS_VAGAS[slot].area * 3 + (slot === 'acessorio' ? 0.4 : 0)) * rk;
    return { id: 0, peca: 1, slot, fam, r, lv, st, res, ap: 0 };
  },
  // Família de uma zona (para saque e loja): a do nível, com o clima da região
  famDaZona(z) {
    const lv = z ? z.lv : 1, reg = z ? z.region : 'carmesin';
    if (lv >= 30) return 'obsidiana';
    if (lv >= 22) return reg === 'asterion' ? 'inverno' : 'cristal';
    if (lv >= 14) return reg === 'seraph' ? 'deserto' : reg === 'asterion' ? 'inverno' : 'placas';
    if (lv >= 7) return 'couro';
    return 'viajante';
  },
  // Guarda na mochila (cheia: vai para o armazém); quieto = sem aviso
  guardar(it, quieto = false) {
    const S = this.S, g = game;
    it.id = S.seq++;
    if (S.itens.length >= ARS_MAX) {
      S.armazem.itens.push(it);
      if (!quieto) g.hud.toast(`Mochila de peças cheia · ${this.nome(it)} foi para o armazém da cidade`, '200,206,220');
      return it;
    }
    S.itens.push(it);
    if (!quieto) g.hud.toast(`PEÇA ${this.rar(it).name.toUpperCase()} · ${this.nome(it)} (B → EQUIPAMENTO)`, this.rar(it).rgb);
    return it;
  },
  // Saque: chefe regional sempre (épica ou melhor), elite 8%, baús 25%
  onKill(e) {
    const z = World.zone;
    if (!z) return;
    const fam = this.famDaZona(z), slot = pick(ARS_ORDEM);
    if (e.worldBoss) this.guardar(this.gerar(slot, fam, WorldInv.rolarRaridade(3, 0.4), z.lv + 2));
    else if (e.elite && Math.random() < 0.08) this.guardar(this.gerar(slot, fam, WorldInv.rolarRaridade(1, 0.3), z.lv));
  },
  onChest(d) {
    const z = World.zone;
    if (!z || Math.random() > (d.boss || d.secret ? 0.6 : 0.25)) return;
    this.guardar(this.gerar(pick(ARS_ORDEM), this.famDaZona(z), WorldInv.rolarRaridade(d.boss ? 2 : 0, 0.2), z.lv));
  },

  // ---------------------------------------------------------------- vestir
  heroi() { return game.player ? game.player.def.id : 'kael'; },
  vestidos(h = this.heroi()) { const V = this.S.vest[h] || {}, out = {}; for (const s in V) { const it = this.item(V[s]); if (it) out[s] = it; } return out; },
  vestido(id, h = this.heroi()) { const V = this.S.vest[h] || {}; for (const s in V) if (V[s] === id) return s; return null; },
  // Alguém veste esta peça? (outro herói também conta: uma peça, um corpo)
  vestidaPor(id) { for (const h in this.S.vest) for (const s in this.S.vest[h]) if (this.S.vest[h][s] === id) return h; return null; },
  equipar(id, h = this.heroi()) {
    const it = this.item(id);
    if (!it) return 'Escolha uma peça.';
    if (game.activeProgress().level < this.req(it)) return `Requer nível ${this.req(it)}.`;
    const outro = this.vestidaPor(id);
    if (outro && outro !== h) delete this.S.vest[outro][it.slot];
    (this.S.vest[h] || (this.S.vest[h] = {}))[it.slot] = id;
    this.refazer();
    return '';
  },
  tirar(slot, h = this.heroi()) { const V = this.S.vest[h]; if (V && V[slot]) { delete V[slot]; this.refazer(); return true; } return false; },
  refazer() { if (game.player) game.player.recalc(false); },
  remover(id) {
    for (const h in this.S.vest) for (const s in this.S.vest[h]) if (this.S.vest[h][s] === id) delete this.S.vest[h][s];
    this.S.itens = this.S.itens.filter((q) => q.id !== id);
    this.refazer();
  },
  // Vende (com loja aberta) ou desmonta (devolve um pouco do material)
  vender(id) {
    const it = this.item(id);
    if (!it) return '';
    if (WorldInv.vende()) {
      const v = this.venda(it);
      this.remover(id); game.stats.soulsBank += v; game.audio.play('soul');
      return `Vendeu ${this.nome(it)} · +${v} células`;
    }
    const M = this.custoMat(it.slot, it.fam), volta = [];
    this.remover(id);
    for (const m in M) { const n = Math.floor(M[m] * 0.35); if (n > 0 && WORLD_MATERIAIS[m]) { Oficios.dar(m, n, false); volta.push(`${n} ${WORLD_MATERIAIS[m].nome}`); } }
    // peça pequena: pelo menos 1 do material principal
    if (!volta.length) { const m = Object.keys(M).filter((k) => WORLD_MATERIAIS[k]).sort((a, b) => M[b] - M[a])[0]; if (m) { Oficios.dar(m, 1, false); volta.push(`1 ${WORLD_MATERIAIS[m].nome}`); } }
    game.audio.play('uiSelect');
    return `Desmontou ${this.nome(it)}${volta.length ? ` · ${volta.join(', ')}` : ''}`;
  },
  // ---------------------------------------------------------------- armeiro (Armaria da cidade)
  // Estoque do dia: quatro peças da família do nível do herói (uma incomum, uma rara) e os planos
  // de família que ele ainda não conhece, até o nível dele (o do Eclipse só vem dos chefes)
  lojaArmeiro() {
    const S = this.S, dia = World.state.dia || 1, lv = game.activeProgress().level;
    if (!S.loja || S.loja.dia !== dia) {
      const rnd = mulberry32((dia * 7919 + 131) >>> 0), fam = this.famDaZona({ lv: lv + 2, region: 'nexus' }), vagas = ARS_ORDEM.slice();
      S.loja = { dia, itens: [0, 0, 1, 2].map((r) => this.gerar(vagas.splice(Math.floor(rnd() * vagas.length), 1)[0], fam, r, lv + 1)) };
    }
    const out = S.loja.itens.map((it, k) => ({ peca: k }));
    for (const f of FAB_PLANOS) if (f !== 'eclipse' && !Fabrica.sabePlano(f) && lv >= this.nivelPlano(f)) out.push({ plano: f });
    return out;
  },
  nivelPlano(fam) { return Math.max(1, [1, 1, 6, 12, 18, 25, 30][ARS_FAMILIAS[fam].tier] - 3); },
  precoPlano(fam) { const t = ARS_FAMILIAS[fam].tier; return Oficios.precoCom(150 * t * t, 'nexus'); },
  // Compra a peça k do estoque do dia (o preço já foi conferido por quem chama)
  comprarPeca(k) {
    const L = this.S.loja, it = L && L.itens[k];
    if (!it) return null;
    L.itens.splice(k, 1);
    return this.guardar(Object.assign({}, it));
  },
  // Resumo para a loja: atributos com a diferença para a peça vestida na mesma vaga
  resumo(it) {
    const fmtR = (r, v) => `${v < 0 ? '−' : '+'}${Math.round(Math.abs(v) * 100)}% res. ${ARS_RES[r]}`;
    return this.comparar(it).map((c) => {
      const base = c.res ? fmtR(c.res, c.v) : this.fmtSt(c.k, c.v), d = Math.abs(c.d) < 1e-4 ? '' : c.d > 0 ? ' ▲' : ' ▼';
      return base + d;
    }).join(' · ');
  },
  ocultavel(slot) { return slot === 'capacete' || slot === 'capa' || slot === 'acessorio'; },
  alternarOculto(slot) { if (!this.ocultavel(slot)) return false; this.S.ocultar[slot] = !this.S.ocultar[slot]; return true; },

  // ---------------------------------------------------------------- efeito no herói
  // Soma das peças vestidas (Player.recalc → WorldInv.apply, só no mundo aberto); o peso acima
  // da carga (6, +6 com a mochila tática) tira 2% de velocidade por ponto
  apply(S, h = this.heroi()) {
    const V = this.vestidos(h);
    let peso = 0, carga = 6;
    for (const s in V) {
      const it = V[s], k = this.mult(it);
      for (const a in it.st) WORLD_ATRIB[a].apply(S, it.st[a] * k);
      for (const r in it.res) S['res' + r.charAt(0).toUpperCase() + r.slice(1)] = Math.min(0.8, (S['res' + r.charAt(0).toUpperCase() + r.slice(1)] || 0) + it.res[r] * k);
      peso += ARS_VAGAS[s].peso * this.tec(it).peso;
      if (s === 'acessorio') { const A = ARS_ACESSORIOS[this.fam(it).acc]; if (A && A.carga) carga += A.carga; }
    }
    S.peso = peso; S.carga = carga;
    if (peso > carga) S.speedMult -= (peso - carga) * 0.02;
    // arma aprimorada na bancada (js/mundo/fabrica.js): +6% de dano por nível
    const w = typeof RosterManager !== 'undefined' ? RosterManager.equippedWeapon(h) : null;
    if (w && this.S.armas[w]) S.dmgMult += 0.06 * this.S.armas[w];
  },
  // Proteção do conjunto vestido contra o ambiente (js/mundo/clima.js): média ponderada pela
  // área de cada vaga; o corpo sem peça usa a roupa do próprio herói (couro e tecido)
  protecao(h = this.heroi()) {
    const V = this.vestidos(h), P = { agua: 0, absorve: 0, seca: 0, isola: 0, vento: 0, neve: 0, reflete: 0, calor: 0, fresco: 0, repele: 0 };
    let area = 0;
    const base = { agua: 0.3, absorve: 0.6, seca: 0.45, isola: 0.32, vento: 0.4, neve: 0.3, reflete: 0.3 };
    for (const s of ARS_ORDEM) {
      const a = ARS_VAGAS[s].area;
      if (!a) continue;
      const T = V[s] ? this.tec(V[s]) : base;
      for (const k in base) P[k] += T[k] * a;
      area += a;
    }
    for (const k in base) P[k] /= area;
    const ac = V.acessorio && ARS_ACESSORIOS[this.fam(V.acessorio).acc];
    if (ac && ac.clima) for (const k in ac.clima) P[k] += ac.clima[k];
    for (const s in V) if (this.tec(V[s]).aura) { P.repele = 1; P.calor += 0.05; }
    return P;
  },

  // ---------------------------------------------------------------- aba EQUIPAMENTO
  lista() {
    const U = this.ui, slot = ARS_ORDEM[U.vaga];
    return this.S.itens.filter((it) => it.slot === slot).sort((a, b) => b.r - a.r || b.lv - a.lv);
  },
  // Prévia: o que o herói vestiria com a peça escolhida no lugar da atual
  previa() {
    const U = this.ui, V = Object.assign({}, this.vestidos());
    if (U.foco === 'pecas') { const it = this.lista()[U.sel]; if (it) V[it.slot] = it; }
    return V;
  },
  // Comparação: diferença de cada atributo entre a peça escolhida e a vestida na mesma vaga
  comparar(it) {
    const atual = this.vestidos()[it.slot], out = [];
    const ks = new Set(Object.keys(it.st).concat(atual ? Object.keys(atual.st) : []));
    for (const k of ks) {
      const a = (it.st[k] || 0) * this.mult(it), b = atual ? (atual.st[k] || 0) * this.mult(atual) : 0;
      out.push({ k, v: a, d: a - b });
    }
    for (const r of new Set(Object.keys(it.res).concat(atual ? Object.keys(atual.res) : []))) {
      const a = (it.res[r] || 0) * this.mult(it), b = atual ? (atual.res[r] || 0) * this.mult(atual) : 0;
      out.push({ res: r, v: a, d: a - b });
    }
    return out;
  },
  fmtSt(k, v) { if (!WORLD_ATRIB[k]) return `${v}`; return v < 0 ? `−${(Math.abs(v) * 100).toFixed(1)}% ${WORLD_ATRIB[k].name}` : WorldInv.fmt(k, v); },
  updateUI(dt, inp) {
    const U = this.ui, L = this.lista();
    const mv = (d) => { game.audio.play('uiMove'); return d; };
    if (U.foco === 'vagas') {
      if (inp.pressed.up) U.vaga = mv((U.vaga + ARS_ORDEM.length - 1) % ARS_ORDEM.length);
      if (inp.pressed.down) U.vaga = mv((U.vaga + 1) % ARS_ORDEM.length);
      if ((inp.pressed.right || inp.pressed.confirm) && L.length) { U.foco = 'pecas'; U.sel = 0; game.audio.play('uiMove'); }
      else if (inp.pressed.confirm && !L.length) WorldInv.aviso('Nenhuma peça desta vaga na mochila (fabrique na forja da cidade)');
      if (inp.pressed.erase) this.acao('tirar');
    } else {
      if (inp.pressed.up) U.sel = mv(Math.max(0, U.sel - 1));
      if (inp.pressed.down) U.sel = mv(Math.min(L.length - 1, U.sel + 1));
      if (inp.pressed.left) { U.foco = 'vagas'; game.audio.play('uiMove'); }
      if (inp.pressed.confirm) this.acao('vestir');
      if (inp.pressed.erase) this.acao('vender');
      if (!L.length) U.foco = 'vagas';
    }
    U.sel = clamp(U.sel, 0, Math.max(0, L.length - 1));
  },
  acao(a) {
    const U = this.ui, L = this.lista(), slot = ARS_ORDEM[U.vaga], it = U.foco === 'pecas' ? L[U.sel] : null;
    if (a === 'vestir' && it) {
      if (this.vestido(it.id)) { this.tirar(it.slot); WorldInv.aviso(`Tirou ${this.nome(it)}`, true); game.audio.play('sheathe', 0.7); return; }
      const e = this.equipar(it.id);
      if (e) WorldInv.aviso(e); else { WorldInv.aviso(`Vestiu ${this.nome(it)}`, true); game.audio.play('draw', 0.7); }
    } else if (a === 'tirar') {
      if (this.tirar(slot)) { WorldInv.aviso(`Tirou ${ARS_VAGAS[slot].nome.toLowerCase()}`, true); game.audio.play('sheathe', 0.7); }
    } else if (a === 'vender' && it) {
      const txt = this.vender(it.id);
      if (txt) WorldInv.aviso(txt, true);
      U.sel = Math.max(0, U.sel - 1);
    } else if (a === 'ocultar') {
      if (this.alternarOculto(slot)) WorldInv.aviso(`${ARS_VAGAS[slot].nome} ${this.S.ocultar[slot] ? 'oculto (os atributos continuam)' : 'visível'}`, true);
    }
  },
  clique(r) {
    const U = this.ui;
    if (r.vaga !== undefined) { U.vaga = r.vaga; U.foco = 'vagas'; U.sel = 0; game.audio.play('uiMove'); return true; }
    if (r.peca !== undefined) { if (U.foco === 'pecas' && U.sel === r.peca) this.acao('vestir'); else { U.foco = 'pecas'; U.sel = r.peca; game.audio.play('uiMove'); } return true; }
    if (r.ars) { this.acao(r.ars); return true; }
    return false;
  },
  // Herói girando devagar com as peças (a escolhida já no corpo)
  modeloPrevia(ctx, x, y, sc, t) {
    const p = game.player;
    if (!p || !R3D.active) return false;
    const key = heroModelKey(p.def);
    if (!game.model3(key)) return false;
    const k = this.vitrine || (this.vitrine = new Player(0, 0, p.def));
    if (k.def !== p.def) { this.vitrine = null; return this.modeloPrevia(ctx, x, y, sc, t); }
    k.vitrine = true; k.state = 'idle'; k.animTime = t; k.stateTime = t; k.moveSpeed = 0; k.flash = 0; k.fury = 0;
    k.wpnOut = false; k.facing = k.viewFacing = 0.9 + 0.55 * Math.sin(t * 0.35);
    k.pecasPrevia = this.previa();
    const o = game.opts3(k, 0); o.scale = sc;
    const it = game.queue3(key, k, o);
    R3D.flush(Math.min(3, game.scale));
    if (!it || !it.ok) return false;
    R3D.blit(ctx, it, x, y);
    R3D.blitEmissive(ctx, it, x, y, 1);
    return true;
  },
  iconeVaga(ctx, slot, x, y, s, cor) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 20, s / 20);
    ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (slot === 'capacete') { ctx.arc(0, 1, 7, Math.PI, 0); ctx.lineTo(7, 5); ctx.lineTo(-7, 5); ctx.closePath(); ctx.moveTo(-4, 1); ctx.lineTo(4, 1); }
    else if (slot === 'peitoral') { ctx.moveTo(-7, -6); ctx.lineTo(-3, -7); ctx.lineTo(0, -4); ctx.lineTo(3, -7); ctx.lineTo(7, -6); ctx.lineTo(6, 7); ctx.lineTo(-6, 7); ctx.closePath(); }
    else if (slot === 'ombroE' || slot === 'ombroD') { const sd = slot === 'ombroE' ? -1 : 1; ctx.arc(0, 2, 7, Math.PI, 0); ctx.closePath(); ctx.moveTo(-5 * sd, 2); ctx.lineTo(-5 * sd, 7); }
    else if (slot === 'luvas') { ctx.moveTo(-5, 7); ctx.lineTo(-5, -2); ctx.lineTo(-3, -7); ctx.lineTo(5, -7); ctx.lineTo(6, 0); ctx.lineTo(4, 7); ctx.closePath(); }
    else if (slot === 'calcas') { ctx.moveTo(-6, -7); ctx.lineTo(6, -7); ctx.lineTo(6, 7); ctx.lineTo(2, 7); ctx.lineTo(0, -1); ctx.lineTo(-2, 7); ctx.lineTo(-6, 7); ctx.closePath(); }
    else if (slot === 'botas') { ctx.moveTo(-5, -7); ctx.lineTo(1, -7); ctx.lineTo(1, 2); ctx.lineTo(7, 4); ctx.lineTo(7, 7); ctx.lineTo(-5, 7); ctx.closePath(); }
    else if (slot === 'capa') { ctx.moveTo(-4, -7); ctx.lineTo(4, -7); ctx.lineTo(8, 7); ctx.lineTo(-8, 7); ctx.closePath(); }
    else { ctx.arc(0, 2, 4, 0, TAU); ctx.moveTo(-4, -7); ctx.lineTo(0, -2); ctx.lineTo(4, -7); }
    ctx.stroke();
    ctx.restore();
  },
  draw(ctx, Ly, t) {
    const U = this.ui, WU = WorldInv.ui, S = this.S, V = this.vestidos(), L = this.lista(), p = game.player;
    const titulo = (txt, x, y) => { ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(150,205,255,0.9)'; ctx.textAlign = 'left'; ctx.fillText(txt, x, y); ctx.letterSpacing = '0px'; };
    const top = Ly.top, bot = Ly.det - 10, pw = clamp(VIEW_W * 0.22, 200, 300);
    // herói em 3D
    titulo(`${charFirstName(p.def.id).toUpperCase()} · PRÉVIA`, Ly.lx, top - 12);
    ctx.fillStyle = 'rgba(10,16,30,0.85)'; ctx.fillRect(Ly.lx, top, pw, bot - top);
    ctx.strokeStyle = 'rgba(90,150,255,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(Ly.lx + 0.5, top + 0.5, pw - 1, bot - top - 1);
    const g = ctx.createRadialGradient(Ly.lx + pw / 2, bot - 40, 10, Ly.lx + pw / 2, bot - 40, pw * 0.6);
    g.addColorStop(0, 'rgba(70,120,220,0.25)'); g.addColorStop(1, 'rgba(70,120,220,0)');
    ctx.fillStyle = g; ctx.fillRect(Ly.lx, top, pw, bot - top);
    const sc = clamp((bot - top) / 120, 2.2, 4.2);
    if (!this.modeloPrevia(ctx, Ly.lx + pw / 2, bot - 30, sc, t)) {
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.7)'; ctx.textAlign = 'center';
      ctx.fillText('Prévia 3D indisponível (gráficos 2D)', Ly.lx + pw / 2, (top + bot) / 2);
    }
    const esp = typeof SPECIAL_ARMOR_DEFS !== 'undefined' && SPECIAL_ARMOR_DEFS[RosterManager.equippedArmor(p.def.id)];
    if (esp) { ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = '#ffd47a'; ctx.textAlign = 'center'; ctx.fillText('Armadura especial vestida: cobre as peças', Ly.lx + pw / 2, top + 16); }
    // vagas
    const vx = Ly.lx + pw + 18, vw = clamp(VIEW_W * 0.26, 220, 330), rh = clamp((bot - top) / ARS_ORDEM.length - 4, 30, 46);
    titulo('VAGAS', vx, top - 12);
    ARS_ORDEM.forEach((s, i) => {
      const y = top + i * (rh + 4), it = V[s], on = U.vaga === i, foco = on && U.foco === 'vagas';
      ctx.fillStyle = on ? 'rgba(40,70,130,0.6)' : 'rgba(12,20,36,0.85)'; ctx.fillRect(vx, y, vw, rh);
      ctx.strokeStyle = foco ? '#ffffff' : it ? rgba(this.rar(it).rgb, 0.7) : 'rgba(90,120,170,0.35)'; ctx.lineWidth = foco ? 2 : 1; ctx.strokeRect(vx + 0.5, y + 0.5, vw - 1, rh - 1);
      this.iconeVaga(ctx, s, vx + 18, y + rh / 2, 18, it ? rgba(this.rar(it).rgb, 1) : 'rgba(160,175,200,0.6)');
      ctx.textAlign = 'left'; ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,180,210,0.8)';
      ctx.fillText(`${ARS_VAGAS[s].nome}${S.ocultar[s] ? ' · oculto' : ''}`, vx + 36, y + rh * 0.32);
      ctx.font = `bold 12px ${FONT_UI}`; ctx.fillStyle = it ? rgba(this.rar(it).rgb, 1) : 'rgba(160,175,200,0.5)';
      ctx.fillText(it ? this.nome(it) : '—', vx + 36, y + rh * 0.7);
      WU.rects.push({ vaga: i, x: vx, y, w: vw, h: rh });
    });
    // peças da vaga
    const px = vx + vw + 18, pwd = VIEW_W - 36 - px, slot = ARS_ORDEM[U.vaga];
    titulo(`${ARS_VAGAS[slot].nome.toUpperCase()} · NA MOCHILA (${S.itens.length}/${ARS_MAX})`, px, top - 12);
    const prh = 40, maxN = Math.max(1, Math.floor((bot - top - 110) / (prh + 4)));
    const ini = clamp(U.sel - maxN + 1, 0, Math.max(0, L.length - maxN));
    L.slice(ini, ini + maxN).forEach((it, j) => {
      const i = ini + j, y = top + j * (prh + 4), on = U.foco === 'pecas' && U.sel === i, R = this.rar(it), vest = this.vestido(it.id), outro = !vest && this.vestidaPor(it.id);
      ctx.fillStyle = on ? 'rgba(40,70,130,0.6)' : 'rgba(12,20,36,0.85)'; ctx.fillRect(px, y, pwd, prh);
      ctx.strokeStyle = on ? '#ffffff' : rgba(R.rgb, 0.55); ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(px + 0.5, y + 0.5, pwd - 1, prh - 1);
      ctx.textAlign = 'left'; ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = rgba(R.rgb, 1);
      ctx.fillText(`${this.nome(it)}`, px + 10, y + 14);
      ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.8)';
      ctx.fillText(`${R.name} · ${this.tec(it).nome} · nv ${it.lv}${vest ? ' · VESTIDA' : outro ? ` · com ${charFirstName(outro)}` : ''}`, px + 10, y + 30);
      WU.rects.push({ peca: i, x: px, y, w: pwd, h: prh });
    });
    if (!L.length) { ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.7)'; ctx.textAlign = 'left'; ctx.fillText('Nenhuma peça desta vaga. Fabrique na forja do Refúgio da Aurora,', px, top + 18); ctx.fillText('compre no armeiro ou encontre em baús, elites e chefes.', px, top + 36); }
    // resumo do conjunto: defesa, peso e proteção contra o clima
    const Ssum = Object.assign({}, BASE_STATS); this.apply(Ssum);
    const P = this.protecao(), ry = bot - 96;
    titulo('CONJUNTO', px, ry);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = '#eef3fa'; ctx.textAlign = 'left';
    const resTxt = Object.keys(ARS_RES).map((r) => { const v = Ssum['res' + r.charAt(0).toUpperCase() + r.slice(1)] || 0; return v ? `${ARS_RES[r]} ${Math.round(v * 100)}%` : ''; }).filter(Boolean).join(' · ');
    ctx.fillText(`Defesa +${Math.round((Ssum.armor || 0) * 100)}% · Vida +${Math.round(Ssum.hpBonus || 0)} · Peso ${(Ssum.peso || 0).toFixed(1)}/${Ssum.carga || 6}${(Ssum.peso || 0) > (Ssum.carga || 6) ? ' (lento)' : ''}`, px, ry + 20);
    ctx.fillText(`Resistências: ${resTxt || 'nenhuma'}`, px, ry + 40);
    ctx.fillText(`Clima: isolamento ${Math.round(P.isola * 100)}% · água ${Math.round(P.agua * 100)}% · vento ${Math.round(P.vento * 100)}% · reflexo do sol ${Math.round(P.reflete * 100)}%`, px, ry + 60);
    // detalhes da peça escolhida (ou da vestida na vaga) com a comparação
    const it = U.foco === 'pecas' ? L[U.sel] : V[slot], y = Ly.det, x = 36, w = VIEW_W - 72;
    ctx.fillStyle = 'rgba(8,14,28,0.92)'; ctx.fillRect(x, y, w, 132);
    ctx.strokeStyle = 'rgba(90,150,255,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 131);
    const acoes = [];
    if (it) {
      const R = this.rar(it), req = this.req(it), falta = game.activeProgress().level < req;
      ctx.textAlign = 'left'; ctx.font = `bold 18px ${FONT_TITLE}`; ctx.fillStyle = rgba(R.rgb, 1); ctx.fillText(this.nome(it).toUpperCase(), x + 18, y + 24);
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)';
      const ac = it.slot === 'acessorio' ? ARS_ACESSORIOS[this.fam(it).acc] : null;
      ctx.fillText(`${R.name} · ${ARS_VAGAS[it.slot].nome} · ${this.tec(it).nome}${ac ? ` · ${ac.desc}` : ''} · nível ${it.lv}${it.ap ? ` · +${it.ap}` : ''}`, x + 18, y + 46);
      ctx.textAlign = 'right'; ctx.fillStyle = falta ? '#ff8a9a' : 'rgba(160,200,170,0.85)'; ctx.fillText(`Requer nível ${req}`, x + w - 18, y + 24); ctx.textAlign = 'left';
      let cx = x + 18;
      for (const c of this.comparar(it)) {
        const nome = c.res ? `${ARS_RES[c.res]} ${Math.round(c.v * 100)}%` : this.fmtSt(c.k, c.v);
        const dtx = U.foco === 'pecas' && Math.abs(c.d) > 1e-6 ? ` (${c.d > 0 ? '+' : '−'}${c.res || (WORLD_ATRIB[c.k] && WORLD_ATRIB[c.k].pct) ? `${Math.abs(c.d * 100).toFixed(1)}%` : Math.round(Math.abs(c.d))})` : '';
        ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = '#ffffff'; ctx.fillText(nome, cx, y + 74);
        const w0 = ctx.measureText(nome).width;
        if (dtx) { ctx.fillStyle = c.d > 0 ? '#7dffb0' : '#ff8a9a'; ctx.font = `12px ${FONT_UI}`; ctx.fillText(dtx, cx + w0 + 4, y + 74); }
        cx += w0 + ctx.measureText(dtx).width + 24;
        if (cx > x + w - 160) break;
      }
      if (U.foco === 'pecas') {
        acoes.push(['vestir', this.vestido(it.id) ? 'TIRAR' : 'VESTIR'], ['vender', WorldInv.vende() ? `VENDER +${this.venda(it)}` : 'DESMONTAR']);
      } else acoes.push(['tirar', 'TIRAR']);
    } else {
      ctx.textAlign = 'left'; ctx.font = `bold 16px ${FONT_TITLE}`; ctx.fillStyle = 'rgba(200,214,235,0.75)';
      ctx.fillText(`${ARS_VAGAS[slot].nome.toUpperCase()} · VAGA LIVRE`, x + 18, y + 24);
    }
    if (this.ocultavel(slot)) acoes.push(['ocultar', S.ocultar[slot] ? 'MOSTRAR' : 'OCULTAR']);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = '#9fd0ff'; ctx.textAlign = 'left';
    ctx.fillText(it ? `Vale ${this.venda(it)} células na loja · desmontar devolve parte do material` : 'Enter: ver as peças da vaga', x + 18, y + 104);
    let bx = x + w - 18;
    for (const [id, label] of acoes.slice().reverse()) {
      ctx.font = `bold 13px ${FONT_TITLE}`;
      const bw = ctx.measureText(label).width + 34;
      bx -= bw;
      const alt = id === 'vender';
      ctx.fillStyle = alt ? 'rgba(80,30,40,0.85)' : 'rgba(30,70,140,0.85)'; ctx.fillRect(bx, y + 84, bw, 34);
      ctx.strokeStyle = alt ? 'rgba(255,120,140,0.8)' : 'rgba(150,205,255,0.85)'; ctx.strokeRect(bx + 0.5, y + 84.5, bw - 1, 33);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(label, bx + bw / 2, y + 101);
      WU.rects.push({ ars: id, x: bx, y: y + 84, w: bw, h: 34 });
      bx -= 12;
    }
  },
  dica() { return this.ui.foco === 'pecas' ? 'Enter: vestir / tirar · Delete: vender ou desmontar · ←: vagas · Q/E: abas · Esc: fechar' : '↑/↓: vaga · Enter ou →: peças · Delete: tirar · Q/E: abas · Esc: fechar'; },
};
