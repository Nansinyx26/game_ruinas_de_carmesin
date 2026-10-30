'use strict';
// ECLIPSE ZERO · Mundo aberto: fabricação, planos, aprimoramentos, armazém e inventário (Fabrica)
// ---------------------------------------------------------------------------
// ESTAÇÕES (no Refúgio da Aurora, js/mundo/cidade.js; cada uma abre com o NPC ou a bancada):
//   forja        peças da armadura modular (js/mundo/arsenal.js) e o aprimoramento delas (+1 a +5)
//   armas        aprimoramento da arma de cada herói (+1 a +5, +6% de dano por nível)
//   laboratorio  acessórios das famílias e a relíquia forjada
//   engenharia   ferramentas de coleta (mais material por coleta), pedra de retorno, fogueira
//   alquimia     cápsulas, elixires, tônicos, chá quente e refresco (as receitas do artesão)
// RECEITA: materiais e quantidades, células, nível de Criação (ofício) e nível do herói; a de
// uma família nova pede o PLANO. "Fabricar" só funciona com tudo em mãos: gasta exatamente o
// que mostra e põe o resultado na mochila (sem fila nem tempo de espera). A raridade da peça
// fabricada melhora com a Criação. Vender uma peça paga menos que o material dela custa: não
// há como fabricar para lucrar.
// PLANOS (receitas de família): o armeiro da cidade vende alguns; baús às vezes têm um; cada
// chefe regional deixa o da sua região; missões secundárias e manuais técnicos nos terminais às
// vezes ensinam um; o pesquisador estuda materiais raros e libera o próximo. Ele também
// identifica as Amostras Desconhecidas (viram um material raro).
// ARMAZÉM pessoal (na cidade): materiais e peças guardados fora da mochila.
// INVENTÁRIO (aba da mochila): tudo por categoria — armas, peças, materiais, consumíveis,
// acessórios (relíquias e acessórios), itens de missão e receitas — com busca por nome.
// Tudo em World.state (o salvamento do mundo).
// ---------------------------------------------------------------------------
const FAB_ESTACOES = {
  forja: { nome: 'Forja de armaduras', papel: 'Ferreiro', desc: 'Capacetes, peitorais, ombreiras, luvas, calças, botas e capas; aprimora as peças.', rgb: '255,150,80' },
  armas: { nome: 'Bancada de armas', papel: 'Armeiro', desc: 'Aprimora a arma de cada herói (+6% de dano por nível, até +5).', rgb: '255,200,120' },
  laboratorio: { nome: 'Laboratório tecnológico', papel: 'Engenheira', desc: 'Acessórios, módulos e a relíquia forjada.', rgb: '120,230,255' },
  engenharia: { nome: 'Bancada de engenharia', papel: 'Engenheira', desc: 'Ferramentas de coleta, pedra de retorno e fogueira portátil.', rgb: '150,200,255' },
  alquimia: { nome: 'Alquimia', papel: 'Alquimista', desc: 'Cápsulas, elixires, tônicos, chá quente e refresco.', rgb: '150,255,170' },
};
// Plano de família que cada chefe regional deixa
const FAB_PLANO_CHEFE = { carmesin: 'placas', velmora: 'inverno', lagoa: 'cristal', nexus: 'placas', seraph: 'deserto', asterion: 'inverno', obsidiano: 'obsidiana' };
const FAB_PLANOS = ['inverno', 'deserto', 'placas', 'cristal', 'obsidiana', 'eclipse'];
// Ferramentas de coleta (engenharia): +1 material por coleta em cada nível
const FAB_FERRAMENTAS = [
  { n: 1, nome: 'Kit de Coleta', mat: { sucata: 4, ferro: 3, couro: 1 }, cel: 60, nivel: 1, req: 3 },
  { n: 2, nome: 'Picareta de Liga', mat: { ferro: 6, engrenagem: 3, cristal: 2 }, cel: 220, nivel: 4, req: 14 },
  { n: 3, nome: 'Extrator de Plasma', mat: { engrenagem: 5, circuito: 3, nucleo: 2 }, cel: 600, nivel: 7, req: 24 },
];

const Fabrica = {
  ui: { cat: 0, busca: '', digitando: false },
  _rec: null,
  // ---------------------------------------------------------------- receitas
  receitas() {
    if (this._rec) return this._rec;
    const L = [];
    for (const fam in ARS_FAMILIAS) {
      const F = ARS_FAMILIAS[fam];
      for (const slot of ARS_ORDEM) {
        const est = slot === 'acessorio' ? 'laboratorio' : 'forja', vb = Arsenal.valorBase(slot, fam);
        L.push({ id: `p_${fam}_${slot}`, est, nome: Arsenal.nomeBase(slot, fam), nivel: Math.max(1, F.tier * 2 - 2), req: [1, 1, 6, 12, 18, 25, 30][F.tier],
          mat: Arsenal.custoMat(slot, fam), cel: Math.round(vb * 0.25), plano: F.plano ? fam : null, out: { peca: [slot, fam] },
          desc: `${ARS_VAGAS[slot].nome} · ${ARS_TECIDOS[F.tec].nome}${slot === 'acessorio' ? ` · ${ARS_ACESSORIOS[F.acc].desc}` : ''}` });
      }
    }
    for (const R of WORLD_RECEITAS) {
      const est = R.id === 'reliquia' ? 'laboratorio' : R.id === 'retorno' || R.id === 'fogueira' ? 'engenharia' : 'alquimia';
      L.push({ id: `o_${R.id}`, est, nome: R.nome, nivel: R.nivel, req: 1, mat: R.mat, cel: 0, plano: null, out: { oficio: R.id }, desc: R.desc });
    }
    for (const T of FAB_FERRAMENTAS) L.push({ id: `f_${T.n}`, est: 'engenharia', nome: T.nome, nivel: T.nivel, req: T.req, mat: T.mat, cel: T.cel, plano: null, out: { ferramenta: T.n }, desc: `+${T.n} material em cada coleta` });
    return (this._rec = L);
  },
  receita(id) { return this.receitas().find((r) => r.id === id) || null; },
  daEstacao(est) { return this.receitas().filter((r) => r.est === est); },
  conhece(R) { return !R.plano || Arsenal.S.receitas.includes(`fam:${R.plano}`); },
  sabePlano(fam) { return !ARS_FAMILIAS[fam].plano || Arsenal.S.receitas.includes(`fam:${fam}`); },
  // Aprende o plano de uma família (todas as peças dela); devolve true se era novo
  aprender(fam, fonte = '') {
    if (!ARS_FAMILIAS[fam] || this.sabePlano(fam)) return false;
    Arsenal.S.receitas.push(`fam:${fam}`);
    game.hud.message(`PLANO ${ARS_FAMILIAS[fam].nome.toUpperCase()}`, `RECEITAS NOVAS NA FORJA${fonte ? ` · ${fonte.toUpperCase()}` : ''}`, 2.6, false, true);
    game.audio.play('memory');
    return true;
  },
  planoNovo(maxTier = 9) { return FAB_PLANOS.find((f) => !this.sabePlano(f) && ARS_FAMILIAS[f].tier <= maxTier) || null; },
  // Por que não dá para fabricar (ou '' quando dá)
  pode(R) {
    if (!R) return 'Receita desconhecida.';
    if (!this.conhece(R)) return `Precisa do plano ${ARS_FAMILIAS[R.plano].nome}.`;
    if (Oficios.nivel('criacao') < R.nivel) return `Requer Criação nível ${R.nivel}.`;
    if (game.activeProgress().level < R.req) return `Requer o herói no nível ${R.req}.`;
    if (!Oficios.tem(R.mat)) return `Faltam ${Oficios.falta(R.mat)}.`;
    if (game.stats.soulsBank < R.cel) return `Faltam ${R.cel - game.stats.soulsBank} células.`;
    const o = R.out;
    if (o.ferramenta && (Arsenal.S.ferramenta || 0) >= o.ferramenta) return 'Você já tem esta ferramenta (ou melhor).';
    if (o.ferramenta && (Arsenal.S.ferramenta || 0) < o.ferramenta - 1) return 'Fabrique a ferramenta anterior primeiro.';
    if (o.oficio) { const id = o.oficio; if (id === 'capsula' && WorldInv.S.capsulas >= WorldInv.CAPS) return 'A mochila já tem 5 cápsulas.'; if (id !== 'capsula' && id !== 'reliquia' && Oficios.cons(id) >= 9) return 'Você já carrega 9 destes.'; if (id === 'reliquia' && WorldInv.S.itens.length >= WorldInv.MAX) return 'Mochila de relíquias cheia.'; }
    return '';
  },
  // Fabrica: gasta exatamente o que a receita mostra e entrega o resultado. '' quando deu certo
  fabricar(id) {
    const R = this.receita(id), err = this.pode(R);
    if (err) return err;
    const o = R.out;
    if (o.oficio) {   // receitas do artesão: mesmo caminho (materiais, Criação e o item)
      const e = Oficios.criar(o.oficio);
      if (e) return e;
    } else {
      Oficios.gastar(R.mat);
      game.stats.soulsBank -= R.cel;
      if (o.peca) {
        const [slot, fam] = o.peca, nv = Oficios.nivel('criacao'), F = ARS_FAMILIAS[fam];
        const r = F.rmin || Math.min(nv >= 8 ? ARS_LENDARIA : 2, Arsenal.rolar(0, 0.1 + nv * 0.06));
        Arsenal.guardar(Arsenal.gerar(slot, fam, r, Math.max(game.activeProgress().level, F.tier * 5)));
      } else if (o.ferramenta) {
        Arsenal.S.ferramenta = o.ferramenta;
        game.hud.toast(`${R.nome} · +${o.ferramenta} material em cada coleta`, '150,200,255');
      }
      Oficios.ganharXp('criacao', 15 + R.nivel * 8);
      game.audio.play('upgrade');
    }
    World.save();
    return '';
  },

  // ---------------------------------------------------------------- aprimorar peças (forja)
  AP_MAX: 5,
  custoPeca(it) {
    const ap = it.ap || 0, base = Arsenal.custoMat(it.slot, it.fam), mat = {};
    for (const k in base) mat[k] = Math.max(1, Math.round(base[k] * (0.5 + ap * 0.4)));
    if (ap >= 2) mat.nucleo = (mat.nucleo || 0) + ap - 1;
    if (ap >= 4) mat.essencia = (mat.essencia || 0) + 1;
    return { cel: Math.round(Arsenal.valorBase(it.slot, it.fam) * (0.3 + ap * 0.2)), mat };
  },
  aprimorarPeca(id) {
    const it = Arsenal.item(id);
    if (!it) return 'Escolha uma peça.';
    if ((it.ap || 0) >= this.AP_MAX) return 'Esta já está no máximo (+5).';
    const C = this.custoPeca(it);
    if (!Oficios.tem(C.mat)) return `Faltam ${Oficios.falta(C.mat)}.`;
    if (game.stats.soulsBank < C.cel) return `Faltam ${C.cel - game.stats.soulsBank} células.`;
    game.stats.soulsBank -= C.cel;
    Oficios.gastar(C.mat);
    it.ap = (it.ap || 0) + 1;
    Arsenal.refazer();
    game.audio.play('upgrade');
    World.save();
    return '';
  },
  // ---------------------------------------------------------------- armas (bancada)
  armas(h = Arsenal.heroi()) {
    if (typeof RosterManager === 'undefined') return [];
    return RosterManager.weaponsFor(h).filter((w) => { const d = WEAPON_DEFS[w]; return d && d.owner === heroBase(h) && d.implemented !== false && !d.gadget && RosterManager.isWeaponUnlocked(w); });
  },
  nivelArma(w) { return Arsenal.S.armas[w] || 0; },
  custoArma(w) {
    const n = this.nivelArma(w), mat = { ferro: 2 + n * 2, engrenagem: 1 + n };
    if (n >= 2) mat.nucleo = n - 1;
    if (n >= 4) mat.essencia = 1;
    return { cel: 60 * (n + 1), mat };
  },
  aprimorarArma(w) {
    if (!WEAPON_DEFS[w]) return 'Escolha uma arma.';
    const n = this.nivelArma(w);
    if (n >= this.AP_MAX) return 'Esta arma já está no máximo (+5).';
    const C = this.custoArma(w);
    if (!Oficios.tem(C.mat)) return `Faltam ${Oficios.falta(C.mat)}.`;
    if (game.stats.soulsBank < C.cel) return `Faltam ${C.cel - game.stats.soulsBank} células.`;
    game.stats.soulsBank -= C.cel;
    Oficios.gastar(C.mat);
    Arsenal.S.armas[w] = n + 1;
    Arsenal.refazer();
    game.audio.play('upgrade');
    World.save();
    return '';
  },
  // ---------------------------------------------------------------- pesquisador
  CUSTO_PESQUISA: { essencia: 1, nucleo: 2, circuito: 2 },
  pesquisar() {
    const fam = this.planoNovo();
    if (!fam) return 'Você já conhece todos os planos.';
    if (!Oficios.tem(this.CUSTO_PESQUISA)) return `Para estudar, preciso de ${Oficios.fmtMat(this.CUSTO_PESQUISA)}. Faltam ${Oficios.falta(this.CUSTO_PESQUISA)}.`;
    Oficios.gastar(this.CUSTO_PESQUISA);
    this.aprender(fam, 'pesquisa');
    World.save();
    return '';
  },
  identificar() {
    if (Oficios.mat('amostra') <= 0) return 'Você não tem nenhuma amostra desconhecida.';
    if (game.stats.soulsBank < 15) return 'A análise custa 15 células.';
    game.stats.soulsBank -= 15;
    Oficios.S.mat.amostra--;
    const k = pick(['cristal', 'obsidiana', 'circuito', 'nucleo', 'essencia', 'engrenagem']), n = k === 'essencia' ? 1 : 2;
    Oficios.dar(k, n);
    World.save();
    return `${n} ${WORLD_MATERIAIS[k].nome}`;
  },
  // ---------------------------------------------------------------- eventos do mundo
  onChest(d) {
    const z = World.zone;
    if (!z) return;
    if (Math.random() < 0.5) Oficios.dar(pick(['tecido', 'couro', 'ferro']), 1 + Math.floor(Math.random() * 2));
    if (Math.random() < (d.boss || d.secret ? 0.6 : 0.15)) Oficios.dar('circuito', 1);
    if (Math.random() < 0.08) Oficios.dar('amostra', 1);
    if (Math.random() < (d.boss ? 0.5 : d.secret ? 0.25 : 0.06)) { const f = this.planoNovo(Math.ceil(z.lv / 7) + 1); if (f) this.aprender(f, 'baú'); }
  },
  onTerminal() { if (Math.random() < 0.25) { const f = this.planoNovo(3); if (f) this.aprender(f, 'manual técnico'); } },
  onBoss(e) { const f = FAB_PLANO_CHEFE[e.worldRegion || 'carmesin']; if (f && !this.aprender(f, 'chefe regional')) { const g = this.planoNovo(); if (g) this.aprender(g, 'chefe regional'); } },
  aoConcluirMissao() { if (Math.random() < 0.2) { const f = this.planoNovo(4); if (f) this.aprender(f, 'recompensa de missão'); } },

  // ---------------------------------------------------------------- armazém
  guardarMat(k, n = 1) {
    n = Math.min(n, Oficios.mat(k));
    if (n <= 0) return 0;
    const A = Arsenal.S.armazem;
    Oficios.S.mat[k] -= n; A.mat[k] = (A.mat[k] || 0) + n;
    return n;
  },
  retirarMat(k, n = 1) {
    const A = Arsenal.S.armazem;
    n = Math.min(n, A.mat[k] || 0);
    if (n <= 0) return 0;
    A.mat[k] -= n; Oficios.S.mat[k] = Math.min(999, Oficios.mat(k) + n);
    return n;
  },
  guardarPeca(id) {
    const it = Arsenal.item(id);
    if (!it) return 'Escolha uma peça.';
    if (Arsenal.vestidaPor(id)) return 'Tire a peça antes de guardar.';
    Arsenal.S.itens = Arsenal.S.itens.filter((q) => q !== it);
    Arsenal.S.armazem.itens.push(it);
    return '';
  },
  retirarPeca(id) {
    const A = Arsenal.S.armazem, it = A.itens.find((q) => q.id === id);
    if (!it) return 'Escolha uma peça.';
    if (Arsenal.S.itens.length >= ARS_MAX) return 'Mochila de peças cheia.';
    A.itens = A.itens.filter((q) => q !== it);
    Arsenal.S.itens.push(it);
    return '';
  },

  // ---------------------------------------------------------------- abas da mochila
  // Categorias de cada aba (←/→): fabricação (fabricar / aprimorar), armazém e inventário
  CATS_INV: [['tudo', 'TUDO'], ['armas', 'ARMAS'], ['pecas', 'PEÇAS'], ['materiais', 'MATERIAIS'], ['consumiveis', 'CONSUMÍVEIS'], ['acessorios', 'ACESSÓRIOS'], ['missao', 'MISSÃO'], ['receitas', 'RECEITAS']],
  cats(tab) {
    if (tab === 'itens') return this.CATS_INV;
    if (tab === 'armazem') return [['mat', 'MATERIAIS'], ['pecas', 'PEÇAS']];
    const est = WorldInv.ui.servico;
    if (est === 'forja') return [['fab', 'FABRICAR'], ['apr', 'APRIMORAR PEÇAS']];
    if (est === 'armas') return [['arma', 'APRIMORAR ARMAS']];
    return [['fab', 'FABRICAR']];
  },
  cat(tab) { const C = this.cats(tab); return C[clamp(this.ui.cat, 0, C.length - 1)][0]; },
  // Entradas da aba: { nome, sub, rgb, dir, dim, det (detalhe), acoes, fazer(acao) }
  entradas(tab) {
    const c = this.cat(tab), out = [];
    if (tab === 'fabrica') {
      if (c === 'apr') for (const it of Arsenal.S.itens) out.push(this.entPecaApr(it));
      else if (c === 'arma') for (const w of this.armas()) out.push(this.entArma(w));
      else for (const R of this.daEstacao(WorldInv.ui.servico).slice().sort((a, b) => (this.conhece(b) - this.conhece(a)) || a.nivel - b.nivel)) out.push(this.entReceita(R));
    } else if (tab === 'armazem') {
      if (c === 'mat') for (const k in WORLD_MATERIAIS) { const a = Oficios.mat(k), b = Arsenal.S.armazem.mat[k] || 0; if (a || b) out.push(this.entArmazemMat(k, a, b)); }
      else { for (const it of Arsenal.S.itens) out.push(this.entArmazemPeca(it, false)); for (const it of Arsenal.S.armazem.itens) out.push(this.entArmazemPeca(it, true)); }
    } else this.entradasInv(c, out);
    const b = this.ui.busca.trim().toLowerCase();
    return tab === 'itens' && b ? out.filter((e) => (`${e.nome} ${e.sub || ''}`).toLowerCase().includes(b)) : out;
  },
  entReceita(R) {
    const err = this.pode(R), F = R.out.peca ? ARS_FAMILIAS[R.out.peca[1]] : null;
    const rgb = F ? (F.luz ? hexToRgb(F.luz) : hexToRgb(F.cor[2])) : FAB_ESTACOES[R.est].rgb;
    const linhas = [R.desc, `Materiais: ${Oficios.fmtMat(R.mat)}${R.cel ? ` · ${R.cel} células` : ''}`];
    if (R.out.peca) { const pv = Arsenal.gerar(R.out.peca[0], R.out.peca[1], F.rmin || 0, Math.max(game.activeProgress().level, F.tier * 5)); linhas.push(`Resultado: ${Object.keys(pv.st).map((k) => Arsenal.fmtSt(k, pv.st[k])).join(' · ')}${Object.keys(pv.res).length ? ` · ${Object.keys(pv.res).map((r) => `${ARS_RES[r]} ${Math.round(pv.res[r] * 100)}%`).join(' · ')}` : ''} (raridade melhora com a Criação)`); }
    return { nome: R.nome, sub: !this.conhece(R) ? `🔒 plano ${F ? F.nome : ''}` : err ? err : 'pronto para fabricar', rgb, dim: !!err, dir: R.cel ? `${R.cel}` : '',
      det: { titulo: R.nome, rgb, linhas, reqs: this.reqs(R) }, acoes: [['fab', 'FABRICAR']], fazer: () => this.fabricar(R.id) || `Fabricou ${R.nome}` };
  },
  reqs(R) {
    const out = [], Rm = Oficios.resolver(R.mat);
    for (const k in Rm) out.push({ txt: `${Oficios.matNome(k)} ${Oficios.mat(k)}/${Rm[k]}`, ok: Oficios.mat(k) >= Rm[k] });
    if (R.cel) out.push({ txt: `${R.cel} células`, ok: game.stats.soulsBank >= R.cel });
    out.push({ txt: `Criação ${R.nivel}`, ok: Oficios.nivel('criacao') >= R.nivel });
    if (R.req > 1) out.push({ txt: `Herói nível ${R.req}`, ok: game.activeProgress().level >= R.req });
    if (R.plano) out.push({ txt: `Plano ${ARS_FAMILIAS[R.plano].nome}`, ok: this.conhece(R) });
    return out;
  },
  entPecaApr(it) {
    const C = this.custoPeca(it), max = (it.ap || 0) >= this.AP_MAX, R = Arsenal.rar(it);
    const reqs = max ? [] : Object.keys(C.mat).map((k) => ({ txt: `${Oficios.matNome(k)} ${Oficios.mat(k)}/${C.mat[k]}`, ok: Oficios.mat(k) >= C.mat[k] })).concat([{ txt: `${C.cel} células`, ok: game.stats.soulsBank >= C.cel }]);
    return { nome: Arsenal.nome(it), sub: max ? 'no máximo (+5)' : `+${(it.ap || 0) + 1}: +10% nos atributos`, rgb: R.rgb, dim: max, dir: max ? '' : `${C.cel}`,
      det: { titulo: Arsenal.nome(it), rgb: R.rgb, linhas: [`${R.name} · ${ARS_VAGAS[it.slot].nome}${Arsenal.vestidaPor(it.id) ? ` · vestida por ${charFirstName(Arsenal.vestidaPor(it.id))}` : ''}`, Object.keys(it.st).map((k) => Arsenal.fmtSt(k, it.st[k] * Arsenal.mult(it))).join(' · ')], reqs },
      acoes: max ? [] : [['apr', `APRIMORAR +${(it.ap || 0) + 1}`]], fazer: () => { const e = this.aprimorarPeca(it.id); return e || `${Arsenal.nome(it)}`; } };
  },
  entArma(w) {
    const D = WEAPON_DEFS[w], n = this.nivelArma(w), C = this.custoArma(w), max = n >= this.AP_MAX, eq = RosterManager.equippedWeapon(Arsenal.heroi()) === w;
    const reqs = max ? [] : Object.keys(C.mat).map((k) => ({ txt: `${Oficios.matNome(k)} ${Oficios.mat(k)}/${C.mat[k]}`, ok: Oficios.mat(k) >= C.mat[k] })).concat([{ txt: `${C.cel} células`, ok: game.stats.soulsBank >= C.cel }]);
    return { nome: `${D.name}${n ? ` +${n}` : ''}`, sub: `${eq ? 'equipada · ' : ''}+${n * 6}% de dano${max ? ' · no máximo' : ''}`, rgb: '255,200,120', dim: max, dir: max ? '' : `${C.cel}`,
      det: { titulo: `${D.name}${n ? ` +${n}` : ''}`, rgb: '255,200,120', linhas: [`Arma de ${charFirstName(D.owner)} · cada nível: +6% de dano (no mundo aberto)`], reqs },
      acoes: max ? [] : [['apr', `APRIMORAR +${n + 1}`]], fazer: () => this.aprimorarArma(w) || `${D.name} agora +${this.nivelArma(w)}` };
  },
  entArmazemMat(k, a, b) {
    const D = WORLD_MATERIAIS[k];
    return { nome: `${D.icon} ${D.nome}`, sub: `mochila ${a} · armazém ${b}`, rgb: D.rgb, dir: `${a} | ${b}`,
      det: { titulo: D.nome, rgb: D.rgb, linhas: [D.desc, 'Enter guarda 1 · GUARDAR TUDO / RETIRAR'] },
      acoes: [['g1', 'GUARDAR 1'], ['gt', 'GUARDAR TUDO'], ['r1', 'RETIRAR 1'], ['rt', 'RETIRAR TUDO']],
      fazer: (ac) => { const n = ac === 'g1' ? this.guardarMat(k, 1) : ac === 'gt' ? this.guardarMat(k, 999) : ac === 'r1' ? this.retirarMat(k, 1) : this.retirarMat(k, 999); return n ? `${ac[0] === 'g' ? 'Guardou' : 'Retirou'} ${n} ${D.nome}` : 'Nada para mover.'; } };
  },
  entArmazemPeca(it, guardada) {
    const R = Arsenal.rar(it);
    return { nome: Arsenal.nome(it), sub: `${guardada ? 'no ARMAZÉM' : 'na mochila'} · ${R.name}${Arsenal.vestidaPor(it.id) ? ' · vestida' : ''}`, rgb: R.rgb, dim: guardada,
      det: { titulo: Arsenal.nome(it), rgb: R.rgb, linhas: [`${ARS_VAGAS[it.slot].nome} · ${Arsenal.tec(it).nome}`, Object.keys(it.st).map((k) => Arsenal.fmtSt(k, it.st[k] * Arsenal.mult(it))).join(' · ')] },
      acoes: [[guardada ? 'r' : 'g', guardada ? 'RETIRAR' : 'GUARDAR']], fazer: () => (guardada ? this.retirarPeca(it.id) : this.guardarPeca(it.id)) || `${guardada ? 'Retirou' : 'Guardou'} ${Arsenal.nome(it)}` };
  },
  // Itens de missão: materiais que uma entrega ativa pede (não dá para descartar além do que sobra)
  pedidosMissao() {
    const P = {};
    for (const q of Aventuras.ativas()) { const st = Aventuras.passo(q); if (st && st.t === 'entregar' && st.mat) for (const k in st.mat) P[k] = Math.max(P[k] || 0, st.mat[k]); }
    return P;
  },
  entradasInv(c, out) {
    const tudo = c === 'tudo', P = this.pedidosMissao(), h = Arsenal.heroi();
    if (tudo || c === 'armas') for (const w of this.armas()) {
      const D = WEAPON_DEFS[w], eq = RosterManager.equippedWeapon(h) === w, n = this.nivelArma(w);
      out.push({ nome: `${D.name}${n ? ` +${n}` : ''}`, sub: `Arma · ${eq ? 'equipada' : 'na mochila'}`, rgb: '255,200,120', dir: eq ? 'E' : '',
        det: { titulo: D.name, rgb: '255,200,120', linhas: [`${charFirstName(h)} · aprimoramento +${n} (+${n * 6}% de dano) na bancada de armas da Aurora`] },
        acoes: eq ? [] : [['eq', 'EQUIPAR']], fazer: () => { if (!RosterManager.equipWeapon(h, w)) return 'Não deu para equipar.'; game.player.wpnAnim = { k: 'draw', t: 0, dur: 0.5 }; return `Equipou ${D.name}`; } });
    }
    if (tudo || c === 'pecas' || c === 'acessorios') for (const it of Arsenal.S.itens) {
      if ((c === 'acessorios') !== (it.slot === 'acessorio') && !tudo) continue;
      const R = Arsenal.rar(it), vest = Arsenal.vestido(it.id);
      out.push({ nome: Arsenal.nome(it), sub: `${it.slot === 'acessorio' ? 'Acessório' : 'Peça'} · ${R.name} · ${ARS_VAGAS[it.slot].nome}${vest ? ' · vestida' : ''}`, rgb: R.rgb, dir: vest ? 'E' : '',
        det: { titulo: Arsenal.nome(it), rgb: R.rgb, linhas: [`${ARS_TECIDOS[Arsenal.fam(it).tec].nome} · nível ${it.lv} · requer nível ${Arsenal.req(it)}`, Object.keys(it.st).map((k) => Arsenal.fmtSt(k, it.st[k] * Arsenal.mult(it))).join(' · ')] },
        acoes: [['vest', vest ? 'TIRAR' : 'VESTIR'], ['desc', WorldInv.vende() ? 'VENDER' : 'DESMONTAR']],
        fazer: (ac) => { if (ac === 'desc') return Arsenal.vender(it.id); if (vest) { Arsenal.tirar(it.slot); return `Tirou ${Arsenal.nome(it)}`; } return Arsenal.equipar(it.id) || `Vestiu ${Arsenal.nome(it)}`; } });
    }
    if (tudo || c === 'acessorios') for (const it of WorldInv.S.itens) {
      const R = WorldInv.rar(it), on = WorldInv.S.equip.includes(it.id);
      out.push({ nome: WorldInv.nome(it), sub: `Relíquia · ${R.name}${on ? ' · equipada' : ''}`, rgb: R.rgb, dir: on ? 'E' : '',
        det: { titulo: WorldInv.nome(it), rgb: R.rgb, linhas: [Object.keys(it.st).map((k) => WorldInv.fmt(k, it.st[k] * WorldInv.mult(it))).join(' · ')] },
        acoes: [['eq', on ? 'TIRAR' : 'EQUIPAR']], fazer: () => { if (on) { WorldInv.desequipar(WorldInv.S.equip.indexOf(it.id)); return 'Relíquia guardada'; } return WorldInv.equipar(it.id) ? `Equipou ${WorldInv.nome(it)}` : 'Não deu para equipar.'; } });
    }
    if (tudo || c === 'materiais' || c === 'missao') for (const k in WORLD_MATERIAIS) {
      const n = Oficios.mat(k), D = WORLD_MATERIAIS[k], pede = P[k] || 0;
      if (!n || (c === 'missao' && !pede)) continue;
      const usa = this.receitas().filter((R) => Oficios.resolver(R.mat)[k]).slice(0, 4).map((R) => R.nome);
      out.push({ nome: `${D.icon} ${D.nome}`, sub: `${pede ? `Item de missão (${pede} para entregar) · ` : 'Material · '}${WORLD_RARIDADES[WORLD_MAT_RARIDADE[k] || 0].name}`, rgb: D.rgb, dir: `×${n}`,
        det: { titulo: D.nome, rgb: D.rgb, linhas: [`${D.desc} Onde achar: ${WORLD_MAT_FONTE[k] || '—'}.`, `Usado em: ${usa.length ? usa.join(', ') : 'vendas'}${usa.length >= 4 ? '…' : ''}`] },
        acoes: [['desc1', WorldInv.vende() ? 'VENDER 1' : 'DESCARTAR 1']],
        fazer: () => {
          if (pede && n <= pede) return 'Item de missão: guarde para a entrega.';
          if (WorldInv.vende()) { Oficios.agir({ mat: k }, true); return ''; }
          Oficios.S.mat[k]--; return `Descartou 1 ${D.nome}`;
        } });
    }
    if (tudo || c === 'consumiveis') for (const k in WORLD_CONSUMIVEIS) {
      const n = Oficios.cons(k), D = WORLD_CONSUMIVEIS[k];
      if (!n) continue;
      out.push({ nome: D.nome, sub: `Consumível · ${D.desc}`, rgb: D.rgb, dir: `×${n}`, det: { titulo: D.nome, rgb: D.rgb, linhas: [D.desc] }, acoes: [['usar', 'USAR']], fazer: () => (Oficios.usar(k) ? `Usou ${D.nome}` : '') });
    }
    if ((tudo || c === 'consumiveis') && WorldInv.S.capsulas) out.push({ nome: 'Cápsula de reparo', sub: 'Consumível · cura 40% da vida (tecla 5)', rgb: '90,255,160', dir: `×${WorldInv.S.capsulas}`, det: { titulo: 'CÁPSULA DE REPARO', rgb: '90,255,160', linhas: ['Cura 40% da vida.'] }, acoes: [['usar', 'USAR']], fazer: () => (WorldInv.usarCapsula() ? 'Usou uma cápsula' : '') });
    if (c === 'receitas') for (const est in FAB_ESTACOES) for (const R of this.daEstacao(est)) {
      const ok = this.conhece(R);
      out.push({ nome: R.nome, sub: `${FAB_ESTACOES[est].nome}${ok ? '' : ` · 🔒 plano ${ARS_FAMILIAS[R.plano].nome}`}`, rgb: FAB_ESTACOES[est].rgb, dim: !ok,
        det: { titulo: R.nome, rgb: FAB_ESTACOES[est].rgb, linhas: [R.desc, `${FAB_ESTACOES[est].nome} · ${Oficios.fmtMat(R.mat)}${R.cel ? ` · ${R.cel} células` : ''}`, ok ? 'Fabrique na estação do Refúgio da Aurora.' : 'Planos: armeiro da Aurora, baús, chefes regionais, missões, terminais e o pesquisador.'], reqs: this.reqs(R) }, acoes: [] });
    }
  },
  // ---------------------------------------------------------------- tela (aba da WorldInv)
  executar(e, ac) {
    if (!e || !e.fazer) return;
    const txt = e.fazer(ac);
    if (txt === undefined || txt === '') return;
    const ruim = /^(Faltam|Requer|Precisa|Escolha|Você já|Esta|Nada|Não|Tire|Mochila|A mochila|Item de missão|Fabrique)/.test(txt);
    WorldInv.aviso(txt, !ruim);
    if (!ruim) game.audio.play('uiSelect');
  },
  updateUI(tab, dt, inp) {
    const U = this.ui, WU = WorldInv.ui, C = this.cats(tab);
    // busca do inventário: '/' ou o clique na caixa começa; letras escrevem; Enter/Esc terminam
    if (U.digitando) return true;
    if ((inp.pressed.left || inp.pressed.right) && C.length > 1) { U.cat = (clamp(U.cat, 0, C.length - 1) + (inp.pressed.right ? 1 : C.length - 1)) % C.length; WU.sel = 0; game.audio.play('uiMove'); }
    const L = this.entradas(tab);
    if (L.length) {
      if (inp.pressed.up) { WU.sel = Math.max(0, WU.sel - 1); game.audio.play('uiMove'); }
      if (inp.pressed.down) { WU.sel = Math.min(L.length - 1, WU.sel + 1); game.audio.play('uiMove'); }
      WU.sel = clamp(WU.sel, 0, L.length - 1);
      const e = L[WU.sel];
      if (inp.pressed.confirm && e.acoes && e.acoes.length) this.executar(e, e.acoes[0][0]);
      if (inp.pressed.erase && e.acoes && e.acoes.length > 1) this.executar(e, e.acoes[1][0]);
    }
    return false;
  },
  clique(tab, r) {
    const U = this.ui, WU = WorldInv.ui;
    if (r.fcat !== undefined) { U.cat = r.fcat; WU.sel = 0; game.audio.play('uiMove'); return true; }
    if (r.busca) { U.digitando = true; game.audio.play('uiMove'); return true; }
    if (r.fac) { this.executar(this.entradas(tab)[WU.sel], r.fac); return true; }
    if (r.fidx !== undefined) { if (WU.sel === r.fidx) { const e = this.entradas(tab)[r.fidx]; if (e && e.acoes && e.acoes.length) this.executar(e, e.acoes[0][0]); } else { WU.sel = r.fidx; game.audio.play('uiMove'); } return true; }
    return false;
  },
  // Teclado da busca (instalado uma vez; só age com a aba INVENTÁRIO aberta e digitando)
  instalarBusca() {
    if (this._busca || typeof window === 'undefined') return;
    this._busca = true;
    window.addEventListener('keydown', (ev) => {
      const U = this.ui;
      if (game.state !== 'worldinv' || WorldInv.ui.tab !== 'itens') return;
      if (!U.digitando) { if (ev.key === '/') { U.digitando = true; ev.preventDefault(); } return; }
      if (ev.key === 'Enter' || ev.key === 'Escape') { U.digitando = false; ev.preventDefault(); ev.stopPropagation(); return; }
      if (ev.key === 'Backspace') U.busca = U.busca.slice(0, -1);
      else if (ev.key.length === 1 && U.busca.length < 24) U.busca += ev.key;
      WorldInv.ui.sel = 0;
      ev.preventDefault(); ev.stopPropagation();
    }, true);
  },
  draw(tab, ctx, Ly, t) {
    const U = this.ui, WU = WorldInv.ui, C = this.cats(tab), L = this.entradas(tab), x0 = Ly.lx, w = VIEW_W - 72;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    // título e categorias
    const est = tab === 'fabrica' ? FAB_ESTACOES[WU.servico] : null;
    let cx = x0;
    C.forEach(([id, nome], i) => {
      ctx.font = `bold 11px ${FONT_TITLE}`;
      const cw = ctx.measureText(nome).width + 20, on = i === clamp(U.cat, 0, C.length - 1);
      ctx.fillStyle = on ? 'rgba(90,150,255,0.3)' : 'rgba(20,30,50,0.6)'; ctx.fillRect(cx, Ly.top - 22, cw, 20);
      ctx.strokeStyle = on ? 'rgba(170,215,255,0.9)' : 'rgba(90,120,170,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(cx + 0.5, Ly.top - 21.5, cw - 1, 19);
      ctx.fillStyle = on ? '#ffffff' : 'rgba(200,214,235,0.7)'; ctx.fillText(nome, cx + 10, Ly.top - 12);
      WU.rects.push({ fcat: i, x: cx, y: Ly.top - 22, w: cw, h: 20 });
      cx += cw + 6;
    });
    if (tab !== 'itens') {
      ctx.textAlign = 'right'; ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px'; ctx.fillStyle = 'rgba(150,205,255,0.9)';
      ctx.fillText(est ? `${est.nome.toUpperCase()} · CRIAÇÃO NÍVEL ${Oficios.nivel('criacao')}${WU.servico === 'engenharia' ? ` · FERRAMENTA ${Arsenal.S.ferramenta || 0}` : ''}` : 'ARMAZÉM PESSOAL · REFÚGIO DA AURORA', x0 + w, Ly.top - 12);
      ctx.letterSpacing = '0px'; ctx.textAlign = 'left';
    } else {
      // caixa de busca
      const bw = 220, bx = x0 + w - bw;
      ctx.fillStyle = U.digitando ? 'rgba(30,60,110,0.9)' : 'rgba(14,22,38,0.9)'; ctx.fillRect(bx, Ly.top - 24, bw, 22);
      ctx.strokeStyle = U.digitando ? '#ffffff' : 'rgba(120,160,220,0.5)'; ctx.strokeRect(bx + 0.5, Ly.top - 23.5, bw - 1, 21);
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = U.busca ? '#ffffff' : 'rgba(160,180,210,0.6)';
      ctx.fillText(U.busca ? `🔍 ${U.busca}${U.digitando && Math.sin(t * 8) > 0 ? '|' : ''}` : `🔍 ${U.digitando ? '|' : 'buscar (tecla /)'}`, bx + 8, Ly.top - 13);
      WU.rects.push({ busca: true, x: bx, y: Ly.top - 24, w: bw, h: 22 });
    }
    // lista (duas colunas em telas largas)
    const cols = VIEW_W >= 1000 ? 2 : 1, rh = 38, gap = 6, avail = Ly.det - Ly.top - 12, per = Math.max(1, Math.floor(avail / (rh + gap))), cw = (w - (cols - 1) * 14) / cols;
    const pag = per * cols, ini = Math.floor(WU.sel / pag) * pag;
    L.slice(ini, ini + pag).forEach((e, j) => {
      const i = ini + j, c = Math.floor(j / per), r = j % per, x = x0 + c * (cw + 14), y = Ly.top + r * (rh + gap), sel = WU.sel === i;
      ctx.globalAlpha = e.dim && !sel ? 0.55 : 1;
      ctx.fillStyle = sel ? 'rgba(40,70,130,0.65)' : 'rgba(12,20,36,0.85)'; ctx.fillRect(x, y, cw, rh);
      ctx.strokeStyle = sel ? '#ffffff' : rgba(e.rgb || '120,150,200', 0.5); ctx.lineWidth = sel ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, rh - 1);
      ctx.fillStyle = rgba(e.rgb || '200,214,235', 1); ctx.fillRect(x, y, 3, rh);
      ctx.textAlign = 'left'; ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = rgba(e.rgb || '230,240,255', 1); ctx.fillText(e.nome, x + 12, y + 13);
      ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.8)'; ctx.fillText(e.sub || '', x + 12, y + 28);
      if (e.dir) { ctx.textAlign = 'right'; ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = '#9fd0ff'; ctx.fillText(e.dir, x + cw - 10, y + rh / 2); }
      ctx.globalAlpha = 1;
      WU.rects.push({ fidx: i, x, y, w: cw, h: rh });
    });
    if (!L.length) { ctx.textAlign = 'left'; ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.75)'; ctx.fillText(tab === 'itens' ? (U.busca ? 'Nada com esse nome.' : 'Nada nesta categoria.') : 'Nada aqui por enquanto.', x0, Ly.top + 20); }
    if (L.length > pag) { ctx.textAlign = 'right'; ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,180,210,0.7)'; ctx.fillText(`${ini + 1}–${Math.min(L.length, ini + pag)} de ${L.length}`, x0 + w, Ly.det - 6); }
    // detalhe
    const e = L[WU.sel], y = Ly.det;
    ctx.fillStyle = 'rgba(8,14,28,0.92)'; ctx.fillRect(36, y, w, 132);
    ctx.strokeStyle = 'rgba(90,150,255,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(36.5, y + 0.5, w - 1, 131);
    if (!e) return;
    const D = e.det || {};
    ctx.textAlign = 'left'; ctx.font = `bold 17px ${FONT_TITLE}`; ctx.fillStyle = rgba(D.rgb || e.rgb || '230,240,255', 1); ctx.fillText((D.titulo || e.nome).toUpperCase(), 54, y + 22);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)';
    (D.linhas || []).slice(0, 3).forEach((ln, k) => ctx.fillText(ln, 54, y + 44 + k * 17));
    if (D.reqs && D.reqs.length) {
      let rx = 54;
      ctx.font = `bold 11px ${FONT_UI}`;
      for (const q of D.reqs) {
        const tw = ctx.measureText(q.txt).width + 14;
        if (rx + tw > 36 + w - 330) break;
        ctx.fillStyle = q.ok ? 'rgba(40,110,70,0.55)' : 'rgba(120,40,50,0.6)'; ctx.fillRect(rx, y + 98, tw, 20);
        ctx.fillStyle = q.ok ? '#b4ffd0' : '#ffb0b8'; ctx.fillText(q.txt, rx + 7, y + 108);
        rx += tw + 6;
      }
    }
    let bx = 36 + w - 18;
    for (const [id, label] of (e.acoes || []).slice().reverse()) {
      ctx.font = `bold 12px ${FONT_TITLE}`;
      const bw = ctx.measureText(label).width + 28;
      bx -= bw;
      const alt = /DESCART|DESMONT|VENDER|RETIRAR/.test(label);
      ctx.fillStyle = alt ? 'rgba(80,30,40,0.85)' : 'rgba(30,70,140,0.85)'; ctx.fillRect(bx, y + 88, bw, 32);
      ctx.strokeStyle = alt ? 'rgba(255,120,140,0.8)' : 'rgba(150,205,255,0.85)'; ctx.strokeRect(bx + 0.5, y + 88.5, bw - 1, 31);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(label, bx + bw / 2, y + 104);
      WU.rects.push({ fac: id, x: bx, y: y + 88, w: bw, h: 32 });
      bx -= 8;
    }
  },
  dica(tab) {
    if (tab === 'itens') return this.ui.digitando ? 'Digite para buscar · Enter/Esc: terminar' : '←/→: categoria · /: buscar · Enter: ação principal · Delete: segunda ação · Q/E: abas · Esc: fechar';
    if (tab === 'armazem') return '←/→: materiais / peças · Enter: guardar ou retirar · botões: tudo · Q/E: abas · Esc: fechar';
    return '←/→: fabricar / aprimorar · Enter: fabricar · requisitos em verde estão ok · Q/E: abas · Esc: fechar';
  },
};
Fabrica.instalarBusca();
