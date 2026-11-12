'use strict';
// ECLIPSE ZERO · Cidade Morta: a cidade abandonada tomada pelos zumbis (região nova do mundo aberto)
// ---------------------------------------------------------------------------
// Feita com os GLB enviados em assets/extra: os dez prédios (abandonados, de guerra, tomados pela
// mata, o galpão, o arranha-céu caído…) reduzidos e postos nas zonas como as outras estruturas
// (tools/blender/cenario/estruturas.py → js/mundo/estruturas.js, com colisão) e os zumbis no
// esqueleto do jogo (tools/importar_criacao.py → js/mundo/corpos_inimigos.js).
// - Região de 3 × 3 zonas a céu aberto (campo extenso, tema 'abandonada': asfalto rachado, mato no
//   concreto, chuva e neblina), níveis 26 a 40, aberta com o herói no nível 25 (o portão no Refúgio
//   da Aurora e a viagem pelo mapa). A Barricada da Estrada é a chegada segura (portal, mercador).
// - Tipos de zumbi (variantes dos inimigos de base: a IA e os golpes são os deles):
//     Zumbi (lento, anda em bando)            Corredora faminta (rápida, persegue)
//     Errante ressurgido (resistente, veneno) Zumbi bruto (muita vida, golpe pesado, se regenera)
//     Sombra de ossos (escondida: sai do chão ao lado do herói)
//     Pesadelo (o especial: teleporta, envenena e se regenera)
//   e o chefe da região, o Paciente Zero, no Marco Zero.
// - Carros e motos parados, contêineres, árvores mortas e mato tomando as ruas (estruturas que já
//   existiam), focos de incêndio (js/fogo.js) e os baús escondidos nos prédios (js/mundo/baus.js).
// O que ainda não tem: interiores dos prédios (os modelos enviados são cascas fechadas, sem
// salas) entram em uma próxima etapa; as missões da região, as secundárias e a masmorra do hospital
// estão no fim deste arquivo.
// ---------------------------------------------------------------------------
(function () {
  if (typeof WORLD_REGIONS === 'undefined' || typeof ENEMY_VARIANTS === 'undefined') return;
  const P2 = Math.PI / 2, PI = Math.PI;

  // ------------------------------------------------------------ cenário
  THEMES.abandonada = { floor: [205, 7, 15], wall: [210, 8], lamp: '200,215,205', accent: '160,210,130', dark: '5,8,9', darkness: 0.52,
    sky: 'city', decor: 'none', pillar: 'concrete', deco: 'natural', ruined: 0.75, cables: 3, rain: true, ambient: 'Cinzas e silêncio',
    speck: ['70,74,72', '40,52,36', '96,90,80'] };
  if (typeof WORLD_MAT_TEMA !== 'undefined') WORLD_MAT_TEMA.abandonada = 'sucata';

  // ------------------------------------------------------------ zumbis (variantes)
  const Z = (base, nome, corpo, o) => Object.assign({ base, nome, corpo, tint: [0.3, 0.36, 0.28, 0], glow: '170,230,120', escala: 1, vida: 1, dano: 1, vel: 1, tracos: [], organico: true, sangue: '96,14,18', altura: 62, raio: 15 }, o);
  Object.assign(ENEMY_VARIANTS, {
    zumbi: Z('rastejador', 'Zumbi', 'zumbi', { vida: 1.7, dano: 1, vel: 0.5, tracos: ['matilha'] }),
    zumbi_corredora: Z('cacador', 'Corredora Faminta', 'zumbi_mulher', { vida: 0.9, dano: 1.1, vel: 0.95, altura: 58, raio: 13, tracos: ['matilha'] }),
    zumbi_errante: Z('rastejador', 'Errante Ressurgido', 'zumbi_errante', { vida: 2.1, dano: 1.2, vel: 0.62, tracos: ['veneno'] }),
    zumbi_bruto: Z('legionario', 'Zumbi Bruto', 'zumbi_bruto', { vida: 1.5, dano: 1.3, vel: 0.85, tracos: ['regenera'], altura: 76, raio: 26 }),
    zumbi_surpresa: Z('cacador', 'Sombra de Ossos', 'zumbi_ossos', { vida: 1, dano: 1.2, vel: 0.85, tracos: ['enterra'], altura: 66, glow: '190,200,255' }),
    zumbi_pesadelo: Z('cacador', 'Pesadelo', 'zumbi_pesadelo', { escala: 1.08, vida: 2.3, dano: 1.5, vel: 1.05, tracos: ['teleporta', 'veneno', 'regenera'], altura: 68, glow: '200,255,120' }),
    zumbi_zero: Z('legionario', 'Paciente Zero', 'zumbi_bruto', { escala: 1.32, vida: 2.2, dano: 1.45, vel: 0.9, tracos: ['regenera', 'veneno'], altura: 78, raio: 28, glow: '255,90,70' }),
  });
  // (a altura e o raio do corpo de gente: os tipos de base são máquinas baixas ou largas)
  const aplicar0 = EnemyTraits.aplicar.bind(EnemyTraits);
  EnemyTraits.aplicar = function (e, id) {
    aplicar0(e, id);
    const V = ENEMY_VARIANTS[id];
    if (V.altura) e.height = Math.round(V.altura * V.escala);
    if (V.raio) e.radius = Math.round(V.raio * V.escala);
  };

  // ------------------------------------------------------------ região
  WORLD_REGIONS.push({ id: 'cidademorta', name: 'Cidade Morta', biome: 'Cidade abandonada', lv: [26, 40], minLv: 25, rgb: '150,205,120', at: [0.8, 0.86], r: 0.085,
    order: 10, hub: 'cm_barricada', boss: { name: 'PACIENTE ZERO', type: 'zumbi_zero', hp: 3 },
    desc: 'Uma cidade inteira largada no Dia Zero: prédios de guerra, ruas tomadas pelo mato e os mortos que não ficaram no chão. Para quem chega ao nível 25.' });
  const F = WORLD_FAIXAS.find((f) => f.id === 'metropole');
  if (F && !F.regioes.includes('cidademorta')) F.regioes.push('cidademorta');
  const junta = (T, o) => { if (typeof T !== 'undefined' && T) Object.assign(T, o); };
  junta(typeof WORLD_CONTRATO_ALVOS !== 'undefined' && WORLD_CONTRATO_ALVOS, { cidademorta: ['zumbi', 'zumbi_corredora', 'zumbi_bruto'] });
  junta(typeof WORLD_NOMES_ALVO !== 'undefined' && WORLD_NOMES_ALVO, { zumbi: 'zumbis', zumbi_corredora: 'corredoras famintas', zumbi_errante: 'errantes ressurgidos', zumbi_bruto: 'zumbis brutos', zumbi_surpresa: 'sombras de ossos', zumbi_pesadelo: 'pesadelos' });
  junta(typeof WORLD_MAT_REG !== 'undefined' && WORLD_MAT_REG, { cidademorta: 'tecido' });
  junta(typeof WORLD_FACCOES !== 'undefined' && WORLD_FACCOES, { cidademorta: { nome: 'Sobreviventes da Barricada' } });
  junta(typeof WORLD_INSIGNIAS !== 'undefined' && WORLD_INSIGNIAS, { cidademorta: { unico: 'Plaqueta do Paciente Zero', b: 'placa', st: { vida: 70, defesa: 0.06, veloc: 0.04 } } });
  junta(typeof CLIMA_REGIAO !== 'undefined' && CLIMA_REGIAO, { cidademorta: [15, 8] });
  junta(typeof WORLD_CLIMA_REG !== 'undefined' && WORLD_CLIMA_REG, { cidademorta: { neblina: 4, chuva: 3, limpo: 2, tempestade: 1 } });
  junta(typeof FAB_PLANO_CHEFE !== 'undefined' && FAB_PLANO_CHEFE, { cidademorta: 'cristal' });
  junta(typeof WORLD_SUFIXO !== 'undefined' && WORLD_SUFIXO, { cidademorta: 'da Cidade Morta' });
  junta(typeof WORLD_MERCADOR_FALAS !== 'undefined' && WORLD_MERCADOR_FALAS, { cidademorta: 'Tudo isto saiu de dentro dos prédios. Não pergunte de qual.' });

  // ------------------------------------------------------------ zonas (grade 3 × 3)
  const MOBS = ['zumbi', 'zumbi_corredora', 'zumbi', 'zumbi_errante', 'zumbi_bruto', 'zumbi', 'zumbi_surpresa'];
  const ZONAS = [
    { id: 'cm_barricada', name: 'Barricada da Estrada', lv: 26, hub: true, portal: true },
    { id: 'cm_avenida', name: 'Avenida dos Carros Parados', lv: 27 },
    { id: 'cm_bloco17', name: 'Bloco 17', lv: 28, terminal: ['Aviso do síndico: o elevador está parado. As escadas também não são seguras.', 'Último registro da portaria: "eles sobem devagar, mas sobem".'] },
    { id: 'cm_mercado', name: 'Mercado Saqueado', lv: 30 },
    { id: 'cm_praca', name: 'Praça do Relógio Parado', lv: 31, portal: true },
    { id: 'cm_hospital', name: 'Hospital São Lázaro', lv: 33, terminal: ['Prontuário 0001: o paciente não tem pulso e pede água.', 'A ala leste foi lacrada por dentro. Ninguém anotou por quem.'] },
    { id: 'cm_galpoes', name: 'Galpões da Estação', lv: 34, secret: true },
    { id: 'cm_torres', name: 'Torres Tomadas', lv: 36 },
    { id: 'cm_marco_zero', name: 'Marco Zero', lv: 38, boss: true },
  ];
  // lugares dos bandos (fração da sala): nas ruas, entre os prédios das bordas; o primeiro patrulha
  const CAMPOS = [[0.5, 0.42], [0.3, 0.62], [0.72, 0.6], [0.5, 0.8], [0.26, 0.36], [0.76, 0.34]];
  ZONAS.forEach((d, i) => {
    const r = Math.floor(i / 3), c = i % 3, lv = d.lv;
    const camps = d.hub ? [] : CAMPOS.slice(0, 4 + (i % 3)).map((at, k) => {
      // bandos pequenos de perto (a cidade inteira não cai em cima do herói): 3 a 5, com o especial só de vez em quando
      const mobs = {}, n = 3 + ((i + k) % 3);
      for (let q = 0; q < n; q++) { const t = MOBS[(q * 2 + k + i) % MOBS.length]; mobs[t] = (mobs[t] || 0) + 1; }
      if ((i + k) % 4 === 3) mobs.zumbi_pesadelo = 1;
      return { at, mobs };
    });
    if (d.boss) camps.unshift({ at: [0.5, 0.34], mobs: { zumbi_zero: 1, zumbi_bruto: 1, zumbi: 2 }, boss: true });
    const cells = Math.round(8 + lv * 2.4);
    const z = { region: 'cidademorta', r, c, name: d.name, theme: 'abandonada', aberto: true, lv, seguro: false,
      tiles: 46 + (i % 2) * 4, pillars: 0, portal: !!d.portal, hub: !!d.hub, camps, mobs: MOBS.concat(['zumbi_pesadelo', 'zumbi_zero']),
      chests: [Object.assign({ at: [[0.2, 0.5], [0.8, 0.5], [0.5, 0.6]][c], cells, xp: lv * 8 }, d.hub || i % 2 ? { heal: true } : {}),
        ...(d.boss ? [{ at: [0.5, 0.16], cells: cells * 3, xp: lv * 30, heal: true, boss: true }] : [])] };
    if (d.secret) z.secret = { at: [0.9, 0.5], cells: cells * 2, xp: lv * 18 };
    if (d.terminal) z.terminal = { at: [0.5, 0.52], lines: d.terminal };
    if (d.hub) {
      z.npcs = [{ model: 'civil', variant: 2, name: 'MERCADOR', merchant: true, at: [0.62, 0.44], facing: 2.2,
        lines: ['Tenho o que você precisa, se tiver células.', WORLD_MERCADOR_FALAS && WORLD_MERCADOR_FALAS.cidademorta || 'Vendo e compro o que achar por aí.'] },
      { model: 'civil', name: 'BATEDORA DA BARRICADA', quest: true, at: [0.4, 0.44], facing: 0.4,
        lines: ['Daqui para dentro, não corra: correr chama os que ainda escutam.', 'Os brutos aguentam muito. Os de osso saem do chão do seu lado. E o Paciente Zero espera no Marco Zero.'] }];
    }
    worldPrepZone(d.id, z);
  });

  // ------------------------------------------------------------ prédios e ruas (js/mundo/estruturas.js)
  // [id, x, y (fração da sala), giro, escala]: os prédios nas bordas formam as quadras; no meio ficam
  // as ruas, com os carros parados, os contêineres e o mato
  if (typeof Estruturas !== 'undefined') Object.assign(Estruturas.ZONAS, {
    cm_barricada: [['casarao_abandonado', 0.15, 0.15, 0.4, 0.9], ['predio_abandonado', 0.85, 0.14, 0, 0.8], ['sobrado_pos_punk', 0.14, 0.84, 1.2, 0.9], ['ruinas_retomadas', 0.86, 0.84, 2.6, 0.75],
      ['item_ambiente_cbp_1', 0.42, 0.3, 0.2, 1.4], ['item_ambiente_cbp_1', 0.5, 0.29, -0.1, 1.4], ['item_ambiente_cbp_2', 0.58, 0.3, 0.3, 1.3], ['carro_neon', 0.3, 0.5, 1.2, 1], ['item_ambiente_md_8', 0.5, 0.52, 0, 1]],
    cm_avenida: [['predio_de_guerra', 0.14, 0.15, 0, 0.85], ['bloco_17', 0.5, 0.1, 0, 0.75], ['arranha_ceu_caido', 0.86, 0.16, 0, 0.7], ['ruinas_retomadas', 0.15, 0.85, 0.5, 0.8], ['casarao_abandonado', 0.86, 0.84, -2.4, 0.9],
      ['carro_neon', 0.36, 0.44, 0.1, 1], ['carro_neon', 0.48, 0.5, 0.4, 1], ['carro_neon', 0.62, 0.46, -0.2, 1], ['moto_neon', 0.56, 0.6, 1.2, 1], ['ponto_onibus', 0.3, 0.3, 0, 0.9], ['arvore_6', 0.72, 0.66, 0, 1]],
    cm_bloco17: [['bloco_17', 0.3, 0.11, 0, 0.8], ['bloco_17', 0.72, 0.11, 0, 0.8], ['predio_musgo', 0.12, 0.6, P2, 0.75], ['casarao_abandonado', 0.86, 0.82, -2.2, 0.9],
      ['carro_neon', 0.5, 0.36, P2, 1], ['item_ambiente_cbp_2', 0.4, 0.62, 0.5, 1.3], ['arvore_6', 0.6, 0.72, 0.4, 1.1], ['planta_3', 0.34, 0.4, 0, 1.2], ['planta_3', 0.66, 0.5, 1, 1.2]],
    cm_mercado: [['galpao_abandonado', 0.2, 0.15, 0, 0.9], ['sobrado_pos_punk', 0.8, 0.15, -0.3, 0.95], ['predio_abandonado', 0.14, 0.82, 0.8, 0.8], ['ruinas_retomadas', 0.86, 0.82, 2.4, 0.8],
      ['item_ambiente_cbp_1', 0.44, 0.34, 0, 1.4], ['item_ambiente_cbp_3', 0.52, 0.36, 0.6, 1.3], ['item_ambiente_cbp_2', 0.6, 0.66, 1.1, 1.3], ['carro_neon', 0.36, 0.6, 2.2, 1], ['moto_neon', 0.66, 0.42, 0.3, 1]],
    cm_praca: [['torre_tomada', 0.5, 0.11, 0, 0.8], ['predio_musgo', 0.13, 0.2, 0.3, 0.75], ['predio_de_guerra', 0.87, 0.2, -0.3, 0.8], ['casarao_abandonado', 0.14, 0.84, 1, 0.9], ['sobrado_pos_punk', 0.86, 0.84, -2.2, 0.9],
      ['arvore_6', 0.4, 0.42, 0, 1.2], ['arvore_6', 0.6, 0.44, 1.4, 1.1], ['planta_4', 0.5, 0.6, 0, 1.2], ['ponto_onibus', 0.7, 0.62, PI, 0.9], ['carro_neon', 0.3, 0.62, 0.7, 1]],
    cm_hospital: [['bloco_17', 0.5, 0.11, 0, 0.9], ['predio_abandonado', 0.12, 0.5, P2, 0.8], ['arranha_ceu_caido', 0.88, 0.8, 2.6, 0.65], ['ruinas_retomadas', 0.14, 0.86, 0.9, 0.75],
      ['carro_neon', 0.42, 0.34, 0, 1], ['carro_neon', 0.58, 0.34, PI, 1], ['item_ambiente_cbp_3', 0.34, 0.6, 0.2, 1.3], ['planta_3', 0.64, 0.6, 0, 1.2]],
    cm_galpoes: [['galpao_abandonado', 0.22, 0.15, 0, 1], ['galpao_abandonado', 0.72, 0.15, 0, 1], ['galpao_abandonado', 0.2, 0.84, PI, 0.9], ['ruinas_retomadas', 0.84, 0.8, 2, 0.85],
      ['item_ambiente_cbp_1', 0.4, 0.42, 0.3, 1.5], ['item_ambiente_cbp_1', 0.47, 0.44, -0.2, 1.5], ['item_ambiente_cbp_2', 0.62, 0.6, 0.8, 1.4], ['item_ambiente_cbp_3', 0.56, 0.66, 0.1, 1.4], ['moto_neon', 0.34, 0.64, 2, 1]],
    cm_torres: [['torre_tomada', 0.2, 0.13, 0, 0.9], ['torre_tomada', 0.8, 0.13, 0.4, 0.85], ['predio_musgo', 0.5, 0.1, 0, 0.8], ['arranha_ceu_caido', 0.14, 0.82, 1, 0.75], ['predio_de_guerra', 0.86, 0.84, 2.6, 0.85],
      ['arvore_6', 0.36, 0.4, 0, 1.2], ['planta_4', 0.6, 0.42, 0, 1.3], ['planta_3', 0.44, 0.66, 0, 1.3], ['carro_neon', 0.64, 0.64, 1.9, 1]],
    cm_marco_zero: [['arranha_ceu_caido', 0.5, 0.09, 0, 0.95], ['predio_de_guerra', 0.14, 0.2, 0.3, 0.9], ['bloco_17', 0.86, 0.2, -0.3, 0.8], ['ruinas_retomadas', 0.14, 0.84, 1.2, 0.9], ['predio_abandonado', 0.86, 0.84, 2.4, 0.85],
      ['carro_neon', 0.34, 0.56, 0.5, 1], ['carro_neon', 0.66, 0.58, 2.6, 1], ['item_ambiente_cbp_2', 0.5, 0.7, 0, 1.4]],
  });

  // Entulho das ruas: em vez dos obstáculos do gerador de salas (formas simples), cada zona espalha
  // objetos GLB (árvores mortas, mato, rochas, carros, motos e contêineres), sempre os mesmos pela
  // semente da zona; giro em quartos de volta e escala fixa por peça (poucas fotos na vista isométrica)
  if (typeof Estruturas !== 'undefined') {
    const SOLTOS = [['arvore_6', 1.1], ['planta_3', 1.2], ['planta_4', 1.2], ['planta_2', 1.3], ['rochas_grupo', 1], ['carro_neon', 1], ['item_ambiente_cbp_1', 1.4], ['moto_neon', 1], ['arvore_6', 1.1], ['planta_3', 1.2]];
    ZONAS.forEach((d, i) => {
      const L = Estruturas.ZONAS[d.id], rnd = mulberry32((i * 9973 + 4421) >>> 0), n = d.hub ? 8 : 14;
      for (let k = 0; k < n; k++) {
        const [id, esc] = SOLTOS[Math.floor(rnd() * SOLTOS.length)];
        L.push([id, 0.12 + rnd() * 0.76, 0.16 + rnd() * 0.7, Math.floor(rnd() * 4) * P2, esc]);
      }
    });
  }

  // ------------------------------------------------------------ sobreviventes, missões e masmorra
  // Dois sobreviventes da barricada (corpos dos GLB já convertidos: tools/meshy/npcs.json) dão as
  // missões secundárias; a batedora da entrada dá as três missões da região
  if (typeof WORLD_POVO !== 'undefined') {
    const GENTE = [
      { id: 'cm_mendes', meshy: 'npc_guarda', nome: 'CABO MENDES', zona: 'cm_barricada', at: [0.3, 0.6], facing: 5.6, papel: 'Vigia da barricada', servicos: [],
        personalidade: 'Cansado e atento; conta os dias pela munição que sobra.',
        ola: ['Devagar. Daqui para dentro, barulho é convite.', 'Ainda de pé? Então a barricada também está.'],
        temas: [['O que aconteceu aqui?', 'Começou no São Lázaro. Um paciente sem pulso pediu água. Em uma semana a cidade inteira andava daquele jeito.'],
          ['Como eu passo por eles?', 'Os comuns escutam mal e andam devagar. As corredoras, não. E os brutos… não troque golpe com um bruto: saia do caminho.']] },
      { id: 'cm_tonho', meshy: 'npc_operario', nome: 'TONHÃO', zona: 'cm_barricada', at: [0.7, 0.62], facing: 3.6, papel: 'Mecânico da barricada', servicos: [],
        personalidade: 'Falador e prático; conserta qualquer coisa com o que acha nos carros parados.',
        ola: ['Se tem roda, eu faço andar. Se não tem, eu ponho roda.', 'Trouxe peça? Diz que trouxe peça.'],
        temas: [['Do que a barricada precisa?', 'Engrenagem e circuito. O portão é segurado por um motor de elevador e por reza. O motor eu sei consertar.']] },
    ];
    for (const P of GENTE) {
      if (WORLD_POVO.some((q) => q.id === P.id)) continue;
      if (typeof NPC3D !== 'undefined') NPC3D[P.id] = { ap: { npc: P.meshy }, roupa: {} };
      WORLD_POVO.push(Object.assign({ model: 'civil', variant: 0 }, P));
    }
    if (typeof Povo !== 'undefined' && Povo.montar) Povo.montar();
  }
  if (typeof WORLD_QUESTS !== 'undefined') WORLD_QUESTS.cidademorta = [
    { id: 'cm1', name: 'Rua por Rua', tipo: 'matar', alvo: 'zumbi', n: 16, rec: { cells: 460, xp: 9500, min: 2 },
      ini: 'A avenida está cheia deles e a barricada não aguenta outra noite assim. Derrube dezesseis ressurgidos e a gente respira.', fim: 'Dezesseis a menos. Esta noite alguém aqui vai dormir.' },
    { id: 'cm2', name: 'O Prontuário 0001', tipo: 'terminais', rec: { cells: 560, xp: 12500, min: 2 },
      ini: 'A portaria do Bloco 17 e o São Lázaro ainda têm terminais ligados. Leia os registros: quero saber como isto começou.', fim: '"Sem pulso e pede água." Então começou com um só. O Paciente Zero ainda está lá, no Marco Zero.' },
    { id: 'cm3', name: 'Paciente Zero', tipo: 'chefe', rec: { cells: 950, xp: 23000, min: 3 },
      ini: 'Tudo isto saiu de um corpo só, e ele ainda anda no Marco Zero. Acabe com ele e a cidade para de se levantar.', fim: 'Parou. Os que sobraram andam sem rumo, como se tivessem esquecido o caminho. A cidade é nossa de novo. Devagar, mas é.' },
  ];
  if (typeof WORLD_MASMORRAS !== 'undefined' && !WORLD_MASMORRAS.subsolo_lazaro) {
    WORLD_MASMORRAS.subsolo_lazaro = { nome: 'Subsolo do São Lázaro', reg: 'cidademorta', zona: 'cm_hospital', at: [0.5, 0.86], tema: 'lab', lv: 35,
      mobs: ['zumbi', 'zumbi_errante', 'zumbi_bruto', 'zumbi_surpresa'], chefe: { tipo: 'zumbi_bruto', nome: 'O CIRURGIÃO', hp: 4.6, escolta: { zumbi: 2 } },
      desc: 'A ala lacrada por dentro: necrotério, depósito e a sala onde o primeiro paciente foi operado.' };
    if (typeof WORLD_TESOUROS !== 'undefined') Object.assign(WORLD_TESOUROS, {
      tes_farmacia: { zona: 'cm_mercado', at: [0.88, 0.5], nome: 'Cofre da farmácia', rec: { cel: 900, mat: { engrenagem: 3 }, rel: { min: 2 } } },
      tes_bilheteria: { zona: 'cm_galpoes', at: [0.12, 0.5], nome: 'Bilheteria trancada', rec: { cel: 1100, mat: { circuito: 3 }, rel: { min: 3 } } },
    });
    if (typeof Locais !== 'undefined' && Locais.montar) Locais.montar();   // os três andares da masmorra nova
  }
  if (typeof WORLD_AVENTURAS !== 'undefined' && !WORLD_AVENTURAS.some((q) => q.id === 'cm_s1')) WORLD_AVENTURAS.push(
    { id: 'cm_s1', reg: 'cidademorta', nome: 'O Motor do Portão', doador: 'cm_tonho', nivel: 26,
      desc: 'O portão da barricada é movido por um motor de elevador que não aguenta mais um inverno.',
      ini: 'Seis engrenagens e três circuitos. Com isso o portão fecha sozinho e ninguém mais precisa empurrar no escuro.',
      passos: [{ t: 'entregar', npc: 'cm_tonho', mat: { engrenagem: 6, circuito: 3 }, fim: true, txt: 'Leve 6 Engrenagens e 3 Circuitos ao Tonhão, na Barricada da Estrada' }],
      fim: 'Escuta só. Fechou sozinho. Faz anos que eu não ouvia esse barulho bonito.', rec: { xp: 10500, cel: 580, rep: 160, rel: { min: 2 } } },
    { id: 'cm_s2', reg: 'cidademorta', nome: 'Os que Correm', doador: 'cm_mendes', nivel: 30,
      desc: 'As corredoras famintas alcançam quem foge. Mendes perdeu dois batedores para elas.',
      ini: 'Dez corredoras. Elas vêm em linha reta e não cansam: espere chegarem e não dê as costas.',
      passos: [{ t: 'matar', alvo: 'zumbi_corredora', n: 10, reg: 'cidademorta', txt: 'Derrote 10 corredoras famintas na Cidade Morta' }, { t: 'falar', npc: 'cm_mendes', fim: true, txt: 'Volte ao Cabo Mendes, na Barricada da Estrada' }],
      fim: 'Dez. Pelos dois que não voltaram. Obrigado.', rec: { xp: 14000, cel: 700, rep: 180, cons: { tonico: 2 } } },
    { id: 'cm_s3', reg: 'cidademorta', nome: 'A Ala Lacrada', doador: 'cm_mendes', nivel: 34,
      desc: 'A ala leste do São Lázaro foi lacrada por dentro. O que ficou lá embaixo ainda bate na porta.',
      ini: 'Desça ao subsolo do hospital e acabe com o que estiver operando lá. Se achar remédio, melhor ainda.',
      passos: [{ t: 'masmorra', id: 'subsolo_lazaro', txt: 'Vença o Subsolo do São Lázaro, no hospital' }, { t: 'falar', npc: 'cm_mendes', fim: true, txt: 'Volte ao Cabo Mendes, na Barricada da Estrada' }],
      fim: 'Então era um cirurgião. Operando até hoje. Deus me livre. Toma: você fez por merecer.', rec: { xp: 19000, cel: 850, rep: 200, rel: { min: 3 } } });

  // ------------------------------------------------------------ focos de incêndio
  // (chamado por World.loadZone depois das estruturas: três ou quatro fogos nas ruas das zonas de luta)
  window.CidadeMorta = {
    aoCarregar(z) {
      if (!z || z.region !== 'cidademorta' || typeof Fogo === 'undefined' || !Fogo.acender || !game.room) return 0;
      const R = game.room, rnd = mulberry32((z.lv * 7919 + 13) >>> 0), n = z.hub ? 1 : 3 + (z.lv % 2);
      let k = 0;
      for (let i = 0; i < 40 && k < n; i++) {
        const x = R.w * (0.2 + rnd() * 0.6), y = R.h * (0.26 + rnd() * 0.5);
        if (!R.canStand(x, y, 30) || game.npcs.some((q) => dist(q.x, q.y, x, y) < 110)) continue;
        Fogo.acender(x, y, z.hub ? 'fogueira' : 'chamas', { fixo: true, k: 0.7 + rnd() * 0.5 });
        k++;
      }
      return k;
    },
  };
})();
