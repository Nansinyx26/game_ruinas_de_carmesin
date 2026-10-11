'use strict';
// ECLIPSE ZERO · Entidade base: posição, altura, knockback e sombra
// ---------------------------------------------------------------------------
// ENTIDADE BASE: posição no mundo, altura (z), knockback e sombra
// ---------------------------------------------------------------------------
class Entity {
  constructor(x, y, r) {
    this.x = x; this.y = y; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.kbx = 0; this.kby = 0;       // velocidade de knockback (decai com o tempo)
    this.radius = r;                  // raio da hurtbox
    this.facing = 0;                  // ângulo no mundo
    this.flash = 0;                   // tempo restante do flash branco
    this.alive = true;
    this.hp = 1; this.maxHp = 1;
  }
  get depth() { return this.x + this.y; }   // ordenação por profundidade (y-sorting)
  drawShadow(ctx) {
    const k = 1 - Math.min(0.55, this.z / 260);
    ctx.fillStyle = `rgba(0,0,0,${(0.5 * k).toFixed(3)})`;
    isoCirclePath(ctx, this.x, this.y, this.radius * 1.1 * k);
    ctx.fill();
  }
}

