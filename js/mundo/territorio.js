'use strict';
// ECLIPSE ZERO · Território de Velmora: a região inicial aberta, grande e contínua (Territorio)
// ---------------------------------------------------------------------------
// Grandes Regiões, etapa 4 (docs/REGIOES_CONTINUAS.md). A Floresta de Velmora deixa de ser um bloco de
// 2 × 3 zonas: vira um território de 5 × 5, as 6 de antes no canto de cima (a Clareira, a chegada, no
// canto) e 19 zonas novas em volta, maiores (60 a 64 tiles, ~100 m de lado), sem tela de carregamento
// entre elas (campo aberto: anda-se pela borda; a vizinha já está à vista: js/mundo/vizinhos.js).
// Cada zona nova é de um TIPO, com o conteúdo dele montado com o que o projeto já tem:
//   campo     planície com capim, flores e árvores esparsas; acampamentos espalhados
//   bosque    mata fechada (mais árvores, menos grama); acampamentos
//   vila      vilarejo: casas, poço, banca, forno, ferraria e moinho (GLB), carroça, feno e cerca (kit
//             do Blender), mercador e moradores com serviços; sem inimigos
//   ruina     ruínas antigas (arcos, colunas, escadaria, torre de pedra), baú escondido e terminal
//   forte     fortificação abandonada (portão de castelo, torres, paliçada, canhão) com o acampamento
//             mais forte e o baú do capitão
//   rio, lago o rio que nasce no Lago Escuro e desce pelo território até o Lago das Garças
// Os caminhos (Paisagem: do centro de cada zona a cada passagem, por A* no relevo) ligam tudo numa
// rede de trilhas; a vegetação, as rochas e as árvores vêm da semente de cada zona. O nível sobe com a
// distância da Clareira (8 → 16). A Coroa de Velmora continua no Coração de Velmora.
// ---------------------------------------------------------------------------
const Territorio = (() => {
  const REG = 'velmora', MOBS = ['lobo_raiz', 'esporo', 'rastejador', 'lobo_raiz', 'cacador'];
  const P2 = Math.PI / 2;
  // [id, nome, linha, coluna, tipo, extras]
  const ZONAS = [
    ['velmora_campos_vento', 'Campos do Vento', 0, 3, 'campo'],
    ['velmora_pedramusgo', 'Vilarejo de Pedramusgo', 0, 4, 'vila', { portal: true }],
    ['velmora_corujas', 'Bosque das Corujas', 1, 3, 'bosque'],
    ['velmora_forte', 'Forte Abandonado', 1, 4, 'forte'],
    ['velmora_prado', 'Prado das Flores', 2, 0, 'campo'],
    ['velmora_vau', 'Vau do Rio Escuro', 2, 1, 'rio'],
    ['velmora_aqueduto', 'Ruínas do Aqueduto', 2, 2, 'ruina', { terminal: ['O aqueduto levava água da serra até a cidade velha.', 'Quando a cidade caiu, a água continuou correndo. Para ninguém.'] }],
    ['velmora_feno', 'Campos de Feno', 2, 3, 'campo', { fazenda: true }],
    ['velmora_mata_fechada', 'Mata Fechada', 2, 4, 'bosque', { secret: true }],
    ['velmora_moinho', 'Vilarejo do Moinho', 3, 0, 'vila', { portal: true }],
    ['velmora_ponte_velha', 'Ponte Velha', 3, 1, 'rio'],
    ['velmora_pedras', 'Planície das Pedras', 3, 2, 'campo', { pedras: true }],
    ['velmora_cacadores', 'Acampamento dos Caçadores', 3, 3, 'forte', { acampamento: true }],
    ['velmora_colinas', 'Colinas Verdes', 3, 4, 'campo'],
    ['velmora_sombrio', 'Bosque Sombrio', 4, 0, 'bosque', { secret: true }],
    ['velmora_curva', 'Curva do Rio', 4, 1, 'rio'],
    ['velmora_garcas', 'Lago das Garças', 4, 2, 'lago'],
    ['velmora_torre_caida', 'Torre de Vigia Caída', 4, 3, 'ruina', { terminal: ['Torre 4 da linha de vigia de Velmora.', 'Último registro: luzes vermelhas no céu sobre Carmesin.'] }],
    ['velmora_fim_mata', 'Fim da Mata', 4, 4, 'bosque'],
  ];
  // o rio: sai do Lago Escuro (velmora_lago, linha 1 coluna 1) e desce pelo território (frações da zona)
  const AGUA = {
    velmora_vau: [{ rio: [[0.48, 0], [0.42, 0.32], [0.52, 0.66], [0.47, 1]], w: 0.07 }],
    velmora_ponte_velha: [{ rio: [[0.47, 0], [0.56, 0.45], [0.5, 1]], w: 0.07 }],
    velmora_curva: [{ rio: [[0.5, 0], [0.56, 0.4], [0.74, 0.6], [1, 0.63]], w: 0.07 }],
    velmora_garcas: [{ rio: [[0, 0.63], [0.3, 0.6], [0.46, 0.56]], w: 0.07 }, { lago: [0.66, 0.5, 0.24, 0.2] }],
  };
  const SAIDA_LAGO = { rio: [[0.52, 0.72], [0.5, 0.86], [0.48, 1]], w: 0.07 };   // o Lago Escuro passa a ter vazão para o sul
  // estruturas por tipo (Estruturas.ZONAS: [id, x, y, giro, escala, beira?]); as variantes saem da semente
  const CASAS = ['estrutura_md_5', 'blue_roof_cottage'];
  function estruturas(id, tipo, X, r) {
    const L = [], pega = (A) => A[Math.floor(r() * A.length)], g = () => r() * Math.PI * 2;
    if (tipo === 'vila') {
      const casas = [[0.24, 0.22], [0.42, 0.18], [0.74, 0.2], [0.2, 0.46], [0.8, 0.44], [0.26, 0.74], [0.72, 0.76]];
      casas.forEach(([x, y], k) => L.push([pega(CASAS), x, y, Math.atan2(0.5 - y, 0.5 - x) + Math.PI, k % 3 === 0 ? 0.8 : 0.72]));
      L.push(['estrutura_md_10', 0.5, 0.42, 0, 1], ['estrutura_md_7', 0.6, 0.58, 0.4, 0.85], ['forno_pedra', 0.36, 0.6, 1.2, 0.85], ['hearthside_forge', 0.86, 0.66, P2, 0.6],
        ['estrutura_md_1', 0.12, 0.12, 0.3, 0.6], ['quadro_de_missoes_medieval', 0.56, 0.32, 0.4, 1], ['estrutura_md_12', 0.44, 0.52, 0, 1], ['estrutura_md_12', 0.62, 0.44, 0, 1],
        ['item_ambiente_md_3', 0.66, 0.66, 0.2, 1], ['item_ambiente_md_1', 0.32, 0.36, 0.7, 1], ['fast_travel', 0.5, 0.88, 0, 1]);
    } else if (tipo === 'ruina') {
      L.push(['estrutura_md_16', 0.3, 0.3, g(), 1], ['estrutura_md_15', 0.62, 0.24, g(), 1], ['escadaria_ruinas', 0.48, 0.5, g(), 0.9], ['muro_ruinas_placa', 0.72, 0.6, g(), 1],
        ['estrutura_md_6', 0.2, 0.7, g(), X.terminal ? 0.65 : 0.55], ['estrutura_md_16', 0.78, 0.82, g(), 0.9], ['arco_braseiros', 0.4, 0.78, g(), 0.85], ['rochas_grupo', 0.86, 0.3, g(), 1]);
    } else if (tipo === 'forte') {
      if (X.acampamento) L.push(['estrutura_md_14', 0.3, 0.3, 0, 1], ['estrutura_md_14', 0.3, 0.42, 0, 1], ['estrutura_md_14', 0.7, 0.3, 0, 1], ['estrutura_md_9', 0.5, 0.2, 0, 0.75],
        ['item_ambiente_md_8', 0.5, 0.5, 0, 1], ['item_ambiente_md_7', 0.4, 0.4, 0, 1], ['estrutura_md_8', 0.7, 0.66, 1.2, 0.85], ['item_ambiente_md_2', 0.62, 0.42, 0.4, 1], ['item_ambiente_md_3', 0.36, 0.62, 1, 1]);
      else L.push(['estrutura_md_4', 0.5, 0.82, 0, 0.8], ['estrutura_md_2', 0.2, 0.22, 0, 0.75], ['estrutura_md_2', 0.8, 0.22, 0, 0.75], ['estrutura_md_6', 0.2, 0.62, 0, 0.6],
        ['estrutura_md_14', 0.36, 0.2, P2, 1], ['estrutura_md_14', 0.64, 0.2, P2, 1], ['canhao_medieval', 0.44, 0.66, -P2, 1], ['canhao_medieval', 0.58, 0.66, -P2, 1], ['item_ambiente_md_7', 0.5, 0.42, 0, 1], ['item_ambiente_md_8', 0.5, 0.5, 0, 1]);
    } else if (tipo === 'rio') {
      L.push([pega(['estrutura_md_13', 'item_ambiente_md_4']), 0.3, 0.24, g(), 1], ['rochas_grupo', 0.75, 0.75, g(), 0.9]);
      if (id === 'velmora_ponte_velha') L.push(['casa_moinho_beira_do_rio', 0.3, 0.48, 0, 0.7, { agua: 0, recuo: 0.62 }]);
    } else if (tipo === 'lago') {
      L.push(['cais_com_barco', 0.44, 0.5, 0, 0.85, { agua: P2, recuo: 0.05 }], ['estrutura_md_5', 0.18, 0.2, 0.5, 0.72], ['item_ambiente_md_3', 0.26, 0.3, 0, 1]);
    } else if (tipo === 'campo') {
      if (X.fazenda) L.push(['estrutura_md_1', 0.3, 0.3, 0.2, 0.7], ['estrutura_md_5', 0.7, 0.24, 2.4, 0.72], ['estrutura_md_8', 0.6, 0.62, 0.9, 0.85], ['item_ambiente_md_4', 0.4, 0.66, 0.3, 1]);
      else if (X.pedras) L.push(['rochas_grupo', 0.3, 0.3, g(), 1.3], ['rochas_grupo', 0.7, 0.36, g(), 1.1], ['rochas_grupo', 0.52, 0.72, g(), 1.4], ['estrutura_md_16', 0.2, 0.78, g(), 0.8]);
      else L.push(['estrutura_md_13', 0.5, 0.5, g(), 1], ['rochas_grupo', r() * 0.6 + 0.2, r() * 0.6 + 0.2, g(), 0.9]);
    } else if (tipo === 'bosque') {
      L.push(['rochas_grupo', 0.3, 0.65, g(), 1], ['item_ambiente_md_9', 0.62, 0.3, 0, 1]);
    }
    // o vilarejo, o forte e as ruínas ficam juntos em volta do meio da zona (a zona tem ~100 m: espalhados,
    // sumiam na mata); o resto da zona fica para a mata, as trilhas e os campos
    const aperto = tipo === 'vila' ? 0.42 : tipo === 'forte' || tipo === 'ruina' ? 0.55 : 1;
    if (aperto < 1) for (const E of L) if (!E[5]) { E[1] = 0.5 + (E[1] - 0.5) * aperto; E[2] = 0.5 + (E[2] - 0.5) * aperto; }
    return L;
  }
  // objetos do kit (Cenario.ZONAS: carroça, feno, poço, cerca, placa, tronco)
  function cenario(tipo, X) {
    const L = cenario0(tipo, X), k = tipo === 'vila' ? 0.42 : 1;
    return L && L.map(([id, x, y, g, e]) => [id, 0.5 + (x - 0.5) * k, 0.5 + (y - 0.5) * k, g, e]);
  }
  function cenario0(tipo, X) {
    if (tipo === 'vila') return [['carroca', 0.62, 0.66, 0.6, 1], ['fardo_feno', 0.7, 0.58, 0.2, 1], ['fardo_feno', 0.3, 0.5, 1.4, 0.9], ['cerca', 0.16, 0.6, 0, 1], ['cerca', 0.16, 0.66, 0, 1], ['placa_estrada', 0.5, 0.94, 0.3, 1]];
    if (tipo === 'campo' && X.fazenda) return [['fardo_feno', 0.36, 0.5, 0.3, 1], ['fardo_feno', 0.42, 0.56, 1.2, 1], ['fardo_feno', 0.52, 0.48, 0.8, 0.9], ['cerca', 0.24, 0.5, 0, 1], ['cerca', 0.24, 0.56, 0, 1], ['carroca', 0.66, 0.5, 2.2, 1]];
    if (tipo === 'campo' || tipo === 'rio') return [['placa_estrada', 0.46, 0.4, 0.8, 1], ['tronco_caido', 0.7, 0.3, 1.1, 1]];
    if (tipo === 'bosque') return [['tronco_caido', 0.3, 0.3, 0.9, 1.2], ['tronco_caido', 0.7, 0.7, 2.0, 1.1]];
    return null;
  }
  // moradores dos vilarejos (WORLD_POVO: conversa, serviços e rumores)
  const POVO = [
    { id: 'pm_olga', nome: 'OLGA', zona: 'velmora_pedramusgo', at: [0.43, 0.46], model: 'ancia', facing: 0.4, papel: 'Curandeira de Pedramusgo', servicos: ['curandeiro'], vila: true,
      personalidade: 'Brava com quem chega e mansa com quem fica.', ola: ['Limpe as botas antes de entrar no vilarejo.', 'Ferido? Senta aí. Eu já vi pior.'],
      temas: [['Que lugar é este?', 'Pedramusgo: oito casas, um forno e muita pedra. O forte ali do lado protegia a gente. Agora é só ruína e lobo.']],
      rumores: [{ txt: 'No Forte Abandonado ainda tem o baú do capitão. Dizem que os caçadores nunca acharam a chave.', revela: { zona: 'velmora_forte' } }] },
    { id: 'pm_teo', nome: 'TEO', zona: 'velmora_pedramusgo', at: [0.6, 0.44], model: 'civil', variant: 1, facing: 3.4, papel: 'Ferreiro de Pedramusgo', servicos: ['ferreiro'], vila: true,
      personalidade: 'Fala pouco, bate muito.', ola: ['Lâmina cega? Traz aqui.', 'O ferro do forte virou ferradura. Melhor assim.'],
      temas: [['Você conserta armas?', 'Conserto e afio. Para coisa nova, vá à ferraria da Aurora.']] },
    { id: 'mo_bia', nome: 'BIA', zona: 'velmora_moinho', at: [0.42, 0.45], model: 'civil', variant: 2, facing: 0.8, papel: 'Moleira do vilarejo', servicos: ['artesao'], vila: true,
      personalidade: 'Animada, conta tudo duas vezes.', ola: ['O moinho não para nem de noite!', 'Farinha fresca, pão quente. Quer ajuda com alguma coisa?'],
      temas: [['O que se faz aqui?', 'A gente mói o trigo dos Campos de Feno e manda farinha para a Aurora pela estrada. A ponte velha ainda aguenta a carroça.']],
      rumores: [{ txt: 'Na Torre de Vigia Caída ficou um registro das luzes vermelhas da noite do Eclipse.', revela: { zona: 'velmora_torre_caida' } }] },
    { id: 'mo_davi', nome: 'DAVI', zona: 'velmora_moinho', at: [0.58, 0.52], model: 'civil', variant: 0, facing: 3.8, papel: 'Pastor e curandeiro', servicos: ['curandeiro'], vila: true,
      personalidade: 'Calmo; mede o tempo pelas ovelhas.', ola: ['As ovelhas sentiram você chegar.', 'Fique para o jantar, se não tiver pressa.'],
      temas: [['É seguro aqui?', 'De dia, sim. À noite os lobos de raiz descem do Bosque Sombrio. A gente fecha a porteira cedo.']] },
  ];
  const nivelDe = (r, c) => Math.min(16, 8 + Math.round((r + c) * 1.05));
  function montarZonas() {
    if (typeof worldPrepZone !== 'function') return 0;
    let n = 0;
    ZONAS.forEach(([id, name, r, c, tipo, X = {}], i) => {
      if (WORLD_ZONES[id]) return;
      const lv = nivelDe(r, c), seguro = tipo === 'vila', rnd = mulberry32(7919 + i * 131);
      // acampamentos: espalhados pela zona inteira (a vila não tem; o forte tem o maior, com elite)
      const lugares = seguro ? [] : tipo === 'forte' ? [[0.5, 0.42], [0.3, 0.6], [0.72, 0.6], [0.5, 0.18]] : tipo === 'lago' ? [[0.22, 0.7], [0.86, 0.86]]
        : [[0.28, 0.3], [0.72, 0.36], [0.4, 0.74], [0.82, 0.8], [0.16, 0.86]].filter(() => rnd() < 0.8);
      const camps = lugares.map((at, k) => {
        const mobs = {}, q0 = Math.min(8, 3 + Math.floor(lv / 10)) + (k === 0 ? 1 : 0) + (tipo === 'forte' ? 2 : 0);
        for (let q = 0; q < q0; q++) { const t = MOBS[(q + k + i) % MOBS.length]; mobs[t] = (mobs[t] || 0) + 1; }
        return Object.assign({ at, mobs }, tipo === 'forte' && k === 0 ? { elite: true } : {});
      });
      const cells = Math.round(8 + lv * 2.4);
      const z = {
        region: REG, r, c, name, theme: 'floresta', aberto: true, lv, seguro, territorio: tipo,
        tiles: 60 + (i % 3) * 2, pillars: tipo === 'bosque' ? 90 : tipo === 'vila' ? 6 : tipo === 'campo' ? 26 : 40,
        portal: !!X.portal, hub: false, camps,
        chests: [Object.assign({ at: [[0.15, 0.82], [0.88, 0.85], [0.85, 0.15]][c % 3], cells, xp: lv * 8 }, i % 2 ? { heal: true } : {}),
          ...(tipo === 'forte' && !X.acampamento ? [{ at: [0.5, 0.3], cells: cells * 3, xp: lv * 25, heal: true }] : [])],
      };
      if (X.secret) z.secret = { at: [[0.92, 0.1], [0.08, 0.9], [0.92, 0.9]][c % 3], cells: cells * 2, xp: lv * 18 };
      if (X.terminal) z.terminal = { at: [0.5, 0.62], lines: X.terminal };
      if (seguro) {
        z.vila = { nome: name }; z.clareira = 0.3;   // a praça: sem mata entre as casas
        z.npcs = [{ model: 'civil', variant: 2, name: 'MERCADOR', merchant: true, at: [0.53, 0.56], facing: 2.6, lines: ['Da estrada para o vilarejo: tenho o que você precisa.', 'Vendo e compro. Pago bem por couro e erva luminosa.'] }];
      }
      worldPrepZone(id, z);
      if (typeof Estruturas !== 'undefined' && !Estruturas.ZONAS[id]) Estruturas.ZONAS[id] = estruturas(id, tipo, X, rnd);
      const cen = cenario(tipo, X);
      if (cen && typeof Cenario !== 'undefined' && !Cenario.ZONAS[id]) Cenario.ZONAS[id] = cen;
      n++;
    });
    if (typeof Agua !== 'undefined' && Agua.AGUA_ZONAS) {
      for (const id in AGUA) if (!Agua.AGUA_ZONAS[id]) Agua.AGUA_ZONAS[id] = AGUA[id];
      const L = Agua.AGUA_ZONAS.velmora_lago;
      if (L && !L.includes(SAIDA_LAGO)) L.push(SAIDA_LAGO);
    }
    if (typeof WORLD_POVO !== 'undefined') for (const P of POVO) if (!WORLD_POVO.some((q) => q.id === P.id)) WORLD_POVO.push(P);
    if (typeof Povo !== 'undefined' && Povo.montar) Povo.montar();
    return n;
  }
  const n = montarZonas();
  // informação para os testes e o mapa
  function estado() {
    const zs = Object.values(WORLD_ZONES).filter((z) => z.region === REG && !z.instancia && !z.distrito);
    const lados = zs.reduce((a, z) => { a[0] = Math.max(a[0], z.r + 1); a[1] = Math.max(a[1], z.c + 1); return a; }, [0, 0]);
    const area = zs.reduce((s, z) => s + (z.tiles * TILE / 34) ** 2, 0);
    return { regiao: REG, zonas: zs.length, novas: n, grade: lados, areaHa: Math.round(area / 1e4 * 10) / 10, vilas: zs.filter((z) => z.vila).length, tipos: [...new Set(zs.map((z) => z.territorio || 'original'))] };
  }
  return { ZONAS, AGUA, POVO, estado, nivelDe };
})();
if (typeof window !== 'undefined') window.Territorio = Territorio;
