'use strict';
// ECLIPSE ZERO · Armas e equipamentos (WeaponDefinition)
// ---------------------------------------------------------------------------
// ARMAS E EQUIPAMENTOS de cada personagem (owner) — 'all' = qualquer um.
//   kind: tipo do item (para o ícone e o comportamento quando for implementado)
//   implemented: false → aparece na lista, ainda sem efeito no jogo
//   A Armadura Exoesqueleto também aparece nesta lista (ref: ARMOR_DEFS.exoesqueleto).
// ---------------------------------------------------------------------------
const WEAPON_DEFS = {
  tempestade_nula: { owner: 'kael', name: 'Tempestade Nula', kind: 'sword', implemented: true, stats: {},
    desc: 'A espada que devora a energia de NEXUS.' },
  granada_plasma: { owner: 'kael', name: 'Granada de Plasma', kind: 'grenade', implemented: false, stats: { dmg: 70, radius: 120 } },
  arco_foton: { owner: 'lyra', name: 'Arco de Fóton', kind: 'bow', implemented: false, stats: { dmg: 24, range: 620 } },
  lanca_plasma: { owner: 'drakos', name: 'Lança de Plasma', kind: 'spear', implemented: false, stats: { dmg: 30, range: 110 } },
  canhao_pulso: { owner: 'drakos', name: 'Canhão de Pulso', kind: 'cannon', implemented: false, stats: { dmg: 45, range: 420 } },
  orbe_controle: { owner: 'sera', name: 'Orbe de Controle', kind: 'orb', implemented: false, stats: { dmg: 14, range: 380 } },
  drone_s01: { owner: 'sera', name: 'Drone S-01', kind: 'drone', implemented: false, stats: { dps: 18 } },
  laminas_duplas: { owner: 'orion', name: 'Lâminas Duplas', kind: 'blades', implemented: false, stats: { dmg: 12, hits: 2 } },
  modulo_stealth: { owner: 'orion', name: 'Módulo de Stealth', kind: 'module', implemented: false, stats: { duration: 6 } },
  exoesqueleto: { owner: 'all', name: 'Armadura Exoesqueleto', kind: 'armor', implemented: false, armorRef: 'exoesqueleto', stats: {} },
};
