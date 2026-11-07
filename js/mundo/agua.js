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
// Desenho: vista isométrica (a água por cima do chão, margem com espuma, reflexos que andam e a
// água cobrindo o corpo de quem está dentro) e 3ª pessoa (a superfície na cena do motor 3D: o que
// está abaixo dela some pela profundidade).
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
  function montar(z, R) {
    const L = AGUA_ZONAS[z.id] || [], m = Math.min(R.w, R.h), out = [];
    for (const c of L) {
      if (c.lago) { const [x, y, rx, ry] = c.lago; out.push({ lago: true, x: x * R.w, y: y * R.h, rx: rx * m, ry: ry * m }); }
      else out.push({ rio: true, pts: c.rio.map(([x, y]) => [x * R.w, y * R.h]), w: c.w * m });
    }
    return out;
  }
  // Distância "para dentro" da água (negativa fora): o maior valor entre os corpos
  function dentro(x, y) {
    let best = -1e9;
    for (const c of corpos) {
      let d;
      if (c.lago) {
        const qx = (x - c.x) / c.rx, qy = (y - c.y) / c.ry, q = Math.hypot(qx, qy);
        d = (1 - q) * Math.min(c.rx, c.ry);
      } else {
        let md = 1e9;
        for (let i = 0; i + 1 < c.pts.length; i++) md = Math.min(md, pointSegDist(x, y, c.pts[i][0], c.pts[i][1], c.pts[i + 1][0], c.pts[i + 1][1]));
        d = c.w / 2 - md;
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
  function caminho(ctx, c, enc) {
    ctx.beginPath();
    if (c.lago) {
      const rx = Math.max(4, c.rx - enc), ry = Math.max(4, c.ry - enc);
      for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, x = c.x + Math.cos(a) * rx, y = c.y + Math.sin(a) * ry; if (i) ctx.lineTo(isoX(x, y), isoY(x, y)); else ctx.moveTo(isoX(x, y), isoY(x, y)); }
    } else {
      const P = c.pts, w = Math.max(4, c.w / 2 - enc), esq = [], dir = [];
      for (let i = 0; i < P.length; i++) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        esq.push([P[i][0] + nx * w, P[i][1] + ny * w]); dir.push([P[i][0] - nx * w, P[i][1] - ny * w]);
      }
      const T = esq.concat(dir.reverse());
      T.forEach(([x, y], i) => (i ? ctx.lineTo(isoX(x, y), isoY(x, y)) : ctx.moveTo(isoX(x, y), isoY(x, y))));
    }
    ctx.closePath();
  }
  function desenhar(ctx) {
    if (!corpos.length || game.room !== R0) return;
    const noite = typeof WorldTime !== 'undefined' ? 1 - WorldTime.luz() : 0.3;
    ctx.save();
    for (const c of corpos) {
      caminho(ctx, c, 0); ctx.fillStyle = `rgba(${Math.round(70 - 40 * noite)},${Math.round(130 - 60 * noite)},${Math.round(150 - 50 * noite)},0.88)`; ctx.fill();   // raso
      ctx.strokeStyle = 'rgba(220,240,245,0.55)'; ctx.lineWidth = 2.2; ctx.stroke();                                                                    // espuma da margem
      caminho(ctx, c, RASO); ctx.fillStyle = `rgba(${Math.round(18 - 10 * noite)},${Math.round(62 - 30 * noite)},${Math.round(98 - 40 * noite)},0.92)`; ctx.fill();   // fundo
      // reflexos que andam (presos ao desenho da água)
      ctx.save(); ctx.clip();
      ctx.strokeStyle = `rgba(190,225,240,${0.22 + 0.1 * Math.sin(t)})`; ctx.lineWidth = 1.4;
      const bx = c.lago ? c.x : c.pts[0][0], by = c.lago ? c.y : c.pts[0][1], ext = c.lago ? Math.max(c.rx, c.ry) : 900;
      for (let i = 0; i < 18; i++) {
        const u = ((i * 0.618 + t * 0.04) % 1) * 2 - 1, v = (((i * 0.382) % 1) * 2 - 1), x = bx + u * ext, y = by + v * ext * 0.8, s = 10 + (i % 4) * 6;
        ctx.beginPath(); ctx.moveTo(isoX(x - s, y), isoY(x - s, y)); ctx.lineTo(isoX(x + s, y), isoY(x + s, y)); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  // Por cima de quem está na água: a água cobre o corpo até a linha d'água
  function cobrir(ctx, e) {
    const pr = e.agua !== undefined ? e.agua : profundidade(e.x, e.y);
    if (!(pr > 0.05)) return;
    const sx = isoX(e.x, e.y), sy = isoY(e.x, e.y), r = (e.radius || 16) * 1.5, h = (e.height || 56) * (pr >= 1 ? 0.12 : 0.18 * pr);
    ctx.save();
    ctx.fillStyle = pr >= 1 ? 'rgba(18,62,98,0.95)' : 'rgba(70,130,150,0.8)';
    ctx.beginPath(); ctx.ellipse(sx, sy - h, r, r * 0.5, 0, 0, Math.PI); ctx.lineTo(sx - r, sy + (e.height || 56) * 0.8); ctx.lineTo(sx + r, sy + (e.height || 56) * 0.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(225,245,250,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(sx, sy - h, r * (1 + 0.08 * Math.sin(t * 5)), r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
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
  function fila3P(Q) {
    if (!corpos.length || game.room !== R0) return;
    const pool = fila3P.pool || (fila3P.pool = []);
    let n = 0;
    const add = (m, x, y, sx, sy, z) => {
      const o = pool[n] || (pool[n] = { m: M3.make(), flash: 0, emi: 1, holo: false, ghost: null, tint: null, scale: 1, lift: 0, roll: 0, pitch: 0, yaw: 0 });
      n++;
      M3.trs(o.m, [x, y, z], [0, 0, 0], [sx, sy, 1]);
      const it = R3D.queue(m, null, null, o); it.ent = null; Q.push(it);
    };
    for (const c of corpos) {
      if (c.lago) { add(modelo('raso'), c.x, c.y, c.rx, c.ry, 0.5); add(modelo('fundo'), c.x, c.y, Math.max(4, c.rx - RASO), Math.max(4, c.ry - RASO), 0.7); continue; }
      for (let i = 0; i + 1 < c.pts.length; i++) {   // rio: discos ao longo da linha
        const [ax, ay] = c.pts[i], [bx, by] = c.pts[i + 1], L = Math.hypot(bx - ax, by - ay), k = Math.max(1, Math.ceil(L / (c.w * 0.35)));
        for (let j = 0; j <= k; j++) { const u = j / k, x = ax + (bx - ax) * u, y = ay + (by - ay) * u; add(modelo('raso'), x, y, c.w / 2, c.w / 2, 0.5); add(modelo('fundo'), x, y, Math.max(4, c.w / 2 - RASO), Math.max(4, c.w / 2 - RASO), 0.7); }
      }
    }
  }
  function modelo(k) {
    const C = modelo.C || (modelo.C = {});
    if (C[k]) return C[k];
    const g = new G3();
    g.cyl(0, 0, 0, 1, 1, 0.3, 28, k === 'raso' ? '#3f7f92' : '#123e60', 0.12);
    return (C[k] = new Model3(new N3('agua_' + k, g)));
  }

  return { AGUA_ZONAS, RASO, aoCarregar, depois, update, profundidade, funda, ritmo, travado, desenhar, desenharNadadores, afundar, fila3P, corpos: () => corpos, margem };
})();
