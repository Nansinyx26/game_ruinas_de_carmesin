'use strict';
// ECLIPSE ZERO · Iluminação: mapa de escuridão com furos de luz
// ---------------------------------------------------------------------------
// ILUMINAÇÃO: mapa de escuridão em meia resolução com "furos" de luz
// ---------------------------------------------------------------------------
class Lighting {
  constructor() {
    this.res = 0.5;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.lights = [];
    this.n = 0;
    // Sprite de luz: gradiente radial preto → transparente (usado com destination-out)
    this.sprite = document.createElement('canvas');
    this.sprite.width = this.sprite.height = 128;
    const g = this.sprite.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.35, 'rgba(0,0,0,0.85)');
    gr.addColorStop(0.7, 'rgba(0,0,0,0.35)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    this.resize();
  }
  resize() {
    this.canvas.width = Math.max(2, Math.ceil(VIEW_W * this.res));
    this.canvas.height = Math.max(2, Math.ceil(VIEW_H * this.res));
  }
  clear() { this.n = 0; }
  // (ix, iy) em coordenadas isométricas (já com a altura z subtraída)
  add(ix, iy, radius, intensity, flat = 0.72) {
    if (this.n >= 96) return;
    let L = this.lights[this.n];
    if (!L) L = this.lights[this.n] = { x: 0, y: 0, r: 0, i: 0, f: 0 };
    L.x = ix; L.y = iy; L.r = radius; L.i = intensity; L.f = flat;
    this.n++;
  }
  render(ctx, cam, darkness, rgb = '2,4,10', poly = null) {
    const c = this.ctx, s = this.res, W = this.canvas.width, H = this.canvas.height;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, W, H);
    // A escuridão cobre só a sala (o céu atrás dela mantém o próprio brilho)
    c.save();
    if (poly) {
      c.beginPath();
      for (let k = 0; k < poly.length; k += 2) {
        const p = cam.toScreen(poly[k], poly[k + 1]);
        if (k) c.lineTo(p.x * s, p.y * s); else c.moveTo(p.x * s, p.y * s);
      }
      c.closePath(); c.clip();
    }
    c.fillStyle = `rgba(${rgb},${clamp(darkness, 0, 1).toFixed(3)})`;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < this.n; i++) {
      const L = this.lights[i];
      const p = cam.toScreen(L.x, L.y);
      const r = L.r * cam.zoom * s;
      if (r < 1) continue;
      const x = p.x * s, y = p.y * s;
      if (x + r < 0 || y + r < 0 || x - r > W || y - r > H) continue;
      c.globalAlpha = clamp(L.i, 0, 1);
      c.drawImage(this.sprite, x - r, y - r * L.f, r * 2, r * 2 * L.f);
    }
    c.restore();
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.canvas, 0, 0, VIEW_W, VIEW_H);
  }
}

