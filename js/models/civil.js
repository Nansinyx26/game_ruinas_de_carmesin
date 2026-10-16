// ---------------------------------------------------------------------------
// CIVIL — sobreviventes Desconectados (NPCs neutros do Refúgio), 4 variantes
// num único modelo (a variante só liga/desliga nós com n.vis):
//   0 SOBREVIVENTE  jaqueta oliva, capuz levantado, máscara com filtro, lanterna ciano no peito
//   1 COMERCIANTE   casaco marrom com avental de bolsos, mochila-estrutura carregada, gorro e
//                   óculos de proteção na testa (lentes âmbar)
//   2 COMBATENTE    colete acolchoado cinza-azulado, cabelo curto, faixa vinho no braço,
//                   rifle de sucata nas costas, visor ciano fino sobre um olho
//   3 JOVEM         poncho vinho remendado (mais baixa, ~44), cachecol, mochila pequena,
//                   faixa de LED ciano no capuz
// e = { animTime, stateTime, state: 'idle'|'walk'|'talk'|'fear', facing, variant, vx, vy }
// Referencial: +X frente, +Y direita, +Z cima; origem nos pés.
// ---------------------------------------------------------------------------
(function () {
  const PI = Math.PI, TAU = PI * 2;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : (d || 0));
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ss = (k) => { k = cl(k, 0, 1); return k * k * (3 - 2 * k); };

  // ------------------------------------------------------------ primitivas econômicas
  // Anel de n pontos (elipse com raio frontal/traseiro distintos). dz: desvio de z por vértice
  function ring(z, rF, rB, ry, n, cx, cy, rot, dz) {
    const P = [];
    for (let i = 0; i < n; i++) {
      const a = (rot === undefined ? PI / n : rot) + (i * TAU) / n, c = Math.cos(a), s = Math.sin(a);
      P.push([(cx || 0) + c * (c > 0 ? rF : rB), (cy || 0) + s * ry, z + (dz ? dz[i] : 0)]);
    }
    return P;
  }
  // Retângulo (anel de 4) centrado em (cx, cy)
  const rect = (z, hx, hy, cx, cy) => [[(cx || 0) + hx, (cy || 0) - hy, z], [(cx || 0) + hx, (cy || 0) + hy, z], [(cx || 0) - hx, (cy || 0) + hy, z], [(cx || 0) - hx, (cy || 0) - hy, z]];
  // Superfície entre anéis. o.cf(k, i) -> [cor, emi] | false (face omitida); o.tip fecha num bico; o.capT tampa o topo
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
    if (o.tip) { for (let i = 0; i < L.length; i++) { if (o.tipSkip && o.tipSkip(i)) continue; g.tri(L[i], L[(i + 1) % L.length], o.tip, o.tipCol || col, e); } }
    else if (o.capT) g.poly(L, o.capCol || col, e);
    return g;
  }
  // Caixa com controle por face: o.b/t/f/k/l/r = false (omite) ou [cor, emi]. o.tx/o.ty afinam o topo, o.sh desloca o topo
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
  // Faixa plana (quad) de a até b com meia-largura w ao longo de Y, levemente à frente (+X)
  function strip(g, a, b, w, col, e, dx) {
    dx = dx || 0;
    g.quad([a[0] + dx, a[1] - w, a[2]], [a[0] + dx, a[1] + w, a[2]], [b[0] + dx, b[1] + w, b[2]], [b[0] + dx, b[1] - w, b[2]], col, e);
    return g;
  }

  // ------------------------------------------------------------ paleta
  const C = {
    skin: '#a9826a', eye: '#17110f', pants: '#24272c', boot: '#17181b', sleeve: '#2b2e33',
    // 0 sobrevivente
    olive: '#3a4030', oliveD: '#2a2f22', mask: '#2a2d30', filter: '#5a6166', cyan: '#6fe9ff',
    // 1 comerciante
    coat: '#4a3a2c', apron: '#6a5b45', pocket: '#3b3125', beanie: '#5b3326', goggle: '#25272a', amber: '#ffb35a',
    frame: '#3a3d42', crateA: '#4d5440', crateB: '#5a3f2a', coil: '#1b1b1d', copper: '#9a6436',
    // 2 combatente
    vest: '#33404a', vestD: '#26313a', hair: '#2a201b', wine: '#6a2232', rifle: '#4a4e54', rifleD: '#2a2c2f',
    // 3 jovem
    poncho: '#4a2a33', ponchoD: '#38202a', patchA: '#6a4a3a', patchB: '#3a3d48', scarf: '#8a7656', pack: '#3a342e',
  };

  // ------------------------------------------------------------ dimensões (adulto ~50)
  const HIPZ = 23.4, LTH = 11.3, LSH = 9.6, ANK = 2.0, HIPY = 2.8;
  const SPZ = 24.8, SHY = 6.0, SHZ = 13.2, LUA = 9.2, LFA = 8.4;

  // ------------------------------------------------------------ geometria compartilhada
  function gPelvis() {
    return loft(new G3(), [rect(-2.4, 3.0, 4.5), rect(3.0, 3.3, 4.9)], C.pants, 0);
  }
  function gThigh(s) {
    return loft(new G3(), [rect(-LTH - 0.4, 1.9, 1.85), rect(1.2, 2.5, 2.4, 0, s * 0.15)], C.pants, 0);
  }
  function gShin() {
    return loft(new G3(), [rect(-LSH + 1.2, 1.65, 1.6), rect(0.4, 2.0, 1.9)], C.pants, 0);
  }
  function gBoot() {
    // bota: caixa com o topo recuado (bico inclinado); topo escondido pela canela
    return bx(new G3(), 0.8, 0, -0.5, 5.6, 3.0, 3.2, C.boot, 0, { b: false, t: false, tx: 0.55, sh: [-1.1, 0] });
  }
  function gUpper() {
    return loft(new G3(), [rect(-LUA - 0.3, 1.5, 1.5), rect(1.3, 1.95, 1.9)], C.sleeve, 0);
  }
  function gFore() {
    // antebraço (manga) + mão (pele, em cunha)
    return loft(new G3(), [rect(0.4, 1.5, 1.45), rect(-LFA + 0.4, 1.05, 1.1), rect(-LFA - 2.3, 0.75, 1.0, 0.35)], C.sleeve, 0, { cf: (k) => (k === 1 ? [C.skin, 0] : null) });
  }
  function gHead() {
    const g = new G3();
    // pescoço -> mandíbula -> têmporas (o topo fica sempre sob capuz, gorro ou cabelo)
    loft(g, [ring(-1.2, 1.4, 1.5, 1.45, 6, -0.2), ring(2.0, 2.45, 2.1, 2.45, 6, 0.5), ring(5.6, 3.25, 3.25, 3.05, 6, 0)], C.skin, 0);
    for (const y of [-0.85, 0.85]) bx(g, 2.78, y, 4.5, 0.3, 0.8, 0.45, C.eye, 0, { b: false, k: false, t: false, l: false, r: false });
    return g;
  }
  // Capuz: um anel em volta do rosto (face frontal aberta) e um bico arredondado
  function gHood(col, colIn) {
    const g = new G3();
    const R = [ring(-0.6, 3.3, 3.8, 4.1, 6, -0.6), ring(7.2, 3.9, 4.3, 3.9, 6, -0.4)];
    loft(g, R, col, 0, { cf: (k, i) => (i === 5 ? false : (i === 0 || i === 4) ? [colIn, 0] : null), tip: [-1.6, 0, 10.9] });
    return { g, R };
  }

  // ------------------------------------------------------------ variante 0: sobrevivente
  function gTorso0() {
    const sd = [0, -1.5, 0, 0, -1.5, 0];
    return loft(new G3(), [ring(-2.2, 3.7, 3.5, 5.4, 6), ring(8.5, 4.0, 3.6, 6.1, 6), ring(14.4, 3.3, 3.3, 6.7, 6, 0, 0, undefined, sd)], C.olive, 0,
      { capT: true, cf: (k, i) => (k === 0 && i === 5 ? [C.oliveD, 0] : null) });
  }
  function gMask() {
    const g = new G3();
    bx(g, 2.75, 0, 2.3, 1.7, 3.7, 2.9, C.mask, 0, { k: false, b: false, t: false, tx: 0.7, ty: 0.75, sh: [0.1, 0] });
    // filtro cilíndrico (caixa curta) à frente da boca
    bx(g, 4.0, 0, 1.9, 1.3, 2.0, 1.9, C.filter, 0, { k: false, b: false, f: ['#3a3f43', 0] });
    return g;
  }
  function gLantern() {
    return bx(new G3(), 0, 0, 0, 1.4, 2.2, 1.9, '#222629', 0, { k: false, b: false, f: [C.cyan, 1.3] });
  }
  // ------------------------------------------------------------ variante 1: comerciante
  function gTorso1() {
    const sd = [0, -1.5, 0, 0, -1.5, 0];
    const g = new G3();
    loft(g, [ring(-6.0, 4.5, 4.7, 5.9, 6), ring(1.5, 3.7, 3.6, 5.4, 6), ring(14.4, 3.4, 3.3, 6.7, 6, 0, 0, undefined, sd)], C.coat, 0,
      { capT: true, cf: (k, i) => (i === 5 ? false : null) });
    // avental na frente (cobre a face omitida) com bolsos
    const ap = (z0, z1, x0, x1, w0, w1, col, dx) => g.quad([x0 + dx, -w0, z0], [x0 + dx, w0, z0], [x1 + dx, w1, z1], [x1 + dx, -w1, z1], col, 0);
    ap(-6.4, 1.5, 3.95, 3.2, 3.0, 2.75, C.apron, 0.05);
    ap(1.5, 14.4, 3.2, 2.86, 2.75, 3.3, C.apron, 0.05);
    ap(-4.2, -0.6, 3.75, 3.33, 2.6, 2.45, C.pocket, 0.14);
    ap(4.0, 7.4, 3.11, 3.02, 1.3, 1.25, C.pocket, 0.14);
    return g;
  }
  function gBeanie() {
    const g = new G3();
    loft(g, [ring(5.6, 3.55, 3.7, 3.45, 6, 0, 0, undefined, [0.5, 0, 0, 0, 0, 0.5]), ring(8.4, 3.1, 3.3, 3.05, 6, -0.2)], C.beanie, 0, { capT: true });
    // óculos de proteção na testa: armação + lentes âmbar
    bx(g, 3.0, 0, 7.0, 1.1, 4.8, 1.4, C.goggle, 0, { k: false, b: false, t: false });
    for (const y of [-1.15, 1.15]) bx(g, 3.58, y, 7.0, 0.3, 1.5, 1.05, C.amber, 1.0, { k: false, b: false, t: false, l: false, r: false });
    return g;
  }
  function gPack1() {
    const g = new G3();
    // estrutura: dois trilhos verticais (perfil em L) + travessa no alto
    for (const y of [-4.3, 4.3]) bx(g, -4.4, y, 13.5, 0.8, 0.8, 30, C.frame, 0, { t: false, b: false, f: false, [y < 0 ? 'r' : 'l']: false });
    bx(g, -4.4, 0, 28.2, 0.8, 9.4, 0.8, C.frame, 0, { l: false, r: false, b: false, f: false });
    // caixas
    bx(g, -7.0, 0.2, 5.4, 5.0, 7.8, 6.4, C.crateA, 0, { b: false, f: false });
    bx(g, -6.6, -0.5, 12.0, 4.2, 6.4, 5.4, C.crateB, 0, { b: false, f: false });
    // carretel de cabo (eixo em Y), tampas de cobre
    bx(g, -6.3, 0.0, 17.2, 4.6, 5.4, 3.6, C.coil, 0, { b: false, f: false, l: [C.copper, 0], r: [C.copper, 0] });
    // antena com ponta luminosa
    bx(g, -4.4, 4.3, 31.6, 0.4, 0.4, 6.0, C.frame, 0, { b: false, t: false, f: false, l: false });
    bx(g, -4.4, 4.3, 35.0, 0.7, 0.7, 0.9, C.amber, 1.1, { b: false, t: false, f: false, l: false });
    // luzinha verde na caixa
    g.quad([-9.52, -2.0, 6.6], [-9.52, -0.9, 6.6], [-9.52, -0.9, 7.3], [-9.52, -2.0, 7.3], '#7dff9a', 1.0);
    return g;
  }
  // ------------------------------------------------------------ variante 2: combatente
  function gTorso2() {
    const sd = [0, -1.3, 0, 0, -1.3, 0];
    const g = new G3();
    loft(g, [ring(0.6, 3.75, 3.55, 5.3, 6), ring(8.5, 4.1, 3.7, 6.0, 6), ring(14.2, 3.3, 3.3, 6.5, 6, 0, 0, undefined, sd)], C.vest, 0, { capT: true, capCol: C.vestD });
    // acolchoado: costuras horizontais na frente
    for (const z of [5.0]) {
      const x = z < 8.5 ? 3.75 * 0.866 + (4.1 - 3.75) * 0.866 * (z - 0.6) / 7.9 : 4.1 * 0.866 - (4.1 - 3.3) * 0.866 * (z - 8.5) / 5.7;
      g.quad([x + 0.08, -2.6, z - 0.25], [x + 0.08, 2.6, z - 0.25], [x + 0.08, 2.6, z + 0.25], [x + 0.08, -2.6, z + 0.25], C.vestD, 0);
    }
    // bandoleira do rifle cruzando o peito
    g.quad([3.55 + 0.1, 3.4, 13.0], [3.55 + 0.1, 4.6, 12.0], [3.35 + 0.1, -2.6, 1.6], [3.35 + 0.1, -3.8, 2.6], '#1a1c1f', 0);
    return g;
  }
  function gHair() {
    return loft(new G3(), [ring(4.4, 3.5, 3.65, 3.45, 6, -0.1, 0, undefined, [1.4, 0, -1.2, -1.2, 0, 1.4]), ring(8.0, 2.95, 3.25, 3.1, 6, -0.3)], C.hair, 0, { capT: true });
  }
  function gVisor() {
    const g = new G3();
    bx(g, 3.05, 0.95, 4.55, 0.35, 1.8, 0.42, C.cyan, 1.2, { k: false, b: false, l: false, r: false });
    bx(g, 2.2, 2.4, 4.6, 2.0, 0.5, 0.5, '#202428', 0, { b: false, l: false, k: false });
    return g;
  }
  function gArmband() {
    return loft(new G3(), [rect(-4.5, 1.68, 1.68), rect(-2.6, 1.78, 1.78)], C.wine, 0);
  }
  function gRifle() {
    // de pé ao longo de +Z (cano para cima), perfil no plano y-z (deitado nas costas)
    const g = new G3();
    g.extrude([[-1.7, -9.5], [0.9, -9.5], [1.0, 5.0], [-0.9, 5.0]], 1.2, C.rifleD, 0, { plane: 'yz', edgeCol: C.rifle });
    loft(g, [ring(4.5, 0.6, 0.6, 0.6, 3, 0, 0, 0), ring(17.0, 0.55, 0.55, 0.55, 3, 0, 0, 0)], C.rifle, 0);
    bx(g, -0.1, 1.75, 1.0, 0.7, 0.8, 3.4, '#1d2023', 0, { b: false, t: false, k: false });
    g.quad([-0.5, 1.6, 2.72], [-0.5, 1.9, 2.72], [0.3, 1.9, 2.72], [0.3, 1.6, 2.72], C.cyan, 1.0);
    return g;
  }
  // ------------------------------------------------------------ variante 3: jovem
  function gPoncho() {
    const g = new G3();
    const R = [ring(1.0, 5.4, 5.2, 8.2, 6, 0, 0, undefined, [-0.9, 0.2, -0.6, 0.3, -0.5, -1.2]), ring(12.4, 4.4, 4.2, 7.2, 6), ring(15.6, 2.6, 2.8, 3.0, 6)];
    loft(g, R, C.poncho, 0);
    // remendos
    g.quad([4.95, -5.0, 3.5], [4.8, -2.6, 3.5], [4.6, -2.4, 6.6], [4.75, -4.8, 6.6], C.patchA, 0);
    g.quad([-4.55, 2.4, 6.0], [-4.65, 5.0, 6.0], [-4.4, 4.8, 9.2], [-4.3, 2.5, 9.2], C.patchB, 0);
    return g;
  }
  function gScarf() {
    const g = new G3();
    loft(g, [ring(14.4, 3.6, 3.5, 3.9, 6), ring(17.4, 2.7, 2.8, 2.9, 6)], C.scarf, 0);
    // ponta pendurada
    bx(g, 3.3, -1.6, 11.4, 0.6, 1.8, 5.0, C.scarf, 0, { b: false, t: false, k: false, l: false });
    return g;
  }
  function gPack3() {
    return bx(new G3(), -5.6, 0, 8.4, 3.0, 5.6, 6.0, C.pack, 0, { b: false, f: false });
  }

  // ------------------------------------------------------------ montagem
  function build() {
    const root = new N3('root');
    const body = root.add(new N3('body'));
    const hips = body.add(new N3('hips', gPelvis()));
    hips.p = [0, 0, HIPZ];
    for (const [s, nm] of [[-1, 'L'], [1, 'R']]) {
      const th = hips.add(new N3('thigh' + nm, gThigh(s)));
      th.p = [0, s * HIPY, -0.6];
      const sh = th.add(new N3('shin' + nm, gShin()));
      sh.p = [0, 0, -LTH];
      const ft = sh.add(new N3('foot' + nm, gBoot()));
      ft.p = [0, 0, -LSH];
    }
    const spine = body.add(new N3('spine'));
    spine.p = [0, 0, SPZ];
    const tor = [gTorso0(), gTorso1(), gTorso2(), gPoncho()];
    tor.forEach((g, i) => spine.add(new N3('torso' + i, g)));
    const head = spine.add(new N3('head', gHead()));
    head.p = [0.3, 0, 15.0];
    head.add(new N3('hood0', gHood(C.olive, C.oliveD).g));
    head.add(new N3('mask0', gMask()));
    head.add(new N3('beanie1', gBeanie()));
    head.add(new N3('hair2', gHair()));
    head.add(new N3('visor2', gVisor()));
    // capuz da jovem com faixa de LED ciano na borda da abertura
    const H3 = gHood(C.poncho, C.ponchoD), R = H3.R;
    strip(H3.g, R[0][5], R[1][5], 0.3, '#3fd8ff', 0.9, 0.18);
    strip(H3.g, R[0][0], R[1][0], 0.3, '#3fd8ff', 0.9, 0.18);
    const h3 = head.add(new N3('hood3', H3.g));
    h3.s = [0.97, 0.97, 1.0];
    const lan = spine.add(new N3('lantern0', gLantern()));
    lan.p = [4.15, -2.3, 9.6]; lan.r = [0, -0.1, 0];
    spine.add(new N3('pack1', gPack1()));
    const rf = spine.add(new N3('rifle2', gRifle()));
    rf.p = [-4.5, 0.2, 7.5]; rf.r = [-0.8, 0, 0];
    spine.add(new N3('scarf3', gScarf()));
    spine.add(new N3('pack3', gPack3()));
    for (const [s, nm] of [[-1, 'L'], [1, 'R']]) {
      const ua = spine.add(new N3('arm' + nm, gUpper()));
      ua.p = [-0.2, s * SHY, SHZ];
      if (s < 0) ua.add(new N3('band2', gArmband()));
      const fa = ua.add(new N3('fore' + nm, gFore()));
      fa.p = [0, 0, -LUA];
    }
    const m = new Model3(root);
    m.anchor('head', 'head', [0, 0, 10.8]);
    m.anchor('light0', 'lantern0', [0.9, 0, 0]);
    m.anchor('light1', 'beanie1', [3.8, 0, 7.0]);
    m.anchor('light2', 'visor2', [3.3, 0.95, 4.55]);
    m.anchor('light3', 'hood3', [3.6, 0, 3.6]);
    return m;
  }

  // ------------------------------------------------------------ pose
  // IK de perna no plano sagital: (ax, az) = tornozelo relativo ao pivô da coxa
  function leg(th, sh, ft, ax, az, toe) {
    let d = Math.hypot(ax, az);
    const mx = LTH + LSH - 0.05;
    if (d > mx) { ax *= mx / d; az *= mx / d; d = mx; }
    if (d < 4) d = 4;
    const phi = Math.atan2(-ax, -az);
    const al = Math.acos(cl((LTH * LTH + d * d - LSH * LSH) / (2 * LTH * d), -1, 1));
    const t1 = phi - al;
    const kx = -Math.sin(t1) * LTH, kz = -Math.cos(t1) * LTH;
    const t2 = Math.atan2(-(ax - kx), -(az - kz));
    th.r[1] = t1; sh.r[1] = t2 - t1; ft.r[1] = -t2 + (toe || 0);
  }

  const VARIANT_NODES = [['torso0', 'hood0', 'mask0', 'lantern0'], ['torso1', 'beanie1', 'pack1'], ['torso2', 'hair2', 'visor2', 'rifle2', 'band2'], ['torso3', 'hood3', 'scarf3', 'pack3']];
  const variantOf = (e) => cl(Math.round(num(e && e.variant)), 0, 3) | 0;

  function pose(m, e) {
    const n = m.nodes;
    e = e || {};
    const v = variantOf(e);
    for (let k = 0; k < 4; k++) for (const nm of VARIANT_NODES[k]) n[nm].vis = k === v;
    const t = num(e.animTime), st = e.state;
    const kid = v === 3;
    n.body.s[0] = n.body.s[1] = n.body.s[2] = kid ? 0.88 : 1;
    const br = Math.sin(t * 2.1);
    let hipX = 0, hipZ = HIPZ - 0.15, fL = 0, fR = 0, lL = 0, lR = 0, spread = 0;
    const sp = n.spine, hd = n.head, aL = n.armL, aR = n.armR, fLn = n.foreL, fRn = n.foreR;
    // braços em repouso
    aL.r[0] = -0.1; aR.r[0] = 0.1; aL.r[1] = 0.05; aR.r[1] = 0.05;
    fLn.r[1] = -0.25; fRn.r[1] = -0.25;
    if (st === 'walk') {
      const spd = Math.hypot(num(e.vx), num(e.vy));
      const f = spd > 1 ? cl(spd / 30, 1.1, 2.2) : 1.5;
      const ph = t * f * TAU;
      const S = kid ? 4.2 : 4.6;
      const sw = (p) => {
        // p em [0, 1): 0..0.5 apoio (pé vai para trás), 0.5..1 balanço (vai para frente, levantado)
        p -= Math.floor(p);
        if (p < 0.5) return [S - (p / 0.5) * 2 * S, 0];
        const q = (p - 0.5) / 0.5;
        return [-S + ss(q) * 2 * S, Math.sin(q * PI) * 2.6];
      };
      const pL = sw(t * f), pR = sw(t * f + 0.5);
      fL = pL[0]; lL = pL[1]; fR = pR[0]; lR = pR[1];
      hipZ = HIPZ - 0.7 + Math.abs(Math.cos(ph)) * 0.7;
      sp.r[1] = 0.1; sp.r[2] = Math.sin(ph) * 0.12;
      n.hips.r[2] = -Math.sin(ph) * 0.1;
      aL.r[1] = Math.sin(ph) * 0.5; aR.r[1] = -Math.sin(ph) * 0.5;
      fLn.r[1] = -0.45 + Math.min(0, Math.sin(ph)) * 0.3; fRn.r[1] = -0.45 + Math.min(0, -Math.sin(ph)) * 0.3;
      hd.r[2] = -Math.sin(ph) * 0.08;
    } else if (st === 'talk') {
      // gesticula com o braço direito; a cabeça acompanha o gesto
      const g1 = Math.sin(t * 3.1), g2 = Math.sin(t * 4.7 + 1.1), g3 = Math.sin(t * 1.7);
      sp.r[2] = 0.1 + 0.05 * g3; sp.r[1] = 0.03 + 0.02 * g1;
      sp.s[2] = 1 + br * 0.008;
      aR.r[1] = -0.45 - 0.18 * g1; aR.r[0] = 0.3 + 0.08 * g2;
      fRn.r[1] = -1.25 - 0.3 * g2; fRn.r[0] = -0.25; fRn.r[2] = 0.4;
      aL.r[1] = 0.1; aL.r[0] = -0.12; fLn.r[1] = -0.4;
      hd.r[1] = 0.05 * Math.sin(t * 5.2); hd.r[2] = 0.05 + 0.08 * g3; hd.r[0] = 0.05 * g2;
    } else if (st === 'fear') {
      // agachado, encolhido, braços protegendo a cabeça, tremendo
      const tr = Math.sin(t * 41) * 0.5 + Math.sin(t * 27 + 1.3) * 0.5;
      hipX = -2.6; hipZ = 13.4 + tr * 0.15; spread = 1;
      fL = 2.4; fR = 1.4;
      sp.r[1] = 0.24 + tr * 0.02; sp.r[0] = tr * 0.02;
      hd.r[1] = 0.38; hd.r[2] = -0.12;
      aL.r[1] = -2.5 + tr * 0.04; aL.r[0] = 0.36; fLn.r[1] = -1.3; fLn.r[0] = 0.25;
      aR.r[1] = -2.4 - tr * 0.04; aR.r[0] = -0.36; fRn.r[1] = -1.4; fRn.r[0] = -0.25;
    } else {
      // idle: respiração e olhar em volta devagar
      sp.s[2] = 1 + br * 0.012; sp.r[1] = 0.02 + br * 0.01;
      aL.r[0] = -0.1 - br * 0.02; aR.r[0] = 0.1 + br * 0.02;
      hd.r[2] = Math.sin(t * 0.55) * 0.5 + Math.sin(t * 1.3) * 0.12;
      hd.r[1] = Math.sin(t * 0.8 + 1) * 0.06;
      fL = 0.5; fR = -0.4;
    }
    n.hips.p[0] = hipX; n.hips.p[2] = hipZ;
    sp.p[0] = hipX; sp.p[2] = hipZ + (SPZ - HIPZ);
    // pernas (IK)
    leg(n.thighL, n.shinL, n.footL, fL - hipX, ANK + lL - (hipZ - 0.6));
    leg(n.thighR, n.shinR, n.footR, fR - hipX, ANK + lR - (hipZ - 0.6));
    if (spread) { n.thighL.r[0] = -0.16; n.thighR.r[0] = 0.16; n.footL.r[0] = 0.16; n.footR.r[0] = -0.16; }
  }

  // Halos discretos da luz da variante; atenuados quando a luz está do lado oposto à câmera
  function glows(e, add) {
    if (!e) return;
    const v = variantOf(e), t = num(e.animTime), f = num(e.facing);
    const front = cl(0.3 + 0.7 * (Math.cos(f) + Math.sin(f)) * 0.7071, 0.12, 1);
    if (v === 0) add('light0', 10, '111,233,255', (0.32 + 0.04 * Math.sin(t * 3)) * front);
    else if (v === 1) add('light1', 6, '255,179,90', 0.28 * (0.4 + 0.6 * front));
    else if (v === 2) add('light2', 5, '111,233,255', 0.3 * front);
    else add('light3', 7, '111,233,255', 0.26 * (0.4 + 0.6 * front));
  }

  const mk = (v, st, at) => (f) => {
    const x = { animTime: at, stateTime: 0.6, state: st, facing: f, variant: v, vx: 0, vy: 0 };
    if (st === 'walk') { x.vx = Math.cos(f) * 48; x.vy = Math.sin(f) * 48; }
    return x;
  };
  const demos = [];
  const NAMES = ['sobrevivente', 'comerciante', 'combatente', 'jovem'];
  for (let v = 0; v < 4; v++) {
    demos.push({ label: NAMES[v] + ' idle', e: mk(v, 'idle', 1.3) });
    demos.push({ label: NAMES[v] + ' walk', e: mk(v, 'walk', 0.11) });
    demos.push({ label: NAMES[v] + ' talk', e: mk(v, 'talk', 0.7) });
    demos.push({ label: NAMES[v] + ' fear', e: mk(v, 'fear', 0.4) });
  }

  MODELS3D.civil = { build, pose, glows, demos };
})();
