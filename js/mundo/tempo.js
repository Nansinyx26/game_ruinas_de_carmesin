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
// INTENSIDADE E TRANSIÇÃO: cada clima tem uma intensidade (k, de 0 a 1) sorteada na faixa dele
// (chuva fraca ou moderada, tempestade; neve fraca ou nevasca; neblina leve ou densa) e a troca é
// gradual: o clima atual some aos poucos (~8 s) e o próximo cresce no lugar. O resto do clima
// (poças, neve no chão, temperatura do corpo, roupa molhada, sons, moradores) fica em
// js/mundo/clima.js e lê a intensidade daqui.
// ---------------------------------------------------------------------------
const WORLD_CLIMAS = {
  limpo: { name: 'CÉU LIMPO', k: [1, 1] },
  chuva: { name: 'CHUVA', rain: 0.75, sense: 0.9, k: [0.25, 0.8], wind: 0.5, nomes: [[0.45, 'CHUVA FRACA'], [1, 'CHUVA MODERADA']] },
  tempestade: { name: 'TEMPESTADE', rain: 1, bolts: 0.12, sense: 0.85, dark: 0.08, k: [0.85, 1], wind: 1.3 },
  neve: { name: 'NEVE', flakes: 70, sense: 0.9, k: [0.3, 0.75], wind: 0.5, nomes: [[0.5, 'NEVE FRACA'], [1, 'NEVE']] },
  nevasca: { name: 'NEVASCA', flakes: 170, wind: 2.2, veil: '220,230,255', veilA: 0.16, sense: 0.75, dark: 0.04, k: [0.8, 1] },
  areia: { name: 'TEMPESTADE DE AREIA', sand: 140, veil: '210,150,80', veilA: 0.2, sense: 0.75, k: [0.6, 1], wind: 1.8 },
  cinzas: { name: 'CHUVA DE CINZAS', ash: 90, embers: 14, veil: '60,30,20', veilA: 0.1, sense: 0.9, k: [0.5, 1] },
  brasas: { name: 'BRASAS NO AR', embers: 26, k: [0.6, 1] },
  neblina: { name: 'NEBLINA', fog: true, veil: '170,210,230', veilA: 0.12, sense: 0.8, k: [0.35, 1], wind: 0.15, nomes: [[0.6, 'NEBLINA LEVE'], [1, 'NEBLINA DENSA']] },
  vagalumes: { name: 'VAGA-LUMES', fireflies: 30, night: true, k: [1, 1] },
  calor: { name: 'ONDA DE CALOR', haze: 1, day: true, k: [0.6, 1] },
};
// Climas de cada região, com peso no sorteio
const WORLD_CLIMA_REG = {
  carmesin: { limpo: 4, brasas: 3, chuva: 2, tempestade: 1 },
  velmora: { limpo: 4, chuva: 3, neblina: 2, vagalumes: 3, tempestade: 1 },
  lagoa: { limpo: 3, neblina: 3, chuva: 3, tempestade: 1 },
  nexus: { limpo: 3, chuva: 4, tempestade: 2, neblina: 1 },
  seraph: { limpo: 4, areia: 3, calor: 3 },
  asterion: { limpo: 2, neve: 5, nevasca: 3 },
  obsidiano: { cinzas: 5, brasas: 3, calor: 2, limpo: 1 },
};
const WORLD_CLIMA_TROCA = 8;   // segundos para um clima sumir (e outro tanto para o próximo crescer)

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
  // Intensidade atual do clima (0 a 1; durante a troca, cai até 0 e sobe de novo)
  intensidade() { const c = this.S && this.S.clima; return c && typeof c.k === 'number' ? c.k : 1; },
  // Nome com a intensidade (chuva fraca / moderada, neblina leve / densa…)
  nome() {
    const C = this.C(), c = this.S && this.S.clima, k = c && typeof c.alvo === 'number' ? c.alvo : this.intensidade();
    if (C.nomes) for (const [lim, n] of C.nomes) if (k <= lim) return n;
    return C.name;
  },
  // Quanto a sala é "a céu aberto": biomas 1, cidade 0.8, topo da torre 0.6, interiores 0.25
  // (o tema pode dizer: th.aberto, como a praça da cidade principal)
  aberto(th) { return th.aberto !== undefined ? th.aberto : th.deco === 'natural' ? 1 : th.sky === 'city' ? 0.8 : th.sky === 'tower' ? 0.6 : 0.25; },

  // Escuridão da sala com a hora e o clima (a da tabela de temas é a do fim de tarde)
  escuridao(th) {
    const o = this.aberto(th), d = this.luz(), C = this.C();
    return clamp(th.darkness - 0.3 * o * d + 0.1 * o * (1 - d) + (C.dark || 0), 0.3, 0.95);
  },
  // Luz ambiente da 3ª pessoa (multiplica a do tema)
  ambiente(th) { const o = this.aberto(th); return 1 - o * 0.45 * (1 - this.luz()); },
  // Acampamentos percebem o herói mais de perto à noite e com pouca visibilidade
  senseMult() {
    const k = this.intensidade(), s = 1 - (1 - (this.C().sense || 1)) * k;
    return (this.noite() ? 0.75 : 1) * s * (typeof Clima !== 'undefined' ? 1 - 0.35 * Clima.neblina() : 1);   // banco de neblina: ainda menos
  },
  xpMult() { return this.noite() ? 1.2 : 1; },

  // Sorteia um clima da região (sem repetir o atual, se der); a neblina é mais comum de madrugada
  sortear(reg) {
    const T = WORLD_CLIMA_REG[reg] || { limpo: 1 }, atual = this.clima(), h = this.hora();
    let tot = 0;
    const ok = (k) => (k !== atual || Object.keys(T).length === 1) && (!WORLD_CLIMAS[k].night || this.noite()) && (!WORLD_CLIMAS[k].day || !this.noite());
    const peso = (k) => T[k] * (k === 'neblina' && h >= 3.5 && h < 8.5 ? 3 : 1);
    for (const k in T) if (ok(k)) tot += peso(k);
    let r = Math.random() * tot;
    for (const k in T) { if (!ok(k)) continue; r -= peso(k); if (r <= 0) return k; }
    return 'limpo';
  },
  // Troca na hora (entrando numa região); 'k' força a intensidade (testes, eventos)
  definir(tipo, reg, avisar = true, k = null) {
    const C = WORLD_CLIMAS[tipo], alvo = k !== null ? k : rand(C.k[0], C.k[1]);
    this.S.clima = { tipo, reg, t: rand(120, 240), alvo, k: alvo, prox: null };
    this.parts.length = 0;
    if (avisar && game.hud) game.hud.toast(`Clima · ${this.nome()}`, '170,200,230');
  },
  // Troca gradual (o tempo do clima acabou): o atual some e o próximo cresce
  trocar(tipo) { const c = this.S.clima; c.prox = tipo; c.alvo = 0; },

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
    else {
      const c = S.clima;
      if (typeof c.k !== 'number') { const C0 = this.C(); c.alvo = c.k = rand(C0.k[0], C0.k[1]); }   // salvamento antigo
      if (!c.prox && ((c.t -= dt) <= 0 || (this.C().night && !this.noite()) || (this.C().day && this.noite()))) this.trocar(this.sortear(reg));
      c.k = approach(c.k, c.alvo, dt / WORLD_CLIMA_TROCA);
      if (c.prox && c.k <= 0) {
        // o anterior sumiu: entra o próximo, crescendo do zero
        const C1 = WORLD_CLIMAS[c.prox];
        c.tipo = c.prox; c.prox = null; c.t = rand(120, 240); c.alvo = rand(C1.k[0], C1.k[1]); c.k = 0;
        this.parts.length = 0;
        if (game.hud) game.hud.toast(`Clima · ${this.nome()}`, '170,200,230');
      }
    }
    // raios da tempestade (o céu acende e troveja)
    const C = this.C();
    if (C.bolts && Math.random() < dt * C.bolts * this.intensidade()) {
      game.skyFlash = 1; game.skyBoltX = rand(0.15, 0.85); game.skySeed = (Math.random() * 1e6) | 0;
      if (typeof Clima !== 'undefined') Clima.trovao(); else game.audio.play('thunder', 0.35);   // o trovão chega depois do clarão
    }
    this.simular(dt, C);
  },
  // Partículas do clima em coordenadas da tela (VIEW_W × VIEW_H)
  simular(dt, C) {
    const P = this.parts, W = VIEW_W, H = VIEW_H, wind = (C.wind || 0.4) * (0.4 + 0.6 * this.intensidade());
    // quantidade pela intensidade, pela exposição da zona e pela qualidade dos efeitos de clima
    const q = this.intensidade() * (typeof Clima !== 'undefined' ? Clima.qual().part * (0.3 + 0.7 * Clima.exposicao()) : 1);
    const n = (v) => Math.round((v || 0) * q);
    const fl = n(C.flakes), sa = n(C.sand), as = n(C.ash), em = n(C.embers), ff = n(C.fireflies);
    const want = fl + sa + as + em + ff;
    if (P.length > want) P.length = want;
    while (P.length < want) {
      const k = P.length < fl ? 'neve' : P.length < fl + sa ? 'areia' : P.length < fl + sa + as ? 'cinza' : P.length < want - ff ? 'brasa' : 'luz';
      P.push({ k, x: rand(0, W), y: rand(0, H), s: rand(0.5, 1.5), ph: rand(0, TAU) });
    }
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
    const k = this.intensidade();
    if (C.veil) {
      const a = C.veilA * k * (0.8 + 0.2 * Math.sin(t * 0.7));
      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, rgba(C.veil, a * 1.3)); g.addColorStop(1, rgba(C.veil, a * 0.6));
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (C.fog) {
      // faixas de neblina passando devagar
      for (let k = 0; k < 4; k++) {
        const y = VIEW_H * (0.25 + k * 0.2) + Math.sin(t * 0.3 + k) * 20, x = ((t * (12 + k * 5)) % (VIEW_W + 600)) - 300;
        const g = ctx.createRadialGradient(x, y, 10, x, y, 320);
        g.addColorStop(0, `rgba(190,225,240,${(0.16 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(190,225,240,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 320, y - 320, 640, 640);
      }
    }
    // chuva: a quantidade pela intensidade; nos interiores, só um pouco (pelas frestas)
    if (C.rain && typeof Backdrop !== 'undefined') Backdrop.drawRain(ctx, t, C.rain * k * (typeof Clima !== 'undefined' ? 0.25 + 0.75 * Clima.exposicao() : 1));
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
    ctx.fillText(`${dia ? '☀' : '☾'} ${this.fase()} · ${this.nome()}`, x - tw - 10, y - 2);
    ctx.letterSpacing = '0px';
    ctx.restore();
  },
};
