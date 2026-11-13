'use strict';
// ECLIPSE ZERO · Relevo: altura real do chão (Relevo)
// ---------------------------------------------------------------------------
// O chão das zonas naturais deixa de ser plano. Cada ponto tem a sua altura, tirada de um campo
// contínuo gerado pela semente do mundo (ruído em várias camadas com dobra de domínio e cristas):
// colinas e vales na floresta, dunas no deserto, encostas e picos na neve e no vulcão.
//  · O campo é avaliado em coordenadas do MUNDO (a grade de zonas da região): a borda de uma zona
//    tem a mesma altura da borda da vizinha, e a força do relevo de cada zona (mais baixo nas vilas,
//    zero nas cidades) é interpolada entre os centros das zonas, sem degrau na passagem.
//  · Na carga da zona o campo vira uma grade (32 unidades por célula) com os ajustes do lugar: a
//    água fica no baixo (o terreno desce até a margem), as construções ganham um patamar (não
//    flutuam nem ficam enterradas) e as passagens, baús e portais ficam em chão firme.
//  · A altura existe na GEOMETRIA (a malha do chão da 3ª pessoa sobe e desce, com as normais do
//    relevo) e na posição de tudo o que pisa nele: herói, inimigos, moradores, animais, estruturas,
//    árvores, sombras, itens, fogo, efeitos e a câmera. Subir cansa: a ladeira reduz o passo.
// A vista isométrica continua desenhando o mapa de cima, plano (é a carta do lugar); o relevo vale
// na 3ª pessoa, que é a câmera padrão. As zonas ainda são carregadas uma a uma (o mundo sem troca
// de zona, por setores, é a etapa seguinte); a altura já é contínua entre elas.
// ---------------------------------------------------------------------------
const Relevo = (() => {
  const CEL = 32, LADO = 2400;   // célula da grade; lado de uma zona nas coordenadas do mundo
  // força do relevo por tema (unidades de altura; o herói tem ~61)
  const AMP = { floresta: 120, lagoa: 64, deserto: 96, neve: 250, vulcao: 210 };
  const mist = (a, b) => { let h = (a ^ 0x9e3779b9) >>> 0; h = Math.imul(h ^ (b >>> 0), 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
  const hashTxt = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const suave = (t) => t * t * (3 - 2 * t), cl = (v, a, b) => (v < a ? a : v > b ? b : v), passo = (a, b, v) => suave(cl((v - a) / (b - a), 0, 1));
  function ruido(sem) {
    const h = (x, y) => mist(mist(sem, x | 0), y | 0) / 4294967296;
    return (x, y) => { const x0 = Math.floor(x), y0 = Math.floor(y), fx = suave(x - x0), fy = suave(y - y0), a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  }
  function fbm(sem, oit) { const N = [...Array(oit)].map((_, i) => ruido(mist(sem, 211 + i * 53))); return (x, y) => { let v = 0, a = 0.5, f = 1, t = 0; for (let i = 0; i < oit; i++) { v += N[i](x * f, y * f) * a; t += a; a *= 0.5; f *= 2.02; } return v / t; }; }

  let A = null;   // a zona atual: { sala, z, forma, forca, grade, nx, ny, x0, y0, amp }
  const semMundo = () => { const s = typeof World !== 'undefined' && World.state && World.state.paisagem; return s && s.mundo !== undefined ? s.mundo >>> 0 : (typeof Paisagem !== 'undefined' ? Paisagem.SEMENTE_PADRAO : 7411); };
  const temaDe = (z) => (z && typeof THEMES !== 'undefined' && THEMES[z.theme] ? z.theme : z && z.theme);
  // força do relevo de uma zona (0: plana — cidades, interiores, masmorras, temas construídos)
  function forcaZona(z) {
    if (!z || z.instancia || z.cidade || z.distrito || !z.aberto) return 0;
    const a = AMP[temaDe(z)] || 0;
    return a * (z.hub || z.seguro ? 0.3 : 1);
  }
  // Forma do relevo da região (0 a 1), em coordenadas do mundo: colinas largas, cristas e detalhe
  function formaDe(reg, montanhoso) {
    const s = mist(semMundo(), hashTxt('relevo:' + reg)), base = fbm(s, 5), crista = fbm(mist(s, 3), 4), dobra = fbm(mist(s, 5), 3), fino = fbm(mist(s, 9), 3);
    const e = 1 / 760;
    return (gx, gy) => {
      const x = gx * e + (dobra(gx * e * 0.6, gy * e * 0.6) - 0.5) * 1.1, y = gy * e + (dobra(gy * e * 0.6 + 7, gx * e * 0.6 + 3) - 0.5) * 1.1;
      const b = base(x, y), r = 1 - Math.abs(2 * crista(x * 1.25 + 5, y * 1.25 + 2) - 1);
      const v = b * (1 - montanhoso) + r * r * montanhoso;
      return cl((v - 0.26) / 0.52, 0, 1) ** 1.35 + (fino(gx * e * 5, gy * e * 5) - 0.5) * 0.045;
    };
  }
  // Prepara o campo da zona (antes de quem põe coisas no chão): a altura "bruta", sem os ajustes do lugar
  function iniciar(z, R) {
    A = null;
    if (!z || !R || typeof worldZoneAt !== 'function') return null;
    const f0 = forcaZona(Object.assign({ aberto: R.aberto }, z, { theme: (R.def && R.def.theme) || z.theme }));
    if (!f0) return null;
    const tema = (R.def && R.def.theme) || z.theme, forma = formaDe(z.region, tema === 'neve' || tema === 'vulcao' ? 0.6 : tema === 'deserto' ? 0.35 : 0.22);
    // força interpolada entre os centros das zonas vizinhas (contínua na passagem de uma para a outra)
    const fz = (r, c) => { const v = worldZoneAt(r, c, z.region); return v ? forcaZona(Object.assign({ aberto: true }, v)) || 0 : f0; };
    const F = {}; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) F[`${dr},${dc}`] = dr || dc ? fz(z.r + dr, z.c + dc) : f0;
    const forca = (u, v) => {   // u, v: posição na zona em frações (0 a 1; fora disso, já na vizinha)
      const a = u - 0.5, b = v - 0.5, i = a < 0 ? -1 : 0, j = b < 0 ? -1 : 0, tx = suave(a - i), ty = suave(b - j);
      const g = (di, dj) => F[`${cl(j + dj, -1, 1)},${cl(i + di, -1, 1)}`];
      return (g(0, 0) * (1 - tx) + g(1, 0) * tx) * (1 - ty) + (g(0, 1) * (1 - tx) + g(1, 1) * tx) * ty;
    };
    const bruta = (x, y) => { const u = x / R.w, v = y / R.h; return forca(cl(u, -0.5, 1.5), cl(v, -0.5, 1.5)) * forma((z.c + u) * LADO, (z.r + v) * LADO); };
    A = { sala: R, z, tema, amp: f0, forma, forca, bruta, grade: null };
    return A;
  }
  // Monta a grade da zona com os ajustes do lugar (depois que tudo foi posto): água, patamares
  function preparar() {
    if (!A) return null;
    const R = A.sala, g = typeof game !== 'undefined' ? game : null, M = (R.margem || 0) + 420;
    const x0 = -M, y0 = -M, nx = Math.ceil((R.w + 2 * M) / CEL) + 1, ny = Math.ceil((R.h + 2 * M) / CEL) + 1, G = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) G[j * nx + i] = A.bruta(x0 + i * CEL, y0 + j * CEL);
    // água: o terreno desce até a margem (o rio e o lago ficam no baixo)
    const agua = typeof Agua !== 'undefined' && Agua.profundidade ? (x, y) => (x > 0 && y > 0 && x < R.w && y < R.h ? Agua.profundidade(x, y) : 0) : null;
    if (agua) {
      const D = new Float32Array(nx * ny).fill(99); let tem = false;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (agua(x0 + i * CEL, y0 + j * CEL) > 0) { D[j * nx + i] = 0; tem = true; }
      if (tem) {
        for (let k = 0; k < 2; k++) {
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = j * nx + i; if (i) D[q] = Math.min(D[q], D[q - 1] + 1); if (j) D[q] = Math.min(D[q], D[q - nx] + 1); if (i && j) D[q] = Math.min(D[q], D[q - nx - 1] + 1.414); }
          for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const q = j * nx + i; if (i < nx - 1) D[q] = Math.min(D[q], D[q + 1] + 1); if (j < ny - 1) D[q] = Math.min(D[q], D[q + nx] + 1); if (i < nx - 1 && j < ny - 1) D[q] = Math.min(D[q], D[q + nx + 1] + 1.414); }
        }
        for (let q = 0; q < G.length; q++) G[q] *= passo(1, 9, D[q]);   // margem em 0; a ~290 unidades da água, o relevo inteiro
        A.agua = true;
      }
    }
    // patamares: construções, passagens, baús, portais e o ponto de chegada ficam em chão firme
    const pat = [{ x: R.w / 2, y: R.h / 2, r: 70 }];
    if (typeof Estruturas !== 'undefined' && Estruturas.atual) { const E = Estruturas.atual(); if (E && E.room === R) for (const L of E.lug) { const I = Estruturas.IDX[L.id]; if (I && I.tipo !== 'arvore' && I.tipo !== 'planta') pat.push({ x: L.x, y: L.y, r: I.r * L.esc + 14 }); } }
    if (g) for (const n of g.npcs) if (n.kind === 'gate' || n.kind === 'portal' || n.kind === 'chest' || n.kind === 'terminal' || n.kind === 'entrada' || n.kind === 'quadro' || n.kind === 'monumento' || n.kind === 'estacao' || n.kind === 'banca') pat.push({ x: n.x, y: n.y, r: (n.radius || 20) + 26 });
    const amostra = (x, y) => { const fx = cl((x - x0) / CEL, 0, nx - 1.001), fy = cl((y - y0) / CEL, 0, ny - 1.001), i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, q = j * nx + i; return (G[q] * (1 - tx) + G[q + 1] * tx) * (1 - ty) + (G[q + nx] * (1 - tx) + G[q + nx + 1] * tx) * ty; };
    for (const P of pat) {
      const hc = amostra(P.x, P.y), R2 = P.r + 150;
      const i0 = Math.max(0, Math.floor((P.x - R2 - x0) / CEL)), i1 = Math.min(nx - 1, Math.ceil((P.x + R2 - x0) / CEL)), j0 = Math.max(0, Math.floor((P.y - R2 - y0) / CEL)), j1 = Math.min(ny - 1, Math.ceil((P.y + R2 - y0) / CEL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot(x0 + i * CEL - P.x, y0 + j * CEL - P.y), k = 1 - passo(P.r, R2, d); if (k > 0) { const q = j * nx + i; G[q] = G[q] * (1 - k) + hc * k; } }
    }
    A.grade = G; A.nx = nx; A.ny = ny; A.x0 = x0; A.y0 = y0; A.patamares = pat.length;
    return A;
  }
  const ativo = (R) => !!A && !!A.grade && (!R || A.sala === R);
  // Altura do chão no ponto (0 fora das zonas com relevo)
  function altura(x, y) {
    if (!A || !A.grade) return 0;
    const fx = cl((x - A.x0) / CEL, 0, A.nx - 1.001), fy = cl((y - A.y0) / CEL, 0, A.ny - 1.001), i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, q = j * A.nx + i, G = A.grade;
    return (G[q] * (1 - tx) + G[q + 1] * tx) * (1 - ty) + (G[q + A.nx] * (1 - tx) + G[q + A.nx + 1] * tx) * ty;
  }
  // Declive: [dh/dx, dh/dy]
  function declive(x, y, o = [0, 0]) { if (!A || !A.grade) { o[0] = 0; o[1] = 0; return o; } const d = CEL * 0.75; o[0] = (altura(x + d, y) - altura(x - d, y)) / (2 * d); o[1] = (altura(x, y + d) - altura(x, y - d)) / (2 * d); return o; }
  const DV = [0, 0];
  const inclinacao = (x, y) => { declive(x, y, DV); return Math.hypot(DV[0], DV[1]); };
  function normal(x, y, o = [0, 0, 1]) { declive(x, y, DV); const l = Math.hypot(DV[0], DV[1], 1); o[0] = -DV[0] / l; o[1] = -DV[1] / l; o[2] = 1 / l; return o; }
  // Subida na direção do passo (positivo: ladeira acima) e o ritmo do passo nela
  function subida(x, y, dx, dy) { declive(x, y, DV); const l = Math.hypot(dx, dy) || 1; return (DV[0] * dx + DV[1] * dy) / l; }
  function ritmo(e, dx, dy) { if (!A || !A.grade || (!dx && !dy)) return 1; const s = subida(e.x, e.y, dx, dy); return s > 0 ? 1 - Math.min(0.45, s * 0.75) : 1 + Math.min(0.08, -s * 0.15); }
  // Altitude normalizada (0 a 1) para as regras de bioma e espécie (js/mundo/paisagem.js)
  const alt01 = (x, y) => (A && A.amp ? cl(A.bruta(x, y) / A.amp, 0, 1) : 0);
  // Malha do chão com o relevo (G3 no formato do motor: posição, normal, UV, emissão), UV do atlas plano
  function malha(g, m, L, emi = 0) {
    const N = cl(Math.ceil(L / 44), 6, 120), P = L / N, n = [0, 0, 1];
    const v = (x, y) => { normal(x, y, n); return [x, y, altura(x, y), n[0], n[1], n[2], (x + m) / L, (y + m) / L, 0, emi]; };
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const xa = -m + P * i, ya = -m + P * j, xb = xa + P, yb = ya + P;
      const a = v(xa, ya), b = v(xb, ya), c = v(xb, yb), d = v(xa, yb);
      for (const q of [a, b, c, a, c, d]) g.d.push(...q);
    }
    return N;
  }
  const estado = () => (A ? { zona: A.z.id, tema: A.tema, amp: A.amp, grade: !!A.grade, nx: A.nx, ny: A.ny, agua: !!A.agua, patamares: A.patamares } : null);
  const bruta = (x, y) => (A ? A.bruta(x, y) : 0);
  return { CEL, LADO, AMP, bruta, iniciar, preparar, ativo, altura, declive, inclinacao, normal, subida, ritmo, alt01, malha, forcaZona, estado, descartar() { A = null; } };
})();
if (typeof window !== 'undefined') window.Relevo = Relevo;
