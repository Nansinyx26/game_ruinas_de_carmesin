'use strict';
// ECLIPSE ZERO · Catálogo de Armaduras Especiais 2D/3D e Novas Armas 3D
// ---------------------------------------------------------------------------
// Integração completa de todos os assets adicionados em:
//   - assets/modelos/Modelos armadura/
//   - assets/armas/armas eclipse/
// Progressão dos níveis 0 ao 100 com marcos nos níveis 20, 37, 40, 60 e 90.
// ---------------------------------------------------------------------------

const SPECIAL_ARMORS_BASE = 'assets/modelos/armaduras';
const SPECIAL_WEAPONS_BASE = 'assets/armas/armas eclipse';

const SPECIAL_ARMOR_DEFS = {
  // =========================================================================
  // DRAKOS (Tanque / Legião de Ferro)
  // =========================================================================
  drakos_recruta: {
    owner: 'drakos', level: 1, unlockLevel: 5,
    name: 'Recruta',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n1.glb`,
    visual: { tint: '#7a2222' },
    mods: { armor: 0.04, hpBonus: 15, speedMult: -0.01 },
    desc: 'Couraça de infantaria fundida com ligas básicas de aço temperado da Legião.'
  },
  drakos_guarda: {
    owner: 'drakos', level: 2, unlockLevel: 10,
    name: 'Guarda',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n1.glb`,
    visual: { tint: '#8a2424' },
    mods: { armor: 0.07, hpBonus: 25 },
    desc: 'Blindagem de patrulha com placas frontais reforçadas contra estilhaços.'
  },
  drakos_bastiao: {
    owner: 'drakos', level: 3, unlockLevel: 15,
    name: 'Bastião',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n2.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n2.glb`,
    visual: { tint: '#9c2a2a' },
    mods: { armor: 0.10, hpBonus: 35, counter: 0.06 },
    desc: 'Revestimento balístico pesado com suportes hidráulicos para conter investidas.'
  },
  drakos_n1: {
    owner: 'drakos', level: 4, unlockLevel: 20,
    name: 'Colosso',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n1.glb`,
    visual: { tint: '#8a2424' },
    mods: { armor: 0.12, hpBonus: 40, speedMult: -0.02 },
    desc: 'Blindagem pesada inicial reforçada com placas de aço temperado e amortecedores térmicos.'
  },
  drakos_n2: {
    owner: 'drakos', level: 5, unlockLevel: 30,
    name: 'Baluarte',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n2.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n2.glb`,
    visual: { tint: '#9c2a2a' },
    mods: { armor: 0.16, hpBonus: 60, dmgMult: 0.08, speedMult: -0.03 },
    desc: 'Estrutura reforçada para suporte a impactos frontais extremos e combate prolongado.'
  },
  drakos_n3: {
    owner: 'drakos', level: 6, unlockLevel: 37, // Marco obrigatório 37
    name: 'Titã',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n3.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n3.glb`,
    visual: { tint: '#b83226' },
    mods: { armor: 0.20, hpBonus: 85, dmgMult: 0.12, counter: 0.10 },
    desc: 'Armadura pesada de assalto com micro-reatores hidráulicos nos ombros e peitoral selado.'
  },
  drakos_n4: {
    owner: 'drakos', level: 7, unlockLevel: 40, // Marco obrigatório 40
    name: 'Juggernaut',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n4.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n4.glb`,
    visual: { tint: '#cf3824' },
    mods: { armor: 0.25, hpBonus: 110, dmgMult: 0.15, guardBreak: 0.15 },
    desc: 'Blindagem de choque com cerâmica balística e absorvedores de dispersão cinética.'
  },
  drakos_n5: {
    owner: 'drakos', level: 8, unlockLevel: 50,
    name: 'Fortaleza',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n5.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n5.glb`,
    visual: { tint: '#e04222' },
    mods: { armor: 0.30, hpBonus: 140, dmgMult: 0.18, counter: 0.15 },
    desc: 'Carapaça motorizada de alta densidade com dispersores de ondas de choque embutidos.'
  },
  drakos_n6: {
    owner: 'drakos', level: 9, unlockLevel: 60, // Marco obrigatório 60
    name: 'Vulcão',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n6.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n6.glb`,
    visual: { tint: '#f04a18' },
    mods: { armor: 0.36, hpBonus: 180, dmgMult: 0.24, guardBreak: 0.20 },
    desc: 'Blindagem vulcânica forjada para operações no núcleo ardente das usinas de Vesper.'
  },
  drakos_n7: {
    owner: 'drakos', level: 10, unlockLevel: 70,
    name: 'Apocalipse',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n7.glb`,
    visual: { tint: '#ff5500' },
    mods: { armor: 0.42, hpBonus: 230, dmgMult: 0.30, counter: 0.20 },
    desc: 'O ápice da tecnologia militar pesada: resiste a detonações nucleares táticas.'
  },
  drakos_ancestral: {
    owner: 'drakos', level: 11, unlockLevel: 90, // Marco obrigatório 90
    name: 'Ancestral',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n7.glb`,
    visual: { tint: '#ff2222' },
    mods: { armor: 0.50, hpBonus: 300, dmgMult: 0.38, counter: 0.25, guardBreak: 0.25 },
    desc: 'Armadura lendária cerimonial da antiga guarda que desbravou o primeiro colapso.'
  },
  drakos_suprema: {
    owner: 'drakos', level: 12, unlockLevel: 100,
    name: 'Suprema',
    png: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/drakos/drakos_n7.glb`,
    visual: { tint: '#ff3300' },
    mods: { armor: 0.60, hpBonus: 400, dmgMult: 0.45, counter: 0.35, guardBreak: 0.35 },
    desc: 'O ápice inquebrável da Legião: blindagem colossal impenetrável imune a dispersões térmicas.'
  },

  // =========================================================================
  // KAEL VEYRON (Unidade Zero / Combatente Híbrido)
  // =========================================================================
  kael_iniciado: {
    owner: 'kael', level: 1, unlockLevel: 5,
    name: 'Iniciado',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n1.glb`,
    visual: { tint: '#3b78c4' },
    mods: { armor: 0.03, hpBonus: 12, speedMult: 0.02 },
    desc: 'Traje de combate básico da Unidade ZERO com reforço polimérico leve.'
  },
  kael_vanguarda: {
    owner: 'kael', level: 2, unlockLevel: 10,
    name: 'Vanguarda',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n1.glb`,
    visual: { tint: '#2f8dc4' },
    mods: { armor: 0.06, hpBonus: 20, dmgMult: 0.03 },
    desc: 'Traje de linha de frente com condutores cinéticos integrados ao peitoral.'
  },
  kael_operacao: {
    owner: 'kael', level: 3, unlockLevel: 15,
    name: 'Operação',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n2.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n2.glb`,
    visual: { tint: '#1f5ec4' },
    mods: { armor: 0.08, hpBonus: 25, speedMult: 0.03, crit: 0.04 },
    desc: 'Unidade autônoma reforçada com amplificadores neurais de reflexo.'
  },
  kael_n1: {
    owner: 'kael', level: 4, unlockLevel: 20,
    name: 'Sci-Fi I',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n1.glb`,
    visual: { tint: '#2f6bc4' },
    mods: { armor: 0.10, hpBonus: 30, speedMult: 0.04, dmgMult: 0.06 },
    desc: 'Traje de combate experimental com fiação neural e proteção balística aerodinâmica.'
  },
  kael_n2: {
    owner: 'kael', level: 5, unlockLevel: 30,
    name: 'Sci-Fi II',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n2.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n2.glb`,
    visual: { tint: '#357ae8' },
    mods: { armor: 0.14, hpBonus: 45, speedMult: 0.06, dmgMult: 0.10, crit: 0.04 },
    desc: 'Revestimento com placas poliméricas azuis que sincronizam com a espada Tempestade Nula.'
  },
  kael_n3: {
    owner: 'kael', level: 6, unlockLevel: 37, // Marco obrigatório 37
    name: 'Sci-Fi III',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n3.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n3.glb`,
    visual: { tint: '#428af5' },
    mods: { armor: 0.18, hpBonus: 65, speedMult: 0.08, dmgMult: 0.14, crit: 0.06, cdr: -0.05 },
    desc: 'Chassi reforçado com servomotores rápidos nas pernas para impulsão e esquivas.'
  },
  kael_n4: {
    owner: 'kael', level: 7, unlockLevel: 40, // Marco obrigatório 40
    name: 'Sci-Fi IV',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n4.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n4.glb`,
    visual: { tint: '#4da3ff' },
    mods: { armor: 0.22, hpBonus: 90, speedMult: 0.10, dmgMult: 0.18, crit: 0.08, energyBonus: 20 },
    desc: 'Unidade com reator dorsal miniaturizado que recarrega energia durante corridas.'
  },
  kael_n5: {
    owner: 'kael', level: 8, unlockLevel: 50,
    name: 'Sci-Fi V',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n5.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n5.glb`,
    visual: { tint: '#66b5ff' },
    mods: { armor: 0.26, hpBonus: 120, speedMult: 0.12, dmgMult: 0.23, crit: 0.10, cdr: -0.08 },
    desc: 'Exoarmadura de combate cinético com geradores de campo de força locais.'
  },
  kael_n6: {
    owner: 'kael', level: 9, unlockLevel: 60, // Marco obrigatório 60
    name: 'Sci-Fi VI',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n6.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n6.glb`,
    visual: { tint: '#80c5ff' },
    mods: { armor: 0.31, hpBonus: 155, speedMult: 0.14, dmgMult: 0.28, crit: 0.12, cdr: -0.10 },
    desc: 'Blindagem quântica avançada: transmuta impactos físicos em energia elétrica.'
  },
  kael_n7: {
    owner: 'kael', level: 10, unlockLevel: 70,
    name: 'Sci-Fi VII',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n7.glb`,
    visual: { tint: '#9ed6ff' },
    mods: { armor: 0.37, hpBonus: 195, speedMult: 0.16, dmgMult: 0.34, crit: 0.15, energyBonus: 35 },
    desc: 'A armadura lendária da linhagem Zero. Desperta toda a ressonância do núcleo.'
  },
  kael_cyberpunk: {
    owner: 'kael', level: 11, unlockLevel: 85,
    name: 'Cyberpunk',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n7.glb`,
    visual: { tint: '#00e5ff' },
    mods: { armor: 0.44, hpBonus: 240, speedMult: 0.18, dmgMult: 0.40, crit: 0.18, cdr: -0.15, energyBonus: 45 },
    desc: 'Edição clandestina com fibra de carbono, luzes neon e overclock irrestrito.'
  },
  kael_suprema: {
    owner: 'kael', level: 12, unlockLevel: 100,
    name: 'Eclipse',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n7.glb`,
    visual: { tint: '#00ffee' },
    mods: { armor: 0.55, hpBonus: 350, dmgMult: 0.50, crit: 0.25, speedMult: 0.20, cdr: -0.20 },
    desc: 'A forma cósmica suprema da Unidade ZERO, forjada diretamente no coração do Eclipse.'
  },

  // =========================================================================
  // LYRA KAEDE (Atiradora / Sobrevivente)
  // =========================================================================
  lyra_patrulha: {
    owner: 'lyra', level: 1, unlockLevel: 5,
    name: 'Patrulha',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n1.glb`,
    visual: { tint: '#7d38c9' },
    mods: { speedMult: 0.04, crit: 0.03 },
    desc: 'Uniforme leve de caça com reguladores térmicos e flexibilidade ampliada.'
  },
  lyra_batedora: {
    owner: 'lyra', level: 2, unlockLevel: 10,
    name: 'Batedora',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n1.glb`,
    visual: { tint: '#9344e8' },
    mods: { speedMult: 0.06, crit: 0.05, armor: 0.02 },
    desc: 'Traje de reconhecimento com fibras flexíveis e absorção de passo silencioso.'
  },
  lyra_cacadora: {
    owner: 'lyra', level: 3, unlockLevel: 15,
    name: 'Caçadora',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n2.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n2.glb`,
    visual: { tint: '#a754ff' },
    mods: { speedMult: 0.08, crit: 0.08, dmgMult: 0.05 },
    desc: 'Equipamento de atiradora de elite com mira neural sincronizada.'
  },
  lyra_n1: {
    owner: 'lyra', level: 4, unlockLevel: 20,
    name: 'Neon I',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n1.glb`,
    visual: { tint: '#7d38b5' },
    mods: { speedMult: 0.08, crit: 0.06, dmgMult: 0.08, armor: 0.06 },
    desc: 'Traje de sobrevivente ultraleve com fios condutores de fótons para precisão.'
  },
  lyra_n2: {
    owner: 'lyra', level: 5, unlockLevel: 30,
    name: 'Neon II',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n2.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n2.glb`,
    visual: { tint: '#9342d6' },
    mods: { speedMult: 0.10, crit: 0.09, dmgMult: 0.12, armor: 0.09, hpBonus: 25 },
    desc: 'Carapaça flexível de polímero fosforescente que reduz a assinatura de calor.'
  },
  lyra_n3: {
    owner: 'lyra', level: 6, unlockLevel: 37, // Marco obrigatório 37
    name: 'Neon III',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n3.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n3.glb`,
    visual: { tint: '#a74dfa' },
    mods: { speedMult: 0.12, crit: 0.12, dmgMult: 0.16, armor: 0.12, cdr: -0.06 },
    desc: 'Traje de atiradora com mira holográfica sintonizada nos visores do capacete.'
  },
  lyra_n4: {
    owner: 'lyra', level: 7, unlockLevel: 40, // Marco obrigatório 40
    name: 'Neon IV',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n4.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n4.glb`,
    visual: { tint: '#b866ff' },
    mods: { speedMult: 0.14, crit: 0.15, dmgMult: 0.20, armor: 0.15, energyBonus: 20 },
    desc: 'Manto de combate com camuflagem fotônica ativa acoplada ao disparo.'
  },
  lyra_n5: {
    owner: 'lyra', level: 8, unlockLevel: 50,
    name: 'Neon V',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n5.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n5.glb`,
    visual: { tint: '#c77eff' },
    mods: { speedMult: 0.16, crit: 0.18, dmgMult: 0.25, armor: 0.18, hpBonus: 50 },
    desc: 'Armadura cinética de alta velocidade com estabilizadores giroscópicos.'
  },
  lyra_n6: {
    owner: 'lyra', level: 9, unlockLevel: 60, // Marco obrigatório 60
    name: 'Neon VI',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n6.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n6.glb`,
    visual: { tint: '#d496ff' },
    mods: { speedMult: 0.18, crit: 0.22, dmgMult: 0.30, armor: 0.22, cdr: -0.10 },
    desc: 'Revestimento de plasma violeta que acelera os disparos do arco à velocidade do som.'
  },
  lyra_n7: {
    owner: 'lyra', level: 10, unlockLevel: 70,
    name: 'Neon VII',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n7.glb`,
    visual: { tint: '#e2afff' },
    mods: { speedMult: 0.20, crit: 0.26, dmgMult: 0.36, armor: 0.26, energyBonus: 35 },
    desc: 'Armadura de fóton supremo: cada flecha reverbera em pulso gravitacional.'
  },
  lyra_n8: {
    owner: 'lyra', level: 11, unlockLevel: 80,
    name: 'Neon VIII',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n8.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n8.glb`,
    visual: { tint: '#f0c7ff' },
    mods: { speedMult: 0.22, crit: 0.30, dmgMult: 0.42, armor: 0.30, cdr: -0.12, hpBonus: 80 },
    desc: 'A mais poderosa armadura da caçadora. Converte luz solar em destruição pura.'
  },
  lyra_espectro: {
    owner: 'lyra', level: 12, unlockLevel: 90, // Marco obrigatório 90
    name: 'Espectro',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n8.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n8.glb`,
    visual: { tint: '#b300ff' },
    mods: { speedMult: 0.25, crit: 0.35, dmgMult: 0.48, armor: 0.35, cdr: -0.15, energyBonus: 50 },
    desc: 'Edição espectral: a atiradora parece estar em múltiplos lugares ao mesmo tempo.'
  },
  lyra_suprema: {
    owner: 'lyra', level: 13, unlockLevel: 100,
    name: 'Supernova',
    png: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n8.png`,
    glb: `${SPECIAL_ARMORS_BASE}/lyra/lyra_n8.glb`,
    visual: { tint: '#e600ff' },
    mods: { speedMult: 0.30, crit: 0.45, dmgMult: 0.55, armor: 0.40, cdr: -0.20 },
    desc: 'A caçadora estelar absoluta: flechas de pura energia supernova que incineram alvos.'
  },

  // =========================================================================
  // SERA VYNE (Suporte / Especialista Tecnológica)
  // =========================================================================
  sera_analista: {
    owner: 'sera', level: 1, unlockLevel: 5,
    name: 'Analista',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n1.glb`,
    visual: { tint: '#1cc4b3' },
    mods: { energyBonus: 15, cdr: -0.03 },
    desc: 'Traje de suporte técnico com isolamento eletrostático e recarga de baterias.'
  },
  sera_engenheira: {
    owner: 'sera', level: 2, unlockLevel: 10,
    name: 'Engenheira',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n1.glb`,
    visual: { tint: '#1cd6c4' },
    mods: { energyBonus: 25, cdr: -0.05, armor: 0.03 },
    desc: 'Armadura técnica com canais micro-ópticos para condução de nanitas reparadoras.'
  },
  sera_sintese: {
    owner: 'sera', level: 3, unlockLevel: 15,
    name: 'Síntese',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n2.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n2.glb`,
    visual: { tint: '#1ff7e2' },
    mods: { energyBonus: 35, cdr: -0.08, hpBonus: 20 },
    desc: 'Carapaça bio-mecânica com sincronização neural acelerada para suporte de esquadrão.'
  },
  sera_n1: {
    owner: 'sera', level: 4, unlockLevel: 20,
    name: 'Futura I',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n1.glb`,
    visual: { tint: '#14b8a6' },
    mods: { cdr: -0.08, energyBonus: 25, armor: 0.08, hpBonus: 20 },
    desc: 'Traje científico com conexões diretas para controle do drone orbital.'
  },
  sera_n2: {
    owner: 'sera', level: 5, unlockLevel: 30,
    name: 'Futura II',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n2.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n2.glb`,
    visual: { tint: '#19d6c2' },
    mods: { cdr: -0.10, energyBonus: 35, armor: 0.11, hpBonus: 35, dmgMult: 0.08 },
    desc: 'Blindagem nanotecnológica capaz de reparar circuitos em tempo real.'
  },
  sera_n3: {
    owner: 'sera', level: 6, unlockLevel: 37, // Marco obrigatório 37
    name: 'Futura III',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n3.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n3.glb`,
    visual: { tint: '#22f0d9' },
    mods: { cdr: -0.13, energyBonus: 45, armor: 0.14, hpBonus: 50, dmgMult: 0.12 },
    desc: 'Unidade com amplificador de sinal de longo alcance contra robôs hostis.'
  },
  sera_n4: {
    owner: 'sera', level: 7, unlockLevel: 40, // Marco obrigatório 40
    name: 'Futura IV',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n4.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n4.glb`,
    visual: { tint: '#3dfadc' },
    mods: { cdr: -0.16, energyBonus: 60, armor: 0.18, hpBonus: 70, dmgMult: 0.16 },
    desc: 'Carapaça de pesquisa de campo de alta proteção e blindagem contra radiação.'
  },
  sera_n5: {
    owner: 'sera', level: 8, unlockLevel: 50,
    name: 'Futura V',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n5.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n5.glb`,
    visual: { tint: '#5efae3' },
    mods: { cdr: -0.19, energyBonus: 75, armor: 0.22, hpBonus: 90, dmgMult: 0.20 },
    desc: 'Armadura com computadores quânticos que antecipam trajetórias inimigas.'
  },
  sera_n6: {
    owner: 'sera', level: 9, unlockLevel: 60, // Marco obrigatório 60
    name: 'Futura VI',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n6.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n6.glb`,
    visual: { tint: '#7efbeb' },
    mods: { cdr: -0.22, energyBonus: 95, armor: 0.26, hpBonus: 120, dmgMult: 0.25 },
    desc: 'Exoestrutura cibernética com escudos de plasma contínuos para a equipe.'
  },
  sera_n7: {
    owner: 'sera', level: 10, unlockLevel: 70,
    name: 'Futura VII',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n7.glb`,
    visual: { tint: '#9efff2' },
    mods: { cdr: -0.25, energyBonus: 120, armor: 0.30, hpBonus: 150, dmgMult: 0.30 },
    desc: 'A síntese suprema entre biologia humana e inteligência cibernética pura.'
  },
  sera_matriz: {
    owner: 'sera', level: 11, unlockLevel: 90, // Marco obrigatório 90
    name: 'Matriz',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n7.glb`,
    visual: { tint: '#00ffd5' },
    mods: { cdr: -0.30, energyBonus: 160, armor: 0.36, hpBonus: 200, dmgMult: 0.38, speedMult: 0.08 },
    desc: 'Armadura conceitual ligada diretamente ao fluxo de dados global de Vesper.'
  },
  sera_suprema: {
    owner: 'sera', level: 12, unlockLevel: 100,
    name: 'Arquiteta',
    png: `${SPECIAL_ARMORS_BASE}/sera/sera_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/sera/sera_n7.glb`,
    visual: { tint: '#00ffd5' },
    mods: { cdr: -0.40, energyBonus: 220, armor: 0.45, hpBonus: 280, dmgMult: 0.45 },
    desc: 'Onipresença digital: controle transcendental sobre os sistemas de suporte e drones.'
  },

  // =========================================================================
  // ORION (Assassino / Agente Clandestino)
  // =========================================================================
  orion_infiltrador: {
    owner: 'orion', level: 1, unlockLevel: 5,
    name: 'Infiltrador',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n1.glb`,
    visual: { tint: '#b85412' },
    mods: { speedMult: 0.03, crit: 0.04 },
    desc: 'Malha flexível para operações de infiltração sem reflexo de luz.'
  },
  orion_espreitador: {
    owner: 'orion', level: 2, unlockLevel: 10,
    name: 'Espreitador',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n1.glb`,
    visual: { tint: '#cc5e14' },
    mods: { speedMult: 0.05, crit: 0.06, dmgMult: 0.04 },
    desc: 'Revestimento com absorção sonora de passos e travas amortecedoras.'
  },
  orion_sombra: {
    owner: 'orion', level: 3, unlockLevel: 15,
    name: 'Sombra',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n2.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n2.glb`,
    visual: { tint: '#e06816' },
    mods: { speedMult: 0.07, crit: 0.08, dmgMult: 0.07 },
    desc: 'Camuflador térmico com dispersores ativos de sombra para abates silenciosos.'
  },
  orion_n1: {
    owner: 'orion', level: 4, unlockLevel: 20,
    name: 'Furtiva I',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n1.glb`,
    visual: { tint: '#c96414' },
    mods: { crit: 0.08, speedMult: 0.06, dmgMult: 0.08, armor: 0.05 },
    desc: 'Tecido sintético escuro com absorção acústica total e detalhes termorrefletivos.'
  },
  orion_n2: {
    owner: 'orion', level: 5, unlockLevel: 30,
    name: 'Furtiva II',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n2.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n2.glb`,
    visual: { tint: '#db7016' },
    mods: { crit: 0.11, speedMult: 0.08, dmgMult: 0.12, armor: 0.08, hpBonus: 25 },
    desc: 'Camada de grafeno leve que permite flexibilidade acrobática sem ruído.'
  },
  orion_n3: {
    owner: 'orion', level: 6, unlockLevel: 37, // Marco obrigatório 37
    name: 'Furtiva III',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n3.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n3.glb`,
    visual: { tint: '#ed7c18' },
    mods: { crit: 0.14, speedMult: 0.10, dmgMult: 0.17, armor: 0.11, cdr: -0.05 },
    desc: 'Unidade com dispersores de micro-fumaça e placas anti-radar para infiltração.'
  },
  orion_n4: {
    owner: 'orion', level: 7, unlockLevel: 40, // Marco obrigatório 40
    name: 'Furtiva IV',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n4.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n4.glb`,
    visual: { tint: '#ff8a1f' },
    mods: { crit: 0.18, speedMult: 0.12, dmgMult: 0.22, armor: 0.14, energyBonus: 20 },
    desc: 'Traje de eliminação com propulsores sub-milimétricos para golpes velozes.'
  },
  orion_n5: {
    owner: 'orion', level: 8, unlockLevel: 50,
    name: 'Furtiva V',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n5.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n5.glb`,
    visual: { tint: '#ffa042' },
    mods: { crit: 0.22, speedMult: 0.14, dmgMult: 0.27, armor: 0.17, hpBonus: 50 },
    desc: 'Revestimento nanoscópico que distorce a luz em volta do usuário.'
  },
  orion_n6: {
    owner: 'orion', level: 9, unlockLevel: 60, // Marco obrigatório 60
    name: 'Furtiva VI',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n6.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n6.glb`,
    visual: { tint: '#ffb366' },
    mods: { crit: 0.26, speedMult: 0.16, dmgMult: 0.33, armor: 0.21, cdr: -0.09 },
    desc: 'Armadura de sombra avançada: acertos críticos restauram energia.'
  },
  orion_aurora: {
    owner: 'orion', level: 10, unlockLevel: 70,
    name: 'Aurora',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n7.glb`,
    visual: { tint: '#ffc78a' },
    mods: { crit: 0.32, speedMult: 0.20, dmgMult: 0.40, armor: 0.26, energyBonus: 35 },
    desc: 'Armadura inspirada na Aurora: um rastro flamejante acompanha cada passo.'
  },
  orion_fantasma: {
    owner: 'orion', level: 11, unlockLevel: 90, // Marco obrigatório 90
    name: 'Fantasma',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n7.glb`,
    visual: { tint: '#ff7700' },
    mods: { crit: 0.38, speedMult: 0.24, dmgMult: 0.48, armor: 0.32, cdr: -0.15, hpBonus: 90 },
    desc: 'Armadura mítica de assassino supremo: passos deixam rastros imperceptíveis.'
  },
  orion_suprema: {
    owner: 'orion', level: 12, unlockLevel: 100,
    name: 'Vazio',
    png: `${SPECIAL_ARMORS_BASE}/orion/orion_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/orion/orion_n7.glb`,
    visual: { tint: '#ff8800' },
    mods: { crit: 0.48, speedMult: 0.30, dmgMult: 0.55, armor: 0.38, cdr: -0.20, hpBonus: 120 },
    desc: 'A mortalha do vazio eterno: teleportes e abates críticos criam vórtices de sombra.'
  },

  // =========================================================================
  // ARMADURAS COMPARTILHADAS (owner: 'all')
  // =========================================================================
  nano_traje: {
    owner: 'all', level: 2, unlockLevel: 10,
    name: 'Nano-Traje',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n1.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n1.glb`,
    visual: { tint: '#50a0f0' },
    mods: { hpBonus: 20, energyBonus: 15, speedMult: 0.03 },
    desc: 'Traje de sobrevivência universal com micro-geradores de barreira cinéticas.'
  },
  armadura_plasma: {
    owner: 'all', level: 5, unlockLevel: 45,
    name: 'Plasma',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n4.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n4.glb`,
    visual: { tint: '#9040ff' },
    mods: { armor: 0.22, hpBonus: 100, dmgMult: 0.15 },
    desc: 'Armadura adaptativa infundida com plasma escuro que repele anomalias.'
  },
  armadura_eclipse_universal: {
    owner: 'all', level: 10, unlockLevel: 100,
    name: 'Alfa',
    png: `${SPECIAL_ARMORS_BASE}/kael/kael_n7.png`,
    glb: `${SPECIAL_ARMORS_BASE}/kael/kael_n7.glb`,
    visual: { tint: '#00f0ff' },
    mods: { armor: 0.45, hpBonus: 250, dmgMult: 0.35, crit: 0.20, speedMult: 0.15 },
    desc: 'A tecnologia primordial de Carmesin: poder cósmico supremo compatível com qualquer herói.'
  },
};

const SPECIAL_WEAPON_DEFS = {
  espada_kael_3d: {
    owner: 'kael', kind: 'sword', implemented: true, unlockLevel: 25,
    name: 'Espada Kael',
    png: `${SPECIAL_WEAPONS_BASE}/Espada kael.png`,
    glb: `${SPECIAL_WEAPONS_BASE}/Espada do Kael.glb`,
    stats: { dmg: 65, crit: 0.12, speed: 1.15 },
    desc: 'Lâmina afiada com núcleo de plasma condensado feita sob medida para a Unidade Zero.'
  },
  arco_lyra_3d: {
    owner: 'lyra', kind: 'bow', implemented: true, unlockLevel: 25,
    name: 'Arco Neon',
    png: `${SPECIAL_WEAPONS_BASE}/arco da lyra.png`,
    glb: `${SPECIAL_WEAPONS_BASE}/arco da lyra.glb`,
    stats: { dmg: 52, range: 750, crit: 0.20 },
    desc: 'Arco de fótons com acelerador magnético que dispara projéteis perfurantes hipersônicos.'
  },
  machado_drakos_3d: {
    owner: 'drakos', kind: 'axe', implemented: true, unlockLevel: 37, // Marco obrigatório 37
    name: 'Machado Pesado',
    png: `${SPECIAL_WEAPONS_BASE}/machado drako .png`,
    glb: `${SPECIAL_WEAPONS_BASE}/Machado drakos.glb`,
    stats: { dmg: 85, radius: 150, guardBreak: 0.25 },
    desc: 'Machado colossal de combate capaz de fender blindagens mecânicas e criar ondas de choque.'
  },
  bastao_sera_3d: {
    owner: 'sera', kind: 'staff', implemented: true, unlockLevel: 37, // Marco obrigatório 37
    name: 'Bastão Neural',
    png: `${SPECIAL_WEAPONS_BASE}/bastao da sera.png`,
    glb: `${SPECIAL_WEAPONS_BASE}/Bastao da sera.glb`,
    stats: { dmg: 40, range: 480, cdr: -0.15 },
    desc: 'Emissor focal que projeta pulsos elétricos disruptivos e sobrecarrega androides.'
  },
  martelo_drakos_3d: {
    owner: 'drakos', kind: 'hammer', implemented: true, unlockLevel: 45,
    name: 'Martelo Fóton',
    png: `${SPECIAL_WEAPONS_BASE}/martelo drako .png`,
    glb: `${SPECIAL_WEAPONS_BASE}/martelo drakos.glb`,
    stats: { dmg: 105, stun: 1.0, radius: 170 },
    desc: 'Arma de destruição maciça, forjada para esmagar chefes de setor e blindagens de ferro.'
  },
  drone_sera_3d: {
    owner: 'sera', kind: 'drone', implemented: true, unlockLevel: 45,
    name: 'Drone Orbital',
    png: `${SPECIAL_WEAPONS_BASE}/Drone Orbital Cibernético Neon.png`,
    glb: `${SPECIAL_WEAPONS_BASE}/drone da sera.glb`,
    stats: { dps: 45, radius: 280, chain: 2 },
    desc: 'Unidade autônoma de suporte aéreo com IA tática de ataque rápido e disparos em cadeia.'
  },
  arma_primaria_orion_3d: {
    owner: 'orion', kind: 'rifle', implemented: true, unlockLevel: 55,
    name: 'Fuzil Sombra',
    png: `${SPECIAL_WEAPONS_BASE}/arma primaria do orion .png`,
    glb: `${SPECIAL_WEAPONS_BASE}/Arma primaria do orion.glb`,
    stats: { dmg: 75, range: 720, crit: 0.28 },
    desc: 'Armamento balístico silencioso de calibre pesado, otimizado para abates rápidos e precisos.'
  },
  arma_secundaria_orion_3d: {
    owner: 'orion', kind: 'pistol', implemented: true, unlockLevel: 55,
    name: 'Pistola Oculta',
    png: `${SPECIAL_WEAPONS_BASE}/arma secudaria do orion .png`,
    glb: `${SPECIAL_WEAPONS_BASE}/arma secundaria do orion.glb`,
    stats: { dmg: 45, hits: 3, speed: 1.3 },
    desc: 'Disparador compacto de alta cadência escondido sob a manga, com disparos em rajada.'
  },
};

// ---------------------------------------------------------------------------
// GERENCIADOR DE RECURSOS ESPECIAIS (Cache de Imagens e Registro Automático)
// ---------------------------------------------------------------------------
const SpecialAssets = {
  cache: new Map(),

  // Carrega imagem 2D com suporte seguro a caracteres especiais e acentos
  getImg(path) {
    if (!path) return null;
    let img = this.cache.get(path);
    if (!img) {
      img = new Image();
      img.src = encodeURI(path);
      this.cache.set(path, img);
    }
    return img;
  },

  isSpecialArmor(id) {
    return !!SPECIAL_ARMOR_DEFS[id];
  },

  isSpecialWeapon(id) {
    return !!SPECIAL_WEAPON_DEFS[id];
  },

  getArmorDef(id) {
    return SPECIAL_ARMOR_DEFS[id] || null;
  },

  getWeaponDef(id) {
    return SPECIAL_WEAPON_DEFS[id] || null;
  },

  // Inicialização e injeção nos sistemas existentes
  init() {
    // 1. Injetar todas as armaduras especiais em ARMOR_DEFS
    if (typeof ARMOR_DEFS !== 'undefined') {
      for (const [id, def] of Object.entries(SPECIAL_ARMOR_DEFS)) {
        ARMOR_DEFS[id] = {
          owner: def.owner,
          name: def.name,
          visual: def.visual || { tint: null },
          mods: def.mods || {},
          unlock: { type: 'level', value: def.unlockLevel },
          png: def.png,
          glb: def.glb,
          desc: def.desc,
          special: true,
        };
      }
    }

    // 2. Injetar todas as novas armas em WEAPON_DEFS
    if (typeof WEAPON_DEFS !== 'undefined') {
      for (const [id, def] of Object.entries(SPECIAL_WEAPON_DEFS)) {
        WEAPON_DEFS[id] = {
          owner: def.owner,
          name: def.name,
          kind: def.kind,
          implemented: def.implemented,
          stats: def.stats,
          unlock: { type: 'level', value: def.unlockLevel },
          png: def.png,
          glb: def.glb,
          desc: def.desc,
          special: true,
        };
      }
    }

    // 3. Atualizar CHARACTER_DEFS e CHARACTERS_BY_ID com as novas armaduras e armas
    if (typeof CHARACTER_DEFS !== 'undefined') {
      for (const c of CHARACTER_DEFS) {
        // Armaduras do personagem ou compartilhadas
        for (const [id, def] of Object.entries(SPECIAL_ARMOR_DEFS)) {
          if ((def.owner === c.id || def.owner === 'all') && !c.armors.includes(id)) {
            c.armors.push(id);
          }
        }
        // Armas do personagem
        for (const [id, def] of Object.entries(SPECIAL_WEAPON_DEFS)) {
          if (def.owner === c.id && !c.weapons.includes(id)) {
            c.weapons.push(id);
          }
        }
        if (typeof CHARACTERS_BY_ID !== 'undefined' && CHARACTERS_BY_ID[c.id]) {
          CHARACTERS_BY_ID[c.id].armors = c.armors;
          CHARACTERS_BY_ID[c.id].weapons = c.weapons;
        }
      }
    }
  }
};

// Executa registro imediato se os dados base já tiverem sido carregados
SpecialAssets.init();
