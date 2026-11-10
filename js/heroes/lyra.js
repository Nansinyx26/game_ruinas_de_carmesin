'use strict';
// ECLIPSE ZERO · Kit da Lyra Kaede: arco de fóton, armadilhas, explosivos e mobilidade
// ---------------------------------------------------------------------------
// Tudo o que a Lyra faz de diferente do Kael (o Player comum está em js/player.js e a
// estrutura dos kits em js/heroes/kit.js). Cada nó das 4 árvores dela
// (js/data/skilltrees.js) tem efeito aqui:
//   ARCO DE FÓTON   Tiro Preciso (Pesado segurado), Mira de Sucata, Flecha Perfurante
//                   (Leve·Leve·Pesado), Ponto Cego, Rajada Tripla, Fôlego Contido, Foco de
//                   Batalha (suprema, tecla I)
//   CAÇADORA        Armadilha de Plasma, Fio de Tropeço, Rastreadora, Isca de Sucata,
//                   Reação em Cadeia, Campo Minado
//   FÓTON INSTÁVEL  Flecha Explosiva, Carga Volátil, Estilhaços, Flecha de Pulso, Chuva de Fótons
//   SOBREVIVENTE    Passos Leves, Salto Recuado (Esquiva → Leve), Onde a Rede Não Olha,
//                   Sangue-Frio, Gancho de Cabo, Atalhos dos Túneis
// Golpes: LYRA_ATTACKS (mesma forma de ATTACKS, com 'pose' para o modelo 3D). Objetos no
// mundo (flechas, minas, isca, chuva, cabo) vão para HeroObjects. O arco 3D e as poses de
// arqueira ficam em HERO_WEAPONS.lyra (no fim do arquivo), usado pelo modelo procedural
// (js/models/lyra.js) e pelo texturizado (MODELS3D.lyraTex), quando existir.
// ---------------------------------------------------------------------------
const LYRA_RGB = '166,77,255', LYRA_HI = '206,150,255', LYRA_CORE = '246,236,255';

// Golpes da Lyra. windup = puxar a corda, a flecha sai no início da fase ativa.
// pose: 'shot' | 'hop' (salto para trás) | 'up' (para o alto) | 'trap' | 'throw' | 'hook' | 'cast'
// Os campos swing/blade/projectile só servem para a pose-base do rig do Kael (js/models/kael.js)
const LYRA_ATTACKS = {
  // ----- Arco de fóton (J / K)
  l1: { name: null, pose: 'shot', windup: 0.11, active: 0.05, recovery: 0.2, chainFrac: 0.25, dmg: 9, speed: 980, range: 470, kb: 150, stun: 0.25, light: true, sound: 'thrust' },
  l2: { name: null, pose: 'shot', windup: 0.11, active: 0.05, recovery: 0.2, chainFrac: 0.25, dmg: 10, speed: 980, range: 470, kb: 160, stun: 0.25, light: true, sound: 'thrust' },
  l3: { name: 'DISPARO DUPLO', pose: 'shot', windup: 0.16, active: 0.05, recovery: 0.3, chainFrac: 0.45, dmg: 11, count: 2, spread: 0.1, speed: 1050, range: 500, kb: 220, stun: 0.35, light: true, sound: 'swing' },
  heavy: { name: null, pose: 'shot', windup: 0.24, active: 0.06, recovery: 0.32, chainFrac: 0.35, dmg: 22, speed: 1150, range: 560, kb: 320, stun: 0.5, heavy: true, heavyType: true, chargeable: true, sound: 'swingHeavy' },
  charged: { name: 'TIRO PRECISO', pose: 'shot', windup: 0.03, active: 0.05, recovery: 0.36, chainFrac: 0.5, dmg: 60, speed: 1500, range: 680, kb: 560, stun: 0.8, heavy: true, heavyType: true, sound: 'swingHeavy' },
  pierce: { name: 'FLECHA PERFURANTE', pose: 'shot', windup: 0.16, active: 0.05, recovery: 0.3, chainFrac: 0.4, dmg: 18, speed: 1250, range: 620, kb: 240, stun: 0.4, heavy: true, sound: 'swingHeavy' },
  back: { name: 'SALTO RECUADO', pose: 'hop', windup: 0.06, active: 0.05, recovery: 0.3, chainFrac: 0.45, dmg: 25, speed: 1250, range: 520, kb: 260, stun: 0.3, hop: 18, backstep: 430, sound: 'thrust' },
  // ----- Habilidades dos atalhos 1–4 (dano escala com o poder) e a suprema
  rajada: { name: 'RAJADA TRIPLA', pose: 'shot', windup: 0.14, active: 0.05, recovery: 0.26, chainFrac: 0.4, ability: true, speed: 1050, range: 500, kb: 200, stun: 0.3, sound: 'swing' },
  explosiva: { name: 'FLECHA EXPLOSIVA', pose: 'hop', windup: 0.12, active: 0.05, recovery: 0.34, chainFrac: 0.45, ability: true, speed: 900, range: 520, hop: 22, backstep: 300, sound: 'swingHeavy' },
  pulso: { name: 'FLECHA DE PULSO', pose: 'shot', windup: 0.18, active: 0.05, recovery: 0.3, chainFrac: 0.4, ability: true, speed: 950, range: 520, sound: 'zap' },
  chuva: { name: 'CHUVA DE FÓTONS', pose: 'up', windup: 0.24, active: 0.06, recovery: 0.3, chainFrac: 0.4, ability: true, sound: 'swingHeavy' },
  armadilha: { name: 'ARMADILHA DE PLASMA', pose: 'trap', windup: 0.26, active: 0.1, recovery: 0.28, chainFrac: 0.4, ability: true, plasma: true, aim: false, sound: 'stomp' },
  isca: { name: 'ISCA DE SUCATA', pose: 'throw', windup: 0.2, active: 0.06, recovery: 0.26, chainFrac: 0.4, ability: true, sound: 'swing' },
  gancho: { name: 'GANCHO DE CABO', pose: 'hook', windup: 0.08, active: 0.25, recovery: 0.2, chainFrac: 0.3, ability: true, thrust: true, aim: false, pull: 1300, sound: 'dash' },
  foco: { name: 'FOCO DE BATALHA', pose: 'cast', windup: 0.18, active: 0.1, recovery: 0.3, chainFrac: 0.6, ability: true, noHit: true, aim: false, sound: 'specialCharge' },
};
for (const id in LYRA_ATTACKS) {
  const d = LYRA_ATTACKS[id];
  d.id = id; d.swing = [0, 0]; d.blade = 70; d.rgb = LYRA_RGB; d.core = LYRA_CORE;
  if (!d.plasma && !d.thrust) d.projectile = true;
  d.shape = { type: 'capsule', length: 80, width: 6 };   // só para o modo debug (F1): linha de mira
}
// Acertos (para game.onEnemyHit): energia, tremor e faíscas violeta
const LYRA_SHOT_DEF = { hitstop: 0.03, shake: 0.08, fury: 4, heavy: false, spark: LYRA_HI };
const LYRA_HEAVY_DEF = { hitstop: 0.07, shake: 0.22, fury: 7, heavy: true, zoom: 0.02, spark: LYRA_HI };
const LYRA_CHARGED_DEF = { hitstop: 0.12, shake: 0.4, fury: 10, heavy: true, zoom: 0.05, spark: LYRA_HI };
const LYRA_SKILL_DEF = { hitstop: 0.035, shake: 0.12, fury: 0, heavy: false, ability: true, spark: LYRA_HI };
const LYRA_BLAST_DEF = { hitstop: 0.06, shake: 0.3, fury: 0, heavy: true, ability: true, spark: LYRA_HI };

// Efeitos das passivas (recalculados em passives): todos começam em 0
const LYRA_MODS0 = { range: 0, blind: 0, chargeArmor: 0, slowK: 0, slowT: 0, mark: 0, chainR: 0, chainB: 0, mini: 0, miniT: 0,
  blastR: 0, blastKb: 0, shards: 0, shardDmg: 0, camo: 0, cold: 0 };
// Nível de um nó da árvore da Lyra
const lyraLv = (p, id) => p.kit.progress(p).lv(id);
// Tempo de carga completa do Tiro Preciso
const lyraFullCharge = (p) => Math.max(0.5, 1 - 0.1 * lyraLv(p, 'lyra_tiro_preciso'));
// A Lyra está "atrás" do inimigo (ele olha para o outro lado)?
function lyraBehind(p, e) { return Math.abs(angleDiff(e.facing || 0, Math.atan2(p.y - e.y, p.x - e.x))) > Math.PI * 0.6; }
// Volta ao combate: fim da camuflagem
function lyraFight(p) { const H = p.hero; H.calm = 0; H.camo = false; }
// Marca da Rastreadora (5 s)
function lyraMark(e) { e._lyraMark = 5; }

// ---------------------------------------------------------------------------
// ACERTOS: flechas (e tudo o que é "disparo"): crítico, marcas, Ponto Cego
// info: { dmg, kb, stun, heavy, launch, critBonus, canCrit, mark, def }
// ---------------------------------------------------------------------------
function lyraHitEnemy(p, e, dmg, angle, info) {
  const H = p.hero, M = H.mods, S = p.stats;
  dmg *= rand(0.92, 1.08) * p.targetMult(e);
  if (M.mark && e._lyraMark > 0) dmg *= 1 + M.mark;
  if (M.blind && (e.state === 'stun' || e._heroSlow || lyraBehind(p, e))) dmg *= 1 + M.blind;
  const crit = info.canCrit !== false && (H.focus > 0 || Math.random() < S.crit);
  if (crit) { dmg *= 2 + (info.critBonus || 0); if (S.critHeal > 0) p.heal(S.critHeal, false); }
  dmg *= e.vulnerable || 1;
  const kx = Math.cos(angle), ky = Math.sin(angle);
  lyraFight(p);
  if (!heroStrike(e, dmg, crit, info.def || LYRA_SHOT_DEF, kx, ky, { kb: info.kb || 160, stun: info.stun || 0.25, heavy: !!info.heavy, launch: info.launch || 0 })) return false;
  if (info.mark && M.mark) lyraMark(e);
  if (info.stunFix) e.stun = Math.max(e.stun, info.stunFix);
  if (S.chain > 0 && Math.random() < S.chain) p.chainLightning(e, dmg);   // evolução Condutor Iônico
  return true;
}

// Dispara uma flecha (HeroShot) a partir do arco; aplica o bônus da camuflagem e do gancho
function lyraShot(p, a, o) {
  const H = p.hero, M = H.mods, ang = o.angle;
  let bonus = 1;
  if (a && a.camo) bonus *= 1 + 0.25 * M.camo;
  if (H.hookT > 0) { bonus *= 1 + H.hookBonus; H.hookT = 0; }   // a próxima flecha depois do gancho
  const range = (o.range || 480) * (1 + M.range), speed = o.speed || 1000;
  const c = Math.cos(ang), s = Math.sin(ang);
  const shot = new HeroShot({
    x: p.x + c * 20, y: p.y + s * 20, z: 38 + p.z, vx: c * speed, vy: s * speed, life: range / speed,
    r: o.r || 8, maxHits: o.maxHits || 1, rgb: o.rgb || LYRA_RGB, core: LYRA_CORE, len: o.len || 26, w: o.w || 2,
  });
  shot.dmg = o.dmg * bonus;
  shot.info = o;
  shot.hit = o.hit === null ? null : (o.hit || ((e, sh) => lyraHitEnemy(p, e, sh.dmg, sh.angle, sh.info)));
  if (o.end) shot.end = o.end;
  return HeroObjects.add(shot);
}

// ---------------------------------------------------------------------------
// EXPLOSÕES (Flecha Explosiva, armadilhas, minas, isca): Carga Volátil aumenta o raio e
// arremessa; Estilhaços espalha fragmentos; armadilhas aplicam Fio de Tropeço e Rastreadora
// ---------------------------------------------------------------------------
function lyraBlast(p, x, y, R, dmg, o = {}) {
  const H = p.hero, M = H.mods;
  R *= 1 + M.blastR;
  const kb = M.blastKb ? 640 : 330, launch = M.blastKb ? 330 : 140;
  heroInRadius(x, y, R, (e, d, kx, ky) => {
    let k = dmg * (1 - 0.35 * Math.min(1, d / R)) * rand(0.94, 1.06) * p.targetMult(e);
    if (M.mark && e._lyraMark > 0) k *= 1 + M.mark;
    const crit = !!o.canCrit && (H.focus > 0 || Math.random() < p.stats.crit);
    if (crit) k *= 2;
    k *= e.vulnerable || 1;
    if (heroStrike(e, k, crit, LYRA_BLAST_DEF, kx, ky, { kb, launch, stun: 0.6, heavy: true })) {
      if (o.trap) { if (M.slowK) heroSlow(e, M.slowK, M.slowT); if (M.mark) lyraMark(e); }
    }
  });
  lyraFight(p);
  if (M.shards && !o.noShards) {
    const n = M.shards, a0 = rand(0, TAU), sd = M.shardDmg * p.stats.power;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * TAU;
      HeroObjects.add(new HeroShot({
        x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10, z: 22, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: 0.3,
        r: 5, style: 'shard', len: 12, w: 1.4, rgb: LYRA_RGB, core: LYRA_CORE,
        hit: (e, sh) => lyraHitEnemy(p, e, sd, sh.angle, { canCrit: false, def: LYRA_SKILL_DEF, kb: 120, stun: 0.2 }),
      }));
    }
  }
  const P_ = game.particles;
  P_.ring(x, y, R, LYRA_RGB, 0.45, 10);
  P_.ring(x, y, R * 0.6, LYRA_CORE, 0.3, 5);
  P_.flash(x, y, 20, R * 1.1, LYRA_HI, 0.2);
  P_.sparks(x, y, 18, rand(0, TAU), 14, LYRA_HI, 460, Math.PI);
  P_.debris(x, y, 8);
  P_.dust(x, y, 10, 12, 160);
  P_.embers(x, y, 10, 12, LYRA_RGB, R * 0.5, 120);
  game.arcs.crackle(x, y, 16, 4, R * 0.7, LYRA_HI, 0.16);
  game.camera.shake(o.small ? 0.16 : 0.3);
  game.audio.play('explosion', o.small ? 0.5 : 0.8);
  game.room.addScorch(x, y, R * 0.55);
}

// Pulso eletromagnético: atordoa as máquinas no raio
function lyraPulse(p, x, y, R, dur) {
  let n = 0;
  heroInRadius(x, y, R, (e) => {
    if (heroStunMachine(e, dur)) {
      n++;
      game.arcs.spawn(x, y, 24, e.x, e.y, Math.min(e.height * 0.5, 40) + e.z, { w: 1.6, life: 0.2, rgb: LYRA_HI });
      game.arcs.crackle(e.x, e.y, Math.min(e.height * 0.5, 40) + e.z, 3, e.radius * 1.6, '190,160,255', 0.25);
      game.texts.spawn(e.x, e.y, (e.height || 40) + 22, 'SISTEMA DESLIGADO', '#d9b8ff', 12, 0.9);
    }
  });
  const P_ = game.particles;
  P_.ring(x, y, R, '150,190,255', 0.5, 10);
  P_.ring(x, y, R * 0.7, LYRA_HI, 0.4, 6);
  P_.flash(x, y, 20, R, '170,190,255', 0.2);
  game.arcs.crackle(x, y, 20, 8, R, '170,190,255', 0.22);
  game.audio.play('zap'); game.audio.play('thunder', 0.35);
  game.glitch(0.08);
  return n;
}

// ---------------------------------------------------------------------------
// OBJETOS DA LYRA NO MUNDO
// ---------------------------------------------------------------------------
// Mina de plasma (Armadilha de Plasma) ou mina pequena (Campo Minado)
class LyraMine {
  constructor(p, x, y, R, dmg, small, life) {
    this.p = p; this.x = x; this.y = y; this.R = R; this.dmg = dmg; this.small = small;
    this.life = life; this.t = 0; this.arm = small ? 0.25 : 0.4; this.trig = small ? 24 : 32;
    this.dead = false; this.pending = 0; this.mine = true;
  }
  update(dt) {
    if (this.dead) return false;
    this.t += dt;
    if (this.pending > 0) { this.pending -= dt; if (this.pending <= 0) this.detonate(true); return !this.dead; }
    if (this.life !== Infinity) { this.life -= dt; if (this.life <= 0) { this.fizzle(); return false; } }
    if (this.t < this.arm) return true;
    for (const e of game.enemies) {
      if (!e.canBeHit() || e.z > 20) continue;
      const rr = this.trig + e.radius;
      if (dist2(this.x, this.y, e.x, e.y) < rr * rr) { this.detonate(false); return false; }
    }
    return true;
  }
  // Explode; com Reação em Cadeia, as outras minas no alcance explodem em seguida (+dano)
  detonate(chained) {
    if (this.dead) return;
    this.dead = true;
    const M = this.p.hero.mods;
    lyraBlast(this.p, this.x, this.y, this.R, this.dmg * (chained ? 1 + M.chainB : 1), { trap: true, small: this.small });
    if (!M.chainR) return;
    for (const o of HeroObjects.list) {
      if (!o.mine || o.dead || o.pending > 0) continue;
      const d = dist(this.x, this.y, o.x, o.y);
      if (d <= M.chainR) {
        o.pending = 0.1 + d / 2200;
        game.arcs.spawn(this.x, this.y, 6, o.x, o.y, 6, { w: 1.8, life: 0.2, rgb: LYRA_HI });
      }
    }
  }
  fizzle() {
    this.dead = true;
    game.particles.smoke(this.x, this.y, 4, 5, '40,26,60', 10);
    game.particles.flash(this.x, this.y, 4, 22, LYRA_RGB, 0.12);
  }
  light(L) { L.add(isoX(this.x, this.y), isoY(this.x, this.y), this.small ? 50 : 80, 0.4); }
  draw(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), t = this.t;
    const armed = this.t >= this.arm, pulse = 0.5 + 0.5 * Math.sin(t * (armed ? 9 : 22));
    const r = this.small ? 9 : 13;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    GlowCache.drawFlat(ctx, LYRA_RGB, sx, sy, r * 3.2, 0.35 + 0.25 * pulse);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba(LYRA_HI, 0.55 + 0.4 * pulse); ctx.lineWidth = 1.6;
    isoCirclePath(ctx, this.x, this.y, r); ctx.stroke();
    if (!this.small) {
      // Fio do gatilho: anel tracejado girando no alcance do contato
      ctx.setLineDash([5, 7]); ctx.lineDashOffset = -t * 30;
      ctx.strokeStyle = rgba(LYRA_RGB, 0.35 + 0.2 * pulse); ctx.lineWidth = 1;
      isoCirclePath(ctx, this.x, this.y, this.trig + 6); ctx.stroke();
      ctx.setLineDash([]);
    }
    GlowCache.draw(ctx, LYRA_CORE, sx, sy - 3, 6 + 3 * pulse, armed ? 0.9 : 0.5);
    ctx.restore();
  }
}

// Isca de Sucata: drone desmontado que chia e atrai os inimigos; explode no fim ou ao ser destruído
class LyraDecoy {
  constructor(p, x0, y0, x1, y1, lv) {
    this.p = p; this.x0 = x0; this.y0 = y0; this.tx = x1; this.ty = y1;
    this.x = x0; this.y = y0; this.z = 40; this.vx = 0; this.vy = 0; this.radius = 10; this.state = 'idle';
    this.t = 0; this.flight = 0.38; this.life = 3 + 2 * lv; this.maxLife = this.life; this.hp = 50 + 25 * lv;
    this.dmg = (30 + 20 * lv) * p.stats.power; this.lure = false; this.lureR = 380; this.dead = false;
  }
  update(dt) {
    if (this.dead) return false;
    this.t += dt;
    if (this.t < this.flight) {
      const k = this.t / this.flight;
      this.x = lerp(this.x0, this.tx, k); this.y = lerp(this.y0, this.ty, k); this.z = 40 * (1 - k) + Math.sin(k * Math.PI) * 50;
      return true;
    }
    if (!this.lure) {
      this.lure = true; this.z = 0; this.x = this.tx; this.y = this.ty;
      game.particles.dust(this.x, this.y, 6, 8, 70);
      game.particles.ring(this.x, this.y, 40, LYRA_RGB, 0.3, 4);
      game.audio.play('door', 0.4);
    }
    this.life -= dt;
    // Inimigos encostados na isca a destroem
    let n = 0;
    for (const e of game.enemies) if (e.canBeHit() && dist2(this.x, this.y, e.x, e.y) < (e.radius + 28) * (e.radius + 28)) n++;
    this.hp -= n * 30 * dt;
    if (Math.random() < dt * 7) game.arcs.crackle(this.x, this.y, 10, 1, 16, LYRA_HI, 0.08);
    if (Math.random() < dt * 1.6) game.audio.play('type', 0.35);   // o chiado
    if (this.life <= 0 || this.hp <= 0) { this.explode(); return false; }
    return true;
  }
  explode() {
    this.dead = true; this.lure = false;
    lyraBlast(this.p, this.x, this.y, 110, this.dmg, {});
  }
  light(L) { L.add(isoX(this.x, this.y), isoY(this.x, this.y) - this.z - 10, 90, 0.5); }
  draw(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y) - this.z, t = this.t;
    ctx.save();
    // Corpo do drone (sucata escura com o núcleo violeta piscando)
    ctx.fillStyle = '#16121e';
    ctx.beginPath(); ctx.ellipse(sx, sy - 7, 9, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a304a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx - 12, sy - 4); ctx.lineTo(sx - 5, sy - 8); ctx.moveTo(sx + 12, sy - 3); ctx.lineTo(sx + 5, sy - 8); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    const blink = Math.floor(t * 8) % 2 ? 1 : 0.4;
    GlowCache.draw(ctx, LYRA_RGB, sx, sy - 8, 14, 0.8 * blink);
    if (this.lure) {
      // Ondas do chiado (atração)
      ctx.globalAlpha = 1;
      for (let i = 0; i < 2; i++) {
        const k = (t * 1.2 + i * 0.5) % 1;
        ctx.strokeStyle = rgba(LYRA_HI, 0.5 * (1 - k)); ctx.lineWidth = 1.4;
        isoCirclePath(ctx, this.x, this.y, 18 + k * 60); ctx.stroke();
      }
      const k = clamp(this.life / this.maxLife, 0, 1);
      ctx.fillStyle = rgba(LYRA_HI, 0.8); ctx.fillRect(sx - 12, sy - 22, 24 * k, 2);
    }
    ctx.restore();
  }
}

// Chuva de Fótons: flechas caindo numa área ao longo de 2 s
class LyraRain {
  constructor(p, cx, cy, n, dmg) {
    this.p = p; this.cx = cx; this.cy = cy; this.n = n; this.dmg = dmg; this.R = 160;
    this.t = 0; this.dur = 2; this.spawned = 0; this.drops = [];
  }
  update(dt) {
    this.t += dt;
    while (this.spawned < this.n && this.t >= 0.25 + (this.spawned / this.n) * (this.dur - 0.25)) {
      const a = rand(0, TAU), r = Math.sqrt(Math.random()) * this.R;
      let x = this.cx + Math.cos(a) * r, y = this.cy + Math.sin(a) * r;
      // mira de leve nos inimigos dentro da área
      const e = heroNearest(x, y, 90);
      if (e && dist(e.x, e.y, this.cx, this.cy) < this.R + 20) { x = lerp(x, e.x, 0.7); y = lerp(y, e.y, 0.7); }
      this.drops.push({ x, y, t: 0, fall: 0.22, hit: false });
      this.spawned++;
    }
    for (const d of this.drops) {
      d.t += dt;
      if (!d.hit && d.t >= d.fall) { d.hit = true; this.impact(d); }
    }
    this.drops = this.drops.filter((d) => d.t < d.fall + 0.3);
    return this.spawned < this.n || this.drops.length > 0;
  }
  impact(d) {
    const p = this.p;
    heroInRadius(d.x, d.y, 36, (e) => lyraHitEnemy(p, e, this.dmg, Math.atan2(e.y - d.y, e.x - d.x) || 0, { def: LYRA_SKILL_DEF, kb: 140, stun: 0.35 }));
    game.particles.flash(d.x, d.y, 6, 30, LYRA_HI, 0.12);
    game.particles.sparks(d.x, d.y, 4, -Math.PI / 2, 6, LYRA_HI, 260, Math.PI);
    game.particles.ring(d.x, d.y, 28, LYRA_RGB, 0.25, 3);
    game.audio.play('hit', 0.4);
  }
  light(L) { L.add(isoX(this.cx, this.cy), isoY(this.cx, this.cy), 150, 0.35); }
  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const a = Math.min(1, this.t * 4) * (this.spawned < this.n ? 1 : 0.5);
    ctx.strokeStyle = rgba(LYRA_RGB, 0.35 * a); ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 10]); ctx.lineDashOffset = this.t * 40;
    isoCirclePath(ctx, this.cx, this.cy, this.R); ctx.stroke();
    ctx.setLineDash([]);
    for (const d of this.drops) {
      const sx = isoX(d.x, d.y), sy = isoY(d.x, d.y);
      if (d.t < d.fall) {
        const k = d.t / d.fall, z = 260 * (1 - k);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = rgba(LYRA_HI, 0.85); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, sy - z - 30); ctx.lineTo(sx, sy - z); ctx.stroke();
        GlowCache.draw(ctx, LYRA_RGB, sx, sy - z, 12, 0.8);
        ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = rgba(LYRA_RGB, 0.6); ctx.lineWidth = 1;
        isoCirclePath(ctx, d.x, d.y, 14 * (1 - k) + 6); ctx.stroke();
      } else GlowCache.drawFlat(ctx, LYRA_RGB, sx, sy, 30, 0.6 * (1 - (d.t - d.fall) / 0.3));
    }
    ctx.restore();
  }
}

// Cabo do Gancho: da Lyra até o ponto de ancoragem enquanto ela é puxada
class LyraCable {
  constructor(p, x, y, life) { this.p = p; this.x = x; this.y = y; this.life = life; }
  update(dt) { this.life -= dt; return this.life > 0; }
  draw(ctx) {
    const p = this.p, ax = isoX(this.x, this.y), ay = isoY(this.x, this.y) - 30;
    const px = isoX(p.x, p.y), py = isoY(p.x, p.y) - p.z - 40;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(LYRA_RGB, 0.55); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.strokeStyle = rgba(LYRA_CORE, 0.95); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ax, ay); ctx.stroke();
    GlowCache.draw(ctx, LYRA_RGB, ax, ay, 18, 0.9);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// AÇÕES: o que cada golpe faz ao soltar a corda (início da fase ativa)
// ---------------------------------------------------------------------------
function lyraRelease(p, a) {
  const d = a.def, S = p.stats, H = p.hero, dir = a.dir, pw = S.power;
  const base = (dmg) => dmg * S.dmgMult * (d.heavyType ? S.heavyMult : 1) * (d.light ? S.lightMult : 1);
  const kick = (k) => { p.vx -= Math.cos(dir) * k; p.vy -= Math.sin(dir) * k; };   // recuo do arco
  game.audio.play(d.sound || 'thrust');
  switch (a.id) {
    case 'l1': case 'l2': case 'heavy':
      lyraShot(p, a, { angle: dir, dmg: base(d.dmg), speed: d.speed, range: d.range, kb: d.kb, stun: d.stun, heavy: !!d.heavy, w: d.heavy ? 2.6 : 2, len: d.heavy ? 34 : 26, def: d.heavy ? LYRA_HEAVY_DEF : LYRA_SHOT_DEF });
      kick(d.heavy ? 90 : 40);
      break;
    case 'l3':
      for (let i = 0; i < d.count; i++) lyraShot(p, a, { angle: dir + (i - (d.count - 1) / 2) * d.spread, dmg: base(d.dmg), speed: d.speed, range: d.range, kb: d.kb, stun: d.stun, def: LYRA_SHOT_DEF });
      kick(60);
      break;
    case 'charged': {
      // Tiro Preciso: dano pela carga, dano crítico maior e marca da Rastreadora
      const lv = Math.max(1, lyraLv(p, 'lyra_tiro_preciso')), k = clamp(a.charge, 0, 1);
      const full = (45 + 15 * lv) * S.dmgMult * S.heavyMult;
      lyraShot(p, a, { angle: dir, dmg: full * (0.35 + 0.65 * k), speed: d.speed, range: d.range, kb: d.kb * (0.5 + 0.5 * k), stun: d.stun * (0.5 + 0.5 * k), heavy: true, launch: k >= 0.99 ? 220 : 0,
        critBonus: 0.5 + 0.1 * lv, mark: true, w: 2.4 + k * 1.6, len: 40 + k * 20, r: 8, def: k >= 0.99 ? LYRA_CHARGED_DEF : LYRA_HEAVY_DEF });
      kick(140 * (0.4 + k));
      game.camera.shake(0.12 + 0.2 * k);
      if (k >= 0.99) { game.particles.ring(p.x, p.y, 70, LYRA_HI, 0.3, 5); game.camera.zoomPunch(0.03); }
      break;
    }
    case 'pierce': {
      // Flecha Perfurante: atravessa até 1 + 2·nível inimigos em linha (+30% no nível 2)
      const l = Math.max(1, lyraLv(p, 'lyra_flecha_perfurante'));
      lyraShot(p, a, { angle: dir, dmg: base(d.dmg) * (l >= 2 ? 1.3 : 1), speed: d.speed, range: d.range, kb: d.kb, stun: d.stun, heavy: true, maxHits: 1 + 2 * l, w: 2.6, len: 38, def: LYRA_HEAVY_DEF });
      kick(90);
      break;
    }
    case 'back': {
      // Salto Recuado: flecha rápida durante o salto (atordoa no nível 2)
      const l = Math.max(1, lyraLv(p, 'lyra_salto_recuado'));
      lyraShot(p, a, { angle: dir, dmg: (25 + 15 * l) * S.dmgMult, speed: d.speed, range: d.range, kb: d.kb, stun: d.stun, stunFix: l >= 2 ? 0.5 : 0, def: LYRA_SHOT_DEF });
      break;
    }
    case 'rajada': {
      const l = Math.max(1, lyraLv(p, 'lyra_rajada')), n = l >= 3 ? 5 : 3;
      for (let i = 0; i < n; i++) lyraShot(p, a, { angle: dir + (i - (n - 1) / 2) * 0.17, dmg: (20 + 8 * l) * pw, speed: d.speed, range: d.range, kb: d.kb, stun: d.stun, def: LYRA_SKILL_DEF });
      kick(70);
      break;
    }
    case 'explosiva': {
      const l = Math.max(1, lyraLv(p, 'lyra_flecha_explosiva'));
      // A flecha não fere sozinha: explode no impacto (inimigo, parede ou fim do alcance)
      const R = 95 + 15 * l;
      lyraShot(p, a, { angle: dir, dmg: (50 + 20 * l) * pw, speed: d.speed, range: d.range, w: 3, len: 30, r: 8, rgb: '200,110,255', hit: null,
        end: (sh) => lyraBlast(p, sh.x, sh.y, R, sh.dmg, { canCrit: true }) });
      break;
    }
    case 'pulso': {
      const l = Math.max(1, lyraLv(p, 'lyra_flecha_pulso'));
      lyraShot(p, a, { angle: dir, dmg: 0, speed: d.speed, range: d.range, w: 2.4, len: 30, r: 8, rgb: '150,170,255', hit: null,
        end: (sh) => lyraPulse(p, sh.x, sh.y, 120 + 20 * l, 1 + l) });
      break;
    }
    case 'chuva': {
      const l = Math.max(1, lyraLv(p, 'lyra_chuva_fotons'));
      let cx = p.x + Math.cos(dir) * 220, cy = p.y + Math.sin(dir) * 220;
      const e = heroNearest(cx, cy, 260);
      if (e) { cx = e.x; cy = e.y; }
      HeroObjects.add(new LyraRain(p, cx, cy, 6 + 2 * l, (24 + 10 * l) * pw));
      // Flechas subindo do arco
      for (let i = 0; i < 4; i++) game.particles.emit(P.SPARK, p.x + Math.cos(dir) * 14, p.y + Math.sin(dir) * 14, 50, rand(-30, 30), rand(-30, 30), 520, 0.4, 2.2, LYRA_HI, -200, 0);
      game.audio.play('zap', 0.6);
      break;
    }
    case 'armadilha': {
      const l = Math.max(1, lyraLv(p, 'lyra_armadilha_plasma')), max = 1 + l;
      const mines = HeroObjects.list.filter((o) => o.mine && !o.small && !o.dead);
      if (mines.length >= max) mines[0].fizzle();   // a mais antiga se desfaz
      const x = p.x + Math.cos(dir) * 16, y = p.y + Math.sin(dir) * 16;
      HeroObjects.add(new LyraMine(p, x, y, 60 + 10 * l, (55 + 25 * l) * pw, false, Infinity));
      game.particles.ring(x, y, 34, LYRA_RGB, 0.3, 4);
      game.particles.sparks(x, y, 4, -Math.PI / 2, 8, LYRA_HI, 200, Math.PI);
      break;
    }
    case 'isca': {
      const l = Math.max(1, lyraLv(p, 'lyra_isca'));
      let dd = 160;
      while (dd > 30 && !game.room.canStand(p.x + Math.cos(dir) * dd, p.y + Math.sin(dir) * dd, 12)) dd -= 10;
      HeroObjects.add(new LyraDecoy(p, p.x + Math.cos(dir) * 14, p.y + Math.sin(dir) * 14, p.x + Math.cos(dir) * dd, p.y + Math.sin(dir) * dd, l));
      break;
    }
    case 'gancho': {
      HeroObjects.add(new LyraCable(p, a.hx, a.hy, d.active + 0.05));
      p.invuln = Math.max(p.invuln, d.active + 0.08);
      game.particles.flash(a.hx, a.hy, 30, 40, LYRA_HI, 0.15);
      break;
    }
    case 'foco': {
      // Foco de Batalha: o mundo desacelera (a Lyra continua no tempo real) e todo disparo é crítico
      const l = Math.max(1, lyraLv(p, 'lyra_foco_batalha')), dur = 3 + 0.5 * (l - 1);
      H.focus = dur;
      game.slowMo(0.4, dur);
      game.flashScreen(LYRA_HI, 0.35);
      game.glitch(0.2);
      game.camera.zoomPunch(0.06);
      game.particles.ring(p.x, p.y, 160, LYRA_RGB, 0.6, 10);
      game.particles.ring(p.x, p.y, 90, LYRA_CORE, 0.4, 6);
      game.audio.play('special', 0.7);
      break;
    }
  }
  // Brilho do arco ao soltar
  if (!d.noHit && a.id !== 'armadilha' && a.id !== 'isca' && a.id !== 'gancho') {
    const bx = p.x + Math.cos(dir) * 18, by = p.y + Math.sin(dir) * 18;
    game.particles.flash(bx, by, 40 + p.z, 26, LYRA_HI, 0.1);
  }
}

// ---------------------------------------------------------------------------
// O KIT
// ---------------------------------------------------------------------------
const LYRA_KIT = registerHeroKit({
  id: 'lyra',
  rgb: LYRA_RGB, glowRgb: '104,46,196',   // glowRgb: brilho no chão em volta dela (mais escuro que a cor-tema)
  ult: 'lyra_foco_batalha', ultIcon: 'focus', ultLabel: 'FOCO',
  attacks: LYRA_ATTACKS,

  init(p) {
    p.hero = {
      mods: Object.assign({}, LYRA_MODS0), calm: 0, camo: false, focus: 0, hookT: 0, hookBonus: 0, coldT: 0, coldCd: 0,
    };
    // Leve · Leve · Leve = Disparo Duplo; Leve · Leve · Pesado = Flecha Perfurante (técnica);
    // Esquiva → Leve = Salto Recuado (técnica)
    p.combo = new HeroCombo({ L: 'l1', LL: 'l2', LLL: 'l3', LLH: 'pierce', H: 'heavy' }, { L: 'back' },
      { pierce: 'lyra_flecha_perfurante', back: 'lyra_salto_recuado' }, () => PartyProgress.of('lyra'));
  },

  // ---------------------------------------------------- passivas → atributos
  passives(p, S, pr) {
    const H = p.hero, M = H.mods, lv = (id) => pr.lv(id);
    Object.assign(M, LYRA_MODS0);
    let l;
    if ((l = lv('lyra_mira_sucata'))) { S.crit += 0.05 * l; M.range = 0.1 * l; }
    if ((l = lv('lyra_ponto_cego'))) M.blind = 0.15 * l;
    if ((l = lv('lyra_folego'))) { M.chargeArmor = 0.15 * l; S.chargeSpeed += 0.1 * l; }
    if ((l = lv('lyra_fio_tropeco'))) { M.slowK = 0.3 + 0.2 * l; M.slowT = 1 + l; }
    if ((l = lv('lyra_rastreadora'))) M.mark = 0.1 * l;
    if ((l = lv('lyra_reacao'))) { M.chainR = 180 + 60 * l; M.chainB = 0.2 * l; }
    if ((l = lv('lyra_campo_minado'))) { M.mini = 30 + 20 * l; M.miniT = 4 + 2 * l; }
    if ((l = lv('lyra_carga_volatil'))) { M.blastR = 0.1 * l; M.blastKb = 1; }
    if ((l = lv('lyra_estilhacos'))) { M.shards = 2 + 2 * l; M.shardDmg = 12 + 6 * l; }
    if ((l = lv('lyra_passos_leves'))) { S.dashCdMult *= 1 - 0.1 * l; S.speedMult += 0.05 * l; }
    if ((l = lv('lyra_fora_da_rede'))) M.camo = l;
    if ((l = lv('lyra_sangue_frio'))) { M.cold = l; if (H.coldT > 0) { S.speedMult += 0.15 * l; S.crit += 0.1 * l; } }
    if ((l = lv('lyra_atalhos'))) { S.dashCharges += l; S.dashMult += 0.2 * l; }
  },

  // ---------------------------------------------------- efeitos por quadro
  update(p, dt) {
    const H = p.hero, M = H.mods;
    const edt = H.focus > 0 ? dt * game.timeScale : dt;   // tempo dos inimigos (mais lento no Foco)
    if (H.focus > 0) {
      H.focus = Math.max(0, H.focus - dt);
      if (Math.random() < dt * 14) game.particles.emit(P.WISP, p.x + rand(-26, 26), p.y + rand(-26, 26), rand(10, 60), 0, 0, 40, 0.5, 2, LYRA_HI, -40, 1);
    }
    if (H.hookT > 0) H.hookT -= dt;
    if (H.coldCd > 0) H.coldCd -= dt;
    if (H.coldT > 0) { H.coldT -= dt; if (H.coldT <= 0) { H.coldT = 0; p.recalc(); } }
    // Onde a Rede Não Olha: depois de 3 s sem lutar, a camuflagem
    if (M.camo && p.state !== 'dead') {
      if (p.state !== 'attack' && p.state !== 'charge') H.calm += dt;
      if (!H.camo && H.calm >= 3) {
        H.camo = true;
        game.particles.ring(p.x, p.y, 40, LYRA_RGB, 0.35, 4);
        game.texts.spawn(p.x, p.y, 70, 'CAMUFLADA', '#d9b8ff', 13, 0.9);
      }
    } else { H.camo = false; H.calm = 0; }
    // ...os inimigos demoram mais para atacar (a recarga de ataque deles corre mais devagar)
    if (H.camo) {
      const k = 1 - 1 / (1 + 0.3 * M.camo);
      for (const e of game.enemies) if (e.attackCd > 0 && !e.isBoss) e.attackCd += edt * e.aggro * k;
    }
    for (const e of game.enemies) if (e._lyraMark > 0) e._lyraMark -= edt;
    heroUpdateSlows(edt);
  },
  timeStep(p, dt, sdt) { return p.hero.focus > 0 ? dt : sdt; },

  damageTakenMult(p) { return p.state === 'charge' ? 1 - p.hero.mods.chargeArmor : 1; },
  onHurt(p) {
    const H = p.hero, M = H.mods;
    lyraFight(p);
    // Sangue-Frio: abaixo de 35% de vida, velocidade e crítico por 5 s (uma vez a cada 30 s)
    if (M.cold && H.coldCd <= 0 && p.hp / p.maxHp < 0.35) {
      H.coldT = 5; H.coldCd = 30;
      p.recalc();
      game.hud.comboName('SANGUE-FRIO');
      game.particles.ring(p.x, p.y, 70, '255,90,150', 0.4, 6);
      game.audio.play('chargeTier', 2);
    }
  },
  // Campo Minado: cada esquiva deixa uma mina pequena para trás
  onDash(p) {
    const M = p.hero.mods;
    if (!M.mini) return;
    HeroObjects.add(new LyraMine(p, p.x, p.y, 55, M.mini * p.stats.power, true, M.miniT));
  },
  // Foco de Batalha nível 3: cada abate devolve 10 de energia
  onKill(p) {
    if (p.hero.focus > 0 && lyraLv(p, 'lyra_foco_batalha') >= 3) {
      p.gainEnergy(10);
      game.texts.spawn(p.x, p.y, 74, '+10 ENERGIA', '#d9b8ff', 12, 0.8);
    }
  },

  // ---------------------------------------------------- suprema (tecla I)
  canUltimate(p) { return this.ultLevel(p) > 0 && p.fury >= p.ultCost() && !(p.hero.focus > 0); },
  startUltimate(p) {
    p.fury = Math.max(0, p.fury - p.ultCost());
    p.combo.reset();
    p.invuln = Math.max(p.invuln, 0.5);
    this.startAttack(p, 'foco', null, 0);
    game.hud.comboName('FOCO DE BATALHA', true);
  },

  // ---------------------------------------------------- habilidades dos atalhos
  abilities: {
    lyra_rajada: { type: 'attack', cast: (p, lv, wd) => { LYRA_KIT.startAttack(p, 'rajada', wd); return true; } },
    lyra_armadilha_plasma: { type: 'attack', cast: (p, lv, wd) => { LYRA_KIT.startAttack(p, 'armadilha', wd); return true; } },
    lyra_isca: { type: 'attack', cast: (p, lv, wd) => { LYRA_KIT.startAttack(p, 'isca', wd); return true; } },
    lyra_flecha_explosiva: { type: 'attack', cast: (p, lv, wd) => { LYRA_KIT.startAttack(p, 'explosiva', wd); return true; } },
    lyra_flecha_pulso: { type: 'attack', cast: (p, lv, wd) => { LYRA_KIT.startAttack(p, 'pulso', wd); return true; } },
    lyra_chuva_fotons: { type: 'attack', cast: (p, lv, wd) => { LYRA_KIT.startAttack(p, 'chuva', wd); return true; } },
    lyra_gancho: { type: 'attack', cast: (p, lv, wd) => {
      // Gancho de Cabo: se puxa até 260 + 60·nível na direção do movimento
      const a = wd ? Math.atan2(wd.y, wd.x) : p.facing, room = game.room;
      let d = 260 + 60 * lv;
      while (d > 40 && !room.canStand(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, p.radius)) d -= 10;
      if (d <= 40) { game.hud.toast('Sem espaço para o gancho'); game.audio.play('uiDeny'); return false; }
      LYRA_ATTACKS.gancho.active = d / LYRA_ATTACKS.gancho.pull;
      p.facing = a;
      LYRA_KIT.startAttack(p, 'gancho', null);
      p.attack.dir = a; p.attack.hx = p.x + Math.cos(a) * d; p.attack.hy = p.y + Math.sin(a) * d;
      p.hero.hookLv = lv;
      return true;
    } },
  },

  // ---------------------------------------------------- golpes
  startAttack(p, id, wd, charge = 0) {
    const d = LYRA_ATTACKS[id];
    if (!d) return;
    const H = p.hero, prev = lyraPoseInfo(p);   // pose anterior: o golpe seguinte emenda sem tranco
    const dir = d.aim === false ? (wd ? Math.atan2(wd.y, wd.x) : p.facing) : heroAim(p, wd, (d.range || 480) * (1 + H.mods.range), 0.75, d.speed || 0);
    p.facing = dir;
    if (p.attack && p.attack.trail) p.attack.trail.release();
    const a = p.attack || (p.attack = { hits: new Map(), counts: new Map() });
    a.id = id; a.def = d; a.t = 0; a.dir = dir;
    a.hits.clear(); a.counts.clear();
    a.trail = null; a.started = false; a.charge = charge; a.mult = 1;
    a.w0 = prev ? prev.W : 0; a.d0 = p.state === 'charge' ? 1 : 0;
    a.camo = H.camo;   // o primeiro disparo saindo da camuflagem
    lyraFight(p);
    p.state = 'attack'; p.stateTime = 0;
    p.vx *= 0.2; p.vy *= 0.2;
    if (!d.hop) p.z = 0;
    let name = d.name;
    if (id === 'charged') name = charge >= 0.99 ? 'TIRO PRECISO' : charge >= 0.45 ? 'DISPARO CARREGADO' : null;
    if (name && id !== 'foco') { game.hud.comboName(name); game.audio.play('comboName'); }
  },

  updateAttack(p, dt, input, wd) {
    const a = p.attack, d = a.def, prevT = a.t;
    a.t += dt;
    const tW = d.windup, tA = tW + d.active, tEnd = tA + d.recovery;
    // Mira livre durante a preparação (com assistência)
    // (sem direção pressionada, segue o alvo escolhido ao começar o golpe)
    if (a.t < tW && d.aim !== false && (wd || d.speed)) { a.dir = heroAim(p, wd, (d.range || 480) * (1 + p.hero.mods.range), 0.75, d.speed || 0); p.facing = a.dir; }
    // Pesado segurado: com o Tiro Preciso aprendido, o fim da preparação vira carga
    if (d.chargeable && prevT < tW && a.t >= tW && input.held.heavy && lyraLv(p, 'lyra_tiro_preciso') > 0) { p.z = 0; p.enterCharge(); return; }
    // Movimento do golpe: salto para trás, puxada do cabo ou freio
    if (d.backstep && a.t < tA + 0.06) {
      const k = 1 - clamp(a.t / (tA + 0.06), 0, 1);
      p.vx = -Math.cos(a.dir) * d.backstep * (0.3 + 0.7 * k); p.vy = -Math.sin(a.dir) * d.backstep * (0.3 + 0.7 * k);
    } else if (d.pull && a.t >= tW && a.t < tA) {
      p.vx = Math.cos(a.dir) * d.pull; p.vy = Math.sin(a.dir) * d.pull;
      if (dist2(p.x, p.y, a.hx, a.hy) < 24 * 24) a.t = tA;   // chegou
      p.ghostTimer -= dt;
      if (p.ghostTimer <= 0) { p.ghostTimer = 0.03; const g = p.ghosts.find((q) => q.life <= 0) || p.ghosts[0]; g.x = p.x; g.y = p.y; g.f = p.facing; g.life = 0.22; }
    } else {
      const k = Math.exp(-14 * dt);
      p.vx *= k; p.vy *= k;
    }
    if (d.pull && prevT < tA && a.t >= tA) {
      // Fim do gancho: a próxima flecha em 2 s causa mais dano
      p.vx *= 0.25; p.vy *= 0.25;
      p.hero.hookT = 2; p.hero.hookBonus = 0.3 * (p.hero.hookLv || 1);
      game.particles.ring(p.x, p.y, 40, LYRA_RGB, 0.3, 4);
    }
    if (d.hop) { const T = tA + d.recovery * 0.55; p.z = a.t < T ? d.hop * Math.sin(Math.PI * clamp(a.t / T, 0, 1)) : 0; }
    // Soltar a corda no início da fase ativa
    if (!a.started && a.t >= tW) { a.started = true; lyraRelease(p, a); }
    // Encadeamento, como no Kael: suprema, atalho ou o próximo golpe do combo
    const chainAt = tA + d.recovery * d.chainFrac;
    if (a.t >= chainAt) {
      if (p.specialBuffer > 0 && p.canEclipse()) { p.specialBuffer = 0; p.endAttack(); p.z = 0; p.startSpecial(); return; }
      if (p.abBufT > 0 && p.abilityReady(p.abBuffer)) {
        p.abBufT = 0; p.endAttack(); p.z = 0;
        if (p.castAbility(p.abBuffer, wd)) return;
      }
      const b = p.combo.takeBuffer();
      if (b) { p.z = 0; p.startAttack(p.combo.resolve(b), wd); return; }
    }
    // Esquiva cancela a preparação e a recuperação (não a puxada do cabo)
    if (p.dashBuffer > 0 && p.canDash() && !d.pull && (a.t < tW || a.t >= tA)) {
      p.dashBuffer = 0; p.endAttack(); p.z = 0; p.startDash(wd); return;
    }
    if (!d.pull && p.andandoSai(a, d, tA, wd)) { p.z = 0; return; }   // fim da recuperação: andar já sai do golpe
    if (a.t >= tEnd) { p.endAttack(); p.z = 0; p.state = 'idle'; }
  },

  // Carga do Tiro Preciso (Pesado segurado)
  updateCharge(p, dt, input, wd) {
    const full = lyraFullCharge(p);
    p.chargeTime += dt * p.stats.chargeSpeed;
    const lvl = p.chargeTime >= full ? 2 : p.chargeTime >= full * 0.45 ? 1 : 0;
    const bx = p.x + Math.cos(p.facing) * 18, by = p.y + Math.sin(p.facing) * 18;
    if (lvl > p.chargeLevel) {
      p.chargeLevel = lvl;
      game.audio.play('chargeTier', lvl);
      game.particles.flash(bx, by, 42, lvl === 2 ? 60 : 38, lvl === 2 ? LYRA_CORE : LYRA_HI, 0.2);
      game.particles.ring(p.x, p.y, lvl === 2 ? 66 : 46, LYRA_RGB, 0.3, 4);
      if (lvl === 2) game.texts.spawn(p.x, p.y, 80, 'MIRA TRAVADA', '#e6ccff', 13, 0.7);
      game.camera.shake(0.05 * lvl);
      p.flash = 0.04;
    }
    if (Math.random() < 0.5 + lvl * 0.25) game.particles.converge(bx, by, 42, 1, 34 + lvl * 12, lvl === 2 ? LYRA_CORE : LYRA_RGB, 0.3);
    let tvx = 0, tvy = 0;
    if (wd) {
      p.facing = angleLerp(p.facing, Math.atan2(wd.y, wd.x), 1 - Math.exp(-12 * dt));
      tvx = wd.x * p.baseSpeed * 0.3; tvy = wd.y * p.baseSpeed * 0.3;
    }
    p.vx = approach(p.vx, tvx, 1600 * dt);
    p.vy = approach(p.vy, tvy, 1600 * dt);
    if (p.dashBuffer > 0 && p.canDash()) { p.dashBuffer = 0; p.combo.reset(); p.startDash(wd); return; }
    if (!input.held.heavy) {
      p.combo.seq = '';
      this.startAttack(p, 'charged', null, clamp(p.chargeTime / full, 0, 1));
    }
  },

  // ---------------------------------------------------- desenho
  alpha(p) { return p.hero.camo ? 0.42 + 0.08 * Math.sin(p.animTime * 7) : 1; },
  drawAura(p, ctx, t) {
    const H = p.hero, sx = isoX(p.x, p.y), sy = isoY(p.x, p.y);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (H.focus > 0) {
      const a = Math.min(1, H.focus * 2);
      GlowCache.drawFlat(ctx, LYRA_RGB, sx, sy, 150, 0.22 * a);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(LYRA_HI, 0.55 * a); ctx.lineWidth = 1.5;
      ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 50;
      isoCirclePath(ctx, p.x, p.y, 74); ctx.stroke();
      ctx.setLineDash([]);
      GlowCache.draw(ctx, LYRA_HI, sx, sy - p.z - 48, 26, 0.35 * a);
    }
    if (H.camo) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(LYRA_RGB, 0.35 + 0.15 * Math.sin(t * 5)); ctx.lineWidth = 1;
      isoCirclePath(ctx, p.x, p.y, 22); ctx.stroke();
    }
    if (H.coldT > 0) GlowCache.drawFlat(ctx, '255,80,150', sx, sy, 70, 0.25 + 0.1 * Math.sin(t * 9));
    if (H.hookT > 0) GlowCache.draw(ctx, LYRA_CORE, sx + 8, sy - p.z - 44, 10, 0.6);
    ctx.restore();
  },
  // Marcas da Rastreadora e inimigos presos pelo Fio de Tropeço
  drawWorld(p, ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of game.enemies) {
      if (!e.canBeHit()) continue;
      if (e._lyraMark > 0) {
        const sx = isoX(e.x, e.y), sy = isoY(e.x, e.y) - e.z - (e.height || 40) - 16, r = 6 + Math.sin(game.realTime * 6) * 1.2;
        ctx.globalAlpha = Math.min(1, e._lyraMark * 2);
        ctx.strokeStyle = rgba(LYRA_HI, 0.9); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r, sy); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r, sy); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx - r - 4, sy); ctx.lineTo(sx - r - 1, sy); ctx.moveTo(sx + r + 1, sy); ctx.lineTo(sx + r + 4, sy); ctx.stroke();
      }
      if (e._heroSlow) {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = rgba(LYRA_RGB, 0.7); ctx.lineWidth = 1;
        isoCirclePath(ctx, e.x, e.y, e.radius + 4); ctx.stroke();
      }
    }
    ctx.restore();
  },
  hudBuffs(p, B) {
    const H = p.hero;
    if (H.focus > 0) B.push(['focus', H.focus, LYRA_RGB, 'Foco']);
    if (H.camo) B.push(['stealth', 0, LYRA_RGB, 'Camuflada']);
    if (H.coldT > 0) B.push(['heart', H.coldT, '255,90,150', 'Sangue-Frio']);
    if (H.hookT > 0) B.push(['hook', H.hookT, LYRA_RGB, `Flecha +${Math.round(H.hookBonus * 100)}%`]);
  },
  // Lista de técnicas da pausa
  techniques(p) {
    const lv = (id) => lyraLv(p, id), list = [['Leve · Leve', 'Disparos do arco de fóton'], ['Leve · Leve · Leve', 'Disparo Duplo']];
    list.push(lv('lyra_tiro_preciso') ? ['Pesado (segurado)', 'Tiro Preciso'] : ['Pesado', 'Disparo pesado']);
    if (lv('lyra_flecha_perfurante')) list.push(['Leve · Leve · Pesado', 'Flecha Perfurante']);
    if (lv('lyra_salto_recuado')) list.push(['Esquiva → Leve', 'Salto Recuado']);
    if (lv('lyra_foco_batalha')) list.push(['Foco (100 de energia)', 'Foco de Batalha']);
    return list;
  },

  // Sem WebGL: Lyra em 2D (casaco longo, capuz, rabo de cavalo e o arco de energia)
  draw2D(p, ctx, sx, sy, alpha) {
    const f = worldAngleToScreen(p.facing, p.tmp2), fl = Math.hypot(f.x, f.y) || 1;
    const side = f.x / fl >= 0 ? 1 : -1, back = f.y / fl < -0.25;
    const t = p.animTime, moving = p.state === 'run' && p.moveSpeed > 30;
    const run = moving ? Math.sin(t * 13) : 0, bob = moving ? Math.abs(Math.cos(t * 13)) * 2.2 : Math.sin(t * 2.2) * 0.7;
    const I = lyraPoseInfo(p), aim = I && I.W > 0.5 && (I.kind === 'shot' || I.kind === 'hop' || I.kind === 'up' || I.kind === 'cast' || I.kind === 'hook');
    const crouch = I && I.kind === 'trap' ? 7 * I.W : p.state === 'charge' ? 2 : 0;
    const flash = p.flash > 0;
    const C = flash ? { coat: '#fff', dark: '#fff', trim: '#fff', skin: '#fff', hair: '#fff' } : { coat: '#1a1424', dark: '#0d0a14', trim: '#a64dff', skin: '#d8b4a0', hair: '#0c0a12' };
    ctx.save();
    ctx.globalAlpha = alpha * (p.blinking() ? 0.55 : 1);
    if (p.state === 'dead') {
      const k = easeOutCubic(Math.min(1, p.stateTime / 0.6));
      ctx.translate(sx, sy); ctx.rotate(-side * k * 1.45); sx = 0; sy = 0;
    }
    ctx.translate(sx, sy + crouch);
    const y0 = -17 - bob, y1 = -38 - bob;
    // Pernas e botas com luzes violeta
    ctx.fillStyle = C.dark;
    ctx.fillRect(-5 + run * 2, y0 + 2, 4, 15 - crouch * 0.6);
    ctx.fillRect(1 - run * 2, y0 + 2, 4, 15 - crouch * 0.6);
    ctx.fillStyle = C.trim;
    ctx.fillRect(-5 + run * 2, -4, 4, 1); ctx.fillRect(1 - run * 2, -4, 4, 1);
    // Casaco longo com a barra recortada
    const sway = -side * Math.min(1, p.moveSpeed / p.baseSpeed) * 7;
    ctx.fillStyle = back ? C.coat : C.dark;
    ctx.beginPath(); ctx.moveTo(-9, y1 + 3); ctx.lineTo(9, y1 + 3); ctx.lineTo(11 + sway, -6); ctx.lineTo(6 + sway, -2); ctx.lineTo(2 + sway, -7);
    ctx.lineTo(-3 + sway, -2); ctx.lineTo(-8 + sway, -6); ctx.lineTo(-11 + sway, -3); ctx.closePath(); ctx.fill();
    // Tronco
    ctx.fillStyle = C.coat;
    ctx.beginPath(); ctx.moveTo(-8, y1 + 1); ctx.lineTo(8, y1 + 1); ctx.lineTo(6, y0 + 1); ctx.lineTo(-6, y0 + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.trim; ctx.fillRect(-6, y0 - 2, 12, 1.4);
    if (!back) { ctx.fillRect(-1, y1 + 4, 1, y0 - y1 - 6); }
    else { ctx.beginPath(); ctx.moveTo(0, y1 + 8); ctx.lineTo(2.5, y1 + 11); ctx.lineTo(0, y1 + 14); ctx.lineTo(-2.5, y1 + 11); ctx.closePath(); ctx.fill(); }
    // Cabeça, capuz caído e rabo de cavalo
    const hx = side * 0.8, hy = y1 - 7;
    ctx.fillStyle = C.coat; ctx.beginPath(); ctx.ellipse(0, y1 + 1, 8, 3.5, 0, 0, TAU); ctx.fill();
    if (!back) { ctx.fillStyle = C.skin; ctx.beginPath(); ctx.ellipse(hx + side, hy + 1, 4.6, 5.6, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = C.hair;
    ctx.beginPath(); ctx.arc(hx, hy - 1.5, 5.6, Math.PI * (back ? 0 : 0.95), Math.PI * (back ? 2 : 2.05)); ctx.fill();
    const tail = Math.sin(t * 6) * 1.5 - side * Math.min(1, p.moveSpeed / p.baseSpeed) * 5;
    ctx.beginPath(); ctx.moveTo(hx - side * 3, hy - 4); ctx.quadraticCurveTo(hx - side * 9 + tail, hy, hx - side * 7 + tail * 1.5, hy + 11);
    ctx.lineTo(hx - side * 4 + tail, hy + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.trim; ctx.fillRect(hx - side * 4 - 1, hy - 4, 2, 2);
    if (!back && !flash) { ctx.fillStyle = '#c99bff'; ctx.fillRect(hx + side * 2.6 - 0.8, hy + 0.5, 1.6, 1.1); }
    // Arco de energia (mão esquerda) e a corda
    const ax = aim ? side * 17 : side * 9, ay = aim ? y1 + 3 - (I && I.kind === 'up' ? 8 : 0) : y0 - 2;
    const H2 = aim ? 15 : 16, pull = aim ? (I ? I.draw : 0) : 0;
    ctx.strokeStyle = C.coat; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * 7, y1 + 4); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.strokeStyle = flash ? '#fff' : '#2a1f3a'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(ax - side * 3, ay - H2); ctx.quadraticCurveTo(ax + side * 6, ay, ax - side * 3, ay + H2); ctx.stroke();
    const nx = ax - side * (3 + pull * 12);
    if (aim) { ctx.strokeStyle = C.coat; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-side * 6, y1 + 4); ctx.lineTo(nx, ay); ctx.stroke(); }
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(LYRA_HI, 0.9); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax - side * 3, ay - H2); ctx.lineTo(nx, ay); ctx.lineTo(ax - side * 3, ay + H2); ctx.stroke();
    ctx.strokeStyle = rgba(LYRA_RGB, 0.9); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ax - side * 3, ay - H2); ctx.quadraticCurveTo(ax + side * 6, ay, ax - side * 3, ay + H2); ctx.stroke();
    if (aim && I && (I.nocked || p.state === 'charge')) {
      ctx.strokeStyle = rgba(LYRA_CORE, 0.95); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(nx, ay); ctx.lineTo(ax + side * 12, ay); ctx.stroke();
      game.addGlow(ctx, ax + side * 12, ay, 8 + (p.state === 'charge' ? p.chargeLevel * 4 : 0), LYRA_RGB, 0.8);
    }
    game.addGlow(ctx, ax, ay, 10, LYRA_RGB, 0.45);
    ctx.restore();
  },
});

// Pose de arqueira do golpe atual (para o modelo 3D e o desenho 2D):
// { kind, W (peso da pose 0–1), draw (corda puxada 0–1), rel (depois de soltar 0–1), nocked }
function lyraPoseInfo(e) {
  if (!e) return null;
  const st = e.state, num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
  const sm = (x) => x * x * (3 - 2 * x), cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  if (st === 'charge') return { kind: 'shot', W: 1, draw: 1, rel: 0, nocked: true, charge: num(e.chargeLevel) };
  if (st !== 'attack' || !e.attack || !e.attack.def || !e.attack.def.pose) return null;
  const a = e.attack, d = a.def, t = num(a.t), tW = Math.max(0.001, num(d.windup)), tA = tW + num(d.active), rec = Math.max(0.001, num(d.recovery));
  const w0 = num(a.w0);
  let W;
  if (t < tW) W = w0 + (1 - w0) * sm(cl(t / Math.min(tW, 0.09)));
  else if (t <= tA) W = 1;
  else W = 1 - sm(cl(((t - tA) / rec - 0.3) / 0.7));
  const d0 = num(a.d0);
  const draw = t < tW ? d0 + (1 - d0) * sm(cl(t / tW)) : 0;
  const rel = t >= tW ? cl((t - tW) / (num(d.active) + rec * 0.5)) : 0;
  return { kind: d.pose, W, draw, rel, nocked: t < tW, t, tW, tA };
}

// ===========================================================================
// ARCO 3D E POSES DE ARQUEIRA (HERO_WEAPONS.lyra)
// Funciona em qualquer modelo montado sobre o rig do Kael (js/models/kael.js): o
// procedural (MODELS3D.lyra, js/models/lyra.js) e o texturizado (MODELS3D.lyraTex).
//   add(m): cria os nós do arco (lyraBow, cordas lyraStrA/B, flecha lyraArrow) presos ao
//           'body' e as âncoras bowTop/bowBot/bowGrip/arrowTip
//   pose(m, e, o): depois de MODELS3D.kael.pose — esconde a espada, gira o tronco de lado,
//           resolve os braços (IK) para mirar/puxar/soltar, agacha para a armadilha, encolhe
//           as pernas no salto e prende o arco à mão esquerda
//   glows(e, add): halos violeta do arco e da ponta da flecha
// Medidas do rig (precisam ser as mesmas de js/models/kael.js): ombros (0, ±6.7, 10.6) no
// tronco, braço 9.8 + antebraço 9.6, quadril (0, ±3.5, −1), coxa 12.8 + canela 12.2.
// ===========================================================================
(function () {
  // Medidas do rig do Kael; o modelo pode trazer as suas (m.props: o esqueleto montado com as
  // proporções do personagem, como a Lyra importada do Meshy) — lidas no início de cada pose
  let SHY = 6.7, SHZ = 10.6, AUP = 9.8, AFO = 9.6, LTH = 12.8, LSH = 12.2, HIPY = 3.5;
  function medidas(m) {
    const K = m.props;
    SHY = K ? K.SHY : 6.7; SHZ = K ? K.SHZ : 10.6; AUP = K ? K.AUP : 9.8; AFO = K ? K.AFO : 9.6;
    LTH = K ? K.LTH : 12.8; LSH = K ? K.LSH : 12.2; HIPY = K ? K.HIPY : 3.5;
    GRIP[2] = -(AFO + 1.4);                        // o arco na mão, logo depois do punho
  }
  const HB = 21, TIPX = 5.5, ALEN = 30;           // meia altura do arco, curvatura das pontas, flecha
  const GRIP = [0.6, 0, -11.0];                    // empunhadura no referencial do antebraço
  const ONE = [1, 1, 1], Z3 = [0, 0, 0];
  const MA = M3.make(), MB = M3.make(), MC = M3.make(), MD = M3.make(), ME = M3.make(), MF = M3.make(), TM = M3.make(), BM = M3.make();
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v), mix = (a, b, t) => a + (b - a) * t, sm = (t) => t * t * (3 - 2 * t);
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
  const v3 = () => [0, 0, 0];
  const SL = v3(), SR = v3(), KL = v3(), KR = v3(), T1 = v3(), T2 = v3(), A = v3(), B = v3(), N = v3(), G = v3(), D = v3(), U = v3(), DR = v3(), UR = v3(), JL = v3(), JR = v3(), AKL = v3(), AKR = v3(), RT = v3();
  function xf(M, x, y, z, o) { o[0] = M[0] * x + M[1] * y + M[2] * z + M[3]; o[1] = M[4] * x + M[5] * y + M[6] * z + M[7]; o[2] = M[8] * x + M[9] * y + M[10] * z + M[11]; return o; }
  function xr(M, x, y, z, o) { o[0] = M[0] * x + M[1] * y + M[2] * z; o[1] = M[4] * x + M[5] * y + M[6] * z; o[2] = M[8] * x + M[9] * y + M[10] * z; return o; }
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]); if (!(l > 1e-6)) { v[0] = 1; v[1] = 0; v[2] = 0; return v; } v[0] /= l; v[1] /= l; v[2] /= l; return v; }
  function set(o, x, y, z) { o[0] = x; o[1] = y; o[2] = z; return o; }
  function lerp3(o, a, b, t) { o[0] = mix(a[0], b[0], t); o[1] = mix(a[1], b[1], t); o[2] = mix(a[2], b[2], t); return o; }
  function aimHang(r, dx, dy, dz) { r[0] = Math.asin(cl(dy, -1, 1)); r[1] = Math.atan2(-dx, -dz); r[2] = 0; }
  // IK de dois ossos (mesma convenção do rig do Kael)
  function ik(nu, nl, S, T, a, b, pole) {
    const vx = T[0] - S[0], vy = T[1] - S[1], vz = T[2] - S[2];
    let Dd = Math.hypot(vx, vy, vz);
    const ux = Dd > 1e-4 ? vx / Dd : 0, uy = Dd > 1e-4 ? vy / Dd : 0, uz = Dd > 1e-4 ? vz / Dd : -1;
    Dd = cl(Dd, Math.abs(a - b) + 0.5, a + b - 0.03);
    const pd = pole[0] * ux + pole[1] * uy + pole[2] * uz;
    let wx = pole[0] - pd * ux, wy = pole[1] - pd * uy, wz = pole[2] - pd * uz;
    let wl = Math.hypot(wx, wy, wz);
    if (wl < 1e-4) { wx = -uz; wy = 0; wz = ux; wl = Math.hypot(wx, wy, wz) || 1; }
    wx /= wl; wy /= wl; wz /= wl;
    const ca = cl((a * a + Dd * Dd - b * b) / (2 * a * Dd), -1, 1), sa = Math.sqrt(1 - ca * ca);
    const ex = ca * ux + sa * wx, ey = ca * uy + sa * wy, ez = ca * uz + sa * wz;
    const Ex = S[0] + a * ex, Ey = S[1] + a * ey, Ez = S[2] + a * ez;
    const ox = S[0] + ux * Dd, oy = S[1] + uy * Dd, oz = S[2] + uz * Dd;
    nu.p[0] = S[0]; nu.p[1] = S[1]; nu.p[2] = S[2];
    aimHang(nu.r, ex, ey, ez);
    const lx = (ox - Ex) / b, ly = (oy - Ey) / b, lz = (oz - Ez) / b;
    const cp = Math.cos(-nu.r[1]), sp = Math.sin(-nu.r[1]);
    const x1 = cp * lx + sp * lz, z1 = -sp * lx + cp * lz;
    const cr = Math.cos(-nu.r[0]), sr = Math.sin(-nu.r[0]);
    aimHang(nl.r, x1, cr * ly - sr * z1, sr * ly + cr * z1);
  }
  function transposeRot(o, M) { o[0] = M[0]; o[1] = M[4]; o[2] = M[8]; o[3] = 0; o[4] = M[1]; o[5] = M[5]; o[6] = M[9]; o[7] = 0; o[8] = M[2]; o[9] = M[6]; o[10] = M[10]; o[11] = 0; return o; }
  function euler(r, M) { r[1] = Math.asin(cl(-M[8], -1, 1)); r[2] = Math.atan2(M[4], M[0]); r[0] = Math.atan2(M[9], M[10]); }
  function flatFoot(nf, nu, nl, toe) {
    M3.trs(MA, Z3, nu.r, ONE); M3.trs(MB, Z3, nl.r, ONE); M3.mul(MC, MA, MB);
    transposeRot(MD, MC); RT[0] = 0; RT[1] = toe; RT[2] = 0;
    M3.trs(ME, Z3, RT, ONE); M3.mul(MF, MD, ME); euler(nf.r, MF);
  }
  function orient(r, d, up) {
    const x0 = d[0], x1 = d[1], x2 = d[2];
    const pd = up[0] * x0 + up[1] * x1 + up[2] * x2;
    let z0 = up[0] - pd * x0, z1 = up[1] - pd * x1, z2 = up[2] - pd * x2;
    let zl = Math.hypot(z0, z1, z2);
    if (zl < 1e-3) { z0 = -x2; z1 = 0; z2 = x0; zl = Math.hypot(z0, z1, z2); if (zl < 1e-3) { z0 = 0; z1 = 1; z2 = 0; zl = 1; } }
    z0 /= zl; z1 /= zl; z2 /= zl;
    const y2 = z0 * x1 - z1 * x0;
    r[1] = Math.asin(cl(-x2, -1, 1)); r[2] = Math.atan2(x1, x0); r[0] = Math.atan2(y2, z2);
  }
  // Matriz (no referencial do corpo) de um membro de dois nós
  function limb(m, up, lo, M) {
    const nu = m.nodes[up], nl = m.nodes[lo];
    M3.trs(MA, nu.p, nu.r, nu.s); M3.trs(MB, nl.p, nl.r, nl.s); return M3.mul(M, MA, MB);
  }
  function solveArm(m, side, S, T, pole) { ik(m.nodes['arm' + side + 'u'], m.nodes['arm' + side + 'f'], S, T, AUP, AFO, pole); }
  // Refaz as pernas para os tornozelos dados (depois de mexer no quadril)
  const POLE_KL = [1, -0.25, 0.1], POLE_KR = [1, 0.25, 0.1];
  function solveLegs(m, ankL, ankR, toeL, toeR) {
    const n = m.nodes;
    M3.trs(MA, n.hips.p, n.hips.r, ONE);
    xf(MA, 0, -HIPY, -1.0, JL); xf(MA, 0, HIPY, -1.0, JR);
    ik(n.thighL, n.shinL, JL, ankL, LTH, LSH, POLE_KL);
    ik(n.thighR, n.shinR, JR, ankR, LTH, LSH, POLE_KR);
    flatFoot(n.footL, n.thighL, n.shinL, toeL);
    flatFoot(n.footR, n.thighR, n.shinR, toeR);
  }

  // ------------------------------------------------------------ geometria do arco
  // Referencial do arco: +X = direção da flecha, +Z = ponta de cima, empunhadura na origem.
  // Arco de energia montado com peças de drone: lâminas escuras com veios violeta e pontas afiadas
  const DARK = '#1b1626', DARK2 = '#2b2238', VIO = '#a64dff', VIO2 = '#d6a8ff';
  const limbX = (z) => -TIPX * Math.pow(Math.abs(z) / HB, 1.7);
  function gBow() {
    const g = new G3();
    for (const s of [1, -1]) {
      const pts = [], pf = [];
      for (let i = 0; i <= 6; i++) { const z = s * (2.6 + (HB - 2.6) * (i / 6)); pts.push([limbX(z), 0, z]); pf.push([limbX(z) + 0.55, 0, z]); }
      g.tube(pts, 0.85, 4, DARK, 0);
      g.tube(pf, 0.36, 3, VIO, 1.0);
      // Lâmina na ponta (peça de drone) e o encaixe da corda
      const zt = s * HB, xt = limbX(zt);
      g.poly([[xt + 0.2, -0.3, zt - s * 4], [xt + 3.8, 0, zt - s * 1.2], [xt + 0.6, 0, zt + s * 2.4], [xt - 0.6, 0.3, zt - s * 1.5]], DARK2, 0);
      g.poly([[xt + 0.6, 0.35, zt - s * 3], [xt + 3.2, 0.35, zt - s * 1.2], [xt + 0.7, 0.35, zt + s * 1.6]], VIO, 0.9);
      g.sphere(xt, 0, zt, 0.7, 0.7, 0.7, 4, 2, VIO2, 1.0);
      // Asa intermediária
      const zm = s * HB * 0.55, xm = limbX(zm);
      g.poly([[xm + 0.3, 0, zm - s * 2.5], [xm + 2.6, 0, zm], [xm + 0.3, 0, zm + s * 2.5]], DARK2, 0);
    }
    // Empunhadura: peça central com o núcleo violeta
    g.box(0.2, 0, 0, 1.8, 1.4, 6.4, DARK, 0, { taper: 0.85 });
    g.box(1.25, 0, 0, 0.5, 1.0, 3.2, VIO, 1.0);
    g.sphere(1.5, 0, 2.6, 0.55, 0.55, 0.55, 4, 2, VIO2, 1.0);
    g.sphere(1.5, 0, -2.6, 0.55, 0.55, 0.55, 4, 2, VIO2, 1.0);
    return g;
  }
  // Meia corda: segmento unitário ao longo de +X (o nó é escalado até o encaixe)
  function gString() { return new G3().box(0.5, 0, 0, 1, 0.22, 0.22, '#eadbff', 1.1); }
  // Flecha de fóton: haste escura, ponta e penas violeta (ao longo de +X, do encaixe à ponta)
  function gArrow() {
    const g = new G3();
    g.box(ALEN / 2, 0, 0, ALEN, 0.36, 0.36, '#2a2236', 0);
    g.box(ALEN / 2 + 2, 0, 0, ALEN - 6, 0.14, 0.14, VIO2, 0.9);
    g.cyl(ALEN, 0, 0, 0.95, 0, 3.4, 4, '#c98bff', 1.0, { axis: 'x' });
    for (const s of [1, -1]) g.poly([[0.5, 0, 0], [4.2, s * 1.4, 0], [3.4, 0, 0]], VIO, 0.8);
    return g;
  }
  const PARTS = ['lyraBow', 'lyraStrA', 'lyraStrB', 'lyraArrow'];
  // Arco GLB (assets/armas/eclipse/lyra_arco.glb via js/heroes/armas3d.js), se existir: a malha
  // importada vai para o referencial do arco (+X flecha, +Z ponta de cima): (x, y, z) da arma →
  // (−z, y, x). A corda do arquivo foi tirada na importação; a corda desenhada sai das pontas dele.
  let GLB = null;                                   // { raw, tex, top: [x, z], bot: [x, z] } ou false
  function glbBow() {
    if (GLB !== null) return GLB;
    GLB = false;
    if (typeof WeaponRig === 'undefined' || !WeaponRig.has('lyra_arco')) return GLB;
    const conv = (g) => {
      const o = new Float32Array(g.length);
      for (let i = 0; i < g.length; i += 10) {
        o[i] = -g[i + 2]; o[i + 1] = g[i + 1]; o[i + 2] = g[i];
        o[i + 3] = -g[i + 5]; o[i + 4] = g[i + 4]; o[i + 5] = g[i + 3];
        o[i + 6] = g[i + 6]; o[i + 7] = g[i + 7]; o[i + 8] = g[i + 8]; o[i + 9] = g[i + 9];
      }
      return o;
    };
    const P = WEAPON3D.lyra_arco.pontas;
    GLB = { raw: conv(WeaponRig.geo('lyra_arco', false)), tex: conv(WeaponRig.geo('lyra_arco', true)), top: [-P[0][1], P[0][0]], bot: [-P[1][1], P[1][0]] };
    return GLB;
  }
  // Pontas onde a corda prende: [x, z] de cima e de baixo
  const tipTop = () => (GLB ? GLB.top : [limbX(HB), HB]), tipBot = () => (GLB ? GLB.bot : [limbX(-HB), -HB]);
  // Modelos com textura (model.tex) leem a cor por vértice como (r, g, −1 − b): converte uma vez
  function texFormat(m) {
    if (!m.tex) return;
    for (const k of PARTS) {
      const nd = m.nodes[k];
      if (!nd || !nd.geo || nd._texFmt) continue;
      const g = nd.geo;
      for (let i = 0; i < g.length; i += 10) g[i + 8] = -1 - g[i + 8];
      nd._texFmt = true;
    }
  }

  function add(m) {
    if (m.nodes.lyraBow) return m;
    const body = m.nodes.body;
    const bow = body.add(new N3('lyraBow', gBow()));
    const sA = bow.add(new N3('lyraStrA', gString())), sB = bow.add(new N3('lyraStrB', gString()));
    const ar = bow.add(new N3('lyraArrow', gArrow()));
    for (const nd of [bow, sA, sB, ar]) { m.nodes[nd.name] = nd; m.rest[nd.name] = { p: nd.p.slice(), r: nd.r.slice(), s: nd.s.slice() }; }
    glbBow();
    m.anchor('bowGrip', 'lyraBow', [1.4, 0, 0]);
    m.anchor('bowTop', 'lyraBow', [tipTop()[0], 0, tipTop()[1]]);
    m.anchor('bowBot', 'lyraBow', [tipBot()[0], 0, tipBot()[1]]);
    m.anchor('arrowTip', 'lyraArrow', [ALEN + 2, 0, 0]);
    texFormat(m);
    return m;
  }

  // Corda: do encaixe (ponta do arco [x, z]) até o ponto de puxada (nx, 0, 0), no referencial do arco
  function placeString(nd, tip, nx) {
    const tx = tip[0], zt = tip[1], vx = nx - tx, vz = -zt, L = Math.hypot(vx, vz) || 1;
    nd.p[0] = tx; nd.p[1] = 0; nd.p[2] = zt;
    nd.r[0] = 0; nd.r[1] = Math.atan2(-vz, vx); nd.r[2] = 0;
    nd.s[0] = L; nd.s[1] = 1; nd.s[2] = 1;
  }

  function pose(m, e, o) {
    medidas(m);
    const n = m.nodes;
    if (!n.lyraBow) return;
    // arco GLB no formato do modelo (com textura ou de cores); texFormat não mexe nele
    if (glbBow() && n.lyraBow._glb !== !!m.tex) { n.lyraBow.geo = m.tex ? GLB.tex : GLB.raw; n.lyraBow._glb = !!m.tex; n.lyraBow._texFmt = true; }
    texFormat(m);
    if (n.sword) n.sword.vis = false;           // a espada do Kael não aparece na Lyra
    if (n.mark) n.mark.vis = false;             // nem a marca do pulso dele
    const I = e ? lyraPoseInfo(e) : null;
    const W = I ? cl(I.W, 0, 1) : 0, kind = I ? I.kind : '';
    let drawK = 0, nockOn = false, pitch = 0;
    if (W > 0.001 && e.state !== 'dead') {
      // Tornozelos atuais (as pernas são refeitas se o quadril mudar)
      limb(m, 'thighL', 'shinL', MC); xf(MC, 0, 0, -LSH, AKL);
      limb(m, 'thighR', 'shinR', MC); xf(MC, 0, 0, -LSH, AKR);
      // Mãos da pose-base (o peso W mistura com a pose de arqueira)
      limb(m, 'armLu', 'armLf', MC); xf(MC, 0, 0, -AFO, KL);
      limb(m, 'armRu', 'armRf', MC); xf(MC, 0, 0, -AFO, KR);
      // Tronco de lado (ombro esquerdo para o alvo), cabeça olhando a flecha
      let TY = 0.72, HY = 0.28, crouch = 0, tuck = 0;
      if (kind === 'up') pitch = 0.95;
      else if (kind === 'cast') pitch = 0.45;
      else if (kind === 'hook') pitch = 0.08;
      if (kind === 'trap') { TY = 0.2; HY = 0.1; crouch = 6; }
      if (kind === 'throw') { const r = I.t < I.tW ? sm(cl(I.t / I.tW, 0, 1)) : 1 - sm(cl((I.t - I.tW) / 0.12, 0, 1)); TY = mix(0.1, -0.6, r); HY = TY * 0.4; }
      if (kind === 'hop') tuck = sm(cl(num(e.z) / 14, 0, 1));
      n.torso.r[2] = mix(n.torso.r[2], TY, W);
      n.hips.r[2] = mix(n.hips.r[2], HY, W);
      n.head.r[2] = mix(n.head.r[2], -TY * 0.9 + 0.04, W);
      if (kind === 'up') { n.torso.r[1] = mix(n.torso.r[1], -0.12, W); n.head.r[1] -= 0.45 * W; }
      else if (kind === 'trap') { n.torso.r[1] += 0.35 * W; n.head.r[1] -= 0.15 * W; }
      else n.head.r[1] += 0.05 * W;
      if (crouch) { n.hips.p[2] -= crouch * W; n.torso.p[2] -= crouch * W; }
      // Pernas: mesmos pés no chão (ou encolhidas no salto)
      if (tuck > 0) {
        set(T1, mix(AKL[0], 6, tuck), mix(AKL[1], -4.2, tuck), mix(AKL[2], 15, tuck));
        set(T2, mix(AKR[0], -4, tuck), mix(AKR[1], 4.4, tuck), mix(AKR[2], 10.5, tuck));
        solveLegs(m, T1, T2, 0.3 * tuck, 0.6 * tuck);
      } else solveLegs(m, AKL, AKR, 0, 0);
      // Ombros na nova posição do tronco
      M3.trs(TM, n.torso.p, n.torso.r, ONE);
      xf(TM, 0, -SHY, SHZ, SL); xf(TM, 0, SHY, SHZ, SR);
      if (kind === 'trap') {
        // Armar a armadilha: mão direita no chão à frente, arco baixo do lado
        const k = I.t < I.tA ? sm(cl(I.t / Math.max(0.01, I.tA * 0.8), 0, 1)) : 1;
        set(T1, mix(KR[0], 12, k), mix(KR[1], 3.5, k), mix(KR[2], 8, k));
        solveArm(m, 'R', SR, lerp3(T2, KR, T1, W), [-0.3, 1, -0.3]);
        set(T1, 1, -9.5, 18 - crouch * 0.5);
        solveArm(m, 'L', SL, lerp3(T2, KL, T1, W), [0, -0.6, -1]);
      } else if (kind === 'throw') {
        // Arremesso da isca: braço direito por cima, arco à frente para equilibrar
        const r = I.t < I.tW ? sm(cl(I.t / I.tW, 0, 1)) : 1, f = I.t >= I.tW ? sm(cl((I.t - I.tW) / 0.1, 0, 1)) : 0;
        set(T1, mix(mix(KR[0], -8, r), 15, f), mix(mix(KR[1], 9, r), 3, f), mix(mix(KR[2], 46, r), 35, f));
        solveArm(m, 'R', SR, lerp3(T2, KR, T1, W), [-1, 0.6, -0.2]);
        set(T1, 9, -9, 31);
        solveArm(m, 'L', SL, lerp3(T2, KL, T1, W), [0, -0.6, -1]);
      } else {
        // Mira: âncora no queixo, a mão do arco estendida na linha da flecha
        xf(TM, 3.2, -1.8, 16.4, A);
        set(D, Math.cos(pitch), 0, Math.sin(pitch));
        const ox = A[0] - SL[0], oy = A[1] - SL[1], oz = A[2] - SL[2], R = 18.6;
        const bb = D[0] * ox + D[1] * oy + D[2] * oz, cc = ox * ox + oy * oy + oz * oz - R * R;
        const s = -bb + Math.sqrt(Math.max(0, bb * bb - cc));
        set(B, A[0] + D[0] * s, A[1] + D[1] * s, A[2] + D[2] * s);
        set(T1, B[0] - SL[0], B[1] - SL[1], B[2] - SL[2]); norm(T1);
        set(T1, B[0] - T1[0] * 1.4, B[1] - T1[1] * 1.4, B[2] - T1[2] * 1.4);
        solveArm(m, 'L', SL, lerp3(T2, KL, T1, W), [0.2, -0.6, -1]);
        drawK = kind === 'hook' ? 0 : kind === 'cast' ? 0.55 * W : num(I.draw) * W;
        nockOn = I.nocked && kind !== 'hook' && W > 0.3;
      }
    }
    // Arco preso à mão esquerda: posição pela empunhadura; orientação entre a do antebraço
    // (repouso: pontas para cima e para baixo ao longo do braço) e a da mira (W)
    limb(m, 'armLu', 'armLf', MC);
    xf(MC, GRIP[0], GRIP[1], GRIP[2], G);
    xr(MC, 1, 0, 0, DR); xr(MC, 0, 0, 1, UR);
    const aiming = W > 0.001 && (kind === 'shot' || kind === 'hop' || kind === 'up' || kind === 'cast' || kind === 'hook');
    if (aiming) {
      set(U, -Math.sin(pitch), -0.16, Math.cos(pitch));
      lerp3(D, DR, D, W); norm(D); lerp3(U, UR, U, W); norm(U);
    } else {
      // Repouso: arco quase em pé ao lado do corpo, a corda voltada para trás
      set(U, UR[0] * 0.45, UR[1] * 0.45, UR[2] * 0.45 + 1); norm(U);
      set(D, DR[0], DR[1], 0); if (Math.hypot(D[0], D[1]) < 0.2) set(D, 1, 0, 0); norm(D);
    }
    const bow = n.lyraBow;
    bow.p[0] = G[0]; bow.p[1] = G[1]; bow.p[2] = G[2];
    orient(bow.r, D, U);
    bow.s[0] = bow.s[1] = bow.s[2] = 1;
    // Corda: puxada até a âncora (âncora → empunhadura) ou vibrando depois de soltar
    const TX = -(tipTop()[0] + tipBot()[0]) / 2;      // corda em repouso (reta entre as pontas)
    let nx = -TX;
    if (aiming) {
      const span = Math.max(TX, Math.hypot(G[0] - A[0], G[1] - A[1], G[2] - A[2]) - 1);
      nx = -(TX + drawK * (span - TX));
      if (I && !I.nocked && I.rel < 1) nx += Math.sin(I.rel * 46) * (1 - I.rel) * 1.6;
    }
    placeString(n.lyraStrA, tipTop(), nx);
    placeString(n.lyraStrB, tipBot(), nx);
    const arw = n.lyraArrow;
    arw.vis = nockOn;
    // arco guardado nas costas (js/heroes/armas3d.js): some da mão (o das costas aparece lá)
    if (e && e.wpnOut === false && !aiming) bow.vis = false;
    arw.p[0] = nx; arw.p[1] = 0; arw.p[2] = 0; arw.r[0] = arw.r[1] = arw.r[2] = 0;
    // Mão da corda: no encaixe enquanto puxa; depois de soltar, segue para trás do queixo
    if (aiming) {
      M3.trs(BM, bow.p, bow.r, ONE);
      xf(BM, nx, 0, 0, N);
      if (kind === 'hook') set(T1, -3, 8.5, 30);
      else if (I && !I.nocked) {
        const f = sm(cl(I.rel * 3, 0, 1));
        set(T1, A[0] - D[0] * (1 + 3 * f), A[1] - D[1] * (1 + 3 * f) + 1.4 * f, A[2] - D[2] * (1 + 3 * f) + 0.6 * f);
      } else {
        set(T2, N[0] - SR[0], N[1] - SR[1], N[2] - SR[2]); norm(T2);
        set(T1, N[0] - T2[0] * 1.3, N[1] - T2[1] * 1.3, N[2] - T2[2] * 1.3 - 0.4);
      }
      solveArm(m, 'R', SR, lerp3(T2, KR, T1, W), [-1, 0.7, 0.35]);
    }
  }

  function glows(e, add) {
    if (!e) return;
    const st = e.state, I = lyraPoseInfo(e), t = num(e.animTime);
    const live = I && I.nocked && I.W > 0.3;
    const ch = st === 'charge' ? cl(num(e.chargeLevel), 0, 2) : 0;
    const focus = e.hero && e.hero.focus > 0 ? 1 : 0;
    const base = st === 'dead' ? 0.12 : 0.3 + 0.06 * Math.sin(t * 3) + (live ? 0.12 : 0) + focus * 0.12;
    add('bowGrip', 8 + ch * 2, LYRA_RGB, base + 0.12);
    add('bowTop', 6, LYRA_HI, base);
    add('bowBot', 6, LYRA_HI, base);
    if (live) add('arrowTip', 6 + ch * 5 + 1.5 * Math.sin(t * 20), ch >= 2 ? LYRA_CORE : LYRA_HI, 0.5 + ch * 0.18);
  }

  HERO_WEAPONS.lyra = { add, pose, glows };
})();
