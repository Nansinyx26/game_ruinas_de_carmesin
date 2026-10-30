'use strict';
// ECLIPSE ZERO · Criação de personagem: malha com pele (MalhaPele)
// ---------------------------------------------------------------------------
// Base do modelo detalhado do personagem criado (js/criacao/modelo.js): o corpo é uma malha
// contínua presa aos ossos do esqueleto do Kael (cada vértice segue até 4 ossos com pesos, como
// as malhas importadas da Meshy: R3D.skin), em vez de peças rígidas por osso. Aqui ficam:
//   ligar(m, K)   a pose de ligação (braços em A, pernas retas, dedos abertos) e as matrizes de
//                 cada osso nessa pose; a geometria é feita nela e a inversa vai para a pele
//   Malha         vértices (posição, textura ou cor com material, pesos), triângulos e o
//                 fechamento: normais suaves (soldando a costura das texturas) e o formato do
//                 motor ({ bones, inv, pos, nor, att, bi, bw, idx })
//   tubo(...)     superfície por anéis ao longo de um caminho (tronco, braços, pernas, dedos,
//                 mechas de cabelo, saias), com seção, textura e pesos por função
// Vértices pintados: att = [u, v, 1, 0] (a cor vem da textura do modelo). Com cor: att = [r, g,
// −1 − b − 2·material, emissão] (materiais do R3D_FS_TEX: 0 fosco, 1 metal, 2 couro, 3 tecido,
// 4 cabelo, 5 pele).
// ---------------------------------------------------------------------------
const MalhaPele = (function () {
  const PI = Math.PI;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const suave = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ------------------------------------------------------------ pose de ligação
  // Membro pendurado (−Z) apontando para (dx, dy, dz) no referencial do pai (como o aimHang do rig)
  function mira(dx, dy, dz) { const l = Math.hypot(dx, dy, dz) || 1; return [Math.asin(cl(dy / l, -1, 1)), Math.atan2(-dx / l, -dz / l), 0]; }
  function inversa(M) {
    const a = M[0], b = M[1], c = M[2], d = M[4], e = M[5], f = M[6], g = M[8], h = M[9], i = M[10];
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C || 1e-9, k = 1 / det;
    const o = new Float32Array(12);
    o[0] = A * k; o[1] = -(b * i - c * h) * k; o[2] = (b * f - c * e) * k;
    o[4] = B * k; o[5] = (a * i - c * g) * k; o[6] = -(a * f - c * d) * k;
    o[8] = C * k; o[9] = -(a * h - b * g) * k; o[10] = (a * e - b * d) * k;
    o[3] = -(o[0] * M[3] + o[1] * M[7] + o[2] * M[11]);
    o[7] = -(o[4] * M[3] + o[5] * M[7] + o[6] * M[11]);
    o[11] = -(o[8] * M[3] + o[9] * M[7] + o[10] * M[11]);
    return o;
  }
  // Põe o esqueleto na pose de ligação e devolve { W: matriz de mundo por osso, inv } (raiz na origem)
  function ligar(m, K) {
    const n = m.nodes, hz = 26.5 + K.HZ0;
    const pos = (nd, p, r) => { if (!nd) return; nd.p[0] = p[0]; nd.p[1] = p[1]; nd.p[2] = p[2]; if (r) { nd.r[0] = r[0]; nd.r[1] = r[1]; nd.r[2] = r[2]; } };
    m.reset();
    pos(n.body, [0, 0, 0], [0, 0, 0]);
    pos(n.hips, [0, 0, hz], [0, 0, 0]);
    pos(n.torso, [0, 0, hz + 0.5], [0, 0, 0]);
    pos(n.head, [0.2, 0, K.NECK], [0, 0, 0]);
    for (const [nm, s] of [['L', -1], ['R', 1]]) {
      pos(n['arm' + nm + 'u'], [0, s * K.SHY, hz + 0.5 + K.SHZ], mira(0.04, s * 0.36, -0.93));
      pos(n['arm' + nm + 'f'], [0, 0, -K.AUP], mira(0.2, 0, -0.98));
      pos(n['hand' + nm], [0, 0, -K.AFO], [0, 0, 0]);
      pos(n['thigh' + nm], [0, s * K.HIPY, hz - 1], [0, 0, 0]);
      pos(n['shin' + nm], [0, 0, -K.LTH], [0, 0, 0]);
      pos(n['foot' + nm], [0, 0, -K.LSH], [0, 0, 0]);
    }
    const W = {}, inv = {};
    (function anda(nd, P) {
      const w = M3.mul(M3.make(), P, M3.trs(M3.make(), nd.p, nd.r, nd.s));
      W[nd.name] = w; inv[nd.name] = inversa(w);
      for (const k of nd.kids) anda(k, w);
    })(m.root, M3.make());
    return { W, inv };
  }
  // Ponto local (x, y, z) de um osso → espaço do modelo (na pose de ligação)
  function ponto(M, x, y, z) { return [M[0] * x + M[1] * y + M[2] * z + M[3], M[4] * x + M[5] * y + M[6] * z + M[7], M[8] * x + M[9] * y + M[10] * z + M[11]]; }
  // Eixos do osso (colunas da rotação, normalizadas: a cabeça tem escala)
  function eixos(M) {
    const u = (a, b, c) => { const l = Math.hypot(a, b, c) || 1; return [a / l, b / l, c / l]; };
    return { X: u(M[0], M[4], M[8]), Y: u(M[1], M[5], M[9]), Z: u(M[2], M[6], M[10]) };
  }

  // ------------------------------------------------------------ malha
  class Malha {
    constructor() {
      this.P = []; this.A = []; this.Bi = []; this.Bw = []; this.I = []; this.G = [];
      this.ossos = []; this.oi = {}; this.grupo = 0;
    }
    osso(nome) { let i = this.oi[nome]; if (i === undefined) { i = this.oi[nome] = this.ossos.length; this.ossos.push(nome); } return i; }
    novoGrupo() { return ++this.grupo; }
    // p: posição; a: [u, v] ou [u, v, brilho] (pintado) ou { cor: [r, g, b], mat, e }; pesos: [[osso, peso], ...]
    v(p, a, pesos) {
      const i = this.P.length / 3;
      this.P.push(p[0], p[1], p[2]);
      if (a.cor) this.A.push(a.cor[0], a.cor[1], -1 - a.cor[2] - 2 * (a.mat || 0), a.e || 0);
      else this.A.push(a[0], a[1], 1, a[2] || 0);   // [u, v, brilho]: só brilha o que tiver a cor de tex.glow
      // até 4 ossos, normalizados
      const L = pesos.filter((q) => q[1] > 0.002).sort((x, y) => y[1] - x[1]).slice(0, 4);
      let s = 0; for (const q of L) s += q[1];
      for (let j = 0; j < 4; j++) {
        const q = L[j];
        this.Bi.push(q ? this.osso(q[0]) : 0); this.Bw.push(q ? q[1] / (s || 1) : 0);
      }
      this.G.push(this.grupo);
      return i;
    }
    tri(a, b, c) { this.I.push(a, b, c); }
    quad(a, b, c, d) { this.I.push(a, b, c, a, c, d); }
    get nv() { return this.P.length / 3; }
    // Normais suaves: soma das faces por vértice, soldando vértices do mesmo grupo na mesma posição
    // (a costura da textura não aparece na luz)
    normais() {
      const P = this.P, I = this.I, nv = this.nv, N = new Float32Array(nv * 3);
      for (let t = 0; t < I.length; t += 3) {
        const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
        const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
        const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        for (const k of [a, b, c]) { N[k] += nx; N[k + 1] += ny; N[k + 2] += nz; }
      }
      const solda = new Map();
      for (let v = 0; v < nv; v++) {
        const k = `${this.G[v]}|${Math.round(P[v * 3] * 200)}|${Math.round(P[v * 3 + 1] * 200)}|${Math.round(P[v * 3 + 2] * 200)}`;
        const L = solda.get(k);
        if (L) L.push(v); else solda.set(k, [v]);
      }
      for (const L of solda.values()) {
        if (L.length < 2) continue;
        let x = 0, y = 0, z = 0;
        for (const v of L) { x += N[v * 3]; y += N[v * 3 + 1]; z += N[v * 3 + 2]; }
        for (const v of L) { N[v * 3] = x; N[v * 3 + 1] = y; N[v * 3 + 2] = z; }
      }
      for (let v = 0; v < nv; v++) {
        const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]) || 1;
        N[v * 3] /= l; N[v * 3 + 1] /= l; N[v * 3 + 2] /= l;
      }
      return N;
    }
    // Formato do motor (R3D.skin): ossos do modelo m, inversas da ligação
    pele(m, inv, nome, lod = 0) {
      const nb = this.ossos.length, I = new Float32Array(nb * 12);
      this.ossos.forEach((o, b) => I.set(inv[o], b * 12));
      return { nome, ossos: this.ossos.slice(), bones: this.ossos.map((o) => m.nodes[o]), inv: I, pos: new Float32Array(this.P), nor: this.normais(),
        att: new Float32Array(this.A), bi: new Uint8Array(this.Bi), bw: new Float32Array(this.Bw), idx: this.I.length > 65535 * 3 ? new Uint32Array(this.I) : new Uint16Array(this.I), lod };
    }
  }

  // ------------------------------------------------------------ tubo por anéis
  // aneis: [{ c: centro, X, Y: eixos da seção (unitários), t: posição ao longo (0..1), ...dados }]
  // secao(anel, th) → [dx, dy] no plano X/Y (th = 0 na direção X; +Y em th = π/2)
  // uv(anel, th, k) → [u, v] ou { cor, mat, e }; pesos(anel, th, p) → [[osso, peso], ...]
  // seg: lados; tampa0/tampa1: fecha as pontas (leque até o centro); th0/th1: arco aberto
  function tubo(M, aneis, seg, secao, uv, pesos, op = {}) {
    const th0 = op.th0 === undefined ? -PI : op.th0, th1 = op.th1 === undefined ? PI : op.th1;
    const fechado = op.th0 === undefined, cols = seg + 1, base = [];
    for (const a of aneis) {
      const linha = [];
      for (let j = 0; j < cols; j++) {
        const th = th0 + (th1 - th0) * j / seg, d = secao(a, th);
        const p = [a.c[0] + a.X[0] * d[0] + a.Y[0] * d[1], a.c[1] + a.X[1] * d[0] + a.Y[1] * d[1], a.c[2] + a.X[2] * d[0] + a.Y[2] * d[1]];
        linha.push(M.v(p, uv(a, th, j / seg), pesos(a, th, p)));
      }
      base.push(linha);
    }
    for (let r = 0; r < aneis.length - 1; r++) {
      if (op.pula && op.pula(aneis[r], aneis[r + 1])) continue;
      for (let j = 0; j < seg; j++) {
        if (op.buraco && op.buraco(aneis[r], th0 + (th1 - th0) * (j + 0.5) / seg)) continue;
        M.quad(base[r][j], base[r][j + 1], base[r + 1][j + 1], base[r + 1][j]);
      }
    }
    const tampa = (a, linha, dir) => {
      const c = M.v(op.ponta ? op.ponta(a, dir) : a.c, uv(a, 0, 0.5, true), pesos(a, 0, a.c));
      for (let j = 0; j < seg; j++) M.tri(c, linha[j], linha[j + 1]);
    };
    if (op.tampa0) tampa(aneis[0], base[0], -1);
    if (op.tampa1) tampa(aneis[aneis.length - 1], base[base.length - 1], 1);
    return { base, fechado };
  }
  // Anéis ao longo de uma curva (pontos), com referencial que gira o mínimo (sem torção) a partir de
  // 'cima' (vetor de referência para o eixo X da seção)
  function aneisCurva(pts, cima) {
    const out = [];
    let X = null;
    let comp = 0;
    const L = [0];
    for (let i = 1; i < pts.length; i++) { comp += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); L.push(comp); }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let T = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const tl = Math.hypot(T[0], T[1], T[2]) || 1; T = [T[0] / tl, T[1] / tl, T[2] / tl];
      let ref = X || cima;
      const d = ref[0] * T[0] + ref[1] * T[1] + ref[2] * T[2];
      let x = [ref[0] - d * T[0], ref[1] - d * T[1], ref[2] - d * T[2]], xl = Math.hypot(x[0], x[1], x[2]);
      if (xl < 1e-5) { x = Math.abs(T[2]) < 0.9 ? [-T[1], T[0], 0] : [1, 0, 0]; xl = Math.hypot(x[0], x[1], x[2]); }
      X = [x[0] / xl, x[1] / xl, x[2] / xl];
      const Y = [T[1] * X[2] - T[2] * X[1], T[2] * X[0] - T[0] * X[2], T[0] * X[1] - T[1] * X[0]];
      out.push({ c: pts[i], X, Y, T, t: comp ? L[i] / comp : 0, s: L[i], i });
    }
    return out;
  }
  // Curva suave (Catmull-Rom) por pontos de controle, n pontos
  function curva(ctrl, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const f = (k / (n - 1)) * (ctrl.length - 1), i = Math.min(ctrl.length - 2, Math.floor(f)), t = f - i;
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      const t2 = t * t, t3 = t2 * t;
      out.push([0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
    return out;
  }
  // Interpolação por tabela [[x, y], ...] (suave entre os pontos)
  function tabela(T, x) {
    if (x <= T[0][0]) return T[0][1];
    for (let i = 1; i < T.length; i++) {
      if (x <= T[i][0]) { const a = T[i - 1], b = T[i], f = (x - a[0]) / (b[0] - a[0]), s = f * f * (3 - 2 * f); return a[1] + (b[1] - a[1]) * s; }
    }
    return T[T.length - 1][1];
  }
  // Superelipse: ponto da seção com semi-eixos (frente a, trás b em X; lado c em Y) e expoente e
  function superelipse(th, aF, aT, c, e) {
    const co = Math.cos(th), si = Math.sin(th), k = 2 / e;
    return [Math.sign(co) * Math.pow(Math.abs(co), k) * (co >= 0 ? aF : aT), Math.sign(si) * Math.pow(Math.abs(si), k) * c];
  }
  // Bossa gaussiana numa superfície (ângulo com volta, altura)
  function bossa(th, h, t0, h0, st, sh) {
    let d = th - t0;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return Math.exp(-(d * d) / (2 * st * st) - ((h - h0) * (h - h0)) / (2 * sh * sh));
  }

  return { ligar, ponto, eixos, Malha, tubo, aneisCurva, curva, tabela, superelipse, bossa, suave, cl, mira };
})();
