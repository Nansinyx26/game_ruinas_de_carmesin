'use strict';
// ECLIPSE ZERO · Texturas do chão do mundo aberto, geradas por código (TexturasMundo)
// ---------------------------------------------------------------------------
// Uma textura que se repete (sem emenda) para cada bioma, pintada pixel a pixel com ruído
// periódico (nada de imagens nem bibliotecas): capim com touceiras, terra e flores (floresta),
// areia com ondulações do vento e grãos (deserto), neve com sombras azuladas e cintilância
// (neve), lama com musgo e pedrinhas molhadas (lagoa) e basalto rachado com cinza e brasas
// (cratera). Junto vem a altura (para o relevo na 3ª pessoa).
//   - Vista isométrica (Room.drawFloorAberto): o padrão é aplicado no plano do chão com a
//     transformação da projeção, por baixo das variações de cor das placas e dos detalhes.
//   - 3ª pessoa (js/terceira.js): atlas da sala inteira (cor e relevo) com o padrão, as
//     variações grandes, as trilhas e a borda que se funde com o chão distante.
// Cada bioma é gerado uma vez (512 px; 256 na qualidade baixa) e guardado.
// ---------------------------------------------------------------------------
const TexturasMundo = (function () {
  const CACHE = {};
  // ruído de valor periódico (período p) e fbm periódico
  function hash(i, j, s) { let h = (i * 374761393 + j * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, p, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash(((xi % p) + p) % p, ((yi % p) + p) % p, s), b = hash((((xi + 1) % p) + p) % p, ((yi % p) + p) % p, s);
    const c = hash(((xi % p) + p) % p, (((yi + 1) % p) + p) % p, s), d = hash((((xi + 1) % p) + p) % p, (((yi + 1) % p) + p) % p, s);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(u, v, base, oct, s) { let t = 0, amp = 0.5, f = base, n = 0; for (let o = 0; o < oct; o++) { t += vnoise(u * f, v * f, f, s + o * 17) * amp; n += amp; amp *= 0.5; f *= 2; } return t / n; }
  // células (Worley) periódicas: distância ao ponto mais perto e ao segundo
  function celulas(u, v, n, s) {
    const x = u * n, y = v * n, xi = Math.floor(x), yi = Math.floor(y);
    let d1 = 9, d2 = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = xi + i, cy = yi + j, px = cx + hash(((cx % n) + n) % n, ((cy % n) + n) % n, s), py = cy + hash(((cx % n) + n) % n, ((cy % n) + n) % n, s + 9);
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return [Math.sqrt(d1), Math.sqrt(d2)];
  }
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // Cor e altura de um pixel (u, v de 0 a 1) para cada bioma
  const BIOMAS = {
    floresta(u, v, r) {
      const n = fbm(u, v, 4, 5, 11), m = fbm(u, v, 3, 3, 23), fio = vnoise(u * 160, v * 160, 160, 31);
      let c = mix([34, 62, 30], [70, 112, 46], n);
      c = mix(c, [86, 64, 38], sm(0.62, 0.78, m) * 0.85);                    // terra
      c = mix(c, [24, 44, 22], (1 - fio) * 0.35);                           // folhas do capim
      if (r < 0.0016) c = r < 0.0008 ? [210, 230, 120] : [160, 210, 255];   // florzinhas
      return [c, 0.4 + n * 0.35 + fio * 0.25 - sm(0.62, 0.78, m) * 0.2];
    },
    deserto(u, v, r) {
      const w = fbm(u, v, 3, 3, 41), onda = Math.sin((v * 7 + w * 2.2 + u * 1.3) * Math.PI * 2 * 2);
      const grao = vnoise(u * 256, v * 256, 256, 43), n = fbm(u, v, 4, 4, 47);
      let c = mix([160, 120, 76], [204, 168, 116], n);
      c = mix(c, onda > 0 ? [236, 204, 150] : [150, 110, 66], Math.abs(onda) * 0.35);
      c = mix(c, [120, 90, 58], (grao > 0.82 ? 0.5 : 0) + (r < 0.002 ? 0.8 : 0));
      return [c, 0.5 + onda * 0.3 + grao * 0.1];
    },
    neve(u, v, r) {
      const n = fbm(u, v, 3, 5, 61), g = fbm(u, v, 6, 3, 67), brilho = hash(Math.floor(u * 512), Math.floor(v * 512), 71);
      let c = mix([168, 186, 214], [236, 242, 250], n);
      c = mix(c, [150, 200, 236], sm(0.68, 0.8, g) * 0.6);                 // placas de gelo
      if (brilho > 0.996) c = [255, 255, 255];
      return [c, 0.3 + n * 0.6];
    },
    lagoa(u, v, r) {
      const n = fbm(u, v, 4, 5, 81), musgo = fbm(u, v, 3, 3, 83), molhado = fbm(u, v, 5, 3, 87);
      let c = mix([46, 62, 58], [78, 94, 78], n);
      c = mix(c, [52, 104, 64], sm(0.55, 0.7, musgo) * 0.8);
      c = mix(c, [30, 92, 112], sm(0.66, 0.74, molhado) * 0.85);            // poças rasas
      const [d1] = celulas(u, v, 22, 89);
      if (d1 < 0.16) c = mix(c, [128, 136, 132], (0.16 - d1) * 5);         // pedrinhas
      return [c, 0.45 + n * 0.3 + (d1 < 0.16 ? (0.16 - d1) * 2 : 0) - sm(0.66, 0.74, molhado) * 0.3];
    },
    vulcao(u, v, r) {
      const [d1, d2] = celulas(u, v, 7, 101), fenda = 1 - sm(0.0, 0.08, d2 - d1), n = fbm(u, v, 4, 5, 103), cinza = fbm(u, v, 3, 3, 107);
      let c = mix([42, 30, 28], [72, 52, 44], n);
      c = mix(c, [96, 90, 88], sm(0.6, 0.75, cinza) * 0.6);                 // cinza
      c = mix(c, [14, 8, 8], fenda * 0.85);
      if (fenda > 0.85 && r < 0.25) c = mix(c, [255, 90, 30], 0.6);          // brasa no fundo da fenda
      return [c, 0.55 + n * 0.25 - fenda * 0.45];
    },
  };
  // Textura do bioma: { cor, altura } (canvas que se repetem), gerada uma vez
  function bioma(tipo) {
    const q = typeof Settings !== 'undefined' ? Settings.v.quality : 2, S = q >= 2 ? 512 : 256, key = `${tipo}:${S}`;
    if (CACHE[key]) return CACHE[key];
    const f = BIOMAS[tipo];
    if (!f) return null;
    const cor = document.createElement('canvas'), alt = document.createElement('canvas');
    cor.width = cor.height = alt.width = alt.height = S;
    const gc = cor.getContext('2d'), ga = alt.getContext('2d'), ic = gc.createImageData(S, S), ia = ga.createImageData(S, S);
    const rnd = mulberry32(tipo.length * 9973 + 5);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const [c, h] = f(x / S, y / S, rnd()), i = (y * S + x) * 4;
      ic.data[i] = c[0]; ic.data[i + 1] = c[1]; ic.data[i + 2] = c[2]; ic.data[i + 3] = 255;
      const hv = Math.max(0, Math.min(255, h * 255));
      ia.data[i] = 0; ia.data[i + 1] = 235; ia.data[i + 2] = hv; ia.data[i + 3] = 255;   // R metal 0, G aspereza alta, B altura
    }
    gc.putImageData(ic, 0, 0); ga.putImageData(ia, 0, 0);
    return (CACHE[key] = { cor, alt, S });
  }
  // Tamanho, em unidades do mundo, que uma repetição da textura cobre
  const ESCALA = { floresta: 150, deserto: 190, neve: 210, lagoa: 160, vulcao: 170 };

  return {
    BIOMAS, bioma, ESCALA,
    tem(tipo) { return !!BIOMAS[tipo]; },
    // Vista isométrica: preenche o chão (polígono já no caminho do ctx) com o padrão no plano do chão
    padraoIso(ctx, tipo) {
      const T = bioma(tipo);
      if (!T) return null;
      const p = ctx.createPattern(T.cor, 'repeat'), k = ESCALA[tipo] / T.S;
      if (p.setTransform) p.setTransform(new DOMMatrix([k, k * 0.5, -k, k * 0.5, 0, 0]));   // (x, y) do mundo → isoX = x − y, isoY = (x + y) / 2
      return p;
    },
    // 3ª pessoa: atlas de cor e de relevo da sala [−m, w + m]², com as trilhas e a borda que some
    // na cor do chão distante (corLonge, '#rrggbb')
    atlas(R, tipo, corLonge) {
      const T = bioma(tipo);
      if (!T) return null;
      const q = typeof Settings !== 'undefined' ? Settings.v.quality : 2, A = q >= 2 ? 2048 : 1024, m = R.margem || 0, L = R.w + 2 * m, k = A / L;
      const cor = document.createElement('canvas'), alt = document.createElement('canvas');
      cor.width = cor.height = A; alt.width = alt.height = A >> 1;
      const g = cor.getContext('2d'), ga = alt.getContext('2d');
      const ps = ESCALA[tipo] / T.S * k, pc = g.createPattern(T.cor, 'repeat'), pa = ga.createPattern(T.alt, 'repeat');
      if (pc.setTransform) pc.setTransform(new DOMMatrix([ps, 0, 0, ps, 0, 0]));
      if (pa.setTransform) pa.setTransform(new DOMMatrix([ps / 2, 0, 0, ps / 2, 0, 0]));
      g.fillStyle = pc; g.fillRect(0, 0, A, A);
      ga.fillStyle = pa; ga.fillRect(0, 0, A >> 1, A >> 1);
      // variações grandes de cor (manchas do tamanho de algumas placas)
      const r = mulberry32((R.seed || 1) * 7 + 3), S = R.theme.speck || ['80,80,80'];
      for (let i = 0; i < 60; i++) {
        const x = r() * A, y = r() * A, rad = (40 + r() * 140) * k * 2.2, c = S[(r() * S.length) | 0];
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, `rgba(${c},${0.12 + r() * 0.12})`); gr.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      // trilhas do centro até o meio de cada borda (as passagens)
      const cx = (m + R.w / 2) * k, cy = (m + R.h / 2) * k, Wd = 34 * k;
      g.lineCap = 'round';
      for (const [x, y] of [[m + R.w / 2, m], [m + R.w / 2, m + R.h], [m, m + R.h / 2], [m + R.w, m + R.h / 2]]) {
        const mx = (cx + x * k) / 2 + (r() - 0.5) * 120 * k, my = (cy + y * k) / 2 + (r() - 0.5) * 120 * k;
        g.strokeStyle = 'rgba(120,100,80,0.16)'; g.lineWidth = Wd;
        g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(mx, my, x * k, y * k); g.stroke();
        g.strokeStyle = 'rgba(30,24,20,0.12)'; g.lineWidth = Wd * 0.3;
        g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(mx, my, x * k, y * k); g.stroke();
      }
      // borda: some na cor do chão distante (sem emenda com o anel de longe)
      const bw = m * k * 0.9;
      const lado = (x0, y0, x1, y1, rx, ry, rw, rh) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, corLonge); gr.addColorStop(1, corLonge + '00'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh); };
      lado(0, 0, bw, 0, 0, 0, bw, A); lado(A, 0, A - bw, 0, A - bw, 0, bw, A); lado(0, 0, 0, bw, 0, 0, A, bw); lado(0, A, 0, A - bw, 0, A - bw, A, bw);
      return { cor, alt, m, L };
    },
  };
})();
