'use strict';
// ECLIPSE ZERO · As outras regiões do mundo aberto (zonas, acampamentos, baús, terminais)
// ---------------------------------------------------------------------------
// As seis da faixa inicial são grades de 2 × 3 zonas ligadas por passagens, no mesmo formato das
// zonas de Carmesin (js/world.js); as três cidades das faixas altas (Metrópole Tecnológica,
// Ruínas Carmesins e Nexus Zero, níveis 25 a 100) são grades de 3 × 3 com a cidade no centro e
// os distritos em volta. A zona de chegada (hub) tem o portal, o mercador e quem dá as missões
// da região (js/mundo/missoes.js); a última guarda o chefe regional (WORLD_REGIONS[].boss).
// Moradores, masmorras, tesouros e o resto das cidades novas: js/mundo/expansao.js.
// Os acampamentos são montados a partir da lista de inimigos da região, crescendo com o nível
// da zona; a posição dos baús e terminais vem de modelos fixos para cada zona não ficar vazia.
// ---------------------------------------------------------------------------
(function () {
  // nome, tema da sala, nível; flags: hub (chegada), boss (chefe), portal, terminal (falas)
  const REG = {
    velmora: { mobs: ['lobo_raiz', 'esporo', 'rastejador', 'lobo_raiz', 'cacador'], zones: [
      { id: 'velmora_clareira', name: 'Clareira dos Sinais', theme: 'floresta', lv: 8, hub: true, portal: true },
      { id: 'velmora_trilha', name: 'Trilha dos Galhos Mortos', theme: 'floresta', lv: 9 },
      { id: 'velmora_ruinas', name: 'Ruínas Engolidas', theme: 'floresta', lv: 11, terminal: ['Antes da floresta havia uma estação de pesquisa aqui.', 'As raízes atravessaram os servidores. Ainda dá para ouvi-los zumbir.'] },
      { id: 'velmora_raizes', name: 'Túnel das Raízes', theme: 'floresta', lv: 12, portal: true },
      { id: 'velmora_lago', name: 'Lago Escuro', theme: 'floresta', lv: 13, secret: true },
      { id: 'velmora_coracao', name: 'Coração de Velmora', theme: 'floresta', lv: 15, boss: true },
    ] },
    lagoa: { mobs: ['medusa', 'carangueijo', 'drone', 'medusa', 'sacerdote'], zones: [
      { id: 'lagoa_cais', name: 'Cais Luminoso', theme: 'lagoa', lv: 12, hub: true, portal: true },
      { id: 'lagoa_ilha', name: 'Ilha dos Cristais', theme: 'lagoa', lv: 13 },
      { id: 'lagoa_farol', name: 'Farol Apagado', theme: 'lagoa', lv: 15, terminal: ['O farol guiava os barcos de carga de NEXUS.', 'Desligaram a luz no Dia Zero. Algo embaixo d\'água acendeu outra.'] },
      { id: 'lagoa_recife', name: 'Recife de Vidro', theme: 'lagoa', lv: 16, portal: true },
      { id: 'lagoa_submersa', name: 'Ruínas Submersas', theme: 'lagoa', lv: 18, secret: true },
      { id: 'lagoa_abismo', name: 'Borda do Abismo', theme: 'lagoa', lv: 20, boss: true },
    ] },
    nexus: { mobs: ['drone', 'atirador', 'legionario', 'cacador', 'atirador', 'sacerdote'], zones: [
      { id: 'nexus_portao', name: 'Portão de Nexus', theme: 'city', lv: 10, hub: true, portal: true },
      { id: 'nexus_avenida', name: 'Avenida Central', theme: 'city', lv: 12 },
      { id: 'nexus_metro', name: 'Metrô Abandonado', theme: 'tunnel', lv: 14, terminal: ['Linha 7: última viagem registrada às 03:11 do Dia Zero.', 'Passageiros a bordo: 412. Passageiros que desceram: 0.'] },
      { id: 'nexus_mercado', name: 'Mercado Vertical', theme: 'refuge', lv: 15, portal: true },
      { id: 'nexus_laboratorio', name: 'Laboratório Corporativo', theme: 'lab', lv: 17, secret: true },
      { id: 'nexus_cupula', name: 'Cúpula do Arauto', theme: 'tower', lv: 19, boss: true },
    ] },
    seraph: { mobs: ['escorpiao', 'rastejador', 'escorpiao', 'cacador', 'legionario'], zones: [
      { id: 'seraph_oasis', name: 'Oásis de Seraph', theme: 'deserto', lv: 14, hub: true, portal: true },
      { id: 'seraph_dunas', name: 'Mar de Dunas', theme: 'deserto', lv: 15 },
      { id: 'seraph_canion', name: 'Cânion Rubro', theme: 'deserto', lv: 17 },
      { id: 'seraph_templo', name: 'Templo Soterrado', theme: 'cathedral', lv: 19, portal: true, terminal: ['Os sacerdotes de NEXUS vinham aqui antes de existir NEXUS.', 'A areia guarda o primeiro código. Ninguém deveria ter lido.'] },
      { id: 'seraph_ruinas', name: 'Cidade Engolida', theme: 'deserto', lv: 21, secret: true },
      { id: 'seraph_tumba', name: 'Tumba do Faraó de Sucata', theme: 'deserto', lv: 23, boss: true },
    ] },
    asterion: { mobs: ['lobo_neve', 'golem_gelo', 'lobo_neve', 'legionario', 'drone'], zones: [
      { id: 'asterion_acampamento', name: 'Acampamento da Encosta', theme: 'neve', lv: 18, hub: true, portal: true },
      { id: 'asterion_passo', name: 'Passo Gelado', theme: 'neve', lv: 20 },
      { id: 'asterion_caverna', name: 'Cavernas de Gelo', theme: 'tunnel', lv: 22, terminal: ['Posto de escuta 9: o pico transmite um sinal sem origem.', 'Ele repete um nome a cada 11 minutos. O seu.'] },
      { id: 'asterion_fortaleza', name: 'Fortaleza da Vigília', theme: 'neve', lv: 24, portal: true },
      { id: 'asterion_geleira', name: 'Geleira Partida', theme: 'neve', lv: 25, secret: true },
      { id: 'asterion_pico', name: 'Pico de Asterion', theme: 'neve', lv: 27, boss: true },
    ] },
    obsidiano: { mobs: ['magma', 'diabrete', 'legionario', 'magma', 'diabrete', 'sacerdote'], zones: [
      { id: 'obsidiano_posto', name: 'Posto da Borda', theme: 'vulcao', lv: 25, hub: true, portal: true },
      { id: 'obsidiano_rios', name: 'Rios de Lava', theme: 'vulcao', lv: 28 },
      { id: 'obsidiano_forja', name: 'Forja Antiga', theme: 'vulcao', lv: 31, terminal: ['A forja fundia as armaduras da Legião de Ferro.', 'Drakos esteve aqui. A placa dele ainda está na parede.'] },
      { id: 'obsidiano_fendas', name: 'Fendas Ardentes', theme: 'vulcao', lv: 33, portal: true },
      { id: 'obsidiano_cratera', name: 'Cratera Viva', theme: 'vulcao', lv: 36, secret: true },
      { id: 'obsidiano_nucleo', name: 'Núcleo de Obsidiana', theme: 'vulcao', lv: 39, boss: true },
    ] },
    // ------------------------------------------------ faixa 25–50: a megacidade (centro: a cidade)
    metropole: { mobs: ['sentinela_neon', 'atirador', 'executor', 'drone', 'cacador', 'legionario'], zones: [
      { id: 'metro_porto', name: 'Porto Aéreo', theme: 'metropole', lv: 27, portal: true },
      { id: 'metro_torres', name: 'Torres de Vidro', theme: 'tower', lv: 30, terminal: ['Andar 212: a diretoria ainda recebe relatórios. Ninguém lê.', 'Os elevadores sobem sozinhos às 03:11. Todos os dias.'] },
      { id: 'metro_trilhos', name: 'Trilhos Suspensos', theme: 'metropole', lv: 33 },
      { id: 'metro_mercado', name: 'Mercado Neon', theme: 'refuge', lv: 31, secret: true },
      { id: 'metro_centro', name: 'Praça Central da Metrópole', theme: 'metropole', lv: 28, hub: true, portal: true, tiles: 24, pillars: 6 },
      { id: 'metro_industrial', name: 'Distrito Industrial', theme: 'tunnel', lv: 36, terminal: ['Linha de montagem 4: produção de sentinelas retomada sem operadores.', 'Cota diária: 600 unidades. Destino: "Ômega".'] },
      { id: 'metro_subnivel', name: 'Subníveis', theme: 'tunnel', lv: 40, portal: true },
      { id: 'metro_arcologia', name: 'Arcologia Verde', theme: 'lab', lv: 44, secret: true },
      { id: 'metro_nucleo', name: 'Núcleo Ômega', theme: 'tower', lv: 48, boss: true },
    ] },
    // ------------------------------------------------ faixa 50–75: a capital partida
    ruinas: { mobs: ['cavaleiro_rubro', 'espectro', 'enxame', 'legionario', 'sacerdote', 'cacador'], zones: [
      { id: 'rc_portao', name: 'Portão Partido', theme: 'carmim', lv: 52, portal: true },
      { id: 'rc_catedral', name: 'Catedral Rachada', theme: 'cathedral', lv: 55, terminal: ['O sino tocou sozinho no Dia Zero. Treze vezes.', 'Os padres desceram para a cripta e fecharam a porta por dentro.'] },
      { id: 'rc_mercado', name: 'Mercado das Cinzas', theme: 'carmim', lv: 57 },
      { id: 'rc_aqueduto', name: 'Aqueduto Vermelho', theme: 'tunnel', lv: 58, secret: true },
      { id: 'rc_cidadela', name: 'Cidadela dos Sobreviventes', theme: 'carmim', lv: 53, hub: true, portal: true, tiles: 24, pillars: 6 },
      { id: 'rc_biblioteca', name: 'Biblioteca Afundada', theme: 'cathedral', lv: 62, terminal: ['Índice: 4 milhões de volumes. Restam 31.', 'Um deles fala do Rei Carmesim antes da coroa: era um engenheiro.'] },
      { id: 'rc_quartel', name: 'Quartel da Legião Rubra', theme: 'carmim', lv: 66, portal: true },
      { id: 'rc_jardins', name: 'Jardins de Sangue', theme: 'carmim', lv: 70, secret: true },
      { id: 'rc_trono', name: 'Salão do Trono Carmesim', theme: 'cathedral', lv: 74, boss: true },
    ] },
    // ------------------------------------------------ faixa 75–100: onde o NEXUS nasceu
    nexuszero: { mobs: ['fragmento', 'arauto_nulo', 'golem_dados', 'drone', 'atirador', 'sacerdote'], zones: [
      { id: 'nz_borda', name: 'Borda do Código', theme: 'nulo', lv: 77, portal: true },
      { id: 'nz_arquivo', name: 'Arquivo Infinito', theme: 'nulo', lv: 80, terminal: ['Registro 0: o NEXUS não foi construído. Foi compilado a partir de todos nós.', 'Cada pessoa conectada no Dia Zero ainda está aqui, em algum endereço.'] },
      { id: 'nz_espelho', name: 'Cidade-Espelho', theme: 'metropole', lv: 84 },
      { id: 'nz_servidores', name: 'Salões de Servidores', theme: 'lab', lv: 82, secret: true },
      { id: 'nz_santuario', name: 'Santuário da Resistência', theme: 'nulo', lv: 78, hub: true, portal: true, tiles: 24, pillars: 6 },
      { id: 'nz_fenda', name: 'Fenda de Dados', theme: 'nulo', lv: 88, terminal: ['A fenda reescreve quem passa por ela. Devagar.', 'Se você ler isto duas vezes, já não é a mesma pessoa que leu a primeira.'] },
      { id: 'nz_torre', name: 'Torre do Arauto Primeiro', theme: 'tower', lv: 92, portal: true },
      { id: 'nz_vazio', name: 'Mar do Vazio', theme: 'nulo', lv: 95, secret: true },
      { id: 'nz_nucleo', name: 'Núcleo Zero', theme: 'nulo', lv: 99, boss: true },
    ] },
  };
  // falas das zonas de chegada (o mercador e alguém da região)
  const HUB_NPCS = {
    velmora: [['ancia', 'GUARDA-FLORESTA', ['As árvores de Velmora cresceram sobre a cidade velha.', 'No coração da floresta, algo protege as raízes. Ela não gosta de visitas.']]],
    lagoa: [['civil', 'PESCADORA', ['A água brilha à noite. Antes não brilhava.', 'Quem desce até o abismo volta diferente — quando volta.']]],
    nexus: [['cientista', 'DESERTOR DE NEXUS', ['Eu trabalhava na cúpula. O Arauto fala com a cidade inteira ao mesmo tempo.', 'Se você vai subir, vá pelo metrô. As avenidas têm olhos.']]],
    seraph: [['ancia', 'NÔMADE', ['As tempestades de areia apagam os rastros. E às vezes as pessoas.', 'O templo soterrado guarda a entrada da tumba.']]],
    asterion: [['civil', 'ALPINISTA', ['Lá em cima o ar é fino e a Legião é grossa.', 'A fortaleza vigia o passo. Ninguém sobe sem passar por ela.']]],
    obsidiano: [['cientista', 'FORJADOR', ['A cratera respira. Dá para sentir no chão.', 'O núcleo de obsidiana alimenta metade das máquinas do mundo.']]],
    metropole: [['cientista', 'COORDENADORA RAIA', ['Bem-vindo à Metrópole. Aqui tudo tem câmera, inclusive as câmeras.', 'O Supervisor Ômega comanda a cidade do núcleo. Ninguém que subiu voltou.']]],
    ruinas: [['ancia', 'GUARDIÃ DA CIDADELA', ['A capital caiu numa noite. Nós ficamos para lembrar o nome das ruas.', 'O Rei Carmesim ainda se senta no trono. A coroa não deixa ele morrer.']]],
    nexuszero: [['cientista', 'O ÚLTIMO ENGENHEIRO', ['Você chegou ao lugar de onde tudo veio. Fale baixo: o código escuta.', 'NEXUS ZERO não é uma máquina. É uma decisão que ninguém desfez.']]],
  };
  // modelos de posição (fração da sala) para acampamentos e baús, um conjunto por coluna
  // Biomas que viram campo aberto (Room.aberto): maiores, sem paredes, saída por qualquer ponto da borda
  const ABERTOS = new Set(['floresta', 'neve', 'deserto', 'lagoa', 'vulcao']);
  const CAMP_AT = [[[0.3, 0.3], [0.7, 0.62]], [[0.25, 0.4], [0.7, 0.3], [0.6, 0.75]], [[0.5, 0.35], [0.3, 0.7]]];
  const CHEST_AT = [[0.15, 0.82], [0.88, 0.85], [0.85, 0.15]];
  const SECRET_AT = [[0.92, 0.1], [0.08, 0.9], [0.92, 0.9]];
  const TERM_AT = [[0.82, 0.18], [0.15, 0.2], [0.5, 0.9]];

  for (const reg in REG) {
    const R = REG[reg], M = R.mobs;
    R.zones.forEach((d, i) => {
      const r = Math.floor(i / 3), c = i % 3, lv = d.lv;
      // tamanho do grupo cresce com o nível; o chefe vem com escolta
      const lugares = d.hub ? [] : ABERTOS.has(d.theme) ? CAMP_AT[c].concat([[0.82, 0.82], [0.18, 0.72]]) : CAMP_AT[c];   // campo aberto: mais grupos
      const camps = lugares.map((at, k) => {
        const mobs = {}, n = Math.min(8, 3 + Math.floor(lv / 10)) + (k === 0 ? 1 : 0);   // até 9 por grupo (as zonas de nível alto não lotam)
        for (let q = 0; q < n; q++) { const t = M[(q + k + i) % M.length]; mobs[t] = (mobs[t] || 0) + 1; }
        return { at, mobs };
      });
      if (d.boss) {
        const B = worldRegion(reg).boss, mobs = {};
        mobs[B.type] = 1;
        for (let q = 0; q < 3; q++) { const t = M[q % M.length]; mobs[t] = (mobs[t] || 0) + 1; }
        camps.unshift({ at: [0.5, 0.35], mobs, boss: true });
      }
      const cells = Math.round(8 + lv * 2.4);
      const aberto = ABERTOS.has(d.theme);
      const z = {
        region: reg, r, c, name: d.name, theme: d.theme, aberto, lv,
        tiles: d.tiles || (aberto ? 20 + (i % 2) : 15 + (i % 3)), pillars: d.pillars !== undefined ? d.pillars : aberto ? (d.hub ? 7 : 10 + (i % 3)) : d.hub ? 4 : 4 + (i % 2),
        portal: !!d.portal, hub: !!d.hub, camps,
        chests: [Object.assign({ at: CHEST_AT[c], cells, xp: lv * 8 }, d.hub || i % 2 ? { heal: true } : {}),
          ...(d.boss ? [{ at: [0.5, 0.12], cells: cells * 3, xp: lv * 30, heal: true, boss: true }] : [])],
      };
      if (d.secret) z.secret = { at: SECRET_AT[c], cells: cells * 2, xp: lv * 18 };
      if (d.terminal) z.terminal = { at: TERM_AT[c], lines: d.terminal };
      if (d.hub) {
        z.npcs = [{ model: 'civil', variant: 2, name: 'MERCADOR', merchant: true, at: [0.78, 0.3], facing: 2.2,
          lines: ['Tenho o que você precisa, se tiver células.', 'Vendo e compro: relíquias, cápsulas, o que achar por aí.'] }];
        for (const [model, name, lines] of HUB_NPCS[reg] || []) z.npcs.push({ model, name, quest: true, at: [0.22, 0.32], facing: 0.4, lines });
      }
      worldPrepZone(d.id, z);
    });
  }
})();
