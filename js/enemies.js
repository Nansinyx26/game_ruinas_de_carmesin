'use strict';
// ECLIPSE ZERO · Inimigos: tipos, Rastejador, Legionário, Atiradores, Caçador, diretor de IA
// ---------------------------------------------------------------------------
// INIMIGOS — atributos base (escalam com a dificuldade da sala)
// Máquinas de NEXUS, soldados da Legião de Ferro e fiéis do Culto do Eclipse
// blood: cor do fluido (refrigerante, óleo ou sangue)   glow: cor dos sensores
// ---------------------------------------------------------------------------
const ENEMY_TYPES = {
  rastejador: { name: 'Rastejador', hp: 32, radius: 13, speed: 105, mass: 1, dmg: 8, score: 50, souls: [1, 2], orb: 0.12, blood: '24,110,130', glow: '255,60,80', height: 30, stunMult: 1, mech: true },
  legionario: { name: 'Legionário de Ferro', hp: 230, radius: 25, speed: 58, mass: 3.2, dmg: 24, score: 320, souls: [6, 9], orb: 0.6, blood: '38,32,28', glow: '255,130,40', height: 66, stunMult: 0.6, mech: true },
  drone:      { name: 'Drone Sentinela', hp: 42, radius: 13, speed: 92, mass: 0.9, dmg: 11, score: 120, souls: [2, 4], orb: 0.2, blood: '40,46,56', glow: '255,70,70', height: 48, stunMult: 1, mech: true },
  sacerdote:  { name: 'Sacerdote do Eclipse', hp: 42, radius: 13, speed: 92, mass: 0.9, dmg: 11, score: 120, souls: [2, 4], orb: 0.2, blood: '92,16,42', glow: '200,120,255', height: 50, stunMult: 1, mech: false },
  cacador:    { name: 'Caçador da Legião', hp: 46, radius: 12, speed: 165, mass: 0.8, dmg: 13, score: 150, souls: [2, 4], orb: 0.18, blood: '38,32,28', glow: '255,130,40', height: 38, stunMult: 1.1, mech: true },
};
let ENEMY_ID = 0;

class Enemy extends Entity {
  constructor(type, x, y, level) {
    const T = ENEMY_TYPES[type];
    super(x, y, T.radius);
    this.id = ENEMY_ID++;
    this.type = type; this.T = T; this.level = level;
    this.maxHp = this.hp = Math.round(T.hp * (1 + level * 0.16) * Settings.diff.hp);
    this.dmg = T.dmg * (1 + level * 0.1);
    this.speed = T.speed * (1 + level * 0.03);
    this.aggro = 1 + level * 0.06;          // reduz recargas em salas avançadas
    this.mass = T.mass;
    this.height = T.height;
    this.stunMult = T.stunMult;
    this.state = 'spawn'; this.stateTime = 0; this.spawnDur = 0.75;
    this.attackCd = rand(0.7, 1.5);
    this.stun = 0;
    this.hpBar = 0;
    this.telegraph = null; this.tgProgress = 0;
    this.hasToken = false;
    this.slotAngle = rand(0, TAU);
    this.strafeDir = chance(0.5) ? 1 : -1;
    this.strafeTimer = rand(1, 2.5);
    this.superArmor = false;
    this.invulnerable = false;
    this.launchable = true;
    this.usesSlots = false;
    this.vulnerable = 1;
    this.hitThisAttack = false;
    this.dodgeCredited = false;
    this.wallCd = 0;
    this.animTime = rand(0, 10);
    this.tmp = { x: 0, y: 0 };
    this.pal = null;
  }

  canBeHit() { return this.alive && this.state !== 'spawn' && this.state !== 'dying' && !this.invulnerable; }
  setState(s) { this.state = s; this.stateTime = 0; }
  releaseToken() { if (this.hasToken) game.director.release(this); }
  interrupt() { this.telegraph = null; this.superArmor = false; this.releaseToken(); }

  update(dt) {
    this.animTime += dt; this.stateTime += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.hpBar > 0) this.hpBar -= dt;
    if (this.attackCd > 0) this.attackCd -= dt * this.aggro;
    if (this.wallCd > 0) this.wallCd -= dt;
    if (this.vistaT > 0) this.vistaT -= dt;
    if (this.recuoT > 0) this.recuoT -= dt;
    if (this.marcaT > 0) this.marcaT -= dt;   // "!" e "?" dos encontros (js/mundo/encontros.js)

    if (this.state === 'spawn') {
      if (Math.random() < 0.4) game.particles.embers(this.x, this.y, 0, 1, this.T.glow, this.radius, 50);
      if (this.stateTime >= this.spawnDur) this.setState('idle');
      return;
    }
    if (this.tracos) EnemyTraits.tick(this, dt);   // variantes do mundo aberto (js/mundo/variantes.js)

    // Corpo no ar (lançado): gravidade, quique e queda
    if (this.z > 0 || this.vz > 0) {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        if (this.vz < -420 && this.state !== 'dying') {
          this.vz = -this.vz * 0.25;
          game.particles.dust(this.x, this.y, 6, 10, 90);
          game.camera.shake(0.06);
          game.audio.play('wallHit');
        } else this.vz = 0;
        if (this.state === 'stun') this.stun = Math.max(this.stun, 0.3);
      }
    }

    if (this.state === 'dying') {
      if (this.stateTime >= 0.45) this.alive = false;
    } else if (this.state === 'stun') {
      this.stun -= dt;
      const k = Math.exp(-10 * dt); this.vx *= k; this.vy *= k;
      // Circuitos em curto: faíscas azuis enquanto atordoado
      if (this.T.mech && Math.random() < dt * 5) game.arcs.crackle(this.x, this.y, this.height * 0.5 + this.z, 1, this.radius * 1.4, '140,200,255', 0.09);
      if (this.stun <= 0 && this.z <= 0) this.afterStun();
    } else if (this.z <= 0) {
      if (this.dormant) {
        // acampamento do mundo aberto (js/mundo/encontros.js): parado, em patrulha, em alerta ou
        // voltando para casa até perceber o herói; dano de qualquer fonte acorda o grupo
        if (this.hp < (this.hpCalmo === undefined ? this.maxHp : this.hpCalmo)) World.wake(this);
        else Encontros.calmo(this, dt);
      } else if (!(this.tracos && EnemyTraits.conduz(this, dt))) this.think(dt, heroTargetFor(this));   // o jogador, ou uma isca de um herói (js/heroes/kit.js)
    }

    // Física: knockback com atrito + colisão com paredes e pilares
    const kd = Math.exp(-7 * dt);
    this.kbx *= kd; this.kby *= kd;
    const kbSpeed = Math.hypot(this.kbx, this.kby);
    this.x += (this.vx + this.kbx) * dt;
    this.y += (this.vy + this.kby) * dt;
    const hitWall = game.room.collide(this, false);
    this.touchingWall = hitWall;
    // Impacto contra a parede quando arremessado com força
    if (hitWall && kbSpeed > 330 && this.wallCd <= 0 && this.state !== 'dying') {
      this.wallCd = 0.4;
      const dmg = Math.round(6 + kbSpeed * 0.012);
      this.kbx *= -0.3; this.kby *= -0.3;
      game.particles.dust(this.x, this.y, 8, 12, 120);
      game.particles.debris(this.x, this.y, 5);
      game.camera.shake(0.12);
      game.audio.play('wallHit');
      this.hp -= dmg; this.flash = 0.1; this.hpBar = 2.5;
      game.texts.spawn(this.x, this.y, this.height, dmg, '#ffb46b', 18);
      game.stats.dmgDealt += dmg;
      if (this.hp <= 0) this.die({ kx: 0, ky: 0 });
      else if (!this.superArmor) { this.stun = Math.max(this.stun, 0.3); if (this.state !== 'stun') { this.interrupt(); this.setState('stun'); } }
    }
  }

  afterStun() { this.setState('idle'); }

  // Move em direção a um ponto com aceleração suave, contornando os pilares do caminho
  // (Room.desvio); empacado (quase sem sair do lugar por meio segundo), dá um passo de lado
  moveToward(tx, ty, speed, dt, accel = 900) {
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    let tvx = 0, tvy = 0;
    if (d > 4) {
      const s = speed * Math.min(1, d / 40);
      tvx = (dx / d) * s; tvy = (dy / d) * s;
      const v = this.dv || (this.dv = { x: 0, y: 0 });
      if (game.room.desvio(this, tvx, tvy, v, 70)) { tvx = v.x; tvy = v.y; }
      if (this.destravaT > 0) { this.destravaT -= dt; tvx = Math.cos(this.destravaA) * s; tvy = Math.sin(this.destravaA) * s; }
      else this.empacado(dt, s, tvx, tvy);
    }
    this.vx = approach(this.vx, tvx, accel * dt);
    this.vy = approach(this.vy, tvy, accel * dt);
  }
  empacado(dt, s, tvx, tvy) {
    this.empT = (this.empT || 0) + dt;
    if (this.empT < 0.5) return;
    const andou = this.empX === undefined ? 1e9 : dist(this.x, this.y, this.empX, this.empY);
    this.empT = 0; this.empX = this.x; this.empY = this.y;
    if (s > 30 && andou < s * 0.5 * 0.2) {
      this.empLado = -(this.empLado || 1);
      this.destravaT = 0.4; this.destravaA = Math.atan2(tvy, tvx) + this.empLado * 1.45;
    }
  }
  // Linha de visão até o alvo (pilares no caminho escondem), refeita a cada 0,15 s
  vejo(p) {
    if (this.vistaT > 0 && this.vistaAlvo === p) return this.visto;
    this.vistaT = 0.15; this.vistaAlvo = p;
    return (this.visto = game.room.linhaLivre(this.x, this.y, p.x, p.y, -4));
  }
  brake(dt, k = 10) { const f = Math.exp(-k * dt); this.vx *= f; this.vy *= f; }
  faceToward(x, y, dt, rate = 10) { this.facing = angleLerp(this.facing, Math.atan2(y - this.y, x - this.x), 1 - Math.exp(-rate * dt)); }

  // Teste de acerto de um ataque inimigo contra o jogador (com detecção de esquiva perfeita)
  strikePlayer(shape, dir, dmg, kb) {
    const p = game.player;
    if (this.hitThisAttack || p.state === 'dead') return false;
    if (!Hitbox.test(shape, this.x, this.y, dir, p.x, p.y, p.radius)) return false;
    if (p.z > PULO.ALTO + 10 && !this.isBoss) return false;   // golpe baixo: o herói passou por cima
    if (!game.room.linhaLivre(this.x, this.y, p.x, p.y, -6)) return false;   // um pilar no meio segura o golpe
    if (p.state === 'dash' && p.invuln > 0) {
      if (!this.dodgeCredited) { this.dodgeCredited = true; game.onPerfectDodge(p); }
      return false;
    }
    if (p.takeDamage(dmg, this.x, this.y, kb)) {
      this.hitThisAttack = true;
      if (this.tracos) EnemyTraits.acertou(this, p);   // veneno, gelo
      return true;
    }
    return false;
  }

  takeHit(h) {
    if (!this.canBeHit()) return false;
    this.hp -= h.dmg;
    this.semDanoT = 0;
    this.flash = 0.11;
    this.hpBar = 2.5;
    const armored = this.superArmor && !h.heavy && !h.breakArmor;
    const k = (armored ? 0.12 : 1) / this.mass;
    this.kbx += h.kx * h.kb * k; this.kby += h.ky * h.kb * k;
    // recuo do corpo na direção do golpe (só visual): leve, pesado ou crítico; armadura quase não mexe
    this.recuoA = Math.atan2(h.ky, h.kx);
    this.recuoK = (armored ? 0.25 : 1) * (h.heavy || h.crit ? 1 : 0.55) * Math.min(1.3, 1.6 / Math.sqrt(this.mass));
    this.recuoT = this.recuoDur = h.heavy || h.crit ? 0.3 : 0.18;
    if (this.dormant && this.camp && typeof World !== 'undefined') World.wake(this);   // atingido no acampamento: o grupo acorda
    if (this.hp <= 0) { this.die(h); return true; }
    if (!armored) {
      if (h.launch > 0 && this.launchable) { this.vz = Math.max(this.vz, h.launch / Math.sqrt(this.mass)); this.z = Math.max(this.z, 1); }
      else if (this.z > 0) this.vz = Math.max(this.vz, 240);   // malabarismo: golpes no ar mantêm o corpo suspenso
      this.interrupt();
      // Máquinas sofrem curto-circuito com descargas elétricas (atordoamento maior)
      const shock = h.shock && this.T.mech;
      this.stun = Math.max(this.stun, h.stun * this.stunMult * (shock ? 1.5 : 1));
      if (shock) game.arcs.crackle(this.x, this.y, this.height * 0.5 + this.z, 2, this.radius * 1.6, '160,215,255', 0.14);
      this.setState('stun');
    }
    this.onHurt(h);
    return true;
  }
  onHurt() {}

  // Variante de elite: mais resistente e forte, aura dourada e recompensa maior
  makeElite() {
    this.elite = true;
    this.maxHp = this.hp = Math.round(this.maxHp * 2.6);
    this.dmg *= 1.25; this.speed *= 1.08; this.aggro *= 1.15;
    this.radius = Math.round(this.radius * 1.15);
    this.stunMult *= 0.6; this.mass *= 1.4;
    return this;
  }

  die(h) {
    if (this.state === 'dying') return;
    this.interrupt();
    this.hp = 0;
    if (this.tracos) EnemyTraits.morreu(this);   // explode, divide
    this.setState('dying');
    this.flash = 0.18;
    this.kbx += (h.kx || 0) * 260 / this.mass; this.kby += (h.ky || 0) * 260 / this.mass;
    if (this.launchable) this.vz = Math.max(this.vz, 160);
    game.onEnemyKilled(this);
  }

  // ------------------------------------------------------------------ desenho
  draw(ctx) {
    if (this.oculto > 0) return;   // enterrado (variante que cava)
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y) - this.z;
    ctx.save();
    let rise = 0;
    if (this.state === 'spawn') {
      const k = clamp(this.stateTime / this.spawnDur, 0, 1);
      rise = (1 - easeOutCubic(k)) * (this.height + 6);
      ctx.globalAlpha = 0.3 + 0.7 * k;
      ctx.beginPath(); ctx.rect(sx - 120, sy - 260, 240, 260); ctx.clip();   // emerge do chão
    } else if (this.state === 'dying') {
      ctx.globalAlpha = clamp(1 - this.stateTime / 0.45, 0, 1);
    }
    const use3D = game.use3D && this.spr && this.spr.ok;
    if (use3D) R3D.blit(ctx, this.spr, sx, sy + rise);
    else if (this.elite) {
      ctx.translate(sx, sy + rise); ctx.scale(1.18, 1.18);
      this.drawBody(ctx, 0, 0, this.flash > 0 ? FLASH_PAL : this.pal);
    } else this.drawBody(ctx, sx, sy + rise, this.flash > 0 ? FLASH_PAL : this.pal);
    ctx.restore();
    if (use3D && this.state !== 'spawn') game.glows3D(ctx, this.type, this, this.spr, sx, sy);
    // Atordoamento forte: centelhas elétricas girando sobre a cabeça
    if (this.state === 'stun' && this.stun > 0.25 && this.z <= 0) {
      for (let i = 0; i < 3; i++) {
        const a = this.animTime * 7 + (i * TAU) / 3;
        game.addGlow(ctx, sx + Math.cos(a) * 10, sy - this.height - 8 + Math.sin(a) * 3, 6, '140,200,255', 0.85);
      }
    }
  }

  // Partes luminosas do modelo 3D (olhos, visores, núcleos), depois da escuridão
  drawEmissive(ctx) {
    if (!game.use3D || !this.spr || !this.spr.ok) return;
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y) - this.z;
    let a = 1, rise = 0;
    ctx.save();
    if (this.state === 'spawn') {
      const k = clamp(this.stateTime / this.spawnDur, 0, 1);
      rise = (1 - easeOutCubic(k)) * (this.height + 6);
      a = 0.3 + 0.7 * k;
      ctx.beginPath(); ctx.rect(sx - 120, sy - 260, 240, 260); ctx.clip();
    } else if (this.state === 'dying') a = clamp(1 - this.stateTime / 0.45, 0, 1);
    R3D.blitEmissive(ctx, this.spr, sx, sy + rise, a);
    ctx.restore();
  }

  // Barra de vida pequena sobre a cabeça (desenhada após a iluminação)
  drawHpBar(ctx) {
    if (this.marcaT > 0 && typeof Encontros !== 'undefined') Encontros.desenharMarca(ctx, this);   // "!" e "?" dos acampamentos
    const always = this.elite || game.player.stats.showBars;
    if ((this.hpBar <= 0 && !always) || this.state === 'dying' || this.state === 'spawn') return;
    const w = this.radius > 20 || this.elite ? 52 : 32;
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y) - this.z - this.height * (this.elite ? 1.18 : 1) - 14;
    const a = always ? 1 : Math.min(1, this.hpBar * 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(sx - w / 2 - 1, sy - 1, w + 2, 6);
    ctx.fillStyle = this.elite ? '#ffb43a' : '#ff2e55';
    ctx.fillRect(sx - w / 2, sy, w * clamp(this.hp / this.maxHp, 0, 1), 4);
    if (this.elite || this.varNome) {
      ctx.font = `bold 10px ${FONT_TITLE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = this.elite ? '#ffd47a' : rgba(this.T.glow, 0.95);
      ctx.fillText(this.chefeNome || (this.elite ? (this.varNome ? `ELITE · ${this.varNome.toUpperCase()}` : 'ELITE') : this.varNome.toUpperCase()), sx, sy - 3);   // chefes regionais e das campanhas: o nome
    }
    ctx.globalAlpha = 1;
  }

  drawDebug(ctx) {
    drawHurtbox(ctx, this.x, this.y, this.radius, this.canBeHit() ? '80,255,120' : '120,120,120');
    if (this.atkShape && (this.state === 'attack' || this.state === 'dash')) {
      Hitbox.drawDebug(ctx, this.atkShape, this.x, this.y, this.atkDir, '255,140,40');
    }
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y) - this.z - this.height - 22;
    ctx.fillStyle = this.hasToken ? '#ffb46b' : '#9fe';
    ctx.font = `10px ${FONT_UI}`; ctx.textAlign = 'center';
    ctx.fillText(`${this.state}${this.superArmor ? '*' : ''}`, sx, sy);
  }

  // Lado para o qual o inimigo olha na tela (+1 direita, -1 esquerda)
  screenSide() { return worldAngleToScreen(this.facing, this.tmp).x >= 0 ? 1 : -1; }
}

// ---------------------------------------------------------------------------
// RASTEJADOR: criatura mecânica de NEXUS — fraca, vem em bando e cerca o jogador
// ---------------------------------------------------------------------------
class Crawler extends Enemy {
  constructor(x, y, level) {
    super('rastejador', x, y, level);
    this.usesSlots = true;
    this.ring = rand(70, 105);
    this.pal = { shell: '#2b313b', shellHi: '#56606f', dark: '#11141a', leg: '#1f242c', eye: '#ff3a50', fang: '#aab4c4', core: '#38d6ff' };
    this.atkShape = { type: 'arc', range: 50, arc: 0.95 };
    this.atkDir = 0;
  }
  think(dt, p) {
    const d = dist(this.x, this.y, p.x, p.y);
    switch (this.state) {
      case 'idle': {
        // Vai para o seu ângulo de cerco; com "ficha" de ataque avança até o jogador
        const r = this.hasToken ? 0 : this.ring;
        const tx = p.x + Math.cos(this.slotAngle) * r, ty = p.y + Math.sin(this.slotAngle) * r;
        this.moveToward(tx, ty, this.speed * (this.hasToken ? 1.15 : 1), dt);
        this.faceToward(p.x, p.y, dt);
        if (this.attackCd <= 0 && d < 150 && !this.hasToken) game.director.request(this);
        if (this.hasToken && d < 62 && this.vejo(p)) {
          this.setState('windup');
          this.atkDir = Math.atan2(p.y - this.y, p.x - this.x);
          this.facing = this.atkDir;
          this.telegraph = { kind: 'cone', x: this.x, y: this.y, r: 52, dir: this.atkDir, arc: 0.95 };
        }
        if (this.hasToken && this.stateTime > 3) { this.releaseToken(); this.attackCd = 0.8; this.stateTime = 0; }
        break;
      }
      case 'windup': {
        this.brake(dt);
        const dur = 0.42 / Math.min(1.3, this.aggro);
        this.tgProgress = this.stateTime / dur;
        this.telegraph.x = this.x; this.telegraph.y = this.y;
        // o herói saiu do alcance (esquiva, recuo): desiste do bote e volta a perseguir
        if (this.stateTime > dur * 0.5 && d > 115) { this.telegraph = null; this.releaseToken(); this.attackCd = 0.3; this.setState('idle'); break; }
        if (this.stateTime >= dur) {
          this.telegraph = null;
          this.hitThisAttack = false; this.dodgeCredited = false;
          this.setState('attack');
          game.audio.play('swing', 0.6);
        }
        break;
      }
      case 'attack':
        this.vx = Math.cos(this.atkDir) * 300; this.vy = Math.sin(this.atkDir) * 300;
        this.strikePlayer(this.atkShape, this.atkDir, this.dmg, 230);
        if (this.stateTime >= 0.12) this.setState('recover');
        break;
      case 'recover':
        this.brake(dt, 12);
        if (this.stateTime >= 0.42) {
          this.releaseToken();
          this.attackCd = rand(1.1, 1.9);
          this.setState(chance(0.35) ? 'retreat' : 'idle');
        }
        break;
      case 'retreat': {
        const a = Math.atan2(this.y - p.y, this.x - p.x);
        this.moveToward(this.x + Math.cos(a) * 80, this.y + Math.sin(a) * 80, this.speed * 0.9, dt);
        this.faceToward(p.x, p.y, dt);
        if (this.stateTime >= 0.5) this.setState('idle');
        break;
      }
    }
  }
  onHurt() { if (chance(0.25)) this.attackCd = Math.max(this.attackCd, 0.5); }

  // Aranha mecânica: carapaça em domo, oito patas articuladas, sensores vermelhos
  // e um tanque de energia roubada nas costas
  drawBody(ctx, sx, sy, pal) {
    const side = this.screenSide(), t = this.animTime;
    const moving = Math.hypot(this.vx, this.vy) > 20;
    const gait = moving ? t * 16 : t * 1.5;
    let lean = 0, rear = 0, reach = 0;
    if (this.state === 'windup') { rear = 6 * Math.min(1, this.tgProgress); lean = -3 * side * Math.min(1, this.tgProgress); }
    else if (this.state === 'attack') { lean = 6 * side; reach = 8; }
    const by = -13 - (moving ? Math.abs(Math.sin(gait)) * 1.5 : Math.sin(t * 3) * 0.5) - rear * 0.6;
    ctx.save();
    ctx.translate(sx, sy);
    // Patas articuladas (quatro de cada lado), passada alternada
    ctx.strokeStyle = pal.leg; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      for (const k of [-1, 1]) {
        const ph = gait + i * 1.7 + (k > 0 ? Math.PI : 0);
        const lift = moving ? Math.max(0, Math.sin(ph)) * 3 : 0;
        const hipX = lean + (i - 1.5) * 3.2, hipY = by + 2;
        const footX = hipX + k * (10 + Math.abs(i - 1.5) * 2.5) + (moving ? Math.cos(ph) * 2.5 : 0);
        const footY = -lift + (i - 1.5) * 1.2;
        const kneeX = (hipX + footX) / 2 + k * 2, kneeY = Math.min(hipY, footY) - 8 - (i === 0 && this.state === 'windup' ? rear : 0);
        ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
      }
    }
    // Carapaça
    ctx.fillStyle = pal.dark;
    ctx.beginPath(); ctx.ellipse(lean, by + 2, 11, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.shell;
    ctx.beginPath(); ctx.ellipse(lean, by - 1, 10.5, 7.5, side * 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.shellHi;
    ctx.beginPath(); ctx.ellipse(lean - side * 3, by - 4, 5, 2.6, side * 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = pal.dark; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lean - side * 6, by - 6); ctx.lineTo(lean + side * 2, by + 3); ctx.stroke();
    // Tanque de energia roubada nas costas
    ctx.fillStyle = pal.core;
    ctx.fillRect(lean - side * 6 - 1.5, by - 6, 3, 4);
    if (pal === this.pal) game.addGlow(ctx, lean - side * 6, by - 4, 6, '56,214,255', 0.5);
    // Quelíceras
    ctx.strokeStyle = pal.fang; ctx.lineWidth = 1.5;
    const fx = lean + side * 9, fy = by + 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 1); ctx.quadraticCurveTo(fx + side * (5 + reach), fy, fx + side * (4 + reach), fy + 4);
    ctx.moveTo(fx, fy + 1); ctx.quadraticCurveTo(fx + side * (6 + reach), fy + 3, fx + side * (2 + reach), fy + 6);
    ctx.stroke();
    // Sensores vermelhos
    const ex = lean + side * 7, ey = by - 1;
    ctx.fillStyle = pal.eye;
    ctx.beginPath(); ctx.arc(ex, ey, 2.3, 0, TAU); ctx.fill();
    ctx.fillRect(ex - side * 3.5 - 0.8, ey - 2.6, 1.6, 1.6);
    ctx.fillRect(ex + side * 0.5 - 0.8, ey - 3.4, 1.4, 1.4);
    if (pal === this.pal) game.addGlow(ctx, ex, ey, 8 + (this.state === 'windup' ? 6 * this.tgProgress : 0), '255,50,70', 0.75);
    ctx.lineCap = 'butt';
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// LEGIONÁRIO DE FERRO: soldado artificial blindado — lento, muita vida, golpes de
// martelo de impacto com aviso (super armadura). Reconhece Kael como ameaça prioritária
// ---------------------------------------------------------------------------
class Legionary extends Enemy {
  constructor(x, y, level) {
    super('legionario', x, y, level);
    this.launchable = false;
    this.pal = { suit: '#101217', suitHi: '#1d2027', armor: '#2b3038', armorHi: '#4d5462', trim: '#ff7a22',
      helm: '#262a32', visor: '#ff8a2a', hammer: '#24282f', hammerHi: '#59606e', core: '#ff9a3a' };
    this.atkShape = { type: 'arc', range: 128, arc: 1.0 };
    this.atkDir = 0;
    this.move = 'slam';
  }
  think(dt, p) {
    const d = dist(this.x, this.y, p.x, p.y);
    switch (this.state) {
      case 'idle':
        this.moveToward(p.x, p.y, this.speed, dt, 400);
        this.faceToward(p.x, p.y, dt, 4);
        if (this.attackCd <= 0 && d < 125 && this.vejo(p)) {
          this.move = d < 72 && chance(0.45) ? 'stomp' : 'slam';
          this.atkDir = Math.atan2(p.y - this.y, p.x - this.x);
          this.facing = this.atkDir;
          if (this.move === 'slam') {
            this.atkShape = { type: 'arc', range: 128, arc: 1.0 };
            this.telegraph = { kind: 'cone', x: this.x, y: this.y, r: 128, dir: this.atkDir, arc: 1.0 };
          } else {
            this.atkShape = { type: 'circle', radius: 100, offset: 0 };
            this.telegraph = { kind: 'circle', x: this.x, y: this.y, r: 100 };
          }
          this.superArmor = true;
          this.setState('windup');
          game.audio.play('telegraph');
        }
        break;
      case 'windup': {
        this.brake(dt, 6);
        const dur = (this.move === 'slam' ? 0.95 : 0.8) / Math.min(1.25, this.aggro);
        // Rastreia o jogador na primeira metade do aviso, depois trava a direção
        if (this.stateTime < dur * 0.45 && this.move === 'slam') {
          this.atkDir = angleLerp(this.atkDir, Math.atan2(p.y - this.y, p.x - this.x), 1 - Math.exp(-3 * dt));
          this.facing = this.atkDir;
        }
        this.tgProgress = this.stateTime / dur;
        Object.assign(this.telegraph, { x: this.x, y: this.y, dir: this.atkDir });
        if (this.stateTime >= dur) {
          this.telegraph = null;
          this.hitThisAttack = false; this.dodgeCredited = false;
          this.setState('attack');
          this.strikePlayer(this.atkShape, this.atkDir, this.dmg, 460);
          const ix = this.move === 'slam' ? this.x + Math.cos(this.atkDir) * 70 : this.x;
          const iy = this.move === 'slam' ? this.y + Math.sin(this.atkDir) * 70 : this.y;
          game.particles.ring(ix, iy, this.move === 'slam' ? 90 : 110, '255,140,60', 0.4, 9);
          game.arcs.crackle(ix, iy, 6, 4, 70, '255,160,80', 0.16);
          game.particles.debris(ix, iy, 12);
          game.particles.dust(ix, iy, 12, 14, 150);
          game.camera.shake(0.38);
          game.audio.play('stomp');
          game.room.addScorch(ix, iy, 46);
        }
        break;
      }
      case 'attack':
        this.brake(dt);
        if (this.stateTime >= 0.12) { this.superArmor = false; this.setState('recover'); }
        break;
      case 'recover':
        this.brake(dt);
        if (this.stateTime >= 0.85) { this.attackCd = rand(1.4, 2.2); this.setState('idle'); }
        break;
    }
  }

  // Soldado blindado: placas de aço, faixas de luz laranja, elmo com viseira em V
  // e um martelo de impacto que acumula energia antes do golpe
  drawBody(ctx, sx, sy, pal) {
    const side = this.screenSide(), t = this.animTime;
    const moving = Math.hypot(this.vx, this.vy) > 12;
    const step = moving ? Math.sin(t * 6) : 0;
    const breathe = Math.sin(t * 2) * 1.2;
    let clubA = -2.2, shake = 0;   // ângulo do martelo (tela), negativo = erguido
    if (this.state === 'windup') { clubA = -2.9; shake = Math.sin(t * 60) * 1.5 * this.tgProgress; }
    else if (this.state === 'attack' || this.state === 'recover') clubA = 0.6;
    if (this.move === 'stomp' && this.state === 'windup') clubA = -1.7;
    const glowOn = pal === this.pal;
    ctx.save();
    ctx.translate(sx + shake, sy - Math.abs(step) * 2);
    // Pernas blindadas
    ctx.fillStyle = pal.suit;
    ctx.fillRect(-15 + step * 3, -24, 11, 24);
    ctx.fillRect(4 - step * 3, -24, 11, 24);
    ctx.fillStyle = pal.armor;
    ctx.fillRect(-16 + step * 3, -20, 13, 9);
    ctx.fillRect(3 - step * 3, -20, 13, 9);
    ctx.fillRect(-17 + step * 3, -6, 14, 6);
    ctx.fillRect(3 - step * 3, -6, 14, 6);
    ctx.fillStyle = pal.trim;
    ctx.fillRect(-14 + step * 3, -15, 8, 1.6);
    ctx.fillRect(5 - step * 3, -15, 8, 1.6);
    // Tronco massivo
    ctx.fillStyle = pal.suit;
    ctx.beginPath();
    ctx.moveTo(-17, -22); ctx.lineTo(17, -22); ctx.lineTo(25, -56 - breathe); ctx.lineTo(-25, -56 - breathe);
    ctx.closePath(); ctx.fill();
    // Placa peitoral com faixas de luz laranja
    ctx.fillStyle = pal.armor;
    ctx.beginPath();
    ctx.moveTo(-15, -27); ctx.lineTo(15, -27); ctx.lineTo(20, -52 - breathe); ctx.lineTo(-20, -52 - breathe);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.armorHi;
    ctx.fillRect(-side * 17, -50 - breathe, 6, 20);
    ctx.fillStyle = pal.suitHi;
    ctx.fillRect(-2, -50 - breathe, 4, 22);
    ctx.fillStyle = pal.trim;
    ctx.fillRect(-13, -44 - breathe, 7, 2);
    ctx.fillRect(6, -44 - breathe, 7, 2);
    if (glowOn) { game.addGlow(ctx, -9.5, -43 - breathe, 7, '255,130,40', 0.4); game.addGlow(ctx, 9.5, -43 - breathe, 7, '255,130,40', 0.4); }
    // Cinto com bolsas
    ctx.fillStyle = pal.suitHi;
    ctx.fillRect(-16, -29, 32, 4);
    ctx.fillStyle = pal.armor;
    ctx.fillRect(-12, -28, 6, 5); ctx.fillRect(6, -28, 6, 5);
    // Braço de trás
    ctx.fillStyle = pal.suit;
    ctx.beginPath(); ctx.ellipse(-side * 24, -42 - breathe, 7, 12, 0, 0, TAU); ctx.fill();
    // Ombreiras
    for (const k of [-1, 1]) {
      ctx.fillStyle = pal.armor;
      ctx.beginPath(); ctx.ellipse(k * 22, -54 - breathe, 10, 7, k * 0.35, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.armorHi;
      ctx.beginPath(); ctx.ellipse(k * 22 - side * 2, -57 - breathe, 5, 2.6, k * 0.35, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.trim;
      ctx.fillRect(k * 22 - 4, -52 - breathe, 8, 1.4);
    }
    // Elmo com viseira em V
    const hx = side * 3, hy = -64 - breathe;
    ctx.fillStyle = pal.helm;
    ctx.beginPath(); ctx.arc(hx, hy, 10, 0, TAU); ctx.fill();
    ctx.fillRect(hx - 8, hy, 16, 9);
    ctx.fillStyle = pal.armorHi;
    ctx.beginPath(); ctx.arc(hx - side * 4, hy - 4, 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.visor;
    ctx.beginPath();
    ctx.moveTo(hx + side * 2 - 8, hy - 2); ctx.lineTo(hx + side * 2, hy + 3); ctx.lineTo(hx + side * 2 + 8, hy - 2);
    ctx.lineTo(hx + side * 2 + 7, hy + 1); ctx.lineTo(hx + side * 2, hy + 6); ctx.lineTo(hx + side * 2 - 7, hy + 1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.suitHi;
    ctx.fillRect(hx + side * 2 - 3, hy + 6, 6, 3);   // grade do respirador
    if (glowOn) game.addGlow(ctx, hx + side * 2, hy + 1, 13, '255,130,40', 0.85);
    // Braço da frente com o martelo de impacto
    const shx = side * 22, shy = -48 - breathe;
    const ca = side > 0 ? clubA : Math.PI - clubA;
    const cx = shx + Math.cos(ca) * 46, cy = shy + Math.sin(ca) * 46;
    ctx.strokeStyle = pal.armor; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(shx + Math.cos(ca) * 14, shy + Math.sin(ca) * 14); ctx.stroke();
    ctx.strokeStyle = pal.hammer; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(shx + Math.cos(ca) * 10, shy + Math.sin(ca) * 10); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.lineCap = 'butt';
    // Cabeça do martelo (bloco perpendicular ao cabo)
    const nx = -Math.sin(ca), ny = Math.cos(ca), ux = Math.cos(ca), uy = Math.sin(ca);
    ctx.fillStyle = pal.hammer;
    ctx.beginPath();
    ctx.moveTo(cx + nx * 13 - ux * 7, cy + ny * 13 - uy * 7); ctx.lineTo(cx + nx * 13 + ux * 7, cy + ny * 13 + uy * 7);
    ctx.lineTo(cx - nx * 13 + ux * 7, cy - ny * 13 + uy * 7); ctx.lineTo(cx - nx * 13 - ux * 7, cy - ny * 13 - uy * 7);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.hammerHi; ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = pal.core;
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fill();
    if (glowOn) {
      const k = this.state === 'windup' ? this.tgProgress : 0;
      game.addGlow(ctx, cx, cy, 10 + 22 * k, '255,120,40', 0.4 + 0.5 * k);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// ATIRADORES: mantêm distância, recuam e disparam projéteis
//   drone     — Drone Sentinela de NEXUS (laser vermelho)
//   sacerdote — Sacerdote do Culto do Eclipse (orbes de dados violeta)
// ---------------------------------------------------------------------------
class Shooter extends Enemy {
  constructor(type, x, y, level) {
    super(type, x, y, level);
    this.pal = type === 'drone'
      ? { hull: '#2b3039', hullHi: '#58616f', dark: '#121419', lens: '#ff3b3b', rotor: '#8a93a3', light: '#ff5050' }
      : { robe: '#191730', robeDark: '#0c0b1a', trim: '#8a64ff', face: '#dcd8ea', eye: '#c9a0ff', staff: '#3b3f4c', orb: '#c58cff', halo: '#d8bcff' };
    this.prefer = rand(230, 290);
    this.aim = 0;
    this.attackCd = rand(1.2, 2.2);
  }
  think(dt, p) {
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    const toP = Math.atan2(dy, dx);
    switch (this.state) {
      case 'idle': {
        this.strafeTimer -= dt;
        if (this.strafeTimer <= 0) { this.strafeTimer = rand(1.2, 2.6); this.strafeDir *= -1; }
        // Recuar se o jogador está perto, aproximar se está longe (ou escondido atrás de um
        // pilar: contorna até ter a linha de tiro), senão rodear
        const ve = this.vejo(p);
        let radial = 0;
        if (d < 170) radial = -1; else if (d > 340 || !ve) radial = 1;
        const sxv = -dy / d * this.strafeDir, syv = dx / d * this.strafeDir;
        const mx = (dx / d) * radial + sxv * (radial ? 0.45 : 1);
        const my = (dy / d) * radial + syv * (radial ? 0.45 : 1);
        const ml = Math.hypot(mx, my) || 1;
        const sp = this.speed * (radial < 0 ? 1.15 : 0.8), v = this.dv || (this.dv = { x: 0, y: 0 });
        game.room.desvio(this, (mx / ml) * sp, (my / ml) * sp, v, 60);
        this.vx = approach(this.vx, v.x, 700 * dt);
        this.vy = approach(this.vy, v.y, 700 * dt);
        this.faceToward(p.x, p.y, dt);
        if (this.attackCd <= 0 && d < 480 && ve) {
          this.aim = toP;
          this.setState('windup');
          this.telegraph = { kind: 'line', x: this.x, y: this.y, dir: toP, len: Math.min(d, 420), w: 5 };
        }
        break;
      }
      case 'windup': {
        this.brake(dt, 8);
        const dur = 0.65 / Math.min(1.25, this.aggro);
        if (this.stateTime < dur * 0.7) this.aim = angleLerp(this.aim, toP, 1 - Math.exp(-8 * dt));
        this.facing = this.aim;
        this.tgProgress = this.stateTime / dur;
        Object.assign(this.telegraph, { x: this.x, y: this.y, dir: this.aim, len: Math.min(d, 420) });
        if (this.stateTime >= dur) {
          this.telegraph = null;
          this.fire();
          this.setState('recover');
        }
        break;
      }
      case 'recover':
        this.brake(dt, 6);
        if (this.stateTime >= 0.4) { this.attackCd = rand(1.9, 2.8); this.setState('idle'); }
        break;
    }
  }
  fire() {
    const drone = this.type === 'drone';
    const n = this.level >= 3 ? 3 : 1, spread = 0.26, sp = (drone ? 340 : 300) + this.level * 18;
    for (let i = 0; i < n; i++) {
      const a = this.aim + (i - (n - 1) / 2) * spread;
      game.projectiles.spawn({
        x: this.x + Math.cos(a) * 16, y: this.y + Math.sin(a) * 16, z: drone ? 40 : 34,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: drone ? 8 : 9, dmg: this.dmg, hostile: true, kind: drone ? 'laser' : 'orb', life: 2.4,
        efeito: this.projEfeito || null,   // variantes: tiro que deixa lento (js/mundo/variantes.js)
      });
    }
    game.particles.flash(this.x + Math.cos(this.aim) * 16, this.y + Math.sin(this.aim) * 16, 40, 30, drone ? '255,80,80' : '200,120,255', 0.12);
    game.audio.play(drone ? 'laser' : 'shoot');
  }

  drawBody(ctx, sx, sy, pal) {
    if (this.type === 'drone') { this.drawDrone(ctx, sx, sy, pal); return; }
    const side = this.screenSide(), t = this.animTime;
    const hover = 4 + Math.sin(t * 3) * 2;
    ctx.save();
    ctx.translate(sx, sy - hover);
    // Manto em forma de sino
    ctx.fillStyle = pal.robeDark;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-10, -26, -1, -40); ctx.quadraticCurveTo(10, -26, 14, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.robe;
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.quadraticCurveTo(-7, -24, 0, -38); ctx.quadraticCurveTo(side * 6, -22, 6, 0); ctx.closePath(); ctx.fill();
    // Barra rasgada com detalhe violeta
    ctx.strokeStyle = pal.trim; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const x = -14 + i * 28 / 6, y = -1 + (i % 2) * 3 + Math.sin(t * 4 + i) * 1; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    // Linhas de circuito bordadas no manto
    ctx.strokeStyle = pal.trim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-2, -32); ctx.lineTo(-2, -14); ctx.lineTo(-6, -8); ctx.moveTo(2, -30); ctx.lineTo(2, -18); ctx.lineTo(5, -14); ctx.stroke();
    // Capuz com máscara branca e olhos violeta
    ctx.fillStyle = pal.robe;
    ctx.beginPath(); ctx.arc(side * 1, -40, 9, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(side * 1 - 6, -47); ctx.lineTo(side * 1 - side * 4, -56); ctx.lineTo(side * 1 + 6, -46); ctx.fill();
    ctx.fillStyle = pal.face;
    ctx.beginPath(); ctx.ellipse(side * 4, -39, 4.5, 5.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1626';
    ctx.fillRect(side * 4 - 3, -40, 2, 1.8); ctx.fillRect(side * 4 + 1, -40, 2, 1.8);
    if (pal === this.pal) game.addGlow(ctx, side * 4, -40, 6, '200,140,255', 0.6);
    // Auréola de dados flutuando sobre a cabeça
    const hy = -58 + Math.sin(t * 2) * 1.2;
    ctx.strokeStyle = pal.halo; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(side * 1, hy, 9, 3, 0, 0, TAU); ctx.stroke();
    if (pal === this.pal) game.addGlow(ctx, side * 1, hy, 14, '200,140,255', 0.45);
    // Cetro com orbe de dados
    const stx = side * 13;
    ctx.strokeStyle = pal.staff; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(stx, -2); ctx.lineTo(stx, -50); ctx.stroke();
    const charge = this.state === 'windup' ? this.tgProgress : 0;
    ctx.fillStyle = pal.orb;
    ctx.beginPath(); ctx.arc(stx, -54, 4 + charge * 3, 0, TAU); ctx.fill();
    if (pal === this.pal) game.addGlow(ctx, stx, -54, 12 + charge * 22, '190,110,255', 0.5 + charge * 0.5);
    ctx.restore();
  }

  // Drone Sentinela: casco em disco, rotores laterais e lente de mira vermelha
  drawDrone(ctx, sx, sy, pal) {
    const side = this.screenSide(), t = this.animTime;
    const hover = 30 + Math.sin(t * 3.2) * 3;
    const tilt = clamp(this.vx * 0.002, -0.2, 0.2);
    const charge = this.state === 'windup' ? this.tgProgress : 0;
    ctx.save();
    ctx.translate(sx, sy - hover);
    ctx.rotate(tilt);
    // Braços e rotores (borrões girando)
    for (const k of [-1, 1]) {
      ctx.strokeStyle = pal.dark; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(k * 6, -2); ctx.lineTo(k * 15, -6); ctx.stroke();
      ctx.fillStyle = 'rgba(140,150,165,0.35)';
      const w = 8 + Math.abs(Math.sin(t * 40 + k)) * 3;
      ctx.beginPath(); ctx.ellipse(k * 15, -8, w, 2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.rotor;
      ctx.fillRect(k * 15 - 1, -9, 2, 3);
    }
    // Casco
    ctx.fillStyle = pal.dark;
    ctx.beginPath(); ctx.ellipse(0, 2, 11, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.hull;
    ctx.beginPath(); ctx.ellipse(0, -1, 11, 6.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.hullHi;
    ctx.beginPath(); ctx.ellipse(-side * 3, -4, 5, 2, 0, 0, TAU); ctx.fill();
    // Antena com luz de status
    ctx.strokeStyle = pal.dark; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-side * 4, -6); ctx.lineTo(-side * 6, -13); ctx.stroke();
    ctx.fillStyle = pal.light;
    ctx.fillRect(-side * 6 - 1, -14, 2, 2);
    // Lente de mira
    const lx = side * 6, ly = 0;
    ctx.fillStyle = '#05060a';
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.lens;
    ctx.beginPath(); ctx.arc(lx, ly, 2 + charge * 1.5, 0, TAU); ctx.fill();
    if (pal === this.pal) {
      game.addGlow(ctx, lx, ly, 8 + charge * 18, '255,60,60', 0.7 + charge * 0.3);
      if (Math.floor(t * 3) % 2) game.addGlow(ctx, -side * 6, -13, 4, '255,60,60', 0.8);
    }
    ctx.restore();
    // Facho de luz no chão sob o drone
    if (pal === this.pal) game.addGlow(ctx, sx, sy, 16, '255,70,70', 0.12);
  }
}

// ---------------------------------------------------------------------------
// CAÇADOR DA LEGIÃO: unidade sintética rápida — rodeia o jogador e faz
// investidas telegrafadas com lâminas nos braços
// ---------------------------------------------------------------------------
class Hunter extends Enemy {
  constructor(x, y, level) {
    super('cacador', x, y, level);
    this.pal = { body: '#1c2027', bodyHi: '#3d4451', scarf: '#ff7a22', blade: '#c9d1dd', eye: '#ff8a2a', dark: '#0c0e12' };
    this.orbit = rand(150, 190);
    this.atkShape = { type: 'circle', radius: 14, offset: 0 };
    this.atkDir = 0;
    this.dashTarget = 0;
  }
  think(dt, p) {
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    switch (this.state) {
      case 'idle': {
        // Órbita ao redor do jogador
        this.strafeTimer -= dt;
        if (this.strafeTimer <= 0) { this.strafeTimer = rand(0.8, 2); if (chance(0.5)) this.strafeDir *= -1; }
        const a = Math.atan2(this.y - p.y, this.x - p.x) + this.strafeDir * 0.9;
        const tx = p.x + Math.cos(a) * this.orbit, ty = p.y + Math.sin(a) * this.orbit;
        this.moveToward(tx, ty, this.speed, dt, 1200);
        this.faceToward(p.x, p.y, dt, 12);
        if (this.attackCd <= 0 && d < 300 && this.vejo(p) && game.director.request(this)) {
          this.atkDir = Math.atan2(dy, dx);
          this.setState('windup');
          this.telegraph = { kind: 'line', x: this.x, y: this.y, dir: this.atkDir, len: Math.min(d + 70, 330), w: 16 };
          game.audio.play('telegraph');
        }
        break;
      }
      case 'windup': {
        this.brake(dt, 12);
        const dur = 0.42 / Math.min(1.25, this.aggro);
        if (this.stateTime < dur * 0.6) {
          // Mira com leve antecipação do movimento do jogador
          const lx = p.x + p.vx * 0.15, ly = p.y + p.vy * 0.15;
          this.atkDir = angleLerp(this.atkDir, Math.atan2(ly - this.y, lx - this.x), 1 - Math.exp(-10 * dt));
          this.dashTarget = Math.min(dist(this.x, this.y, lx, ly) + 70, 330);
        }
        this.facing = this.atkDir;
        this.tgProgress = this.stateTime / dur;
        Object.assign(this.telegraph, { x: this.x, y: this.y, dir: this.atkDir, len: this.dashTarget || 200 });
        if (this.stateTime >= dur) {
          this.telegraph = null;
          this.hitThisAttack = false; this.dodgeCredited = false;
          this.dashStartX = this.x; this.dashStartY = this.y;
          this.setState('dash');
          game.audio.play('dash');
        }
        break;
      }
      case 'dash': {
        const sp = 760;
        this.vx = Math.cos(this.atkDir) * sp; this.vy = Math.sin(this.atkDir) * sp;
        this.strikePlayer(this.atkShape, this.atkDir, this.dmg, 300);
        if (Math.random() < 0.7) game.particles.emit(P.DUST, this.x, this.y, 10, 0, 0, 10, 0.3, 7, '60,66,78', 0, 0);
        if (Math.random() < 0.5) game.particles.emit(P.EMBER, this.x, this.y, 20, -this.vx * 0.05, -this.vy * 0.05, 10, 0.25, 2, '255,140,50', 0, 2);
        const traveled = dist(this.x, this.y, this.dashStartX, this.dashStartY);
        if (traveled >= (this.dashTarget || 250) || this.stateTime > 0.45) { this.setState('recover'); this.vx *= 0.3; this.vy *= 0.3; }
        break;
      }
      case 'recover':
        this.brake(dt, 7);
        if (this.stateTime >= 0.6) { this.releaseToken(); this.attackCd = rand(1.3, 2.1); this.setState('idle'); }
        break;
      case 'evade': {
        // Salto para trás após ser atingido
        if (this.stateTime >= 0.35) this.setState('idle');
        break;
      }
    }
  }
  afterStun() {
    if (chance(0.4)) {
      const p = game.player, a = Math.atan2(this.y - p.y, this.x - p.x);
      this.vx = Math.cos(a) * 330; this.vy = Math.sin(a) * 330; this.vz = 260; this.z = 1;
      this.setState('evade');
    } else this.setState('idle');
  }

  drawBody(ctx, sx, sy, pal) {
    const side = this.screenSide(), t = this.animTime;
    const moving = Math.hypot(this.vx, this.vy) > 30;
    let crouch = 0, stretch = 0;
    if (this.state === 'windup') crouch = 6 * Math.min(1, this.tgProgress);
    if (this.state === 'dash') stretch = 1;
    const run = moving ? Math.sin(t * 18) * 4 : 0;
    ctx.save();
    ctx.translate(sx, sy);
    // Cabo energizado esvoaçante
    ctx.strokeStyle = pal.scarf; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(side * 3, -28 + crouch);
    ctx.quadraticCurveTo(-side * 12, -30 + crouch + Math.sin(t * 10) * 3, -side * (22 + stretch * 10), -24 + crouch + Math.sin(t * 12) * 4);
    ctx.stroke();
    // Pernas dobradas
    ctx.strokeStyle = pal.dark; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-2, -14 + crouch); ctx.lineTo(-7 + run, -7 + crouch * 0.5); ctx.lineTo(-4 + run, 0);
    ctx.moveTo(3, -14 + crouch); ctx.lineTo(8 - run, -7 + crouch * 0.5); ctx.lineTo(5 - run, 0);
    ctx.stroke();
    // Tronco esguio inclinado
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.moveTo(-4, -13 + crouch); ctx.lineTo(5, -13 + crouch);
    ctx.lineTo(side * (8 + stretch * 6), -30 + crouch); ctx.lineTo(side * (1 + stretch * 6) - side * 6, -31 + crouch);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.bodyHi;
    ctx.fillRect(side * (3 + stretch * 4) - 1, -28 + crouch, 2, 12);
    // Cabeça e olhos
    const hx = side * (7 + stretch * 8), hy = -35 + crouch;
    ctx.fillStyle = pal.body;
    ctx.beginPath(); ctx.arc(hx, hy, 5.5, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.eye;
    ctx.fillRect(hx + side * 1.5 - 1, hy - 1.5, 3, 1.6);
    if (pal === this.pal) game.addGlow(ctx, hx + side * 1.5, hy - 1, 7, '255,140,40', 0.75);
    // Braços-lâmina
    const bladeA = this.state === 'dash' ? 0.15 : this.state === 'windup' ? -2.2 : 0.9;
    for (let i = 0; i < 2; i++) {
      const ox = side * (2 + i * 4), oy = -24 + crouch + i * 3;
      const a = side > 0 ? bladeA + i * 0.35 : Math.PI - bladeA - i * 0.35;
      const len = 22 + stretch * 6;
      ctx.fillStyle = pal.blade;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(a - 0.12) * len * 0.5, oy + Math.sin(a - 0.12) * len * 0.5);
      ctx.lineTo(ox + Math.cos(a) * len, oy + Math.sin(a) * len);
      ctx.lineTo(ox + Math.cos(a + 0.12) * len * 0.4, oy + Math.sin(a + 0.12) * len * 0.4);
      ctx.closePath(); ctx.fill();
      if (pal === this.pal && (this.state === 'dash' || this.state === 'windup')) {
        game.addGlow(ctx, ox + Math.cos(a) * len * 0.7, oy + Math.sin(a) * len * 0.7, 10, '255,130,40', 0.5);
      }
    }
    ctx.lineCap = 'butt';
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// DIRETOR DE IA: distribui posições de cerco e limita atacantes simultâneos
// ---------------------------------------------------------------------------
class AIDirector {
  constructor() { this.tokens = new Set(); this.maxTokens = 2; this.list = []; }
  reset(level) { this.tokens.clear(); this.maxTokens = 2 + Math.floor(level / 2); }
  request(e) {
    if (e.hasToken) return true;
    for (const t of this.tokens) if (!t.alive || t.state === 'dying') { this.tokens.delete(t); t.hasToken = false; }
    if (this.tokens.size < this.maxTokens) { this.tokens.add(e); e.hasToken = true; return true; }
    return false;
  }
  release(e) { this.tokens.delete(e); e.hasToken = false; }
  update() {
    const p = game.player, list = this.list;
    list.length = 0;
    for (const e of game.enemies) if (e.usesSlots && e.alive && e.state !== 'dying' && e.state !== 'spawn') list.push(e);
    const n = list.length;
    if (!n) return;
    for (const e of list) e.ang = Math.atan2(e.y - p.y, e.x - p.x);
    list.sort((a, b) => a.ang - b.ang);
    // Ângulos igualmente espaçados, alinhados à posição média atual (estável)
    const step = TAU / n;
    let off = 0;
    for (let i = 0; i < n; i++) off += angleDiff(list[0].ang + i * step, list[i].ang);
    const base = list[0].ang + off / n;
    for (let i = 0; i < n; i++) list[i].slotAngle = base + i * step;
  }
}

// Fábrica de inimigos
function createEnemy(type, x, y, level) {
  switch (type) {
    case 'rastejador': return new Crawler(x, y, level);
    case 'legionario': return new Legionary(x, y, level);
    case 'drone':
    case 'sacerdote': return new Shooter(type, x, y, level);
    case 'cacador': return new Hunter(x, y, level);
  }
  return new Crawler(x, y, level);
}

// ---------------------------------------------------------------------------
// Dano genérico ao jogador vindo de perigos de área (com esquiva perfeita)
// ---------------------------------------------------------------------------
function damagePlayerFrom(src, x, y, dmg, kb) {
  const p = game.player;
  if (p.state === 'dead') return false;
  // pulo por cima da onda ou do impacto no chão (js/heroes/pulo_defesa.js): vale como esquiva perfeita
  if (p.z > PULO.ALTO) {
    if (!src.dodgeCredited) { src.dodgeCredited = true; game.onPerfectDodge(p); }
    return false;
  }
  if (p.state === 'dash' && p.invuln > 0) {
    if (!src.dodgeCredited) { src.dodgeCredited = true; game.onPerfectDodge(p); }
    return false;
  }
  return p.takeDamage(dmg, x, y, kb);
}

