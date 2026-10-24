'use strict';
// ECLIPSE ZERO · Granada de Plasma (equipamento do Kael)
// ---------------------------------------------------------------------------
// O Kael leva a Granada de Plasma junto com a espada: ela não ocupa o lugar da arma
// (WEAPON_DEFS.granada_plasma tem gadget: true, fora da troca Q e do equipar do elenco).
// Tecla R (controle: L3; toque: botão GRANADA): arremessa na direção pressionada, ou para onde
// o herói olha, com mira assistida no inimigo do cone, até ALCANCE. A granada voa em arco,
// pousa e explode depois da espoleta (anel de aviso no chão): dano em área que cresce com o
// poder do herói e cai com a distância do centro, empurra para fora e deixa as máquinas em
// curto-circuito (atordoadas por mais tempo). MAX cargas; cada uma volta em RECARGA segundos.
// Só fere inimigos. Vale na campanha, no mundo aberto e nas duas câmeras (HeroObjects).
// ---------------------------------------------------------------------------
const GRANADA = { MAX: 3, RECARGA: 8, ALCANCE: 300, VOO: 0.55, ESPOLETA: 0.4, RAIO: 120, DANO: 40, RGB: '90,170,255' };
const GRANADA_DEF = { id: 'granada', ability: true, heavy: true, spark: '120,190,255', shake: 0.12, hitstop: 0.05 };

const Granada = {
  // O herói leva granadas? (quem tem uma arma 'grenade' de equipamento liberada: o Kael)
  disponivel(p) {
    if (!p || !p.def || typeof RosterManager === 'undefined') return false;
    return RosterManager.weaponsFor(p.def.id).some((w) => {
      const d = WEAPON_DEFS[w];
      return d && d.gadget && d.kind === 'grenade' && d.owner === p.def.id && RosterManager.isWeaponUnlocked(w);
    });
  },
  // Cargas (cheias na primeira vez) e a recarga, uma de cada vez (Player.update)
  tick(p, dt) {
    if (p.granadas === undefined) { p.granadas = GRANADA.MAX; p.granadaT = 0; }
    if (p.granadas >= GRANADA.MAX) { p.granadaT = 0; return; }
    p.granadaT += dt;
    if (p.granadaT >= GRANADA.RECARGA) { p.granadaT = 0; p.granadas++; }
  },
  // Para o HUD: { n, max, k (recarga da próxima, 0 a 1) } ou null
  hud(p) {
    if (!this.disponivel(p)) return null;
    this.tick(p, 0);
    return { n: p.granadas, max: GRANADA.MAX, k: p.granadas >= GRANADA.MAX ? 1 : p.granadaT / GRANADA.RECARGA };
  },
  // Arremesso: wd = direção pressionada no mundo (ou null)
  lancar(p, wd) {
    if (!this.disponivel(p)) return false;
    const st = p.state;
    if (st === 'dead' || st === 'special' || st === 'dash' || st === 'plunge') return false;
    this.tick(p, 0);
    if (p.granadas <= 0) {
      game.hud.toast(`Granada recarregando · ${Math.ceil(GRANADA.RECARGA - p.granadaT)} s`, '170,180,200');
      game.audio.play('uiDeny');
      return false;
    }
    p.granadas--;
    const a = heroAim(p, wd, GRANADA.ALCANCE, 0.6);
    // distância: até o inimigo na mira, se houver; senão, a maior parte do alcance
    let d = GRANADA.ALCANCE * 0.8;
    for (const e of game.enemies) {
      if (!e.canBeHit()) continue;
      const dx = e.x - p.x, dy = e.y - p.y, de = Math.hypot(dx, dy);
      if (de <= GRANADA.ALCANCE + e.radius && Math.abs(angleDiff(a, Math.atan2(dy, dx))) < 0.12) { d = Math.max(40, Math.min(de, GRANADA.ALCANCE)); break; }
    }
    const R = game.room, tx = clamp(p.x + Math.cos(a) * d, 20, R.w - 20), ty = clamp(p.y + Math.sin(a) * d, 20, R.h - 20);
    p.facing = a;
    HeroObjects.add(new GranadaPlasma(p, tx, ty));
    game.particles.flash(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14, 38, 26, GRANADA.RGB, 0.12);
    game.audio.play('swing', 0.6);
    return true;
  },
};

// A granada em voo e no chão (objeto de HeroObjects)
class GranadaPlasma {
  constructor(p, tx, ty) {
    this.dono = p; this.x0 = p.x; this.y0 = p.y; this.tx = tx; this.ty = ty;
    this.x = p.x; this.y = p.y; this.z = 38; this.t = 0; this.chao = false; this.spin = 0;
  }
  update(dt) {
    this.t += dt; this.spin += dt * 14;
    if (!this.chao) {
      const k = Math.min(1, this.t / GRANADA.VOO);
      this.x = this.x0 + (this.tx - this.x0) * k; this.y = this.y0 + (this.ty - this.y0) * k;
      this.z = 38 * (1 - k) + Math.sin(k * Math.PI) * 72;
      if (Math.random() < 0.8) game.particles.embers(this.x, this.y, this.z, 1, GRANADA.RGB, 3, 12);
      if (k >= 1) {
        this.chao = true; this.t = 0; this.z = 0;
        game.particles.dust(this.x, this.y, 5, 8, 70);
        game.particles.ring(this.x, this.y, GRANADA.RAIO, GRANADA.RGB, GRANADA.ESPOLETA, 3);   // aviso no chão
        game.audio.play('telegraph', 0.5);
      }
      return true;
    }
    if (Math.random() < 0.5) game.arcs.crackle(this.x, this.y, 6, 1, 18, GRANADA.RGB, 0.08);
    if (this.t >= GRANADA.ESPOLETA) { this.explodir(); return false; }
    return true;
  }
  explodir() {
    const p = this.dono, g = game, S = p.stats, R = GRANADA.RAIO;
    heroInRadius(this.x, this.y, R, (e, d, kx, ky) => {
      const queda = 1 - 0.4 * clamp(d / R, 0, 1);
      let dmg = GRANADA.DANO * S.power * queda * rand(0.9, 1.1) * p.targetMult(e);
      const crit = Math.random() < S.crit;
      if (crit) dmg *= 2;
      const mech = !!(e.T && e.T.mech);
      heroStrike(e, dmg, crit, GRANADA_DEF, kx, ky, { kb: 380, launch: 150, stun: mech ? 1.4 : 0.6, heavy: true, shock: mech });
    });
    g.particles.ring(this.x, this.y, R, GRANADA.RGB, 0.45, 10);
    g.particles.ring(this.x, this.y, R * 0.55, '220,240,255', 0.3, 5);
    g.particles.flash(this.x, this.y, 20, R * 1.1, '170,215,255', 0.2);
    g.particles.sparks(this.x, this.y, 16, -Math.PI / 2, 22, '150,205,255', 520, Math.PI);
    g.particles.debris(this.x, this.y, 10);
    g.arcs.crackle(this.x, this.y, 20, 6, R * 0.8, GRANADA.RGB, 0.25);
    g.room.addScorch(this.x, this.y, 52);
    g.camera.shake(0.22);
    g.audio.play('explosion', 0.8); g.audio.play('zap', 0.6);
  }
  light(L) { L.add(isoX(this.x, this.y), isoY(this.x, this.y) - this.z, this.chao ? 80 : 50, this.chao ? 0.6 : 0.4); }
  draw(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), oy = sy - this.z;
    ctx.save();
    // sombra no chão e o corpo da granada girando, com o núcleo aceso
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy, 7, 3.5, 0, 0, TAU); ctx.fill();
    ctx.translate(sx, oy); ctx.rotate(this.spin);
    ctx.fillStyle = '#1b2433'; ctx.strokeStyle = 'rgba(160,205,255,0.9)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.rotate(-this.spin);
    ctx.globalCompositeOperation = 'lighter';
    const k = this.chao ? 0.6 + 0.4 * Math.sin(this.t * 40) : 0.8;
    GlowCache.draw(ctx, GRANADA.RGB, 0, 0, this.chao ? 22 : 14, 0.8 * k);
    ctx.fillStyle = `rgba(200,230,255,${0.9 * k})`; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
