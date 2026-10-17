'use strict';
// ECLIPSE ZERO · Kael 3D com a arte oficial (MODELS3D.kaelTex)
// ---------------------------------------------------------------------------
// Malha esculpida a partir das 4 vistas da ficha oficial (frente, lados e costas),
// dividida nas partes do esqueleto do Kael (cabeça, tronco, braços, pernas, abas
// do casaco) e com a textura assada da própria arte — tools/gerar_kael3d.py →
// js/assets/kael3d.js. Cada parte já vem no espaço do seu nó, então o modelo usa
// as mesmas poses e animações do MODELS3D.kael (js/models/kael.js). A espada
// continua com as cores e o brilho próprios.
// ---------------------------------------------------------------------------
(function () {
  if (typeof KAEL3D === 'undefined' || !MODELS3D.kael) return;
  const KEEP = new Set(['blade', 'hilt']);        // geometria do rig que continua (com cores por vértice)
  const TEX = { src: KAEL3D.tex };                // uma textura WebGL compartilhada
  let GEO = null;                                 // triângulos de cada parte no formato do motor

  // base64 → bytes (little-endian, lidos com DataView)
  function bytes(b64) {
    const s = atob(b64), u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return new DataView(u.buffer);
  }
  // Vértice pintado: (x, y, z, normal, u, v, sombra 1, emissão 1); ver R3D_FS_TEX
  function decode() {
    GEO = {};
    const q = 1 / KAEL3D.q, nq = 1 / 32767;
    for (const name in KAEL3D.parts) {
      const P = KAEL3D.parts[name], A = bytes(P.a), I = bytes(P.i), n = I.byteLength / 2, g = new Float32Array(n * 10);
      for (let t = 0; t < n; t++) {
        const k = I.getUint16(t * 2, true) * 16, o = t * 10;
        g[o] = A.getInt16(k, true) * q; g[o + 1] = A.getInt16(k + 2, true) * q; g[o + 2] = A.getInt16(k + 4, true) * q;
        g[o + 3] = A.getInt16(k + 6, true) * nq; g[o + 4] = A.getInt16(k + 8, true) * nq; g[o + 5] = A.getInt16(k + 10, true) * nq;
        g[o + 6] = (A.getInt16(k + 12, true) + 32768) / 65535; g[o + 7] = (A.getInt16(k + 14, true) + 32768) / 65535;
        g[o + 8] = 1; g[o + 9] = 1;
      }
      GEO[name] = g;
    }
  }

  function build() {
    if (!GEO) decode();
    const m = MODELS3D.kael.build();
    for (const k in m.nodes) if (!KEEP.has(k)) m.nodes[k].geo = null;
    // Espada: converte as cores para o formato do programa com textura (r, g, −1 − b, emissão)
    for (const k of KEEP) {
      const g = m.nodes[k].geo;
      if (g) for (let i = 0; i < g.length; i += 10) g[i + 8] = -1 - g[i + 8];
    }
    for (const name in GEO) if (m.nodes[name]) m.nodes[name].geo = GEO[name];   // só leitura: compartilhada
    m.tex = TEX;
    return m;
  }

  MODELS3D.kaelTex = {
    build,
    pose(m, e, o) { MODELS3D.kael.pose(m, e, o); },
    opts(e) { return MODELS3D.kael.opts(e); },
    glows(e, add) { MODELS3D.kael.glows(e, add); },
  };
})();
