'use strict';
// ECLIPSE ZERO · Mundo aberto: baús de tesouro por raridade (Baus)
// ---------------------------------------------------------------------------
// Os cinco baús enviados (assets/baús/*.glb) no mundo: cada raridade usa o SEU modelo (a cor do
// metal de cada arquivo decide: cinza = comum, verde = incomum, azul = raro, roxo = épico,
// dourado = lendário). Os GLB vieram como malha única e sem animação: tools/blender/cenario/baus.py
// separa a tampa do corpo e põe a dobradiça na origem dela, e aqui a tampa gira de verdade em volta
// da dobradiça para abrir (o modelo não é deformado).
// - Onde aparecem: em cada zona do mundo, em lugares escondidos (cantos, atrás de pedras, árvores e
//   prédios, longe das passagens), sorteados com a semente da zona; a raridade sai da faixa de nível
//   da zona (1–25, 25–50, 50–75, 75–100): quanto mais avançada, mais chance de baú raro.
// - Abrir ([E] de perto): confere distância e disponibilidade, a tampa abre, toca o som e os
//   efeitos da raridade, as recompensas são sorteadas (tabelas abaixo) e GRAVADAS no salvamento
//   antes de aparecerem; a janela mostra cada item e o botão COLETAR entrega. O que não couber fica
//   guardado no baú (nada se perde) até ser coletado.
// - Reaparecimento: cada raridade tem o seu tempo (relógio real, conta com o jogo fechado) e o seu
//   modo: individual (o estado fica no salvamento do personagem) ou mundial (o mesmo baú para todos
//   os personagens deste aparelho).
// - Os baús fixos das zonas, dos segredos e das masmorras (js/world.js, js/mundo/locais.js) ganham o
//   mesmo modelo em 3D (a raridade pela importância), com a regra de sempre (abrem uma vez).
// - Configuração (painel do GM, js/mundo/gm.js): ligar/desligar raridades, tempos, modo, quantidade
//   por zona, forçar o reaparecimento e baús de evento. Guardada em localStorage.
// O jogo roda inteiro no navegador (não há servidor): a "validação do servidor" pedida fica nesta
// camada de regras, separada da tela, e o estado no salvamento; um servidor de verdade trocaria
// só Baus.reg() e Baus.gravar().
// ---------------------------------------------------------------------------
const BAU_RAR = [
  { id: 'comum', nome: 'Baú Comum', rgb: '226,232,244', respawn: 15 * 60, modo: 'individual' },
  { id: 'incomum', nome: 'Baú Incomum', rgb: '90,220,120', respawn: 40 * 60, modo: 'individual' },
  { id: 'raro', nome: 'Baú Raro', rgb: '80,160,255', respawn: 2 * 3600, modo: 'individual' },
  { id: 'epico', nome: 'Baú Épico', rgb: '190,110,255', respawn: 6 * 3600, modo: 'individual' },
  { id: 'lendario', nome: 'Baú Lendário', rgb: '255,190,60', respawn: 24 * 3600, modo: 'mundial' },
];
// Peso de cada raridade pela faixa de nível da zona (até o nível, [comum, incomum, raro, épico, lendário])
const BAU_FAIXAS = [[25, [62, 28, 9, 1, 0]], [50, [42, 32, 19, 6, 1]], [75, [26, 30, 27, 13, 4]], [999, [15, 25, 30, 20, 10]]];
// Recompensas por raridade: células (× nível), chance de relíquia e de peça de armadura (e a
// raridade delas), materiais [lista, quantidade mínima, máxima] e consumíveis
const BAU_SAQUE = [
  { cel: 1, xp: 3, reliquia: [0.35, 0, 0], peca: [0.12, 0, 0], mats: [[['sucata', 'ferro', 'tecido', 'couro', 'regional'], 1, 2]], cons: [0.35, 1, ['capsula', 'cha', 'refresco']] },
  { cel: 1.8, xp: 5, reliquia: [0.55, 0, 1], peca: [0.22, 0, 1], mats: [[['ferro', 'tecido', 'couro', 'regional'], 2, 3], [['cristal', 'fragmento', 'gelo', 'engrenagem'], 1, 1]], cons: [0.6, 1, ['capsula', 'elixir', 'cha', 'refresco']] },
  { cel: 3, xp: 8, reliquia: [0.85, 1, 2], peca: [0.4, 1, 2], mats: [[['regional', 'engrenagem', 'cristal', 'fragmento', 'gelo'], 2, 4], [['obsidiana', 'circuito', 'amostra'], 1, 1]], cons: [1, 1, ['capsula', 'elixir', 'tonico', 'pele']] },
  { cel: 5, xp: 13, reliquia: [1, 2, 3], peca: [0.65, 2, 3], mats: [[['circuito', 'obsidiana', 'amostra'], 2, 3], [['nucleo'], 1, 2]], cons: [1, 2, ['capsula', 'elixir', 'tonico', 'pele', 'fogueira']] },
  { cel: 9, xp: 22, reliquia: [1, 4, 4], peca: [1, 3, 4], mats: [[['nucleo'], 2, 3], [['essencia'], 1, 2], [['circuito', 'amostra'], 2, 3]], cons: [1, 3, ['capsula', 'elixir', 'tonico', 'pele', 'retorno']], mitico: 0.06 },
];

const Baus = {
  CHAVE_CFG: 'ez_baus_cfg', CHAVE_MUNDO: 'ez_baus_mundo',
  ALCANCE: 96,          // distância máxima para abrir
  ui: { t: 0, itens: [], prop: null, rects: [], msg: '', msgT: 0 },
  _cfg: null, _mundo: null,

  // ------------------------------------------------------------------ configuração (painel do GM)
  padrao() { return { ligado: [true, true, true, true, true], respawn: BAU_RAR.map((r) => r.respawn), modo: BAU_RAR.map((r) => r.modo), porZona: 2, evento: null }; },
  cfg() {
    if (this._cfg) return this._cfg;
    const c = this.padrao();
    try { const s = JSON.parse(localStorage.getItem(this.CHAVE_CFG) || 'null'); if (s) for (const k in c) if (s[k] !== undefined) c[k] = s[k]; } catch (e) { /* sem armazenamento: o padrão */ }
    for (let i = 0; i < 5; i++) { c.respawn[i] = clamp(+c.respawn[i] || BAU_RAR[i].respawn, 30, 7 * 86400); if (c.modo[i] !== 'mundial') c.modo[i] = 'individual'; }
    c.porZona = clamp(Math.round(+c.porZona || 2), 0, 5);
    return (this._cfg = c);
  },
  gravarCfg() { try { localStorage.setItem(this.CHAVE_CFG, JSON.stringify(this.cfg())); } catch (e) { /* segue na memória */ } },
  // ------------------------------------------------------------------ estado (o "banco" dos baús)
  mundo() {
    if (this._mundo) return this._mundo;
    let m = {};
    try { m = JSON.parse(localStorage.getItem(this.CHAVE_MUNDO) || '{}') || {}; } catch (e) { m = {}; }
    return (this._mundo = m);
  },
  pessoal() { const W = World.state; return W.bausR || (W.bausR = {}); },
  // registro do baú: { t: instante da abertura (ms), c: ciclo (quantas vezes abriu), pend: recompensas por coletar }
  reg(key, r, criar = false) {
    const T = this.cfg().modo[r] === 'mundial' ? this.mundo() : this.pessoal();
    if (!T[key] && criar) T[key] = { t: 0, c: 0, pend: null };
    return T[key] || null;
  },
  gravar() {
    try { localStorage.setItem(this.CHAVE_MUNDO, JSON.stringify(this.mundo())); } catch (e) { /* segue na memória */ }
    if (typeof World !== 'undefined' && World.save) World.save();
  },
  agora() { return Date.now(); },
  // segundos que faltam para reaparecer (0: disponível)
  falta(key, r) {
    const st = this.reg(key, r);
    if (!st || !st.t) return 0;
    return Math.max(0, this.cfg().respawn[r] - (this.agora() - st.t) / 1000);
  },
  pendente(key, r) { const st = this.reg(key, r); return !!(st && st.pend && st.pend.length); },

  // ------------------------------------------------------------------ sorteios com semente
  hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
  // raridade do baú k da zona no ciclo c (muda a cada reaparecimento)
  raridade(z, k, c, min = 0) {
    const C = this.cfg(), rnd = mulberry32((this.hash(z.id) + k * 7919 + c * 104729) >>> 0);
    if (z.hub || z.safe || z.cidade) min = 0;
    const F = (BAU_FAIXAS.find((f) => (z.lv || 1) <= f[0]) || BAU_FAIXAS[3])[1];
    let w = F.map((x, i) => (C.ligado[i] && i >= min ? x : 0));
    if (z.hub || z.safe || z.cidade) w = w.map((x, i) => (i === 0 ? x : 0));   // cidades seguras: só o comum
    if (min > 0 && !w.some((x) => x > 0)) w = F.map((x, i) => (C.ligado[i] ? (i >= min ? 1 : 0) : 0));
    let tot = 0;
    for (const x of w) tot += x;
    if (tot <= 0) return -1;
    let v = rnd() * tot;
    for (let i = 0; i < 5; i++) { v -= w[i]; if (v <= 0) return i; }
    return 0;
  },
  // Lugar escondido para o baú k: longe do centro e das passagens, perto de um obstáculo, fora d'água
  lugar(z, R, k, ocupados) {
    const g = game, rnd = mulberry32((this.hash(z.id) * 31 + k * 977 + 5) >>> 0);
    let melhor = null, nota = -1e9;
    for (let i = 0; i < 90; i++) {
      const x = 70 + rnd() * (R.w - 140), y = 70 + rnd() * (R.h - 140);
      if (!R.canStand(x, y, 24)) continue;
      if (typeof Agua !== 'undefined' && Agua.profundidade(x, y) > 0) continue;
      if (g.npcs.some((n) => dist(n.x, n.y, x, y) < (n.kind === 'gate' || n.kind === 'portal' ? 190 : 80) + (n.radius || 0))) continue;
      if (ocupados.some((o) => dist(o.x, o.y, x, y) < 320)) continue;
      // nota: canto e beira contam, obstáculo por perto conta muito (escondido atrás dele)
      let perto = 1e9;
      for (const p of R.pillars) { if (p.enfeite) continue; const d = dist(p.x, p.y, x, y) - (p.r || 10); if (d < perto) perto = d; }
      const centro = dist(x, y, R.w / 2, R.h / 2) / (Math.hypot(R.w, R.h) / 2);
      const n = centro * 1.2 + (perto < 150 ? 1.4 - perto / 150 : 0) + rnd() * 0.25;
      if (n > nota) { nota = n; melhor = { x, y }; }
    }
    return melhor;
  },

  // ------------------------------------------------------------------ zona
  aoCarregar(z) {
    const g = typeof game !== 'undefined' ? game : null;
    if (!g || !g.room || !z || typeof WorldProp === 'undefined') return 0;
    const R = g.room, C = this.cfg();
    // os baús fixos (zona, segredo, masmorra): o mesmo modelo, a raridade pela importância
    for (const n of g.npcs) {
      if (n.kind !== 'chest' || n.rar !== undefined) continue;
      const d = n.data || {};
      n.rar = d.boss ? 4 : d.masmorra ? 3 : d.secret ? ((z.lv || 1) >= 25 ? 3 : 2) : (z.lv || 1) >= 75 ? 2 : (z.lv || 1) >= 25 ? 1 : 0;
      n.fixo = true; n.abertura = n.used ? 1 : 0; n.facing = n.viewFacing = 0.6;
      this.pedir(n.rar);
    }
    if (z.instancia || z.interior) return 0;   // masmorras e interiores: só os baús deles
    let n = z.hub || z.safe || z.cidade ? Math.min(1, C.porZona) : C.porZona + (z.secret ? 1 : 0) + (z.boss ? 1 : 0);
    const ev = C.evento && C.evento.zona === z.id && this.agora() < C.evento.ate ? C.evento : null;
    const ocupados = [];
    let postos = 0;
    for (let k = 0; k < n + (ev ? 1 : 0); k++) {
      const evento = ev && k === n, key = evento ? `${z.id}:ev${ev.id}` : `${z.id}:r${k}`;
      // (extras do segredo e do chefe: pelo menos raro ou épico)
      const mn = k >= C.porZona ? (z.boss && k === n - 1 ? 3 : 2) : 0;
      let r = evento ? ev.r : -1;
      if (!evento) {
        // c: quantas vezes este baú já foi aberto (o registro fica no modo da raridade aberta)
        const c = Math.max((this.pessoal()[key] || {}).c || 0, (this.mundo()[key] || {}).c || 0);
        const rAnt = c > 0 ? this.raridade(z, k, c - 1, mn) : -1;
        // dentro do tempo (ou com itens por coletar): continua o baú aberto; senão, o do ciclo novo
        r = rAnt >= 0 && (this.falta(key, rAnt) > 0 || this.pendente(key, rAnt)) ? rAnt : this.raridade(z, k, c, mn);
      }
      if (r < 0) continue;
      const pt = this.lugar(z, R, k, ocupados);
      if (!pt) continue;
      ocupados.push(pt);
      const b = new WorldProp('chest', pt.x, pt.y, { key, bauR: true, k, evento: !!evento });
      this.vestir(b, r);
      b.abertura = this.falta(key, r) > 0 ? 1 : 0;
      b.facing = b.viewFacing = (this.hash(key) % 628) / 100;
      g.npcs.push(b);
      R.pillars.push({ x: pt.x, y: pt.y, r: 15, h: 26, cenario: true, bau: true, sprite: null });   // o herói não atravessa o baú
      postos++;
    }
    return postos;
  },
  vestir(b, r) {
    const T = BAU_RAR[r];
    b.rar = r; b.lightRgb = T.rgb; b.name = T.nome.toUpperCase(); b.key = null;
    this.pedir(r);
  },

  // ------------------------------------------------------------------ modelos (GLB convertidos, sob demanda)
  id(r) { return 'bau_' + BAU_RAR[r].id; },
  pedir(r) {
    if (typeof Estruturas === 'undefined') return;
    Estruturas.carregar(this.id(r)); Estruturas.carregar(this.id(r) + '_tampa');
  },
  pronto(r) {
    const id = this.id(r);
    if (typeof PROPS3D === 'undefined' || !PROPS3D[id] || !PROPS3D[id + '_tampa'] || typeof Cenario === 'undefined' || typeof MODELS3D === 'undefined') return false;
    if (!MODELS3D[id]) this.registrar(id);
    return true;
  },
  // corpo + tampa (nó próprio, na dobradiça): a tampa gira até ~105° pela abertura da entidade
  registrar(id) {
    MODELS3D[id] = {
      semTinta: true,
      build() {
        const B = PROPS3D[id], root = new N3('bau');
        root.geo = Cenario.geo(id);
        const tampa = root.add(new N3('tampa'));
        tampa.geo = Cenario.geo(id + '_tampa');
        const d = B.dob || [-B.w / 2, 0, B.h];
        tampa.p = [d[0], d[1], d[2]];
        const m = new Model3(root);
        m.mixProprio = true;
        m.tex = { src: B.tc, mat: B.tm, nrm: B.tn, pbr: true, bump: 0, emiB: true, glow: null };
        return m;
      },
      pose(m, e) {
        m.reset();
        const a = e && e.abertura ? e.abertura : 0, k = a < 1 ? 1 - Math.pow(1 - a, 3) : 1;   // sai rápido e assenta
        m.nodes.tampa.r[1] = -(k * 1.83 + (a > 0 && a < 1 ? Math.sin(a * Math.PI) * 0.12 : 0));
      },
      opts() { return null; },
    };
  },
  // chamado por WorldProp.update: o modelo quando chega, a tampa, o reaparecimento e as partículas
  atualizar(n, dt) {
    if (n.rar === undefined) return;
    if (!n.key && this.pronto(n.rar)) n.key = this.id(n.rar);
    const aberto = n.fixo ? n.used : this.falta(n.data.key, n.rar) > 0;
    const alvo = aberto || n.abrindo > 0 ? 1 : 0;
    if (n.abrindo > 0) n.abrindo -= dt;
    n.abertura = n.abertura === undefined ? alvo : n.abertura + clamp(alvo - n.abertura, -dt / 0.9, dt / 0.6);
    if (n.fixo) return;
    // reapareceu com a zona aberta: fecha, sorteia a raridade do ciclo novo e troca o modelo
    if (!aberto && n.estavaAberto && !this.pendente(n.data.key, n.rar)) {
      const z = World.zone, st = this.reg(n.data.key, n.rar), C = this.cfg();
      if (z && !n.data.evento) { const r = this.raridade(z, n.data.k, st ? st.c : 0, n.data.k >= C.porZona ? 2 : 0); if (r >= 0 && r !== n.rar) { this.vestir(n, r); n.abertura = 0; } }
      game.particles.ring(n.x, n.y, 40, BAU_RAR[n.rar].rgb, 0.6, 4);
    }
    n.estavaAberto = aberto;
    // ciscos de luz da raridade em volta do baú fechado (poucos: 1 a 5 por segundo, só perto do herói)
    if (!aberto && game.player && dist(game.player.x, game.player.y, n.x, n.y) < 760) {
      n.ciscoT = (n.ciscoT || 0) - dt;
      if (n.ciscoT <= 0) {
        n.ciscoT = [1.1, 0.7, 0.45, 0.3, 0.2][n.rar] * (0.7 + Math.random() * 0.6);
        const a = Math.random() * TAU, d0 = 8 + Math.random() * 20;
        game.particles.emit(P.SPARK, n.x + Math.cos(a) * d0, n.y + Math.sin(a) * d0, 4 + Math.random() * 14, 0, 0, 14 + Math.random() * 26 + n.rar * 6, 0.9 + Math.random() * 0.7, 1 + n.rar * 0.25, BAU_RAR[n.rar].rgb, -30, 0.6);
      }
    }
  },
  // vista isométrica: o sprite do motor 3D (false: fica o desenho 2D de antes)
  desenhar(ctx, n) {
    if (n.rar === undefined || !n.key || !game.use3D || !n.spr || !n.spr.ok) return false;
    const sx = isoX(n.x, n.y), sy = isoY(n.x, n.y);
    ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, 24, 11, 0, 0, TAU); ctx.fill();
    R3D.blit(ctx, n.spr, sx, sy);
    return true;
  },
  // luz e identificação (depois da escuridão; na 3ª pessoa, isoX/isoY já projetam pela câmera)
  brilho(ctx, n) {
    if (n.rar === undefined) return false;
    const T = BAU_RAR[n.rar], r = n.rar, sx = isoX(n.x, n.y), sy = isoY(n.x, n.y), t = n.t || 0;
    const aberto = n.fixo ? n.used : this.falta(n.data.key, r) > 0, pend = !n.fixo && this.pendente(n.data.key, r);
    const p = game.player, d = p ? dist(p.x, p.y, n.x, n.y) : 999;
    if (n.data.secret && !n.used && d > 160) return true;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (!aberto || pend) {
      const pulso = 0.5 + 0.5 * Math.sin(t * (2 + r * 0.5));
      GlowCache.draw(ctx, T.rgb, sx, sy - 14, 30 + r * 9, [0.2, 0.3, 0.42, 0.5, 0.62][r] + 0.1 * pulso);
      if (r >= 1) {   // aura no chão
        ctx.strokeStyle = rgba(T.rgb, 0.3 + 0.3 * pulso); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(sx, sy, 28 + r * 3 + pulso * 3, (28 + r * 3 + pulso * 3) / 2, 0, 0, TAU); ctx.stroke();
      }
      if (r >= 3) {   // energia pulsando: anel que cresce e some
        const u = (t * 0.7) % 1;
        ctx.strokeStyle = rgba(T.rgb, 0.5 * (1 - u)); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sx, sy, 20 + u * 44, 10 + u * 22, 0, 0, TAU); ctx.stroke();
      }
      if (r >= 4) {   // feixe de luz do lendário (visível de longe)
        const h = 240, gr = ctx.createLinearGradient(0, sy - h, 0, sy);
        gr.addColorStop(0, rgba(T.rgb, 0)); gr.addColorStop(0.6, rgba(T.rgb, 0.16 + 0.08 * pulso)); gr.addColorStop(1, rgba(T.rgb, 0.42));
        ctx.fillStyle = gr; ctx.fillRect(sx - 9, sy - h, 18, h);
        ctx.fillStyle = rgba('255,244,210', 0.2 + 0.1 * pulso); ctx.fillRect(sx - 3, sy - h, 6, h);
      }
    } else if (n.abertura > 0.5) GlowCache.draw(ctx, '255,200,110', sx, sy - 18, 22, 0.14);   // o ouro lá dentro
    ctx.restore();
    // nome e raridade ao chegar perto (as recompensas não aparecem antes de abrir)
    if (d < 230 && (!aberto || pend || !n.fixo)) {
      const falta = n.fixo ? 0 : this.falta(n.data.key, r);
      const txt = pend ? `${T.nome.toUpperCase()} · ITENS POR COLETAR` : aberto ? `${T.nome.toUpperCase()} · VOLTA EM ${this.tempo(falta)}` : T.nome.toUpperCase();
      ctx.save();
      ctx.globalAlpha = clamp((230 - d) / 80, 0, 1) * (aberto && !pend ? 0.6 : 1);
      ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(txt).width + 16;
      ctx.fillStyle = 'rgba(3,7,16,0.8)'; ctx.fillRect(sx - w / 2, sy - 62, w, 16);
      ctx.fillStyle = rgba(T.rgb, 0.9); ctx.fillRect(sx - w / 2, sy - 62, 2, 16);
      ctx.fillStyle = rgba(T.rgb, 1); ctx.fillText(txt, sx + 1, sy - 53.5);
      ctx.letterSpacing = '0px';
      ctx.restore();
    }
    return true;
  },
  tempo(s) {
    s = Math.ceil(s);
    if (s >= 3600) return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },

  // ------------------------------------------------------------------ abrir (regras)
  // Devolve '' ou o motivo de não poder abrir
  podeAbrir(n) {
    const p = game.player, r = n.rar;
    if (!p || p.state === 'dead') return 'Você não pode abrir agora.';
    if (dist(p.x, p.y, n.x, n.y) > this.ALCANCE) return 'Chegue mais perto do baú.';
    if (!this.cfg().ligado[r] && !n.data.evento) return 'Este baú está selado.';
    if (this.pendente(n.data.key, r)) return '';
    if (this.falta(n.data.key, r) > 0) return `Baú vazio. Volta em ${this.tempo(this.falta(n.data.key, r))}.`;
    return '';
  },
  abrir(n) {
    const g = game, r = n.rar, key = n.data.key, nao = this.podeAbrir(n);
    if (nao) { g.hud.toast(nao, '255,150,120'); g.audio.play('uiDeny'); return false; }
    let st = this.reg(key, r, true);
    if (!(st.pend && st.pend.length)) {
      // novo: sorteia, marca aberto e GRAVA antes de mostrar (recarregar a página não dá outro sorteio)
      st.pend = this.sortear(r, World.zone, n);
      st.t = this.agora(); st.c = (st.c || 0) + 1;
      this.historico({ key, r, zona: World.zone ? World.zone.id : '', quando: st.t, itens: st.pend.length });
      this.gravar();
      n.abrindo = 0.9;
      g.audio.play('bau', r);
      const T = BAU_RAR[r];
      g.particles.ring(n.x, n.y, 44 + r * 12, T.rgb, 0.5, 4 + r);
      g.particles.sparks(n.x, n.y, 22, -Math.PI / 2, 12 + r * 6, T.rgb, 260 + r * 40, Math.PI);
      if (r >= 2) g.particles.embers(n.x, n.y, 8, 16 + r * 8, T.rgb, 30, 240 + r * 60);
      if (r >= 3) { g.particles.flash(n.x, n.y, 30, 120 + r * 30, T.rgb, 0.3); g.camera.shake(0.08 + (r - 3) * 0.08); }
      if (r >= 4) { g.flashScreen(T.rgb, 0.16); g.particles.ring(n.x, n.y, 130, '255,244,210', 0.9, 9); }
      if (typeof WorldQuests !== 'undefined') WorldQuests.check();
    } else g.audio.play('uiSelect');
    this.ui.prop = n; this.ui.key = key; this.ui.r = r; this.ui.itens = st.pend; this.ui.t = n.abrindo > 0 ? -0.55 : 0; this.ui.msg = ''; this.ui.msgT = 0;
    g.state = 'worldbau';
    return true;
  },
  historico(h) {
    const W = World.state, L = W.bausLog || (W.bausLog = []);
    L.push(h);
    if (L.length > 60) L.splice(0, L.length - 60);
  },
  // Sorteio das recompensas do baú de raridade r na zona z
  sortear(r, z, n) {
    const T = BAU_SAQUE[r], lv = (z && z.lv) || 1, reg = (z && z.region) || 'carmesin', out = [], R = Math.random;
    const sorte = typeof Atributos !== 'undefined' && Atributos.sorteSaque ? Atributos.sorteSaque() : 0;
    const buff = typeof Buffs !== 'undefined' ? Buffs.valor('sorte') : 0;   // buff de Sorte do GM
    const chance = (p) => R() < Math.min(1, p * (1 + sorte + buff));
    out.push({ t: 'celulas', n: Math.round((14 + lv * 1.6) * T.cel * (0.85 + R() * 0.3)) });
    out.push({ t: 'xp', n: Math.round((8 + lv * 3) * T.xp * 0.5) });
    for (const [L, a, b] of T.mats) {
      let k = pick(L);
      if (k === 'regional') k = (typeof WORLD_MAT_REG !== 'undefined' && WORLD_MAT_REG[reg]) || 'sucata';
      const q = a + Math.floor(R() * (b - a + 1)), ja = out.find((o) => o.t === 'mat' && o.k === k);
      if (ja) ja.n += q; else out.push({ t: 'mat', k, n: q });
    }
    if (chance(T.cons[0])) {
      for (let i = 0; i < T.cons[1]; i++) {
        const k = pick(T.cons[2]), ja = out.find((o) => (o.t === 'cons' || o.t === 'capsula') && o.k === k);
        if (ja) ja.n++; else out.push(k === 'capsula' ? { t: 'capsula', k, n: 1 } : { t: 'cons', k, n: 1 });
      }
    }
    if (chance(T.reliquia[0])) {
      const mitico = T.mitico && R() < T.mitico * (1 + sorte + buff);
      const alvo = mitico ? 5 : T.reliquia[1] + Math.floor(R() * (T.reliquia[2] - T.reliquia[1] + 1));
      out.push({ t: 'reliquia', it: this.reliquia(lv, reg, alvo) });
    }
    if (typeof Arsenal !== 'undefined' && chance(T.peca[0])) {
      const rr = T.peca[1] + Math.floor(R() * (T.peca[2] - T.peca[1] + 1));
      out.push({ t: 'peca', it: Arsenal.gerar(pick(ARS_ORDEM), Arsenal.famDaZona(z || { lv, region: reg }), rr, lv) });
    }
    void n;
    // os melhores primeiro (a janela destaca os épicos e lendários)
    const peso = (o) => (o.t === 'reliquia' || o.t === 'peca' ? 10 + o.it.r : o.t === 'celulas' ? 5 : o.t === 'xp' ? 4 : o.t === 'mat' ? 2 + (WORLD_MAT_RARIDADE[o.k] || 0) * 0.2 : 1);
    return out.sort((a, b) => peso(b) - peso(a));
  },
  // relíquia da raridade pedida (o gerador sorteia a partir de um mínimo: repete até acertar)
  reliquia(lv, reg, r) {
    let it = null;
    for (let i = 0; i < 40; i++) { it = WorldInv.gerar(lv, reg, r, 0); if (it.r === r) return it; }
    it.r = r;
    return it;
  },
  // ------------------------------------------------------------------ recompensas: texto e entrega
  info(o) {
    if (o.t === 'celulas') return { nome: 'Células', n: o.n, rgb: '255,190,90', icone: '◈', rar: '', desc: 'A moeda do mundo.' };
    if (o.t === 'xp') return { nome: 'Experiência', n: o.n, rgb: '150,220,255', icone: '✦', rar: '', desc: 'Experiência do herói.' };
    if (o.t === 'mat') { const M = WORLD_MATERIAIS[o.k], rr = WORLD_MAT_RARIDADE[o.k] || 0; return { nome: M.nome, n: o.n, rgb: WORLD_RARIDADES[rr].rgb, icone: M.icon, rar: WORLD_RARIDADES[rr].name, desc: M.desc }; }
    if (o.t === 'capsula') return { nome: 'Cápsula de reparo', n: o.n, rgb: '120,255,170', icone: '✚', rar: 'Consumível', desc: 'Cura 40% da vida (tecla 5).' };
    if (o.t === 'cons') { const C = WORLD_CONSUMIVEIS[o.k]; return { nome: C.nome, n: o.n, rgb: C.rgb, icone: '⚗', rar: 'Consumível', desc: C.desc }; }
    if (o.t === 'reliquia') {
      const it = o.it, R = WorldInv.rar(it);
      return { nome: WorldInv.nome(it), n: 1, rgb: R.rgb, icone: WorldInv.base(it).icon, rar: `Relíquia ${R.name} · Nv ${it.lv}`, desc: Object.keys(it.st).map((k) => WorldInv.fmt(k, it.st[k])).join(' · '), destaque: it.r };
    }
    const it = o.it, R = Arsenal.rar(it);
    return { nome: Arsenal.nome(it), n: 1, rgb: R.rgb, icone: '⛨', rar: `Peça ${R.name} · Nv ${it.lv}`, desc: Object.keys(it.st).map((k) => (WORLD_ATRIB[k] ? WorldInv.fmt(k, it.st[k]) : '')).filter(Boolean).join(' · '), destaque: it.r, peca: it };
  },
  // Entrega uma recompensa; false = não coube (fica no baú)
  entregar(o, x, y) {
    const g = game;
    if (o.t === 'celulas') { g.stats.soulsBank += o.n; return true; }
    if (o.t === 'xp') { g.gainXP(o.n, x, y); return true; }
    if (o.t === 'mat') { Oficios.dar(o.k, o.n, false); return true; }
    if (o.t === 'capsula') { const S = WorldInv.S; if (S.capsulas >= WorldInv.CAPS) return false; S.capsulas = Math.min(WorldInv.CAPS, S.capsulas + o.n); return true; }
    if (o.t === 'cons') { if (Oficios.cons(o.k) >= 9) return false; Oficios.darCons(o.k, o.n); return true; }
    if (o.t === 'reliquia') {
      const S = WorldInv.S;
      if (S.itens.length >= WorldInv.MAX) return false;   // mochila cheia: a relíquia espera no baú (não é vendida)
      o.it.id = S.seq++; S.itens.push(o.it);
      if (o.it.r >= 5) WorldInv.efeitoMitico(x, y, 'RELÍQUIA MÍTICA', WorldInv.nome(o.it));
      return true;
    }
    Arsenal.guardar(o.it, true);   // (mochila de peças cheia: vai para o armazém da cidade)
    return true;
  },
  coletar() {
    const U = this.ui, g = game, st = this.reg(U.key, U.r), n = U.prop;
    if (!st || !st.pend) { this.fechar(); return; }
    const ficou = [];
    let melhor = -1;
    for (const o of st.pend) {
      if (this.entregar(o, n ? n.x : g.player.x, n ? n.y : g.player.y)) { if ((o.t === 'reliquia' || o.t === 'peca') && o.it.r > melhor) melhor = o.it.r; } else ficou.push(o);
    }
    st.pend = ficou.length ? ficou : null;
    this.gravar();
    if (typeof Aventuras !== 'undefined' && Aventuras.check) Aventuras.check();
    g.audio.play(melhor >= 3 ? 'memory' : 'soul');
    if (ficou.length) {
      U.itens = ficou; U.t = 0.6;
      U.msg = 'Sem espaço para estes itens: ficam guardados no baú. Libere a mochila e volte.'; U.msgT = 4;
      g.audio.play('uiDeny');
      return;
    }
    g.hud.toast(`${BAU_RAR[U.r].nome} · tudo coletado`, BAU_RAR[U.r].rgb);
    this.fechar();
  },
  fechar() { game.state = 'playing'; this.ui.prop = null; },

  // ------------------------------------------------------------------ janela de recompensas
  updateUI(dt, inp) {
    const U = this.ui;
    U.t += dt; if (U.msgT > 0) U.msgT -= dt;
    if (U.prop) Baus.atualizar(U.prop, dt);   // (a tampa termina de abrir com a janela na tela)
    if (U.t < 0) return;
    if (inp.pressed.back || inp.pressed.pause) { this.fechar(); game.audio.play('uiMove'); return; }
    const pronto = U.t > Math.min(1.6, 0.25 + U.itens.length * 0.14);
    const m = inp.mouse;
    let clicou = inp.pressed.confirm || inp.pressed.interact;
    if (m.clicked) for (const r of U.rects) if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) { if (r.id === 'coletar') clicou = true; else if (r.id === 'fechar') { this.fechar(); return; } }
    if (clicou) { if (!pronto) U.t = 9; else this.coletar(); }
  },
  draw(ctx, t) {
    const U = this.ui, T = BAU_RAR[U.r] || BAU_RAR[0], L = U.itens || [];
    if (U.t < 0) return;
    const a = clamp(U.t / 0.2, 0, 1);
    ctx.save();
    ctx.fillStyle = `rgba(2,5,12,${0.5 * a})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const W = Math.min(VIEW_W - 24, 620), lh = 50, H = Math.min(VIEW_H - 24, 118 + L.length * lh + 30), x0 = (VIEW_W - W) / 2, y0 = (VIEW_H - H) / 2 + (1 - a) * 18;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(5,9,20,0.96)'; techPanelPath(ctx, x0, y0, W, H, 12); ctx.fill();
    ctx.strokeStyle = rgba(T.rgb, 0.8); ctx.lineWidth = 1.4; ctx.stroke();
    const gr = ctx.createLinearGradient(0, y0, 0, y0 + 60);
    gr.addColorStop(0, rgba(T.rgb, 0.22)); gr.addColorStop(1, rgba(T.rgb, 0));
    ctx.fillStyle = gr; ctx.fillRect(x0 + 2, y0 + 2, W - 4, 58);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 20px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = rgba(T.rgb, 1);
    ctx.fillText(T.nome.toUpperCase(), VIEW_W / 2, y0 + 28);
    ctx.letterSpacing = '1px'; ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.8)';
    ctx.fillText('RECOMPENSAS ENCONTRADAS', VIEW_W / 2, y0 + 50);
    ctx.letterSpacing = '0px';
    // itens: entram um a um; épicos e lendários com brilho
    const cab = y0 + 70, max = Math.floor((H - 118 - 30) / lh + 0.001), vis = L.slice(0, Math.max(1, max));
    vis.forEach((o, i) => {
      const u = clamp((U.t - 0.2 - i * 0.14) / 0.3, 0, 1);
      if (u <= 0) return;
      const I = this.info(o), y = cab + i * lh, k = 1 - Math.pow(1 - u, 3), x = x0 + 18 + (1 - k) * 30;
      ctx.globalAlpha = a * k;
      const dest = I.destaque !== undefined && I.destaque >= 3;
      if (dest) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; GlowCache.draw(ctx, I.rgb, x + 22, y + 22, 44, 0.25 + 0.12 * Math.sin(t * 4 + i)); ctx.restore(); }
      ctx.fillStyle = rgba(I.rgb, dest ? 0.16 : 0.08); ctx.fillRect(x, y, W - 36, lh - 6);
      ctx.fillStyle = rgba(I.rgb, 0.9); ctx.fillRect(x, y, 3, lh - 6);
      ctx.fillStyle = 'rgba(10,16,30,0.9)'; ctx.fillRect(x + 10, y + 4, 36, 36);
      ctx.strokeStyle = rgba(I.rgb, 0.9); ctx.lineWidth = 1.2; ctx.strokeRect(x + 10.5, y + 4.5, 35, 35);
      ctx.textAlign = 'center'; ctx.font = `bold 19px ${FONT_UI}`; ctx.fillStyle = rgba(I.rgb, 1);
      ctx.fillText(I.icone, x + 28, y + 23);
      ctx.textAlign = 'left'; ctx.font = `bold 14px ${FONT_UI}`; ctx.fillStyle = rgba(I.rgb, 1);
      ctx.fillText(I.nome + (I.n > 1 ? `  ×${I.n}` : ''), x + 56, y + 14);
      ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.78)';
      let d = (I.rar ? I.rar + ' — ' : '') + (I.desc || '');
      while (d.length > 4 && ctx.measureText(d).width > W - 36 - 70) d = d.slice(0, -2);
      ctx.fillText(d, x + 56, y + 32);
    });
    ctx.globalAlpha = a;
    if (L.length > vis.length) { ctx.textAlign = 'center'; ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.7)'; ctx.fillText(`+ ${L.length - vis.length} itens`, VIEW_W / 2, cab + vis.length * lh + 4); }
    // botões
    const pronto = U.t > Math.min(1.6, 0.25 + L.length * 0.14), bw = 220, bh = 36, bx = VIEW_W / 2 - bw / 2, by = y0 + H - bh - 16;
    U.rects = [{ id: 'coletar', x: bx, y: by, w: bw, h: bh }, { id: 'fechar', x: x0 + W - 38, y: y0 + 8, w: 30, h: 30 }];
    ctx.fillStyle = rgba(T.rgb, pronto ? 0.22 + 0.06 * Math.sin(t * 5) : 0.08); techPanelPath(ctx, bx, by, bw, bh, 7); ctx.fill();
    ctx.strokeStyle = rgba(T.rgb, pronto ? 1 : 0.4); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = `bold 14px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = pronto ? '#ffffff' : 'rgba(255,255,255,0.5)';
    ctx.fillText('[E]  COLETAR', VIEW_W / 2, by + bh / 2 + 1);
    ctx.letterSpacing = '0px';
    ctx.font = `bold 16px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.7)'; ctx.fillText('✕', x0 + W - 23, y0 + 24);
    if (U.msgT > 0) { ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(255,170,130,0.95)'; ctx.fillText(U.msg, VIEW_W / 2, by - 12); }
    ctx.restore();
  },

  // ------------------------------------------------------------------ administração (painel do GM)
  admin: {
    listar() {
      const g = game, out = [];
      for (const n of g.npcs) if (n.kind === 'chest' && n.rar !== undefined && !n.fixo) out.push({ key: n.data.key, raridade: BAU_RAR[n.rar].id, x: Math.round(n.x), y: Math.round(n.y), falta: Math.round(Baus.falta(n.data.key, n.rar)), pendente: Baus.pendente(n.data.key, n.rar) });
      return out;
    },
    // força o reaparecimento (um baú ou todos os desta zona)
    reaparecer(key = null) {
      let n = 0;
      for (const T of [Baus.pessoal(), Baus.mundo()]) for (const k in T) if ((!key && World.zone && k.indexOf(World.zone.id + ':') === 0) || k === key) { if (!(T[k].pend && T[k].pend.length)) { T[k].t = 0; n++; } }
      Baus.gravar();
      return n;
    },
    ligar(r, on) { Baus.cfg().ligado[r] = !!on; Baus.gravarCfg(); },
    tempo(r, s) { Baus.cfg().respawn[r] = clamp(Math.round(s), 30, 7 * 86400); Baus.gravarCfg(); },
    modo(r, m) { Baus.cfg().modo[r] = m === 'mundial' ? 'mundial' : 'individual'; Baus.gravarCfg(); },
    porZona(n) { Baus.cfg().porZona = clamp(Math.round(n), 0, 5); Baus.gravarCfg(); },
    // baú especial de evento na zona (aparece na próxima vez que ela carregar; some depois de horas)
    evento(zona, r, horas = 2) { Baus.cfg().evento = { id: Baus.agora() % 100000, zona, r: clamp(r | 0, 0, 4), ate: Baus.agora() + horas * 3600000 }; Baus.gravarCfg(); },
    padrao() { Baus._cfg = Baus.padrao(); Baus.gravarCfg(); },
  },
};
