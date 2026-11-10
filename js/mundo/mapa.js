'use strict';
// ECLIPSE ZERO · Mundo aberto: o mapa desenhado (WorldMapArt), usado por World.drawMap (tecla M)
// ---------------------------------------------------------------------------
// TERRENO: pintado por código uma vez para o tamanho do mapa e guardado num canvas (nada de
// imagem externa). Um continente cercado de mar (litoral com ruído, mar raso e fundo, ondas),
// relevo com sombra de luz do noroeste e o bioma de cada região com a textura dele, misturado
// nas bordas: Carmesin (ruínas com fendas vermelhas), Velmora (floresta), Asterion (montanhas
// com neve), Nexus (quarteirões e a cúpula), Lagoa Cristalina (lago com cristais e ilhas),
// Seraph (dunas e cânion) e Obsidiano (cratera e rios de lava). Por cima: estradas que saem de
// Carmesin para cada região, rios das montanhas até o mar, árvores, picos, prédios, dunas.
// SOBREPOSIÇÃO (a cada quadro, em World.drawMap): névoa nas regiões ainda não exploradas
// (mais fechada e com cadeado nas bloqueadas), nomes das regiões, trilhas e marcadores das
// zonas, moldura com coordenadas, rosa dos ventos e escala.
// As posições vêm de WORLD_REGIONS (at, r) e World.mapLayout; o terreno usa um espaço virtual de
// 1100 de largura com a proporção do mapa, então fica igual em qualquer tamanho de tela.
// ---------------------------------------------------------------------------
const WorldMapArt = (function () {
  const BIOMA = { carmesin: 'ruinas', velmora: 'floresta', asterion: 'montanha', nexus: 'cidade', lagoa: 'lago', seraph: 'deserto', obsidiano: 'vulcao',
    metropole: 'cidade', ruinas: 'ruinas', nexuszero: 'cidade' };
  const VW = 1100;

  // ------------------------------------------------------------ ruído (determinístico)
  function hash2(ix, iy, s) {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(s, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s, oct) {
    let sum = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { sum += amp * vnoise(x * f, y * f, s + i * 17); n += amp; amp *= 0.5; f *= 2.03; }
    return sum / n;
  }
  const crista = (v) => 1 - Math.abs(2 * v - 1);
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

  // ------------------------------------------------------------ geografia
  // Regiões no espaço virtual (VW × VH): centro e raio, como em World.mapLayout
  function geo(VH) {
    const m = Math.min(VW, VH);
    return WORLD_REGIONS.map((r) => ({ id: r.id, b: BIOMA[r.id] || 'ruinas', cx: r.at[0] * VW, cy: r.at[1] * VH, rad: r.r * m }));
  }
  // O que há num ponto: as duas regiões mais próximas (distância normalizada pelo raio, com as
  // bordas tortas pelo ruído), o continente (costa < 1 é terra) e se é água do lago
  function amostra(G, VH, vx, vy, out) {
    const wx = vx + (fbm(vx / 110, vy / 110, 11, 3) - 0.5) * 90, wy = vy + (fbm(vx / 110, vy / 110, 23, 3) - 0.5) * 90;
    let d1 = 1e9, d2 = 1e9, i1 = 0, i2 = 0;
    for (let i = 0; i < G.length; i++) {
      const d = Math.hypot(wx - G[i].cx, wy - G[i].cy) / G[i].rad;
      if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = i; } else if (d < d2) { d2 = d; i2 = i; }
    }
    const ce = Math.hypot((wx - 0.49 * VW) / (0.43 * VW), (wy - 0.47 * VH) / (0.47 * VH));
    out.wx = wx; out.wy = wy; out.d1 = d1; out.d2 = d2; out.i1 = i1; out.i2 = i2;
    out.costa = Math.min(d1 / 2.25, ce);
    out.lago = G[i1].b === 'lago' && d1 < 0.62 + (vnoise(vx / 30, vy / 30, 91) - 0.5) * 0.3;
    return out;
  }

  // Cor do bioma num ponto de terra (e = relevo, n = textura); emissivo = não recebe sombra
  function corBioma(b, P, vx, vy, e, n, d) {
    switch (b) {
      case 'floresta': {
        let c = mix3([24, 50, 30], [40, 76, 44], n);
        const t = vnoise(vx / 3.2, vy / 3.2, 41);
        if (t > 0.62) c = mix3(c, [12, 30, 18], 0.5); else if (t < 0.25) c = mix3(c, [58, 96, 58], 0.35);
        return c;
      }
      case 'montanha': {
        let c = mix3([56, 60, 70], [108, 115, 128], clamp(e * 1.4 - 0.2, 0, 1));
        return mix3(c, [216, 226, 238], sstep(0.58, 0.68, e));
      }
      case 'cidade': {
        const gx = ((vx % 13) + 13) % 13, gy = ((vy % 11) + 11) % 11;
        if (gx < 1.5 || gy < 1.5) return [46, 64, 88];
        const h = hash2(Math.floor(vx / 13), Math.floor(vy / 11), 5);
        return mix3([24, 32, 46], [40, 52, 70], h);
      }
      case 'lago': return mix3([34, 62, 62], [48, 84, 76], n);
      case 'deserto': {
        let c = mix3([104, 80, 46], [138, 106, 62], n);
        const s = Math.sin((vx * 0.55 + vy * 0.85) / 7 + fbm(vx / 60, vy / 60, 33, 2) * 9);
        if (s > 0.72) c = mix3(c, [176, 142, 88], 0.45); else if (s < -0.8) c = mix3(c, [78, 58, 34], 0.4);
        return c;
      }
      case 'vulcao': {
        if (d < 0.2) { P.emi = true; return mix3([255, 110, 36], [255, 190, 90], vnoise(vx / 5, vy / 5, 61)); }
        if (d < 0.36) return [22, 14, 14];
        const r = crista(fbm(vx / 42, vy / 42, 77, 3));
        if (r > 0.91 && d < 1.15) { P.emi = true; return mix3([200, 60, 20], [255, 130, 40], sstep(0.91, 0.98, r)); }
        return mix3([32, 22, 20], [62, 40, 32], n);
      }
      case 'ruinas': {
        const r = crista(fbm(vx / 36, vy / 36, 55, 3));
        if (r > 0.955 && d < 1.05) { P.emi = true; return mix3([120, 22, 44], [220, 46, 84], sstep(0.955, 0.995, r)); }
        let c = mix3([48, 32, 40], [74, 48, 58], n);
        if (vnoise(vx / 2.6, vy / 2.6, 13) > 0.72) c = mix3(c, [96, 76, 82], 0.5);
        return c;
      }
    }
    return mix3([40, 42, 38], [58, 58, 50], n);
  }

  // ------------------------------------------------------------ pintura do terreno
  // Pixel a pixel numa resolução intermediária (relevo, cor, sombra), ampliado para o canvas
  // final, e depois os desenhos vetoriais (árvores, picos, prédios, estradas, rios)
  function pintar(mw0, mh0) {
    const VH = Math.round(VW * mh0 / mw0), G = geo(VH);
    const BW = Math.max(200, Math.round(mw0 * 0.85)), BH = Math.max(100, Math.round(mh0 * 0.85));
    const N = BW * BH, elev = new Float32Array(N), tipo = new Uint8Array(N), cor = new Float32Array(N * 3);
    const P = {}, A = {};
    for (let by = 0; by < BH; by++) {
      for (let bx = 0; bx < BW; bx++) {
        const i = by * BW + bx, vx = (bx + 0.5) / BW * VW, vy = (by + 0.5) / BH * VH;
        amostra(G, VH, vx, vy, A);
        const R1 = G[A.i1];
        let e = fbm(A.wx / 70, A.wy / 70, 5, 4);
        if (R1.b === 'montanha') e += clamp(1.5 - A.d1, 0, 1) * (crista(fbm(A.wx / 45, A.wy / 45, 9, 3)) * 0.45 + 0.1);
        elev[i] = e;
        if (A.costa >= 1) {
          // mar: raso perto da costa, fundo longe; ondas finas
          const k = sstep(1, 1.18, A.costa), w = Math.sin(vy / 5 + fbm(vx / 80, vy / 80, 3, 2) * 10) > 0.93 ? 1 : 0;
          const c = mix3([18, 50, 74], [6, 16, 32], k);
          cor[i * 3] = c[0] + w * 5; cor[i * 3 + 1] = c[1] + w * 10; cor[i * 3 + 2] = c[2] + w * 15;
          tipo[i] = 1; continue;
        }
        if (A.lago) {
          const k = clamp((0.62 - A.d1) / 0.62, 0, 1);
          const c = mix3([24, 92, 118], [10, 46, 82], k);
          cor[i * 3] = c[0]; cor[i * 3 + 1] = c[1]; cor[i * 3 + 2] = c[2];
          tipo[i] = 1; continue;
        }
        const n = fbm(vx / 24, vy / 24, 3, 3);
        P.emi = false;
        let c = corBioma(R1.b, P, vx, vy, e, n, A.d1);
        // borda entre duas regiões: mistura as duas
        if (A.d2 - A.d1 < 0.3 && A.d2 < 2.2 && !P.emi) {
          const P2 = {}, c2 = corBioma(G[A.i2].b, P2, vx, vy, e, n, A.d2);
          if (!P2.emi) c = mix3(c, c2, 0.5 * (1 - (A.d2 - A.d1) / 0.3));
        }
        // longe de qualquer região: terra de ninguém
        if (!P.emi) c = mix3(c, mix3([40, 42, 38], [58, 58, 50], n), sstep(1.3, 1.95, A.d1));
        // praia: a faixa da costa
        if (A.costa > 0.96 && !P.emi) c = mix3(c, [92, 84, 66], sstep(0.96, 1, A.costa) * 0.7);
        cor[i * 3] = c[0]; cor[i * 3 + 1] = c[1]; cor[i * 3 + 2] = c[2];
        tipo[i] = P.emi ? 2 : 0;
      }
    }
    const buf = document.createElement('canvas');
    buf.width = BW; buf.height = BH;
    const bctx = buf.getContext('2d'), img = bctx.createImageData(BW, BH), D = img.data;
    for (let by = 0; by < BH; by++) {
      for (let bx = 0; bx < BW; bx++) {
        const i = by * BW + bx;
        let k = 1;
        if (tipo[i] === 0 && bx > 0 && by > 0 && bx < BW - 1 && by < BH - 1) k = clamp(1 + (elev[i - BW - 1] - elev[i + BW + 1]) * 8, 0.7, 1.32);
        else if (tipo[i] === 2) k = 1.15;
        D[i * 4] = clamp(cor[i * 3] * k, 0, 255); D[i * 4 + 1] = clamp(cor[i * 3 + 1] * k, 0, 255); D[i * 4 + 2] = clamp(cor[i * 3 + 2] * k, 0, 255); D[i * 4 + 3] = 255;
      }
    }
    bctx.putImageData(img, 0, 0);
    const Q = 1.6, cv = document.createElement('canvas');
    cv.width = Math.round(mw0 * Q); cv.height = Math.round(mh0 * Q);
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(buf, 0, 0, cv.width, cv.height);
    c.save();
    c.scale(cv.width / VW, cv.height / VH);
    desenhos(c, G, VH);
    c.restore();
    return cv;
  }

  // ------------------------------------------------------------ desenhos por cima do terreno
  function desenhos(c, G, VH) {
    const rr = mulberry32(20250417), A = {};
    const R = (id) => G.find((g) => g.id === id);
    const pontos = (g, n, raio, ok) => {
      const out = [];
      for (let k = 0, t = 0; k < n && t < n * 8; t++) {
        const a = rr() * TAU, d = Math.sqrt(rr()) * raio * g.rad, x = g.cx + Math.cos(a) * d, y = g.cy + Math.sin(a) * d;
        amostra(G, VH, x, y, A);
        if (A.costa >= 0.97 || A.lago || G[A.i1] !== g || (ok && !ok(A))) continue;
        out.push([x, y, A.d1]); k++;
      }
      return out.sort((p, q) => p[1] - q[1]);
    };
    // rios: das montanhas até a lagoa e o mar; de Velmora para o oeste
    const rio = (pts, w) => {
      c.strokeStyle = 'rgba(70,150,210,0.85)'; c.lineCap = 'round'; c.lineJoin = 'round';
      for (let k = 1; k < pts.length; k++) {
        c.lineWidth = w * (0.6 + 0.4 * k / pts.length);
        c.beginPath(); c.moveTo(pts[k - 1][0], pts[k - 1][1]);
        const mx = (pts[k - 1][0] + pts[k][0]) / 2 + (rr() - 0.5) * 40, my = (pts[k - 1][1] + pts[k][1]) / 2 + (rr() - 0.5) * 30;
        c.quadraticCurveTo(mx, my, pts[k][0], pts[k][1]); c.stroke();
      }
    };
    const as = R('asterion'), lg = R('lagoa'), vm = R('velmora'), cm = R('carmesin'), sr = R('seraph'), ob = R('obsidiano'), nx = R('nexus');
    rio([[as.cx + as.rad * 0.4, as.cy + as.rad * 0.5], [as.cx + as.rad * 1.6, as.cy + as.rad * 1.7], [lg.cx - lg.rad * 1.4, lg.cy - lg.rad * 0.9], [lg.cx - lg.rad * 0.5, lg.cy - lg.rad * 0.2]], 3.2);
    rio([[lg.cx + lg.rad * 0.5, lg.cy + lg.rad * 0.1], [lg.cx + lg.rad * 1.6, lg.cy + lg.rad * 0.5], [VW * 0.99, lg.cy + lg.rad * 0.9]], 4);
    rio([[as.cx - as.rad * 0.5, as.cy + as.rad * 0.4], [vm.cx + vm.rad * 0.9, vm.cy - vm.rad * 0.2], [vm.cx - vm.rad * 0.4, vm.cy + vm.rad * 0.3], [VW * 0.01, vm.cy + vm.rad * 0.8]], 2.6);
    // floresta
    for (const [x, y] of pontos(vm, 340, 1.25)) {
      const s = 2.2 + rr() * 1.8;
      c.fillStyle = 'rgba(8,22,12,0.55)'; c.beginPath(); c.ellipse(x + 1, y + 1.4, s, s * 0.7, 0, 0, TAU); c.fill();
      c.fillStyle = `rgb(${22 + rr() * 14 | 0},${54 + rr() * 22 | 0},${30 + rr() * 12 | 0})`; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
      c.fillStyle = 'rgba(120,190,110,0.35)'; c.beginPath(); c.arc(x - s * 0.35, y - s * 0.35, s * 0.45, 0, TAU); c.fill();
    }
    // montanhas: picos com o lado da sombra e a neve
    for (const [x, y, d] of pontos(as, 44, 1.2, (P) => P.d1 < 1.15)) {
      const w = 9 + rr() * 11 + (1.2 - d) * 6, h = w * (0.75 + rr() * 0.35);
      c.fillStyle = '#7d8696'; c.beginPath(); c.moveTo(x - w, y); c.lineTo(x, y - h); c.lineTo(x, y); c.closePath(); c.fill();
      c.fillStyle = '#454b57'; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + w, y); c.lineTo(x, y); c.closePath(); c.fill();
      c.fillStyle = '#e8eef7'; c.beginPath(); c.moveTo(x - w * 0.36, y - h * 0.64); c.lineTo(x, y - h); c.lineTo(x + w * 0.36, y - h * 0.64); c.lineTo(x + w * 0.1, y - h * 0.7); c.lineTo(x - w * 0.08, y - h * 0.6); c.closePath(); c.fill();
    }
    // cidade: prédios com janelas acesas e a cúpula no centro
    for (const [x, y] of pontos(nx, 70, 1.05)) {
      const w = 4 + rr() * 6, h = 4 + rr() * 9;
      c.fillStyle = '#1b2533'; c.fillRect(x - w / 2, y - h, w, h);
      c.fillStyle = '#2c3d55'; c.fillRect(x - w / 2, y - h, w, 1.5);
      if (rr() < 0.8) { c.fillStyle = rr() < 0.7 ? 'rgba(120,210,255,0.9)' : 'rgba(255,214,140,0.9)'; c.fillRect(x - w / 4 + rr() * w / 2, y - h * 0.6, 1.2, 1.2); }
    }
    {
      const g = c.createRadialGradient(nx.cx, nx.cy, 2, nx.cx, nx.cy, nx.rad * 0.5);
      g.addColorStop(0, 'rgba(120,220,255,0.55)'); g.addColorStop(1, 'rgba(120,220,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(nx.cx, nx.cy, nx.rad * 0.5, 0, TAU); c.fill();
      c.fillStyle = '#16212f'; c.strokeStyle = 'rgba(140,225,255,0.9)'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(nx.cx, nx.cy, 9, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillRect(nx.cx - 1.5, nx.cy - 24, 3, 15); c.strokeRect(nx.cx - 1.5, nx.cy - 24, 3, 15);
    }
    // deserto: dunas em arco e o cânion
    for (const [x, y] of pontos(sr, 46, 1.15)) {
      const w = 8 + rr() * 12;
      c.strokeStyle = 'rgba(196,160,104,0.55)'; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(x - w, y + 2); c.quadraticCurveTo(x, y - w * 0.45, x + w, y + 2); c.stroke();
      c.strokeStyle = 'rgba(70,50,30,0.45)';
      c.beginPath(); c.moveTo(x - w * 0.2, y - w * 0.18); c.quadraticCurveTo(x + w * 0.4, y - w * 0.08, x + w, y + 2); c.stroke();
    }
    c.strokeStyle = 'rgba(54,32,20,0.85)'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(sr.cx - sr.rad * 0.9, sr.cy - sr.rad * 0.5);
    for (let k = 1; k <= 8; k++) c.lineTo(sr.cx - sr.rad * 0.9 + k * sr.rad * 0.24, sr.cy - sr.rad * 0.5 + Math.sin(k * 1.9) * 8 + k * sr.rad * 0.09);
    c.stroke();
    // lago: ilhas e cristais
    for (let k = 0; k < 3; k++) {
      const a = 0.7 + k * 2.1, x = lg.cx + Math.cos(a) * lg.rad * 0.3, y = lg.cy + Math.sin(a) * lg.rad * 0.25;
      c.fillStyle = '#2e4f48'; c.beginPath(); c.ellipse(x, y, 7 + k * 2, 4 + k, 0.3, 0, TAU); c.fill();
      c.fillStyle = 'rgba(200,190,140,0.5)'; c.beginPath(); c.ellipse(x, y + 1, 8 + k * 2, 5 + k, 0.3, 0, TAU); c.lineWidth = 0.8; c.strokeStyle = 'rgba(210,200,150,0.5)'; c.stroke();
    }
    for (let k = 0; k < 26; k++) {
      const a = rr() * TAU, d = (0.25 + rr() * 0.9) * lg.rad, x = lg.cx + Math.cos(a) * d, y = lg.cy + Math.sin(a) * d * 0.9, s = 1.6 + rr() * 2.2;
      c.fillStyle = 'rgba(140,250,255,0.85)'; c.beginPath(); c.moveTo(x, y - s * 1.8); c.lineTo(x + s * 0.7, y); c.lineTo(x, y + s * 0.4); c.lineTo(x - s * 0.7, y); c.closePath(); c.fill();
    }
    // vulcão: borda da cratera e rios de lava saindo dela
    c.strokeStyle = 'rgba(80,50,40,0.95)'; c.lineWidth = 3.5;
    c.beginPath(); c.arc(ob.cx, ob.cy, ob.rad * 0.4, 0, TAU); c.stroke();
    c.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const a = 0.4 + k * 1.55 + rr() * 0.4;
      c.strokeStyle = 'rgba(255,120,40,0.85)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(ob.cx + Math.cos(a) * ob.rad * 0.4, ob.cy + Math.sin(a) * ob.rad * 0.4);
      c.quadraticCurveTo(ob.cx + Math.cos(a + 0.4) * ob.rad * 0.8, ob.cy + Math.sin(a + 0.4) * ob.rad * 0.8, ob.cx + Math.cos(a + 0.2) * ob.rad * 1.15, ob.cy + Math.sin(a + 0.2) * ob.rad * 1.15);
      c.stroke();
    }
    // ruínas: prédios partidos e o brilho vermelho do núcleo
    for (const [x, y] of pontos(cm, 60, 1.05)) {
      const w = 4 + rr() * 6, h = 3 + rr() * 6;
      c.fillStyle = 'rgba(30,18,24,0.85)'; c.fillRect(x - w / 2, y - h, w, h);
      c.strokeStyle = 'rgba(150,110,120,0.55)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h); c.lineTo(x + w * (rr() * 0.4), y - h * (0.6 + rr() * 0.4)); c.stroke();
    }
    {
      const g = c.createRadialGradient(cm.cx, cm.cy + cm.rad * 0.3, 2, cm.cx, cm.cy + cm.rad * 0.3, cm.rad * 0.7);
      g.addColorStop(0, 'rgba(255,40,80,0.45)'); g.addColorStop(1, 'rgba(255,40,80,0)');
      c.fillStyle = g; c.beginPath(); c.arc(cm.cx, cm.cy + cm.rad * 0.3, cm.rad * 0.7, 0, TAU); c.fill();
    }
    // estradas: de Carmesin (o centro do mundo) para cada região
    c.setLineDash([5, 4]); c.lineCap = 'round';
    for (const g of G) {
      if (g === cm) continue;
      const mx = (cm.cx + g.cx) / 2 + (g.cy - cm.cy) * 0.12, my = (cm.cy + g.cy) / 2 - (g.cx - cm.cx) * 0.12;
      c.strokeStyle = 'rgba(20,14,10,0.5)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(cm.cx, cm.cy); c.quadraticCurveTo(mx, my, g.cx, g.cy); c.stroke();
      c.strokeStyle = 'rgba(214,190,140,0.55)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(cm.cx, cm.cy); c.quadraticCurveTo(mx, my, g.cx, g.cy); c.stroke();
    }
    c.setLineDash([]);
  }

  // ------------------------------------------------------------ névoa
  // Nuvem de névoa (um sprite reaproveitado): manchas escuras com bordas suaves
  let NUVEM = null;
  function nuvem() {
    if (NUVEM) return NUVEM;
    const S = 256, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d'), rr = mulberry32(77);
    for (let k = 0; k < 26; k++) {
      const a = rr() * TAU, d = Math.sqrt(rr()) * S * 0.28, x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d, r = S * (0.12 + rr() * 0.14);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(14,18,28,0.75)'); g.addColorStop(0.6, 'rgba(14,18,28,0.45)'); g.addColorStop(1, 'rgba(14,18,28,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    for (let k = 0; k < 14; k++) {
      const x = S * (0.2 + rr() * 0.6), y = S * (0.25 + rr() * 0.5), r = S * (0.05 + rr() * 0.07);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(120,135,160,0.16)'); g.addColorStop(1, 'rgba(120,135,160,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    return (NUVEM = cv);
  }

  // ------------------------------------------------------------ API
  const CACHE = { key: '', cv: null };
  return {
    BIOMA,
    // Canvas do terreno para o tamanho do mapa no zoom 1 (pinta na primeira vez)
    terreno(mw0, mh0) {
      const key = `${Math.round(mw0)}x${Math.round(mh0)}`;
      if (CACHE.key !== key) { CACHE.cv = pintar(Math.round(mw0), Math.round(mh0)); CACHE.key = key; }
      return CACHE.cv;
    },
    // Névoa sobre uma região não explorada (bloqueada: mais fechada, com hachura)
    nevoa(ctx, x, y, rad, bloqueada, t) {
      const N = nuvem(), s = rad * (bloqueada ? 3.1 : 2.7), drift = Math.sin(t * 0.3 + x) * rad * 0.04;
      ctx.save();
      ctx.globalAlpha = bloqueada ? 0.95 : 0.8;
      ctx.drawImage(N, x - s / 2 + drift, y - s / 2, s, s);
      ctx.drawImage(N, x - s * 0.42 - drift, y - s * 0.38, s * 0.84, s * 0.76);
      if (bloqueada) {
        ctx.beginPath(); ctx.arc(x, y, rad * 1.05, 0, TAU); ctx.clip();
        ctx.strokeStyle = 'rgba(150,160,185,0.12)'; ctx.lineWidth = 1;
        for (let k = -rad * 2; k < rad * 2; k += 7) { ctx.beginPath(); ctx.moveTo(x + k - rad, y - rad * 1.1); ctx.lineTo(x + k + rad, y + rad * 1.1); ctx.stroke(); }
      }
      ctx.restore();
    },
    // Moldura de atlas: borda dupla, letras e números nas margens, rosa dos ventos e escala
    moldura(ctx, X, Y, W, H, t) {
      ctx.save();
      ctx.strokeStyle = 'rgba(150,180,220,0.45)'; ctx.lineWidth = 1.5; ctx.strokeRect(X + 0.5, Y + 0.5, W - 1, H - 1);
      ctx.strokeStyle = 'rgba(150,180,220,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(X + 5.5, Y + 5.5, W - 11, H - 11);
      ctx.font = `bold 9px ${FONT_TITLE}`; ctx.fillStyle = 'rgba(170,195,230,0.6)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const nc = 10, nr = 6;
      for (let i = 0; i < nc; i++) {
        const x = X + (i + 0.5) * W / nc;
        ctx.fillText('ABCDEFGHIJ'[i], x, Y + 13); ctx.fillText('ABCDEFGHIJ'[i], x, Y + H - 12);
        if (i) { ctx.fillStyle = 'rgba(150,180,220,0.4)'; ctx.fillRect(X + i * W / nc, Y, 1, 6); ctx.fillRect(X + i * W / nc, Y + H - 6, 1, 6); ctx.fillStyle = 'rgba(170,195,230,0.6)'; }
      }
      for (let j = 0; j < nr; j++) {
        const y = Y + (j + 0.5) * H / nr;
        ctx.fillText(String(j + 1), X + 12, y); ctx.fillText(String(j + 1), X + W - 12, y);
        if (j) { ctx.fillStyle = 'rgba(150,180,220,0.4)'; ctx.fillRect(X, Y + j * H / nr, 6, 1); ctx.fillRect(X + W - 6, Y + j * H / nr, 6, 1); ctx.fillStyle = 'rgba(170,195,230,0.6)'; }
      }
      // rosa dos ventos (canto inferior esquerdo)
      const cx = X + 62, cy = Y + H - 66, R = 30;
      ctx.fillStyle = 'rgba(3,7,16,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(170,200,240,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, TAU); ctx.stroke();
      for (let k = 0; k < 8; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 4, L = k % 2 ? R * 0.55 : R, w = k % 2 ? 3 : 5;
        const ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L, px = Math.cos(a + Math.PI / 2) * w, py = Math.sin(a + Math.PI / 2) * w;
        ctx.fillStyle = k === 0 ? 'rgba(255,90,120,0.95)' : 'rgba(200,220,245,0.85)';
        ctx.beginPath(); ctx.moveTo(cx + px, cy + py); ctx.lineTo(ex, ey); ctx.lineTo(cx - px, cy - py); ctx.closePath(); ctx.fill();
      }
      ctx.font = `bold 11px ${FONT_TITLE}`; ctx.fillStyle = '#ffffff';
      ctx.fillText('N', cx, cy - R - 12 + 1);
      // escala
      const sx = X + 120, sy = Y + H - 26;
      ctx.fillStyle = 'rgba(3,7,16,0.55)'; ctx.fillRect(sx - 6, sy - 10, 112, 22);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? 'rgba(220,230,245,0.85)' : 'rgba(60,70,90,0.9)'; ctx.fillRect(sx + k * 20, sy - 2, 20, 4); }
      ctx.strokeStyle = 'rgba(220,230,245,0.7)'; ctx.strokeRect(sx + 0.5, sy - 2.5, 80, 5);
      ctx.font = `9px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)'; ctx.textAlign = 'left';
      ctx.fillText('10 km', sx + 84, sy + 1);
      ctx.restore();
    },
  };
})();
