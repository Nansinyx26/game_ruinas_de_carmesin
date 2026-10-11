// ---------------------------------------------------------------------------
// CAÇADOR DA LEGIÃO DE FERRO — unidade sintética rápida (modelo 3D low-poly)
// Corpo esguio e anguloso de predador em armadura leve preta, juntas expostas,
// cabeça pequena alongada com visor laranja em fenda, dois braços-lâmina longos
// (lâminas curvas prateadas com fio laranja), pernas digitígradas (jarrete
// invertido) e um cabo energizado que sai da nuca e esvoaça como uma cauda.
// Referencial: +X frente, +Y direita, +Z cima; origem nos pés.
// Pernas por IK de dois ossos no plano da perna (metatarso com ângulo dado);
// cabo em cadeia de segmentos posados em ângulos de mundo (com colisão no chão).
// ---------------------------------------------------------------------------
(function () {
  const PI = Math.PI;
  const PAL = {
    body: '#1c2027', hi: '#3d4451', mid: '#272c35', dark: '#0c0e12', joint: '#14171d',
    blade: '#c9d1dd', bladeDk: '#7d8797', edge: '#ff8a2a', visor: '#ff8a2a', cable: '#ff7a22', metal: '#555e6c',
  };
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
  const ss = (k) => { k = cl(k, 0, 1); return k * k * (3 - 2 * k); };

  // ------------------------------------------------------------ dimensões
  const LT = 6.6, LS = 7.6, LM = 7.0, BH = 1.3;   // coxa, canela, metatarso; altura do "punho" do pé
  const PZ = 19.6, PX = -0.8;                      // pélvis em repouso
  const HIPY = 3.3, HIPZ = -0.9;                 // quadris (referencial da pélvis)
  const TZ = 1.4;                                // pivô da cintura acima da pélvis
  const SHX = 0.1, SHY = 5.6, SHZ = 11.3;        // ombros (referencial do tronco)
  const UA = 5.6, FA = 5.8;                      // braço, antebraço
  const NECK = [2.3, 0, 13.5];                   // pivô da cabeça (tronco)
  const CAB = [-2.9, 0, 11.6];                   // saída do cabo na nuca (tronco)
  const CL = 4.4, NC = 4;
  const HS = 1.05;                               // escala da cabeça
  // Seções da cabeça: [x, meia-largura, z da crista, z do ombro, z da base]; ponta do focinho
  const HSEC = [[-2.6, 0.95, 2.2, 1.45, -0.25], [-0.9, 1.45, 2.75, 1.65, -0.7], [1.4, 1.25, 2.25, 1.25, -0.8], [3.4, 0.75, 1.25, 0.7, -0.55]];
  const HTIP = [5.3, 0, 0.15];                        // segmentos do cabo
  // Lâmina (referencial do antebraço): eixo central curvo, de z = -4.4 até a ponta
  const BL0 = -4.4, BLL = 13.0, BCURV = 3.6, BW = 2.6, NB = 4;
  const bladeC = (u) => [0.25 - BCURV * u * u, BL0 - BLL * u];

  // ------------------------------------------------------------ geometria
  // Hexaedro por 4 cantos de baixo e 4 de cima (ordem: −x−y, +x−y, +x+y, −x+y).
  // o.side[i]: cor da face lateral i (0 = −Y, 1 = +X, 2 = +Y, 3 = −X)
  function hexa(g, b, t, col, e = 0, o = {}) {
    if (!o.nb) g.quad(b[0], b[3], b[2], b[1], o.bot || col, e);
    if (!o.nt) g.quad(t[0], t[1], t[2], t[3], o.top || col, o.topE !== undefined ? o.topE : e);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      g.quad(b[i], b[j], t[j], t[i], (o.side && o.side[i]) || col, o.sideE && o.sideE[i] !== undefined ? o.sideE[i] : e);
    }
  }
  // Hexaedro por faixas: z0/z1 e retângulos [x0, x1, hy0 (largura em x0), hy1 (largura em x1)]
  function slab(g, z0, r0, z1, r1, col, e = 0, o = {}, y0 = 0) {
    const b = [[r0[0], y0 - r0[2], z0], [r0[1], y0 - r0[3], z0], [r0[1], y0 + r0[3], z0], [r0[0], y0 + r0[2], z0]];
    const t = [[r1[0], y0 - r1[2], z1], [r1[1], y0 - r1[3], z1], [r1[1], y0 + r1[3], z1], [r1[0], y0 + r1[2], z1]];
    hexa(g, b, t, col, e, o);
  }
  const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

  // Lâmina curva: seção em losango (dorso → crista → fio), crista→fio emissivo
  function blade(g) {
    const st = [];
    for (let k = 0; k <= NB; k++) {
      const u = k / NB, c = bladeC(u);
      const tx = -2 * BCURV * u, tz = -BLL, tl = Math.hypot(tx, tz);
      const nx = -tz / tl, nz = tx / tl;                 // normal no plano xz, lado convexo (+X)
      const w = k === NB ? 0 : BW * Math.pow(1 - u, 0.7) + 0.15 * (1 - u);
      const th = k === NB ? 0 : 0.5 * (1 - 0.6 * u);
      const at = (v) => [c[0] + nx * w * v, 0, c[1] + nz * w * v];
      const S = at(-0.45), E = at(0.55), R = at(0.41);
      st.push({ S, E, P: [R[0], th, R[2]], M: [R[0], -th, R[2]] });
    }
    for (let k = 0; k < NB; k++) {
      const a = st[k], b = st[k + 1];
      g.quad(a.S, a.P, b.P, b.S, PAL.blade, 0);
      g.quad(a.P, a.E, b.E, b.P, PAL.edge, 0.55);
      g.quad(a.E, a.M, b.M, b.E, PAL.edge, 0.55);
      g.quad(a.M, a.S, b.S, b.M, PAL.blade, 0);
    }
    const a = st[0];
    g.quad(a.S, a.P, a.E, a.M, PAL.dark, 0);
  }

  function build() {
    const root = new N3('root');
    const base = root.add(new N3('base'));

    // Pélvis
    const gp = new G3();
    slab(gp, -2.0, [-1.6, 1.3, 2.3, 2.1], 1.7, [-2.2, 1.9, 3.3, 3.0], PAL.body, 0, { top: PAL.mid });
    const pelvis = base.add(new N3('pelvis', gp));
    pelvis.p = [PX, 0, PZ];

    // Tronco: cintura mecânica exposta + peito em quilha (duas metades) com dorso corcunda
    const gt = new G3();
    slab(gt, -0.6, [-1.3, 1.1, 1.4, 1.4], 5.2, [-1.6, 1.4, 1.6, 1.6], PAL.joint);
    for (const s of [-1, 1]) {
      const y = (v) => v * s;
      const b = [[-1.6, 0, 4.4], [2.6, 0, 4.4], [1.5, y(2.1), 4.4], [-1.3, y(2.1), 4.4]];
      const t = [[-3.3, 0, 12.9], [3.3, 0, 12.6], [2.0, y(5.0), 11.6], [-2.7, y(5.0), 11.8]];
      if (s < 0) { b.reverse(); t.reverse(); }
      hexa(gt, b, t, PAL.body, 0, { top: PAL.mid });
    }
    // Omoplatas em espinho (silhueta de predador)
    for (const s of [-1, 1]) {
      gt.at(0, s * 2.3, 0, s * -0.25, 0, 0);
      gt.extrude([[-1.4, 7.8], [-5.8, 13.2], [-2.5, 11.6]], 0.7, PAL.hi, 0, { plane: 'xz' });
    }
    gt.at();
    // Pescoço
    slab(gt, 11.0, [-0.4, 1.8, 1.15, 1.15], NECK[2] + 0.2, [1.4, 3.0, 0.9, 0.9], PAL.joint, 0, { nb: true });
    const torso = pelvis.add(new N3('torso', gt));
    torso.p = [0, 0, TZ];

    // Detalhes emissivos do tronco (fendas no peito e soquete do cabo)
    const gf = new G3();
    for (const s of [-1, 1]) {
      gf.quad([2.72, s * 1.0, 10.9], [2.42, s * 2.9, 10.4], [2.42, s * 2.9, 9.8], [2.72, s * 1.0, 10.3], PAL.edge, 0.7);
    }
    gf.quad([-3.05, -0.9, 11.0], [-3.05, 0.9, 11.0], [-3.25, 0.9, 12.4], [-3.25, -0.9, 12.4], PAL.cable, 0.6);
    torso.add(new N3('torsoFx', gf));

    // Cabeça alongada: seções pentagonais (crista no topo) afinando até o focinho,
    // visor em fenda nas laterais convergindo na frente, barbatana para trás
    const gh = new G3();
    gh.at(0, 0, 0, 0, 0, 0, HS, HS, HS);
    const ring = (q) => [[q[0], 0, q[2]], [q[0], -q[1], q[3]], [q[0], -q[1] * 0.72, q[4]], [q[0], q[1] * 0.72, q[4]], [q[0], q[1], q[3]]];
    const HR = HSEC.map(ring);
    const hcol = [PAL.hi, PAL.body, PAL.dark, PAL.body, PAL.hi];
    for (let k = 0; k < HR.length - 1; k++) {
      for (let j = 0; j < 5; j++) { const j1 = (j + 1) % 5; gh.quad(HR[k][j], HR[k][j1], HR[k + 1][j1], HR[k + 1][j], hcol[j]); }
    }
    const hl = HR[HR.length - 1];
    for (let j = 0; j < 5; j++) gh.tri(hl[j], hl[(j + 1) % 5], HTIP, hcol[j]);
    gh.poly(HR[0], PAL.dark);
    // ponto na face lateral (s = ±1) em x, v = 0 (ombro) … 1 (base)
    const sidePt = (x, s, v) => {
      let a, b, k = 0;
      while (k < HSEC.length - 1 && x > HSEC[k + 1][0]) k++;
      if (k < HSEC.length - 1) {
        const q0 = HSEC[k], q1 = HSEC[k + 1], t = (x - q0[0]) / (q1[0] - q0[0]);
        const w = q0[1] + (q1[1] - q0[1]) * t, zu = q0[3] + (q1[3] - q0[3]) * t, zb = q0[4] + (q1[4] - q0[4]) * t;
        a = [x, s * w, zu]; b = [x, s * w * 0.72, zb];
      } else {
        const q0 = HSEC[k], t = cl((x - q0[0]) / (HTIP[0] - q0[0]), 0, 1);
        a = [x, s * q0[1] * (1 - t), q0[3] + (HTIP[2] - q0[3]) * t]; b = [x, s * q0[1] * 0.72 * (1 - t), q0[4] + (HTIP[2] - q0[4]) * t];
      }
      const p = lerp3(a, b, v);
      p[1] += s * 0.07;
      return p;
    };
    for (const s of [-1, 1]) {
      const xs = [0.9, 1.4, 3.4, 4.6];
      for (let i = 0; i < xs.length - 1; i++) {
        const x0 = xs[i], x1 = xs[i + 1];
        gh.quad(sidePt(x0, s, 0.3), sidePt(x1, s, 0.3), sidePt(x1, s, 0.47), sidePt(x0, s, 0.47), PAL.visor, 1.1);
      }
    }
    gh.extrude([[-0.4, 2.55], [-5.6, 3.6], [-2.8, 1.5]], 0.5, PAL.hi, 0, { plane: 'xz' });
    gh.at();
    const head = torso.add(new N3('head', gh));
    head.p = NECK.slice();

    // Braços-lâmina
    for (const s of [-1, 1]) {
      const id = s < 0 ? 'L' : 'R';
      const ga = new G3();
      // Ombreira angulosa (ponta para fora e para trás)
      hexa(ga, [[-2.2, -1.75, -1.8], [2.2, -1.75, -1.8], [2.2, 1.75, -1.8], [-2.2, 1.75, -1.8]].map((p) => [p[0], p[1] + s * 0.35, p[2]]),
        [[-2.9, -0.7, 1.5], [0.6, -0.7, 1.5], [0.6, 0.7, 1.5], [-2.9, 0.7, 1.5]].map((p) => [p[0], p[1] + s * 1.5, p[2]]), PAL.body, 0, { top: PAL.hi });
      // Braço (junta exposta)
      slab(ga, -UA - 0.3, [-0.85, 0.85, 0.85, 0.85], -1.0, [-1.05, 1.05, 1.05, 1.05], PAL.joint);
      const arm = torso.add(new N3('arm' + id, ga));
      arm.p = [SHX, s * SHY, SHZ];
      const gfa = new G3();
      // Manopla: alarga em direção ao punho, face externa em destaque
      const side = s < 0 ? [PAL.hi, null, null, null] : [null, null, PAL.hi, null];
      slab(gfa, -5.4, [-1.65, 1.45, 1.4, 1.4], 0.7, [-1.05, 1.05, 1.05, 1.05], PAL.body, 0, { side, bot: PAL.dark });
      blade(gfa);
      const fore = arm.add(new N3('fore' + id, gfa));
      fore.p = [0, 0, -UA];
    }

    // Pernas digitígradas
    for (const s of [-1, 1]) {
      const id = s < 0 ? 'L' : 'R';
      const hip = base.add(new N3('hip' + id));
      const gth = new G3();
      slab(gth, -LT - 0.4, [-0.9, 1.5, 1.0, 1.0], 1.4, [-2.2, 2.1, 1.8, 1.7], PAL.body, 0, { top: PAL.hi, side: [null, PAL.hi, null, null] });
      const thigh = hip.add(new N3('thigh' + id, gth));
      const gsh = new G3();
      slab(gsh, -LS, [-0.75, 0.8, 0.75, 0.75], 0.9, [-1.25, 1.25, 1.05, 1.05], PAL.mid, 0, { side: [null, PAL.hi, null, null] });
      const shin = thigh.add(new N3('shin' + id, gsh));
      shin.p = [0, 0, -LT];
      const gm = new G3();
      slab(gm, -LM, [-0.6, 0.6, 0.65, 0.65], 0.8, [-1.15, 1.0, 0.9, 0.9], PAL.body, 0, { side: [null, PAL.hi, null, null] });
      gm.extrude([[-0.5, 1.3], [-3.4, 2.4], [-0.6, -1.8]], 0.7, PAL.hi, 0, { plane: 'xz' });
      const meta = shin.add(new N3('meta' + id, gm));
      meta.p = [0, 0, -LS];
      const gft = new G3();
      slab(gft, -BH, [-1.4, 3.9, 1.35, 0.45], 0.35, [-0.9, 1.5, 1.0, 0.65], PAL.body, 0, { top: PAL.mid, side: [null, PAL.hi, null, null] });
      const foot = meta.add(new N3('foot' + id, gft));
      foot.p = [0, 0, -LM];
    }

    // Cabo energizado (cadeia de segmentos apontando para −X)
    let par = torso;
    for (let i = 0; i < NC; i++) {
      const gc = new G3();
      const r = 0.62 - i * 0.05;
      gc.tube([[0.35, 0, 0], [-CL - 0.35, 0, 0]], r, 4, PAL.cable, 0.5);
      if (i === 0) gc.cyl(0.7, 0, 0, 1.2, 1.0, -1.7, 4, PAL.metal, 0, { axis: 'x', rot: PI / 4 });
      if (i === NC - 1) gc.cyl(-CL + 0.2, 0, 0, r * 1.25, 0, -2.0, 4, PAL.cable, 0.8, { axis: 'x' });
      const c = par.add(new N3('cab' + i, gc));
      c.p = i === 0 ? CAB.slice() : [-CL, 0, 0];
      par = c;
    }

    const m = new Model3(root);
    const tip = bladeC(1);
    m.anchor('visor', 'head', [3.6 * HS, 0, 0.45 * HS]);
    m.anchor('bladeL', 'foreL', [tip[0], 0, tip[1]]);
    m.anchor('bladeR', 'foreR', [tip[0], 0, tip[1]]);
    m.anchor('cable', 'cab2', [-CL * 0.5, 0, 0]);
    return m;
  }

  // ------------------------------------------------------------ pose
  // Parâmetros de pose (ângulos de "mundo" no referencial do modelo):
  // b: giro do quadril/pernas; px/pz/pp/pr: pélvis; tp/tr/ty: tronco; hp/hr: cabeça;
  // ua*/fa*: inclinação de braço/antebraço (0 = pendurado, −π/2 = à frente, π = para cima);
  // ro*: abertura do braço; fy*: antebraço para dentro; pés: x, y, z (punho), a (metatarso), p (dedos);
  // cabo: ce (elevação inicial), cs (curva por segmento), cf/cw (ondulação), cy (desvio lateral), cj (tremor);
  // emissão: ev (visor), eb (fio das lâminas), ec (cabo), ef (detalhes)
  const KEYS = ['b', 'px', 'py', 'pz', 'pp', 'pr', 'tp', 'tr', 'ty', 'hp', 'hr', 'hy',
    'uaL', 'faL', 'roL', 'fyL', 'uaR', 'faR', 'roR', 'fyR',
    'lx', 'ly', 'lz', 'la', 'lp', 'rx', 'ry', 'rz', 'ra', 'rp',
    'ce', 'cs', 'cf', 'cw', 'cy', 'cj', 'ev', 'eb', 'ec', 'ef'];
  const mkP = () => { const o = {}; for (const k of KEYS) o[k] = 0; return o; };
  const P = mkP(), PA = mkP(), PB = mkP();
  function mixP(out, a, b, k) { for (let i = 0; i < KEYS.length; i++) { const q = KEYS[i]; out[q] = a[q] + (b[q] - a[q]) * k; } }

  // Guarda baixa (parado): lâminas à frente e para baixo, pés escalonados
  function guard(Q, at) {
    const br = Math.sin(at * 2.6);
    Q.b = 0; Q.px = PX; Q.py = 0; Q.pz = PZ - 0.35 + 0.35 * br; Q.pp = 0.12; Q.pr = 0;
    Q.tp = 0.32 + 0.03 * br; Q.tr = 0; Q.ty = 0.04 * Math.sin(at * 0.9);
    Q.hp = -0.05; Q.hr = 0.06 * Math.sin(at * 0.7); Q.hy = 0.12 * Math.sin(at * 0.55);
    Q.uaL = -0.4 + 0.04 * br; Q.faL = -1.5 + 0.05 * br; Q.roL = 0.55; Q.fyL = -0.38;
    Q.uaR = -0.3 + 0.04 * br; Q.faR = -1.38 + 0.05 * br; Q.roR = 0.6; Q.fyR = -0.3;
    Q.lx = 2.6; Q.ly = -4.4; Q.lz = BH; Q.la = 0.38; Q.lp = 0;
    Q.rx = -1.6; Q.ry = 4.6; Q.rz = BH; Q.ra = 0.42; Q.rp = 0;
    Q.ce = -0.34; Q.cs = -0.15; Q.cf = 0.13; Q.cw = 3.2; Q.cy = 0.3 * Math.sin(at * 0.8); Q.cj = 0;
    Q.ev = 1; Q.eb = 0.85; Q.ec = 1; Q.ef = 1;
  }

  // Corrida rápida (orbita o alvo): quadril gira para o movimento, tronco segue o alvo
  function run(Q, e, at, lvx, lvy, sp) {
    guard(Q, at);
    const rel = Math.atan2(lvy, lvx);
    let fold = rel;
    if (fold > PI / 2) fold -= PI; else if (fold < -PI / 2) fold += PI;
    const b = cl(fold, -0.7, 0.7);
    const cb = Math.cos(-b), sb = Math.sin(-b);
    const dx = (lvx * cb - lvy * sb) / sp, dy = (lvx * sb + lvy * cb) / sp;
    const u = at * 18;
    const S = 5.2 * cl(sp / 165, 0.5, 1.25), H = 3.4;
    const fwd = lvx / sp, lat = lvy / sp;
    Q.b = b; Q.ty = -b * 0.85; Q.hy = -b * 0.15;
    Q.pz = PZ - 0.9 + 0.6 * Math.cos(2 * u);
    Q.px = PX + 0.4 * fwd;
    Q.pp = 0.18 + 0.12 * fwd; Q.tp = 0.36 + 0.1 * Math.max(0, fwd) + 0.03 * Math.cos(2 * u);
    Q.tr = -0.16 * lat; Q.pr = 0.05 * Math.sin(u);
    Q.hp = -0.12;
    for (let i = 0; i < 2; i++) {
      const uu = u + i * PI, c = Math.cos(uu), lift = Math.max(0, -Math.sin(uu));
      const fx = 0.6 + dx * S * c, fy = (i ? 4.1 : -4.1) + dy * S * c * 0.9;
      if (i === 0) { Q.lx = fx; Q.ly = fy; Q.lz = BH + lift * H; Q.la = 0.38 + 0.75 * lift; Q.lp = 0.7 * lift; }
      else { Q.rx = fx; Q.ry = fy; Q.rz = BH + lift * H; Q.ra = 0.38 + 0.75 * lift; Q.rp = 0.7 * lift; }
    }
    const pump = Math.sin(u) * 0.22;
    Q.uaL = -0.5 + pump; Q.faL = -1.5 + pump * 0.5;
    Q.uaR = -0.5 - pump; Q.faR = -1.5 - pump * 0.5;
    Q.roL = Q.roR = 0.5; Q.fyL = Q.fyR = -0.3;
    Q.ce = -0.12 - 0.15 * (1 - cl(sp / 165, 0, 1)); Q.cs = -0.05; Q.cf = 0.22; Q.cw = 13;
    Q.cy = cl(Math.atan2(lvy, lvx + 70), -1.2, 1.2);
  }

  // Preparação da investida: agacha, lâminas erguidas para trás, tremor, cabo eriçado
  function windup(Q, at, k) {
    guard(Q, at);
    const ek = ss(Math.min(1, k * 1.7)), ck = ss(k);
    const jit = Math.sin(at * 71) * Math.sin(at * 23.7) * k;
    const jit2 = Math.sin(at * 57 + 1.3) * Math.sin(at * 31.1) * k;
    Q.pz = PZ - 0.2 - 5.2 * ck + 0.35 * jit; Q.px = PX - 1.1 * ck + 0.3 * jit2; Q.py = 0.35 * jit;
    Q.pp = 0.12 + 0.2 * ck; Q.tp = 0.32 + 0.42 * ck + 0.04 * jit; Q.tr = 0.03 * jit2;
    Q.hp = -0.05 - 0.4 * ck; Q.hy = 0; Q.hr = 0.05 * jit;
    const to = (v, w) => v + (w - v) * ek;
    Q.uaL = to(Q.uaL, 1.35) + 0.06 * jit; Q.faL = to(Q.faL, -4.05) + 0.07 * jit2;
    Q.uaR = to(Q.uaR, 1.25) - 0.06 * jit2; Q.faR = to(Q.faR, -4.1) - 0.07 * jit;
    Q.roL = to(Q.roL, 0.62); Q.roR = to(Q.roR, 0.62); Q.fyL = to(Q.fyL, -0.35); Q.fyR = to(Q.fyR, -0.35);
    Q.lx = 2.6 + 1.0 * ck; Q.ly = -4.4 - 1.0 * ck; Q.la = 0.38 + 0.25 * ck;
    Q.rx = -1.6 - 1.6 * ck; Q.ry = 4.6 + 0.8 * ck; Q.ra = 0.42 + 0.3 * ck; Q.rp = 0.25 * ck;
    Q.ce = -0.34 + 0.72 * ck; Q.cs = -0.15 - 0.04 * ck; Q.cf = 0.13 - 0.05 * ck; Q.cw = 9; Q.cy = 0.5 * ck * (Math.sin(at * 1.7) > 0 ? 1 : -1); Q.cj = 0.28 * k;
    Q.ev = 1 + 0.5 * k; Q.eb = 1 + 1.1 * k; Q.ec = 1 + 0.8 * k; Q.ef = 1 + 0.5 * k;
  }

  // Investida: corpo quase horizontal, lâminas à frente, cabo esticado para trás
  function dash(Q, at, st) {
    const g = Math.sin(st * 40);
    Q.b = 0; Q.px = PX + 1.6; Q.py = 0; Q.pz = 14.2 + 0.4 * g; Q.pp = 0.55; Q.pr = 0;
    Q.tp = 0.78; Q.tr = 0; Q.ty = 0;
    Q.hp = -0.25; Q.hr = 0; Q.hy = 0;
    Q.uaL = -1.42; Q.faL = -1.62; Q.roL = 0.12; Q.fyL = 0.2;
    Q.uaR = -1.38; Q.faR = -1.58; Q.roR = 0.12; Q.fyR = 0.2;
    Q.lx = -8.6 + 0.6 * g; Q.ly = -3.4; Q.lz = 3.0; Q.la = -0.55; Q.lp = 1.0;
    Q.rx = 4.0 - 0.6 * g; Q.ry = 3.4; Q.rz = 7.0; Q.ra = 1.15; Q.rp = 0.6;
    Q.ce = 0.1; Q.cs = 0.0; Q.cf = 0.07; Q.cw = 28; Q.cy = 0; Q.cj = 0;
    Q.ev = 1.5; Q.eb = 2.2; Q.ec = 1.8; Q.ef = 1.5;
  }

  // Fim da investida: derrapagem baixa, lâminas varridas para baixo e para fora
  function follow(Q, at) {
    guard(Q, at);
    Q.px = PX + 0.8; Q.pz = 13.6; Q.pp = 0.36; Q.tp = 0.52; Q.hp = -0.1;
    Q.uaL = -0.25; Q.faL = -0.9; Q.roL = 0.95; Q.fyL = -0.25;
    Q.uaR = -0.2; Q.faR = -0.85; Q.roR = 0.9; Q.fyR = -0.25;
    Q.lx = 5.2; Q.ly = -5.0; Q.la = 0.12; Q.lp = -0.15;
    Q.rx = -5.6; Q.ry = 4.8; Q.rz = BH; Q.ra = 0.75; Q.rp = 0.45;
    Q.ce = 0.35; Q.cs = -0.12; Q.cf = 0.18; Q.cw = 10;
    Q.ev = 1.3; Q.eb = 1.6; Q.ec = 1.4;
  }

  function choose(e) {
    const st = Math.max(0, num(e.stateTime)), at = num(e.animTime);
    const f = num(e.facing), vx = num(e.vx), vy = num(e.vy);
    const sp = Math.hypot(vx, vy);
    const lvx = vx * Math.cos(f) + vy * Math.sin(f), lvy = -vx * Math.sin(f) + vy * Math.cos(f);
    switch (e.state) {
      case 'windup': windup(P, at, cl(num(e.tgProgress), 0, 1)); break;
      case 'dash': {
        windup(PA, at, 1); dash(PB, at, st);
        mixP(P, PA, PB, ss(st / 0.07));
        break;
      }
      case 'recover': {
        follow(PA, at); guard(PB, at);
        mixP(P, PA, PB, ss(st / 0.6));
        const k = cl(st / 0.6, 0, 1);
        P.ce = 0.35 - 0.9 * ss(k) + 0.25 * Math.sin(st * 12) * (1 - k);
        break;
      }
      case 'evade': {
        guard(P, at);
        const tk = st < 0.34 ? Math.sin(cl(st / 0.32, 0, 1) * PI) : 0;
        P.pz = PZ - 1.0; P.pp = 0.05 - 0.2 * tk; P.tp = 0.25 - 0.15 * tk; P.hp = 0.05 + 0.15 * tk;
        P.uaL = -0.45 - 0.35 * tk; P.faL = -1.15 - 0.35 * tk; P.roL = 0.35 + 0.4 * tk; P.fyL = -0.1 * tk;
        P.uaR = -0.4 - 0.3 * tk; P.faR = -1.1 - 0.3 * tk; P.roR = 0.35 + 0.45 * tk; P.fyR = -0.1 * tk;
        P.lx = 2.0 + 1.6 * tk; P.ly = -4.4; P.lz = BH + 6.0 * tk; P.la = 0.4 + 0.75 * tk; P.lp = 0.8 * tk;
        P.rx = -1.0 + 3.6 * tk; P.ry = 4.4; P.rz = BH + 5.0 * tk; P.ra = 0.4 + 0.75 * tk; P.rp = 0.8 * tk;
        const back = cl(-lvx / 300, 0, 1);
        P.ce = -0.25 + 0.55 * back * tk; P.cs = -0.14; P.cf = 0.2; P.cw = 12;
        P.cy = cl(Math.atan2(lvy, Math.max(lvx + 70, 40)), -1.0, 1.0);
        P.ev = 1.2; P.eb = 1.2;
        break;
      }
      case 'stun': {
        guard(P, at);
        const fl = 0.55 + 0.45 * Math.sin(at * 37) * Math.sin(at * 11.3);
        const tw = Math.pow(Math.max(0, Math.sin(at * 7.3)), 12);
        P.pz = PZ - 2.6; P.pp = 0.25; P.tp = 0.62 - 0.3 * tw; P.tr = 0.2 * Math.sin(at * 1.9) + 0.12 * tw;
        P.hp = 0.75 - 0.6 * tw; P.hr = 0.35 * Math.sin(at * 1.3); P.hy = 0.25 * tw;
        P.uaL = 0.1; P.faL = -0.8 - 0.5 * tw; P.roL = 0.3; P.fyL = 0.05;
        P.uaR = 0.18; P.faR = -0.7 + 0.2 * tw; P.roR = 0.36; P.fyR = 0.0;
        P.lx = 1.8; P.ly = -5.0; P.la = 0.5; P.rx = -1.8; P.ry = 5.0; P.ra = 0.55;
        P.ce = -0.95 + 0.4 * tw; P.cs = -0.15; P.cf = 0.05; P.cw = 4; P.cy = 0.4 * Math.sin(at * 0.9); P.cj = 0.1 * tw;
        P.ev = 0.9 * fl; P.eb = 0.4 + 0.5 * tw; P.ec = 0.45 + 0.35 * fl; P.ef = fl;
        break;
      }
      case 'spawn': {
        const k = cl(st / 0.75, 0, 1);
        guard(PB, at);
        Object.assign(PA, PB);
        PA.pz = 11.6; PA.pp = 0.45; PA.tp = 0.85; PA.hp = 0.9;
        PA.uaL = -0.35; PA.faL = -2.75; PA.roL = 0.1; PA.fyL = 0.45;
        PA.uaR = -0.3; PA.faR = -2.7; PA.roR = 0.1; PA.fyR = 0.45;
        PA.lx = 1.4; PA.ly = -4.2; PA.la = 0.95; PA.rx = 0.2; PA.ry = 4.2; PA.ra = 0.95;
        PA.ce = -1.2; PA.cs = -0.2; PA.cf = 0.03;
        mixP(P, PA, PB, ss((k - 0.2) / 0.75));
        const on = ss((k - 0.35) / 0.45);
        const fl = k < 0.8 ? (Math.sin(at * 53) > -0.2 ? 1 : 0.25) : 1;
        P.ev = on * fl; P.eb = 0.25 + 0.75 * on; P.ec = 0.25 + 0.75 * on; P.ef = on;
        break;
      }
      case 'dying': {
        // Desaba para trás (empurrado pelo golpe): pernas cedem, lâminas se erguem soltas
        const k = cl(st / 0.45, 0, 1), d = ss(k);
        guard(P, at);
        P.pz = PZ - 10.0 * d; P.px = PX - 1.2 * d; P.pp = 0.12 - 0.55 * d; P.pr = 0.18 * d;
        P.tp = 0.32 - 0.75 * d; P.tr = 0.3 * d; P.hp = -0.05 - 0.7 * d; P.hr = 0.5 * d; P.hy = 0.4 * d;
        const to = (v, w) => v + (w - v) * d;
        P.uaL = to(P.uaL, -1.25); P.faL = to(P.faL, -2.0); P.roL = to(P.roL, 0.95); P.fyL = to(P.fyL, -0.3);
        P.uaR = to(P.uaR, -0.85); P.faR = to(P.faR, -1.6); P.roR = to(P.roR, 1.1); P.fyR = to(P.fyR, -0.2);
        P.lx = 2.6 + 3.0 * d; P.ly = -4.4 - 1.8 * d; P.la = 0.38 + 0.8 * d; P.lp = -0.2 * d;
        P.rx = -1.6 + 4.6 * d; P.ry = 4.6 + 1.8 * d; P.ra = 0.42 + 0.8 * d; P.rp = -0.2 * d;
        P.ce = -0.34 - 0.6 * d; P.cf = 0.13 * (1 - k);
        const fl = Math.sin(at * 61) > 0 ? 1 : 0.3;
        P.ev = (1 - k) * fl; P.eb = 1 - 0.9 * k; P.ec = 1 - 0.85 * k; P.ef = 1 - k;
        break;
      }
      default: {
        // idle (e estados inesperados): guarda, ou corrida quando em movimento
        const rk = cl((sp - 25) / 45, 0, 1);
        if (rk <= 0) guard(P, at);
        else { guard(PA, at); run(PB, e, at, lvx, lvy, Math.max(sp, 1)); mixP(P, PA, PB, rk); }
      }
    }
    return P;
  }

  // IK da perna digitígrada: quadril (hx, hy, hz) → punho do pé (fx, fy, fz)
  // a: ângulo do metatarso (0 = vertical, > 0 = punho à frente do jarrete), fp: dedos
  function leg(n, id, hx, hy, hz, fx, fy, fz, a, fp) {
    const hip = n['hip' + id], th = n['thigh' + id], sh = n['shin' + id], me = n['meta' + id], ft = n['foot' + id];
    fz = Math.max(fz, BH * 0.6);
    const dy = fy - hy, dz = fz - hz;
    const phi = Math.atan2(dy, -dz), V = Math.hypot(dy, dz);
    const bu = fx - hx, bw = -V;
    let tu = bu - LM * Math.sin(a), tw = bw + LM * Math.cos(a);
    let d = Math.hypot(tu, tw) || 0.001;
    const dmax = LT + LS - 0.05, dmin = Math.abs(LT - LS) + 0.3;
    if (d > dmax) { tu *= dmax / d; tw *= dmax / d; d = dmax; } else if (d < dmin) { tu *= dmin / d; tw *= dmin / d; d = dmin; }
    const base = Math.atan2(-tu, -tw);
    const al = Math.acos(cl((LT * LT + d * d - LS * LS) / (2 * LT * d), -1, 1));
    const t1 = base - al;
    const kx = -LT * Math.sin(t1), kz = -LT * Math.cos(t1);
    const t2 = Math.atan2(-(tu - kx), -(tw - kz));
    const t3 = -a;
    hip.p[0] = hx; hip.p[1] = hy; hip.p[2] = hz; hip.r[0] = cl(phi, -0.6, 0.6);
    th.r[1] = t1; sh.r[1] = t2 - t1; me.r[1] = t3 - t2; ft.r[1] = fp - t3;
  }

  function pose(m, e) {
    if (!e) return;
    const n = m.nodes, Q = choose(e), at = num(e.animTime);
    n.base.r[2] = Q.b;
    const pel = n.pelvis;
    pel.p[0] = Q.px; pel.p[1] = Q.py; pel.p[2] = Q.pz; pel.r[0] = Q.pr; pel.r[1] = Q.pp;
    const to = n.torso;
    to.r[0] = Q.tr; to.r[1] = Q.tp; to.r[2] = Q.ty;
    const Tp = Q.pp + Q.tp;
    n.head.r[0] = Q.hr; n.head.r[1] = Q.hp - Tp; n.head.r[2] = Q.hy;
    n.head.emi = Q.ev;
    n.torsoFx.emi = Q.ef * Q.ec;
    // Braços (ângulos de mundo menos a inclinação do tronco)
    const arm = (id, s, ua, fa, ro, fy) => {
      const A = n['arm' + id], F = n['fore' + id];
      A.r[0] = s * ro; A.r[1] = ua - Tp; A.r[2] = 0;
      F.r[0] = 0; F.r[1] = fa - ua; F.r[2] = -s * fy;
      F.emi = Q.eb;
    };
    arm('L', -1, Q.uaL, Q.faL, Q.roL, Q.fyL);
    arm('R', 1, Q.uaR, Q.faR, Q.roR, Q.fyR);
    // Pernas
    const cp = Math.cos(Q.pp), sp = Math.sin(Q.pp), cr = Math.cos(Q.pr), sr = Math.sin(Q.pr);
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1;
      // offset do quadril: Ry(pp)·Rx(pr)·(0, s·HIPY, HIPZ)
      const y1 = s * HIPY * cr - HIPZ * sr, z1 = s * HIPY * sr + HIPZ * cr;
      const hx = Q.px + z1 * sp, hy = Q.py + y1, hz = Q.pz + z1 * cp;
      if (i) leg(n, 'R', hx, hy, hz, Q.rx, Q.ry, Q.rz, Q.ra, Q.rp);
      else leg(n, 'L', hx, hy, hz, Q.lx, Q.ly, Q.lz, Q.la, Q.lp);
    }
    // Cabo: elevação/desvio em ângulos de mundo, com colisão no chão
    let pe = Tp, py = Q.b + Q.ty;
    let z = Q.pz + TZ * Math.cos(Q.pp) + (-CAB[0]) * Math.sin(Tp) + CAB[2] * Math.cos(Tp);
    let prevE = 1;
    for (let i = 0; i < NC; i++) {
      const c = n['cab' + i];
      let el = Q.ce + Q.cs * i + Q.cf * Math.sin(at * Q.cw - i * 1.1) + Q.cj * Math.sin(at * 47 + i * 2.3);
      const zn = z + CL * Math.sin(el);
      if (zn < 0.7) el = Math.asin(cl((0.7 - z) / CL, -1, 1));
      z += CL * Math.sin(el);
      const ps = Q.cy + Q.cf * 0.9 * Math.sin(at * Q.cw * 0.73 - i * 0.9 + 1.3) + Q.cj * 0.7 * Math.sin(at * 39 + i * 1.7);
      c.r[1] = el - pe; c.r[2] = ps - py;
      pe = el; py = ps;
      const em = Q.ec * (0.78 + 0.32 * Math.sin(at * 9 - i * 1.25));
      c.emi = em / prevE; prevE = em || 1e-3;
    }
  }

  // Halos: visor, lâminas (preparação/investida) e um leve brilho do cabo
  function glows(e, add) {
    if (!e) return;
    const Q = choose(e);
    const vis = cl(0.45 + 0.7 * Math.cos(num(e.facing) - PI / 4), 0.15, 1);
    if (Q.ev > 0.02) add('visor', 9, '255,140,40', 0.7 * cl(Q.ev, 0, 1.6) * vis);
    if (e.state === 'windup') {
      const k = cl(num(e.tgProgress), 0, 1);
      add('bladeL', 7 + 9 * k, '255,130,40', 0.25 + 0.4 * k);
      add('bladeR', 7 + 9 * k, '255,130,40', 0.25 + 0.4 * k);
    } else if (e.state === 'dash') {
      add('bladeL', 14, '255,130,40', 0.6);
      add('bladeR', 14, '255,130,40', 0.6);
    }
    if (Q.ec > 0.05) add('cable', 10, '255,122,34', 0.14 * cl(Q.ec, 0, 1.7));
  }

  const mkE = (f, set, t) => {
    const x = new Hunter(0, 0, 1);
    x.facing = f; x.vx = 0; x.vy = 0; x.z = 0; x.tgProgress = 0; x.state = 'idle'; x.stateTime = 0.5; x.animTime = 0.3;
    set(x, f);
    x.animTime += num(t);
    return x;
  };
  const SPD = 165;

  MODELS3D.cacador = {
    build, pose, glows,
    demos: [
      { label: 'spawn 0.2', e: (f, t) => mkE(f, (x) => { x.state = 'spawn'; x.stateTime = 0.2; x.animTime = 1.0; }, t) },
      { label: 'spawn 0.55', e: (f, t) => mkE(f, (x) => { x.state = 'spawn'; x.stateTime = 0.55; x.animTime = 1.3; }, t) },
      { label: 'idle', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.animTime = 0.6; }, t) },
      { label: 'run A', e: (f, t) => mkE(f, (x) => { x.animTime = 0; x.vx = Math.cos(f) * SPD; x.vy = Math.sin(f) * SPD; }, t) },
      { label: 'run B', e: (f, t) => mkE(f, (x) => { x.animTime = PI / 36; x.vx = Math.cos(f) * SPD; x.vy = Math.sin(f) * SPD; }, t) },
      { label: 'strafe R', e: (f, t) => mkE(f, (x) => { x.animTime = PI / 72; x.vx = -Math.sin(f) * SPD; x.vy = Math.cos(f) * SPD; }, t) },
      { label: 'strafe L', e: (f, t) => mkE(f, (x) => { x.animTime = PI / 24; x.vx = Math.sin(f) * SPD; x.vy = -Math.cos(f) * SPD; }, t) },
      { label: 'windup 0.35', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.tgProgress = 0.35; x.stateTime = 0.15; x.animTime = 2.0; }, t) },
      { label: 'windup 1', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.tgProgress = 1; x.stateTime = 0.42; x.animTime = 2.3; }, t) },
      { label: 'dash 0.03', e: (f, t) => mkE(f, (x) => { x.state = 'dash'; x.stateTime = 0.03; x.animTime = 2.4; x.vx = Math.cos(f) * 760; x.vy = Math.sin(f) * 760; }, t) },
      { label: 'dash 0.2', e: (f, t) => mkE(f, (x) => { x.state = 'dash'; x.stateTime = 0.2; x.animTime = 2.6; x.vx = Math.cos(f) * 760; x.vy = Math.sin(f) * 760; }, t) },
      { label: 'recover 0.1', e: (f, t) => mkE(f, (x) => { x.state = 'recover'; x.stateTime = 0.1; x.animTime = 2.8; }, t) },
      { label: 'recover 0.4', e: (f, t) => mkE(f, (x) => { x.state = 'recover'; x.stateTime = 0.4; x.animTime = 3.1; }, t) },
      { label: 'evade', e: (f, t) => mkE(f, (x) => { x.state = 'evade'; x.stateTime = 0.15; x.animTime = 3.3; x.z = 17; x.vx = -Math.cos(f) * 330; x.vy = -Math.sin(f) * 330; }, t) },
      { label: 'stun', e: (f, t) => mkE(f, (x) => { x.state = 'stun'; x.stateTime = 0.3; x.stun = 0.5; x.animTime = 3.6; }, t) },
      { label: 'dying 0.15', e: (f, t) => mkE(f, (x) => { x.state = 'dying'; x.stateTime = 0.15; x.animTime = 4.0; }, t) },
      { label: 'dying 0.38', e: (f, t) => mkE(f, (x) => { x.state = 'dying'; x.stateTime = 0.38; x.animTime = 4.2; }, t) },
    ],
  };
})();
