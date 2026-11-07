'use strict';
// ECLIPSE ZERO · Rios, lagos e nado no mundo aberto (Agua)
// ---------------------------------------------------------------------------
// Cada zona da lista AGUA_ZONAS ganha corpos d'água: lagos (elipses) e rios (linhas com largura),
// em frações da sala. A profundidade cresce da margem para o meio: na faixa rasa da margem
// (RASO unidades) o herói anda mais devagar com a água pelas pernas; no fundo ele NADA:
//   - anda a 55% (a esquiva vira uma braçada), não golpeia, não pula, não defende, não usa poderes
//     nem a suprema (a arma fica guardada); o corpo afunda até o peito nas duas câmeras;
//   - sai da água a qualquer momento pela margem. Montado, a montaria não entra no fundo.
// Os inimigos (e os animais) não entram no fundo: param na margem. Árvores, pedras e enfeites que
// cairiam dentro d'água saem; objetos de cenário e estruturas procuram lugar fora dela; os
// moradores que nasceriam na água vão para a margem.
// Desenho: vista isométrica (faixas da margem rasa ao fundo, areia molhada, espuma que respira,
// ondas e brilhos do sol que andam, ondinhas em volta de quem nada) e 3ª pessoa (uma malha por
// corpo d'água com o material de água do motor: ondas na superfície, normal animada, reflexo do
// céu por Fresnel, brilho do sol e espuma na margem; o que está abaixo dela some pela
// profundidade). A margem é irregular (lagos e rios naturais), igual na física e no desenho.
// ---------------------------------------------------------------------------
const Agua = (() => {
  const RASO = 46;   // largura da faixa rasa da margem (unidades)
  // lago: [cx, cy, rx, ry] · rio: { pts: [[x, y], …], w } (frações da sala; rx, ry e w da menor medida)
  const AGUA_ZONAS = {
    velmora_lago: [{ lago: [0.52, 0.55, 0.3, 0.22] }],
    velmora_clareira: [{ rio: [[0, 0.82], [0.28, 0.76], [0.55, 0.86], [0.8, 0.78], [1, 0.84]], w: 0.1 }],
    velmora_trilha: [{ rio: [[0.62, 0], [0.56, 0.3], [0.66, 0.6], [0.6, 1]], w: 0.09 }],
    lagoa_cais: [{ lago: [0.5, 0.2, 0.4, 0.14] }],
    lagoa_ilha: [{ lago: [0.2, 0.5, 0.14, 0.32] }, { lago: [0.8, 0.5, 0.14, 0.32] }],
    lagoa_farol: [{ lago: [0.78, 0.78, 0.2, 0.18] }],
    lagoa_recife: [{ rio: [[0, 0.45], [0.35, 0.5], [0.65, 0.42], [1, 0.5]], w: 0.14 }],
    lagoa_submersa: [{ lago: [0.5, 0.5, 0.32, 0.3] }],
    seraph_oasis: [{ lago: [0.5, 0.5, 0.17, 0.12] }],
    rc_aqueduto: [{ rio: [[0, 0.5], [1, 0.5]], w: 0.12 }],
    rc_jardins: [{ lago: [0.25, 0.75, 0.14, 0.1] }],
    metro_arcologia: [{ lago: [0.3, 0.45, 0.13, 0.1] }],
  };
  let corpos = [], R0 = null, t = 0;

  // ------------------------------------------------------------ geometria
  // Margem natural: o contorno do lago varia com o ângulo e a largura do rio com o caminho (a mesma
  // forma vale para a física e para os dois desenhos)
  function montar(z, R) {
    const L = AGUA_ZONAS[z.id] || [], m = Math.min(R.w, R.h), out = [];
    L.forEach((c, k) => {
      const sd = [1.3 + k * 2.1, 4.7 + k * 1.3, 2.2 + k * 3.1];
      if (c.lago) { const [x, y, rx, ry] = c.lago; out.push({ lago: true, x: x * R.w, y: y * R.h, rx: rx * m, ry: ry * m, sd }); return; }
      const pts = c.rio.map(([x, y]) => [x * R.w, y * R.h]), ac = [0];
      for (let i = 1; i < pts.length; i++) ac.push(ac[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      out.push({ rio: true, pts, ac, w: c.w * m, sd });
    });
    return out;
  }
  const borda = (c, a) => 1 + 0.07 * Math.sin(3 * a + c.sd[0]) + 0.045 * Math.sin(7 * a + c.sd[1]) + 0.025 * Math.sin(13 * a + c.sd[2]);
  const largura = (c, s) => c.w * (1 + 0.14 * Math.sin(s * 0.011 + c.sd[0]) + 0.07 * Math.sin(s * 0.031 + c.sd[1]));
  // Distância "para dentro" da água (negativa fora): o maior valor entre os corpos
  function dentro(x, y) {
    let best = -1e9;
    for (const c of corpos) {
      let d;
      if (c.lago) {
        const qx = (x - c.x) / c.rx, qy = (y - c.y) / c.ry, q = Math.hypot(qx, qy) / borda(c, Math.atan2(qy, qx));
        d = (1 - q) * Math.min(c.rx, c.ry);
      } else {
        let md = 1e9, s = 0;
        for (let i = 0; i + 1 < c.pts.length; i++) {
          const [ax, ay] = c.pts[i], [bx, by] = c.pts[i + 1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
          const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)), dd = Math.hypot(x - ax - dx * u, y - ay - dy * u);
          if (dd < md) { md = dd; s = c.ac[i] + Math.sqrt(l2) * u; }
        }
        d = largura(c, s) / 2 - md;
      }
      if (d > best) best = d;
    }
    return best;
  }
  // 0 fora, 0–1 na faixa rasa, 1 no fundo
  function profundidade(x, y) {
    if (!corpos.length || (typeof game !== 'undefined' && game.room !== R0)) return 0;
    const d = dentro(x, y);
    return d <= 0 ? 0 : Math.min(1, d / RASO);
  }
  const funda = (x, y) => profundidade(x, y) >= 1;

  // ------------------------------------------------------------ zona
  function aoCarregar(z) {
    corpos = []; R0 = null;
    const R = typeof game !== 'undefined' && game.room;
    if (!R || !z || !AGUA_ZONAS[z.id]) return 0;
    corpos = montar(z, R); R0 = R;
    // sem árvores, pedras e enfeites dentro d'água (os colisores de cenário e estruturas vêm depois e evitam a água)
    for (let i = R.pillars.length - 1; i >= 0; i--) { const q = R.pillars[i]; if (dentro(q.x, q.y) > -(q.r || 10) * 0.5 && !q.cenario) R.pillars.splice(i, 1); }
    return corpos.length;
  }
  // Depois de todos montarem a zona: moradores e baús que caíram na água vão para a margem
  function depois() {
    if (!corpos.length || typeof game === 'undefined') return;
    for (const n of game.npcs) if (!n.cenId && profundidade(n.x, n.y) > 0) margem(n);
  }
  function margem(e) {
    for (let d = 30; d <= 600; d += 30) for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6, x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d;
      if (profundidade(x, y) === 0 && game.room.canStand(x, y, e.radius || 14)) { e.x = x; e.y = y; return true; }
    }
    return false;
  }

  // ------------------------------------------------------------ quadro
  function update(dt) {
    t += dt;
    const g = typeof game !== 'undefined' ? game : null;
    if (!g || !g.player) return;
    const p = g.player, pr = profundidade(p.x, p.y);
    const antes = !!p.nadando;
    p.agua = pr; p.nadando = pr >= 1 && !p.air;
    if (p.nadando) {
      if (p.montado && typeof Montarias !== 'undefined') Montarias.desmontar();
      p.wpnOut = false; if (p.state === 'block') p.state = 'idle';
      if (!antes && g.particles) g.particles.dust(p.x, p.y, 8, 14, 120);
      if (!antes && g.audio && g.audio.ctx) g.audio.noise(0.25, 0.12, 'bandpass', 900, 400, 1);
    }
    // inimigos não entram no fundo (param na margem)
    for (const e of g.enemies) {
      if (!corpos.length) break;
      if (funda(e.x, e.y) && !e.nadador) { if (e._seco) { e.x = e._seco[0]; e.y = e._seco[1]; e.vx = e.vy = 0; } }
      else e._seco = [e.x, e.y];
    }
  }
  // Ritmo de quem anda na água (Player: multiplica a velocidade)
  function ritmo(e) { const pr = e.agua || 0; return pr >= 1 ? 0.55 : 1 - 0.3 * pr; }
  // Nadando, só a esquiva (braçada) e o andar: Player.captureInput consulta
  function travado(e) { return !!e.nadando; }

  // ------------------------------------------------------------ desenho (vista isométrica)
  // Contorno do corpo d'água recuado 'enc' unidades da margem (lista de pontos do mundo)
  function contorno(c, enc) {
    const P = [];
    if (c.lago) {
      for (let i = 0; i < 72; i++) {
        const a = i / 72 * Math.PI * 2, b = borda(c, a), rx = Math.max(3, c.rx * b - enc), ry = Math.max(3, c.ry * b - enc * c.ry / c.rx);
        P.push([c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry]);
      }
      return P;
    }
    const esq = [], dir = [], tot = c.ac[c.ac.length - 1];
    for (let s = 0; s <= tot + 0.1; s += Math.max(12, c.w * 0.25)) {
      let i = 0; while (i < c.pts.length - 2 && c.ac[i + 1] < s) i++;
      const [ax, ay] = c.pts[i], [bx, by] = c.pts[i + 1], L = c.ac[i + 1] - c.ac[i] || 1, u = Math.min(1, (s - c.ac[i]) / L);
      const x = ax + (bx - ax) * u, y = ay + (by - ay) * u, nx = -(by - ay) / L, ny = (bx - ax) / L, w = Math.max(3, largura(c, s) / 2 - enc);
      esq.push([x + nx * w, y + ny * w]); dir.push([x - nx * w, y - ny * w]);
    }
    return esq.concat(dir.reverse());
  }
  function caminho(ctx, P) {
    ctx.beginPath();
    P.forEach(([x, y], i) => (i ? ctx.lineTo(isoX(x, y), isoY(x, y)) : ctx.moveTo(isoX(x, y), isoY(x, y))));
    ctx.closePath();
  }
  // Faixas da margem ao fundo (rasa → funda), espuma na margem, ondas e brilhos do sol que andam
  function desenhar(ctx) {
    if (!corpos.length || game.room !== R0) return;
    const luz = typeof WorldTime !== 'undefined' ? WorldTime.luz() : 0.7, k = 0.35 + 0.65 * luz;
    const tom = (r, g, b, a) => `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * (0.55 + 0.45 * k))},${a})`;
    ctx.save();
    for (const c of corpos) {
      const P0 = contorno(c, 0);
      // areia molhada logo antes da água
      caminho(ctx, contorno(c, -7)); ctx.fillStyle = tom(70, 74, 60, 0.35); ctx.fill();
      // faixas de profundidade (a margem rasa mostra o fundo; o meio é escuro)
      const F = [[0, [92, 150, 150]], [10, [62, 128, 140]], [24, [40, 100, 126]], [RASO, [24, 74, 108]], [RASO + 40, [14, 54, 88]], [RASO + 110, [8, 38, 70]]];
      for (const [enc, [r, g, b]] of F) { const P = contorno(c, enc); caminho(ctx, P); ctx.fillStyle = tom(r, g, b, 0.95); ctx.fill(); }
      // ondas e brilhos (presos à água)
      caminho(ctx, P0); ctx.save(); ctx.clip();
      const bx = c.lago ? c.x : c.pts[0][0], by = c.lago ? c.y : c.pts[0][1], ext = c.lago ? Math.max(c.rx, c.ry) * 1.2 : 1400;
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 26; i++) {
        const fase = i * 0.618, u = (((fase + t * 0.025) % 1) * 2 - 1), v = ((i * 0.382) % 1) * 2 - 1;
        const x = bx + u * ext, y = by + v * ext * 0.9, L = 14 + (i % 5) * 7, a = 0.12 + 0.1 * Math.sin(t * 1.3 + i);
        ctx.strokeStyle = `rgba(200,232,245,${Math.max(0, a)})`;
        ctx.beginPath();
        for (let q = 0; q <= 6; q++) { const xx = x - L + q * L / 3, yy = y + Math.sin(q * 1.2 + t * 2 + i) * 2.2; if (q) ctx.lineTo(isoX(xx, yy), isoY(xx, yy)); else ctx.moveTo(isoX(xx, yy), isoY(xx, yy)); }
        ctx.stroke();
      }
      if (luz > 0.25) for (let i = 0; i < 40; i++) {   // brilhos do sol (piscam)
        const u = ((i * 0.7548 + t * 0.012) % 1) * 2 - 1, v = ((i * 0.5698) % 1) * 2 - 1, a = Math.max(0, Math.sin(t * 3.1 + i * 2.3)) ** 6;
        if (a < 0.05) continue;
        const x = bx + u * ext, y = by + v * ext * 0.9;
        ctx.fillStyle = `rgba(255,252,235,${a * 0.9 * luz})`; ctx.fillRect(isoX(x, y) - 2, isoY(x, y), 4, 1.3);
      }
      ctx.restore();
      // espuma que respira na margem
      caminho(ctx, contorno(c, 2 + Math.sin(t * 1.4) * 1.5));
      ctx.setLineDash([10, 6, 3, 7]); ctx.lineDashOffset = -t * 6;
      ctx.strokeStyle = `rgba(235,246,250,${0.5 * k + 0.2})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.setLineDash([]);
      caminho(ctx, P0); ctx.strokeStyle = `rgba(210,232,236,${0.35 * k + 0.1})`; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
  }
  // Por cima de quem está na água: a água cobre o corpo até a linha d'água e as ondinhas em volta
  function cobrir(ctx, e) {
    const pr = e.agua !== undefined ? e.agua : profundidade(e.x, e.y);
    if (!(pr > 0.05)) return;
    const sx = isoX(e.x, e.y), sy = isoY(e.x, e.y), r = (e.radius || 16) * 1.5, h = (e.height || 56) * (pr >= 1 ? 0.12 : 0.18 * pr);
    ctx.save();
    ctx.fillStyle = pr >= 1 ? 'rgba(14,54,88,0.96)' : 'rgba(62,128,140,0.82)';
    ctx.beginPath(); ctx.ellipse(sx, sy - h, r, r * 0.5, 0, 0, Math.PI); ctx.lineTo(sx - r, sy + (e.height || 56) * 0.8); ctx.lineTo(sx + r, sy + (e.height || 56) * 0.8); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 3; k++) {   // ondinhas que se afastam
      const f = ((t * 0.6 + k / 3) % 1), rr = r * (1 + f * 1.6);
      ctx.strokeStyle = `rgba(225,245,250,${0.6 * (1 - f)})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(sx, sy - h, rr, rr * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  function desenharNadadores(ctx) {
    if (!corpos.length || game.room !== R0) return;
    const g = game;
    cobrir(ctx, g.player);
    for (const e of g.enemies) cobrir(ctx, e);
  }
  // Quem nada afunda até o peito (Game.queue3: as duas câmeras)
  function afundar(e, o) {
    if (e && e.nadando) o.lift = (o.lift || 0) - (e.height || 56) * 0.55 + Math.sin(t * 3 + (e.id || 0)) * 1.5;
  }

  // ------------------------------------------------------------ 3ª pessoa
  // Uma malha por corpo d'água (anéis da margem ao fundo; rio: faixas ao longo do leito), com a cor
  // pela profundidade e a "margem" em cada vértice (o shader da água do motor faz ondas, reflexo,
  // brilho do sol e espuma: js/engine3d.js, uAgua)
  const RASA = [0.36, 0.58, 0.58], MEIA = [0.13, 0.36, 0.44], FUNDA = [0.03, 0.13, 0.22];
  function corProf(d) {   // d: distância da margem (unidades)
    const a = Math.min(1, d / RASO), b = Math.min(1, Math.max(0, (d - RASO) / 120));
    const c1 = RASA.map((v, i) => v + (MEIA[i] - v) * a);
    return c1.map((v, i) => v + (FUNDA[i] - v) * b);
  }
  function malha(c) {
    const d = [];
    const vert = (x, y, dist) => { const k = corProf(dist); d.push(x, y, 0.8, 0, 0, 1, k[0], k[1], k[2], Math.max(0, 1 - dist / 30)); };
    if (c.lago) {
      const S = 72, A = [0, 6, 16, 30, 46, 70, 110, 170, 260, 1e9];
      const ring = (enc) => { const L = []; for (let i = 0; i < S; i++) { const a = i / S * Math.PI * 2, b = borda(c, a), rx = c.rx * b - enc, ry = c.ry * b - enc * c.ry / c.rx; L.push(rx > 2 && ry > 2 ? [c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry, enc] : null); } return L; };
      let R0r = ring(-6);   // um pouco além da margem (espuma sobre a areia)
      for (let k = 0; k < A.length; k++) {
        const R1 = A[k] >= 1e9 ? null : ring(A[k]);
        for (let i = 0; i < S; i++) {
          const j = (i + 1) % S, a = R0r[i], b = R0r[j];
          if (!a || !b) continue;
          const c1 = R1 && R1[i], c2 = R1 && R1[j];
          if (c1 && c2) { vert(a[0], a[1], Math.max(0, a[2])); vert(b[0], b[1], Math.max(0, b[2])); vert(c2[0], c2[1], c2[2]); vert(a[0], a[1], Math.max(0, a[2])); vert(c2[0], c2[1], c2[2]); vert(c1[0], c1[1], c1[2]); }
          else { vert(a[0], a[1], Math.max(0, a[2])); vert(b[0], b[1], Math.max(0, b[2])); vert(c.x, c.y, Math.min(c.rx, c.ry)); }
        }
        if (!R1 || R1.every((q) => !q)) break;
        R0r = R1.map((q, i) => q || R0r[i] && [c.x, c.y, Math.min(c.rx, c.ry)]);
      }
    } else {
      const tot = c.ac[c.ac.length - 1], U = [-1.12, -1, -0.8, -0.5, 0, 0.5, 0.8, 1, 1.12], passo = Math.max(14, c.w * 0.3);
      let prev = null;
      for (let s = 0; s <= tot + passo; s += passo) {
        const ss = Math.min(s, tot);
        let i = 0; while (i < c.pts.length - 2 && c.ac[i + 1] < ss) i++;
        const [ax, ay] = c.pts[i], [bx, by] = c.pts[i + 1], L = c.ac[i + 1] - c.ac[i] || 1, u = Math.min(1, (ss - c.ac[i]) / L);
        const x = ax + (bx - ax) * u, y = ay + (by - ay) * u, nx = -(by - ay) / L, ny = (bx - ax) / L, w = largura(c, ss) / 2;
        const lin = U.map((q) => [x + nx * w * q, y + ny * w * q, Math.max(0, (1 - Math.abs(q)) * w)]);
        if (prev) for (let q = 0; q + 1 < U.length; q++) { const a = prev[q], b = prev[q + 1], c1 = lin[q], c2 = lin[q + 1]; vert(a[0], a[1], a[2]); vert(b[0], b[1], b[2]); vert(c2[0], c2[1], c2[2]); vert(a[0], a[1], a[2]); vert(c2[0], c2[1], c2[2]); vert(c1[0], c1[1], c1[2]); }
        prev = lin;
        if (ss >= tot) break;
      }
    }
    const nd = new N3('agua');
    nd.geo = new Float32Array(d);
    return new Model3(nd);
  }
  function fila3P(Q) {
    if (!corpos.length || game.room !== R0) return;
    for (const c of corpos) {
      const m = c.m3 || (c.m3 = malha(c));
      const o = c.o3 || (c.o3 = { m: M3.make(), fixo: true, agua: true, aguaC: c.lago ? [c.x, c.y] : [c.pts[0][0], c.pts[0][1]], flash: 0, emi: 1, holo: false, ghost: null, tint: null, scale: 1, lift: 0, roll: 0, pitch: 0, yaw: 0 });
      const it = R3D.queue(m, null, null, o); it.ent = null; Q.push(it);
    }
  }

  return { AGUA_ZONAS, RASO, aoCarregar, depois, update, profundidade, funda, ritmo, travado, desenhar, desenharNadadores, afundar, fila3P, corpos: () => corpos, margem };
})();
