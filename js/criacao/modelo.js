'use strict';
// ECLIPSE ZERO · Criação de personagem: o modelo 3D detalhado (PersonagemModelo)
// ---------------------------------------------------------------------------
// O personagem criado é montado no MESMO esqueleto do Kael (MODELS3D.kael.build), então usa todas
// as poses e animações do jogo (parado, andar, correr, pular, esquivar, golpes de cada arma, carga,
// bloqueio, habilidades, suprema, dano, morte, sacar e guardar), os encaixes das armas (WeaponRig)
// e as peças da armadura modular (PecasRig). O corpo é uma malha contínua com pele (cada vértice
// segue até 4 ossos, como os modelos importados da Meshy), feita na pose de ligação de
// js/criacao/malha.js, com normais suaves, textura pintada e mapa de material com relevo
// (js/criacao/pintura.js):
//   corpo     tronco com peito, cintura, quadril, escápulas e glúteos; pescoço; braços com
//             deltoide, bíceps e antebraço; mãos com palma e cinco dedos de falanges que dobram;
//             pernas com coxa, joelho e panturrilha (as juntas dobram sem abrir: os pesos se
//             misturam perto de cada articulação)
//   cabeça    crânio, mandíbula e queixo pelo formato do rosto, órbitas, arco das sobrancelhas,
//             maçãs, nariz com asas, lábios, orelhas; o rosto é uma grade mais fina com textura
//             própria (olhos pintados com íris e cílios, boca, rubor, marcas)
//   cabelo    calota e mechas que seguem o crânio (oito cortes); as longas, o rabo de cavalo e as
//             tranças balançam (osso 'hair', movimento secundário); barba em casca (cavanhaque,
//             cheia) e bigode em mechas
//   roupa     a receita da classe (três por classe, RECEITAS): peça de cima de couro, tecido,
//             acolchoado, malha ou placas, mangas, saia ou manto presos às abas do casaco do
//             Kael (balançam com as pernas), mangas largas, gola alta ou capuz caído, cinto com
//             fivela e bolsas, bandoleira, braçadeiras, luvas, ombreiras, botas com sola e salto
//   brilho    runas acesas (marcas e roupas rúnicas) e a gema do emblema, na cor da classe;
//             os olhos arcanos brilham pela textura (tex.glow)
// Quando o Arsenal veste ombreiras ou capacete, as ombreiras da roupa e o cabelo saem.
// Um modelo por personagem (MODELS3D['criado_' + id]); mudar a aparência refaz o modelo.
// ---------------------------------------------------------------------------
const PersonagemModelo = (function () {
  const PI = Math.PI;
  const { Malha, tubo, aneisCurva, curva, tabela, superelipse, bossa, suave, cl, ponto, eixos, ligar } = MalhaPele;
  const AT = PinturaPers;
  const CORPO = [   // larguras (w), ombros (sh), quadril (hp), cintura (wa), peito (ch), membros (lb), busto (bu)
    { w: 0.9, sh: 0.92, hp: 0.92, wa: 0.88, ch: 0.92, lb: 0.86, bu: 0 },     // esguio
    { w: 1, sh: 1, hp: 1, wa: 0.95, ch: 1.02, lb: 1, bu: 0 },                // atlético
    { w: 1.12, sh: 1.1, hp: 1.08, wa: 1.12, ch: 1.12, lb: 1.15, bu: 0 },     // robusto
    { w: 0.95, sh: 0.88, hp: 1.12, wa: 0.8, ch: 1.0, lb: 0.92, bu: 1 },      // curvilíneo
  ];
  const ALTURA = [0.92, 0.96, 1, 1.04, 1.08];
  // Formato do rosto: crânio (frente, trás, lado, alto, baixo), mandíbula que estreita (jn), queixo
  // (cq), maçãs (mc), arco das sobrancelhas (so), mandíbula quadrada (qd), nariz (nz)
  const FORMA = [
    { rxF: 4.3, rxT: 4.55, ry: 3.55, rzT: 4.8, rzB: 4.5, jn: 0.16, cq: 0.3, mc: 0.26, so: 0.22, qd: 0, nz: 0.95, jw: 0.05 },        // oval
    { rxF: 4.35, rxT: 4.55, ry: 3.7, rzT: 4.75, rzB: 4.55, jn: 0.08, cq: 0.38, mc: 0.34, so: 0.32, qd: 0.45, nz: 1.0, jw: 0.12 },   // anguloso
    { rxF: 4.35, rxT: 4.6, ry: 3.85, rzT: 4.65, rzB: 4.35, jn: 0.12, cq: 0.2, mc: 0.36, so: 0.16, qd: 0.05, nz: 0.85, jw: 0.1 },    // redondo
    { rxF: 4.25, rxT: 4.5, ry: 3.45, rzT: 5.05, rzB: 4.85, jn: 0.17, cq: 0.32, mc: 0.24, so: 0.22, qd: 0.08, nz: 1.02, jw: 0.03 },  // longo
  ];
  // Receitas das roupas (PERS_CLASSES[c].roupas, na mesma ordem)
  const RECEITAS = {
    guerreiro: [
      { tecido: 'couro', placas: true, manga: 0.38, saia: 0.3, saiaTiras: true, saiaTecido: 'couro', ombreiras: 1, cinto: 'duplo', bolsas: 1, bracadeira: 'couro', luvas: 'couro', calcaTipo: 'pano', botaAlta: true, fecho: 'fivelas', decote: 0.12 },
      { tecido: 'acolchoado', manga: 1, saia: 0.45, saiaFenda: true, gola: 1, ombreiras: 1, cinto: 'simples', bracadeira: 'couro', luvas: 'couro', calcaTipo: 'pano', botaAlta: true, fecho: 'cordao' },
      { tecido: 'malha', manga: 0.55, saia: 0.42, saiaTecido: 'malha', saiaFenda: true, ombreiras: 2, cinto: 'duplo', bolsas: 2, bracadeira: 'metal', luvas: 'couro', calcaTipo: 'couro', botaAlta: true, emblema: true },
    ],
    mago: [
      { tecido: 'pano', manga: 1, mangaLarga: true, saia: 1.0, saiaFenda: true, gola: 1, cinto: 'faixa', luvas: 'nua', calcaTipo: 'pano', runas: true, emblema: true, decote: 0.1 },
      { tecido: 'pano', manga: 1, mangaLarga: true, saia: 0.86, gola: 2, cinto: 'simples', bolsas: 2, luvas: 'nua', calcaTipo: 'pano', fecho: 'botoes', emblema: true },
      { tecido: 'acolchoado', manga: 1, saia: 0.6, saiaFenda: true, gola: 1, ombreiras: 3, cinto: 'simples', bolsas: 1, bracadeira: 'couro', luvas: 'sem dedos', calcaTipo: 'pano', botaAlta: true, fecho: 'fivelas', runas: true },
    ],
    assassino: [
      { tecido: 'couro', manga: 1, saia: 0.28, saiaTiras: true, saiaTecido: 'couro', gola: 1, golaTecido: 'couro', cinto: 'simples', bolsas: 2, bracadeira: 'couro', luvas: 'sem dedos', calcaTipo: 'couro', botaAlta: true, fecho: 'fivelas', faixaCruzada: true },
      { tecido: 'couro', placas: true, manga: 0, saia: 0.32, saiaTiras: true, saiaTecido: 'couro', ombreiras: 3, cinto: 'duplo', bolsas: 2, bracadeira: 'couro', luvas: 'sem dedos', calcaTipo: 'couro', botaAlta: true, faixasBraco: true },
      { tecido: 'pano', manga: 1, saia: 0, gola: 2, cinto: 'simples', bolsas: 3, bandoleira: true, luvas: 'couro', calcaTipo: 'pano', botaAlta: false, faixasBraco: true, faixasPerna: true, fecho: 'fivelas' },
    ],
    patrulheiro: [
      { tecido: 'couro', manga: 1, manga_tecido: 'pano', mangaCor: 'det', saia: 0.35, saiaFenda: true, cinto: 'simples', bolsas: 2, bandoleira: true, bracadeira: 'couro', luvas: 'sem dedos', calcaTipo: 'pano', botaAlta: true, fecho: 'cordao', decote: 0.1, bolsoPerna: true },
      { tecido: 'pano', manga: 1, saia: 0.5, saiaFenda: true, gola: 2, cinto: 'simples', bolsas: 1, bracadeira: 'couro', luvas: 'nua', calcaTipo: 'pano', botaAlta: true, joelheira: true, decote: 0.12, fecho: 'cordao' },
      { tecido: 'couro', acolchoadoPeito: true, manga: 0.5, saia: 0.3, saiaTiras: true, saiaTecido: 'couro', ombreiras: 3, cinto: 'duplo', bolsas: 2, bandoleira: true, bracadeira: 'couro', luvas: 'sem dedos', calcaTipo: 'couro', botaAlta: true, joelheira: true },
    ],
    guardiao: [
      { tecido: 'couro', manga: 1, manga_tecido: 'pano', saia: 0.4, saiaFenda: true, gola: 1, ombreiras: 1, cinto: 'duplo', bolsas: 1, bracadeira: 'couro', luvas: 'couro', calcaTipo: 'pano', botaAlta: true, runas: true, emblema: true, fecho: 'fivelas' },
      { tecido: 'pano', manga: 1, saia: 0.7, saiaFenda: true, tabardo: true, gola: 1, ombreiras: 2, cinto: 'simples', bracadeira: 'metal', luvas: 'couro', calcaTipo: 'pano', botaAlta: true, runas: true },
      { tecido: 'placa', manga: 0.5, manga_tecido: 'malha', saia: 0.42, saiaTiras: true, saiaTecido: 'couro', gola: 1, golaTecido: 'couro', ombreiras: 2, cinto: 'duplo', bracadeira: 'metal', luvas: 'couro', calcaTipo: 'couro', botaAlta: true, runas: true, emblema: true },
    ],
  };
  const receita = (classe, i) => { const L = RECEITAS[classe] || RECEITAS.guerreiro; return Object.assign({ manga: 1, saia: 0, gola: 0, ombreiras: 0, cinto: 'simples', bolsas: 0, luvas: 'nua', calcaTipo: 'pano', botaAlta: true }, L[i] || L[0]); };
  // Dedos (como no esqueleto do Kael): falanges de cada dedo (0 polegar … 4 mínimo) e raios
  const DEDOS = [[0.72, 0.58], [0.74, 0.5, 0.4], [0.8, 0.54, 0.42], [0.74, 0.5, 0.4], [0.6, 0.42, 0.34]];
  const RDEDO = [0.31, 0.25, 0.26, 0.245, 0.215];
  // Abas do casaco do Kael (ângulo do meio em graus): a saia e o manto penduram nelas
  const ABAS = [['cBL', -147], ['cSL', -107], ['cFL', -64], ['cFR', 64], ['cSR', 107], ['cBR', 147]];
  // Seções do braço e do antebraço: [z, [frente, trás, lado]]
  const SU = [[1.6, [1.75, 1.75, 1.8]], [0.8, [2.3, 2.25, 2.45]], [-0.5, [2.4, 2.25, 2.55]], [-2.0, [2.22, 2.1, 2.3]], [-4.0, [2.15, 1.88, 2.0]], [-6.0, [1.95, 1.78, 1.86]], [-8.0, [1.66, 1.6, 1.66]], [-9.8, [1.48, 1.5, 1.52]]];
  const SF = [[0, [1.5, 1.58, 1.55]], [-2.4, [1.66, 1.72, 1.78]], [-5.0, [1.42, 1.48, 1.48]], [-7.5, [1.13, 1.14, 1.26]], [-9.2, [0.96, 0.96, 1.16]], [-9.9, [0.95, 0.95, 1.12]]];
  // Coxa e canela
  const ST = [[1.6, [2.6, 2.9, 2.9]], [0.4, [2.95, 3.15, 3.05]], [-2, [3.0, 2.95, 3.0]], [-5, [2.8, 2.6, 2.75]], [-8, [2.45, 2.3, 2.4]], [-10.5, [2.15, 2.05, 2.1]], [-12.8, [1.98, 1.95, 2.0]]];
  const SS = [[-0.6, [1.95, 1.95, 1.95]], [-2.8, [1.75, 2.35, 2.0]], [-5, [1.6, 2.05, 1.8]], [-7.5, [1.4, 1.6, 1.5]], [-10, [1.2, 1.25, 1.3]], [-12.2, [1.1, 1.1, 1.2]]];
  const secT = (T, z, k) => [0, 1, 2].map((i) => tabela(T.map((q) => [q[0], q[1][i]]), z) * k);
  // Pé (espaço do osso do pé): [x, centro z, meia largura, meia altura]
  const PE = [[-2.75, -2.15, 1.05, 1.35], [-2.2, -1.95, 1.35, 1.6], [-1.0, -1.75, 1.5, 1.85], [0.4, -1.75, 1.55, 1.85], [1.8, -2.05, 1.65, 1.55], [3.2, -2.4, 1.75, 1.2], [4.6, -2.7, 1.72, 0.92], [5.7, -2.9, 1.5, 0.72], [6.4, -3.02, 1.05, 0.55]];
  const pe = (x, k) => [tabela(PE.map((q) => [q[0], q[1]]), x), tabela(PE.map((q) => [q[0], q[2]]), x) * k, tabela(PE.map((q) => [q[0], q[3]]), x)];
  // Tronco: meia largura, frente, trás e expoente por altura (espaço do 'torso')
  const TB = [[-4.6, 2.9], [-3.6, 4.6], [-1.8, 5.25], [0.4, 5.05], [2.6, 4.55], [4.6, 4.75], [6.6, 5.25], [8.4, 5.75], [9.8, 6.2], [10.9, 6.75], [11.9, 6.4], [12.8, 5.0], [13.5, 3.3], [14.1, 2.45]];
  const TF = [[-4.6, 2.4], [-3.6, 3.1], [-1.8, 3.45], [0.4, 3.35], [2.6, 3.2], [4.6, 3.4], [6.6, 3.75], [8.4, 4.0], [9.8, 3.85], [10.9, 3.3], [11.9, 2.75], [12.8, 2.35], [13.5, 2.2], [14.1, 2.1]];
  const TT = [[-4.6, 2.7], [-3.6, 3.6], [-1.8, 3.9], [0.4, 3.35], [2.6, 3.0], [4.6, 3.15], [6.6, 3.45], [8.4, 3.6], [9.8, 3.6], [10.9, 3.35], [11.9, 3.05], [12.8, 2.55], [13.5, 2.25], [14.1, 2.1]];
  const TE = [[-4.6, 2.2], [-1.8, 2.5], [2.6, 2.3], [8.4, 2.6], [11.9, 2.3], [13.5, 2.0]];
  const H0 = -4.6, H1 = 14.1;

  // ------------------------------------------------------------ cores
  const h3 = (c) => (Array.isArray(c) ? c : hex3(c));
  const mx = (a, b, t) => { const A = h3(a), B = h3(b); return [0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t); };
  const escuro = (c, k) => mx(c, [0, 0, 0], k), claro = (c, k) => mx(c, [1, 1, 1], k);
  function paleta(A, classe) {
    const pele = h3(PERS_PELES[A.pele]), cab = h3(PERS_CABELOS[A.corCabelo][1]), roupa = h3(PERS_CORES[A.corRoupa][1]), det = h3(PERS_CORES[A.corDetalhe][1]);
    const cor = h3(PERS_CLASSES[classe].cor);
    return { pele, cab, roupa, det, detH: claro(det, 0.3), calca: escuro(mx(roupa, [0.17, 0.15, 0.13], 0.55), 0.15),
      couro: [0.3, 0.2, 0.13], bota: [0.2, 0.14, 0.09], metal: [0.56, 0.57, 0.6], runa: claro(cor, 0.35), cor,
      olho: h3(PERS_OLHOS[A.olhos][1]), olhoE: PERS_OLHOS[A.olhos][2] };
  }
  let semente = 1;
  const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };

  // ------------------------------------------------------------ cabeça (espaço do osso 'head')
  const HC = [-0.25, 0, 8.0];
  function cabecaDe(F) {
    // ponto da forma base (sem os traços do rosto) nos ângulos (θ em volta, frente = 0; φ latitude)
    function base(th, ph) {
      const cp = Math.cos(ph), d0 = cp * Math.cos(th), d1 = cp * Math.sin(th), d2 = Math.sin(ph);
      const baixo = suave(-0.05, -1.0, ph);
      let rx = d0 >= 0 ? F.rxF : F.rxT;
      const mand = Math.exp(-((ph + 0.55) * (ph + 0.55)) / (2 * 0.3 * 0.3)) * Math.max(0, d0 + 0.3);   // mandíbula cheia dos lados
      const ry = F.ry * (1 - F.jn * Math.pow(baixo, 1.2)) * (1 + F.jw * mand), rz = d2 >= 0 ? F.rzT : F.rzB;
      if (d0 < 0) rx *= 1 - 0.3 * suave(-0.2, -1.0, ph);                                  // nuca entra no pescoço
      else rx *= (1 - 0.07 * suave(0.55, 1, d0) * (1 - baixo)) * (1 + 0.05 * baixo);       // rosto achatado, queixo à frente
      return [HC[0] + d0 * rx, HC[1] + d1 * ry, HC[2] + d2 * rz];
    }
    function nariz(a, ph) {
      const A = tabela([[-0.38, 0], [-0.35, 0.12], [-0.31, 0.55], [-0.27, 1.02], [-0.22, 1.18], [-0.15, 0.92], [-0.02, 0.45], [0.1, 0.2], [0.17, 0]], ph) * F.nz;
      const W = tabela([[-0.38, 0.11], [-0.31, 0.1], [-0.22, 0.078], [-0.05, 0.058], [0.17, 0.05]], ph);
      return A * Math.exp(-0.7 * Math.pow(a / W, 1.7)) + 0.34 * bossa(a, ph, 0.12, -0.305, 0.05, 0.035) * F.nz;
    }
    // relevo do rosto (desloca na direção do centro da cabeça)
    function tracos(th, ph) {
      const a = Math.abs(Math.atan2(Math.sin(th), Math.cos(th)));
      if (a > 1.45 || ph < -1.25 || ph > 0.75) return 0;
      let d = 0;
      d += -0.45 * bossa(a, ph, 0.36, 0.045, 0.2, 0.09);         // órbitas
      d += 0.24 * bossa(a, ph, 0.36, 0.035, 0.14, 0.05);         // globo do olho
      d += 0.07 * bossa(a, ph, 0.36, 0.1, 0.17, 0.02);           // pálpebra de cima
      d += -0.07 * bossa(a, ph, 0.62, -0.4, 0.18, 0.12);         // bochecha abaixo da maçã
      d += F.so * bossa(a, ph, 0.33, 0.2, 0.26, 0.055);          // arco das sobrancelhas
      d += F.mc * bossa(a, ph, 0.68, -0.1, 0.2, 0.11);           // maçãs
      d += -0.12 * bossa(a, ph, 0.95, 0.35, 0.2, 0.15);          // têmporas
      d += nariz(a, ph);
      d += 0.12 * bossa(a, ph, 0, -0.435, 0.2, 0.035) + 0.15 * bossa(a, ph, 0, -0.515, 0.17, 0.038);   // lábios
      d += -0.08 * bossa(a, ph, 0, -0.475, 0.25, 0.012) - 0.06 * bossa(a, ph, 0.27, -0.47, 0.04, 0.04);  // boca e cantos
      d += -0.06 * bossa(a, ph, 0, -0.385, 0.025, 0.03);         // filtro
      d += -0.05 * bossa(a, ph, 0.22, -0.36, 0.05, 0.08);        // sulco nasolabial
      d += F.cq * bossa(a, ph, 0, -0.84, 0.22, 0.12);            // queixo
      d += 0.28 * F.qd * bossa(a, ph, 1.1, -0.62, 0.22, 0.14);   // ângulo da mandíbula
      return d;
    }
    // ponto da superfície (com ou sem os traços), afastado 'off' para fora
    function P(th, ph, off = 0, comTracos = true) {
      const b = base(th, ph), dx = b[0] - HC[0], dy = b[1] - HC[1], dz = b[2] - HC[2], l = Math.hypot(dx, dy, dz) || 1;
      const k = (comTracos ? tracos(th, ph) : 0) + off;
      return [b[0] + dx / l * k, b[1] + dy / l * k, b[2] + dz / l * k];
    }
    // normal pela vizinhança (para fora)
    function N(th, ph, comTracos = true) {
      const e = 0.01, a = P(th + e, ph, 0, comTracos), b = P(th - e, ph, 0, comTracos), c = P(th, ph + e, 0, comTracos), d = P(th, ph - e, 0, comTracos);
      const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const p = P(th, ph, 0, comTracos);
      if (n[0] * (p[0] - HC[0]) + n[1] * (p[1] - HC[1]) + n[2] * (p[2] - HC[2]) < 0) n = n.map((x) => -x);
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      return [n[0] / l, n[1] / l, n[2] / l];
    }
    // ângulos (θ, φ) de um ponto (inverso aproximado da forma base)
    function angulos(p) {
      const dx = (p[0] - HC[0]) / (p[0] >= HC[0] ? F.rxF : F.rxT), dy = (p[1] - HC[1]) / F.ry, dz = (p[2] - HC[2]) / (p[2] >= HC[2] ? F.rzT : F.rzB);
      return [Math.atan2(dy, dx), Math.atan2(dz, Math.hypot(dx, dy))];
    }
    return { P, N, angulos };
  }
  // passos regulares de a até b (inclusive) e junção de listas sem repetir as pontas
  function faixa(a, b, passo) { const n = Math.max(1, Math.ceil(Math.abs(b - a) / passo)), out = []; for (let i = 0; i <= n; i++) out.push(a + (b - a) * i / n); return out; }
  function junta(...L) { const out = []; for (const l of L) for (const v of l) if (!out.length || Math.abs(out[out.length - 1] - v) > 1e-6) out.push(v); return out; }
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const soma = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k, p[2] + v[2] * k];

  // ------------------------------------------------------------ montagem
  function build(def) {
    const A = Object.assign({}, def.aparencia), B = CORPO[A.corpo] || CORPO[1], S = paleta(A, def.classe), Q = receita(def.classe, A.roupa), F = FORMA[A.rosto] || FORMA[0];
    const K = { SHY: 6.7 * B.sh, SHZ: 10.6, HIPY: 3.5 * B.hp, HZ0: 2.5, HAND0: 1.4, AUP: 9.8, AFO: 9.6, LTH: 12.8, LSH: 12.2, ANK: 3.6, NECK: 12.5, HAIR: 6.0 };
    const m = MODELS3D.kael.build(K);
    for (const k in m.nodes) m.nodes[k].geo = null;
    m.corpo = new Set(Object.keys(m.nodes).filter((k) => k !== 'blade' && k !== 'hilt'));   // ossos do corpo (o retrato esconde o resto)
    m.anchor('rosto', 'head', [1.6, 0, 7.4]).anchor('topo', 'head', [-0.6, 0, 12.6]);   // enquadramento do retrato
    const L = ligar(m, K), W = L.W, Pt = (o, x, y, z) => ponto(W[o], x, y, z), E = (o) => eixos(W[o]);
    const cab = cabecaDe(F), eH = E('head');
    const hdir = (v) => unit([eH.X[0] * v[0] + eH.Y[0] * v[1] + eH.Z[0] * v[2], eH.X[1] * v[0] + eH.Y[1] * v[1] + eH.Z[1] * v[2], eH.X[2] * v[0] + eH.Y[2] * v[1] + eH.Z[2] * v[2]]);
    const uvR = (nome) => (u, v) => AT.uvReg(nome, cl(u, 0, 1), cl(v, 0, 1));
    const U = (th) => (th + PI) / (2 * PI);
    const corpo = new Malha(), cabeca = new Malha(), roupa = new Malha(), ombro = new Malha(), cabelo = new Malha(), barba = new Malha(), brilho = new Malha();
    const anelOsso = (o, z, extra = {}) => { const e = E(o); return Object.assign({ c: Pt(o, 0, 0, z), X: e.X, Y: e.Y, z, o }, extra); };
    const fora = (o, s) => { const e = E(o); return [e.Y[0] * s, e.Y[1] * s, e.Y[2] * s]; };   // eixo "para fora" de um membro

    // ---------------- tronco (espaço do 'torso'; h = altura local, 0 = 0,5 acima do quadril)
    const kY = (h) => tabela([[-4.6, B.hp], [0.4, B.hp], [2.6, B.wa], [6.6, (B.wa + B.ch) / 2], [8.4, B.ch], [10.9, B.sh], [14.1, 1]], h) * B.w;
    const kX = (h) => 0.45 + 0.55 * kY(h);
    const roupaGrossa = Q.tecido === 'placa' ? 0.35 : Q.tecido === 'acolchoado' || Q.tecido === 'malha' ? 0.28 : 0.18;
    function troncoSec(h, th, extra = 0) {
      const ky = kY(h), kx = kX(h);
      const [dx, dy] = superelipse(th, tabela(TF, h) * kx + extra, tabela(TT, h) * kx + extra, tabela(TB, h) * ky + extra, tabela(TE, h));
      const l = Math.hypot(dx, dy) || 1;
      let r = 0;
      r += (0.25 + 0.9 * B.bu) * B.ch * (bossa(th, h, 0.5, 7.8, 0.32, 1.4) + bossa(th, h, -0.5, 7.8, 0.32, 1.4));            // peito / busto
      r += (0.45 + 0.35 * B.bu) * B.hp * (bossa(th, h, PI - 0.5, -2.4, 0.4, 1.6) + bossa(th, h, -PI + 0.5, -2.4, 0.4, 1.6));   // glúteos
      r += 0.2 * (bossa(th, h, PI - 0.75, 9.5, 0.35, 1.4) + bossa(th, h, -PI + 0.75, 9.5, 0.35, 1.4));                        // escápulas
      r += -0.12 * bossa(th, h, PI, 5, 0.12, 5);                                                                               // coluna
      r += roupaGrossa * suave(1, 2.5, h) + (h < 0.6 ? 0.12 : 0);                                                             // roupa e calça
      return [dx + dx / l * r, dy + dy / l * r];
    }
    const vTronco = (h) => (H1 - h) / (H1 - H0);
    const eT = E('torso');
    function troncoP(th, h, off = 0) { const d = troncoSec(h, th, off), c = Pt('torso', 0, 0, h); return [c[0] + eT.X[0] * d[0] + eT.Y[0] * d[1], c[1] + eT.X[1] * d[0] + eT.Y[1] * d[1], c[2] + eT.X[2] * d[0] + eT.Y[2] * d[1]]; }
    function troncoN(th, h) {
      const a = troncoP(th + 0.02, h), b = troncoP(th - 0.02, h), c = troncoP(th, h + 0.1), d = troncoP(th, h - 0.1);
      return unit(cruz([a[0] - b[0], a[1] - b[1], a[2] - b[2]], [c[0] - d[0], c[1] - d[1], c[2] - d[2]]));
    }
    // pesos do tronco: quadril → tronco na cintura; ombros com o braço; virilha com as coxas; pescoço
    function pesosTronco(h, th, yLocal) {
      const wt = suave(-1.0, 3.0, h), ay = Math.abs(yLocal), lado = yLocal > 0 ? 'R' : 'L';
      const wa = suave(4.0, 6.8, ay) * suave(8.0, 11.0, h) * 0.55, wl = suave(-2.0, -4.6, h) * suave(0.5, 3.2, ay) * 0.5, wh = suave(13.0, 14.6, h) * 0.25;
      const resto = 1 - wa - wl - wh;
      return [['hips', (1 - wt) * resto], ['torso', wt * resto], ['arm' + lado + 'u', wa], ['thigh' + lado, wl], ['head', wh]];
    }
    {
      corpo.novoGrupo();
      const an = junta(faixa(H0, -2.0, 0.65), faixa(-2.0, 12.6, 0.5), faixa(12.6, H1, 0.35)).map((h) => anelOsso('torso', h, { h }));
      tubo(corpo, an, 44, (a, th) => troncoSec(a.h, th), (a, th) => uvR('tronco')(U(th), vTronco(a.h)),
        (a, th) => pesosTronco(a.h, th, troncoSec(a.h, th)[1]), { tampa0: true, ponta: (a) => Pt('torso', 0, 0, a.h - 0.6) });
    }
    // ---------------- pescoço (espaço da 'head')
    {
      corpo.novoGrupo();
      const kw = Math.sqrt(B.w);
      const an = faixa(-2.4, 4.4, 0.7).map((z) => ({ c: Pt('head', 0.05 + z * 0.05, 0, z), X: eH.X, Y: eH.Y, z }));
      tubo(corpo, an, 22, (a, th) => {
        const t = (a.z + 2.4) / 6.8, rx = (2.2 - 0.38 * t) * kw, ry = (2.1 - 0.35 * t) * kw, pomo = 0.18 * bossa(th, a.z, 0, 1.6, 0.25, 0.7);
        return [Math.cos(th) * (rx + pomo), Math.sin(th) * ry];
      }, (a, th) => uvR('pescoco')(U(th), (4.4 - a.z) / 6.8), (a) => { const w = suave(-0.6, 3.2, a.z); return [['torso', 1 - w], ['head', w]]; });
    }
    // ---------------- braços (ombro → punho), mãos e dedos
    const mapaBraco = { vManga: 0, vCotovelo: 0.5 };
    for (const [nm, s] of [['L', -1], ['R', 1]]) {
      const ou = 'arm' + nm + 'u', of = 'arm' + nm + 'f', oh = 'hand' + nm, lb = B.lb;
      const comp = 1.6 + K.AUP + K.AFO + 0.3, aE = 1.6 + K.AUP, aW = aE + K.AFO, an = [];
      for (const z of faixa(1.6, -K.AUP + 0.5, 0.7)) an.push(anelOsso(ou, z, { Y: fora(ou, s), r: secT(SU, z, lb), a: 1.6 - z }));
      for (const z of faixa(-0.35, -K.AFO - 0.3, 0.6)) an.push(anelOsso(of, z, { Y: fora(of, s), r: secT(SF, Math.max(z, -9.9), lb), a: 1.6 + K.AUP - z }));
      mapaBraco.vCotovelo = aE / comp;
      mapaBraco.vManga = Q.manga <= 0 ? 0 : Q.manga >= 1 ? 1 : cl(Q.manga * (aW / comp), 0, 1);
      const manga = (a) => (a.a / comp < mapaBraco.vManga ? 0.16 + (Q.tecido === 'malha' ? 0.1 : 0) : 0);
      corpo.novoGrupo();
      tubo(corpo, an, 24, (a, th) => { const g = manga(a); return superelipse(th, a.r[0] + g, a.r[1] + g, a.r[2] + g, 2.2); },
        (a, th) => uvR('braco')(U(th), a.a / comp), (a) => {
          const wTo = suave(1.4, 0, a.a) * 0.45, wF = suave(aE - 1.0, aE + 1.0, a.a), wH = suave(aW - 0.6, aW + 0.3, a.a);
          return [['torso', wTo], [ou, (1 - wF) * (1 - wTo)], [of, wF * (1 - wH) * (1 - wTo)], [oh, wH * (1 - wTo)]];
        });
      // mão: palma (espaço da mão: X atravessa os nós, Y é a normal da palma, −Z vai para os dedos)
      const ehd = E(oh), lbH = Math.min(1.12, Math.max(0.9, lb));
      corpo.novoGrupo();
      const palma = faixa(0.45, -1.95, 0.3).map((z) => ({ c: Pt(oh, 0.08, 0, z), X: ehd.X, Y: ehd.Y, z }));
      tubo(corpo, palma, 16, (a, th) => {
        const w = tabela([[-1.95, 1.12], [-1.2, 1.12], [-0.3, 1.0], [0.45, 0.82]], a.z) * lbH, t = tabela([[-1.95, 0.4], [-1.2, 0.47], [-0.3, 0.55], [0.45, 0.6]], a.z) * lbH;
        const [dx, dy] = superelipse(th, w, w, t, 3), k = 1 + 0.32 * bossa(th, a.z, -s * PI / 4, -0.7, 0.45, 0.5);   // base do polegar
        return [dx * k, dy * k];
      }, (a, th) => uvR('mao')(U(th), (0.45 - a.z) / 2.4 * 0.45), (a) => { const w = suave(0.0, 0.45, a.z) * 0.4; return [[of, w], [oh, 1 - w]]; },
      { tampa1: true, ponta: (a) => Pt(oh, 0.08, 0, a.z - 0.2) });
      // dedos: falanges que dobram (cada anel no osso da falange; juntas misturadas)
      for (let d = 0; d < 5; d++) {
        const segs = DEDOS[d], ossos = segs.map((_, j) => 'f' + nm + d + 'abc'[j]);
        if (!ossos.every((o) => W[o])) continue;
        const rd = RDEDO[d] * lbH, tot = segs.reduce((x, y) => x + y, 0), af = [anelOsso(ossos[0], 0.3, { r: rd * 1.05, w: [[oh, 0.6], [ossos[0], 0.4]], t: 0 })];
        let acc = 0;
        segs.forEach((Ls, j) => {
          const ult = j === segs.length - 1, zs = ult ? [0, -Ls * 0.4, -Ls * 0.78, -Ls] : [0, -Ls * 0.5];
          zs.forEach((z, k) => {
            const r = rd * (1 - 0.1 * j) * (k === 0 ? 1.08 : 1) * (ult && k === 3 ? 0.82 : 1);
            af.push(anelOsso(ossos[j], z, { r, w: k === 0 && j > 0 ? [[ossos[j - 1], 0.5], [ossos[j], 0.5]] : [[ossos[j], 1]], t: (acc - z) / tot }));
          });
          acc += Ls;
        });
        corpo.novoGrupo();
        tubo(corpo, af, 7, (a, th) => [Math.cos(th) * a.r * 0.95, Math.sin(th) * a.r * 1.05], (a, th) => uvR('mao')((d + U(th)) / 5, 0.45 + 0.55 * a.t), (a) => a.w,
          { tampa1: true, ponta: (a) => Pt(ossos[ossos.length - 1], 0, 0, -segs[segs.length - 1] - a.r * 0.8) });
      }
    }
    // ---------------- pernas (quadril → tornozelo), botas com sola e salto
    const mapaPerna = { vJoelho: 0.5 };
    for (const [nm, s] of [['L', -1], ['R', 1]]) {
      const ot = 'thigh' + nm, os = 'shin' + nm, of = 'foot' + nm, lt = B.lb * Math.sqrt(B.hp), ls = B.lb;
      const comp = 1.6 + K.LTH + K.LSH, aK = 1.6 + K.LTH, calca = 0.14 + (Q.calcaTipo === 'couro' ? 0.04 : 0), an = [];
      for (const z of faixa(1.6, -K.LTH, 0.8)) an.push(anelOsso(ot, z, { Y: fora(ot, s), r: secT(ST, z, lt), a: 1.6 - z }));
      for (const z of faixa(-0.8, -K.LSH, 0.8)) an.push(anelOsso(os, z, { Y: fora(os, s), r: secT(SS, z, ls), a: 1.6 + K.LTH - z }));
      mapaPerna.vJoelho = aK / comp;
      corpo.novoGrupo();
      tubo(corpo, an, 24, (a, th) => { const joelho = 0.28 * bossa(th, a.a, 0, aK, 0.5, 0.9); return superelipse(th, a.r[0] + calca + joelho, a.r[1] + calca, a.r[2] + calca, 2.15); },
        (a, th) => uvR('perna')(U(th), a.a / comp), (a) => {
          const wH = suave(-1.8, 1.6, 1.6 - a.a) * 0.5, wS = suave(aK - 1.0, aK + 1.0, a.a), wF = suave(comp - 0.9, comp, a.a) * 0.4;
          return [['hips', wH], [ot, (1 - wS) * (1 - wH)], [os, wS * (1 - wF) * (1 - wH)], [of, wF]];
        });
      const hB = Q.botaAlta ? 7.4 : 4.4, topoCano = -(K.LSH - hB);
      roupa.novoGrupo();
      const cano = faixa(topoCano, -K.LSH - 0.2, 0.7).map((z) => anelOsso(os, z, { Y: fora(os, s), r: secT(SS, Math.max(z, -12.2), ls) }));
      tubo(roupa, cano, 22, (a, th) => { const g = 0.36 + (a.z > topoCano - 0.75 ? 0.22 : 0); return superelipse(th, a.r[0] + g, a.r[1] + g, a.r[2] + g, 2.3); },
        (a, th) => uvR('bota')(U(th), 0.55 * (topoCano - a.z) / (hB + 0.2)), (a) => { const w = suave(-K.LSH + 1.2, -K.LSH - 0.2, a.z) * 0.45; return [[os, 1 - w], [of, w]]; });
      const ef = E(of), Ypé = fora(of, s), xs = faixa(-2.75, 6.4, 0.45), kp = Math.min(1.1, ls);
      roupa.novoGrupo();
      tubo(roupa, xs.map((x) => ({ c: Pt(of, x, 0, pe(x, kp)[0]), X: ef.Z, Y: Ypé, x })), 18, (a, th) => { const [, w, hh] = pe(a.x, kp); return superelipse(th, hh + 0.3, hh + 0.08, w + 0.3, 3.2); },
        (a, th) => uvR('bota')(U(th), 0.55 + 0.45 * (a.x + 2.75) / 9.15), (a) => { const w = 0.2 * Math.exp(-a.x * a.x / 0.8); return [[os, w], [of, 1 - w]]; },
        { tampa0: true, tampa1: true, ponta: (a, dir) => Pt(of, a.x + dir * 0.35, 0, pe(a.x, kp)[0] - 0.1) });
      roupa.novoGrupo();
      tubo(roupa, xs.map((x) => ({ c: Pt(of, x, 0, -3.42), X: ef.Z, Y: Ypé, x })), 14, (a, th) => { const w = pe(a.x, kp)[1], salto = a.x < -1.1 ? 0.28 : 0; const [dz, dy] = superelipse(th, 0.18 + salto, 0.2, w + 0.4, 6); return [dz + salto * 0.5, dy]; },
        (a, th) => uvR('sola')(U(th), (a.x + 2.75) / 9.15), () => [[of, 1]], { tampa0: true, tampa1: true });
    }
    // ---------------- cabeça: crânio e rosto numa grade só (o rosto com grade fina e textura própria)
    {
      cabeca.novoGrupo();
      const R = AT.ROSTO;
      const TH = junta(faixa(-PI, R.t0, 0.15), faixa(R.t0, -0.5, 0.05), faixa(-0.5, 0.5, 0.032), faixa(0.5, R.t1, 0.05), faixa(R.t1, PI, 0.15));
      const PH = junta(faixa(PI / 2, R.f0, 0.1), faixa(R.f0, 0.28, 0.045), faixa(0.28, -0.62, 0.026), faixa(-0.62, R.f1, 0.045), faixa(R.f1, -1.32, 0.06));
      const dentro = (th, ph) => th >= R.t0 - 1e-6 && th <= R.t1 + 1e-6 && ph <= R.f0 + 1e-6 && ph >= R.f1 - 1e-6;
      const arcano = !!S.olhoE, cache = {};
      const vert = (i, j, rosto) => {
        const k = `${i},${j},${rosto ? 1 : 0}`;
        if (cache[k] !== undefined) return cache[k];
        const th = TH[i], ph = PH[j], p = cab.P(th, ph);
        let uv;
        if (rosto) { const q = AT.uvRosto(th, ph), brilho = arcano && Math.abs(Math.abs(th) - AT.FACE.olho[0]) < 0.2 && Math.abs(ph - AT.FACE.olho[1]) < 0.1 ? 1 : 0; uv = [q[0], q[1], brilho]; }
        else uv = AT.uvCab(th, ph);
        return (cache[k] = cabeca.v(Pt('head', p[0], p[1], p[2]), uv, [['head', 1]]));
      };
      for (let j = 0; j < PH.length - 1; j++) for (let i = 0; i < TH.length - 1; i++) {
        const ro = dentro((TH[i] + TH[i + 1]) / 2, (PH[j] + PH[j + 1]) / 2);
        cabeca.quad(vert(i, j, ro), vert(i + 1, j, ro), vert(i + 1, j + 1, ro), vert(i, j + 1, ro));
      }
      // orelhas: concha achatada, inclinada para trás, um pouco afastada do crânio
      for (const s of [-1, 1]) {
        cabeca.novoGrupo();
        const th = s * 1.6, p0 = cab.P(th, 0.02), n0 = cab.N(th, 0.02, false), fw = [s * Math.sin(th), -s * Math.cos(th), 0], tilt = 0.28;
        const ax = [-fw[0] * Math.sin(tilt), -fw[1] * Math.sin(tilt), Math.cos(tilt)];
        const c = soma(soma(soma(p0, n0, 0.18), fw, -0.25), [0, 0, 1], 0.15);
        const an = faixa(-1, 1, 0.2).map((t) => ({ c: Pt('head', ...soma(c, ax, t * 1.05)), X: hdir(n0), Y: hdir(fw), t }));
        tubo(cabeca, an, 12, (a, t2) => { const k = Math.sqrt(Math.max(0, 1 - a.t * a.t)) * (a.t > 0.3 ? 1 : 0.85 + 0.15 * (a.t + 1) / 1.3); return [Math.cos(t2) * 0.3 * k + 0.08, Math.sin(t2) * 0.62 * k]; },
          (a, t2) => uvR('pele')(U(t2), (a.t + 1) / 2), () => [['head', 1]]);
      }
    }
    const headP = (th, ph, off = 0, tr = true) => { const p = cab.P(th, ph, off, tr); return Pt('head', p[0], p[1], p[2]); };
    const headN = (th, ph) => hdir(cab.N(th, ph));

    // ---------------- cabelo
    {
      const st = A.cabelo, linha = AT.linhaCabelo;
      semente = 4242 + st * 97 + A.corCabelo;
      const pesoCab = (p) => {   // longo, rabo e tranças: as pontas seguem o osso 'hair' (balançam)
        const loc = ponto(L.inv.head, p[0], p[1], p[2]), w = suave(4.5, -2.5, loc[2]) * 0.85;
        return [['head', 1 - w], ['hair', w]];
      };
      const off = [0.05, 0.28, 0.24, 0.34, 0.12, 0.16, 0.12, 0.12][st];
      if (st !== 0) {   // calota: da linha do cabelo até o alto, afastada da cabeça
        cabelo.novoGrupo();
        const TH = faixa(-PI, PI, 2 * PI / 56), NR = 14;
        const col = TH.map((th) => {
          const f0 = linha(th) - 0.03, out = [];
          for (let k = 0; k <= NR; k++) {
            const t = k / NR, ph = f0 + (PI / 2 - f0) * t, o = off * suave(0, 0.32, t) + 0.03;
            out.push({ v: cabelo.v(headP(th, ph, o, false), AT.uvReg('cabelo', U(th), 1 - t), [['head', 1]]), lado: Math.abs(Math.sin(th)) * Math.cos(ph) });
          }
          return out;
        });
        for (let i = 0; i < TH.length - 1; i++) for (let k = 0; k < NR; k++) {
          if (st === 5 && Math.max(col[i][k].lado, col[i + 1][k + 1].lado) > 0.3) continue;   // moicano: só a faixa do meio
          cabelo.quad(col[i][k].v, col[i + 1][k].v, col[i + 1][k + 1].v, col[i][k + 1].v);
        }
      }
      // mecha: tubo achatado ao longo de pontos (espaço do modelo), com a face larga encostada na cabeça
      const hcM = Pt('head', HC[0], HC[1], HC[2]);
      const mecha = (M, pts, larg, esp, u0, pesos = null) => {
        if (pts.length < 2) return;
        M.novoGrupo();
        const c0 = pts[0], an = aneisCurva(pts, [c0[0] - hcM[0], c0[1] - hcM[1], c0[2] - hcM[2]]);
        tubo(M, an, 5, (a, th) => { const k = 1 - 0.82 * Math.pow(a.t, 1.25); return [Math.cos(th) * esp * (1 - 0.5 * a.t) * k + esp * 0.35, Math.sin(th) * larg * k]; },
          (a, th) => AT.uvReg(M === barba ? 'barba' : 'cabelo', u0 + U(th) * 0.1, a.t), (a, th, p) => (pesos ? pesos(p) : [['head', 1]]), { tampa1: true });
      };
      const sobre = (th, ph, o) => cab.P(th, ph, o, false);
      // marcha sobre a cabeça, afastando-se de um ponto (a coroa ou a risca), presa à superfície
      const marcha = (th0, ph0, o0, o1, passos, passo, fonte, parar) => {
        let th = th0, ph = ph0;
        const pts = [];
        for (let k = 0; k <= passos; k++) {
          const pl = sobre(th, ph, o0 + (o1 - o0) * k / passos);
          pts.push(pl);
          if (parar && parar(th, ph, k)) break;
          const ft = fonte(th, ph), prox = [pl[0] + (pl[0] - ft[0]) * 0.15, pl[1] + (pl[1] - ft[1]) * 0.15, pl[2] + (pl[2] - ft[2]) * 0.15];
          const [t2, p2] = cab.angulos(prox), dt = Math.atan2(Math.sin(t2 - th), Math.cos(t2 - th)), dp = p2 - ph, dl = Math.hypot(dt * Math.cos(ph), dp) || 1;
          th += dt / dl * passo; ph = Math.min(ph + dp / dl * passo, PI / 2 - 0.02);
        }
        return pts;
      };
      const toM = (pts) => pts.map((p) => Pt('head', p[0], p[1], p[2]));
      const raizes = (n) => { const out = []; for (let i = 0; i < n; i++) { const th = -PI + 2 * PI * rnd(), f0 = linha(th) + 0.06; out.push([th, f0 + (1.45 - f0) * Math.pow(rnd(), 0.8)]); } return out; };
      if (st === 1 || st === 2) {   // curto (e a base do topete): penteado para trás, para longe da testa
        const k = st === 2 ? 0.6 : 1, testa = () => [HC[0] + 8, 0, HC[2] + 1.5];
        for (const [th, ph] of raizes(70)) mecha(cabelo, toM(marcha(th, ph, off * 0.6, off + 0.12, 5, (0.13 + rnd() * 0.07) * k, testa, (t, p) => p < linha(t) + 0.02)), 0.5, 0.2, rnd() * 0.88);
        if (st === 2) for (let i = 0; i < 22; i++) {   // topete: sobe na testa e volta para trás
          const th = (rnd() - 0.5) * 0.85, ph = linha(th) + 0.02 + rnd() * 0.12, pts = [];
          for (let j = 0; j <= 8; j++) { const t = j / 8; pts.push(sobre(th * (1 - t * 0.5), ph + t * (0.75 + rnd() * 0.1), off + 0.1 + Math.sin(t * PI * 0.85) * (0.9 + rnd() * 0.4))); }
          mecha(cabelo, toM(pts), 0.5, 0.24, rnd() * 0.88);
        }
      } else if (st === 3) {   // longo: reparte no meio, desce pelos lados; cai nas costas e até os ombros
        for (const [th0, ph0] of raizes(84)) {
          const lado = Math.sign(Math.sin(th0)) || 1, costas = Math.cos(th0) < -0.25;
          const fonte = costas ? () => [HC[0] + 3, 0, 16] : () => [HC[0] + 1, -lado * 2.5, 15];
          const pts = marcha(th0, ph0, off * 0.7, off + 0.15, 7, 0.17, fonte, (t, p) => p < (costas ? -0.25 : 0.05));
          let p = pts[pts.length - 1];
          const zFim = costas ? -5.5 - rnd() * 1.5 : 0.4 + rnd() * 0.8;
          for (let j = 0; j < 8 && p[2] > zFim; j++) {
            p = [p[0] - (costas ? 0.25 : 0.05), p[1] + lado * 0.05, p[2] - 1.15];
            if (costas) p[0] = Math.min(p[0], -3.9 - rnd() * 0.3);
            else { p[1] = lado * Math.max(Math.abs(p[1]), 3.95 + 0.15 * rnd()); if (p[2] < 3) p[0] = Math.max(p[0], -0.8); }
            pts.push(p);
          }
          mecha(cabelo, toM(pts), 0.6, 0.26, rnd() * 0.88, pesoCab);
        }
      } else if (st === 4) {   // rabo de cavalo: preso atrás, cai sobre a nuca e as costas
        const T = sobre(PI, 0.45, off + 0.15);
        for (let i = 0; i < 18; i++) {
          const a = rnd() * 2 * PI, r = rnd() * 0.35;
          const ctrl = [[T[0], T[1] + Math.cos(a) * r, T[2] + Math.sin(a) * r], [T[0] - 0.8, T[1] + Math.cos(a) * r * 1.4, T[2] - 0.6], [T[0] - 1.0, T[1] + Math.cos(a) * 0.5, T[2] - 3.0], [-4.7, Math.cos(a) * 0.7, T[2] - 6.0], [-4.3, Math.cos(a) * 0.9, T[2] - 8.8 - rnd()]];
          mecha(cabelo, toM(curva(ctrl, 10)), 0.62, 0.3, rnd() * 0.88, pesoCab);
        }
        cabelo.novoGrupo();   // presilha na cor dos detalhes
        tubo(cabelo, [-0.25, 0, 0.25].map((t) => ({ c: Pt('head', T[0] - 0.15 + t * 0.6, T[1], T[2] - t * 0.5), X: hdir([0, 0, 1]), Y: hdir([0, 1, 0]), t })), 10,
          (a, th) => [Math.cos(th) * 0.55, Math.sin(th) * 0.55], () => ({ cor: S.det, mat: 2 }), () => [['head', 1]]);
      } else if (st === 5) {   // moicano: crista do meio, para cima e para trás
        for (let i = 0; i < 24; i++) {
          const t0 = i / 23, th = t0 < 0.5 ? 0 : PI, ph = t0 < 0.5 ? 0.52 + t0 * 2 * (PI / 2 - 0.52) : PI / 2 - (t0 - 0.5) * 2 * (PI / 2 + 0.15);
          const dl = (i % 2 ? 1 : -1) * 0.04, p0 = sobre(th + dl, ph, 0.1), n = cab.N(th + dl, ph, false), h = 2.0 + Math.sin(t0 * PI) * 1.3;
          mecha(cabelo, toM([0, 0.33, 0.66, 1].map((t) => [p0[0] + n[0] * h * t - t * t * 0.9, p0[1] + n[1] * h * t, p0[2] + n[2] * h * t])), 0.7, 0.3, rnd() * 0.88);
        }
      } else if (st === 6) {   // tranças atrás das orelhas
        for (const s of [-1, 1]) {
          const r0 = sobre(s * 2.25, -0.08, off + 0.1);
          const pts = toM(curva([r0, [r0[0] - 0.7, r0[1] + s * 0.3, r0[2] - 2.5], [-4.1, s * 2.6, r0[2] - 6.0], [-4.2, s * 2.4, r0[2] - 10.5]], 26).map((p, k) => [p[0], p[1] + (k % 2 ? 0.14 : -0.14), p[2]]));
          cabelo.novoGrupo();
          tubo(cabelo, aneisCurva(pts, [0, s, 0]), 7, (a, th) => { const r = 0.62 * (1 - 0.3 * a.t) * (0.78 + 0.22 * Math.abs(Math.sin(a.t * 13 * PI))); return [Math.cos(th) * r, Math.sin(th) * r]; },
            (a, th) => AT.uvReg('cabelo', 0.4 + U(th) * 0.1, (a.t * 6) % 1), (a, th, p) => pesoCab(p), { tampa1: true });
          const fim = pts[pts.length - 1];
          cabelo.novoGrupo();
          tubo(cabelo, [0, 1].map((t) => ({ c: [fim[0], fim[1], fim[2] + 0.5 - t * 0.6], X: [1, 0, 0], Y: [0, 1, 0], t })), 8, (a, th) => [Math.cos(th) * 0.5, Math.sin(th) * 0.5], () => ({ cor: S.det, mat: 2 }), (a, th, p) => pesoCab(p));
        }
      } else if (st === 7) {   // coque no alto de trás, com dois grampos
        const C = sobre(PI, 0.82, off + 1.1);
        cabelo.novoGrupo();
        tubo(cabelo, faixa(-1, 1, 0.2).map((t) => ({ c: Pt('head', C[0] - t * 0.3, C[1], C[2] + t * 1.25), X: hdir([1, 0, 0]), Y: hdir([0, 1, 0]), t })), 14,
          (a, th) => { const r = 1.75 * Math.sqrt(Math.max(0.02, 1 - a.t * a.t)); return [Math.cos(th) * r, Math.sin(th) * r]; },
          (a, th) => AT.uvReg('cabelo', U(th), (a.t + 1) / 2), () => [['head', 1]], { tampa0: true, tampa1: true });
        for (const s of [-1, 1]) {
          cabelo.novoGrupo();
          tubo(cabelo, [0, 1].map((t) => ({ c: Pt('head', C[0] + 0.3, C[1] + s * (-1.6 + 3.2 * t), C[2] + 0.4 + t * 0.4 * s), X: hdir([1, 0, 0]), Y: hdir([0, 0, 1]), t })), 6,
            (a, th) => [Math.cos(th) * 0.09, Math.sin(th) * 0.09], () => ({ cor: [0.75, 0.62, 0.3], mat: 1 }), () => [['head', 1]]);
        }
      }
      // barba: cavanhaque e cheia em casca; bigode em mechas
      if (A.barba === 2 || A.barba === 4) {
        barba.novoGrupo();
        const cheia = A.barba === 4, T0 = cheia ? -1.25 : -0.36, T1 = -T0, fundo = cheia ? -1.18 : -1.0, NR = 10;
        const topo = (th) => (cheia ? tabela([[0, -0.4], [0.25, -0.4], [0.45, -0.3], [0.7, -0.16], [1.0, -0.08], [1.25, 0.0]], Math.abs(th)) : -0.58);
        const TH = faixa(T0, T1, cheia ? 0.08 : 0.06);
        const V = TH.map((th) => { const f0 = topo(th), out = []; for (let k = 0; k <= NR; k++) { const t = k / NR, ph = f0 + (fundo - f0) * t, o = 0.03 + (cheia ? 0.62 : 0.38) * suave(0, 0.75, t) * (1 - 0.35 * Math.abs(th) / Math.max(0.3, T1)); out.push({ ph, v: barba.v(headP(th, ph, o), AT.uvReg('barba', (th - T0) / (T1 - T0), t), [['head', 1]]) }); } return out; });
        for (let i = 0; i < TH.length - 1; i++) for (let k = 0; k < NR; k++) {
          const thc = (TH[i] + TH[i + 1]) / 2, phc = (V[i][k].ph + V[i][k + 1].ph) / 2;
          if (cheia && Math.abs(thc) < 0.2 && phc > -0.6 && phc < -0.4) continue;   // a boca fica livre
          barba.quad(V[i][k].v, V[i + 1][k].v, V[i + 1][k + 1].v, V[i][k + 1].v);
        }
      }
      if (A.barba >= 2) for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {   // bigode
        mecha(barba, [[0.03 + i * 0.035, -0.39], [0.15 + i * 0.03, -0.425], [0.28 + i * 0.012, -0.5 - i * 0.02], [0.31, -0.58 - i * 0.02]].map(([t, f], k) => headP(s * t, f, 0.05 + 0.08 * (1 - k / 3))), 0.42, 0.08, 0.2 + rnd() * 0.6);
      }
    }

    // ---------------- roupa: saia / manto, mangas largas, cinto, bolsas, gola, capuz, bandoleira, braçadeiras, ombreiras
    const hips = 'hips', eHips = E(hips);
    if (Q.saia > 0) {
      roupa.novoGrupo();
      const hEnd = 1.6 - Q.saia * 26, comp = 1.6 - hEnd, longa = Q.saia > 0.6, pernas = K.HIPY + 3.0 * B.lb * Math.sqrt(B.hp) + 0.5;
      tubo(roupa, faixa(1.6, hEnd, 0.8).map((h) => ({ c: Pt(hips, 0, 0, h), X: eHips.X, Y: eHips.Y, h })), 40, (a, th) => {
        // perto do cinto segue o quadril; abaixo abre para envolver as duas pernas
        const t = troncoSec(Math.max(a.h - 0.5, H0 + 0.01), th, 0.32), r1 = Math.hypot(t[0], t[1]) || 1;
        const abre = Math.max(0, -a.h) * (longa ? 0.07 : 0.05), el = superelipse(th, 3.6 * B.hp + abre, 3.9 * B.hp + abre, pernas + abre, 2.4), r2 = Math.hypot(el[0], el[1]);
        const r = Math.max(r1, r1 + (r2 - r1) * suave(0.5, -4.0, a.h));
        return [t[0] / r1 * r, t[1] / r1 * r];
      }, (a, th) => uvR('saia')(U(th), (1.6 - a.h) / comp), (a, th) => {
        const wP = suave(0.8, -3.5, a.h), wH = longa ? suave(-8, -17, a.h) : suave(-6, -12, a.h) * 0.6, gd = th * 180 / PI;
        const i = ABAS.findIndex((q, k) => k < ABAS.length - 1 && gd >= q[1] && gd < ABAS[k + 1][1]);
        let a0, a1, f;
        if (i < 0) { a0 = ABAS[ABAS.length - 1]; a1 = ABAS[0]; f = ((gd - a0[1] + 360) % 360) / (360 - a0[1] + a1[1]); }
        else { a0 = ABAS[i]; a1 = ABAS[i + 1]; f = (gd - a0[1]) / (a1[1] - a0[1]); }
        return [[hips, 1 - wP], [a0[0], wP * (1 - f) * (1 - wH)], [a0[0] + '2', wP * (1 - f) * wH], [a1[0], wP * f * (1 - wH)], [a1[0] + '2', wP * f * wH]];
      }, {
        buraco: (a, th) => {
          if (Q.saiaFenda && Math.abs(th) < 0.13 && a.h < hEnd * 0.4) return true;               // fenda na frente
          if (longa && Math.abs(Math.abs(th) - PI) < 0.11 && a.h < hEnd * 0.5) return true;       // e atrás no manto
          if (Q.saiaTiras && a.h < -1.2) return (U(th) * 12) % 1 < 0.07;                         // tiras
          return false;
        },
      });
    }
    if (Q.mangaLarga) for (const [nm, s] of [['L', -1], ['R', 1]]) {   // mangas largas: abrem do cotovelo ao punho
      roupa.novoGrupo();
      const of = 'arm' + nm + 'f', oh = 'hand' + nm;
      tubo(roupa, faixa(-0.4, -K.AFO - 1.4, 0.7).map((z) => anelOsso(of, z, { Y: fora(of, s), t: (-0.4 - z) / (K.AFO + 1.0) })), 20,
        (a, th) => { const r = (1.7 - 0.5 * a.t) * B.lb + 0.3 + 1.3 * Math.pow(a.t, 1.6); return [Math.cos(th) * r - a.t * 0.35, Math.sin(th) * r]; },
        (a, th) => uvR('saia')(U(th), 0.4 + 0.6 * a.t), (a) => { const w = suave(0.75, 1.0, a.t) * 0.3; return [[of, 1 - w], [oh, w]]; });
    }
    {   // cinto (ou faixa), fivela e bolsas
      roupa.novoGrupo();
      const faixaC = Q.cinto === 'faixa', hs = [-0.75, -0.55, faixaC ? 1.9 : 1.25, faixaC ? 2.1 : 1.45];
      tubo(roupa, hs.map((h, i) => anelOsso('torso', h, { h, k: i })), 44, (a, th) => troncoSec(a.h, th, a.k === 0 || a.k === 3 ? 0.14 : 0.34), (a, th) => uvR('cinto')(U(th), a.k / 3), (a, th) => pesosTronco(a.h, th, 0));
      const peca = (th, h, w, hh, cor, mat) => {
        roupa.novoGrupo();
        const p = troncoP(th, h, 0.42), n = troncoN(th, h), lat = unit(cruz(n, eT.Z));
        tubo(roupa, [-1, 1].map((t) => ({ c: soma(p, eT.Z, hh * t), X: n, Y: lat, t })), 4, (a, t2) => superelipse(t2, 0.2, 0.2, w, 8), () => ({ cor, mat }), () => pesosTronco(h, th, 0),
          { tampa0: true, tampa1: true, th0: -PI * 0.75, th1: PI * 1.25 });
      };
      if (!faixaC) peca(0, 0.35, 0.72, 0.58, S.metal, 1);
      else peca(0.35, 1.0, 0.5, 0.5, escuro(S.det, 0.15), 3);   // nó da faixa
      for (const th of [-1.95, 1.95, -2.45, 2.45, PI].slice(0, Q.bolsas || 0)) {
        roupa.novoGrupo();
        const p = troncoP(th, -0.35, 0.95), n = troncoN(th, -0.35), lat = unit(cruz(n, eT.Z));
        tubo(roupa, faixa(-1, 1, 0.5).map((t) => ({ c: soma(p, eT.Z, 0.9 * t - 0.4), X: n, Y: lat, t })), 12, (a, t2) => { const k = a.t > 0.6 ? 1.08 : 1; return superelipse(t2, 0.6 * k, 0.45, 0.78 * k, 3.5); },
          (a, t2) => uvR('bolsa')(U(t2), (1 - a.t) / 2), () => pesosTronco(-0.35, th, 0), { tampa0: true, tampa1: true });
      }
    }
    if (Q.gola === 1) {   // gola alta, aberta em V na frente
      roupa.novoGrupo();
      const kw = Math.sqrt(B.w), sec = [[12.0, null], [12.9, [2.55, 2.7, 3.45]], [13.8, [2.25, 2.35, 2.7]], [14.6, [2.3, 2.4, 2.75]], [15.2, [2.65, 2.7, 3.05]]];
      tubo(roupa, sec.map(([h, r], i) => anelOsso('torso', h, { h, r, k: i })), 30, (a, th) => (a.r ? superelipse(th, a.r[0] * kw, a.r[1] * kw, a.r[2] * kw, 2.2) : troncoSec(a.h, th, 0.3)),
        (a, th) => uvR('gola')(U(th), 1 - a.k / 4), (a) => [['torso', 1 - 0.18 * a.k / 4], ['head', 0.18 * a.k / 4]], { buraco: (a, th) => a.k >= 1 && Math.abs(th) < 0.42 });
    } else if (Q.gola === 2) {   // capuz caído: rolo atrás do pescoço e o pano sobre as costas
      roupa.novoGrupo();
      const pts = faixa(-1.75, 1.75, 0.18).map((t) => soma(troncoP(PI + t, 12.7, 0.55 + 0.35 * Math.cos(t * 0.9)), eT.Z, 0.35));
      tubo(roupa, aneisCurva(pts, eT.Z), 10, (a, th) => { const r = 0.62 + 0.45 * Math.cos((a.t - 0.5) * PI); return [Math.cos(th) * r, Math.sin(th) * r]; },
        (a, th) => uvR('gola')(a.t, U(th)), () => [['torso', 0.85], ['head', 0.15]], { tampa0: true, tampa1: true });
      roupa.novoGrupo();
      const ths = faixa(PI - 1.05, PI + 1.05, 0.15), hs = faixa(12.6, 8.2, 0.55);
      const V = ths.map((th) => hs.map((h, k) => { const pt = Math.abs(th - PI) / 1.05, hh = Math.min(12.6, h + (h < 9.5 ? pt * 1.8 * (9.5 - h) / 1.3 : 0)); return roupa.v(troncoP(th, hh, 0.42), uvR('gola')((th - PI + 1.05) / 2.1, k / (hs.length - 1)), pesosTronco(hh, th, 0)); }));
      for (let i = 0; i < ths.length - 1; i++) for (let k = 0; k < hs.length - 1; k++) roupa.quad(V[i][k], V[i + 1][k], V[i + 1][k + 1], V[i][k + 1]);
    }
    if (Q.bandoleira) {   // tira de couro do ombro direito ao quadril esquerdo, dando a volta
      roupa.novoGrupo();
      const ctrl = [[0.62, 12.0], [1.2, 13.0], [1.75, 12.8], [2.45, 11.6], [2.85, 8], [3.28, 4.5], [3.88, 1.0], [4.38, -0.3], [4.93, -0.6], [5.33, 0.2], [5.88, 4], [6.53, 8.5], [6.9, 12.0]].map(([t, h]) => [t, h, 0]);
      const cur = curva(ctrl, 70), pts = cur.map(([t, h]) => troncoP(t, h, 0.32)), lin = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const bn = unit(cruz(troncoN(cur[i][0], cur[i][1]), [b[0] - a[0], b[1] - a[1], b[2] - a[2]])), w = pesosTronco(cur[i][1], cur[i][0], Math.sin(cur[i][0]) * 6);
        lin.push([roupa.v(soma(pts[i], bn, -0.55), uvR('extra')((i / 10) % 1, 0), w), roupa.v(soma(pts[i], bn, 0.55), uvR('extra')((i / 10) % 1, 1), w)]);
      }
      for (let i = 0; i < lin.length - 1; i++) roupa.quad(lin[i][0], lin[i + 1][0], lin[i + 1][1], lin[i][1]);
    }
    if (Q.bracadeira) for (const [nm, s] of [['L', -1], ['R', 1]]) {
      roupa.novoGrupo();
      const of = 'arm' + nm + 'f', oh = 'hand' + nm, zs = faixa(-3.0, -K.AFO + 0.25, 0.6), g = Q.mangaLarga ? 0.1 : 0.3;
      tubo(roupa, zs.map((z, k) => anelOsso(of, z, { Y: fora(of, s), r: secT(SF, z, B.lb), k, t: k / (zs.length - 1) })), 20,
        (a, th) => { const rim = a.k === 0 || a.k === zs.length - 1 ? 0.12 : 0; return superelipse(th, a.r[0] + g + rim, a.r[1] + g + rim, a.r[2] + g + rim, 2.3); },
        (a, th) => uvR('bracadeira')(U(th), a.t), (a) => { const w = suave(0.8, 1, a.t) * 0.3; return [[of, 1 - w], [oh, w]]; });
    }
    if (Q.ombreiras) for (const [nm, s] of [['L', -1], ['R', 1]]) {   // (escondidas quando o Arsenal veste as dele)
      if (Q.ombreiras === 3 && s > 0) continue;
      const ou = 'arm' + nm + 'u', o = fora(ou, s), eu = E(ou);
      for (const [z0, z1, r0, r1] of [[2.5, -1.6, 0.7, 3.05], [-1.2, -2.9, 3.15, 3.05]]) {
        ombro.novoGrupo();
        tubo(ombro, faixa(z0, z1, 0.45).map((z, k, L2) => ({ c: soma(Pt(ou, 0, 0, z), o, 0.4), X: eu.X, Y: o, z, t: k / (L2.length - 1) })), 18,
          (a, th) => { const r = (r0 + (r1 - r0) * Math.sin(a.t * PI / 2)) * Math.max(0.95, B.lb); return [Math.cos(th) * r * 1.02, Math.sin(th) * r]; },
          (a, th) => uvR('ombro')((th + 0.5) / (PI + 1.0), a.t), (a) => { const w = 0.3 * (1 - a.t); return [['torso', w], [ou, 1 - w]]; }, { th0: -0.5, th1: PI + 0.5 });
      }
    }
    // ---------------- brilho: runas acesas e a gema do emblema (cor da classe)
    const runa = (p, n, tam, pesos, cor = S.runa, e = 1) => {
      brilho.novoGrupo();
      const d = n[2], up = unit([-d * n[0], -d * n[1], 1 - d * n[2]]), lt = cruz(n, up), at = { cor, mat: 0, e };
      const q = (a, b) => soma(soma(soma(p, up, a * tam), lt, b * tam), n, 0.05);
      const tira = (a0, b0, a1, b1, w) => { const dx = b1 - b0, dy = a1 - a0, l = Math.hypot(dx, dy) || 1, ox = -dy / l * w, oy = dx / l * w; const v = [q(a0 + oy, b0 + ox), q(a1 + oy, b1 + ox), q(a1 - oy, b1 - ox), q(a0 - oy, b0 - ox)].map((pp) => brilho.v(pp, at, pesos)); brilho.quad(v[0], v[1], v[2], v[3]); };
      tira(-0.5, 0, 0.5, 0, 0.07); tira(0.5, 0, 0.1, 0.35, 0.06); tira(0.1, 0.35, -0.2, 0, 0.06); tira(-0.15, 0, -0.5, 0.3, 0.05);
    };
    if (A.marcas === 4) {   // runas acesas no rosto e nos braços
      for (const s of [-1, 1]) for (const [t, f] of [[0.5, -0.12], [0.53, -0.3], [0.47, -0.48]]) runa(headP(s * t, f, 0.02), headN(s * t, f), 0.36, [['head', 1]]);
      runa(headP(0, 0.42, 0.02), headN(0, 0.42), 0.46, [['head', 1]]);
      for (const [nm, s] of [['L', -1], ['R', 1]]) { const ou = 'arm' + nm + 'u', o = fora(ou, s); for (const z of [-3.2, -5.4]) runa(soma(Pt(ou, 0, 0, z), o, 2.25), o, 0.55, [[ou, 1]]); }
    }
    if (Q.runas) {   // roupa rúnica: na barra da peça de cima e nas braçadeiras
      for (const [nm, s] of [['L', -1], ['R', 1]]) if (Q.bracadeira) { const of = 'arm' + nm + 'f', o = fora(of, s); for (const z of [-4.2, -6.4]) runa(soma(Pt(of, 0, 0, z), o, 1.95), o, 0.5, [[of, 1]]); }
      for (let k = 0; k < 10; k++) { const th = -PI + (k + 0.5) * 2 * PI / 10; runa(troncoP(th, 2.1, 0.1), troncoN(th, 2.1), 0.42, pesosTronco(2.1, th, Math.sin(th) * 4)); }
    }
    if (Q.emblema || Q.tabardo) {   // gema no emblema do peito
      const th = Q.tabardo ? 0 : -0.283, h = H1 - 0.3 * (H1 - H0), p = troncoP(th, h, 0.12), n = troncoN(th, h), lt = unit(cruz(n, eT.Z)), r = Q.tabardo ? 0.42 : 0.3, w = pesosTronco(h, th, 0);
      brilho.novoGrupo();
      const c = brilho.v(soma(p, n, 0.12), { cor: S.runa, mat: 0, e: 0.9 }, w);
      const vs = [[1, 0], [0, 0.75], [-1, 0], [0, -0.75]].map(([a, b]) => brilho.v(soma(soma(p, eT.Z, a * r), lt, b * r), { cor: escuro(S.runa, 0.25), mat: 0, e: 0.6 }, w));
      for (let i = 0; i < 4; i++) brilho.tri(c, vs[i], vs[(i + 1) % 4]);
    }

    // ---------------- textura, peles, armas
    const tex = AT.pintar(S, Q, A, { tronco: { vCinto0: vTronco(1.45), vCinto1: vTronco(-0.55) }, braco: mapaBraco, perna: mapaPerna });
    m.tex = { canvas: tex.cor, mat: tex.mat, bump: 0.4, pbr: true, glow: S.olhoE ? [...S.olho, 1.3] : null };
    const peles = { corpo: corpo.pele(m, L.inv, 'corpo'), cabeca: cabeca.pele(m, L.inv, 'cabeca'), roupa: roupa.pele(m, L.inv, 'roupa') };
    if (ombro.nv) peles.ombreiras = ombro.pele(m, L.inv, 'ombreiras');
    if (cabelo.nv) peles.cabelo = cabelo.pele(m, L.inv, 'cabelo');
    if (barba.nv) peles.barba = barba.pele(m, L.inv, 'barba');
    if (brilho.nv) peles.brilho = brilho.pele(m, L.inv, 'brilho');
    m.skins = Object.values(peles);
    m.peles = peles;
    m.sec = true;   // cabelo e saia com movimento secundário (molas do rig do Kael)
    // medidas para as peças do Arsenal: o corpo e a cabeça (o cabelo só dá uma folga no capacete)
    if (typeof PecasRig !== 'undefined' && PecasRig.medidas) {
      const R = PecasRig.medidas({ skins: [peles.corpo, peles.cabeca] });
      if (R && R.head) { const hd = R.head, mg = A.cabelo === 0 ? 0.1 : 0.45; R.head = { x0: hd.x0 - mg, x1: hd.x1, y0: hd.y0 - mg, y1: hd.y1 + mg, z0: hd.z0, z1: hd.z1 + mg }; }
      m.medidasPecas = R;
    }
    return finalizar(m, def);
  }
  // Arma da base da classe (a Tempestade Nula do Kael, procedural ou a GLB, ou a do kit do herói) e
  // os ganchos das peças do Arsenal; também no modelo com as peças GLB (js/criacao/montagem.js)
  function finalizar(m, def) {
    const base = def.base, Wp = typeof HERO_WEAPONS !== 'undefined' && HERO_WEAPONS[base], n = m.nodes;
    if (base === 'kael') {
      const conv = (g) => { const a = new Float32Array(g.d); for (let i = 0; i < a.length; i += 10) a[i + 8] = -1 - a[i + 8]; return a; };   // cores no formato da textura
      n.blade.geo = conv(buildTempestadeNula(new G3(), 1, 'blade', 0)); n.hilt.geo = conv(buildTempestadeNula(new G3(), 1, 'hilt', 0));
      if (typeof WeaponRig !== 'undefined' && WeaponRig.has('kael_espada') && WeaponRig.install(m, def.id)) { n.blade.geo = null; n.hilt.geo = null; }
    } else if (Wp && Wp.add) Wp.add(m);
    if (m.wr) m.wr.id = def.id;   // a arma e as peças que o personagem criado equipou (não as do herói da base)
    else if (typeof PecasRig !== 'undefined') PecasRig.install(m);
    m.criado = def.id;
    return m;
  }

  const SWORD = ['blade', 'hilt'];
  // Registra (ou refaz) o modelo de um personagem criado
  function registrar(def) {
    const key = def.model, base = def.base, alt = ALTURA[def.aparencia.altura] || 1;
    const velho = MODELS3D[key];
    if (velho && velho.model && velho.model.tex && typeof R3D !== 'undefined' && R3D.freeTex) R3D.freeTex(velho.model.tex);   // a textura do modelo anterior
    const O = { 0: { scale: alt }, f: { flash: 0.85, scale: alt }, s: { emi: 1.25, scale: alt } };
    MODELS3D[key] = {
      // peças GLB da criação (estilo Realista), ou o modelo paramétrico
      build: () => (typeof Criacao3D !== 'undefined' && Criacao3D.usa(def) && Criacao3D.build(def)) || build(def),
      pose(m, e, o) {
        MODELS3D.kael.pose(m, e, o);
        const W = typeof HERO_WEAPONS !== 'undefined' && HERO_WEAPONS[base];
        if (base !== 'kael') { for (const k of SWORD) if (m.nodes[k]) m.nodes[k].vis = false; if (W && W.pose) W.pose(m, e, o); }
        else if (m.wr) WeaponRig.pose(m, e);
        if (m.cria) Criacao3D.pose(m, e, def);   // armaduras GLB vestidas antes das peças procedurais
        if (!m.wr && typeof PecasRig !== 'undefined' && e) PecasRig.pose(m, e, def.id);
        // peças do Arsenal vestidas: as ombreiras da roupa e o cabelo saem (não atravessam)
        if (m.peles) {
          if (!m.pcOmbro) { m.pcOmbro = []; m.pcCapacete = []; for (const k in m.nodes) { if (k.startsWith('pc_ombro')) m.pcOmbro.push(m.nodes[k]); else if (k.startsWith('pc_capacete')) m.pcCapacete.push(m.nodes[k]); } }
          const veste = (L) => L.some((nd) => nd.vis && nd.geo);
          if (m.peles.ombreiras) m.peles.ombreiras.hide = veste(m.pcOmbro);
          if (m.peles.cabelo) m.peles.cabelo.hide = veste(m.pcCapacete);
        }
        // retrato: só o corpo e as peças vestidas (as armas das costas atrapalham o rosto); retrato() devolve
        if (e && e.retrato) { m._ocultos = []; for (const k in m.nodes) { const nd = m.nodes[k]; if (nd.vis && !m.corpo.has(k) && !k.startsWith('pc_')) { nd.vis = false; m._ocultos.push(nd); } } }
      },
      opts(e) { if (!e) return O[0]; if (+e.flash > 0 && e.state !== 'dead') return O.f; if (e.state === 'special') return O.s; return O[0]; },
      glows(e, add) {
        if (base === 'kael') { MODELS3D.kael.glows(e, add); return; }
        const W = typeof HERO_WEAPONS !== 'undefined' && HERO_WEAPONS[base];
        if (W && W.glows) W.glows(e, add);
      },
    };
    return MODELS3D[key];
  }
  // Retrato para o HUD (288×288, rosto no quadrado [54, 18, 180] como os retratos da arte):
  // o modelo de frente na vista isométrica, sem as armas, recortado na cabeça pelas âncoras
  // 'rosto' e 'topo'; refeito quando a aparência muda (def.ver)
  function retrato(def) {
    const R = PersonagemModelo._ret, k = `${def.id}:${def.ver || 0}`;
    if (R[k] !== undefined) return R[k];
    const m = typeof R3D !== 'undefined' && R3D.active && game.model3(def.model);
    if (!m || m.criaVazio || (m.cria && !Criacao3D.pintado(m))) return null;   // peças GLB ainda carregando
    const v = new Player(0, 0, def);
    v.vitrine = true; v.retrato = true; v.state = 'idle'; v.animTime = 0.4; v.stateTime = 0.4; v.facing = v.viewFacing = Math.PI * 0.25; v.wpnOut = false; v.pecasPrevia = {};
    const o = game.opts3(v, 0);
    const it = game.queue3(def.model, v, o);
    o.scale = (o.scale || 1) * 3;
    R3D.flush(2);
    if (m._ocultos) { for (const nd of m._ocultos) nd.vis = true; m._ocultos = null; }
    const a = it && it.ok && it.anchors.rosto, b = it && it.anchors.topo;
    if (!a || !b) return null;
    const s = R3D.scale, lado = Math.max(6, Math.abs(a.y - b.y) * 3.2), cx = a.x, cy = a.y - lado * 0.06;
    const c = document.createElement('canvas'); c.width = c.height = 288; c.naturalWidth = 288; c.complete = true;
    c.getContext('2d').drawImage(R3D.canvas, it.cx + (cx - lado / 2 - it.minX) * s, it.cy + (cy - lado / 2 - it.minY) * s, lado * s, lado * s, 54, 18, 180, 180);
    return (R[k] = c);
  }
  return { build, finalizar, registrar, retrato, CORPO, ALTURA, FORMA, RECEITAS, paleta, receita, _ret: {} };
})();
