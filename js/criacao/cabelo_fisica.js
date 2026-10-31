'use strict';
// ECLIPSE ZERO · física do cabelo
// -----------------------------------------------------------------------------
// Os cabelos feitos no Blender (tools/blender/cabelos.py, convertidos por tools/importar_criacao.py)
// trazem cadeias de ossos (cab<k>_<j>) presas à cabeça. A cada quadro, depois que o motor
// (R3D.poseAll) calcula as matrizes dos ossos, as juntas de cada cadeia andam por Verlet:
// - inércia: o que estava parado fica para trás quando a cabeça se mexe (giro, passada, golpe,
//   esquiva, pulo), e o tranco de levar dano sacode as pontas;
// - peso, vento do clima (Clima.vento, com rajadas; na tela de criação uma brisa) e o ar contra o
//   movimento do corpo (correndo, o cabelo vai para trás);
// - volta à pose (rigidez), amortecimento, comprimento de cada osso fixo e um ângulo máximo em
//   relação à pose de repouso;
// - colisão simples com esferas presas aos ossos (cabeça, pescoço, peito, costas e ombros);
// - molhado (chuva): mais pesado, mais amortecido e menos levado pelo vento.
// Depois cada osso da cadeia gira da direção de repouso para a simulada, e a malha segue pela pele.
// Nível de detalhe: com poucos pixels por unidade (longe, na vista isométrica afastada) o cabelo
// fica preso à cabeça, sem simulação; de perto, três iterações por passo.
// O estado fica no espaço da vista em que o modelo é desenhado; se a vista muda (outra raiz, como
// o retrato ou a 3ª pessoa), o estado é levado junto com a cabeça, sem tranco.
const CabeloFisica = (() => {
  const G = 333;                 // gravidade em unidades do jogo (9,8 m/s², 34 unidades por metro)
  const PASSO = 1 / 60;

  // ------------------------------------------------------------ montagem
  // Cria os nós das cadeias (filhos da cabeça) antes de a pele do cabelo ser instanciada; tira os
  // de um cabelo anterior. D: dados da peça; corpo: 'corpo_m' | 'corpo_f'
  function preparar(m, D, corpo) {
    const head = m.nodes.head;
    if (m._cab) {
      for (const c of m._cab.cadeias) for (const nd of c.nos) { delete m.nodes[nd.name]; delete m.rest[nd.name]; }
      if (head) head.kids = head.kids.filter((k) => !k._cab);
      m._cab = null;
      if (m.depoisPose === passo) m.depoisPose = null;
    }
    const cad = D && D.cadeias && D.cadeias[corpo];
    if (!head || !cad || !cad.length) return;
    const cadeias = cad.map((c) => {
      let pai = head;
      const nos = c.ossos.map((nm, j) => {
        const nd = new N3(nm);
        nd.p = c.p[j].slice();
        nd._cab = j === 0;
        pai.add(nd);
        m.nodes[nm] = nd;
        m.rest[nm] = { p: nd.p.slice(), r: [0, 0, 0], s: [1, 1, 1] };
        pai = nd;
        return nd;
      });
      const n = nos.length + 1;
      return { nos, ponta: c.ponta, X: new Float32Array(n * 3), Xp: new Float32Array(n * 3), R: new Float32Array(n * 3), L: new Float32Array(n) };
    });
    const col = ((D.colisores && D.colisores[corpo]) || []).filter((c) => m.nodes[c.osso]).map((c) => ({ no: m.nodes[c.osso], c: c.c, r: c.r, W: new Float32Array(4) }));
    m._cab = { cadeias, col, f: Object.assign({ rigidez: 0.3, amortecimento: 0.12, peso: 1, limite: 70 }, D.fisica || {}), t: 0, H: new Float32Array(12), ok: false, esc: 1, estado: null, rajada: Math.random() * 10 };
    m.depoisPose = passo;
  }

  // ------------------------------------------------------------ apoio
  const tr = (w, p, o, i) => { o[i] = w[0] * p[0] + w[1] * p[1] + w[2] * p[2] + w[3]; o[i + 1] = w[4] * p[0] + w[5] * p[1] + w[6] * p[2] + w[7]; o[i + 2] = w[8] * p[0] + w[9] * p[1] + w[10] * p[2] + w[11]; };
  // inversa de uma matriz 3×4 (afim)
  function inv34(m, o) {
    const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C || 1e-9, k = 1 / det;
    o[0] = A * k; o[1] = -(b * i - c * h) * k; o[2] = (b * f - c * e) * k;
    o[4] = B * k; o[5] = (a * i - c * g) * k; o[6] = -(a * f - c * d) * k;
    o[8] = C * k; o[9] = -(a * h - b * g) * k; o[10] = (a * e - b * d) * k;
    for (let r = 0; r < 3; r++) o[r * 4 + 3] = -(o[r * 4] * m[3] + o[r * 4 + 1] * m[7] + o[r * 4 + 2] * m[11]);
    return o;
  }
  function mul34(a, b, o) {
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 4; k++) o[r * 4 + k] = a[r * 4] * b[k] + a[r * 4 + 1] * b[4 + k] + a[r * 4 + 2] * b[8 + k] + (k === 3 ? a[r * 4 + 3] : 0);
    }
    return o;
  }
  const _I = new Float32Array(12), _T = new Float32Array(12), _q = [0, 0, 0];
  function levar(T, A) { for (let i = 0; i < A.length; i += 3) { _q[0] = A[i]; _q[1] = A[i + 1]; _q[2] = A[i + 2]; tr(T, _q, A, i); } }
  // molhado (0 a 1) e vento (vetor, unidades/s²) do lugar
  function clima(e, S, t) {
    let molhado = 0, v = 0.12, ang = 0.6;
    if (typeof Clima !== 'undefined' && typeof game !== 'undefined' && game.world && typeof World !== 'undefined' && World.zone) {
      try { const w = e && Clima.roupa(e); molhado = w ? Math.min(1, w[0]) : 0; v = Clima.vento(); } catch (err) { /* sem clima */ }
      ang = 0.6 + 0.4 * Math.sin(t * 0.05);
    }
    const raj = 0.65 + 0.35 * Math.sin(t * 1.3 + S.rajada) * Math.sin(t * 0.37 + S.rajada * 2) + 0.15 * Math.sin(t * 4.1);
    const k = v * 70 * raj * (1 - 0.6 * molhado);
    return { molhado, wx: Math.cos(ang) * k, wy: Math.sin(ang) * k };
  }

  // ------------------------------------------------------------ passo (chamado pelo R3D.poseAll)
  function passo(m, e, det) {
    const S = m._cab;
    if (!S || !m.nodes.head) return;
    if (S.peles && S.peles.length && S.peles.every((p) => p.hide)) return;   // cabelo escondido (elmo, capuz)
    const hw = m.nodes.head.w;
    const agora = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    const esc = Math.hypot(hw[0], hw[4], hw[8]);
    // outra vista (raiz diferente): o estado vai junto com a cabeça
    if (S.ok && (Math.abs(esc - S.esc) > 0.02 * S.esc || Math.hypot(hw[3] - S.H[3], hw[7] - S.H[7], hw[11] - S.H[11]) > 30 * esc)) {
      mul34(hw, inv34(S.H, _I), _T);
      for (const c of S.cadeias) { levar(_T, c.X); levar(_T, c.Xp); }
    }
    // pose de repouso deste quadro: as juntas presas à cabeça (o motor acabou de calcular)
    for (const c of S.cadeias) {
      const n = c.nos.length;
      for (let j = 0; j < n; j++) { const w = c.nos[j].w; c.R[j * 3] = w[3]; c.R[j * 3 + 1] = w[7]; c.R[j * 3 + 2] = w[11]; }
      tr(c.nos[n - 1].w, c.ponta, c.R, n * 3);
      for (let j = 1; j <= n; j++) c.L[j] = Math.hypot(c.R[j * 3] - c.R[j * 3 - 3], c.R[j * 3 + 1] - c.R[j * 3 - 2], c.R[j * 3 + 2] - c.R[j * 3 - 1]);
    }
    const longe = det < 1.0;
    if (!S.ok || longe) {
      for (const c of S.cadeias) { c.X.set(c.R); c.Xp.set(c.R); }
      S.ok = !longe; S.t = agora; S.H.set(hw); S.esc = esc;
      if (longe) return;
    }
    let dt = Math.min(agora - S.t, 0.1);
    S.t = agora; S.H.set(hw); S.esc = esc;
    // colisores neste quadro
    for (const k of S.col) { tr(k.no.w, k.c, k.W, 0); k.W[3] = k.r * Math.hypot(k.no.w[0], k.no.w[4], k.no.w[8]) * 0.9; }
    if (dt > 0.0005) {
      const f = S.f, Cl = clima(e, S, agora), s = esc / 1.08;
      const amort = Math.min(0.9, f.amortecimento + 0.1 * Cl.molhado);
      const rig = f.rigidez * (1 - 0.35 * Cl.molhado);
      const g = G * f.peso * (1 + 0.5 * Cl.molhado) * s;
      // ar contra o movimento do corpo e vento
      const vx = e ? +e.vx || 0 : 0, vy = e ? +e.vy || 0 : 0;
      const ax = (Cl.wx - vx * 1.4) * s, ay = (Cl.wy - vy * 1.4) * s;
      // tranco ao levar dano (uma vez por golpe)
      const est = e && e.state;
      if (est !== S.estado && (est === 'hurt' || est === 'stagger')) {
        const k = 1.6 * s;
        for (const c of S.cadeias) for (let j = 1; j < c.L.length; j++) { c.Xp[j * 3] += (Math.random() - 0.5) * k * j; c.Xp[j * 3 + 1] += (Math.random() - 0.5) * k * j; c.Xp[j * 3 + 2] -= k * 0.5 * j; }
      }
      S.estado = est;
      const it = det < 2.5 ? 1 : 3, lim = Math.cos(f.limite * Math.PI / 180);
      for (let sub = Math.max(1, Math.round(dt / PASSO)), h = dt / sub; sub > 0; sub--) {
        for (const c of S.cadeias) {
          const X = c.X, P = c.Xp, R = c.R, n = c.nos.length;
          X[0] = R[0]; X[1] = R[1]; X[2] = R[2];
          for (let j = 1; j <= n; j++) {
            const i = j * 3;
            const ux = (X[i] - P[i]) * (1 - amort), uy = (X[i + 1] - P[i + 1]) * (1 - amort), uz = (X[i + 2] - P[i + 2]) * (1 - amort);
            P[i] = X[i]; P[i + 1] = X[i + 1]; P[i + 2] = X[i + 2];
            X[i] += ux + ax * h * h; X[i + 1] += uy + ay * h * h; X[i + 2] += uz - g * h * h;
          }
          for (let q = 0; q < it; q++) {
            for (let j = 1; j <= n; j++) {
              const i = j * 3, a = i - 3;
              const rx = R[i] - R[a], ry = R[i + 1] - R[a + 1], rz = R[i + 2] - R[a + 2], rl = Math.hypot(rx, ry, rz) || 1e-9;
              // volta à pose (em relação à junta de cima)
              if (q === 0) { const k = rig * 0.35; X[i] += (X[a] + rx - X[i]) * k; X[i + 1] += (X[a + 1] + ry - X[i + 1]) * k; X[i + 2] += (X[a + 2] + rz - X[i + 2]) * k; }
              let dx = X[i] - X[a], dy = X[i + 1] - X[a + 1], dz = X[i + 2] - X[a + 2], dl = Math.hypot(dx, dy, dz) || 1e-9;
              dx /= dl; dy /= dl; dz /= dl;
              // ângulo máximo em relação à pose
              const cs = (dx * rx + dy * ry + dz * rz) / rl;
              if (cs < lim) {
                const k = Math.min(1, (lim - cs) * 1.5);
                dx += (rx / rl - dx) * k; dy += (ry / rl - dy) * k; dz += (rz / rl - dz) * k;
                dl = Math.hypot(dx, dy, dz) || 1e-9; dx /= dl; dy /= dl; dz /= dl;
              }
              const L = c.L[j];
              X[i] = X[a] + dx * L; X[i + 1] = X[a + 1] + dy * L; X[i + 2] = X[a + 2] + dz * L;
              // colisão: esferas (menos as que já contêm a junta em repouso)
              for (const k of S.col) {
                const W = k.W;
                if ((R[i] - W[0]) ** 2 + (R[i + 1] - W[1]) ** 2 + (R[i + 2] - W[2]) ** 2 < W[3] * W[3]) continue;
                const ex = X[i] - W[0], ey = X[i + 1] - W[1], ez = X[i + 2] - W[2], el = Math.hypot(ex, ey, ez);
                if (el < W[3] && el > 1e-6) { const f2 = W[3] / el; X[i] = W[0] + ex * f2; X[i + 1] = W[1] + ey * f2; X[i + 2] = W[2] + ez * f2; }
              }
            }
          }
        }
      }
    }
    // ossos: giram da direção de repouso para a simulada, na posição simulada
    for (const c of S.cadeias) {
      const X = c.X, R = c.R;
      for (let j = 0; j < c.nos.length; j++) {
        const i = j * 3, b = i + 3, w = c.nos[j].w;
        let rx = R[b] - R[i], ry = R[b + 1] - R[i + 1], rz = R[b + 2] - R[i + 2], dx = X[b] - X[i], dy = X[b + 1] - X[i + 1], dz = X[b + 2] - X[i + 2];
        const rl = Math.hypot(rx, ry, rz) || 1e-9, dl = Math.hypot(dx, dy, dz) || 1e-9;
        rx /= rl; ry /= rl; rz /= rl; dx /= dl; dy /= dl; dz /= dl;
        // rotação de r para d (Rodrigues)
        let kx = ry * dz - rz * dy, ky = rz * dx - rx * dz, kz = rx * dy - ry * dx;
        const sn = Math.hypot(kx, ky, kz), cs = rx * dx + ry * dy + rz * dz;
        if (sn > 1e-6) {
          kx /= sn; ky /= sn; kz /= sn;
          const v = 1 - cs;
          const Q = [cs + kx * kx * v, kx * ky * v - kz * sn, kx * kz * v + ky * sn,
            ky * kx * v + kz * sn, cs + ky * ky * v, ky * kz * v - kx * sn,
            kz * kx * v - ky * sn, kz * ky * v + kx * sn, cs + kz * kz * v];
          for (let col = 0; col < 3; col++) {
            const a0 = w[col], a1 = w[4 + col], a2 = w[8 + col];
            w[col] = Q[0] * a0 + Q[1] * a1 + Q[2] * a2;
            w[4 + col] = Q[3] * a0 + Q[4] * a1 + Q[5] * a2;
            w[8 + col] = Q[6] * a0 + Q[7] * a1 + Q[8] * a2;
          }
        }
        w[3] = X[i]; w[7] = X[i + 1]; w[11] = X[i + 2];
      }
    }
  }

  // Quanto as pontas estão longe da pose de repouso (para os testes e a depuração)
  function desvio(m) {
    const S = m && m._cab;
    if (!S) return 0;
    let d = 0;
    for (const c of S.cadeias) { const n = c.nos.length * 3; d = Math.max(d, Math.hypot(c.X[n] - c.R[n], c.X[n + 1] - c.R[n + 1], c.X[n + 2] - c.R[n + 2])); }
    return d;
  }

  return { preparar, passo, desvio };
})();
