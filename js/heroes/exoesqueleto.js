'use strict';
// ECLIPSE ZERO · Exoesqueleto (armadura compartilhada): a estrutura em 3D por cima de qualquer herói
// ---------------------------------------------------------------------------
// ARMOR_DEFS.exoesqueleto (js/data/armors.js) vale para os cinco heróis: +8% de defesa, +15 de
// vida, −3% de velocidade e metade do empurrão recebido (kbResist, Player.takeDamage). No
// modelo, uma armação de metal escuro com filetes azuis presa aos ossos do esqueleto (o mesmo
// de todos os heróis): hastes do lado de fora das coxas, canelas, braços e antebraços, juntas
// nos quadris, joelhos, cotovelos e tornozelos, punhos, a coluna nas costas com a canga dos
// ombros e a bateria. As hastes encostam no corpo de cada herói porque as medidas vêm da
// própria malha (distância dos vértices de cada osso até o eixo do membro, na pose de
// montagem); sem malha com pele, valem as proporções do esqueleto.
// Ganchos: WeaponRig.install / WeaponRig.pose (js/heroes/armas3d.js) chamam install / pose.
// ---------------------------------------------------------------------------
const ExoRig = (function () {
  const FRAME = '#2a3039', JOINT = '#3c4553', LUZ = '#5ab4ff';
  const PECAS = ['thighL', 'thighR', 'shinL', 'shinR', 'armLu', 'armRu', 'armLf', 'armRf', 'torso', 'hips'];
  const LADO = { L: -1, R: 1 };

  // ------------------------------------------------------------ medidas da malha
  // Por osso: o raio do lado de fora (y no sentido do lado), da frente (x) e de trás (−x), no
  // percentil 75 dos vértices presos ao osso com peso > 0,6 (ignora franjas e pontas soltas)
  const MED = new WeakMap();
  function pct(a, q) { if (!a.length) return 0; a.sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * q))]; }
  function medidas(m) {
    const S0 = m.skins && m.skins[0];
    if (!S0) return null;
    if (MED.has(S0.pos)) return MED.get(S0.pos);
    const A = {};
    for (const S of m.skins) {
      S.bones.forEach((bn, b) => {
        const nome = bn && bn.name;
        if (!nome || !PECAS.includes(nome)) return;
        const s = LADO[nome.slice(-1)] || LADO[nome.charAt(nome.length - 2)] || 1, M = S.inv.subarray(b * 12, b * 12 + 12);
        const L = A[nome] || (A[nome] = { fora: [], frente: [], tras: [], s });
        for (let v = 0, n = S.pos.length / 3; v < n; v++) {
          let w = 0;
          for (let j = 0; j < 4; j++) if (S.bi[v * 4 + j] === b) w += S.bw[v * 4 + j];
          if (w < 0.6) continue;
          const x = S.pos[v * 3], y = S.pos[v * 3 + 1], z = S.pos[v * 3 + 2];
          const lx = M[0] * x + M[1] * y + M[2] * z + M[3], ly = M[4] * x + M[5] * y + M[6] * z + M[7];
          if (ly * s > 0) L.fora.push(ly * s);
          if (lx > 0) L.frente.push(lx); else L.tras.push(-lx);
        }
      });
    }
    const R = {};
    for (const k in A) R[k] = { fora: pct(A[k].fora, 0.75), frente: pct(A[k].frente, 0.75), tras: pct(A[k].tras, 0.75) };
    MED.set(S0.pos, R);
    return R;
  }
  // Raio de um osso: o medido ou o padrão pela largura dos quadris do esqueleto
  function raio(R, nome, K, campo, padrao) {
    const v = R && R[nome] && R[nome][campo];
    return v > 0.5 ? v : padrao * ((K && K.HIPY) || 3.5) / 3.5;
  }

  // ------------------------------------------------------------ geometria
  // Haste de membro (osso pendurado em −Z, de 0 a −L), do lado de fora (s = −1 esquerda, +1 direita)
  function membro(g, L, r, s, junta0, junta1, punho) {
    const y = s * (r + 0.45);
    g.box(0, y, -L * 0.5, 1.5, 1.0, L * 0.78, FRAME, 0);
    g.box(0.8, y + s * 0.45, -L * 0.5, 0.35, 0.25, L * 0.58, LUZ, 1);             // filete aceso
    g.box(0, y, -L * 0.18, 1.9, 1.3, 1.1, JOINT, 0);                               // presilhas
    g.box(0, y, -L * 0.82, 1.9, 1.3, 1.1, JOINT, 0);
    const jt = (z, rr) => {
      const y0 = s > 0 ? r - 0.3 : -(r - 0.3) - 1.7;
      g.cyl(0, y0, z, rr, rr, 1.7, 10, JOINT, 0, { axis: 'y' });
      g.cyl(0, s > 0 ? y0 + 1.7 : y0 - 0.15, z, rr * 0.45, rr * 0.45, 0.15, 8, LUZ, 1, { axis: 'y' });
    };
    if (junta0) jt(-0.4, 1.7);
    if (junta1) jt(-L, 1.55);
    if (punho) g.cyl(0, 0, -L * 0.86, r + 0.35, r + 0.35, 1.3, 12, FRAME, 0);       // punho/tornozeleira
  }
  // Coluna nas costas, canga dos ombros e bateria (osso do tronco: z para cima a partir da cintura)
  function tronco(g, K, rt) {
    const SHZ = (K && K.SHZ) || 10.6, SHY = (K && K.SHY) || 6.7, x = -(rt + 0.6);
    for (let i = 0; i < 5; i++) {
      const z = SHZ * (0.12 + i * 0.17);
      g.box(x, 0, z, 1.6, 2.2 - i * 0.12, SHZ * 0.12, FRAME, 0);
      g.box(x - 0.85, 0, z, 0.2, 0.5, SHZ * 0.08, LUZ, 1);
    }
    g.box(x + 0.2, 0, SHZ * 0.86, 1.4, SHY * 1.9, 1.3, FRAME, 0);                 // canga dos ombros
    for (const s of [-1, 1]) g.cyl(x + 0.4, s * SHY * 0.95, SHZ * 0.86, 1.4, 1.4, 1.5, 10, JOINT, 0);
    g.box(x - 1.5, 0, SHZ * 0.5, 2.2, 4.6, SHZ * 0.3, JOINT, 0);                   // bateria
    for (const s of [-1, 1]) g.box(x - 2.65, s * 1.2, SHZ * 0.5, 0.2, 1.1, SHZ * 0.22, LUZ, 1.2);
  }
  // Placas dos quadris ligando as hastes das coxas à coluna (osso dos quadris)
  function quadris(g, K, rq) {
    const HIPY = (K && K.HIPY) || 3.5;
    for (const s of [-1, 1]) g.box(-0.5, s * (HIPY + rq * 0.55), -0.6, 3.2, 1.0, 3.0, FRAME, 0);
    g.box(-(rq + 0.4), 0, -0.2, 1.2, HIPY * 2, 1.4, FRAME, 0);                       // cinta de trás
  }
  const CACHE = {};
  function geos(m) {
    const K = m.props || {}, R = medidas(m);
    const r = {
      thigh: raio(R, 'thighR', K, 'fora', 3.2), thighL: raio(R, 'thighL', K, 'fora', 3.2),
      shin: raio(R, 'shinR', K, 'fora', 2.5), shinL: raio(R, 'shinL', K, 'fora', 2.5),
      up: raio(R, 'armRu', K, 'fora', 2.1), upL: raio(R, 'armLu', K, 'fora', 2.1),
      fo: raio(R, 'armRf', K, 'fora', 1.9), foL: raio(R, 'armLf', K, 'fora', 1.9),
      tras: raio(R, 'torso', K, 'tras', 3.6), hips: raio(R, 'hips', K, 'tras', 3.4),
    };
    const key = [K.LTH, K.LSH, K.AUP, K.AFO, K.SHZ, K.SHY, ...Object.values(r)].map((v) => (+v || 0).toFixed(1)).join('|');
    if (CACHE[key]) return CACHE[key];
    // as duas versões: cores por vértice (modelo procedural) e o formato do programa com textura
    // (cor azul → −1 − b − 2·material; a armação é metal, material 1, e os filetes acesos, 0)
    const mk = (fn) => {
      const g = new G3(); fn(g);
      const raw = new Float32Array(g.d), tex = new Float32Array(g.d);
      for (let i = 0; i < tex.length; i += 10) tex[i + 8] = -1 - raw[i + 8] - (raw[i + 9] > 0.5 ? 0 : 2);
      return { raw, tex };
    };
    const LTH = K.LTH || 12.8, LSH = K.LSH || 12.2, AUP = K.AUP || 9.8, AFO = K.AFO || 9.6;
    return (CACHE[key] = {
      thighR: mk((g) => membro(g, LTH, r.thigh, 1, true, true, false)),
      thighL: mk((g) => membro(g, LTH, r.thighL, -1, true, true, false)),
      shinR: mk((g) => membro(g, LSH, r.shin, 1, false, true, true)),
      shinL: mk((g) => membro(g, LSH, r.shinL, -1, false, true, true)),
      armRu: mk((g) => membro(g, AUP, r.up, 1, true, true, false)),
      armLu: mk((g) => membro(g, AUP, r.upL, -1, true, true, false)),
      armRf: mk((g) => membro(g, AFO, r.fo, 1, false, false, true)),
      armLf: mk((g) => membro(g, AFO, r.foL, -1, false, false, true)),
      torso: mk((g) => tronco(g, K, r.tras)),
      hips: mk((g) => quadris(g, K, r.hips)),
    });
  }

  // ------------------------------------------------------------ montagem e pose
  // Um nó-filho por osso, com a geometria da armação (escondido até o exoesqueleto ser vestido)
  function install(m) {
    if (!m || m.exo) return;
    const G = geos(m);
    m.exo = [];
    for (const osso of PECAS) {
      const p = m.nodes[osso];
      if (!p || !G[osso]) continue;
      const nd = p.add(new N3('exo_' + osso));
      nd.vis = false; nd._exo = G[osso];
      m.nodes[nd.name] = nd;
      m.rest[nd.name] = { p: nd.p.slice(), r: nd.r.slice(), s: nd.s.slice() };
      m.exo.push(nd);
    }
  }
  // Vestido pelo herói do modelo? (a armadura equipada dele é o exoesqueleto)
  function vestido(charId) { return typeof RosterManager !== 'undefined' && RosterManager.equippedArmor(charId) === 'exoesqueleto'; }
  function pose(m, e, charId) {
    if (!m || !m.exo) return;
    const on = vestido(charId), st = e && e.state, hot = st === 'attack' || st === 'charge' || st === 'special' ? 1.4 : 1;
    const tx = !!m.tex;
    for (const nd of m.exo) {
      if (nd._tx !== tx || !nd.geo) { nd.geo = tx ? nd._exo.tex : nd._exo.raw; nd._tx = tx; }
      nd.vis = on; nd.emi = hot;
    }
  }
  return { install, pose, vestido, medidas };
})();
