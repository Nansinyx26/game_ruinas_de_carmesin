'use strict';
// ECLIPSE ZERO · Chefe NEXUS e perigos de área
// ---------------------------------------------------------------------------
// PERIGOS DE ÁREA do chefe: raios do céu artificial, fragmentos do céu que
// desabam e ondas de choque de dados
// ---------------------------------------------------------------------------
class HazardSystem {
  constructor() { this.list = []; }
  clear() { this.list.length = 0; }
  add(h) {
    h.t = 0; h.fired = false; h.fx = 0; h.hit = false; h.dodgeCredited = false;
    h.spin = rand(0, TAU);
    this.list.push(h);
    return h;
  }
  update(dt) {
    const p = game.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const h = this.list[i];
      h.t += dt;
      if (h.kind === 'ring') {
        // Onda de choque expansiva: atinge quem estiver sobre a borda
        const k = h.t / h.dur;
        h.radius = lerp(h.r0, h.r1, easeOutCubic(Math.min(1, k)));
        if (!h.hit && Math.abs(dist(h.x, h.y, p.x, p.y) - h.radius) <= h.w + p.radius) {
          if (damagePlayerFrom(h, h.x, h.y, h.dmg, 320)) h.hit = true;
        }
        if (k >= 1) this.list.splice(i, 1);
        continue;
      }
      // Raios e fragmentos: aviso no chão e depois o impacto
      if (!h.fired && h.t >= h.delay) {
        h.fired = true;
        if (dist(h.x, h.y, p.x, p.y) <= h.r + p.radius) damagePlayerFrom(h, h.x, h.y, h.dmg, 300);
        const P_ = game.particles;
        if (h.kind === 'bolt') {
          game.arcs.spawn(h.x + rand(-40, 40), h.y + rand(-40, 40), 560, h.x, h.y, 0, { w: 4, life: 0.32, rgb: '150,240,255', jag: 0.16 });
          game.arcs.spawn(h.x + rand(-60, 60), h.y + rand(-60, 60), 520, h.x, h.y, 0, { w: 2, life: 0.22, rgb: '120,220,255', jag: 0.2 });
          P_.flash(h.x, h.y, 30, 80, '170,240,255', 0.25);
          P_.sparks(h.x, h.y, 10, -Math.PI / 2, 10, '190,245,255', 320, Math.PI);
          P_.ring(h.x, h.y, h.r * 1.2, '120,230,255', 0.35, 6);
          game.camera.shake(0.12);
          game.audio.play('thunder', 0.6);
        } else {
          P_.flash(h.x, h.y, 10, 90, '140,240,255', 0.28);
          P_.ring(h.x, h.y, h.r * 1.3, '90,220,255', 0.45, 10);
          P_.debris(h.x, h.y, 12, '70,100,120');
          P_.dust(h.x, h.y, 10, 16, 160);
          P_.embers(h.x, h.y, 0, 10, '120,240,255', h.r * 0.5, 120);
          game.camera.shake(0.18);
          game.audio.play('explosion');
        }
        game.room.addScorch(h.x, h.y, h.r * 0.8);
      }
      if (h.fired) {
        h.fx += dt;
        if (h.fx >= 0.5) this.list.splice(i, 1);
      }
    }
  }
  // Camada emissiva (depois da iluminação)
  draw(ctx, time) {
    for (const h of this.list) {
      const sx = isoX(h.x, h.y), sy = isoY(h.x, h.y);
      if (h.kind === 'ring') {
        const a = 1 - h.t / h.dur;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rgba('60,200,255', 0.35 * a);
        ctx.lineWidth = h.w * 2.4;
        ctx.beginPath(); ctx.ellipse(sx, sy, Math.max(0.5, h.radius * ISO_RX), Math.max(0.5, h.radius * ISO_RY), 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = rgba('210,255,255', 0.85 * a);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        continue;
      }
      if (!h.fired) {
        drawTelegraph(ctx, { kind: 'circle', x: h.x, y: h.y, r: h.r }, h.t / h.delay, time, h.kind === 'bolt' ? '255,60,120' : '255,46,70');
        if (h.kind === 'shard') {
          // Painel hexagonal do céu artificial caindo no final do aviso
          const rem = h.delay - h.t;
          if (rem < 0.6) {
            const z = (rem / 0.6) * 480;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(sx + z * 0.2, sy - z);
            ctx.rotate(h.spin + time * 3);
            ctx.fillStyle = 'rgba(90,200,255,0.35)';
            ctx.strokeStyle = 'rgba(200,250,255,0.9)'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; k ? ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 10) : ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 10); }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            GlowCache.draw(ctx, '120,220,255', sx + z * 0.2, sy - z, 34, 0.7);
            ctx.restore();
          }
        } else if (h.t / h.delay > 0.6 && Math.random() < 0.3) {
          // Estática no céu antes do raio
          game.arcs.crackle(h.x, h.y, 300, 1, 50, '150,240,255', 0.06);
        }
      } else {
        const a = 1 - h.fx / 0.5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        if (h.kind === 'bolt') {
          for (let i = 0; i < 7; i++) {
            const yy = sy - i * 18 * (0.6 + a * 0.6);
            GlowCache.draw(ctx, i < 2 ? '220,255,255' : '90,210,255', sx + Math.sin(time * 30 + i) * 2, yy, (30 - i * 3) * (0.6 + a * 0.5), a * 0.8);
          }
        } else {
          GlowCache.drawFlat(ctx, '90,210,255', sx, sy, h.r * 1.8, a);
        }
        ctx.restore();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// CHEFE: NEXUS, a consciência do Eclipse — 3 fases, ataques telegrafados.
// Uma silhueta humana formada por milhares de fragmentos luminosos
// ---------------------------------------------------------------------------
const BOSS_MOVES = {
  1: ['sweep', 'jump', 'burst'],
  2: ['sweep', 'jump', 'burst', 'charge', 'pillars'],
  3: ['sweep', 'jump', 'burst', 'charge', 'pillars', 'spiral', 'meteor'],
};

class Boss extends Enemy {
  constructor(x, y) {
    super('legionario', x, y, 5);
    this.type = 'chefe';
    this.isBoss = true;
    this.name = 'NEXUS — A CONSCIÊNCIA DO ECLIPSE';
    this.T = Object.assign({}, ENEMY_TYPES.legionario, { score: 6000, souls: [40, 50], orb: 0, blood: '60,200,220', glow: '120,255,235', height: 128, mech: true });
    this.maxHp = this.hp = Math.round(2600 * Settings.diff.hp);
    this.radius = 38; this.mass = 14; this.height = 128;
    this.dmg = 22; this.speed = 92;
    this.launchable = false; this.stunMult = 0;
    this.phase = 1;
    this.maxPoise = 260; this.poise = 260; this.sinceHit = 0;
    this.invulnerable = true;
    this.state = 'intro'; this.stateTime = 0;
    this.jumpZ = 0;
    this.lastMove = null;
    this.idleTime = 1;
    this.casts = 0; this.fireTimer = 0; this.spiralA = 0; this.wave = 0;
    this.touchingWall = false;
    this.pal = { body: '#7fefff', bodyHi: '#e6ffff', frag: '#8ff4ff', core: '#ffffff', halo: '#bffcff', blade: '#dcffff', edge: '#7fefff', eye: '#ffffff' };
  }

  canBeHit() { return this.alive && this.state !== 'dying' && !this.invulnerable; }

  update(dt) {
    if (this.state === 'dying') {
      this.stateTime += dt; this.animTime += dt;
      if (this.flash > 0) this.flash -= dt;
      // Colapso em cadeia: a silhueta se desfaz em fragmentos e descargas
      if (Math.random() < dt * 14) {
        const ox = this.x + rand(-40, 40), oy = this.y + rand(-40, 40);
        game.particles.flash(ox, oy, rand(20, 110), rand(30, 70), '140,240,255', 0.2);
        game.particles.sparks(ox, oy, 60, rand(0, TAU), 6, '200,250,255', 380, Math.PI);
        game.particles.embers(ox, oy, 40, 4, '120,240,255', 30, 140);
        if (Math.random() < 0.5) game.arcs.spawn(this.x, this.y, 90, ox + rand(-60, 60), oy + rand(-60, 60), rand(0, 120), { w: 2, life: 0.18, rgb: '150,240,255' });
        game.audio.play('explosion');
        game.camera.shake(0.1);
      }
      if (this.stateTime >= 2.4) { this.alive = false; game.onBossDefeated(this); }
      return;
    }
    this.sinceHit += dt;
    if (this.sinceHit > 2 && this.state !== 'stagger') this.poise = Math.min(this.maxPoise, this.poise + 45 * dt);
    super.update(dt);
  }

  takeHit(h) {
    if (!this.canBeHit()) return false;
    this.hp -= h.dmg;
    this.flash = 0.08;
    this.sinceHit = 0;
    this.kbx += h.kx * h.kb * 0.03; this.kby += h.ky * h.kb * 0.03;
    if (this.hp <= 0) { this.hp = 0; this.die(h); return true; }
    if (this.state !== 'stagger' && this.state !== 'transition') {
      this.poise -= h.dmg * (h.poise || 1);
      if (this.poise <= 0) this.enterStagger();
    }
    const r = this.hp / this.maxHp;
    if (this.phase === 1 && r <= 0.66) this.startTransition(2);
    else if (this.phase === 2 && r <= 0.33) this.startTransition(3);
    return true;
  }

  die() {
    this.interrupt();
    this.setState('dying');
    this.invulnerable = true;
    this.jumpZ = 0;
    game.hazards.clear();
    game.projectiles.clearHostile(true);
    game.onEnemyKilled(this);
    game.onBossDying(this);
  }

  enterStagger() {
    this.interrupt();
    this.jumpZ = 0;
    this.setState('stagger');
    this.vulnerable = 1.3;
    this.poise = this.maxPoise;
    game.texts.spawn(this.x, this.y, 150, 'SISTEMA INSTÁVEL!', '#9fe8ff', 28, 1.2);
    game.audio.play('hitHeavy');
    game.audio.play('glitch');
    game.camera.shake(0.3);
    game.particles.ring(this.x, this.y, 90, '150,240,255', 0.5, 8);
    game.arcs.crackle(this.x, this.y, 90, 6, 70, '150,240,255', 0.2);
  }

  roar() {
    game.audio.play('bossRoar');
    game.audio.play('glitch');
    game.glitch(0.35);
    game.camera.shake(0.7);
    game.particles.ring(this.x, this.y, 260, '60,200,255', 0.8, 14);
    game.particles.ring(this.x, this.y, 160, '210,255,255', 0.5, 8);
    game.particles.dust(this.x, this.y, 18, 18, 260);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU, r = rand(150, 240);
      game.arcs.spawn(this.x, this.y, 90, this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, 0, { w: 2.4, life: 0.3, rgb: '150,240,255' });
    }
    // Empurra o jogador sem causar dano
    const p = game.player, d = dist(this.x, this.y, p.x, p.y) || 1;
    if (d < 300) { p.kbx += ((p.x - this.x) / d) * 700; p.kby += ((p.y - this.y) / d) * 700; }
  }

  startTransition(ph) {
    this.phase = ph;
    this.interrupt();
    this.jumpZ = 0;
    this.vulnerable = 1;
    this.setState('transition');
    this.invulnerable = true;
    this.poise = this.maxPoise;
    this.speed *= 1.12;
    this.summoned = false;
    game.projectiles.clearHostile(true);
    game.hud.message(ph === 2 ? 'PROTOCOLO DE CONTENÇÃO' : 'O CÉU ARTIFICIAL DESMORONA', ph === 2 ? 'FASE II' : 'FASE III', 2.2, false, true);
    if (ph === 2) game.hud.say('NEXUS', 'Eu preservei o que restou deste mundo. Você veio terminar o que eles começaram?', 4.2);
    else game.hud.say('NEXUS', 'Destrua-me e as cidades se apagam. Absorva-me e você se torna eu. Escolha, Unidade ZERO.', 4.6);
    this.roar();
  }

  // Escolhe o próximo ataque conforme a fase e a distância (sem repetir o anterior)
  chooseAttack(d) {
    const moves = BOSS_MOVES[this.phase];
    const w = {
      sweep: d < 190 ? 5 : 0.5, jump: d > 160 ? 3 : 1.5, burst: 2.2,
      charge: d > 220 ? 3.5 : 1, pillars: d > 180 ? 3 : 1.5, spiral: 2.2, meteor: 2,
    };
    let total = 0;
    for (const m of moves) if (m !== this.lastMove) total += w[m];
    let r = Math.random() * total, pick_ = moves[0];
    for (const m of moves) {
      if (m === this.lastMove) continue;
      r -= w[m];
      if (r <= 0) { pick_ = m; break; }
    }
    this.lastMove = pick_;
    this.startMove(pick_);
  }

  // Duração das preparações diminui a cada fase
  wind(base) { return base * (this.phase === 1 ? 1 : this.phase === 2 ? 0.85 : 0.72); }

  startMove(m) {
    const p = game.player;
    const toP = Math.atan2(p.y - this.y, p.x - this.x);
    this.atkDir = toP; this.facing = toP;
    this.hitThisAttack = false; this.dodgeCredited = false;
    switch (m) {
      case 'sweep':
        this.atkShape = { type: 'arc', range: 178, arc: 1.25 };
        this.telegraph = { kind: 'cone', x: this.x, y: this.y, r: 178, dir: toP, arc: 1.25 };
        this.setState('sweep_windup');
        break;
      case 'jump':
        this.setState('jump_windup');
        break;
      case 'burst':
        this.setState('burst_windup');
        this.wave = 0;
        break;
      case 'charge':
        this.atkShape = { type: 'circle', radius: 50, offset: 0 };
        this.telegraph = { kind: 'line', x: this.x, y: this.y, dir: toP, len: 560, w: 46 };
        this.setState('charge_windup');
        break;
      case 'pillars':
        this.setState('pillars');
        this.casts = 0; this.fireTimer = 0.2;
        break;
      case 'spiral':
        this.setState('spiral');
        this.spiralA = toP; this.fireTimer = 0;
        break;
      case 'meteor':
        this.setState('meteor');
        this.casts = 0;
        break;
    }
    game.audio.play('telegraph');
  }

  think(dt, p) {
    const d = dist(this.x, this.y, p.x, p.y);
    const toP = Math.atan2(p.y - this.y, p.x - this.x);
    switch (this.state) {
      case 'intro':
        this.brake(dt);
        if (this.stateTime > 0.9 && !this.roared) { this.roared = true; this.roar(); game.hud.say('NEXUS', 'Você demorou, Kael.', 3.2); }
        if (Math.random() < 0.7) game.particles.converge(this.x, this.y, 90, 2, 160, '120,240,255', 0.5);
        if (this.stateTime >= 2.8) { this.invulnerable = false; this.setState('idle'); this.idleTime = 0.6; }
        break;

      case 'idle':
        if (d > 110) this.moveToward(p.x, p.y, this.speed, dt, 500); else this.brake(dt, 6);
        this.faceToward(p.x, p.y, dt, 5);
        if (this.stateTime >= this.idleTime) this.chooseAttack(d);
        break;

      case 'recover':
        this.brake(dt, 8);
        if (this.stateTime >= this.recoverTime) {
          this.setState('idle');
          this.idleTime = rand(0.45, 1.0) * (this.phase === 3 ? 0.6 : 1);
        }
        break;

      // ----- Corte amplo em cone
      case 'sweep_windup': {
        this.brake(dt, 8);
        const dur = this.wind(0.8);
        if (this.stateTime < dur * 0.5) { this.atkDir = angleLerp(this.atkDir, toP, 1 - Math.exp(-4 * dt)); this.facing = this.atkDir; }
        this.tgProgress = this.stateTime / dur;
        Object.assign(this.telegraph, { x: this.x, y: this.y, dir: this.atkDir });
        if (this.stateTime >= dur) {
          this.telegraph = null;
          this.setState('sweep');
          this.strikePlayer(this.atkShape, this.atkDir, this.dmg, 420);
          game.audio.play('swingHeavy');
          game.camera.shake(0.25);
          const tr = game.trails.create('60,220,255', '220,255,255', 0.2);
          for (let i = 0; i <= 14; i++) {
            const a = this.atkDir - 1.25 + (2.5 * i) / 14;
            tr.add(this.x + Math.cos(a) * 40, this.y + Math.sin(a) * 40, this.x + Math.cos(a) * 175, this.y + Math.sin(a) * 175, 40, (14 - i) * 0.008);
          }
          tr.release();
        }
        break;
      }
      case 'sweep':
        this.brake(dt);
        if (this.stateTime >= 0.15) {
          // Na fase 3 o corte vem em dupla
          if (this.phase === 3 && !this.secondSweep) {
            this.secondSweep = true;
            this.hitThisAttack = false; this.dodgeCredited = false;
            this.atkDir = toP;
            this.telegraph = { kind: 'cone', x: this.x, y: this.y, r: 178, dir: toP, arc: 1.25 };
            this.setState('sweep_windup');
            this.stateTime = this.wind(0.8) * 0.35;
          } else {
            this.secondSweep = false;
            this.recoverTime = this.phase === 1 ? 0.75 : 0.55;
            this.setState('recover');
          }
        }
        break;

      // ----- Salto esmagador com onda de choque
      case 'jump_windup':
        this.brake(dt, 10);
        if (this.stateTime >= this.wind(0.45)) {
          this.jumpFromX = this.x; this.jumpFromY = this.y;
          this.jumpToX = p.x; this.jumpToY = p.y;
          this.telegraph = { kind: 'circle', x: p.x, y: p.y, r: 118 };
          this.invulnerable = true;
          this.setState('jump');
          game.audio.play('jump');
          game.particles.dust(this.x, this.y, 12, 16, 180);
        }
        break;
      case 'jump': {
        const dur = 0.85;
        const k = Math.min(1, this.stateTime / dur);
        this.x = lerp(this.jumpFromX, this.jumpToX, easeInOut(k));
        this.y = lerp(this.jumpFromY, this.jumpToY, easeInOut(k));
        this.vx = this.vy = 0;
        this.jumpZ = Math.sin(k * Math.PI) * 190;
        this.tgProgress = k;
        if (k >= 1) {
          this.jumpZ = 0;
          this.invulnerable = false;
          this.telegraph = null;
          this.atkShape = { type: 'circle', radius: 118, offset: 0 };
          this.strikePlayer(this.atkShape, 0, this.dmg + 6, 480);
          game.hazards.add({ kind: 'ring', x: this.x, y: this.y, r0: 60, r1: 320, dur: 0.75, w: 14, dmg: 14 });
          if (this.phase >= 2) game.hazards.add({ kind: 'ring', x: this.x, y: this.y, r0: 20, r1: 280, dur: 1.05, w: 12, dmg: 14 });
          game.particles.ring(this.x, this.y, 140, '90,220,255', 0.4, 12);
          game.particles.debris(this.x, this.y, 22, '50,70,84');
          game.particles.dust(this.x, this.y, 22, 20, 260);
          game.particles.flash(this.x, this.y, 10, 130, '150,240,255', 0.2);
          game.arcs.crackle(this.x, this.y, 6, 6, 120, '150,240,255', 0.22);
          game.camera.shake(0.7);
          game.camera.zoomPunch(0.04);
          game.audio.play('stomp');
          game.audio.play('explosion');
          game.room.addScorch(this.x, this.y, 110);
          this.recoverTime = this.phase === 1 ? 1.0 : 0.75;
          this.setState('recover');
        }
        break;
      }

      // ----- Explosão de projéteis em anel
      case 'burst_windup': {
        this.brake(dt, 8);
        const dur = this.wind(0.75);
        this.tgProgress = this.stateTime / dur;
        if (Math.random() < 0.6) game.particles.converge(this.x, this.y, 70, 2, 120, '120,240,255', 0.4);
        if (this.stateTime >= dur) { this.setState('burst'); this.fireBurst(); }
        break;
      }
      case 'burst':
        this.brake(dt, 8);
        if (this.phase >= 2 && this.wave < 2 && this.stateTime >= 0.32 * this.wave) { this.fireBurst(); }
        if (this.stateTime >= 0.75) { this.recoverTime = 0.55; this.setState('recover'); }
        break;

      // ----- Investida pela arena
      case 'charge_windup': {
        this.brake(dt, 10);
        const dur = this.wind(0.8);
        if (this.stateTime < dur * 0.6) { this.atkDir = angleLerp(this.atkDir, toP, 1 - Math.exp(-6 * dt)); this.facing = this.atkDir; }
        this.tgProgress = this.stateTime / dur;
        Object.assign(this.telegraph, { x: this.x, y: this.y, dir: this.atkDir });
        if (this.stateTime >= dur) {
          this.telegraph = null;
          this.chargeFromX = this.x; this.chargeFromY = this.y;
          this.touchingWall = false;
          this.setState('charging');
          game.audio.play('dash');
          game.audio.play('swingHeavy');
        }
        break;
      }
      case 'charging': {
        this.vx = Math.cos(this.atkDir) * 920; this.vy = Math.sin(this.atkDir) * 920;
        this.strikePlayer(this.atkShape, this.atkDir, this.dmg + 4, 520);
        if (Math.random() < 0.8) game.particles.dust(this.x, this.y, 1, 16, 60);
        if (Math.random() < 0.9) game.particles.emit(P.WISP, this.x + rand(-20, 20), this.y + rand(-20, 20), rand(20, 110), 0, 0, 0, 0.35, 3, '150,240,255', 0, 0);
        const traveled = dist(this.x, this.y, this.chargeFromX, this.chargeFromY);
        if (this.touchingWall && this.stateTime > 0.08) {
          // Bate na parede: tremor forte e fica vulnerável por um instante
          this.vx = this.vy = 0;
          game.camera.shake(0.6);
          game.particles.debris(this.x, this.y, 18);
          game.particles.dust(this.x, this.y, 14, 18, 200);
          game.audio.play('stomp');
          this.recoverTime = 1.2;
          this.setState('recover');
        } else if (traveled >= 560 || this.stateTime > 0.9) {
          this.vx *= 0.3; this.vy *= 0.3;
          this.recoverTime = 0.7;
          this.setState('recover');
        }
        break;
      }

      // ----- Raios do céu artificial sob o jogador
      case 'pillars': {
        this.brake(dt, 8);
        this.fireTimer -= dt;
        const total = this.phase === 3 ? 7 : 5;
        if (this.fireTimer <= 0 && this.casts < total) {
          this.casts++;
          this.fireTimer = 0.3;
          game.hazards.add({ kind: 'bolt', x: p.x + p.vx * 0.2, y: p.y + p.vy * 0.2, r: 54, delay: 0.75, dmg: 18 });
        }
        if (this.casts >= total && this.stateTime > total * 0.3 + 0.4) { this.recoverTime = 0.5; this.setState('recover'); }
        break;
      }

      // ----- Espiral de projéteis (fase 3)
      case 'spiral': {
        this.brake(dt, 8);
        this.fireTimer -= dt;
        this.spiralA += dt * 2.1;
        if (this.stateTime > 0.5 && this.fireTimer <= 0 && this.stateTime < 3.1) {
          this.fireTimer = 0.1;
          for (let k = 0; k < 3; k++) {
            const a = this.spiralA + (k * TAU) / 3;
            game.projectiles.spawn({ x: this.x + Math.cos(a) * 34, y: this.y + Math.sin(a) * 34, z: 60,
              vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 10, dmg: 12, hostile: true, kind: 'data', life: 3 });
          }
          game.audio.play('fireball');
        }
        if (this.stateTime >= 3.4) { this.recoverTime = 0.6; this.setState('recover'); }
        break;
      }

      // ----- O céu artificial desmorona: fragmentos caem pela arena (fase 3)
      case 'meteor':
        this.brake(dt, 8);
        if (this.stateTime >= 0.8 && this.casts === 0) {
          this.casts = 1;
          const room = game.room;
          for (let i = 0; i < 10; i++) {
            const pt = room.randomPoint(40);
            game.hazards.add({ kind: 'shard', x: pt.x, y: pt.y, r: 62, delay: rand(0.9, 1.7), dmg: 22 });
          }
          game.hazards.add({ kind: 'shard', x: p.x, y: p.y, r: 62, delay: 1.0, dmg: 22 });
          game.hazards.add({ kind: 'shard', x: p.x + p.vx * 0.5, y: p.y + p.vy * 0.5, r: 62, delay: 1.5, dmg: 22 });
          game.camera.shake(0.3);
          game.glitch(0.25);
          game.room.skyCrack = Math.min(1, (game.room.skyCrack || 0) + 0.35);
        }
        if (this.stateTime >= 1.6) { this.recoverTime = 0.6; this.setState('recover'); }
        break;

      // ----- Transição de fase: NEXUS convoca suas defesas
      case 'transition':
        this.brake(dt, 10);
        if (this.stateTime >= 1.2 && !this.summoned) {
          this.summoned = true;
          const adds = this.phase === 2 ? ['rastejador', 'rastejador', 'rastejador', 'rastejador'] : ['rastejador', 'rastejador', 'cacador', 'cacador', 'sacerdote'];
          for (const t of adds) {
            const pt = game.room.randomPoint(60, game.player, 200);
            const e = game.waves.spawnEnemy(t, pt.x, pt.y, 4);
            game.arcs.spawn(this.x, this.y, 90, e.x, e.y, 10, { w: 2, life: 0.35, rgb: '150,240,255' });
          }
        }
        if (this.stateTime >= 2.4) { this.invulnerable = false; this.setState('idle'); this.idleTime = 0.3; }
        break;

      // ----- Atordoado (poise quebrado)
      case 'stagger':
        this.brake(dt, 10);
        if (this.stateTime >= 1.8) { this.vulnerable = 1; this.setState('idle'); this.idleTime = 0.2; }
        break;
    }
  }

  fireBurst() {
    const n = this.phase === 1 ? 12 : this.phase === 2 ? 16 : 20;
    const off = this.wave * (Math.PI / n);
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU;
      game.projectiles.spawn({ x: this.x + Math.cos(a) * 40, y: this.y + Math.sin(a) * 40, z: 60,
        vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 11, dmg: 13, hostile: true, kind: 'data', life: 3 });
    }
    this.wave++;
    game.particles.flash(this.x, this.y, 70, 90, '140,240,255', 0.2);
    game.camera.shake(0.2);
    game.audio.play('fireball');
    game.audio.play('explosion');
  }

  drawShadow(ctx) {
    const k = 1 - Math.min(0.6, this.jumpZ / 300);
    ctx.fillStyle = `rgba(0,0,0,${(0.55 * k).toFixed(3)})`;
    isoCirclePath(ctx, this.x, this.y, this.radius * 1.15 * k);
    ctx.fill();
  }

  // Holograma 3D: nada na camada sólida (só os halos); a figura é somada à cena depois
  bossAlpha() {
    if (this.state === 'intro') return clamp(this.stateTime / 1.6, 0, 1);
    if (this.state === 'dying') return clamp(1 - (this.stateTime - 1.4) / 1.0, 0, 1);
    return 1;
  }
  drawEmissive(ctx) {
    if (!game.use3D || !this.spr || !this.spr.ok) return;
    R3D.blitEmissive(ctx, this.spr, isoX(this.x, this.y), isoY(this.x, this.y) - this.jumpZ, this.bossAlpha());
  }

  draw(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y) - this.jumpZ;
    if (game.use3D && this.spr && this.spr.ok) { game.glows3D(ctx, 'nexus', this, this.spr, sx, sy, this.bossAlpha()); return; }
    ctx.save();
    if (this.state === 'intro') ctx.globalAlpha = clamp(this.stateTime / 1.6, 0, 1);   // fragmentos se reúnem
    if (this.state === 'dying') ctx.globalAlpha = clamp(1 - (this.stateTime - 1.4) / 1.0, 0, 1);
    this.drawBody(ctx, sx, sy, this.flash > 0 ? FLASH_PAL : this.pal);
    ctx.restore();
  }

  // Silhueta holográfica: auréola de dados, corpo translúcido com linhas de
  // varredura, fragmentos que se desprendem e uma lâmina de luz no braço
  drawBody(ctx, sx, sy, pal) {
    const side = this.screenSide(), t = this.animTime;
    const st = this.state;
    const glowOn = pal === this.pal;
    const p3 = this.phase === 3;
    const kneel = st === 'stagger' ? 20 : st === 'jump_windup' ? 10 : 0;
    const hover = 12 + Math.sin(t * 1.6) * 4 - kneel;
    const shakeX = (st === 'transition' || st === 'burst_windup' || st === 'stagger') ? Math.sin(t * 50) * 2.5 : 0;
    const coreRGB = p3 ? '255,70,100' : '150,245,255';
    const base = ctx.globalAlpha;

    ctx.save();
    ctx.translate(sx + shakeX, sy - hover);
    if (glowOn) game.addGlow(ctx, 0, -70, 120, p3 ? '255,50,80' : '60,210,255', 0.22 + 0.06 * Math.sin(t * 3));

    // Auréola: anéis concêntricos girando atrás da cabeça
    const hcx = 0, hcy = -104;
    ctx.strokeStyle = pal.halo; ctx.lineWidth = 2;
    ctx.globalAlpha = base * 0.75;
    ctx.beginPath(); ctx.arc(hcx, hcy, 44, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * TAU + t * 0.6;
      ctx.beginPath(); ctx.arc(hcx, hcy, 37, a0, a0 + 0.32); ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hcx, hcy, 52, -t * 0.4, -t * 0.4 + 4.6); ctx.stroke();
    ctx.globalAlpha = base;

    // Silhueta (cabeça, ombros, tronco que se dissolve em fluxo de dados)
    const figure = () => {
      ctx.beginPath();
      ctx.ellipse(side * 2, -122, 11, 13, 0, 0, TAU);
      ctx.moveTo(-27, -98); ctx.lineTo(27, -98);
      ctx.quadraticCurveTo(22, -76, 14, -56); ctx.lineTo(7, -24); ctx.lineTo(0, -6); ctx.lineTo(-7, -24); ctx.lineTo(-14, -56);
      ctx.quadraticCurveTo(-22, -76, -27, -98);
      ctx.closePath();
    };
    ctx.globalAlpha = base * 0.42;
    ctx.fillStyle = pal.body;
    figure(); ctx.fill();
    ctx.save();
    figure(); ctx.clip();
    ctx.globalAlpha = base * 0.35;
    ctx.fillStyle = pal.bodyHi;
    const scan = (t * 40) % 6;
    for (let y = -136 + scan; y < 0; y += 6) ctx.fillRect(-30, y, 60, 1.4);
    ctx.restore();
    ctx.globalAlpha = base * 0.9;
    ctx.strokeStyle = pal.bodyHi; ctx.lineWidth = 1.5;
    figure(); ctx.stroke();

    // Braço livre aberto, como quem oferece a mão
    ctx.strokeStyle = pal.body; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.globalAlpha = base * 0.55;
    const ox = -side * 26, oy = -94;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox - side * 14, oy + 26); ctx.lineTo(ox - side * 26, oy + 34 + Math.sin(t * 2) * 3); ctx.stroke();

    // Fragmentos luminosos (presos ao contorno e soltos, flutuando para longe)
    const rnd = mulberry32(4242);
    ctx.fillStyle = pal.frag;
    for (let i = 0; i < 64; i++) {
      const fy = -134 + rnd() * 128;
      const w = fy < -108 ? 12 : fy < -98 ? 22 : fy < -56 ? lerp(27, 14, (fy + 98) / 42) : lerp(14, 2, (fy + 56) / 50);
      let fx = (rnd() * 2 - 1) * w;
      let yy = fy, a = 0.9;
      if (rnd() < 0.4) {
        const d = (t * (0.25 + rnd() * 0.5) + rnd()) % 1;
        fx += Math.sign(fx || 1) * d * 34; yy -= d * 26; a = 1 - d;
      }
      const sz = 1.5 + rnd() * 2.5;
      ctx.globalAlpha = base * a;
      ctx.fillRect(fx - sz / 2, yy - sz / 2, sz, sz);
    }
    // Fluxo de dados descendo até o chão
    ctx.globalAlpha = base * 0.5;
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * 2.5, d = (t * 1.5 + i * 0.37) % 1;
      ctx.fillRect(x, -10 + d * (hover + 8), 1.4, 5);
    }
    ctx.globalAlpha = base;

    // Núcleo no peito e olhos
    ctx.fillStyle = p3 ? '#ffd6de' : pal.core;
    ctx.beginPath(); ctx.arc(0, -82, 5.5 + Math.sin(t * 6) * 0.8, 0, TAU); ctx.fill();
    const charge = st === 'burst_windup' ? this.tgProgress : 0;
    if (glowOn) game.addGlow(ctx, 0, -82, 24 + charge * 40 + this.phase * 4, coreRGB, 0.8 + charge * 0.2);
    ctx.fillStyle = p3 ? '#ffd6de' : pal.eye;
    ctx.fillRect(side * 2 + side * 3 - 3, -123, 5, 1.8);
    ctx.fillRect(side * 2 - side * 3 - 2, -123, 4, 1.8);
    if (glowOn) game.addGlow(ctx, side * 3, -122, 14, coreRGB, 0.9);

    // Lâmina de luz formada no braço: ângulo conforme o estado
    let a = 0.9;
    if (st === 'sweep_windup') a = -2.5 + this.tgProgress * -0.3;
    else if (st === 'sweep') a = 1.2;
    else if (st === 'jump' || st === 'jump_windup' || st === 'meteor' || st === 'pillars') a = -1.57;
    else if (st === 'charge_windup' || st === 'charging') a = 0.15;
    else if (st === 'stagger') a = 1.45;
    else if (st === 'burst_windup' || st === 'spiral' || st === 'transition') a = -1.2 + Math.sin(t * 3) * 0.2;
    const ang = side > 0 ? a : Math.PI - a;
    const shx = side * 26, shy = -94;
    const L = 118;
    const bx = shx + Math.cos(ang) * L, by = shy + Math.sin(ang) * L;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    ctx.strokeStyle = pal.body; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.globalAlpha = base * 0.6;
    ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(shx + Math.cos(ang) * 18, shy + Math.sin(ang) * 18); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = base * 0.8;
    ctx.fillStyle = pal.blade;
    ctx.beginPath();
    ctx.moveTo(shx + Math.cos(ang) * 18 + nx * 5, shy + Math.sin(ang) * 18 + ny * 5);
    ctx.lineTo(bx + nx * 2, by + ny * 2);
    ctx.lineTo(bx + Math.cos(ang) * 16, by + Math.sin(ang) * 16);
    ctx.lineTo(bx - nx * 2, by - ny * 2);
    ctx.lineTo(shx + Math.cos(ang) * 18 - nx * 5, shy + Math.sin(ang) * 18 - ny * 5);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = base;
    if (glowOn) {
      for (let i = 1; i <= 5; i++) {
        const k = i / 5;
        game.addGlow(ctx, lerp(shx, bx, k), lerp(shy, by, k), 14 + (this.phase >= 2 ? 6 : 0) + Math.sin(t * 17 + i) * 3, p3 ? '255,90,120' : '120,235,255', 0.45);
      }
    }
    ctx.restore();
  }

  drawDebug(ctx) {
    drawHurtbox(ctx, this.x, this.y, this.radius, this.canBeHit() ? '80,255,120' : '120,120,120');
    if (this.atkShape && (this.state === 'sweep' || this.state === 'charging')) Hitbox.drawDebug(ctx, this.atkShape, this.x, this.y, this.atkDir, '255,140,40');
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y) - this.height - 30;
    ctx.fillStyle = '#ffd679'; ctx.font = `11px ${FONT_UI}`; ctx.textAlign = 'center';
    ctx.fillText(`${this.state} F${this.phase} poise:${Math.round(this.poise)}`, sx, sy);
  }
}

