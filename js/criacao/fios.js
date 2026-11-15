'use strict';
// ECLIPSE ZERO · Fios de cabelo e de barba nos personagens da criação (Fios)
// ---------------------------------------------------------------------------
// O cabelo e a barba GLB da criação são cascas lisas pintadas (o fio está só na textura): de perto
// parecem capacete e máscara. Aqui, sobre a superfície final deles (já encaixada no rosto e no crânio
// escolhidos, js/criacao/barba_encaixe.js), nascem FIOS de verdade: fitas finas que afinam até a ponta,
// em 3 segmentos curvos, saindo da casca para fora e caindo com o peso (a barba para baixo; o cabelo
// para baixo nas laterais e, no alto, do redemoinho para fora). Cada fio leva a cor da textura no ponto
// onde nasce (a mesma UV) e os pesos de pele do vértice mais perto: acompanha a cabeça, a fala e a
// física das mechas sem nada de novo no motor. Funciona nos dois renderizadores (R3D e realista), que
// desenham os dois lados das faces.
// Só no herói e na prévia da criação (os moradores, muitos de uma vez, ficam sem); a quantidade sai da
// qualidade dos efeitos (Settings.v.quality).
// ---------------------------------------------------------------------------
const Fios = (() => {
  // por tipo: fios por unidade² da casca, teto, comprimento (fração do tamanho da peça), largura na raiz,
  // quanto sai da casca (0 = deitado, 1 = em pé) e o peso (quanto a ponta cai)
  const TIPOS = {
    barba: { dens: 9, teto: 2600, comp: [0.055, 0.12], larg: 0.16, sai: 0.42, peso: 0.55 },
    bigode: { dens: 9, teto: 700, comp: [0.06, 0.12], larg: 0.12, sai: 0.3, peso: 0.6 },
    cabelo: { dens: 5, teto: 4200, comp: [0.05, 0.11], larg: 0.2, sai: 0.28, peso: 0.7 },
  };
  const SEG = 3;   // segmentos por fio (4 pares de vértices)
  const quantos = () => { const q = typeof Settings !== 'undefined' && Settings.v ? Settings.v.quality : 2; return q >= 3 ? 1 : q >= 2 ? 0.75 : q >= 1 ? 0.45 : 0; };

  // Fios de uma pele (instância de instPeles3D) da peça 'tipo'; null se não couber
  function deUmaPele(S, tipo, rnd, fator) {
    const T = TIPOS[tipo], P = S.pos, N = S.nor, A = S.att, I = S.idx, nt = I.length / 3;
    if (!nt || !P.length) return null;
    // tamanho da peça (a diagonal da caixa) e o centro (o redemoinho do cabelo fica em cima dele)
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let v = 0; v < P.length; v += 3) { x0 = Math.min(x0, P[v]); x1 = Math.max(x1, P[v]); y0 = Math.min(y0, P[v + 1]); y1 = Math.max(y1, P[v + 1]); z0 = Math.min(z0, P[v + 2]); z1 = Math.max(z1, P[v + 2]); }
    const tam = Math.hypot(x1 - x0, y1 - y0, z1 - z0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (!(tam > 0.5)) return null;
    // sorteio pela área (uma tabela acumulada)
    const acc = new Float64Array(nt);
    let soma = 0;
    for (let t = 0; t < nt; t++) {
      const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      soma += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
      acc[t] = soma;
    }
    const n = Math.min(Math.round(T.teto * fator), Math.round(soma * T.dens * fator));
    if (n < 20) return null;
    const nv = n * (SEG + 1) * 2, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), att = new Float32Array(nv * 4);
    const bi = new Uint8Array(nv * 4), bw = new Float32Array(nv * 4), idx = new Uint16Array(n * SEG * 6);
    let v = 0, k = 0;
    for (let f = 0; f < n; f++) {
      // o triângulo e o ponto dentro dele
      const r = rnd() * soma;
      let lo = 0, hi = nt - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (acc[m] < r) lo = m + 1; else hi = m; }
      const ia = I[lo * 3], ib = I[lo * 3 + 1], ic = I[lo * 3 + 2];
      let u = rnd(), w = rnd();
      if (u + w > 1) { u = 1 - u; w = 1 - w; }
      const q = 1 - u - w, B = [[ia, q], [ib, u], [ic, w]];
      const p = [0, 0, 0], nn = [0, 0, 0];
      let uvx = 0, uvy = 0, dono = ia, maior = -1;
      for (const [vi, k3] of B) {
        for (let j = 0; j < 3; j++) { p[j] += P[vi * 3 + j] * k3; nn[j] += N[vi * 3 + j] * k3; }
        uvx += A[vi * 4] * k3; uvy += A[vi * 4 + 1] * k3;
        if (k3 > maior) { maior = k3; dono = vi; }
      }
      const ln = Math.hypot(nn[0], nn[1], nn[2]) || 1;
      nn[0] /= ln; nn[1] /= ln; nn[2] /= ln;
      // direção do fio: a gravidade deitada na superfície; no alto da cabeça (onde ela some), do
      // redemoinho para fora; mais um pouco para fora da casca
      let gx = -nn[2] * nn[0], gy = -nn[2] * nn[1], gz = -1 + nn[2] * nn[2];
      let lg = Math.hypot(gx, gy, gz);
      if (tipo === 'cabelo' && lg < 0.45) {
        const rx = p[0] - cx, ry = p[1] - cy, lr = Math.hypot(rx, ry) || 1;
        const ox = rx / lr, oy = ry / lr, d = ox * nn[0] + oy * nn[1];
        gx = gx * lg + (ox - d * nn[0]) * (1 - lg); gy = gy * lg + (oy - d * nn[1]) * (1 - lg); gz = gz * lg + (-d * nn[2]) * (1 - lg);
        lg = Math.hypot(gx, gy, gz);
      }
      if (lg < 1e-4) { gx = 0; gy = 0; gz = -1; lg = 1; }
      gx /= lg; gy /= lg; gz /= lg;
      const sai = T.sai * (0.7 + 0.6 * rnd());
      let dx = gx * (1 - sai) + nn[0] * sai, dy = gy * (1 - sai) + nn[1] * sai, dz = gz * (1 - sai) + nn[2] * sai;
      const ld = Math.hypot(dx, dy, dz) || 1;
      dx /= ld; dy /= ld; dz /= ld;
      // um pouco de desordem (fios não são paralelos)
      dx += (rnd() - 0.5) * 0.35; dy += (rnd() - 0.5) * 0.35; dz += (rnd() - 0.5) * 0.2;
      // a largura vai de lado (perpendicular ao fio e à normal): a fita fica de frente para quem olha de fora
      let bx = dy * nn[2] - dz * nn[1], by = dz * nn[0] - dx * nn[2], bz = dx * nn[1] - dy * nn[0];
      const lb = Math.hypot(bx, by, bz) || 1;
      bx /= lb; by /= lb; bz /= lb;
      const L = tam * (T.comp[0] + rnd() * (T.comp[1] - T.comp[0])), larg = T.larg * (0.7 + 0.6 * rnd());
      // a raiz um pouco para dentro da casca (não aparece o começo do fio)
      const rx0 = p[0] - nn[0] * 0.08, ry0 = p[1] - nn[1] * 0.08, rz0 = p[2] - nn[2] * 0.08;
      const v0 = v;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG, cai = T.peso * t * t * L * 0.5;
        const cxs = rx0 + dx * L * t, cys = ry0 + dy * L * t, czs = rz0 + dz * L * t - cai;
        const h = larg * (1 - t * 0.92) * 0.5;
        for (const lado of [-1, 1]) {
          pos[v * 3] = cxs + bx * h * lado; pos[v * 3 + 1] = cys + by * h * lado; pos[v * 3 + 2] = czs + bz * h * lado;
          nor[v * 3] = nn[0]; nor[v * 3 + 1] = nn[1]; nor[v * 3 + 2] = nn[2];
          att[v * 4] = uvx; att[v * 4 + 1] = uvy; att[v * 4 + 2] = A[dono * 4 + 2]; att[v * 4 + 3] = A[dono * 4 + 3];
          for (let j = 0; j < 4; j++) { bi[v * 4 + j] = S.bi[dono * 4 + j]; bw[v * 4 + j] = S.bw[dono * 4 + j]; }
          v++;
        }
        if (s < SEG) {
          const a = v0 + s * 2;
          idx[k++] = a; idx[k++] = a + 1; idx[k++] = a + 3; idx[k++] = a; idx[k++] = a + 3; idx[k++] = a + 2;
        }
      }
    }
    return { bones: S.bones, inv: S.inv, pos, nor, att, bi, bw, idx, lod: 0, nome: 'fios_' + tipo, regiao: S.regiao || null, fios: true };
  }

  // Fios de todas as peles de uma peça; [] quando desligado
  function gerar(peles, tipo, semente) {
    const fator = quantos();
    if (!fator || !peles || !peles.length || !TIPOS[tipo]) return [];
    const rnd = typeof mulberry32 === 'function' ? mulberry32((semente >>> 0) || 1) : Math.random, out = [];
    for (const S of peles) {
      if (S.fios) continue;
      const F = deUmaPele(S, tipo, rnd, fator);
      if (F) out.push(F);
    }
    return out;
  }
  return { TIPOS, gerar, quantos };
})();
if (typeof window !== 'undefined') window.Fios = Fios;
