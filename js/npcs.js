'use strict';
// ECLIPSE ZERO · NPCs: personagens neutros dos setores (diálogo e reação ao combate)
// ---------------------------------------------------------------------------
// NPCs: sobreviventes Desconectados, a Anciã e a gravação holográfica do projeto
// ZERO. Não lutam nem recebem dano: conversam quando Kael se aproxima ([E]) e se
// encolhem enquanto há combate no setor. Usam os modelos 3D MODELS3D.civil,
// .ancia e .cientista; sem WebGL, um desenho 2D simplificado os substitui.
// ---------------------------------------------------------------------------
const NPC_INFO = {
  civil: { height: 50, light: null },
  ancia: { height: 48, light: '255,180,90' },
  cientista: { height: 54, light: '140,210,255', holo: true },
};
// Cores do desenho 2D por variante de sobrevivente (roupa, detalhe, luz)
const NPC_PAL2D = [
  { coat: '#3a4030', trim: '#252a1f', light: '111,233,255', hood: true },
  { coat: '#4a3a2c', trim: '#2e2620', light: '255,179,90', pack: true },
  { coat: '#33404a', trim: '#1f272e', light: '111,233,255' },
  { coat: '#4a2a33', trim: '#2e1a20', light: '111,233,255', hood: true, small: true },
];

class NPC extends Entity {
  constructor(def, x, y) {
    super(x, y, 12);
    const info = NPC_INFO[def.model] || NPC_INFO.civil;
    this.key = def.model; this.name = def.name; this.variant = def.variant || 0;
    this.lines = def.lines || []; this.after = def.after || null; this.line = 0;
    this.height = info.height * (this.key === 'civil' && this.variant === 3 ? 0.88 : 1);
    this.lightRgb = this.key === 'civil' ? NPC_PAL2D[this.variant % 4].light : info.light;
    this.holo = !!info.holo;
    this.facing = def.facing !== undefined ? def.facing : Math.PI * 0.25;
    this.baseFacing = this.facing;
    this.state = 'idle'; this.stateTime = 0; this.animTime = rand(0, 10);
    this.talkT = 0; this.flash = 0;
  }
  setState(s) { if (this.state !== s) { this.state = s; this.stateTime = 0; } }

  update(dt) {
    this.animTime += dt; this.stateTime += dt;
    if (this.talkT > 0) this.talkT -= dt;
    const p = game.player, fight = game.combatActive();
    if (fight && !this.holo) this.setState('fear');
    else if (this.talkT > 0) this.setState('talk');
    else if (this.holo && Math.sin(this.animTime * 0.9) > 0.985) this.setState('glitch');
    else this.setState('idle');
    // Vira para Kael quando ele se aproxima (fora do combate)
    const d = dist(this.x, this.y, p.x, p.y);
    const target = d < 180 && !fight && p.state !== 'dead' ? Math.atan2(p.y - this.y, p.x - this.x) : this.baseFacing;
    this.facing = angleLerp(this.facing, target, 1 - Math.exp(-4 * dt));
  }

  canTalk() { return this.lines.length > 0 && !game.combatActive(); }
  // Próxima fala (depois que o setor é liberado, usa as falas 'after', se houver)
  talk() {
    const pool = game.waves.state === 'cleared' && this.after ? this.after : this.lines;
    if (!pool.length) return;
    game.hud.say(this.name, pool[this.line % pool.length], 4.4, 0, true);
    this.line++;
    this.talkT = 3.4;
    game.audio.play('uiMove');
  }

  // ------------------------------------------------------------------ desenho
  draw(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
    if (game.use3D && this.spr && this.spr.ok) {
      R3D.blit(ctx, this.spr, sx, sy);
      game.glows3D(ctx, this.key, this, this.spr, sx, sy);
      return;
    }
    this.draw2D(ctx, sx, sy);
  }
  drawEmissive(ctx) {
    if (!game.use3D || !this.spr || !this.spr.ok) return;
    R3D.blitEmissive(ctx, this.spr, isoX(this.x, this.y), isoY(this.x, this.y), 1);
  }
  // Topo da cabeça em coordenadas de tela (para o marcador de conversa)
  headPoint() {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
    const q = game.use3D && this.spr && this.spr.ok && this.spr.anchors.head;
    return q ? { x: sx + q.x, y: sy + q.y } : { x: sx, y: sy - this.height };
  }

  // Versão 2D (sem WebGL): figura encapuzada com as cores da variante
  draw2D(ctx, sx, sy) {
    const t = this.animTime, fear = this.state === 'fear', talk = this.state === 'talk';
    const pal = this.key === 'civil' ? NPC_PAL2D[this.variant % 4]
      : this.key === 'ancia' ? { coat: '#4a3a2c', trim: '#2e2620', hood: false } : { coat: '#9fd8ff', trim: '#dff4ff' };
    const side = worldAngleToScreen(this.facing, this.tmp || (this.tmp = { x: 0, y: 0 })).x >= 0 ? 1 : -1;
    const H = this.height, k = fear ? 0.72 : 1;
    const bob = fear ? Math.sin(t * 30) * 0.6 : Math.sin(t * 2) * 0.6;
    ctx.save();
    ctx.translate(sx, sy);
    if (this.holo) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45 + 0.15 * Math.sin(t * 9) + (this.state === 'glitch' ? -0.25 : 0);
      if (this.state === 'glitch') ctx.translate(Math.sin(t * 60) * 4, 0);
    }
    ctx.scale(side, k);
    const top = -H + bob;
    // Pernas
    ctx.fillStyle = '#121319';
    ctx.fillRect(-5, -14, 4, 14); ctx.fillRect(1, -14, 4, 14);
    // Mochila (comerciante) atrás do corpo
    if (pal.pack) { ctx.fillStyle = '#3a3026'; ctx.fillRect(-13, top + 12, 10, 22); ctx.fillStyle = '#5a4a38'; ctx.fillRect(-14, top + 6, 12, 7); }
    // Corpo (casaco/manto)
    ctx.fillStyle = pal.coat;
    ctx.beginPath();
    ctx.moveTo(-8, top + 12); ctx.lineTo(8, top + 12); ctx.lineTo(10, -10); ctx.lineTo(-10, -10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.trim; ctx.fillRect(-10, -12, 20, 3);
    // Braço que gesticula
    ctx.strokeStyle = pal.coat; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(7, top + 15);
    if (talk) ctx.lineTo(13 + Math.sin(t * 6) * 2, top + 6); else if (fear) ctx.lineTo(4, top + 4); else ctx.lineTo(9, top + 30);
    ctx.stroke();
    // Cajado da Anciã
    if (this.key === 'ancia') {
      ctx.strokeStyle = '#6a6f78'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(12, top - 6); ctx.stroke();
      game.addGlow(ctx, 12, top - 8, 9, '255,180,90', 0.8);
    }
    // Cabeça e capuz / cabelo
    ctx.fillStyle = this.holo ? '#dff4ff' : this.key === 'ancia' ? '#a07860' : '#b08870';
    ctx.beginPath(); ctx.arc(1, top + 5, 5.5, 0, TAU); ctx.fill();
    ctx.fillStyle = this.key === 'ancia' ? '#b9b4ac' : pal.hood ? pal.trim : '#15161b';
    ctx.beginPath(); ctx.arc(0, top + 3, pal.hood ? 7.5 : 6, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    if (pal.hood) ctx.fillRect(-7.5, top + 3, 3, 9);
    ctx.restore();
    if (this.lightRgb && !this.holo) game.addGlow(ctx, sx + side * 3, sy + (top + 18) * k, 6, this.lightRgb, 0.7);
    if (this.holo) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      GlowCache.drawFlat(ctx, '120,200,255', sx, sy, 34, 0.5);
      ctx.restore();
    }
  }
}

// Procura um ponto livre perto de (fx, fy) — frações do tamanho da sala
function npcSpot(room, fx, fy) {
  const cx = fx * room.w, cy = fy * room.h;
  for (let r = 0; r < 160; r += 12) {
    for (let a = 0; a < TAU; a += Math.PI / 6) {
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (room.canStand(x, y, 30)) return { x, y };
      if (r === 0) break;
    }
  }
  return { x: cx, y: cy };
}
