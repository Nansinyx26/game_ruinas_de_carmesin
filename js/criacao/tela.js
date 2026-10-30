'use strict';
// ECLIPSE ZERO · Criação de personagem: a tela (CriacaoTela, estado 'criacao')
// ---------------------------------------------------------------------------
// Menu → PERSONAGENS. Dois modos:
//   LISTA: os personagens da conta (jogar na vista isométrica ou na 3ª pessoa, editar a
//     aparência, excluir), criar um novo, ou voltar ao mundo original do Kael.
//   CRIAR / EDITAR: o personagem no centro em 3D de verdade (o motor do jogo em perspectiva,
//     sobre um altar com runas, luz que gira devagar, sombra e brasas no ar). Arraste (mouse ou
//     dedo) ou Z / C para girar; roda, + / − ou os botões para aproximar (corpo inteiro, busto,
//     rosto); poses de apresentação (parado, guarda, vitória, correndo, golpe da arma da classe).
//     Painéis: CLASSE (as cinco, com o que muda no jogo), APARÊNCIA (estilo Realista, com as
//     peças GLB da criação em grades de miniaturas por categoria — corpo e altura, rosto, cabelo,
//     barba, cores da pele e do cabelo — ou Estilizado, o modelo paramétrico com as 13 opções),
//     EQUIPAMENTO (arma principal da classe e o conjunto inicial do nível 1, vestido na prévia:
//     gibão leve ou couraça pesada, esconder o capuz) e, à direita, o NOME (com validação), os atributos reais da classe,
//     habilidades, armas e o botão de confirmar. Tudo muda na hora no modelo.
// Confirmar grava o perfil (Perfis) e começa o mundo do personagem (World.start).
// ---------------------------------------------------------------------------
const CRIA_POSES = ['Parado', 'Guarda', 'Vitória', 'Correndo', 'Golpe'];
const CRIA_ZOOM = [{ nome: 'Corpo inteiro', d: 150, z: 30 }, { nome: 'Busto', d: 82, z: 45 }, { nome: 'Rosto', d: 44, z: 53 }];
// Categorias da aparência no estilo Realista (peças GLB) e as linhas (teclado) de cada uma
const CRIA_CATS = [
  { id: 'corpo', nome: 'CORPO', campos: ['corpoG', 'altura'] },
  { id: 'rosto', nome: 'ROSTO', campos: ['rostoG'] },
  { id: 'cabelo', nome: 'CABELO', campos: ['cabeloG'] },
  { id: 'barba', nome: 'BARBA', campos: ['barbaG'] },
  { id: 'cores', nome: 'CORES', campos: ['pele', 'corCabelo'] },
];
const CRIA_LINHAS_GLB = ['estilo'].concat(...CRIA_CATS.map((c) => c.campos));
// Miniaturas (ids do catálogo da criação) de cada opção; null = 'sem'
const CRIA_MINI = {
  corpoG: () => ['corpo_m', 'corpo_f'],
  rostoG: () => [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `rosto_${i}`),
  cabeloG: () => [null, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (i ? `cabelo_${i}` : null)),
  barbaG: () => [null].concat(typeof Criacao3D !== 'undefined' ? Criacao3D.BARBAS : []),
};
const CriacaoTela = {
  ui: null,
  // ------------------------------------------------------------ abrir / fechar
  abrir(modo = null) {
    Perfis.carregar();
    const lista = Perfis.lista();
    this.ui = { modo: modo || (lista.length ? 'lista' : 'criar'), aba: 'classe', sel: 0, lsel: 0, classe: 'guerreiro', A: persAparenciaPadrao('guerreiro'), nome: '', editId: null,
      yaw: 0.35, zoom: 0, zoomAlvo: 0, pose: 0, mostrarEquip: true, ocultarCapacete: false, arma: null, erro: Perfis.aviso, msgT: Perfis.aviso ? 4 : 0, t: 0, rects: [],
      digitando: false, confirma: null, terceira: false, sujo: true, arrasto: null, origem: game.menu.page || 'main', peitoral: null };
    this.instalar();
    if (typeof Criacao3D !== 'undefined') Criacao3D.carregar('minis');   // miniaturas das grades
    game.state = 'criacao';
    game.audio.play('uiSelect');
  },
  fechar() {
    this.parar();
    delete CHARACTERS_BY_ID.p_previa; delete SKILL_SETS.p_previa; delete RosterManager.weapon.p_previa;
    game.state = 'menu';
    game.menu.reset(this.ui && this.ui.origem === 'start' ? 'start' : 'main');
    game.audio.play('uiMove');
  },
  novo() { const U = this.ui; Object.assign(U, { modo: 'criar', aba: 'classe', sel: 0, classe: 'guerreiro', A: persAparenciaPadrao('guerreiro'), nome: '', editId: null, arma: null, ocultarCapacete: false, peitoral: null, sujo: true, erro: '' }); },
  editar(p) { const U = this.ui; Object.assign(U, { modo: 'editar', aba: 'aparencia', sel: 0, classe: p.classe, A: Object.assign({}, p.aparencia), nome: p.nome, editId: p.id, arma: p.opcoes && p.opcoes.arma, ocultarCapacete: !!(p.opcoes && p.opcoes.ocultarCapacete), peitoral: (p.opcoes && p.opcoes.peitoral) || null, sujo: true, erro: '' }); },
  aviso(txt, ok = false) { this.ui.erro = txt; this.ui.msgT = 3.2; this.ui.ok = ok; if (!ok) game.audio.play('uiDeny'); },

  // ------------------------------------------------------------ personagem da prévia
  // Ficha temporária ('p_previa', nunca salva) com a classe e a aparência escolhidas
  previa() {
    const U = this.ui;
    if (U.modo === 'lista') {
      const p = Perfis.lista()[U.lsel];
      return p ? CHARACTERS_BY_ID[p.id] || Perfis.registrar(p) : null;
    }
    if (U.sujo || !CHARACTERS_BY_ID.p_previa) {
      U.sujo = false;
      const def = Perfis.registrar({ id: 'p_previa', nome: U.nome || 'Prévia', classe: U.classe, aparencia: Object.assign({}, U.A) });
      if (U.arma) RosterManager.weapon.p_previa = U.arma; else delete RosterManager.weapon.p_previa;
      this.vit = null;
      return def;
    }
    return CHARACTERS_BY_ID.p_previa;
  },
  // O conjunto do Iniciado (o que o personagem veste ao entrar no mundo), com o peitoral escolhido
  pecasPrevia(def) {
    const U = this.ui, out = {};
    if (U.modo !== 'lista' && !U.mostrarEquip) return out;
    const op = U.modo === 'lista' ? CRIA_OPC(def) : { ocultarCapacete: U.ocultarCapacete, peitoral: U.peitoral };
    const pe = this.peitoralDe(def.classe, op.peitoral), C = this._ini || (this._ini = {});
    for (const id of ARM_INICIAL) {
      if ((id === 'ini_peitoral' || id === 'ini_armadura') && id !== pe) continue;
      const it = C[id] || (C[id] = Arsenal.gerarCat(id, 0));
      if (it && !(it.slot === 'capacete' && op.ocultarCapacete)) out[it.slot] = it;
    }
    return out;
  },
  peitoralDe(classe, v) { return v || ARM_PEITORAL_PADRAO[classe] || 'ini_peitoral'; },
  // Aparência no estilo Realista (peças GLB)?
  realista() { return this.ui.A.estilo !== 1 && typeof Criacao3D !== 'undefined' && Criacao3D.CAT.length > 0; },
  // Miniatura (imagem do catálogo da criação) já decodificada, ou null
  mini(id) { return typeof Criacao3D !== 'undefined' ? Criacao3D.mini(id) : null; },
  armasDe(def) { return def.weapons.filter((w) => WEAPON_DEFS[w] && !WEAPON_DEFS[w].gadget && WEAPON_DEFS[w].implemented !== false); },

  // ------------------------------------------------------------ entrada (arrastar, roda, digitar)
  instalar() {
    if (this._inst) return;
    this._inst = true;
    const cv = game.canvas, logico = (e) => game.toLogical(e.clientX, e.clientY);
    const naPrevia = (q) => { const R = this.rPrev; return R && q.x >= R.x && q.x <= R.x + R.w && q.y >= R.y && q.y <= R.y + R.h; };
    cv.addEventListener('mousedown', (e) => { if (game.state !== 'criacao' || !this.ui) return; const q = logico(e); if (naPrevia(q)) this.ui.arrasto = { x: q.x, y0: q.y }; });
    window.addEventListener('mousemove', (e) => { if (game.state !== 'criacao' || !this.ui || !this.ui.arrasto) return; const q = logico(e); this.ui.yaw -= (q.x - this.ui.arrasto.x) * 0.012; this.ui.arrasto.x = q.x; });
    window.addEventListener('mouseup', () => { if (this.ui) this.ui.arrasto = null; });
    cv.addEventListener('wheel', (e) => { if (game.state !== 'criacao' || !this.ui) return; e.preventDefault(); this.ui.zoomAlvo = clamp(this.ui.zoomAlvo + (e.deltaY < 0 ? 0.25 : -0.25), 0, 2); }, { passive: false });
    cv.addEventListener('touchstart', (e) => { if (game.state !== 'criacao' || !this.ui || !e.touches[0]) return; const q = logico(e.touches[0]); if (naPrevia(q)) this.ui.arrasto = { x: q.x }; }, { passive: true });
    cv.addEventListener('touchmove', (e) => { if (game.state !== 'criacao' || !this.ui || !this.ui.arrasto || !e.touches[0]) return; const q = logico(e.touches[0]); this.ui.yaw -= (q.x - this.ui.arrasto.x) * 0.012; this.ui.arrasto.x = q.x; }, { passive: true });
    cv.addEventListener('touchend', () => { if (this.ui) this.ui.arrasto = null; }, { passive: true });
    // teclas próprias da tela: + / − (zoom) e P (pose)
    window.addEventListener('keydown', (e) => {
      if (game.state !== 'criacao' || !this.ui || this.ui.digitando) return;
      if (e.key === '+' || e.key === '=') this.ui.zoomAlvo = clamp(this.ui.zoomAlvo + 0.25, 0, 2);
      else if (e.key === '-' || e.key === '_') this.ui.zoomAlvo = clamp(this.ui.zoomAlvo - 0.25, 0, 2);
      else if (e.key === 'p' || e.key === 'P') this.ui.pose = (this.ui.pose + 1) % CRIA_POSES.length;
    });
  },
  // Campo de texto do nome: um <input> de verdade (abre o teclado no celular), posto sobre a caixa
  digitar(on) {
    const U = this.ui;
    U.digitando = on;
    if (!on) { if (this.inp) { this.inp.blur(); this.inp.style.display = 'none'; } return; }
    if (!this.inp) {
      const el = this.inp = document.createElement('input');
      el.type = 'text'; el.maxLength = 16; el.autocomplete = 'off'; el.spellcheck = false;
      el.setAttribute('aria-label', 'Nome do personagem');
      el.style.cssText = 'position:fixed;z-index:50;opacity:0.01;font-size:16px;border:0;padding:0;background:transparent;color:transparent;caret-color:transparent';
      el.addEventListener('input', () => { if (this.ui) { this.ui.nome = el.value.slice(0, 16); this.ui.sujo = true; } });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); this.digitar(false); } e.stopPropagation(); });
      el.addEventListener('blur', () => { if (this.ui) this.ui.digitando = false; });
      document.body.appendChild(el);
    }
    const r = game.canvas.getBoundingClientRect(), B = this.rNome || { x: 0, y: 0, w: 200, h: 30 }, k = r.width / VIEW_W;
    Object.assign(this.inp.style, { display: 'block', left: `${r.left + B.x * k}px`, top: `${r.top + B.y * k}px`, width: `${B.w * k}px`, height: `${B.h * k}px` });
    this.inp.value = U.nome;
    this.inp.focus();
  },
  parar() { if (this.ui && this.ui.digitando) this.digitar(false); },
  aleatorio() {
    const U = this.ui, r = (n) => Math.floor(Math.random() * n);
    for (const k of PERS_CAMPOS) if (k !== 'estilo') U.A[k] = r(persNumOps(k, U.classe));
    U.A.altura = 1 + r(3);
    const silabas = ['ka', 'ri', 'on', 'va', 'el', 'dra', 'my', 'sor', 'tel', 'zan', 'lia', 'ven', 'ro', 'is', 'mar'];
    if (!U.nome) { let n = ''; for (let i = 0; i < 2 + r(2); i++) n += silabas[r(silabas.length)]; U.nome = n.charAt(0).toUpperCase() + n.slice(1); }
    U.sujo = true;
    game.audio.play('uiSelect');
  },

  // ------------------------------------------------------------ atualização
  update(dt, inp) {
    const U = this.ui;
    if (!U) return;
    U.t += dt; if (U.msgT > 0) U.msgT -= dt;
    U.zoom += (U.zoomAlvo - U.zoom) * Math.min(1, dt * 6);
    if (U.digitando) return;
    if (U.confirma) {
      if (inp.pressed.back) { U.confirma = null; return; }
      if (inp.pressed.confirm) { const f = U.confirma.fn; U.confirma = null; f(); return; }
    } else if (inp.pressed.back) { if (U.modo === 'lista' || !Perfis.lista().length) this.fechar(); else { U.modo = 'lista'; this.parar(); } return; }
    if (inp.pressed.camLeft) U.yaw += 0.35;
    if (inp.pressed.camRight) U.yaw -= 0.35;
    const m = inp.mouse;
    if (m.clicked) for (const r of U.rects) if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) { this.acao(r.id, r.v); m.clicked = false; return; }
    if (U.confirma) return;
    if (U.modo === 'lista') {
      const L = Perfis.lista();
      if (inp.pressed.up && L.length) { U.lsel = (U.lsel - 1 + L.length) % L.length; game.audio.play('uiMove'); }
      if (inp.pressed.down && L.length) { U.lsel = (U.lsel + 1) % L.length; game.audio.play('uiMove'); }
      if (inp.pressed.confirm && L[U.lsel]) this.acao('jogar');
      return;
    }
    const abas = ['classe', 'aparencia', 'equipamento'];
    if (inp.pressed.tabNext || inp.pressed.tabPrev) { const i = abas.indexOf(U.aba); this.acao('aba', abas[(i + (inp.pressed.tabNext ? 1 : 2)) % 3]); }
    const n = this.linhas().length;
    if (inp.pressed.up && n) { U.sel = (U.sel - 1 + n) % n; game.audio.play('uiMove'); }
    if (inp.pressed.down && n) { U.sel = (U.sel + 1) % n; game.audio.play('uiMove'); }
    if (inp.pressed.left) this.mudar(U.sel, -1);
    if (inp.pressed.right) this.mudar(U.sel, 1);
    if (inp.pressed.confirm) { if (U.aba === 'classe') this.mudar(U.sel, 0); else this.acao('confirmar'); }
  },
  // Linhas do painel da esquerda: classes, campos da aparência ou do equipamento
  linhas() {
    const U = this.ui;
    if (U.aba === 'classe') return U.modo === 'editar' ? [U.classe] : PERS_ORDEM;
    if (U.aba === 'aparencia') return this.realista() ? CRIA_LINHAS_GLB : PERS_CAMPOS.filter((k) => !PERS_APAR[k].glb);
    return ['arma', 'peitoral', 'mostrar', 'capacete'];
  },
  mudar(i, d) {
    const U = this.ui, L = this.linhas(), k = L[i];
    if (!k) return;
    if (U.aba === 'classe') {
      if (U.modo === 'editar') return this.aviso('A classe não muda depois de criada (as árvores e o equipamento são dela).');
      if (U.classe !== k) { const A0 = U.A; U.classe = k; U.A = persAparenciaPadrao(k); for (const c of ['estilo', 'corpoG', 'rostoG', 'cabeloG', 'barbaG', 'corpo', 'altura', 'pele', 'rosto', 'olhos', 'sobrancelhas', 'cabelo', 'corCabelo', 'barba', 'marcas']) U.A[c] = A0[c]; U.arma = null; U.sujo = true; }
      U.sel = i; game.audio.play('uiSelect');
      return;
    }
    if (U.aba === 'aparencia') {
      const n = persNumOps(k, U.classe);
      U.A[k] = ((U.A[k] + (d || 1)) % n + n) % n;
      U.sel = i; U.sujo = true; game.audio.play('uiMove');
      return;
    }
    const def = this.previa();
    if (k === 'arma') { const W = this.armasDe(def); if (W.length) { const j = W.indexOf(U.arma || W[0]); U.arma = W[((j + (d || 1)) % W.length + W.length) % W.length]; U.sujo = true; } }
    else if (k === 'peitoral') U.peitoral = this.peitoralDe(U.classe, U.peitoral) === 'ini_peitoral' ? 'ini_armadura' : 'ini_peitoral';
    else if (k === 'mostrar') U.mostrarEquip = !U.mostrarEquip;
    else if (k === 'capacete') U.ocultarCapacete = !U.ocultarCapacete;
    U.sel = i; game.audio.play('uiMove');
  },
  acao(id, v) {
    const U = this.ui;
    if (id === 'aba') { U.aba = v; U.sel = v === 'aparencia' && this.realista() ? 1 : 0; game.audio.play('uiMove'); return; }   // Realista: começa no corpo (a linha 0 é o estilo)
    if (id === 'linha') { this.mudar(v, 1); return; }
    // grade de miniaturas (estilo Realista): escolhe a opção direto; categoria; estilo
    if (id === 'opcao') { U.A[v.k] = v.i; U.sel = Math.max(0, this.linhas().indexOf(v.k)); U.sujo = true; game.audio.play('uiMove'); return; }
    if (id === 'cat') { const C = CRIA_CATS.find((c) => c.id === v); if (C) { U.sel = this.linhas().indexOf(C.campos[0]); game.audio.play('uiMove'); } return; }
    if (id === 'estilo') { if (U.A.estilo !== v) { U.A.estilo = v; U.sel = 0; U.sujo = true; game.audio.play('uiSelect'); } return; }
    if (id === 'menos') { this.mudar(v, -1); return; }
    if (id === 'nome') { this.digitar(true); return; }
    if (id === 'aleatorio') { this.aleatorio(); return; }
    if (id === 'pose') { U.pose = v; return; }
    if (id === 'zoom') { U.zoomAlvo = v; return; }
    if (id === 'girar') { U.yaw += v; return; }
    if (id === 'voltar') { if (U.modo === 'lista' || !Perfis.lista().length) this.fechar(); else { U.modo = 'lista'; this.parar(); } return; }
    if (id === 'sim') { const f = U.confirma && U.confirma.fn; U.confirma = null; if (f) f(); return; }
    if (id === 'nao') { U.confirma = null; return; }
    if (id === 'novo') { this.novo(); return; }
    if (id === 'perfil') { U.lsel = v; game.audio.play('uiMove'); return; }
    if (id === 'kael') {
      U.confirma = { txt: 'Jogar o mundo original com o Kael e os heróis da história?', fn: () => { Perfis.ativar(null); this.comecar(false); } };
      return;
    }
    const p = Perfis.lista()[U.lsel];
    if (id === 'jogar' || id === 'jogar3p') { if (p) { Perfis.ativar(p.id); this.comecar(id === 'jogar3p'); } return; }
    if (id === 'editar') { if (p) this.editar(p); return; }
    if (id === 'excluir') {
      if (p) U.confirma = { txt: `Excluir ${p.nome} e o mundo dele? Isso não pode ser desfeito.`, fn: () => { Perfis.excluir(p.id); U.lsel = 0; if (!Perfis.lista().length) this.novo(); this.aviso(`${p.nome} foi excluído.`, true); } };
      return;
    }
    if (id === 'confirmar') {
      const r = Perfis.criar(U.nome, U.classe, U.A, U.editId, { ocultarCapacete: U.ocultarCapacete, arma: U.arma, peitoral: U.peitoral });
      if (!r.ok) { this.aviso(r.erro); if (/nome/i.test(r.erro)) this.digitar(true); return; }
      game.audio.play('levelUp');
      if (U.modo === 'editar') { U.modo = 'lista'; U.lsel = Math.max(0, Perfis.lista().indexOf(r.perfil)); this.aviso(`${r.perfil.nome} foi atualizado.`, true); return; }
      Perfis.ativar(r.perfil.id);
      this.comecar(U.terceira);
    }
    if (id === 'camera') U.terceira = !U.terceira;
  },
  // Começa o mundo do personagem ativo (ou o original do Kael)
  comecar(terceira) {
    this.parar();
    delete CHARACTERS_BY_ID.p_previa; delete SKILL_SETS.p_previa; delete RosterManager.weapon.p_previa;
    game.fadeTo(() => { ThirdView.set(!!terceira, true); game.startWorld(); game.fadeTarget = 0; });
  },

  // ------------------------------------------------------------ desenho
  draw(ctx, t) {
    const U = this.ui;
    if (!U) return;
    U.rects.length = 0;
    // fundo: salão escuro com névoa violeta e brasas
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H * 0.55, 40, VIEW_W / 2, VIEW_H * 0.55, VIEW_W * 0.75);
    g.addColorStop(0, '#1a1426'); g.addColorStop(0.55, '#0b0912'); g.addColorStop(1, '#040308');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const mL = 24, wL = Math.min(350, VIEW_W * 0.28), wR = Math.min(310, VIEW_W * 0.25), top = 70;
    const P = { x: mL + wL + 12, y: 56, w: VIEW_W - (mL + wL + 12) - (wR + 36), h: VIEW_H - 56 - 64 };
    this.rPrev = P;
    this.prevista(ctx, P, t);
    // título
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 22px ${FONT_TITLE}`; ctx.letterSpacing = '6px'; ctx.fillStyle = '#f0e6ff';
    ctx.fillText(U.modo === 'lista' ? 'PERSONAGENS' : U.modo === 'editar' ? 'EDITAR PERSONAGEM' : 'CRIAR PERSONAGEM', mL, 32);
    ctx.letterSpacing = '0px'; ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,190,230,0.75)';
    ctx.fillText(U.modo === 'lista' ? 'Escolha com quem explorar o mundo aberto · cada personagem tem o próprio mundo salvo' : 'Nome, aparência e classe · arraste o personagem para girar · roda ou +/− para aproximar · P troca a pose', mL + (U.modo === 'lista' ? 250 : 340), 33);
    ctx.restore();
    if (U.modo === 'lista') this.drawLista(ctx, mL, top, wL, wR, t);
    else { this.drawEsquerda(ctx, mL, top, wL, t); this.drawDireita(ctx, VIEW_W - wR - 24, top, wR, t); }
    this.drawBarra(ctx, P, t);
    if (U.msgT > 0 && U.erro) {
      ctx.save(); ctx.globalAlpha = Math.min(1, U.msgT);
      ctx.font = `bold 13px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(U.erro).width + 30;
      ctx.fillStyle = 'rgba(8,6,14,0.94)'; ctx.fillRect(VIEW_W / 2 - w / 2, P.y + 8, w, 28);
      ctx.strokeStyle = U.ok ? 'rgba(140,255,170,0.8)' : 'rgba(255,120,130,0.85)'; ctx.strokeRect(VIEW_W / 2 - w / 2 + 0.5, P.y + 8.5, w - 1, 27);
      ctx.fillStyle = U.ok ? '#bfffd0' : '#ffb0b8'; ctx.fillText(U.erro, VIEW_W / 2, P.y + 22);
      ctx.restore();
    }
    if (U.confirma) this.drawConfirma(ctx);
  },
  // Painel com moldura
  painel(ctx, x, y, w, h, rgb = '170,140,255') {
    ctx.fillStyle = 'rgba(10,8,18,0.86)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = rgba(rgb, 0.35); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = rgba(rgb, 0.8); ctx.fillRect(x, y, 3, 18);
  },
  botao(ctx, id, v, x, y, w, h, txt, ativo = false, rgb = '170,140,255', desab = false) {
    const m = game.input.mouse, hov = m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
    ctx.fillStyle = desab ? 'rgba(30,28,40,0.7)' : ativo ? rgba(rgb, 0.32) : hov ? 'rgba(60,50,90,0.75)' : 'rgba(24,20,38,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = ativo ? rgba(rgb, 0.95) : rgba(rgb, hov ? 0.7 : 0.35); ctx.lineWidth = ativo ? 1.6 : 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = desab ? 'rgba(170,165,190,0.45)' : '#f2ecff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = h < 26 ? 11 : 12;
    ctx.letterSpacing = '1.5px'; ctx.font = `bold ${fs}px ${FONT_TITLE}`;
    while (fs > 8 && ctx.measureText(txt).width > w - 12) ctx.font = `bold ${--fs}px ${FONT_TITLE}`;   // texto longo: letra menor, sem passar da borda
    ctx.fillText(txt, x + w / 2, y + h / 2 + 0.5); ctx.letterSpacing = '0px';
    if (!desab) this.ui.rects.push({ id, v, x, y, w, h });
  },
  drawEsquerda(ctx, x, y, w, t) {
    const U = this.ui, h = VIEW_H - y - 24, C = PERS_CLASSES[U.classe], rgb = hexToRgb(C.cor);
    this.painel(ctx, x, y, w, h, rgb);
    const abas = [['classe', 'CLASSE'], ['aparencia', 'APARÊNCIA'], ['equipamento', 'EQUIPAMENTO']], bw = (w - 24) / 3;
    abas.forEach(([id, nm], i) => this.botao(ctx, 'aba', id, x + 12 + i * bw, y + 12, bw - 4, 28, nm, U.aba === id, rgb));
    const y0 = y + 52;
    ctx.textBaseline = 'middle';
    if (U.aba === 'classe') {
      const L = this.linhas(), ch = Math.min(70, (h - 200) / 5);
      L.forEach((k, i) => {
        const K = PERS_CLASSES[k], yy = y0 + i * (ch + 6), on = U.classe === k, c = hexToRgb(K.cor);
        ctx.fillStyle = on ? rgba(c, 0.2) : U.sel === i ? 'rgba(50,42,80,0.6)' : 'rgba(20,16,32,0.8)'; ctx.fillRect(x + 12, yy, w - 24, ch);
        ctx.strokeStyle = on ? rgba(c, 0.95) : rgba(c, 0.25); ctx.lineWidth = on ? 1.6 : 1; ctx.strokeRect(x + 12.5, yy + 0.5, w - 25, ch - 1);
        ctx.fillStyle = rgba(c, 0.9); ctx.fillRect(x + 12, yy, 4, ch);
        ctx.textAlign = 'left'; ctx.font = `bold 15px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = on ? '#ffffff' : 'rgba(225,215,245,0.9)';
        ctx.fillText(K.nome.toUpperCase(), x + 26, yy + ch * 0.36); ctx.letterSpacing = '0px';
        ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = rgba(c, 0.95); ctx.fillText(K.papel, x + 26, yy + ch * 0.7);
        U.rects.push({ id: 'linha', v: i, x: x + 12, y: yy, w: w - 24, h: ch });
      });
      // descrição da classe escolhida
      const yy = y0 + L.length * (ch + 6) + 6;
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(215,205,240,0.9)'; ctx.textAlign = 'left';
      wrapText(ctx, C.desc, w - 30).forEach((ln, i) => ctx.fillText(ln, x + 16, yy + 8 + i * 16));
      if (U.modo === 'editar') { ctx.fillStyle = 'rgba(255,200,150,0.85)'; ctx.fillText('A classe é fixa depois de criada.', x + 16, y + h - 18); }
      return;
    }
    if (U.aba === 'aparencia' && this.realista()) { this.drawGrades(ctx, x, y0, w, h - (y0 - y), rgb); return; }
    if (U.aba === 'aparencia') {
      const L = this.linhas(), rh = Math.min(36, (h - 64) / L.length);
      L.forEach((k, i) => {
        const yy = y0 + i * rh, on = U.sel === i, ops = k === 'roupa' ? C.roupas : PERS_APAR[k].ops, v = U.A[k];
        if (on) { ctx.fillStyle = 'rgba(70,56,120,0.45)'; ctx.fillRect(x + 8, yy, w - 16, rh - 3); }
        ctx.textAlign = 'left'; ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = on ? '#ffffff' : 'rgba(200,190,230,0.85)';
        ctx.fillText(PERS_APAR[k].nome, x + 16, yy + rh / 2);
        const vx = x + w * 0.46, vw = w * 0.54 - 20;
        this.seta(ctx, x + w * 0.46, yy + 3, rh - 9, -1, i);
        this.seta(ctx, x + w - 16 - (rh - 9), yy + 3, rh - 9, 1, i);
        const cores = PERS_APAR[k].cores, cx = vx + (rh - 9) + 6;
        if (cores) { ctx.fillStyle = cores[v]; ctx.fillRect(cx, yy + rh / 2 - 6, 12, 12); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeRect(cx + 0.5, yy + rh / 2 - 5.5, 11, 11); }
        ctx.font = `bold 12px ${FONT_UI}`; ctx.fillStyle = '#efe8ff'; ctx.textAlign = 'center';
        ctx.fillText(ops[v] || '', vx + vw / 2 + (cores ? 8 : 0), yy + rh / 2);
        U.rects.push({ id: 'linha', v: i, x: vx + (rh - 9) + 2, y: yy, w: vw - 2 * (rh - 9) - 4, h: rh - 3 });
      });
      this.botao(ctx, 'aleatorio', 0, x + 12, y + h - 40, w - 24, 28, 'APARÊNCIA ALEATÓRIA', false, rgb);
      return;
    }
    // equipamento
    const def = this.previa(), W = this.armasDe(def), arma = U.arma || W[0], rh = 36;
    const pe = this.peitoralDe(U.classe, U.peitoral);
    const rows = [['Arma principal', WEAPON_DEFS[arma] ? WEAPON_DEFS[arma].name : '—'], ['Peitoral inicial', pe === 'ini_armadura' ? 'COURAÇA' : 'GIBÃO'], ['Mostrar peças na prévia', U.mostrarEquip ? 'SIM' : 'NÃO'], ['Esconder o capuz', U.ocultarCapacete ? 'SIM' : 'NÃO']];
    rows.forEach(([nm, val], i) => {
      const yy = y0 + i * rh, on = U.sel === i;
      if (on) { ctx.fillStyle = 'rgba(70,56,120,0.45)'; ctx.fillRect(x + 8, yy, w - 16, rh - 3); }
      ctx.textAlign = 'left'; ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = on ? '#fff' : 'rgba(200,190,230,0.85)'; ctx.fillText(nm, x + 16, yy + rh / 2);
      this.seta(ctx, x + w * 0.5, yy + 4, rh - 11, -1, i); this.seta(ctx, x + w - 16 - (rh - 11), yy + 4, rh - 11, 1, i);
      ctx.font = `bold 12px ${FONT_UI}`; ctx.fillStyle = '#efe8ff'; ctx.textAlign = 'center'; ctx.fillText(val, x + w * 0.75 - 4, yy + rh / 2);
      U.rects.push({ id: 'linha', v: i, x: x + w * 0.5 + rh, y: yy, w: w * 0.5 - 2 * rh, h: rh - 3 });
    });
    let yy = y0 + rows.length * rh + 14;
    ctx.textAlign = 'left'; ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = rgba(rgb, 1);
    ctx.fillText('ARMAS DA CLASSE', x + 16, yy); ctx.letterSpacing = '0px'; yy += 20;
    ctx.font = `12px ${FONT_UI}`;
    for (const w0 of def.weapons) { const D = WEAPON_DEFS[w0]; if (!D) continue; ctx.fillStyle = w0 === arma ? '#ffffff' : 'rgba(200,190,230,0.8)'; ctx.fillText(`${D.gadget ? 'Equipamento' : w0 === arma ? 'Principal' : 'Secundária'} · ${D.name}`, x + 16, yy); yy += 18; }
    yy += 8;
    ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = rgba(rgb, 1);
    ctx.fillText('CONJUNTO DO INICIADO · NÍVEL 1', x + 16, yy); ctx.letterSpacing = '0px'; yy += 12;
    // as sete peças (miniaturas): as vestidas acesas, o outro peitoral apagado
    const ids = ARM_INICIAL.filter((id) => ARMADURAS_GLB[id]), cs = Math.min(64, (w - 32 - 6 * 3) / 4);
    ids.forEach((id, i) => {
      const cx = x + 16 + (i % 4) * (cs + 6), cy = yy + Math.floor(i / 4) * (cs + 6), D = ARMADURAS_GLB[id], veste = !((id === 'ini_peitoral' || id === 'ini_armadura') && id !== pe);
      ctx.fillStyle = veste ? 'rgba(34,28,52,0.95)' : 'rgba(16,14,24,0.8)'; ctx.fillRect(cx, cy, cs, cs);
      ctx.strokeStyle = veste ? rgba(ARS_RARIDADES[0].rgb, 0.7) : 'rgba(120,110,150,0.3)'; ctx.strokeRect(cx + 0.5, cy + 0.5, cs - 1, cs - 1);
      const im = this.mini(id);
      if (im) { ctx.globalAlpha = veste ? 1 : 0.35; ctx.drawImage(im, cx + 3, cy + 3, cs - 6, cs - 6); ctx.globalAlpha = 1; }
      else this.icone(ctx, D.equipmentSlot, cx + cs / 2, cy + cs / 2, cs * 0.5);
    });
    yy += Math.ceil(ids.length / 4) * (cs + 6) + 10;
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(180,170,210,0.75)';
    wrapText(ctx, 'Raridade Comum. As sete peças vão para a mochila (uma vez só) e seis já começam vestidas; o conjunto de nível 30 da classe se conquista no mundo. Na aba EQUIPAMENTO do mundo, cada peça é trocada à parte.', w - 30).forEach((ln, i) => ctx.fillText(ln, x + 16, yy + i * 16));
  },
  icone(ctx, slot, cx, cy, s) { if (typeof Arsenal !== 'undefined' && Arsenal.iconeVaga) Arsenal.iconeVaga(ctx, slot, cx, cy, s, 'rgba(200,190,230,0.7)'); },
  // Estilo Realista: estilo, categorias e a grade de miniaturas das opções da categoria
  drawGrades(ctx, x, y0, w, h, rgb) {
    const U = this.ui, A = U.A, L = this.linhas(), campo = L[U.sel] || 'corpoG', catAt = (CRIA_CATS.find((c) => c.campos.includes(campo)) || CRIA_CATS[0]);
    const bw = (w - 28) / 2;
    this.botao(ctx, 'estilo', 0, x + 12, y0, bw, 26, 'REALISTA', A.estilo !== 1, rgb);
    this.botao(ctx, 'estilo', 1, x + 16 + bw, y0, bw, 26, 'ESTILIZADO', A.estilo === 1, rgb);
    const cw = (w - 24) / CRIA_CATS.length;
    CRIA_CATS.forEach((c, i) => this.botao(ctx, 'cat', c.id, x + 12 + i * cw, y0 + 34, cw - 4, 26, c.nome, c === catAt, rgb));
    let yy = y0 + 72;
    const fim = y0 + h - 56;
    for (const k of catAt.campos) {
      const on = campo === k;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
      ctx.fillStyle = on ? rgba(rgb, 1) : 'rgba(200,190,230,0.8)'; ctx.fillText(PERS_APAR[k].nome.toUpperCase(), x + 14, yy + 6); ctx.letterSpacing = '0px';
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = '#efe8ff'; ctx.textAlign = 'right';
      ctx.fillText(PERS_APAR[k].ops[A[k]] || '', x + w - 14, yy + 6);
      yy += 16;
      const ops = PERS_APAR[k].ops, n = ops.length;
      if (CRIA_MINI[k]) {
        // grade de miniaturas
        const ids = CRIA_MINI[k](), cols = k === 'corpoG' ? 2 : k === 'rostoG' ? 4 : 3, rows = Math.ceil(n / cols);
        const cs = Math.min((w - 24 - (cols - 1) * 6) / cols, (fim - yy - (catAt.campos.length > 1 ? 70 : 0)) / rows - 6);
        for (let i = 0; i < n; i++) {
          const cx = x + 12 + (i % cols) * (cs + 6), cy = yy + Math.floor(i / cols) * (cs + 6), sel = A[k] === i;
          const m = game.input.mouse, hov = m.x >= cx && m.x <= cx + cs && m.y >= cy && m.y <= cy + cs;
          const g = ctx.createLinearGradient(0, cy, 0, cy + cs);
          g.addColorStop(0, sel ? rgba(rgb, 0.32) : 'rgba(40,34,60,0.95)'); g.addColorStop(1, 'rgba(12,10,20,0.95)');
          ctx.fillStyle = g; ctx.fillRect(cx, cy, cs, cs);
          const im = this.mini(ids[i]);
          if (im) ctx.drawImage(im, cx + 4, cy + 2, cs - 8, cs - 8);
          else if (!ids[i]) {   // 'sem': círculo cortado
            ctx.strokeStyle = 'rgba(200,190,230,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx + cs / 2, cy + cs / 2 - 6, cs * 0.18, 0, Math.PI * 2);
            ctx.moveTo(cx + cs / 2 - cs * 0.13, cy + cs / 2 - 6 + cs * 0.13); ctx.lineTo(cx + cs / 2 + cs * 0.13, cy + cs / 2 - 6 - cs * 0.13); ctx.stroke();
          } else { ctx.fillStyle = 'rgba(200,190,230,0.4)'; ctx.font = `11px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillText('…', cx + cs / 2, cy + cs / 2); }
          ctx.fillStyle = 'rgba(6,5,10,0.7)'; ctx.fillRect(cx, cy + cs - 16, cs, 16);
          ctx.font = `${cs < 70 ? 9 : 10}px ${FONT_UI}`; ctx.fillStyle = sel ? '#ffffff' : 'rgba(215,205,240,0.85)'; ctx.textAlign = 'center';
          ctx.fillText(ops[i], cx + cs / 2, cy + cs - 8);
          ctx.strokeStyle = sel ? rgba(rgb, 1) : hov ? 'rgba(200,180,255,0.7)' : 'rgba(150,130,210,0.3)'; ctx.lineWidth = sel ? 2 : 1;
          ctx.strokeRect(cx + 0.5, cy + 0.5, cs - 1, cs - 1);
          U.rects.push({ id: 'opcao', v: { k, i }, x: cx, y: cy, w: cs, h: cs });
        }
        yy += rows * (cs + 6) + 10;
      } else if (PERS_APAR[k].cores) {
        // amostras de cor
        const cols = Math.min(8, n), cs = Math.min(34, (w - 24 - (cols - 1) * 6) / cols);
        for (let i = 0; i < n; i++) {
          const cx = x + 12 + (i % cols) * (cs + 6), cy = yy + Math.floor(i / cols) * (cs + 6), sel = A[k] === i;
          ctx.fillStyle = PERS_APAR[k].cores[i]; ctx.fillRect(cx, cy, cs, cs);
          ctx.strokeStyle = sel ? '#ffffff' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = sel ? 2.5 : 1; ctx.strokeRect(cx + 0.5, cy + 0.5, cs - 1, cs - 1);
          U.rects.push({ id: 'opcao', v: { k, i }, x: cx, y: cy, w: cs, h: cs });
        }
        yy += Math.ceil(n / cols) * (cs + 6) + 14;
      } else {
        // opções em botões (altura)
        const bw2 = (w - 24 - (n - 1) * 4) / n;
        for (let i = 0; i < n; i++) this.botao(ctx, 'opcao', { k, i }, x + 12 + i * (bw2 + 4), yy, bw2, 26, ops[i].toUpperCase(), A[k] === i, rgb);
        yy += 40;
      }
    }
    if (catAt.id === 'cores') {
      ctx.textAlign = 'left'; ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(180,170,210,0.75)';
      wrapText(ctx, 'A cor da pele vale para o corpo e o rosto; a do cabelo, para o cabelo e a barba. Sombras, poros e reflexos da textura continuam.', w - 30).forEach((ln, i) => ctx.fillText(ln, x + 16, yy + i * 16));
    }
    this.botao(ctx, 'aleatorio', 0, x + 12, y0 + h - 40, w - 24, 28, 'APARÊNCIA ALEATÓRIA', false, rgb);
  },
  seta(ctx, x, y, s, d, i) {
    const m = game.input.mouse, hov = m.x >= x && m.x <= x + s && m.y >= y && m.y <= y + s;
    ctx.fillStyle = hov ? 'rgba(120,100,190,0.7)' : 'rgba(40,32,66,0.85)'; ctx.fillRect(x, y, s, s);
    ctx.fillStyle = '#e8e0ff'; ctx.beginPath();
    if (d < 0) { ctx.moveTo(x + s * 0.65, y + s * 0.25); ctx.lineTo(x + s * 0.3, y + s / 2); ctx.lineTo(x + s * 0.65, y + s * 0.75); }
    else { ctx.moveTo(x + s * 0.35, y + s * 0.25); ctx.lineTo(x + s * 0.7, y + s / 2); ctx.lineTo(x + s * 0.35, y + s * 0.75); }
    ctx.closePath(); ctx.fill();
    this.ui.rects.push({ id: d < 0 ? 'menos' : 'linha', v: i, x, y, w: s, h: s });
  },
  drawDireita(ctx, x, y, w, t) {
    const U = this.ui, C = PERS_CLASSES[U.classe], rgb = hexToRgb(C.cor), h = VIEW_H - y - 24, B = CHARACTERS_BY_ID[C.base];
    this.painel(ctx, x, y, w, h, rgb);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = rgba(rgb, 1); ctx.fillText('NOME', x + 14, y + 20); ctx.letterSpacing = '0px';
    // caixa do nome (clique para digitar)
    const nb = this.rNome = { x: x + 14, y: y + 32, w: w - 28 - 40, h: 32 };
    ctx.fillStyle = U.digitando ? 'rgba(40,30,70,0.95)' : 'rgba(18,14,30,0.95)'; ctx.fillRect(nb.x, nb.y, nb.w, nb.h);
    ctx.strokeStyle = U.digitando ? rgba(rgb, 1) : 'rgba(170,150,230,0.5)'; ctx.strokeRect(nb.x + 0.5, nb.y + 0.5, nb.w - 1, nb.h - 1);
    ctx.font = `bold 16px ${FONT_UI}`; ctx.fillStyle = U.nome ? '#ffffff' : 'rgba(170,160,200,0.6)';
    const txt = U.nome || 'Clique e digite o nome', cur = U.digitando && Math.sin(t * 8) > 0 ? '|' : '';
    ctx.fillText(txt + cur, nb.x + 10, nb.y + nb.h / 2);
    U.rects.push({ id: 'nome', x: nb.x, y: nb.y, w: nb.w, h: nb.h });
    this.botao(ctx, 'aleatorio', 0, x + w - 50, y + 32, 36, 32, '⟳', false, rgb);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const vn = U.nome ? Perfis.validarNome(U.nome, U.editId) : null;
    ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = vn && !vn.ok ? '#ff9aa6' : 'rgba(170,160,200,0.7)';
    ctx.fillText(vn && !vn.ok ? vn.erro : '2 a 16 letras, números, espaço, hífen ou apóstrofo', x + 14, y + 76);
    // classe: atributos (barras) e números de verdade
    let yy = y + 100;
    ctx.font = `bold 16px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = '#ffffff'; ctx.fillText(C.nome.toUpperCase(), x + 14, yy); ctx.letterSpacing = '0px';
    ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = rgba(rgb, 0.95); const luta = `luta como ${B ? B.name : C.base}`, linha = `${luta} · ${C.papel}`; ctx.fillText(ctx.measureText(linha).width > w - 28 ? luta : linha, x + 14, yy + 18);
    yy += 40;
    for (const at in C.atrib) {
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(215,205,240,0.9)'; ctx.fillText(at, x + 14, yy);
      ctx.fillStyle = 'rgba(40,34,62,0.9)'; ctx.fillRect(x + 100, yy - 4, w - 130, 8);
      ctx.fillStyle = rgba(rgb, 0.9); ctx.fillRect(x + 100, yy - 4, (w - 130) * C.atrib[at] / 10, 8);
      yy += 18;
    }
    yy += 6;
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = '#e8e0ff';
    const nums = PersClasse.linhas(U.classe).join(' · ');
    wrapText(ctx, nums, w - 28).forEach((ln, i) => ctx.fillText(ln, x + 14, yy + i * 16)); yy += wrapText(ctx, nums, w - 28).length * 16 + 10;
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = rgba(rgb, 1); ctx.fillText('HABILIDADES', x + 14, yy); ctx.letterSpacing = '0px'; yy += 18;
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(215,205,240,0.9)';
    const hab = B ? B.abilities.map((a) => ABILITY_DEFS[a] && ABILITY_DEFS[a].name).filter(Boolean) : [];
    const ult = C.base === 'kael' ? 'Eclipse Absoluto' : (HERO_ULT_INFO[C.base] || [''])[0];
    const habT = `${hab.join(' · ')}${ult ? ` · Suprema: ${ult}` : ''}`;
    wrapText(ctx, habT, w - 28).forEach((ln, i) => ctx.fillText(ln, x + 14, yy + i * 16));
    // botões
    const by = y + h - 92;
    this.botao(ctx, 'camera', 0, x + 14, by, w - 28, 26, `CÂMERA NO MUNDO: ${U.terceira ? '3ª PESSOA' : 'ISOMÉTRICA'}`, false, rgb);
    this.botao(ctx, 'confirmar', 0, x + 14, by + 32, w - 28, 34, U.modo === 'editar' ? 'SALVAR ALTERAÇÕES' : 'CRIAR E JOGAR', true, rgb);
  },
  // Lista dos personagens da conta
  drawLista(ctx, x, y, wL, wR, t) {
    const U = this.ui, L = Perfis.lista(), h = VIEW_H - y - 24;
    this.painel(ctx, x, y, wL, h);
    const rh = 58;
    L.forEach((p, i) => {
      const C = PERS_CLASSES[p.classe], c = hexToRgb(C.cor), yy = y + 14 + i * (rh + 6), on = U.lsel === i;
      if (yy + rh > y + h - 100) return;
      ctx.fillStyle = on ? rgba(c, 0.22) : 'rgba(20,16,32,0.85)'; ctx.fillRect(x + 12, yy, wL - 24, rh);
      ctx.strokeStyle = on ? rgba(c, 0.95) : rgba(c, 0.3); ctx.strokeRect(x + 12.5, yy + 0.5, wL - 25, rh - 1);
      ctx.fillStyle = rgba(c, 0.9); ctx.fillRect(x + 12, yy, 4, rh);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `bold 16px ${FONT_TITLE}`; ctx.fillStyle = '#ffffff'; ctx.fillText(p.nome, x + 26, yy + 20);
      const nv = this.nivelSalvo(p.id);
      ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = rgba(c, 0.95); ctx.fillText(`${C.nome}${nv ? ` · nível ${nv}` : ' · mundo novo'}`, x + 26, yy + 40);
      U.rects.push({ id: 'perfil', v: i, x: x + 12, y: yy, w: wL - 24, h: rh });
    });
    this.botao(ctx, 'novo', 0, x + 12, y + h - 86, wL - 24, 34, '+ NOVO PERSONAGEM', false);
    this.botao(ctx, 'kael', 0, x + 12, y + h - 46, wL - 24, 30, 'MUNDO ORIGINAL (KAEL)', false, '90,150,255');
    const xr = VIEW_W - wR - 24, p = L[U.lsel];
    this.painel(ctx, xr, y, wR, h);
    if (!p) return;
    const C = PERS_CLASSES[p.classe], rgb = hexToRgb(C.cor);
    ctx.textAlign = 'left'; ctx.font = `bold 20px ${FONT_TITLE}`; ctx.fillStyle = '#fff'; ctx.fillText(p.nome, xr + 14, y + 26);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = rgba(rgb, 1); ctx.fillText(`${C.nome} · ${C.papel}`, xr + 14, y + 48);
    ctx.fillStyle = 'rgba(200,190,230,0.8)';
    ctx.fillText(`Criado em ${new Date(p.criado).toLocaleDateString('pt-BR')}`, xr + 14, y + 70);
    const nv = this.nivelSalvo(p.id);
    ctx.fillText(nv ? `Mundo salvo · nível ${nv}` : 'Ainda não entrou no mundo', xr + 14, y + 88);
    wrapText(ctx, C.desc, wR - 28).forEach((ln, i) => ctx.fillText(ln, xr + 14, y + 116 + i * 16));
    const by = y + h - 162;
    this.botao(ctx, 'jogar', 0, xr + 14, by, wR - 28, 34, 'JOGAR', true, rgb);
    this.botao(ctx, 'jogar3p', 0, xr + 14, by + 40, wR - 28, 30, 'JOGAR EM 3ª PESSOA', false, rgb);
    this.botao(ctx, 'editar', 0, xr + 14, by + 76, (wR - 34) / 2, 30, 'EDITAR', false, rgb);
    this.botao(ctx, 'excluir', 0, xr + 20 + (wR - 34) / 2, by + 76, (wR - 34) / 2, 30, 'EXCLUIR', false, '255,110,120');
    this.botao(ctx, 'voltar', 0, xr + 14, by + 112, wR - 28, 30, 'VOLTAR AO MENU', false, rgb);
  },
  // Nível guardado no mundo salvo do personagem (sem carregar o mundo)
  nivelSalvo(id) {
    try { const s = JSON.parse(localStorage.getItem(`${WORLD_SAVE_KEY}:${id}`) || 'null'), c = s && s.game && s.game.party && s.game.party.chars && s.game.party.chars[id]; return c ? c.level : 0; } catch (e) { return 0; }
  },
  drawBarra(ctx, P, t) {
    const U = this.ui, y = P.y + P.h + 12, bw = Math.min(96, P.w / CRIA_POSES.length);
    let x = P.x;
    CRIA_POSES.forEach((nm, i) => { this.botao(ctx, 'pose', i, x, y, bw - 4, 26, nm.toUpperCase(), U.pose === i); x += bw; });
    x = P.x + P.w / 2 - (3 * 96) / 2;   // zoom: no alto da prévia
    CRIA_ZOOM.forEach((Z, i) => { this.botao(ctx, 'zoom', i, x, P.y + 8, 92, 26, Z.nome.toUpperCase(), Math.round(U.zoomAlvo) === i); x += 96; });
    this.botao(ctx, 'girar', 0.5, P.x + P.w - 70, P.y + 8, 30, 26, '⟲');
    this.botao(ctx, 'girar', -0.5, P.x + P.w - 36, P.y + 8, 30, 26, '⟳');
    if (U.modo !== 'lista') this.botao(ctx, 'voltar', 0, P.x, P.y + 8, 90, 26, '‹ VOLTAR');
  },
  drawConfirma(ctx) {
    const U = this.ui, w = 460, h = 130, x = VIEW_W / 2 - w / 2, y = VIEW_H / 2 - h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.painel(ctx, x, y, w, h, '255,160,140');
    ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    wrapText(ctx, U.confirma.txt, w - 40).forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, y + 34 + i * 18));
    this.botao(ctx, 'sim', 0, x + 40, y + h - 46, 170, 32, 'CONFIRMAR', true, '255,160,140');
    this.botao(ctx, 'nao', 0, x + w - 210, y + h - 46, 170, 32, 'CANCELAR', false);
  },

  // ------------------------------------------------------------ prévia 3D em perspectiva
  prevista(ctx, P, t) {
    const U = this.ui, def = this.previa();
    // moldura e chão do salão
    ctx.save();
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
    g.addColorStop(0, 'rgba(30,22,48,0.6)'); g.addColorStop(1, 'rgba(6,4,10,0.9)');
    ctx.fillStyle = g; ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.restore();
    if (!def) return;
    if (!R3D.active || !R3D.progsP) {
      ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(220,210,240,0.8)'; ctx.textAlign = 'center';
      ctx.fillText('Prévia 3D indisponível (WebGL desligado nas configurações ou no navegador)', P.x + P.w / 2, P.y + P.h / 2);
      return;
    }
    const key = def.model;
    if (!game.model3(key)) return;
    // personagem de vitrine (um Player de verdade, só para a pose)
    let k = this.vit;
    if (!k || k.def !== def) k = this.vit = new Player(0, 0, def);
    const pose = U.pose, rgb = hexToRgb(def.color);
    k.vitrine = true; k.animTime = t; k.stateTime = t % 4; k.flash = 0; k.fury = 60; k.z = 0; k.air = false; k.facing = k.viewFacing = 0;
    k.state = 'idle'; k.moveSpeed = 0; k.attack = null; k.wpnOut = pose !== 0; k.idleVariant = 'idle_breathing'; k.idleBlend = 0;
    if (pose === 1) { k.idleVariant = 'idle_combat_ready'; k.idleBlend = 1; }
    else if (pose === 2) { k.idleVariant = 'idle_victory'; k.idleBlend = 1; }
    else if (pose === 3) { k.state = 'run'; k.moveSpeed = k.baseSpeed; k.vx = k.baseSpeed; k.vy = 0; }
    else if (pose === 4) {
      // golpe da arma da classe: o primeiro do combo, repetido (preparação, impacto, recuperação)
      const T = CHARACTER_COMBOS[def.base] || COMBO_TABLE, id = T && T.L, d = ATTACKS[id];
      if (d) { const dur = (d.windup || 0.1) + (d.active || 0.1) + (d.recovery || 0.3) + 0.5; k.state = 'attack'; k.attack = { id, def: d, t: t % dur, dir: 0, serial: Math.floor(t / dur) }; }
    }
    k.pecasPrevia = this.pecasPrevia(def);
    // câmera em órbita (perspectiva): zoom entre corpo inteiro, busto e rosto
    const z0 = Math.floor(U.zoom), z1 = Math.min(2, z0 + 1), f = U.zoom - z0, alt = PersonagemModelo.ALTURA[def.aparencia.altura] || 1;
    const dist = (CRIA_ZOOM[z0].d + (CRIA_ZOOM[z1].d - CRIA_ZOOM[z0].d) * f) * alt, tz = (CRIA_ZOOM[z0].z + (CRIA_ZOOM[z1].z - CRIA_ZOOM[z0].z) * f) * alt;
    const view = this.camera(P, U.yaw, 0.1 + 0.08 * (1 - U.zoom / 2), dist, tz);
    // luz: principal quente girando devagar e contraluz na cor da classe
    const L = R3D.light, salva = { amb: L.amb, key: L.key, rim: L.rim };
    L.amb = [0.3, 0.27, 0.38]; L.key = [1.05, 0.95, 0.85]; L.rim = hex3(def.color).map((v) => v * 0.9);
    const a = t * 0.25;
    view.key = this.norm([Math.cos(a) * 0.6 + 0.5, Math.sin(a) * 0.6 - 0.3, 0.8]);
    view.rim = this.norm([-Math.cos(U.yaw) * 0.8, -Math.sin(U.yaw) * 0.8, 0.45]);
    view.fog = [0.05, 0.04, 0.08, 900];
    const o = game.opts3(k, 0);
    const it = game.queue3(key, k, o);
    if (it) { const M = o.m3 || (o.m3 = M3.make()), sc = o.scale || 1; M3.trs(M, [0, 0, 0], [o.roll || 0, o.pitch || 0, 0], [sc, sc, sc]); o.m = M; }
    // altar com runas e sombra
    const ao = this._altO || (this._altO = { m: M3.make(), flash: 0, emi: 1, scale: 1 });
    M3.trs(ao.m, [0, 0, 0], [0, 0, t * 0.15], [1, 1, 1]);
    R3D.queue(this.altar(rgb), null, null, ao);
    const so = this._somO || (this._somO = { m: M3.make(), flash: 0, emi: 1 });
    M3.trs(so.m, [0, 0, 1.3], [0, 0, 0], [16, 16, 1]);
    R3D.queue(ThirdView.shadowModel(), null, null, so);
    const sc = Math.min(2, game.scale || 1), W = Math.max(2, Math.round(P.w * sc)), H = Math.max(2, Math.round(P.h * sc));
    let res = null;
    try { res = R3D.renderScene(view, W, H); } catch (e) { console.error(e); }
    L.amb = salva.amb; L.key = salva.key; L.rim = salva.rim;
    if (res) {
      ctx.drawImage(R3D.canvas, 0, 0, res.w, res.h, P.x, P.y, P.w, P.h);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(R3D.canvas, 0, res.ey, res.ew, res.eh, P.x, P.y, P.w, P.h);
      ctx.restore();
    }
    // brasas subindo
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const s = (i * 97.3) % 1, ph = (t * (0.06 + s * 0.05) + i * 0.137) % 1;
      const ex = P.x + P.w * (0.15 + 0.7 * ((i * 0.618) % 1)) + Math.sin(t + i) * 10, ey = P.y + P.h * (1 - ph);
      GlowCache.draw(ctx, rgb, ex, ey, 6 + s * 6, 0.35 * Math.sin(ph * Math.PI));
    }
    ctx.restore();
  },
  norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; },
  // Matriz da câmera (mesma montagem da 3ª pessoa, js/terceira.js): órbita em volta do personagem
  camera(P, yaw, pitch, d, tz) {
    const V = this._V || (this._V = new Float32Array(16)), Pm = this._Pm || (this._Pm = new Float32Array(16)), M = this._M || (this._M = new Float32Array(16));
    const T = [0, 0, tz], E = [Math.cos(yaw) * Math.cos(pitch) * d, Math.sin(yaw) * Math.cos(pitch) * d, tz + Math.sin(pitch) * d];
    const f = this.norm([T[0] - E[0], T[1] - E[1], T[2] - E[2]]);
    let s = [-f[1], f[0], 0]; const l = Math.hypot(s[0], s[1]) || 1; s = [s[0] / l, s[1] / l, 0];
    const u = [-f[2] * s[1], f[2] * s[0], f[0] * s[1] - f[1] * s[0]];
    V[0] = s[0]; V[4] = s[1]; V[8] = s[2]; V[12] = -(s[0] * E[0] + s[1] * E[1] + s[2] * E[2]);
    V[1] = u[0]; V[5] = u[1]; V[9] = u[2]; V[13] = -(u[0] * E[0] + u[1] * E[1] + u[2] * E[2]);
    V[2] = -f[0]; V[6] = -f[1]; V[10] = -f[2]; V[14] = f[0] * E[0] + f[1] * E[1] + f[2] * E[2];
    V[3] = 0; V[7] = 0; V[11] = 0; V[15] = 1;
    const near = 4, far = 3000, F = 1 / Math.tan(0.62 / 2), asp = P.w / P.h;
    Pm.fill(0); Pm[0] = F / asp; Pm[5] = F; Pm[10] = (far + near) / (near - far); Pm[11] = -1; Pm[14] = (2 * far * near) / (near - far);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) M[c * 4 + r] = Pm[r] * V[c * 4] + Pm[4 + r] * V[c * 4 + 1] + Pm[8 + r] * V[c * 4 + 2] + Pm[12 + r] * V[c * 4 + 3];
    return { mvp: M, eye: E };
  },
  // Altar de pedra com o círculo de runas acesas na cor da classe
  altar(rgb) {
    const C = this._alt || (this._alt = {});
    if (C[rgb]) return C[rgb];
    const g = new G3(), cor = '#' + rgb.split(',').map((v) => (+v).toString(16).padStart(2, '0')).join('');
    g.cyl(0, 0, -6, 46, 44, 6, 24, '#1e1a26', 0); g.cyl(0, 0, -0.6, 40, 40, 1.2, 24, '#2a2534', 0);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.box(Math.cos(a) * 35, Math.sin(a) * 35, 0.6, 3.2, 1.2, 0.3, cor, i % 3 ? 0.7 : 1.1); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; g.box(Math.cos(a) * 52, Math.sin(a) * 52, 4, 3, 3, 14, '#2a2430', 0); g.box(Math.cos(a) * 52, Math.sin(a) * 52, 12.5, 1.6, 1.6, 2.4, '#ffc070', 1.2); }
    return (C[rgb] = new Model3(new N3('altar', g)));
  },
};
const CRIA_OPC = (def) => { const p = Perfis.obter(def.id); return (p && p.opcoes) || {}; };

Perfis.carregar();   // personagens da conta (fichas e modelos registrados no início)
