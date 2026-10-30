'use strict';
// ECLIPSE ZERO · Mundo aberto: masmorras, tesouros escondidos e lugares revelados (Locais)
// ---------------------------------------------------------------------------
// MASMORRAS: uma por região, com a entrada numa zona do mapa (algumas escondidas: aparecem
// quando um morador conta o rumor ou quando o herói passa bem perto). Cada uma tem 3 andares
// (zonas próprias, fora da grade do mapa) ligados por passagens: a passagem para o andar de
// cima fica SELADA até todos os inimigos do andar caírem. No último andar mora o chefe da
// masmorra; vencido, o baú da masmorra abre e aparece a SAÍDA — em algumas, para outra zona
// (um caminho alternativo). A masmorra recomeça a cada visita; o baú paga uma vez por dia do
// mundo e a primeira vitória dá reputação e experiência extra.
// TESOUROS ESCONDIDOS: pontos de escavação que só brilham de perto, a menos que um rumor (ou
// um mapa do tesouro deixado por uma elite) tenha marcado o lugar no mapa. Pagam uma vez.
// LUGARES: um rumor também pode só apontar uma zona no mapa ("ouvi falar").
// Estado: World.state.locais = { masm: { id: { sabe, vezes, dia } }, tes: { id: 'sabe' | 'achado' }, zonas: [] }.
// ---------------------------------------------------------------------------
const WORLD_MASMORRAS = {
  catacumbas: { nome: 'Catacumbas Carmesins', reg: 'carmesin', zona: 'fendas', at: [0.1, 0.52], oculta: true, tema: 'tunnel', lv: 7,
    mobs: ['rastejador', 'enxame', 'cacador', 'sacerdote'], chefe: { tipo: 'sacerdote', nome: 'ARQUIVISTA RUBRO', hp: 3, escolta: { rastejador: 2 } },
    desc: 'Túneis de manutenção que viraram ossário das máquinas.' },
  raiz_profunda: { nome: 'Raiz Profunda', reg: 'velmora', zona: 'velmora_raizes', at: [0.5, 0.86], oculta: true, tema: 'cathedral', lv: 13,
    mobs: ['lobo_raiz', 'esporo', 'rastejador'], chefe: { tipo: 'esporo', nome: 'CORAÇÃO DE ESPOROS', hp: 3.4, escolta: { lobo_raiz: 2 } },
    saida: { zona: 'velmora_lago', at: [0.82, 0.2] }, desc: 'A raiz mais antiga de Velmora desce até uma câmara que bate como um coração.' },
  gruta: { nome: 'Gruta Submersa', reg: 'lagoa', zona: 'lagoa_submersa', at: [0.18, 0.3], oculta: true, tema: 'tunnel', lv: 19,
    mobs: ['medusa', 'carangueijo', 'sacerdote'], chefe: { tipo: 'carangueijo', nome: 'REI DA MARÉ BAIXA', hp: 3.6, escolta: { medusa: 2 } },
    desc: 'Um arco de pedra com luz azul leva para baixo da lagoa.' },
  cofre: { nome: 'Cofre Corporativo', reg: 'nexus', zona: 'nexus_laboratorio', at: [0.85, 0.8], oculta: false, tema: 'lab', lv: 18,
    mobs: ['drone', 'atirador', 'legionario'], chefe: { tipo: 'legionario', nome: 'GUARDIÃO DO COFRE', hp: 2.6, escolta: { atirador: 2 } },
    desc: 'O subsolo onde a diretoria guardava os protótipos, atrás de três portas de segurança.' },
  tumba: { nome: 'Tumba Esquecida', reg: 'seraph', zona: 'seraph_ruinas', at: [0.3, 0.2], oculta: true, tema: 'cathedral', lv: 22,
    mobs: ['escorpiao', 'sacerdote', 'legionario'], chefe: { tipo: 'sacerdote', nome: 'ESCRIBA SEM ROSTO', hp: 3.6, escolta: { escorpiao: 2 } },
    desc: 'Mais antiga que a tumba do Faraó: as paredes contam como o primeiro código foi escrito.' },
  eco: { nome: 'Caverna do Eco', reg: 'asterion', zona: 'asterion_caverna', at: [0.8, 0.86], oculta: true, tema: 'tunnel', lv: 24,
    mobs: ['lobo_neve', 'golem_gelo', 'drone'], chefe: { tipo: 'golem_gelo', nome: 'ECO DO PICO', hp: 3.4, escolta: { lobo_neve: 2 } },
    saida: { zona: 'asterion_geleira', at: [0.5, 0.16] }, desc: 'Uma caverna onde o eco responde antes do grito.' },
  primeiro_fogo: { nome: 'Câmara do Primeiro Fogo', reg: 'obsidiano', zona: 'obsidiano_forja', at: [0.15, 0.85], oculta: true, tema: 'lab', lv: 34,
    mobs: ['magma', 'diabrete', 'legionario'], chefe: { tipo: 'magma', nome: 'O PRIMEIRO FORJADOR', hp: 4.2, escolta: { diabrete: 3 } },
    desc: 'A chama que acendeu a primeira forja ainda queima aqui embaixo.' },
};
const WORLD_ANDARES = ['Entrada', 'Galerias', 'Câmara do Chefe'];
const WORLD_TESOUROS = {
  tes_portoes: { zona: 'portoes', at: [0.08, 0.5], nome: 'Cofre do pedágio', rec: { cel: 60, rel: { min: 2 } } },
  tes_praca: { zona: 'praca', at: [0.5, 0.06], nome: 'Economias do avô', rec: { cel: 80, mat: { essencia: 1 } } },
  tes_lago: { zona: 'velmora_lago', at: [0.92, 0.56], nome: 'Caixa sob o salgueiro', rec: { cel: 120, rel: { min: 2 } } },
  tes_recife: { zona: 'lagoa_recife', at: [0.12, 0.88], nome: 'Carga do Nexus', rec: { cel: 160, mat: { nucleo: 2 }, rel: { min: 2 } } },
  tes_mercado: { zona: 'nexus_mercado', at: [0.6, 0.9], nome: 'Esconderijo da Resistência', rec: { cel: 140, cons: { tonico: 1, pele: 1 } } },
  tes_dunas: { zona: 'seraph_dunas', at: [0.5, 0.1], nome: 'Pagamento enterrado', rec: { cel: 220, rel: { min: 3 } } },
  tes_geleira: { zona: 'asterion_geleira', at: [0.86, 0.5], nome: 'Caixa da Vigília', rec: { cel: 240, mat: { essencia: 1 }, rel: { min: 2 } } },
  tes_fendas: { zona: 'obsidiano_fendas', at: [0.15, 0.2], nome: 'Ferramentas do forjador', rec: { cel: 300, rel: { min: 3, sorte: 0.4 } } },
};

// Entrada de masmorra (escada para baixo) e ponto de escavação de tesouro
class LocalProp extends WorldProp {
  constructor(sub, x, y, data) {
    super(sub, x, y, data);
    this.sub = sub;
    this.lightRgb = sub === 'entrada' ? '200,120,255' : '255,200,110';
    this.name = data.nome.toUpperCase(); this.verb = sub === 'entrada' ? 'Descer' : 'Cavar'; this.height = 14;
    this.flat = true;   // pisa-se em cima (não bloqueia o herói)
  }
  get used() { return this.sub === 'tesouro' && Locais.S.tes[this.data.id] === 'achado'; }
  visivel() { return this.sub === 'entrada' ? Locais.sabeMasmorra(this.data.id) : !this.used && (Locais.S.tes[this.data.id] === 'sabe' || dist(game.player.x, game.player.y, this.x, this.y) < 150); }
  update(dt) {
    this.t += dt;
    if (this.talkT > 0) this.talkT -= dt;
    // entrada escondida: passar bem perto descobre
    if (this.sub === 'entrada' && !Locais.sabeMasmorra(this.data.id) && dist2(game.player.x, game.player.y, this.x, this.y) < 110 * 110) {
      Locais.S.masm[this.data.id] = Object.assign(Locais.S.masm[this.data.id] || {}, { sabe: true });
      game.hud.message('ENTRADA ESCONDIDA', this.name, 2.4, false, true); game.audio.play('memory');
    }
  }
  canTalk() { return this.visivel() && !this.used && dist(game.player.x, game.player.y, this.x, this.y) < 90; }
  talk() { this.talkT = 1.2; if (this.sub === 'entrada') Locais.entrar(this.data.id); else Locais.cavar(this); }
  draw(ctx) {
    if (!this.visivel()) return;
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), rgb = this.lightRgb;
    ctx.save();
    if (this.sub === 'entrada') {
      // boca de escada no chão
      ctx.fillStyle = '#05040a'; ctx.strokeStyle = rgba(rgb, 0.8); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy - 18); ctx.lineTo(sx + 34, sy); ctx.lineTo(sx, sy + 18); ctx.lineTo(sx - 34, sy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = rgba(rgb, 0.35); ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) { const s = 1 - k * 0.22; ctx.beginPath(); ctx.moveTo(sx - 34 * s, sy + k * 3); ctx.lineTo(sx + 34 * s, sy + k * 3); ctx.stroke(); }
    } else {
      const k = 0.6 + 0.4 * Math.sin(this.t * 4);
      ctx.strokeStyle = rgba(rgb, 0.7 * k); ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { const a = this.t * 1.5 + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 6, sy + Math.sin(a) * 3); ctx.lineTo(sx + Math.cos(a) * 14, sy + Math.sin(a) * 7); ctx.stroke(); }
      ctx.fillStyle = 'rgba(60,40,24,0.8)'; ctx.beginPath(); ctx.ellipse(sx, sy, 12, 6, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  drawEmissive(ctx) {
    if (!this.visivel()) return;
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, this.lightRgb, sx, sy - 6, this.sub === 'entrada' ? 50 : 26, 0.3 + 0.1 * Math.sin(this.t * 3));
    ctx.restore();
    if (this.sub !== 'entrada') return;
    ctx.save();
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const s = Locais.S.masm[this.data.id], label = `▼ ${this.name}${s && s.vezes ? ' ✓' : ''} · NÍVEL ${WORLD_MASMORRAS[this.data.id].lv}`, w = ctx.measureText(label).width + 16;
    ctx.fillStyle = 'rgba(3,7,16,0.78)'; ctx.fillRect(sx - w / 2, sy - 44, w, 16);
    ctx.fillStyle = rgba(this.lightRgb, 0.95); ctx.fillText(label, sx, sy - 35.5);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }
}

const Locais = {
  get S() {
    const W = World.state;
    if (!W.locais) W.locais = {};
    const L = W.locais;
    L.masm = L.masm || {}; L.tes = L.tes || {}; L.zonas = L.zonas || [];
    return L;
  },
  masmorra(id) { return WORLD_MASMORRAS[id] || null; },
  sabeMasmorra(id) { const M = WORLD_MASMORRAS[id], s = this.S.masm[id]; return !!M && (!M.oculta || !!(s && (s.sabe || s.vezes))); },
  feita(id) { const s = this.S.masm[id]; return !!(s && s.vezes); },
  sabe(rv) {
    if (rv.masmorra) return this.sabeMasmorra(rv.masmorra);
    if (rv.tesouro) return !!this.S.tes[rv.tesouro];
    if (rv.zona) return this.S.zonas.includes(rv.zona) || World.state.descobertos.includes(rv.zona);
    return true;
  },
  // Rumor: marca no mapa; devolve o aviso para a conversa ('' quando já sabia)
  revelar(rv) {
    if (this.sabe(rv)) return '';
    if (rv.masmorra) { const M = WORLD_MASMORRAS[rv.masmorra]; this.S.masm[rv.masmorra] = Object.assign(this.S.masm[rv.masmorra] || {}, { sabe: true }); game.hud.toast(`Masmorra marcada no mapa · ${M.nome}`, '200,120,255'); return `${M.nome} marcada no mapa, em ${WORLD_ZONES[M.zona].name}`; }
    if (rv.tesouro) { const T = WORLD_TESOUROS[rv.tesouro]; this.S.tes[rv.tesouro] = 'sabe'; game.hud.toast(`Tesouro marcado no mapa · ${T.nome}`, '255,200,110'); return `${T.nome} marcado no mapa, em ${WORLD_ZONES[T.zona].name}`; }
    if (rv.zona) { this.S.zonas.push(rv.zona); game.hud.toast(`Lugar marcado no mapa · ${WORLD_ZONES[rv.zona].name}`, '120,220,255'); return `${WORLD_ZONES[rv.zona].name} marcada no mapa`; }
    return '';
  },
  // Mapa do tesouro (saque raro de elite): revela um tesouro ainda desconhecido de uma região aberta
  mapaDoTesouro() {
    const ids = Object.keys(WORLD_TESOUROS).filter((id) => !this.S.tes[id] && World.regionOpen(WORLD_ZONES[WORLD_TESOUROS[id].zona].region));
    if (!ids.length) return false;
    const id = pick(ids);
    game.hud.message('MAPA DO TESOURO', WORLD_TESOUROS[id].nome.toUpperCase(), 2.2, true);
    this.revelar({ tesouro: id });
    return true;
  },

  // ------------------------------------------------------------ zonas das masmorras
  // Cria os andares (zonas fora da grade: linhas 100+, uma coluna por masmorra)
  montar() {
    let col = 100;
    for (const id in WORLD_MASMORRAS) {
      const M = WORLD_MASMORRAS[id], n = 3;
      M.id = id;
      if (WORLD_ZONES[`${id}_0`]) { col++; continue; }   // já montada (js/mundo/expansao.js chama de novo para as novas)
      for (let k = 0; k < n; k++) {
        const ult = k === n - 1, lv = M.lv + k, tam = 3 + Math.floor(lv / 10) + k;
        const lugares = k === 0 ? [[0.3, 0.35], [0.7, 0.42]] : ult ? [[0.22, 0.7], [0.78, 0.68]] : [[0.25, 0.3], [0.74, 0.35], [0.5, 0.66]];
        const camps = lugares.map((at, j) => {
          const mobs = {};
          for (let q = 0; q < tam; q++) { const t = M.mobs[(q + j + k) % M.mobs.length]; mobs[t] = (mobs[t] || 0) + 1; }
          return { at, mobs };
        });
        const z = worldPrepZone(`${id}_${k}`, {
          region: M.reg, r: 100 + (n - 1 - k), c: col, name: `${M.nome} · ${WORLD_ANDARES[k]}`, theme: M.tema, lv,
          tiles: 13 + k, pillars: 3 + k, camps, chests: [], instancia: id, andar: k, ultimo: ult,
          secret: k === 1 ? { at: [0.92, 0.88], cells: Math.round(lv * 3), xp: lv * 10 } : undefined,
        });
        z.sub = `MASMORRA · ${worldRegion(M.reg).name.toUpperCase()} · NÍVEL ${lv}`;
      }
      col++;
    }
  },
  entrar(id) {
    const M = WORLD_MASMORRAS[id];
    if (!M || game.fadeCb) return;
    const pr = game.activeProgress().level;
    if (pr < M.lv - 6) game.hud.toast(`${M.nome}: nível recomendado ${M.lv} — perigoso para você`, '255,140,120');
    World.go(`${id}_0`, null, null, [0.5, 0.7]);   // longe da saída (no fundo da sala)
  },
  // Objetos das masmorras e dos tesouros na zona que acabou de carregar
  aoCarregar(z) {
    const g = game, R = g.room;
    for (const id in WORLD_MASMORRAS) {
      const M = WORLD_MASMORRAS[id];
      if (M.zona === z.id) { const pt = npcSpot(R, M.at[0], M.at[1]); g.npcs.push(new LocalProp('entrada', pt.x, pt.y, { id, nome: M.nome })); }
    }
    for (const id in WORLD_TESOUROS) {
      const T = WORLD_TESOUROS[id];
      if (T.zona === z.id && this.S.tes[id] !== 'achado') { const pt = npcSpot(R, T.at[0], T.at[1]); g.npcs.push(new LocalProp('tesouro', pt.x, pt.y, { id, nome: T.nome })); }
    }
    if (!z.instancia) return;
    const M = WORLD_MASMORRAS[z.instancia];
    this.S.masm[M.id] = Object.assign(this.S.masm[M.id] || {}, { sabe: true });
    // saída do primeiro andar (de volta à entrada)
    if (z.andar === 0) { const pt = npcSpot(R, 0.5, 0.94); g.npcs.push(new WorldProp('gate', pt.x, pt.y, { to: M.zona, dir: null, chegada: M.at, rotulo: `↩ SAÍDA · ${WORLD_ZONES[M.zona].name.toUpperCase()}` })); }
    if (!z.ultimo) return;
    // último andar: o chefe e o baú da masmorra (paga uma vez por dia do mundo)
    const pt = npcSpot(R, 0.5, 0.34), D = M.chefe;
    const camp = { def: { mobs: {} }, enemies: [], awake: false, x: pt.x, y: pt.y, chefeMissao: D.nome };
    const b = World.criarNaZona(D.tipo, pt.x, pt.y);
    b.makeElite(); b.maxHp = b.hp = Math.round(b.maxHp * D.hp); b.chefeNome = b.name = D.nome; b.chefeMasmorra = M.id; b.escala = (b.escala || 1) * 1.3;
    const lista = [b];
    let i = 0;
    for (const t in D.escolta || {}) for (let n = 0; n < D.escolta[t]; n++, i++) { const a = i * 2.4, x = pt.x + Math.cos(a) * 80, y = pt.y + Math.sin(a) * 80; lista.push(World.criarNaZona(t, R.canStand(x, y, 20) ? x : pt.x, R.canStand(x, y, 20) ? y : pt.y)); }
    for (const e of lista) { e.dormant = true; e.camp = camp; e.setState('idle'); camp.enemies.push(e); g.enemies.push(e); }
    World.camps.push(camp);
    const cp = npcSpot(R, 0.5, 0.1), dia = World.state.dia || 1, lv = z.lv;
    g.npcs.push(new WorldProp('chest', cp.x, cp.y, { key: `${z.id}:dia${dia}`, cells: Math.round(lv * 6), xp: lv * 20, heal: true, masmorra: M.id }));
  },
  chefeVivo() { return game.enemies.some((e) => e.chefeMasmorra && e.alive && e.state !== 'dying'); },
  // Andar de masmorra com inimigos de pé: a passagem para cima fica selada
  selada() { return !!(World.zone && World.zone.instancia) && game.enemies.some((e) => e.alive && e.state !== 'dying'); },
  onKill(e) {
    if (e.chefeMasmorra) this.vencer(e.chefeMasmorra, e);
    else if (e.elite && Math.random() < 0.04) this.mapaDoTesouro();
  },
  vencer(id, e) {
    const M = WORLD_MASMORRAS[id], s = this.S.masm[id] = Object.assign(this.S.masm[id] || {}, { sabe: true }), g = game, z = World.zone;
    const primeira = !s.vezes;
    s.vezes = (s.vezes || 0) + 1; s.dia = World.state.dia || 1;
    g.hud.message('MASMORRA CONCLUÍDA', M.nome.toUpperCase(), 3, false, true);
    g.audio.play('upgrade');
    if (primeira) { g.gainXP(80 * M.lv, e.x, e.y); Oficios.ganharRep(M.reg, 100); }
    else Oficios.ganharRep(M.reg, 20);
    // a saída (para outra zona, quando a masmorra tem caminho alternativo)
    const S = M.saida || { zona: M.zona, at: M.at }, pt = npcSpot(g.room, 0.5, 0.9);
    g.npcs.push(new WorldProp('gate', pt.x, pt.y, { to: S.zona, dir: null, chegada: S.at, rotulo: `↩ SAÍDA · ${WORLD_ZONES[S.zona].name.toUpperCase()}` }));
    if (M.saida && primeira) g.hud.toast(`Caminho alternativo: a saída leva a ${WORLD_ZONES[S.zona].name}`, '200,120,255');
    Aventuras.aoMasmorra(id);
    World.save();
    return primeira;
  },
  cavar(prop) {
    const T = WORLD_TESOUROS[prop.data.id], g = game, p = g.player;
    if (!T || this.S.tes[prop.data.id] === 'achado') return;
    this.S.tes[prop.data.id] = 'achado';
    g.hud.message('TESOURO ENCONTRADO', T.nome.toUpperCase(), 2.4, false, true);
    g.particles.sparks(prop.x, prop.y, 20, -Math.PI / 2, 16, '255,200,110', 300, Math.PI);
    g.audio.play('memory');
    const q = { reg: World.zone.region, nivel: World.zone.lv };
    Aventuras.pagar(q, T.rec);
    g.gainXP(40 + World.zone.lv * 8, prop.x, prop.y);
    World.save();
  },
  // Marcas no mapa do mundo: entradas conhecidas, tesouros marcados e lugares de rumor
  marcasMapa() {
    const out = [];
    for (const id in WORLD_MASMORRAS) if (this.sabeMasmorra(id)) { const M = WORLD_MASMORRAS[id]; out.push({ zona: M.zona, icon: '▼', rgb: '200,120,255', nome: M.nome, feito: this.feita(id) }); }
    for (const id in this.S.tes) if (this.S.tes[id] === 'sabe') { const T = WORLD_TESOUROS[id]; out.push({ zona: T.zona, icon: '✦', rgb: '255,200,110', nome: T.nome }); }
    for (const z of this.S.zonas) if (!World.state.descobertos.includes(z)) out.push({ zona: z, icon: '…', rgb: '120,220,255', nome: WORLD_ZONES[z].name });
    return out;
  },
};
Locais.montar();
