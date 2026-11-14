'use strict';
// ECLIPSE ZERO · Taverna viva: fregueses que entram, procuram mesa, pedem, bebem, comem, conversam, assistem
// ao Bardo e vão embora (TavernaViva)
// ---------------------------------------------------------------------------
// A taverna (BAIRRO_INTERIORES.aurora_taverna) deixa de ter só os moradores da rotina: a cidade manda
// FREGUESES conforme a hora e os eventos. Cada freguês é um morador de corpo inteiro (o esqueleto do
// Kael com as peças da criação, js/mundo/npc3d.js) e decide o que fazer:
//   entrar → procurar um assento vazio (RESERVA: duas pessoas nunca escolhem o mesmo) → sentar →
//   pedir ("Bento, uma cerveja!") → esperar → a caneca chega à mesa → pegar, levar à boca, beber,
//   devolver à mesa (a caneca vai NA MÃO enquanto bebe e fica NA MESA entre um gole e outro) →
//   às vezes pedir sopa (o prato aparece na mesa e esvazia enquanto come; depois é recolhido) →
//   conversar com quem está perto (balões) → levantar, trocar de mesa ou ir embora.
// Sem assento livre, fica DE PÉ no balcão ou perto do palco (lugares também reservados).
// HORÁRIO DO BARDO (20h–23h): o Cosme sobe ao palco (a cantoria de js/mundo/rotina.js) e a lotação sobe aos
// poucos até o máximo (assentos + lugares de pé, nunca mais que o limite); quem está de pé perto do palco
// bate palmas ou dança (quatro estilos, cada um no seu ritmo e na sua fase); quando termina, a casa
// esvazia devagar e alguns ficam bebendo.
// LOTAÇÃO por hora: manhã quase vazia, tarde alguns, noite cheia, madrugada os últimos.
// Desempenho: no máximo LIMITE fregueses ativos; só existem com o herói na taverna (ao entrar, a casa já
// está na lotação da hora, com as pessoas sentadas); os corpos são de 8 tipos (modelos compartilhados).
// ---------------------------------------------------------------------------
const TAVERNA_FREGUESES = [
  { id: 'freg_a', nome: 'Ivo', ap: { corpoG: 0, rostoG: 1, cabeloG: 3, barbaG: 4, pele: 2, corCabelo: 1, corBarba: 1, olhos: 0, porte: 2, altura: 2 }, roupa: { peitoral: 'ini_peitoral', calcas: 'ini_calca', botas: 'ini_botas' } },
  { id: 'freg_b', nome: 'Lia', ap: { corpoG: 1, rostoG: 2, cabeloG: 12, barbaG: 0, pele: 3, corCabelo: 3, olhos: 2, porte: 1, altura: 1 }, roupa: { peitoral: 'ini_peitoral', calcas: 'n30_mago_calcas', botas: 'ini_botas' } },
  { id: 'freg_c', nome: 'Otávio', ap: { corpoG: 0, rostoG: 5, cabeloG: 7, barbaG: 7, pele: 4, corCabelo: 0, corBarba: 0, olhos: 1, porte: 3, altura: 3 }, roupa: { peitoral: 'n30_guerreiro_peitoral', calcas: 'ini_calca', botas: 'ini_botas' } },
  { id: 'freg_d', nome: 'Sálvia', ap: { corpoG: 1, rostoG: 6, cabeloG: 16, barbaG: 0, pele: 1, corCabelo: 5, olhos: 4, porte: 1, altura: 2 }, roupa: { peitoral: 'n50_mago_peitoral', calcas: 'n30_mago_calcas', botas: 'ini_botas' } },
  { id: 'freg_e', nome: 'Bruno', ap: { corpoG: 0, rostoG: 3, cabeloG: 1, barbaG: 2, pele: 5, corCabelo: 2, corBarba: 2, olhos: 3, porte: 1, altura: 1 }, roupa: { peitoral: 'ini_peitoral', calcas: 'ini_calca', botas: 'ini_botas' } },
  { id: 'freg_f', nome: 'Nara', ap: { corpoG: 1, rostoG: 0, cabeloG: 10, barbaG: 0, pele: 2, corCabelo: 1, olhos: 5, porte: 2, altura: 2 }, roupa: { peitoral: 'ini_peitoral', calcas: 'ini_calca', botas: 'ini_botas' } },
  { id: 'freg_g', nome: 'Caio', ap: { corpoG: 0, rostoG: 7, cabeloG: 5, barbaG: 0, pele: 0, corCabelo: 4, olhos: 2, porte: 1, altura: 2 }, roupa: { peitoral: 'n30_guerreiro_peitoral', calcas: 'n30_guerreiro_calcas', botas: 'n30_guerreiro_botas' } },
  { id: 'freg_h', nome: 'Dora', ap: { corpoG: 1, rostoG: 4, cabeloG: 14, barbaG: 0, pele: 4, corCabelo: 0, olhos: 6, porte: 3, altura: 1 }, roupa: { peitoral: 'ini_peitoral', calcas: 'n30_mago_calcas', botas: 'ini_botas' } },
];
// Utensílios presos ao corpo (GLB da taverna, tools/blender/asset_utensilios_taverna.py → WEAPON3D):
// a caneca na mão direita enquanto bebe; na mesa (à frente do quadril sentado) entre os goles; o prato na mesa
const TAVERNA_UTENSILIOS = {
  maoCaneca: { id: 'caneca_cerveja', no: 'handR', g: [-3, 0, -1.8], d: [1, 0, 0], y: [0, 1, 0], e: 1 },   // (o x da mão aponta para cima no gole: medido)
  mesaCaneca: { id: 'caneca_cerveja', no: 'hips', g: [17, 5.5, 8.4], d: [0, 0, 1], y: [1, 0, 0], e: 1 },
  pratoCheio: { id: 'prato_sopa', no: 'hips', g: [18, -1.5, 8.4], d: [1, 0, 0], y: [0, 0, 1], e: 1 },
  pratoVazio: { id: 'prato_vazio', no: 'hips', g: [18, -1.5, 8.4], d: [1, 0, 0], y: [0, 0, 1], e: 1 },
  maoCopo: { id: 'copo_neon', no: 'handR', g: [-3.6, 0, -1.8], d: [1, 0, 0], y: [0, 1, 0], e: 1 },
};
const TAVERNA_PEDIDOS = { cerveja: ['Bento, uma cerveja!', 'Mais uma caneca aqui!', 'Uma da escura, Bento.', 'Cerveja, por favor!'], sopa: ['E uma sopa quente!', 'Tem sopa hoje?', 'Um prato da sopa do dia!'] };
const TAVERNA_PAPO = [
  ['Ouviu falar do Eclipse? Dizem que o céu ficou vermelho de novo em Carmesin.', 'Meu primo jura que viu. Eu só vejo o fundo da caneca.'],
  ['A guarda dobrou a ronda na muralha.', 'Lobos, aposto. Ou coisa pior que lobo.'],
  ['Esse Cosme canta cada vez melhor.', 'É a cerveja que melhora o ouvido.'],
  ['Dizem que o NEXUS escuta até o que a gente pensa.', 'Então ele já sabe que eu quero outra rodada.'],
  ['Tem gente voltando das ruínas com relíquia brilhando.', 'E tem gente que não volta. Eu fico aqui.'],
  ['A sopa do Bento hoje está de chorar.', 'De alegria ou de pimenta?'],
];
const TAVERNA_RUMORES = [
  'Um viajante disse que embaixo do Mercado Afundado tem uma porta que só abre no eclipse.',
  'Os mortos da Cidade Morta andam em grupo à noite. Quem sai sozinho não volta.',
  'Falam de um cofre nas Ruínas Engolidas, atrás das raízes. Só os corajosos acham.',
  'O Guardião do Mundo abençoa quem ajuda a cidade. Já vi gente lutando com o dobro da força.',
];
const TavernaViva = {
  ZONA: 'aurora_taverna', LIMITE: 14, BARDO: [20, 23],
  ativos: [], reservas: new Map(), _t: 0, _prox: 0, _reg: false,
  // ------------------------------------------------------------ registro dos corpos (npc3d.js)
  registrar() {
    if (this._reg || typeof NPC3D === 'undefined') return;
    this._reg = true;
    const U = TAVERNA_UTENSILIOS;
    for (const F of TAVERNA_FREGUESES) {
      NPC3D[F.id] = { ap: F.ap, roupa: F.roupa, props: [
        Object.assign({}, U.maoCaneca, { se: (c) => c.temCaneca && (c.npcAcao === 'beber' || c.state === 'npc_falar' || c.state === 'npc_palmas' && false) }),
        Object.assign({}, U.mesaCaneca, { se: (c) => c.temCaneca && c.state === 'npc_sentar' && c.npcAcao !== 'beber' }),
        Object.assign({}, U.pratoCheio, { se: (c) => c.temPrato && c.state === 'npc_sentar' && (c.refeicaoK || 0) > 0.3 }),
        Object.assign({}, U.pratoVazio, { se: (c) => c.temPrato && c.state === 'npc_sentar' && (c.refeicaoK || 0) <= 0.3 }),
      ] };
    }
  },
  // ------------------------------------------------------------ lugares da sala
  assentos(R) {
    if (R._assentos) return R._assentos;
    const I = typeof BAIRRO_INTERIORES !== 'undefined' && BAIRRO_INTERIORES[this.ZONA], S = [];
    if (I) for (const [id, fx, fy, giro] of I.moveis) {
      const x = R.w * fx, y = R.h * fy;
      if (id === 'cadeira') S.push({ x: x + 0.5, y: y + 0.5, giro, assento: 16.7 });
      else if (id === 'banco') { const px = Math.cos(giro + Math.PI / 2), py = Math.sin(giro + Math.PI / 2), o = R.w * 0.02; for (const k of [-1, 1]) S.push({ x: x + px * o * k + 0.5, y: y + py * o * k + 0.5, giro, assento: 16.3 }); }
    }
    S.forEach((s, i) => { s.i = i; s.tipo = 'assento'; });
    return (R._assentos = S);
  },
  dePe(R) {
    if (R._dePe) return R._dePe;
    const L = [], add = (fx, fy, giro, tipo) => { const x = R.w * fx, y = R.h * fy; if (R.canStand(x, y, 14)) L.push({ x, y, giro, tipo }); };
    for (const fy of [0.3, 0.37, 0.44]) add(0.235, fy, Math.PI, 'balcao');   // no balcão, virados para o Bento
    for (const [fx, fy] of [[0.5, 0.3], [0.56, 0.33], [0.62, 0.34], [0.68, 0.32], [0.53, 0.38], [0.6, 0.4], [0.67, 0.39], [0.73, 0.28]]) add(fx, fy, Math.atan2(0.2 - fy, 0.6 - fx), 'palco');   // de frente para o Bardo
    L.forEach((s, i) => { s.i = 100 + i; });
    return (R._dePe = L);
  },
  // ninguém (morador da rotina, freguês, herói) já está nesse lugar
  livre(R, s) {
    if (this.reservas.has(s.i)) return false;
    for (const n of game.npcs) if (n instanceof Morador && !(n instanceof Fregues) && dist2(n.x, n.y, s.x, s.y) < 14 * 14) return false;
    return true;
  },
  reservar(s, f) { this.reservas.set(s.i, f); },
  soltar(f) { for (const [k, v] of this.reservas) if (v === f) this.reservas.delete(k); },
  // ------------------------------------------------------------ lotação
  bardo(h = WorldTime.hora()) { return h >= this.BARDO[0] && h < this.BARDO[1]; },
  alvo(R, h = WorldTime.hora()) {
    const cap = Math.min(this.LIMITE, this.assentos(R).length + this.dePe(R).length);
    // depois do Bardo a casa esvazia devagar (a meia hora seguinte ainda cheia)
    const k = this.bardo(h) ? Math.min(1, 0.55 + (h - this.BARDO[0]) * 0.3) : h >= 23 && h < 23.5 ? 0.6 : h >= 17 && h < 20 ? 0.45 : h >= 11 && h < 17 ? 0.25 : h >= 23.5 || h < 2 ? 0.3 : h >= 6 && h < 11 ? 0.1 : 0.04;
    return Math.round(cap * k);
  },
  aqui() { return !!(game.world && World.zone && World.zone.id === this.ZONA && game.room); },
  // ------------------------------------------------------------ zona
  aoCarregar(z) {
    this.ativos.length = 0; this.reservas.clear();
    if (!z || z.id !== this.ZONA || typeof NpcModelo === 'undefined' || !NpcModelo.ok()) return;
    this.registrar();
    const R = game.room, n = this.alvo(R);
    // ao entrar, a casa já está na lotação da hora: gente sentada no meio do que estava fazendo
    for (let i = 0; i < n; i++) { const f = this.criar(R, false); if (!f) break; }
    this._prox = rand(3, 6);
  },
  criar(R, pelaPorta) {
    const usados = new Set(this.ativos.map((f) => f.T.id)), tipos = TAVERNA_FREGUESES.filter((F) => !usados.has(F.id) || this.ativos.length >= TAVERNA_FREGUESES.length);
    const T = pick(tipos.length ? tipos : TAVERNA_FREGUESES);
    const porta = { x: R.w * 0.5, y: R.h - 70 };
    const f = new Fregues(T, porta.x, porta.y);
    f.uid = (this._uid = (this._uid || 0) + 1);
    if (!f.key) return null;   // sem as peças da criação: não cria
    if (!pelaPorta) {
      const s = this.escolher(R, f, Math.random() < 0.8);
      if (!s) return null;
      f.x = s.x; f.y = s.y; f.lugar = s; f.facing = s.giro; f.fase = s.tipo === 'assento' ? 'sentado' : 'de_pe';
      if (s.tipo === 'assento') { f.temCaneca = Math.random() < 0.7; f.temPrato = !f.temCaneca && Math.random() < 0.5; f.refeicaoK = rand(0.3, 1); f.timer = rand(4, 20); }
    } else f.fase = 'entrar';
    game.npcs.push(f); this.ativos.push(f);
    return f;
  },
  // um lugar livre: assento (de preferência) ou de pé (no Horário do Bardo, perto do palco)
  escolher(R, f, querSentar = true) {
    const A = this.assentos(R).filter((s) => this.livre(R, s)), P = this.dePe(R).filter((s) => this.livre(R, s));
    let L = querSentar && A.length ? A : P.length ? (this.bardo() ? P.filter((s) => s.tipo === 'palco').concat(P) : P) : A;
    if (!L.length) return null;
    const s = this.bardo() && !querSentar ? L[0] : pick(L);
    this.reservar(s, f);
    return s;
  },
  // ------------------------------------------------------------ quadro
  update(dt) {
    if (!this.aqui()) { if (this.ativos.length) { this.ativos.length = 0; this.reservas.clear(); } return; }
    const R = game.room, alvo = this.alvo(R);
    // a cidade manda mais gente (um de cada vez, pela porta) ou alguns vão embora
    this._prox -= dt;
    const vivos = this.ativos.filter((f) => f.fase !== 'saindo');
    if (this._prox <= 0) {
      this._prox = this.bardo() ? rand(2.5, 5) : rand(6, 14);
      if (vivos.length < alvo && this.ativos.length < this.LIMITE) this.criar(R, true);
      else if (vivos.length > alvo) { const f = pick(vivos.filter((q) => q.fase === 'sentado' || q.fase === 'de_pe')); if (f) f.ir('saindo'); }
    }
    for (let i = this.ativos.length - 1; i >= 0; i--) if (this.ativos[i].sumiu) { const f = this.ativos[i]; this.soltar(f); game.npcs.splice(game.npcs.indexOf(f), 1); this.ativos.splice(i, 1); }
  },
  estado() {
    const c = {};
    for (const f of this.ativos) c[f.fase] = (c[f.fase] || 0) + 1;
    return { aqui: this.aqui(), fregueses: this.ativos.length, alvo: this.aqui() ? this.alvo(game.room) : 0, bardo: this.bardo(), fases: c, reservas: this.reservas.size,
      bebendo: this.ativos.filter((f) => f.state === 'drink').length, comendo: this.ativos.filter((f) => f.state === 'eat').length, dancando: this.ativos.filter((f) => f.state === 'dance').length, palmas: this.ativos.filter((f) => f.state === 'clap').length };
  },
};

// O freguês: um morador de corpo inteiro com as decisões da taverna
class Fregues extends Morador {
  constructor(T, x, y) {
    const P = { id: T.id, nome: T.nome.toUpperCase(), papel: 'Freguês da taverna',
      ola: ['Hm? Senta aí, a casa é de todos.', 'Se veio pela música, chegou cedo.', 'Paga uma rodada e eu te conto uma coisa.'],
      temas: [['O que se fala por aqui?', pick(TAVERNA_RUMORES)], ['Quem é o bardo?', 'O Cosme. Canta do Javali Dourado e das ruínas. Das oito às onze a casa enche.']] };
    super({ model: 'civil', name: P.nome, lines: ['…'], persona: P }, x, y);
    this.T = T; this.fase = 'entrar'; this.timer = 0; this.lugar = null; this.alvoXY = null;
    this.temCaneca = false; this.temPrato = false; this.refeicaoK = 1; this.goles = 0;
    this.danca = Math.floor(Math.random() * 4); this.ritmo = rand(0.88, 1.15); this.fase0 = Math.random() * 6;   // (estilo, ritmo e fase da dança: de cada um)
    this.verb = 'Conversar'; this.radius = 12;
  }
  ir(f) {
    const R = game.room;
    if (f === 'saindo') { TavernaViva.soltar(this); this.lugar = null; this.alvoXY = { x: R.w * 0.5, y: R.h - 40 }; this.temPrato = false; }
    this.fase = f; this.timer = 0;
  }
  falar(txt, d = 2.6) { this.balao(txt, txt, d); }
  // anda até o ponto (desvia de quem está perto; a sala segura nas paredes e nos móveis)
  andar(dt, alvo, vel = 62) {
    const dx = alvo.x - this.x, dy = alvo.y - this.y, d = Math.hypot(dx, dy);
    if (d < 5) return true;
    let vx = dx / d * vel, vy = dy / d * vel;
    for (const o of game.npcs) { if (o === this || o.sumiu) continue; const ex = this.x - o.x, ey = this.y - o.y, e2 = ex * ex + ey * ey; if (e2 < 26 * 26 && e2 > 0.01) { const e = Math.sqrt(e2); vx += ex / e * 40; vy += ey / e * 40; } }
    this.x += vx * dt; this.y += vy * dt;
    game.room.collide(this, false);
    this.facing = angleLerp(this.facing, Math.atan2(vy, vx), 1 - Math.exp(-8 * dt));
    return false;
  }
  update(dt) {
    this.animTime += dt; this.stateTime += dt; this.timer += dt;
    if (this.talkT > 0) this.talkT -= dt;
    if (this.bolha) this.bolha.t -= dt;
    if (this.respT > 0 && (this.respT -= dt) <= 0) this.falar(this.resp, 3.2);
    this.verso = null;
    const R = game.room, TV = TavernaViva;
    this.assento = this.lugar && this.lugar.assento;
    switch (this.fase) {
      case 'entrar': {
        if (!this.lugar) { this.lugar = TV.escolher(R, this, !TV.bardo() || Math.random() < 0.5); if (!this.lugar) { this.ir('saindo'); break; } }
        this.setState('walk');
        if (this.andar(dt, this.lugar)) { this.x = this.lugar.x; this.y = this.lugar.y; this.fase = this.lugar.tipo === 'assento' ? 'sentado' : 'de_pe'; this.timer = 0; if (this.fase === 'sentado') this.pedir(); }
        break;
      }
      case 'sentado': {
        this.facing = angleLerp(this.facing, this.lugar.giro, 0.2);
        // o pedido chega depois de um tempo (a caneca e o prato aparecem na mesa)
        if (this.espera > 0) { this.espera -= dt; if (this.espera <= 0) { if (this.pediu === 'sopa') { this.temPrato = true; this.refeicaoK = 1; } else this.temCaneca = true; if (game.audio) game.audio.play('compra', 0.25); } }
        let st = 'sit';
        if (this.temPrato && this.refeicaoK > 0.02) { st = 'eat'; this.refeicaoK = Math.max(0, this.refeicaoK - dt / 28); if (this.refeicaoK <= 0.02) { this.prtT = 6; } }
        else if (this.temPrato && (this.prtT -= dt) <= 0) this.temPrato = false;   // o prato vazio é recolhido
        else if (this.temCaneca) { const c = (this.animTime + this.fase0) % 12; st = c < 5.5 ? 'drink' : 'sit'; }
        if (this.talkT > 0) st = 'sit';
        this.setState(st);
        // conversa com quem está perto, às vezes
        if (Math.random() < dt / 9) this.papo();
        if (this.timer > (this.limite || (this.limite = rand(40, 90)))) {
          if (Math.random() < 0.25 && !TV.bardo()) { TV.soltar(this); this.lugar = null; this.temCaneca = false; this.temPrato = false; this.limite = 0; this.fase = 'entrar'; this.timer = 0; }   // troca de mesa
          else if (Math.random() < 0.5 && !this.temPrato) { this.pedir(); this.timer = 0; this.limite = rand(30, 70); }
          else this.ir('saindo');
        }
        break;
      }
      case 'de_pe': {
        // de pé: no balcão bebe e conversa; perto do palco, no Horário do Bardo, bate palmas ou dança
        if (this.lugar) this.facing = angleLerp(this.facing, this.lugar.giro, 0.1);
        let st = 'standDrink';
        if (this.lugar && this.lugar.tipo === 'palco' && TV.bardo()) { const c = (this.animTime * 0.11 + this.fase0) % 1; st = c < (this.danca === 0 ? 0.3 : 0.55) ? 'clap' : 'dance'; }
        else if (this.lugar && this.lugar.tipo === 'balcao' && !this.temCaneca && this.timer > 3) { this.temCaneca = true; }
        this.setState(st);
        if (st === 'clap' && Math.random() < dt / 14) this.falar(pick(['Isso, Cosme!', 'Mais uma!', 'Bravo!', 'Toca a do Javali!']));
        if (st === 'standDrink' && Math.random() < dt / 12) this.papo();
        // sem assento, quando abre um, senta
        if (!TV.bardo() && this.timer > 12 && Math.random() < dt / 6) { const s = TV.assentos(R).find((q) => TV.livre(R, q)); if (s) { TV.soltar(this); TV.reservar(s, this); this.lugar = s; this.fase = 'entrar'; } }
        if (this.timer > (this.limite || (this.limite = rand(50, 110))) && !TV.bardo()) this.ir('saindo');
        break;
      }
      case 'saindo': {
        this.setState('walk');
        if (this.andar(dt, this.alvoXY || { x: R.w * 0.5, y: R.h - 40 }, 70)) this.sumiu = true;
        break;
      }
    }
  }
  pedir() {
    this.pediu = this.temCaneca || Math.random() < 0.65 ? 'cerveja' : 'sopa';
    this.falar(pick(TAVERNA_PEDIDOS[this.pediu]));
    this.espera = rand(4, 8);
    if (this.pediu === 'cerveja') this.temCaneca = false;
  }
  papo() {
    const outro = TavernaViva.ativos.find((o) => o !== this && o.fase === this.fase && dist2(o.x, o.y, this.x, this.y) < 90 * 90 && !(o.bolha && o.bolha.t > 0));
    if (!outro || (this.bolha && this.bolha.t > 0)) return;
    const [a, b] = pick(TAVERNA_PAPO);
    this.falar(a, 3.4);
    outro.resp = b; outro.respT = 2.2;   // (o outro responde logo depois)
  }
}
if (typeof window !== 'undefined') { window.TavernaViva = TavernaViva; window.Fregues = Fregues; }
