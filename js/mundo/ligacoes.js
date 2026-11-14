'use strict';
// ECLIPSE ZERO · Estradas entre as regiões: o mundo se liga andando, sem portal (Ligacoes)
// ---------------------------------------------------------------------------
// Grandes Regiões (docs/REGIOES_CONTINUAS.md). As regiões vizinhas no Mapa do Mundo se ligam pela borda:
// na beira certa de uma zona da fronteira, o herói segue andando para a região ao lado (no campo aberto,
// por qualquer ponto daquela borda; nas zonas de cidade, pela passagem no meio da parede). Como pede o
// projeto, a troca de REGIÃO tem uma tela curta de carregamento (salva, carrega a outra região e põe o
// herói na borda de lá, no mesmo ponto); dentro da região, nada disso: as zonas se emendam.
// Região ainda fechada (nível ou chefe): a estrada mostra o cadeado e o herói não passa.
// Os portais continuam como viagem rápida, mas não são mais o único caminho.
// ---------------------------------------------------------------------------
const Ligacoes = (() => {
  // [região A, linha, coluna, lado] ↔ [região B, linha, coluna, lado], nome da estrada (pela geografia do Mapa do Mundo)
  const LISTA = [
    [['velmora', 3, 4, 'E'], ['carmesin', 0, 0, 'W'], 'Estrada da Floresta'],
    [['velmora', 0, 4, 'E'], ['asterion', 0, 0, 'W'], 'Trilha da Serra'],
    [['velmora', 4, 0, 'W'], ['ruinas', 0, 2, 'E'], 'Caminho da Capital Caída'],
    [['velmora', 4, 2, 'S'], ['seraph', 0, 1, 'N'], 'Estrada das Areias'],
    [['carmesin', 1, 2, 'E'], ['lagoa', 1, 0, 'W'], 'Ponte dos Canais'],
    [['carmesin', 2, 1, 'S'], ['obsidiano', 0, 1, 'N'], 'Descida da Cratera'],
    [['carmesin', 0, 2, 'N'], ['nexus', 1, 0, 'S'], 'Viaduto de Nexus'],
    [['lagoa', 0, 2, 'E'], ['metropole', 1, 0, 'W'], 'Túnel da Metrópole'],
    [['lagoa', 1, 1, 'S'], ['cidademorta', 0, 1, 'N'], 'Estrada Abandonada'],
    [['nexus', 0, 2, 'E'], ['nexuszero', 1, 0, 'W'], 'Corredor do Núcleo'],
    [['asterion', 0, 2, 'E'], ['nexus', 0, 0, 'W'], 'Passo do Norte'],
    [['seraph', 1, 2, 'E'], ['obsidiano', 1, 0, 'W'], 'Rota das Cinzas'],
    [['obsidiano', 1, 2, 'E'], ['cidademorta', 1, 0, 'W'], 'Estrada da Fumaça'],
  ];
  let mapa = null;   // "zona:lado" → { z (a zona do outro lado), lado de lá, nome }
  function montar() {
    mapa = {};
    if (typeof worldZoneAt !== 'function') return mapa;
    for (const [[ra, la, ca, da], [rb, lb, cb, db], nome] of LISTA) {
      const A = worldZoneAt(la, ca, ra), B = worldZoneAt(lb, cb, rb);
      if (!A || !B) continue;
      const ocupado = (Z, d) => !!worldZoneAt(Z.r + WORLD_DIRS[d][0], Z.c + WORLD_DIRS[d][1], Z.region);   // (o lado tem vizinha na região: não serve de estrada)
      if (ocupado(A, da) || ocupado(B, db)) continue;
      mapa[`${A.id}:${da}`] = { z: B, lado: db, nome };
      mapa[`${B.id}:${db}`] = { z: A, lado: da, nome };
    }
    return mapa;
  }
  // a zona do outro lado da borda 'dir' da zona z (outra região), ou null
  function alem(z, dir) { if (!mapa) montar(); const L = z && mapa[`${z.id}:${dir}`]; return L ? L.z : null; }
  function estrada(z, dir) { if (!mapa) montar(); return (z && mapa[`${z.id}:${dir}`]) || null; }
  // as estradas que saem de uma zona: [{ dir, z, nome }]
  function saidas(z) { if (!mapa) montar(); const o = []; for (const d of ['N', 'S', 'W', 'E']) { const L = mapa[`${z.id}:${d}`]; if (L) o.push({ dir: d, z: L.z, nome: L.nome }); } return o; }
  const aberta = (z) => typeof World === 'undefined' || !World.regionOpen || World.regionOpen(z.region);
  // Atravessar para a outra região: tela curta de carregamento (salva, carrega, põe o herói na borda de lá)
  function viajar(z, dir, along) {
    if (!aberta(z)) { trancada(z); return false; }
    const W = World, R = worldRegion(z.region), L = estrada(W.zone, dir);
    W.save();
    game.audio.play('uiSelect');
    Ligacoes.carregando = { regiao: R.name, estrada: L ? L.nome : '', t: 0 };
    game.fadeTo(() => {
      W.loadZone(z.id, dir, along);
      game.fadeTarget = 0;
      setTimeout(() => { Ligacoes.carregando = null; }, 450);
      game.hud.message(R.name.toUpperCase(), `${L ? L.nome.toUpperCase() + ' · ' : ''}${R.biome.toUpperCase()} · NÍVEL ${R.lv[0]}–${R.lv[1]}`, 2.6);
    });
    return true;
  }
  let avisoT = 0;
  function trancada(z) {
    const p = game.player, R = worldRegion(z.region);
    if (p) { p.vx *= -0.5; p.vy *= -0.5; p.x = clamp(p.x, 60, game.room.w - 60); p.y = clamp(p.y, 60, game.room.h - 60); }
    const agora = game.realTime || 0;
    if (agora - avisoT > 2) { avisoT = agora; game.hud.toast(`🔒 ${R.name}: a estrada está fechada · nível ${R.minLv || R.lv[0]} ou o chefe da região anterior`, '255,190,110'); game.audio.play('uiMove'); }
  }
  // a tela de carregamento entre regiões (por cima do escurecer)
  function desenhar(ctx) {
    const C = Ligacoes.carregando;
    if (!C || !(game.fade > 0.6)) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (game.fade - 0.6) / 0.3);
    ctx.textAlign = 'center'; ctx.fillStyle = '#e8eef6';
    ctx.font = `bold 30px ${typeof FONT_TITLE !== 'undefined' ? FONT_TITLE : 'sans-serif'}`; ctx.fillText(C.regiao.toUpperCase(), VIEW_W / 2, VIEW_H / 2 - 6);
    ctx.font = `13px ${typeof FONT_UI !== 'undefined' ? FONT_UI : 'sans-serif'}`; ctx.fillStyle = 'rgba(200,215,230,0.85)';
    ctx.fillText(`${C.estrada ? C.estrada + ' · ' : ''}carregando a região…`, VIEW_W / 2, VIEW_H / 2 + 24);
    ctx.restore();
  }
  return { LISTA, montar, alem, estrada, saidas, aberta, viajar, trancada, desenhar, carregando: null };
})();
if (typeof window !== 'undefined') window.Ligacoes = Ligacoes;
