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
};

