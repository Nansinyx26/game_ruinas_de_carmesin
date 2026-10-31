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
      await this.criacaoGLB();
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
    this.igual('mundo: 10 regiões', WORLD_REGIONS.length, 10);
    this.igual('mundo: 72 zonas das regiões no mapa (9 de Carmesin + 6 × 6 + 3 cidades × 9)', Object.values(WORLD_ZONES).filter((z) => !z.instancia && !z.cidade).length, 72);
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
      this.ok(`${id}: masmorra de 3 andares, tesouros e chefe`, Object.values(WORLD_MASMORRAS).some((M) => M.reg === id && WORLD_ZONES[`${M.id}_2`]) && Object.values(WORLD_TESOUROS).filter((T) => WORLD_ZONES[T.zona].region === id).length >= 2 && zs.some((z) => z.camps.some((c) => c.boss)));
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
    const servicos = ['loja', 'curandeiro', 'ferreiro', 'artesao', 'treinador', 'armazem', 'armeiro', 'pesquisa', 'guilda', 'missoes', 'descanso'].concat(Object.keys(FAB_ESTACOES));   // + os da cidade (js/mundo/cidade.js)
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
    // renderizador realista (Three.js, js/realista/realista.js): módulo carregado por http, opções no
    // vídeo, e numa placa de vídeo emulada por software (a dos testes) ele mesmo cede ao clássico
    const vid = SETTINGS_TABS.find((t) => t.id === 'video').opts;
    this.ok('realista: opções de renderizador e cinco qualidades (Baixo a Cinematográfico) no vídeo', vid.some((o) => o.key === 'render3d') && vid.find((o) => o.key === 'realQual').names.join(',') === 'Baixo,Médio,Alto,Ultra,Cinematográfico');
    const RL = typeof window !== 'undefined' ? window.Realista3D : null, atv = RL ? RL.ativo() : false;
    this.ok('realista: módulo do Three.js carregado (por http) e pronto ou cedendo ao clássico com o motivo', !!RL && RL.QUAL.length === 5 && (RL.ok || /software|WebGL 2/.test(RL.erro || '')), RL ? `ok=${RL.ok} erro=${RL.erro}` : 'sem módulo');
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
      this.igual('arsenal: conjunto Eclipse nasce Lendário (a maior das quatro raridades)', ecl.r, ARS_LENDARIA);
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
      this.igual('cidade: 11 moradores', mor.length, CIDADE_POVO.length);
      // fachadas sólidas: ninguém entra no fundo dos prédios
      const R = g.room; p.x = 40; p.y = 300; R.collide(p, true);
      this.ok('cidade: as fachadas bloqueiam (colisão)', p.x >= CIDADE_RECUO && R.blocksPoint(60, 600, 10) && !R.blocksPoint(600, 600, 10));
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
  // (js/mundo/armaduras.js): catálogo e caminhos, quatro raridades, conjunto inicial (uma vez só,
  // salvo), requisitos de nível e classe, bônus de conjunto, filtros, modelo montado, atlas,
  // tintura, troca de peças no corpo e migração dos salvamentos antigos
  async criacaoGLB() {
    const g = game, espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const carregar = (ids) => new Promise((res) => { let n = ids.length; if (!n) res(); for (const id of ids) Criacao3D.carregar(id, () => { if (--n === 0) res(); }); setTimeout(res, 30000); });
    // ------------------------------------------------ catálogo central e caminhos reais
    const pecas = CRIA_CATALOGO.filter((c) => c.tipo === 'peca'), ini = pecas.filter((c) => c.nivel === 1), n30 = pecas.filter((c) => c.nivel === 30);
    this.igual('catálogo: 2 corpos, 8 rostos, 18 cabelos (8 do Meshy e 10 com física), 5 barbas', ['corpo', 'rosto', 'cabelo', 'barba'].map((t) => CRIA_CATALOGO.filter((c) => c.tipo === t).length).join(','), '2,8,18,5');
    this.igual('catálogo: 7 peças do nível 1 (Armaduras_Inicial_Level_1/)', ini.filter((c) => c.arq.startsWith('assets/Criar_Personagem/Armaduras_Inicial_Level_1/') && c.arq.endsWith('.glb')).length, 7);
    this.ok('catálogo: 7 peças de nível 30 para cada uma das 5 classes (Armaduras_Level_30/<classe>/)', ARM_CLASSES.every((c) => n30.filter((q) => q.classe === c && q.arq.startsWith('assets/Criar_Personagem/Armaduras_Level_30/')).length === 7), n30.length);
    const campos = ['itemLevel', 'rarity', 'requiredLevel', 'allowedClasses', 'equipmentSlot', 'baseStats', 'bonusStats', 'modelPath', 'iconPath', 'description', 'sellValue', 'setId'];
    this.ok('catálogo: cada armadura com os 12 campos', Object.values(ARMADURAS_GLB).length === 42 + 135 && Object.values(ARMADURAS_GLB).every((D) => campos.every((k) => D[k] !== undefined && D[k] !== '')), Object.keys(ARMADURAS_GLB).length);
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
    this.ok('cabelo com física: os dez cortes do Blender no catálogo e nas opções da criação (curto, médio, longo, espetado, ondulado, coque, rabo, tranças, franja, repicado)',
      cabF.length === 10 && cabF.every((c) => c.convertido && c.arq.startsWith('assets/Criar_Personagem/Cabelo_Fisica/') && PERS_CABELOS_GLB.includes(c.id)) && PERS_CABELOS_GLB.length === PERS_GLB.cabeloG.length, cabF.map((c) => c.id).join(','));
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
      const C = Object.values(Criacao3D.CEL);
      return C.every(([x, y, l]) => x + l <= 2048 && y + l <= 2048) && C.every((a, i) => C.every((b, j) => i === j || a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0] || a[1] + a[2] <= b[1] || b[1] + b[2] <= a[1]));
    })());
    // ------------------------------------------------ raridades
    this.igual('raridades: exatamente quatro (Comum, Incomum, Raro, Lendário)', ARS_RARIDADES.map((r) => `${r.name}/${r.cor}`).join(','), 'Comum/branco,Incomum/verde,Raro/azul,Lendário/dourado');
    const lend1 = Arsenal.gerarCat('ini_botas', 3), comum30 = Arsenal.gerarCat('n30_mago_botas', 0);
    this.ok('raridade independe do nível (nível 1 Lendária, nível 30 Comum)', lend1.r === 3 && lend1.lv === 1 && comum30.r === 0 && comum30.lv === 30);
    this.ok('raridade: um atributo sorteado por grau acima de Comum', [0, 1, 2, 3].every((r) => Object.keys(Arsenal.gerarCat('n30_guerreiro_peitoral', r).bonus).length === r));
    this.ok('raridade: nada além do grau 3 (pedido maior vira Lendário)', Arsenal.gerarCat('ini_capa', 9).r === 3 && Arsenal.gerar('botas', 'couro', 5, 10).r === 3);
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
      MODELS3D[def.model].pose(M, v, g.opts3(v, 0));
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
      this.ok('migração: raridades antigas viram as quatro', S2.itens.find((q) => q.id === 9001).r === 2 && S2.itens.find((q) => q.id === 9002).r === 3 && S2.itens.every((q) => q.r >= 0 && q.r <= 3));
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
