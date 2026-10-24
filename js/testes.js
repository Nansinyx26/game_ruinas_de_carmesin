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
    // malha de uma armadura especial (carregada por <script>, como no jogo; espera até 15 s)
    ArmorModels.ensure('lyra_n1');
    for (let i = 0; i < 150 && ArmorModels.estado.lyra_n1 === 'carregando'; i++) await new Promise((r) => setTimeout(r, 100));
    try {
      this.armas();
      this.encaixes();
      this.sacarGuardar();
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
    } catch (err) {
      this.ok('sem exceção durante os testes', false, err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err);
    }
    g.saveGame = salvar;
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
      this.ok(`arma ${id}: GLB de origem registrado (${W.src})`, /^assets\/armas\/eclipse\/.+\.glb$/.test(W.src));
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
    const e = createEnemy('rastejador', p.x + 160, p.y, 1); e.hp = e.maxHp = 5000; e.spawnT = 0; e.state = 'idle'; g.enemies.push(e);
    const step = (s) => { for (let t = 0; t < s; t += 1 / 60) { p.update(1 / 60, this.entrada()); g.projectiles.update(1 / 60); } };
    p.facing = 0; p.state = 'idle';
    p.startAttack('orion_shot1', null); step(0.4);
    const h1 = e.hp;
    this.ok('tiro da pistola causa dano', h1 < 5000, h1);
    p.startAttack('orion_shot3', null); step(0.7);
    this.ok('rajada acerta mais de uma vez', 5000 - e.hp > 2 * (5000 - h1) * 0.8, `${5000 - h1} → ${5000 - e.hp}`);
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
      // num ponto livre da sala, com espaço à direita (os inimigos ficam a até 220 à frente)
      const R = g.room, livre = (x, y) => !R.blocksPoint(x, y, 30);
      for (const [fx, fy] of [[0.4, 0.5], [0.3, 0.5], [0.4, 0.35], [0.3, 0.65], [0.5, 0.5], [0.2, 0.4]]) {
        const x = R.w * fx, y = R.h * fy;
        if (livre(x, y) && livre(x + 110, y) && livre(x + 230, y) && livre(x + 230, y + 40)) { p.x = x; p.y = y; break; }
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
    const x0 = e.x; lanca(p, 'sera_pulso');
    for (let t = 0; t < 0.3; t += 1 / 60) e.update(1 / 60);   // o empurrão anda no update do inimigo
    this.ok('Pulso Repulsor: empurra o inimigo', e.x > x0 + 10, `${x0} → ${e.x}`);
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
    this.igual('mundo: 7 regiões', WORLD_REGIONS.length, 7);
    this.igual('mundo: 45 zonas no mapa (9 de Carmesin + 6 × 6)', Object.values(WORLD_ZONES).filter((z) => !z.instancia).length, 45);
    for (const R of WORLD_REGIONS) {
      const zs = worldZonesOf(R.id), hub = WORLD_ZONES[R.hub];
      this.ok(`${R.id}: zona de chegada com portal, mercador e missões`, hub && hub.region === R.id && hub.portal && hub.npcs.some((n) => n.merchant) && hub.npcs.some((n) => n.quest), R.hub);
      this.ok(`${R.id}: um acampamento de chefe com o inimigo do chefe`, zs.filter((z) => (z.camps || []).some((c) => c.boss && c.mobs[R.boss.type])).length === 1);
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
      const L = WorldInv.gerar(30, 'obsidiano', 4);
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
      this.campoAberto();
      this.campanhas();
      this.mapa();
      this.mmo();
      this.paisagem();
    } finally {
      World.save = salvar;
      try { if (ls === null) localStorage.removeItem(WORLD_SAVE_KEY); else localStorage.setItem(WORLD_SAVE_KEY, ls); } catch (e) {}
    }
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
    this.ok('povo: serviços conhecidos', WORLD_POVO.every((P) => (P.servicos || []).every((sv) => ['loja', 'curandeiro', 'ferreiro', 'artesao', 'treinador'].includes(sv))));
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
    this.igual('masmorras: uma por região', Object.keys(WORLD_MASMORRAS).length, 7);
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
    const deco = R.pillars.filter((q) => q.deco), obst = R.pillars.filter((q) => !q.deco);
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
      this.ok('campo aberto: atravessar a borda leste começa a viagem', !!cb);
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

  // Resultado na tela (canto superior esquerdo), por cima do jogo
  mostrar(res) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;max-width:min(560px,90vw);max-height:80vh;overflow:auto;background:rgba(4,8,18,0.92);color:#e6eefa;font:12px/1.4 monospace;padding:10px 12px;border:1px solid ' + (res.falhas ? '#ff6b6b' : '#5dff8a');
    d.textContent = `TESTES ECLIPSE ZERO · ${res.ok}/${res.total} ok` + (res.falhas ? '\n\n' + res.lista.filter((t) => !t.ok).map((t) => `✗ ${t.nome}: ${t.info}`).join('\n') : ' ✓');
    d.style.whiteSpace = 'pre-wrap';
    document.body.appendChild(d);
  },
};
