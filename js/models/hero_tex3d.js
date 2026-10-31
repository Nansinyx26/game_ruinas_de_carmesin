'use strict';
// ECLIPSE ZERO · Aliados em 3D com textura (MODELS3D.<id>Tex: lyraTex, drakosTex, seraTex, orionTex)
// ---------------------------------------------------------------------------
// Cada js/assets/<id>3d.js (tools/importar_modelo.py a partir de assets/modelos/<id>.glb, ou a versão
// antiga de tools/gerar_aliado3d.py) registra HERO3D.<id>: as malhas do
// personagem, já no espaço dos nós do esqueleto do Kael, a textura assada e as proporções
// do esqueleto tiradas da própria arte (ombros, braços, pernas, pescoço). O modelo monta o
// esqueleto com essas proporções (MODELS3D.kael.build(props)) e usa as mesmas poses e
// animações do Kael, sem a espada dele. A arma de cada um entra pelo gancho do kit do
// personagem, se existir: HERO_WEAPONS.<id>.add(model) na montagem e .pose(model, e, o)
// depois da pose (js/heroes/).
// ---------------------------------------------------------------------------
(function () {
  if (typeof HERO3D === 'undefined' || !MODELS3D.kael) return;
  const SWORD = ['blade', 'hilt'];
  const weapon = (id) => (typeof HERO_WEAPONS !== 'undefined' && HERO_WEAPONS[id]) || null;

  // base64 → bytes (little-endian, lidos com DataView)
  function bytes(b64) {
    const s = atob(b64), u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return new DataView(u.buffer);
  }
  // Triângulos de cada parte no formato do motor (x, y, z, normal, u, v, sombra 1, emissão 1)
  function decode(H) {
    const geo = {}, q = 1 / H.q, nq = 1 / 32767;
    for (const name in H.parts) {
      const P = H.parts[name], A = bytes(P.a), I = bytes(P.i), n = I.byteLength / 2, g = new Float32Array(n * 10);
      for (let t = 0; t < n; t++) {
        const k = I.getUint16(t * 2, true) * 16, o = t * 10;
        g[o] = A.getInt16(k, true) * q; g[o + 1] = A.getInt16(k + 2, true) * q; g[o + 2] = A.getInt16(k + 4, true) * q;
        g[o + 3] = A.getInt16(k + 6, true) * nq; g[o + 4] = A.getInt16(k + 8, true) * nq; g[o + 5] = A.getInt16(k + 10, true) * nq;
        g[o + 6] = (A.getInt16(k + 12, true) + 32768) / 65535; g[o + 7] = (A.getInt16(k + 14, true) + 32768) / 65535;
        g[o + 8] = 1; g[o + 9] = 1;
      }
      geo[name] = g;
    }
    return geo;
  }

  // '#A64DFF' → [r, g, b] de 0 a 1
  const rgb01 = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16) || 0; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  for (const id in HERO3D) {
    const H = HERO3D[id], def = typeof CHARACTERS_BY_ID !== 'undefined' && CHARACTERS_BY_ID[id];
    // as linhas de neon da roupa brilham na cor-tema do personagem
    const TEX = { src: H.tex, mat: H.mat, nrm: H.nrm, pbr: !!H.pbr, bump: H.mat && !H.nrm ? 0.5 : 0, glow: def ? [...rgb01(def.color), 1.5] : null };
    let GEO = null;
    MODELS3D[id + 'Tex'] = {
      build() {
        const m = MODELS3D.kael.build(H.props);
        for (const k in m.nodes) m.nodes[k].geo = null;
        if (H.v === 2) {
          // formato 2 (malhas com pele, ex.: importado por tools/importar_modelo.py)
          if (!GEO) GEO = decodePeles3D(H);
          m.skins = instPeles3D(GEO, m);
          m.sec = true;
          m.dqs = true;   // pele por quatérnios duplos (R3D.skin)
        } else {
          if (!GEO) GEO = decode(H);
          for (const name in GEO) if (m.nodes[name]) m.nodes[name].geo = GEO[name];   // só leitura: compartilhada
        }
        const w = weapon(id);
        if (w && w.add) w.add(m);
        m.tex = TEX;
        return m;
      },
      pose(m, e, o) {
        MODELS3D.kael.pose(m, e, o);
        for (const k of SWORD) if (m.nodes[k]) m.nodes[k].vis = false;
        const w = weapon(id);
        if (w && w.pose) w.pose(m, e, o);
      },
      opts(e) { return MODELS3D.kael.opts(e); },
      // Brilhos: os da arma do personagem (o Kael tem os da espada e da marca do pulso)
      glows(e, add) { const w = weapon(id); if (w && w.glows) w.glows(e, add); },
    };
  }
})();
