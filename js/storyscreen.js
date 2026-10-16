'use strict';
// ECLIPSE ZERO · Cenários pintados por código e a tela de história (StoryScreen)
// ---------------------------------------------------------------------------
// CENÁRIOS DAS TELAS DE HISTÓRIA E DO TÍTULO (pintados por código)
// ---------------------------------------------------------------------------
const Backdrop = {
  cache: new Map(),
  motes: Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random(), s: rand(1, 3), v: rand(0.01, 0.05), ph: rand(0, TAU) })),
  rain: Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random(), s: rand(0.7, 1.3) })),

  // Camada estática pré-renderizada (recriada quando a largura da tela muda)
  layer(key, w, h, paint) {
    let c = this.cache.get(key);
    if (!c || c.width !== w || c.height !== h) {
      c = document.createElement('canvas');
      c.width = Math.max(2, w); c.height = Math.max(2, h);
      paint(c.getContext('2d'), c.width, c.height);
      this.cache.set(key, c);
    }
    return c;
  },

  // Silhueta de cidade em camadas, com janelas acesas
  skyline(g, w, h, baseY, seed, layers, tint, winRGBs) {
    for (let l = 0; l < layers; l++) {
      const r = mulberry32(seed + l * 97);
      const k = l / Math.max(1, layers - 1);   // 0 = mais distante
      const col = `rgb(${Math.round(lerp(tint[0], 4, k))},${Math.round(lerp(tint[1], 6, k))},${Math.round(lerp(tint[2], 10, k))})`;
      let x = -20;
      while (x < w + 20) {
        const bw = (24 + r() * 60) * (0.7 + k * 0.6), bh = (40 + r() * 170) * (0.5 + k * 0.7);
        const top = baseY - bh + l * 18;
        g.fillStyle = col;
        g.fillRect(x, top, bw, h - top);
        if (r() < 0.3) g.fillRect(x + bw * 0.4, top - 18 - r() * 30, 2, 30);   // antena
        if (r() < 0.25) { g.beginPath(); g.moveTo(x, top); g.lineTo(x + bw * 0.3, top - 10); g.lineTo(x + bw * 0.6, top + 4); g.fill(); }   // ruína
        for (let wy = top + 6; wy < baseY + 30; wy += 7) {
          for (let wx = x + 4; wx < x + bw - 4; wx += 6) {
            if (r() < 0.07) { g.fillStyle = `rgba(${pick(winRGBs)},${(0.25 + r() * 0.5) * (0.5 + k * 0.5)})`; g.fillRect(wx, wy, 2, 3); }
          }
        }
        x += bw + r() * 6;
      }
    }
  },

  // A gigantesca torre central de NEXUS com o anel no topo
  tower(g, cx, baseY, H, scale, lightRGB, t = 0, glowCtx = null) {
    const W = 70 * scale;
    g.fillStyle = '#05080e';
    g.beginPath();
    g.moveTo(cx - W, baseY); g.lineTo(cx - W * 0.55, baseY - H * 0.6); g.lineTo(cx - W * 0.42, baseY - H);
    g.lineTo(cx + W * 0.42, baseY - H); g.lineTo(cx + W * 0.55, baseY - H * 0.6); g.lineTo(cx + W, baseY);
    g.closePath(); g.fill();
    // Disco no topo
    g.beginPath(); g.ellipse(cx, baseY - H * 0.94, W * 1.5, W * 0.16, 0, 0, TAU); g.fill();
    g.fillRect(cx - 2, baseY - H - 40 * scale, 4, 40 * scale);
    // Janelas e faixas de luz
    const r = mulberry32(77);
    for (let i = 0; i < 90; i++) {
      const yy = baseY - r() * H * 0.95, ww = lerp(W, W * 0.42, (baseY - yy) / H);
      g.fillStyle = `rgba(${lightRGB},${0.25 + r() * 0.6})`;
      g.fillRect(cx + (r() - 0.5) * ww * 1.6, yy, 1.5 + r() * 2, 2 + r() * 8);
    }
    g.fillStyle = `rgba(${lightRGB},0.3)`;
    g.fillRect(cx - 1, baseY - H * 0.85, 2, H * 0.6);
    if (glowCtx) {
      glowCtx.save(); glowCtx.globalCompositeOperation = 'lighter';
      GlowCache.draw(glowCtx, lightRGB, cx, baseY - H - 40 * scale, 30 * scale, 0.5 + 0.4 * Math.sin(t * 3));
      GlowCache.draw(glowCtx, lightRGB, cx, baseY - H * 0.94, W * 2, 0.25);
      glowCtx.restore();
    }
  },

  // Céu artificial: grade hexagonal tênue (rachada no fim do jogo)
  hexSky(g, w, h, rgb, a) {
    g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = 1;
    const R = 34, dx = R * 1.5, dy = R * Math.sqrt(3);
    for (let ix = -1; ix * dx < w + R; ix++) {
      for (let iy = -1; iy * dy < h * 0.7; iy++) {
        const cx = ix * dx, cy = iy * dy + (ix % 2 ? dy / 2 : 0);
        g.beginPath();
        for (let k = 0; k <= 6; k++) { const an = (k / 6) * TAU; k ? g.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R) : g.moveTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); }
        g.stroke();
      }
    }
  },

  // Fundo dos setores externos (cidade ou topo da torre)
  paintSky(g, w, h, kind) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    if (kind === 'city') { sky.addColorStop(0, '#02050d'); sky.addColorStop(0.6, '#0a1430'); sky.addColorStop(1, '#141b3a'); }
    else { sky.addColorStop(0, '#010309'); sky.addColorStop(0.55, '#06121f'); sky.addColorStop(1, '#0c2233'); }
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    this.hexSky(g, w, h, kind === 'city' ? '120,140,255' : '90,220,255', kind === 'city' ? 0.04 : 0.07);
    // Lua artificial
    const mg = g.createRadialGradient(w * 0.78, h * 0.16, 0, w * 0.78, h * 0.16, 90);
    mg.addColorStop(0, 'rgba(220,235,255,0.9)'); mg.addColorStop(0.18, 'rgba(200,220,255,0.6)'); mg.addColorStop(0.2, 'rgba(120,160,230,0.15)'); mg.addColorStop(1, 'rgba(60,90,160,0)');
    g.fillStyle = mg; g.fillRect(w * 0.78 - 90, h * 0.16 - 90, 180, 180);
    if (kind === 'city') {
      this.tower(g, w * 0.5, h * 0.72, h * 0.6, 1, '90,170,255');
      this.skyline(g, w, h, h * 0.72, 11, 3, [26, 34, 62], ['255,60,200', '80,220,255', '255,200,120', '170,100,255']);
    } else {
      // Nuvens de tempestade
      for (let i = 0; i < 26; i++) {
        const r = mulberry32(300 + i);
        g.fillStyle = `rgba(${10 + r() * 14},${18 + r() * 16},${28 + r() * 20},0.55)`;
        g.beginPath(); g.ellipse(r() * w, r() * h * 0.5, 120 + r() * 200, 30 + r() * 50, 0, 0, TAU); g.fill();
      }
      // A cidade lá embaixo
      const r = mulberry32(5);
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${pick(['90,170,255', '255,120,200', '120,240,255'])},${0.2 + r() * 0.5})`; g.fillRect(r() * w, h * 0.75 + r() * h * 0.25, 1.5, 1.5); }
    }
    const fog = g.createLinearGradient(0, h * 0.55, 0, h);
    fog.addColorStop(0, 'rgba(20,30,60,0)'); fog.addColorStop(1, 'rgba(20,30,60,0.6)');
    g.fillStyle = fog; g.fillRect(0, h * 0.55, w, h * 0.45);
  },

  // Chuva em espaço de tela
  drawRain(ctx, t, alpha = 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(150,180,230,${0.22 * alpha})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of this.rain) {
      const x = (((d.x - t * 0.05 * d.s) % 1) + 1) % 1 * (VIEW_W + 80) - 40;
      const y = ((d.y + t * 1.3 * d.s) % 1) * (VIEW_H + 40) - 20;
      ctx.moveTo(x, y); ctx.lineTo(x - 4 * d.s, y + 15 * d.s);
    }
    ctx.stroke();
    ctx.restore();
  },

  drawMotes(ctx, t, rgbA = '90,160,255', rgbB = '170,215,255', rise = 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      const y = ((m.y - t * m.v * rise) % 1 + 1) % 1;
      const x = m.x * VIEW_W + Math.sin(t * 0.8 + m.ph) * 20;
      GlowCache.draw(ctx, m.s > 2.2 ? rgbB : rgbA, x, y * VIEW_H, m.s * 5, 0.45 + 0.3 * Math.sin(t * 3 + m.ph));
    }
    ctx.restore();
  },

  // Silhueta de Kael de costas (casaco esvoaçando) com a espada acesa
  kael(ctx, x, y, s, t, swordRGB = '80,160,255') {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    const sway = Math.sin(t * 1.4) * 4;
    ctx.fillStyle = '#020306';
    ctx.beginPath();
    ctx.moveTo(-14, -78); ctx.lineTo(14, -78); ctx.lineTo(20, -30); ctx.lineTo(26 + sway, 0); ctx.lineTo(16 + sway, -4); ctx.lineTo(10 + sway, 2);
    ctx.lineTo(2, -6); ctx.lineTo(-6 + sway * 0.6, 2); ctx.lineTo(-14 + sway * 0.6, -3); ctx.lineTo(-24 + sway * 0.5, 2); ctx.lineTo(-20, -30);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(-9, -8, 7, 10); ctx.fillRect(2, -8, 7, 10);
    ctx.beginPath(); ctx.arc(0, -88, 10, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-11, -90); ctx.lineTo(-14, -80); ctx.lineTo(-6, -84); ctx.lineTo(0, -78); ctx.lineTo(6, -84); ctx.lineTo(13, -80); ctx.lineTo(11, -92); ctx.closePath(); ctx.fill();
    // Espada baixa, apontando para o chão
    ctx.strokeStyle = '#05070c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(18, -44); ctx.lineTo(46, 8); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${swordRGB},0.9)`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(20, -40); ctx.lineTo(46, 8); ctx.stroke();
    GlowCache.draw(ctx, swordRGB, 34, -16, 40, 0.55 + 0.15 * Math.sin(t * 5));
    GlowCache.draw(ctx, swordRGB, -16, -40, 7, 0.6 + 0.3 * Math.sin(t * 3));   // a marca no pulso
    ctx.restore();
  },

  // Holograma de NEXUS: silhueta formada por fragmentos luminosos
  hologram(ctx, cx, cy, s, t, rgb = '120,240,255') {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, rgb, 0, -70, 200, 0.35);
    ctx.strokeStyle = `rgba(${rgb},0.6)`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -104, 46, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) { const a0 = (i / 12) * TAU + t * 0.5; ctx.beginPath(); ctx.arc(0, -104, 38, a0, a0 + 0.3); ctx.stroke(); }
    const figure = () => {
      ctx.beginPath();
      ctx.ellipse(0, -122, 11, 13, 0, 0, TAU);
      ctx.moveTo(-27, -98); ctx.lineTo(27, -98);
      ctx.quadraticCurveTo(22, -76, 14, -56); ctx.lineTo(7, -24); ctx.lineTo(0, 0); ctx.lineTo(-7, -24); ctx.lineTo(-14, -56);
      ctx.quadraticCurveTo(-22, -76, -27, -98); ctx.closePath();
    };
    ctx.fillStyle = `rgba(${rgb},0.16)`; figure(); ctx.fill();
    ctx.strokeStyle = `rgba(${rgb},0.75)`; ctx.lineWidth = 1.2; figure(); ctx.stroke();
    const r = mulberry32(9);
    for (let i = 0; i < 120; i++) {
      const fy = -134 + r() * 132;
      const w = fy < -108 ? 12 : fy < -98 ? 24 : fy < -56 ? lerp(27, 14, (fy + 98) / 42) : lerp(14, 2, (fy + 56) / 56);
      let fx = (r() * 2 - 1) * w, yy = fy, a = 0.8;
      if (r() < 0.45) { const d = (t * (0.15 + r() * 0.3) + r()) % 1; fx += Math.sign(fx || 1) * d * 60; yy -= d * 40; a = 1 - d; }
      ctx.fillStyle = `rgba(${rgb},${a})`;
      const sz = 1 + r() * 2.5; ctx.fillRect(fx, yy, sz, sz);
    }
    GlowCache.draw(ctx, '255,255,255', 0, -82, 20, 0.9);
    ctx.restore();
  },

  // Corredor em perspectiva (instalação e refúgio)
  corridor(ctx, t, rgb, warm) {
    const W = VIEW_W, H = VIEW_H, vx = W * 0.56, vy = H * 0.46, d = 0.1;
    const bx0 = vx - W * d, bx1 = vx + W * d, by0 = vy - H * d * 0.9, by1 = vy + H * d * 0.9;
    const pulse = warm ? 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 3.1) : 0.6 + 0.4 * Math.max(0, Math.sin(t * 2.6));
    const [r, g, b] = rgb.split(',').map(Number);
    const shade = (k) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
    ctx.fillStyle = shade(0.05); ctx.fillRect(0, 0, W, H);
    const faces = [
      [[0, 0], [W, 0], [bx1, by0], [bx0, by0], 0.1],
      [[0, H], [W, H], [bx1, by1], [bx0, by1], 0.16],
      [[0, 0], [bx0, by0], [bx0, by1], [0, H], 0.13],
      [[W, 0], [bx1, by0], [bx1, by1], [W, H], 0.11],
    ];
    for (const f of faces) {
      ctx.fillStyle = shade(f[4] * pulse);
      ctx.beginPath(); ctx.moveTo(f[0][0], f[0][1]); for (let k = 1; k < 4; k++) ctx.lineTo(f[k][0], f[k][1]); ctx.closePath(); ctx.fill();
    }
    // Fundo do corredor: uma porta iluminada
    ctx.fillStyle = shade(0.25 * pulse); ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    ctx.fillStyle = shade(0.9 * pulse); ctx.fillRect(vx - W * 0.025, vy - H * 0.06, W * 0.05, H * 0.15);
    // Luminárias no teto ao longo do corredor
    for (let k = 1; k < 6; k++) {
      const q = 1 - k / 6, x = lerp(vx, W * 0.5, q * q), y = lerp(by0, 0, q * q) + 6;
      ctx.fillStyle = shade(1.4 * pulse); ctx.fillRect(x - 40 * q, y, 80 * q, 3 + 4 * q);
    }
    // Linhas de perspectiva (painéis e canos)
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
    for (let k = 1; k < 7; k++) {
      const q = k / 7, x0 = lerp(0, bx0, q * q), x1 = lerp(W, bx1, q * q), y0 = lerp(0, by0, q * q), y1 = lerp(H, by1, q * q);
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }
    if (!warm) {
      // Monitores de tubo na parede esquerda
      for (let k = 0; k < 4; k++) {
        const q = 0.15 + k * 0.17, x = lerp(0, bx0, q) + 10, y = lerp(H * 0.3, by0 + 30, q), w = 60 * (1 - q), h = 46 * (1 - q);
        ctx.fillStyle = `rgba(230,240,255,${0.5 + 0.2 * Math.sin(t * 30 + k)})`;
        ctx.fillRect(x, y, w, h);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; GlowCache.draw(ctx, '200,220,255', x + w / 2, y + h / 2, w, 0.25); ctx.restore();
      }
    } else {
      // Fogueira e silhuetas sentadas
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      GlowCache.draw(ctx, '255,140,50', W * 0.5, H * 0.86, 260 * pulse, 0.55);
      GlowCache.draw(ctx, '255,220,140', W * 0.5, H * 0.88, 70, 0.8);
      ctx.restore();
      ctx.fillStyle = '#080503';
      for (const [x, s] of [[0.3, 1], [0.38, 0.8], [0.64, 0.95], [0.72, 1.1]]) {
        ctx.beginPath(); ctx.ellipse(W * x, H * 0.88, 26 * s, 34 * s, 0, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.arc(W * x, H * 0.88 - 42 * s, 11 * s, 0, TAU); ctx.fill();
      }
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, rgb, vx, vy, W * 0.35, 0.25 * pulse);
    ctx.restore();
  },

  // A Tempestade Nula em 3D, girando devagar, centrada em (cx, cy)
  sword3D(ctx, cx, cy, t) {
    if (!R3D.active || !game.model3('espada')) return false;
    const e = this.swordE || (this.swordE = { t: 0, facing: 0 });
    e.t = t; e.facing = 0;
    const it = game.queue3('espada', e, game.opts3(e, 0));
    R3D.flush(Math.min(2.5, game.scale));
    if (!it || !it.ok) return false;
    const x = cx - (it.minX + it.w / 2), y = cy - (it.minY + it.h / 2);
    R3D.blit(ctx, it, x, y);
    R3D.blitEmissive(ctx, it, x, y, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const rnd = mulberry32(Math.floor(t * 14)); ctx.lineJoin = 'round';
    for (let k = 0; k < 4; k++) {
      const px = cx + (rnd() - 0.5) * it.w * 0.6, py = cy + (rnd() - 0.5) * it.h * 0.7;
      drawBolt(ctx, px, py, px + (rnd() - 0.5) * 120, py + (rnd() - 0.5) * 120, rnd, 0.4, 1.5, '90,170,255', 0.8);
    }
    ctx.restore();
    return true;
  },

  // Desenha o cenário de uma página da história
  draw(ctx, kind, t) {
    const W = VIEW_W, H = VIEW_H;
    switch (kind) {
      case 'city': case 'tower': case 'void': {
        const sky = this.layer('bg-' + (kind === 'city' ? 'city' : 'tower'), W, H, (g, w, h) => this.paintSky(g, w, h, kind === 'city' ? 'city' : 'tower'));
        ctx.drawImage(sky, 0, 0, W, H);
        if (kind !== 'city') {
          const tx = W * 0.72, lrgb = kind === 'void' ? '150,190,255' : '90,220,255';
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          GlowCache.draw(ctx, lrgb, tx, H * 0.35, H * 0.7, 0.28);   // contraluz da torre
          ctx.restore();
          this.tower(ctx, tx, H * 1.02, H * 0.86, 1.7, lrgb, t, ctx);
          if (kind === 'tower') {
            // Raios atingindo a antena da torre
            const flash = Math.max(0, Math.sin(t * 1.9)) ** 12;
            if (flash > 0.2) {
              ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
              ctx.fillStyle = `rgba(170,220,255,${(0.12 * flash).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
              drawBolt(ctx, tx + 180 * Math.sin(Math.floor(t * 1.9 / Math.PI) * 2.1), 0, tx, H * 0.1, mulberry32(Math.floor(t * 20)), 0.25, 3, '170,230,255', flash);
              ctx.restore();
            }
            // Kael diante da torre, envolto em eletricidade azul
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            GlowCache.draw(ctx, '60,140,255', W * 0.86, H * 0.93, 120, 0.5 + 0.2 * Math.sin(t * 6));
            GlowCache.drawFlat(ctx, '60,140,255', W * 0.86, H * 0.98, 160, 0.4);
            ctx.restore();
            this.kael(ctx, W * 0.86, H * 0.98, 1.3, t);
          }
          if (kind === 'void') {
            // Drones em formação: a ordem restaurada
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 40; i++) GlowCache.draw(ctx, '255,70,90', W * 0.1 + (i % 10) * W * 0.09, H * 0.18 + Math.floor(i / 10) * 30 + Math.sin(t + i) * 2, 6, 0.7);
            ctx.restore();
            this.kael(ctx, tx, H * 0.2, 0.45, t, '170,210,255');
          }
        } else {
          this.drawRain(ctx, t, 0.8);
          this.kael(ctx, W * 0.84, H * 0.97, 1.7, t);
        }
        break;
      }
      case 'lab':
        this.corridor(ctx, t, '255,40,50', false);
        this.kael(ctx, W * 0.78, H * 0.94, 1.6, t);
        break;
      case 'refuge':
        this.corridor(ctx, t, '255,150,60', true);
        break;
      case 'sword': {
        ctx.fillStyle = '#02040a'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        GlowCache.draw(ctx, '40,100,255', W * 0.78, H * 0.5, H * 0.6, 0.35);
        ctx.restore();
        if (!this.sword3D(ctx, W * 0.8, H * 0.5, t)) drawBigSword(ctx, W * 0.82, H * 0.08, H * 0.84, t);
        break;
      }
      case 'terminal': {
        ctx.fillStyle = '#010806'; ctx.fillRect(0, 0, W, H);
        const fx = W * 0.62, fy = H * 0.14, fw = W * 0.32, fh = H * 0.42;
        ctx.fillStyle = `rgba(30,90,80,${0.35 + 0.05 * Math.sin(t * 40)})`; ctx.fillRect(fx, fy, fw, fh);
        // Jovem Kael conectado a cabos (silhueta)
        ctx.strokeStyle = 'rgba(120,255,220,0.35)'; ctx.lineWidth = 1;
        for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(fx + fw / 2, fy + fh * 0.45); ctx.lineTo(fx + (i / 13) * fw, i % 2 ? fy : fy + fh); ctx.stroke(); }
        ctx.fillStyle = 'rgba(4,20,18,0.95)';
        ctx.beginPath(); ctx.arc(fx + fw / 2, fy + fh * 0.32, fh * 0.08, 0, TAU); ctx.fill();
        ctx.fillRect(fx + fw / 2 - fh * 0.1, fy + fh * 0.4, fh * 0.2, fh * 0.45);
        ctx.fillStyle = 'rgba(160,255,230,0.06)';
        for (let y = 0; y < H; y += 3) ctx.fillRect(0, y + ((t * 30) % 3), W, 1);
        ctx.strokeStyle = 'rgba(120,255,220,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(fx, fy, fw, fh);
        ctx.font = `bold 13px Consolas, monospace`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(140,255,220,0.8)';
        ctx.fillText(`${Math.floor(t * 2) % 2 ? '●' : '○'} REC   ARQUIVO 0-ZERO   2161.03.14`, fx, fy - 12);
        break;
      }
      case 'cathedral': {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#05030b'); g.addColorStop(1, '#110a1e');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // Arcos góticos em perspectiva
        ctx.strokeStyle = 'rgba(120,90,170,0.35)'; ctx.lineWidth = 3;
        for (let k = 0; k < 6; k++) {
          const s = 1 - k * 0.14, aw = W * 0.42 * s, ah = H * 0.9 * s, cx = W / 2, by = H * 0.9 - k * 20;
          ctx.beginPath(); ctx.moveTo(cx - aw, by); ctx.lineTo(cx - aw, by - ah * 0.55);
          ctx.quadraticCurveTo(cx - aw, by - ah, cx, by - ah * 1.05); ctx.quadraticCurveTo(cx + aw, by - ah, cx + aw, by - ah * 0.55); ctx.lineTo(cx + aw, by); ctx.stroke();
        }
        this.hologram(ctx, W / 2, H * 0.78, 2.6, t, '180,220,255');
        // Fiéis com auréolas
        for (let i = 0; i < 9; i++) {
          const x = W * (0.1 + i * 0.1), y = H * 0.98, s = 0.9 + (i % 3) * 0.1;
          ctx.fillStyle = '#05040a';
          ctx.beginPath(); ctx.ellipse(x, y, 18 * s, 50 * s, 0, Math.PI, 0); ctx.fill();
          ctx.beginPath(); ctx.arc(x, y - 58 * s, 9 * s, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(200,150,255,0.7)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(x, y - 74 * s, 10 * s, 3 * s, 0, 0, TAU); ctx.stroke();
        }
        break;
      }
      case 'nexus': {
        ctx.fillStyle = '#010509'; ctx.fillRect(0, 0, W, H);
        // Chuva de dados
        ctx.fillStyle = 'rgba(90,240,220,0.25)';
        for (let i = 0; i < 60; i++) {
          const r = mulberry32(i * 31);
          const x = r() * W, y = ((r() + t * (0.1 + r() * 0.2)) % 1) * H;
          for (let k = 0; k < 6; k++) ctx.fillRect(x, y - k * 9, 2, 5);
        }
        this.hologram(ctx, W * 0.74, H * 0.82, 3.6, t);
        break;
      }
      case 'memory': {
        const sky = this.layer('bg-memory', W, H, (g, w, h) => {
          const gr = g.createLinearGradient(0, 0, 0, h);
          gr.addColorStop(0, '#120406'); gr.addColorStop(0.6, '#5a1408'); gr.addColorStop(1, '#ff6a20');
          g.fillStyle = gr; g.fillRect(0, 0, w, h);
          this.skyline(g, w, h, h * 0.8, 41, 3, [70, 20, 12], ['255,160,60', '255,220,140']);
        });
        ctx.drawImage(sky, 0, 0, W, H);
        this.drawMotes(ctx, t, '255,110,40', '255,200,120', 3);
        // Silhueta da mulher na cidade em chamas
        ctx.fillStyle = '#0a0302';
        const x = W * 0.78, y = H * 0.98;
        ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.lineTo(x - 12, y - 90); ctx.lineTo(x + 12, y - 90); ctx.lineTo(x + 24, y); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y - 104, 12, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 12, y - 108); ctx.quadraticCurveTo(x - 30 + Math.sin(t * 2) * 4, y - 90, x - 26, y - 70); ctx.lineTo(x - 8, y - 96); ctx.fill();
        if (Math.sin(t * 5.3) > 0.97) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, W, H); }
        break;
      }
      case 'dawn': {
        const sky = this.layer('bg-dawn', W, H, (g, w, h) => {
          const gr = g.createLinearGradient(0, 0, 0, h);
          gr.addColorStop(0, '#0d0b1e'); gr.addColorStop(0.45, '#4a2a4a'); gr.addColorStop(0.75, '#ff9a5a'); gr.addColorStop(1, '#ffd29a');
          g.fillStyle = gr; g.fillRect(0, 0, w, h);
          this.skyline(g, w, h, h * 0.84, 63, 2, [60, 30, 40], ['255,220,160']);
        });
        ctx.drawImage(sky, 0, 0, W, H);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        GlowCache.draw(ctx, '255,200,120', W * 0.5, H * 0.8, 260, 0.9);
        GlowCache.draw(ctx, '255,250,220', W * 0.5, H * 0.8, 70, 1);
        ctx.restore();
        // Pedaços do céu artificial se apagando
        ctx.strokeStyle = 'rgba(180,220,255,0.35)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 14; i++) {
          const r = mulberry32(i * 7 + 1);
          const x = r() * W, y = ((r() * 0.4 + t * 0.03 * (0.5 + r())) % 0.6) * H;
          ctx.save(); ctx.translate(x, y); ctx.rotate(t * (r() - 0.5));
          ctx.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k / 6) * TAU; k ? ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18) : ctx.moveTo(18, 0); } ctx.stroke();
          ctx.restore();
        }
        this.kael(ctx, W * 0.82, H * 0.98, 1.5, t, '60,70,90');
        break;
      }
      case 'space': {
        ctx.fillStyle = '#000207'; ctx.fillRect(0, 0, W, H);
        const r = mulberry32(12);
        for (let i = 0; i < 220; i++) { ctx.fillStyle = `rgba(220,230,255,${0.2 + r() * 0.7})`; ctx.fillRect(r() * W, r() * H, 1.2, 1.2); }
        // Limbo da Terra
        const eg = ctx.createRadialGradient(W * 0.5, H * 2.1, H * 1.2, W * 0.5, H * 2.1, H * 1.32);
        eg.addColorStop(0, '#04122a'); eg.addColorStop(0.92, '#1d5aa8'); eg.addColorStop(1, 'rgba(80,160,255,0)');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(W * 0.5, H * 2.1, H * 1.32, 0, TAU); ctx.fill();
        // O sinal partindo do núcleo e a resposta distante
        ctx.strokeStyle = 'rgba(120,220,255,0.5)'; ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) { const rr = ((t * 60 + k * 90) % 360); ctx.globalAlpha = 1 - rr / 360; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.78, rr, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
        ctx.globalAlpha = 1;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        GlowCache.draw(ctx, '255,220,160', W * 0.84, H * 0.16, 20 + 12 * Math.max(0, Math.sin(t * 4)), 0.9);
        ctx.restore();
        break;
      }
      default: {   // 'quote'
        ctx.fillStyle = '#010206'; ctx.fillRect(0, 0, W, H);
        this.drawMotes(ctx, t);
      }
    }
  },
};

// A Tempestade Nula em tamanho grande (capítulo II e tela de título)
function drawBigSword(ctx, x, y, L, t, active = true) {
  ctx.save();
  ctx.translate(x, y);
  const w = L * 0.045;
  // Lâmina negra
  ctx.fillStyle = '#0d0f15';
  ctx.beginPath(); ctx.moveTo(-w, L * 0.24); ctx.lineTo(w, L * 0.24); ctx.lineTo(w * 0.7, L * 0.85); ctx.lineTo(0, L); ctx.lineTo(-w * 0.7, L * 0.85); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#5d667a'; ctx.lineWidth = 1.2; ctx.stroke();
  // Guarda angular e cabo trançado
  ctx.fillStyle = '#1a1d25';
  ctx.beginPath(); ctx.moveTo(-w * 3.2, L * 0.2); ctx.lineTo(0, L * 0.17); ctx.lineTo(w * 3.2, L * 0.2); ctx.lineTo(w * 1.2, L * 0.25); ctx.lineTo(0, L * 0.3); ctx.lineTo(-w * 1.2, L * 0.25); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#4a5162'; ctx.stroke();
  ctx.fillStyle = '#121318'; ctx.fillRect(-w * 0.55, 0, w * 1.1, L * 0.18);
  ctx.strokeStyle = '#2b2f3a'; ctx.lineWidth = 1;
  for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(-w * 0.55, k * L * 0.022); ctx.lineTo(w * 0.55, k * L * 0.022 + L * 0.012); ctx.stroke(); }
  ctx.fillStyle = '#1a1d25'; ctx.beginPath(); ctx.moveTo(0, -w * 1.6); ctx.lineTo(w * 0.8, 0); ctx.lineTo(-w * 0.8, 0); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  // Veias de energia, runa e raios em volta
  ctx.strokeStyle = 'rgba(80,160,255,0.95)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, L * 0.26);
  for (let k = 1; k <= 10; k++) ctx.lineTo((k % 2 ? 1 : -1) * w * 0.25, L * (0.26 + k * 0.065));
  ctx.lineTo(0, L * 0.96); ctx.stroke();
  GlowCache.draw(ctx, '80,160,255', 0, L * 0.235, w * 4, 0.9);
  ctx.fillStyle = '#d8ecff'; ctx.fillRect(-2, L * 0.225, 4, 4);
  GlowCache.draw(ctx, '60,130,255', 0, L * 0.6, L * 0.35, 0.3);
  if (active) {
    ctx.lineJoin = 'round';
    const rnd = mulberry32(Math.floor(t * 14));
    for (let k = 0; k < 5; k++) {
      const y0 = L * (0.25 + rnd() * 0.6), side = rnd() < 0.5 ? -1 : 1;
      drawBolt(ctx, side * w, y0, side * (w + 30 + rnd() * 60), y0 + (rnd() - 0.5) * 120, rnd, 0.4, 1.6, '90,170,255', 0.9);
    }
  }
  ctx.restore();
}

// Reprodução das páginas: texto digitado, avanço, pulo e escolhas
class StoryScreen {
  constructor() { this.pages = []; this.i = 0; this.t = 0; this.sel = 0; this.lock = 0; this.layout = null; this.onDone = null; this.finished = true; }
  get page() { return this.pages[this.i]; }
  start(pages, onDone) {
    this.pages = pages.slice();
    this.i = 0; this.onDone = onDone; this.finished = false;
    this.enter();
  }
  enter() {
    this.t = 0; this.sel = 0; this.lock = 0.35; this.layout = null; this.choiceLock = 0.6;
    const pg = this.page;
    if (pg && pg.choices) { const k = pg.choices.findIndex((c) => !(c.locked && c.locked(game))); this.sel = Math.max(0, k); }
  }
  total(pg) { let n = 0; for (const l of pg.lines) n += (Array.isArray(l) ? l[1] : l).length; return n; }
  revealed() { return this.t * 60 * Settings.textRate() >= this.total(this.page); }
  next() {
    if (this.finished) return;
    this.i++;
    if (this.i >= this.pages.length) { this.finished = true; if (this.onDone) this.onDone(); return; }
    this.enter();
  }
  choose(k) {
    const pg = this.page, c = pg.choices[k];
    if (!c) return;
    if (c.locked && c.locked(game)) { game.audio.play('uiDeny'); return; }
    game.audio.play('uiSelect');
    const ins = [];
    if (c.pick) ins.push({ bg: pg.bg, kicker: 'ESCOLHA', title: c.label.toUpperCase(), lines: [c.pick(game)] });
    if (c.ending) { game.ending = c; ins.push(...ENDINGS[c.ending], ENDINGS.coda); }
    this.pages.splice(this.i + 1, 0, ...ins);
    this.next();
  }
  update(dt, inp) {
    if (this.finished || !this.page) return;
    const pg = this.page;
    const wasRevealed = this.revealed();
    this.t += dt;
    if (this.lock > 0) { this.lock -= dt; return; }
    if (!this.revealed()) game.audio.play('type');
    if (inp.pressed.pause) {
      // Pula até a próxima escolha (escolhas nunca são puladas)
      if (pg.choices) { this.t = 999; return; }
      let j = this.i + 1;
      while (j < this.pages.length && !this.pages[j].choices) j++;
      game.audio.play('uiMove');
      if (j >= this.pages.length) { this.i = this.pages.length - 1; this.next(); }
      else { this.i = j; this.enter(); }
      return;
    }
    if (pg.choices && wasRevealed) {
      // Pequena pausa depois que o texto aparece: evita escolher sem querer
      if (this.choiceLock > 0) { this.choiceLock -= dt; return; }
      const n = pg.choices.length;
      if (inp.pressed.up || inp.pressed.left) { this.sel = (this.sel + n - 1) % n; game.audio.play('uiMove'); }
      if (inp.pressed.down || inp.pressed.right) { this.sel = (this.sel + 1) % n; game.audio.play('uiMove'); }
      if (this.layout && (inp.mouse.moved || inp.mouse.clicked)) {
        this.layout.choiceRects.forEach((r, k) => {
          if (inp.mouse.x >= r.x && inp.mouse.x <= r.x + r.w && inp.mouse.y >= r.y && inp.mouse.y <= r.y + r.h) {
            if (this.sel !== k) { this.sel = k; game.audio.play('uiMove'); }
            if (inp.mouse.clicked) this.choose(k);
          }
        });
      }
      if (inp.pressed.one) this.choose(0);
      else if (inp.pressed.two) this.choose(1);
      else if (inp.pressed.three) this.choose(2);
      else if (inp.pressed.confirm) this.choose(this.sel);
      return;
    }
    if (inp.pressed.confirm || inp.mouse.clicked || (pg.choices && (inp.pressed.one || inp.pressed.two || inp.pressed.three))) {
      if (!wasRevealed) this.t = 999;
      else { game.audio.play('uiMove'); this.next(); }
    }
  }

  // Quebra as linhas da página em blocos posicionados (calculado uma vez por página)
  buildLayout(ctx, pg) {
    const bw = Math.min(900, VIEW_W - 160), x0 = (VIEW_W - bw) / 2;
    const blocks = [];
    let y = pg.quote ? 0 : VIEW_H * 0.34;
    ctx.save();
    for (const l of pg.lines) {
      const isTalk = Array.isArray(l);
      const text = isTalk ? l[1] : l;
      ctx.font = pg.quote ? `italic 26px ${FONT_UI}` : `${isTalk ? '' : ''}18px ${FONT_UI}`;
      const lines = wrapText(ctx, text, isTalk ? bw - 40 : bw);
      const lh = pg.quote ? 38 : 26;
      blocks.push({ who: isTalk ? l[0] : null, text, lines, y, lh });
      y += (isTalk ? 20 : 0) + lines.length * lh + (pg.quote ? 18 : 12);
    }
    ctx.restore();
    let textBottom = y;
    if (pg.quote) {
      const off = VIEW_H * 0.5 - y / 2;
      for (const b of blocks) b.y += off;
      textBottom += off;
    }
    const choiceRects = [];
    if (pg.choices) {
      let cy = Math.min(textBottom + 14, VIEW_H - 40 - pg.choices.length * 64);
      for (let k = 0; k < pg.choices.length; k++) { choiceRects.push({ x: x0, y: cy, w: bw, h: 56 }); cy += 64; }
    }
    return { x0, bw, blocks, textBottom, choiceRects, vw: VIEW_W };
  }

  draw(ctx, rt) {
    const pg = this.page;
    if (!pg) return;
    Backdrop.draw(ctx, pg.bg, rt);
    if (!this.layout || this.layout.vw !== VIEW_W) this.layout = this.buildLayout(ctx, pg);
    const L = this.layout;
    ctx.save();
    // Véu escuro para leitura
    if (!pg.quote) {
      const g = ctx.createLinearGradient(0, 0, VIEW_W, 0);
      g.addColorStop(0, 'rgba(1,3,8,0.88)'); g.addColorStop(0.55, 'rgba(1,3,8,0.6)'); g.addColorStop(1, 'rgba(1,3,8,0.08)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    const intro = clamp(this.t / 0.5, 0, 1);
    ctx.textBaseline = 'middle';
    if (!pg.quote) {
      ctx.globalAlpha = intro;
      ctx.textAlign = 'left';
      ctx.font = `bold 14px ${FONT_TITLE}`;
      ctx.letterSpacing = '6px';
      ctx.fillStyle = PAL.accent;
      ctx.fillText(pg.kicker || '', L.x0, VIEW_H * 0.15);
      ctx.font = `bold 40px ${FONT_TITLE}`;
      ctx.letterSpacing = '4px';
      const tw = ctx.measureText(pg.title || '').width;
      if (tw > VIEW_W - L.x0 - 40) ctx.font = `bold ${Math.floor(40 * (VIEW_W - L.x0 - 40) / tw)}px ${FONT_TITLE}`;
      glowText(ctx, pg.title || '', L.x0, VIEW_H * 0.22, '#eef5ff', 'rgba(40,120,255,0.9)', 20);
      ctx.letterSpacing = '0px';
      ctx.strokeStyle = 'rgba(61,139,255,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(L.x0, VIEW_H * 0.27); ctx.lineTo(L.x0 + Math.min(L.bw, 420) * intro, VIEW_H * 0.27); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Texto digitado
    let budget = Math.floor(this.t * 60 * Settings.textRate());
    ctx.textAlign = pg.quote ? 'center' : 'left';
    for (const b of L.blocks) {
      if (budget <= 0) break;
      let y = b.y;
      const sp = b.who ? (SPEAKERS[b.who] || { color: PAL.accentHi, glow: 'rgba(60,140,255,0.7)' }) : null;
      if (b.who) {
        ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '3px';
        ctx.fillStyle = sp.color;
        ctx.fillText(b.who, L.x0 + 20, y);
        ctx.letterSpacing = '0px';
        ctx.fillStyle = sp.color; ctx.globalAlpha = 0.6;
        ctx.fillRect(L.x0 + 6, y - 6, 3, 20 + b.lines.length * b.lh - 8);
        ctx.globalAlpha = 1;
        y += 20;
      }
      ctx.font = pg.quote ? `italic 26px ${FONT_UI}` : `18px ${FONT_UI}`;
      for (const ln of b.lines) {
        if (budget <= 0) break;
        const part = ln.slice(0, budget);
        budget -= ln.length + 1;
        const x = pg.quote ? VIEW_W / 2 : L.x0 + (b.who ? 20 : 0);
        if (pg.quote) glowText(ctx, part, x, y, '#dfe9f7', 'rgba(60,140,255,0.8)', 14);
        else if (b.who) glowText(ctx, part, x + (b.who === 'NEXUS' && Math.random() < 0.04 ? rand(-3, 3) : 0), y + 4, '#f2f6fc', sp.glow, 8);
        else { ctx.fillStyle = '#c9d3e2'; ctx.fillText(part, x, y + 4); }
        y += b.lh;
      }
    }
    // Escolhas
    if (pg.choices && this.revealed()) {
      pg.choices.forEach((c, k) => {
        const r = L.choiceRects[k], sel = k === this.sel, locked = c.locked && c.locked(game);
        ctx.save();
        ctx.fillStyle = sel ? 'rgba(14,34,74,0.88)' : 'rgba(4,10,22,0.82)';
        techPanelPath(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
        ctx.strokeStyle = locked ? 'rgba(120,130,150,0.4)' : sel ? PAL.accentHi : 'rgba(61,139,255,0.5)';
        ctx.lineWidth = sel ? 2 : 1;
        if (sel && !locked) { ctx.shadowColor = 'rgba(60,140,255,0.8)'; ctx.shadowBlur = 16; }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.font = `bold 17px ${FONT_TITLE}`; ctx.letterSpacing = '1px';
        ctx.fillStyle = locked ? '#5d6676' : sel ? '#ffffff' : '#cfe0f5';
        ctx.fillText(`${sel ? '▶ ' : ''}[${k + 1}] ${c.label}`, r.x + 18, r.y + 19);
        ctx.letterSpacing = '0px';
        ctx.font = `14px ${FONT_UI}`;
        ctx.fillStyle = locked ? '#ff5c7a' : '#9fb0c8';
        ctx.fillText(locked ? c.lockText(game) : c.desc, r.x + 18, r.y + 40);
        ctx.restore();
      });
    }
    // Rodapé: progresso e dicas
    ctx.textAlign = 'right'; ctx.font = `13px ${FONT_UI}`;
    ctx.fillStyle = 'rgba(200,215,235,0.55)';
    const hint = pg.choices ? '↑ ↓ escolher · ENTER / J confirmar · 1 2 3' : (this.revealed() ? 'ENTER / J — continuar' : 'ENTER / J — mostrar tudo') + '   ·   ESC — pular';
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(rt * 3);
    ctx.fillText(hint, VIEW_W - 30, VIEW_H - 22);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

