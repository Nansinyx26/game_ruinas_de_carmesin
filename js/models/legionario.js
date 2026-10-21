// ---------------------------------------------------------------------------
// LEGIONÁRIO DE FERRO — soldado artificial blindado da Legião (modelo 3D low-poly)
// Armadura pesada de aço azulado, ombreiras grandes, placa peitoral segmentada com
// faixas de luz laranja, elmo arredondado com visor em V e respirador, e um
// MARTELO DE IMPACTO de duas mãos com núcleo laranja que carrega no windup.
// Referencial: +X frente, +Y direita, +Z cima; origem nos pés.
// Braços e pernas por IK de dois ossos: o martelo é posado no referencial do
// modelo e as mãos o seguram; os pés ficam presos ao chão.
// ---------------------------------------------------------------------------
(function () {
  const PI = Math.PI;
  const PAL = {
    suit: '#101217', suitHi: '#1d2027', armor: '#2b3038', armorMid: '#383e49', armorHi: '#4d5462',
    helm: '#262a32', dark: '#0b0c10', trim: '#ff7a22', visor: '#ff8a2a',
    hammer: '#24282f', hammerHi: '#59606e', core: '#ff9a3a',
  };
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
  const mix = (a, b, k) => a + (b - a) * k;
  const ss = (k) => k * k * (3 - 2 * k);

  // ------------------------------------------------------------ dimensões
  const PEL_Z = 30;                 // centro da pélvis (repouso)
  const WAIST = 4;                  // pivô da cintura acima da pélvis
  const SHX = 0, SHY = 16.5, SHZ = 18;   // ombros (referencial do tronco)
  const UA = 12.5, FA = 13.5;       // braço, antebraço (até o centro da mão)
  const HIPY = 7.5, HIPZ = -2;      // quadris (referencial da pélvis)
  const TH = 12, SN = 12;       // coxa, canela
  const ANK = 5, TOE = 10.2, HEEL = 5.8;   // altura do tornozelo, ponta e calcanhar da bota
  const GR = 4, GL = 9.5;           // posições das mãos no cabo (a partir do pomo)
  const HEADZ = 43.5;               // centro da cabeça do martelo no cabo
  const HHX = 12.2, HHY = 6.3, HHZ = 6.3;   // meia-extensão da cabeça (para não atravessar o chão)

  // ------------------------------------------------------------ geometria
  // Hexaedro a partir de 4 cantos de baixo e 4 de cima (mesma ordem: −x−y, +x−y, +x+y, −x+y)
  function hexa(g, b, t, col, e, o) {
    if (!o.nb) g.quad(b[0], b[3], b[2], b[1], o.bot || col, e);
    if (!o.nt) g.quad(t[0], t[1], t[2], t[3], o.top || col, o.topE !== undefined ? o.topE : e);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      g.quad(b[i], b[j], t[j], t[i], (o.side && o.side[i]) || col, e);
    }
  }
  // Caixa: t/tx/ty escala do topo, b/bx/by escala da base, sh desloca o topo, nb/nt omite base/topo
  function bx(g, x, y, z, sx, sy, sz, col, e = 0, o = {}) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const tx = o.tx !== undefined ? o.tx : o.t !== undefined ? o.t : 1;
    const ty = o.ty !== undefined ? o.ty : o.t !== undefined ? o.t : 1;
    const bxs = o.bx !== undefined ? o.bx : o.b !== undefined ? o.b : 1;
    const bys = o.by !== undefined ? o.by : o.b !== undefined ? o.b : 1;
    const sh = o.sh || [0, 0];
    hexa(g,
      [[x - hx * bxs, y - hy * bys, z - hz], [x + hx * bxs, y - hy * bys, z - hz], [x + hx * bxs, y + hy * bys, z - hz], [x - hx * bxs, y + hy * bys, z - hz]],
      [[x - hx * tx + sh[0], y - hy * ty + sh[1], z + hz], [x + hx * tx + sh[0], y - hy * ty + sh[1], z + hz], [x + hx * tx + sh[0], y + hy * ty + sh[1], z + hz], [x - hx * tx + sh[0], y + hy * ty + sh[1], z + hz]],
      col, e, o);
  }
  // Superfície de revolução em torno de Z (perfil [[raio, z], ...]; raio 0 = ápice)
  function revZ(g, cx, cy, prof, sides, kx, ky, col, e, rot0) {
    const rings = prof.map(([r, z]) => {
      const a = [];
      for (let j = 0; j < sides; j++) { const t = (j / sides) * PI * 2 + rot0; a.push([cx + Math.cos(t) * r * kx, cy + Math.sin(t) * r * ky, z]); }
      return a;
    });
    for (let k = 0; k < prof.length - 1; k++) {
      for (let j = 0; j < sides; j++) {
        const jn = (j + 1) % sides, A = rings[k][j], B = rings[k][jn], C = rings[k + 1][jn], D = rings[k + 1][j];
        const c = typeof col === 'function' ? col(k, j) : col;
        if (prof[k + 1][0] < 0.01) g.tri(A, B, C, c, e); else g.quad(A, B, C, D, c, e);
      }
    }
  }
  // Casca entre anéis de mesma contagem (o.c(k, j) cor por face; cap0/cap1 tampas)
  function loft(g, rings, col, e, o = {}) {
    const n = rings[0].length;
    for (let k = 0; k < rings.length - 1; k++) {
      for (let j = 0; j < n; j++) {
        const jn = (j + 1) % n;
        g.quad(rings[k][j], rings[k][jn], rings[k + 1][jn], rings[k + 1][j], (o.c && o.c(k, j)) || col, e);
      }
    }
    if (o.cap0) g.poly(rings[0].slice().reverse(), o.cap0, e);
    if (o.cap1) g.poly(rings[rings.length - 1], o.cap1, e);
  }
  // Octógono chanfrado (frente F, costas B, meia-largura W, chanfro c)
  // faces: 0 frente, 1 frente-dir, 2 dir, 3 costas-dir, 4 costas, 5 costas-esq, 6 esq, 7 frente-esq
  function oct(cx, z, F, B, W, c) {
    return [[cx + F, -(W - c), z], [cx + F, W - c, z], [cx + F - c, W, z], [cx + B + c, W, z],
      [cx + B, W - c, z], [cx + B, -(W - c), z], [cx + B + c, -W, z], [cx + F - c, -W, z]];
  }
  // Hexágono (rot 0: vértice à frente, faces planas nos lados ±Y — face 1 = +Y, face 4 = −Y)
  function hex(cx, cy, z, rx, ry, rot = 0) {
    const a = [];
    for (let j = 0; j < 6; j++) { const t = rot + (j * PI) / 3; a.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, z]); }
    return a;
  }

  function gPelvis() {
    const g = new G3();
    // Quadril (macacão) afinando até a virilha; face frontal com placa
    loft(g, [hex(0.4, 0, -6.5, 4.6, 6.2, PI / 6), hex(0.2, 0, 1.2, 7, 10, PI / 6)], PAL.suit, 0, { c: (k, j) => (j === 5 ? PAL.armor : 0) });
    // Cinto largo (chanfrado)
    loft(g, [oct(0, 0.4, 7.9, -7.4, 11.6, 3.2), oct(0, 4.6, 7.2, -7, 10.6, 3)], PAL.suitHi, 0, { c: (k, j) => (j === 0 ? PAL.armor : 0) });
    g.quad([8.05, -2.4, 1.2], [8.05, 2.4, 1.2], [7.65, 2.4, 4.0], [7.65, -2.4, 4.0], PAL.armorHi);   // fivela
    for (const s of [-1, 1]) bx(g, 6.2, s * 7.6, 1.8, 4.2, 5, 5.6, PAL.armor, 0, { top: PAL.armorHi, nb: 1, t: 0.9 });   // bolsas
    return g;
  }
  function gTorso() {
    const g = new G3();
    // Caixa torácica chanfrada: estreita na cintura, larga no peito, ombros recolhidos
    const SIDE = (j) => j === 2 || j === 6;
    loft(g, [oct(0, -0.5, 6.6, -6.4, 9.8, 2.6), oct(0, 14.5, 9.4, -8.8, 14.2, 4.4), oct(-0.4, 22.2, 7, -8, 12.4, 4.2)], PAL.armor, 0,
      { c: (k, j) => (k === 0 && SIDE(j) ? PAL.suitHi : k === 1 && (j === 0 || j === 1 || j === 7) ? PAL.armorMid : 0), cap1: PAL.armorMid });
    // Peitorais segmentados (inclinados para trás no alto)
    for (const s of [-1, 1]) bx(g, 9.7, s * 6.3, 15, 2.6, 10.8, 8.8, PAL.armorMid, 0, { top: PAL.armorHi, nb: 1, sh: [-1.5, 0], ty: 0.92 });
    // Placa abdominal central
    bx(g, 8.0, 0, 6.6, 2.6, 8.6, 8.4, PAL.armorMid, 0, { top: PAL.armorHi, nb: 1, sh: [1.2, 0], t: 0.9 });
    // Unidade de energia nas costas
    bx(g, -10.2, 0, 13.6, 4.4, 14.5, 11, PAL.armor, 0, { top: PAL.armorHi, nb: 1, t: 0.9 });
    return g;
  }
  // Faixas de luz do tronco (nó próprio para controlar a intensidade)
  function gBands() {
    const g = new G3();
    for (const s of [-1, 1]) {
      const y0 = s * 3.4, y1 = s * 9.0;
      g.quad([11.15, y0, 13.2], [11.15, y1, 13.2], [10.85, y1, 15.0], [10.85, y0, 15.0], PAL.trim, 1.25);   // fendas dos peitorais
      g.quad([9.45, s * 1.5, 3.6], [9.45, s * 2.6, 3.6], [10.45, s * 2.6, 9.8], [10.45, s * 1.5, 9.8], PAL.trim, 1.1);   // placa abdominal
    }
    for (const z of [11.4, 14.4]) g.quad([-12.55, -4.5, z], [-12.55, 4.5, z], [-12.55, 4.5, z + 1.1], [-12.55, -4.5, z + 1.1], PAL.trim, 1.1);   // costas
    return g;
  }
  function gHead() {
    const g = new G3();
    // Elmo arredondado (octógono com faces para frente/lados)
    revZ(g, 0.6, 0, [[5.7, 0.8], [6.6, 6.4], [5.0, 11.2], [0, 13.4]], 8, 1.07, 1, (k, j) => (k === 1 && (j === 3 || j === 4 || j === 2) ? PAL.armorMid : PAL.helm), 0, PI / 8);
    // Máscara/maxilar
    hexa(g, [[2.4, -4.4, 0.4], [7.7, -4.4, 0.4], [7.7, 4.4, 0.4], [2.4, 4.4, 0.4]],
      [[3.2, -5.4, 6.7], [7.6, -5.4, 6.7], [7.6, 5.4, 6.7], [3.2, 5.4, 6.7]], PAL.armor, 0, { nb: 1, top: PAL.armorMid });
    // Respirador
    bx(g, 8.1, 0, 2.6, 1.6, 4.6, 3.8, PAL.armorHi, 0, { nb: 1 });
    // Módulos auditivos
    bx(g, 0.2, 0, 5.4, 4.6, 14.4, 4.6, PAL.armorMid, 0, { nb: 1, top: PAL.armorHi });
    return g;
  }
  function gVisor() {
    const g = new G3();
    // Visor em V: duas fendas inclinadas (ponta interna mais baixa), dobrando no canto do elmo
    for (const s of [-1, 1]) {
      g.quad([7.55, s * 0.5, 6.9], [7.55, s * 2.45, 7.75], [7.3, s * 2.45, 9.2], [7.4, s * 0.5, 8.1], PAL.visor, 1.6);
      g.quad([7.55, s * 2.45, 7.75], [5.75, s * 4.95, 8.8], [5.5, s * 4.95, 10.0], [7.3, s * 2.45, 9.2], PAL.visor, 1.6);
    }
    return g;
  }
  function gPauldron(s) {
    const g = new G3();
    // Domo facetado (crista para fora), aba inferior mais clara
    revZ(g, 0, s * 1.2, [[8.4, -5.4], [9.0, 0.4], [5.8, 4.2], [0, 5.0]], 6, 1.05, 0.86, (k) => (k === 0 ? PAL.armorMid : PAL.armor), 0, PI / 6);
    g.quad([-4.2, s * 8.95, -3.6], [4.2, s * 8.95, -3.6], [4.2, s * 8.85, -2.4], [-4.2, s * 8.85, -2.4], PAL.trim, 1.2);
    return g;
  }
  function gUpper(s) {
    const g = new G3();
    loft(g, [hex(0, 0, 1, 3.8, 3.7), hex(0.2, 0, -(UA - 0.5), 3.4, 3.4)], PAL.suit, 0, { c: (k, j) => (j === (s > 0 ? 1 : 4) || j === 0 ? PAL.armor : 0) });
    return g;
  }
  function gFore(s) {
    const g = new G3();
    bx(g, -0.6, 0, -0.6, 5.6, 6.2, 4.6, PAL.armorHi, 0, { nb: 1, t: 0.8 });                                   // cotovelo
    loft(g, [hex(0, 0, -2.2, 3.9, 3.8), hex(0.3, 0, -(FA - 2.2), 4.6, 4.5)], PAL.armor, 0, { c: (k, j) => (j === 0 || j === 5 ? PAL.armorMid : 0) });   // manopla
    const yo = s * 3.9;
    g.quad([-1.4, yo, -4.0], [1.4, yo, -4.0], [1.6, s * 4.45, -(FA - 3.2)], [-1.6, s * 4.45, -(FA - 3.2)], PAL.trim, 1.0);
    return g;
  }
  function gHand() {
    const g = new G3();
    bx(g, 0.5, 0, -0.4, 5.6, 6, 5.6, PAL.suitHi, 0, { nt: 1, b: 0.9 });
    return g;
  }
  function gThigh(s) {
    const g = new G3();
    loft(g, [hex(0, 0, 1.5, 4.7, 4.5), hex(0.2, 0, -TH, 4, 3.9)], PAL.suit, 0);
    bx(g, 1.8, s * 0.7, -TH * 0.42, 6.4, 8.8, TH * 0.72, PAL.armor, 0, { top: PAL.armorHi, nb: 1, t: 1.06 });
    g.quad([5.12, s * 0.7 - 3, -3.6], [5.12, s * 0.7 + 3, -3.6], [5.18, s * 0.7 + 3, -2.5], [5.18, s * 0.7 - 3, -2.5], PAL.trim, 1.0);   // faixa de luz
    return g;
  }
  function gShin(s) {
    const g = new G3();
    bx(g, 3.5, 0, -0.5, 3.4, 7, 6, PAL.armorHi, 0, { sh: [0.6, 0], t: 0.85, nb: 1 });                            // joelheira
    loft(g, [hex(0.4, 0, -0.5, 4.3, 4.1), hex(0.6, 0, -(SN - 1.3), 4.9, 4.6)], PAL.armor, 0, { c: (k, j) => (j === 0 || j === 5 ? PAL.armorMid : 0) });   // caneleira
    return g;
  }
  function gBoot() {
    const g = new G3();
    hexa(g, [[-HEEL, -4.9, -ANK], [TOE, -4.9, -ANK], [TOE, 4.9, -ANK], [-HEEL, 4.9, -ANK]],
      [[-5.4, -4.6, 0], [5.4, -4.6, 0], [5.4, 4.6, 0], [-5.4, 4.6, 0]], PAL.suitHi, 0, { nb: 1, top: PAL.armor, side: [0, PAL.armorMid, 0, 0] });
    bx(g, -0.4, 0, 1.4, 9.8, 10, 4.4, PAL.armor, 0, { nb: 1, top: PAL.armorHi, t: 0.94 });
    return g;
  }
  function gHammer() {
    const g = new G3();
    bx(g, 0, 0, 0.6, 3.8, 3.8, 3.2, PAL.hammerHi, 0, { nt: 1 });                                      // pomo
    g.cyl(0, 0, 2, 1.35, 1.35, HEADZ - 7.5, 5, PAL.hammer, 0, { caps: false });                       // cabo
    g.cyl(0, 0, 2.6, 1.8, 1.8, 9, 5, PAL.suitHi, 0, { caps: false, rot: 0.6 });                       // empunhadura
    // cabeça: só as 4 faces visíveis (as pontas ficam cobertas pelas faces de impacto)
    { const a = 9.2, h = 5.5, z0 = HEADZ - h, z1 = HEADZ + h;
      g.quad([-a, -h, z0], [a, -h, z0], [a, -h, z1], [-a, -h, z1], PAL.hammer);
      g.quad([-a, h, z0], [a, h, z0], [a, h, z1], [-a, h, z1], PAL.hammer);
      g.quad([-a, -h, z1], [a, -h, z1], [a, h, z1], [-a, h, z1], PAL.hammerHi);
      g.quad([-a, -h, z0], [a, -h, z0], [a, h, z0], [-a, h, z0], PAL.hammer); }
    for (const s of [-1, 1]) {
      // faces de impacto (sem a face interna, escondida)
      { const xi = s * 9.0, xo = s * 12.2, h = 6.3, z0 = HEADZ - h, z1 = HEADZ + h, c = PAL.hammerHi;
        const I = [[xi, -h, z0], [xi, h, z0], [xi, h, z1], [xi, -h, z1]], O = [[xo, -h * 0.92, z0 + 0.5], [xo, h * 0.92, z0 + 0.5], [xo, h * 0.92, z1 - 0.5], [xo, -h * 0.92, z1 - 0.5]];
        g.poly(O, c);
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; g.quad(I[i], I[j], O[j], O[i], i === 2 ? PAL.armorHi : c); } }
      // frisos luminosos (anel de 4 faces)
      const x0 = s * 5.1, x1 = s * 6.1, h = 5.75;
      const A = [[x0, -h, HEADZ - h], [x0, h, HEADZ - h], [x0, h, HEADZ + h], [x0, -h, HEADZ + h]];
      const B = [[x1, -h, HEADZ - h], [x1, h, HEADZ - h], [x1, h, HEADZ + h], [x1, -h, HEADZ + h]];
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; g.quad(A[i], A[j], B[j], B[i], PAL.trim, 1.0); }
      // núcleo: painel hexagonal nas faces laterais
      const yc = s * 5.58, r = 3.4, pts = [];
      for (let k = 0; k < 6; k++) { const a = (k * PI) / 3; pts.push([Math.cos(a) * r * 1.15, yc, HEADZ + Math.sin(a) * r]); }
      g.poly(pts, PAL.core, 1.5);
    }
    // núcleo no topo
    { const r = 3.2, pts = []; for (let k = 0; k < 6; k++) { const a = (k * PI) / 3; pts.push([Math.cos(a) * r * 1.2, Math.sin(a) * r, HEADZ + 5.58]); } g.poly(pts, PAL.core, 1.5); }
    return g;
  }

  function build() {
    const root = new N3('root');
    const pel = root.add(new N3('pelvis', gPelvis()));
    const tor = pel.add(new N3('torso', gTorso()));
    tor.p = [0, 0, WAIST];
    tor.add(new N3('bands', gBands()));
    const head = tor.add(new N3('head', gHead()));
    head.p = [1, 0, 22];
    head.add(new N3('visor', gVisor()));
    for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
      const pa = tor.add(new N3('paul' + k, gPauldron(s)));
      pa.p = [-0.4, s * 16.5, 20.5];
      const up = tor.add(new N3('arm' + k, gUpper(s)));
      up.p = [SHX, s * SHY, SHZ];
      const fo = up.add(new N3('fore' + k, gFore(s)));
      fo.p = [0, 0, -UA];
      const ha = fo.add(new N3('hand' + k, gHand()));
      ha.p = [0, 0, -FA];
      const th = root.add(new N3('thigh' + k, gThigh(s)));
      th.p = [0, s * HIPY, PEL_Z + HIPZ];
      const sh = th.add(new N3('shin' + k, gShin(s)));
      sh.p = [0, 0, -TH];
      const bt = root.add(new N3('boot' + k, gBoot()));
      bt.p = [0, s * 9, ANK];
    }
    const ham = root.add(new N3('hammer', gHammer()));
    ham.p = [10, 11, 36];
    const m = new Model3(root);
    m.anchor('visor', 'head', [7.4, 0, 8.4]);
    m.anchor('hammer', 'hammer', [0, 0, HEADZ]);
    m.anchor('chest', 'torso', [10.8, 0, 14.8]);
    return m;
  }

  // ------------------------------------------------------------ matemática
  function rot(r, o) {
    const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
    o[0] = cz * cy; o[1] = cz * sy * sx - sz * cx; o[2] = cz * sy * cx + sz * sx;
    o[3] = sz * cy; o[4] = sz * sy * sx + cz * cx; o[5] = sz * sy * cx - cz * sx;
    o[6] = -sy; o[7] = cy * sx; o[8] = cy * cx;
    return o;
  }
  function mul3(o, a, b) {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return o;
  }
  function mv(R, x, y, z, o) { o[0] = R[0] * x + R[1] * y + R[2] * z; o[1] = R[3] * x + R[4] * y + R[5] * z; o[2] = R[6] * x + R[7] * y + R[8] * z; return o; }
  function mtv(R, x, y, z, o) { o[0] = R[0] * x + R[3] * y + R[6] * z; o[1] = R[1] * x + R[4] * y + R[7] * z; o[2] = R[2] * x + R[5] * y + R[8] * z; return o; }
  // Euler (roll, pitch, yaw) de uma base com eixo X e eixo Z dados (Y = Z × X)
  function eulerXZ(X, Z, out) {
    const Yx = Z[1] * X[2] - Z[2] * X[1], Yy = Z[2] * X[0] - Z[0] * X[2], Yz = Z[0] * X[1] - Z[1] * X[0];
    out[1] = Math.asin(cl(-X[2], -1, 1));
    if (Math.abs(X[2]) < 0.9995) { out[0] = Math.atan2(Yz, Z[2]); out[2] = Math.atan2(X[1], X[0]); }
    else { out[0] = 0; out[2] = Math.atan2(-Yx, Yy); }
    return out;
  }
  // IK de dois ossos: S → T (mesmo referencial do pai do osso), polo = para onde a articulação aponta.
  // Escreve a rotação do osso de cima em outR e devolve o ângulo de dobra.
  // back=false: o osso de baixo dobra para +X local (cotovelo); back=true: para −X local (joelho)
  const _X = [0, 0, 0], _Z = [0, 0, 0], LAST = [0, 0, -1];
  function ik(S, T, L1, L2, pole, outR, back) {
    let dx = T[0] - S[0], dy = T[1] - S[1], dz = T[2] - S[2];
    let D = Math.hypot(dx, dy, dz);
    if (!(D > 1e-4)) { dx = 0; dy = 0; dz = -1; D = L1 + L2; } else { dx /= D; dy /= D; dz /= D; }
    D = cl(D, Math.abs(L1 - L2) + 0.6, L1 + L2 - 0.02);
    const pd = pole[0] * dx + pole[1] * dy + pole[2] * dz;
    let qx = pole[0] - pd * dx, qy = pole[1] - pd * dy, qz = pole[2] - pd * dz;
    let ql = Math.hypot(qx, qy, qz);
    if (ql < 1e-4) { qx = -dz; qy = 0; qz = dx; ql = Math.hypot(qx, qy, qz); if (ql < 1e-4) { qx = 1; qy = 0; qz = 0; ql = 1; } }
    qx /= ql; qy /= ql; qz /= ql;
    const ca = cl((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1), sa = Math.sqrt(1 - ca * ca);
    const ax = dx * ca + qx * sa, ay = dy * ca + qy * sa, az = dz * ca + qz * sa;
    let fx = dx * D - ax * L1, fy = dy * D - ay * L1, fz = dz * D - az * L1;
    const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
    const cb = cl(fx * ax + fy * ay + fz * az, -1, 1);
    let px = fx - ax * cb, py = fy - ay * cb, pz = fz - az * cb;
    let pl = Math.hypot(px, py, pz);
    if (pl < 1e-4) { px = -qx; py = -qy; pz = -qz; pl = 1; }
    const sg = back ? -1 : 1;
    _X[0] = sg * px / pl; _X[1] = sg * py / pl; _X[2] = sg * pz / pl;
    _Z[0] = -ax; _Z[1] = -ay; _Z[2] = -az;
    LAST[0] = ax; LAST[1] = ay; LAST[2] = az;
    eulerXZ(_X, _Z, outR);
    return Math.acos(cb);
  }

  // ------------------------------------------------------------ poses
  // Todas as posições em referencial do modelo (pés na origem). g = mão direita no cabo,
  // h = direção do cabo (pomo → cabeça), s = dica do eixo de impacto da cabeça,
  // gs = encosta a cabeça do martelo no chão (0..1), two = mão esquerda no cabo (0..1)
  const KEYS = ['px', 'py', 'pz', 'pr', 'pp', 'pw', 'tp', 'tr', 'tw', 'hp', 'hw', 'hr',
    'gx', 'gy', 'gz', 'hx', 'hy', 'hz', 'sx', 'sy', 'sz', 'two', 'gs', 'lx', 'ly', 'lz',
    'flx', 'fly', 'flz', 'flp', 'frx', 'fry', 'frz', 'frp', 'sh', 'eV', 'eC', 'eH'];
  const mk = () => { const o = {}; for (const k of KEYS) o[k] = 0; return o; };
  const P = mk(), PA = mk(), PB = mk(), PC = mk();
  function blend(o, a, b, k) { for (let i = 0; i < KEYS.length; i++) { const q = KEYS[i]; o[q] = a[q] + (b[q] - a[q]) * k; } return o; }
  const G = (p, x, y, z) => { p.gx = x; p.gy = y; p.gz = z; };
  const H = (p, x, y, z) => { p.hx = x; p.hy = y; p.hz = z; };
  const S3 = (p, x, y, z) => { p.sx = x; p.sy = y; p.sz = z; };
  const FT = (p, lx, ly, rx, ry) => { p.flx = lx; p.fly = ly; p.frx = rx; p.fry = ry; };

  function setRest(p) {
    p.px = 0; p.py = 0; p.pz = PEL_Z; p.pr = 0; p.pp = 0.02; p.pw = 0;
    p.tp = 0.05; p.tr = 0; p.tw = 0;
    p.hp = 0.05; p.hw = 0; p.hr = 0;
    // martelo apoiado no ombro direito (cabo cruzando a ombreira, cabeça atrás)
    G(p, 10.5, 10, 45); H(p, -0.62, 0.22, 0.75); S3(p, 0.7, 0.7, 0.2);
    p.two = 0; p.gs = 0; p.lx = 3; p.ly = -20; p.lz = 27.5;
    FT(p, 1.5, -9, -1.5, 9); p.flz = 0; p.flp = 0; p.frz = 0; p.frp = 0;
    p.sh = 0; p.eV = 1; p.eC = 1; p.eH = 0.55;
    return p;
  }
  // Martelo erguido acima/atrás da cabeça com as duas mãos
  function setSlamUp(p) {
    setRest(p);
    p.px = -1; p.pz = PEL_Z; p.pp = -0.05;
    p.tp = -0.12; p.tw = 0.05; p.hp = 0.12;
    G(p, -11, 2, 67); H(p, -0.5, -0.05, 0.866); S3(p, 1, 0, 0);
    p.two = 1;
    FT(p, 6, -9.5, -5, 9.5);
    p.eC = 1.4; p.eH = 2.0;
    return p;
  }
  // Martelo esmagado no chão à frente, corpo curvado
  function setSlamDown(p) {
    setRest(p);
    p.px = 3; p.pz = 24; p.pp = 0.15;
    p.tp = 0.5; p.tw = -0.05; p.hp = -0.3;
    G(p, 16, 1, 26); H(p, 0.92, 0, -0.39); S3(p, 0, 0, -1);
    p.two = 1; p.gs = 1;
    FT(p, 9, -10, -7, 10);
    p.eC = 1.6; p.eH = 2.4;
    return p;
  }
  // Recuperação: endireita o corpo com a cabeça do martelo ainda no chão
  function setSlamPull(p) {
    setRest(p);
    p.px = 1; p.pz = 26; p.pp = 0.1;
    p.tp = 0.3; p.tw = -0.03; p.hp = -0.15;
    G(p, 13, 3, 31); H(p, 0.86, 0.05, -0.5); S3(p, 0, 0, -1);
    p.two = 1; p.gs = 1;
    FT(p, 7, -10, -5, 10);
    p.eC = 1.2; p.eH = 1.4;
    return p;
  }
  // Pisão: martelo erguido de lado, pé esquerdo levantado
  function setStompUp(p) {
    setRest(p);
    p.px = -0.5; p.py = 2.5; p.pz = PEL_Z + 0.5; p.pr = 0.06;
    p.tp = -0.1; p.tr = -0.1; p.hp = 0.1;
    G(p, 2, 28, 60); H(p, -0.2, 0.25, 0.95); S3(p, 1, 0, 0);
    p.two = 0; p.lx = 8; p.ly = -30; p.lz = 44;
    FT(p, 5, -9, -1, 8.5); p.flz = 15; p.flp = -0.15;
    p.eC = 1.4; p.eH = 2.0;
    return p;
  }
  function setStompDown(p) {
    setRest(p);
    p.px = 1; p.pz = 24.5; p.pp = 0.1;
    p.tp = 0.3; p.tr = 0.1; p.hp = -0.15;
    G(p, 13, 15, 44); H(p, 0.3, 0.38, -0.875); S3(p, 0.7, -0.7, 0);
    p.two = 0; p.gs = 1; p.lx = 8; p.ly = -30; p.lz = 36;
    FT(p, 6, -11, -3, 10);
    p.eC = 1.6; p.eH = 2.4;
    return p;
  }
  // Atordoado: curvado, cabeça caída, martelo arrastando no chão
  function setStun(p) {
    setRest(p);
    p.px = -2; p.pz = PEL_Z - 2.5; p.pp = 0.1; p.pr = 0.04;
    p.tp = 0.35; p.tr = 0.1; p.tw = 0.15; p.hp = 0.45; p.hw = -0.25; p.hr = 0.15;
    G(p, 10, 19, 22); H(p, 0.75, 0.3, -0.6); S3(p, 0, 0, -1);
    p.two = 0; p.gs = 0.7; p.lx = 6; p.ly = -19; p.lz = 20;
    FT(p, 3, -10, -4, 9);
    p.eC = 0.6; p.eH = 0.3;
    return p;
  }
  // Ajoelhado (surgimento e morte): joelho direito no chão, cabeça baixa, martelo no ombro
  function setKneel(p) {
    setRest(p);
    p.px = -2; p.pz = 19; p.pp = 0.05;
    p.tp = 0.25; p.hp = 0.55;
    G(p, 14, 10, 34); H(p, -0.62, 0.22, 0.75);
    p.two = 0; p.lx = 9; p.ly = -10; p.lz = 21;
    FT(p, 7, -9, -13, 9); p.frp = 1.1;
    p.eV = 0; p.eC = 0; p.eH = 0;
    return p;
  }
  // Fim da queda: tomba para a frente sobre os joelhos, martelo largado ao lado
  function setDead(p) {
    setRest(p);
    p.px = 4; p.pz = 17; p.pp = 0.4; p.pr = 0.08;
    p.tp = 0.8; p.tr = 0.15; p.hp = 0.6; p.hw = 0.3;
    G(p, 24, 22, 9); H(p, 0.5, 0.8, -0.1); S3(p, 0, 0, -1);
    p.two = 0; p.gs = 1; p.lx = 22; p.ly = -16; p.lz = 6;
    FT(p, -9, -9, -11, 9); p.flp = 0.9; p.frp = 0.9;
    p.eV = 0; p.eC = 0; p.eH = 0;
    return p;
  }

  // Níveis de emissão (também usados por glows)
  const LV = { visor: 1, chest: 1, ham: 0.5 };

  const Rp = new Array(9), Rt = new Array(9), RT = new Array(9);
  const OT = [0, 0, 0], V = [0, 0, 0], S = [0, 0, 0], T = [0, 0, 0], HX = [0, 0, 0], HZ = [0, 0, 0];
  const POLE_R = [-0.6, 0.7, -0.25], POLE_L = [-0.6, -0.7, -0.25], POLE_K = [1, 0, 0.05];

  function choose(e, p) {
    const st = Math.max(0, num(e.stateTime)), tg = cl(num(e.tgProgress), 0, 1), stomp = e.move === 'stomp';
    switch (e.state) {
      case 'windup': {
        const k = ss(cl(tg * 1.25, 0, 1));
        blend(p, setRest(PA), stomp ? setStompUp(PB) : setSlamUp(PB), k);
        p.sh = tg * tg;
        break;
      }
      case 'attack': {
        const k = ss(cl(st / 0.07, 0, 1));
        if (stomp) blend(p, setStompUp(PA), setStompDown(PB), k);
        else blend(p, setSlamUp(PA), setSlamDown(PB), k);
        break;
      }
      case 'recover': {
        if (stomp) blend(p, setStompDown(PA), setRest(PB), ss(cl((st - 0.15) / 0.7, 0, 1)));
        else if (st < 0.35) blend(p, setSlamDown(PA), setSlamPull(PB), ss(st / 0.35));
        else blend(p, setSlamPull(PA), setRest(PB), ss(cl((st - 0.35) / 0.5, 0, 1)));
        p.eH = mix(2.4, 0.55, cl(st / 0.6, 0, 1));
        break;
      }
      case 'stun': {
        // entra rápido no tranco e volta à guarda conforme o atordoamento acaba
        const w = Math.min(ss(cl(st / 0.16, 0, 1)), ss(cl(num(e.stun, 0.5) / 0.25, 0, 1)));
        blend(p, setRest(PA), setStun(PB), w);
        p.sh = 0.4 * w;
        break;
      }
      case 'spawn': {
        blend(p, setKneel(PA), setRest(PB), ss(cl((st / 0.75 - 0.2) / 0.8, 0, 1)));
        const on = cl((st - 0.1) / 0.45, 0, 1);
        p.eV = on >= 1 ? 1 : on * (0.5 + 0.5 * Math.abs(Math.sin(st * 41))); p.eC = on; p.eH = 0.55 * on;
        break;
      }
      case 'dying': {
        const k = cl(st / 0.45, 0, 1);
        blend(PC, setRest(PA), setKneel(PB), ss(cl(k / 0.4, 0, 1)));
        blend(p, PC, setDead(PB), ss(cl((k - 0.35) / 0.65, 0, 1)));
        const f = 1 - k;
        p.eV = f * (0.6 + 0.4 * Math.sin(st * 61)); p.eC = f * f; p.eH = f * f * 0.5;
        break;
      }
      default: setRest(p);
    }
  }

  function pose(m, e) {
    if (!e) return;
    const n = m.nodes, p = P;
    const t = num(e.animTime), st = Math.max(0, num(e.stateTime));
    const vx = num(e.vx), vy = num(e.vy), fc = num(e.facing), spd = Math.hypot(vx, vy);
    choose(e, p);

    // Locomoção pesada (só no estado normal)
    const idle = e.state === 'idle' || !e.state;
    // no aviso o passo se desfaz enquanto ele freia
    const walkW = idle ? 1 : e.state === 'windup' ? cl(1 - num(e.tgProgress) * 4, 0, 1) : 0;
    if (walkW > 0 && spd > 12) {
      const cf = Math.cos(fc), sf = Math.sin(fc);
      const ux = (cf * vx + sf * vy) / spd, uy = (-sf * vx + cf * vy) / spd;
      const amt = cl(spd / 58, 0.45, 1.25) * walkW, ph = t * 6;
      const sL = Math.sin(ph), cL = Math.cos(ph);
      const stride = 7.5 * amt, lift = 5 * Math.min(1, amt);
      // pé esquerdo (fase ph), direito (fase ph + π)
      p.flx += ux * stride * sL; p.fly += uy * stride * sL; p.flz += lift * Math.max(0, cL); p.flp += -0.25 * Math.max(0, cL) * amt;
      p.frx -= ux * stride * sL; p.fry -= uy * stride * sL; p.frz += lift * Math.max(0, -cL); p.frp += -0.25 * Math.max(0, -cL) * amt;
      const bob = 1.1 * Math.cos(2 * ph) * amt;
      p.pz += bob - 0.6 * amt; p.py += 1.3 * cL * amt; p.pr += -0.05 * cL * amt; p.pw += 0.1 * sL * amt;
      p.tp += 0.07 * amt; p.tw -= 0.16 * sL * amt; p.tr += 0.04 * cL * amt;
      p.lx -= 7 * sL * amt; p.lz += 1.5 * Math.abs(sL) * amt;
      p.gz += bob - 0.6 * amt; p.gy += 1.3 * cL * amt; p.gx += 1.2 * sL * amt;
    } else if (idle) {
      const br = Math.sin(t * 2);
      p.pz += br * 0.35; p.tp += br * 0.012; p.gz += br * 0.5; p.lz += br * 0.3; p.hp -= br * 0.03;
    }
    // Tremor de esforço / curto-circuito
    if (p.sh > 0) {
      const a = p.sh;
      p.px += Math.sin(t * 61) * 0.5 * a; p.py += Math.sin(t * 53 + 1) * 0.5 * a;
      p.gx += Math.sin(t * 67 + 2) * 1.0 * a; p.gy += Math.sin(t * 59) * 0.8 * a; p.gz += Math.sin(t * 71) * 1.0 * a;
      p.tr += Math.sin(t * 47) * 0.03 * a; p.hw += Math.sin(t * 43) * 0.05 * a;
    }

    // Corpo
    const pel = n.pelvis, tor = n.torso;
    pel.p[0] = p.px; pel.p[1] = p.py; pel.p[2] = p.pz;
    pel.r[0] = p.pr; pel.r[1] = p.pp; pel.r[2] = p.pw;
    tor.r[0] = p.tr; tor.r[1] = p.tp; tor.r[2] = p.tw;
    n.head.r[0] = p.hr; n.head.r[1] = cl(p.hp, -0.6, 0.8); n.head.r[2] = cl(p.hw, -0.8, 0.8);
    rot(pel.r, Rp); rot(tor.r, Rt); mul3(RT, Rp, Rt);
    mv(Rp, 0, 0, WAIST, V); OT[0] = p.px + V[0]; OT[1] = p.py + V[1]; OT[2] = p.pz + V[2];

    // Martelo: base ortonormal (Z = cabo, X = eixo de impacto)
    let hx = p.hx, hy = p.hy, hz = p.hz, hl = Math.hypot(hx, hy, hz);
    if (!(hl > 1e-4)) { hx = 0; hy = 0; hz = 1; hl = 1; }
    hx /= hl; hy /= hl; hz /= hl;
    let sx = p.sx, sy = p.sy, sz = p.sz;
    const d = sx * hx + sy * hy + sz * hz;
    sx -= d * hx; sy -= d * hy; sz -= d * hz;
    let sl = Math.hypot(sx, sy, sz);
    if (!(sl > 1e-3)) { sx = -hz; sy = 0; sz = hx; sl = Math.hypot(sx, sy, sz); if (!(sl > 1e-3)) { sx = 1; sy = 0; sz = 0; sl = 1; } }
    HX[0] = sx / sl; HX[1] = sy / sl; HX[2] = sz / sl; HZ[0] = hx; HZ[1] = hy; HZ[2] = hz;
    const ham = n.hammer;
    eulerXZ(HX, HZ, ham.r);
    const gx = p.gx, gy = p.gy;
    let gz = p.gz;
    // Ponto mais baixo da cabeça: encosta no chão (gs) e nunca o atravessa
    const Yz = HZ[0] * HX[1] - HZ[1] * HX[0];
    const ext = HHX * Math.abs(HX[2]) + HHY * Math.abs(Yz) + HHZ * Math.abs(hz);
    const gs = cl(p.gs, 0, 1);
    gz += gs * (0.3 - (gz + hz * (HEADZ - GR) - ext));
    gz += Math.max(0, 0.3 - (gz + hz * (HEADZ - GR) - ext), 1.5 - (gz - hz * GR));
    ham.p[0] = gx - hx * GR; ham.p[1] = gy - hy * GR; ham.p[2] = gz - hz * GR;

    // Braços (IK no referencial do tronco); o ombro sobe e fecha quando o braço se ergue
    const two = cl(p.two, 0, 1);
    for (let i = 0; i < 2; i++) {
      const right = i === 1, s = right ? 1 : -1;
      let wx, wy, wz;
      if (right) { wx = gx; wy = gy; wz = gz; }
      else {
        const ox = gx + hx * (GL - GR), oy = gy + hy * (GL - GR), oz = gz + hz * (GL - GR);
        wx = mix(p.lx, ox, two); wy = mix(p.ly, oy, two); wz = mix(p.lz, oz, two);
      }
      mtv(RT, wx - OT[0], wy - OT[1], wz - OT[2], T);
      const el = cl((T[2] - SHZ + 4) / 16, 0, 1);
      S[0] = SHX - 1.2 * el; S[1] = s * (SHY - 2.6 * el); S[2] = SHZ + 2.8 * el;
      const arm = n[right ? 'armR' : 'armL'];
      arm.p[0] = S[0]; arm.p[1] = S[1]; arm.p[2] = S[2];
      const b = ik(S, T, UA, FA, right ? POLE_R : POLE_L, arm.r, false);
      n[right ? 'foreR' : 'foreL'].r[1] = -b;
      // ombreira acompanha parte do movimento do braço
      const pa = n[right ? 'paulR' : 'paulL'];
      const liftA = cl(LAST[2] + 1, 0, 2), out = cl(LAST[1] * s + 0.25, 0, 1), fwd = cl(LAST[0] + 0.25, 0, 1);
      pa.r[0] = s * 0.3 * liftA * out; pa.r[1] = -0.2 * liftA * fwd;
      pa.p[0] += S[0] - SHX; pa.p[1] += S[1] - s * SHY; pa.p[2] += S[2] - SHZ + 0.8 * liftA;
    }

    // Pernas (IK no referencial do modelo; pés presos ao chão, sola nunca abaixo do chão)
    for (let i = 0; i < 2; i++) {
      const right = i === 1, s = right ? 1 : -1;
      mv(Rp, 0, s * HIPY, HIPZ, V);
      S[0] = p.px + V[0]; S[1] = p.py + V[1]; S[2] = p.pz + V[2];
      const fp = cl(right ? p.frp : p.flp, -0.6, 1.3);
      const sn = Math.sin(fp), cs = Math.cos(fp);
      const sole = Math.min(-TOE * sn - ANK * cs, HEEL * sn - ANK * cs);
      T[0] = right ? p.frx : p.flx; T[1] = right ? p.fry : p.fly;
      T[2] = Math.max(0, right ? p.frz : p.flz) + ANK;
      if (T[2] + sole < 0) T[2] = -sole;
      const th = n[right ? 'thighR' : 'thighL'];
      th.p[0] = S[0]; th.p[1] = S[1]; th.p[2] = S[2];
      const b = ik(S, T, TH, SN, POLE_K, th.r, true);
      n[right ? 'shinR' : 'shinL'].r[1] = b;
      const bt = n[right ? 'bootR' : 'bootL'];
      bt.p[0] = T[0]; bt.p[1] = T[1]; bt.p[2] = T[2];
      bt.r[1] = fp;
    }

    // Emissão
    LV.visor = cl(p.eV, 0, 2); LV.chest = cl(p.eC * (0.88 + 0.12 * Math.sin(t * 2.4)), 0, 2.2);
    LV.ham = cl(p.eH * (0.9 + 0.1 * Math.sin(t * 5)), 0, 2.6);
    if (e.state === 'stun') { const fl = 0.55 + 0.45 * Math.sin(t * 37) * Math.sin(t * 11); LV.visor *= fl; LV.chest *= fl; }
    n.visor.emi = LV.visor;
    n.bands.emi = n.paulL.emi = n.paulR.emi = n.foreL.emi = n.foreR.emi = n.thighL.emi = n.thighR.emi = LV.chest;
    ham.emi = LV.ham;
  }

  function glows(e, add) {
    if (!e) return;
    choose(e, P);
    const vis = cl(0.45 + 0.7 * Math.cos(num(e.facing) - PI / 4), 0.12, 1);
    const tg = e.state === 'windup' ? cl(num(e.tgProgress), 0, 1) : 0;
    const v = cl(P.eV, 0, 1.5);
    if (v > 0.02) add('visor', 10, '255,130,40', 0.75 * v * vis);
    const c = cl(P.eC, 0, 1.6);
    if (c > 0.02) add('chest', 12, '255,130,40', 0.28 * c * vis);
    const h = cl(P.eH, 0, 2.4);
    if (h > 0.02) add('hammer', 9 + 22 * tg + (e.state === 'attack' ? 14 : 0), '255,120,40', 0.22 * h + 0.45 * tg);
  }

  const mkE = (f, set, t) => {
    const x = new Legionary(0, 0, 1);
    x.facing = f; x.vx = 0; x.vy = 0; x.z = 0; x.move = 'slam'; x.tgProgress = 0;
    set(x, f);
    x.animTime += num(t);
    return x;
  };

  MODELS3D.legionario = {
    build, pose, glows,
    demos: [
      { label: 'spawn 0.25', e: (f, t) => mkE(f, (x) => { x.state = 'spawn'; x.stateTime = 0.25; x.animTime = 1; }, t) },
      { label: 'spawn 0.55', e: (f, t) => mkE(f, (x) => { x.state = 'spawn'; x.stateTime = 0.55; x.animTime = 1.3; }, t) },
      { label: 'idle', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.stateTime = 1; x.animTime = 0.7; }, t) },
      { label: 'walk A', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.animTime = 0.0; x.vx = Math.cos(f) * 58; x.vy = Math.sin(f) * 58; }, t) },
      { label: 'walk B', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.animTime = PI / 12; x.vx = Math.cos(f) * 58; x.vy = Math.sin(f) * 58; }, t) },
      { label: 'windup slam 0.5', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.tgProgress = 0.5; x.stateTime = 0.45; x.animTime = 2; }, t) },
      { label: 'windup slam 1', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.tgProgress = 1; x.stateTime = 0.9; x.animTime = 2.4; }, t) },
      { label: 'attack slam', e: (f, t) => mkE(f, (x) => { x.state = 'attack'; x.stateTime = 0.1; x.animTime = 2.5; }, t) },
      { label: 'recover slam 0.25', e: (f, t) => mkE(f, (x) => { x.state = 'recover'; x.stateTime = 0.25; x.animTime = 3; }, t) },
      { label: 'recover slam 0.6', e: (f, t) => mkE(f, (x) => { x.state = 'recover'; x.stateTime = 0.6; x.animTime = 3; }, t) },
      { label: 'windup stomp 0.5', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.move = 'stomp'; x.tgProgress = 0.5; x.stateTime = 0.4; x.animTime = 2; }, t) },
      { label: 'windup stomp 1', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.move = 'stomp'; x.tgProgress = 1; x.stateTime = 0.8; x.animTime = 2.2; }, t) },
      { label: 'attack stomp', e: (f, t) => mkE(f, (x) => { x.state = 'attack'; x.move = 'stomp'; x.stateTime = 0.1; x.animTime = 2.5; }, t) },
      { label: 'recover stomp 0.4', e: (f, t) => mkE(f, (x) => { x.state = 'recover'; x.move = 'stomp'; x.stateTime = 0.4; x.animTime = 3; }, t) },
      { label: 'stun', e: (f, t) => mkE(f, (x) => { x.state = 'stun'; x.stateTime = 0.3; x.stun = 0.4; x.animTime = 3.1; }, t) },
      { label: 'dying 0.15', e: (f, t) => mkE(f, (x) => { x.state = 'dying'; x.stateTime = 0.15; x.animTime = 4; }, t) },
      { label: 'dying 0.35', e: (f, t) => mkE(f, (x) => { x.state = 'dying'; x.stateTime = 0.35; x.animTime = 4; }, t) },
    ],
  };
})();
