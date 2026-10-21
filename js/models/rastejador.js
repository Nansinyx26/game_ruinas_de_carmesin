// ---------------------------------------------------------------------------
// RASTEJADOR — aranha mecânica de NEXUS (modelo 3D low-poly)
// Carapaça em domo com placas segmentadas, oito patas articuladas (IK de dois
// ossos + tarso afiado), aglomerado de sensores vermelhos, quelíceras prateadas
// e um tanque de energia roubada (ciano) nas costas.
// Referencial: +X frente, +Y direita, +Z cima; origem nos pés.
// ---------------------------------------------------------------------------
(function () {
  const PI = Math.PI, TWO_PI = PI * 2;
  const PAL = {
    shell: '#2b313b', shellHi: '#56606f', shellMid: '#3a424f', dark: '#11141a', under: '#171b22',
    leg: '#262c36', legHi: '#3b4350', legLo: '#161a20', eye: '#ff3a50', eyeCore: '#ff4a5c', fang: '#aab4c4', tip: '#8f9aab',
    core: '#38d6ff', cap: '#3c4554', cable: '#1b6f8c', rivet: '#7d8898', lip: '#6d798b', shellSide: '#20252e',
  };

  // Dimensões
  const BZ = 9;                          // altura do centro do corpo (repouso)
  const L1 = 9, L2 = 8.5, L3 = 7;        // fêmur, tíbia, tarso
  const ABD_P = 0.12;                    // abdômen levemente erguido atrás
  const G0 = 0.55;                       // dobra fixa do tarso (para baixo)
  const CH = Math.sqrt(L2 * L2 + L3 * L3 + 2 * L2 * L3 * Math.cos(G0));   // corda tíbia+tarso
  const DEL = Math.atan2(L3 * Math.sin(G0), L2 + L3 * Math.cos(G0));       // desvio da corda
  // Quadris no referencial do corpo (lado direito; o esquerdo é espelhado)
  const HIPS = [[5.0, 3.2, -0.7], [2.7, 4.4, -0.9], [0.3, 4.7, -0.9], [-2.0, 4.1, -0.7]];
  // Pés em repouso (referencial do modelo): ângulo a partir de +X e raio
  const FA = [0.55, 1.2, 1.95, 2.6], FR = [17.5, 16.6, 16.6, 17.5];

  const LEGS = [];
  for (let i = 0; i < 4; i++) {
    for (const k of [-1, 1]) {
      const h = HIPS[i];
      LEGS.push({
        i, k, id: (k < 0 ? 'L' : 'R') + i,
        hip: [h[0], h[1] * k, h[2]],
        foot: [Math.cos(FA[i]) * FR[i] + 0.5, Math.sin(FA[i]) * FR[i] * k, 0],
        group: (i + (k > 0 ? 1 : 0)) % 2,   // tetrápode alternado: L0 R1 L2 R3 / R0 L1 R2 L3
      });
    }
  }

  // ------------------------------------------------------------ geometria
  // Superfície de revolução em torno de X (seção elíptica; topo com aresta)
  // prof: [[x, r], ...]; col(k, j) dá a cor da faixa k / face j; skip(j) omite faces
  function revolve(g, prof, sides, wy, hTop, hBot, col, emi, skip, rot = 0) {
    const rings = prof.map(([x, r]) => {
      const pts = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * TWO_PI + rot, cy = Math.sin(a), cz = Math.cos(a);
        pts.push([x, cy * r * wy, cz * r * (cz > 0 ? hTop : hBot)]);
      }
      return pts;
    });
    for (let k = 0; k < prof.length - 1; k++) {
      for (let j = 0; j < sides; j++) {
        if (skip && skip(j)) continue;
        const jn = (j + 1) % sides;
        const A = rings[k][j], B = rings[k][jn], C = rings[k + 1][jn], D = rings[k + 1][j];
        const c = col(k, j);
        if (prof[k][1] < 0.01) g.tri(A, C, D, c, emi);
        else if (prof[k + 1][1] < 0.01) g.tri(A, B, C, c, emi);
        else g.quad(A, B, C, D, c, emi);
      }
    }
    return g;
  }

  // Segmento de pata ao longo de +X (0..L) com seção em losango (aresta em cima)
  function diamondSeg(g, L, w0, h0, w1, h1, cTop, cBot) {
    const P = (x, w, h) => [[x, 0, h], [x, w, 0], [x, 0, -h * 0.6], [x, -w, 0]];
    const A = P(0, w0, h0), B = P(L, w1, h1);
    for (let j = 0; j < 4; j++) {
      const jn = (j + 1) % 4;
      g.quad(A[j], A[jn], B[jn], B[j], (j === 0 || j === 3) ? cTop : cBot);
    }
    return g;
  }
  // Segmento triangular (aresta em cima)
  function triSeg(g, L, w0, h0, w1, h1, cTop, cBot) {
    const P = (x, w, h) => [[x, 0, h], [x, w, -h * 0.5], [x, -w, -h * 0.5]];
    const A = P(0, w0, h0), B = P(L, w1, h1);
    for (let j = 0; j < 3; j++) {
      const jn = (j + 1) % 3;
      g.quad(A[j], A[jn], B[jn], B[j], j === 1 ? cBot : cTop);
    }
    return g;
  }
  // Ponta afiada (pirâmide triangular ao longo de +X)
  function spike(g, L, w, h, c, cHi) {
    const A = [[0, 0, h], [0, w, -h * 0.5], [0, -w, -h * 0.5]], T = [L, 0, 0];
    g.tri(A[0], A[1], T, cHi || c); g.tri(A[1], A[2], T, c); g.tri(A[2], A[0], T, cHi || c);
    return g;
  }

  function build() {
    const root = new N3('root');

    // ---- Tórax (cefalotórax) com placa-crista e rebites
    const gb = new G3();
    revolve(gb, [[-2.6, 4.2], [0.8, 5.6], [4.6, 5.0], [6.8, 3.2], [7.4, 0]], 8, 1.0, 0.85, 0.55,
      (k, j) => (j === 3 || j === 4 ? PAL.under : (j === 2 || j === 5) ? PAL.dark : PAL.shell), 0,
      (j) => j === 3 || j === 4);
    gb.box(1.4, 0, 4.4, 7.2, 4.6, 1.5, PAL.shell, 0, { taperX: 0.78, taperY: 0.62, top: PAL.shellMid });
    for (const [x, y] of [[-1.2, -1.5], [-1.2, 1.5], [3.9, -1.2], [3.9, 1.2]]) gb.cyl(x, y, 5.05, 0.55, 0, 0.6, 3, PAL.rivet, 0, { caps: false });
    const body = root.add(new N3('body', gb));
    body.p = [0, 0, BZ];

    // ---- Abdômen segmentado (placas sobrepostas com bordas claras)
    const ga = new G3();
    // seção em losango arredondado com crista no topo (rot = 0): j=0/7 encostas da crista,
    // 1/6 flancos, 2/5 flancos baixos, 3/4 base (omitida — nunca vista de cima)
    revolve(ga, [[1.2, 2.8], [-1.0, 5.1], [-3.2, 6.0], [-3.2, 5.2], [-6.3, 6.4], [-6.3, 5.5], [-9.1, 4.7], [-11.2, 0]],
      8, 0.94, 1.12, 0.62,
      (k, j) => {
        if (k === 2 || k === 4) return (j === 2 || j === 5) ? PAL.shellSide : PAL.lip;   // bordas das placas
        if (j === 2 || j === 5) return PAL.dark;
        if (j === 1 || j === 6) return k >= 5 ? PAL.shellSide : PAL.shell;
        return (k === 1 || k === 5) ? PAL.shellMid : PAL.shell;
      }, 0, (j) => j === 3 || j === 4);
    // cabos de energia do tanque até o tórax
    for (const s of [-1, 1]) ga.tube([[-2.4, s * 1.3, 7.0], [-0.8, s * 2.9, 6.0], [1.2, s * 3.3, 3.4]], 0.35, 3, PAL.cable, 0.35);
    const abd = body.add(new N3('abd', ga));
    abd.p = [-2.6, 0, 1.0]; abd.r = [0, ABD_P, 0];

    // ---- Tanque de energia roubada
    const gt = new G3();
    // cápsula: vidro em facetas alternadas (janela de energia / moldura) e tampas cônicas
    { const R = 1.6, hexR = (x, r) => { const o = []; for (let i = 0; i < 6; i++) { const a = i * PI / 3; o.push([x, Math.cos(a) * r, Math.sin(a) * r]); } return o; };
      const A = hexR(-2.5, R), B = hexR(2.5, R);
      for (let i = 0; i < 6; i++) { const j = (i + 1) % 6, win = i % 2 === 0; gt.quad(A[i], A[j], B[j], B[i], win ? PAL.core : PAL.cap, win ? 0.95 : 0); }
      gt.cyl(-3.6, 0, 0, 1.2, 1.95, 1.1, 6, PAL.cap, 0, { axis: 'x', caps: false });
      gt.cyl(2.5, 0, 0, 1.95, 1.2, 1.1, 6, PAL.cap, 0, { axis: 'x', caps: false });
      gt.poly(hexR(-3.6, 1.2), PAL.shellMid); gt.poly(hexR(3.6, 1.2), PAL.shellMid); }
    const tank = abd.add(new N3('tank', gt));
    tank.p = [-5.7, 0, 7.4];

    // ---- Cabeça: placa de sensores inclinada para cima
    const gh = new G3();
    gh.at(0.4, 0, 0.5, 0, -0.35, 0);
    gh.extrude([[-3.1, 0.2], [-2.1, 2.4], [2.1, 2.4], [3.1, 0.2], [2.0, -1.9], [-2.0, -1.9]], 2.4, PAL.shell, 0,
      { plane: 'yz', faceCol: PAL.under, edgeCol: PAL.shellMid });
    gh.cyl(1.1, 0, 0.3, 2.45, 2.25, 0.7, 6, PAL.cap, 0, { axis: 'x', caps: false });
    gh.cyl(1.2, 0, 0.3, 1.95, 1.55, 0.9, 6, PAL.eye, 1.15, { axis: 'x', caps: false });
    { const r = []; for (let i = 0; i < 6; i++) { const a = i * PI / 3; r.push([2.1, Math.cos(a) * 1.55, 0.3 + Math.sin(a) * 1.55]); } gh.poly(r, PAL.eyeCore, 1.05); }
    // sensores menores (pirâmides de 4 faces voltadas para a frente)
    for (const [y, z, r] of [[-2.3, 1.5, 0.85], [2.3, 1.5, 0.85], [-2.4, -0.9, 0.65], [2.4, -0.9, 0.65]]) gh.cyl(1.2, y, z, r, 0, 0.8, 4, PAL.eye, 1.1, { axis: 'x', caps: false, rot: PI / 4 });
    gh.at();
    const head = body.add(new N3('head', gh));
    head.p = [6.6, 0, 0.3];

    // ---- Quelíceras (presas prateadas)
    for (const s of [-1, 1]) {
      const gc = new G3();
      gc.at(0, 0, 0, 0, 0.55, 0);
      diamondSeg(gc, 2.6, 0.95, 1.1, 0.75, 0.85, PAL.legHi, PAL.dark);
      gc.at(2.5 * Math.cos(0.55), 0, -2.5 * Math.sin(0.55), 0, 1.15, -s * 0.5);
      spike(gc, 4.2, 0.75, 0.8, PAL.fang, '#d6dde8');
      gc.at();
      const ch = head.add(new N3(s < 0 ? 'chelL' : 'chelR', gc));
      ch.p = [1.5, s * 1.5, -1.8];
    }

    // ---- Patas: fêmur (losango) → tíbia (triangular) → tarso (ponta metálica)
    for (const lg of LEGS) {
      const gf = new G3();
      diamondSeg(gf, L1 + 0.4, 1.15, 1.5, 0.75, 1.0, PAL.legHi, PAL.legLo);
      // luz de articulação no joelho (dois triângulos cruzados: visível de qualquer ângulo)
      gf.tri([L1 - 0.5, 0, 0.7], [L1 + 0.4, 0, 0.7], [L1 - 0.05, 0, 1.4], PAL.eye, 0.4);
      gf.tri([L1 - 0.05, -0.45, 0.7], [L1 - 0.05, 0.45, 0.7], [L1 - 0.05, 0, 1.4], PAL.eye, 0.4);
      const fem = body.add(new N3('f' + lg.id, gf));
      fem.p = lg.hip.slice();
      const gti = new G3();
      triSeg(gti, L2 + 0.3, 0.85, 1.1, 0.55, 0.7, PAL.leg, PAL.legLo);
      const tib = fem.add(new N3('t' + lg.id, gti));
      tib.p = [L1, 0, 0];
      const gs = new G3();
      spike(gs, L3, 0.6, 0.7, PAL.tip, '#b9c3d2');
      const tar = tib.add(new N3('s' + lg.id, gs));
      tar.p = [L2, 0, 0];
    }

    const m = new Model3(root);
    m.anchor('eye', 'head', [2.4, 0, 1.2]);
    m.anchor('core', 'tank', [0, 0, 0]);
    return m;
  }

  // ------------------------------------------------------------ pose
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;
  const ss = (t) => t * t * (3 - 2 * t);
  const wrap = (a) => { while (a > PI) a -= TWO_PI; while (a < -PI) a += TWO_PI; return a; };

  // Parâmetros de pose (objetos reaproveitados, sem alocação por quadro)
  const mk = () => ({ bx: 0, bz: BZ, pitch: 0, roll: 0, yaw: 0, f0x: 0, f0y: 0, f0z: 0, f1x: 0, f1z: 0, f3x: 0, open: 0.1, fold: 0, abdP: 0, shake: 0, spread: 1 });
  const PA = mk(), PB = mk(), P = mk();
  function setRest(p) {
    p.bx = 0; p.bz = BZ; p.pitch = 0; p.roll = 0; p.yaw = 0; p.f0x = 0; p.f0y = 0; p.f0z = 0; p.f1x = 0; p.f1z = 0; p.f3x = 0;
    p.open = 0.1; p.fold = 0; p.abdP = 0; p.shake = 0; p.spread = 1;
    return p;
  }
  function setWindup(p, k) {
    setRest(p);
    p.bx = -1.8 * k; p.bz = BZ + 3.2 * k; p.pitch = -0.5 * k; p.abdP = 0.3 * k;
    p.f0x = 1.5 * k; p.f0y = 2.5 * k; p.f0z = 18 * k; p.f1x = 1.5 * k; p.f1z = 2.5 * k; p.f3x = -1.8 * k;
    p.open = 0.1 + 0.9 * k;
    return p;
  }
  function setStrike(p) {
    setRest(p);
    p.bx = 3.8; p.bz = BZ - 1.2; p.pitch = 0.2; p.abdP = -0.12;
    p.f0x = 9; p.f0y = -1; p.f0z = 0.5; p.f1x = 4; p.f1z = 0; p.f3x = 2.5;
    p.open = -0.35;
    return p;
  }
  function blend(o, a, b, t) { for (const key in o) o[key] = mix(a[key], b[key], t); return o; }

  // Níveis de emissão (usados pela pose e pelos halos)
  function flick(t, a, b) { return Math.sin(t * a) * Math.sin(t * b) > -0.25 ? 1 : 0.2; }
  function levels(e, out) {
    const st = num(e.stateTime), t = num(e.animTime);
    let eye = 1, tank = 1, glowR = 8;
    switch (e.state) {
      case 'spawn': { const k = cl(st / 0.75, 0, 1); eye = k < 0.35 ? 0 : (k < 0.8 ? flick(t, 37, 23) * k : 1); tank = 0.3 + 0.7 * k; break; }
      case 'windup': { const k = cl(num(e.tgProgress), 0, 1); eye = 1 + 0.9 * k; glowR = 8 + 6 * k; break; }
      case 'attack': eye = 1.8; glowR = 12; break;
      case 'recover': eye = mix(1.8, 1, cl(st / 0.42, 0, 1)); break;
      case 'stun': eye = 0.25 + 0.75 * flick(t, 41, 17); tank = 0.75; break;
      case 'dying': { const k = cl(st / 0.45, 0, 1); eye = (1 - k) * flick(t, 53, 29); tank = mix(1, 0.15, k); break; }
    }
    out.eye = eye; out.tank = tank; out.glowR = glowR;
    return out;
  }
  const LV = { eye: 1, tank: 1, glowR: 8 };

  // Leva um ponto do referencial do modelo para o do corpo (inverso de T·Rz·Ry·Rx)
  const TMP = [0, 0, 0];
  function toBody(x, y, z, bp, br) {
    x -= bp[0]; y -= bp[1]; z -= bp[2];
    let c = Math.cos(br[2]), s = Math.sin(br[2]);
    let x1 = c * x + s * y, y1 = -s * x + c * y, z1 = z;
    c = Math.cos(br[1]); s = Math.sin(br[1]);
    const x2 = c * x1 - s * z1, z2 = s * x1 + c * z1;
    c = Math.cos(br[0]); s = Math.sin(br[0]);
    TMP[0] = x2; TMP[1] = c * y1 + s * z2; TMP[2] = -s * y1 + c * z2;
    return TMP;
  }

  function pose(m, e) {
    if (!e) return;
    const n = m.nodes;
    const t = num(e.animTime), st = num(e.stateTime);
    const vx = num(e.vx), vy = num(e.vy), fc = num(e.facing);
    const spd = Math.hypot(vx, vy);
    const p = P;

    switch (e.state) {
      case 'windup': setWindup(p, ss(cl(num(e.tgProgress), 0, 1))); break;
      case 'attack': blend(p, setWindup(PA, 1), setStrike(PB), ss(cl(st / 0.12, 0, 1))); break;
      case 'recover': blend(p, setStrike(PA), setRest(PB), ss(cl(st / 0.42, 0, 1))); break;
      case 'stun': {
        // Atordoado: desaba com as patas abertas (esparramado), tremendo em curto
        const k = ss(cl(st / 0.12, 0, 1));
        setRest(p);
        p.bz = mix(7.4, 5.6, k); p.pitch = 0.16 * k; p.roll = 0.12 * k; p.spread = 1 + 0.2 * k; p.abdP = 0.1 * k;
        p.shake = 1; p.open = 0.5 + 0.4 * Math.sin(t * 31);
        break;
      }
      case 'dying': {
        // Morte: o corpo cai e tomba de lado; as patas se recolhem sobre o ventre
        const k = ss(cl(st / 0.4, 0, 1));
        setRest(p);
        p.bz = mix(BZ, 4.4, k); p.pitch = 0.18 * k; p.roll = 0.42 * k; p.fold = k; p.open = mix(0.1, 0.9, k); p.shake = 0.6 * (1 - k); p.abdP = -0.1 * k;
        break;
      }
      case 'spawn': {
        const k = ss(cl(st / 0.75, 0, 1));
        setRest(p);
        p.bz = mix(6.5, BZ, k); p.fold = 1 - k; p.open = 0.1;
        break;
      }
      default: setRest(p);
    }
    levels(e, LV);

    // Locomoção: velocidade no referencial local (frente = +X)
    const moving = spd > 20 && (e.state === 'idle' || e.state === 'retreat' || e.state === 'recover');
    const cf = Math.cos(fc), sf = Math.sin(fc);
    const lvx = cf * vx + sf * vy, lvy = -sf * vx + cf * vy;
    const ux = spd > 1e-3 ? lvx / spd : 0, uy = spd > 1e-3 ? lvy / spd : 0;
    const amt = moving ? cl(spd / 105, 0.35, 1.3) : 0;
    const gait = t * 16;
    const stride = 4.2 * amt, lift = 3.6 * Math.min(1, amt);

    // Corpo
    let bz = p.bz, pitch = p.pitch, roll = p.roll, bx = p.bx;
    if (moving) {
      bz += Math.sin(gait * 2) * 0.45 * amt;
      roll += Math.sin(gait) * 0.05 * amt;
      pitch += ux * 0.07 * amt;
    } else if (e.state === 'idle' || e.state === 'retreat' || !e.state) {
      bz += Math.sin(t * 3) * 0.35;                       // respiração
    }
    if (p.shake > 0) {
      bz += Math.sin(t * 57) * 0.3 * p.shake;
      roll += Math.sin(t * 43) * 0.05 * p.shake;
      pitch += Math.sin(t * 37) * 0.04 * p.shake;
    }
    if (e.state === 'windup') { roll += Math.sin(t * 45) * 0.025 * cl(num(e.tgProgress), 0, 1); }
    const b = n.body;
    b.p[0] = bx; b.p[1] = 0; b.p[2] = bz;
    b.r[0] = roll; b.r[1] = pitch; b.r[2] = p.yaw;

    // Abdômen: respira e balança
    const breathe = Math.sin(t * 3);
    n.abd.r[1] = ABD_P + p.abdP + (moving ? Math.sin(gait * 2 + 0.8) * 0.05 * amt : breathe * 0.02);
    n.abd.r[2] = moving ? Math.sin(gait) * 0.04 * amt : 0;
    n.abd.s[1] = 1 + breathe * 0.025; n.abd.s[2] = 1 + breathe * 0.035;

    // Quelíceras
    const op = cl(p.open, -0.6, 1.2);
    n.chelL.r[2] = -op * 0.55; n.chelR.r[2] = op * 0.55;
    n.chelL.r[1] = n.chelR.r[1] = -op * 0.3;

    // Emissão
    n.head.emi = cl(LV.eye, 0, 2.2);
    n.tank.emi = cl(LV.tank * (0.85 + 0.15 * Math.sin(t * 4.2)), 0, 2);

    // Patas (IK de dois ossos em cada pata, tarso com dobra fixa)
    const fold = cl(p.fold, 0, 1);
    // No ar (arremessado): as patas soltam do chão e se debatem
    const air = cl(num(e.z) / 14, 0, 1);
    const LN = m._legNodes || (m._legNodes = LEGS.map((lg) => [n['f' + lg.id], n['t' + lg.id], n['s' + lg.id]]));
    for (let q = 0; q < LEGS.length; q++) {
      const lg = LEGS[q];
      let fx = lg.foot[0] * p.spread, fy = lg.foot[1] * p.spread, fz = 0;
      if (lg.i === 0) { fx += p.f0x; fy += p.f0y * lg.k; fz += p.f0z; }
      else if (lg.i === 1) { fx += p.f1x; fz += p.f1z; }
      else if (lg.i === 3) { fx += p.f3x; }
      if (moving) {
        const ph = gait + (lg.group ? PI : 0) + lg.i * 0.15;
        const off = -Math.cos(ph) * stride;
        fx += ux * off; fy += uy * off;
        fz += Math.max(0, Math.sin(ph)) * lift;
      } else if (e.state === 'idle' && lg.i === 0) {
        // toque nervoso das patas dianteiras
        const tap = Math.pow(Math.max(0, Math.sin(t * 2.3 + lg.k * 1.9)), 10);
        fz += tap * 3; fx += tap * 1.5;
      }
      if (air > 0) { fz += air * (6 + Math.sin(t * 19 + q * 1.7) * 2); fx *= 1 - 0.15 * air; fy *= 1 - 0.15 * air; }
      const B = toBody(fx, fy, fz, b.p, b.r);
      const dx = B[0] - lg.hip[0], dy = B[1] - lg.hip[1], dz = B[2] - lg.hip[2];
      let psi = Math.atan2(dy, dx);
      const d = Math.hypot(dx, dy);
      const D = cl(Math.hypot(d, dz), Math.abs(L1 - CH) + 0.2, L1 + CH - 0.05);
      const phT = Math.atan2(dz, d);
      const ca = cl((L1 * L1 + D * D - CH * CH) / (2 * L1 * D), -1, 1);
      let a1 = phT + Math.acos(ca);
      const kx = L1 * Math.cos(a1), kz = L1 * Math.sin(a1);
      const thT = Math.atan2(D * Math.sin(phT) - kz, D * Math.cos(phT) - kx) + DEL;
      let bend = a1 - thT, g = G0;
      if (fold > 0) {
        const restPsi = Math.atan2(lg.hip[1] * 1.4, lg.hip[0] * 0.6 + (lg.i - 1.5) * -2.5);
        psi += wrap(restPsi - psi) * fold * 0.6;
        a1 = mix(a1, 1.1, fold); bend = mix(bend, 2.55, fold); g = mix(g, 1.45, fold);
      }
      if (p.shake > 0) {
        a1 += Math.sin(t * 47 + q * 1.3) * 0.1 * p.shake;
        bend += Math.sin(t * 53 + q * 2.1) * 0.12 * p.shake;
        psi += Math.sin(t * 39 + q) * 0.06 * p.shake;
      }
      const F = LN[q][0];
      F.r[0] = 0; F.r[1] = -a1; F.r[2] = psi;
      LN[q][1].r[1] = bend;
      LN[q][2].r[1] = g;
    }
  }

  function glows(e, add) {
    if (!e) return;
    levels(e, LV);
    // o sensor fica atrás do corpo quando a aranha está de costas para a câmera
    const vis = cl(0.5 + 0.7 * Math.cos(num(e.facing) - PI / 4), 0.15, 1);
    if (LV.eye > 0.02) add('eye', LV.glowR, '255,50,70', 0.7 * Math.min(1.4, LV.eye) * vis);
    if (LV.tank > 0.02) add('core', 6, '56,214,255', 0.5 * LV.tank);
  }

  // t (parâmetro do visualizador) avança o relógio da animação
  const mkE = (f, set, t) => {
    const x = new Crawler(0, 0, 1);
    x.facing = f; x.vx = 0; x.vy = 0; x.z = 0;
    set(x, f);
    x.animTime += num(t);
    return x;
  };

  MODELS3D.rastejador = {
    build, pose, glows,
    demos: [
      { label: 'spawn', e: (f, t) => mkE(f, (x) => { x.state = 'spawn'; x.stateTime = 0.45; x.animTime = 1.2; }, t) },
      { label: 'idle', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.stateTime = 1; x.animTime = 0.7; }, t) },
      { label: 'walk A', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.animTime = 0.3; x.vx = Math.cos(f) * 105; x.vy = Math.sin(f) * 105; }, t) },
      { label: 'walk B', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.animTime = 0.3 + PI / 16; x.vx = Math.cos(f) * 105; x.vy = Math.sin(f) * 105; }, t) },
      { label: 'retreat', e: (f, t) => mkE(f, (x) => { x.state = 'retreat'; x.stateTime = 0.2; x.animTime = 0.5; x.vx = -Math.cos(f) * 90; x.vy = -Math.sin(f) * 90; }, t) },
      { label: 'windup 0.5', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.tgProgress = 0.5; x.stateTime = 0.2; x.animTime = 2; }, t) },
      { label: 'windup 1', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.tgProgress = 1; x.stateTime = 0.4; x.animTime = 2.2; }, t) },
      { label: 'attack', e: (f, t) => mkE(f, (x) => { x.state = 'attack'; x.stateTime = 0.07; x.animTime = 2.3; }, t) },
      { label: 'recover', e: (f, t) => mkE(f, (x) => { x.state = 'recover'; x.stateTime = 0.15; x.animTime = 2.5; }, t) },
      { label: 'stun', e: (f, t) => mkE(f, (x) => { x.state = 'stun'; x.stateTime = 0.2; x.animTime = 3.1; x.stun = 0.4; }, t) },
      { label: 'stun no ar', e: (f, t) => mkE(f, (x) => { x.state = 'stun'; x.stateTime = 0.1; x.animTime = 3.4; x.stun = 0.5; x.z = 14; }, t) },
      { label: 'dying', e: (f, t) => mkE(f, (x) => { x.state = 'dying'; x.stateTime = 0.25; x.animTime = 4; }, t) },
    ],
  };
})();
