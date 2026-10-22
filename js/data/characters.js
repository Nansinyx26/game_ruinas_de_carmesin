'use strict';
// ECLIPSE ZERO · Personagens jogáveis (CharacterDefinition)
// ---------------------------------------------------------------------------
// ROSTER: Kael é o personagem inicial; Lyra, Drakos, Sera e Orion são liberados
// pela história. Tudo que o jogo sabe de um personagem vem daqui.
//   stats: atributos base do Player (vida, energia, velocidade, raio do corpo)
//   rating: barras da tela de seleção (0–1), só exibição
//   abilities / armors / weapons: ids de ABILITY_DEFS, ARMOR_DEFS e WEAPON_DEFS
//   unlock: { type: 'always' | 'chapter_complete' | 'quest_complete' | 'boss_defeated' | 'flag', value }
//   devStatus: 'ready' (jogável) | 'partial' (jogável, habilidades faltando ficam
//              acinzentadas) | 'coming_soon' (aparece como "EM BREVE", não selecionável)
//   model: chave do modelo 3D (MODELS3D); null = usa o do Kael tingido na cor-tema
//   art: conjunto de sprites da arte oficial (só o Kael tem por enquanto)
// Os capítulos são os setores da campanha: "Capítulo N concluído" = saiu do setor N.
// ---------------------------------------------------------------------------
const CHARACTER_DEFS = [
  {
    id: 'kael', name: 'Kael Veyron', title: 'Unidade Zero', color: '#2F8CFF',
    role: 'Lutador versátil corpo a corpo e mobilidade',
    lore: 'Kael é a Unidade Zero, uma arma criada para substituir a humanidade. Agora luta para descobrir quem realmente é e qual o seu propósito.',
    stats: { hp: 100, energy: 100, speed: 235, radius: 14 },
    rating: { vida: 0.6, energia: 0.72, ataque: 0.8, defesa: 0.45, velocidade: 0.85 },
    abilities: ['kael_espada', 'kael_teleporte', 'kael_explosao', 'kael_furia'],
    armors: ['kael_padrao', 'kael_tatico', 'kael_reforcada', 'kael_sombria'],
    weapons: ['tempestade_nula', 'granada_plasma'],
    unlock: { type: 'always' }, devStatus: 'ready', model: 'kael', art: 'kael',
  },
  {
    id: 'lyra', name: 'Lyra Kaede', title: 'Sobrevivente', color: '#A64DFF',
    role: 'Atiradora à distância e dano crítico',
    lore: 'Lyra perdeu sua família no colapso. Hoje usa seu conhecimento de sobrevivência e seu arco de energia para proteger os que restaram.',
    stats: { hp: 85, energy: 110, speed: 245, radius: 13 },
    rating: { vida: 0.48, energia: 0.78, ataque: 0.85, defesa: 0.35, velocidade: 0.82 },
    abilities: ['lyra_tiro', 'lyra_armadilha', 'lyra_flecha', 'lyra_foco'],
    armors: ['lyra_padrao', 'lyra_leve', 'lyra_camuflagem', 'lyra_assalto'],
    weapons: ['arco_foton'],
    unlock: { type: 'chapter_complete', value: 1 }, devStatus: 'ready', model: 'lyra', art: null,
  },
  {
    id: 'drakos', name: 'Drakos', title: 'Tanque', color: '#FF2E3D',
    role: 'Tanque e controle de multidão',
    lore: 'Ex-soldado da Legião de Ferro. Agora luta ao lado de Kael, usando sua força bruta e sua armadura de combate para abrir caminho.',
    stats: { hp: 150, energy: 90, speed: 205, radius: 17 },
    rating: { vida: 0.95, energia: 0.55, ataque: 0.75, defesa: 0.9, velocidade: 0.4 },
    abilities: ['drakos_golpe', 'drakos_escudo', 'drakos_investida', 'drakos_zona'],
    armors: ['drakos_padrao', 'drakos_pesada', 'drakos_fogo', 'drakos_cerimonial'],
    weapons: ['lanca_plasma', 'canhao_pulso'],
    unlock: { type: 'chapter_complete', value: 2 }, devStatus: 'ready', model: 'drakos', art: null,
  },
  {
    id: 'sera', name: 'Sera Vyne', title: 'Suporte / Controle', color: '#19E6D2',
    role: 'Suporte, cura e controle',
    lore: 'Cientista e especialista em IA. Usa tecnologia avançada para controlar o campo de batalha e apoiar o time com suas habilidades únicas.',
    stats: { hp: 90, energy: 130, speed: 230, radius: 13 },
    rating: { vida: 0.5, energia: 0.95, ataque: 0.5, defesa: 0.5, velocidade: 0.7 },
    abilities: ['sera_drone', 'sera_campo', 'sera_hack', 'sera_cura'],
    armors: ['sera_padrao', 'sera_cientifica', 'sera_operacional', 'sera_elite'],
    weapons: ['orbe_controle', 'drone_s01'],
    unlock: { type: 'chapter_complete', value: 3 }, devStatus: 'ready', model: 'sera', art: null,
  },
  {
    id: 'orion', name: 'Orion', title: 'Assassino', color: '#FF8A1F',
    role: 'Assassino, furtividade e dano explosivo',
    lore: 'Ex-agente clandestino. Move-se como uma sombra e usa velocidade e precisão para eliminar alvos com extrema eficiência.',
    stats: { hp: 80, energy: 100, speed: 265, radius: 13 },
    rating: { vida: 0.42, energia: 0.7, ataque: 0.92, defesa: 0.3, velocidade: 0.98 },
    abilities: ['orion_furtividade', 'orion_duplo', 'orion_lamina', 'orion_furia'],
    armors: ['orion_padrao', 'orion_tatico', 'orion_urbana', 'orion_ancestral'],
    weapons: ['laminas_duplas', 'modulo_stealth'],
    unlock: { type: 'always' }, devStatus: 'ready', model: 'orion', art: null,
  },
];
// Acesso por id
const CHARACTERS_BY_ID = {};
for (const c of CHARACTER_DEFS) CHARACTERS_BY_ID[c.id] = c;
const DEFAULT_CHARACTER = 'kael';
