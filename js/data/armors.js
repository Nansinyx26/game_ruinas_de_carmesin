'use strict';
// ECLIPSE ZERO · Variações de armadura (ArmorVariant)
// ---------------------------------------------------------------------------
// ARMADURAS: 4 por personagem (Padrão + 3) e a Armadura Exoesqueleto (todos).
//   owner: id do personagem ou 'all'
//   visual: como a armadura muda o desenho (tint: cor aplicada aos sprites/modelo;
//           null = arte original). A troca visual entra na fase 6.
//   mods: modificadores somados aos atributos do Player (nomes de BASE_STATS em
//         js/progression.js). A Padrão não muda nada (Kael continua idêntico).
//   unlock: mesma forma das condições dos personagens (js/roster.js)
// ---------------------------------------------------------------------------
const ARMOR_DEFS = {
  // Kael Veyron
  kael_padrao: { owner: 'kael', name: 'Padrão', visual: { tint: null }, mods: {}, unlock: { type: 'always' } },
  kael_tatico: { owner: 'kael', name: 'Tático', visual: { tint: '#3b4a5e' }, mods: { armor: 0.04, speedMult: 0.03 }, unlock: { type: 'chapter_complete', value: 2 } },
  kael_reforcada: { owner: 'kael', name: 'Reforçada', visual: { tint: '#2a3550' }, mods: { armor: 0.1, speedMult: -0.04 }, unlock: { type: 'chapter_complete', value: 4 } },
  kael_sombria: { owner: 'kael', name: 'Sombria', visual: { tint: '#1a2a6e' }, mods: { dmgMult: 0.08, crit: 0.04 }, unlock: { type: 'boss_defeated', value: 'nexus' } },
  // Lyra Kaede
  lyra_padrao: { owner: 'lyra', name: 'Padrão', visual: { tint: null }, mods: {}, unlock: { type: 'always' } },
  lyra_leve: { owner: 'lyra', name: 'Leve', visual: { tint: '#6b3a8f' }, mods: { speedMult: 0.06, armor: -0.02 }, unlock: { type: 'chapter_complete', value: 2 } },
  lyra_camuflagem: { owner: 'lyra', name: 'Camuflagem', visual: { tint: '#3a3f4f' }, mods: { crit: 0.05 }, unlock: { type: 'chapter_complete', value: 3 } },
  lyra_assalto: { owner: 'lyra', name: 'Assalto', visual: { tint: '#8a3ad1' }, mods: { dmgMult: 0.08, armor: 0.04 }, unlock: { type: 'chapter_complete', value: 5 } },
  // Drakos
  drakos_padrao: { owner: 'drakos', name: 'Padrão', visual: { tint: null }, mods: {}, unlock: { type: 'always' } },
  drakos_pesada: { owner: 'drakos', name: 'Pesada', visual: { tint: '#4a2a2e' }, mods: { armor: 0.08, hpBonus: 20, speedMult: -0.05 }, unlock: { type: 'chapter_complete', value: 3 } },
  drakos_fogo: { owner: 'drakos', name: 'Fogo', visual: { tint: '#c4471f' }, mods: { dmgMult: 0.08 }, unlock: { type: 'chapter_complete', value: 4 } },
  drakos_cerimonial: { owner: 'drakos', name: 'Cerimonial', visual: { tint: '#7a1f2a' }, mods: { hpBonus: 30 }, unlock: { type: 'boss_defeated', value: 'nexus' } },
  // Sera Vyne
  sera_padrao: { owner: 'sera', name: 'Padrão', visual: { tint: null }, mods: {}, unlock: { type: 'always' } },
  sera_cientifica: { owner: 'sera', name: 'Científica', visual: { tint: '#cfd8e3' }, mods: { cdr: -0.05 }, unlock: { type: 'chapter_complete', value: 4 } },
  sera_operacional: { owner: 'sera', name: 'Operacional', visual: { tint: '#2b4f57' }, mods: { armor: 0.05 }, unlock: { type: 'chapter_complete', value: 5 } },
  sera_elite: { owner: 'sera', name: 'Elite', visual: { tint: '#19e6d2' }, mods: { energyBonus: 20, armor: 0.04 }, unlock: { type: 'boss_defeated', value: 'nexus' } },
  // Orion
  orion_padrao: { owner: 'orion', name: 'Padrão', visual: { tint: null }, mods: {}, unlock: { type: 'always' } },
  orion_tatico: { owner: 'orion', name: 'Tático', visual: { tint: '#4a3a2a' }, mods: { armor: 0.03, speedMult: 0.03 }, unlock: { type: 'chapter_complete', value: 5 } },
  orion_urbana: { owner: 'orion', name: 'Urbana', visual: { tint: '#2e2e36' }, mods: { crit: 0.05 }, unlock: { type: 'chapter_complete', value: 5 } },
  orion_ancestral: { owner: 'orion', name: 'Ancestral', visual: { tint: '#ff8a1f' }, mods: { dmgMult: 0.1 }, unlock: { type: 'boss_defeated', value: 'nexus' } },
  // Compartilhada
  exoesqueleto: { owner: 'all', name: 'Exoesqueleto', visual: { tint: '#5a6474' }, mods: { armor: 0.08, hpBonus: 15, speedMult: -0.03 }, unlock: { type: 'chapter_complete', value: 5 } },
};
