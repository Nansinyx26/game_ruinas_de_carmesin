'use strict';
// ECLIPSE ZERO · Definições das habilidades dos personagens (AbilityDefinition)
// ---------------------------------------------------------------------------
// HABILIDADES DO ROSTER: as 4 habilidades de cada personagem.
//   type: 'melee' | 'projectile' | 'aoe' | 'buff' | 'summon' | 'trap' | 'mobility' | 'shield' | 'stealth'
//   implemented: false → aparece acinzentada ("Em desenvolvimento") e não pode ser usada
//   binding (só Kael por enquanto): liga a habilidade da ficha ao sistema que já
//   existe no jogo — { system: 'combo' } golpes de espada, { system: 'dash' } esquiva,
//   { skill: '<id>' } habilidade da árvore (js/progression.js SKILLS / js/abilities.js).
//   cooldown (s) e cost (energia) dos personagens novos são valores de projeto; os do
//   Kael vêm das habilidades ligadas (null aqui = "o que o sistema já usa").
// ---------------------------------------------------------------------------
const ABILITY_DEFS = {
  // ----- KAEL VEYRON (já implementadas: apontam para os sistemas existentes)
  kael_espada: { owner: 'kael', name: 'Espada Tempestade Nula', icon: 'sword', type: 'melee', cooldown: null, cost: 0, implemented: true,
    binding: { system: 'combo' }, desc: 'Golpes de espada com rastro de energia elétrica (leve, pesado e combos).' },
  kael_teleporte: { owner: 'kael', name: 'Teleporte', icon: 'dash', type: 'mobility', cooldown: null, cost: 0, implemented: true,
    binding: { system: 'dash' }, desc: 'Deslocamento curto e instantâneo, invencível durante o movimento (esquiva).' },
  kael_explosao: { owner: 'kael', name: 'Explosão Eletromagnética', icon: 'burst', type: 'aoe', cooldown: null, cost: null, implemented: true,
    binding: { skill: 'ruptura_plasma' }, desc: 'Explosão de energia ao redor de Kael que lança os inimigos (Ruptura de Plasma na árvore).' },
  kael_furia: { owner: 'kael', name: 'Fúria Interior', icon: 'overload', type: 'buff', ultimate: true, cooldown: null, cost: null, implemented: true,
    binding: { skill: 'sobrecarga' }, desc: 'Aumento temporário de dano e de velocidade dos golpes (Sobrecarga na árvore).' },

  // ----- LYRA KAEDE
  lyra_tiro: { owner: 'lyra', name: 'Tiro Preciso', icon: 'aim', type: 'projectile', cooldown: 1.2, cost: 0, implemented: true,
    binding: { system: 'combo' }, params: { chargeTime: 0.9, dmg: 60, critBonus: 0.6 }, desc: 'Disparo carregado de alto dano crítico.' },
  lyra_armadilha: { owner: 'lyra', name: 'Armadilha de Plasma', icon: 'trap', type: 'trap', cooldown: 8, cost: 20, implemented: true,
    params: { radius: 70, dmg: 80, max: 2 }, desc: 'Mina no chão que explode ao contato.' },
  lyra_flecha: { owner: 'lyra', name: 'Flecha Explosiva', icon: 'arrowBurst', type: 'aoe', cooldown: 6, cost: 25, implemented: true,
    params: { radius: 110, dmg: 70 }, desc: 'Flecha com dano em área.' },
  lyra_foco: { owner: 'lyra', name: 'Foco de Batalha', icon: 'focus', type: 'buff', ultimate: true, cooldown: 0, cost: 100, implemented: true,
    params: { duration: 3, timeScale: 0.4 }, desc: 'Câmera lenta curta e acerto crítico garantido.' },

  // ----- DRAKOS
  drakos_golpe: { owner: 'drakos', name: 'Golpe Pesado', icon: 'hammer', type: 'melee', cooldown: 0, cost: 0, implemented: true,
    binding: { system: 'combo' }, params: { dmg: 55, breaksShield: true }, desc: 'Ataque lento de alto dano que quebra escudos.' },
  drakos_escudo: { owner: 'drakos', name: 'Escudo de Energia', icon: 'shieldFront', type: 'shield', cooldown: 4, cost: 0, implemented: true,
    params: { absorb: 0.8, arc: 1.6 }, desc: 'Bloqueio frontal que absorve dano.' },
  drakos_investida: { owner: 'drakos', name: 'Investida', icon: 'charge', type: 'mobility', cooldown: 7, cost: 20, implemented: true,
    params: { distance: 320, dmg: 40, knockdown: true }, desc: 'Carga em linha reta que derruba inimigos.' },
  drakos_zona: { owner: 'drakos', name: 'Zona de Impacto', icon: 'quake', type: 'aoe', ultimate: true, cooldown: 0, cost: 100, implemented: true,
    params: { radius: 240, dmg: 140, knockback: 520 }, desc: 'Salto com impacto em área e repulsão.' },

  // ----- SERA VYNE
  sera_drone: { owner: 'sera', name: 'Drone de Suporte', icon: 'droneAlly', type: 'summon', cooldown: 14, cost: 30, implemented: true,
    params: { duration: 10, dps: 18, range: 260 }, desc: 'Invoca um drone que atira nos inimigos próximos.' },
  sera_campo: { owner: 'sera', name: 'Campo de Força', icon: 'dome', type: 'shield', cooldown: 16, cost: 30, implemented: true,
    params: { radius: 130, duration: 5 }, desc: 'Domo que bloqueia projéteis.' },
  sera_hack: { owner: 'sera', name: 'Hack de Sistema', icon: 'hack', type: 'aoe', cooldown: 12, cost: 35, implemented: true,
    params: { duration: 4, targets: 'mech' }, desc: 'Desativa ou controla inimigos mecânicos por alguns segundos.' },
  sera_cura: { owner: 'sera', name: 'Cura de Emergência', icon: 'heal', type: 'buff', ultimate: true, cooldown: 0, cost: 100, implemented: true,
    params: { radius: 200, heal: 0.5 }, desc: 'Cura em área para o time.' },

  // ----- ORION
  orion_furtividade: { owner: 'orion', name: 'Furtividade', icon: 'stealth', type: 'stealth', cooldown: 10, cost: 20, implemented: true,
    params: { duration: 6, bonus: 0.8 }, desc: 'Fica invisível até atacar; o golpe saindo da furtividade causa dano extra.' },
  orion_duplo: { owner: 'orion', name: 'Ataque Duplo', icon: 'twin', type: 'melee', cooldown: 0, cost: 0, implemented: true,
    binding: { system: 'combo' }, params: { hits: 2, dmg: 18 }, desc: 'Combo rápido com as duas lâminas.' },
  orion_lamina: { owner: 'orion', name: 'Lâmina de Energia', icon: 'bladeThrow', type: 'projectile', cooldown: 4, cost: 15, implemented: true,
    params: { dmg: 45, speed: 900, pierce: 2 }, desc: 'Projétil de lâmina à distância.' },
  orion_furia: { owner: 'orion', name: 'Fúria Sombria', icon: 'shadowStrike', type: 'mobility', ultimate: true, cooldown: 0, cost: 100, implemented: true,
    params: { jumps: 6, dmg: 60 }, desc: 'Sequência de teleportes atacando vários alvos.' },
};
