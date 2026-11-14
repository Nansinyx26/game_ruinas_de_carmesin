'use strict';
// ECLIPSE ZERO · Vegetação rasteira: grama 3D, flores e juncos (Vegetacao)
// ---------------------------------------------------------------------------
// Cobre o chão das zonas naturais com lâminas de grama de verdade (malha 3D: cada lâmina é uma fita
// curva e afinada, com 3 segmentos, que dobra a partir da base), flores do campo (tremoço roxo,
// margarida, papoula, botão-de-ouro) e juncos na beira d'água. As árvores, arbustos, plantas,
// rochas e ruínas continuam sendo os GLB do projeto (js/mundo/paisagem.js); aqui fica só o que um
// GLB não faria: dezenas de milhares de lâminas.
//  · ONDE: zonas naturais (floresta, lagoa: campo cheio; deserto: tufos secos nos oásis e platôs;
//    cidade abandonada: mato entre as ruínas). A densidade sai dos campos da paisagem (umidade,
//    altitude, inclinação, sub-bioma) e de manchas de ruído: prado fechado, clareira, trilha baixa.
//  · NUNCA: na água (na margem, juncos), em cima de construções e colisores, nas trilhas (lá a
//    grama fica baixa e rala), nas passagens, baús, portais, terminais, entradas e pontos de missão,
//    nem nas cidades, interiores e masmorras.
//  · SETORES de 384 unidades, gerados aos poucos (alguns por quadro, sem travar) com a semente da
//    zona: entrar de novo dá a mesma grama. Longe, cada setor desenha só uma fração das lâminas (a
//    ordem é sorteada: o começo da lista é uma amostra uniforme) — sem "estalo" na troca de LOD.
//  · VENTO e INTERAÇÃO no shader: a ponta balança com o vento global (Fogo.VENTO), em ondas que
//    atravessam o campo; o herói abre a grama em volta ao andar, mais ao correr e num raio maior
//    nos golpes; a lâmina volta devagar.
//  · DESENHO: no renderizador realista (Three.js), InstancedMesh por setor (instanciamento na placa
//    de vídeo, material PBR com translucidez nas costas da lâmina); no clássico, um buffer estático
//    por setor desenhado de uma vez.
//  · QUALIDADE: Baixa, Média, Alta, Ultra e Cinematográfica (densidade e distância).
// ---------------------------------------------------------------------------
const Vegetacao = (() => {
  const SETOR = 384;
  const NIVEIS = [
    { nome: 'Baixa', dens: 0.22, raio: 650, flores: 0.4 },
    { nome: 'Média', dens: 0.45, raio: 900, flores: 0.7 },
    { nome: 'Alta', dens: 0.8, raio: 1250, flores: 1 },
    { nome: 'Ultra', dens: 1.25, raio: 1650, flores: 1.2 },
    { nome: 'Cinematográfica', dens: 1.8, raio: 2200, flores: 1.4 },
  ];
  // por tema: TUFOS por 1000 u² no prado cheio (cada tufo tem de 4 a 9 lâminas), altura (u), largura, paleta (base → ponta) e flores
  const TEMAS = {
    floresta: { dens: 5.2, alt: [9, 22], larg: [0.95, 1.65], cor: [[0.12, 0.24, 0.07], [0.42, 0.62, 0.2]], seca: [[0.3, 0.27, 0.1], [0.72, 0.62, 0.3]], flores: 1, juncos: 0.7 },
    lagoa: { dens: 5.4, alt: [10, 25], larg: [0.95, 1.7], cor: [[0.08, 0.22, 0.08], [0.36, 0.6, 0.24]], seca: [[0.22, 0.26, 0.1], [0.55, 0.58, 0.28]], flores: 0.8, juncos: 1 },
    deserto: { dens: 0.5, alt: [6, 14], larg: [0.6, 1.1], cor: [[0.32, 0.28, 0.12], [0.78, 0.68, 0.36]], seca: [[0.34, 0.28, 0.12], [0.82, 0.7, 0.38]], flores: 0.1, so: ['oasis', 'planalto', 'beira'] },
    abandonada: { dens: 0.9, alt: [7, 18], larg: [0.85, 1.45], cor: [[0.14, 0.2, 0.08], [0.46, 0.5, 0.2]], seca: [[0.3, 0.26, 0.12], [0.64, 0.56, 0.3]], flores: 0.15 },
  };
  // flores: cor da cabeça, forma, altura (u), preferência de umidade
  const FLORES = [
    { id: 'tremoco', cor: [0.56, 0.42, 0.86], forma: 'espiga', alt: [24, 40], umid: [0.45, 0.8] },
    { id: 'margarida', cor: [0.96, 0.95, 0.9], miolo: [0.98, 0.78, 0.2], forma: 'disco', alt: [12, 22], umid: [0.35, 0.75] },
    { id: 'papoula', cor: [0.86, 0.12, 0.08], miolo: [0.15, 0.08, 0.06], forma: 'disco', alt: [16, 28], umid: [0.3, 0.6] },
    { id: 'ouro', cor: [1, 0.82, 0.18], forma: 'disco', alt: [10, 18], umid: [0.4, 0.85] },
  ];
  const mist = (a, b) => { let h = (a ^ 0x9e3779b9) >>> 0; h = Math.imul(h ^ (b >>> 0), 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
  const sorteio = (s) => { let a = s >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v), mixf = (a, b, t) => a + (b - a) * t, suave = (a, b, v) => { const t = cl((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function ruido(sem) {
    const h = (x, y) => mist(mist(sem, x | 0), y | 0) / 4294967296, s = (t) => t * t * (3 - 2 * t);
    return (x, y) => { const x0 = Math.floor(x), y0 = Math.floor(y), fx = s(x - x0), fy = s(y - y0), a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  }

  // ------------------------------------------------------------ estado da zona
  let Z = null;   // { id, sala, tema, T, setores: Map, fila: [], amostras }
  const nivel = () => { const v = typeof Settings !== 'undefined' && Settings.v ? Settings.v.vegQ : 2; return NIVEIS[v] ? v : 2; };
  const N = () => NIVEIS[nivel()];
  function temaDe(z, R) {
    const t = (R.def && R.def.theme) || z.theme;
    return TEMAS[t] ? t : null;
  }
  // Exclusões fixas da zona: construções e colisores, passagens e pontos de interação, trilhas
  function exclusoes(R) {
    const g = typeof game !== 'undefined' ? game : null, E = [];
    for (const p of R.pillars || []) if (!p.deco) E.push({ x: p.x, y: p.y, r: (p.r || 20) + 6, t: !p.estrutura && !p.cenario });   // (t: os obstáculos que a zona sorteia a cada visita)
    if (typeof Estruturas !== 'undefined' && Estruturas.atual) {
      const A = Estruturas.atual();
      if (A && A.room === R) for (const L of A.lug) { const I = Estruturas.IDX[L.id]; if (I && I.tipo !== 'planta') E.push({ x: L.x, y: L.y, r: I.r * L.esc * (I.tipo === 'arvore' ? 0.5 : 1) + 10 }); }
    }
    if (g) for (const n of g.npcs) {
      if (n.kind === 'gate' || n.kind === 'portal' || n.kind === 'chest' || n.kind === 'terminal' || n.kind === 'entrada' || n.kind === 'tesouro' || n.kind === 'quadro' || n.kind === 'evento' || n.kind === 'campanha' || n.kind === 'missao' || n.kind === 'coleta')
        E.push({ x: n.x, y: n.y, r: (n.radius || 20) + 34, t: n.kind === 'chest' || n.kind === 'evento' || n.kind === 'coleta' });   // (t: muda de lugar a cada visita)
      else if (n.P) E.push({ x: n.x, y: n.y, r: 26, t: true });   // (moradores: a grama não cobre os pés)
    }
    return E;
  }
  // Prepara a zona (World.loadZone, depois das estruturas e do relevo): os setores ficam na fila
  function aoCarregar(z) {
    descartar();
    if (typeof game === 'undefined' || !game.room || !z) return null;
    const R = game.room;
    if (!R.aberto || z.instancia || z.cidade || z.distrito || R.interior) return null;
    const tema = temaDe(z, R);
    if (!tema) return null;
    const sem = typeof Paisagem !== 'undefined' ? mist(Paisagem.sementeDe(z.id), 0x71a55) : mist(7411, z.id.length);
    const P = typeof Paisagem !== 'undefined' && Paisagem._cache ? Paisagem._cache[z.id] : null;
    Z = { id: z.id, sala: R, tema, T: TEMAS[tema], sem, setores: new Map(), fila: [], campos: P && P.campos, rotas: P ? P.rotas.filter((r) => r.ok) : [],
      exc: exclusoes(R), manchas: ruido(mist(sem, 1)), seca: ruido(mist(sem, 2)), floresR: ruido(mist(sem, 3)), floresT: ruido(mist(sem, 4)) };
    const M = (R.margem || 0) * 0.6, nx = Math.ceil((R.w + 2 * M) / SETOR), ny = Math.ceil((R.h + 2 * M) / SETOR);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) Z.fila.push({ i, j, x0: -M + i * SETOR, y0: -M + j * SETOR });
    // os setores perto do herói primeiro
    const p = game.player;
    Z.fila.sort((a, b) => Math.hypot(a.x0 + SETOR / 2 - p.x, a.y0 + SETOR / 2 - p.y) - Math.hypot(b.x0 + SETOR / 2 - p.x, b.y0 + SETOR / 2 - p.y));
    return Z;
  }
  function descartar() {
    if (Z) for (const S of Z.setores.values()) liberar(S);
    Z = null;
  }
  const ativo = (R) => !!Z && (!R || Z.sala === R);
  // Distância de um ponto à trilha mais próxima (das trilhas da paisagem)
  function distTrilha(x, y) {
    let d = 1e9;
    for (const r of Z.rotas) for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1], b = r.pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = cl(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1);
      d = Math.min(d, Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t));
    }
    return d;
  }
  // ------------------------------------------------------------ geração de um setor
  // Saída: lâminas [x, y, z, giro, altura, largura, curva, r, g, b, tipo] (tipo 0 grama, 1 junco,
  // 2+ flor), em ordem sorteada (o prefixo é uma amostra uniforme: o LOD desenha só o começo)
  function gerarSetor(S) {
    const R = Z.sala, T = Z.T, C = Z.campos, rnd = sorteio(mist(Z.sem, mist(S.i, S.j))), alt = typeof Relevo !== 'undefined' && Relevo.ativo(R) ? Relevo.altura : () => 0;
    const agua = typeof Agua !== 'undefined' && Agua.profundidade ? (x, y) => (x > 0 && y > 0 && x < R.w && y < R.h ? Agua.profundidade(x, y) : 0) : () => 0;
    const exc = Z.exc.filter((e) => e.x + e.r > S.x0 && e.x - e.r < S.x0 + SETOR && e.y + e.r > S.y0 && e.y - e.r < S.y0 + SETOR);
    const trilhaPerto = Z.rotas.length && distTrilha(S.x0 + SETOR / 2, S.y0 + SETOR / 2) < SETOR;
    const L = [], rej = S.rej = { agua: 0, exc: 0, bioma: 0, dens: 0, fora: 0 };
    const max = Math.round(SETOR * SETOR / 1000 * T.dens * NIVEIS[4].dens);   // tufos (o teto: a qualidade máxima; os níveis desenham um prefixo)
    let tufos = 0;
    for (let k = 0; k < max * 2.2 && tufos < max; k++) {
      const x = S.x0 + rnd() * SETOR, y = S.y0 + rnd() * SETOR, a = rnd(), b = rnd(), c = rnd(), d = rnd(), e = rnd();
      if (x < -60 || y < -60 || x > R.w + 60 || y > R.h + 60) { rej.fora++; continue; }
      const fundo = agua(x, y);
      let tipo = 0;
      if (fundo > 0) { if (!T.juncos || fundo > 0.3 || a > 0.5 * T.juncos) { rej.agua++; continue; } tipo = 1; }   // margem rasa: juncos
      let fora = false;
      for (const q of exc) if ((x - q.x) * (x - q.x) + (y - q.y) * (y - q.y) < q.r * q.r) { fora = true; break; }
      if (fora) { rej.exc++; continue; }
      // densidade: manchas de prado, campos da paisagem (umidade, inclinação, sub-bioma) e a trilha
      const u = C ? C.umid(x, y) : 0.55, inc = C ? C.incl(x, y) : 0, bio = C ? C.bioma(x, y) : 'campo';
      if (T.so && tipo === 0 && !T.so.includes(bio)) { rej.bioma++; continue; }
      const mancha = Z.manchas(x / 260, y / 260);
      let dens = suave(0.2, 0.6, mancha) * 0.7 + 0.3;
      dens *= tipo ? 1 : cl(0.5 + u * 0.8, 0.3, 1) * (1 - cl(inc * 1.1, 0, 0.8));
      if (bio === 'pedregal' || bio === 'escoria') dens *= 0.25;
      if (bio === 'mata') dens *= 0.55;   // (sob as copas: menos grama)
      const tr = trilhaPerto ? distTrilha(x, y) : 1e9, naTrilha = tr < 34;
      if (naTrilha) dens *= 0.22;
      if (a > dens) { rej.dens++; continue; }
      tufos++;
      // forma e cor
      const seco = cl(Z.seca(x / 340, y / 340) * 1.2 - 0.62 + (1 - u) * 0.45, 0, 1) * (Z.tema === 'deserto' ? 1 : 0.8) + (Z.tema === 'deserto' ? 0.5 : 0);   // (manchas secas no meio do verde; o deserto, quase todo seco)
      let h = mixf(T.alt[0], T.alt[1], b) * (0.75 + mancha * 0.5) * (naTrilha ? 0.45 : 1);
      if (tipo === 1) h *= 1.9;
      const base = T.cor[0], ponta = T.cor[1], sb = T.seca[0], sp = T.seca[1], v = 0.86 + c * 0.28;
      const cr = mixf(mixf(ponta[0], sp[0], seco), mixf(base[0], sb[0], seco), 0.25) * v, cg = mixf(mixf(ponta[1], sp[1], seco), mixf(base[1], sb[1], seco), 0.25) * v, cb = mixf(mixf(ponta[2], sp[2], seco), mixf(base[2], sb[2], seco), 0.25) * v;
      // flor no lugar da lâmina (manchas de flores, pela umidade e pela espécie)
      if (tipo === 0 && T.flores && !naTrilha && Z.floresR(x / 150, y / 150) > 0.6 && e < 0.32 * T.flores) {
        const qual = Math.floor(Z.floresT(x / 420, y / 420) * FLORES.length * 0.999), F = FLORES[qual];
        if (u >= F.umid[0] - 0.1 && u <= F.umid[1] + 0.1) { tipo = 2 + qual; h = mixf(F.alt[0], F.alt[1], b); }
      }
      // o tufo: várias lâminas em volta do ponto, abertas para fora, com alturas e tons diferentes
      // (cada tufo com o próprio sorteio: um tufo recusado por um baú ou um morador não muda os outros)
      const rt = sorteio(mist(mist(Z.sem, mist(S.i, S.j)), k + 1));
      const nl = tipo >= 2 ? 1 : tipo === 1 ? 3 + Math.floor(rt() * 3) : 4 + Math.floor(rt() * 6), raioT = tipo === 1 ? 5 : 2.5 + mancha * 4;
      for (let l = 0; l < nl; l++) {
        const ang = rt() * Math.PI * 2, rr = l === 0 ? 0 : Math.sqrt(rt()) * raioT, bx = x + Math.cos(ang) * rr, by = y + Math.sin(ang) * rr, tom = 0.88 + rt() * 0.24;
        { const f = agua(bx, by); if ((f > 0 && tipo !== 1) || f > 0.3) continue; }   // (o tufo não entra na água; os juncos, só no raso)
        L.push(bx, by, alt(bx, by) - 0.4, l === 0 ? d * Math.PI * 2 : ang + Math.PI / 2 + (rt() - 0.5) * 0.8, h * (l === 0 ? 1 : 0.6 + rt() * 0.5), mixf(T.larg[0], T.larg[1], c) * (tipo === 1 ? 1.3 : 1),
          l === 0 ? (e - 0.5) * 0.9 + 0.25 : 0.35 + rt() * 0.5, cr * tom, cg * tom, cb * tom, tipo);
      }
    }
    S.dados = new Float32Array(L); S.n = L.length / 11;
    return S;
  }
  // ------------------------------------------------------------ malha (motor clássico)
  // Cada lâmina: 3 segmentos, afinando até a ponta, DOBRADA na nervura do meio (corte em "V", como a
  // folha de capim de verdade): cada segmento são duas metades (4 triângulos), cada metade com a sua
  // normal virada para o seu lado — um lado pega a luz e o outro fica na sombra, e a lâmina tem volume
  // (antes era uma fita chata, com a mesma luz dos dois lados: parecia papel). A normal carrega no
  // comprimento o quanto o vértice está alto na lâmina (1 = base, 2 = ponta): o shader dobra só a parte
  // de cima. Base escura (oclusão do campo), ponta mais clara e um pouco amarelada.
  const SEG = 3, VPL = SEG * 12, DOBRA = 0.55;
  function malhaClassica(S) {
    const D = S.dados, n = S.n, out = new Float32Array(n * VPL * 10);
    let o = 0;
    const put = (x, y, z, nx, ny, nz, w, r, g, b) => { const l = Math.hypot(nx, ny, nz) || 1, k = (1 + w) / l; out[o++] = x; out[o++] = y; out[o++] = z; out[o++] = nx * k; out[o++] = ny * k; out[o++] = nz * k; out[o++] = r; out[o++] = g; out[o++] = b; out[o++] = 0; };
    for (let q = 0; q < n; q++) {
      const i = q * 11, x = D[i], y = D[i + 1], z = D[i + 2], gi = D[i + 3], h = D[i + 4], w = D[i + 5], cv = D[i + 6], tipo = D[i + 10];
      const cs = Math.cos(gi), sn = Math.sin(gi), fx = -sn * cv, fy = cs * cv;   // direção da curva (para o lado da face)
      const nxF = -sn * 0.28, nyF = cs * 0.28;   // (normal quase para cima: luz macia de campo)
      let r = D[i + 7], g = D[i + 8], b = D[i + 9];
      if (tipo >= 2) { const F = FLORES[tipo - 2]; r = 0.2; g = 0.42; b = 0.14; void F; }   // (haste verde; a cabeça vai à parte)
      // a face da lâmina olha para (-sn, cs); a nervura do meio fica para trás (as bordas vêm para a frente)
      const ux = -sn, uy = cs;
      for (let s = 0; s < SEG; s++) {
        const t0 = s / SEG, t1 = (s + 1) / SEG, w0 = w * (1 - t0 * 0.92), w1 = w * (1 - t1 * 0.92);
        const z0 = z + h * t0, z1 = z + h * t1, c0 = t0 * t0, c1 = t1 * t1;
        const ax = x + fx * h * c0 * 0.55, ay = y + fy * h * c0 * 0.55, bx = x + fx * h * c1 * 0.55, by = y + fy * h * c1 * 0.55;
        const k0 = 0.35 + 0.65 * t0, k1 = 0.35 + 0.65 * t1;   // escurece na base (oclusão do campo)
        const d0 = w0 * DOBRA, d1 = w1 * DOBRA;   // a dobra (a nervura recua)
        const L0 = [ax - cs * w0, ay - sn * w0], R0 = [ax + cs * w0, ay + sn * w0], M0 = [ax - ux * d0, ay - uy * d0];
        const L1 = [bx - cs * w1, by - sn * w1], R1 = [bx + cs * w1, by + sn * w1], M1 = [bx - ux * d1, by - uy * d1];
        // cores: ponta mais clara e quente
        const cor = (t, k) => { const q = 1 + 0.18 * t * t; return [r * k * q + 0.05 * t * t, g * k * q + 0.03 * t * t, b * k]; };
        const C0 = cor(t0, k0), C1 = cor(t1, k1);
        // metade esquerda: normal para a esquerda e para a frente; direita: para a direita e para a frente
        const nL = [-cs * 0.75 + ux * 0.55, -sn * 0.75 + uy * 0.55, 0.55], nR = [cs * 0.75 + ux * 0.55, sn * 0.75 + uy * 0.55, 0.55];
        const P = (q, zz, t, C, n) => put(q[0], q[1], zz, n[0], n[1], n[2], t, C[0], C[1], C[2]);
        P(L0, z0, t0, C0, nL); P(M0, z0, t0, C0, nL); P(M1, z1, t1, C1, nL); P(L0, z0, t0, C0, nL); P(M1, z1, t1, C1, nL); P(L1, z1, t1, C1, nL);
        P(M0, z0, t0, C0, nR); P(R0, z0, t0, C0, nR); P(R1, z1, t1, C1, nR); P(M0, z0, t0, C0, nR); P(R1, z1, t1, C1, nR); P(M1, z1, t1, C1, nR);
      }
      void nxF; void nyF;
    }
    // cabeças das flores (cruz de dois discos de pétalas; espiga: três andares) — à parte, contadas no fim
    const extra = [];
    for (let q = 0; q < n; q++) {
      const i = q * 11, tipo = D[i + 10];
      if (tipo < 2) continue;
      const F = FLORES[tipo - 2], x = D[i], y = D[i + 1], z = D[i + 2] + D[i + 4], R0 = F.forma === 'espiga' ? 1.7 : 1.9;
      const andares = F.forma === 'espiga' ? [[0, 1], [-4, 0.85], [-8, 0.7], [-12, 0.55]] : [[0, 1]];
      for (const [dz, k] of andares) {
        for (let p = 0; p < 6; p++) {
          const a0 = p / 6 * Math.PI * 2 + D[i + 3], a1 = a0 + Math.PI / 3, rr = R0 * k;
          extra.push(x, y, z + dz - 0.4, F.miolo || F.cor, x + Math.cos(a0) * rr, y + Math.sin(a0) * rr, z + dz + rr * 0.75, F.cor, x + Math.cos(a1) * rr, y + Math.sin(a1) * rr, z + dz + rr * 0.75, F.cor);   // (cálice: pétalas abertas para cima)
        }
      }
    }
    const nf = extra.length / 12, outF = new Float32Array(out.length + nf * 3 * 10);
    outF.set(out); o = out.length;
    for (let f = 0; f < nf; f++) for (let v = 0; v < 3; v++) { const e = f * 12 + v * 4, c = extra[e + 3]; outF[o++] = extra[e]; outF[o++] = extra[e + 1]; outF[o++] = extra[e + 2]; outF[o++] = 0; outF[o++] = 0; outF[o++] = 2.6; outF[o++] = c[0]; outF[o++] = c[1]; outF[o++] = c[2]; outF[o++] = 0; }
    S.vClassico = outF; S.nGrama = n * VPL; S.nFlor = nf * 3;
    return outF;
  }
  function liberar(S) {
    if (S.vbo && typeof R3D !== 'undefined' && R3D.gl) { R3D.gl.deleteBuffer(S.vbo); S.vbo = null; }
    if (S.three) { for (const m of S.three) { if (m.parent) m.parent.remove(m); m.dispose && m.dispose(); } S.three = null; }
    S.vClassico = null;
  }
  // ------------------------------------------------------------ a cada quadro
  // Gera alguns setores por quadro (os mais perto primeiro) e devolve os setores visíveis com o LOD
  const VIS = [];
  function visiveis(olho, alvo, orcamentoMs = 3) {
    VIS.length = 0;
    if (!Z) return VIS;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    while (Z.fila.length && (typeof performance === 'undefined' || performance.now() - t0 < orcamentoMs)) {
      const S = Z.fila.shift(); gerarSetor(S); Z.setores.set(`${S.i},${S.j}`, S);
    }
    const Nv = N(), raio = Nv.raio, fx = alvo[0] - olho[0], fy = alvo[1] - olho[1], fl = Math.hypot(fx, fy) || 1;
    for (const S of Z.setores.values()) {
      const cx = S.x0 + SETOR / 2, cy = S.y0 + SETOR / 2, d = Math.hypot(cx - alvo[0], cy - alvo[1]);
      if (d > raio + SETOR * 0.7) { if (d > raio * 1.6 + SETOR) liberar(S); continue; }
      // atrás da câmera (com folga de um setor): não desenha
      if (((cx - olho[0]) * fx + (cy - olho[1]) * fy) / fl < -SETOR) continue;
      const lod = d < raio * 0.35 ? 1 : d < raio * 0.65 ? 0.5 : 0.22;
      S.lod = lod; S.qtd = Math.max(0, Math.floor(S.n * lod * Nv.dens / NIVEIS[4].dens));
      if (S.qtd > 0) VIS.push(S);
    }
    return VIS;
  }
  // Empurrão do herói: [x, y, raio, força] (andar, correr e golpes abrem a grama)
  const EMP = [0, 0, 0, 0];
  function empurrao() {
    const p = typeof game !== 'undefined' ? game.player : null;
    if (!p) { EMP[2] = 0; return EMP; }
    const v = Math.hypot(p.vx || 0, p.vy || 0), golpe = p.state === 'attack' || p.state === 'special' || p.state === 'charge';
    const alvoR = golpe ? 70 : v > 150 ? 46 : v > 20 ? 34 : 26, alvoF = golpe ? 1.25 : v > 150 ? 1 : v > 20 ? 0.8 : 0.55;
    EMP[0] = p.x; EMP[1] = p.y; EMP[2] = EMP[2] + (alvoR - EMP[2]) * 0.25; EMP[3] = EMP[3] + (alvoF - EMP[3]) * 0.12;   // (volta devagar)
    return EMP;
  }
  // ------------------------------------------------------------ motor clássico (js/engine3d.js)
  // Chamado no fim da passada de cor da 3ª pessoa: desenha os setores visíveis direto de buffers
  // estáticos (não passam pelo buffer de cada quadro)
  const O_CLASSICO = { flash: 0, emi: 1, holo: false, ghost: null, tint: null, vento: -1, m: null, rim: '#2a3d14' };
  function desenharClassico(R3, gl, L, view) {
    if (!Z || typeof ThirdView === 'undefined') return 0;
    const V = visiveis(view.eye, ThirdView.tgt);
    if (!V.length) return 0;
    const ven = typeof Fogo !== 'undefined' && Fogo.VENTO ? Fogo.VENTO : { k: 0.4, x: 1, y: 0 };
    O_CLASSICO.vento = -(0.6 + (ven.k || 0) * 0.9);
    R3.itemUniforms(L, { model: { tex: null }, o: O_CLASSICO });
    const E = empurrao();
    if (L.uEmpurra) gl.uniform4f(L.uEmpurra, E[0], E[1], E[2], E[3]);
    let total = 0;
    for (const S of V) {
      if (!S.vbo) { const d = malhaClassica(S); S.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW); S.vClassico = null; }
      gl.bindBuffer(gl.ARRAY_BUFFER, S.vbo);
      gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 40, 0);
      gl.vertexAttribPointer(L.aNor, 3, gl.FLOAT, false, 40, 12);
      gl.vertexAttribPointer(L.aCol, 4, gl.FLOAT, false, 40, 24);
      const nv = S.qtd * VPL;
      gl.drawArrays(gl.TRIANGLES, 0, nv);
      // flores: as cabeças das lâminas que viraram flor, proporcionais ao LOD
      const nf = Math.floor(S.nFlor * S.lod * N().flores / 3) * 3;
      if (nf > 0) gl.drawArrays(gl.TRIANGLES, S.nGrama, nf);
      total += nv + nf;
    }
    if (L.uEmpurra) gl.uniform4f(L.uEmpurra, 0, 0, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, R3.buf);
    gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.vertexAttribPointer(L.aNor, 3, gl.FLOAT, false, 40, 12);
    gl.vertexAttribPointer(L.aCol, 4, gl.FLOAT, false, 40, 24);
    return total;
  }
  // ------------------------------------------------------------ renderizador realista (Three.js)
  // Uma lâmina-modelo (3 segmentos) instanciada; cor, posição, giro, altura e largura por instância;
  // o shader dobra a ponta com o vento e com o herói; as costas da lâmina deixam passar luz
  let RT = null;
  function realista(R, THREE, raiz) {
    if (!Z) { if (RT && RT.grupo.parent) RT.grupo.parent.remove(RT.grupo); return; }
    if (!RT) {
      // a lâmina-modelo dobrada na nervura (as duas metades com normais para os lados: ver malhaClassica)
      const geo = new THREE.BufferGeometry(), pos = [], hgt = [];
      for (let s = 0; s < SEG; s++) {
        const t0 = s / SEG, t1 = (s + 1) / SEG, w0 = 1 - t0 * 0.92, w1 = 1 - t1 * 0.92;
        const L0 = [-w0, 0, t0], M0 = [0, -w0 * DOBRA, t0], R0 = [w0, 0, t0], L1 = [-w1, 0, t1], M1 = [0, -w1 * DOBRA, t1], R1 = [w1, 0, t1];
        for (const v of [L0, M0, M1, L0, M1, L1, M0, R0, R1, M0, R1, M1]) { pos.push(v[0], v[1], v[2]); hgt.push(v[2]); }
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('aAlt', new THREE.Float32BufferAttribute(hgt, 1));
      geo.computeVertexNormals();
      const U = { uTempo: { value: 0 }, uVento: { value: new THREE.Vector3(1, 0, 0.5) }, uEmp: { value: new THREE.Vector4() } };
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0, side: THREE.DoubleSide });
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = 'attribute float aAlt; attribute vec4 aLam; uniform float uTempo; uniform vec3 uVento; uniform vec4 uEmp; varying float vAlt;\n' + sh.vertexShader
          .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(normal * vec3(1.0, 1.0, 0.6) + vec3(0.0, 0.0, 0.45)); float cgn = cos(aLam.w), sgn = sin(aLam.w); objectNormal.xy = vec2(objectNormal.x * cgn - objectNormal.y * sgn, objectNormal.x * sgn + objectNormal.y * cgn);')
          .replace('#include <begin_vertex>', `
  // aLam: altura, largura, curva, giro da lâmina
  vAlt = aAlt;
  vec3 transformed = vec3(position.x * aLam.y, position.y * aLam.y, aAlt * aLam.x);
  transformed.y += aLam.z * aAlt * aAlt * aLam.x * 0.55;
  float cg = cos(aLam.w), sg = sin(aLam.w);
  transformed.xy = vec2(transformed.x * cg - transformed.y * sg, transformed.x * sg + transformed.y * cg);
  vec3 base = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  float ondas = sin(dot(base.xy, vec2(0.012, 0.009)) + uTempo * 1.6) * 0.6 + sin(dot(base.xy, vec2(-0.02, 0.031)) + uTempo * 2.7) * 0.3 + 0.35;
  float dobra = aAlt * aAlt;
  transformed.xy += uVento.xy * uVento.z * ondas * dobra * aLam.x * 0.45;
  vec2 dd = base.xy - uEmp.xy; float dl = length(dd);
  float emp = uEmp.z > 0.0 ? (1.0 - smoothstep(uEmp.z * 0.35, uEmp.z, dl)) * uEmp.w : 0.0;
  transformed.xy += (dl > 0.01 ? dd / dl : vec2(0.0)) * emp * dobra * aLam.x * 0.9;
  transformed.z -= emp * dobra * aLam.x * 0.45;`);
        sh.fragmentShader = 'varying float vAlt;\n' + sh.fragmentShader
          .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= (0.35 + 0.65 * vAlt) * (1.0 + 0.18 * vAlt * vAlt); diffuseColor.rg += vec2(0.05, 0.03) * vAlt * vAlt;')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * 0.06 * vAlt;');   // (translucidez barata: a ponta "acende" contra o sol)
      };
      mat.customProgramCacheKey = () => 'eclipse-grama';
      const flor = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
      const disco = new THREE.CircleGeometry(3.2, 6); disco.rotateX(-Math.PI / 2 * 0);
      RT = { grupo: new THREE.Group(), geo, mat, U, flor, disco, THREE };
      RT.grupo.name = 'vegetacao';
    }
    if (RT.grupo.parent !== raiz) raiz.add(RT.grupo);
    const tv = typeof ThirdView !== 'undefined' ? ThirdView : null;
    if (!tv) return;
    const ven = typeof Fogo !== 'undefined' && Fogo.VENTO ? Fogo.VENTO : { k: 0.4, x: 1, y: 0 };
    RT.U.uTempo.value = (typeof performance !== 'undefined' ? performance.now() / 1000 : 0) % 1000;
    RT.U.uVento.value.set(ven.x || 1, ven.y || 0, 0.5 + (ven.k || 0) * 0.9);
    const E = empurrao(); RT.U.uEmp.value.set(E[0], E[1], E[2], E[3]);
    const V = visiveis(tv.eye, tv.tgt), vis = new Set(V);
    for (const S of Z.setores.values()) if (S.three && !vis.has(S)) for (const m of S.three) m.visible = false;
    const dummy = RT.dummy || (RT.dummy = new THREE.Object3D()), cor = RT.cor || (RT.cor = new THREE.Color());
    for (const S of V) {
      if (!S.three) {
        const D = S.dados, n = S.n, im = new THREE.InstancedMesh(RT.geo, RT.mat, n), lam = new Float32Array(n * 4);
        for (let q = 0; q < n; q++) {
          const i = q * 11, tipo = D[i + 10];
          dummy.position.set(D[i], D[i + 1], D[i + 2]); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
          im.setMatrixAt(q, dummy.matrix);
          if (tipo >= 2) cor.setRGB(0.2, 0.42, 0.14); else cor.setRGB(D[i + 7], D[i + 8], D[i + 9]);
          im.setColorAt(q, cor);
          lam[q * 4] = D[i + 4]; lam[q * 4 + 1] = D[i + 5]; lam[q * 4 + 2] = D[i + 6]; lam[q * 4 + 3] = D[i + 3];
        }
        im.geometry = RT.geo.clone(); im.geometry.setAttribute('aLam', new THREE.InstancedBufferAttribute(lam, 4));
        im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false;
        // flores: discos (cabeças) por instância
        const fl = []; for (let q = 0; q < n; q++) if (D[q * 11 + 10] >= 2) fl.push(q);
        const imf = new THREE.InstancedMesh(RT.disco, RT.flor, Math.max(1, fl.length));
        fl.forEach((q, k) => {
          const i = q * 11, F = FLORES[D[i + 10] - 2];
          dummy.position.set(D[i], D[i + 1], D[i + 2] + D[i + 4]); dummy.rotation.set(0, 0, D[i + 3]); dummy.scale.setScalar(F.forma === 'espiga' ? 0.8 : 1); dummy.updateMatrix();
          imf.setMatrixAt(k, dummy.matrix); cor.setRGB(F.cor[0], F.cor[1], F.cor[2]); imf.setColorAt(k, cor);
        });
        imf.count = fl.length; imf.frustumCulled = false;
        S.three = [im, imf]; S.nFlorT = fl.length;
        RT.grupo.add(im, imf);
      }
      const [im, imf] = S.three;
      im.visible = imf.visible = true;
      im.count = S.qtd;
      imf.count = Math.floor(S.nFlorT * S.lod * N().flores);
    }
  }
  // informação para os testes e o painel
  function estado() {
    if (!Z) return null;
    let n = 0, ger = 0; for (const S of Z.setores.values()) { n += S.n; ger++; }
    const rej = {}; for (const S of Z.setores.values()) for (const k in S.rej || {}) rej[k] = (rej[k] || 0) + S.rej[k];
    return { zona: Z.id, tema: Z.tema, setores: ger, faltam: Z.fila.length, laminas: n, nivel: N().nome, visiveis: VIS.length, recusas: rej };
  }
  // gera tudo de uma vez (testes)
  function gerarTudo() { while (Z && Z.fila.length) { const S = Z.fila.shift(); gerarSetor(S); Z.setores.set(`${S.i},${S.j}`, S); } return estado(); }
  const setores = () => (Z ? [...Z.setores.values()] : []);
  return { _malha: malhaClassica, SETOR, NIVEIS, TEMAS, FLORES, aoCarregar, descartar, ativo, visiveis, desenharClassico, realista, empurrao, estado, gerarTudo, setores, _exc: () => (Z ? Z.exc : []) };
})();
if (typeof window !== 'undefined') window.Vegetacao = Vegetacao;
