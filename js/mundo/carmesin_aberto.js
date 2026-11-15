'use strict';
// ECLIPSE ZERO · Ruínas de Carmesin a céu aberto e o Refúgio da Aurora sem paredes (CarmesinAberto)
// ---------------------------------------------------------------------------
// Grandes Regiões, etapa 3 (docs/REGIOES_CONTINUAS.md): as zonas de cidade deixam de ser salas com
// paredes ligadas por passagens. Primeiro Carmesin (a região inicial) e a cidade principal:
// - As 9 zonas de Carmesin viram campo aberto (~2.600 u de lado, três vezes o lado de antes) com o tema
//   'carmesin': a avenida rachada da cidade antiga, o entulho, o mato seco e as veias vermelhas da
//   corrupção. Anda-se de uma zona para a outra pela borda, sem passagem nem escurecer, e as vizinhas
//   aparecem além da borda (js/mundo/vizinhos.js). No lugar das colunas do gerador de salas, as quadras
//   são prédios GLB do projeto (js/mundo/estruturas.js, com colisão): prédios em ruínas, torres,
//   galpões, a catedral, bancas do mercado, carros parados e entulho.
// - O Refúgio da Aurora entra na grade de Carmesin, ao norte dos Portões Partidos, também a céu aberto:
//   as fachadas dos distritos continuam no fundo (norte e oeste); do sul, a rua desce até os Portões, e a
//   Estrada da Floresta (js/mundo/ligacoes.js) liga os Portões a Velmora. Velmora → Portões → Aurora a pé,
//   sem portal. Os portões de viagem da cidade ficam todos na borda leste.
// O nome, o nível, os moradores, os terminais, o chefe e as missões de cada zona continuam os mesmos; só
// mudam o tamanho, o chão e os lugares (acampamentos, baús e terminais vão para as ruas, longe dos prédios).
// ---------------------------------------------------------------------------
const CarmesinAberto = (() => {
  const P2 = Math.PI / 2, PI = Math.PI;
  if (typeof THEMES !== 'undefined') THEMES.carmesin = { floor: [352, 16, 13], wall: [354, 14], lamp: '255,96,104', accent: '255,52,84', dark: '14,3,6', darkness: 0.58,
    sky: 'city', decor: 'none', pillar: 'concrete', deco: 'natural', ruined: 0.6, cables: 2, ambient: 'Energia vermelha e ruínas',
    speck: ['120,30,36', '44,32,32', '96,84,80'], amb3p: [0.62, 0.5, 0.52] };
  if (typeof WORLD_RECURSOS !== 'undefined') WORLD_RECURSOS.carmesin = { nome: 'SUCATA CARMESIM', rgb: '255,120,130', mat: 'sucata' };
  if (typeof WORLD_MAT_TEMA !== 'undefined') WORLD_MAT_TEMA.carmesin = 'sucata';

  // lugares nas ruas (fração da zona): longe das quadras dos cantos e do portal no cruzamento
  const RUAS = [[0.38, 0.4], [0.64, 0.62], [0.63, 0.38], [0.37, 0.63], [0.5, 0.24], [0.5, 0.78], [0.24, 0.5], [0.77, 0.5]];
  // Cada zona: as quadras (prédios GLB: id, x, y, giro, escala), as ruas do chão e onde ficam baú, segredo e terminal
  const ZONAS = {
    portoes: { chao: { manchas: [['cascalho', 0.14, 240]] }, ruas: [['h', 0.5], ['v', 0.5]], bau: [0.3, 0.6], term: [0.6, 0.27],
      glb: [['estrutura_md_2', 0.1, 0.33, P2, 0.55], ['estrutura_md_2', 0.1, 0.67, P2, 0.55], ['muro_ruinas_placa', 0.05, 0.41, P2, 1.3], ['muro_ruinas_placa', 0.05, 0.59, P2, 1.3],
        ['casarao_abandonado', 0.3, 0.15, 0, 0.75], ['predio_de_guerra', 0.82, 0.17, 0, 0.7], ['sobrado_pos_punk', 0.3, 0.85, PI, 0.85], ['ruinas_retomadas', 0.82, 0.83, PI, 0.72],
        ['item_ambiente_md_8', 0.16, 0.44, 0, 1.1], ['item_ambiente_md_8', 0.16, 0.56, 0, 1.1], ['carro_neon', 0.44, 0.58, 0.3, 1], ['ponto_onibus', 0.68, 0.58, PI, 0.9]] },
    avenida: { chao: { manchas: [['cinza', 0.16, 260]] }, ruas: [['h', 0.5], ['v', 0.3], ['v', 0.72]], bau: [0.86, 0.6], term: null,
      glb: [['bloco_17', 0.5, 0.15, 0, 0.7], ['predio_abandonado', 0.14, 0.17, 0, 0.7], ['arranha_ceu_caido', 0.87, 0.18, 0, 0.62], ['predio_musgo', 0.5, 0.85, PI, 0.7], ['casarao_abandonado', 0.14, 0.84, PI, 0.75],
        ['carro_neon', 0.42, 0.46, P2, 1], ['carro_neon', 0.58, 0.53, -P2, 1], ['moto_neon', 0.66, 0.44, 1.2, 1], ['painel_anuncio', 0.86, 0.38, 0, 1.2]] },
    vigia: { chao: { manchas: [['cascalho', 0.14, 220], ['metal', 0.08, 200]] }, ruas: [['h', 0.55], ['v', 0.5]], bau: [0.62, 0.22], term: [0.4, 0.3],
      glb: [['torre_tomada', 0.22, 0.2, 0, 0.75], ['torre_antena', 0.8, 0.18, 0, 0.8], ['estrutura_md_6', 0.8, 0.84, 0, 0.6], ['galpao_abandonado', 0.22, 0.84, PI, 0.7],
        ['muro_ruinas_placa', 0.38, 0.8, 0.4, 1.2], ['estrutura_md_12', 0.42, 0.5, 0, 1], ['estrutura_md_12', 0.58, 0.6, 0, 1], ['item_ambiente_cbp_2', 0.68, 0.7, 0.6, 1.3]] },
    mercado: { chao: { manchas: [['lajes', 0.26, 300]] }, ruas: [['h', 0.5], ['v', 0.5]], bau: [0.7, 0.86], term: null,
      glb: [['galpao_abandonado', 0.16, 0.15, 0, 0.6], ['sobrado_pos_punk', 0.84, 0.15, 0, 0.8], ['hearthside_forge', 0.15, 0.85, PI, 0.75], ['casarao_abandonado', 0.85, 0.85, PI, 0.7],
        ['estrutura_md_7', 0.36, 0.32, 0.2, 1], ['moonlit_medieval_mark', 0.64, 0.32, -0.2, 1], ['banca_ceramica', 0.36, 0.6, 0.1, 1], ['estrutura_md_7', 0.64, 0.66, PI, 1],
        ['quadro_de_missoes_medieval', 0.44, 0.24, 0, 1.2], ['item_ambiente_md_3', 0.3, 0.38, 0.4, 1.2], ['item_ambiente_md_1', 0.7, 0.38, 0, 1.2], ['estrutura_md_10', 0.58, 0.44, 0, 1]] },
    praca: { chao: { manchas: [['lajes', 0.3, 320], ['folhas', 0.08, 200]] }, ruas: [['h', 0.52], ['v', 0.5]], bau: [0.22, 0.62], term: [0.5, 0.72],
      glb: [['estrutura_md_3', 0.5, 0.14, 0, 0.6], ['predio_musgo', 0.13, 0.2, 0, 0.62], ['predio_de_guerra', 0.87, 0.2, 0, 0.62], ['ruinas_retomadas', 0.86, 0.84, PI, 0.7],
        ['estrutura_md_11', 0.5, 0.5, 0, 1], ['item_ambiente_md_7', 0.4, 0.34, 0, 1.2], ['item_ambiente_md_7', 0.6, 0.34, 0, 1.2], ['estrutura_md_16', 0.3, 0.86, PI, 0.9]] },
    galerias: { chao: { manchas: [['grade', 0.16, 220], ['metal', 0.1, 240]], canais: [0.22, 0.78] }, ruas: [['h', 0.5], ['v', 0.42]], bau: [0.86, 0.62], term: null,
      glb: [['galpao_abandonado', 0.2, 0.16, 0, 0.7], ['estrutura_cbp_5', 0.78, 0.17, 0, 0.75], ['oficina_mecanica', 0.8, 0.84, PI, 0.8], ['estrutura_cbp_2', 0.18, 0.84, PI, 0.75],
        ['item_ambiente_cbp_1', 0.56, 0.36, 0.3, 1.5], ['item_ambiente_cbp_1', 0.6, 0.4, -0.2, 1.5], ['item_ambiente_cbp_3', 0.3, 0.62, 0.1, 1.4], ['drone_carga', 0.6, 0.6, 0, 1.4]] },
    laboratorio: { chao: { manchas: [['plataforma', 0.18, 260], ['vidro', 0.08, 200]] }, ruas: [['h', 0.5], ['v', 0.5]], bau: [0.7, 0.24], term: [0.3, 0.3],
      glb: [['sci_fi_clinic', 0.18, 0.16, 0, 0.75], ['estufa_cupula', 0.82, 0.17, 0, 0.7], ['torre_antena', 0.84, 0.84, 0, 0.7], ['ruinas_retomadas', 0.17, 0.84, PI, 0.7],
        ['item_ambiente_md_9', 0.42, 0.62, 0, 1.4], ['item_ambiente_cbp_4', 0.6, 0.36, 0, 1.6], ['item_ambiente_cbp_2', 0.64, 0.7, 0.8, 1.3]] },
    fendas: { chao: { manchas: [['basalto', 0.22, 300], ['rachado', 0.14, 240]] }, ruas: [['v', 0.5]], bau: [0.84, 0.28], term: null,
      glb: [['arranha_ceu_caido', 0.16, 0.2, 0.4, 0.6], ['rochas_grupo', 0.82, 0.18, 0.3, 1.6], ['rochas_grupo', 0.86, 0.5, 1.2, 1.4], ['escadaria_ruinas', 0.8, 0.84, PI, 1.1], ['predio_abandonado', 0.18, 0.84, PI, 0.65],
        ['muro_ruinas_placa', 0.36, 0.3, 0.6, 1.3], ['item_ambiente_md_9', 0.62, 0.66, 0, 1.4], ['rochas_grupo', 0.3, 0.56, 2, 1.2]] },
    coracao: { chao: { manchas: [['lajes', 0.2, 280], ['basalto', 0.16, 260]] }, ruas: [['v', 0.5], ['h', 0.62]], bau: [0.2, 0.62], term: null, chefe: [0.5, 0.4], bauChefe: [0.5, 0.27],
      glb: [['estrutura_md_3', 0.5, 0.12, 0, 0.62], ['arco_braseiros', 0.5, 0.88, 0, 1.2], ['estrutura_md_6', 0.14, 0.18, 0, 0.6], ['estrutura_md_6', 0.86, 0.18, 0, 0.6],
        ['ruinas_retomadas', 0.14, 0.84, PI, 0.66], ['predio_de_guerra', 0.86, 0.84, PI, 0.62], ['item_ambiente_md_9', 0.38, 0.5, 0, 1.6], ['item_ambiente_md_9', 0.62, 0.5, 0, 1.6],
        ['item_ambiente_md_7', 0.42, 0.24, 0, 1.3], ['item_ambiente_md_7', 0.58, 0.24, 0, 1.3]] },
  };
  // entulho solto (sempre o mesmo pela semente da zona), como na Cidade Morta
  const SOLTOS = [['rochas_grupo', 1], ['muro_ruinas_placa', 1.1], ['carro_neon', 1], ['item_ambiente_cbp_1', 1.4], ['planta_3', 1.1], ['arvore_6', 1], ['item_ambiente_md_8', 1], ['estrutura_md_12', 1]];

  function montar() {
    if (typeof WORLD_ZONES === 'undefined') return;
    const ids = Object.keys(ZONAS);
    ids.forEach((id, i) => {
      const z = WORLD_ZONES[id], L = ZONAS[id];
      if (!z || z.region !== 'carmesin') return;
      Object.assign(z, { aberto: true, theme: 'carmesin', tiles: 44 + (i % 2) * 4, pillars: 0, ruasCarmesin: L.ruas, chaoCarmesin: L.chao || {} });
      // acampamentos nas ruas (o do chefe na frente da catedral); zona maior, mais grupos com os mesmos bichos
      if (!z.hub) {
        const base = (z.camps || []).filter((c) => !c.boss), chefe = (z.camps || []).find((c) => c.boss), out = [];
        const n = Math.min(RUAS.length, base.length + 2);
        for (let k = 0; k < n; k++) { const c = base[k % base.length]; out.push(Object.assign({}, c, { at: RUAS[(k + i) % RUAS.length], mobs: Object.assign({}, c.mobs) })); }
        if (chefe) out.unshift(Object.assign({}, chefe, { at: L.chefe || [0.5, 0.4] }));
        z.camps = out;
      }
      (z.chests || []).forEach((c) => { c.at = c.boss ? (L.bauChefe || [0.5, 0.27]) : L.bau; });
      if (z.secret) z.secret.at = [0.92, 0.5];
      if (z.terminal) z.terminal.at = L.term || [0.42, 0.58];
      if (z.hub) for (const N of z.npcs || []) N.at = N.merchant ? [0.58, 0.42] : [0.42, 0.44];
      if (typeof Estruturas !== 'undefined') {
        const E = L.glb.slice(), rnd = typeof mulberry32 === 'function' ? mulberry32((i * 7919 + 1301) >>> 0) : Math.random, n = z.hub ? 4 : 9;
        for (let k = 0; k < n; k++) {
          const [sid, esc] = SOLTOS[Math.floor(rnd() * SOLTOS.length)];
          let x = 0.12 + rnd() * 0.76, y = 0.14 + rnd() * 0.72;
          if (Math.abs(x - 0.5) < 0.09 && Math.abs(y - 0.5) < 0.09) x += 0.16;   // (o cruzamento e o portal ficam livres)
          E.push([sid, x, y, Math.floor(rnd() * 4) * P2, esc]);
        }
        Estruturas.ZONAS[id] = E;
      }
    });
    // o Refúgio da Aurora: na grade de Carmesin, ao norte dos Portões Partidos, a céu aberto
    const A = typeof CIDADE_ID !== 'undefined' && WORLD_ZONES[CIDADE_ID];
    if (A) {
      Object.assign(A, { region: 'carmesin', r: -1, c: 0, aberto: true, tiles: 30 });
      A.sub = 'CARMESIN · CIDADE PRINCIPAL · BASE DA RESISTÊNCIA';
    }
  }
  montar();
  return { ZONAS, RUAS, montar };
})();
if (typeof window !== 'undefined') window.CarmesinAberto = CarmesinAberto;
