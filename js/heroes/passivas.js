'use strict';
// ECLIPSE ZERO · Efeitos das passivas das árvores (HERO_PASSIVES)
// ---------------------------------------------------------------------------
// O Kael tem as passivas de sempre no Player.recalc e a Lyra as do kit dela (js/heroes/lyra.js).
// Aqui ficam os efeitos de todos os outros nós passivos — as passivas das árvores do Drakos,
// da Sera e do Orion (que antes só apareciam na tela) e os nós novos das árvores de todos
// (linha 5 de cada árvore, js/progression.js e js/data/skilltrees.js). Cada nó pode ter:
//   stats(S, l, p)    atributos (somados no Player.recalc; S = p.stats)
//   dealt(p, e, l)    multiplicador do dano causado ao inimigo e (golpes, habilidades, supremas)
//   taken(p, l)       multiplicador do dano recebido
//   hit(p, e, l, dmg) depois de um golpe corpo a corpo acertar
//   kill(p, e, l)     ao derrubar um inimigo
//   tick(p, dt, l)    a cada quadro
//   lethal(p, l)      golpe que mataria: true = sobrevive (uma vez por setor)
// Nós que só mudam uma habilidade ativa (duração, alcance) ficam com a própria habilidade.
// ---------------------------------------------------------------------------
const heroLow = (p, k = 0.5) => p.hp < p.maxHp * k;
// Inimigos vivos a até R do herói
function heroCount(p, R) {
  let n = 0;
  for (const e of game.enemies) if (e.canBeHit() && dist2(e.x, e.y, p.x, p.y) < R * R) n++;
  return n;
}
// O herói está atrás ou no flanco do inimigo (fora do cone de visão dele)
function heroFlank(p, e) { return Math.abs(angleDiff(e.facing || 0, Math.atan2(p.y - e.y, p.x - e.x))) > Math.PI * 0.45; }

const HERO_PASSIVES = {
  // ======================= KAEL (nós novos)
  condutor_vivo: { stats: (S, l) => { S.chain += 0.06 * l; S.arcBonus += 0.05 * l; } },
  sobretensao: { stats: (S, l) => { S.power += 0.07 * l; } },
  fio_perfeito: { stats: (S, l) => { S.heavyMult += 0.08 * l; S.guardBreak += 0.1 * l; } },
  danca_tempestade: { stats: (S, l) => { S.lightMult += 0.06 * l; } },
  sombra_persistente: { stats: (S, l) => { S.dashCdMult *= 1 - 0.08 * l; S.iframeBonus += 0.03 * l; } },
  eco_sombrio: { stats: (S, l) => { S.perfectBonus += 0.2 * l; S.dodgeEnergy += 4 * l; } },
  blindagem_adaptativa: { stats: (S, l) => { S.armor += 0.04 * l; S.hpBonus += 10 * l; } },
  nucleo_estavel: { stats: (S, l) => { S.regen *= 1 + 0.2 * l; S.energyBonus += 5 * l; } },

  // ======================= LYRA (nós novos; os antigos ficam no kit)
  lyra_vento_cruzado: { dealt: (p, e, l) => (dist(p.x, p.y, e.x, e.y) > 260 ? 1 + 0.1 * l : 1) },
  lyra_mira_firme: { stats: (S, l) => { S.crit += 0.04 * l; S.chargeSpeed += 0.08 * l; } },
  lyra_sucata_viva: { kill: (p, e, l) => { if (e.T && e.T.mech) p.gainEnergy(3 * l); } },
  lyra_cacadora_paciente: { dealt: (p, e, l) => (e.stun > 0 || e._heroSlow ? 1 + 0.1 * l : 1) },
  lyra_po_de_estrela: { stats: (S, l) => { S.power += 0.06 * l; } },
  lyra_reator_instavel: { stats: (S, l) => { S.cdr = Math.max(0.5, S.cdr - 0.05 * l); } },
  lyra_pele_curtida: { stats: (S, l) => { S.hpBonus += 12 * l; S.healMult += 0.1 * l; } },
  lyra_segundo_folego: { lethal: (p, l) => { p.hp = Math.max(1, Math.round(p.maxHp * 0.15 * l)); return true; } },

  // ======================= DRAKOS
  drakos_peso: { stats: (S, l) => { S.heavyMult += 0.1 * l; } },
  drakos_ruptura: { dealt: (p, e, l) => (e.isBoss || e.superArmor || e.shieldHp > 0 || e.type === 'legionario' ? 1 + 0.25 * l : 1) },
  drakos_onze_anos: { dealt: (p, e, l) => 1 + Math.min(0.2 * l, 0.04 * l * heroCount(p, 200)) },
  drakos_placas: { stats: (S, l) => { S.hpBonus += 15 * l; S.armor += 0.04 * l; } },
  drakos_atropelo: { dealt: (p, e, l) => (e.stun > 0 ? 1 + 0.1 * l : 1) },
  drakos_ombro: { taken: (p, l) => (p.state === 'attack' && p.attack && /charge|investida/.test(p.attack.id) ? 1 - 0.25 * l : 1) },
  drakos_ultimo: { lethal: (p) => { p.hp = 1; p.invuln = Math.max(p.invuln, 1.2); game.hud.toast('ÚLTIMO DE PÉ', '255,46,61'); return true; } },
  drakos_modulo: { stats: (S, l) => { S.dmgMult += 0.05 * l; S.furyMult += 0.15 * l; } },
  drakos_folego: { kill: (p, e, l) => p.heal(2 * l, false) },
  drakos_aco: { dealt: (p, e, l) => (heroLow(p) ? 1 + 0.15 * l : 1), taken: (p, l) => (heroLow(p) ? 1 - 0.1 * l : 1) },
  // nós novos
  drakos_machado_largo: { dealt: (p, e, l) => 1 + Math.min(0.15 * l, 0.05 * l * Math.max(0, heroCount(p, 140) - 1)) },
  drakos_martelo_sismico: { stats: (S, l) => { S.heavyMult += 0.08 * l; S.chargeSpeed += 0.1 * l; } },
  drakos_baluarte: { taken: (p, l) => 1 - Math.min(0.15 * l, 0.03 * l * heroCount(p, 220)) },
  drakos_forja_interior: { stats: (S, l) => { S.hpBonus += 20 * l; S.regen *= 1 + 0.1 * l; } },
  drakos_ariete: { stats: (S, l) => { S.dashMult += 0.08 * l; S.guardBreak += 0.1 * l; } },
  drakos_marcha_ferro: { kill: (p, e, l) => { if (e.type === 'legionario' || e.elite) p.gainEnergy(6 * l); } },
  drakos_cicatrizes: { stats: (S, l) => { S.lifesteal += 0.02 * l; } },
  drakos_juramento: { dealt: (p, e, l) => (e.isBoss || e.elite ? 1 + 0.12 * l : 1) },

  // ======================= SERA
  sera_baterias: { kill: (p, e, l) => p.gainEnergy(3 * l) },
  sera_mira_assistida: { dealt: (p, e, l) => (e.T && e.T.mech ? 1 + 0.06 * l : 1) },
  sera_barreira: { tick: (p, dt, l) => {
    p._barT = (p._barT || 0) + dt;
    if (p._barT > 12 && p.shieldHp < 15 + 10 * l) { p.shieldHp = 15 + 10 * l; p.buffs.shield = Math.max(p.buffs.shield, 6); }
  }, taken: (p) => { p._barT = 0; return 1; } },
  sera_previsao: { stats: (S, l) => { S.dodgeEnergy += 5 * l; S.iframeBonus += 0.02 * l; } },
  sera_leitura: { stats: (S) => { S.showBars = 1; }, dealt: (p, e, l) => (e.T && e.T.mech ? 1 + 0.08 * l : 1) },
  sera_porta_fundos: { dealt: (p, e, l) => (e.T && e.T.mech && e.stun > 0 ? 1 + 0.2 * l : 1) },
  sera_nanorreparo: { stats: (S, l) => { S.healMult += 0.15 * l; }, tick: (p, dt, l) => { if (!game.combatActive() && p.hp < p.maxHp && p.state !== 'dead') p.hp = Math.min(p.maxHp, p.hp + l * dt); } },
  sera_triagem: { tick: (p, dt, l) => {
    if (p._triT > 0) p._triT -= dt;
    else if (heroLow(p, 0.3) && p.state !== 'dead') { p.shieldHp = Math.max(p.shieldHp, 30 + 20 * l); p.buffs.shield = Math.max(p.buffs.shield, 8); p._triT = 40; game.hud.toast('PROTOCOLO DE TRIAGEM', '25,230,210'); }
  } },
  sera_sem_permissao: { stats: (S, l) => { S.regen *= 1 + 0.25 * l; S.costMult = (S.costMult || 1) * (1 - 0.1 * l); } },
  // nós novos
  sera_rede_neural: { stats: (S, l) => { S.power += 0.07 * l; } },
  sera_drone_blindado: { taken: (p, l) => (p.buffs.supportDrone > 0 ? 1 - 0.08 * l : 1) },
  sera_campo_residual: { stats: (S, l) => { S.armor += 0.03 * l; S.cdr = Math.max(0.5, S.cdr - 0.04 * l); } },
  sera_ressonancia: { dealt: (p, e, l) => (e.stun > 0 ? 1 + 0.12 * l : 1) },
  sera_firewall: { taken: (p, l) => 1 - 0.05 * l },
  sera_eco_digital: { kill: (p, e, l) => { if (e.T && e.T.mech) p.heal(3 * l, false); } },
  sera_celulas_tronco: { stats: (S, l) => { S.hpBonus += 12 * l; S.healMult += 0.1 * l; } },
  sera_otimizacao: { stats: (S, l) => { S.energyBonus += 10 * l; S.regen *= 1 + 0.1 * l; } },

  // ======================= ORION
  orion_corte_junta: { dealt: (p, e, l) => (heroFlank(p, e) ? 1 + 0.15 * l : 1) },
  orion_ritmo: { hit: (p, e, l) => { p._ritmo = Math.min(5, (p._ritmoT > 0 ? p._ritmo || 0 : 0) + 1); p._ritmoT = 2; },
    tick: (p, dt) => { if (p._ritmoT > 0) p._ritmoT -= dt; },
    dealt: (p, e, l) => (p._ritmoT > 0 ? 1 + 0.02 * l * (p._ritmo || 0) : 1) },
  orion_corte_profundo: { hit: (p, e, l) => { e._sangra = Math.min(3, (e._sangraT > 0 ? e._sangra || 0 : 0) + 1); e._sangraT = 3; e._sangraD = 4 + 3 * l; },
    tick: (p, dt) => {
      for (const e of game.enemies) {
        if (!(e._sangraT > 0) || !e.canBeHit()) continue;
        e._sangraT -= dt; e._sangraAcc = (e._sangraAcc || 0) + e._sangraD * e._sangra * dt;
        if (e._sangraAcc >= 1) { const d = Math.floor(e._sangraAcc); e._sangraAcc -= d; e.hp -= d; if (e.hp <= 0 && e.takeHit) e.takeHit({ dmg: 1, kx: 0, ky: 0, kb: 0, stun: 0 }); }
      }
    } },
  orion_execucao: { dealt: (p, e, l) => (e.isBoss ? 1 + 0.25 * l : 1),
    hit: (p, e, l) => { if (!e.isBoss && e.alive && e.maxHp && e.hp > 0 && e.hp / e.maxHp < 0.1 + 0.05 * l) e.takeHit({ dmg: e.hp + 1, kx: 0, ky: 0, kb: 0, stun: 0 }); } },
  orion_sem_registro: { dealt: (p) => { if (p.buffs.stealth > 0) p._saiuFurtivo = 1.5; return 1; }, tick: (p, dt) => { if (p._saiuFurtivo > 0) p._saiuFurtivo -= dt; },
    kill: (p, e, l) => { if (p.buffs.stealth > 0 || p._saiuFurtivo > 0) p.gainEnergy(10 * l); } },
  orion_passo_silencioso: { tick: (p, dt, l) => { p.stats.speedMult = p._baseSpeedMult * (p.buffs.stealth > 0 ? 1 + 0.1 * l : 1); } },
  orion_fio_recarregado: { hit: (p, e, l) => { const k = 'orion_lamina_energia'; if (p.cds[k] > 0) p.cds[k] = Math.max(0, p.cds[k] - 0.2 * l); } },
  orion_olho_vigia: { dealt: (p, e, l) => (dist(p.x, p.y, e.x, e.y) > 250 ? 1 + 0.1 * l : 1) },
  orion_reflexos: { stats: (S, l) => { S.dashCdMult *= 1 - 0.1 * l; S.dashMult += 0.08 * l; } },
  orion_culto: { dealt: (p, e, l) => (e.type === 'sacerdote' ? 1 + 0.15 * l : 1) },
  // nós novos
  orion_laminas_gemeas: { stats: (S, l) => { S.lightMult += 0.06 * l; } },
  orion_veneno: { dealt: (p, e, l) => (e._sangraT > 0 ? 1 + 0.08 * l : 1) },
  orion_sombra_viva: { stats: (S, l) => { S.iframeBonus += 0.04 * l; S.speedMult += 0.03 * l; } },
  orion_contrato: { kill: (p, e, l) => { if (e.elite || e.isBoss) p.heal(10 * l, false); } },
  orion_ponta_fina: { stats: (S, l) => { S.crit += 0.05 * l; } },
  orion_assinatura: { stats: (S, l) => { S.critHeal += l; } },
  orion_agente_duplo: { taken: (p, l) => (heroCount(p, 160) >= 3 ? 1 - 0.1 * l : 1) },
  orion_ultima_porta: { dealt: (p, e, l) => (e.maxHp && e.hp / e.maxHp > 0.8 ? 1 + 0.12 * l : 1) },
};

// Liga as passivas aprendidas do personagem do Player (chamado no fim do recalc)
// ======================= RAMO SUPREMAS (o mesmo para todos: <prefixo>_sup_*, js/data/skilltrees.js)
for (const pre of ['kael', 'lyra', 'drakos', 'sera', 'orion']) {
  HERO_PASSIVES[pre + '_sup_nucleo'] = { stats: (S, l) => { S.ultCostMult = (S.ultCostMult || 1) * (1 - 0.06 * l); } };
  HERO_PASSIVES[pre + '_sup_amplificador'] = { stats: (S, l) => { S.power += 0.08 * l; } };
  // golpes pesados e finalizações devolvem energia (uma vez por golpe)
  HERO_PASSIVES[pre + '_sup_recarga'] = { hit: (p, e, l) => {
    const a = p.attack;
    if (a && a.def && (a.def.heavy || a.def.leap) && a._recarga !== a.serial) { a._recarga = a.serial; p.gainEnergy(2 * l); }
  } };
  // combinação: depois de uma habilidade (Player.castAbility marca convT), o próximo golpe é mais forte
  HERO_PASSIVES[pre + '_sup_convergencia'] = {
    tick: (p, dt) => { if (p.convT > 0) p.convT -= dt; },
    dealt: (p, e, l) => (p.convT > 0 && !(p.attack && p.attack.def && p.attack.def.ability) ? 1 + 0.25 * l : 1),
    hit: (p) => { if (p.convT > 0 && !(p.attack && p.attack.def && p.attack.def.ability)) { p.convT = 0; game.texts.spawn(p.x, p.y, 70, 'CONVERGÊNCIA', '#a8c8ff', 13, 0.7); } },
  };
  HERO_PASSIVES[pre + '_sup_folego'] = { lethal: (p) => {
    p.hp = Math.max(1, Math.round(p.maxHp * 0.3)); p.fury = Math.max(p.fury, p.maxEnergy * 0.5); p.invuln = Math.max(p.invuln, 1);
    game.hud.toast('ÚLTIMO FÔLEGO', '170,200,255'); return true;
  } };
  HERO_PASSIVES[pre + '_sup_ressonancia'] = { kill: (p, e, l) => {
    if (p.state === 'special' || (p.buffs && p.buffs.lyraFocus > 0)) p.fury = Math.min(p.maxEnergy, p.fury + 8 * l);
  } };
  HERO_PASSIVES[pre + '_sup_ascensao'] = {
    stats: (S) => { S.dmgMult += 0.1; S.ultCostMult = (S.ultCostMult || 1) * 0.9; },
    taken: () => 0.9,
  };
}

const HeroPassives = {
  // Monta a lista [efeito, nível] do personagem e aplica os atributos
  apply(p, S, pr) {
    const list = p._passives || (p._passives = []);
    list.length = 0;
    for (const id in skillsOf(p.def.id)) {
      const fx = HERO_PASSIVES[id];
      if (!fx) continue;
      const l = pr.lv(id);
      if (l > 0) list.push([fx, l]);
    }
    for (const [fx, l] of list) if (fx.stats) fx.stats(S, l, p);
    p._baseSpeedMult = S.speedMult;
  },
  // (com os efeitos ativos dos aliados: Grito de Guerra, Muralha Viva — js/heroes/aliados.js)
  dealt(p, e) { let m = typeof AllyFx !== 'undefined' ? AllyFx.dealt(p, e) : 1; const L = p._passives; if (L) for (const [fx, l] of L) if (fx.dealt) m *= fx.dealt(p, e, l); return m; },
  taken(p) { let m = typeof AllyFx !== 'undefined' ? AllyFx.taken(p) : 1; const L = p._passives; if (L) for (const [fx, l] of L) if (fx.taken) m *= fx.taken(p, l); return Math.max(0.2, m); },
  hit(p, e, dmg) { const L = p._passives; if (L) for (const [fx, l] of L) if (fx.hit) fx.hit(p, e, l, dmg); },
  kill(p, e) { const L = p._passives; if (L) for (const [fx, l] of L) if (fx.kill) fx.kill(p, e, l); },
  tick(p, dt) { const L = p._passives; if (L) for (const [fx, l] of L) if (fx.tick) fx.tick(p, dt, l); },
  // Golpe que mataria: a primeira passiva que segura o herói vale uma vez por setor
  lethal(p) {
    const L = p._passives;
    const room = game.waves ? game.waves.roomIndex : 0;
    if (!L || p._lethalRoom === room) return false;
    for (const [fx, l] of L) if (fx.lethal && fx.lethal(p, l)) { p._lethalRoom = room; return true; }
    return false;
  },
};
