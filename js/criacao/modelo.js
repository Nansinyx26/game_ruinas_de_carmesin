'use strict';
// ECLIPSE ZERO · Criação de personagem: o modelo 3D paramétrico (PersonagemModelo)
// ---------------------------------------------------------------------------
// O corpo do personagem criado é montado no MESMO esqueleto do Kael (MODELS3D.kael.build), então
// usa todas as poses e animações que o jogo já tem — parado com as variações, andar, correr,
// pular e cair, esquivar, golpes leves e pesados de cada arma, carga, bloqueio e aparo,
// habilidades, suprema, dano, morte, sacar e guardar a arma, conversar — e os encaixes das
// armas (WeaponRig) e das peças da armadura modular (PecasRig) nas mãos, costas e ossos certos.
// A geometria de cada osso sai da aparência: tipo de corpo (larguras e ombros), altura (escala),
// pele, formato do rosto, olhos (os arcanos brilham), sobrancelhas, oito cortes de cabelo com
// cor, barba e bigode, marcas (cicatrizes, tatuagem, runas acesas, pintura de guerra) e a roupa
// inicial da classe (três modelos, cor principal e dos detalhes). As medidas de cada osso vão
// para o PecasRig (m.medidasPecas), para as peças vestirem justas no corpo (sem atravessar nem
// flutuar). A arma é a da base da classe (WeaponRig / HERO_WEAPONS), com os halos dela.
// Um modelo por personagem (MODELS3D['criado_' + id]); muda a aparência → refaz o modelo.
// ---------------------------------------------------------------------------
const PersonagemModelo = (function () {
  const TAU2 = Math.PI * 2;
  const CORPO = [   // larguras (w), ombros (sh), quadril (hp), cintura (wa), peito (ch), membros (lb)
    { w: 0.9, sh: 0.92, hp: 0.92, wa: 0.88, ch: 0.92, lb: 0.86 },   // esguio
    { w: 1, sh: 1, hp: 1, wa: 0.95, ch: 1.02, lb: 1 },              // atlético
    { w: 1.14, sh: 1.1, hp: 1.08, wa: 1.12, ch: 1.12, lb: 1.16 },   // robusto
    { w: 0.95, sh: 0.9, hp: 1.12, wa: 0.82, ch: 1.06, lb: 0.94 },   // curvilíneo
  ];
  const ALTURA = [0.92, 0.96, 1, 1.04, 1.08];
  const mixHex = (a, b, t) => { const A = hex3(a), B = hex3(b); return '#' + [0, 1, 2].map((i) => Math.round((A[i] + (B[i] - A[i]) * t) * 255).toString(16).padStart(2, '0')).join(''); };
  const escuro = (c, k) => mixHex(c, '#000000', k);
  const claro = (c, k) => mixHex(c, '#ffffff', k);

  // Anéis elípticos ligados por quadriláteros (tronco, mangas, saias): rings = [z, rx, ry, cx]
  function loft(g, rings, seg, col, a0 = 0, a1 = TAU2) {
    for (let r = 0; r < rings.length - 1; r++) {
      const [z0, rx0, ry0, c0] = rings[r], [z1, rx1, ry1, c1] = rings[r + 1];
      for (let i = 0; i < seg; i++) {
        const A0 = a0 + (a1 - a0) * i / seg, A1 = a0 + (a1 - a0) * (i + 1) / seg;
        const P = (a, z, rx, ry, cx) => [cx + Math.cos(a) * rx, Math.sin(a) * ry, z];
        g.quad(P(A0, z0, rx0, ry0, c0), P(A1, z0, rx0, ry0, c0), P(A1, z1, rx1, ry1, c1), P(A0, z1, rx1, ry1, c1), typeof col === 'function' ? col(r, i) : col, 0);
      }
    }
  }
  // Casca de elipsoide (cabelo, barba, gorros): longitudes a0..a1 (0 = frente), latitudes b0..b1
  function casca(g, cx, cy, cz, rx, ry, rz, a0, a1, b0, b1, na, nb, col, e = 0) {
    const P = (a, b) => [cx + Math.cos(b) * Math.cos(a) * rx, cy + Math.cos(b) * Math.sin(a) * ry, cz + Math.sin(b) * rz];
    for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) {
      const A0 = a0 + (a1 - a0) * i / na, A1 = a0 + (a1 - a0) * (i + 1) / na, B0 = b0 + (b1 - b0) * j / nb, B1 = b0 + (b1 - b0) * (j + 1) / nb;
      g.quad(P(A0, B0), P(A1, B0), P(A1, B1), P(A0, B1), col, e);
    }
  }
  const band = (g, x, z, rx, ry, h, col, e = 0) => g.cyl(x, 0, z - h / 2, rx, rx, h, 10, col, e, { caps: false });

  // Paleta da aparência e da roupa
  function paleta(A, classe) {
    const pele = PERS_PELES[A.pele], cab = PERS_CABELOS[A.corCabelo][1], roupa = PERS_CORES[A.corRoupa][1], det = PERS_CORES[A.corDetalhe][1];
    return { pele, peleS: escuro(pele, 0.22), lab: mixHex(pele, '#5a2a2a', 0.35), cab, cabS: escuro(cab, 0.25), cabH: claro(cab, 0.12),
      roupa, roupaS: escuro(roupa, 0.3), roupaH: claro(roupa, 0.1), det, detH: claro(det, 0.25), calca: escuro(mixHex(roupa, '#2a2622', 0.5), 0.2),
      bota: '#2a1d14', botaS: '#120c08', couro: '#4a3220', fivela: '#a8a8b0', olho: PERS_OLHOS[A.olhos][1], olhoE: PERS_OLHOS[A.olhos][2], cor: PERS_CLASSES[classe].cor };
  }

  // ------------------------------------------------------------ cabeça
  const ROSTO = [   // crânio (rx, ry, rz), queixo (x, z, rx, ry, rz), mandíbula quadrada
    { sk: [4.3, 4.0, 4.7], ch: [1.6, 5.1, 2.7, 2.9, 2.5], sq: 0 },
    { sk: [4.3, 4.0, 4.8], ch: [1.7, 4.9, 2.6, 3.2, 2.5], sq: 1 },
    { sk: [4.5, 4.3, 4.5], ch: [1.4, 5.4, 2.9, 3.4, 2.5], sq: 0 },
    { sk: [4.2, 3.8, 5.2], ch: [1.6, 4.5, 2.5, 2.7, 3.0], sq: 0 },
  ];
  function gHead(A, C) {
    const g = new G3(), R = ROSTO[A.rosto], [sx, sy, sz] = R.sk, [cx, cz, crx, cry, crz] = R.ch;
    g.cyl(-0.3, 0, -1.0, 1.8, 1.6, 4.8, 8, C.peleS, 0, { caps: false });   // pescoço
    g.sphere(-0.6, 0, 8.2, sx, sy, sz, 12, 8, C.pele);                      // crânio
    g.sphere(cx, 0, cz, crx, cry, crz, 10, 6, C.pele);                      // maçãs e queixo
    if (R.sq) g.box(cx + 0.2, 0, cz - 1.0, crx * 1.4, cry * 1.85, 1.8, C.peleS, 0, { taperY: 0.75 });
    g.box(4.05, 0, 7.0, 1.4, 1.0, 2.2, C.pele, 0, { taperX: 0.6, taperY: 0.7, shift: [0.3, 0] });   // nariz
    for (const s of [-1, 1]) {
      g.sphere(-0.4, s * (sy - 0.1), 7.5, 0.7, 0.45, 1.25, 6, 3, C.peleS);   // orelhas
      g.sphere(3.55, s * 1.45, 7.95, 0.34, 0.6, 0.32, 8, 4, '#dcd6cf');      // olho
      g.sphere(3.86, s * 1.45, 7.95, 0.1, 0.3, 0.3, 6, 3, C.olho, C.olhoE ? 1.2 : 0);     // íris
      g.box(3.95, s * 1.45, 7.95, 0.05, 0.13, 0.13, '#050506', C.olhoE ? 0.6 : 0);          // pupila
      g.box(3.7, s * 1.45, 8.32, 0.3, 1.25, 0.16, C.peleS, 0);                               // pálpebra
      // sobrancelhas: finas, grossas, arqueadas
      if (A.sobrancelhas < 3) {
        const th = A.sobrancelhas === 1 ? 0.42 : 0.24, arc = A.sobrancelhas === 2 ? 0.28 : 0.08;
        g.at(3.95, s * 1.45, 8.8, s * arc, 0, 0); g.box(0, 0, 0, 0.42, 1.7, th, C.cabS, 0); g.at();
      }
    }
    g.box(3.86, 0, 5.75, 0.3, 1.5, 0.28, C.lab, 0);   // boca
    // barba: por fazer, cavanhaque, bigode, cheia
    if (A.barba === 1) casca(g, cx - 0.05, 0, cz, crx + 0.12, cry + 0.12, crz + 0.12, -1.25, 1.25, -1.3, 0.25, 7, 3, mixHex(C.pele, C.cab, 0.45));
    if (A.barba === 2 || A.barba === 4) g.box(cx + 2.05, 0, cz - 1.45, 1.4, 1.6, 1.6, C.cab, 0, { taper: 0.75 });
    if (A.barba === 3 || A.barba === 4) g.box(3.95, 0, 6.15, 0.55, 2.0, 0.42, C.cab, 0, { taperY: 0.8 });
    if (A.barba === 4) casca(g, cx, 0, cz + 0.1, crx + 0.42, cry + 0.4, crz + 0.4, -1.45, 1.45, -1.35, 0.35, 8, 3, C.cab);
    // marcas
    if (A.marcas === 1) g.box(4.2, -1.45, 7.95, 0.12, 0.22, 2.8, mixHex(C.pele, '#c06a6a', 0.55), 0);
    if (A.marcas === 2) { g.at(3.4, 2.1, 6.4, 0.6, 0, 0); g.box(0, 0, 0, 0.12, 0.22, 2.4, mixHex(C.pele, '#c06a6a', 0.55), 0); g.at(); }
    if (A.marcas === 3) for (let k = 0; k < 3; k++) { g.at(2.2 - k * 0.9, sy * 0.96, 7.2 + k * 0.5, 0, 0, 0.3); g.box(0, 0, 0, 0.5, 0.12, 2.2, '#1a2030', 0); g.at(); }
    if (A.marcas === 4) {
      const rc = PERS_CLASSES ? C.cor : '#7ad0ff';
      g.box(4.2, 0, 9.9, 0.1, 0.5, 0.5, rc, 1.1); g.box(4.2, 0, 9.9, 0.1, 1.4, 0.12, rc, 1.1);
      for (const s of [-1, 1]) g.box(3.6, s * 2.5, 6.3, 0.1, 0.18, 1.0, rc, 1.1);
    }
    if (A.marcas === 5) for (const s of [-1, 1]) g.box(3.7, s * 1.5, 7.9, 0.2, 1.6, 0.6, '#7a1418', 0);
    gCabelo(g, A, C, R);
    return g;
  }
  // Oito cortes: raspado, curto, topete, longo, rabo de cavalo, moicano, tranças, coque
  function gCabelo(g, A, C, R) {
    const [sx, sy, sz] = R.sk, h = A.cabelo, c = C.cab, cS = C.cabS;
    const capa = (dr, b0, col) => casca(g, -0.6, 0, 8.2, sx + dr, sy + dr, sz + dr, -Math.PI, Math.PI, b0, Math.PI / 2, 14, 4, col);
    if (h === 0) { capa(0.06, 0.05, mixHex(C.pele, c, 0.55)); return; }
    if (h === 5) {   // moicano: lados raspados e a crista
      capa(0.05, 0.1, mixHex(C.pele, c, 0.5));
      for (let k = 0; k < 6; k++) { const a = -0.45 + k * 0.42; g.box(-0.6 + Math.cos(a + Math.PI / 2) * sx * 0.95, 0, 8.2 + Math.sin(a + Math.PI / 2) * sz + 1.2, 1.5, 1.0, 2.6, k % 2 ? c : cS, 0, { taper: 0.5 }); }
      return;
    }
    // base curta (cobre o alto e a nuca; a franja na testa)
    casca(g, -0.6, 0, 8.2, sx + 0.4, sy + 0.4, sz + 0.4, -Math.PI, Math.PI, 0.25, Math.PI / 2, 14, 4, c);
    casca(g, -0.6, 0, 8.2, sx + 0.35, sy + 0.35, sz + 0.3, Math.PI * 0.55, Math.PI * 1.45, -0.45, 0.3, 8, 2, cS);
    g.box(3.0, 0, 11.4, 1.6, 6.0, 1.3, c, 0, { taperY: 0.85 });
    if (h === 2) g.box(2.6, 0, 13.2, 3.0, 4.4, 2.6, C.cabH, 0, { taper: 0.55, shift: [1.0, 0] });   // topete
    if (h === 3) {   // longo: cai até os ombros, mechas dos lados
      casca(g, -0.9, 0, 6.5, sx + 0.6, sy + 0.55, sz + 2.6, Math.PI * 0.5, Math.PI * 1.5, -1.0, 0.4, 8, 3, c);
      for (const s of [-1, 1]) g.box(1.2, s * (sy + 0.2), 4.6, 2.0, 0.9, 6.4, cS, 0, { taperX: 0.7 });
    }
    if (h === 4) {   // rabo de cavalo
      g.sphere(-4.9, 0, 9.6, 0.9, 0.9, 0.9, 6, 3, C.det || cS);
      g.cyl(-5.4, 0, 2.2, 0.55, 1.15, 7.4, 6, c, 0);
    }
    if (h === 6) for (const s of [-1, 1]) for (let k = 0; k < 6; k++) g.sphere(-3.4 - k * 0.15, s * 2.2, 7.6 - k * 1.35, 0.85 - k * 0.05, 0.85 - k * 0.05, 0.75, 6, 3, k % 2 ? c : cS);   // tranças
    if (h === 7) { g.sphere(-3.9, 0, 11.7, 2.0, 2.0, 1.8, 8, 5, c); g.box(-3.5, 0, 12.9, 0.4, 3.8, 0.4, C.det || '#8a6a3a', 0); }   // coque com grampo
  }

  // ------------------------------------------------------------ corpo e roupa
  function gTorso(A, C, K, B) {
    const g = new G3(), w = B.w, ch = B.ch, wa = B.wa, est = A.roupa;
    const rings = [[-1.6, 4.4 * wa, 5.7 * wa * B.hp, 0], [3.6, 4.0 * wa, 5.4 * wa, 0], [7.6, 4.5 * ch, 6.3 * w, 0.1], [10.8, 4.4 * ch, 7.0 * B.sh, -0.2], [13.0, 3.3, 6.2 * B.sh, -0.4], [14.4, 2.4, 3.8, -0.4]];
    loft(g, rings, 12, (r) => (r === 4 ? C.roupaS : C.roupa));
    // gola, cinto com fivela, detalhes do modelo de roupa
    band(g, -0.3, 13.6, 2.6, 2.6, 1.2, C.det);
    g.cyl(-0.1, 0, -1.6, 4.55 * wa, 4.55 * wa, 1.5, 12, C.couro, 0, { caps: false });
    g.box(4.45 * wa, 0, -0.9, 0.5, 1.8, 1.3, C.fivela, 0.1);
    if (est === 0) {   // gibão: abotoado com tiras cruzadas
      for (let k = 0; k < 4; k++) g.box(4.3 * ch + 0.1, 0, 1.5 + k * 2.6, 0.3, 0.6, 0.6, C.det, 0);
      g.at(0, 0, 6.5, 0.5, 0, 0); g.box(0, 0, 0, 9.6 * ch, 13 * w, 0.9, C.det, 0, { taper: 0.95 }); g.at();
    } else if (est === 1) {   // túnica: faixa larga na cintura e debrum no peito
      g.cyl(0, 0, 0.0, 4.6 * wa, 4.4 * wa, 2.6, 12, C.det, 0, { caps: false });
      g.box(4.45 * ch, 0, 9.6, 0.4, 5.6 * w, 0.8, C.detH, 0);
    } else {   // couraça: placas no peito e na barriga
      for (let k = 0; k < 3; k++) g.box(4.2 * ch + 0.2, 0, 3.0 + k * 2.6, 0.8, 7.2 * w - k * 0.6, 2.2, k % 2 ? C.det : C.detH, 0, { taperY: 0.9 });
      g.box(-4.2 * ch, 0, 7.0, 0.8, 9.0 * w, 7.0, C.roupaS, 0);
    }
    // insígnia da classe no peito (acesa de leve)
    g.box(4.6 * ch + 0.3, -2.2 * w, 9.8, 0.2, 1.0, 1.0, C.cor, 0.7);
    return g;
  }
  function gHips(A, C, B) {
    const g = new G3(), hp = B.hp;
    g.box(0.2, 0, -0.8, 7.6 * hp, 10.6 * hp, 4.8, C.calca, 0, { taperY: 1.05 });
    // túnica e manto: saia curta (até o meio da coxa) que não prende as pernas
    if (A.roupa === 1) loft(g, [[1.0, 4.7 * hp, 6.0 * hp, 0.1], [-8.0, 5.6 * hp, 6.9 * hp, 0.2]], 12, (r, i) => (i % 3 === 0 ? C.roupaS : C.roupa), -2.4, 2.4);
    return g;
  }
  function gUpper(s, A, C, B) {
    const g = new G3(), lb = B.lb, nu = A.roupa === 2 && A.classeBase !== 'sera';   // couraça: braço de pele com braçadeira
    g.sphere(0, s * 0.3, -1.0, 2.5 * lb, 2.4 * lb, 2.5, 8, 4, C.roupaS);
    g.cyl(0, 0, -9.8, 1.85 * lb, 2.2 * lb, 9.0, 8, nu ? C.pele : C.roupa, 0, { caps: false });
    band(g, 0, -1.4, 2.4 * lb, 2.4 * lb, 1.4, C.det);
    return g;
  }
  function gFore(s, A, C, B) {
    const g = new G3(), lb = B.lb, manga = A.roupa === 1;
    g.cyl(0, 0, -9.6, 1.6 * lb, 1.95 * lb, 9.6, 8, manga ? C.roupa : C.pele, 0, { caps: false });
    g.cyl(0, 0, -9.0, 2.15 * lb, 2.05 * lb, 4.6, 8, C.couro, 0, { caps: false });   // braçadeira de couro
    band(g, 0, -6.8, 2.25 * lb, 2.25 * lb, 0.6, C.det);
    return g;
  }
  function gHand(s, C, B) {
    const g = new G3(), lb = Math.min(1.1, B.lb);
    g.box(0.35, 0, -1.7, 2.3 * lb, 2.6 * lb, 3.4, C.pele, 0, { taperY: 0.9 });
    g.box(1.3, -s * 1.2, -1.2, 1.0, 0.9, 2.0, C.pele, 0);   // polegar
    return g;
  }
  function gThigh(s, C, K, B) {
    const g = new G3(), lb = B.lb * Math.sqrt(B.hp);
    g.cyl(0, 0, -K.LTH, 2.4 * lb, 3.05 * lb, K.LTH + 0.5, 8, C.calca, 0, { caps: false });
    g.box(0.4, s * 2.6 * lb, -5.0, 1.8, 1.0, 3.0, escuro(C.calca, 0.25), 0);   // bolso lateral
    return g;
  }
  function gShin(s, C, K, B) {
    const g = new G3(), lb = B.lb, bt = -K.LSH + 7.4;
    g.cyl(0, 0, bt - 0.6, 2.3 * lb, 2.45 * lb, 0.8 - bt, 8, C.calca, 0, { caps: false });
    g.cyl(0.1, 0, -K.LSH, 2.45 * lb, 2.8 * lb, 7.4, 8, C.bota, 0, { caps: false });   // cano da bota
    band(g, 0.1, bt + 0.3, 2.95 * lb, 2.95 * lb, 0.8, C.botaS);
    band(g, 0.1, -K.LSH + 3.4, 2.7 * lb, 2.7 * lb, 0.7, C.couro);
    return g;
  }
  function gFoot(C) {
    const g = new G3();
    g.box(0.9, 0, -1.6, 6.2, 4.8, 3.6, C.bota, 0, { taperX: 0.85, taperY: 0.95 });
    g.box(4.6, 0, -2.0, 3.0, 4.6, 2.6, C.bota, 0, { taperX: 0.45, taperY: 0.85 });
    g.box(1.4, 0, -3.1, 9.6, 5.4, 1.2, C.botaS);
    return g;
  }

  // Medidas de cada osso para as peças do Arsenal (mesmo formato do PecasRig.medidas)
  function medidas(A, K, B) {
    const R = ROSTO[A.rosto], [sx, sy, sz] = R.sk, cab = A.cabelo === 0 || A.cabelo === 5 ? 0.1 : A.cabelo === 2 || A.cabelo === 7 ? 1.4 : 0.6;
    const lado = (r, L) => ({ x0: -r, x1: r, y0: -r, y1: r, z0: -L, z1: 0 });
    return {
      head: { x0: -0.6 - sx - cab, x1: 4.4, y0: -sy - cab, y1: sy + cab, z0: 1.5, z1: 8.2 + sz + cab },
      torso: { x0: -4.4 * B.ch, x1: 4.6 * B.ch, y0: -7.0 * B.sh, y1: 7.0 * B.sh, z0: -1.6, z1: K.SHZ + 1.6 },
      hips: { x0: -3.8 * B.hp, x1: 3.9 * B.hp, y0: -5.3 * B.hp, y1: 5.3 * B.hp, z0: -3.2, z1: 1.6 },
      armLu: lado(2.3 * B.lb, K.AUP), armRu: lado(2.3 * B.lb, K.AUP), armLf: lado(2.1 * B.lb, K.AFO), armRf: lado(2.1 * B.lb, K.AFO),
      handL: { x0: -1.2, x1: 1.5, y0: -1.5, y1: 1.5, z0: -3.6, z1: 0 }, handR: { x0: -1.2, x1: 1.5, y0: -1.5, y1: 1.5, z0: -3.6, z1: 0 },
      thighL: lado(3.1 * B.lb, K.LTH), thighR: lado(3.1 * B.lb, K.LTH), shinL: lado(2.8 * B.lb, K.LSH), shinR: lado(2.8 * B.lb, K.LSH),
      footL: { x0: -3.4, x1: 6.2, y0: -2.7, y1: 2.7, z0: -3.7, z1: 0 }, footR: { x0: -3.4, x1: 6.2, y0: -2.7, y1: 2.7, z0: -3.7, z1: 0 },
    };
  }

  // ------------------------------------------------------------ montagem
  function build(def) {
    const A = Object.assign({}, def.aparencia, { classeBase: def.base }), B = CORPO[A.corpo] || CORPO[1], C = paleta(A, def.classe);
    const K = { SHY: 6.7 * B.sh, SHZ: 10.6, HIPY: 3.5 * B.hp, HZ0: 2.5, HAND0: 1.4, AUP: 9.8, AFO: 9.6, LTH: 12.8, LSH: 12.2, ANK: 3.6, NECK: 13.8 };
    const m = MODELS3D.kael.build(K);
    for (const k in m.nodes) m.nodes[k].geo = null;
    m.corpo = new Set(Object.keys(m.nodes).filter((k) => k !== 'blade' && k !== 'hilt'));   // ossos do corpo (o retrato esconde o resto)
    m.anchor('rosto', 'head', [1.6, 0, 7.4]).anchor('topo', 'head', [-0.6, 0, 12.6]);   // enquadramento do retrato
    const n = m.nodes, F = (g) => new Float32Array(g.d);   // o nó guarda os triângulos já prontos (como o N3 faz)
    n.torso.geo = F(gTorso(A, C, K, B)); n.hips.geo = F(gHips(A, C, B)); n.head.geo = F(gHead(A, C));
    for (const [s, nm] of [[-1, 'L'], [1, 'R']]) {
      n['arm' + nm + 'u'].geo = F(gUpper(s, A, C, B)); n['arm' + nm + 'f'].geo = F(gFore(s, A, C, B)); n['hand' + nm].geo = F(gHand(s, C, B));
      n['thigh' + nm].geo = F(gThigh(s, C, K, B)); n['shin' + nm].geo = F(gShin(s, C, K, B)); n['foot' + nm].geo = F(gFoot(C));
    }
    m.medidasPecas = medidas(A, K, B);
    // arma da base da classe: a Tempestade Nula do Kael (procedural ou a GLB), ou a do kit do herói
    const base = def.base, W = typeof HERO_WEAPONS !== 'undefined' && HERO_WEAPONS[base];
    if (base === 'kael') {
      n.blade.geo = F(buildTempestadeNula(new G3(), 1, 'blade', 0)); n.hilt.geo = F(buildTempestadeNula(new G3(), 1, 'hilt', 0));
      if (typeof WeaponRig !== 'undefined' && WeaponRig.has('kael_espada') && WeaponRig.install(m, def.id)) { n.blade.geo = null; n.hilt.geo = null; }
    } else if (W && W.add) W.add(m);
    if (m.wr) m.wr.id = def.id;   // a arma e as peças que o personagem criado equipou (não as do herói da base)
    else if (typeof PecasRig !== 'undefined') PecasRig.install(m);
    m.criado = def.id;
    return m;
  }
  const SWORD = ['blade', 'hilt'];
  // Registra (ou refaz) o modelo de um personagem criado
  function registrar(def) {
    const key = def.model, base = def.base, alt = ALTURA[def.aparencia.altura] || 1;
    const O = { 0: { scale: alt }, f: { flash: 0.85, scale: alt }, s: { emi: 1.25, scale: alt } };
    MODELS3D[key] = {
      build: () => build(def),
      pose(m, e, o) {
        MODELS3D.kael.pose(m, e, o);
        const W = typeof HERO_WEAPONS !== 'undefined' && HERO_WEAPONS[base];
        if (base !== 'kael') { for (const k of SWORD) if (m.nodes[k]) m.nodes[k].vis = false; if (W && W.pose) W.pose(m, e, o); }
        else if (m.wr) WeaponRig.pose(m, e);
        if (!m.wr && typeof PecasRig !== 'undefined' && e) PecasRig.pose(m, e, def.id);
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
    if (!m) return null;
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
  return { build, registrar, retrato, CORPO, ALTURA, paleta, _ret: {} };
})();
