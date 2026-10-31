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
  const BARBAS = ['barba_cacheada', 'barba_curta', 'barba_longa', 'barba_media', 'barba_viking'];
  const VAGAS = ['capacete', 'peitoral', 'luvas', 'calcas', 'botas', 'capa', 'acessorio', 'ombroE', 'ombroD'];
  const LADO = 2048;
  // células do atlas: [x, y, lado] em pixels da textura de cor (material e normais na metade)
  const CEL = {
    corpo: [0, 0, 1024], rosto: [1024, 0, 1024],
    cabelo: [0, 1024, 512], capacete: [512, 1024, 512], peitoral: [1024, 1024, 512], calcas: [1536, 1024, 512],
    botas: [0, 1536, 512], luvas: [512, 1536, 512], capa: [1024, 1536, 512],
    barba: [1536, 1536, 256], acessorio: [1792, 1536, 256],
    ombroE: [1536, 1792, 256], ombroD: [1792, 1792, 256],     // ombreiras dos conjuntos 50, 75 e 100
  };
  const TINTA = { corpo: 'pele', rosto: 'pele', cabelo: 'cabelo', barba: 'cabelo' };

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
  function pecasDe(def) {
    const A = def.aparencia || {};
    return {
      corpo: CORPOS[A.corpoG === 1 ? 1 : 0],
      rosto: `rosto_${Math.max(0, Math.min(7, A.rostoG | 0)) + 1}`,
      cabelo: A.cabeloG > 0 ? `cabelo_${Math.min(8, A.cabeloG)}` : null,
      barba: A.barbaG > 0 ? BARBAS[Math.min(5, A.barbaG) - 1] : null,
    };
  }
  // O personagem usa o modelo com as peças GLB (estilo 'Realista') e as peças dele existem
  function usa(def) {
    if (!def || !def.aparencia || def.aparencia.estilo === 1 || !CAT.length) return false;
    const P = pecasDe(def);
    return [P.corpo, P.rosto, P.cabelo, P.barba].every((id) => !id || disponivel(id));
  }
  // Tudo da aparência carregado? (pede o que falta e chama cb quando completar)
  function pronto(def, cb) {
    const P = pecasDe(def), ids = [P.corpo, P.rosto, P.cabelo, P.barba].filter(Boolean);
    let falta = 0;
    for (const id of ids) if (!tem(id)) { falta++; carregar(id, () => { if (--falta === 0 && cb) cb(); }); }
    return falta === 0;
  }

  // ------------------------------------------------------------ imagens e malhas (compartilhadas)
  const IMG = {};
  function imagens(id) {
    if (IMG[id]) return IMG[id];
    const D = dados(id), I = IMG[id] = { n: 0, ok: 0, cbs: [] };
    for (const k of ['tex', 'mat', 'nrm']) {
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
    const SK = decodePeles3D({ q: D.q, inv: B.inv, skins: fonte });
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
  function tintas(def) {
    const A = def.aparencia || {};
    return {
      pele: typeof PERS_PELES !== 'undefined' && PERS_PELES[A.pele] ? cor01(PERS_PELES[A.pele]) : null,
      cabelo: typeof PERS_CABELOS !== 'undefined' && PERS_CABELOS[A.corCabelo] ? cor01(PERS_CABELOS[A.corCabelo][1]) : null,
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
      if (T) {
        const tmp = tela(s, '#000'), g = tmp.getContext('2d');
        g.drawImage(I.tex, 0, 0, s, s);
        const d = g.getImageData(0, 0, s, s);
        if (TINTA[cel] === 'pele') tingirPele(d.data, T); else tingirCabelo(d.data, T);
        gc.putImageData(d, x, y);
      } else gc.drawImage(I.tex, x, y, s, s);
    }
    const h = s / 2, gm = C.at.mat.getContext('2d'), gn = C.at.nrm.getContext('2d');
    if (I.mat && I.mat.naturalWidth) gm.drawImage(I.mat, x / 2, y / 2, h, h);
    else { gm.fillStyle = 'rgb(0,150,128)'; gm.fillRect(x / 2, y / 2, h, h); }
    if (I.nrm && I.nrm.naturalWidth) gn.drawImage(I.nrm, x / 2, y / 2, h, h);
    else { gn.fillStyle = 'rgb(128,128,255)'; gn.fillRect(x / 2, y / 2, h, h); }
    C.pintadas[cel] = id;
    m.tex.versao = (m.tex.versao || 0) + 1;   // o renderizador realista sobe o atlas de novo quando muda
    if (typeof R3D !== 'undefined' && R3D.freeTex) R3D.freeTex(m.tex);
  }

  // ------------------------------------------------------------ montagem
  // Põe (ou troca) a peça da célula: as malhas dela no esqueleto deste modelo e a textura no atlas
  function por(m, cel, id) {
    const C = m.cria, SK = id && geo(id, C.corpo, cel);
    if (!SK) { delete C.peles[cel]; delete C.ids[cel]; return false; }
    const L = instPeles3D(SK, m);
    L.forEach((S, i) => { S.regiao = SK[i].regiao; });
    C.peles[cel] = L; C.ids[cel] = id;
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
    m.cria = { def, corpo: P.corpo, at, ids: {}, peles: {}, pintadas: {}, tinta: tintas(def) };
    por(m, 'corpo', P.corpo); por(m, 'rosto', P.rosto);
    if (P.cabelo) por(m, 'cabelo', P.cabelo);
    if (P.barba) por(m, 'barba', P.barba);
    juntar(m);
    m.sec = true;   // cabelo comprido e capa com movimento secundário (molas do rig do Kael)
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
      if (!tem(id)) { carregar(id); continue; }   // chega num dos próximos quadros
      por(m, v, id); mudou = true;
    }
    if (mudou) juntar(m);
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

  return { CAT, POR_ID, CEL, VAGAS, BARBAS, carregar, carregado, tem, disponivel, pecasDe, usa, pronto, build, pose, pintado, armadura, mini, tingirPele, tingirCabelo };
})();
