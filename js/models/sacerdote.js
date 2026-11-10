// ---------------------------------------------------------------------------
// SACERDOTE DO ECLIPSE — sacerdote do Culto que venera NEXUS (modelo 3D low-poly)
// Figura alta e esguia num manto em sino até o chão (barra recortada com
// filete violeta), linhas de circuito luminosas descendo pelo manto, mantelete
// pontudo sobre os ombros com broche do eclipse, capuz pontudo com máscara
// branca lisa de olhos escuros, auréola de dados segmentada girando sobre a
// cabeça e cetro alto na mão direita com orbe violeta envolto por um anel.
// Referencial: +X frente, +Y direita, +Z cima; origem nos pés (no chão).
// O próprio modelo paira: corpo em z = 4 + seno(animTime·3)·2.
// ---------------------------------------------------------------------------
(function () {
  const PI = Math.PI, TWO_PI = PI * 2, DEG = PI / 180;
  const C = {
    robe: '#191730', robeDark: '#0c0b1a', cape: '#221e3f', capeTop: '#2a2550', hood: '#1d1a37', inner: '#05040a',
    trim: '#8a64ff', face: '#dcd8ea', eye: '#120e1f', glove: '#2a2541', gloveHi: '#3a3458',
    staff: '#3b3f4c', staffHi: '#5f6577', orb: '#c58cff', ring: '#b79dff', halo: '#d8bcff',
  };
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, k) => a + (b - a) * k;
  const ss = (k) => { k = cl(k, 0, 1); return k * k * (3 - 2 * k); };

  // ------------------------------------------------------------ geometria
  // Anéis: { z, rx, ry, cx, dz: [desvio de z por vértice] } em ordem crescente de z
  function ringPts(r, A) {
    return A.map((a, i) => [(r.cx || 0) + Math.cos(a) * r.rx, Math.sin(a) * r.ry, r.z + (r.dz ? r.dz[i] : 0)]);
  }
  // Superfície de revolução facetada; style(k, i) -> [cor, emi] ou null (face omitida).
  // Um anel { tip: [x, y, z] } fecha a superfície num bico.
  function rev(g, rings, A, style) {
    const P = rings.map((r) => (r.tip ? null : ringPts(r, A)));
    for (let k = 0; k < rings.length - 1; k++) {
      for (let i = 0; i < A.length; i++) {
        const j = (i + 1) % A.length, s = style(k, i);
        if (!s) continue;
        if (rings[k + 1].tip) g.tri(P[k][i], P[k][j], rings[k + 1].tip, s[0], s[1]);
        else g.quad(P[k][i], P[k][j], P[k + 1][j], P[k + 1][i], s[0], s[1]);
      }
    }
    return g;
  }
  // Amostrador da superfície facetada: ponto em (ângulo em graus, z) deslocado "off" para fora
  function surface(rings, A) {
    const n = A.length, P = rings.map((r) => ringPts(r, A));
    const L = (p, q, s) => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s, p[2] + (q[2] - p[2]) * s];
    return (aDeg, z, off) => {
      let a = aDeg * DEG;
      while (a < A[0]) a += TWO_PI;
      while (a >= A[0] + TWO_PI) a -= TWO_PI;
      let i = n - 1;
      for (let q = 0; q < n - 1; q++) if (a >= A[q] && a < A[q + 1]) { i = q; break; }
      const j = (i + 1) % n, a1 = j === 0 ? A[0] + TWO_PI : A[j];
      const u = (a - A[i]) / (a1 - A[i]);
      let k = 0;
      while (k < rings.length - 2 && z > rings[k + 1].z) k++;
      const t = cl((z - rings[k].z) / (rings[k + 1].z - rings[k].z), 0, 1);
      const a0 = L(P[k][i], P[k + 1][i], t), b0 = L(P[k][j], P[k + 1][j], t), p = L(a0, b0, u);
      const ex = b0[0] - a0[0], ey = b0[1] - a0[1], el = Math.hypot(ex, ey) || 1;
      return [p[0] + (ey / el) * off, p[1] - (ex / el) * off, p[2]];
    };
  }
  // Trilhas de circuito: polilinhas em (ângulo, z) desenhadas como fitas finas sobre a superfície
  function traces(g, S, lines, w, col, e, zCuts, aCuts) {
    for (const Ln of lines) {
      for (let q = 0; q < Ln.length - 1; q++) {
        const [a0, z0] = Ln[q], [a1, z1] = Ln[q + 1];
        const ts = [0, 1];
        for (const zc of zCuts) if ((zc - z0) * (zc - z1) < 0) ts.push((zc - z0) / (z1 - z0));
        for (const ac of aCuts) if ((ac - a0) * (ac - a1) < 0) ts.push((ac - a0) / (a1 - a0));
        ts.sort((x, y) => x - y);
        for (let s = 0; s < ts.length - 1; s++) {
          if (ts[s + 1] - ts[s] < 1e-4) continue;
          const ext0 = s === 0 ? w * 0.45 : 0, ext1 = s === ts.length - 2 ? w * 0.45 : 0;
          let pa = S(mix(a0, a1, ts[s]), mix(z0, z1, ts[s]), 0.16), pb = S(mix(a0, a1, ts[s + 1]), mix(z0, z1, ts[s + 1]), 0.16);
          let dx = pb[0] - pa[0], dy = pb[1] - pa[1], dz = pb[2] - pa[2];
          const dl = Math.hypot(dx, dy, dz) || 1;
          pa = [pa[0] - dx / dl * ext0, pa[1] - dy / dl * ext0, pa[2] - dz / dl * ext0];
          pb = [pb[0] + dx / dl * ext1, pb[1] + dy / dl * ext1, pb[2] + dz / dl * ext1];
          const am = mix(a0, a1, (ts[s] + ts[s + 1]) / 2) * DEG, nx = Math.cos(am), ny = Math.sin(am);
          let wx = -dz * ny, wy = dz * nx, wz = dx * ny - dy * nx;
          const wl = Math.hypot(wx, wy, wz) || 1, h = w / 2 / wl;
          wx *= h; wy *= h; wz *= h;
          g.quad([pa[0] - wx, pa[1] - wy, pa[2] - wz], [pa[0] + wx, pa[1] + wy, pa[2] + wz],
            [pb[0] + wx, pb[1] + wy, pb[2] + wz], [pb[0] - wx, pb[1] - wy, pb[2] - wz], col, e);
        }
      }
    }
    return g;
  }

  // Ângulos dos anéis (graus → rad)
  const toRad = (arr) => arr.map((d) => d * DEG);
  const A10 = toRad([18, 54, 90, 126, 162, 198, 234, 270, 306, 342]);   // face centrada na frente
  const A8 = toRad([0, 45, 90, 135, 180, 225, 270, 315]);              // vértice na frente (bicos)
  const A7 = toRad([40, 85, 130, 180, 230, 275, 320]);                 // capuz: abertura frontal de 80°

  // Manto (saia em sino): barra recortada, filete, flare e cintura
  const HEM_DZ = [0, 1.7, 0.4, 1.9, 0.2, 0.2, 1.9, 0.4, 1.7, 0];
  const SKIRT = [
    { z: 0, rx: 9.8, ry: 10.9, cx: -0.9, dz: HEM_DZ },
    { z: 1.7, rx: 9.5, ry: 10.6, cx: -0.9, dz: HEM_DZ },
    { z: 9, rx: 7.6, ry: 8.7, cx: -0.6 },
    { z: 16, rx: 5.8, ry: 7.0, cx: -0.3 },
    { z: 23, rx: 4.3, ry: 5.8, cx: 0 },
  ];
  const WAIST = 23;
  const TORSO = [
    { z: 23, rx: 4.3, ry: 5.8, cx: 0 },
    { z: 30.5, rx: 4.6, ry: 6.4, cx: 0.1 },
  ];
  const CAPE_DZ = [-1.8, 0.7, -1.3, 0.7, -1.6, 0.7, -1.3, 0.7];
  const CAPE = [
    { z: 26.9, rx: 7.3, ry: 9.8, cx: -0.4, dz: CAPE_DZ },
    { z: 28.0, rx: 7.1, ry: 9.6, cx: -0.4, dz: CAPE_DZ },
    { z: 32.0, rx: 6.0, ry: 8.6, cx: -0.2 },
    { z: 37.0, rx: 3.3, ry: 3.9, cx: -0.3 },
  ];
  const NECK = [0.2, 0, 36.5];
  const HOOD = [
    { z: 35.4, rx: 3.5, ry: 4.0, cx: -0.4 },
    { z: 40.0, rx: 5.0, ry: 5.2, cx: -0.5 },
    { z: 44.6, rx: 4.6, ry: 4.7, cx: -1.0 },
    { z: 48.0, rx: 3.0, ry: 3.0, cx: -2.4 },
    { tip: [-5.4, 0, 52.6] },
  ];
  const MASK = { x: 2.2, z: 40.2, rx: 2.3, ry: 3.0, rz: 4.0 };
  const SHOULDER = 5.9, SH_Z = 31.6, UPPER = 8.4, FORE = 7.0;
  const ORB_Z = 26.6;              // centro do orbe no referencial do cetro (pegada = 0)

  function maskX(y, z) {
    const yy = y / MASK.ry, zz = (z - MASK.z) / MASK.rz;
    return MASK.x + MASK.rx * Math.sqrt(Math.max(0, 1 - yy * yy - zz * zz));
  }

  function build() {
    const root = new N3('root');
    const body = root.add(new N3('body'));
    body.p = [0, 0, 4];

    // ---- Saia em sino (pivô na cintura)
    const sk = new G3().at(0, 0, -WAIST);
    rev(sk, SKIRT, A10, (k, i) => (k === 0 ? [C.trim, 0.5] : [k === 1 ? C.robeDark : C.robe, 0]));
    const skirt = body.add(new N3('skirt', sk));
    skirt.p = [0, 0, WAIST];
    // Circuitos do manto (frente: par central que se abre; lados; costas)
    const S = surface(SKIRT, A10);
    const zc = SKIRT.map((r) => r.z), ac = [18, 54, 90, 126, 162, 198, 234, 270, 306, 342, -18, -54, -90];
    const cg = new G3().at(0, 0, -WAIST);
    traces(cg, S, [
      [[-4.5, 22.6], [-4.5, 11], [-14, 6.5], [-14, 1.7]],
      [[4.5, 22.6], [4.5, 11], [14, 6.5], [14, 1.7]],
      [[-70, 20.5], [-70, 9], [-60, 5], [-60, 1.7]],
      [[70, 20.5], [70, 9], [60, 5], [60, 1.7]],
      [[172, 22.4], [172, 1.7]],
      [[188, 22.4], [188, 1.7]],
    ], 0.6, C.trim, 0.48, zc, ac);
    skirt.add(new N3('circ', cg));

    // ---- Tronco (pivô na cintura) + mantelete com broche
    const tg = new G3().at(0, 0, -WAIST);
    rev(tg, TORSO, A10, () => [C.robe, 0]);
    const torso = body.add(new N3('torso', tg));
    torso.p = [0, 0, WAIST];
    const cp = new G3().at(0, 0, -WAIST);
    rev(cp, CAPE, A8, (k) => (k === 0 ? [C.trim, 0.5] : [k === 1 ? C.cape : C.capeTop, 0]));
    // Broche do eclipse: disco luminoso com disco escuro deslocado (crescente)
    const hexPts = (r, dy, dz) => Array.from({ length: 6 }, (_, q) => { const a = (q / 6) * TWO_PI + PI / 6; return [0, dy + Math.cos(a) * r, dz + Math.sin(a) * r]; });
    cp.at(5.55, 0, 33.4 - WAIST, 0, -0.5, 0);
    cp.poly(hexPts(1.45, 0, 0), C.trim, 0.8);
    cp.at(5.62, 0, 33.4 - WAIST, 0, -0.5, 0);
    cp.poly(hexPts(1.12, 0.38, 0.32), C.inner, 0);
    cp.at();
    torso.add(new N3('cape', cp));

    // ---- Cabeça: capuz pontudo aberto na frente, máscara branca e olhos escuros
    const hg = new G3().at(-NECK[0], 0, -NECK[2]);
    rev(hg, HOOD, A7, (k, i) => ((k <= 1 && i === 6) ? null : [C.hood, 0]));
    // fundo escuro dentro do capuz
    hg.poly(Array.from({ length: 6 }, (_, q) => { const a = (q / 6) * TWO_PI; return [0.7, Math.cos(a) * 3.9, 40.6 + Math.sin(a) * 4.7]; }), C.inner, 0);
    // máscara: meio elipsoide frontal, queixo afinado
    const lons = [-80, -30, 30, 80].map((d) => d * DEG), lats = [-90, -45, 0, 45, 90].map((d) => d * DEG);
    const MP = (lo, la) => [MASK.x + MASK.rx * Math.cos(la) * Math.cos(lo), MASK.ry * Math.cos(la) * Math.sin(lo) * (la < 0 ? 0.84 : 1), MASK.z + MASK.rz * Math.sin(la)];
    for (let a = 0; a < lats.length - 1; a++) for (let b = 0; b < lons.length - 1; b++) {
      const p0 = MP(lons[b], lats[a]), p1 = MP(lons[b + 1], lats[a]), p2 = MP(lons[b + 1], lats[a + 1]), p3 = MP(lons[b], lats[a + 1]);
      if (a === 0) hg.tri(p0, p2, p3, C.face, 0.2);
      else if (a === lats.length - 2) hg.tri(p0, p1, p2, C.face, 0.2);
      else hg.quad(p0, p1, p2, p3, C.face, 0.2);
    }
    // olhos: losangos escuros inclinados (sem expressão)
    const EP = (y, z) => [maskX(y, z) + 0.14, y, z];
    for (const s of [-1, 1]) {
      hg.poly([EP(s * 0.45, 40.9), EP(s * 1.25, 41.5), EP(s * 2.05, 41.25), EP(s * 1.25, 40.7)], C.eye, 0);
    }
    // marca na testa
    hg.poly([EP(0, 43.6), EP(0.42, 43.0), EP(0, 42.4), EP(-0.42, 43.0)], C.trim, 0.9);
    const head = torso.add(new N3('head', hg));
    head.p = [NECK[0], NECK[1], NECK[2] - WAIST];

    // ---- Auréola de dados (nó de inclinação + nó girando)
    const haloT = head.add(new N3('haloT'));
    haloT.p = [-1.4, 0, 18.4];
    const hl = new G3();
    const ARCS = [[0, 26], [34, 44], [52, 86], [94, 106], [114, 146], [154, 160], [168, 200], [208, 220], [228, 262], [270, 280], [288, 322], [330, 352]];
    const R0 = 6.0, R1 = 7.0, TH = 0.45;
    for (const [d0, d1] of ARCS) {
      const a0 = d0 * DEG, a1 = d1 * DEG, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      hl.quad([c0 * R0, s0 * R0, 0], [c0 * R1, s0 * R1, 0], [c1 * R1, s1 * R1, 0], [c1 * R0, s1 * R0, 0], C.halo, 0.7);
    }
    haloT.add(new N3('halo', hl));

    // ---- Braços (mangas largas com punho luminoso, luvas)
    const mkArm = (side) => {
      const sfx = side > 0 ? 'R' : 'L';
      const up = torso.add(new N3('arm' + sfx, new G3().cyl(0, 0, -UPPER, 1.8, 1.5, UPPER, 5, C.robe, 0, { caps: false, rot: PI / 5 })));
      up.p = [0, side * SHOULDER, SH_Z - WAIST];
      const fg = new G3().cyl(0, 0, -FORE, 2.6, 1.55, FORE, 5, C.robe, 0, { caps: false, rot: PI / 5 });
      fg.poly(Array.from({ length: 5 }, (_, q) => { const a = PI / 5 + (q / 5) * TWO_PI; return [Math.cos(a) * 2.5, Math.sin(a) * 2.5, -FORE + 0.05]; }), C.inner, 0);
      fg.cyl(0, 0, -FORE - 0.25, 2.78, 2.7, 0.95, 5, C.trim, 0.5, { caps: false, rot: PI / 5 });
      const fore = up.add(new N3('fore' + sfx, fg));
      fore.p = [0, 0, -UPPER];
      const hd = new G3().box(0.1, 0, -1.3, 1.8, 1.7, 2.6, C.glove, 0, { taperY: 1.15, top: C.gloveHi });
      const hand = fore.add(new N3('hand' + sfx, hd));
      hand.p = [0, 0, -FORE];
      return hand;
    };
    const handR = mkArm(1);
    mkArm(-1);

    // ---- Cetro (pegada na mão direita) com orbe e anel
    const sg = new G3();
    sg.cyl(0, 0, -21, 0.62, 0.62, 45, 5, C.staff, 0, { caps: false });
    sg.cyl(0, 0, -21, 0.85, 0, -3, 5, C.staffHi, 0, { caps: false });
    sg.cyl(0, 0, 22.0, 0.7, 2.1, 2.5, 5, C.staffHi, 0, { caps: false });
    const staff = handR.add(new N3('staff', sg));
    staff.p = [0.15, 0, -1.3];
    const orb = staff.add(new N3('orb', new G3().sphere(0, 0, 0, 2.3, 2.3, 2.3, 6, 3, C.orb, 1.0)));
    orb.p = [0, 0, ORB_Z];
    const orbRing = staff.add(new N3('orbRing', new G3().cyl(0, -0.4, 0, 3.9, 3.9, 0.8, 6, C.ring, 0.8, { axis: 'y', caps: false })));
    orbRing.p = [0, 0, ORB_Z];

    const m = new Model3(root);
    m.anchor('orb', 'orb', [0, 0, 0]);
    m.anchor('halo', 'halo', [0, 0, 0]);
    m.anchor('face', 'head', [MASK.x + MASK.rx - NECK[0], 0, MASK.z - NECK[2]]);
    return m;
  }

  // ------------------------------------------------------------ matemática do cetro
  // Rotação 3x3 (linha a linha) de Rz·Ry·Rx, igual à do motor
  function rotM(o, r) {
    const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
    o[0] = cz * cy; o[1] = cz * sy * sx - sz * cx; o[2] = cz * sy * cx + sz * sx;
    o[3] = sz * cy; o[4] = sz * sy * sx + cz * cx; o[5] = sz * sy * cx - cz * sx;
    o[6] = -sy; o[7] = cy * sx; o[8] = cy * cx;
    return o;
  }
  function mulM(o, a, b) {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return o;
  }
  const MA = new Float64Array(9), MB = new Float64Array(9), MC = new Float64Array(9), MD = new Float64Array(9), DES = [0, 0, 0];
  // Define a rotação local do cetro para que fique com a orientação (roll, pitch) no referencial do corpo
  function aimStaff(n, roll, pitch) {
    rotM(MA, n.torso.r); rotM(MB, n.armR.r); mulM(MC, MA, MB);
    rotM(MA, n.foreR.r); mulM(MD, MC, MA);
    rotM(MA, n.handR.r); mulM(MC, MD, MA);
    DES[0] = roll; DES[1] = pitch; DES[2] = 0; rotM(MB, DES);
    // local = chainᵀ · desejado
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) MD[i * 3 + j] = MC[i] * MB[j] + MC[3 + i] * MB[3 + j] + MC[6 + i] * MB[6 + j];
    const r = n.staff.r;
    r[1] = Math.asin(cl(-MD[6], -1, 1)); r[0] = Math.atan2(MD[7], MD[8]); r[2] = Math.atan2(MD[3], MD[0]);
  }
  const setR = (nd, x, y, z) => { nd.r[0] = x; nd.r[1] = y; nd.r[2] = z; };

  // ------------------------------------------------------------ estados
  function flick(t, a, b) { return Math.sin(t * a) * Math.sin(t * b) > -0.25 ? 1 : 0.2; }
  // Níveis de brilho e carga compartilhados entre pose e halos
  const LV = { k: 0, orb: 1, orbS: 1, halo: 1, circ: 1, fade: 1, rec: 0 };
  function levels(e) {
    const t = num(e.animTime), st = Math.max(0, num(e.stateTime));
    let k = 0, orb = 1 + 0.15 * Math.sin(t * 4), orbS = 1, halo = 1, circ = 0.85 + 0.25 * Math.sin(t * 2.4), fade = 1, rec = 0;
    switch (e.state) {
      case 'spawn': {
        const q = cl(st / 0.75, 0, 1);
        fade = q < 0.25 ? 0.15 : (q < 0.8 ? q * flick(t, 37, 23) : 1);
        halo = ss((q - 0.35) / 0.65); orb = q; circ *= q;
        break;
      }
      case 'windup':
        k = ss(cl(num(e.tgProgress), 0, 1));
        orb = 1 + 1.5 * k; orbS = 1 + 0.8 * k; halo = 1 + 0.5 * k; circ = 1 + 0.7 * k;
        break;
      case 'recover': {
        rec = Math.exp(-st * 7);
        orb = 1 + 1.5 * rec; orbS = 1 + 0.8 * Math.exp(-st * 11); circ = 1 + 0.6 * rec;
        break;
      }
      case 'stun':
        orb = 0.35 + 0.5 * flick(t, 31, 17); halo = 0.25 + 0.75 * flick(t, 23, 41); circ = 0.3 + 0.5 * flick(t, 19, 29);
        break;
      case 'dying': {
        const q = cl(st / 0.45, 0, 1);
        fade = (1 - q) * flick(t, 43, 29); orb = 1 - q; halo = 1 - q; circ = 1 - q;
        break;
      }
    }
    LV.k = k; LV.orb = orb; LV.orbS = orbS; LV.halo = halo; LV.circ = circ; LV.fade = fade; LV.rec = rec;
    return LV;
  }

  function pose(m, e) {
    if (!e) return;
    const n = m.nodes;
    const t = num(e.animTime), st = Math.max(0, num(e.stateTime)), f = num(e.facing);
    const vx = num(e.vx), vy = num(e.vy), cf = Math.cos(f), sf = Math.sin(f);
    const fwd = cl(vx * cf + vy * sf, -220, 220), lat = cl(-vx * sf + vy * cf, -220, 220);
    levels(e);

    // Repouso: pairando, manto balançando, cetro em pé na mão direita
    let hover = 4 + Math.sin(t * 3) * 2;
    let bPitch = fwd * 0.0009, bRoll = -lat * 0.0009, bYaw = 0;
    let tPitch = Math.sin(t * 1.4) * 0.02, tRoll = 0;
    let skP = fwd * 0.0012 + Math.sin(t * 2.3) * 0.045, skR = -lat * 0.0012 + Math.sin(t * 1.9 + 1) * 0.04, skS = 1;
    let skFlare = 1 + Math.sin(t * 3.3) * 0.025;
    let hP = Math.sin(t * 1.3) * 0.04, hR = 0, hY = Math.sin(t * 0.7) * 0.06;
    let rRoll = 0.24, rA = 0.3, rB = -2.05, rYaw = 0;
    let lRoll = -0.14, lA = -0.08, lB = -0.4, lYaw = 0;
    let sRoll = 0, sPitch = 0;
    let haloSpin = t * 0.9, hxR = 0, hxP = 0, hOff0 = 0, hOff1 = 0, hOff2 = Math.sin(t * 2) * 0.5, hScale = 1;
    let ringSpin = t * 2.2, ringTilt = 0.55, ringS = 1;

    switch (e.state) {
      case 'spawn': {
        const q = cl(st / 0.75, 0, 1), u = 1 - ss(q);
        hP += 0.35 * u; tPitch += 0.12 * u;
        rA += 0.2 * u; lA += 0.2 * u;
        hScale = 0.2 + 0.8 * LV.halo; hOff2 += 3 * u;
        break;
      }
      case 'windup': {
        const k = LV.k;
        hover += 2 * k;
        bPitch -= 0.07 * k; hP -= 0.1 * k;
        rRoll = mix(0.24, 0.3, k); rA = mix(0.3, -0.85, k); rB = mix(-2.05, -1.35, k);
        sPitch = 0.55 * k; sRoll = -0.26 * k;
        lRoll = mix(-0.14, -0.55, k); lA = mix(-0.08, -0.95, k); lB = mix(-0.4, -0.35, k);
        haloSpin = t * (0.9 + 2.5 * k);
        ringSpin = t * (2.2 + 6 * k); ringS = 1 + 0.35 * k;
        tRoll = Math.sin(t * 41) * 0.012 * k;
        break;
      }
      case 'recover': {
        const k = 1 - ss(st / 0.4), r = LV.rec;
        bPitch -= 0.07 * k + 0.1 * r; hP -= 0.1 * k + 0.08 * r;
        rRoll = mix(0.24, 0.3, k); rA = mix(0.3, -0.85, k) - 0.15 * r; rB = mix(-2.05, -1.35, k);
        sPitch = 0.55 * k + 0.2 * r; sRoll = -0.26 * k;
        lRoll = mix(-0.14, -0.55, k); lA = mix(-0.08, -0.95, k); lB = mix(-0.4, -0.35, k);
        hover += 2 * k;
        ringSpin = t * 2.2 + 3 * (1 - Math.exp(-st * 6)); ringS = 1 + 0.35 * k;
        break;
      }
      case 'stun': {
        hover = 2.2 + Math.sin(t * 5) * 0.8;
        tPitch = 0.26 + Math.sin(t * 9) * 0.04; tRoll = Math.sin(t * 6.3) * 0.06;
        hP = 0.26 + Math.sin(t * 7) * 0.05; hR = Math.sin(t * 5.1) * 0.12; hY = 0;
        skP = 0.06 + Math.sin(t * 8) * 0.04; skR = Math.sin(t * 6.7) * 0.05;
        rRoll = 0.34; rA = 0.1; rB = -1.25; sPitch = 0.3; sRoll = -0.24;
        lRoll = -0.12; lA = 0.12; lB = -0.15;
        hxR = Math.sin(t * 11) * 0.35; hxP = -0.55 + Math.sin(t * 7.3 + 1) * 0.22;
        hOff0 = -5 + Math.sin(t * 13) * 1.2; hOff1 = Math.cos(t * 9) * 1.2; hOff2 = -1.2;
        haloSpin = t * 0.9 + Math.sin(t * 17) * 0.4;
        ringSpin = t * 1.1; ringTilt = 0.9;
        break;
      }
      case 'dying': {
        const q = cl(st / 0.45, 0, 1), qq = ss(q);
        hover = mix(hover, 0, qq);
        bPitch = -0.42 * qq; bRoll = 0.16 * qq;
        tPitch = -0.12 * qq; hP = -0.35 * qq;
        skS = 1 - 0.3 * qq; skP = -0.08 * qq;
        rRoll = mix(0.24, 0.55, qq); rA = mix(0.3, 0.1, qq); rB = mix(-2.05, -0.8, qq);
        sRoll = -0.85 * qq; sPitch = -0.25 * qq;
        lRoll = mix(-0.14, -0.6, qq); lA = mix(-0.08, -0.6, qq);
        hScale = 1 + 0.45 * qq; hOff2 = 6 * qq; hOff0 = 4 * qq; hxR = 0.5 * qq;
        ringS = 1 - 0.5 * qq;
        break;
      }
    }

    // Corpo
    const b = n.body;
    b.p[2] = hover; setR(b, bRoll, bPitch, bYaw);
    setR(n.torso, tRoll, tPitch, 0);
    setR(n.skirt, skR, skP, 0);
    n.skirt.s[2] = skS; n.skirt.s[0] = skFlare; n.skirt.s[1] = skFlare;
    setR(n.head, hR, hP, hY);
    // Braços
    setR(n.armR, rRoll, rA, rYaw); setR(n.foreR, 0, rB, 0);
    setR(n.armL, lRoll, lA, lYaw); setR(n.foreL, 0, lB, 0);
    if (e.state === 'windup' || e.state === 'recover') { n.handL.r[1] = -0.5 * (e.state === 'windup' ? LV.k : 1 - ss(st / 0.4)); }
    aimStaff(n, sRoll, sPitch);
    // Orbe e anel
    const os = LV.orbS;
    n.orb.s[0] = n.orb.s[1] = n.orb.s[2] = os;
    n.orb.emi = cl(LV.orb, 0, 2.5);
    setR(n.orbRing, ringTilt, 0, ringSpin);
    n.orbRing.s[0] = n.orbRing.s[1] = n.orbRing.s[2] = ringS * (0.85 + 0.15 * os);
    n.orbRing.emi = cl(0.8 + 0.5 * (LV.orb - 1), 0.2, 2);
    // Auréola
    const ht = n.haloT;
    ht.p[0] += hOff0; ht.p[1] += hOff1; ht.p[2] += hOff2;
    setR(ht, hxR, hxP - 0.12, 0);
    ht.s[0] = ht.s[1] = ht.s[2] = hScale;
    n.halo.r[2] = haloSpin;
    n.halo.emi = cl(LV.halo, 0, 2);
    // Circuitos e brilho geral
    n.circ.emi = cl(LV.circ, 0, 2);
    n.root.emi = cl(LV.fade, 0, 1);
  }

  function glows(e, add) {
    if (!e) return;
    levels(e);
    const st = Math.max(0, num(e.stateTime));
    const a = LV.fade;
    if (a <= 0.02) return;
    let orbR = 9, orbA = 0.42;
    if (e.state === 'windup') { orbR = 9 + 16 * LV.k; orbA = 0.45 + 0.45 * LV.k; }
    else if (e.state === 'recover') { const r = Math.exp(-st * 7); orbR = 9 + 14 * r; orbA = 0.45 + 0.5 * r; }
    else if (e.state === 'stun') orbA = 0.18 * LV.orb;
    else orbA *= LV.orb;
    add('orb', orbR, '190,110,255', orbA * a);
    if (LV.halo > 0.05) add('halo', 12, '200,140,255', 0.3 * Math.min(1.5, LV.halo) * a);
  }

  // t (parâmetro do visualizador) avança o relógio da animação
  const mkE = (f, set, t) => {
    const x = new Shooter('sacerdote', 0, 0, 1);
    x.facing = f; x.vx = 0; x.vy = 0; x.z = 0;
    set(x, f);
    x.animTime += num(t);
    return x;
  };

  MODELS3D.sacerdote = {
    build, pose, glows,
    demos: [
      { label: 'spawn', e: (f, t) => mkE(f, (x) => { x.state = 'spawn'; x.stateTime = 0.5; x.animTime = 1.2; }, t) },
      { label: 'idle', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.stateTime = 1; x.animTime = 0.6; }, t) },
      { label: 'andando', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.animTime = 1.7; x.vx = Math.cos(f) * 90 - Math.sin(f) * 40; x.vy = Math.sin(f) * 90 + Math.cos(f) * 40; }, t) },
      { label: 'windup 0.4', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.tgProgress = 0.4; x.stateTime = 0.2; x.animTime = 2; x.aim = f; }, t) },
      { label: 'windup 1', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.tgProgress = 1; x.stateTime = 0.5; x.animTime = 2.3; x.aim = f; }, t) },
      { label: 'recover', e: (f, t) => mkE(f, (x) => { x.state = 'recover'; x.stateTime = 0.06; x.animTime = 2.6; }, t) },
      { label: 'stun', e: (f, t) => mkE(f, (x) => { x.state = 'stun'; x.stateTime = 0.2; x.animTime = 3.1; x.stun = 0.4; }, t) },
      { label: 'dying', e: (f, t) => mkE(f, (x) => { x.state = 'dying'; x.stateTime = 0.22; x.animTime = 4; }, t) },
    ],
  };
})();
