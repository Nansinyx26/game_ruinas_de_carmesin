'use strict';
// ECLIPSE ZERO · Armas e equipamentos (WeaponDefinition)
// ---------------------------------------------------------------------------
// ARMAS E EQUIPAMENTOS de cada personagem (owner) — 'all' = qualquer um.
//   kind: tipo do item (para o ícone e o comportamento quando for implementado)
//   implemented: false → aparece na lista, ainda sem efeito no jogo
//   A Armadura Exoesqueleto também aparece nesta lista (ref: ARMOR_DEFS.exoesqueleto).
// ---------------------------------------------------------------------------
const WEAPON_DEFS = {
  tempestade_nula: {
    owner: 'kael', name: 'Tempestade Nula', kind: 'sword', implemented: true, stats: { dmg: 50, speed: 1.1 },
    glb: 'assets/armas/eclipse/kael_espada.glb',
    png: 'assets/armas/eclipse/kael_espada.png',
    desc: 'A lendária lâmina que devora a energia de NEXUS.'
  },
  granada_plasma: {
    owner: 'kael', name: 'Granada de Plasma', kind: 'grenade', implemented: false, stats: { dmg: 70, radius: 120 },
    glb: null,
    png: null,
    desc: 'Carga de plasma arremessada que explode em área.'
  },
  arco_foton: {
    owner: 'lyra', name: 'Arco de Fóton', kind: 'bow', implemented: true, stats: { dmg: 48, range: 680, crit: 0.15 },
    glb: 'assets/armas/eclipse/lyra_arco.glb',
    png: 'assets/armas/eclipse/lyra_arco.png',
    desc: 'Arco de energia de longo alcance; os disparos carregados acertam pontos críticos.'
  },
  lanca_plasma: {
    owner: 'drakos', name: 'Machado da Legião', kind: 'axe', implemented: true, stats: { dmg: 68, range: 130, guardBreak: 0.2 },
    glb: 'assets/armas/eclipse/drakos_machado.glb',
    png: 'assets/armas/eclipse/drakos_machado.png',
    desc: 'Machado colossal de batalha forjado em aço vulcânico temperado.'
  },
  canhao_pulso: {
    owner: 'drakos', name: 'Martelo Pesado', kind: 'hammer', implemented: true, stats: { dmg: 85, range: 140, stun: 0.8 },
    glb: 'assets/armas/eclipse/drakos_martelo.glb',
    png: 'assets/armas/eclipse/drakos_martelo.png',
    desc: 'Martelo de impacto cinético capaz de esmagar blindagens pesadas.'
  },
  orbe_controle: {
    owner: 'sera', name: 'Bastão Neural', kind: 'staff', implemented: true, stats: { dmg: 38, range: 450, cdr: -0.1 },
    glb: 'assets/armas/eclipse/sera_bastao.glb',
    png: 'assets/armas/eclipse/sera_bastao.png',
    desc: 'Emissor tecnológico focal que emite descargas eletrostáticas em cadeia.'
  },
  drone_s01: {
    owner: 'sera', name: 'Drone Orbital S-01', kind: 'drone', implemented: true, stats: { dps: 32, radius: 260 },
    glb: 'assets/armas/eclipse/sera_drone.glb',
    png: 'assets/armas/eclipse/sera_drone.png',
    desc: 'Drone de apoio que dispara sozinho nos inimigos próximos.'
  },
  laminas_duplas: {
    owner: 'orion', name: 'Lâminas Duplas', kind: 'blades', implemented: true, stats: { dmg: 26, hits: 2, speed: 1.35 },
    glb: 'assets/armas/eclipse/orion_primaria.glb',
    png: 'assets/armas/eclipse/orion_primaria.png',
    desc: 'Par de lâminas curtas de alta vibração para sequências rápidas e letais.'
  },
  modulo_stealth: {
    owner: 'orion', name: 'Pistola Oculta', kind: 'pistol', implemented: true, stats: { dmg: 36, range: 420, crit: 0.2 },
    glb: 'assets/armas/eclipse/orion_secundaria.glb',
    png: 'assets/armas/eclipse/orion_secundaria.png',
    desc: 'Disparador compacto de alta cadência para eliminações cirúrgicas à queima-roupa.'
  },
  exoesqueleto: {
    owner: 'all', name: 'Exoesqueleto', kind: 'armor', implemented: false, armorRef: 'exoesqueleto', stats: {},
    glb: 'assets/modelos/armaduras/kael/kael_n1.glb',
    png: 'assets/modelos/armaduras/kael/kael_n1.png',
    desc: 'Estrutura reforçada que qualquer personagem pode vestir.'
  },
};
