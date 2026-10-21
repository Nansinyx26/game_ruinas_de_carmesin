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
};

// ---------------------------------------------------------------------------
// SISTEMA DE COMBOS: sequências de entradas com janela de tempo e buffer
// ---------------------------------------------------------------------------
const COMBO_TABLE = { L: 'light1', LL: 'light2', LLL: 'light3', LLH: 'spin', H: 'heavy', LH: 'uppercut', HH: 'slam' };
const COMBO_REQUIRES = { uppercut: 'uppercut', slam: 'slam' }; // técnicas das evoluções
// Técnicas liberadas pela árvore de habilidades
const COMBO_SKILLS = { light3: 'corte_duplo', spin: 'lamina_giratoria', thrust: 'pulso_fantasma', wave: 'corte_vazio' };

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
    const req = COMBO_REQUIRES[id];
    if (req && !this.unlocked.has(req)) return false;
    const sk = COMBO_SKILLS[id];
    return !sk || !game || !game.progress || game.progress.lv(sk) > 0;
  }

  // Decide qual golpe executar para o input, considerando a cadeia em andamento
  resolve(type) {
    if (this.dashWindow > 0) {
      this.dashWindow = 0;
      if (type === 'L' && this.isUnlocked('thrust')) { this.seq = 'D'; return 'thrust'; }
      if (type === 'H' && this.isUnlocked('wave')) { this.seq = 'D'; return 'wave'; }
    }
    const s = this.seq + type;
    const id = COMBO_TABLE[s];
    if (id && this.isUnlocked(id)) { this.seq = s; return id; }
    // Sem correspondência: recomeça a cadeia a partir deste input
    this.seq = type;
    return COMBO_TABLE[type];
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

