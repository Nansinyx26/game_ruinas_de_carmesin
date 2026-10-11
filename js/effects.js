'use strict';
// ECLIPSE ZERO · Efeitos visuais: brilhos, partículas, números de dano, rastros da lâmina e raios
// ---------------------------------------------------------------------------
// CACHE DE BRILHOS: sprites radiais pré-renderizados (muito mais rápido do que
// criar gradientes a cada partícula)
// ---------------------------------------------------------------------------
const GlowCache = {
  map: new Map(),
  get(rgb) {
    let c = this.map.get(rgb);
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${rgb},1)`);
      gr.addColorStop(0.22, `rgba(${rgb},0.6)`);
      gr.addColorStop(0.55, `rgba(${rgb},0.16)`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      this.map.set(rgb, c);
    }
    return c;
  },
  // Brilho circular (em coordenadas de tela isométrica)
  draw(ctx, rgb, x, y, r, alpha) {
    if (alpha <= 0.004 || r <= 0.5) return;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(this.get(rgb), x - r, y - r, r * 2, r * 2);
  },
  // Brilho achatado sobre o chão (elipse 2:1)
  drawFlat(ctx, rgb, x, y, r, alpha) {
    if (alpha <= 0.004 || r <= 0.5) return;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(this.get(rgb), x - r, y - r * 0.5, r * 2, r);
  },
};

// ---------------------------------------------------------------------------
// SISTEMA DE PARTÍCULAS com pooling (nenhuma alocação durante o jogo)
// ---------------------------------------------------------------------------
const P = { SPARK: 0, EMBER: 1, DUST: 2, BLOOD: 3, RING: 4, FLASH: 5, SMOKE: 6, DEBRIS: 7, WISP: 8 };
const P_EMISSIVE = [true, true, false, false, true, true, false, false, true];

class ParticleSystem {
  constructor(max = 1800) {
    this.max = max;
    this.items = [];
    for (let i = 0; i < max; i++) {
      this.items.push({ type: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, size2: 1,
        rgb: '255,255,255', grav: 0, drag: 0, rot: 0, vrot: 0, decal: false });
    }
    this.count = 0;
  }

  // Emite uma partícula; devolve o objeto (ou null se o pool estiver cheio)
  emit(type, x, y, z, vx, vy, vz, life, size, rgb, grav = 0, drag = 0) {
    if (this.count >= this.max) return null;
    const p = this.items[this.count++];
    p.type = type; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz;
    p.life = p.max = life; p.size = size; p.size2 = size; p.rgb = rgb;
    p.grav = grav; p.drag = drag; p.rot = Math.random() * TAU; p.vrot = 0; p.decal = false;
    return p;
  }

  // Remove a partícula i trocando-a com a última ativa (O(1))
  kill(i) {
    const last = this.count - 1;
    if (i !== last) { const t = this.items[i]; this.items[i] = this.items[last]; this.items[last] = t; }
    this.count--;
  }

  clear() { this.count = 0; }

  update(dt) {
    for (let i = this.count - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) { this.kill(i); continue; }
      if (p.drag) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k; p.vy *= k;
        if (!p.grav) p.vz *= k;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.grav) p.vz -= p.grav * dt;
      p.z += p.vz * dt;
      p.rot += p.vrot * dt;
      if (p.grav && p.z < 0) {
        // Gotas de fluido (óleo, refrigerante, sangue) viram manchas permanentes no chão
        if (p.type === P.BLOOD) {
          if (p.decal && game.room) game.room.addDecal(p.x, p.y, p.size * 1.7, p.rgb);
          this.kill(i); continue;
        }
        p.z = 0; p.vz = -p.vz * 0.3; p.vx *= 0.55; p.vy *= 0.55; p.vrot *= 0.5;
      }
    }
  }

  // ----- Atalhos para efeitos comuns -----
  sparks(x, y, z, dir, n, rgb = '170,215,255', speed = 430, spread = 0.9) {
    for (let i = 0; i < n; i++) {
      const a = dir + rand(-spread, spread), s = speed * rand(0.35, 1.15);
      this.emit(P.SPARK, x, y, z, Math.cos(a) * s, Math.sin(a) * s, rand(60, 320), rand(0.16, 0.38), rand(1.6, 3), rgb, 900, 3.5);
    }
  }
  blood(x, y, z, dir, n, rgb = '120,10,24') {
    for (let i = 0; i < n; i++) {
      const a = dir + rand(-0.8, 0.8), s = rand(60, 260);
      const p = this.emit(P.BLOOD, x, y, z, Math.cos(a) * s, Math.sin(a) * s, rand(80, 280), 2, rand(1.8, 3.8), rgb, 1100, 1.2);
      if (p) p.decal = Math.random() < 0.45;
    }
  }
  dust(x, y, n, size = 10, speed = 90, rgb = '70,78,92') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = speed * rand(0.3, 1);
      const p = this.emit(P.DUST, x, y, rand(0, 6), Math.cos(a) * s, Math.sin(a) * s, rand(10, 40), rand(0.4, 0.8), size * rand(0.6, 1.2), rgb, 0, 3);
      if (p) p.size2 = p.size * 2.4;
    }
  }
  ring(x, y, radius, rgb = '120,190,255', life = 0.4, width = 6) {
    const p = this.emit(P.RING, x, y, 0, 0, 0, 0, life, radius, rgb);
    if (p) p.size2 = width;
  }
  flash(x, y, z, size, rgb = '210,235,255', life = 0.12) {
    this.emit(P.FLASH, x, y, z, 0, 0, 0, life, size, rgb);
  }
  embers(x, y, z, n, rgb = '90,160,255', spread = 20, rise = 60) {
    for (let i = 0; i < n; i++) {
      this.emit(P.EMBER, x + rand(-spread, spread), y + rand(-spread, spread), z + rand(0, 20),
        rand(-25, 25), rand(-25, 25), rand(rise * 0.4, rise * 1.4), rand(0.5, 1.2), rand(1.5, 3.2), rgb, 0, 1);
    }
  }
  smoke(x, y, z, n, rgb = '18,22,32', size = 14) {
    for (let i = 0; i < n; i++) {
      const p = this.emit(P.SMOKE, x + rand(-10, 10), y + rand(-10, 10), z + rand(0, 20),
        rand(-30, 30), rand(-30, 30), rand(20, 70), rand(0.6, 1.2), size * rand(0.7, 1.3), rgb, 0, 1.5);
      if (p) p.size2 = p.size * 2.2;
    }
  }
  debris(x, y, n, rgb = '62,68,80') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = rand(60, 240);
      const p = this.emit(P.DEBRIS, x, y, rand(2, 12), Math.cos(a) * s, Math.sin(a) * s, rand(150, 420), rand(0.6, 1.1), rand(2, 5), rgb, 1300, 0.8);
      if (p) p.vrot = rand(-14, 14);
    }
  }
  // Partículas que convergem para um ponto (carga do especial / do chefe)
  converge(x, y, z, n, radius, rgb = '90,160,255', life = 0.45) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = radius * rand(0.6, 1);
      this.emit(P.WISP, x + Math.cos(a) * r, y + Math.sin(a) * r, z + rand(-10, 30),
        -Math.cos(a) * r / life, -Math.sin(a) * r / life, 0, life, rand(2, 4), rgb, 0, 0);
    }
  }

  // Camada sólida (mistura normal): poeira, sangue, fumaça, destroços
  drawSolid(ctx) {
    for (let i = 0; i < this.count; i++) {
      const p = this.items[i];
      if (P_EMISSIVE[p.type]) continue;
      const t = p.life / p.max, sx = isoX(p.x, p.y), sy = isoY(p.x, p.y) - p.z;
      if (p.type === P.DUST || p.type === P.SMOKE) {
        const r = lerp(p.size2, p.size, t);
        ctx.fillStyle = rgba(p.rgb, (p.type === P.DUST ? 0.32 : 0.45) * t);
        ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.7, 0, 0, TAU); ctx.fill();
      } else if (p.type === P.BLOOD) {
        ctx.fillStyle = rgba(p.rgb, 0.95);
        ctx.beginPath(); ctx.arc(sx, sy, p.size, 0, TAU); ctx.fill();
      } else if (p.type === P.DEBRIS) {
        ctx.save();
        ctx.translate(sx, sy); ctx.rotate(p.rot);
        ctx.fillStyle = rgba(p.rgb, Math.min(1, t * 2));
        ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
        ctx.restore();
      }
    }
  }

  // Camada emissiva (mistura aditiva): faíscas, brasas, anéis, clarões
  drawEmissive(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < this.count; i++) {
      const p = this.items[i];
      if (!P_EMISSIVE[p.type]) continue;
      const t = p.life / p.max, sx = isoX(p.x, p.y), sy = isoY(p.x, p.y) - p.z;
      switch (p.type) {
        case P.SPARK: {
          // Faísca desenhada como um risco na direção da velocidade
          const k = 0.035;
          const ex = sx - (p.vx - p.vy) * k, ey = sy - ((p.vx + p.vy) * 0.5 - p.vz) * k;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = rgba(p.rgb, t);
          ctx.lineWidth = p.size * (0.4 + t);
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
          break;
        }
        case P.EMBER:
        case P.WISP:
          GlowCache.draw(ctx, p.rgb, sx, sy, p.size * 3.2, t * 0.9);
          break;
        case P.FLASH:
          GlowCache.draw(ctx, p.rgb, sx, sy, p.size * (1.3 - t * 0.3), t);
          break;
        case P.RING: {
          const e = easeOutCubic(1 - t), r = Math.max(0.5, p.size * e);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = rgba(p.rgb, t * 0.9);
          ctx.lineWidth = Math.max(0.5, p.size2 * t);
          ctx.beginPath(); ctx.ellipse(sx, sy, r * ISO_RX, r * ISO_RY, 0, 0, TAU); ctx.stroke();
          break;
        }
      }
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// NÚMEROS DE DANO FLUTUANTES (pool)
// ---------------------------------------------------------------------------
class FloatingTexts {
  constructor(max = 140) {
    this.items = [];
    for (let i = 0; i < max; i++) this.items.push({ x: 0, y: 0, z: 0, vx: 0, vz: 0, life: 0, max: 1, text: '', color: '#fff', size: 20 });
    this.count = 0;
  }
  spawn(x, y, z, text, color = '#ffffff', size = 22, life = 0.85) {
    if (this.count >= this.items.length) return;
    const t = this.items[this.count++];
    t.x = x + rand(-8, 8); t.y = y + rand(-8, 8); t.z = z;
    t.vx = rand(-40, 40); t.vz = rand(170, 230);
    t.life = t.max = life; t.text = String(text); t.color = color; t.size = size;
  }
  clear() { this.count = 0; }
  update(dt) {
    for (let i = this.count - 1; i >= 0; i--) {
      const t = this.items[i];
      t.life -= dt;
      if (t.life <= 0) {
        const last = this.count - 1;
        this.items[i] = this.items[last]; this.items[last] = t; this.count--;
        continue;
      }
      t.vz -= 420 * dt;
      t.z += t.vz * dt;
      t.x += t.vx * dt; t.y += t.vx * dt * 0.2;
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (let i = 0; i < this.count; i++) {
      const t = this.items[i];
      const age = t.max - t.life;
      const pop = age < 0.1 ? lerp(1.9, 1, age / 0.1) : 1;
      const a = Math.min(1, t.life / (t.max * 0.35));
      const sx = isoX(t.x, t.y), sy = isoY(t.x, t.y) - t.z;
      ctx.globalAlpha = a;
      ctx.font = `${Math.round(t.size * pop)}px ${FONT_NUM}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(2,4,10,0.9)';
      ctx.strokeText(t.text, sx, sy);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, sx, sy);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// RASTRO DA LÂMINA (slash trail): faixa entre a base e a ponta da espada
// ---------------------------------------------------------------------------
class SlashTrail {
  constructor() {
    this.cap = 48;
    this.pts = [];
    for (let i = 0; i < this.cap; i++) this.pts.push({ bx: 0, by: 0, tx: 0, ty: 0, z: 0, age: 0 });
    this.reset('60,140,255', '220,240,255', 0.12);
  }
  reset(rgb, core, maxAge) {
    this.head = 0; this.n = 0; this.active = true; this.released = false;
    this.rgb = rgb; this.core = core; this.maxAge = maxAge;
  }
  // Adiciona uma amostra (base e ponta da lâmina em coordenadas de mundo)
  add(bx, by, tx, ty, z, age = 0) {
    const p = this.pts[this.head];
    p.bx = bx; p.by = by; p.tx = tx; p.ty = ty; p.z = z; p.age = age;
    this.head = (this.head + 1) % this.cap;
    this.n = Math.min(this.cap, this.n + 1);
  }
  release() { this.released = true; }
  // i = 0 é a amostra mais antiga
  get(i) { return this.pts[(this.head - this.n + i + this.cap * 2) % this.cap]; }
}

class SlashTrails {
  constructor(max = 12) {
    this.pool = [];
    for (let i = 0; i < max; i++) { const t = new SlashTrail(); t.active = false; this.pool.push(t); }
  }
  create(rgb = '60,140,255', core = '220,240,255', maxAge = 0.12) {
    let t = this.pool.find((s) => !s.active);
    if (!t) t = this.pool[0];
    t.reset(rgb, core, maxAge);
    return t;
  }
  clear() { for (const t of this.pool) t.active = false; }
  update(dt) {
    for (const t of this.pool) {
      if (!t.active) continue;
      // Envelhece as amostras e descarta as mais antigas
      for (let i = 0; i < t.n; i++) t.get(i).age += dt;
      while (t.n > 0 && t.get(0).age > t.maxAge) t.n--;
      if (t.released && t.n === 0) t.active = false;
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const t of this.pool) {
      if (!t.active || t.n < 2) continue;
      for (let i = 1; i < t.n; i++) {
        const a = t.get(i - 1), b = t.get(i);
        const k = 1 - b.age / t.maxAge;
        if (k <= 0) continue;
        const f = (i / t.n);
        // Faixa externa (cor do golpe)
        ctx.fillStyle = rgba(t.rgb, 0.5 * k * (0.35 + 0.65 * f));
        ctx.beginPath();
        ctx.moveTo(isoX(a.bx, a.by), isoY(a.bx, a.by) - a.z);
        ctx.lineTo(isoX(a.tx, a.ty), isoY(a.tx, a.ty) - a.z);
        ctx.lineTo(isoX(b.tx, b.ty), isoY(b.tx, b.ty) - b.z);
        ctx.lineTo(isoX(b.bx, b.by), isoY(b.bx, b.by) - b.z);
        ctx.closePath(); ctx.fill();
        // Faixa interna, mais brilhante, perto da ponta
        const amx = lerp(a.bx, a.tx, 0.6), amy = lerp(a.by, a.ty, 0.6);
        const bmx = lerp(b.bx, b.tx, 0.6), bmy = lerp(b.by, b.ty, 0.6);
        ctx.fillStyle = rgba(t.core, 0.55 * k * f);
        ctx.beginPath();
        ctx.moveTo(isoX(amx, amy), isoY(amx, amy) - a.z);
        ctx.lineTo(isoX(a.tx, a.ty), isoY(a.tx, a.ty) - a.z);
        ctx.lineTo(isoX(b.tx, b.ty), isoY(b.tx, b.ty) - b.z);
        ctx.lineTo(isoX(bmx, bmy), isoY(bmx, bmy) - b.z);
        ctx.closePath(); ctx.fill();
      }
      // Fio de luz ao longo da ponta
      ctx.beginPath();
      for (let i = 0; i < t.n; i++) {
        const p = t.get(i), x = isoX(p.tx, p.ty), y = isoY(p.tx, p.ty) - p.z;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const last = t.get(t.n - 1);
      ctx.strokeStyle = rgba(t.core, 0.85 * (1 - last.age / t.maxAge));
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// RAIOS: arcos elétricos irregulares (a assinatura da Tempestade Nula)
// ---------------------------------------------------------------------------
// Raio entre dois pontos de TELA; 'rnd' é um gerador com semente (forma estável por quadro)
function drawBolt(ctx, ax, ay, bx, by, rnd, jag, w, rgb, alpha, branch = true) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  if (L < 1 || alpha <= 0.01) return;
  const n = clamp(Math.round(L / 14), 3, 22);
  const nx = -dy / L, ny = dx / L, amp = Math.min(L * jag, 60);
  let off = 0, brX = 0, brY = 0;
  const brI = branch && n > 3 ? 1 + ((rnd() * (n - 2)) | 0) : -1;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    off = off * 0.45 + (rnd() - 0.5) * amp;
    const k = Math.sin(t * Math.PI);
    const x = ax + dx * t + nx * off * k, y = ay + dy * t + ny * off * k;
    ctx.lineTo(x, y);
    if (i === brI) { brX = x; brY = y; }
  }
  ctx.lineTo(bx, by);
  ctx.strokeStyle = rgba(rgb, 0.3 * alpha); ctx.lineWidth = w * 3.4; ctx.stroke();
  ctx.strokeStyle = rgba(rgb, 0.9 * alpha); ctx.lineWidth = w * 1.4; ctx.stroke();
  ctx.strokeStyle = rgba('235,248,255', alpha); ctx.lineWidth = Math.max(0.6, w * 0.5); ctx.stroke();
  if (brI > 0) {
    const ba = Math.atan2(dy, dx) + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.7), bl = L * (0.18 + rnd() * 0.25);
    drawBolt(ctx, brX, brY, brX + Math.cos(ba) * bl, brY + Math.sin(ba) * bl, rnd, jag, w * 0.6, rgb, alpha * 0.8, false);
  }
}

class ArcSystem {
  constructor(max = 72) {
    this.items = [];
    for (let i = 0; i < max; i++) {
      this.items.push({ x1: 0, y1: 0, z1: 0, x2: 0, y2: 0, z2: 0, life: 0, max: 1, w: 2, rgb: '120,190,255', seed: 0, jag: 0.22, branch: true });
    }
    this.count = 0;
  }
  // Arco entre dois pontos do MUNDO (x, y, altura z)
  spawn(x1, y1, z1, x2, y2, z2, o = {}) {
    if (this.count >= this.items.length) return null;
    const a = this.items[this.count++];
    a.x1 = x1; a.y1 = y1; a.z1 = z1; a.x2 = x2; a.y2 = y2; a.z2 = z2;
    a.life = a.max = o.life || 0.16; a.w = o.w || 2; a.rgb = o.rgb || '120,190,255';
    a.seed = (Math.random() * 1e9) | 0; a.jag = o.jag || 0.22; a.branch = o.branch !== false;
    return a;
  }
  // Faíscas elétricas curtas em volta de um ponto
  crackle(x, y, z, n, radius, rgb, life = 0.14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = radius * rand(0.5, 1);
      this.spawn(x, y, z, x + Math.cos(a) * r, y + Math.sin(a) * r, z + rand(-radius, radius) * 0.6, { rgb, life: life * rand(0.7, 1.3), w: 1.3, jag: 0.35, branch: false });
    }
  }
  clear() { this.count = 0; }
  update(dt) {
    for (let i = this.count - 1; i >= 0; i--) {
      const a = this.items[i];
      a.life -= dt;
      if (a.life <= 0) {
        const last = this.count - 1;
        this.items[i] = this.items[last]; this.items[last] = a; this.count--;
      }
    }
  }
  draw(ctx, time) {
    if (!this.count) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const frame = Math.floor(time * 28);
    for (let i = 0; i < this.count; i++) {
      const a = this.items[i], k = a.life / a.max;
      const ax = isoX(a.x1, a.y1), ay = isoY(a.x1, a.y1) - a.z1, bx = isoX(a.x2, a.y2), by = isoY(a.x2, a.y2) - a.z2;
      drawBolt(ctx, ax, ay, bx, by, mulberry32(a.seed + frame * 7919), a.jag, a.w, a.rgb, Math.min(1, k * 1.6), a.branch);
      GlowCache.draw(ctx, a.rgb, bx, by, 10 + a.w * 6, 0.6 * k);
    }
    ctx.restore();
  }
}

