// ---------------------------------------------------------------------------
// DRONE SENTINELA — drone militar de NEXUS (modelo 3D low-poly)
// Casco lenticular de metal escuro com crista dorsal, quatro braços com motores
// e hélices finas de duas pás, grande lente de mira vermelha num módulo frontal
// com aro, canhão sob o casco, antena com luz de status piscando e faixa de luz
// fina no aro do casco.
// Referencial: +X frente, +Y direita, +Z cima; origem nos pés (no chão).
// O próprio modelo paira: o corpo fica em z ≈ 30 + seno(animTime·3,2)·3.
// ---------------------------------------------------------------------------
(function () {
  const PI = Math.PI, TWO_PI = PI * 2;
  const PAL = {
    hull: '#2b3039', hullHi: '#58616f', hullMid: '#3a414c', hullLo: '#1f232a', dark: '#121419', belly: '#16191f',
    arm: '#23282f', armTop: '#3b4350', motor: '#1b1f25', motorTop: '#4a5361',
    rotor: '#8a93a3', hub: '#5d6676', lens: '#ff3b3b', lensCore: '#ff4636', rim: '#6f7987', glassDark: '#2a0a0e',
    light: '#ff4a4a', strip: '#ff3646', stripOff: '#2a1418', gun: '#1d2128', gunHi: '#4b5462', muzzle: '#ff5a4a',
  };
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;
  const ss = (t) => t * t * (3 - 2 * t);

  const HOVER = 30;                 // altura de voo do centro do casco
  const HSX = 1.08, HSY = 0.94;     // casco levemente alongado (frente-trás)
  const SIDES = 8, HROT = PI / 8;   // octógono com uma face voltada para a frente
  // Braços em X: ângulo a partir de +X (+ = direita) e sentido de giro da hélice
  const ARMS = [
    { a: PI / 4, dir: 1, front: true }, { a: -PI / 4, dir: -1, front: true },
    { a: 3 * PI / 4, dir: -1, front: false }, { a: -3 * PI / 4, dir: 1, front: false },
  ];
  const ARM_R0 = 7.2;               // raiz do braço (no casco)
  const ARM_LEN = 7.8;              // da raiz ao centro do motor
  const ROTOR_R = 6.2;              // raio das pás
  const LENS_X = 11.0, LENS_Z = 0.3; // centro do módulo óptico (frente do casco)

  // ------------------------------------------------------------ geometria
  // Superfície de revolução em torno de Z: rings = [[r, z], ...] de cima para baixo
  function revZ(g, rings, bandCol, bandE, capTop, capBot) {
    const R = rings.map(([r, z]) => {
      const pts = [];
      for (let j = 0; j < SIDES; j++) { const a = HROT + (j / SIDES) * TWO_PI; pts.push([Math.cos(a) * r * HSX, Math.sin(a) * r * HSY, z]); }
      return pts;
    });
    for (let k = 0; k < R.length - 1; k++) {
      if (bandCol[k] === null) continue;
      for (let j = 0; j < SIDES; j++) {
        const jn = (j + 1) % SIDES;
        const c = typeof bandCol[k] === 'function' ? bandCol[k](j) : bandCol[k];
        const ee = typeof bandE[k] === 'function' ? bandE[k](j) : bandE[k];
        if (c) g.quad(R[k][j], R[k][jn], R[k + 1][jn], R[k + 1][j], c, ee);
      }
    }
    if (capTop) g.poly(R[0], capTop[0], capTop[1]);
    if (capBot) g.poly(R[R.length - 1].slice().reverse(), capBot[0], capBot[1]);
  }
  // Polígono regular no plano YZ (normal +X)
  function discX(g, x, r, seg, col, e, rot = 0) {
    const pts = [];
    for (let i = 0; i < seg; i++) { const a = rot + (i / seg) * TWO_PI; pts.push([x, Math.cos(a) * r, Math.sin(a) * r]); }
    g.poly(pts, col, e);
  }
  // Viga afunilada ao longo de +X (4 faces, sem tampas): largura w, altura h
  function beam(g, x0, x1, w0, h0, w1, h1, z0, z1, colTop, colSide) {
    const a = [[x0, -w0 / 2, z0 + h0 / 2], [x0, w0 / 2, z0 + h0 / 2], [x0, w0 / 2, z0 - h0 / 2], [x0, -w0 / 2, z0 - h0 / 2]];
    const b = [[x1, -w1 / 2, z1 + h1 / 2], [x1, w1 / 2, z1 + h1 / 2], [x1, w1 / 2, z1 - h1 / 2], [x1, -w1 / 2, z1 - h1 / 2]];
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; g.quad(a[i], a[j], b[j], b[i], i === 0 ? colTop : colSide, 0); }
  }

  function build() {
    const root = new N3('root');

    // Casco lenticular: placa superior, ombro, (faixa de luz), aro inferior e ventre
    const RINGS = [[4.3, 4.3], [7.9, 3.0], [9.6, 1.0], [9.8, 0.25], [9.1, -1.3], [5.0, -3.7]];
    const hull = new G3();
    revZ(hull, RINGS, [PAL.hullMid, PAL.hull, null, PAL.hullLo, PAL.belly], [0, 0, 0, 0, 0], [PAL.hullHi, 0], [PAL.dark, 0]);
    // Crista dorsal: da traseira até perto do módulo óptico (dá direção ao casco)
    hull.box(-0.6, 0, 4.85, 9.6, 2.4, 1.1, PAL.hull, 0, { taperX: 0.86, taperY: 0.6, top: PAL.hullHi });
    const body = root.add(new N3('body', hull));
    // Sensores dorsais: duas fendas vermelhas na ponta dianteira da crista
    const sg = new G3();
    for (const y of [-0.5, 0.5]) sg.quad([4.1, y - 0.28, 4.55], [4.1, y + 0.28, 4.55], [3.74, y + 0.2, 5.12], [3.74, y - 0.2, 5.12], PAL.light, 1.1);
    body.add(new N3('sens', sg));
    body.p = [0, 0, HOVER];

    // Faixa de luz fina no aro (tracejada: faces alternadas acesas)
    const strip = new G3();
    revZ(strip, [RINGS[2], RINGS[3]], [(j) => (j % 2 === 0 ? PAL.strip : PAL.stripOff)], [(j) => (j % 2 === 0 ? 1.0 : 0.12)]);
    body.add(new N3('strip', strip));

    // Módulo óptico: carcaça que se projeta do aro, face escura e aro claro da lente
    const og = new G3();
    og.cyl(-4.2, 0, 0, 4.0, 4.2, 4.6, 8, PAL.hull, 0, { axis: 'x', caps: false, rot: PI / 8 });
    discX(og, 0.4, 4.2, 8, PAL.dark, 0, PI / 8);
    og.cyl(0.4, 0, 0, 3.55, 3.3, 1.0, 8, PAL.rim, 0, { axis: 'x', caps: false, rot: PI / 8 });
    const optic = body.add(new N3('optic', og));
    optic.p = [LENS_X - 0.4, 0, LENS_Z];
    // Vidro da lente (brilha e cresce no windup) + núcleo
    // (anel de vidro vermelho, íris escura e núcleo: leitura de "mira")
    const lg = new G3();
    discX(lg, 0, 3.05, 8, PAL.lens, 0.55, PI / 8);
    discX(lg, 0.06, 1.95, 8, PAL.glassDark, 0, PI / 8);
    const lens = optic.add(new N3('lens', lg));
    lens.p = [1.2, 0, 0];
    const pg = new G3().cyl(0, 0, 0, 1.2, 0, 0.7, 6, PAL.lensCore, 1.1, { axis: 'x', caps: false });
    const pupil = lens.add(new N3('pupil', pg));
    pupil.p = [0.1, 0, 0];

    // Canhão sob o casco, apontando para a frente
    const gg = new G3().box(0, 0, -0.9, 5.0, 3.4, 1.9, PAL.gun, 0, { taperX: 1.35, taperY: 1.2, top: PAL.hullLo });
    const gun = body.add(new N3('gun', gg));
    gun.p = [3.2, 0, -3.5];
    const bg = new G3();
    bg.cyl(0, 0, 0, 0.8, 0.7, 7.6, 6, PAL.gunHi, 0, { axis: 'x', caps: false });
    bg.box(7.4, 0, 0, 2.0, 1.9, 1.9, PAL.gun, 0, { top: PAL.gunHi });
    bg.at(8.42, 0, 0); bg.poly(Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * TWO_PI; return [0, Math.cos(a) * 0.7, Math.sin(a) * 0.7]; }), PAL.muzzle, 1.0); bg.at();
    const barrel = gun.add(new N3('barrel', bg));
    barrel.p = [1.6, 0, -1.3];

    // Antena traseira (presa à crista) com luz de status
    const ag = new G3().tube([[0, 0, 0], [0, 0, 9.4]], 0.4, 4, PAL.gunHi, 0);
    const ant = body.add(new N3('ant', ag));
    ant.p = [-4.6, -0.7, 5.2]; ant.r = [-0.1, -0.32, 0];
    const alg = new G3().sphere(0, 0, 0, 0.95, 0.95, 1.15, 4, 2, PAL.light, 1.4);
    const antL = ant.add(new N3('antL', alg));
    antL.p = [0, 0, 9.9];

    // Braços, motores e hélices
    ARMS.forEach((A, i) => {
      const g = new G3();
      beam(g, 0, ARM_LEN - 1.3, 2.6, 1.8, 1.7, 1.2, 0, 0.4, PAL.armTop, PAL.arm);
      const xm = ARM_LEN;
      g.cyl(xm, 0, -2.6, 2.0, 2.3, 4.6, 6, PAL.motor, 0, { caps: false, rot: PI / 6 });
      g.cyl(xm, 0, -2.6, 2.0, 0, -1.3, 6, PAL.dark, 0, { caps: false, rot: PI / 6 });
      g.at(xm, 0, 2.0); g.poly(Array.from({ length: 6 }, (_, k) => { const a = PI / 6 + (k / 6) * TWO_PI; return [Math.cos(a) * 2.3, Math.sin(a) * 2.3, 0]; }), PAL.motorTop, 0); g.at();
      // Luz de navegação no lado externo do motor
      g.quad([xm + 2.27, -0.7, -0.4], [xm + 2.27, 0.7, -0.4], [xm + 2.27, 0.7, 0.6], [xm + 2.27, -0.7, 0.6], A.front ? PAL.light : '#ff4a3a', A.front ? 1.2 : 0.65);
      const arm = body.add(new N3('arm' + i, g));
      arm.p = [Math.cos(A.a) * ARM_R0 * HSX, Math.sin(A.a) * ARM_R0 * HSY, -0.2];
      arm.r = [0, 0, A.a];
      // Hélice: cubo cônico + duas pás finas com leve torção
      const rg = new G3().cyl(0, 0, -0.5, 1.0, 0, 1.5, 4, PAL.hub, 0, { caps: false });
      for (const b of [0, PI]) {
        const c = Math.cos(b), s = Math.sin(b);
        const P = (u, v, w) => [c * u - s * v, s * u + c * v, w];
        const R = ROTOR_R;
        rg.poly([P(0.5, -0.5, 0.12), P(R * 0.5, -0.8, 0.2), P(R, -0.3, 0.06), P(R * 0.92, 0.45, -0.06), P(0.5, 0.5, -0.1)], PAL.rotor, 0);
      }
      const rot = arm.add(new N3('rot' + i, rg));
      rot.p = [xm, 0, 2.55];
    });

    const m = new Model3(root);
    m.anchor('lens', 'pupil', [0.8, 0, 0]);
    m.anchor('antenna', 'antL', [0, 0, 0]);
    m.anchor('muzzle', 'barrel', [8.6, 0, 0]);
    return m;
  }

  // ------------------------------------------------------------ estados
  function flick(t, a, b) { return Math.sin(t * a) * Math.sin(t * b) > -0.2 ? 1 : 0.15; }
  function blink(t) { const ph = (t * 0.85) % 1; return (ph < 0.07 || (ph > 0.14 && ph < 0.21)) ? 1 : 0; }
  // Níveis de emissão (compartilhados entre pose e halos)
  const LV = { lens: 1, pupil: 1, gun: 0.5, ant: 0, nav: 1, strip: 1, k: 0 };
  function levels(e) {
    const t = num(e.animTime), st = num(e.stateTime);
    let lens = 1, pupil = 1, gun = 0.45, ant = blink(t), nav = 1, strip = 1, k = 0;
    switch (e.state) {
      case 'spawn': {
        const q = cl(st / 0.75, 0, 1);
        lens = q < 0.3 ? 0 : (q < 0.8 ? flick(t, 37, 23) * q : 1); pupil = lens;
        strip = q < 0.5 ? 0 : flick(t, 29, 41) * q; nav = q < 0.2 ? 0 : 1; ant = q > 0.6 ? ant : 0; gun = 0.45 * q;
        break;
      }
      case 'windup': k = cl(num(e.tgProgress), 0, 1); lens = 1 + 1.5 * k; pupil = 1 + 0.9 * k; gun = 0.45 + 1.4 * k; strip = 1 + 0.5 * k; break;
      case 'recover': { const r = Math.exp(-st * 7); lens = 1 + 1.2 * r; pupil = 1 + 0.8 * r; gun = 0.45 + 2 * Math.exp(-st * 9); break; }
      case 'stun': lens = 0.2 + 0.8 * flick(t, 41, 17); pupil = lens; ant = 0; nav = flick(t, 23, 31); strip = 0.25 * flick(t, 19, 13); gun = 0.15; break;
      case 'dying': { const q = cl(st / 0.45, 0, 1); lens = (1 - q) * flick(t, 53, 29); pupil = lens; ant = 0; nav = (1 - q) * flick(t, 31, 47); strip = 0; gun = 0; break; }
    }
    LV.lens = lens; LV.pupil = pupil; LV.gun = gun; LV.ant = ant; LV.nav = nav; LV.strip = strip; LV.k = k;
    return LV;
  }

  function pose(m, e) {
    if (!e) return;
    const n = m.nodes;
    const t = num(e.animTime), st = num(e.stateTime), f = num(e.facing);
    const vx = num(e.vx), vy = num(e.vy);
    const cf = Math.cos(f), sf = Math.sin(f);
    const fwd = vx * cf + vy * sf, lat = -vx * sf + vy * cf;
    levels(e);

    let z = HOVER + Math.sin(t * 3.2) * 3;
    let pitch = cl(fwd * 0.0028, -0.3, 0.3), roll = cl(-lat * 0.0028, -0.3, 0.3);
    let yaw = Math.sin(t * 1.3) * 0.035, bx = 0, recoil = 0;
    let spinA = t * 34;          // ângulo acumulado das hélices
    let pupY = Math.sin(t * 1.1) * 0.45, pupZ = Math.sin(t * 0.7 + 1) * 0.3, pupS = 1, lensS = 1;
    let droop = 0;

    switch (e.state) {
      case 'spawn': {
        const q = cl(st / 0.75, 0, 1);
        z = mix(16, HOVER, ss(q)) + Math.sin(t * 3.2) * 3 * q;
        // giro acelera do zero: integral de 34·(s/0,75)
        const s0 = Math.min(st, 0.75);
        spinA = 34 * s0 * s0 / 1.5 + 34 * Math.max(0, st - 0.75);
        pitch = 0; roll = Math.sin(t * 6) * 0.08 * (1 - q);
        break;
      }
      case 'windup': {
        const k = LV.k;
        z = HOVER + Math.sin(t * 3.2) * 3 * (1 - 0.6 * k);
        pitch += 0.14 * ss(k);
        roll += Math.sin(t * 47) * 0.02 * k;
        pupY = 0; pupZ = 0; pupS = 1 + 0.6 * k; lensS = 1 + 0.16 * k;
        spinA = t * 34 + st * st * 8;
        break;
      }
      case 'recover': {
        const r = Math.exp(-st * 8);
        pitch -= 0.28 * r; bx = -3 * r; recoil = -2.4 * Math.exp(-st * 14);
        pupY = 0; pupZ = 0; pupS = 1 + 0.4 * r; lensS = 1 + 0.1 * r;
        break;
      }
      case 'stun': {
        z = 23 + Math.sin(t * 5) * 1.5;
        roll = 0.3 + Math.sin(t * 9) * 0.13;
        pitch = 0.12 + Math.sin(t * 7.3) * 0.1;
        yaw += Math.sin(t * 13) * 0.08;
        spinA = (t - st) * 34 + 8 * st + 26 * (1 - Math.exp(-6 * st)) / 6;
        pupY = Math.sin(t * 17) * 0.6; pupZ = Math.sin(t * 13) * 0.4;
        droop = 0.12;
        break;
      }
      case 'dying': {
        const q = cl(st / 0.45, 0, 1);
        z = mix(HOVER, 5, q * q) + Math.sin(t * 3.2) * 3 * (1 - q);
        yaw += q * q * 5.5;
        roll = mix(roll, 0.85, q); pitch = mix(pitch, 0.35, q);
        const s = Math.min(st, 0.6);
        spinA = (t - st) * 34 + 34 * (s - s * s / 1.2);
        droop = 0.6 * q;
        break;
      }
    }

    const b = n.body;
    b.p[0] = bx; b.p[1] = 0; b.p[2] = z;
    b.r[0] = roll; b.r[1] = pitch; b.r[2] = yaw;

    n.strip.emi = cl(LV.strip, 0, 2);
    n.sens.emi = cl(LV.nav * (0.75 + 0.25 * Math.sin(t * 6.1)), 0, 2);
    n.lens.emi = cl(LV.lens, 0, 2.5);
    n.lens.s[1] = n.lens.s[2] = lensS;
    n.pupil.emi = cl(LV.pupil / Math.max(0.05, LV.lens), 0, 2);
    n.pupil.p[1] = pupY; n.pupil.p[2] = pupZ;
    n.pupil.s[0] = n.pupil.s[1] = n.pupil.s[2] = pupS;
    n.barrel.p[0] += recoil;
    n.barrel.emi = cl(LV.gun, 0, 2.5);
    n.antL.emi = LV.ant ? 1.5 : 0.12;
    // Antena balança com a inclinação
    n.ant.r[1] += -pitch * 0.5 + Math.sin(t * 2.1) * 0.05;
    n.ant.r[0] += -roll * 0.5;
    for (let i = 0; i < 4; i++) {
      const A = ARMS[i];
      const arm = n['arm' + i];
      arm.emi = cl(LV.nav, 0, 2);
      if (droop && i === 1) arm.r[1] = droop;
      else if (droop) arm.r[1] = droop * 0.15;
      n['rot' + i].r[2] = A.dir * spinA + i * 0.9;
    }
  }

  function glows(e, add) {
    if (!e) return;
    levels(e);
    const f = num(e.facing), st = num(e.stateTime);
    // Lente e boca do canhão só brilham forte quando estão voltadas para a câmera
    const vis = cl(0.45 + 0.75 * Math.cos(f - PI / 4), 0.1, 1);
    if (LV.lens > 0.02) add('lens', 8 + 13 * LV.k, '255,60,60', (0.38 + 0.3 * LV.k) * Math.min(1.25, LV.lens) * vis);
    if (LV.ant) add('antenna', 5, '255,60,60', 0.85);
    if (e.state === 'windup' && LV.k > 0.25) add('muzzle', 3 + 6 * LV.k, '255,90,80', 0.55 * LV.k * vis);
    if (e.state === 'recover') { const r = Math.exp(-st * 9); if (r > 0.03) add('muzzle', 4 + 8 * r, '255,90,80', 0.8 * r * vis); }
  }

  // t (parâmetro do visualizador) avança o relógio da animação
  const mkE = (f, set, t) => {
    const x = new Shooter('drone', 0, 0, 1);
    x.facing = f; x.vx = 0; x.vy = 0; x.z = 0;
    set(x, f);
    x.animTime += num(t);
    return x;
  };

  MODELS3D.drone = {
    build, pose, glows,
    demos: [
      { label: 'spawn', e: (f, t) => mkE(f, (x) => { x.state = 'spawn'; x.stateTime = 0.45; x.animTime = 1.2; }, t) },
      { label: 'idle', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.stateTime = 1; x.animTime = 0.7; }, t) },
      { label: 'voo frente', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.animTime = 1.1; x.vx = Math.cos(f) * 100; x.vy = Math.sin(f) * 100; }, t) },
      { label: 'voo direita', e: (f, t) => mkE(f, (x) => { x.state = 'idle'; x.animTime = 1.4; x.vx = -Math.sin(f) * 100; x.vy = Math.cos(f) * 100; }, t) },
      { label: 'windup 0.5', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.tgProgress = 0.5; x.stateTime = 0.25; x.animTime = 2; x.aim = f; }, t) },
      { label: 'windup 1', e: (f, t) => mkE(f, (x) => { x.state = 'windup'; x.tgProgress = 1; x.stateTime = 0.5; x.animTime = 2.2; x.aim = f; }, t) },
      { label: 'recover', e: (f, t) => mkE(f, (x) => { x.state = 'recover'; x.stateTime = 0.04; x.animTime = 2.5; }, t) },
      { label: 'stun', e: (f, t) => mkE(f, (x) => { x.state = 'stun'; x.stateTime = 0.2; x.animTime = 3.1; x.stun = 0.4; }, t) },
      { label: 'dying', e: (f, t) => mkE(f, (x) => { x.state = 'dying'; x.stateTime = 0.25; x.animTime = 4; }, t) },
    ],
  };
})();
