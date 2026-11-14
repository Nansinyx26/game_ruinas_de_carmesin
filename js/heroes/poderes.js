'use strict';
// ECLIPSE ZERO · Poderes: efeitos de habilidade com geometria de verdade e identidade por classe (Poderes)
// ---------------------------------------------------------------------------
// Os golpes de área não são mais só círculos desenhados no chão. Cada classe tem a sua MANIFESTAÇÃO:
//   rubro    (Guerreiro, Drakos)        ERUPÇÃO DE CRISTAIS: dois anéis de energia, rachaduras de lava que se
//                                       espalham pelo terreno e dezenas de cristais facetados que rompem o chão
//   (as outras classes entram aqui com a forma delas — flechas espectrais, luz celestial, runas —, nunca a
//    mesma erupção com outra cor: ver docs/PENDENCIAS.md)
// O QUE É CADA COISA
//   · CRISTAIS: malhas facetadas (prisma irregular de 5 ou 6 lados com coroa em ponta, sozinhas ou em
//     cachos com lascas menores), corpo escuro de rubi, base incandescente (o núcleo), arestas emissivas e
//     contorno aceso pelo contraluz. Cada um tem tamanho, giro e inclinação próprios; os maiores ficam na
//     borda do anel, os pequenos espalhados dentro. Projetam sombra (mapa de sombras do sol) e pegam luz.
//   · ANÉIS: duas faixas concêntricas (a de fora vermelha viva, a de dentro alaranjada) que acompanham a
//     altura do terreno, com a borda irregular; pulsam enquanto o poder dura.
//   · RACHADURAS: linhas ramificadas que nascem do centro e dos anéis, com pontos de luz nos encontros;
//     aparecem em três levas e a energia corre por elas (brilho que oscila).
//   · PARTÍCULAS: energia convergindo na carga; clarão, estilhaços, fragmentos e fumaça escura na
//     manifestação; brasas subindo e pequenos clarões enquanto dura.
//   · LUZ: uma luz pontual vermelha no centro (a 3ª pessoa ilumina o chão, as pedras e as pernas do herói).
// AS TRÊS ETAPAS
//   1. CARGA (o preparo do golpe): os anéis surgem e crescem, as primeiras rachaduras abrem, a energia converge.
//   2. MANIFESTAÇÃO (o golpe acerta o chão): os cristais rompem o solo em sequência, com um pulso de luz.
//   3. DESINTEGRAÇÃO: os cristais apagam e afundam, as rachaduras esfriam, os anéis somem. Nada fica no cenário.
// Não muda dano, alcance nem recarga: o raio e o centro são os da área do golpe (ATTACKS[...].shape).
// DESENHO: na 3ª pessoa, um modelo 3D por efeito (um nó por cristal: posição, escala e brilho animados
// na pose, uma chamada de desenho); na vista isométrica, as mesmas facetas projetadas no canvas e postas
// na lista ordenada por profundidade (o herói passa na frente e atrás dos cristais). Os modelos voltam
// para uma reserva ao terminar (sem criar e destruir a cada golpe).
// ---------------------------------------------------------------------------
const PODERES_TEMAS = {
  rubro: { anelE: '#ff2630', anelI: '#ff7a36', racha: '#ff4a1e', no: '#ffb070', corpo: '#1c0204', base: '#e8401c', ponta: '#8a0a12', aresta: '#ff2a18', rim: '#ff2a1c',
    rgb: '255,56,40', brasa: '255,120,50', fumo: '48,8,8', pedra: '70,22,20', luz: [1, 0.2, 0.1] },
};
const Poderes = (() => {
  const ativos = [], reserva = {};
  let serie = 1;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const volta = (u) => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };   // passa um pouco do tamanho e assenta
  const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const altura = (x, y) => (typeof Relevo !== 'undefined' && typeof game !== 'undefined' && Relevo.ativo && Relevo.ativo(game.room) ? Relevo.altura(x, y) : 0);

  // ------------------------------------------------------------ formas dos cristais (espaço unitário)
  // Uma lasca: base enterrada (z = −0,3), ombro (onde as faces viram a coroa) e a ponta em z = 1.
  // Devolve as faces (polígonos com normal para fora e a altura 0..1 de cada vértice) e as arestas.
  function lasca(r) {
    const n = r() < 0.5 ? 5 : 6, giro = r() * TAU, zo = 0.56 + r() * 0.2, V = [];
    for (let i = 0; i < n; i++) { const a = giro + (i + (r() - 0.5) * 0.4) / n * TAU, rb = 0.82 + r() * 0.3; V.push([Math.cos(a) * rb, Math.sin(a) * rb, -0.3, 0]); }
    for (let i = 0; i < n; i++) { const a = giro + (i + 0.12 + (r() - 0.5) * 0.3) / n * TAU, ro = 0.7 + r() * 0.32, z = zo * (0.88 + r() * 0.24); V.push([Math.cos(a) * ro, Math.sin(a) * ro, z, z]); }
    V.push([(r() - 0.5) * 0.34, (r() - 0.5) * 0.34, 1, 1]);
    const F = [], A = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      F.push([i, j, n + j, n + i]); F.push([n + i, n + j, 2 * n]);
      A.push([i, n + i], [n + i, 2 * n], [n + i, n + j]);
    }
    return { V, F, A };
  }
  // Um cristal: a lasca principal e, às vezes, uma ou duas menores inclinadas ao pé dela (cacho)
  function forma(sem) {
    const r = mulberry32(sem), partes = [{ L: lasca(r), m: M3.make() }], extras = r() < 0.55 ? (r() < 0.4 ? 2 : 1) : 0;
    for (let k = 0; k < extras; k++) {
      const a = r() * TAU, e = 0.3 + r() * 0.26, m = M3.make();
      M3.trs(m, [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0], [Math.sin(a) * 0.5, -Math.cos(a) * 0.5, r() * TAU], [e, e, e * (0.9 + r() * 0.5)]);
      partes.push({ L: lasca(r), m });
    }
    const faces = [], arestas = [];
    const tp = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3], m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7], m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11]];
    for (const P of partes) {
      const W = P.L.V.map((v) => { const q = tp(P.m, v); q.push(v[3]); return q; }), eixo = tp(P.m, [0, 0, 0.4]);
      for (const f of P.L.F) {
        const p = f.map((i) => W[i]), a = p[0], b = p[1], c = p[2];
        let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        const cx = p.reduce((s, q) => s + q[0], 0) / p.length - eixo[0], cy = p.reduce((s, q) => s + q[1], 0) / p.length - eixo[1], cz = p.reduce((s, q) => s + q[2], 0) / p.length - eixo[2];
        if (nx * cx + ny * cy + nz * cz < 0) { p.reverse(); nx = -nx; ny = -ny; nz = -nz; }
        faces.push({ p, n: [nx, ny, nz], h: p.reduce((s, q) => s + q[3], 0) / p.length });
      }
      for (const [i, j] of P.L.A) arestas.push([W[i], W[j], eixo]);
    }
    return { faces, arestas };
  }
  const FORMAS = [];
  function formas() { if (!FORMAS.length) for (let i = 0; i < 8; i++) FORMAS.push(forma(4217 + i * 977)); return FORMAS; }
  // Cor e emissão de um ponto do cristal pela altura (0 base incandescente, ombro escuro, ponta acesa)
  function tinta(T, h) {
    const b = hex3(T.base), c = hex3(T.corpo), p = hex3(T.ponta);
    return h < 0.6 ? [mix3(b, c, sm(0, 0.45, h)), 0.95 - 0.9 * sm(0, 0.45, h)] : [mix3(c, p, (h - 0.6) / 0.4), 0.05 + 0.45 * (h - 0.6) / 0.4];
  }
  // Geometria do motor (10 números por vértice) de uma forma, com as arestas emissivas
  const GEOS = {};
  function geoForma(tema, i) {
    const k = tema + i; if (GEOS[k]) return GEOS[k];
    const T = PODERES_TEMAS[tema], Fm = formas()[i], d = [], ar = hex3(T.aresta);
    for (const f of Fm.faces) for (let t = 1; t < f.p.length - 1; t++) for (const q of [f.p[0], f.p[t], f.p[t + 1]]) { const [c, e] = tinta(T, cl(q[3], 0, 1)); d.push(q[0], q[1], q[2], f.n[0], f.n[1], f.n[2], c[0], c[1], c[2], e); }
    for (const [a, b, ex] of Fm.arestas) {
      // fita fina ao longo da aresta, um pouco para fora do corpo (a borda luminosa)
      const mx = (a[0] + b[0]) / 2 - ex[0], my = (a[1] + b[1]) / 2 - ex[1], ml = Math.hypot(mx, my) || 1, ox = mx / ml, oy = my / ml;
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      let wx = dy * 0 - dz * oy, wy = dz * ox - dx * 0, wz = dx * oy - dy * ox; const wl = Math.hypot(wx, wy, wz) || 1; wx = wx / wl * 0.045; wy = wy / wl * 0.045; wz = wz / wl * 0.045;
      const P4 = [[a[0] + ox * 0.03 - wx, a[1] + oy * 0.03 - wy, a[2] - wz], [a[0] + ox * 0.03 + wx, a[1] + oy * 0.03 + wy, a[2] + wz], [b[0] + ox * 0.03 + wx, b[1] + oy * 0.03 + wy, b[2] + wz], [b[0] + ox * 0.03 - wx, b[1] + oy * 0.03 - wy, b[2] - wz]];
      for (const q of [P4[0], P4[1], P4[2], P4[0], P4[2], P4[3]]) d.push(q[0], q[1], q[2], ox, oy, 0.2, ar[0], ar[1], ar[2], 0.85);
    }
    return (GEOS[k] = { d });
  }

  // ------------------------------------------------------------ anéis e rachaduras (no chão do lugar)
  // faixa plana entre dois raios, com a borda irregular, seguindo a altura do terreno
  function anel(d, I, R, larg, cor, e, r) {
    const N = 56, c = hex3(cor);
    const pt = (i, k) => { const a = (i / N) * TAU, rr = R + k * larg * (0.75 + 0.5 * Math.abs(Math.sin(i * 2.7 + R))) + Math.sin(i * 1.9 + R * 0.3) * 0.5; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; return [x, y, altura(I.x + x, I.y + y) - I.z0 + 0.9]; };
    for (let i = 0; i < N; i++) {
      const a0 = pt(i, -0.5), a1 = pt(i, 0.5), b0 = pt(i + 1, -0.5), b1 = pt(i + 1, 0.5);
      for (const q of [a0, a1, b1, a0, b1, b0]) d.push(q[0], q[1], q[2], 0, 0, 1, c[0], c[1], c[2], e);
    }
  }
  // rachadura: caminhada que ramifica, em fitas finas; guarda os trechos (para a vista isométrica)
  function rachaduras(I, r) {
    const linhas = [[], [], []], nos = [[], [], []];
    const anda = (g, p, ang, passos, w) => {
      for (let s = 0; s < passos; s++) {
        ang += (r() - 0.5) * 1.1;
        const l = 7 + r() * 11, q = [p[0] + Math.cos(ang) * l, p[1] + Math.sin(ang) * l];
        if (Math.hypot(q[0], q[1]) > I.R * 1.06) break;
        linhas[g].push([p[0], p[1], q[0], q[1], w]);
        if (r() < 0.3 && passos > 2) { nos[g].push([q[0], q[1], 0.9 + r() * 0.7]); anda(Math.min(2, g + 1), q, ang + (r() < 0.5 ? 0.8 : -0.8) + (r() - 0.5) * 0.4, Math.ceil(passos * 0.55), w * 0.7); }
        p = q; w *= 0.9;
      }
    };
    const n0 = 7 + Math.floor(r() * 3);
    for (let i = 0; i < n0; i++) { const a = (i / n0) * TAU + r() * 0.5, r0 = I.R * (0.08 + r() * 0.12); anda(0, [Math.cos(a) * r0, Math.sin(a) * r0], a, 5 + Math.floor(r() * 3), 1.15); }
    const n1 = 9 + Math.floor(r() * 4);
    for (let i = 0; i < n1; i++) { const a = r() * TAU, r0 = I.R * 0.56; anda(1, [Math.cos(a) * r0, Math.sin(a) * r0], a + (r() < 0.5 ? 0 : Math.PI) + (r() - 0.5), 4 + Math.floor(r() * 3), 0.95); }
    const n2 = 11 + Math.floor(r() * 5);
    for (let i = 0; i < n2; i++) { const a = r() * TAU, r0 = I.R * 0.97; anda(2, [Math.cos(a) * r0, Math.sin(a) * r0], a + Math.PI + (r() - 0.5) * 1.4, 3 + Math.floor(r() * 3), 0.85); }
    return { linhas, nos };
  }
  // as fitas das rachaduras e os pontos de luz, na altura do terreno de onde o efeito está
  function geoRachas(I) {
    const T = I.T, cor = hex3(T.racha), no = hex3(T.no), levas = [[], [], []];
    const fita = (d, a, b, w) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, px = -dy / l * w, py = dx / l * w;
      const za = altura(I.x + a[0], I.y + a[1]) - I.z0 + 0.7, zb = altura(I.x + b[0], I.y + b[1]) - I.z0 + 0.7;
      for (const q of [[a[0] - px, a[1] - py, za], [a[0] + px, a[1] + py, za], [b[0] + px * 0.7, b[1] + py * 0.7, zb], [a[0] - px, a[1] - py, za], [b[0] + px * 0.7, b[1] + py * 0.7, zb], [b[0] - px * 0.7, b[1] - py * 0.7, zb]]) d.push(q[0], q[1], q[2], 0, 0, 1, cor[0], cor[1], cor[2], 1.2);
    };
    const ponto = (d, p, s) => { const z = altura(I.x + p[0], I.y + p[1]) - I.z0 + 0.8; for (const q of [[p[0] - s, p[1], z], [p[0], p[1] - s, z], [p[0] + s, p[1], z], [p[0] - s, p[1], z], [p[0] + s, p[1], z], [p[0], p[1] + s, z]]) d.push(q[0], q[1], q[2], 0, 0, 1, no[0], no[1], no[2], 1.6); };
    for (let g = 0; g < 3; g++) {
      for (const L of I.racha.linhas[g]) fita(levas[g], [L[0], L[1]], [L[2], L[3]], L[4]);
      for (const N of I.racha.nos[g]) ponto(levas[g], N, N[2]);
    }
    return levas;
  }

  // ------------------------------------------------------------ o efeito
  // ERUPÇÃO DE CRISTAIS em (x, y), raio R. o: { tema, carga (s de preparo antes da manifestação; 0 = já),
  //   dono (o golpe: se ele for interrompido antes do impacto, o efeito se desfaz), evitar [dx, dy] (o herói, a partir do centro:
  //   nenhum cristal nasce debaixo dele), vida (s que dura depois de manifestar) }
  function cristais(x, y, R, o = {}) {
    const tema = PODERES_TEMAS[o.tema] ? o.tema : 'rubro', T = PODERES_TEMAS[tema], sem = (serie++ * 7919 + 131) | 0, r = mulberry32(sem);
    const I = { tipo: 'cristais', tema, T, x, y, R, z0: altura(x, y), t: 0, carga: o.carga || 0, tM: o.carga ? -1 : 0, vida: o.vida || 1.55, fim: 0.9, dono: o.dono || null, serial: o.dono ? o.dono.serial : 0,
      C: [], sem, sala: typeof game !== 'undefined' ? game.room : null, acBrasa: 0, acFumo: 0, acPulso: 0.3, estourou: false, o3: { m: M3.make(), flash: 0, emi: 1, holo: false, ghost: null, tint: null, rim: T.rim, raio: R + 60 } };
    // cristais: os grandes na borda do anel de fora, médios no de dentro, pequenos espalhados
    const n = cl(Math.round(R * 0.27), 18, 44), ev = o.evitar;
    for (let i = 0, guarda = 0; i < n && guarda < n * 6; guarda++) {
      const u = i / n, faixa = u < 0.42 ? 0 : u < 0.66 ? 1 : 2;
      const a = r() * TAU, rr = faixa === 0 ? R * (0.9 + r() * 0.12) : faixa === 1 ? R * (0.5 + r() * 0.14) : R * (0.14 + r() * 0.76);
      const dx = Math.cos(a) * rr, dy = Math.sin(a) * rr;
      if (ev && Math.hypot(dx - ev[0], dy - ev[1]) < 24) continue;
      if (I.C.some((c) => Math.hypot(c.dx - dx, c.dy - dy) < (faixa === 2 ? 9 : 12))) continue;
      const grande = faixa === 0 ? 0.7 + r() * 0.6 : faixa === 1 ? 0.5 + r() * 0.4 : 0.3 + r() * 0.35;
      const incl = 0.08 + r() * 0.3, ai = a + (r() - 0.5) * 1.2;   // pende para fora do centro
      I.C.push({ dx, dy, dz: altura(x + dx, y + dy) - I.z0, giro: r() * TAU, rx: Math.sin(ai) * incl, ry: -Math.cos(ai) * incl, r: 3.2 + grande * 3.6, h: 9 + grande * 26 * (0.75 + r() * 0.5),
        forma: Math.floor(r() * 8), atraso: (faixa === 0 ? 0 : faixa === 1 ? 0.07 : 0.03) + r() * 0.24, fase: r(), saiu: false });
      i++;
    }
    I.racha = rachaduras(I, r);
    I.modelo = montar(I);
    assentar(I);
    I.pose = (m) => posar(m, I);
    ativos.push(I);
    return I;
  }
  // Modelo do efeito: anéis, três levas de rachaduras e um nó por cristal (da reserva, quando há)
  function montar(I) {
    const k = I.tema + ':' + I.C.length, livres = reserva[k];
    let M = livres && livres.pop();
    if (!M) {
      const root = new N3('poder');
      root.add(new N3('anelE', { d: [] })); root.add(new N3('anelI', { d: [] }));
      for (let g = 0; g < 3; g++) root.add(new N3('r' + g, { d: [] }));
      for (let i = 0; i < I.C.length; i++) root.add(new N3('c' + i, geoForma(I.tema, I.C[i].forma)));
      M = new Model3(root);
    } else for (let i = 0; i < I.C.length; i++) M.nodes['c' + i].geo = new Float32Array(geoForma(I.tema, I.C[i].forma).d);
    return M;
  }
  // Assenta o efeito no chão de onde ele está: anéis, rachaduras e o pé de cada cristal na altura do terreno
  function assentar(I) {
    I.z0 = altura(I.x, I.y);
    for (const c of I.C) c.dz = altura(I.x + c.dx, I.y + c.dy) - I.z0;
    const M = I.modelo; if (!M) return;
    const dE = [], dI = [], L = geoRachas(I);
    anel(dE, I, I.R, 2.4, I.T.anelE, 1.25); anel(dI, I, I.R * 0.56, 1.5, I.T.anelI, 1.1);
    M.nodes.anelE.geo = new Float32Array(dE); M.nodes.anelI.geo = new Float32Array(dI);
    for (let g = 0; g < 3; g++) M.nodes['r' + g].geo = new Float32Array(L[g]);
  }
  // Durante a carga o efeito acompanha o herói (o golpe avança); na manifestação, fica onde o golpe caiu
  function mover(I, x, y) { if (I && I.tM < 0) { I.x = x; I.y = y; I.z0 = altura(x, y); } }
  // Qual manifestação é a da classe do herói (null: os efeitos de sempre)
  function temaDe(p) { const d = p && p.def; return d && (d.id === 'drakos' || d.base === 'drakos') ? 'rubro' : null; }
  // Onde o efeito está no tempo: carga (0..1), tempo desde a manifestação (−1 antes) e desintegração (0..1)
  function tempo(I) {
    const m = I.tM < 0 ? -1 : I.t - I.tM;
    return { m, uC: I.tM < 0 ? cl(I.t / Math.max(0.12, I.carga), 0, 1) : 1, uF: m < 0 ? 0 : cl((m - I.vida) / I.fim, 0, 1) };
  }
  // Brilho e escala dos anéis e das rachaduras
  function chao(I, K) {
    const { m, uC, uF } = K, some = Math.pow(1 - uF, 1.5), pulso = m >= 0 ? Math.exp(-m * 5) : 0;
    return {
      eE: (m < 0 ? 0.25 + 0.75 * uC : 1 + 1.6 * pulso + 0.18 * Math.sin(I.t * 9)) * some, sE: (m < 0 ? 0.82 + 0.18 * (1 - Math.pow(1 - uC, 3)) : 1 + 0.03 * pulso) + 0.05 * uF,
      eI: (m < 0 ? 0.2 + 0.7 * uC : 1 + 1.3 * pulso + 0.2 * Math.sin(I.t * 11 + 1.7)) * some, sI: (m < 0 ? 0.7 + 0.3 * (1 - Math.pow(1 - uC, 3)) : 1) + 0.04 * uF,
      vis: [uC > 0.35 || m >= 0, m >= 0, m >= 0.1], eR: (g) => (0.75 + 0.35 * Math.sin(I.t * 13 + g * 2.1)) * (1 + 1.2 * (m >= 0 ? Math.exp(-m * 4) : 0)) * (1 - uF) * (m < 0 ? uC : 1),
    };
  }
  // Posição, giro, escala e brilho de um cristal (null: ainda não rompeu ou já sumiu)
  function cristal(I, c, K, q) {
    if (K.m < 0) return null;
    const mc = K.m - c.atraso; if (mc < 0) return null;
    const u = cl(mc / 0.2, 0, 1), uf = cl(K.uF * 1.3 - c.fase * 0.3, 0, 1), k = volta(u) * (1 - uf * uf);
    if (k < 0.02) return null;
    const rr = c.r * (0.55 + 0.45 * Math.min(1, u * 1.5)) * (1 - 0.4 * uf);
    q.p[0] = c.dx; q.p[1] = c.dy; q.p[2] = c.dz - c.h * 0.12 * (1 - u) - c.h * 0.25 * uf;
    q.r[0] = c.rx; q.r[1] = c.ry; q.r[2] = c.giro;
    q.s[0] = rr; q.s[1] = rr; q.s[2] = c.h * k;
    q.emi = (1 + 1.8 * (1 - u) + 0.2 * Math.sin(I.t * 6 + c.fase * 9)) * (1 - 0.9 * uf);
    return q;
  }
  const Q0 = { p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1], emi: 1 };
  function posar(m, I) {
    const N = m.nodes, K = tempo(I), G = chao(I, K);
    N.anelE.emi = G.eE; N.anelE.s[0] = N.anelE.s[1] = G.sE; N.anelI.emi = G.eI; N.anelI.s[0] = N.anelI.s[1] = G.sI;
    for (let g = 0; g < 3; g++) { const nd = N['r' + g]; nd.vis = G.vis[g] && K.uF < 1; nd.emi = G.eR(g); }
    for (let i = 0; i < I.C.length; i++) {
      const nd = N['c' + i], q = cristal(I, I.C[i], K, Q0);
      if (!q) { nd.vis = false; continue; }
      nd.p[0] = q.p[0]; nd.p[1] = q.p[1]; nd.p[2] = q.p[2]; nd.r[0] = q.r[0]; nd.r[1] = q.r[1]; nd.r[2] = q.r[2]; nd.s[0] = q.s[0]; nd.s[1] = q.s[1]; nd.s[2] = q.s[2]; nd.emi = q.emi;
    }
  }
  // O golpe acertou o chão: os cristais rompem o solo
  function manifestar(I, x, y) {
    if (!I || I.tM >= 0) return;
    if (x !== undefined) { I.x = x; I.y = y; assentar(I); }
    I.tM = I.t;
  }
  function soltar(I) {
    const i = ativos.indexOf(I); if (i >= 0) ativos.splice(i, 1);
    if (I.modelo) { const k = I.tema + ':' + I.C.length; (reserva[k] || (reserva[k] = [])).push(I.modelo); if (reserva[k].length > 3) reserva[k].shift(); I.modelo = null; }
  }

  function update(dt) {
    if (!ativos.length || typeof game === 'undefined') return;
    const P = game.particles;
    for (let n = ativos.length - 1; n >= 0; n--) {
      const I = ativos[n], T = I.T;
      I.t += dt;
      if (I.sala && game.room !== I.sala) { soltar(I); continue; }   // trocou de lugar: nada fica para trás
      // preparo interrompido (o herói levou um golpe antes do impacto): desfaz sem manifestar
      if (I.tM < 0 && (I.t > I.carga + 0.6 || (I.dono && (I.dono.serial !== I.serial || (game.player && game.player.attack !== I.dono && game.player.state !== 'attack'))))) { soltar(I); continue; }
      const K = tempo(I);
      if (K.uF >= 1) { soltar(I); continue; }
      if (K.m < 0) {
        // CARGA: a energia converge para o centro
        I.acBrasa += dt * 26;
        while (I.acBrasa >= 1) { I.acBrasa--; P.converge(I.x, I.y, 6, 1, I.R * (0.5 + 0.5 * K.uC), T.rgb, 0.28); }
        continue;
      }
      if (!I.estourou) {
        // MANIFESTAÇÃO: clarão, estilhaços, fragmentos de pedra e fumaça escura
        I.estourou = true;
        P.flash(I.x, I.y, 10, I.R * 0.95, T.rgb, 0.22);
        P.flash(I.x, I.y, 4, I.R * 0.5, T.brasa, 0.14);
        for (let i = 0; i < 26; i++) { const a = Math.random() * TAU; P.sparks(I.x + Math.cos(a) * I.R * 0.3, I.y + Math.sin(a) * I.R * 0.3, 6, a, 1, T.brasa, 380, 0.5); }
        P.debris(I.x, I.y, 18, T.pedra);
        P.smoke(I.x, I.y, 4, 7, T.fumo, 20);
        P.embers(I.x, I.y, 6, 22, T.brasa, I.R * 0.7, 90);
        if (game.room && game.room.addScorch) game.room.addScorch(I.x, I.y, I.R * 0.55);
      }
      for (const c of I.C) {
        if (c.saiu || K.m < c.atraso) continue;
        c.saiu = true;   // este cristal acabou de romper o chão: lascas e pó ao pé dele
        const cx = I.x + c.dx, cy = I.y + c.dy;
        P.sparks(cx, cy, 3, Math.atan2(c.dy, c.dx), 2, T.brasa, 190, 1.4);
        if (c.h > 22) { P.dust(cx, cy, 2, 7, 60, T.fumo); P.debris(cx, cy, 2, T.pedra); }
      }
      if (K.uF <= 0) {
        // ENQUANTO DURA: brasas sobem dos cristais, fumaça rente ao chão e pequenos clarões
        I.acBrasa += dt * (20 + I.R * 0.14);
        while (I.acBrasa >= 1) { I.acBrasa--; const c = I.C[(Math.random() * I.C.length) | 0]; if (c) P.embers(I.x + c.dx, I.y + c.dy, Math.random() * c.h * 0.8, 1, Math.random() < 0.3 ? T.rgb : T.brasa, 5, 46); }
        I.acFumo += dt * 3.2;
        while (I.acFumo >= 1) { I.acFumo--; const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * I.R; P.smoke(I.x + Math.cos(a) * rr, I.y + Math.sin(a) * rr, 2, 1, T.fumo, 12); }
        I.acPulso -= dt;
        if (I.acPulso <= 0) { I.acPulso = 0.3 + Math.random() * 0.35; const c = I.C[(Math.random() * I.C.length) | 0]; if (c) P.flash(I.x + c.dx, I.y + c.dy, c.h * 0.5, 16 + c.h * 0.6, T.brasa, 0.12); }
      } else if (Math.random() < dt * 14) {
        const c = I.C[(Math.random() * I.C.length) | 0]; if (c) P.embers(I.x + c.dx, I.y + c.dy, c.h * 0.4, 1, T.brasa, 6, 30);   // DESINTEGRAÇÃO: as últimas brasas se dispersam
      }
    }
  }

  // ------------------------------------------------------------ 3ª pessoa: um modelo por efeito
  function fila3P(Q) {
    for (const I of ativos) {
      if (!I.modelo) continue;
      M3.trs(I.o3.m, [I.x, I.y, I.z0], [0, 0, 0], [1, 1, 1]);
      const it = R3D.queue(I.modelo, I.pose, null, I.o3);
      it.ent = null; Q.push(it);
    }
  }
  // luz pontual de cada efeito: [x, y, z, raio, r, g, b, força]
  function luzes3P(lista) {
    for (const I of ativos) {
      const K = tempo(I), c = I.T.luz;
      const k = (K.m < 0 ? 0.55 * K.uC : 1.3 + 2.4 * Math.exp(-K.m * 5) + 0.2 * Math.sin(I.t * 9)) * (1 - K.uF);
      if (k > 0.03) lista.push([I.x, I.y, I.z0 + 18, I.R * 2.5, c[0], c[1], c[2], k]);
    }
    return lista;
  }

  // ------------------------------------------------------------ vista isométrica: facetas no canvas
  const cssRgb = (c, a) => `rgba(${Math.round(cl(c[0], 0, 1) * 255)},${Math.round(cl(c[1], 0, 1) * 255)},${Math.round(cl(c[2], 0, 1) * 255)},${a})`;
  // anéis e rachaduras, rente ao chão (antes dos corpos)
  function desenharChao(ctx) {
    for (const I of ativos) {
      const K = tempo(I), G = chao(I, K), T = I.T, cx = isoX(I.x, I.y), cy = isoY(I.x, I.y);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let g = 0; g < 3; g++) {
        if (!G.vis[g]) continue;
        const e = cl(G.eR(g) * 0.75, 0, 1);
        for (const pass of [[3.2, 0.22], [1, 0.9]]) {
          ctx.strokeStyle = rgba(T.rgb, e * pass[1]);
          for (const L of I.racha.linhas[g]) { ctx.lineWidth = L[4] * pass[0]; ctx.beginPath(); ctx.moveTo(isoX(I.x + L[0], I.y + L[1]), isoY(I.x + L[0], I.y + L[1])); ctx.lineTo(isoX(I.x + L[2], I.y + L[3]), isoY(I.x + L[2], I.y + L[3])); ctx.stroke(); }
        }
      }
      for (const [R, s, e, cor, w] of [[I.R, G.sE, G.eE, T.anelE, 3], [I.R * 0.56, G.sI, G.eI, T.anelI, 2]]) {
        const c = hex3(cor);
        for (const pass of [[4, 0.16], [1, 0.85]]) { ctx.strokeStyle = cssRgb(c, cl(e * pass[1], 0, 1)); ctx.lineWidth = w * pass[0]; ctx.beginPath(); ctx.ellipse(cx, cy, R * s * Math.SQRT2, R * s * Math.SQRT1_2, 0, 0, TAU); ctx.stroke(); }
      }
      ctx.restore();
    }
  }
  // cada cristal entra na lista ordenada por profundidade da cena (o herói passa na frente e atrás)
  const _m = M3.make(), LUZ = [-0.35, -0.55, 0.76];
  function listaIso(lista) {
    for (const I of ativos) {
      const K = tempo(I);
      if (K.m < 0) continue;
      for (const c of I.C) lista.push({ x: I.x + c.dx, y: I.y + c.dy, draw: (ctx) => desenharCristal(ctx, I, c, K) });
    }
  }
  function desenharCristal(ctx, I, c, K) {
    const q = cristal(I, c, K, Q0); if (!q) return;
    M3.trs(_m, [I.x + q.p[0], I.y + q.p[1], q.p[2]], q.r, q.s);
    const T = I.T, Fm = formas()[c.forma], m = _m, e = cl(q.emi, 0, 2.6);
    const P = (v) => { const X = m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3], Y = m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7], Z = m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11]; return [isoX(X, Y), isoY(X, Y) - Z, X + Y + Z]; };
    const vis = [];
    for (const f of Fm.faces) {
      const nx = m[0] * f.n[0] + m[1] * f.n[1] + m[2] * f.n[2], ny = m[4] * f.n[0] + m[5] * f.n[1] + m[6] * f.n[2], nz = m[8] * f.n[0] + m[9] * f.n[1] + m[10] * f.n[2], nl = Math.hypot(nx, ny, nz) || 1;
      if ((nx + ny + nz) / nl < -0.05) continue;   // de costas para a câmera
      const pts = f.p.map(P);
      vis.push({ pts, z: pts.reduce((s, p) => s + p[2], 0) / pts.length, h: f.h, luz: 0.45 + 0.55 * Math.max(0, (nx * LUZ[0] + ny * LUZ[1] + nz * LUZ[2]) / nl) });
    }
    vis.sort((a, b) => a.z - b.z);
    for (const f of vis) {
      const [cor, em] = tinta(T, cl(f.h, 0, 1)), k = f.luz * 0.8 + em * 0.55 * Math.min(1.6, e);
      ctx.fillStyle = cssRgb([cor[0] * k + 0.02, cor[1] * k, cor[2] * k], 0.94);
      ctx.beginPath(); ctx.moveTo(f.pts[0][0], f.pts[0][1]); for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]); ctx.closePath(); ctx.fill();
    }
    // arestas e o núcleo aceso (somados)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = cssRgb(hex3(T.aresta), cl(0.34 * e, 0, 0.9)); ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const f of vis) { ctx.moveTo(f.pts[0][0], f.pts[0][1]); for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]); ctx.closePath(); }
    ctx.stroke();
    const b = P([0, 0, 0.1]);
    if (typeof GlowCache !== 'undefined') GlowCache.draw(ctx, T.rgb, b[0], b[1], q.s[0] * 3.2, cl(0.3 * e, 0, 0.8));
    ctx.restore();
  }

  const limpar = () => { while (ativos.length) soltar(ativos[0]); };
  // Para os testes: o estado de cada efeito ativo
  const estado = () => ativos.map((I) => { const K = tempo(I); let vis = 0; for (const c of I.C) if (cristal(I, c, K, Q0)) vis++; return { tema: I.tema, R: I.R, cristais: I.C.length, visiveis: vis, fase: K.m < 0 ? 'carga' : K.uF > 0 ? 'desintegracao' : 'manifestacao', t: +I.t.toFixed(2), rachaduras: I.racha.linhas.map((l) => l.length) }; });
  return { TEMAS: PODERES_TEMAS, ativos, cristais, manifestar, mover, temaDe, update, fila3P, luzes3P, desenharChao, listaIso, limpar, estado, formas, geoForma, reserva };
})();
if (typeof window !== 'undefined') window.Poderes = Poderes;
