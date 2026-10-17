'use strict';
// ECLIPSE ZERO · HUD: vida, energia, nível, habilidades, combo, objetivo, falas e chefe
// ---------------------------------------------------------------------------
// HUD: vida, energia, memórias, combo, pontuação, falas e barra do chefe
// ---------------------------------------------------------------------------
// Painel com cantos chanfrados (estética de interface tática)
function techPanelPath(ctx, x, y, w, h, c = 10) {
  ctx.beginPath();
  ctx.moveTo(x + c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + c);
  ctx.closePath();
}

// Cor e estilo de cada interlocutor nas legendas
const SPEAKERS = {
  'NEXUS': { color: '#9ff6ff', glow: 'rgba(90,230,255,0.9)', glitch: true },
  'SISTEMA': { color: '#ff5c7a', glow: 'rgba(255,46,85,0.8)' },
  '???': { color: '#a8d8ff', glow: 'rgba(60,140,255,0.9)', whisper: true },
  'KAEL': { color: '#dfe6f2', glow: 'rgba(60,140,255,0.6)' },
  // Aliados, na cor-tema de cada um (pelo rádio: "LYRA · RÁDIO", ver js/radio.js)
  'LYRA': { color: '#A64DFF', glow: 'rgba(166,77,255,0.8)' },
  'DRAKOS': { color: '#FF2E3D', glow: 'rgba(255,46,61,0.8)' },
  'SERA': { color: '#19E6D2', glow: 'rgba(25,230,210,0.8)' },
  'ORION': { color: '#FF8A1F', glow: 'rgba(255,138,31,0.8)' },
};

class HUD {
  constructor() { this.reset(); }
  reset() {
    this.names = [];
    this.msg = null;
    this.sub = null;
    this.mem = null;
    this.whisperIdx = (Math.random() * WHISPERS.length) | 0;
    this.ghostHp = 100; this.ghostDelay = 0;
    this.furyReadyT = 0; this.furyDeny = 0;
    this.tier = null;
    this.displayScore = 0;
    this.bossGhost = 1;
    this.time = 0;
    this.toasts = []; this.lvl = null; this.savedT = 0; this.xpFlash = 0;
    this.abFx = [0, 0, 0, 0]; this.abDeny = [0, 0, 0, 0];
  }
  comboName(text, big = false) {
    this.names.push({ text, t: 0, max: big ? 1.7 : 1.15, big });
    if (this.names.length > 3) this.names.shift();
  }
  message(title, sub = '', dur = 2, small = false, low = false) { this.msg = { title, sub, t: 0, max: dur, small, low }; }
  // Legenda com o nome de quem fala (com atraso opcional)
  // Legenda de fala. 'force': conversa pedida pelo jogador (aparece mesmo com 'Falas durante o jogo' desligado)
  say(who, text, dur = 3.5, delay = 0, force = false) {
    if (!force && !Settings.v.gameSubs) return;
    const rate = Settings.textRate();
    this.sub = { who, text, t: -delay, max: dur * (rate < 1 ? 1.35 : 1) };
  }
  // Algo adormecido dentro de Kael sussurra após o Eclipse Absoluto
  whisper() { this.say('???', WHISPERS[this.whisperIdx++ % WHISPERS.length], 3.2, 0.7); }
  memory(text, idx) { this.mem = { text, idx, t: 0, max: 6 }; }
  tierUp(label) { if (label) this.tier = { label, t: 0 }; }
  furyReady() { this.furyReadyT = 1.4; }
  furyDenied() { this.furyDeny = 0.35; }

  update(dt) {
    const p = game.player;
    this.time += dt;
    for (const n of this.names) n.t += dt;
    this.names = this.names.filter((n) => n.t < n.max);
    if (this.msg) { this.msg.t += dt; if (this.msg.t >= this.msg.max) this.msg = null; }
    if (this.sub) {
      const before = this.sub.t;
      this.sub.t += dt;
      if (before < 0 && this.sub.t >= 0 && this.sub.who === 'NEXUS') game.audio.play('glitch');
      if (this.sub.t >= this.sub.max) this.sub = null;
    }
    if (this.mem) { this.mem.t += dt; if (this.mem.t >= this.mem.max) this.mem = null; }
    if (this.tier) { this.tier.t += dt; if (this.tier.t > 1.2) this.tier = null; }
    if (this.furyReadyT > 0) this.furyReadyT -= dt;
    if (this.furyDeny > 0) this.furyDeny -= dt;
    for (const q of this.toasts) q.t += dt;
    this.toasts = this.toasts.filter((q) => q.t < q.max);
    if (this.lvl) { this.lvl.t += dt; if (this.lvl.t >= this.lvl.max) this.lvl = null; }
    if (this.savedT > 0) this.savedT -= dt;
    if (this.xpFlash > 0) this.xpFlash -= dt;
    for (let k = 0; k < 4; k++) { if (this.abFx[k] > 0) this.abFx[k] -= dt; if (this.abDeny[k] > 0) this.abDeny[k] -= dt; }
    // Barra "fantasma" de vida que drena com atraso
    if (p) {
      if (p.hp < this.ghostHp) { this.ghostDelay += dt; if (this.ghostDelay > 0.45) this.ghostHp = Math.max(p.hp, this.ghostHp - 70 * dt); }
      else { this.ghostHp = p.hp; this.ghostDelay = 0; }
    }
    this.displayScore = lerp(this.displayScore, game.stats.score, 1 - Math.exp(-dt * 8));
    if (Math.abs(this.displayScore - game.stats.score) < 1) this.displayScore = game.stats.score;
    if (game.boss) {
      const r = game.boss.hp / game.boss.maxHp;
      this.bossGhost = r < this.bossGhost ? Math.max(r, this.bossGhost - dt * 0.25) : r;
    }
  }

  draw(ctx) {
    const p = game.player;
    if (!p) return;
    this.drawVitals(ctx, p);
    this.drawObjective(ctx);
    this.drawScore(ctx);
    this.drawCombo(ctx);
    this.drawComboNames(ctx);
    this.drawBossBar(ctx);
    this.drawMessage(ctx);
    this.drawIndicators(ctx);
    this.drawTalkPrompt(ctx);
    this.drawMemory(ctx);
    this.drawAbilities(ctx, p);
    this.drawLevelUp(ctx);
    this.drawSubtitle(ctx);
    this.drawToasts(ctx);
    this.drawSaved(ctx);
  }
  // ------------------------------------------- progressão, habilidades e avisos
  toast(text, rgb = '168,216,255') {
    if (this.toasts.some((q) => q.text === text && q.t < 1)) return;
    this.toasts.push({ text, rgb, t: 0, max: 2.4 });
    if (this.toasts.length > 3) this.toasts.shift();
  }
  xpGain() { this.xpFlash = 0.5; }
  levelUp(level, sp, fresh) { this.lvl = { level, sp, fresh, t: 0, max: 4.2 }; }
  saved() { this.savedT = 2; }
  abilityUsed(k) { this.abFx[k] = 0.35; }
  abilityDenied(k) { this.abDeny[k] = 0.3; }

  objectiveText() {
    const w = game.waves;
    if (w.def.boss) return game.boss ? 'Derrote NEXUS' : 'Alcance o núcleo de NEXUS';
    if (w.state === 'cleared' || w.state === 'exiting') {
      return game.pickups.find('memory') ? 'Recupere o fragmento de memória e siga para a saída ao norte' : 'Siga para a saída ao norte';
    }
    return `Elimine as forças de NEXUS · onda ${Math.max(1, w.waveIndex + 1)} / ${w.def.waves.length}`;
  }

  drawObjective(ctx) {
    const txt = this.objectiveText();
    if (!txt) return;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
    ctx.fillStyle = 'rgba(255,190,90,0.85)';
    ctx.fillText('◆ OBJETIVO', 24, 152);
    ctx.letterSpacing = '0px';
    ctx.font = `13px ${FONT_UI}`;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(txt, 25, 170);
    ctx.fillStyle = '#e8edf6';
    ctx.fillText(txt, 24, 169);
    ctx.restore();
  }

  // Barra de habilidades: 4 atalhos + Eclipse Absoluto, com recarga e custo
  drawAbilities(ctx, p) {
    const pad = game.input.lastDevice === 'pad', P = game.input.padLabels;
    // No controle: segure LB/L1 e aperte X, Y, B ou A (□ △ ○ ✕ no PlayStation)
    const keys = pad ? [P.x, P.y, P.b, P.a].map((b) => `${P.lb}+${b}`) : ['1', '2', '3', '4'];
    const s = 52, gap = 10, es = 60;
    const total = 4 * s + 3 * gap + 18 + es;
    const x0 = Math.round(VIEW_W / 2 - total / 2), y = VIEW_H - 20 - s;
    ctx.save();
    ctx.fillStyle = 'rgba(3,7,16,0.55)';
    techPanelPath(ctx, x0 - 12, y - 16, total + 24, s + 30, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(61,139,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    for (let k = 0; k < 4; k++) this.abilitySlot(ctx, x0 + k * (s + gap), y, s, game.progress.slots[k], keys[k], k, p);
    this.eclipseSlot(ctx, x0 + 4 * (s + gap) + 8, y + s - es, es, pad ? P.lt : 'I', p);
    // Efeitos ativos (tempo restante)
    const b = p.buffs, list = [];
    if (b.overload > 0) list.push(['overload', b.overload, '80,160,255', 'Sobrecarga']);
    if (b.field > 0) list.push(['field', b.field, '120,190,255', 'Campo']);
    if (b.shield > 0) list.push(['hex', b.shield, '80,230,200', `Escudo ${p.shieldHp}`]);
    if (b.sync > 0) list.push(['sync', b.sync, '80,230,200', 'Sincronia']);
    if (p.counterT > 0) list.push(['counter', p.counterT, '220,228,240', 'Contra-ataque']);
    ctx.font = `bold 11px ${FONT_UI}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    list.forEach(([icon, tLeft, rgb, label], i) => {
      const txt = `${label} ${tLeft.toFixed(1)}s`, w = ctx.measureText(txt).width + 30;
      const bx = x0 - 22 - w, by = VIEW_H - 38 - i * 24;
      ctx.fillStyle = 'rgba(3,7,16,0.75)'; ctx.fillRect(bx, by, w, 20);
      ctx.strokeStyle = rgba(rgb, 0.7); ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, 19);
      drawIcon(ctx, icon, bx + 11, by + 10, 15, rgba(rgb, 1));
      ctx.fillStyle = '#e8f0fb'; ctx.fillText(txt, bx + 22, by + 10);
    });
    ctx.restore();
  }

  abilitySlot(ctx, x, y, s, id, key, k, p) {
    const S = id ? SKILLS[id] : null;
    const tree = S ? SKILL_TREES.find((q) => q.id === S.tree) : null;
    const rgb = tree ? tree.rgb : '120,130,150';
    const cd = S ? (p.cds[id] || 0) : 0, total = S ? Math.max(0.01, S.cd * p.stats.cdr) : 1;
    const cost = S ? p.abilityCost(id) : 0, noE = !!S && p.fury < cost;
    const dx = this.abDeny[k] > 0 ? Math.sin(this.abDeny[k] * 70) * 3 : 0;
    ctx.save();
    ctx.translate(dx, 0);
    ctx.fillStyle = 'rgba(5,10,20,0.92)';
    techPanelPath(ctx, x, y, s, s, 8); ctx.fill();
    if (S) {
      const g = ctx.createLinearGradient(0, y, 0, y + s);
      g.addColorStop(0, rgba(rgb, cd > 0 || noE ? 0.08 : 0.24)); g.addColorStop(1, rgba(rgb, 0.03));
      ctx.fillStyle = g; ctx.fill();
      drawIcon(ctx, S.icon, x + s / 2, y + s / 2, s * 0.6, noE || cd > 0 ? 'rgba(140,150,170,0.6)' : rgba(rgb, 1));
      if (cd > 0) {
        ctx.save();
        techPanelPath(ctx, x, y, s, s, 8); ctx.clip();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.moveTo(x + s / 2, y + s / 2);
        ctx.arc(x + s / 2, y + s / 2, s, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(cd / total, 0, 1));
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.font = `bold 17px ${FONT_NUM}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(cd >= 1 ? String(Math.ceil(cd)) : cd.toFixed(1), x + s / 2, y + s / 2 + 1);
      }
      ctx.font = `bold 10px ${FONT_UI}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillStyle = noE ? '#ff5c7a' : '#8fc4ff';
      ctx.fillText(String(cost), x + s - 4, y + 3);
      if (this.abFx[k] > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        GlowCache.draw(ctx, rgb, x + s / 2, y + s / 2, s * 1.1, this.abFx[k] * 2.2);
        ctx.restore();
      }
      ctx.strokeStyle = rgba(rgb, cd > 0 || noE ? 0.35 : 0.9);
    } else {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(120,130,150,0.3)';
    }
    ctx.lineWidth = 1.3;
    techPanelPath(ctx, x, y, s, s, 8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const kw = ctx.measureText(key).width + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(x + 2, y + s - 15, kw, 13);
    ctx.fillStyle = '#dfe6f2'; ctx.fillText(key, x + 6, y + s - 8);
    ctx.restore();
  }

  eclipseSlot(ctx, x, y, s, key, p) {
    const learned = game.progress.lv('eclipse_absoluto') > 0;
    const k = clamp(p.fury / SPECIAL_COST, 0, 1), ready = learned && k >= 1;
    const cx = x + s / 2, cy = y + s / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(5,10,20,0.95)';
    ctx.beginPath(); ctx.arc(cx, cy, s / 2, 0, TAU); ctx.fill();
    if (learned) {
      ctx.strokeStyle = 'rgba(40,90,180,0.6)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, s / 2 - 3, 0, TAU); ctx.stroke();
      ctx.strokeStyle = ready ? '#d6ecff' : '#3d8bff';
      ctx.beginPath(); ctx.arc(cx, cy, s / 2 - 3, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      if (ready) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        GlowCache.draw(ctx, '80,150,255', cx, cy, s * (1.1 + 0.15 * Math.sin(this.time * 8)), 0.6);
        ctx.restore();
      }
      drawIcon(ctx, 'eclipse', cx, cy, s * 0.55, ready ? '#eaf4ff' : 'rgba(140,170,220,0.6)');
    } else {
      ctx.strokeStyle = 'rgba(120,130,150,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, s / 2 - 2, 0, TAU); ctx.stroke();
      drawIcon(ctx, 'lock', cx, cy - 4, s * 0.38, 'rgba(150,160,180,0.6)');
      ctx.font = `bold 9px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(180,190,210,0.7)';
      ctx.fillText(`NV ${SKILLS.eclipse_absoluto.lvl}`, cx, cy + 15);
    }
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const kw = Math.max(18, ctx.measureText(key).width + 8);
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(cx - kw / 2, y + s - 9, kw, 13);
    ctx.fillStyle = ready ? '#ffffff' : '#9aa6b8'; ctx.fillText(key, cx, y + s - 2);
    ctx.restore();
  }

  drawToasts(ctx) {
    if (!this.toasts.length) return;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 14px ${FONT_UI}`;
    this.toasts.forEach((q, i) => {
      const a = clamp(q.t < 0.15 ? q.t / 0.15 : q.t > q.max - 0.4 ? (q.max - q.t) / 0.4 : 1, 0, 1);
      const y = VIEW_H - 104 - (this.toasts.length - 1 - i) * 26;
      const w = ctx.measureText(q.text).width + 28;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(3,7,16,0.82)';
      ctx.fillRect(VIEW_W / 2 - w / 2, y - 11, w, 22);
      ctx.fillStyle = rgba(q.rgb, 1);
      ctx.fillRect(VIEW_W / 2 - w / 2, y - 11, 3, 22);
      ctx.fillText(q.text, VIEW_W / 2, y + 1);
    });
    ctx.restore();
  }

  drawLevelUp(ctx) {
    const L = this.lvl;
    if (!L) return;
    const k = L.t / L.max, PL = PROG.perLevel;
    const a = clamp(k < 0.06 ? k / 0.06 : k > 0.85 ? (1 - k) / 0.15 : 1, 0, 1);
    const x = 14 - (1 - Math.min(1, L.t * 5)) * 40, y = 192, w = 398;
    const fresh = L.fresh.length > 2 ? L.fresh.slice(0, 2).join(', ') + ` e mais ${L.fresh.length - 2}` : L.fresh.join(', ');
    const h = fresh ? 108 : 86;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(16,8,34,0.82)';
    techPanelPath(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(185,150,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, '150,110,255', x + 60, y + 34, 90, 0.35 * (0.6 + 0.4 * Math.sin(this.time * 6)));
    ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '4px'; ctx.fillStyle = '#c8b8ff';
    ctx.fillText('EVOLUÇÃO', x + 16, y + 18);
    ctx.font = `bold 28px ${FONT_TITLE}`;
    glowText(ctx, `NÍVEL ${L.level}`, x + 16, y + 44, '#f4f0ff', 'rgba(150,110,255,0.95)', 16);
    ctx.letterSpacing = '0px';
    ctx.font = `bold 13px ${FONT_UI}`;
    glowText(ctx, `+${L.sp} ponto${L.sp > 1 ? 's' : ''} · [Tab] árvore`, x + 196, y + 44, '#ffe7a8', 'rgba(255,180,60,0.7)', 8);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = '#d9d2f5';
    ctx.fillText(`+${PL.hp} vida · +${PL.energy} energia · +${Math.round(PL.dmg * 100)}% dano · +${Math.round(PL.power * 100)}% poder`, x + 16, y + 70);
    if (fresh) {
      ctx.font = `italic 12px ${FONT_UI}`; ctx.fillStyle = '#a8d8ff';
      ctx.fillText(`Disponível: ${fresh}`, x + 16, y + 92);
    }
    ctx.restore();
  }

  drawSaved(ctx) {
    if (this.savedT <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(this.savedT, 0, 1) * 0.85;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
    ctx.fillStyle = '#a8d8ff';
    const r = (this.time * 3) % TAU, tw = ctx.measureText('PROGRESSO SALVO').width;
    ctx.save(); ctx.translate(VIEW_W - 34 - tw, VIEW_H - 24); ctx.rotate(r);
    ctx.strokeStyle = '#a8d8ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU * 0.75); ctx.stroke();
    ctx.restore();
    ctx.fillText('PROGRESSO SALVO', VIEW_W - 22, VIEW_H - 24);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }


  bar(ctx, x, y, w, h, frac, ghost, fill, back = 'rgba(3,6,14,0.85)') {
    ctx.fillStyle = back;
    ctx.fillRect(x, y, w, h);
    if (ghost > frac) { ctx.fillStyle = 'rgba(220,235,255,0.7)'; ctx.fillRect(x, y, w * clamp(ghost, 0, 1), h); }
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, w * clamp(frac, 0, 1), h * 0.4);
    // Divisões de segmentos
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let k = 1; k < 10; k++) ctx.fillRect(x + (w * k) / 10, y, 1, h);
  }

  drawVitals(ctx, p) {
    const x = 24, y = 30, w = 300, pr = game.progress;
    ctx.save();
    ctx.fillStyle = 'rgba(3,7,16,0.62)';
    techPanelPath(ctx, x - 10, y - 20, w + 98, 136, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(61,139,255,0.45)'; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(168,216,255,0.75)';
    ctx.letterSpacing = '2px';
    ctx.fillText(`${p.def.name} · ${p.def.title}`.toUpperCase(), x, y - 9);
    ctx.letterSpacing = '0px';
    // Vida
    const low = p.hp / p.maxHp < 0.3;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#5a0a1e'); g.addColorStop(1, low ? `rgba(255,${(40 + 50 * Math.sin(this.time * 10)) | 0},90,1)` : '#ff2e55');
    this.bar(ctx, x, y, w, 18, p.hp / p.maxHp, this.ghostHp / p.maxHp, g);
    if (p.shieldHp > 0) {   // Escudo de Energia sobre a barra de vida
      ctx.fillStyle = 'rgba(90,240,210,0.55)';
      ctx.fillRect(x, y, w * clamp(p.shieldHp / Math.max(1, p.shieldMax), 0, 1), 5);
    }
    ctx.strokeStyle = 'rgba(255,92,122,0.8)'; ctx.lineWidth = 1.2;
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, 19);
    ctx.font = `bold 13px ${FONT_UI}`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, x + 8, y + 10);
    ctx.fillStyle = '#ff8aa0';
    ctx.font = `bold 12px ${FONT_TITLE}`;
    ctx.fillText('VIDA', x + w + 10, y + 10);
    // Energia da Tempestade Nula (habilidades; o Eclipse exige 100)
    const fy = y + 28, fw = 240;
    const full = p.canEclipse();
    const shake = this.furyDeny > 0 ? Math.sin(this.furyDeny * 80) * 4 : 0;
    const fg = ctx.createLinearGradient(x, 0, x + fw, 0);
    fg.addColorStop(0, '#0c2a66'); fg.addColorStop(1, full ? '#d6ecff' : '#3d8bff');
    if (full) { ctx.shadowColor = 'rgba(80,160,255,0.95)'; ctx.shadowBlur = 12 + 8 * Math.sin(this.time * 8); }
    this.bar(ctx, x + shake, fy, fw, 11, p.fury / p.maxEnergy, 0, fg);
    ctx.shadowBlur = 0;
    if (pr.lv('eclipse_absoluto') && p.maxEnergy > SPECIAL_COST) {
      const mx = x + shake + fw * (SPECIAL_COST / p.maxEnergy);
      ctx.fillStyle = 'rgba(230,240,255,0.85)'; ctx.fillRect(mx - 1, fy - 3, 2, 17);
    }
    ctx.strokeStyle = full ? PAL.accentHi : 'rgba(61,139,255,0.75)';
    ctx.strokeRect(x + shake - 0.5, fy - 0.5, fw + 1, 12);
    ctx.fillStyle = full ? PAL.accentHi : PAL.accent;
    ctx.font = `bold 12px ${FONT_TITLE}`;
    ctx.fillText(full ? (Math.floor(this.time * 3) % 2 ? '[I] ECLIPSE!' : 'ECLIPSE PRONTO') : `ENERGIA ${Math.floor(p.fury)}`, x + fw + 10 + shake, fy + 6);
    // Esquiva: uma barra por carga
    const dy = fy + 20, n = p.stats.dashCharges, dw = Math.min(90, (90 - (n - 1) * 4) / n);
    for (let k = 0; k < n; k++) {
      const f = clamp(p.dashStock - k, 0, 1);
      this.bar(ctx, x + k * (dw + 4), dy, dw, 5, f, 0, f >= 1 ? '#d6dde8' : '#5a6474');
    }
    ctx.fillStyle = 'rgba(214,221,232,0.75)'; ctx.font = `11px ${FONT_UI}`;
    ctx.fillText(n > 1 ? `ESQUIVA ×${Math.floor(p.dashStock)}` : 'ESQUIVA', x + 98, dy + 3);
    // Fragmentos de memória recuperados
    const my = dy + 20;
    ctx.fillStyle = 'rgba(168,216,255,0.75)'; ctx.font = `bold 10px ${FONT_TITLE}`;
    ctx.letterSpacing = '1px';
    ctx.fillText('MEMÓRIAS', x, my);
    ctx.letterSpacing = '0px';
    for (let k = 0; k < MEMORIES.length; k++) {
      const cx = x + 82 + k * 18, has = k < game.stats.memories;
      ctx.beginPath(); ctx.moveTo(cx, my - 6); ctx.lineTo(cx + 5, my); ctx.lineTo(cx, my + 6); ctx.lineTo(cx - 5, my); ctx.closePath();
      if (has) {
        ctx.fillStyle = PAL.accentHi; ctx.fill();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; GlowCache.draw(ctx, '90,170,255', cx, my, 12, 0.6); ctx.restore();
      } else { ctx.strokeStyle = 'rgba(168,216,255,0.35)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    // Nível, experiência e pontos de habilidade
    const ly = my + 22, xk = pr.level >= PROG.maxLevel ? 1 : pr.xp / pr.xpNext;
    ctx.font = `bold 13px ${FONT_TITLE}`; ctx.fillStyle = '#d3c6ff';
    ctx.fillText(`NV ${pr.level}`, x, ly);
    const bx = x + 46, bw = 180;
    ctx.fillStyle = 'rgba(3,6,14,0.85)'; ctx.fillRect(bx, ly - 3, bw, 6);
    ctx.fillStyle = this.xpFlash > 0 ? '#e6dcff' : '#9b7dff'; ctx.fillRect(bx, ly - 3, bw * xk, 6);
    ctx.strokeStyle = 'rgba(185,168,255,0.5)'; ctx.strokeRect(bx - 0.5, ly - 3.5, bw + 1, 7);
    ctx.font = `10px ${FONT_UI}`; ctx.fillStyle = 'rgba(214,210,240,0.75)';
    ctx.fillText(pr.level >= PROG.maxLevel ? 'MÁX' : `${pr.xp}/${pr.xpNext} XP`, bx + bw + 8, ly);
    if (pr.sp > 0) {
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(this.time * 5);
      ctx.font = `bold 11px ${FONT_TITLE}`; ctx.fillStyle = '#ffd47a';
      ctx.fillText(`◆ ${pr.sp} [TAB]`, x + w + 10, ly);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawScore(ctx) {
    ctx.save();
    const x = VIEW_W - 24;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(61,139,255,0.85)';
    ctx.font = `bold 12px ${FONT_TITLE}`;
    ctx.letterSpacing = '2px';
    ctx.fillText('PONTUAÇÃO', x, 16);
    ctx.letterSpacing = '0px';
    ctx.font = `30px ${FONT_NUM}`;
    glowText(ctx, Math.round(this.displayScore).toLocaleString('pt-BR'), x, 30, '#eef5ff', 'rgba(60,140,255,0.7)', 10);
    // Células de energia
    ctx.font = `bold 16px ${FONT_UI}`;
    ctx.fillStyle = '#cfe6ff';
    ctx.fillText(`${game.stats.soulsBank}`, x, 68);
    const tw = ctx.measureText(`${game.stats.soulsBank}`).width;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, '70,150,255', x - tw - 14, 77, 12, 0.9);
    ctx.restore();
    ctx.fillStyle = '#eaf4ff';
    const dx = x - tw - 14;
    ctx.beginPath(); ctx.moveTo(dx, 71); ctx.lineTo(dx + 3, 77); ctx.lineTo(dx, 83); ctx.lineTo(dx - 3, 77); ctx.closePath(); ctx.fill();
    // Setor e onda
    const w = game.waves;
    ctx.font = `bold 12px ${FONT_TITLE}`;
    ctx.fillStyle = 'rgba(223,230,242,0.7)';
    const roomTxt = w.def.boss ? 'NÚCLEO DE NEXUS' : `SETOR ${w.roomIndex + 1} / 5`;
    const waveTxt = w.def.boss ? '' : ` · ONDA ${Math.max(1, w.waveIndex + 1)} / ${w.def.waves.length}`;
    ctx.fillText(roomTxt + waveTxt, x, 92);
    ctx.restore();
  }

  drawCombo(ctx) {
    const c = game.counter;
    const show = c.count >= 2;
    ctx.save();
    const x = VIEW_W - 40, y = 236;
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    if (show) {
      const pop = 1 + c.pop * 0.35;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pop, pop);
      ctx.rotate(-0.06);
      ctx.font = `64px ${FONT_NUM}`;
      const hue = c.count >= 50 ? '#d6ecff' : c.count >= 15 ? PAL.accentHi : '#ffffff';
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(2,6,16,0.9)';
      ctx.strokeText(String(c.count), 0, 0);
      glowText(ctx, String(c.count), 0, 0, hue, 'rgba(60,140,255,0.8)', 16);
      ctx.restore();
      ctx.font = `bold 16px ${FONT_TITLE}`;
      ctx.fillStyle = PAL.text;
      ctx.fillText('HITS', x, y + 22);
      ctx.font = `22px ${FONT_NUM}`;
      ctx.fillStyle = PAL.accent;
      ctx.fillText(`x${c.mult.toFixed(1)}`, x - 52, y + 24);
      if (c.label) {
        ctx.font = `italic bold 20px ${FONT_TITLE}`;
        glowText(ctx, c.label, x, y + 50, '#9fd0ff', 'rgba(40,120,255,0.9)', 12);
      }
      // Tempo restante do combo
      const bw = 150, k = c.timer / c.duration;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw, y + 60, bw, 4);
      ctx.fillStyle = k < 0.3 ? '#ff2e55' : PAL.accent; ctx.fillRect(x - bw, y + 60, bw * k, 4);
    } else if (c.dropped) {
      ctx.globalAlpha = c.dropped.t;
      ctx.font = `40px ${FONT_NUM}`;
      ctx.fillStyle = '#5d6676';
      ctx.fillText(String(c.dropped.count), x, y);
      ctx.font = `bold 13px ${FONT_TITLE}`;
      ctx.fillText('COMBO PERDIDO', x, y + 20);
    }
    if (this.tier) {
      const k = this.tier.t / 1.2;
      ctx.globalAlpha = 1 - k;
      ctx.font = `italic bold ${Math.round(26 + 10 * (1 - k))}px ${FONT_TITLE}`;
      glowText(ctx, this.tier.label + '!', x, y - 66 - k * 14, '#eaf4ff', 'rgba(60,140,255,0.95)', 18);
    }
    ctx.restore();
  }

  drawComboNames(ctx) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let y = game.boss ? 150 : 120;
    for (const n of this.names) {
      const k = n.t / n.max;
      const sIn = Math.min(1, n.t / 0.14);
      const scale = (n.big ? 1.3 : 1) * (0.6 + 0.4 * easeOutBack(sIn));
      const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(VIEW_W / 2, y - k * 12);
      ctx.scale(scale, scale);
      ctx.font = `bold italic 30px ${FONT_TITLE}`;
      ctx.letterSpacing = '3px';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(2,6,16,0.85)';
      ctx.strokeText(n.text, 0, 0);
      const g = ctx.createLinearGradient(0, -16, 0, 16);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, PAL.accentHi); g.addColorStop(1, '#3d8bff');
      glowText(ctx, n.text, 0, 0, g, 'rgba(40,120,255,0.95)', 16);
      // Linhas decorativas
      const w = ctx.measureText(n.text).width / 2 + 14;
      ctx.letterSpacing = '0px';
      ctx.strokeStyle = 'rgba(61,139,255,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-w - 40 * sIn, 0); ctx.lineTo(-w, 0); ctx.moveTo(w, 0); ctx.lineTo(w + 40 * sIn, 0); ctx.stroke();
      ctx.restore();
      y += 44;
    }
    ctx.restore();
  }

  drawBossBar(ctx) {
    const b = game.boss;
    if (!b || (!b.alive && b.state !== 'dying')) return;
    // Centralizada no espaço livre entre o painel de vida e a pontuação
    const x0 = 430, x1 = VIEW_W - 210;
    const w = Math.min(600, x1 - x0 - 20), x = (x0 + x1) / 2 - w / 2, y = 34, cx = x + w / 2;
    const intro = b.state === 'intro' ? clamp(b.stateTime / 2.5, 0, 1) : 1;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.font = `bold ${w < 420 ? 13 : 16}px ${FONT_TITLE}`;
    ctx.letterSpacing = '2px';
    glowText(ctx, b.name, cx, y - 6, '#e6fbff', 'rgba(90,230,255,0.85)', 10);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = 'rgba(2,8,14,0.85)';
    ctx.fillRect(x - 4, y - 2, w + 8, 20);
    const frac = (b.hp / b.maxHp) * intro;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#08303c'); g.addColorStop(1, b.phase === 3 ? '#ff2e55' : '#5ff0ff');
    this.bar(ctx, x, y, w, 16, frac, this.bossGhost * intro, g);
    // Marcadores das fases
    ctx.fillStyle = PAL.accentHi;
    for (const m of [0.66, 0.33]) ctx.fillRect(x + w * m - 1, y - 3, 2, 22);
    ctx.strokeStyle = 'rgba(120,235,255,0.8)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, 17);
    // Estabilidade (poise): quando zera, NEXUS fica instável
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y + 21, w, 4);
    ctx.fillStyle = b.state === 'stagger' ? '#ffffff' : 'rgba(170,240,255,0.85)';
    ctx.fillRect(x, y + 21, w * (b.state === 'stagger' ? 1 - b.stateTime / 1.8 : b.poise / b.maxPoise), 4);
    ctx.textBaseline = 'top'; ctx.font = `bold 12px ${FONT_TITLE}`; ctx.fillStyle = 'rgba(223,230,242,0.8)';
    ctx.fillText(`FASE ${['I', 'II', 'III'][b.phase - 1]}`, cx, y + 28);
    ctx.restore();
  }

  drawMessage(ctx) {
    const m = this.msg;
    if (!m) return;
    const k = m.t / m.max;
    const a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = VIEW_H * (m.low ? 0.72 : 0.3);   // letreiros do chefe ficam abaixo da ação
    if (m.small) {
      ctx.font = `bold 30px ${FONT_TITLE}`;
      ctx.letterSpacing = '4px';
      glowText(ctx, m.title, VIEW_W / 2, y + 20, '#eaf3ff', 'rgba(60,140,255,0.85)', 14);
    } else {
      if (m.sub) {
        ctx.font = `bold 14px ${FONT_TITLE}`;
        ctx.letterSpacing = '3px';
        ctx.fillStyle = PAL.accent;
        ctx.fillText(m.sub, VIEW_W / 2, y - 34);
      }
      ctx.font = `bold 42px ${FONT_TITLE}`;
      ctx.letterSpacing = '5px';
      glowText(ctx, m.title, VIEW_W / 2, y + 6, '#eef5ff', 'rgba(40,120,255,0.95)', 22);
      const w = Math.min(VIEW_W * 0.4, ctx.measureText(m.title).width / 2 + 40);
      ctx.strokeStyle = 'rgba(61,139,255,0.75)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(VIEW_W / 2 - w, y + 36); ctx.lineTo(VIEW_W / 2 + w, y + 36); ctx.stroke();
    }
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // Legenda de diálogo na parte de baixo da tela (texto digitado aos poucos)
  drawSubtitle(ctx) {
    const s = this.sub;
    if (!s || s.t < 0) return;
    const st = SPEAKERS[s.who] || { color: PAL.accentHi, glow: 'rgba(60,140,255,0.7)' };
    const k = s.t / s.max;
    const a = clamp(k < 0.08 ? k / 0.08 : k > 0.85 ? (1 - k) / 0.15 : 1, 0, 1);
    const shown = s.text.slice(0, Math.floor(s.t * 48 * Settings.textRate()));
    const fs = Settings.v.subtitleSize ? 21 : 17;
    ctx.save();
    ctx.globalAlpha = a * (st.whisper ? 0.65 + 0.35 * Math.sin(this.time * 9) : 1);
    ctx.font = `${st.whisper ? 'italic ' : ''}${fs}px ${FONT_UI}`;
    const lines = wrapText(ctx, s.text, Math.min(760, VIEW_W - 120));
    const lh = Math.round(fs * 1.35), bw = Math.min(800, VIEW_W - 80), bh = 42 + lines.length * lh;
    const bx = VIEW_W / 2 - bw / 2, by = VIEW_H - 138 - bh;
    if (!st.whisper) {
      ctx.fillStyle = 'rgba(2,6,14,0.72)';
      techPanelPath(ctx, bx, by, bw, bh, 12); ctx.fill();
      ctx.strokeStyle = st.glow; ctx.lineWidth = 1; ctx.stroke();
    }
    const jx = st.glitch && Math.random() < 0.08 ? rand(-4, 4) : 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = `bold 12px ${FONT_TITLE}`;
    ctx.letterSpacing = '3px';
    ctx.fillStyle = st.color;
    ctx.fillText(s.who, VIEW_W / 2 + jx, by + 10);
    ctx.letterSpacing = '0px';
    ctx.font = `${st.whisper ? 'italic ' : ''}${fs}px ${FONT_UI}`;
    // Distribui o texto já digitado pelas linhas
    let left = shown.length;
    lines.forEach((ln, i) => {
      const part = ln.slice(0, Math.max(0, left));
      left -= ln.length + 1;
      glowText(ctx, part, VIEW_W / 2 + jx, by + 30 + i * lh, st.whisper ? '#cfe6ff' : '#eef3fa', st.glow, st.whisper ? 14 : 6);
    });
    ctx.restore();
  }

  // Fragmento de memória: lembrança que invade a tela por alguns segundos
  drawMemory(ctx) {
    const m = this.mem;
    if (!m) return;
    const k = m.t / m.max;
    const a = clamp(k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    const y = VIEW_H * 0.2;
    const g = ctx.createLinearGradient(0, y - 60, 0, y + 90);
    g.addColorStop(0, 'rgba(10,30,70,0)'); g.addColorStop(0.5, 'rgba(10,30,70,0.55)'); g.addColorStop(1, 'rgba(10,30,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 60, VIEW_W, 150);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 13px ${FONT_TITLE}`;
    ctx.letterSpacing = '4px';
    ctx.fillStyle = PAL.accent;
    ctx.fillText(`FRAGMENTO DE MEMÓRIA ${m.idx} / ${MEMORIES.length}`, VIEW_W / 2, y - 30);
    ctx.letterSpacing = '0px';
    ctx.font = `italic 21px ${FONT_UI}`;
    const lines = wrapText(ctx, m.text, Math.min(820, VIEW_W - 120));
    lines.forEach((ln, i) => glowText(ctx, ln, VIEW_W / 2 + (Math.random() < 0.03 ? rand(-3, 3) : 0), y + 4 + i * 28, '#eaf4ff', 'rgba(80,160,255,0.95)', 14));
    ctx.restore();
  }

  // Marcador de conversa acima do NPC mais próximo
  drawTalkPrompt(ctx) {
    const n = game.talkTarget;
    if (!n) return;
    const h = n.headPoint(), q = game.camera.toScreen(h.x, h.y - 16);
    const key = game.input.lastDevice === 'pad' ? game.input.padLabels.x : 'E';
    ctx.save();
    ctx.font = `bold 12px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = `Falar · ${n.name}`, w = ctx.measureText(txt).width + 40, bob = Math.sin(this.time * 4) * 2;
    ctx.fillStyle = 'rgba(3,7,16,0.82)';
    techPanelPath(ctx, q.x - w / 2, q.y - 12 + bob, w, 24, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,212,122,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ffd47a'; ctx.fillRect(q.x - w / 2 + 6, q.y - 7 + bob, 16, 14);
    ctx.fillStyle = '#1a1200'; ctx.fillText(key, q.x - w / 2 + 14, q.y + 1 + bob);
    ctx.fillStyle = '#eef3fa'; ctx.fillText(txt, q.x + 10, q.y + 1 + bob);
    ctx.restore();
  }

  // Indicadores de inimigos fora da tela, da saída e do fragmento de memória
  drawIndicators(ctx) {
    const cam = game.camera, m = 26;
    ctx.save();
    const arrow = (sx, sy, rgb, size) => {
      const cx = VIEW_W / 2, cy = VIEW_H / 2;
      const dx = sx - cx, dy = sy - cy;
      const s = Math.min((VIEW_W / 2 - m) / Math.abs(dx || 1e-6), (VIEW_H / 2 - m) / Math.abs(dy || 1e-6));
      const ex = cx + dx * s, ey = cy + dy * s, a = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(ex, ey); ctx.rotate(a);
      ctx.fillStyle = rgba(rgb, 0.85);
      ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * 0.7, -size * 0.7); ctx.lineTo(-size * 0.7, size * 0.7); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    const marker = (p, rgb, label) => {
      if (p.x < 0 || p.x > VIEW_W || p.y < 0 || p.y > VIEW_H) { arrow(p.x, p.y, rgb, 14); return; }
      const bob = Math.sin(this.time * 5) * 6;
      ctx.fillStyle = rgba(rgb, 1);
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 40 + bob); ctx.lineTo(p.x - 10, p.y - 56 + bob); ctx.lineTo(p.x + 10, p.y - 56 + bob); ctx.closePath(); ctx.fill();
      ctx.font = `bold 13px ${FONT_TITLE}`; ctx.textAlign = 'center';
      ctx.letterSpacing = '2px';
      ctx.fillText(label, p.x, p.y - 64 + bob);
      ctx.letterSpacing = '0px';
    };
    for (const e of game.enemies) {
      if (!e.alive || e.state === 'dying') continue;
      const p = cam.toScreen(isoX(e.x, e.y), isoY(e.x, e.y) - 20);
      if (p.x < 0 || p.x > VIEW_W || p.y < 0 || p.y > VIEW_H) arrow(p.x, p.y, e.isBoss ? '90,230,255' : '255,46,85', e.isBoss ? 14 : 8);
    }
    const mem = game.pickups.find('memory');
    if (mem) {
      const p = cam.toScreen(isoX(mem.x, mem.y), isoY(mem.x, mem.y) - 30);
      marker({ x: p.x, y: p.y }, '170,215,255', 'MEMÓRIA');
    }
    if (game.waves.state === 'cleared') {
      const d = game.room.door;
      const p = cam.toScreen(isoX(d.x, 0), isoY(d.x, 0) - 60);
      marker({ x: p.x, y: p.y }, '110,190,255', 'SAÍDA');
    }
    ctx.restore();
  }
}

