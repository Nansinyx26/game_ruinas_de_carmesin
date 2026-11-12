'use strict';
// ECLIPSE ZERO · Mundo aberto: a rotina dos moradores do Bairro da Muralha (Rotina)
// ---------------------------------------------------------------------------
// Fase 3 da expansão (docs/EXPANSAO_MUNDO_ABERTO.md). Cada morador do bairro e dos prédios tem uma
// AGENDA por hora do mundo (js/mundo/tempo.js): onde está e o que faz.
//   trabalho  no posto de sempre (o balcão, a recepção, a mesa do conselho)
//   patrulha  a ronda da muralha (os guardas), por uma rota
//   guarda    parado em sentido num ponto
//   sentar    numa cadeira ou num banco (com 'acao': comer ou beber, na mesa)
//   dormir    deitado numa cama da hospedaria ou do quartel
//   conversar em pares, frente a frente, com as falas de cada um em balões (CONVERSAS)
//   casa      dentro de uma das casas do bairro (a porta fecha: o morador some lá dentro)
// Os guardas Rui (dia) e Marta (noite) trocam de turno na porta do quartel às 6 h e às 18 h.
// À noite a taverna enche (comer, beber, o bardo cantando), os hóspedes dormem na hospedaria, a
// guarda dorme nos beliches do quartel e os moradores vão para casa.
// Com o herói na zona, quem muda de lugar ANDA: sai pela porta (ou pela passagem) quando o compromisso
// é em outra zona e entra por ela quando chega; quem fica, vai até o lugar novo. Ao carregar uma
// zona, cada um já está onde a agenda manda. A conversa com o herói funciona em qualquer postura
// (quem dorme só resmunga). O estado vem da hora: nada novo no salvamento.
// ---------------------------------------------------------------------------
const P2R = Math.PI / 2;
// [início, fim (horas), compromisso]. zona null: fora do bairro (casa: a casa onde está)
const ROTINA = {
  aur_rui: [
    [0, 5.6, { zona: 'aurora_quartel', tipo: 'dormir', at: [0.065, 0.55], giro: 0 }],
    [5.6, 6.2, { zona: BAIRRO_ID, tipo: 'conversar', porta: 'quartel', lado: -1, com: 'aur_marta', fala: 'troca_manha' }],
    [6.2, 17.6, { zona: BAIRRO_ID, tipo: 'patrulha', rota: [[0.34, 0.33], [0.62, 0.3], [0.34, 0.62], [0.3, 0.86]] }],
    [17.6, 18.2, { zona: BAIRRO_ID, tipo: 'conversar', porta: 'quartel', lado: -1, com: 'aur_marta', fala: 'troca_noite' }],
    [18.2, 21, { zona: 'aurora_quartel', tipo: 'sentar', acao: 'comer', at: [0.3, 0.265], giro: P2R, assento: 16.3 }],
    [21, 24, { zona: 'aurora_quartel', tipo: 'dormir', at: [0.065, 0.55], giro: 0 }]],
  aur_marta: [
    [0, 5.6, { zona: BAIRRO_ID, tipo: 'patrulha', rota: [[0.3, 0.86], [0.66, 0.75], [0.86, 0.5], [0.62, 0.3]] }],
    [5.6, 6.2, { zona: BAIRRO_ID, tipo: 'conversar', porta: 'quartel', lado: 1, com: 'aur_rui', fala: 'troca_manha' }],
    [6.2, 14, { zona: 'aurora_quartel', tipo: 'dormir', at: [0.065, 0.68], giro: 0 }],
    [14, 17.6, { zona: 'aurora_quartel', tipo: 'sentar', acao: 'comer', at: [0.34, 0.375], giro: -P2R, assento: 16.3 }],
    [17.6, 18.2, { zona: BAIRRO_ID, tipo: 'conversar', porta: 'quartel', lado: 1, com: 'aur_rui', fala: 'troca_noite' }],
    [18.2, 24, { zona: BAIRRO_ID, tipo: 'patrulha', rota: [[0.3, 0.86], [0.66, 0.75], [0.86, 0.5], [0.62, 0.3]] }]],
  aur_bento: [
    [0, 7, { zona: null }],   // dorme no quarto em cima da taverna
    [7, 24, { zona: 'aurora_taverna', tipo: 'trabalho', at: [0.11, 0.36], giro: 0 }]],
  aur_cosme: [
    [0, 9, { zona: 'aurora_hospedaria', tipo: 'dormir', at: [0.83, 0.075], giro: P2R }],
    [9, 12, { zona: 'aurora_taverna', tipo: 'sentar', acao: 'beber', at: [0.275, 0.72], giro: Math.PI, assento: 16.3 }],
    [12, 17, { zona: BAIRRO_ID, tipo: 'trabalho', at: [0.66, 0.42], giro: 2.2 }],
    [17, 24, { zona: 'aurora_taverna', tipo: 'cantar', at: [0.6, 0.2], giro: 2.0 }]],
  aur_rosa: [
    [0, 6, { zona: 'aurora_hospedaria', tipo: 'dormir', at: [0.55, 0.075], giro: P2R }],
    [6, 23, { zona: 'aurora_hospedaria', tipo: 'trabalho', at: [0.134, 0.3], giro: 0 }],
    [23, 24, { zona: 'aurora_hospedaria', tipo: 'dormir', at: [0.55, 0.075], giro: P2R }]],
  aur_viajante: [
    [0, 8, { zona: 'aurora_hospedaria', tipo: 'dormir', at: [0.69, 0.075], giro: P2R }],
    [8, 10, { zona: 'aurora_hospedaria', tipo: 'sentar', acao: 'comer', at: [0.62, 0.49], giro: P2R, assento: 16.7 }],
    [10, 18, { zona: BAIRRO_ID, tipo: 'sentar', at: [0.585, 0.36], giro: P2R, assento: 16.3 }],
    [18, 21, { zona: 'aurora_taverna', tipo: 'sentar', acao: 'beber', at: [0.43, 0.365], giro: P2R, assento: 16.3 }],
    [21, 24, { zona: 'aurora_hospedaria', tipo: 'dormir', at: [0.69, 0.075], giro: P2R }]],
  aur_helena: [
    [0, 8, { zona: null, casa: 'casa_b' }],
    [8, 18, { zona: 'aurora_conselho', tipo: 'trabalho', at: [0.33, 0.3], giro: 0 }],
    [18, 24, { zona: null, casa: 'casa_b' }]],
  aur_didimo: [
    [0, 7, { zona: null, casa: 'casa_c' }],
    [7, 20, { zona: 'aurora_conselho', tipo: 'sentar', at: [0.58, 0.245], giro: P2R, assento: 16.7 }],
    [20, 24, { zona: null, casa: 'casa_c' }]],
  aur_irene: [
    [0, 6, { zona: 'aurora_quartel', tipo: 'dormir', at: [0.065, 0.81], giro: 0 }],
    [6, 19, { zona: 'aurora_quartel', tipo: 'trabalho', at: [0.52, 0.28], giro: 2.4 }],
    [19, 21, { zona: 'aurora_taverna', tipo: 'sentar', acao: 'comer', at: [0.47, 0.475], giro: -P2R, assento: 16.3 }],
    [21, 24, { zona: 'aurora_quartel', tipo: 'dormir', at: [0.065, 0.81], giro: 0 }]],
  aur_pedro: [
    [0, 6, { zona: 'aurora_quartel', tipo: 'dormir', at: [0.065, 0.68], giro: 0 }],
    [6, 19, { zona: 'aurora_quartel', tipo: 'trabalho', at: [0.84, 0.5], giro: 3.0 }],
    [19, 22, { zona: 'aurora_taverna', tipo: 'sentar', acao: 'beber', at: [0.165, 0.72], giro: 0, assento: 16.3 }],
    [22, 24, { zona: 'aurora_quartel', tipo: 'dormir', at: [0.065, 0.68], giro: 0 }]],
  aur_nina: [
    [0, 7, { zona: null, casa: 'casa_a' }],
    [7, 16, { zona: BAIRRO_ID, tipo: 'trabalho', rota: [[0.66, 0.56], [0.52, 0.62], [0.66, 0.7]] }],
    [16, 18.5, { zona: BAIRRO_ID, tipo: 'conversar', at: [0.64, 0.6], giro: 0, com: 'aur_jorge', fala: 'poco' }],
    [18.5, 21, { zona: 'aurora_taverna', tipo: 'sentar', acao: 'comer', at: [0.665, 0.52], giro: 0, assento: 16.7 }],
    [21, 24, { zona: null, casa: 'casa_a' }]],
  aur_jorge: [
    [0, 6, { zona: null }],   // dorme na carroça, do lado de fora da muralha
    [6, 16, { zona: BAIRRO_ID, tipo: 'trabalho', at: [0.8, 0.72], giro: 3.9 }],
    [16, 18.5, { zona: BAIRRO_ID, tipo: 'conversar', at: [0.69, 0.6], giro: Math.PI, com: 'aur_nina', fala: 'poco' }],
    [18.5, 23, { zona: 'aurora_taverna', tipo: 'sentar', acao: 'beber', at: [0.275, 0.76], giro: Math.PI, assento: 16.3 }],
    [23, 24, { zona: null }]],
};
// Conversas entre moradores: [quem fala, o quê], em ciclo
const CONVERSAS = {
  troca_manha: [['aur_marta', 'Noite calma. Dois lobos na estrada, nada na muralha.'], ['aur_rui', 'Bom. Vai dormir, Marta. O dia é meu.'],
    ['aur_marta', 'O portão leste range. Alguém precisa de óleo.'], ['aur_rui', 'Anotado. Descansa.']],
  troca_noite: [['aur_rui', 'Turno da noite é seu. A taverna está cheia hoje.'], ['aur_marta', 'Então a rua fica vazia. Do jeito que eu gosto.'],
    ['aur_rui', 'Lampião da esquina apagou de novo.'], ['aur_marta', 'Eu acendo na primeira volta.']],
  poco: [['aur_nina', 'Chegou carga nova, Jorge?'], ['aur_jorge', 'Feno, sal e um barril que ninguém pediu.'], ['aur_nina', 'Um barril de quê?'],
    ['aur_jorge', 'Se eu soubesse, já tinha bebido.'], ['aur_nina', 'A Rosa disse que tem hóspede novo. Encapuzado.'], ['aur_jorge', 'Encapuzado na Aurora? Ou é poeta ou é problema.'],
    ['aur_nina', 'Ou os dois.'], ['aur_jorge', 'Os dois é o pior tipo.']],
};
// O que o bardo canta: a letra REAL de dublagem/Bardo/brinde_javali_dourado.mp3, verso a verso, com o
// começo e o fim de cada um em segundos (transcrição do próprio áudio, com marcação de tempo). O
// relógio da letra é o do áudio (currentTime): o verso só aparece enquanto está sendo cantado.
const CANTIGA_SRC = 'dublagem/Bardo/brinde_javali_dourado.mp3';
const CANTIGA_DUR = 195.6;   // segundos (vale enquanto o arquivo não chegou; depois, a duração dele)
const CANTIGA = [
  [19.60, 23.90, 'Eu já passei a vida olhando tela e conexão,'],
  [24.44, 28.84, 'programava elevador sem ter destino, direção.'],
  [29.30, 33.96, 'Mas quando o mundo escureceu e tudo ruiu,'],
  [34.76, 38.90, 'troquei o velho ofício pelas cordas que o céu não viu.'],
  [39.62, 44.06, 'O vento enche a caneca, o fogo estala no chão.'],
  [44.76, 49.50, 'Sentem mais perto, amigos, ouçam esta canção.'],
  [53.06, 56.82, 'Às três e doze o céu caiu,'],
  [58.08, 61.98, 'e quem dormia não acordou.'],
  [63.02, 67.84, 'Mas numa torre a chama ardeu,'],
  [67.92, 71.50, 'e a nossa Aurora ninguém apagou.'],
  [77.82, 81.62, 'E a nossa Aurora ninguém apagou.'],
  [85.84, 90.24, 'O sentinela treme no frio da muralha escura.'],
  [90.60, 95.12, 'O andarilho quieto esconde a amargura.'],
  [95.18, 99.74, 'Dizem que um homem de preto vaga pelas fendas além,'],
  [100.08, 104.76, 'com uma lâmpada azul no pulso e a espada de ninguém.'],
  [104.84, 109.56, 'O mundo lá fora foi tomado pelo ferro e pelo pó,'],
  [109.94, 118.10, 'mas nesta mesa de madeira nós não estamos sós.'],
  [118.54, 122.12, 'Às três e doze o céu caiu,'],
  [123.40, 127.12, 'e quem dormia não acordou.'],
  [128.32, 133.14, 'Mas numa torre a chama ardeu,'],
  [133.22, 136.92, 'e a nossa Aurora ninguém apagou.'],
  [137.90, 141.96, 'Ergam suas canecas, um contra a escuridão.'],
  [143.28, 149.90, 'Um brinde ao Javali Dourado, que ainda bate em nosso coração.'],
  [153.74, 157.60, 'Às três e doze o céu caiu,'],
  [159.22, 163.02, 'mas a Aurora ninguém apagou.'],
  [166.60, 169.12, 'Saúde, amigo.'],
];
// A cantoria: o áudio toca UMA vez do começo ao fim (sem repetir em laço e sem corte); acabou, o bardo
// descansa um pouco e começa de novo. Sai da taverna (ou acaba a hora dele): o som para e volta ao zero.
const Cantoria = {
  audio: null, t: 0, tocando: false, descanso: 0, mudo: false, DESCANSO: 22, COMPASSO: 1.9,
  som() {
    if (this.audio || typeof Audio === 'undefined') return this.audio;
    const a = this.audio = new Audio(encodeURI(CANTIGA_SRC));
    a.preload = 'auto'; a.loop = false;
    a.addEventListener('ended', () => { this.tocando = false; this.descanso = this.DESCANSO; this.t = 0; });
    a.addEventListener('error', () => { this.mudo = true; });   // arquivo não veio: canta em silêncio, no relógio do jogo
    return a;
  },
  dur() { const a = this.audio; return a && a.duration > 0 && isFinite(a.duration) ? a.duration : CANTIGA_DUR; },
  parar() {
    const a = this.audio;
    if (a) { try { a.pause(); a.currentTime = 0; } catch (e) { /* ainda sem dados */ } }
    this.tocando = false; this.t = 0; this.descanso = 0;
  },
  // A cada quadro em que o bardo está no palco: toca (ou segue tocando) e acerta o volume
  passo(n, dt) {
    const A = game.audio, a = this.som(), narrando = !!(A && A.narration && A.narration.isPlaying());
    if (this.descanso > 0) { this.descanso -= dt; return; }
    if (narrando) { if (a && !a.paused) { try { a.pause(); } catch (e) { /* nada */ } } return; }   // a narração da história tem a vez
    if (!a || this.mudo) {   // sem áudio: a música corre no relógio do jogo, só com a letra
      this.tocando = true; this.t += dt;
      if (this.t >= CANTIGA_DUR) { this.tocando = false; this.t = 0; this.descanso = this.DESCANSO; }
      return;
    }
    const d = dist(n.x, n.y, game.player.x, game.player.y), perto = clamp(1 - (d / 650) * 0.45, 0.55, 1);
    a.muted = !!(A && A.muted);
    a.volume = A ? clamp((A.volume / 0.69) * (A.voiceVol === undefined ? 1 : A.voiceVol) * 0.85 * perto, 0, 1) : 0.8;
    if (a.paused) { const p = a.play(); if (p && p.catch) p.catch(() => { this.mudo = !this.tocando && a.currentTime === 0; }); }
    this.tocando = true; this.t = a.currentTime;
  },
  // Verso que está sendo cantado agora: { txt, k, a (0–1, entrando e saindo) } ou null (só instrumento)
  verso() {
    if (!this.tocando) return null;
    const t = this.t;
    for (let k = 0; k < CANTIGA.length; k++) {
      const V = CANTIGA[k];
      if (t < V[0] - 0.25) break;
      if (t <= V[1] + 0.45) return { txt: V[2], k, a: clamp(Math.min((t - (V[0] - 0.25)) / 0.45, (V[1] + 0.45 - t) / 0.6), 0, 1) };
    }
    return null;
  },
};
const RESMUNGOS = ['Zzz…', 'Hm… só mais cinco minutos…', 'Zzz… o portão… zzz…', '…volte de manhã…'];

const Rotina = {
  passo: 0,
  // O compromisso de uma pessoa na hora h (null: sem agenda)
  agora(id, h = WorldTime.hora()) {
    const A = ROTINA[id];
    if (!A) return null;
    const x = ((h % 24) + 24) % 24;
    for (const e of A) if (x >= e[0] && x < e[1]) return e[2];
    return A[A.length - 1][2];
  },
  anterior(id, h = WorldTime.hora()) {
    const A = ROTINA[id];
    if (!A) return null;
    const x = ((h % 24) + 24) % 24;
    const i = A.findIndex((e) => x >= e[0] && x < e[1]);
    return A[(i - 1 + A.length) % A.length][2];
  },
  // Zona onde a pessoa está agora (Povo.onde, o diário e os marcadores)
  zonaDe(id) { const E = this.agora(id); return E ? E.zona : undefined; },
  definicao(P) { const z = WORLD_ZONES[P.zona]; return z ? z.npcs.find((d) => d.persona === P) : null; },
  // ------------------------------------------------------------ lugares
  porta(id, R) {
    const B = typeof Bairro !== 'undefined' && Bairro.predio(id);
    if (!B || !R) return null;
    return Bairro.porta(B, R);
  },
  // O lugar do compromisso na sala atual: { x, y, giro, ... } (posições livres para quem só fica de pé)
  lugar(E, R, id) {
    if (E.porta) {   // na rua, diante de uma porta (a troca de turno)
      const d = this.porta(E.porta, R);
      return { x: d.x + (E.lado || 0) * 26, y: d.y + 34, giro: (E.lado || 0) < 0 ? 0 : Math.PI };
    }
    if (!E.at) { const P = Povo.persona(id), def = P && this.definicao(P); const q = def ? npcSpot(R, def.at[0], def.at[1]) : { x: R.w / 2, y: R.h / 2 }; return { x: q.x, y: q.y, giro: def ? def.facing || 0 : 0 }; }
    const x = R.w * E.at[0], y = R.h * E.at[1];
    if (E.tipo === 'sentar' || E.tipo === 'dormir') return { x: x + 0.5, y: y + 0.5, giro: E.giro || 0 };   // (+0,5: desenhado depois do móvel)
    const q = R.canStand(x, y, 14) ? { x, y } : npcSpot(R, E.at[0], E.at[1]);
    return { x: q.x, y: q.y, giro: E.giro || 0 };
  },
  // Por onde a pessoa sai desta sala para ir ao compromisso E (ou entra vindo dele)
  saida(E, R, z) {
    if (z.distrito === 'interior') return { x: R.w * 0.5, y: R.h - 70 };
    if (E && E.zona && E.zona !== BAIRRO_ID) {
      const I = BAIRRO_INTERIORES[E.zona], d = I && this.porta(I.predio, R);
      if (d) return { x: d.x, y: d.y };
    }
    if (E && E.casa) { const d = this.porta(E.casa, R); if (d) return { x: d.x, y: d.y }; }
    return { x: R.w * 0.3, y: R.h - 80 };   // a passagem para a praça (e a estrada, para quem dorme fora)
  },
  // ------------------------------------------------------------ montagem da zona (World.loadZone)
  aoCarregar(z) {
    Cantoria.parar();   // trocou de zona: a música para e volta ao começo
    const g = game, R = g.room;
    for (let i = g.npcs.length - 1; i >= 0; i--) {   // quem tem compromisso em outro lugar não está aqui
      const n = g.npcs[i];
      if (n instanceof Morador && n.P && ROTINA[n.P.id] && this.agora(n.P.id).zona !== z.id) g.npcs.splice(i, 1);
    }
    for (const id in ROTINA) {
      const E = this.agora(id);
      if (E.zona !== z.id) continue;
      let n = g.npcs.find((q) => q instanceof Morador && q.P && q.P.id === id);
      if (!n) { n = this.criar(id, R); if (!n) continue; }
      this.ativar(n, E, R, true);
    }
    if (typeof NpcModelo !== 'undefined') NpcModelo.liberar();
  },
  criar(id, R, x, y) {
    const P = Povo.persona(id), def = P && this.definicao(P);
    if (!def) return null;
    const n = new Morador(def, x !== undefined ? x : R.w / 2, y !== undefined ? y : R.h / 2);
    n.preparar(R);
    game.npcs.push(n);
    return n;
  },
  // Começa um compromisso: já no lugar (ao carregar) ou andando até ele
  ativar(n, E, R, ja) {
    n.rot = E; n.indo = !ja; n.saindo = null; n.preso = 0; n.vez = 0;
    const L = this.lugar(E, R, n.P.id);
    n.alvoR = L;
    n.rotaXY = E.rota ? E.rota.map((a) => npcSpot(R, a[0], a[1])) : (n.P.rota && E.tipo === 'trabalho' && !E.at ? n.rotaXY : null);
    if (E.tipo === 'trabalho' || E.tipo === 'patrulha') { n.origem = { x: L.x, y: L.y }; n.baseFacing = L.giro; }
    if (ja) {
      n.x = L.x; n.y = L.y; n.facing = n.baseFacing = L.giro;
      if (E.rota && n.rotaXY && n.rotaXY.length) { n.x = n.rotaXY[0].x; n.y = n.rotaXY[0].y; n.ri = 1; }
    }
    n.assento = E.assento; n.camaZ = 20.4; n.camaPe = 29;
  },
  // ------------------------------------------------------------ a cada quadro (World.update)
  update(dt) {
    const z = World.zone, g = game, R = g.room;
    if (!z || !R || !(z.distrito || z.id === BAIRRO_ID)) { if (Cantoria.tocando || Cantoria.descanso > 0) Cantoria.parar(); return; }
    // a música só existe com o bardo no palco: sem ele cantando nesta zona, para e volta ao começo
    if ((Cantoria.tocando || Cantoria.descanso > 0) && !g.npcs.some((q) => q instanceof Morador && q.rot && q.rot.tipo === 'cantar' && !q.indo && !q.saindo && !q.sumiu)) Cantoria.parar();
    if ((this.passo -= dt) > 0) return;
    this.passo = 0.5;
    for (let i = g.npcs.length - 1; i >= 0; i--) if (g.npcs[i].sumiu) g.npcs.splice(i, 1);
    for (const id in ROTINA) {
      const E = this.agora(id), n = g.npcs.find((q) => q instanceof Morador && q.P && q.P.id === id && !q.sumiu);
      if (n) {
        if (n.saindo) continue;
        if (E.zona !== z.id) { n.saindo = this.saida(E, R, z); n.rot = null; n.preso = 0; continue; }
        if (n.rot !== E) this.ativar(n, E, R, false);
      } else if (E.zona === z.id) {
        const de = this.saida(this.anterior(id), R, z), m = this.criar(id, R, de.x, de.y);
        if (m) this.ativar(m, E, R, false);
      }
    }
  },
  // Morador com agenda (Morador.update): true se a rotina cuidou dele neste quadro
  atualizar(n, dt) {
    if (n.saindo) {
      if (this.mover(n, n.saindo, dt, 44)) { n.setState('walk'); return true; }
      n.sumiu = true; n.setState('idle');
      return true;
    }
    const E = n.rot;
    if (!E) return false;
    const L = n.alvoR;
    if (n.indo) {
      const fixo = E.tipo === 'sentar' || E.tipo === 'dormir';
      if (this.mover(n, L, dt, 40, fixo ? 34 : 6)) { n.setState('walk'); return true; }
      if (fixo) { n.x = L.x; n.y = L.y; }
      n.indo = false;
    }
    const falando = n.talkT > 0;
    if (E.tipo === 'sentar') { n.x = L.x; n.y = L.y; n.facing = angleLerp(n.facing, L.giro, 0.2); n.setState(E.acao === 'comer' && !falando ? 'eat' : E.acao === 'beber' && !falando ? 'drink' : 'sit'); return true; }
    if (E.tipo === 'dormir') { n.x = L.x; n.y = L.y; n.facing = L.giro; n.setState('sleep'); return true; }
    if (E.tipo === 'guarda' || (E.tipo === 'conversar' && falando)) { n.setState(falando ? 'talk' : 'guard'); this.olhar(n, L.giro, dt); return true; }
    if (E.tipo === 'conversar') {
      const C = CONVERSAS[E.fala], com = game.npcs.find((q) => q instanceof Morador && q.P && q.P.id === E.com && !q.sumiu && !q.indo && !q.saindo);
      if (!C || !com) { n.setState('idle'); this.olhar(n, L.giro, dt); return true; }
      const k = Math.floor(game.realTime / 3.4) % C.length, fala = C[k];
      n.facing = angleLerp(n.facing, Math.atan2(com.y - n.y, com.x - n.x), 1 - Math.exp(-5 * dt));
      if (fala[0] === n.P.id) { n.setState('talk'); n.balao(fala[1], k); } else n.setState('listen');
      return true;
    }
    if (E.tipo === 'cantar') {
      Cantoria.passo(n, dt);
      n.verso = Cantoria.verso();   // a letra acima da cabeça (Morador.desenharBalao), no tempo do áudio
      if (!falando) n.setState('talk');
      this.olhar(n, L.giro, dt);
      return true;
    }
    return false;   // trabalho e patrulha: o andar de sempre do morador (pela rota ou de volta ao posto)
  },
  // O bardo tocando agora (js/mundo/npc3d.js: a pose do alaúde), o compasso e o quanto ele canta (0–1)
  cantando(n) { return !!(n && n.rot && n.rot.tipo === 'cantar' && !n.indo && !n.saindo && Cantoria.tocando); },
  compasso() { return Cantoria.COMPASSO; },
  voz() { const V = Cantoria.verso(); return V ? 0.35 + 0.65 * V.a : 0.08; },
  cantoria: Cantoria,
  olhar(n, giro, dt) {
    const p = game.player, d = dist(n.x, n.y, p.x, p.y);
    const alvo = d < 160 ? Math.atan2(p.y - n.y, p.x - n.x) : giro;
    n.facing = angleLerp(n.facing, alvo, 1 - Math.exp(-4 * dt));
  },
  // Anda até o alvo (true enquanto anda); desvia de lado quando bate e, preso, chega de uma vez
  mover(n, alvo, dt, vel, perto = 6) {
    const dx = alvo.x - n.x, dy = alvo.y - n.y, d = Math.hypot(dx, dy);
    if (d < perto) return false;
    const R = game.room, v = Math.min(vel * dt, d), ux = dx / d, uy = dy / d;
    let nx = n.x + ux * v, ny = n.y + uy * v;
    if (R && !R.canStand(nx, ny, 12)) {
      const s = (n.lado = n.lado || (Math.random() < 0.5 ? 1 : -1));
      nx = n.x + (ux * 0.3 - uy * s) * v; ny = n.y + (uy * 0.3 + ux * s) * v;
      if (!R.canStand(nx, ny, 12)) { n.preso = (n.preso || 0) + dt; if (n.preso > 2.5) { n.x = alvo.x; n.y = alvo.y; n.preso = 0; return false; } return true; }
    }
    n.x = nx; n.y = ny;
    n.facing = angleLerp(n.facing, Math.atan2(dy, dx), 1 - Math.exp(-8 * dt)); n.baseFacing = n.facing;
    return true;
  },
  // Conversa com quem dorme: um resmungo e nada mais
  dormindo(n) {
    n.balao(RESMUNGOS[Math.floor(Math.random() * RESMUNGOS.length)], Math.random());
    game.audio.play('uiMove');
  },
};
