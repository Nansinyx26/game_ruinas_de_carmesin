'use strict';
// ECLIPSE ZERO · Jogador: Kael Veyron (movimento, golpes, esquiva, habilidades, Eclipse, desenho 2D)
// Os outros personagens usam o mesmo Player: o que é próprio de cada um vem do kit
// (this.kit, js/heroes/kit.js). Com o Kael, this.kit é null e nada abaixo muda.
// ---------------------------------------------------------------------------
// JOGADOR
// ---------------------------------------------------------------------------
// Paletas (o flash branco e os "fantasmas" da esquiva trocam todas as cores)
// Kael Veyron: casaco negro reforçado, cabelo preto, marca azul no pulso esquerdo
const PLAYER_PAL = {
  coat: '#17181f', coatHi: '#2c2f3b', coatDark: '#0a0b0f', shirt: '#0f1015', strap: '#34373f', buckle: '#8d96a8',
  pants: '#121319', boot: '#0b0b10', skin: '#c49c84', skinShade: '#8f6e5c', eye: '#d6e6ff', hair: '#0a0a0f',
  hairHi: '#2a2d3a', glove: '#101116', mark: '#3d8bff',
  blade: '#15171e', bladeEdge: '#7b859a', vein: '#4da3ff', guard: '#262932', grip: '#121318',
};
const FLASH_PAL = new Proxy({}, { get: () => '#ffffff' });
const GHOST_PAL = new Proxy({}, { get: (t, k) => (k === 'vein' || k === 'mark' || k === 'eye' ? '#d8f0ff' : '#1f5fd8') });

const SPECIAL_DEF = { hitstop: 0.16, shake: 0.2, fury: 0, zoom: 0.06, heavy: true, sound: 'hitHeavy' };
const PROJ_HIT_DEF = { hitstop: 0.03, shake: 0.08, fury: 3, heavy: false, sound: 'hit' };
const CHAIN_DEF = { hitstop: 0.02, shake: 0.05, fury: 1, heavy: false, sound: 'hit' };

// Sussurros que despertam dentro de Kael após o Eclipse Absoluto
const WHISPERS = [
  '...volte para casa, Kael...',
  '...você pediu para esquecer...',
  '...a marca no seu pulso é uma chave...',
  '...ela implorou para você parar...',
  '...o projeto ZERO ainda não terminou...',
  '...quanto mais você luta, menos resta de você...',
];

// Variações de animação para o estado idle dinâmico
// (idle_breathing, idle_look_around, idle_weapon_inspect, idle_combat_ready,
//  idle_weight_shift, idle_stretch, idle_alert, idle_fidget)
const CHARACTER_IDLE_PROFILES = {
  kael: {
    baseInterval: [3.5, 6.0],
    variants: [
      { id: 'idle_breathing', weight: 35, duration: [3.0, 5.0] },
      { id: 'idle_look_around', weight: 15, duration: [2.5, 4.0] },
      { id: 'idle_weapon_inspect', weight: 20, duration: [2.5, 3.8] },
      { id: 'idle_combat_ready', weight: 15, duration: [2.0, 3.5] },
      { id: 'idle_weight_shift', weight: 10, duration: [2.0, 3.0] },
      { id: 'idle_alert', weight: 5, duration: [1.8, 2.5] },
    ]
  },
  orion: {
    baseInterval: [2.5, 4.5],
    variants: [
      { id: 'idle_breathing', weight: 25, duration: [2.5, 4.0] },
      { id: 'idle_fidget', weight: 25, duration: [2.0, 3.2] },
      { id: 'idle_weapon_inspect', weight: 20, duration: [2.2, 3.5] },
      { id: 'idle_combat_ready', weight: 15, duration: [2.0, 3.0] },
      { id: 'idle_alert', weight: 15, duration: [1.5, 2.5] },
    ]
  },
  lyra: {
    baseInterval: [3.0, 5.5],
    variants: [
      { id: 'idle_breathing', weight: 30, duration: [3.0, 5.0] },
      { id: 'idle_look_around', weight: 25, duration: [2.8, 4.5] },
      { id: 'idle_stretch', weight: 15, duration: [2.2, 3.5] },
      { id: 'idle_weapon_inspect', weight: 15, duration: [2.0, 3.2] },
      { id: 'idle_alert', weight: 15, duration: [1.8, 2.8] },
    ]
  },
  drakos: {
    baseInterval: [4.0, 7.0],
    variants: [
      { id: 'idle_breathing', weight: 35, duration: [3.5, 6.0] },
      { id: 'idle_weight_shift', weight: 25, duration: [2.5, 4.2] },
      { id: 'idle_combat_ready', weight: 20, duration: [2.5, 4.0] },
      { id: 'idle_stretch', weight: 10, duration: [2.2, 3.5] },
      { id: 'idle_weapon_inspect', weight: 10, duration: [2.0, 3.2] },
    ]
  },
  sera: {
    baseInterval: [3.2, 5.8],
    variants: [
      { id: 'idle_breathing', weight: 30, duration: [3.0, 5.0] },
      { id: 'idle_look_around', weight: 20, duration: [2.5, 4.0] },
      { id: 'idle_fidget', weight: 25, duration: [2.0, 3.5] },
      { id: 'idle_weapon_inspect', weight: 15, duration: [2.0, 3.2] },
      { id: 'idle_stretch', weight: 10, duration: [2.0, 3.0] },
    ]
  }
};

class Player extends Entity {
  // def: ficha do personagem (js/data/characters.js); por padrão o ativo do roster
  constructor(x, y, def = RosterManager.activeDef) {
    super(x, y, def.stats.radius);
    this.def = def;
    this.maxHp = def.stats.hp; this.hp = def.stats.hp;
    this.baseSpeed = def.stats.speed;
    this.fury = 0; this.maxEnergy = def.stats.energy;   // energia da Tempestade Nula (habilidades e Eclipse)
    this.stats = Object.assign({}, BASE_STATS);
    this.combo = new ComboSystem();
    this.state = 'idle'; this.stateTime = 0;
    this.attack = null;
    this.dashCd = 0; this.dashDirX = 1; this.dashDirY = 0;
    this.dashBuffer = 0; this.specialBuffer = 0;
    this.invuln = 0;
    this.chargeTime = 0; this.chargeLevel = 0;
    this.specialFired = false;
    this.animTime = 0; this.moveSpeed = 0;
    this.squash = 0;
    this.lifestealAcc = 0;
    this.ghosts = [];
    for (let i = 0; i < 8; i++) this.ghosts.push({ x: 0, y: 0, f: 0, life: 0 });
    this.ghostTimer = 0;
    this.tmp = { x: 0, y: 0 };
    this.tmp2 = { x: 0, y: 0 };
    this.cds = {};                 // recargas das habilidades ativas (por id)
    this.buffs = { overload: 0, field: 0, shield: 0, sync: 0 };
    this.shieldHp = 0; this.shieldMax = 0; this.fieldTick = 0; this.fieldLv = 1; this.overloadMult = 1;
    this.counterT = 0;             // janela do contra-ataque após uma esquiva perfeita
    this.abBuffer = -1; this.abBufT = 0;
    this.dashStock = 1; this.dashGap = 0;
    // Kit do personagem (js/heroes/<id>.js): ataques, habilidades, suprema e passivas próprias
    this.kit = heroKitOf(def);
    if (this.kit) this.kit.init(this);

    // Sistema dinâmico de variações de Idle
    this.idleVariant = 'idle_breathing';
    this.idleTimer = 3.0 + Math.random() * 2.0;
    this.idleBlend = 0.0;
    this.idleTime = 0.0;
    // Contexto do idle (tem prioridade sobre o sorteio, ver idleContext): cansaço depois de
    // correr ou lutar muito, comemoração ao liberar o setor e a variação anterior (sem repetir)
    this.fatigue = 0; this.tired = false; this.victoryT = 0; this.lastIdle = null; this.idleForced = false;
    // Arma (js/heroes/armas3d.js): começa nas costas; saca ao entrar em combate e guarda na calma
    this.wpnOut = false; this.wpnAnim = null; this.wpnCalm = 0; this.wpnFlash = 0;
  }

  // Inimigo ativo por perto (para sacar a arma e para a guarda do idle)
  threatNear(r) {
    if (!(game.combatActive && game.combatActive())) return false;
    for (const e of game.enemies) if (e.alive && !e.dormant && dist2(e.x, e.y, this.x, this.y) < r * r) return true;
    return false;
  }
  // Arma na mão ou nas costas: golpe, carga ou suprema sacam na hora; inimigo a menos de 380
  // saca com o gesto (a mão vai às costas); depois de 4 s sem ameaça, guarda com o gesto.
  // Só visual: não muda dano, alcance nem tempo de nenhuma ação.
  updateWeapon(dt) {
    if (typeof WeaponRig === 'undefined' || !WeaponRig.ok) return;
    if (this.wpnFlash > 0) this.wpnFlash -= dt;
    const st = this.state, A = this.wpnAnim;
    if (st === 'dead') return;
    if (st === 'attack' || st === 'charge' || st === 'special') {
      if (!this.wpnOut || A) { this.wpnOut = true; this.wpnAnim = null; this.wpnFlash = 0.22; game.audio.play('draw', 0.7); }
      this.wpnCalm = 0;
      return;
    }
    if (A) {
      A.t += dt;
      if (!A.swap && A.t >= A.dur * (A.k === 'draw' ? 0.45 : 0.55)) {
        A.swap = true; this.wpnOut = A.k === 'draw';
        game.audio.play(A.k === 'draw' ? 'draw' : 'sheathe', 0.8);
      }
      if (A.t >= A.dur) this.wpnAnim = null;
      return;
    }
    const threat = this.threatNear(380);
    if (this.wpnOut) {
      this.wpnCalm = threat || st === 'hurt' ? 0 : this.wpnCalm + dt;
      if (this.wpnCalm > 4 && (st === 'idle' || st === 'run')) this.wpnAnim = { k: 'sheathe', t: 0, dur: 0.7 };
    } else if (threat && (st === 'idle' || st === 'run' || st === 'hurt')) {
      this.wpnAnim = { k: 'draw', t: 0, dur: 0.5 };
    }
  }

  // Variação imposta pela situação, em ordem de prioridade: vitória → alerta/guarda (inimigo a
  // menos de 320, o alerta nos primeiros instantes parado) → cansaço; null = o sorteio do perfil
  idleContext() {
    if (this.victoryT > 0) return 'idle_victory';
    if (game.combatActive && game.combatActive()) {
      for (const e of game.enemies) {
        if (e.alive && dist2(e.x, e.y, this.x, this.y) < 320 * 320) return this.idleTime < 1.2 ? 'idle_alert' : 'idle_combat_ready';
      }
    }
    if (this.fatigue > 0.65) this.tired = true; else if (this.fatigue < 0.25) this.tired = false;
    return this.tired ? 'idle_tired' : null;
  }

  // Escolhe próxima animação de idle baseada no perfil do personagem
  pickNextIdleVariant() {
    const prof = CHARACTER_IDLE_PROFILES[this.def.id] || CHARACTER_IDLE_PROFILES.kael;
    const totalWeight = prof.variants.reduce((sum, v) => sum + v.weight, 0);
    let r = Math.random() * totalWeight;
    let chosen = prof.variants[0];
    for (const v of prof.variants) {
      if (r < v.weight) { chosen = v; break; }
      r -= v.weight;
    }
    // não repete a variação anterior (a respiração pode voltar: é o repouso)
    if (chosen.id === this.lastIdle && chosen.id !== 'idle_breathing') chosen = prof.variants[0];
    this.lastIdle = chosen.id;
    this.idleVariant = chosen.id;
    this.idleTimer = chosen.duration[0] + Math.random() * (chosen.duration[1] - chosen.duration[0]);
  }

  get dashing() { return this.state === 'dash'; }

  // Captura inputs TODO frame (inclusive durante o hit stop) para o buffer de combos
  captureInput(input) {
    if (this.state === 'dead') return;
    if (input.pressed.light) this.combo.bufferInput('L');
    if (input.pressed.heavy) this.combo.bufferInput('H');
    if (input.pressed.dash) this.dashBuffer = 0.16;
    if (input.pressed.special) {
      if (this.canEclipse()) this.specialBuffer = 0.25;
      else this.denyEclipse();
    }
    for (let k = 0; k < 4; k++) if (input.pressed['ab' + (k + 1)]) { this.abBuffer = k; this.abBufT = 0.25; }
  }

  update(dt, input) {
    this.animTime += dt; this.stateTime += dt;
    // Cansaço (idle_tired): sobe correndo, atacando e apanhando; descansa parado
    HeroPassives.tick(this, dt);
    const tiring = this.state === 'run' ? 0.045 : this.state === 'attack' || this.state === 'charge' ? 0.06 : this.state === 'idle' ? -0.1 : 0;
    this.fatigue = clamp(this.fatigue + tiring * dt, 0, 1);
    if (this.victoryT > 0) this.victoryT -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.dashBuffer > 0) this.dashBuffer -= dt;
    if (this.specialBuffer > 0) this.specialBuffer -= dt;
    if (this.abBufT > 0) this.abBufT -= dt;
    this.squash = approach(this.squash, 0, dt * 1.2);
    this.combo.update(dt, this.state === 'attack' || this.state === 'charge');
    this.updateAbilities(dt);
    if (this.kit) this.kit.update(this, dt);   // passivas e efeitos do kit

    const mv = input.move, mag = Math.min(1, Math.hypot(mv.x, mv.y));
    const wd = mag > 0.15 ? screenToWorldDir(mv.x, mv.y, this.tmp) : null;
    // Habilidades instantâneas (buffs) podem ser usadas a qualquer momento
    if (this.abBufT > 0 && this.isBuffSlot(this.abBuffer) && this.state !== 'dead' && this.state !== 'special') {
      this.abBufT = 0; this.castAbility(this.abBuffer, wd);
    }

    switch (this.state) {
      case 'idle':
      case 'run': {
        if (this.tryActions(wd)) {
          this.idleTime = 0; this.idleBlend = 0; this.idleVariant = 'idle_breathing';
          break;
        }
        let tvx = 0, tvy = 0;
        if (wd) {
          const sp = this.baseSpeed * this.stats.speedMult * mag;
          tvx = wd.x * sp; tvy = wd.y * sp;
          this.facing = Math.atan2(wd.y, wd.x);
          this.state = 'run';
          this.idleTime = 0;
          this.idleBlend = 0;
          this.idleVariant = 'idle_breathing';
          this.idleTimer = 3.0 + Math.random() * 2.0;
        } else {
          this.state = 'idle';
          this.idleTime += dt;
          this.idleTimer -= dt;
          // a situação (vitória, inimigo perto, cansaço) vence o sorteio; quando passa, sorteia de novo
          const forced = this.idleContext();
          if (forced) { this.idleVariant = forced; this.idleForced = true; }
          else if (this.idleTimer <= 0 || this.idleForced) { this.idleForced = false; this.pickNextIdleVariant(); }
          const targetBlend = this.idleVariant === 'idle_breathing' ? 0.0 : 1.0;
          this.idleBlend = approach(this.idleBlend, targetBlend, dt * 3.5);
        }
        const acc = 2800 * dt;
        this.vx = approach(this.vx, tvx, acc);
        this.vy = approach(this.vy, tvy, acc);
        break;
      }
      case 'attack':
        this.idleTime = 0; this.idleBlend = 0; this.idleVariant = 'idle_breathing';
        this.updateAttack(dt, input, wd);
        break;
      case 'charge':
        this.idleTime = 0; this.idleBlend = 0; this.idleVariant = 'idle_breathing';
        this.updateCharge(dt, input, wd);
        break;
      case 'dash':
        this.idleTime = 0; this.idleBlend = 0; this.idleVariant = 'idle_breathing';
        this.updateDash(dt);
        break;
      case 'hurt':
        this.idleTime = 0; this.idleBlend = 0; this.idleVariant = 'idle_breathing';
        this.vx *= Math.exp(-10 * dt); this.vy *= Math.exp(-10 * dt);
        if (this.stateTime >= 0.22) this.state = 'idle';
        break;
      case 'special':
        this.idleTime = 0; this.idleBlend = 0; this.idleVariant = 'idle_breathing';
        this.updateSpecial(dt);
        break;
      case 'dead':
        this.idleTime = 0; this.idleBlend = 0; this.idleVariant = 'idle_breathing';
        this.vx *= Math.exp(-6 * dt); this.vy *= Math.exp(-6 * dt);
        break;
    }

    // Física: velocidade própria + knockback, depois colisão com a sala
    const kd = Math.exp(-9 * dt);
    this.kbx *= kd; this.kby *= kd;
    this.x += (this.vx + this.kbx) * dt;
    this.y += (this.vy + this.kby) * dt;
    game.room.collide(this, true);
    this.moveSpeed = Math.hypot(this.vx, this.vy);

    for (const g of this.ghosts) if (g.life > 0) g.life -= dt;
    this.updateWeapon(dt);
  }

  // Ações disponíveis em estado livre: especial, esquiva ou golpe
  tryActions(wd) {
    if (this.specialBuffer > 0 && this.canEclipse()) { this.specialBuffer = 0; this.startSpecial(); return true; }
    if (this.abBufT > 0) { this.abBufT = 0; if (this.castAbility(this.abBuffer, wd)) return true; }
    if (this.dashBuffer > 0 && this.canDash()) { this.dashBuffer = 0; this.startDash(wd); return true; }
    const b = this.combo.takeBuffer();
    if (b) { this.startAttack(this.combo.resolve(b), wd); return true; }
    return false;
  }

  // Assistência de mira: corrige levemente a direção para o inimigo mais próximo no cone
  aimAssist(dir, def) {
    const isRanged = this.def.id === 'lyra' || this.def.id === 'sera';
    const s = def.shape;
    const baseRange = (s.range || s.length || s.radius || 90);
    const range = isRanged ? Math.max(380, baseRange * 2.5) : baseRange * 1.7;
    const maxAngle = isRanged ? 1.25 : 0.85;
    let best = null, bestScore = Infinity;
    for (const e of game.enemies) {
      if (!e.canBeHit()) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > range + e.radius) continue;
      const ad = Math.abs(angleDiff(dir, Math.atan2(dy, dx)));
      if (ad > maxAngle) continue;
      const score = ad * (isRanged ? 180 : 120) + d;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best ? Math.atan2(best.y - this.y, best.x - this.x) : dir;
  }

  startAttack(id, wd, chargeLevel = 0) {
    if (this.kit) { this.kit.startAttack(this, id, wd, chargeLevel); return; }
    const def = ATTACKS[id];
    if (!def) return;
    let dir = wd ? Math.atan2(wd.y, wd.x) : this.facing;
    if (def.shape.type !== 'circle' || def.shape.offset) dir = this.aimAssist(dir, def);
    this.facing = dir;
    if (this.attack && this.attack.trail) this.attack.trail.release();
    const a = this.attack || (this.attack = { hits: new Map(), counts: new Map() });
    a.id = id; a.def = def; a.t = 0; a.dir = dir;
    a.hits.clear(); a.counts.clear();
    a.trail = null; a.started = false;
    a.charge = chargeLevel;
    a.mult = id === 'charged' ? 1 + chargeLevel : 1;
    if (id === 'spin') def.multiHit = this.stats.spinHits;
    this.state = 'attack'; this.stateTime = 0;
    this.vx *= 0.2; this.vy *= 0.2;
    if (def.name) {
      let name = def.name;
      if (id === 'charged' && chargeLevel >= 0.99) name = 'IMPACTO MÁXIMO';
      game.hud.comboName(name);
      game.audio.play('comboName');
    }
  }

  // Ângulo da lâmina (mundo) no instante t do golpe atual
  bladeAngle(a, t) {
    const d = a.def;
    const p = clamp((t - d.windup) / d.active, 0, 1);
    if (d.oscillate) return a.dir + Math.sin(p * Math.PI * d.oscillate) * d.swing[1];
    const e = d.multiHit ? p : easeOutCubic(p);
    return a.dir + lerp(d.swing[0], d.swing[1], e);
  }

  updateAttack(dt, input, wd) {
    if (this.kit) { this.kit.updateAttack(this, dt, input, wd); return; }
    const a = this.attack, d = a.def;
    const prevT = a.t;
    a.t += dt * (this.buffs.overload > 0 ? 1.2 : 1);
    const tW = d.windup, tA = d.windup + d.active, tEnd = tA + d.recovery;
    // Ruptura de Plasma: energia convergindo durante a preparação
    if (d.plasma && a.t < tW) {
      game.particles.converge(this.x, this.y, 26, 2, 150, '90,160,255', 0.3);
      if (Math.random() < 0.4) game.arcs.crackle(this.x, this.y, 30, 1, 60, '150,205,255', 0.1);
    }

    // Pesado segurado: ao fim da preparação, entra no estado de carga
    if (d.chargeable && prevT < tW && a.t >= tW && input.held.heavy) { this.enterCharge(); return; }

    // Avanço (lunge) durante preparação e fase ativa
    if (a.t < tA) {
      const k = d.thrust ? (a.t >= tW ? 1 - (a.t - tW) / d.active * 0.5 : 0.15) : 1 - a.t / tA;
      const sp = d.lunge * k;
      this.vx = Math.cos(a.dir) * sp; this.vy = Math.sin(a.dir) * sp;
    } else {
      const k = Math.exp(-16 * dt);
      this.vx *= k; this.vy *= k;
    }

    // Início da fase ativa: som, rastro, efeitos especiais do golpe
    if (!a.started && a.t >= tW) {
      a.started = true;
      game.audio.play(d.sound);
      a.trail = game.trails.create(d.rgb, d.core, d.thrust ? 0.1 : 0.14);
      this.squash = d.heavy ? 0.14 : 0.07;
      if (d.projectile === 'volt') this.fireVolt(a.dir);
      else if (d.projectile === 'arrow') this.fireArrow(a.dir, d.dmg, false);
      else if (d.projectile === 'arrow_burst') this.fireArrowBurst(a.dir, d.dmg);
      else if (d.projectile === 'pierce_arrow') this.fireArrow(a.dir, d.dmg, true);
      else if (d.projectile === 'charged_arrow') this.fireArrow(a.dir, d.dmg, true, true);
      else if (d.projectile === 'tech_orb') this.fireTechOrb(a.dir, d.dmg);
      else if (d.projectile === 'blade' || d.projectile === 'phantom_blade') this.firePhantomBlade(a.dir, d.dmg);
      else if (d.projectile) this.fireCrescent(a.dir);
      if (d.slamRing) this.slamEffects(a.dir);
      if (d.plasma) this.plasmaEffects();
    }

    // Amostras do rastro da lâmina (sub-amostradas para curvas suaves)
    if (a.trail && !a.trail.released) {
      const steps = 4;
      for (let s = 1; s <= steps; s++) {
        const tt = prevT + (a.t - prevT) * (s / steps);
        if (tt < tW) continue;
        const ang = this.bladeAngle(a, Math.min(tt, tA));
        const c = Math.cos(ang), sn = Math.sin(ang);
        const z = d.thrust ? 24 : 26 + (d.launch > 300 ? (tt - tW) / d.active * 18 : 0);
        a.trail.add(this.x + c * 18, this.y + sn * 18, this.x + c * d.blade, this.y + sn * d.blade, z, a.t - tt);
      }
      if (a.t >= tA) a.trail.release();
    }

    // Hitbox ativa somente na janela [tW, tA)
    if (a.t >= tW && prevT < tA) this.processHits(a);

    // Encadeamento: após o ponto de cancelamento, inputs armazenados disparam o próximo golpe
    const chainAt = tA + d.recovery * d.chainFrac;
    if (a.t >= chainAt) {
      if (this.specialBuffer > 0 && this.canEclipse()) { this.specialBuffer = 0; this.endAttack(); this.startSpecial(); return; }
      if (this.abBufT > 0 && this.abilityReady(this.abBuffer)) {
        this.abBufT = 0; this.endAttack();
        if (this.castAbility(this.abBuffer, wd)) return;
      }
      const b = this.combo.takeBuffer();
      if (b) { this.startAttack(this.combo.resolve(b), wd); return; }
    }
    // Esquiva cancela a preparação e a recuperação (nunca os frames ativos)
    if (this.dashBuffer > 0 && this.canDash() && (a.t < tW || a.t >= tA)) {
      this.dashBuffer = 0; this.endAttack(); this.startDash(wd); return;
    }
    if (a.t >= tEnd) { this.endAttack(); this.state = 'idle'; }
  }

  endAttack() {
    if (this.attack && this.attack.trail) this.attack.trail.release();
    this.combo.onAttackEnd();
  }

  processHits(a) {
    const d = a.def;
    if (d.noHit) return;
    for (const e of game.enemies) {
      if (!e.canBeHit()) continue;
      const last = a.hits.get(e);
      if (last !== undefined) {
        if (!d.multiHit) continue;
        if ((a.counts.get(e) || 1) >= d.multiHit || a.t - last < d.rehit) continue;
      }
      if (!Hitbox.test(d.shape, this.x, this.y, a.dir, e.x, e.y, e.radius)) continue;
      a.hits.set(e, a.t);
      a.counts.set(e, (a.counts.get(e) || 0) + 1);
      this.hitEnemy(e, d, a);
    }
    // A lâmina também destrói projéteis inimigos (aparar)
    game.projectiles.slashTest(d.shape, this.x, this.y, a.dir);
  }

  hitEnemy(e, d, a) {
    const S = this.stats;
    let dmg = d.dmg * (d.ability ? S.power : S.dmgMult) * a.mult * (d.heavyType ? S.heavyMult : 1) * rand(0.9, 1.1);
    if (d.light) dmg *= S.lightMult;
    if (d.thrust && !d.ability) dmg *= S.thrustMult;
    if (a.id === 'spin') dmg *= S.spinMult;
    dmg *= this.targetMult(e);
    let crit = Math.random() < S.crit;
    // Contra-ataque: o golpe logo após uma esquiva perfeita é crítico e mais forte
    if (this.counterT > 0 && S.counter > 0) {
      crit = true; dmg *= 1 + S.counter; this.counterT = 0;
      game.texts.spawn(e.x, e.y, (e.height || 40) + 26, 'CONTRA-ATAQUE', '#e3d6ff', 15, 0.8);
    }
    // Orion: bônus por atacar pelas costas (backstab) e emboscada furtiva
    if (this.def.id === 'orion') {
      const eFacing = e.facing !== undefined ? e.facing : Math.atan2(this.y - e.y, this.x - e.x);
      const hitAngle = Math.atan2(e.y - this.y, e.x - this.x);
      const angleDiffBack = Math.abs(angleDiff(eFacing, hitAngle));
      if (angleDiffBack < 1.15) {
        crit = true; dmg *= 1.6;
        game.texts.spawn(e.x, e.y, (e.height || 40) + 32, 'GOLPE PELAS COSTAS', '#ff9f38', 15, 0.85);
        game.audio.play('thrust');
      }
      if (this.buffs.stealth > 0) {
        this.buffs.stealth = 0;
        crit = true; dmg *= 1.8;
        game.texts.spawn(e.x, e.y, (e.height || 40) + 48, 'EMBOSCADA', '#ffb852', 18, 1.0);
        game.audio.play('swingHeavy');
      }
    }
    // Lyra: Foco de Batalha garante acertos críticos
    if (this.buffs.lyraFocus > 0) {
      crit = true; dmg *= 1.35;
    }
    // Drakos: Quebra de escudos e super armadura
    if (d.breaksShield && (e.superArmor || e.shieldHp > 0)) {
      e.superArmor = 0;
      if (e.shieldHp) e.shieldHp = 0;
      dmg *= 1.4;
      game.texts.spawn(e.x, e.y, (e.height || 40) + 32, 'ESCUDO DESTRUÍDO', '#ff5252', 16, 0.9);
      game.audio.play('stomp');
    }
    if (crit) { dmg *= 2; if (S.critHeal > 0) this.heal(S.critHeal, false); }
    // Corte Elétrico: golpes leves soltam arcos mais vezes, e o arco reforça o golpe
    const arc = Math.random() < (d.arcs || 0) + (d.light ? S.arcBonus : 0);
    if (arc && d.light && S.arcBonus > 0) dmg *= 1.15;
    dmg = Math.max(1, Math.round(dmg * (e.vulnerable || 1)));
    // Direção do knockback: radial em golpes de área, misturada com a direção do golpe nos arcos
    const dx = e.x - this.x, dy = e.y - this.y, l = Math.hypot(dx, dy) || 1;
    let kx, ky;
    if (d.radialKb) { kx = dx / l; ky = dy / l; }
    else {
      kx = Math.cos(a.dir) * 0.65 + (dx / l) * 0.35; ky = Math.sin(a.dir) * 0.65 + (dy / l) * 0.35;
      const kl = Math.hypot(kx, ky) || 1; kx /= kl; ky /= kl;
    }
    const kb = d.kb * (a.id === 'charged' ? 1 + a.charge * 0.5 : 1);
    const launch = d.launch * (a.id === 'charged' ? 0.6 + a.charge * 0.6 : 1);
    if (!e.takeHit({ dmg, kx, ky, kb, launch, stun: d.stun, heavy: !!d.heavy, crit, shock: !!d.shock, breakArmor: S.guardBreak >= 0.6, poise: 1 + S.guardBreak })) return;
    game.onEnemyHit(e, dmg, crit, d, kx, ky);
    HeroPassives.hit(this, e, dmg);   // passivas que reagem ao golpe (Ritmo Letal, Execução…)
    // A Tempestade Nula descarrega eletricidade no alvo
    if (arc) {
      const reach = Math.min(d.blade * 0.6, dist(this.x, this.y, e.x, e.y));
      game.arcs.spawn(this.x + Math.cos(a.dir) * reach * 0.5, this.y + Math.sin(a.dir) * reach * 0.5, 28,
        e.x, e.y, Math.min(e.height * 0.55, 46) + e.z, { w: d.heavy ? 2.2 : 1.5, life: d.heavy ? 0.2 : 0.13 });
    }
    if (this.stats.chain > 0 && Math.random() < this.stats.chain) this.chainLightning(e, dmg);
  }

  // Evolução "Arco Voltaico": o raio salta para o inimigo mais próximo
  chainLightning(src, dmg) {
    let best = null, bd = 200;
    for (const e of game.enemies) {
      if (e === src || !e.canBeHit()) continue;
      const d = dist(src.x, src.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return;
    const cd = Math.max(1, Math.round(dmg * 0.5 * (best.vulnerable || 1)));
    game.arcs.spawn(src.x, src.y, Math.min(src.height * 0.5, 40) + src.z, best.x, best.y, Math.min(best.height * 0.5, 40) + best.z,
      { w: 2.4, life: 0.24, rgb: '150,205,255' });
    const dx = best.x - src.x, dy = best.y - src.y, l = Math.hypot(dx, dy) || 1;
    if (best.takeHit({ dmg: cd, kx: dx / l, ky: dy / l, kb: 120, launch: 0, stun: 0.25, heavy: false, crit: false })) {
      game.onEnemyHit(best, cd, false, CHAIN_DEF, dx / l, dy / l);
    }
    game.audio.play('zap');
  }

  // Técnica "Corte do Vazio": onda elétrica perfurante em linha reta
  fireCrescent(dir) {
    const n = this.stats.voidSpread, spread = 0.3, big = this.stats.voidBig;
    for (let i = 0; i < n; i++) {
      const a = dir + (i - (n - 1) / 2) * spread;
      game.projectiles.spawn({
        x: this.x + Math.cos(a) * 30, y: this.y + Math.sin(a) * 30, z: 22,
        vx: Math.cos(a) * 680, vy: Math.sin(a) * 680, r: big ? 36 : 26,
        dmg: Math.round((big ? 34 : 24) * this.stats.dmgMult), hostile: false, kind: 'crescent', life: big ? 0.9 : 0.75, pierce: true,
      });
    }
    game.arcs.crackle(this.x + Math.cos(dir) * 36, this.y + Math.sin(dir) * 36, 24, 3, 40, '140,210,255');
    game.audio.play('zap');
  }

  // Técnica "Colapso Magnético": a lâmina crava no chão e libera raios em volta
  slamEffects(dir) {
    const x = this.x + Math.cos(dir) * 46, y = this.y + Math.sin(dir) * 46;
    game.particles.ring(x, y, 130, '60,130,255', 0.45, 12);
    game.particles.ring(x, y, 80, '200,230,255', 0.3, 6);
    game.particles.debris(x, y, 16);
    game.particles.dust(x, y, 14, 14, 160);
    game.particles.flash(x, y, 6, 90, '90,160,255', 0.18);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rand(-0.2, 0.2), r = rand(90, 130);
      game.arcs.spawn(x, y, 4, x + Math.cos(a) * r, y + Math.sin(a) * r, 2, { w: 2, life: 0.25, jag: 0.3 });
    }
    game.camera.shake(0.35);
    game.audio.play('stomp');
    game.audio.play('thunder', 0.5);
    game.room.addScorch(x, y, 60);
  }

  enterCharge() {
    this.state = 'charge'; this.stateTime = 0;
    this.chargeTime = 0; this.chargeLevel = 0;
    this.vx *= 0.3; this.vy *= 0.3;
  }

  updateCharge(dt, input, wd) {
    if (this.kit) { this.kit.updateCharge(this, dt, input, wd); return; }
    this.chargeTime += dt * this.stats.chargeSpeed;
    const lvl = this.chargeTime >= 0.95 ? 2 : this.chargeTime >= 0.4 ? 1 : 0;
    if (lvl > this.chargeLevel) {
      this.chargeLevel = lvl;
      game.audio.play('chargeTier', lvl);
      game.particles.flash(this.x, this.y, 30, lvl === 2 ? 70 : 45, lvl === 2 ? '170,215,255' : '80,150,255', 0.2);
      game.particles.ring(this.x, this.y, lvl === 2 ? 70 : 50, '110,180,255', 0.3, 4);
      game.arcs.crackle(this.x, this.y, 34, 2 + lvl * 2, 40 + lvl * 14, '150,205,255');
      game.audio.play('zap');
      game.camera.shake(0.06 * lvl);
      this.flash = 0.05;
    }
    if (Math.random() < 0.5 + lvl * 0.25) {
      game.particles.converge(this.x, this.y, 24, 1, 60 + lvl * 20, lvl === 2 ? '170,215,255' : '70,140,255', 0.35);
    }
    if (lvl === 2 && Math.random() < 0.18) game.arcs.crackle(this.x, this.y, 40, 1, 46, '150,205,255', 0.1);
    // Movimento lento e mira livre enquanto carrega
    let tvx = 0, tvy = 0;
    if (wd) {
      this.facing = angleLerp(this.facing, Math.atan2(wd.y, wd.x), 1 - Math.exp(-12 * dt));
      tvx = wd.x * this.baseSpeed * 0.3; tvy = wd.y * this.baseSpeed * 0.3;
    }
    this.vx = approach(this.vx, tvx, 1600 * dt);
    this.vy = approach(this.vy, tvy, 1600 * dt);
    if (this.dashBuffer > 0 && this.canDash()) { this.dashBuffer = 0; this.combo.reset(); this.startDash(wd); return; }
    if (!input.held.heavy) {
      const level = clamp(this.chargeTime / 0.95, 0, 1);
      this.combo.seq = '';
      const chargedId = this.def.id === 'lyra' ? 'lyra_charged' :
                        this.def.id === 'drakos' ? 'drakos_charged' :
                        this.def.id === 'sera' ? 'sera_charged' :
                        this.def.id === 'orion' ? 'orion_charged' : 'charged';
      this.startAttack(chargedId, null, level);
    }
  }

  startDash(wd) {
    let dx, dy;
    if (wd) { dx = wd.x; dy = wd.y; } else { dx = Math.cos(this.facing); dy = Math.sin(this.facing); }
    this.dashDirX = dx; this.dashDirY = dy;
    this.facing = Math.atan2(dy, dx);
    this.state = 'dash'; this.stateTime = 0;
    this.invuln = Math.max(this.invuln, (0.22 + this.stats.iframeBonus) * (1 + this.stats.perfectBonus));
    this.dashCd = 0.5 * this.stats.dashCdMult;
    this.dashStock = Math.max(0, this.dashStock - 1); this.dashGap = 0.12;
    this.ghostTimer = 0;
    this.squash = -0.1;
    game.audio.play('dash');
    game.particles.dust(this.x, this.y, 6, 8, 80);
    if (this.kit) this.kit.onDash(this);
  }

  updateDash(dt) {
    const dur = 0.17 * this.stats.dashMult;
    const t = clamp(this.stateTime / dur, 0, 1);
    const sp = 880 * (1 - t * t * 0.55);
    this.vx = this.dashDirX * sp; this.vy = this.dashDirY * sp;
    // Imagens residuais (afterimages)
    this.ghostTimer -= dt;
    if (this.ghostTimer <= 0) {
      this.ghostTimer = 0.028;
      const g = this.ghosts.find((q) => q.life <= 0) || this.ghosts[0];
      g.x = this.x; g.y = this.y; g.f = this.facing; g.life = 0.22;
    }
    if (this.stateTime >= dur) {
      this.state = 'idle';
      this.combo.dashWindow = 0.32;   // janela para a estocada (esquiva + leve)
      this.vx *= 0.35; this.vy *= 0.35;
    }
  }

  startSpecial() {
    if (this.kit) { this.kit.startUltimate(this); return; }   // suprema do personagem (tecla I)
    this.fury = Math.max(0, this.fury - this.ultCost());
    this.state = 'special'; this.stateTime = 0;
    this.specialFired = false;
    this.invuln = Math.max(this.invuln, 1.25);
    this.vx = this.vy = 0;
    if (this.attack && this.attack.trail) this.attack.trail.release();
    const ultName = this.def.id === 'lyra' ? 'FOCO DE BATALHA' :
                    this.def.id === 'drakos' ? 'ZONA DE IMPACTO' :
                    this.def.id === 'sera' ? 'CURA DE EMERGÊNCIA' :
                    this.def.id === 'orion' ? 'DANÇA DAS SOMBRAS' : 'ECLIPSE ABSOLUTO';
    game.hud.comboName(ultName, true);
    game.audio.play('specialCharge');
    game.camera.zoomPunch(0.05);
  }

  updateSpecial(dt) {
    if (this.kit) { this.kit.updateSpecial(this, dt); return; }
    const t = this.stateTime;
    this.vx = this.vy = 0;
    this.z = t < 0.45 ? easeOutCubic(t / 0.45) * 28 : Math.max(0, 28 - (t - 0.45) * 300);
    if (t < 0.45) {
      game.particles.converge(this.x, this.y, 30, 3, 170, '60,130,255', 0.4);
      if (Math.random() < 0.5) game.particles.converge(this.x, this.y, 30, 1, 120, '210,235,255', 0.35);
      if (Math.random() < 0.35) {
        const a = rand(0, TAU), r = rand(80, 170);
        game.arcs.spawn(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, rand(0, 60), this.x, this.y, 70, { w: 1.6, life: 0.12 });
      }
    }
    if (!this.specialFired && t >= 0.45) { this.specialFired = true; this.fireSpecial(); }
    if (t >= 1.05) { this.state = 'idle'; this.z = 0; }
  }

  // Especial "Eclipse Absoluto": libera toda a energia acumulada pela espada
  // (raios em todos os inimigos próximos, lâminas radiais e limpeza de projéteis)
  // — mas desperta algo adormecido dentro de Kael
  fireSpecial() {
    if (this.def.id === 'lyra') this.fireLyraUltimate();
    else if (this.def.id === 'drakos') this.fireDrakosUltimate();
    else if (this.def.id === 'sera') this.fireSeraUltimate();
    else if (this.def.id === 'orion') this.fireOrionUltimate();
    else this.fireKaelUltimate();
  }

  // Especial Kael: "Eclipse Absoluto"
  fireKaelUltimate() {
    const lv = Math.max(1, game.progress.lv('eclipse_absoluto'));
    const R = 270 + 30 * (lv - 1), base = (85 + 35 * (lv - 1)) * this.stats.power * (this.buffs.overload > 0 ? this.overloadMult : 1);
    for (const e of game.enemies) {
      if (!e.canBeHit()) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > R + e.radius) continue;
      const l = d || 1, kx = dx / l, ky = dy / l;
      const dmg = Math.max(1, Math.round(base * (1 - 0.4 * Math.min(1, d / R)) * rand(0.95, 1.05) * (e.vulnerable || 1)));
      game.arcs.spawn(this.x, this.y, 80, e.x, e.y, Math.min(e.height * 0.55, 50) + e.z, { w: 3, life: 0.35, jag: 0.26 });
      if (e.takeHit({ dmg, kx, ky, kb: 650, launch: 420, stun: 1.0, heavy: true, crit: false })) {
        game.onEnemyHit(e, dmg, false, SPECIAL_DEF, kx, ky);
      }
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + rand(-0.2, 0.2), r = rand(160, 280);
      game.arcs.spawn(this.x, this.y, 80, this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, 0, { w: 2.4, life: 0.3, jag: 0.3 });
    }
    game.projectiles.clearHostile(true);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      game.projectiles.spawn({
        x: this.x, y: this.y, z: 22, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, r: 18,
        dmg: Math.round(22 * this.stats.dmgMult), hostile: false, kind: 'blade', life: 0.62, pierce: true,
      });
    }
    const P_ = game.particles;
    P_.ring(this.x, this.y, R + 30, '50,120,255', 0.6, 16);
    P_.ring(this.x, this.y, R * 0.7, '200,230,255', 0.45, 10);
    P_.ring(this.x, this.y, R * 1.3, '20,50,160', 0.85, 8);
    P_.flash(this.x, this.y, 20, 300, '70,140,255', 0.35);
    P_.flash(this.x, this.y, 20, 140, '230,245,255', 0.2);
    for (let i = 0; i < 4; i++) P_.sparks(this.x, this.y, 20, (i / 4) * TAU, 16, '170,215,255', 700, 0.9);
    P_.embers(this.x, this.y, 0, 40, '80,150,255', 120, 160);
    P_.debris(this.x, this.y, 20);
    P_.dust(this.x, this.y, 20, 18, 260);
    game.startEclipseFx(this.x, this.y);
    game.camera.shake(0.9);
    game.camera.zoomPunch(0.09);
    game.addHitStop(0.14);
    game.flashScreen('110,165,255', 0.55);
    game.glitch(0.45);
    game.audio.play('special');
    game.audio.play('thunder');
    game.room.addScorch(this.x, this.y, 150);
    game.hud.whisper();
    if (lv >= 3) this.heal(Math.round(this.maxHp * 0.25));
  }

  // Especial Lyra: "Foco de Batalha"
  fireLyraUltimate() {
    this.buffs.lyraFocus = 4.5;
    game.slowMo(0.35, 4.0);
    const R = 300;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      game.projectiles.spawn({
        x: this.x + Math.cos(a) * 20, y: this.y + Math.sin(a) * 20, z: 26,
        vx: Math.cos(a) * 920, vy: Math.sin(a) * 920, r: 14,
        dmg: Math.round(55 * this.stats.dmgMult), hostile: false, kind: 'charged_arrow', life: 0.8, pierce: true,
      });
    }
    const P_ = game.particles;
    P_.ring(this.x, this.y, R, '166,77,255', 0.6, 16);
    P_.flash(this.x, this.y, 30, R, '210,140,255', 0.35);
    P_.sparks(this.x, this.y, 25, 0, 24, '190,110,255', 500, Math.PI);
    game.camera.shake(0.5);
    game.flashScreen('190,100,255', 0.4);
    game.audio.play('special');
    game.audio.play('thunder', 0.6);
  }

  // Especial Drakos: "Zona de Impacto"
  fireDrakosUltimate() {
    const R = 240, base = 140 * this.stats.power;
    for (const e of game.enemies) {
      if (!e.canBeHit()) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > R + e.radius) continue;
      const l = d || 1, kx = dx / l, ky = dy / l;
      const dmg = Math.max(1, Math.round(base * (1 - 0.3 * Math.min(1, d / R)) * (e.vulnerable || 1)));
      if (e.superArmor) e.superArmor = 0;
      if (e.takeHit({ dmg, kx, ky, kb: 560, launch: 420, stun: 1.2, heavy: true, crit: true })) {
        game.onEnemyHit(e, dmg, true, SPECIAL_DEF, kx, ky);
      }
    }
    game.projectiles.clearInRadius(this.x, this.y, R);
    const P_ = game.particles;
    P_.ring(this.x, this.y, R, '255,46,61', 0.65, 16);
    P_.ring(this.x, this.y, R * 0.6, '255,140,80', 0.45, 10);
    P_.flash(this.x, this.y, 20, R * 1.2, '255,80,60', 0.4);
    P_.debris(this.x, this.y, 28);
    P_.dust(this.x, this.y, 28, 20, 320);
    game.camera.shake(0.9);
    game.camera.zoomPunch(0.08);
    game.flashScreen('255,80,60', 0.45);
    game.audio.play('stomp');
    game.audio.play('thunder', 0.8);
    game.room.addScorch(this.x, this.y, R * 0.7);
  }

  // Especial Sera: "Cura de Emergência"
  fireSeraUltimate() {
    this.heal(Math.round(this.maxHp * 0.5), true);
    this.shieldHp = Math.max(this.shieldHp, Math.round(60 * this.stats.power));
    this.buffs.shield = 8;
    const R = 240, base = 75 * this.stats.power;
    for (const e of game.enemies) {
      if (!e.canBeHit()) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > R + e.radius) continue;
      const l = d || 1, kx = dx / l, ky = dy / l;
      const isMech = e.type === 'drone' || e.type === 'legionario' || e.type === 'rastejador' || e.isBoss;
      const stunDur = isMech ? 3.5 : 1.5;
      const dmg = Math.max(1, Math.round(base * (e.vulnerable || 1)));
      if (e.takeHit({ dmg, kx, ky, kb: 300, launch: 0, stun: stunDur, heavy: false, crit: false, shock: true })) {
        game.onEnemyHit(e, dmg, false, SPECIAL_DEF, kx, ky);
      }
    }
    game.projectiles.clearInRadius(this.x, this.y, R);
    const P_ = game.particles;
    P_.ring(this.x, this.y, R, '25,230,210', 0.6, 14);
    P_.ring(this.x, this.y, R * 0.6, '180,255,240', 0.45, 8);
    P_.flash(this.x, this.y, 25, R, '40,255,220', 0.35);
    game.camera.shake(0.35);
    game.flashScreen('40,255,220', 0.35);
    game.audio.play('memory');
    game.audio.play('chargeTier', 2);
  }

  // Especial Orion: "Dança das Sombras"
  fireOrionUltimate() {
    this.castOrionShadowDance(2, null);
  }

  addFury(n) { this.gainEnergy(n * this.stats.furyMult); }
  gainEnergy(n) {
    if (this.state === 'special') return;
    const before = this.fury;
    this.fury = Math.min(this.maxEnergy, this.fury + n);
    const cost = this.ultCost();
    if (before < cost && this.fury >= cost && this.ultLevel() > 0) {
      game.hud.furyReady(); game.audio.play('chargeTier', 2);
    }
  }

  applyLifesteal(dmg) {
    if (this.stats.lifesteal <= 0 || this.hp <= 0) return;
    this.lifestealAcc += dmg * this.stats.lifesteal;
    if (this.lifestealAcc >= 1) {
      const n = Math.floor(this.lifestealAcc);
      this.lifestealAcc -= n;
      this.heal(n, false);
    }
  }

  heal(n, fx = true) {
    if (this.state === 'dead') return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    const gained = Math.round(this.hp - before);
    if (fx && gained > 0) game.texts.spawn(this.x, this.y, 60, '+' + gained, '#5dff8a', 20);
  }

  takeDamage(dmg, sx, sy, kb = 260) {
    if (this.state === 'dead' || this.invuln > 0 || game.state !== 'playing') return false;
    dmg = Math.max(1, Math.round(dmg * Settings.diff.dmg * (1 - this.stats.armor) * (this.buffs.field > 0 ? 0.6 : 1) * (this.kit ? this.kit.damageTakenMult(this) : 1)));
    // Drakos: Escudo de Energia frontal bloqueia ataques frontais
    if (this.buffs.drakosShield > 0) {
      const hitAng = Math.atan2(sy - this.y, sx - this.x);
      const ad = Math.abs(angleDiff(this.facing, hitAng));
      if (ad < 1.6) {
        game.particles.sparks(this.x, this.y, 35, this.facing + Math.PI, 10, '255,80,60', 320, 1.2);
        game.particles.flash(this.x, this.y, 30, 60, '255,100,80', 0.15);
        game.audio.play('deflect');
        game.texts.spawn(this.x, this.y, 60, 'BLOQUEIO', '#ff7070', 16, 0.7);
        this.invuln = Math.max(this.invuln, 0.35);
        return true;
      }
    }
    // Orion: quebra de furtividade ao receber dano
    if (this.buffs.stealth > 0) {
      this.buffs.stealth = 0;
      game.texts.spawn(this.x, this.y, 50, 'FURTIVIDADE QUEBRADA', '#ff9f38', 14, 0.7);
    }
    // Escudo de Energia: absorve o dano antes da vida
    if (this.shieldHp > 0) {
      const ab = Math.min(this.shieldHp, dmg);
      this.shieldHp -= ab; dmg -= ab;
      game.particles.ring(this.x, this.y, 46, '90,240,210', 0.25, 4);
      game.texts.spawn(this.x, this.y, 60, `-${ab}`, '#7fffe0', 16, 0.6);
      game.audio.play('deflect');
      if (this.shieldHp <= 0) this.onBuffEnd('shield');
      if (dmg <= 0) { this.invuln = Math.max(this.invuln, 0.3); return true; }
    }
    dmg = Math.max(1, Math.round(dmg * HeroPassives.taken(this)));   // passivas defensivas das árvores
    this.hp -= dmg;
    if (this.hp <= 0 && HeroPassives.lethal(this)) this.hp = Math.max(1, this.hp);   // Último de Pé, Segundo Fôlego
    const dx = this.x - sx, dy = this.y - sy, l = Math.hypot(dx, dy) || 1;
    this.kbx += (dx / l) * kb; this.kby += (dy / l) * kb;
    this.flash = 0.12;
    this.invuln = 0.75;
    if (this.attack && this.attack.trail) this.attack.trail.release();
    this.combo.reset();
    game.onPlayerHurt(dmg, dx / l, dy / l);
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead'; this.stateTime = 0;
      game.onPlayerDeath();
    } else {
      this.state = 'hurt'; this.stateTime = 0;
      if (this.kit) this.kit.onHurt(this, dmg);
    }
    return true;
  }

  // ------------------------------------------------------- evolução e poderes
  // Recalcula os atributos a partir do nível, das evoluções, das habilidades
  // passivas e das escolhas da história (fill: começa com vida cheia)
  recalc(fill = false) {
    const pr = heroProgressOf(this), S = this.stats, L = pr.level - 1, PL = PROG.perLevel;   // Kael: game.progress
    const oldMax = this.maxHp;
    Object.assign(S, BASE_STATS);
    this.combo.unlocked.clear();
    S.dmgMult += PL.dmg * L; S.power += PL.power * L; S.armor += PL.def * L;
    S.cdr = Math.max(0.6, 1 - PL.cdr * L); S.speedMult += PL.mob * L; S.dashMult += PL.mob * L * 0.5;
    for (const u of UPGRADES) for (let i = game.upgrades.level(u.id); i > 0; i--) u.apply(this);
    const lv = (id) => pr.lv(id);
    let l;
    if ((l = lv('corte_eletrico'))) { S.lightMult += 0.08 * l; S.arcBonus += 0.12 * l; }
    if ((l = lv('pulso_fantasma')) >= 2) S.thrustMult = 1.4;
    if ((l = lv('esquiva_sombria'))) { S.dashCdMult *= 1 - 0.12 * l; S.iframeBonus += 0.04 * l; }
    if ((l = lv('passo_fantasma'))) S.dashCharges = 1 + l;
    if ((l = lv('reflexos'))) { S.perfectBonus += 0.3 * l; S.energyBonus += 8 * l; }
    if ((l = lv('lamina_giratoria')) >= 2) { S.spinHits = 4; S.spinMult = 1.3; }
    if ((l = lv('contra_ataque'))) S.counter = 0.4 * l;
    if ((l = lv('ruptura_guarda'))) S.guardBreak = 0.3 * l;
    if ((l = lv('corte_vazio'))) { S.voidSpread = l >= 2 ? 3 : 1; S.voidBig = l >= 3 ? 1 : 0; }
    if ((l = lv('drenagem'))) { S.furyMult += 0.3 * l; S.critHeal = l; }
    if ((l = lv('analise'))) { S.crit += 0.08 * l; S.eliteMult += 0.1 * l; S.showBars = 1; }
    if (this.kit) this.kit.passives(this, S, pr);   // passivas da árvore do personagem (as do Kael acima valem 0)
    const of = game.flags.oferta;
    if (of === 0) S.dmgMult += 0.15; else if (of === 1) S.hpBonus += 15; else if (of === 2) S.crit += 0.1;
    // Modificadores da armadura equipada (ARMOR_DEFS e armaduras especiais)
    const aid = typeof RosterManager !== 'undefined' ? RosterManager.equippedArmor(this.def.id) : null;
    const arm = aid && typeof ARMOR_DEFS !== 'undefined' && ARMOR_DEFS[aid];
    if (arm && arm.mods) {
      const m = arm.mods;
      if (m.hpBonus) S.hpBonus += m.hpBonus;
      if (m.energyBonus) S.energyBonus += m.energyBonus;
      if (m.armor) S.armor += m.armor;
      if (m.speedMult) S.speedMult += m.speedMult;
      if (m.dmgMult) S.dmgMult += m.dmgMult;
      if (m.crit) S.crit += m.crit;
      if (m.cdr) S.cdr = Math.max(0.3, S.cdr + m.cdr);
      if (m.counter) S.counter += m.counter;
      if (m.guardBreak) S.guardBreak += m.guardBreak;
    }
    // Modificadores da arma equipada (WEAPON_DEFS e armas especiais 3D)
    const wid = typeof RosterManager !== 'undefined' ? RosterManager.equippedWeapon(this.def.id) : null;
    const wep = wid && typeof WEAPON_DEFS !== 'undefined' && WEAPON_DEFS[wid];
    if (wep && wep.stats) {
      const ws = wep.stats;
      if (ws.dmg) S.dmgMult += (ws.dmg - 50) * 0.003;
      if (ws.crit) S.crit += ws.crit;
      if (ws.speed && ws.speed !== 1) S.speedMult += (ws.speed - 1);
      if (ws.cdr) S.cdr = Math.max(0.3, S.cdr + ws.cdr);
      if (ws.guardBreak) S.guardBreak += ws.guardBreak;
      if (ws.stun) S.guardBreak += ws.stun * 0.2;
      if (ws.chain) S.chain += ws.chain * 0.15;
    }
    HeroPassives.apply(this, S, pr);   // efeitos das passivas das árvores (js/heroes/passivas.js)
    S.armor = Math.min(0.75, S.armor);
    const B = this.def.stats;
    this.maxHp = Math.round(B.hp + PL.hp * L + S.hpBonus);
    this.maxEnergy = Math.round(B.energy + PL.energy * L + S.energyBonus);
    if (fill) this.hp = this.maxHp;
    else if (this.maxHp > oldMax) this.hp += this.maxHp - oldMax;
    this.hp = Math.min(this.hp, this.maxHp);
    this.fury = Math.min(this.fury, this.maxEnergy);
    this.dashStock = fill ? S.dashCharges : Math.min(this.dashStock, S.dashCharges);
  }

  canDash() { return this.dashStock >= 1 && this.dashGap <= 0; }
  canEclipse() {
    if (this.kit) return this.kit.canUltimate(this);
    if (this.def.id === DEFAULT_CHARACTER) return game.progress.lv('eclipse_absoluto') > 0 && this.fury >= SPECIAL_COST;
    return this.fury >= this.ultCost();
  }
  // Energia da suprema: 100; quem tem energia máxima menor (o Drakos começa com 90) usa a barra cheia
  ultCost() { return this.kit ? this.kit.ultCost() : Math.min(SPECIAL_COST, this.maxEnergy); }
  // Nível da suprema do personagem (Kael: Eclipse Absoluto; os aliados sem kit: sempre 1)
  ultLevel() { return this.kit ? this.kit.ultLevel(this) : this.def.id === DEFAULT_CHARACTER ? game.progress.lv('eclipse_absoluto') : 1; }
  denyEclipse() {
    if (this.kit) { this.kit.denyUltimate(this); return; }
    if (this.def.id !== DEFAULT_CHARACTER) game.hud.toast(`${heroUltInfo(this).name} bloqueado · Energia insuficiente (${this.ultCost()})`, '255,92,122');
    else if (!game.progress.lv('eclipse_absoluto')) game.hud.toast(`Eclipse Absoluto bloqueado · Árvore Elétrica (nível ${SKILLS.eclipse_absoluto.lvl})`, '255,92,122');
    game.hud.furyDenied();
    game.audio.play('uiDeny');
  }

  // Recargas, energia passiva, cargas de esquiva e efeitos ativos
  updateAbilities(dt) {
    const S = this.stats, b = this.buffs;
    const rate = b.sync > 0 ? 2.5 : 1;
    for (const id in this.cds) if (this.cds[id] > 0) this.cds[id] = Math.max(0, this.cds[id] - dt * rate);
    if (this.state !== 'dead') this.gainEnergy(S.regen * dt);
    if (this.dashGap > 0) this.dashGap -= dt;
    if (this.dashStock < S.dashCharges) this.dashStock = Math.min(S.dashCharges, this.dashStock + (dt * rate) / (0.5 * S.dashCdMult));
    if (this.counterT > 0) this.counterT -= dt;
    for (const k in b) {
      if (b[k] <= 0) continue;
      b[k] -= dt;
      if (b[k] <= 0) this.onBuffEnd(k);
    }
    if (b.field > 0) this.updateField(dt);
    if (b.supportDrone > 0) this.updateSupportDrone(dt);
    if (b.forceField > 0) this.updateForceField(dt);
    if (b.overload > 0 && Math.random() < dt * 12) {
      game.particles.sparks(this.x, this.y, rand(14, 50), rand(0, TAU), 1, '120,190,255', 160, Math.PI);
    }
    if (b.lyraFocus > 0 && Math.random() < dt * 12) {
      game.particles.sparks(this.x, this.y, rand(10, 40), rand(0, TAU), 1, '180,90,255', 180, Math.PI);
    }
  }

  onBuffEnd(k) {
    if (k === 'shield') {
      if (this.shieldHp > 0) game.particles.ring(this.x, this.y, 40, '90,240,210', 0.25, 3);
      this.shieldHp = 0;
    }
    this.buffs[k] = 0;
  }

  // Campo Magnético: eletrocuta quem está dentro e destrói projéteis hostis
  updateField(dt) {
    game.projectiles.clearInRadius(this.x, this.y, FIELD_R);
    this.fieldTick -= dt;
    if (this.fieldTick > 0) return;
    this.fieldTick = 0.25;
    const base = (10 + 5 * this.fieldLv) * 0.25 * this.stats.power;
    for (const e of game.enemies) {
      if (!e.canBeHit()) continue;
      const dx = e.x - this.x, dy = e.y - this.y, rr = FIELD_R + e.radius;
      if (dx * dx + dy * dy > rr * rr) continue;
      const l = Math.hypot(dx, dy) || 1;
      const dmg = Math.max(1, Math.round(base * this.targetMult(e) * (e.vulnerable || 1)));
      game.arcs.spawn(this.x, this.y, 30, e.x, e.y, Math.min(e.height * 0.5, 40) + e.z, { w: 1.4, life: 0.12, rgb: '150,205,255' });
      if (e.takeHit({ dmg, kx: dx / l, ky: dy / l, kb: 70, launch: 0, stun: 0.15, heavy: false, crit: false, shock: true })) {
        game.onEnemyHit(e, dmg, false, FIELD_DEF, dx / l, dy / l);
      }
    }
  }

  // Atalho k (0–3): dados da habilidade atribuída
  abilityInfo(k) {
    if (this.kit) return this.kit.abilityInfo(this, k);
    const pr = (typeof PartyProgress !== 'undefined' && PartyProgress.of(this.def.id)) || game.progress;
    let id = pr.slots ? pr.slots[k] : null;
    if (!id && this.def.abilities && this.def.abilities[k]) {
      id = this.def.abilities[k];
    }
    if (!id) return null;
    const S = (typeof skillDef === 'function' ? skillDef(id) : null) || (typeof SKILLS !== 'undefined' ? SKILLS[id] : null) || (typeof ABILITY_DEFS !== 'undefined' ? ABILITY_DEFS[id] : null);
    const A = typeof ABILITIES !== 'undefined' ? ABILITIES[id] : null;
    const lv = (pr && typeof pr.lv === 'function') ? (pr.lv(id) || 1) : 1;
    return { id, lv, S, A };
  }
  abilityCost(id) {
    const S = (typeof skillDef === 'function' ? skillDef(id) : null) || (typeof SKILLS !== 'undefined' ? SKILLS[id] : null) || (typeof ABILITY_DEFS !== 'undefined' ? ABILITY_DEFS[id] : null);
    if (!S) return 0;
    const cost = S.energy !== undefined && S.energy !== null ? S.energy : (S.cost !== undefined && S.cost !== null ? S.cost : 0);
    return Math.round(cost * (this.buffs.sync > 0 ? 0.5 : 1) * (this.stats.costMult || 1));
  }
  abilityReady(k) {
    const inf = this.abilityInfo(k);
    return !!(inf && inf.lv && inf.A && !(this.cds[inf.id] > 0) && this.fury >= this.abilityCost(inf.id));
  }
  isBuffSlot(k) { const inf = this.abilityInfo(k); return !!(inf && inf.A && inf.A.type === 'buff'); }

  // Usa a habilidade do atalho k; devolve true quando Kael entrou num golpe
  castAbility(k, wd) {
    const inf = this.abilityInfo(k);
    if (!inf || !inf.lv || !inf.A) {
      game.hud.toast('Atalho vazio · atribua uma habilidade ativa na árvore [Tab]');
      game.audio.play('uiDeny');
      return false;
    }
    if ((this.cds[inf.id] || 0) > 0) { game.hud.abilityDenied(k); game.audio.play('uiDeny'); return false; }
    const cost = this.abilityCost(inf.id);
    if (this.fury < cost) { game.hud.abilityDenied(k); game.hud.furyDenied(); game.audio.play('uiDeny'); return false; }
    if (!inf.A.cast(this, inf.lv, wd)) return false;
    this.fury -= cost;
    const cd = (inf.S && inf.S.cd !== undefined && inf.S.cd !== null) ? inf.S.cd : (inf.A.cooldown || 5);
    this.cds[inf.id] = cd * this.stats.cdr;
    game.hud.abilityUsed(k);
    const name = (inf.S && inf.S.name) ? inf.S.name : (inf.A && inf.A.name ? inf.A.name : inf.id);
    if (inf.A.type === 'buff') { game.hud.comboName(name.toUpperCase()); game.audio.play('comboName'); }
    return inf.A.type === 'attack';
  }

  // Alvo mais próximo dentro de um cone (score = distância + desvio angular)
  findTarget(dir, range, cone, angW = 60) {
    let best = null, bs = Infinity;
    for (const e of game.enemies) {
      if (!e.canBeHit()) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
      if (d > range + e.radius) continue;
      const ad = Math.abs(angleDiff(dir, Math.atan2(dy, dx)));
      if (ad > cone) continue;
      const s = d + ad * angW;
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  }

  // Corrente Relâmpago: o raio salta de inimigo em inimigo
  castChain(lv, wd) {
    const dir = wd ? Math.atan2(wd.y, wd.x) : this.facing;
    let cur = this.findTarget(dir, 340, Math.PI);
    if (!cur) { game.hud.toast('Nenhum alvo ao alcance'); game.audio.play('uiDeny'); return false; }
    this.facing = Math.atan2(cur.y - this.y, cur.x - this.x);
    this.startAttack('zap', null);
    const base = (22 + 10 * lv) * this.stats.power, hit = new Set();
    let sx = this.x, sy = this.y, sz = 52;
    for (let n = 0; n < 3 + lv && cur; n++) {
      hit.add(cur);
      const z = Math.min(cur.height * 0.55, 46) + cur.z;
      game.arcs.spawn(sx, sy, sz, cur.x, cur.y, z, { w: 3, life: 0.34, jag: 0.28, rgb: '160,215,255' });
      game.particles.flash(cur.x, cur.y, z, 44, '200,230,255', 0.14);
      const dx = cur.x - sx, dy = cur.y - sy, l = Math.hypot(dx, dy) || 1;
      const dmg = Math.max(1, Math.round(base * this.targetMult(cur) * (cur.vulnerable || 1) * rand(0.92, 1.08)));
      if (cur.takeHit({ dmg, kx: dx / l, ky: dy / l, kb: 160, launch: 0, stun: 0.55, heavy: false, crit: false, shock: true })) {
        game.onEnemyHit(cur, dmg, false, ABILITY_DEF, dx / l, dy / l);
      }
      sx = cur.x; sy = cur.y; sz = z;
      let nx = null, nd = 250;
      for (const e of game.enemies) {
        if (hit.has(e) || !e.canBeHit()) continue;
        const d = dist(sx, sy, e.x, e.y);
        if (d < nd) { nd = d; nx = e; }
      }
      cur = nx;
    }
    game.audio.play('thunder', 0.45);
    game.audio.play('zap');
    game.camera.shake(0.22);
    game.flashScreen('150,200,255', 0.12);
    return true;
  }

  // Ecos sombrios ao longo de um deslocamento instantâneo
  trailGhosts(x0, y0, x1, y1, f) {
    for (let i = 0; i < 6; i++) {
      const g = this.ghosts[i], k = i / 6;
      g.x = lerp(x0, x1, k); g.y = lerp(y0, y1, k); g.f = f; g.life = 0.16 + k * 0.08;
    }
  }

  // Investida Sombria: surge ao lado do inimigo à frente e golpeia
  castLunge(lv, wd) {
    const dir = wd ? Math.atan2(wd.y, wd.x) : this.facing;
    const t = this.findTarget(dir, 300 + 60 * lv, 1.15, 90);
    if (!t) { game.hud.toast('Nenhum alvo à frente'); game.audio.play('uiDeny'); return false; }
    const a = Math.atan2(t.y - this.y, t.x - this.x);
    const d = Math.max(0, dist(this.x, this.y, t.x, t.y) - (t.radius + this.radius + 6));
    const x0 = this.x, y0 = this.y;
    this.x += Math.cos(a) * d; this.y += Math.sin(a) * d;
    game.room.collide(this, true);
    this.trailGhosts(x0, y0, this.x, this.y, a);
    game.arcs.spawn(x0, y0, 30, this.x, this.y, 30, { w: 2, life: 0.22, rgb: '190,150,255' });
    game.particles.ring(x0, y0, 40, '170,120,255', 0.3, 4);
    game.particles.smoke(x0, y0, 10, 6, '30,16,50', 14);
    this.invuln = Math.max(this.invuln, 0.3);
    ATTACKS.lunge.dmg = 35 + 15 * lv;
    this.facing = a;
    this.startAttack('lunge', null);
    game.audio.play('dash');
    return true;
  }

  // Salto Dimensional: teletransporte na direção do movimento, com descargas
  castBlink(lv, wd) {
    const a = wd ? Math.atan2(wd.y, wd.x) : this.facing, room = game.room;
    let d = 180 + 40 * lv;
    while (d > 30 && !room.canStand(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, this.radius)) d -= 10;
    if (d <= 30) { game.hud.toast('Sem espaço para o salto'); game.audio.play('uiDeny'); return false; }
    const x0 = this.x, y0 = this.y;
    if (this.attack && this.attack.trail) this.attack.trail.release();
    this.blinkBurst(x0, y0, lv);
    this.x += Math.cos(a) * d; this.y += Math.sin(a) * d;
    this.trailGhosts(x0, y0, this.x, this.y, a);
    this.facing = a; this.vx = this.vy = this.kbx = this.kby = 0;
    this.invuln = Math.max(this.invuln, 0.35);
    this.blinkBurst(this.x, this.y, lv);
    game.arcs.spawn(x0, y0, 30, this.x, this.y, 30, { w: 2.6, life: 0.26, rgb: '200,170,255' });
    this.state = 'idle'; this.stateTime = 0;
    this.combo.dashWindow = 0.32;   // pode emendar Pulso Fantasma ou Corte do Vazio
    game.hud.comboName('SALTO DIMENSIONAL');
    game.audio.play('dash'); game.audio.play('zap');
    game.glitch(0.12);
    return true;
  }
  blinkBurst(x, y, lv) {
    const R = 95, base = (30 + 15 * lv) * this.stats.power;
    game.particles.ring(x, y, R, '180,140,255', 0.35, 6);
    game.particles.flash(x, y, 30, 70, '210,190,255', 0.16);
    game.arcs.crackle(x, y, 30, 4, R * 0.8, '190,160,255', 0.16);
    for (const e of game.enemies) {
      if (!e.canBeHit()) continue;
      const dx = e.x - x, dy = e.y - y, rr = R + e.radius;
      if (dx * dx + dy * dy > rr * rr) continue;
      const l = Math.hypot(dx, dy) || 1;
      const dmg = Math.max(1, Math.round(base * this.targetMult(e) * (e.vulnerable || 1) * rand(0.92, 1.08)));
      if (e.takeHit({ dmg, kx: dx / l, ky: dy / l, kb: 320, launch: 0, stun: 0.5, heavy: false, crit: false, shock: true })) {
        game.onEnemyHit(e, dmg, false, ABILITY_DEF, dx / l, dy / l);
      }
    }
  }

  // Arco Voltaico: projéteis elétricos perfurantes
  fireVolt(dir) {
    const lv = game.progress.lv('arco_voltaico') || 1, n = lv >= 3 ? 3 : 1;
    const dmg = Math.round((26 + 10 * lv) * this.stats.power);
    for (let i = 0; i < n; i++) {
      const a = dir + (i - (n - 1) / 2) * 0.24;
      game.projectiles.spawn({
        x: this.x + Math.cos(a) * 34, y: this.y + Math.sin(a) * 34, z: 30,
        vx: Math.cos(a) * 880, vy: Math.sin(a) * 880, r: 16,
        dmg, hostile: false, kind: 'volt', life: 0.6, pierce: true,
      });
    }
    game.arcs.crackle(this.x + Math.cos(dir) * 40, this.y + Math.sin(dir) * 40, 30, 3, 36, '150,210,255');
    game.audio.play('zap');
    game.audio.play('thunder', 0.25);
  }

  // Ruptura de Plasma: a energia acumulada explode em volta de Kael
  plasmaEffects() {
    const R = ATTACKS.plasma.shape.radius, P_ = game.particles;
    P_.ring(this.x, this.y, R, '90,170,255', 0.5, 12);
    P_.ring(this.x, this.y, R * 0.6, '220,240,255', 0.35, 6);
    P_.flash(this.x, this.y, 20, R * 1.2, '110,180,255', 0.22);
    P_.debris(this.x, this.y, 14);
    P_.dust(this.x, this.y, 16, 14, 220);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + rand(-0.2, 0.2), r = R * rand(0.7, 1.05);
      game.arcs.spawn(this.x, this.y, 20, this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, 4, { w: 2.2, life: 0.28, jag: 0.3 });
    }
    game.projectiles.clearInRadius(this.x, this.y, R);
    game.camera.shake(0.5);
    game.flashScreen('140,190,255', 0.25);
    game.audio.play('thunder', 0.7);
    game.audio.play('stomp');
    game.room.addScorch(this.x, this.y, R * 0.6);
  }

  // Lyra Kaede: disparos do Arco de Fóton
  fireArrow(dir, dmg, pierce = false, isCharged = false) {
    const isFocus = this.buffs.lyraFocus > 0;
    const spd = isCharged ? 1150 : 960;
    const d = Math.round(dmg * this.stats.dmgMult * (isCharged ? 1.6 : 1) * (isFocus ? 1.35 : 1));
    const k = isCharged ? 'charged_arrow' : (pierce ? 'pierce_arrow' : 'arrow');
    game.projectiles.spawn({
      x: this.x + Math.cos(dir) * 26, y: this.y + Math.sin(dir) * 26, z: 24,
      vx: Math.cos(dir) * spd, vy: Math.sin(dir) * spd, r: isCharged ? 18 : 12,
      dmg: d, hostile: false, kind: k, life: 0.85, pierce: !!pierce, crit: isFocus,
    });
    game.audio.play(isCharged ? 'specialCharge' : 'swing');
    if (isCharged) game.camera.shake(0.12);
  }

  fireArrowBurst(dir, dmg) {
    const isFocus = this.buffs.lyraFocus > 0;
    const spread = 0.18;
    for (let i = -1; i <= 1; i++) {
      const a = dir + i * spread;
      const d = Math.round(dmg * this.stats.dmgMult * (isFocus ? 1.35 : 1));
      game.projectiles.spawn({
        x: this.x + Math.cos(a) * 24, y: this.y + Math.sin(a) * 24, z: 24,
        vx: Math.cos(a) * 980, vy: Math.sin(a) * 980, r: 12,
        dmg: d, hostile: false, kind: 'arrow', life: 0.75, pierce: false, crit: isFocus,
      });
    }
    game.audio.play('swing');
  }

  fireExplosiveArrow(dir, dmg) {
    const isFocus = this.buffs.lyraFocus > 0;
    const d = Math.round(dmg * this.stats.dmgMult * (isFocus ? 1.4 : 1));
    game.projectiles.spawn({
      x: this.x + Math.cos(dir) * 28, y: this.y + Math.sin(dir) * 28, z: 24,
      vx: Math.cos(dir) * 920, vy: Math.sin(dir) * 920, r: 16,
      dmg: d, hostile: false, kind: 'explosive_arrow', life: 0.9, pierce: false, crit: isFocus,
    });
    game.audio.play('specialCharge');
  }

  // Sera Vyne: Disparo tecnomante de orbe de plasma
  fireTechOrb(dir, dmg) {
    const d = Math.round(dmg * this.stats.dmgMult);
    game.projectiles.spawn({
      x: this.x + Math.cos(dir) * 26, y: this.y + Math.sin(dir) * 26, z: 24,
      vx: Math.cos(dir) * 760, vy: Math.sin(dir) * 760, r: 18,
      dmg: d, hostile: false, kind: 'tech_orb', life: 0.8, pierce: false,
    });
    game.audio.play('zap');
  }

  // Orion: Lâmina Fantasma perfurante
  firePhantomBlade(dir, dmg) {
    const isStealth = this.buffs.stealth > 0;
    const d = Math.round(dmg * this.stats.dmgMult * (isStealth ? 1.8 : 1));
    game.projectiles.spawn({
      x: this.x + Math.cos(dir) * 26, y: this.y + Math.sin(dir) * 26, z: 24,
      vx: Math.cos(dir) * 920, vy: Math.sin(dir) * 920, r: 16,
      dmg: d, hostile: false, kind: 'phantom_blade', life: 0.75, pierce: true,
    });
    game.audio.play('thrust');
  }

  // Sera Vyne: Hack de Sistema (Pulso EMP)
  castSeraHack(lv, wd) {
    const R = 230 + 30 * lv, base = (35 + 15 * lv) * this.stats.power;
    game.particles.ring(this.x, this.y, R, '30,230,210', 0.45, 12);
    game.particles.ring(this.x, this.y, R * 0.6, '180,255,240', 0.3, 6);
    game.particles.flash(this.x, this.y, 25, R * 0.9, '40,255,220', 0.2);
    game.projectiles.clearInRadius(this.x, this.y, R);
    for (const e of game.enemies) {
      if (!e.canBeHit()) continue;
      const dx = e.x - this.x, dy = e.y - this.y, rr = R + e.radius;
      if (dx * dx + dy * dy > rr * rr) continue;
      const l = Math.hypot(dx, dy) || 1;
      const isMech = e.type === 'drone' || e.type === 'legionario' || e.type === 'rastejador' || e.isBoss;
      const stunTime = isMech ? 3.5 : 1.6;
      const dmg = Math.max(1, Math.round(base * (isMech ? 1.6 : 1.0) * (e.vulnerable || 1)));
      game.arcs.spawn(this.x, this.y, 35, e.x, e.y, Math.min(e.height * 0.5, 40) + e.z, { w: 2.2, life: 0.22, rgb: '40,255,220' });
      if (e.takeHit({ dmg, kx: dx / l, ky: dy / l, kb: 160, launch: 0, stun: stunTime, heavy: false, crit: false, shock: true })) {
        game.onEnemyHit(e, dmg, false, ABILITY_DEF, dx / l, dy / l);
      }
    }
    game.audio.play('zap');
    game.audio.play('thunder', 0.35);
    game.camera.shake(0.25);
    game.flashScreen('40,255,220', 0.15);
    return true;
  }

  // Orion: Dança das Sombras (Omnislash de 6 ataques)
  castOrionShadowDance(lv, wd) {
    const hits = 6;
    let targets = game.enemies.filter(e => e.canBeHit() && dist(this.x, this.y, e.x, e.y) < 380);
    if (!targets.length) targets = game.enemies.filter(e => e.canBeHit());
    const base = (45 + 15 * lv) * this.stats.power;
    const startX = this.x, startY = this.y;

    for (let i = 0; i < hits; i++) {
      const target = targets.length ? targets[i % targets.length] : null;
      const tx = target ? target.x + rand(-20, 20) : startX + Math.cos((i / hits) * TAU) * 120;
      const ty = target ? target.y + rand(-20, 20) : startY + Math.sin((i / hits) * TAU) * 120;
      setTimeout(() => {
        if (game.state !== 'playing') return;
        const x0 = this.x, y0 = this.y;
        this.x = tx; this.y = ty;
        game.room.collide(this, true);
        this.trailGhosts(x0, y0, this.x, this.y, Math.atan2(this.y - y0, this.x - x0));
        game.arcs.spawn(x0, y0, 25, this.x, this.y, 25, { w: 2.5, life: 0.2, rgb: '255,160,50' });
        game.particles.sparks(this.x, this.y, 25, rand(0, TAU), 12, '255,150,40', 400, Math.PI);
        game.particles.flash(this.x, this.y, 25, 70, '255,180,60', 0.15);
        if (target && target.canBeHit()) {
          const dmg = Math.max(1, Math.round(base * rand(0.95, 1.15)));
          target.takeHit({ dmg, kx: 0, ky: 0, kb: 120, launch: 40, stun: 0.4, heavy: true, crit: true });
          game.onEnemyHit(target, dmg, true, SPECIAL_DEF, 0, 0);
        }
        game.audio.play('thrust');
        game.audio.play('swingHeavy');
        game.camera.shake(0.2);
      }, i * 90);
    }
    this.invuln = Math.max(this.invuln, 0.7);
    return true;
  }

  // Sera Vyne: Drone de Suporte S-01
  updateSupportDrone(dt) {
    this._droneAng = (this._droneAng || 0) + dt * 3.2;
    this._droneShotT = (this._droneShotT || 0) - dt;
    if (this._droneShotT <= 0) {
      this._droneShotT = 0.75;
      const target = this.findTarget(this.facing, 300, Math.PI);
      if (target) {
        const rad = 42;
        const dx = this.x + Math.cos(this._droneAng) * rad;
        const dy = this.y + Math.sin(this._droneAng) * rad;
        const a = Math.atan2(target.y - dy, target.x - dx);
        game.projectiles.spawn({
          x: dx, y: dy, z: 38,
          vx: Math.cos(a) * 880, vy: Math.sin(a) * 880, r: 12,
          dmg: Math.round(20 * this.stats.power), hostile: false, kind: 'drone_laser', life: 0.6, pierce: false,
        });
        game.arcs.spawn(dx, dy, 38, target.x, target.y, Math.min(target.height * 0.5, 30) + target.z, { w: 1.5, life: 0.1, rgb: '40,255,220' });
        game.audio.play('zap', 0.5);
      }
    }
  }

  // Sera Vyne: Campo de Força de absorção e bloqueio de projéteis
  updateForceField(dt) {
    const R = 130;
    game.projectiles.clearInRadius(this.x, this.y, R);
    if (Math.random() < dt * 8) {
      const q = rand(0, TAU);
      game.arcs.spawn(this.x + Math.cos(q) * R, this.y + Math.sin(q) * R, 10,
        this.x + Math.cos(q + 0.6) * R, this.y + Math.sin(q + 0.6) * R, 10, { w: 1.4, life: 0.12, rgb: '40,255,220' });
    }
  }

  // Bônus contra o alvo: Sobrecarga, Análise (elites/chefes), Ruptura de Guarda (blindados)
  targetMult(e) {
    const S = this.stats;
    let m = this.buffs.overload > 0 ? this.overloadMult : 1;
    if (e.elite || e.isBoss) m *= S.eliteMult;
    if (e.isBoss || e.type === 'legionario' || e.superArmor) m *= 1 + S.guardBreak;
    return m * HeroPassives.dealt(this, e);   // passivas das árvores (js/heroes/passivas.js)
  }

  // Efeitos visíveis das habilidades ativas e da armadura equipada (camada emissiva, coordenadas de mundo)
  drawAura(ctx, t) {
    if (this.kit) this.kit.drawAura(this, ctx, t);
    const b = this.buffs;
    const aid = (typeof RosterManager !== 'undefined' && this.def) ? RosterManager.equippedArmor(this.def.id) : null;
    const aDef = (aid && typeof ARMOR_DEFS !== 'undefined') ? ARMOR_DEFS[aid] : null;
    const armorTint = aDef && aDef.visual && aDef.visual.tint;

    if (!(b.field > 0 || b.shield > 0 || b.overload > 0 || b.sync > 0 || b.forceField > 0 || b.drakosShield > 0 || b.lyraFocus > 0 || b.stealth > 0 || b.supportDrone > 0 || armorTint)) return;
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Halo e fumaça/vapor energéticos da armadura na cor do tema
    if (armorTint && typeof hexToRgb !== 'undefined') {
      const aRgb = hexToRgb(armorTint);
      if (aRgb) {
        GlowCache.drawFlat(ctx, aRgb, sx, sy, 30, 0.18 + 0.06 * Math.sin(t * 3));
        ctx.strokeStyle = rgba(aRgb, 0.4 + 0.15 * Math.sin(t * 3));
        ctx.lineWidth = 1.2;
        isoCirclePath(ctx, this.x, this.y, 20 + Math.sin(t * 2) * 1.5);
        ctx.stroke();
        // Partículas sutis de vapor energético ascendente
        if (Math.random() < 0.18 && typeof game !== 'undefined' && game.particles) {
          game.particles.spawn(this.x + rand(-8, 8), this.y + rand(-8, 8), rand(2, 10), {
            vx: rand(-6, 6), vy: rand(-6, 6), vz: rand(18, 38),
            life: rand(0.3, 0.5), size: rand(2, 3.5), rgb: aRgb
          });
        }
      }
    }
    if (b.field > 0) {
      const a = Math.min(1, b.field * 2);
      GlowCache.drawFlat(ctx, '70,140,255', sx, sy, FIELD_R * 1.7, 0.2 * a);
      ctx.strokeStyle = rgba('140,200,255', 0.6 * a); ctx.lineWidth = 2;
      isoCirclePath(ctx, this.x, this.y, FIELD_R); ctx.stroke();
      ctx.setLineDash([10, 14]); ctx.lineDashOffset = -t * 70;
      ctx.strokeStyle = rgba('200,230,255', 0.45 * a);
      isoCirclePath(ctx, this.x, this.y, FIELD_R * 0.7); ctx.stroke();
      ctx.setLineDash([]);
      if (Math.random() < 0.35) {
        const q = rand(0, TAU), q2 = q + rand(0.4, 0.9);
        game.arcs.spawn(this.x + Math.cos(q) * FIELD_R, this.y + Math.sin(q) * FIELD_R, 6,
          this.x + Math.cos(q2) * FIELD_R, this.y + Math.sin(q2) * FIELD_R, 6, { w: 1.3, life: 0.1, rgb: '150,205,255' });
      }
    }
    // Sera: Domo do Campo de Força
    if (b.forceField > 0) {
      const a = Math.min(1, b.forceField * 2);
      const R = 130;
      GlowCache.drawFlat(ctx, '30,230,210', sx, sy, R * 1.5, 0.22 * a);
      ctx.strokeStyle = rgba('50,255,230', 0.7 * a); ctx.lineWidth = 2.4;
      isoCirclePath(ctx, this.x, this.y, R); ctx.stroke();
      ctx.setLineDash([14, 10]); ctx.lineDashOffset = t * 60;
      ctx.strokeStyle = rgba('180,255,245', 0.5 * a);
      isoCirclePath(ctx, this.x, this.y, R * 0.85); ctx.stroke();
      ctx.setLineDash([]);
    }
    // Sera: Drone de Suporte S-01 orbitando
    if (b.supportDrone > 0) {
      const rad = 42, dang = this._droneAng || 0;
      const dpx = this.x + Math.cos(dang) * rad, dpy = this.y + Math.sin(dang) * rad;
      const dsx = isoX(dpx, dpy), dsy = isoY(dpx, dpy) - 34;
      GlowCache.draw(ctx, '40,255,220', dsx, dsy, 26, 0.6);
      ctx.fillStyle = '#40ffdc';
      ctx.beginPath(); ctx.arc(dsx, dsy, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8fffa';
      ctx.beginPath(); ctx.arc(dsx, dsy, 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(64,255,220,0.5)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(dsx, dsy); ctx.lineTo(dsx - Math.cos(dang) * 8, dsy - Math.sin(dang) * 4); ctx.stroke();
    }
    // Drakos: Escudo Frontal de Energia
    if (b.drakosShield > 0) {
      const a = Math.min(1, b.drakosShield * 2);
      const f = this.facing, R = 38;
      GlowCache.draw(ctx, '255,80,60', sx, sy - 28, 55, 0.3 * a);
      ctx.strokeStyle = rgba('255,100,70', 0.85 * a); ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = -3; i <= 3; i++) {
        const q = f + (i / 3) * 0.75;
        const px = sx + Math.cos(q) * R, py = sy - 28 + Math.sin(q) * R * 0.65;
        if (i === -3) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // Lyra: Foco de Batalha (aura de precisão roxa)
    if (b.lyraFocus > 0) {
      const a = Math.min(1, b.lyraFocus * 2);
      GlowCache.drawFlat(ctx, '180,90,255', sx, sy, 55, 0.35 * a);
      ctx.strokeStyle = rgba('210,140,255', 0.6 * a); ctx.lineWidth = 1.5;
      isoCirclePath(ctx, this.x, this.y, 28 + Math.sin(t * 8) * 3); ctx.stroke();
    }
    // Orion: Furtividade Sombria
    if (b.stealth > 0) {
      GlowCache.drawFlat(ctx, '140,60,220', sx, sy, 38, 0.25 + 0.1 * Math.sin(t * 5));
    }
    if (b.shield > 0 && this.shieldHp > 0) {
      const a = 0.4 + 0.15 * Math.sin(t * 6), cy = sy - this.z - 34, R = 34;
      GlowCache.draw(ctx, '60,220,190', sx, cy, 60, 0.22);
      ctx.strokeStyle = rgba('120,255,220', a); ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const q = (i / 6) * TAU + t * 0.6;
        const x = sx + Math.cos(q) * R, y = cy + Math.sin(q) * R * 1.25;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = rgba('120,255,220', a * 0.4);
      ctx.beginPath(); ctx.ellipse(sx, cy, R * 0.9, R * 1.12, 0, 0, TAU); ctx.stroke();
    }
    if (b.overload > 0) GlowCache.draw(ctx, '80,150,255', sx, sy - this.z - 30, 76, 0.22 + 0.1 * Math.sin(t * 22));
    if (b.sync > 0) {
      ctx.strokeStyle = 'rgba(90,240,210,0.5)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.9 + i * 0.5) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.ellipse(sx, sy - this.z - k * 60, 26 + k * 10, 9 + k * 4, 0, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ desenho
  draw(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y) - this.z;
    if (this.kit) { this.kit.draw(this, ctx, sx, sy); return; }   // modelo/desenho do personagem
    if (this.def.id === DEFAULT_CHARACTER && KaelArt.active()) { KaelArt.drawPlayer(ctx, this, sx, sy); return; }   // sprites da arte oficial: só o Kael
    if (game.use3D && this.spr && this.spr.ok) { this.draw3D(ctx, sx, sy); return; }
    // Imagens residuais da esquiva (silhuetas de eletricidade azul)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of this.ghosts) {
      if (g.life <= 0) continue;
      ctx.globalAlpha = (g.life / 0.22) * 0.38;
      this.drawKael(ctx, isoX(g.x, g.y), isoY(g.x, g.y), GHOST_PAL, g.f, false);
    }
    ctx.restore();

    const blink = this.invuln > 0 && this.state === 'hurt' || (this.invuln > 0 && this.state !== 'dash' && this.state !== 'special' && this.state !== 'dead' && Math.floor(this.invuln * 18) % 2 === 0);
    ctx.save();
    if (blink) ctx.globalAlpha = 0.55;
    if (this.state === 'dead') {
      // Cai de lado lentamente
      const k = easeOutCubic(Math.min(1, this.stateTime / 0.6));
      const side = worldAngleToScreen(this.facing, this.tmp2).x >= 0 ? 1 : -1;
      ctx.translate(sx, sy);
      ctx.rotate(-side * k * 1.45);
      this.drawKael(ctx, 0, 0, this.flash > 0 ? FLASH_PAL : PLAYER_PAL, this.facing, true);
    } else {
      this.drawKael(ctx, sx, sy, this.flash > 0 ? FLASH_PAL : PLAYER_PAL, this.facing, true);
    }
    ctx.restore();
  }

  // Versão 3D: fantasmas da esquiva, o modelo e os halos (marca do pulso, lâmina)
  blinking() {
    return this.invuln > 0 && this.state === 'hurt' || (this.invuln > 0 && this.state !== 'dash' && this.state !== 'special' && this.state !== 'dead' && Math.floor(this.invuln * 18) % 2 === 0);
  }
  draw3D(ctx, sx, sy) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of this.ghosts) {
      if (g.life <= 0 || !g.spr || !g.spr.ok) continue;
      ctx.globalAlpha = (g.life / 0.22) * 0.6;
      R3D.blit(ctx, g.spr, isoX(g.x, g.y), isoY(g.x, g.y));
    }
    ctx.restore();
    ctx.save();
    if (this.blinking()) ctx.globalAlpha = 0.55;
    R3D.blit(ctx, this.spr, sx, sy);
    ctx.restore();
    const mk0 = this.def ? (this.def.model || this.def.id || 'kael') : 'kael';
    // halos do modelo que foi desenhado (o texturizado, quando é ele: as âncoras são as dele)
    game.glows3D(ctx, this.mk3 && MODELS3D[this.mk3] && MODELS3D[this.mk3].glows ? this.mk3 : mk0, this, this.spr, sx, sy);
  }
  // Partes luminosas do modelo (desenhadas depois da escuridão)
  drawEmissive(ctx) {
    if (this.kit) { this.kit.drawEmissive(this, ctx); return; }
    if (this.def.id === DEFAULT_CHARACTER && KaelArt.active()) { KaelArt.drawEmissive(ctx, this, isoX(this.x, this.y), isoY(this.x, this.y) - this.z); return; }
    if (!game.use3D || !this.spr || !this.spr.ok) return;
    R3D.blitEmissive(ctx, this.spr, isoX(this.x, this.y), isoY(this.x, this.y) - this.z, this.blinking() ? 0.55 : 1);
  }

  // Kael Veyron procedural: casaco negro longo com fivelas, cabelo preto sobre os
  // olhos, marca azul pulsando no pulso esquerdo e a espada Tempestade Nula
  drawKael(ctx, sx, sy, pal, facing, withSword) {
    const f = worldAngleToScreen(facing, this.tmp2);
    const fl = Math.hypot(f.x, f.y) || 1;
    const fdx = f.x / fl, fdy = f.y / fl;
    const side = fdx >= 0 ? 1 : -1;
    const back = fdy < -0.25;
    const moving = this.state === 'run' && this.moveSpeed > 30;
    const t = this.animTime;
    const run = moving ? Math.sin(t * 13) : 0;
    const bob = moving ? Math.abs(Math.cos(t * 13)) * 2.4 : Math.sin(t * 2.2) * 0.8;
    const sq = this.squash;
    const isMain = pal === PLAYER_PAL;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1 - sq * 0.5, 1 + sq);

    // Espada atrás do corpo quando aponta para longe da câmera
    const sword = withSword ? this.swordPose(side, bob) : null;
    if (sword && sword.behind) this.drawSword(ctx, sword, pal);

    const speedK = Math.min(1, this.moveSpeed / this.baseSpeed);
    const sway = -side * speedK * 9 + Math.sin(t * 3.1) * 1.4 + (this.state === 'dash' ? -side * 6 : 0);
    const y0 = -18 - bob, y1 = -40 - bob;   // cintura e ombros

    // Abas do casaco longo (esvoaçam com o movimento), com a barra rasgada
    const tails = (fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(-10, y1 + 2); ctx.lineTo(10, y1 + 2);
      ctx.lineTo(12 + sway * 0.5, y0 + 4);
      ctx.lineTo(14 + sway, -3); ctx.lineTo(10 + sway, -7); ctx.lineTo(7 + sway, -1);
      ctx.lineTo(2 + sway, -6); ctx.lineTo(-3 + sway, 0); ctx.lineTo(-7 + sway, -6);
      ctx.lineTo(-14 + sway, -2);
      ctx.lineTo(-12 + sway * 0.5, y0 + 4);
      ctx.closePath(); ctx.fill();
    };
    if (!back) tails(pal.coatDark);

    // Pernas e botas pesadas com fivelas
    const stride = run * 4;
    const la = Math.max(0, run) * 2, lb = Math.max(0, -run) * 2;
    ctx.fillStyle = pal.pants;
    ctx.fillRect(-6 + stride * 0.5, -17 - bob * 0.3 - la, 5, 13);
    ctx.fillRect(1 - stride * 0.5, -17 - bob * 0.3 - lb, 5, 13);
    ctx.fillStyle = pal.boot;
    ctx.fillRect(-7 + stride * 0.5, -6 - la, 7, 6);
    ctx.fillRect(0 - stride * 0.5, -6 - lb, 7, 6);
    ctx.fillStyle = pal.buckle;
    ctx.fillRect(-6 + stride * 0.5, -5 - la, 5, 1);
    ctx.fillRect(1 - stride * 0.5, -5 - lb, 5, 1);

    // Braço livre (esquerdo), com a marca azul no pulso
    const freeX = -side * 12 + (moving ? -run * 2 : 0), freeY = y0 + 1;
    const drawFreeArm = () => {
      ctx.strokeStyle = pal.coat; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-side * 9, y1 + 4); ctx.lineTo(freeX, freeY); ctx.stroke();
      ctx.strokeStyle = pal.strap; ctx.lineWidth = 5.4; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(freeX + side * 0.4, freeY - 5); ctx.lineTo(freeX + side * 0.2, freeY - 3.4); ctx.stroke();
      ctx.fillStyle = pal.glove;
      ctx.beginPath(); ctx.arc(freeX, freeY + 2, 2.4, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.mark;
      ctx.fillRect(freeX - 1.2, freeY - 1.6, 2.4, 1.4);
      if (isMain) game.addGlow(ctx, freeX, freeY - 1, 6 + 3 * Math.sin(t * 4), '61,139,255', 0.55 + 0.25 * Math.sin(t * 4));
    };

    if (back) {
      // De costas: o casaco cobre o corpo e o capuz cai sobre os ombros
      tails(pal.coat);
      drawFreeArm();
      ctx.fillStyle = pal.coat;
      ctx.beginPath(); ctx.moveTo(-11, y1); ctx.lineTo(11, y1); ctx.lineTo(10, y0 + 6); ctx.lineTo(-10, y0 + 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = pal.coatDark; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y1 + 8); ctx.lineTo(0 + sway * 0.3, -4); ctx.stroke();
      ctx.fillStyle = pal.strap;
      ctx.fillRect(-10, y0 + 1, 20, 2.5);
      ctx.fillStyle = pal.coatHi;
      ctx.beginPath(); ctx.ellipse(0, y1 + 3, 8, 4.5, 0, 0, TAU); ctx.fill();   // capuz caído
      ctx.fillStyle = pal.coatDark;
      ctx.beginPath(); ctx.ellipse(0, y1 + 3.5, 5, 2.5, 0, 0, TAU); ctx.fill();
    } else {
      drawFreeArm();
      // Camisa escura com tiras cruzadas e cinto
      ctx.fillStyle = pal.shirt;
      ctx.beginPath(); ctx.moveTo(-7, y0); ctx.lineTo(7, y0); ctx.lineTo(8, y1 + 1); ctx.lineTo(-8, y1 + 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = pal.strap; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-6 * side, y1 + 2); ctx.lineTo(5 * side, y0 - 2); ctx.stroke();
      ctx.fillStyle = pal.buckle;
      ctx.fillRect(-0.5 * side - 1.2, y1 + 9, 2.4, 2.4);
      ctx.fillStyle = pal.strap;
      ctx.fillRect(-7, y0 - 3, 14, 2.6);
      ctx.fillStyle = pal.buckle;
      ctx.fillRect(-1.5, y0 - 3.2, 3, 3);
      // Casaco aberto: painéis da frente até os joelhos
      for (const k of [-1, 1]) {
        ctx.fillStyle = k === -side ? pal.coatHi : pal.coat;
        ctx.beginPath();
        ctx.moveTo(k * 11, y1); ctx.lineTo(k * 4, y1 + 2);
        ctx.lineTo(k * 5, y0 + 1); ctx.lineTo(k * 6 + sway * 0.4, -5);
        ctx.lineTo(k * 13 + sway * 0.6, -4); ctx.lineTo(k * 12, y0 + 2);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = pal.coatDark; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-4, y1 + 3); ctx.lineTo(-5 + sway * 0.4, -5); ctx.moveTo(4, y1 + 3); ctx.lineTo(5 + sway * 0.4, -5); ctx.stroke();
      // Fivelas nas abas do casaco
      ctx.fillStyle = pal.buckle;
      ctx.fillRect(-side * 9 - 1, y0 - 6, 2.2, 1.6);
      ctx.fillRect(-side * 9.5 - 1, y0 + 2, 2.2, 1.6);
      // Gola alta
      ctx.fillStyle = pal.coat;
      ctx.beginPath(); ctx.moveTo(-8, y1 + 1); ctx.lineTo(-7, y1 - 6); ctx.lineTo(-2, y1 + 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, y1 + 1); ctx.lineTo(7, y1 - 6); ctx.lineTo(2, y1 + 2); ctx.closePath(); ctx.fill();
    }

    // Ombros do casaco
    ctx.fillStyle = pal.coat;
    ctx.beginPath(); ctx.ellipse(-10, y1 + 2, 5, 3.6, -0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, y1 + 2, 5, 3.6, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.strap;
    ctx.fillRect(side * 8 - 2, y1 + 1, 4, 1.4);

    // Cabeça: rosto parcialmente coberto pelo cabelo preto e desgrenhado
    const hx = side * 1.2, hy = y1 - 8;
    if (back) {
      ctx.fillStyle = pal.hair;
      ctx.beginPath(); ctx.arc(hx, hy - 1, 8, 0, TAU); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 8, hy); ctx.lineTo(hx - 6, hy + 8); ctx.lineTo(hx - 2, hy + 5); ctx.lineTo(hx + 1, hy + 9);
      ctx.lineTo(hx + 4, hy + 5); ctx.lineTo(hx + 7, hy + 8); ctx.lineTo(hx + 8, hy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = pal.hairHi; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hx - 3, hy - 7); ctx.lineTo(hx - 5, hy + 2); ctx.moveTo(hx + 3, hy - 7); ctx.lineTo(hx + 4, hy + 3); ctx.stroke();
    } else {
      ctx.fillStyle = pal.skinShade;
      ctx.fillRect(hx - 2.5, y1 - 3, 5, 4);   // pescoço
      ctx.fillStyle = pal.skin;
      ctx.beginPath(); ctx.ellipse(hx + side * 0.8, hy + 1, 5.6, 6.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.skinShade;
      ctx.beginPath(); ctx.ellipse(hx - side * 3.4, hy + 2, 2.2, 5, 0, 0, TAU); ctx.fill();
      // Olhos cinzentos (o da frente meio escondido pela franja)
      ctx.fillStyle = pal.eye;
      ctx.fillRect(hx + side * 3 - 1, hy + 1, 2, 1.3);
      ctx.fillRect(hx - side * 1 - 1, hy + 1.2, 1.8, 1.1);
      if (isMain) game.addGlow(ctx, hx + side * 3, hy + 1.6, 4, '150,190,255', 0.35);
      // Cabelo: volume no topo, mechas laterais e franja caindo sobre os olhos
      ctx.fillStyle = pal.hair;
      ctx.beginPath(); ctx.arc(hx, hy - 2.5, 7.6, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 8.2, hy - 3);
      ctx.lineTo(hx - 9, hy + 5); ctx.lineTo(hx - 6.5, hy + 1.5); ctx.lineTo(hx - 5.5, hy + 7);
      ctx.lineTo(hx - 3, hy + 0.5);
      ctx.lineTo(hx - 0.5 + side, hy + 3.5); ctx.lineTo(hx + 1.5 + side, hy - 0.5);
      ctx.lineTo(hx + 4 + side * 1.5, hy + 2.8); ctx.lineTo(hx + 5.5 + side, hy - 1);
      ctx.lineTo(hx + 8.5, hy + 4); ctx.lineTo(hx + 8.4, hy - 3);
      ctx.closePath(); ctx.fill();
      // Pontas rebeldes
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy - 7); ctx.lineTo(hx - 9.5, hy - 9); ctx.lineTo(hx - 4, hy - 9.5);
      ctx.lineTo(hx - 1, hy - 13); ctx.lineTo(hx + 1.5, hy - 9.6); ctx.lineTo(hx + 6, hy - 11); ctx.lineTo(hx + 5.5, hy - 7);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = pal.hairHi; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(hx - side * 4, hy - 8); ctx.lineTo(hx - side * 1, hy - 2); ctx.moveTo(hx + side * 2, hy - 9); ctx.lineTo(hx + side * 4, hy - 3); ctx.stroke();
    }

    // Braço da espada (direito): do ombro até o cabo
    if (sword) {
      const shx = side * 9, shy = y1 + 4;
      ctx.strokeStyle = pal.coat; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(lerp(shx, sword.hx, 0.92), lerp(shy, sword.hy, 0.92)); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = pal.glove;
      ctx.beginPath(); ctx.arc(sword.hx, sword.hy, 2.5, 0, TAU); ctx.fill();
    }

    if (sword && !sword.behind) this.drawSword(ctx, sword, pal);
    ctx.restore();
  }

  // Calcula a pose da espada (coordenadas relativas aos pés, em pixels de tela)
  swordPose(side, bob) {
    const s = { hx: 0, hy: 0, tx: 0, ty: 0, behind: false, glow: 0 };
    const st = this.state;
    const a = this.attack;
    if (st === 'attack' && a && a.def) {
      const ang = this.bladeAngle(a, a.t);
      const c = Math.cos(ang), sn = Math.sin(ang);
      const L = a.def.blade * 0.82;
      const z = 26 + bob;
      s.hx = (c - sn) * 12; s.hy = (c + sn) * 6 - z;
      s.tx = (c - sn) * L; s.ty = (c + sn) * 0.5 * L - z;
      s.behind = c + sn < -0.2;
      s.glow = a.t < a.def.windup + a.def.active ? 0.6 : 0.15;
    } else if (st === 'charge') {
      const ang = this.facing + Math.PI * 0.75 * side;
      const c = Math.cos(ang), sn = Math.sin(ang);
      s.hx = side * 6; s.hy = -34 - bob;
      s.tx = s.hx + (c - sn) * 50; s.ty = s.hy + (c + sn) * 25 - 22;
      s.behind = true;
      s.glow = 0.4 + this.chargeLevel * 0.3 + 0.2 * Math.sin(this.animTime * 30);
    } else if (st === 'special') {
      s.hx = 0; s.hy = -46; s.tx = 0; s.ty = -110; s.behind = false;
      s.glow = 1;
    } else {
      // Repouso: lâmina apontando para baixo e para frente
      const sw = Math.sin(this.animTime * 2) * 1.5;
      s.hx = side * 11; s.hy = -24 - bob;
      s.tx = s.hx + side * (24 + sw); s.ty = s.hy + 32;
      s.behind = false;
    }
    return s;
  }

  // Tempestade Nula: lâmina negra com veias de energia azul, guarda angular com
  // a runa e cabo trançado. Brilha mais conforme a energia acumulada
  drawSword(ctx, s, pal) {
    const dx = s.tx - s.hx, dy = s.ty - s.hy, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const isMain = pal === PLAYER_PAL;
    const energy = isMain ? Math.max(s.glow, 0.15 + 0.3 * (this.fury / 100)) : 0;
    if (isMain) {
      game.addGlow(ctx, s.hx + dx * 0.6, s.hy + dy * 0.6, 14 + energy * 26, '50,120,255', 0.2 + energy * 0.55);
      if (s.glow > 0) game.addGlow(ctx, s.tx, s.ty, 12 + s.glow * 22, '170,215,255', s.glow * 0.7);
    }
    const b0x = s.hx + ux * 3, b0y = s.hy + uy * 3;
    const mx = s.hx + dx * 0.78, my = s.hy + dy * 0.78;
    // Lâmina
    ctx.fillStyle = pal.blade;
    ctx.beginPath();
    ctx.moveTo(b0x + nx * 3, b0y + ny * 3);
    ctx.lineTo(mx + nx * 2.4, my + ny * 2.4);
    ctx.lineTo(s.tx, s.ty);
    ctx.lineTo(mx - nx * 2.4, my - ny * 2.4);
    ctx.lineTo(b0x - nx * 3, b0y - ny * 3);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.bladeEdge; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(b0x + nx * 3, b0y + ny * 3); ctx.lineTo(mx + nx * 2.4, my + ny * 2.4); ctx.lineTo(s.tx, s.ty); ctx.stroke();
    // Veia de energia em zigue-zague pelo centro da lâmina
    ctx.strokeStyle = pal.vein; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(b0x, b0y);
    for (let i = 1; i <= 5; i++) { const k = i / 6, o = (i % 2 ? 1 : -1) * 1.1; ctx.lineTo(s.hx + dx * k + nx * o, s.hy + dy * k + ny * o); }
    ctx.lineTo(s.tx - ux * 4, s.ty - uy * 4);
    ctx.stroke();
    // Guarda angular com a runa azul
    ctx.fillStyle = pal.guard;
    ctx.beginPath();
    ctx.moveTo(s.hx + nx * 7 - ux, s.hy + ny * 7 - uy);
    ctx.lineTo(s.hx + ux * 4, s.hy + uy * 4);
    ctx.lineTo(s.hx - nx * 7 - ux, s.hy - ny * 7 - uy);
    ctx.lineTo(s.hx - ux * 3, s.hy - uy * 3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.vein;
    ctx.fillRect(s.hx - 1, s.hy - 1, 2, 2);
    // Cabo trançado e pomo
    ctx.strokeStyle = pal.grip; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.hx - ux * 3, s.hy - uy * 3); ctx.lineTo(s.hx - ux * 10, s.hy - uy * 10); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = pal.guard;
    ctx.beginPath(); ctx.arc(s.hx - ux * 11, s.hy - uy * 11, 1.8, 0, TAU); ctx.fill();
    if (isMain) {
      game.addGlow(ctx, s.hx, s.hy, 8, '80,160,255', 0.6);
      // Pequenos raios percorrendo a lâmina quando energizada
      if (energy > 0.42 && Math.random() < energy * 0.6) {
        ctx.strokeStyle = 'rgba(190,230,255,0.9)'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        let k = rand(0.15, 0.7);
        ctx.moveTo(s.hx + dx * k, s.hy + dy * k);
        for (let i = 0; i < 3; i++) { k += 0.08; const o = rand(-6, 6); ctx.lineTo(s.hx + dx * k + nx * o, s.hy + dy * k + ny * o); }
        ctx.stroke();
      }
    }
  }

  // Hurtbox e hitbox ativa (F1)
  drawDebug(ctx) {
    drawHurtbox(ctx, this.x, this.y, this.radius, this.invuln > 0 ? '120,160,255' : '80,255,120');
    const a = this.attack;
    if (this.state === 'attack' && a && a.def) {
      const d = a.def, active = a.t >= d.windup && a.t < d.windup + d.active;
      Hitbox.drawDebug(ctx, d.shape, this.x, this.y, a.dir, active ? '255,40,40' : '255,200,80');
    }
  }
}

