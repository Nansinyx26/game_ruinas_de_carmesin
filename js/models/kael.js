// ---------------------------------------------------------------------------
// KAEL VEYRON (3D) e a espada TEMPESTADE NULA
// Rig: 'fall' (queda na morte) → 'body' (pivô nos pés) → quadril com as abas do
// casaco longo, tronco/cabeça, braços e pernas resolvidos por IK de dois ossos
// (alvos de mão/pé no referencial do corpo) e a espada como nó livre na mão
// direita. Fiel à arte conceito: alto e esguio, pernas longas, cabelo preto
// volumoso com franja sobre os olhos, rosto oliva com olhos cinzentos, capuz
// abaixado amontoado na nuca, gola alta, casaco negro rasgado até os tornozelos,
// tiras com fivelas quadradas prateadas (peito, mangas, cinto, coxas, botas).
// ---------------------------------------------------------------------------

// Geometria da Tempestade Nula: guarda na origem, lâmina ao longo de +X,
// largura da lâmina em Z, faces planas voltadas para ±Y. k = escala.
// part: 'blade' (só lâmina + veias), 'hilt' (guarda, runa, cabo e pomo) ou tudo.
// lod: 1 = completo (tela de título), 0 = versão leve (na mão do Kael)
function buildTempestadeNula(g, k, part, lod) {
  k = k || 1;
  lod = lod === undefined ? 1 : lod;
  const BL = '#101117', BL2 = '#16181f', BEV = '#272b35', EDGE = '#5a6272', VEIN = '#4da3ff', VEIN2 = '#9fd0ff';
  const GUARD = '#1d2028', GUARD2 = '#2c303b', GEDGE = '#5d6577', GRIP = '#101116', WRAP = '#262a33';
  const doBlade = !part || part === 'blade', doHilt = !part || part === 'hilt';
  g.at(0, 0, 0, 0, 0, 0, k, k, k);
  if (doBlade) {
    // Estações [u, meia-largura]: talão com entalhe junto à guarda, lâmina larga afinando até a ponta
    const st = lod ? [[0.4, 2.5], [2.6, 3.5], [4.4, 2.7], [6.6, 3.4], [19, 3.2], [32, 2.85], [41.5, 2.2], [47.5, 1.25], [52, 0]]
      : [[0.4, 1.95], [2.6, 2.65], [4.4, 2.1], [6.6, 2.6], [27, 2.35], [44, 1.5], [52, 0]];
    const T = 0.62;
    const th = (w) => T * Math.min(1, w / 2.0);
    // Seção losangular: nervura central (preta) → bisel (cinza) → fio prateado
    for (const s of [1, -1]) {
      for (const f of [1, -1]) {
        for (let i = 0; i < st.length - 1; i++) {
          const a = st[i], b = st[i + 1];
          const ia = Math.max(0, a[1] - 0.75), ib = Math.max(0, b[1] - 0.75);
          const Ra = [a[0], f * th(a[1]), 0], Rb = [b[0], f * th(b[1]), 0];
          const Ia = [a[0], f * th(a[1]) * 0.3, s * ia], Ib = [b[0], f * th(b[1]) * 0.3, s * ib];
          const Ea = [a[0], 0, s * a[1]], Eb = [b[0], 0, s * b[1]];
          g.quad(Ra, Rb, Ib, Ia, (i + (s > 0 ? 0 : 1)) % 2 ? BL2 : BL, 0);
          g.quad(Ia, Ib, Eb, Ea, i < 3 ? BEV : EDGE, 0);
        }
      }
    }
    const a0 = st[0];
    g.quad([a0[0], 0, a0[1]], [a0[0], th(a0[1]), 0], [a0[0], 0, -a0[1]], [a0[0], -th(a0[1]), 0], BL, 0);
    // Veias de energia em zigue-zague pelo centro (nas duas faces) + ramificações
    const zig = lod ? [[1.0, 0], [5.0, 1.1], [9.5, -0.9], [14, 1.0], [18.5, -1.1], [23, 0.9], [27.5, -1.0], [32, 0.95], [36.5, -0.8], [40.5, 0.6], [44.5, -0.35], [48.5, 0]]
      : [[1.0, 0], [6.5, 1.1], [13, -1.0], [19.5, 1.05], [26, -0.95], [32.5, 0.9], [39, -0.7], [44.5, 0.3], [48.5, 0]];
    const br = lod ? [[3, [17, 2.3]], [4, [21, -2.2]], [6, [30.5, -2.1]], [7, [34.5, 1.9]], [9, [43, 1.3]], [1, [8, 2.3]]]
      : [[2, [16.5, -1.7]], [4, [29.5, -1.5]], [5, [36, 1.4]]];
    if (!lod) for (const z of zig) z[1] *= 0.8;
    const wAt = (u) => { for (let i = 0; i < st.length - 1; i++) if (u <= st[i + 1][0]) { const q = (u - st[i][0]) / (st[i + 1][0] - st[i][0]); return st[i][1] + (st[i + 1][1] - st[i][1]) * q; } return 0; };
    // A face da lâmina vai da nervura (y = th) ao bisel (y = 0.3·th): a veia acompanha essa inclinação
    const yOn = (u, v, f) => { const w = wAt(u), iw = Math.max(0.3, w - 0.75), q = Math.min(1, Math.abs(v) / iw); return f * (th(w) * (1 - 0.7 * q) + 0.24); };
    const strip = (p, q, hw, f, col, e) => {
      const du = q[0] - p[0], dv = q[1] - p[1], L = Math.hypot(du, dv) || 1;
      const nu = -dv / L * hw, nv = du / L * hw, ex = du / L * hw * 0.9, ev = dv / L * hw * 0.9;
      p = [p[0] - ex, p[1] - ev]; q = [q[0] + ex, q[1] + ev];
      g.quad([p[0] + nu, yOn(p[0] + nu, p[1] + nv, f), p[1] + nv], [q[0] + nu, yOn(q[0] + nu, q[1] + nv, f), q[1] + nv],
        [q[0] - nu, yOn(q[0] - nu, q[1] - nv, f), q[1] - nv], [p[0] - nu, yOn(p[0] - nu, p[1] - nv, f), p[1] - nv], col, e);
    };
    for (const f of [1, -1]) {
      for (let i = 0; i < zig.length - 1; i++) strip(zig[i], zig[i + 1], lod ? 0.3 : 0.34, f, VEIN, 1);
      for (const b of br) strip(zig[b[0]], b[1], lod ? 0.19 : 0.2, f, VEIN, 0.9);
    }
  }
  if (doHilt) {
    // Guarda angular: peça central em losango apontando sobre a lâmina, braços pontudos inclinados para o cabo
    g.extrude([[4.4, 0], [0.4, 2.5], [-2.8, 0], [0.4, -2.5]], 3.0, GUARD2, 0, { edgeCol: GEDGE });
    for (const s of [1, -1]) {
      g.extrude([[1.2, s * 1.7], [1.0, s * 3.5], [-2.2, s * 6.0], [-1.3, s * 3.4], [-1.1, s * 1.9]], 2.0, GUARD, 0, { edgeCol: GEDGE });
      if (lod) g.extrude([[0.8, s * 1.4], [3.4, s * 3.0], [1.0, s * 2.7]], 1.4, GUARD, 0, { edgeCol: GEDGE });
    }
    // Runa azul em losango no centro (atravessa a guarda, visível dos dois lados); filete claro só no modelo grande
    g.extrude([[2.3, 0], [0.2, 1.0], [-1.9, 0], [0.2, -1.0]], 3.3, '#2f7fe8', 0.8);
    if (lod) g.extrude([[0.25, 0], [0.12, 1.1], [-0.02, 0], [0.12, -1.1]], 3.42, VEIN2, 0.9);
    // Cabo trançado (anéis alternados)
    g.cyl(-11.6, 0, 0, 1.05, 1.0, 10.6, 6, GRIP, 0, { axis: 'x', caps: false });
    const nw = lod ? 4 : 2;
    for (let i = 0; i < nw; i++) g.cyl(-10.6 + i * (9 / nw), 0, 0, 1.3, 1.3, 1.1, lod ? 6 : 4, WRAP, 0, { axis: 'x', rot: (i % 2) * 0.5, caps: false });
    // Pomo: anel + cristal pontudo
    if (lod) g.cyl(-12.9, 0, 0, 1.6, 1.6, 1.3, 6, GUARD2, 0, { axis: 'x', rot: Math.PI / 4 });
    g.cyl(-14.4, 0, 0, 1.25, 1.6, 1.5, 4, GUARD, 0, { axis: 'x', caps: false, rot: Math.PI / 4 });
    g.cyl(-17.6, 0, 0, 0, 1.25, 3.2, 4, '#3d7fe0', 0.85, { axis: 'x', caps: false, rot: Math.PI / 4 });
  }
  g.at();
  return g;
}

(function () {
  const PI = Math.PI, TWO = PI * 2;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;
  const eoc = (t) => 1 - Math.pow(1 - t, 3);
  const smooth = (t) => t * t * (3 - 2 * t);
  const adiff = (a, b) => { let d = (b - a) % TWO; if (d > PI) d -= TWO; else if (d < -PI) d += TWO; return d; };
  const set3 = (o, x, y, z) => { o[0] = x; o[1] = y; o[2] = z; return o; };

  // Paleta da arte conceito: preto quase puro, sombras, realces cinza-escuro, fivelas prateadas
  const C = {
    // bases levemente quentes/neutras: depois do ambiente e do contraluz azulados o casaco lê como preto neutro
    coat: '#121113', coatHi: '#2e2c2f', coatMid: '#1c1b1e', coatDark: '#09090a', lining: '#040405', hood: '#17161a', shirt: '#0e0d0f',
    strap: '#211f22', buckle: '#9aa0aa', pants: '#121113', boot: '#0c0b0d', sole: '#050506', lace: '#2c2a2d',
    skin: '#b08870', skinShade: '#8a6553', lip: '#5e4034', eyeW: '#b4b9c2', iris: '#808a98', lash: '#060608',
    hair: '#09090b', hair2: '#131418', hair3: '#22232a', glove: '#0d0e11', mark: '#3d8bff',
  };

  // ------------------------------------------------------------- utilitários de geometria
  // Mecha de cabelo: pirâmide curva (base → meio → ponta), crista voltada para fora da cabeça
  const HC = [-0.6, 0, 9.0];
  function lock(g, b, m, t, w, d, col) {
    const ox = b[0] - HC[0], oy = b[1] - HC[1], oz = b[2] - HC[2];
    const rings = [];
    for (let k = 0; k < 2; k++) {
      const p = k ? m : b, q = k ? t : m;
      let ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2];
      const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
      let px = ox, py = oy, pz = oz;
      const pd = px * ux + py * uy + pz * uz; px -= pd * ux; py -= pd * uy; pz -= pd * uz;
      let pl = Math.hypot(px, py, pz);
      if (pl < 1e-3) { px = -uy; py = ux; pz = 0; pl = Math.hypot(px, py, pz) || 1; }
      px /= pl; py /= pl; pz /= pl;
      const qx = uy * pz - uz * py, qy = uz * px - ux * pz, qz = ux * py - uy * px;
      const sw = k ? w * 0.62 : w, sd = k ? d * 0.7 : d;
      rings.push([[p[0] + qx * sw - px * sd * 0.4, p[1] + qy * sw - py * sd * 0.4, p[2] + qz * sw - pz * sd * 0.4], [p[0] + px * sd, p[1] + py * sd, p[2] + pz * sd],
        [p[0] - qx * sw - px * sd * 0.4, p[1] - qy * sw - py * sd * 0.4, p[2] - qz * sw - pz * sd * 0.4]]);
    }
    const A = rings[0], B = rings[1];
    for (let i = 0; i < 3; i++) { const j = (i + 1) % 3; g.quad(A[i], A[j], B[j], B[i], i === 2 ? C.hair : (i ? C.hair2 : col)); }
    for (let i = 0; i < 3; i++) g.tri(B[i], B[(i + 1) % 3], t, i === 2 ? C.hair : (i ? C.hair2 : col));
  }
  // Faixa: só as 4 laterais de uma caixa (tiras, braçadeiras)
  function band(g, x, y, z, sx, sy, sz, col, e = 0) {
    const hx = sx / 2, hy = sy / 2, z0 = z - sz / 2, z1 = z + sz / 2;
    const b = [[x - hx, y - hy], [x + hx, y - hy], [x + hx, y + hy], [x - hx, y + hy]];
    for (let i = 0; i < 4; i++) { const p = b[i], q = b[(i + 1) % 4]; g.quad([p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1], col, e); }
  }
  // Placa (um quad) perpendicular ao eixo indicado
  function plate(g, ax, x, y, z, su, sv, col, e = 0) {
    const a = su / 2, b = sv / 2;
    if (ax === 'x') g.quad([x, y - a, z - b], [x, y + a, z - b], [x, y + a, z + b], [x, y - a, z + b], col, e);
    else if (ax === 'y') g.quad([x - a, y, z - b], [x + a, y, z - b], [x + a, y, z + b], [x - a, y, z + b], col, e);
    else g.quad([x - a, y - b, z], [x + a, y - b, z], [x + a, y + b, z], [x - a, y + b, z], col, e);
  }
  // Fivela quadrada: moldura prateada com centro escuro
  function buckle(g, ax, x, y, z, s, sgn = 1) {
    plate(g, ax, x, y, z, s, s, C.buckle);
    const o = 0.05 * sgn;
    plate(g, ax, ax === 'x' ? x + o : x, ax === 'y' ? y + o : y, ax === 'z' ? z + o : z, s * 0.45, s * 0.45, C.coatDark);
  }
  // Ponto numa elipse [z, rx, ry, cx] no ângulo th (a partir de +X em direção a +Y)
  const EP = (r, th, k = 1) => [r[3] + Math.cos(th) * r[1] * k, Math.sin(th) * r[2] * k, r[0]];
  // Casca elíptica por anéis; oa = abertura na frente (por anel ou fixa)
  function loft(g, rings, oa, segs, cols) {
    for (let i = 0; i < rings.length - 1; i++) {
      const col = Array.isArray(cols) ? cols[i] : cols;
      const a0 = Array.isArray(oa) ? oa[i] : oa, b0 = Array.isArray(oa) ? oa[i + 1] : oa;
      for (let j = 0; j < segs; j++) {
        const s0 = a0 + (TWO - 2 * a0) * j / segs, s1 = a0 + (TWO - 2 * a0) * (j + 1) / segs;
        const t0 = b0 + (TWO - 2 * b0) * j / segs, t1 = b0 + (TWO - 2 * b0) * (j + 1) / segs;
        g.quad(EP(rings[i], s0), EP(rings[i], s1), EP(rings[i + 1], t1), EP(rings[i + 1], t0), col);
      }
    }
  }
  // Casca num arco [a0, a1] (sem abertura simétrica)
  function arc(g, rings, a0, a1, segs, col) {
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < segs; j++) {
        const t0 = a0 + (a1 - a0) * j / segs, t1 = a0 + (a1 - a0) * (j + 1) / segs;
        g.quad(EP(rings[i], t0), EP(rings[i], t1), EP(rings[i + 1], t1), EP(rings[i + 1], t0), Array.isArray(col) ? col[i] : col);
      }
    }
  }
  // Placa tangente à superfície de uma elipse
  function surfPlate(g, r, th, w, h, col, out = 1.04, e = 0) {
    const c = EP(r, th, out);
    let tx = -Math.sin(th) * r[1], ty = Math.cos(th) * r[2];
    const tl = Math.hypot(tx, ty) || 1; tx = tx / tl * w / 2; ty = ty / tl * w / 2;
    const hz = h / 2;
    g.quad([c[0] - tx, c[1] - ty, c[2] - hz], [c[0] + tx, c[1] + ty, c[2] - hz], [c[0] + tx, c[1] + ty, c[2] + hz], [c[0] - tx, c[1] - ty, c[2] + hz], col, e);
  }
  function surfBuckle(g, r, th, s, out = 1.05) { surfPlate(g, r, th, s, s, C.buckle, out); surfPlate(g, r, th, s * 0.45, s * 0.45, C.coatDark, out + 0.02); }

  // ------------------------------------------------------------- quadril e tronco
  function gHips() {
    const g = new G3();
    g.box(0.2, 0, -0.8, 7.4, 10.4, 4.6, C.pants, 0, { taperY: 1.05 });
    return g;
  }
  // Ombros (referencial do tronco): articulação em (0, ±SHY, SHZ)
  const SHY = 6.7, SHZ = 10.6, TZK = SHZ / 12.4;   // TZK: compressão vertical do tronco
  // Anéis do casaco no tronco (z, rx, ry, cx) — da cintura aos ombros
  const SHELL = [[-1.6, 4.7, 6.4, 0], [4.0, 4.3, 6.1, 0], [8.4, 4.6, 6.9, -0.2], [11.6, 4.4, 7.5, -0.4], [13.2, 3.4, 7.1, -0.5], [14.3, 2.5, 4.2, -0.5]];
  const OPEN = [0.78, 0.7, 0.56, 0.48, 0.5, 0.62];
  function gTorso() {
    const g = new G3();
    g.at(0, 0, 0, 0, 0, 0, 1, 1, TZK);
    // Camisa preta de gola alta (visível na abertura do casaco)
    arc(g, [[-1.6, 4.25, 5.8, 0.15], [8.4, 4.3, 6.3, 0.0], [13.8, 2.9, 5.0, -0.4]], -1.15, 1.15, 4, C.shirt);
    g.cyl(-0.3, 0, 13.0, 2.7, 2.35, 5.0, 6, C.shirt, 0, { caps: false });
    // Cinto largo com fivela dupla (frente, entre as abas abertas)
    arc(g, [[-0.4, 4.45, 6.0, 0.18], [1.8, 4.45, 6.0, 0.18]], -1.0, 1.0, 4, C.strap);
    buckle(g, 'x', 4.66, -1.2, 0.7, 1.75);
    buckle(g, 'x', 4.66, 1.2, 0.7, 1.75);
    // Tira diagonal no peito (ombro esquerdo → quadril direito) com fivela quadrada
    {
      const a = [3.9, -4.4, 12.6], b = [4.45, 3.9, 2.6], w = 0.62;
      const dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dy, dz), ny = -dz / L * w, nz = dy / L * w;
      g.quad([a[0], a[1] + ny, a[2] + nz], [b[0], b[1] + ny, b[2] + nz], [b[0], b[1] - ny, b[2] - nz], [a[0], a[1] - ny, a[2] - nz], C.strap);
      buckle(g, 'x', 4.42, -1.6, 9.7, 1.9);
    }
    // Casaco longo aberto na frente: casca do tronco até os ombros
    loft(g, SHELL, OPEN, 8, [C.coat, C.coat, C.coat, C.coatMid, C.coatHi]);
    // Lapelas dobradas para fora + tiras com fivelas atravessando as abas da frente
    for (const s of [-1, 1]) {
      const e1 = EP(SHELL[3], s * OPEN[3]), e2 = EP(SHELL[1], s * OPEN[1]), o = EP([11.2, 5.1, 8.0, -0.3], s * (OPEN[3] + 0.5));
      g.tri(e1, e2, o, C.coatHi);
      surfPlate(g, [4.6, 4.4, 6.25, 0], s * (OPEN[1] + 0.32), 2.5, 0.85, C.strap, 1.03);
      surfBuckle(g, [4.6, 4.4, 6.25, 0], s * (OPEN[1] + 0.2), 1.3);
      surfPlate(g, [8.0, 4.6, 6.9, -0.2], s * (OPEN[2] + 0.36), 2.2, 0.8, C.strap, 1.05);
      surfBuckle(g, [8.0, 4.6, 6.9, -0.2], s * (OPEN[2] + 0.2), 1.15, 1.07);
      // Costura/rebite no ombro
      surfPlate(g, SHELL[3], s * 1.5, 0.7, 0.7, C.buckle, 1.07);
    }
    // Gola alta aberta (sobe até a mandíbula)
    loft(g, [[13.6, 3.5, 4.8, -0.5], [17.8, 4.3, 5.9, -0.7]], [0.82, 1.0], 6, C.coatMid);
    loft(g, [[17.8, 4.3, 5.9, -0.7], [18.3, 4.1, 5.6, -0.7]], 1.0, 6, C.coatHi);
    // Capuz abaixado: rolo volumoso em volta do pescoço e dos ombros...
    loft(g, [[12.6, 4.9, 7.6, -1.0], [15.4, 5.5, 8.1, -1.6], [17.8, 4.4, 6.8, -2.0]], [1.0, 1.05, 1.15], 7, [C.hood, C.coatMid]);
    // ...e bolsa do capuz caída nas costas (ponta até o meio das costas)
    // gota pontuda e centrada, mais estreita que as costas, com a borda da abertura em cima
    const HOOD = [[19.0, 3.0, 4.6, -5.4], [16.2, 3.6, 5.2, -6.8], [12.0, 2.8, 4.2, -7.1], [7.6, 1.6, 2.4, -6.6], [3.5, 0.3, 0.3, -5.8]];
    arc(g, HOOD, 0, TWO, 6, [C.hood, C.hood, C.hood, C.coatDark]);
    for (let i = 0; i < 6; i++) {
      const a0 = i / 6 * TWO, a1 = (i + 1) / 6 * TWO, o = EP(HOOD[0], a0), p = EP(HOOD[0], a1), q = EP(HOOD[0], a1, 0.78), r = EP(HOOD[0], a0, 0.78);
      q[2] += 0.25; r[2] += 0.25;
      g.quad(o, p, q, r, C.coatHi);
    }
    g.poly([0, 1, 2, 3, 4, 5].map((i) => EP(HOOD[0], i / 6 * TWO, 0.78).map((v, j) => (j === 2 ? v + 0.25 : v))), C.lining);
    // Tira com fivela atrás da cintura, costura central e fenda das costas
    arc(g, [[0.0, 4.82, 6.6, 0], [1.7, 4.82, 6.6, 0]], 2.2, TWO - 2.2, 4, C.strap);
    buckle(g, 'x', -4.95, 0, 0.85, 1.55, -1);
    g.at();
    return g;
  }

  // ------------------------------------------------------------- cabeça
  // Máscara do rosto anime: perfil central, coluna das maçãs e contorno lateral (testa → queixo)
  const FCc = [[3.75, 0, 11.0], [4.15, 0, 9.0], [4.3, 0, 7.6], [4.7, 0, 6.2], [4.25, 0, 5.0], [3.9, 0, 3.8], [3.15, 0, 2.4]];
  const FCm = [[3.55, 2.1, 11.0], [3.95, 2.25, 9.0], [4.0, 2.3, 7.6], [3.95, 2.15, 6.2], [3.65, 1.95, 5.0], [3.2, 1.5, 3.8], [2.9, 0.55, 2.4]];
  const FCs = [[0.9, 3.95, 11.0], [1.1, 4.05, 9.0], [1.2, 4.0, 7.6], [1.2, 3.8, 6.2], [1.1, 3.3, 5.0], [0.9, 2.5, 3.8], [1.7, 1.0, 2.4]];
  // x da superfície do rosto em (y, z) (interpolação dos mesmos pontos da máscara)
  function faceX(y, z) {
    let i = 0;
    while (i < FCc.length - 2 && z < FCc[i + 1][2]) i++;
    const t = cl((FCc[i][2] - z) / (FCc[i][2] - FCc[i + 1][2]), 0, 1);
    const cx = mix(FCc[i][0], FCc[i + 1][0], t), mx = mix(FCm[i][0], FCm[i + 1][0], t), my = mix(FCm[i][1], FCm[i + 1][1], t);
    const sx = mix(FCs[i][0], FCs[i + 1][0], t), sy = mix(FCs[i][1], FCs[i + 1][1], t);
    const ay = Math.abs(y);
    return ay <= my ? mix(cx, mx, ay / my) : mix(mx, sx, cl((ay - my) / (sy - my), 0, 1));
  }
  const FP = (y, z, off) => [faceX(y, z) + off, y, z];
  function faceQuad(g, pts, off, col, e = 0) { g.quad(FP(pts[0], pts[1], off), FP(pts[2], pts[3], off), FP(pts[4], pts[5], off), FP(pts[6], pts[7], off), col, e); }
  function gHead() {
    const g = new G3();
    g.cyl(-0.3, 0, -1.0, 1.8, 1.6, 4.6, 6, C.skinShade, 0, { caps: false });
    // Crânio (atrás da máscara) + máscara facetada do rosto
    g.sphere(-0.6, 0, 8.2, 4.3, 4.1, 4.7, 6, 3, C.skinShade);
    for (const s of [-1, 1]) {
      for (let i = 0; i < FCc.length - 1; i++) {
        const c0 = FCc[i], c1 = FCc[i + 1], m0 = [FCm[i][0], s * FCm[i][1], FCm[i][2]], m1 = [FCm[i + 1][0], s * FCm[i + 1][1], FCm[i + 1][2]];
        const s0 = [FCs[i][0], s * FCs[i][1], FCs[i][2]], s1 = [FCs[i + 1][0], s * FCs[i + 1][1], FCs[i + 1][2]];
        g.quad(c0, c1, m1, m0, C.skin);
        g.quad(m0, m1, s1, s0, i >= 3 ? C.skinShade : C.skin);
      }
    }
    // Olhos cinzentos sérios: pálpebra superior grossa, branco, íris com pequeno brilho, sobrancelha
    for (const s of [-1, 1]) {
      faceQuad(g, [s * 0.85, 7.25, s * 2.3, 7.45, s * 2.45, 7.98, s * 0.8, 7.82], 0.08, C.eyeW, 0.05);
      faceQuad(g, [s * 1.2, 7.28, s * 1.85, 7.32, s * 1.85, 7.9, s * 1.2, 7.86], 0.14, C.iris, 0.3);
      faceQuad(g, [s * 1.62, 7.66, s * 1.8, 7.68, s * 1.8, 7.84, s * 1.62, 7.82], 0.19, '#e8eef6', 0.7);
      faceQuad(g, [s * 0.7, 7.78, s * 2.5, 7.92, s * 2.75, 8.3, s * 0.7, 8.1], 0.2, C.lash);
      faceQuad(g, [s * 0.55, 8.55, s * 2.6, 8.95, s * 2.6, 9.22, s * 0.55, 8.82], 0.16, C.hair);
    }
    faceQuad(g, [-0.55, 4.25, 0.55, 4.25, 0.5, 4.45, -0.5, 4.45], 0.08, C.lip);
    g.tri(FP(0, 5.65, 0.06), FP(-0.45, 5.9, 0.04), FP(0.45, 5.9, 0.04), C.skinShade);
    // Cabelo: calota volumosa (maior que a cabeça) + mechas desgrenhadas
    g.sphere(-1.3, 0, 9.0, 5.2, 5.3, 5.6, 6, 4, C.hair);
    const H = C.hair2, H3 = C.hair3;
    // franja longa: cobre a testa e cai entre/sobre os olhos (o esquerdo fica meio escondido)
    lock(g, [1.2, -3.0, 13.6], [4.4, -3.6, 10.9], [4.2, -3.9, 8.0], 1.3, 0.8, H);
    lock(g, [1.6, -1.5, 14.1], [4.9, -1.8, 11.3], [4.85, -1.55, 8.4], 1.2, 0.8, H3);
    lock(g, [1.7, 0.1, 14.2], [5.05, 0.2, 11.2], [4.75, 0.55, 8.0], 1.25, 0.8, H);
    lock(g, [1.6, 1.5, 14.0], [4.9, 1.85, 11.0], [4.55, 2.3, 8.55], 1.2, 0.8, H3);
    lock(g, [1.2, 3.0, 13.5], [4.4, 3.5, 10.7], [4.05, 3.75, 7.5], 1.3, 0.8, H);
    lock(g, [0.8, -0.6, 14.6], [4.6, -0.8, 12.4], [5.1, -0.3, 9.6], 1.6, 0.9, H3);
    // mechas laterais até o queixo (emolduram o rosto)
    for (const s of [-1, 1]) {
      // a esquerda fica mais para trás e mais fina: libera bochecha e nariz na vista 3/4 esquerda
      if (s < 0) lock(g, [-1.3, -4.8, 11.6], [-0.9, -5.5, 7.6], [-0.4, -4.7, 4.0], 1.1, 0.85, H);
      else lock(g, [-0.2, 4.8, 11.6], [0.4, 5.6, 7.6], [0.9, 4.8, 3.6], 1.35, 0.9, H);
      lock(g, [-2.0, s * 5.1, 11.6], [-2.1, s * 6.1, 7.2], [-1.6, s * 5.3, 2.9], 1.85, 0.9, s > 0 ? H3 : H);
    }
    // nuca com pontas para baixo
    lock(g, [-5.2, -2.4, 12.8], [-7.0, -3.2, 7.4], [-5.9, -3.0, 2.4], 2.3, 1.0, H);
    lock(g, [-5.2, 2.4, 12.8], [-7.0, 3.2, 7.4], [-5.9, 3.0, 2.6], 2.3, 1.0, H);
    lock(g, [-5.6, 0, 12.4], [-7.1, 0.1, 6.0], [-5.2, 0.3, 1.0], 2.5, 1.0, H3);
    // topo arredondado: mechas que sobem e se abrem para trás/para os lados + pontas rebeldes no cocuruto
    lock(g, [1.8, -1.6, 14.0], [-1.4, -2.6, 16.2], [-5.6, -3.6, 14.8], 2.2, 1.0, H3);
    lock(g, [1.8, 1.9, 14.0], [-1.2, 2.9, 16.0], [-5.7, 4.0, 14.4], 2.2, 1.0, H);
    lock(g, [-1.0, 0, 14.6], [-3.6, 0.2, 16.6], [-7.4, 0.6, 14.6], 2.4, 1.0, H3);
    lock(g, [-1.6, -1.1, 14.5], [-3.0, -1.8, 16.2], [-4.6, -2.6, 16.6], 1.4, 0.8, H);
    lock(g, [-2.0, 1.2, 14.5], [-3.4, 1.9, 16.0], [-5.0, 2.7, 16.2], 1.4, 0.8, H3);
    lock(g, [-3.6, 0.2, 14.0], [-5.2, 0.3, 15.4], [-7.0, 0.5, 15.6], 1.5, 0.8, H);
    lock(g, [0.4, -3.9, 13.4], [0.2, -5.9, 13.0], [-0.4, -7.0, 10.6], 1.5, 0.9, H);
    lock(g, [-2.6, 3.8, 13.3], [-3.6, 5.9, 12.6], [-4.3, 6.9, 9.8], 1.5, 0.9, H);
    return g;
  }

  // ------------------------------------------------------------- braços
  // Braço (s = −1 esquerdo, +1 direito): ombro com costura, manga larga com tira e fivela
  function gUpper(s) {
    const g = new G3();
    g.sphere(0, s * 0.3, -1.0, 2.4, 2.4, 2.5, 6, 3, C.coatMid);
    g.cyl(0, 0, -9.8, 1.9, 2.2, 9.0, 6, C.coat, 0, { caps: false });
    // camada do ombro (sobreposta, borda mais clara)
    plate(g, 'z', 0, s * 0.4, 1.5, 2.0, 1.7, C.coatMid);
    band(g, 0, 0, -4.8, 4.2, 4.2, 1.0, C.strap);
    buckle(g, 'y', 0, s * 2.15, -4.8, 1.15, s);
    return g;
  }
  // Antebraço: manga em camadas, 2 tiras largas com fivelas, luva preta sem dedos
  function gFore(s) {
    const g = new G3();
    g.cyl(0, 0, -8.0, 2.3, 2.0, 8.0, 6, C.coat, 0, { caps: false });
    band(g, 0.1, 0, -3.2, 3.9, 3.9, 1.1, C.strap);
    band(g, 0.1, 0, -5.9, 4.4, 4.4, 1.3, C.strap);
    buckle(g, 'y', 0.1, s * 2.0, -3.2, 1.0, s);
    buckle(g, 'y', 0.1, s * 2.25, -5.9, 1.15, s);
    // punho da luva, dorso da mão e dedos de pele à mostra
    g.box(0.3, 0, -9.9, 2.4, 2.6, 3.8, C.glove, 0, { taperY: 0.92, shift: [-0.15, 0] });
    g.box(0.75, 0, -12.2, 1.5, 2.4, 1.1, C.skin, 0, { taperY: 0.9 });
    return g;
  }
  function gMark() {
    const g = new G3();
    band(g, 0.15, 0, -8.15, 2.75, 2.8, 0.55, C.mark, 1.3);
    plate(g, 'y', 0.2, -1.45, -8.75, 0.8, 1.9, C.mark, 1.5);
    plate(g, 'y', 0.2, -1.47, -8.75, 0.25, 2.4, '#a8d0ff', 1.6);
    plate(g, 'x', 1.5, -0.4, -8.75, 1.0, 0.9, C.mark, 1.4);
    return g;
  }

  // ------------------------------------------------------------- pernas (calça folgada, botas pesadas)
  const LTH = 12.8, LSH = 12.2, ANK = 3.6;   // coxa, canela, tornozelo→sola
  function gThigh(s) {
    const g = new G3();
    g.cyl(0, 0, -LTH, 2.5, 3.0, LTH + 0.4, 6, C.pants, 0, { caps: false });
    band(g, 0, 0, -6.2, 5.2, 5.4, 0.9, C.strap);
    g.box(0.3, s * 2.9, -8.0, 2.8, 1.3, 3.4, C.strap);
    buckle(g, 'x', 2.62, 0.6 * s, -6.2, 1.0);
    plate(g, 'y', 0.3, s * 3.57, -7.2, 1.1, 0.9, C.buckle);
    return g;
  }
  function gShin(s) {
    const g = new G3();
    const bt = -LSH + 7.2;   // topo do cano da bota
    g.cyl(0, 0, bt - 0.6, 2.4, 2.55, 0.8 - bt, 6, C.pants, 0, { caps: false });
    // cano alto da bota pesada com dobra, cadarço e 2 tiras com fivelas
    g.cyl(0.1, 0, -LSH, 2.55, 2.85, 7.2, 6, C.boot, 0, { caps: false });
    band(g, 0.1, 0, bt + 0.4, 5.9, 5.9, 0.9, C.coatMid);
    band(g, 0.1, 0, -LSH + 4.9, 5.6, 5.6, 0.85, C.strap);
    band(g, 0.1, 0, -LSH + 2.5, 5.7, 5.7, 0.85, C.strap);
    buckle(g, 'y', 0.4, s * 2.86, -LSH + 4.9, 1.15, s);
    buckle(g, 'y', 0.4, s * 2.86, -LSH + 2.5, 1.15, s);
    plate(g, 'x', 2.82, 0, -LSH + 3.7, 1.0, 4.8, C.lace);
    return g;
  }
  function gFoot(s) {
    const g = new G3();
    g.box(0.9, 0, -1.6, 6.4, 5.0, 3.6, C.boot, 0, { taperX: 0.85, taperY: 0.95 });
    g.box(4.8, 0, -2.0, 3.0, 4.8, 2.6, C.boot, 0, { taperX: 0.45, taperY: 0.85 });
    g.box(1.4, 0, -3.1, 9.8, 5.6, 1.2, C.sole);
    plate(g, 'z', 3.4, 0, -0.62, 1.8, 2.4, C.lace);
    return g;
  }

  // ------------------------------------------------------------- abas do casaco
  // Casca curva que alarga para baixo, barra rasgada em pontas irregulares. Cada aba tem dois nós:
  // parte de cima (pivô no quadril, ~45% do comprimento) e barra (filha, pivô na dobra) para o pano
  // dobrar em vez de girar como tábua. kr = raio relativo (abas laterais por dentro, sem z-fighting
  // onde se sobrepõem); slit = [a0, a1] forro escuro no fundo da fenda das costas.
  const rxAt = (z) => 5.2 + (1 - z) * 0.1, ryAt = (z) => 7.0 + (1 - z) * 0.12;
  const PANEL2 = '#151416', HEMF = 0.45;
  function gPanel(a0, a1, L, seed, kr, slit) {
    const am = (a0 + a1) / 2, zt = 1.0;
    const RX = (z) => rxAt(z) * kr, RY = (z) => ryAt(z) * kr;
    const pv = [Math.cos(am) * RX(zt), Math.sin(am) * RY(zt), zt];
    const ca = Math.cos(-am), sa = Math.sin(-am);
    const T = (th, z, k = 1) => { const x = Math.cos(th) * RX(z) * k - pv[0], y = Math.sin(th) * RY(z) * k - pv[1]; return [ca * x - sa * y, sa * x + ca * y, z - zt]; };
    const zs = zt - L * HEMF, zb = zt - L, zo = zs + 0.9;
    const cp = T(am, zs);
    const S = (v) => { v[0] -= cp[0]; v[1] -= cp[1]; v[2] -= cp[2]; return v; };
    const gU = new G3(), gL = new G3();
    const n = 3;
    const jag = [0, 1.9, 0.6, 2.4, 0.2, 1.4, 1.0, 2.1];
    for (let j = 0; j < n; j++) {
      const t0 = mix(a0, a1, j / n), t1 = mix(a0, a1, (j + 1) / n);
      const b0 = zb + jag[(j + seed) % 8] * 0.7, b1 = zb + jag[(j + 1 + seed) % 8] * 0.7;
      gU.quad(T(t0, zt), T(t1, zt), T(t1, zs), T(t0, zs), (j + seed) % 2 ? C.coat : PANEL2);
      gL.quad(S(T(t0, zo)), S(T(t1, zo)), S(T(t1, b1)), S(T(t0, b0)), (j + seed) % 3 === 0 ? PANEL2 : C.coat);
      const tm = (t0 + t1) / 2 + (((j + seed) % 3) - 1) * 0.07;
      gL.tri(S(T(t0, b0)), S(T(t1, b1)), S(T(tm, zb - 1.0 - ((j * 5 + seed) % 4) * 0.8)), C.coatDark);
    }
    if (slit) {
      const k = 0.965;
      gU.quad(T(slit[0], zt, k), T(slit[1], zt, k), T(slit[1], zs, k), T(slit[0], zs, k), C.lining);
      gL.quad(S(T(slit[0], zo, k)), S(T(slit[1], zo, k)), S(T(slit[1], zb + 1.2, k)), S(T(slit[0], zb + 1.2, k)), C.lining);
    }
    return { gU, gL, pv, am, cp };
  }
  // [nome, ângulo inicial, final (graus), comprimento, semente, raio, forro da fenda (graus)]
  // Arcos alargados para as abas vizinhas se sobreporem; fenda das costas de ~16° com forro no fundo
  const PANELS = [
    ['cFR', 34, 94, 24.9, 1, 1.0], ['cSR', 78, 136, 25.7, 2, 0.975], ['cBR', 122, 172, 26.1, 3, 1.0, [171, 180.5]],
    ['cBL', -172, -122, 25.9, 4, 1.0, [-180.5, -171]], ['cSL', -136, -78, 25.5, 5, 0.975], ['cFL', -94, -34, 25.1, 6, 1.0],
  ];

  // ------------------------------------------------------------ parâmetros de pose
  const SC = ['bz', 'br', 'bp', 'by', 'sq', 'hz', 'hy', 'tp', 'tr', 'ty', 'hp', 'hyw', 'hr', 'bs', 'reach', 'grip2', 'fc',
    'cB', 'cFl', 'cFq', 'flare', 'vein', 'rune', 'markE', 'toeL', 'toeR', 'fallA', 'fallD'];
  const VC = ['fL', 'fR', 'hR', 'hL', 'pR', 'pL', 'bd', 'bu'];
  const mkP = () => { const p = {}; for (const k of SC) p[k] = 0; for (const k of VC) p[k] = [0, 0, 0]; return p; };
  const PA = mkP(), PB = mkP(), PC = mkP();
  function mixP(o, a, b, t) {
    for (let i = 0; i < SC.length; i++) { const k = SC[i]; o[k] = a[k] + (b[k] - a[k]) * t; }
    for (let i = 0; i < VC.length; i++) { const k = VC[i], x = a[k], y = b[k], z = o[k]; z[0] = x[0] + (y[0] - x[0]) * t; z[1] = x[1] + (y[1] - x[1]) * t; z[2] = x[2] + (y[2] - x[2]) * t; }
    return o;
  }
  function copyP(o, a) { return mixP(o, a, a, 0); }
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
  function furyOf(e) { return cl(num(e.fury) / 100, 0, 1); }

  const HZR = 26.5;   // altura do quadril em repouso (pernas longas)
  // Repouso (base de todas as poses). hz = altura do quadril (o solver soma HZ0); mãos somam HAND0
  // Respiração de cada personagem: [ritmo, amplitude] (o Drakos respira fundo e devagar)
  const BREATH = { kael: [2.2, 1], drakos: [1.5, 2.1], lyra: [2.6, 0.8], orion: [2.4, 0.7], sera: [2.3, 0.85] };
  function rest(P, e) {
    const cid = e.def && e.def.id, BRT = BREATH[cid] || BREATH.kael;
    const t = num(e.animTime), br = Math.sin(t * BRT[0]) * BRT[1];
    P.bz = 0; P.br = 0; P.bp = 0; P.by = 0; P.sq = cl(num(e.squash), -0.3, 0.3); P.fallA = 0; P.fallD = 0;
    P.hz = HZR + br * 0.12; P.hy = 0.08;
    P.tp = 0.08 + br * 0.015; P.tr = 0; P.ty = 0.1;
    P.hp = 0.04; P.hyw = -0.12; P.hr = 0.03;
    set3(P.fL, 1.4, -4.6, 0); set3(P.fR, -1.4, 4.8, 0);
    // espada relaxada, baixa e ao lado da perna direita: a lâmina cai na diagonal para fora, ponta perto do chão
    set3(P.hR, 2.5, 9.6, 24.6 + br * 0.2); set3(P.pR, -0.8, 0.7, -0.2);
    set3(P.hL, 0.8, -8.3, 21.5 + br * 0.2); set3(P.pL, -0.8, -0.5, -0.2);
    set3(P.bd, 0.30, 0.78, -0.45); set3(P.bu, 0, 0, 1);
    P.bs = 1; P.reach = 0; P.grip2 = 0; P.fc = 1;
    P.cB = 0.04; P.cFl = 0.02; P.cFq = 1.7; P.flare = 0.06;
    P.vein = 0.55 + furyOf(e) * 0.6; P.rune = 1; P.markE = 1;
    P.toeL = 0; P.toeR = 0;

    // Variações de Idle Dinâmicas (8 variações)
    const variant = e.idleVariant || 'idle_breathing';
    const b = num(e.idleBlend, variant === 'idle_breathing' ? 0 : 1);
    if (b > 0.001) {
      if (variant === 'idle_look_around') {
        const look = Math.sin(t * 1.4) * 0.42;
        P.hyw += look * b;
        P.ty += look * 0.25 * b;
        P.hp += Math.cos(t * 1.4) * 0.08 * b;
      } else if (variant === 'idle_weapon_inspect') {
        P.hR[0] += 4.5 * b; P.hR[1] -= 2.2 * b; P.hR[2] += 5.5 * b;
        P.bd[0] = mix(P.bd[0], 0.6, b); P.bd[1] = mix(P.bd[1], 0.2, b); P.bd[2] = mix(P.bd[2], 0.4, b);
        P.hyw += 0.35 * b; P.hp += 0.16 * b;
      } else if (variant === 'idle_combat_ready') {
        P.hz -= 1.8 * b; P.tp += 0.14 * b;
        P.hR[0] += 2.0 * b; P.hR[1] += 1.0 * b; P.hR[2] += 2.5 * b;
        P.hL[0] += 3.5 * b; P.hL[1] += 2.5 * b; P.hL[2] += 4.0 * b;
        P.bd[0] = mix(P.bd[0], 0.8, b); P.bd[2] = mix(P.bd[2], 0.1, b);
      } else if (variant === 'idle_weight_shift') {
        const shift = Math.sin(t * 1.8) * 0.12;
        P.tr += shift * b;
        P.hz += Math.abs(shift) * 0.5 * b;
        P.fL[0] += shift * 1.5 * b;
      } else if (variant === 'idle_stretch') {
        P.tp -= 0.14 * b; P.hp -= 0.18 * b;
        P.hz += 0.8 * b;
        P.hL[2] += 3.0 * b;
      } else if (variant === 'idle_alert') {
        P.hz += 1.0 * b; P.tp -= 0.05 * b;
        P.hp -= 0.12 * b; P.hyw -= 0.28 * b;
        P.hR[2] += 2.0 * b;
      } else if (variant === 'idle_fidget') {
        const fid = Math.sin(t * 3.8);
        P.hr += fid * 0.06 * b;
        P.hL[2] += Math.sin(t * 4.2) * 1.5 * b;
      } else if (variant === 'idle_tired') {
        // cansado (depois de correr ou lutar muito): respiração funda e rápida, tronco curvado,
        // joelhos dobrados, a mão livre apoiada na coxa e a espada mais baixa
        const pant = Math.sin(t * 3.6);
        P.hz += (-1.5 + pant * 0.45) * b; P.tp += (0.2 + pant * 0.05) * b; P.hp += (0.16 - pant * 0.04) * b;
        P.hL[0] += 3.0 * b; P.hL[1] += 2.4 * b; P.hL[2] += (-4.8 + pant * 0.5) * b;
        P.hR[2] += (-1.6 + pant * 0.4) * b;
      } else if (variant === 'idle_heavy_breath') {
        // respiração pesada (Drakos): peito e ombros sobem e descem devagar, base mais aberta e
        // os braços afastados do corpo pelo volume da armadura
        const hb = Math.sin(t * 1.4);
        P.hz += hb * 0.4 * b; P.tp += (-0.04 + hb * 0.05) * b; P.hp -= hb * 0.05 * b;
        P.hL[1] -= 1.4 * b; P.hL[2] += hb * 0.7 * b; P.hR[1] += 1.2 * b; P.hR[2] += hb * 0.7 * b;
        P.fL[1] -= 0.9 * b; P.fR[1] += 0.9 * b;
      } else if (variant === 'idle_flex') {
        // tensão e prontidão (Drakos): punhos cerrados afastados, peito aberto, leve agachamento
        // e o pescoço estalando de um lado para o outro
        const k = smooth(cl(num(e.idleTime) * 0.9, 0, 1));
        P.hz -= 1.4 * k * b; P.tp -= 0.07 * k * b; P.hp -= 0.06 * b;
        P.hL[0] += 3 * k * b; P.hL[1] -= 2.8 * k * b; P.hL[2] += 3.5 * k * b;
        P.hR[0] += 2 * k * b; P.hR[1] += 2.2 * k * b; P.hR[2] += 2.5 * k * b;
        P.hr += Math.sin(t * 2.4) * 0.12 * b; P.hyw += Math.sin(t * 1.2) * 0.1 * b;
        P.fL[1] -= 1.2 * k * b; P.fR[1] += 1.2 * k * b;
      } else if (variant === 'idle_scan') {
        // vigilância: a cabeça vira em saltos curtos (olha, para, olha de novo); o tronco acompanha pouco
        const sg = Math.floor(t * 0.9), ph = t * 0.9 - sg;
        const TG = [0.5, -0.45, 0.15, -0.6, 0.35];
        const yaw = mix(TG[sg % 5], TG[(sg + 1) % 5], smooth(cl(ph * 4, 0, 1)));
        P.hyw += yaw * b; P.ty += yaw * 0.2 * b; P.hp -= 0.05 * b; P.hz += 0.4 * b;
      } else if (variant === 'idle_crouch_ready') {
        // prontidão furtiva (Orion): base baixa e larga, peso na ponta dos pés, mãos à frente
        P.hz -= 3.2 * b; P.tp += 0.22 * b; P.hp -= 0.14 * b; P.tr += Math.sin(t * 1.9) * 0.04 * b;
        P.fL[0] += 2 * b; P.fL[1] -= 1.6 * b; P.fR[0] -= 2.4 * b; P.fR[1] += 1.6 * b; P.toeR = 0.35 * b;
        P.hL[0] += 4 * b; P.hL[2] += 3 * b; P.hR[0] += 3 * b; P.hR[2] += 2 * b;
      } else if (variant === 'idle_bow_adjust') {
        // ajusta o arco (Lyra): ergue à frente, gira um pouco e olha para ele
        const w = Math.sin(t * 1.3);
        P.hL[0] += 6 * b; P.hL[1] += 3.5 * b; P.hL[2] += (7 + w * 1.2) * b;
        P.pL[0] += 0.5 * b; P.hyw -= (0.3 + w * 0.06) * b; P.hp += 0.18 * b; P.ty -= 0.12 * b;
      } else if (variant === 'idle_nock_tease') {
        // prepara a corda (Lyra): a mão direita vai às flechas atrás do ombro e volta, duas vezes
        const c = 0.5 - 0.5 * Math.cos(t * 2.0);
        const k = c * b;
        P.hR[0] = mix(P.hR[0], -4.5, k); P.hR[1] = mix(P.hR[1], 5.5, k); P.hR[2] = mix(P.hR[2], 41, k);
        P.ty += 0.12 * k; P.hyw += 0.22 * k; P.hL[0] += 2 * b; P.hL[2] += 2 * b;
      } else if (variant === 'idle_victory') {
        // setor liberado: ergue a espada um instante, peito aberto e o olhar para cima
        const up = Math.min(1, num(e.victoryT, 0) > 2.6 ? (3.2 - num(e.victoryT)) / 0.6 : 1);
        const k = b * Math.max(0, up);
        P.tp -= 0.08 * k; P.hp -= 0.16 * k; P.hz += 0.6 * k;
        set3(P.hR, mix(P.hR[0], 4.5, k), mix(P.hR[1], 6.8, k), mix(P.hR[2], 44, k));
        set3(P.bd, mix(P.bd[0], 0.15, k), mix(P.bd[1], 0.12, k), mix(P.bd[2], 1, k));
      }
    }
    return P;
  }

  function runPose(P, e) {
    rest(P, e);
    const t = num(e.animTime);
    const k = cl((num(e.moveSpeed) - 20) / 200, 0, 1.15);
    // Cadência: caminhada (analógico pela metade, toque) a passos mais lentos, corrida a 13 rad/s;
    // a fase acumula na entidade para a troca de ritmo não pular o passo
    const rate = 7 + 6 * Math.min(1, k * 1.4);
    if (e._gt === undefined || t < e._gt || t - e._gt > 0.5) e._gp = t * rate;
    else e._gp += (t - e._gt) * rate;
    e._gt = t;
    const ph = e._gp, s = Math.sin(ph), c = Math.cos(ph);
    P.bz = Math.abs(c) * 1.8 * k;
    P.hz = HZR - 1.2 * k;
    P.tp = mix(P.tp, 0.3, k); P.ty = mix(P.ty, -s * 0.16, k); P.hy = s * 0.14 * k;
    P.hp = mix(P.hp, -0.12, k); P.hyw = mix(P.hyw, s * 0.1, k);
    set3(P.fL, mix(P.fL[0], s * 9 + 1, k), -4.4, Math.max(0, c) * 5.5 * k);
    set3(P.fR, mix(P.fR[0], -s * 9 + 1, k), 4.6, Math.max(0, -c) * 5.5 * k);
    P.toeL = Math.max(0, -s) * 0.5 * k; P.toeR = Math.max(0, s) * 0.5 * k;
    set3(P.hL, mix(P.hL[0], -s * 9 + 2, k), mix(P.hL[1], -9.8, k), mix(P.hL[2], 24.7 + Math.abs(s) * 2.5, k));
    set3(P.hR, mix(P.hR[0], s * 3 - 2.5, k), mix(P.hR[1], 10.4, k), mix(P.hR[2], 23.5, k));
    // espada baixa e rente ao corpo, ponta para trás perto do chão
    set3(P.bd, mix(P.bd[0], -0.62, k), mix(P.bd[1], 0.55, k), mix(P.bd[2], -0.56, k));
    P.cB = 0.04 + 0.8 * k; P.flare = 0.06 + 0.08 * k;
    P.cFl = 0.02 + 0.1 * k; P.cFq = mix(1.7, 17, k);
    return P;
  }

  // Ângulo local da lâmina (desenrolado no giro): mesma fórmula de Player.bladeAngle
  function bladeLocal(e, a, d, tt, pa) {
    const fac = num(e.facing);
    const sw = Array.isArray(d.swing) ? d.swing : [0, 0];
    if (d.multiHit && !d.oscillate) return adiff(fac, num(a.dir, fac)) + mix(num(sw[0]), num(sw[1]), pa);
    if (typeof e.bladeAngle === 'function') {
      let w = NaN;
      try { w = e.bladeAngle(a, tt); } catch (err) { w = NaN; }
      if (isFinite(w)) return adiff(fac, w);
    }
    const base = adiff(fac, num(a.dir, fac));
    if (d.oscillate) return base + Math.sin(pa * PI * num(d.oscillate)) * num(sw[1]);
    return base + mix(num(sw[0]), num(sw[1]), eoc(pa));
  }

  const HZA = HZR - 1.2;   // quadril na base de combate
  // Estilos dos golpes de arco (só a animação: alcance, dano e janelas continuam os de ATTACKS).
  // z0/z1: altura da mão no começo e no fim do corte; o0/o1: ponta da lâmina acima/abaixo do
  // rastro; crouch: o quanto o corpo desce; g2: as duas mãos no cabo; post: o resto do corpo
  const SWING_STYLES = {
    // diagonal descendente: entra alto pelo ombro e corta até o quadril oposto
    diag: { z0: 38, z1: 20, o0: 10, o1: -10, crouch: 2.6, post: (A, ee) => { A.tp += 0.12 * ee; A.fL[0] += 1.5; } },
    // revés ascendente: sai de baixo, gira o quadril e termina com a lâmina alta, peso no pé de trás
    rise: { z0: 21, z1: 38, o0: -10, o1: 12, crouch: 2, post: (A, ee) => { A.tp -= 0.1 * ee; A.hp -= 0.08 * ee; A.fR[0] -= 2.5; A.fL[0] -= 1.5; A.toeR = 0.45; } },
    // corte saltando: pequeno salto no ativo, as pernas encolhem e a lâmina cai de cima
    leap: { z0: 42, z1: 18, o0: 14, o1: -12, crouch: 3.5, post: (A, ee, pa, wind) => {
      const h = wind ? 0 : Math.sin(Math.min(1, pa * 1.15) * PI);
      A.bz = 7 * h; A.fL[2] += 4 * h; A.fR[2] += 6 * h; A.tp += 0.18 * ee; A.toeL = 0.4 * h; A.toeR = 0.5 * h;
    } },
    // golpe largo com as duas mãos: passo longo e baixo, corte na altura da cintura
    cleave: { z0: 31, z1: 27, o0: 2, o1: -4, crouch: 5, g2: 1, post: (A) => { A.fL[0] += 3.5; A.fR[0] -= 3; A.tp += 0.06; } },
    // por cima com as duas mãos: arma erguida atrás da cabeça e descida até o chão
    overhead: { z0: 50, z1: 14, o0: 38, o1: -24, crouch: 4.5, g2: 1, post: (A, ee) => { A.tp += 0.24 * ee - 0.1 * (1 - ee); A.hp += 0.12 * ee; A.fL[0] += 2; } },
    // corte rápido de pulso: quase sem mexer o corpo (adagas)
    quick: { z0: 30, z1: 29, o0: 1, o1: 0, crouch: 1.2, post: (A) => { A.fL[0] -= 2; A.fR[0] += 1.5; A.toeR = 0; } },
  };
  // Golpe → estilo (Kael e os aliados que usam o rig do Kael para os golpes de ATTACKS)
  const SWING_OF = {
    light1: 'diag', light2: 'rise', light3: 'leap', heavy: 'cleave', charged: 'overhead',
    drakos_light1: 'diag', drakos_light2: 'rise', drakos_light3: 'overhead', drakos_heavy: 'overhead', drakos_charged: 'leap', drakos_sweep: 'cleave',
    orion_light1: 'quick', orion_light2: 'rise', orion_light3: 'diag', orion_heavy: 'cleave', orion_charged: 'leap',
  };
  let ATTACK_ID = null;   // definição → id (montado na primeira consulta)
  function swingStyle(d) {
    if (!ATTACK_ID) { ATTACK_ID = new Map(); if (typeof ATTACKS !== 'undefined') for (const k in ATTACKS) ATTACK_ID.set(ATTACKS[k], k); }
    const s = SWING_OF[ATTACK_ID.get(d)];
    return s ? SWING_STYLES[s] : null;
  }
  function attackPose(P, e) {
    const a = e.attack, d = a && a.def;
    if (!d || typeof d !== 'object') return rest(P, e);
    const R = rest(PB, e);
    const tt = Math.max(0, num(a.t)), tW = Math.max(0.001, num(d.windup, 0.05)), act = Math.max(0.001, num(d.active, 0.1)), rec = Math.max(0.001, num(d.recovery, 0.2));
    const tA = tW + act;
    const pa = cl((tt - tW) / act, 0, 1);
    const ee = d.multiHit ? pa : eoc(pa);
    const raw = bladeLocal(e, a, d, Math.min(tt, tA), pa);
    const phi = adiff(0, raw);
    const blade = cl(num(d.blade, 80), 40, 140);
    const active = tt >= tW && tt < tA;
    const cast = !!(d.ability && (d.shock || d.noHit) && !d.plasma);
    const A = copyP(PA, R);
    A.reach = blade * 0.9; A.fc = 0;
    A.vein = R.vein + (active ? 0.55 : 0.15) + (d.heavy ? 0.25 : 0);
    A.rune = active ? 1.6 : 1.2;
    set3(A.bu, 0, 0, 1);
    set3(A.fL, 5.5, -5.6, 0); set3(A.fR, -4.5, 6.2, 0);
    A.hz = HZA; A.tp = 0.16; A.hp = 0.0; A.hyw = 0;
    A.cB = 0.35; A.flare = 0.12; A.cFl = 0.05; A.cFq = 12;
    if (d.thrust && d.ability) {
      // Investida Sombria: corpo baixo e projetado, perna de trás estendida, mão livre jogada para trás
      const k = eoc(cl(pa * 1.7, 0, 1));
      set3(A.hR, mix(-4, 16, k), mix(9.5, 3.0, k), 26.5);
      set3(A.pR, -0.3, 0.7, -0.8);
      set3(A.bd, 1, -0.05, -0.08); set3(A.bu, 0, 1, 0);
      A.ty = mix(0.4, -0.45, k); A.tp = mix(0.05, 0.5, k); A.hy = A.ty * 0.3;
      A.hp = -0.32; A.hyw = -A.ty * 0.6;
      set3(A.fL, mix(4, 10, k), -5.0, 0); set3(A.fR, mix(-4, -12, k), 5.8, 0); A.toeR = 0.7 * k;
      A.hz = mix(HZR - 1, 21.5, k);
      set3(A.hL, mix(0, -10, k), -10, mix(26, 25.5, k)); set3(A.pL, -0.3, -0.8, -0.2);
      A.cB = mix(0.3, 1.1, k); A.flare = 0.1; A.cFl = 0.06; A.cFq = 22;
      A.vein += 0.3;
    } else if (d.thrust) {
      // Pulso Fantasma: estocada reta à frente, corpo projetado
      const k = eoc(cl(pa * 1.7, 0, 1)), hv = d.heavy ? 1 : 0;
      set3(A.hR, mix(-4, 17, k), mix(9.5, 3.5, k), 29 - hv * 1.5);
      set3(A.pR, -0.3, 0.7, -0.8);
      set3(A.bd, 1, -0.07, -0.03 - hv * 0.04); set3(A.bu, 0, 1, 0);
      A.ty = mix(0.35, -0.5, k); A.tp = mix(0.0, 0.36 + hv * 0.14, k); A.hy = A.ty * 0.3;
      A.hp = -0.2 - hv * 0.06; A.hyw = -A.ty * 0.7;
      set3(A.fL, mix(4, 10 + hv * 2, k), -4.6, 0); set3(A.fR, mix(-4, -9 - hv * 2, k), 5.6, 0); A.toeR = 0.35 * k;
      A.hz = mix(HZR - 1, 23.3 - hv * 1.2, k);
      set3(A.hL, mix(0, -8, k), -11, mix(26.7, 28.7, k)); set3(A.pL, -0.5, -0.8, -0.3);
      A.cB = mix(0.3, 0.95 + hv * 0.2, k);
      if (hv) A.vein += 0.3;
    } else if (d.multiHit && !d.oscillate) {
      // Giro: o corpo inteiro gira com a lâmina estendida à frente-direita
      const p0 = 0.65;
      A.by = raw - p0 - 0.07;
      set3(A.hR, Math.cos(p0) * 15, Math.sin(p0) * 15, 28);
      set3(A.pR, -0.2, 0.5, -1);
      set3(A.bd, Math.cos(p0 + 0.08), Math.sin(p0 + 0.08), -0.05); set3(A.bu, -Math.sin(p0), Math.cos(p0), 0);
      A.ty = 0.25; A.tp = 0.2; A.hz = HZR - 2.5; A.hp = 0.0;
      set3(A.fL, 3, -6.5, 0); set3(A.fR, -3, 6.5, 0);
      set3(A.hL, -6, -12, 30.5); set3(A.pL, -0.3, -0.6, -0.5);
      A.flare = 0.12 + 0.45 * Math.min(1, tt / tW + pa * 2); A.cB = 0.25; A.cFl = 0.08; A.cFq = 20;
    } else {
      // Arco horizontal: altura da mão e da ponta (relativa ao rastro 2D do golpe) por tipo de golpe
      let z0 = 28, z1 = 27, o0 = -2, o1 = -3, crouch = 0, g2 = 0, mode = 0;
      if (d.slamRing) { z0 = 48; z1 = 15; o0 = 40; o1 = -26; crouch = 4.5; g2 = 1; mode = 1; }
      else if (d.plasma) { z0 = 22; z1 = 33; o0 = -9; o1 = 8; crouch = 5; mode = 2; }
      else if (num(d.launch) > 500) { z0 = 20; z1 = 44; o0 = -12; o1 = 16; crouch = 2.5; }
      else if (num(d.launch) > 300) { z0 = 24; z1 = 40; o0 = -10; o1 = 12; crouch = 3; }
      else if (d.heavyType) { z0 = 36; z1 = 22; o0 = 14; o1 = -12; crouch = 3; }
      else if (d.heavy) { z0 = 33; z1 = 24; o0 = 8; o1 = -8; crouch = d.light ? 3.5 : 1.8; }
      else if (d.oscillate) { z0 = 29; z1 = 29; o0 = 0; o1 = 0; crouch = 2.2; }
      else if (d.projectile) { z0 = 32; z1 = 30; o0 = 2; o1 = 2; crouch = 1.5; }
      else crouch = 2.4;
      const style = mode === 0 && !d.oscillate && !d.projectile ? swingStyle(d) : null;
      if (style) { z0 = style.z0; z1 = style.z1; o0 = style.o0; o1 = style.o1; crouch = style.crouch; if (style.g2) g2 = 1; }
      const trailZ = 26 + (num(d.launch) > 300 ? pa * 18 : 0);
      // preparação: lâmina armada mais alta e recolhida junto ao corpo, soltando no início do ativo
      const raise = mode === 0 && !d.oscillate ? (tt < tW ? 1 : Math.max(0, 1 - pa * 3)) : 0;
      const hz = mix(z0, z1, ee) + 6 * raise, tipZ = Math.max(1, trailZ + mix(o0, o1, ee));
      const rh = ((d.oscillate ? 15.5 : 14) - 2.5 * Math.max(0, -Math.cos(phi))) * (1 - 0.3 * raise);
      set3(A.hR, Math.cos(phi) * rh, Math.sin(phi) * rh, hz);
      set3(A.pR, -0.2, 0.6, -1);
      set3(A.bd, Math.cos(phi), Math.sin(phi), (tipZ - hz) / Math.max(20, 52 - 4) + 0.55 * raise);
      set3(A.bu, -Math.sin(phi), Math.cos(phi), 0);
      // tronco acompanha a lâmina; na preparação gira para o lado oposto ao golpe (lê como carga)
      const sw1 = Array.isArray(d.swing) ? num(d.swing[1]) : 0;
      const wind = tt < tW && !d.oscillate ? -Math.sign(sw1) * 0.4 : 0;
      A.ty = cl(phi * 0.75 + wind, -1.15, 1.15); A.hy = A.ty * 0.35; A.hyw = -A.ty * 0.45;
      const ck = tt >= tW ? 1 : cl(tt / tW, 0, 1);
      if (mode === 1) { A.hz = HZA - crouch * mix(0.2, 1, ee); A.tp = 0.14 + crouch * 0.05 * mix(-1, 1.6, ee); }
      else if (mode === 2) { A.hz = HZA - crouch * mix(1, 0.15, ee); A.tp = mix(0.42, -0.08, ee); A.hp = mix(0.12, -0.2, ee); }
      else { A.hz = HZA - crouch * ck; A.tp = 0.22 + crouch * 0.025; A.hp = -0.1; }
      const c = Math.cos(A.ty * 0.6), s = Math.sin(A.ty * 0.6);
      set3(A.hL, c * -3 - s * -11, s * -3 + c * -11, 26.7); set3(A.pL, -0.4, -0.8, -0.4);
      if (g2) A.grip2 = 1;
      // passo: pé esquerdo à frente, direito atrás
      if (mode === 0) { set3(A.fL, 8.5, -6.0, 0); set3(A.fR, -6, 6.8, 0); A.toeR = 0.2; }
      else { set3(A.fL, 6.5, -6.4, 0); set3(A.fR, -5.5, 7.0, 0); }
      if (style && style.post) style.post(A, ee, pa, tt < tW);
      A.cB = 0.35 + crouch * 0.08; A.flare = 0.12 + Math.abs(A.ty) * 0.12; A.cFl = 0.07;
      if (mode === 2) {
        // Ruptura de Plasma: concentra energia agachado (mão livre à frente) e explode abrindo os braços
        set3(A.hL, mix(9, 1, ee), mix(-4.5, -15, ee), mix(26.5, 34.7, ee)); set3(A.pL, mix(-1, 0.2, ee), -0.8, -0.3);
        A.vein = 2.4; A.rune = 2.2; A.markE = 2.2;
        A.flare = mix(0.1, 0.55, ee); A.cB = mix(0.2, -0.1, ee); A.cFl = 0.1; A.cFq = 24;
        set3(A.fL, 5.5, -7.6, 0); set3(A.fR, -5, 8.0, 0);
      }
    }
    if (cast && d.noHit) {
      // Corrente Relâmpago: mão esquerda (com a marca) erguida acima da cabeça; o raio nasce dela (z ≈ 52)
      set3(A.hL, 6, -5, 50); set3(A.pL, -0.2, -1, 0.6);
      A.markE = 2.4;
      A.ty = Math.min(A.ty, 0.1) - 0.15; A.hyw = 0.05; A.hp = -0.18; A.tp = 0.05;
    } else if (cast) {
      // Arco Voltaico: braço esquerdo quase reto à frente, mão na altura do projétil (z ≈ 30)
      set3(A.hL, 17, -2, 29); set3(A.pL, -0.4, -1, -0.2);
      A.markE = active ? 2.4 : 1.7;
      A.ty = Math.min(A.ty, 0.15) - 0.25; A.hyw = 0.15;
    }
    // Fases: preparação (vem do repouso), ativo, recuperação (volta ao repouso)
    if (tt < tW) {
      mixP(P, R, A, eoc(cl(tt / tW, 0, 1)));
    } else if (tt <= tA) {
      copyP(P, A);
    } else {
      const pr = cl((tt - tA) / rec, 0, 1);
      const rk = smooth(cl((pr - 0.25) / 0.75, 0, 1));
      mixP(P, A, R, rk);
      if (d.multiHit && !d.oscillate) {
        const rem = ((-A.by % TWO) + TWO) % TWO;
        P.by = A.by + rem * rk;
      }
      P.reach = rk < 0.5 ? A.reach : 0;
    }
    return P;
  }

  function chargePose(P, e) {
    rest(P, e);
    const t = num(e.animTime), lvl = cl(num(e.chargeLevel), 0, 2);
    const tr = Math.sin(t * 47) * 0.012 * (1 + lvl);
    P.hz = HZR - 3.6; P.tp = 0.2 + tr; P.ty = -0.5; P.hy = -0.15; P.hyw = 0.4; P.hp = -0.02;
    set3(P.fL, 6, -6.8, 0); set3(P.fR, -6.5, 6.8, 0);
    set3(P.hR, -2.0, 8.6, 42.5); set3(P.pR, -0.2, 1, -0.6);
    set3(P.bd, -0.72, 0.36, 0.6); set3(P.bu, 0.2, 0.6, 0.2);
    P.grip2 = 1; set3(P.pL, 0.5, -0.8, -0.6);
    P.vein = 1 + lvl * 0.6 + 0.15 * Math.sin(t * 30) + furyOf(e) * 0.2; P.rune = 1.3 + lvl * 0.4;
    P.cB = 0.2 + lvl * 0.06; P.flare = 0.14 + lvl * 0.06; P.cFl = 0.03 + lvl * 0.03; P.cFq = 14;
    return P;
  }

  function dashPose(P, e) {
    rest(P, e);
    const k = eoc(cl(num(e.stateTime, 0.1) / 0.05, 0, 1));
    const D = copyP(PA, P);
    D.hz = HZR - 2.6; D.tp = 0.62; D.ty = -0.12; D.hp = -0.45; D.hyw = 0.1;
    set3(D.fL, 8.5, -4.4, 0.5); set3(D.fR, -12.5, 5, 3.6); D.toeR = 0.7;
    set3(D.hR, -6.5, 12, 26.5); set3(D.pR, 0.3, 0.6, -0.6);
    set3(D.hL, -6, -12, 28); set3(D.pL, 0.3, -0.6, -0.6);
    set3(D.bd, -0.9, 0.36, -0.24); set3(D.bu, 0, 0, 1);
    D.cB = 1.15; D.flare = 0.12; D.cFl = 0.12; D.cFq = 24;
    mixP(P, P, D, k);
    return P;
  }

  function hurtPose(P, e) {
    rest(P, e);
    const st = num(e.stateTime);
    const amt = st < 0.05 ? st / 0.05 : Math.max(0, 1 - (st - 0.05) / 0.35);
    P.tp = 0.08 - 0.42 * amt; P.bp = -0.06 * amt; P.hp = 0.04 + 0.5 * amt; P.hz = HZR - 1.4 * amt;
    set3(P.hR, mix(P.hR[0], -2, amt), mix(P.hR[1], 12.5, amt), mix(P.hR[2], 28.7, amt));
    set3(P.hL, mix(P.hL[0], -3, amt), mix(P.hL[1], -12.5, amt), mix(P.hL[2], 29.7, amt));
    set3(P.bd, mix(P.bd[0], 0.4, amt), mix(P.bd[1], 0.65, amt), mix(P.bd[2], -0.15, amt));
    set3(P.fL, mix(1.4, 4, amt), -5, 0); set3(P.fR, mix(-1.4, -4.5, amt), 5.2, 0);
    P.cB = 0.04 - 0.35 * amt; P.flare = 0.06 + 0.1 * amt; P.cFl = 0.05;
    return P;
  }

  function specialPose(P, e) {
    const st = num(e.stateTime);
    const R = rest(PB, e);
    const rise = eoc(cl(st / 0.3, 0, 1));
    const strike = st > 0.45 ? eoc(cl((st - 0.45) / 0.12, 0, 1)) : 0;
    const back = st > 0.75 ? smooth(cl((st - 0.75) / 0.3, 0, 1)) : 0;
    const U = copyP(PA, R);
    U.hz = HZR - 0.4; U.tp = -0.12; U.hp = -0.3; U.ty = 0; U.hyw = 0; U.fc = 0;
    set3(U.fL, 2.5, -4.2, 2.0); set3(U.fR, -2.5, 4.4, 1.0); U.toeL = 0.4; U.toeR = 0.5;
    set3(U.hR, 2.0, 1.8, 57); set3(U.pR, 0, 1, -0.2); set3(U.pL, 0, -1, -0.2);
    set3(U.bd, 0.1, -0.03, 1); set3(U.bu, 0, 1, 0); U.grip2 = 1;
    U.cB = 0.25; U.flare = 0.24; U.cFl = 0.08; U.cFq = 20;
    U.vein = 2.2; U.rune = 2.2; U.markE = 1.8;
    mixP(P, R, U, rise);
    if (strike > 0) {
      const S = copyP(PC, U);
      S.hz = HZR - 3.2; S.tp = 0.4; S.hp = 0.15; S.toeL = 0; S.toeR = 0;
      set3(S.fL, 6, -5.5, 0); set3(S.fR, -6, 6, 0);
      set3(S.hR, 15, 3, 24.5); set3(S.bd, 0.86, 0.05, -0.5); set3(S.bu, 0, 1, 0);
      S.flare = 0.18; S.cB = 0.5;
      mixP(P, P, S, strike);
      if (back > 0) mixP(P, P, R, back);
    }
    P.vein = Math.max(P.vein, mix(2.2, R.vein, back));
    return P;
  }

  // ------------------------------------------------------------ solver do rig
  const HZ0 = 2.5, HAND0 = 1.4;             // quadril real = hz + HZ0; mão real = alvo + HAND0
  const AUP = 9.8, AFO = 9.6;                // braço, antebraço (até o punho)
  // Proporções do esqueleto. Outros personagens no mesmo esqueleto (js/models/hero_tex3d.js)
  // passam as suas em build(props) — ombros, quadril, braços, pernas e pescoço da própria arte —
  // e o solver usa model.props; o Kael usa sempre estas.
  const KAEL_PROPS = { SHY, SHZ, HIPY: 3.5, HZ0, HAND0, AUP, AFO, LTH, LSH, ANK, NECK: 13.8 };
  const BLADE_L = 52, BLADE_MAX = 62;
  const ONE = [1, 1, 1], Z3 = [0, 0, 0];
  const TM = M3.make(), HM = M3.make(), MA = M3.make(), MB = M3.make(), MC = M3.make(), MD = M3.make(), ME = M3.make(), MF = M3.make();
  const SL = [0, 0, 0], SR = [0, 0, 0], JL = [0, 0, 0], JR = [0, 0, 0], T1 = [0, 0, 0], T2 = [0, 0, 0], HND = [0, 0, 0], HND2 = [0, 0, 0];
  const RT = [0, 0, 0], BD = [0, 0, 0], UP = [0, 0, 0], PK = [0, 0, 0], VA = [0, 0, 0], VB = [0, 0, 0], VC2 = [0, 0, 0], HT = [0, 0, 0];
  function xf(M, x, y, z, o) { o[0] = M[0] * x + M[1] * y + M[2] * z + M[3]; o[1] = M[4] * x + M[5] * y + M[6] * z + M[7]; o[2] = M[8] * x + M[9] * y + M[10] * z + M[11]; return o; }
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]); if (!(l > 1e-6)) { v[0] = 1; v[1] = 0; v[2] = 0; return v; } v[0] /= l; v[1] /= l; v[2] /= l; return v; }
  // Membro pendurado (−Z) apontando para d: r = [roll, pitch, 0]
  function aimHang(r, dx, dy, dz) { r[0] = Math.asin(cl(dy, -1, 1)); r[1] = Math.atan2(-dx, -dz); r[2] = 0; }
  // IK de dois ossos: nu (filho de body, pivô em S), nl (filho de nu em [0,0,−a]); alvo T; out = ponto alcançado
  function ik(nu, nl, S, T, a, b, pole, out) {
    const vx = T[0] - S[0], vy = T[1] - S[1], vz = T[2] - S[2];
    let D = Math.hypot(vx, vy, vz);
    const ux = D > 1e-4 ? vx / D : 0, uy = D > 1e-4 ? vy / D : 0, uz = D > 1e-4 ? vz / D : -1;
    D = cl(D, Math.abs(a - b) + 0.5, a + b - 0.03);
    const pd = pole[0] * ux + pole[1] * uy + pole[2] * uz;
    let wx = pole[0] - pd * ux, wy = pole[1] - pd * uy, wz = pole[2] - pd * uz;
    let wl = Math.hypot(wx, wy, wz);
    if (wl < 1e-4) { wx = -uz; wy = 0; wz = ux; wl = Math.hypot(wx, wy, wz) || 1; }
    wx /= wl; wy /= wl; wz /= wl;
    const ca = cl((a * a + D * D - b * b) / (2 * a * D), -1, 1), sa = Math.sqrt(1 - ca * ca);
    const ex = ca * ux + sa * wx, ey = ca * uy + sa * wy, ez = ca * uz + sa * wz;   // direção do osso superior
    const Ex = S[0] + a * ex, Ey = S[1] + a * ey, Ez = S[2] + a * ez;
    out[0] = S[0] + ux * D; out[1] = S[1] + uy * D; out[2] = S[2] + uz * D;
    nu.p[0] = S[0]; nu.p[1] = S[1]; nu.p[2] = S[2];
    aimHang(nu.r, ex, ey, ez);
    // direção do osso inferior no referencial do superior: Rx(−roll)·Ry(−pitch)·d
    const lx = (out[0] - Ex) / b, ly = (out[1] - Ey) / b, lz = (out[2] - Ez) / b;
    const cp = Math.cos(-nu.r[1]), sp = Math.sin(-nu.r[1]);
    const x1 = cp * lx + sp * lz, z1 = -sp * lx + cp * lz;
    const cr = Math.cos(-nu.r[0]), sr = Math.sin(-nu.r[0]);
    const y2 = cr * ly - sr * z1, z2 = sr * ly + cr * z1;
    aimHang(nl.r, x1, y2, z2);
    return out;
  }
  // Extrai [roll, pitch, yaw] (Rz·Ry·Rx) de uma matriz 3x4
  function euler(r, M) { r[1] = Math.asin(cl(-M[8], -1, 1)); r[2] = Math.atan2(M[4], M[0]); r[0] = Math.atan2(M[9], M[10]); }
  function transposeRot(o, M) {
    o[0] = M[0]; o[1] = M[4]; o[2] = M[8]; o[3] = 0;
    o[4] = M[1]; o[5] = M[5]; o[6] = M[9]; o[7] = 0;
    o[8] = M[2]; o[9] = M[6]; o[10] = M[10]; o[11] = 0;
    return o;
  }
  // Pé plano em relação ao corpo (com inclinação de ponta 'toe')
  function flatFoot(nf, nu, nl, toe) {
    M3.trs(MA, Z3, nu.r, ONE); M3.trs(MB, Z3, nl.r, ONE); M3.mul(MC, MA, MB);
    transposeRot(MD, MC);
    RT[0] = 0; RT[1] = toe; RT[2] = 0;
    M3.trs(ME, Z3, RT, ONE); M3.mul(MF, MD, ME);
    euler(nf.r, MF);
  }
  // Orientação a partir de base: x = direção da lâmina, z ≈ up (largura)
  function orient(r, d, up) {
    const x0 = d[0], x1 = d[1], x2 = d[2];
    const pd = up[0] * x0 + up[1] * x1 + up[2] * x2;
    let z0 = up[0] - pd * x0, z1 = up[1] - pd * x1, z2 = up[2] - pd * x2;
    let zl = Math.hypot(z0, z1, z2);
    if (zl < 1e-3) { z0 = -x2; z1 = 0; z2 = x0; zl = Math.hypot(z0, z1, z2); if (zl < 1e-3) { z0 = 0; z1 = 1; z2 = 0; zl = 1; } }
    z0 /= zl; z1 /= zl; z2 /= zl;
    const y2 = z0 * x1 - z1 * x0;   // (z × x).z
    r[1] = Math.asin(cl(-x2, -1, 1)); r[2] = Math.atan2(x1, x0); r[0] = Math.atan2(y2, z2);
  }

  const POLE_KL = [1, -0.25, 0.1], POLE_KR = [1, 0.25, 0.1];
  // Dados de oclusão por entidade (pose → glows), sem alocar por quadro
  const OCC = typeof WeakMap === 'function' ? new WeakMap() : null;
  function occOf(e) {
    if (!OCC || !e || typeof e !== 'object') return null;
    let o = OCC.get(e);
    if (!o) { o = { mid: 0, tip: 0, hilt: 0 }; OCC.set(e, o); }
    return o;
  }
  function solve(m, P, e, t, dead) {
    const n = m.nodes, K = m.props || KAEL_PROPS;
    const sq = P.sq;
    n.fall.r[0] = 0; n.fall.r[1] = P.fallA; n.fall.r[2] = P.fallD;
    n.body.p[0] = 0; n.body.p[1] = 0; n.body.p[2] = P.bz;
    n.body.r[0] = P.br; n.body.r[1] = P.bp; n.body.r[2] = P.by - P.fallD;
    n.body.s[0] = 1 - sq * 0.45; n.body.s[1] = 1 - sq * 0.45; n.body.s[2] = 1 + sq;
    const hz = P.hz + K.HZ0;
    n.hips.p[2] = hz; n.hips.r[2] = P.hy;
    const to = n.torso;
    to.p[0] = 0; to.p[1] = 0; to.p[2] = hz + 0.5;
    to.r[0] = P.tr; to.r[1] = P.tp; to.r[2] = P.ty;
    n.head.r[0] = P.hr; n.head.r[1] = P.hp - P.tp * 0.5; n.head.r[2] = P.hyw;
    M3.trs(TM, to.p, to.r, ONE);
    xf(TM, 0, -K.SHY, K.SHZ, SL); xf(TM, 0, K.SHY, K.SHZ, SR);
    M3.trs(HM, n.hips.p, n.hips.r, ONE);
    xf(HM, 0, -K.HIPY, -1.0, JL); xf(HM, 0, K.HIPY, -1.0, JR);
    // Pernas (alvo = tornozelo)
    T1[0] = P.fL[0]; T1[1] = P.fL[1]; T1[2] = P.fL[2] + K.ANK;
    ik(n.thighL, n.shinL, JL, T1, K.LTH, K.LSH, POLE_KL, T2);
    T1[0] = P.fR[0]; T1[1] = P.fR[1]; T1[2] = P.fR[2] + K.ANK;
    ik(n.thighR, n.shinR, JR, T1, K.LTH, K.LSH, POLE_KR, T2);
    flatFoot(n.footL, n.thighL, n.shinL, P.toeL);
    flatFoot(n.footR, n.thighR, n.shinR, P.toeR);
    // Braço direito + espada
    BD[0] = P.bd[0]; BD[1] = P.bd[1]; BD[2] = P.bd[2]; norm(BD);
    HT[0] = P.hR[0]; HT[1] = P.hR[1]; HT[2] = P.hR[2] + K.HAND0;
    ik(n.armRu, n.armRf, SR, HT, K.AUP, K.AFO, P.pR, HND);
    const sw = n.sword;
    // Alcance do golpe: a ponta tenta chegar a ~0.9 × blade do centro do corpo, sem passar de 62
    let bs = 1;
    if (!dead) {
      sw.p[0] = HND[0] + BD[0] * 4.4; sw.p[1] = HND[1] + BD[1] * 4.4; sw.p[2] = HND[2] + BD[2] * 4.4;
      if (P.reach > 0) {
        const hx = BD[0], hy = BD[1], hl = Math.hypot(hx, hy) || 1;
        const gx = sw.p[0], gy = sw.p[1];
        const gd = (gx * hx + gy * hy) / hl, gg = gx * gx + gy * gy;
        const disc = gd * gd - gg + P.reach * P.reach;
        const tl = (-gd + Math.sqrt(Math.max(0, disc))) / hl;
        bs = cl(tl / BLADE_L, 1, BLADE_MAX / BLADE_L);
      }
      // A ponta nunca fura o chão (z ≥ 1): levanta a lâmina mantendo a direção horizontal
      const Lt = BLADE_L * bs, tz = P.bz + sw.p[2] + BD[2] * Lt;
      if (tz < 1 && BD[2] < 0) {
        const z = cl((1 - P.bz - sw.p[2]) / Lt, -0.98, 0.98), h = Math.hypot(BD[0], BD[1]) || 1, q = Math.sqrt(1 - z * z) / h;
        BD[0] *= q; BD[1] *= q; BD[2] = z;
      }
      UP[0] = P.bu[0]; UP[1] = P.bu[1]; UP[2] = P.bu[2];
      if (P.fc > 0.001) {
        // Mostra a face larga da lâmina para a câmera (giro do punho em torno da lâmina)
        const a = -(num(e.facing) + P.by);
        const cx = Math.cos(a) - Math.sin(a), cy = Math.sin(a) + Math.cos(a), cz = 1;
        let zx = BD[1] * cz - BD[2] * cy, zy = BD[2] * cx - BD[0] * cz, zz = BD[0] * cy - BD[1] * cx;
        const zl = Math.hypot(zx, zy, zz);
        if (zl > 1e-3) {
          zx /= zl; zy /= zl; zz /= zl;
          if (zx * UP[0] + zy * UP[1] + zz * UP[2] < 0) { zx = -zx; zy = -zy; zz = -zz; }
          UP[0] = mix(UP[0], zx, P.fc); UP[1] = mix(UP[1], zy, P.fc); UP[2] = mix(UP[2], zz, P.fc);
        }
      }
      orient(sw.r, BD, UP);
    }
    n.blade.s[0] = bs;
    n.blade.emi = P.vein; n.hilt.emi = Math.min(P.rune, 1.4);
    // Oclusão aproximada dos halos da espada pelo corpo (os halos são desenhados sem profundidade)
    const oc = occOf(e);
    if (oc) {
      if (dead) { oc.mid = 0; oc.tip = 0; oc.hilt = 0; }
      else {
        const ya = num(e.facing) + P.by, cy = Math.cos(ya), sy = Math.sin(ya);
        const hid = (u) => {
          const x = sw.p[0] + BD[0] * u, y = sw.p[1] + BD[1] * u, z = P.bz + sw.p[2] + BD[2] * u;
          const X = cy * x - sy * y, Y = sy * x + cy * y;
          return cl((-(X + Y) - 3) / 4, 0, 1) * cl((12 - Math.abs(X - Y)) / 4, 0, 1) * (z > 1 && z < 62 ? 1 : 0);
        };
        oc.mid = hid(26 * bs); oc.tip = hid(50 * bs); oc.hilt = hid(-4.4);
      }
    }
    // Braço esquerdo (livre ou na empunhadura)
    if (P.grip2 > 0.001 && !dead) {
      HND2[0] = mix(P.hL[0], HND[0] - BD[0] * 4.0, P.grip2);
      HND2[1] = mix(P.hL[1], HND[1] - BD[1] * 4.0, P.grip2);
      HND2[2] = mix(P.hL[2] + K.HAND0, HND[2] - BD[2] * 4.0, P.grip2);
      ik(n.armLu, n.armLf, SL, HND2, K.AUP, K.AFO, P.pL, T2);
    } else { HT[0] = P.hL[0]; HT[1] = P.hL[1]; HT[2] = P.hL[2] + K.HAND0; ik(n.armLu, n.armLf, SL, HT, K.AUP, K.AFO, P.pL, T2); }
    n.mark.emi = P.markE * (0.85 + 0.2 * Math.sin(t * 4));
    // Abas do casaco: inclinação desejada (no quadril) → pitch/roll locais; a parte de cima recebe ~35%
    // do ângulo e a barra (nó filho) o resto, para o pano dobrar. Vento/flare limitados a ~0.6 rad.
    const legL = n.thighL.r[1], legR = n.thighR.r[1];
    const fl = P.flare + Math.max(0, P.cB) * 0.06;
    for (let i = 0; i < PANELS.length; i++) {
      const nd = n[PANELS[i][0]], hem = n[PANELS[i][0] + '2'], am = nd.r[2];
      const ox = Math.cos(am), oy = Math.sin(am);
      const leg = oy < 0 ? legL : legR;
      const w = Math.sin(t * P.cFq + i * 1.7) * P.cFl;
      let tx = -P.cB * 0.5 * (0.45 + 0.55 * Math.max(0, -ox)) + ox * (fl + w), ty = oy * (fl + w);
      let tl = Math.hypot(tx, ty);
      if (tl > 0.6) { tx *= 0.6 / tl; ty *= 0.6 / tl; }
      if (ox > 0.2) tx += Math.max(0, -leg) * 0.95;          // perna à frente empurra a aba da frente
      else if (ox < -0.2) tx -= Math.max(0, leg) * 0.5;      // perna atrás empurra a aba de trás
      tl = Math.hypot(tx, ty);
      if (tl > 1.0) { tx /= tl; ty /= tl; }
      const lx = tx * ox + ty * oy, ly = -tx * oy + ty * ox;
      nd.r[1] = -lx * 0.35; nd.r[0] = ly * 0.35;
      // barra: nas costas cai um pouco mais (pano pesado), em vez de seguir reta como espeto
      const droop = ox < -0.2 ? Math.max(0, lx) * 0.18 : 0;
      hem.r[1] = -lx * 0.65 + droop; hem.r[0] = ly * 0.65;
    }
  }

  const DEADP = mkP();
  function deadPose(m, e, t) {
    const st = num(e.stateTime, 0.6);
    const k = eoc(cl(st / 0.6, 0, 1));
    const P = rest(DEADP, e);
    // Espada na mão no início da queda (referencial do corpo = raiz quando k = 0)
    BD[0] = P.bd[0]; BD[1] = P.bd[1]; BD[2] = P.bd[2]; norm(BD);
    VA[0] = P.hR[0] + BD[0] * 4.4; VA[1] = P.hR[1] + BD[1] * 4.4; VA[2] = P.hR[2] + HAND0 + BD[2] * 4.4;
    // Cai de lado na tela (perpendicular à câmera), preferindo cair para trás/esquerda
    const f = num(e.facing);
    const g1 = adiff(0, 3 * PI / 4 - f), g2 = adiff(0, -PI / 4 - f);
    const gam = Math.abs(adiff(g1, -2.2)) < Math.abs(adiff(g2, -2.2)) ? g1 : g2;
    P.sq = 0; P.fallD = gam; P.fallA = k * 1.42; P.bz = k * 1.5;
    P.hz = HZR - 1.6 * k; P.tr = -0.1 * k; P.tp = 0.07 + 0.08 * k; P.ty = 0.1;
    P.hr = 0.3 * k; P.hp = 0.1 - 0.3 * k; P.hyw = -0.35 * k;
    set3(P.fL, 1.5, -4.6, mix(0, 0.8, k)); set3(P.fR, mix(-1.6, -3, k), 5.0, mix(0, 2.6, k));
    set3(P.hL, mix(P.hL[0], 6, k), mix(P.hL[1], -13, k), mix(P.hL[2], 33.7, k));
    set3(P.hR, mix(P.hR[0], 4, k), mix(P.hR[1], 12.5, k), mix(P.hR[2], 26.7, k));
    P.vein = mix(P.vein, 0.35, k); P.rune = mix(1, 0.5, k); P.markE = mix(1, 0.6, k);
    P.cB = 0.04 - 0.2 * k; P.flare = 0.06 + 0.12 * k; P.cFl = 0.01;
    solve(m, P, e, t, true);
    // Espada escorrega da mão e cai deitada no chão, ao lado do corpo
    const ks = smooth(cl((k - 0.15) / 0.85, 0, 1));
    const sx = Math.cos(gam + 1.3) * 11, sy = Math.sin(gam + 1.3) * 11;
    VB[0] = mix(VA[0], sx, ks); VB[1] = mix(VA[1], sy, ks); VB[2] = mix(VA[2], 1.4, ks);
    const da = gam + 2.2;
    VC2[0] = mix(BD[0], Math.cos(da), ks); VC2[1] = mix(BD[1], Math.sin(da), ks); VC2[2] = mix(BD[2], -0.01, ks); norm(VC2);
    PK[0] = mix(0, -Math.sin(da), ks); PK[1] = mix(0, Math.cos(da), ks); PK[2] = mix(1, 0, ks);
    // raiz → corpo: inverso de (fall · body)
    const n = m.nodes;
    M3.trs(MA, Z3, n.fall.r, ONE); M3.trs(MB, n.body.p, n.body.r, ONE); M3.mul(MC, MA, MB);
    transposeRot(MD, MC);
    const sw = n.sword;
    xf(MD, VB[0] - MC[3], VB[1] - MC[7], VB[2] - MC[11], sw.p);
    xf(MD, VC2[0], VC2[1], VC2[2], T1); xf(MD, PK[0], PK[1], PK[2], T2);
    orient(sw.r, T1, T2);
    n.blade.s[0] = 1;
  }

  const POSE = mkP();
  const OPT0 = {}, OPTF = { flash: 0.85 }, OPTS = { emi: 1.25 };
  // Dedos no espaço da mão (−Z ao longo da mão, +X para a frente, a palma voltada para o corpo):
  // [dedo, x, y (para dentro), z da base, comprimento das falanges]
  const FINGERS = [
    [0, 0.62, 0.42, -0.55, [0.72, 0.58]],
    [1, 0.72, 0.05, -1.85, [0.74, 0.5, 0.4]],
    [2, 0.24, 0.0, -1.95, [0.8, 0.54, 0.42]],
    [3, -0.24, 0.02, -1.9, [0.74, 0.5, 0.4]],
    [4, -0.66, 0.08, -1.75, [0.6, 0.42, 0.34]],
  ];
  // Fecha os dedos de uma mão: k = 0 aberta, 1 punho fechado; o polegar cruza por cima
  function curl(n, nm, s, k) {
    if (!n['hand' + nm]) return;
    for (const [d, , , , segs] of FINGERS) {
      for (let j = 0; j < segs.length; j++) {
        const fn = n['f' + nm + d + 'abc'[j]];
        if (!fn) continue;
        if (d === 0) { fn.r[0] = -s * k * (j ? 0.7 : 0.55); fn.r[1] = k * (j ? 0.35 : 0.5); }
        else fn.r[0] = -s * k * [1.35, 1.5, 1.1][j] * (1 + (d - 1) * 0.04);
      }
    }
  }

  // Movimento secundário (casaco, capuz e cabelo): molas amortecidas por entidade, empurradas pela
  // aceleração e pelo giro do corpo. Só nos modelos com m.sec (o Kael com a arte e os aliados).
  const SEC = typeof WeakMap === 'function' ? new WeakMap() : null;
  function spring(s, k, target, dt, w, z) {
    const v = k + 'v';
    s[v] += (w * w * (target - s[k]) - 2 * z * w * s[v]) * dt;
    s[v] = cl(s[v], -40, 40);
    s[k] = cl(s[k] + s[v] * dt, -1.2, 1.2);
  }
  function secondary(m, e, P) {
    if (!SEC || !e || typeof e !== 'object') return;
    const n = m.nodes, t = num(e.animTime), f = num(e.facing);
    let s = SEC.get(e);
    if (!s) { s = { t, f, vf: 0, vs: 0, bz: P.bz, cx: 0, cxv: 0, cy: 0, cyv: 0, h: 0, hv: 0, r: 0, rv: 0 }; SEC.set(e, s); }
    const dt = t - s.t;
    if (dt > 0 && dt < 0.1) {
      // velocidade no referencial do corpo (frente / lado) e o giro
      const c = Math.cos(f), sn = Math.sin(f), vx = num(e.vx), vy = num(e.vy);
      const vf = vx * c + vy * sn, vs = -vx * sn + vy * c;
      const af = (vf - s.vf) / dt, as = (vs - s.vs) / dt, yaw = adiff(s.f, f) / dt, vz = (P.bz - s.bz) / dt;
      s.vf = vf; s.vs = vs;
      // o pano fica para trás quando o corpo acelera e abre para fora no giro
      spring(s, 'cx', cl(-af * 0.00045, -0.45, 0.45), dt, 15, 0.32);
      spring(s, 'cy', cl(-as * 0.00045 - yaw * 0.06, -0.45, 0.45), dt, 15, 0.32);
      // capuz e cabelo: balançam com a subida e a descida do corpo e com o giro
      spring(s, 'h', cl(-vz * 0.02 - af * 0.0002, -0.35, 0.35), dt, 18, 0.28);
      spring(s, 'r', cl(-yaw * 0.035 - vz * 0.01, -0.3, 0.3), dt, 22, 0.3);
    } else if (!(dt >= 0 && dt < 0.1)) { s.cx = s.cy = s.h = s.r = 0; s.cxv = s.cyv = s.hv = s.rv = 0; }
    s.t = t; s.f = f; s.bz = P.bz;
    for (let i = 0; i < PANELS.length; i++) {
      const nd = n[PANELS[i][0]], hem = n[PANELS[i][0] + '2'], am = nd.r[2];
      const ox = Math.cos(am), oy = Math.sin(am);
      const lx = s.cx * ox + s.cy * oy, ly = -s.cx * oy + s.cy * ox;
      nd.r[1] -= lx * 0.3; nd.r[0] += ly * 0.3;
      hem.r[1] -= lx * 0.7; hem.r[0] += ly * 0.7;
    }
    if (n.hood) { n.hood.r[1] += s.h; n.hood.r[0] += s.r * 0.5; }
    if (n.hair) { n.hair.r[1] += s.h * 0.35; n.hair.r[2] += s.r * 0.6; }
  }
  // Mãos: a direita fecha no cabo; a esquerda fecha em punho, abre ao lançar habilidades
  function hands(m, e, P, dead, free) {
    const n = m.nodes;
    if (!n.handR) return;
    const a = e && e.attack, d = a && a.def;
    const cast = e && e.state === 'attack' && d && d.ability && !d.thrust;
    curl(n, 'R', 1, dead ? 0.55 : free ? 0.4 : 1);
    curl(n, 'L', -1, dead ? 0.4 : P.grip2 > 0.5 ? 1 : cast ? 0.2 : 0.85);
  }

  MODELS3D.kael = {
    build(props) {
      const K = props || KAEL_PROPS;
      const root = new N3('root');
      const fall = root.add(new N3('fall'));
      const body = fall.add(new N3('body'));
      const hips = body.add(new N3('hips', gHips()));
      hips.p = [0, 0, 26.5 + K.HZ0];
      const D2R = PI / 180;
      for (const pd of PANELS) {
        const r = gPanel(pd[1] * D2R, pd[2] * D2R, pd[3], pd[4], pd[5], pd[6] ? [pd[6][0] * D2R, pd[6][1] * D2R] : null);
        const nd = hips.add(new N3(pd[0], r.gU));
        nd.p = r.pv.slice(); nd.r = [0, 0, r.am];
        const hem = nd.add(new N3(pd[0] + '2', r.gL));
        hem.p = r.cp.slice();
      }
      const torso = body.add(new N3('torso', gTorso()));
      torso.p = [0, 0, 27 + K.HZ0];
      const head = torso.add(new N3('head', gHead()));
      head.p = [0.2, 0, K.NECK]; head.s = [1.08, 1.08, 1.08];
      // Ossos sem geometria no modelo procedural (o Kael com a arte usa: pele do capuz e do
      // cabelo com movimento secundário, luvas com dedos)
      const hood = torso.add(new N3('hood'));
      hood.p = [-2.4, 0, K.NECK - 1.2];
      const hair = head.add(new N3('hair'));
      hair.p = [0, 0, (K.HAIR || 6.0)];
      const mkArm = (s, nm) => {
        const u = body.add(new N3('arm' + nm + 'u', gUpper(s)));
        const f = u.add(new N3('arm' + nm + 'f', gFore(s)));
        f.p = [0, 0, -K.AUP];
        // mão no punho e dedos: 'f' + lado + dedo (0 polegar … 4 mínimo) + falange (a, b, c)
        const h = f.add(new N3('hand' + nm));
        h.p = [0, 0, -K.AFO];
        for (const [d, x, y, z, segs] of FINGERS) {
          let par = h;
          for (let j = 0; j < segs.length; j++) {
            const fn = par.add(new N3('f' + nm + d + 'abc'[j]));
            fn.p = j ? [0, 0, -segs[j - 1]] : [x, -s * y, z];
            par = fn;
          }
        }
        return f;
      };
      const fl = mkArm(-1, 'L'); mkArm(1, 'R');
      fl.add(new N3('mark', gMark()));
      const mkLeg = (s, nm) => {
        const th = body.add(new N3('thigh' + nm, gThigh(s)));
        const sh = th.add(new N3('shin' + nm, gShin(s)));
        sh.p = [0, 0, -K.LTH];
        const ft = sh.add(new N3('foot' + nm, gFoot(s)));
        ft.p = [0, 0, -K.LSH];
      };
      mkLeg(-1, 'L'); mkLeg(1, 'R');
      const sword = body.add(new N3('sword'));
      sword.add(new N3('blade', buildTempestadeNula(new G3(), 1, 'blade', 0)));
      sword.add(new N3('hilt', buildTempestadeNula(new G3(), 1, 'hilt', 0)));
      const m = new Model3(root);
      if (props) m.props = props;
      m.anchor('eyes', 'head', [4.4, 0, 7.6]);
      m.anchor('mark', 'mark', [0.3, -1.4, -8.5]);
      m.anchor('hilt', 'hilt', [0, 0, 0]);
      m.anchor('swordMid', 'blade', [26, 0, 0]);
      m.anchor('swordTip', 'blade', [50, 0, 0]);
      m.anchor('chest', 'torso', [4.4, 0, 8.5]);
      return m;
    },

    pose(m, e, o) {
      if (!e) { solve(m, rest(POSE, {}), {}, 0, false); hands(m, null, POSE, false); return; }
      const t = num(e.animTime);
      const st = e.state;
      if (st === 'dead') { deadPose(m, e, t); hands(m, e, DEADP, true); if (m.sec) secondary(m, e, DEADP); return; }
      let P;
      if (st === 'run') P = runPose(POSE, e);
      else if (st === 'attack') P = attackPose(POSE, e);
      else if (st === 'charge') P = chargePose(POSE, e);
      else if (st === 'dash') P = dashPose(POSE, e);
      else if (st === 'hurt') P = hurtPose(POSE, e);
      else if (st === 'special') P = specialPose(POSE, e);
      else if (num(e.moveSpeed) > 40) P = runPose(POSE, e);
      else P = rest(POSE, e);
      // arma guardada (mão livre) e o gesto de sacar/guardar (js/heroes/armas3d.js)
      const free = typeof WeaponRig !== 'undefined' && WeaponRig.handPose(m, e, P, m.props || KAEL_PROPS);
      solve(m, P, e, t, false);
      hands(m, e, P, false, free);
      if (m.sec) secondary(m, e, P);
    },

    opts(e) {
      if (!e) return OPT0;
      if (num(e.flash) > 0 && e.state !== 'dead') return OPTF;
      if (e.state === 'special') return OPTS;
      return OPT0;
    },

    // Halos discretos: marca do pulso, lâmina (energia), ponta no golpe/carga/especial
    glows(e, add) {
      if (!e) return;
      const t = num(e.animTime), st = e.state;
      const dead = st === 'dead';
      const pulse = Math.sin(t * 4);
      const a = e.attack, d = a && a.def;
      const atk = st === 'attack' && d;
      const castOn = atk && d.ability && (d.shock || d.noHit) && !d.plasma && num(a.t) < num(d.windup) + num(d.active);
      add('mark', (castOn ? 8 : 6) + 1.5 * pulse, '61,139,255', castOn ? 0.5 : (0.4 + 0.1 * pulse) * (dead ? 0.5 : 1));
      let glow = 0, big = 0;
      if (atk) {
        const live = num(a.t) < num(d.windup) + num(d.active);
        glow = live ? 0.75 : 0.25;
        if (d.plasma && live) { glow = 0.6 + 0.4 * cl(num(a.t) / Math.max(0.01, num(d.windup)), 0, 1); }
      } else if (st === 'charge') { const l = cl(num(e.chargeLevel), 0, 2); glow = 0.45 + l * 0.2 + 0.1 * Math.sin(t * 30); big = l >= 2 ? 1 : 0; }
      else if (st === 'special') { glow = 1; big = 1; }
      const energy = dead ? 0.05 : Math.max(glow, 0.1 + 0.25 * furyOf(e));
      // Halos atrás do corpo (vista de costas) são atenuados; a ponta, fora da silhueta, assume o brilho
      // espada guardada nas costas (js/heroes/armas3d.js): os halos da lâmina ficam lá, discretos
      if (e.wpnOut === false && typeof WeaponRig !== 'undefined' && WeaponRig.ok) { WeaponRig.glows('kael', e, add); return; }
      const oc = OCC && OCC.get(e), hm = oc ? oc.mid : 0, ht = oc ? oc.tip : 0, hh = oc ? oc.hilt : 0;
      add('swordMid', Math.min(14, 6 + energy * 8) + big * 8 * (1 - hm), '50,120,255', (Math.min(0.42, 0.1 + energy * 0.3) + big * 0.15) * (1 - 0.7 * hm));
      add('hilt', 4.5, '80,160,255', (dead ? 0.2 : 0.35) * (1 - 0.7 * hh));
      const tg = Math.max(glow, hm * energy * 0.6);
      if (tg > 0) add('swordTip', Math.min(12, 4 + tg * 6) + big * 8 * (1 - ht), '170,215,255', (Math.min(0.45, tg * 0.42) + big * 0.2) * (1 - 0.7 * ht));
      // Investida Sombria: acento roxo discreto no peito durante o golpe
      if (atk && d.thrust && d.ability && num(a.t) < num(d.windup) + num(d.active)) add('chest', 9, '170,120,255', 0.3);
    },

    demos: (function () {
      const mk = (f, st, extra) => {
        const p = new Player(0, 0);
        p.facing = f; p.state = st;
        if (extra) extra(p);
        return p;
      };
      const atk = (id, frac, ph) => (f) => mk(f, 'attack', (p) => {
        const d = ATTACKS[id];
        let tt;
        if (ph === 'w') tt = d.windup * frac;
        else if (ph === 'r') tt = d.windup + d.active + d.recovery * frac;
        else tt = d.windup + d.active * frac;
        p.attack = { id, def: d, t: tt, dir: f, hits: new Map(), counts: new Map(), charge: 0, mult: 1 };
        p.stateTime = tt; p.animTime = 1.3 + tt; p.fury = 40;
      });
      return [
        { label: 'idle', e: (f) => mk(f, 'idle', (p) => { p.animTime = 0.3; p.fury = 20; }) },
        { label: 'run A', e: (f) => mk(f, 'run', (p) => { p.animTime = 0.1208; p.moveSpeed = 235; }) },
        { label: 'run B', e: (f) => mk(f, 'run', (p) => { p.animTime = 0.3625; p.moveSpeed = 235; }) },
        { label: 'light1 mid', e: atk('light1', 0.5) },
        { label: 'light2 windup', e: atk('light2', 0.6, 'w') },
        { label: 'light3 mid', e: atk('light3', 0.5) },
        { label: 'light1 recovery', e: atk('light1', 0.6, 'r') },
        { label: 'spin', e: atk('spin', 0.3) },
        { label: 'thrust', e: atk('thrust', 0.5) },
        { label: 'slam impact', e: atk('slam', 0.85) },
        { label: 'slam windup', e: atk('slam', 0.9, 'w') },
        { label: 'heavy', e: atk('heavy', 0.4) },
        { label: 'charged', e: atk('charged', 0.5) },
        { label: 'uppercut', e: atk('uppercut', 0.7) },
        { label: 'wave', e: atk('wave', 0.5) },
        { label: 'volt', e: atk('volt', 0.5) },
        { label: 'zap', e: atk('zap', 0.5) },
        { label: 'plasma windup', e: atk('plasma', 0.85, 'w') },
        { label: 'plasma burst', e: atk('plasma', 0.6) },
        { label: 'storm A', e: atk('storm', 0.1) },
        { label: 'storm B', e: atk('storm', 0.27) },
        { label: 'lunge', e: atk('lunge', 0.5) },
        { label: 'charge lv2', e: (f) => mk(f, 'charge', (p) => { p.chargeLevel = 2; p.animTime = 0.5; p.stateTime = 1.1; }) },
        { label: 'dash', e: (f) => mk(f, 'dash', (p) => { p.stateTime = 0.08; p.animTime = 0.4; p.moveSpeed = 800; }) },
        { label: 'hurt', e: (f) => mk(f, 'hurt', (p) => { p.stateTime = 0.06; p.animTime = 0.6; }) },
        { label: 'special rise', e: (f) => mk(f, 'special', (p) => { p.stateTime = 0.35; p.animTime = 0.7; p.z = 26; }) },
        { label: 'special strike', e: (f) => mk(f, 'special', (p) => { p.stateTime = 0.6; p.animTime = 0.9; p.z = 4; }) },
        { label: 'dead', e: (f) => mk(f, 'dead', (p) => { p.stateTime = 0.6; p.animTime = 2; }) },
      ];
    })(),
  };
})();
