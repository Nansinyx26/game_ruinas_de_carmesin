'use strict';
// ECLIPSE ZERO · Fogo, fumaça e explosões (Fogo)
// ---------------------------------------------------------------------------
// Focos de fogo com chamas orgânicas desenhadas a cada quadro, nas duas câmeras (isométrica e
// 3ª pessoa, com a projeção e a escala de cada uma):
//   - CHAMAS: línguas que sobem com alturas, larguras e inclinações que variam com várias
//     frequências (sem repetir), puxadas pelo vento (Fogo.vento, do clima); o núcleo é branco e
//     amarelo e a borda passa a laranja e vermelho até sumir (somadas: o fogo clareia o que está
//     atrás); pedacinhos de chama se soltam da ponta e somem subindo.
//   - FUMAÇA: baforadas que nascem acima das chamas, crescem, sobem, derivam com o vento e se
//     dissolvem; BRASAS: partículas incandescentes que sobem e apagam (o sistema de partículas).
//   - CALOR: o ar acima das chamas maiores treme (faixas da imagem deslocadas) e a onda de choque
//     das explosões dobra a imagem como uma lente.
//   - LUZ: cada foco é uma luz que tremula — na isométrica entra no mapa de escuridão; na 3ª
//     pessoa é uma luz pontual do motor (js/engine3d.js: ilumina personagens, chão e paredes e
//     brilha no metal, no vidro e na água).
//   - TIPOS: tocha, fogueira, chamas (as que se espalham), incêndio (estruturas em chamas) e
//     habilidade; e as EXPLOSÕES (bola de fogo, clarão, onda de choque, fumaça, destroços e, no
//     capim e no mato seco, o fogo que se espalha por um tempo).
// LOD: longe da câmera, menos línguas, sem fumaça nem brasas; o total de focos e de baforadas é
// limitado e a Qualidade dos efeitos reduz tudo.
// ---------------------------------------------------------------------------
const Fogo = (function () {
  const focos = [], fumaca = [], explosoes = [];
  const MAX_FOCOS = 48, MAX_FUMACA = 160, MAX_ESPALHA = 18;
  let t = 0, salaAtual = null;
  // h/w: altura e largura das chamas (unidades); n: línguas; fum/bra: fumaça e brasas por segundo;
  // luz: raio e intensidade
  const TIPO = {
    tocha: { h: 15, w: 5, n: 3, fum: 0.6, bra: 0.6, luz: 150, li: 0.85 },
    fogueira: { h: 30, w: 16, n: 6, fum: 1.6, bra: 2.4, luz: 300, li: 1 },
    chamas: { h: 20, w: 13, n: 5, fum: 1.2, bra: 1.6, luz: 210, li: 0.85 },
    incendio: { h: 62, w: 42, n: 9, fum: 3.2, bra: 5, luz: 430, li: 1.15 },
    habilidade: { h: 18, w: 9, n: 4, fum: 0.4, bra: 2, luz: 190, li: 0.9 },
    chamine: { h: 0, w: 16, n: 0, fum: 1.3, bra: 0.2, luz: 0, li: 0 },   // só a fumaça (forno, forja)
  };
  // núcleo, meio, borda e a ponta (rgb)
  const PALETA = {
    fogo: [[255, 252, 228], [255, 200, 80], [255, 116, 30], [190, 36, 12]],
    azul: [[230, 250, 255], [130, 210, 255], [60, 130, 255], [30, 40, 190]],
    verde: [[235, 255, 220], [150, 255, 120], [60, 200, 70], [20, 110, 40]],
    roxo: [[255, 230, 255], [220, 130, 255], [150, 60, 230], [70, 20, 140]],
    carmim: [[255, 236, 220], [255, 140, 110], [230, 50, 50], [120, 10, 20]],
  };
  const q = () => (typeof Settings !== 'undefined' ? Settings.v.quality : 2);
  const tresP = () => typeof ThirdView !== 'undefined' && ThirdView.on && ThirdView.active && ThirdView.active();
  const rgbs = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

  // ------------------------------------------------------------ vento
  // direção e força (com rajadas): no mundo vem do clima; na campanha, uma brisa
  const VENTO = { x: 0.6, y: 0.2, k: 0.3 };
  function vento() {
    let k = 0.25;
    if (typeof game !== 'undefined' && game.world && typeof Clima !== 'undefined' && Clima.vento) { try { k = Clima.vento(); } catch (e) { k = 0.3; } }
    const a = 0.35 + Math.sin(t * 0.05) * 0.6, raj = 0.75 + 0.25 * Math.sin(t * 0.7) * Math.sin(t * 1.9 + 1);
    VENTO.x = Math.cos(a); VENTO.y = Math.sin(a); VENTO.k = Math.min(2.2, k) * raj;
    return VENTO;
  }

  // ------------------------------------------------------------ projeção
  const PT = { x: 0, y: 0, k: 1, ok: true };
  function ponto(x, y, z) {
    if (tresP()) { const P = ThirdView.projC(x, y, z); PT.x = P.x; PT.y = P.y; PT.k = P.k; PT.ok = P.vis; }
    else { PT.x = isoX(x, y); PT.y = isoY(x, y) - z; PT.k = 1; PT.ok = true; }
    return PT;
  }
  // tela (coordenadas da vista, para o calor e o LOD): onde o ponto cai e quão longe está
  function naTela(x, y, z) {
    if (tresP()) { const P = ThirdView.projC(x, y, z); return { x: P.x, y: P.y, k: P.k, ok: P.vis, d: P.w }; }
    const g = game, S = g.camera.toScreen(isoX(x, y), isoY(x, y) - z);
    return { x: S.x, y: S.y, k: g.camera.zoom || 1, ok: true, d: 400 };
  }

  // ------------------------------------------------------------ focos
  function acender(x, y, tipo = 'fogueira', op = {}) {
    if (focos.length >= MAX_FOCOS) { const i = focos.findIndex((f) => f.vida !== Infinity); if (i < 0) return null; focos.splice(i, 1); }
    const T = TIPO[tipo] || TIPO.fogueira;
    const f = { x, y, z: op.z || 0, z3: op.z3, sala: typeof game !== 'undefined' ? game.room : null, tipo, T, k: op.k || 1, vida: op.vida !== undefined ? op.vida : Infinity, t: 0, sd: Math.random() * 100, pal: PALETA[op.cor] || PALETA.fogo,
      espalha: op.espalha || 0, lenha: !!op.lenha, acum: { fum: Math.random(), bra: Math.random(), esp: 0 }, dono: op.dono || null, fixo: !!op.fixo, luzK: op.luzK !== undefined ? op.luzK : 1 };
    focos.push(f);
    return f;
  }
  function apagar(f) { const i = focos.indexOf(f); if (i >= 0) focos.splice(i, 1); }
  // Zona em que o fogo pega no chão (capim, mato seco, folhas)
  function inflamavel() {
    const R = typeof game !== 'undefined' && game.room;
    if (!R || !R.def) return false;
    if (typeof Clima !== 'undefined' && game.world) { try { if (Clima.chuva && Clima.chuva() > 0.2) return false; } catch (e) { /* sem clima */ } }
    return R.def.theme === 'floresta' || R.def.theme === 'deserto';
  }

  // ------------------------------------------------------------ explosões
  // forca ~1 (granada) a 3 (chefe); op: { cor: paleta, energia: true (plasma/raio, sem fumaça
  // escura nem fogo no chão), incendeia, silencio, rgb (cor das partículas) }
  function explosao(x, y, z = 10, forca = 1, op = {}) {
    if (typeof game === 'undefined') return null;
    const g = game, P_ = g.particles, pal = PALETA[op.cor] || (op.energia ? PALETA.azul : PALETA.fogo), R = 46 + 34 * forca;
    const E = { x, y, z, t: 0, max: 0.55 + 0.3 * forca, R, forca, pal, energia: !!op.energia, sd: Math.random() * 100 };
    explosoes.push(E);
    if (explosoes.length > 10) explosoes.shift();
    const c1 = pal[1].join(','), c2 = pal[2].join(',');
    if (P_) {
      P_.flash(x, y, z, R * 1.4, pal[0].join(','), 0.16);
      P_.ring(x, y, R * 2.2, c1, 0.45, 8 + 4 * forca);
      for (let i = 0; i < 6; i++) P_.sparks(x, y, z, (i / 6) * TAU + Math.random(), Math.round(4 + 3 * forca), c1, 420 + 140 * forca, 0.9);
      P_.embers(x, y, z, Math.round(10 * forca), c2, R * 0.5, 90 + 40 * forca);
      if (!op.energia) { P_.debris(x, y, Math.round(6 + 6 * forca)); P_.dust(x, y, Math.round(6 * forca), 14, 140); }
    }
    // fumaça que sai para os lados e sobe
    if (!op.energia || forca > 1.5) {
      const n = Math.round((op.energia ? 4 : 10) * forca * (q() >= 2 ? 1 : 0.6));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = 30 + Math.random() * 60 * forca;
        baforada(x + Math.cos(a) * R * 0.3, y + Math.sin(a) * R * 0.3, z + 10, Math.cos(a) * v, Math.sin(a) * v, 20 + Math.random() * 40, R * (0.35 + Math.random() * 0.3), 2.2 + Math.random() * 2 * forca, op.energia ? [60, 70, 90] : [34, 30, 28], 0.55);
      }
    }
    if (!op.silencio) { if (g.camera) g.camera.shake(Math.min(1, 0.22 * forca)); }
    if (typeof Agua !== 'undefined' && Agua.respingo && Agua.profundidade(x, y) > 0) Agua.respingo(x, y, 1 + forca);   // na água: respingo e ondas
    // o fogo pega no chão em volta (capim e mato seco)
    if (!op.energia && (op.incendeia || inflamavel())) {
      const n = Math.min(4, 1 + Math.round(forca * 1.5));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, d = R * (0.4 + Math.random() * 0.7);
        acender(x + Math.cos(a) * d, y + Math.sin(a) * d, 'chamas', { vida: 7 + Math.random() * 7, espalha: 2, k: 0.7 + Math.random() * 0.4 });
      }
    }
    // objetos soltos reagem: coletáveis no chão são empurrados
    if (g.pickups && g.pickups.list) for (const p of g.pickups.list) {
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < R * 2.5 && p.vx !== undefined) { const k = (1 - d / (R * 2.5)) * 260 * forca; p.vx += dx / d * k; p.vy += dy / d * k; if (p.vz !== undefined) p.vz += k * 0.6; }
    }
    return E;
  }

  // ------------------------------------------------------------ fumaça
  function baforada(x, y, z, vx, vy, vz, r, vida, cor, a = 0.4) {
    if (fumaca.length >= MAX_FUMACA * (q() >= 2 ? 1 : 0.5)) fumaca.shift();
    fumaca.push({ x, y, z, vx, vy, vz, r0: r, r, t: 0, max: vida, cor, a, sd: Math.random() * 6 });
  }

  // ------------------------------------------------------------ atualização
  function update(dt) {
    if (typeof game === 'undefined') return;
    t += dt;
    const g = game, R = g.room, V = vento();
    if (R !== salaAtual) sincronizar(R);
    // fogueiras portáteis do clima (Fogueira Portátil da alquimia) viram focos de verdade
    if (typeof Clima !== 'undefined' && Clima.fogueiras) {
      for (const cf of Clima.fogueiras) if (!focos.some((f) => f.dono === cf)) { const f = acender(cf.x, cf.y, 'fogueira', { dono: cf, lenha: true }); if (f) f.donoLista = Clima.fogueiras; }
    }
    // poças de fogo das variantes de inimigos (hazards): chamas baixas enquanto durarem
    if (g.hazards && g.hazards.list) for (const h of g.hazards.list) {
      if (h.kind === 'poca' && !h.lento && !focos.some((f) => f.dono === h)) {
        const c = (h.rgb || '255,120,40').split(',').map(Number), f = acender(h.x, h.y, 'chamas', { dono: h, k: Math.min(1.2, (h.r || 40) / 40), cor: c[1] > c[0] ? 'verde' : 'fogo' });
        if (f) f.donoLista = g.hazards.list;
      }
    }
    const P_ = g.particles, quali = q(), cam = tresP() ? ThirdView.eye : null, pl = g.player;
    let espalhados = focos.filter((f) => f.tipo === 'chamas' && f.vida !== Infinity).length;
    for (let i = focos.length - 1; i >= 0; i--) {
      const f = focos[i];
      f.t += dt;
      if (f.dono && !(f.donoLista && f.donoLista.includes(f.dono))) { focos.splice(i, 1); continue; }   // a fogueira ou a poça acabou
      if (f.vida !== Infinity) {
        f.vida -= dt;
        if (f.vida <= 0) { baforada(f.x, f.y, f.z + 8, 0, 0, 30, f.T.w * 0.8, 2.5, [40, 38, 36], 0.5); focos.splice(i, 1); continue; }
      }
      // distância (LOD): longe da câmera, sem fumaça nem brasas
      const ref = cam ? Math.hypot(f.x - cam[0], f.y - cam[1]) : pl ? Math.hypot(f.x - pl.x, f.y - pl.y) * 0.8 : 0;
      f.lod = ref > 1500 ? 2 : ref > 800 ? 1 : 0;
      if (f.lod < 2) {
        const amb = Math.min(1, f.vida / 3), kk = f.k * amb * (quali >= 2 ? 1 : quali >= 1 ? 0.6 : 0.3);
        f.acum.fum += dt * f.T.fum * kk * (f.lod ? 0.4 : 1);
        while (f.acum.fum > 1) {
          f.acum.fum -= 1;
          baforada(f.x + (Math.random() - 0.5) * f.T.w * 0.5, f.y + (Math.random() - 0.5) * f.T.w * 0.5, f.z + f.T.h * f.k * 0.8, V.x * V.k * 18, V.y * V.k * 18, 22 + Math.random() * 18, f.T.w * 0.45, 2.6 + Math.random() * 2.2, f.tipo === 'chamine' ? [104, 100, 98] : f.pal === PALETA.fogo ? [46, 42, 40] : [60, 60, 70], f.tipo === 'chamine' ? 0.26 : 0.32);
        }
        f.acum.bra += dt * f.T.bra * kk * (f.lod ? 0.3 : 1);
        while (f.acum.bra > 1 && P_) {
          f.acum.bra -= 1;
          const c = f.pal[Math.random() < 0.6 ? 1 : 2];
          P_.emit(P.EMBER, f.x + (Math.random() - 0.5) * f.T.w * 0.6, f.y + (Math.random() - 0.5) * f.T.w * 0.6, f.z + f.T.h * 0.4 * f.k, V.x * V.k * 30 + (Math.random() - 0.5) * 20, V.y * V.k * 30 + (Math.random() - 0.5) * 20, 50 + Math.random() * 70, 0.9 + Math.random() * 1.4, 1 + Math.random() * 1.3, `${c[0]},${c[1]},${c[2]}`, 0, 0.6);
        }
      }
      // o fogo se espalha pelo capim (com limite e só algumas gerações)
      if (f.espalha > 0 && f.tipo === 'chamas' && inflamavel()) {
        f.acum.esp += dt * 0.22;
        if (f.acum.esp > 1 && espalhados < MAX_ESPALHA) {
          f.acum.esp = 0;
          const a = Math.random() * TAU, d = 34 + Math.random() * 34, nx = f.x + Math.cos(a) * d, ny = f.y + Math.sin(a) * d;
          const agua = typeof Agua !== 'undefined' && Agua.profundidade && Agua.profundidade(nx, ny) > 0;
          if (!agua && R && nx > 0 && ny > 0 && nx < R.w && ny < R.h) { acender(nx, ny, 'chamas', { vida: 6 + Math.random() * 6, espalha: f.espalha - 1, k: 0.6 + Math.random() * 0.4 }); espalhados++; }
        }
      }
    }
    for (let i = fumaca.length - 1; i >= 0; i--) {
      const s = fumaca[i];
      s.t += dt;
      if (s.t >= s.max) { fumaca.splice(i, 1); continue; }
      const u = s.t / s.max;
      s.vx += (V.x * V.k * 26 - s.vx) * dt * 0.6; s.vy += (V.y * V.k * 26 - s.vy) * dt * 0.6;
      s.x += s.vx * dt + Math.sin(t * 0.9 + s.sd) * 4 * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.vz *= 1 - dt * 0.25;
      s.r = s.r0 * (1 + u * 2.6);
    }
    for (let i = explosoes.length - 1; i >= 0; i--) { const E = explosoes[i]; E.t += dt; if (E.t > E.max + 0.6) explosoes.splice(i, 1); }
  }

  // Focos fixos da sala: tochas de luz quente nas paredes, fogueiras nos lumes do campo aberto
  // (floresta, deserto, cratera), incêndios nas Ruínas Carmesins, chamas nas fendas da cratera e
  // o fogo dos fornos, forjas e braseiros das estruturas
  function sincronizar(R) {
    salaAtual = R;
    for (let i = focos.length - 1; i >= 0; i--) if (focos[i].sala !== R) focos.splice(i, 1);
    fumaca.length = 0; explosoes.length = 0;
    if (!R || !R.theme) return;
    const lamp = (R.theme.lamp || '255,255,255').split(',').map(Number), quente = lamp[0] > 200 && lamp[2] < 140 && lamp[0] - lamp[2] > 90;
    const tema = R.def && R.def.theme, rnd = mulberry32((R.seed || 1) * 31 + 5);
    for (const tc of R.torches || []) {
      if (tc.chao) {
        if (tema === 'floresta' || tema === 'deserto' || tema === 'vulcao') acender(tc.x, tc.y, 'fogueira', { fixo: true, lenha: tema !== 'vulcao', cor: 'fogo', k: 0.85 + rnd() * 0.3 });
      } else if (!tc.poste && quente) {
        acender(tc.x, tc.y, 'tocha', { fixo: true, z: 74, z3: 118, k: 0.9 + rnd() * 0.2 });   // (a luminária fica mais alta na 3ª pessoa)
      }
    }
    const zid = R.def && R.def.id || '';
    if (/^rc_/.test(zid) || tema === 'carmim') {
      for (let i = 0; i < 3; i++) { const x = R.w * (0.15 + rnd() * 0.7), y = R.h * (0.12 + rnd() * 0.25); acender(x, y, 'incendio', { fixo: true, cor: 'carmim', k: 0.7 + rnd() * 0.4 }); }
    }
    if (tema === 'vulcao') for (let i = 0; i < 4; i++) acender(R.w * (0.1 + rnd() * 0.8), R.h * (0.1 + rnd() * 0.8), 'chamas', { fixo: true, k: 0.6 + rnd() * 0.5 });
  }
  // estruturas com fogo (chamado quando as estruturas da zona são postas: js/mundo/estruturas.js)
  // [tipo, altura da chama (fração da altura da peça), intensidade]; fumaca: chaminé no topo;
  // pontos: onde ficam as chamas no modelo (+x frente, +y lado; medidas da peça em escala 1), no
  // lugar do centro; o giro e a escala da estrutura levam junto (o arco tem um braseiro em cada pé)
  const COM_FOGO = { item_ambiente_md_8: { fogo: ['tocha', 0.86, 1.2] }, forno_pedra: { fumaca: 1 }, hearthside_forge: { fumaca: 1.3 },
    arco_braseiros: { fogo: ['tocha', 0.38, 1.1], pontos: [[47.9, 64.1], [37.5, -83.4]] },
    altar_cristal: { fogo: ['fogueira', 0.58, 1.1], fumaca: 0.7 } };   // a Chama da Aurora: fogo em volta do cristal e a fumaça subindo
  function estruturas(lugares) {
    const I = typeof ESTRUTURAS_INDICE !== 'undefined' ? ESTRUTURAS_INDICE : {};
    for (const L of lugares || []) {
      const c = COM_FOGO[L.id], e = L.esc || 1, h = (I[L.id] && I[L.id].h || 60) * e;
      if (!c) continue;
      const cs = Math.cos(L.giro || 0), sn = Math.sin(L.giro || 0);
      if (c.fogo) for (const [dx, dy] of c.pontos || [[0, 0]]) acender(L.x + (dx * cs - dy * sn) * e, L.y + (dx * sn + dy * cs) * e, c.fogo[0], { fixo: true, z: h * c.fogo[1], k: c.fogo[2] });
      if (c.fumaca) acender(L.x, L.y, 'chamine', { fixo: true, z: h * 0.95, k: c.fumaca });
    }
  }

  // ------------------------------------------------------------ desenho
  // Uma chama (várias línguas) com a base em (x, y, z); k: intensidade
  function chama(ctx, f, x, y, z, k) {
    if (f.z3 !== undefined && tresP()) z = f.z3;
    const T = f.T, pal = f.pal, P0 = ponto(x, y, z);
    if (!P0.ok) return;
    const bx = P0.x, by = P0.y, s = P0.k, V = VENTO;
    // vento na tela: na isométrica, (vx, vy) do mundo → (vx − vy, (vx + vy) / 2)
    let wx = (V.x - V.y) * V.k, wy = (V.x + V.y) * 0.5 * V.k;
    if (tresP()) { const yaw = ThirdView.yaw || 0; wx = (Math.sin(yaw) * V.x - Math.cos(yaw) * V.y) * V.k; wy = 0; }
    const n = f.lod ? Math.max(2, Math.ceil(T.n / 2)) : T.n, H = T.h * k * s, W = T.w * k * s, sd = f.sd, tt = t + sd;
    if (H < 1.2) return;
    // brilho da base
    GlowCache.draw(ctx, `${pal[2][0]},${pal[2][1]},${pal[2][2]}`, bx, by - H * 0.2, W * 1.9 + 6, 0.32 * Math.min(1, k));
    for (let pass = 0; pass < 2; pass++) {   // 0: a chama (pintada por cima: aparece também de dia); 1: o núcleo claro, somado
      ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over';
      for (let i = 0; i < n; i++) {
        const rel = n > 1 ? i / (n - 1) - 0.5 : 0, ph = sd * 3.7 + i * 2.13;
        const centro = 1 - Math.abs(rel) * 0.9;
        let h = H * (0.5 + 0.5 * centro) * (0.72 + 0.18 * Math.sin(tt * 7.3 + ph) + 0.1 * Math.sin(tt * 13.7 + ph * 1.7) + 0.06 * Math.sin(tt * 23.1 + ph * 0.6));
        let w = W * (0.42 + 0.12 * Math.sin(tt * 5.1 + ph)) * (0.6 + 0.4 * centro);
        if (pass) { h *= 0.55; w *= 0.45; }
        const ox = rel * W * 0.85 + Math.sin(tt * 1.7 + ph) * W * 0.07;
        const lean = wx * h * 0.32 + Math.sin(tt * 3.1 + ph) * h * 0.08, ly = wy * h * 0.15;
        const x0 = bx + ox, tipX = x0 + lean, tipY = by - h + ly;
        const ond = Math.sin(tt * 9.2 + ph * 1.3) * w * 0.28;
        const gr = ctx.createLinearGradient(x0, by, tipX, tipY);
        if (pass) {
          gr.addColorStop(0, rgbs(pal[0], 0.0)); gr.addColorStop(0.12, rgbs(pal[0], 0.9)); gr.addColorStop(0.55, rgbs(pal[1], 0.55)); gr.addColorStop(1, rgbs(pal[1], 0));
        } else {
          gr.addColorStop(0, rgbs(pal[2], 0.45)); gr.addColorStop(0.18, rgbs(pal[1], 0.82)); gr.addColorStop(0.5, rgbs(pal[2], 0.66)); gr.addColorStop(0.82, rgbs(pal[3], 0.32)); gr.addColorStop(1, rgbs(pal[3], 0));
        }
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(x0 - w * 0.5, by);
        ctx.bezierCurveTo(x0 - w * 0.62 + ond * 0.4, by - h * 0.3, x0 - w * 0.25 + lean * 0.4 - ond, by - h * 0.62 + ly * 0.5, tipX, tipY);
        ctx.bezierCurveTo(x0 + w * 0.25 + lean * 0.4 + ond, by - h * 0.62 + ly * 0.5, x0 + w * 0.62 - ond * 0.4, by - h * 0.3, x0 + w * 0.5, by);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    // pedacinhos de chama que se soltam da ponta e somem subindo
    if (!f.lod) for (let j = 0; j < 3; j++) {
      const u = (tt * 1.3 + j / 3) % 1, a = (1 - u) * 0.55;
      const px = bx + Math.sin(tt * 2 + j * 2.4) * W * 0.25 + wx * H * (0.3 + u * 0.6), py = by - H * (0.8 + u * 0.7);
      const r = W * 0.12 * (1 - u) + 1;
      const gr = ctx.createRadialGradient(px, py, 0, px, py, r * 2.2);
      gr.addColorStop(0, rgbs(pal[1], a)); gr.addColorStop(1, rgbs(pal[3], 0));
      ctx.fillStyle = gr; ctx.fillRect(px - r * 2.2, py - r * 2.2, r * 4.4, r * 4.4);
    }
  }
  // lenha da fogueira (troncos cruzados e brasa), antes das chamas
  function lenha(ctx, f) {
    const P0 = ponto(f.x, f.y, f.z);
    if (!P0.ok) return;
    const s = P0.k, w = f.T.w * s;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = i * 0.9 + 0.3;
      ctx.strokeStyle = i % 2 ? '#2a1a10' : '#3a2416'; ctx.lineWidth = Math.max(1.5, 3.2 * s);
      ctx.beginPath(); ctx.moveTo(P0.x - Math.cos(a) * w * 0.7, P0.y - Math.sin(a) * w * 0.3); ctx.lineTo(P0.x + Math.cos(a) * w * 0.7, P0.y + Math.sin(a) * w * 0.3 - 2 * s); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,90,20,0.55)'; ctx.beginPath(); ctx.ellipse(P0.x, P0.y, w * 0.45, w * 0.2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function desenhar(ctx) {
    if (typeof game === 'undefined' || (!focos.length && !fumaca.length && !explosoes.length)) return;
    ctx.save();
    // fumaça (por trás das chamas, cor normal)
    ctx.globalCompositeOperation = 'source-over';
    for (const s of fumaca) {
      const P0 = ponto(s.x, s.y, s.z);
      if (!P0.ok) continue;
      const u = s.t / s.max, a = s.a * Math.min(1, u * 5) * (1 - u) * (1 - u), r = s.r * P0.k;
      if (a < 0.01 || r < 1) continue;
      const gr = ctx.createRadialGradient(P0.x, P0.y, 0, P0.x, P0.y, r);
      gr.addColorStop(0, rgbs(s.cor, a)); gr.addColorStop(0.6, rgbs(s.cor, a * 0.55)); gr.addColorStop(1, rgbs(s.cor, 0));
      ctx.fillStyle = gr; ctx.fillRect(P0.x - r, P0.y - r, r * 2, r * 2);
    }
    // 3ª pessoa: o que está atrás do herói (mais longe da câmera) não passa na frente dele — recorta
    // a silhueta aproximada do corpo
    let recorte = null;
    if (tresP() && game.player) {
      const p = game.player, E = ThirdView.eye, A = ThirdView.projC(p.x, p.y, 0), ax = A.x, ay = A.y, B = ThirdView.projC(p.x, p.y, (p.height || 56) + 8);
      if (A.vis && B.vis) { const w = Math.max(18, (ay - B.y) * 0.42); recorte = { x0: ax - w, x1: ax + w, y0: B.y - 6, y1: ay + 6, d: Math.hypot(p.x - E[0], p.y - E[1]) }; }
    }
    const atras = (x, y) => recorte && Math.hypot(x - ThirdView.eye[0], y - ThirdView.eye[1]) > recorte.d + 10;
    const recortar = () => { ctx.save(); ctx.beginPath(); ctx.rect(-4000, -4000, 9000, 9000); ctx.rect(recorte.x0, recorte.y0, recorte.x1 - recorte.x0, recorte.y1 - recorte.y0); ctx.clip('evenodd'); };
    for (const f of focos) if (f.lenha) { const r = atras(f.x, f.y); if (r) recortar(); lenha(ctx, f); if (r) ctx.restore(); }
    ctx.globalCompositeOperation = 'lighter';
    for (const f of focos) {
      const rc = atras(f.x, f.y);
      if (rc) recortar();
      const nasc = Math.min(1, f.t * 1.5), fim = f.vida === Infinity ? 1 : Math.min(1, f.vida / 2.5);
      const k = f.k * nasc * fim * (f.dono && f.dono.dur ? Math.min(1, (f.dono.dur - f.dono.t) / 3, f.dono.t * 2) : 1);
      if (f.tipo === 'incendio') {   // incêndio: várias chamas espalhadas pela área
        for (let j = 0; j < 5; j++) { const a = f.sd + j * 1.37; chama(ctx, { T: TIPO.incendio, pal: f.pal, sd: f.sd + j * 7, lod: f.lod }, f.x + Math.cos(a) * f.T.w * 0.9, f.y + Math.sin(a) * f.T.w * 0.6, f.z, k * (0.55 + 0.25 * Math.sin(t * 0.7 + j))); }
      }
      chama(ctx, f, f.x, f.y, f.z, k);
      if (rc) { ctx.restore(); ctx.globalCompositeOperation = 'lighter'; }
    }
    // explosões: bola de fogo que cresce e apaga, com línguas para fora
    for (const E of explosoes) {
      const u = Math.min(1, E.t / E.max);
      if (u >= 1) continue;
      const P0 = ponto(E.x, E.y, E.z + E.R * 0.4 * u), r = E.R * (0.35 + 0.9 * (1 - (1 - u) * (1 - u))) * P0.k, a = (1 - u) * (1 - u * 0.4);
      if (!P0.ok) continue;
      // corpo da bola (pintado por cima: aparece no deserto ao meio-dia) e, por dentro, o núcleo somado
      ctx.globalCompositeOperation = 'source-over';
      if (!E.energia && u > 0.25) {   // a fumaça escura que fica no lugar
        const gs = ctx.createRadialGradient(P0.x, P0.y - r * 0.2, r * 0.2, P0.x, P0.y - r * 0.2, r * 1.15);
        gs.addColorStop(0, `rgba(30,26,24,${(0.5 * (u - 0.25)).toFixed(3)})`); gs.addColorStop(1, 'rgba(30,26,24,0)');
        ctx.fillStyle = gs; ctx.beginPath(); ctx.arc(P0.x, P0.y - r * 0.2, r * 1.15, 0, TAU); ctx.fill();
      }
      const gb = ctx.createRadialGradient(P0.x, P0.y, r * 0.15, P0.x, P0.y, r);
      gb.addColorStop(0, rgbs(E.pal[1], a * 0.95)); gb.addColorStop(0.45, rgbs(E.pal[2], a * 0.85)); gb.addColorStop(0.8, rgbs(E.pal[3], a * 0.45)); gb.addColorStop(1, rgbs(E.pal[3], 0));
      ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(P0.x, P0.y, r, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(P0.x, P0.y, 0, P0.x, P0.y, r * 0.6);
      gr.addColorStop(0, rgbs(E.pal[0], a)); gr.addColorStop(0.5, rgbs(E.pal[1], a * 0.7)); gr.addColorStop(1, rgbs(E.pal[2], 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(P0.x, P0.y, r * 0.6, 0, TAU); ctx.fill();
      for (let j = 0; j < 9; j++) {
        const ang = j / 9 * TAU + E.sd, L = r * (0.9 + 0.5 * Math.sin(E.sd * 3 + j * 1.9)) * (0.6 + u * 0.6), lx = P0.x + Math.cos(ang) * L, ly = P0.y + Math.sin(ang) * L * 0.75 - u * r * 0.3;
        const g2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.38);
        g2.addColorStop(0, rgbs(E.pal[1], a * 0.7)); g2.addColorStop(1, rgbs(E.pal[3], 0));
        ctx.fillStyle = g2; ctx.fillRect(lx - r * 0.38, ly - r * 0.38, r * 0.76, r * 0.76);
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ calor (por cima da imagem)
  // O ar treme acima das chamas grandes e a onda de choque das explosões dobra a imagem
  let tmp = null;
  function calor(ctx) {
    if (typeof game === 'undefined' || q() < 2) return;
    const g = game, cv = g.canvas, s = g.scale;
    if (!cv || !s) return;
    const alvos = [];
    for (const f of focos) if (f.T.h * f.k >= 24 && !f.lod) alvos.push(f);
    alvos.sort((a, b) => b.T.h * b.k - a.T.h * a.k);
    if (!tmp) tmp = document.createElement('canvas');
    const tg = tmp.getContext('2d');
    for (const f of alvos.slice(0, 3)) {
      const T0 = naTela(f.x, f.y, f.z + f.T.h * f.k * 0.7);
      if (!T0.ok) continue;
      const w = Math.min(260, f.T.w * 3.2 * T0.k + 20), h = Math.min(320, f.T.h * 3 * T0.k + 30), x0 = T0.x - w / 2, y0 = T0.y - h;
      if (x0 + w < 0 || y0 + h < 0 || x0 > VIEW_W || y0 > VIEW_H) continue;
      const sw = Math.ceil(w * s), sh = Math.ceil(h * s);
      if (tmp.width < sw) tmp.width = sw; if (tmp.height < sh) tmp.height = sh;
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, sw, sh);
      tg.drawImage(cv, g.offX + x0 * s, g.offY + y0 * s, sw, sh, 0, 0, sw, sh);
      const passo = 4;
      ctx.save(); ctx.globalAlpha = 0.85;
      for (let y = 0; y < h; y += passo) {
        const forca = Math.sin(Math.PI * y / h) * (0.4 + 0.6 * (1 - y / h)), dx = Math.sin(t * 9 + y * 0.35 + f.sd) * 2.2 * forca * Math.min(2, T0.k + 0.4);
        ctx.drawImage(tmp, 0, y * s, sw, passo * s, x0 + dx, y0 + y, w, passo);
      }
      ctx.restore();
    }
    // onda de choque: anel que dobra a imagem (lente) enquanto cresce
    for (const E of explosoes) {
      const u = E.t / (E.max + 0.25);
      if (u >= 1) continue;
      const C = naTela(E.x, E.y, E.z), rr = E.R * (0.6 + 2.6 * u) * C.k, banda = 16 + 10 * E.forca;
      if (!C.ok || rr < 4) continue;
      const x0 = C.x - rr - banda, y0 = C.y - rr - banda, w = (rr + banda) * 2;
      if (w > 900) continue;
      const sw = Math.ceil(w * s);
      if (tmp.width < sw) tmp.width = sw; if (tmp.height < sw) tmp.height = sw;
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, sw, sw);
      tg.drawImage(cv, g.offX + x0 * s, g.offY + y0 * s, sw, sw, 0, 0, sw, sw);
      const z = 1 + 0.06 * (1 - u) * Math.min(2, E.forca);
      ctx.save();
      ctx.beginPath(); ctx.arc(C.x, C.y, rr + banda * 0.5, 0, TAU); ctx.arc(C.x, C.y, Math.max(0, rr - banda * 0.5), 0, TAU, true); ctx.clip();
      ctx.globalAlpha = 0.9 * (1 - u);
      ctx.drawImage(tmp, 0, 0, sw, sw, C.x - w * z / 2, C.y - w * z / 2, w * z, w * z);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------ luz
  const tremor = (f) => 0.82 + 0.1 * Math.sin(t * 11 + f.sd) + 0.08 * Math.sin(t * 23.7 + f.sd * 2);
  // isométrica: furos no mapa de escuridão
  function luzes(L) {
    for (const f of focos) {
      if (f.lod > 1 || !f.T.luz) continue;
      const k = tremor(f) * Math.min(1, f.t * 1.5) * f.k * f.luzK * (f.vida === Infinity ? 1 : Math.min(1, f.vida / 2.5));
      L.add(isoX(f.x, f.y), isoY(f.x, f.y) - f.z - f.T.h * 0.4, f.T.luz * (0.8 + 0.2 * k), Math.min(1, f.T.li * k));
    }
    for (const E of explosoes) { const u = E.t / E.max; if (u < 1) L.add(isoX(E.x, E.y), isoY(E.x, E.y) - E.z, E.R * 6 * (1 - u * 0.5), Math.min(1, 1.2 * (1 - u))); }
  }
  // 3ª pessoa: as luzes pontuais mais fortes perto da câmera (até 6): [x, y, z, raio, r, g, b, força]
  function luzes3P(lista, eye) {
    const cand = [];
    for (const f of focos) {
      if (!f.T.luz) continue;
      const k = tremor(f) * Math.min(1, f.t * 1.5) * f.k * f.luzK * (f.vida === Infinity ? 1 : Math.min(1, f.vida / 2.5));
      const c = f.pal[1];
      cand.push([f.x, f.y, f.z + f.T.h * 0.5, f.T.luz * 0.9, c[0] / 255, c[1] / 255 * 0.85, c[2] / 255 * 0.7, f.T.li * k * 1.3]);
    }
    for (const E of explosoes) { const u = E.t / E.max; if (u < 1) { const c = E.pal[1]; cand.push([E.x, E.y, E.z + 20, E.R * 7, c[0] / 255, c[1] / 255, c[2] / 255, 3.2 * (1 - u) * (1 - u)]); } }
    const d = (l) => Math.hypot(l[0] - eye[0], l[1] - eye[1]) - l[3] * 0.5 * l[7];
    cand.sort((a, b) => d(a) - d(b));
    for (const l of cand) { if (lista.length >= 6) break; lista.push(l); }
    return lista;
  }

  // lume do campo aberto que vira fogueira (o brilho antigo não é mais desenhado: js/rooms.js e js/terceira.js)
  // paleta mais parecida com uma cor 'r,g,b' (a explosão na cor do efeito que já existia)
  function paletaDe(rgb) {
    const c = String(rgb || '255,140,40').split(',').map(Number);
    if (c[2] > c[0] && c[2] > c[1] * 0.9) return c[0] > 150 ? 'roxo' : 'azul';
    if (c[1] > c[0]) return 'verde';
    if (c[0] > 200 && c[1] < 90) return 'carmim';
    return 'fogo';
  }
  const ehFogueira = (R, tc) => !!(tc && tc.chao && R && R.def && (R.def.theme === 'floresta' || R.def.theme === 'deserto' || R.def.theme === 'vulcao'));
  return { paletaDe, TIPO, PALETA, focos, fumaca, explosoes, acender, apagar, explosao, baforada, update, desenhar, calor, luzes, luzes3P, sincronizar, estruturas, vento, VENTO, inflamavel, ehFogueira };
})();
