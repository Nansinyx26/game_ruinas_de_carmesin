'use strict';
// ECLIPSE ZERO · Mundo aberto: animais domésticos das cidades (AnimaisCidade)
// ---------------------------------------------------------------------------
// A segunda categoria de animais (a primeira são os de companhia, js/mundo/pets.js; a terceira, as
// montarias). Cada cidade tem os SEUS, pela cultura e pelo clima (identidade regional, não todas
// as espécies em todo lugar):
//   Refúgio da Aurora (praça e Bairro da Muralha)  cães de rua da Aurora (marrons e creme)
//   Clareira dos Sinais (Velmora, floresta)         beagles dos caçadores (cães de caça)
//   Acampamento e Fortaleza de Asterion (neve)       cães das neves (puxam os trenós da Vigília)
//   Praça Central da Metrópole                       Asas Noturnas pousadas nos telhados de neon
// Todos com os modelos do Blender (js/mundo/criaturas3d.js). Comportamento: andam em volta do
// lugar deles, param, sentam, dormem à noite (a ave pousa e dorme), chegam para farejar o herói e
// sentam perto dele, fogem da luta (a ave levanta voo) e voltam depois. [E]: afagar; os cães de
// rua podem ser ADOTADOS (viram animais de companhia, js/mundo/pets.js; somem da rua para sempre).
// Desempenho: poucos por zona (2–3), LOD e pose guardada fora da tela pelo Criaturas3D.
// ---------------------------------------------------------------------------
const ANIMAIS_TIPOS = {
  cao_rua: { nome: 'Cão de rua', especie: 'cao_aurora', tipo: 'cao', adota: true, escala: 0.7,
    frases: ['abana o rabo e encosta a cabeça na sua mão', 'fareja as suas botas e espirra', 'deita de barriga para cima'] },
  cao_caca: { nome: 'Cão de caça', especie: 'beagle', tipo: 'cao', adota: false, escala: 0.55, dono: 'os caçadores da clareira',   // (o beagle já tem coleira)
    frases: ['fareja o ar e volta a olhar para a trilha', 'aceita o carinho, mas não tira os olhos da mata'] },
  cao_neve: { nome: 'Cão das Neves', especie: 'cao_neve', tipo: 'cao', adota: false, escala: 0.78, coleira: 'ferro', dono: 'a Vigília de Asterion',
    frases: ['sacode a neve do pelo em cima de você', 'uiva curto, como quem conversa'] },
  cao_guarda: { nome: 'Cão de guarda', especie: 'buldogue_tigrado', tipo: 'cao', adota: false, escala: 0.6, coleira: 'ferro', dono: 'os comerciantes do mercado',
    frases: ['ronca, abre um olho e volta a dormir em cima do caixote', 'cheira o seu bolso: tem cheiro de pão'] },
  gato_rua: { nome: 'Gato de rua', especie: 'gato_malhado', tipo: 'gato', adota: true, escala: 0.42,
    frases: ['aceita um carinho, depois morde de leve', 'se esfrega na sua perna e vai embora sem olhar para trás', 'ronrona como um motor velho'] },
  gato_cinza: { nome: 'Gato cinzento', especie: 'gato_cinza', tipo: 'gato', adota: true, escala: 0.42,
    frases: ['pisca devagar: é um elogio', 'finge que não te viu'] },
  galinha: { nome: 'Galinha', especie: 'galinha', tipo: 'ave_chao', adota: false, escala: 0.22, dono: 'os moradores',
    frases: ['cacareja indignada e volta a ciscar', 'bica o seu cadarço'] },
  galinha_ruiva: { nome: 'Galinha', especie: 'galinha_ruiva', tipo: 'ave_chao', adota: false, escala: 0.22, dono: 'os moradores',
    frases: ['arrepia as penas ruivas e te encara de lado', 'cisca a terra do lado da sua bota'] },
  galinha_preta: { nome: 'Galinha', especie: 'galinha_preta', tipo: 'ave_chao', adota: false, escala: 0.22, dono: 'os moradores',
    frases: ['as penas pretas brilham verdes no sol', 'canta um cacarejo comprido: botou ovo'] },
  pato: { nome: 'Pato', especie: 'pato', tipo: 'ave_chao', adota: false, escala: 0.32, dono: 'a vila do lago',
    frases: ['grasna e balança o rabo', 'te segue esperando pão'] },
  ganso: { nome: 'Ganso', especie: 'ganso', tipo: 'ave_chao', adota: false, escala: 0.36, dono: 'a vila do lago',
    frases: ['abre as asas e chia: recua, isso é território dele', 'te encara com desconfiança antiga'] },
  pavao: { nome: 'Pavão', especie: 'pavao', tipo: 'ave_chao', adota: false, escala: 0.42, dono: 'o Conselho da Aurora',
    frases: ['arruma a cauda como quem se prepara para um retrato', 'solta um grito que não combina com a beleza'] },
  pombo: { nome: 'Pombo', especie: 'pombo', tipo: 'pombo', adota: false, escala: 0.26,
    frases: ['arrulha e anda em círculos', 'olha para a sua mão procurando migalha'] },
  cabra: { nome: 'Cabra', especie: 'cabra', tipo: 'pasto', adota: false, escala: 0.62, dono: 'os pastores',
    frases: ['mastiga a ponta da sua capa', 'bale e volta a pastar'] },
  ovelha: { nome: 'Ovelha', especie: 'ovelha', tipo: 'pasto', adota: false, escala: 0.62, dono: 'os pastores da encosta',
    frases: ['a lã é quente e cheira a fumaça de lareira', 'bale para o rebanho e vem atrás de você'] },
  ave_neon: { nome: 'Asa Noturna', especie: 'asa_noturna', tipo: 'ave', adota: false, escala: 0.5,
    frases: ['inclina a cabeça e as penas acendem', 'bica a sua manga e levanta voo de volta ao telhado'] },
};
// zona → [[tipo, x, y] ...] (frações da sala). Cada cidade com os seus (cultura e clima):
//   o Refúgio (comercial e nobre): cães e gatos de rua, pombos e o pavão do Conselho;
//   o Bairro da Muralha (casas antigas): cães, gatos e as galinhas dos quintais;
//   a Clareira dos Sinais (aldeia da floresta): cães de caça, cabras e galinhas;
//   a vila do lago: patos e gansos; Asterion (frio): cães das neves e ovelhas;
//   a Metrópole: Asas Noturnas nos telhados e pombos; o Mercado Vertical: o buldogue de guarda
//   dos comerciantes, gatos e pombos;
//   o oásis de Seraph: cabras
const ANIMAIS_ZONAS = {
  aurora: [['cao_rua', 0.3, 0.7], ['cao_rua', 0.72, 0.36], ['gato_rua', 0.58, 0.28], ['pombo', 0.45, 0.55], ['pombo', 0.48, 0.6], ['pombo', 0.42, 0.62], ['pavao', 0.62, 0.42]],
  aurora_bairro: [['cao_rua', 0.58, 0.62], ['cao_rua', 0.4, 0.82], ['gato_rua', 0.28, 0.5], ['gato_cinza', 0.7, 0.8], ['galinha', 0.5, 0.88], ['galinha_ruiva', 0.54, 0.86]],
  velmora_clareira: [['cao_caca', 0.6, 0.72], ['cao_caca', 0.66, 0.78], ['cabra', 0.3, 0.6], ['cabra', 0.34, 0.66], ['galinha', 0.45, 0.8], ['galinha_preta', 0.48, 0.84], ['galinha_ruiva', 0.43, 0.86]],
  lagoa_ilha: [['pato', 0.3, 0.3], ['pato', 0.34, 0.34], ['pato', 0.28, 0.36], ['ganso', 0.62, 0.3], ['ganso', 0.66, 0.34]],
  asterion_acampamento: [['cao_neve', 0.55, 0.7], ['cao_neve', 0.62, 0.62], ['cao_neve', 0.48, 0.78], ['ovelha', 0.3, 0.4], ['ovelha', 0.34, 0.46], ['ovelha', 0.26, 0.46]],
  asterion_fortaleza: [['cao_neve', 0.5, 0.82]],
  metro_centro: [['ave_neon', 0.3, 0.3], ['ave_neon', 0.72, 0.3], ['ave_neon', 0.5, 0.7], ['pombo', 0.4, 0.5], ['pombo', 0.44, 0.52]],
  nexus_mercado: [['cao_guarda', 0.62, 0.38], ['gato_rua', 0.4, 0.5], ['gato_cinza', 0.6, 0.62], ['pombo', 0.5, 0.4], ['pombo', 0.53, 0.42]],
  seraph_oasis: [['cabra', 0.55, 0.62], ['cabra', 0.6, 0.66]],
};

// clipes por família de malha (a do lobo e a da ave), para as espécies que não são de companhia
const CLIPES_LOBO = { parado: 'idle', andar: 'andar', trotar: 'trotar', correr: 'correr', sentar: 'sentar', dormir: 'dormir', comer: 'comer', brincar: 'brincar', carinho: 'carinho', chamar: 'uivar' };
const CLIPES_AVE = { parado: 'idle', andar: 'andar', voar: 'voar', planar: 'planar', sentar: 'sentar', dormir: 'dormir', comer: 'comer', brincar: 'brincar', carinho: 'carinho', chamar: 'chamar' };

const AnimaisCidade = {
  // os adotados saem da rua (por personagem: World.state.adotados = ['zona:i', ...])
  adotados() { const W = World.state; if (!W.adotados) W.adotados = []; return W.adotados; },
  aoCarregar(z) {
    const L = z && ANIMAIS_ZONAS[z.id];
    if (!L || !game.room) return;
    const R = game.room, A = this.adotados();
    L.forEach(([tipo, fx, fy], i) => {
      const id = `${z.id}:${i}`;
      if (A.includes(id)) return;
      const a = new AnimalCidade(tipo, R.w * fx, R.h * fy, id);
      R.collide(a, false);
      game.npcs.push(a);
    });
  },
  // [E] no animal
  conversar(a) {
    const T = a.T, o = [{ id: 'afagar', tag: '✚', txt: 'Afagar', fn: () => { a.fazer('carinho'); Dialogo.mostrar(`O ${T.nome.toLowerCase()} ${pick(T.frases)}.`, [{ id: 'sair', txt: 'Até mais.', fn: () => Dialogo.fechar() }]); } }];
    if (T.adota) {
      const cheio = Pets.S().lista.length >= 6;
      o.push({ id: 'adotar', tag: '★', txt: 'Adotar (levar para casa)', off: cheio ? 'o viveiro só guarda seis animais por pessoa' : null, fn: () => this.adotar(a) });
    }
    o.push({ id: 'sair', txt: 'Deixar em paz', fn: () => Dialogo.fechar() });
    Dialogo.abrir(a, `Um ${T.nome.toLowerCase()}. ${a.dono ? `A coleira diz que é de ${a.dono}.` : 'Sem coleira: ninguém parece ser o dono.'}`, o, T.nome);
  },
  adotar(a) {
    const E = PETS_ESPECIES[a.T.especie];
    this.adotados().push(a.uid);
    const S = Pets.S();
    const P = { uid: S.uid++, especie: a.T.especie, nome: E.nomes[0], fome: 55, humor: 60, afinidade: 25, adotado: true };
    S.lista.push(P);
    game.npcs = game.npcs.filter((n) => n !== a);
    Pets.chamar(P.uid);
    const c = Pets.companheiro();
    if (c) { c.x = a.x; c.y = a.y; c.facing = a.facing; }
    Pets.menuNome(P, () => { Dialogo.mostrar(`${P.nome} agora é seu. Está com fome: um petisco cai bem. Se quiser, a Cora cuida dele no Viveiro dos Alves.`, [{ id: 'sair', txt: 'Vamos.', fn: () => Dialogo.fechar() }]); World.save(); });
  },
};

class AnimalCidade extends NPC {
  constructor(tipo, x, y, uid) {
    super({ model: 'civil', name: ANIMAIS_TIPOS[tipo].nome, lines: ['…'] }, x, y);
    this.T = ANIMAIS_TIPOS[tipo]; this.uid = uid;
    const ave = ['ave', 'ave_chao', 'pombo'].includes(this.T.tipo);
    this.E = PETS_ESPECIES[this.T.especie] || { modelo: this.T.especie, clipes: ave ? CLIPES_AVE : CLIPES_LOBO, voa: ave };
    this.key = null; this.escala = this.T.escala; this.height = 24; this.radius = 9; this.papel = 'Animal da cidade'; this.verb = 'Afagar';
    this.casa = { x, y }; this.alvo = null; this.esperaT = rand(1, 4); this.vx = 0; this.vy = 0; this.alt = 0; this.acao = null; this.acaoT = 0;
    this.paradoT = rand(0, 8); this.facing = rand(0, TAU); this.curiosoT = 0; this.state = 'idle';
    this.coleira = this.T.coleira || null; this.dono = this.T.dono || null;   // (os cães com dono usam coleira)
    if (this.T.tipo === 'ave') this.alt = 0;
  }
  canTalk() { return !game.combatActive(); }
  talk() { AnimaisCidade.conversar(this); }
  fazer(a) { if (this.E.clipes[a]) { this.acao = a; this.acaoT = 0; } }
  update(dt) {
    this.animTime += dt;
    const id = this.E.modelo;
    if (Criaturas3D.pronto(id)) this.key = 'cri_' + id; else Criaturas3D.carregar(id);
    if (this.talkT > 0) this.talkT -= dt;
    const p = game.player, luta = game.combatActive(), ave = this.T.tipo === 'ave' || this.T.tipo === 'pombo';
    if (this.susto > 0) this.susto -= dt;
    const h = typeof WorldTime !== 'undefined' ? WorldTime.hora() : 12, noite = h >= 22 || h < 5;
    const dp = Math.hypot(p.x - this.x, p.y - this.y);
    if (this.acao) {
      this.acaoT += dt;
      const C = Criaturas3D.dados[id], cl = C && C.clipes[this.E.clipes[this.acao]];
      if (!cl || this.acaoT > cl.d) this.acao = null;
    }
    // escolhe para onde ir: fugir da luta, farejar o herói (cão, de dia), vagar perto de casa
    let tx = null, ty = null, vel = 60;
    if (luta) {
      const a = Math.atan2(this.y - p.y, this.x - p.x);
      if (dp < 360) { tx = this.x + Math.cos(a) * 120; ty = this.y + Math.sin(a) * 120; vel = 220; }
    } else if (this.talkT > 0 || Dialogo.npc === this) {
      tx = null;
    } else if (this.T.tipo === 'cao' && !noite && dp < 170 && dp > 60 && this.curiosoT < 6) {
      this.curiosoT += dt; tx = p.x; ty = p.y; vel = 80;   // cão: chega para farejar
    } else if ((this.T.tipo === 'gato' && dp < 90) || (this.T.tipo === 'ave_chao' && dp < 60) || (this.T.tipo === 'pasto' && dp < 40)) {
      const a = Math.atan2(this.y - p.y, this.x - p.x);   // gato desconfiado, galinha assustada, cabra que se afasta
      tx = this.x + Math.cos(a) * 90; ty = this.y + Math.sin(a) * 90; vel = this.T.tipo === 'pasto' ? 70 : 150;
      if (this.T.tipo === 'ave_chao') this.susto = 0.6;
    } else {
      if (dp > 260) this.curiosoT = 0;
      if (!this.alvo || (this.esperaT -= dt) <= 0 && Math.hypot(this.alvo.x - this.x, this.alvo.y - this.y) < 14) {
        if (this.esperaT <= 0) {
          this.esperaT = rand(4, 10) * (noite ? 3 : 1);
          const r = ave ? 70 : 110, a = rand(0, TAU);
          this.alvo = { x: this.casa.x + Math.cos(a) * rand(0, r), y: this.casa.y + Math.sin(a) * rand(0, r) };
        }
      }
      if (this.alvo && !noite) { tx = this.alvo.x; ty = this.alvo.y; vel = ave ? 120 : this.T.tipo === 'pasto' ? 30 : this.T.tipo === 'ave_chao' ? 40 : 55; }
    }
    let dx = 0, dy = 0, d = 0;
    if (tx !== null && !this.acao) { dx = tx - this.x; dy = ty - this.y; d = Math.hypot(dx, dy); }
    const alvoV = d > 14 ? Math.min(vel, d * 2) : 0, k = 1 - Math.exp(-5 * dt);
    this.vx += ((d ? dx / d : 0) * alvoV - this.vx) * k;
    this.vy += ((d ? dy / d : 0) * alvoV - this.vy) * k;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (!ave || this.alt < 6) game.room.collide(this, false);
    const v = Math.hypot(this.vx, this.vy);
    if (v > 10) this.facing = angleLerp(this.facing, Math.atan2(this.vy, this.vx), 1 - Math.exp(-7 * dt));
    else if (dp < 140) this.facing = angleLerp(this.facing, Math.atan2(p.y - this.y, p.x - this.x), 1 - Math.exp(-2 * dt));
    if (ave) {
      const voa = (luta && dp < 400) || v > 40 || (dp < 70 && !this.talkT && Dialogo.npc !== this);   // assusta: levanta voo
      this.alt += ((voa ? 46 : 0) - this.alt) * (1 - Math.exp(-3 * dt));
    } else if (this.T.tipo === 'ave_chao') {
      this.alt += ((this.susto > 0 ? 10 : 0) - this.alt) * (1 - Math.exp(-6 * dt));   // o pulo batendo as asas da galinha assustada
    }
    this.paradoT = v < 10 && !this.acao ? this.paradoT + dt : 0;
    this.noite = noite;
    this.state = v > 10 ? 'walk' : 'idle';
  }
  petClipe(S, C, dt) {
    const K = this.E.clipes, d = (n) => (C.clipes[n] ? C.clipes[n].d : 1), tem = (n) => !!(n && C.clipes[n]);
    if (this.acao && tem(K[this.acao])) return [K[this.acao], Math.min(this.acaoT, d(K[this.acao]))];
    const v = Math.hypot(this.vx, this.vy);
    if (this.alt > 6 && tem(K.voar) && this.T.tipo !== 'ave_chao') { const n = v > 100 || this.alt < 30 ? K.voar : K.planar; S.fl = (S.fl + dt / d(n)) % 1; return [n, S.fl * d(n)]; }
    if (v > 10) {
      const n = v < 90 || !K.trotar ? K.andar : v < 180 || !K.correr ? K.trotar : K.correr;
      S.fl = (S.fl + dt * Math.max(0.6, Math.min(1.6, v / (n === K.andar ? 55 : n === K.trotar ? 115 : 200))) / d(n)) % 1;
      return [n, S.fl * d(n)];
    }
    let n = K.parado;
    const tp = this.T.tipo;
    if (this.noite || this.paradoT > (tp === 'gato' ? 14 : 30)) n = K.dormir;
    else if ((tp === 'ave_chao' || tp === 'pasto' || tp === 'pombo') && this.paradoT > 1) n = Math.floor(S.fi / 3.5) % 3 ? K.comer : K.parado;   // ciscar, pastar
    else if (this.paradoT > 4) n = K.sentar;
    if (!tem(n)) n = K.parado;
    S.fi += dt;
    return [n, S.fi % d(n)];
  }
  drawShadow(ctx) { if (this.alt < 40) super.drawShadow(ctx); }
}
