'use strict';
// ECLIPSE ZERO · Pulo, queda, aterrissagem e defesa (de todos os heróis)
// ---------------------------------------------------------------------------
// PULO (N; controle: A): o herói sobe (z) e cai com gravidade, anda solto no ar e passa por
// cima de ondas de choque, impactos no chão, golpes baixos e tiros (ver damagePlayerFrom,
// Enemy.strikePlayer e ProjectileSystem). Passar por cima de um perigo conta como esquiva
// perfeita. No ar: golpe leve normal, esquiva no ar (para a queda) e o PESADO vira MERGULHO:
// cai de uma vez e o impacto atinge quem estiver em volta (mais forte quanto mais alto).
// ATERRISSAGEM: agachada rápida (o modelo dobra os joelhos, js/models/kael.js), poeira e som;
// de muito alto, um tranco na câmera.
// DEFESA (segure Shift; controle: RB): o herói fica em guarda, andando devagar. Golpes e tiros
// de frente (até 100° para cada lado) gastam energia e só passam um pouco (25%); sem energia a
// guarda quebra (o golpe passa pela metade e o herói cambaleia). APARO: o golpe que chega logo
// que a guarda sobe (0,2 s) é anulado, o atacante fica atordoado e abre o contra-ataque (o
// próximo golpe é crítico; com a técnica de retaliação do herói, ela sai no golpe leve).
// O Escudo de Energia do Drakos (habilidade) continua à parte e vale antes desta defesa.
// ---------------------------------------------------------------------------
const PULO = {
  V0: 390,            // velocidade de subida (unidades/s): ~54 de altura e ~0,55 s no ar
  G: 1400,            // gravidade
  AR: 0.85,           // controle no ar (fração da velocidade no chão)
  MERGULHO: 980,      // velocidade da queda do mergulho
  ALTO: 18,           // acima disto o herói passa por cima de ondas e impactos no chão
  ATERRA: 0.22,       // duração da agachada da aterrissagem
};
const DEFESA = {
  APARO: 0.2,         // janela do aparo depois de levantar a guarda
  FRENTE: 1.75,       // meia-abertura da guarda (rad)
  PASSA: 0.25,        // fração do dano que passa pela guarda
  CUSTO: 7,           // energia por golpe defendido
  LENTO: 0.38,        // velocidade andando em guarda
};

Object.assign(Player.prototype, {
  // ------------------------------------------------------------------ pulo
  canJump() { return !this.air && this.z <= 0 && (this.state === 'idle' || this.state === 'run' || this.state === 'block'); },
  startJump() {
    this.air = true; this.vz = PULO.V0; this.z = Math.max(this.z, 0.5); this.landT = 0; this.peakZ = 0;
    if (this.state === 'block') this.state = 'idle';
    this.squash = 0.18;
    game.particles.dust(this.x, this.y, 6, 10, 90);
    game.audio.play('jump', 0.7);
  },
  // Gravidade e chão (depois do movimento do quadro). A esquiva no ar segura a queda e a
  // suprema cuida da própria altura
  updateAir(dt) {
    if (this.landT > 0) this.landT = Math.max(0, this.landT - dt);
    if (!this.air || this.state === 'special') return;
    if (this.state !== 'dash') this.vz -= PULO.G * dt;
    else this.vz = Math.max(this.vz, 0);
    this.z += this.vz * dt;
    this.peakZ = Math.max(this.peakZ || 0, this.z);
    if (this.z <= 0) { this.z = 0; this.land(); }
  },
  land() {
    const alto = this.peakZ || 0, g = game;
    this.air = false; this.vz = 0; this.peakZ = 0;
    if (this.state === 'plunge') { this.plungeImpact(alto); return; }
    if (this.state === 'dead') return;
    if (this.state === 'idle' || this.state === 'run' || this.state === 'hurt') this.landT = PULO.ATERRA;
    this.squash = 0.25;
    g.particles.dust(this.x, this.y, alto > 40 ? 12 : 7, 12, alto > 40 ? 150 : 100);
    g.audio.play('stomp', alto > 40 ? 0.35 : 0.2);
    if (alto > 45) g.camera.shake(0.08);
  },

  // ------------------------------------------------------------- mergulho
  startPlunge() {
    this.state = 'plunge'; this.stateTime = 0; this.attack = null;
    this.vz = -PULO.MERGULHO; this.vx *= 0.25; this.vy *= 0.25;
    this.combo.reset();
    game.audio.play('swingHeavy');
  },
  updatePlunge(dt) {
    this.vx *= Math.exp(-6 * dt); this.vy *= Math.exp(-6 * dt);
    if (Math.random() < 0.7) game.particles.converge(this.x, this.y, 20 + this.z, 1, 60, this.kit ? this.kit.rgb || '120,180,255' : '120,180,255', 0.2);
    if (!this.air && this.stateTime > 0.05) this.state = 'idle';   // segurança: terminou sem impacto
  },
  plungeImpact(alto) {
    const g = game, rgb = this.kit ? (this.kit.rgb || '120,180,255') : '90,160,255';
    const k = clamp(alto / 50, 0.5, 1.4), R = 95 + 35 * k;
    const def = { dmg: 26 * k, kb: 420, launch: 260 * k, stun: 0.55, heavy: true, heavyType: true, radialKb: true, blade: R };
    const a = { id: 'plunge', dir: this.facing, mult: 1, launchMult: 1 };
    for (const e of g.enemies) {
      if (!e.canBeHit() || dist(this.x, this.y, e.x, e.y) > R + e.radius) continue;
      this.hitEnemy(e, def, a);
    }
    g.particles.ring(this.x, this.y, R, rgb, 0.4, 10);
    g.particles.ring(this.x, this.y, R * 0.6, '220,235,255', 0.28, 5);
    g.particles.dust(this.x, this.y, 18, 16, 200);
    g.particles.debris(this.x, this.y, 12);
    g.camera.shake(0.28 * k);
    g.audio.play('stomp');
    g.audio.play('hitHeavy', 0.6);
    g.room.addScorch(this.x, this.y, 46);
    g.texts.spawn(this.x, this.y, 70, 'MERGULHO', '#cfe4ff', 15, 0.6);
    this.state = 'idle'; this.stateTime = 0; this.landT = PULO.ATERRA * 1.3; this.squash = 0.35;
    this.invuln = Math.max(this.invuln, 0.18);
  },

  // ---------------------------------------------------------------- defesa
  startBlock() {
    this.state = 'block'; this.stateTime = 0; this.attack = null;
    this.combo.reset();
    game.audio.play('draw', 0.5);
  },
  updateBlock(dt, input, wd, mag) {
    if (!input.held.block) { this.state = 'idle'; return; }
    let tvx = 0, tvy = 0;
    if (wd) {
      const sp = this.baseSpeed * this.stats.speedMult * mag * DEFESA.LENTO;
      tvx = wd.x * sp; tvy = wd.y * sp;
      this.facing = angleLerp(this.facing, Math.atan2(wd.y, wd.x), 1 - Math.exp(-5 * dt));   // vira devagar
    }
    const acc = 2400 * dt;
    this.vx = approach(this.vx, tvx, acc); this.vy = approach(this.vy, tvy, acc);
    this.moveSpeed = Math.hypot(this.vx, this.vy);
  },
  // Golpe de (sx, sy) contra a guarda: null = não defendido (pelas costas, fora da guarda);
  // 0 = defendido sem dano; n > 0 = guarda quebrada, o dano n segue o caminho normal
  blockHit(dmg, sx, sy) {
    if (this.state !== 'block') return null;
    const ang = Math.atan2(sy - this.y, sx - this.x);
    if (Math.abs(angleDiff(this.facing, ang)) > DEFESA.FRENTE) return null;
    const g = game, fx = this.x + Math.cos(this.facing) * 16, fy = this.y + Math.sin(this.facing) * 16;
    // Aparo: a guarda acabou de subir
    if (this.stateTime <= DEFESA.APARO) {
      let atk = null, bd = 90;
      for (const e of g.enemies) { const d = dist(e.x, e.y, sx, sy); if (e.alive && d < bd) { bd = d; atk = e; } }
      if (atk && !atk.isBoss) {
        atk.interrupt(); atk.stun = Math.max(atk.stun || 0, 1.1 * (atk.stunMult || 1)); atk.setState('stun');
        const dx = atk.x - this.x, dy = atk.y - this.y, l = Math.hypot(dx, dy) || 1;
        atk.kbx += (dx / l) * 260 / (atk.mass || 1); atk.kby += (dy / l) * 260 / (atk.mass || 1);
        atk.flash = 0.12;
      }
      this.counterT = 1.2; this.blockCounterT = 1.0;
      this.gainEnergy(8);
      this.invuln = Math.max(this.invuln, 0.3);
      g.particles.sparks(fx, fy, 30, this.facing, 16, '255,240,190', 420, 1.4);
      g.particles.flash(fx, fy, 30, 70, '255,240,200', 0.2);
      g.texts.spawn(this.x, this.y, 66, 'APARADO!', '#fff0b8', 18, 0.9);
      g.audio.play('deflect'); g.audio.play('crit', 0.6);
      g.slowMo(0.3, 0.2);
      g.camera.shake(0.12);
      return 0;
    }
    // Defesa comum: gasta energia; sem energia a guarda quebra
    if (this.fury >= DEFESA.CUSTO) {
      this.fury -= DEFESA.CUSTO;
      const chip = Math.max(1, Math.round(dmg * DEFESA.PASSA));
      this.hp = Math.max(1, this.hp - chip);
      this.flash = 0.06;
      this.kbx -= Math.cos(ang) * 120; this.kby -= Math.sin(ang) * 120;
      g.particles.sparks(fx, fy, 30, this.facing, 8, '200,220,255', 300, 1.1);
      g.texts.spawn(this.x, this.y, 60, `DEFESA -${chip}`, '#bcd4ff', 14, 0.6);
      g.audio.play('deflect', 0.7);
      this.invuln = Math.max(this.invuln, 0.2);
      return 0;
    }
    g.texts.spawn(this.x, this.y, 60, 'GUARDA QUEBRADA', '#ff9aa8', 15, 0.8);
    g.audio.play('wallHit');
    return Math.max(1, Math.round(dmg * 0.5));
  },
});
