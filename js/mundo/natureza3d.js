'use strict';
// ECLIPSE ZERO · Natureza 3D das florestas (kit medieval e natural feito no Blender)
// ---------------------------------------------------------------------------
// O kit (tools/blender/natureza.py → assets/models/natureza/*.glb → js/assets/natureza3d.js, que
// junta os objetos ao PROPS3D; os modelos do motor são os 'cen_<id>' de js/mundo/cenario.js) entra
// nas zonas de floresta (tema com pilar 'tree'):
// - os obstáculos viram carvalhos, pinheiros e bétulas (os altos), árvores mortas, tocos e pedras
//   com musgo (os baixos) e a borda do campo, a mata em volta; o colisor continua o do pilar;
// - enfeites espalhados pelo chão (arbustos, samambaias, cogumelos, pedras, troncos caídos e tocos)
//   que não bloqueiam ninguém (marcados deco, como a paisagem da borda);
// - na vista isométrica cada combinação (peça, giro, escala, zoom) é fotografada uma vez pelo motor
//   3D (R3D.foto) no começo de um quadro e vira o sprite do pilar (sem custo por quadro); até ficar
//   pronta, fica o desenho 2D de antes;
// - na 3ª pessoa os modelos entram na cena (perto do herói; os que tapam a câmera somem).
// As vilas da floresta (carroça, feno, cerca, placa, poço) vão pelas zonas de js/mundo/cenario.js.
const Natureza3D = (() => {
  const ARVORES = [['carvalho', 0.42], ['pinheiro', 0.33], ['betula', 0.25]];
  const BAIXOS = [['arvore_seca', 0.3], ['toco', 0.2], ['pedra_musgo', 0.3], ['rochedo', 0.2]];
  const BORDA = [['pinheiro', 0.42], ['carvalho', 0.3], ['betula', 0.18], ['rochedo', 0.1]];
  const ENFEITES = [['arbusto', 0.32], ['samambaia', 0.3], ['cogumelos', 0.1], ['pedra_musgo', 0.1], ['tronco_caido', 0.1], ['toco', 0.08]];
  const GIROS = 4;
  const tem = (id) => typeof PROPS3D !== 'undefined' && !!PROPS3D[id] && typeof MODELS3D !== 'undefined' && !!MODELS3D['cen_' + id];
  const floresta = (th) => !!th && th.pillar === 'tree';
  function sorteia(L, x) { let a = 0; for (const [id, w] of L) { a += w; if (x < a) return id; } return L[L.length - 1][0]; }

  // Peça do kit de um obstáculo (fixa pela semente; null: fica o desenho de antes)
  function escolha(p, th) {
    if (p.kit !== undefined) return p.kit;
    if (!floresta(th)) return (p.kit = null);
    const r = mulberry32(((p.seed || 1) * 7 + 3) >>> 0);
    const id = sorteia(p.enfeite ? ENFEITES : p.deco ? BORDA : p.broken ? BAIXOS : ARVORES, r());
    if (!tem(id)) return (p.kit = null);
    const esc = p.enfeite ? 0.8 + 0.4 * r() : 0.85 + 0.35 * r();
    return (p.kit = { id, giro: Math.floor(r() * GIROS), esc: Math.round(esc / 0.15) * 0.15 });   // (poucas combinações: sprites em cache)
  }

  // ------------------------------------------------------------ enfeites do chão
  // Room.generateAberto: arbustos, samambaias, cogumelos, pedras e troncos espalhados (fora do
  // centro, das passagens das bordas e de perto dos obstáculos); não bloqueiam (deco)
  function espalhar(R, r) {
    if (!floresta(R.theme) || typeof PROPS3D === 'undefined' || !PROPS3D.arbusto) return 0;
    const w = R.w, h = R.h, alvo = Math.round(w * h / 52000), out = [];
    let tries = 0;
    while (out.length < alvo && tries++ < 600) {
      const x = 40 + r() * (w - 80), y = 40 + r() * (h - 80);
      if (Math.hypot(x - w / 2, y - h / 2) < 170) continue;
      if ((Math.abs(x - w / 2) < 110 && (y < 170 || y > h - 170)) || (Math.abs(y - h / 2) < 110 && (x < 170 || x > w - 170))) continue;
      if (R.pillars.some((p) => Math.hypot(x - p.x, y - p.y) < p.r + 34) || out.some((p) => Math.hypot(x - p.x, y - p.y) < 46)) continue;
      out.push({ x, y, r: 8, h: 30, broken: true, seed: Math.floor(r() * 1e6), sprite: null, ox: 0, oy: 0, deco: true, enfeite: true });
    }
    R.pillars.push(...out);
    return out.length;
  }

  // ------------------------------------------------------------ vista isométrica: sprites
  const CACHE = new Map(), FILA = new Map();
  let ultimaEscala = 0;
  const chave = (k, scale) => `${k.id}|${k.giro}|${k.esc}|${scale}`;
  function aplica(p, e) { p.sprite = e.canvas; p.ox = e.ox; p.oy = e.oy; p.hw = e.hw; }
  // Room.renderNature: põe o sprite pronto (true) ou pede a foto (false: fica o desenho 2D)
  function sprite(p, th, scale) {
    const k = escolha(p, th);
    if (!k || typeof R3D === 'undefined' || !R3D.active || (typeof game !== 'undefined' && !game.use3D)) return false;
    const c = chave(k, scale), e = CACHE.get(c);
    if (e) { aplica(p, e); return true; }
    // outro zoom: as fotos do zoom anterior saem do cache (os pilares que já as usam continuam com elas)
    if (scale !== ultimaEscala) { for (const [c2, e2] of CACHE) if (e2.scale !== scale) CACHE.delete(c2); ultimaEscala = scale; }
    let L = FILA.get(c);
    if (!L) FILA.set(c, (L = { k, scale, ps: [] }));
    if (!L.ps.includes(p)) L.ps.push(p);
    return false;
  }
  // As texturas do modelo já estão no motor? (pede as que faltam)
  function pronto(m) {
    const tex = m.tex;
    if (!tex) return true;
    const mt = tex.mat ? (tex.matTex || (tex.matTex = typeof tex.mat === 'string' ? { src: tex.mat } : { canvas: tex.mat })) : null;
    const nt = tex.nrm ? (tex.nrmTex || (tex.nrmTex = typeof tex.nrm === 'string' ? { src: tex.nrm } : { canvas: tex.nrm })) : null;
    let ok = true;
    for (const t of [tex, mt, nt]) if (t && R3D.texOf(t) === R3D.blankTex) ok = false;
    return ok;
  }
  // Sprite final na escala da sala, com a sombra no chão
  function compor(f, scale) {
    const s = f.s, W = f.canvas.width / s, H = f.canvas.height / s;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(W * scale)); c.height = Math.max(1, Math.ceil(H * scale));
    const g = c.getContext('2d');
    g.setTransform(scale, 0, 0, scale, 0, 0);
    const ox = -f.minX, oy = -f.minY, hw = W / 2;
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.beginPath(); g.ellipse(ox + 3, oy + 1, Math.min(hw * 0.75, 60), Math.min(hw * 0.32, 26), 0, 0, Math.PI * 2); g.fill();
    g.drawImage(f.canvas, 0, 0, W, H);
    return { canvas: c, ox, oy, hw };
  }
  // Começo do quadro (o motor 3D ainda sem nada na fila): fotografa até 4 pedidos prontos
  function processar() {
    if (!FILA.size || typeof R3D === 'undefined' || !R3D.active || R3D.used) return;
    let feitos = 0;
    for (const [c, L] of FILA) {
      const m = game.model3('cen_' + L.k.id);
      if (!m) { FILA.delete(c); continue; }
      if (!pronto(m)) continue;
      const o = { yaw: L.k.giro * Math.PI * 2 / GIROS, scale: L.k.esc, lift: 0, roll: 0, pitch: 0, flash: 0, emi: 1, holo: false, ghost: null, tint: null };
      const f = R3D.foto(m, o, L.scale);
      if (!f) continue;
      const e = compor(f, L.scale);
      e.scale = L.scale;
      CACHE.set(c, e);
      for (const p of L.ps) aplica(p, e);
      FILA.delete(c);
      if (++feitos >= 4) break;
    }
  }

  // ------------------------------------------------------------ 3ª pessoa
  // Os modelos dos obstáculos com peça do kit (perto do herói; os altos entre a câmera e o herói
  // somem, como os pilares). E: olho da câmera, T: alvo (o herói)
  function fila3P(R, Q, E, T, P) {
    if (!floresta(R.theme)) return;
    const dx = T[0] - E[0], dy = T[1] - E[1], L2 = dx * dx + dy * dy || 1, Lh = Math.sqrt(L2);
    for (const q of R.pillars) {
      const k = escolha(q, R.theme);
      if (!k) continue;
      const d2 = (q.x - P.x) ** 2 + (q.y - P.y) ** 2;
      if (d2 > 1300 * 1300) continue;
      if (((q.x - E[0]) * dx + (q.y - E[1]) * dy) / Lh < -(q.r + 80)) continue;   // atrás da câmera
      if (!q.enfeite && q.h > T[2] * 0.6) {
        const t = Math.max(0, Math.min(1, ((q.x - E[0]) * dx + (q.y - E[1]) * dy) / L2)), px = E[0] + dx * t - q.x, py = E[1] + dy * t - q.y;
        if (t < 0.97 && px * px + py * py < (q.r + 14) * (q.r + 14)) continue;
      }
      if (q.enfeite && d2 > 750 * 750) continue;
      const m = game.model3('cen_' + k.id);
      if (!m) continue;
      let o = q._o3n;
      if (!o) {   // parado: a matriz uma vez e os vértices guardados pelo motor (o.fixo)
        o = q._o3n = { m: M3.make(), fixo: true, flash: 0, emi: 1, holo: false, ghost: null, tint: null, scale: 1, lift: 0, roll: 0, pitch: 0, yaw: 0 };
        M3.trs(o.m, [q.x, q.y, 0], [0, 0, k.giro * Math.PI * 2 / GIROS], [k.esc, k.esc, k.esc]);
      }
      const it = R3D.queue(m, null, null, o);
      it.ent = null;
      Q.push(it);
    }
  }

  return { escolha, espalhar, sprite, processar, fila3P, floresta, CACHE, FILA };
})();
