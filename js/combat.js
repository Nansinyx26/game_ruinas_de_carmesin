'use strict';
// ECLIPSE ZERO · Combate: avisos de ataque, hitboxes, golpes (ATTACKS), combos e contador de hits
// ---------------------------------------------------------------------------
// TELEGRAPHS: avisos visuais no chão antes de ataques inimigos
// tg = { kind: 'circle'|'cone'|'line', x, y, r, dir, arc, len, w }
// ---------------------------------------------------------------------------
function telegraphPath(ctx, tg, scale) {
  switch (tg.kind) {
    case 'circle':
      isoCirclePath(ctx, tg.x, tg.y, tg.r * scale);
      break;
    case 'cone': {
      ctx.beginPath();
      ctx.moveTo(isoX(tg.x, tg.y), isoY(tg.x, tg.y));
      const steps = 18;
      for (let i = 0; i <= steps; i++) {
        const a = tg.dir - tg.arc + (2 * tg.arc * i) / steps;
        const px = tg.x + Math.cos(a) * tg.r * scale, py = tg.y + Math.sin(a) * tg.r * scale;
        ctx.lineTo(isoX(px, py), isoY(px, py));
      }
      ctx.closePath();
      break;
    }
    case 'line': {
      const c = Math.cos(tg.dir), s = Math.sin(tg.dir), L = tg.len * scale;
      const nx = -s * tg.w, ny = c * tg.w;
      const x0 = tg.x, y0 = tg.y, x1 = tg.x + c * L, y1 = tg.y + s * L;
      ctx.beginPath();
      ctx.moveTo(isoX(x0 + nx, y0 + ny), isoY(x0 + nx, y0 + ny));
      ctx.lineTo(isoX(x1 + nx, y1 + ny), isoY(x1 + nx, y1 + ny));
      ctx.lineTo(isoX(x1 - nx, y1 - ny), isoY(x1 - nx, y1 - ny));
      ctx.lineTo(isoX(x0 - nx, y0 - ny), isoY(x0 - nx, y0 - ny));
      ctx.closePath();
      break;
    }
  }
}

function drawTelegraph(ctx, tg, progress, time, rgb = '255,46,70') {
  progress = clamp(progress, 0, 1);
  const pulse = 0.5 + 0.5 * Math.sin(time * (14 + progress * 16));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Área total (contorno pulsante)
  telegraphPath(ctx, tg, 1);
  ctx.fillStyle = rgba(rgb, 0.06 + 0.05 * pulse);
  ctx.fill();
  ctx.strokeStyle = rgba(rgb, 0.45 + 0.35 * pulse);
  ctx.lineWidth = 2;
  ctx.stroke();
  // Preenchimento que cresce até o momento do golpe
  if (progress > 0.02) {
    telegraphPath(ctx, tg, progress);
    ctx.fillStyle = rgba(rgb, 0.12 + 0.28 * progress + (progress > 0.85 ? 0.2 * pulse : 0));
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// HITBOXES: testes de colisão entre formas de ataque e hurtboxes circulares
// shape = {type:'arc', range, arc} | {type:'circle', radius, offset}
//       | {type:'capsule', length, width} | {type:'ring', radius, width}
// ---------------------------------------------------------------------------
const Hitbox = {
  // A forma está posicionada em (ox, oy) e orientada pelo ângulo 'dir'
  test(shape, ox, oy, dir, cx, cy, cr) {
    switch (shape.type) {
      case 'arc': {
        const dx = cx - ox, dy = cy - oy, d = Math.hypot(dx, dy);
        if (d - cr > shape.range) return false;
        if (d <= cr + 6) return true; // colado no atacante
        const tol = Math.asin(Math.min(1, cr / d)); // tolerância angular pelo raio do alvo
        return Math.abs(angleDiff(dir, Math.atan2(dy, dx))) <= shape.arc + tol;
      }
      case 'circle': {
        const off = shape.offset || 0;
        const px = ox + Math.cos(dir) * off, py = oy + Math.sin(dir) * off;
        return dist(px, py, cx, cy) <= shape.radius + cr;
      }
      case 'capsule': {
        const ex = ox + Math.cos(dir) * shape.length, ey = oy + Math.sin(dir) * shape.length;
        return pointSegDist(cx, cy, ox, oy, ex, ey) <= shape.width + cr;
      }
      case 'ring': {
        const d = dist(ox, oy, cx, cy);
        return Math.abs(d - shape.radius) <= shape.width + cr;
      }
    }
    return false;
  },

  // Desenho das hitboxes no modo de depuração (F1)
  drawDebug(ctx, shape, ox, oy, dir, rgb) {
    ctx.save();
    ctx.strokeStyle = rgba(rgb, 0.95);
    ctx.fillStyle = rgba(rgb, 0.2);
    ctx.lineWidth = 1.5;
    switch (shape.type) {
      case 'arc':
        telegraphPath(ctx, { kind: 'cone', x: ox, y: oy, r: shape.range, dir, arc: shape.arc }, 1);
        ctx.fill(); ctx.stroke();
        break;
      case 'circle': {
        const off = shape.offset || 0;
        isoCirclePath(ctx, ox + Math.cos(dir) * off, oy + Math.sin(dir) * off, shape.radius);
        ctx.fill(); ctx.stroke();
        break;
      }
      case 'capsule': {
        telegraphPath(ctx, { kind: 'line', x: ox, y: oy, dir, len: shape.length, w: shape.width }, 1);
        ctx.fill(); ctx.stroke();
        isoCirclePath(ctx, ox, oy, shape.width); ctx.stroke();
        isoCirclePath(ctx, ox + Math.cos(dir) * shape.length, oy + Math.sin(dir) * shape.length, shape.width); ctx.stroke();
        break;
      }
      case 'ring':
        isoCirclePath(ctx, ox, oy, shape.radius + shape.width); ctx.stroke();
        isoCirclePath(ctx, ox, oy, Math.max(0.5, shape.radius - shape.width)); ctx.stroke();
        break;
    }
    ctx.restore();
  },
};

// Desenha uma hurtbox (círculo do mundo) no modo debug
function drawHurtbox(ctx, x, y, r, rgb = '80,255,120') {
  ctx.save();
  ctx.strokeStyle = rgba(rgb, 0.9);
  ctx.lineWidth = 1.2;
  isoCirclePath(ctx, x, y, r);
  ctx.stroke();
  const sx = isoX(x, y), sy = isoY(x, y);
  ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// DEFINIÇÃO DOS GOLPES DO JOGADOR (técnicas da Tempestade Nula)
// windup/active/recovery: fases do golpe (s)   chainFrac: fração da recuperação
// após a qual um input armazenado encadeia o próximo golpe
// swing: ângulos inicial/final da lâmina relativos à direção do jogador
// arcs: chance de o golpe soltar um arco elétrico no alvo
// ---------------------------------------------------------------------------
const ATTACKS = {
  light1: {
    name: null, windup: 0.06, active: 0.09, recovery: 0.2, chainFrac: 0.12,
    shape: { type: 'arc', range: 82, arc: 1.15 }, dmg: 10, kb: 190, launch: 0, stun: 0.3,
    hitstop: 0.045, shake: 0.13, lunge: 210, swing: [-1.35, 1.2], blade: 74,
    rgb: '50,120,255', core: '210,235,255', sound: 'swing', fury: 4, arcs: 0.25, light: true,
  },
  light2: {
    name: null, windup: 0.06, active: 0.09, recovery: 0.2, chainFrac: 0.12,
    shape: { type: 'arc', range: 84, arc: 1.15 }, dmg: 11, kb: 200, launch: 0, stun: 0.3,
    hitstop: 0.045, shake: 0.13, lunge: 220, swing: [1.3, -1.25], blade: 76,
    rgb: '50,120,255', core: '210,235,255', sound: 'swing', fury: 4, arcs: 0.25, light: true,
  },
  light3: {
    name: 'DESCARGA TRÍPLICE', windup: 0.1, active: 0.11, recovery: 0.32, chainFrac: 0.5,
    shape: { type: 'arc', range: 98, arc: 1.4 }, dmg: 22, kb: 380, launch: 0, stun: 0.55,
    hitstop: 0.085, shake: 0.3, heavy: true, lunge: 330, swing: [-1.9, 1.75], blade: 90,
    rgb: '40,110,255', core: '200,230,255', sound: 'swingHeavy', fury: 7, zoom: 0.03, arcs: 0.8, light: true,
  },
  spin: {
    name: 'CÍRCULO DA RUÍNA', windup: 0.07, active: 0.42, recovery: 0.26, chainFrac: 0.5,
    shape: { type: 'circle', radius: 106, offset: 0 }, dmg: 9, kb: 230, launch: 0, stun: 0.35,
    hitstop: 0.035, shake: 0.1, multiHit: 3, rehit: 0.12, radialKb: true, lunge: 70,
    swing: [0, TAU * 1.5], blade: 94, rgb: '80,190,255', core: '225,245,255', sound: 'swingHeavy', fury: 4, arcs: 0.35,
  },
  heavy: {
    name: null, windup: 0.22, active: 0.1, recovery: 0.36, chainFrac: 0.35,
    shape: { type: 'arc', range: 102, arc: 1.0 }, dmg: 26, kb: 340, launch: 0, stun: 0.55,
    hitstop: 0.09, shake: 0.28, heavy: true, heavyType: true, lunge: 160, swing: [-1.9, 1.1], blade: 92,
    rgb: '70,100,255', core: '210,225,255', sound: 'swingHeavy', fury: 7, chargeable: true, zoom: 0.02, arcs: 0.5,
  },
  charged: {
    name: 'IMPACTO CARREGADO', windup: 0.05, active: 0.12, recovery: 0.42, chainFrac: 0.55,
    shape: { type: 'arc', range: 122, arc: 1.6 }, dmg: 34, kb: 600, launch: 430, stun: 0.9,
    hitstop: 0.13, shake: 0.55, heavy: true, heavyType: true, lunge: 400, swing: [-2.4, 2.0], blade: 106,
    rgb: '120,170,255', core: '240,250,255', sound: 'swingHeavy', fury: 10, zoom: 0.05, arcs: 1,
  },
  thrust: {
    name: 'PULSO FANTASMA', windup: 0.03, active: 0.14, recovery: 0.24, chainFrac: 0.3,
    shape: { type: 'capsule', length: 128, width: 24 }, dmg: 20, kb: 300, launch: 0, stun: 0.45,
    hitstop: 0.06, shake: 0.2, lunge: 760, swing: [0, 0], blade: 98, thrust: true,
    rgb: '120,210,255', core: '235,250,255', sound: 'thrust', fury: 6, arcs: 0.7,
  },
  slam: {
    name: 'COLAPSO MAGNÉTICO', windup: 0.24, active: 0.1, recovery: 0.42, chainFrac: 0.5,
    shape: { type: 'circle', radius: 122, offset: 46 }, dmg: 30, kb: 430, launch: 260, stun: 0.8,
    hitstop: 0.11, shake: 0.6, heavy: true, heavyType: true, radialKb: true, lunge: 90,
    swing: [-2.5, 0.4], blade: 92, slamRing: true,
    rgb: '60,120,255', core: '210,235,255', sound: 'swingHeavy', fury: 9, zoom: 0.04, arcs: 0.6,
  },
  uppercut: {
    name: 'RELÂMPAGO ASCENDENTE', windup: 0.07, active: 0.1, recovery: 0.3, chainFrac: 0.35,
    shape: { type: 'arc', range: 92, arc: 1.1 }, dmg: 17, kb: 90, launch: 640, stun: 0.8,
    hitstop: 0.07, shake: 0.22, heavy: true, lunge: 170, swing: [1.4, -1.4], blade: 86,
    rgb: '100,150,255', core: '225,240,255', sound: 'swing', fury: 6, arcs: 0.6,
  },
  wave: {
    name: 'CORTE DO VAZIO', windup: 0.08, active: 0.06, recovery: 0.3, chainFrac: 0.4,
    shape: { type: 'arc', range: 72, arc: 1.0 }, dmg: 12, kb: 160, launch: 0, stun: 0.3,
    hitstop: 0.04, shake: 0.18, lunge: 80, swing: [-1.5, 1.5], blade: 82, projectile: 'crescent',
    rgb: '140,210,255', core: '240,250,255', sound: 'thrust', fury: 5, arcs: 0.3,
  },
  // Finalização (L L L H, nó Sentença do Eclipse): salto e golpe por cima até o chão, com onda
  finisher: {
    name: 'SENTENÇA DO ECLIPSE', windup: 0.2, active: 0.12, recovery: 0.46, chainFrac: 0.55,
    shape: { type: 'circle', radius: 132, offset: 52 }, dmg: 42, kb: 560, launch: 320, stun: 1.0,
    hitstop: 0.14, shake: 0.65, heavy: true, heavyType: true, radialKb: true, lunge: 260, leap: 9,
    swing: [-2.6, 0.5], blade: 100, slamRing: true,
    rgb: '90,150,255', core: '235,245,255', sound: 'swingHeavy', fury: 11, zoom: 0.05, arcs: 1,
  },
  // Revés (L H L, nó Revés do Horizonte): vira para trás no meio do combo e corta o que estava
  // às costas (sem direção apertada; com direção, corta para onde o jogador apontar)
  reverse: {
    name: 'REVÉS DO HORIZONTE', windup: 0.07, active: 0.12, recovery: 0.28, chainFrac: 0.35,
    shape: { type: 'arc', range: 98, arc: 1.5 }, dmg: 19, kb: 320, launch: 0, stun: 0.5, turn: Math.PI,
    hitstop: 0.07, shake: 0.24, heavy: true, lunge: 200, swing: [-2.2, 1.7], blade: 92,
    rgb: '70,140,255', core: '220,238,255', sound: 'swingHeavy', fury: 6, arcs: 0.5,
  },
  // ----- Habilidades ativas que usam o corpo de Kael (dano escala com o poder)
  volt: {
    name: 'ARCO VOLTAICO', windup: 0.07, active: 0.07, recovery: 0.2, chainFrac: 0.3,
    shape: { type: 'arc', range: 70, arc: 0.9 }, dmg: 6, kb: 120, launch: 0, stun: 0.25,
    hitstop: 0.03, shake: 0.12, lunge: 60, swing: [-0.9, 0.5], blade: 84, projectile: 'volt', ability: true, shock: true,
    rgb: '90,170,255', core: '235,248,255', sound: 'thrust', fury: 0, arcs: 1,
  },
  zap: {
    name: 'CORRENTE RELÂMPAGO', windup: 0.05, active: 0.08, recovery: 0.24, chainFrac: 0.3,
    shape: { type: 'arc', range: 60, arc: 0.8 }, dmg: 0, kb: 0, launch: 0, stun: 0, noHit: true,
    hitstop: 0, shake: 0.1, lunge: 0, swing: [1.6, -0.2], blade: 84, ability: true,
    rgb: '130,200,255', core: '240,250,255', sound: 'swing', fury: 0, arcs: 0,
  },
  plasma: {
    name: 'RUPTURA DE PLASMA', windup: 0.32, active: 0.08, recovery: 0.36, chainFrac: 0.4,
    shape: { type: 'circle', radius: 170, offset: 0 }, dmg: 100, kb: 520, launch: 380, stun: 0.9,
    hitstop: 0.1, shake: 0.5, heavy: true, radialKb: true, lunge: 0, swing: [-2.6, 0.5], blade: 96, plasma: true, ability: true, shock: true,
    rgb: '120,200,255', core: '240,250,255', sound: 'swingHeavy', fury: 0, zoom: 0.05, arcs: 1,
  },
  storm: {
    name: 'TEMPESTADE DE LÂMINAS', windup: 0.06, active: 0.58, recovery: 0.24, chainFrac: 0.4,
    shape: { type: 'arc', range: 118, arc: 1.35 }, dmg: 19, kb: 110, launch: 0, stun: 0.3,
    hitstop: 0.025, shake: 0.08, multiHit: 6, rehit: 0.09, lunge: 120, swing: [-1.2, 1.2], oscillate: 6, blade: 96, ability: true,
    rgb: '200,225,255', core: '255,255,255', sound: 'swing', fury: 0, arcs: 0.5,
  },
  lunge: {
    name: 'INVESTIDA SOMBRIA', windup: 0.02, active: 0.12, recovery: 0.26, chainFrac: 0.3,
    shape: { type: 'capsule', length: 110, width: 30 }, dmg: 50, kb: 360, launch: 0, stun: 0.6,
    hitstop: 0.07, shake: 0.22, heavy: true, lunge: 260, swing: [0, 0], blade: 98, thrust: true, ability: true,
    rgb: '170,120,255', core: '240,230,255', sound: 'thrust', fury: 0, arcs: 0.5,
  },

  // ==================== LYRA KAEDE (Arco de Fóton) ====================
  lyra_light1: {
    name: null, windup: 0.05, active: 0.06, recovery: 0.18, chainFrac: 0.15,
    shape: { type: 'arc', range: 70, arc: 0.8 }, dmg: 14, kb: 140, launch: 0, stun: 0.25,
    hitstop: 0.03, shake: 0.1, lunge: 30, swing: [-0.6, 0.4], blade: 60, projectile: 'arrow',
    rgb: '166,77,255', core: '235,210,255', sound: 'thrust', fury: 5, light: true,
  },
  lyra_light2: {
    name: null, windup: 0.05, active: 0.07, recovery: 0.2, chainFrac: 0.15,
    shape: { type: 'arc', range: 75, arc: 0.8 }, dmg: 16, kb: 160, launch: 0, stun: 0.25,
    hitstop: 0.03, shake: 0.12, lunge: 30, swing: [0.5, -0.5], blade: 62, projectile: 'arrow_burst',
    rgb: '180,95,255', core: '240,220,255', sound: 'thrust', fury: 5, light: true,
  },
  lyra_light3: {
    name: 'DISPARO FOCADO', windup: 0.08, active: 0.09, recovery: 0.28, chainFrac: 0.4,
    shape: { type: 'arc', range: 85, arc: 0.9 }, dmg: 28, kb: 360, launch: 0, stun: 0.5,
    hitstop: 0.07, shake: 0.25, heavy: true, lunge: 50, swing: [-0.8, 0.6], blade: 70, projectile: 'pierce_arrow',
    rgb: '190,110,255', core: '245,230,255', sound: 'swingHeavy', fury: 8, zoom: 0.02, light: true,
  },
  lyra_heavy: {
    name: 'TIRO PRECISO', windup: 0.18, active: 0.08, recovery: 0.32, chainFrac: 0.35,
    shape: { type: 'arc', range: 90, arc: 0.7 }, dmg: 35, kb: 320, launch: 0, stun: 0.5,
    hitstop: 0.08, shake: 0.25, heavy: true, heavyType: true, lunge: 20, swing: [-0.5, 0.5], blade: 65,
    rgb: '200,120,255', core: '250,235,255', sound: 'thrust', fury: 8, chargeable: true, zoom: 0.02,
  },
  lyra_charged: {
    name: 'TIRO DE PRECISÃO MÁXIMO', windup: 0.04, active: 0.1, recovery: 0.4, chainFrac: 0.5,
    shape: { type: 'capsule', length: 160, width: 36 }, dmg: 65, kb: 520, launch: 240, stun: 0.85,
    hitstop: 0.12, shake: 0.45, heavy: true, heavyType: true, lunge: 80, swing: [-0.3, 0.3], blade: 80,
    projectile: 'charged_arrow', rgb: '220,150,255', core: '255,250,255', sound: 'swingHeavy', fury: 12, zoom: 0.05,
  },
  lyra_backstep: {
    name: 'SALTO RECUADO', windup: 0.02, active: 0.1, recovery: 0.22, chainFrac: 0.3,
    shape: { type: 'arc', range: 80, arc: 0.9 }, dmg: 24, kb: 220, launch: 0, stun: 0.4,
    hitstop: 0.05, shake: 0.15, lunge: -180, swing: [-0.7, 0.7], blade: 65, projectile: 'arrow_burst',
    rgb: '180,100,255', core: '240,225,255', sound: 'thrust', fury: 6,
  },
  lyra_pierce: {
    name: 'FLECHA PERFURANTE', windup: 0.06, active: 0.1, recovery: 0.3, chainFrac: 0.4,
    shape: { type: 'capsule', length: 180, width: 40 }, dmg: 48, kb: 380, launch: 0, stun: 0.6,
    hitstop: 0.08, shake: 0.3, heavy: true, lunge: 40, swing: [-0.4, 0.4], blade: 75,
    projectile: 'pierce_arrow', rgb: '210,130,255', core: '250,240,255', sound: 'swingHeavy', fury: 8, zoom: 0.03,
  },

  // ==================== DRAKOS (Machado e Martelo de Plasma) ====================
  drakos_light1: {
    name: null, windup: 0.1, active: 0.11, recovery: 0.24, chainFrac: 0.2,
    shape: { type: 'arc', range: 94, arc: 1.25 }, dmg: 17, kb: 260, launch: 0, stun: 0.4,
    hitstop: 0.06, shake: 0.18, lunge: 140, swing: [-1.4, 1.2], blade: 84,
    rgb: '255,46,61', core: '255,210,215', sound: 'swingHeavy', fury: 5, heavy: true, light: true,
  },
  drakos_light2: {
    name: null, windup: 0.09, active: 0.11, recovery: 0.26, chainFrac: 0.2,
    shape: { type: 'arc', range: 96, arc: 1.25 }, dmg: 20, kb: 290, launch: 0, stun: 0.45,
    hitstop: 0.065, shake: 0.2, lunge: 150, swing: [1.3, -1.2], blade: 86,
    rgb: '255,55,70', core: '255,215,220', sound: 'swingHeavy', fury: 5, heavy: true, light: true,
  },
  drakos_light3: {
    name: 'IMPACTO CONCUSSIVO', windup: 0.14, active: 0.12, recovery: 0.36, chainFrac: 0.45,
    shape: { type: 'circle', radius: 110, offset: 40 }, dmg: 36, kb: 480, launch: 220, stun: 0.75,
    hitstop: 0.11, shake: 0.45, heavy: true, radialKb: true, lunge: 180, swing: [-2.2, 0.8], blade: 92,
    rgb: '255,30,45', core: '255,200,205', sound: 'stomp', fury: 8, zoom: 0.04, altWeapon: true,
  },
  drakos_heavy: {
    name: 'GOLPE PESADO', windup: 0.26, active: 0.12, recovery: 0.4, chainFrac: 0.4,
    shape: { type: 'arc', range: 108, arc: 1.1 }, dmg: 55, kb: 500, launch: 280, stun: 0.85, breaksShield: true,
    hitstop: 0.12, shake: 0.5, heavy: true, heavyType: true, lunge: 160, swing: [-2.4, 1.0], blade: 94,
    rgb: '255,40,55', core: '255,210,215', sound: 'swingHeavy', fury: 9, chargeable: true, zoom: 0.04,
  },
  drakos_charged: {
    name: 'COLAPSO TITÂNICO', windup: 0.06, active: 0.14, recovery: 0.46, chainFrac: 0.55,
    shape: { type: 'circle', radius: 135, offset: 48 }, dmg: 78, kb: 650, launch: 450, stun: 1.0, breaksShield: true,
    hitstop: 0.15, shake: 0.7, heavy: true, heavyType: true, radialKb: true, lunge: 220, swing: [-2.6, 1.2], blade: 100,
    rgb: '255,60,70', core: '255,230,230', sound: 'stomp', fury: 14, zoom: 0.06,
  },
  drakos_sweep: {
    name: 'VARREDURA DA LEGIÃO', windup: 0.1, active: 0.38, recovery: 0.3, chainFrac: 0.45,
    shape: { type: 'circle', radius: 114, offset: 0 }, dmg: 36, kb: 360, launch: 0, stun: 0.6,
    hitstop: 0.05, shake: 0.22, multiHit: 2, rehit: 0.15, radialKb: true, lunge: 80,
    swing: [0, TAU * 1.3], blade: 92, rgb: '255,80,90', core: '255,220,225', sound: 'swingHeavy', fury: 7,
  },
  drakos_quake: {
    name: 'TERREMOTO DE IMPACTO', windup: 0.2, active: 0.12, recovery: 0.42, chainFrac: 0.5,
    shape: { type: 'capsule', length: 170, width: 70 }, dmg: 58, kb: 520, launch: 320, stun: 0.9,
    hitstop: 0.12, shake: 0.6, heavy: true, heavyType: true, lunge: 100, swing: [-2.2, 0.4], blade: 92,
    rgb: '255,40,55', core: '255,200,205', sound: 'stomp', fury: 10, zoom: 0.05,
  },
  // Finalização (L L L H): salto com a arma erguida e a queda sobre o chão
  drakos_finisher: {
    name: 'QUEDA DO TITÃ', windup: 0.26, active: 0.13, recovery: 0.52, chainFrac: 0.55,
    shape: { type: 'circle', radius: 150, offset: 54 }, dmg: 70, kb: 640, launch: 380, stun: 1.1, breaksShield: true,
    hitstop: 0.16, shake: 0.8, heavy: true, heavyType: true, radialKb: true, lunge: 240, leap: 11,
    swing: [-2.6, 0.6], blade: 100, slamRing: true,
    rgb: '255,50,60', core: '255,230,230', sound: 'stomp', fury: 13, zoom: 0.07,
  },
  // Retaliação: L logo depois de um bloqueio do Escudo de Energia (1 s) — crítico garantido
  drakos_counter: {
    name: 'RETALIAÇÃO', windup: 0.06, active: 0.12, recovery: 0.32, chainFrac: 0.4,
    shape: { type: 'arc', range: 110, arc: 1.3 }, dmg: 48, kb: 520, launch: 200, stun: 0.9, breaksShield: true, counter: true,
    hitstop: 0.12, shake: 0.45, heavy: true, lunge: 260, swing: [-2.3, 1.0], blade: 96,
    rgb: '255,90,70', core: '255,230,215', sound: 'swingHeavy', fury: 10, zoom: 0.04,
  },
  drakos_charge: {
    name: 'INVESTIDA DA LEGIÃO', windup: 0.04, active: 0.28, recovery: 0.25, chainFrac: 0.3,
    shape: { type: 'capsule', length: 120, width: 44 }, dmg: 40, kb: 440, launch: 240, stun: 0.8,
    hitstop: 0.08, shake: 0.35, heavy: true, lunge: 980, swing: [0, 0], blade: 90, thrust: true,
    rgb: '255,50,65', core: '255,220,225', sound: 'thrust', fury: 6, zoom: 0.03,
  },
  drakos_slam: {
    name: 'ZONA DE IMPACTO', windup: 0.3, active: 0.12, recovery: 0.48, chainFrac: 0.4,
    shape: { type: 'circle', radius: 240, offset: 0 }, dmg: 140, kb: 580, launch: 420, stun: 1.2,
    hitstop: 0.16, shake: 0.8, heavy: true, radialKb: true, lunge: 0, swing: [-2.5, 0.5], blade: 105,
    rgb: '255,40,50', core: '255,240,240', sound: 'stomp', fury: 0, zoom: 0.07, arcs: 1,
  },

  // ==================== SERA VYNE (Tecnomante / Bastão Neural) ====================
  sera_light1: {
    name: null, windup: 0.05, active: 0.06, recovery: 0.18, chainFrac: 0.15,
    shape: { type: 'arc', range: 75, arc: 0.8 }, dmg: 9, kb: 130, launch: 0, stun: 0.25,
    hitstop: 0.03, shake: 0.08, lunge: 25, swing: [-0.6, 0.4], blade: 64, projectile: 'tech_orb',
    rgb: '25,230,210', core: '220,255,250', sound: 'zap', fury: 5, light: true,
  },
  sera_light2: {
    name: null, windup: 0.05, active: 0.07, recovery: 0.2, chainFrac: 0.15,
    shape: { type: 'arc', range: 78, arc: 0.8 }, dmg: 10, kb: 150, launch: 0, stun: 0.25,
    hitstop: 0.03, shake: 0.1, lunge: 25, swing: [0.5, -0.5], blade: 66, projectile: 'tech_orb',
    rgb: '35,240,220', core: '225,255,252', sound: 'zap', fury: 5, light: true,
  },
  sera_light3: {
    name: 'DESCARGA DE RESSONÂNCIA', windup: 0.08, active: 0.1, recovery: 0.28, chainFrac: 0.4,
    shape: { type: 'circle', radius: 100, offset: 40 }, dmg: 24, kb: 340, launch: 0, stun: 0.5,
    hitstop: 0.06, shake: 0.22, heavy: true, radialKb: true, lunge: 40, swing: [-0.8, 0.8], blade: 72,
    rgb: '40,250,225', core: '235,255,255', sound: 'zap', fury: 8, zoom: 0.02,
  },
  sera_heavy: {
    name: 'PULSO CIBERNÉTICO', windup: 0.2, active: 0.1, recovery: 0.32, chainFrac: 0.35,
    shape: { type: 'capsule', length: 150, width: 34 }, dmg: 36, kb: 300, launch: 0, stun: 0.55,
    hitstop: 0.07, shake: 0.24, heavy: true, heavyType: true, lunge: 30, swing: [0, 0], blade: 70, thrust: true,
    rgb: '30,235,215', core: '230,255,250', sound: 'thrust', fury: 8, chargeable: true, zoom: 0.02,
  },
  sera_charged: {
    name: 'PULSO CIBERNÉTICO MÁXIMO', windup: 0.05, active: 0.12, recovery: 0.42, chainFrac: 0.5,
    shape: { type: 'capsule', length: 190, width: 48 }, dmg: 56, kb: 460, launch: 220, stun: 0.85,
    hitstop: 0.11, shake: 0.42, heavy: true, heavyType: true, lunge: 60, swing: [0, 0], blade: 80, thrust: true,
    rgb: '50,255,230', core: '240,255,255', sound: 'thunder', fury: 12, zoom: 0.04, arcs: 0.8,
  },
  sera_lift: {
    name: 'CAMPO DE LEVITAÇÃO', windup: 0.08, active: 0.1, recovery: 0.3, chainFrac: 0.35,
    shape: { type: 'circle', radius: 95, offset: 35 }, dmg: 26, kb: 80, launch: 520, stun: 0.8,
    hitstop: 0.07, shake: 0.2, heavy: true, lunge: 30, swing: [1.2, -1.2], blade: 70,
    rgb: '60,240,225', core: '235,255,255', sound: 'swing', fury: 7,
  },
  sera_burst: {
    name: 'TECHNO NOVA', windup: 0.08, active: 0.1, recovery: 0.32, chainFrac: 0.4,
    shape: { type: 'circle', radius: 105, offset: 0 }, dmg: 38, kb: 380, launch: 0, stun: 0.6,
    hitstop: 0.07, shake: 0.28, heavy: true, radialKb: true, lunge: 0, swing: [-2.0, 0.4], blade: 75,
    rgb: '25,235,215', core: '230,255,250', sound: 'zap', fury: 8, zoom: 0.03,
  },

  // ==================== ORION (Lâminas Duplas / Assassino) ====================
  orion_light1: {
    name: null, windup: 0.04, active: 0.06, recovery: 0.15, chainFrac: 0.1,
    shape: { type: 'arc', range: 80, arc: 1.1 }, dmg: 11, kb: 130, launch: 0, stun: 0.2,
    hitstop: 0.025, shake: 0.08, lunge: 160, swing: [-1.2, 1.0], blade: 70,
    rgb: '255,138,31', core: '255,230,200', sound: 'thrust', fury: 4, light: true,
  },
  orion_light2: {
    name: null, windup: 0.04, active: 0.07, recovery: 0.16, chainFrac: 0.1,
    shape: { type: 'arc', range: 82, arc: 1.15 }, dmg: 10, kb: 140, launch: 0, stun: 0.2,
    hitstop: 0.025, shake: 0.09, multiHit: 2, rehit: 0.035, lunge: 170, swing: [1.1, -1.1], blade: 72,
    rgb: '255,145,40', core: '255,235,205', sound: 'swing', fury: 5, light: true,
  },
  orion_light3: {
    name: 'DANÇA DAS LÂMINAS', windup: 0.06, active: 0.1, recovery: 0.24, chainFrac: 0.35,
    shape: { type: 'circle', radius: 98, offset: 0 }, dmg: 14, kb: 280, launch: 0, stun: 0.45,
    hitstop: 0.05, shake: 0.2, multiHit: 3, rehit: 0.03, radialKb: true, lunge: 190, swing: [0, TAU * 1.2], blade: 78,
    rgb: '255,155,50', core: '255,240,210', sound: 'swingHeavy', fury: 7, zoom: 0.02,
  },
  orion_heavy: {
    name: 'EMBOSCADA SOMBRIA', windup: 0.14, active: 0.09, recovery: 0.28, chainFrac: 0.3,
    shape: { type: 'capsule', length: 115, width: 28 }, dmg: 38, kb: 320, launch: 0, stun: 0.5,
    hitstop: 0.065, shake: 0.24, heavy: true, heavyType: true, lunge: 360, swing: [0, 0], blade: 82, thrust: true,
    rgb: '255,130,25', core: '255,225,195', sound: 'thrust', fury: 7, chargeable: true, zoom: 0.02,
  },
  orion_charged: {
    name: 'EXECUÇÃO FANTASMA', windup: 0.04, active: 0.11, recovery: 0.35, chainFrac: 0.45,
    shape: { type: 'capsule', length: 140, width: 34 }, dmg: 68, kb: 440, launch: 0, stun: 0.75,
    hitstop: 0.1, shake: 0.4, heavy: true, heavyType: true, lunge: 520, swing: [0, 0], blade: 90, thrust: true,
    rgb: '255,160,55', core: '255,245,220', sound: 'swingHeavy', fury: 11, zoom: 0.04,
  },
  orion_lunge: {
    name: 'PASSO FANTASMA', windup: 0.02, active: 0.1, recovery: 0.22, chainFrac: 0.25,
    shape: { type: 'capsule', length: 120, width: 26 }, dmg: 28, kb: 260, launch: 0, stun: 0.4,
    hitstop: 0.05, shake: 0.18, lunge: 420, swing: [0, 0], blade: 80, thrust: true,
    rgb: '255,140,35', core: '255,230,200', sound: 'thrust', fury: 5,
  },
  orion_flurry: {
    name: 'CICLONE DE SOMBRAS', windup: 0.06, active: 0.32, recovery: 0.24, chainFrac: 0.35,
    shape: { type: 'circle', radius: 104, offset: 0 }, dmg: 16, kb: 220, launch: 0, stun: 0.35,
    hitstop: 0.03, shake: 0.15, multiHit: 4, rehit: 0.07, radialKb: true, lunge: 140,
    swing: [0, TAU * 1.5], blade: 80, rgb: '255,150,45', core: '255,235,210', sound: 'swing', fury: 7,
  },
  // Corte em X (H H): as duas lâminas cruzam juntas — dois acertos
  orion_cross: {
    name: 'CORTE EM X', windup: 0.07, active: 0.1, recovery: 0.22, chainFrac: 0.3,
    shape: { type: 'arc', range: 90, arc: 1.3 }, dmg: 15, kb: 240, launch: 0, stun: 0.45,
    hitstop: 0.05, shake: 0.2, multiHit: 2, rehit: 0.05, heavy: true, lunge: 220, swing: [-1.3, 1.3], blade: 78,
    rgb: '255,150,45', core: '255,238,210', sound: 'swingHeavy', fury: 6,
  },
  // Finalização acrobática (L L L H): salto mortal por cima do alvo e as duas lâminas na queda
  orion_finisher: {
    name: 'SALTO DO CORVO', windup: 0.08, active: 0.2, recovery: 0.3, chainFrac: 0.45,
    shape: { type: 'circle', radius: 110, offset: 44 }, dmg: 24, kb: 360, launch: 260, stun: 0.7,
    hitstop: 0.07, shake: 0.32, multiHit: 2, rehit: 0.1, heavy: true, radialKb: true, lunge: 300,
    swing: [-2.2, 1.6], blade: 82, rgb: '255,160,55', core: '255,245,220', sound: 'swingHeavy', fury: 9, zoom: 0.03,
  },
  orion_upper: {
    name: 'CORTE ASCENDENTE', windup: 0.05, active: 0.08, recovery: 0.24, chainFrac: 0.3,
    shape: { type: 'arc', range: 84, arc: 1.1 }, dmg: 22, kb: 80, launch: 580, stun: 0.75,
    hitstop: 0.06, shake: 0.2, heavy: true, lunge: 180, swing: [1.3, -1.3], blade: 76,
    rgb: '255,135,30', core: '255,225,195', sound: 'swing', fury: 6,
  },
};

// ---------------------------------------------------------------------------
// SISTEMA DE COMBOS: sequências de entradas com janela de tempo e buffer
// ---------------------------------------------------------------------------
const COMBO_TABLE = { L: 'light1', LL: 'light2', LLL: 'light3', LLH: 'spin', H: 'heavy', LH: 'uppercut', HH: 'slam' };
const COMBO_REQUIRES = { uppercut: 'uppercut', slam: 'slam' }; // técnicas das evoluções
// Técnicas liberadas pela árvore de habilidades
const ALLY_COMBO_SKILLS = { drakos_finisher: 'drakos_queda_tita', drakos_counter: 'drakos_retaliacao', orion_finisher: 'orion_salto_corvo' };
const COMBO_SKILLS = { light3: 'corte_duplo', spin: 'lamina_giratoria', thrust: 'pulso_fantasma', wave: 'corte_vazio', finisher: 'sentenca_eclipse', reverse: 'reves_horizonte' };

const CHARACTER_COMBOS = {
  kael: { L: 'light1', LL: 'light2', LLL: 'light3', LLH: 'spin', LLLH: 'finisher', H: 'heavy', LH: 'uppercut', LHL: 'reverse', HH: 'slam' },
  lyra: { L: 'lyra_light1', LL: 'lyra_light2', LLL: 'lyra_light3', LLH: 'lyra_pierce', H: 'lyra_heavy', LH: 'lyra_pierce', HH: 'lyra_heavy' },
  drakos: { L: 'drakos_light1', LL: 'drakos_light2', LLL: 'drakos_light3', LLH: 'drakos_sweep', LLLH: 'drakos_finisher', H: 'drakos_heavy', LH: 'drakos_sweep', HH: 'drakos_quake' },
  sera: { L: 'sera_light1', LL: 'sera_light2', LLL: 'sera_light3', LLH: 'sera_burst', H: 'sera_heavy', LH: 'sera_lift', HH: 'sera_burst' },
  orion: { L: 'orion_light1', LL: 'orion_light2', LLL: 'orion_light3', LLH: 'orion_flurry', LLLH: 'orion_finisher', H: 'orion_heavy', LH: 'orion_upper', HH: 'orion_cross' },
};

class ComboSystem {
  constructor() {
    this.seq = '';          // cadeia atual (ex.: "LL")
    this.grace = 0;         // tempo restante para continuar a cadeia após um golpe terminar
    this.dashWindow = 0;    // janela após a esquiva para a estocada
    this.buffer = null;     // último input armazenado ('L' ou 'H')
    this.bufferTime = 0;
    this.unlocked = new Set();
  }
  reset() { this.seq = ''; this.grace = 0; this.buffer = null; this.dashWindow = 0; }

  // Armazena um input com carimbo de tempo REAL (funciona mesmo durante o hit stop)
  bufferInput(type) { this.buffer = type; this.bufferTime = performance.now(); }
  hasBuffer(maxAge = 380) { return this.buffer !== null && performance.now() - this.bufferTime <= maxAge; }
  takeBuffer(maxAge = 380) {
    const ok = this.hasBuffer(maxAge), b = this.buffer;
    this.buffer = null;
    return ok ? b : null;
  }
  isUnlocked(id) {
    const charId = (typeof game !== 'undefined' && game.player && game.player.def) ? game.player.def.id : 'kael';
    if (charId !== 'kael') {
      // combos novos dos aliados: liberados pelo nó da árvore (ALLY_COMBO_SKILLS)
      const ak = ALLY_COMBO_SKILLS[id], pr = ak && typeof PartyProgress !== 'undefined' ? PartyProgress.of(charId) : null;
      return !ak || !!(pr && pr.lv(ak) > 0);
    }
    const req = COMBO_REQUIRES[id];
    if (req && !this.unlocked.has(req)) return false;
    const sk = COMBO_SKILLS[id];
    return !sk || !game || !game.progress || game.progress.lv(sk) > 0;
  }

  // Decide qual golpe executar para o input, considerando a cadeia em andamento
  resolve(type) {
    const charId = (typeof game !== 'undefined' && game.player && game.player.def) ? game.player.def.id : 'kael';
    const table = CHARACTER_COMBOS[charId] || COMBO_TABLE;
    if (this.dashWindow > 0) {
      this.dashWindow = 0;
      if (charId === 'lyra') {
        if (type === 'L') { this.seq = 'D'; return 'lyra_backstep'; }
        if (type === 'H') { this.seq = 'D'; return 'lyra_pierce'; }
      } else if (charId === 'orion') {
        if (type === 'L') { this.seq = 'D'; return 'orion_lunge'; }
        if (type === 'H') { this.seq = 'D'; return 'orion_heavy'; }
      } else if (charId === 'drakos') {
        if (type === 'L') { this.seq = 'D'; return 'drakos_sweep'; }
        if (type === 'H') { this.seq = 'D'; return 'drakos_quake'; }
      } else if (charId === 'sera') {
        if (type === 'L') { this.seq = 'D'; return 'sera_burst'; }
        if (type === 'H') { this.seq = 'D'; return 'sera_lift'; }
      } else {
        if (type === 'L' && this.isUnlocked('thrust')) { this.seq = 'D'; return 'thrust'; }
        if (type === 'H' && this.isUnlocked('wave')) { this.seq = 'D'; return 'wave'; }
      }
    }
    const s = this.seq + type;
    const id = table[s];
    if (id && this.isUnlocked(id)) { this.seq = s; return id; }
    // Sem correspondência: recomeça a cadeia a partir deste input
    this.seq = type;
    return table[type] || COMBO_TABLE[type];
  }

  onAttackEnd() { this.grace = 0.4; }

  update(dt, attacking) {
    if (this.dashWindow > 0) this.dashWindow -= dt;
    if (!attacking && this.seq) {
      this.grace -= dt;
      if (this.grace <= 0) this.seq = '';
    }
  }
}

// ---------------------------------------------------------------------------
// CONTADOR DE COMBO (hits seguidos) com multiplicador de pontos
// Zera ao levar dano ou após 3 s sem acertar
// ---------------------------------------------------------------------------
const COMBO_TIERS = [
  { min: 0, mult: 1, label: '' },
  { min: 5, mult: 1.5, label: 'CARGA' },
  { min: 15, mult: 2, label: 'SOBRECARGA' },
  { min: 25, mult: 2.5, label: 'TEMPESTADE' },
  { min: 50, mult: 3, label: 'COLAPSO' },
  { min: 100, mult: 4, label: 'ECLIPSE' },
];

class ComboCounter {
  constructor() { this.duration = 3; this.best = 0; this.reset(true); }
  reset(silent = false) {
    if (!silent && this.count >= 5) this.dropped = { count: this.count, t: 1 };
    this.count = 0; this.timer = 0; this.pop = 0; this.tierIndex = 0;
    if (silent) this.dropped = null;
  }
  addHit() {
    this.count++;
    this.timer = this.duration;
    this.pop = 1;
    if (this.count > this.best) this.best = this.count;
    const ti = this.computeTier();
    if (ti > this.tierIndex) {
      this.tierIndex = ti;
      if (game && game.hud) game.hud.tierUp(COMBO_TIERS[ti].label);
    }
  }
  computeTier() {
    let ti = 0;
    for (let i = 0; i < COMBO_TIERS.length; i++) if (this.count >= COMBO_TIERS[i].min) ti = i;
    return ti;
  }
  get mult() { return COMBO_TIERS[this.computeTier()].mult; }
  get label() { return COMBO_TIERS[this.computeTier()].label; }
  update(dt) {
    if (this.count > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.reset();
    }
    this.pop = Math.max(0, this.pop - dt * 5);
    if (this.dropped) { this.dropped.t -= dt * 0.8; if (this.dropped.t <= 0) this.dropped = null; }
  }
}

// ---------------------------------------------------------------------------
// SISTEMA DE ARMADILHAS (Lyra Kaede - Armadilha de Plasma)
// ---------------------------------------------------------------------------
class TrapSystem {
  constructor() {
    this.items = [];
  }
  spawn(x, y, r = 75, dmg = 80, owner = 'lyra') {
    if (this.items.length >= 4) this.items.shift();
    this.items.push({
      x, y, r, dmg, armTime: 0.45, life: 30, owner, t: 0
    });
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const tr = this.items[i];
      tr.life -= dt;
      tr.t += dt;
      if (tr.life <= 0) { this.items.splice(i, 1); continue; }
      if (tr.armTime > 0) { tr.armTime -= dt; continue; }
      if (!game || !game.enemies) continue;
      for (const e of game.enemies) {
        if (!e.canBeHit()) continue;
        const rr = tr.r + e.radius;
        if (dist2(tr.x, tr.y, e.x, e.y) < rr * rr) {
          this.detonate(tr);
          this.items.splice(i, 1);
          break;
        }
      }
    }
  }
  detonate(tr) {
    const R = tr.r * 1.35;
    const pl = game.player;
    game.particles.ring(tr.x, tr.y, R, '180,80,255', 0.45, 10);
    game.particles.flash(tr.x, tr.y, 20, R * 1.25, '220,130,255', 0.22);
    game.arcs.crackle(tr.x, tr.y, 25, 5, R, '230,160,255', 0.25);
    game.audio.play('zap');
    game.audio.play('stomp');
    game.camera.shake(0.28);
    for (const e of game.enemies) {
      if (!e.canBeHit() || dist2(tr.x, tr.y, e.x, e.y) > R * R) continue;
      const dx = e.x - tr.x, dy = e.y - tr.y, l = Math.hypot(dx, dy) || 1;
      const dmg = Math.max(1, Math.round(tr.dmg * (pl ? pl.stats.power : 1) * (e.vulnerable || 1)));
      if (e.takeHit({ dmg, kx: dx / l, ky: dy / l, kb: 260, launch: 0, stun: 0.65, heavy: true, crit: true, shock: true })) {
        game.onEnemyHit(e, dmg, true, PROJ_HIT_DEF, dx / l, dy / l);
      }
      e.slow = Math.max(e.slow || 0, 3.0);
    }
  }
  draw(ctx) {
    for (const tr of this.items) {
      const sx = isoX(tr.x, tr.y), sy = isoY(tr.x, tr.y);
      const armed = tr.armTime <= 0;
      const pulse = Math.sin(tr.t * (armed ? 9 : 3)) * 0.15 + 0.85;
      ctx.save();
      GlowCache.draw(ctx, armed ? '170,70,255' : '120,60,180', sx, sy, 24 * pulse, armed ? 0.75 : 0.4);
      ctx.strokeStyle = armed ? 'rgba(210,130,255,0.9)' : 'rgba(160,100,220,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 14 * pulse, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + tr.t * 2;
        ctx.moveTo(sx + Math.cos(a) * 6, sy + Math.sin(a) * 6);
        ctx.lineTo(sx + Math.cos(a) * 16 * pulse, sy + Math.sin(a) * 16 * pulse);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}


