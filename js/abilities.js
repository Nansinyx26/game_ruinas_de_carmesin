'use strict';
// ECLIPSE ZERO · Habilidades ativas dos atalhos 1–4 (ABILITIES)
// ---------------------------------------------------------------------------
// HABILIDADES ATIVAS (atalhos 1–4): 'attack' usa o corpo de Kael (animação,
// rastro e hitbox de golpe); 'buff' é instantânea e pode ser usada em qualquer
// momento. cast(p, nível, direção) devolve false quando não há como usá-la.
// ---------------------------------------------------------------------------
const FIELD_R = 120;   // raio do Campo Magnético
const ABILITY_DEF = { hitstop: 0.035, shake: 0.14, fury: 0, heavy: false, sound: 'hit', ability: true };
const FIELD_DEF = { hitstop: 0.001, shake: 0.02, fury: 0, heavy: false, sound: 'hit', ability: true };
const ABILITIES = {
  arco_voltaico: { type: 'attack', cast: (p, lv, wd) => { p.startAttack('volt', wd); return true; } },
  corrente_relampago: { type: 'attack', cast: (p, lv, wd) => p.castChain(lv, wd) },
  campo_magnetico: { type: 'buff', cast: (p, lv) => {
    p.buffs.field = 4 + lv; p.fieldLv = lv; p.fieldTick = 0;
    game.particles.ring(p.x, p.y, FIELD_R, '110,180,255', 0.45, 8);
    game.arcs.crackle(p.x, p.y, 30, 6, FIELD_R, '150,205,255', 0.2);
    game.audio.play('chargeTier', 1); game.audio.play('zap');
    return true;
  } },
  ruptura_plasma: { type: 'attack', cast: (p, lv, wd) => {
    const d = ATTACKS.plasma;
    d.shape.radius = 150 + 20 * lv; d.dmg = 70 + 30 * lv;
    p.startAttack('plasma', wd);
    return true;
  } },
  investida_sombria: { type: 'attack', cast: (p, lv, wd) => p.castLunge(lv, wd) },
  salto_dimensional: { type: 'attack', cast: (p, lv, wd) => p.castBlink(lv, wd) },
  tempestade_laminas: { type: 'attack', cast: (p, lv, wd) => {
    const d = ATTACKS.storm, n = 5 + lv;
    d.multiHit = n; d.oscillate = n; d.dmg = 14 + 5 * lv; d.active = 0.09 * n + 0.04;
    p.startAttack('storm', wd);
    return true;
  } },
  sobrecarga: { type: 'buff', cast: (p, lv) => {
    p.buffs.overload = 6; p.overloadMult = 1.25 + 0.1 * lv;
    game.particles.flash(p.x, p.y, 30, 90, '90,160,255', 0.25);
    game.particles.ring(p.x, p.y, 70, '120,190,255', 0.35, 5);
    game.arcs.crackle(p.x, p.y, 34, 4, 50, '150,205,255', 0.18);
    game.audio.play('chargeTier', 2);
    return true;
  } },
  escudo_energia: { type: 'buff', cast: (p, lv) => {
    p.buffs.shield = 8; p.shieldHp = p.shieldMax = Math.round((40 + 25 * lv) * p.stats.power);
    game.particles.ring(p.x, p.y, 50, '90,240,210', 0.4, 6);
    game.particles.flash(p.x, p.y, 34, 60, '120,255,220', 0.18);
    game.audio.play('deflect');
    return true;
  } },
  sincronizacao: { type: 'buff', cast: (p, lv) => {
    p.buffs.sync = 6 + 2 * lv;
    for (const id in p.cds) p.cds[id] *= 0.5;
    game.particles.ring(p.x, p.y, 110, '80,230,200', 0.5, 6);
    game.particles.ring(p.x, p.y, 60, '200,255,240', 0.3, 3);
    game.glitch(0.15);
    game.audio.play('memory');
    return true;
  } },

  // ==================== LYRA KAEDE ====================
  lyra_tiro: {
    type: 'attack',
    cast: (p, lv, wd) => { p.startAttack('lyra_heavy', wd); return true; }
  },
  lyra_tiro_preciso: {
    type: 'attack',
    cast: (p, lv, wd) => { p.startAttack('lyra_heavy', wd); return true; }
  },
  lyra_armadilha: {
    type: 'buff',
    cast: (p, lv) => {
      if (!game.traps) game.traps = new TrapSystem();
      game.traps.spawn(p.x, p.y, 75 + 10 * lv, 60 + 25 * lv, 'lyra');
      game.particles.ring(p.x, p.y, 70, '166,77,255', 0.4, 6);
      game.arcs.crackle(p.x, p.y, 20, 3, 50, '200,120,255', 0.15);
      game.audio.play('chargeTier', 1);
      return true;
    }
  },
  lyra_armadilha_plasma: {
    type: 'buff',
    cast: (p, lv) => ABILITIES.lyra_armadilha.cast(p, lv)
  },
  lyra_flecha: {
    type: 'attack',
    cast: (p, lv, wd) => {
      const dir = wd ? Math.atan2(wd.y, wd.x) : p.facing;
      p.facing = dir;
      p.fireExplosiveArrow(dir, (60 + 25 * lv) * p.stats.power);
      game.audio.play('swingHeavy');
      return true;
    }
  },
  lyra_flecha_explosiva: {
    type: 'attack',
    cast: (p, lv, wd) => ABILITIES.lyra_flecha.cast(p, lv, wd)
  },
  lyra_foco: {
    type: 'buff',
    cast: (p, lv) => {
      p.buffs.lyraFocus = 3.5 + 0.5 * lv;
      game.slowMo(0.38, 3.5 + 0.5 * lv);
      game.particles.flash(p.x, p.y, 30, 80, '180,90,255', 0.25);
      game.particles.ring(p.x, p.y, 100, '166,77,255', 0.4, 6);
      game.arcs.crackle(p.x, p.y, 30, 5, 80, '220,150,255', 0.2);
      game.audio.play('chargeTier', 2);
      game.audio.play('zap');
      return true;
    }
  },
  lyra_foco_batalha: {
    type: 'buff',
    cast: (p, lv) => ABILITIES.lyra_foco.cast(p, lv)
  },
  lyra_rajada: {
    type: 'attack',
    cast: (p, lv, wd) => {
      const dir = wd ? Math.atan2(wd.y, wd.x) : p.facing;
      p.facing = dir;
      const count = lv >= 3 ? 5 : 3;
      for (let i = 0; i < count; i++) {
        const a = dir + (i - (count - 1) / 2) * 0.18;
        p.fireArrow(a, (22 + 8 * lv) * p.stats.power, false);
      }
      game.audio.play('thrust');
      return true;
    }
  },
  lyra_chuva_fotons: {
    type: 'attack',
    cast: (p, lv, wd) => { p.firePhotonRain(lv, wd); return true; }
  },

  // ==================== DRAKOS ====================
  drakos_golpe: {
    type: 'attack',
    cast: (p, lv, wd) => { p.startAttack('drakos_heavy', wd); return true; }
  },
  drakos_golpe_pesado: {
    type: 'attack',
    cast: (p, lv, wd) => ABILITIES.drakos_golpe.cast(p, lv, wd)
  },
  drakos_escudo: {
    type: 'buff',
    cast: (p, lv) => {
      p.buffs.drakosShield = 4.5 + 0.5 * lv;
      game.particles.ring(p.x, p.y, 60, '255,46,61', 0.45, 6);
      game.particles.flash(p.x, p.y, 30, 70, '255,100,80', 0.2);
      game.audio.play('deflect');
      return true;
    }
  },
  drakos_escudo_energia: {
    type: 'buff',
    cast: (p, lv) => ABILITIES.drakos_escudo.cast(p, lv)
  },
  drakos_investida: {
    type: 'attack',
    cast: (p, lv, wd) => { p.startAttack('drakos_charge', wd); return true; }
  },
  drakos_zona: {
    type: 'attack',
    cast: (p, lv, wd) => { p.startAttack('drakos_slam', wd); return true; }
  },
  drakos_terremoto: {
    type: 'attack',
    cast: (p, lv, wd) => { p.startAttack('drakos_quake', wd); return true; }
  },

  // ==================== SERA VYNE ====================
  sera_drone: {
    type: 'buff',
    cast: (p, lv) => {
      p.buffs.supportDrone = 12 + 2 * lv;
      game.particles.ring(p.x, p.y, 50, '25,230,210', 0.4, 5);
      game.particles.flash(p.x, p.y, 30, 60, '120,255,235', 0.18);
      game.audio.play('zap');
      return true;
    }
  },
  sera_campo: {
    type: 'buff',
    cast: (p, lv) => {
      p.buffs.forceField = 5 + lv;
      p.forceFieldX = p.x;
      p.forceFieldY = p.y;
      p.forceFieldR = 135;
      game.particles.ring(p.x, p.y, 135, '25,230,210', 0.5, 8);
      game.arcs.crackle(p.x, p.y, 30, 5, 135, '120,255,240', 0.2);
      game.audio.play('chargeTier', 1);
      game.audio.play('deflect');
      return true;
    }
  },
  sera_hack: {
    type: 'attack',
    cast: (p, lv, wd) => { p.castSeraHack(lv, wd); return true; }
  },
  sera_cura: {
    type: 'buff',
    cast: (p, lv) => {
      const healAmt = Math.round(p.maxHp * 0.5);
      p.heal(healAmt, true);
      p.shieldHp = Math.max(p.shieldHp, Math.round(50 * p.stats.power));
      p.buffs.shield = 8;
      game.particles.ring(p.x, p.y, 90, '30,255,200', 0.5, 8);
      game.particles.flash(p.x, p.y, 30, 80, '140,255,225', 0.25);
      game.audio.play('memory');
      game.audio.play('chargeTier', 2);
      return true;
    }
  },

  // ==================== ORION ====================
  orion_furtividade: {
    type: 'buff',
    cast: (p, lv) => {
      p.buffs.stealth = 6 + lv;
      game.particles.ring(p.x, p.y, 45, '255,138,31', 0.35, 4);
      game.particles.flash(p.x, p.y, 25, 50, '255,180,90', 0.15);
      game.audio.play('dash');
      return true;
    }
  },
  orion_duplo: {
    type: 'attack',
    cast: (p, lv, wd) => { p.startAttack('orion_light2', wd); return true; }
  },
  orion_lamina: {
    type: 'attack',
    cast: (p, lv, wd) => {
      const dir = wd ? Math.atan2(wd.y, wd.x) : p.facing;
      p.facing = dir;
      p.firePhantomBlade(dir, (45 + 15 * lv) * p.stats.power);
      game.audio.play('thrust');
      return true;
    }
  },
  orion_furia: {
    type: 'attack',
    cast: (p, lv, wd) => { p.castOrionShadowDance(lv, wd); return true; }
  },
};

