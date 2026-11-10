'use strict';
// ECLIPSE ZERO · Criação de personagem: as texturas pintadas do modelo (PinturaPers)
// ---------------------------------------------------------------------------
// O modelo detalhado (js/criacao/modelo.js) usa uma textura só (atlas de 1024×1024) e o mapa de
// material do motor (R = metal, G = aspereza, B = relevo: o R3D_FS_TEX tira o relevo das
// derivadas dessa altura). Os dois são pintados aqui num canvas, a partir da aparência e da
// roupa da classe: pele com poros e rubor, olhos (esclera, íris com raios e pupila, cílios),
// sobrancelhas fio a fio, lábios, barba por fazer, cicatrizes, tatuagem e pintura de guerra;
// tecido com trama, couro com grão e costuras, acolchoado, malha de anéis, placas com rebites,
// cabelo em fios; costuras, debruns, botões, cordões, fivelas e o emblema da classe.
// Cada região do atlas tem um sentido (u, v) combinado com a geometria (ver ATLAS e as funções
// uv*): na cabeça e no rosto, u segue o ângulo em volta e v a latitude; nos membros e no
// tronco, u dá a volta (frente no meio) e v desce ao longo.
// ---------------------------------------------------------------------------
const PinturaPers = (function () {
  const LADO = 1024, PI = Math.PI;
  // Regiões do atlas [x, y, largura, altura] em pixels
  const ATLAS = {
    rosto: [0, 0, 512, 512], cab: [512, 0, 256, 256], cabelo: [768, 0, 256, 256],
    braco: [512, 256, 128, 256], perna: [640, 256, 128, 256], saia: [768, 256, 256, 256],
    tronco: [0, 512, 512, 256], bota: [512, 512, 256, 128], mao: [768, 512, 128, 128], barba: [896, 512, 128, 128],
    cinto: [512, 640, 256, 64], gola: [512, 704, 256, 64], ombro: [768, 640, 256, 128],
    pescoco: [0, 768, 128, 128], extra: [128, 768, 256, 64], sola: [128, 832, 128, 64], pele: [256, 832, 64, 64],
    bracadeira: [384, 768, 128, 128], bolsa: [512, 768, 128, 64],
  };
  // O rosto: a frente da cabeça em grade fina (θ de −0,8 a 0,8 rad, φ de 0,72 a −1,15)
  const ROSTO = { t0: -0.8, t1: 0.8, f0: 0.72, f1: -1.15 };
  // Pontos do rosto (θ, φ): olhos, sobrancelhas, nariz, boca, queixo (a geometria usa os mesmos)
  const FACE = { olho: [0.36, 0.035], olhoW: 0.19, olhoH: 0.06, sobr: 0.19, narizP: -0.24, narizB: -0.33, boca: -0.47, queixo: -0.84 };
  const uvReg = (nome, u, v) => { const R = ATLAS[nome]; return [(R[0] + 1 + (R[2] - 2) * u) / LADO, (R[1] + 1 + (R[3] - 2) * v) / LADO]; };
  const uvRosto = (th, ph) => uvReg('rosto', (th - ROSTO.t0) / (ROSTO.t1 - ROSTO.t0), (ROSTO.f0 - ph) / (ROSTO.f0 - ROSTO.f1));
  // resto da cabeça: u pelo ângulo (frente no meio), v pela latitude
  const uvCab = (th, ph) => uvReg('cab', (th + PI) / (2 * PI), (PI / 2 - ph) / PI);
  // pixel de (θ, φ) no rosto e na cabeça
  const pxRosto = (th, ph) => { const R = ATLAS.rosto; return [R[0] + R[2] * (th - ROSTO.t0) / (ROSTO.t1 - ROSTO.t0), R[1] + R[3] * (ROSTO.f0 - ph) / (ROSTO.f0 - ROSTO.f1)]; };
  const pxCab = (th, ph) => { const R = ATLAS.cab; return [R[0] + R[2] * (th + PI) / (2 * PI), R[1] + R[3] * (PI / 2 - ph) / PI]; };
  const pxReg = (nome, u, v) => { const R = ATLAS[nome]; return [R[0] + R[2] * u, R[1] + R[3] * v]; };

  // ------------------------------------------------------------ amostras (geradas uma vez)
  let semente = 1;
  const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };
  function grade(n, per, s) {   // ruído de valor periódico (n px, período per células)
    const G = [];
    semente = s;
    for (let i = 0; i < per * per; i++) G.push(rnd());
    return (x, y) => {
      const fx = (x / n) * per, fy = (y / n) * per, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const a = G[((y0 % per) * per + (x0 % per))], b = G[((y0 % per) * per + ((x0 + 1) % per))];
      const c = G[(((y0 + 1) % per) * per + (x0 % per))], d = G[(((y0 + 1) % per) * per + ((x0 + 1) % per))];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }
  function fbm(n, s, oit = 4, per0 = 4) {
    const N = []; for (let o = 0; o < oit; o++) N.push(grade(n, per0 << o, s + o * 101));
    return (x, y) => { let v = 0, a = 0.5, t = 0; for (let o = 0; o < oit; o++) { v += N[o](x, y) * a; t += a; a *= 0.5; } return v / t; };
  }
  function amostra(n, f) {
    const c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'), im = g.createImageData(n, n), D = im.data;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = Math.max(0, Math.min(255, f(x, y) * 255)), k = (y * n + x) * 4; D[k] = D[k + 1] = D[k + 2] = v; D[k + 3] = 255; }
    g.putImageData(im, 0, 0);
    return c;
  }
  // versão para o mapa de material: só o azul (relevo), somada com 'lighter'
  function soAzul(c, k) {
    const n = c.width, o = document.createElement('canvas'); o.width = o.height = n;
    const g = o.getContext('2d'), im = c.getContext('2d').getImageData(0, 0, n, n), D = im.data;
    for (let i = 0; i < D.length; i += 4) { D[i + 2] = D[i] * k; D[i] = 0; D[i + 1] = 0; D[i + 3] = 255; }
    g.putImageData(im, 0, 0);
    return o;
  }
  const AM = {};
  function amostras() {
    if (AM.ok) return AM;
    const r1 = fbm(256, 7, 5, 4), r2 = fbm(128, 31, 3, 8), r3 = fbm(256, 57, 4, 2);
    // ruído suave (variação de cor), poros finos
    AM.ruido = amostra(256, (x, y) => 0.78 + r1(x, y) * 0.22);
    AM.poros = amostra(128, (x, y) => { const v = r2(x, y); return 0.9 + v * 0.1 - (((x * 7 + y * 13) % 17 === 0) ? 0.06 : 0); });
    // trama do tecido: fios cruzados 2×2 com sombra
    AM.trama = amostra(64, (x, y) => {
      const cx = x % 4, cy = y % 4, sobre = ((x >> 2) + (y >> 2)) & 1;
      const fio = sobre ? Math.sin((cx + 0.5) / 4 * PI) : Math.sin((cy + 0.5) / 4 * PI);
      return 0.72 + fio * 0.25 + r2(x * 2, y * 2) * 0.05;
    });
    // couro: grão com vincos
    AM.grao = amostra(256, (x, y) => { const v = r1(x * 2 % 256, y * 2 % 256), vinco = Math.abs(r3(x, y) - 0.5) * 2; return 0.8 + v * 0.14 + Math.min(1, vinco * 4) * 0.06; });
    // acolchoado: losangos estufados
    AM.acolchoado = amostra(64, (x, y) => { const a = ((x + y) % 32) / 32, b = ((x - y + 64) % 32) / 32, d = Math.min(a, 1 - a, b, 1 - b); return 0.62 + Math.min(1, d * 6) * 0.38; });
    // malha de anéis: fileiras deslocadas
    AM.malha = amostra(32, (x, y) => {
      const row = Math.floor(y / 6), ox = (row & 1) * 4, cx = ((x + ox) % 8) - 4, cy = (y % 6) - 3;
      const d = Math.hypot(cx, cy * 1.25), anel = Math.abs(d - 2.6);
      return anel < 1.0 ? 0.95 - anel * 0.25 : 0.25;
    });
    // fios de cabelo: colunas com brilho variando, ondas lentas
    const fc = []; semente = 99; for (let i = 0; i < 256; i++) fc.push(rnd());
    AM.fios = amostra(256, (x, y) => {
      const w = Math.sin(y / 256 * PI * 4 + x * 0.05) * 2, xx = Math.floor((x + w + 256) % 256), v = fc[xx] * 0.6 + fc[(xx + 1) % 256] * 0.4;
      return 0.55 + v * 0.45 + r2(x, y * 0.25) * 0.08;
    });
    // pontos (barba por fazer, cabelo raspado)
    AM.pontos = amostra(128, (x, y) => { semente = (x * 73856093 ^ y * 19349663) & 0x7fffffff || 1; return rnd() < 0.18 ? 0.35 + rnd() * 0.3 : 1; });
    AM.ok = true;
    AM.alt = {};
    return AM;
  }
  const alt = (nome, k) => { const key = nome + k; return AM.alt[key] || (AM.alt[key] = soAzul(AM[nome], k)); };

  // ------------------------------------------------------------ ferramentas de pintura
  const hx = (c) => hex3(c);
  const rgb = (c, a = 1) => { const v = Array.isArray(c) ? c : hx(c); return `rgba(${Math.round(v[0] * 255)},${Math.round(v[1] * 255)},${Math.round(v[2] * 255)},${a})`; };
  const mix = (a, b, t) => { const A = Array.isArray(a) ? a : hx(a), B = Array.isArray(b) ? b : hx(b); return [0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t); };
  const esc = (c, k) => mix(c, [0, 0, 0], k), clr = (c, k) => mix(c, [1, 1, 1], k);
  // materiais: metal, aspereza
  const MAT = { pele: [0, 0.62], pano: [0, 0.9], couro: [0.04, 0.5], metal: [1, 0.3], cabelo: [0, 0.42], malha: [0.92, 0.38], placa: [0.95, 0.28], olho: [0, 0.18], labio: [0, 0.38], sola: [0, 0.8] };
  const matCor = (m, alto = 128) => `rgb(${Math.round(m[0] * 255)},${Math.round(m[1] * 255)},${alto})`;
  class Pincel {
    constructor() {
      this.C = document.createElement('canvas'); this.M = document.createElement('canvas');
      this.C.width = this.C.height = this.M.width = this.M.height = LADO;
      this.c = this.C.getContext('2d'); this.m = this.M.getContext('2d');
      this.m.fillStyle = matCor(MAT.pano); this.m.fillRect(0, 0, LADO, LADO);
    }
    // recorta as duas telas numa região (ou num caminho)
    recorte(nome, fn) {
      const R = ATLAS[nome];
      for (const g of [this.c, this.m]) { g.save(); g.beginPath(); g.rect(R[0], R[1], R[2], R[3]); g.clip(); }
      fn(R);
      this.c.restore(); this.m.restore();
    }
    // preenche um caminho (ou retângulo) com cor e material
    enche(caminho, cor, mat, alto = 128) {
      this.c.fillStyle = rgb(cor); this.m.fillStyle = matCor(mat, alto);
      for (const g of [this.c, this.m]) { g.beginPath(); caminho(g); g.fill(); }
    }
    ret(x, y, w, h, cor, mat, alto) { this.enche((g) => g.rect(x, y, w, h), cor, mat, alto); }
    // sobrepõe uma amostra (multiplica a cor; soma relevo no material)
    trama(x, y, w, h, nome, forca = 1, relevo = 0.25, escala = 1, caminho = null) {
      const A = amostras(), g = this.c;
      g.save();
      if (caminho) { g.beginPath(); caminho(g); g.clip(); }
      const p = g.createPattern(A[nome], 'repeat');
      if (escala !== 1 && p.setTransform) p.setTransform(new DOMMatrix().scale(escala, escala));
      g.globalCompositeOperation = 'multiply'; g.globalAlpha = forca; g.fillStyle = p; g.fillRect(x, y, w, h);
      g.restore();
      if (relevo > 0) {
        const m = this.m; m.save();
        if (caminho) { m.beginPath(); caminho(m); m.clip(); }
        const q = m.createPattern(alt(nome, 0.45), 'repeat');
        if (escala !== 1 && q.setTransform) q.setTransform(new DOMMatrix().scale(escala, escala));
        m.globalCompositeOperation = 'lighter'; m.globalAlpha = relevo; m.fillStyle = q; m.fillRect(x, y, w, h);
        m.restore();
      }
    }
    // gradiente de sombra/brilho só na cor
    sombra(grad, x, y, w, h, op = 'multiply') { const g = this.c; g.save(); g.globalCompositeOperation = op; g.fillStyle = grad; g.fillRect(x, y, w, h); g.restore(); }
    radial(x, y, r, cor, a, op = 'multiply', sy = 1) {
      const g = this.c; g.save(); g.translate(x, y); g.scale(1, sy);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, rgb(cor, a)); gr.addColorStop(1, rgb(cor, 0));
      g.globalCompositeOperation = op; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 2 * PI); g.fill(); g.restore();
    }
    // linha (cor) com relevo (alto > 128 saliente, < 128 sulco)
    linha(pts, cor, larg, alto = null, mat = null, tracejado = null) {
      for (const [g, st] of [[this.c, rgb(cor)], [this.m, alto === null ? null : matCor(mat || MAT.pano, alto)]]) {
        if (!st) continue;
        g.save(); g.strokeStyle = st; g.lineWidth = larg; g.lineCap = 'round'; g.lineJoin = 'round';
        if (tracejado) g.setLineDash(tracejado);
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.restore();
      }
    }
    costura(pts, cor, larg = 1.2) { this.linha(pts, cor, larg, 170, MAT.pano, [larg * 2.6, larg * 2.2]); }
    ponto(x, y, r, cor, mat, alto = 175) { this.enche((g) => g.arc(x, y, r, 0, 2 * PI), cor, mat, alto); }
  }

  // ------------------------------------------------------------ tecidos
  // Tecido de uma área: cor base + trama do material + variação suave
  function tecido(P, x, y, w, h, tipo, cor, caminho = null) {
    const mat = tipo === 'couro' ? MAT.couro : tipo === 'malha' ? MAT.malha : tipo === 'placa' ? MAT.placa : MAT.pano;
    if (caminho) P.enche(caminho, cor, mat); else P.ret(x, y, w, h, cor, mat);
    if (tipo === 'couro') { P.trama(x, y, w, h, 'grao', 0.55, 0.35, 1, caminho); P.trama(x, y, w, h, 'ruido', 0.35, 0, 1, caminho); }
    else if (tipo === 'acolchoado') { P.trama(x, y, w, h, 'acolchoado', 0.55, 0.7, 1, caminho); P.trama(x, y, w, h, 'trama', 0.3, 0.15, 1, caminho); }
    else if (tipo === 'malha') { P.trama(x, y, w, h, 'malha', 0.85, 0.6, 1, caminho); }
    else if (tipo === 'placa') { P.trama(x, y, w, h, 'ruido', 0.3, 0.05, 2, caminho); }
    else { P.trama(x, y, w, h, 'trama', 0.32, 0.18, 1, caminho); P.trama(x, y, w, h, 'ruido', 0.3, 0, 1, caminho); }
  }

  // ------------------------------------------------------------ rosto
  function olho(P, s, S) {
    const [t0, f0] = FACE.olho, te = s * t0, W = FACE.olhoW, H = FACE.olhoH;
    // amêndoa: o canto de dentro um pouco mais baixo e redondo; o de fora afinado
    const borda = (k, cima) => {   // k de −1 (dentro) a 1 (fora)
      const th = te + s * k * W, a = 1 - k * k, h = H * Math.pow(a, cima ? 0.62 : 0.8) * (cima ? 1 : 0.78) * (1 + (cima ? 0.18 : -0.1) * -k);
      return pxRosto(th, f0 - k * 0.006 + (cima ? h : -h));
    };
    const N = 24, sup = [], inf = [];
    for (let i = 0; i <= N; i++) { const k = -1 + 2 * i / N; sup.push(borda(k, true)); inf.push(borda(k, false)); }
    const amendoa = (g) => { sup.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let i = N; i >= 0; i--) g.lineTo(inf[i][0], inf[i][1]); g.closePath(); };
    // contorno escuro da órbita, vinco da pálpebra
    const [cx, cy] = pxRosto(te, f0);
    P.radial(cx, cy - 4, 46, esc(S.pele, 0.5), 0.3, 'multiply', 0.6);
    P.linha([0, 0.25, 0.5, 0.75, 1].map((k) => pxRosto(te + s * (-0.9 + k * 1.8) * W, f0 + H * 1.9 * (1 - Math.pow(-0.9 + k * 1.8, 2) * 0.55))), esc(S.pele, 0.28), 2.4, 112, MAT.pele);
    // esclera
    P.enche(amendoa, [0.84, 0.8, 0.75], MAT.olho, 150);
    // íris e pupila (olhando para a frente, um pouco para dentro)
    const [ix, iy] = pxRosto(te - s * 0.014, f0 - 0.004), rx = 21, ry = 18.5, ir = S.olho;
    const g = P.c;
    g.save(); g.beginPath(); amendoa(g); g.clip();
    const gr = g.createRadialGradient(ix, iy, 0, ix, iy, rx);
    if (S.olhoE) { gr.addColorStop(0, rgb(ir)); gr.addColorStop(0.6, rgb(mix(ir, [0.1, 0.3, 0.9], 0.3))); gr.addColorStop(1, rgb(esc(ir, 0.55))); }
    else { gr.addColorStop(0, rgb(esc(ir, 0.4))); gr.addColorStop(0.35, rgb(clr(ir, 0.15))); gr.addColorStop(0.75, rgb(ir)); gr.addColorStop(1, rgb(esc(ir, 0.6))); }
    g.fillStyle = gr; g.beginPath(); g.ellipse(ix, iy, rx, ry, 0, 0, 2 * PI); g.fill();
    // raios da íris
    g.strokeStyle = rgb(clr(ir, 0.35), 0.35); g.lineWidth = 1;
    for (let k = 0; k < 28; k++) { const a = k / 28 * 2 * PI; g.beginPath(); g.moveTo(ix + Math.cos(a) * rx * 0.42, iy + Math.sin(a) * ry * 0.42); g.lineTo(ix + Math.cos(a) * rx * 0.92, iy + Math.sin(a) * ry * 0.92); g.stroke(); }
    g.fillStyle = S.olhoE ? rgb(clr(ir, 0.55)) : '#070708'; g.beginPath(); g.ellipse(ix, iy, rx * (S.olhoE ? 0.28 : 0.4), ry * (S.olhoE ? 0.28 : 0.4), 0, 0, 2 * PI); g.fill();
    // sombra da pálpebra de cima e o brilho
    const sg = g.createLinearGradient(0, cy - 18, 0, cy + 4); sg.addColorStop(0, 'rgba(40,20,15,0.55)'); sg.addColorStop(1, 'rgba(40,20,15,0)');
    g.fillStyle = sg; g.fillRect(cx - 60, cy - 20, 120, 26);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(ix - s * 5, iy - 5, 2.6, 0, 2 * PI); g.fill();
    g.restore();
    // cílios: linha grossa em cima (asinha no canto de fora), fina embaixo
    const cil = esc(S.cab, 0.55);
    P.linha(sup, mix(cil, [0.05, 0.04, 0.04], 0.6), 4.2, 150, MAT.cabelo);
    const asa = sup[N], asa2 = pxRosto(te + s * W * 1.22, f0 + H * 0.55);
    P.linha([sup[N - 3], asa, asa2], mix(cil, [0.05, 0.04, 0.04], 0.6), 3, 150, MAT.cabelo);
    P.linha(inf.slice(4), esc(S.pele, 0.45), 1.6, 120, MAT.pele);
    // canto de dentro (carúncula)
    const cc = inf[0]; P.ponto(cc[0], cc[1] - 1, 3, mix(S.pele, [0.8, 0.4, 0.4], 0.4), MAT.labio, 135);
  }
  function sobrancelha(P, s, S, tipo) {
    if (tipo === 3) return;
    const cor = mix(S.cab, [0.05, 0.04, 0.03], 0.25), larg = tipo === 1 ? 0.05 : tipo === 2 ? 0.03 : 0.026, arco = tipo === 2 ? 0.035 : 0.012;
    semente = 1234 + (s > 0 ? 7 : 0);
    // fios curtos inclinados para fora, mais densos e grossos perto do nariz
    for (let i = 0; i < 70; i++) {
      const k = rnd(), th = s * (0.14 + k * 0.42), f = FACE.sobr + Math.sin(k * PI) * arco + (0.5 - k) * 0.018 + (rnd() - 0.5) * larg * (1.1 - k * 0.5);
      const [x, y] = pxRosto(th, f), L = 7 + rnd() * 5;
      P.linha([[x, y], [x + s * L * 0.9, y - L * (0.35 - k * 0.3)]], mix(cor, S.cab, rnd() * 0.4), 1.4 + (1 - k) * 0.9, 150, MAT.cabelo);
    }
  }
  function labios(P, S) {
    const L = mix(S.pele, [0.66, 0.3, 0.3], 0.32), Ls = esc(L, 0.18), f = FACE.boca;
    const p = (th, ph) => pxRosto(th, ph);
    // lábio de cima (arco do cupido) e de baixo (mais cheio)
    P.enche((g) => {
      const a = [p(-0.25, f), p(-0.12, f + 0.045), p(-0.03, f + 0.05), p(0, f + 0.04), p(0.03, f + 0.05), p(0.12, f + 0.045), p(0.25, f)];
      g.moveTo(a[0][0], a[0][1]); for (const q of a.slice(1)) g.lineTo(q[0], q[1]);
      const b = p(0.13, f - 0.005), c = p(-0.13, f - 0.005); g.quadraticCurveTo(b[0], b[1] + 2, p(0, f - 0.004)[0], p(0, f - 0.004)[1]); g.quadraticCurveTo(c[0], c[1] + 2, a[0][0], a[0][1]); g.closePath();
    }, Ls, MAT.labio, 140);
    P.enche((g) => {
      const a = p(-0.22, f - 0.008), b = p(0.22, f - 0.008), c = p(0, f - 0.09);
      g.moveTo(a[0], a[1]); g.quadraticCurveTo(p(-0.14, f - 0.095)[0], p(-0.14, f - 0.095)[1], c[0], c[1]); g.quadraticCurveTo(p(0.14, f - 0.095)[0], p(0.14, f - 0.095)[1], b[0], b[1]); g.closePath();
    }, L, MAT.labio, 145);
    const [mx, my] = p(0, f - 0.045); P.radial(mx, my, 12, clr(L, 0.35), 0.35, 'screen', 0.5);
    P.linha([p(-0.26, f + 0.004), p(-0.1, f - 0.006), p(0, f - 0.004), p(0.1, f - 0.006), p(0.26, f + 0.004)], esc(L, 0.5), 1.6, 108, MAT.labio);
  }
  function pintaRosto(P, S, A) {
    P.recorte('rosto', (R) => {
      const [x, y, w, h] = R, pe = S.pele;
      P.ret(x, y, w, h, pe, MAT.pele);
      P.trama(x, y, w, h, 'poros', 0.5, 0.06);
      P.trama(x, y, w, h, 'ruido', 0.18, 0, 2);
      // sombras: laterais (o rosto vira), queixo para o pescoço, testa clara
      const g = P.c;
      const sy = g.createLinearGradient(0, y, 0, y + h); sy.addColorStop(0, rgb(pe, 0)); sy.addColorStop(0.85, rgb(pe, 0)); sy.addColorStop(1, rgb(esc(pe, 0.18)));
      P.sombra(sy, x, y, w, h, 'source-over');
      // rubor nas maçãs, nariz e queixo; olheiras
      for (const s of [-1, 1]) {
        const [bx, by] = pxRosto(s * 0.52, -0.2); P.radial(bx, by, 52, [0.85, 0.35, 0.32], 0.16, 'multiply', 0.7);
        const [ox, oy] = pxRosto(s * 0.34, -0.05); P.radial(ox, oy, 26, esc(pe, 0.4), 0.18, 'multiply', 0.5);
        // narinas
        const [nx, ny] = pxRosto(s * 0.062, FACE.narizB + 0.022); P.radial(nx, ny, 6, esc(pe, 0.55), 0.55, 'multiply', 0.6);
        P.linha([pxRosto(s * 0.13, -0.27), pxRosto(s * 0.16, -0.33), pxRosto(s * 0.12, -0.36)], esc(pe, 0.3), 2, 110, MAT.pele);
        // contorno: sulco nasolabial suave, sombra sob a maçã, mandíbula, lados do nariz; brilho na maçã
        P.radial(...pxRosto(s * 0.24, -0.4), 16, esc(pe, 0.3), 0.22, 'multiply', 2.2);
        P.radial(...pxRosto(s * 0.58, -0.38), 44, esc(pe, 0.35), 0.22, 'multiply', 0.8);
        P.radial(...pxRosto(s * 0.62, -0.88), 60, esc(pe, 0.4), 0.3, 'multiply', 0.45);
        P.radial(...pxRosto(s * 0.1, -0.16), 14, esc(pe, 0.35), 0.25, 'multiply', 3);
        P.radial(...pxRosto(s * 0.6, -0.04), 34, clr(pe, 0.3), 0.25, 'screen', 0.6);
      }
      P.radial(...pxRosto(0, -0.39), 9, esc(pe, 0.3), 0.25, 'multiply', 1.8);    // filtro
      P.radial(...pxRosto(0, -0.66), 22, esc(pe, 0.35), 0.25, 'multiply', 0.5);   // sob o lábio
      P.radial(...pxRosto(0, -1.08), 120, esc(pe, 0.45), 0.4, 'multiply', 0.35);  // sob o queixo
      P.radial(...pxRosto(0, 0.4), 70, clr(pe, 0.25), 0.18, 'screen', 0.6);       // testa
      const [nx, ny] = pxRosto(0, -0.25); P.radial(nx, ny, 22, [0.85, 0.4, 0.38], 0.12, 'multiply');
      const [nb, nby] = pxRosto(0, -0.05); P.radial(nb, nby, 30, clr(pe, 0.25), 0.25, 'screen', 1.6);   // brilho na ponte
      const [qx, qy] = pxRosto(0, -0.82); P.radial(qx, qy, 34, [0.85, 0.42, 0.38], 0.08, 'multiply');
      // barba por fazer (sombra de pelos) e a base da barba cheia/cavanhaque
      if (A.barba >= 1) barbaPintada(P, S, A.barba);
      for (const s of [-1, 1]) olho(P, s, S);
      for (const s of [-1, 1]) sobrancelha(P, s, S, A.sobrancelhas);
      labios(P, S);
      marcasRosto(P, S, A.marcas);
      // transição suave na linha do cabelo (os fios mais curtos da borda)
      if (A.cabelo !== 0) bordaCabelo(P, S, (th, ph) => pxRosto(th, ph), ROSTO.t0, ROSTO.t1, 20);
      // couro cabeludo na testa (o cabelo começa na linha do cabelo)
      if (A.cabelo === 0 || A.cabelo === 5) {
        const g2 = P.c; g2.save(); g2.beginPath();
        for (let k = 0; k <= 20; k++) { const th = ROSTO.t0 + (ROSTO.t1 - ROSTO.t0) * k / 20, q = pxRosto(th, linhaCabelo(th)); k ? g2.lineTo(q[0], q[1]) : g2.moveTo(q[0], q[1]); }
        g2.lineTo(x + w, y); g2.lineTo(x, y); g2.closePath(); g2.clip();
        g2.globalCompositeOperation = 'multiply'; g2.fillStyle = rgb(mix(pe, S.cab, 0.35)); g2.fillRect(x, y, w, h);
        g2.globalAlpha = 0.6; g2.fillStyle = g2.createPattern(amostras().pontos, 'repeat'); g2.fillRect(x, y, w, h);
        g2.restore();
      }
    });
  }
  // Linha do cabelo (φ) em função do ângulo: testa alta, entradas, acima das orelhas, nuca
  function linhaCabelo(th) {
    const a = Math.abs(Math.atan2(Math.sin(th), Math.cos(th)));
    return MalhaPele.tabela([[0, 0.49], [0.12, 0.51], [0.35, 0.47], [0.62, 0.4], [0.95, 0.28], [1.35, 0.14], [1.75, 0.0], [2.3, -0.36], [PI, -0.52]], a);
  }
  // Faixa da cor do cabelo logo abaixo da linha do cabelo, sumindo para baixo
  function bordaCabelo(P, S, px, t0, t1, n) {
    const g = P.c, cor = mix(S.cab, S.pele, 0.35);
    g.save(); g.globalCompositeOperation = 'multiply';
    for (let k = 0; k < n; k++) {
      const a0 = t0 + (t1 - t0) * k / n, a1 = t0 + (t1 - t0) * (k + 1) / n, f0 = linhaCabelo(a0), f1 = linhaCabelo(a1);
      const p0 = px(a0, f0 + 0.03), p1 = px(a1, f1 + 0.03), q0 = px(a0, f0 - 0.07), q1 = px(a1, f1 - 0.07);
      const gr = g.createLinearGradient(0, Math.min(p0[1], p1[1]), 0, Math.max(q0[1], q1[1])); gr.addColorStop(0, rgb(cor, 0.85)); gr.addColorStop(1, rgb(cor, 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(q1[0], q1[1]); g.lineTo(q0[0], q0[1]); g.closePath(); g.fill();
    }
    g.restore();
  }
  function barbaPintada(P, S, tipo) {
    const g = P.c, cor = esc(S.cab, 0.15);
    g.save(); g.beginPath();
    // região dos pelos: mandíbula, queixo e buço (sem os lábios)
    const borda = [];
    for (let k = 0; k <= 24; k++) { const th = -0.8 + 1.6 * k / 24, a = Math.abs(th); borda.push(pxRosto(th, tipo === 2 && a > 0.32 ? -0.95 : MalhaPele.tabela([[0, -0.36], [0.25, -0.36], [0.45, -0.3], [0.65, -0.18], [0.8, -0.05]], a))); }
    borda.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.lineTo(...pxRosto(0.8, -1.2)); g.lineTo(...pxRosto(-0.8, -1.2)); g.closePath(); g.clip();
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = tipo === 1 ? 0.55 : 0.45; g.fillStyle = rgb(mix(S.pele, cor, 0.55)); g.fillRect(0, 0, 512, 512);
    g.globalAlpha = 0.7; g.fillStyle = g.createPattern(amostras().pontos, 'repeat'); g.fillRect(0, 0, 512, 512);
    g.restore();
  }
  function marcasRosto(P, S, m) {
    if (m === 1 || m === 2) {   // cicatriz: pele mais clara e rosada, bordas fundas
      const pts = m === 1 ? [pxRosto(-0.4, 0.26), pxRosto(-0.37, 0.12), pxRosto(-0.35, -0.02), pxRosto(-0.33, -0.16)] : [pxRosto(0.56, -0.02), pxRosto(0.45, -0.16), pxRosto(0.33, -0.32)];
      P.linha(pts, esc(S.pele, 0.35), 7, 96, MAT.pele);
      P.linha(pts, mix(S.pele, [0.92, 0.62, 0.6], 0.55), 3.5, 108, MAT.labio);
      for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], mx = (ax + bx) / 2, my = (ay + by) / 2; P.linha([[mx - 6, my - 2], [mx + 6, my + 2]], mix(S.pele, [0.9, 0.6, 0.6], 0.4), 1.6, 112, MAT.pele); }
    } else if (m === 3) {   // tatuagem tribal na têmpora e na bochecha esquerdas
      const tinta = [0.08, 0.1, 0.16];
      for (let k = 0; k < 3; k++) {
        const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(pxRosto(-0.62 - t * 0.16 - k * 0.04, 0.34 - t * 0.6 + Math.sin(t * PI * 1.5) * 0.05 - k * 0.02)); }
        P.linha(pts, tinta, 5 - k * 1.2, null);
      }
      for (let i = 0; i < 4; i++) { const [x, y] = pxRosto(-0.7, 0.2 - i * 0.12); P.enche((g) => { g.moveTo(x, y - 6); g.lineTo(x + 6, y + 4); g.lineTo(x - 6, y + 4); g.closePath(); }, tinta, MAT.pele); }
    } else if (m === 4) {   // runas: traços finos (o brilho vem das runas em relevo do modelo)
      for (const s of [-1, 1]) P.linha([pxRosto(s * 0.5, -0.1), pxRosto(s * 0.55, -0.3), pxRosto(s * 0.48, -0.5)], mix(S.pele, S.runa, 0.5), 2, 120, MAT.pele);
    } else if (m === 5) {   // pintura de guerra: faixa nos olhos e listras nas bochechas
      const tinta = [0.45, 0.06, 0.06], g = P.c;
      g.save(); g.globalAlpha = 0.85;
      P.enche((c) => { const a = pxRosto(-0.75, 0.13), b = pxRosto(0.75, 0.13), d = pxRosto(0.75, -0.06), e = pxRosto(-0.75, -0.06); c.moveTo(a[0], a[1]); for (let k = 1; k <= 10; k++) { const q = pxRosto(-0.75 + 1.5 * k / 10, 0.13 + (k % 2 ? 0.015 : -0.01)); c.lineTo(q[0], q[1]); } c.lineTo(d[0], d[1]); for (let k = 9; k >= 0; k--) { const q = pxRosto(-0.75 + 1.5 * k / 10, -0.06 + (k % 2 ? -0.02 : 0.01)); c.lineTo(q[0], q[1]); } c.lineTo(e[0], e[1]); c.closePath(); }, tinta, MAT.pele, 130);
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++) P.linha([pxRosto(s * (0.42 + k * 0.08), -0.18), pxRosto(s * (0.4 + k * 0.08), -0.4)], tinta, 5, 130, MAT.pele);
      g.restore();
    }
  }
  // resto da cabeça (nuca, lados, alto; o cabelo cobre quase tudo) e as orelhas
  function pintaCabeca(P, S, A) {
    P.recorte('cab', (R) => {
      const [x, y, w, h] = R;
      P.ret(x, y, w, h, S.pele, MAT.pele);
      P.trama(x, y, w, h, 'poros', 0.5, 0.06); P.trama(x, y, w, h, 'ruido', 0.18, 0, 2);
      const g = P.c, sy = g.createLinearGradient(0, y, 0, y + h); sy.addColorStop(0, rgb(S.pele, 0)); sy.addColorStop(0.7, rgb(S.pele, 0)); sy.addColorStop(1, rgb(esc(S.pele, 0.25)));
      P.sombra(sy, x, y, w, h, 'source-over');
      // couro cabeludo: pelos curtos (raspado, laterais do moicano) ou a base escura do cabelo
      g.save(); g.beginPath();
      for (let k = 0; k <= 48; k++) { const th = -PI + 2 * PI * k / 48, q = pxCab(th, linhaCabelo(th)); k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
      g.lineTo(x + w, y); g.lineTo(x, y); g.closePath(); g.clip();
      g.globalCompositeOperation = 'multiply'; g.fillStyle = rgb(mix(S.pele, S.cab, A.cabelo === 0 || A.cabelo === 5 ? 0.4 : 0.85)); g.fillRect(x, y, w, h);
      g.globalAlpha = 0.7; g.fillStyle = g.createPattern(amostras().pontos, 'repeat'); g.fillRect(x, y, w, h);
      g.restore();
      if (A.cabelo !== 0) bordaCabelo(P, S, pxCab, -PI, PI, 48);
    });
    P.recorte('pele', (R) => {   // orelhas: pele com o miolo mais escuro e rosado
      const [x, y, w, h] = R;
      P.ret(x, y, w, h, S.pele, MAT.pele); P.trama(x, y, w, h, 'poros', 0.4, 0.2);
      P.radial(x + w * 0.5, y + h * 0.5, w * 0.42, mix(esc(S.pele, 0.3), [0.7, 0.3, 0.3], 0.3), 0.5);
    });
    P.recorte('pescoco', (R) => {
      const [x, y, w, h] = R;
      P.ret(x, y, w, h, S.pele, MAT.pele); P.trama(x, y, w, h, 'poros', 0.5, 0.06); P.trama(x, y, w, h, 'ruido', 0.18, 0, 2);
      const g = P.c, sy = g.createLinearGradient(0, y, 0, y + h); sy.addColorStop(0, rgb(esc(S.pele, 0.22))); sy.addColorStop(0.35, rgb(S.pele, 0)); sy.addColorStop(1, rgb(esc(S.pele, 0.1)));
      P.sombra(sy, x, y, w, h, 'source-over');
      if (A.barba >= 1) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.35; g.fillStyle = rgb(mix(S.pele, S.cab, 0.5)); g.fillRect(x, y, w, h * 0.35); g.restore(); }
      if (A.marcas === 3) for (let k = 0; k < 3; k++) P.linha([[x + 8, y + h * (0.4 + k * 0.15)], [x + w * 0.3, y + h * (0.35 + k * 0.15)], [x + w * 0.5, y + h * (0.45 + k * 0.15)]], [0.08, 0.1, 0.16], 3);
    });
  }

  // ------------------------------------------------------------ cabelo e barba
  function pintaCabelo(P, S) {
    P.recorte('cabelo', (R) => {
      const [x, y, w, h] = R, c = S.cab;
      P.ret(x, y, w, h, c, MAT.cabelo);
      P.trama(x, y, w, h, 'fios', 0.8, 0.22, 0.5);
      P.trama(x, y, w, h, 'fios', 0.35, 0, 0.27);
      const g = P.c, gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, rgb(esc(c, 0.45), 0.8)); gr.addColorStop(0.25, rgb(c, 0)); gr.addColorStop(0.8, rgb(clr(c, 0.18), 0.25)); gr.addColorStop(1, rgb(clr(c, 0.25), 0.35));
      P.sombra(gr, x, y, w, h, 'source-over');
      // reflexo (faixa de brilho)
      const bri = g.createLinearGradient(0, y, 0, y + h); bri.addColorStop(0.3, rgb(clr(c, 0.4), 0)); bri.addColorStop(0.45, rgb(clr(c, 0.45), 0.22)); bri.addColorStop(0.6, rgb(clr(c, 0.4), 0));
      P.sombra(bri, x, y, w, h, 'screen');
    });
    P.recorte('barba', (R) => {
      const [x, y, w, h] = R, c = esc(S.cab, 0.08);
      P.ret(x, y, w, h, c, MAT.cabelo); P.trama(x, y, w, h, 'fios', 0.8, 0.2, 0.4);
      const g = P.c, gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, rgb(esc(c, 0.35), 0.6)); gr.addColorStop(1, rgb(clr(c, 0.15), 0.3));
      P.sombra(gr, x, y, w, h, 'source-over');
    });
  }

  // ------------------------------------------------------------ roupa
  // Emblema da classe (losango com o símbolo), pintado no peito
  function emblema(P, cx, cy, r, cor, fundo) {
    P.enche((g) => { g.moveTo(cx, cy - r); g.lineTo(cx + r * 0.8, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r * 0.8, cy); g.closePath(); }, fundo, MAT.metal, 160);
    P.enche((g) => { g.moveTo(cx, cy - r * 0.62); g.lineTo(cx + r * 0.42, cy); g.lineTo(cx, cy + r * 0.62); g.lineTo(cx - r * 0.42, cy); g.closePath(); }, cor, MAT.metal, 175);
    P.linha([[cx, cy - r], [cx + r * 0.8, cy], [cx, cy + r], [cx - r * 0.8, cy], [cx, cy - r]], esc(fundo, 0.5), 1.4, 150, MAT.metal);
  }
  function pintaTronco(P, S, Q, mapa) {
    P.recorte('tronco', (R) => {
      const [x, y, w, h] = R, vy = (v) => y + h * v, ux = (u) => x + w * u;
      const vC0 = mapa.vCinto0, vC1 = mapa.vCinto1;
      // calça abaixo do cinto
      tecido(P, x, vy(vC1), w, h - h * vC1, Q.calcaTipo, S.calca);
      // a peça de cima
      tecido(P, x, y, w, h * vC1, Q.tecido, Q.tecido === 'malha' ? [0.55, 0.56, 0.6] : Q.tecido === 'placa' ? S.metal : S.roupa);
      if (Q.tecido === 'malha') {   // cota: peitoral de couro por cima nos ombros e barra de pano
        tecido(P, x, y, w, h * 0.16, 'couro', S.couro);
        tecido(P, x, vy(vC0 - 0.07), w, h * 0.07, 'pano', S.roupa);
      }
      if (Q.tecido === 'placa' || Q.tecido === 'couro' && Q.placas) {   // placas: segmentos na barriga e peitoral moldado
        const corP = Q.tecido === 'placa' ? S.metal : S.couro;
        for (let k = 0; k < 3; k++) {
          const v0 = vC0 - 0.08 - k * 0.09;
          P.linha([[x, vy(v0)], [x + w, vy(v0)]], esc(corP, 0.55), 3, 90, Q.tecido === 'placa' ? MAT.placa : MAT.couro);
          P.linha([[x, vy(v0) + 2.5], [x + w, vy(v0) + 2.5]], clr(corP, 0.25), 1.2, 160, Q.tecido === 'placa' ? MAT.placa : MAT.couro);
          for (let r = 0; r < 12; r++) P.ponto(ux(0.04 + r / 12), vy(v0) + 6, 2.2, clr(S.metal, 0.3), MAT.metal, 190);
        }
        P.linha([[ux(0.5), vy(0.18)], [ux(0.5), vy(vC0 - 0.3)]], esc(corP, 0.4), 2, 110, MAT.couro);
      }
      if (Q.acolchoadoPeito) P.trama(x, y, w, h * vC0, 'acolchoado', 0.5, 0.7);
      // decote: a pele aparece na frente quando a peça é aberta no pescoço
      if (Q.decote) {
        const fundo = vy(Q.decote);
        P.enche((g) => { g.moveTo(ux(0.43), y); g.lineTo(ux(0.5), fundo); g.lineTo(ux(0.57), y); g.closePath(); }, S.pele, MAT.pele);
        P.linha([[ux(0.425), y], [ux(0.5), fundo + 2], [ux(0.575), y]], S.det, 4, 160);
      }
      // fechamento na frente: botões, cordão cruzado ou fivelas
      if (Q.fecho === 'botoes') for (let k = 0; k < 6; k++) P.ponto(ux(0.5), vy(0.12 + k * (vC0 - 0.16) / 6), 3.2, S.detH, MAT.metal, 195);
      if (Q.fecho === 'cordao') {
        const pts = []; for (let k = 0; k <= 8; k++) pts.push([ux(0.5 + (k % 2 ? 0.018 : -0.018)), vy(0.06 + k * (vC0 - 0.1) / 8)]);
        P.linha([[ux(0.5), y], [ux(0.5), vy(vC0)]], esc(S.roupa, 0.5), 2.5, 100);
        P.linha(pts, S.detH, 1.8, 170);
      }
      if (Q.fecho === 'fivelas') for (let k = 0; k < 3; k++) { const yy = vy(0.2 + k * 0.17); P.ret(ux(0.44), yy - 3, w * 0.12, 6, esc(S.couro, 0.2), MAT.couro, 150); P.ret(ux(0.49), yy - 4, 8, 8, S.metal, MAT.metal, 175); }
      if (Q.faixaCruzada) for (const s of [-1, 1]) P.linha([[ux(0.5 - s * 0.17), y], [ux(0.5 + s * 0.12), vy(vC0)]], S.det, 9, 150);
      // costuras laterais e dos ombros; debrum na barra da peça e no pescoço
      for (const u of [0.25, 0.75]) P.costura([[ux(u), y], [ux(u), vy(vC0)]], esc(S.roupa, 0.45));
      P.linha([[x, vy(vC0 - 0.025)], [x + w, vy(vC0 - 0.025)]], S.det, 6, 150);
      P.costura([[x, vy(vC0 - 0.05)], [x + w, vy(vC0 - 0.05)]], clr(S.det, 0.35), 1);
      P.linha([[x, y + 3], [x + w, y + 3]], S.det, 7, 150);
      // runas bordadas (brilham nas runas em relevo do modelo) e o emblema
      if (Q.runas) for (let k = 0; k < 14; k++) { const cx = ux(0.04 + k / 14), cy = vy(vC0 - 0.025); P.linha([[cx - 4, cy - 2], [cx, cy + 3], [cx + 4, cy - 2]], S.runa, 1.4, 165); }
      if (Q.emblema) emblema(P, ux(Q.tabardo ? 0.5 : 0.455), vy(0.3), Q.tabardo ? 22 : 13, S.runa, S.det);
      if (Q.tabardo) {   // tabardo: faixa na frente e nas costas na cor dos detalhes
        for (const u of [0.5, 0]) { tecido(P, ux(u - 0.07), y, w * 0.14, h * vC0, 'pano', S.det); if (u === 0) tecido(P, ux(1 - 0.07), y, w * 0.07, h * vC0, 'pano', S.det); }
        emblema(P, ux(0.5), vy(0.3), 20, S.runa, esc(S.det, 0.3));
      }
      // sombras: sob o peito, nas axilas, sob o cinto
      const g = P.c;
      for (const u of [0.25, 0.75]) P.radial(ux(u), vy(0.22), 40, [0.2, 0.15, 0.15], 0.35, 'multiply', 1.4);
      const sc = g.createLinearGradient(0, vy(vC0 - 0.1), 0, vy(vC0)); sc.addColorStop(0, 'rgba(30,20,20,0)'); sc.addColorStop(1, 'rgba(30,20,20,0.35)');
      P.sombra(sc, x, vy(vC0 - 0.1), w, h * 0.1);
    });
  }
  function pintaBraco(P, S, Q, mapa) {
    P.recorte('braco', (R) => {
      const [x, y, w, h] = R, vy = (v) => y + h * v;
      P.ret(x, y, w, h, S.pele, MAT.pele); P.trama(x, y, w, h, 'poros', 0.45, 0.2);
      // músculo: sombra na dobra do cotovelo
      P.radial(x + w * 0.5, vy(mapa.vCotovelo), 22, esc(S.pele, 0.4), 0.3, 'multiply', 0.6);
      if (mapa.vManga > 0) {
        const tipo = Q.tecido === 'placa' || Q.tecido === 'malha' ? (Q.tecido === 'malha' ? 'malha' : 'pano') : Q.manga_tecido || Q.tecido;
        tecido(P, x, y, w, h * mapa.vManga, tipo, tipo === 'malha' ? [0.55, 0.56, 0.6] : Q.mangaCor === 'det' ? S.det : S.roupa);
        P.linha([[x, vy(mapa.vManga) - 3], [x + w, vy(mapa.vManga) - 3]], S.det, 6, 155);
        P.costura([[x + w * 0.5, y], [x + w * 0.5, vy(mapa.vManga) - 6]], esc(S.roupa, 0.45));
      }
      if (Q.marcaBraco === 3) for (let k = 0; k < 4; k++) { const yy = vy(0.55 + k * 0.07); P.linha([[x, yy], [x + w * 0.25, yy - 6], [x + w * 0.5, yy], [x + w * 0.75, yy - 6], [x + w, yy]], [0.08, 0.1, 0.16], 3); }
      if (Q.faixasBraco) for (let k = 0; k < 9; k++) { const yy = vy(0.62 + k * 0.04); P.ret(x, yy, w, h * 0.03, mix(S.det, [0.6, 0.55, 0.5], 0.3), MAT.pano, 150); P.costura([[x, yy + 1], [x + w, yy + h * 0.03 - 1]], esc(S.det, 0.4), 1); }
    });
    P.recorte('mao', (R) => {
      const [x, y, w, h] = R;
      P.ret(x, y, w, h, S.pele, MAT.pele); P.trama(x, y, w, h, 'poros', 0.4, 0.2);
      // unhas na ponta dos dedos (v alto de cada dedo)
      for (let d = 0; d < 5; d++) P.ret(x + w * (d / 5) + 2, y + h * 0.94, w / 5 - 4, h * 0.05, mix(S.pele, [0.95, 0.82, 0.8], 0.5), MAT.labio, 150);
      if (Q.luvas !== 'nua') {
        const ate = Q.luvas === 'sem dedos' ? 0.5 + 0.05 : 1;   // palma = v 0..0,45; dedos 0,45..1
        tecido(P, x, y, w, h * ate, 'couro', esc(S.couro, 0.15));
        P.costura([[x, y + h * 0.42], [x + w, y + h * 0.42]], clr(S.couro, 0.3), 1);
        P.linha([[x, y + 3], [x + w, y + 3]], S.det, 5, 150);
      }
    });
    if (Q.bracadeira) P.recorte('bracadeira', (R) => {
      const [x, y, w, h] = R, cor = Q.bracadeira === 'metal' ? S.metal : S.couro;
      tecido(P, x, y, w, h, Q.bracadeira === 'metal' ? 'placa' : 'couro', cor);
      for (const v of [0.08, 0.92]) P.linha([[x, y + h * v], [x + w, y + h * v]], esc(cor, 0.4), 4, 165, MAT.couro);
      // cordão cruzado na parte de dentro
      const pts = []; for (let k = 0; k <= 8; k++) pts.push([x + w * (0.5 + (k % 2 ? 0.06 : -0.06)), y + h * (0.12 + k * 0.095)]);
      P.linha(pts, S.detH, 2, 170);
      if (Q.runas) for (let k = 0; k < 3; k++) P.linha([[x + w * 0.2, y + h * (0.3 + k * 0.18)], [x + w * 0.3, y + h * (0.38 + k * 0.18)], [x + w * 0.4, y + h * (0.3 + k * 0.18)]], S.runa, 2, 170);
    });
  }
  function pintaPerna(P, S, Q, mapa) {
    P.recorte('perna', (R) => {
      const [x, y, w, h] = R, vy = (v) => y + h * v;
      tecido(P, x, y, w, h, Q.calcaTipo, S.calca);
      for (const u of [0.25, 0.75]) P.costura([[x + w * u, y], [x + w * u, y + h]], esc(S.calca, 0.45));
      P.radial(x + w * 0.5, vy(mapa.vJoelho), 26, esc(S.calca, 0.4), 0.3, 'multiply', 0.7);   // dobra do joelho
      if (Q.joelheira) { P.ret(x + w * 0.38, vy(mapa.vJoelho - 0.05), w * 0.24, h * 0.1, S.couro, MAT.couro, 150); P.trama(x + w * 0.38, vy(mapa.vJoelho - 0.05), w * 0.24, h * 0.1, 'grao', 0.5, 0.3); }
      if (Q.faixasPerna) for (let k = 0; k < 8; k++) { const yy = vy(0.55 + k * 0.05); P.ret(x, yy, w, h * 0.035, mix(S.det, [0.5, 0.48, 0.45], 0.3), MAT.pano, 150); }
      if (Q.bolsoPerna) { P.ret(x + w * 0.66, vy(0.22), w * 0.18, h * 0.12, esc(S.calca, 0.2), MAT.pano, 145); P.costura([[x + w * 0.66, vy(0.22)], [x + w * 0.84, vy(0.22)], [x + w * 0.84, vy(0.34)], [x + w * 0.66, vy(0.34)], [x + w * 0.66, vy(0.22)]], clr(S.calca, 0.3), 1); }
    });
    P.recorte('bota', (R) => {   // v 0..0,55: cano; 0,55..1: o pé (u em volta)
      const [x, y, w, h] = R, cor = S.bota;
      tecido(P, x, y, w, h, 'couro', cor);
      P.linha([[x, y + 4], [x + w, y + 4]], esc(cor, 0.4), 8, 170, MAT.couro);   // dobra do cano
      for (let k = 0; k < 3; k++) { const yy = y + h * (0.12 + k * 0.14); P.ret(x, yy, w, 6, esc(S.couro, 0.3), MAT.couro, 160); P.ret(x + w * 0.62, yy - 1, 8, 8, S.metal, MAT.metal, 180); }
      P.costura([[x + w * 0.5, y], [x + w * 0.5, y + h]], clr(cor, 0.3));
      P.linha([[x, y + h * 0.82], [x + w, y + h * 0.82]], esc(cor, 0.35), 3, 120, MAT.couro);   // biqueira
      P.costura([[x, y + h * 0.84], [x + w, y + h * 0.84]], clr(cor, 0.25), 1);
    });
    P.recorte('sola', (R) => { const [x, y, w, h] = R; P.ret(x, y, w, h, [0.1, 0.08, 0.07], MAT.sola); P.trama(x, y, w, h, 'ruido', 0.5, 0.4, 0.5); });
  }
  function pintaSaia(P, S, Q) {
    P.recorte('saia', (R) => {
      const [x, y, w, h] = R, cor = Q.saiaCor === 'det' ? S.det : S.roupa;
      tecido(P, x, y, w, h, Q.saiaTecido || (Q.tecido === 'malha' || Q.tecido === 'placa' ? 'couro' : Q.tecido), Q.saiaTecido === 'malha' ? [0.55, 0.56, 0.6] : cor);
      // pregas (sombras verticais) e a barra
      for (let k = 0; k < 16; k++) { const u = x + w * (k + 0.5) / 16; P.linha([[u, y + h * 0.15], [u, y + h]], esc(cor, 0.35), 2.5, 112); }
      P.linha([[x, y + h - 6], [x + w, y + h - 6]], S.det, 10, 155);
      P.costura([[x, y + h - 13], [x + w, y + h - 13]], clr(S.det, 0.3), 1);
      if (Q.runas) for (let k = 0; k < 20; k++) { const cx = x + w * (k + 0.5) / 20, cy = y + h - 6; P.linha([[cx - 3, cy - 3], [cx, cy + 2], [cx + 3, cy - 3]], S.runa, 1.3, 165); }
      if (Q.tabardo) { tecido(P, x + w * 0.43, y, w * 0.14, h, 'pano', S.det); tecido(P, x, y, w * 0.07, h, 'pano', S.det); tecido(P, x + w * 0.93, y, w * 0.07, h, 'pano', S.det); }
      const g = P.c, gr = g.createLinearGradient(0, y, 0, y + h * 0.2); gr.addColorStop(0, 'rgba(20,15,15,0.45)'); gr.addColorStop(1, 'rgba(20,15,15,0)');
      P.sombra(gr, x, y, w, h * 0.2);
    });
  }
  function pintaAcessorios(P, S, Q) {
    P.recorte('cinto', (R) => {
      const [x, y, w, h] = R;
      if (Q.cinto === 'faixa') { tecido(P, x, y, w, h, 'pano', S.det); for (let k = 0; k < 10; k++) P.linha([[x + w * k / 10, y], [x + w * k / 10 + 18, y + h]], esc(S.det, 0.3), 2, 115); return; }
      tecido(P, x, y, w, h, 'couro', S.couro);
      for (const v of [0.12, 0.88]) P.costura([[x, y + h * v], [x + w, y + h * v]], clr(S.couro, 0.3), 1.2);
      for (let k = 0; k < 6; k++) P.ponto(x + w * (0.56 + k * 0.025), y + h * 0.5, 2, esc(S.couro, 0.6), MAT.couro, 90);
      if (Q.cinto === 'duplo') P.linha([[x, y + h * 0.5], [x + w, y + h * 0.5]], esc(S.couro, 0.5), 3, 100, MAT.couro);
    });
    P.recorte('gola', (R) => {
      const [x, y, w, h] = R;
      tecido(P, x, y, w, h, Q.golaTecido || 'pano', Q.golaCor === 'roupa' ? S.roupa : S.det);
      P.linha([[x, y + h - 3], [x + w, y + h - 3]], esc(S.det, 0.4), 4, 150);
      if (Q.runas) for (let k = 0; k < 12; k++) { const cx = x + w * (k + 0.5) / 12; P.linha([[cx - 3, y + h * 0.4], [cx, y + h * 0.65], [cx + 3, y + h * 0.4]], S.runa, 1.3, 165); }
    });
    P.recorte('ombro', (R) => {
      const [x, y, w, h] = R, metal = Q.ombreiras === 2, cor = metal ? S.metal : S.couro;
      tecido(P, x, y, w, h, metal ? 'placa' : 'couro', cor);
      // lâminas sobrepostas (faixas horizontais) com rebites
      for (let k = 1; k < 4; k++) { const yy = y + h * k / 4; P.linha([[x, yy], [x + w, yy]], esc(cor, 0.55), 3, 90, metal ? MAT.placa : MAT.couro); P.linha([[x, yy + 2], [x + w, yy + 2]], clr(cor, 0.3), 1, 165, metal ? MAT.placa : MAT.couro); for (let r = 0; r < 8; r++) P.ponto(x + w * (r + 0.5) / 8, yy + 6, 2.2, clr(S.metal, 0.35), MAT.metal, 190); }
      P.linha([[x, y + h - 4], [x + w, y + h - 4]], S.det, 6, 160);
      if (Q.runas) P.linha([[x + w * 0.4, y + h * 0.3], [x + w * 0.5, y + h * 0.15], [x + w * 0.6, y + h * 0.3], [x + w * 0.5, y + h * 0.45], [x + w * 0.4, y + h * 0.3]], S.runa, 2, 170);
    });
    P.recorte('extra', (R) => {   // tiras (bandoleira) com fivelas
      const [x, y, w, h] = R;
      tecido(P, x, y, w, h, 'couro', esc(S.couro, 0.1));
      for (const v of [0.15, 0.85]) P.costura([[x, y + h * v], [x + w, y + h * v]], clr(S.couro, 0.3), 1);
      for (let k = 0; k < 4; k++) P.ret(x + w * (0.1 + k * 0.25), y + h * 0.25, 10, h * 0.5, S.metal, MAT.metal, 175);
    });
    P.recorte('bolsa', (R) => {
      const [x, y, w, h] = R;
      tecido(P, x, y, w, h, 'couro', clr(S.couro, 0.08));
      P.linha([[x, y + h * 0.35], [x + w, y + h * 0.35]], esc(S.couro, 0.5), 3, 100, MAT.couro);
      P.costura([[x + 4, y + 4], [x + w - 4, y + 4], [x + w - 4, y + h - 4], [x + 4, y + h - 4], [x + 4, y + 4]], clr(S.couro, 0.3), 1);
      P.ret(x + w * 0.45, y + h * 0.3, 8, 10, S.metal, MAT.metal, 180);
    });
  }

  // ------------------------------------------------------------ tudo
  // S: paleta (cores em hex ou [r, g, b]); Q: receita da roupa; A: aparência; mapa: v dos cortes
  function pintar(S, Q, A, mapa) {
    amostras();
    const P = new Pincel();
    P.ret(0, 0, LADO, LADO, S.pele, MAT.pele);
    pintaRosto(P, S, A);
    pintaCabeca(P, S, A);
    pintaCabelo(P, S);
    pintaTronco(P, S, Q, mapa.tronco);
    pintaBraco(P, S, Object.assign({ marcaBraco: A.marcas }, Q), mapa.braco);
    pintaPerna(P, S, Q, mapa.perna);
    pintaSaia(P, S, Q);
    pintaAcessorios(P, S, Q);
    return { cor: P.C, mat: P.M };
  }

  return { LADO, ATLAS, ROSTO, FACE, uvReg, uvRosto, uvCab, pxRosto, pxCab, pxReg, linhaCabelo, pintar, amostras };
})();
