'use strict';
// ECLIPSE ZERO · Estruturas enviadas e geradas no mundo (Estruturas)
// ---------------------------------------------------------------------------
// As estruturas de assets/estruturas_ambiente/ (as enviadas e as geradas no Meshy a partir das folhas
// de referência, tools/meshy/gerar_estruturas.py) são reduzidas no Blender
// (tools/blender/cenario/estruturas.py → assets/models/estruturas/<id>.glb) e convertidas para o
// motor, uma por arquivo (tools/importar_prop.py --grupo estruturas → js/assets/estruturas/<id>.js,
// que junta o objeto ao PROPS3D). O índice leve (js/assets/estruturas/indice.js: nome, tipo,
// estilo e medidas) vai no index.html; o modelo de cada uma só é baixado quando a zona dela carrega.
// - Ao carregar a zona: os lugares da lista ZONAS (o pedido ou o mais perto livre) e os colisores
//   (pelas medidas do índice: o herói não entra num prédio que ainda está chegando).
// - Quando o modelo chega: o objeto entra na zona (Cenario.Objeto, modelo 'cen_<id>' do motor).
// - Vista isométrica: cada (estrutura, giro, escala, zoom) é fotografada uma vez pelo motor 3D
//   (R3D.foto) no começo de um quadro, como os prédios do bairro; até lá, um bloco simples.
// - 3ª pessoa: o modelo entra na cena pela fila dos moradores (ThirdView).
// Medievais na cidade principal (Aurora), na floresta e nas Ruínas Carmesins; cyberpunk na
// Metrópole e na cidade de Nexus (as duas subterrâneas).
// ---------------------------------------------------------------------------
const Estruturas = (() => {
  const IDX = typeof ESTRUTURAS_INDICE !== 'undefined' ? ESTRUTURAS_INDICE : {};
  const P2 = Math.PI / 2, PI = Math.PI;
  // Estruturas de beira: ficam na margem mais perto do lugar pedido (Agua.margemPerto), com o lado
  // do modelo que vai para a água (agua: ângulo no modelo, 0 = frente +x) virado para ela; recuo:
  // quanto o centro fica para dentro da terra, em meias medidas do modelo nesse eixo (o moinho põe a
  // roda na água; o cais fica com metade da passarela sobre ela; palmeiras, salgueiro e moitas de
  // beira ficam com a copa sobre a água e o tronco na terra)
  const BEIRA = { moinho: { agua: 0, recuo: 0.62 }, cais: { agua: P2, recuo: 0.05 }, cachoeira: { agua: 0, recuo: 0.35 },
    palmeira: { agua: 0, recuo: 0.9 }, salgueiro: { agua: 0, recuo: 0.75 }, moita: { agua: 0, recuo: 1.3 } };
  // [id, x, y (fração da sala), giro (rad), escala, beira?]: prédios grandes no fundo da sala (lados
  // de cima e da esquerda na vista isométrica), um pouco menores que o real (as salas têm ~33 m)
  const ZONAS = {
    velmora_clareira: [['estrutura_md_5', 0.13, 0.13, 0.4, 0.75], ['estrutura_md_1', 0.86, 0.12, 0, 0.7], ['quadro_de_missoes_medieval', 0.45, 0.16, 0.6, 1],
      ['item_ambiente_md_3', 0.3, 0.12, 0, 1], ['item_ambiente_md_1', 0.62, 0.12, 0.3, 1], ['item_ambiente_md_8', 0.55, 0.55, 0, 1],
      ['arvore_1', 0.88, 0.84, 0.7, 1.2], ['estrutura_md_13', 0.36, 0.84, 0.3, 1], ['planta_4', 0.62, 0.3, 0, 1]],
    // (as árvores do Meshy são as de destaque; a mata em volta é a do kit de natureza, js/mundo/natureza3d.js)
    velmora_trilha: [['estrutura_md_9', 0.12, 0.14, 0.5, 0.8], ['fast_travel', 0.6, 0.22, 2.4, 1], ['item_ambiente_md_4', 0.82, 0.5, 1, 1],
      ['arvore_4', 0.86, 0.84, 0, 1.2], ['arvore_1', 0.14, 0.78, 2.1, 1.1], ['planta_3', 0.32, 0.55, 0, 1]],
    // o arco com braseiros na entrada das Ruínas (os dois braseiros acesos: js/fogo.js COM_FOGO)
    velmora_ruinas: [['estrutura_md_16', 0.15, 0.15, 0.3, 0.9], ['estrutura_md_15', 0.82, 0.14, 0, 0.9], ['cachoeira', 0.14, 0.72, 1.2, 0.8, BEIRA.cachoeira], ['item_ambiente_md_9', 0.55, 0.45, 0, 1],
      ['arco_braseiros', 0.56, 0.8, 0.8, 1.1], ['arvore_6', 0.86, 0.86, 0.4, 1.1], ['rochas_grupo', 0.34, 0.86, 0.5, 1]],
    velmora_raizes: [['estrutura_md_14', 0.3, 0.12, 0, 1], ['estrutura_md_14', 0.45, 0.12, 0, 1], ['estrutura_md_12', 0.7, 0.2, 0, 1],
      ['arvore_3', 0.15, 0.8, 0.3, 1.2], ['rochas_grupo', 0.82, 0.74, 1.4, 1.1], ['planta_2', 0.56, 0.84, 0, 1]],
    velmora_coracao: [['arvore_6', 0.14, 0.16, 0, 1.3], ['arvore_3', 0.86, 0.16, 1.2, 1.2], ['rochas_grupo', 0.16, 0.84, 0.7, 1.1]],
    // moinho d'água na beira do rio que desce da Trilha (a roda, na frente do modelo, dentro d'água)
    // e o cais no lago (a ponta da passarela, no +y do modelo, sobre a água): BEIRA acima
    velmora_lago: [['casa_moinho_beira_do_rio', 0.4, 0.14, 0, 0.75, BEIRA.moinho], ['cais_com_barco', 0.86, 0.5, 0, 0.9, BEIRA.cais], ['estrutura_md_17', 0.5, 0.86, 0, 0.8],
      ['arvore_5', 0.18, 0.6, 0, 1.1, BEIRA.salgueiro], ['planta_5', 0.74, 0.76, 0, 1, BEIRA.moita], ['arvore_4', 0.12, 0.86, 0.8, 1.2]],
    rc_cidadela: [['estrutura_md_2', 0.08, 0.3, 0, 0.8], ['estrutura_md_6', 0.92, 0.32, 0, 0.8], ['fonte_do_guardiao', 0.5, 0.62, 0, 0.8],
      ['item_ambiente_md_7', 0.38, 0.12, 0, 1], ['item_ambiente_md_7', 0.62, 0.12, 0, 1]],
    rc_portao: [['estrutura_md_4', 0.5, 0.86, 0, 0.75], ['estrutura_md_12', 0.4, 0.4, 0, 1], ['estrutura_md_12', 0.6, 0.4, 0, 1]],
    rc_mercado: [['estrutura_md_7', 0.25, 0.14, 0.3, 1], ['moonlit_medieval_mark', 0.72, 0.14, -0.3, 1], ['banca_ceramica', 0.15, 0.55, P2, 1], ['hearthside_forge', 0.85, 0.82, 2.6, 0.8],
      ['estrutura_md_8', 0.4, 0.8, 1, 1], ['item_ambiente_md_2', 0.62, 0.62, 0.4, 1], ['forno_pedra', 0.86, 0.5, -P2, 1]],
    rc_catedral: [['estrutura_md_3', 0.5, 0.12, 0, 0.7], ['estrutura_md_10', 0.2, 0.75, 0, 1], ['item_ambiente_md_5', 0.35, 0.3, 0, 1], ['item_ambiente_md_6', 0.65, 0.3, 0, 1]],
    rc_quartel: [['castelo_medieval', 0.18, 0.15, 0, 0.6], ['canhao_medieval', 0.55, 0.3, 0.6, 1], ['canhao_medieval', 0.7, 0.3, 0.4, 1], ['blue_roof_cottage', 0.86, 0.82, -2.4, 0.8]],
    rc_jardins: [['estrutura_md_11', 0.5, 0.5, 0, 0.8], ['escadaria_ruinas', 0.85, 0.15, -0.4, 0.9], ['muro_ruinas_placa', 0.15, 0.3, 0.3, 1],
      ['arvore_2', 0.82, 0.78, 0.5, 1.1], ['arvore_6', 0.12, 0.16, 0, 1.1], ['planta_5', 0.36, 0.64, 0, 1, BEIRA.moita], ['planta_1', 0.4, 0.5, 0, 1], ['planta_2', 0.6, 0.5, 0, 1]],
    // Oásis de Seraph: palmeiras na beira do lago, a figueira larga e as rochas; no Mar de Dunas, rochas e uma árvore seca
    seraph_oasis: [['arvore_7', 0.5, 0.3, 0, 1, BEIRA.palmeira], ['arvore_7', 0.72, 0.46, 0, 1.1, BEIRA.palmeira], ['arvore_7', 0.28, 0.56, 0, 0.95, BEIRA.palmeira],
      ['arvore_7', 0.42, 0.7, 0, 1.05, BEIRA.palmeira], ['planta_6', 0.36, 0.4, 0, 1, BEIRA.moita], ['arvore_8', 0.16, 0.22, 0.4, 1], ['rochas_grupo', 0.84, 0.8, 0.3, 1]],
    seraph_dunas: [['rochas_grupo', 0.28, 0.3, 0, 1.3], ['rochas_grupo', 0.74, 0.7, 1.1, 1.1], ['arvore_6', 0.8, 0.22, 0.5, 1]],
    // Refúgio da Aurora (cidade principal, medieval): a praça do mercado com os assets gerados no
    // Meshy — fileira de bancas, forno e carroças, estandartes, lampiões e a Fonte do Guardião
    aurora: [['altar_cristal', 0.42, 0.42, 0, 1], ['fonte_do_guardiao', 0.5, 0.42, 0, 0.75], ['moonlit_medieval_mark', 0.3, 0.3, 0.4, 0.9], ['banca_ceramica', 0.4, 0.26, 0.2, 0.9], ['estrutura_md_7', 0.6, 0.26, -0.2, 0.9],
      ['forno_pedra', 0.72, 0.3, -0.5, 0.9], ['estrutura_md_8', 0.24, 0.62, 1.2, 0.9], ['item_ambiente_md_4', 0.76, 0.62, 2.2, 1], ['item_ambiente_md_3', 0.34, 0.2, 0, 1],
      ['item_ambiente_md_1', 0.66, 0.2, 0.4, 1], ['item_ambiente_md_5', 0.42, 0.55, 0, 1], ['item_ambiente_md_6', 0.58, 0.55, 0, 1], ['estrutura_md_12', 0.36, 0.44, 0, 1],
      ['estrutura_md_12', 0.64, 0.44, 0, 1], ['estrutura_md_10', 0.84, 0.46, 0, 0.9], ['canhao_medieval', 0.16, 0.42, 0.8, 1],
      ['arvore_2', 0.38, 0.85, 0, 1.1], ['arvore_2', 0.9, 0.86, 1.5, 1.1], ['planta_1', 0.42, 0.34, 0, 0.8], ['planta_1', 0.58, 0.34, 1.2, 0.8]],
    aurora_bairro: [['item_ambiente_md_2', 0.62, 0.56, 0.3, 1], ['muro_ruinas_placa', 0.86, 0.9, 2.4, 1]],
    // Metrópole (subterrânea, segura): a rua da Praça Central com os assets do Meshy — lojas, hotel,
    // ponto de ônibus, máquinas de venda, carro e moto estacionados, totens e painel (o arco neon fica no
    // Portão de Nexus: aqui a saída de baixo, onde ele ia, é a passagem da zona; o hotel do Mercado
    // não cabia na sala e fica o da Praça)
    metro_centro: [['edificio_cyberpunk', 0.08, 0.32, P2, 0.6], ['estrutura_cbp_1', 0.92, 0.35, -P2, 0.7], ['loja_armas', 0.22, 0.1, 0, 0.75], ['loja_tecnologia', 0.5, 0.1, 0, 0.75],
      ['hotel_neon', 0.78, 0.1, 0, 0.55], ['ponto_onibus', 0.35, 0.9, PI, 0.9], ['maquina_venda', 0.45, 0.26, 0, 1], ['maquina_venda', 0.58, 0.26, 0, 1], ['carro_neon', 0.66, 0.88, 0.2, 1],
      ['moto_neon', 0.75, 0.86, 0.4, 1], ['totem_info', 0.3, 0.5, 0.8, 1], ['totem_info', 0.7, 0.5, -0.8, 1], ['painel_anuncio', 0.6, 0.12, 0, 1],
      ['item_ambiente_cbp_1', 0.4, 0.6, 0.3, 1], ['drone_carga', 0.2, 0.7, 0.6, 1]],
    metro_porto: [['estrutura_cbp_2', 0.82, 0.14, 0, 0.75], ['item_ambiente_cbp_2', 0.3, 0.5, 0.5, 1], ['item_ambiente_cbp_3', 0.36, 0.56, 1.2, 1]],
    metro_torres: [['estrutura_cbp_7', 0.12, 0.3, 0, 0.6], ['estrutura_cbp_6', 0.86, 0.5, 0, 0.6], ['apartamento_urbano', 0.4, 0.12, 0, 0.6]],
    metro_trilhos: [['monotrilho_futurista', 0.5, 0.15, 0, 0.8], ['viaduto_cyberpunk', 0.5, 0.82, 0, 0.8]],
    metro_mercado: [['neon_cyberpunk_bar', 0.14, 0.13, 0.3, 0.7], ['loja_armas', 0.13, 0.8, P2, 0.75], ['neon_night_cafe', 0.5, 0.12, 0, 0.8],
      ['maquina_venda', 0.6, 0.5, 0, 1], ['item_ambiente_cbp_4', 0.4, 0.55, 0, 1], ['painel_anuncio', 0.3, 0.3, 0.3, 1], ['totem_info', 0.7, 0.32, -0.3, 1], ['moto_neon', 0.86, 0.6, 2.6, 1]],
    // Cidade de Nexus (subterrânea): o portão de setor na chegada e as ruas com o neon
    nexus_portao: [['portao_setor', 0.5, 0.12, 0, 0.9], ['arco_neon', 0.5, 0.88, 0, 0.8], ['totem_info', 0.3, 0.5, 0.6, 1], ['maquina_venda', 0.7, 0.5, -0.6, 1]],
    nexus_avenida: [['apartamento_urbano', 0.12, 0.14, 0, 0.55], ['estrutura_cbp_6', 0.88, 0.14, 0, 0.55], ['carro_neon', 0.5, 0.5, P2, 1], ['ponto_onibus', 0.3, 0.86, PI, 0.9]],
    nexus_mercado: [['neon_night_cafe', 0.2, 0.15, 0.3, 0.8], ['loja_tecnologia', 0.8, 0.15, -0.3, 0.8], ['maquina_venda', 0.5, 0.5, 0, 1]],
    metro_industrial: [['estrutura_cbp_3', 0.15, 0.15, 0, 0.65], ['estrutura_cbp_5', 0.85, 0.2, PI, 0.7], ['oficina_mecanica', 0.85, 0.8, -2.4, 0.8]],
    metro_subnivel: [['sci_fi_clinic', 0.14, 0.14, 0.2, 0.7], ['loja_tecnologia', 0.85, 0.15, -0.2, 0.8], ['ponto_onibus', 0.5, 0.8, PI, 1]],
    metro_arcologia: [['estufa_cupula', 0.5, 0.15, 0, 0.6], ['urban_blossom_terrace', 0.15, 0.75, 0.6, 0.8], ['torre_antena', 0.88, 0.8, 0, 0.8]],
  };
  const estado = {};          // id → 'carregando' | 'pronto' | 'falhou'
  const FOTOS = new Map(), FILA = new Map();
  let atual = null;           // { room, lug: [{ id, x, y, giro, esc, obj }] }

  // ------------------------------------------------------------ o arquivo de cada estrutura
  function carregar(id) {
    if (estado[id]) return;
    if (typeof PROPS3D !== 'undefined' && PROPS3D[id]) { estado[id] = 'pronto'; return; }
    if (typeof document === 'undefined') return;
    estado[id] = 'carregando';
    const s = document.createElement('script');
    s.src = `js/assets/estruturas/${id}.js`;
    s.onerror = () => { estado[id] = 'falhou'; console.warn(`Estruturas: não foi possível carregar js/assets/estruturas/${id}.js`); };
    document.head.appendChild(s);
  }
  // Chamado pelo próprio js/assets/estruturas/<id>.js no fim
  function chegou(id) {
    estado[id] = 'pronto';
    if (typeof Cenario !== 'undefined') Cenario.registrarModelos();
    colocar();
  }

  // ------------------------------------------------------------ o objeto na zona
  class Estrutura extends Cenario.Objeto {
    constructor(id, x, y, giro, esc) {
      super(id, x, y, giro, esc);
      this.foto3d = true;              // vista isométrica: a foto (Game não põe na fila do motor a cada quadro)
      this.key = null;                 // 3ª pessoa: entra pela Estruturas.fila3P (parada: matriz e vértices guardados), não como morador
      this.estrutura = id;
      this.name = '';
    }
    modelo3D() { return game.model3('cen_' + this.cenId); }
    chave(scale) { return `${this.cenId}|${this.facing.toFixed(2)}|${this.escalaCen}|${scale}`; }
    foto() {
      if (!game.use3D || typeof R3D === 'undefined' || !R3D.active) return null;
      const scale = game.roomScale ? game.roomScale() : 1, k = this.chave(scale), f = FOTOS.get(k);
      if (f) return f;
      if (!FILA.has(k)) FILA.set(k, { id: this.cenId, giro: this.facing, esc: this.escalaCen, scale });
      return null;
    }
    draw(ctx) {
      const f = this.foto(), sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
      if (f) { ctx.drawImage(f.canvas, sx + f.minX, sy + f.minY, f.canvas.width / f.s, f.canvas.height / f.s); return; }
      bloco(ctx, this.x, this.y, IDX[this.cenId], this.escalaCen);
    }
    drawEmissive(ctx) {
      const f = this.foto();
      if (!f || !f.emi) return;
      const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), noite = typeof WorldTime !== 'undefined' ? 1 - WorldTime.luz() : 0.5;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + 0.45 * noite;
      ctx.drawImage(f.emi, sx + f.minX, sy + f.minY, f.canvas.width / f.s, f.canvas.height / f.s);
      ctx.restore();
    }
  }
  // Enquanto o modelo não chega (ou sem o motor 3D): um bloco nas medidas reais
  function bloco(ctx, x, y, I, esc) {
    if (!I) return;
    const w = I.w * esc / 2, d = I.d * esc / 2, H = I.h * esc;
    const P = (a, b, z = 0) => [isoX(x + a, y + b), isoY(x + a, y + b) - z];
    const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); };
    const cy = I.estilo === 'cyberpunk';
    poly([P(w, -d), P(w, d), P(w, d, H), P(w, -d, H)], cy ? 'rgba(30,34,52,0.9)' : 'rgba(70,58,44,0.9)');
    poly([P(-w, d), P(w, d), P(w, d, H), P(-w, d, H)], cy ? 'rgba(40,46,70,0.9)' : 'rgba(92,76,56,0.9)');
    poly([P(-w, -d, H), P(w, -d, H), P(w, d, H), P(-w, d, H)], cy ? 'rgba(54,60,90,0.9)' : 'rgba(110,60,44,0.9)');
  }
  // Colisores pela planta: um círculo, ou uma fileira deles ao longo do lado comprido
  function colisores(I, x, y, giro, esc) {
    const a = I.w * esc, b = I.d * esc, curto = Math.min(a, b), longo = Math.max(a, b);
    if (longo < curto * 1.5) return [{ x, y, r: I.r * esc * 0.85 }];
    const n = Math.max(2, Math.round(longo / curto)), r = curto * 0.45 + 2, passo = (longo - curto) / (n - 1);
    // w ao longo de +x do modelo (frente do jogo), d ao longo de +y; o giro roda os dois
    const ex = a >= b ? [Math.cos(giro), Math.sin(giro)] : [-Math.sin(giro), Math.cos(giro)];
    const out = [];
    for (let k = 0; k < n; k++) { const t = (k - (n - 1) / 2) * passo; out.push({ x: x + ex[0] * t, y: y + ex[1] * t, r }); }
    return out;
  }

  // ------------------------------------------------------------ zona
  // Quem anda ou nasce em lugar sorteado (moradores, animais, companheiros, montarias, pontos de coleta)
  // não tira uma estrutura do lugar: sai do caminho dela (afastar). Portais, portões, baús, bancas,
  // estações e objetos do cenário continuam valendo (a estrutura procura outro lugar livre).
  // (as classes de outros arquivos não ficam em globalThis: cada uma pelo nome, se já existir)
  const movel = (q) => q.kind === 'coleta' || q.kind === 'monumento' ||   // (monumento: o ponto de interação da Chama da Aurora, sem corpo; o altar é a estrutura)
    (typeof Morador !== 'undefined' && q instanceof Morador) || (typeof AnimalCidade !== 'undefined' && q instanceof AnimalCidade) ||
    (typeof CompanheiroPet !== 'undefined' && q instanceof CompanheiroPet) || (typeof MontariaEnt !== 'undefined' && q instanceof MontariaEnt);
  function afastar(R, g, x, y, r) {
    for (const q of g.npcs) {
      if (q.estrutura || !movel(q)) continue;
      const d = dist(q.x, q.y, x, y), raio = r + (q.r || 12) + 14;
      if (d >= raio) continue;
      const a0 = d > 1 ? Math.atan2(q.y - y, q.x - x) : 0;
      for (let k = 0; k < 12; k++) {
        const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 6, nx = x + Math.cos(a) * raio, ny = y + Math.sin(a) * raio;
        if (R.canStand(nx, ny, q.r || 12)) { q.x = nx; q.y = ny; if (q.homeX !== undefined) { q.homeX = nx; q.homeY = ny; } break; }
      }
    }
  }
  // Lugares e colisores da zona que carregou; pede os modelos
  function aoCarregar(z) {
    atual = null;
    const L = z && ZONAS[z.id];
    if (!L || typeof game === 'undefined' || !game.room) return 0;
    const g = game, R = g.room, lug = [];
    for (const [id, fx, fy, giro0, esc0, beira] of L) {
      const I = IDX[id];
      if (!I) continue;
      let esc = esc0, r = I.r * esc;
      const ocupado = (x, y) => g.npcs.some((q) => !q.estrutura && !movel(q) && dist(q.x, q.y, x, y) < r + 50) || lug.some((o) => dist(o.x, o.y, x, y) < r + IDX[o.id].r * o.esc + 10);
      const livre = (x, y) => R.canStand(x, y, Math.min(r, 60)) && !ocupado(x, y) && (beira || !(typeof Agua !== 'undefined' && Agua.profundidade(x, y) > 0));
      let x = R.w * fx, y = R.h * fy, giro = giro0;
      const M = beira && typeof Agua !== 'undefined' && Agua.margemPerto ? Agua.margemPerto(x, y) : null;
      if (beira && !M) continue;   // estrutura de beira sem água na zona: não fica jogada no seco
      if (M) {
        const meia = (Math.abs(Math.cos(beira.agua)) > 0.5 ? I.w : I.d) * esc / 2;
        x = M.x + M.nx * meia * beira.recuo; y = M.y + M.ny * meia * beira.recuo;
        giro = Math.atan2(-M.ny, -M.nx) - beira.agua;
        if (ocupado(x, y)) continue;   // (na margem não há para onde fugir: em cima de um portal ou de outra estrutura, fica de fora)
      } else if (!livre(x, y)) {
        // perto do lugar pedido (anéis até 240); sem lugar, a peça tenta de novo um pouco menor (85%
        // e 70%) em vez de sumir ou ir parar no meio da sala (os prédios grandes das salas cheias da
        // Metrópole e do Portão ficavam de fora)
        const x0 = x, y0 = y;
        let achou = false;
        for (const k of [1, 0.85, 0.7]) {
          esc = esc0 * k; r = I.r * esc;
          if (k < 1 && livre(x0, y0)) { achou = true; break; }
          for (let d = 40; d <= 240 && !achou; d += 40) for (let j = 0, n = d < 160 ? 8 : 12; j < n && !achou; j++) { const a = j * 2 * Math.PI / n, nx = x0 + Math.cos(a) * d, ny = y0 + Math.sin(a) * d; if (livre(nx, ny)) { x = nx; y = ny; achou = true; } }
          if (achou) break;
        }
        if (!achou) { if (typeof console !== 'undefined') console.info(`Estruturas: ${id} sem lugar livre em ${z.id}`); continue; }
      }
      for (const c of colisores(I, x, y, giro, esc)) { R.pillars.push(Object.assign(c, { h: I.h * esc, cenario: true, estrutura: id, sprite: null })); afastar(R, g, c.x, c.y, c.r); }
      for (let i = R.pillars.length - 1; i >= 0; i--) { const q = R.pillars[i]; if (q.enfeite && dist(q.x, q.y, x, y) < r + 24) R.pillars.splice(i, 1); }
      lug.push({ id, x, y, giro, esc, obj: null });
      carregar(id);
    }
    atual = { room: R, lug };
    if (typeof Fogo !== 'undefined') Fogo.estruturas(lug);   // braseiros acesos, fogo e fumaça dos fornos e forjas (js/fogo.js)
    if (typeof Agua !== 'undefined' && Agua.cachoeira) for (const q of lug) if (q.id === 'cachoeira') Agua.cachoeira(q.x, q.y, IDX[q.id].r * q.esc);
    colocar();
    return lug.length;
  }
  // Os que já chegaram entram na zona (uma vez cada)
  function colocar() {
    if (!atual || typeof game === 'undefined' || game.room !== atual.room) return;
    for (const L of atual.lug) {
      if (L.obj || estado[L.id] !== 'pronto' || typeof PROPS3D === 'undefined' || !PROPS3D[L.id]) continue;
      L.obj = new Estrutura(L.id, L.x, L.y, L.giro, L.esc);
      game.npcs.push(L.obj);
    }
  }
  // Começo do quadro (motor 3D livre): fotografa uma estrutura que falta
  function processar() {
    if (!FILA.size || typeof R3D === 'undefined' || !R3D.active || R3D.used) return;
    for (const [k, F] of FILA) {
      const m = game.model3('cen_' + F.id);
      if (!m) { FILA.delete(k); continue; }
      if (!texturasProntas(m)) continue;
      const o = { yaw: F.giro, scale: F.esc, lift: 0, roll: 0, pitch: 0, flash: 0, emi: 1, holo: false, ghost: null, tint: null };
      const f = R3D.foto(m, o, F.scale);
      if (!f) return;
      FOTOS.set(k, f);
      FILA.delete(k);
      if (FOTOS.size > 48) FOTOS.delete(FOTOS.keys().next().value);   // (zooms antigos saem primeiro)
      return;   // uma por quadro
    }
  }
  function texturasProntas(m) {
    const tex = m.tex;
    if (!tex) return true;
    const mt = tex.mat ? (tex.matTex || (tex.matTex = typeof tex.mat === 'string' ? { src: tex.mat } : { canvas: tex.mat })) : null;
    const nt = tex.nrm ? (tex.nrmTex || (tex.nrmTex = typeof tex.nrm === 'string' ? { src: tex.nrm } : { canvas: tex.nrm })) : null;
    for (const t of [tex, mt, nt]) if (t && R3D.texOf(t) === R3D.blankTex) return false;
    return true;
  }

  // 3ª pessoa (ThirdView, depois do bairro): as estruturas paradas, com a matriz uma vez e os vértices
  // guardados pelo motor (o.fixo); somem se a câmera está dentro delas ou longe demais. E: olho da câmera
  function fila3P(R, Q, E) {
    if (!atual || atual.room !== R) return;
    for (const L of atual.lug) {
      if (!L.obj) continue;
      const I = IDX[L.id], r = I.r * L.esc;
      const d2 = (E[0] - L.x) ** 2 + (E[1] - L.y) ** 2;
      if (d2 < (r + 20) ** 2 || d2 > 2200 * 2200) continue;
      const m = game.model3('cen_' + L.id);
      if (!m) continue;
      let o = L.o3;
      if (!o) {
        o = L.o3 = { m: M3.make(), fixo: true, flash: 0, emi: 1, holo: false, ghost: null, tint: null, scale: 1, lift: 0, roll: 0, pitch: 0, yaw: 0,
          vento: IDX[L.id] && IDX[L.id].tipo === 'arvore' ? 0.6 : IDX[L.id] && IDX[L.id].tipo === 'planta' ? 1 : /^item_ambiente_md_[567]$/.test(L.id) ? 1.8 : 0 };   // árvores, plantas e estandartes ao vento
        M3.trs(o.m, [L.x, L.y, typeof Relevo !== 'undefined' ? Relevo.altura(L.x, L.y) - (IDX[L.id] && (IDX[L.id].tipo === 'arvore' || IDX[L.id].tipo === 'planta') ? Relevo.inclinacao(L.x, L.y) * Math.min(IDX[L.id].r * L.esc, 40) * 0.6 : 0) : 0], [0, 0, L.giro], [L.esc, L.esc, L.esc]);   // (no relevo: o pé no chão; árvore em ladeira entra um pouco na terra do lado de cima)
      }
      const it = R3D.queue(m, null, null, o);
      it.ent = null;
      Q.push(it);
    }
  }
  // Streaming (World.preCarregar): os modelos de uma zona vizinha começam a chegar antes da travessia
  function preCarregar(zid) { for (const L of ZONAS[zid] || []) if (IDX[L[0]]) carregar(L[0]); }

  return { IDX, ZONAS, aoCarregar, preCarregar, fila3P, chegou, carregar, colocar, processar, colisores, estado, FOTOS, FILA, Estrutura, atual: () => atual };
})();
