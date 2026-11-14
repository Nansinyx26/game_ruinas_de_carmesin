'use strict';
// ECLIPSE ZERO · Mapa da Região: o território contínuo, como uma carta (MapaRegiao)
// ---------------------------------------------------------------------------
// Grandes Regiões (docs/REGIOES_CONTINUAS.md). No lugar da grade de "casinhas" do Mapa do Mundo, a
// região aberta onde o herói está aparece como UM território: o chão pintado de cada zona (o mesmo do
// jogo: js/terreno.js, com os rios e lagos) emendado com o das vizinhas, as trilhas, os vilarejos, as
// ruínas e o forte com nome, o portal, as entradas de masmorra, os baús ainda fechados, os grupos de
// inimigos e o chefe, e o herói com a direção. O que ainda não foi descoberto fica sob névoa.
// M abre (nas regiões abertas, direto aqui); R alterna com o Mapa do Mundo; Q/E aproximam; o mouse
// (arrastar) e as setas movem a carta; Esc ou M fecham.
// Miniaturas: a zona atual e as vizinhas já montadas (js/mundo/vizinhos.js) usam o atlas que já existe;
// as outras são pintadas num atlas pequeno (256 px), uma por quadro, enquanto a carta está aberta.
// ---------------------------------------------------------------------------
const MapaRegiao = (() => {
  const minis = new Map();   // id da zona → canvas (só o miolo da zona, sem a margem)
  let fila = [], zoom = 1, pan = [0, 0], arrasto = null;
  const ICONE = { vila: '⌂', ruina: '♜', forte: '♜', lago: '≈', rio: '≈' };
  // a região tem território (zonas abertas): as regiões de cidade ainda usam o Mapa do Mundo
  function pode(W) { const z = W && W.zone; if (!z || z.instancia || z.distrito || z.cidade) return false; const zs = worldZonesOf(z.region); return zs.length > 0 && zs.filter((q) => q.aberto).length >= zs.length * 0.6; }
  function zonas(reg) { return worldZonesOf(reg); }
  // ------------------------------------------------------------ miniaturas
  function recorte(A, R) {
    const c = document.createElement('canvas'), N = 192;
    c.width = N; c.height = N;
    const g = c.getContext('2d'), k = A.cor.width / A.L;
    g.drawImage(A.cor, A.m * k, A.m * k, R.w * k, R.h * k, 0, 0, N, N);
    if (A.som) { g.globalCompositeOperation = 'soft-light'; g.drawImage(A.som, A.m * (A.som.width / A.L), A.m * (A.som.width / A.L), R.w * (A.som.width / A.L), R.h * (A.som.width / A.L), 0, 0, N, N); }
    return c;
  }
  function mini(z) {
    if (minis.has(z.id)) return minis.get(z.id);
    const R = typeof game !== 'undefined' && game.room && game.room.def === z ? game.room : (typeof Vizinhos !== 'undefined' && Vizinhos.cache.get(z.id) ? Vizinhos.cache.get(z.id).G : null);
    const A = R && R._terreno;
    if (A) { const c = recorte(A, R); minis.set(z.id, c); return c; }
    if (!fila.includes(z)) fila.push(z);
    return null;
  }
  function passo() {
    const z = fila.shift();
    if (!z || minis.has(z.id) || typeof Terreno === 'undefined') return;
    try { const G = new Room(0, z); G._atlas = 256; const A = Terreno.montar(G); if (A) minis.set(z.id, recorte(A, G)); else minis.set(z.id, null); } catch (e) { minis.set(z.id, null); }
  }
  // ------------------------------------------------------------ controles (World.updateMap)
  function atualizar(dt, inp) {
    if (fila.length) passo();   // uma miniatura por quadro
    if (inp.pressed.tabPrev) zoom = clamp(zoom / 1.25, 0.6, 4);
    if (inp.pressed.tabNext) zoom = clamp(zoom * 1.25, 0.6, 4);
    const v = 420 * dt / zoom;
    if (inp.held.left) pan[0] += v; if (inp.held.right) pan[0] -= v; if (inp.held.up) pan[1] += v; if (inp.held.down) pan[1] -= v;
    const m = inp.mouse;
    if (m && m.down) { if (arrasto) { pan[0] += m.x - arrasto[0]; pan[1] += m.y - arrasto[1]; } arrasto = [m.x, m.y]; } else arrasto = null;
  }
  function abrir() { zoom = 1; pan = [0, 0]; }
  // ------------------------------------------------------------ desenho
  function layout(reg) {
    const zs = zonas(reg), nr = Math.max(...zs.map((z) => z.r)) + 1, nc = Math.max(...zs.map((z) => z.c)) + 1;
    const AW = VIEW_W - 80, AH = VIEW_H - 170, cel = Math.min(AW / nc, AH / nr) * zoom;
    const x0 = VIEW_W / 2 - (nc * cel) / 2 + pan[0], y0 = 86 + AH / 2 - (nr * cel) / 2 + pan[1];
    return { zs, nr, nc, cel, x0, y0, pos: (z, fx, fy) => ({ x: x0 + (z.c + fx) * cel, y: y0 + (z.r + fy) * cel }) };
  }
  function desenhar(ctx, t, W) {
    const z0 = W.zone, reg = worldRegion(z0.region), S = W.state, L = layout(z0.region), cel = L.cel;
    ctx.save();
    ctx.fillStyle = '#05080e'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // o território: miniaturas emendadas
    ctx.save();
    ctx.beginPath(); ctx.rect(20, 70, VIEW_W - 40, VIEW_H - 130); ctx.clip();
    for (const z of L.zs) {
      const p = L.pos(z, 0, 0), vis = S.descobertos.includes(z.id) || (typeof Vizinhos !== 'undefined' && Vizinhos.estado().vizinhas.includes(z.id));
      const c = mini(z);
      if (c) ctx.drawImage(c, p.x, p.y, cel + 0.6, cel + 0.6);
      else { ctx.fillStyle = '#1d2a1a'; ctx.fillRect(p.x, p.y, cel + 0.6, cel + 0.6); }
      if (!vis) { ctx.fillStyle = 'rgba(6,9,14,0.78)'; ctx.fillRect(p.x, p.y, cel + 0.6, cel + 0.6); ctx.fillStyle = 'rgba(160,180,200,0.35)'; ctx.font = `bold ${Math.round(cel * 0.18)}px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillText('?', p.x + cel / 2, p.y + cel / 2 + cel * 0.06); }
    }
    // trilhas (das zonas já visitadas: a rede de caminhos da paisagem)
    ctx.strokeStyle = 'rgba(232,214,170,0.55)'; ctx.lineWidth = Math.max(1, cel * 0.012); ctx.setLineDash([cel * 0.03, cel * 0.02]);
    for (const z of L.zs) {
      const G = typeof Paisagem !== 'undefined' && Paisagem._cache[z.id];
      if (!G || !G.rotas) continue;
      const Rz = { w: z.tiles * TILE, h: z.tiles * TILE };
      for (const r of G.rotas) { ctx.beginPath(); r.pts.forEach((q, i) => { const P = L.pos(z, q[0] / Rz.w, q[1] / Rz.h); if (i) ctx.lineTo(P.x, P.y); else ctx.moveTo(P.x, P.y); }); ctx.stroke(); }
    }
    ctx.setLineDash([]);
    // construções e árvores (a lista da zona: js/mundo/estruturas.js; a paisagem gerada entra depois da 1ª visita):
    // a planta de cada prédio no tamanho e no giro de verdade, as árvores como copas
    if (typeof Estruturas !== 'undefined') for (const z of L.zs) {
      if (!S.descobertos.includes(z.id)) continue;
      const Rz = z.tiles * TILE, k = cel / Rz;
      for (const E of Estruturas.ZONAS[z.id] || []) {
        const I = Estruturas.IDX[E[0]];
        if (!I) continue;
        const esc = E[4] || 1, P = L.pos(z, E[1], E[2]);
        if (I.tipo === 'arvore') { ctx.fillStyle = 'rgba(18,44,16,0.55)'; ctx.beginPath(); ctx.arc(P.x, P.y, Math.max(1.2, I.r * esc * k * 0.9), 0, Math.PI * 2); ctx.fill(); continue; }
        if (I.tipo === 'planta') continue;
        const w = Math.max(2, I.w * esc * k), d = Math.max(2, I.d * esc * k);
        ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(E[3] || 0);
        ctx.fillStyle = I.tipo === 'item' ? 'rgba(150,130,100,0.8)' : 'rgba(176,150,112,0.92)'; ctx.strokeStyle = 'rgba(40,30,20,0.85)'; ctx.lineWidth = 1;
        ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d);
        ctx.restore();
      }
    }
    // marcadores: chefe, grupos de inimigos, baús fechados, portal, masmorras, vilarejos e lugares com nome
    const fs = Math.max(9, Math.min(15, cel * 0.07));
    const marca = (P, txt, cor, tam = fs) => { ctx.font = `bold ${tam}px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(txt, P.x, P.y); ctx.fillStyle = cor; ctx.fillText(txt, P.x, P.y); };
    for (const z of L.zs) {
      const vis = S.descobertos.includes(z.id);
      if (!vis) continue;
      for (const c of z.camps || []) { const P = L.pos(z, c.at[0], c.at[1]); if (c.boss) { if (!W.bossDone(z.region)) marca(P, '☠', '#ff5a6a', fs * 1.8); } else { ctx.fillStyle = 'rgba(255,90,90,0.8)'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(P.x, P.y, Math.max(2, fs * 0.22), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } }
      (z.chests || []).forEach((c, k) => { if (!S.baus.includes(`${z.id}:${k}`)) marca(L.pos(z, c.at[0], c.at[1]), '✦', '#ffd36a'); });
      if (z.portal) marca(L.pos(z, 0.5, 0.5), '◈', '#b98cff', fs * 1.4);
      if (typeof WORLD_MASMORRAS !== 'undefined') for (const k in WORLD_MASMORRAS) { const M = WORLD_MASMORRAS[k]; if (M.zona === z.id && M.at && !(M.oculta && !(S.masmorras || {})[k])) marca(L.pos(z, M.at[0], M.at[1]), '▼', '#b98cff', fs * 1.2); }
    }
    // nomes dos lugares (todas as zonas descobertas; vilarejos, ruínas e forte com ícone)
    for (const z of L.zs) {
      if (!S.descobertos.includes(z.id)) continue;
      const P = L.pos(z, 0.5, z.portal ? 0.36 : 0.5), ic = ICONE[z.territorio] || (z.vila ? '⌂' : z.hub ? '⌂' : '');
      marca(P, `${ic ? ic + ' ' : ''}${cel < 140 ? z.name : z.name.toUpperCase()}`, z.vila || z.territorio === 'vila' ? '#ffe7b0' : z.territorio === 'forte' || z.territorio === 'ruina' ? '#e0d2ff' : 'rgba(235,240,245,0.92)', Math.max(9, Math.min(13, cel * 0.085)));
      if (z.lv) marca({ x: P.x, y: P.y + fs * 1.05 }, `nv ${z.lv}`, 'rgba(200,210,220,0.7)', Math.max(8, fs * 0.62));
    }
    // o herói
    const p = game.player, Rr = game.room;
    if (p && Rr) {
      const P = L.pos(z0, p.x / Rr.w, p.y / Rr.h), f = p.facing || 0, a = 0.75 + 0.25 * Math.sin(t * 5);
      ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(f);
      ctx.fillStyle = `rgba(120,230,255,${a})`; ctx.strokeStyle = '#04121a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(fs * 0.9, 0); ctx.lineTo(-fs * 0.55, fs * 0.55); ctx.lineTo(-fs * 0.25, 0); ctx.lineTo(-fs * 0.55, -fs * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // moldura, título, escala e legenda
    ctx.strokeStyle = 'rgba(140,170,200,0.4)'; ctx.lineWidth = 1.5; ctx.strokeRect(20.5, 70.5, VIEW_W - 41, VIEW_H - 131);
    ctx.textAlign = 'left'; ctx.fillStyle = '#e8eef6'; ctx.font = `bold 22px ${FONT_UI}`; ctx.fillText(`MAPA DA REGIÃO · ${reg.name.toUpperCase()}`, 40, 46);
    const zs = L.zs, desc = zs.filter((z) => S.descobertos.includes(z.id)).length, km = (zs.reduce((s, z) => s + (z.tiles * TILE / 34) ** 2, 0) / 1e4).toFixed(1);
    ctx.textAlign = 'right'; ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(210,220,230,0.85)';
    ctx.fillText(`${zs.length} lugares (${desc} descobertos) · ${km} hectares de território contínuo`, VIEW_W - 40, 46);
    const m100 = 100 * 34 / (z0.tiles * TILE) * cel;   // 100 m na escala da carta
    ctx.strokeStyle = '#dfe6ee'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, VIEW_H - 78); ctx.lineTo(40 + m100, VIEW_H - 78); ctx.moveTo(40, VIEW_H - 83); ctx.lineTo(40, VIEW_H - 73); ctx.moveTo(40 + m100, VIEW_H - 83); ctx.lineTo(40 + m100, VIEW_H - 73); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#dfe6ee'; ctx.font = `11px ${FONT_UI}`; ctx.fillText('100 m', 46 + m100, VIEW_H - 74);
    ctx.fillStyle = 'rgba(205,215,225,0.85)'; ctx.font = `12px ${FONT_UI}`;
    ctx.fillText('➤ você · ⌂ vilarejo · ♜ ruína / forte · ▭ construção · ● árvore · ◈ portal · ▼ masmorra · ✦ baú · • inimigos · ☠ chefe · ? não descoberto', 40, VIEW_H - 30);
    ctx.textAlign = 'right'; ctx.fillText('R: mapa do mundo · Q/E zoom · setas ou arrastar: mover · Esc fechar', VIEW_W - 40, VIEW_H - 30);
    ctx.restore();
  }
  // centrar a carta num lugar com zoom (capturas, testes): fx, fy em frações do território
  function centrar(reg, fx, fy, z) { zoom = z; pan = [0, 0]; const L = layout(reg); pan = [VIEW_W / 2 - (L.x0 + fx * L.nc * L.cel), 86 + (VIEW_H - 170) / 2 - (L.y0 + fy * L.nr * L.cel)]; }
  return { centrar, pode, abrir, atualizar, desenhar, mini, minis, estado: () => ({ miniaturas: minis.size, fila: fila.length, zoom }) };
})();
if (typeof window !== 'undefined') window.MapaRegiao = MapaRegiao;
