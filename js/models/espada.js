// ---------------------------------------------------------------------------
// TEMPESTADE NULA em grande escala (tela de título / história)
// Reaproveita buildTempestadeNula() de kael.js (chamada só dentro de build(),
// pois este arquivo é carregado antes). A espada fica de pé, flutuando e
// girando devagar; em t = 0 a face larga da lâmina está voltada para a câmera.
// e = { t, facing }
// ---------------------------------------------------------------------------
(function () {
  const K = 3.4;                       // lâmina ≈ 177, total ≈ 236
  const MID = (52 - 17.6) / 2;         // centro do comprimento total (unidades da espada, k = 1)
  const OPT = { emi: 1.0 };
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
  MODELS3D.espada = {
    build() {
      const root = new N3('root');
      const spin = root.add(new N3('spin'));
      spin.p = [0, 0, 128];
      const tilt = spin.add(new N3('tilt'));
      const sword = tilt.add(new N3('sword'));
      // +X da espada aponta para cima; o centro do comprimento fica no pivô
      sword.r = [0, -Math.PI / 2, 0];
      sword.p = [0, 0, -MID * K];
      sword.add(new N3('blade', buildTempestadeNula(new G3(), K, 'blade', 1)));
      sword.add(new N3('hilt', buildTempestadeNula(new G3(), K, 'hilt', 1)));
      const m = new Model3(root);
      m.anchor('rune', 'hilt', [0, 0, 0]);
      m.anchor('mid', 'blade', [26 * K, 0, 0]);
      m.anchor('tip', 'blade', [50 * K, 0, 0]);
      m.anchor('pommel', 'hilt', [-16 * K, 0, 0]);
      return m;
    },
    pose(m, e) {
      const n = m.nodes, t = num(e.t);
      // Compensa a direção aplicada pelo motor: em t = 0 a face da lâmina olha para a câmera
      n.spin.r[2] = -num(e.facing) - Math.PI / 4 + t * 0.6;
      n.spin.p[2] = 128 + Math.sin(t * 1.3) * 4;
      n.tilt.r[0] = 0.12 + Math.sin(t * 0.8) * 0.05;
      n.tilt.r[1] = Math.sin(t * 0.55) * 0.06;
      n.blade.emi = 1.6 + Math.sin(t * 5) * 0.15;
      n.hilt.emi = 1.4;
    },
    opts() { return OPT; },
    glows(e, add) {
      const t = num(e.t), p = 0.5 + 0.5 * Math.sin(t * 5);
      add('mid', 70, '50,120,255', 0.18 + 0.06 * p);
      add('tip', 26, '170,215,255', 0.35 + 0.12 * p);
      add('rune', 22, '80,160,255', 0.55);
      add('pommel', 10, '80,160,255', 0.35);
    },
    demos: [
      { label: 't=0', e: (f) => ({ t: 0, facing: f }) },
      { label: 't=1.4', e: (f) => ({ t: 1.4, facing: f }) },
      { label: 't=5.2', e: (f) => ({ t: 5.2, facing: f }) },
    ],
  };
})();
