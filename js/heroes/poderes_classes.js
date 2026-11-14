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
      if (i === L.length) return null;   // (a flecha espectral não aparece no estilhaço)
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
    const r = mulberry32((x * 31 + y * 17) | 0), penas = [];
    for (let i = 0; i < 7; i++) penas.push({ a: r() * TAU, rr: R * (0.2 + r() * 0.6), h0: 70 + r() * 60, giro: r() * TAU, fase: r() });
    const E = novo('celeste', x, y, forma === 'escudo' ? 1.8 : 2.2, nos, { R, forma, penas, dono, acEst: 0 });
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
        q.s[0] = q.s[1] = E.R * 0.5 * esc * (0.6 + 0.4 * uC) * (m < 0 ? 1 : 1 + 0.6 * sm(0, 0.2, m)); q.e = (1 + 0.5 * uC + (m >= 0 ? 1.4 * Math.exp(-m * 6) : 0)) * k; return true;
      }
      if (i === 3) {   // onda de choque: anel de runas rente ao chão, que se expande depois do impacto
        if (m < 0) return null;
        q.p[2] = 2; q.r[2] = m * 0.8; q.s[0] = q.s[1] = E.R * (0.2 + 1.0 * sm(0, 0.45, m)); q.e = 1.8 * (1 - sm(0.2, 0.9, m)); return q.e > 0.02;
      }
      const F = E.frag[i - 4], ang = F.a + t * F.v, imp = m < 0 ? 0 : sm(0, 0.12, m);   // fragmentos: orbitam e, no impacto, implodem
      const rr = F.rr * (m < 0 ? 0.7 + 0.3 * uC : 1 - imp);
      q.p[0] = Math.cos(ang) * rr; q.p[1] = Math.sin(ang) * rr; q.p[2] = F.h * (1 - imp * 0.8) + Math.sin(t * 3 + F.giro) * 4;
      q.r[0] = t * 2 + F.giro; q.r[1] = t * 1.3; q.s[0] = q.s[1] = q.s[2] = F.s * (m < 0 ? uC : 1 - sm(0.08, 0.2, m)); q.e = 1.2 + uC;
      return q.s[0] > 0.1;
    };
    return E;
  }
  function manifestarArcano(E, x, y) {
    if (!E || E.tM >= 0) return;
    if (x !== undefined) { E.x = x; E.y = y; E.z0 = altura(x, y); }
    E.tM = E.t;
  }

  // ------------------------------------------------------------ quadro
  function update(dt) {
    if (typeof game === 'undefined') return;
    const P = game.particles;
    for (let n = ativos.length - 1; n >= 0; n--) {
      const E = ativos[n];
      E.t += dt;
      if (E.sala && game.room !== E.sala) { soltar(E); continue; }
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
      const C = COR[E.tipo], k = E.tipo === 'violeta' ? (E.d ? 0.6 : 1.4 * (1 - E.t / E.dur)) : E.tipo === 'celeste' ? 1.6 * sm(0, 0.3, E.t) * (1 - sm(E.dur - 0.6, E.dur, E.t)) : (E.tM < 0 ? 0.8 : 2.4 * Math.exp(-(E.t - E.tM) * 3));
      if (k > 0.05) lista.push([E.x, E.y, E.z0 + 30, E.tipo === 'violeta' ? 90 : (E.R || 100) * 2.2, C.luz[0], C.luz[1], C.luz[2], k]);
    }
    return lista;
  }
  // vista isométrica: traço e brilho (os mesmos tempos)
  function desenharIso(ctx) {
    if (!ativos.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const E of ativos) {
      const C = COR[E.tipo], sx = isoX(E.x, E.y), sy = isoY(E.x, E.y);
      if (E.tipo === 'violeta' && E.L) {
        const f = sm(0.25, 0.6, E.t);
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
        if (E.forma !== 'escudo') { const g = ctx.createLinearGradient(0, sy - 400, 0, sy); g.addColorStop(0, rgba(C.core, 0)); g.addColorStop(1, rgba(C.hi, 0.35 * k)); ctx.fillStyle = g; ctx.fillRect(sx - E.R * 0.5, sy - 400, E.R, 400); }
        const hx = E.dono ? isoX(E.dono.x, E.dono.y) : sx, hy = (E.dono ? isoY(E.dono.x, E.dono.y) : sy) - (120 - 52 * sm(0, 0.8, E.t));
        ctx.strokeStyle = rgba(C.core, 0.9 * k); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(hx, hy, 16, 6, 0, 0, TAU); ctx.stroke();
      } else if (E.tipo === 'arcano') {
        const m = E.tM < 0 ? -1 : E.t - E.tM, k = sm(0, 0.2, E.t) * (1 - (m < 0 ? 0 : sm(0.6, 1.3, m)));
        for (let i = 0; i < 3; i++) { const R = E.R * 0.5 * [1, 0.72, 0.42][i], rot = E.t * [1.4, -2.3, 3.1][i], h = [26, 40, 56][i];
          ctx.strokeStyle = rgba(C.hi, 0.75 * k); ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]); ctx.lineDashOffset = rot * 20; ctx.beginPath(); ctx.ellipse(sx, sy - h, R * Math.SQRT2, R * Math.SQRT1_2 * (0.6 + 0.4 * Math.abs(Math.cos(rot))), rot * 0.2, 0, TAU); ctx.stroke(); }
        ctx.setLineDash([]);
        if (m >= 0) { const R = E.R * (0.2 + sm(0, 0.45, m)); ctx.strokeStyle = rgba(C.rgb, 0.9 * (1 - sm(0.2, 0.9, m))); ctx.lineWidth = 3; isoCirclePath(ctx, E.x, E.y, R); ctx.stroke(); }
        for (const F of E.frag) { const ang = F.a + E.t * F.v, imp = m < 0 ? 0 : sm(0, 0.12, m), rr = F.rr * (1 - imp), x = E.x + Math.cos(ang) * rr, y = E.y + Math.sin(ang) * rr; GlowCache.draw(ctx, C.hi, isoX(x, y), isoY(x, y) - F.h, F.s * 2.5, 0.8 * k); }
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ ganchos nas classes
  const temaDe = (p) => { const d = p && p.def, b = d && (d.base || d.id); return b === 'lyra' ? 'violeta' : b === 'sera' ? 'celeste' : b === 'kael' ? 'arcano' : null; };
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
  return { COR, ativos, rastros, estilhacos, flechaCaindo, celeste, arcano, manifestarArcano, update, fila3P, luzes3P, desenharIso, temaDe, ligar, limpar, estado, geoLasca, geoFlecha, geoAnelRunas };
})();
if (typeof window !== 'undefined') window.PoderesClasses = PoderesClasses;
