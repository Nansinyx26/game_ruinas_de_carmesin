'use strict';
// ECLIPSE ZERO · Progressão: evoluções entre setores, XP/níveis, árvores de habilidades (SKILLS) e Progress
// ---------------------------------------------------------------------------
// EVOLUÇÕES (tela entre setores): a Tempestade Nula e Kael se adaptam
// ---------------------------------------------------------------------------
const UPGRADES = [
  { id: 'dmg', name: 'Fio Monomolecular', desc: '+15% de dano em todos os golpes.', icon: 'sword', max: 5, w: 10,
    apply: (p) => { p.stats.dmgMult += 0.15; } },
  { id: 'speed', name: 'Servos Cinéticos', desc: '+10% de velocidade de movimento e esquivas mais longas.', icon: 'boot', max: 3, w: 8,
    apply: (p) => { p.stats.speedMult += 0.1; p.stats.dashMult += 0.1; } },
  { id: 'lifesteal', name: 'Sifão Vital', desc: 'A lâmina absorve energia: 4% do dano causado volta como vida.', icon: 'fang', max: 3, w: 8,
    apply: (p) => { p.stats.lifesteal += 0.04; } },
  { id: 'vitality', name: 'Placas do Casaco', desc: 'O material desconhecido do casaco se reforça: +25 de vida máxima e cura 25.', icon: 'heart', max: 4, w: 9,
    apply: (p) => { p.stats.hpBonus += 25; }, onPick: (p) => p.heal(25, false) },
  { id: 'fury', name: 'Capacitor Rúnico', desc: '+35% de energia acumulada a cada acerto.', icon: 'flame', max: 3, w: 7,
    apply: (p) => { p.stats.furyMult += 0.35; } },
  { id: 'crit', name: 'Memória de Combate', desc: 'Reflexos de um passado esquecido: +10% de chance de crítico (dano x2).', icon: 'eye', max: 3, w: 7,
    apply: (p) => { p.stats.crit += 0.1; } },
  { id: 'dashcd', name: 'Fase Quântica', desc: 'Recarga da esquiva 30% menor e invencibilidade mais longa.', icon: 'wing', max: 2, w: 6,
    apply: (p) => { p.stats.dashCdMult *= 0.7; p.stats.iframeBonus += 0.06; } },
  { id: 'armor', name: 'Campo Defletor', desc: 'Reduz em 12% todo o dano recebido.', icon: 'shield', max: 3, w: 7,
    apply: (p) => { p.stats.armor = Math.min(0.5, p.stats.armor + 0.12); } },
  { id: 'souls', name: 'Ímã Eletromagnético', desc: '+50% de células de energia e coleta a distância.', icon: 'soul', max: 2, w: 5,
    apply: (p) => { p.stats.soulMult += 0.5; p.stats.magnet += 70; } },
  { id: 'charge', name: 'Núcleo Instável', desc: 'Golpes pesados +20% de dano e carga do Impacto 40% mais rápida.', icon: 'bolt', max: 2, w: 6,
    apply: (p) => { p.stats.heavyMult += 0.2; p.stats.chargeSpeed += 0.4; } },
  { id: 'orbs', name: 'Nanorreparo', desc: 'Cápsulas de reparo curam +60% e caem com mais frequência.', icon: 'orb', max: 2, w: 5,
    apply: (p) => { p.stats.healMult += 0.6; p.stats.orbChance += 0.08; } },
  { id: 'chain', name: 'Condutor Iônico', desc: 'Acertos têm +20% de chance de liberar um raio que salta para outro inimigo.', icon: 'chain', max: 3, w: 8,
    apply: (p) => { p.stats.chain += 0.2; } },
  { id: 'combo_slam', name: 'Técnica: Colapso Magnético', desc: 'Pesado, Pesado: crava a lâmina no chão e libera uma onda de choque elétrica.', icon: 'scroll', max: 1, w: 9, combo: true,
    apply: (p) => { p.combo.unlocked.add('slam'); } },
  { id: 'combo_upper', name: 'Técnica: Relâmpago Ascendente', desc: 'Leve, Pesado: arremessa os inimigos para o alto envoltos em eletricidade.', icon: 'scroll', max: 1, w: 9, combo: true,
    apply: (p) => { p.combo.unlocked.add('uppercut'); } },
];

class UpgradeSystem {
  constructor() { this.reset(); }
  reset() { this.levels = {}; this.history = []; }
  level(id) { return this.levels[id] || 0; }
  available() { return UPGRADES.filter((u) => this.level(u.id) < u.max); }
  // Sorteia n opções distintas, ponderadas pelo peso 'w'
  roll(n = 3) {
    const pool = this.available().slice();
    const out = [];
    while (out.length < n && pool.length) {
      const total = pool.reduce((s, u) => s + u.w, 0);
      let r = Math.random() * total, idx = 0;
      for (; idx < pool.length - 1; idx++) { r -= pool[idx].w; if (r <= 0) break; }
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }
  apply(up, player) {
    this.levels[up.id] = this.level(up.id) + 1;
    this.history.push(up.id);
    player.recalc();
    if (up.onPick) up.onPick(player);
  }
}

// ---------------------------------------------------------------------------
// PROGRESSÃO: experiência, níveis, atributos e pontos de habilidade
// ---------------------------------------------------------------------------
const PROG = {
  maxLevel: 100,
  // Experiência para sair do nível l (curva configurável: início rápido, fim lento)
  xpToNext: (l) => Math.round(45 * Math.pow(l, 1.5) + 55),
  // Pontos de habilidade ganhos ao alcançar o nível l (bônus a cada 5 níveis)
  pointsAt: (l) => (l % 5 === 0 ? 2 : 1),
  // Ganho de atributos por nível acima do 1
  perLevel: { hp: 8, energy: 4, dmg: 0.04, power: 0.05, def: 0.008, cdr: 0.012, mob: 0.008 },
};
const XP_ENEMY = { rastejador: 14, drone: 20, sacerdote: 24, cacador: 26, legionario: 55, chefe: 900 };
// Outras fontes de experiência
const XP_SRC = { roomClear: (i) => 60 + 50 * i, memory: 120 };
const SPECIAL_COST = 100;   // energia exigida pelo Eclipse Absoluto

// Atributos de base do jogador (recalculados a partir do nível, evoluções e habilidades)
const BASE_STATS = {
  dmgMult: 1, speedMult: 1, dashMult: 1, lifesteal: 0, furyMult: 1, crit: 0.05,
  dashCdMult: 1, iframeBonus: 0, armor: 0, soulMult: 1, magnet: 120,
  heavyMult: 1, chargeSpeed: 1, healMult: 1, orbChance: 0, chain: 0, voidSpread: 1,
  power: 1, cdr: 1, hpBonus: 0, energyBonus: 0, regen: 2.5, lightMult: 1, arcBonus: 0,
  thrustMult: 1, spinHits: 3, spinMult: 1, counter: 0, guardBreak: 0, eliteMult: 1,
  critHeal: 0, dodgeEnergy: 0, perfectBonus: 0, dashCharges: 1, voidBig: 0, showBars: 0,
};

// ---------------------------------------------------------------------------
// HABILIDADES: quatro árvores com passivas, técnicas (combos) e ativas
// kind: 'passiva' | 'tecnica' | 'ativa' | 'suprema'   col/row: posição no grafo
// req: [[id, nível]] (todos exigidos)   lvl: nível de personagem exigido
// energy/cd: custo e recarga das ativas   desc(l): efeito no nível l
// ---------------------------------------------------------------------------
const SKILL_TREES = [
  { id: 'eletrica', name: 'TEMPESTADE NULA', sub: 'Árvore Elétrica', rgb: '80,160,255' },
  { id: 'sombra', name: 'SOMBRA', sub: 'Árvore de Mobilidade', rgb: '170,120,255' },
  { id: 'espadachim', name: 'ESPADACHIM', sub: 'Árvore de Combate', rgb: '220,228,240' },
  { id: 'nucleo', name: 'NÚCLEO ZERO', sub: 'Árvore Tecnológica', rgb: '80,230,200' },
];

const SKILLS = {
  // ----- Árvore elétrica — Tempestade Nula
  corte_eletrico: { tree: 'eletrica', name: 'Corte Elétrico', kind: 'passiva', icon: 'spark', max: 3, lvl: 1, col: 1, row: 0, req: [],
    desc: (l) => `Golpes leves liberam energia azul: +${8 * l}% de dano leve e +${12 * l}% de chance de arco elétrico no alvo.` },
  pulso_fantasma: { tree: 'eletrica', name: 'Pulso Fantasma', kind: 'tecnica', icon: 'dash', max: 2, lvl: 2, col: 0, row: 1, req: [['corte_eletrico', 1]],
    desc: (l) => `Esquiva → Leve: avanço instantâneo envolto em eletricidade azul${l >= 2 ? ', com +40% de dano' : ''}.` },
  arco_voltaico: { tree: 'eletrica', name: 'Arco Voltaico', kind: 'ativa', icon: 'orbBolt', max: 3, lvl: 2, col: 2, row: 1, req: [['corte_eletrico', 1]], energy: 18, cd: 3.2,
    desc: (l) => `Dispara ${l >= 3 ? 'três projéteis elétricos em leque' : 'um projétil elétrico perfurante'} (${26 + 10 * l} de dano cada).` },
  corrente_relampago: { tree: 'eletrica', name: 'Corrente Relâmpago', kind: 'ativa', icon: 'chain', max: 3, lvl: 4, col: 2, row: 2, req: [['arco_voltaico', 1]], energy: 28, cd: 7,
    desc: (l) => `Um raio salta entre até ${3 + l} inimigos próximos, causando ${22 + 10 * l} de dano em cada.` },
  campo_magnetico: { tree: 'eletrica', name: 'Campo Magnético', kind: 'ativa', icon: 'field', max: 2, lvl: 5, col: 0, row: 2, req: [['pulso_fantasma', 1]], energy: 30, cd: 15,
    desc: (l) => `Campo de ${4 + l}s ao redor de Kael: reduz 40% do dano recebido, destrói projéteis e eletrocuta quem entra (${10 + 5 * l}/s).` },
  ruptura_plasma: { tree: 'eletrica', name: 'Ruptura de Plasma', kind: 'ativa', icon: 'burst', max: 3, lvl: 6, col: 1, row: 3, req: [['campo_magnetico', 1], ['corrente_relampago', 1]], energy: 42, cd: 11,
    desc: (l) => `Concentra energia por um instante e explode em área (raio ${150 + 20 * l}, ${70 + 30 * l} de dano), lançando os inimigos.` },
  eclipse_absoluto: { tree: 'eletrica', name: 'Eclipse Absoluto', kind: 'suprema', icon: 'eclipse', max: 3, lvl: 8, col: 1, row: 4, req: [['ruptura_plasma', 1]], energy: 100, cd: 0,
    desc: (l) => `Tecla I (100 de energia): libera toda a energia da espada (raio ${270 + 30 * (l - 1)}, ${85 + 35 * (l - 1)} de dano)${l >= 3 ? ' e restaura 25% da vida' : ''}. Desperta algo dentro de Kael.` },

  // ----- Árvore de mobilidade — Sombra
  esquiva_sombria: { tree: 'sombra', name: 'Esquiva Sombria', kind: 'passiva', icon: 'shadow', max: 3, lvl: 1, col: 1, row: 0, req: [],
    desc: (l) => `Recarga da esquiva ${12 * l}% menor e +${(0.04 * l).toFixed(2).replace('.', ',')}s de invencibilidade.` },
  passo_fantasma: { tree: 'sombra', name: 'Passo Fantasma', kind: 'passiva', icon: 'wing', max: 2, lvl: 3, col: 0, row: 1, req: [['esquiva_sombria', 1]],
    desc: (l) => `Acumula ${1 + l} cargas de esquiva: deslocamentos curtos em sequência, deixando ecos sombrios.` },
  investida_sombria: { tree: 'sombra', name: 'Investida Sombria', kind: 'ativa', icon: 'lunge', max: 2, lvl: 3, col: 2, row: 1, req: [['esquiva_sombria', 2]], energy: 15, cd: 5,
    desc: (l) => `Avança instantaneamente até o inimigo mais próximo à frente (alcance ${300 + 60 * l}) e golpeia (${35 + 15 * l} de dano).` },
  reflexos: { tree: 'sombra', name: 'Reflexos Aumentados', kind: 'passiva', icon: 'reflex', max: 3, lvl: 5, col: 0, row: 2, req: [['passo_fantasma', 1]],
    desc: (l) => `Esquivas perfeitas mais fáceis (+${30 * l}% de janela), câmera lenta mais longa e +${8 * l} de energia.` },
  salto_dimensional: { tree: 'sombra', name: 'Salto Dimensional', kind: 'ativa', icon: 'teleport', max: 2, lvl: 7, col: 1, row: 3, req: [['investida_sombria', 1], ['reflexos', 1]], energy: 20, cd: 6,
    desc: (l) => `Teletransporte de ${180 + 40 * l} na direção do movimento, atravessando inimigos; descargas na partida e na chegada (${30 + 15 * l}).` },

  // ----- Árvore de combate — Espadachim
  corte_duplo: { tree: 'espadachim', name: 'Corte Duplo', kind: 'tecnica', icon: 'twin', max: 1, lvl: 1, col: 1, row: 0, req: [],
    desc: () => 'Leve, Leve, Leve: o terceiro golpe vira a Descarga Tríplice, dois cortes pesados em sequência.' },
  lamina_giratoria: { tree: 'espadachim', name: 'Lâmina Giratória', kind: 'tecnica', icon: 'spin', max: 2, lvl: 2, col: 0, row: 1, req: [['corte_duplo', 1]],
    desc: (l) => `Leve, Leve, Pesado: Círculo da Ruína, um giro que atinge todos ao redor${l >= 2 ? ' (+1 volta e +30% de dano)' : ''}.` },
  contra_ataque: { tree: 'espadachim', name: 'Contra-ataque', kind: 'passiva', icon: 'counter', max: 3, lvl: 3, col: 2, row: 1, req: [['corte_duplo', 1]],
    desc: (l) => `Após uma esquiva perfeita, o próximo golpe em 1,5s é crítico e causa +${40 * l}% de dano.` },
  ruptura_guarda: { tree: 'espadachim', name: 'Ruptura de Guarda', kind: 'passiva', icon: 'break', max: 2, lvl: 4, col: 0, row: 2, req: [['lamina_giratoria', 1]],
    desc: (l) => `+${30 * l}% de dano contra blindados e chefes; quebra a estabilidade ${l >= 2 ? 'e a super armadura ' : ''}com mais força.` },
  tempestade_laminas: { tree: 'espadachim', name: 'Tempestade de Lâminas', kind: 'ativa', icon: 'blades', max: 3, lvl: 6, col: 2, row: 2, req: [['contra_ataque', 1]], energy: 28, cd: 9,
    desc: (l) => `Sequência de ${5 + l} cortes rápidos em cone (${14 + 5 * l} de dano cada).` },
  corte_vazio: { tree: 'espadachim', name: 'Corte do Vazio', kind: 'tecnica', icon: 'void', max: 3, lvl: 5, col: 1, row: 3, req: [['ruptura_guarda', 1]],
    desc: (l) => `Esquiva → Pesado: golpe concentrado que libera ${l >= 2 ? 'três ondas elétricas em leque' : 'uma onda elétrica em linha reta'}${l >= 3 ? ', maiores e mais fortes' : ''}.` },

  // ----- Árvore tecnológica — Núcleo ZERO
  sobrecarga: { tree: 'nucleo', name: 'Sobrecarga', kind: 'ativa', icon: 'overload', max: 3, lvl: 2, col: 1, row: 0, req: [], energy: 25, cd: 16,
    desc: (l) => `Por 6s: +${25 + 10 * l}% de dano e golpes 20% mais rápidos.` },
  drenagem: { tree: 'nucleo', name: 'Drenagem de Energia', kind: 'passiva', icon: 'drain', max: 3, lvl: 3, col: 0, row: 1, req: [['sobrecarga', 1]],
    desc: (l) => `+${30 * l}% de energia por acerto; acertos críticos recuperam ${l} de vida.` },
  analise: { tree: 'nucleo', name: 'Análise de Alvo', kind: 'passiva', icon: 'scan', max: 2, lvl: 4, col: 2, row: 1, req: [['sobrecarga', 1]],
    desc: (l) => `Revela pontos fracos: +${8 * l}% de crítico, +${10 * l}% de dano contra elites e chefes e barras de vida sempre visíveis.` },
  escudo_energia: { tree: 'nucleo', name: 'Escudo de Energia', kind: 'ativa', icon: 'hex', max: 3, lvl: 5, col: 0, row: 2, req: [['drenagem', 1]], energy: 30, cd: 18,
    desc: (l) => `Escudo que absorve ${40 + 25 * l} de dano por 8s.` },
  sincronizacao: { tree: 'nucleo', name: 'Sincronização ZERO', kind: 'ativa', icon: 'sync', max: 2, lvl: 9, col: 1, row: 3, req: [['analise', 1], ['escudo_energia', 1]], energy: 40, cd: 40,
    desc: (l) => `Por ${6 + 2 * l}s, recargas 2,5× mais rápidas e habilidades custam metade da energia.` },
  // ----- Linha 5 (nós novos de cada árvore; efeitos em js/heroes/passivas.js)
  condutor_vivo: { tree: 'eletrica', name: 'Condutor Vivo', kind: 'passiva', icon: 'chain', max: 3, lvl: 10, col: 0, row: 4, req: [['ruptura_plasma', 1]],
    desc: (l) => `O corpo de Kael conduz a tempestade: +${6 * l}% de chance de raio em cadeia nos golpes e +${5 * l}% de chance de arco nos leves.` },
  sobretensao: { tree: 'eletrica', name: 'Sobretensão', kind: 'passiva', icon: 'bolt', max: 3, lvl: 12, col: 2, row: 4, req: [['ruptura_plasma', 1]],
    desc: (l) => `+${7 * l}% de poder: as habilidades da Tempestade Nula causam mais dano.` },
  fio_perfeito: { tree: 'espadachim', name: 'Fio Perfeito', kind: 'passiva', icon: 'break', max: 3, lvl: 10, col: 0, row: 4, req: [['corte_vazio', 1]],
    desc: (l) => `Golpes pesados causam +${8 * l}% de dano e rompem a guarda ${10 * l}% melhor.` },
  danca_tempestade: { tree: 'espadachim', name: 'Dança da Tempestade', kind: 'passiva', icon: 'blades', max: 3, lvl: 12, col: 2, row: 4, req: [['corte_vazio', 1]],
    desc: (l) => `Golpes leves causam +${6 * l}% de dano.` },
  sombra_persistente: { tree: 'sombra', name: 'Sombra Persistente', kind: 'passiva', icon: 'shadow', max: 3, lvl: 10, col: 0, row: 4, req: [['salto_dimensional', 1]],
    desc: (l) => `Esquiva recarrega ${8 * l}% mais rápido e fica ${skillNum(0.03 * l)}s a mais invencível.` },
  eco_sombrio: { tree: 'sombra', name: 'Eco Sombrio', kind: 'passiva', icon: 'reflex', max: 3, lvl: 12, col: 2, row: 4, req: [['salto_dimensional', 1]],
    desc: (l) => `Esquivas perfeitas rendem +${20 * l}% de bônus e devolvem ${4 * l} de energia.` },
  blindagem_adaptativa: { tree: 'nucleo', name: 'Blindagem Adaptativa', kind: 'passiva', icon: 'shield', max: 3, lvl: 10, col: 0, row: 4, req: [['sincronizacao', 1]],
    desc: (l) => `+${10 * l} de vida máxima e ${4 * l}% menos dano recebido.` },
  nucleo_estavel: { tree: 'nucleo', name: 'Núcleo Estável', kind: 'passiva', icon: 'orb', max: 3, lvl: 12, col: 2, row: 4, req: [['sincronizacao', 1]],
    desc: (l) => `A energia se regenera ${20 * l}% mais rápido e a energia máxima sobe ${5 * l}.` },
};
for (const id in SKILLS) SKILLS[id].id = id;
const SKILL_ACTIVE = (id) => SKILLS[id] && (SKILLS[id].kind === 'ativa');

// Estado persistente da evolução de Kael
class Progress {
  constructor() { this.reset(); }
  reset() {
    this.level = 1; this.xp = 0; this.sp = 2;
    this.skills = {}; this.slots = [null, null, null, null];
  }
  lv(id) { return this.skills[id] || 0; }
  get xpNext() { return PROG.xpToNext(this.level); }
  // Motivo pelo qual não dá para desbloquear/aprimorar (ou null se pode)
  blocker(id) {
    const s = SKILLS[id], cur = this.lv(id);
    if (cur >= s.max) return 'Nível máximo';
    if (this.level < s.lvl) return `Requer nível ${s.lvl}`;
    for (const [rid, rl] of s.req) if (this.lv(rid) < rl) return `Requer ${SKILLS[rid].name}${rl > 1 ? ' ' + rl : ''}`;
    if (this.sp < 1) return 'Sem pontos de habilidade';
    return null;
  }
  reqMet(id) {
    const s = SKILLS[id];
    if (this.level < s.lvl) return false;
    for (const [rid, rl] of s.req) if (this.lv(rid) < rl) return false;
    return true;
  }
  learn(id) {
    if (this.blocker(id)) return false;
    this.skills[id] = this.lv(id) + 1;
    this.sp -= 1;
    // Ativas recém-desbloqueadas ocupam o primeiro atalho livre
    if (SKILL_ACTIVE(id) && this.skills[id] === 1 && !this.slots.includes(id)) {
      const k = this.slots.indexOf(null);
      if (k >= 0) this.slots[k] = id;
    }
    return true;
  }
  bind(id, k) {
    if (!SKILL_ACTIVE(id) || !this.lv(id)) return false;
    const old = this.slots.indexOf(id);
    if (old >= 0) this.slots[old] = this.slots[k];
    this.slots[k] = id;
    return true;
  }
  toJSON() { return { level: this.level, xp: this.xp, sp: this.sp, skills: this.skills, slots: this.slots }; }
  load(o) {
    this.reset();
    if (!o) return;
    this.level = clamp(o.level | 0, 1, PROG.maxLevel); this.xp = Math.max(0, o.xp | 0); this.sp = Math.max(0, o.sp | 0);
    for (const id in o.skills || {}) if (SKILLS[id]) this.skills[id] = clamp(o.skills[id] | 0, 0, SKILLS[id].max);
    if (Array.isArray(o.slots)) this.slots = [0, 1, 2, 3].map((k) => (SKILL_ACTIVE(o.slots[k]) && this.lv(o.slots[k]) ? o.slots[k] : null));
  }
}

// ---------------------------------------------------------------------------
// PROGRESSO POR PERSONAGEM: o Progress acima continua sendo o do Kael (game.progress,
// o mesmo formato de sempre no salvamento). Os outros personagens do elenco usam
// CharacterProgress, com a mesma interface, sobre as próprias árvores
// (js/data/skilltrees.js). PartyProgress.of(id) devolve o progresso de qualquer um.
// Quem está em campo ganha a experiência (game.activeProgress). Ao entrar no grupo, o
// aliado recebe um nível próximo do do Kael (PartyProgress.join). O progresso só vai para
// o salvamento ('party') quando tiver algo; salvamentos sem 'party' carregam vazios.
// ---------------------------------------------------------------------------
class CharacterProgress {
  constructor(charId) { this.charId = charId; this.reset(); }
  get defs() { return skillsOf(this.charId); }
  reset() {
    this.level = 1; this.xp = 0; this.sp = 0;
    this.skills = {}; this.slots = [null, null, null, null];
  }
  lv(id) { return this.skills[id] || 0; }
  get xpNext() { return PROG.xpToNext(this.level); }
  isActiveSkill(id) { const s = this.defs[id]; return !!s && s.kind === 'ativa'; }
  // Motivo pelo qual não dá para desbloquear/aprimorar (ou null se pode)
  blocker(id) {
    const D = this.defs, s = D[id], cur = this.lv(id);
    if (!s) return 'Habilidade de outro personagem';
    if (cur >= s.max) return 'Nível máximo';
    if (this.level < s.lvl) return `Requer nível ${s.lvl}`;
    for (const [rid, rl] of s.req) if (this.lv(rid) < rl) return `Requer ${D[rid].name}${rl > 1 ? ' ' + rl : ''}`;
    if (this.sp < 1) return 'Sem pontos de habilidade';
    return null;
  }
  reqMet(id) {
    const s = this.defs[id];
    if (!s || this.level < s.lvl) return false;
    for (const [rid, rl] of s.req) if (this.lv(rid) < rl) return false;
    return true;
  }
  learn(id) {
    if (this.blocker(id)) return false;
    this.skills[id] = this.lv(id) + 1;
    this.sp -= 1;
    // Ativas recém-desbloqueadas ocupam o primeiro atalho livre
    if (this.isActiveSkill(id) && this.skills[id] === 1 && !this.slots.includes(id)) {
      const k = this.slots.indexOf(null);
      if (k >= 0) this.slots[k] = id;
    }
    return true;
  }
  bind(id, k) {
    if (!this.isActiveSkill(id) || !this.lv(id)) return false;
    const old = this.slots.indexOf(id);
    if (old >= 0) this.slots[old] = this.slots[k];
    this.slots[k] = id;
    return true;
  }
  get empty() { return this.level === 1 && !this.xp && !this.sp && !Object.keys(this.skills).length; }
  toJSON() { return { level: this.level, xp: this.xp, sp: this.sp, skills: this.skills, slots: this.slots }; }
  load(o) {
    this.reset();
    if (!o || typeof o !== 'object') return;
    const D = this.defs;
    this.level = clamp(o.level | 0, 1, PROG.maxLevel); this.xp = Math.max(0, o.xp | 0); this.sp = Math.max(0, o.sp | 0);
    for (const id in o.skills || {}) if (D[id]) this.skills[id] = clamp(o.skills[id] | 0, 0, D[id].max);
    if (Array.isArray(o.slots)) this.slots = [0, 1, 2, 3].map((k) => (this.isActiveSkill(o.slots[k]) && this.lv(o.slots[k]) ? o.slots[k] : null));
  }
}

const PARTY_VERSION = 1;
const PartyProgress = {
  chars: {},
  // Progresso de um personagem: o do Kael é o game.progress de sempre (null se não houver árvores)
  of(charId) {
    const set = SKILL_SETS[charId];
    if (!set) return null;
    if (set.progress === 'legacy') return game.progress;
    return this.chars[charId] || (this.chars[charId] = new CharacterProgress(charId));
  },
  reset() { this.chars = {}; },
  // Aliado que entra no grupo (recrutado, liberado ou posto em campo sem progresso): um nível
  // abaixo do Kael (mínimo 1) e os pontos que o Kael teria nesse nível (os 2 iniciais + os de
  // cada nível), para não chegar inútil. Só vale para quem ainda está vazio
  join(charId, refLevel) {
    const pr = this.of(charId);
    if (!pr || pr === game.progress || !pr.empty) return false;
    const L = clamp((refLevel | 0) - 1, 1, PROG.maxLevel);
    pr.level = L; pr.xp = 0; pr.sp = 2;
    for (let l = 2; l <= L; l++) pr.sp += PROG.pointsAt(l);
    return true;
  },
  // Só quem tem algo vai para o salvamento (nada = null)
  toJSON() {
    const chars = {};
    let n = 0;
    for (const id in this.chars) if (!this.chars[id].empty) { chars[id] = this.chars[id].toJSON(); n++; }
    return n ? { v: PARTY_VERSION, chars } : null;
  },
  load(data) {
    this.reset();
    if (!data || typeof data !== 'object' || !data.chars || typeof data.chars !== 'object') return;
    for (const id in data.chars) {
      const set = SKILL_SETS[id];
      if (set && set.progress === 'party') this.of(id).load(data.chars[id]);
    }
  },
};

