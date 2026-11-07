'use strict';
// ECLIPSE ZERO · Encaixe anatômico da barba e do bigode no rosto escolhido (BarbaEncaixe)
// ---------------------------------------------------------------------------
// A barba se adapta ao rosto, e não o rosto à barba. Cada barba e bigode (do Meshy ou em mechas do
// Blender) foi encaixada pelo conversor (tools/importar_criacao.py) no rosto de referência (o Rosto 1
// posto em cada corpo). Aqui, na montagem do personagem, ela é conformada ao rosto escolhido, já com
// o formato do rosto (mandíbula, queixo, boca... de js/criacao/montagem.js) aplicado nos dois:
//   1. RAIOS: de um centro dentro da cabeça (atrás da boca), cada vértice da barba define uma direção.
//      Nela se mede onde a pele está no rosto de referência e no escolhido (a saída mais externa do
//      raio pelos triângulos de cada malha, com os triângulos guardados numa grade de ângulos).
//   2. CONFORMAÇÃO: o vértice anda, ao longo do raio, a diferença entre as duas peles. A folga de cada
//      ponto até a pele fica a mesma do encaixe de referência: a superfície interna acompanha a
//      mandíbula, o queixo, as bochechas e o buço do rosto escolhido, e o volume externo e a silhueta
//      dos fios ficam os da barba. O deslocamento é suavizado na malha (vértices soldados, sem rasgar
//      nas costuras da UV) e os pontos sem pele no raio (pontas soltas abaixo do queixo) herdam o dos
//      vizinhos.
//   3. VOLUME e COMPRIMENTO escolhidos na criação: a folga é multiplicada pelo volume; abaixo do
//      queixo, o que pende é esticado pelo comprimento.
//   4. COLISÃO e VÃOS: nenhum ponto fica dentro da pele (sai até a margem); nas barbas em casca (as do
//      Meshy), a face de dentro que ficou afastada da pele desce até ela (sem barba flutuando).
//   5. VALIDAÇÃO: atravessamentos (outro método: o vértice do rosto mais perto e a normal dele), vãos,
//      barba sobre os olhos e sobre o nariz. Reprovada, a adaptação é refeita com margem e suavização
//      maiores; o resultado (C.encaixeBarba) vai para a tela de criação e para os testes.
// O rosto não é deformado: js/criacao/montagem.js não recua mais a pele dele sob a barba.
// ---------------------------------------------------------------------------
const BarbaEncaixe = (function () {
  const NT = 96, NP = 64;                         // grade de ângulos (azimute × elevação)
  const AQUI = { encaixes: 0, raios: 0, ms: 0 };  // (contadores para os testes)
  const VOL = [0.7, 0.85, 1, 1.18, 1.36], COMP = [0.7, 0.85, 1, 1.2, 1.42];

  // Centro dos raios: atrás da boca, na altura entre o nariz e o queixo (a região da barba fica
  // "estrelada" em volta dele: cada raio sai da pele uma vez só na bochecha, no buço e no queixo)
  function centro(md) {
    const hh = md.topo - md.pescoco;
    return [md.cx + 0.1 * md.profCabeca, md.cy, md.nariz - 0.1 * hh];
  }
  const celula = (t, p) => {
    let i = Math.floor((t + Math.PI) / (2 * Math.PI) * NT); if (i >= NT) i = NT - 1; if (i < 0) i = 0;
    let j = Math.floor((p + Math.PI / 2) / Math.PI * NP); if (j >= NP) j = NP - 1; if (j < 0) j = 0;
    return j * NT + i;
  };
  // Triângulos das peles numa grade de ângulos vista do centro c
  function grade(peles, c) {
    const T = [];                                 // coordenadas dos triângulos (9 por triângulo)
    const cel = new Array(NT * NP);
    for (const S of peles) {
      const P = S.pos, I = S.idx;
      for (let k = 0; k < I.length; k += 3) {
        const a = I[k] * 3, b = I[k + 1] * 3, d = I[k + 2] * 3, n = T.length / 9;
        T.push(P[a], P[a + 1], P[a + 2], P[b], P[b + 1], P[b + 2], P[d], P[d + 1], P[d + 2]);
        let t0 = 9, t1 = -9, p0 = 9, p1 = -9;
        const ts = [];
        for (const o of [a, b, d]) {
          const x = P[o] - c[0], y = P[o + 1] - c[1], z = P[o + 2] - c[2], r = Math.hypot(x, y, z) || 1e-6;
          const t = Math.atan2(y, x), p = Math.asin(Math.max(-1, Math.min(1, z / r)));
          ts.push(t); if (p < p0) p0 = p; if (p > p1) p1 = p;
        }
        ts.sort((u, v) => u - v);
        // o triângulo que cruza a costura de trás (±π) entra pelas duas pontas
        let faixas;
        if (ts[2] - ts[0] > Math.PI) faixas = [[ts[2], Math.PI], [-Math.PI, ts[0]]];
        else faixas = [[ts[0], ts[2]]];
        t0 = 0; t1 = 0;
        const j0 = celula(0, p0) / NT | 0, j1 = celula(0, p1) / NT | 0;
        for (let j = Math.max(0, j0 - 1); j <= Math.min(NP - 1, j1 + 1); j++) {
          const polo = j < 3 || j > NP - 4;
          const lista = polo ? [[-Math.PI, Math.PI]] : faixas;
          for (const [ta, tb] of lista) {
            const i0 = celula(ta, 0) % NT, i1 = celula(tb, 0) % NT;
            for (let i = Math.max(0, i0 - 1); i <= Math.min(NT - 1, i1 + 1); i++) {
              const q = j * NT + i;
              (cel[q] || (cel[q] = [])).push(n);
            }
          }
        }
      }
    }
    return { T: new Float32Array(T), cel, c };
  }
  // Saída mais externa do raio c + t·d pela malha (t > 0), ou −1
  function raio(G, d) {
    AQUI.raios++;
    const t = Math.atan2(d[1], d[0]), p = Math.asin(Math.max(-1, Math.min(1, d[2])));
    const L = G.cel[celula(t, p)];
    if (!L) return -1;
    const T = G.T, c = G.c;
    let melhor = -1;
    for (const n of L) {
      const o = n * 9;
      const e1x = T[o + 3] - T[o], e1y = T[o + 4] - T[o + 1], e1z = T[o + 5] - T[o + 2];
      const e2x = T[o + 6] - T[o], e2y = T[o + 7] - T[o + 1], e2z = T[o + 8] - T[o + 2];
      const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-9) continue;
      const inv = 1 / det, sx = c[0] - T[o], sy = c[1] - T[o + 1], sz = c[2] - T[o + 2];
      const u = (sx * px + sy * py + sz * pz) * inv;
      if (u < -1e-4 || u > 1.0001) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
      const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
      if (v < -1e-4 || u + v > 1.0001) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (tt > 0 && tt > melhor) melhor = tt;
    }
    return melhor;
  }
  // Vértices soldados (mesma posição) e vizinhos pela malha, de todas as peles da barba
  function vizinhanca(peles) {
    const chave = new Map(), id = [], viz = [];
    let n = 0;
    peles.forEach((S, si) => {
      const P = S.pos, m = P.length / 3, ids = new Int32Array(m);
      for (let v = 0; v < m; v++) {
        const k = `${Math.round(P[v * 3] * 500)},${Math.round(P[v * 3 + 1] * 500)},${Math.round(P[v * 3 + 2] * 500)}`;
        let w = chave.get(k);
        if (w === undefined) { w = n++; chave.set(k, w); viz.push(new Set()); }
        ids[v] = w;
      }
      id[si] = ids;
      const I = S.idx;
      for (let k = 0; k < I.length; k += 3) {
        const a = ids[I[k]], b = ids[I[k + 1]], d = ids[I[k + 2]];
        viz[a].add(b); viz[a].add(d); viz[b].add(a); viz[b].add(d); viz[d].add(a); viz[d].add(b);
      }
    });
    return { n, id, viz: viz.map((s) => Int32Array.from(s)) };
  }
  // Suaviza um campo (NaN = desconhecido: herda a média dos vizinhos conhecidos)
  function suavizar(f, viz, voltas, fixo) {
    const n = f.length;
    for (let r = 0; r < voltas; r++) {
      const g = new Float32Array(f);
      for (let i = 0; i < n; i++) {
        if (fixo && fixo[i]) continue;
        let s = 0, k = 0;
        for (const j of viz[i]) if (!Number.isNaN(f[j])) { s += f[j]; k++; }
        if (!k) continue;
        g[i] = Number.isNaN(f[i]) ? s / k : 0.5 * f[i] + 0.5 * s / k;
      }
      f.set(g);
    }
    return f;
  }
  // Vértices e normais do rosto num mapa espacial (a checagem independente de atravessamento)
  function mapaPele(peles, H) {
    const G = new Map();
    for (const S of peles) {
      const P = S.pos, N = S.nor;
      for (let v = 0; v < P.length; v += 3) {
        const k = `${Math.floor(P[v] / H)},${Math.floor(P[v + 1] / H)},${Math.floor(P[v + 2] / H)}`;
        let L = G.get(k); if (!L) G.set(k, (L = []));
        L.push(P[v], P[v + 1], P[v + 2], N[v], N[v + 1], N[v + 2]);
      }
    }
    return (x, y, z) => {
      const i = Math.floor(x / H), j = Math.floor(y / H), k = Math.floor(z / H);
      let best = 1e9, q = null, o = 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        const L = G.get(`${i + a},${j + b},${k + c}`);
        if (!L) continue;
        for (let t = 0; t < L.length; t += 6) { const d2 = (x - L[t]) ** 2 + (y - L[t + 1]) ** 2 + (z - L[t + 2]) ** 2; if (d2 < best) { best = d2; q = L; o = t; } }
      }
      if (!q) return null;
      return { d: Math.sqrt(best), s: (x - q[o]) * q[o + 3] + (y - q[o + 1]) * q[o + 4] + (z - q[o + 2]) * q[o + 5] };
    };
  }
  // Pontos do rosto escolhido: a ponta do nariz (o mais à frente perto do meio) e a frente de cada
  // olho (o mais à frente na faixa da pálpebra, dos dois lados)
  function marcos(rosto, md) {
    const hh = md.topo - md.pescoco, L = md.largCabeca;
    let nx = -1e9, nz = md.nariz;
    for (const S of rosto) {
      const P = S.pos;
      for (let v = 0; v < P.length; v += 3) if (Math.abs(P[v + 1] - md.cy) < 0.12 * L && Math.abs(P[v + 2] - md.nariz) < 0.12 * hh && P[v] > nx) { nx = P[v]; nz = P[v + 2]; }
    }
    const olho = [-1e9, -1e9];
    for (const S of rosto) {
      const P = S.pos;
      for (let v = 0; v < P.length; v += 3) {
        const dy = P[v + 1] - md.cy, a = Math.abs(dy), z = P[v + 2];
        if (z > nz + 0.12 * hh && z < nz + 0.2 * hh && a > 0.12 * L && a < 0.26 * L && P[v] < nx - 0.3) { const k = dy < 0 ? 0 : 1; if (P[v] > olho[k]) olho[k] = P[v]; }
      }
    }
    return { nx, nz, hh, L, olho };
  }

  // Conforma as peles da barba e do bigode (C.peles.barba / .bigode, já com o formato do rosto) ao
  // rosto escolhido (rosto) a partir do de referência (ref). op: { vol, comp, casca, margem }
  function conformar(barbas, rosto, ref, md, op = {}) {
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const hh = md.topo - md.pescoco, c = centro(md);
    const Gk = grade(rosto, c), Gr = ref === rosto ? Gk : grade(ref, c);
    const V = vizinhanca(barbas), n = V.n;
    // posição de cada vértice soldado
    const X = new Float32Array(n * 3), Nn = new Float32Array(n * 3);
    barbas.forEach((S, si) => { const ids = V.id[si]; for (let v = 0; v < ids.length; v++) { const w = ids[v]; X.set(S.pos.subarray(v * 3, v * 3 + 3), w * 3); Nn[w * 3] += S.nor[v * 3]; Nn[w * 3 + 1] += S.nor[v * 3 + 1]; Nn[w * 3 + 2] += S.nor[v * 3 + 2]; } });
    const dir = (i) => { const x = X[i * 3] - c[0], y = X[i * 3 + 1] - c[1], z = X[i * 3 + 2] - c[2], r = Math.hypot(x, y, z) || 1e-6; return [x / r, y / r, z / r, r]; };
    // 1-2. deslocamento ao longo do raio: a pele do escolhido menos a da referência
    const D = new Float32Array(n), sRef = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = dir(i), tr = raio(Gr, d), tk = ref === rosto ? tr : raio(Gk, d);
      D[i] = tr > 0 && tk > 0 ? Math.max(-0.12 * hh, Math.min(0.12 * hh, tk - tr)) : NaN;
      sRef[i] = tr > 0 ? d[3] - tr : NaN;
    }
    const suave = op.suave || 3;
    suavizar(D, V.viz, 6, null);                  // (os desconhecidos herdam dos vizinhos)
    suavizar(D, V.viz, suave, null);
    for (let i = 0; i < n; i++) {
      const Di = Number.isNaN(D[i]) ? 0 : D[i], d = dir(i);
      X[i * 3] += d[0] * Di; X[i * 3 + 1] += d[1] * Di; X[i * 3 + 2] += d[2] * Di;
    }
    // 3. volume (a folga multiplicada) e comprimento (o que pende abaixo do queixo)
    const vol = op.vol || 1, comp = op.comp || 1, margem = op.margem || 0.05, zq = md.nariz - 0.3 * hh;
    if (vol !== 1 || comp !== 1) {
      for (let i = 0; i < n; i++) {
        const d = dir(i), tk = raio(Gk, d);
        if (vol !== 1 && tk > 0) {
          const s = d[3] - tk;
          if (s > margem) { const r = tk + margem + (s - margem) * vol; X[i * 3] = c[0] + d[0] * r; X[i * 3 + 1] = c[1] + d[1] * r; X[i * 3 + 2] = c[2] + d[2] * r; }
        }
        if (comp !== 1 && X[i * 3 + 2] < zq) X[i * 3 + 2] = zq - (zq - X[i * 3 + 2]) * comp;
      }
    }
    // 4a. máscaras das regiões do rosto: nada sobe à faixa dos olhos nem ao dorso do nariz (o rosto
    // mais estreito ou mais curto puxava o alto da barba da bochecha para dentro, até a pálpebra)
    const M = marcos(rosto, md), L = md.largCabeca;
    let mascarados = 0;
    for (let i = 0; i < n; i++) {
      const x = X[i * 3], y = X[i * 3 + 1], z = X[i * 3 + 2], dy = Math.abs(y - md.cy);
      const zo = M.nz + 0.11 * hh, zn = M.nz + 0.05 * hh;
      if (z > zo && dy > 0.09 * L && dy < 0.27 * L && x > M.olho[y < md.cy ? 0 : 1] - 0.45) { X[i * 3 + 2] = zo - 0.02 * (z - zo); mascarados++; }
      else if (z > zn && dy < 0.09 * L && x > M.nx - 0.6) { X[i * 3 + 2] = zn - 0.02 * (z - zn); mascarados++; }
    }
    // 4b. raiz das mechas: cada pedaço solto da malha (uma mecha das barbas do Blender) desce inteiro
    // até a pele pelo seu ponto mais perto dela (as costeletas não ficam em pé, afastadas da têmpora);
    // nas barbas em casca do Meshy o pedaço é a barba toda, que já encosta
    let enraizadas = 0;
    {
      const comp = new Int32Array(n).fill(-1), fila = [];
      let nc = 0;
      for (let i = 0; i < n; i++) {
        if (comp[i] >= 0) continue;
        comp[i] = nc; fila.length = 0; fila.push(i);
        for (let f = 0; f < fila.length; f++) for (const j of V.viz[fila[f]]) if (comp[j] < 0) { comp[j] = nc; fila.push(j); }
        nc++;
      }
      const smin = new Float32Array(nc).fill(1e9), s = new Float32Array(n).fill(NaN);
      for (let i = 0; i < n; i++) {
        const d = dir(i), tk = raio(Gk, d);
        if (tk > 0) { s[i] = d[3] - tk; if (s[i] < smin[comp[i]]) smin[comp[i]] = s[i]; }
      }
      for (let i = 0; i < n; i++) {
        const k = smin[comp[i]];
        if (!(k > margem + 0.08 && k < 1.2)) continue;
        const d = dir(i), dd = k - margem - 0.02;
        X[i * 3] -= d[0] * dd; X[i * 3 + 1] -= d[1] * dd; X[i * 3 + 2] -= d[2] * dd;
      }
      for (let c2 = 0; c2 < nc; c2++) if (smin[c2] > margem + 0.08 && smin[c2] < 1.2) enraizadas++;
    }
    // 4c. colisão (nenhum ponto dentro da pele) e vãos da face de dentro (barbas em casca)
    let empurrados = 0, fechados = 0;
    for (let i = 0; i < n; i++) {
      const d = dir(i), tk = raio(Gk, d);
      if (tk <= 0) continue;
      let s = d[3] - tk;
      const nl = Math.hypot(Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2]) || 1;
      const dentro = -(Nn[i * 3] * d[0] + Nn[i * 3 + 1] * d[1] + Nn[i * 3 + 2] * d[2]) / nl;   // > 0: a face de dentro
      if (s < margem) { s = margem; empurrados++; }
      else if (op.casca && dentro > (op.fechar ? 0.15 : 0.3) && sRef[i] < (op.fechar || 0.9) && s > margem + 0.12) { s = margem + 0.06; fechados++; }
      else continue;
      const r = tk + s;
      X[i * 3] = c[0] + d[0] * r; X[i * 3 + 1] = c[1] + d[1] * r; X[i * 3 + 2] = c[2] + d[2] * r;
    }
    // devolve às peles (cópias próprias: a geometria decodificada é compartilhada)
    barbas.forEach((S, si) => {
      const ids = V.id[si], P = new Float32Array(S.pos.length);
      for (let v = 0; v < ids.length; v++) P.set(X.subarray(ids[v] * 3, ids[v] * 3 + 3), v * 3);
      S.pos = P;
    });
    AQUI.encaixes++;
    AQUI.ms = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
    return { empurrados, fechados, mascarados, enraizadas, n };
  }

  // 5. Validação do encaixe no rosto escolhido
  function validar(barbas, rosto, md, op = {}) {
    const c = centro(md), Gk = grade(rosto, c), M = marcos(rosto, md), hh = M.hh, L = M.L;
    const perto = mapaPele(rosto, 0.8);
    let n = 0, pen = 0, olhos = 0, nariz = 0, casca = 0, vao = 0;
    for (const S of barbas) {
      const P = S.pos, N = S.nor;
      for (let v = 0; v < P.length; v += 3) {
        n++;
        const x = P[v], y = P[v + 1], z = P[v + 2];
        const q = perto(x, y, z);
        if (q && q.d < 0.8 && q.s < -0.08) pen++;
        const dy = Math.abs(y - md.cy);
        // olhos: a faixa da pálpebra à sobrancelha, à frente, dos dois lados do nariz
        if (z > M.nz + 0.12 * hh && z < M.nz + 0.22 * hh && dy > 0.1 * L && dy < 0.25 * L && x > M.olho[y < md.cy ? 0 : 1] - 0.35) { olhos++; if (op.debug) op.debug.push(['o', +(x - M.nx).toFixed(2), +(dy / L).toFixed(2), +((z - M.nz) / hh).toFixed(2)]); }
        // nariz: acima da base do nariz, perto do meio, bem à frente
        if (z > M.nz + 0.06 * hh && dy < 0.08 * L && x > M.nx - 0.5) { nariz++; if (op.debug) op.debug.push(['n', +(x - M.nx).toFixed(2), +(dy / L).toFixed(2), +((z - M.nz) / hh).toFixed(2)]); }
        // vãos: a face de dentro (normal para o centro) no rosto, longe da pele
        if (op.casca) {
          const dx = x - c[0], dyy = y - c[1], dz = z - c[2], r = Math.hypot(dx, dyy, dz) || 1;
          if (-(N[v] * dx + N[v + 1] * dyy + N[v + 2] * dz) / r > 0.3 && z > M.nz - 0.27 * hh) {
            const tk = raio(Gk, [dx / r, dyy / r, dz / r]);
            if (tk > 0) { casca++; if (r - tk > 0.4) vao++; }
          }
        }
      }
    }
    const R = { n, pen: pen / Math.max(1, n), olhos, nariz, vao: casca ? vao / casca : 0 };
    if (op.debug) op.debug.marcos = M;
    R.ok = R.pen < 0.01 && R.olhos <= 2 && R.nariz <= 2 && R.vao < 0.08;
    return R;
  }

  // Na montagem: conforma, valida e, se reprovar, refaz uma vez mais firme. Devolve o relatório.
  function encaixar(barbas, rosto, ref, md, A, casca) {
    const op = { vol: VOL[Number.isInteger(A.barbaVol) ? A.barbaVol : 2] || 1, comp: COMP[Number.isInteger(A.barbaComp) ? A.barbaComp : 2] || 1, casca, margem: 0.05, suave: 3 };
    const orig = barbas.map((S) => S.pos);
    let info = conformar(barbas, rosto, ref, md, op), R = validar(barbas, rosto, md, op);
    R.tentativas = 1;
    if (!R.ok) {
      barbas.forEach((S, i) => { S.pos = orig[i]; });
      const op2 = Object.assign({}, op, { margem: 0.09, suave: 8, fechar: 1.6 });   // (mais firme: margem, suavização e vãos maiores)
      info = conformar(barbas, rosto, ref, md, op2);
      R = validar(barbas, rosto, md, op2);
      R.tentativas = 2;
    }
    Object.assign(R, info, { ms: AQUI.ms });
    return R;
  }
  return { encaixar, conformar, validar, grade, raio, centro, marcos, VOL, COMP, AQUI };
})();
