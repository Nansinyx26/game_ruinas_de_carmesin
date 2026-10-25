'use strict';
// ECLIPSE ZERO · Armas 3D dos heróis (GLB) — na mão em combate, presas às costas fora dele
// ---------------------------------------------------------------------------
// As malhas vêm de js/assets/armas3d.js (WEAPON3D), gerado por tools/importar_arma.py a partir
// dos GLB de assets/armas/eclipse/ (o GLB continua sendo a fonte; o jogo usa a versão reduzida,
// que também abre por file://). Cada arma: +X do cabo para a ponta, +Z a largura (gume,
// cabeça), origem no ponto em que a mão segura.
//
// Encaixes (no esqueleto do Kael, usado por todos os heróis):
//   mão direita  nó 'sword' (orientado pelos golpes de js/models/kael.js; a mão fica 4,4 atrás)
//   mão esquerda nó 'handL' (segunda lâmina do Orion)
//   costas       nó 'torso' (BACK: ponto da empunhadura, direção da arma, por arma)
//   coxa         nó 'thighR' (pistola do Orion no coldre)
//   arco da Lyra nó 'lyraBow' de js/heroes/lyra.js (a corda puxada continua sendo desenhada)
// Cada encaixe tem um nó por peça, com a geometria compartilhada (não duplica ao trocar de arma:
// só troca a geometria do nó).
//
// Estado (no jogador, js/player.js): e.wpnOut (arma na mão?) e e.wpnAnim ({ k: 'draw' | 'sheathe',
// t, dur }). Sacar: a mão vai ao encaixe das costas, a arma passa para a mão no meio do gesto e
// volta à guarda; guardar é o inverso. Entidades sem wpnOut (inimigos, NPCs antigos) ficam como
// antes: arma na mão. As poses da mão ficam em handPose (chamado por js/models/kael.js antes do
// solver) e a visibilidade/encaixe em pose (depois do solver).
// ---------------------------------------------------------------------------
const WeaponRig = (function () {
  const OK = typeof WEAPON3D !== 'undefined';
  const PI = Math.PI;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v), mix = (a, b, t) => a + (b - a) * t;
  const sm = (t) => t * t * (3 - 2 * t);
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);

  // ------------------------------------------------------------ malhas
  // WEAPON3D.<id>.a: 14 bytes por canto (posição int16 ×3, normal int8 ×3, RGB, material, emissão)
  const GEO = {};
  const EMI = 1.25;
  function decode(id) {
    const W = WEAPON3D[id];
    const s = atob(W.a), n = s.length / 14, raw = new Float32Array(n * 10), tex = new Float32Array(n * 10);
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    const D = new DataView(u.buffer), q = 1 / W.q;
    for (let v = 0; v < n; v++) {
      const k = v * 14, o = v * 10;
      const r = D.getUint8(k + 9) / 255, g = D.getUint8(k + 10) / 255, b = D.getUint8(k + 11) / 255;
      const mat = D.getUint8(k + 12), e = D.getUint8(k + 13) / 255 * EMI;
      raw[o] = tex[o] = D.getInt16(k, true) * q;
      raw[o + 1] = tex[o + 1] = D.getInt16(k + 2, true) * q;
      raw[o + 2] = tex[o + 2] = D.getInt16(k + 4, true) * q;
      raw[o + 3] = tex[o + 3] = D.getInt8(k + 6) / 127;
      raw[o + 4] = tex[o + 4] = D.getInt8(k + 7) / 127;
      raw[o + 5] = tex[o + 5] = D.getInt8(k + 8) / 127;
      raw[o + 6] = tex[o + 6] = r; raw[o + 7] = tex[o + 7] = g;
      raw[o + 8] = b; tex[o + 8] = -1 - b - 2 * mat;      // formato do programa com textura (R3D_FS_TEX)
      raw[o + 9] = tex[o + 9] = e;
    }
    return (GEO[id] = { raw, tex, info: W });
  }
  // Geometria (só leitura, compartilhada) no formato do modelo: com textura ou de cores
  function geo(id, textured) {
    if (!OK || !WEAPON3D[id]) return null;
    const G = GEO[id] || decode(id);
    return textured ? G.tex : G.raw;
  }
  const has = (id) => OK && !!WEAPON3D[id];

  // ------------------------------------------------------------ o que cada arma mostra
  // main: na mão no combate (1ª na direita, 2ª na esquerda); back: sempre nas costas;
  // hip: no coldre; drone: flutua ao lado. Armas sem modelo próprio usam o da principal.
  const VISUAL = {
    tempestade_nula: { main: ['kael_espada'] },
    granada_plasma: { main: ['kael_espada'] },
    espada_kael_3d: { main: ['kael_espada_alt'] },
    lanca_plasma: { main: ['drakos_machado'], back: ['drakos_martelo'] },
    machado_drakos_3d: { main: ['drakos_machado'], back: ['drakos_martelo'] },
    canhao_pulso: { main: ['drakos_martelo'], back: ['drakos_machado'] },
    martelo_drakos_3d: { main: ['drakos_martelo'], back: ['drakos_machado'] },
    arco_foton: { main: ['lyra_arco'] },
    arco_lyra_3d: { main: ['lyra_arco'] },
    laminas_duplas: { main: ['orion_lamina_d', 'orion_lamina_e'], hip: ['orion_pistola'] },
    // pistola equipada: ela vai para a mão (o Orion atira, Player.combatStyle) e as lâminas para as costas
    modulo_stealth: { main: ['orion_pistola'], back: ['orion_lamina_d', 'orion_lamina_e'] },
    arma_primaria_orion_3d: { main: ['orion_lamina_v1_d', 'orion_lamina_v1_e'], hip: ['orion_pistola'] },
    arma_secundaria_orion_3d: { main: ['orion_pistola'], back: ['orion_lamina_d', 'orion_lamina_e'] },
    orbe_controle: { main: ['sera_bastao'] },
    bastao_sera_3d: { main: ['sera_bastao'] },
    drone_s01: { main: ['sera_bastao'], drone: ['sera_drone'] },
    drone_sera_3d: { main: ['sera_bastao'], drone: ['sera_drone'] },
  };
  const DEFAULT = { kael: 'tempestade_nula', lyra: 'arco_foton', drakos: 'lanca_plasma', sera: 'orbe_controle', orion: 'laminas_duplas' };
  function visualOf(charId) {
    const wid = typeof RosterManager !== 'undefined' ? RosterManager.equippedWeapon(charId) : null;
    return VISUAL[wid] || VISUAL[DEFAULT[heroBase(charId)]] || null;
  }

  // ------------------------------------------------------------ encaixes nas costas
  // Por arma, no referencial do tronco (+X frente, +Y direita, +Z cima; z relativo ao ombro):
  //   g: ponto da empunhadura; d: direção da arma (cabo → ponta); flip: gume para o outro lado;
  //   reach: quanto a mão sobe pela arma para alcançar (cabos muito baixos).
  // A face da arma fica rente às costas (a espessura aponta para trás).
  const BACK = {
    kael_espada: { node: 'torso', g: [-5.4, 5.2, 6.5], d: [-0.05, -0.45, -0.89] },
    kael_espada_alt: { node: 'torso', g: [-5.4, 5.2, 6.5], d: [-0.05, -0.45, -0.89] },
    drakos_machado: { node: 'torso', g: [-7.4, 5.5, -33], d: [-0.04, -0.36, 0.93], reach: 14 },
    drakos_martelo: { node: 'torso', g: [-8.8, -5.5, -33], d: [-0.04, 0.36, 0.93], reach: 14 },
    lyra_arco: { node: 'torso', g: [-5.6, -0.5, -3], d: [-0.03, 0.55, 0.83] },
    orion_lamina_d: { node: 'torso', g: [-5.0, 4.6, 4.5], d: [-0.05, -0.3, -0.95] },
    orion_lamina_e: { node: 'torso', g: [-5.6, -4.6, 4.5], d: [-0.05, 0.3, -0.95] },
    orion_lamina_v1_d: { node: 'torso', g: [-5.0, 4.6, 4.5], d: [-0.05, -0.3, -0.95] },
    orion_lamina_v1_e: { node: 'torso', g: [-5.6, -4.6, 4.5], d: [-0.05, 0.3, -0.95] },
    sera_bastao: { node: 'torso', g: [-5.2, 1.5, -12], d: [-0.04, -0.45, 0.89] },
    // coldre na coxa; grab: onde a mão busca a pistola (referencial do corpo, ao lado do quadril)
    orion_pistola: { node: 'thighR', g: [0.6, 2.7, -5.5], d: [0, 0, -1], u: [1, 0, 0], abs: true, grab: [1.5, 8.6, 21] },
    sera_drone: { node: 'torso', g: [-4, -9.5, 12], d: [1, 0, 0], u: [0, 0, 1], hover: true },
  };
  // vetores e orientação (mesma convenção de orient() em js/models/kael.js: X = d, Z ≈ up)
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  function orient(r, x, up) {
    const pd = up[0] * x[0] + up[1] * x[1] + up[2] * x[2];
    let z = [up[0] - pd * x[0], up[1] - pd * x[1], up[2] - pd * x[2]];
    const zl = Math.hypot(z[0], z[1], z[2]);
    z = zl < 1e-3 ? [0, 0, 1] : [z[0] / zl, z[1] / zl, z[2] / zl];
    const y2 = z[0] * x[1] - z[1] * x[0];
    r[1] = Math.asin(cl(-x[2], -1, 1)); r[2] = Math.atan2(x[1], x[0]); r[0] = Math.atan2(y2, z[2]);
    return r;
  }
  // Direções da arma nas costas: X ao longo da arma, Y (espessura) para trás, Z = X × Y
  function backAxes(B) {
    const d = norm(B.d);
    let u = B.u ? norm(B.u) : norm(cross(d, [-1, 0, 0]));
    if (B.flip) u = [-u[0], -u[1], -u[2]];
    return { d, u };
  }
  // Ponto da empunhadura nas costas (z relativo ao ombro do personagem)
  function backPoint(B, K) { return B.abs ? B.g : [B.g[0], B.g[1], B.g[2] + (K ? K.SHZ : 17)]; }

  // ------------------------------------------------------------ montagem
  // Cria os nós (vazios) dos encaixes; a geometria entra na pose (depende da arma equipada e
  // do formato do modelo). Chamado na montagem de cada herói.
  function addNode(m, parent, name) {
    const p = m.nodes[parent];
    if (!p || m.nodes[name]) return m.nodes[name] || null;
    const nd = p.add(new N3(name));
    m.nodes[name] = nd;
    m.rest[name] = { p: nd.p.slice(), r: nd.r.slice(), s: nd.s.slice() };
    return nd;
  }
  function install(m, charId) {
    if (!OK || !m || m.wr) return !!(m && m.wr);
    m.wr = { id: charId };
    addNode(m, 'sword', 'wHandR');
    addNode(m, 'handL', 'wHandL');
    for (let i = 0; i < 3; i++) addNode(m, 'torso', 'wBack' + i);
    addNode(m, 'thighR', 'wHip');
    addNode(m, 'torso', 'wDrone');
    if (m.nodes.wBack0) { m.anchor('wBackMid', 'wBack0', [20, 0, 0]); m.anchor('wBackTip', 'wBack0', [40, 0, 0]); }
    if (m.nodes.wHandR) { m.anchor('wHandMid', 'wHandR', [24, 0, 0]); m.anchor('wHandTip', 'wHandR', [46, 0, 0]); }
    if (m.nodes.wHandL) m.anchor('wHandLTip', 'wHandL', [20, 0, 0]);
    if (m.nodes.wDrone) m.anchor('wDrone', 'wDrone', [0, 0, 0]);
    if (typeof ExoRig !== 'undefined') ExoRig.install(m);   // armação do Exoesqueleto (js/heroes/exoesqueleto.js)
    if (typeof PecasRig !== 'undefined') PecasRig.install(m);   // peças da armadura modular (js/heroes/pecas3d.js)
    return true;
  }
  // Põe a malha no nó (troca só a geometria, sem criar nada)
  function setMesh(m, nd, id) {
    if (!nd) return;
    const tx = !!m.tex;
    if (nd._wid !== id || nd._tx !== tx) { nd.geo = id ? geo(id, tx) : null; nd._wid = id; nd._tx = tx; }
    nd.vis = !!(id && nd.geo);
  }
  function placeBack(nd, B, K, t) {
    const { d, u } = backAxes(B), g = backPoint(B, K);
    nd.p[0] = g[0]; nd.p[1] = g[1]; nd.p[2] = g[2];
    if (B.hover) { nd.p[2] += Math.sin(t * 2.3) * 1.2; nd.p[1] += Math.cos(t * 1.7) * 0.6; }
    orient(nd.r, d, u);
    if (B.hover) nd.r[2] += t * 0.8;
  }

  // ------------------------------------------------------------ pose (depois do solver)
  // Mostra cada peça no encaixe certo: na mão (desembainhada) ou nas costas
  function pose(m, e) {
    const W = m && m.wr;
    if (!W) return;
    if (typeof ExoRig !== 'undefined') ExoRig.pose(m, e, W.id);
    if (typeof PecasRig !== 'undefined') PecasRig.pose(m, e, W.id);
    const n = m.nodes, K = m.props, t = num(e && e.animTime);
    const V = visualOf(W.id);
    for (const k of ['wHandR', 'wHandL', 'wBack0', 'wBack1', 'wBack2', 'wHip', 'wDrone']) if (n[k]) n[k].vis = false;
    if (!V) return;
    const out = isOut(e);
    let main = V.main || [], back = V.back || [];
    // golpe alternado (def.altWeapon, ex.: o 3º golpe do Drakos): usa a arma das costas e a
    // principal vai para o lugar dela durante o golpe
    const ad = e && e.state === 'attack' && e.attack && e.attack.def;
    if (out && ad && ad.altWeapon && back.length) { const t0 = main; main = back.slice(0, 1).concat(main.slice(1)); back = t0.slice(0, 1).concat(back.slice(1)); }
    let b = 0;
    // principal: na mão (direita → nó 'sword'; segunda → mão esquerda) ou nas costas
    for (let i = 0; i < main.length; i++) {
      const id = main[i];
      if (heroBase(W.id) === 'lyra') {                           // o arco é o nó lyraBow (lyra.js)
        if (!out && BACK[id]) { const nd = n['wBack' + b++]; setMesh(m, nd, id); placeBack(nd, BACK[id], K, t); }
        continue;
      }
      if (out) {
        const nd = i === 0 ? n.wHandR : n.wHandL;
        setMesh(m, nd, id);
        // a mão fica 4,4 atrás da origem do nó 'sword'; a lâmina estica com o alcance do golpe (como a do Kael)
        if (nd && i === 0) { nd.p[0] = -4.4; nd.p[1] = 0; nd.p[2] = 0; nd.r[0] = nd.r[1] = nd.r[2] = 0; nd.s[0] = n.blade ? n.blade.s[0] : 1; }
        if (nd && i === 1) { nd.p[0] = 0.4; nd.p[1] = 0; nd.p[2] = -1.7; nd.r[0] = PI; nd.r[1] = 0; nd.r[2] = 0; }
      } else if (BACK[id]) {
        const nd = n['wBack' + b++];
        setMesh(m, nd, id); placeBack(nd, BACK[id], K, t);
      }
    }
    for (const id of back) { if (!BACK[id]) continue; const nd = n['wBack' + b++]; setMesh(m, nd, id); placeBack(nd, BACK[id], K, t); }
    for (const id of V.hip || []) { if (BACK[id]) { setMesh(m, n.wHip, id); placeBack(n.wHip, BACK[id], K, t); } }
    for (const id of V.drone || []) { if (BACK[id]) { setMesh(m, n.wDrone, id); placeBack(n.wDrone, BACK[id], K, t); } }
    // energia: a arma na mão brilha mais no golpe e na carga
    const st = e && e.state, hot = st === 'attack' || st === 'charge' || st === 'special' ? 1.6 : 1.15;
    if (n.wHandR) n.wHandR.emi = hot; if (n.wHandL) n.wHandL.emi = hot;
    for (const k of ['wBack0', 'wBack1', 'wBack2', 'wHip']) if (n[k]) n[k].emi = 0.75;
  }

  // ------------------------------------------------------------ gesto de sacar e guardar
  // Arma na mão? Entidades sem o campo (inimigos, prévias) ficam como antes
  function isOut(e) { return !e || e.wpnOut !== false; }
  // Encaixe de onde a mão tira a arma principal (por mão), no referencial do tronco
  function grabs(charId) {
    const V = visualOf(charId);
    if (!V || !V.main) return null;
    if (heroBase(charId) === 'lyra') return { L: V.main[0] };
    return { R: V.main[0], L: V.main[1] || null };
  }
  const TMx = typeof M3 !== 'undefined' ? M3.make() : null;
  const xf = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2] + M[3], M[4] * v[0] + M[5] * v[1] + M[6] * v[2] + M[7], M[8] * v[0] + M[9] * v[1] + M[10] * v[2] + M[11]];
  const xr = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[4] * v[0] + M[5] * v[1] + M[6] * v[2], M[8] * v[0] + M[9] * v[1] + M[10] * v[2]];
  const lerp3 = (o, a, b, k) => { o[0] = mix(a[0], b[0], k); o[1] = mix(a[1], b[1], k); o[2] = mix(a[2], b[2], k); };
  // Mexe só nas mãos da pose (antes do solver): mão livre quando a arma está guardada e o
  // gesto de alcançar as costas ao sacar/guardar. P: pose de js/models/kael.js (alvos das mãos
  // no referencial do corpo, já sem HAND0); K: proporções do esqueleto.
  function handPose(m, e, P, K) {
    const W = m && m.wr;
    if (!W || !e || e.wpnOut === undefined || e.state === 'dead') return false;
    const st = e.state;
    const busy = st === 'attack' || st === 'charge' || st === 'special';
    const A = e.wpnAnim;
    if (isOut(e) && !A) return false;
    const G = grabs(W.id);
    if (!G) return false;
    const lyra = heroBase(W.id) === 'lyra';
    // mão direita livre: espelho da esquerda (fase oposta na corrida)
    const free = !isOut(e) && !busy;
    if (free) {
      P.hR[0] = 4 - P.hL[0]; P.hR[1] = -P.hL[1]; P.hR[2] = P.hL[2];
      P.pR[0] = P.pL[0]; P.pR[1] = -P.pL[1]; P.pR[2] = P.pL[2];
    }
    // idle com a arma guardada: a mão descansa no cabo, pronta para sacar (sem sacar)
    const touch = !A && free && e.idleVariant === 'idle_hilt_touch' ? num(e.idleBlend) * (0.82 + 0.05 * Math.sin(num(e.animTime) * 2.1)) : 0;
    if ((!A && touch <= 0.001) || !TMx) return free;
    // gesto: a mão vai até a empunhadura nas costas e volta
    let reach = touch;
    if (A) {
      const k = cl(A.t / Math.max(0.05, A.dur), 0, 1), sw = A.k === 'draw' ? 0.45 : 0.55;
      reach = k < sw ? sm(k / sw) : 1 - sm((k - sw) / (1 - sw));
    }
    M3.trs(TMx, [0, 0, P.hz + K.HZ0 + 0.5], [P.tr, P.tp, P.ty], [1, 1, 1]);
    for (const side of ['R', 'L']) {
      const id = G[side];
      if (!id || !BACK[id]) continue;
      const B = BACK[id], ax = backAxes(B), g0 = backPoint(B, K);
      const g = B.reach ? [g0[0] + ax.d[0] * B.reach, g0[1] + ax.d[1] * B.reach, g0[2] + ax.d[2] * B.reach] : g0;
      // encaixe fora do tronco (coldre na coxa): a mão vai ao ponto 'grab' (corpo) e a arma aponta para baixo
      const at = B.grab ? B.grab.slice() : xf(TMx, g), d = B.grab ? [0.2, 0.1, -1] : xr(TMx, ax.d), u = B.grab ? [1, 0, 0] : xr(TMx, ax.u);
      if (!B.grab) at[2] -= K.HAND0;                             // alvos das mãos não incluem HAND0
      if (side === 'R') {
        lerp3(P.hR, P.hR, at, reach);
        P.pR[0] = mix(P.pR[0], -1, reach); P.pR[1] = mix(P.pR[1], 0.6, reach); P.pR[2] = mix(P.pR[2], 0.4, reach);
        // perto da troca, a arma na mão já tem a direção do encaixe (sem salto)
        lerp3(P.bd, P.bd, d, reach); lerp3(P.bu, P.bu, u, reach);
      } else {
        lerp3(P.hL, P.hL, at, reach);
        P.pL[0] = mix(P.pL[0], -1, reach); P.pL[1] = mix(P.pL[1], -0.6, reach); P.pL[2] = mix(P.pL[2], 0.4, reach);
      }
    }
    // o tronco gira um pouco para o lado da mão que alcança
    P.ty += (G.R && !lyra ? 0.18 : -0.18) * reach; P.hyw -= 0.1 * reach;
    return free;
  }

  // ------------------------------------------------------------ brilhos
  // Halos das armas (âncoras criadas em install); charId: o herói do modelo
  function glows(charId, e, add) {
    if (!OK || !e) return;
    const V = visualOf(charId), id = V && V.main && V.main[0], info = id && WEAPON3D[id];
    if (!V) return;
    const c = (info && info.glow) || '120,170,255';
    const t = num(e.animTime);
    const cb = heroBase(charId);
    if (isOut(e)) {
      if (cb === 'kael' || cb === 'lyra') {                        // Kael e Lyra têm os próprios halos
        if (num(e.wpnFlash) > 0) add(cb === 'kael' ? 'swordMid' : 'bowGrip', 16, c, 0.5 * num(e.wpnFlash) / 0.22);
        return;
      }
      const st = e && e.state, hot = st === 'attack' || st === 'charge' || st === 'special';
      add('wHandMid', hot ? 10 : 6, c, hot ? 0.32 : 0.14);
      if (hot) add('wHandTip', 7, c, 0.35);
      if (V.main[1]) add('wHandLTip', hot ? 7 : 4, c, hot ? 0.3 : 0.12);
    } else add('wBackMid', 5, c, 0.1 + 0.04 * Math.sin(t * 3));
    if (num(e.wpnFlash) > 0) add('wHandMid', 16, c, 0.5 * num(e.wpnFlash) / 0.22);   // saque instantâneo
    if (V && V.drone) add('wDrone', 7, c, 0.35 + 0.1 * Math.sin(t * 5));
  }

  return { ok: OK, has, geo, install, pose, handPose, glows, isOut, visualOf, VISUAL, BACK };
})();

// ---------------------------------------------------------------------------
// Ganchos nos modelos dos heróis: troca as armas procedurais (caixas e cilindros de
// js/models/*.js) pelas armas GLB, quando WEAPON3D existir. Sem ela, tudo fica como antes.
// ---------------------------------------------------------------------------
(function () {
  if (!WeaponRig.ok || typeof HERO_WEAPONS === 'undefined') return;
  for (const id of ['drakos', 'orion', 'sera']) {
    const old = HERO_WEAPONS[id];
    HERO_WEAPONS[id] = {
      add(m) { WeaponRig.install(m, id); },
      pose(m, e) { WeaponRig.pose(m, e); },
      // halos do corpo do modelo antigo (visor, reator) continuam; os da arma são os novos
      glows(e, add) {
        if (old && old.glows) old.glows(e, (name, r, rgb, a) => { if (!/blade|axe|staff|orb|drone/i.test(name)) add(name, r, rgb, a); });
        WeaponRig.glows(id, e, add);
      },
    };
  }
  // Lyra: o arco do kit continua (corda puxada, flecha); a geometria do arco passa a ser o GLB
  const ly = HERO_WEAPONS.lyra;
  if (ly) {
    HERO_WEAPONS.lyra = {
      add(m) { ly.add(m); WeaponRig.install(m, 'lyra'); },
      pose(m, e, o) { ly.pose(m, e, o); WeaponRig.pose(m, e); },
      glows(e, add) { ly.glows(e, add); WeaponRig.glows('lyra', e, add); },
    };
  }
})();
