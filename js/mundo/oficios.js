'use strict';
// ECLIPSE ZERO · Mundo aberto: materiais, consumíveis, ofícios, reputação e serviços (Oficios)
// ---------------------------------------------------------------------------
// MATERIAIS: colhidos nos recursos de coleta (um por bioma, js/world.js), nos montes de sucata
// das zonas fechadas e no saque (sucata dos inimigos, núcleo das elites, essência dos chefes).
// Servem às RECEITAS do artesão e ao APRIMORAMENTO do ferreiro, e o mercador compra e vende.
// CONSUMÍVEIS: tônico (+dano), pele de pedra (+defesa), elixir (energia) e pedra de retorno
// (viagem rápida de qualquer lugar); a cápsula de reparo continua em WorldInv.
// OFÍCIOS: Coleta (mais material por coleta, chance de essência) e Criação (libera receitas e
// melhora a raridade da relíquia forjada), de 1 a 10, sobem com o uso.
// REPUTAÇÃO: uma facção por região; missões, eventos, masmorras e chefes dão reputação. Cada
// nível dá desconto com o mercador da região, e no nível Honrado ele vende a insígnia da facção.
// SERVIÇOS dos moradores (js/mundo/povo.js): curandeiro (cura por células), treinador (treino
// uma vez por dia do mundo), ferreiro (aprimora relíquias até +5) e artesão (receitas).
// Tudo fica em World.state.oficios (salvamento do mundo); nada disso vale fora do modo mundo.
// ---------------------------------------------------------------------------
const WORLD_MATERIAIS = {
  sucata: { nome: 'Sucata de Máquina', icon: '⚙', rgb: '170,182,204', preco: 4, desc: 'Peças de máquinas abatidas e montes de ferro-velho.' },
  erva: { nome: 'Erva Luminosa', icon: '❦', rgb: '150,255,140', preco: 7, desc: 'Cresce em Velmora; base de cápsulas e elixires.' },
  cristal: { nome: 'Cristal da Lagoa', icon: '◇', rgb: '120,235,255', preco: 9, desc: 'Guarda energia; vem da Lagoa Cristalina.' },
  fragmento: { nome: 'Fragmento Enterrado', icon: '▲', rgb: '255,205,120', preco: 10, desc: 'Metal antigo das areias de Seraph.' },
  gelo: { nome: 'Minério de Gelo', icon: '❄', rgb: '200,230,255', preco: 12, desc: 'Minério frio das encostas de Asterion.' },
  obsidiana: { nome: 'Obsidiana Bruta', icon: '⬟', rgb: '255,120,60', preco: 15, desc: 'Vidro vulcânico da Cratera de Obsidiano.' },
  nucleo: { nome: 'Núcleo Instável', icon: '◉', rgb: '255,96,130', preco: 22, desc: 'Coração de uma unidade de elite.' },
  essencia: { nome: 'Essência Carmesim', icon: '✦', rgb: '255,60,96', preco: 45, desc: 'Energia pura dos chefes e das masmorras.' },
};
// Material do recurso de coleta de cada bioma e o material típico de cada região
const WORLD_MAT_TEMA = { floresta: 'erva', lagoa: 'cristal', deserto: 'fragmento', neve: 'gelo', vulcao: 'obsidiana' };
const WORLD_MAT_REG = { carmesin: 'sucata', velmora: 'erva', lagoa: 'cristal', nexus: 'sucata', seraph: 'fragmento', asterion: 'gelo', obsidiano: 'obsidiana' };
const WORLD_CONSUMIVEIS = {
  tonico: { nome: 'Tônico de Fúria', icon: 'flame', rgb: '255,120,90', preco: 45, dur: 60, desc: '+20% de dano por 60 s' },
  pele: { nome: 'Poção Pele de Pedra', icon: 'shield', rgb: '170,205,255', preco: 45, dur: 60, desc: '+15% de defesa por 60 s' },
  elixir: { nome: 'Elixir de Energia', icon: 'bolt', rgb: '120,200,255', preco: 35, desc: 'Enche a energia na hora' },
  retorno: { nome: 'Pedra de Retorno', icon: 'teleport', rgb: '170,120,255', preco: 70, desc: 'Abre a viagem rápida de qualquer lugar' },
};
// Receitas do artesão ('regional': o material da região onde se cria)
const WORLD_RECEITAS = [
  { id: 'capsula', nome: 'Cápsula de reparo', nivel: 1, mat: { erva: 2, sucata: 2 }, desc: 'Cura 40% da vida (tecla 5)' },
  { id: 'elixir', nome: 'Elixir de Energia', nivel: 1, mat: { cristal: 2, erva: 1 }, desc: WORLD_CONSUMIVEIS.elixir.desc },
  { id: 'tonico', nome: 'Tônico de Fúria', nivel: 2, mat: { nucleo: 1, cristal: 2 }, desc: WORLD_CONSUMIVEIS.tonico.desc },
  { id: 'pele', nome: 'Poção Pele de Pedra', nivel: 2, mat: { gelo: 2, sucata: 2 }, desc: WORLD_CONSUMIVEIS.pele.desc },
  { id: 'retorno', nome: 'Pedra de Retorno', nivel: 3, mat: { fragmento: 2, nucleo: 1 }, desc: WORLD_CONSUMIVEIS.retorno.desc },
  { id: 'reliquia', nome: 'Relíquia forjada', nivel: 4, mat: { regional: 4, nucleo: 2, essencia: 1 }, desc: 'Relíquia rara ou melhor da região; a Criação melhora a raridade' },
];
// Facções (uma por região) e os níveis de reputação (desconto com o mercador da região)
const WORLD_FACCOES = {
  carmesin: { nome: 'Desconectados de Carmesin' }, velmora: { nome: 'Guardiões de Velmora' }, lagoa: { nome: 'Pescadores da Lagoa' },
  nexus: { nome: 'Resistência de Nexus' }, seraph: { nome: 'Nômades de Seraph' }, asterion: { nome: 'Vigília de Asterion' },
  obsidiano: { nome: 'Forjadores da Cratera' },
};
const WORLD_REP = [
  { nome: 'Neutro', min: 0, desc: 0 }, { nome: 'Amigável', min: 150, desc: 0.05 }, { nome: 'Honrado', min: 400, desc: 0.1 },
  { nome: 'Reverenciado', min: 900, desc: 0.15 }, { nome: 'Exaltado', min: 1800, desc: 0.2 },
];
// Insígnia de cada facção: relíquia única, à venda no mercador da região a partir de Honrado
const WORLD_INSIGNIAS = {
  carmesin: { unico: 'Insígnia dos Desconectados', b: 'placa', st: { vida: 40, defesa: 0.04 } },
  velmora: { unico: 'Folha Eterna de Velmora', b: 'servo', st: { veloc: 0.06, vida: 30 } },
  lagoa: { unico: 'Concha do Farol', b: 'bateria', st: { energia: 30, recarga: 0.05 } },
  nexus: { unico: 'Chave da Resistência', b: 'lente', st: { critico: 0.06, dano: 0.05 } },
  seraph: { unico: 'Bússola dos Nômades', b: 'servo', st: { veloc: 0.07, critico: 0.04 } },
  asterion: { unico: 'Brasão da Vigília', b: 'escudo', st: { defesa: 0.08, vida: 50 } },
  obsidiano: { unico: 'Selo do Primeiro Fogo', b: 'nucleo', st: { dano: 0.1, recarga: 0.05 } },
};
// Experiência acumulada para cada nível de ofício (1 a 10)
const WORLD_OFICIO_XP = [0, 60, 150, 280, 460, 700, 1000, 1380, 1850, 2400];

const Oficios = {
  get S() {
    const W = World.state;
    if (!W.oficios) W.oficios = {};
    const O = W.oficios;
    O.mat = O.mat || {}; O.cons = O.cons || {}; O.xp = O.xp || { coleta: 0, criacao: 0 }; O.rep = O.rep || {}; O.insignias = O.insignias || [];
    return O;
  },
  matNome(k) { return k === 'regional' ? this.matNome(this.regional()) : (WORLD_MATERIAIS[k] || { nome: k }).nome; },
  regional(reg = World.zone ? World.zone.region : 'carmesin') { return WORLD_MAT_REG[reg] || 'sucata'; },
  mat(k) { return this.S.mat[k] || 0; },
  // Guarda materiais (aviso discreto); devolve a quantidade guardada
  dar(k, n = 1, avisar = true) {
    if (!WORLD_MATERIAIS[k] || n <= 0) return 0;
    const S = this.S;
    S.mat[k] = Math.min(999, (S.mat[k] || 0) + n);
    if (avisar) game.hud.toast(`+${n} ${WORLD_MATERIAIS[k].nome}`, WORLD_MATERIAIS[k].rgb);
    if (typeof Aventuras !== 'undefined') Aventuras.check();
    return n;
  },
  // Lista de materiais com 'regional' resolvido
  resolver(mat) { const r = {}; for (const k in mat) { const kk = k === 'regional' ? this.regional() : k; r[kk] = (r[kk] || 0) + mat[k]; } return r; },
  tem(mat) { const R = this.resolver(mat); for (const k in R) if (this.mat(k) < R[k]) return false; return true; },
  gastar(mat) {
    if (!this.tem(mat)) return false;
    const R = this.resolver(mat);
    for (const k in R) this.S.mat[k] -= R[k];
    return true;
  },
  falta(mat) { const R = this.resolver(mat), f = []; for (const k in R) if (this.mat(k) < R[k]) f.push(`${R[k] - this.mat(k)} ${this.matNome(k)}`); return f.join(', '); },
  fmtMat(mat) { const R = this.resolver(mat); return Object.keys(R).map((k) => `${R[k]} ${this.matNome(k)}`).join(' + '); },

  // ------------------------------------------------------------ ofícios
  nivel(of) { const x = this.S.xp[of] || 0; let n = 1; while (n < WORLD_OFICIO_XP.length && x >= WORLD_OFICIO_XP[n]) n++; return n; },
  ganharXp(of, n) {
    const antes = this.nivel(of);
    this.S.xp[of] = (this.S.xp[of] || 0) + n;
    const depois = this.nivel(of);
    if (depois > antes) { game.hud.toast(`${of === 'coleta' ? 'COLETA' : 'CRIAÇÃO'} · nível ${depois}`, '255,212,122'); game.audio.play('upgrade'); }
  },
  // Recurso de coleta colhido: o material do bioma (mais com o ofício) e às vezes essência
  aoColetar(d) {
    const k = d.mat || WORLD_MAT_TEMA[World.zone.theme] || 'sucata', nv = this.nivel('coleta');
    const n = 1 + Math.floor(nv / 3);
    this.dar(k, n);
    if (nv >= 5 && Math.random() < 0.05 + nv * 0.01) this.dar('essencia', 1);
    this.ganharXp('coleta', 12);
  },
  // Saque de materiais: sucata dos inimigos comuns, núcleo das elites, essência dos chefes
  aoAbater(e) {
    if (e.worldBoss) { this.dar('essencia', 2); this.dar('nucleo', 2); return; }
    if (e.chefeNome) { this.dar('essencia', 1); return; }
    if (e.elite && Math.random() < 0.4) this.dar('nucleo', 1);
    else if (Math.random() < 0.18) this.dar('sucata', 1, false);
  },

  // ------------------------------------------------------------ reputação
  rep(fac) { return this.S.rep[fac] || 0; },
  repNivel(fac) { const v = this.rep(fac); let i = 0; while (i + 1 < WORLD_REP.length && v >= WORLD_REP[i + 1].min) i++; return i; },
  ganharRep(fac, n) {
    if (!WORLD_FACCOES[fac] || !n) return;
    const antes = this.repNivel(fac);
    this.S.rep[fac] = Math.max(0, this.rep(fac) + n);
    game.hud.toast(`${n > 0 ? '+' : ''}${n} reputação · ${WORLD_FACCOES[fac].nome}`, n > 0 ? '150,220,255' : '255,140,140');
    const depois = this.repNivel(fac);
    if (depois > antes) {
      game.hud.message(WORLD_REP[depois].nome.toUpperCase(), WORLD_FACCOES[fac].nome.toUpperCase(), 2.4, false, true);
      game.audio.play('upgrade');
    }
  },
  desconto(reg) { return WORLD_REP[this.repNivel(reg)].desc; },
  precoCom(v, reg) { return Math.max(1, Math.round(v * (1 - this.desconto(reg)))); },

  // ------------------------------------------------------------ consumíveis
  cons(k) { return this.S.cons[k] || 0; },
  darCons(k, n = 1) { this.S.cons[k] = Math.min(9, this.cons(k) + n); },
  usar(k) {
    const C = WORLD_CONSUMIVEIS[k], p = game.player;
    if (!C || !p || p.state === 'dead') return false;
    if (this.cons(k) <= 0) { game.hud.toast(`Sem ${C.nome}`, '255,92,122'); game.audio.play('uiDeny'); return false; }
    if (k === 'elixir' && p.fury >= p.maxEnergy) { game.hud.toast('Energia já está cheia', '200,214,235'); return false; }
    this.S.cons[k]--;
    if (k === 'tonico' || k === 'pele') { p.buffs[k] = C.dur; p.recalc(false); }
    else if (k === 'elixir') p.fury = p.maxEnergy;
    else if (k === 'retorno') { if (game.state === 'worldinv') game.state = 'playing'; World.openMap(true); }
    game.particles.ring(p.x, p.y, 44, C.rgb, 0.5, 4);
    game.audio.play('health');
    game.hud.toast(`${C.nome} · ${C.desc.toLowerCase()}`, C.rgb);
    return true;
  },
  // Efeito dos consumíveis ativos nos atributos (Player.recalc → WorldInv.apply)
  apply(S) {
    const b = game.player && game.player.buffs;
    if (!b) return;
    if (b.tonico > 0) S.dmgMult += 0.2;
    if (b.pele > 0) S.armor += 0.15;
  },
  fimBuff(p, k) { if (k === 'tonico' || k === 'pele') p.recalc(false); },
  hudBuffs(p, B) {
    if (p.buffs.tonico > 0) B.push(['flame', p.buffs.tonico, WORLD_CONSUMIVEIS.tonico.rgb, 'Tônico']);
    if (p.buffs.pele > 0) B.push(['shield', p.buffs.pele, WORLD_CONSUMIVEIS.pele.rgb, 'Pele de Pedra']);
  },

  // ------------------------------------------------------------ serviços
  cobrar(v) {
    const g = game;
    if (g.stats.soulsBank < v) return `Faltam ${v - g.stats.soulsBank} células.`;
    g.stats.soulsBank -= v;
    g.audio.play('uiSelect');
    return '';
  },
  precoCura() { return 12 + worldRegion(World.zone.region).order * 8; },
  // Curandeiro: vida e energia cheias. Devolve o texto da resposta
  curar() {
    const p = game.player;
    if (p.hp >= p.maxHp && p.fury >= p.maxEnergy) return 'Você está inteiro. Volte quando precisar.';
    const err = this.cobrar(this.precoCura());
    if (err) return err;
    p.hp = p.maxHp; p.fury = Math.max(p.fury, p.maxEnergy); game.hud.ghostHp = p.hp;
    game.particles.ring(p.x, p.y, 50, '90,255,160', 0.6, 5);
    game.audio.play('health');
    return '';
  },
  precoTreino() { return 30 + game.activeProgress().level * 6; },
  treinoFeito() { return (this.S.treinoDia || 0) >= (World.state.dia || 1); },
  // Treinador: uma sessão por dia do mundo (um quarto do nível em experiência)
  treinar() {
    if (this.treinoFeito()) return 'Já treinamos hoje. O corpo também aprende descansando.';
    const err = this.cobrar(this.precoTreino());
    if (err) return err;
    this.S.treinoDia = World.state.dia || 1;
    const pr = game.activeProgress(), p = game.player;
    game.gainXP(Math.max(40, Math.round(pr.xpNext * 0.25)), p.x, p.y);
    return '';
  },

  // ------------------------------------------------------------ ferreiro
  AP_MAX: 5,
  custoAprimorar(it) {
    const ap = it.ap || 0, mat = { sucata: 2 + ap * 2 };
    if (ap >= 2) mat.nucleo = ap - 1;
    if (ap >= 4) mat.essencia = 1;
    return { cel: Math.round(WorldInv.valor(it) * (0.35 + ap * 0.15)), mat };
  },
  // Devolve '' quando aprimorou, ou o motivo
  aprimorar(id) {
    const it = WorldInv.item(id);
    if (!it) return 'Escolha uma relíquia.';
    if ((it.ap || 0) >= this.AP_MAX) return 'Esta já está no máximo (+5).';
    const C = this.custoAprimorar(it);
    if (!this.tem(C.mat)) return `Faltam ${this.falta(C.mat)}.`;
    if (game.stats.soulsBank < C.cel) return `Faltam ${C.cel - game.stats.soulsBank} células.`;
    game.stats.soulsBank -= C.cel;
    this.gastar(C.mat);
    it.ap = (it.ap || 0) + 1;
    WorldInv.refazer();
    game.audio.play('upgrade');
    return '';
  },

  // ------------------------------------------------------------ artesão
  receita(id) { return WORLD_RECEITAS.find((r) => r.id === id) || null; },
  // Devolve '' quando criou, ou o motivo
  criar(id) {
    const R = this.receita(id);
    if (!R) return 'Receita desconhecida.';
    if (this.nivel('criacao') < R.nivel) return `Requer Criação nível ${R.nivel}.`;
    if (!this.tem(R.mat)) return `Faltam ${this.falta(R.mat)}.`;
    if (id === 'capsula' && WorldInv.S.capsulas >= WorldInv.CAPS) return 'A mochila já tem 5 cápsulas.';
    if (id !== 'capsula' && id !== 'reliquia' && this.cons(id) >= 9) return 'Você já carrega 9 destes.';
    if (id === 'reliquia' && WorldInv.S.itens.length >= WorldInv.MAX) return 'Mochila cheia.';
    this.gastar(R.mat);
    if (id === 'capsula') WorldInv.S.capsulas++;
    else if (id === 'reliquia') {
      const z = World.zone, nv = this.nivel('criacao');
      WorldInv.ganhar(WorldInv.gerar(Math.max(z.lv, game.activeProgress().level), z.region, 2, 0.15 + nv * 0.06));
    } else this.darCons(id, 1);
    this.ganharXp('criacao', 15 + R.nivel * 8);
    game.audio.play('memory');
    return '';
  },

  // ------------------------------------------------------------ insígnias
  insignia(reg) { return WORLD_INSIGNIAS[reg] || null; },
  podeInsignia(reg) { return this.repNivel(reg) >= 2 && !this.S.insignias.includes(reg); },
  precoInsignia(reg) { const z = worldZonesOf(reg).find((q) => q.hub); return Math.round((40 + (z ? z.lv : 1) * 6) * 6); },
  comprarInsignia(reg) {
    const I = this.insignia(reg);
    if (!I || !this.podeInsignia(reg)) return 'Indisponível.';
    if (WorldInv.S.itens.length >= WorldInv.MAX) return 'Mochila cheia.';
    const err = this.cobrar(this.precoInsignia(reg));
    if (err) return err;
    this.S.insignias.push(reg);
    const z = worldZonesOf(reg).find((q) => q.hub) || World.zone;
    WorldInv.ganhar({ id: 0, b: I.b, r: 4, lv: z.lv + 2, reg, st: Object.assign({}, I.st), unico: I.unico });
    return '';
  },

  // ------------------------------------------------------------ aba OFÍCIOS da mochila
  // Itens navegáveis: consumíveis (usar) e materiais (vender ao mercador)
  lista() {
    return Object.keys(WORLD_CONSUMIVEIS).map((k) => ({ cons: k })).concat(Object.keys(WORLD_MATERIAIS).map((k) => ({ mat: k })));
  },
  agir(q, shop) {
    if (!q) return;
    if (q.cons) { if (this.usar(q.cons) && game.state === 'worldinv') WorldInv.aviso(`Usou ${WORLD_CONSUMIVEIS[q.cons].nome}`, true); return; }
    if (q.mat) {
      if (!shop) { WorldInv.aviso('Materiais se vendem ao mercador (fale com ele)'); return; }
      if (this.mat(q.mat) <= 0) { WorldInv.aviso('Nada para vender'); return; }
      const v = Math.max(1, Math.round(WORLD_MATERIAIS[q.mat].preco * 0.5));
      this.S.mat[q.mat]--; game.stats.soulsBank += v; game.audio.play('soul');
      WorldInv.aviso(`Vendeu 1 ${WORLD_MATERIAIS[q.mat].nome} · +${v} células`, true);
    }
  },
  draw(ctx, Ly, L, sel, shop) {
    const x0 = Ly.lx, top = Ly.top, colW = (VIEW_W - 72 - 24) / 2, U = WorldInv.ui;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const titulo = (t, x, y) => { ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(150,205,255,0.9)'; ctx.fillText(t, x, y); ctx.letterSpacing = '0px'; };
    // consumíveis e materiais (coluna da esquerda, em duas subcolunas)
    titulo('CONSUMÍVEIS', x0, top - 12);
    const rh = clamp((Ly.det - top - 44) / 8.6 - 4, 18, 34);
    L.forEach((q, i) => {
      const isC = !!q.cons, k = isC ? q.cons : q.mat, D = isC ? WORLD_CONSUMIVEIS[k] : WORLD_MATERIAIS[k];
      const idx = isC ? i : i - Object.keys(WORLD_CONSUMIVEIS).length;
      const cx = isC ? x0 : x0 + (idx % 2) * (colW / 2 + 4), cy = isC ? top + i * (rh + 4) : top + (Object.keys(WORLD_CONSUMIVEIS).length + 0.6) * (rh + 4) + 14 + Math.floor(idx / 2) * (rh + 4);
      const w = isC ? colW : colW / 2 - 4, n = isC ? this.cons(k) : this.mat(k);
      if (!isC && idx === 0) titulo('MATERIAIS', x0, cy - 14);
      ctx.fillStyle = sel === i ? 'rgba(40,70,130,0.65)' : 'rgba(12,20,36,0.85)'; ctx.fillRect(cx, cy, w, rh);
      ctx.strokeStyle = sel === i ? '#ffffff' : rgba(D.rgb, n > 0 ? 0.5 : 0.18); ctx.lineWidth = sel === i ? 2 : 1; ctx.strokeRect(cx + 0.5, cy + 0.5, w - 1, rh - 1);
      U.rects.push({ idx: i, x: cx, y: cy, w, h: rh });
      ctx.globalAlpha = n > 0 ? 1 : 0.45;
      if (isC) drawSkillIcon(ctx, D.icon, cx + 16, cy + rh / 2, 16, rgba(D.rgb, 1));
      else { ctx.font = `bold 14px ${FONT_UI}`; ctx.fillStyle = rgba(D.rgb, 1); ctx.textAlign = 'center'; ctx.fillText(D.icon, cx + 14, cy + rh / 2 + 1); ctx.textAlign = 'left'; }
      ctx.font = `${isC ? 'bold ' : ''}12px ${FONT_UI}`; ctx.fillStyle = '#eef3fa';
      ctx.fillText(isC ? `${D.nome} · ${D.desc}` : D.nome, cx + 30, cy + rh / 2 + 1);
      ctx.textAlign = 'right'; ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = n > 0 ? '#9fd0ff' : 'rgba(160,175,200,0.7)';
      ctx.fillText(`×${n}`, cx + w - 10, cy + rh / 2 + 1);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    });
    // ofícios e reputação (coluna da direita)
    const x1 = x0 + colW + 24;
    titulo('OFÍCIOS', x1, top - 12);
    [['coleta', 'COLETA', 'mais material por coleta; essência a partir do nível 5'], ['criacao', 'CRIAÇÃO', 'novas receitas; relíquias forjadas mais raras']].forEach(([of, nome, info], k) => {
      const y = top + k * 46, nv = this.nivel(of), x = this.S.xp[of] || 0, a = WORLD_OFICIO_XP[nv - 1], b = WORLD_OFICIO_XP[nv];
      ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = '#ffffff'; ctx.fillText(`${nome} · nível ${nv}`, x1, y + 6);
      ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.75)'; ctx.fillText(info, x1, y + 22);
      const bw = colW - 4, f = b === undefined ? 1 : clamp((x - a) / (b - a), 0, 1);
      ctx.fillStyle = 'rgba(30,40,60,0.9)'; ctx.fillRect(x1, y + 31, bw, 5);
      ctx.fillStyle = '#ffd47a'; ctx.fillRect(x1, y + 31, bw * f, 5);
    });
    const ry = top + 2 * 46 + 18;
    titulo('REPUTAÇÃO', x1, ry);
    const regs = WORLD_REGIONS.slice().sort((a, b) => a.order - b.order);
    const lh = clamp((Ly.det - ry - 24) / regs.length, 16, 26);
    regs.forEach((R, k) => {
      const y = ry + 18 + k * lh, nv = this.repNivel(R.id), v = this.rep(R.id), a = WORLD_REP[nv].min, b = WORLD_REP[nv + 1] ? WORLD_REP[nv + 1].min : a;
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = rgba(R.rgb, 0.95); ctx.fillText(WORLD_FACCOES[R.id].nome, x1, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#eef3fa'; ctx.fillText(`${WORLD_REP[nv].nome}${WORLD_REP[nv].desc ? ` · −${Math.round(WORLD_REP[nv].desc * 100)}%` : ''}`, x1 + colW - 4, y);
      ctx.textAlign = 'left';
      const bw = colW * 0.36, bx = x1 + colW * 0.42;
      ctx.fillStyle = 'rgba(30,40,60,0.9)'; ctx.fillRect(bx, y - 2, bw, 4);
      ctx.fillStyle = rgba(R.rgb, 0.9); ctx.fillRect(bx, y - 2, bw * (b > a ? clamp((v - a) / (b - a), 0, 1) : 1), 4);
    });
    // detalhe do item escolhido
    const q = L[sel], y = Ly.det, w = VIEW_W - 72;
    ctx.fillStyle = 'rgba(8,14,28,0.92)'; ctx.fillRect(36, y, w, 132);
    ctx.strokeStyle = 'rgba(90,150,255,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(36.5, y + 0.5, w - 1, 131);
    if (!q) return;
    const D = q.cons ? WORLD_CONSUMIVEIS[q.cons] : WORLD_MATERIAIS[q.mat];
    ctx.font = `bold 18px ${FONT_TITLE}`; ctx.fillStyle = rgba(D.rgb, 1); ctx.fillText(D.nome.toUpperCase(), 54, y + 24);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)';
    ctx.fillText(q.cons ? `${D.desc} · o artesão cria; o mercador e o curandeiro vendem` : `${D.desc} Vale ${Math.max(1, Math.round(D.preco * 0.5))} células no mercador.`, 54, y + 48);
    const label = q.cons ? 'USAR' : shop ? 'VENDER 1' : '';
    if (label) {
      ctx.font = `bold 13px ${FONT_TITLE}`;
      const bw = ctx.measureText(label).width + 34, bx = 36 + w - 18 - bw;
      ctx.fillStyle = 'rgba(30,70,140,0.85)'; ctx.fillRect(bx, y + 84, bw, 34);
      ctx.strokeStyle = 'rgba(150,205,255,0.85)'; ctx.strokeRect(bx + 0.5, y + 84.5, bw - 1, 33);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(label, bx + bw / 2, y + 101);
      U.rects.push({ btn: 'main', x: bx, y: y + 84, w: bw, h: 34 });
      ctx.textAlign = 'left';
    }
  },

  // ------------------------------------------------------------ abas FERREIRO e ARTESÃO
  listaFerreiro() { const eq = WorldInv.S.equip.filter(Boolean); return eq.concat(WorldInv.S.itens.map((it) => it.id).filter((id) => !eq.includes(id))).map((id) => ({ ap: id })); },
  listaArtesao() { return WORLD_RECEITAS.map((r) => ({ rec: r.id })); },
  agirServico(q) {
    if (!q) return;
    const err = q.ap !== undefined ? this.aprimorar(q.ap) : this.criar(q.rec);
    if (err) WorldInv.aviso(err);
    else if (q.ap !== undefined) { const it = WorldInv.item(q.ap); WorldInv.aviso(`${WorldInv.nome(it)} aprimorada para +${it.ap}`, true); }
    else WorldInv.aviso(`Criou ${this.receita(q.rec).nome}`, true);
  },
  drawServico(ctx, Ly, L, sel, tipo) {
    const U = WorldInv.ui, w = VIEW_W - 72, x0 = Ly.lx;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(150,205,255,0.9)';
    ctx.fillText(tipo === 'ferreiro' ? 'FERREIRO · APRIMORAR RELÍQUIAS (ATÉ +5, +10% NOS ATRIBUTOS POR NÍVEL)' : `ARTESÃO · RECEITAS · CRIAÇÃO NÍVEL ${this.nivel('criacao')}`, x0, Ly.top - 12);
    ctx.letterSpacing = '0px';
    const cols = VIEW_W >= 900 ? 2 : 1, per = Math.ceil(L.length / cols) || 1, cw = (w - (cols - 1) * 16) / cols;
    const rh = clamp((Ly.det - Ly.top - 20) / Math.max(per, 1) - 6, 26, 56);
    if (!L.length) { ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.75)'; ctx.fillText('Nenhuma relíquia para aprimorar. Abra baús e derrote inimigos.', x0, Ly.top + 20); }
    L.forEach((q, i) => {
      const c = Math.floor(i / per), r = i % per, x = x0 + c * (cw + 16), y = Ly.top + r * (rh + 6);
      if (y + rh > Ly.det - 8) return;
      ctx.fillStyle = sel === i ? 'rgba(40,70,130,0.65)' : 'rgba(12,20,36,0.85)'; ctx.fillRect(x, y, cw, rh);
      ctx.strokeStyle = sel === i ? '#ffffff' : 'rgba(90,120,170,0.4)'; ctx.lineWidth = sel === i ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, rh - 1);
      U.rects.push({ idx: i, x, y, w: cw, h: rh });
      ctx.textAlign = 'left';
      if (q.ap !== undefined) {
        const it = WorldInv.item(q.ap), R = WorldInv.rar(it), C = this.custoAprimorar(it), max = (it.ap || 0) >= this.AP_MAX;
        WorldInv.drawCell(ctx, it, x + 4, y + 3, rh - 6, false, WorldInv.S.equip.includes(it.id));
        ctx.textAlign = 'left'; ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = rgba(R.rgb, 1); ctx.fillText(WorldInv.nome(it), x + rh + 6, y + rh * 0.32);
        ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = max ? '#7dffb0' : this.tem(C.mat) && game.stats.soulsBank >= C.cel ? 'rgba(200,214,235,0.9)' : '#ff9aaa';
        ctx.fillText(max ? 'no máximo (+5)' : `+${(it.ap || 0) + 1}: ${C.cel} células + ${this.fmtMat(C.mat)}`, x + rh + 6, y + rh * 0.72);
      } else {
        const R = this.receita(q.rec), ok = this.nivel('criacao') >= R.nivel, tem = this.tem(R.mat);
        ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = ok ? '#ffffff' : 'rgba(160,175,200,0.6)'; ctx.fillText(`${R.nome}${ok ? '' : ` · Criação ${R.nivel}`}`, x + 12, y + rh * 0.32);
        ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = ok && tem ? 'rgba(200,214,235,0.9)' : '#ff9aaa';
        ctx.fillText(this.fmtMat(R.mat), x + 12, y + rh * 0.72);
        ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(200,214,235,0.6)'; ctx.fillText(R.desc, x + cw - 10, y + rh * 0.32); ctx.textAlign = 'left';
      }
    });
    const q = L[sel];
    if (q && q.ap !== undefined) {
      const it = WorldInv.item(q.ap);
      WorldInv.drawDetalhe(ctx, Ly, it, (it.ap || 0) < this.AP_MAX ? [['main', `APRIMORAR +${(it.ap || 0) + 1}`]] : [], `Você tem ${game.stats.soulsBank} células · materiais na aba OFÍCIOS`);
    } else if (q) {
      const R = this.receita(q.rec);
      WorldInv.drawDetalhe(ctx, Ly, null, [['main', 'CRIAR']], `${this.fmtMat(R.mat)} · ${this.tem(R.mat) ? 'você tem tudo' : `faltam ${this.falta(R.mat)}`}`, R.nome.toUpperCase());
    } else WorldInv.drawDetalhe(ctx, Ly, null, [], '');
  },
};
