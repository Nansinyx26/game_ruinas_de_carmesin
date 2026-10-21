// ---------------------------------------------------------------------------
// ANCIÃ DESCONECTADA — líder dos Desconectados (NPC neutro do Refúgio).
// Idosa (~48) levemente curvada, manto em camadas remendado (xale escuro, poncho
// marrom, saia longa), capuz abaixado nas costas, trança grisalha grossa sobre o
// ombro, colar de peças eletrônicas antigas, fone/implante com LED ciano na orelha
// e um CAJADO de cano e fios com uma lamparina âmbar pendurada no topo.
// O cajado não é filho da mão: a pose calcula onde a mão está (cinemática direta)
// e faz o cajado atravessá-la, apoiado no chão (ou erguido no medo); a lamparina
// fica sempre pendurada na vertical, balançando.
// e = { animTime, stateTime, state: 'idle'|'walk'|'talk'|'fear', facing }
// Referencial: +X frente, +Y direita, +Z cima; origem nos pés.
// ---------------------------------------------------------------------------
(function () {
  const PI = Math.PI, TAU = PI * 2;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : (d || 0));
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ss = (k) => { k = cl(k, 0, 1); return k * k * (3 - 2 * k); };
  const mix = (a, b, k) => a + (b - a) * k;

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
    if (o.tip) { for (let i = 0; i < L.length; i++) g.tri(L[i], L[(i + 1) % L.length], o.tip, o.tipCf ? o.tipCf(i) : (o.tipCol || col), e); }
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
  // Tira ao longo de um caminho (seção retangular perpendicular ao caminho): tranças e cabos
  function sweep(g, pts, wd, col, e, cf) {
    const R = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
      const L = Math.hypot(tx, ty, tz) || 1; tx /= L; ty /= L; tz /= L;
      // eixo lateral ~ horizontal, perpendicular ao caminho
      let ux = -ty, uy = tx, uz = 0, ul = Math.hypot(ux, uy);
      if (ul < 1e-3) { ux = 0; uy = 1; ul = 1; }
      ux /= ul; uy /= ul;
      const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
      const w = wd[k], p = pts[k];
      R.push([[p[0] + ux * w + vx * w, p[1] + uy * w + vy * w, p[2] + vz * w], [p[0] - ux * w + vx * w, p[1] - uy * w + vy * w, p[2] + vz * w],
        [p[0] - ux * w - vx * w, p[1] - uy * w - vy * w, p[2] - vz * w], [p[0] + ux * w - vx * w, p[1] + uy * w - vy * w, p[2] - vz * w]]);
    }
    return loft(g, R, col, e, { cf });
  }

  // ------------------------------------------------------------ paleta
  const C = {
    skin: '#a07860', skinD: '#87634e', lip: '#7a5444', eye: '#1a1210', hair: '#9c978f', hairD: '#6f6b65',
    poncho: '#4a3a2c', ponchoL: '#5a4634', patchG: '#3d3c38', patchR: '#5a3028', shawl: '#2e2620', robe: '#352b24',
    sleeve: '#3b2f25', boot: '#1d1a17', cord: '#191714', pcb: '#24402c', pcbL: '#3c6a48', capB: '#2c4a78', copper: '#9a6436',
    pipe: '#5c6168', pipeD: '#3e4248', wire: '#8a3a2a', wireB: '#22252a', wrap: '#6a5540', lampM: '#3a3027',
    cyan: '#6fe9ff', amber: '#ffb35a', green: '#7dff9a',
  };

  // ------------------------------------------------------------ dimensões
  const HIPZ = 22.5, SPZ = 24.2, SHX = -0.6, SHY = 5.3, SHZ = 11.0, LUA = 8.4, LFA = 7.4;
  const STAFF = 59, HY = 0.62, HOOK = [4.6 * Math.cos(HY), 4.6 * Math.sin(HY), STAFF - 0.6];
  const HAND = [0.3, 0, -LFA - 0.9];

  // ------------------------------------------------------------ geometria
  function gSkirt() {
    const g = new G3();
    const hem = [0, -0.5, 0.3, -0.4, 0.2, 0.5, -0.3, 0.4];
    loft(g, [ring(-21.0, 6.3, 6.8, 7.0, 8, 0.2, 0, undefined, hem), ring(-10.0, 5.2, 5.8, 6.2, 8, -0.2), ring(1.8, 3.7, 4.1, 5.2, 8)], C.robe, 0,
      { cf: (k, i) => (k === 0 && i === 2 ? [C.shawl, 0] : k === 1 && i === 6 ? [C.patchG, 0] : null) });
    return g;
  }
  function gBoot() {
    return bx(new G3(), 0.9, 0, 1.0, 4.4, 2.6, 2.2, C.boot, 0, { b: false, t: false, tx: 0.7, sh: [-0.6, 0] });
  }
  function gPoncho() {
    const g = new G3();
    // barra em bico na frente e atrás, ombros caídos, corcunda nas costas
    const hem = [-1.8, 0.9, 0.9, -1.2, -1.2, 0.9, 0.9, -1.8];
    const sh = [0, -0.9, -0.9, 0, 0, -0.9, -0.9, 0];
    const R = [ring(-8.0, 5.7, 6.2, 7.4, 8, 0.3, 0, undefined, hem), ring(5.5, 4.4, 5.5, 6.6, 8, 0, 0), ring(11.0, 3.4, 4.7, 6.0, 8, -0.3, 0, undefined, sh), ring(13.4, 2.0, 2.3, 2.5, 8, 0.2)];
    loft(g, R, C.poncho, 0, { cf: (k, i) => (k === 0 && (i === 1 || i === 6) ? [C.ponchoL, 0] : k === 0 && i === 3 ? [C.patchG, 0] : null) });
    // remendos costurados
    const P = (a, b, c, d, col) => g.quad(a, b, c, d, col, 0);
    P([5.55, -4.6, -4.6], [5.25, -2.0, -4.9], [4.9, -1.9, -1.2], [5.15, -4.4, -0.9], C.patchR);
    P([-5.75, 1.6, -1.0], [-5.6, 4.6, -0.6], [-5.35, 4.4, 2.6], [-5.5, 1.7, 2.3], C.patchG);
    return g;
  }
  function gShawl() {
    const g = new G3();
    const jag = [-0.6, 0.3, -0.4, 0.5, -0.2, 0.4, -0.5, 0.2];
    loft(g, [ring(7.2, 5.0, 5.9, 7.4, 8, 0, 0, undefined, jag), ring(11.2, 4.0, 5.3, 6.7, 8, -0.3, 0), ring(13.7, 2.45, 2.7, 2.85, 8, 0.25)], C.shawl, 0);
    // capuz abaixado, embolado nas costas
    sweep(g, [[1.2, -4.3, 12.9], [-2.6, -4.1, 13.6], [-4.7, 0, 13.2], [-2.6, 4.1, 13.6], [1.2, 4.3, 12.9]], [0.9, 1.25, 1.4, 1.25, 0.9], C.poncho, 0,
      (k, i) => (i === 2 ? [C.ponchoL, 0] : null));
    bx(g, -5.9, 0, 9.6, 1.6, 6.0, 4.6, C.poncho, 0, { t: false, b: false, f: false, tx: 1.5, ty: 0.75, sh: [0.5, 0], k: [C.ponchoL, 0] });
    return g;
  }
  function gNecklace() {
    const g = new G3();
    // cordão em V e pingentes: placa de circuito, capacitor, bobina de cobre e um LED fraco
    const cord = (a, b) => g.quad([a[0], a[1] - 0.18, a[2]], [a[0], a[1] + 0.18, a[2]], [b[0], b[1] + 0.18, b[2]], [b[0], b[1] - 0.18, b[2]], C.cord, 0);
    cord([2.6, -2.1, 13.4], [4.75, -0.5, 9.4]); cord([2.6, 2.1, 13.4], [4.75, 0.5, 9.4]);
    bx(g, 4.85, 0, 8.6, 0.25, 2.0, 1.7, C.pcb, 0, { b: false, k: false, l: false, r: false, f: [C.pcbL, 0] });
    g.quad([5.0, 0.35, 8.7], [5.0, 0.75, 8.7], [5.0, 0.75, 9.05], [5.0, 0.35, 9.05], C.green, 0.7);
    g.at(4.95, -1.65, 9.9, 0.4, 0, 0); g.cyl(0, 0, -0.8, 0.42, 0.42, 1.6, 5, C.capB, 0, { caps: false }); g.at();
    bx(g, 4.9, 1.6, 10.0, 0.6, 0.9, 0.9, C.copper, 0, { b: false, k: false });
    return g;
  }
  function gHead() {
    const g = new G3();
    // pescoço -> queixo -> têmporas; faces laterais mais escuras sugerem rugas e maçãs fundas
    loft(g, [ring(-1.0, 1.35, 1.5, 1.45, 6, -0.2), ring(2.0, 2.4, 2.15, 2.4, 6, 0.4), ring(6.2, 3.1, 3.15, 2.95, 6, -0.1)], C.skin, 0,
      { cf: (k, i) => (k === 1 && (i === 0 || i === 4) ? [C.skinD, 0] : k === 0 && i === 5 ? [C.lip, 0] : null) });
    for (const y of [-0.85, 0.85]) {
      bx(g, 2.74, y, 4.2, 0.3, 0.75, 0.35, C.eye, 0, { b: false, k: false, t: false, l: false, r: false });
      bx(g, 2.8, y * 1.05, 4.75, 0.3, 1.1, 0.3, C.hairD, 0, { b: false, k: false, t: false, l: false, r: false });
    }
    // nariz
    g.tri([2.75, -0.45, 3.0], [2.75, 0.45, 3.0], [3.55, 0, 3.15], C.skinD, 0);
    g.tri([2.75, -0.45, 3.0], [3.55, 0, 3.15], [2.85, 0, 4.4], C.skin, 0);
    g.tri([2.75, 0.45, 3.0], [3.55, 0, 3.15], [2.85, 0, 4.4], C.skin, 0);
    return g;
  }
  function gHair() {
    const g = new G3();
    // cabelo puxado para trás (testa livre, desce na nuca)
    loft(g, [ring(4.5, 3.3, 3.45, 3.2, 6, -0.15, 0, undefined, [1.5, -0.9, -2.6, -2.6, -0.9, 1.5]), ring(7.3, 2.75, 3.2, 2.85, 6, -0.35)], C.hair, 0,
      { tip: [-0.8, 0, 8.4], cf: (k, i) => (i % 2 ? [C.hairD, 0] : null), tipCf: (i) => (i % 2 ? C.hairD : C.hair) });
    // nó da trança atrás da orelha esquerda
    bx(g, -2.3, -1.7, 2.6, 2.2, 2.0, 2.2, C.hair, 0, { b: false });
    return g;
  }
  function gBraid() {
    // da nuca, por cima do ombro esquerdo, até a cintura na frente
    const P = [[-1.9, -2.0, 16.3], [-0.6, -4.0, 14.2], [2.2, -4.5, 12.4], [4.5, -3.8, 8.4], [5.4, -3.4, 4.2]];
    const W = [0.85, 1.05, 0.95, 0.9, 0.7];
    const g = new G3();
    sweep(g, P, W, C.hair, 0, (k, i) => ((k + i) % 2 ? [C.hairD, 0] : null));
    // laço de couro e pontinha
    const e0 = P[4];
    bx(g, e0[0] + 0.2, e0[1], e0[2] - 0.7, 1.5, 1.6, 1.0, C.patchR, 0, { b: false, t: false });
    g.at(e0[0] + 0.25, e0[1], e0[2] - 1.2); g.cyl(0, 0, 0, 0.75, 0, -2.0, 4, C.hairD, 0, { caps: false }); g.at();
    return g;
  }
  function gEar() {
    const g = new G3();
    // fone/implante na orelha direita com LED ciano e haste curta até a bochecha
    bx(g, -0.2, 3.0, 3.5, 1.3, 0.7, 1.6, '#2a2d31', 0, { b: false, l: false });
    g.quad([-0.5, 3.37, 3.15], [0.1, 3.37, 3.15], [0.1, 3.37, 3.85], [-0.5, 3.37, 3.85], C.cyan, 1.1);
    g.quad([0.3, 3.0, 3.0], [0.3, 3.2, 3.2], [2.2, 2.55, 2.0], [2.2, 2.35, 1.8], '#2a2d31', 0);
    return g;
  }
  function gUpper() {
    return loft(new G3(), [rect(-LUA - 0.2, 1.55, 1.55), rect(1.2, 2.0, 2.0)], C.sleeve, 0);
  }
  function gFore() {
    const g = new G3();
    // manga larga (boca de sino) e a mão
    loft(g, [rect(0.4, 1.55, 1.55), rect(-LFA + 1.0, 1.95, 2.05, 0.1)], C.sleeve, 0);
    bx(g, 0.3, 0, -LFA - 0.6, 1.5, 1.9, 2.8, C.skin, 0, { t: false, b: false });
    return g;
  }
  function gStaff() {
    const g = new G3();
    g.cyl(0, 0, 0, 0.62, 0.55, STAFF, 5, C.pipe, 0, { caps: false });
    g.cyl(0, 0, 19.0, 0.95, 0.95, 1.6, 5, C.pipeD, 0, { caps: false });
    g.cyl(0, 0, 41.0, 0.95, 0.95, 1.6, 5, C.pipeD, 0, { caps: false });
    g.cyl(0, 0, 25.0, 0.85, 0.85, 5.0, 5, C.wrap, 0, { caps: false });
    // cotovelo e braço horizontal com gancho
    bx(g, 0, 0, STAFF + 0.1, 1.6, 1.6, 1.6, C.pipeD, 0, { b: false });
    g.at(0, 0, 0, 0, 0, HY);
    bx(g, 2.6, 0, STAFF + 0.1, 3.8, 0.8, 0.8, C.pipe, 0, { f: false, k: false });
    bx(g, 4.6, 0, STAFF - 0.2, 0.45, 0.45, 1.4, C.wireB, 0, { t: false, b: false });
    g.at();
    // fio enrolado em espiral
    const H = [];
    for (let k = 0; k <= 5; k++) { const a = k * 2.1, z = 8 + k * 9.4; H.push([Math.cos(a) * 0.82, Math.sin(a) * 0.82, z]); }
    g.tube(H, 0.2, 3, C.wire, 0);
    // fio solto pendurado do cotovelo
    g.tube([[-0.6, 0.5, STAFF], [-1.2, 1.0, STAFF - 4.5]], 0.16, 3, C.wireB, 0);
    return g;
  }
  function gLamp() {
    const g = new G3();
    g.quad([-0.1, 0, 0], [0.1, 0, 0], [0.1, 0, -1.3], [-0.1, 0, -1.3], C.cord, 0);
    g.quad([0, -0.1, 0], [0, 0.1, 0], [0, 0.1, -1.3], [0, -0.1, -1.3], C.cord, 0);
    bx(g, 0, 0, -1.7, 2.1, 2.1, 0.8, C.lampM, 0, { b: false, tx: 0.35, ty: 0.35 });
    bx(g, 0, 0, -3.3, 1.6, 1.6, 2.4, C.amber, 1.1, { t: false, b: false });
    bx(g, 0, 0, -4.8, 2.1, 2.1, 0.6, C.lampM, 0, { b: false });
    return g;
  }

  // ------------------------------------------------------------ montagem
  function build() {
    const root = new N3('root');
    const body = root.add(new N3('body'));
    const hips = body.add(new N3('hips'));
    hips.p = [0, 0, HIPZ];
    hips.add(new N3('skirt', gSkirt()));
    for (const nm of ['L', 'R']) body.add(new N3('foot' + nm, gBoot()));
    const spine = body.add(new N3('spine', gPoncho()));
    spine.p = [0, 0, SPZ];
    spine.add(new N3('shawl', gShawl()));
    spine.add(new N3('necklace', gNecklace()));
    spine.add(new N3('braid', gBraid()));
    const head = spine.add(new N3('head', gHead()));
    head.p = [0.5, 0, 14.0];
    head.add(new N3('hair', gHair()));
    head.add(new N3('ear', gEar()));
    for (const [s, nm] of [[-1, 'L'], [1, 'R']]) {
      const ua = spine.add(new N3('arm' + nm, gUpper()));
      ua.p = [SHX, s * SHY, SHZ];
      const fa = ua.add(new N3('fore' + nm, gFore()));
      fa.p = [0, 0, -LUA];
    }
    body.add(new N3('staff', gStaff()));
    body.add(new N3('lamp', gLamp()));
    const m = new Model3(root);
    m.anchor('head', 'head', [-0.3, 0, 9.4]);
    m.anchor('lamp', 'lamp', [0, 0, -3.3]);
    m.anchor('led', 'ear', [-0.2, 3.5, 3.5]);
    return m;
  }

  // ------------------------------------------------------------ cinemática direta da mão do cajado
  const MS = [], tmp = { p: [0, 0, 0] };
  for (let i = 0; i < 5; i++) MS.push(M3.make ? M3.make() : new Float32Array(12));
  function nodeM(o, n) { return M3.trs(o, n.p, n.r, n.s); }
  function xf(m, v, out) {
    out[0] = m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3];
    out[1] = m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7];
    out[2] = m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11];
    return out;
  }
  // Posição (no referencial do modelo) da mão direita
  function handPos(n, out) {
    const [a, b, c, d, w] = MS;
    nodeM(a, n.body); nodeM(b, n.spine); M3.mul(w, a, b);
    nodeM(c, n.armR); M3.mul(d, w, c);
    nodeM(a, n.foreR); M3.mul(b, d, a);
    return xf(b, HAND, out);
  }

  // ------------------------------------------------------------ pose
  const H = [0, 0, 0], HK = [0, 0, 0];
  function pose(m, e) {
    const n = m.nodes;
    e = e || {};
    const t = num(e.animTime), st = e.state, sT = Math.max(0, num(e.stateTime));
    const br = Math.sin(t * 1.9);
    const sp = n.spine, hd = n.head, aL = n.armL, aR = n.armR, fL = n.foreL, fR = n.foreR;
    let hipZ = HIPZ, spX = 0, footL = 0.7, footR = -0.4, liftL = 0, liftR = 0;
    // cajado: inclinação (frente/lado), altura do pé do cajado e "pegada" fixa (fear)
    let tilt = 0.05, tiltR = -0.04, lift = 0, grip = -1, swA = 0.07 * Math.sin(t * 1.7), swB = 0.05 * Math.sin(t * 1.25 + 0.7), lampE = 1 + 0.06 * Math.sin(t * 7.3);
    // repouso: curvada, mão direita no cajado, esquerda junto ao corpo
    sp.r[1] = 0.2; hd.r[1] = -0.16;
    aR.r[0] = 0.36; aR.r[1] = -0.35; fR.r[1] = -1.05; fR.r[0] = -0.12;
    aL.r[0] = -0.12; aL.r[1] = 0.05; fL.r[1] = -0.55; fL.r[0] = 0.15;
    if (st === 'walk') {
      const ph = t * 1.05 * TAU, S = 3.0;
      const sw = (p) => {
        p -= Math.floor(p);
        if (p < 0.5) return [S - (p / 0.5) * 2 * S, 0];
        const q = (p - 0.5) / 0.5;
        return [-S + ss(q) * 2 * S, Math.sin(q * PI) * 1.6];
      };
      const pL = sw(t * 1.05), pR = sw(t * 1.05 + 0.5);
      footL = pL[0]; liftL = pL[1]; footR = pR[0]; liftR = pR[1];
      hipZ = HIPZ - 0.5 + Math.abs(Math.cos(ph)) * 0.5;
      sp.r[1] = 0.24; sp.r[2] = Math.sin(ph) * 0.06;
      n.skirt.r[1] = -Math.cos(ph) * 0.035; n.skirt.r[0] = Math.sin(ph) * 0.03;
      aL.r[1] = 0.05 + Math.sin(ph) * 0.25; fL.r[1] = -0.6;
      aR.r[1] = -0.4 - Math.sin(ph) * 0.18;
      tilt = 0.06 - Math.sin(ph) * 0.12; lift = Math.max(0, -Math.sin(ph)) * 2.0;
      swA = 0.06 * Math.sin(ph + 1.2) - (tilt - 0.06) * 0.6;
      hd.r[2] = -Math.sin(ph) * 0.05;
    } else if (st === 'talk') {
      // apoia-se no cajado e gesticula com a mão esquerda
      const g1 = Math.sin(t * 2.7), g2 = Math.sin(t * 4.1 + 0.8), g3 = Math.sin(t * 1.3);
      sp.r[1] = 0.27; sp.r[2] = -0.08 + 0.03 * g3; spX = 0.6;
      sp.s[2] = 1 + br * 0.008;
      aR.r[1] = -0.62; aR.r[0] = 0.32; fR.r[1] = -0.75;
      tilt = 0.12;
      aL.r[1] = -0.75 - 0.22 * g1; aL.r[0] = -0.38 - 0.08 * g2;
      fL.r[1] = -0.95 - 0.35 * g2; fL.r[0] = 0.35; fL.r[2] = -0.3;
      hd.r[1] = -0.2 + 0.07 * Math.sin(t * 3.6); hd.r[2] = -0.12 + 0.08 * g3; hd.r[0] = -0.04 * g1;
    } else if (st === 'fear') {
      // firme: endireita-se e ergue o cajado; a lamparina se aviva
      const k = ss(sT / 0.45);
      sp.r[1] = mix(0.2, 0.02, k); hd.r[1] = mix(-0.16, -0.12, k);
      aR.r[1] = mix(-0.35, -2.55, k); aR.r[0] = mix(0.36, 0.32, k); fR.r[1] = mix(-1.05, -0.35, k); fR.r[0] = 0;
      aL.r[1] = mix(0.05, -1.3, k); aL.r[0] = mix(-0.12, -0.42, k); fL.r[1] = mix(-0.55, -0.3, k); fL.r[0] = 0.2;
      footL = mix(0.7, 3.4, k); footR = mix(-0.4, -2.6, k); hipZ = HIPZ - 0.6 * k;
      grip = mix(-1, 17, k); tilt = mix(0.05, 0.2, k); tiltR = mix(-0.04, -0.12, k);
      swA = 0.16 * Math.sin(t * 2.6) * k + swA * (1 - k); swB = 0.1 * Math.sin(t * 2.1 + 0.5);
      lampE = 1 + 0.6 * k + 0.12 * Math.sin(t * 13.0) * k;
      hd.r[2] = 0.04 * Math.sin(t * 0.9);
    } else {
      // idle: respiração lenta, olha em volta devagar
      sp.s[2] = 1 + br * 0.01; sp.r[1] = 0.2 + br * 0.012;
      hd.r[2] = Math.sin(t * 0.5) * 0.32 + Math.sin(t * 1.15) * 0.07;
      hd.r[1] = -0.16 + Math.sin(t * 0.7 + 1) * 0.05;
      fL.r[1] = -0.55 + br * 0.03;
    }
    n.hips.p[2] = hipZ; n.hips.p[0] = spX * 0.3;
    sp.p[0] = spX; sp.p[2] = hipZ + (SPZ - HIPZ);
    n.footL.p[0] = footL; n.footL.p[1] = -2.6; n.footL.p[2] = liftL;
    n.footR.p[0] = footR; n.footR.p[1] = 2.6; n.footR.p[2] = liftR;
    // cajado atravessando a mão direita
    handPos(n, H);
    const th = tilt, ph = tiltR, ux = Math.sin(th) * Math.cos(ph), uy = -Math.sin(ph), uz = Math.cos(th) * Math.cos(ph);
    const g = grip >= 0 ? grip : (H[2] - lift) / Math.max(0.3, uz);
    const S = n.staff;
    S.p[0] = H[0] - ux * g; S.p[1] = H[1] - uy * g; S.p[2] = H[2] - uz * g;
    S.r[0] = ph; S.r[1] = th; S.r[2] = 0;
    // lamparina pendurada no gancho, sempre na vertical
    xf(nodeM(MS[4], S), HOOK, HK);
    const L = n.lamp;
    L.p[0] = HK[0]; L.p[1] = HK[1]; L.p[2] = HK[2];
    L.r[0] = swB; L.r[1] = swA; L.r[2] = 0;
    L.emi = lampE;
  }

  function glows(e, add) {
    if (!e) return;
    const t = num(e.animTime), f = num(e.facing);
    const fear = e.state === 'fear' ? ss(num(e.stateTime) / 0.45) : 0;
    add('lamp', 16 + 6 * fear, '255,180,90', 0.42 + 0.2 * fear + 0.04 * Math.sin(t * 7.3));
    // LED da orelha direita: visível quando o lado direito está voltado para a câmera
    const side = cl(0.35 + 0.65 * (Math.cos(f) - Math.sin(f)) * 0.7071, 0.1, 1);
    add('led', 4, '111,233,255', 0.28 * side);
  }

  const mk = (st, at, sT) => (f) => ({ animTime: at, stateTime: sT === undefined ? 1.2 : sT, state: st, facing: f });
  MODELS3D.ancia = {
    build, pose, glows,
    demos: [
      { label: 'idle', e: mk('idle', 1.3) },
      { label: 'walk', e: mk('walk', 0.15) },
      { label: 'walk b', e: mk('walk', 0.62) },
      { label: 'talk', e: mk('talk', 0.7) },
      { label: 'fear', e: mk('fear', 0.5) },
      { label: 'fear (subindo)', e: mk('fear', 0.2, 0.15) },
    ],
  };
})();
