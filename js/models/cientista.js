// ---------------------------------------------------------------------------
// CIENTISTA — gravação holográfica do cientista do projeto ZERO (laboratório onde
// Kael desperta). Homem adulto (~54) de jaleco longo, óculos retangulares, cabelo
// curto penteado para trás, barba curta, tablet de dados na mão esquerda.
// Renderizado como HOLOGRAMA (opts → { holo: true }): só existe na passada
// emissiva, somado à cena. Corpo em azul-claro com emissão baixa; óculos, tela do
// tablet, crachá, anéis de varredura e o anel do projetor com emissão alta.
// Linhas de varredura sobem pelo corpo com animTime; no estado 'glitch' partes da
// figura saltam lateralmente em degraus e piscam (pseudoaleatório determinístico).
// e = { animTime, stateTime, state: 'idle'|'talk'|'glitch', facing }
// Referencial: +X frente, +Y direita, +Z cima; origem no chão (centro do projetor).
// ---------------------------------------------------------------------------
(function () {
  const PI = Math.PI, TAU = PI * 2;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : (d || 0));
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const fr = (x) => x - Math.floor(x);
  const hash = (k) => fr(Math.sin(k * 127.1 + 311.7) * 43758.5453);

  // ------------------------------------------------------------ primitivas
  function ring(z, rF, rB, ry, n, cx, cy, rot, dz) {
    const P = [];
    for (let i = 0; i < n; i++) {
      const a = (rot === undefined ? PI / n : rot) + (i * TAU) / n, c = Math.cos(a), s = Math.sin(a);
      P.push([(cx || 0) + c * (c > 0 ? rF : rB), (cy || 0) + s * ry, z + (dz ? dz[i] : 0)]);
    }
    return P;
  }
  const rect = (z, hx, hy, cx, cy) => [[(cx || 0) + hx, (cy || 0) - hy, z], [(cx || 0) + hx, (cy || 0) + hy, z], [(cx || 0) - hx, (cy || 0) + hy, z], [(cx || 0) - hx, (cy || 0) - hy, z]];
  function loft(g, R, col, e, o) {
    o = o || {};
    for (let k = 0; k < R.length - 1; k++) {
      const A = R[k], B = R[k + 1], n = A.length;
      for (let i = 0; i < n; i++) {
        let c = col, ee = e;
        if (o.cf) { const f = o.cf(k, i); if (f === false) continue; if (f) { c = f[0]; ee = f[1]; } }
        const j = (i + 1) % n;
        g.quad(A[i], A[j], B[j], B[i], c, ee);
      }
    }
    const L = R[R.length - 1];
    if (o.tip) { for (let i = 0; i < L.length; i++) g.tri(L[i], L[(i + 1) % L.length], o.tip, o.tipCol || col, o.tipE !== undefined ? o.tipE : e); }
    else if (o.capT) g.poly(L, o.capCol || col, e);
    return g;
  }
  function bx(g, x, y, z, sx, sy, sz, col, e, o) {
    o = o || {}; e = e || 0;
    const tx = o.tx !== undefined ? o.tx : 1, ty = o.ty !== undefined ? o.ty : 1, sh = o.sh || [0, 0];
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const b = [[x - hx, y - hy, z - hz], [x + hx, y - hy, z - hz], [x + hx, y + hy, z - hz], [x - hx, y + hy, z - hz]];
    const t = b.map((p) => [x + (p[0] - x) * tx + sh[0], y + (p[1] - y) * ty + sh[1], z + hz]);
    const F = (k, p0, p1, p2, p3) => { const f = o[k]; if (f === false) return; g.quad(p0, p1, p2, p3, f ? f[0] : col, f ? f[1] : e); };
    F('b', b[0], b[3], b[2], b[1]); F('t', t[0], t[1], t[2], t[3]);
    F('l', b[0], b[1], t[1], t[0]); F('f', b[1], b[2], t[2], t[1]);
    F('r', b[2], b[3], t[3], t[2]); F('k', b[3], b[0], t[0], t[3]);
    return g;
  }
  // Retângulo plano numa face voltada para +X (x fixo), de (y0,z0) a (y1,z1)
  const fq = (g, x, y0, z0, y1, z1, col, e) => g.quad([x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1], col, e);

  // ------------------------------------------------------------ paleta (holograma)
  const C = {
    body: '#9fd8ff', hi: '#dff4ff', mid: '#7fc4f4', dim: '#5aa8e6', deep: '#3f86c8',
  };
  const E = { body: 0.07, coat: 0.1, trim: 0.5, hi: 1.1 };

  // ------------------------------------------------------------ dimensões (~54 com o projetor)
  const LIFT = 1.5, HIPZ = 26.0, LTH = 12.0, LSH = 11.4, HIPY = 2.9;
  const SPZ = 27.4, SHY = 5.5, SHZ = 13.5, LUA = 9.6, LFA = 8.4;

  // ------------------------------------------------------------ geometria
  function gLeg() {
    const g = new G3();
    loft(g, [rect(-LTH - LSH + 1.0, 1.65, 1.6), rect(-LTH, 1.95, 1.9), rect(1.0, 2.5, 2.4)], C.mid, E.body);
    // sapato
    bx(g, 0.9, 0, -LTH - LSH - 0.4, 5.4, 2.7, 2.4, C.dim, E.body, { b: false, tx: 0.6, sh: [-1.0, 0] });
    return g;
  }
  function gCoat() {
    const g = new G3();
    const shd = [0, -0.8, -0.8, 0, 0, -0.8, -0.8, 0];
    const R = [
      ring(-14.6, 5.0, 5.4, 6.5, 8, 0.2), ring(-1.5, 3.8, 3.9, 5.1, 8), ring(8.5, 4.5, 3.9, 5.7, 8),
      ring(13.6, 3.3, 3.3, 6.1, 8, -0.2, 0, undefined, shd), ring(15.5, 2.0, 2.2, 2.4, 8, 0.1),
    ];
    // frente aberta abaixo da cintura; peito: camisa clara e lapelas
    loft(g, R, C.body, E.coat, {
      cf: (k, i) => (k === 0 && i === 7 ? false
        : k === 2 && i === 7 ? [C.hi, 0.45]
        : k === 2 && (i === 0 || i === 6) ? [C.hi, 0.3]
        : k === 0 && (i === 0 || i === 6) ? [C.body, 0.22] : null),
    });
    // gravata
    const x0 = 4.6 * 0.924 + 0.12, x1 = 3.4 * 0.924 + 0.12;
    g.quad([x0, -0.35, 8.5], [x0, 0.35, 8.5], [x1 + 0.3, 0.3, 13.2], [x1 + 0.3, -0.3, 13.2], C.deep, 0.35);
    g.quad([x0, -0.5, 8.5], [x0, 0.5, 8.5], [x0 - 0.15, 0, 4.0], [x0 - 0.15, 0, 4.0], C.deep, 0.35);
    // barra da frente (fecho) com botões luminosos
    for (const z of [0.6, 4.4]) fq(g, 3.9 * 0.924 + 0.14 + (z - -1.5) * 0.007, -0.25, z, 0.25, z + 0.45, C.hi, 1.0);
    // bolso do peito (esquerdo) com canetas e crachá (direito)
    fq(g, 4.38, -4.0, 5.2, -2.0, 7.4, C.hi, 0.35);
    fq(g, 4.45, -3.6, 7.0, -3.35, 8.6, C.hi, 1.1); fq(g, 4.45, -3.0, 7.0, -2.75, 8.3, C.hi, 1.1);
    fq(g, 4.4, 2.0, 5.6, 3.6, 7.6, C.hi, 1.0);
    // bolsos laterais
    fq(g, 4.55, -5.6, -9.0, -3.2, -6.6, C.hi, 0.3);
    fq(g, 4.55, 3.2, -9.0, 5.6, -6.6, C.hi, 0.3);
    // gola levantada atrás do pescoço (aberta na frente)
    loft(g, [ring(15.4, 2.1, 2.3, 2.5, 8, 0.1), ring(17.2, 2.4, 2.7, 2.9, 8, -0.1)], C.body, 0.3, { cf: (k, i) => (i === 7 || i === 0 || i === 6 ? false : null) });
    return g;
  }
  function gUpper() {
    return loft(new G3(), [ring(-LUA - 0.3, 1.55, 1.55, 1.55, 6, 0, 0, 0), ring(-3.0, 1.85, 1.75, 1.8, 6, 0, 0, 0), ring(1.4, 1.9, 2.0, 1.75, 6, -0.2, 0, 0)], C.body, E.coat);
  }
  function gFore() {
    const g = new G3();
    loft(g, [ring(0.4, 1.6, 1.6, 1.6, 6, 0, 0, 0), ring(-LFA + 0.4, 1.4, 1.45, 1.4, 6, 0, 0, 0)], C.body, E.coat);
    // punho claro + mão
    loft(g, [rect(-LFA + 0.6, 1.0, 1.15), rect(-LFA - 2.5, 0.75, 1.05, 0.35)], C.hi, 0.22);
    return g;
  }
  function gHead() {
    const g = new G3();
    // pescoço -> queixo -> bochechas -> têmporas; barba curta no queixo e na mandíbula
    loft(g, [ring(-1.2, 1.5, 1.6, 1.55, 6, -0.2), ring(1.6, 2.6, 2.2, 2.55, 6, 0.4), ring(3.4, 2.95, 2.9, 2.9, 6, 0.2), ring(6.2, 3.2, 3.2, 3.0, 6, -0.1)], C.body, E.body, {
      cf: (k, i) => ((k === 0 || k === 1) && (i === 5 || i === 0 || i === 4) ? [C.deep, 0.32] : null),
    });
    // nariz
    g.tri([3.0, -0.45, 3.4], [3.0, 0.45, 3.4], [3.75, 0, 3.55], C.body, 0.2);
    g.tri([3.0, -0.45, 3.4], [3.75, 0, 3.55], [3.05, 0, 4.7], C.body, 0.2);
    g.tri([3.0, 0.45, 3.4], [3.75, 0, 3.55], [3.05, 0, 4.7], C.body, 0.2);
    // óculos retangulares: lentes, ponte e hastes
    for (const s of [-1, 1]) {
      fq(g, 3.25, s * 0.35, 4.15, s * 1.85, 5.15, C.hi, E.hi);
      g.quad([3.1, s * 2.0, 4.95], [3.1, s * 2.0, 4.65], [0.2, s * 3.15, 4.85], [0.2, s * 3.15, 5.15], C.hi, 0.7);
    }
    fq(g, 3.3, -0.35, 4.75, 0.35, 4.95, C.hi, 0.9);
    return g;
  }
  function gHair() {
    const g = new G3();
    // curto, penteado para trás (entradas na testa, desce até a nuca)
    loft(g, [ring(5.2, 3.4, 3.45, 3.2, 6, -0.15, 0, undefined, [1.2, -0.6, -2.4, -2.4, -0.6, 1.2]), ring(7.6, 2.9, 3.35, 2.95, 6, -0.5)], C.mid, 0.3,
      { tip: [-1.0, 0, 8.9], tipE: 0.36 });
    return g;
  }
  function gTablet() {
    const g = new G3();
    // placa no plano y-z (normal +X do antebraço = tela), centrada na mão
    bx(g, 0, 1.4, -2.0, 0.35, 3.4, 4.6, C.dim, 0.3, { k: false });
    fq(g, 0.19, 0.0, -4.0, 2.8, 0.0, C.hi, 0.75);
    // dados na tela: gráfico de barras e linhas
    fq(g, 0.21, 0.3, -3.6, 0.7, -2.2, C.body, 1.6);
    fq(g, 0.21, 0.9, -3.6, 1.3, -1.4, C.body, 1.6);
    fq(g, 0.21, 1.5, -3.6, 1.9, -2.7, C.body, 1.6);
    fq(g, 0.21, 0.3, -0.9, 2.5, -0.6, C.body, 1.4);
    return g;
  }
  function gProjector() {
    const g = new G3();
    const N = 10;
    g.cyl(0, 0, 0, 8.6, 8.1, 1.2, N, C.deep, 0.25, { caps: false });
    const A = ring(1.2, 8.1, 8.1, 8.1, N, 0, 0, 0), B = ring(1.2, 6.7, 6.7, 6.7, N, 0, 0, 0), I = ring(1.25, 6.7, 6.7, 6.7, N, 0, 0, 0);
    for (let i = 0; i < N; i++) { const j = (i + 1) % N; g.quad(A[i], A[j], B[j], B[i], C.body, 1.3); }
    g.poly(I, C.dim, 0.3);
    // lente central
    g.cyl(0, 0, 1.25, 2.0, 1.4, 0.5, 6, C.hi, 1.5);
    // marcas no anel externo
    for (let i = 0; i < 4; i++) {
      const a = i * PI / 2 + PI / 4, c = Math.cos(a), s = Math.sin(a);
      g.quad([c * 8.65, s * 8.65, 0.25], [c * 8.65 - s * 0.9, s * 8.65 + c * 0.9, 0.25], [c * 8.65 - s * 0.9, s * 8.65 + c * 0.9, 0.95], [c * 8.65, s * 8.65, 0.95], C.hi, 1.4);
    }
    return g;
  }
  function gScan() {
    // anel fino de raio 1 (escalado na pose pelo perfil do corpo)
    return new G3().cyl(0, 0, -0.2, 1, 1, 0.4, 10, C.hi, 1.0, { caps: false });
  }

  // ------------------------------------------------------------ montagem
  function build() {
    const root = new N3('root');
    root.add(new N3('projector', gProjector()));
    const fig = root.add(new N3('fig'));
    fig.p = [0, 0, LIFT];
    const hips = fig.add(new N3('hips'));
    hips.p = [0, 0, HIPZ];
    for (const [s, nm] of [[-1, 'L'], [1, 'R']]) {
      const lg = hips.add(new N3('leg' + nm, gLeg()));
      lg.p = [0, s * HIPY, -0.4];
    }
    const spine = fig.add(new N3('spine', gCoat()));
    spine.p = [0, 0, SPZ];
    const head = spine.add(new N3('head', gHead()));
    head.p = [0.3, 0, 16.0];
    head.add(new N3('hair', gHair()));
    for (const [s, nm] of [[-1, 'L'], [1, 'R']]) {
      const ua = spine.add(new N3('arm' + nm, gUpper()));
      ua.p = [-0.3, s * SHY, SHZ];
      const fa = ua.add(new N3('fore' + nm, gFore()));
      fa.p = [0, 0, -LUA];
    }
    const tab = m_fore(spine, 'L').add(new N3('tablet', gTablet()));
    tab.p = [0.9, 0.6, -LFA - 1.6];
    for (let i = 0; i < 3; i++) root.add(new N3('scan' + i, gScan()));
    const m = new Model3(root);
    m.anchor('head', 'head', [-0.4, 0, 9.4]);
    m.anchor('proj', 'projector', [0, 0, 1.4]);
    m.anchor('tablet', 'tablet', [0.3, 1.4, -2.0]);
    return m;
  }
  function m_fore(spine, s) { for (const k of spine.kids) if (k.name === 'arm' + s) return k.kids[0]; return spine; }

  // ------------------------------------------------------------ perfil do corpo para os anéis de varredura
  // [altura (referencial do modelo), meia-largura frente/trás, meia-largura lateral]
  const PROF = [[0, 0, 0], [1.6, 4.2, 5.6], [5, 2.8, 5.0], [14.5, 3.0, 5.6], [15.5, 5.7, 7.2], [26, 4.6, 8.0], [36, 5.2, 8.0],
    [42, 4.0, 7.6], [44.5, 2.7, 3.0], [47.5, 3.8, 3.6], [52.5, 3.3, 3.3], [55.5, 0.6, 0.6]];
  const TOP = 55.5;
  function prof(z) {
    for (let i = 1; i < PROF.length; i++) {
      const a = PROF[i - 1], b = PROF[i];
      if (z <= b[0]) { const k = (z - a[0]) / Math.max(1e-3, b[0] - a[0]); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
    }
    return [0.5, 0.5];
  }

  // ------------------------------------------------------------ pose
  function pose(m, e) {
    const n = m.nodes;
    e = e || {};
    const t = num(e.animTime), st = e.state;
    const br = Math.sin(t * 1.8);
    const sp = n.spine, hd = n.head, aL = n.armL, aR = n.armR, fL = n.foreL, fR = n.foreR;
    // segurando o tablet com a mão esquerda diante do peito
    aL.r[0] = -0.06; aL.r[1] = 0.2; fL.r[1] = -1.5; fL.r[2] = 0.72; fL.r[0] = -0.1;
    aR.r[0] = 0.1; aR.r[1] = 0.04; fR.r[1] = -0.2;
    sp.s[2] = 1 + br * 0.008;
    n.hips.r[0] = 0.02 * Math.sin(t * 0.7);
    if (st === 'talk') {
      // fala para a câmera: gesticula com a mão direita, cabeça acompanha
      const g1 = Math.sin(t * 2.9), g2 = Math.sin(t * 4.4 + 0.9), g3 = Math.sin(t * 1.4);
      aR.r[1] = -0.3 - 0.18 * g1; aR.r[0] = 0.3 + 0.08 * g2;
      fR.r[1] = -1.3 - 0.3 * g2; fR.r[0] = -0.2; fR.r[2] = 0.5 + 0.15 * g1;
      sp.r[2] = 0.06 + 0.04 * g3; sp.r[1] = 0.03;
      hd.r[1] = -0.02 + 0.06 * Math.sin(t * 3.7); hd.r[2] = 0.1 * g3; hd.r[0] = 0.04 * g1;
    } else {
      // idle (e base do glitch): respiração; alterna o olhar entre o tablet e a câmera
      const look = 0.5 + 0.5 * Math.sin(t * 0.55);
      hd.r[1] = 0.05 + 0.3 * look * look; hd.r[2] = 0.12 * look;
      sp.r[1] = 0.02 + 0.03 * look;
    }
    // falhas: deslocamentos laterais em degraus e piscadas (determinístico em animTime)
    const glitch = st === 'glitch';
    const step = Math.floor(t * (glitch ? 14 : 7));
    const parts = ['hips', 'spine', 'head', 'armR', 'tablet'];
    for (let i = 0; i < parts.length; i++) {
      const nd = n[parts[i]];
      const h1 = hash(step * 3.1 + i * 17.3), h2 = hash(step * 1.7 + i * 5.9 + 40);
      if (glitch) {
        if (h1 > 0.42) nd.p[1] += (h2 - 0.5) * 7.0;
        nd.emi = h2 > 0.2 ? 0.6 + 0.9 * hash(step + i * 3.3 + 9) : 0.12;
        if (i >= 2 && h1 > 0.93) nd.vis = false;
      } else if (h1 > 0.965) {
        nd.p[1] += (h2 - 0.5) * 2.2;
      }
    }
    if (glitch) n.fig.p[0] += (hash(step * 2.3 + 77) - 0.5) * 2.0;
    // anéis de varredura subindo pelo corpo
    for (let i = 0; i < 3; i++) {
      const nd = n['scan' + i];
      const k = fr(t * 0.23 + i / 3);
      const z = 1.0 + k * (TOP - 1.0);
      const w = prof(z);
      nd.p[0] = 0.3; nd.p[2] = z;
      nd.s[0] = w[0] + 0.5; nd.s[1] = w[1] + 0.5; nd.s[2] = 1;
      nd.emi = Math.sin(k * PI) * (glitch ? 0.6 + 0.8 * hash(step + i) : 1);
      if (z > TOP - 0.8) nd.vis = false;
    }
    n.projector.emi = 1 + 0.08 * Math.sin(t * 6.1) - (glitch ? 0.3 * hash(step + 5) : 0);
  }

  function opts(e) {
    const t = num(e && e.animTime), glitch = e && e.state === 'glitch';
    let emi = 0.92 + 0.06 * Math.sin(t * 11.3) + 0.04 * Math.sin(t * 29.7);
    if (glitch) emi = 0.5 + 0.7 * hash(Math.floor(t * 14) * 0.77 + 3);
    return { holo: true, emi };
  }

  function glows(e, add) {
    if (!e) return;
    const t = num(e.animTime), glitch = e.state === 'glitch';
    const k = glitch ? 0.5 + 0.5 * hash(Math.floor(t * 14) + 1) : 1;
    add('proj', 28, '140,210,255', (0.34 + 0.04 * Math.sin(t * 6.1)) * k);
    add('tablet', 6, '200,236,255', 0.18 * k);
  }

  const mk = (st, at) => (f) => ({ animTime: at, stateTime: 0.5, state: st, facing: f });
  MODELS3D.cientista = {
    build, pose, opts, glows,
    demos: [
      { label: 'idle', e: mk('idle', 1.0) },
      { label: 'idle (olha o tablet)', e: mk('idle', 3.6) },
      { label: 'talk', e: mk('talk', 0.8) },
      { label: 'glitch', e: mk('glitch', 0.31) },
      { label: 'glitch b', e: mk('glitch', 0.52) },
    ],
  };
})();
