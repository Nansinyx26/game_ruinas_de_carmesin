'use strict';
// ECLIPSE ZERO · Ambientação da câmera em terceira pessoa (Ambiente3P)
// ---------------------------------------------------------------------------
// O que a 3ª pessoa mostra além da sala (js/terceira.js chama daqui):
//   CÉU por bioma e hora do mundo (js/mundo/tempo.js): degradê do zênite ao horizonte que
//     clareia de dia, fica dourado no amanhecer e no entardecer e escurece à noite; sol e lua
//     que andam com a hora, estrelas, nuvens que derivam (mais e mais escuras com chuva,
//     tempestade, neblina e areia). Na campanha (sem relógio) é sempre noite.
//   HORIZONTE: duas camadas de relevo ao longe, em volta inteira (giram com a câmera): copas
//     (floresta), dunas (deserto), montanhas nevadas (neve), ilhas com cristais (lagoa),
//     vulcões acesos (cratera) e prédios com janelas (cidade). Abaixo do horizonte, a terra
//     distante na cor da névoa.
//   LUZ E NÉVOA: a névoa tem a cor do horizonte (o chão se funde com o céu, sem linha); a luz
//     ambiente e a do sol mudam com a hora e o bioma (quente no entardecer, azulada à noite).
//   CHÃO: o piso continua até o horizonte e ganha detalhes que não colidem — capim e flores
//     acesas (floresta), ondulações e pedras (deserto), montes de neve e lascas de gelo (neve),
//     poças acesas e juncos (lagoa), fendas de lava (cratera), poças de neon (cidade). A
//     quantidade segue a Qualidade dos efeitos.
//   AR: partículas com profundidade em volta do herói (pólen, poeira, cinzas e brasas,
//     cristais de gelo, névoa baixa, pó nos interiores).
// Interiores (laboratório, túneis, catedral...) ganham um teto escuro em vez de céu.
// Na vista isométrica do mundo aberto (Game.drawSky → ceuIso) o mesmo céu fica no alto da tela,
// com o relevo ao longe e a terra distante em volta da área de jogo.
// ---------------------------------------------------------------------------
const AMB3P = {
  floresta: { dia: ['#4f86c4', '#c4dcc6'], noite: ['#03060e', '#0f1d22'], tarde: ['#3c3f6c', '#f0a070'], chao: '#3f5a44', chaoN: '#0b1512', sil: 'copas', silC: ['#46624e', '#2c4434'], ar: 'polen', amb: [0.5, 0.54, 0.5] },
  deserto: { dia: ['#4a82c8', '#f2d6a2'], noite: ['#04050f', '#1c1922'], tarde: ['#3e2f5c', '#f59a58'], chao: '#b08c5c', chaoN: '#1e1814', sil: 'dunas', silC: ['#c49a68', '#a07848'], ar: 'poeira', amb: [0.5, 0.45, 0.38] },
  neve: { dia: ['#6890c4', '#e0e9f3'], noite: ['#03060f', '#172238'], tarde: ['#41416c', '#f2b49c'], chao: '#b4c4d6', chaoN: '#141c2c', sil: 'montanhas', silC: ['#9cb0c8', '#6e84a2'], ar: 'gelo', amb: [0.5, 0.54, 0.6] },
  lagoa: { dia: ['#4890c8', '#bfe4ee'], noite: ['#020912', '#0d2836'], tarde: ['#2f3e6a', '#eaa27c'], chao: '#3c6e7e', chaoN: '#08161e', sil: 'ilhas', silC: ['#4c7f8c', '#2e5a66'], ar: 'nevoa', amb: [0.44, 0.52, 0.58] },
  vulcao: { dia: ['#3a2a2c', '#a8573c'], noite: ['#0b0304', '#43150b'], tarde: ['#2c1416', '#d4642c'], chao: '#3c1c16', chaoN: '#150806', sil: 'vulcoes', silC: ['#4a2420', '#2c1210'], ar: 'brasas', amb: [0.5, 0.36, 0.3] },
  cidade: { dia: ['#0a0f24', '#3a2c4c'], noite: ['#03040e', '#1e1434'], tarde: ['#0a0f24', '#3a2c4c'], chao: '#1a1a2a', chaoN: '#0c0c18', sil: 'predios', silC: ['#1c1e34', '#10121f'], ar: 'po', amb: null },
  interior: { teto: true, ar: 'po', amb: null },
};

const Ambiente3P = {
  ceuT: 0, nuvens: null, estrelas: null, parts: [], partTipo: '', R: null,
  // ------------------------------------------------------------ cores
  rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; },
  mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; },
  css(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; },
  tipo(R) { const th = R.theme; return th.deco === 'natural' ? R.def.theme : th.sky === 'city' || th.sky === 'tower' ? 'cidade' : 'interior'; },
  hora() { return game.world && typeof WorldTime !== 'undefined' ? WorldTime.hora() : 23; },
  luz() { return game.world && typeof WorldTime !== 'undefined' ? WorldTime.luz() : 0; },
  clima() { return game.world && typeof WorldTime !== 'undefined' ? WorldTime.clima() : 'limpo'; },
  // Quanto o céu está fechado (chuva, tempestade, neblina, areia, nevasca, cinzas)
  fechado() { return { chuva: 0.55, tempestade: 0.85, neblina: 0.6, areia: 0.65, nevasca: 0.7, cinzas: 0.6, neve: 0.4 }[this.clima()] || 0; },
  // Hora dourada (amanhecer e entardecer)
  dourado(h) { const b = (c) => Math.exp(-Math.pow((h - c) / 0.9, 2)); return Math.max(b(6.6), b(18.4)); },
  // Cores do céu agora: zênite, horizonte, terra distante (a névoa)
  cores(tipo) {
    const P = AMB3P[tipo];
    if (!P || P.teto) return null;
    const h = this.hora(), L = this.luz(), G = this.dourado(h) * (tipo === 'cidade' ? 0 : 0.75), F = this.fechado();
    const z = this.mix(this.mix(this.rgb(P.noite[0]), this.rgb(P.dia[0]), L), this.rgb(P.tarde[0]), G);
    let hz = this.mix(this.mix(this.rgb(P.noite[1]), this.rgb(P.dia[1]), L), this.rgb(P.tarde[1]), G);
    const cinza = this.mix([20, 22, 28], [128, 134, 142], L);
    const zz = this.mix(z, cinza, F * 0.75); hz = this.mix(hz, this.mix(cinza, hz, 0.4), F * 0.6);
    const chao = this.mix(this.mix(this.rgb(P.chaoN), this.rgb(P.chao), L), hz, 0.45);
    return { z: zz, h: hz, chao, L, G, F };
  },

  // ------------------------------------------------------------ céu, astros, nuvens e horizonte
  // Ponto da tela na direção (azimute, elevação) a partir do olho
  dir(az, el) {
    const E = ThirdView.eye, d = 3000, c = Math.cos(el);
    return ThirdView.proj(E[0] + Math.cos(az) * c * d, E[1] + Math.sin(az) * c * d, E[2] + Math.sin(el) * d);
  },
  ceu(ctx, R, t) {
    const tipo = this.tipo(R), C = this.cores(tipo), th = R.theme;
    if (!C) {
      // interior: teto escuro com o brilho das luminárias
      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, '#020306'); g.addColorStop(0.45, rgba(th.dark, 1)); g.addColorStop(1, '#000');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = rgba(th.lamp, 0.06); ctx.fillRect(0, 0, VIEW_W, VIEW_H * 0.4);
      return null;
    }
    const E = ThirdView.eye, yaw = ThirdView.yaw;
    const Hp = ThirdView.proj(E[0] + Math.cos(yaw) * 3000, E[1] + Math.sin(yaw) * 3000, E[2]);
    const yh = clamp(Hp.vis ? Hp.y : -40, -400, VIEW_H + 200);
    const g = ctx.createLinearGradient(0, Math.min(yh - VIEW_H * 0.9, 0), 0, yh);
    g.addColorStop(0, this.css(C.z)); g.addColorStop(0.75, this.css(this.mix(C.z, C.h, 0.6))); g.addColorStop(1, this.css(C.h));
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, Math.max(0, yh + 1));
    ctx.fillStyle = this.css(C.chao); ctx.fillRect(0, Math.max(0, yh), VIEW_W, VIEW_H);
    const h = this.hora(), F = C.F;
    // estrelas (à noite, menos na cidade e com céu fechado)
    if (C.L < 0.6 && F < 0.8) {
      const S = this.estrelas || (this.estrelas = Array.from({ length: 160 }, (_, i) => { const r = mulberry32(i * 7919 + 13); return { az: r() * TAU, el: 0.06 + Math.pow(r(), 0.7) * 1.35, s: r() < 0.12 ? 1.6 : 0.9, f: r() * 6 }; }));
      const a0 = (1 - C.L / 0.6) * (1 - F) * (tipo === 'cidade' ? 0.35 : 0.9);
      ctx.fillStyle = '#fff';
      for (const s of S) {
        const P = this.dir(s.az, s.el);
        if (!P.vis || P.x < 0 || P.x > VIEW_W || P.y < 0 || P.y > yh) continue;
        ctx.globalAlpha = a0 * (0.55 + 0.45 * Math.sin(t * 2 + s.f));
        ctx.fillRect(P.x, P.y, s.s, s.s);
      }
      ctx.globalAlpha = 1;
    }
    // sol e lua: nascem num lado e se põem no outro com a hora
    if (tipo !== 'cidade') {
      const k = (h - 6) / 12, elS = Math.sin(k * Math.PI) * 1.05, azS = -Math.PI * 0.5 + k * Math.PI;
      if (elS > -0.05) this.astro(ctx, this.dir(azS, Math.max(elS, 0.02)), true, C, yh);
      else this.astro(ctx, this.dir(azS + Math.PI, Math.min(1, -elS) * 0.9 + 0.1), false, C, yh);
    }
    // nuvens que derivam
    this.desenharNuvens(ctx, C, t, yh, tipo);
    // relevo ao longe (duas camadas)
    const P = AMB3P[tipo];
    this.silhueta(ctx, P.sil, 0, this.mix(this.rgb(P.silC[0]), C.h, 0.62 - 0.2 * C.L), yh, t, C);
    this.silhueta(ctx, P.sil, 1, this.mix(this.rgb(P.silC[1]), C.h, 0.38 - 0.15 * C.L), yh, t, C);
    // faixa de bruma no horizonte
    const bm = ctx.createLinearGradient(0, yh - 40, 0, yh + 30);
    bm.addColorStop(0, this.css(C.h, 0)); bm.addColorStop(0.6, this.css(this.mix(C.h, C.chao, 0.5), 0.75)); bm.addColorStop(1, this.css(C.chao, 0));
    ctx.fillStyle = bm; ctx.fillRect(0, yh - 40, VIEW_W, 70);
    return C;
  },
  astro(ctx, P, sol, C, yh) {
    if (!P.vis || P.y > yh + 10) return;
    const x = P.x, y = P.y, ouro = C.G;
    const cor = sol ? this.mix([255, 244, 214], [255, 170, 90], ouro) : [214, 226, 255];
    const raio = sol ? 15 + ouro * 6 : 10, halo = (sol ? 120 + ouro * 80 : 70) * (1 - C.F * 0.6);
    const g = ctx.createRadialGradient(x, y, 0, x, y, halo);
    g.addColorStop(0, this.css(cor, sol ? 0.55 : 0.28)); g.addColorStop(0.25, this.css(cor, sol ? 0.18 : 0.08)); g.addColorStop(1, this.css(cor, 0));
    ctx.fillStyle = g; ctx.fillRect(x - halo, y - halo, halo * 2, halo * 2);
    ctx.globalAlpha = 1 - C.F * 0.8;
    ctx.fillStyle = this.css(this.mix(cor, [255, 255, 255], 0.4));
    ctx.beginPath(); ctx.arc(x, y, raio, 0, TAU); ctx.fill();
    if (!sol) { ctx.fillStyle = this.css(this.mix(C.z, C.h, 0.3), 0.9); ctx.beginPath(); ctx.arc(x + raio * 0.45, y - raio * 0.2, raio * 0.85, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  },
  desenharNuvens(ctx, C, t, yh, tipo) {
    const N = this.nuvens || (this.nuvens = Array.from({ length: 14 }, (_, i) => { const r = mulberry32(i * 104729 + 5); return { az: r() * TAU, el: 0.07 + r() * 0.3, w: 0.22 + r() * 0.3, h: 0.035 + r() * 0.04, v: 0.004 + r() * 0.006, b: Array.from({ length: 6 }, () => [r() - 0.5, r() * 0.6, 0.5 + r() * 0.6]) }; }));
    const F = C.F, qtd = Math.round(5 + F * 9), cor = this.mix(this.mix([40, 46, 70], [250, 250, 252], C.L), [255, 170, 130], C.G * 0.8);
    const sombra = this.mix(cor, C.z, 0.35 + F * 0.3), a = (tipo === 'cidade' ? 0.25 : 0.42) + F * 0.35;
    for (let i = 0; i < qtd; i++) {
      const n = N[i], az = n.az + t * n.v, P0 = this.dir(az - n.w / 2, n.el), P1 = this.dir(az + n.w / 2, n.el);
      if (!P0.vis || !P1.vis || (P0.x < -300 && P1.x < -300) || (P0.x > VIEW_W + 300 && P1.x > VIEW_W + 300) || P0.y > yh) continue;
      const w = Math.abs(P1.x - P0.x), cx = (P0.x + P1.x) / 2, cy = (P0.y + P1.y) / 2, hh = Math.max(6, w * n.h * 3);
      if (w > VIEW_W * 2) continue;
      for (const [dx, dy, s] of n.b) {
        const x = cx + dx * w, y = cy - dy * hh, rx = w * 0.22 * s, ry = hh * s;
        const g = ctx.createRadialGradient(x, y + ry * 0.2, 0, x, y, rx);
        g.addColorStop(0, this.css(cor, a)); g.addColorStop(0.6, this.css(sombra, a * 0.6)); g.addColorStop(1, this.css(sombra, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
      }
    }
  },
  // Altura do relevo (radianos acima do horizonte) num azimute, por tipo e camada
  altura(tipo, cam, az) {
    const s = (n, f) => Math.sin(az * n + f + cam * 1.7);
    if (tipo === 'montanhas') { const r = Math.abs(s(3, 0.4)) * 0.09 + Math.abs(s(7, 1.3)) * 0.05 + Math.abs(s(17, 2.1)) * 0.018; return (cam ? 0.05 : 0.09) + r * (cam ? 0.7 : 1); }
    if (tipo === 'dunas') return (cam ? 0.018 : 0.03) + (s(4, 0.2) * 0.5 + 0.5) * 0.03 + (s(9, 1.1) * 0.5 + 0.5) * 0.012;
    if (tipo === 'copas') { const b = 0.045 + (s(5, 0.3) * 0.5 + 0.5) * 0.025; const k = Math.abs(s(61, 0.7)) * 0.022 + Math.abs(s(23, 2.2)) * 0.014; return (cam ? b * 0.8 : b) + k; }
    if (tipo === 'ilhas') { const m = Math.max(0, s(6, 0.5)) * 0.03; const c = Math.pow(Math.max(0, s(29, 1.9)), 12) * 0.05; return (cam ? 0.006 : 0.012) + m + (cam ? c : c * 0.6); }
    if (tipo === 'vulcoes') { let v = cam ? 0.02 : 0.035; for (const [c, w, hh] of [[0.6, 0.35, 0.16], [2.4, 0.5, 0.11], [4.3, 0.3, 0.19], [5.6, 0.4, 0.09]]) { const d = Math.abs(((az - c + cam * 1.3) % TAU + TAU + Math.PI) % TAU - Math.PI); v = Math.max(v, hh * (cam ? 0.7 : 1) * Math.max(0, 1 - d / w)); } return v + Math.abs(s(13, 0.4)) * 0.01; }
    if (tipo === 'predios') { const i = Math.floor((az / TAU) * (cam ? 70 : 46)), r = mulberry32((i + cam * 977) >>> 0); return (cam ? 0.05 : 0.08) + Math.pow(r(), 2) * (cam ? 0.12 : 0.2); }
    return 0.02;
  },
  silhueta(ctx, tipo, cam, cor, yh, t, C) {
    const asp = VIEW_W / VIEW_H, F = ThirdView.focal, esc = F * VIEW_H / 2, yaw = ThirdView.yaw, passo = tipo === 'predios' ? 3 : 6;
    ctx.fillStyle = this.css(cor);
    ctx.beginPath(); ctx.moveTo(-10, yh + 40);
    const tops = [];
    for (let x = -10; x <= VIEW_W + passo; x += passo) {
      const az = yaw + Math.atan(((x / VIEW_W) * 2 - 1) * asp / F), y = yh - Math.tan(this.altura(tipo, cam, az)) * esc;
      ctx.lineTo(x, y); tops.push([x, y, az]);
    }
    ctx.lineTo(VIEW_W + 10, yh + 40); ctx.closePath(); ctx.fill();
    // detalhes acesos: neve nos picos, janelas, bocas dos vulcões, cristais
    if (tipo === 'montanhas' && cam === 0) {
      // neve nos picos mais altos: uma faixa clara logo abaixo da crista
      ctx.fillStyle = this.css(this.mix([240, 246, 255], C.h, 0.45), 0.55);
      const lim = esc * 0.1;
      let run = [];
      const fecha = () => {
        if (run.length > 1) {
          ctx.beginPath(); ctx.moveTo(run[0][0], run[0][1]);
          for (const [x, y] of run) ctx.lineTo(x, y);
          for (let i = run.length - 1; i >= 0; i--) { const [x, y] = run[i]; ctx.lineTo(x, y + (yh - y - lim) * 0.45); }
          ctx.fill();
        }
        run = [];
      };
      for (const q of tops) { if (yh - q[1] > lim) run.push(q); else fecha(); }
      fecha();
    } else if (tipo === 'predios') {
      const a = 0.5 - C.L * 0.3;
      for (let i = 0; i < tops.length; i += 2) {
        const [x, y, az] = tops[i], r = mulberry32((Math.floor(az * 300) + cam * 31) >>> 0);
        if (r() < 0.55) { ctx.fillStyle = r() < 0.7 ? `rgba(255,214,140,${a * (cam ? 1 : 0.6)})` : `rgba(120,200,255,${a})`; ctx.fillRect(x, y + 4 + r() * Math.max(2, yh - y - 8), 2, 2); }
      }
    } else if (tipo === 'vulcoes' && cam === 0) {
      for (let i = 1; i < tops.length - 1; i++) {
        const [x, y] = tops[i];
        if (y < tops[i - 1][1] && y <= tops[i + 1][1] && yh - y > esc * 0.08) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, 40);
          g.addColorStop(0, `rgba(255,130,50,${0.55 + 0.2 * Math.sin(t * 2 + x)})`); g.addColorStop(1, 'rgba(255,90,30,0)');
          ctx.fillStyle = g; ctx.fillRect(x - 40, y - 40, 80, 80);
        }
      }
    } else if (tipo === 'ilhas' && cam === 1) {
      ctx.fillStyle = 'rgba(120,235,255,0.35)';
      for (const [x, y] of tops) if (yh - y > esc * 0.04) ctx.fillRect(x + 2, y, 2, yh - y);
    }
  },

  // ------------------------------------------------------------ vista isométrica
  // Cor da terra distante na vista isométrica ('r,g,b'): a borda do chão some nela (Room) e o
  // fundo a usa (ceuIso). É a cor de dia: a noite vem da camada do relógio do mundo
  longeIso(tipo) { const P = AMB3P[tipo]; if (!P || !P.chao) return null; const c = this.mix(this.rgb(P.chao), this.rgb(P.dia[1]), 0.25); return `${c[0] | 0},${c[1] | 0},${c[2] | 0}`; },
  // Fundo da vista isométrica no campo aberto: céu no alto (hora, nuvens, sol ou lua, estrelas),
  // relevo ao longe e a terra distante em volta da área de jogo, com um leve paralaxe da câmera
  ceuIso(ctx, R, cam, t) {
    const tipo = this.tipo(R), C = this.cores(tipo), P = AMB3P[tipo];
    if (!C || !P.chao) return false;
    const px = clamp(cam.x * 0.03, -200, 200), yh = clamp(VIEW_H * 0.3 - cam.y * 0.035, VIEW_H * 0.1, VIEW_H * 0.42);
    const g = ctx.createLinearGradient(0, 0, 0, yh);
    g.addColorStop(0, this.css(C.z)); g.addColorStop(0.7, this.css(this.mix(C.z, C.h, 0.6))); g.addColorStop(1, this.css(C.h));
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, yh + 1);
    const lg = this.longeIso(tipo).split(',').map(Number), haze = this.mix(C.h, lg, 0.5);
    const g2 = ctx.createLinearGradient(0, yh, 0, yh + 140);
    g2.addColorStop(0, this.css(haze)); g2.addColorStop(1, this.css(lg));
    ctx.fillStyle = g2; ctx.fillRect(0, yh, VIEW_W, VIEW_H - yh);
    // estrelas, sol ou lua
    const h = this.hora(), k = (h - 6) / 12;
    if (C.L < 0.6 && C.F < 0.8) {
      const S = this.estrelas || (this.estrelas = Array.from({ length: 160 }, (_, i) => { const r = mulberry32(i * 7919 + 13); return { az: r() * TAU, el: 0.06 + Math.pow(r(), 0.7) * 1.35, s: r() < 0.12 ? 1.6 : 0.9, f: r() * 6 }; }));
      ctx.fillStyle = '#fff';
      for (const st of S) {
        const x = ((st.az / TAU) * VIEW_W * 1.3 - px * 0.3) % (VIEW_W * 1.3), y = yh - (st.el / 1.41) * yh;
        if (x < 0 || y < 0) continue;
        ctx.globalAlpha = (1 - C.L / 0.6) * (1 - C.F) * 0.85 * (0.55 + 0.45 * Math.sin(t * 2 + st.f));
        ctx.fillRect(x, y, st.s, st.s);
      }
      ctx.globalAlpha = 1;
    }
    const dia = k >= 0 && k <= 1, kk = dia ? k : ((h + 6) % 24) / 12;
    const ax = VIEW_W * (0.12 + 0.76 * kk) - px * 0.2, ay = yh - Math.sin(kk * Math.PI) * yh * 0.75 + 10;
    this.astro(ctx, { vis: true, x: ax, y: ay }, dia, C, yh);
    // nuvens que derivam
    const N = this.nuvens || (this.nuvens = Array.from({ length: 14 }, (_, i) => { const r = mulberry32(i * 104729 + 5); return { az: r() * TAU, el: 0.07 + r() * 0.3, w: 0.22 + r() * 0.3, h: 0.035 + r() * 0.04, v: 0.004 + r() * 0.006, b: Array.from({ length: 6 }, () => [r() - 0.5, r() * 0.6, 0.5 + r() * 0.6]) }; }));
    const qtd = Math.round(5 + C.F * 9), cor = this.mix(this.mix([40, 46, 70], [250, 250, 252], C.L), [255, 170, 130], C.G * 0.8), sombra = this.mix(cor, C.z, 0.35 + C.F * 0.3), a = 0.42 + C.F * 0.35;
    for (let i = 0; i < qtd; i++) {
      const n = N[i], L = VIEW_W * 1.6, w = n.w * VIEW_W * 0.9, cx = (((n.az / TAU) * L + t * n.v * 900 - px * 0.5) % L + L) % L - L * 0.2, cy = yh * (0.85 - n.el * 2.2), hh = w * n.h * 1.6;
      if (cx < -w || cx > VIEW_W + w) continue;
      for (const [dx, dy, sz] of n.b) {
        const x = cx + dx * w, y = cy - dy * hh, rx = w * 0.22 * sz, ry = hh * sz;
        const gr = ctx.createRadialGradient(x, y + ry * 0.2, 0, x, y, rx);
        gr.addColorStop(0, this.css(cor, a)); gr.addColorStop(0.6, this.css(sombra, a * 0.6)); gr.addColorStop(1, this.css(sombra, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
      }
    }
    // relevo ao longe (duas camadas, a da frente com mais paralaxe)
    for (let cam2 = 0; cam2 < 2; cam2++) {
      const cor2 = this.mix(this.rgb(P.silC[cam2]), C.h, cam2 ? 0.3 : 0.55), off = px * (0.4 + cam2 * 0.5), esc = VIEW_H * 1.5;
      ctx.fillStyle = this.css(cor2);
      ctx.beginPath(); ctx.moveTo(-10, yh + 24);
      for (let x = -10; x <= VIEW_W + 8; x += 6) { const az = (x + off) / VIEW_W * 1.7; ctx.lineTo(x, yh - Math.tan(this.altura(P.sil, cam2, az)) * esc + cam2 * 6); }
      ctx.lineTo(VIEW_W + 10, yh + 24); ctx.closePath(); ctx.fill();
    }
    const bm = ctx.createLinearGradient(0, yh - 20, 0, yh + 40);
    bm.addColorStop(0, this.css(haze, 0)); bm.addColorStop(0.5, this.css(haze, 0.8)); bm.addColorStop(1, this.css(lg, 0));
    ctx.fillStyle = bm; ctx.fillRect(0, yh - 20, VIEW_W, 60);
    return true;
  },

  // ------------------------------------------------------------ luz e névoa
  // Ajusta a luz do motor 3D para esta passada (restaurada em fim()); devolve a névoa
  luzes(R, C, view) {
    const th = R.theme, L = R3D.light, tipo = this.tipo(R), P = AMB3P[tipo];
    this.salva = this.salva || { key: L.key.slice() };
    if (!C || !P.amb) {
      const lc = th.lamp.split(',').map((v) => v / 255), dia = game.world && typeof WorldTime !== 'undefined' ? WorldTime.ambiente(th) : 1;
      L.amb = [(0.34 + lc[0] * 0.16) * dia, (0.38 + lc[1] * 0.16) * dia, (0.5 + lc[2] * 0.16) * dia];
      const dk = th.dark.split(',').map((v) => v / 255);
      return C ? [C.chao[0] / 255, C.chao[1] / 255, C.chao[2] / 255, 330] : [dk[0] * 1.4 + 0.01, dk[1] * 1.4 + 0.01, dk[2] * 1.4 + 0.015, 300];
    }
    const k = C.L, F = C.F;
    const noite = [0.16, 0.2, 0.34], dia = P.amb;
    let amb = this.mix(noite, dia, k);
    amb = this.mix(amb, [amb[0] * 1.15 + 0.04, amb[1] * 0.92, amb[2] * 0.78], C.G);
    L.amb = amb.map((v) => v * (1 - F * 0.25));
    const sol = this.mix(this.mix([0.34, 0.42, 0.66], [0.92, 0.88, 0.8], k), [1.05, 0.72, 0.48], C.G);
    L.key = sol.map((v) => v * (1 - F * 0.45));
    // direção: metade o sol (quando de dia), metade a luz de câmera de sempre
    const h = this.hora(), kk = (h - 6) / 12, elS = Math.max(0.25, Math.sin(kk * Math.PI) * 1.05), azS = -Math.PI * 0.5 + kk * Math.PI;
    const sd = k > 0.2 ? [Math.cos(azS) * Math.cos(elS), Math.sin(azS) * Math.cos(elS), Math.sin(elS)] : [0, 0, 1];
    const key = view.key, w = 0.5 * Math.min(1, k * 2);
    for (let i = 0; i < 3; i++) key[i] = key[i] * (1 - w) + sd[i] * w;
    const q = Math.hypot(key[0], key[1], key[2]) || 1; key[0] /= q; key[1] /= q; key[2] /= q;
    // névoa: a cor da terra distante; começa mais perto com o céu fechado
    return [C.chao[0] / 255, C.chao[1] / 255, C.chao[2] / 255, (tipo === 'cidade' ? 300 : 360) * (1 - F * 0.45)];
  },
  fim() { if (this.salva) { R3D.light.key = this.salva.key.slice(); } },

  // ------------------------------------------------------------ chão: até o horizonte e detalhes
  // Acrescenta ao modelo da sala o chão distante e os detalhes do bioma (sem colisão)
  decorar(root, R) {
    const tipo = this.tipo(R), q = typeof Settings !== 'undefined' ? Settings.v.quality : 2;
    const th = R.theme, w = R.w, h = R.h, m = R.margem || 0, P = AMB3P[tipo];
    // chão distante (campo aberto e cidade): um anel largo na cor do chão do bioma, sumindo na névoa
    if (R.aberto || tipo === 'cidade') {
      const g = new G3(), far = 3600, c = P && P.chao ? P.chao : '#202028';
      const x0 = -m, y0 = -m, x1 = w + m, y1 = h + m, z = -0.4;
      g.quad([-far, -far, z], [far + w, -far, z], [far + w, y0, z], [-far, y0, z], c, 0);
      g.quad([-far, y1, z], [far + w, y1, z], [far + w, far + h, z], [-far, far + h, z], c, 0);
      g.quad([-far, y0, z], [x0, y0, z], [x0, y1, z], [-far, y1, z], c, 0);
      g.quad([x1, y0, z], [far + w, y0, z], [far + w, y1, z], [x1, y1, z], c, 0);
      root.add(new N3('chaoLonge', g));
    }
    if (!q || (!R.aberto && tipo !== 'cidade')) return;
    const r = mulberry32((R.seed || 7) * 31 + 5), g = new G3(), n = q === 1 ? 0.5 : 1;
    const livre = (x, y) => !R.pillars.some((p) => !p.deco && dist2(p.x, p.y, x, y) < (p.r + 8) * (p.r + 8));
    const ponto = () => { for (let k = 0; k < 6; k++) { const x = -m * 0.6 + r() * (w + m * 1.2), y = -m * 0.6 + r() * (h + m * 1.2); if (livre(x, y)) return [x, y]; } return null; };
    const hex = (c) => '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
    if (tipo === 'floresta') {
      for (let i = 0; i < 420 * n; i++) {
        const p = ponto(); if (!p) continue;
        const tom = [40 + r() * 40, 90 + r() * 60, 34 + r() * 30];
        for (let k = 0; k < 3; k++) { const a = r() * TAU, d = r() * 3; g.cyl(p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d, 0, 1.1 + r() * 0.6, 0, 5 + r() * 7, 4, hex(tom), 0, { shift: [(r() - 0.5) * 3, (r() - 0.5) * 3] }); }
      }
      for (let i = 0; i < 45 * n; i++) { const p = ponto(); if (!p) continue; g.sphere(p[0], p[1], 3, 1.6, 1.6, 1.6, 5, 3, r() < 0.5 ? '#b4ffa8' : '#9ad8ff', 0.75); g.cyl(p[0], p[1], 0, 0.4, 0.4, 3, 3, '#2c5a2a', 0); }
    } else if (tipo === 'deserto') {
      for (let i = 0; i < 150 * n; i++) {
        const p = ponto(); if (!p) continue;
        const a = 0.35 + (r() - 0.5) * 0.3, L = 26 + r() * 40, W = 3 + r() * 3, ca = Math.cos(a), sa = Math.sin(a), cx = p[0], cy = p[1];
        const pt = (u, v, zz) => [cx + ca * u - sa * v, cy + sa * u + ca * v, zz];
        g.quad(pt(-L / 2, -W / 2, 0.3), pt(L / 2, -W / 2, 0.3), pt(L / 2, 0, 1.2), pt(-L / 2, 0, 1.2), '#d4b07c', 0);
        g.quad(pt(-L / 2, 0, 1.2), pt(L / 2, 0, 1.2), pt(L / 2, W / 2, 0.3), pt(-L / 2, W / 2, 0.3), '#9c784c', 0);
      }
      for (let i = 0; i < 90 * n; i++) { const p = ponto(); if (!p) continue; g.sphere(p[0], p[1], 1, 2 + r() * 3, 2 + r() * 2.5, 1.2 + r() * 1.5, 5, 3, hex([120 + r() * 40, 96 + r() * 30, 70 + r() * 20]), 0); }
      for (let i = 0; i < 40 * n; i++) { const p = ponto(); if (!p) continue; for (let k = 0; k < 4; k++) g.cyl(p[0], p[1], 0, 0.6, 0, 7 + r() * 5, 3, '#5a4630', 0, { shift: [(r() - 0.5) * 8, (r() - 0.5) * 8] }); }
    } else if (tipo === 'neve') {
      for (let i = 0; i < 110 * n; i++) { const p = ponto(); if (!p) continue; const s = 8 + r() * 18; g.sphere(p[0], p[1], -0.5, s, s * (0.6 + r() * 0.5), 1.8 + r() * 2.4, 12, 3, '#dfe8f4', 0); }
      for (let i = 0; i < 40 * n; i++) { const p = ponto(); if (!p) continue; for (let k = 0; k < 3; k++) g.cyl(p[0] + (r() - 0.5) * 6, p[1] + (r() - 0.5) * 6, 0, 1.6, 0, 6 + r() * 9, 4, '#a8dcff', 0.35, { shift: [(r() - 0.5) * 5, (r() - 0.5) * 5] }); }
    } else if (tipo === 'lagoa') {
      for (let i = 0; i < 34 * n; i++) {
        const p = ponto(); if (!p) continue;
        const R0 = 12 + r() * 26, pts = [];
        for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU, rr = R0 * (0.75 + r() * 0.4); pts.push([p[0] + Math.cos(a) * rr, p[1] + Math.sin(a) * rr * 0.8, 0.25]); }
        g.poly(pts, '#1a5268', 0.1);
      }
      for (let i = 0; i < 160 * n; i++) { const p = ponto(); if (!p) continue; for (let k = 0; k < 3; k++) g.cyl(p[0] + (r() - 0.5) * 4, p[1] + (r() - 0.5) * 4, 0, 0.6, 0.2, 10 + r() * 12, 3, '#2c4a36', 0, { shift: [(r() - 0.5) * 4, (r() - 0.5) * 4] }); }
    } else if (tipo === 'vulcao') {
      for (let i = 0; i < 46 * n; i++) {
        const p = ponto(); if (!p) continue;
        let x = p[0], y = p[1], a = r() * TAU;
        for (let k = 0; k < 5; k++) {
          const L = 10 + r() * 16, nx = x + Math.cos(a) * L, ny = y + Math.sin(a) * L, px = -Math.sin(a) * 0.9, py = Math.cos(a) * 0.9;
          g.quad([x - px, y - py, 0.3], [nx - px, ny - py, 0.3], [nx + px, ny + py, 0.3], [x + px, y + py, 0.3], '#c83c14', 0.5);
          x = nx; y = ny; a += (r() - 0.5) * 1.4;
        }
      }
      for (let i = 0; i < 70 * n; i++) { const p = ponto(); if (!p) continue; g.sphere(p[0], p[1], 0, 3 + r() * 6, 3 + r() * 5, 2 + r() * 3, 5, 3, '#241210', 0); }
    } else if (tipo === 'cidade') {
      for (let i = 0; i < 26 * n; i++) {
        const p = ponto(); if (!p) continue;
        const R0 = 10 + r() * 22, pts = [], cor = r() < 0.5 ? '#ff3cc8' : '#3cb4ff';
        for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU; pts.push([p[0] + Math.cos(a) * R0 * (0.7 + r() * 0.4), p[1] + Math.sin(a) * R0 * 0.6, 0.2]); }
        g.poly(pts, cor, 0.22);
      }
    }
    root.add(new N3('detalhes', g));
  },

  // ------------------------------------------------------------ partículas do ar (com profundidade)
  ar(R) { const P = AMB3P[this.tipo(R)]; return P ? P.ar : 'po'; },
  update(dt) {
    const p = game.player, R = game.room;
    if (!p || !R || !ThirdView.active()) return;
    const tipo = this.ar(R), q = typeof Settings !== 'undefined' ? Settings.v.quality : 2, N = [16, 44, 80][q] || 44;
    if (this.partTipo !== tipo || this.parts.length !== N) {
      this.partTipo = tipo;
      this.parts = Array.from({ length: N }, () => this.nova(p, tipo, true));
    }
    const B = 420;
    for (const a of this.parts) {
      a.f += dt;
      a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
      if (tipo === 'polen' || tipo === 'po') { a.x += Math.sin(a.f * 0.7 + a.s) * 6 * dt; a.z += Math.sin(a.f * 1.1 + a.s) * 4 * dt; }
      if (Math.abs(a.x - p.x) > B || Math.abs(a.y - p.y) > B || a.z < 0 || a.z > 220) Object.assign(a, this.nova(p, tipo, false));
    }
  },
  nova(p, tipo, ini) {
    const r = Math.random, a = r() * TAU, d = 60 + r() * 360, b = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, z: 4 + r() * 120, vx: 0, vy: 0, vz: 0, f: r() * 9, s: r() * 9 };
    if (tipo === 'brasas') { b.z = ini ? r() * 160 : 2; b.vz = 18 + r() * 30; b.vx = (r() - 0.5) * 14; b.vy = (r() - 0.5) * 14; }
    else if (tipo === 'poeira') { b.z = 2 + r() * 40; b.vx = 70 + r() * 70; b.vy = 20 + r() * 20; }
    else if (tipo === 'gelo') { b.vz = -6 - r() * 6; b.vx = 8; b.z = ini ? r() * 200 : 200; }
    else if (tipo === 'nevoa') { b.z = 4 + r() * 18; b.vx = 6 + r() * 6; }
    else { b.vz = (r() - 0.5) * 4; }
    return b;
  },
  desenharAr(ctx, R, t) {
    const tipo = this.ar(R), noite = this.luz() < 0.3;
    ctx.save();
    ctx.globalCompositeOperation = tipo === 'nevoa' ? 'source-over' : 'lighter';
    for (const a of this.parts) {
      const P = ThirdView.proj(a.x, a.y, a.z);
      if (!P.vis || P.x < -40 || P.x > VIEW_W + 40 || P.y < -40 || P.y > VIEW_H + 40) continue;
      const k = clamp(P.k, 0.05, 3), longe = clamp(1 - (P.w - 120) / 700, 0, 1);
      if (longe <= 0) continue;
      if (tipo === 'brasas') { ctx.fillStyle = `rgba(255,${120 + (a.s * 10 | 0) % 60},50,${0.8 * longe})`; ctx.fillRect(P.x, P.y, 2.2 * k + 0.6, 2.2 * k + 0.6); }
      else if (tipo === 'poeira') { ctx.strokeStyle = `rgba(240,200,140,${0.22 * longe})`; ctx.lineWidth = Math.max(0.6, k); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x - 14 * k, P.y - 3 * k); ctx.stroke(); }
      else if (tipo === 'gelo') { const tw = 0.5 + 0.5 * Math.sin(t * 6 + a.s); ctx.fillStyle = `rgba(220,240,255,${0.7 * longe * tw})`; ctx.fillRect(P.x, P.y, 1.5 * k + 0.5, 1.5 * k + 0.5); }
      else if (tipo === 'nevoa') { const s = 60 * k; const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, s); g.addColorStop(0, `rgba(200,236,245,${0.08 * longe})`); g.addColorStop(1, 'rgba(200,236,245,0)'); ctx.fillStyle = g; ctx.fillRect(P.x - s, P.y - s, s * 2, s * 2); }
      else if (tipo === 'polen') { const c = noite ? '170,255,150' : '255,246,190', tw = noite ? 0.5 + 0.5 * Math.sin(t * 3 + a.s) : 0.6; ctx.fillStyle = `rgba(${c},${(noite ? 0.9 : 0.5) * longe * tw})`; ctx.beginPath(); ctx.arc(P.x, P.y, (noite ? 1.6 : 1.1) * k + 0.4, 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = `rgba(220,226,240,${0.18 * longe})`; ctx.fillRect(P.x, P.y, 1.2 * k + 0.4, 1.2 * k + 0.4); }
    }
    ctx.restore();
  },
};
