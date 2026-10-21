// ---------------------------------------------------------------------------
// FRAGMENTO DE MEMÓRIA: cristal facetado azul claro partido ao meio, com um
// núcleo branco à mostra, estilhaços em órbita e um anel de dados inclinado.
// e = { t } (tempo de vida em segundos). O jogo desenha a origem 10 px abaixo
// do ponto flutuante, por isso o centro do cristal fica em z ≈ 10.
// ---------------------------------------------------------------------------
(function () {
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
  const CZ = 10.5;   // centro do cristal (núcleo)

  // Sólido de revolução facetado: rings = [[z, r], ...]; r = 0 vira ponta.
  // col(i, k) / em(i, k) escolhem cor e emissão por lado i e faixa k; rj[i] deforma o raio
  function lathe(g, rings, seg, col, em, rot = 0, rj = null, caps = false) {
    const P = (k, i) => {
      const a = rot + (i / seg) * Math.PI * 2, r = rings[k][1] * (rj ? rj[i % seg] : 1);
      return [Math.cos(a) * r, Math.sin(a) * r, rings[k][0]];
    };
    for (let k = 0; k < rings.length - 1; k++) {
      const r0 = rings[k][1], r1 = rings[k + 1][1];
      for (let i = 0; i < seg; i++) {
        const j = i + 1, c = col(i, k), e = em(i, k);
        if (r0 < 0.001) g.tri([0, 0, rings[k][0]], P(k + 1, j), P(k + 1, i), c, e);
        else if (r1 < 0.001) g.tri(P(k, i), P(k, j), [0, 0, rings[k + 1][0]], c, e);
        else g.quad(P(k, i), P(k, j), P(k + 1, j), P(k + 1, i), c, e);
      }
    }
    if (caps) {
      for (const k of [0, rings.length - 1]) {
        if (rings[k][1] < 0.001) continue;
        const pts = []; for (let i = 0; i < seg; i++) pts.push(P(k, i));
        g.poly(pts, caps.col, caps.e);
      }
    }
    return g;
  }

  MODELS3D.memoria = {
    build() {
      const root = new N3('root');
      const float = root.add(new N3('float'));

      // Cristal principal (duas metades) + núcleo
      const A = '#5c96e2', B = '#24508f', C = '#74a8ee', IN = '#3f78cc';
      const rj = [1.0, 0.86, 1.06, 0.92, 1.02, 0.84];
      const low = lathe(new G3(), [[CZ - 10.5, 0], [CZ - 1.3, 4.4]], 6,
        (i) => (i % 2 ? B : A), (i) => (i % 2 ? 0.2 : 0.3), 0.3, rj, { col: IN, e: 0.45 });
      const up = lathe(new G3(), [[CZ + 1.3, 4.4], [CZ + 5.6, 3.8], [CZ + 12.5, 0]], 6,
        (i, k) => (k === 0 ? (i % 2 ? A : C) : (i % 2 ? B : A)), (i, k) => (k === 0 ? (i % 2 ? 0.3 : 0.32) : (i % 2 ? 0.2 : 0.3)), 0.3, rj,
        { col: IN, e: 0.45 });
      const crystal = float.add(new N3('crystal'));
      crystal.add(new N3('low', low));
      crystal.add(new N3('up', up));
      const core = crystal.add(new N3('core', lathe(new G3(), [[-3.0, 0], [0, 2.9], [3.0, 0]], 4,
        () => '#ffffff', () => 1.9, 0.6)));
      core.p = [0, 0, CZ];

      // Estilhaços em órbita
      const orbit = float.add(new N3('orbit'));
      orbit.p = [0, 0, CZ];
      const SH = [
        { a: 0.0, R: 9.0, z: 4.5, h: 5.0, r: 1.6, tilt: 0.35 },
        { a: 1.75, R: 9.8, z: -2.0, h: 3.8, r: 1.25, tilt: -0.4 },
        { a: 3.3, R: 8.6, z: 1.5, h: 4.4, r: 1.45, tilt: 0.25 },
        { a: 4.7, R: 9.4, z: -5.0, h: 3.2, r: 1.1, tilt: -0.3 },
      ];
      SH.forEach((s, i) => {
        const g = lathe(new G3(), [[-s.h * 0.4, 0], [0, s.r], [s.h * 0.6, 0]], 4,
          (k) => (k % 2 ? B : C), (k) => (k % 2 ? 0.3 : 0.5), 0.4 * i);
        const n = orbit.add(new N3('shard' + i, g));
        n.p = [Math.cos(s.a) * s.R, Math.sin(s.a) * s.R, s.z];
        n.r = [s.tilt, s.tilt * 0.6, s.a];
      });

      // Anel de dados (arcos com falhas) inclinado
      const ringT = float.add(new N3('ringTilt'));
      ringT.p = [0, 0, CZ - 1]; ringT.r = [0.3, 0.1, 0];
      const rg = new G3(), SEG = 24, R0 = 10.8, R1 = 11.6;
      for (let i = 0; i < SEG; i++) {
        if (i % 8 === 7) continue;   // três falhas
        const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
        const p = (a, r) => [Math.cos(a) * r, Math.sin(a) * r, 0];
        rg.quad(p(a0, R0), p(a1, R0), p(a1, R1), p(a0, R1), i % 8 === 0 ? '#ffffff' : '#6a9ae0', i % 8 === 0 ? 1.2 : 0.35);
      }
      ringT.add(new N3('ring', rg));

      const m = new Model3(root);
      m.anchor('core', 'core', [0, 0, 0]);
      return m;
    },
    pose(m, e) {
      const n = m.nodes, t = num(e && e.t);
      n.crystal.r[2] = t * 0.7;
      n.crystal.r[0] = Math.sin(t * 0.9) * 0.05;
      const br = Math.sin(t * 2.2);
      n.up.p[2] = 0.5 + br * 0.5;
      n.low.p[2] = -0.5 - br * 0.5;
      n.core.r[2] = -t * 1.6;
      const pulse = 1 + 0.15 * Math.sin(t * 3);
      n.core.emi = pulse;
      n.orbit.r[2] = -t * 1.1;
      for (let i = 0; i < 4; i++) {
        const s = n['shard' + i];
        s.r[2] += t * (1.5 + i * 0.4);
        s.p[2] += Math.sin(t * 1.8 + i * 1.7) * 1.2;
      }
      n.ring.r[2] = t * 0.9;
      n.ringTilt.r[1] = 0.1 + Math.sin(t * 0.7) * 0.08;
      n.ringTilt.r[2] = t * 0.35;   // precessão lenta do anel
    },
    glows(e, add) {
      const t = num(e && e.t), p = 0.5 + 0.5 * Math.sin(t * 3);
      add('core', 26, '140,200,255', 0.28 + 0.12 * p);
      add('core', 8, '220,240,255', 0.26 + 0.12 * p);
    },
    demos: [
      { label: 't=0', e: () => ({ t: 0, z: 12 }) },
      { label: 't=0.9', e: () => ({ t: 0.9, z: 14 }) },
      { label: 't=2.3', e: () => ({ t: 2.3, z: 10 }) },
      { label: 't=6.1', e: () => ({ t: 6.1, z: 12 }) },
    ],
  };
})();
