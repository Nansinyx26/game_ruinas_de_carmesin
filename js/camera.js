'use strict';
// ECLIPSE ZERO · Câmera: acompanhamento, tremor e zoom de impacto
// ---------------------------------------------------------------------------
// CÂMERA: segue o jogador, tremor de tela por "trauma" e zoom de impacto
// ---------------------------------------------------------------------------
class Camera {
  constructor() {
    this.x = 0; this.y = 0;          // centro da visão em coordenadas isométricas
    this.zoom = 1; this.baseZoom = 1;
    this.trauma = 0; this.punch = 0;
    this.sx = 0; this.sy = 0; this.rot = 0;
    this.time = 0;
    this.out = { x: 0, y: 0 };
  }
  // A intensidade segue a opção 'Tremor de tela' das configurações
  shake(amount) { this.trauma = Math.min(1, this.trauma + amount * (Settings.v.shake / 100)); }
  zoomPunch(amount) { this.punch = Math.max(this.punch, amount); }
  snap(x, y) { this.x = x; this.y = y; }
  follow(tx, ty, dt, speed = 6) {
    const k = 1 - Math.exp(-dt * speed);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
  }
  update(dt) {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.7);
    const s = this.trauma * this.trauma, mag = 24 * s, tm = this.time;
    // Ruído suave a partir de senoides com frequências incomensuráveis
    this.sx = mag * (Math.sin(tm * 47.3) * 0.6 + Math.sin(tm * 91.7 + 1.3) * 0.4);
    this.sy = mag * (Math.sin(tm * 53.1 + 2.1) * 0.6 + Math.sin(tm * 83.3 + 0.7) * 0.4);
    this.rot = 0.014 * s * Math.sin(tm * 37);
    this.punch = Math.max(0, this.punch - dt * 0.5);
    this.zoom = this.baseZoom * (1 + this.punch);
  }
  apply(ctx) {
    ctx.translate(VIEW_W / 2 + this.sx, VIEW_H / 2 + this.sy);
    if (this.rot) ctx.rotate(this.rot);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }
  // Coordenada isométrica → tela lógica (ignora a pequena rotação do tremor)
  toScreen(ix, iy) {
    this.out.x = VIEW_W / 2 + this.sx + (ix - this.x) * this.zoom;
    this.out.y = VIEW_H / 2 + this.sy + (iy - this.y) * this.zoom;
    return this.out;
  }
}

