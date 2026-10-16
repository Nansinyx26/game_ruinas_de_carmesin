// ---------------------------------------------------------------------------
// CÁPSULA DE REPARO: cânister de casco branco-acinzentado (prisma octogonal
// chanfrado), faixas escuras nas pontas e cruzes vermelho-rosadas emissivas
// nos quatro painéis e no topo. Gira e balança levemente.
// e = { t } (tempo de vida em segundos). Origem = ponto flutuante do item.
// ---------------------------------------------------------------------------
(function () {
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
  const RED = '#ff3c6e', CROSS = '#a01434';

  // Perfil octogonal chanfrado (meia largura a, chanfro c), no plano XY
  function octo(a, c) {
    return [[a, -a + c], [a, a - c], [a - c, a], [-a + c, a], [-a, a - c], [-a, -a + c], [-a + c, -a], [a - c, -a]];
  }
  // Extrusão em anéis: rings = [[z, escala], ...]; col(i, k) por face i e faixa k
  function loft(g, prof, rings, col, em, caps) {
    const n = prof.length;
    const P = (k, i) => { const p = prof[i % n], s = rings[k][1]; return [p[0] * s, p[1] * s, rings[k][0]]; };
    for (let k = 0; k < rings.length - 1; k++) {
      for (let i = 0; i < n; i++) g.quad(P(k, i), P(k, i + 1), P(k + 1, i + 1), P(k + 1, i), col(i, k), em(i, k));
    }
    if (caps) {
      for (const k of [0, rings.length - 1]) {
        const pts = []; for (let i = 0; i < n; i++) pts.push(P(k, i));
        g.poly(pts, caps.col, caps.e);
      }
    }
    return g;
  }
  // Cruz plana num painel vertical voltado para +X (a, largura do braço w, comprimento L)
  function crossX(g, x, z, L, w, col, e) {
    g.quad([x, -w / 2, z - L / 2], [x, w / 2, z - L / 2], [x, w / 2, z + L / 2], [x, -w / 2, z + L / 2], col, e);
    g.quad([x, -L / 2, z - w / 2], [x, L / 2, z - w / 2], [x, L / 2, z + w / 2], [x, -L / 2, z + w / 2], col, e);
  }

  MODELS3D.capsula = {
    build() {
      const root = new N3('root');
      const spin = root.add(new N3('spin'));
      spin.p = [0, 0, 1];
      const tilt = spin.add(new N3('tilt'));

      // A cápsula é modelada de pé (eixo Z) e deitada pelo nó 'body' (eixo vira +X)
      const A = 3.3, CH = 1.0, prof = octo(A, CH);
      const HULL = '#bcc3cf', CHAM = '#858d9b', DOME = '#a3abb8', BAND = '#323844', PANEL = '#191e2c';
      const E = 0.6;
      const g = new G3();
      // Seção central (painéis claros, chanfros mais escuros)
      loft(g, prof, [[-3.7, 1], [3.7, 1]], (i) => (i % 2 ? CHAM : HULL), () => 0);
      // Faixas escuras salientes
      loft(g, prof, [[-4.6, 1.05], [-3.7, 1.05]], () => BAND, () => 0);
      loft(g, prof, [[3.7, 1.05], [4.6, 1.05]], () => BAND, () => 0);
      // Pontas arredondadas (dois anéis facetados) com lente vermelha
      const tipCol = (i, k) => (i % 2 ? CHAM : (k === 0 ? DOME : HULL));
      loft(g, prof, [[-6.6, 0.42], [-5.8, 0.8], [-4.6, 1]], tipCol, () => 0, { col: BAND, e: 0 });
      loft(g, prof, [[4.6, 1], [5.8, 0.8], [6.6, 0.42]], (i, k) => tipCol(i, 1 - k), () => 0, { col: BAND, e: 0 });
      for (const zz of [-6.65, 6.65]) g.quad([-0.6, -0.6, zz], [0.6, -0.6, zz], [0.6, 0.6, zz], [-0.6, 0.6, zz], CROSS, E * 1.3);
      // Placas escuras e cruzes emissivas nos quatro painéis
      const ap = A + 0.04;
      for (let s = 0; s < 4; s++) {
        g.at(0, 0, 0, 0, 0, (s * Math.PI) / 2);
        g.quad([ap, -2.0, -2.9], [ap, 2.0, -2.9], [ap, 2.0, 2.9], [ap, -2.0, 2.9], PANEL, 0);
        g.quad([ap + 0.1, -0.6, -2.3], [ap + 0.1, 0.6, -2.3], [ap + 0.1, 0.6, 2.3], [ap + 0.1, -0.6, 2.3], CROSS, E);
        g.quad([ap + 0.1, -1.75, -0.6], [ap + 0.1, 1.75, -0.6], [ap + 0.1, 1.75, 0.6], [ap + 0.1, -1.75, 0.6], CROSS, E);
      }
      g.at();
      const body = tilt.add(new N3('body', g));
      body.r = [0, Math.PI / 2, 0];

      const m = new Model3(root);
      m.anchor('core', 'tilt', [0, 0, 0]);
      return m;
    },
    pose(m, e) {
      const n = m.nodes, t = num(e && e.t);
      n.spin.r[2] = t * 1.6;
      n.tilt.r[0] = Math.sin(t * 2.1) * 0.08;
      n.tilt.r[1] = Math.sin(t * 1.4) * 0.14;
      n.body.emi = 1 + 0.18 * Math.sin(t * 5);
    },
    glows(e, add) {
      const t = num(e && e.t);
      add('core', 16, '255,60,110', 0.25 + 0.08 * Math.sin(t * 5));
    },
    demos: [
      { label: 't=0', e: () => ({ t: 0, z: 6 }) },
      { label: 't=0.7', e: () => ({ t: 0.7, z: 8 }) },
      { label: 't=1.9', e: () => ({ t: 1.9, z: 5 }) },
      { label: 't=4.3', e: () => ({ t: 4.3, z: 7 }) },
    ],
  };
})();
