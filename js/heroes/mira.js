'use strict';
// ECLIPSE ZERO · Mira travada no combate (Mira)
// ---------------------------------------------------------------------------
// Trava a mira num inimigo, como nos jogos de ação hack and slash:
//   X (teclado), botão do meio do mouse ou R3 (controle): trava no inimigo mais perto da frente
//   do herói; apertar de novo com a mira travada passa para o próximo; segurar (0,35 s) solta.
//   (A troca de arma fica no Q, e no controle em LB + R3.)
// Com a mira travada: cada golpe começa virado para o alvo (também os golpes dos kits e das
// habilidades com direção), o herói parado olha para ele, a câmera 3D gira para manter herói e
// alvo no quadro e um marcador fica sobre o alvo nas duas câmeras. Solta sozinha quando o alvo
// morre, some ou fica longe demais (o próximo da fila assume, se houver um perto).
// ---------------------------------------------------------------------------
const Mira = {
  alvo: null, segura: 0, serial: -1, t: 0,
  ALCANCE: 560, SOLTA: 760,

  vivo(e) { return !!e && game.enemies.includes(e) && e.state !== 'dying' && e.state !== 'dead' && !(e.oculto > 0) && (!e.canBeHit || e.canBeHit() || e.state === 'spawn' || e.z > 0); },
  // Candidatos: vivos, ao alcance, com linha de visão; mais perto e mais na frente primeiro
  candidatos(p) {
    const R = game.room, L = [];
    for (const e of game.enemies) {
      if (!this.vivo(e) || e.state === 'spawn') continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      if (d > this.ALCANCE) continue;
      if (R && R.linhaLivre && !R.linhaLivre(p.x, p.y, e.x, e.y)) continue;
      const fr = Math.abs(angleDiff(p.facing || 0, Math.atan2(dy, dx)));
      L.push({ e, nota: d * (1 + 0.5 * fr / Math.PI) });
    }
    return L.sort((a, b) => a.nota - b.nota).map((c) => c.e);
  },
  travar(p) {
    const L = this.candidatos(p);
    if (!L.length) { this.alvo = null; return null; }
    if (this.alvo) { const i = L.indexOf(this.alvo); this.alvo = L[(i + 1) % L.length]; }
    else this.alvo = L[0];
    this.t = 0;
    return this.alvo;
  },
  soltar() { this.alvo = null; this.segura = 0; },
  // Ângulo do herói para o alvo (null sem alvo)
  direcao(p) { return this.alvo ? Math.atan2(this.alvo.y - p.y, this.alvo.x - p.x) : null; },

  update(dt, inp) {
    const p = game.player;
    if (!p || game.state !== 'playing') return;
    this.t += dt;
    if (inp.pressed.lockOn) { this.segura = 0.0001; if (this.alvo) this.travar(p); else if (!this.travar(p) && game.hud) game.hud.toast('Nenhum inimigo para travar a mira', '180,190,210'); }
    else if (inp.held.lockOn && this.segura > 0) { this.segura += dt; if (this.segura > 0.35 && this.alvo) { this.soltar(); if (game.hud) game.hud.toast('MIRA SOLTA', '180,190,210'); } }
    else this.segura = 0;
    if (!this.alvo) return;
    // o alvo saiu: o próximo perto assume, ou solta
    if (!this.vivo(this.alvo) || dist(p.x, p.y, this.alvo.x, this.alvo.y) > this.SOLTA) { this.alvo = null; this.travar(p); if (!this.alvo) return; }
    const a = this.direcao(p);
    // golpe novo: começa virado para o alvo
    if (p.attack && p.state === 'attack' && p.attack.serial !== this.serial) {
      this.serial = p.attack.serial;
      p.facing = a; p.attack.dir = a;
    }
    // parado (ou defendendo): olha para o alvo
    if ((p.state === 'idle' || p.state === 'block') && Math.hypot(p.vx || 0, p.vy || 0) < 30) p.facing = angleLerp(p.facing, a, 1 - Math.exp(-10 * dt));
  },
  // Câmera 3D: gira devagar para pôr o alvo à frente (sem brigar com quem gira à mão)
  camera(T, dt) {
    const p = game.player;
    if (!this.alvo || !p || T.manualT < 0.4) return;
    const d = angleDiff(T.yaw, this.direcao(p));
    T.yaw += clamp(d, -1.2, 1.2) * 3.2 * dt;
  },
  // Marcador sobre o alvo (passada de efeitos do mundo: vale nas duas câmeras)
  desenhar(ctx) {
    const e = this.alvo;
    if (!e) return;
    const sx = isoX(e.x, e.y), sy = isoY(e.x, e.y), r = (e.radius || 18) * 1.6, h = (e.height || 50) + (e.z || 0) + 18;
    const pul = 0.75 + 0.25 * Math.sin(this.t * 7), giro = this.t * 2.4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,90,110,${0.75 * pul})`; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {   // quatro arcos girando no chão
      const a0 = giro + k * Math.PI / 2;
      ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.5, 0, a0, a0 + 0.9); ctx.stroke();
    }
    ctx.fillStyle = `rgba(255,110,130,${0.9 * pul})`;   // seta acima da cabeça
    ctx.beginPath(); ctx.moveTo(sx, sy - h + 9); ctx.lineTo(sx - 7, sy - h - 3); ctx.lineTo(sx + 7, sy - h - 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  },
};
