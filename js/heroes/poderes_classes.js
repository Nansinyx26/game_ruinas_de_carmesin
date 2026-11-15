'use strict';
// ECLIPSE ZERO · Poderes das outras classes (PoderesClasses), ao lado da erupção de cristais do Guerreiro
// (js/heroes/poderes.js). Cada classe tem FORMA, MOVIMENTO e GEOMETRIA próprios — não é o mesmo efeito
// com outra cor:
//   ARQUEIRA (Patrulheiro, Lyra) · VIOLETA · velocidade e precisão, direcional
//     · rastro espectral atrás de cada flecha (partículas violeta que ficam no ar);
//     · ESTILHAÇOS no acerto: lascas finas e longas de cristal roxo que saem em leque na direção do
//       tiro (nunca um anel no chão), crescem num piscar e se desfazem;
//     · CHUVA DE FLECHAS ESPECTRAIS: flechas translúcidas descendo do céu, cada uma num ângulo, com o
//       alvo marcado no chão e um estilhaço no impacto.
//   SACERDOTE (Mago, Sera) · AZUL-CLARO · luz, cura e proteção, vertical e suave
//     · HALO que surge acima do conjurador e desce até os ombros;
//     · COLUNA DE LUZ caindo do alto sobre a área;
//     · GLIFOS SAGRADOS: dois anéis de símbolos flutuando sobre o chão, girando em sentidos opostos;
//     · estrelas que sobem e "penas" de luz que caem devagar; no campo de força, uma CÚPULA de hexágonos.
//   ARCANO (Guardião Arcano, Kael) · AZUL · geometria, runas e espaço
//     · CÍRCULOS ARCANOS inclinados no ar (anéis com runas) girando em velocidades e eixos diferentes;
//     · FRAGMENTOS GEOMÉTRICOS (octaedros) orbitando o ponto, que IMPLODEM no centro;
//     · ONDA DE CHOQUE: um anel de runas que se expande rente ao chão, e partículas suspensas.
//   ASSASSINO (Orion) · SOMBRA COM FIO EM BRASA · cortes e furtividade
//     · CORTES no acerto: crescentes que cruzam o alvo em X (três no golpe forte), lâmina escura com o fio aceso;
//     · VÉU ao lançar um poder: duas lâminas curvas girando em volta do corpo, lascas de sombra em espiral e fumaça.
//   GUERREIRO (Drakos) · RUBI · além da erupção de cristais (poderes.js): coroa de lascas rompendo o chão ao
//     lançar um poder e lascas debaixo do alvo no acerto.
// TODA ATIVA LANÇADA mostra a assinatura da classe (aoLancar: selo de runas do Arcano, mira da Arqueira, bênção
// do Sacerdote, coroa de lascas do Guerreiro, véu do Assassino) e TODO GOLPE QUE ACERTA ganha o destaque dela
// (aoAcertar: runa em pé, centelhas, lascas de rubi, cortes; a Arqueira já tinha os estilhaços e, no golpe
// forte, ganhou a lança de luz que atravessa o alvo). O golpe no chão do Arcano ganhou o pilar de luz e os
// fragmentos que estouram para fora depois de implodir; a cura e o campo do Sacerdote, o sol de raios e as estrelas.
// Tudo é 3D na 3ª pessoa (os brilhos vão como holograma: somados à cena, translúcidos) e desenhado em
// traço e brilho na vista isométrica. Os modelos ficam numa reserva (sem criar a cada golpe). Não muda dano.
// ---------------------------------------------------------------------------
const PoderesClasses = (() => {
  const ativos = [], reserva = {};
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const altura = (x, y) => (typeof Relevo !== 'undefined' && typeof game !== 'undefined' && Relevo.ativo && Relevo.ativo(game.room) ? Relevo.altura(x, y) : 0);
  const COR = {
    violeta: { rgb: '166,77,255', hi: '206,150,255', core: '246,236,255', luz: [0.65, 0.3, 1] },
    celeste: { rgb: '150,220,255', hi: '205,240,255', core: '250,253,255', luz: [0.6, 0.85, 1] },
    arcano: { rgb: '60,130,255', hi: '140,190,255', core: '225,240,255', luz: [0.25, 0.5, 1] },
    sombra: { rgb: '255,138,31', hi: '255,196,120', core: '255,244,226', luz: [1, 0.5, 0.12] },   // Assassino: o corpo é sombra, o fio é brasa
    rubro: { rgb: '255,56,40', hi: '255,130,60', core: '255,226,200', luz: [1, 0.2, 0.1] },       // Guerreiro: as lascas de rubi (a erupção inteira está em poderes.js)
  };

  // ------------------------------------------------------------ geometrias (espaço unitário)
  const tri = (d, a, b, c, ca, cb, cc, ea, eb, ec) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    d.push(a[0], a[1], a[2], nx, ny, nz, ca[0], ca[1], ca[2], ea, b[0], b[1], b[2], nx, ny, nz, cb[0], cb[1], cb[2], eb, c[0], c[1], c[2], nx, ny, nz, cc[0], cc[1], cc[2], ec);
  };
  // lasca fina: bipirâmide de 4 lados, base em z = 0, ponta em z = 1 (a "barriga" mais perto da base)
  function geoLasca(base, ponta) {
    const d = [], b = hex3(base), p = hex3(ponta), r = 0.16, zm = 0.28, M = [];
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; M.push([Math.cos(a) * r * (i % 2 ? 0.7 : 1), Math.sin(a) * r * (i % 2 ? 0.7 : 1), zm]); }
    const T = [0, 0, 1], B = [0, 0, 0];
    for (let i = 0; i < 4; i++) { const a = M[i], c = M[(i + 1) % 4]; tri(d, a, c, T, b, b, p, 0.45, 0.45, 1.3); tri(d, c, a, B, b, b, b, 0.45, 0.45, 0.9); }
    return { d };
  }
  // flecha espectral ao longo de z (ponta em z = 0, penas em z = 1)
  function geoFlecha(cor) {
    const d = [], c = hex3(cor), w = 0.022;
    const caixa = (x0, x1, y0, y1, z0, z1, e) => { const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
      for (const [a, b, cc, dd] of [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) { tri(d, P[a], P[b], P[cc], c, c, c, e, e, e); tri(d, P[a], P[cc], P[dd], c, c, c, e, e, e); } };
    caixa(-w, w, -w, w, 0.12, 1, 0.9);
    const ph = 0.13, pr = 0.06, H = [[pr, 0, ph], [0, pr, ph], [-pr, 0, ph], [0, -pr, ph]];
    for (let i = 0; i < 4; i++) tri(d, H[i], H[(i + 1) % 4], [0, 0, 0], c, c, c, 1.2, 1.2, 1.6);
    for (const s of [1, -1]) { tri(d, [0, 0, 0.78], [0.07 * s, 0, 0.92], [0, 0, 1], c, c, c, 1, 1, 1); tri(d, [0, 0, 0.78], [0, 0.07 * s, 0.92], [0, 0, 1], c, c, c, 1, 1, 1); }
    return { d };
  }
  // anel plano (raio 1) com runas: faixa contínua + traços em volta
  function geoAnelRunas(cor, n = 48, larg = 0.035, runas = 18) {
    const d = [], c = hex3(cor), N = [0, 0, 1];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
      const p = (a, r) => [Math.cos(a) * r, Math.sin(a) * r, 0];
      tri(d, p(a0, 1 - larg), p(a1, 1 - larg), p(a1, 1), c, c, c, 1.2, 1.2, 1.2); tri(d, p(a0, 1 - larg), p(a1, 1), p(a0, 1), c, c, c, 1.2, 1.2, 1.2);
    }
    for (let k = 0; k < runas; k++) {   // runas: pequenos glifos (dois traços) entre dois anéis
      const a = (k / runas) * TAU, ca = Math.cos(a), sa = Math.sin(a), r0 = 0.8, r1 = 0.92, w = 0.018, tx = -sa, ty = ca, s = (k * 7919) % 3;
      const q = (x0, y0, x1, y1) => { const P = [[x0 - tx * w, y0 - ty * w, 0], [x0 + tx * w, y0 + ty * w, 0], [x1 + tx * w, y1 + ty * w, 0], [x1 - tx * w, y1 - ty * w, 0]]; tri(d, P[0], P[1], P[2], c, c, c, 1, 1, 1); tri(d, P[0], P[2], P[3], c, c, c, 1, 1, 1); };
      q(ca * r0, sa * r0, ca * r1, sa * r1);
      const m = (r0 + r1) / 2, o = 0.05 * (s - 1);
      q(ca * m + tx * (0.05 + o), sa * m + ty * (0.05 + o), ca * r1 + tx * 0.03, sa * r1 + ty * 0.03);
    }
    void N;
    return { d };
  }
  // coluna de luz (cilindro aberto, raio 1, altura 1)
  function geoColuna(cor, n = 20) {
    const d = [], c = hex3(cor);
    for (let i = 0; i < n; i++) { const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, A = [Math.cos(a0), Math.sin(a0)], B = [Math.cos(a1), Math.sin(a1)];
      tri(d, [A[0], A[1], 0], [B[0], B[1], 0], [B[0], B[1], 1], c, c, c, 1.4, 1.4, 0.2); tri(d, [A[0], A[1], 0], [B[0], B[1], 1], [A[0], A[1], 1], c, c, c, 1.4, 0.2, 0.2); }
    return { d };
  }
  // octaedro (fragmento arcano)
  function geoOcta(cor, aresta) {
    const d = [], c = hex3(cor), a = hex3(aresta), V = [[1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0]], T = [0, 0, 1.3], B = [0, 0, -1.3];
    for (let i = 0; i < 4; i++) { const p = V[i], q = V[(i + 1) % 4]; tri(d, p, q, T, c, c, a, 0.5, 0.5, 1.4); tri(d, q, p, B, c, c, a, 0.5, 0.5, 1.4); }
    return { d };
  }
  // cúpula de hexágonos (escudo): meia esfera em faixas, com as arestas acesas
  function geoCupula(cor) {
    const d = [], c = hex3(cor), A = 14, F = 6;
    for (let j = 0; j < F; j++) for (let i = 0; i < A; i++) {
      const t0 = (j / F) * Math.PI / 2, t1 = ((j + 1) / F) * Math.PI / 2, a0 = (i / A) * TAU + (j % 2) * 0.22, a1 = ((i + 1) / A) * TAU + (j % 2) * 0.22;
      const P = (t, a) => [Math.cos(t) * Math.cos(a), Math.cos(t) * Math.sin(a), Math.sin(t)];
      const e0 = 0.5 + 0.5 * ((i + j) % 2);
      tri(d, P(t0, a0), P(t0, a1), P(t1, a1), c, c, c, e0, e0, e0 * 0.6); tri(d, P(t0, a0), P(t1, a1), P(t1, a0), c, c, c, e0, e0 * 0.6, e0 * 0.6);
    }
    return { d };
  }
  // crescente (lâmina curva) no plano yz, passando pela origem: o meio do arco em (0,0,0), as pontas para -z
  function geoCrescente(corpo, fio, larg = 0.17) {
    const d = [], c = hex3(corpo), f = hex3(fio), A = 1.15, n = 16;
    const P = (th, r) => [0, Math.sin(th) * r, Math.cos(th) * r - 1];
    for (let i = 0; i < n; i++) {
      const t0 = -A + (i / n) * 2 * A, t1 = -A + ((i + 1) / n) * 2 * A;
      const w0 = larg * Math.cos((t0 / A) * Math.PI / 2), w1 = larg * Math.cos((t1 / A) * Math.PI / 2);
      const a = P(t0, 1), b = P(t1, 1), cI = P(t1, 1 - w1), dI = P(t0, 1 - w0);
      tri(d, a, b, cI, f, f, c, 1.7, 1.7, 0.25); tri(d, a, cI, dI, f, c, c, 1.7, 0.25, 0.25);
    }
    return { d };
  }
  // sol de raios no chão (raio 1): raios finos alternando o comprimento
  function geoRaios(cor, n = 14) {
    const d = [], c = hex3(cor);
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU, r1 = k % 2 ? 0.74 : 1, w = 0.05, ca = Math.cos(a), sa = Math.sin(a), tx = -sa, ty = ca, r0 = 0.3;
      tri(d, [ca * r0 - tx * w, sa * r0 - ty * w, 0], [ca * r0 + tx * w, sa * r0 + ty * w, 0], [ca * r1, sa * r1, 0], c, c, c, 1.3, 1.3, 0.15); }
    return { d };
  }
  // estrela de luz: três fusos finos cruzados (brilha de qualquer ângulo; o de pé é mais longo)
  function geoEstrela(cor) {
    const d = [], c = hex3(cor), r = 0.13;
    for (const [ax, u, v] of [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]]]) {
      const M = [0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU; return [u[0] * Math.cos(a) * r + v[0] * Math.sin(a) * r, u[1] * Math.cos(a) * r + v[1] * Math.sin(a) * r, u[2] * Math.cos(a) * r + v[2] * Math.sin(a) * r]; });
      const k = ax[2] ? 1.5 : 1;
      for (const sn of [1, -1]) { const T = [ax[0] * sn * k, ax[1] * sn * k, ax[2] * sn * k]; for (let i = 0; i < 4; i++) tri(d, M[i], M[(i + 1) % 4], T, c, c, c, 1.6, 1.6, 0.4); }
    }
    return { d };
  }
  // mira: anel fino, quatro traços que atravessam a borda e um losango no centro
  function geoMira(cor) {
    const d = [], c = hex3(cor), n = 40, larg = 0.045;
    const p = (a, r) => [Math.cos(a) * r, Math.sin(a) * r, 0];
    for (let i = 0; i < n; i++) { const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU; tri(d, p(a0, 1 - larg), p(a1, 1 - larg), p(a1, 1), c, c, c, 1.3, 1.3, 1.3); tri(d, p(a0, 1 - larg), p(a1, 1), p(a0, 1), c, c, c, 1.3, 1.3, 1.3); }
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU, ca = Math.cos(a), sa = Math.sin(a), tx = -sa * 0.022, ty = ca * 0.022;
      const P = [[ca * 0.58 - tx, sa * 0.58 - ty, 0], [ca * 0.58 + tx, sa * 0.58 + ty, 0], [ca * 1.16 + tx, sa * 1.16 + ty, 0], [ca * 1.16 - tx, sa * 1.16 - ty, 0]]; tri(d, P[0], P[1], P[2], c, c, c, 1.5, 1.5, 1.5); tri(d, P[0], P[2], P[3], c, c, c, 1.5, 1.5, 1.5); }
    const q = 0.07; tri(d, [q, 0, 0], [0, q, 0], [-q, 0, 0], c, c, c, 1.6, 1.6, 1.6); tri(d, [q, 0, 0], [-q, 0, 0], [0, -q, 0], c, c, c, 1.6, 1.6, 1.6);
    return { d };
  }
  const GEO = {};
  const geo = (k, f) => GEO[k] || (GEO[k] = f());

  // ------------------------------------------------------------ efeitos (um modelo cada, da reserva)
  // E: { tipo, x, y, z0, t, dur, nos: [{ chave, holo }], pose(m, E), iso(ctx, E), luz(E) → força }
  function novo(tipo, x, y, dur, nos, extra) {
    const chave = tipo + ':' + nos.map((n) => n[0]).join(',');
    let M = reserva[chave] && reserva[chave].pop();
    if (!M) {
      const root = new N3('poder_' + tipo), solido = root.add(new N3('solido')), holo = root.add(new N3('holo'));
      nos.forEach(([k, h, f], i) => (h ? holo : solido).add(new N3('n' + i, geo(k, f))));
      M = { solido: new Model3(solido), holo: new Model3(holo) };
      solido.kids.forEach((n) => (n.h = false)); holo.kids.forEach((n) => (n.h = true));
    }
    const E = Object.assign({ tipo, x, y, z0: altura(x, y), t: 0, dur, chave, M, nos, sala: typeof game !== 'undefined' ? game.room : null,
      oS: { m: M3.make(), flash: 0, emi: 1, holo: false, ghost: null, tint: null, raio: 120 },
      oH: { m: M3.make(), flash: 0, emi: 1, holo: true, ghost: null, tint: null, semSombra: true } }, extra);
    // as duas partes (sólida e holograma) posam pelo mesmo índice de nó
    E.poseS = (m) => posar(m, E, false); E.poseH = (m) => posar(m, E, true);
    ativos.push(E);
    return E;
  }
  // cada nó i recebe do efeito: [p, r, s, emi] ou null (escondido)
  const Q = { p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1], e: 1 };
  function posar(m, E, holo) {
    const kids = m.root.kids;
    let idx = 0;
    for (let i = 0; i < E.nos.length; i++) {
      if (!!E.nos[i][1] !== holo) continue;
      const nd = kids[idx++];
      Q.p[0] = Q.p[1] = Q.p[2] = 0; Q.r[0] = Q.r[1] = Q.r[2] = 0; Q.s[0] = Q.s[1] = Q.s[2] = 1; Q.e = 1;
      const ok = E.no(i, Q, E);
      nd.vis = !!ok;
      if (!ok) continue;
      nd.p[0] = Q.p[0]; nd.p[1] = Q.p[1]; nd.p[2] = Q.p[2]; nd.r[0] = Q.r[0]; nd.r[1] = Q.r[1]; nd.r[2] = Q.r[2]; nd.s[0] = Q.s[0]; nd.s[1] = Q.s[1]; nd.s[2] = Q.s[2]; nd.emi = Q.e;
    }
  }
  // gira o eixo z da peça para a direção (dx, dy, dz)
  const apontar = (q, dx, dy, dz) => { const l = Math.hypot(dx, dy, dz) || 1; q.r[0] = 0; q.r[1] = Math.acos(cl(dz / l, -1, 1)); q.r[2] = Math.atan2(dy, dx); };
  function soltar(E) {
    const i = ativos.indexOf(E); if (i >= 0) ativos.splice(i, 1);
    if (E.M) { (reserva[E.chave] || (reserva[E.chave] = [])).push(E.M); if (reserva[E.chave].length > 4) reserva[E.chave].shift(); E.M = null; }
  }

  // ============================================================ ARQUEIRA: estilhaços violeta
  // lascas finas em leque na direção do tiro (ang), saindo do ponto do acerto
  function estilhacos(x, y, z, ang, forte = false) {
    const n = forte ? 11 : 7, r = mulberry32((x * 13 + y * 7) | 0), L = [];
    for (let i = 0; i < n; i++) {
      const a = ang + (r() - 0.5) * (forte ? 2.4 : 1.5), el = 0.15 + r() * 0.85;
      L.push({ dx: Math.cos(a) * Math.cos(el), dy: Math.sin(a) * Math.cos(el), dz: Math.sin(el), len: (forte ? 16 : 10) + r() * (forte ? 18 : 10), w: 2.2 + r() * 1.8, at: r() * 0.05, off: r() * 4 });
    }
    const nos = L.map(() => ['lascaV', false, () => geoLasca('#3a0f6e', '#d6a6ff')]).concat([['flechaV', true, () => geoFlecha('#b070ff')]]);
    const E = novo('violeta', x, y, 0.6, nos, { L, zc: z, ang, forte });
    E.no = (i, q, E) => {
      if (i === L.length) {   // golpe forte: a flecha espectral atravessa o alvo como uma lança de luz
        if (!E.forte) return null;
        const v = cl(E.t / 0.2, 0, 1); if (v >= 1) return null;
        const fx = Math.cos(E.ang), fy = Math.sin(E.ang), d = -70 + 150 * v;
        q.p[0] = fx * d; q.p[1] = fy * d; q.p[2] = E.zc - E.z0;
        apontar(q, -fx, -fy, 0); q.s[0] = q.s[1] = 30; q.s[2] = 78; q.e = 1.1 * (1 - v * v);
        return true;
      }
      const c = L[i], u = cl((E.t - c.at) / 0.08, 0, 1), f = sm(0.25, 0.6, E.t);
      if (u <= 0 || f >= 1) return null;
      q.p[0] = c.dx * c.off; q.p[1] = c.dy * c.off; q.p[2] = E.zc - E.z0 + c.dz * c.off;
      apontar(q, c.dx, c.dy, c.dz);
      const k = u * (1 - f);
      q.s[0] = q.s[1] = c.w * (1 - f * 0.5); q.s[2] = c.len * k; q.e = 1.6 - f;
      return true;
    };
    const P = game.particles, C = COR.violeta;
    P.sparks(x, y, z, ang, forte ? 14 : 8, C.hi, 420, 0.9);
    P.flash(x, y, z, forte ? 46 : 26, C.rgb, 0.12);
    for (let i = 0; i < (forte ? 10 : 5); i++) P.embers(x, y, z, 1, i % 2 ? C.hi : C.rgb, 8, 40);
    return E;
  }
  // flecha espectral caindo do céu (chuva): d = { x, y, t, fall } da LyraRain
  function flechaCaindo(d) {
    const r = Math.random, a = r() * TAU, inc = 0.25 + r() * 0.35;
    const E = novo('violeta', d.x, d.y, d.fall + 0.35, [['flechaV', true, () => geoFlecha('#b070ff')], ['anelV', true, () => geoAnelRunas('#9a5cff', 32, 0.06, 0)]],
      { d, dir: [Math.cos(a) * Math.sin(inc), Math.sin(a) * Math.sin(inc), Math.cos(inc)] });
    E.no = (i, q, E) => {
      const k = cl(E.t / E.d.fall, 0, 1), dz = E.dir;
      if (i === 0) {   // a flecha: vem de 260 de altura ao longo da direção inclinada, ponta para baixo
        if (k >= 1) return null;
        const h = 260 * (1 - k);
        q.p[0] = dz[0] * h / dz[2]; q.p[1] = dz[1] * h / dz[2]; q.p[2] = h;
        apontar(q, dz[0], dz[1], dz[2]); q.s[0] = q.s[1] = 22; q.s[2] = 34; q.e = 1.4;
        return true;
      }
      // o alvo marcado no chão: fecha enquanto ela cai, pisca no impacto
      const u = E.t - E.d.fall, rr = u < 0 ? 16 * (1 - k) + 7 : 7 + u * 60;
      q.p[2] = 1; q.s[0] = q.s[1] = rr; q.e = u < 0 ? 0.5 + k : Math.max(0, 1.6 - u * 5);
      return q.e > 0.02;
    };
    E.aoImpacto = () => estilhacos(d.x, d.y, altura(d.x, d.y) + 2, -Math.PI / 2 + (Math.random() - 0.5), false);
    return E;
  }

  // ============================================================ SACERDOTE: luz celestial
  // forma: 'cura' (coluna de luz, glifos, halo, estrelas) ou 'escudo' (cúpula de hexágonos e glifos)
  function celeste(x, y, R, forma = 'cura', dono = null) {
    const nos = [['halo', true, () => geoAnelRunas('#d6f2ff', 40, 0.12, 0)], ['glifoA', true, () => geoAnelRunas('#a8e4ff', 56, 0.04, 22)],
      ['glifoB', true, () => geoAnelRunas('#e6f8ff', 48, 0.05, 14)], [forma === 'escudo' ? 'cupula' : 'coluna', true, forma === 'escudo' ? () => geoCupula('#5fb4ff') : () => geoColuna('#7cc8ff')]];
    for (let i = 0; i < 7; i++) nos.push(['pena', false, () => geoLasca('#7fb8e0', '#f2fbff')]);
    nos.push(['raios', true, () => geoRaios('#bfe8ff', 14)]);   // (11) o sol de raios no chão
    for (let i = 0; i < 5; i++) nos.push(['estrela', true, () => geoEstrela('#f2fbff')]);   // (12–16) estrelas de luz em volta
    const r = mulberry32((x * 31 + y * 17) | 0), penas = [], estrelas = [];
    for (let i = 0; i < 7; i++) penas.push({ a: r() * TAU, rr: R * (0.2 + r() * 0.6), h0: 70 + r() * 60, giro: r() * TAU, fase: r() });
    for (let i = 0; i < 5; i++) estrelas.push({ a: (i / 5) * TAU + r() * 0.5, rr: R * (0.55 + r() * 0.35), h: 24 + r() * 60, fase: r(), s: 4 + r() * 3 });
    const E = novo('celeste', x, y, forma === 'escudo' ? 1.8 : 2.2, nos, { R, forma, penas, estrelas, dono, acEst: 0 });
    E.no = (i, q, E) => {
      const t = E.t, entra = sm(0, 0.35, t), sai = 1 - sm(E.dur - 0.6, E.dur, t), k = entra * sai;
      if (k <= 0.01) return null;
      const dx = E.dono ? E.dono.x - E.x : 0, dy = E.dono ? E.dono.y - E.y : 0;
      if (i === 0) {   // halo: surge alto e desce até a cabeça
        q.p[0] = dx; q.p[1] = dy; q.p[2] = 120 - 52 * sm(0, 0.8, t); q.r[2] = t * 1.2; q.s[0] = q.s[1] = 15 + 4 * Math.sin(t * 5); q.e = 0.75 * k; return true;
      }
      if (i === 1 || i === 2) {   // glifos: dois anéis flutuando, sentidos opostos
        q.p[2] = 3 + (i === 1 ? 2 : 6) + Math.sin(t * 3 + i) * 1.5; q.r[2] = (i === 1 ? 1 : -1.6) * t * 0.9;
        q.s[0] = q.s[1] = E.R * (i === 1 ? 1 : 0.62) * (0.7 + 0.3 * entra); q.e = (0.42 + 0.12 * Math.sin(t * 7 + i)) * k; return true;
      }
      if (i === 3) {
        if (E.forma === 'escudo') { q.s[0] = q.s[1] = E.R; q.s[2] = E.R * 0.7 * sm(0, 0.4, t); q.e = 0.22 * k; return true; }
        // coluna de luz: desce do alto e se abre; depois afina
        const desce = sm(0, 0.3, t);
        q.p[2] = 0; q.s[0] = q.s[1] = E.R * (0.3 + 0.18 * desce) * (1 - 0.6 * (1 - sai)); q.s[2] = 520 * desce; q.e = 0.16 * k; return true;
      }
      if (i === 11) {   // sol de raios: gira devagar rente ao chão e respira
        q.p[2] = 1.5; q.r[2] = -t * 0.5; q.s[0] = q.s[1] = E.R * (E.forma === 'escudo' ? 0.95 : 1.2) * (0.5 + 0.5 * entra) * (1 + 0.05 * Math.sin(t * 5)); q.e = (0.26 + 0.08 * Math.sin(t * 6)) * k; return true;
      }
      if (i >= 12) {   // estrelas: orbitam e sobem em ciclos, piscando
        const S = E.estrelas[i - 12], u = (t * 0.55 + S.fase) % 1, a = S.a + t * (E.forma === 'escudo' ? 1.1 : 0.7);
        q.p[0] = Math.cos(a) * S.rr; q.p[1] = Math.sin(a) * S.rr; q.p[2] = 10 + S.h * u; q.r[2] = t * 2 + S.a; q.r[0] = t * 1.5;
        q.s[0] = q.s[1] = q.s[2] = S.s * Math.sin(Math.PI * u); q.e = k;
        return q.s[0] > 0.05;
      }
      // penas de luz: caem girando devagar
      const P = E.penas[i - 4], u = (t * 0.45 + P.fase) % 1;
      q.p[0] = Math.cos(P.a + t * 0.5) * P.rr; q.p[1] = Math.sin(P.a + t * 0.5) * P.rr; q.p[2] = P.h0 * (1 - u) + 4;
      q.r[0] = Math.sin(t * 2 + P.giro) * 0.8; q.r[2] = P.giro + t; q.s[0] = 2.2; q.s[1] = 0.6; q.s[2] = 9; q.e = 1.3 * k * Math.min(1, u * 5);
      return true;
    };
    const P = game.particles, C = COR.celeste;
    P.flash(x, y, 30, R * 0.8, C.hi, 0.22);
    return E;
  }

  // ============================================================ ARCANO: runas, fragmentos e onda
  // carga (s antes do impacto): os círculos e os fragmentos aparecem e giram; no impacto (manifestar),
  // os fragmentos implodem e a onda de runas se expande
  function arcano(x, y, R, o = {}) {
    const nos = [['circA', true, () => geoAnelRunas('#5a9cff', 56, 0.05, 20)], ['circB', true, () => geoAnelRunas('#8fc2ff', 48, 0.06, 12)],
      ['circC', true, () => geoAnelRunas('#3f7fff', 40, 0.08, 8)], ['onda', true, () => geoAnelRunas('#6fb0ff', 64, 0.05, 28)]];
    for (let i = 0; i < 8; i++) nos.push(['octa', false, () => geoOcta('#0d1f4a', '#7fb8ff')]);
    nos.push(['pilar', true, () => geoColuna('#6fb0ff')]);   // (12) o pilar de luz do impacto
    const r = mulberry32((x * 19 + y * 23) | 0), frag = [];
    for (let i = 0; i < 8; i++) frag.push({ a: (i / 8) * TAU + r() * 0.3, rr: R * (0.45 + r() * 0.25), h: 30 + r() * 40, v: 1.6 + r() * 1.2, s: 4 + r() * 3, giro: r() * TAU });
    const E = novo('arcano', x, y, (o.carga || 0) + 1.4, nos, { R, frag, carga: o.carga || 0, tM: o.carga ? -1 : 0, dono: o.dono || null, serial: o.dono ? o.dono.serial : 0, estourou: false });
    E.no = (i, q, E) => {
      const t = E.t, m = E.tM < 0 ? -1 : t - E.tM, uC = E.tM < 0 ? cl(t / Math.max(0.12, E.carga), 0, 1) : 1, fim = m < 0 ? 0 : sm(0.6, 1.3, m);
      const k = sm(0, 0.2, t) * (1 - fim);
      if (k <= 0.01) return null;
      if (i <= 2) {   // três círculos inclinados, cada um num eixo e numa velocidade
        const inc = [0.55, -0.4, 1.15][i], vel = [1.4, -2.3, 3.1][i], esc = [1, 0.72, 0.42][i], h = [26, 40, 56][i];
        q.p[2] = h * (m < 0 ? 0.6 + 0.4 * uC : 1 - 0.5 * sm(0, 0.15, m)); q.r[0] = inc * (m < 0 ? 1 : 1 - sm(0, 0.12, m)); q.r[2] = t * vel;
        q.s[0] = q.s[1] = E.R * 0.5 * esc * (0.6 + 0.4 * uC) * (m < 0 ? 1 : 1 + 0.6 * sm(0, 0.2, m)); q.e = 0.42 * (1 + 0.5 * uC + (m >= 0 ? 1.4 * Math.exp(-m * 6) : 0)) * k; return true;   // (abaixo de 1: o azul das runas não estoura em branco)
      }
      if (i === 3) {   // onda de choque: anel de runas rente ao chão, que se expande depois do impacto
        if (m < 0) return null;
        q.p[2] = 2; q.r[2] = m * 0.8; q.s[0] = q.s[1] = E.R * (0.2 + 1.0 * sm(0, 0.45, m)); q.e = 0.7 * (1 - sm(0.2, 0.9, m)); return q.e > 0.02;
      }
      if (i === 12) {   // pilar de luz: sobe num piscar no impacto e afina até sumir
        if (m < 0) return null;
        q.s[0] = q.s[1] = E.R * 0.15 * (1 - 0.75 * sm(0, 0.45, m)); q.s[2] = 380 * sm(0, 0.07, m); q.e = 0.9 * Math.exp(-m * 6.5);
        return q.e > 0.03;
      }
      // fragmentos: orbitam; no impacto implodem no centro e, em seguida, estouram para fora girando
      const F = E.frag[i - 4], ang = F.a + t * F.v, imp = m < 0 ? 0 : sm(0, 0.12, m), fora = m < 0 ? 0 : sm(0.12, 0.5, m);
      const rr = F.rr * (m < 0 ? 0.7 + 0.3 * uC : (1 - imp) + 1.6 * fora);
      q.p[0] = Math.cos(ang) * rr; q.p[1] = Math.sin(ang) * rr; q.p[2] = F.h * (1 - imp * 0.8) + fora * (14 + F.h * 0.7) + Math.sin(t * 3 + F.giro) * 4;
      q.r[0] = t * (2 + 6 * fora) + F.giro; q.r[1] = t * 1.3; q.s[0] = q.s[1] = q.s[2] = F.s * (m < 0 ? uC : (1 - 0.5 * imp) * (1 - sm(0.3, 0.62, m))); q.e = 1.2 + uC + fora;
      return q.s[0] > 0.1;
    };
    return E;
  }
  function manifestarArcano(E, x, y) {
    if (!E || E.tM >= 0) return;
    if (x !== undefined) { E.x = x; E.y = y; E.z0 = altura(x, y); }
    E.tM = E.t;
  }

  // ============================================================ ASSASSINO: sombra e fio em brasa
  // CORTES no acerto: crescentes que cruzam o alvo em X (três no golpe forte), cada um com a lâmina escura
  // atrás e o fio aceso na frente; varrem num piscar e somem
  function cortes(x, y, z, ang, forte = false) {
    const n = forte ? 3 : 2, r = mulberry32((x * 11 + y * 5 + ang * 100) | 0), C = [];
    for (let i = 0; i < n; i++) C.push({ rol: [0.85, -0.85, 0][i] + (r() - 0.5) * 0.3, at: i * 0.045, tam: (forte ? 36 : 27) * (0.9 + r() * 0.25), sent: i % 2 ? -1 : 1 });
    const nos = C.map(() => ['crescF', true, () => geoCrescente('#7a2a08', '#ffb060', 0.07)]).concat(C.map(() => ['crescN', false, () => geoCrescente('#07030c', '#3a1024', 0.24)]));
    const E = novo('sombra', x, y, 0.045 * (n - 1) + 0.36, nos, { C, zc: z, ang, forte, forma: 'cortes' });
    E.no = (i, q, E) => {
      const fio = i < n, c = E.C[fio ? i : i - n], tt = E.t - c.at;
      if (tt <= 0) return null;
      const u = 1 - Math.pow(1 - cl(tt / 0.09, 0, 1), 3), f = sm(0.13, 0.33, tt);
      if (f >= 1) return null;
      q.p[2] = E.zc - E.z0; q.r[0] = c.rol + c.sent * (-1.25 + 1.25 * u); q.r[2] = E.ang;
      const s = c.tam * (0.75 + 0.25 * u) * (1 + 0.3 * f);
      q.s[0] = q.s[1] = q.s[2] = s; q.e = (fio ? 1.1 : 0.9) * (1 - f);
      if (!fio) q.p[2] -= 0.4;
      return true;
    };
    E.luz = (E) => 1.3 * (1 - E.t / E.dur); E.raioLuz = 90;
    E.iso = (ctx, E, C0, sx, sy) => {
      for (const c of E.C) {
        const tt = E.t - c.at; if (tt <= 0) continue;
        const u = cl(tt / 0.09, 0, 1), f = sm(0.13, 0.33, tt), a = c.rol * 0.9 + Math.PI / 2, L = c.tam * (0.75 + 0.25 * u) * (1 + 0.3 * f), cy = sy - E.zc + E.z0;
        const x0 = sx - Math.cos(a) * L, y0 = cy - Math.sin(a) * L, x1 = sx - Math.cos(a) * L * (1 - 2 * u), y1 = cy - Math.sin(a) * L * (1 - 2 * u);
        ctx.strokeStyle = rgba('20,8,4', 0.7 * (1 - f)); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(sx + Math.sin(a) * L * 0.35, cy - Math.cos(a) * L * 0.35, x1, y1); ctx.stroke();
        ctx.strokeStyle = rgba(C0.hi, 0.95 * (1 - f)); ctx.lineWidth = 2.2; ctx.stroke();
      }
    };
    const P = game.particles, K = COR.sombra;
    P.sparks(x, y, z, ang, forte ? 12 : 7, K.hi, 460, 0.7);
    P.flash(x, y, z, forte ? 40 : 24, K.rgb, 0.1);
    if (forte) P.smoke(x, y, z, 3, '16,8,22', 10);
    return E;
  }
  // VÉU ao lançar um poder: duas lâminas curvas girando em volta do corpo (fecham e abrem), lascas de
  // sombra subindo em espiral e fumaça escura com brasas
  function veu(dono) {
    const nos = [['crescF', true, () => geoCrescente('#7a2a08', '#ffb060', 0.07)], ['crescF', true, () => geoCrescente('#7a2a08', '#ffb060', 0.07)],
      ['crescN', false, () => geoCrescente('#07030c', '#3a1024', 0.24)], ['crescN', false, () => geoCrescente('#07030c', '#3a1024', 0.24)]];
    const r = mulberry32(((dono.x * 7 + dono.y * 3) | 0) + 5), L = [];
    for (let i = 0; i < 8; i++) { nos.push(['lascaS', false, () => geoLasca('#08040e', '#ff8a1f')]); L.push({ a: (i / 8) * TAU + r() * 0.5, rr: 20 + r() * 16, v: 2.5 + r() * 2, h: 50 + r() * 40, at: r() * 0.25, len: 18 + r() * 12 }); }
    const E = novo('sombra', dono.x, dono.y, 0.9, nos, { L, segue: dono, forma: 'veu', acF: 0 });
    E.no = (i, q, E) => {
      const t = E.t, sai = 1 - sm(E.dur - 0.3, E.dur, t);
      if (i < 4) {   // as duas lâminas (o fio em brasa e o corpo de sombra): uma na cintura, outra no peito, em sentidos opostos
        const fio = i < 2; if (!fio) i -= 2;
        const a = (i ? -1 : 1) * t * 11 + i * Math.PI, R = 44 - 22 * Math.sin(Math.PI * cl(t / 0.6, 0, 1)) + 26 * sm(0.6, E.dur, t);
        q.p[0] = Math.cos(a) * R; q.p[1] = Math.sin(a) * R; q.p[2] = i ? 50 : 30;
        q.r[1] = -Math.PI / 2; q.r[2] = a + Math.PI; q.s[0] = q.s[1] = q.s[2] = R; q.e = (fio ? 1.1 : 0.9) * sm(0, 0.08, t) * sai;
        if (!fio) q.p[2] -= 0.4;
        return sai > 0.03;
      }
      const c = E.L[i - 4], u = cl((t - c.at) / 0.55, 0, 1);
      if (u <= 0 || u >= 1) return null;
      const ang = c.a + t * c.v, rr = c.rr * (1 - 0.45 * u);
      q.p[0] = Math.cos(ang) * rr; q.p[1] = Math.sin(ang) * rr; q.p[2] = c.h * u;
      q.r[0] = 0.25 * Math.sin(ang * 3); q.s[0] = q.s[1] = 6 * (1 - u * 0.5); q.s[2] = c.len * Math.sin(Math.PI * u); q.e = 1.2;
      return true;
    };
    E.quadro = (dt, E, P) => { E.acF += dt * 14; while (E.acF >= 1) { E.acF--; const a = Math.random() * TAU; P.embers(E.x + Math.cos(a) * 22, E.y + Math.sin(a) * 22, 6, 1, COR.sombra.rgb, 5, 70); } };
    E.luz = (E) => 0.9 * sm(0, 0.1, E.t) * (1 - sm(E.dur - 0.3, E.dur, E.t)); E.raioLuz = 110;
    E.iso = (ctx, E, C0, sx, sy) => {
      const t = E.t, sai = 1 - sm(E.dur - 0.3, E.dur, t);
      for (let i = 0; i < 2; i++) { const a = (i ? -1 : 1) * t * 11 + i * Math.PI, R = 44 - 22 * Math.sin(Math.PI * cl(t / 0.6, 0, 1)) + 26 * sm(0.6, E.dur, t);
        ctx.strokeStyle = rgba(C0.hi, 0.9 * sai); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(sx, sy - (i ? 50 : 30), R * Math.SQRT2 * 0.72, R * Math.SQRT1_2 * 0.72, 0, a, a + 1.9); ctx.stroke(); }
      for (const c of E.L) { const u = cl((t - c.at) / 0.55, 0, 1); if (u <= 0 || u >= 1) continue; const ang = c.a + t * c.v, rr = c.rr * (1 - 0.45 * u), x = E.x + Math.cos(ang) * rr, y = E.y + Math.sin(ang) * rr;
        ctx.strokeStyle = rgba('30,12,40', 0.8); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(isoX(x, y), isoY(x, y) - c.h * u); ctx.lineTo(isoX(x, y), isoY(x, y) - c.h * u - c.len * Math.sin(Math.PI * u)); ctx.stroke(); }
    };
    game.particles.smoke(dono.x, dono.y, 20, 5, '16,8,22', 16);
    return E;
  }

  // ============================================================ GUERREIRO: lascas de rubi (junto da erupção de cristais)
  // no acerto: lascas rubras rompem o chão debaixo do alvo, tombadas para o lado do golpe
  function lascasRubras(x, y, ang, forte = false) {
    const n = forte ? 6 : 4, r = mulberry32((x * 17 + y * 29) | 0), L = [];
    for (let i = 0; i < n; i++) { const a = ang + (r() - 0.5) * 1.9, el = 0.55 + r() * 0.75, o = 4 + r() * 12;
      L.push({ dx: Math.cos(a) * Math.cos(el), dy: Math.sin(a) * Math.cos(el), dz: Math.sin(el), ox: Math.cos(a) * o, oy: Math.sin(a) * o, len: (forte ? 26 : 18) + r() * (forte ? 18 : 10), w: 9 + r() * 5, at: r() * 0.06 }); }
    const E = novo('rubro', x, y, 0.62, L.map(() => ['lascaR', false, () => geoLasca('#1c0204', '#ff5a24')]), { L, ang, forte, forma: 'lascas' });
    E.no = (i, q, E) => {
      const c = E.L[i], u = cl((E.t - c.at) / 0.07, 0, 1), f = sm(0.3, 0.6, E.t);
      if (u <= 0 || f >= 1) return null;
      q.p[0] = c.ox; q.p[1] = c.oy; q.p[2] = -c.len * 0.5 * f;
      apontar(q, c.dx, c.dy, c.dz);
      q.s[0] = q.s[1] = c.w; q.s[2] = c.len * (u + 0.12 * Math.sin(u * Math.PI)); q.e = 1.7 - 1.2 * f;
      return true;
    };
    E.luz = (E) => 1.1 * (1 - E.t / E.dur); E.raioLuz = 100;
    E.iso = (ctx, E, C0) => {
      const f = sm(0.3, 0.6, E.t);
      for (const c of E.L) { const u = cl((E.t - c.at) / 0.07, 0, 1) * (1 - f), x = E.x + c.ox, y = E.y + c.oy, X = isoX(x + c.dx * c.len * u, y + c.dy * c.len * u), Y = isoY(x + c.dx * c.len * u, y + c.dy * c.len * u) - c.dz * c.len * u;
        ctx.strokeStyle = rgba('90,10,8', 0.9 * (1 - f)); ctx.lineWidth = c.w * 0.3 + 1.5; ctx.beginPath(); ctx.moveTo(isoX(x, y), isoY(x, y)); ctx.lineTo(X, Y); ctx.stroke();
        ctx.strokeStyle = rgba(C0.hi, 0.9 * (1 - f)); ctx.lineWidth = 1.4; ctx.stroke(); }
    };
    const P = game.particles, K = COR.rubro;
    P.sparks(x, y, 8, ang, forte ? 10 : 6, K.hi, 380, 1.1);
    P.dust(x, y, forte ? 5 : 3, 9, 80, '70,22,20');
    return E;
  }
  // ao lançar um poder: coroa de lascas rompendo o chão em volta dos pés, em sequência, e um anel de brasa
  function seloRubro(dono) {
    const N = 11, r = mulberry32(((dono.x * 5 + dono.y * 9) | 0) + 3), L = [];
    for (let i = 0; i < N; i++) { const a = (i / N) * TAU + r() * 0.2; L.push({ a, el: 0.75 + r() * 0.4, rr: 30 + r() * 10, len: 24 + r() * 20, w: 11 + r() * 6, at: i * 0.014 }); }
    const nos = [['anelR', true, () => geoAnelRunas('#ff3018', 40, 0.06, 0)], ['anelR', true, () => geoAnelRunas('#ff3018', 40, 0.06, 0)]].concat(L.map(() => ['lascaR', false, () => geoLasca('#1c0204', '#ff5a24')]));
    const E = novo('rubro', dono.x, dono.y, 0.8, nos, { L, forma: 'selo' });
    E.no = (i, q, E) => {
      const t = E.t;
      if (i < 2) { const u = sm(0, 0.45, t - i * 0.1); if (u <= 0) return null; q.p[2] = 1.5 + i; q.s[0] = q.s[1] = 14 + (i ? 62 : 46) * u; q.e = 0.6 * (1 - sm(0.25, 0.7, t)); return q.e > 0.02; }
      const c = E.L[i - 2], u = cl((t - c.at) / 0.08, 0, 1), f = sm(0.4, 0.78, t);
      if (u <= 0 || f >= 1) return null;
      q.p[0] = Math.cos(c.a) * c.rr; q.p[1] = Math.sin(c.a) * c.rr; q.p[2] = -c.len * 0.5 * f;
      apontar(q, Math.cos(c.a) * Math.cos(c.el), Math.sin(c.a) * Math.cos(c.el), Math.sin(c.el));
      q.s[0] = q.s[1] = c.w; q.s[2] = c.len * (u + 0.15 * Math.sin(u * Math.PI)); q.e = 1.8 - 1.3 * f;
      return true;
    };
    E.luz = (E) => 1.5 * (1 - sm(0.2, E.dur, E.t)); E.raioLuz = 150;
    E.iso = (ctx, E, C0) => {
      const t = E.t, f = sm(0.4, 0.78, t);
      for (let i = 0; i < 2; i++) { const u = sm(0, 0.45, t - i * 0.1); if (u <= 0) continue; ctx.strokeStyle = rgba(C0.rgb, 0.85 * (1 - sm(0.25, 0.7, t))); ctx.lineWidth = 3; isoCirclePath(ctx, E.x, E.y, 14 + (i ? 62 : 46) * u); ctx.stroke(); }
      for (const c of E.L) { const u = cl((t - c.at) / 0.08, 0, 1) * (1 - f); if (u <= 0) continue; const x = E.x + Math.cos(c.a) * c.rr, y = E.y + Math.sin(c.a) * c.rr, k = c.len * u * Math.cos(c.el);
        ctx.strokeStyle = rgba('90,10,8', 0.9 * (1 - f)); ctx.lineWidth = c.w * 0.3 + 1.5; ctx.beginPath(); ctx.moveTo(isoX(x, y), isoY(x, y)); ctx.lineTo(isoX(x + Math.cos(c.a) * k, y + Math.sin(c.a) * k), isoY(x + Math.cos(c.a) * k, y + Math.sin(c.a) * k) - c.len * u * Math.sin(c.el)); ctx.stroke();
        ctx.strokeStyle = rgba(C0.hi, 0.9 * (1 - f)); ctx.lineWidth = 1.4; ctx.stroke(); }
    };
    const P = game.particles, K = COR.rubro;
    P.flash(dono.x, dono.y, 10, 60, K.rgb, 0.14);
    for (let i = 0; i < 8; i++) { const a = Math.random() * TAU; P.embers(dono.x + Math.cos(a) * 28, dono.y + Math.sin(a) * 28, 4, 1, K.hi, 6, 80); }
    return E;
  }

  // ============================================================ ARCANO: selo ao lançar e runa no acerto
  // dois círculos de runas nascem nos pés girando em sentidos opostos e sobem pelo corpo (uma varredura),
  // com octaedros subindo em hélice; nas melhorias (buff) duram mais
  function seloArcano(dono, longo = false) {
    const nos = [['circA', true, () => geoAnelRunas('#5a9cff', 56, 0.05, 20)], ['circB', true, () => geoAnelRunas('#8fc2ff', 48, 0.06, 12)]];
    const r = mulberry32(((dono.x * 3 + dono.y * 13) | 0) + 9), F = [];
    for (let i = 0; i < 6; i++) { nos.push(['octa', false, () => geoOcta('#0d1f4a', '#7fb8ff')]); F.push({ a: (i / 6) * TAU, v: 4 + r() * 2, s: 2.6 + r() * 1.6, at: i * 0.05, giro: r() * TAU }); }
    const E = novo('seloArcano', dono.x, dono.y, longo ? 1.35 : 0.95, nos, { F, segue: dono, cor: 'arcano', forma: 'selo' });
    E.no = (i, q, E) => {
      const t = E.t, D = E.dur, sai = 1 - sm(D - 0.3, D, t);
      if (i < 2) {
        const sobe = sm(D * 0.45, D, t);
        q.p[2] = 2 + i * 2.5 + sobe * (i ? 78 : 58); q.r[2] = (i ? -2.6 : 1.8) * t;
        q.s[0] = q.s[1] = (i ? 30 : 48) * (0.35 + 0.65 * sm(0, 0.22, t)) * (1 - 0.55 * sobe); q.e = (0.6 + 0.15 * Math.sin(t * 18 + i)) * sai;
        return q.e > 0.02;
      }
      const f = E.F[i - 2], u = cl((t - f.at) / (D - 0.25), 0, 1);
      if (u <= 0 || u >= 1) return null;
      const ang = f.a + t * f.v, rr = 30 - 16 * u;
      q.p[0] = Math.cos(ang) * rr; q.p[1] = Math.sin(ang) * rr; q.p[2] = 6 + 84 * u;
      q.r[0] = t * 3 + f.giro; q.r[1] = t * 2; q.s[0] = q.s[1] = q.s[2] = f.s * Math.sin(Math.PI * u); q.e = 1.8;
      return true;
    };
    E.luz = (E) => 1.2 * sm(0, 0.15, E.t) * (1 - sm(E.dur - 0.3, E.dur, E.t)); E.raioLuz = 130;
    E.iso = (ctx, E, C0, sx, sy) => {
      const t = E.t, D = E.dur, sai = 1 - sm(D - 0.3, D, t), sobe = sm(D * 0.45, D, t);
      for (let i = 0; i < 2; i++) { const R = (i ? 30 : 48) * (0.35 + 0.65 * sm(0, 0.22, t)) * (1 - 0.55 * sobe);
        ctx.strokeStyle = rgba(C0.hi, 0.85 * sai); ctx.lineWidth = 1.8; ctx.setLineDash([7, 4]); ctx.lineDashOffset = t * (i ? -60 : 45); ctx.beginPath(); ctx.ellipse(sx, sy - sobe * (i ? 78 : 58), R * Math.SQRT2, R * Math.SQRT1_2, 0, 0, TAU); ctx.stroke(); }
      ctx.setLineDash([]);
      for (const f of E.F) { const u = cl((t - f.at) / (D - 0.25), 0, 1); if (u <= 0 || u >= 1) continue; const ang = f.a + t * f.v, rr = 30 - 16 * u, x = E.x + Math.cos(ang) * rr, y = E.y + Math.sin(ang) * rr; GlowCache.draw(ctx, C0.hi, isoX(x, y), isoY(x, y) - 6 - 84 * u, f.s * 2.4 * Math.sin(Math.PI * u), 0.85); }
    };
    return E;
  }
  // no acerto do Arcano: um selo de runas em pé, de frente para o golpe, que abre e some
  function runaImpacto(x, y, z, ang, forte = false) {
    const E = novo('runa', x, y, 0.34, [['circC', true, () => geoAnelRunas('#3f7fff', 40, 0.08, 8)], ['circB', true, () => geoAnelRunas('#8fc2ff', 48, 0.06, 12)]], { zc: z, ang, forte, cor: 'arcano', forma: 'impacto' });
    E.no = (i, q, E) => {
      const u = sm(0, 0.2, E.t - i * 0.04), f = sm(0.12, 0.34, E.t);
      if (u <= 0) return null;
      q.p[2] = E.zc - E.z0; q.r[0] = i ? 0.55 : 0; q.r[1] = Math.PI / 2; q.r[2] = E.ang;   // (em pé, de frente para o golpe; o de dentro, inclinado)
      q.s[0] = q.s[1] = (E.forte ? 30 : 20) * (i ? 0.6 : 1) * (0.3 + 0.9 * u); q.e = 0.9 * (1 - f);
      return q.e > 0.02;
    };
    E.luz = (E) => 1.2 * (1 - E.t / E.dur); E.raioLuz = 90;
    E.iso = (ctx, E, C0, sx, sy) => { const u = sm(0, 0.2, E.t), f = sm(0.12, 0.34, E.t), R = (E.forte ? 30 : 20) * (0.3 + 0.9 * u); ctx.strokeStyle = rgba(C0.hi, 0.9 * (1 - f)); ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.ellipse(sx, sy - E.zc + E.z0, R * 0.55, R, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); };
    return E;
  }

  // ============================================================ ARQUEIRA: mira ao lançar
  // a mira fecha nos pés enquanto lascas violeta convergem à frente do peito e disparam em leque na direção do alvo
  function miraVioleta(dono, ang) {
    const nos = [['mira', true, () => geoMira('#9a5cff')]];
    const r = mulberry32(((dono.x * 23 + dono.y * 2) | 0) + 1), L = [];
    for (let i = 0; i < 6; i++) { nos.push(['lascaV', false, () => geoLasca('#3a0f6e', '#d6a6ff')]); L.push({ a: (i / 6) * TAU + r(), rr: 34 + r() * 16, h: 14 + r() * 40, ab: (i - 2.5) * 0.14, el: (r() - 0.5) * 0.3, len: 22 + r() * 12 }); }
    const E = novo('violeta', dono.x, dono.y, 0.72, nos, { L2: L, ang, segue: dono, forma: 'mira' });
    E.no = (i, q, E) => {
      const t = E.t;
      if (i === 0) { const k = sm(0, 0.1, t) * (1 - sm(0.45, 0.72, t)); q.p[2] = 2; q.r[2] = E.ang + t * 2.2; q.s[0] = q.s[1] = 62 - 34 * sm(0, 0.32, t); q.e = 0.62 * k; return k > 0.02; }
      const c = E.L2[i - 1], u = sm(0, 0.3, t), v = cl((t - 0.3) / 0.26, 0, 1), fx = Math.cos(E.ang), fy = Math.sin(E.ang);
      if (v >= 1) return null;
      const dA = E.ang + c.ab, dx = Math.cos(dA) * Math.cos(c.el), dy = Math.sin(dA) * Math.cos(c.el), dz = Math.sin(c.el);
      // de um anel em volta do corpo até o ponto à frente do peito; depois, disparadas
      const x0 = Math.cos(c.a) * c.rr, y0 = Math.sin(c.a) * c.rr, x1 = fx * 22, y1 = fy * 22, d = v * v * 110;
      q.p[0] = x0 + (x1 - x0) * u + dx * d; q.p[1] = y0 + (y1 - y0) * u + dy * d; q.p[2] = c.h + (32 - c.h) * u + dz * d;
      apontar(q, dx, dy, dz);
      q.s[0] = q.s[1] = 4.5 * (1 - v * 0.5); q.s[2] = c.len * (0.5 + 0.5 * u + 1.8 * v); q.e = 1.4 + v - sm(0.7, 1, v) * 2;
      return true;
    };
    E.quadro = (dt, E) => { if (E.t >= 0.3 && E.segue) E.segue = null; };   // (depois de disparadas, as lascas não acompanham mais o herói)
    E.luz = (E) => 0.9 * (1 - sm(0.4, E.dur, E.t)); E.raioLuz = 110;
    E.iso = (ctx, E, C0, sx, sy) => {
      const t = E.t, k = sm(0, 0.1, t) * (1 - sm(0.45, 0.72, t)), R = 62 - 34 * sm(0, 0.32, t);
      ctx.strokeStyle = rgba(C0.hi, 0.85 * k); ctx.lineWidth = 1.8; isoCirclePath(ctx, E.x, E.y, R); ctx.stroke();
      for (let j = 0; j < 4; j++) { const a = E.ang + t * 2.2 + j * Math.PI / 2, c = Math.cos(a), s = Math.sin(a); ctx.beginPath(); ctx.moveTo(isoX(E.x + c * R * 0.6, E.y + s * R * 0.6), isoY(E.x + c * R * 0.6, E.y + s * R * 0.6)); ctx.lineTo(isoX(E.x + c * R * 1.15, E.y + s * R * 1.15), isoY(E.x + c * R * 1.15, E.y + s * R * 1.15)); ctx.stroke(); }
      const v = cl((t - 0.3) / 0.26, 0, 1);
      if (v > 0 && v < 1) for (const c of E.L2) { const dA = E.ang + c.ab, x = E.x + Math.cos(E.ang) * 22 + Math.cos(dA) * v * v * 110, y = E.y + Math.sin(E.ang) * 22 + Math.sin(dA) * v * v * 110, l = c.len * (1 + 2.2 * v);
        ctx.strokeStyle = rgba(C0.hi, 0.9 * (1 - sm(0.7, 1, v))); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(isoX(x, y), isoY(x, y) - 32); ctx.lineTo(isoX(x + Math.cos(dA) * l, y + Math.sin(dA) * l), isoY(x + Math.cos(dA) * l, y + Math.sin(dA) * l) - 32); ctx.stroke(); }
    };
    return E;
  }

  // ============================================================ SACERDOTE: bênção ao lançar e centelhas no acerto
  // halo sobre a cabeça, um glifo e um sol de raios girando nos pés, e estrelas subindo em volta do corpo
  function bencao(dono) {
    const nos = [['halo', true, () => geoAnelRunas('#d6f2ff', 40, 0.12, 0)], ['glifoB', true, () => geoAnelRunas('#e6f8ff', 48, 0.05, 14)], ['raios', true, () => geoRaios('#bfe8ff', 14)]];
    const r = mulberry32(((dono.x * 9 + dono.y * 4) | 0) + 7), S = [];
    for (let i = 0; i < 6; i++) { nos.push(['estrela', true, () => geoEstrela('#f2fbff')]); S.push({ a: (i / 6) * TAU + r() * 0.6, rr: 18 + r() * 16, at: r() * 0.35, s: 3.2 + r() * 2.4, h: 60 + r() * 34 }); }
    const E = novo('celeste', dono.x, dono.y, 1.15, nos, { S, segue: dono, forma: 'bencao', R: 46, acEst: 0 });
    E.no = (i, q, E) => {
      const t = E.t, k = sm(0, 0.2, t) * (1 - sm(E.dur - 0.4, E.dur, t));
      if (k <= 0.01) return null;
      if (i === 0) { q.p[2] = 96 - 26 * sm(0, 0.5, t); q.r[2] = t * 1.6; q.s[0] = q.s[1] = 13 + 2.5 * Math.sin(t * 6); q.e = 0.7 * k; return true; }
      if (i === 1) { q.p[2] = 3; q.r[2] = -t * 1.3; q.s[0] = q.s[1] = E.R * (0.5 + 0.5 * sm(0, 0.3, t)); q.e = 0.42 * k; return true; }
      if (i === 2) { q.p[2] = 1.5; q.r[2] = t * 0.9; q.s[0] = q.s[1] = E.R * 1.25 * (0.4 + 0.6 * sm(0, 0.35, t)); q.e = (0.24 + 0.08 * Math.sin(t * 9)) * k; return true; }
      const c = E.S[i - 3], u = cl((t - c.at) / 0.7, 0, 1);
      if (u <= 0 || u >= 1) return null;
      const a = c.a + t * 1.4;
      q.p[0] = Math.cos(a) * c.rr; q.p[1] = Math.sin(a) * c.rr; q.p[2] = 8 + c.h * u; q.r[2] = t * 3 + c.a; q.r[0] = t * 2;
      q.s[0] = q.s[1] = q.s[2] = c.s * Math.sin(Math.PI * u); q.e = 1;
      return true;
    };
    E.luz = (E) => 1.2 * sm(0, 0.2, E.t) * (1 - sm(E.dur - 0.4, E.dur, E.t)); E.raioLuz = 130;
    E.iso = (ctx, E, C0, sx, sy) => {
      const t = E.t, k = sm(0, 0.2, t) * (1 - sm(E.dur - 0.4, E.dur, t)), R = E.R * (0.5 + 0.5 * sm(0, 0.3, t));
      ctx.strokeStyle = rgba(C0.hi, 0.8 * k); ctx.lineWidth = 1.8; ctx.setLineDash([9, 5]); ctx.lineDashOffset = t * 40; isoCirclePath(ctx, E.x, E.y, R); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 1.2; for (let j = 0; j < 14; j++) { const a = t * 0.9 + (j / 14) * TAU, r0 = R * 0.4, r1 = R * (j % 2 ? 1 : 1.3); ctx.strokeStyle = rgba(C0.core, 0.5 * k); ctx.beginPath(); ctx.moveTo(isoX(E.x + Math.cos(a) * r0, E.y + Math.sin(a) * r0), isoY(E.x + Math.cos(a) * r0, E.y + Math.sin(a) * r0)); ctx.lineTo(isoX(E.x + Math.cos(a) * r1, E.y + Math.sin(a) * r1), isoY(E.x + Math.cos(a) * r1, E.y + Math.sin(a) * r1)); ctx.stroke(); }
      ctx.strokeStyle = rgba(C0.core, 0.9 * k); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(sx, sy - (96 - 26 * sm(0, 0.5, t)), 14, 5, 0, 0, TAU); ctx.stroke();
      for (const c of E.S) { const u = cl((t - c.at) / 0.7, 0, 1); if (u <= 0 || u >= 1) continue; const a = c.a + t * 1.4, x = E.x + Math.cos(a) * c.rr, y = E.y + Math.sin(a) * c.rr; GlowCache.draw(ctx, C0.core, isoX(x, y), isoY(x, y) - 8 - c.h * u, c.s * 2.2 * Math.sin(Math.PI * u), 0.9); }
    };
    return E;
  }
  // no acerto do Sacerdote: três estrelas de luz saltam do ponto e sobem
  function centelhas(x, y, z, ang, forte = false) {
    const n = forte ? 5 : 3, r = mulberry32((x * 3 + y * 41) | 0), S = [];
    for (let i = 0; i < n; i++) { const a = ang + (r() - 0.5) * 2.6; S.push({ dx: Math.cos(a) * (14 + r() * 16), dy: Math.sin(a) * (14 + r() * 16), dz: 10 + r() * 26, s: (forte ? 5 : 3.6) + r() * 2, giro: r() * TAU }); }
    const E = novo('celeste', x, y, 0.42, S.map(() => ['estrela', true, () => geoEstrela('#f2fbff')]), { S, zc: z, forma: 'centelhas', R: 30, acEst: 0 });
    E.no = (i, q, E) => {
      const c = E.S[i], u = 1 - Math.pow(1 - cl(E.t / E.dur, 0, 1), 2);
      q.p[0] = c.dx * u; q.p[1] = c.dy * u; q.p[2] = E.zc - E.z0 + c.dz * u; q.r[2] = c.giro + E.t * 5; q.r[0] = E.t * 4;
      q.s[0] = q.s[1] = q.s[2] = c.s * Math.sin(Math.PI * cl(E.t / E.dur, 0, 1)); q.e = 1.1;
      return q.s[0] > 0.05;
    };
    E.luz = (E) => 0.9 * (1 - E.t / E.dur); E.raioLuz = 80;
    E.iso = (ctx, E, C0, sx, sy) => { const k = cl(E.t / E.dur, 0, 1), u = 1 - Math.pow(1 - k, 2); for (const c of E.S) GlowCache.draw(ctx, C0.core, isoX(E.x + c.dx * u, E.y + c.dy * u), isoY(E.x + c.dx * u, E.y + c.dy * u) - E.zc + E.z0 - c.dz * u, c.s * 2.4 * Math.sin(Math.PI * k), 0.9); };
    return E;
  }

  // ------------------------------------------------------------ ganchos gerais: lançar um poder e acertar um golpe
  // classe do herói (os cinco e quem o jogador cria com a classe deles)
  const classeDe = (p) => { const d = p && p.def, b = d && (d.base || d.id); return { kael: 'arcano', lyra: 'violeta', sera: 'celeste', drakos: 'rubro', orion: 'sombra' }[b] || null; };
  // Toda ativa lançada mostra a assinatura da classe (js/player.js, castAbility). A cura e o campo do
  // Sacerdote já têm o efeito inteiro (coluna de luz e cúpula): não ganham a bênção por cima.
  function aoLancar(p, id, tipo) {
    if (typeof game === 'undefined' || !p) return null;
    const c = classeDe(p);
    if (c === 'arcano') return seloArcano(p, tipo === 'buff');
    if (c === 'violeta') return miraVioleta(p, p.facing || 0);
    if (c === 'celeste') return id === 'sera_cura' || id === 'sera_campo' ? null : bencao(p);
    if (c === 'rubro') return seloRubro(p);
    if (c === 'sombra') return veu(p);
    return null;
  }
  // Cada golpe que acerta ganha o destaque da classe (js/game.js, onEnemyHit). A Arqueira já tem os
  // estilhaços no acerto da flecha. Com muitos alvos no mesmo golpe, só os primeiros ganham (sem pesar).
  let ultAcerto = -1;
  function aoAcertar(p, e, def, crit, kx, ky) {
    if (typeof game === 'undefined' || !p || !e || (def && def.hitstop !== undefined && def.hitstop < 0.01)) return null;   // (campos e auras que batem todo quadro: sem destaque)
    const c = classeDe(p), agora = game.realTime || 0;
    if (!c || c === 'violeta' || (agora - ultAcerto < 0.04 && agora >= ultAcerto) || ativos.length > 28) return null;
    ultAcerto = agora;
    const ang = Math.atan2(ky, kx), forte = !!(crit || (def && def.heavy)), z = Math.min((e.height || 40) * 0.55, 46) + (e.z || 0) + altura(e.x, e.y);
    const hx = e.x - kx * (e.radius || 12) * 0.6, hy = e.y - ky * (e.radius || 12) * 0.6;
    if (c === 'sombra') return cortes(hx, hy, z, ang, forte);
    if (c === 'rubro') return lascasRubras(e.x, e.y, ang, forte);
    if (c === 'arcano') return runaImpacto(hx, hy, z, ang, forte);
    return centelhas(hx, hy, z, ang, forte);
  }

  // ------------------------------------------------------------ quadro
  function update(dt) {
    if (typeof game === 'undefined') return;
    const P = game.particles;
    for (let n = ativos.length - 1; n >= 0; n--) {
      const E = ativos[n];
      E.t += dt;
      if (E.sala && game.room !== E.sala) { soltar(E); continue; }
      if (E.segue) { E.x = E.segue.x; E.y = E.segue.y; E.z0 = altura(E.x, E.y) + (E.segue.z || 0); }   // (as assinaturas de lançamento acompanham o herói)
      if (E.quadro) E.quadro(dt, E, P);
      if (E.tipo === 'arcano') {
        if (E.tM < 0) {
          if (E.t > E.carga + 0.6 || (E.dono && (E.dono.serial !== E.serial || (game.player.attack !== E.dono && game.player.state !== 'attack')))) { soltar(E); continue; }
          if (Math.random() < dt * 20) P.converge(E.x, E.y, 30, 1, E.R * 0.8, COR.arcano.hi, 0.3);
          continue;
        }
        if (!E.estourou) {
          E.estourou = true;
          const C = COR.arcano;
          P.flash(E.x, E.y, 20, E.R, C.rgb, 0.2); P.flash(E.x, E.y, 30, E.R * 0.4, C.core, 0.12);
          for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; P.emit && P.embers(E.x + Math.cos(a) * E.R * 0.5, E.y + Math.sin(a) * E.R * 0.5, 8 + Math.random() * 40, 1, C.hi, 4, 6); }   // (partículas suspensas)
          P.sparks(E.x, E.y, 10, 0, 16, C.hi, 380, Math.PI);
        }
        if (E.t - E.tM >= 1.3) { soltar(E); continue; }
        continue;
      }
      if (E.tipo === 'celeste') {
        E.acEst += dt * 22;
        while (E.acEst >= 1) { E.acEst--; const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * E.R * 0.8; P.embers(E.x + Math.cos(a) * rr, E.y + Math.sin(a) * rr, 2, 1, Math.random() < 0.5 ? COR.celeste.hi : COR.celeste.core, 3, 90); }
      }
      if (E.aoImpacto && E.d && E.t >= E.d.fall && !E.impactou) { E.impactou = true; E.aoImpacto(); }
      if (E.t >= E.dur) soltar(E);
    }
    // rastro espectral das flechas da Arqueira
    for (let i = rastros.length - 1; i >= 0; i--) {
      const s = rastros[i];
      if (s.dead || s.life <= 0) { rastros.splice(i, 1); continue; }
      if (Math.random() < 0.8) P.embers(s.x, s.y, s.z, 1, Math.random() < 0.5 ? COR.violeta.rgb : COR.violeta.hi, 3, 8);
    }
  }
  const rastros = [];
  function fila3P(Q) {
    for (const E of ativos) {
      if (!E.M) continue;
      for (const [o, mod, pose] of [[E.oS, E.M.solido, E.poseS], [E.oH, E.M.holo, E.poseH]]) {
        if (!mod.root.kids.length) continue;
        M3.trs(o.m, [E.x, E.y, E.z0], [0, 0, 0], [1, 1, 1]);
        const it = R3D.queue(mod, pose, null, o); it.ent = null; Q.push(it);
      }
    }
  }
  function luzes3P(lista) {
    for (const E of ativos) {
      const C = COR[E.cor || E.tipo];
      if (E.luz) { const k = E.luz(E); if (k > 0.05) lista.push([E.x, E.y, E.z0 + 30, E.raioLuz || 90, C.luz[0], C.luz[1], C.luz[2], k]); continue; }
      const k = E.tipo === 'violeta' ? (E.d ? 0.6 : 1.4 * (1 - E.t / E.dur)) : E.tipo === 'celeste' ? 1.6 * sm(0, 0.3, E.t) * (1 - sm(E.dur - 0.6, E.dur, E.t)) : (E.tM < 0 ? 0.8 : 2.4 * Math.exp(-(E.t - E.tM) * 3));
      if (k > 0.05) lista.push([E.x, E.y, E.z0 + 30, E.tipo === 'violeta' ? 90 : (E.R || 100) * 2.2, C.luz[0], C.luz[1], C.luz[2], k]);
    }
    return lista;
  }
  // vista isométrica: traço e brilho (os mesmos tempos)
  function desenharIso(ctx) {
    if (!ativos.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const E of ativos) {
      const C = COR[E.cor || E.tipo], sx = isoX(E.x, E.y), sy = isoY(E.x, E.y);
      if (E.iso) { E.iso(ctx, E, C, sx, sy); continue; }   // (os efeitos novos trazem o próprio desenho)
      if (E.tipo === 'violeta' && E.L) {
        const f = sm(0.25, 0.6, E.t);
        ctx.strokeStyle = rgba(C.hi, 0.9 * (1 - f)); ctx.lineWidth = 2;
        if (E.forte && E.t < 0.2) { const v = E.t / 0.2, fx = Math.cos(E.ang), fy = Math.sin(E.ang), d0 = -70 + 150 * v, x0 = E.x + fx * d0, y0 = E.y + fy * d0, x1 = x0 - fx * 78, y1 = y0 - fy * 78;
          ctx.strokeStyle = rgba(C.core, 0.95 * (1 - v * v)); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(isoX(x0, y0), isoY(x0, y0) - E.zc + E.z0); ctx.lineTo(isoX(x1, y1), isoY(x1, y1) - E.zc + E.z0); ctx.stroke(); }
        ctx.strokeStyle = rgba(C.hi, 0.9 * (1 - f)); ctx.lineWidth = 2;
        for (const c of E.L) { const u = cl((E.t - c.at) / 0.08, 0, 1) * (1 - f), z = E.zc; ctx.beginPath(); ctx.moveTo(isoX(E.x, E.y), isoY(E.x, E.y) - z); ctx.lineTo(isoX(E.x + c.dx * c.len * u, E.y + c.dy * c.len * u), isoY(E.x + c.dx * c.len * u, E.y + c.dy * c.len * u) - z - c.dz * c.len * u); ctx.stroke(); }
      } else if (E.tipo === 'violeta' && E.d) {
        const k = cl(E.t / E.d.fall, 0, 1), h = 260 * (1 - k), dz = E.dir;
        if (k < 1) { const x0 = E.x + dz[0] * h / dz[2], y0 = E.y + dz[1] * h / dz[2]; ctx.strokeStyle = rgba(C.hi, 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(isoX(x0, y0), isoY(x0, y0) - h); ctx.lineTo(isoX(x0 + dz[0] * 30, y0 + dz[1] * 30), isoY(x0 + dz[0] * 30, y0 + dz[1] * 30) - h - dz[2] * 30); ctx.stroke(); GlowCache.draw(ctx, C.rgb, isoX(x0, y0), isoY(x0, y0) - h, 10, 0.8); }
        ctx.strokeStyle = rgba(C.rgb, 0.6 * (1 - Math.max(0, E.t - E.d.fall) * 3)); ctx.lineWidth = 1.2; isoCirclePath(ctx, E.x, E.y, 16 * (1 - k) + 7); ctx.stroke();
      } else if (E.tipo === 'celeste') {
        const k = sm(0, 0.35, E.t) * (1 - sm(E.dur - 0.6, E.dur, E.t));
        for (const [R, v, a] of [[E.R, 0.9, 0.7], [E.R * 0.62, -1.6, 0.8]]) { ctx.strokeStyle = rgba(C.hi, a * k); ctx.lineWidth = 2; ctx.setLineDash([10, 6]); ctx.lineDashOffset = E.t * 40 * v; isoCirclePath(ctx, E.x, E.y, R); ctx.stroke(); }
        ctx.setLineDash([]);
        { const Rr = E.R * (E.forma === 'escudo' ? 0.95 : 1.2) * (0.5 + 0.5 * sm(0, 0.35, E.t)); ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(C.core, 0.45 * k);
          for (let j = 0; j < 14; j++) { const a = -E.t * 0.5 + (j / 14) * TAU, r0 = Rr * 0.3, r1 = Rr * (j % 2 ? 0.74 : 1); ctx.beginPath(); ctx.moveTo(isoX(E.x + Math.cos(a) * r0, E.y + Math.sin(a) * r0), isoY(E.x + Math.cos(a) * r0, E.y + Math.sin(a) * r0)); ctx.lineTo(isoX(E.x + Math.cos(a) * r1, E.y + Math.sin(a) * r1), isoY(E.x + Math.cos(a) * r1, E.y + Math.sin(a) * r1)); ctx.stroke(); }
          for (const S of E.estrelas || []) { const u = (E.t * 0.55 + S.fase) % 1, a = S.a + E.t * (E.forma === 'escudo' ? 1.1 : 0.7), x = E.x + Math.cos(a) * S.rr, y = E.y + Math.sin(a) * S.rr; GlowCache.draw(ctx, C.core, isoX(x, y), isoY(x, y) - 10 - S.h * u, S.s * 2 * Math.sin(Math.PI * u), 0.85 * k); } }
        if (E.forma !== 'escudo') { const g = ctx.createLinearGradient(0, sy - 400, 0, sy); g.addColorStop(0, rgba(C.core, 0)); g.addColorStop(1, rgba(C.hi, 0.35 * k)); ctx.fillStyle = g; ctx.fillRect(sx - E.R * 0.5, sy - 400, E.R, 400); }
        const hx = E.dono ? isoX(E.dono.x, E.dono.y) : sx, hy = (E.dono ? isoY(E.dono.x, E.dono.y) : sy) - (120 - 52 * sm(0, 0.8, E.t));
        ctx.strokeStyle = rgba(C.core, 0.9 * k); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(hx, hy, 16, 6, 0, 0, TAU); ctx.stroke();
      } else if (E.tipo === 'arcano') {
        const m = E.tM < 0 ? -1 : E.t - E.tM, k = sm(0, 0.2, E.t) * (1 - (m < 0 ? 0 : sm(0.6, 1.3, m)));
        for (let i = 0; i < 3; i++) { const R = E.R * 0.5 * [1, 0.72, 0.42][i], rot = E.t * [1.4, -2.3, 3.1][i], h = [26, 40, 56][i];
          ctx.strokeStyle = rgba(C.hi, 0.75 * k); ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]); ctx.lineDashOffset = rot * 20; ctx.beginPath(); ctx.ellipse(sx, sy - h, R * Math.SQRT2, R * Math.SQRT1_2 * (0.6 + 0.4 * Math.abs(Math.cos(rot))), rot * 0.2, 0, TAU); ctx.stroke(); }
        ctx.setLineDash([]);
        if (m >= 0) { const R = E.R * (0.2 + sm(0, 0.45, m)); ctx.strokeStyle = rgba(C.rgb, 0.9 * (1 - sm(0.2, 0.9, m))); ctx.lineWidth = 3; isoCirclePath(ctx, E.x, E.y, R); ctx.stroke(); }
        for (const F of E.frag) { const ang = F.a + E.t * F.v, imp = m < 0 ? 0 : sm(0, 0.12, m), fora = m < 0 ? 0 : sm(0.12, 0.5, m), rr = F.rr * (1 - imp + 1.6 * fora), x = E.x + Math.cos(ang) * rr, y = E.y + Math.sin(ang) * rr; GlowCache.draw(ctx, C.hi, isoX(x, y), isoY(x, y) - F.h, F.s * 2.5 * (m < 0 ? 1 : 1 - sm(0.3, 0.62, m)), 0.8 * k); }
        if (m >= 0 && m < 0.5) { const g = ctx.createLinearGradient(0, sy - 300, 0, sy); g.addColorStop(0, rgba(C.core, 0)); g.addColorStop(1, rgba(C.hi, 0.7 * Math.exp(-m * 6.5))); ctx.fillStyle = g; const w = E.R * 0.4 * (1 - 0.75 * sm(0, 0.45, m)); ctx.fillRect(sx - w / 2, sy - 300, w, 300); }
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ ganchos nas classes
  const temaDe = (p) => { const d = p && p.def, b = d && (d.base || d.id); return b === 'lyra' ? 'violeta' : b === 'sera' ? 'celeste' : b === 'kael' ? 'arcano' : b === 'orion' ? 'sombra' : null; };
  function ligar() {
    // Arqueira: acerto da flecha → estilhaços; flecha disparada → rastro; chuva → flechas espectrais
    if (typeof lyraHitEnemy === 'function' && !lyraHitEnemy._pc) {
      const orig = lyraHitEnemy;
      lyraHitEnemy = function (p, e, dmg, angle, info) {   // eslint-disable-line no-global-assign
        const ok = orig.apply(this, arguments);
        if (ok && e) estilhacos(e.x, e.y, (e.z || 0) + altura(e.x, e.y) + 26, angle || 0, !!(info && (info.heavy || info.charged)));
        return ok;
      };
      lyraHitEnemy._pc = true;
    }
    if (typeof lyraShot === 'function' && !lyraShot._pc) {
      const orig = lyraShot;
      lyraShot = function () { const s = orig.apply(this, arguments); if (s) rastros.push(s); return s; };   // eslint-disable-line no-global-assign
      lyraShot._pc = true;
    }
    if (typeof LyraRain !== 'undefined' && !LyraRain.prototype._pc) {
      const up = LyraRain.prototype.update;
      LyraRain.prototype.update = function (dt) { const r = up.call(this, dt); for (const d of this.drops) if (!d._pc) { d._pc = true; flechaCaindo(d); } return r; };
      LyraRain.prototype._pc = true;
    }
    // Sacerdote: cura (coluna de luz) e campo de força (cúpula)
    if (typeof ABILITIES !== 'undefined' && ABILITIES.sera_cura && !ABILITIES.sera_cura._pc) {
      const cura = ABILITIES.sera_cura.cast, campo = ABILITIES.sera_campo.cast;
      ABILITIES.sera_cura.cast = (p, lv) => { const ok = cura(p, lv); if (ok) celeste(p.x, p.y, 90, 'cura', p); return ok; };
      ABILITIES.sera_campo.cast = (p, lv) => { const ok = campo(p, lv); if (ok) celeste(p.forceFieldX, p.forceFieldY, p.forceFieldR || 130, 'escudo', null); return ok; };
      ABILITIES.sera_cura._pc = true;
    }
  }
  ligar();

  const limpar = () => { while (ativos.length) soltar(ativos[0]); rastros.length = 0; };
  const estado = () => ativos.map((E) => ({ tipo: E.tipo, forma: E.forma || (E.d ? 'chuva' : E.L ? 'estilhacos' : E.tipo), t: +E.t.toFixed(2), nos: E.nos.length }));
  return { COR, ativos, rastros, estilhacos, flechaCaindo, celeste, arcano, manifestarArcano, update, fila3P, luzes3P, desenharIso, temaDe, ligar, limpar, estado, geoLasca, geoFlecha, geoAnelRunas,
    cortes, veu, lascasRubras, seloRubro, seloArcano, runaImpacto, miraVioleta, bencao, centelhas, classeDe, aoLancar, aoAcertar, geoCrescente, geoRaios, geoEstrela, geoMira };
})();
if (typeof window !== 'undefined') window.PoderesClasses = PoderesClasses;
