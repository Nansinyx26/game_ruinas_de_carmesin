'use strict';
// ECLIPSE ZERO · Paisagens procedurais por semente (Paisagem)
// ---------------------------------------------------------------------------
// Cada zona natural do mundo aberto (floresta, lagoa, deserto, neve, vulcão) ganha a paisagem dela
// GERADA a partir de uma semente: a mesma semente dá sempre a mesma paisagem; outra semente, outra.
// Nada é espalhado ao acaso: o gerador monta campos contínuos (altitude, umidade, temperatura) com
// ruído em várias camadas, tira deles os sub-biomas (mata fechada, clareira, campo, brejo, pedregal,
// beira d'água), e só então decide o que nasce onde:
//   · VEGETAÇÃO por espécie, cada uma com as regras dela (temas, faixa de altitude, umidade e
//     temperatura, inclinação máxima, distância mínima, densidade, tamanho) e lugares tirados por
//     amostragem de Poisson (sem fileiras nem montinhos artificiais), com adensamento em manchas;
//   · ROCHAS nos trechos altos e inclinados;
//   · CAMINHOS do centro a cada passagem da zona, achados por A* sobre o relevo e a água (curvos,
//     contornando o que não dá para atravessar), que ficam livres de árvores;
//   · PONTOS DE INTERESSE (ruínas) por raridade, longe das passagens, em chão firme e alcançável;
//   · pontos de FAUNA (pasto perto d'água e descanso na mata) para os sistemas de animais.
// Sementes independentes por sistema (terreno, bioma, vegetação, rochas, estruturas, fauna): mudar
// a de um não mexe nos outros; mudar a de uma zona não mexe nas outras zonas.
// Depois de gerar, VALIDA (fora do mapa, dentro d'água, sobreposição, caminho bloqueado, ponto de
// interesse sem acesso) e corrige tirando ou reposicionando; o relatório fica em Paisagem.relatorio.
// As peças são os GLB do projeto (árvores, plantas, rochas e ruínas de js/assets/estruturas/): o
// gerador só diz onde vão; quem põe na zona, com colisão e desenho, é o js/mundo/estruturas.js.
// O chão do motor ainda é plano: a altitude gerada decide biomas, espécies, rochas e rotas, mas
// montanhas e vales de verdade dependem do mundo contínuo com altura do chão (próxima etapa).
// ---------------------------------------------------------------------------
const Paisagem = (() => {
  const SEMENTE_PADRAO = 7411;
  const SISTEMAS = ['terreno', 'bioma', 'vegetacao', 'rochas', 'estruturas', 'fauna'];
  // clima de base de cada tema: [temperatura, umidade] (0 a 1), antes do relevo e da água
  const TEMAS = { floresta: [0.52, 0.62], lagoa: [0.68, 0.78], deserto: [0.88, 0.14], neve: [0.1, 0.45], vulcao: [0.92, 0.1] };
  // espécies (GLB): temas, faixas [mín, máx] de altitude/umidade/temperatura, inclinação máxima,
  // distância mínima (unidades), densidade (0 a 1), escala e se prefere a beira d'água
  const ESPECIES = [
    { id: 'arvore_1', tipo: 'arvore', temas: ['floresta'], alt: [0.12, 0.78], umid: [0.4, 1], temp: [0.3, 0.75], incl: 0.5, dist: 170, dens: 1, esc: [0.72, 1] },
    { id: 'arvore_2', tipo: 'arvore', temas: ['floresta'], alt: [0.12, 0.7], umid: [0.5, 1], temp: [0.3, 0.75], incl: 0.45, dist: 180, dens: 0.9, esc: [0.72, 1] },
    { id: 'arvore_3', tipo: 'arvore', temas: ['floresta', 'lagoa'], alt: [0.3, 0.9], umid: [0.3, 0.9], temp: [0.25, 0.8], incl: 0.6, dist: 150, dens: 0.8, esc: [0.8, 1.1] },
    { id: 'arvore_4', tipo: 'arvore', temas: ['floresta'], alt: [0.1, 0.55], umid: [0.55, 1], temp: [0.35, 0.75], incl: 0.35, dist: 230, dens: 0.55, esc: [0.7, 0.95] },
    { id: 'arvore_6', tipo: 'arvore', temas: ['floresta', 'lagoa'], alt: [0.2, 0.85], umid: [0.3, 0.85], temp: [0.3, 0.8], incl: 0.6, dist: 140, dens: 0.8, esc: [0.8, 1.15] },
    { id: 'arvore_5', tipo: 'arvore', temas: ['floresta', 'lagoa'], alt: [0, 0.4], umid: [0.72, 1], temp: [0.35, 0.85], incl: 0.3, dist: 330, dens: 0.6, esc: [0.6, 0.8], beira: true },   // salgueiro
    { id: 'arvore_7', tipo: 'arvore', temas: ['lagoa', 'deserto'], alt: [0, 0.5], umid: [0.55, 1], temp: [0.6, 1], incl: 0.35, dist: 130, dens: 0.9, esc: [0.75, 1.05], beira: true },   // palmeira (no deserto, só em oásis)
    { id: 'arvore_8', tipo: 'arvore', temas: ['lagoa', 'floresta'], alt: [0.05, 0.55], umid: [0.62, 1], temp: [0.5, 0.9], incl: 0.35, dist: 280, dens: 0.45, esc: [0.6, 0.85] },   // figueira
    { id: 'planta_5', tipo: 'planta', temas: ['lagoa', 'floresta'], alt: [0, 0.5], umid: [0.66, 1], temp: [0.45, 0.95], incl: 0.4, dist: 150, dens: 0.6, esc: [0.7, 1] },   // bambuzal
    { id: 'planta_1', tipo: 'planta', temas: ['floresta', 'lagoa'], alt: [0.1, 0.7], umid: [0.4, 0.9], temp: [0.35, 0.85], incl: 0.5, dist: 80, dens: 0.8, esc: [0.85, 1.25] },   // arbusto florido
    { id: 'planta_2', tipo: 'planta', temas: ['floresta', 'lagoa'], alt: [0.1, 0.85], umid: [0.3, 0.9], temp: [0.25, 0.85], incl: 0.6, dist: 75, dens: 0.9, esc: [0.85, 1.3] },   // arbusto
    { id: 'planta_3', tipo: 'planta', temas: ['floresta', 'lagoa'], alt: [0.05, 0.6], umid: [0.3, 0.75], temp: [0.4, 0.9], incl: 0.4, dist: 70, dens: 0.8, esc: [0.85, 1.2], campo: true },   // capim ornamental
    { id: 'planta_4', tipo: 'planta', temas: ['floresta'], alt: [0.05, 0.6], umid: [0.4, 0.8], temp: [0.4, 0.8], incl: 0.4, dist: 70, dens: 0.8, esc: [0.85, 1.2], campo: true },   // capim florido
    { id: 'planta_6', tipo: 'planta', temas: ['deserto'], alt: [0.05, 0.8], umid: [0, 0.5], temp: [0.6, 1], incl: 0.5, dist: 110, dens: 0.8, esc: [0.9, 1.5] },   // agave
    { id: 'rochas_grupo', tipo: 'rocha', temas: ['floresta', 'lagoa', 'deserto', 'neve', 'vulcao'], alt: [0.5, 1], umid: [0, 1], temp: [0, 1], incl: 1, dist: 240, dens: 0.7, esc: [0.6, 1.15] },
  ];
  // pontos de interesse: [peça, peso (comum → raro)] por tema
  const POIS = {
    floresta: [['muro_ruinas_placa', 5], ['escadaria_ruinas', 3], ['estrutura_md_15', 1.5]],
    lagoa: [['muro_ruinas_placa', 4], ['estrutura_md_15', 2.5]],
    deserto: [['escadaria_ruinas', 4], ['muro_ruinas_placa', 3], ['estrutura_md_15', 2]],
    neve: [['muro_ruinas_placa', 4], ['estrutura_md_15', 2]],
    vulcao: [['escadaria_ruinas', 3], ['muro_ruinas_placa', 2]],
  };
  // teto de peças por zona (na qualidade máxima); a qualidade dos efeitos reduz a quantidade, nunca o lugar
  const TETO = { arvore: 9, planta: 11, rocha: 4 };

  // ------------------------------------------------------------ sementes e ruído
  const mist = (a, b) => { let h = (a ^ 0x9e3779b9) >>> 0; h = Math.imul(h ^ (b >>> 0), 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
  const hashTxt = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const sorteio = (s) => { let a = s >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const suave = (t) => t * t * (3 - 2 * t);
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  function ruido(sem) {   // ruído de valor 2D contínuo, 0 a 1
    const h = (x, y) => mist(mist(sem, x | 0), y | 0) / 4294967296;
    return (x, y) => {
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = suave(x - x0), fy = suave(y - y0);
      const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
  }
  // FBM: várias oitavas somadas (cada uma com o dobro da frequência e metade da força)
  function fbm(sem, oitavas = 5) {
    const N = [...Array(oitavas)].map((_, i) => ruido(mist(sem, 101 + i * 37)));
    return (x, y) => { let v = 0, a = 0.5, f = 1, t = 0; for (let i = 0; i < oitavas; i++) { v += N[i](x * f, y * f) * a; t += a; a *= 0.5; f *= 2.03; } return v / t; };
  }

  // ------------------------------------------------------------ sementes da zona
  function estado() { return typeof World !== 'undefined' && World.state ? World.state : null; }
  function sementeDe(zid) {
    const s = estado(), P = s && s.paisagem;
    if (P && P.zonas && P.zonas[zid] !== undefined) return P.zonas[zid] >>> 0;
    return mist((P && P.mundo !== undefined ? P.mundo : SEMENTE_PADRAO) >>> 0, hashTxt(zid));
  }
  const sementes = (zid, base) => Object.fromEntries(SISTEMAS.map((k) => [k, mist(base === undefined ? sementeDe(zid) : base >>> 0, hashTxt(k))]));

  // ------------------------------------------------------------ campos (altitude, umidade, temperatura)
  // A: { w, h, tema, agua(x, y) → fundura } — tudo em unidades da sala
  function campos(A, S) {
    const T = TEMAS[A.tema] || TEMAS.floresta, esc = 1 / 620;
    const base = fbm(S.terreno, 5), crista = fbm(mist(S.terreno, 7), 4), dobra = fbm(mist(S.terreno, 13), 3), um = fbm(S.bioma, 4), tp = fbm(mist(S.bioma, 5), 3);
    const montanhoso = A.tema === 'neve' || A.tema === 'vulcao' ? 0.55 : A.tema === 'deserto' ? 0.3 : 0.2;
    // distância à água (grade grossa): umidade sobe perto de rio e lago
    const P = 60, nx = Math.ceil(A.w / P) + 1, ny = Math.ceil(A.h / P) + 1, molhado = new Uint8Array(nx * ny), longe = new Float32Array(nx * ny).fill(9);
    let temAgua = false;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (A.agua && A.agua(i * P, j * P) > 0) { molhado[j * nx + i] = 1; longe[j * nx + i] = 0; temAgua = true; }
    if (temAgua) for (let k = 0; k < 2; k++) {   // duas varridas (ida e volta) bastam para a distância aproximada
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = j * nx + i; if (i) longe[q] = Math.min(longe[q], longe[q - 1] + 1); if (j) longe[q] = Math.min(longe[q], longe[q - nx] + 1); }
      for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const q = j * nx + i; if (i < nx - 1) longe[q] = Math.min(longe[q], longe[q + 1] + 1); if (j < ny - 1) longe[q] = Math.min(longe[q], longe[q + nx] + 1); }
    }
    const perto = (x, y) => { if (!temAgua) return 0; const i = cl(Math.round(x / P), 0, nx - 1), j = cl(Math.round(y / P), 0, ny - 1); return cl(1 - longe[j * nx + i] / 5, 0, 1); };
    const alt = A.alt ? (x, y) => A.alt(x, y) * (1 - 0.75 * perto(x, y)) : (x, y) => {
      const wx = x * esc + (dobra(x * esc * 0.7, y * esc * 0.7) - 0.5) * 0.9, wy = y * esc + (dobra(y * esc * 0.7 + 9, x * esc * 0.7 + 4) - 0.5) * 0.9;   // dobra o domínio: sem padrão repetido
      const b = base(wx, wy), r = 1 - Math.abs(2 * crista(wx * 1.3 + 3, wy * 1.3 + 8) - 1);   // cristas (cadeias) por cima das colinas
      let a = b * (1 - montanhoso) + r * r * montanhoso;
      a = cl((a - 0.22) / 0.6, 0, 1);
      return a * (1 - 0.75 * perto(x, y));   // a água corre no baixo: perto dela o chão desce
    };
    const incl = (x, y) => cl(Math.hypot(alt(x + 30, y) - alt(x - 30, y), alt(x, y + 30) - alt(x, y - 30)) * 4.5, 0, 1);
    const umid = (x, y) => cl(T[1] + (um(x * esc * 1.4, y * esc * 1.4) - 0.5) * 0.5 + perto(x, y) * 0.5 - alt(x, y) * 0.18, 0, 1);
    const temp = (x, y) => cl(T[0] + (tp(x * esc * 0.9, y * esc * 0.9) - 0.5) * 0.2 - alt(x, y) * 0.3, 0, 1);
    // sub-bioma do ponto (os limites são faixas dos campos contínuos: a transição é gradual)
    const bioma = (x, y) => {
      const a = alt(x, y), u = umid(x, y), s = incl(x, y);
      if (A.agua && A.agua(x, y) > 0) return 'agua';
      if (perto(x, y) > 0.75) return 'beira';
      if (a > 0.72 || s > 0.7) return 'pedregal';
      if (A.tema === 'deserto') return u > 0.5 ? 'oasis' : a > 0.5 ? 'planalto' : 'dunas';
      if (A.tema === 'neve') return a > 0.5 ? 'encosta' : 'planicie_nevada';
      if (A.tema === 'vulcao') return a > 0.5 ? 'escoria' : 'campo_de_cinzas';
      if (u > 0.8 && a < 0.3) return 'brejo';
      if (u > 0.58) return 'mata';
      if (u > 0.45) return 'bosque';
      return 'campo';
    };
    return { alt, incl, umid, temp, perto, bioma, temAgua };
  }

  // ------------------------------------------------------------ caminhos (A* na grade)
  // Do centro a cada passagem: custo pelo relevo (subir custa) e pela água; obstáculos fixos não passam
  function rotas(A, C, alvos, bloqueios) {
    const P = 44, nx = Math.ceil(A.w / P), ny = Math.ceil(A.h / P), N = nx * ny;
    const fechado = new Uint8Array(N), custo = new Float32Array(N);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = (i + 0.5) * P, y = (j + 0.5) * P, q = j * nx + i;
      // (a água não fecha o caminho — o herói atravessa a vau ou a nado —, mas custa caro: a rota prefere contornar)
      if (bloqueios.some((b) => Math.hypot(b.x - x, b.y - y) < b.r + P * 0.3)) fechado[q] = 1;
      const f = A.agua ? A.agua(x, y) : 0;
      custo[q] = 1 + C.incl(x, y) * 6 + (f > 0 ? 5 + f * 14 : 0);
    }
    const cel = (x, y) => cl(Math.floor(y / P), 0, ny - 1) * nx + cl(Math.floor(x / P), 0, nx - 1);
    const ini = cel(A.w / 2, A.h / 2), saida = [];
    for (const al of alvos) {
      const fim = cel(al.x, al.y), g = new Float32Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), aberto = [ini];
      g[ini] = 0;
      const hh = (q) => Math.hypot((q % nx) - (fim % nx), Math.floor(q / nx) - Math.floor(fim / nx));
      let achou = false;
      while (aberto.length) {
        let k = 0; for (let i = 1; i < aberto.length; i++) if (g[aberto[i]] + hh(aberto[i]) < g[aberto[k]] + hh(aberto[k])) k = i;
        const q = aberto.splice(k, 1)[0];
        if (q === fim) { achou = true; break; }
        const qi = q % nx, qj = Math.floor(q / nx);
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const i = qi + di, j = qj + dj; if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
          const v = j * nx + i; if (fechado[v] && v !== fim) continue;
          const c = g[q] + custo[v] * (di && dj ? 1.414 : 1);
          if (c < g[v]) { if (g[v] === Infinity) aberto.push(v); g[v] = c; de[v] = q; }
        }
      }
      const pts = [];
      if (achou) for (let q = fim; q !== -1; q = de[q]) pts.unshift([(q % nx + 0.5) * P, (Math.floor(q / nx) + 0.5) * P]);
      saida.push({ alvo: al, ok: achou, pts });
    }
    return saida;
  }
  const distSeg = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = cl(((px - a[0]) * dx + (py - a[1]) * dy) / l, 0, 1); return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t); };
  const distRota = (px, py, R) => { let d = 1e9; for (const r of R) for (let i = 1; i < r.pts.length; i++) d = Math.min(d, distSeg(px, py, r.pts[i - 1], r.pts[i])); return d; };

  // ------------------------------------------------------------ amostragem de Poisson (Bridson)
  function poisson(rnd, w, h, r, margem, max = 4000) {
    const c = r / Math.SQRT2, nx = Math.ceil(w / c), ny = Math.ceil(h / c), G = new Int32Array(nx * ny).fill(-1), pts = [], ativos = [];
    const poe = (x, y) => { G[Math.floor(y / c) * nx + Math.floor(x / c)] = pts.length; pts.push([x, y]); ativos.push(pts.length - 1); };
    poe(margem + rnd() * (w - 2 * margem), margem + rnd() * (h - 2 * margem));
    while (ativos.length && pts.length < max) {
      const k = Math.floor(rnd() * ativos.length), p = pts[ativos[k]];
      let pos = false;
      for (let t = 0; t < 18; t++) {
        const a = rnd() * 6.2832, d = r * (1 + rnd()), x = p[0] + Math.cos(a) * d, y = p[1] + Math.sin(a) * d;
        if (x < margem || y < margem || x > w - margem || y > h - margem) continue;
        const gi = Math.floor(x / c), gj = Math.floor(y / c);
        let livre = true;
        for (let j = Math.max(0, gj - 2); j <= Math.min(ny - 1, gj + 2) && livre; j++) for (let i = Math.max(0, gi - 2); i <= Math.min(nx - 1, gi + 2); i++) { const q = G[j * nx + i]; if (q >= 0 && Math.hypot(pts[q][0] - x, pts[q][1] - y) < r) { livre = false; break; } }
        if (livre) { poe(x, y); pos = true; break; }
      }
      if (!pos) ativos.splice(k, 1);
    }
    return pts;
  }

  // ------------------------------------------------------------ geração
  // A: { id, w, h, tema, hub, agua(x, y), fixos: [{ x, y, r }] (o que já está na zona: estruturas da
  //      lista, baús, terminais), passagens: [{ x, y }], raio(id) → raio da peça no jogo, semente? }
  function gerar(A) {
    const S = sementes(A.id, A.semente), C = campos(A, S), M = 90;
    const itens = [], fora = { agua: 0, caminho: 0, fixo: 0, regra: 0, sobreposto: 0 };
    if (!TEMAS[A.tema]) return { itens, rotas: [], pois: [], fauna: [], campos: C, sementes: S, relatorio: { ok: true, tema: A.tema, natural: false } };
    const raio = (id) => (A.raio ? A.raio(id) : 40);
    const fixos = (A.fixos || []).map((f) => ({ x: f.x, y: f.y, r: f.r || 40 }));
    const R = rotas(A, C, A.passagens || [], fixos);
    const centro = { x: A.w / 2, y: A.h / 2, r: 130 };   // onde o herói chega
    const serve = (E, x, y) => { const a = C.alt(x, y), u = C.umid(x, y), t = C.temp(x, y); return a >= E.alt[0] && a <= E.alt[1] && u >= E.umid[0] && u <= E.umid[1] && t >= E.temp[0] && t <= E.temp[1] && C.incl(x, y) <= E.incl; };
    const cabe = (x, y, r, folga) => {
      if (x < M || y < M || x > A.w - M || y > A.h - M) return 'regra';
      if (A.agua && (A.agua(x, y) > 0 || A.agua(x + r * 0.7, y) > 0 || A.agua(x - r * 0.7, y) > 0 || A.agua(x, y + r * 0.7) > 0 || A.agua(x, y - r * 0.7) > 0)) return 'agua';
      if (Math.hypot(x - centro.x, y - centro.y) < centro.r + r) return 'fixo';
      for (const f of fixos) if (Math.hypot(f.x - x, f.y - y) < f.r + r + 30) return 'fixo';
      for (const p of A.passagens || []) if (Math.hypot(p.x - x, p.y - y) < 150 + r) return 'caminho';
      if (distRota(x, y, R) < 50 + Math.min(r, 60) * 0.6) return 'caminho';
      for (const o of itens) if (Math.hypot(o.x - x, o.y - y) < (o.r + r) * 0.8 + folga) return 'sobreposto';
      return null;
    };
    const dens = fbm(mist(S.vegetacao, 3), 3);   // manchas: onde a mata fecha e onde abre
    const esp = ESPECIES.filter((E) => E.temas.includes(A.tema) && (!A.temPeca || A.temPeca(E.id)));
    // uma passada por espécie, das maiores para as menores (as árvores escolhem o lugar primeiro)
    for (const E of esp.slice().sort((a, b) => b.dist - a.dist)) {
      const rnd = sorteio(mist(E.tipo === 'rocha' ? S.rochas : S.vegetacao, hashTxt(E.id)));
      const r = raio(E.id), escM = (E.esc[0] + E.esc[1]) / 2;
      for (const [x, y] of poisson(rnd, A.w, A.h, E.dist, M, 600)) {
        const d = dens(x / 500, y / 500), chance = E.dens * (A.hub ? 0.5 : 1) * (E.tipo === 'rocha' ? 0.5 + C.incl(x, y) : E.campo ? 1.3 - d : 0.35 + d * 1.1) * (E.beira ? 0.3 + 1.2 * C.perto(x, y) : 1);
        const a = rnd(), e = E.esc[0] + rnd() * (E.esc[1] - E.esc[0]), g = rnd() * 6.2832;   // (sorteados sempre: a ordem não muda com as recusas)
        if (a > chance) continue;
        if (!serve(E, x, y)) { fora.regra++; continue; }
        const motivo = cabe(x, y, r * escM * (E.tipo === 'arvore' ? 0.45 : 0.8), E.tipo === 'arvore' ? 40 : 14);
        if (motivo) { fora[motivo]++; continue; }
        itens.push({ id: E.id, tipo: E.tipo, x, y, giro: g, esc: +e.toFixed(2), r: r * e * (E.tipo === 'arvore' ? 0.45 : 0.8), bioma: C.bioma(x, y), ordem: rnd() });
      }
    }
    // pontos de interesse: longe das passagens e do centro, em chão firme e pouco inclinado, com rota
    const pois = [], rp = sorteio(S.estruturas), LP = (POIS[A.tema] || []).filter((p) => !A.temPeca || A.temPeca(p[0]));
    const quantos = A.hub || !LP.length ? 0 : rp() < 0.25 ? 2 : rp() < 0.8 ? 1 : 0;
    for (let k = 0; k < quantos; k++) {
      let u = rp() * LP.reduce((s, p) => s + p[1], 0), id = LP[0][0];
      for (const p of LP) { if ((u -= p[1]) <= 0) { id = p[0]; break; } }
      const r = raio(id) * 0.8;
      let melhor = null;
      for (let t = 0; t < 60; t++) {
        const x = M + r + rp() * (A.w - 2 * (M + r)), y = M + r + rp() * (A.h - 2 * (M + r));
        if (C.incl(x, y) > 0.55 || cabe(x, y, r, 30)) continue;
        const longeDeTudo = Math.min(Math.hypot(x - centro.x, y - centro.y), ...(A.passagens || []).map((p) => Math.hypot(p.x - x, p.y - y)), ...pois.map((p) => Math.hypot(p.x - x, p.y - y)));
        if (!melhor || longeDeTudo > melhor.d) melhor = { x, y, d: longeDeTudo };
      }
      if (!melhor) continue;
      const o = { id, tipo: 'poi', x: melhor.x, y: melhor.y, giro: Math.floor(rp() * 8) * 0.7854, esc: +(0.8 + rp() * 0.25).toFixed(2), r, bioma: C.bioma(melhor.x, melhor.y), ordem: -1 };
      // tira a vegetação de cima e de em volta do ponto de interesse (espaço para circular)
      for (let i = itens.length - 1; i >= 0; i--) if (Math.hypot(itens[i].x - o.x, itens[i].y - o.y) < itens[i].r + r + 50) { itens.splice(i, 1); fora.fixo++; }
      itens.push(o); pois.push(o);
    }
    // trilha escondida até cada ponto de interesse (também fica livre)
    const Rp = rotas(A, C, pois, fixos.concat(itens.filter((o) => o.tipo !== 'poi')));
    for (let i = itens.length - 1; i >= 0; i--) if (itens[i].tipo !== 'poi' && distRota(itens[i].x, itens[i].y, Rp) < 34) { itens.splice(i, 1); fora.caminho++; }
    // fauna: pasto (campo ou beira, perto d'água) e descanso (mata), longe das passagens
    const fauna = [], rf = sorteio(S.fauna);
    for (const [x, y] of poisson(rf, A.w, A.h, 420, M + 40, 40)) {
      const b = C.bioma(x, y);
      if (b === 'agua' || b === 'pedregal' || cabe(x, y, 30, 0) === 'agua' || (A.passagens || []).some((p) => Math.hypot(p.x - x, p.y - y) < 260)) continue;
      fauna.push({ x, y, tipo: b === 'mata' || b === 'bosque' ? 'descanso' : 'pasto', bioma: b });
    }
    const G = { itens, rotas: R.concat(Rp), pois, fauna, campos: C, sementes: S };
    G.relatorio = validar(A, G, fora);
    return G;
  }

  // ------------------------------------------------------------ validação (e correção)
  function validar(A, G, fora = {}) {
    const P = [], tirar = new Set();
    const C = G.campos;
    G.itens.forEach((o, i) => {
      if (!(o.x > 0 && o.y > 0 && o.x < A.w && o.y < A.h)) { P.push(`${o.id}: fora do mapa`); tirar.add(i); }
      else if (A.agua && A.agua(o.x, o.y) > 0) { P.push(`${o.id}: dentro d'água`); tirar.add(i); }
      for (let j = 0; j < i; j++) { const q = G.itens[j]; if (!tirar.has(j) && Math.hypot(q.x - o.x, q.y - o.y) < Math.min(o.r, q.r) * 0.9) { P.push(`${o.id} em cima de ${q.id}`); tirar.add(i); break; } }
      if (o.tipo !== 'poi' && !ESPECIES.find((E) => E.id === o.id).temas.includes(A.tema)) { P.push(`${o.id}: espécie fora do bioma`); tirar.add(i); }
    });
    // as rotas precisam chegar: se uma peça ficou no meio de uma, sai
    G.itens.forEach((o, i) => { if (o.tipo !== 'poi' && !tirar.has(i) && distRota(o.x, o.y, G.rotas) < Math.min(o.r, 30)) { P.push(`${o.id}: no meio do caminho`); tirar.add(i); } });
    const semRota = G.rotas.filter((r) => !r.ok);
    for (const r of semRota) {
      if (r.alvo.tipo === 'poi') { const i = G.itens.indexOf(r.alvo); if (i >= 0) { tirar.add(i); P.push(`${r.alvo.id}: ponto de interesse sem acesso (retirado)`); } const k = G.pois.indexOf(r.alvo); if (k >= 0) G.pois.splice(k, 1); }
      else P.push('passagem sem rota a partir do centro (água ou construção no caminho)');
    }
    const corrigidos = tirar.size;
    if (corrigidos) G.itens = G.itens.filter((_, i) => !tirar.has(i));
    const n = (t) => G.itens.filter((o) => o.tipo === t).length;
    return { ok: !semRota.some((r) => r.alvo.tipo !== 'poi'), natural: true, tema: A.tema, arvores: n('arvore'), plantas: n('planta'), rochas: n('rocha'), pois: n('poi'), fauna: G.fauna.length, rotas: G.rotas.length, corrigidos, problemas: P, recusados: fora,
      biomas: (() => { const B = {}; for (const o of G.itens) B[o.bioma] = (B[o.bioma] || 0) + 1; return B; })(), temAgua: C.temAgua };
  }

  // ------------------------------------------------------------ na zona (World.loadZone, antes das estruturas)
  const base = {}, cache = {}, relatorio = {};
  function entrada(z, R) {
    const g = game, I = typeof ESTRUTURAS_INDICE !== 'undefined' ? ESTRUTURAS_INDICE : {};
    const lista = base[z.id] || [];
    return { id: z.id, w: R.w, h: R.h, tema: R.def && R.def.theme || z.theme, hub: !!(z.hub || z.seguro),
      agua: typeof Agua !== 'undefined' && Agua.profundidade ? (x, y) => Agua.profundidade(x, y) : null,
      fixos: lista.filter((L) => I[L[0]]).map((L) => ({ x: R.w * L[1], y: R.h * L[2], r: I[L[0]].r * (L[4] || 1) }))
        .concat(g.npcs.filter((q) => q.kind === 'chest' || q.kind === 'terminal' || q.kind === 'portal' || q.kind === 'entrada' || q.kind === 'tesouro' || q.kind === 'quadro').map((q) => ({ x: q.x, y: q.y, r: (q.radius || 20) + 40 }))),
      passagens: g.npcs.filter((q) => q.kind === 'gate').map((q) => ({ x: q.x, y: q.y })),
      raio: (id) => (I[id] ? I[id].r : 40), temPeca: (id) => !!I[id],
      alt: typeof Relevo !== 'undefined' && Relevo.estado() ? Relevo.alt01 : null };   // a altitude é a do relevo de verdade (js/mundo/relevo.js)
  }
  // Junta a paisagem gerada à lista de estruturas da zona (uma vez por zona e semente)
  function aoCarregar(z) {
    if (typeof Estruturas === 'undefined' || typeof game === 'undefined' || !game.room || !z) return null;
    const R = game.room, Z = Estruturas.ZONAS;
    if (!R.aberto || !TEMAS[(R.def && R.def.theme) || z.theme] || z.instancia || z.cidade || z.distrito) return null;
    if (base[z.id] === undefined) base[z.id] = (Z[z.id] || []).slice();
    const sem = sementeDe(z.id), chave = `${z.id}:${sem}:${Math.round(R.w)}x${Math.round(R.h)}`;
    let G = cache[z.id];
    if (!G || G.chave !== chave) { G = gerar(entrada(z, R)); G.chave = chave; cache[z.id] = G; relatorio[z.id] = Object.assign({ semente: sem }, G.relatorio); }
    // qualidade dos efeitos: menos peças (as primeiras da ordem sorteada), nos mesmos lugares
    const q = typeof Clima !== 'undefined' && Clima.qual ? cl(Clima.qual().part, 0.45, 1) : 1, conta = {};
    const escolhidos = G.itens.slice().sort((a, b) => a.ordem - b.ordem).filter((o) => { if (o.tipo === 'poi') return true; conta[o.tipo] = (conta[o.tipo] || 0) + 1; return conta[o.tipo] <= Math.round(TETO[o.tipo] * q); });
    Z[z.id] = base[z.id].concat(escolhidos.map((o) => [o.id, o.x / R.w, o.y / R.h, o.giro, o.esc]));
    return G;
  }
  // Sementes: a do mundo (todas as zonas sem semente própria) e a de uma zona só
  function definirMundo(s) { const E = estado(); if (!E) return; (E.paisagem || (E.paisagem = {})).mundo = s >>> 0; for (const k in cache) delete cache[k]; if (World.save) World.save(); }
  function definirZona(zid, s) { const E = estado(); if (!E) return; const P = E.paisagem || (E.paisagem = {}); (P.zonas || (P.zonas = {}))[zid] = s >>> 0; delete cache[zid]; if (World.save) World.save(); }
  function configuracao() { const E = estado(), P = (E && E.paisagem) || {}; return { mundo: P.mundo === undefined ? SEMENTE_PADRAO : P.mundo, zonas: Object.assign({}, P.zonas) }; }
  function carregarConfiguracao(c) { const E = estado(); if (!E || !c) return; E.paisagem = { mundo: c.mundo >>> 0, zonas: Object.assign({}, c.zonas) }; for (const k in cache) delete cache[k]; if (World.save) World.save(); }

  return { ESPECIES, POIS, TEMAS, TETO, SISTEMAS, SEMENTE_PADRAO, gerar, validar, campos, rotas, poisson, sementes, sementeDe, aoCarregar, definirMundo, definirZona, configuracao, carregarConfiguracao, relatorio, _cache: cache, _base: base, fbm, ruido };
})();
if (typeof window !== 'undefined') window.Paisagem = Paisagem;
if (typeof module !== 'undefined') module.exports = Paisagem;
