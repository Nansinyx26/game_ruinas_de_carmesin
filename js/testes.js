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

  // Resultado na tela (canto superior esquerdo), por cima do jogo
  mostrar(res) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;max-width:min(560px,90vw);max-height:80vh;overflow:auto;background:rgba(4,8,18,0.92);color:#e6eefa;font:12px/1.4 monospace;padding:10px 12px;border:1px solid ' + (res.falhas ? '#ff6b6b' : '#5dff8a');
    d.textContent = `TESTES ECLIPSE ZERO · ${res.ok}/${res.total} ok` + (res.falhas ? '\n\n' + res.lista.filter((t) => !t.ok).map((t) => `✗ ${t.nome}: ${t.info}`).join('\n') : ' ✓');
    d.style.whiteSpace = 'pre-wrap';
    document.body.appendChild(d);
  },
};
