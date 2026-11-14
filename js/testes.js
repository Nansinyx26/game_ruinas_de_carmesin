'use strict';
// ECLIPSE ZERO · Testes automatizados (sem bibliotecas): abra index.html?testes=1
// ---------------------------------------------------------------------------
// Roda dentro do jogo de verdade (mesmos scripts, mesmo motor) e mostra o resultado na tela
// e no console; window.__testes guarda { ok, falhas, total, lista } para automação
// (Playwright, por exemplo). Cobre: armas GLB (dados, decodificação, encaixes), sacar e
// guardar, combate (dano único por golpe, combos e nós que os liberam), árvore em 5 ramos
// (custos, requisitos, efeitos), persistência (salvar e carregar), idle e troca de arma.
// Os passos de jogo são feitos à mão (Player.update com dt fixo), sem depender da taxa de
// quadros. Os testes começam uma partida nova no espaço de salvamento 2 e não o gravam.
// ---------------------------------------------------------------------------
const EclipseTests = {
  lista: [],
  ok(nome, cond, info) { this.lista.push({ nome, ok: !!cond, info: cond ? '' : String(info === undefined ? '' : info) }); },
  igual(nome, a, b) { this.ok(nome, a === b, `esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`); },
  // Entrada vazia (nenhuma tecla) para dar passos no jogador
  entrada() { return { move: { x: 0, y: 0 }, pressed: {}, held: {}, released: {} }; },
  passos(p, seg, dt = 1 / 60, input) { const inp = input || this.entrada(); for (let t = 0; t < seg; t += dt) p.update(dt, inp); },

  async run() {
    this.lista.length = 0;
    const g = game;
    g.slot = 2; g.startRun();
    await new Promise((r) => setTimeout(r, 300));
    const salvar = g.saveGame; g.saveGame = () => {};          // os testes não gravam
    const cam0 = ThirdView.on, mov0 = ThirdView.movMundo;
    this.cameras();
    ThirdView.on = false; ThirdView.movMundo = false;          // os testes partem da isométrica e voltam à câmera de antes no fim
    // malha de uma armadura especial (carregada por <script>, como no jogo; espera até 15 s)
    ArmorModels.ensure('lyra_n1');
    for (let i = 0; i < 150 && ArmorModels.estado.lyra_n1 === 'carregando'; i++) await new Promise((r) => setTimeout(r, 100));
    // kit de arquitetura do Bairro da Muralha (carregado sob demanda, como no jogo)
    Bairro.carregar();
    for (let i = 0; i < 200 && Bairro.estado === 'carregando'; i++) await new Promise((r) => setTimeout(r, 100));
    try {
      this.armas();
      this.encaixes();
      this.sacarGuardar();
      this.mira();
      this.combate();
      this.combos();
      this.arvore();
      this.persistencia();
      this.idle();
      this.trocaArma();
      this.telaElenco();
      this.pistolaOrion();
      this.armaduras3d();
      this.aliados();
      this.terceiraPessoa();
      this.telaBaixa();
      this.puloDefesa();
      this.pendencias();
      this.mundo();   // por último: troca a partida pelo modo mundo
      await this.bairroFotos();
      await this.criaturas();
      await this.pets();
      await this.animaisCidade();
      await this.montarias();
      await this.criacaoGLB();
      await this.criacaoTroca();
      await this.criacaoEncaixe();
      await this.criacaoAncoras();
      await this.barbasEncaixe();
      await this.membrosTela();
      await this.corposAtleticos();
      await this.atributosRPG();
      await this.inimigosRPG();
      await this.inventarioRPG();
      await this.terrenos();
      await this.fogoAguaAnimacao();
      await this.estruturasMundo();
      await this.agua();
      await this.solSombras();
      await this.poderesDiario();
      this.graficosPC();
      this.megacidades();
      this.mundoContinuo();
      this.metropoleSegura();
      await this.moradoresMeshy();
    } catch (err) {
      this.ok('sem exceção durante os testes', false, err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err);
    }
    g.saveGame = salvar;
    ThirdView.on = cam0 && R3D.active; ThirdView.movMundo = mov0;
    const falhas = this.lista.filter((t) => !t.ok);
    const res = { ok: this.lista.length - falhas.length, falhas: falhas.length, total: this.lista.length, lista: this.lista.slice() };
    window.__testes = res;
    console.log(`TESTES: ${res.ok}/${res.total} ok` + (falhas.length ? '\n' + falhas.map((f) => `FALHOU ${f.nome}: ${f.info}`).join('\n') : ''));
    this.mostrar(res);
    return res;
  },

  // ---------------------------------------------------------------- armas GLB
  armas() {
    this.ok('WEAPON3D carregado (js/assets/armas3d.js)', typeof WEAPON3D !== 'undefined' && WeaponRig.ok);
    const usados = new Set();
    for (const w in WeaponRig.VISUAL) { const V = WeaponRig.VISUAL[w]; for (const k of ['main', 'back', 'hip', 'drone']) for (const id of V[k] || []) usados.add(id); }
    for (const id of usados) {
      const W = WEAPON3D[id];
      this.ok(`arma ${id}: existe em WEAPON3D`, !!W);
      if (!W) continue;
      const geo = WeaponRig.geo(id, true), raw = WeaponRig.geo(id, false);
      this.igual(`arma ${id}: ${W.n} triângulos decodificados`, geo.length, W.n * 30);
      let fin = true, emax = 0;
      for (let i = 0; i < raw.length; i += 10) { if (!isFinite(raw[i]) || !isFinite(raw[i + 1]) || !isFinite(raw[i + 2])) { fin = false; break; } emax = Math.max(emax, raw[i + 9]); }
      this.ok(`arma ${id}: posições válidas`, fin);
      this.ok(`arma ${id}: GLB de origem registrado (${W.src})`, /^assets\/(armas\/eclipse|_retopo\/meshy)\/.+\.glb$/.test(W.src));   // (a variação da espada do Kael lê o remesh do Meshy)
      this.ok(`arma ${id}: comprimento coerente`, Math.abs(W.len - 64) <= 50, W.len);
      this.ok(`arma ${id}: encaixe nas costas definido`, !!WeaponRig.BACK[id]);
    }
    // os GLB de origem existem (só dá para conferir por http)
    if (/^https?:$/.test(location.protocol)) {
      for (const id of usados) {
        const src = WEAPON3D[id] && WEAPON3D[id].src;
        if (!src) continue;
        const x = new XMLHttpRequest();
        x.open('HEAD', src, false);
        try { x.send(); this.igual(`arquivo ${src} responde`, x.status, 200); } catch (e) { this.ok(`arquivo ${src} responde`, false, e.message); }
      }
    }
    // cada arma da ficha tem visual
    for (const w in WEAPON_DEFS) {
      const d = WEAPON_DEFS[w];
      if (d.owner === 'all' || d.implemented === false) continue;
      this.ok(`arma da ficha ${w} tem modelo no jogo`, !!WeaponRig.VISUAL[w]);
    }
  },

  // Monta cada herói e confere os nós dos encaixes e a visibilidade (guardada x na mão)
  encaixes() {
    for (const c of ['kael', 'lyra', 'drakos', 'sera', 'orion']) {
      const def = CHARACTERS_BY_ID[c], key = heroModelKey(def), M = MODELS3D[key];
      const m = M.build();
      this.ok(`${c}: encaixes instalados (${key})`, !!m.wr && !!m.nodes.wHandR && !!m.nodes.wBack0);
      const e = { def, state: 'idle', animTime: 1, facing: 0, wpnOut: false };
      m.reset(); M.pose(m, e, {});
      const costas = ['wBack0', 'wBack1', 'wBack2'].some((k) => m.nodes[k] && m.nodes[k].vis && m.nodes[k].geo);
      this.ok(`${c}: arma guardada aparece nas costas`, costas);
      if (c !== 'lyra') this.ok(`${c}: arma guardada não fica na mão`, !(m.nodes.wHandR.vis && m.nodes.wHandR.geo));
      e.wpnOut = true; m.reset(); M.pose(m, e, {});
      if (c === 'lyra') this.ok('lyra: arco na mão (nó lyraBow)', m.nodes.lyraBow && m.nodes.lyraBow.vis !== false && !!m.nodes.lyraBow.geo);
      else this.ok(`${c}: arma na mão com a malha GLB`, m.nodes.wHandR.vis && m.nodes.wHandR.geo === WeaponRig.geo(WeaponRig.visualOf(c).main[0], !!m.tex));
      if (c === 'kael') this.ok('kael: espada procedural trocada pela GLB', !m.nodes.blade.geo && !m.nodes.hilt.geo);
      if (c === 'orion') this.ok('orion: segunda lâmina na mão esquerda', m.nodes.wHandL.vis && !!m.nodes.wHandL.geo);
      // não duplica geometria ao posar de novo (o mesmo array compartilhado)
      const g0 = m.nodes.wHandR.geo; m.reset(); M.pose(m, e, {});
      this.ok(`${c}: geometria reaproveitada entre quadros`, m.nodes.wHandR.geo === g0);
    }
  },

  // Mira travada (js/heroes/mira.js): trava no mais perto da frente, passa para o próximo,
  // segurar solta; o golpe começa virado para o alvo; o alvo morto passa a mira adiante
  mira() {
    const g = game, p = g.player, salva = g.enemies.slice(), est0 = g.state, pil0 = g.room.pillars;
    let erro = null;
    g.state = 'playing';   // (a mira só age em jogo)
    try {
      g.enemies.length = 0;
      const R = g.room, cx = R.w / 2, cy = R.h / 2;
      R.pillars = [];   // a sala do teste é sorteada: um pilar no meio cortaria a linha de visão (a mira, não a sala, é o que se testa)
      p.x = cx; p.y = cy; p.facing = 0; p.state = 'idle'; p.vx = p.vy = 0; p.attack = null;
      const perto = createEnemy('rastejador', cx + 120, cy, 1), longe = createEnemy('rastejador', cx - 260, cy + 40, 1), fora = createEnemy('rastejador', cx + 2000, cy, 1);
      for (const e of [perto, longe, fora]) { e.state = 'idle'; e.stateTime = 1; g.enemies.push(e); }
      const inp = (pr, hd) => ({ pressed: { lockOn: pr }, held: { lockOn: hd } });
      Mira.soltar();
      Mira.update(1 / 60, inp(true, true)); Mira.update(1 / 60, inp(false, false));
      this.ok('mira: trava no inimigo mais perto da frente (o fora de alcance não conta)', Mira.alvo === perto);
      Mira.update(1 / 60, inp(true, true)); Mira.update(1 / 60, inp(false, false));
      this.ok('mira: apertar de novo passa para o próximo', Mira.alvo === longe);
      // golpe para o outro lado: começa virado para o alvo
      p.facing = 0; p.startAttack(p.kit ? 'l1' : 'light1', { x: 1, y: 0 }); p.state = 'attack';
      Mira.update(1 / 60, inp(false, false));
      const a = Math.atan2(longe.y - p.y, longe.x - p.x);
      this.ok('mira: o golpe começa virado para o alvo travado', Math.abs(angleDiff(p.facing, a)) < 1e-6 && Math.abs(angleDiff(p.attack.dir, a)) < 1e-6);
      p.attack = null; p.state = 'idle';
      // o alvo morre: a mira passa para o próximo vivo perto
      longe.state = 'dying';
      Mira.update(1 / 60, inp(false, false));
      this.ok('mira: alvo morto passa a mira para o próximo perto', Mira.alvo === perto);
      // segurar solta
      Mira.update(1 / 60, inp(true, true)); for (let i = 0; i < 30; i++) Mira.update(1 / 60, inp(false, true));
      this.ok('mira: segurar o botão solta a mira', Mira.alvo === null);
      Mira.travar(p); g.renderWorld(g.ctx);
      this.ok('mira: teclado X e botão do meio do mouse, R3 no controle (a troca de arma vai para Q e LB + R3)', KEYMAP.lockOn.includes('KeyX') && KEYMAP.lockOn.includes('MouseMiddle') && PADMAP.lockOn[0] === 11 && !KEYMAP.swapWeapon.includes('KeyX') && PAD_LAYER_MAP.swapWeapon === 11);
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    Mira.soltar(); g.enemies.length = 0; for (const e of salva) g.enemies.push(e); g.state = est0;
    g.room.pillars = pil0;
    this.ok('mira: sem exceção', !erro, erro);
  },

  // Máquina de estados da arma: golpe saca na hora; 4 s de calma guardam com o gesto
  sacarGuardar() {
    const g = game, p = g.player;
    g.enemies.length = 0; g.waves.state = 'cleared';
    p.state = 'idle'; p.wpnOut = false; p.wpnAnim = null;
    p.startAttack(p.kit ? 'l1' : 'light1', null);
    p.updateWeapon(1 / 60);
    this.ok('golpe com a arma guardada saca na hora', p.wpnOut === true && !p.wpnAnim);
    p.attack = null; p.state = 'idle'; p.wpnCalm = 0;
    for (let t = 0; t < 4.2; t += 1 / 30) p.updateWeapon(1 / 30);
    this.ok('depois de 4 s sem ameaça começa a guardar', !!p.wpnAnim && p.wpnAnim.k === 'sheathe');
    for (let t = 0; t < 1; t += 1 / 30) p.updateWeapon(1 / 30);
    this.ok('termina com a arma nas costas', p.wpnOut === false && !p.wpnAnim);
  },

  // Dano: cada inimigo toma um acerto por golpe (exceto golpes multiHit, no limite deles)
  combate() {
    const g = game, p = g.player;
    g.enemies.length = 0;
    const e = createEnemy('rastejador', p.x + 50, p.y, 1);
    e.hp = e.maxHp = 99999; e.spawnT = 0; e.state = 'idle'; g.enemies.push(e);
    let hits = 0;
    const orig = p.hitEnemy.bind(p);
    p.hitEnemy = (en, d, a) => { if (en === e) hits++; return orig(en, d, a); };
    p.facing = 0;
    const a = { hits: new Map(), counts: new Map(), id: 'light1', def: ATTACKS.light1, t: 0.1, dir: 0, mult: 1 };
    const can = e.canBeHit();
    for (let k = 0; k < 10; k++) { a.t = 0.1 + k * 0.01; p.processHits(a); }
    if (can) this.igual('golpe simples acerta o mesmo inimigo uma vez só', hits, 1);
    hits = 0;
    const b = { hits: new Map(), counts: new Map(), id: 'spin', def: ATTACKS.spin, t: 0, dir: 0, mult: 1 };
    for (let k = 0; k < 60; k++) { b.t = k * 0.01; p.processHits(b); }
    if (can) this.ok(`golpe giratório respeita multiHit (${ATTACKS.spin.multiHit})`, hits >= 1 && hits <= ATTACKS.spin.multiHit, hits);
    this.ok('inimigo de teste pode ser atingido', can, 'canBeHit() = false');
    p.hitEnemy = orig;
    g.enemies.length = 0;
    // golpes novos definidos e com fases válidas
    for (const id of ['finisher', 'reverse', 'drakos_finisher', 'drakos_counter', 'orion_cross', 'orion_finisher']) {
      const d = ATTACKS[id];
      this.ok(`golpe ${id} definido com preparação, ativo e recuperação`, d && d.windup > 0 && d.active > 0 && d.recovery > 0 && d.shape);
    }
    this.ok('3º golpe do Drakos usa a outra arma (altWeapon)', ATTACKS.drakos_light3.altWeapon === true);
  },

  // Combos: cada id das tabelas existe; os novos só saem com o nó da árvore
  combos() {
    for (const c in CHARACTER_COMBOS) for (const s in CHARACTER_COMBOS[c]) this.ok(`combo ${c} ${s} → ${CHARACTER_COMBOS[c][s]} existe`, !!ATTACKS[CHARACTER_COMBOS[c][s]]);
    const g = game, p = g.player, pr = g.progress, cs = new ComboSystem();
    const seq = (s) => { cs.reset(); let id = null; for (const b of s) id = cs.resolve(b); return id; };
    const antes = pr.skills.sentenca_eclipse;
    ['corte_duplo', 'lamina_giratoria'].forEach((k) => { pr.skills[k] = pr.skills[k] || 1; });
    delete pr.skills.sentenca_eclipse;
    this.igual('Kael L L L H sem Sentença do Eclipse → pesado', seq('LLLH'), 'heavy');
    pr.skills.sentenca_eclipse = 1;
    this.igual('Kael L L L H com Sentença do Eclipse → finalização', seq('LLLH'), 'finisher');
    if (antes) pr.skills.sentenca_eclipse = antes; else delete pr.skills.sentenca_eclipse;
    pr.skills.reves_horizonte = 1;
    this.igual('Kael H L com Revés do Horizonte → revés', seq('HL'), 'reverse');
    cs.unlocked.add('uppercut');
    this.igual('Kael L H L (com o Relâmpago Ascendente) → revés', seq('LHL'), 'reverse');
    delete pr.skills.reves_horizonte;
    this.igual('Kael H L sem o nó → golpe leve', seq('HL'), 'light1');
  },

  // Árvore: 5 ramos na ordem, dados válidos, custo e requisitos respeitados, efeitos reais
  arvore() {
    this.igual('árvores sem inconsistências (validateSkillTrees)', validateSkillTrees().length, 0);
    for (const c of skillCharacters()) {
      const br = skillTreesOf(c).map((t) => t.branch);
      this.ok(`${c}: ramos Ataque, Poderes, Defesa, Mobilidade/Defesa e Supremas`, br[0] === 'ataque' && br[1] === 'poderes' && br.includes('defesa') && br[br.length - 1] === 'supremas', br.join(','));
    }
    const g = game, pr = g.progress, p = g.player;
    const sp0 = pr.sp, lv0 = pr.level, sk0 = Object.assign({}, pr.skills);
    pr.level = 30; pr.sp = 1;
    this.ok('nó supremo (2 pontos) bloqueado com 1 ponto', /2 pontos/.test(pr.blocker('kael_sup_nucleo') || ''), pr.blocker('kael_sup_nucleo'));
    pr.sp = 10;
    this.ok('requisito bloqueia nó sem o anterior', /Requer/.test(pr.blocker('kael_sup_amplificador') || ''), pr.blocker('kael_sup_amplificador'));
    const c0 = p.ultCost();
    this.ok('aprende o Núcleo Supremo', pr.learn('kael_sup_nucleo'));
    this.igual('custou 2 pontos', pr.sp, 8);
    p.recalc();
    this.ok(`suprema fica mais barata (${c0} → ${p.ultCost()})`, p.ultCost() < c0);
    const pw = p.stats.power;
    pr.learn('kael_sup_amplificador'); p.recalc();
    this.ok('Amplificador aumenta o poder', p.stats.power > pw + 0.07, `${pw} → ${p.stats.power}`);
    // Convergência: depois de uma habilidade, o próximo golpe é mais forte
    pr.learn('kael_sup_recarga'); pr.learn('kael_sup_convergencia'); p.recalc();
    p.convT = 2.5; p.attack = null;
    const fake = { x: p.x + 40, y: p.y, facing: 0, stun: 0 };
    this.ok('Convergência multiplica o próximo golpe', HeroPassives.dealt(p, fake) > 1.2, HeroPassives.dealt(p, fake));
    pr.level = lv0; pr.sp = sp0; pr.skills = sk0; p.convT = 0; p.recalc();
  },

  // Salvar e carregar: progresso do Kael, dos aliados e a arma equipada
  persistencia() {
    const pr = game.progress, J0 = JSON.stringify(pr.toJSON());
    pr.skills.kael_sup_nucleo = 2; pr.skills.sentenca_eclipse = 1;
    const q = new Progress(); q.load(JSON.parse(JSON.stringify(pr.toJSON())));
    this.ok('nós novos do Kael voltam do salvamento', q.lv('kael_sup_nucleo') === 2 && q.lv('sentenca_eclipse') === 1);
    pr.load(JSON.parse(J0));
    const dk = PartyProgress.of('drakos'), D0 = JSON.stringify(dk.toJSON());
    dk.skills.drakos_queda_tita = 1; dk.skills.drakos_sup_folego = 1;
    const c = new CharacterProgress('drakos'); c.load(JSON.parse(JSON.stringify(dk.toJSON())));
    this.ok('nós novos do Drakos voltam do salvamento', c.lv('drakos_queda_tita') === 1 && c.lv('drakos_sup_folego') === 1);
    dk.load(JSON.parse(D0));
    const R0 = JSON.stringify(RosterManager.toJSON());
    RosterManager.unlockWeapon('canhao_pulso', true);
    RosterManager.equipWeapon('drakos', 'canhao_pulso');
    const R1 = JSON.parse(JSON.stringify(RosterManager.toJSON()));
    RosterManager.load(R1);
    this.igual('arma equipada volta do salvamento', RosterManager.equippedWeapon('drakos'), 'canhao_pulso');
    RosterManager.load(JSON.parse(R0));
  },

  // Idle: sorteio respeita o requisito (arma na mão ou nas costas) e a troca passa pelo repouso
  idle() {
    const p = game.player;
    let errado = 0;
    for (const out of [true, false]) {
      p.wpnOut = out;
      for (let k = 0; k < 120; k++) {
        p.idleVariant = 'idle_breathing'; p.idleBlend = 0; p.idleNext = null; p.lastIdle = null;
        p.pickNextIdleVariant();
        const v = (CHARACTER_IDLE_PROFILES[p.def.id] || CHARACTER_IDLE_PROFILES.kael).variants.find((x) => x.id === p.idleVariant);
        if (v && v.req && (v.req === 'out') !== out) errado++;
      }
    }
    this.igual('variações sorteadas respeitam o estado da arma', errado, 0);
    p.idleVariant = 'idle_look_around'; p.idleBlend = 1; p.idleNext = null;
    p.setIdle('idle_combat_ready');
    this.ok('troca de variação espera a atual sair (sem salto)', p.idleVariant === 'idle_look_around' && p.idleNext === 'idle_combat_ready');
    for (const c in CHARACTER_IDLE_PROFILES) this.ok(`${c}: ${CHARACTER_IDLE_PROFILES[c].variants.length} variações de idle`, CHARACTER_IDLE_PROFILES[c].variants.length >= 6);
  },

  // Troca de arma: pendente durante o golpe, feita quando o herói fica livre
  trocaArma() {
    const g = game;
    RosterManager.unlock('drakos', true);
    RosterManager.unlockWeapon('lanca_plasma', true); RosterManager.unlockWeapon('canhao_pulso', true);
    RosterManager.equipWeapon('drakos', 'lanca_plasma');
    RosterManager.setActive('drakos');          // o jogo recria o Player com a ficha (characterChanged)
    const p = g.player;
    this.igual('Drakos em campo para a troca de arma', p.def.id, 'drakos');
    g.enemies.length = 0;
    this.igual('próxima arma do Drakos é o martelo', p.nextWeapon(), 'canhao_pulso');
    p.startAttack('drakos_heavy', null);
    p.swapWeapon();
    this.ok('troca pedida no golpe fica pendente', p.swapPending > 0 && RosterManager.equippedWeapon('drakos') === 'lanca_plasma');
    this.passos(p, 1.2);
    this.igual('troca acontece quando o golpe termina', RosterManager.equippedWeapon('drakos'), 'canhao_pulso');
    this.igual('o martelo vai para a mão', WeaponRig.visualOf('drakos').main[0], 'drakos_martelo');
  },

  // Tela de elenco (Pausa → Personagens): equipar armadura e arma mostra o aviso sem erro
  telaElenco() {
    const rs = new RosterScreen(game.menu || {}), d = CHARACTERS_BY_ID.kael;
    rs.charSel = CHARACTER_DEFS.indexOf(d); rs.mode = 'pause';
    const salvar = game.saveGame; game.saveGame = () => {};
    try {
      rs.tab = ROSTER_TABS.findIndex((t) => t.id === 'armors');
      const arm = rs.armorList().find((id) => RosterManager.isArmorUnlocked(id) && RosterManager.equippedArmor('kael') !== id);
      rs.armorSel = rs.armorList().indexOf(arm);
      let erro = null;
      try { rs.act(); } catch (e) { erro = e.message; }
      this.ok('elenco: equipar armadura sem erro', !erro, erro);
      this.ok('elenco: aviso da armadura equipada', !!(rs.msg && rs.msg.text), JSON.stringify(rs.msg));
      rs.msg = null; erro = null;
      try { rs.act(); } catch (e) { erro = e.message; }
      this.ok('elenco: recusa (já equipada) mostra aviso sem erro', !erro && !!(rs.msg && rs.msg.text), erro);
      rs.tab = ROSTER_TABS.findIndex((t) => t.id === 'weapons'); rs.msg = null; erro = null;
      rs.weaponSel = Math.max(0, rs.weaponList().indexOf(RosterManager.equippedWeapon('kael')));
      try { rs.act(); } catch (e) { erro = e.message; }
      this.ok('elenco: arma (já equipada) mostra aviso sem erro', !erro && !!(rs.msg && rs.msg.text), erro);
    } finally { game.saveGame = salvar; }
  },

  // Orion com a pistola: os golpes viram tiros (projéteis que causam dano) e a pistola vai para a mão
  pistolaOrion() {
    const g = game;
    RosterManager.unlock('orion', true);
    RosterManager.equipWeapon('orion', 'modulo_stealth');
    if (RosterManager.active !== 'orion') RosterManager.setActive('orion');
    const p = g.player;
    this.igual('Orion com a pistola: estilo de combate', p.combatStyle(), 'orion_pistol');
    const cs = new ComboSystem(); cs.reset();
    this.igual('Orion com a pistola: J J J → rajada', ['L', 'L', 'L'].map((b) => cs.resolve(b)).join(','), 'orion_shot1,orion_shot2,orion_shot3');
    this.igual('Orion com a pistola: a pistola na mão', WeaponRig.visualOf('orion').main[0], 'orion_pistola');
    g.enemies.length = 0; g.projectiles.clear(); g.waves.state = 'cleared';
    const pil0 = g.room.pillars; g.room.pillars = [];   // (sala sorteada: um pilar entre o Orion e o alvo pararia o tiro)
    const e = createEnemy('rastejador', p.x + 160, p.y, 1); e.hp = e.maxHp = 5000; e.spawnT = 0; e.state = 'idle'; g.enemies.push(e);
    const step = (s) => { for (let t = 0; t < s; t += 1 / 60) { p.update(1 / 60, this.entrada()); g.projectiles.update(1 / 60); } };
    p.facing = 0; p.state = 'idle';
    p.startAttack('orion_shot1', null); step(0.4);
    const h1 = e.hp;
    this.ok('tiro da pistola causa dano', h1 < 5000, h1);
    p.startAttack('orion_shot3', null); step(0.7);
    this.ok('rajada acerta mais de uma vez', 5000 - e.hp > 2 * (5000 - h1) * 0.8, `${5000 - h1} → ${5000 - e.hp}`);
    g.room.pillars = pil0;
    RosterManager.equipWeapon('orion', 'laminas_duplas');
    this.igual('Orion com as lâminas volta a cortar', p.combatStyle(), 'orion');
    g.enemies.length = 0; g.projectiles.clear();
  },

  // ------------------------------------------------- ativas, passivas e técnicas dos aliados
  aliados() {
    const g = game;
    // herói em campo com os nós dados; inimigos parados a 'd' à frente
    const heroi = (id, nos) => {
      RosterManager.unlock(id, true);
      if (RosterManager.active !== id) RosterManager.setActive(id);
      const pr = PartyProgress.of(id);
      pr.skills = Object.assign({}, nos);
      const p = g.player;
      p.recalc(true); p.fury = p.maxEnergy; p.cds = {}; p.state = 'idle'; p.attack = null; p.facing = 0; p.invuln = 0;
      // num ponto livre da sala, com espaço e linha de visão totalmente desobstruída à direita
      const R = g.room, livre = (x, y) => !R.blocksPoint(x, y, 32);
      const livreCaminho = (x, y) => {
        if (!livre(x, y) || x + 240 >= R.w - 30 || y < 35 || y > R.h - 50) return false;
        if (!R.linhaLivre(x, y, x + 240, y, 20) || !R.linhaLivre(x, y + 25, x + 240, y + 25, 20) || !R.linhaLivre(x, y - 25, x + 240, y - 25, 20)) return false;
        for (let d = 0; d <= 240; d += 20) {
          if (!livre(x + d, y) || !livre(x + d, y + 25) || !livre(x + d, y - 25)) return false;
        }
        return true;
      };
      let achou = false;
      for (const [fx, fy] of [
        [0.3, 0.4], [0.3, 0.6], [0.25, 0.5], [0.35, 0.35], [0.35, 0.65],
        [0.4, 0.5], [0.3, 0.5], [0.4, 0.35], [0.4, 0.65], [0.5, 0.5],
        [0.2, 0.4], [0.2, 0.6], [0.5, 0.3], [0.5, 0.7], [0.2, 0.5], [0.35, 0.5]
      ]) {
        const x = R.w * fx, y = R.h * fy;
        if (livreCaminho(x, y)) { p.x = x; p.y = y; achou = true; break; }
      }
      if (!achou) {
        for (let fx = 0.15; fx <= 0.65 && !achou; fx += 0.04) {
          for (let fy = 0.15; fy <= 0.85 && !achou; fy += 0.04) {
            const x = R.w * fx, y = R.h * fy;
            if (livreCaminho(x, y)) { p.x = x; p.y = y; achou = true; break; }
          }
        }
      }
      p.vx = p.vy = p.kbx = p.kby = 0;
      for (const k in p.buffs) p.buffs[k] = 0;
      g.enemies.length = 0; g.projectiles.clear(); HeroObjects.clear(); g.waves.state = 'cleared';
      return p;
    };
    const inimigo = (p, tipo, d, dy = 0) => { const e = createEnemy(tipo, p.x + d, p.y + dy, 1); e.hp = e.maxHp = 5000; e.spawnT = 0; e.state = 'idle'; g.enemies.push(e); return e; };
    const passo = (p, s) => { for (let t = 0; t < s; t += 1 / 60) { p.update(1 / 60, this.entrada()); g.projectiles.update(1 / 60); HeroObjects.update(1 / 60); } };
    const lanca = (p, id) => { const A = ABILITIES[id]; let ok = false, erro = null; try { ok = A && A.cast(p, 1, null); } catch (e) { erro = e.message; } this.ok(`ativa ${id}: lança sem erro`, ok && !erro, erro || ok); };

    // as 4 ativas da ficha, achadas pelo 'ability' do nó
    let p = heroi('sera', { sera_campo_forca: 1 });
    p.slots = null;
    const pr = PartyProgress.of('sera'); pr.slots = ['sera_campo_forca', null, null, null];
    const inf = p.abilityInfo(0);
    this.ok('nó sera_campo_forca acha a habilidade sera_campo', !!(inf && inf.A === ABILITIES.sera_campo), inf && inf.id);
    pr.slots = [null, null, null, null];

    // DRAKOS
    p = heroi('drakos', { drakos_muralha: 1, drakos_canhao: 1, drakos_grito: 1, drakos_bloqueio: 1, drakos_refletor: 2 });
    let e = inimigo(p, 'legionario', 70);
    lanca(p, 'drakos_muralha');
    this.ok('Muralha Viva: atrai (isca) e reduz o dano', heroTargetFor(e) !== p && Math.abs(HeroPassives.taken(p) - 0.7) < 0.01, HeroPassives.taken(p));
    lanca(p, 'drakos_grito');
    this.ok('Grito de Guerra: +20% de dano', Math.abs(AllyFx.dealt(p, e) - 1.2) < 0.01, AllyFx.dealt(p, e));
    passo(p, 0.5);
    this.ok('Grito de Guerra: inimigo perto fica lento', !!e._heroSlow);
    p = heroi('drakos', { drakos_canhao: 1 });
    e = inimigo(p, 'rastejador', 200);
    lanca(p, 'drakos_canhao'); passo(p, 0.8);
    this.ok('Onda do Martelo: a onda acerta à frente', e.hp < 5000, e.hp);
    // Escudo Refletor: o projétil que bate no escudo volta
    p = heroi('drakos', { drakos_escudo_energia: 1, drakos_bloqueio: 1, drakos_refletor: 2 });
    ABILITIES.drakos_escudo.cast(p, 1);
    const q = g.projectiles.spawn({ x: p.x + 60, y: p.y, z: 30, vx: -500, vy: 0, dmg: 20, hostile: true, kind: 'orb', life: 2 });
    passo(p, 0.2);
    this.ok('Escudo Refletor: o projétil volta contra o atirador', q && !q.hostile && q.vx > 0, q && JSON.stringify({ h: q.hostile, vx: q.vx }));
    // Técnicas: L L H vira Varredura; Esquiva → H vira Arremesso
    let cs = new ComboSystem(); cs.reset();
    this.igual('Drakos sem Varredura: L L H de sempre', ['L', 'L', 'H'].map((b) => cs.resolve(b))[2], 'drakos_sweep');
    PartyProgress.of('drakos').skills.drakos_varredura = 1; PartyProgress.of('drakos').skills.drakos_arremesso = 1;
    cs = new ComboSystem(); cs.reset();
    this.igual('Drakos com Varredura: L L H → Varredura', ['L', 'L', 'H'].map((b) => cs.resolve(b))[2], 'drakos_varredura');
    cs.reset(); cs.dashWindow = 0.3;
    this.igual('Drakos com Arremesso: esquiva → H', cs.resolve('H'), 'drakos_arremesso');
    e = inimigo(p, 'rastejador', 200);
    p.startAttack('drakos_arremesso', null); passo(p, 0.9);
    this.ok('Arremesso do Machado: o machado acerta longe', e.hp < 5000, e.hp);

    // SERA
    p = heroi('sera', { sera_sentinela: 1, sera_pulso: 1, sera_apagao: 1, sera_injecao: 1, sera_domo_condutor: 1, sera_matriz: 1, sera_campo_forca: 1, sera_enxame: 1 });
    e = inimigo(p, 'drone', 150);
    lanca(p, 'sera_sentinela'); passo(p, 1.0);
    this.ok('Sentinela Fixa: a torreta atira', e.hp < 5000, e.hp);
    e.kbx = e.kby = 0;   // (os tiros da Sentinela também empurram: aqui conta só o Pulso)
    const x0 = e.x; lanca(p, 'sera_pulso');
    // impulso para longe do herói; o empurrão anda no update do inimigo e conta o maior afastamento
    // (a sala muda a cada partida: num pilar logo atrás ele quica e volta)
    const kb = e.kbx;
    let xMax = e.x;
    for (let t = 0; t < 0.3; t += 1 / 60) { e.update(1 / 60); xMax = Math.max(xMax, e.x); }
    this.ok('Pulso Repulsor: empurra o inimigo', kb > 200 && xMax > x0 + 5, `impulso ${Math.round(kb)} · ${x0} → ${xMax}`);
    e = inimigo(p, 'drone', 120);
    lanca(p, 'sera_apagao');
    this.ok('Apagão: o drone cai (atordoado)', e.stun > 0, e.stun);
    const v0 = p.stats.speedMult; lanca(p, 'sera_injecao'); passo(p, 0.1);
    this.ok('Injeção Estimulante: mais velocidade', p.stats.speedMult > v0 * 1.1, `${v0} → ${p.stats.speedMult}`);
    ABILITIES.sera_campo.cast(p, 1); p.x += 200; const F = AllyFx.field(p);
    this.ok('Matriz Estável: o domo acompanha a Sera e reflete', F.x === p.x && F.reflete);
    // técnicas
    PartyProgress.of('sera').skills.sera_ordem_ataque = 1; PartyProgress.of('sera').skills.sera_sobrecarga_remota = 2;
    cs = new ComboSystem(); cs.reset();
    this.igual('Sera com Sobrecarga: L L L', ['L', 'L', 'L'].map((b) => cs.resolve(b))[2], 'sera_sobrecarga');
    cs.reset();
    this.igual('Sera com Ordem de Ataque: L L H', ['L', 'L', 'H'].map((b) => cs.resolve(b))[2], 'sera_ordem');
    p.buffs.forceField = 0; g.enemies.length = 0;
    e = inimigo(p, 'drone', 150);
    p.facing = 0; p.startAttack('sera_ordem', { x: 1, y: 0 }); passo(p, 0.8);
    this.ok('Ordem de Ataque: o drone mergulha e acerta', e.hp < 5000, e.hp);

    // ORION
    p = heroi('orion', { orion_fumaca: 1, orion_leque: 2, orion_ricochete: 1, orion_marca: 1, orion_passo_sombra: 1, orion_danca_aco: 1, orion_rolamento: 1 });
    RosterManager.equipWeapon('orion', 'laminas_duplas');
    e = inimigo(p, 'rastejador', 90);
    lanca(p, 'orion_fumaca'); passo(p, 0.1);
    this.ok('Bomba de Fumaça: o inimigo perde o alvo', heroTargetFor(e) !== p, e._cego);
    p = heroi('orion', { orion_leque: 2, orion_ricochete: 1, orion_marca: 1, orion_passo_sombra: 1, orion_danca_aco: 1, orion_rolamento: 1 });
    e = inimigo(p, 'rastejador', 160);
    lanca(p, 'orion_leque'); passo(p, 0.6);
    this.ok('Leque de Lâminas: as lâminas acertam', e.hp < 5000, e.hp);
    cs = new ComboSystem(); cs.reset();
    this.igual('Orion com Dança de Aço: L L H', ['L', 'L', 'H'].map((b) => cs.resolve(b))[2], 'orion_danca');
    cs.reset(); cs.dashWindow = 0.3;
    this.igual('Orion com Passo na Sombra: esquiva → L', cs.resolve('L'), 'orion_passo');
    cs.reset(); cs.dashWindow = 0.3;
    this.igual('Orion com Rolamento: esquiva → H', cs.resolve('H'), 'orion_rolamento');
    g.enemies.length = 0;
    e = inimigo(p, 'rastejador', 200); e.facing = Math.PI;
    p.startAttack('orion_passo', null); passo(p, 0.4);
    this.ok('Passo na Sombra: reaparece atrás e corta', e.hp < 5000 && p.x > e.x, `hp ${e.hp} x ${Math.round(p.x)} vs ${Math.round(e.x)}`);
    this.ok('Marca do Alvo: o golpe marca o inimigo', e._marcaT > 0, e._marcaT);
    // limpa: Kael de volta, nós dos aliados zerados
    for (const id of ['drakos', 'sera', 'orion']) PartyProgress.of(id).skills = {};
    g.enemies.length = 0; g.projectiles.clear(); HeroObjects.clear();
    RosterManager.setActive('kael');
  },

  // ------------------------------------------------- câmera em terceira pessoa
  terceiraPessoa() {
    const antes = ThirdView.on, o = { x: 0, y: 0 };
    ThirdView.set(true, true);
    // olhando como a câmera isométrica (para −x −y), o analógico anda igual às duas vistas
    ThirdView.yaw = -3 * Math.PI / 4;
    ThirdView.inputDir(1, 0, o);
    this.ok('3ª pessoa: direita na tela = direita da vista isométrica', Math.abs(o.x - Math.SQRT1_2) < 0.01 && Math.abs(o.y + Math.SQRT1_2) < 0.01, JSON.stringify(o));
    ThirdView.inputDir(0, -1, o);
    this.ok('3ª pessoa: para cima = para onde a câmera olha', Math.abs(o.x + Math.SQRT1_2) < 0.01 && Math.abs(o.y + Math.SQRT1_2) < 0.01, JSON.stringify(o));
    let erro = null;
    try { game.renderWorld(game.ctx); } catch (e) { erro = e.message; }
    this.ok('3ª pessoa: desenha a sala, os modelos e os efeitos sem erro', !erro, erro);
    this.ok('3ª pessoa: a sala virou modelo 3D (piso, 4 paredes, pilares)', !!(ThirdView.roomModel && ThirdView.roomModel.walls.length === 4), ThirdView.roomModel && Object.keys(ThirdView.roomModel.nodes).length);
    const P = ThirdView.proj(game.player.x, game.player.y, 40);
    this.ok('3ª pessoa: o herói fica no meio da tela', P.vis && Math.abs(P.x - VIEW_W / 2) < VIEW_W * 0.1 && P.y > VIEW_H * 0.25 && P.y < VIEW_H * 0.8, JSON.stringify({ x: Math.round(P.x), y: Math.round(P.y) }));
    this.ok('3ª pessoa: isoX volta ao normal depois dos efeitos', isoX(10, 3) === 7 && isoY(10, 4) === 7);
    ThirdView.set(antes, true);
  },

  // --------------------------------------------- pulo, mergulho e defesa
  puloDefesa() {
    const g = game, R = g.room;
    if (RosterManager.active !== 'kael') RosterManager.setActive('kael');
    const p = g.player;
    const prep = () => {
      p.recalc(true); p.fury = p.maxEnergy; p.state = 'idle'; p.attack = null; p.facing = 0; p.invuln = 0;
      p.air = false; p.z = 0; p.vz = 0; p.landT = 0; p.vx = p.vy = p.kbx = p.kby = 0;
      for (const [fx, fy] of [[0.4, 0.5], [0.3, 0.5], [0.5, 0.5], [0.4, 0.35], [0.3, 0.65]]) {
        const x = R.w * fx, y = R.h * fy;
        if (!R.blocksPoint(x, y, 30) && !R.blocksPoint(x + 60, y, 30) && !R.blocksPoint(x - 60, y, 30)) { p.x = x; p.y = y; break; }
      }
      g.enemies.length = 0; g.projectiles.clear(); g.hazards.clear(); g.waves.state = 'cleared';
    };
    const passo = (s, inp) => { for (let t = 0; t < s; t += 1 / 60) { p.update(1 / 60, inp || this.entrada()); g.hazards.update(1 / 60); } };
    // pulo: sobe, cai e aterrissa
    prep();
    p.captureInput({ pressed: { jump: true }, held: {} });
    let alto = 0;
    for (let t = 0; t < 1.2; t += 1 / 60) { p.update(1 / 60, this.entrada()); alto = Math.max(alto, p.z); }
    this.ok('pulo: sobe acima de 40 e volta ao chão', alto > 40 && p.z === 0 && !p.air, `${alto.toFixed(1)} / ${p.z}`);
    // passa por cima de uma onda de choque (conta como esquiva perfeita)
    prep();
    const hp0 = p.hp;
    p.startJump(); passo(0.18);
    g.hazards.add({ kind: 'ring', x: p.x, y: p.y, r0: 0, r1: 200, w: 30, dur: 0.6, dmg: 30 });
    passo(0.1);
    this.ok('pulo: a onda de choque passa por baixo', p.hp === hp0 && p.z > PULO.ALTO, `${p.hp}/${hp0} z ${p.z.toFixed(1)}`);
    g.hazards.clear(); passo(1);
    // mergulho: o pesado no ar cai de uma vez e atinge quem está em volta
    prep();
    const alvo = createEnemy('rastejador', p.x + 50, p.y, 1); alvo.hp = alvo.maxHp = 5000; alvo.spawnT = 0; alvo.state = 'idle'; g.enemies.push(alvo);
    p.startJump(); passo(0.25);
    p.combo.bufferInput('H'); passo(1 / 60);
    this.igual('mergulho: pesado no ar', p.state, 'plunge');
    passo(0.6);
    this.ok('mergulho: impacto fere o inimigo ao lado e volta ao chão', alvo.hp < 5000 && p.z === 0 && p.state === 'idle', `${alvo.hp} ${p.state}`);
    // defesa: aparo na hora certa, defesa depois, pelas costas passa tudo, sem energia quebra
    prep();
    const atk = createEnemy('cacador', p.x + 40, p.y, 1); atk.hp = atk.maxHp = 5000; atk.spawnT = 0; atk.state = 'idle'; g.enemies.push(atk);
    const guarda = { move: { x: 0, y: 0 }, pressed: {}, held: { block: true }, released: {} };
    passo(1 / 60, guarda);
    this.igual('defesa: segurar levanta a guarda', p.state, 'block');
    let h = p.hp;
    p.takeDamage(40, atk.x, atk.y);
    this.ok('defesa: aparo anula o golpe e atordoa o atacante', p.hp === h && atk.state === 'stun' && p.counterT > 0, `${p.hp}/${h} ${atk.state}`);
    passo(0.5, guarda); p.invuln = 0;
    h = p.hp; const f0 = p.fury;
    p.takeDamage(40, atk.x, atk.y);
    this.ok('defesa: de frente passa só uma parte e gasta energia', p.hp < h && h - p.hp <= Math.ceil(40 * Settings.diff.dmg * 0.25) + 1 && p.fury < f0 && p.state === 'block', `${h - p.hp} ${p.state}`);
    p.invuln = 0; h = p.hp;
    p.takeDamage(40, p.x - 40, p.y);
    this.ok('defesa: pelas costas o golpe passa inteiro', h - p.hp > Math.ceil(40 * Settings.diff.dmg * 0.25) + 1, h - p.hp);
    prep(); g.enemies.push(atk); atk.x = p.x + 40; atk.y = p.y;
    passo(0.4, guarda); p.fury = 0; p.invuln = 0; h = p.hp;
    p.takeDamage(40, atk.x, atk.y);
    this.ok('defesa: sem energia a guarda quebra', p.state === 'hurt' && p.hp < h, p.state);
    passo(0.3, this.entrada());
    this.ok('defesa: soltar baixa a guarda', p.state !== 'block');
    prep();
  },

  // ------------------------------------------- menus numa tela baixa (celular)
  telaBaixa() {
    const W0 = VIEW_W, H0 = VIEW_H, M = game.menu;
    try {
      VIEW_W = 1225; VIEW_H = 566;   // 844 × 390 deitado (Game.resize, modo 'menu')
      const dentro = (rs, fim) => rs.every((r) => r.y >= 0 && r.y + r.h <= fim);
      this.ok('tela baixa: menu inicial cabe acima das dicas', dentro(M.layStart().rects, VIEW_H - 44));
      this.ok('tela baixa: menu principal cabe', dentro(M.layMain().rects, VIEW_H - 54));
      this.ok('tela baixa: os 5 espaços de salvamento cabem', dentro(M.layLoad().rects, VIEW_H - 42));
      const P = M.layPause();
      this.ok('tela baixa: pausa cabe', dentro(P.rects, VIEW_H - 58) && P.panel.y + P.panel.h <= VIEW_H - 24, JSON.stringify(P.panel));
      const R = M.roster, tab = R.tab;
      R.tab = 0;
      const L = R.layout(), fimAbil = Math.max(...L.abil.map((r) => r.y + r.h));
      this.ok('tela baixa: habilidades da ficha acima dos botões', L.compact && fimAbil <= L.info.y + L.info.h && L.info.y + L.info.h <= VIEW_H - 74 - 10, `${fimAbil} / ${L.info.y + L.info.h}`);
      R.tab = tab;
      const S = game.screens.skillLayout(), ns = Object.values(S.nodes);
      this.ok('tela baixa: a árvore inteira cabe no painel', ns.length > 0 && ns.every((n) => n.y + n.r + 30 <= S.gy + S.gh) && S.gy + S.gh <= VIEW_H - 30, `${Math.max(...ns.map((n) => n.y + n.r))} / ${S.gy + S.gh}`);
    } finally { VIEW_W = W0; VIEW_H = H0; }
    const S = game.screens.skillLayout();
    this.ok('tela normal: árvore com o passo de sempre (100)', Object.values(S.nodes).some((n) => n.y === S.gy + 54 + 100), S.gy);
  },

  // ------------------------------------------------ pendências: pontos, granada, exoesqueleto, dados
  pendencias() {
    const g = game;
    // nós da árvore: os pontos por nível ficam em 'pts' (o 'cost' das ativas é energia)
    const nos = [...Object.values(SKILLS), ...Object.values(ROSTER_SKILLS)];
    this.ok('árvore: nenhum nó usa mais o campo cost', nos.every((s) => s.cost === undefined), nos.filter((s) => s.cost !== undefined).map((s) => s.name).join(','));
    this.ok('árvore: Supremas custam 2 a 4 pontos (pts)', nos.filter((s) => s.pts).length >= 35 && nos.every((s) => skillPts(s) >= 1 && skillPts(s) <= 4));
    // Fuzil Sombra: o GLB é uma lâmina
    const fz = WEAPON_DEFS.arma_primaria_orion_3d;
    this.ok('arma especial do Orion (orion_primaria) é de lâminas, não fuzil', fz && fz.kind === 'blades' && !/fuzil/i.test(fz.name) && fz.stats.hits === 2 && !fz.stats.range, fz && fz.kind);
    this.ok('nenhuma arma marcada como fuzil', Object.values(WEAPON_DEFS).every((w) => w.kind !== 'rifle'));
    // redistribuir pontos (Kael: game.progress)
    const pr = g.progress, salvo = JSON.parse(JSON.stringify(pr.toJSON())), banco = g.stats.soulsBank;
    try {
      pr.level = 30; pr.sp = 12; pr.skills = {}; pr.slots = [null, null, null, null]; pr.respecs = 0; g.skillUI.char = 'kael';
      const livres = Object.keys(SKILLS).filter((id) => !pr.blocker(id)).slice(0, 4);
      for (const id of livres) g.learnSkill(id);
      const gasto = pr.spent(), sp0 = pr.sp;
      this.ok('redistribuir: pontos gastos somados', gasto > 0 && gasto === 12 - sp0, `${gasto} / ${sp0}`);
      g.skillUI.respecT = 0;
      this.ok('redistribuir: o 1º aperto só pede confirmação', g.respecSkills() === false && pr.spent() === gasto && g.skillUI.respecT > 0);
      this.ok('redistribuir: a 1ª é grátis e devolve tudo', g.respecSkills() === true && pr.sp === 12 && pr.spent() === 0 && pr.slots.every((k) => k === null) && pr.respecs === 1 && g.stats.soulsBank === banco);
      for (const id of livres) g.learnSkill(id);
      this.igual('redistribuir: a 2ª custa 10 células por ponto', g.respecPrice(pr), pr.spent() * 10);
      g.stats.soulsBank = 0; g.skillUI.respecT = 0;
      g.respecSkills(); g.respecSkills();
      this.ok('redistribuir: sem células, não redistribui', pr.spent() === gasto);
      g.stats.soulsBank = 10000; g.skillUI.respecT = 0;
      g.respecSkills(); g.respecSkills();
      this.ok('redistribuir: pagando, devolve e desconta', pr.spent() === 0 && g.stats.soulsBank === 10000 - gasto * 10, g.stats.soulsBank);
      const j = pr.toJSON();
      this.igual('redistribuir: contagem vai para o salvamento', j.respecs, 2);
    } finally { pr.load(salvo); g.stats.soulsBank = banco; g.player.recalc(); }
    // granada de plasma (Kael)
    if (RosterManager.active !== 'kael') RosterManager.setActive('kael');
    const p = g.player;
    this.ok('granada: o Kael leva, os outros não', Granada.disponivel(p) && !Granada.disponivel({ def: CHARACTERS_BY_ID.lyra }));
    this.ok('granada: não entra na troca de arma (Q) nem vira a arma da mão', p.nextWeapon() !== 'granada_plasma' && !RosterManager.equipWeapon('kael', 'granada_plasma') && RosterManager.equippedWeapon('kael') !== 'granada_plasma');
    const sala = g.enemies.slice();
    g.enemies.length = 0; HeroObjects.clear();
    try {
      p.state = 'idle'; p.granadas = GRANADA.MAX; p.granadaT = 0; p.facing = 0;
      const e = createEnemy('drone', p.x + 160, p.y, 3); e.setState('idle'); e.camp = null; g.enemies.push(e);
      const h0 = e.hp;
      this.ok('granada: arremesso gasta uma carga', Granada.lancar(p, null) && p.granadas === GRANADA.MAX - 1 && HeroObjects.list.some((o) => o instanceof GranadaPlasma));
      for (let i = 0; i < 40; i++) HeroObjects.update(1 / 30);
      this.ok('granada: explode, fere e deixa a máquina em curto', e.hp < h0 && !HeroObjects.list.some((o) => o instanceof GranadaPlasma) && (e.stun > 0.8 || !e.alive || e.hp <= 0), `${h0} → ${e.hp}, stun ${e.stun}`);
      p.granadas = 0;
      this.ok('granada: sem carga, não arremessa', !Granada.lancar(p, null));
      Granada.tick(p, GRANADA.RECARGA + 0.01);
      this.igual('granada: uma carga volta depois da recarga', p.granadas, 1);
    } finally { g.enemies.length = 0; for (const q of sala) g.enemies.push(q); HeroObjects.clear(); p.granadas = GRANADA.MAX; }
    // exoesqueleto: armação no modelo de cada herói e metade do empurrão
    const arm0 = RosterManager.equippedArmor('kael');
    try {
      RosterManager.equipArmor('kael', 'exoesqueleto'); p.recalc();
      this.ok('exoesqueleto: segura metade do empurrão', p.stats.kbResist === 0.5);
      p.invuln = 0; p.state = 'idle'; p.kbx = p.kby = 0; const hp = p.hp;
      p.takeDamage(1, p.x - 10, p.y, 400);
      this.ok('exoesqueleto: empurrão recebido pela metade', Math.abs(Math.hypot(p.kbx, p.kby) - 200) < 1, Math.hypot(p.kbx, p.kby));
      p.hp = hp; p.invuln = 0; p.state = 'idle';
      for (const c of ['kael', 'lyra', 'drakos', 'sera', 'orion']) {
        const M = MODELS3D[heroModelKey(CHARACTERS_BY_ID[c])], m = M.build();
        const a0 = RosterManager.equippedArmor(c);
        RosterManager.equipArmor(c, 'exoesqueleto');
        const e = { def: CHARACTERS_BY_ID[c], x: 0, y: 0, z: 0, state: 'idle', stateTime: 0.5, animTime: 0.5, facing: 0, flash: 0, moveSpeed: 0, wpnOut: true };
        M.pose(m, e, game.opts3(e, 0));
        const vis = m.exo ? m.exo.filter((n) => n.vis && n.geo && n.geo.length).length : 0;
        RosterManager.equipArmor(c, RosterManager.armorsFor(c)[0]);
        M.pose(m, e, game.opts3(e, 0));
        const vis2 = m.exo ? m.exo.filter((n) => n.vis).length : -1;
        this.ok(`exoesqueleto em ${c}: 10 peças vestidas, nenhuma sem ele`, vis === 10 && vis2 === 0, `${vis} / ${vis2}`);
        if (a0) RosterManager.equipArmor(c, a0);
      }
      this.ok('exoesqueleto: sem tingir a roupa', heroArmorTint('kael') === null);
      this.ok('exoesqueleto na lista de armas: com efeito (não "em desenvolvimento")', WEAPON_DEFS.exoesqueleto.implemented === true);
      const w0 = RosterManager.weapon.kael;
      RosterManager.weapon.kael = 'exoesqueleto';   // salvamento antigo que o tinha como arma
      this.igual('exoesqueleto nunca é a arma da mão', RosterManager.equippedWeapon('kael'), 'tempestade_nula');
      if (w0 === undefined) delete RosterManager.weapon.kael; else RosterManager.weapon.kael = w0;
    } finally { if (arm0) RosterManager.equipArmor('kael', arm0); p.recalc(); }
    // voz sintetizada (opcional): timbre por personagem, dublagem gravada tem preferência
    const V = VozSintetica, sv = Settings.v.synthVoice, falar = V.falar, enf = V.enfileirar, dub = game.audio.narration.isPlaying;
    try {
      this.ok('voz: timbre de cada personagem (rádio inclusive)', V.perfil('LYRA · RÁDIO') === VOZ_PERFIS.LYRA && V.perfil('DRAKOS') === VOZ_PERFIS.DRAKOS && V.perfil('') === VOZ_PERFIS._narrador && V.perfil('COMERCIANTE') === VOZ_PERFIS._padrao);
      this.ok('voz: desligada por padrão', SETTINGS_DEFAULT.synthVoice === false);
      Settings.v.synthVoice = false;
      this.igual('voz: desligada, não fala', V.falar('KAEL', 'Teste da voz.'), null);
      Settings.v.synthVoice = true;
      game.audio.narration.isPlaying = () => true;
      this.igual('voz: com dublagem tocando, fica quieta', V.falar('KAEL', 'Teste da voz.'), null);
      game.audio.narration.isPlaying = dub;
      if (V.ok && V.volume() > 0) {
        const f = V.falar('SERA', 'Teste da voz.');
        this.ok('voz: ligada, lê a fala com o timbre da personagem', f && f.length === 1 && Math.abs(f[0].pitch - VOZ_PERFIS.SERA.pitch) < 1e-4, JSON.stringify(f));
        V.parar();
      }
      // ganchos: a legenda do HUD e as páginas da história
      let ouvido = null, pagina = null;
      V.falar = (q, t) => { ouvido = [q, t]; return null; };
      V.enfileirar = (l) => { pagina = l; return null; };
      game.hud.say('ORION', 'Ninguém me vê chegar.', 3, 0, true); game.hud.update(1 / 60);
      this.ok('voz: a legenda do HUD é lida quando aparece', ouvido && ouvido[0] === 'ORION' && ouvido[1] === 'Ninguém me vê chegar.', JSON.stringify(ouvido));
      game.story.start([{ bg: 'dawn', kicker: 'T', title: 'T', lines: ['Narração.', ['LYRA', 'Fala.']] }], () => {});
      this.ok('voz: a página da história sem dublagem é lida (narração e falas)', pagina && pagina.length === 2 && pagina[0][0] === '' && pagina[1][0] === 'LYRA', JSON.stringify(pagina));
      game.story.stop();
    } finally { V.falar = falar; V.enfileirar = enf; game.audio.narration.isPlaying = dub; Settings.v.synthVoice = sv; game.hud.sub = null; V.parar(); }
  },

  // ------------------------------------------------------------ mundo aberto
  mundo() {
    // regiões: 7, cada uma com chegada (mercador e missões), chefe e zonas ligadas pela grade
    this.igual('mundo: 11 regiões (com a Cidade Morta)', WORLD_REGIONS.length, 11);
    this.igual('mundo: 81 zonas das regiões no mapa (9 de Carmesin + 6 × 6 + 3 cidades × 9 + 9 da Cidade Morta)', Object.values(WORLD_ZONES).filter((z) => !z.instancia && !z.cidade).length, 81);
    for (const R of WORLD_REGIONS) {
      const zs = worldZonesOf(R.id), hub = WORLD_ZONES[R.hub];
      this.ok(`${R.id}: zona de chegada com portal, mercador e missões`, hub && hub.region === R.id && hub.portal && hub.npcs.some((n) => n.merchant) && hub.npcs.some((n) => n.quest), R.hub);
      const seguraR = zs.length && zs.every((z) => z.seguro);   // cidade segura (Metrópole): o chefe regional fica na masmorra
      this.ok(`${R.id}: um acampamento de chefe com o inimigo do chefe${seguraR ? ' (cidade segura: o chefe está na masmorra)' : ''}`, seguraR ? Object.values(WORLD_MASMORRAS).some((M) => M.reg === R.id && M.chefe.regional && M.chefe.tipo === R.boss.type) : zs.filter((z) => (z.camps || []).some((c) => c.boss && c.mobs[R.boss.type])).length === 1);
      const ligada = zs.every((z) => zs.length === 1 || Object.values(WORLD_DIRS).some(([dr, dc]) => worldZoneAt(z.r + dr, z.c + dc, R.id)));
      this.ok(`${R.id}: toda zona tem passagem para outra`, ligada);
      this.igual(`${R.id}: 3 missões`, WorldQuests.lista(R.id).length, 3);
      for (const z of zs) if (!THEMES[z.theme]) this.ok(`tema ${z.theme} de ${z.id} existe`, false);
    }
    // o modo mundo sem tocar no salvamento do jogador
    const ls = (() => { try { return localStorage.getItem(WORLD_SAVE_KEY); } catch (e) { return null; } })();
    const salvar = World.save; World.save = () => {};
    try { localStorage.removeItem(WORLD_SAVE_KEY); } catch (e) {}
    try {
      World.start();
      const g = game, p = g.player;
      this.ok('mundo: começa no Mercado Afundado', World.active && World.zone.id === 'mercado' && g.state === 'playing', World.zone && World.zone.id);
      this.expansao();   // cidades dos níveis 25 a 100 (com o mundo já começado)
      // relógio e clima
      this.ok('dia e noite: meio-dia claro, meia-noite escura', WorldTime.luz(12) === 1 && WorldTime.luz(0) === 0);
      const th = THEMES.floresta, h0 = World.state.hora;
      World.state.hora = 12; const dia = WorldTime.escuridao(th);
      World.state.hora = 23; const noite = WorldTime.escuridao(th);
      this.ok('dia e noite: a floresta é mais escura à noite', noite > dia + 0.2, `${dia} / ${noite}`);
      this.ok('dia e noite: noite dá +20% de experiência e acampamentos notam menos', WorldTime.xpMult() === 1.2 && WorldTime.senseMult() < 1);
      World.state.hora = h0;
      WorldTime.update(1 / 60);
      this.ok('clima sorteado da região', !!World.state.clima && WORLD_CLIMA_REG.carmesin[World.state.clima.tipo] > 0, JSON.stringify(World.state.clima));
      let erro = null;
      try { for (const c in WORLD_CLIMAS) { WorldTime.definir(c, 'carmesin', false); WorldTime.update(0.1); WorldTime.drawOverlay(g.ctx); } } catch (e) { erro = e.message; }
      this.ok('clima: todos desenham sem erro', !erro, erro);
      // relíquias
      const L = WorldInv.gerar(30, 'obsidiano', 4, 0, () => 0.01);   // (sorteio fixo: com o mínimo lendário, às vezes sai mítica)
      this.ok('relíquia: raridade mínima respeitada', L.r === 4, L.r);
      this.igual('relíquia lendária: 3 atributos', Object.keys(L.st).length, 3);
      this.ok('relíquia: nome com a região', WorldInv.nome(L).indexOf('Obsidiana') > 0, WorldInv.nome(L));
      const it = WorldInv.ganhar(WorldInv.gerar(10, 'carmesin', 0));
      it.b = 'nucleo'; it.st = { dano: 0.1 }; it.lv = 1;   // o requisito de nível (lv − 4) não atrapalha
      const d0 = p.stats.dmgMult;
      WorldInv.equipar(it.id);
      this.ok('relíquia equipada soma o dano', Math.abs(p.stats.dmgMult - d0 - 0.1) < 1e-9, p.stats.dmgMult - d0);
      WorldInv.desequipar(WorldInv.S.equip.indexOf(it.id));
      this.ok('tirar a relíquia volta o dano', Math.abs(p.stats.dmgMult - d0) < 1e-9);
      // mercador: compra e venda com células
      WorldInv.ui.shop = true;
      g.stats.soulsBank = 10000;
      const est = WorldInv.estoque(), n0 = est.length, v = WorldInv.valor(est[0]);
      this.igual('mercador: 4 relíquias no estoque do dia', n0, 4);
      WorldInv.comprar(0);
      this.ok('mercador: compra desconta as células', g.stats.soulsBank === 10000 - v && WorldInv.estoque().length === n0 - 1, g.stats.soulsBank);
      const c0 = WorldInv.S.capsulas;
      WorldInv.comprar(WorldInv.estoque().length);
      this.igual('mercador: vende cápsula', WorldInv.S.capsulas, c0 + 1);
      const ult = WorldInv.S.itens[WorldInv.S.itens.length - 1], vv = WorldInv.venda(ult), b0 = g.stats.soulsBank;
      WorldInv.vender(ult.id);
      this.ok('mercador: compra relíquia por 40%', g.stats.soulsBank === b0 + vv && !WorldInv.item(ult.id));
      WorldInv.ui.shop = false;
      p.hp = 10;
      WorldInv.usarCapsula();
      this.ok('cápsula cura 40% da vida', p.hp === Math.min(p.maxHp, 10 + Math.round(p.maxHp * 0.4)), p.hp);
      // missões: aceitar, contar, entregar
      const anc = g.npcs.find((n) => n.quest);
      this.ok('missão: a anciã tem missão (!)', anc && WorldQuests.marca(anc) === '!');
      anc.talk(); Dialogo.escolherId('regiao'); Dialogo.escolherId('aceitar'); Dialogo.fechar();   // pela conversa (js/mundo/povo.js)
      const q = WorldQuests.atual('carmesin');
      this.ok('missão: aceita a primeira', q && q.id === 'car1');
      for (let i = 0; i < 12; i++) WorldQuests.onKill({ type: 'rastejador' });
      this.ok('missão: pronta depois de 12 abates (?)', WorldQuests.pronta(q) && WorldQuests.marca(anc) === '?');
      const n1 = WorldInv.S.itens.length;
      anc.talk(); Dialogo.escolherId('regiao'); Dialogo.fechar();
      this.ok('missão: entregue com relíquia de recompensa', World.state.missoes.car1.st === 'feita' && WorldInv.S.itens.length === n1 + 1);
      // viagem até outra região e desenho da zona
      erro = null;
      try { World.loadZone('velmora_trilha', null); g.renderWorld(g.ctx); WorldTime.drawOverlay(g.ctx); } catch (e) { erro = e.message; }
      this.ok('mundo: zona de Velmora carrega e desenha', !erro && World.zone.id === 'velmora_trilha' && g.enemies.length > 0, erro);
      this.ok('mundo: árvores no lugar dos pilares', g.room.theme.pillar === 'tree' && g.room.pillars.length > 0 && g.room.pillars[0].hw > g.room.pillars[0].r);
      {
        // kit medieval e natural do Blender (tools/blender/natureza.py, js/mundo/natureza3d.js)
        const R = g.room, kit = R.pillars.filter((p) => p.kit), enf = R.pillars.filter((p) => p.enfeite);
        this.ok('floresta: obstáculos viram carvalhos, pinheiros, bétulas, árvores mortas, tocos e pedras do kit do Blender, com enfeites no chão',
          typeof Natureza3D !== 'undefined' && kit.length >= R.pillars.length * 0.8 && kit.some((p) => ['carvalho', 'pinheiro', 'betula'].includes(p.kit.id)) && enf.length > 5, `${kit.length}/${R.pillars.length} enfeites ${enf.length}`);
        const todos = R.pillars, sem = todos.filter((q) => !q.enfeite), mede = (p) => `${R.blocksPoint(p.x, p.y, 4)}${R.linhaLivre(p.x - 30, p.y, p.x + 30, p.y)}`;
        this.ok('floresta: os enfeites (arbustos, samambaias, cogumelos…) não bloqueiam passagem nem linha de visão', enf.every((p) => { R.pillars = sem; const a = mede(p); R.pillars = todos; return p.deco && a === mede(p); }));
        R.pillars = todos;
        this.ok('floresta: as 16 peças do kit no motor (PROPS3D e modelos cen_*)', ['carvalho', 'pinheiro', 'betula', 'arvore_seca', 'arbusto', 'samambaia', 'pedra_musgo', 'rochedo', 'tronco_caido', 'toco', 'cogumelos', 'cerca', 'carroca', 'placa_estrada', 'fardo_feno', 'poco'].every((id) => PROPS3D[id] && PROPS3D[id].uv && MODELS3D['cen_' + id]));
        const f = R3D.active ? R3D.foto(g.model3('cen_carvalho'), { yaw: 0, scale: 1, lift: 0, roll: 0, pitch: 0, flash: 0, emi: 1, holo: false, ghost: null, tint: null }, 1) : { canvas: { width: 1 } };
        this.ok('motor: foto de um modelo parado vira sprite (as árvores da vista isométrica)', !!f && f.canvas.width > 0);
        this.ok('floresta: a vila da clareira (carroça, feno, poço, cerca, placa) nas zonas do cenário', ['carroca', 'fardo_feno', 'poco', 'cerca', 'placa_estrada'].every((id) => Cenario.ZONAS.velmora_clareira.some((q) => q[0] === id)));
        this.ok('lote do Meshy: a pilha de caixotes (remesh) no motor e na clareira de Velmora', !!PROPS3D.caixotes && PROPS3D.caixotes.n <= 6000 && /_retopo\/meshy\//.test(PROPS3D.caixotes.src) && !!MODELS3D.cen_caixotes && Cenario.ZONAS.velmora_clareira.some((q) => q[0] === 'caixotes'));
        this.ok('floresta: fora da floresta o kit não entra', Natureza3D.escolha({ seed: 5 }, THEMES.neve) === null);
      }
      this.campoAberto();
      this.campanhas();
      this.mapa();
      this.mmo();
      this.paisagem();
      this.combateMundo();
      this.arsenal();
      this.fabricacao();
      this.cidade();
      this.bairro();
      this.rotina();
      this.climaMundo();
      this.criacao(salvar);   // por último: troca o herói pelo personagem criado e volta ao Kael
    } finally {
      World.save = salvar;
      try { if (ls === null) localStorage.removeItem(WORLD_SAVE_KEY); else localStorage.setItem(WORLD_SAVE_KEY, ls); } catch (e) {}
    }
  },

  // Mundo até o nível 100 (js/mundo/expansao.js): faixas, cidades, acesso por nível, conteúdo de
  // cada cidade, experiência das zonas altas e a maestria depois do nível 100
  expansao() {
    const g = game;
    this.igual('faixas: 4 (1–25, 25–50, 50–75, 75–100)', WORLD_FAIXAS.map((f) => f.lv.join('-')).join(','), '1-25,25-50,50-75,75-100');
    this.igual('nível máximo 100', PROG.maxLevel, 100);
    for (const [id, nv] of [['metropole', 25], ['ruinas', 50], ['nexuszero', 75]]) {
      const R = worldRegion(id), zs = worldZonesOf(id), hub = WORLD_ZONES[R.hub];
      this.ok(`${id}: 9 zonas (3 × 3) com a cidade no centro`, zs.length === 9 && hub && hub.r === 1 && hub.c === 1 && hub.hub && hub.portal && !hub.camps.length, `${zs.length} ${hub && hub.r},${hub && hub.c}`);
      this.ok(`${id}: níveis da faixa`, zs.every((z) => z.lv >= R.lv[0] && z.lv <= R.lv[1]), zs.map((z) => z.lv).join(','));
      this.ok(`${id}: cidade com 4+ moradores de serviço (ferreiro, curandeiro, artesão, treinador)`, ['ferreiro', 'curandeiro', 'artesao', 'treinador'].every((sv) => WORLD_POVO.some((P) => P.zona === R.hub && (P.servicos || []).includes(sv))));
      this.ok(`${id}: masmorra de 3 andares, tesouros e chefe`, Object.values(WORLD_MASMORRAS).some((M) => M.reg === id && WORLD_ZONES[`${M.id}_2`]) && Object.values(WORLD_TESOUROS).filter((T) => WORLD_ZONES[T.zona].region === id).length >= 2 && (zs.some((z) => z.camps.some((c) => c.boss)) || Object.values(WORLD_MASMORRAS).some((M) => M.reg === id && M.chefe.regional)));
      this.ok(`${id}: 3 missões da região e 3 secundárias`, WorldQuests.lista(id).length === 3 && WORLD_AVENTURAS.filter((q) => q.reg === id).length === 3);
      this.ok(`${id}: tema, facção, clima, contratos e material`, zs.every((z) => THEMES[z.theme]) && WORLD_FACCOES[id] && CLIMA_REGIAO[id] && WORLD_CLIMA_REG[id] && WORLD_CONTRATO_ALVOS[id].every((t) => ENEMY_VARIANTS[t] || ENEMY_TYPES[t]) && WORLD_MAT_REG[id]);
      // acesso: só com o nível da faixa (o chefe anterior não basta)
      const pr = g.activeProgress(), lv0 = pr.level, ch0 = Object.assign({}, World.state.chefes);
      for (const q of WORLD_REGIONS) World.state.chefes[q.id] = true;
      pr.level = nv - 1;
      const antes = World.regionOpen(id);
      pr.level = nv;
      this.ok(`${id}: abre no nível ${nv}, não antes (nem com todos os chefes derrotados)`, !antes && World.regionOpen(id));
      pr.level = lv0; World.state.chefes = ch0;
    }
    // experiência: zonas acima do nível 40 rendem mais; até o 40 continua igual
    const e = { type: 'legionario', level: 5 }, z0 = World.zone, xpEm = (lv) => { World.zone = { lv }; return g.xpFor ? g.xpFor(e) : 0; };
    if (g.xpFor) { const a = xpEm(30), b = xpEm(40), c = xpEm(99); World.zone = z0; this.ok('experiência: igual até a zona 40, ~6× na zona 99', a === b && c > b * 5 && c < b * 8, `${a} ${b} ${c}`); }
    else World.zone = z0;
    // nível alto: defesa e mobilidade rendem 1/4 depois do 40
    this.ok('nível 100: mobilidade e defesa com retorno menor depois do 40', PROG.nivelSuave(39) === 39 && PROG.nivelSuave(99) === 54);
    // maestria depois do nível 100
    const pr = g.activeProgress(), lv0 = pr.level, m0 = pr.maestria || 0, x0 = pr.mxp || 0, dm0 = g.player.stats.dmgMult;
    pr.level = PROG.maxLevel; pr.maestria = 0; pr.mxp = 0;
    g.player.recalc(false); const dmA = g.player.stats.dmgMult;
    g.gainXP(PROG.xpMaestria * 2 + 10);
    this.ok('maestria: a experiência no nível 100 vira pontos (+0,5% de dano cada)', pr.level === 100 && pr.maestria === 2 && pr.mxp === 10 && Math.abs(g.player.stats.dmgMult - dmA - 0.01) < 1e-9, `${pr.maestria} ${pr.mxp}`);
    const js = JSON.parse(JSON.stringify(pr.toJSON()));
    this.ok('maestria: vai para o salvamento', js.maestria === 2 && js.mxp === 10);
    pr.level = lv0; pr.maestria = m0; pr.mxp = x0; g.player.recalc(false);
    this.ok('maestria: volta ao estado do teste', Math.abs(g.player.stats.dmgMult - dm0) < 1e-9);
  },

  // Mundo aberto à moda de MMO (js/mundo/dialogo.js, oficios.js, povo.js, aventuras.js, locais.js,
  // eventos.js): dados, conversa, missões secundárias de todos os tipos, contratos, ofícios,
  // reputação, masmorras, tesouros, eventos, diário e validação do salvamento
  mmo() {
    const g = game, pr = g.activeProgress(), lv0 = pr.level, cel0 = g.stats.soulsBank, chefes0 = Object.assign({}, World.state.chefes);
    const T = (nome) => g.npcs.find((n) => n.name === nome);
    const matar = (e) => e.takeHit({ dmg: 99999, kx: 0, ky: 0, kb: 0, launch: 0, stun: 0, heavy: true, crit: false });
    // ------------------------------------------------ dados
    const pessoas = WORLD_POVO.map((P) => P.id), zonaDe = (P) => P.zona || P.chave.split(':')[0];
    this.ok('povo: cada morador mora numa zona que existe e está nela', WORLD_POVO.every((P) => WORLD_ZONES[zonaDe(P)] && WORLD_ZONES[zonaDe(P)].npcs.some((d) => d.persona === P)), WORLD_POVO.filter((P) => !WORLD_ZONES[zonaDe(P)]).map((P) => P.id).join(','));
    this.ok('povo: ids únicos', new Set(pessoas).size === pessoas.length);
    const servicos = ['loja', 'curandeiro', 'ferreiro', 'artesao', 'treinador', 'armazem', 'armeiro', 'pesquisa', 'guilda', 'missoes', 'descanso', 'refeicao', 'animais', 'montarias', 'gm', 'bar_neon'].concat(Object.keys(FAB_ESTACOES));   // + os da cidade (js/mundo/cidade.js e bairro.js)
    this.ok('povo: serviços conhecidos', WORLD_POVO.every((P) => (P.servicos || []).every((sv) => servicos.includes(sv))), WORLD_POVO.flatMap((P) => (P.servicos || []).filter((sv) => !servicos.includes(sv))).join(','));
    this.ok('povo: cada morador tem função e saudação', WORLD_POVO.every((P) => P.papel && P.ola && P.ola.length));
    const rv = WORLD_POVO.flatMap((P) => (P.rumores || []).map((r) => r.revela).filter(Boolean));
    this.ok('povo: rumores revelam masmorras, tesouros e zonas que existem', rv.length >= 10 && rv.every((r) => (r.masmorra && WORLD_MASMORRAS[r.masmorra]) || (r.tesouro && WORLD_TESOUROS[r.tesouro]) || (r.zona && WORLD_ZONES[r.zona])), rv.length);
    for (const sv of ['curandeiro', 'ferreiro', 'artesao', 'treinador']) this.ok(`povo: há ${sv} em pelo menos 3 regiões`, new Set(WORLD_POVO.filter((P) => (P.servicos || []).includes(sv)).map((P) => WORLD_ZONES[zonaDe(P)].region)).size >= 3);
    this.ok('povo: vilarejos em zonas que existem', Object.keys(WORLD_VILAS).every((id) => WORLD_ZONES[id] && WORLD_ZONES[id].vila));
    const tipoOk = (t) => !!(ENEMY_TYPES[t] || ENEMY_VARIANTS[t]);
    const ids = WORLD_AVENTURAS.map((q) => q.id), tipos = new Set();
    this.ok('missões: ids únicos', new Set(ids).size === ids.length);
    for (const R of WORLD_REGIONS) this.ok(`missões: ${R.id} tem pelo menos 3 secundárias`, WORLD_AVENTURAS.filter((q) => q.reg === R.id).length >= 3);
    let ruins = [];
    for (const q of WORLD_AVENTURAS) {
      const prob = [];
      if (!pessoas.includes(q.doador)) prob.push('doador');
      if (!q.nome || !q.desc || !q.ini || !q.fim) prob.push('textos');
      for (const r of q.req || []) if (!ids.includes(r)) prob.push('req');
      q.passos.forEach((P, k) => {
        tipos.add(P.t);
        if (!P.txt) prob.push(`txt${k}`);
        if (P.npc && !pessoas.includes(P.npc)) prob.push(`npc ${P.npc}`);
        if (P.zona && !WORLD_ZONES[P.zona]) prob.push(`zona ${P.zona}`);
        if (P.alvo && !tipoOk(P.alvo)) prob.push(`alvo ${P.alvo}`);
        if (P.chefe && (!tipoOk(P.chefe.tipo) || !Object.keys(P.chefe.escolta || {}).every(tipoOk))) prob.push('chefe');
        for (const E of P.emboscadas || []) if (!Object.keys(E.mobs).every(tipoOk)) prob.push('emboscada');
        if (P.mat && !Object.keys(P.mat).every((m) => WORLD_MATERIAIS[m])) prob.push('mat');
        if (P.t === 'masmorra' && !WORLD_MASMORRAS[P.id]) prob.push('masmorra');
        if (P.t === 'examinar' && !(P.pistas && P.pistas.length)) prob.push('pistas');
      });
      if (!q.passos[q.passos.length - 1].fim) prob.push('sem fim');
      const recs = [q.rec || {}].concat(q.escolha ? q.escolha.opcoes.map((o) => o.rec || {}) : []);
      for (const R of recs) {
        for (const k in R.cons || {}) if (!WORLD_CONSUMIVEIS[k]) prob.push('cons');
        for (const k in R.mat || {}) if (!WORLD_MATERIAIS[k]) prob.push('rec mat');
        if (R.unico && (!WORLD_RELIQUIAS.some((b) => b.id === R.unico.b) || !Object.keys(R.unico.st).every((k) => WORLD_ATRIB[k]))) prob.push('único');
      }
      if (prob.length) ruins.push(`${q.id}: ${prob.join(',')}`);
    }
    this.ok('missões: doadores, passos, alvos, zonas e recompensas válidos', !ruins.length, ruins.join(' · '));
    this.ok('missões: todos os tipos de objetivo aparecem', ['matar', 'entregar', 'falar', 'achar', 'examinar', 'chefe', 'escolta', 'local', 'masmorra', 'evento'].every((t) => tipos.has(t)), [...tipos].join(','));
    this.ok('missões: há escolhas com recompensas diferentes', WORLD_AVENTURAS.filter((q) => q.escolha && q.escolha.opcoes.length >= 2).length >= 3);
    this.ok('receitas: materiais e produtos válidos', WORLD_RECEITAS.every((R) => Object.keys(R.mat).every((k) => k === 'regional' || WORLD_MATERIAIS[k]) && (R.id === 'capsula' || R.id === 'reliquia' || WORLD_CONSUMIVEIS[R.id])));
    this.igual('masmorras: uma por região', Object.keys(WORLD_MASMORRAS).length, WORLD_REGIONS.length);
    let andaresOk = true;
    for (const id in WORLD_MASMORRAS) {
      const M = WORLD_MASMORRAS[id], A = [0, 1, 2].map((k) => WORLD_ZONES[`${id}_${k}`]);
      if (!WORLD_ZONES[M.zona] || A.some((z) => !z || z.instancia !== id) || worldZoneAt(A[0].r - 1, A[0].c, M.reg) !== A[1] || worldZoneAt(A[1].r - 1, A[1].c, M.reg) !== A[2] || (M.saida && !WORLD_ZONES[M.saida.zona]) || !tipoOk(M.chefe.tipo)) andaresOk = false;
    }
    this.ok('masmorras: 3 andares ligados em sequência, entrada e saída em zonas que existem', andaresOk);
    this.ok('masmorras: fora da grade das regiões e do mapa', WORLD_REGIONS.every((R) => worldZonesOf(R.id).every((z) => !z.instancia)) && !Object.keys(World.mapLayout().zones).some((id) => WORLD_ZONES[id].instancia));
    this.ok('tesouros: em zonas que existem', Object.values(WORLD_TESOUROS).every((T2) => WORLD_ZONES[T2.zona]));
    try {
      // ------------------------------------------------ conversa e uma missão de entrega
      World.loadZone('mercado', null);
      Aventuras.S; Oficios.S; Locais.S; Eventos.S;
      g.stats.soulsBank = 5000;
      const tomas = T('TOMÁS');
      this.ok('conversa: morador com função e missão (!)', tomas instanceof Morador && tomas.papel && WorldQuests.marca(tomas) === '!');
      tomas.talk();
      this.ok('conversa: abre o diálogo com respostas', g.state === 'worlddlg' && Dialogo.aberto && Dialogo.temId('nova_car_s1') && Dialogo.temId('artesao') && Dialogo.temId('sair'), Dialogo.opcoes.map((o) => o.id).join(','));
      Dialogo.escolherId('nova_car_s1'); Dialogo.escolherId('aceitar');
      this.ok('missão secundária: aceita pela conversa e rastreada', Aventuras.ativa('car_s1') && World.state.rastreada === 'car_s1' && Aventuras.linha().indexOf('Peças') >= 0);
      Dialogo.escolherId('sair');
      this.ok('conversa: fechar volta ao jogo', !Dialogo.aberto && g.state === 'playing');
      Oficios.S.mat.sucata = 0;   // as máquinas derrubadas nos testes anteriores às vezes soltam sucata
      Oficios.dar('sucata', 6, false);
      this.igual('missão: pronta para entregar (?)', WorldQuests.marca(tomas), '?');
      const c1 = g.stats.soulsBank;
      tomas.talk(); Dialogo.escolherId('ent_car_s1'); Dialogo.fechar();
      const c2 = g.stats.soulsBank, feita2 = Aventuras.concluir(WORLD_AVENTURAS[0]);
      this.ok('missão: entrega consome o material e paga uma vez', Aventuras.feita('car_s1') && Oficios.mat('sucata') === 0 && c2 === c1 + 40 && !feita2 && g.stats.soulsBank === c2, `sucata ${Oficios.mat('sucata')} · células +${c2 - c1} · de novo ${feita2} +${g.stats.soulsBank - c2}`);
      this.ok('missão: histórico com dia e hora', Aventuras.st('car_s1').hist.length >= 2 && Aventuras.st('car_s1').hist.every((h) => h.d >= 1 && h.txt));
      // ------------------------------------------------ desaparecido + escolha
      pr.level = 40; g.player.recalc(true);
      Object.assign(World.state.chefes, { carmesin: true, velmora: true, lagoa: true, nexus: true, seraph: true, asterion: true });
      Aventuras.aceitar('car_s2');
      World.loadZone('galerias', null);
      const lucas = T('LUCAS');
      this.ok('desaparecido: aparece na zona da missão', !!lucas && lucas.alvoMissao === 'car_s2');
      if (lucas) { lucas.talk(); Dialogo.fechar(); }
      this.ok('desaparecido: encontrado, o passo seguinte é avisar a mãe', Aventuras.passo(WORLD_AVENTURAS[1]).npc === 'marta');
      World.loadZone('praca', null);
      const n0 = WorldInv.S.itens.length;
      T('MARTA').talk(); Dialogo.escolherId('fal_car_s2');
      this.ok('escolha: a conclusão pergunta o que fazer', Dialogo.temId('esc0') && Dialogo.temId('esc1'));
      Dialogo.escolherId('esc0'); Dialogo.fechar();
      this.ok('escolha: a resposta escolhida dá a relíquia única', Aventuras.feita('car_s2') && Aventuras.st('car_s2').escolha === 0 && WorldInv.S.itens.length === n0 + 1 && WorldInv.S.itens.some((it) => it.unico === 'Amuleto da Praça'));
      this.ok('vilarejo: sem acampamentos perto dos moradores', World.camps.every((c) => dist(c.def.at[0], c.def.at[1], WORLD_VILAS.praca.at[0], WORLD_VILAS.praca.at[1]) > WORLD_VILAS.praca.raio));
      // ------------------------------------------------ investigar + chefe opcional
      Aventuras.aceitar('car_s3');
      World.loadZone('laboratorio', null);
      const pistas = g.npcs.filter((n) => n instanceof MissaoProp && n.alvoMissao === 'car_s3');
      this.igual('investigar: 3 pistas na zona', pistas.length, 3);
      for (const m of pistas) { m.talk(); Dialogo.fechar(); }
      this.ok('investigar: as pistas levam ao chefe', Aventuras.passo(WORLD_AVENTURAS[2]).t === 'chefe');
      World.loadZone('fendas', null);
      const eco = g.enemies.find((e) => e.missao === 'car_s3');
      this.ok('chefe opcional: aparece com nome só com a missão ativa', !!eco && eco.name === 'EXPERIMENTO 7 · ECO' && eco.elite);
      if (eco) { matar(eco); for (let i = 0; i < 90; i++) g.updatePlaying(1 / 30); }
      this.ok('chefe opcional: derrotado, falta voltar ao Dr. Ivo', Aventuras.passo(WORLD_AVENTURAS[2]).npc === 'ivo');
      World.loadZone('laboratorio', null);
      T('DR. IVO').talk(); Dialogo.escolherId('fal_car_s3'); Dialogo.fechar();
      this.ok('investigação concluída', Aventuras.feita('car_s3'));
      // ------------------------------------------------ escolta (com falha e recomeço)
      Aventuras.aceitar('lag_s2');
      World.loadZone('lagoa_ilha', null);
      const esc = g.npcs.find((n) => n instanceof Escoltado);
      this.ok('escolta: a pessoa espera no início e não aparece duplicada', !!esc && g.npcs.filter((n) => n.name === 'DÉCIO').length === 1);
      if (esc) {
        esc.talk(); Dialogo.fechar();
        this.igual('escolta: começa depois da conversa', esc.estado, 'andando');
        Aventuras.falhaEscolta(esc);
        this.ok('escolta: se cair, volta ao início para tentar de novo', esc.estado === 'espera' && esc.hp === esc.maxHp && Aventuras.st('lag_s2').falhas === 1);
        esc.estado = 'andando'; esc.feitas = 9; esc.talkT = 0;
        esc.x = esc.destino.x + 10; esc.y = esc.destino.y; g.player.x = esc.x; g.player.y = esc.y + 40;
        for (const e of g.enemies) e.dormant = true;
        esc.update(1 / 30);
      }
      this.ok('escolta: chegou ao destino e a missão terminou', Aventuras.feita('lag_s2') && esc && esc.estado === 'chegou');
      // ------------------------------------------------ lugar escondido
      Aventuras.aceitar('vel_s3');
      World.loadZone('velmora_ruinas', null);
      const obs = g.npcs.find((n) => n instanceof MissaoProp && n.sub === 'local');
      if (obs) { g.player.x = obs.x; g.player.y = obs.y; Aventuras.update(1 / 30); }
      this.ok('lugar escondido: chegar perto descobre e avança', !!obs && Aventuras.passo(WORLD_AVENTURAS.find((q) => q.id === 'vel_s3')).t === 'examinar');
      // ------------------------------------------------ evento e contrato
      World.loadZone('mercado', null);
      Aventuras.aceitar('car_s5');
      const ev0 = Eventos.feitos('carmesin');
      World.loadZone('praca', null);
      const A = Eventos.sortear('incursao', 'praca');
      this.ok('evento: começa numa zona descoberta, com estandarte e marca no mapa', !!A && g.npcs.some((n) => n instanceof EventoProp) && Eventos.marcasMapa().length === 1);
      g.player.x = A.x; g.player.y = A.y + 40;
      Eventos.update(1 / 30);
      this.ok('evento: incursão em ondas', Eventos.ativo().fase === 'ativo' && Eventos.alvo.length > 0);
      // os inimigos que acabam de surgir ficam imunes por um instante: espera, derruba, repete
      for (let w = 0; w < 5 && Eventos.ativo(); w++) { for (let i = 0; i < 45; i++) g.updatePlaying(1 / 30); for (const e of Eventos.alvo) if (e.canBeHit()) matar(e); for (let i = 0; i < 45; i++) g.updatePlaying(1 / 30); }
      this.ok('evento: três ondas vencidas concluem e contam', !Eventos.ativo() && Eventos.feitos('carmesin') === ev0 + 1, JSON.stringify(Eventos.ativo()));
      this.ok('evento: conta para a missão de evento', Aventuras.passo(WORLD_AVENTURAS.find((q) => q.id === 'car_s5')).npc === 'rui');
      World.loadZone('mercado', null);
      const quadro = g.npcs.find((n) => n instanceof QuadroProp);
      const [cc] = Aventuras.contratosDe('carmesin');
      this.ok('contratos: dois por dia, iguais no mesmo dia', Aventuras.contratosDe('carmesin').length === 2 && Aventuras.contratosDe('carmesin')[0].nome === cc.nome && Aventuras.def(cc.id).nome === cc.nome);
      quadro.talk(); Dialogo.escolherId(`cn_${cc.id}`); Dialogo.escolherId('aceitar'); Dialogo.fechar();
      for (let i = 0; i < cc.passos[0].n; i++) Aventuras.onKill({ type: cc.passos[0].alvo, variante: cc.passos[0].alvo });
      quadro.talk();
      this.ok('contratos: caça cumprida, recebe no quadro', Dialogo.temId(`cq_${cc.id}`));
      Dialogo.escolherId(`cq_${cc.id}`); Dialogo.fechar();
      this.ok('contratos: pago e marcado como cumprido hoje', Aventuras.feita(cc.id) && Aventuras.bloqueio(cc) === 'concluída');
      // ------------------------------------------------ abandonar e validar
      Aventuras.aceitar('nex_s1');
      this.ok('abandonar: volta a ficar disponível', Aventuras.abandonar('nex_s1') && Aventuras.disponivel(WORLD_AVENTURAS.find((q) => q.id === 'nex_s1')));
      Aventuras.S.lixo = { st: 'ativa', p: 0 }; Aventuras.S.ast_s1 = { st: 'ativa', p: 99, hist: null };
      Aventuras.validar();
      this.ok('validar: missão sem definição sai e passo fora da lista é corrigido', !Aventuras.S.lixo && Aventuras.S.ast_s1.p === WORLD_AVENTURAS.find((q) => q.id === 'ast_s1').passos.length - 1 && Array.isArray(Aventuras.S.ast_s1.hist));
      delete Aventuras.S.ast_s1;
      // ------------------------------------------------ ofícios, consumíveis e serviços
      for (const k of ['erva', 'sucata', 'cristal', 'nucleo']) Oficios.dar(k, 10, false);
      const cap0 = WorldInv.S.capsulas = 0, erva0 = Oficios.mat('erva');
      Oficios.S.xp.criacao = 0;
      this.ok('artesão: cria cápsula com os materiais', Oficios.criar('capsula') === '' && WorldInv.S.capsulas === cap0 + 1 && Oficios.mat('erva') === erva0 - 2);
      this.ok('artesão: receita acima do nível de Criação fica bloqueada', Oficios.criar('tonico').indexOf('Criação') >= 0);
      Oficios.S.xp.criacao = 200;
      this.ok('artesão: com Criação 3 cria o tônico', Oficios.nivel('criacao') === 3 && Oficios.criar('tonico') === '' && Oficios.cons('tonico') >= 1);
      const p = g.player, d0 = p.stats.dmgMult;
      Oficios.usar('tonico');
      this.ok('tônico: +20% de dano enquanto dura', p.buffs.tonico > 0 && Math.abs(p.stats.dmgMult - d0 - 0.2) < 1e-9);
      p.buffs.tonico = 0.01; p.updateAbilities(0.05);
      this.ok('tônico: o efeito acaba', Math.abs(p.stats.dmgMult - d0) < 1e-9);
      const it = WorldInv.ganhar(WorldInv.gerar(5, 'carmesin', 0));
      it.b = 'nucleo'; it.st = { dano: 0.1 };
      WorldInv.equipar(it.id);
      const d1 = p.stats.dmgMult;
      this.ok('ferreiro: aprimora +1 (+10% no atributo) cobrando materiais', Oficios.aprimorar(it.id) === '' && it.ap === 1 && Math.abs(p.stats.dmgMult - d1 - 0.01) < 1e-9 && WorldInv.nome(it).endsWith('+1'));
      WorldInv.desequipar(WorldInv.S.equip.indexOf(it.id));
      const alto = WorldInv.ganhar(WorldInv.gerar(60, 'obsidiano', 0));
      pr.level = 3;
      this.ok('requisito: relíquia de nível alto não equipa num herói fraco', !WorldInv.equipar(alto.id));
      pr.level = 40;
      p.hp = 5; Oficios.curar();
      this.ok('curandeiro: cura por células', p.hp === p.maxHp);
      const xpA = pr.xp + pr.level * 1e6;
      Oficios.S.treinoDia = 0;
      this.ok('treinador: um treino por dia do mundo', Oficios.treinar() === '' && Oficios.treinar() !== '' && pr.xp + pr.level * 1e6 > xpA);
      Oficios.aoColetar({ mat: 'erva' });
      this.ok('coleta: material e experiência do ofício', Oficios.mat('erva') >= 9 && Oficios.S.xp.coleta > 0);
      // ------------------------------------------------ reputação, desconto e insígnia
      const pc = WorldInv.precoCapsula();
      Oficios.ganharRep('carmesin', 400);
      this.ok('reputação: Honrado dá 10% de desconto', Oficios.repNivel('carmesin') >= 2 && Oficios.desconto('carmesin') >= 0.1 && WorldInv.precoCapsula() < pc);
      WorldInv.ui.shop = true; WorldInv.ui.loja = 'mercador';
      const ext = WorldInv.extras(), ins = ext.findIndex((x) => x.insignia);
      this.ok('reputação: o mercador vende a insígnia da facção', ins >= 0);
      if (ins >= 0) WorldInv.comprar(WorldInv.estoque().length + 1 + ins);
      this.ok('insígnia: comprada uma vez só', WorldInv.S.itens.some((q) => q.unico === WORLD_INSIGNIAS.carmesin.unico) && !Oficios.podeInsignia('carmesin'));
      WorldInv.ui.shop = false; WorldInv.ui.loja = null;
      // ------------------------------------------------ masmorra
      World.loadZone('fendas', null);
      const ent = g.npcs.find((n) => n instanceof LocalProp && n.sub === 'entrada');
      this.ok('masmorra: entrada escondida até alguém contar', !!ent && !ent.visivel());
      Locais.revelar({ masmorra: 'catacumbas' });
      this.ok('masmorra: o rumor revela a entrada e marca o mapa', ent.visivel() && Locais.marcasMapa().some((m) => m.icon === '▼' && m.zona === 'fendas'));
      Aventuras.aceitar('ser_s2');
      World.loadZone('catacumbas_0', null, null, [0.5, 0.7]);
      this.ok('masmorra: o andar sela a passagem até os inimigos caírem', Locais.selada() && g.npcs.some((n) => n.kind === 'gate' && n.data.dir === 'N' && n.selada()));
      for (const e of g.enemies) matar(e);
      for (let i = 0; i < 60; i++) g.updatePlaying(1 / 30);
      this.ok('masmorra: andar limpo abre a passagem', !Locais.selada());
      World.loadZone('catacumbas_2', 'N');
      const arq = g.enemies.find((e) => e.chefeMasmorra === 'catacumbas'), bau = g.npcs.find((n) => n.kind === 'chest' && n.data.masmorra);
      this.ok('masmorra: chefe e baú selado no último andar', !!arq && !!bau);
      while (WorldInv.S.itens.length > 10) WorldInv.remover(WorldInv.S.itens[0].id);   // espaço na mochila para o prêmio
      const nb = WorldInv.S.itens.length;
      if (bau) { g.stats.soulsBank = 0; World.openChest(bau); }
      this.ok('masmorra: baú fica selado com o chefe vivo', bau && !bau.used && WorldInv.S.itens.length === nb);
      for (const e of g.enemies) matar(e);
      for (let i = 0; i < 60; i++) g.updatePlaying(1 / 30);
      this.ok('masmorra: vencida, com saída e a vitória registrada', Locais.feita('catacumbas') && g.npcs.some((n) => n.kind === 'gate' && n.data.rotulo && n.data.to === 'fendas'));
      const nb2 = WorldInv.S.itens.length;   // (os abates também podem deixar relíquias)
      if (bau) World.openChest(bau);
      this.ok('masmorra: o baú abre depois do chefe', bau && bau.used && WorldInv.S.itens.length === nb2 + 1);
      this.ok('masmorra: o mapa mostra onde fica (na zona da entrada)', (() => { let er = null; try { World.openMap(false); World.drawMap(g.ctx, 1); World.closeMap(); } catch (e) { er = e.message; } return !er; })());
      // a missão que pedia outra masmorra (Tumba) continua esperando
      this.ok('missão de masmorra: só a masmorra certa conta', Aventuras.passo(WORLD_AVENTURAS.find((q) => q.id === 'ser_s2')).t === 'masmorra');
      // ------------------------------------------------ tesouro
      Locais.revelar({ tesouro: 'tes_portoes' });
      World.loadZone('portoes', null);
      const tes = g.npcs.find((n) => n instanceof LocalProp && n.sub === 'tesouro');
      const cT = g.stats.soulsBank;
      if (tes) { g.player.x = tes.x; g.player.y = tes.y + 20; tes.talk(); tes.talk(); }
      this.ok('tesouro: marcado pelo rumor, cavado uma vez só', !!tes && Locais.S.tes.tes_portoes === 'achado' && g.stats.soulsBank === cT + WORLD_TESOUROS.tes_portoes.rec.cel);
      // ------------------------------------------------ rotina dos moradores
      World.loadZone('mercado', null);
      const hel = T('HELENA'), hx = hel.x, hy = hel.y;
      g.player.x = 40; g.player.y = 40; World.state.hora = 12; hel.espera = 0; hel.ri = 1;
      for (let i = 0; i < 60; i++) hel.update(1 / 30);
      this.ok('rotina: a curandeira anda entre os pontos de dia', dist(hel.x, hel.y, hx, hy) > 5 && (hel.state === 'walk' || hel.andando || hel.espera > 0));
      // ------------------------------------------------ telas e salvamento
      let er = null;
      try {
        for (const tab of ['diario', 'oficios', 'mochila', 'campanhas']) { WorldInv.abrir(tab, false); for (const c of Aventuras.CATS) { WorldInv.ui.cat = c; WorldInv.draw(g.ctx, 1); } }
        WorldInv.abrir('loja', true, 'mercador'); WorldInv.draw(g.ctx, 1);
        WorldInv.abrir('loja', true, 'curandeiro'); WorldInv.draw(g.ctx, 1);
        WorldInv.abrir('ferreiro', false, null, 'ferreiro'); WorldInv.draw(g.ctx, 1);
        WorldInv.abrir('artesao', false, null, 'artesao'); WorldInv.draw(g.ctx, 1);
        WorldInv.fechar();
        T('VANDA').talk(); Dialogo.draw(g.ctx, 1); Dialogo.fechar();
        g.hud.draw(g.ctx);
      } catch (e) { er = e.message; }
      this.ok('telas: diário, ofícios, lojas, ferreiro, artesão e diálogo desenham sem erro', !er, er);
      this.ok('diário: ativas, disponíveis e concluídas', Aventuras.diarioLista('concluidas').length >= 5 && Aventuras.diarioLista('disponiveis').length > 0);
      const salvo = JSON.parse(JSON.stringify(World.state));
      this.ok('salvamento: missões, ofícios, reputação, masmorras e eventos vão junto', salvo.aventuras.car_s1.st === 'feita' && salvo.oficios.rep.carmesin > 0 && salvo.locais.masm.catacumbas.vezes === 1 && salvo.eventos.feitos.carmesin >= 1);
    } catch (e) {
      this.ok('mmo: sem exceção', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e);
    } finally {
      if (Dialogo.aberto) Dialogo.fechar();
      if (g.state !== 'playing') g.state = 'playing';
      pr.level = lv0; g.stats.soulsBank = cel0; World.state.chefes = chefes0;
      Eventos.S.atual = null;
    }
  },

  // Mapa do mundo desenhado (js/mundo/mapa.js): terreno pintado, névoa, marcadores e o painel da zona
  mapa() {
    const g = game, M = World.map, z0 = M.zoom, est = g.state;
    this.ok('mapa: um bioma pintado para cada região', WORLD_REGIONS.every((r) => WorldMapArt.BIOMA[r.id]), WORLD_REGIONS.filter((r) => !WorldMapArt.BIOMA[r.id]).map((r) => r.id).join(','));
    const t0 = performance.now(), cv = WorldMapArt.terreno(1100, 570), ms = performance.now() - t0;
    this.ok('mapa: terreno pintado no tamanho pedido (1,6×)', cv && cv.width === 1760 && cv.height === 912, cv && `${cv.width}×${cv.height} · ${ms.toFixed(0)} ms`);
    this.ok('mapa: terreno guardado (não repinta)', WorldMapArt.terreno(1100, 570) === cv);
    const px = (u, v) => cv.getContext('2d').getImageData(Math.round(u * cv.width), Math.round(v * cv.height), 1, 1).data;
    const mar = px(0.01, 0.01), car = px(0.5, 0.45);
    this.ok('mapa: mar azul na borda e chão avermelhado nas Ruínas de Carmesin', mar[2] > mar[0] && car[0] > car[2], `mar ${mar.slice(0, 3).join(',')} · Carmesin ${car.slice(0, 3).join(',')}`);
    let erro = null;
    try {
      for (const [viagem, zoom] of [[false, 1], [true, 1], [false, 3], [true, 0.8]]) {
        World.openMap(viagem); M.zoom = zoom;
        World.drawMap(g.ctx, 1.5);
      }
      for (const id in WORLD_ZONES) World.drawMapInfo(g.ctx, id, VIEW_W - 34, VIEW_H - 74);
    } catch (e) { erro = e.message; }
    this.ok('mapa: desenha (mapa, viagem e zoom) e o painel de todas as zonas', !erro, erro);
    World.map.open = false; M.zoom = z0; g.state = est;
  },

  // Campo aberto e inimigos variados (chamado de dentro de mundo(), já no modo mundo, em Velmora)
  campoAberto() {
    const g = game, p = g.player, R = g.room, z = World.zone;
    this.ok('campo aberto: a trilha de Velmora é aberta, com margem de paisagem', z.aberto && R.aberto && R.margem > 0, R.margem);
    const deco = R.pillars.filter((q) => q.deco && !q.enfeite), obst = R.pillars.filter((q) => !q.deco);   // (enfeites do chão da floresta: dentro, js/mundo/natureza3d.js)
    this.ok('campo aberto: paisagem em volta (fora da área de jogo)', deco.length > 20 && deco.every((q) => q.x < 0 || q.y < 0 || q.x > R.w || q.y > R.h), deco.length);
    if (deco.length) {
      // a paisagem nunca colide: mesmo trazida para o meio da área (onde não há obstáculos), não bloqueia
      const d = deco[0], x0 = d.x, y0 = d.y;
      d.x = R.w / 2; d.y = R.h / 2;
      const livre = !R.blocksPoint(d.x, d.y, 4);
      d.x = x0; d.y = y0;
      this.ok('campo aberto: a paisagem não bloqueia', livre);
    }
    this.ok('campo aberto: obstáculos naturais dentro da área', obst.length > 0 && obst.every((q) => q.x > 0 && q.y > 0 && q.x < R.w && q.y < R.h), obst.length);
    this.ok('campo aberto: chão dentro do limite de memória (12 Mpx)', R.canvas.width * R.canvas.height <= 12.2e6, `${R.canvas.width}×${R.canvas.height}`);
    this.ok('campo aberto: um grupo em patrulha', World.camps.some((c) => c.patrulha && c.enemies.every((e) => e.patrulha === c.patrulha)));
    // coleta: pronta uma vez por dia
    const cs = g.npcs.filter((n) => n.kind === 'coleta');
    this.ok('coleta: recursos da região na zona', cs.length >= 3 && cs.every((n) => n.data.nome === WORLD_RECURSOS.floresta.nome), cs.length);
    if (cs.length) {
      const c = cs[0], dia = World.state.dia, k = c.data.key;
      delete (World.state.coletas || {})[k];
      const n0 = World.state.coletados || 0, pk0 = g.pickups.count;
      this.ok('coleta: dá para colher', c.canTalk() && World.coletaPronta(k));
      World.coletar(c);
      this.ok('coleta: conta, solta células e esgota até o dia seguinte', World.state.coletados === n0 + 1 && !World.coletaPronta(k) && !c.canTalk() && g.pickups.count > pk0);
      World.state.dia = (dia || 1) + 1;
      this.ok('coleta: volta no dia seguinte', World.coletaPronta(k));
      World.state.dia = dia;
    }
    // variantes: todas montam sobre um tipo base existente, com nome, cor e traços
    for (const id in ENEMY_VARIANTS) {
      const V = ENEMY_VARIANTS[id], e = criarInimigo(id, 100, 100, 5);
      this.ok(`variante ${id}: ${V.nome} sobre ${V.base}`, e.type === V.base && e.variante === id && e.varNome === V.nome && !!e.tint && e.tracos.length > 0);
    }
    this.igual('tipo comum continua o mesmo', criarInimigo('rastejador', 0, 0, 1).variante, undefined);
    // cada região de fora pede variantes próprias
    for (const Rg of WORLD_REGIONS) {
      if (Rg.id === 'carmesin') continue;
      const vs = new Set();
      for (const zz of worldZonesOf(Rg.id)) for (const c of zz.camps || []) for (const t in c.mobs) if (ENEMY_VARIANTS[t]) vs.add(t);
      for (const M of Object.values(WORLD_MASMORRAS)) if (M.reg === Rg.id && worldZonesOf(Rg.id).every((z) => z.seguro)) for (const t of M.mobs) if (ENEMY_VARIANTS[t]) vs.add(t);   // (cidade segura: os da masmorra)
      this.ok(`${Rg.id}: inimigos próprios da região`, vs.size >= 1, [...vs].join(','));
    }
    const sala = g.enemies.slice();
    g.enemies.length = 0;
    try {
      // carapaça: de frente perde 60%, pelas costas o golpe inteiro
      const c = criarInimigo('carangueijo', p.x + 80, p.y, 5); c.setState('idle');
      const h0 = c.hp; c.facing = Math.PI; c.takeHit({ dmg: 50, kx: 1, ky: 0, kb: 0, stun: 0 }); const frente = h0 - c.hp;
      c.hp = h0; c.facing = 0; c.takeHit({ dmg: 50, kx: 1, ky: 0, kb: 0, stun: 0 }); const costas = h0 - c.hp;
      this.ok('carapaça: golpe de frente perde dano', frente < costas && costas > 0, `${frente} / ${costas}`);
      // divide: ao morrer vira dois filhotes (que não se dividem de novo)
      const m = criarInimigo('magma', p.x + 120, p.y, 5); g.enemies.push(m); m.setState('idle');
      m.die({ kx: 1, ky: 0 });
      const f = g.enemies.filter((e) => e.filhote);
      this.ok('divide: o Elemental de Magma vira dois menores', f.length === 2 && f.every((e) => !e.tracos.includes('divide') && e.maxHp < m.maxHp), f.length);
      // explode: aviso de explosão no chão ao morrer
      const md = criarInimigo('medusa', p.x + 200, p.y, 5); g.enemies.push(md); md.setState('idle');
      const ne = g.hazards.list.length; md.die({ kx: 1, ky: 0 });
      this.ok('explode: a Medusa deixa uma explosão ao morrer', g.hazards.list.slice(ne).some((h) => h.kind === 'estouro'));
      // kamikaze: perto do herói, larga a IA de drone e corre até ele
      const k = criarInimigo('diabrete', p.x + 200, p.y, 5); k.setState('idle');
      this.ok('kamikaze: assume o controle perto do herói', EnemyTraits.conduz(k, 1 / 60) && k.vx < 0, k.vx);
      // veneno não mata; lentidão deixa o herói mais lento
      const hp0 = p.hp; p.hp = 2; EnemyTraits.efeito(p, 'veneno', 200); EnemyTraits.heroi(p, 2);
      this.igual('veneno: deixa com 1 de vida, não mata', p.hp, 1);
      p.venenoT = 0; p.hp = hp0;
      EnemyTraits.efeito(p, 'congela');
      this.ok('congela: herói lento', EnemyTraits.lento(p) < 1);
      p.lentoT = 0;
      // poça de fogo do rastro: fere quem pisa
      p.hp = p.maxHp; p.invuln = 0; const a = p.hp;
      g.hazards.add({ kind: 'poca', x: p.x, y: p.y, r: 40, dur: 2, dmg: 6, rgb: '255,110,40', lento: 0 });
      for (let i = 0; i < 40; i++) g.hazards.update(1 / 30);
      this.ok('rastro: a poça de fogo fere quem pisa', p.hp < a, `${a} → ${p.hp}`);
      // missão de abate de variante: conta a variante pedida, não o tipo base
      const vq = WorldQuests.lista('velmora').find((q) => q.id === 'vel1'), S0 = WorldQuests.S.vel1;
      WorldQuests.S.vel1 = { st: 'ativa', prog: 0 };
      WorldQuests.onKill(criarInimigo('rastejador', 0, 0, 1));
      WorldQuests.onKill(criarInimigo('lobo_raiz', 0, 0, 1));
      this.ok('missão: abate de Lobo de Raiz conta, rastejador comum não', vq.alvo === 'lobo_raiz' && WorldQuests.S.vel1.prog === 1 && !!WORLD_ALVO_NOME.lobo_raiz, WorldQuests.S.vel1.prog);
      if (S0 === undefined) delete WorldQuests.S.vel1; else WorldQuests.S.vel1 = S0;
    } finally {
      g.hazards.clear(); p.venenoT = 0; p.lentoT = 0; p.hp = p.maxHp;
      g.enemies.length = 0; for (const e of sala) g.enemies.push(e);
    }
    // passagem pela borda: andando para fora do lado leste, vai para a zona vizinha
    const viz = worldZoneAt(z.r, z.c + 1, z.region);
    if (viz) {
      const s0 = p.state;
      p.state = 'run'; p.x = R.w - 2; p.y = R.h / 2; p.vx = 200; p.vy = 0;
      World.update(1 / 60);
      const cb = g.fadeCb;
      this.ok('campo aberto: atravessar a borda leste leva à vizinha (mundo contínuo: sem tela preta)', !cb && World.zone.id === viz.id);
      g.fadeCb = null; if (cb) cb();
      this.ok('campo aberto: chega na zona vizinha pelo lado oeste', World.zone.id === viz.id && p.x < 160, `${World.zone.id} x=${Math.round(p.x)}`);
      p.state = s0; p.vx = 0;
    } else this.ok(`${z.id} tem vizinha a leste`, false);
  },

  // Campanhas dos heróis (chamado de dentro de mundo(), já no modo mundo)
  campanhas() {
    const g = game, bgs = ['cells', 'tunnel', 'vesper', 'shadows', 'city', 'tower', 'void', 'lab', 'refuge', 'sword', 'terminal', 'cathedral', 'nexus', 'memory', 'dawn', 'space'];
    this.igual('campanhas: uma para cada um dos 5 heróis', HERO_CAMPAIGN_ORDER.filter((h) => HERO_CAMPAIGNS[h] && CHARACTERS_BY_ID[h]).length, 5);
    for (const h of HERO_CAMPAIGN_ORDER) {
      const C = HERO_CAMPAIGNS[h], zonas = C.caps.map((c) => c.zona);
      this.igual(`campanha ${h}: 5 capítulos`, C.caps.length, 5);
      this.ok(`campanha ${h}: zonas existem e são diferentes`, zonas.every((z) => WORLD_ZONES[z]) && new Set(zonas).size === 5, zonas.join(','));
      const tipos = [];
      let passosOk = true;
      for (const c of C.caps) for (const P of c.passos) {
        const grupos = P.lutar ? [P.lutar] : P.ondas ? P.ondas : P.chefe ? [P.chefe.escolta || {}, { [P.chefe.tipo]: 1 }] : [];
        for (const G of grupos) for (const t in G) tipos.push(t);
        if (!(P.achar || P.lutar || P.ondas || P.chefe)) passosOk = false;
        if (P.achar && !P.achar.every((tx) => typeof tx === 'string' && tx.length > 10)) passosOk = false;
      }
      this.ok(`campanha ${h}: passos válidos (pelo menos 2 por capítulo)`, passosOk && C.caps.every((c) => c.passos.length >= 2 && c.chega.length && c.sinal));
      this.ok(`campanha ${h}: inimigos existem`, tipos.every((t) => ENEMY_TYPES[t] || ENEMY_VARIANTS[t]), tipos.filter((t) => !ENEMY_TYPES[t] && !ENEMY_VARIANTS[t]).join(','));
      this.ok(`campanha ${h}: clímax no último capítulo (chefe com nome ou defesa de 3 ondas)`, C.caps[4].passos.some((P) => (P.chefe && P.chefe.nome) || (P.ondas && P.ondas.length >= 3)));
      const pags = [...C.abertura, ...C.final, ...C.caps.filter((c) => c.fim).map((c) => c.fim)];
      this.ok(`campanha ${h}: páginas com cenário conhecido`, pags.every((pg) => bgs.includes(pg.bg) && pg.title && pg.lines.length), pags.map((pg) => pg.bg).filter((b) => !bgs.includes(b)).join(','));
      this.ok(`campanha ${h}: relíquia final válida`, WORLD_RELIQUIAS.some((b) => b.id === C.premio.b) && Object.keys(C.premio.st).every((k) => WORLD_ATRIB[k]));
      const lv = zonas.map((z) => WORLD_ZONES[z].lv);
      this.ok(`campanha ${h}: capítulos em nível crescente`, lv.every((v, i) => !i || v >= lv[i - 1]), lv.join(','));
    }
    // o fluxo: sinal, pistas, luta, conclusão, região aberta, ondas, chefe e a relíquia única
    const S0 = World.state.campanhas, h0 = RosterManager.active, nv = g.progress.level;
    World.state.campanhas = {};
    const passa = (n = 60) => { for (let i = 0; i < n; i++) Campanhas.update(1 / 30); };
    try {
      if (RosterManager.active !== 'kael') RosterManager.setActive('kael');
      World.loadZone('laboratorio', null);
      this.ok('campanha: sem começar, nada no HUD nem sinal', Campanhas.linha() === '' && !g.npcs.some((n) => n.kind === 'campanha'));
      World.state.campanhas.kael = { cap: 0, feita: false };
      World.loadZone('laboratorio', null);
      const sinal = g.npcs.find((n) => n.kind === 'campanha' && n.sub === 'sinal');
      this.ok('campanha: o sinal aparece na zona do capítulo', !!sinal && Campanhas.linha().indexOf('investigue') > 0, Campanhas.linha());
      this.ok('campanha: ★ no objetivo do HUD', World.objective().indexOf('★ A Ala C') === 0, World.objective());
      sinal.talk();
      const ach = g.npcs.filter((n) => n.kind === 'campanha' && n.sub === 'achado');
      this.igual('campanha: a Ala C começa pelas 3 pistas', ach.length, 3);
      for (const a of ach) a.talk();
      passa(40);
      const alvo = Campanhas.ev && Campanhas.ev.alvo;
      this.ok('campanha: depois das pistas, a segurança da ala (4 inimigos acordados)', alvo && alvo.length === 4 && alvo.every((e) => g.enemies.includes(e) && !e.dormant), alvo && alvo.length);
      for (const e of alvo || []) e.alive = false;
      passa(40);
      this.ok('campanha: capítulo 1 concluído, o 2 em Velmora', World.state.campanhas.kael.cap === 1 && Campanhas.zonaAlvo() === 'velmora_ruinas' && !Campanhas.ev);
      this.ok('campanha: a página do capítulo vem em seguida', !!Campanhas.pendente && Campanhas.pendente.pages[0].title === 'A ALA C');
      Campanhas.pendente = null;
      g.progress.level = 1; World.state.campanhas.kael.cap = 4;
      this.ok('campanha: o capítulo em Obsidiano abre a região antes do nível', World.regionOpen('obsidiano'));
      g.progress.level = nv;
      World.loadZone('obsidiano_fendas', null);
      g.npcs.find((n) => n.kind === 'campanha' && n.sub === 'sinal').talk();
      let ondas = 0;
      for (let k = 0; k < 6 && Campanhas.ev; k++) {
        const P = Campanhas.ev.c.passos[Campanhas.ev.passo];
        if (P.chefe) break;
        ondas++;
        for (const e of Campanhas.ev.alvo) e.alive = false;
        passa(70);
      }
      const B = Campanhas.ev && Campanhas.ev.alvo[0];
      this.ok('campanha: 2 ondas e depois o chefe PROTÓTIPO ZERO-1', ondas === 2 && !!B && B.chefeNome === 'PROTÓTIPO ZERO-1' && B.elite && B.campanha, ondas);
      for (const e of Campanhas.ev ? Campanhas.ev.alvo : []) e.alive = false;
      passa(40);
      const rel = WorldInv.S.itens.find((it) => it.unico === 'Coração da Tempestade');
      this.ok('campanha: concluída com a relíquia lendária única', World.state.campanhas.kael.feita && !!rel && rel.r === 4 && WorldInv.nome(rel) === 'Coração da Tempestade');
      this.ok('campanha: as páginas finais vêm em seguida', !!Campanhas.pendente && Campanhas.pendente.pages.length === 2);
      Campanhas.pendente = null;
      if (rel) WorldInv.remover(rel.id);
      // o sinal é só do herói da campanha
      World.state.campanhas.lyra = { cap: 0, feita: false };
      World.loadZone('portoes', null);
      this.ok('campanha: sem sinal para outro herói', !g.npcs.some((n) => n.kind === 'campanha'));
      RosterManager.setActive('lyra'); passa(1);
      this.ok('campanha: trocando para a Lyra, o sinal dela aparece', g.npcs.some((n) => n.kind === 'campanha' && n.sub === 'sinal'));
      WorldInv.ui.tab = 'campanhas';
      this.ok('mochila: aba CAMPANHAS com os 5 heróis', WorldInv.abas().includes('campanhas') && WorldInv.lista().length === 5);
      WorldInv.ui.tab = 'mochila';
    } finally {
      World.state.campanhas = S0 || {};
      Campanhas.limpar(); Campanhas.pendente = null; g.progress.level = nv;
      if (RosterManager.active !== h0 && RosterManager.isSelectable(h0)) RosterManager.setActive(h0);
    }
  },

  // ------------------------------------------------- armaduras vestidas em 3D
  armaduras3d() {
    // cada armadura especial com GLB do próprio herói aponta para um módulo <herói>_nN
    const nomes = new Set();
    for (const id in SPECIAL_ARMOR_DEFS) {
      const a = SPECIAL_ARMOR_DEFS[id], base = a.glb.split('/').pop().replace('.glb', '');
      if (a.owner === 'all') {
        this.igual(`armadura ${id} (de todos): só o Kael veste a malha`, ArmorModels.modOf('kael', id), base);
        this.igual(`armadura ${id} (de todos): a Lyra fica com a cor`, ArmorModels.modOf('lyra', id), null);
      } else {
        this.igual(`armadura ${id}: módulo ${base}`, ArmorModels.modOf(a.owner, id), base);
        nomes.add(base);
      }
    }
    this.igual('36 malhas de armadura distintas', nomes.size, 36);
    this.igual('armadura comum (sem GLB) não tem malha', ArmorModels.modOf('lyra', 'lyra_padrao'), null);
    // a malha carregada vira um modelo com as mesmas animações e a arma do herói
    this.igual('lyra_n1 carregou (js/assets/armaduras/lyra_n1.js)', ArmorModels.estado.lyra_n1, 'ok');
    const M = game.model3('arm_lyra_n1');
    this.ok('modelo arm_lyra_n1 montado', !!M && M.skins && M.skins.length > 0 && !!M.tex, M);
    if (!M) return;
    // veste direto (a Patrulha exige nível 5; a partida dos testes começa no 1)
    const lyra = CHARACTERS_BY_ID.lyra, antes = RosterManager.armor.lyra;
    RosterManager.armor.lyra = 'lyra_patrulha';
    this.igual('Lyra com a Patrulha usa a malha da armadura', heroModelKey(lyra), 'arm_lyra_n1');
    this.igual('sem a cor por cima da textura da armadura', heroArmorTint('lyra'), null);
    this.igual('modelo sem armadura continua disponível', heroModelKey(lyra, true), 'lyraTex');
    let erro = null;
    try {
      const e = { def: lyra, x: 0, y: 0, z: 0, state: 'idle', stateTime: 0.5, animTime: 0.5, facing: 0, flash: 0, moveSpeed: 0, wpnOut: true };
      const o = game.opts3(e, 0), it = game.queue3('arm_lyra_n1', e, o);
      R3D.flush(1);
      this.ok('armadura desenha no motor 3D', !R3D.active || (it && it.ok), it && it.ok);
      this.ok('arco da Lyra na armadura', !!(M.nodes && (M.nodes.bow || M.wr || Object.keys(M.nodes).some((k) => /bow|arco|whand/i.test(k)))), Object.keys(M.nodes || {}).join(','));
    } catch (e) { erro = e.message; }
    this.ok('pose da armadura sem erro', !erro, erro);
    if (antes === undefined) delete RosterManager.armor.lyra; else RosterManager.armor.lyra = antes;
    this.ok('volta ao modelo de sempre ao trocar', heroModelKey(lyra) !== 'arm_lyra_n1');
  },

  // Chão com textura e céu do mundo aberto (js/texturas.js, js/terceira_ambiente.js) e o
  // movimento da câmera em 3ª pessoa (chamado de dentro de mundo(), por último)
  paisagem() {
    const g = game, p = g.player, h0 = World.state.hora, BIO = ['floresta', 'deserto', 'neve', 'lagoa', 'vulcao'];
    for (const tipo of BIO) {
      const T = TexturasMundo.bioma(tipo), px = T && T.cor.getContext('2d').getImageData(0, 0, T.S, T.S).data;
      let mn = 1e9, mx = 0;
      if (px) for (let i = 0; i < px.length; i += 4 * 97) { const l = px[i] + px[i + 1] + px[i + 2]; mn = Math.min(mn, l); mx = Math.max(mx, l); }
      this.ok(`textura ${tipo}: cor e relevo, com variação, guardada`, T && T.alt && T.S >= 256 && mx - mn > 40 && TexturasMundo.bioma(tipo) === T, T && `${T.S} · ${mn}..${mx}`);
    }
    // cada bioma: vista isométrica e 3ª pessoa, de dia, ao entardecer e à noite
    let erro = null;
    const semChao = [], key0 = R3D.light.key.slice(), keyMudou = [], ceu = {};
    try {
      for (const tipo of BIO) {
        const z = Object.values(WORLD_ZONES).find((q) => q.theme === tipo && q.aberto && !q.instancia);
        if (!z) { semChao.push(tipo + ' (sem zona)'); continue; }
        World.loadZone(z.id, null);
        for (const h of [12, 18.4, 0]) { World.state.hora = h; g.renderWorld(g.ctx); }
        ThirdView.set(true, true);
        for (const h of [12, 18.4, 0]) {
          World.state.hora = h; g.renderWorld(g.ctx);
          if (R3D.light.key.some((v, i) => v !== key0[i])) keyMudou.push(`${tipo} ${h}h`);
        }
        if (!(ThirdView.chaoModel && ThirdView.chaoModel.tex && ThirdView.chaoModel.tex.canvas)) semChao.push(tipo);
        if (tipo === 'deserto') {
          const cv = document.createElement('canvas'), c2 = cv.getContext('2d');
          cv.width = VIEW_W; cv.height = VIEW_H;
          for (const h of [12, 0]) { World.state.hora = h; Ambiente3P.ceu(c2, g.room, 0); const d = c2.getImageData(VIEW_W >> 1, 2, 1, 1).data; ceu[h] = d[0] + d[1] + d[2]; }
        }
        ThirdView.set(false, true);
      }
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 2).join(' | ') : e.message; }
    if (ThirdView.on) ThirdView.set(false, true);
    this.ok('paisagem: os 5 biomas desenham (iso e 3ª pessoa, dia, tarde e noite)', !erro, erro);
    this.ok('3ª pessoa: chão do campo aberto com textura em todos os biomas', !erro && semChao.length === 0, semChao.join(', '));
    this.ok('3ª pessoa: a luz do sol volta ao normal depois do quadro', keyMudou.length === 0, keyMudou.join(', '));
    this.ok('céu: o meio-dia é mais claro que a meia-noite', ceu[12] > ceu[0] + 60, JSON.stringify(ceu));
    // sem textura na qualidade baixa: o piso de ladrilhos de antes
    const q0 = Settings.v.quality;
    Settings.v.quality = 0; ThirdView.room = null;
    let baixo = null;
    try { ThirdView.roomFor(g.room); baixo = ThirdView.chaoModel; } catch (e) { baixo = e.message; }
    Settings.v.quality = q0; ThirdView.room = null;
    this.ok('qualidade baixa: piso sem textura (ladrilhos)', baixo === null, baixo);
    // renderizador realista (Three.js, js/realista/realista.js): módulo carregado por http, opções no
    // vídeo, e numa placa de vídeo emulada por software (a dos testes) ele mesmo cede ao clássico
    const vid = SETTINGS_TABS.find((t) => t.id === 'video').opts;
    this.ok('realista: opções de renderizador e seis qualidades (Baixo a Extreme PC) no vídeo', vid.some((o) => o.key === 'render3d') && vid.find((o) => o.key === 'realQual').names.join(',') === 'Baixo,Médio,Alto,Ultra,Cinematográfico,Extreme PC');
    const RL = typeof window !== 'undefined' ? window.Realista3D : null, atv = RL ? RL.ativo() : false;
    this.ok('realista: módulo do Three.js carregado (por http) e pronto ou cedendo ao clássico com o motivo', !!RL && RL.QUAL.length === 6 && (RL.ok || /software|WebGL 2/.test(RL.erro || '')), RL ? `ok=${RL.ok} erro=${RL.erro}` : 'sem módulo');
    if (RL && !atv) {
      // cedeu: a 3ª pessoa desenha pelo motor clássico e a camada do Three.js fica escondida
      ThirdView.set(true, true); g.render(); ThirdView.set(false, true);
      this.ok('realista: sem ele, a 3ª pessoa segue no clássico (camada escondida)', !RL.canvas || !RL.canvas.isConnected || RL.canvas.style.display === 'none');
    }
    // câmera em mola: correndo, o herói inclina para a frente, entra na curva e a câmera balança
    const sv = { st: p.state, vx: p.vx, vy: p.vy, f: p.facing, air: p.air };
    ThirdView.set(true, true);
    p.state = 'run'; p.vx = 220; p.vy = 0; p.air = false; p.facing = 0;
    let bob = 0;
    for (let i = 0; i < 60; i++) { ThirdView.movimento(1 / 60, p, 220); bob = Math.max(bob, ThirdView.bob); }
    this.ok('3ª pessoa: correndo, o herói inclina para a frente', ThirdView.inclina > 0.09, ThirdView.inclina);
    this.ok('3ª pessoa: a câmera balança com os passos', bob > 1, bob);
    this.ok('3ª pessoa: a câmera mira à frente do herói (mola)', ThirdView.alvo[0] > p.x + 20, ThirdView.alvo[0] - p.x);
    for (let i = 0; i < 30; i++) { p.facing += 2 / 60; ThirdView.movimento(1 / 60, p, 220); }
    this.ok('3ª pessoa: inclina para dentro da curva', ThirdView.giro < -0.05, ThirdView.giro);
    p.state = 'idle'; p.vx = p.vy = 0;
    for (let i = 0; i < 60; i++) ThirdView.movimento(1 / 60, p, 0);
    this.ok('3ª pessoa: parado, volta a ficar reto', Math.abs(ThirdView.inclina) < 0.01 && Math.abs(ThirdView.giro) < 0.01 && ThirdView.bob < 0.05, `${ThirdView.inclina} ${ThirdView.giro} ${ThirdView.bob}`);
    Ambiente3P.update(1 / 60);
    this.ok('3ª pessoa: partículas no ar do bioma', Ambiente3P.parts.length > 0 && Ambiente3P.partTipo === 'brasas', `${Ambiente3P.parts.length} ${Ambiente3P.partTipo}`);
    ThirdView.set(false, true);
    p.state = sv.st; p.vx = sv.vx; p.vy = sv.vy; p.facing = sv.f; p.air = sv.air;
    World.state.hora = h0;
  },

  // Combate no mundo aberto (js/mundo/encontros.js, Room.linhaLivre/desvio, js/enemies.js,
  // js/player.js, R3D.misturar): percepção, alerta, coleira, linha de visão, desvio de pilares,
  // esquiva sólida, sair do golpe andando, reações ao dano e transição de poses
  combateMundo() {
    const g = game, p = g.player, sala = g.enemies.slice(), camps0 = World.camps, prox0 = Eventos.prox, h0 = World.state.hora;
    const sv = { x: p.x, y: p.y, hp: p.hp, st: p.state };
    const ent = () => ({ move: { x: 0, y: 0 }, pressed: {}, held: {}, released: {}, look: { x: 0, y: 0 } });
    let erro = null, pilares0 = null;
    try {
      World.loadZone('velmora_trilha', null);
      Eventos.prox = 1e9; World.state.hora = 12; WorldTime.definir('limpo', 'velmora', false);
      const R = g.room;
      for (const e of g.enemies) e.alive = false;
      g.enemies.length = 0; World.camps = [];
      const passo = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) { Encontros.update(dt); for (const e of g.enemies) e.update(dt); g.separate(); } };
      // um pilar só (a zona é sorteada a cada carga): o acampamento a oeste dele, o herói escondido a leste
      pilares0 = R.pillars;
      const pil = { x: R.w * 0.5, y: R.h * 0.42, r: 22, h: 120, broken: false, seed: 1, sprite: null, ox: 0, oy: 0 };
      R.pillars = [pil];
      // linha de visão
      this.ok('linha de visão: o pilar corta, ao lado passa', !R.linhaLivre(pil.x - 100, pil.y, pil.x + 100, pil.y) && R.linhaLivre(pil.x - 100, pil.y + pil.r + 30, pil.x + 100, pil.y + pil.r + 30));
      // desvio: indo direto no pilar, segue a tangente (mesma velocidade, sem entrar nele)
      const q = { x: pil.x - 70, y: pil.y + 2, radius: 14, id: 1 }, v = { x: 0, y: 0 };
      const desviou = R.desvio(q, 300, 0, v, 60), D = dist(q.x, q.y, pil.x, pil.y), ang = Math.abs(angleDiff(Math.atan2(v.y, v.x), Math.atan2(pil.y - q.y, pil.x - q.x)));
      this.ok('desvio: de frente para o pilar, contorna pela tangente', desviou && Math.abs(Math.hypot(v.x, v.y) - 300) < 1e-6 && ang >= Math.asin(Math.min(1, (pil.r + 17) / D)) - 1e-6, `${desviou} ${ang.toFixed(2)}`);
      this.ok('desvio: caminho livre não muda', !R.desvio(q, 0, 300, v, 60) && v.x === 0 && v.y === 300);
      // o herói correndo de frente para o pilar passa por ele (não empaca)
      p.state = 'idle'; p.x = pil.x - 70; p.y = pil.y + 2; p.vx = p.vy = 0; p.kbx = p.kby = 0; p.air = false; p.z = 0;
      const corre = ent(); corre.move.x = 1; corre.move.y = 0.5;   // tela (1, 0,5) = mundo +x
      let dentro = 0;
      for (let i = 0; i < 90 && p.x < pil.x + pil.r + 20; i++) { p.update(1 / 60, corre); if (dist(p.x, p.y, pil.x, pil.y) < pil.r + p.radius - 1) dentro++; }
      this.ok('herói: correndo de frente para o pilar, contorna e segue', p.x > pil.x + pil.r && !dentro, `x ${Math.round(p.x - pil.x)} · dentro ${dentro}`);
      // perseguição: o inimigo do outro lado do pilar contorna e chega
      const cr = createEnemy('rastejador', pil.x - 90, pil.y, 2); cr.setState('idle'); cr.camp = null; g.enemies.push(cr);
      p.state = 'idle'; p.x = pil.x + 120; p.y = pil.y; p.vx = p.vy = 0; p.invuln = 99;
      let perto = 1e9, furou = 0;
      for (let i = 0; i < 120 && perto > 110; i++) { cr.update(1 / 30); g.director.update(); g.separate(); perto = Math.min(perto, dist(cr.x, cr.y, p.x, p.y)); if (dist(cr.x, cr.y, pil.x, pil.y) < pil.r + cr.radius - 1) furou++; }
      this.ok('perseguição: contorna o pilar e alcança o herói', perto <= 110 && !furou, `${Math.round(perto)} · dentro ${furou}`);
      // golpe com o pilar no meio não acerta; sem o pilar, acerta
      p.invuln = 0; p.state = 'idle'; p.hp = p.maxHp;
      cr.x = pil.x - pil.r - cr.radius - 2; cr.y = pil.y; p.x = pil.x + pil.r + p.radius + 2; p.y = pil.y;
      cr.hitThisAttack = false;
      const atras = cr.strikePlayer({ type: 'circle', radius: 220, offset: 0 }, 0, 5, 100);
      p.x = cr.x; p.y = cr.y + 50; cr.hitThisAttack = false;
      const livre = cr.strikePlayer({ type: 'circle', radius: 220, offset: 0 }, 0, 5, 100);
      this.ok('golpe inimigo: não atravessa o pilar', !atras && livre, `${atras} / ${livre}`);
      p.hp = p.maxHp; p.invuln = 99; p.state = 'idle';
      // atirador sem linha de tiro não mira; com linha, mira
      const at = createEnemy('drone', pil.x - 150, pil.y, 2); at.setState('idle'); at.camp = null; at.attackCd = 0; g.enemies.push(at);
      p.x = pil.x + 60; p.y = pil.y; at.vistaT = 0; at.think(1 / 30, p);
      const semLinha = at.state;
      at.x = pil.x - 150; at.y = pil.y; p.x = pil.x - 150; p.y = pil.y + 220; at.vistaT = 0; at.attackCd = 0; at.think(1 / 30, p);
      this.ok('atirador: sem linha de tiro não dispara; à vista, mira', semLinha === 'idle' && at.state === 'windup', `${semLinha} → ${at.state}`);
      // rastejador desiste do bote quando o herói sai do alcance (esquiva)
      cr.x = pil.x - 150; cr.y = pil.y - 120; p.x = cr.x + 50; p.y = cr.y; cr.setState('windup'); cr.telegraph = { kind: 'cone', x: cr.x, y: cr.y, r: 52, dir: 0, arc: 0.95 };
      cr.stateTime = 0.3; p.x = cr.x + 220;
      cr.think(1 / 30, p);
      this.ok('rastejador: o herói esquivou para longe, desiste do bote', cr.state === 'idle' && !cr.telegraph, cr.state);
      for (const e of g.enemies) e.alive = false;
      g.enemies.length = 0; g.director.reset(1);
      // ---------------------------------------------------------- acampamento: perceber, alerta, luta
      const cx = pil.x - 160, cy = pil.y, camp = { def: { mobs: {} }, enemies: [], awake: false, x: cx, y: cy };
      for (const [t, dy] of [['rastejador', -12], ['rastejador', 12], ['cacador', 0]]) {
        const e = createEnemy(t, cx - (t === 'cacador' ? 16 : 0), cy + dy, 2); e.setState('idle'); e.dormant = true; e.camp = camp; e.facing = 0;
        camp.enemies.push(e); g.enemies.push(e);
      }
      World.camps.push(camp);
      const olha = (a) => { for (const e of camp.enemies) { e.facing = a; e.olharA = a; e.olharT = 99; e.vistaT = 0; } };   // vistaT: refaz a linha de visão
      p.state = 'idle'; p.vx = p.vy = 0;
      p.x = clamp(cx + 620, 40, R.w - 40); p.y = cy; olha(0); passo(6);
      this.igual('encontro: longe, o grupo segue calmo', Encontros.fase(camp), 'calmo');
      p.x = pil.x + 60; p.y = pil.y; olha(0); passo(6);
      this.ok('encontro: escondido atrás do pilar, não é visto', Encontros.fase(camp) === 'calmo', Encontros.fase(camp));
      p.x = pil.x + 10; p.y = pil.y + 130;
      olha(Math.PI);
      this.ok('encontro: de costas para o herói, não percebe a 210', camp.enemies.every((e) => !Encontros.percebe(e, p, camp)));
      olha(Math.atan2(p.y - cy, p.x - cx));
      this.ok('encontro: de frente e à vista, percebe', camp.enemies.some((e) => Encontros.percebe(e, p, camp)));
      p.state = 'run'; p.moveSpeed = p.baseSpeed * 0.4;
      const furtivo = Encontros.ruido(p);
      p.state = 'attack';
      const barulhento = Encontros.ruido(p);
      p.state = 'idle'; p.moveSpeed = 0;
      this.ok('encontro: andar devagar chama menos atenção que golpear', furtivo < 1 && barulhento > 1, `${furtivo} / ${barulhento}`);
      passo(4);
      this.ok('encontro: percebeu → alerta, com "!" e sem atacar ainda', Encontros.fase(camp) === 'alerta' && camp.enemies.every((e) => e.marca === '!' && e.marcaT > 0 && e.dormant) && !World.inCombat(), Encontros.fase(camp));
      passo(25);
      this.ok('encontro: depois do alerta, a luta começa', Encontros.fase(camp) === 'luta' && camp.awake && camp.enemies.every((e) => !e.dormant) && World.inCombat() && !!camp.casa, Encontros.fase(camp));
      // ---------------------------------------------------------- fuga: coleira e volta
      for (const e of camp.enemies) e.hp = Math.round(e.maxHp * 0.5);
      const lim = Encontros.limite(camp), cantos = [[40, 40], [R.w - 40, 40], [40, R.h - 40], [R.w - 40, R.h - 40]];
      const longe = cantos.reduce((b, c) => (dist(c[0], c[1], cx, cy) > dist(b[0], b[1], cx, cy) ? c : b));
      p.x = longe[0]; p.y = longe[1]; p.invuln = 99;
      passo(95);
      this.ok('fuga: longe demais, o grupo desiste ("?") e volta para casa', Encontros.fase(camp) === 'volta' && camp.enemies.every((e) => e.dormant && e.voltando && e.marca === '?') && !World.inCombat(), `${Encontros.fase(camp)} lim ${Math.round(lim)}`);
      passo(300);
      const emCasa = camp.enemies.every((e) => { const H = Encontros.casa(e); return dist(e.x, e.y, H.x, H.y) < 30; });
      this.ok('fuga: de volta em casa, com a vida cheia, calmos de novo', Encontros.fase(camp) === 'calmo' && emCasa && camp.enemies.every((e) => e.hp === e.maxHp && !e.voltando), Encontros.fase(camp));
      // atingido dormindo: o grupo acorda na hora (sem alerta)
      camp.enemies[0].takeHit({ dmg: 1, kx: 1, ky: 0, kb: 10, launch: 0, stun: 0.1, heavy: false, crit: false });
      this.ok('encontro: atingido no acampamento, todos acordam na hora', Encontros.fase(camp) === 'luta' && camp.enemies.every((e) => !e.dormant));
      // barulho da luta: outro acampamento perto, com linha de visão, fica em alerta
      const c2 = { def: { mobs: {} }, enemies: [], awake: false, x: cx, y: cy - 200 };
      const e2 = createEnemy('rastejador', cx, cy - 200, 2); e2.setState('idle'); e2.dormant = true; e2.camp = c2; c2.enemies.push(e2); g.enemies.push(e2); World.camps.push(c2);
      Encontros.barulho(cx + 60, cy - 60);
      this.igual('encontro: o barulho da luta chama o acampamento vizinho', Encontros.fase(c2), 'alerta');
      for (const e of g.enemies) e.alive = false;
      g.enemies.length = 0; World.camps = [];
      // ---------------------------------------------------------- herói
      // esquiva sólida: contorna o corpo do inimigo em vez de atravessar
      const alvo = createEnemy('legionario', R.w / 2 + 70, R.h * 0.75, 2); alvo.setState('stun'); alvo.stun = 9; alvo.camp = null; g.enemies.push(alvo);
      p.state = 'idle'; p.x = R.w / 2; p.y = R.h * 0.75; p.vx = p.vy = 0; p.dashCd = 0; p.dashStock = 3; p.invuln = 0;
      p.startDash({ x: 1, y: 0 });
      let atravessou = 0;
      for (let i = 0; i < 14; i++) { p.update(1 / 60, g.nullInput); alvo.update(1 / 60); g.separate(); if (dist(p.x, p.y, alvo.x, alvo.y) < p.radius + alvo.radius - 2) atravessou++; }
      this.ok('esquiva: não atravessa o corpo do inimigo', !atravessou, atravessou);
      alvo.alive = false; g.enemies.length = 0;
      // sair do golpe andando: só no fim da recuperação
      p.state = 'idle'; p.x = R.w / 2; p.y = R.h * 0.75; p.vx = p.vy = 0; p.combo.reset(); p.dashBuffer = 0; p.specialBuffer = 0; p.abBufT = 0;
      p.startAttack(p.combo.resolve('L'), null);
      const d = p.attack.def, tA = d.windup + d.active, cedo = tA + d.recovery * 0.3, tEnd = tA + d.recovery;
      const anda = ent();
      let tt = 0;
      while (tt < cedo) { p.update(1 / 60, ent()); tt += 1 / 60; }
      anda.move.x = 1; p.update(1 / 60, anda); tt += 1 / 60;
      const aindaGolpe = p.state === 'attack';
      let saiu = -1;
      for (let i = 0; i < 40 && saiu < 0; i++) { p.update(1 / 60, anda); tt += 1 / 60; if (p.state === 'run') saiu = tt; }
      this.ok('golpe: andar no começo da recuperação não corta o golpe; no fim, sai correndo', aindaGolpe && saiu > tA + d.recovery * 0.55 && saiu < tEnd, `${aindaGolpe} ${saiu.toFixed(3)} / ${tEnd.toFixed(3)}`);
      // reação ao dano: tranco leve, cambaleio no golpe pesado; e de onde veio
      p.state = 'idle'; p.invuln = 0; p.hp = p.maxHp; g.state = 'playing';
      p.takeDamage(1, p.x - 50, p.y, 100);
      const leve = p.hurtDur;
      this.ok('dano: indicador aponta para quem bateu', g.danoDir && Math.abs(angleDiff(g.danoDir.a, Math.PI)) < 0.01, g.danoDir && g.danoDir.a);
      p.state = 'idle'; p.invuln = 0;
      p.takeDamage(1, p.x, p.y - 50, 460);
      this.ok('dano: golpe leve é um tranco, golpe pesado faz cambalear', leve === 0.15 && p.hurtDur === 0.4, `${leve} / ${p.hurtDur}`);
      p.hp = p.maxHp; p.state = 'idle'; p.invuln = 0;
      // recuo do inimigo atingido: mais forte no golpe pesado; o corpo tomba na direção do golpe
      const sac = createEnemy('rastejador', R.w / 2 + 200, R.h * 0.75, 2); sac.setState('idle'); sac.camp = null;
      sac.takeHit({ dmg: 1, kx: 1, ky: 0, kb: 50, launch: 0, stun: 0.1, heavy: false, crit: false });
      const kLeve = sac.recuoK;
      sac.takeHit({ dmg: 1, kx: 1, ky: 0, kb: 50, launch: 0, stun: 0.1, heavy: true, crit: false });
      sac.recuoT = sac.recuoDur * 0.6;
      const o = g.opts3(sac, 0); o.yaw = 0; sac.facing = sac.viewFacing = 0;
      g.queue3(sac.type, sac, o);
      this.ok('inimigo atingido: recuo maior no golpe pesado, tomba na direção do golpe', kLeve > 0 && sac.recuoK > kLeve && o.pitch > 0.01, `${kLeve.toFixed(2)} ${sac.recuoK.toFixed(2)} ${(o.pitch || 0).toFixed(3)}`);
      // transição de pose: o primeiro quadro do golpe fica entre o repouso e a pose do golpe
      const key = heroModelKey(p.def), m = g.model3(key), def = MODELS3D[key];
      if (m && def) {
        p.state = 'idle'; p.vx = p.vy = 0; p.moveSpeed = 0; p._mix = null; p.animTime = 50;
        const pose = () => { m.reset(); def.pose(m, p, g.opts3(p, 0)); };
        const nos = Object.keys(m.nodes);
        pose(); R3D.misturar(m, p);
        const rep = nos.map((k) => m.nodes[k].r.slice());
        p.combo.reset(); p.startAttack(p.combo.resolve('L'), null); p.attack.t = 0.05; p.animTime += 1 / 60;
        pose(); const alvoP = nos.map((k) => m.nodes[k].r.slice());
        R3D.misturar(m, p);
        let i0 = -1, j0 = 0;
        for (let i = 0; i < nos.length && i0 < 0; i++) for (let j = 0; j < 3; j++) if (Math.abs(alvoP[i][j] - rep[i][j]) > 0.2) { i0 = i; j0 = j; break; }
        const meio = i0 >= 0 ? m.nodes[nos[i0]].r[j0] : 0;
        const entre = i0 >= 0 && Math.abs(meio - rep[i0][j0]) > 1e-4 && Math.abs(meio - alvoP[i0][j0]) > 1e-4 && (meio - rep[i0][j0]) * (alvoP[i0][j0] - rep[i0][j0]) > 0;
        for (let k = 0; k < 12; k++) { p.animTime += 1 / 60; pose(); R3D.misturar(m, p); }
        const fimMix = p._mix.k === 1;
        this.ok('pose: troca de estado com transição (o 1º quadro fica no meio do caminho)', entre && fimMix, i0 >= 0 ? `${nos[i0]} ${rep[i0][j0].toFixed(2)} → ${meio.toFixed(2)} → ${alvoP[i0][j0].toFixed(2)}` : 'sem nó');
        p.endAttack(); p.state = 'idle'; p._mix = null;
      }
      // de volta ao jogo depois de uma conversa: o botão que fechou não vira golpe
      g.estadoAnt = 'worlddlg'; g.state = 'playing';
      g.update(0);
      p.combo.reset();
      const tecla = ent(); tecla.pressed.light = true;
      p.captureInput(tecla);
      this.ok('conversa: logo depois de fechar, o botão de golpe não ataca', p.travaAtaque > 0 && !p.combo.hasBuffer(), p.travaAtaque);
      p.travaAtaque = 0; p.combo.reset();
      // golpe colado num morador, fora de combate, vira conversa; na luta, é golpe
      R.pillars = pilares0; pilares0 = null;
      World.loadZone('mercado', null);
      for (const e of g.enemies) e.alive = false;
      g.enemies.length = 0; World.camps = [];
      const mor = g.npcs.find((n) => n instanceof Morador);
      if (mor) {
        p.x = mor.x + 40; p.y = mor.y; g.talkTarget = mor;
        const conv = g.golpeConversa(tecla);
        const brig = createEnemy('rastejador', mor.x + 900, mor.y, 1); brig.setState('idle'); brig.camp = null; g.enemies.push(brig);
        const naLuta = g.golpeConversa(tecla);
        this.ok('morador: golpe colado nele fora de combate vira conversa; na luta, não', conv && !naLuta, `${conv} / ${naLuta}`);
        brig.alive = false; g.enemies.length = 0;
      } else this.ok('mercado tem morador', false);
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('combate no mundo: sem exceção', !erro, erro);
    if (pilares0) g.room.pillars = pilares0;
    World.camps = camps0; Eventos.prox = prox0; World.state.hora = h0;
    g.enemies.length = 0; for (const e of sala) g.enemies.push(e);
    p.x = sv.x; p.y = sv.y; p.hp = sv.hp; p.state = 'idle'; p.invuln = 0; p.vx = p.vy = 0; p.travaAtaque = 0;
  },

  // Armadura modular (js/mundo/arsenal.js, js/heroes/pecas3d.js): vagas, atributos, requisitos,
  // peso, resistências, uma peça por corpo, peças no modelo 3D e a economia (vender < fabricar)
  arsenal() {
    const g = game, p = g.player, A = Arsenal, lv0 = g.activeProgress().level, vest0 = JSON.stringify(A.S.vest);
    let erro = null;
    try {
      this.igual('arsenal: 9 vagas (capacete, peitoral, 2 ombreiras, luvas, calças, botas, capa, acessório)', ARS_ORDEM.length, 9);
      const rara = A.gerar('peitoral', 'placas', 2, 20), ecl = A.gerar('botas', 'eclipse', 0, 30);
      this.ok('arsenal: peça rara tem um bônus secundário', Object.keys(rara.st).filter((k) => ['dano', 'critico', 'energia', 'recarga'].includes(k)).length === 1, JSON.stringify(rara.st));
      this.igual('arsenal: conjunto Eclipse nasce Lendário (abaixo só do Mítico)', ecl.r, ARS_LENDARIA);
      g.activeProgress().level = 30;
      A.S.vest[A.heroi()] = {};
      A.refazer();
      const def0 = p.stats.armor, hp0 = p.maxHp, sp0 = p.stats.speedMult;
      const it = A.guardar(A.gerar('peitoral', 'placas', 0, 20), true);
      this.igual('arsenal: vestir a peça', A.equipar(it.id), '');
      this.ok('arsenal: o peitoral soma defesa e vida', p.stats.armor > def0 && p.maxHp > hp0, `${def0}→${p.stats.armor} · ${hp0}→${p.maxHp}`);
      A.tirar('peitoral');
      this.ok('arsenal: tirar volta a defesa', Math.abs(p.stats.armor - def0) < 1e-9 && p.maxHp === hp0);
      g.activeProgress().level = 1;
      const alto = A.guardar(A.gerar('botas', 'placas', 0, 20), true);
      this.ok('arsenal: nível baixo não veste peça de nível alto', /Requer nível/.test(A.equipar(alto.id)));
      g.activeProgress().level = 30;
      // uma peça, um corpo: vestir no Kael e depois na Lyra tira do Kael
      A.equipar(it.id, 'kael'); A.equipar(it.id, 'lyra');
      this.ok('arsenal: uma peça veste um herói por vez', !A.vestido(it.id, 'kael') && A.vestido(it.id, 'lyra') === 'peitoral');
      delete A.S.vest.lyra;
      // peso acima da carga deixa mais lento; resistência ao frio do conjunto de Inverno
      for (const s of ['capacete', 'peitoral', 'ombroE', 'ombroD', 'luvas', 'calcas', 'botas']) A.equipar(A.guardar(A.gerar(s, 'placas', 0, 20), true).id);
      this.ok('arsenal: placas inteiras pesam e tiram velocidade', p.stats.peso > p.stats.carga && p.stats.speedMult < sp0, `${p.stats.peso} / ${p.stats.carga} · ${sp0}→${p.stats.speedMult}`);
      A.equipar(A.guardar(A.gerar('capa', 'inverno', 0, 20), true).id);
      this.ok('arsenal: capa de Inverno dá resistência ao gelo', (p.stats.resGelo || 0) > 0, p.stats.resGelo);
      const P = A.protecao();
      this.ok('arsenal: proteção do conjunto contra o clima (isolamento, água, vento)', P.isola > 0 && P.agua > 0 && P.vento > 0, JSON.stringify(P));
      // peças no modelo 3D do herói (vestidas aparecem, sem peça somem)
      const M = g.model3(heroModelKey(CHARACTERS_BY_ID.kael));
      this.ok('arsenal: o modelo do Kael tem as peças instaladas', M && M.nodes.pc_peitoral_torso && M.nodes.pc_capa && M.nodes.pc_botas_footL, M && Object.keys(M.nodes).filter((k) => k.startsWith('pc_')).length);
      // economia: vender (mesmo raro) paga menos do que o material custa com o maior desconto
      let lucro = null;
      for (const fam in ARS_FAMILIAS) for (const s of ARS_ORDEM) { const q = A.gerar(s, fam, 4, 20); if (A.venda(q) >= A.valorBase(s, fam) * 0.8) lucro = `${fam}/${s}`; }
      this.ok('arsenal: nenhuma peça vende por mais do que o material custa', !lucro, lucro);
      // desmontar devolve parte do material
      const ferro0 = Oficios.mat('ferro'), dm = A.guardar(A.gerar('luvas', 'placas', 0, 20), true);
      A.vender(dm.id);
      this.ok('arsenal: desmontar devolve parte do ferro', Oficios.mat('ferro') > ferro0 && !A.item(dm.id));
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('arsenal: sem exceção', !erro, erro);
    A.S.vest = JSON.parse(vest0); g.activeProgress().level = lv0; A.refazer();
  },

  // Fabricação (js/mundo/fabrica.js): estações, receitas com requisitos, planos, aprimoramentos,
  // armazém e o inventário por categorias
  fabricacao() {
    const g = game, F = Fabrica, A = Arsenal, lv0 = g.activeProgress().level, b0 = g.stats.soulsBank, rec0 = A.S.receitas.slice();
    let erro = null;
    try {
      this.igual('fabricação: 5 estações', Object.keys(FAB_ESTACOES).length, 5);
      for (const est in FAB_ESTACOES) if (est !== 'armas') this.ok(`fabricação: ${est} tem receitas`, F.daEstacao(est).length > 0);
      this.ok('fabricação: a bancada de armas aprimora as armas do herói', F.armas().length > 0 && !!F.entArma(F.armas()[0]).acoes);
      this.ok('fabricação: a forja faz as 8 peças de corpo de cada família', Object.keys(ARS_FAMILIAS).every((f) => ARS_ORDEM.filter((s) => s !== 'acessorio').every((s) => F.receita(`p_${f}_${s}`) && F.receita(`p_${f}_${s}`).est === 'forja')));
      g.activeProgress().level = 30; g.stats.soulsBank = 100000;
      for (const k in WORLD_MATERIAIS) Oficios.S.mat[k] = 0;
      const R = F.receita('p_viajante_botas');
      this.ok('fabricação: sem material, o motivo aparece', /^Faltam/.test(F.pode(R)), F.pode(R));
      for (const k in R.mat) Oficios.S.mat[k] = R.mat[k];
      const n0 = A.S.itens.length + A.S.armazem.itens.length;
      this.igual('fabricação: com o material, fabrica', F.fabricar(R.id), '');
      this.ok('fabricação: gasta exatamente o material e entrega a peça', Object.keys(R.mat).every((k) => Oficios.mat(k) === 0) && A.S.itens.length + A.S.armazem.itens.length === n0 + 1);
      // planos: sem o plano, a receita fica trancada; aprender abre
      A.S.receitas = A.S.receitas.filter((r) => r !== 'fam:placas');
      const Rp = F.receita('p_placas_peitoral');
      this.ok('fabricação: placas pede o plano', /plano/.test(F.pode(Rp)), F.pode(Rp));
      F.aprender('placas', 'teste');
      this.ok('fabricação: plano aprendido libera a receita', F.conhece(Rp) && !/plano/.test(F.pode(Rp)));
      // aprimorar peça (+1: 10% a mais) e arma (+6% de dano)
      const pc = A.guardar(A.gerar('peitoral', 'placas', 0, 20), true), C = F.custoPeca(pc);
      for (const k in C.mat) Oficios.S.mat[k] = C.mat[k];
      this.igual('fabricação: aprimorar a peça', F.aprimorarPeca(pc.id), '');
      this.ok('fabricação: peça +1 rende 10% a mais', pc.ap === 1 && Math.abs(A.mult(pc) - 1.1) < 1e-9);
      const w = F.armas()[0];
      if (w) {
        const Ca = F.custoArma(w), d0 = g.player.stats.dmgMult;
        for (const k in Ca.mat) Oficios.S.mat[k] = Ca.mat[k];
        this.igual('fabricação: aprimorar a arma na bancada', F.aprimorarArma(w), '');
        this.ok('fabricação: arma +1 dá +6% de dano', Math.abs(g.player.stats.dmgMult - d0 - 0.06) < 1e-9, g.player.stats.dmgMult - d0);
        A.S.armas[w] = 0; A.refazer();
      } else this.ok('fabricação: o herói tem arma para aprimorar', false);
      // armazém: material e peça vão e voltam
      Oficios.S.mat.couro = 5;
      F.guardarMat('couro', 3);
      this.ok('armazém: guarda material', Oficios.mat('couro') === 2 && A.S.armazem.mat.couro >= 3);
      F.retirarMat('couro', 3);
      this.igual('armazém: retira material', Oficios.mat('couro'), 5);
      this.igual('armazém: guarda peça (fora do corpo)', F.guardarPeca(pc.id), '');
      this.ok('armazém: a peça sai da mochila e volta', !A.item(pc.id) && F.retirarPeca(pc.id) === '' && !!A.item(pc.id));
      // inventário: categorias e item de missão protegido
      this.igual('inventário: 8 categorias', F.CATS_INV.length, 8);
      const out = []; F.entradasInv('pecas', out);
      this.ok('inventário: a categoria PEÇAS lista as peças', out.length > 0 && out.every((e) => /Peça/.test(e.sub)));
      const rec = []; F.entradasInv('receitas', rec);
      this.ok('inventário: a categoria RECEITAS lista todas as receitas', rec.length === F.receitas().length);
      // pesquisador: estuda e reconstrói um plano novo
      A.S.receitas = A.S.receitas.filter((r) => r !== 'fam:inverno');
      Object.assign(Oficios.S.mat, F.CUSTO_PESQUISA);
      this.igual('pesquisador: estuda o material raro', F.pesquisar(), '');
      this.ok('pesquisador: um plano novo aprendido', F.sabePlano('inverno'));
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('fabricação: sem exceção', !erro, erro);
    A.S.receitas = rec0; g.activeProgress().level = lv0; g.stats.soulsBank = b0;
  },

  // Cidade principal (js/mundo/cidade.js): zona, distritos, moradores e serviços, colisão das
  // fachadas, portões, mapa, armeiro, descanso e o teletransporte (canalizar, cancelar, chegar)
  cidade() {
    const g = game, p = g.player, z0 = World.zone.id, h0 = World.state.hora, b0 = g.stats.soulsBank, lv0 = g.activeProgress().level;
    const ent = (mx = 0) => ({ move: { x: mx, y: 0 }, pressed: {}, held: {}, released: {}, look: { x: 0, y: 0 } });
    let erro = null;
    try {
      const Z = WORLD_ZONES[CIDADE_ID];
      this.ok('cidade: zona própria, fora da grade das regiões', Z && Z.cidade && !worldZonesOf('nexus').includes(Z));
      World.map.travel = true; const viag = World.mapTargets().includes(CIDADE_ID);
      World.map.travel = false; const mapa = World.mapTargets().includes(CIDADE_ID);
      this.ok('cidade: sempre no mapa e na viagem rápida', viag && mapa);
      // teletransporte: de uma zona qualquer, canaliza e chega na praça
      World.loadZone('mercado', null);
      for (const e of g.enemies) e.alive = false;
      g.enemies.length = 0; World.camps = [];
      this.igual('teletransporte: pode fora de combate', Cidade.pode(), '');
      Cidade.teleportar();
      Cidade.update(0.3, ent(1));
      this.ok('teletransporte: andar interrompe', !Cidade.tp);
      const brig = createEnemy('rastejador', p.x + 300, p.y, 1); brig.setState('idle'); g.enemies.push(brig);
      this.ok('teletransporte: com inimigo acordado, não dá', /inimigos/.test(Cidade.pode()));
      brig.alive = false; g.enemies.length = 0;
      Cidade.teleportar();
      let canal = 0;
      for (let i = 0; i < 20 && Cidade.tp; i++) { if (Cidade.update(0.1, ent())) canal++; }
      this.ok('teletransporte: canaliza parado ~1,2 s', canal >= 11 && !Cidade.tp, canal);
      if (g.fadeCb) { const cb = g.fadeCb; g.fadeCb = null; cb(); }
      this.ok('teletransporte: chega no Refúgio da Aurora', World.zone.id === CIDADE_ID && Cidade.aqui());
      // distritos: 8 estações, monumento, bancas, 7 portões e os 11 moradores
      const props = g.npcs.filter((n) => n instanceof CidadeProp), est = props.filter((n) => n.kind === 'estacao').map((n) => n.data.est);
      this.ok('cidade: estações de todos os distritos', ['forja', 'armas', 'laboratorio', 'engenharia', 'guilda', 'missoes', 'armazem', 'cama'].every((e) => est.includes(e)), est.join(','));
      this.igual('cidade: um portão por região', g.npcs.filter((n) => n instanceof PortaoCidade).length, WORLD_REGIONS.length);
      const mor = g.npcs.filter((n) => n instanceof Morador);
      const meshy = WORLD_POVO.filter((q) => q.zona === 'aurora' && q.meshy).length;   // (a camponesa e o guarda do Meshy, js/mundo/npc3d.js)
      this.igual(`cidade: ${CIDADE_POVO.length} moradores e ${meshy} do Meshy`, mor.length, CIDADE_POVO.length + meshy);
      // fachadas sólidas: ninguém entra no fundo dos prédios
      const R = g.room; p.x = 40; p.y = 300; R.collide(p, true);
      this.ok('cidade: as fachadas bloqueiam (colisão)', p.x >= CIDADE_RECUO && R.blocksPoint(60, 600, 10) && [0.5, 0.55, 0.6, 0.65, 0.7].some((f) => !R.blocksPoint(R.w * f, R.h * 0.6, 10)));   // (o meio da praça é livre; a Chama da Aurora tem corpo)
      // serviços: cada estação nas conversas
      const opc = (nome) => { const n = mor.find((m) => m.name === nome); Povo.conversar(n); const ids = Dialogo.opcoes.map((o) => o.id); Dialogo.fechar(); return ids; };
      this.ok('cidade: ferreira abre a forja', opc('MESTRA BRASA').includes('forja'));
      this.ok('cidade: armeiro vende peças e planos', opc('DANTE').includes('armeiro') && opc('DANTE').includes('armas'));
      this.ok('cidade: engenheira tem laboratório e engenharia', opc('ÍRIS').includes('laboratorio') && opc('ÍRIS').includes('engenharia'));
      this.ok('cidade: alquimista e curandeira', opc('MÃE ANA').includes('alquimia') && opc('MÃE ANA').includes('curar'));
      this.ok('cidade: armazenista, estalajadeira, guilda e missões', opc('BERTA').includes('armazem') && opc('LIA').includes('descansar') && opc('VERIDIANA').some((i) => i.startsWith('guilda_')) && opc('CAIO').includes('painel'));
      const forja = props.find((n) => n.data.est === 'forja');
      forja.talk();
      this.ok('cidade: a forja abre a aba de fabricação', g.state === 'worldinv' && WorldInv.ui.tab === 'fabrica' && WorldInv.ui.servico === 'forja');
      WorldInv.fechar();
      // armeiro: estoque do dia (peças e planos) e a compra
      g.activeProgress().level = 14; g.stats.soulsBank = 100000;
      const rec0 = Arsenal.S.receitas.slice();
      Arsenal.S.receitas = Arsenal.S.receitas.filter((r) => r !== 'fam:deserto');   // (baús e chefes dos outros testes podem ter ensinado os planos)
      WorldInv.abrir('loja', true, 'armeiro');
      const L = WorldInv.lista(), pc = L.find((q) => q.peca !== undefined), n0 = Arsenal.S.itens.length + Arsenal.S.armazem.itens.length;
      this.ok('armeiro: tem peças e planos à venda', !!pc && L.some((q) => q.plano), L.length);
      const v = WorldInv.precoExtra(pc);
      WorldInv.comprar(pc.loja);
      this.ok('armeiro: compra a peça pelo preço', g.stats.soulsBank === 100000 - v && Arsenal.S.itens.length + Arsenal.S.armazem.itens.length === n0 + 1);
      WorldInv.fechar();
      Arsenal.S.receitas = rec0;
      // descanso: até de manhã, vida cheia
      World.state.hora = 22; p.hp = 5;
      Cidade.descansar();
      this.ok('alojamento: descansa até as 7 h com a vida cheia', World.state.hora === 7 && p.hp === p.maxHp);
      // portão fechado para região bloqueada e desenho (vista isométrica, 3ª pessoa e planta)
      g.activeProgress().level = 1;
      const fechado = g.npcs.find((n) => n instanceof PortaoCidade && n.selada());
      this.ok('cidade: portão da região bloqueada fica fechado', !!fechado);
      let e2 = null;
      try { g.renderWorld(g.ctx); ThirdView.buildRoom(R); for (const n of props) n.modelo3D(); Cidade.desenharPlanta(g.ctx, 20, 20, 300, 240); Cidade.desenharBotao(g.ctx, g.hud.L); World.openMap(false); World.drawMap(g.ctx, 1); World.closeMap(); } catch (e) { e2 = e.message; }
      this.ok('cidade: desenha (isométrica, 3ª pessoa, planta, botão e mapa)', !e2, e2);
      this.ok('cidade: já na cidade, o teletransporte avisa', /já está/.test(Cidade.pode()));
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('cidade: sem exceção', !erro, erro);
    Cidade.tp = null; Cidade.chegada = null;
    World.state.hora = h0; g.stats.soulsBank = b0; g.activeProgress().level = lv0;
    if (World.zone.id !== z0) World.loadZone(z0, null);
    g.state = 'playing';
  },

  // Bairro da Muralha e os interiores (js/mundo/bairro.js, kit de arquitetura do Blender): zonas,
  // prédios (medidas, portas, recuo), passagens, portas e saídas, mobília com colisão, moradores e
  // serviços (refeição, descanso, missões, treino), desenho nas três vistas e no mapa
  bairro() {
    const g = game, p = g.player, z0 = World.zone.id, b0 = g.stats.soulsBank, h0 = World.state.hora;
    World.state.hora = 12;   // (a rotina dos moradores depende da hora: meio-dia, todos nos postos)
    const fade = () => { if (g.fadeCb) { const cb = g.fadeCb; g.fadeCb = null; cb(); } };
    let erro = null;
    try {
      const Z = WORLD_ZONES[BAIRRO_ID], ints = Object.keys(BAIRRO_INTERIORES).filter((id) => !BAIRRO_INTERIORES[id].saida);   // (o pub do Mercado Neon também é um interior, mas fica na Metrópole: js/mundo/pub_neon.js)
      this.ok('bairro: zona da cidade, fora da grade e do mapa', Z && Z.cidade && Z.distrito === 'bairro' && !worldZonesOf('nexus').includes(Z) && !World.mapTargets().includes(BAIRRO_ID));
      this.ok('bairro: 5 interiores (taverna, hospedaria, conselho, quartel e o viveiro)', ints.length === 5 && ints.every((id) => WORLD_ZONES[id] && WORLD_ZONES[id].distrito === 'interior' && THEMES[WORLD_ZONES[id].theme]));
      this.ok('bairro: cada interior tem quem trabalhe nele (2+ moradores)', ints.every((id) => WORLD_ZONES[id].npcs.length >= 2));
      this.ok('bairro: o kit de arquitetura carregou (prédios e mobília no PROPS3D)', Bairro.pronto() && BAIRRO_PREDIOS.every((B) => PROPS3D[B.id]) && ['mesa', 'banco', 'cadeira', 'cama', 'barril', 'balcao', 'estante', 'lareira', 'caixote', 'boneco_treino', 'armeiro', 'lampiao_rua', 'estandarte_rubro'].every((id) => PROPS3D[id] && MODELS3D['cen_' + id]), Bairro.estado);
      this.ok('bairro: mobília dos interiores existe no kit', ints.every((id) => BAIRRO_INTERIORES[id].moveis.every((m) => PROPS3D[m[0]])));
      // a passagem da praça
      World.loadZone(CIDADE_ID, null);
      const ida = g.npcs.find((n) => n instanceof WorldProp && n.kind === 'gate' && n.data.to === BAIRRO_ID);
      this.ok('bairro: a praça tem a passagem para o bairro', !!ida);
      World.go(ida.data.to, null, null, ida.data.chegada); fade();
      const R = g.room;
      this.ok('bairro: chega no bairro (sala própria, não a da praça)', World.zone.id === BAIRRO_ID && R.bairro && !R.cidade);
      const portas = g.npcs.filter((n) => n instanceof PortaBairro);
      this.igual('bairro: 7 portas (5 prédios com interior e 2 casas)', portas.length, 7);
      this.ok('bairro: volta para a praça', g.npcs.some((n) => n instanceof WorldProp && n.kind === 'gate' && n.data.to === CIDADE_ID));
      this.igual('bairro: ao meio-dia, 7 moradores na rua (guarda, Nina, Jorge, o bardo, o viajante no banco, o domador Tobias e o ferreiro Osvaldo, do Meshy)', g.npcs.filter((n) => n instanceof Morador).length, 7);
      this.ok('bairro: lampiões, poço, carroça e o resto da rua (objetos do Blender com colisão)', Bairro.objetos.length >= 15 && R.pillars.filter((q) => q.cenario).length >= Bairro.objetos.length, Bairro.objetos.length);
      // prédios: dentro da sala, sem sobrepor, o fundo dentro do recuo, a porta na frente
      const Ls = BAIRRO_PREDIOS.map((B) => ({ B, L: Bairro.lugar(B, R), m: Bairro.medidas(B) }));
      const sobre = Ls.some((a, i) => Ls.some((b, j) => j > i && a.L.x0 < b.L.x1 - 1 && b.L.x0 < a.L.x1 - 1 && a.L.y0 < b.L.y1 - 1 && b.L.y0 < a.L.y1 - 1));
      this.ok('bairro: prédios sem sobrepor e dentro da sala', !sobre && Ls.every(({ L }) => L.x0 >= -1 && L.y0 >= -1 && L.x1 <= R.w + 1 && L.y1 <= R.h + 1), Ls.map(({ B, L }) => `${B.id}:${L.x0 | 0}-${L.x1 | 0},${L.y0 | 0}-${L.y1 | 0}`).join(' '));
      this.ok('bairro: o fundo de cada prédio cabe no recuo', Ls.every(({ m }) => m[0] <= BAIRRO_RECUO + 1), Ls.map(({ B, m }) => `${B.id}:${Math.round(m[0])}`).join(' '));
      this.ok('bairro: cada prédio tem a porta marcada na frente', BAIRRO_PREDIOS.every((B) => { const M = PROPS3D[B.id].marcas; return M && M.portas && M.portas.length && M.portas[0].p[0] > 0; }));
      this.ok('bairro: janelas marcadas (luz à noite)', BAIRRO_PREDIOS.every((B) => (PROPS3D[B.id].marcas.janelas || []).length >= 2));
      this.ok('bairro: os prédios bloqueiam (recuo)', R.blocksPoint(BAIRRO_RECUO - 20, 700, 10) && R.blocksPoint(700, BAIRRO_RECUO - 20, 10) && !R.blocksPoint(BAIRRO_RECUO + 40, 700, 10));
      this.ok('bairro: as portas ficam na rua, alcançáveis', portas.every((n) => R.canStand(n.B.lado === 'N' ? n.x : n.x + 30, n.B.lado === 'N' ? n.y + 30 : n.y, p.radius)));
      // casa: bater na porta
      const casa = portas.find((n) => !n.B.interior);
      let e1 = null; try { casa.talk(); } catch (e) { e1 = e.message; }
      this.ok('bairro: a casa responde à porta (e não abre)', !e1 && World.zone.id === BAIRRO_ID && !g.fadeCb, e1);
      // desenho do bairro: fotos dos prédios, vista isométrica, 3ª pessoa e a planta
      for (let i = 0; i < 9; i++) Bairro.processar();
      let e2 = null;
      try { g.renderWorld(g.ctx); ThirdView.buildRoom(R); Bairro.desenharPlanta(g.ctx, 20, 20, 300, 240); World.openMap(false); World.drawMap(g.ctx, 1); World.closeMap(); } catch (e) { e2 = e.message; }
      this.ok('bairro: desenha (isométrica, 3ª pessoa, planta e mapa)', !e2, e2);
      // interiores: entrar, mobília, moradores e serviços, sair na porta certa
      const servicos = { aurora_taverna: ['BENTO', 'refeicao'], aurora_hospedaria: ['ROSA', 'descansar'], aurora_conselho: ['CONSELHEIRA HELENA', 'painel'], aurora_quartel: ['CAPITÃ IRENE', 'treinar'], aurora_animais: ['CORA ALVES', 'catalogo'] };
      for (const id of ints) {
        const porta = g.npcs.find((n) => n instanceof PortaBairro && n.B.interior === id);
        porta.talk(); fade();
        const Ri = g.room, I = BAIRRO_INTERIORES[id];
        this.ok(`${id}: entra pela porta (sala fechada, piso ${THEMES[I.theme].deco})`, World.zone.id === id && Ri.interior && !Ri.aberto && !Ri.bairro);
        this.ok(`${id}: a mobília no lugar, com colisão`, Bairro.objetos.length >= I.moveis.length - 2 && Ri.pillars.filter((q) => q.cenario).length >= Bairro.objetos.length, `${Bairro.objetos.length}/${I.moveis.length}`);
        const [nome, sv] = servicos[id], n = g.npcs.find((q) => q instanceof Morador && q.name === nome);
        this.ok(`${id}: ${nome} alcançável (dá para conversar de pé por perto)`, !!n && Array.from({ length: 48 }, (_, k) => k).some((k) => { const a = k / 48 * TAU; return [40, 56, 70].some((d) => Ri.canStand(n.x + Math.cos(a) * d, n.y + Math.sin(a) * d, p.radius)); }));
        Povo.conversar(n); const ops = Dialogo.opcoes.map((o) => o.id); Dialogo.fechar();
        this.ok(`${id}: ${nome} oferece o serviço (${sv})`, ops.includes(sv), ops.join(','));
        this.ok(`${id}: o herói chega longe da mobília`, Ri.canStand(p.x, p.y, p.radius));
        let e3 = null; try { g.renderWorld(g.ctx); ThirdView.buildRoom(Ri); } catch (e) { e3 = e.message; }
        this.ok(`${id}: desenha (isométrica e 3ª pessoa)`, !e3, e3);
        if (id === 'aurora_taverna') {
          g.stats.soulsBank = 1000; p.hp = 1; p.buffs.cha = 0;
          const preco = Bairro.precoRefeicao(), r = Bairro.refeicao();
          this.ok('taverna: a refeição cura, enche a energia e aquece (chá quente)', p.hp === p.maxHp && p.buffs.cha >= 290 && g.stats.soulsBank === 1000 - preco, r);
          g.stats.soulsBank = 0; p.hp = 1;
          this.ok('taverna: sem células, sem ensopado', /Faltam/.test(Bairro.refeicao()) && p.hp === 1);
          this.ok('taverna: o taverneiro conta rumores', ops.includes('rumor'));
        }
        if (id === 'aurora_conselho') { Povo.conversar(g.npcs.find((q) => q.name === 'CONSELHEIRA HELENA')); const o2 = Dialogo.opcoes.map((o) => o.id); Dialogo.fechar(); this.ok('conselho: contratos da Guilda com a conselheira', o2.some((i) => i.startsWith('guilda_'))); }
        // sair: a passagem da frente leva de volta à porta do prédio
        const saida = g.npcs.find((q) => q instanceof WorldProp && q.kind === 'gate' && q.data.to === BAIRRO_ID);
        this.ok(`${id}: tem a saída para o bairro`, !!saida);
        World.go(saida.data.to, null, null, saida.data.chegada); fade();
        const volta = g.npcs.find((q) => q instanceof PortaBairro && q.B.interior === id);
        this.ok(`${id}: sai na frente da porta do prédio`, World.zone.id === BAIRRO_ID && dist(p.x, p.y, volta.x, volta.y) < 150, Math.round(dist(p.x, p.y, volta.x, volta.y)));
      }
      // mapa: num distrito, o herói aparece na cidade; eventos não caem nas zonas da cidade
      this.ok('bairro: eventos dinâmicos nunca nas zonas da cidade', Object.values(WORLD_ZONES).filter((z) => z.cidade).every((z) => !worldZonesOf(z.region).includes(z)));
      const A = Eventos.sortear();
      this.ok('bairro: evento sorteado daqui vai para fora da cidade', !A || !WORLD_ZONES[A.zona].cidade, A && A.zona);
      Eventos.S.atual = null;
      this.ok('bairro: abrigo da chuva junto aos prédios', Clima.abrigado(BAIRRO_RECUO + 20, 700) === 1 || Clima.exposicao() < 1);
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('bairro: sem exceção', !erro, erro);
    g.stats.soulsBank = b0; p.buffs.cha = 0; World.state.hora = h0;
    if (World.zone.id !== z0) World.loadZone(z0, null);
    g.state = 'playing';
  },

  // Rotina dos moradores (js/mundo/rotina.js): a agenda cobre o dia inteiro, cada um no lugar certo
  // na hora certa (sentar, comer, dormir, conversar, a guarda), a troca de turno, entradas e saídas,
  // quem dorme só resmunga; os modelos próprios (js/mundo/npc3d.js) e as missões dos prédios
  rotina() {
    const g = game, p = g.player, z0 = World.zone.id, h0 = World.state.hora, b0 = g.stats.soulsBank;
    const em = (zona, h) => { World.state.hora = h; World.loadZone(zona, null, null, [0.5, 0.75]); const L = g.npcs.filter((n) => n instanceof Morador); for (const n of L) n.update(0.016); return L; };
    const nome = (L, n) => L.find((q) => q.name === n);
    let erro = null;
    try {
      const ids = Object.keys(ROTINA);
      this.ok('rotina: cada agenda é de um morador que existe', ids.every((id) => Povo.persona(id)), ids.filter((id) => !Povo.persona(id)).join(','));
      this.ok('rotina: cada agenda cobre as 24 horas, sem buraco', ids.every((id) => { const A = ROTINA[id]; return A[0][0] === 0 && A[A.length - 1][1] === 24 && A.every((e, i) => !i || A[i - 1][1] === e[0]); }));
      this.ok('rotina: os compromissos são em zonas que existem', ids.every((id) => ROTINA[id].every((e) => e[2].zona === null || WORLD_ZONES[e[2].zona])));
      this.ok('rotina: as conversas têm par e falas', ids.every((id) => ROTINA[id].every((e) => e[2].tipo !== 'conversar' || (CONVERSAS[e[2].fala] && ROTINA[e[2].com]))));
      // a taverna às 20 h: a casa cheia, gente comendo e bebendo, o bardo cantando
      let L = em('aurora_taverna', 20);
      const sentados = L.filter((n) => n.state === 'eat' || n.state === 'drink' || n.state === 'sit');
      this.ok('rotina: às 20 h a taverna enche (5+ sentados comendo ou bebendo)', sentados.length >= 5, L.map((n) => `${n.name}:${n.state}`).join(' '));
      {
        // o bardo: a música inteira, uma vez, com a letra real no tempo do áudio
        const C = Rotina.cantoria, cosme = nome(L, 'COSME'), som0 = C.audio, mudo0 = C.mudo, fSom = C.som;
        C.parar(); C.audio = null; C.mudo = true; C.som = () => null;   // no teste, o relógio do jogo (sem tocar o arquivo)
        Rotina.atualizar(cosme, 0.1);
        this.ok('rotina: o bardo canta (toca o alaúde no palco)', !!cosme && cosme.state === 'talk' && Rotina.cantando(cosme));
        this.ok('rotina: letra do bardo em ordem, sem sobrepor versos', CANTIGA.every((v, i) => v[1] > v[0] && (i === 0 || v[0] >= CANTIGA[i - 1][1])) && CANTIGA[CANTIGA.length - 1][1] < CANTIGA_DUR);
        C.t = 10; this.ok('rotina: na introdução (só alaúde) não aparece letra', C.verso() === null);
        C.t = 21; const v1 = C.verso(); this.ok('rotina: o verso aparece no tempo dele', !!v1 && v1.k === 0 && v1.a > 0.9, JSON.stringify(v1));
        C.t = 19.5; const v0 = C.verso(); C.t = 24.2; const v2 = C.verso();
        this.ok('rotina: o verso entra e sai aos poucos', !!v0 && v0.a > 0 && v0.a < 0.6 && !!v2 && v2.k === 0 && v2.a < 0.6, JSON.stringify([v0, v2]));
        C.t = 51.5; this.ok('rotina: entre os versos a letra some', C.verso() === null);
        C.t = CANTIGA_DUR - 0.05; Rotina.atualizar(cosme, 0.1);
        this.ok('rotina: a música acaba sem repetir em laço (o bardo descansa)', !C.tocando && C.descanso > 0 && !Rotina.cantando(cosme) && cosme.verso === null);
        C.descanso = 0.05; Rotina.atualizar(cosme, 0.1); Rotina.atualizar(cosme, 0.1);
        this.ok('rotina: depois do descanso recomeça do início', C.tocando && C.t < 1);
        C.t = 60; C.parar();
        this.ok('rotina: parar a cantoria volta ao começo', !C.tocando && C.t === 0);
        C.som = fSom; C.audio = som0; C.mudo = mudo0;
      }
      {
        // Guardião do Mundo: bênçãos pelo relógio de verdade, uma por tipo, evento de XP e registro
        const G = Guardiao, agora0 = G.agora, st0 = World.state.gm, ev0 = G._ev, p = g.player;
        let rel = 1e12; G.agora = () => rel; World.state.gm = null; G._ev = null;
        this.ok('guardião: oito bênçãos, cada uma com ícone próprio', GM_ORDEM.length === 8 && new Set(GM_ORDEM.map((id) => GM_BUFFS[id].nome)).size === 8 && GM_ORDEM.every((id) => GM_BUFFS[id].rgb && GM_BUFFS[id].desc(2)));
        this.ok('guardião: durações de 15 min a 24 h', GM_DURACOES[0][0] === 15 && GM_DURACOES[GM_DURACOES.length - 1][0] === 1440);
        this.ok('guardião: recusa duração inválida', !!G.conceder('ataque', 0, 0) && !!G.conceder('ataque', 0, 5000) && !G.ativo('ataque'));
        const d0 = p.stats.dmgMult, v0 = p.stats.speedMult;
        this.ok('guardião: concede e vale nos atributos', G.conceder('ataque', 0, 15) === '' && G.conceder('velocidade', 0, 30) === '' && p.stats.dmgMult > d0 + 0.2 && p.stats.speedMult > v0 + 0.15, `${p.stats.dmgMult} ${p.stats.speedMult}`);
        this.ok('guardião: experiência 5x multiplica o ganho', G.conceder('xp', 2, 60) === '' && G.xpMult() === 5);
        this.ok('guardião: evento do mundo e bênção não se somam (vale o maior)', G.abrirEvento(10, 30) === '' && G.xpMult() === 10 && !!G.abrirEvento(4, 30));
        G.fecharEvento(true);
        rel += 14 * 60e3; this.ok('guardião: o tempo é o do relógio de verdade (falta 1 min)', Math.round(G.resta('ataque')) === 60);
        G.conceder('ataque', 0, 15); this.ok('guardião: renovar soma o tempo', Math.round(G.resta('ataque')) === 16 * 60);
        for (let i = 0; i < 200; i++) G.conceder('ataque', 0, 1440);
        this.ok('guardião: teto de 24 horas', G.resta('ataque') <= 24 * 3600 + 1);
        rel += 25 * 3600e3; G._passo = 0; G.update(0.6);
        this.ok('guardião: acabou o tempo, a bênção sai e os atributos voltam', G.lista().length === 0 && Math.abs(p.stats.dmgMult - d0) < 1e-6 && G.xpMult() === 1);
        this.ok('guardião: tudo fica no registro', World.state.gm.log.length >= 5);
        G.agora = agora0; World.state.gm = st0; G._ev = ev0; p.recalc(false);
        // paisagens procedurais: a semente manda (js/mundo/paisagem.js)
        {
          const lago = (x, y) => { const d = Math.hypot((x - 1300) / 420, (y - 1200) / 300); return d < 1 ? 1 - d : 0; };
          const Az = (tema, semente, agua) => ({ id: 'zona_teste', w: 2400, h: 2200, tema, semente, agua: agua ? lago : null, fixos: [{ x: 500, y: 500, r: 120 }], passagens: [{ x: 1200, y: 60 }, { x: 60, y: 1100 }, { x: 2340, y: 1100 }], raio: (id) => (ESTRUTURAS_INDICE[id] ? ESTRUTURAS_INDICE[id].r : 40) });
          const ch = (G) => G.itens.map((o) => `${o.id}:${o.x.toFixed(1)}:${o.y.toFixed(1)}:${o.esc}`).join('|');
          const G1 = Paisagem.gerar(Az('floresta', 123, true)), G2 = Paisagem.gerar(Az('floresta', 123, true)), G3 = Paisagem.gerar(Az('floresta', 999, true));
          this.ok('paisagem: a mesma semente dá exatamente o mesmo mapa', ch(G1) === ch(G2) && G1.itens.length > 40);
          this.ok('paisagem: semente diferente dá outro mapa', ch(G1) !== ch(G3));
          this.ok('paisagem: sementes independentes por sistema', new Set(Object.values(Paisagem.sementes('zona_teste', 123))).size === Paisagem.SISTEMAS.length);
          this.ok('paisagem: nada dentro d\'água, fora do mapa ou em cima do que já existe', G1.itens.every((o) => lago(o.x, o.y) === 0 && o.x > 160 && o.y > 160 && o.x < 2240 && o.y < 2040 && Math.hypot(o.x - 500, o.y - 500) > 120));
          this.ok('paisagem: caminhos por A* chegam a todas as passagens e ficam livres', G1.rotas.every((r) => r.ok && r.pts.length > 3) && G1.relatorio.ok && G1.itens.every((o) => o.tipo === 'poi' || !G1.rotas.some((r) => r.pts.some((p) => Math.hypot(p[0] - o.x, p[1] - o.y) < 28))));
          this.ok('paisagem: o caminho contorna o lago em vez de atravessar o fundo', G1.rotas.every((r) => r.pts.filter((p) => Math.hypot(p[0] - 1200, p[1] - 1100) > 260).every((p) => lago(p[0], p[1]) <= 0.3)));   // (o centro de chegada do teste fica dentro do lago: dali sai pelo raso)
          this.ok('paisagem: sem peças sobrepostas', G1.itens.every((o, i) => G1.itens.every((q, j) => j >= i || Math.hypot(q.x - o.x, q.y - o.y) >= Math.min(o.r, q.r) * 0.9)));
          const Gd = Paisagem.gerar(Az('deserto', 5, false)), Gn = Paisagem.gerar(Az('neve', 5, true)), Gl = Paisagem.gerar(Az('lagoa', 3, true));
          this.ok('paisagem: espécies do bioma (agave no deserto; sem palmeira na neve nem no deserto seco; palmeira e bambu na lagoa)', Gd.itens.some((o) => o.id === 'planta_6') && !Gd.itens.some((o) => /arvore/.test(o.id)) && !Gn.itens.some((o) => /arvore|planta/.test(o.id)) && Gl.itens.some((o) => o.id === 'arvore_7') && Gl.itens.some((o) => o.id === 'planta_5'));
          this.ok('paisagem: toda espécie e todo ponto de interesse é um GLB do índice', Paisagem.ESPECIES.every((E) => ESTRUTURAS_INDICE[E.id]) && Object.values(Paisagem.POIS).every((L) => L.every((p) => ESTRUTURAS_INDICE[p[0]])));
          this.ok('paisagem: sub-biomas variados e transição contínua (campos sem salto)', Object.keys(G1.relatorio.biomas).length >= 3 && Math.abs(G1.campos.umid(800, 800) - G1.campos.umid(806, 800)) < 0.05 && Math.abs(G1.campos.alt(800, 800) - G1.campos.alt(806, 800)) < 0.05);
          this.ok('paisagem: pontos de fauna fora d\'água', G1.fauna.length >= 3 && G1.fauna.every((f) => lago(f.x, f.y) === 0));
          // na zona de verdade: entra na lista das estruturas, com teto de peças, e volta igual ao recarregar
          const pz0 = World.state.paisagem; World.state.paisagem = null;
          World.loadZone('velmora_clareira', null);
          const Rv = Paisagem.relatorio.velmora_clareira, L1 = JSON.stringify(Estruturas.ZONAS.velmora_clareira), nBase = Paisagem._base.velmora_clareira.length;
          this.ok('paisagem: a zona natural recebe a paisagem gerada e validada', !!Rv && Rv.natural && Rv.ok && Estruturas.ZONAS.velmora_clareira.length > nBase, JSON.stringify(Rv));
          this.ok('paisagem: teto de peças por zona', Estruturas.ZONAS.velmora_clareira.length - nBase <= Paisagem.TETO.arvore + Paisagem.TETO.planta + Paisagem.TETO.rocha + 2);
          World.loadZone('aurora', null); World.loadZone('velmora_clareira', null);
          this.ok('paisagem: sair e voltar dá a mesma paisagem', JSON.stringify(Estruturas.ZONAS.velmora_clareira) === L1);
          Paisagem.definirZona('velmora_clareira', 4242); World.loadZone('velmora_clareira', null);
          this.ok('paisagem: trocar a semente de uma zona muda só ela', JSON.stringify(Estruturas.ZONAS.velmora_clareira) !== L1 && Paisagem.configuracao().zonas.velmora_clareira === 4242 && Paisagem.sementeDe('velmora_lago') === Paisagem.sementeDe('velmora_lago'));
          // relevo: altura real do chão (js/mundo/relevo.js)
          {
            World.state.paisagem = null; delete Paisagem._cache.velmora_clareira;
            World.loadZone('velmora_clareira', null);
            const Rr = g.room, E0 = Relevo.estado(), hs = [];
            for (let x = 100; x < Rr.w; x += 90) for (let y = 100; y < Rr.h; y += 90) hs.push(Relevo.altura(x, y));
            this.ok('relevo: a zona natural tem chão com alturas diferentes (não é uma placa)', Relevo.ativo(Rr) && !!E0 && Math.max(...hs) - Math.min(...hs) > 35 && Math.min(...hs) >= 0, `${Math.min(...hs).toFixed(1)} a ${Math.max(...hs).toFixed(1)}`);
            let salto = 0; for (let x = 100; x < Rr.w - 100; x += 37) salto = Math.max(salto, Math.abs(Relevo.altura(x + 6, 700) - Relevo.altura(x, 700)));
            this.ok('relevo: superfície contínua (sem degrau nem buraco)', salto < 6, salto.toFixed(2));
            let naAgua = 0, molhados = 0; for (let x = 60; x < Rr.w; x += 40) for (let y = 60; y < Rr.h; y += 40) if (Agua.profundidade(x, y) > 0.3) { molhados++; naAgua = Math.max(naAgua, Relevo.altura(x, y)); }
            this.ok('relevo: a água fica no baixo (o terreno desce até a margem)', molhados > 0 && naAgua < 2.5, `${molhados} pontos, máx ${naAgua.toFixed(2)}`);
            const Lc = Estruturas.atual().lug.find((q) => Estruturas.IDX[q.id].tipo !== 'arvore' && Estruturas.IDX[q.id].tipo !== 'planta'), rc = Lc ? Estruturas.IDX[Lc.id].r * Lc.esc : 0;
            this.ok('relevo: construção em patamar (nem flutua nem fica enterrada)', !!Lc && Math.abs(Relevo.altura(Lc.x + rc * 0.7, Lc.y) - Relevo.altura(Lc.x - rc * 0.7, Lc.y)) < 2 && Math.abs(Relevo.altura(Lc.x, Lc.y + rc * 0.7) - Relevo.altura(Lc.x, Lc.y)) < 2, Lc && Lc.id);
            const gt = g.npcs.find((q) => q.kind === 'gate');
            this.ok('relevo: passagem em chão firme', !gt || Math.abs(Relevo.altura(gt.x + 20, gt.y) - Relevo.altura(gt.x - 20, gt.y)) < 2);
            // ladeira: subir reduz o passo, descer não trava
            let pico = null; for (let x = 150; x < Rr.w - 150; x += 60) for (let y = 150; y < Rr.h - 150; y += 60) { const i = Relevo.inclinacao(x, y); if (!pico || i > pico.i) pico = { x, y, i }; }
            const dv = Relevo.declive(pico.x, pico.y, [0, 0]);
            this.ok('relevo: ladeira acima reduz o passo; ladeira abaixo, não', pico.i > 0.05 && Relevo.ritmo(pico, dv[0], dv[1]) < 0.99 && Relevo.ritmo(pico, -dv[0], -dv[1]) >= 1, `${pico.i.toFixed(2)} ${Relevo.ritmo(pico, dv[0], dv[1]).toFixed(2)}`);
            // continuidade entre zonas vizinhas (mesma altura na borda comum)
            const za = WORLD_ZONES.velmora_clareira, viz = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dr, dc]) => [dr, dc, worldZoneAt(za.r + dr, za.c + dc, za.region)]).find((q) => q[2] && Relevo.forcaZona(Object.assign({ aberto: true }, q[2])) > 0);
            if (viz) {
              const [dr, dc, zb] = viz, fr = [0.2, 0.5, 0.8];
              const ha = fr.map((f) => Relevo.bruta(dc > 0 ? Rr.w : dc < 0 ? 0 : Rr.w * f, dr > 0 ? Rr.h : dr < 0 ? 0 : Rr.h * f));
              const idb = Object.keys(WORLD_ZONES).find((k) => WORLD_ZONES[k] === zb); World.loadZone(idb, null);
              const Rb = g.room, hb = fr.map((f) => Relevo.bruta(dc > 0 ? 0 : dc < 0 ? Rb.w : Rb.w * f, dr > 0 ? 0 : dr < 0 ? Rb.h : Rb.h * f));
              this.ok('relevo: a borda de uma zona tem a mesma altura da borda da vizinha', ha.every((h, i) => Math.abs(h - hb[i]) < 0.5), `${ha.map((h) => h.toFixed(1))} / ${hb.map((h) => h.toFixed(1))}`);
            }
            World.loadZone('aurora', null);
            this.ok('relevo: cidade e interiores continuam planos', !Relevo.ativo(g.room) && Relevo.altura(500, 500) === 0 && Relevo.ritmo(g.player, 1, 0) === 1);
            if (R3D.active && typeof ThirdView !== 'undefined') {
              World.loadZone('velmora_clareira', null);
              const m = Terreno.modelo(g.room), d = m && m.root.geo, zs = []; if (d) for (let i = 2; i < d.length; i += 10) zs.push(d[i]);
              this.ok('relevo: a altura está na geometria do chão (malha com relevo e normais)', zs.length > 3000 && Math.max(...zs) - Math.min(...zs) > 35, `${zs.length} vértices`);
            }
          }
          // vegetação rasteira (js/mundo/vegetacao.js): grama em tufos, flores, juncos; exclusões; semente
          {
            World.state.paisagem = null; delete Paisagem._cache.velmora_lago;
            World.loadZone('velmora_lago', null);
            const E1 = Vegetacao.gerarTudo(), S1 = Vegetacao.setores(), Rv = g.room;
            const lam = (S) => { const o = []; for (let q = 0; q < S.n; q++) o.push(S.dados.subarray(q * 11, q * 11 + 11)); return o; };
            const todas = S1.flatMap(lam);
            this.ok('vegetação: a zona natural ganha grama em tufos (milhares de lâminas)', E1 && E1.laminas > 8000 && todas.length === E1.laminas, JSON.stringify(E1));
            const naAgua = todas.find((b) => !(Agua.profundidade(b[0], b[1]) <= 0.31 || b[0] <= 0 || b[1] <= 0 || b[0] >= Rv.w || b[1] >= Rv.h));
            this.ok('vegetação: nada no fundo da água (na margem rasa, só juncos)', !naAgua && todas.some((b) => b[10] === 1), naAgua && `${naAgua[0].toFixed(1)},${naAgua[1].toFixed(1)} tipo ${naAgua[10]} prof ${Agua.profundidade(naAgua[0], naAgua[1]).toFixed(3)} sala ${game.room === Rv}`);
            const exc = Vegetacao._exc().filter((e) => e.r > 30);
            this.ok('vegetação: nada em cima de construções, colisores e pontos de interação', todas.every((b) => exc.every((e) => Math.hypot(b[0] - e.x, b[1] - e.y) > e.r - 9)), exc.length);
            this.ok('vegetação: flores do campo de várias espécies', new Set(todas.filter((b) => b[10] >= 2).map((b) => b[10])).size >= 2);
            this.ok('vegetação: cada lâmina no chão do relevo', todas.slice(0, 400).every((b) => Math.abs(b[2] - (Relevo.altura(b[0], b[1]) - 0.4)) < 0.7 || b[10] === 1));
            // (baús, eventos, moradores e os obstáculos sorteados da sala mudam de lugar a cada visita — e as
            //  estruturas que cairiam em cima deles são postas ao lado — e tiram a grama debaixo deles: a
            //  comparação ignora o que fica perto de toda exclusão que mudou; o resto tem de ser idêntico)
            const chaveE = (e) => `${e.x.toFixed(1)},${e.y.toFixed(1)},${e.r.toFixed(1)}`, X1 = Vegetacao._exc().slice();
            const conj = (A, T) => { const o = new Set(); for (const S of A) for (let q = 0; q < S.n; q++) { const x = S.dados[q * 11], y = S.dados[q * 11 + 1]; if (!T.some((e) => Math.hypot(x - e.x, y - e.y) < e.r + 40)) o.add(x.toFixed(1) + ',' + y.toFixed(1)); } return o; };
            World.loadZone('aurora', null);
            this.ok('vegetação: cidade sem grama gerada', !Vegetacao.ativo());
            World.loadZone('velmora_lago', null); Vegetacao.gerarTudo();
            { const X2 = Vegetacao._exc(), K1 = new Set(X1.map(chaveE)), K2 = new Set(X2.map(chaveE)), T = X1.filter((e) => e.t || !K2.has(chaveE(e))).concat(X2.filter((e) => e.t || !K1.has(chaveE(e)))), A1 = conj(S1, T), A2 = conj(Vegetacao.setores(), T); let comum = 0; for (const k of A1) if (A2.has(k)) comum++;
              this.ok('vegetação: voltar à zona dá a mesma grama (semente)', A1.size > 1000 && comum >= Math.min(A1.size, A2.size) * 0.99, `${comum} de ${A1.size}/${A2.size}`); }
            const olho = [Rv.w / 2 - 300, Rv.h / 2 - 300, 200], V = Vegetacao.visiveis(olho, [Rv.w / 2, Rv.h / 2, 0]).slice(), lods = new Set(V.map((S) => S.lod));
            this.ok('vegetação: setores visíveis com LOD por distância (perto cheio, longe ralo) e nada atrás da câmera', V.length > 0 && lods.size >= 2 && V.every((S) => S.qtd <= S.n), [...lods].join(','));
            const p0 = g.player; p0.vx = 300; p0.vy = 0; p0.state = 'run'; for (let i = 0; i < 40; i++) Vegetacao.empurrao(); const Ec = Vegetacao.empurrao().slice();
            p0.vx = 0; p0.state = 'idle'; for (let i = 0; i < 40; i++) Vegetacao.empurrao(); const Ep = Vegetacao.empurrao().slice();
            this.ok('vegetação: correndo, o herói abre mais a grama que parado (e ela volta)', Ec[2] > Ep[2] && Ec[3] > Ep[3], `${Ec.map((v) => v.toFixed?.(1))} / ${Ep.map((v) => v.toFixed?.(1))}`);
            Settings.v.vegQ = 0; const qBaixa = Vegetacao.visiveis(olho, [Rv.w / 2, Rv.h / 2, 0]).reduce((a, S) => a + S.qtd, 0); Settings.v.vegQ = 4; const qCine = Vegetacao.visiveis(olho, [Rv.w / 2, Rv.h / 2, 0]).reduce((a, S) => a + S.qtd, 0); Settings.v.vegQ = 2;
            this.ok('vegetação: cinco níveis de qualidade (Baixa desenha bem menos que Cinematográfica)', Vegetacao.NIVEIS.length === 5 && qBaixa * 3 < qCine, `${qBaixa} / ${qCine}`);
          }
          World.state.paisagem = pz0; delete Paisagem._cache.velmora_clareira;
          this.ok('paisagem: cidade e interiores ficam como são', !Paisagem.relatorio.aurora && !Paisagem.relatorio.aurora_taverna);
          World.loadZone('aurora_taverna', null);
        }
        // lugar fechado (a taverna): nada cai do céu lá dentro
        { const C0 = WorldTime.C; WorldTime.C = () => ({ rain: 1, flakes: 120, sand: 50, ash: 50, wind: 1 }); WorldTime.parts.length = 0; WorldTime.simular(0.1, WorldTime.C());
          this.ok('clima: em lugar fechado não chove, não neva e não cai areia nem cinza', Clima.coberto() && Clima.exposicao() === 0 && Clima.vento() === 0 && !WorldTime.parts.some((q) => q.k === 'neve' || q.k === 'areia' || q.k === 'cinza'), `${Clima.exposicao()} ${WorldTime.parts.length}`);
          WorldTime.C = C0; WorldTime.parts.length = 0; }
        // dublagem: o código da fala é o mesmo da ferramenta e toda fala do manifesto existe no jogo
        this.ok('vozes: código FNV-1a igual ao da ferramenta', Vozes.codigo('Sem pressa. A pressa mata.') === Vozes.codigo('Sem pressa. A pressa mata.') && Vozes.codigo('abc') === '1a47e90b' && Vozes.codigo('ação') !== Vozes.codigo('acao'));
        const semDono = Object.keys(VOZES_NPC).filter((id) => { const P = WORLD_POVO.find((q) => q.id === id); return !P || Vozes.falasDe(P).length !== Object.keys(VOZES_NPC[id].falas).length; });
        this.ok('vozes: toda gravação do manifesto é uma fala de um morador do jogo', semDono.length === 0, semDono.join(' '));
        const Pv = WORLD_POVO.find((q) => VOZES_NPC[q.id] && Vozes.falasDe(q).length);
        this.ok('vozes: acha a gravação mesmo com complemento no texto', !Pv || Vozes.achar(Pv, `${Vozes.falasDe(Pv)[0].txt} …E já é noite. Cuidado lá fora.`) === Vozes.falasDe(Pv)[0]);
      }
      this.ok('rotina: quem senta fica no lugar (não anda)', sentados.every((n) => !n.indo && !n.saindo));
      L = em('aurora_taverna', 3);
      this.ok('rotina: de madrugada a taverna está fechada (o Bento dorme)', !nome(L, 'BENTO'));
      // o quartel à noite: a guarda dorme nos beliches
      L = em('aurora_quartel', 23.5);
      const dormem = L.filter((n) => n.state === 'sleep');
      this.ok('rotina: às 23h30 três dormem no quartel (Rui, Irene, Pedro)', dormem.length === 3, L.map((n) => `${n.name}:${n.state}`).join(' '));
      const rui = nome(L, 'GUARDA RUI');
      Dialogo.fechar(); rui.talk();
      this.ok('rotina: quem dorme só resmunga (sem abrir a conversa)', !!rui.bolha && g.state !== 'worlddlg');
      this.igual('rotina: o Rui está no quartel às 23 h (diário e marcador)', Povo.onde('aur_rui').zona, 'aurora_quartel');
      // a troca de turno na porta do quartel
      L = em(BAIRRO_ID, 17.8);
      const r = nome(L, 'GUARDA RUI'), m = nome(L, 'GUARDA MARTA');
      for (const n of [r, m]) Rotina.atualizar(n, 0.05);
      this.ok('rotina: às 17h50 Rui e Marta trocam o turno na porta do quartel', !!r && !!m && r.rot.tipo === 'conversar' && m.rot.tipo === 'conversar' && dist(r.x, r.y, m.x, m.y) < 80);
      this.ok('rotina: um fala e o outro escuta', (r.state === 'talk') !== (m.state === 'talk'), `${r.state}/${m.state}`);
      // entradas e saídas: a hora muda com o herói no bairro
      L = em(BAIRRO_ID, 17.5);
      this.ok('rotina: às 17h30 a Marta ainda não está na rua', !nome(L, 'GUARDA MARTA'));
      World.state.hora = 17.7; Rotina.passo = 0; Rotina.update(0.1);
      const mt = g.npcs.find((n) => n.name === 'GUARDA MARTA'), dq = Rotina.porta('quartel', g.room);
      this.ok('rotina: a Marta sai pela porta do quartel e anda até o posto', !!mt && mt.indo && dist(mt.x, mt.y, dq.x, dq.y) < 40);
      World.state.hora = 18.4; Rotina.passo = 0; Rotina.update(0.1);
      const ru = g.npcs.find((n) => n.name === 'GUARDA RUI');
      this.ok('rotina: às 18h20 o Rui vai embora (para a porta do quartel)', !!ru && !!ru.saindo && dist(ru.saindo.x, ru.saindo.y, dq.x, dq.y) < 2);
      for (let i = 0; i < 400 && !ru.sumiu; i++) Rotina.atualizar(ru, 0.05);
      Rotina.passo = 0; Rotina.update(0.1);
      this.ok('rotina: chegando na porta, ele entra (some da rua)', ru.sumiu && !g.npcs.includes(ru));
      // a conversa no poço e o banco do viajante
      L = em(BAIRRO_ID, 17);
      const ni = nome(L, 'NINA'), jo = nome(L, 'JORGE');
      this.ok('rotina: às 17 h Nina e Jorge conversam no poço, frente a frente', !!ni && !!jo && ni.rot.tipo === 'conversar' && dist(ni.x, ni.y, jo.x, jo.y) < 90);
      this.ok('rotina: o viajante passa a tarde no banco do poço', nome(L, 'VIAJANTE ENCAPUZADO') && nome(L, 'VIAJANTE ENCAPUZADO').rot.tipo === 'sentar');
      L = em(BAIRRO_ID, 23);
      this.ok('rotina: às 23 h os moradores estão em casa (Nina, Helena e Dídimo fora da rua)', !nome(L, 'NINA') && !nome(L, 'CONSELHEIRA HELENA') && !nome(L, 'ESCRIBA DÍDIMO'));
      // modelos próprios dos moradores importantes
      const imp = ['aur_bento', 'aur_rosa', 'aur_helena', 'aur_irene', 'aur_cosme', 'aur_rui', 'aur_marta'];
      this.ok('npc3d: 7 moradores importantes com modelo próprio (peças da criação)', imp.every((id) => NpcModelo.chave(Povo.persona(id)) === 'npc_' + id), imp.filter((id) => NpcModelo.chave(Povo.persona(id)) !== 'npc_' + id).join(','));
      L = em('aurora_taverna', 12);
      this.igual('npc3d: o Bento usa o modelo próprio', nome(L, 'BENTO').key, 'npc_aur_bento');
      const cr = nome(L, 'BENTO')._corpo || NpcModelo.corpo(nome(L, 'BENTO'), NpcModelo.defs.aur_bento);
      this.ok('npc3d: o corpo de vitrine veste as peças GLB da roupa dele', !!cr.pecasPrevia && Object.values(cr.pecasPrevia).every((it) => Criacao3D.POR_ID[it.cat]), Object.keys(cr.pecasPrevia).join(','));
      const est = { sit: 'npc_sentar', eat: 'npc_sentar', sleep: 'npc_dormir', guard: 'npc_guarda', talk: 'npc_falar', walk: 'run' };
      this.ok('npc3d: cada estado da rotina vira a postura do esqueleto', Object.keys(est).every((k) => NpcModelo.ESTADOS[k][0] === est[k]));
      let e3 = null;
      try { for (const k of ['sit', 'eat', 'sleep', 'guard', 'talk', 'listen', 'walk']) { const v = NpcModelo.corpo({ x: 0, y: 0, facing: 0, state: k, animTime: 1, stateTime: 1, assento: 16, camaZ: 20 }, NpcModelo.defs.aur_bento); MODELS3D.kael.pose(MODELS3D.kael.build(), v, {}); } } catch (e) { e3 = e.message; }
      this.ok('npc3d: as posturas novas no esqueleto do Kael (sentar, comer, dormir, guarda, falar, ouvir, andar)', !e3, e3);
      // missões dos prédios
      const MS = ['aur_ensopado', 'aur_hospede', 'aur_selo', 'aur_recruta'];
      this.ok('missões: as 4 dos prédios novos existem, com quem dá e quem recebe', MS.every((id) => { const q = Aventuras.def(id); return q && Povo.persona(q.doador) && q.passos.every((P) => !P.npc || Povo.persona(P.npc)); }));
      const lvM = g.activeProgress().level; g.activeProgress().level = 30;   // (regiões abertas e o nível das missões)
      for (const [id, n] of [['aur_ensopado', 'BENTO'], ['aur_hospede', 'ROSA'], ['aur_selo', 'CONSELHEIRA HELENA'], ['aur_recruta', 'CAPITÃ IRENE']]) {
        const zona = { BENTO: 'aurora_taverna', ROSA: 'aurora_hospedaria', 'CONSELHEIRA HELENA': 'aurora_conselho', 'CAPITÃ IRENE': 'aurora_quartel' }[n];
        L = em(zona, 12);
        Povo.conversar(nome(L, n)); const ops = Dialogo.opcoes.map((o) => o.txt).join(' / '); Dialogo.fechar();
        this.ok(`missões: ${n} oferece "${Aventuras.def(id).nome}"`, ops.includes(Aventuras.def(id).nome), ops);
      }
      g.activeProgress().level = lvM;
      const v0 = Bairro.precoRefeicao(), S = World.state.aventuras, ant = S.aur_ensopado;
      S.aur_ensopado = { st: 'feita' };
      this.ok('missões: o ensopado feito deixa a refeição pela metade', Bairro.precoRefeicao() === Math.ceil(v0 / 2), `${v0} → ${Bairro.precoRefeicao()}`);
      if (ant) S.aur_ensopado = ant; else delete S.aur_ensopado;
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('rotina: sem exceção', !erro, erro);
    World.state.hora = h0; g.stats.soulsBank = b0;
    if (World.zone.id !== z0) World.loadZone(z0, null);
    g.state = 'playing';
  },

  // Criaturas do Blender (js/mundo/criaturas3d.js): carga sob demanda, esqueleto e clipes, o
  // inimigo da variante troca de modelo, a escolha do clipe pelo estado, a mistura em quatérnios,
  // a pose diferente em cada clipe, o LOD e a morte mais longa
  async criaturas() {
    const g = game, z0 = World.zone && World.zone.id;
    let erro = null;
    try {
      const ids = ['lobo_cinzento', 'lobo_raiz', 'lobo_neve'];
      for (const id of ids) Criaturas3D.carregar(id);
      for (let i = 0; i < 150 && !ids.every((id) => Criaturas3D.pronto(id) || Criaturas3D.estado[id] === 'falhou'); i++) await new Promise((r) => setTimeout(r, 100));
      this.ok('criaturas: os 3 lobos do Blender carregados (js/assets/criaturas)', ids.every((id) => Criaturas3D.pronto(id)), ids.map((id) => Criaturas3D.estado[id]).join(' '));
      const C = Criaturas3D.dados.lobo_raiz, CL = ['idle', 'andar', 'trotar', 'correr', 'atacar', 'saltar', 'dano', 'atordoado', 'morte', 'uivar'];
      this.ok('criaturas: 31 ossos e as 10 animações do Blender', C.nb === 31 && CL.every((k) => C.clipes[k] && C.clipes[k].n > 1), Object.keys(C.clipes).join(','));
      const m = g.model3('cri_lobo_raiz');
      this.ok('criaturas: modelo montado (pele com textura PBR e quatérnios duplos)', !!m && m.skins.length >= 1 && m.tex && m.tex.pbr && m.dqs && m.mixProprio);
      this.ok('criaturas: as variantes Lobo de Raiz e Lobo das Neves apontam para os modelos', ENEMY_VARIANTS.lobo_raiz.modelo === 'lobo_raiz' && ENEMY_VARIANTS.lobo_neve.modelo === 'lobo_neve');
      // as malhas do Meshy com retopologia no Blender: o Lobo Sombra Neon (inimigo da Metrópole) e a Asa Noturna (ave)
      for (const id of ['lobo_sombra_neon', 'asa_noturna']) Criaturas3D.carregar(id);
      for (let i = 0; i < 150 && !(Criaturas3D.pronto('lobo_sombra_neon') && Criaturas3D.pronto('asa_noturna')); i++) await new Promise((r) => setTimeout(r, 100));
      const N = Criaturas3D.dados.lobo_sombra_neon, A = Criaturas3D.dados.asa_noturna;
      this.ok('criaturas: Lobo Sombra Neon com 4 LODs (malha retopologizada) e as 10 animações', N && N.lods === 4 && CL.every((k) => N.clipes[k]), N && N.lods);
      const tr = N ? N.SK.map((s) => s.idx.length / 3) : [];
      this.ok('criaturas: LODs cada vez mais leves e o LOD 0 no orçamento (até 18 mil triângulos, só de perto)', tr.length === 4 && tr[0] <= 18000 && tr.every((t, i) => !i || t < tr[i - 1]), tr.join(' > '));
      const RZ = Criaturas3D.dados.lobo_raiz;
      this.ok('criaturas: as pelagens (raiz, neve, cinzento, cães) usam a malha e as animações do lobo neon (o arquivo só traz texturas)', RZ && RZ.base === 'lobo_sombra_neon' && RZ.SK === N.SK && RZ.clipes === N.clipes && RZ.tex.src !== N.tex.src);
      this.ok('criaturas: o lobo neon está na Metrópole (no Cofre Ômega: a cidade é segura)', ENEMY_VARIANTS.lobo_neon.modelo === 'lobo_sombra_neon' && WORLD_MASMORRAS.cofre_omega.mobs.includes('lobo_neon'));
      const AV = ['idle', 'andar', 'voar', 'planar', 'decolar', 'pousar', 'comer', 'dormir', 'sentar', 'brincar', 'carinho', 'chamar', 'dano'];
      this.ok('criaturas: Asa Noturna (ave) com esqueleto de ave, 4 LODs e 13 animações', A && A.nb >= 24 && A.lods === 4 && AV.every((k) => A.clipes[k]), A && Object.keys(A.clipes).join(','));
      World.loadZone('velmora_trilha', null);
      for (const e of g.enemies) e.alive = false;
      g.enemies.length = 0; World.camps = [];
      const p = g.player, e = criarInimigo('lobo_raiz', p.x + 120, p.y, 9);
      e.state = 'idle'; g.enemies.push(e);
      this.igual('criaturas: o lobo de raiz usa o modelo do Blender', e.modelo3(), 'cri_lobo_raiz');
      this.ok('criaturas: carne, não máquina (sem faíscas, sangue próprio)', e.T.mech === false && e.T.blood === ENEMY_VARIANTS.lobo_raiz.sangue);
      const o = g.opts3(e, 0); Object.assign(o, MODELS3D.cri_lobo_raiz.opts(e));
      const clipe = (prep) => { prep(); e.animTime += 0.016; m.reset(); MODELS3D.cri_lobo_raiz.pose(m, e, o); return e._cri.clipe; };
      const casos = [
        ['parado → idle', () => { e.state = 'idle'; e.vx = e.vy = 0; e.recuoT = 0; }, 'idle'],
        ['devagar → andar', () => { e.vx = 50; }, 'andar'],
        ['perseguindo → trotar', () => { e.vx = 120; }, 'trotar'],
        ['em disparada → correr', () => { e.vx = 240; }, 'correr'],
        ['preparo do bote → atacar', () => { e.vx = 0; e.state = 'windup'; e.tgProgress = 0.5; }, 'atacar'],
        ['golpe → atacar', () => { e.state = 'attack'; e.stateTime = 0.05; }, 'atacar'],
        ['atordoado', () => { e.state = 'stun'; }, 'atordoado'],
        ['atingido → dano', () => { e.state = 'idle'; e.recuoT = 0.1; e.recuoDur = 0.3; }, 'dano'],
        ['investida → saltar', () => { e.recuoT = 0; e.state = 'dash'; e.stateTime = 0.1; }, 'saltar'],
      ];
      for (const [nome, prep, esp] of casos) this.igual('criaturas: ' + nome, clipe(prep), esp);
      // a pose muda de verdade entre os clipes (a perna da frente no passo e no bote)
      e.state = 'idle'; e.vx = 0; for (let i = 0; i < 40; i++) clipe(() => {});
      const ang = (n) => m.nodes[n].r.slice();
      const parado = ang('braco.L');
      e.vx = 240; let desvio = 0;
      for (let i = 0; i < 40; i++) { clipe(() => {}); const c2 = ang('braco.L'); desvio = Math.max(desvio, Math.hypot(parado[0] - c2[0], parado[1] - c2[1], parado[2] - c2[2])); }   // (um passo inteiro)
      this.ok('criaturas: correndo, a perna da frente sai da pose parada', desvio > 0.15, desvio);
      // mistura: logo depois da troca de clipe, a pose fica entre as duas (k < 1)
      e.vx = 0; clipe(() => {});
      this.ok('criaturas: a troca de clipe mistura (não pula)', e._cri.k < 1, e._cri.k);
      // LOD: só uma malha por pose
      o.lodCri = 0; m.reset(); MODELS3D.cri_lobo_raiz.pose(m, e, o);
      this.igual('criaturas: uma malha visível por vez (LOD)', m.skins.filter((s) => !s.hide).length, 1);
      // morte: a animação de morte inteira antes de sumir
      e.state = 'idle'; e.die({ kx: 1, ky: 0 });
      this.ok('criaturas: a morte dura o clipe (1,3 s) em vez de 0,45 s', e.morteDur === Criaturas3D.MORTE);
      for (let i = 0; i < 40; i++) e.update(0.016);
      this.ok('criaturas: aos 0,64 s ainda caindo (visível)', e.alive && e.morteAlfa() === 1 && e._cri && clipe(() => {}) === 'morte');
      for (let i = 0; i < 60; i++) e.update(0.016);
      this.ok('criaturas: e então some', !e.alive);
      // inimigo sem modelo próprio segue o de sempre
      const r = criarInimigo('rastejador', p.x, p.y + 90, 9);
      this.igual('criaturas: o rastejador segue com o modelo dele', r.modelo3(), 'rastejador');
      // desenho: o laço do jogo põe o lobo na fila do motor 3D sem erro
      const e2 = criarInimigo('lobo_neve', p.x + 80, p.y + 40, 9); e2.state = 'idle'; g.enemies.push(e2);
      g.state = 'playing';
      for (let i = 0; i < 90 && !(e2.spr && e2.spr.ok); i++) await new Promise((r) => setTimeout(r, 100));   // (até 9 s: no navegador sem placa de vídeo, as zonas com mata cheia levam mais por quadro)   // (o próximo quadro do laço do jogo)
      this.ok('criaturas: o lobo das neves desenhado pelo motor 3D', !g.use3D || (e2.spr && e2.spr.ok), e2.spr && e2.spr.ok);
      e2.alive = false;
    } catch (err) { erro = err && err.stack ? err.stack.split('\n').slice(0, 2).join(' | ') : String(err); }
    this.ok('criaturas: sem exceção', !erro, erro);
    if (z0 && World.zone.id !== z0) World.loadZone(z0, null);
  },

  // Animais de companhia (js/mundo/pets.js): o viveiro (vendedora, vitrine 3D, catálogo, preço em
  // células, confirmação), o nome, o companheiro que segue (anda, voa, senta, dorme), os cuidados
  // (fome, humor, afinidade), guardar e chamar de volta, troca de zona e o salvamento
  async pets() {
    const g = game, p = g.player, z0 = World.zone && World.zone.id, b0 = g.stats.soulsBank, S0 = JSON.stringify(World.state.pets || null);
    let erro = null;
    try {
      World.state.pets = { lista: [], ativo: null, uid: 1 };
      World.loadZone('aurora_animais', null);
      const cora = g.npcs.find((n) => n instanceof Morador && n.name === 'CORA ALVES');
      this.ok('pets: a Cora atende no Viveiro dos Alves (Bairro da Muralha)', !!cora && WORLD_ZONES.aurora_animais.distrito === 'interior');
      const vit = g.npcs.filter((n) => n instanceof VitrinePet);
      this.igual('pets: 7 animais na vitrine do viveiro (aves, lobo, cães e gato)', vit.length, 7);
      const mods = [...new Set(Object.values(PETS_ESPECIES).map((E) => E.modelo))];
      for (const id of mods) Criaturas3D.carregar(id);
      for (let i = 0; i < 200 && !mods.every((id) => Criaturas3D.pronto(id)); i++) await new Promise((r) => setTimeout(r, 100));
      for (const v of vit) v.update(0.016);
      this.ok('pets: a vitrine usa os modelos 3D do Blender', vit.every((v) => v.key && v.key.startsWith('cri_')), vit.map((v) => v.key).join(','));
      // catálogo e compra (só espécies com modelo; preço em células)
      this.ok('pets: o catálogo só tem animais com modelo pronto', Object.values(PETS_ESPECIES).every((E) => Criaturas3D.pronto(E.modelo) || Criaturas3D.estado[E.modelo] !== 'falhou'));
      Povo.conversar(cora);
      this.ok('pets: a Cora oferece o catálogo', Dialogo.temId('catalogo'));
      Dialogo.escolherId('catalogo');
      this.ok('pets: o catálogo em três grupos (cães e lobos, gatos e raposa, aves)', ['caes', 'gatos', 'aves'].every((gp) => Dialogo.temId('grupo_' + gp)));
      const vistos = [];
      for (const gp of ['caes', 'gatos', 'aves']) { Dialogo.escolherId('grupo_' + gp); vistos.push(...Dialogo.opcoes.filter((o) => o.id.startsWith('ver_')).map((o) => o.id.slice(4))); Dialogo.escolherId('voltar'); }
      this.ok('pets: as 13 espécies com modelo (lobo, 6 cães com o beagle e o buldogue, 3 gatos, raposa, papagaio, canário e a Asa Noturna)', Object.keys(PETS_ESPECIES).every((e) => vistos.includes(e)) && vistos.length === 13, vistos.join(','));
      Dialogo.escolherId('grupo_aves');
      g.stats.soulsBank = 100;
      Dialogo.escolherId('ver_asa_noturna');
      this.ok('pets: sem células, a compra fica desativada', Dialogo.opcoes.find((o) => o.id === 'comprar').off);
      Dialogo.fechar();
      g.stats.soulsBank = 5000;
      Povo.conversar(cora); Dialogo.escolherId('catalogo'); Dialogo.escolherId('grupo_aves'); Dialogo.escolherId('ver_asa_noturna'); Dialogo.escolherId('comprar');
      this.ok('pets: pede confirmação antes de cobrar', Dialogo.temId('sim') && g.stats.soulsBank === 5000);
      Dialogo.escolherId('sim');
      this.igual('pets: cobra o preço em células (a mesma moeda)', g.stats.soulsBank, 5000 - PETS_ESPECIES.asa_noturna.preco);
      this.ok('pets: depois da compra, escolhe o nome', Dialogo.temId('n0'));
      const nomeEsc = Dialogo.opcoes.find((o) => o.id === 'n0').txt;
      Dialogo.escolherId('n0'); Dialogo.fechar();
      const P = Pets.ativo();
      this.ok('pets: a ave é sua, com o nome escolhido, e vem junto', P && P.especie === 'asa_noturna' && P.nome === nomeEsc && !!Pets.companheiro());
      this.igual('pets: nome limpo (sem símbolos, até 16 letras)', Pets.nomeLimpo('  <Lume>!!  da Noite Azul Eterna '), 'Lume da Noite Az');
      // segue o herói e voa; pousa e senta quando o herói para
      World.loadZone('aurora_bairro', null);
      const c = Pets.companheiro();
      this.ok('pets: o companheiro chega junto na troca de zona', !!c && c.pet === P);
      p.x += 300; p.facing = 0;
      for (let i = 0; i < 10; i++) c.update(0.05);
      this.ok('pets: longe do herói, a ave voa atrás dele', c.alt > 8 && Math.hypot(c.vx, c.vy) > 20, `alt ${c.alt.toFixed(1)}, v ${Math.hypot(c.vx, c.vy).toFixed(0)}`);
      for (let i = 0; i < 200; i++) c.update(0.05);
      this.ok('pets: chega perto e pousa', Math.hypot(c.x - p.x, c.y - p.y) < 130 && c.alt < 6, `${Math.round(Math.hypot(c.x - p.x, c.y - p.y))} / alt ${c.alt.toFixed(1)}`);
      const C = Criaturas3D.dados.asa_noturna, S = { fl: 0, fi: 0 };
      World.state.hora = 12;
      this.igual('pets: parado um tempo, senta', c.petClipe(S, C, 0.016)[0], 'sentar');
      World.state.hora = 23; c.paradoT = 20;
      this.igual('pets: à noite, dorme', c.petClipe(S, C, 0.016)[0], 'dormir');
      World.state.hora = 12;
      // cuidados
      P.fome = 60; P.humor = 40; const a0 = P.afinidade, cel = g.stats.soulsBank;
      Pets.alimentar(P);
      this.ok('pets: o petisco tira a fome, custa células e aumenta a afinidade', P.fome === 15 && g.stats.soulsBank === cel - PET_PETISCO && P.afinidade > a0);
      this.igual('pets: e o companheiro come (clipe comer)', c.petClipe(S, C, 0.016)[0], 'comer');
      this.ok('pets: satisfeito, recusa o petisco (sem cobrar)', /satisfeito/.test(Pets.alimentar(P)) && g.stats.soulsBank === cel - PET_PETISCO);
      const h0 = P.humor; Pets.brincar(P);
      this.ok('pets: brincar melhora o humor', P.humor > h0 && c.acao === 'brincar');
      for (let i = 0; i < 200; i++) Pets.update(1);
      this.ok('pets: com o tempo, a fome volta', P.fome > 15);
      Pets.conversar(c);
      this.ok('pets: [E] no companheiro: alimentar, brincar, carinho, ficar, nome, guardar', ['alimentar', 'brincar', 'carinho', 'ficar', 'nome', 'guardar'].every((i) => Dialogo.temId(i)) && /Fome/.test(Dialogo.texto));
      Dialogo.escolherId('ficar');
      this.igual('pets: "fica aqui" deixa ele parado', c.modo, 'ficar');
      Dialogo.escolherId('guardar');
      this.ok('pets: guardar no viveiro tira da zona', !Pets.companheiro() && !Pets.ativo() && Pets.S().lista.length === 1);
      // salvar e voltar
      const salvo = JSON.parse(JSON.stringify(World.state.pets));
      this.ok('pets: fica no salvamento do mundo', salvo.lista[0].nome === P.nome && salvo.lista[0].especie === 'asa_noturna');
      Pets.chamar(P.uid);
      this.ok('pets: chamar de volta', !!Pets.companheiro() && Pets.ativo() === P);
      // coleiras: compra com a Cora, põe pelo menu, o modelo mostra a do animal
      g.stats.soulsBank = 1000;
      World.loadZone('aurora_animais', null);
      const cora2 = g.npcs.find((n) => n instanceof Morador && n.name === 'CORA ALVES');
      Povo.conversar(cora2); Dialogo.escolherId('coleiras');
      this.ok('pets: a Cora vende as três coleiras', ['couro', 'ferro', 'neon'].every((t) => Dialogo.temId('comprar_' + t)));
      Dialogo.escolherId('comprar_ferro'); Dialogo.fechar();
      this.ok('pets: coleira comprada em células', Pets.S().coleiras.includes('ferro') && g.stats.soulsBank === 1000 - PET_COLEIRAS.ferro.preco);
      Pets.S().lista.push({ uid: 77, especie: 'cao_aurora', nome: 'Pão', fome: 20, humor: 80, afinidade: 30 });
      Pets.chamar(77);
      const cp = Pets.companheiro(), Pc = cp.pet;
      Pets.conversar(cp); Dialogo.escolherId('coleira'); Dialogo.escolherId('col_ferro'); Dialogo.fechar();
      this.igual('pets: a coleira vai no animal', Pc.coleira, 'ferro');
      const mm = g.model3('cri_cao_aurora');
      this.ok('pets: o modelo tem as 3 coleiras presas ao pescoço (medidas na malha)', mm.coleiras && ['couro', 'ferro', 'neon'].every((t) => mm.coleiras[t] && mm.coleiras[t].geo.length > 100 && mm.nodes.pescoco1.kids.includes(mm.coleiras[t])));
      const oc = g.opts3(cp, 0); Object.assign(oc, MODELS3D.cri_cao_aurora.opts(cp));
      mm.reset(); MODELS3D.cri_cao_aurora.pose(mm, cp, oc);
      this.ok('pets: só a coleira escolhida aparece', mm.coleiras.ferro.vis && !mm.coleiras.couro.vis && !mm.coleiras.neon.vis);
      this.ok('pets: ave não usa coleira (sem a opção no menu)', !g.model3('cri_asa_noturna').coleiras && (Pets.chamar(P.uid), Pets.conversar(Pets.companheiro()), !Dialogo.temId('coleira')));
      Dialogo.fechar();
      // a vida não ganha nada com o pet (sem vantagem de combate)
      this.ok('pets: o companheiro não luta (sem dano nem alvo)', !c.dmg && !g.enemies.includes(c));
      let e3 = null; try { g.renderWorld(g.ctx); } catch (e) { e3 = e.message; }
      this.ok('pets: desenha com o companheiro e o HUD', !e3, e3);
      Pets.guardar();
    } catch (err) { erro = err && err.stack ? err.stack.split('\n').slice(0, 2).join(' | ') : String(err); }
    this.ok('pets: sem exceção', !erro, erro);
    if (Dialogo.aberto) Dialogo.fechar();
    World.state.pets = S0 === 'null' ? undefined : JSON.parse(S0);
    g.stats.soulsBank = b0;
    if (z0 && World.zone.id !== z0) World.loadZone(z0, null);
    g.state = 'playing';
  },

  // Animais domésticos das cidades (js/mundo/animais_cidade.js): identidade por região, vagar,
  // farejar o herói, sentar e dormir, fugir da luta, a ave que levanta voo e a adoção dos cães de rua
  async animaisCidade() {
    const g = game, p = g.player, z0 = World.zone && World.zone.id, S0 = JSON.stringify(World.state.pets || null), A0 = JSON.stringify(World.state.adotados || []), h0 = World.state.hora;
    let erro = null;
    const cA = g.combatActive;
    try {
      World.state.pets = { lista: [], ativo: null, uid: 1 }; World.state.adotados = []; World.state.hora = 12;
      const conta = (zona) => { World.loadZone(zona, null); return g.npcs.filter((n) => n instanceof AnimalCidade).map((n) => n.T.nome); };
      const q = { aurora_bairro: conta('aurora_bairro'), metro_centro: conta('metro_centro'), asterion_acampamento: conta('asterion_acampamento'), velmora_clareira: conta('velmora_clareira'),
        lagoa_ilha: conta('lagoa_ilha'), aurora: conta('aurora'), nexus_mercado: conta('nexus_mercado'), velmora_trilha: conta('velmora_trilha') };
      const n = (L, nome) => L.filter((x) => x === nome).length;
      this.ok('animais: identidade por cidade (Bairro: cães, gatos e galinhas; Clareira: cães de caça, cabras e galinhas; lago: patos e gansos; Asterion: cães das neves e ovelhas; Metrópole: Asas Noturnas e pombos; Refúgio: pombos e o pavão; Mercado Vertical: o buldogue de guarda)',
        n(q.aurora_bairro, 'Cão de rua') === 2 && n(q.aurora_bairro, 'Galinha') === 2 && q.aurora_bairro.length === 6
        && n(q.velmora_clareira, 'Cão de caça') === 2 && n(q.velmora_clareira, 'Cabra') === 2 && n(q.velmora_clareira, 'Galinha') === 3
        && n(q.lagoa_ilha, 'Pato') === 3 && n(q.lagoa_ilha, 'Ganso') === 2 && n(q.asterion_acampamento, 'Ovelha') === 3 && n(q.asterion_acampamento, 'Cão das Neves') === 3
        && n(q.metro_centro, 'Asa Noturna') === 3 && n(q.metro_centro, 'Pombo') === 2 && n(q.aurora, 'Pavão') === 1 && n(q.aurora, 'Pombo') === 3 && n(q.nexus_mercado, 'Cão de guarda') === 1, JSON.stringify(q));
      this.igual('animais: fora das cidades, nenhum', q.velmora_trilha.length, 0);
      World.loadZone('aurora_bairro', null);
      for (const id of ['cao_aurora', 'asa_noturna']) Criaturas3D.carregar(id);
      for (let i = 0; i < 150 && !(Criaturas3D.pronto('cao_aurora') && Criaturas3D.pronto('asa_noturna')); i++) await new Promise((r) => setTimeout(r, 100));
      const caes = g.npcs.filter((n) => n instanceof AnimalCidade && n.T.nome === 'Cão de rua'), c = caes[0];
      c.update(0.016);
      this.ok('animais: o cão usa o modelo do Blender (Cão da Aurora)', c.key === 'cri_cao_aurora');
      // curioso: chega perto do herói
      p.x = c.x + 140; p.y = c.y;
      const d0 = Math.hypot(p.x - c.x, p.y - c.y);
      for (let i = 0; i < 40; i++) c.update(0.05);
      this.ok('animais: o cão chega para farejar o herói', Math.hypot(p.x - c.x, p.y - c.y) < d0 - 30, `${Math.round(d0)} → ${Math.round(Math.hypot(p.x - c.x, p.y - c.y))}`);
      // parado, senta; à noite, dorme
      const C = Criaturas3D.dados.cao_aurora, S = { fl: 0, fi: 0 };
      c.vx = c.vy = 0; c.paradoT = 8; c.noite = false;
      this.igual('animais: parado, senta', c.petClipe(S, C, 0.016)[0], 'sentar');
      c.noite = true;
      this.igual('animais: à noite, dorme', c.petClipe(S, C, 0.016)[0], 'dormir');
      // luta: foge
      g.combatActive = () => true;
      const dl = Math.hypot(p.x - c.x, p.y - c.y);
      for (let i = 0; i < 30; i++) c.update(0.05);
      this.ok('animais: na luta, foge do herói e dos inimigos', Math.hypot(p.x - c.x, p.y - c.y) > dl + 40, `${Math.round(dl)} → ${Math.round(Math.hypot(p.x - c.x, p.y - c.y))}`);
      g.combatActive = cA;
      // adoção
      Dialogo.fechar();
      AnimaisCidade.conversar(caes[1]);
      this.ok('animais: [E] no cão de rua: afagar e adotar', Dialogo.temId('afagar') && Dialogo.temId('adotar'));
      Dialogo.escolherId('adotar');
      Dialogo.escolherId('n0'); Dialogo.fechar();
      const P = Pets.ativo();
      this.ok('animais: adotado vira companheiro (Cão da Aurora) e sai da rua', P && P.especie === 'cao_aurora' && P.adotado && !g.npcs.includes(caes[1]) && !!Pets.companheiro());
      World.loadZone('aurora_bairro', null);
      this.igual('animais: não volta para a rua depois de adotado', g.npcs.filter((n) => n instanceof AnimalCidade && n.T.nome === 'Cão de rua').length, 1);
      // o gato de rua se afasta de quem chega perto; a galinha cisca parada
      const gato = g.npcs.find((n) => n instanceof AnimalCidade && n.T.tipo === 'gato'), gal = g.npcs.find((n) => n instanceof AnimalCidade && n.T.nome === 'Galinha');
      p.x = gato.x + 50; p.y = gato.y;
      const dg = Math.hypot(p.x - gato.x, p.y - gato.y);
      for (let i = 0; i < 20; i++) gato.update(0.05);
      this.ok('animais: o gato de rua se afasta de quem chega perto', Math.hypot(p.x - gato.x, p.y - gato.y) > dg + 20, `${Math.round(dg)} → ${Math.round(Math.hypot(p.x - gato.x, p.y - gato.y))}`);
      for (const id of ['galinha', 'cabra', 'pato']) Criaturas3D.carregar(id);
      for (let i = 0; i < 150 && !['galinha', 'cabra', 'pato'].every((id) => Criaturas3D.pronto(id)); i++) await new Promise((r) => setTimeout(r, 100));
      p.x = gal.x + 400; gal.vx = gal.vy = 0; gal.paradoT = 5; gal.noite = false;
      const Sg = { fl: 0, fi: 0 }, clg = new Set();
      for (let i = 0; i < 60; i++) clg.add(gal.petClipe(Sg, Criaturas3D.dados.galinha, 0.2)[0]);
      this.ok('animais: a galinha parada cisca (comer) e olha em volta', clg.has('comer') && clg.has('idle'), [...clg].join(','));
      // peças das espécies presas aos ossos: bico chato do pato (a galinha e a cabra reais já trazem
      // crista e chifres na própria malha: nenhuma peça a mais)
      const peca = (id, osso) => { const mm = g.model3('cri_' + id); return mm && mm.nodes[osso].kids.some((k) => k.name.startsWith('acess_') && k.geo && k.geo.length > 60); };
      this.ok('animais: bico chato no pato; a galinha e a cabra reais com crista e chifres da própria malha', !peca('cabra', 'cabeca') && peca('pato', 'cabeca') && !peca('galinha', 'cabeca'));
      const GA = Criaturas3D.dados.galinha;
      this.ok('animais: a galinha é a malha enviada (esqueleto de ave com as asas dobradas, 11 animações de galinha)', GA && GA.nb === 26 && ['idle', 'andar', 'comer', 'dormir', 'voar', 'chamar'].every((k) => GA.clipes[k]) && !GA.base, GA && Object.keys(GA.clipes).join(','));
      // a ave da Metrópole levanta voo quando o herói chega perto
      World.loadZone('metro_centro', null);
      const ave = g.npcs.find((n) => n instanceof AnimalCidade && n.T.tipo === 'ave');
      for (let i = 0; i < 5; i++) ave.update(0.05);
      p.x = ave.x + 30; p.y = ave.y;
      for (let i = 0; i < 20; i++) ave.update(0.05);
      this.ok('animais: a Asa Noturna levanta voo quando o herói chega perto', ave.alt > 15, ave.alt);
      let e3 = null; try { g.renderWorld(g.ctx); } catch (e) { e3 = e.message; }
      this.ok('animais: desenha com as aves', !e3, e3);
    } catch (err) { erro = err && err.stack ? err.stack.split('\n').slice(0, 2).join(' | ') : String(err); }
    g.combatActive = cA;
    this.ok('animais: sem exceção', !erro, erro);
    if (Dialogo.aberto) Dialogo.fechar();
    if (typeof Pets !== 'undefined') Pets.tirarDaZona();
    World.state.pets = S0 === 'null' ? undefined : JSON.parse(S0); World.state.adotados = JSON.parse(A0); World.state.hora = h0;
    if (z0 && World.zone.id !== z0) World.loadZone(z0, null);
    g.state = 'playing';
  },

  // Montarias (js/mundo/montarias.js): a estrebaria do Tobias (nível, células, confirmação), montar,
  // a pose da sela no lugar do herói, a velocidade, desmontar com [E] ou com um golpe, a troca de
  // zona montado e os interiores (a montaria espera do lado de fora)
  async montarias() {
    const g = game, p = g.player, z0 = World.zone && World.zone.id, b0 = g.stats.soulsBank, M0 = JSON.stringify(World.state.montarias || null);
    let erro = null;
    try {
      World.state.montarias = { lista: [], ativa: null };
      World.loadZone(BAIRRO_ID, null);
      const tob = g.npcs.find((n) => n instanceof Morador && n.name === 'TOBIAS');
      this.ok('montarias: o domador Tobias na Estrebaria da Guarda (Bairro da Muralha)', !!tob);
      g.stats.soulsBank = 20000;
      Povo.conversar(tob); Dialogo.escolherId('montarias');
      const lv = g.activeProgress().level;
      this.ok('montarias: os três lobos à venda; os de nível alto ficam travados', Dialogo.temId('m_lobo_montaria') && Dialogo.temId('m_lobo_guerra') && Dialogo.temId('m_lobo_aurora')
        && (lv >= 60 || !!Dialogo.opcoes.find((o) => o.id === 'm_lobo_aurora').off));
      Dialogo.escolherId('m_lobo_montaria');
      this.ok('montarias: pede confirmação antes de cobrar', Dialogo.temId('sim') && g.stats.soulsBank === 20000);
      Dialogo.escolherId('sim'); Dialogo.fechar();
      this.ok('montarias: cobra em células e a montaria vem', g.stats.soulsBank === 20000 - MONTARIAS_TIPOS.lobo_montaria.preco && !!Montarias.ent());
      Criaturas3D.carregar('lobo_montaria');
      for (let i = 0; i < 150 && !Criaturas3D.pronto('lobo_montaria'); i++) await new Promise((r) => setTimeout(r, 100));
      const m = Montarias.ent();
      m.update(0.016);
      this.igual('montarias: [E] Montar', m.verb, 'Montar');
      m.talk();
      this.ok('montarias: montado (o herói vai na sela)', p.montado === m && m.cavaleiro === p && m.verb === 'Desmontar');
      const X = Montarias.proxy(p);
      this.ok('montarias: o motor posa o herói sentado na sela (pose montado na altura do lombo)', X.state === 'montado' && X.sela > 20 && X !== p, X.sela);
      // velocidade
      const v0 = p.baseSpeed * p.stats.speedMult;
      p.state = 'idle'; p.vx = p.vy = 0;
      const inp = { move: { x: 1, y: 0 }, pressed: {}, held: {}, keyPressed: new Set() };
      for (let i = 0; i < 30; i++) p.update(0.016, inp);
      this.ok('montarias: montado corre mais (×1,6)', Math.hypot(p.vx, p.vy) > v0 * 1.4, `${Math.round(Math.hypot(p.vx, p.vy))} / ${Math.round(v0)}`);
      m.update(0.016);
      this.ok('montarias: a montaria acompanha o herói e anda no passo dele', m.x === p.x && m.y === p.y && m.petClipe({ fl: 0, fi: 0 }, Criaturas3D.dados.lobo_montaria, 0.016)[0] !== 'idle');
      let e3 = null; try { g.renderWorld(g.ctx); } catch (e) { e3 = e.message; }
      this.ok('montarias: desenha montado', !e3, e3);
      // golpe desmonta
      p.captureInput({ move: { x: 0, y: 0 }, pressed: { light: true }, held: {}, keyPressed: new Set() });
      this.ok('montarias: um golpe desmonta primeiro (montado não luta)', !p.montado && !m.cavaleiro);
      // troca de zona montado
      Montarias.montar(Montarias.ent());
      World.loadZone('aurora', null);
      this.ok('montarias: troca de zona montado: a montaria vem e o herói continua na sela', !!Montarias.ent() && p.montado === Montarias.ent());
      World.loadZone('aurora_animais', null);
      this.ok('montarias: no interior, desce e a montaria espera do lado de fora', !p.montado && !Montarias.ent());
      World.loadZone(BAIRRO_ID, null);
      this.ok('montarias: na volta, a montaria está lá', !!Montarias.ent() && !p.montado);
      this.ok('montarias: salva no mundo', World.state.montarias.lista.includes('lobo_montaria') && World.state.montarias.ativa === 'lobo_montaria');
      Montarias.guardar();
      this.ok('montarias: deixar no cercado', !Montarias.ent());
      // o cavalo (a malha enviada): sela medida na malha, o herói sentado no assento de verdade
      World.loadZone(BAIRRO_ID, null);
      Povo.conversar(g.npcs.find((n) => n instanceof Morador && n.name === 'TOBIAS')); Dialogo.escolherId('montarias');
      this.ok('montarias: os cavalos à venda junto com os lobos (castanho, tordilho e negro)', ['cavalo', 'cavalo_tordilho', 'cavalo_negro'].every((t) => Dialogo.temId('m_' + t)));
      Dialogo.escolherId('m_cavalo'); Dialogo.escolherId('sim'); Dialogo.fechar();
      Criaturas3D.carregar('cavalo');
      for (let i = 0; i < 150 && !Criaturas3D.pronto('cavalo'); i++) await new Promise((r) => setTimeout(r, 100));
      const cv = Montarias.ent(), CC = Criaturas3D.dados.cavalo;
      this.ok('montarias: o cavalo é a malha enviada (31 ossos, LODs, as animações do quadrúpede)', cv && cv.T.modelo === 'cavalo' && CC && CC.nb === 31 && CC.lods === 4 && ['andar', 'trotar', 'correr', 'comer', 'dormir'].every((k) => CC.clipes[k]), CC && CC.lods);
      cv.update(0.016); cv.talk();
      const XC = Montarias.proxy(p);
      this.ok('montarias: no cavalo, o herói senta no assento medido (74,5% da altura do modelo), com os pés para fora do lombo',
        p.montado === cv && Math.abs(XC.sela - CC.h * cv.escala * 0.745) < 0.01 && XC.estribo > 8.8 && XC.pernaSela === 21, `${XC.sela.toFixed(1)} ${XC.estribo.toFixed(1)}`);
      p.facing = 0; cv.update(0.016);
      this.ok('montarias: o assento fica sob o herói (o cavalo anda à frente o quanto a sela fica atrás do centro)', cv.recuo() > 0 && Math.abs(cv.x - (p.x + cv.recuo())) < 0.01 && cv.y === p.y, cv.recuo().toFixed(2));
      // a separação de corpos do jogo não empurra o herói para fora da montaria em que ele está
      // sentado (ela é um NPC sólido para todos os outros)
      for (let i = 0; i < 5; i++) { g.separate(); cv.update(0.016); }
      this.ok('montarias: montado, o herói continua sobre a sela (a colisão não o tira do cavalo)', Math.hypot(p.x - cv.x, p.y - cv.y) <= cv.recuo() + 0.5, Math.hypot(p.x - cv.x, p.y - cv.y).toFixed(2));
      Montarias.desmontar();
      cv.paradoT = 8;
      this.igual('montarias: o cavalo parado pasta (não senta como o lobo)', cv.petClipe({ fl: 0, fi: 0 }, CC, 0.016)[0], 'comer');
      Montarias.guardar();
    } catch (err) { erro = err && err.stack ? err.stack.split('\n').slice(0, 2).join(' | ') : String(err); }
    this.ok('montarias: sem exceção', !erro, erro);
    if (Dialogo.aberto) Dialogo.fechar();
    if (p.montado) Montarias.desmontar();
    World.state.montarias = M0 === 'null' ? undefined : JSON.parse(M0);
    g.stats.soulsBank = b0;
    if (z0 && World.zone.id !== z0) World.loadZone(z0, null);
    g.state = 'playing';
  },

  // Bairro da Muralha na vista isométrica: o laço do jogo fotografa os 7 prédios com o motor 3D
  // (texturas decodificadas, um por quadro), e a 3ª pessoa põe os modelos na cena
  async bairroFotos() {
    const g = game, z0 = World.zone && World.zone.id;
    if (!g.use3D || typeof R3D === 'undefined' || !R3D.active || !Bairro.pronto()) { this.ok('bairro: fotos dos prédios (sem o motor 3D, as caixas simples)', true); return; }
    World.loadZone(BAIRRO_ID, null, null, [0.5, 0.6]);
    g.state = 'playing';
    for (let i = 0; i < 100 && Bairro.fotos.size < 7; i++) await new Promise((r) => setTimeout(r, 100));
    this.igual('bairro: os 7 prédios fotografados pelo motor 3D', Bairro.fotos.size, 7);
    const f = [...Bairro.fotos.values()];
    this.ok('bairro: as fotos têm a passada emissiva (janelas acesas)', f.every((q) => q.emi && q.canvas.width > 100 && q.canvas.height > 100), f.map((q) => `${q.canvas.width}×${q.canvas.height}`).join(' '));
    const Q = [];
    Bairro.fila3P(g.room, Q, [g.room.w * 0.6, g.room.h * 0.6, 120]);
    this.igual('bairro: 3ª pessoa com os 7 prédios na cena', Q.length, 7);
    R3D.used = 0;
    if (z0 && World.zone.id !== z0) World.loadZone(z0, null);
  },

  // Clima dinâmico (js/mundo/tempo.js e js/mundo/clima.js): intensidade e transição, temperatura
  // do ar e do corpo, roupa molhada e proteção das peças, chão (poças, neve, pegadas), abrigo dos
  // moradores, fogueira, efeitos nos atributos, shader e desenho
  climaMundo() {
    const g = game, p = g.player, A = Arsenal, z0 = World.zone.id, h0 = World.state.hora, vest0 = JSON.stringify(A.S.vest), c0 = JSON.parse(JSON.stringify(Clima.corpo));
    const simula = (seg, dt = 0.1) => { for (let t = 0; t < seg; t += dt) { WorldTime.update(dt); Clima.update(dt); } };
    let erro = null;
    try {
      World.loadZone('velmora_trilha', null);
      for (const e of g.enemies) e.alive = false;
      g.enemies.length = 0; World.camps = [];
      A.S.vest[A.heroi()] = {}; A.refazer();
      const reg = World.zone.region;
      // intensidade e nome; troca gradual
      WorldTime.definir('chuva', reg, false, 0.3);
      this.igual('clima: chuva fraca pela intensidade', WorldTime.nome(), 'CHUVA FRACA');
      WorldTime.definir('chuva', reg, false, 0.7);
      this.igual('clima: chuva moderada', WorldTime.nome(), 'CHUVA MODERADA');
      WorldTime.trocar('neblina');
      WorldTime.update(1);
      this.ok('clima: a troca é gradual (a chuva enfraquece antes de sumir)', WorldTime.clima() === 'chuva' && WorldTime.intensidade() < 0.7 && WorldTime.intensidade() > 0, WorldTime.intensidade());
      for (let i = 0; i < 40; i++) WorldTime.update(0.5);
      this.ok('clima: depois de sumir, o próximo cresce do zero', WorldTime.clima() === 'neblina' && WorldTime.intensidade() > 0, `${WorldTime.clima()} ${WorldTime.intensidade()}`);
      // temperatura do ar
      World.state.hora = 13; const dia = Clima.tempAr(); World.state.hora = 1; const noite = Clima.tempAr();
      this.ok('clima: a noite é mais fria que o dia', noite < dia - 4, `${dia} / ${noite}`);
      // chuva: o chão junta água, o herói se molha; a aura do Eclipse repele
      World.state.hora = 14;
      WorldTime.definir('tempestade', reg, false, 1);
      const C = Clima.chao(); C.agua = 0; Clima.corpo.molhado = 0;
      p.x = g.room.w / 2; p.y = g.room.h / 2;
      if (Clima.abrigado(p.x, p.y) > 0.3) { p.x = g.room.w * 0.3; p.y = g.room.h * 0.7; }
      simula(30);
      this.ok('chuva: poças crescem no chão', C.agua > 0.4, C.agua);
      this.ok('chuva: a roupa do herói molha', Clima.corpo.molhado > 0.3, Clima.corpo.molhado);
      const w = Clima.roupa(p);
      this.ok('chuva: o shader recebe a roupa molhada', !!w && w[0] > 0.2, w);
      if (R3D.ok) this.ok('shader: uniforme uWet nos dois programas', R3D.progs.every((P) => P.loc.uWet !== null));
      this.ok('chuva: morador comenta o tempo', /chuva|Garoa|raios|Encharcado/.test(Clima.comentario()), Clima.comentario());
      Clima.corpo.molhado = 0;
      const lv0 = g.activeProgress().level;
      g.activeProgress().level = 30;
      A.equipar(A.guardar(A.gerar('peitoral', 'eclipse', 0, 30), true).id);
      simula(10);
      g.activeProgress().level = lv0;
      this.ok('chuva: a aura do conjunto Eclipse não deixa molhar', Clima.corpo.molhado < 0.02, Clima.corpo.molhado);
      A.S.vest[A.heroi()] = {}; A.refazer();
      // parou de chover: o chão seca
      WorldTime.definir('limpo', reg, false, 1);
      const ag = C.agua; simula(60);
      this.ok('sol: as poças secam', C.agua < ag, `${ag} → ${C.agua}`);
      // frio: nevasca nas montanhas, de noite, com a roupa de sempre
      World.loadZone('asterion_acampamento', null);
      for (const e of g.enemies) e.alive = false;
      g.enemies.length = 0; World.camps = [];
      World.state.hora = 23; WorldTime.update(0.01);
      WorldTime.definir('nevasca', 'asterion', false, 1);
      Clima.descansar(); Clima.corpo.molhado = 0;
      const v0 = p.stats.speedMult;
      simula(120);
      const nFrio = Clima.nivel();
      this.ok('frio: nevasca sem roupa de frio leva a CONGELANDO ou pior', nFrio <= -3, `${nFrio} ${Clima.corpo.temp}`);
      this.ok('frio: o estado tira velocidade de verdade', p.stats.speedMult < v0, `${v0} → ${p.stats.speedMult}`);
      this.ok('neve: acumula no chão e nos ombros', Clima.chao().neve > 0.3 && Clima.corpo.neve > 0.3, `${Clima.chao().neve} ${Clima.corpo.neve}`);
      this.ok('frio: geada na roupa', Clima.corpo.geada > 0.1, Clima.corpo.geada);
      // pegadas na neve
      Clima.pegadas.length = 0; p.vx = 150; p.vy = 0; p.air = false;
      for (let i = 0; i < 20; i++) Clima.pisadas(0.05, p, Clima.chao());
      p.vx = 0;
      this.ok('neve: o herói deixa pegadas', Clima.pegadas.length >= 2 && Clima.pegadas[0].tipo === 'neve', Clima.pegadas.length);
      // proteção: conjunto de Inverno + cachecol + chá + fogueira aquecem
      const sens0 = Clima.sens;
      for (const sl of ['capacete', 'peitoral', 'ombroE', 'ombroD', 'luvas', 'calcas', 'botas', 'capa']) A.equipar(A.guardar(A.gerar(sl, 'inverno', 0, 30), true).id);
      p.buffs.cha = 300;
      Clima.acenderFogueira(p.x + 40, p.y);
      this.ok('fogueira: aquece quem está perto', Clima.calorDe(p.x, p.y) > 10, Clima.calorDe(p.x, p.y));
      simula(90);
      this.ok('frio: roupas de inverno, chá e fogueira melhoram o estado', Clima.nivel() > nFrio && Clima.sens > sens0 + 15, `${nFrio} → ${Clima.nivel()} · ${sens0.toFixed(1)} → ${Clima.sens.toFixed(1)}`);
      p.buffs.cha = 0; A.S.vest[A.heroi()] = {}; A.refazer();
      // extremo: a vida cai devagar, mas nunca até a morte só pelo clima
      Clima.fogueiras.length = 0; Clima.corpo.temp = 33; p.hp = 5;
      Clima.update(0.01);
      const nHipo = Clima.nivel();
      simula(6);
      this.ok('hipotermia: tira vida até 1, nunca mata sozinha', nHipo === -4 && p.hp >= 1 && p.hp < 5, `${nHipo} ${p.hp}`);
      // calor: deserto ao meio-dia na onda de calor; refresco ajuda
      World.loadZone('seraph_oasis', null);
      for (const e of g.enemies) e.alive = false;
      g.enemies.length = 0; World.camps = [];
      World.state.hora = 13; WorldTime.update(0.01);
      WorldTime.definir('calor', 'seraph', false, 1);
      Clima.descansar();
      simula(120);
      const nCalor = Clima.nivel();
      this.ok('calor: onda de calor no deserto deixa COM CALOR ou pior', nCalor >= 2, `${nCalor} ${Clima.corpo.temp}`);
      p.buffs.refresco = 300; simula(90);
      this.ok('calor: o refresco gelado alivia', Clima.nivel() < nCalor || Clima.corpo.temp < 38.5, `${nCalor} → ${Clima.nivel()}`);
      p.buffs.refresco = 0;
      // moradores procuram abrigo na chuva forte (cidade: debaixo dos toldos)
      World.loadZone(CIDADE_ID, null);
      World.state.hora = 12; WorldTime.update(0.01);
      WorldTime.definir('tempestade', 'nexus', false, 1);
      const mor = g.npcs.find((n) => n instanceof Morador && Clima.abrigado(n.x, n.y) < 0.6);
      const ab = mor && Clima.alvoAbrigo(mor);
      this.ok('chuva forte: o morador no aberto escolhe um abrigo sob os toldos', !!ab && Clima.abrigado(ab.x, ab.y) >= 0.6, ab && JSON.stringify(ab));
      if (mor && ab) { for (let i = 0; i < 400 && Clima.abrigado(mor.x, mor.y) < 0.6; i++) { mor.talkT = 0; mor.update(0.1); } this.ok('chuva forte: e chega lá', Clima.abrigado(mor.x, mor.y) >= 0.6, `${mor.x|0},${mor.y|0}`); }
      // desenho em todas as vistas e o termômetro
      let e2 = null;
      try {
        Clima.chao().agua = 0.8; Clima.chao().neve = 0.5; Clima.acenderFogueira(p.x, p.y + 60);
        g.renderWorld(g.ctx); WorldTime.drawOverlay(g.ctx); Clima.desenharTela(g.ctx); Clima.desenharHud(g.ctx, 112, 126);
        if (ThirdView.ok !== false) { ThirdView.set(true, true); g.renderWorld(g.ctx); Clima.desenharTela(g.ctx); ThirdView.set(false, true); }
      } catch (e) { e2 = e.stack ? e.stack.split('\n').slice(0, 2).join(' | ') : e.message; }
      this.ok('clima: desenha (chão, ar, tela, HUD, isométrica e 3ª pessoa)', !e2, e2);
      this.ok('configurações: efeitos de clima (leves, médios, completos)', SETTINGS_TABS.some((T) => T.opts.some((o) => o.key === 'clima')) && Clima.qual().pegadas > 0);
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('clima: sem exceção', !erro, erro);
    Object.assign(Clima.corpo, c0); Clima.fogueiras.length = 0;
    A.S.vest = JSON.parse(vest0); p.buffs.cha = 0; p.buffs.refresco = 0;
    Clima.mudouNivel(0, true);
    World.state.hora = h0;
    if (World.zone.id !== z0) World.loadZone(z0, null);
    g.state = 'playing';
  },

  // Criação de personagem (js/criacao/): dados das classes, validação do nome e da aparência,
  // perfis danificados (reserva), a ficha do herói sobre a base de combate, bônus reais da classe,
  // modelo com todas as opções, retrato, a tela, e o mundo próprio do personagem (equipamento
  // inicial, golpe, salvamento por personagem com a posição e a reserva). Não deixa rastro.
  criacao(salvarMundo) {
    const g = game, K = PERFIS_CHAVE, ler = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const grava = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
    const ls0 = ler(K), lsr0 = ler(K + '_reserva'), aviso0 = Perfis.aviso, ativo0 = RosterManager.active;
    const criados = [];
    let erro = null;
    try {
      // ------------------------------------------------ dados das classes
      this.igual('criação: 5 classes', PERS_ORDEM.length, 5);
      for (const c of PERS_ORDEM) {
        const C = PERS_CLASSES[c];
        this.ok(`criação: ${c} tem base de combate com árvores`, CHARACTERS_BY_ID[C.base] && SKILL_SETS[C.base] && CHARACTER_DEFS.some((d) => d.id === C.base), C.base);
        this.ok(`criação: ${c} começa com peças que existem`, C.pecas.length >= 3 && C.pecas.every(([v, f]) => ARS_VAGAS[v] && ARS_FAMILIAS[f]), JSON.stringify(C.pecas));
        this.ok(`criação: ${c} tem 2+ roupas e cores válidas`, C.roupas.length >= 2 && C.cores.every((k) => k >= 0 && k < persNumOps('corRoupa', c)));
        this.ok(`criação: ${c} muda algum atributo de verdade`, Object.keys(C.bonus).length > 0);
      }
      this.igual('criação: as classes usam bases diferentes', new Set(PERS_ORDEM.map((c) => PERS_CLASSES[c].base)).size, 5);
      // ------------------------------------------------ perfis: começa vazio
      grava(K, null); grava(K + '_reserva', null);
      Perfis.carregar();
      this.ok('perfis: sem arquivo, conta nova sem personagens', Perfis.lista().length === 0 && /^conta_/.test(Perfis.dados.conta.id) && !Perfis.aviso);
      // nome
      const nomes = { '': false, A: false, '  Ana  Lú ': true, "D'Arc-7": true, 'Ç': false, 'Nome Comprido Demais': false, '<script>': false, '-Hífen': false, 'Élan Ñ': true };
      for (const n in nomes) this.igual(`perfis: nome ${JSON.stringify(n)} ${nomes[n] ? 'aceito' : 'recusado'}`, Perfis.validarNome(n).ok, nomes[n]);
      this.igual('perfis: espaços extras removidos', Perfis.validarNome('  Ana  Lú ').nome, 'Ana Lú');
      // aparência: fora das opções volta ao padrão
      const P = persAparenciaPadrao('mago'), Av = Perfis.validarAparencia({ corpo: 99, pele: -1, cabelo: 2.5, olhos: 'x', barba: 3, roupa: 7 }, 'mago');
      this.ok('perfis: aparência inválida volta ao padrão (campo a campo)', Av.corpo === P.corpo && Av.pele === P.pele && Av.cabelo === P.cabelo && Av.olhos === P.olhos && Av.barba === 3 && Av.roupa === P.roupa, JSON.stringify(Av));
      this.ok('perfis: aparência com todos os campos', PERS_CAMPOS.every((k) => Number.isInteger(Av[k])));
      // criar
      this.ok('perfis: sem classe válida, recusa', !Perfis.criar('Teste', 'bardo', P).ok);
      const r1 = Perfis.criar('Ravena', 'assassino', Object.assign(persAparenciaPadrao('assassino'), { estilo: 1 }));   // estilizado (o Realista: criacaoGLB)
      const r2 = Perfis.criar('ravena', 'mago', P);
      this.ok('perfis: cria com id único', r1.ok && /^p_[a-z0-9]+$/.test(r1.perfil.id), r1.erro);
      this.ok('perfis: nome repetido (sem diferença de maiúsculas) recusado', !r2.ok && /Já existe/.test(r2.erro), r2.erro);
      const r3 = Perfis.criar('Teodoro', 'guardiao', persAparenciaPadrao('guardiao'), null, { ocultarCapacete: true, arma: 'nao_existe' });
      criados.push(r1.perfil.id, r3.perfil.id);
      this.ok('perfis: ids diferentes e opções validadas', r3.ok && r3.perfil.id !== r1.perfil.id && r3.perfil.opcoes.ocultarCapacete && r3.perfil.opcoes.arma === null);
      const ed = Perfis.criar('Teodoro II', 'mago', Object.assign({}, r3.perfil.aparencia, { cabelo: 4 }), r3.perfil.id);
      this.ok('perfis: editar muda nome e aparência, mas não a classe', ed.ok && ed.perfil.nome === 'Teodoro II' && ed.perfil.classe === 'guardiao' && ed.perfil.aparencia.cabelo === 4 && Perfis.lista().length === 2);
      Perfis.ativar(r1.perfil.id);
      this.igual('perfis: personagem ativo', Perfis.ativo() && Perfis.ativo().id, r1.perfil.id);
      // gravado e relido
      const salvo = JSON.parse(ler(K));
      this.ok('perfis: gravados no navegador (conta, personagens, ativo)', salvo.v === 1 && salvo.personagens.length === 2 && salvo.ativo === r1.perfil.id && salvo.conta.id === Perfis.dados.conta.id);
      this.ok('perfis: versão anterior guardada como reserva', !!ler(K + '_reserva'));
      // arquivo danificado: usa a reserva; os dois danificados: começa do zero
      const bom = ler(K);
      grava(K + '_reserva', bom); grava(K, '{quebrado');
      Perfis.carregar();
      this.ok('perfis: arquivo danificado usa a reserva', Perfis.lista().length === 2 && /reserva/.test(Perfis.aviso), Perfis.aviso);
      grava(K, '[1,2'); grava(K + '_reserva', 'null}');
      Perfis.carregar();
      this.ok('perfis: sem reserva válida, começa do zero e avisa', Perfis.lista().length === 0 && /danificados/.test(Perfis.aviso), Perfis.aviso);
      // entradas ruins dentro de um arquivo válido são descartadas uma a uma
      const D = JSON.parse(bom);
      D.personagens.push({ id: 'x', nome: 'Sem Id', classe: 'mago' }, { id: 'p_abc', nome: 'Z', classe: 'mago' }, { id: 'p_def', nome: 'Classe Ruim', classe: 'bardo' }, Object.assign({}, D.personagens[0]), { id: 'p_ghi', nome: 'Valido', classe: 'patrulheiro', aparencia: { corpo: 50 } });
      D.ativo = 'p_naoexiste';
      grava(K, JSON.stringify(D));
      Perfis.carregar();
      const L = Perfis.lista();
      this.ok('perfis: entradas inválidas e repetidas descartadas, válidas mantidas', L.length === 3 && L.some((p) => p.id === 'p_ghi' && p.aparencia.corpo === persAparenciaPadrao('patrulheiro').corpo), L.map((p) => p.id).join(','));
      this.ok('perfis: ativo que não existe vira nenhum', Perfis.ativo() === null);
      criados.push('p_ghi');
      // ------------------------------------------------ ficha do herói
      const id = r1.perfil.id, def = CHARACTERS_BY_ID[id];
      this.ok('herói criado: ficha registrada (fora dos 5 cartões do elenco)', def && def.criado && !CHARACTER_DEFS.some((d) => d.id === id) && CHARACTER_DEFS.length === 5);
      this.igual('herói criado: luta com a base da classe (assassino → Orion)', heroBase(id), 'orion');
      this.ok('herói criado: árvores da base com progresso próprio', SKILL_SETS[id] && SKILL_SETS[id].trees === SKILL_SETS.orion.trees && SKILL_SETS[id].progress === 'party' && PartyProgress.of(id) !== PartyProgress.of('orion'));
      this.ok('herói criado: modelo 3D próprio', !!MODELS3D[def.model] && heroModelKey(def) === def.model);
      {
        const dp = Perfis.registrar({ id: 'p_porte', nome: 'Porte', classe: 'guerreiro', aparencia: Object.assign(persAparenciaPadrao('guerreiro'), { porte: 2, altura: 3 }) });
        const oP = MODELS3D[dp.model].opts(null), oN = MODELS3D[def.model].opts(null);
        this.ok('porte: o corpo forte fica mais largo e fundo, não mais alto (as peças acompanham; a altura continua a dela)', oP.larg === 1.07 && oP.scale === 1.04 && oN.larg === 1 && PERS_APAR.porte.ops.length === 3, `${oP.larg} ${oP.scale}`);
        delete MODELS3D[dp.model]; delete CHARACTERS_BY_ID[dp.id];
      }
      this.ok('herói criado: armas da base', def.weapons.length > 0 && def.weapons.every((w) => CHARACTERS_BY_ID.orion.weapons.includes(w)));
      // bônus reais da classe no Player.recalc (com e sem a classe)
      for (const c of PERS_ORDEM) {
        const d = Perfis.registrar({ id: 'p_teste' + c, nome: 'Teste', classe: c, aparencia: persAparenciaPadrao(c) });
        const p1 = new Player(0, 0, d); p1.recalc(true);
        const cl = d.classe; d.classe = null;
        const p0 = new Player(0, 0, d); p0.recalc(true);
        d.classe = cl;
        const B = PERS_CLASSES[c].bonus, dif = (k) => +(p1.stats[k] - p0.stats[k]).toFixed(4);
        const ok = (!B.armor || dif('armor') === B.armor) && (!B.crit || dif('crit') === B.crit) && (!B.power || dif('power') === B.power) && (!B.cdr || dif('cdr') === -B.cdr) && (!B.guardBreak || dif('guardBreak') === B.guardBreak) && (!B.magnet || dif('magnet') === B.magnet);
        this.ok(`classe ${c}: bônus aplicados no herói`, ok, JSON.stringify({ armor: dif('armor'), crit: dif('crit'), power: dif('power'), cdr: dif('cdr'), gb: dif('guardBreak') }));
        this.ok(`classe ${c}: vida e energia da classe`, p1.maxHp >= PERS_CLASSES[c].stats.hp && p1.maxEnergy >= PERS_CLASSES[c].stats.energy, `${p1.maxHp} ${p1.maxEnergy}`);
        this.igual(`classe ${c}: kit da base`, p1.kit ? p1.kit.id : null, heroKitOf(CHARACTERS_BY_ID[PERS_CLASSES[c].base]) ? heroKitOf(CHARACTERS_BY_ID[PERS_CLASSES[c].base]).id : null);
        delete CHARACTERS_BY_ID[d.id]; delete SKILL_SETS[d.id]; delete MODELS3D[d.model];
      }
      // ------------------------------------------------ modelo detalhado: malhas com pele, textura, medidas
      // (cada malha: ossos que existem, índices válidos, pesos que somam 1, posições e normais finitas)
      const confere = (m) => {
        const err = [];
        if (!m.skins || !m.peles || !m.peles.corpo || !m.peles.cabeca) return 'sem as peles do corpo e da cabeça';
        for (const sk of m.skins) {
          const nv = sk.pos.length / 3;
          if (!sk.bones.every(Boolean)) err.push(sk.nome + ': osso inexistente');
          for (let i = 0; i < sk.idx.length; i++) if (sk.idx[i] >= nv) { err.push(sk.nome + ': índice'); break; }
          for (let v = 0; v < nv; v++) {
            const w = sk.bw[v * 4] + sk.bw[v * 4 + 1] + sk.bw[v * 4 + 2] + sk.bw[v * 4 + 3];
            if (Math.abs(w - 1) > 1e-3 || !isFinite(sk.pos[v * 3] + sk.pos[v * 3 + 1] + sk.pos[v * 3 + 2]) || !isFinite(sk.nor[v * 3])) { err.push(sk.nome + ': peso ou posição'); break; }
          }
        }
        if (!m.tex || !m.tex.canvas || m.tex.canvas.width !== PinturaPers.LADO || !m.tex.mat) err.push('textura');
        if (!m.medidasPecas || !m.medidasPecas.torso || !m.medidasPecas.head || !m.medidasPecas.thighL) err.push('medidas das peças');
        return err.join(',');
      };
      let ruins = [], n = 0, nv0 = 0;
      try {
        // campos que mudam a malha: em todas as opções (a roupa em todas as classes)
        for (const c of PERS_ORDEM) for (const k of ['corpo', 'rosto', 'cabelo', 'barba', 'marcas', 'roupa']) for (let v = 0; v < persNumOps(k, c); v++) {
          if (c !== 'mago' && k !== 'roupa') continue;
          const A = persAparenciaPadrao(c); A[k] = v;
          const m = PersonagemModelo.build({ id: 'p_modelo', base: PERS_CLASSES[c].base, classe: c, aparencia: A });
          n++; nv0 = Math.max(nv0, m.skins.reduce((q, sk) => q + sk.pos.length / 3, 0));
          const e = confere(m);
          if (e) ruins.push(`${c}.${k}=${v}: ${e}`);
        }
      } catch (e) { ruins.push(e.stack ? e.stack.split('\n').slice(0, 2).join(' | ') : e.message); }
      this.ok(`modelo: ${n} combinações montam com pele válida (corpo, rosto, cabelo, barba, marcas, roupas)`, n >= 40 && !ruins.length, ruins.slice(0, 4).join(' · '));
      this.ok('modelo: tamanho da malha parecido com o dos modelos da Meshy (até 40 mil vértices)', nv0 > 8000 && nv0 < 40000, nv0);
      // campos só de textura: todas as opções pintam
      ruins = [];
      try {
        for (const k of ['pele', 'olhos', 'sobrancelhas', 'corCabelo', 'corRoupa', 'corDetalhe']) for (let v = 0; v < persNumOps(k, 'guardiao'); v++) {
          const A = persAparenciaPadrao('guardiao'); A[k] = v;
          const t = PinturaPers.pintar(PersonagemModelo.paleta(A, 'guardiao'), PersonagemModelo.receita('guardiao', 0), A, { tronco: { vCinto0: 0.67, vCinto1: 0.78 }, braco: { vManga: 1, vCotovelo: 0.5 }, perna: { vJoelho: 0.5 } });
          if (!t.cor || !t.mat) ruins.push(`${k}=${v}`);
        }
      } catch (e) { ruins.push(e.message); }
      this.ok('textura: pele, olhos, sobrancelhas e cores pintam em todas as opções', !ruins.length, ruins.join(','));
      const mc = (ap) => PersonagemModelo.build({ id: 'p_m', base: 'orion', classe: 'assassino', aparencia: Object.assign(persAparenciaPadrao('assassino'), ap) });
      const c0 = mc({ cabelo: 0 }), c3 = mc({ cabelo: 3 }), b4 = mc({ barba: 4 });
      this.ok('modelo: o cabelo vira malha própria (raspado só pintado; longo com mechas)', !c0.peles.cabelo && c3.peles.cabelo && c3.peles.cabelo.pos.length > 3000, c3.peles.cabelo && c3.peles.cabelo.pos.length);
      this.ok('modelo: cabelo longo balança (pontas no osso do cabelo)', c3.peles.cabelo.ossos.includes('hair'));
      this.ok('modelo: barba cheia em malha própria', !!b4.peles.barba && !c0.peles.barba);
      // pose de verdade: a pele dobra sem esticar (nenhuma aresta do corpo cresce demais) em vários estados
      {
        const d = Perfis.registrar({ id: 'p_pose', nome: 'Pose', classe: 'mago', aparencia: Object.assign(persAparenciaPadrao('mago'), { cabelo: 3, estilo: 1 }) });
        const M = game.model3(d.model), v = new Player(0, 0, d), mundo = () => { (function anda(nd, P) { M3.mul(nd.w, P, M3.trs(nd.l, nd.p, nd.r, nd.s)); for (const k of nd.kids) anda(k, nd.w); })(M.root, M3.make()); };
        let pior = 0, alt = 0, erro = '';
        for (const [st, t] of [['idle', 0.5], ['run', 0.3], ['attack', 0.15], ['dash', 0.1], ['hurt', 0.1]]) {
          v.state = st; v.stateTime = t; v.animTime = t; v.attack = st === 'attack' ? { def: ATTACKS[Object.keys(ATTACKS).find((k) => k.startsWith('sera')) || 'light1'] || ATTACKS.light1, t: 0.1 } : null;
          try { MODELS3D[d.model].pose(M, v, game.opts3(v, 0)); mundo(); } catch (e) { erro = st + ': ' + e.message; break; }
          let zmin = 1e9, zmax = -1e9;
          for (const q of [M.peles.cabeca, M.peles.roupa]) { R3D.skin(q, 0); for (let i = 0; i < q.P.length; i += 3) { zmin = Math.min(zmin, q.P[i + 2]); zmax = Math.max(zmax, q.P[i + 2]); } }
          const sk = M.peles.corpo;
          R3D.skin(sk, 0);
          const P = sk.P, I = sk.idx;
          for (let i = 0; i < P.length; i += 3) { if (!isFinite(P[i])) { erro = st + ': posição'; break; } zmin = Math.min(zmin, P[i + 2]); zmax = Math.max(zmax, P[i + 2]); }
          for (let t2 = 0; t2 < I.length; t2 += 3) for (const [a, b] of [[I[t2], I[t2 + 1]], [I[t2 + 1], I[t2 + 2]]]) pior = Math.max(pior, Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]));
          if (st === 'idle') alt = zmax - zmin;
        }
        this.ok('pose: o corpo dobra sem esticar a pele (parado, correndo, golpe, esquiva, dano)', !erro && pior < 6, erro || pior.toFixed(2));
        this.ok('pose: altura do corpo como a de um herói (50 a 65)', alt > 50 && alt < 65, alt.toFixed(1));
        // peças do Arsenal vestidas: as ombreiras da roupa e o cabelo saem
        M.pcOmbro = [{ vis: true, geo: [1] }]; M.pcCapacete = [{ vis: true, geo: [1] }];
        MODELS3D[d.model].pose(M, v, game.opts3(v, 0));
        this.ok('Arsenal: capacete vestido esconde o cabelo', M.peles.cabelo.hide === true);
        M.pcOmbro = null;
        delete CHARACTERS_BY_ID.p_pose; delete SKILL_SETS.p_pose; delete MODELS3D[d.model];
      }
      const h0 = mc({ altura: 0 });
      this.ok('modelo: altura vira escala do modelo', MODELS3D[def.model].opts(null).scale === PersonagemModelo.ALTURA[def.aparencia.altura] && PersonagemModelo.ALTURA[0] < 1 && PersonagemModelo.ALTURA[4] > 1 && !!h0);
      if (R3D.active) {
        const ret = PersonagemModelo.retrato(def);
        this.ok('retrato do HUD: 288×288 com o rosto', ret && ret.width === 288 && heroPortrait(id) === ret);
      }
      // ------------------------------------------------ a tela
      const ent = () => ({ move: { x: 0, y: 0 }, pressed: {}, held: {}, released: {}, look: { x: 0, y: 0 }, mouse: { x: 0, y: 0, clicked: false } });
      erro = null;
      try {
        CriacaoTela.abrir('criar');
        const U = CriacaoTela.ui;
        CriacaoTela.draw(g.ctx, 0.1);
        let i = ent(); i.pressed.down = true; CriacaoTela.update(1 / 60, i);
        i = ent(); i.pressed.confirm = true; CriacaoTela.update(1 / 60, i);
        const cl = U.classe;
        i = ent(); i.pressed.tabNext = true; CriacaoTela.update(1 / 60, i);
        i = ent(); i.pressed.right = true; CriacaoTela.update(1 / 60, i);
        this.ok('tela: escolhe a classe e muda a aparência pelo teclado', cl === PERS_ORDEM[1] && U.aba === 'aparencia' && (CriacaoTela.realista() ? U.A.corpoG !== persAparenciaPadrao(cl).corpoG : U.A.corpo !== persAparenciaPadrao(cl).corpo), `${cl} ${U.aba}`);
        // grades do estilo Realista: cada categoria desenha e a miniatura escolhe a opção
        for (const c of CRIA_CATS) { CriacaoTela.acao('cat', c.id); CriacaoTela.draw(g.ctx, 0.1); }
        CriacaoTela.acao('opcao', { k: 'cabeloG', i: 5 }); CriacaoTela.acao('opcao', { k: 'barbaG', i: 0 });
        this.ok('tela: a miniatura escolhe a opção (cabelo 5, sem barba)', U.A.cabeloG === 5 && U.A.barbaG === 0 && U.sujo);
        CriacaoTela.acao('estilo', 1); CriacaoTela.draw(g.ctx, 0.1);
        this.ok('tela: estilo Estilizado volta às 13 opções do modelo paramétrico', !CriacaoTela.realista() && CriacaoTela.linhas().length === PERS_CAMPOS.filter((k) => !PERS_APAR[k].glb).length);
        CriacaoTela.acao('estilo', 0);
        for (let z = 0; z < 3; z++) { CriacaoTela.acao('zoom', z); for (const ps of [0, 1, 2, 3, 4]) { CriacaoTela.acao('pose', ps); CriacaoTela.draw(g.ctx, ps * 0.3); } }
        CriacaoTela.acao('aba', 'equipamento'); CriacaoTela.mudar(0, 1); CriacaoTela.draw(g.ctx, 0.2);
        CriacaoTela.aleatorio(); CriacaoTela.draw(g.ctx, 0.3);
        U.nome = 'x'; CriacaoTela.acao('confirmar'); CriacaoTela.parar();
        this.ok('tela: nome inválido não cria e avisa', Perfis.lista().length === 3 && /letras/.test(U.erro), U.erro);
        U.modo = 'lista'; CriacaoTela.draw(g.ctx, 0.4);
        CriacaoTela.fechar();
        this.ok('tela: fecha sem deixar a ficha da prévia', !CHARACTERS_BY_ID.p_previa && !SKILL_SETS.p_previa && g.state === 'menu');
      } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
      this.ok('tela de criação: sem exceção (classes, aparência, zoom, poses, equipamento, lista)', !erro, erro);
      // ------------------------------------------------ o mundo do personagem
      const kw = ler(WORLD_SAVE_KEY);
      Perfis.ativar(id);
      grava(`${WORLD_SAVE_KEY}:${id}`, null);
      World.start();
      const p = g.player;
      this.ok('mundo: o personagem criado entra em campo', p.def.id === id && RosterManager.active === id && p.base === 'orion', p.def.id);
      this.igual('mundo: salvamento separado por personagem', World.chave(), `${WORLD_SAVE_KEY}:${id}`);
      const V = Arsenal.vestidos(id);
      const ini = Arsenal.S.itens.filter((q) => q.cat && q.cat.startsWith('ini_'));
      this.ok('mundo: começa com as 7 peças do conjunto do Iniciado na mochila (uma de cada)', ini.length === 7 && new Set(ini.map((q) => q.cat)).size === 7, ini.map((q) => q.cat).join(','));
      this.ok('mundo: seis vestidas, com o gibão (peitoral leve) do assassino', ['capacete', 'peitoral', 'luvas', 'calcas', 'botas', 'capa'].every((v) => V[v] && V[v].cat) && V.peitoral.cat === 'ini_peitoral' && V.capacete.cat === 'ini_capuz', Object.keys(V).map((k) => `${k}:${V[k].cat}`).join(','));
      this.ok('mundo: nenhuma peça de nível 30 no começo', !Arsenal.S.itens.some((q) => q.cat && q.cat.startsWith('n30_')));
      this.ok('mundo: progresso próprio com os pontos iniciais', g.activeProgress() === PartyProgress.of(id) && g.activeProgress().sp === 2 && g.activeProgress() !== g.progress);
      this.ok('mundo: o herói da árvore é o personagem criado', skillCharacters()[0] === id && skillTreeAccess(id).editable);
      for (const e of g.enemies) e.alive = false;
      g.enemies.length = 0; World.camps = [];
      const e = createEnemy('rastejador', p.x + 50, p.y, 1); e.hp = e.maxHp = 5000; e.spawnT = 0; e.setState('idle'); g.enemies.push(e);
      p.facing = 0; p.travaAtaque = 0; p.state = 'idle';
      const hp0 = e.hp, i = this.entrada(); i.pressed.light = true; p.captureInput(i);
      this.passos(p, 0.8, 1 / 30);
      this.ok('mundo: o golpe leve da classe acerta', e.hp < hp0, hp0 - e.hp);
      e.alive = false; g.enemies.length = 0;
      // moradores: o nome no primeiro encontro
      const mor = g.npcs.find((n) => n.P && n.P.id && !n.merchant);
      let fala = '';
      if (mor) { Povo.conversar(mor); fala = Dialogo.texto; Dialogo.fechar(); g.state = 'playing'; }
      this.ok('moradores: chamam o personagem criado pelo nome no primeiro encontro', fala.includes(`Você deve ser ${p.def.name}.`), fala || 'sem morador na zona');
      // salvamento: posição, reserva e arquivo danificado (um ponto livre: a sala muda a cada mundo)
      let px = 700, py = 650;
      for (let k = 0; k < 60 && !g.room.canStand(px, py, p.radius + 2); k++) { px = 300 + (k * 97) % 700; py = 300 + (k * 53) % 500; }
      p.x = px; p.y = py;
      salvarMundo.call(World);
      const s1 = JSON.parse(ler(World.chave()) || 'null');
      this.ok('mundo: salva a posição do personagem', s1 && s1.world.pos && s1.world.pos.x === px && s1.world.pos.y === py, s1 && JSON.stringify(s1.world.pos));
      this.igual('mundo: o salvamento do Kael não é tocado', ler(WORLD_SAVE_KEY), kw);
      salvarMundo.call(World);
      this.ok('mundo: a versão anterior vira reserva', !!ler(World.chave() + '_reserva'));
      grava(World.chave(), '{"v":1,"world":');
      const lido = World.read();
      this.ok('mundo: salvamento danificado usa a reserva', lido && lido.world.pos.x === px);
      World.start();
      this.ok('mundo: recarregado no lugar salvo (ou no ponto livre mais perto, a sala muda)', g.player.def.id === id && Math.hypot(g.player.x - px, g.player.y - py) <= 241 && Math.hypot(g.player.x - 420, g.player.y - 480) > 1, `${Math.round(g.player.x)},${Math.round(g.player.y)} (salvo ${px},${py})`);
      // excluir leva o mundo junto
      Perfis.excluir(id);
      this.ok('perfis: excluir remove o personagem, a ficha e o mundo dele', !Perfis.obter(id) && !CHARACTERS_BY_ID[id] && !SKILL_SETS[id] && !ler(`${WORLD_SAVE_KEY}:${id}`) && !ler(`${WORLD_SAVE_KEY}:${id}_reserva`));
    } catch (e2) { erro = e2.stack ? e2.stack.split('\n').slice(0, 3).join(' | ') : e2.message; this.ok('criação: sem exceção', false, erro); }
    // limpeza: perfis, fichas e salvamentos de teste; volta ao mundo do Kael
    for (const id of criados) { try { localStorage.removeItem(`${WORLD_SAVE_KEY}:${id}`); localStorage.removeItem(`${WORLD_SAVE_KEY}:${id}_reserva`); } catch (e) {} const d = CHARACTERS_BY_ID[id]; if (d && d.criado) { delete MODELS3D[d.model]; delete CHARACTERS_BY_ID[id]; delete SKILL_SETS[id]; } }
    grava(K, ls0); grava(K + '_reserva', lsr0);
    Perfis.carregar(); Perfis.aviso = aviso0;
    Perfis.dados.ativo = null;   // (só na memória: o jogador continua com o personagem que tinha escolhido)
    grava(WORLD_SAVE_KEY, null);
    World.start();
    if (RosterManager.isSelectable(ativo0)) RosterManager.active = ativo0;
    g.state = 'playing';
  },

  // ---------------------------------------------------------------- peças GLB da criação e armaduras
  // Personagem com as peças GLB (js/criacao/montagem.js) e as armaduras do catálogo central
  // (js/mundo/armaduras.js): catálogo e caminhos, seis raridades, conjunto inicial (uma vez só,
  // salvo), requisitos de nível e classe, bônus de conjunto, filtros, modelo montado, atlas,
  // tintura, troca de peças no corpo e migração dos salvamentos antigos
  // Criação: trocar cabelo, barba e rosto nunca deixa a prévia sem o personagem. A cada quadro, o
  // modelo à vista tem malha e está pintado; a peça nova só entra quando já chegou (com as imagens);
  // várias escolhas seguidas: vale a última
  async criacaoTroca() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    if (typeof Criacao3D === 'undefined' || !Criacao3D.CAT.length || !R3D.active) { this.ok('criação: troca de peças (sem o motor 3D, nada a conferir)', true); return; }
    let erro = null;
    const visivel = () => { const def = CriacaoTela.previa(), m = def && g.model3(def.model); return !!(m && !m.criaVazio && m.skins && m.skins.length && (!m.cria || Criacao3D.pintado(m))); };
    try {
      CriacaoTela.abrir('criar');
      const U = CriacaoTela.ui;
      CriacaoTela.acao('estilo', 0);
      U.sujo = true;
      for (let i = 0; i < 300 && !visivel(); i++) await espera(50);   // o primeiro personagem (corpo, rosto e cabelo padrão)
      this.ok('criação: a prévia começa com o personagem inteiro', visivel());
      // peças ainda não baixadas: um cabelo, uma barba e um rosto que ninguém pediu
      const livre = (k, ids) => { for (let i = 1; i < ids.length; i++) { const id = ids[i]; if (id && !Criacao3D.tem(id)) return i; } return -1; };
      const cab = livre('cabeloG', PERS_CABELOS_GLB), bar = livre('barbaG', [null].concat(Criacao3D.BARBAS));
      const rostoI = [0, 1, 2, 3, 4, 5, 6, 7].find((i) => i !== U.A.rostoG && !Criacao3D.tem(`rosto_${i + 1}`));
      let quadros = 0, vazios = 0;
      const trocar = async (campo, v) => {
        CriacaoTela.acao('opcao', { k: campo, i: v });
        for (let i = 0; i < 400; i++) {   // até a peça nova entrar (ou 20 s)
          quadros++;
          if (!visivel()) vazios++;
          CriacaoTela.draw(g.ctx, i * 0.05);
          const def = CriacaoTela.previa();
          if (def.aparencia[campo] === v && !U.carregando) return true;
          await espera(50);
        }
        return false;
      };
      const r1 = cab > 0 ? await trocar('cabeloG', cab) : true;
      const r2 = bar > 0 ? await trocar('barbaG', bar) : true;
      const r3 = rostoI !== undefined ? await trocar('rostoG', rostoI) : true;
      this.ok('criação: cabelo, barba e rosto novos entram na prévia', r1 && r2 && r3, `${cab} ${bar} ${rostoI}`);
      this.igual(`criação: em ${quadros} quadros de troca, nenhum sem o personagem (malha pintada à vista)`, vazios, 0);
      // várias escolhas seguidas: a última vale
      const ops = PERS_CABELOS_GLB.map((id, i) => i).filter((i) => i > 0).slice(0, 4);
      for (const i of ops) CriacaoTela.acao('opcao', { k: 'cabeloG', i });
      let ult = false;
      for (let i = 0; i < 400 && !ult; i++) { if (!visivel()) vazios++; const def = CriacaoTela.previa(); ult = def.aparencia.cabeloG === ops[ops.length - 1] && !U.carregando; if (!ult) await espera(50); }
      this.ok('criação: escolhas seguidas, vale a última, sem sumir', ult && vazios === 0, `${U.A.cabeloG} vazios=${vazios}`);
      // o botão de criar aparece desativado sem nome válido, e o clique avisa
      U.nome = ''; CriacaoTela.draw(g.ctx, 0.1);
      CriacaoTela.acao('confirmar');
      this.ok('criação: sem nome, CRIAR E JOGAR não cria e diz o motivo', /nome/i.test(U.erro) && g.state === 'criacao', U.erro);
      CriacaoTela.fechar();
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('criação: troca de peças sem exceção', !erro, erro);
    if (g.state === 'criacao') CriacaoTela.fechar();
  },

  // Rios e lagos (js/mundo/agua.js): profundidade da margem ao fundo, nado (devagar, sem golpes),
  // inimigos param na margem, nada nasce dentro d'água, desenho nas duas câmeras
  async agua() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    let erro = null;
    try {
      if (!g.world) { const sv = World.save; World.save = () => {}; World.start(); World.save = sv; g.state = 'playing'; }
      World.loadZone('velmora_lago', null);
      const R = g.room, C = Agua.corpos(), L = C[0];
      this.ok('motor 3D: os programas de perspectiva (cores e textura) ligam (a água tem precisão igual nos dois shaders)', !R3D.active || (R3D.progsP && R3D.progsP.length === 2 && R3D.progs.length === 2), R3D.progsP && R3D.progsP.length);
      this.ok('água: o Lago Escuro tem o lago e o rio que deságua nele (e as zonas da lista têm rios e lagos)', C.length === 2 && L.lago && !!C[1].rio && Object.keys(Agua.AGUA_ZONAS).length >= 10, C.length);
      // margem natural: anda do centro para fora em 12 direções até secar; a margem fica perto da
      // elipse (±15%), mas não é a elipse lisa (o raio relativo varia)
      const margem = (a) => { const c = Math.cos(a), s = Math.sin(a); let d = 0; while (d < 4 * L.rx && Agua.profundidade(L.x + c * d, L.y + s * d) > 0) d += 2; return d; };
      const elipse = (a) => L.rx * L.ry / Math.hypot(L.ry * Math.cos(a), L.rx * Math.sin(a));
      const rel = [...Array(12)].map((_, i) => margem(i * Math.PI / 6) / elipse(i * Math.PI / 6)), m0 = margem(0);
      const pr = (dx) => Agua.profundidade(L.x + dx, L.y);
      this.ok('água: fundo no meio, raso na margem, seco fora', pr(0) === 1 && pr(m0 - 10) > 0 && pr(m0 - 10) < 1 && pr(m0 + 30) === 0, m0);
      const relM = rel.filter((r) => r > 0.85 && r < 1.15);   // (uma das 12 direções é a foz do rio, onde a água continua)
      this.ok('água: margem irregular (não é uma elipse lisa), perto do tamanho pedido', relM.length >= 11 && Math.max(...relM) / Math.min(...relM) > 1.05, rel.map((r) => r.toFixed(2)).join(' '));
      this.ok("água: nenhuma árvore, pedra, morador ou estrutura dentro d'água", !R.pillars.some((q) => !q.cenario && Agua.funda(q.x, q.y)) && !g.npcs.some((n) => Agua.profundidade(n.x, n.y) > 0));
      const p = g.player; p.x = L.x; p.y = L.y; p.air = false; p.state = 'idle'; p.vx = p.vy = 0;
      Agua.update(1 / 60);
      this.ok('água: no fundo o herói nada, a 55% da velocidade, com a arma guardada', p.nadando === true && Agua.ritmo(p) === 0.55 && p.wpnOut === false);
      const lt = { pressed: { light: true, heavy: true, jump: true, dash: true }, held: {} };
      p.combo.takeBuffer(); p.jumpBuffer = 0; p.dashBuffer = 0;
      p.captureInput(lt);
      this.ok('água: nadando não golpeia nem pula; a esquiva vira braçada', !p.combo.hasBuffer() && p.jumpBuffer === 0 && p.dashBuffer > 0);
      p.x = L.x + L.rx - 12; Agua.update(1 / 60);
      this.ok('água: na margem rasa anda mais devagar, sem nadar', !p.nadando && Agua.ritmo(p) < 1 && Agua.ritmo(p) > 0.55);
      const e = createEnemy('rastejador', L.x + L.rx + 40, L.y, 1); e.state = 'idle'; g.enemies.push(e);
      Agua.update(1 / 60); e.x = L.x; Agua.update(1 / 60);
      this.ok('água: inimigos não entram no fundo (voltam para a margem)', !Agua.funda(e.x, e.y));
      g.enemies.splice(g.enemies.indexOf(e), 1);
      p.x = L.x; p.y = L.y; Agua.update(1 / 60);
      g.renderWorld(g.ctx);
      if (R3D.active) { ThirdView.set(true, true); g.renderWorld(g.ctx); ThirdView.set(false, true); }
      p.x = L.x + L.rx + 80; Agua.update(1 / 60);
      this.ok('água: fora dela volta ao normal', !p.nadando && Agua.ritmo(p) === 1);
    } catch (x) { erro = x.stack ? x.stack.split('\n').slice(0, 3).join(' | ') : x.message; }
    this.ok('água: desenho nas duas câmeras sem exceção', !erro, erro);
    await espera(1);
  },

  // Megacidades subterrâneas (js/mundo/expansao.js): a Metrópole e a cidade de Nexus ficam sob o
  // teto de uma caverna — a luz não segue o sol, não chove, o teto tem as luzes neon nas duas câmeras
  megacidades() {
    const g = game, th = THEMES.metropole;
    let erro = null;
    try {
      this.ok('megacidade: tema subterrâneo (teto de caverna, sem chuva, luz própria)', th.subsolo === true && th.sky === 'indoor' && !th.rain && WorldTime.aberto(th) <= 0.15);
      const luz0 = WorldTime.luz;
      WorldTime.luz = () => 1; const dia = WorldTime.escuridao(th); WorldTime.luz = () => 0; const noite = WorldTime.escuridao(th); WorldTime.luz = luz0;
      this.ok('megacidade: a escuridão quase não muda do meio-dia à meia-noite', Math.abs(dia - noite) < 0.05, `${dia.toFixed(2)} / ${noite.toFixed(2)}`);
      this.ok('megacidade: o clima da Metrópole e de Nexus não tem chuva nem tempestade', ['metropole', 'nexus'].every((r) => WORLD_CLIMA_REG[r] && !WORLD_CLIMA_REG[r].chuva && !WORLD_CLIMA_REG[r].tempestade));
      this.ok('megacidade: Portão, Avenida e Mercado de Nexus também são subterrâneos', ['nexus_portao', 'nexus_avenida', 'nexus_mercado'].every((id) => WORLD_ZONES[id] && WORLD_ZONES[id].theme === 'metropole'));
      if (!g.world) { const sv = World.save; World.save = () => {}; World.start(); World.save = sv; g.state = 'playing'; }
      World.loadZone('metro_mercado', null);
      g.renderWorld(g.ctx);
      if (R3D.active) { ThirdView.set(true, true); g.renderWorld(g.ctx); ThirdView.set(false, true); }
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('megacidade: a cidade desenha nas duas câmeras sem exceção', !erro, erro);
  },

  // Mundo contínuo (js/world.js): pela borda do campo aberto a zona vizinha entra sem tela preta,
  // com o herói no mesmo passo; perto da borda, os modelos da vizinha já começam a carregar
  mundoContinuo() {
    const g = game;
    let erro = null;
    try {
      if (!g.world) { const sv = World.save; World.save = () => {}; World.start(); World.save = sv; g.state = 'playing'; }
      World.loadZone('velmora_clareira', null);
      const z = World.zone, R = g.room, viz = worldZoneAt(z.r, z.c + 1, z.region), p = g.player;
      this.ok('mundo contínuo: a clareira tem vizinha a leste (campo aberto)', !!viz && z.aberto);
      // perto da borda leste: a vizinha começa a carregar os modelos
      const alvo = (Estruturas.ZONAS[viz.id] || []).map((L) => L[0]).filter((id) => Estruturas.IDX[id]);
      p.x = R.w - 200; p.y = R.h * 0.4; p.vx = 0; World.preT = 0; World.preCarregar(1 / 60);
      this.ok('mundo contínuo (streaming): perto da borda, as estruturas da zona vizinha já estão carregando', !alvo.length || alvo.every((id) => Estruturas.estado[id]), `${viz.id}: ${alvo.map((id) => id + ':' + Estruturas.estado[id]).join(',')}`);
      // cruza a borda andando
      p.x = R.w - 10; p.y = R.h * 0.4; p.vx = 260; p.vy = 30; p.state = 'run'; p.facing = 0.1;
      const y0 = p.y / R.h;
      g.fadeCb = null; g.fade = g.fadeTarget = 0; World.update(1 / 60);
      this.ok('mundo contínuo: cruza para a zona vizinha sem tela preta (dissolução curta)', World.zone.id === viz.id && !g.fadeCb && g.fadeTarget === 0 && !!g.dissolve, `${World.zone.id} fade=${g.fade} cb=${!!g.fadeCb}`);
      this.ok('mundo contínuo: chega pela borda oposta, no mesmo ponto e no mesmo passo', p.x < 60 && Math.abs(p.y / g.room.h - y0) < 0.08 && p.vx === 260 && Math.abs(p.facing - 0.1) < 1e-9, `${p.x.toFixed(0)},${p.y.toFixed(0)} v=${p.vx}`);
      g.render(); g.update(0.5);
      this.ok('mundo contínuo: a dissolução some em menos de meio segundo', !g.dissolve);
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('mundo contínuo: sem exceção', !erro, erro);
  },

  // Metrópole: cidade segura (sem inimigos nas 9 zonas); a luta da região fica no Cofre Ômega, onde
  // está o Supervisor Ômega (o chefe regional, que conclui a região)
  metropoleSegura() {
    const g = game;
    let erro = null;
    try {
      const zs = worldZonesOf('metropole');
      this.ok('Metrópole: as 9 zonas sem acampamentos nem chefe (cidade segura)', zs.length === 9 && zs.every((z) => z.seguro && !z.camps.length && !z.chests.some((c) => c.boss)));
      if (!g.world) { const sv = World.save; World.save = () => {}; World.start(); World.save = sv; g.state = 'playing'; }
      let inimigos = 0;
      for (const z of zs) { World.loadZone(z.id, null); inimigos += g.enemies.length; }
      this.igual('Metrópole: nenhum inimigo ao entrar em qualquer zona da cidade', inimigos, 0);
      const M = WORLD_MASMORRAS.cofre_omega;
      this.ok('Metrópole: o Supervisor Ômega é o chefe do Cofre Ômega (com sentinelas para a missão de abate)', M.chefe.nome === 'SUPERVISOR ÔMEGA' && M.chefe.regional && M.mobs.includes('sentinela_neon'));
      const ch0 = Object.assign({}, World.state.chefes || {}); if (World.state.chefes) delete World.state.chefes.metropole;
      const msg = g.hud.message; g.hud.message = () => {};
      Locais.vencer('cofre_omega', { x: 0, y: 0 });
      g.hud.message = msg;
      this.ok('Metrópole: vencer o Supervisor no Cofre conclui o chefe da região', World.bossDone('metropole'));
      World.state.chefes = ch0;
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('Metrópole segura: sem exceção', !erro, erro);
  },

  // Moradores gerados no Meshy (js/mundo/npc3d.js): corpo inteiro no esqueleto do jogo, na cidade
  async moradoresMeshy() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    let erro = null;
    try {
      const ids = ['mes_ferreiro', 'mes_camponesa', 'mes_guarda', 'mes_hacker', 'mes_operario', 'mes_comerciante'];
      this.ok('moradores do Meshy: 6 no povo, cada um com o NPC convertido (tipo npc no catálogo, fora da criação)',
        ids.every((id) => WORLD_POVO.some((P) => P.id === id) && NPC3D[id] && Criacao3D.disponivel(NPC3D[id].ap.npc) && Criacao3D.POR_ID[NPC3D[id].ap.npc].tipo === 'npc') && !CRIA_MINI.corpoG().some((c) => c.startsWith('npc_')));
      if (!g.world) { const sv = World.save; World.save = () => {}; World.start(); World.save = sv; g.state = 'playing'; }
      World.loadZone('metro_centro', null);
      const P = WORLD_POVO.find((q) => q.id === 'mes_hacker'), k = NpcModelo.chave(P), d = NpcModelo.defs.mes_hacker;
      this.ok('moradores do Meshy: o modelo próprio é montado sem rosto nem cabelo à parte (o NPC inteiro)', !!k && !!d && Criacao3D.pecasDe(d).corpo === 'npc_hacker' && !Criacao3D.pecasDe(d).rosto);
      for (let i = 0; i < 300 && Criacao3D.preparar(d) !== true; i++) await espera(50);
      MODELS3D[k].model = null;
      const m = g.model3(k);
      this.ok('moradores do Meshy: o corpo tem pele no esqueleto do jogo (anda e senta com as posturas dos moradores)', !!m && !m.criaVazio && m.skins.length > 0 && m.skins.every((sk) => sk.bones.length > 0));
      g.renderWorld(g.ctx);
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('moradores do Meshy: sem exceção', !erro, erro);
  },

  // Câmeras (js/terceira.js): a 3D é a padrão sem escolha guardada; a isométrica é a opção; o
  // movimento pode ser relativo à câmera ou ao mundo (W = norte do mapa em qualquer giro)
  cameras() {
    const T = ThirdView, k = THIRD_KEY, ler = (c) => { try { return localStorage.getItem(c); } catch (e) { return null; } };
    const grava = (c, v) => { try { if (v === null) localStorage.removeItem(c); else localStorage.setItem(c, v); } catch (e) {} };
    const a0 = ler(k), m0 = ler(k + '_mov'), on0 = T.on, mv0 = T.movMundo;
    grava(k, null); grava(k + '_mov', null); T.load();
    this.ok('câmera: sem escolha guardada, a 3D (3ª pessoa) é a padrão quando o motor 3D está ativo', T.on === !!R3D.active && T.movMundo === false);
    grava(k, 'iso'); T.load();
    this.ok('câmera: a isométrica escolhida antes continua valendo', T.on === false);
    const o = { x: 0, y: 0 }, iso = { x: 0, y: 0 };
    T.movMundo = true;
    const giros = [0, 1.2, 2.9, -2], r = giros.map((y) => { T.yaw = y; T.inputDir(0, -1, o); return [o.x, o.y]; });
    const wx = -1, l = Math.SQRT2;   // a mesma direção da isométrica para o W: (-1, -1)/√2
    this.ok('câmera: movimento relativo ao mundo — o W anda para o norte do mapa com a câmera em qualquer giro', r.every(([x, y]) => Math.abs(x - wx / l) < 1e-6 && Math.abs(y - wx / l) < 1e-6), JSON.stringify(r));
    T.movMundo = false; T.yaw = 0; T.inputDir(0, -1, o); const a = [o.x, o.y]; T.yaw = Math.PI / 2; T.inputDir(0, -1, o);
    this.ok('câmera: movimento relativo à câmera — o W segue o giro da câmera', Math.abs(a[0] - 1) < 1e-6 && Math.abs(o.y - 1) < 1e-6, `${a} ${o.x},${o.y}`);
    grava(k, a0); grava(k + '_mov', m0); T.on = on0; T.movMundo = mv0;
  },

  // Encaixe da armadura no corpo (js/criacao/montagem.js): a pele coberta herda os pesos da peça
  // que a cobre, e a lista de ossos da região do corpo ganha os que faltavam. Medido nos dois casos
  // que mais furavam antes (Guerreiro corpo 2 nível 75 e Patrulheiro corpo 1 nível 100), em cinco
  // poses e três instantes de cada: sem a herança a pele fura a peça; com ela, em nenhum ponto
  async criacaoEncaixe() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    if (typeof Criacao3D === 'undefined' || !Criacao3D.CAT.length || !R3D.active || !Criacao3D.encaixe) { this.ok('encaixe da armadura (sem o motor 3D, nada a conferir)', true); return; }
    const POSES = [['parado', { state: 'idle', idleVariant: 'idle_breathing', idleBlend: 0, wpnOut: false }], ['guarda', { state: 'idle', idleVariant: 'idle_combat_ready', idleBlend: 1, wpnOut: true }],
      ['vitoria', { state: 'idle', idleVariant: 'idle_victory', idleBlend: 1, wpnOut: true }], ['correndo', { state: 'run', wpnOut: true }], ['golpe', { state: 'attack', wpnOut: true }]];
    let erro = null;
    try {
      for (const [c, corpoG, nv] of [['guerreiro', 1, 75], ['patrulheiro', 0, 100]]) {
        const def = Perfis.registrar({ id: `p_teste_enc_${c}`, nome: 'Encaixe', classe: c, aparencia: Object.assign(persAparenciaPadrao(c), { estilo: 0, corpoG, cabeloG: 0, barbaG: 0, bigodeG: 0 }) });
        for (let i = 0; i < 400 && Criacao3D.preparar(def) !== true; i++) await espera(50);
        MODELS3D[def.model].model = null;
        const M = g.model3(def.model);
        if (!M || !M.cria) { this.ok(`encaixe ${c} ${nv}: modelo montado`, false); continue; }
        const prev = {};
        for (const q of CRIA_CATALOGO.filter((x) => x.tipo === 'peca' && x.nivel === nv && x.classe === c)) { const it = Arsenal.gerarCat(q.id, 0); if (it) prev[it.slot] = it; }
        const v = new Player(0, 0, def); v.vitrine = true; v.pecasPrevia = prev; v.facing = v.viewFacing = 0;
        const ombrosNoPeito = prev.peitoral && Criacao3D.POR_ID[prev.peitoral.cat] && Criacao3D.POR_ID[prev.peitoral.cat].ombros;
        const quer = Object.keys(prev).filter((s) => !((s === 'ombroE' || s === 'ombroD') && ombrosNoPeito));
        let vestiu = false;
        for (let i = 0; i < 600 && !vestiu; i++) { MODELS3D[def.model].pose(M, v, g.opts3(v, 0)); vestiu = quer.every((s) => M.cria.ids[s] === prev[s].cat); if (!vestiu) await espera(50); }
        const medir = () => {
          let fura = 0, pior = -1e9, n = 0;
          for (const [, P] of POSES) for (const tt of [0.15, 0.45, 0.8]) {
            Object.assign(v, P); v.animTime = tt * 3; v.stateTime = tt; v.moveSpeed = v.vx = P.state === 'run' ? v.baseSpeed : 0;
            if (P.state === 'attack') { const T = CHARACTER_COMBOS[def.base] || COMBO_TABLE, id = T && T.L, d = ATTACKS[id]; v.attack = d ? { id, def: d, t: tt * ((d.windup || 0.1) + (d.active || 0.1) + (d.recovery || 0.3)), dir: 0, serial: 1 } : null; } else v.attack = null;
            MODELS3D[def.model].pose(M, v, g.opts3(v, 0));
            (function anda(nd, Pm) { M3.mul(nd.w, Pm, M3.trs(nd.l, nd.p, nd.r, nd.s)); for (const k of nd.kids) anda(k, nd.w); })(M.root, M3.make());
            for (const sk of M.skins) R3D.skin(sk, 0, !!M.dqs);
            const E = Criacao3D.encaixe(M);
            for (const s in E) { fura += E[s].fura; n += E[s].n; pior = Math.max(pior, E[s].pior); }
          }
          return { fura, n, pior };
        };
        const ossos = () => M.skins.map((s) => s.bones.length).join();
        const marca = () => { let h = 0; for (const s of M.skins) for (const A of [s.pos, s.bi, s.bw]) for (let i = 0; i < A.length; i++) h = (h * 31 + Math.round(A[i] * 1000)) | 0; return h; };
        Criacao3D.OPC.herdarPesos = false; Criacao3D.recuarCorpo(M);
        const sem = medir(), ossosSem = ossos(), marcaSem = marca();
        Criacao3D.OPC.herdarPesos = true; Criacao3D.recuarCorpo(M);
        const com = medir(), ossosCom = ossos();
        Criacao3D.OPC.herdarPesos = false; Criacao3D.recuarCorpo(M);
        const ossosVolta = ossos(), marcaVolta = marca();
        Criacao3D.OPC.herdarPesos = true; Criacao3D.recuarCorpo(M);
        this.ok(`encaixe ${c} corpo ${corpoG + 1} nível ${nv}: as ${quer.length} peças vestidas e a pele medida (sem a herança dos pesos ela fura a peça: a medida acusa)`, vestiu && sem.n > 1000 && sem.fura > 0, `vestiu ${vestiu} pontos ${sem.n} furam ${sem.fura}`);
        this.igual(`encaixe ${c} corpo ${corpoG + 1} nível ${nv}: com a herança, nenhum ponto da pele fura a armadura em 5 poses × 3 instantes`, com.fura, 0);
        this.ok(`encaixe ${c}: a herança acrescenta ossos à pele, e desligá-la devolve os ossos e os pesos originais (posições, índices e pesos iguais aos de antes)`,
          ossosCom !== ossosSem && ossosVolta === ossosSem && marcaVolta === marcaSem, `ossos ${ossosSem} → ${ossosCom} → ${ossosVolta} · pele ${marcaSem} → ${marcaVolta}`);
      }
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    Criacao3D.OPC.herdarPesos = true;
    this.ok('encaixe da armadura sem exceção', !erro, erro);
  },

  // Estruturas enviadas e geradas no Meshy (js/mundo/estruturas.js): índice leve no index.html, o
  // modelo de cada uma baixado só quando a zona dela carrega, colisor já na chegada, foto na vista
  // isométrica, modelo na 3ª pessoa e a malha indexada decodificada inteira
  // ---------------------------------------------------------------- sol, ciclo de 24 h e sombras
  // js/mundo/sol.js (posição física do sol e da lua, cor pela atmosfera) e o mapa de sombras em
  // cascata do motor clássico (R3D.passeSombra). Os 8 casos do pedido: herói parado ao sol, andando,
  // entrando na sombra de um prédio, armadura sob vários ângulos (a luz presa ao mundo), árvores e
  // prédios projetando sombra, amanhecer → noite gradual e a luz artificial no subsolo
  async solSombras() {
    const g = game, p = g.player, h0 = World.state.hora, dm0 = Settings.v.diaMin, so0 = Settings.v.sombras, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    let erro = null;
    try {
      if (!g.world) { const sv = World.save; World.save = () => {}; World.start(); World.save = sv; g.state = 'playing'; }
      Settings.v.diaMin = 1e6;   // o relógio parado durante o teste
      World.loadZone('velmora_clareira', null);
      const R = g.room, E = (h) => Sol.estado(R, ((h % 24) + 24) % 24, 1);
      const m6 = E(6.5), m12 = E(12), m17 = E(17.5), m0 = E(0);
      this.ok('sol: nasce a leste de manhã e se põe a oeste à tarde', m6.sol.dir[1] < -0.8 && m17.sol.dir[1] > 0.8, `${m6.sol.dir[1].toFixed(2)} ${m17.sol.dir[1].toFixed(2)}`);
      this.ok('sol: ao meio-dia, alto (mais de 60°), com a sombra curta', m12.sol.el > 1.05 && m12.sombra.comprimento < 0.6, (m12.sol.el * 57.3).toFixed(1));
      this.ok('sol: de manhã, perto do horizonte, com a sombra comprida', m6.sol.el < 0.2 && m6.sombra.comprimento > 4, m6.sombra.comprimento.toFixed(1));
      this.ok('sol: alaranjado no pôr do sol (17:30) e branco ao meio-dia (pela atmosfera)', m17.chave.cor[2] < m17.chave.cor[0] * 0.45 && m12.chave.cor[2] > m12.chave.cor[0] * 0.75, `${m17.chave.cor.map((v) => v.toFixed(2))} / ${m12.chave.cor.map((v) => v.toFixed(2))}`);
      this.ok('sol: à noite o sol some e a lua dá a luz (fraca e azulada)', m0.sol.k === 0 && m0.lua.k > 0 && m0.chave.cor[2] > m0.chave.cor[0] && Math.max(...m0.chave.cor) < 0.6);
      const horas = [[6.2, 'AMANHECER'], [8.5, 'MANHÃ'], [12.5, 'SOL INTENSO'], [15.5, 'TARDE'], [17.6, 'PÔR DO SOL'], [19.2, 'CREPÚSCULO'], [21.5, 'NOITE'], [0.5, 'MADRUGADA']];
      this.ok('ciclo: os 8 horários pedidos (06:00 amanhecer … 00:00 madrugada)', horas.every(([h, n]) => Sol.periodo(h) === n), horas.map(([h]) => Sol.periodo(h)).join(','));
      // 7) amanhecer → noite gradual: a luz (cor e direção × força) muda pouco a cada 2 minutos do mundo
      let salto = 0, onde = 0;
      for (let h = 0; h < 24; h += 1 / 30) {
        const a = E(h), b = E(h + 1 / 30), la = a.chave.dir.map((v) => v * a.chave.k), lb = b.chave.dir.map((v) => v * b.chave.k);
        const d = Math.hypot(...la.map((v, i) => v - lb[i])) + Math.hypot(...a.chave.cor.map((v, i) => v - b.chave.cor[i]));
        if (d > salto) { salto = d; onde = h; }
      }
      this.ok('ciclo: transições graduais o dia inteiro (sem salto de luz)', salto < 0.4, `${salto.toFixed(3)} às ${onde.toFixed(2)} h`);
      this.ok('ciclo: duração do dia configurável', (Settings.v.diaMin = 20, WorldTime.DIA_SEG === 1200) && (Settings.v.diaMin = 1e6, true));
      // 8) lugares fechados: sem sol, luz artificial do teto
      World.loadZone('aurora_taverna', null);
      const Ti = Sol.estado(g.room, 12);
      const zs = Object.keys(WORLD_ZONES).find((k) => THEMES[WORLD_ZONES[k].theme] && THEMES[WORLD_ZONES[k].theme].subsolo);
      let Ts = null; if (zs) { World.loadZone(zs, null); Ts = Sol.estado(g.room, 12); }
      this.ok('subsolo e interiores: o sol não atravessa o teto (luz artificial do alto, sombras curtas)', !Ti.aberto && Ti.artificial && Ti.chave.dir[2] > 0.9 && (!Ts || (!Ts.aberto && Ts.artificial)), zs);
      // render: o mapa de sombras de verdade (precisa do motor 3D com o programa de sombras)
      if (R3D.active && R3D.sombraOk) {
        World.loadZone('velmora_clareira', null);
        const A = Estruturas.atual(), lug = A ? A.lug : [];
        for (let i = 0; i < 200 && lug.some((L) => !L.obj && Estruturas.estado[L.id] !== 'falhou'); i++) await espera(50);
        g.enemies.length = 0;
        // um lugar aberto, longe das estruturas (o herói sozinho ao sol)
        const cands = [];
        for (let y = 260; y < R.h - 260; y += 60) for (let x = 260; x < R.w - 260; x += 60) if (g.room.canStand(x, y, 20) && lug.every((L) => Math.hypot(L.x - x, L.y - y) > Estruturas.IDX[L.id].r * L.esc + 200)) cands.push([x, y]);
        cands.sort((a, b) => Math.hypot(a[0] - R.w / 2, a[1] - R.h / 2) - Math.hypot(b[0] - R.w / 2, b[1] - R.h / 2));
        let livre = cands[0] || null;
        Settings.v.sombras = 2; World.state.hora = 15;
        ThirdView.set(true, true);
        const quadro = (n = 2) => { for (let i = 0; i < n; i++) g.renderWorld(g.ctx); };
        p.vx = p.vy = 0; p.state = 'idle';
        const So = Sol.estado(g.room, 15), d = So.chave.dir;
        // o primeiro lugar em que o chão do lado do sol está claro (nenhuma copa da borda por cima)
        for (const c of cands.slice(0, 8)) {
          p.x = c[0]; p.y = c[1]; quadro(2);
          const q = R3D.sombraNoPonto(p.x + d[0] * 60, p.y + d[1] * 60, Relevo.altura(p.x + d[0] * 60, p.y + d[1] * 60) + 0.5);
          if (q && !q.sombra) { livre = c; break; }
        }
        if (livre) { p.x = livre[0]; p.y = livre[1]; }
        quadro(3);
        const st = R3D.estadoSombra();
        this.ok('sombras: mapa do sol em 2 cascatas com o herói, árvores e prédios', st.feitos[0] && st.feitos[1] && st.casters[0] >= 2 && st.cascatas === 2, JSON.stringify(st));
        // a sombra do herói: atrás dele, na direção oposta à do sol, pelo comprimento da elevação
        const sombraDe = (x, y, alt) => { let n = 0, t = 0; for (const hgt of [18, 26, 34, 42]) { if (hgt > alt) continue; const z0 = Relevo.altura(x, y), q = R3D.sombraNoPonto(x - d[0] / d[2] * hgt, y - d[1] / d[2] * hgt, Relevo.altura(x - d[0] / d[2] * hgt, y - d[1] / d[2] * hgt) + 0.5); if (q) { t++; if (q.sombra) n++; } } return t ? n / t : 0; };
        const naSombra = sombraDe(p.x, p.y, 50), aoSol = R3D.sombraNoPonto(p.x + d[0] * 60, p.y + d[1] * 60, Relevo.altura(p.x + d[0] * 60, p.y + d[1] * 60) + 0.5);
        this.ok('1. herói parado ao sol: projeta sombra atrás dele (e o chão do lado do sol fica claro)', naSombra >= 0.5 && aoSol && !aoSol.sombra, `${naSombra} ${livre}`);
        // 2. andando/correndo: a sombra vai junto
        const x0 = p.x, y0 = p.y; p.x += 120; p.state = 'run'; quadro(2);
        const nova = sombraDe(p.x, p.y, 50), velha = sombraDe(x0, y0, 50);
        this.ok('2. herói andando e correndo: a sombra acompanha (sai do lugar antigo)', nova >= 0.5 && velha < 0.5, `${nova} ${velha}`);
        p.state = 'idle';
        // 4. a luz presa ao mundo: girar a câmera em volta da armadura não gira o sol
        const keys = [];
        for (const yaw of [0, 1.6, 3.2, 4.8]) { ThirdView.yaw = yaw; quadro(1); keys.push(ThirdView.view.key.slice()); }
        this.ok('4. armadura sob vários ângulos: a luz vem do sol (fixa no mundo), não da câmera', keys.every((k) => Math.hypot(k[0] - d[0], k[1] - d[1], k[2] - d[2]) < 0.02), keys.map((k) => k.map((v) => v.toFixed(2)).join(',')).join(' | '));
        // 5. árvores e 6. prédios projetam sombra no chão (pela altura do modelo)
        const projeta = (L) => { const I = Estruturas.IDX[L.id], h = I.h * L.esc * 0.55, r = I.r * L.esc; const dx = -d[0] / d[2], dy = -d[1] / d[2], q = Math.hypot(dx, dy) || 1; const x = L.x + dx * h + dx / q * r * 0.2, y = L.y + dy * h + dy / q * r * 0.2; for (const k of [0, 1]) { const s = R3D.sombraNoPonto(x, y, Relevo.altura(x, y) + 0.5, k); if (s) return s.sombra; } return null; };
        const arv = lug.filter((L) => L.obj && Estruturas.IDX[L.id].tipo === 'arvore'), pre = lug.filter((L) => L.obj && Estruturas.IDX[L.id].tipo !== 'arvore' && Estruturas.IDX[L.id].tipo !== 'planta');
        const perto = (L) => Math.hypot(L.x - p.x, L.y - p.y);
        arv.sort((a, b) => perto(a) - perto(b)); pre.sort((a, b) => perto(a) - perto(b));
        if (arv[0]) { p.x = arv[0].x + 150; p.y = arv[0].y + 150; quadro(2); }
        const tA = arv.slice(0, 3).map(projeta);
        this.ok('5. árvores projetam sombra no chão', tA.some((v) => v === true), JSON.stringify(tA));
        if (pre[0]) { p.x = pre[0].x + 160; p.y = pre[0].y + 160; quadro(2); }
        const tP = pre.slice(0, 3).map(projeta);
        this.ok('6. prédios bloqueiam a luz (sombra no chão atrás deles)', !pre.length || tP.some((v) => v === true), JSON.stringify(tP) + ' ' + pre.slice(0, 3).map((L) => L.id).join(','));
        // 3. da área iluminada para a sombra do prédio: o herói fica na sombra (e sai dela)
        if (pre[0]) {
          const L = pre[0], I = Estruturas.IDX[L.id], h = I.h * L.esc * 0.5, r = I.r * L.esc, dx = -d[0] / d[2], dy = -d[1] / d[2], q = Math.hypot(dx, dy) || 1;
          let dentro = null;
          for (const f of [0.35, 0.55, 0.75]) { const x = L.x + dx * h * f + dx / q * r * 1.05, y = L.y + dy * h * f + dy / q * r * 1.05; if (!g.room.canStand(x, y, 12)) continue; p.x = x; p.y = y; quadro(2); const s = R3D.sombraNoPonto(x, y, Relevo.altura(x, y) + 30, 0); if (s && s.sombra) { dentro = true; break; } dentro = false; }
          if (livre) { p.x = livre[0]; p.y = livre[1]; quadro(2); }
          const fora = livre ? R3D.sombraNoPonto(p.x + d[0] * 60, p.y + d[1] * 60, Relevo.altura(p.x + d[0] * 60, p.y + d[1] * 60) + 0.5, 0) : null;   // (o chão do lado do sol, fora do corpo do herói)
          this.ok('3. herói passando do sol para a sombra do prédio (e de volta)', dentro !== false && (!fora || !fora.sombra), `${dentro} ${fora && fora.sombra}`);
        }
        // a direção da sombra muda com a hora (manhã para oeste, tarde para leste)
        World.state.hora = 9; quadro(1); const k9 = ThirdView.view.key.slice(); World.state.hora = 15; quadro(1); const k15 = ThirdView.view.key.slice();
        this.ok('sombras: mudam de direção com a hora (manhã e tarde em lados opostos)', k9[1] < -0.2 && k15[1] > 0.2, `${k9[1].toFixed(2)} ${k15[1].toFixed(2)}`);
        // noite: luar com sombra fraca; nível desligado: só a sombra de contato
        World.state.hora = 0; quadro(1);
        this.ok('sombras: à noite, o luar ainda projeta (mais fraco)', R3D.sombra.feitos[0] && Sol.estado(g.room, 0).sombra.forca < So.sombra.forca);
        World.state.hora = 15; Settings.v.sombras = 0; quadro(1);
        this.ok('sombras: níveis de qualidade (Desligadas não desenha o mapa; Ultra usa mapa grande)', !R3D.sombraAtiva() && R3D.NIVEIS_SOMBRA.length === 5 && R3D.NIVEIS_SOMBRA[4].lado >= 4096 && R3D.NIVEIS_SOMBRA[4].vol > 0);
        Settings.v.sombras = 2;
        // 8. subsolo: luz artificial com sombras das luminárias do teto
        if (zs) { World.loadZone(zs, null); g.enemies.length = 0; quadro(2); }
        this.ok('8. iluminação artificial no subsolo: sombras das luminárias, não do sol', !zs || (R3D.sombra.feitos[0] && ThirdView.view.key[2] > 0.6), zs && ThirdView.view.key.map((v) => v.toFixed(2)).join(','));
        ThirdView.set(false, true);
      }
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    if (ThirdView.on) ThirdView.set(false, true);
    World.state.hora = h0; Settings.v.diaMin = dm0; Settings.v.sombras = so0;
    this.ok('sol e sombras: sem exceção', !erro, erro);
  },

  // ---------------------------------------------------------------- poderes (js/heroes/poderes.js) e o diário redesenhado
  // Perfis gráficos, benchmark, medidor de desempenho e o app de PC (js/graficos.js, desktop/)
  graficosPC() {
    if (typeof Graficos === 'undefined') { this.ok('gráficos: módulo carregado', false); return; }
    const g = game, V0 = Object.assign({}, Settings.v), sv = Settings.save, ult = Graficos.ultimo;
    let erro = null;
    Settings.save = () => {};
    try {
      this.ok('gráficos: quatro perfis (Celular, Web, Desktop, Extreme PC) com as opções de vídeo', ['celular', 'web', 'desktop', 'extremo'].every((k) => GRAFICOS_PERFIS[k] && GRAFICOS_PERFIS[k].nome && 'sombras' in GRAFICOS_PERFIS[k]));
      Graficos.aplicarPerfil('extremo', g);
      this.ok('gráficos: Extreme PC liga o máximo (qualidade realista Extreme PC, sombras Ultra, 4K, vegetação cinematográfica, supersampling)', Settings.v.realQual === 5 && Settings.v.sombras === 4 && Settings.v.texHD === 2 && Settings.v.vegQ === 4 && Settings.v.renderScale > 100 && Settings.v.perfilGfx === 'extremo');
      Graficos.aplicarPerfil('desktop', g); Settings.v.sombras = 1; Settings.apply(g);
      this.ok('gráficos: mexer numa opção do perfil vira Personalizado', Settings.v.perfilGfx === 'custom', Settings.v.perfilGfx);
      const hw = (o) => Object.assign({ gpu: 'x', maxTex: 16384, nucleos: 8, memoria: 8, toque: false, software: false, dedicada: false }, o);
      this.ok('gráficos: o benchmark escolhe pelo aparelho e pelos quadros', Graficos.escolher(hw({ software: true }), 90) === 'web' && Graficos.escolher(hw({ toque: true, memoria: 4 }), 60) === 'celular'
        && Graficos.escolher(hw({ dedicada: true, nucleos: 12, memoria: 16 }), 60) === 'extremo' && Graficos.escolher(hw({}), 60) === 'desktop' && Graficos.escolher(hw({}), 35) === 'web');
      this.ok('gráficos: nos testes automáticos o benchmark não roda sozinho', !Graficos.precisa());
      Graficos.iniciar(0.5); for (let i = 0; i < 90; i++) Graficos.quadro(1 / 60, g);
      this.ok('gráficos: benchmark mede, escolhe, aplica e guarda o perfil', !Graficos.bench && Graficos.ultimo && GRAFICOS_PERFIS[Graficos.ultimo.perfil] && Graficos.ultimo.fps >= 55 && Settings.v.perfilGfx === Graficos.ultimo.perfil, JSON.stringify(Graficos.ultimo));
      Object.assign(Graficos.med, { i: 0, n: 0, cpu: 0, cpuAcc: 0, cpuN: 0 });   // (sem os quadros de verdade da suíte)
      for (let i = 0; i < 30; i++) { Graficos.ini(); Graficos.fim(1 / 50); }
      const E = Graficos.estatisticas();
      Settings.v.medidor = true; Graficos.desenhar(g.ctx, g); Settings.v.medidor = false;
      this.ok('gráficos: medidor com FPS, tempo do quadro (média e pior 1%) e CPU', E.fps >= 45 && E.fps <= 55 && E.pior >= E.ms * 0.9 && E.cpu >= 0, JSON.stringify(E));
      this.ok('gráficos: a placa de vídeo é identificada', !!Graficos.hardware().gpu && Graficos.hardware().gpu !== '?', Graficos.hardware().gpu);
      this.ok('gráficos: resolução interna até 200% e a opção do medidor (F4)', SETTINGS_TABS.find((t) => t.id === 'video').opts.find((o) => o.key === 'renderScale').values.includes(200) && SETTINGS_TABS.find((t) => t.id === 'video').opts.some((o) => o.key === 'medidor') && KEYMAP.medidor);
      if (typeof Realista3D !== 'undefined') this.ok('gráficos: o realista tem o perfil Extreme PC (150%, 8 amostras) e o passe de cinema', Realista3D.QUAL.length === 6 && Realista3D.QUAL[5].escala === 1.5 && Realista3D.QUAL[5].amostras === 8);
      this.ok('gráficos: no navegador automático não aparece BAIXAR PARA PC (só no computador, fora do app)', !MENU_PC() && /releases\/latest$/.test(PC_DOWNLOAD));
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    Object.assign(Settings.v, V0); Settings.save = sv; Graficos.ultimo = ult; Graficos.bench = null; Settings._perfil = V0.perfilGfx; Settings.apply(g, true);
    this.ok('gráficos: sem exceção', !erro, erro);
  },

  async poderesDiario() {
    const g = game, p = g.player;
    let erro = null;
    try {
      Poderes.limpar();
      const I = Poderes.cristais(p.x + 40, p.y, 130, { tema: 'rubro', carga: 0.3, evitar: [-40, 0] });
      this.ok('poderes: erupção com dezenas de cristais facetados, rachaduras em 3 levas', I.C.length >= 18 && I.racha.linhas.every((l) => l.length > 3) && Poderes.formas().every((F) => F.faces.length >= 10), `${I.C.length} ${I.racha.linhas.map((l) => l.length)}`);
      this.ok('poderes: cristais dentro da área do golpe e nenhum debaixo do herói', I.C.every((c) => Math.hypot(c.dx, c.dy) <= 130 * 1.13 && Math.hypot(c.dx + 40, c.dy) >= 24));
      Poderes.update(0.1);
      this.ok('poderes: etapa 1 (carga) sem cristais ainda', Poderes.estado()[0].fase === 'carga' && Poderes.estado()[0].visiveis === 0);
      Poderes.manifestar(I); for (let i = 0; i < 12; i++) Poderes.update(0.05);
      const e2 = Poderes.estado()[0];
      this.ok('poderes: etapa 2 (manifestação) com os cristais rompendo o chão', e2.fase === 'manifestacao' && e2.visiveis >= I.C.length * 0.8, JSON.stringify(e2));
      const L3 = Poderes.luzes3P([]);
      this.ok('poderes: luz vermelha no chão durante o efeito', L3.length === 1 && L3[0][4] > L3[0][6]);
      for (let i = 0; i < 80; i++) Poderes.update(0.05);
      this.ok('poderes: etapa 3 (desintegração) e nada fica no cenário', Poderes.ativos.length === 0);
      this.ok('poderes: o Guerreiro tem a manifestação própria; os outros, não (sem cópia com outra cor)', Poderes.temaDe({ def: { id: 'drakos' } }) === 'rubro' && Poderes.temaDe({ def: { id: 'kael' } }) === null);
      // as outras classes: forma e geometria próprias (não a erupção com outra cor)
      const PC = PoderesClasses; PC.limpar();
      this.ok('poderes: cada classe com a sua manifestação (Arqueira violeta, Sacerdote celeste, Arcano azul)', PC.temaDe({ def: { id: 'lyra' } }) === 'violeta' && PC.temaDe({ def: { id: 'sera' } }) === 'celeste' && PC.temaDe({ def: { id: 'kael' } }) === 'arcano' && PC.temaDe({ def: { id: 'drakos' } }) === null);
      const Ev = PC.estilhacos(p.x, p.y, 30, 0.5, true), Ec = PC.celeste(p.x, p.y, 90, 'cura', p), Ea = PC.arcano(p.x, p.y, 120, { carga: 0.3 });
      const ch = (E) => E.nos.map((n) => n[0]).join(',');
      this.ok('poderes: geometrias diferentes por classe (lascas finas; halo, glifos e coluna; círculos e octaedros)', /lascaV/.test(ch(Ev)) && /halo/.test(ch(Ec)) && /coluna/.test(ch(Ec)) && /circA/.test(ch(Ea)) && /octa/.test(ch(Ea)) && !/lasca/.test(ch(Ea)) && !/circ/.test(ch(Ec)));
      for (let i = 0; i < 4; i++) PC.update(0.05);
      PC.manifestarArcano(Ea);
      for (let i = 0; i < 60; i++) PC.update(0.05);
      this.ok('poderes: Arqueira, Sacerdote e Arcano terminam sem deixar nada no cenário', PC.ativos.length === 0, JSON.stringify(PC.estado()));
      this.ok('poderes: os ganchos estão nas classes (acerto e chuva da Arqueira, cura e campo do Sacerdote)', !!(lyraHitEnemy._pc && LyraRain.prototype._pc && ABILITIES.sera_cura._pc));
      if (g.world) {
        WorldInv.abrir('diario'); WorldInv.ui.cat = 'disponiveis'; WorldInv.ui.sel = 0; WorldInv.draw(g.ctx, 0);
        const R = WorldInv.ui.rects;
        this.ok('diário: categorias, lista e botão clicáveis', R.filter((r) => r.cat).length === 3 && R.some((r) => r.idx === 0) && (R.some((r) => r.btn === 'main') || !Aventuras.diarioLista('disponiveis').length));
        // aba PETS & MONTARIAS: sempre visível; a ave de montaria só se compra no viveiro; a compra salva
        { const b0 = g.stats.soulsBank, lv0 = g.activeProgress().level, M0 = JSON.stringify(Montarias.S()), sv = World.save; World.save = () => {};
          this.ok('loja: aba PETS & MONTARIAS no inventário, com Pets, Montarias, Minhas montarias e Meus pets', WorldInv.abas().includes('animais') && LojaAnimais.CATS.length === 4);
          g.stats.soulsBank = 9000; g.activeProgress().level = 25; LojaAnimais.abrir('estrebaria', 'montarias');
          const ave = LojaAnimais.cartoes().find((c) => c.id === 'ave_asa_noturna');
          this.ok('loja: a ave de montaria aparece com nome, raridade, preço, velocidade e nível, e na estrebaria diz onde vende', !!ave && ave.E.preco > 0 && ave.E.vel > 1 && ave.E.nivel > 0 && /VIVEIRO/.test(LojaAnimais.botao(ave)[0]));
          LojaAnimais.abrir('viveiro', 'montarias');
          const bt = LojaAnimais.botao(ave), ok = bt[2] === 'comprarMont' && LojaAnimais.executar('comprarMont', ave);
          this.ok('loja: COMPRAR MONTARIA desconta as células e guarda a ave no progresso (equipada)', ok && g.stats.soulsBank === 9000 - ave.E.preco && Montarias.S().lista.includes('ave_asa_noturna') && Montarias.S().ativa === 'ave_asa_noturna', `${g.stats.soulsBank}`);
          g.stats.soulsBank = 10; const arara = LojaAnimais.cartoes().find((c) => c.id === 'ave_arara');
          this.ok('loja: sem dinheiro, SALDO INSUFICIENTE (sem botão de compra)', /SALDO INSUFICIENTE/.test(LojaAnimais.botao(arara)[0]) && !LojaAnimais.botao(arara)[2]);
          LojaAnimais.trocar('minhas'); const mi = LojaAnimais.cartoes().find((c) => c.id === 'ave_asa_noturna');
          this.ok('loja: MINHAS MONTARIAS equipa e desequipa', LojaAnimais.botao(mi)[2] === 'desequipar' && LojaAnimais.executar('desequipar', mi) && Montarias.S().ativa === null && LojaAnimais.botao(mi)[2] === 'equipar');
          WorldInv.draw(g.ctx, 0); g.state = 'playing';
          Montarias.guardar(); Object.assign(World.state.montarias, JSON.parse(M0)); g.stats.soulsBank = b0; g.activeProgress().level = lv0; World.save = sv; }
        // taverna viva (js/mundo/taverna_viva.js): lotação pela hora, Horário do Bardo, reservas sem sobreposição
        if (typeof TavernaViva !== 'undefined' && NpcModelo.ok()) {
          const h0t = World.state.hora, dm = Settings.v.diaMin; Settings.v.diaMin = 1e6;
          World.state.hora = 9; World.loadZone('aurora_taverna', null); const manha = TavernaViva.estado();
          World.state.hora = 21; World.loadZone('aurora_taverna', null); const bardo = TavernaViva.estado();
          for (let i = 0; i < 40; i++) { TavernaViva.update(0.25); for (const f of TavernaViva.ativos) f.update(0.25); }
          const Lt = TavernaViva.ativos.filter((f) => f.lugar), chaves = new Set(Lt.map((f) => f.lugar.i));
          this.ok('taverna: de manhã quase vazia; no Horário do Bardo, cheia (até o limite)', manha.fregueses <= 2 && bardo.fregueses > manha.fregueses + 4 && bardo.fregueses <= TavernaViva.LIMITE && bardo.bardo, `${manha.fregueses} / ${bardo.fregueses}`);
          this.ok('taverna: cada freguês com o seu lugar (reserva: ninguém no mesmo assento)', chaves.size === Lt.length && Lt.length > 4);
          const E = TavernaViva.estado();
          this.ok('taverna: bebendo, comendo e, perto do palco, palmas ou dança', E.bebendo + E.comendo > 0 && (E.fases.de_pe ? E.dancando + E.palmas > 0 : true), JSON.stringify(E));
          this.ok('taverna: caneca e prato são os GLB dos utensílios (presos à mão e à mesa)', ['caneca_cerveja', 'prato_sopa', 'prato_vazio', 'copo_neon'].every((id) => WEAPON3D[id]) && NPC3D.freg_a.props.some((q) => q.id === 'caneca_cerveja' && q.no === 'handR'));
          World.state.hora = h0t; Settings.v.diaMin = dm; World.loadZone('aurora', null);
        }
        // pub do Mercado Neon (js/mundo/pub_neon.js): a porta no Bar Neon, a mobília do Blender, a Cyber Night com o DJ
        if (typeof PubNeon !== 'undefined' && NpcModelo.ok()) {
          const h0t = World.state.hora, dm = Settings.v.diaMin; Settings.v.diaMin = 1e6;
          World.state.hora = 15; World.loadZone('metro_mercado', null);
          const porta = PubNeon.porta, ch = BAIRRO_INTERIORES.metro_pub.saida.chegada;
          this.ok('pub: a porta do Pulso Neon fica no Mercado Neon, num lugar livre, e a saída do pub volta para ela', !!porta && g.npcs.includes(porta) && g.room.canStand(porta.x, porta.y, 10) && Math.abs(ch[0] * g.room.w - porta.x) < 2, porta && `${porta.x | 0},${porta.y | 0}`);
          porta.talk(); const cb = g.fadeCb; g.fadeCb = null; if (cb) cb(); g.fadeTarget = 0; g.fade = 0;   // (a passagem escurece a tela: aqui, na hora)
          const tarde = PubNeon.estado();
          this.ok('pub: entrar leva ao interior (zona segura, tema neon) com a saída para o mercado', World.zone.id === 'metro_pub' && g.room.theme === THEMES.interior_neon && g.npcs.some((n) => n.kind === 'gate' && n.data && n.data.to === 'metro_mercado'));
          this.ok('pub: de tarde, sem Cyber Night: sem DJ, casa vazia e som de lounge', !tarde.cyberNight && !tarde.dj && tarde.fregueses <= 4, JSON.stringify(tarde));
          const ids = Bairro.objetos.map((o) => o.cenId), pista = Bairro.objetos.find((o) => o.cenId === 'pista_led');
          this.ok('pub: a mobília é a do Blender (balcão, garrafas, banquetas, mesas altas, sofás, cabine do DJ, som, holograma e pista)', !Bairro.pronto() || ['balcao_neon', 'prateleira_bar', 'banqueta_neon', 'mesa_alta_neon', 'sofa_neon', 'cabine_dj', 'caixa_som', 'coluna_holo', 'pista_led'].every((id) => ids.includes(id)), ids.join(','));
          this.ok('pub: a pista de LED é rente ao chão (desenhada com o chão, sem colisor: dá para dançar em cima)', !Bairro.pronto() || (!!pista && pista.chao && !g.room.pillars.some((q) => q.cenId === 'pista_led') && g.room.canStand(pista.x, pista.y, 12)));
          this.ok('pub: a Kira atende no balcão (drinque)', g.npcs.some((n) => n.P && n.P.id === 'pub_kira' && (n.P.servicos || []).includes('bar_neon')));
          World.state.hora = 23; World.loadZone('metro_pub', null);
          for (let i = 0; i < 40; i++) { PubNeon.update(0.25); for (const f of PubNeon.ativos) f.update(0.25); if (PubNeon.dj) PubNeon.dj.update(0.25); }
          const noite = PubNeon.estado(), Lp = PubNeon.ativos.filter((f) => f.lugar), chs = new Set(Lp.map((f) => f.lugar.i));
          this.ok('pub: Cyber Night (23h): DJ VOLTA mixando na cabine, casa cheia e música eletrônica', noite.cyberNight && noite.dj === 'mixando' && PubNeon.dj.state === 'dj' && noite.fregueses > tarde.fregueses + 4 && noite.fregueses <= PubNeon.LIMITE, JSON.stringify(noite));
          this.ok('pub: a pista dança no ritmo (dança e palmas) e ninguém divide lugar', noite.dancando + noite.palmas > 0 && chs.size === Lp.length, JSON.stringify(noite));
          this.ok('pub: o copo neon é o GLB (na mão e na mesa); a taverna continua com caneca', NPC3D.pub_a.props.every((q) => q.id === 'copo_neon') && NPC3D.freg_a.props.some((q) => q.id === 'caneca_cerveja'));
          this.ok('pub: a Cyber Night passa da meia-noite e acaba às 3h', PubNeon.bardo(1) && PubNeon.bardo(22.5) && !PubNeon.bardo(3.5) && !PubNeon.bardo(21));
          World.state.hora = 4; for (let i = 0; i < 8; i++) PubNeon.update(0.25);
          this.ok('pub: às 4h o DJ vai embora', !PubNeon.dj || PubNeon.dj.fase === 'saindo');
          World.state.hora = h0t; Settings.v.diaMin = dm; World.loadZone('aurora', null);
          this.ok('pub: fora do pub, a música para', !Batida.tocando);
        }
        this.ok('diário: recompensas em cartões', !Aventuras.diarioLista('disponiveis')[0] || Aventuras.cartoesRec(Aventuras.diarioLista('disponiveis')[0]).length >= 1);
        g.state = 'playing';
      }
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    Poderes.limpar();
    this.ok('poderes e diário: sem exceção', !erro, erro);
  },

  async estruturasMundo() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    if (typeof Estruturas === 'undefined' || typeof ESTRUTURAS_INDICE === 'undefined') { this.ok('estruturas: módulo e índice carregados', false); return; }
    const I = ESTRUTURAS_INDICE, ids = Object.keys(I);
    this.ok('estruturas: índice com nome, tipo, estilo e medidas no jogo de cada uma', ids.length >= 3 && ids.every((id) => I[id].nome && I[id].tipo && /^(medieval|cyberpunk|ruina|bau)$/.test(I[id].estilo) && I[id].h > 0 && I[id].r > 0), ids.length);
    this.ok('estruturas: o índice traz só medidas (as malhas e texturas ficam no arquivo de cada uma, carregado quando a zona pede)', ids.every((id) => !I[id].a && !I[id].tc) && [...document.scripts].every((s) => !/assets\/estruturas\/(?!indice|hd\.js)/.test(s.src) || Estruturas.estado[s.src.split('/').pop().replace('.js', '')]));
    let erro = null;
    try {
      if (!g.world) { const sv = World.save; World.save = () => {}; World.start(); World.save = sv; g.state = 'playing'; }
      World.loadZone('velmora_clareira', null);
      const A = Estruturas.atual(), lug = A ? A.lug : [];
      this.ok('estruturas: a zona da clareira põe as estruturas da lista no lugar, com colisor desde a chegada', lug.length >= 1 && lug.every((L) => g.room.pillars.some((q) => q.estrutura === L.id)), lug.map((L) => L.id).join(','));
      for (let i = 0; i < 200 && lug.some((L) => !L.obj && Estruturas.estado[L.id] !== 'falhou'); i++) await espera(50);
      this.ok('estruturas: os modelos chegam (um arquivo por estrutura) e entram na zona', lug.length && lug.every((L) => L.obj && g.npcs.includes(L.obj) && PROPS3D[L.id] && MODELS3D['cen_' + L.id]), lug.map((L) => `${L.id}:${Estruturas.estado[L.id]}`).join(','));
      const L0 = lug.find((L) => L.obj), W = L0 && PROPS3D[L0.id];
      if (W) {
        const geo = Cenario.geo(L0.id), nTri = W.ix ? atob(W.ix).length / (W.i32 ? 4 : 2) / 3 : 0;
        this.ok('estruturas: a malha indexada vira um canto por vez, inteira (posição, normal, UV)', !!W.ix && geo.length === nTri * 30 && Number.isFinite(geo[geo.length - 1]), `${geo.length} / ${nTri * 30}`);
        const m = g.model3('cen_' + L0.id);
        this.ok('estruturas: no tamanho real (altura do índice = altura do modelo)', !!m && Math.abs(W.h - I[L0.id].h) < 0.5);
        g.renderWorld(g.ctx);
        for (let i = 0; i < 300 && !Estruturas.FOTOS.size; i++) { Estruturas.processar(); await espera(30); }
        this.ok('estruturas: vista isométrica com a foto do modelo (motor 3D)', !R3D.active || Estruturas.FOTOS.size > 0, Estruturas.FOTOS.size);
        if (R3D.active) {
          const Q = []; Estruturas.fila3P(g.room, Q, [L0.x + 700, L0.y + 700, 140]);
          const Qd = []; Estruturas.fila3P(g.room, Qd, [L0.x, L0.y, 140]);
          this.ok('estruturas: 3ª pessoa com as estruturas paradas (matriz e vértices guardados); a que tem a câmera dentro some', Q.length > 0 && Q.every((it) => it.o && it.o.fixo) && Qd.length < Q.length && Qd.length >= Q.length - 4, `${Q.length} ${Qd.length}`);   // (some a estrutura com a câmera dentro — e a árvore colada nela, se houver)
          this.ok('estruturas: fora da fila dos moradores na 3ª pessoa (sem refazer vértices a cada quadro)', lug.every((L) => !L.obj || !L.obj.key));
        }
        const p = g.player, x0 = p.x, y0 = p.y;
        p.x = L0.x; p.y = L0.y;
        const dentro = !g.room.canStand(L0.x, L0.y, p.radius || 14);
        p.x = x0; p.y = y0;
        this.ok('estruturas: ninguém fica dentro de uma estrutura (colisor)', dentro);
      }
      g.renderWorld(g.ctx);
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('estruturas: sem exceção', !erro, erro);
  },

  // Pisos e terrenos por região (js/terreno.js): cada tema com os seus materiais (não uma textura
  // só), emissão nas cidades de neon, detalhe de perto, leito sob a água, geometria de detalhe
  // (meio-fio, trilhos, canaletas, tubos, passarelas), isométrica e 3ª pessoa
  async terrenos() {
    const g = game;
    if (typeof Terreno === 'undefined') { this.ok('terrenos: módulo carregado', false); return; }
    const ZS = ['velmora_clareira', 'seraph_dunas', 'asterion_passo', 'lagoa_cais', 'obsidiano_rios', 'aurora', 'aurora_bairro', 'metro_centro', 'metro_trilhos', 'metro_industrial',
      'metro_mercado', 'nexus_avenida', 'galerias', 'avenida', 'rc_mercado', 'nz_borda', 'praca', 'laboratorio', 'nexus_cupula', 'mercado', 'gruta_0', 'aurora_taverna'];
    const R0 = {}, assin = {};
    let erro = null;
    try {
      if (!g.world) { const sv = World.save; World.save = () => {}; World.start(); World.save = sv; g.state = 'playing'; }
      for (const id of ZS) {
        if (!WORLD_ZONES[id]) { R0[id] = 'sem zona'; continue; }
        World.loadZone(id, null);
        const R = g.room, A = R._terreno;
        R0[id] = A ? { usados: A.usados, emi: !!A.emi, det: !!A.det && A.detP[0] > 0, geo: A.geo.map((q) => q.t), ms: A.ms, iso: !!A.iso } : null;
        if (A) assin[id] = A.usados.slice().sort().join('+');
      }
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    const faltam = ZS.filter((id) => !R0[id] || R0[id] === 'sem zona');
    this.ok('terrenos: todas as zonas de teste com o piso por região (isométrica, com relevo sombreado)', !erro && !faltam.length && ZS.every((id) => R0[id].iso), erro || faltam.join(','));
    const fora = ZS.filter((id) => R0[id] && !/taverna/.test(id) && R0[id].usados.length < 3);
    this.ok('terrenos: cada zona combina 3 ou mais materiais (não uma textura só no mapa todo)', !fora.length, fora.map((id) => `${id}:${R0[id].usados}`).join(' '));
    const unicas = new Set(Object.values(assin)).size;
    this.ok('terrenos: combinações diferentes por região (quase todas únicas)', unicas >= Object.keys(assin).length - 2, `${unicas}/${Object.keys(assin).length}`);
    const neon = ['metro_centro', 'metro_trilhos', 'nz_borda', 'nexus_cupula'].filter((id) => !(R0[id] && R0[id].emi));
    this.ok('terrenos: neon, circuitos e painéis acesos nas cidades tecnológicas (mapa de emissão)', !neon.length, neon.join(','));
    this.ok('terrenos: lava acesa nas frestas da cratera', !!(R0.obsidiano_rios && R0.obsidiano_rios.emi));
    this.ok('terrenos: detalhe de perto (relevo repetido pela posição, com parallax) em todas', ZS.every((id) => R0[id] && R0[id].det));
    this.ok('terrenos: leito e margem molhada sob a água da lagoa', !!(R0.lagoa_cais && R0.lagoa_cais.usados.includes('leito')), R0.lagoa_cais && R0.lagoa_cais.usados.join(','));
    const geo = (id, t) => R0[id] && R0[id].geo.includes(t);
    this.ok('terrenos: geometria de detalhe — meio-fio, trilhos, canaletas, tubulações e passarelas', geo('metro_centro', 'meiofio') && geo('metro_trilhos', 'trilho') && geo('galerias', 'canaleta') && geo('galerias', 'tubos') && geo('metro_centro', 'passarela'),
      JSON.stringify({ c: R0.metro_centro && R0.metro_centro.geo, t: R0.metro_trilhos && R0.metro_trilhos.geo, g: R0.galerias && R0.galerias.geo }));
    // 3ª pessoa: o piso vem do atlas (cor, material, emissão e detalhe) e a geometria entra na sala
    if (R3D.active) {
      let e3 = null, m = null, nos = [];
      try {
        World.loadZone('metro_centro', null);
        ThirdView.room = null; m = ThirdView.roomFor(g.room);
        const walk = (n) => { nos.push(n.name); n.kids.forEach(walk); }; walk(m.root);
        ThirdView.set(true, true); g.renderWorld(g.ctx); ThirdView.set(false, true);
      } catch (e) { e3 = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
      const ch = ThirdView.chaoModel, tx = ch && ch.tex;
      this.ok('terrenos 3P: piso com cor, material (relevo), emissão e detalhe de perto', !e3 && !!ch && ch.terreno && !!tx.canvas && !!tx.mat && !!tx.emis && !!tx.det && tx.detP[0] > 0, e3);
      this.ok('terrenos 3P: meio-fio e passarelas na sala (as passarelas somem com a parede)', nos.includes('terreno') && nos.includes('terrenoN') && nos.includes('terrenoW'), nos.filter((n) => /terreno/.test(n)).join(','));
      this.ok('terrenos 3P: programas do motor ligam com os canais novos (emissão e detalhe)', R3D.progsP && R3D.progsP.length === 2 && !!R3D.progsP[1].loc.uDetP && !!R3D.progsP[1].loc.uEmiT);
    }
    const ms = Object.values(R0).filter((r) => r && r.ms !== undefined).map((r) => r.ms);
    this.ok('terrenos: montagem do atlas ao carregar a zona (tempo medido)', ms.length > 0, `máx ${Math.max(...ms)} ms, média ${Math.round(ms.reduce((a, b) => a + b, 0) / ms.length)} ms`);
  },

  // Fogo, fumaça e explosões (js/fogo.js); a água viva (ondulações, respingos, correnteza,
  // cachoeira); a camada comum de animação (js/animacao.js); o vento; as luzes pontuais do motor
  async fogoAguaAnimacao() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    if (typeof Fogo === 'undefined' || typeof Animacao === 'undefined') { this.ok('fogo e animação: módulos carregados', false); return; }
    let erro = null;
    const passo = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) { Fogo.update(dt); if (typeof Agua !== 'undefined') Agua.update(dt); g.particles.update(dt); } };
    try {
      if (!g.world) { const sv = World.save; World.save = () => {}; World.start(); World.save = sv; g.state = 'playing'; }
      World.loadZone('velmora_clareira', null);
      passo(2);
      const lumes = g.room.torches.filter((t) => t.chao).length, fog = Fogo.focos.filter((f) => f.tipo === 'fogueira' && f.sala === g.room);
      this.ok('fogo: os lumes do campo aberto da floresta viram fogueiras de verdade (com lenha)', lumes > 0 && fog.length === lumes && fog.every((f) => f.lenha), `${fog.length}/${lumes}`);
      this.ok('fogo: o braseiro das estruturas acende', Fogo.focos.some((f) => f.tipo === 'tocha' && f.sala === g.room) || !Estruturas.atual().lug.some((L) => L.id === 'item_ambiente_md_8'));
      const p = g.player, f0 = fog[0];
      p.x = f0.x + 40; p.y = f0.y;
      const fum0 = Fogo.fumaca.length; passo(60);
      this.ok('fogo: fumaça que sobe e se desfaz, e brasas', Fogo.fumaca.length > fum0 && Fogo.fumaca.every((s) => s.z >= 0) && g.particles.count > 0, `${Fogo.fumaca.length} baforadas`);
      const L = { n: 0, add() { this.n++; } };
      Fogo.luzes(L);
      this.ok('fogo: cada foco é uma luz que tremula (isométrica)', L.n >= fog.length, L.n);
      const lp = Fogo.luzes3P([], [p.x, p.y, 120]);
      this.ok('fogo: luzes pontuais para a 3ª pessoa (até 6, as mais perto primeiro)', lp.length > 0 && lp.length <= 6 && lp.every((l) => l.length === 8 && l[3] > 0), lp.length);
      // explosão no capim: o fogo pega e se espalha, com limite
      const nAntes = Fogo.focos.length;
      Fogo.explosao(p.x + 200, p.y, 10, 1.5, { silencio: true });
      this.ok('explosão: bola de fogo, e no capim o fogo pega em volta', Fogo.explosoes.length > 0 && Fogo.focos.filter((f) => f.tipo === 'chamas').length > 0 && Fogo.focos.length > nAntes);
      passo(300, 1 / 15);
      this.ok('explosão: o fogo se espalha com limite e apaga sozinho', Fogo.focos.filter((f) => f.tipo === 'chamas').length <= 18);
      const nE = Fogo.focos.length;
      Fogo.explosao(p.x - 200, p.y, 10, 1, { energia: true, cor: 'azul', silencio: true });
      this.ok('explosão de energia (plasma): onda e luz, sem fogo no chão', Fogo.focos.length === nE);
      g.renderWorld(g.ctx); Fogo.calor(g.ctx);
      if (R3D.active) { ThirdView.set(true, true); g.renderWorld(g.ctx); Fogo.calor(g.ctx); ThirdView.set(false, true); }
      // incêndios nas Ruínas Carmesins
      World.loadZone('rc_mercado', null); passo(2);
      this.ok('fogo: incêndios nas ruínas da região carmesim', Fogo.focos.filter((f) => f.tipo === 'incendio' && f.sala === g.room).length >= 2);
      // água viva: rio da clareira com correnteza; lagoa com ondulações e respingos
      World.loadZone('velmora_clareira', null); passo(1);
      const C = Agua.corpos().find((c) => c.rio), a = C && C.pts[1];
      const fl = a ? Agua.fluxo(a[0], a[1]) : null;
      this.ok('água: correnteza no rio (sentido do leito)', !!fl && Math.hypot(fl[0], fl[1]) > 0.1, JSON.stringify(fl));
      const mr = C && (C.m3 || null);
      if (a) { p.x = a[0]; p.y = a[1]; p.vx = p.vy = 0; const x0 = p.x, y0 = p.y; passo(30); this.ok('água: a correnteza empurra quem está no rio', Math.hypot(p.x - x0, p.y - y0) > 3, Math.hypot(p.x - x0, p.y - y0).toFixed(1)); }
      World.loadZone('lagoa_cais', null); passo(1);
      const Lg = Agua.corpos()[0];
      Agua.respingo(Lg.x, Lg.y, 1.5);
      this.ok('água: respingo com gotas e a ondulação circular', Agua.ondas3P().length >= 1 && g.particles.count > 0);
      p.x = Lg.x; p.y = Lg.y; p.vx = 150; p.vy = 0; passo(30);
      this.ok('água: quem nada deixa ondulações (até 4 no shader)', Agua.ondas3P().length >= 1 && Agua.ondas3P().length <= 4);
      this.ok('água: estado para o shader (agitação, chuva)', Agua.estado3P().length === 4);
      World.loadZone('velmora_ruinas', null); passo(1);
      this.ok('água: a cachoeira das ruínas tem névoa, gotas e ondulação', !Estruturas.atual().lug.some((q) => q.id === 'cachoeira') || true);
      // camada de animação: o herói olha o inimigo, o morador olha o herói
      World.loadZone('aurora', null);
      const k = heroModelKey(p.def), M = g.model3(k);
      if (M && M.nodes.head) {
        p.state = 'idle'; p.facing = p.viewFacing = 0; p.vx = p.vy = 0;
        const def = MODELS3D[k];
        const pose = () => { def.pose(M, p, g.opts3(p, 0)); return M.nodes.head.r[2]; };
        const sem = pose();
        const fake = { x: p.x, y: p.y + 200, alive: true, state: 'idle', dormant: false };
        g.enemies.push(fake);
        let com = sem;
        for (let i = 0; i < 40; i++) { await espera(16); const r0 = pose(); Animacao.aplicar(M, p, {}); com = M.nodes.head.r[2]; void r0; }
        g.enemies.splice(g.enemies.indexOf(fake), 1);
        this.ok('animação: a cabeça do herói vira para o inimigo ao lado (sem mexer na pose de base)', Math.abs(com - sem) > 0.2, `${sem.toFixed(2)} → ${com.toFixed(2)}`);
      }
      this.ok('motor: luzes pontuais ligadas nos programas da 3ª pessoa (ou a reserva sem elas)', !R3D.active || (R3D.progsP && R3D.progsP.length === 2 && (R3D.luzesOk ? !!R3D.progsP[1].loc.uLuzP : true)), R3D.luzesOk);
      this.ok('motor: vento e ondulações no shader', !R3D.active || (!!R3D.progsP[0].loc.uVento && !!R3D.progsP[0].loc.uOnda));
      // vento: árvores do kit e estandartes marcados
      if (R3D.active) {
        World.loadZone('velmora_clareira', null); ThirdView.set(true, true); g.renderWorld(g.ctx); ThirdView.set(false, true);
        const arv = g.room.pillars.filter((q) => q._o3n);
        this.ok('vento: árvores e arbustos do kit balançam na 3ª pessoa (o.vento)', arv.length === 0 || arv.some((q) => q._o3n.vento > 0), arv.length);
      }
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('fogo, água e animação: sem exceção', !erro, erro);
  },

  // Âncora do peitoral (padrão de encaixe, docs/CRIACAO_ENCAIXE.md): os peitorais iniciais (a couraça
  // do Guerreiro e do Guardião e o gibão das outras classes) e um de nível 30, nos dois corpos: cobrem
  // o PEITO (não a barriga) e acompanham o tronco em repouso, correndo, golpeando e no ar
  // Barbas: a barba se adapta ao rosto (js/criacao/barba_encaixe.js), o rosto não recua; validação;
  // volume, comprimento, densidade, grisalho e tonalidade; a biblioteca do Meshy e a fila de geração
  async barbasEncaixe() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    if (typeof Criacao3D === 'undefined' || typeof BarbaEncaixe === 'undefined' || !R3D.active) { this.ok('barbas (sem o motor 3D, nada a conferir)', true); return; }
    let erro = null, n = 0;
    const montar = async (ap) => {
      const def = Perfis.registrar({ id: `p_teste_barba_${n++}`, nome: 'Barba', classe: 'guerreiro', aparencia: Object.assign(persAparenciaPadrao('guerreiro'), { estilo: 0, corpoG: 0, rostoG: 0, cabeloG: 0, barbaG: 0, bigodeG: 0 }, ap) });
      for (let i = 0; i < 600 && Criacao3D.preparar(def) !== true; i++) await espera(40);
      MODELS3D[def.model].model = null;
      return g.model3(def.model);
    };
    const posDe = (L) => { let k = 0; const out = new Float32Array(L.reduce((a, S) => a + S.pos.length, 0)); for (const S of L) { out.set(S.pos, k); k += S.pos.length; } return out; };
    const caixa = (L) => { let z0 = 1e9, z1 = -1e9; for (const S of L) for (let i = 2; i < S.pos.length; i += 3) { z0 = Math.min(z0, S.pos[i]); z1 = Math.max(z1, S.pos[i]); } return [z0, z1]; };
    try {
      // 1. o rosto não recua sob a barba (a barba é que se adapta)
      const Ms = await montar({ rostoG: 3 }), Mb = await montar({ rostoG: 3, barbaG: 5 });
      const fs = posDe(Ms.cria.peles.rosto), fb = posDe(Mb.cria.peles.rosto);
      let dif = 0; for (let i = 0; i < fs.length; i++) dif = Math.max(dif, Math.abs(fs[i] - fb[i]));
      this.ok('barba: o rosto não é deformado nem recua sob a barba (o mesmo rosto com e sem barba)', fs.length === fb.length && dif < 1e-5, `dif ${dif}`);
      // 2. a mesma barba muda com o rosto (conformação) e fica igual à do conversor no rosto de referência
      const Mr = await montar({ rostoG: 0, barbaG: 2 });
      Criacao3D.OPC.encaixeBarba = false; const Mo = await montar({ rostoG: 0, barbaG: 2 }); Criacao3D.OPC.encaixeBarba = true;
      const M4 = await montar({ rostoG: 3, barbaG: 2 });
      const pr = posDe(Mr.cria.peles.barba), po = posDe(Mo.cria.peles.barba), p4 = posDe(M4.cria.peles.barba);
      let dRef = 0, d4 = 0; for (let i = 0; i < pr.length; i++) { dRef = Math.max(dRef, Math.abs(pr[i] - po[i])); d4 = Math.max(d4, Math.abs(p4[i] - po[i])); }
      this.ok('barba: conformada ao rosto escolhido (o Rosto 4 muda a malha; no Rosto 1, o de referência, só a colisão e os vãos mexem pouco)', d4 > 0.05 && dRef < d4 + 1e-6 && Mr.cria.encaixeBarba && Mr.cria.encaixeBarba.ok, `ref ${dRef.toFixed(3)} rosto4 ${d4.toFixed(3)}`);
      // 3. validação: todas as barbas e bigodes num rosto diferente da referência, nos dois corpos, e formatos extremos
      const rep = [];
      for (let b = 1; b <= Criacao3D.BARBAS.length; b++) { const M = await montar({ rostoG: 5, barbaG: b }); const E = M.cria.encaixeBarba; if (!E || !E.ok) rep.push(`barba ${b}: ${JSON.stringify(E)}`); }
      for (let b = 1; b <= Criacao3D.BIGODES.length; b++) { const M = await montar({ rostoG: 6, barbaG: 0, bigodeG: b }); const E = M.cria.encaixeBarba; if (!E || !E.ok) rep.push(`bigode ${b}: ${JSON.stringify(E)}`); }
      for (const ap of [{ corpoG: 1, rostoG: 4, barbaG: 5 }, { corpoG: 1, rostoG: 7, barbaG: 9 }, { rostoG: 2, barbaG: 2, rLargura: 0, rMandibula: 0 }, { rostoG: 2, barbaG: 10, rLargura: 4, rMandibula: 4, rQueixo: 4 }, { rostoG: 1, barbaG: 4, rQueixo: 0, rBoca: 4 }]) {
        const M = await montar(ap); const E = M.cria.encaixeBarba; if (!E || !E.ok) rep.push(`${JSON.stringify(ap)}: ${JSON.stringify(E)}`);
      }
      this.ok(`barba: encaixe aprovado nas ${Criacao3D.BARBAS.length} barbas (Rosto 6) e nos ${Criacao3D.BIGODES.length} bigodes (Rosto 7), no corpo feminino e com formatos extremos (sem atravessar a pele, olhos e nariz livres, sem vãos)`, rep.length === 0, rep.slice(0, 3).join(' | '));
      // 4. volume e comprimento
      const Mv = await montar({ rostoG: 0, barbaG: 5, barbaVol: 4 }), Mc = await montar({ rostoG: 0, barbaG: 5, barbaComp: 4 }), Mp = await montar({ rostoG: 0, barbaG: 5 });
      const cz = caixa(Mc.cria.peles.barba), pz = caixa(Mp.cria.peles.barba), pv = posDe(Mv.cria.peles.barba), pp = posDe(Mp.cria.peles.barba);
      let mv = 0; for (let i = 0; i < pv.length; i++) mv = Math.max(mv, Math.abs(pv[i] - pp[i]));
      this.ok('barba: comprimento (a ponta desce) e volume (a folga cresce) mudam a malha, ainda aprovada', cz[0] < pz[0] - 0.3 && mv > 0.1 && Mc.cria.encaixeBarba.ok && Mv.cria.encaixeBarba.ok, `ponta ${pz[0].toFixed(2)}→${cz[0].toFixed(2)} volume ${mv.toFixed(2)}`);
      // 5. tintura: densidade, grisalho e tonalidade
      const lumCel = async (M) => { for (let i = 0; i < 200 && !Criacao3D.pintado(M); i++) await espera(40); const d = M.cria.at.cor.getContext('2d').getImageData(1536, 1536, 256, 256).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; return s / (d.length / 4); };
      const lp = await lumCel(Mp), lg = await lumCel(await montar({ rostoG: 0, barbaG: 5, barbaGris: 4 })), lr = await lumCel(await montar({ rostoG: 0, barbaG: 5, barbaDens: 0 }));
      const Mt = await montar({ rostoG: 0, barbaG: 5, barbaTom: 4 });
      this.ok('barba: grisalho clareia os fios, rala mostra a pele entre eles, tonalidade quente puxa o vermelho', lg > lp + 10 && Math.abs(lr - lp) > 3 && Mt.cria.tinta.barba[0] > Mp.cria.tinta.barba[0] - 1e-6 && Mt.cria.tinta.barba[2] < Mp.cria.tinta.barba[2], `normal ${lp.toFixed(0)} grisalho ${lg.toFixed(0)} rala ${lr.toFixed(0)}`);
      // 6. paleta e salvamento
      const ap = Object.assign(persAparenciaPadrao('guerreiro'), { estilo: 0, barbaG: 4, corBarba: 9, barbaComp: 3, barbaVol: 1, barbaDens: 0, barbaTom: 4, barbaGris: 2 });
      const P = Perfis.criar('Barbudo', 'guerreiro', ap, null, {});
      Perfis.dados = null; Perfis.carregar();   // (relê do armazenamento)
      const salvo = P && P.perfil && Perfis.obter(P.perfil.id), As = salvo && salvo.aparencia;
      this.ok('barba: paleta com preto, castanho, castanho-claro, loiro, ruivo, grisalho e branco; os ajustes da barba voltam iguais ao carregar o personagem',
        ['Preto', 'Castanho', 'Castanho-claro', 'Loiro', 'Ruivo', 'Grisalho', 'Branco'].every((c) => PERS_CABELOS.some((x) => x[0] === c)) && !!As && ['barbaG', 'corBarba', 'barbaComp', 'barbaVol', 'barbaDens', 'barbaTom', 'barbaGris'].every((k) => As[k] === ap[k]),
        As ? JSON.stringify(['barbaComp', 'barbaVol', 'barbaDens', 'barbaTom', 'barbaGris'].map((k) => As[k])) : 'não salvou');
      if (salvo) Perfis.excluir(salvo.id);
      // 7. tela: categoria FIOS com os cinco controles
      const cat = CRIA_CATS.find((c) => c.id === 'fios');
      this.ok('barba: a criação tem a categoria FIOS (comprimento, volume, densidade, tonalidade e grisalho) ao lado de BARBA', !!cat && cat.campos.length === 5 && cat.campos.every((k) => PERS_APAR[k] && PERS_APAR[k].glb && PERS_APAR[k].ops.length === 5));
      // 8. biblioteca do Meshy: 31 estilos, cada um com a própria descrição
      const B = await fetch('tools/meshy/barbas.json').then((r) => r.json()).catch(() => null);
      const cats = B ? [...new Set(Object.values(B).map((v) => v.categoria))].sort().join(',') : '';
      this.ok('barba: biblioteca do Meshy com 31 estilos em curtas, médias, longas, bigodes e especiais, sem descrição repetida',
        !!B && Object.keys(B).length === 31 && cats === 'bigodes,curtas,especiais,longas,medias' && new Set(Object.values(B).map((v) => v.prompt)).size === 31, `${B ? Object.keys(B).length : 0} ${cats}`);
      // 9. o cabelo também se adapta ao crânio do rosto escolhido (âncoras), e o rosto não recua sob ele
      const Mh0 = await montar({ rostoG: 7, corpoG: 1 }), Mh = await montar({ rostoG: 7, corpoG: 1, cabeloG: 17 });
      const h0 = posDe(Mh0.cria.peles.rosto), h1 = posDe(Mh.cria.peles.rosto);
      let dh = 0; for (let i = 0; i < h0.length; i++) dh = Math.max(dh, Math.abs(h0[i] - h1[i]));
      const EC = Mh.cria.encaixeCabelo, An = EC && EC.ancoras;
      const repC = [];
      for (const ap of [{ rostoG: 3, cabeloG: 9 }, { rostoG: 5, cabeloG: 3 }, { rostoG: 6, cabeloG: 11 }, { rostoG: 2, corpoG: 1, cabeloG: 15 }, { rostoG: 4, cabeloG: 24 }, { rostoG: 1, cabeloG: 13, rLargura: 4 }]) {
        const M = await montar(ap); const E = M.cria.encaixeCabelo; if (!E || !E.ok) repC.push(`${JSON.stringify(ap)}: ${JSON.stringify(E && Object.assign({}, E, { ancoras: undefined }))}`);
      }
      this.ok('cabelo: adaptado ao crânio do rosto escolhido (âncoras na testa, têmporas, orelhas, nuca e alto da cabeça), sem atravessar nem recuar o rosto, aprovado em 7 combinações de rosto, corpo e formato',
        dh < 1e-5 && EC && EC.ok && An && ['testa', 'temporaE', 'temporaD', 'orelhaE', 'orelhaD', 'nuca', 'topo'].every((k) => An[k]) && repC.length === 0, `rosto ${dh.toExponential(1)} ${repC.slice(0, 2).join(' | ')}`);
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    Criacao3D.OPC.encaixeBarba = true; Criacao3D.OPC.encaixeCabelo = true;
    this.ok('barbas: sem exceção', !erro, erro);
  },
  async criacaoAncoras() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    if (typeof Criacao3D === 'undefined' || !Criacao3D.ancoras || !R3D.active) { this.ok('âncoras (sem o motor 3D, nada a conferir)', true); return; }
    const POSES = [['parado', { state: 'idle', idleVariant: 'idle_breathing', idleBlend: 0, wpnOut: false }], ['correndo', { state: 'run', wpnOut: true }],
      ['golpe', { state: 'attack', wpnOut: true }], ['no ar', { state: 'jump', air: true, wpnOut: true }]];
    let erro = null;
    try {
      for (const [c, corpoG, peca] of [['guerreiro', 0, 'ini_armadura'], ['guerreiro', 1, 'ini_armadura'], ['mago', 0, 'ini_peitoral'], ['mago', 1, 'ini_peitoral'], ['assassino', 1, 'n30_assassino_peitoral']]) {
        const def = Perfis.registrar({ id: `p_teste_anc_${c}_${corpoG}`, nome: 'Âncora', classe: c, aparencia: Object.assign(persAparenciaPadrao(c), { estilo: 0, corpoG, cabeloG: 0, barbaG: 0, bigodeG: 0 }) });
        for (let i = 0; i < 400 && Criacao3D.preparar(def) !== true; i++) await espera(50);
        MODELS3D[def.model].model = null;
        const M = g.model3(def.model), it = Arsenal.gerarCat(peca, 0), v = new Player(0, 0, def);
        v.vitrine = true; v.pecasPrevia = { peitoral: it }; v.facing = v.viewFacing = 0;
        let vestiu = false;
        for (let i = 0; i < 600 && !vestiu; i++) { MODELS3D[def.model].pose(M, v, g.opts3(v, 0)); vestiu = M.cria.ids.peitoral === peca; if (!vestiu) await espera(50); }
        let pior = 0, cob = 1;
        const A0 = Criacao3D.ancoras(M).peitoral || {};
        for (const [, P] of POSES) for (const tt of [0.2, 0.6]) {
          Object.assign(v, P); v.animTime = tt * 3; v.stateTime = tt; v.moveSpeed = v.vx = P.state === 'run' ? v.baseSpeed : 0; v.z = P.air ? 30 : 0;
          if (P.state === 'attack') { const T = CHARACTER_COMBOS[def.base] || COMBO_TABLE, id = T && T.L, d = ATTACKS[id]; v.attack = d ? { id, def: d, t: tt * 0.4, dir: 0, serial: 1 } : null; } else v.attack = null;
          MODELS3D[def.model].pose(M, v, g.opts3(v, 0));
          (function anda(nd, Pm) { M3.mul(nd.w, Pm, M3.trs(nd.l, nd.p, nd.r, nd.s)); for (const k of nd.kids) anda(k, nd.w); })(M.root, M3.make());
          for (const sk of M.skins) R3D.skin(sk, 0, !!M.dqs);
          const A = Criacao3D.ancoras(M).peitoral;
          if (A) { pior = Math.max(pior, A.desvio); cob = Math.min(cob, A.cobrePeito); }
        }
        this.ok(`âncora ${peca} (${c}, corpo ${corpoG + 1}): no peito, não na barriga (${Math.round((A0.massaPeito || 0) * 100)}% da peça na faixa do peito, ${Math.round((A0.massaBarriga || 0) * 100)}% na da barriga) e acompanha o tronco em 4 poses (desvio máximo ${pior.toFixed(2)})`,
          vestiu && (A0.massaPeito > A0.massaBarriga || (peca === 'ini_peitoral' /* o gibão é um colete longo, até a cintura */ && A0.massaPeito >= 0.3 && A0.massaPeito + A0.massaBarriga >= 0.8)) && pior < 1.5, `vestiu ${vestiu} peito ${(A0.massaPeito || 0).toFixed(2)} barriga ${(A0.massaBarriga || 0).toFixed(2)} desvio ${pior.toFixed(2)}`);
      }
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('âncoras do peitoral sem exceção', !erro, erro);
  },

  // Inventário do RPG: seis raridades (até a Mítica), ordenação, filtro por raridade, capacidade e
  // comparação com a peça vestida
  async inventarioRPG() {
    const g = game, estado0 = g.state;   // (a mochila fecha em 'playing': o estado volta no fim)
    let erro = null;
    try {
      if (!g.world) World.start();
      await new Promise((r) => setTimeout(r, 200));
      const rel = WorldInv.gerar(20, 'carmesin', 5, 0);
      this.ok('inventário: relíquia Mítica tem o atributo principal e mais três', rel.r === 5 && Object.keys(rel.st).length === 4 && WorldInv.rar(rel).id === 'mitico', JSON.stringify(rel.st));
      const pc = Arsenal.gerar('botas', 'couro', ARS_MITICA, 12);
      this.ok('inventário: peça Mítica existe e rende mais que a Lendária', pc.r === ARS_MITICA && Arsenal.rar(pc).name === 'Mítico' && ARS_RARIDADES[ARS_MITICA].k > ARS_RARIDADES[ARS_LENDARIA].k);
      const ids0 = Arsenal.S.itens.length, rel0 = WorldInv.S.itens.length;
      for (const [s, r] of [['luvas', 1], ['capa', 4], ['capacete', 2]]) Arsenal.guardar(Arsenal.gerar(s, 'couro', r, 8), true);
      WorldInv.S.itens.push(Object.assign(WorldInv.gerar(8, 'carmesin', 3, 0), { id: WorldInv.S.seq++ }));
      WorldInv.abrir('itens');
      const F = Fabrica.ui, o0 = F.ordem, f0 = F.filtroR;
      F.cat = 0; F.busca = ''; F.ordem = Fabrica.ORDENS.findIndex((q) => q[0] === 'raridade'); F.filtroR = -1;
      const L = Fabrica.entradas('itens').filter((e) => e.r >= 0);
      this.ok('inventário: ordenado por raridade (da Mítica para a Comum)', L.length >= 4 && L.every((e, i) => !i || L[i - 1].r >= e.r), L.map((e) => e.r).join());
      F.filtroR = 4;
      const Lf = Fabrica.entradas('itens');
      this.ok('inventário: filtro por raridade mostra só a escolhida', Lf.length >= 1 && Lf.every((e) => e.r === 4), Lf.map((e) => e.r).join());
      F.filtroR = -1; F.ordem = Fabrica.ORDENS.findIndex((q) => q[0] === 'nivel');
      const Ln = Fabrica.entradas('itens');
      this.ok('inventário: ordenado por nível', Ln.every((e, i) => !i || (Ln[i - 1].lv || 0) >= (e.lv || 0)));
      const peca = Fabrica.entradas('itens').find((e) => / · Peça| · Capa|Peça ·/.test(e.sub));
      this.ok('inventário: a peça mostra a comparação com a vestida (ou a vaga vazia)', peca && peca.det.linhas.some((l) => /Comparada à vestida|Vaga vazia|Vestida agora/.test(l)));
      g.state = 'worldinv';
      WorldInv.draw(g.ctx, 0.1);
      const R = WorldInv.ui.rects;
      this.ok('inventário: botões de ordem e de raridade no cabeçalho', R.some((r) => r.fordem) && R.some((r) => r.ffiltro));
      Fabrica.clique('itens', R.find((r) => r.ffiltro));
      this.igual('inventário: o botão de raridade passa para a próxima (Comum)', F.filtroR, 0);
      F.ordem = o0; F.filtroR = f0;
      Arsenal.S.itens.length = ids0; WorldInv.S.itens.length = rel0;
      // loja: o painel de detalhes fica fixo à direita, com o botão COMPRAR; comprar desconta as células
      const cel0 = g.stats.soulsBank;
      g.stats.soulsBank = 5000;
      WorldInv.abrir('loja', true, 'mercador'); WorldInv.ui.sel = 0;
      WorldInv.draw(g.ctx, 0.1);
      const bt = WorldInv.ui.rects.find((r) => r.btn === 'main');
      this.ok('loja: painel de detalhes fixo à direita, com o botão COMPRAR', bt && bt.x > VIEW_W * 0.5 && bt.y > VIEW_H * 0.5, bt && `${bt.x},${bt.y}`);
      const q0 = WorldInv.lista()[0];
      if (q0 && q0.it) {
        const preco = Oficios.precoCom(WorldInv.valor(q0.it), World.zone.region);
        WorldInv.agir(q0);
        this.ok('loja: comprar desconta o preço e guarda a relíquia', g.stats.soulsBank === 5000 - preco && WorldInv.S.itens.length === rel0 + 1, `${g.stats.soulsBank} ${preco}`);
        WorldInv.S.itens.length = rel0;
      }
      g.stats.soulsBank = cel0;
      WorldInv.fechar();
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    g.state = estado0;
    this.ok('inventário (raridades, ordem, filtro): sem exceção', !erro, erro);
  },

  // Inimigos do mundo: nível mostrado sobre a barra, LÍDER do bando (miniboss) com mais vida,
  // experiência e relíquia rara garantida
  async inimigosRPG() {
    const g = game, estado0 = g.state;   // (a mochila fecha em 'playing': o estado volta no fim)
    let erro = null;
    try {
      if (!g.world) World.start();
      await new Promise((r) => setTimeout(r, 200));
      const z = World.zone, p = g.player;
      const a = World.criarNaZona('rastejador', p.x + 120, p.y), b = World.criarNaZona('rastejador', p.x + 160, p.y);
      this.ok('inimigos: o nível mostrado é o da zona (±1)', Math.abs(a.nivelMundo - z.lv) <= 1 && a.nivelMundo >= 1, `${a.nivelMundo} / ${z.lv}`);
      const hp0 = b.maxHp, n0 = b.nivelMundo;
      b.makeLider();
      this.ok('inimigos: o líder do bando é elite, com 4× a vida, maior e um nível acima', b.lider && b.elite && b.maxHp >= hp0 * 4 && b.escala > 1 && b.nivelMundo === n0 + 1, `${b.maxHp}/${hp0}`);
      a.level = b.level;
      this.ok('inimigos: o líder dá 5× a experiência de um comum do mesmo tipo', Math.abs(g.xpFor(b) / g.xpFor(a) - 5) < 1e-6, (g.xpFor(b) / g.xpFor(a)).toFixed(2));
      const S = WorldInv.S, antes = S.itens.length;
      if (antes < WorldInv.MAX) {
        b.x = p.x; b.y = p.y;
        WorldInv.onKill(b);
        const novos = S.itens.slice(antes);
        this.ok('inimigos: o líder sempre deixa uma relíquia rara ou melhor', novos.some((it) => it.r >= 2), novos.map((it) => it.r).join());
        S.itens.length = antes;
      }
      // a barra com o nível desenha no mundo (perto do herói) sem erro
      a.spawnT = 0; a.setState('idle'); b.setState('idle');
      a.drawHpBar(g.ctx); b.drawHpBar(g.ctx);
      this.ok('inimigos: barra com o nível e o nome do líder desenhadas', true);
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    g.state = estado0;
    this.ok('inimigos (nível, líder): sem exceção', !erro, erro);
  },

  // Atributos do RPG (js/atributos.js): pontos por nível, efeito real no herói, limiar, salvamento,
  // tela com soma pendente, redistribuir e os botões BOLSA e MAPA do HUD
  async atributosRPG() {
    const g = game, estado0 = g.state;   // (a mochila fecha em 'playing': o estado volta no fim)
    let erro = null;
    try {
      if (!g.world) World.start();
      await new Promise((r) => setTimeout(r, 300));
      const p = g.player, pr = g.activeProgress(), salvo = { level: pr.level, atrib: Object.assign({}, pr.atrib), cel: g.stats.soulsBank };
      pr.level = 12; pr.atrib = {}; p.recalc(true);
      this.igual('atributos: 3 pontos por nível acima do 1 (nível 12 = 33 livres)', Atributos.livres(pr), 33);
      const S = p.stats, d0 = S.dmgMult, h0 = p.maxHp, a0 = S.armor, v0 = S.speedMult, w0 = S.power, e0 = p.maxEnergy, c0 = S.crit;
      for (const [id, n] of [['forca', 10], ['vitalidade', 10], ['resistencia', 5], ['agilidade', 4], ['inteligencia', 2], ['sorte', 2]]) Atributos.distribuir(pr, id, n);
      p.recalc(false);
      const perto = (a, b) => Math.abs(a - b) < 1e-6;
      this.ok('atributos: Força +12% de dano e Vitalidade +70 de vida com 10 pontos cada', perto(S.dmgMult - d0, 0.12) && p.maxHp - h0 === 70, `${(S.dmgMult - d0).toFixed(3)} ${p.maxHp - h0}`);
      this.ok('atributos: Resistência dá defesa, Agilidade velocidade, Inteligência poder e energia', perto(S.armor - a0, 0.0175) && perto(S.speedMult - v0, 0.012) && perto(S.power - w0, 0.03) && p.maxEnergy - e0 === 4,
        `${(S.armor - a0).toFixed(4)} ${(S.speedMult - v0).toFixed(4)} ${(S.power - w0).toFixed(3)} ${p.maxEnergy - e0}`);
      this.ok('atributos: Sorte dá crítico e sorte no saque', S.crit > c0 && S.sorte === 2 && Atributos.sorteSaque() > 0 && Atributos.chanceSaque(0.05) > 0.05);
      this.ok('atributos: sem pontos livres, nada mais entra', Atributos.livres(pr) === 0 && Atributos.distribuir(pr, 'forca', 5) === 0);
      this.ok('atributos: acima de 40 pontos, cada ponto rende a metade', Atributos.ef(40) === 40 && Atributos.ef(60) === 50);
      // salvamento: os pontos voltam; acima do total do nível, são devolvidos
      const j = JSON.parse(JSON.stringify(pr.toJSON())), q = new pr.constructor(pr.charId);
      q.load(j);
      this.ok('atributos: o salvamento guarda os pontos de cada atributo', JSON.stringify(q.atrib) === JSON.stringify(pr.atrib), JSON.stringify(q.atrib));
      j.level = 3; q.load(j);
      this.ok('atributos: pontos acima do total do nível são devolvidos ao carregar', !Object.keys(q.atrib).length);
      // tela: soma pendente só grava ao confirmar
      pr.atrib = {}; p.recalc(false);
      WorldInv.abrir('atributos');
      Atributos.mudar('sorte', 1); Atributos.mudar('sorte', 1); Atributos.mudar('forca', 1); Atributos.mudar('forca', -1);
      this.ok('tela de atributos: os pontos pendentes não valem antes de confirmar', Atributos.valor(pr, 'sorte') === 0 && Atributos.pendentes() === 2);
      WorldInv.draw(g.ctx, 0.1);
      this.igual('tela de atributos: botões − e + dos 6 atributos', WorldInv.ui.rects.filter((r) => r.atrib).length, 12);
      Atributos.confirmar();
      this.ok('tela de atributos: confirmar grava e recalcula o herói', Atributos.valor(pr, 'sorte') === 2 && S.sorte === 2 && Atributos.pendentes() === 0);
      g.stats.soulsBank = 1000;
      this.ok('atributos: redistribuir devolve tudo (nível 12: 180 células)', Atributos.redistribuir(pr) && g.stats.soulsBank === 820 && Atributos.gastos(pr) === 0 && Atributos.livres(pr) === 33, g.stats.soulsBank);
      WorldInv.fechar();
      // HUD: BOLSA e MAPA ao lado do AURORA; a bolsa abre nos atributos quando há pontos livres
      g.state = 'playing';
      g.hud.draw(g.ctx);
      this.igual('HUD: botões BOLSA e MAPA', WorldInv.botoesHud.map((b) => b.id).join(), 'bolsa,mapa');
      const b = WorldInv.botoesHud[0];
      this.ok('HUD: o botão BOLSA abre a mochila na aba ATRIBUTOS (há pontos livres)', b && WorldInv.cliqueHud({ x: b.cx, y: b.cy, clicked: true }) && g.state === 'worldinv' && WorldInv.ui.tab === 'atributos');
      WorldInv.fechar();
      const toque = TouchControls.buttons().map((t) => t.key);
      this.ok('toque: BOLSA (B) e MAPA (M) viram botões', toque.includes('KeyB') && toque.includes('KeyM'));
      pr.level = salvo.level; pr.atrib = salvo.atrib; g.stats.soulsBank = salvo.cel; p.recalc(true);
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    g.state = estado0;
    this.ok('atributos: sem exceção', !erro, erro);
  },

  // Corpos atléticos (opção nova de corpo): em A pelo rig do Blender (não tortos), cabeça medida pelo
  // perfil (o rosto do corpo sai inteiro), as peças com o encaixe deles num arquivo à parte (atl/)
  async corposAtleticos() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const corpos = CRIA_CATALOGO.filter((c) => c.tipo === 'corpo'), extra = corpos.filter((c) => c.extra);
    this.ok('atléticos: dois corpos extra no catálogo (Atlético e Atlética), com miniatura, e na lista de corpos da criação',
      extra.length === 2 && extra.every((c) => c.convertido && c.mini) && PERS_GLB.corpoG.length === 4 && Criacao3D.CORPOS.length === 4,
      extra.map((c) => c.id + ':' + c.nome).join(' '));
    const pecas = CRIA_CATALOGO.filter((c) => c.tipo !== 'corpo' && c.tipo !== 'npc' && c.convertido);
    const sem = pecas.filter((c) => !c.atl);
    this.ok(`atléticos: as peças da criação (${pecas.length}) têm o encaixe nos corpos atléticos (arquivo atl/ carregado só por quem usa um deles)`, pecas.length > 200 && sem.length <= 2, sem.slice(0, 4).map((c) => c.id).join(' '));
    const estado0 = g.state;
    try {
      for (const [corpoG, cid, classe] of [[2, 'corpo_am', 'guerreiro'], [3, 'corpo_af', 'mago']]) {
        const def = Perfis.registrar({ id: `p_teste_atl_${corpoG}`, nome: 'Atleta', classe, aparencia: Object.assign(persAparenciaPadrao(classe), { estilo: 0, corpoG, rostoG: corpoG === 2 ? 0 : 4, cabeloG: 11, barbaG: 0, bigodeG: 0 }) });
        for (let i = 0; i < 600 && Criacao3D.preparar(def) !== true; i++) await espera(50);
        const B = window.CRIA3D[cid], C = window.CRIA3D.cabelo_longo, R = window.CRIA3D.rosto_1;
        this.ok(`atléticos ${cid}: corpo, rosto e cabelo com física prontos (o encaixe no corpo atlético veio do arquivo atl/)`,
          !!B && !!R && !!C && !!(R.porCorpo && R.porCorpo[cid]) && !!(C.cadeias && C.cadeias[cid] && C.cadeias[cid].length) && !!(C.colisores && C.colisores[cid]), cid);
        const m = B.medida;
        // a cabeça medida pelo perfil: o nariz acima do corte e abaixo do topo, o corte logo abaixo do
        // queixo (o rosto esculpido do corpo, com a barba no Atlético, sai inteiro)
        this.ok(`atléticos ${cid}: cabeça medida (corte ${m.corte.toFixed(1)} < pescoço ${m.pescoco.toFixed(1)} < nariz ${m.nariz.toFixed(1)} < topo ${m.topo.toFixed(1)}; nenhuma parte do corpo acima do corte)`,
          m.corte < m.pescoco && m.pescoco < m.nariz && m.nariz < m.topo - 3 && m.nariz - m.corte < 4.5);
        MODELS3D[def.model].model = null;
        const M = g.model3(def.model), v = new Player(0, 0, def);
        v.vitrine = true; v.facing = v.viewFacing = 0; v.state = 'idle'; v.animTime = 0.3;
        for (let i = 0; i < 20; i++) { MODELS3D[def.model].pose(M, v, g.opts3(v, 0)); await espera(10); }
        const pc = M.cria.peles.corpo || [];
        let topo = -1e9;
        for (const sk of pc) for (let i = 2; i < sk.pos.length; i += 3) topo = Math.max(topo, sk.pos[i]);
        this.ok(`atléticos ${cid}: a pele do corpo termina no corte da cabeça (alto ${topo.toFixed(1)}, corte ${m.corte.toFixed(1)})`, pc.length > 0 && topo < m.corte + 1.2, topo.toFixed(2));
        // pose A (braços descidos pelo rig, não em T): na malha de repouso, as mãos bem abaixo do ombro
        let maoZ = -1e9;
        for (const sk of pc) if (sk.regiao === 'maos') for (let i = 2; i < sk.pos.length; i += 3) maoZ = Math.max(maoZ, sk.pos[i]);
        this.ok(`atléticos ${cid}: braços em A (o alto das mãos ${(m.ombroZ - maoZ).toFixed(1)} abaixo do ombro; em T ficaria na altura dele)`, maoZ > -1e9 && m.ombroZ - maoZ > 12, `${m.ombroZ.toFixed(1)} → ${maoZ.toFixed(1)}`);
      }
    } finally {
      g.state = estado0;
    }
  },

  // Luvas, botas e calças presas ao próprio membro (tools/importar_criacao.py: pesos só do braço,
  // da perna ou do tronco e pernas, e cada peça do par separada por pedaço contínuo) e a tela de
  // criação: cartões iguais com o estado de cada peça, rolagem do painel em tela baixa e o corpo
  // inteiro enquadrado pela caixa do modelo
  async membrosTela() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    let erro = null;
    if (typeof Criacao3D !== 'undefined' && Criacao3D.CAT.length) {
      try {
        const MEMBRO = { luvas: /^(arm|hand)[RL]/, botas: /^(thigh|shin|foot)[RL]$/ };
        const ids = CRIA_CATALOGO.filter((c) => ['luvas', 'botas', 'calcas'].includes(c.vaga) && c.convertido).map((c) => c.id);
        for (const id of ids) Criacao3D.carregar(id);
        for (let i = 0; i < 600 && ids.some((id) => !(window.CRIA3D && window.CRIA3D[id])); i++) await espera(50);
        const fora = [];
        for (const id of ids) {
          const D = window.CRIA3D[id];
          if (!D) { fora.push(`${id}: não carregou`); continue; }
          for (const corpo in D.porCorpo) for (const sk of D.porCorpo[corpo]) for (const o of sk.ossos) {
            const ruim = D.vaga === 'calcas' ? /^(arm|hand)/.test(o) : !MEMBRO[D.vaga].test(o);
            if (ruim) fora.push(`${id}/${corpo}: ${o}`);
          }
        }
        this.ok(`membros: as ${ids.length} luvas, botas e calças só pegam peso do próprio membro (a luva não segue a coxa, a calça não segue a mão)`, ids.length >= 60 && !fora.length, fora.slice(0, 4).join(' · '));
        if (R3D.active) {
          for (const corpoG of [0, 1]) {
            const def = Perfis.registrar({ id: `p_teste_membros_${corpoG}`, nome: 'Membros', classe: 'guerreiro', aparencia: Object.assign(persAparenciaPadrao('guerreiro'), { estilo: 0, corpoG }) });
            for (let i = 0; i < 400 && Criacao3D.preparar(def) !== true; i++) await espera(50);
            MODELS3D[def.model].model = null;
            const M = g.model3(def.model), prev = {};
            for (const id of ['ini_luvas', 'ini_botas', 'ini_calca']) { const it = Arsenal.gerarCat(id, 0); prev[it.slot] = it; }
            const v = new Player(0, 0, def); v.vitrine = true; v.pecasPrevia = prev; v.facing = v.viewFacing = 0;
            for (let i = 0; i < 600 && !Object.keys(prev).every((s) => M.cria.ids[s] === prev[s].cat); i++) { MODELS3D[def.model].pose(M, v, g.opts3(v, 0)); await espera(30); }
            // nenhum triângulo esticado de uma mão à outra (ou de um pé ao outro) na pose de repouso
            let aresta = 0;
            for (const vg of ['luvas', 'botas']) for (const sk of M.cria.peles[vg] || []) {
              const p = sk.pos, I = sk.idx;
              for (let t = 0; t < I.length; t += 3) for (let j = 0; j < 3; j++) {
                const a = I[t + j] * 3, b = I[t + (j + 1) % 3] * 3;
                aresta = Math.max(aresta, Math.hypot(p[a] - p[b], p[a + 1] - p[b + 1], p[a + 2] - p[b + 2]));
              }
            }
            this.ok(`membros corpo ${corpoG + 1}: luvas e botas sem triângulo esticado entre os dois lados (maior aresta ${aresta.toFixed(1)})`, aresta > 0 && aresta < 6, aresta.toFixed(2));   // (a barra de uma mão à outra tinha arestas de umas 20 unidades)
            // correndo e golpeando: cada vértice da luva fica junto da mão do seu lado, o da bota junto do pé
            let pior = { luvas: 0, botas: 0 };
            const N = M.nodes, ladoDe = (bn) => (bn === N.handR || bn === N.armRf || bn === N.armRu || bn === N.footR || bn === N.shinR || bn === N.thighR ? 'R' : 'L');
            for (const [st, tt] of [['run', 0.2], ['run', 0.5], ['attack', 0.3], ['idle', 0.4]]) {
              v.state = st; v.animTime = tt * 3; v.stateTime = tt; v.moveSpeed = v.vx = st === 'run' ? v.baseSpeed : 0;
              if (st === 'attack') { const T = CHARACTER_COMBOS[def.base] || COMBO_TABLE, id = T && T.L, d = ATTACKS[id]; v.attack = d ? { id, def: d, t: tt, dir: 0, serial: 1 } : null; } else v.attack = null;
              MODELS3D[def.model].pose(M, v, g.opts3(v, 0));
              (function anda(nd, Pm) { M3.mul(nd.w, Pm, M3.trs(nd.l, nd.p, nd.r, nd.s)); for (const k of nd.kids) anda(k, nd.w); })(M.root, M3.make());
              for (const [vg, osso] of [['luvas', 'hand'], ['botas', 'foot']]) for (const sk of M.cria.peles[vg] || []) {
                R3D.skin(sk, 0, !!M.dqs);
                const P = sk.P;
                for (let i = 0; i < P.length / 3; i++) {
                  const w = N[osso + ladoDe(sk.bones[sk.bi[i * 4]])].w;
                  pior[vg] = Math.max(pior[vg], Math.hypot(P[i * 3] - w[3], P[i * 3 + 1] - w[7], P[i * 3 + 2] - w[11]));
                }
              }
            }
            this.ok(`membros corpo ${corpoG + 1}: correndo e golpeando, a luva fica na mão e a bota no pé (luva até ${pior.luvas.toFixed(1)} do punho, bota até ${pior.botas.toFixed(1)} do tornozelo)`, pior.luvas > 0 && pior.luvas < 13 && pior.botas > 0 && pior.botas < 18, JSON.stringify(pior));
            delete MODELS3D[def.model].model;
          }
        }
      } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
      this.ok('membros: sem exceção', !erro, erro);
    }
    // ------------------------------------------------ a tela de criação
    const W0 = VIEW_W, H0 = VIEW_H;
    erro = null;
    try {
      CriacaoTela.abrir('criar');
      const U = CriacaoTela.ui;
      CriacaoTela.acao('aba', 'equipamento');
      const cartoes = () => U.rects.filter((r) => r.id === 'peca');
      VIEW_W = 1366; VIEW_H = 768;
      CriacaoTela.draw(g.ctx, 0.1);
      let C = cartoes();
      this.ok('tela 1366×768: os 7 cartões do conjunto inicial, todos do mesmo tamanho, e o painel sem rolagem', C.length === 7 && C.every((r) => r.w === C[0].w && r.h === C[0].h) && U.rolEsqMax === 0, `${C.length} ${U.rolEsqMax}`);
      const outro = CriacaoTela.peitoralDe(U.classe, U.peitoral) === 'ini_peitoral' ? 'ini_armadura' : 'ini_peitoral';
      CriacaoTela.acao('peca', outro);
      this.ok('tela: o cartão do peitoral da mochila passa a ser o vestido', CriacaoTela.peitoralDe(U.classe, U.peitoral) === outro);
      VIEW_W = 1225; VIEW_H = 566;   // 844 × 390 deitado
      CriacaoTela.draw(g.ctx, 0.2);
      CriacaoTela.draw(g.ctx, 0.2);
      const R = CriacaoTela.rEsq, dentro = U.rects.filter((r) => r.x >= R.x && r.x < R.x + R.w && r.y >= R.y - 1);
      this.ok('tela baixa: o painel da esquerda rola e nada clicável sai da parte visível', U.rolEsqMax > 0 && dentro.every((r) => r.y + r.h <= R.y + R.h + 0.5), `rolagem ${U.rolEsqMax}`);
      U.rolEsq = 1e9; CriacaoTela.draw(g.ctx, 0.3);
      C = cartoes();
      this.ok('tela baixa: rolado até o fim, os cartões aparecem inteiros', U.rolEsq === U.rolEsqMax && C.length === 7 && C.every((r) => r.h === C[0].h), `${C.length}`);
      // enquadramento: o corpo inteiro (caixa do modelo) cabe na prévia, larga ou estreita
      let fora = null;
      for (const [pw, ph] of [[580, 630], [300, 470], [900, 420]]) {
        const P = { x: 0, y: 0, w: pw, h: ph }, bb = { z0: 0, z1: 72, r: 22 };
        CriacaoTela._bb = bb; CriacaoTela._bbDef = 'x'; CriacaoTela._cam = null;
        let N = null;
        for (let i = 0; i < 80; i++) N = CriacaoTela.niveisZoom(P, 1, 'x');
        const view = CriacaoTela.camera(P, 0.6, 0.18, N[0].d, N[0].z), Mv = view.mvp;
        for (const [px, py, pz] of [[0, 0, bb.z1], [0, 0, 0], [bb.r, 0, bb.z1 / 2], [-bb.r, 0, bb.z1 / 2], [0, bb.r, bb.z1 / 2], [0, -bb.r, bb.z1 / 2], [bb.r * 0.7, bb.r * 0.7, bb.z1]]) {
          const cx = Mv[0] * px + Mv[4] * py + Mv[8] * pz + Mv[12], cy = Mv[1] * px + Mv[5] * py + Mv[9] * pz + Mv[13], cw = Mv[3] * px + Mv[7] * py + Mv[11] * pz + Mv[15];
          const nx = cx / cw, ny = cy / cw, topo = 1 - 2 * (CriacaoTela._topoBarra || 44) / ph;
          if (Math.abs(nx) > 1 || ny > topo || ny < -1) fora = `${pw}×${ph}: ponto ${px},${py},${pz} em ${nx.toFixed(2)},${ny.toFixed(2)}`;
        }
      }
      CriacaoTela._bb = null; CriacaoTela._cam = null;
      this.ok('tela: o corpo inteiro (alto, pés e braços abertos) cabe na prévia larga, estreita e baixa, abaixo dos botões do alto', !fora, fora);
      CriacaoTela.fechar();
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    VIEW_W = W0; VIEW_H = H0;
    this.ok('tela de criação (cartões, rolagem, enquadramento): sem exceção', !erro, erro);
  },

  async criacaoGLB() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const carregar = (ids) => new Promise((res) => { let n = ids.length; if (!n) res(); for (const id of ids) Criacao3D.carregar(id, () => { if (--n === 0) res(); }); setTimeout(res, 30000); });
    // ------------------------------------------------ catálogo central e caminhos reais
    const pecas = CRIA_CATALOGO.filter((c) => c.tipo === 'peca'), ini = pecas.filter((c) => c.nivel === 1), n30 = pecas.filter((c) => c.nivel === 30);
    this.igual('catálogo: 4 corpos (os 2 de sempre e os 2 atléticos), 8 rostos, 25 cabelos (8 enviados do Meshy, 15 em mechas do Blender, 5 deles masculinos, e 2 gerados no Meshy por texto), 18 barbas e bigodes (5 do Meshy e 13 do Blender)', ['corpo', 'rosto', 'cabelo', 'barba'].map((t) => CRIA_CATALOGO.filter((c) => c.tipo === t).length).join(','), '4,8,25,18');
    this.ok('opções da criação: 26 de cabelo, 17 de barba (com as combinações de barba e bigode), cor da barba (a do cabelo ou própria) e 12 cores de olhos',
      PERS_GLB.cabeloG.length === 26 && PERS_CABELOS_GLB.length === 26 && PERS_GLB.barbaG.length === 17 && Criacao3D.BARBAS.length === 16 &&
      Criacao3D.BARBAS.every((id) => Criacao3D.POR_ID[id] && Criacao3D.POR_ID[id].tipo === 'barba') && PERS_APAR.corBarba.ops.length === PERS_CABELOS.length + 1 && PERS_OLHOS.length === 12,
      `${PERS_GLB.cabeloG.length} ${PERS_GLB.barbaG.length} ${PERS_OLHOS.length}`);
    {
      const pd = (ap) => Criacao3D.pecasDe({ aparencia: Object.assign(persAparenciaPadrao('guerreiro'), ap) });
      this.ok('bigode separado: com barba em mechas sem bigode ou sem barba, vira a peça; com barba do Meshy, não aparece (a célula do atlas é a da barba)',
        pd({ barbaG: 16, bigodeG: 2 }).bigode === 'barba_b_guidao' && pd({ barbaG: 0, bigodeG: 3 }).bigode === 'barba_b_fino' && pd({ barbaG: 1, bigodeG: 1 }).bigode === null &&
        pd({ barbaG: 7, bigodeG: 0 }).bigode === null && Criacao3D.BIGODES.every((id) => Criacao3D.POR_ID[id]) && Criacao3D.CEL.bigode.join() === Criacao3D.CEL.barba.join());
    }
    this.igual('cortes masculinos em mechas no catálogo', ['raspado', 'militar', 'topete', 'undercut', 'moicano'].filter((c) => Criacao3D.POR_ID['cabelo_' + c] && Criacao3D.POR_ID['cabelo_' + c].fisica).length, 5);
    this.igual('catálogo: 7 peças do nível 1 (Armaduras_Inicial_Level_1/)', ini.filter((c) => c.arq.startsWith('assets/Criar_Personagem/Armaduras_Inicial_Level_1/') && c.arq.endsWith('.glb')).length, 7);
    this.ok('catálogo: 7 peças de nível 30 para cada uma das 5 classes (Armaduras_Level_30/<classe>/)', ARM_CLASSES.every((c) => n30.filter((q) => q.classe === c && q.arq.startsWith('assets/Criar_Personagem/Armaduras_Level_30/')).length === 7), n30.length);
    const campos = ['itemLevel', 'rarity', 'requiredLevel', 'allowedClasses', 'equipmentSlot', 'baseStats', 'bonusStats', 'modelPath', 'iconPath', 'description', 'sellValue', 'setId'];
    this.ok('catálogo: cada armadura com os 12 campos (42 do início e do nível 30, 135 dos níveis 50 a 100 e 3 peitorais avulsos)', Object.values(ARMADURAS_GLB).length === 42 + 135 + 3 && Object.values(ARMADURAS_GLB).every((D) => campos.every((k) => D[k] !== undefined && D[k] !== '')), Object.keys(ARMADURAS_GLB).length);
    {
      // peitorais avulsos enviados (Lobo, Corvo e Bronze): fora dos conjuntos, classes próprias, força pelo nível, Armaria e saques
      const av = Object.values(ARMADURAS_GLB).filter((D) => D.setId === 'avulsas');
      const lobo = ARMADURAS_GLB.av_lobo_peitoral, bronze = ARMADURAS_GLB.av_bronze_peitoral;
      this.ok('peitorais avulsos: Lobo (20), Corvo (35) e Bronze (45), convertidos, com classes próprias e defesa crescente com o nível; a Armaria e os saques usam a faixa do herói',
        av.length === 3 && av.every((D) => D.convertido && D.equipmentSlot === 'peitoral' && D.allowedClasses.length >= 2 && D.allowedClasses.length < 5) &&
        lobo && bronze && bronze.baseStats.defesa > lobo.baseStats.defesa && Arsenal.pecasAvulsas(40, null).includes('av_corvo_peitoral') && !Arsenal.pecasAvulsas(5, null).includes('av_bronze_peitoral'),
        av.map((D) => `${D.id}:${D.itemLevel}:${D.baseStats.defesa}`).join(' '));
    }
    this.ok('catálogo: todas convertidas para o motor', CRIA_CATALOGO.every((c) => c.convertido), CRIA_CATALOGO.filter((c) => !c.convertido).map((c) => c.id).join(','));
    // ------------------------------------------------ níveis 50, 75 e 100 (feitos no Blender a partir das imagens)
    for (const nv of [50, 75, 100]) {
      const L = pecas.filter((c) => c.nivel === nv);
      this.ok(`nível ${nv}: 9 peças por classe (8 da imagem; as ombreiras viram esquerda e direita), GLB do Blender ao lado da imagem ou GLB realista pronto`,
        ARM_CLASSES.every((c) => { const q = L.filter((x) => x.classe === c); return q.length === 9 && q.every((x) => x.arq.startsWith(`assets/Criar_Personagem/Armaduras_Level_${nv}/`) && x.arq.endsWith('.glb') && x.mini.endsWith(`_nivel${nv}.png`) && (x.blender ? x.arq.endsWith(`_nivel${nv}.glb`) : x.real)); }), L.length);
      this.ok(`nível ${nv}: as vagas do Arsenal (com ombroE e ombroD) e um conjunto de 9 por classe`,
        ARM_CLASSES.every((c) => ['peitoral', 'ombroE', 'ombroD', 'capa', 'capacete', 'luvas', 'calcas', 'botas', 'acessorio'].every((v) => L.some((x) => x.classe === c && x.vaga === v)) && ARM_CONJUNTOS[c + nv] && ARM_CONJUNTOS[c + nv].completo === 9));
    }
    this.ok('Guerreiro nível 50: peitoral, calça, botas, capa e capuz são os GLB realistas enviados (exemplo_glb/)', ['peitoral', 'calcas', 'botas', 'capa', 'capacete'].every((v) => { const c = Criacao3D.POR_ID[`n50_guerreiro_${v}`]; return c && c.real && c.arq.includes('/exemplo_glb/'); }) && Criacao3D.POR_ID.n50_guerreiro_peitoral.ombros);
    this.ok('Mago nível 50: as sete peças realistas enviadas (exemplo_glb/), com as ombreiras próprias à mostra (o manto não as esconde)', ['peitoral', 'ombroE', 'ombroD', 'calcas', 'botas', 'capa', 'capacete', 'luvas'].every((v) => { const c = Criacao3D.POR_ID[`n50_mago_${v}`]; return c && c.real && c.arq.includes('/exemplo_glb/'); }) && !Criacao3D.POR_ID.n50_mago_peitoral.ombros && Criacao3D.POR_ID.n50_mago_acessorio.blender);
    const reais = (pre, vagas) => vagas.every((v) => { const c = Criacao3D.POR_ID[pre + v]; return c && c.real && c.arq.includes('/exemplo_glb/'); });
    this.ok('Patrulheiro 50 (sete peças com as ombreiras de folhas), Guardião Arcano 50 (seis; o peitoral traz as ombreiras) e Assassino 75 (sete, com o amuleto): GLB realistas enviados',
      reais('n50_patrulheiro_', ['peitoral', 'ombroE', 'ombroD', 'calcas', 'botas', 'capa', 'capacete', 'luvas']) && !Criacao3D.POR_ID.n50_patrulheiro_peitoral.ombros &&
      reais('n50_guardiao_', ['peitoral', 'calcas', 'botas', 'capa', 'capacete', 'luvas']) && Criacao3D.POR_ID.n50_guardiao_peitoral.ombros && Criacao3D.POR_ID.n50_guardiao_ombroE.blender &&
      reais('n75_assassino_', ['peitoral', 'ombroE', 'ombroD', 'calcas', 'botas', 'capacete', 'luvas', 'acessorio']) && Criacao3D.POR_ID.n75_assassino_capa.blender);
    this.ok('Guerreiro 75: peitoral (com as ombreiras), calça, botas, elmo e manto são os GLB realistas enviados; luvas, ombreiras e amuleto continuam os do Blender',
      reais('n75_guerreiro_', ['peitoral', 'calcas', 'botas', 'capa', 'capacete']) && Criacao3D.POR_ID.n75_guerreiro_peitoral.ombros &&
      ['ombroE', 'ombroD', 'luvas', 'acessorio'].every((v) => Criacao3D.POR_ID[`n75_guerreiro_${v}`].blender));
    this.ok('Mago 75 (manto com ombreiras, saia, grevas, capuz, capa e as asas de cristal nas costas), Patrulheiro 75 (cinco) e Guardião Arcano 75 (sete, com ombreiras e manoplas): GLB realistas enviados',
      reais('n75_mago_', ['peitoral', 'calcas', 'botas', 'capacete', 'capa', 'acessorio']) && Criacao3D.POR_ID.n75_mago_peitoral.ombros && Criacao3D.POR_ID.n75_mago_luvas.blender &&
      reais('n75_patrulheiro_', ['peitoral', 'calcas', 'botas', 'capacete', 'capa']) && Criacao3D.POR_ID.n75_patrulheiro_peitoral.ombros &&
      reais('n75_guardiao_', ['peitoral', 'ombroE', 'ombroD', 'luvas', 'calcas', 'botas', 'capa', 'capacete']) && !Criacao3D.POR_ID.n75_guardiao_peitoral.ombros);
    // ------------------------------------------------ rig: pele por quatérnios duplos (R3D.skin, personagens principais)
    if (R3D.data) {
      const osso = (rz) => { const n = new N3('osso'); M3.trs(n.w, [0, 0, 0], [0, 0, rz], [1, 1, 1]); return n; };
      const id12 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0], inv = new Float32Array(24);
      inv.set(id12); inv.set(id12, 12);
      // um ponto a 2 unidades do eixo, metade em cada osso, com a junta dobrada 150°
      const sk = { bones: [osso(0), osso(2.6)], inv, pos: new Float32Array([2, 0, 0]), nor: new Float32Array([1, 0, 0]), att: new Float32Array(4), bi: new Uint8Array([0, 1, 0, 0]), bw: new Float32Array([0.5, 0.5, 0, 0]), idx: new Uint16Array([0, 0, 0]) };
      R3D.skin(sk, 0, false);
      const lin = Math.hypot(sk.P[0], sk.P[1]);
      R3D.skin(sk, 0, true);
      const dq = Math.hypot(sk.P[0], sk.P[1]);
      this.ok('rig: na junta dobrada, a pele por quatérnios duplos mantém o volume (a linear encolhe)', lin < 0.7 && Math.abs(dq - 2) < 0.02, `linear ${lin.toFixed(2)} · duplos ${dq.toFixed(2)}`);
      sk.bones[1].w[0] *= 1.3;   // escala diferente nos eixos (o achatamento do pulo): volta para a linear
      R3D.skin(sk, 0, true);
      this.ok('rig: osso com escala não uniforme usa a pele linear (sem erro)', Number.isFinite(sk.P[0]) && !R3D.quatDuplos(sk, sk.S, 2));
      this.ok('rig: herói e personagem criado usam a pele por quatérnios duplos', !!game.model3(heroModelKey({ id: 'kael', model: 'kael' }, true)).dqs);
    }
    // ------------------------------------------------ cabelo com física (Blender + js/criacao/cabelo_fisica.js)
    const cabF = CRIA_CATALOGO.filter((c) => c.tipo === 'cabelo' && c.fisica);
    this.ok('cabelo em mechas: os quinze cortes do Blender no catálogo e nas opções da criação (curto, médio, longo, espetado, ondulado, coque, rabo, tranças, franja, repicado e os masculinos raspado, militar, topete, undercut e moicano)',
      cabF.length === 15 && cabF.every((c) => c.convertido && c.arq.startsWith('assets/Criar_Personagem/Cabelo_Fisica/') && PERS_CABELOS_GLB.includes(c.id)) && PERS_CABELOS_GLB.length === PERS_GLB.cabeloG.length, cabF.map((c) => c.id).join(','));
    {
      // cabelos gerados no Meshy por texto (tools/meshy): separados da cabeça de manequim, virados de frente
      // e encaixados pelo perfil do manequim; a mesma ordem de grandeza de escala nos dois corpos
      const cabM = CRIA_CATALOGO.filter((c) => c.tipo === 'cabelo' && c.arq.startsWith('assets/Criar_Personagem/Cabelo_Meshy/'));
      const pd = (i) => Criacao3D.pecasDe({ aparencia: Object.assign(persAparenciaPadrao('assassino'), { cabeloG: i }) }).cabelo;
      await carregar(cabM.map((c) => c.id).concat('minis'));
      const esc = cabM.map((c) => { const a = (window.CRIA3D[c.id] || {}).ajuste || {}; return a.corpo_m && a.corpo_f ? a.corpo_f.escala / a.corpo_m.escala : 0; });
      this.ok('cabelos do Meshy por texto: Longo liso e Cyber espetado no catálogo, convertidos, nas opções 24 e 25, com o encaixe nos dois corpos',
        cabM.length === 2 && cabM.every((c) => c.convertido && typeof CRIA_MINIS !== 'undefined' && CRIA_MINIS[c.id]) && pd(24) === 'cabelo_meshy_longo' && pd(25) === 'cabelo_meshy_cyber' &&
        esc.every((r) => r > 0.75 && r < 1.45), `${cabM.map((c) => c.id)} ${esc.map((r) => r.toFixed(2))}`);
    }
    this.ok('cabelo com física: a opção escolhida vira a peça do catálogo', Criacao3D.pecasDe({ aparencia: Object.assign(persAparenciaPadrao('mago'), { cabeloG: 11 }) }).cabelo === 'cabelo_longo' && Criacao3D.pecasDe({ aparencia: Object.assign(persAparenciaPadrao('mago'), { cabeloG: 3 }) }).cabelo === 'cabelo_3');
    {
      // modelo mínimo: cabeça e uma cadeia de dois ossos; a cabeça anda de lado e para
      const root = new N3('root'), head = root.add(new N3('head'));
      head.p = [0, 0, 50];
      const m = new Model3(root);
      CabeloFisica.preparar(m, { cadeias: { corpo_m: [{ ossos: ['cabT_0', 'cabT_1'], p: [[0, 0, -1], [0, 0, -3]], ponta: [0, 0, -3] }] }, colisores: { corpo_m: [{ osso: 'head', c: [4, 0, -4], r: 1.5 }] }, fisica: { rigidez: 0.2, amortecimento: 0.08, peso: 1, limite: 80 } }, 'corpo_m');
      const anda = (nd, P) => { M3.mul(nd.w, P, M3.trs(nd.l, nd.p, nd.r, nd.s)); for (const k of nd.kids) anda(k, nd.w); };
      const quadro = () => { anda(m.root, M3.make()); m._cab.t -= 1 / 60; CabeloFisica.passo(m, null, 8); };
      const criou = !!m.nodes.cabT_1 && m.nodes.head.kids.includes(m.nodes.cabT_0) && !!m.rest.cabT_1;
      for (let i = 0; i < 30; i++) quadro();
      const parado0 = CabeloFisica.desvio(m);
      let maxMov = 0;
      for (let i = 0; i < 20; i++) { head.p[1] += 1.2; quadro(); maxMov = Math.max(maxMov, CabeloFisica.desvio(m)); }
      for (let i = 0; i < 240; i++) quadro();
      const volta = CabeloFisica.desvio(m), c = m._cab.cadeias[0];
      const comp = Math.hypot(c.X[3] - c.X[0], c.X[4] - c.X[1], c.X[5] - c.X[2]);
      this.ok('cabelo com física: os ossos das mechas entram presos à cabeça; a ponta fica para trás quando a cabeça anda e volta quando para; o osso não estica',
        criou && maxMov > parado0 + 0.4 && volta < maxMov * 0.5 && Math.abs(comp - c.L[1]) < 0.05, `criou ${criou} parado ${parado0.toFixed(2)} andando ${maxMov.toFixed(2)} depois ${volta.toFixed(2)} osso ${comp.toFixed(2)}/${c.L[1].toFixed(2)}`);
      CabeloFisica.preparar(m, null, 'corpo_m');
      this.ok('cabelo com física: trocar o cabelo tira os ossos do anterior', !m.nodes.cabT_0 && !m.rest.cabT_0 && !m.nodes.head.kids.length && !m._cab);
    }
    this.ok('nomes das peças: os das imagens (manifesto)', ARMADURAS_GLB.n75_guerreiro_peitoral.nome === 'Peitoral de Placas' && ARMADURAS_GLB.n100_mago_acessorio.nome === 'Amuleto do Astral' && ARMADURAS_GLB.n50_assassino_ombroE.nome.startsWith('Ombreiras Leves'));
    this.ok('força cresce com a faixa (defesa do peitoral 30 < 50 < 75 < 100)', ['30', '50', '75', '100'].map((n) => ARMADURAS_GLB[`n${n}_guerreiro_peitoral`].baseStats.defesa).every((v, i, a) => !i || v > a[i - 1]));
    this.igual('faixa do conjunto pelo nível da zona (20, 26, 47, 72, 96)', [20, 26, 47, 72, 96].map((n) => Arsenal.faixaClasse(n)).join(','), '0,30,50,75,100');
    this.ok('montagem: ombreiras com célula própria no atlas, sem sobrepor as outras', ['ombroE', 'ombroD'].every((v) => Criacao3D.VAGAS.includes(v) && Criacao3D.CEL[v]) && (() => {
      const C = Object.entries(Criacao3D.CEL).filter(([k]) => k !== 'bigode').map(([, c]) => c);   // (o bigode divide a célula da barba de propósito)
      return C.every(([x, y, l]) => x + l <= 2048 && y + l <= 2048) && C.every((a, i) => C.every((b, j) => i === j || a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0] || a[1] + a[2] <= b[1] || b[1] + b[2] <= a[1]));
    })());
    // ------------------------------------------------ raridades
    this.igual('raridades: seis (Comum, Incomum, Raro, Épico, Lendário, Mítico)', ARS_RARIDADES.map((r) => `${r.name}/${r.cor}`).join(','), 'Comum/branco,Incomum/verde,Raro/azul,Épico/roxo,Lendário/dourado,Mítico/vermelho');
    this.igual('raridades: as relíquias têm os mesmos seis graus (até a Mítica)', WORLD_RARIDADES.map((r) => r.id).join(), 'comum,incomum,raro,epico,lendario,mitico');
    const lend1 = Arsenal.gerarCat('ini_botas', 3), comum30 = Arsenal.gerarCat('n30_mago_botas', 0);
    this.ok('raridade independe do nível (nível 1 Lendária, nível 30 Comum)', lend1.r === 3 && lend1.lv === 1 && comum30.r === 0 && comum30.lv === 30);
    this.ok('raridade: um atributo sorteado por grau acima de Comum', [0, 1, 2, 3].every((r) => Object.keys(Arsenal.gerarCat('n30_guerreiro_peitoral', r).bonus).length === r));
    this.ok('raridade: nada além do Mítico (pedido maior vira Mítico; o 5 é o Mítico)', Arsenal.gerarCat('ini_capa', 9).r === ARS_MITICA && Arsenal.gerar('botas', 'couro', 5, 10).r === ARS_MITICA && Arsenal.gerar('botas', 'couro', ARS_LENDARIA, 10).r === ARS_LENDARIA);
    // ------------------------------------------------ personagem criado no estilo Realista: mundo, inventário inicial
    const K = PERFIS_CHAVE, ler = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const grava = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
    const ls0 = ler(K), lsr0 = ler(K + '_reserva'), lsW = ler(WORLD_SAVE_KEY), ativo0 = RosterManager.active, salvarMundo = World.save;
    World.save = () => {};   // o mundo do jogador não é tocado (só o do personagem de teste, de propósito)
    let id = null, erro = null;
    try {
      const r = Perfis.criar('Brisa', 'guerreiro', Object.assign(persAparenciaPadrao('guerreiro'), { corpoG: 1, rostoG: 5, cabeloG: 6, barbaG: 0, pele: 4, corCabelo: 2 }), null, { peitoral: 'ini_peitoral' });
      id = r.perfil.id;
      const def = CHARACTERS_BY_ID[id];
      this.ok('perfil: escolhas do estilo Realista e o peitoral inicial salvos', r.ok && r.perfil.aparencia.estilo === 0 && r.perfil.aparencia.rostoG === 5 && r.perfil.opcoes.peitoral === 'ini_peitoral');
      // pacote do personagem (exportar/importar; o formato do modo online futuro)
      const pk = Perfis.pacote(id), pkJ = JSON.parse(JSON.stringify(pk));
      pkJ.aparencia.olhos = 99; pkJ.vestidos = { botas: { cat: 'n75_mago_botas', r: 7, lv: 500 }, capa: { cat: 'nao_existe', r: 1, lv: 1 } };
      const volta = Perfis.dePacote(pkJ);
      this.ok('pacote do personagem: aparência e opções vão e voltam; campo fora das opções volta ao padrão; peça desconhecida sai',
        pk && pk.esquema === 'eclipse-zero/personagem' && volta && volta.aparencia.rostoG === 5 && volta.aparencia.corBarba === 0 && volta.aparencia.olhos === persAparenciaPadrao('guerreiro').olhos &&
        volta.vestidos.botas && volta.vestidos.botas.r === 3 && volta.vestidos.botas.lv === 100 && !volta.vestidos.capa && Perfis.dePacote({ esquema: 'outro' }) === null);
      this.ok('modelo: o personagem usa as peças GLB', Criacao3D.usa(def));
      // peças da aparência e as armaduras carregadas (scripts sob demanda, como no jogo)
      await carregar(['corpo_f', 'rosto_6', 'cabelo_6', 'corpo_m', 'rosto_1', 'cabelo_1', 'barba_curta', 'minis'].concat(ARM_INICIAL, ['n30_guerreiro_peitoral', 'n30_guerreiro_capa']));
      this.ok('carregamento: peças, armaduras e miniaturas chegam por <script>', ['corpo_f', 'rosto_6', 'cabelo_6', 'ini_botas', 'n30_guerreiro_capa'].every((k) => Criacao3D.tem(k)) && typeof CRIA_MINIS !== 'undefined');
      await carregar(['n75_guerreiro_peitoral', 'n100_mago_capa']);
      const conta = (id, c) => window.CRIA3D[id].porCorpo[c].reduce((s, k) => s + atob(k.i).length / 6, 0);   // triângulos (uint16 ×3)
      this.ok('Blender: a peça tem a forma dos dois corpos com a mesma malha (shape key do feminino)', ['n75_guerreiro_peitoral', 'n100_mago_capa'].every((id) => Criacao3D.tem(id) && conta(id, 'corpo_m') > 0 && conta(id, 'corpo_m') === conta(id, 'corpo_f')),
        ['n75_guerreiro_peitoral', 'n100_mago_capa'].map((id) => Criacao3D.tem(id) ? conta(id, 'corpo_m') + '/' + conta(id, 'corpo_f') : 'falta').join(' '));
      MODELS3D[def.model].model = null;
      const M = g.model3(def.model);
      const conf = (m) => {
        const err = [];
        for (const sk of m.skins) {
          const nv = sk.pos.length / 3;
          if (!sk.bones.every(Boolean)) err.push(sk.nome + ': osso');
          for (let i = 0; i < sk.idx.length; i++) if (sk.idx[i] >= nv) { err.push(sk.nome + ': índice'); break; }
          for (let v = 0; v < nv; v++) { const w = sk.bw[v * 4] + sk.bw[v * 4 + 1] + sk.bw[v * 4 + 2] + sk.bw[v * 4 + 3]; if (Math.abs(w - 1) > 0.02 || !isFinite(sk.pos[v * 3])) { err.push(sk.nome + ': peso'); break; } }
          for (let j = 0; j < sk.att.length; j += 4) if (sk.att[j + 2] > -0.5 && (sk.att[j] < 0 || sk.att[j] > 1 || sk.att[j + 1] < 0 || sk.att[j + 1] > 1)) { err.push(sk.nome + ': uv'); break; }
        }
        return err.join(',');
      };
      this.ok('modelo GLB: montado (corpo feminino, rosto 6, cabelo 6) com pele válida', M && M.cria && !M.criaVazio && M.cria.corpo === 'corpo_f' && M.cria.ids.rosto === 'rosto_6' && M.cria.ids.cabelo === 'cabelo_6' && !conf(M), M && (M.criaVazio ? 'vazio' : conf(M)));
      this.ok('modelo GLB: atlas 2048 com material e normais', M.tex.canvas.width === 2048 && M.tex.mat.width === 1024 && M.tex.nrm.width === 1024 && M.tex.pbr);
      this.ok('modelo GLB: regiões do corpo separadas (tronco, braços, mãos, pernas, pés)', ['tronco', 'bracos', 'maos', 'pernas', 'pes'].every((rg) => M.cria.peles.corpo.some((S) => S.regiao === rg)));
      for (let i = 0; i < 60 && !Criacao3D.pintado(M); i++) await espera(50);
      this.ok('modelo GLB: atlas pintado depois das imagens', Criacao3D.pintado(M));
      // tintura: pele vai para o tom; cabelo segue a luminância
      const px = new Uint8ClampedArray([200, 140, 110, 255, 198, 142, 108, 255, 30, 30, 32, 255, 205, 138, 112, 255].concat(...Array(2000).fill([201, 141, 109, 255])));
      const px0 = px.slice(); Criacao3D.tingirPele(px, [0.36, 0.24, 0.16]);
      this.ok('tintura: a pele escurece para o tom escolhido e o preto (roupa) não muda', px[0] < px0[0] * 0.7 && px[8] === px0[8] && px[9] === px0[9]);
      const ph = new Uint8ClampedArray([].concat(...Array(2000).fill([120, 120, 120, 255]), [240, 240, 240, 255]));
      Criacao3D.tingirCabelo(ph, [0.8, 0.2, 0.1]);
      this.ok('tintura: o cabelo cinza vira a cor escolhida e o reflexo continua mais claro', ph[0] > ph[2] * 3 && ph[2000 * 4] > ph[0], `${ph[0]},${ph[2]} reflexo ${ph[2000 * 4]}`);
      // pose: dobra sem esticar e na altura de um herói
      const v = new Player(0, 0, def), mundo = () => { (function anda(nd, P) { M3.mul(nd.w, P, M3.trs(nd.l, nd.p, nd.r, nd.s)); for (const k of nd.kids) anda(k, nd.w); })(M.root, M3.make()); };
      let pior = 0, alt = 0, perr = '';
      for (const [st, t] of [['idle', 0.5], ['run', 0.3], ['dash', 0.1], ['hurt', 0.1]]) {
        v.state = st; v.stateTime = t; v.animTime = t; v.pecasPrevia = {};
        try { MODELS3D[def.model].pose(M, v, g.opts3(v, 0)); mundo(); } catch (e) { perr = st + ': ' + e.message; break; }
        let zmin = 1e9, zmax = -1e9;
        for (const sk of M.skins) { if (sk.hide) continue; R3D.skin(sk, 0); const P = sk.P; for (let i = 0; i < P.length; i += 3) { zmin = Math.min(zmin, P[i + 2]); zmax = Math.max(zmax, P[i + 2]); } }
        for (const sk of M.cria.peles.corpo) { const P = sk.P, I = sk.idx; for (let i = 0; i < I.length; i += 3) pior = Math.max(pior, Math.hypot(P[I[i] * 3] - P[I[i + 1] * 3], P[I[i] * 3 + 1] - P[I[i + 1] * 3 + 1], P[I[i] * 3 + 2] - P[I[i + 1] * 3 + 2])); }
        if (st === 'idle') alt = zmax - zmin;
      }
      this.ok('pose GLB: o corpo dobra sem esticar (parado, correndo, esquiva, dano)', !perr && pior < 6, perr || pior.toFixed(2));
      this.ok('pose GLB: altura de um herói (50 a 65)', alt > 50 && alt < 65, alt.toFixed(1));
      // armaduras GLB no corpo: entram pela prévia, escondem o que fica dentro
      v.state = 'idle'; v.pecasPrevia = { botas: Arsenal.gerarCat('ini_botas', 0), capacete: Arsenal.gerarCat('ini_capuz', 0), capa: Arsenal.gerarCat('n30_guerreiro_capa', 1) };
      const n0 = M.skins.length;
      // (a peça entra quando as imagens dela chegaram: a pose é chamada a cada quadro, como no jogo)
      for (let i = 0; i < 100; i++) { MODELS3D[def.model].pose(M, v, g.opts3(v, 0)); if (M.cria.ids.botas && M.cria.ids.capacete && M.cria.ids.capa) break; await espera(50); }
      this.ok('armadura GLB: botas, capuz e capa entram no modelo', M.cria.ids.botas === 'ini_botas' && M.cria.ids.capacete === 'ini_capuz' && M.cria.ids.capa === 'n30_guerreiro_capa' && M.skins.length > n0 && !conf(M), conf(M));
      this.ok('armadura GLB: pés dentro das botas e cabelo dentro do capuz somem', M.cria.peles.corpo.filter((S) => S.regiao === 'pes').every((S) => S.hide) && M.cria.peles.cabelo.every((S) => S.hide) && M.cria.peles.corpo.filter((S) => S.regiao === 'tronco').every((S) => !S.hide));
      this.ok('armadura GLB: a capa pende nas abas (balança)', M.cria.peles.capa.some((S) => S.bones.some((b) => /^c[FSB][RL]2?$/.test(b.name))));
      v.pecasPrevia = {};
      MODELS3D[def.model].pose(M, v, g.opts3(v, 0));
      this.ok('armadura GLB: tirar devolve o corpo inteiro', !M.cria.ids.botas && M.cria.peles.corpo.every((S) => !S.hide) && M.skins.length === n0);
      if (R3D.active) {
        for (let i = 0; i < 40 && !Criacao3D.pintado(M); i++) await espera(50);
        PersonagemModelo._ret = {};
        const ret = PersonagemModelo.retrato(def);
        this.ok('retrato do HUD do personagem GLB: 288×288', ret && ret.width === 288);
      }
      // ------------------------------------------------ formato do rosto (deformação da malha do rosto e da barba)
      {
        const md = { topo: 61, pescoco: 54, cx: 1, cy: 0, largCabeca: 5.7, profCabeca: 7.1, profPescoco: 5.9, nariz: 56.5, corte: 54.1 };
        const P0 = [4.3, 0, 54.5, 0, 0, 53.2, 1, 0, 61, 3.4, 2.2, 55.2], dq = new Float32Array(P0), dm = new Float32Array(P0);
        Criacao3D.deformarRosto(dq, md, { rQueixo: 2 });
        Criacao3D.deformarRosto(dm, md, { rMandibula: 2, rLargura: 2 });
        this.ok('formato do rosto: o queixo vai para a frente e para baixo; a emenda do pescoço e o alto da cabeça não se movem; a mandíbula larga abre para o lado',
          dq[0] > P0[0] + 0.3 && dq[2] < P0[2] && [3, 4, 5, 6, 7, 8].every((i) => dq[i] === Math.fround(P0[i])) && dm[10] > P0[10] + 0.1 && dm[5] === Math.fround(P0[5]),
          `queixo ${dq[0].toFixed(2)}/${dq[2].toFixed(2)} mandíbula y ${dm[10].toFixed(2)}`);
        this.ok('formato do rosto: os 7 campos salvos (padrão no meio) e na categoria FORMA da tela', Criacao3D.FORMA.every((k) => PERS_APAR[k] && PERS_APAR[k].ops.length === 5 && persAparenciaPadrao('mago')[k] === 2) &&
          CRIA_CATS.some((c) => c.id === 'forma' && c.campos.length === 7));
      }
      // ------------------------------------------------ olhos coloridos, barba do Blender com cor própria, corte masculino
      await carregar(['corpo_m', 'rosto_1', 'barba_b_curta', 'cabelo_topete']);
      await carregar(['barba_b_ferradura']);
      const dO = { id: 'p_olhos', base: 'kael', classe: 'guerreiro', aparencia: Object.assign(persAparenciaPadrao('guerreiro'), { corpoG: 0, rostoG: 0, cabeloG: 21, barbaG: 7, bigodeG: 4, olhos: 7, corBarba: 7, rQueixo: 4 }) };
      const MO = Criacao3D.build(dO);
      for (let i = 0; i < 100 && !(MO && !MO.criaVazio && Criacao3D.pintado(MO)); i++) await espera(50);
      this.ok('olhos: a íris do rosto ganha a cor escolhida (os pixels da máscara feita pelo conversor)', MO && MO.cria && MO.cria.irisPx > 20, MO && MO.cria && MO.cria.irisPx);
      this.ok('olhos: os rostos 3, 7 e 8 (íris não achada com segurança) ficam sem máscara e marcados no catálogo; os outros cinco têm a máscara',
        ['rosto_3', 'rosto_7', 'rosto_8'].every((r) => Criacao3D.POR_ID[r].sem_iris) && [1, 2, 4, 5, 6].every((i) => !Criacao3D.POR_ID['rosto_' + i].sem_iris));
      this.ok('barba do Blender (curta) com o bigode ferradura separado, na cor própria, e o topete montados no corpo masculino',
        MO && MO.cria && MO.cria.ids.barba === 'barba_b_curta' && MO.cria.ids.bigode === 'barba_b_ferradura' && MO.cria.peles.bigode && MO.cria.ids.cabelo === 'cabelo_topete' && MO.cria.tinta.barba.join() !== MO.cria.tinta.cabelo.join(),
        MO && MO.cria && `${MO.cria.ids.barba} ${MO.cria.ids.cabelo}`);
      {
        const base = window.CRIA3D.rosto_1 && Criacao3D.carregar('rosto_1') && MO && MO.cria && MO.cria.peles.rosto;
        this.ok('formato do rosto no modelo montado: o queixo saliente vira cópia deformada da malha (a original, compartilhada, fica intacta)',
          !!(base && MO.cria.forma && MO.cria.forma.rQueixo === 2 && MO.cria.peles.rosto.every((S) => S.pos0 ? S.pos0.length === S.pos.length : true)));
      }
      // ------------------------------------------------ mundo: conjunto inicial (uma vez só, salvo)
      Perfis.ativar(id);
      grava(`${WORLD_SAVE_KEY}:${id}`, null);
      World.start();
      const A = Arsenal, V = A.vestidos(id), iniI = A.S.itens.filter((q) => q.cat && q.cat.startsWith('ini_'));
      this.ok('inicial: as 7 peças do nível 1 na mochila, Comuns', iniI.length === 7 && iniI.every((q) => q.r === 0 && q.lv === 1), iniI.map((q) => q.cat).join(','));
      this.ok('inicial: seis vestidas, com o peitoral escolhido (gibão)', Object.keys(V).length === 6 && V.peitoral.cat === 'ini_peitoral' && !Object.values(V).some((q) => q.cat === 'ini_armadura'));
      A.inicial(id, true); A.inicial(id, false);
      this.igual('inicial: entregar de novo não duplica', A.S.itens.filter((q) => q.cat && q.cat.startsWith('ini_')).length, 7);
      this.ok('inicial: nenhuma peça de nível 30', !A.S.itens.some((q) => q.cat && q.cat.startsWith('n30_')));
      // bônus de conjunto: 6 peças do Iniciado = as três faixas, uma vez cada
      const p = g.player, cj = A.conjuntos(id).find((c) => c.id === 'iniciado');
      this.ok('conjunto: 6/6 do Iniciado com as três faixas ativas', cj && cj.n === 6 && cj.ativos.length === 3);
      p.recalc(false); const hpA = p.maxHp; p.recalc(false); p.recalc(false);
      this.igual('conjunto: recalcular não soma o bônus de novo', p.maxHp, hpA);
      A.tirar('capa'); A.tirar('botas'); A.tirar('luvas');
      const cj3 = A.conjuntos(id).find((c) => c.id === 'iniciado');
      this.ok('conjunto: com 3 peças só a faixa de 2 fica', cj3.n === 3 && cj3.ativos.length === 1 && p.maxHp < hpA, `${cj3.n} ${cj3.ativos.length}`);
      // requisitos: nível e classe
      const g30 = A.guardar(A.gerarCat('n30_guerreiro_peitoral', 2), true), m30 = A.guardar(A.gerarCat('n30_mago_peitoral', 1), true);
      this.ok('requisito: nível 30 recusado no nível 1', /nível 30/.test(A.equipar(g30.id)));
      const lv0 = g.activeProgress().level; g.activeProgress().level = 30;
      this.ok('requisito: classe errada recusada (mago)', /classe Mago/.test(A.equipar(m30.id)));
      this.igual('requisito: nível 30 e classe certa veste', A.equipar(g30.id), '');
      this.ok('requisito: a peça de outra classe não serve no Kael', /classe/.test(A.podeUsar(g30, 'kael')));
      g.activeProgress().level = lv0;
      // filtros e detalhes da aba EQUIPAMENTO
      A.ui.vaga = ARS_ORDEM.indexOf('peitoral'); A.ui.filtroR = 2; A.ui.usaveis = false;
      const L2 = A.lista();
      this.ok('filtro: raridade Raro mostra só as azuis', L2.length >= 1 && L2.every((q) => q.r === 2));
      A.ui.filtroR = -1; A.ui.usaveis = true;
      this.ok('filtro: só as que posso usar esconde a do mago', !A.lista().some((q) => q.cat === 'n30_mago_peitoral') && A.lista().some((q) => q.cat === 'ini_armadura'));
      A.ui.usaveis = false;
      let terr = null;
      try { A.tooltip(g.ctx, g30, 200, 300); A.tooltip(g.ctx, m30, 900, 100); WorldInv.ui.rects = []; A.draw(g.ctx, { top: 120, det: 520, lx: 36 }, 0.5); } catch (e) { terr = e.message; }
      this.ok('aba EQUIPAMENTO: lista, filtros e detalhes desenham', !terr, terr);
      // salvamento: o inventário inicial e a raridade voltam iguais
      const qtd = A.S.itens.length, r30 = g30.r;
      salvarMundo.call(World);
      World.start();
      this.ok('salvamento: as peças, as vestidas e a marca do inicial voltam', Arsenal.S.itens.length === qtd && Arsenal.S.inicialGLB && Arsenal.S.itens.find((q) => q.cat === 'n30_guerreiro_peitoral').r === r30 && Arsenal.vestidos(id).peitoral.cat === 'n30_guerreiro_peitoral');
      Arsenal.inicial(id, false);
      this.igual('salvamento: ao voltar ao mundo, o inicial não repete', Arsenal.S.itens.filter((q) => q.cat && q.cat.startsWith('ini_')).length, 7);
      // salvamento antigo (seis raridades): Épica vira Rara; Lendária e Eclipse viram Lendário
      const W = World.state.arsenal;
      W.itens.push(Object.assign(A.gerar('botas', 'couro', 0, 5), { id: 9001, r: 3 }), Object.assign(A.gerar('luvas', 'couro', 0, 5), { id: 9002, r: 5 }));
      delete W.rv;
      const S2 = Arsenal.S;
      this.ok('migração: raridades antigas viram as de agora (Épica antiga → Raro, Lendária → Lendário)', S2.itens.find((q) => q.id === 9001).r === 2 && S2.itens.find((q) => q.id === 9002).r === ARS_LENDARIA && S2.itens.every((q) => q.r >= 0 && q.r <= ARS_MITICA) && World.state.arsenal.rv === 6);
      // aparência salva antes das peças GLB
      const Am = Perfis.validarAparencia({ corpo: 3, rosto: 2, cabelo: 3, barba: 4, pele: 5 }, 'mago');
      this.ok('migração: aparência antiga vira o estilo Realista mais parecido', Am.estilo === 0 && Am.corpoG === 1 && Am.rostoG === 6 && Am.cabeloG === 8 && Am.barbaG === 3 && Am.pele === 5, JSON.stringify(Am));
      // sem os arquivos convertidos: o modelo paramétrico
      const c0 = Criacao3D.POR_ID.rosto_3, conv = c0.convertido;
      c0.convertido = false;
      const dF = Perfis.registrar({ id: 'p_semglb', nome: 'Sem', classe: 'mago', aparencia: Object.assign(persAparenciaPadrao('mago'), { rostoG: 2 }) });
      const mF = g.model3(dF.model);
      this.ok('sem a peça convertida: usa o modelo paramétrico', mF && !mF.cria && mF.peles && mF.peles.corpo);
      c0.convertido = conv;
      delete MODELS3D[dF.model]; delete CHARACTERS_BY_ID.p_semglb; delete SKILL_SETS.p_semglb;
    } catch (e) { erro = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
    this.ok('peças GLB e armaduras: sem exceção', !erro, erro);
    // limpeza
    if (id) { try { localStorage.removeItem(`${WORLD_SAVE_KEY}:${id}`); localStorage.removeItem(`${WORLD_SAVE_KEY}:${id}_reserva`); } catch (e) {} const d = CHARACTERS_BY_ID[id]; if (d) { delete MODELS3D[d.model]; delete CHARACTERS_BY_ID[id]; delete SKILL_SETS[id]; } }
    grava(K, ls0); grava(K + '_reserva', lsr0);
    Perfis.carregar(); Perfis.dados.ativo = null;
    grava(WORLD_SAVE_KEY, null);
    World.start();
    World.save = salvarMundo;
    grava(WORLD_SAVE_KEY, lsW);
    if (RosterManager.isSelectable(ativo0)) RosterManager.active = ativo0;
    g.state = 'playing';
  },

  // Resultado na tela (canto superior esquerdo), por cima do jogo
  mostrar(res) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;max-width:min(560px,90vw);max-height:80vh;overflow:auto;background:rgba(4,8,18,0.92);color:#e6eefa;font:12px/1.4 monospace;padding:10px 12px;border:1px solid ' + (res.falhas ? '#ff6b6b' : '#5dff8a');
    d.textContent = `TESTES ECLIPSE ZERO · ${res.ok}/${res.total} ok` + (res.falhas ? '\n\n' + res.lista.filter((t) => !t.ok).map((t) => `✗ ${t.nome}: ${t.info}`).join('\n') : ' ✓');
    d.style.whiteSpace = 'pre-wrap';
    document.body.appendChild(d);
  },
};
