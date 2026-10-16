// ---------------------------------------------------------------------------
// CÉLULA DE ENERGIA: pequeno cristal bipiramidal azul (#5aa0ff) emissivo, com
// uma cinta luminosa no equador e duas faíscas em órbita. Gira rápido.
// e = { t } (tempo de vida em segundos). Origem = ponto flutuante do item;
// o cristal ocupa z ≈ −3…5 (≈ 8 de altura), centro em z = 1.
// Até 36 células são desenhadas por quadro: geometria mínima (~170 vértices).
// ---------------------------------------------------------------------------
(function () {
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
  const CZ = 1;   // centro (cinta) do cristal

  // Bipirâmide de n lados: ponta de cima em +top, de baixo em −bot, cinta de raio r
  function bipyr(g, n, r, top, bot, rot, colA, colB, eA, eB) {
    const P = (i) => { const a = rot + (i / n) * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r, 0]; };
    for (let i = 0; i < n; i++) {
      const a = P(i), b = P(i + 1), odd = i % 2;
      g.tri(a, b, [0, 0, top], odd ? colB : colA, odd ? eB : eA);
      g.tri(b, a, [0, 0, -bot], odd ? colA : colB, odd ? eA : eB);
    }
    return g;
  }

  MODELS3D.celula = {
    build() {
      const root = new N3('root');
      const spin = root.add(new N3('spin'));
      spin.p = [0, 0, CZ];
      const tilt = spin.add(new N3('tilt'));

      // Cristal: facetas claras e escuras alternadas para manter o volume legível
      const g = bipyr(new G3(), 6, 2.35, 5.0, 4.0, 0, '#3d84ee', '#173f9e', 0.5, 0.32);
      const crystal = tilt.add(new N3('crystal', g));

      // Cinta equatorial luminosa (núcleo à mostra)
      const band = new G3();
      band.cyl(0, 0, -0.22, 2.45, 2.45, 0.44, 6, '#a8d4ff', 1.0, { caps: false });
      crystal.add(new N3('band', band));

      // Duas faíscas em órbita inclinada
      const orb = spin.add(new N3('orb'));
      orb.r = [0.35, 0, 0];
      for (let k = 0; k < 2; k++) {
        const s = new G3();
        bipyr(s, 4, 0.5, 0.8, 0.8, 0, '#8cc4ff', '#4f8ef0', 0.9, 0.6);
        const n = orb.add(new N3('spark' + k, s));
        const a = k * Math.PI;
        n.p = [Math.cos(a) * 4.6, Math.sin(a) * 4.6, 0];
      }

      const m = new Model3(root);
      m.anchor('core', 'spin', [0, 0, 0]);
      return m;
    },
    pose(m, e) {
      const n = m.nodes, t = num(e && e.t);
      n.spin.r[2] = t * 4.2;
      n.tilt.r[0] = Math.sin(t * 2.6) * 0.12;
      n.tilt.r[1] = Math.cos(t * 2.1) * 0.1;
      const pulse = 1 + 0.18 * Math.sin(t * 7);
      n.crystal.emi = pulse;
      n.orb.r[2] = -t * 6.5;
      n.spark0.r[2] = t * 9; n.spark1.r[2] = -t * 9;
    },
    glows(e, add) {
      const t = num(e && e.t);
      add('core', 11, '90,160,255', 0.32 + 0.1 * Math.sin(t * 7));
    },
    demos: [
      { label: 't=0', e: () => ({ t: 0, z: 6 }) },
      { label: 't=0.2', e: () => ({ t: 0.2, z: 8 }) },
      { label: 't=0.55', e: () => ({ t: 0.55, z: 4 }) },
      { label: 't=1.3', e: () => ({ t: 1.3, z: 7 }) },
    ],
  };
})();
