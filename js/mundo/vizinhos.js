'use strict';
// ECLIPSE ZERO · Território contínuo: as zonas vizinhas visíveis além da borda (Vizinhos)
// ---------------------------------------------------------------------------
// Grandes Regiões (docs/REGIOES_CONTINUAS.md), 1ª etapa. Nas regiões abertas (floresta, lagoa, vulcão,
// deserto, neve, cidade abandonada) o herói já passa de uma zona para a vizinha sem tela de
// carregamento; faltava VER o território continuar. Agora, nas câmeras 3D (3ª pessoa e isométrica 3D),
// além da borda aparece o chão DE VERDADE das zonas vizinhas (as oito em volta): o mesmo piso pintado
// que ela terá ao entrar (a semente da zona é fixa: js/rooms.js), a água pintada, o mesmo relevo
// contínuo (js/mundo/relevo.js: a altura da borda é a mesma dos dois lados) e, na floresta, as
// árvores, arbustos e pedras do kit do Blender nos lugares dela, e as estruturas GLB com a paisagem gerada
// pela semente (árvores grandes, rochas, ruínas: Paisagem.fantasma). No lugar do chão falso que escurecia.
// Coordenadas: a vizinha na direção (dr, dc) ocupa a casa ao lado da zona atual; um ponto dela (x, y)
// fica em (dc·W + x·W/w, dr·H + y·H/h) — W×H a zona atual, w×h a vizinha (as zonas têm tamanhos um
// pouco diferentes: a mesma regra da travessia, que leva a fração da borda de um lado para o outro).
// Streaming: cada vizinha é montada no tempo livre, uma por vez (a sala, o atlas do chão em 1024 e a
// malha); guardadas as últimas oito. Ao entrar na vizinha, a zona de onde se veio vira vizinha sem
// custo (a sala e o atlas já existem). Configurações → Vídeo → Território vizinho visível.
// ---------------------------------------------------------------------------
const Vizinhos = (() => {
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  // distância de visão Longa e Horizonte (js/terceira.js, VISAO): também o segundo anel (a duas casas),
  // com o atlas em 512 e só as estruturas grandes (o horizonte da região)
  const DIRS2 = []; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (Math.max(Math.abs(dr), Math.abs(dc)) === 2) DIRS2.push([dr, dc]);
  const VS = () => (typeof VISAO !== 'undefined' && typeof Settings !== 'undefined' && VISAO[Settings.v.visao]) || { aneis: 1, estr: 2200 };
  const MAX = 26;
  const cache = new Map();   // id da zona → { id, z, G (a sala), campo, modelo, o, pronto }
  let fila = [], ocupado = false, atual = null;
  const ligado = () => typeof Settings === 'undefined' || Settings.v.vizinhos !== false;
  function aberta(z) { return !!(z && z.aberto && !z.instancia && !z.distrito); }
  // as vizinhas da zona (que existem e são campo aberto): [{ z, dr, dc }]
  function de(z) {
    if (!aberta(z) || typeof worldZoneAt !== 'function') return [];
    const L = [];
    for (const [dr, dc] of DIRS) { const v = worldZoneAt(z.r + dr, z.c + dc, z.region); if (aberta(v)) L.push({ z: v, dr, dc, anel: 1 }); }
    if (VS().aneis > 1) for (const [dr, dc] of DIRS2) { const v = worldZoneAt(z.r + dr, z.c + dc, z.region); if (aberta(v)) L.push({ z: v, dr, dc, anel: 2 }); }
    return L;
  }
  // ------------------------------------------------------------ montagem (no tempo livre)
  function guardar(id, E) {
    cache.delete(id); cache.set(id, E);
    while (cache.size > MAX) { const k = cache.keys().next().value; const V = cache.get(k); liberar(V); cache.delete(k); }
  }
  function liberar(V) { if (V && V.modelo && V.modelo.tex && typeof R3D !== 'undefined' && R3D.freeTex) R3D.freeTex(V.modelo.tex); }
  function montar(z, G, anel = 1) {
    const E = cache.get(z.id) || { id: z.id, z };
    E.G = G || E.G || null;
    if (!E.G) { E.G = new Room(0, z); E.G._atlas = anel > 1 ? 512 : 1024; }   // (o segundo anel, mais longe: atlas menor)
    E.campo = typeof Relevo !== 'undefined' && Relevo.campo ? Relevo.campo(z, E.G) : null;
    E.modelo = malha(E);
    // as estruturas dela (GLB: árvores, rochas, ruínas, construções) e a paisagem gerada pela semente
    E.estr = typeof Paisagem !== 'undefined' && Paisagem.fantasma ? Paisagem.fantasma(z, E.G, E.campo) : ((typeof Estruturas !== 'undefined' && Estruturas.ZONAS[z.id]) || []);
    E.o3e = [];
    if (typeof Estruturas !== 'undefined') for (const L of E.estr) if (Estruturas.IDX[L[0]]) Estruturas.carregar(L[0]);
    E.pronto = !!E.modelo;
    guardar(z.id, E);
    return E;
  }
  // o piso da vizinha: a malha da zona dela (sem a margem), com o atlas e a altura do relevo
  function malha(E) {
    const G = E.G, A = typeof Terreno !== 'undefined' ? Terreno.montar(G) : null;
    if (!A || typeof G3 === 'undefined') return null;
    const g = new G3(), m = A.m, L = A.L, Hf = E.campo ? E.campo.bruta : null;
    // as linhas da malha: de 48 em 48 nas beiradas (a rampa) e de 96 em 96 no meio
    const cortes = (Lz) => { const c = [0, 48]; for (let t = 96; t < Lz - 48; t += 96) c.push(t); c.push(Lz - 48, Lz); return c; };
    const CX = cortes(G.w), CY = cortes(G.h);
    const alt = (x, y) => (Hf ? Hf(x, y) : 0), d = 24;
    // um pouco acima da margem da zona atual (que fica por baixo), rente nas beiradas: sem degrau na emenda
    const sobe = (x, y) => 1.5 * Math.min(1, Math.min(x, y, G.w - x, G.h - y) / 48);
    const v = (x, y) => {
      const z = alt(x, y) + sobe(x, y), dx = Hf ? (alt(x + d, y) - alt(x - d, y)) / (2 * d) : 0, dy = Hf ? (alt(x, y + d) - alt(x, y - d)) / (2 * d) : 0, l = Math.hypot(dx, dy, 1);
      return [x, y, z, -dx / l, -dy / l, 1 / l, (x + m) / L, (y + m) / L, 0, 0];
    };
    for (let i = 0; i < CX.length - 1; i++) for (let j = 0; j < CY.length - 1; j++) {
      const xa = CX[i], xb = CX[i + 1], ya = CY[j], yb = CY[j + 1];
      const a = v(xa, ya), b = v(xb, ya), c = v(xb, yb), e = v(xa, yb);
      for (const q of [a, b, c, a, c, e]) g.d.push(...q);
    }
    const model = new Model3(new N3('vizinha', g));
    model.tex = { canvas: A.cor, mat: A.mat, emis: A.emi || undefined, det: A.det, detP: A.detP, pbr: true, bump: 1.6 };
    model.terreno = true; model.semSombra = true;   // (recebe a sombra das árvores, mas não projeta: a emenda com a margem da zona atual ficava riscada)
    return model;
  }
  function passo() {
    ocupado = false;
    const q = fila.shift();
    if (!q) return;
    const z = q.z;
    if (!(cache.get(z.id) || {}).pronto) { try { montar(z, null, q.anel); } catch (e) { if (typeof console !== 'undefined') console.warn('Vizinhos:', z.id, e.message); } }
    agendar();
  }
  function agendar() {
    if (ocupado || !fila.length) return;
    ocupado = true;
    if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(passo, { timeout: 900 }); else setTimeout(passo, 40);
  }
  // ------------------------------------------------------------ zona
  // Na carga da zona: a sala de onde se veio vira vizinha (já montada), e as outras entram na fila
  function aoCarregar(z, anterior) {
    fila = []; atual = null;
    if (!ligado() || !aberta(z) || typeof game === 'undefined' || !game.room) return 0;
    atual = { z, R: game.room, L: de(z) };
    if (anterior && aberta(anterior.def) && atual.L.some((q) => q.z.id === anterior.def.id)) { try { montar(anterior.def, anterior); } catch (e) { /* monta de novo depois */ } }
    for (const q of atual.L.slice().sort((a, b) => a.anel - b.anel)) if (!(cache.get(q.z.id) || {}).pronto) fila.push(q);
    agendar();
    return atual.L.length;
  }
  // a transformação da vizinha (dr, dc) para as coordenadas da zona atual
  function xf(R, q, V) { const sx = R.w / V.G.w, sy = R.h / V.G.h; return { ox: q.dc * R.w, oy: q.dr * R.h, sx, sy }; }
  // o ponto (x, y) da zona atual está numa vizinha já mostrada? (a mata falsa da margem sai de cima dela)
  function cobre(R, x, y) {
    if (!atual || atual.R !== R) return false;
    const dc = x < 0 ? -1 : x > R.w ? 1 : 0, dr = y < 0 ? -1 : y > R.h ? 1 : 0;
    if (!dc && !dr) return false;
    const q = atual.L.find((k) => k.anel === 1 && k.dr === dr && k.dc === dc);
    return !!(q && (cache.get(q.z.id) || {}).pronto);
  }
  // ------------------------------------------------------------ 3ª pessoa e isométrica 3D
  function fila3P(R, Q, P) {
    if (!atual || atual.R !== R || !ligado()) return 0;
    let n = 0;
    for (const q of atual.L) {
      const V = cache.get(q.z.id);
      if (!V || !V.pronto) continue;
      const T = xf(R, q, V);
      V.o = V.o || { m: M3.make(), emi: 1 };
      M3.trs(V.o.m, [T.ox, T.oy, 0], [0, 0, 0], [T.sx, T.sy, 1]);
      const it = R3D.queue(V.modelo, null, null, V.o); it.ent = null; Q.push(it); n++;
      // as estruturas da vizinha (GLB), perto do herói
      if (V.estr && typeof Estruturas !== 'undefined') {
        V.estr.forEach((L, k) => {
          const I = Estruturas.IDX[L[0]];
          if (!I) return;
          const esc = L[4] || 1, x = T.ox + L[1] * V.G.w * T.sx, y = T.oy + L[2] * V.G.h * T.sy;
          if ((x - P.x) ** 2 + (y - P.y) ** 2 > VS().estr * VS().estr) return;
          if (q.anel > 1 && I.r * esc < 55) return;   // (a duas casas: só o que se vê de longe)
          const mm = typeof PROPS3D !== 'undefined' && PROPS3D[L[0]] ? game.model3('cen_' + L[0]) : null;
          if (!mm) return;
          let o = V.o3e[k];
          if (!o || o._ox !== T.ox || o._oy !== T.oy) {
            const pe = (I.tipo === 'arvore' || I.tipo === 'planta'), lx = L[1] * V.G.w, ly = L[2] * V.G.h;
            o = V.o3e[k] = { m: M3.make(), fixo: true, flash: 0, emi: 1, holo: false, ghost: null, tint: null, scale: 1, lift: 0, roll: 0, pitch: 0, yaw: 0, raio: I.r * esc * 3 + 80, vento: I.tipo === 'arvore' ? 0.6 : I.tipo === 'planta' ? 1 : 0, _ox: T.ox, _oy: T.oy };
            M3.trs(o.m, [x, y, (V.campo ? V.campo.bruta(lx, ly) : 0) - (pe ? 4 : 0)], [0, 0, L[3] || 0], [esc, esc, esc]);
          }
          const it3 = R3D.queue(mm, null, null, o); it3.ent = null; Q.push(it3); n++;
        });
      }
      // a mata da vizinha (kit do Blender da floresta): árvores, arbustos e pedras nos lugares dela, perto do herói
      if (q.anel === 1 && typeof Natureza3D !== 'undefined' && Natureza3D.floresta(V.G.theme)) {
        for (const p of V.G.pillars) {
          const k = Natureza3D.escolha(p, V.G.theme);
          if (!k) continue;
          const x = T.ox + p.x * T.sx, y = T.oy + p.y * T.sy;
          if ((x - P.x) ** 2 + (y - P.y) ** 2 > 1500 * 1500 || (p.enfeite && (x - P.x) ** 2 + (y - P.y) ** 2 > 800 * 800)) continue;
          const mm = game.model3('cen_' + k.id);
          if (!mm) continue;
          let o = p._o3v;
          if (!o || o._ox !== T.ox || o._oy !== T.oy) {
            o = p._o3v = { m: M3.make(), fixo: true, flash: 0, emi: 1, holo: false, ghost: null, tint: null, scale: 1, lift: 0, roll: 0, pitch: 0, yaw: 0, vento: /rocha|pedra|toco|tronco|cogumelo/.test(k.id) ? 0 : p.enfeite ? 1.3 : 0.7, _ox: T.ox, _oy: T.oy };
            M3.trs(o.m, [x, y, (V.campo ? V.campo.bruta(p.x, p.y) : 0)], [0, 0, k.giro * Math.PI * 2 / 4], [k.esc, k.esc, k.esc]);
          }
          const it2 = R3D.queue(mm, null, null, o); it2.ent = null; Q.push(it2); n++;
        }
      }
    }
    return n;
  }
  function estado() {
    return { ligado: ligado(), zona: atual ? atual.z.id : null, vizinhas: atual ? atual.L.map((q) => q.z.id) : [], prontas: atual ? atual.L.filter((q) => (cache.get(q.z.id) || {}).pronto).length : 0, fila: fila.length, cache: cache.size };
  }
  // para os testes: monta agora (sem esperar o tempo livre)
  function montarJa() { while (fila.length) { const q = fila.shift(); if (!(cache.get(q.z.id) || {}).pronto) montar(q.z, null, q.anel); } }
  // a zona já está montada e à vista (a travessia quase não precisa disfarçar a troca)
  const pronta = (id) => !!(atual && ligado() && atual.L.some((q) => q.z.id === id) && (cache.get(id) || {}).pronto);
  return { de, pronta, aoCarregar, fila3P, cobre, estado, montarJa, xf, cache };
})();
if (typeof window !== 'undefined') window.Vizinhos = Vizinhos;
