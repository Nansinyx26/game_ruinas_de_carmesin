'use strict';
// ECLIPSE ZERO · Coletáveis: células de energia, cápsulas de reparo e memórias
// ---------------------------------------------------------------------------
// COLETÁVEIS: células de energia (moeda), cápsulas de reparo e fragmentos de memória
// ---------------------------------------------------------------------------
class PickupSystem {
  // Cristal de memória: feixe de luz vertical, prisma girando e partículas em órbita
  drawMemory(ctx, p, time) {
    const gx = isoX(p.x, p.y), gy = isoY(p.x, p.y), sy = gy - p.z;
    const pulse = 0.75 + 0.25 * Math.sin(time * 3);
    const g = ctx.createLinearGradient(0, gy - 220, 0, gy);
    g.addColorStop(0, 'rgba(120,190,255,0)'); g.addColorStop(1, `rgba(140,200,255,${(0.22 * pulse).toFixed(3)})`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(gx - 9, gy - 220, 18, 220);
    GlowCache.drawFlat(ctx, '100,170,255', gx, gy, 50, 0.4 * pulse);
    GlowCache.draw(ctx, '120,190,255', gx, sy, 46, 0.6 * pulse);
    if (game.use3D && p.spr && p.spr.ok) {
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      R3D.blit(ctx, p.spr, gx, sy + 10);
      ctx.globalCompositeOperation = 'lighter';
      R3D.blitEmissive(ctx, p.spr, gx, sy + 10, 1);
      return;
    }
    const w = 7 * Math.abs(Math.cos(time * 1.7)) + 2;
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(170,215,255,0.85)';
    ctx.beginPath(); ctx.moveTo(gx, sy - 14); ctx.lineTo(gx + w, sy); ctx.lineTo(gx, sy + 12); ctx.lineTo(gx - w, sy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.2; ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = time * 2 + (k * TAU) / 4;
      GlowCache.draw(ctx, '200,230,255', gx + Math.cos(a) * 18, sy + Math.sin(a) * 6, 5, 0.9);
    }
  }

  constructor(max = 260) {
    this.items = [];
    for (let i = 0; i < max; i++) this.items.push({ kind: 'soul', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, value: 1, life: 0, t: 0, attract: false, pull: 0 });
    this.count = 0;
  }
  drop(kind, x, y, value) {
    if (this.count >= this.items.length) return;
    const p = this.items[this.count++];
    const a = Math.random() * TAU, s = rand(40, 150);
    p.kind = kind; p.x = x; p.y = y; p.z = 20;
    p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.vz = rand(200, 320);
    p.value = value; p.life = kind === 'health' ? 16 : 9999; p.t = 0; p.attract = false; p.pull = 0;
  }
  attractAll() { for (let i = 0; i < this.count; i++) this.items[i].attract = true; }
  clear() { this.count = 0; }
  kill(i) {
    const last = this.count - 1, p = this.items[i];
    if (i !== last) { this.items[i] = this.items[last]; this.items[last] = p; }
    this.count--;
  }
  update(dt) {
    const pl = game.player;
    for (let i = this.count - 1; i >= 0; i--) {
      const p = this.items[i];
      p.t += dt; p.life -= dt;
      if (p.life <= 0) { this.kill(i); continue; }
      // Física simples com quique (o fragmento de memória apenas flutua)
      if (p.kind === 'memory') { p.z = 22 + Math.sin(p.t * 2) * 5; p.vz = 0; }
      else {
        p.vz -= 900 * dt; p.z += p.vz * dt;
        if (p.z < 0) { p.z = 0; p.vz = Math.abs(p.vz) > 70 ? -p.vz * 0.4 : 0; }
      }
      const dx = pl.x - p.x, dy = pl.y - p.y, d = Math.hypot(dx, dy) || 1;
      const isMem = p.kind === 'memory';
      const magnet = p.kind === 'soul' ? pl.stats.magnet : isMem ? 48 : 60 + pl.stats.magnet * 0.25;
      if (pl.state !== 'dead' && p.t > 0.45 && ((p.attract && !isMem) || d < magnet)) {
        // Atração acelerada em direção ao jogador
        p.pull = Math.min(1, p.pull + dt * 2.5);
        const sp = 260 + 640 * p.pull;
        p.vx = lerp(p.vx, (dx / d) * sp, 1 - Math.exp(-10 * dt));
        p.vy = lerp(p.vy, (dy / d) * sp, 1 - Math.exp(-10 * dt));
        if (!isMem) p.z = Math.max(p.z, 12);
      } else {
        const k = Math.exp(-3 * dt); p.vx *= k; p.vy *= k;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = clamp(p.x, 6, game.room.w - 6); p.y = clamp(p.y, 6, game.room.h - 6);
      if (pl.state !== 'dead' && p.t > 0.35 && d < pl.radius + 12) {
        if (p.kind === 'soul') game.collectSoul(p.value, p.x, p.y);
        else if (isMem) game.collectMemory(p.x, p.y);
        else {
          pl.heal(Math.round(p.value * pl.stats.healMult));
          game.audio.play('health');
          game.particles.flash(p.x, p.y, 20, 40, '255,80,120', 0.15);
        }
        this.kill(i);
      }
    }
  }
  // Fragmento de memória flutuando em um ponto fixo da sala
  place(kind, x, y) {
    if (this.count >= this.items.length) return null;
    const p = this.items[this.count++];
    p.kind = kind; p.x = x; p.y = y; p.z = 22; p.vx = p.vy = p.vz = 0;
    p.value = 1; p.life = 9999; p.t = 0; p.attract = false; p.pull = 0;
    return p;
  }
  find(kind) {
    for (let i = 0; i < this.count; i++) if (this.items[i].kind === kind) return this.items[i];
    return null;
  }
  draw(ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.count; i++) {
      const p = this.items[i];
      const bob = p.z <= 0.1 ? 6 + Math.sin(time * 4 + i) * 3 : 0;
      const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y) - p.z - bob;
      const blink = p.kind === 'health' && p.life < 3 && Math.floor(p.life * 8) % 2 === 0 ? 0.3 : 1;
      if (p.kind === 'memory') { this.drawMemory(ctx, p, time); continue; }
      if (game.use3D && p.spr && p.spr.ok) {
        // Item em 3D: corpo com luz própria + partes emissivas + brilho no chão
        GlowCache.draw(ctx, p.kind === 'soul' ? '70,150,255' : '255,60,110', sx, sy, p.kind === 'soul' ? 12 : 18, 0.45 * blink);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = blink;
        R3D.blit(ctx, p.spr, sx, sy);
        ctx.globalCompositeOperation = 'lighter';
        R3D.blitEmissive(ctx, p.spr, sx, sy, blink);
        GlowCache.drawFlat(ctx, p.kind === 'soul' ? '70,140,255' : '255,50,100', sx, isoY(p.x, p.y), 14, 0.25);
        continue;
      }
      if (p.kind === 'soul') {
        // Célula de energia: pequeno cristal azul
        GlowCache.draw(ctx, '70,150,255', sx, sy, 14, 0.75);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(220,240,255,0.95)';
        const sp = Math.sin(time * 6 + i) * 1.5;
        ctx.beginPath(); ctx.moveTo(sx, sy - 5); ctx.lineTo(sx + 2.5 + sp * 0.3, sy); ctx.lineTo(sx, sy + 5); ctx.lineTo(sx - 2.5 - sp * 0.3, sy); ctx.closePath(); ctx.fill();
      } else {
        // Cápsula de reparo
        GlowCache.draw(ctx, '255,60,110', sx, sy, 22 * blink + 6, 0.8 * blink);
        ctx.globalAlpha = blink;
        ctx.fillStyle = 'rgba(255,235,240,0.95)';
        ctx.fillRect(sx - 1.2, sy - 4, 2.4, 8); ctx.fillRect(sx - 4, sy - 1.2, 8, 2.4);
      }
      GlowCache.drawFlat(ctx, p.kind === 'soul' ? '70,140,255' : '255,50,100', sx, isoY(p.x, p.y), 14, 0.25);
    }
    ctx.restore();
  }
}

