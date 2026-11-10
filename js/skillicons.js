'use strict';
// ECLIPSE ZERO · Ícones procedurais das habilidades do elenco (árvores de Lyra, Drakos, Sera e Orion)
// ---------------------------------------------------------------------------
// ÍCONES DAS ÁRVORES: mesmo traço dos ícones de drawIcon (js/ui.js), numa caixa de
// 40 unidades centrada em (0, 0). drawSkillIcon desenha os daqui e, para qualquer
// outro nome, usa drawIcon — por isso os ícones do Kael continuam exatamente iguais.
// ---------------------------------------------------------------------------
const SKILL_ICONS = {
  // ----- Lyra
  aim(c) {
    c.arc(0, 0, 11, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(0, -18); c.lineTo(0, -6); c.moveTo(0, 6); c.lineTo(0, 18); c.moveTo(-18, 0); c.lineTo(-6, 0); c.moveTo(6, 0); c.lineTo(18, 0); c.stroke();
    c.beginPath(); c.arc(0, 0, 2.6, 0, TAU); c.fill();
  },
  arrowPierce(c) {
    c.moveTo(-18, 0); c.lineTo(11, 0); c.stroke();
    c.beginPath(); c.moveTo(18, 0); c.lineTo(9, -6); c.lineTo(9, 6); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-18, 0); c.lineTo(-14, -6); c.moveTo(-18, 0); c.lineTo(-14, 6); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.arc(-5, 0, 5.5, 0, TAU); c.stroke(); c.beginPath(); c.arc(7, 0, 5.5, 0, TAU); c.stroke();
  },
  target(c) {
    c.arc(-3, 3, 13, 0, TAU); c.stroke();
    c.beginPath(); c.arc(-3, 3, 6, 0, TAU); c.stroke();
    c.beginPath(); c.arc(-3, 3, 2.2, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(18, -18); c.lineTo(1, -1); c.stroke();
    c.beginPath(); c.moveTo(18, -18); c.lineTo(11, -18); c.moveTo(18, -18); c.lineTo(18, -11); c.stroke();
  },
  arrows3(c) {
    for (const a of [-1.2, -0.78, -0.36]) {
      const ex = -14 + Math.cos(a) * 30, ey = 14 + Math.sin(a) * 30;
      c.moveTo(-14, 14); c.lineTo(ex, ey);
      c.moveTo(ex, ey); c.lineTo(ex + Math.cos(a + 2.6) * 7, ey + Math.sin(a + 2.6) * 7);
      c.moveTo(ex, ey); c.lineTo(ex + Math.cos(a - 2.6) * 7, ey + Math.sin(a - 2.6) * 7);
    }
    c.stroke();
    c.beginPath(); c.arc(-14, 14, 3, 0, TAU); c.fill();
  },
  bow(c) {
    c.arc(-12, 0, 18, -1.05, 1.05); c.stroke();
    c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3, -15.5); c.lineTo(-13, 0); c.lineTo(-3, 15.5); c.stroke();
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(-13, 0); c.lineTo(13, 0); c.stroke();
    c.beginPath(); c.moveTo(18, 0); c.lineTo(11, -5); c.lineTo(11, 5); c.closePath(); c.fill();
  },
  focus(c) {
    c.moveTo(-18, 0); c.quadraticCurveTo(0, -15, 18, 0); c.quadraticCurveTo(0, 15, -18, 0); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 10); c.moveTo(-10, 0); c.lineTo(10, 0); c.stroke();
    c.beginPath(); c.arc(0, 0, 17, -2.3, -0.84); c.stroke(); c.beginPath(); c.arc(0, 0, 17, 0.84, 2.3); c.stroke();
  },
  trap(c) {
    // Mina achatada no chão com o sensor piscando
    c.ellipse(0, 8, 17, 6.5, 0, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(-11, 6); c.lineTo(-11, 1); c.quadraticCurveTo(0, -6, 11, 1); c.lineTo(11, 6); c.quadraticCurveTo(0, 10, -11, 6); c.fill();
    c.beginPath(); c.moveTo(0, -2); c.lineTo(0, -9); c.stroke();
    c.beginPath(); c.arc(0, -12, 3.2, 0, TAU); c.fill();
    c.lineWidth = 2; c.beginPath(); c.moveTo(-8, -16); c.lineTo(-5, -14); c.moveTo(8, -16); c.lineTo(5, -14); c.moveTo(0, -19); c.lineTo(0, -17.5); c.stroke();
  },
  wire(c) {
    c.moveTo(-18, 13); c.lineTo(18, 13); c.moveTo(-13, 13); c.lineTo(-13, -6); c.moveTo(13, 13); c.lineTo(13, -6); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.moveTo(-13, -2); c.lineTo(-6, -7); c.lineTo(0, 0); c.lineTo(6, -7); c.lineTo(13, -2); c.stroke();
    c.beginPath(); c.arc(-13, -7, 2.4, 0, TAU); c.arc(13, -7, 2.4, 0, TAU); c.fill();
  },
  footprint(c) {
    c.ellipse(-7, 6, 4.5, 7, -0.2, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(7, -7, 4.5, 7, 0.2, 0, TAU); c.fill();
    c.beginPath(); c.arc(-9, -4.5, 1.8, 0, TAU); c.arc(-5, -5, 1.8, 0, TAU); c.fill();
    c.beginPath(); c.arc(5.5, -17.5, 1.8, 0, TAU); c.arc(9.5, -17, 1.8, 0, TAU); c.fill();
  },
  decoy(c) {
    c.arc(0, 3, 6, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(0, -3); c.lineTo(0, -11); c.stroke();
    c.beginPath(); c.arc(0, -13, 2.4, 0, TAU); c.fill();
    c.lineWidth = 2.2;
    for (const r of [11, 16]) {
      c.beginPath(); c.arc(0, 3, r, -0.55, 0.55); c.stroke();
      c.beginPath(); c.arc(0, 3, r, Math.PI - 0.55, Math.PI + 0.55); c.stroke();
    }
  },
  arrowBurst(c) {
    c.moveTo(-17, 17); c.lineTo(2, -2); c.stroke();
    c.beginPath(); c.moveTo(-17, 17); c.lineTo(-17, 10); c.moveTo(-17, 17); c.lineTo(-10, 17); c.stroke();
    c.lineWidth = 2.4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      c.moveTo(8 + Math.cos(a) * 5, -8 + Math.sin(a) * 5); c.lineTo(8 + Math.cos(a) * 11, -8 + Math.sin(a) * 11);
    }
    c.stroke();
    c.beginPath(); c.arc(8, -8, 3, 0, TAU); c.fill();
  },
  shards(c) {
    c.arc(0, 0, 4, 0, TAU); c.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2, r = 13, x = Math.cos(a) * r, y = Math.sin(a) * r;
      const px = -Math.sin(a), py = Math.cos(a);
      c.beginPath();
      c.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
      c.lineTo(x + px * 3.5, y + py * 3.5); c.lineTo(x - px * 3.5, y - py * 3.5);
      c.closePath(); c.fill();
    }
  },
  rain(c) {
    for (let i = 0; i < 3; i++) {
      const x = -10 + i * 10, y0 = -17 + (i % 2) * 5;
      c.moveTo(x + 4, y0); c.lineTo(x - 2, y0 + 20);
      c.moveTo(x - 2, y0 + 20); c.lineTo(x - 5, y0 + 13);
      c.moveTo(x - 2, y0 + 20); c.lineTo(x + 3, y0 + 15);
    }
    c.stroke();
    c.lineWidth = 2; c.beginPath(); c.moveTo(-18, 16); c.lineTo(18, 16); c.stroke();
  },
  stealth(c) {
    c.moveTo(-18, 0); c.quadraticCurveTo(0, -15, 18, 0); c.quadraticCurveTo(0, 15, -18, 0); c.stroke();
    c.beginPath(); c.arc(0, 0, 4.5, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-15, -15); c.lineTo(15, 15); c.stroke();
  },
  hook(c) {
    c.moveTo(0, -12); c.lineTo(0, 9); c.stroke();
    c.beginPath(); c.moveTo(0, 9); c.quadraticCurveTo(-12, 10, -13, -2); c.moveTo(0, 9); c.quadraticCurveTo(12, 10, 13, -2); c.stroke();
    c.beginPath(); c.moveTo(-13, -2); c.lineTo(-16, 2); c.moveTo(13, -2); c.lineTo(16, 2); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.arc(0, -15, 3, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(-2, -17); c.quadraticCurveTo(-10, -22, -18, -14); c.stroke();
  },

  // ----- Drakos
  hammer(c) {
    c.moveTo(-15, 15); c.lineTo(2, -2); c.stroke();
    c.beginPath(); c.moveTo(-2, -14); c.lineTo(6, -18); c.lineTo(18, -6); c.lineTo(14, 2); c.closePath(); c.fill();
    c.lineWidth = 2; c.beginPath(); c.moveTo(12, 8); c.lineTo(17, 13); c.moveTo(6, 11); c.lineTo(8, 17); c.moveTo(15, 3); c.lineTo(19, 5); c.stroke();
  },
  weight(c) {
    c.arc(0, -8, 7, Math.PI, 0); c.stroke();
    c.beginPath(); c.moveTo(-7, -8); c.lineTo(-7, -3); c.moveTo(7, -8); c.lineTo(7, -3); c.stroke();
    c.beginPath(); c.arc(0, 6, 11.5, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-18, 18); c.lineTo(18, 18); c.stroke();
  },
  shockwave(c) {
    c.arc(-14, 13, 3, 0, TAU); c.fill();
    c.lineWidth = 2.6;
    for (const r of [9, 18, 27]) { c.beginPath(); c.arc(-14, 13, r, -1.35, -0.1); c.stroke(); }
    c.beginPath(); c.moveTo(-18, 17); c.lineTo(18, 17); c.stroke();
  },
  medal(c) {
    for (let i = 0; i < 3; i++) { c.moveTo(-13, -2 + i * 8); c.lineTo(0, -10 + i * 8); c.lineTo(13, -2 + i * 8); }
    c.stroke();
    c.beginPath(); c.moveTo(0, -18); c.lineTo(2.5, -13); c.lineTo(0, -12); c.lineTo(-2.5, -13); c.closePath(); c.fill();
  },
  shieldFront(c) {
    c.moveTo(-11, -16); c.lineTo(11, -16); c.lineTo(13, -5); c.lineTo(11, 9); c.lineTo(0, 17); c.lineTo(-11, 9); c.lineTo(-13, -5); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(-5, -10); c.lineTo(5, -10); c.lineTo(6, -4); c.lineTo(5, 4); c.lineTo(0, 9); c.lineTo(-5, 4); c.lineTo(-6, -4); c.closePath(); c.fill();
  },
  armor(c) {
    c.moveTo(-15, -13); c.lineTo(-6, -16); c.quadraticCurveTo(0, -10, 6, -16); c.lineTo(15, -13); c.lineTo(12, 4); c.lineTo(0, 16); c.lineTo(-12, 4); c.closePath(); c.stroke();
    c.lineWidth = 2; c.setLineDash([2.5, 3]);
    c.beginPath(); c.moveTo(-10, -3); c.lineTo(10, -3); c.moveTo(-7, 5); c.lineTo(7, 5); c.stroke();
    c.setLineDash([]);
  },
  wall(c) {
    c.rect(-17, -12, 34, 24); c.stroke();
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(-17, -4); c.lineTo(17, -4); c.moveTo(-17, 4); c.lineTo(17, 4);
    c.moveTo(-6, -12); c.lineTo(-6, -4); c.moveTo(6, -12); c.lineTo(6, -4);
    c.moveTo(0, -4); c.lineTo(0, 4); c.moveTo(-11, -4); c.lineTo(-11, 4); c.moveTo(11, -4); c.lineTo(11, 4);
    c.moveTo(-6, 4); c.lineTo(-6, 12); c.moveTo(6, 4); c.lineTo(6, 12); c.stroke();
  },
  reflect(c) {
    c.moveTo(-6, -15); c.lineTo(4, -11); c.quadraticCurveTo(4, 7, -6, 15); c.quadraticCurveTo(-16, 7, -16, -11); c.closePath(); c.stroke();
    c.lineWidth = 2.6; c.beginPath(); c.moveTo(18, -14); c.lineTo(7, -1); c.lineTo(18, 11); c.stroke();
    c.beginPath(); c.moveTo(18, 11); c.lineTo(11, 11); c.moveTo(18, 11); c.lineTo(17, 4); c.stroke();
  },
  banner(c) {
    c.moveTo(-8, 18); c.lineTo(-8, -18); c.stroke();
    c.beginPath(); c.moveTo(-8, -16); c.lineTo(15, -12); c.lineTo(7, -6); c.lineTo(15, 0); c.lineTo(-8, -2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-17, 18); c.lineTo(3, 18); c.stroke();
  },
  charge(c) {
    c.moveTo(-18, -6); c.lineTo(3, -6); c.lineTo(3, -14); c.lineTo(18, 0); c.lineTo(3, 14); c.lineTo(3, 6); c.lineTo(-18, 6); c.closePath(); c.fill();
    c.lineWidth = 2; c.beginPath(); c.moveTo(-18, -12); c.lineTo(-9, -12); c.moveTo(-18, 12); c.lineTo(-9, 12); c.stroke();
  },
  cannon(c) {
    c.rect(-17, -5, 21, 10); c.fill();
    c.beginPath(); c.rect(4, -7.5, 4, 15); c.fill();
    c.lineWidth = 2.4;
    c.beginPath(); c.arc(9, 0, 6, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(9, 0, 11, -0.9, 0.9); c.stroke();
    c.beginPath(); c.moveTo(-12, 5); c.lineTo(-14, 13); c.moveTo(-4, 5); c.lineTo(-2, 13); c.stroke();
  },
  spear(c) {
    c.moveTo(-16, 16); c.lineTo(8, -8); c.stroke();
    c.beginPath(); c.moveTo(18, -18); c.lineTo(5, -12); c.lineTo(12, -5); c.closePath(); c.fill();
    c.lineWidth = 2; c.beginPath(); c.moveTo(-17, 4); c.lineTo(-8, 4); c.moveTo(-4, 17); c.lineTo(-4, 8); c.stroke();
  },
  brokenChip(c) {
    c.rect(-10, -10, 20, 20); c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    for (let i = -1; i <= 1; i++) {
      c.moveTo(-10, i * 6); c.lineTo(-15, i * 6); c.moveTo(10, i * 6); c.lineTo(15, i * 6);
      c.moveTo(i * 6, -10); c.lineTo(i * 6, -15); c.moveTo(i * 6, 10); c.lineTo(i * 6, 15);
    }
    c.stroke();
    c.lineWidth = 2.6; c.beginPath(); c.moveTo(-3, -10); c.lineTo(2, -3); c.lineTo(-2, 2); c.lineTo(3, 10); c.stroke();
  },
  roar(c) {
    c.arc(-12, 0, 4, 0, TAU); c.fill();
    for (const r of [9, 17, 25]) { c.beginPath(); c.arc(-12, 0, r, -0.75, 0.75); c.stroke(); }
  },
  quake(c) {
    c.moveTo(0, -18); c.lineTo(0, -2); c.stroke();
    c.beginPath(); c.moveTo(0, 1); c.lineTo(-6, -7); c.lineTo(6, -7); c.closePath(); c.fill();
    c.lineWidth = 2.4; c.beginPath(); c.ellipse(0, 9, 17, 6, 0, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(-6, 9); c.lineTo(-11, 13); c.moveTo(4, 9); c.lineTo(9, 14); c.moveTo(0, 9); c.lineTo(1, 14); c.stroke();
  },

  // ----- Sera
  droneAlly(c) {
    c.ellipse(0, 2, 8, 5, 0, 0, TAU); c.fill();
    c.lineWidth = 2.4; c.beginPath(); c.moveTo(-6, 0); c.lineTo(-13, -6); c.moveTo(6, 0); c.lineTo(13, -6); c.stroke();
    c.beginPath(); c.ellipse(-13, -8, 6, 2, 0, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(13, -8, 6, 2, 0, 0, TAU); c.stroke();
    c.lineWidth = 2; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 18); c.stroke(); c.setLineDash([]);
  },
  battery(c) {
    c.rect(-14, -8, 24, 16); c.stroke();
    c.beginPath(); c.rect(10, -4, 4.5, 8); c.fill();
    c.beginPath(); c.rect(-10.5, -4.5, 5.5, 9); c.rect(-3, -4.5, 5.5, 9); c.fill();
  },
  swarm(c) {
    for (const [x, y] of [[-9, -6], [9, -6], [0, 9]]) {
      c.beginPath(); c.ellipse(x, y, 5.5, 3.5, 0, 0, TAU); c.fill();
      c.lineWidth = 2; c.beginPath(); c.moveTo(x - 6, y - 5); c.lineTo(x + 6, y - 5); c.stroke();
    }
  },
  turret(c) {
    c.moveTo(0, 4); c.lineTo(-12, 17); c.moveTo(0, 4); c.lineTo(12, 17); c.moveTo(0, 4); c.lineTo(0, 17); c.stroke();
    c.beginPath(); c.rect(-8, -8, 15, 11); c.fill();
    c.beginPath(); c.moveTo(6, -3); c.lineTo(18, -3); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.arc(-1, -12, 4, Math.PI, 0); c.stroke();
  },
  dome(c) {
    c.moveTo(-18, 12); c.lineTo(18, 12); c.stroke();
    c.beginPath(); c.arc(0, 12, 15, Math.PI, 0); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.arc(0, 12, 8, Math.PI, 0); c.stroke();
    c.beginPath(); c.moveTo(0, -3); c.lineTo(0, 4); c.moveTo(-11, 2); c.lineTo(-6, 6); c.moveTo(11, 2); c.lineTo(6, 6); c.stroke();
  },
  pulse(c) {
    c.arc(0, 0, 3.5, 0, TAU); c.fill();
    for (const r of [9, 16]) {
      c.beginPath(); c.arc(0, 0, r, -0.75, 0.75); c.stroke();
      c.beginPath(); c.arc(0, 0, r, Math.PI - 0.75, Math.PI + 0.75); c.stroke();
    }
  },
  storm(c) {
    c.arc(-8, -4, 6.5, 0, TAU); c.arc(2, -8, 8.5, 0, TAU); c.arc(10, -3, 6, 0, TAU); c.fill();
    c.beginPath(); c.rect(-12, -4, 23, 5); c.fill();
    c.beginPath(); c.moveTo(2, 3); c.lineTo(-5, 11); c.lineTo(0, 11); c.lineTo(-4, 19); c.lineTo(6, 8); c.lineTo(1, 8); c.lineTo(4, 3); c.closePath(); c.fill();
  },
  hack(c) {
    c.rect(-17, -13, 34, 26); c.stroke();
    c.beginPath(); c.moveTo(-10, -5); c.lineTo(-3, 1); c.lineTo(-10, 7); c.stroke();
    c.beginPath(); c.moveTo(1, 7); c.lineTo(10, 7); c.stroke();
  },
  code(c) {
    c.moveTo(-8, -10); c.lineTo(-17, 0); c.lineTo(-8, 10); c.moveTo(8, -10); c.lineTo(17, 0); c.lineTo(8, 10); c.stroke();
    c.beginPath(); c.moveTo(4, -15); c.lineTo(-4, 15); c.stroke();
  },
  key(c) {
    c.arc(-9, 0, 6.5, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(-2.5, 0); c.lineTo(17, 0); c.moveTo(12, 0); c.lineTo(12, 7); c.moveTo(17, 0); c.lineTo(17, 6); c.stroke();
  },
  power(c) {
    c.arc(0, 2, 11, -Math.PI * 0.32, Math.PI * 1.32); c.stroke();
    c.beginPath(); c.moveTo(0, -12); c.lineTo(0, -1); c.stroke();
    c.lineWidth = 2.6; c.beginPath(); c.moveTo(-16, -16); c.lineTo(16, 16); c.stroke();
  },
  file(c) {
    c.moveTo(-11, -17); c.lineTo(5, -17); c.lineTo(12, -10); c.lineTo(12, 17); c.lineTo(-11, 17); c.closePath(); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.moveTo(5, -17); c.lineTo(5, -10); c.lineTo(12, -10); c.stroke();
    c.beginPath(); c.ellipse(0.5, 4, 4.5, 6.5, 0, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(-4, 11); c.lineTo(5, -3); c.stroke();
  },
  nano(c) {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.moveTo(Math.cos(a) * 12 + 3.2, Math.sin(a) * 12); c.arc(Math.cos(a) * 12, Math.sin(a) * 12, 3.2, 0, TAU); }
    c.fill();
    c.beginPath(); c.moveTo(0, -6); c.lineTo(0, 6); c.moveTo(-6, 0); c.lineTo(6, 0); c.stroke();
  },
  syringe(c) {
    c.rotate(-Math.PI / 4);
    c.rect(-10, -5, 18, 10); c.stroke();
    c.beginPath(); c.rect(-1, -2.5, 8, 5); c.fill();
    c.beginPath(); c.moveTo(8, 0); c.lineTo(18, 0); c.moveTo(-10, 0); c.lineTo(-16, 0); c.moveTo(-16, -5); c.lineTo(-16, 5); c.stroke();
  },
  bulb(c) {
    c.arc(0, -5, 10, Math.PI * 0.75, Math.PI * 0.25); c.lineTo(4.5, 9); c.lineTo(-4.5, 9); c.closePath(); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.moveTo(-4, 13); c.lineTo(4, 13); c.moveTo(-2.5, 17); c.lineTo(2.5, 17); c.stroke();
    c.beginPath(); c.moveTo(-3, 4); c.lineTo(-3, -3); c.lineTo(0, -7); c.lineTo(3, -3); c.lineTo(3, 4); c.stroke();
  },
  heal(c) {
    c.rect(-4, -12, 8, 24); c.rect(-12, -4, 24, 8); c.fill();
    c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 17, 0, TAU); c.stroke();
  },

  // ----- Orion
  tempo(c) {
    for (let i = 0; i < 3; i++) { c.moveTo(-15 + i * 10, -10); c.lineTo(-6 + i * 10, 0); c.lineTo(-15 + i * 10, 10); }
    c.stroke();
  },
  skull(c) {
    c.arc(0, -3, 12, Math.PI * 0.8, Math.PI * 0.2); c.lineTo(6, 14); c.lineTo(-6, 14); c.closePath(); c.stroke();
    c.beginPath(); c.arc(-5, -2, 3.2, 0, TAU); c.arc(5, -2, 3.2, 0, TAU); c.fill();
    c.lineWidth = 2; c.beginPath(); c.moveTo(-2, 9); c.lineTo(-2, 14); c.moveTo(2, 9); c.lineTo(2, 14); c.stroke();
  },
  mask(c) {
    c.moveTo(-18, -5); c.quadraticCurveTo(-9, -13, 0, -7); c.quadraticCurveTo(9, -13, 18, -5);
    c.quadraticCurveTo(16, 8, 5, 6); c.quadraticCurveTo(0, 2, -5, 6); c.quadraticCurveTo(-16, 8, -18, -5); c.closePath(); c.stroke();
    c.beginPath(); c.ellipse(-8, -2, 4, 2.6, 0.15, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(8, -2, 4, 2.6, -0.15, 0, TAU); c.fill();
  },
  smoke(c) {
    c.arc(-8, 6, 7.5, 0, TAU); c.arc(2, 0, 9, 0, TAU); c.arc(11, 7, 6.5, 0, TAU); c.fill();
    c.beginPath(); c.rect(-8, 6, 19, 7.5); c.fill();
    c.lineWidth = 2; c.beginPath(); c.arc(-6, -12, 3.5, 0, TAU); c.stroke(); c.beginPath(); c.arc(4, -15, 2.5, 0, TAU); c.stroke();
  },
  hourglass(c) {
    c.moveTo(-13, -17); c.lineTo(13, -17); c.moveTo(-13, 17); c.lineTo(13, 17); c.stroke();
    c.beginPath(); c.moveTo(-9, -17); c.lineTo(9, -17); c.lineTo(1.5, 0); c.lineTo(9, 17); c.lineTo(-9, 17); c.lineTo(-1.5, 0); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(-6, 15); c.lineTo(6, 15); c.lineTo(0, 8); c.closePath(); c.fill();
  },
  bladeThrow(c) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      const P = (x, y) => [4 + x * ca - y * sa, x * sa + y * ca];
      c.moveTo(...P(0, 0)); c.quadraticCurveTo(...P(11, -3), ...P(14, -13)); c.quadraticCurveTo(...P(4, -9), ...P(0, 0));
    }
    c.fill();
    c.lineWidth = 2; c.beginPath(); c.moveTo(-18, -6); c.lineTo(-11, -6); c.moveTo(-19, 1); c.lineTo(-13, 1); c.moveTo(-18, 8); c.lineTo(-12, 8); c.stroke();
  },
  ricochet(c) {
    c.moveTo(13, -17); c.lineTo(13, 17); c.stroke();
    c.lineWidth = 2.6; c.beginPath(); c.moveTo(-17, -13); c.lineTo(9, 0); c.lineTo(-17, 13); c.stroke();
    c.beginPath(); c.moveTo(-17, 13); c.lineTo(-10, 13.5); c.moveTo(-17, 13); c.lineTo(-13, 7); c.stroke();
  },
  shadowStrike(c) {
    c.lineWidth = 2.6; c.moveTo(-17, 13); c.lineTo(-7, -9); c.lineTo(3, 11); c.lineTo(14, -12); c.stroke();
    for (const [x, y] of [[-17, 13], [-7, -9], [3, 11]]) { c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }
    c.lineWidth = 2.4; c.beginPath(); c.moveTo(9, -17); c.lineTo(19, -7); c.moveTo(12, -6); c.lineTo(18, -16); c.stroke();
  },
};

// Ícone de uma habilidade de árvore (de qualquer personagem)
function drawSkillIcon(ctx, kind, x, y, s, color) {
  const f = SKILL_ICONS[kind];
  if (!f) { drawIcon(ctx, kind, x, y, s, color); return; }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 40, s / 40);
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  f(ctx);
  ctx.restore();
}
