'use strict';
// ECLIPSE ZERO · As outras seis regiões do mundo aberto (zonas, acampamentos, baús, terminais)
// ---------------------------------------------------------------------------
// Cada região é uma grade de 2 × 3 zonas ligadas por passagens, no mesmo formato das zonas de
// Carmesin (js/world.js): a zona de chegada (hub) tem o portal, o mercador e quem dá as missões
// da região (js/mundo/missoes.js); a última guarda o chefe regional (WORLD_REGIONS[].boss).
// Os acampamentos são montados a partir da lista de inimigos da região, crescendo com o nível
// da zona; a posição dos baús e terminais vem de modelos fixos para cada zona não ficar vazia.
// ---------------------------------------------------------------------------
(function () {
  // nome, tema da sala, nível; flags: hub (chegada), boss (chefe), portal, terminal (falas)
  const REG = {
    velmora: { mobs: ['rastejador', 'cacador', 'sacerdote'], zones: [
      { id: 'velmora_clareira', name: 'Clareira dos Sinais', theme: 'floresta', lv: 8, hub: true, portal: true },
      { id: 'velmora_trilha', name: 'Trilha dos Galhos Mortos', theme: 'floresta', lv: 9 },
      { id: 'velmora_ruinas', name: 'Ruínas Engolidas', theme: 'floresta', lv: 11, terminal: ['Antes da floresta havia uma estação de pesquisa aqui.', 'As raízes atravessaram os servidores. Ainda dá para ouvi-los zumbir.'] },
      { id: 'velmora_raizes', name: 'Túnel das Raízes', theme: 'floresta', lv: 12, portal: true },
      { id: 'velmora_lago', name: 'Lago Escuro', theme: 'floresta', lv: 13, secret: true },
      { id: 'velmora_coracao', name: 'Coração de Velmora', theme: 'floresta', lv: 15, boss: true },
    ] },
    lagoa: { mobs: ['drone', 'rastejador', 'sacerdote'], zones: [
      { id: 'lagoa_cais', name: 'Cais Luminoso', theme: 'lagoa', lv: 12, hub: true, portal: true },
      { id: 'lagoa_ilha', name: 'Ilha dos Cristais', theme: 'lagoa', lv: 13 },
      { id: 'lagoa_farol', name: 'Farol Apagado', theme: 'lagoa', lv: 15, terminal: ['O farol guiava os barcos de carga de NEXUS.', 'Desligaram a luz no Dia Zero. Algo embaixo d\'água acendeu outra.'] },
      { id: 'lagoa_recife', name: 'Recife de Vidro', theme: 'lagoa', lv: 16, portal: true },
      { id: 'lagoa_submersa', name: 'Ruínas Submersas', theme: 'lagoa', lv: 18, secret: true },
      { id: 'lagoa_abismo', name: 'Borda do Abismo', theme: 'lagoa', lv: 20, boss: true },
    ] },
    nexus: { mobs: ['drone', 'legionario', 'cacador', 'sacerdote'], zones: [
      { id: 'nexus_portao', name: 'Portão de Nexus', theme: 'city', lv: 10, hub: true, portal: true },
      { id: 'nexus_avenida', name: 'Avenida Central', theme: 'city', lv: 12 },
      { id: 'nexus_metro', name: 'Metrô Abandonado', theme: 'tunnel', lv: 14, terminal: ['Linha 7: última viagem registrada às 03:11 do Dia Zero.', 'Passageiros a bordo: 412. Passageiros que desceram: 0.'] },
      { id: 'nexus_mercado', name: 'Mercado Vertical', theme: 'refuge', lv: 15, portal: true },
      { id: 'nexus_laboratorio', name: 'Laboratório Corporativo', theme: 'lab', lv: 17, secret: true },
      { id: 'nexus_cupula', name: 'Cúpula do Arauto', theme: 'tower', lv: 19, boss: true },
    ] },
    seraph: { mobs: ['rastejador', 'cacador', 'legionario'], zones: [
      { id: 'seraph_oasis', name: 'Oásis de Seraph', theme: 'deserto', lv: 14, hub: true, portal: true },
      { id: 'seraph_dunas', name: 'Mar de Dunas', theme: 'deserto', lv: 15 },
      { id: 'seraph_canion', name: 'Cânion Rubro', theme: 'deserto', lv: 17 },
      { id: 'seraph_templo', name: 'Templo Soterrado', theme: 'cathedral', lv: 19, portal: true, terminal: ['Os sacerdotes de NEXUS vinham aqui antes de existir NEXUS.', 'A areia guarda o primeiro código. Ninguém deveria ter lido.'] },
      { id: 'seraph_ruinas', name: 'Cidade Engolida', theme: 'deserto', lv: 21, secret: true },
      { id: 'seraph_tumba', name: 'Tumba do Faraó de Sucata', theme: 'deserto', lv: 23, boss: true },
    ] },
    asterion: { mobs: ['legionario', 'cacador', 'drone'], zones: [
      { id: 'asterion_acampamento', name: 'Acampamento da Encosta', theme: 'neve', lv: 18, hub: true, portal: true },
      { id: 'asterion_passo', name: 'Passo Gelado', theme: 'neve', lv: 20 },
      { id: 'asterion_caverna', name: 'Cavernas de Gelo', theme: 'tunnel', lv: 22, terminal: ['Posto de escuta 9: o pico transmite um sinal sem origem.', 'Ele repete um nome a cada 11 minutos. O seu.'] },
      { id: 'asterion_fortaleza', name: 'Fortaleza da Vigília', theme: 'neve', lv: 24, portal: true },
      { id: 'asterion_geleira', name: 'Geleira Partida', theme: 'neve', lv: 25, secret: true },
      { id: 'asterion_pico', name: 'Pico de Asterion', theme: 'neve', lv: 27, boss: true },
    ] },
    obsidiano: { mobs: ['legionario', 'sacerdote', 'cacador', 'drone'], zones: [
      { id: 'obsidiano_posto', name: 'Posto da Borda', theme: 'vulcao', lv: 25, hub: true, portal: true },
      { id: 'obsidiano_rios', name: 'Rios de Lava', theme: 'vulcao', lv: 28 },
      { id: 'obsidiano_forja', name: 'Forja Antiga', theme: 'vulcao', lv: 31, terminal: ['A forja fundia as armaduras da Legião de Ferro.', 'Drakos esteve aqui. A placa dele ainda está na parede.'] },
      { id: 'obsidiano_fendas', name: 'Fendas Ardentes', theme: 'vulcao', lv: 33, portal: true },
      { id: 'obsidiano_cratera', name: 'Cratera Viva', theme: 'vulcao', lv: 36, secret: true },
      { id: 'obsidiano_nucleo', name: 'Núcleo de Obsidiana', theme: 'vulcao', lv: 39, boss: true },
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
  };
  // modelos de posição (fração da sala) para acampamentos e baús, um conjunto por coluna
  const CAMP_AT = [[[0.3, 0.3], [0.7, 0.62]], [[0.25, 0.4], [0.7, 0.3], [0.6, 0.75]], [[0.5, 0.35], [0.3, 0.7]]];
  const CHEST_AT = [[0.15, 0.82], [0.88, 0.85], [0.85, 0.15]];
  const SECRET_AT = [[0.92, 0.1], [0.08, 0.9], [0.92, 0.9]];
  const TERM_AT = [[0.82, 0.18], [0.15, 0.2], [0.5, 0.9]];

  for (const reg in REG) {
    const R = REG[reg], M = R.mobs;
    R.zones.forEach((d, i) => {
      const r = Math.floor(i / 3), c = i % 3, lv = d.lv;
      // tamanho do grupo cresce com o nível; o chefe vem com escolta
      const camps = (d.hub ? [] : CAMP_AT[c]).map((at, k) => {
        const mobs = {}, n = 3 + Math.floor(lv / 10) + (k === 0 ? 1 : 0);
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
      const z = {
        region: reg, r, c, name: d.name, theme: d.theme, tiles: 15 + (i % 3), pillars: d.hub ? 4 : 4 + (i % 2), lv,
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
