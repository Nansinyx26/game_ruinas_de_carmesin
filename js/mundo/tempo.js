'use strict';
// ECLIPSE ZERO · Mundo aberto: ciclo de dia e noite e clima por região (WorldTime)
// ---------------------------------------------------------------------------
// O relógio do mundo (World.state.hora, de 0 a 24) anda sempre que se joga no modo mundo:
// um dia inteiro dura DIA_SEG segundos reais. A luz do dia clareia as zonas abertas (biomas,
// cidade) e quase não mexe nos interiores (laboratório, túneis); amanhecer e entardecer
// tingem a tela de laranja e a noite, de azul. Cada região tem os próprios climas, sorteados
// com peso e trocados a cada poucos minutos (chuva, tempestade com raios, neve, nevasca,
// tempestade de areia, cinzas, brasas, neblina, vaga-lumes à noite). O clima é desenhado na
// tela (partículas e véu), por cima da vista isométrica e da 3ª pessoa.
// Efeito no jogo: à noite e com pouca visibilidade os acampamentos demoram mais a notar o
// herói (senseMult) e as abates à noite dão mais experiência (xpMult).
// ---------------------------------------------------------------------------
const WORLD_CLIMAS = {
  limpo: { name: 'CÉU LIMPO' },
  chuva: { name: 'CHUVA', rain: 0.75, sense: 0.9 },
  tempestade: { name: 'TEMPESTADE', rain: 1, bolts: 0.12, sense: 0.85, dark: 0.08 },
  neve: { name: 'NEVE', flakes: 70, sense: 0.9 },
  nevasca: { name: 'NEVASCA', flakes: 170, wind: 2.2, veil: '220,230,255', veilA: 0.16, sense: 0.75, dark: 0.04 },
  areia: { name: 'TEMPESTADE DE AREIA', sand: 140, veil: '210,150,80', veilA: 0.2, sense: 0.75 },
  cinzas: { name: 'CHUVA DE CINZAS', ash: 90, embers: 14, veil: '60,30,20', veilA: 0.1, sense: 0.9 },
  brasas: { name: 'BRASAS NO AR', embers: 26 },
  neblina: { name: 'NEBLINA', fog: true, veil: '170,210,230', veilA: 0.12, sense: 0.8 },
  vagalumes: { name: 'VAGA-LUMES', fireflies: 30, night: true },
};
// Climas de cada região, com peso no sorteio
const WORLD_CLIMA_REG = {
  carmesin: { limpo: 4, brasas: 3, chuva: 2, tempestade: 1 },
  velmora: { limpo: 4, chuva: 3, neblina: 2, vagalumes: 3, tempestade: 1 },
  lagoa: { limpo: 3, neblina: 3, chuva: 3, tempestade: 1 },
  nexus: { limpo: 3, chuva: 4, tempestade: 2, neblina: 1 },
  seraph: { limpo: 5, areia: 4 },
  asterion: { limpo: 2, neve: 5, nevasca: 3 },
  obsidiano: { cinzas: 5, brasas: 3, limpo: 1 },
};

const WorldTime = {
  DIA_SEG: 600,        // um dia do mundo em segundos reais (10 min)
  parts: [],           // partículas do clima (em pixels da tela)
  boltT: 0,

  get S() { return World.state; },
  hora() { return this.S && this.S.hora !== undefined ? this.S.hora : 9; },
  // 0 de noite, 1 em pleno dia (com amanhecer 5h–7h30 e entardecer 17h30–19h30 suaves)
  luz(h = this.hora()) {
    const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    return sm(5, 7.5, h) * (1 - sm(17.5, 19.5, h));
  },
  fase(h = this.hora()) {
    return h < 5 ? 'MADRUGADA' : h < 8 ? 'AMANHECER' : h < 17.5 ? 'DIA' : h < 19.5 ? 'ENTARDECER' : 'NOITE';
  },
  noite() { return this.luz() < 0.25; },
  clima() { const c = this.S && this.S.clima; return (c && WORLD_CLIMAS[c.tipo]) ? c.tipo : 'limpo'; },
  C() { return WORLD_CLIMAS[this.clima()]; },
  // Quanto a sala é "a céu aberto": biomas 1, cidade 0.8, topo da torre 0.6, interiores 0.25
  aberto(th) { return th.deco === 'natural' ? 1 : th.sky === 'city' ? 0.8 : th.sky === 'tower' ? 0.6 : 0.25; },

  // Escuridão da sala com a hora e o clima (a da tabela de temas é a do fim de tarde)
  escuridao(th) {
    const o = this.aberto(th), d = this.luz(), C = this.C();
    return clamp(th.darkness - 0.3 * o * d + 0.1 * o * (1 - d) + (C.dark || 0), 0.3, 0.95);
  },
  // Luz ambiente da 3ª pessoa (multiplica a do tema)
  ambiente(th) { const o = this.aberto(th); return 1 - o * 0.45 * (1 - this.luz()); },
  // Acampamentos percebem o herói mais de perto à noite e com pouca visibilidade
  senseMult() { return (this.noite() ? 0.75 : 1) * (this.C().sense || 1); },
  xpMult() { return this.noite() ? 1.2 : 1; },

  // Sorteia um clima da região (sem repetir o atual, se der)
  sortear(reg) {
    const T = WORLD_CLIMA_REG[reg] || { limpo: 1 }, atual = this.clima();
    let tot = 0;
    const ok = (k) => (k !== atual || Object.keys(T).length === 1) && (!WORLD_CLIMAS[k].night || this.noite());
    for (const k in T) if (ok(k)) tot += T[k];
    let r = Math.random() * tot;
    for (const k in T) { if (!ok(k)) continue; r -= T[k]; if (r <= 0) return k; }
    return 'limpo';
  },
  definir(tipo, reg, avisar = true) {
    this.S.clima = { tipo, reg, t: rand(120, 240) };
    this.parts.length = 0;
    if (avisar && game.hud) game.hud.toast(`Clima · ${WORLD_CLIMAS[tipo].name}`, '170,200,230');
  },

  update(dt) {
    const S = this.S;
    if (!S) return;
    const antes = this.fase();
    S.hora = ((S.hora === undefined ? 9 : S.hora) + dt * 24 / this.DIA_SEG) % 24;
    if (S.hora < dt * 24 / this.DIA_SEG) S.dia = (S.dia || 1) + 1;   // virou o dia (o mercador renova o estoque)
    const agora = this.fase();
    if (agora !== antes && (agora === 'NOITE' || agora === 'AMANHECER')) game.hud.toast(agora === 'NOITE' ? 'Anoiteceu · inimigos notam menos, abates dão +20% de experiência' : 'Amanheceu', agora === 'NOITE' ? '120,150,255' : '255,190,120');
    // clima: troca ao mudar de região ou quando o tempo dele acaba (vaga-lumes só à noite)
    const reg = World.zone ? World.zone.region : 'carmesin';
    if (!S.clima || S.clima.reg !== reg) this.definir(this.sortear(reg), reg, !!S.clima);
    else if ((S.clima.t -= dt) <= 0 || (this.C().night && !this.noite())) this.definir(this.sortear(reg), reg);
    // raios da tempestade (o céu acende e troveja)
    const C = this.C();
    if (C.bolts && Math.random() < dt * C.bolts) { game.skyFlash = 1; game.skyBoltX = rand(0.15, 0.85); game.skySeed = (Math.random() * 1e6) | 0; game.audio.play('thunder', 0.35); }
    this.simular(dt, C);
  },
  // Partículas do clima em coordenadas da tela (VIEW_W × VIEW_H)
  simular(dt, C) {
    const P = this.parts, W = VIEW_W, H = VIEW_H, wind = C.wind || 0.4;
    const want = (C.flakes || 0) + (C.sand || 0) + (C.ash || 0) + (C.embers || 0) + (C.fireflies || 0);
    while (P.length < want) {
      const k = P.length < (C.flakes || 0) ? 'neve' : P.length < (C.flakes || 0) + (C.sand || 0) ? 'areia'
        : P.length < (C.flakes || 0) + (C.sand || 0) + (C.ash || 0) ? 'cinza' : P.length < want - (C.fireflies || 0) ? 'brasa' : 'luz';
      P.push({ k, x: rand(0, W), y: rand(0, H), s: rand(0.5, 1.5), ph: rand(0, TAU) });
    }
    if (P.length > want) P.length = want;
    for (const q of P) {
      q.ph += dt;
      if (q.k === 'neve') { q.x += (wind * 40 + Math.sin(q.ph * 1.7) * 18) * q.s * dt; q.y += (40 + wind * 30) * q.s * dt; }
      else if (q.k === 'areia') { q.x += 520 * q.s * dt; q.y += Math.sin(q.ph * 3) * 30 * dt + 40 * dt; }
      else if (q.k === 'cinza') { q.x += (20 + Math.sin(q.ph) * 14) * dt; q.y += 26 * q.s * dt; }
      else if (q.k === 'brasa') { q.x += Math.sin(q.ph * 1.3) * 22 * dt; q.y -= 50 * q.s * dt; }
      else { q.x += Math.cos(q.ph * 0.7 + q.s * 3) * 24 * dt; q.y += Math.sin(q.ph * 0.9) * 18 * dt; }
      if (q.x > W + 20) q.x -= W + 40; if (q.x < -20) q.x += W + 40;
      if (q.y > H + 20) q.y -= H + 40; if (q.y < -20) q.y += H + 40;
    }
  },

  // Por cima do mundo (antes do HUD): tinta da hora, véu e partículas do clima
  drawOverlay(ctx) {
    if (!this.S || !game.room) return;
    const th = game.room.theme, o = this.aberto(th), d = this.luz(), h = this.hora(), C = this.C(), t = game.realTime;
    ctx.save();
    // amanhecer e entardecer em laranja; a noite em azul (só no que é a céu aberto)
    const dourado = Math.max(0, 1 - Math.abs(h - 6.4) / 1.6) + Math.max(0, 1 - Math.abs(h - 18.4) / 1.6);
    if (dourado > 0) { ctx.fillStyle = `rgba(255,140,60,${(0.11 * o * Math.min(1, dourado)).toFixed(3)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (d < 1) { ctx.fillStyle = `rgba(20,40,120,${(0.16 * o * (1 - d)).toFixed(3)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (C.veil) {
      const a = C.veilA * (0.8 + 0.2 * Math.sin(t * 0.7));
      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, rgba(C.veil, a * 1.3)); g.addColorStop(1, rgba(C.veil, a * 0.6));
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (C.fog) {
      // faixas de neblina passando devagar
      for (let k = 0; k < 4; k++) {
        const y = VIEW_H * (0.25 + k * 0.2) + Math.sin(t * 0.3 + k) * 20, x = ((t * (12 + k * 5)) % (VIEW_W + 600)) - 300;
        const g = ctx.createRadialGradient(x, y, 10, x, y, 320);
        g.addColorStop(0, 'rgba(190,225,240,0.14)'); g.addColorStop(1, 'rgba(190,225,240,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 320, y - 320, 640, 640);
      }
    }
    if (C.rain && typeof Backdrop !== 'undefined') Backdrop.drawRain(ctx, t, C.rain);
    for (const q of this.parts) {
      if (q.k === 'neve') { ctx.fillStyle = 'rgba(240,246,255,0.85)'; ctx.beginPath(); ctx.arc(q.x, q.y, 1.2 + q.s, 0, TAU); ctx.fill(); }
      else if (q.k === 'areia') { ctx.strokeStyle = 'rgba(230,180,110,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - 18 * q.s, q.y - 2); ctx.stroke(); }
      else if (q.k === 'cinza') { ctx.fillStyle = 'rgba(120,110,105,0.7)'; ctx.fillRect(q.x, q.y, 1.5 + q.s, 1.5 + q.s); }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const q of this.parts) {
      if (q.k === 'brasa') GlowCache.draw(ctx, '255,110,40', q.x, q.y, 5 + q.s * 3, 0.5 + 0.3 * Math.sin(q.ph * 6));
      else if (q.k === 'luz') GlowCache.draw(ctx, '170,255,120', q.x, q.y, 7 + q.s * 3, Math.max(0, Math.sin(q.ph * 1.6 + q.s * 5)) * 0.7);
    }
    ctx.restore();
  },
  // Relógio no HUD (no lugar da pontuação, que não conta no mundo): ☀/☾ 14:20 · clima
  drawHud(ctx, x, y) {
    const h = this.hora(), hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10, dia = this.luz() > 0.5;
    ctx.save();
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.font = `22px ${FONT_NUM}`;
    const txt = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, tw = ctx.measureText(txt).width;
    ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(2,6,16,0.85)'; ctx.strokeText(txt, x, y);
    ctx.fillStyle = dia ? '#fff1d0' : '#cfe0ff'; ctx.fillText(txt, x, y);
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
    ctx.fillStyle = dia ? 'rgba(255,200,110,0.95)' : 'rgba(140,170,255,0.95)';
    ctx.fillText(`${dia ? '☀' : '☾'} ${this.fase()} · ${this.C().name}`, x - tw - 10, y - 2);
    ctx.letterSpacing = '0px';
    ctx.restore();
  },
};
