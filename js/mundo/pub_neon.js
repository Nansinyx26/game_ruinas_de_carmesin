'use strict';
// ECLIPSE ZERO · Pulso Neon: o pub cyberpunk do Mercado Neon, com DJ e a Cyber Night (PubNeon)
// ---------------------------------------------------------------------------
// Entra-se pelo Bar Neon (a estrutura neon_cyberpunk_bar do Mercado Neon, js/mundo/estruturas.js): a porta
// fica no lado do prédio voltado para a praça. Dentro, um interior próprio (metro_pub), montado como os
// interiores do Bairro da Muralha (js/mundo/bairro.js: BAIRRO_INTERIORES, mobília com colisores) com a
// mobília metálica feita no Blender (tools/blender/arquitetura.py: balcão de vidro escuro com a luz por
// trás, estante de garrafas acesas, banquetas cromadas, mesas altas, sofás de couro, a cabine do DJ, as
// torres de som, o projetor de holograma e a pista de LED, que é desenhada rente ao chão).
// Gente: a mesma casa viva da taverna (js/mundo/taverna_viva.js, Object.create(TavernaViva)) com os
// fregueses da cidade de baixo, o copo neon (GLB) na mão e na mesa e as conversas do Nexus.
// CYBER NIGHT (22h–03h): o DJ VOLTA chega, sobe na cabine e mixa (a pose npc_dj do Kael: scratch no
// compasso, fone na orelha, mão para a pista); a lotação sobe até o máximo, a pista enche e dança no BPM
// da música; as luzes da pista e do palco pulsam na batida. Fora da noite: som ambiente (lounge), a casa
// mais vazia e a cabine apagada.
// MÚSICA: eletrônica tocada aqui mesmo (Web Audio: bumbo, chimbal, baixo e o arpejo) no volume e no lado
// do DJ (perto da cabine, mais alto; o lado da tela, no estéreo); a música da região abaixa dentro do pub.
// A bartender Kira serve drinques (energia e o brilho neon por alguns minutos).
// ---------------------------------------------------------------------------
const PUB_ID = 'metro_pub';
const PUB_BPM = 124;
THEMES.interior_neon = { floor: [262, 22, 9], wall: [266, 26], lamp: '255,80,220', accent: '90,230,255', dark: '6,4,14', darkness: 0.74, aberto: 0,
  sky: 'indoor', decor: 'none', pillar: 'stone', deco: 'concreto', ruined: 0, amb3p: [0.42, 0.36, 0.58] };
(function () {
  const P2 = Math.PI / 2;
  // mesas altas com três banquetas em volta ([x, y] da mesa); os assentos olham para a mesa
  const MESAS = [[0.2, 0.44], [0.32, 0.62], [0.62, 0.72], [0.17, 0.82]];
  const moveis = [['prateleira_bar', 0.25, 0.025, P2, 1], ['balcao_neon', 0.25, 0.12, P2, 1],
    ['banqueta_neon', 0.16, 0.18, 0, 1], ['banqueta_neon', 0.22, 0.18, 0, 1], ['banqueta_neon', 0.28, 0.18, 0, 1], ['banqueta_neon', 0.34, 0.18, 0, 1],
    ['cabine_dj', 0.87, 0.36, Math.PI, 1], ['caixa_som', 0.9, 0.17, Math.PI, 1], ['caixa_som', 0.9, 0.55, Math.PI, 1],
    ['pista_led', 0.6, 0.36, 0, 1], ['coluna_holo', 0.45, 0.17, 0, 1], ['coluna_holo', 0.78, 0.62, 0, 1],
    ['sofa_neon', 0.035, 0.56, 0, 1], ['sofa_neon', 0.035, 0.7, 0, 1], ['caixa_som', 0.94, 0.86, Math.PI, 0.8]];
  const ROD = 0.032;   // banquetas em volta das mesas altas
  for (const [x, y] of MESAS) {
    moveis.push(['mesa_alta_neon', x, y, 0, 1]);
    for (const a of [-2.3, 0.2, 2.4]) moveis.push(['banqueta_neon', x + Math.cos(a) * ROD, y + Math.sin(a) * ROD, 0, 1]);
  }
  BAIRRO_INTERIORES[PUB_ID] = { predio: null, name: 'Pulso Neon', theme: 'interior_neon', tiles: 13, MESAS, ROD,
    saida: { to: 'metro_mercado', chegada: [0.3, 0.36], rotulo: '↓ SAIR · MERCADO NEON' }, moveis,
    objetivo: 'drinques com a Kira no balcão · Cyber Night com o DJ VOLTA das 22h às 3h' };
  worldPrepZone(PUB_ID, { r: -90, c: -90, region: 'metropole', cidade: true, distrito: 'interior', predio: null, name: 'Pulso Neon', theme: 'interior_neon', tiles: 13, pillars: 0, lv: 1,
    mapa: worldRegion('metropole').at, camps: [], chests: [] });
  WORLD_ZONES[PUB_ID].sub = 'METRÓPOLE · MERCADO NEON · PULSO NEON';
})();

// Fregueses do pub: a gente da cidade de baixo (corpos da criação, roupas escuras)
const PUB_FREGUESES = [
  { id: 'pub_a', nome: 'Rex', ap: { corpoG: 0, rostoG: 2, cabeloG: 9, barbaG: 3, pele: 1, corCabelo: 5, corBarba: 0, olhos: 3, porte: 2, altura: 2 }, roupa: { peitoral: 'n30_assassino_peitoral', calcas: 'n30_assassino_calcas', botas: 'n30_assassino_botas' } },
  { id: 'pub_b', nome: 'Yumi', ap: { corpoG: 1, rostoG: 1, cabeloG: 15, barbaG: 0, pele: 0, corCabelo: 4, olhos: 5, porte: 1, altura: 1 }, roupa: { peitoral: 'n50_assassino_peitoral', calcas: 'n30_assassino_calcas', botas: 'ini_botas' } },
  { id: 'pub_c', nome: 'Duda', ap: { corpoG: 1, rostoG: 3, cabeloG: 13, barbaG: 0, pele: 4, corCabelo: 2, olhos: 1, porte: 2, altura: 2 }, roupa: { peitoral: 'n30_patrulheiro_peitoral', calcas: 'n30_patrulheiro_calcas', botas: 'n30_patrulheiro_botas' } },
  { id: 'pub_d', nome: 'Kenji', ap: { corpoG: 0, rostoG: 6, cabeloG: 6, barbaG: 0, pele: 2, corCabelo: 0, olhos: 2, porte: 1, altura: 3 }, roupa: { peitoral: 'n50_assassino_peitoral', calcas: 'n50_assassino_calcas', botas: 'n50_assassino_botas' } },
  { id: 'pub_e', nome: 'Zara', ap: { corpoG: 1, rostoG: 7, cabeloG: 17, barbaG: 0, pele: 5, corCabelo: 3, olhos: 6, porte: 1, altura: 2 }, roupa: { peitoral: 'n30_mago_peitoral', calcas: 'n30_assassino_calcas', botas: 'n30_assassino_botas' } },
  { id: 'pub_f', nome: 'Toni', ap: { corpoG: 0, rostoG: 4, cabeloG: 2, barbaG: 6, pele: 3, corCabelo: 1, corBarba: 1, olhos: 0, porte: 3, altura: 2 }, roupa: { peitoral: 'n30_guardiao_peitoral', calcas: 'n30_guardiao_calcas', botas: 'n30_guardiao_botas' } },
  { id: 'pub_g', nome: 'Íris', ap: { corpoG: 1, rostoG: 5, cabeloG: 11, barbaG: 0, pele: 2, corCabelo: 5, olhos: 4, porte: 1, altura: 1 }, roupa: { peitoral: 'n50_mago_peitoral', calcas: 'n30_mago_calcas', botas: 'ini_botas' } },
  { id: 'pub_h', nome: 'Beto', ap: { corpoG: 0, rostoG: 1, cabeloG: 4, barbaG: 1, pele: 4, corCabelo: 2, corBarba: 2, olhos: 1, porte: 2, altura: 1 }, roupa: { peitoral: 'n30_patrulheiro_peitoral', calcas: 'ini_calca', botas: 'ini_botas' } },
];
// O DJ e a bartender (corpos da criação; o DJ com o fone no pescoço é a pose, o resto é a roupa)
const PUB_EQUIPE = {
  pub_dj: { nome: 'DJ VOLTA', ap: { corpoG: 0, rostoG: 3, cabeloG: 8, barbaG: 2, pele: 5, corCabelo: 4, corBarba: 0, olhos: 4, porte: 1, altura: 2 }, roupa: { peitoral: 'n50_assassino_peitoral', calcas: 'n50_assassino_calcas', botas: 'n50_assassino_botas', luvas: 'n50_assassino_luvas' } },
  pub_kira: { nome: 'KIRA', ap: { corpoG: 1, rostoG: 2, cabeloG: 16, barbaG: 0, pele: 1, corCabelo: 4, olhos: 5, porte: 1, altura: 2 }, roupa: { peitoral: 'n50_mago_peitoral', calcas: 'n30_assassino_calcas', botas: 'n30_assassino_botas' } },
};
const PUB_KIRA = { id: 'pub_kira', nome: 'KIRA', zona: PUB_ID, at: [0.25, 0.072], model: 'civil', variant: 3, facing: Math.PI / 2, papel: 'Bartender do Pulso Neon', servicos: ['bar_neon'],
  personalidade: 'Rápida no shaker e na resposta; conhece cada freguês pelo drinque.',
  ola: ['O de sempre ou vai arriscar o Pulso Azul hoje?', 'Senta, pede, dança. Nessa ordem ou não.', 'Aqui ninguém pergunta de onde você veio. Só o que vai beber.'],
  temas: [['O que é a Cyber Night?', 'Das dez da noite às três da manhã o VOLTA assume a cabine. A pista acende, a casa lota e o Supervisor que se dane.'],
    ['Quem é o DJ VOLTA?', 'Era técnico de som das torres corporativas. Roubou os próprios equipamentos na saída. Melhor demissão da Metrópole.'],
    ['O que tem de bom aqui?', 'O Pulso Azul: energia na veia e um brilho que dura uns minutos. Não pergunta o que vai dentro.']] };

const PubNeon = Object.assign(Object.create(TavernaViva), {
  ZONA: PUB_ID, LIMITE: 14, BARDO: [22, 3], SENTAR_SHOW: 0.3, SENTAR_ENTRAR: 0.25, COMIDA: false,
  TIPOS: PUB_FREGUESES, PEDIDOS: { cerveja: ['Kira, um Pulso Azul!', 'Mais um neon aqui!', 'Um drinque, Kira, o mais forte.', 'Dois copos, por favor!'] },
  PAPO: [
    ['O VOLTA vai tocar a nova hoje?', 'Se tocar, eu não saio da pista até as três.'],
    ['Ouvi que o Supervisor fechou mais um setor.', 'Fecha de dia, a gente abre de noite.'],
    ['Esse neon novo do Silas pisca no ritmo.', 'Tudo aqui pisca no ritmo. Até meu coração.'],
    ['A Nova escondeu a praça das câmeras de novo.', 'Então hoje dá para dançar sem medo.'],
    ['Trabalhei doze horas nos dutos.', 'E ainda veio dançar? Respeito.'],
    ['Viu o holograma girando? Dizem que é um mapa.', 'Mapa de quê?', ],
  ],
  RUMORES: ['Embaixo do Distrito Industrial tem uma linha de montagem que ninguém desligou. Os drones saem sozinhos.',
    'Quem dança até o fim da Cyber Night ganha um copo de graça. A Kira jura que não, mas eu já ganhei.',
    'O Cofre Ômega abriu por um segundo ontem. O VOLTA diz que ouviu o grave lá de baixo.',
    'Tem uma arcologia verde lá em cima, com árvore de verdade. Ninguém que eu conheço viu.'],
  VIVAS: ['Solta o grave, VOLTA!', 'Uhuuu!', 'Essa é a minha!', 'Mais alto!', 'Cyber Night!'], VIVAS_DANCA: true, PAPEL: 'Freguês do Pulso Neon',
  OLA: ['Chegou na hora certa. Ou na errada, depende do quanto você dança.', 'Pede um Pulso Azul. Confia.', 'O grave daqui faz o peito tremer. É de propósito.'],
  SHOW: ['O que é a Cyber Night?', 'Das dez às três, o DJ VOLTA na cabine e a pista acesa. Fora disso, é só um bar bonito.'],
  ativos: [], reservas: new Map(), _prox: 0, _reg: false,
  dj: null, porta: null, batida: 0, _uid: 0,
  // ------------------------------------------------------------ corpos (fregueses, o DJ e a Kira)
  registrar() {
    if (this._reg || typeof NPC3D === 'undefined') return;
    this._reg = true;
    const U = TAVERNA_UTENSILIOS;
    const mesaCopo = Object.assign({}, U.mesaCaneca, { id: 'copo_neon' });
    for (const F of this.TIPOS) {
      NPC3D[F.id] = { ap: F.ap, roupa: F.roupa, props: [
        Object.assign({}, U.maoCopo, { se: (c) => c.temCaneca && (c.npcAcao === 'beber' || c.state === 'npc_falar' || c.state === 'npc_sentar' && c.semMesa) }),
        Object.assign({}, mesaCopo, { se: (c) => c.temCaneca && c.state === 'npc_sentar' && c.npcAcao !== 'beber' && !c.semMesa }),
      ] };
    }
    for (const id in PUB_EQUIPE) NPC3D[id] = { ap: PUB_EQUIPE[id].ap, roupa: PUB_EQUIPE[id].roupa };
  },
  // ------------------------------------------------------------ lugares
  assentos(R) {
    if (R._assentos) return R._assentos;
    const I = BAIRRO_INTERIORES[PUB_ID], S = [], u = (fx, fy) => ({ x: R.w * fx, y: R.h * fy });
    // banquetas do balcão (viradas para o balcão) e das mesas altas (viradas para a mesa)
    for (const fx of [0.16, 0.22, 0.28, 0.34]) S.push(Object.assign(u(fx, 0.18), { giro: -Math.PI / 2, assento: 26 }));
    for (const [mx, my] of I.MESAS) for (const a of [-2.3, 0.2, 2.4]) { const q = u(mx + Math.cos(a) * I.ROD, my + Math.sin(a) * I.ROD); S.push(Object.assign(q, { giro: Math.atan2(R.h * my - q.y, R.w * mx - q.x), assento: 26 })); }
    // os sofás (sem mesa: o copo fica na mão)
    for (const fy of [0.56, 0.7]) for (const k of [-1, 0, 1]) S.push(Object.assign(u(0.035, fy + k * 0.034), { x: R.w * 0.035 + 2, giro: 0, assento: 15.6, semMesa: true }));
    S.forEach((s, i) => { s.i = i; s.tipo = 'assento'; });
    return (R._assentos = S);
  },
  dePe(R) {
    if (R._dePe) return R._dePe;
    const L = [], add = (fx, fy, giro, tipo) => { const x = R.w * fx, y = R.h * fy; if (R.canStand(x, y, 12)) L.push({ x, y, giro, tipo }); };
    // na pista, virados para o DJ (a cabine fica à direita); no balcão, em pé
    for (const fx of [0.53, 0.6, 0.67]) for (const fy of [0.29, 0.36, 0.43]) add(fx + (fy - 0.36) * 0.15, fy, Math.atan2(0.36 - fy, 0.87 - fx) + rand(-0.3, 0.3), 'palco');
    for (const [fx, fy] of [[0.41, 0.2], [0.44, 0.25], [0.1, 0.2], [0.4, 0.52], [0.46, 0.58]]) add(fx, fy, Math.atan2(0.15 - fy, 0.25 - fx), 'balcao');
    L.forEach((s, i) => { s.i = 100 + i; });
    return (R._dePe = L);
  },
  // ------------------------------------------------------------ horas
  bardo(h = WorldTime.hora()) { return h >= this.BARDO[0] || h < this.BARDO[1]; },   // a Cyber Night (passa da meia-noite)
  cyberNight(h) { return this.bardo(h); },
  alvo(R, h = WorldTime.hora()) {
    const cap = Math.min(this.LIMITE, this.assentos(R).length + this.dePe(R).length);
    const k = this.bardo(h) ? Math.min(1, 0.6 + ((h - 22 + 24) % 24) * 0.25) : h >= 18 ? 0.4 : h >= 3 && h < 5 ? 0.25 : h >= 12 ? 0.15 : 0.05;
    return Math.round(cap * k);
  },
  // na pista, no show: quase todos dançam no BPM (às vezes as mãos para o alto, em palmas)
  plateia(f) {
    f.ritmo = PUB_BPM / 120 * (f.danca === 1 ? 1 : 0.5) * (1 + (f.uid % 3 - 1) * 0.01);
    const c = (f.animTime * 0.07 + f.fase0) % 1;
    return c < 0.12 ? 'clap' : 'dance';
  },
  // ------------------------------------------------------------ zona
  aoCarregar(z) {
    this.ativos.length = 0; this.reservas.clear(); this.dj = null; this.porta = null;
    if (z && z.id === 'metro_mercado') { this.colocarPorta(); return; }
    if (!z || z.id !== PUB_ID) { Batida.parar(); return; }
    if (typeof NpcModelo === 'undefined' || !NpcModelo.ok()) return;
    this.registrar();
    const R = game.room, n = this.alvo(R);
    for (let i = 0; i < n; i++) { const f = this.criar(R, false); if (!f) break; }
    if (this.bardo()) this.chamarDJ(true);
    this._prox = rand(3, 6);
  },
  // A porta do Bar Neon: no lado da estrutura voltado para o meio da praça
  colocarPorta() {
    const A = typeof Estruturas !== 'undefined' && Estruturas.atual && Estruturas.atual(), R = game.room;
    const L = A && A.room === R && A.lug.find((q) => q.id === 'neon_cyberpunk_bar');
    let x = R.w * 0.22, y = R.h * 0.3;
    if (L) {
      const I = Estruturas.IDX[L.id], r = Math.max(I.w, I.d) * L.esc * 0.5 + 26, a = Math.atan2(R.h * 0.5 - L.y, R.w * 0.5 - L.x);
      x = L.x + Math.cos(a) * r; y = L.y + Math.sin(a) * r;
      for (let k = 0; k < 12 && !R.canStand(x, y, 14); k++) { x += Math.cos(a) * 12; y += Math.sin(a) * 12; }
    }
    // ainda em cima de algo (pilar, quiosque): o lugar livre mais perto, em anéis
    if (!R.canStand(x, y, 14)) {
      const x0 = x, y0 = y;
      busca: for (let d = 20; d <= 260; d += 20) for (let j = 0; j < 16; j++) { const b = j * Math.PI / 8, nx = x0 + Math.cos(b) * d, ny = y0 + Math.sin(b) * d; if (R.canStand(nx, ny, 14)) { x = nx; y = ny; break busca; } }
    }
    this.porta = new PortaPub(x, y);
    game.npcs.push(this.porta);
    BAIRRO_INTERIORES[PUB_ID].saida.chegada = [x / R.w, Math.min(0.95, (y + 40) / R.h)];
  },
  // O DJ: chega pela porta (ou já está na cabine, entrando no meio da noite) e mixa até as três
  chamarDJ(jaLa) {
    if (this.dj || typeof NPC3D === 'undefined') return;
    const R = game.room, alvo = { x: R.w * 0.925, y: R.h * 0.36 };
    const d = new DJNeon(jaLa ? alvo.x : R.w * 0.5, jaLa ? alvo.y : R.h - 70, alvo, this);
    if (!d.key) return;
    game.npcs.push(d); this.dj = d;
  },
  update(dt) {
    const aqui = this.aqui();
    if (aqui || (Batida.tocando && !aqui)) Batida.passo(dt, aqui ? this : null);
    if (!aqui) return;
    TavernaViva.update.call(this, dt);
    const show = this.bardo();
    if (show && !this.dj) this.chamarDJ(false);
    if (!show && this.dj && this.dj.fase !== 'saindo') this.dj.ir('saindo');
    if (this.dj && this.dj.sumiu) { game.npcs.splice(game.npcs.indexOf(this.dj), 1); this.dj = null; }
    this.batida = Batida.batida;
  },
  // O DJ está tocando (na cabine, na Cyber Night)
  tocando() { return !!(this.dj && this.dj.fase === 'mixando'); },
  // A música da região abaixa dentro do pub (js/audio.js)
  abafar() { return this.aqui() ? (this.tocando() ? 0.12 : 0.45) : 1; },
  // ------------------------------------------------------------ luzes (vista isométrica e 3ª pessoa)
  // a pista e o palco pulsam na batida; fora da Cyber Night, a luz baixa e lenta
  luzes(L) {
    if (!this.aqui()) return;
    const R = game.room, b = Batida.pulso(), on = this.tocando();
    const P = { x: R.w * 0.6, y: R.h * 0.36 };
    L.add(isoX(P.x, P.y), isoY(P.x, P.y), on ? 230 + 70 * b : 170, on ? 0.55 + 0.4 * b : 0.35);
    L.add(isoX(R.w * 0.88, R.h * 0.36), isoY(R.w * 0.88, R.h * 0.36) - 60, on ? 180 + 40 * b : 90, on ? 0.6 : 0.2);
    L.add(isoX(R.w * 0.25, R.h * 0.1), isoY(R.w * 0.25, R.h * 0.1) - 50, 220, 0.55);
  },
  // 3ª pessoa: [x, y, z, raio, r, g, b, força] (a mesma lista das luzes dos poderes, js/terceira.js)
  luzes3P(lista) {
    if (!this.aqui()) return lista;
    const R = game.room, b = Batida.pulso(), on = this.tocando(), t = game.realTime || 0;
    const cor = on ? [[1, 0.2, 0.8], [0.2, 0.9, 1], [1, 0.6, 0.15]][Math.floor(Batida.batida / 4) % 3] : [0.6, 0.3, 0.9];
    lista.push([R.w * 0.6 + Math.cos(t * 0.8) * 30, R.h * 0.36 + Math.sin(t * 0.8) * 30, 90, 260, cor[0], cor[1], cor[2], on ? 1.4 + 1.6 * b : 0.8]);
    lista.push([R.w * 0.25, R.h * 0.12, 70, 240, 1, 0.35, 0.85, 1.1]);
    return lista;
  },
  // ------------------------------------------------------------ a bartender
  servico(npc, s, o, volta) {
    if (s !== 'bar_neon') return false;
    const preco = this.precoDrinque();
    o.push({ id: 'drinque', tag: '◆', txt: `Pedir um Pulso Azul (${preco} células: energia cheia e o brilho neon por 3 minutos)`, fn: () => volta(this.drinque()) });
    return true;
  },
  precoDrinque() { return 22 + Math.floor(game.activeProgress().level / 4) * 2; },
  drinque() {
    const p = game.player;
    if (p.fury >= p.maxEnergy && (p.buffs.neon || 0) > 120) return 'Mais um? Você ainda está brilhando do último.';
    const err = Oficios.cobrar(this.precoDrinque());
    if (err) return `${err} Aqui não tem fiado, querido.`;
    p.fury = Math.max(p.fury, p.maxEnergy); p.buffs.neon = 180;
    game.particles.ring(p.x, p.y, 40, '90,230,255', 0.5, 4);
    game.audio.play('health');
    return 'Um Pulso Azul, saindo. Bebe devagar: o brilho sobe rápido.';
  },
  estado() {
    const E = TavernaViva.estado.call(this);
    return Object.assign(E, { cyberNight: this.bardo(), dj: this.dj ? this.dj.fase : null, tocando: this.tocando(), musica: Batida.modo, bpm: Batida.bpm(), porta: !!this.porta });
  },
});

// A porta do Bar Neon no Mercado Neon: [E] Entrar
class PortaPub extends NPC {
  constructor(x, y) {
    super({ model: null, name: '', lines: ['…'] }, x, y);
    this.key = null; this.height = 80; this.t = rand(0, 10);
    this.name = 'PULSO NEON'; this.papel = 'Bar · Cyber Night 22h–03h'; this.verb = 'Entrar';
    this.lightRgb = '255,80,220';
  }
  canTalk() { return true; }
  talk() { this.talkT = 1; World.go(PUB_ID, null, null, [0.5, 0.86]); }
  update(dt) { this.t += dt; if (this.talkT > 0) this.talkT -= dt; }
  headPoint() { return { x: isoX(this.x, this.y), y: isoY(this.x, this.y) - this.height }; }
  drawShadow() {}
  draw() {}
  // o letreiro aceso sobre a porta (pisca de leve; na Cyber Night, no ritmo)
  drawEmissive(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y) - this.height, h = WorldTime.hora(), noite = PubNeon.bardo(h);
    const a = 0.75 + 0.25 * (noite ? Math.max(0, Math.sin(this.t * PUB_BPM / 60 * Math.PI)) : Math.sin(this.t * 1.7) * 0.4);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, '255,80,220', sx, sy, 70, 0.25 * a);
    ctx.font = `bold 15px ${FONT_UI}`; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,90,225,${a})`; ctx.fillText('PULSO NEON', sx, sy);
    ctx.font = `10px ${FONT_UI}`; ctx.fillStyle = `rgba(110,235,255,${0.85 * a})`; ctx.fillText(noite ? 'CYBER NIGHT · AGORA' : 'CYBER NIGHT · 22H', sx, sy + 13);
    ctx.restore();
  }
}

// O DJ VOLTA: entra, vai para trás da cabine, mixa e sai às três
class DJNeon extends Fregues {
  constructor(x, y, alvo, casa) {
    super({ id: 'pub_dj', nome: 'DJ VOLTA' }, x, y, casa);
    this.P.papel = 'DJ da Cyber Night';
    this.P.ola = ['Segura essa, que o grave vem aí.', 'Pede música? Pede. Eu toco o que eu quiser.', 'A pista é sua. O som é meu.'];
    this.P.temas = [['O que você está tocando?', `Pulso ${PUB_BPM}. Eu monto ao vivo: bumbo, baixo, um arpejo roubado de uma torre corporativa.`],
      ['Até que horas vai?', 'Até as três. Depois a cabine apaga e eu durmo até o meio-dia.']];
    this.alvoDJ = alvo; this.ritmo = PUB_BPM;
    this.fase = x === alvo.x && y === alvo.y ? 'mixando' : 'chegando';
    this.facing = Math.PI;
  }
  update(dt) {
    this.animTime += dt; this.stateTime += dt; this.timer += dt;
    if (this.talkT > 0) this.talkT -= dt;
    if (this.bolha) this.bolha.t -= dt;
    this.verso = null; this.assento = 0;
    if (this.fase === 'chegando') { this.setState('walk'); if (this.andar(dt, this.alvoDJ)) { this.fase = 'mixando'; this.falar('Boa noite, Metrópole! Cyber Night!', 3); } return; }
    if (this.fase === 'saindo') { this.setState('walk'); if (this.andar(dt, { x: game.room.w * 0.5, y: game.room.h - 40 }, 70)) this.sumiu = true; return; }
    this.x = this.alvoDJ.x; this.y = this.alvoDJ.y;
    this.facing = angleLerp(this.facing, Math.PI, 0.15);
    this.ritmo = Batida.bpm();
    this.setState(this.talkT > 0 ? 'talk' : 'dj');
    if (Math.random() < dt / 25) this.falar(pick(['Mãos para o alto!', 'Mais grave? Mais grave.', 'Essa é nova!', 'Metrópole, cadê vocês?']), 2.4);
  }
  ir(f) { this.fase = f; this.timer = 0; }
}

// ---------------------------------------------------------------------------
// A música do pub, tocada aqui (Web Audio): Cyber Night (124 BPM: bumbo, chimbal, palmas, baixo e
// arpejo) ou lounge (90 BPM: pad e baixo macio). O volume e o lado (estéreo) seguem a distância e a
// posição da cabine do DJ na tela; as notas são agendadas um pouco à frente (sem engasgo).
// ---------------------------------------------------------------------------
const Batida = {
  modo: null, tocando: false, batida: 0, _prox: 0, _passo: 0, saida: null, pan: null, t0: 0,
  bpm() { return this.modo === 'noite' ? PUB_BPM : 90; },
  // 0–1, forte na cabeça de cada tempo (as luzes da pista)
  pulso() {
    const A = typeof game !== 'undefined' && game.audio && game.audio.ctx;
    const t = A ? A.currentTime : (game.realTime || 0), b = (t - this.t0) * this.bpm() / 60;
    return Math.pow(1 - (b - Math.floor(b)), 3);
  },
  parar() {
    if (this.saida) { try { this.saida.gain.setTargetAtTime(0, this.saida.context.currentTime, 0.15); } catch (e) { /* nada */ } }
    this.tocando = false; this.modo = null;
  },
  ligar(A) {
    const c = A.ctx;
    if (!this.saida) {
      this.saida = c.createGain(); this.saida.gain.value = 0;
      this.pan = c.createStereoPanner ? c.createStereoPanner() : null;
      if (this.pan) { this.saida.connect(this.pan); this.pan.connect(A.master); } else this.saida.connect(A.master);
    }
    this._prox = c.currentTime + 0.1; this._passo = 0; this.t0 = this._prox; this.tocando = true;
  },
  passo(dt, casa) {
    const A = game.audio;
    if (!A || !A.ctx || A.muted) return;
    if (!casa) { this.parar(); return; }
    const modo = casa.tocando() ? 'noite' : 'lounge';
    if (!this.tocando || modo !== this.modo) { this.modo = modo; this.ligar(A); }
    const c = A.ctx, R = game.room, p = game.player;
    // volume e lado pela cabine
    const cx = R.w * 0.88, cy = R.h * 0.36, d = dist(p.x, p.y, cx, cy);
    const vol = (A.musicVol === undefined ? 0.6 : A.musicVol) * (modo === 'noite' ? 0.55 : 0.32) * clamp(1.15 - d / 900, 0.35, 1);
    this.saida.gain.setTargetAtTime(vol, c.currentTime, 0.25);
    if (this.pan) this.pan.pan.setTargetAtTime(clamp((isoX(cx, cy) - isoX(p.x, p.y)) / 600, -0.7, 0.7), c.currentTime, 0.3);
    const s16 = 60 / this.bpm() / 4;
    while (this._prox < c.currentTime + 0.25) { this.nota(c, this._prox, this._passo, modo); this._prox += s16; this._passo++; }
    this.batida = Math.floor(this._passo / 4);
  },
  // um dezesseis avos do compasso
  nota(c, t, k, modo) {
    const i = k % 16, comp = Math.floor(k / 16) % 8, out = this.saida;
    const tom = (f, d, v, tipo = 'sawtooth', corte = 1800) => {
      const o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
      o.type = tipo; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = corte;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(fl); fl.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05);
    };
    const ruido = (d, v, f) => {
      const A = game.audio; if (!A.noiseBuf) return;
      const s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
      s.buffer = A.noiseBuf; fl.type = 'highpass'; fl.frequency.value = f;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + d + 0.05);
    };
    // progressão: lá menor, fá, dó, sol (um acorde a cada dois compassos)
    const raiz = [55, 43.65, 65.41, 49][Math.floor(comp / 2) % 4];
    if (modo === 'noite') {
      if (i % 4 === 0) {   // bumbo
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.35);
      }
      if (i % 4 === 2) ruido(0.06, 0.28, 7000);   // chimbal aberto no contratempo
      else if (i % 2 === 1) ruido(0.025, 0.1, 9000);
      if (i === 4 || i === 12) ruido(0.12, 0.3, 1500);   // palma
      if (i % 4 === 2 || i === 15) tom(raiz * 2, 0.16, 0.3, 'sawtooth', 600);   // baixo no contratempo
      if (comp % 4 >= 2 || comp >= 4) { const arp = [1, 1.5, 2, 2.4, 3, 2.4, 2, 1.5][i % 8]; tom(raiz * 4 * arp, 0.12, 0.07, 'square', 2400); }   // arpejo
    } else {
      if (i === 0) { for (const m of [2, 2.4, 3]) tom(raiz * 2 * m, 60 / 90 * 4, 0.04, 'triangle', 900); }   // pad
      if (i === 0 || i === 10) tom(raiz, 0.5, 0.18, 'sine', 400);
      if (i % 4 === 2) ruido(0.03, 0.04, 8000);
    }
  },
};
// A Kira no balcão (moradora fixa do pub, com o corpo da criação)
if (typeof NPC3D !== 'undefined') NPC3D.pub_kira = { ap: PUB_EQUIPE.pub_kira.ap, roupa: PUB_EQUIPE.pub_kira.roupa };
if (!WORLD_POVO.includes(PUB_KIRA)) WORLD_POVO.push(PUB_KIRA);
WORLD_ZONES[PUB_ID].npcs.push({ model: PUB_KIRA.model, variant: PUB_KIRA.variant, name: PUB_KIRA.nome, at: PUB_KIRA.at, facing: PUB_KIRA.facing, lines: PUB_KIRA.ola, persona: PUB_KIRA });
if (typeof window !== 'undefined') { window.PubNeon = PubNeon; window.Batida = Batida; }
