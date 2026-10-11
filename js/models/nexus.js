// NEXUS — a Consciência do Eclipse (chefe final). Holograma: silhueta humana
// facetada e translúcida, auréola de dados com anéis girando em eixos
// diferentes, fragmentos luminosos que se desprendem, núcleo no peito,
// fluxo de dados no lugar das pernas e uma lâmina de luz no antebraço direito.
(function () {
  const PI2 = Math.PI * 2;
  const C = { body: '#7fefff', hi: '#bffcff', white: '#e6ffff', core: '#ffffff', frag: '#8ff4ff', red: '#ff3b55', redHi: '#ff9aae' };
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const c01 = (v) => cl(v, 0, 1);
  const mix = (a, b, k) => a + (b - a) * k;
  const easeOut = (k) => 1 - (1 - k) * (1 - k);
  const smooth = (k) => k * k * (3 - 2 * k);
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Loft: anéis [z, rx, ry, cx?, cy?] ligados por faces; emiFn(k, i) -> [cor, emi]
  function loft(g, rings, n, style, o = {}) {
    const P = rings.map((r, k) => {
      const pts = [], rot = (o.rot || 0) + (o.twist || 0) * k;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * PI2 + rot;
        pts.push([(r[3] || 0) + Math.cos(a) * r[1], (r[4] || 0) + Math.sin(a) * r[2], r[0]]);
      }
      return pts;
    });
    for (let k = 0; k < rings.length - 1; k++) {
      const top = rings[k + 1][1] < 0.01 && rings[k + 1][2] < 0.01;
      const bot = rings[k][1] < 0.01 && rings[k][2] < 0.01;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, s = style(k, i);
        if (top) g.tri(P[k][i], P[k][j], P[k + 1][i], s[0], s[1]);
        else if (bot) g.tri(P[k][i], P[k + 1][j], P[k + 1][i], s[0], s[1]);
        else g.quad(P[k][i], P[k][j], P[k + 1][j], P[k + 1][i], s[0], s[1]);
      }
    }
    if (o.capA && rings[0][1] > 0.01) { const s = style(-1, 0); g.poly(P[0], s[0], s[1]); }
    if (o.capB) { const L = rings.length - 1; if (rings[L][1] > 0.01) { const s = style(L, 0); g.poly(P[L], s[0], s[1]); } }
    return g;
  }

  // Anel no plano YZ (normal = X): faces frontal, traseira e externa
  function ring(g, R, w, t, seg, col, e, o = {}) {
    const a0 = o.a0 || 0, arc = o.arc || PI2, dash = o.dash || 0;
    for (let i = 0; i < seg; i++) {
      if (dash && (i % dash) === dash - 1) continue;
      const u0 = a0 + (i / seg) * arc, u1 = a0 + ((i + 1) / seg) * arc;
      const P = (r, u, x) => [x, Math.cos(u) * r, Math.sin(u) * r];
      const ri = R - w / 2, ro = R + w / 2, h = t / 2;
      g.quad(P(ri, u0, h), P(ro, u0, h), P(ro, u1, h), P(ri, u1, h), col, e);
      g.quad(P(ri, u0, -h), P(ro, u0, -h), P(ro, u1, -h), P(ri, u1, -h), col, e);
      g.quad(P(ro, u0, -h), P(ro, u1, -h), P(ro, u1, h), P(ro, u0, h), col, e);
    }
    return g;
  }

  // Perfil do tronco (z relativo à cintura): [z, rx, ry]
  const TORSO = [[0, 6.5, 9], [10, 7.6, 11], [22, 9, 13.5], [33, 9.6, 16], [41, 8.2, 20], [46, 5.6, 13], [49.5, 3.6, 5]];
  function prof(z, out) {
    if (z <= TORSO[0][0]) { out[0] = TORSO[0][1]; out[1] = TORSO[0][2]; return out; }
    for (let i = 0; i < TORSO.length - 1; i++) {
      const a = TORSO[i], b = TORSO[i + 1];
      if (z <= b[0]) { const k = (z - a[0]) / (b[0] - a[0]); out[0] = mix(a[1], b[1], k); out[1] = mix(a[2], b[2], k); return out; }
    }
    out[0] = 3.6; out[1] = 5; return out;
  }

  const BODY = ['mantle', 'torsoG', 'headG', 'armLG', 'foreLG', 'handG', 'armRG', 'foreRG', 'funnel', 'scan0', 'scan1', 'core', 'coreRed'];
  const WAIST = 58, NFRAG = 34, NSTREAK = 8, BLADE = 118;
  const SCAN = ['scan0', 'scan1'], STRK = [], GLOWB = ['bladeQ1', 'bladeMid', 'bladeQ3', 'bladeTip'];
  for (let i = 0; i < NSTREAK; i++) STRK.push('s' + i);
  let FR = null;   // parâmetros dos fragmentos (determinísticos)

  function build() {
    const root = new N3('root');
    const fl = root.add(new N3('float'));

    // ---- Tronco facetado (painéis de dados acesos em algumas faces)
    const rT = rng(77);
    const panel = [];
    for (let k = 0; k < 8; k++) { panel.push([]); for (let i = 0; i < 10; i++) panel[k].push(rT()); }
    const tg = loft(new G3(), TORSO, 10, (k, i) => {
      if (k < 0) return [C.body, 0.08];
      const r = panel[k] ? panel[k][i] : 0.5;
      return r < 0.12 ? [C.hi, 0.4] : r < 0.24 ? [C.body, 0.18] : [C.body, 0.06];
    }, { rot: Math.PI / 10, capB: true });
    // ombros
    tg.sphere(0, -20, 42.5, 6.4, 6.4, 6, 6, 4, C.body, 0.07).sphere(0, 20, 42.5, 6.4, 6.4, 6, 6, 4, C.body, 0.07);
    // linhas de circuito: esterno, clavículas, costelas
    tg.box(9.75, 0, 18, 0.7, 0.9, 20, C.white, 1.1);
    tg.at(8.6, -8, 40.5, 0.45, 0, 0).box(0, 0, 0, 0.7, 13, 0.8, C.white, 1.0);
    tg.at(8.6, 8, 40.5, -0.45, 0, 0).box(0, 0, 0, 0.7, 13, 0.8, C.white, 1.0);
    tg.at(9.1, -6, 24, -0.5, 0, 0).box(0, 0, 0, 0.7, 6, 0.6, C.hi, 0.8);
    tg.at(9.1, 6, 24, 0.5, 0, 0).box(0, 0, 0, 0.7, 6, 0.6, C.hi, 0.8);
    tg.at();
    const torso = fl.add(new N3('torso')); torso.add(new N3('torsoG', tg));
    torso.p = [0, 0, WAIST];

    // ---- Fluxo de dados afunilado (sem pernas)
    const fu = loft(new G3(), [[0, 6.5, 9], [-7, 8.4, 10.5], [-17, 7, 8.6], [-28, 4.6, 5.4], [-39, 2.2, 2.4], [-47, 0, 0]], 10, (k, i) => {
      const lit = (i * 7 + k * 3) % 10;
      return lit === 0 ? [C.hi, 0.6] : lit === 5 ? [C.body, 0.3] : [C.body, 0.05 + k * 0.03];
    }, { rot: Math.PI / 10, twist: Math.PI / 10 });
    const fun = fl.add(new N3('funnel', fu));
    fun.p = [0, 0, WAIST];

    // ---- Varreduras (faixas que sobem pelo tronco)
    for (let i = 0; i < 2; i++) {
      const sg = loft(new G3(), [[-0.4, 1, 1], [0.4, 1, 1]], 10, () => [C.white, 1.1], { rot: Math.PI / 10 });
      torso.add(new N3('scan' + i, sg));
    }

    // ---- Núcleo (branco / vermelho na fase 3)
    const coreG = new G3().sphere(0, 0, 0, 3.4, 3.4, 3.6, 6, 4, C.core, 2.2);
    coreG.at(0.3, 0, 0, 0, Math.PI / 2, 0); ring(coreG, 5.6, 0.8, 0.6, 9, C.hi, 1.2, { dash: 3 }); coreG.at();
    const coreP = torso.add(new N3('corePiv')); coreP.p = [9.6, 0, 28]; coreP.add(new N3('core', coreG));
    const coreRG = new G3().sphere(0, 0, 0, 3.4, 3.4, 3.6, 6, 4, C.red, 1.1);
    coreRG.at(0.3, 0, 0, 0, Math.PI / 2, 0); ring(coreRG, 5.6, 0.8, 0.6, 9, C.redHi, 0.9, { dash: 3 }); coreRG.at();
    coreP.add(new N3('coreRed', coreRG));

    // ---- Cabeça: máscara lisa sem rosto, olhos brancos
    const hg = new G3();
    hg.cyl(0, 0, -3, 3.8, 3.2, 9, 6, C.body, 0.06, { caps: false });
    hg.sphere(0.6, 0, 15.5, 8.5, 7.5, 10.5, 8, 6, C.body, 0.07);
    hg.box(-1, 0, 7, 9, 8, 5, C.body, 0.06, { taperX: 1.2, taperY: 1.15 });
    hg.at(8.4, -3.2, 16, 0, 0, -0.35).box(0, 0, 0, 1, 3, 1.1, C.core, 2.2);
    hg.at(8.4, 3.2, 16, 0, 0, 0.35).box(0, 0, 0, 1, 3, 1.1, C.core, 2.2);
    hg.at(8.4, 0, 21.5, 0, -0.35, 0).box(0, 0, 0, 0.6, 0.7, 5, C.white, 1.0);
    hg.at();
    const head = torso.add(new N3('head')); head.p = [0, 0, 49]; head.add(new N3('headG', hg));

    // ---- Manto de dados: placas que pendem das costas
    const mg = new G3();
    for (let i = -1; i <= 1; i++) {
      const L = 38 - Math.abs(i) * 7;
      mg.at(0, i * 8.5, 0, i * 0.22, 0.1 * Math.abs(i), 0).extrude([[-5, 0], [5, 0], [1.2, -L], [-1.2, -L + 3]], 0.8, C.body, 0.12,
        { plane: 'yz', edgeCol: C.hi, edgeE: 0.7 });
    }
    mg.at();
    const mant = torso.add(new N3('mantle', mg)); mant.p = [-8.6, 0, 40];

    // ---- Auréola: três anéis em eixos diferentes
    const halo = torso.add(new N3('halo')); halo.p = [-14, 0, 58];
    halo.add(new N3('ring0', ring(new G3(), 40, 1.6, 0.8, 24, C.hi, 0.6)));
    halo.add(new N3('ring1', ring(new G3(), 33, 2.6, 1, 24, C.white, 1.0, { dash: 2 })));
    halo.add(new N3('ring2', ring(new G3(), 48, 1, 0.6, 20, C.hi, 0.5, { arc: 4.6 })));

    // ---- Braços
    const armG = (blade) => {
      const g = loft(new G3(), [[0, 4.6, 4.6], [-5, 5, 5], [-24, 3.4, 3.6], [-27, 2.6, 2.6]], 6, (k) => [C.body, 0.07 + k * 0.02], { capA: true });
      g.box(0, 0, -12, 0.6, 0.6, 14, C.hi, 0.7, {}).at(0, blade ? 5 : -5, -12).box(0, 0, 0, 0.6, 0.6, 12, C.hi, 0.5).at();
      return g;
    };
    const foreG = (blade) => {
      const g = loft(new G3(), [[0, 3.2, 3.2], [-5, 3.6, 3.6], [-22, 2.6, 2.4], [-24, 2, 1.8]], 6, (k) => [C.body, 0.07 + k * 0.02], { capB: true });
      if (blade) {
        g.cyl(0, 0, -21, 4.6, 4.6, 3, 6, C.white, 1.4, { caps: false });
        g.cyl(0, 0, -15, 4.0, 4.0, 1.6, 6, C.hi, 0.9, { caps: false });
      } else g.cyl(0, 0, -20, 3.4, 3.4, 1.4, 6, C.hi, 0.9, { caps: false });
      return g;
    };
    const armL = torso.add(new N3('armL')); armL.p = [0, -21, 42]; armL.add(new N3('armLG', armG(false)));
    const foreL = armL.add(new N3('foreL')); foreL.p = [0, 0, -26]; foreL.add(new N3('foreLG', foreG(false)));
    const hgd = new G3();
    hgd.box(0, 0, -3.5, 2.2, 5.6, 7, C.body, 0.1, { taperY: 1.15 });
    for (let i = 0; i < 4; i++) {
      const y = -2.1 + i * 1.4, sp = (i - 1.5) * 0.16;
      hgd.at(0, y, -7, sp, 0, 0).box(0, 0, -3.5 + (i === 0 || i === 3 ? 0.6 : 0), 1.2, 1.1, i === 0 || i === 3 ? 6 : 7.4, C.body, 0.14);
    }
    hgd.at(0.6, 2.8, -2, 0.9, -0.3, 0).box(0, 0, -2.5, 1.2, 1.2, 5, C.body, 0.14);
    hgd.at();
    const hand = foreL.add(new N3('hand')); hand.p = [0, 0, -23.5]; hand.add(new N3('handG', hgd));

    const armR = torso.add(new N3('armR')); armR.p = [0, 21, 42]; armR.add(new N3('armRG', armG(true)));
    const foreR = armR.add(new N3('foreR')); foreR.p = [0, 0, -26]; foreR.add(new N3('foreRG', foreG(true)));
    const blade = foreR.add(new N3('blade')); blade.p = [0, 0, -14];
    const bladeG = (cE, cF, eE, eF) => {
      const g = new G3();
      const rings = [[0, 1.6, 1.1], [-9, 4.0, 1.5], [-62, 3.7, 1.25], [-104, 2.6, 0.9], [-BLADE, 0, 0]];
      // seis lados: 0 e 3 = gumes (mais brilhantes)
      loft(g, rings, 6, (k, i) => (i === 0 || i === 3 ? [cE, eE] : [cF, eF]), { rot: -Math.PI / 6 });
      // emissor (prismas flutuando junto à base)
      g.at(0, 0, -3, 0, 0, 0).box(0, 2.2, 0, 2.6, 0.8, 4, cE, eE * 0.8).box(0, -2.2, 0, 2.6, 0.8, 4, cE, eE * 0.8).at();
      return g;
    };
    blade.add(new N3('bladeC', bladeG(C.core, '#a8f8ff', 2.0, 1.05)));
    blade.add(new N3('bladeX', bladeG('#ffe0e6', C.red, 1.6, 1.0)));

    // ---- Fragmentos (cubos soltos) e fluxo descendo até o chão
    const rF = rng(4242);
    FR = [];
    for (let i = 0; i < NFRAG; i++) {
      const kind = i < 10 ? 0 : i < 24 ? 1 : 2;
      const bright = rF() < 0.35;
      const g = new G3().box(0, 0, 0, 1, 1, 1, bright ? C.white : C.frag, bright ? 1.5 : 0.85);
      const nd = fl.add(new N3('f' + i, g));
      const z = kind === 2 ? 34 + rF() * 110 : 46 + rF() * 84;
      FR.push({ nd, kind, z, a: rF() * PI2, sz: 1.4 + rF() * 2.2, sp: 0.22 + rF() * 0.45, ph: rF(), R: 26 + rF() * 22,
        w: (rF() < 0.5 ? -1 : 1) * (0.35 + rF() * 0.5), spin: 1 + rF() * 3, far: 70 + rF() * 90, fz: rF() * 200 - 30 });
    }
    for (let i = 0; i < NSTREAK; i++) {
      root.add(new N3('s' + i, new G3().box(0, 0, 0, 0.9, 0.9, 6, i % 2 ? C.white : C.hi, 1.2)));
    }

    const m = new Model3(root);
    m.anchor('core', 'corePiv', [0, 0, 0]);
    m.anchor('head', 'head', [1, 0, 15]);
    m.anchor('eyes', 'head', [8.7, 0, 16]);
    m.anchor('halo', 'halo', [0, 0, 0]);
    m.anchor('hand', 'hand', [0, 0, -6]);
    m.anchor('bladeBase', 'blade', [0, 0, -6]);
    m.anchor('bladeQ1', 'blade', [0, 0, -32]);
    m.anchor('bladeMid', 'blade', [0, 0, -60]);
    m.anchor('bladeQ3', 'blade', [0, 0, -88]);
    m.anchor('bladeTip', 'blade', [0, 0, -BLADE]);
    return m;
  }

  // Aponta o eixo −Z do nó na direção (dx, dy, dz) do referencial do pai
  function aim(nd, dx, dy, dz) {
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l; dy /= l; dz /= l;
    nd.r[0] = Math.asin(cl(dy, -1, 1)); nd.r[1] = Math.atan2(-dx, -dz); nd.r[2] = 0;
  }
  // Mesmo, mas com a direção dada no referencial do avô (desfaz roll/pitch do pai)
  function aimChild(par, nd, dx, dy, dz) {
    const a = par.r[0], b = par.r[1];
    const cb = Math.cos(b), sb = -Math.sin(b);
    const x = cb * dx + sb * dz, z = -sb * dx + cb * dz;
    const ca = Math.cos(a), sa = -Math.sin(a);
    aim(nd, x, ca * dy - sa * z, sa * dy + ca * z);
  }

  // Poses dos braços: u = braço, f = antebraço; [frente, para fora, cima]
  const RP = {
    guard: [[0.25, 0.42, -0.87], [0.82, 0.5, -0.33]],
    wind: [[-0.35, 0.6, 0.72], [-0.6, 0.35, 0.72]],
    up: [[0.12, 0.38, 0.92], [0.06, 0.1, 1]],
    fwd: [[0.92, 0.3, -0.2], [1, 0.06, 0.08]],
    drop: [[0.3, 0.35, -0.88], [0.78, 0.45, 0.22]],
    raised: [[0.15, 0.78, 0.55], [0.22, 0.5, 0.84]],
    wide: [[0.1, 0.96, 0.15], [0.15, 0.8, 0.58]],
    swept: [[0.5, -0.45, -0.25], [0.55, -0.82, -0.2]],
  };
  const LP = {
    open: [[0.3, 0.45, -0.84], [0.82, 0.48, -0.2]],
    palm: [[0.82, 0.38, 0.05], [0.85, 0.15, 0.5]],
    back: [[-0.55, 0.42, -0.72], [-0.7, 0.3, -0.62]],
    up: [[0.1, 0.42, 0.9], [0.0, 0.2, 1]],
    inward: [[0.35, 0.35, -0.86], [0.7, -0.55, 0.35]],
    wide: [[0.1, 0.96, 0.15], [0.12, 0.88, 0.45]],
    hang: [[0.22, 0.3, -0.93], [0.55, 0.22, -0.8]],
    side: [[0.15, 0.97, 0.02], [0.28, 0.93, 0.2]],
  };
  const TA = [0, 0, 0], TB = [0, 0, 0], PR = [0, 0];
  function setArm(up, fore, side, A, B, k, wob) {
    // mistura as poses A e B (k) e aplica: side = +1 (direito) / −1 (esquerdo)
    for (let s = 0; s < 2; s++) {
      const a = A[s], b = B[s], o = s ? TB : TA;
      o[0] = mix(a[0], b[0], k); o[1] = mix(a[1], b[1], k) * side; o[2] = mix(a[2], b[2], k) + (s ? wob : wob * 0.5);
    }
    aim(up, TA[0], TA[1], TA[2]);
    aimChild(up, fore, TB[0], TB[1], TB[2]);
  }

  function pose(m, e) {
    const n = m.nodes;
    const S = (e && e.state) || 'idle', st = Math.max(0, num(e.stateTime)), t = num(e.animTime);
    const tg = c01(num(e.tgProgress)), ph = cl(Math.round(num(e.phase) || 1), 1, 3), p3 = ph === 3;
    let hover = Math.sin(t * 1.6) * 4, kneel = 0, lean = 0, twist = 0, roll = 0, shake = 0, headP = 0, headY = 0;
    let rA = RP.guard, rB = RP.guard, rk = 0, rw = Math.sin(t * 1.3) * 0.05;
    let lA = LP.open, lB = LP.open, lk = 0, lw = Math.sin(t * 2 + 1) * 0.06;
    let coreS = 1 + Math.sin(t * 6) * 0.12, ringSp = 1, funTrail = 0, funStretch = 1, flick = 1;
    let gather = 1, scatter = 0, sweepA = 0, glitch = 0;

    // inclinação ao se deslocar
    const f = num(e.facing), cf = Math.cos(f), sf = Math.sin(f);
    const vf = num(e.vx) * cf + num(e.vy) * sf, vs = -num(e.vx) * sf + num(e.vy) * cf;

    switch (S) {
      case 'intro': {
        const k = c01(st / 1.6);
        gather = smooth(k);
        rA = RP.wide; rB = RP.guard; rk = smooth(c01((st - 1.2) / 1.2));
        lA = LP.wide; lB = LP.open; lk = rk;
        headP = mix(-0.35, 0, rk); hover += mix(10, 0, k);
        flick = k < 0.35 ? 0 : k < 0.95 ? (Math.sin(st * 47) + Math.sin(st * 31) > (1 - k) * 4 - 1.6 ? 1 : 0) : 1;
        ringSp = 1 + (1 - k) * 3;
        break;
      }
      case 'sweep_windup': {
        const k = easeOut(c01(tg * 1.7));
        rA = RP.guard; rB = RP.wind; rk = k; rw = -tg * 0.15;
        lA = LP.open; lB = LP.palm; lk = k * 0.8;
        twist = 0.42 * k; lean = -0.06 * k; headY = -0.25 * k;
        break;
      }
      case 'sweep': {
        const k = easeOut(c01(st / 0.15));
        const ang = mix(1.0, -1.15, k);
        rA = RP.fwd; rB = RP.fwd; rk = 0;
        twist = mix(0.4, -0.5, k); lean = 0.12;
        lA = LP.palm; lB = LP.back; lk = k;
        // varredura horizontal: direção calculada aqui
        sweepA = ang;
        break;
      }
      case 'jump_windup': {
        const k = easeOut(c01(st / 0.3));
        kneel = 10 * k; lean = 0.18 * k;
        rA = RP.guard; rB = RP.up; rk = k; lA = LP.open; lB = LP.back; lk = k;
        funStretch = 1;
        break;
      }
      case 'jump': {
        const k = c01(tg || st / 0.85);
        rA = RP.up; rB = RP.up; lA = LP.up; lB = LP.back; lk = smooth(c01((k - 0.5) * 2));
        headP = -0.2 + k * 0.3; lean = -0.05 + k * 0.15;
        funStretch = 1.35 - 0.3 * k; funTrail = -0.2;
        break;
      }
      case 'burst_windup': {
        rA = RP.guard; rB = RP.raised; rk = easeOut(c01(tg * 2)); rw = Math.sin(t * 3) * 0.2;
        lA = LP.open; lB = LP.inward; lk = easeOut(c01(tg * 2));
        coreS = 1 + tg * 1.6 + Math.sin(t * 22) * 0.12 * tg; shake = 1.5 + tg;
        lean = 0.12 * tg; headP = 0.2 * tg;
        break;
      }
      case 'burst': {
        const k = c01(st / 0.75);
        const fl = 1 - easeOut(c01(st / 0.3));
        rA = RP.wide; rB = RP.raised; rk = smooth(k); lA = LP.wide; lB = LP.open; lk = smooth(k);
        coreS = 1 + 1.8 * fl + (ph >= 2 ? Math.max(0, Math.sin(st * 19.6)) * 0.6 : 0);
        lean = -0.22 * fl; headP = -0.3 * fl;
        break;
      }
      case 'charge_windup': {
        const k = easeOut(c01(tg * 1.6));
        rA = RP.guard; rB = RP.fwd; rk = k; lA = LP.open; lB = LP.back; lk = k;
        lean = 0.2 * k; kneel = 5 * k; twist = 0.15 * k; shake = tg > 0.7 ? 0.8 : 0;
        break;
      }
      case 'charging': {
        rA = RP.fwd; rB = RP.fwd; lA = LP.back; lB = LP.back;
        lean = 0.38; twist = 0.12; funTrail = 0.75; headP = -0.25; hover -= 2;
        break;
      }
      case 'pillars': {
        const c = (st / 0.3) % 1, pulse = Math.exp(-c * 6);
        rA = RP.up; rB = RP.up; lA = LP.palm; lB = LP.palm; lw = pulse * 0.25;
        headP = -0.15; lean = -0.04; coreS = 1.1 + pulse * 0.5;
        break;
      }
      case 'spiral': {
        rA = RP.raised; rB = RP.raised; rw = Math.sin(t * 3) * 0.2;
        lA = LP.side; lB = LP.side; lw = Math.sin(t * 3 + 1.5) * 0.15;
        twist = Math.sin(t * 2.4) * 0.3; ringSp = 3; coreS = 1.25 + Math.sin(t * 9) * 0.15;
        break;
      }
      case 'meteor': {
        const k = easeOut(c01(st / 0.6));
        rA = RP.guard; rB = RP.up; rk = k; lA = LP.open; lB = LP.up; lk = k;
        headP = -0.4 * k; lean = -0.1 * k; hover += 8 * k; ringSp = 1 + k * 1.5;
        coreS = 1.1 + 0.4 * k;
        break;
      }
      case 'transition': {
        rA = RP.raised; rB = RP.wide; rk = 0.5 + Math.sin(t * 3) * 0.5; rw = Math.sin(t * 3) * 0.2;
        lA = LP.wide; lB = LP.side; lk = 0.5 + Math.sin(t * 3.3) * 0.5;
        shake = 2.5; ringSp = 5; headP = -0.3; lean = -0.1;
        coreS = 1.3 + Math.sin(t * 15) * 0.35;
        glitch = Math.sin(t * 53) + Math.sin(t * 29) > 1.1 ? Math.sin(t * 91) : 0;
        break;
      }
      case 'stagger': {
        rA = RP.drop; rB = RP.drop; lA = LP.hang; lB = LP.hang; rw = 0; lw = 0;
        kneel = 20; lean = 0.5; headP = 0.45; roll = 0.12; shake = 2.5;
        ringSp = 0.4; coreS = 0.8 + Math.sin(t * 13) * 0.25;
        glitch = Math.sin(t * 61) + Math.sin(t * 23) > 0.9 ? Math.sin(t * 97) : 0;
        break;
      }
      case 'dying': {
        const d = c01(st / 2.4);
        scatter = smooth(d);
        rA = RP.drop; rB = RP.wide; rk = smooth(d); lA = LP.hang; lB = LP.wide; lk = smooth(d);
        kneel = 14 * (1 - d); lean = mix(0.4, -0.25, d); headP = mix(0.4, -0.5, d); shake = 2.5 * (1 - d);
        ringSp = 4; coreS = 1 + d * 1.5 + Math.sin(t * 25) * 0.3;
        flick = d < 0.25 ? 1 : (Math.sin(st * 43) + Math.sin(st * 17) > (d - 0.25) * 2.4 - 1.3 ? 1 : 0);
        glitch = Math.sin(st * 71) * d;
        break;
      }
      case 'recover': {
        lean = 0.06; hover -= 1.5;
        break;
      }
      default: {
        // idle e estados desconhecidos: guarda baixa
        lean = cl(vf / 92, -1, 1) * 0.12; roll = cl(vs / 92, -1, 1) * 0.08;
        funTrail = cl(vf / 92, -1, 1) * 0.35;
      }
    }

    if (shake) { n.float.p[1] = Math.sin(t * 50) * shake; n.float.p[0] = Math.sin(t * 37) * shake * 0.4; }
    n.float.p[2] = hover - kneel;

    // tronco
    const T = n.torso;
    T.r[0] = roll; T.r[1] = lean; T.r[2] = twist;
    n.head.r[1] = headP; n.head.r[2] = headY - twist * 0.4;

    // fluxo de dados: mantém a ponta perto do chão
    const fz = Math.max(0.35, (47 - kneel + Math.min(0, hover)) / 47);
    n.funnel.s[2] = fz * funStretch; n.funnel.r[1] = funTrail + lean * 0.4;
    n.funnel.s[0] = n.funnel.s[1] = 1 + (1 - fz) * 0.25;

    // braços
    if (S === 'sweep') {
      const a = sweepA;
      aim(n.armR, Math.cos(a) * 0.9, Math.sin(a) * 0.9, -0.12);
      aimChild(n.armR, n.foreR, Math.cos(a - 0.12), Math.sin(a - 0.12), -0.2);
    } else setArm(n.armR, n.foreR, 1, rA, rB, rk, rw);
    setArm(n.armL, n.foreL, -1, lA, lB, lk, lw);
    n.hand.r[0] = -0.3; n.hand.r[1] = -0.25;
    if (lA === LP.palm || lA === LP.up) { n.hand.r[1] = -0.9; }
    n.blade.r[2] = 1.2;

    // núcleo
    n.core.vis = !p3 && flick > 0; n.coreRed.vis = p3 && flick > 0;
    const cs = coreS * (p3 ? 1.35 + Math.sin(t * 9) * 0.2 : 1);
    n.core.s[0] = n.core.s[1] = n.core.s[2] = cs; n.coreRed.s[0] = n.coreRed.s[1] = n.coreRed.s[2] = cs;
    n.core.r[0] = n.coreRed.r[0] = t * 2;
    n.bladeC.vis = !p3 && flick > 0; n.bladeX.vis = p3 && flick > 0;
    const bf = 1 + Math.sin(t * 17) * 0.12 + (ph >= 2 ? 0.15 : 0);
    n.bladeC.emi = n.bladeX.emi = bf;

    // varreduras
    for (let i = 0; i < 2; i++) {
      const sc = n[SCAN[i]], z = ((t * 0.45 + i * 0.5) % 1) * 47;
      prof(z, PR);
      sc.p[2] = z; sc.s[0] = PR[0] + 0.35; sc.s[1] = PR[1] + 0.35;
      sc.emi = 0.5 + 0.5 * Math.sin(Math.PI * z / 47);
    }

    // manto
    n.mantle.r[1] = 0.22 + Math.max(0, funTrail) * 0.3 - lean * 0.8 + Math.sin(t * 1.7) * 0.06;
    n.mantle.r[0] = Math.sin(t * 1.3) * 0.05;
    // auréola
    const ts = t * ringSp;
    n.ring0.r[0] = ts * 0.15; n.ring0.r[1] = Math.sin(t * 0.7) * 0.22; n.ring0.r[2] = Math.sin(t * 0.5) * 0.18;
    n.ring1.r[0] = ts * 0.6;
    n.ring2.r[0] = -ts * 0.4; n.ring2.r[1] = 0.55 + Math.sin(ts * 0.3) * 0.2; n.ring2.r[2] = ts * 0.5;
    n.halo.r[1] = -lean * 0.5;

    // dissolução (morte): partes se afastam
    if (scatter > 0) {
      const d = scatter;
      n.head.p[2] = 49 + d * 26; n.head.p[0] = -d * 6;
      n.armL.p[1] = -21 - d * 22; n.armR.p[1] = 21 + d * 22; n.armL.p[2] = n.armR.p[2] = 42 + d * 10;
      n.halo.p[2] = 58 + d * 30; const hs = (1 + d * 0.6) * (1 - smooth(c01((d - 0.5) / 0.5)) * 0.97); n.halo.s[0] = n.halo.s[1] = n.halo.s[2] = hs;
      const sh = 1 - d * 0.55;
      T.s[0] = T.s[1] = sh; T.s[2] = 1 + d * 0.2;
      n.funnel.s[0] *= sh; n.funnel.s[1] *= sh;
      n.blade.s[2] = 1 - d * 0.8;
    }
    if (gather < 1) {
      const s = 0.4 + 0.6 * gather;
      T.s[0] = T.s[1] = s; T.s[2] = 0.7 + 0.3 * gather;
      n.funnel.s[0] *= s; n.funnel.s[1] *= s;
      n.blade.s[2] = gather;
      const hg = 0.15 + 0.85 * gather * gather; n.halo.s[0] = n.halo.s[1] = n.halo.s[2] = hg;
    }
    if (glitch) {
      n.torsoG.p[1] = glitch * 3.5; n.headG.p[1] = -glitch * 2.5; n.funnel.p[1] = glitch * 2;
      n.armLG.s[0] = n.armRG.s[0] = 1 + Math.abs(glitch) * 0.8;
    }
    if (!flick) for (let i = 0; i < BODY.length; i++) n[BODY[i]].vis = false;

    // fragmentos
    for (let i = 0; i < NFRAG; i++) {
      const F = FR[i], nd = F.nd;
      let x, y, z, sc = F.sz;
      if (F.kind === 2) {
        const a = F.a + t * F.w;
        x = Math.cos(a) * F.R; y = Math.sin(a) * F.R; z = F.z + Math.sin(t * 0.9 + F.ph * 6) * 4;
      } else {
        const zz = F.z - WAIST;
        let rx, ry;
        if (zz > 47) { rx = 8; ry = 7; } else { prof(zz, PR); rx = PR[0]; ry = PR[1]; }
        const ca = Math.cos(F.a), sa = Math.sin(F.a);
        x = ca * (rx + 1.2); y = sa * (ry + 1.2); z = F.z - kneel * 0.8;
        if (F.kind === 1) {
          const d = (t * F.sp + F.ph) % 1;
          x += ca * d * 34; y += sa * d * 34; z += d * 28; sc *= 1 - d * 0.85;
        } else {
          const j = Math.sin(t * 3 + F.ph * 9) * 0.8;
          x += ca * j; y += sa * j; sc *= 0.8 + 0.2 * Math.sin(t * 5 + F.ph * 7);
        }
      }
      if (gather < 1) {
        const g = gather, fa = F.a + 1.7, far = F.far * (1 - g);
        x = mix(Math.cos(fa) * F.far, x, g); y = mix(Math.sin(fa) * F.far, y, g); z = mix(F.fz + 40, z, g);
        sc *= 0.6 + 0.4 * g + (1 - g) * 0.5 * (far > 0 ? 1 : 0);
      }
      if (scatter > 0) {
        const d = scatter, ox = x, oy = y, l = Math.hypot(ox, oy) || 1;
        x += (ox / l) * d * (60 + F.far * 0.6); y += (oy / l) * d * (60 + F.far * 0.6); z += d * (20 + F.fz * 0.3);
        sc *= 1 + d * 0.6 - d * d * 0.9;
      }
      nd.p[0] = x; nd.p[1] = y; nd.p[2] = z;
      nd.s[0] = nd.s[1] = nd.s[2] = Math.max(0.05, sc);
      nd.r[0] = t * F.spin + F.ph * 6; nd.r[1] = t * F.spin * 0.7; nd.r[2] = F.a;
    }

    // fluxo descendo até o chão
    const top = Math.max(8, 30 + hover - kneel);
    for (let i = 0; i < NSTREAK; i++) {
      const nd = n[STRK[i]], d = (t * 1.4 + i * 0.37) % 1, a = i * 2.4 + t * 0.6;
      const r = mix(7, 2.5, d) * (scatter > 0 ? 1 + scatter * 3 : 1);
      nd.p[0] = Math.cos(a) * r; nd.p[1] = Math.sin(a) * r; nd.p[2] = mix(top, 2, d);
      nd.s[2] = 0.4 + 0.8 * Math.sin(Math.PI * d);
      nd.vis = gather > 0.5;
    }
  }

  function opts(e) {
    const S = e.state, st = num(e.stateTime), t = num(e.animTime);
    let emi = 1;
    if (S === 'intro') emi = 0.3 + 0.7 * c01(st / 1.6);
    else if (S === 'dying') emi = c01(1 - (st - 1.4) / 1.0) * (1 + 0.15 * Math.sin(t * 31));
    else if (S === 'stagger') emi = 0.85 + 0.15 * Math.sin(t * 37);
    else if (S === 'transition') emi = 1.1 + 0.2 * Math.sin(t * 41);
    if (num(e.flash) > 0) emi = Math.max(emi, 1.8);
    return { holo: true, emi };
  }

  function glows(e, add) {
    const S = e.state, st = num(e.stateTime), t = num(e.animTime);
    const ph = cl(Math.round(num(e.phase) || 1), 1, 3), p3 = ph === 3;
    let vis = 1;
    if (S === 'intro') vis = c01(st / 1.6);
    else if (S === 'dying') vis = c01(1 - (st - 1.4) / 1.0);
    if (vis <= 0.01) return;
    const coreRGB = p3 ? '255,70,100' : '150,245,255';
    const charge = S === 'burst_windup' ? c01(num(e.tgProgress)) : S === 'burst' ? c01(1 - st / 0.3) : 0;
    add('core', 110, p3 ? '255,50,80' : '60,210,255', (0.16 + 0.05 * Math.sin(t * 3)) * vis);
    add('core', 22 + charge * 40 + ph * 4, coreRGB, (0.8 + charge * 0.2) * vis);
    add('eyes', 12, coreRGB, 0.85 * vis);
    const bRGB = p3 ? '255,90,120' : '120,235,255', br = 13 + (ph >= 2 ? 5 : 0);
    for (let i = 0; i < 4; i++) add(GLOWB[i], br + Math.sin(t * 17 + i) * 3, bRGB, 0.4 * vis);
  }

  // Demos: instâncias reais de Boss
  const mk = (f, t, set) => {
    const x = new Boss(0, 0);
    x.facing = f; x.vx = 0; x.vy = 0; x.jumpZ = 0;
    x.animTime = 1.3 + num(t); x.stateTime = 0;
    set(x);
    return x;
  };
  const D = (label, set) => ({ label, e: (f, t) => mk(f, t, set) });

  MODELS3D.nexus = {
    build, pose, opts, glows,
    demos: [
      D('intro 0.5', (x) => { x.state = 'intro'; x.stateTime = 0.5; }),
      D('intro 1.35', (x) => { x.state = 'intro'; x.stateTime = 1.35; }),
      D('idle', (x) => { x.state = 'idle'; x.stateTime = 0.4; }),
      D('idle andando', (x) => { x.state = 'idle'; x.stateTime = 0.4; x.vx = Math.cos(x.facing) * 92; x.vy = Math.sin(x.facing) * 92; }),
      D('recover', (x) => { x.state = 'recover'; x.stateTime = 0.2; }),
      D('sweep_windup .9', (x) => { x.state = 'sweep_windup'; x.stateTime = 0.7; x.tgProgress = 0.9; }),
      D('sweep .05', (x) => { x.state = 'sweep'; x.stateTime = 0.05; }),
      D('sweep .15', (x) => { x.state = 'sweep'; x.stateTime = 0.15; }),
      D('jump_windup', (x) => { x.state = 'jump_windup'; x.stateTime = 0.3; }),
      D('jump', (x) => { x.state = 'jump'; x.stateTime = 0.4; x.tgProgress = 0.47; x.jumpZ = 60; }),
      D('burst_windup', (x) => { x.state = 'burst_windup'; x.stateTime = 0.6; x.tgProgress = 0.8; }),
      D('burst', (x) => { x.state = 'burst'; x.stateTime = 0.1; }),
      D('charge_windup', (x) => { x.state = 'charge_windup'; x.stateTime = 0.6; x.tgProgress = 0.8; }),
      D('charging', (x) => { x.state = 'charging'; x.stateTime = 0.2; }),
      D('pillars', (x) => { x.state = 'pillars'; x.stateTime = 0.65; x.phase = 2; }),
      D('spiral F3', (x) => { x.state = 'spiral'; x.stateTime = 1; x.phase = 3; }),
      D('meteor F3', (x) => { x.state = 'meteor'; x.stateTime = 0.9; x.phase = 3; }),
      D('transition', (x) => { x.state = 'transition'; x.stateTime = 1; x.phase = 2; }),
      D('stagger', (x) => { x.state = 'stagger'; x.stateTime = 0.5; }),
      D('dying 0.6', (x) => { x.state = 'dying'; x.stateTime = 0.6; }),
      D('dying 1.7', (x) => { x.state = 'dying'; x.stateTime = 1.7; }),
    ],
  };
})();
