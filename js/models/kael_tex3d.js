'use strict';
// ECLIPSE ZERO · Kael 3D com a arte oficial (MODELS3D.kaelTex)
// ---------------------------------------------------------------------------
// Malhas esculpidas a partir das 4 vistas da ficha oficial (frente, lados e costas), com a
// textura assada da própria arte e um mapa de material (metal, aspereza, relevo) —
// tools/gerar_kael3d.py → js/assets/kael3d.js. São malhas com pele (skinning): cabeça, corpo
// com o capuz, braços, pernas e o casaco inteiro, cada vértice seguindo até 4 ossos do
// esqueleto do Kael (js/models/kael.js) montado com as proporções tiradas da arte. Usa as
// mesmas poses e animações do MODELS3D.kael, mais o movimento secundário (casaco, capuz e
// cabelo) e as mãos com dedos: as luvas são modeladas aqui, peça por peça, nos ossos da mão e
// das falanges. A espada continua com as cores e o brilho próprios.
// ---------------------------------------------------------------------------
// Malhas com pele (formato v2 de js/assets/<id>3d.js) → dados do R3D.skin, compartilhados entre
// instâncias. Também usado pelos aliados (js/models/hero_tex3d.js). Vértice pintado: (u, v, 1, 1);
// vértice de cor: (r, g, −1 − b − 2·material, emissão), ver R3D_FS_TEX
function decodePeles3D(D) {
  const bytes = (b64) => {
    const s = atob(b64), u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  };
  const q = 1 / D.q, nq = 1 / 32767;
  return D.skins.map((S) => {
    const A = new DataView(bytes(S.a).buffer), Wb = bytes(S.w), I = bytes(S.i), nv = A.byteLength / 16;
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), att = new Float32Array(nv * 4);
    const bi = new Uint8Array(nv * 4), bw = new Float32Array(nv * 4);
    for (let v = 0; v < nv; v++) {
      const k = v * 16;
      for (let j = 0; j < 3; j++) { pos[v * 3 + j] = A.getInt16(k + j * 2, true) * q; nor[v * 3 + j] = A.getInt16(k + 6 + j * 2, true) * nq; }
      if (S.cor) {
        const m = A.getUint8(k + 15);
        att[v * 4] = A.getUint8(k + 12) / 255; att[v * 4 + 1] = A.getUint8(k + 13) / 255;
        att[v * 4 + 2] = -1 - A.getUint8(k + 14) / 255 - 2 * (m >> 4); att[v * 4 + 3] = (m & 15) / 15;
      } else {
        att[v * 4] = A.getUint16(k + 12, true) / 65535; att[v * 4 + 1] = A.getUint16(k + 14, true) / 65535; att[v * 4 + 2] = 1; att[v * 4 + 3] = 1;
      }
      for (let j = 0; j < 4; j++) { bi[v * 4 + j] = Wb[v * 8 + j]; bw[v * 4 + j] = Wb[v * 8 + 4 + j] / 255; }
    }
    const inv = new Float32Array(S.ossos.length * 12);
    S.ossos.forEach((o, b) => inv.set(D.inv[o], b * 12));
    return { nome: S.nome, ossos: S.ossos, inv, pos, nor, att, bi, bw, idx: new Uint16Array(I.buffer), lod: S.lod || 0 };
  });
}
// Peles de uma instância do modelo: dados compartilhados, ossos e rascunhos próprios
function instPeles3D(SK, m) {
  return SK.map((S) => ({ bones: S.ossos.map((o) => m.nodes[o]), inv: S.inv, pos: S.pos, nor: S.nor, att: S.att, bi: S.bi, bw: S.bw, idx: S.idx, lod: S.lod, nome: S.nome }));
}

(function () {
  if (typeof KAEL3D === 'undefined' || !MODELS3D.kael) return;
  const KEEP = new Set(['blade', 'hilt']);        // geometria do rig que continua (com cores por vértice)
  // texturas WebGL compartilhadas; um modelo importado traz mapa de normais e cor PBR (sem luz pintada)
  const TEX = { src: KAEL3D.tex, mat: KAEL3D.mat, nrm: KAEL3D.nrm, pbr: !!KAEL3D.pbr, bump: KAEL3D.nrm ? 0 : 0.55 };
  let SKINS = null, HANDS = null;

  // ------------------------------------------------------------------ luvas
  // Espaço da mão: −Z ao longo da mão, +X para a frente (lado do indicador), a palma voltada
  // para o corpo (−s·Y). Couro preto (material couro), placas de metal escuro no dorso e nos
  // nós dos dedos, pontas dos dedos à mostra (pele) e o punho com a luz azul da ficha.
  const C_LUVA = [0.055, 0.058, 0.07], C_PLACA = [0.16, 0.17, 0.2], C_PELE = [0.52, 0.38, 0.31], C_LUZ = [0.25, 0.7, 1.0];
  const MAT = { fosco: 0, metal: 1, couro: 2, tecido: 3, cabelo: 4, pele: 5 };
  // cores do G3 → formato do programa com textura, com o material (ver R3D_FS_TEX)
  function texColor(geo, mat) {
    const g = new Float32Array(geo.d);
    for (let i = 0; i < g.length; i += 10) g[i + 8] = -1 - g[i + 8] - 2 * mat;
    return g;
  }
  function piece(build, mat) { const g = new G3(); build(g); return texColor(g, mat); }
  function buildHands() {
    HANDS = {};
    for (const [nm, s] of [['R', 1], ['L', -1]]) {
      const H = {};
      // palma e dorso
      H['hand' + nm] = [
        piece((g) => {
          g.box(0, 0, -1.0, 2.15, 1.15, 2.1, C_LUVA);
          g.cyl(0, 0, -0.35, 1.12, 1.2, 1.25, 8, C_LUVA);                        // punho da luva
        }, MAT.couro),
        piece((g) => {
          g.box(0.05, s * 0.62, -1.05, 1.75, 0.2, 1.55, C_PLACA);                 // placa do dorso
          g.box(0, s * 0.6, -1.9, 1.95, 0.24, 0.42, C_PLACA);                     // nós dos dedos
          g.cyl(0, 0, 0.62, 1.24, 1.24, 0.24, 8, C_PLACA);                        // aro do punho
        }, MAT.metal),
        piece((g) => { g.box(0.2, s * 1.2, 0.25, 0.9, 0.12, 0.3, C_LUZ, 1); }, MAT.fosco),     // luz azul
      ];
      for (let d = 0; d < 5; d++) {
        const segs = d === 0 ? [0.72, 0.58] : [[0.74, 0.5, 0.4], [0.8, 0.54, 0.42], [0.74, 0.5, 0.4], [0.6, 0.42, 0.34]][d - 1];
        const th = d === 0 ? 0.5 : d === 4 ? 0.38 : 0.44;
        segs.forEach((len, j) => {
          const ponta = j === segs.length - 1;
          H['f' + nm + d + 'abc'[j]] = [piece((g) => {
            g.box(0, 0, -len / 2, th, th, len + 0.08, ponta ? C_PELE : C_LUVA);
            if (!ponta) g.box(0, s * th * 0.5, -len * 0.45, th * 0.82, 0.1, len * 0.6, C_PLACA);
          }, ponta ? MAT.pele : MAT.couro)];
        });
      }
      Object.assign(HANDS, H);
    }
  }

  function build() {
    if (!SKINS) SKINS = decodePeles3D(KAEL3D);
    if (!HANDS) buildHands();
    const m = MODELS3D.kael.build(KAEL3D.props);
    for (const k in m.nodes) if (!KEEP.has(k)) m.nodes[k].geo = null;
    // Espada: converte as cores para o formato do programa com textura (r, g, −1 − b, emissão)
    for (const k of KEEP) {
      const g = m.nodes[k].geo;
      if (g) for (let i = 0; i < g.length; i += 10) g[i + 8] = -1 - g[i + 8];
    }
    // Luvas: várias peças por osso viram uma geometria só (compartilhada entre instâncias). Um
    // modelo importado (tools/importar_modelo.py) usa as luvas se a malha veio sem as mãos (luvas: 1)
    for (const k in KAEL3D.importado && !KAEL3D.luvas ? {} : HANDS) {
      if (!m.nodes[k]) continue;
      const parts = HANDS[k];
      if (!parts.joined) {
        const tot = parts.reduce((a, g) => a + g.length, 0), j = new Float32Array(tot);
        let o = 0;
        for (const g of parts) { j.set(g, o); o += g.length; }
        parts.joined = j;
      }
      m.nodes[k].geo = parts.joined;
    }
    // Peles: dados compartilhados, ossos e rascunhos por instância
    m.skins = instPeles3D(SKINS, m);
    m.tex = TEX;
    // Espada GLB (Kael_Espada_oficial, js/heroes/armas3d.js) no lugar da procedural: os nós
    // blade/hilt ficam sem geometria, só para as âncoras dos halos e o alcance do golpe
    if (typeof WeaponRig !== 'undefined' && WeaponRig.has('kael_espada') && WeaponRig.install(m, 'kael')) {
      m.nodes.blade.geo = null; m.nodes.hilt.geo = null;
    }
    m.sec = true;              // movimento secundário do casaco, do capuz e do cabelo
    m.dqs = true;              // pele por quatérnios duplos (juntas sem perder volume; R3D.skin)
    return m;
  }

  MODELS3D.kaelTex = {
    build,
    pose(m, e, o) { MODELS3D.kael.pose(m, e, o); if (m.wr) WeaponRig.pose(m, e); },
    opts(e) { return MODELS3D.kael.opts(e); },
    glows(e, add) { MODELS3D.kael.glows(e, add); },
  };
})();
