'use strict';
// ECLIPSE ZERO · HUD: retrato, vida, energia, radar, missão, habilidades, combo, falas e chefe
// ---------------------------------------------------------------------------
// HUD no estilo do quadro "HUD EM JOGO" da folha de referência:
//   superior esquerdo  retrato circular do personagem ativo, VIDA e ENERGIA anguladas,
//                      esquiva, memórias, pontos de habilidade [TAB], nível e experiência
//   superior direito   radar (N/L/S/O, inimigos, chefe, saída, memória e NPCs),
//                      pontuação e painel de missão (setor + objetivo atual)
//   inferior direito   habilidades em losangos com as teclas (ou os botões do controle,
//                      segurando LB/L1), o Eclipse Absoluto em destaque e os efeitos ativos
// Tudo do personagem ativo: nível, XP, atalhos e suprema vêm do progresso e do kit dele
// (heroProgressOf / heroUltInfo em js/heroes/kit.js); com o Kael o HUD é o de sempre.
//   inferior esquerdo  células de energia
// No meio ficam os avisos temporários: combo, nomes das técnicas, letreiros, memórias,
// evolução de nível, legendas e avisos curtos, que se encaixam no espaço livre entre os
// painéis (HUD.freeSpan). Molduras, retrato, mapa do setor e o preenchimento das barras
// são pré-renderizados (HUD.layer) e só são refeitos quando a escala da tela muda.
// Se um letreiro ou uma memória cobre um painel fixo, o painel fica translúcido
// enquanto o aviso estiver na tela (HUD.panelAlpha).
// ---------------------------------------------------------------------------
// Painel com cantos chanfrados (estética de interface tática)
function techPanelPath(ctx, x, y, w, h, c = 10) {
  ctx.beginPath();
  ctx.moveTo(x + c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + c);
  ctx.closePath();
}
// Losango (quadrado girado 45°) de centro (x, y) e meia-diagonal d
function diamondPath(ctx, x, y, d) {
  ctx.beginPath();
  ctx.moveTo(x, y - d); ctx.lineTo(x + d, y); ctx.lineTo(x, y + d); ctx.lineTo(x - d, y);
  ctx.closePath();
}
// Barra angulada da referência: ponta em seta ('arrow') ou corte diagonal ('slant')
function slantBarPath(ctx, x, y, w, h, tip, kind) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  if (kind === 'arrow') { ctx.lineTo(x + w - tip, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w - tip, y + h); }
  else { ctx.lineTo(x + w, y); ctx.lineTo(x + w - tip, y + h); }
  ctx.lineTo(x, y + h);
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
const SPEAKER_DEFAULT = { color: PAL.accentHi, glow: 'rgba(60,140,255,0.7)' };

// Bloco de vida/energia (canto superior esquerdo): retrato (px, py, pr) e barras a partir de x
const HUDV = { px: 60, py: 64, pr: 40, x: 112, tab: 64, hpY: 28, hpH: 20, hpW: 304, hpTip: 12, enY: 54, enH: 13, enW: 236, enTip: 8, right: 446, bottom: 124 };
// Pontos cardeais no radar. O radar é a vista de cima do setor girada 45° para
// acompanhar a câmera isométrica (para cima na tela = para cima no radar), então o
// norte do mundo (-y, onde fica a saída) aparece na diagonal superior direita.
// Cores do losango da suprema: as do Eclipse Absoluto (Kael) e as geradas da cor-tema de outro personagem
const ECLIPSE_PAL = { lo: 'rgba(20,60,170,0.95)', hi: 'rgba(90,170,255,0.9)', glow: 'rgba(120,190,255,1)', edge: '#e6f3ff', inner: 'rgba(200,230,255,0.7)',
  base: 'rgba(61,139,255,0.75)', base2: 'rgba(61,139,255,0.25)', dot: 'rgba(120,180,255,0.8)' };
function ultPalette(rgb) {
  const [r, g, b] = rgb.split(',').map(Number), dk = `${Math.round(r * 0.3)},${Math.round(g * 0.3)},${Math.round(b * 0.55)}`;
  const lt = `${Math.round(r + (255 - r) * 0.45)},${Math.round(g + (255 - g) * 0.45)},${Math.round(b + (255 - b) * 0.45)}`;
  return { lo: rgba(dk, 0.95), hi: rgba(rgb, 0.9), glow: rgba(lt, 1), edge: rgba(`${Math.round(r + (255 - r) * 0.85)},${Math.round(g + (255 - g) * 0.85)},${Math.round(b + (255 - b) * 0.85)}`, 1),
    inner: rgba(lt, 0.7), base: rgba(rgb, 0.75), base2: rgba(rgb, 0.25), dot: rgba(lt, 0.8) };
}
const RADAR_DIRS = [['N', -Math.PI / 4], ['L', Math.PI / 4], ['S', Math.PI * 3 / 4], ['O', -Math.PI * 3 / 4]];

class HUD {
  constructor() {
    this.cache = new Map();          // camadas pré-renderizadas (HUD.layer)
    this.zones = []; this.zoneN = 0; // áreas ocupadas pelos painéis fixos neste quadro
    this.temp = []; this.tempN = 0;  // áreas dos letreiros e memórias neste quadro
    this.dimK = {};                  // quanto cada painel fixo está atenuado (0–1)
    this.span = { min: 0, max: 0 };
    this.rp = { x: 0, y: 0, out: false, a: 0 };   // posição de um ponto no radar
    this.rad = { cx: 0, cy: 0, r: 0, s: 1, px: 0, py: 0 };
    this.wraps = new Map();          // quebras de linha já calculadas (objetivo, memórias)
    this.buffs = [];
    this.reset();
  }
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
    this.hurtT = 0; this.lastHp = -1; this.cellFlash = 0; this.lastCells = -1;
    this.objText = ''; this.objFlash = 0;
    this.lastDraw = 0; this.frameDt = 0;
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
      // voz sintetizada (opcional, js/voz.js): quando a legenda aparece, se não houver dublagem tocando
      if (!this.sub.voz && this.sub.t >= 0) { this.sub.voz = true; VozSintetica.falar(this.sub.who, this.sub.text); }
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
    if (this.objFlash > 0) this.objFlash -= dt;
    for (let k = 0; k < 4; k++) { if (this.abFx[k] > 0) this.abFx[k] -= dt; if (this.abDeny[k] > 0) this.abDeny[k] -= dt; }
    // Barra "fantasma" de vida que drena com atraso; o retrato pisca ao sofrer dano
    if (p) {
      if (p.hp < this.ghostHp) { this.ghostDelay += dt; if (this.ghostDelay > 0.45) this.ghostHp = Math.max(p.hp, this.ghostHp - 70 * dt); }
      else { this.ghostHp = p.hp; this.ghostDelay = 0; }
      if (this.lastHp >= 0 && p.hp < this.lastHp - 0.5) this.hurtT = 0.4;
      this.lastHp = p.hp;
    }
    if (this.hurtT > 0) this.hurtT -= dt;
    // Células de energia: o item acende quando o estoque aumenta
    const cells = game.stats.soulsBank;
    if (this.lastCells >= 0 && cells > this.lastCells) this.cellFlash = 0.45;
    this.lastCells = cells;
    if (this.cellFlash > 0) this.cellFlash -= dt;
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
    this.frameDt = clamp(this.time - this.lastDraw, 0, 0.1); this.lastDraw = this.time;
    const L = this.layout(ctx, p);
    // Marcadores no mundo ficam por baixo dos painéis
    this.drawIndicators(ctx);
    // Painéis fixos
    this.drawVitals(ctx, p);
    if (game.world && World.zone) Clima.desenharHud(ctx, HUDV.x, HUDV.bottom + 2);   // temperatura do corpo, roupa molhada
    this.drawRadar(ctx, p, L);
    this.drawScore(ctx, L);
    this.drawObjective(ctx, L);
    this.drawCells(ctx, L);
    this.drawAbilities(ctx, p, L);
    this.drawWeapon(ctx, p, L);
    if (game.world) Cidade.desenharBotao(ctx, L);   // botão AURORA (teletransporte), acima da arma
    this.drawBuffs(ctx, L);
    this.drawBossBar(ctx, L);
    this.drawCombo(ctx, L);
    if (game.world && typeof WorldQuests !== 'undefined') WorldQuests.drawMarks(ctx, this.time);   // ! e ? sobre quem dá missões
    this.drawTalkPrompt(ctx);
    // Avisos temporários
    this.drawComboNames(ctx);
    this.drawMessage(ctx, L);
    this.drawMemory(ctx, L);
    this.drawLevelUp(ctx, L);
    this.drawSubtitle(ctx);
    this.drawToasts(ctx);
    this.drawSaved(ctx, L);
  }

  // ------------------------------------------------------------- disposição
  // Posições do quadro (dependem só da largura lógica da tela) e áreas ocupadas
  layout(ctx, p) {
    const L = this.L || (this.L = { radar: {}, mission: { lines: [] }, ab: {} });
    L.compact = VIEW_W < 1270;
    const R = L.radar; R.r = 60; R.x = VIEW_W - 82; R.y = 78;
    L.scoreY = 166;
    // Missão: nome do setor + objetivo atual (quebrado em até 3 linhas)
    const m = L.mission, w = game.waves;
    m.w = clamp(Math.round(VIEW_W * 0.22), 262, 320); m.x = VIEW_W - 18 - m.w; m.y = 182;
    const txt = this.objectiveText();
    if (txt !== this.objText) { if (this.objText) this.objFlash = 1.2; this.objText = txt; }
    ctx.font = `12px ${FONT_UI}`;
    m.lines = this.wrapCached(ctx, txt, m.w - 56, 3);
    m.h = 36 + m.lines.length * 15;
    m.title = w.def.name;
    const sectors = this.sectors || (this.sectors = ROOM_DEFS.filter((d) => !d.boss).length);
    m.kicker = game.world ? game.world.kicker() : w.def.boss ? 'NÚCLEO DE NEXUS' : `SETOR ${w.roomIndex + 1} / ${sectors}`;
    L.comboY = m.y + 150;
    // Habilidades: 4 losangos + Eclipse, alinhados à direita
    const a = L.ab, pad = game.input.lastDevice === 'pad';
    a.d = 27; a.gap = 60; a.D = 38;
    a.eX = VIEW_W - 22 - a.D; a.eY = VIEW_H - 76;
    a.x0 = a.eX - a.D - 10 - a.d - 3 * a.gap; a.y = VIEW_H - 66;
    a.left = a.x0 - a.d - (pad ? 52 : 6);
    a.top = a.eY - a.D - 4;
    // Arma equipada e estado de combate, à esquerda das habilidades
    const wp = L.wp || (L.wp = {});
    wp.w = 176; wp.h = 62; wp.x = a.left - 14 - wp.w; wp.y = VIEW_H - 18 - wp.h;
    // Efeitos ativos (tempo restante), empilhados acima das habilidades
    const B = this.buffs, b = p.buffs;
    B.length = 0;
    if (b.overload > 0) B.push(['overload', b.overload, '80,160,255', 'Sobrecarga']);
    if (b.field > 0) B.push(['field', b.field, '120,190,255', 'Campo']);
    if (b.shield > 0) B.push(['hex', b.shield, '80,230,200', `Escudo ${p.shieldHp}`]);
    if (b.sync > 0) B.push(['sync', b.sync, '80,230,200', 'Sincronia']);
    if (p.counterT > 0) B.push(['counter', p.counterT, '220,228,240', 'Contra-ataque']);
    if (p.kit) p.kit.hudBuffs(p, B);   // efeitos próprios do personagem (Foco, camuflagem…)
    if (game.world && typeof Oficios !== 'undefined') Oficios.hudBuffs(p, B);   // consumíveis do mundo aberto
    L.lvlY = (L.compact ? 266 : 140) + (game.world ? 24 : 0);   // no mundo, o termômetro fica logo abaixo dos vitais
    L.cellsX = 20; L.cellsY = VIEW_H - 80; L.cellsS = 58;
    // Legenda (caixa e linhas) e altura do letreiro, que sobe para não cobrir a legenda
    this.subBox(ctx);
    L.msgY = this.msg ? this.msgY(this.msg) : 0;
    this.buildZones(L);
    this.collectOverlays(ctx, L);
    return L;
  }
  zone(side, x0, y0, x1, y1) {
    const z = this.zones[this.zoneN] || (this.zones[this.zoneN] = {});
    z.side = side; z.x0 = x0; z.y0 = y0; z.x1 = x1; z.y1 = y1;
    this.zoneN++;
  }
  buildZones(L) {
    this.zoneN = 0;
    const c = game.counter;
    this.zone('L', 0, 0, HUDV.right, HUDV.bottom);
    if (game.world) this.zone('L', 0, HUDV.bottom, HUDV.right, HUDV.bottom + 24);   // termômetro (js/mundo/clima.js)
    if (this.lvl) this.zone('L', 0, L.lvlY, 420, L.lvlY + 112);
    this.zone('R', L.radar.x - L.radar.r - 16, 0, VIEW_W, L.radar.y + L.radar.r + 6);
    this.zone('R', VIEW_W - 220, L.scoreY - 24, VIEW_W, L.scoreY + 6);
    this.zone('R', L.mission.x, L.mission.y - 8, VIEW_W, L.mission.y + L.mission.h);
    if (c.count >= 2 || c.dropped || this.tier) this.zone('R', VIEW_W - 250, L.comboY - 70, VIEW_W, L.comboY + 112);
    this.zone('R', L.ab.left, L.ab.top - 34 - this.buffs.length * 24, VIEW_W, VIEW_H);
    if (L.wp) this.zone('R', L.wp.x - 6, L.wp.y - 6, L.ab.left, VIEW_H);
    if (L.wp && game.world) this.zone('R', L.wp.x + L.wp.w - 76, L.wp.y - 66, L.wp.x + L.wp.w + 4, L.wp.y);   // botão AURORA
    this.zone('L', 0, L.cellsY - 18, L.cellsX + L.cellsS + 10, VIEW_H);
    if (this.savedT > 0) this.zone('L', 0, VIEW_H - 40, 260, VIEW_H);
  }
  // O ponto (x, y) está embaixo de algum painel fixo?
  inZone(x, y) {
    for (let i = 0; i < this.zoneN; i++) {
      const z = this.zones[i];
      if (x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1) return true;
    }
    return false;
  }
  // Faixa horizontal livre entre os painéis fixos na altura [y0, y1]
  freeSpan(y0, y1) {
    let min = 16, max = VIEW_W - 16;
    for (let i = 0; i < this.zoneN; i++) {
      const z = this.zones[i];
      if (y1 < z.y0 || y0 > z.y1) continue;
      if (z.side === 'L') min = Math.max(min, z.x1 + 10); else max = Math.min(max, z.x0 - 10);
    }
    if (max - min < 140) { min = 16; max = VIEW_W - 16; }   // sem espaço: usa a largura toda
    this.span.min = min; this.span.max = max;
    return this.span;
  }
  temp4(x, y, w, h) {
    const r = this.temp[this.tempN] || (this.temp[this.tempN] = {});
    r.x = x; r.y = y; r.w = w; r.h = h;
    this.tempN++;
  }
  // Letreiros e memórias: os painéis fixos que eles cobrem ficam translúcidos
  collectOverlays(ctx, L) {
    this.tempN = 0;
    const m = this.msg;
    if (m) {
      const y = L.msgY;
      ctx.save();
      ctx.font = `bold ${m.small ? 30 : 42}px ${FONT_TITLE}`; ctx.letterSpacing = m.small ? '4px' : '5px';
      let w = ctx.measureText(m.title).width;
      if (m.sub && !m.small) { ctx.font = `bold 14px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; w = Math.max(w, ctx.measureText(m.sub).width); }
      ctx.restore();
      if (m.small) this.temp4(VIEW_W / 2 - w / 2 - 12, y, w + 24, 40);
      else this.temp4(VIEW_W / 2 - w / 2 - 12, y - 46, w + 24, 88);
    }
    if (this.mem) {
      const M = this.memLines(ctx);
      this.temp4(VIEW_W / 2 - M.w / 2 - 12, M.y - 42, M.w + 24, 46 + M.lines.length * 28);
    }
  }
  // Transparência de um painel fixo (some quando um letreiro ou memória passa por cima)
  panelAlpha(name, x, y, w, h) {
    let hit = false;
    for (let i = 0; i < this.tempN; i++) {
      const r = this.temp[i];
      if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) { hit = true; break; }
    }
    const k = approach(this.dimK[name] || 0, hit ? 1 : 0, this.frameDt * 5);
    this.dimK[name] = k;
    return 1 - 0.78 * k;
  }
  // Quebra de linha guardada (o texto muda raramente); 'max' limita o número de linhas
  wrapCached(ctx, text, width, max = 99) {
    const key = `${ctx.font}|${width}|${text}`;
    let lines = this.wraps.get(key);
    if (!lines) {
      lines = text ? wrapText(ctx, text, width) : [];
      if (lines.length > max) { lines = lines.slice(0, max); lines[max - 1] += '…'; }
      if (this.wraps.size > 60) this.wraps.clear();
      this.wraps.set(key, lines);
    }
    return lines;
  }

  // --------------------------------------------------------- camadas em cache
  // Camada estática pré-renderizada na resolução real da tela (refeita só quando a escala muda)
  layer(key, w, h, paint) {
    const sc = clamp(game.scale || 1, 0.5, 3);
    let c = this.cache.get(key);
    if (!c || c.sc !== sc) {
      c = document.createElement('canvas');
      c.width = Math.max(2, Math.ceil(w * sc)); c.height = Math.max(2, Math.ceil(h * sc));
      c.sc = sc; c.lw = w; c.lh = h;
      const g = c.getContext('2d');
      g.scale(sc, sc);
      paint(g, w, h);
      if (this.cache.size > 120) this.cache.clear();
      this.cache.set(key, c);
    }
    return c;
  }
  blit(ctx, c, x, y) { ctx.drawImage(c, x, y, c.lw, c.lh); }
  // Só a fração 'f' (da esquerda) de uma camada: preenchimento das barras
  blitPart(ctx, c, x, y, f) {
    if (!(f > 0.002)) return;
    f = Math.min(1, f);
    ctx.drawImage(c, 0, 0, c.width * f, c.height, x, y, c.lw * f, c.lh);
  }
  // Brilho aditivo (GlowCache) respeitando a transparência do painel atual
  glowAt(ctx, rgb, x, y, r, a) {
    const ga = ctx.globalAlpha, op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, rgb, x, y, r, a * ga);
    ctx.globalAlpha = ga; ctx.globalCompositeOperation = op;
  }
  // Preenchimento de barra angulada: degradê, reflexo e divisões a cada 10%
  paintBarFill(g, w, h, tip, kind, c0, c1, ticks = true) {
    slantBarPath(g, 0, 0, w, h, tip, kind);
    g.save(); g.clip();
    if (c1) { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; } else g.fillStyle = c0;
    g.fillRect(0, 0, w, h);
    if (ticks) {
      g.fillStyle = 'rgba(255,255,255,0.13)'; g.fillRect(0, 0, w, h * 0.4);
      g.fillStyle = 'rgba(0,0,0,0.32)';
      for (let k = 1; k < 10; k++) g.fillRect(Math.round((w * k) / 10), 0, 1, h);
    }
    g.restore();
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
    if (game.world) return game.world.objective();
    const w = game.waves;
    if (w.def.boss) return game.boss ? 'Derrote NEXUS' : 'Alcance o núcleo de NEXUS';
    if (w.state === 'cleared' || w.state === 'exiting') {
      return game.pickups.find('memory') ? 'Recupere o fragmento de memória e siga para a saída ao norte' : 'Siga para a saída ao norte';
    }
    return `Elimine as forças de NEXUS · onda\u00a0${Math.max(1, w.waveIndex + 1)}\u00a0/\u00a0${w.def.waves.length}`;   // sem quebrar "onda 1 / 2"
  }

  // ------------------------------------------------- retrato, vida e energia
  paintVitalsFrame(g) {
    const V = HUDV;
    // Placa escura que some à direita (legibilidade sobre cenários claros)
    const gr = g.createLinearGradient(V.px, 0, V.right, 0);
    gr.addColorStop(0, 'rgba(3,7,16,0.72)'); gr.addColorStop(0.62, 'rgba(3,7,16,0.48)'); gr.addColorStop(1, 'rgba(3,7,16,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(V.px, 4); g.lineTo(V.right, 4); g.lineTo(V.right - 32, V.bottom - 2); g.lineTo(V.px, V.bottom - 2); g.closePath(); g.fill();
    const tl = g.createLinearGradient(V.x - 10, 0, V.right, 0);
    tl.addColorStop(0, 'rgba(120,180,255,0.6)'); tl.addColorStop(1, 'rgba(120,180,255,0)');
    g.fillStyle = tl; g.fillRect(V.x - 10, 4, V.right - V.x, 1);
    this.paintBarFrame(g, V.x, V.hpY, V.hpW, V.hpH, V.hpTip, 'arrow', 'VIDA', '255,92,122', 'rgba(58,8,22,0.92)', '#ff9cb0');
    this.paintBarFrame(g, V.x, V.enY, V.enW, V.enH, V.enTip, 'slant', 'ENERGIA', '61,139,255', 'rgba(8,24,58,0.92)', '#9fcbff');
    // Rótulos das linhas de baixo
    g.font = `bold 9px ${FONT_TITLE}`; g.letterSpacing = '1px'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = 'rgba(168,216,255,0.72)';
    g.fillText('ESQUIVA', V.x + 3, 77); g.fillText('MEMÓRIAS', V.x + 3, 94); g.fillText('EXP', V.x + 3, 111);
    g.letterSpacing = '0px';
    // Trilho da experiência
    g.fillStyle = 'rgba(3,6,14,0.85)'; g.fillRect(V.x + V.tab, 108, 150, 6);
    g.strokeStyle = 'rgba(185,168,255,0.5)'; g.lineWidth = 1; g.strokeRect(V.x + V.tab - 0.5, 107.5, 151, 7);
  }
  paintBarFrame(g, x, y, w, h, tip, kind, label, rgb, tabFill, labelColor) {
    slantBarPath(g, x, y, w, h, tip, kind);
    g.fillStyle = 'rgba(3,6,14,0.86)'; g.fill();
    g.fillStyle = tabFill; g.fillRect(x, y, HUDV.tab, h);
    g.fillStyle = rgba(rgb, 0.7); g.fillRect(x + HUDV.tab, y, 1, h);
    slantBarPath(g, x, y, w, h, tip, kind);
    g.strokeStyle = rgba(rgb, 0.85); g.lineWidth = 1.2; g.stroke();
    // Fio angulado sob a barra (como na referência)
    const ul = g.createLinearGradient(x - 12, 0, x + w, 0);
    ul.addColorStop(0, rgba(rgb, 0.7)); ul.addColorStop(1, rgba(rgb, 0));
    g.fillStyle = ul;
    g.beginPath(); g.moveTo(x - 12, y + h + 3); g.lineTo(x + w - 16, y + h + 3); g.lineTo(x + w - 20, y + h + 4.5); g.lineTo(x - 12, y + h + 4.5); g.closePath(); g.fill();
    g.font = `bold ${h > 15 ? 11 : 9.5}px ${FONT_TITLE}`; g.letterSpacing = '1.5px'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = labelColor; g.fillText(label, x + 7, y + h / 2 + 0.5);
    g.letterSpacing = '0px';
  }
  // Retrato circular: rosto da ficha oficial (Kael), o retrato da arte de seleção (aliados)
  // ou, enquanto a imagem não carrega, a silhueta na cor-tema do personagem
  paintPortrait(g, S, rgb, face, id) {
    const c = S / 2, r = HUDV.pr;
    const hg = g.createRadialGradient(c, c, r * 0.75, c, c, c);
    hg.addColorStop(0, rgba(rgb, 0.45)); hg.addColorStop(1, rgba(rgb, 0));
    g.fillStyle = hg; g.fillRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(c, c, r, 0, TAU); g.clip();
    g.fillStyle = '#04070f'; g.fillRect(0, 0, S, S);
    if (face && id !== 'kael') drawHeroFace(g, id, c, c, r);
    else if (face) {
      // Recorte do rosto na ficha (268×336): da franja ao queixo, com os olhos um pouco acima do centro
      const im = KAEL_PORTRAIT.face, k = im.naturalWidth / 268;
      g.drawImage(im, 30 * k, 60 * k, 208 * k, 208 * k, c - r, c - r, 2 * r, 2 * r);
    } else if (id && id !== 'kael' && SKILL_PORTRAIT[id]) {
      // Aliados: a silhueta da história (Backdrop.ally) contra a luz da cor-tema
      const bg = g.createRadialGradient(c, c - r * 0.25, r * 0.05, c, c, r * 1.05);
      bg.addColorStop(0, rgba(rgb, 1)); bg.addColorStop(0.55, rgba(rgb, 0.45)); bg.addColorStop(1, 'rgba(4,7,15,1)');
      g.fillStyle = bg; g.fillRect(0, 0, S, S);
      const P = SKILL_PORTRAIT[id], sc = (r / 30) * P.s;
      Backdrop.ally(g, id, c, c - r * 0.3 + P.head * sc, sc, 0);
    } else {
      const bg = g.createLinearGradient(0, c - r, 0, c + r);
      bg.addColorStop(0, rgba(rgb, 0.38)); bg.addColorStop(1, 'rgba(4,7,15,1)');
      g.fillStyle = bg; g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(2,4,9,0.96)';
      g.beginPath(); g.arc(c, c - r * 0.16, r * 0.34, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(c - r * 0.95, c + r);
      g.quadraticCurveTo(c - r * 0.85, c + r * 0.34, c, c + r * 0.28);
      g.quadraticCurveTo(c + r * 0.85, c + r * 0.34, c + r * 0.95, c + r); g.closePath(); g.fill();
      g.strokeStyle = rgba(rgb, 0.85); g.lineWidth = 1.5;
      g.beginPath(); g.arc(c, c - r * 0.16, r * 0.34, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      g.beginPath(); g.moveTo(c - r * 0.8, c + r * 0.62); g.quadraticCurveTo(c - r * 0.7, c + r * 0.36, c - r * 0.2, c + r * 0.3); g.stroke();
    }
    const vg = g.createRadialGradient(c, c - r * 0.1, r * 0.5, c, c, r);
    vg.addColorStop(0, 'rgba(2,4,10,0)'); vg.addColorStop(1, 'rgba(2,4,10,0.5)');
    g.fillStyle = vg; g.fillRect(0, 0, S, S);
    const bt = g.createLinearGradient(0, c + r * 0.3, 0, c + r);
    bt.addColorStop(0, rgba(rgb, 0)); bt.addColorStop(1, rgba(rgb, 0.3));
    g.fillStyle = bt; g.fillRect(0, 0, S, S);
    g.restore();
    // Anéis: o principal na cor-tema e um externo em quatro arcos (abertos para as barras e o nível)
    g.strokeStyle = rgba(rgb, 0.95); g.lineWidth = 2.5; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 1; g.beginPath(); g.arc(c, c, r - 2.5, 0, TAU); g.stroke();
    g.strokeStyle = rgba(rgb, 0.55); g.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) { const a0 = (k * TAU) / 4 + 0.36; g.beginPath(); g.arc(c, c, r + 6, a0, a0 + TAU / 4 - 0.72); g.stroke(); }
    g.fillStyle = rgba(rgb, 0.95);
    for (const a of [-Math.PI / 4, Math.PI * 1.25]) {
      const x = c + Math.cos(a) * (r + 6), y = c + Math.sin(a) * (r + 6);
      g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill();
    }
  }

  drawVitals(ctx, p) {
    const V = HUDV, pr = heroProgressOf(p), inp = game.input, pad = inp.lastDevice === 'pad';   // Kael: game.progress
    const U = heroUltInfo(p);
    const rgb = hexToRgb(p.def.color || '#2F8CFF');
    ctx.save();
    ctx.globalAlpha = this.panelAlpha('vitals', 0, 0, V.right, V.bottom);
    this.blit(ctx, this.layer('vit-moldura', V.right + 4, V.bottom + 2, (g) => this.paintVitalsFrame(g)), 0, 0);
    // Retrato do personagem ativo
    const face = p.def.art === 'kael' ? kaelPortraitReady('face') : !!heroPortrait(p.def.id), S = 2 * V.pr + 24;
    this.blit(ctx, this.layer(`retrato-${p.def.id}${p.def.ver ? ':' + p.def.ver : ''}-${face ? 1 : 0}-${rgb}`, S, S, (g) => this.paintPortrait(g, S, rgb, face, p.def.id)), V.px - S / 2, V.py - S / 2);
    if (p.canEclipse()) this.glowAt(ctx, rgb, V.px, V.py, V.pr * 1.75, 0.32 + 0.16 * Math.sin(this.time * 6));
    const low = p.hp / p.maxHp < 0.3;
    const red = Math.max(low ? 0.16 + 0.12 * Math.sin(this.time * 9) : 0, this.hurtT * 1.1);
    if (red > 0.01) {
      ctx.fillStyle = `rgba(255,40,80,${clamp(red, 0, 0.6).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(V.px, V.py, V.pr - 1, 0, TAU); ctx.fill();
    }
    // Nível (emblema sob o retrato)
    ctx.textBaseline = 'middle';
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.textAlign = 'center';
    const lv = `NV ${pr.level}`, lw = ctx.measureText(lv).width + 18, ly = V.py + V.pr - 5;
    ctx.fillStyle = 'rgba(16,8,34,0.96)'; techPanelPath(ctx, V.px - lw / 2, ly, lw, 17, 5); ctx.fill();
    ctx.strokeStyle = this.xpFlash > 0 ? '#efe8ff' : 'rgba(185,150,255,0.9)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#efe8ff'; ctx.fillText(lv, V.px, ly + 9);
    // Nome e título
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(rgb, 1);
    diamondPath(ctx, V.x + 4, 14, 3.5); ctx.fill();
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
    ctx.fillStyle = 'rgba(214,230,250,0.9)';
    ctx.fillText(`${p.def.name} · ${p.def.title}`.toUpperCase(), V.x + 13, 14.5);
    ctx.letterSpacing = '0px';
    // Vida (com a barra fantasma e o Escudo de Energia por cima)
    const fx = V.x + V.tab, fw = V.hpW - V.tab, hpK = p.hp / p.maxHp;
    const hpFill = this.layer('vida', fw, V.hpH, (g, w, h) => this.paintBarFill(g, w, h, V.hpTip, 'arrow', '#5a0a1e', '#ff2e55'));
    if (this.ghostHp > p.hp) this.blitPart(ctx, this.layer('vida-fantasma', fw, V.hpH, (g, w, h) => this.paintBarFill(g, w, h, V.hpTip, 'arrow', 'rgba(225,236,255,0.72)', null, false)), fx, V.hpY, this.ghostHp / p.maxHp);
    this.blitPart(ctx, hpFill, fx, V.hpY, hpK);
    if (low) {
      const k = 0.5 + 0.5 * Math.sin(this.time * 10);
      const ga = ctx.globalAlpha;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * 0.45 * k;
      this.blitPart(ctx, hpFill, fx, V.hpY, hpK);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ga;
      ctx.strokeStyle = `rgba(255,80,110,${(0.4 + 0.5 * k).toFixed(3)})`; ctx.lineWidth = 1.6;
      slantBarPath(ctx, V.x, V.hpY, V.hpW, V.hpH, V.hpTip, 'arrow'); ctx.stroke();
    }
    if (p.shieldHp > 0) {
      ctx.fillStyle = 'rgba(90,240,210,0.6)';
      ctx.fillRect(fx, V.hpY, (fw - V.hpTip) * clamp(p.shieldHp / Math.max(1, p.shieldMax), 0, 1), 5);
    }
    ctx.font = `bold 13px ${FONT_UI}`;
    const hpTxt = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(24,2,10,0.55)'; ctx.lineJoin = 'round';
    ctx.strokeText(hpTxt, fx + 8, V.hpY + V.hpH / 2 + 0.5);
    ctx.fillStyle = '#ffffff'; ctx.fillText(hpTxt, fx + 8, V.hpY + V.hpH / 2 + 0.5);
    // Energia da Tempestade Nula (habilidades; o Eclipse exige 100)
    const full = p.canEclipse(), ew = V.enW - V.tab;
    const sh = this.furyDeny > 0 ? Math.sin(this.furyDeny * 80) * 4 : 0;
    const ex = fx + sh, ek = p.fury / p.maxEnergy;
    if (full) {
      const glow = this.layer('energia-brilho', ew + 28, V.enH + 28, (g) => {
        g.translate(14, 14); g.shadowColor = 'rgba(80,160,255,1)'; g.shadowBlur = 12;
        slantBarPath(g, 0, 0, ew, V.enH, V.enTip, 'slant'); g.fillStyle = 'rgba(80,160,255,0.9)'; g.fill();
      });
      const ga = ctx.globalAlpha;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * (0.5 + 0.35 * Math.sin(this.time * 8));
      this.blit(ctx, glow, ex - 14, V.enY - 14);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ga;
    }
    this.blitPart(ctx, full
      ? this.layer('energia-cheia', ew, V.enH, (g, w, h) => this.paintBarFill(g, w, h, V.enTip, 'slant', '#1a4fae', '#d6ecff'))
      : this.layer('energia', ew, V.enH, (g, w, h) => this.paintBarFill(g, w, h, V.enTip, 'slant', '#0c2a66', '#3d8bff')), ex, V.enY, ek);
    if (U.learned && p.maxEnergy > SPECIAL_COST) {
      ctx.fillStyle = 'rgba(230,240,255,0.85)'; ctx.fillRect(ex + ew * (SPECIAL_COST / p.maxEnergy) - 1, V.enY - 3, 2, V.enH + 6);
    }
    const tx = V.x + V.enW + 8 + sh;
    ctx.font = `bold 12px ${FONT_TITLE}`;
    if (full) {
      const key = pad ? inp.padLabels.lt : 'I';
      ctx.fillStyle = PAL.accentHi;
      ctx.fillText(Math.floor(this.time * 3) % 2 ? `[${key}] ${U.label}` : 'PRONTO', tx, V.enY + V.enH / 2 + 0.5);
    } else {
      const n = String(Math.floor(p.fury));
      ctx.fillStyle = PAL.accent; ctx.fillText(n, tx, V.enY + V.enH / 2 + 0.5);
      const nw = ctx.measureText(n).width;
      ctx.font = `10px ${FONT_UI}`; ctx.fillStyle = 'rgba(150,180,225,0.65)';
      ctx.fillText(`/ ${p.maxEnergy}`, tx + nw + 4, V.enY + V.enH / 2 + 1);
    }
    // Esquiva: uma barra por carga
    const n = p.stats.dashCharges, dw = Math.min(90, (90 - (n - 1) * 4) / n);
    for (let k = 0; k < n; k++) {
      const f = clamp(p.dashStock - k, 0, 1), x = fx + k * (dw + 4);
      ctx.fillStyle = 'rgba(3,6,14,0.85)'; ctx.fillRect(x, 74.5, dw, 5);
      ctx.fillStyle = f >= 1 ? '#dfe6f0' : '#5a6474'; ctx.fillRect(x, 74.5, dw * f, 5);
    }
    if (n > 1) { ctx.font = `bold 10px ${FONT_UI}`; ctx.fillStyle = 'rgba(214,221,232,0.8)'; ctx.fillText(`×${Math.floor(p.dashStock)}`, fx + 98, 77.5); }
    // Fragmentos de memória recuperados e pontos de habilidade para gastar
    for (let k = 0; k < MEMORIES.length; k++) {
      const cx = fx + 12 + k * 16, has = k < game.stats.memories;
      diamondPath(ctx, cx, 94, 5.5);
      if (has) { ctx.fillStyle = PAL.accentHi; ctx.fill(); this.glowAt(ctx, '90,170,255', cx, 94, 12, 0.6); }
      else { ctx.fillStyle = 'rgba(3,7,16,0.75)'; ctx.fill(); ctx.strokeStyle = 'rgba(168,216,255,0.45)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    if (pr.sp > 0) {
      const ga = ctx.globalAlpha;
      ctx.globalAlpha = ga * (0.65 + 0.35 * Math.sin(this.time * 5));
      ctx.font = `bold 11px ${FONT_TITLE}`; ctx.fillStyle = '#ffd47a';
      ctx.fillText(`◆ ${pr.sp} [${pad ? inp.padLabels.back : 'TAB'}]`, fx + 12 + MEMORIES.length * 16 + 2, 94.5);
      ctx.globalAlpha = ga;
    }
    // Experiência
    const xk = pr.level >= PROG.maxLevel ? (pr.mxp || 0) / PROG.xpMaestria : pr.xp / pr.xpNext;
    ctx.fillStyle = this.xpFlash > 0 ? '#e6dcff' : '#9b7dff'; ctx.fillRect(fx, 108, 150 * clamp(xk, 0, 1), 6);
    ctx.font = `10px ${FONT_UI}`; ctx.fillStyle = 'rgba(214,210,240,0.8)';
    ctx.fillText(pr.level >= PROG.maxLevel ? `MAESTRIA ${pr.maestria || 0}` : `${pr.xp} / ${pr.xpNext}`, fx + 158, 111.5);
    ctx.restore();
  }

  // ------------------------------------------------------------------ radar
  paintRadarBase(g, B, R) {
    const c = B / 2;
    const bg = g.createRadialGradient(c, c, 0, c, c, R);
    bg.addColorStop(0, 'rgba(14,34,70,0.8)'); bg.addColorStop(1, 'rgba(3,7,16,0.88)');
    g.fillStyle = bg; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,170,255,0.13)'; g.lineWidth = 1;
    for (const k of [0.36, 0.7]) { g.beginPath(); g.arc(c, c, R * k, 0, TAU); g.stroke(); }
    g.beginPath();
    for (const [, a] of RADAR_DIRS) { g.moveTo(c, c); g.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R); }
    g.stroke();
    g.strokeStyle = 'rgba(140,190,255,0.5)';
    for (let k = 0; k < 24; k++) {
      const a = (k * TAU) / 24, l = k % 6 === 0 ? 5 : 2.5;
      g.beginPath(); g.moveTo(c + Math.cos(a) * (R - l), c + Math.sin(a) * (R - l)); g.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R); g.stroke();
    }
    g.strokeStyle = 'rgba(120,180,255,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.arc(c, c, R, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(120,180,255,0.3)'; g.lineWidth = 1;
    for (const [, a] of RADAR_DIRS) { g.beginPath(); g.arc(c, c, R + 5, a + 0.32, a + Math.PI / 2 - 0.32); g.stroke(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [ch, a] of RADAR_DIRS) {
      const x = c + Math.cos(a) * (R + 5), y = c + Math.sin(a) * (R + 5), n = ch === 'N';
      g.fillStyle = 'rgba(3,7,16,0.96)'; g.beginPath(); g.arc(x, y, 8.5, 0, TAU); g.fill();
      g.strokeStyle = n ? 'rgba(168,216,255,0.95)' : 'rgba(120,180,255,0.45)'; g.lineWidth = 1; g.stroke();
      g.font = `bold ${n ? 11 : 10}px ${FONT_TITLE}`; g.fillStyle = n ? '#e2f1ff' : '#a3afc2';
      g.fillText(ch, x, y + 0.5);
    }
  }
  // Planta do setor vista de cima (girada 45°): piso, grade, paredes, comporta e pilares
  paintRadarMap(g, room, s) {
    const w = room.w, o = 4, d = room.door;
    const P = (x, y) => [(x - y) * s + w * s + o, (x + y) * s + o];
    const corners = [P(0, 0), P(w, 0), P(w, w), P(0, w)];
    g.beginPath(); corners.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.fillStyle = 'rgba(70,130,230,0.14)'; g.fill();
    g.strokeStyle = 'rgba(110,170,255,0.09)'; g.lineWidth = 1; g.beginPath();
    for (let t = TILE * 2; t < w; t += TILE * 2) {
      g.moveTo(...P(t, 0)); g.lineTo(...P(t, w));
      g.moveTo(...P(0, t)); g.lineTo(...P(w, t));
    }
    g.stroke();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(160,205,255,0.75)'; g.lineWidth = 1.6; g.beginPath();
    g.moveTo(...P(0, w)); g.lineTo(...P(0, 0)); g.lineTo(...P(d.x - d.halfW, 0));
    g.moveTo(...P(d.x + d.halfW, 0)); g.lineTo(...P(w, 0));
    g.stroke();
    g.strokeStyle = 'rgba(160,205,255,0.3)'; g.lineWidth = 1; g.beginPath();
    g.moveTo(...P(w, 0)); g.lineTo(...P(w, w)); g.lineTo(...P(0, w)); g.stroke();
    g.fillStyle = 'rgba(175,195,225,0.5)';
    for (const pl of room.pillars) { const [x, y] = P(pl.x, pl.y); g.beginPath(); g.arc(x, y, Math.max(1.6, pl.r * s), 0, TAU); g.fill(); }
  }
  paintRadarSweep(g, R) {
    const n = 20, span = 1.1;
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(90,170,255,${(0.15 * (1 - i / n)).toFixed(3)})`;
      g.beginPath(); g.moveTo(R, R); g.arc(R, R, R, (-span * (i + 1)) / n, (-span * i) / n + 0.01); g.closePath(); g.fill();
    }
    g.strokeStyle = 'rgba(150,210,255,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(R, R); g.lineTo(2 * R, R); g.stroke();
  }
  // Ponto do mundo → radar (relativo ao jogador); fora do alcance fica preso à borda
  radarPos(wx, wy) {
    const q = this.rad, b = this.rp;
    const dx = wx - q.px, dy = wy - q.py, rx = (dx - dy) * q.s, ry = (dx + dy) * q.s;
    const d = Math.hypot(rx, ry), max = q.r - 6;
    b.out = d > max;
    const k = b.out ? max / d : 1;
    b.x = q.cx + rx * k; b.y = q.cy + ry * k; b.a = Math.atan2(ry, rx);
    return b;
  }
  // Marca na borda do radar apontando para fora (alvo além do alcance)
  rimMark(ctx, b, size, fill) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * 0.7, -size * 0.75); ctx.lineTo(-size * 0.7, size * 0.75); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  drawRadar(ctx, p, L) {
    const R = L.radar.r, cx = L.radar.x, cy = L.radar.y, room = game.room, w = room.w, t = this.time;
    const q = this.rad;
    q.cx = cx; q.cy = cy; q.r = R; q.s = (R - 6) / w; q.px = p.x; q.py = p.y;   // o setor inteiro cabe com o jogador no centro
    ctx.save();
    ctx.globalAlpha = this.panelAlpha('radar', cx - R - 14, cy - R - 14, 2 * R + 28, 2 * R + 28);
    const B = 2 * R + 30;
    this.blit(ctx, this.layer('radar-base', B, B, (g) => this.paintRadarBase(g, B, R)), cx - B / 2, cy - B / 2);
    // Planta do setor rolando sob o jogador + varredura
    const M = 2 * w * q.s + 8;
    const map = this.layer(`radar-mapa-${room.index}-${room.seed}`, M, M, (g) => this.paintRadarMap(g, room, q.s));
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R - 1.5, 0, TAU); ctx.clip();
    this.blit(ctx, map, cx - (p.x - p.y) * q.s - w * q.s - 4, cy - (p.x + p.y) * q.s - 4);
    ctx.translate(cx, cy); ctx.rotate((t * 1.5) % TAU);
    this.blit(ctx, this.layer('radar-varredura', 2 * R, 2 * R, (g) => this.paintRadarSweep(g, R)), -R, -R);
    ctx.restore();
    // Saída (comporta ao norte): acesa quando o setor é liberado
    const wv = game.waves;
    if (!wv.def.boss) {
      const d = room.door, b = this.radarPos(d.x, -6), open = wv.state === 'cleared' || wv.state === 'exiting';
      if (open) {
        const k = 0.6 + 0.4 * Math.sin(t * 5);
        this.glowAt(ctx, '110,190,255', b.x, b.y, 14, 0.8 * k);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = '#d6ecff';
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-3, -5.5); ctx.lineTo(-1, 0); ctx.lineTo(-3, 5.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = 'rgba(150,165,190,0.75)'; ctx.fillRect(-4.5, -1.5, 9, 3);
        ctx.restore();
      }
    }
    // NPCs (aliados e gravações); o sinal e as pistas da campanha do herói em estrela na cor dele
    for (const n of game.npcs) {
      const b = this.radarPos(n.x, n.y);
      if (n.kind === 'campanha') {
        if (n.used) continue;
        this.glowAt(ctx, n.lightRgb, b.x, b.y, 14, 0.7 + 0.3 * Math.sin(t * 5));
        if (b.out) { this.rimMark(ctx, b, 5, rgba(n.lightRgb, 1)); continue; }
        ctx.font = `bold 11px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(n.lightRgb, 1); ctx.fillText('★', b.x, b.y + 0.5);
        continue;
      }
      // alvos de missão (losango dourado, também na borda), recursos de coleta e tesouros por perto
      if (n.alvoMissao && !n.feito && !n.sumir && !(n.sub === 'local')) {
        if (b.out) { this.rimMark(ctx, b, 4.5, '#ffd47a'); continue; }
        diamondPath(ctx, b.x, b.y, 3.6); ctx.fillStyle = '#ffd47a'; ctx.fill();
        continue;
      }
      if (b.out || n.feito) continue;
      if ((n.kind === 'tesouro' || n.kind === 'entrada') && !n.visivel()) continue;   // ainda escondidos
      if ((n.kind === 'coleta' || n.kind === 'evento') && !n.used) { ctx.fillStyle = rgba(n.lightRgb, 0.9); ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, TAU); ctx.fill(); continue; }
      ctx.fillStyle = 'rgba(255,212,122,0.9)'; ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, TAU); ctx.fill();
    }
    // Fragmento de memória
    const mem = game.pickups.find('memory');
    if (mem) {
      const b = this.radarPos(mem.x, mem.y), k = 0.6 + 0.4 * Math.sin(t * 4);
      this.glowAt(ctx, '170,215,255', b.x, b.y, 14, 0.9 * k);
      if (b.out) this.rimMark(ctx, b, 5, '#cfe6ff');
      else { diamondPath(ctx, b.x, b.y, 4.5); ctx.fillStyle = '#e6f3ff'; ctx.fill(); }
    }
    // Inimigos (elite em dourado) e NEXUS
    for (const e of game.enemies) {
      if (!e.alive || e.state === 'dying') continue;
      const b = this.radarPos(e.x, e.y);
      if (e.isBoss) {
        const k = 0.5 + 0.5 * Math.sin(t * 6), col = e.phase === 3 ? '255,46,85' : '90,230,255';
        this.glowAt(ctx, col, b.x, b.y, 18, 0.7 + 0.3 * k);
        if (b.out) { this.rimMark(ctx, b, 6, rgba(col, 1)); continue; }
        diamondPath(ctx, b.x, b.y, 6); ctx.fillStyle = rgba(col, 1); ctx.fill();
        ctx.strokeStyle = rgba(col, 0.6 * (1 - k)); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(b.x, b.y, 7 + 6 * k, 0, TAU); ctx.stroke();
        continue;
      }
      const col = e.elite ? '255,200,90' : '255,60,90';
      if (b.out) { this.rimMark(ctx, b, e.elite ? 4.5 : 3.5, rgba(col, 0.9)); continue; }
      this.glowAt(ctx, col, b.x, b.y, e.elite ? 10 : 7, 0.55);
      ctx.fillStyle = e.elite ? '#ffe2a0' : '#ff5c7a';
      ctx.beginPath(); ctx.arc(b.x, b.y, e.elite ? 3.2 : 2.4, 0, TAU); ctx.fill();
    }
    // Jogador: seta no centro, apontando para onde ele olha
    const c = Math.cos(p.facing), s = Math.sin(p.facing);
    this.glowAt(ctx, '90,170,255', cx, cy, 13, 0.75);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(c + s, c - s));
    ctx.fillStyle = '#f2f8ff';
    ctx.beginPath(); ctx.moveTo(7.5, 0); ctx.lineTo(-5, -5); ctx.lineTo(-2.5, 0); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // -------------------------------------------------------- pontuação e missão
  drawScore(ctx, L) {
    const x = VIEW_W - 22, y = L.scoreY;
    if (game.world && typeof WorldTime !== 'undefined') { WorldTime.drawHud(ctx, x, y); return; }   // no mundo: relógio e clima
    ctx.save();
    ctx.globalAlpha = this.panelAlpha('score', VIEW_W - 220, y - 24, 200, 30);
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.font = `24px ${FONT_NUM}`;
    const txt = Math.round(this.displayScore).toLocaleString('pt-BR'), tw = ctx.measureText(txt).width;
    ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(2,6,16,0.85)'; ctx.strokeText(txt, x, y);
    ctx.fillStyle = '#eef5ff'; ctx.fillText(txt, x, y);
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
    ctx.fillStyle = 'rgba(90,160,255,0.95)'; ctx.fillText('PONTUAÇÃO', x - tw - 10, y - 2);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  paintMissionFrame(g, w, h) {
    techPanelPath(g, 0.5, 0.5, w - 1, h - 1, 10);
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(6,16,34,0.86)'); gr.addColorStop(1, 'rgba(3,7,16,0.72)');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(90,150,255,0.5)'; g.lineWidth = 1; g.stroke();
    const tl = g.createLinearGradient(0, 0, w, 0);
    tl.addColorStop(0, 'rgba(150,205,255,0)'); tl.addColorStop(0.3, 'rgba(150,205,255,0.9)'); tl.addColorStop(1, 'rgba(150,205,255,0.1)');
    g.fillStyle = tl; g.fillRect(12, 0, w - 24, 1.5);
    g.fillStyle = 'rgba(90,150,255,0.25)'; g.fillRect(42, 9, 1, h - 18);
  }
  drawObjective(ctx, L) {
    const m = L.mission;
    if (!m.lines.length) return;
    ctx.save();
    ctx.globalAlpha = this.panelAlpha('mission', m.x, m.y - 8, m.w, m.h + 8);
    this.blit(ctx, this.layer(`missao-${m.w}-${m.h}`, m.w, m.h, (g) => this.paintMissionFrame(g, m.w, m.h)), m.x, m.y);
    if (this.objFlash > 0) {
      ctx.strokeStyle = `rgba(190,225,255,${clamp(this.objFlash, 0, 1).toFixed(3)})`; ctx.lineWidth = 1.5;
      techPanelPath(ctx, m.x, m.y, m.w, m.h, 10); ctx.stroke();
    }
    // Ícone (losango com raio)
    const ix = m.x + 21, iy = m.y + 22;
    diamondPath(ctx, ix, iy, 11); ctx.fillStyle = 'rgba(20,60,140,0.5)'; ctx.fill();
    ctx.strokeStyle = PAL.accentHi; ctx.lineWidth = 1.5; ctx.stroke();
    drawIcon(ctx, 'bolt', ix, iy, 13, PAL.accentHi);
    // Etiqueta do setor sobre a borda
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = `bold 9px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
    const kw = ctx.measureText(m.kicker).width + 14, kx = m.x + m.w - kw - 14;
    ctx.fillStyle = 'rgba(3,7,16,0.96)'; ctx.fillRect(kx, m.y - 6.5, kw, 13);
    ctx.strokeStyle = 'rgba(90,150,255,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(kx + 0.5, m.y - 6, kw - 1, 12);
    ctx.fillStyle = 'rgba(168,216,255,0.95)'; ctx.fillText(m.kicker, kx + 7, m.y + 0.5);
    ctx.letterSpacing = '0px';
    // Nome do setor e objetivo atual
    const tw = m.w - 54;
    let fs = 14;
    ctx.font = `bold ${fs}px ${FONT_UI}`;
    while (fs > 11 && ctx.measureText(m.title).width > tw) { fs--; ctx.font = `bold ${fs}px ${FONT_UI}`; }
    ctx.fillStyle = '#eef3fa'; ctx.fillText(m.title, m.x + 52, m.y + 18);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(204,216,236,0.92)';
    for (let i = 0; i < m.lines.length; i++) ctx.fillText(m.lines[i], m.x + 52, m.y + 37 + i * 15);
    ctx.restore();
  }

  // ------------------------------------------------- células de energia
  paintCells(g, S) {
    const x = 8, y = 16;
    g.font = `bold 9px ${FONT_TITLE}`; g.letterSpacing = '2px'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = 'rgba(168,216,255,0.8)'; g.fillText('CÉLULAS', x + 1, 6);
    g.letterSpacing = '0px';
    techPanelPath(g, x + 0.5, y + 0.5, S - 1, S - 1, 9);
    const gr = g.createLinearGradient(0, y, 0, y + S);
    gr.addColorStop(0, 'rgba(10,24,52,0.9)'); gr.addColorStop(1, 'rgba(3,7,16,0.9)');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(120,175,255,0.6)'; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = 'rgba(120,175,255,0.18)'; g.lineWidth = 1;
    techPanelPath(g, x + 4.5, y + 4.5, S - 9, S - 9, 7); g.stroke();
    // Cristal de energia facetado com brilho
    const cx = x + S / 2, cy = y + S / 2;
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.45);
    rg.addColorStop(0, 'rgba(70,150,255,0.55)'); rg.addColorStop(1, 'rgba(70,150,255,0)');
    g.fillStyle = rg; g.fillRect(x, y, S, S);
    const top = [cx, cy - 17], rt = [cx + 9, cy - 3], bot = [cx, cy + 17], lf = [cx - 9, cy - 3], mid = [cx + 1, cy - 1];
    const face = (a, b, c, col) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.closePath(); g.fillStyle = col; g.fill(); };
    face(top, lf, mid, '#cfe8ff'); face(top, mid, rt, '#7fb8ff');
    face(lf, bot, mid, '#3d8bff'); face(mid, bot, rt, '#1f5fd0');
    g.strokeStyle = 'rgba(235,246,255,0.9)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(...top); g.lineTo(...rt); g.lineTo(...bot); g.lineTo(...lf); g.closePath(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(cx - 4, cy - 10, 1.5, 5);
  }
  drawCells(ctx, L) {
    const x = L.cellsX, y = L.cellsY, S = L.cellsS;
    ctx.save();
    ctx.globalAlpha = this.panelAlpha('cells', x, y - 16, S + 10, S + 16);
    this.blit(ctx, this.layer('celulas', S + 16, S + 24, (g) => this.paintCells(g, S)), x - 8, y - 16);
    const k = 0.5 + 0.5 * Math.sin(this.time * 2.4);
    this.glowAt(ctx, '70,150,255', x + S / 2, y + S / 2, 22 + 4 * k, 0.25 + 0.15 * k + this.cellFlash * 1.4);
    // Quantidade no canto (como o atalho do item na referência)
    const n = String(game.stats.soulsBank);
    ctx.font = `bold 12px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const bw = Math.max(20, ctx.measureText(n).width + 10), bx = x + S - bw + 8, by = y + S - 10;
    ctx.fillStyle = 'rgba(12,22,40,0.97)'; ctx.fillRect(bx, by, bw, 18);
    ctx.strokeStyle = this.cellFlash > 0 ? '#eaf4ff' : 'rgba(160,195,240,0.75)'; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 17);
    ctx.fillStyle = '#eef5ff'; ctx.fillText(n, bx + bw / 2, by + 9.5);
    ctx.restore();
  }

  // ------------------------------------------- habilidades (losangos) e Eclipse
  // Losango de um atalho (com o ícone da habilidade) no estado 'empty', 'off' ou 'on'
  paintSlot(g, S, d, rgb, state, icon) {
    const c = S / 2;
    diamondPath(g, c, c, d);
    g.fillStyle = 'rgba(5,10,20,0.93)'; g.fill();
    if (state === 'empty') {
      g.setLineDash([4, 4]); g.strokeStyle = 'rgba(120,130,150,0.38)'; g.lineWidth = 1.3; g.stroke(); g.setLineDash([]);
      return;
    }
    const on = state === 'on';
    const gr = g.createLinearGradient(0, c - d, 0, c + d);
    gr.addColorStop(0, rgba(rgb, on ? 0.34 : 0.1)); gr.addColorStop(1, rgba(rgb, 0.03));
    g.fillStyle = gr; g.fill();
    diamondPath(g, c, c, d - 5); g.strokeStyle = rgba(rgb, on ? 0.35 : 0.14); g.lineWidth = 1; g.stroke();
    if (on) { g.shadowColor = rgba(rgb, 0.9); g.shadowBlur = 9; }
    diamondPath(g, c, c, d); g.strokeStyle = rgba(rgb, on ? 0.95 : 0.4); g.lineWidth = 1.6; g.stroke();
    g.shadowBlur = 0;
    if (icon) drawSkillIcon(g, icon, c, c, d * 1.1, on ? rgba(rgb, 1) : 'rgba(140,150,170,0.6)');   // = drawIcon nos do Kael
  }
  // Tecla sob um losango (no controle, o botão desenhado como na tela de controles)
  keyCap(ctx, cx, y, key, hot) {
    const inp = game.input;
    if (inp.lastDevice === 'pad') { drawPadButton(ctx, inp.pad ? inp.pad.kind : 'xbox', key, cx, y + 8, key.length > 1 ? 10.5 : 8.5, hot); return; }
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.max(17, ctx.measureText(key).width + 9);
    ctx.fillStyle = hot ? 'rgba(61,139,255,0.4)' : 'rgba(4,8,16,0.88)';
    ctx.fillRect(cx - w / 2, y, w, 16);
    ctx.strokeStyle = hot ? 'rgba(190,225,255,0.95)' : 'rgba(200,215,235,0.45)'; ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2 + 0.5, y + 0.5, w - 1, 15);
    ctx.fillStyle = hot ? '#ffffff' : '#dfe6f2';
    ctx.fillText(key, cx, y + 8.5);
  }
  // Painel da arma: ícone e nome da arma equipada, estado (em combate, sacando, guardada),
  // a tecla de troca e, durante um combo, os próximos golpes possíveis (L → … · H → …)
  drawWeapon(ctx, p, L) {
    const W = L.wp, wid = typeof RosterManager !== 'undefined' ? RosterManager.equippedWeapon(p.def.id) : null, wd = wid && WEAPON_DEFS[wid];
    if (!wd) return;
    const rgb = hexToRgb(p.def.color);
    ctx.save();
    ctx.globalAlpha = this.panelAlpha('weapon', W.x, W.y, W.w, W.h);
    ctx.fillStyle = 'rgba(4,8,18,0.72)';
    techPanelPath(ctx, W.x, W.y, W.w, W.h, 8); ctx.fill();
    ctx.strokeStyle = rgba(rgb, 0.45); ctx.lineWidth = 1; ctx.stroke();
    // ícone (imagem da arma; sem ela, o símbolo do tipo)
    const im = wd.png && typeof SpecialAssets !== 'undefined' ? SpecialAssets.getImg(wd.png) : null, ic = 44, ix = W.x + 8, iy = W.y + (W.h - ic) / 2;
    ctx.fillStyle = rgba(rgb, 0.12); ctx.fillRect(ix, iy, ic, ic);
    if (im && im.complete && im.naturalWidth) {
      const k = Math.min(ic / im.naturalWidth, ic / im.naturalHeight);
      ctx.drawImage(im, ix + (ic - im.naturalWidth * k) / 2, iy + (ic - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k);
    } else drawIcon(ctx, 'sword', ix + ic / 2, iy + ic / 2, 26, rgba(rgb, 0.9));
    const tx = ix + ic + 9;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '1px'; ctx.fillStyle = '#eef4ff';
    ctx.fillText(wd.name.toUpperCase().slice(0, 18), tx, W.y + 15);
    const A = p.wpnAnim, out = p.wpnOut !== false;
    const st = A ? (A.k === 'draw' ? 'SACANDO' : 'GUARDANDO') : out ? (p.threatNear && p.threatNear(380) ? 'EM COMBATE' : 'EMPUNHADA') : 'NAS COSTAS';
    ctx.font = `bold 10px ${FONT_TITLE}`;
    ctx.fillStyle = st === 'EM COMBATE' ? '#ff8a7a' : out ? rgba(rgb, 0.95) : 'rgba(180,195,215,0.85)';
    ctx.fillText(st, tx, W.y + 31);
    ctx.letterSpacing = '0px';
    // troca de arma e Granada de Plasma (js/heroes/granada.js): tecla e cargas (a que volta enche aos poucos)
    const G = typeof Granada !== 'undefined' ? Granada.hud(p) : null, swap = p.nextWeapon && p.nextWeapon(), pad = game.input.lastDevice === 'pad', PL = game.input.padLabels;
    let lx = tx;
    ctx.font = `10px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,212,230,0.7)';
    if (swap) {
      const s = pad ? `${PL.rs} ${G ? 'arma' : 'trocar arma'}` : G ? '[Q] arma' : '[Q] trocar arma';
      ctx.fillText(s, lx, W.y + 47); lx += ctx.measureText(s).width + 8;
    }
    if (G) {
      const s = pad ? PL.ls : '[R]';
      ctx.fillText(s, lx, W.y + 47); lx += ctx.measureText(s).width + 7;
      for (let i = 0; i < G.max; i++) {
        const cx = lx + i * 10, cy = W.y + 47;
        ctx.strokeStyle = 'rgba(150,200,255,0.75)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, TAU); ctx.stroke();
        if (i < G.n) { ctx.fillStyle = '#9fd0ff'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fill(); }
        else if (i === G.n) { ctx.fillStyle = 'rgba(159,208,255,0.55)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 3, -Math.PI / 2, -Math.PI / 2 + TAU * G.k); ctx.closePath(); ctx.fill(); }
      }
    }
    // combo em andamento: o que cada botão faz agora
    const seq = p.combo && p.combo.seq;
    if (seq && seq !== 'D' && p.state !== 'dead') {
      const T = CHARACTER_COMBOS[heroBase(p.def.id)] || COMBO_TABLE, nx = [];
      for (const b of ['L', 'H']) {
        const id = p.combo.pick ? p.combo.pick(p.combatStyle ? p.combatStyle() : heroBase(p.def.id), seq + b) : T[seq + b];
        if (id && p.combo.isUnlocked(id) && ATTACKS[id]) nx.push(`${b === 'L' ? 'J' : 'K'} → ${(ATTACKS[id].name || (b === 'L' ? 'golpe leve' : 'golpe pesado')).toLowerCase()}`);
      }
      if (nx.length) {
        ctx.font = `bold 11px ${FONT_UI}`; ctx.textAlign = 'right';
        ctx.fillStyle = rgba(rgb, 0.95);
        ctx.fillText(`COMBO ${seq.split('').join('·')}   ${nx.join('  ·  ')}`, W.x + W.w, W.y - 12);
      }
    }
    ctx.restore();
  }

  drawAbilities(ctx, p, L) {
    const A = L.ab, inp = game.input, pad = inp.lastDevice === 'pad';
    const hot = pad && !!inp.padNow[PAD_LAYER];   // LB/L1 segurado
    ctx.save();
    ctx.globalAlpha = this.panelAlpha('abilities', A.left, A.top, VIEW_W - A.left, VIEW_H - A.top);
    // Trilho que liga os losangos (com pequenos losangos decorativos entre eles)
    ctx.fillStyle = 'rgba(90,150,255,0.28)'; ctx.fillRect(A.x0 - A.d, A.y - 0.5, A.eX - A.x0 + A.d, 1);
    ctx.fillStyle = 'rgba(140,195,255,0.55)';
    for (let k = 0; k < 4; k++) { diamondPath(ctx, A.x0 + k * A.gap + A.gap / 2, A.y - A.d + 4, 3); ctx.fill(); }
    // Controle: segure LB/L1 e aperte X, Y, B ou A (□ △ ○ ✕ no PlayStation)
    if (pad) {
      const lx = A.x0 - A.d - 26;
      ctx.font = `bold 8px ${FONT_TITLE}`; ctx.letterSpacing = '1px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = hot ? '#d6ecff' : 'rgba(168,190,220,0.75)'; ctx.fillText('SEGURE', lx, A.y - 15);
      ctx.letterSpacing = '0px';
      if (hot) this.glowAt(ctx, '80,150,255', lx, A.y + 2, 22, 0.7);
      this.keyCap(ctx, lx, A.y - 6, 'lb', hot);
    }
    const keys = ['x', 'y', 'b', 'a'];
    for (let k = 0; k < 4; k++) {
      const info = p.abilityInfo(k);
      const slotId = info ? info.id : heroProgressOf(p).slots[k];
      this.abilitySlot(ctx, A.x0 + k * A.gap, A.y, A.d, slotId, pad ? keys[k] : String(k + 1), k, p, hot);
    }
    this.eclipseSlot(ctx, A.eX, A.eY, A.D, pad ? 'lt' : 'I', p, A.y + A.d + 4);
    ctx.restore();
  }

  abilitySlot(ctx, cx, cy, d, id, key, k, p, hot) {
    const info = p.abilityInfo(k);
    id = id || (info ? info.id : null);
    const S = info ? (info.S || (id ? (SKILLS[id] || (typeof skillDef === 'function' ? skillDef(id) : null) || ABILITY_DEFS[id]) : null)) : (id ? (SKILLS[id] || (typeof skillDef === 'function' ? skillDef(id) : null) || ABILITY_DEFS[id]) : null);
    const tree = (S && S.tree) ? heroTreeOf(S.tree) : null;
    const rgb = tree ? tree.rgb : (p.def && p.def.color ? hexToRgb(p.def.color) : '120,130,150');
    const cd = S ? (p.cds[id] || 0) : 0, total = S ? Math.max(0.01, (S.cd !== undefined && S.cd !== null ? S.cd : (S.cooldown || 5)) * p.stats.cdr) : 1;
    const cost = S ? p.abilityCost(id) : 0, noE = !!S && p.fury < cost;
    const x = cx + (this.abDeny[k] > 0 ? Math.sin(this.abDeny[k] * 70) * 3 : 0);
    const state = !S ? 'empty' : cd > 0 || noE ? 'off' : 'on', fs = 2 * d + 24;
    const icon = S ? S.icon : '';
    this.blit(ctx, this.layer(`losango-${rgb}-${state}-${d}-${icon}`, fs, fs, (g) => this.paintSlot(g, fs, d, rgb, state, icon)), x - fs / 2, cy - fs / 2);
    if (S) {
      if (cd > 0) {
        ctx.save();
        diamondPath(ctx, x, cy, d - 1); ctx.clip();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.moveTo(x, cy);
        ctx.arc(x, cy, d * 1.5, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(cd / total, 0, 1));
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.font = `bold 17px ${FONT_NUM}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        const t = cd >= 1 ? String(Math.ceil(cd)) : cd.toFixed(1);
        ctx.strokeText(t, x, cy + 1); ctx.fillStyle = '#ffffff'; ctx.fillText(t, x, cy + 1);
      }
      // Custo de energia (vermelho quando falta)
      const bx = x + d * 0.5 + 4, by = cy - d * 0.5 - 4;
      ctx.fillStyle = 'rgba(3,7,16,0.96)'; ctx.beginPath(); ctx.arc(bx, by, 8.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = noE ? 'rgba(255,92,122,0.9)' : rgba(rgb, 0.65); ctx.lineWidth = 1; ctx.stroke();
      ctx.font = `bold 9px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = noE ? '#ff5c7a' : '#a8d2ff'; ctx.fillText(String(cost), bx, by + 0.5);
      if (this.abFx[k] > 0) this.glowAt(ctx, rgb, x, cy, d * 2.2, this.abFx[k] * 2.2);
    }
    this.keyCap(ctx, x, cy + d + 4, key, hot);
  }

  // pal: cores da suprema de outro personagem (sem pal = o azul do Eclipse Absoluto)
  paintEclipse(g, S, D, mode, pal) {
    const c = S / 2, Q = pal || ECLIPSE_PAL;
    if (mode === 'carga') {   // interior que enche de baixo para cima
      diamondPath(g, c, c, D - 3);
      const gr = g.createLinearGradient(0, c + D, 0, c - D);
      gr.addColorStop(0, Q.lo); gr.addColorStop(1, Q.hi);
      g.fillStyle = gr; g.fill();
      return;
    }
    if (mode === 'pronto') {  // contorno aceso
      g.shadowColor = Q.glow; g.shadowBlur = 14;
      diamondPath(g, c, c, D); g.strokeStyle = Q.edge; g.lineWidth = 2.4; g.stroke();
      g.shadowBlur = 0;
      diamondPath(g, c, c, D - 6); g.strokeStyle = Q.inner; g.lineWidth = 1; g.stroke();
      return;
    }
    diamondPath(g, c, c, D);
    g.fillStyle = 'rgba(4,8,18,0.95)'; g.fill();
    if (mode === 'base') {
      diamondPath(g, c, c, D); g.strokeStyle = Q.base; g.lineWidth = 2; g.stroke();
      diamondPath(g, c, c, D - 6); g.strokeStyle = Q.base2; g.lineWidth = 1; g.stroke();
      g.fillStyle = Q.dot;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { g.beginPath(); g.arc(c + dx * (D + 6), c + dy * (D + 6), 1.6, 0, TAU); g.fill(); }
    } else {
      diamondPath(g, c, c, D); g.strokeStyle = 'rgba(120,130,150,0.4)'; g.lineWidth = 1.5; g.stroke();
    }
  }
  eclipseSlot(ctx, cx, cy, D, key, p, capY) {
    const U = heroUltInfo(p), learned = U.learned;   // suprema do personagem ativo (Kael: Eclipse Absoluto)
    const k = clamp(p.fury / p.ultCost(), 0, 1), ready = learned && k >= 1;
    const x = cx + (this.furyDeny > 0 ? Math.sin(this.furyDeny * 80) * 3 : 0);
    const pal = U.rgb ? ultPalette(U.rgb) : null;
    const S = 2 * D + 30, lay = (mode) => this.layer(`eclipse-${mode}-${D}${pal ? '-' + U.rgb : ''}`, S, S, (g) => this.paintEclipse(g, S, D, mode, pal));
    if (ready) this.glowAt(ctx, U.rgb || '80,150,255', x, cy, D * (2 + 0.25 * Math.sin(this.time * 8)), 0.75);
    this.blit(ctx, lay(learned ? 'base' : 'bloqueado'), x - S / 2, cy - S / 2);
    if (learned) {
      // Carga: o losango enche de baixo para cima até os 100 de energia
      const c = lay('carga'), top = S / 2 - (D - 3), hh = 2 * (D - 3), fh = hh * k;
      if (fh > 0.5) {
        const sc = c.width / c.lw;
        ctx.drawImage(c, 0, (top + hh - fh) * sc, c.width, fh * sc, x - S / 2, cy - S / 2 + top + hh - fh, S, fh);
        if (!ready) { ctx.fillStyle = 'rgba(210,235,255,0.75)'; const w = (D - 3) * (1 - Math.abs(hh - fh - (D - 3)) / (D - 3)); ctx.fillRect(x - w, cy - (D - 3) + hh - fh, 2 * w, 1.2); }
      }
      if (ready) {
        const ga = ctx.globalAlpha;
        ctx.globalAlpha = ga * (0.75 + 0.25 * Math.sin(this.time * 8));
        this.blit(ctx, lay('pronto'), x - S / 2, cy - S / 2);
        ctx.globalAlpha = ga;
      }
      if (this.furyReadyT > 0) {   // acabou de encher: onda saindo do losango
        const t = 1 - this.furyReadyT / 1.4;
        ctx.strokeStyle = `rgba(190,225,255,${(0.9 * (1 - t)).toFixed(3)})`; ctx.lineWidth = 2;
        diamondPath(ctx, x, cy, D + 4 + t * 26); ctx.stroke();
      }
      drawSkillIcon(ctx, U.icon, x, cy, D * 0.95, ready ? '#f2f8ff' : 'rgba(170,200,240,0.8)');
    } else {
      drawIcon(ctx, 'lock', x, cy - 5, D * 0.5, 'rgba(150,160,180,0.65)');
      ctx.font = `bold 9px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(180,190,210,0.75)';
      ctx.fillText(`NV ${U.lvl}`, x, cy + 15);
    }
    this.keyCap(ctx, x, capY, key, ready);
  }

  // Efeitos ativos (tempo restante), empilhados acima das habilidades
  drawBuffs(ctx, L) {
    if (!this.buffs.length) return;
    ctx.save();
    ctx.font = `bold 11px ${FONT_UI}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    this.buffs.forEach(([icon, tLeft, rgb, label], i) => {
      const txt = tLeft > 0 ? `${label} ${tLeft.toFixed(1)}s` : label, w = ctx.measureText(txt).width + 30;   // sem tempo: efeito contínuo
      const bx = VIEW_W - 22 - w, by = L.ab.top - 30 - i * 24;
      ctx.fillStyle = 'rgba(3,7,16,0.78)'; ctx.fillRect(bx, by, w, 20);
      ctx.strokeStyle = rgba(rgb, 0.7); ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, 19);
      drawSkillIcon(ctx, icon, bx + 11, by + 10, 15, rgba(rgb, 1));
      ctx.fillStyle = '#e8f0fb'; ctx.fillText(txt, bx + 22, by + 10);
    });
    ctx.restore();
  }

  // ------------------------------------------------------- avisos e textos
  drawToasts(ctx) {
    if (!this.toasts.length) return;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 14px ${FONT_UI}`;
    // Empilhados de baixo para cima no espaço livre entre as células e as habilidades;
    // um aviso que não cabe em uma linha quebra em duas (e só encolhe se ainda faltar espaço)
    let yb = VIEW_H - 35;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const q = this.toasts[i];
      const a = clamp(q.t < 0.15 ? q.t / 0.15 : q.t > q.max - 0.4 ? (q.max - q.t) / 0.4 : 1, 0, 1);
      const S = this.freeSpan(yb - 40, yb), room = S.max - S.min;
      let w = ctx.measureText(q.text).width + 28, lines = null;
      if (w > room) {
        lines = this.wrapCached(ctx, q.text, room - 28, 2);
        w = 28;
        for (const ln of lines) w = Math.max(w, ctx.measureText(ln).width + 28);
      }
      const h = lines ? 38 : 22, k = Math.min(1, room / w);
      const cx = clamp(VIEW_W / 2, S.min + (w * k) / 2, S.max - (w * k) / 2);
      ctx.save();
      ctx.translate(cx, yb - (h * k) / 2); ctx.scale(k, k);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(3,7,16,0.84)'; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = rgba(q.rgb, 1); ctx.fillRect(-w / 2, -h / 2, 3, h);
      if (lines) { ctx.fillText(lines[0], 0, -7); if (lines[1]) ctx.fillText(lines[1], 0, 10); }
      else ctx.fillText(q.text, 0, 1);
      ctx.restore();
      yb -= h * k + 4;
    }
    ctx.restore();
  }

  drawLevelUp(ctx, L) {
    const Lv = this.lvl;
    if (!Lv) return;
    const k = Lv.t / Lv.max, PL = PROG.perLevel;
    const a = clamp(k < 0.06 ? k / 0.06 : k > 0.85 ? (1 - k) / 0.15 : 1, 0, 1);
    const x = 14 - (1 - Math.min(1, Lv.t * 5)) * 40, y = L.lvlY, w = 398;
    const fresh = Lv.fresh.length > 2 ? Lv.fresh.slice(0, 2).join(', ') + ` e mais ${Lv.fresh.length - 2}` : Lv.fresh.join(', ');
    const h = fresh ? 108 : 86;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(16,8,34,0.84)';
    techPanelPath(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(185,150,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    this.glowAt(ctx, '150,110,255', x + 60, y + 34, 90, 0.35 * (0.6 + 0.4 * Math.sin(this.time * 6)));
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '4px'; ctx.fillStyle = '#c8b8ff';
    ctx.fillText('EVOLUÇÃO', x + 16, y + 18);
    ctx.font = `bold 28px ${FONT_TITLE}`;
    glowText(ctx, `NÍVEL ${Lv.level}`, x + 16, y + 44, '#f4f0ff', 'rgba(150,110,255,0.95)', 16);
    ctx.letterSpacing = '0px';
    ctx.font = `bold 13px ${FONT_UI}`;
    const tab = game.input.lastDevice === 'pad' ? game.input.padLabels.back : 'Tab';
    glowText(ctx, `+${Lv.sp} ponto${Lv.sp > 1 ? 's' : ''} · [${tab}] árvore`, x + 196, y + 44, '#ffe7a8', 'rgba(255,180,60,0.7)', 8);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = '#d9d2f5';
    ctx.fillText(`+${PL.hp} vida · +${PL.energy} energia · +${Math.round(PL.dmg * 100)}% dano · +${Math.round(PL.power * 100)}% poder`, x + 16, y + 70);
    if (fresh) {
      ctx.font = `italic 12px ${FONT_UI}`; ctx.fillStyle = '#a8d8ff';
      ctx.fillText(`Disponível: ${fresh}`, x + 16, y + 92);
    }
    ctx.restore();
  }

  drawSaved(ctx, L) {
    if (this.savedT <= 0) return;
    const x = L.cellsX + L.cellsS + 18, y = VIEW_H - 28;
    ctx.save();
    ctx.globalAlpha = clamp(this.savedT, 0, 1) * 0.85;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
    ctx.strokeStyle = '#a8d8ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x + 6, y, 6, (this.time * 3) % TAU, (this.time * 3) % TAU + TAU * 0.75); ctx.stroke();
    ctx.fillStyle = '#a8d8ff';
    ctx.fillText('PROGRESSO SALVO', x + 18, y);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  drawCombo(ctx, L) {
    const c = game.counter;
    const show = c.count >= 2;
    ctx.save();
    const x = VIEW_W - 40, y = L.comboY;
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
    // Novo nível de combo: aparece logo abaixo do contador (acima fica o painel de missão)
    if (this.tier) {
      const k = this.tier.t / 1.2;
      ctx.globalAlpha = 1 - k;
      ctx.font = `italic bold ${Math.round(26 + 10 * (1 - k))}px ${FONT_TITLE}`;
      glowText(ctx, this.tier.label + '!', x, y + 100 - k * 10, '#eaf4ff', 'rgba(60,140,255,0.95)', 18);
    }
    ctx.restore();
  }

  // Nomes das técnicas: centralizados no espaço livre entre os painéis (encolhem se faltar espaço)
  drawComboNames(ctx) {
    if (!this.names.length) return;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let y = 160;
    for (const n of this.names) {
      const k = n.t / n.max;
      const sIn = Math.min(1, n.t / 0.14);
      const base = n.big ? 1.3 : 1;
      const scale = base * (0.6 + 0.4 * easeOutBack(sIn));
      const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.font = `bold italic 30px ${FONT_TITLE}`;
      ctx.letterSpacing = '3px';
      const tw = ctx.measureText(n.text).width, half = (tw / 2 + 54) * base;
      const S = this.freeSpan(y - 22 * base, y + 22 * base);
      const fit = Math.min(1, (S.max - S.min) / (2 * half));
      const cx = clamp(VIEW_W / 2, S.min + half * fit, S.max - half * fit);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(cx, y - k * 12);
      ctx.scale(scale * fit, scale * fit);
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(2,6,16,0.85)';
      ctx.strokeText(n.text, 0, 0);
      let g = this.nameGrad;   // degradê em coordenadas locais: criado uma vez só
      if (!g) {
        g = this.nameGrad = ctx.createLinearGradient(0, -16, 0, 16);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, PAL.accentHi); g.addColorStop(1, '#3d8bff');
      }
      glowText(ctx, n.text, 0, 0, g, 'rgba(40,120,255,0.95)', 16);
      // Linhas decorativas
      const w = tw / 2 + 14;
      ctx.letterSpacing = '0px';
      ctx.strokeStyle = 'rgba(61,139,255,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-w - 40 * sIn, 0); ctx.lineTo(-w, 0); ctx.moveTo(w, 0); ctx.lineTo(w + 40 * sIn, 0); ctx.stroke();
      ctx.restore();
      y += 44 * Math.max(0.75, fit);
    }
    ctx.restore();
  }

  // Barra do chefe: centralizada no espaço livre entre o bloco de vida e o radar
  drawBossBar(ctx, L) {
    const b = game.boss;
    if (!b || (!b.alive && b.state !== 'dying')) return;
    const x0 = HUDV.right, x1 = L.radar.x - L.radar.r - 24;
    const w = Math.round(Math.min(600, x1 - x0 - 20)), x = Math.round((x0 + x1) / 2 - w / 2), y = 34, cx = x + w / 2;
    const intro = b.state === 'intro' ? clamp(b.stateTime / 2.5, 0, 1) : 1;
    const fs = w < 420 ? 13 : 16;
    ctx.save();
    const name = this.layer(`chefe-nome-${w}-${b.name}`, w + 60, 28, (g, lw, lh) => {
      g.font = `bold ${fs}px ${FONT_TITLE}`; g.letterSpacing = '2px'; g.textAlign = 'center'; g.textBaseline = 'bottom';
      g.shadowColor = 'rgba(90,230,255,0.85)'; g.shadowBlur = 10; g.fillStyle = '#e6fbff';
      g.fillText(b.name, lw / 2, lh - 4);
    });
    this.blit(ctx, name, cx - (w + 60) / 2, y - 2 - 28);
    ctx.fillStyle = 'rgba(2,8,14,0.85)';
    ctx.fillRect(x - 4, y - 2, w + 8, 20);
    const frac = (b.hp / b.maxHp) * intro, p3 = b.phase === 3;
    const ghost = this.bossGhost * intro;
    if (ghost > frac) this.blitPart(ctx, this.layer(`chefe-fantasma-${w}`, w, 16, (g, lw, lh) => { g.fillStyle = 'rgba(220,235,255,0.7)'; g.fillRect(0, 0, lw, lh); }), x, y, ghost);
    this.blitPart(ctx, this.layer(`chefe-${w}-${p3 ? 3 : 1}`, w, 16, (g, lw, lh) => this.paintBarFill(g, lw, lh, 0, 'slant', '#08303c', p3 ? '#ff2e55' : '#5ff0ff')), x, y, frac);
    // Marcadores das fases
    ctx.fillStyle = PAL.accentHi;
    for (const m of [0.66, 0.33]) ctx.fillRect(x + w * m - 1, y - 3, 2, 22);
    ctx.strokeStyle = 'rgba(120,235,255,0.8)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, 17);
    // Estabilidade (poise): quando zera, NEXUS fica instável
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y + 21, w, 4);
    ctx.fillStyle = b.state === 'stagger' ? '#ffffff' : 'rgba(170,240,255,0.85)';
    ctx.fillRect(x, y + 21, w * clamp(b.state === 'stagger' ? 1 - b.stateTime / 1.8 : b.poise / b.maxPoise, 0, 1), 4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = `bold 12px ${FONT_TITLE}`; ctx.fillStyle = 'rgba(223,230,242,0.8)';
    ctx.fillText(`FASE ${['I', 'II', 'III'][b.phase - 1]}`, cx, y + 28);
    ctx.restore();
  }

  // Letreiros dos chefes ('low') ficam abaixo da ação; se houver uma legenda na tela, sobem
  // até logo acima da caixa dela (deslizando, caso a fala comece depois do letreiro)
  msgY(m) {
    const base = VIEW_H * (m.low ? 0.72 : 0.3);
    if (!m.low) return base;
    const B = this.sb, lift = B && B.on ? Math.max(0, base - (B.by - 44)) : 0;
    this.msgLift = m.t < 0.05 ? lift : approach(this.msgLift || 0, lift, this.frameDt * 600);
    return base - this.msgLift;
  }
  drawMessage(ctx, L) {
    const m = this.msg;
    if (!m) return;
    const k = m.t / m.max;
    const a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = L.msgY;
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

  // Caixa da legenda atual (linhas já quebradas), calculada uma vez por quadro em layout().
  // Ela deixa livres as colunas dos cantos (efeitos ativos e habilidades).
  subBox(ctx) {
    const s = this.sub, B = this.sb || (this.sb = {});
    B.on = !!s && s.t >= 0;
    if (!B.on) return B;
    B.st = SPEAKERS[s.who] || SPEAKER_DEFAULT;
    B.fs = Settings.v.subtitleSize ? 21 : 17;
    B.font = `${B.st.whisper ? 'italic ' : ''}${B.fs}px ${FONT_UI}`;
    B.bw = Math.min(800, VIEW_W - 340);
    ctx.save();
    ctx.font = B.font;
    B.lines = this.wrapCached(ctx, s.text, B.bw - 40);
    ctx.restore();
    B.lh = Math.round(B.fs * 1.35); B.bh = 42 + B.lines.length * B.lh;
    B.bx = VIEW_W / 2 - B.bw / 2; B.by = VIEW_H - 138 - B.bh;
    return B;
  }
  // Legenda de diálogo na parte de baixo da tela (texto digitado aos poucos)
  drawSubtitle(ctx) {
    const s = this.sub, B = this.sb;
    if (!s || !B || !B.on) return;
    const st = B.st, k = s.t / s.max;
    const a = clamp(k < 0.08 ? k / 0.08 : k > 0.85 ? (1 - k) / 0.15 : 1, 0, 1);
    const shown = Math.floor(s.t * 48 * Settings.textRate());
    ctx.save();
    ctx.globalAlpha = a * (st.whisper ? 0.65 + 0.35 * Math.sin(this.time * 9) : 1);
    if (!st.whisper) {
      ctx.fillStyle = 'rgba(2,6,14,0.72)';
      techPanelPath(ctx, B.bx, B.by, B.bw, B.bh, 12); ctx.fill();
      ctx.strokeStyle = st.glow; ctx.lineWidth = 1; ctx.stroke();
    }
    const jx = st.glitch && Math.random() < 0.08 ? rand(-4, 4) : 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = `bold 12px ${FONT_TITLE}`;
    ctx.letterSpacing = '3px';
    ctx.fillStyle = st.color;
    ctx.fillText(s.who, VIEW_W / 2 + jx, B.by + 10);
    ctx.letterSpacing = '0px';
    ctx.font = B.font;
    // Distribui o texto já digitado pelas linhas
    let left = shown;
    B.lines.forEach((ln, i) => {
      const part = left >= ln.length ? ln : ln.slice(0, Math.max(0, left));
      left -= ln.length + 1;
      glowText(ctx, part, VIEW_W / 2 + jx, B.by + 30 + i * B.lh, st.whisper ? '#cfe6ff' : '#eef3fa', st.glow, st.whisper ? 14 : 6);
    });
    ctx.restore();
  }

  // Linhas da memória atual (quebradas uma vez) e a altura do texto na tela
  memLines(ctx) {
    ctx.save();
    ctx.font = `italic 21px ${FONT_UI}`;
    const maxW = Math.min(820, VIEW_W - 120), lines = this.wrapCached(ctx, this.mem.text, maxW);
    let w = 0;
    for (const ln of lines) w = Math.max(w, ctx.measureText(ln).width);
    ctx.restore();
    const M = this.memL || (this.memL = {});
    M.lines = lines; M.w = w; M.y = 172;
    return M;
  }
  // Fragmento de memória: lembrança que invade a tela por alguns segundos
  drawMemory(ctx) {
    const m = this.mem;
    if (!m) return;
    const k = m.t / m.max, M = this.memLines(ctx), y = M.y;
    const a = clamp(k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    const band = this.layer('memoria-faixa', 4, 150, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(10,30,70,0)'); gr.addColorStop(0.4, 'rgba(10,30,70,0.6)'); gr.addColorStop(1, 'rgba(10,30,70,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    ctx.drawImage(band, 0, y - 64, VIEW_W, 150 + Math.max(0, M.lines.length - 2) * 28);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 13px ${FONT_TITLE}`;
    ctx.letterSpacing = '4px';
    ctx.fillStyle = PAL.accent;
    ctx.fillText(`FRAGMENTO DE MEMÓRIA ${m.idx} / ${MEMORIES.length}`, VIEW_W / 2, y - 30);
    ctx.letterSpacing = '0px';
    ctx.font = `italic 21px ${FONT_UI}`;
    M.lines.forEach((ln, i) => glowText(ctx, ln, VIEW_W / 2 + (Math.random() < 0.03 ? rand(-3, 3) : 0), y + 4 + i * 28, '#eaf4ff', 'rgba(80,160,255,0.95)', 14));
    ctx.restore();
  }

  // Marcador de conversa acima do NPC mais próximo
  drawTalkPrompt(ctx) {
    const n = game.talkTarget;
    if (!n) return;
    const q = hudHeadPoint(n, 16) || { x: VIEW_W / 2, y: VIEW_H / 2 };
    const key = game.input.lastDevice === 'pad' ? game.input.padLabels.x : 'E';
    ctx.save();
    ctx.font = `bold 12px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = `${n.verb || 'Falar'} · ${n.name}`, w = ctx.measureText(txt).width + 40, bob = Math.sin(this.time * 4) * 2;   // verb: objetos do mundo aberto
    ctx.fillStyle = 'rgba(3,7,16,0.82)';
    techPanelPath(ctx, q.x - w / 2, q.y - 12 + bob, w, 24, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,212,122,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ffd47a'; ctx.fillRect(q.x - w / 2 + 6, q.y - 7 + bob, 16, 14);
    ctx.fillStyle = '#1a1200'; ctx.fillText(key, q.x - w / 2 + 14, q.y + 1 + bob);
    ctx.fillStyle = '#eef3fa'; ctx.fillText(txt, q.x + 10, q.y + 1 + bob);
    ctx.restore();
  }

  // Marcadores do fragmento de memória e da saída (acima do objeto quando visível). Fora da
  // tela, uma seta ao redor de Kael aponta para eles e para NEXUS, longe dos painéis dos
  // cantos. Os demais inimigos aparecem no radar.
  drawIndicators(ctx) {
    const cam = game.camera, pl = game.player;
    ctx.save();
    const pp = cam.toScreen(isoX(pl.x, pl.y), isoY(pl.x, pl.y) - 30), ox = pp.x, oy = pp.y;
    const off = (x, y) => x < 0 || x > VIEW_W || y < 0 || y > VIEW_H;
    // Setas em direções parecidas (saída e memória lado a lado) vão para um anel mais afastado
    const used = this.guideA || (this.guideA = []);
    used.length = 0;
    const guide = (sx, sy, rgb, label) => {
      const a = Math.atan2(sy - oy, sx - ox);
      let ring = 0;
      for (const u of used) { const d = Math.abs(((a - u + Math.PI * 3) % TAU) - Math.PI); if (d < 0.5) ring++; }
      used.push(a);
      const k0 = 1 + ring * 0.4, ex = ox + Math.cos(a) * 118 * k0, ey = oy + Math.sin(a) * 86 * k0;
      const k = 0.7 + 0.3 * Math.sin(this.time * 5);
      ctx.save();
      ctx.translate(ex, ey); ctx.rotate(a);
      ctx.fillStyle = rgba(rgb, 0.9 * k);
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-4, -8); ctx.lineTo(0, 0); ctx.lineTo(-4, 8); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(rgb, 0.85);
      ctx.fillText(label, ex - Math.cos(a) * 22, ey - Math.sin(a) * 18 - 2);
      ctx.letterSpacing = '0px';
    };
    const marker = (sx, sy, rgb, label) => {
      if (off(sx, sy) || this.inZone(sx, sy - 52)) { guide(sx, sy, rgb, label); return; }   // embaixo de um painel: seta
      const bob = Math.sin(this.time * 5) * 6;
      ctx.fillStyle = rgba(rgb, 1);
      ctx.beginPath(); ctx.moveTo(sx, sy - 40 + bob); ctx.lineTo(sx - 10, sy - 56 + bob); ctx.lineTo(sx + 10, sy - 56 + bob); ctx.closePath(); ctx.fill();
      ctx.font = `bold 13px ${FONT_TITLE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.letterSpacing = '2px';
      ctx.fillText(label, sx, sy - 64 + bob);
      ctx.letterSpacing = '0px';
    };
    const b = game.boss;
    if (b && b.alive && b.state !== 'dying') {
      const q = cam.toScreen(isoX(b.x, b.y), isoY(b.x, b.y) - 20);
      if (off(q.x, q.y)) guide(q.x, q.y, '90,230,255', 'NEXUS');
    }
    const mem = game.pickups.find('memory');
    if (mem) {
      const q = cam.toScreen(isoX(mem.x, mem.y), isoY(mem.x, mem.y) - 30);
      marker(q.x, q.y, '170,215,255', 'MEMÓRIA');
    }
    if (game.waves.state === 'cleared') {
      const d = game.room.door;
      const q = cam.toScreen(isoX(d.x, 0), isoY(d.x, 0) - 60);
      marker(q.x, q.y, '110,190,255', 'SAÍDA');
    }
    ctx.restore();
  }
}

// Ponto da tela logo acima da cabeça de um NPC (ou objeto), 'up' px acima; na 3ª pessoa pela
// projeção da câmera (null quando fica atrás dela)
function hudHeadPoint(n, up) {
  if (typeof ThirdView !== 'undefined' && ThirdView.active()) {
    const P = ThirdView.proj(n.x, n.y, (n.height || 40) + 14);
    return P.vis ? { x: P.x, y: P.y - up } : null;
  }
  const h = n.headPoint();
  return game.camera.toScreen(h.x, h.y - up);
}
