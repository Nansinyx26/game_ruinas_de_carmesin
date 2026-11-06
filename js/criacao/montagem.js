'use strict';
// ECLIPSE ZERO · Personagem criado com as peças GLB da criação (Criacao3D)
// ---------------------------------------------------------------------------
// As peças de assets/Criar_Personagem/ (dois corpos, oito rostos, oito cabelos, cinco barbas e as
// armaduras dos níveis 1 e 30) são convertidas por tools/importar_criacao.py em
// js/assets/criacao/<id>.js: malhas com pele no esqueleto do Kael, já encaixadas em cada corpo,
// com textura, mapa de material e mapa de normais reassados do GLB original. Aqui elas são
// carregadas sob demanda (um <script> por peça: funciona também abrindo o index.html do disco) e
// montadas no esqueleto do corpo escolhido, com uma textura só para o personagem inteiro (atlas
// 2048: corpo e rosto em 1024, cabelo e armaduras em 512, barba, acessório e ombreiras em 256). A pele do
// corpo e do rosto e o cabelo e a barba são tingidos pixel a pixel na cor escolhida: a mesma cor
// de pele nos dois deixa a emenda do pescoço invisível, e a luz e os detalhes da textura ficam.
// As armaduras GLB vestidas (js/mundo/arsenal.js, campo cat) entram e saem do modelo sem
// remontar (cada vaga tem a sua célula no atlas); o que fica dentro delas some para não
// atravessar (pés nas botas, mãos nas luvas, pernas nas calças, cabelo no capuz). Enquanto as
// peças carregam, o modelo fica vazio (só o esqueleto); sem os arquivos convertidos, o jogo usa
// o modelo paramétrico (js/criacao/modelo.js).
// ---------------------------------------------------------------------------
const Criacao3D = (function () {
  const CAT = typeof CRIA_CATALOGO !== 'undefined' ? CRIA_CATALOGO : [];
  const POR_ID = {};
  for (const c of CAT) POR_ID[c.id] = c;
  const CORPOS = ['corpo_m', 'corpo_f'];
  const BARBAS = ['barba_cacheada', 'barba_curta', 'barba_longa', 'barba_media', 'barba_viking',
    'barba_b_por_fazer', 'barba_b_curta', 'barba_b_media', 'barba_b_cheia', 'barba_b_longa', 'barba_b_cavanhaque', 'barba_b_queixo', 'barba_b_bigode', 'barba_b_guidao',
    'barba_b_cheia_sem', 'barba_b_cavanhaque_sem'];
  // Bigode separado (campo bigodeG): peças do Blender com a mesma textura de fios das barbas em
  // mechas; divide a célula da barba no atlas (por isso não combina com as barbas do Meshy)
  const BIGODES = ['barba_b_bigode', 'barba_b_guidao', 'barba_b_fino', 'barba_b_ferradura'];
  const VAGAS = ['capacete', 'peitoral', 'luvas', 'calcas', 'botas', 'capa', 'acessorio', 'ombroE', 'ombroD'];
  const LADO = 2048;
  // células do atlas: [x, y, lado] em pixels da textura de cor (material e normais na metade)
  const CEL = {
    corpo: [0, 0, 1024], rosto: [1024, 0, 1024],
    cabelo: [0, 1024, 512], capacete: [512, 1024, 512], peitoral: [1024, 1024, 512], calcas: [1536, 1024, 512],
    botas: [0, 1536, 512], luvas: [512, 1536, 512], capa: [1024, 1536, 512],
    barba: [1536, 1536, 256], acessorio: [1792, 1536, 256],
    bigode: [1536, 1536, 256],   // (a mesma da barba: a textura de fios é a mesma nas peças em mechas)
    ombroE: [1536, 1792, 256], ombroD: [1792, 1792, 256],     // ombreiras dos conjuntos 50, 75 e 100
  };
  const TINTA = { corpo: 'pele', rosto: 'pele', cabelo: 'cabelo', barba: 'barba', bigode: 'barba' };

  // ------------------------------------------------------------ carregamento sob demanda
  const espera = {}, falhou = {}, pedido = {};
  const dados = (id) => (typeof window !== 'undefined' && window.CRIA3D && window.CRIA3D[id]) || null;
  function tem(id) { return id === 'minis' ? typeof CRIA_MINIS !== 'undefined' : !!dados(id); }
  // A peça existe convertida (o catálogo diz) e o arquivo não falhou ao carregar
  function disponivel(id) { const c = POR_ID[id]; return !!(c && c.convertido) && !falhou[id]; }
  function fim(id, ok) {
    const L = espera[id];
    delete espera[id];
    if (L) for (const cb of L) { try { cb(ok); } catch (e) { console.error(e); } }
  }
  // Carrega a peça (cb(ok) quando terminar); devolve true se já estava carregada
  function carregar(id, cb) {
    if (tem(id)) { if (cb) cb(true); return true; }
    if (falhou[id] || (id !== 'minis' && !disponivel(id)) || typeof document === 'undefined') { if (cb) cb(false); return false; }
    if (cb) (espera[id] || (espera[id] = [])).push(cb);
    if (!pedido[id]) {
      pedido[id] = true;
      const s = document.createElement('script');
      s.src = id === 'minis' ? 'js/assets/criacao/minis.js' : POR_ID[id].js;
      s.async = true;
      s.onerror = () => { falhou[id] = true; console.warn(`Criação: não foi possível carregar ${s.src}`); fim(id, false); };
      document.head.appendChild(s);
    }
    return false;
  }
  // Chamado pelo próprio arquivo da peça no fim
  function carregado(id) { fim(id, true); }

  // ------------------------------------------------------------ peças da aparência
  // Corpo, rosto, cabelo e barba escolhidos (ids do catálogo)
  // O bigode separado vale sem barba ou com uma barba em mechas (a do Meshy tem textura própria na célula)
  function bigodeDe(A) {
    if (!(A.bigodeG > 0)) return null;
    const b = A.barbaG > 0 ? BARBAS[Math.min(BARBAS.length, A.barbaG) - 1] : null;
    return !b || b.startsWith('barba_b_') ? BIGODES[Math.min(BIGODES.length, A.bigodeG) - 1] : null;
  }
  function pecasDe(def) {
    const A = def.aparencia || {};
    return {
      corpo: CORPOS[A.corpoG === 1 ? 1 : 0],
      rosto: `rosto_${Math.max(0, Math.min(7, A.rostoG | 0)) + 1}`,
      cabelo: (typeof PERS_CABELOS_GLB !== 'undefined' ? PERS_CABELOS_GLB[A.cabeloG | 0] : A.cabeloG > 0 ? `cabelo_${Math.min(8, A.cabeloG)}` : null) || null,
      barba: A.barbaG > 0 ? BARBAS[Math.min(BARBAS.length, A.barbaG) - 1] : null,
      bigode: bigodeDe(A),
    };
  }
  // O personagem usa o modelo com as peças GLB (estilo 'Realista') e as peças dele existem
  function usa(def) {
    if (!def || !def.aparencia || def.aparencia.estilo === 1 || !CAT.length) return false;
    const P = pecasDe(def);
    return [P.corpo, P.rosto, P.cabelo, P.barba, P.bigode].every((id) => !id || disponivel(id));
  }
  // Tudo da aparência carregado? (pede o que falta e chama cb quando completar)
  function pronto(def, cb) {
    const P = pecasDe(def), ids = [P.corpo, P.rosto, P.cabelo, P.barba, P.bigode].filter(Boolean);
    let falta = 0;
    for (const id of ids) if (!tem(id)) { falta++; carregar(id, () => { if (--falta === 0 && cb) cb(); }); }
    return falta === 0;
  }

  // A aparência pode entrar na tela já inteira? true: peças e imagens carregadas (o modelo novo sai
  // completo e pintado no mesmo quadro); false: ainda carregando (pede o que falta); 'falha': uma
  // das peças não carregou. A tela de criação só troca o personagem à vista com true: ele nunca fica
  // vazio nem sem textura, nem por um instante (antes, o modelo era refeito na hora como um
  // esqueleto vazio até a peça chegar: o personagem sumia a cada troca de cabelo ou barba).
  function preparar(def) {
    if (!def || !def.aparencia || def.aparencia.estilo === 1 || !CAT.length) return true;   // modelo paramétrico: sai na hora
    const P = pecasDe(def), ids = [P.corpo, P.rosto, P.cabelo, P.barba, P.bigode].filter(Boolean);
    let ok = true;
    for (const id of ids) {
      if (falhou[id] || !disponivel(id)) return 'falha';
      if (!tem(id)) { carregar(id); ok = false; continue; }
      const I = imagens(id);
      if (I.ok < I.n) ok = false;
    }
    return ok;
  }

  // ------------------------------------------------------------ imagens e malhas (compartilhadas)
  const IMG = {};
  function imagens(id) {
    if (IMG[id]) return IMG[id];
    const D = dados(id), I = IMG[id] = { n: 0, ok: 0, cbs: [] };
    for (const k of ['tex', 'mat', 'nrm', 'iris']) {   // (iris: máscara da íris dos rostos, para a cor dos olhos)
      if (!D || !D[k]) continue;
      I.n++;
      const im = I[k] = new Image();
      im.onload = im.onerror = () => { if (++I.ok === I.n) { const L = I.cbs; I.cbs = []; for (const f of L) f(); } };
      im.src = D[k];
    }
    return I;
  }
  function comImagens(id, cb) { const I = imagens(id); if (I.ok >= I.n) cb(I); else I.cbs.push(() => cb(I)); }
  // Malhas da peça no corpo, com a UV levada para a célula do atlas (meio texel de margem)
  const GEO = {};
  function geo(id, corpo, cel) {
    const k = `${id}|${corpo}|${cel}`;
    if (GEO[k]) return GEO[k];
    const D = dados(id), B = dados(corpo);
    if (!D || !B) return null;
    const fonte = D.tipo === 'corpo' ? D.skins : D.porCorpo && D.porCorpo[corpo];
    if (!fonte) return null;
    // (o cabelo com física traz os ossos das mechas, com as matrizes inversas de cada corpo)
    const SK = decodePeles3D({ q: D.q, inv: D.inv && D.inv[corpo] ? Object.assign({}, B.inv, D.inv[corpo]) : B.inv, skins: fonte });
    const [x, y, s] = CEL[cel], a = (x + 0.5) / LADO, b = (y + 0.5) / LADO, e = (s - 1) / LADO;
    SK.forEach((S, i) => {
      S.regiao = fonte[i].regiao || null;
      const A = S.att;
      for (let j = 0; j < A.length; j += 4) if (A[j + 2] > -0.5) { A[j] = a + A[j] * e; A[j + 1] = b + A[j + 1] * e; }
    });
    return (GEO[k] = SK);
  }

  // ------------------------------------------------------------ tintura
  const cor01 = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16) || 0; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const mediana = (a) => { a.sort((x, y) => x - y); return a[a.length >> 1]; };
  // Pele: os pixels com o tom parecido com a pele média da textura vão para a cor escolhida
  // (proporção canal a canal: sombras, poros e rubor continuam); lábios, olhos, sobrancelhas e a
  // roupa de baixo, de outro tom, mudam pouco ou nada
  function tingirPele(px, alvo) {
    const R = [], G = [], B = [];
    for (let i = 0; i < px.length; i += 4 * 29) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      if (r > 70 && r > g && g > b && r - b > 30) { R.push(r); G.push(g); B.push(b); }
    }
    if (R.length < 24) return;
    const ref = [mediana(R), mediana(G), mediana(B)], sr = ref[0] + ref[1] + ref[2], cr = ref[0] / sr, cg = ref[1] / sr;
    const k = [alvo[0] * 255 / ref[0], alvo[1] * 255 / ref[1], alvo[2] * 255 / ref[2]];
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2], s = r + g + b + 1;
      const d = Math.hypot(r / s - cr, g / s - cg), w = d < 0.035 ? 1 : d > 0.095 ? 0 : 1 - (d - 0.035) / 0.06;
      if (w <= 0 || s < 40) continue;
      px[i] = r + (Math.min(255, r * k[0]) - r) * w;
      px[i + 1] = g + (Math.min(255, g * k[1]) - g) * w;
      px[i + 2] = b + (Math.min(255, b * k[2]) - b) * w;
    }
  }
  // Cabelo e barba: a luminância de cada fio em relação à média, na cor escolhida (os reflexos e
  // as mechas escuras continuam; o branco vira loiro, o preto vira ruivo)
  function tingirCabelo(px, alvo) {
    const L = [];
    for (let i = 0; i < px.length; i += 4 * 23) { const l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]; if (l > 6) L.push(l); }
    if (L.length < 24) return;
    const ref = Math.max(8, mediana(L));
    for (let i = 0; i < px.length; i += 4) {
      const f = (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / ref, br = Math.max(0, f - 1.25) * 40;   // brilho forte: puxa para o claro
      px[i] = Math.min(255, alvo[0] * 255 * f + br);
      px[i + 1] = Math.min(255, alvo[1] * 255 * f + br);
      px[i + 2] = Math.min(255, alvo[2] * 255 * f + br);
    }
  }
  // Olhos: a íris (máscara feita pelo conversor a partir da posição de cada pixel na cabeça) vai
  // para a cor escolhida, com a luminância de cada pixel em relação à média da íris; a pupila
  // (bem escura) e o brilho (bem claro) ficam como estão
  function tingirOlhos(px, mk, alvo) {
    let s = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) if (mk[i] > 128) { s += 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]; n++; }
    if (n < 8) return 0;
    const ref = Math.max(20, s / n);
    for (let i = 0; i < px.length; i += 4) {
      const a = mk[i] / 255;
      if (a <= 0) continue;
      const f = (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / ref;
      if (f < 0.35 || f > 2.2) continue;
      const w = a * Math.min(1, (f - 0.35) / 0.2, (2.2 - f) / 0.4);
      for (let c = 0; c < 3; c++) px[i + c] += (Math.min(255, alvo[c] * 255 * (0.55 + 0.6 * f)) - px[i + c]) * w;
    }
    return n;
  }
  function tintas(def) {
    const A = def.aparencia || {};
    return {
      olhos: typeof PERS_OLHOS !== 'undefined' && PERS_OLHOS[A.olhos] ? cor01(PERS_OLHOS[A.olhos][1]) : null,
      pele: typeof PERS_PELES !== 'undefined' && PERS_PELES[A.pele] ? cor01(PERS_PELES[A.pele]) : null,
      cabelo: typeof PERS_CABELOS !== 'undefined' && PERS_CABELOS[A.corCabelo] ? cor01(PERS_CABELOS[A.corCabelo][1]) : null,
      // a barba: a cor própria ou a do cabelo
      barba: typeof PERS_CABELOS !== 'undefined' && A.corBarba > 0 && PERS_CABELOS[A.corBarba - 1] ? cor01(PERS_CABELOS[A.corBarba - 1][1])
        : typeof PERS_CABELOS !== 'undefined' && PERS_CABELOS[A.corCabelo] ? cor01(PERS_CABELOS[A.corCabelo][1]) : null,
    };
  }

  // ------------------------------------------------------------ atlas
  function tela(l, cor) {
    const c = document.createElement('canvas');
    c.width = c.height = l;
    const g = c.getContext('2d');
    g.fillStyle = cor; g.fillRect(0, 0, l, l);
    return c;
  }
  // Pinta a célula da peça nos três mapas (cor tingida, material e normais) e manda a textura
  // subir de novo para a placa de vídeo
  function pintar(m, cel, id, I) {
    const C = m.cria;
    if (!C || C.ids[cel] !== id) return;   // a peça já foi trocada
    const [x, y, s] = CEL[cel], T = C.tinta[TINTA[cel]];
    const gc = C.at.cor.getContext('2d');
    if (I.tex && I.tex.naturalWidth) {
      const olhos = cel === 'rosto' && C.tinta.olhos && I.iris && I.iris.naturalWidth;
      if (T || olhos) {
        const tmp = tela(s, '#000'), g = tmp.getContext('2d');
        g.drawImage(I.tex, 0, 0, s, s);
        const d = g.getImageData(0, 0, s, s);
        if (T) { if (TINTA[cel] === 'pele') tingirPele(d.data, T); else tingirCabelo(d.data, T); }
        if (olhos) {
          const mk = tela(s, '#000'), gk = mk.getContext('2d');
          gk.drawImage(I.iris, 0, 0, s, s);
          C.irisPx = tingirOlhos(d.data, gk.getImageData(0, 0, s, s).data, C.tinta.olhos);
        }
        gc.putImageData(d, x, y);
      } else gc.drawImage(I.tex, x, y, s, s);
    }
    const h = s / 2, gm = C.at.mat.getContext('2d'), gn = C.at.nrm.getContext('2d');
    if (I.mat && I.mat.naturalWidth) gm.drawImage(I.mat, x / 2, y / 2, h, h);
    else { gm.fillStyle = 'rgb(0,150,128)'; gm.fillRect(x / 2, y / 2, h, h); }
    if (I.nrm && I.nrm.naturalWidth) gn.drawImage(I.nrm, x / 2, y / 2, h, h);
    else { gn.fillStyle = 'rgb(128,128,255)'; gn.fillRect(x / 2, y / 2, h, h); }
    C.pintadas[cel] = id;
    if (cel === 'corpo') {
      // a célula do corpo limpa (para a roupa de baixo poder sair de novo)
      C.corpoLimpo = { cor: gc.getImageData(x, y, s, s), mat: gm.getImageData(x / 2, y / 2, h, h), nrm: gn.getImageData(x / 2, y / 2, h, h) };
    }
    if (cel === 'corpo' || cel === 'peitoral') roupaDeBaixo(m, false);
    subir(m);
  }
  function subir(m) {
    m.tex.versao = (m.tex.versao || 0) + 1;   // o renderizador realista sobe o atlas de novo quando muda
    if (typeof R3D !== 'undefined' && R3D.freeTex) R3D.freeTex(m.tex);
  }

  // ------------------------------------------------------------ o corpo por baixo da roupa
  // Com um peitoral vestido, a pele do tronco e dos braços vira, no atlas deste personagem, uma
  // roupa de baixo de tecido escuro na cor da peça (gibão e mangas): nas frestas entre as peças
  // (ombreira e manopla, gola, cintura) aparece tecido, não a pele nem a roupa íntima da textura
  // do corpo. Tirando o peitoral, a célula do corpo volta a ser a limpa.
  function roupaDeBaixo(m, subirJa = true) {
    const C = m && m.cria;
    if (!C || !C.corpoLimpo || C.pintadas.corpo !== C.ids.corpo) return;
    const [x, y, s] = CEL.corpo, h = s / 2, gc = C.at.cor.getContext('2d'), gm = C.at.mat.getContext('2d'), gn = C.at.nrm.getContext('2d');
    gc.putImageData(C.corpoLimpo.cor, x, y); gm.putImageData(C.corpoLimpo.mat, x / 2, y / 2); gn.putImageData(C.corpoLimpo.nrm, x / 2, y / 2);
    const pe = C.ids.peitoral;
    C.roupaDeBaixo = !!(pe && C.pintadas.peitoral === pe);
    if (C.roupaDeBaixo) {
      // cor: a média da célula do peitoral (sem os brilhos nem os pretos), escurecida
      const [px, py, ps] = CEL.peitoral, d = gc.getImageData(px, py, ps, ps).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4 * 37) { const l = d[i] + d[i + 1] + d[i + 2]; if (l > 45 && l < 560) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } }
      const k = 0.62, cor = n ? [r / n * k, g / n * k, b / n * k] : [44, 38, 36];
      const P = new Path2D(), P2 = new Path2D();
      for (const S of C.peles.corpo || []) {
        if (S.regiao !== 'tronco' && S.regiao !== 'bracos') continue;
        const A = S.att, I = S.idx;
        for (let t = 0; t < I.length; t += 3) {
          for (let j = 0; j < 3; j++) {
            const v = I[t + j], u = A[v * 4] * LADO, w = A[v * 4 + 1] * LADO;
            if (j) { P.lineTo(u, w); P2.lineTo(u / 2, w / 2); } else { P.moveTo(u, w); P2.moveTo(u / 2, w / 2); }
          }
          P.closePath(); P2.closePath();
        }
      }
      gc.save(); gc.clip(P);
      gc.fillStyle = `rgb(${cor.map((v) => Math.round(v)).join(',')})`; gc.fillRect(x, y, s, s);
      // trama do tecido: fios finos cruzados, um pouco mais claros e mais escuros
      gc.globalAlpha = 0.16;
      for (let i = -s; i < s; i += 3) {
        gc.strokeStyle = i % 6 ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,0.6)';
        gc.beginPath(); gc.moveTo(x + i, y); gc.lineTo(x + i + s, y + s); gc.stroke();
        gc.beginPath(); gc.moveTo(x + i + s, y); gc.lineTo(x + i, y + s); gc.stroke();
      }
      gc.restore();
      // material: tecido (sem metal, áspero) e relevo liso, sem os músculos da pele
      gm.save(); gm.clip(P2); gm.fillStyle = 'rgb(0,225,128)'; gm.fillRect(x / 2, y / 2, h, h); gm.restore();
      gn.save(); gn.clip(P2); gn.fillStyle = 'rgb(128,128,255)'; gn.fillRect(x / 2, y / 2, h, h); gn.restore();
    }
    if (subirJa) subir(m);
  }
  // A malha reduzida das peças não acompanha cada curva do corpo: onde a pele passaria por fora
  // de uma peça vestida (o peito sob o peitoral, os ombros, os joelhos, o rosto sob o elmo), o
  // corpo DESTE personagem recua para dentro dela (cópia própria das posições; as compartilhadas
  // ficam como estão). Refeito quando as peças mudam.
  const COBRE = ['peitoral', 'ombroE', 'ombroD', 'luvas', 'calcas', 'botas', 'capacete'];
  const OPC = { herdarPesos: true };   // (os testes de encaixe desligam para comparar o antes e o depois)
  const RECUA = ['corpo', 'rosto', 'barba', 'bigode'];
  function recuarCorpo(m) {
    const C = m && m.cria;
    if (!C) return;
    const pele = RECUA.flatMap((k) => C.peles[k] || []);
    for (const S of pele) {
      S._mapa = null;
      if (S.pos0) S.pos.set(S.pos0);
      if (S.bi0) { S.bi.set(S.bi0); S.bw.set(S.bw0); }   // os pesos originais (a peça anterior pode ter saído)
      if (S.bones0) { S.bones = S.bones0; S.inv = S.inv0; S.bones0 = S.inv0 = null; S.S = S.E = null; }   // e os ossos
      S.cobre = null;
    }
    // (o cabelo em mechas do Blender também cobre: o couro cabeludo de rostos maiores que a cabeça
    // de referência atravessava as mechas curtas)
    // de referência atravessava as mechas curtas); ali o recuo é menor (a testa sob a franja)
    const barbas = (C.ids.barba ? C.peles.barba || [] : []).concat(C.ids.bigode ? C.peles.bigode || [] : []);   // (a barba também cobre: o queixo e a mandíbula de rostos maiores atravessavam)
    const mechas = (C.ids.cabelo && POR_ID[C.ids.cabelo] && POR_ID[C.ids.cabelo].fisica ? C.peles.cabelo || [] : []).concat(barbas);
    const pecas = COBRE.flatMap((v) => C.peles[v] || []).concat(mechas);
    if (!pecas.length) return;
    const H = 1.2, G = new Map(), chave = (i, j, k) => (i * 92837111) ^ (j * 689287499) ^ (k * 283923481);
    pecas.forEach((P, pi) => {
      // recuo máximo: 7 nas armaduras (só a pele na sombra da peça recua, e fica sempre por baixo
      // dela; com 3, o peito e a cabeça mais largos que a peça ainda furavam o peitoral e o elmo),
      // 1 nas mechas do cabelo, 0,35 na barba (perto da boca o rosto afundava e ficava uma mancha
      // escura em volta do bigode)
      const p = P.pos, n = P.nor, mx = barbas.includes(P) ? 0.35 : mechas.includes(P) ? 1.0 : 7.0;
      for (let i = 0; i < p.length; i += 3) {
        const c = chave(Math.floor(p[i] / H), Math.floor(p[i + 1] / H), Math.floor(p[i + 2] / H));
        let L = G.get(c);
        if (!L) G.set(c, (L = []));
        L.push(p[i], p[i + 1], p[i + 2], n[i], n[i + 1], n[i + 2], mx, pi, i / 3);   // (pi: a peça; a barba não recua dentro de si mesma; o vértice)
      }
    });
    // Pesos herdados: a pele coberta por uma ARMADURA passa a seguir os ossos da peça, com os pesos
    // do vértice da peça que a cobre. Recuada para dentro na pose de repouso, a pele com pesos
    // próprios ainda podia furar a peça em movimento (ombro, cotovelo, joelho, tronco girando); com
    // os mesmos pesos, as duas se movem juntas em qualquer pose. (Cabelo e barba ficam fora: têm
    // ossos de mecha que o corpo não tem.)
    const armas = new Set(COBRE.flatMap((v) => C.peles[v] || []));
    // (a região da pele que não tem um osso da peça, como a do tronco sem o da cabeça na borda do
    // elmo, ganha esse osso na lista dela, com a matriz inversa de repouso da peça)
    const mapear = (P, S) => {
      let M = S._mapa && S._mapa.get(P);
      if (M) return M;
      M = P.bones.map((b, j) => {
        let i = S.bones.indexOf(b);
        if (i < 0 && S.bones.length < 255) {
          if (!S.bones0) { S.bones0 = S.bones; S.inv0 = S.inv; S.bones = S.bones.slice(); }
          const inv = new Float32Array(S.inv.length + 12);
          inv.set(S.inv); inv.set(P.inv.subarray(j * 12, j * 12 + 12), S.inv.length);
          S.inv = inv; S.bones.push(b); S.S = S.E = null;   // (as matrizes do R3D.skin são refeitas no tamanho novo)
          i = S.bones.length - 1;
        }
        return i;
      });
      (S._mapa || (S._mapa = new Map())).set(P, M);
      return M;
    };
    const MARGEM = 0.28, R2 = 2.3 * 2.3, LAT2 = 1.7 * 1.7;
    for (const S of pele) {
      if (!S.pos0) { S.pos0 = S.pos; S.pos = new Float32Array(S.pos0); }
      const p = S.pos, nb = S.nor, eu = pecas.indexOf(S);
      for (let i = 0; i < p.length; i += 3) {
        const X = p[i], Y = p[i + 1], Z = p[i + 2], ci = Math.floor(X / H), cj = Math.floor(Y / H), ck = Math.floor(Z / H);
        let best = R2, q = null, qo = 0;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
          const L = G.get(chave(ci + a, cj + b, ck + c));
          if (!L) continue;
          for (let t = 0; t < L.length; t += 9) {
            if (L[t + 7] === eu) continue;
            const dx = X - L[t], dy = Y - L[t + 1], dz = Z - L[t + 2], d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < best) { best = d2; q = L; qo = t; }
          }
        }
        if (!q) continue;
        let nx = q[qo + 3], ny = q[qo + 4], nz = q[qo + 5], sn = 1;
        if (nx * nb[i] + ny * nb[i + 1] + nz * nb[i + 2] < 0) { nx = -nx; ny = -ny; nz = -nz; sn = -1; }   // a face de dentro da peça
        const dx = X - q[qo], dy = Y - q[qo + 1], dz = Z - q[qo + 2], d = dx * nx + dy * ny + dz * nz;
        if (best - d * d > LAT2 || d <= -MARGEM) continue;            // fora da sombra da peça ou já por dentro
        const k = Math.min(q[qo + 6], d + MARGEM);
        p[i] = X - nx * k; p[i + 1] = Y - ny * k; p[i + 2] = Z - nz * k;
        const P = pecas[q[qo + 7]], vi = q[qo + 8];
        const reg = armas.has(P) ? [P, vi, sn, false] : null;
        if (reg) (S.cobre || (S.cobre = new Map())).set(i / 3, reg);   // (para medir o encaixe em cada pose)
        if (OPC.herdarPesos && armas.has(P) && S.bi && P.bi) {
          const M = mapear(P, S), v4 = (i / 3) * 4, a4 = vi * 4;
          // (um osso da peça que a pele não tem, como o ombro para a pele do rosto: os pesos são
          // redistribuídos nos ossos em comum, se eles somarem pelo menos metade)
          let soma = 0;
          for (let j = 0; j < 4; j++) if (P.bw[a4 + j] > 0 && M[P.bi[a4 + j]] >= 0) soma += P.bw[a4 + j];
          if (soma >= 0.5) {
            if (!S.bi0) { S.bi0 = S.bi; S.bw0 = S.bw; S.bi = new Uint8Array(S.bi0); S.bw = new Float32Array(S.bw0); }
            for (let j = 0; j < 4; j++) {
              const w = P.bw[a4 + j], b = w > 0 ? M[P.bi[a4 + j]] : -1;
              S.bi[v4 + j] = b >= 0 ? b : 0; S.bw[v4 + j] = b >= 0 ? w / soma : 0;
            }
            reg[3] = true;
          }
        }
      }
    }
  }
  // Encaixe medido numa pose (depois de R3D.skin no corpo e nas peças): de cada vértice de pele
  // coberto por uma armadura, a distância à superfície da peça pela normal dela (positiva = a pele
  // furou a peça). Devolve { n, fura (> 0,15), pior } por vaga
  function encaixe(m) {
    const C = m && m.cria, out = {};
    if (!C) return out;
    const vagaDe = new Map();
    for (const v of COBRE) for (const P of C.peles[v] || []) vagaDe.set(P, v);
    for (const k of RECUA) for (const S of C.peles[k] || []) {
      if (!S.cobre || !S.P) continue;
      for (const [i, [P, vi, sn, herdou]] of S.cobre) {
        if (!P.P || !P.N) continue;
        const v = vagaDe.get(P);
        if (!v) continue;
        const R = out[v] || (out[v] = { n: 0, fura: 0, pior: -1e9 });
        // (a normal da peça virada para o lado da pele, como no recuo: a pele por dentro fica no negativo)
        const d = sn * ((S.P[i * 3] - P.P[vi * 3]) * P.N[vi * 3] + (S.P[i * 3 + 1] - P.P[vi * 3 + 1]) * P.N[vi * 3 + 1] + (S.P[i * 3 + 2] - P.P[vi * 3 + 2]) * P.N[vi * 3 + 2]);
        R.n++;
        if (d > 0.15) { R.fura++; const c = `${k}${S.hide ? '(oculta)' : ''}${herdou ? '' : '·sem pesos'}`; (R.onde || (R.onde = {}))[c] = ((R.onde || {})[c] || 0) + 1; }
        if (d > R.pior) R.pior = d;
      }
    }
    return out;
  }

  // ------------------------------------------------------------ formato do rosto
  // Sete controles de 5 passos (−2 a +2; 0 = o rosto como veio): deformações suaves (gaussianas)
  // em volta de pontos do rosto medidos no corpo (nariz, alto da cabeça, pescoço, largura e
  // profundidade da cabeça). Mexem na malha do rosto e na da barba (que anda junto, sem descolar
  // da mandíbula); o pescoço, onde o rosto emenda no corpo, não se move.
  const FORMA = ['rLargura', 'rMandibula', 'rQueixo', 'rNariz', 'rBoca', 'rOlhos', 'rSobrancelha'];
  function formaDe(def) {
    const A = (def && def.aparencia) || {}, f = {};
    let algum = false;
    for (const k of FORMA) { const v = (Number.isInteger(A[k]) ? A[k] : 2) - 2; f[k] = v; if (v) algum = true; }
    return algum ? f : null;
  }
  const passo01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function deformarRosto(P, md, f) {
    const hh = md.topo - md.pescoco, L = md.largCabeca, cy = md.cy, frente = md.cx + md.profCabeca * 0.5;
    const nz = md.nariz, frenteP = md.cx + md.profPescoco * 0.5;
    const ga = (d2, r) => Math.exp(-d2 / (r * r));
    const pts = {
      queixo: [frente - 0.3, cy, nz - 0.3 * hh], nariz: [frente - 0.9, cy, nz + 0.02 * hh], boca: [frente - 0.4, cy, nz - 0.15 * hh],
      olhos: [-1, 1].map((s) => [frente - 0.9, cy + s * 0.19 * L, nz + 0.16 * hh]), sobr: [-1, 1].map((s) => [frente - 0.6, cy + s * 0.2 * L, nz + 0.27 * hh]),
    };
    const zJ = nz - 0.22 * hh;
    for (let i = 0; i < P.length; i += 3) {
      let x = P[i], y = P[i + 1], z = P[i + 2];
      // emenda do pescoço: parado embaixo, livre na frente do pescoço (o queixo) e acima dele
      const w = Math.max(passo01(md.corte + 0.15, md.corte + 0.9, z), passo01(frenteP + 0.1, frenteP + 0.6, x));
      if (w <= 0) continue;
      const dy = y - cy, frenteW = passo01(md.cx - 0.1 * md.profCabeca, md.cx + 0.25 * md.profCabeca, x);
      if (f.rLargura) y += dy * 0.05 * f.rLargura * w * frenteW * passo01(md.topo - 0.1 * hh, md.topo - 0.45 * hh, z);
      if (f.rMandibula) y += dy * 0.11 * f.rMandibula * w * ga((z - zJ) ** 2, 0.15 * hh) * passo01(0.05 * L, 0.3 * L, Math.abs(dy));
      if (f.rQueixo) {
        const q = pts.queixo, g = w * ga((x - q[0]) ** 2 + (y - q[1]) ** 2 + (z - q[2]) ** 2, 0.2 * hh);
        x += 0.32 * f.rQueixo * g; z -= 0.2 * f.rQueixo * g;
      }
      if (f.rBoca) { const b = pts.boca; y += dy * 0.15 * f.rBoca * w * frenteW * Math.exp(-((z - b[2]) ** 2) / (0.07 * hh) ** 2 - (dy * dy) / (0.25 * L) ** 2); }
      if (f.rNariz) {
        const n = pts.nariz, g = w * ga((x - n[0]) ** 2 + (y - n[1]) ** 2 + (z - n[2]) ** 2, 0.13 * hh), k = 0.18 * f.rNariz * g;
        x += (x - n[0]) * k; y += (y - n[1]) * k; z += (z - n[2]) * k;
      }
      if (f.rOlhos) for (const e of pts.olhos) {
        const g = w * ga((x - e[0]) ** 2 + (y - e[1]) ** 2 + (z - e[2]) ** 2, 0.09 * hh), k = 0.12 * f.rOlhos * g;
        x += (x - e[0]) * k; y += (y - e[1]) * k; z += (z - e[2]) * k;
      }
      if (f.rSobrancelha) for (const e of pts.sobr) z += 0.17 * f.rSobrancelha * w * ga((x - e[0]) ** 2 + (y - e[1]) ** 2 + (z - e[2]) ** 2, 0.12 * hh);
      P[i] = x; P[i + 1] = y; P[i + 2] = z;
    }
  }
  // Aplica nas peles do rosto e da barba recém-postas (cópias: a geometria decodificada é
  // compartilhada entre os personagens)
  function formaNasPeles(m, L) {
    const C = m.cria, f = C && C.forma, B = C && dados(C.corpo);
    if (!f || !B || !B.medida) return;
    for (const S of L) { const P = new Float32Array(S.pos); deformarRosto(P, B.medida, f); S.pos = P; }
  }

  // ------------------------------------------------------------ montagem
  // Põe (ou troca) a peça da célula: as malhas dela no esqueleto deste modelo e a textura no atlas
  function por(m, cel, id) {
    const C = m.cria, SK = id && geo(id, C.corpo, cel);
    if (!SK) { delete C.peles[cel]; delete C.ids[cel]; return false; }
    // cabelo com física: os ossos das mechas entram no esqueleto antes da pele
    if (cel === 'cabelo' && typeof CabeloFisica !== 'undefined') CabeloFisica.preparar(m, dados(id), C.corpo);
    const L = instPeles3D(SK, m);
    L.forEach((S, i) => { S.regiao = SK[i].regiao; });
    if (cel === 'cabelo' && m._cab) m._cab.peles = L;
    C.peles[cel] = L; C.ids[cel] = id;
    if (cel === 'rosto' || cel === 'barba' || cel === 'bigode') formaNasPeles(m, L);   // formato do rosto escolhido
    if (C.pintadas[cel] !== id) comImagens(id, (I) => pintar(m, cel, id, I));
    return true;
  }
  function juntar(m) { const C = m.cria, out = []; for (const k in C.peles) for (const S of C.peles[k]) out.push(S); m.skins = out; }
  // Modelo do personagem; null se ele não usa as peças GLB. Sem as peças carregadas ainda: o
  // esqueleto vazio (criaVazio), refeito quando terminarem de carregar
  function build(def) {
    if (!usa(def)) return null;
    const P = pecasDe(def);
    if (!pronto(def, () => refazer(def))) {
      const B0 = dados(P.corpo), m = MODELS3D.kael.build(B0 ? B0.props : undefined);
      for (const k in m.nodes) m.nodes[k].geo = null;
      m.skins = []; m.criaVazio = true; m.criado = def.id; m.corpo = new Set(Object.keys(m.nodes));
      return m;
    }
    const B = dados(P.corpo), m = MODELS3D.kael.build(B.props);
    for (const k in m.nodes) m.nodes[k].geo = null;
    m.corpo = new Set(Object.keys(m.nodes).filter((k) => k !== 'blade' && k !== 'hilt'));   // ossos do corpo (o retrato esconde o resto)
    // âncoras do retrato: centro do rosto e alto da cabeça, no espaço do osso da cabeça
    const md = B.medida, ih = B.inv.head, loc = (p) => [0, 1, 2].map((r) => ih[r * 4] * p[0] + ih[r * 4 + 1] * p[1] + ih[r * 4 + 2] * p[2] + ih[r * 4 + 3]);
    m.anchor('rosto', 'head', loc([md.cx + 1.4, md.cy, md.nariz + 0.7])).anchor('topo', 'head', loc([md.cx - 0.4, md.cy, md.topo + (P.cabelo ? 1.4 : 0.5)]));
    const at = { cor: tela(LADO, '#6a5a52'), mat: tela(LADO / 2, 'rgb(0,150,128)'), nrm: tela(LADO / 2, 'rgb(128,128,255)') };
    m.tex = { canvas: at.cor, mat: at.mat, nrm: at.nrm, bump: 0, pbr: true, glow: null };
    m.cria = { def, corpo: P.corpo, at, ids: {}, peles: {}, pintadas: {}, tinta: tintas(def), forma: formaDe(def) };
    por(m, 'corpo', P.corpo); por(m, 'rosto', P.rosto);
    if (P.cabelo) por(m, 'cabelo', P.cabelo);
    if (P.barba) por(m, 'barba', P.barba);
    if (P.bigode) por(m, 'bigode', P.bigode);
    juntar(m);
    recuarCorpo(m);
    m.sec = true;   // cabelo comprido e capa com movimento secundário (molas do rig do Kael)
    m.dqs = true;   // pele por quatérnios duplos: cotovelos, joelhos, ombros e quadris sem perder volume (R3D.skin)
    // medidas para as peças procedurais do Arsenal (as que não têm GLB): corpo e cabeça
    if (typeof PecasRig !== 'undefined' && PecasRig.medidas) {
      const R = PecasRig.medidas({ skins: m.cria.peles.corpo.concat(m.cria.peles.rosto) });
      if (R && R.head && P.cabelo) { const hd = R.head; R.head = { x0: hd.x0 - 0.45, x1: hd.x1, y0: hd.y0 - 0.45, y1: hd.y1 + 0.45, z0: hd.z0, z1: hd.z1 + 0.45 }; }
      m.medidasPecas = R;
    }
    return PersonagemModelo.finalizar(m, def);
  }
  // Terminou de carregar: o modelo vazio é refeito no próximo quadro
  function refazer(def) {
    const M = MODELS3D[def.model];
    if (M && M.model && M.model.criaVazio) M.model = null;
  }

  // ------------------------------------------------------------ armaduras GLB vestidas
  // Peças GLB à mostra agora: as da prévia (tela de criação ou de equipamento) ou as vestidas no
  // mundo aberto, menos as ocultas; nenhuma com uma armadura especial inteira
  function armadura(e, def) {
    const out = {};
    let V = null;
    if (e && e.pecasPrevia) V = e.pecasPrevia;
    else if (typeof game !== 'undefined' && game.world && typeof Arsenal !== 'undefined' && typeof World !== 'undefined' && World.state) V = Arsenal.vestidos(def.id);
    if (!V) return out;
    const esp = typeof SPECIAL_ARMOR_DEFS !== 'undefined' && typeof RosterManager !== 'undefined' && SPECIAL_ARMOR_DEFS[RosterManager.equippedArmor(def.id)];
    if (esp) return out;
    const oc = !e.pecasPrevia && typeof World !== 'undefined' && World.state ? Arsenal.S.ocultar : {};
    for (const s of VAGAS) { const it = V[s]; if (it && it.cat && POR_ID[it.cat] && disponivel(it.cat) && !oc[s]) out[s] = it.cat; }
    // peitoral que já traz ombreiras (os do Meshy): as ombreiras vestidas contam nos atributos, mas
    // não são desenhadas por cima das dele
    if (out.peitoral && POR_ID[out.peitoral].ombros) { delete out.ombroE; delete out.ombroD; }
    return out;
  }
  // A cada quadro (pose do modelo): troca as peças que mudaram, esconde o que fica dentro delas
  function pose(m, e, def) {
    const C = m && m.cria;
    if (!C) return;
    const want = armadura(e, def);
    let mudou = false;
    for (const v of VAGAS) {
      const id = want[v] || null;
      if ((C.ids[v] || null) === id) continue;
      if (!id) { delete C.peles[v]; delete C.ids[v]; mudou = true; continue; }
      if (!tem(id)) { carregar(id); continue; }   // chega num dos próximos quadros (a peça anterior fica)
      { const I = imagens(id); if (I.ok < I.n) continue; }   // e só entra com as imagens prontas (sai pintada)
      por(m, v, id); mudou = true;
    }
    if (mudou) {
      juntar(m);
      recuarCorpo(m);
      if (!C.ids.peitoral !== !C.roupaDeBaixo) roupaDeBaixo(m);   // tirou o peitoral (vestir pinta quando a peça chega)
    }
    const esc = {};
    for (const v of VAGAS) { const c = C.ids[v] && POR_ID[C.ids[v]]; if (c && c.esconde) for (const r of c.esconde) esc[r] = true; }
    for (const S of C.peles.corpo) S.hide = !!esc[S.regiao];
    if (C.peles.cabelo) for (const S of C.peles.cabelo) S.hide = !!C.ids.capacete;
    m.criaVagas = C.ids;   // o PecasRig não desenha a peça procedural destas vagas
  }
  // O atlas inteiro já está pintado (o retrato só é guardado depois disso)
  function pintado(m) { const C = m && m.cria; if (!C) return false; for (const k in C.ids) if (C.pintadas[k] !== C.ids[k]) return false; return true; }

  // Miniatura da peça (das PNG da pasta da criação, em data URI: js/assets/criacao/minis.js), já
  // decodificada, ou null (pede o arquivo das miniaturas na primeira vez)
  const MINI = {};
  function mini(id) {
    if (!id) return null;
    if (typeof CRIA_MINIS === 'undefined') { carregar('minis'); return null; }
    if (!CRIA_MINIS[id]) return null;
    if (!MINI[id]) { MINI[id] = new Image(); MINI[id].src = CRIA_MINIS[id]; }
    return MINI[id].complete && MINI[id].naturalWidth ? MINI[id] : null;
  }

  return { CAT, POR_ID, CEL, VAGAS, BARBAS, BIGODES, FORMA, deformarRosto, carregar, carregado, tem, disponivel, pecasDe, usa, pronto, preparar, encaixe, OPC, recuarCorpo, build, pose, pintado, armadura, mini, tingirPele, tingirCabelo };
})();
