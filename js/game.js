'use strict';
// ECLIPSE ZERO · Jogo: loop principal, estados, eventos, progressão, salvamento e renderização
// ---------------------------------------------------------------------------
// JOGO: loop principal, estados, eventos de combate e pipeline de renderização
// ---------------------------------------------------------------------------
class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.input = new Input(this.canvas);
    this.audio = new AudioSys();
    // Primeiro gesto do jogador: destrava o áudio e, se escolhido, entra em tela cheia
    this.input.onFirstInput = () => {
      this.audio.unlock();
      if (!this.fsTried) { this.fsTried = true; if (Settings.v.display === 'full') Settings.applyDisplay(); }
    };
    this.input.onPadChange = (ev, info) => this.onPadChange(ev, info);
    // Elenco de personagens: avisos de desbloqueio (o popup animado entra numa fase seguinte)
    RosterManager.validate();
    RosterManager.on('characterUnlocked', (d) => this.onCharacterUnlocked(d));
    RosterManager.on('armorUnlocked', (a) => this.onArmorUnlocked(a));
    RosterManager.on('weaponUnlocked', (w) => this.onWeaponUnlocked(w));
    RosterManager.on('armorChanged', () => { if (this.player) { this.player.recalc(); this.hud.ghostHp = this.player.hp; } });
    RosterManager.on('weaponChanged', () => { if (this.player) { this.player.recalc(); } });
    RosterManager.on('characterChanged', () => this.onCharacterChanged());
    // Gráficos 3D (WebGL) para personagens, inimigos e armas; G liga/desliga
    R3D.init();
    KaelArt.init(); loadKaelPortraits();   // Kael com a arte oficial (js/kaelart.js)
    for (const d of CHARACTER_DEFS) heroPortrait(d.id);   // retratos do elenco (carregam em segundo plano)
    this.use3D = false; this.ghostProxies = [];
    this.camera = new Camera();
    this.camera.baseZoom = 1.22;
    this.particles = new ParticleSystem();
    this.texts = new FloatingTexts();
    this.trails = new SlashTrails();
    this.arcs = new ArcSystem();
    this.lighting = new Lighting();
    this.projectiles = new ProjectileSystem();
    this.traps = new TrapSystem();
    this.pickups = new PickupSystem();
    this.hazards = new HazardSystem();
    this.director = new AIDirector();
    this.waves = new WaveManager();
    this.hud = new HUD();
    this.screens = new Screens();
    this.menu = new Menus();
    this.story = new StoryScreen();
    this.upgrades = new UpgradeSystem();
    TouchControls.init(this.canvas, this.input);   // controles de toque (js/touch.js)
    LoyaltyQuests.init();   // missões de lealdade dos aliados (js/quests.js)
    this.thirdPerson = (typeof ThirdPersonMode !== 'undefined') ? new ThirdPersonMode(this) : null;
    this.world = null;   // modo mundo aberto (World, js/world.js) quando ativo
    this.progress = new Progress();
    this.flags = {};
    this.checkpoint = 0;
    this.slot = 0;                 // espaço de salvamento em uso (1..SAVE_SLOTS)
    this.thumb = null; this.thumbT = 0; this.thumbBroken = false;
    this.lookOff = { x: 0, y: 0 };
    // char: personagem mostrado na árvore (memo: árvore e nó escolhidos de cada um)
    this.skillUI = { tree: 0, sel: 'corte_eletrico', char: DEFAULT_CHARACTER, memo: {}, from: 'playing', msg: '', msgT: 0, msgRgb: '', fx: null };
    this.counter = new ComboCounter();
    this.enemies = [];
    this.npcs = []; this.talkTarget = null;
    this.player = null; this.room = null; this.boss = null;
    this.state = 'menu';
    this.audio.playMusic('menu');
    this.time = 0; this.realTime = 0;
    this.hitStop = 0; this.timeScale = 1; this.slowTimer = 0;
    this.screenFlash = { rgb: '255,255,255', a: 0 };
    this.hurtVignette = 0;
    this.fade = 0; this.fadeTarget = 0; this.fadeCb = null;
    this.debug = false;
    this.glows = []; this.glowCount = 0;
    this.drawList = [];
    this.tmpV = { x: 0, y: 0 };
    this.nullInput = { move: { x: 0, y: 0 }, held: {}, pressed: {}, released: {} };
    this.upgradeChoices = []; this.upgradeSel = 0; this.upgradeLock = 0;
    this.rerollCost = 12; this.healCost = 20;
    this.victoryTimer = 0; this.endLock = 0;
    this.lastDodge = 0;
    this.rank = 'C'; this.newRecord = false;
    this.glitchT = 0; this.eclipse = null; this.skyFlash = 0; this.skyBoltX = 0;
    this.ending = null; this.lostMemory = false;
    this.best = 0;
    try { this.best = parseInt(localStorage.getItem('eclipse_zero_best') || '0', 10) || 0; } catch (e) { this.best = 0; }
    this.stats = this.freshStats();
    this.fps = 60; this.fpsAcc = 0; this.fpsFrames = 0;
    this.errors = new Set();
    this.renderScale = Settings.v.renderScale / 100;
    this.nextT = 0;
    this.resize();
    Settings.apply(this, true);
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('fullscreenchange', () => Settings.onFullscreenChange());
    // Ao fechar ou trocar de aba no celular, guarda o progresso (tempo de jogo, miniatura)
    window.addEventListener('pagehide', () => this.saveGame());
    // De volta ao jogo (outra aba, outro app, tela desbloqueada): tenta retomar o áudio; se o
    // navegador exigir um gesto, o próximo toque ou tecla retoma (Input.onFirstInput)
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.audio.ctx) this.audio.unlock(); });
    this.last = performance.now();
    this.loopBound = (t) => this.loop(t);
    requestAnimationFrame(this.loopBound);
  }

  freshStats() {
    return { score: 0, kills: 0, time: 0, soulsBank: 0, soulsTotal: 0, dmgDealt: 0, dmgTaken: 0, roomsCleared: 0, memories: 0, memLost: 0 };
  }

  // Ajusta a resolução interna à janela (nítido em telas de alta densidade)
  resize() {
    // Resolução interna: densidade da tela × escala escolhida nas configurações
    const dpr = Math.min(window.devicePixelRatio || 1, (this.renderScale || 1) > 1 ? 3 : 2) * (this.renderScale || 1);
    const cw = Math.max(320, window.innerWidth), ch = Math.max(240, window.innerHeight);
    // Numa tela baixa (celular deitado), menos altura lógica: com 720 unidades em 390 px de altura
    // ficava tudo com pouco mais da metade do tamanho. Em jogo o mundo, o HUD e os botões crescem
    // juntos (até 480 de altura); os menus e as telas, um pouco menos (até 560, o que os layouts
    // deles comportam)
    this.viewMode = this.modoTela();
    this.compactView = this.viewMode === 'jogo';
    VIEW_H = this.viewMode === 'jogo' ? Math.round(clamp(ch * 1.25, 480, 720)) : this.viewMode === 'menu' ? Math.round(clamp(ch * 1.45, 560, 720)) : 720;
    VIEW_W = Math.round(clamp((VIEW_H * cw) / ch, 960, 1760));
    this.canvas.width = Math.floor(cw * dpr);
    this.canvas.height = Math.floor(ch * dpr);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    this.scale = Math.min(this.canvas.width / VIEW_W, this.canvas.height / VIEW_H);
    this.offX = (this.canvas.width - VIEW_W * this.scale) / 2;
    this.offY = (this.canvas.height - VIEW_H * this.scale) / 2;
    this.lighting.resize();
    this.buildVignettes();
    if (this.room) this.room.render(this.roomScale());
  }
  roomScale() { return clamp(this.scale * this.camera.baseZoom, 1, 2); }

  buildVignettes() {
    const mk = (inner, outer) => {
      const c = document.createElement('canvas');
      c.width = Math.max(2, Math.ceil(VIEW_W / 2)); c.height = Math.ceil(VIEW_H / 2);
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.35, c.width / 2, c.height / 2, c.width * 0.62);
      gr.addColorStop(0, inner); gr.addColorStop(1, outer);
      g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
      return c;
    };
    this.vignette = mk('rgba(0,0,0,0)', 'rgba(0,0,0,0.75)');
    this.redVignette = mk('rgba(120,0,20,0)', 'rgba(200,0,40,0.85)');
  }

  // Converte coordenadas do mouse em coordenadas lógicas
  toLogical(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    const kx = this.canvas.width / (r.width || 1), ky = this.canvas.height / (r.height || 1);
    return { x: ((cx - r.left) * kx - this.offX) / this.scale, y: ((cy - r.top) * ky - this.offY) / this.scale };
  }

  onBlur() { if (this.state === 'playing') this.pauseGame(); }

  // Controle conectado/desconectado: aviso discreto; sem controle no meio da ação, o jogo pausa
  onPadChange(ev, info) {
    if (ev === 'connected') this.menu.notify(`Controle conectado · ${info.labels.name}`, '110,190,255', 'pad');
    else {
      this.menu.notify('Controle desconectado', '255,120,140', 'pad');
      if (this.state === 'playing') this.pauseGame();
    }
  }

  // Altura lógica da tela (ver resize): 'normal' (720), 'jogo' ou 'menu' (telas baixas)
  modoTela() {
    if (window.innerHeight >= 600) return 'normal';
    return this.state === 'playing' ? 'jogo' : 'menu';
  }

  loop(now) {
    // entrou ou saiu do jogo numa tela baixa: refaz a escala (ver resize)
    if (this.modoTela() !== this.viewMode) this.resize();
    // Limite de FPS (configurações): pula quadros até chegar a hora do próximo
    const lim = Settings.v.fpsLimit;
    if (lim) {
      const iv = 1000 / lim;
      if (now < this.nextT - iv * 0.25) { requestAnimationFrame(this.loopBound); return; }
      this.nextT = now - this.nextT > iv ? now + iv : this.nextT + iv;
    }
    const raw = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.fpsAcc += raw; this.fpsFrames++;
    if (this.fpsAcc >= 0.5) { this.fps = Math.round(this.fpsFrames / this.fpsAcc); this.fpsAcc = 0; this.fpsFrames = 0; }
    const dt = Math.min(raw, MAX_DT);
    try {
      this.update(dt);
      this.render(dt);
    } catch (e) {
      // Um erro inesperado nunca deve congelar o jogo; registra uma única vez
      const key = String(e && e.message);
      if (!this.errors.has(key)) { this.errors.add(key); console.error(e); }
    }
    requestAnimationFrame(this.loopBound);
  }

  // ------------------------------------------------------------ atualização
  update(dt) {
    const inp = this.input;
    inp.update();
    this.realTime += dt;
    this.menu.tick(dt);
    if (this.audio && this.audio.update) this.audio.update(dt);
    // Console de desenvolvimento aberto (só em modo dev): o jogo espera
    if (DevTools.update(dt, inp)) { inp.endFrame(); return; }
    // Atalhos M (som) e G (3D/2D) também atualizam as configurações salvas
    if (inp.pressed.mute && !(this.world && this.state === 'playing')) { Settings.v.sound = this.audio.toggleMute(); Settings.save(); }   // no mundo, M é o mapa
    if (inp.pressed.gfx && R3D.ok) {
      R3D.enabled = !R3D.enabled;
      Settings.v.gfx3d = R3D.enabled; Settings.save();
      if (this.state === 'playing') this.hud.message(R3D.enabled ? 'GRÁFICOS 3D' : 'GRÁFICOS 2D', '', 1.2, true);
    }
    if (inp.pressed.debug) this.debug = !this.debug;
    // fadeTo com a tela já escura também chama o retorno (ex.: sem evoluções para escolher
    // num novo ciclo, a troca de setor pedia outro escurecimento e a tela ficava preta)
    if (this.fade !== this.fadeTarget || this.fadeCb) {
      this.fade = approach(this.fade, this.fadeTarget, dt * 3.2);
      if (this.fade === this.fadeTarget && this.fadeCb) { const cb = this.fadeCb; this.fadeCb = null; cb(); }
    }
    if (this.screenFlash.a > 0) this.screenFlash.a = Math.max(0, this.screenFlash.a - dt * 2.4);
    if (this.hurtVignette > 0) this.hurtVignette = Math.max(0, this.hurtVignette - dt * 1.6);
    if (this.glitchT > 0) this.glitchT = Math.max(0, this.glitchT - dt);

    switch (this.state) {
      case 'menu': this.menu.update(dt, inp); break;
      case 'skills': this.updateSkills(dt); break;
      case 'story': if (!this.fadeCb) this.story.update(dt, inp); break;
      case 'playing': this.updatePlaying(dt); break;
      case 'paused': this.menu.update(dt, inp); break;
      case 'thirdperson': if (this.thirdPerson) this.thirdPerson.update(dt, inp); break;
      case 'worldmap': World.updateMap(dt, inp); break;   // mapa do mundo aberto (js/world.js)
      case 'worldinv': WorldInv.updateUI(dt, inp); break;   // mochila, loja e missões (js/mundo/inventario.js)
      case 'worlddlg': Dialogo.update(dt, inp); break;       // conversa com os moradores (js/mundo/dialogo.js)
      case 'upgrade': this.updateUpgrade(dt); break;
      case 'gameover':
      case 'victory': this.updateEnd(dt); break;
    }
    this.camera.update(dt);
    inp.endFrame();
  }

  // Mundo aberto (protótipo): Ruínas de Carmesin, com o personagem escolhido (js/world.js)
  startWorld() { World.start(); }

  startThirdPerson() {
    this.audio.unlock();
    if (!this.thirdPerson && typeof ThirdPersonMode !== 'undefined') {
      this.thirdPerson = new ThirdPersonMode(this);
    }
    this.audio.playMusic('combat');
    this.state = 'thirdperson';
    if (this.thirdPerson) this.thirdPerson.resetArena();
  }

  fadeTo(cb) { this.fadeTarget = 1; this.fadeCb = cb; }

  // Exibe páginas da história; 'done' é chamado ao terminar (ou pular)
  playStory(pages, done) {
    this.audio.unlock();
    this.audio.startAmbient();
    this.state = 'story';
    if (pages && pages.length) {
      if (pages[0].bg === 'quote' && pages[1] && pages[1].kicker === 'PRÓLOGO') {
        this.audio.playMusic('prologue');
      } else if (pages[0].kicker === 'O NÚCLEO' || pages[0].choices) {
        this.audio.playMusic('ending_1');
      }
    }
    this.story.start(pages, done);
    this.fadeTarget = 0;
  }

  // Começa (ou retoma, com 'save') a jornada de Kael
  startRun(save = null) {
    if (this.world) this.world.stop();   // a campanha não usa o mundo aberto
    this.audio.unlock();
    this.audio.startAmbient();
    this.stats = this.freshStats();
    this.upgrades.reset();
    this.progress.reset();
    this.flags = {};
    if (save) this.applySave(save);
    // Jogo novo ou save v1: só Kael (no jogo novo, com o que foi escolhido na seleção)
    RosterManager.load(save ? save.roster : this.newRoster || null);
    this.newRoster = null;
    this.checkRosterUnlocks();
    PartyProgress.load(save ? save.party : null);     // progresso dos outros personagens (vazio nos saves antigos)
    PartyProgress.join(RosterManager.active, this.progress.level);   // aliado em campo sem progresso: entra perto do nível do Kael
    AllyRadio.reset();
    this.thumb = (save && save.thumb) || null; this.thumbT = this.realTime - 3;
    this.lookOff.x = this.lookOff.y = 0;
    this.checkpoint = save ? clamp(save.room | 0, 0, ROOM_DEFS.length - 1) : 0;
    syncRecruits(this);   // aliados já encontrados nesta jornada (js/story.js)
    this.counter = new ComboCounter();
    this.player = new Player(0, 0);
    this.player.recalc(true);
    this.hud.reset();
    this.rerollCost = 12;
    this.victoryTimer = 0;
    this.newRecord = false;
    this.ending = null; this.lostMemory = false; this.glitchT = 0;
    this.timeScale = 1; this.slowTimer = 0; this.hitStop = 0;
    this.loadRoom(this.checkpoint);
    this.state = 'playing';
    this.fade = 1; this.fadeTarget = 0;
    this.saveGame();
  }

  loadRoom(i) {
    if (i === 0) this.audio.playMusic('facility');
    else if (i >= 1 && i <= 3) this.audio.playMusic('vesper');
    else if (i === 4) this.audio.playMusic('nexus_encounter');
    else if (i === 5) this.audio.playMusic('boss');
    this.enemies.length = 0;
    this.projectiles.clear(); this.pickups.clear(); this.particles.clear();
    this.hazards.clear(); this.trails.clear(); this.texts.clear(); this.arcs.clear();
    HeroObjects.clear();   // flechas, minas e iscas dos kits (js/heroes/kit.js)
    this.boss = null; this.eclipse = null; this.skyFlash = 0;
    this.counter.reset(true);
    this.room = new Room(i);
    this.room.render(this.roomScale());
    this.director.reset(i);
    // NPCs do setor (posicionados em pontos livres, longe dos pilares)
    this.npcs.length = 0; this.talkTarget = null;
    for (const d of this.room.def.npcs || []) {
      const pt = npcSpot(this.room, d.at[0], d.at[1]);
      this.npcs.push(new NPC(d, pt.x, pt.y));
    }
    const p = this.player;
    p.x = this.room.w / 2; p.y = this.room.h - 70; p.z = 0;
    p.vx = p.vy = p.kbx = p.kby = 0;
    p.facing = -Math.PI * 0.75;
    p.state = 'idle'; p.stateTime = 0; p.attack = null;
    p.combo.reset();
    this.camera.snap(isoX(p.x, p.y), isoY(p.x, p.y) - 30);
    this.waves.startRoom(i);
  }

  updatePlaying(dt) {
    const inp = this.input, p = this.player;
    if (inp.pressed.pause && !this.fadeCb) { this.pauseGame(); return; }
    if (inp.pressed.skills && !this.fadeCb && p.state !== 'dead') { this.openSkills('playing'); return; }
    if (this.world) {
      if (inp.pressed.worldMap && !this.fadeCb) { this.world.openMap(false); return; }
      if (inp.pressed.bag && !this.fadeCb && p.state !== 'dead') { WorldInv.abrir('mochila', false); return; }   // relíquias, missões
      if (inp.pressed.journal && !this.fadeCb && p.state !== 'dead') { WorldInv.abrir('diario', false); return; }   // diário de missões
      if (inp.pressed.capsule && p.state !== 'dead') WorldInv.usarCapsula();
      this.world.update(dt);
    }
    if (this.debug) {
      if (inp.pressed.debugXp) this.gainXP(400, p.x, p.y);
      if (inp.pressed.debugKill) {
        if (this.waves.state === 'intro') this.waves.timer = 0;
        for (const e of this.enemies) if (e.canBeHit()) e.takeHit({ dmg: 99999, kx: 0, ky: 0, kb: 0, launch: 0, stun: 0, heavy: true, crit: false });
      }
      if (inp.pressed.debugFury) { p.fury = p.maxEnergy; p.hp = p.maxHp; }
    }
    if (this.eclipse) this.eclipse.t += dt;
    if (this.skyFlash > 0) this.skyFlash = Math.max(0, this.skyFlash - dt * 2.5);
    // Relâmpagos no céu artificial dos setores externos
    const sky = this.room.theme.sky;
    if (sky !== 'indoor' && Math.random() < dt * (sky === 'tower' ? 0.22 + (this.boss ? this.boss.phase * 0.08 : 0) : 0.05)) {
      this.skyFlash = 1; this.skyBoltX = rand(0.15, 0.85); this.skySeed = (Math.random() * 1e6) | 0;
      this.audio.play('thunder', 0.3);
    }
    // Conversa com o NPC mais próximo ([E]; no gamepad o X conversa em vez de atacar)
    this.talkTarget = null;
    if (p.state !== 'dead') {
      let bd = 80;
      for (const n of this.npcs) { const d = dist(p.x, p.y, n.x, n.y); if (d < bd && n.canTalk()) { bd = d; this.talkTarget = n; } }
    }
    if (this.talkTarget && inp.pressed.interact && !this.fadeCb) { this.talkTarget.talk(); inp.pressed.light = false; }
    if (!this.fadeCb) p.captureInput(inp);
    this.hud.update(dt);
    AllyRadio.update(dt);
    // Hit stop: congela a simulação por alguns milissegundos a cada impacto
    if (this.hitStop > 0) { this.hitStop -= dt; return; }
    if (this.slowTimer > 0) { this.slowTimer -= dt; if (this.slowTimer <= 0) this.timeScale = 1; }
    const sdt = dt * this.timeScale;
    this.time += sdt;
    if (p.state !== 'dead' && this.waves.state !== 'exiting' && this.victoryTimer <= 0) this.stats.time += dt;

    // O kit pode deixar o herói no tempo real durante a câmera lenta (Kael: sempre sdt)
    const pdt = p.kit ? p.kit.timeStep(p, dt, sdt) : sdt;
    p.update(pdt, this.fadeCb ? this.nullInput : inp);
    for (const e of this.enemies) e.update(sdt);
    for (const n of this.npcs) n.update(sdt);
    this.separate();
    this.director.update();
    this.projectiles.update(sdt);
    if (this.traps) this.traps.update(sdt);
    HeroObjects.update(pdt);
    this.hazards.update(sdt);
    this.pickups.update(sdt);
    this.particles.update(sdt);
    this.texts.update(sdt);
    this.trails.update(sdt);
    this.arcs.update(sdt);
    this.counter.update(sdt);
    this.room.update(sdt);
    this.waves.update(sdt);
    // Remove inimigos que terminaram a animação de morte
    let w = 0;
    for (let i = 0; i < this.enemies.length; i++) { const e = this.enemies[i]; if (e.alive) this.enemies[w++] = e; }
    this.enemies.length = w;

    // Câmera com leve antecipação do movimento; o analógico direito olha ao redor
    const lx = p.x + p.vx * 0.18, ly = p.y + p.vy * 0.18;
    const lk = inp.look, lf = 1 - Math.exp(-6 * dt);
    this.lookOff.x += (lk.x * 150 - this.lookOff.x) * lf;
    this.lookOff.y += (lk.y * 110 - this.lookOff.y) * lf;
    this.camera.follow(isoX(lx, ly) + this.lookOff.x, isoY(lx, ly) - 30 + this.lookOff.y, dt);
    if (inp.pressed.camToggle) ThirdView.toggle();   // V: câmera isométrica / 3ª pessoa (js/terceira.js)
    ThirdView.update(dt, inp);

    if (p.state === 'dead' && p.stateTime > 2.2 && !this.fadeCb) this.fadeTo(() => this.endRun(false));
    if (this.victoryTimer > 0) {
      this.victoryTimer -= dt;
      // A escolha final e o desfecho antes da tela de resultados
      if (this.victoryTimer <= 0 && !this.fadeCb) this.fadeTo(() => this.playStory(STORY.finale(), () => this.fadeTo(() => this.endRun(true))));
    }
  }

  // Há combate no setor? (NPCs se protegem e não conversam)
  combatActive() {
    if (this.world) return this.world.inCombat();   // mundo aberto: há inimigo acordado
    const s = this.waves.state;
    return s === 'intro' || s === 'spawning' || s === 'fighting' || s === 'between' || s === 'boss';
  }

  // Separação entre corpos (inimigos entre si e com o jogador)
  separate() {
    const list = this.enemies, p = this.player;
    const pSolid = p.state !== 'dash' && p.state !== 'special' && p.state !== 'dead' &&
      !(p.state === 'attack' && p.attack && p.attack.def.thrust);
    // NPCs são sólidos para Kael (a esquiva atravessa)
    if (pSolid) {
      for (const n of this.npcs) {
        if (n.flat) continue;   // passagens e portais do mundo aberto
        const dx = p.x - n.x, dy = p.y - n.y, min = n.radius + p.radius, d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.0001) { const d = Math.sqrt(d2); p.x = n.x + (dx / d) * min; p.y = n.y + (dy / d) * min; }
      }
    }
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.state === 'dying' || a.state === 'spawn') continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.state === 'dying' || b.state === 'spawn') continue;
        const dx = b.x - a.x, dy = b.y - a.y, min = a.radius + b.radius, d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.0001) {
          const d = Math.sqrt(d2), push = min - d, nx = dx / d, ny = dy / d;
          const ka = b.mass / (a.mass + b.mass), kb = 1 - ka;
          a.x -= nx * push * ka; a.y -= ny * push * ka;
          b.x += nx * push * kb; b.y += ny * push * kb;
        }
      }
      if (pSolid && a.z < 30 && !a.jumpZ) {
        const dx = p.x - a.x, dy = p.y - a.y, min = a.radius + p.radius, d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.0001) {
          const d = Math.sqrt(d2), push = min - d, nx = dx / d, ny = dy / d;
          const k = a.mass / (a.mass + 1.2);
          p.x += nx * push * k; p.y += ny * push * k;
          a.x -= nx * push * (1 - k); a.y -= ny * push * (1 - k);
        }
      }
    }
  }

  // ---------------------------------------------------- eventos de combate
  addHitStop(t) { this.hitStop = Math.max(this.hitStop, Math.min(t, 0.2)); }
  slowMo(scale, dur) { this.timeScale = Math.min(this.timeScale, scale); this.slowTimer = Math.max(this.slowTimer, dur); }
  flashScreen(rgb, a) { this.screenFlash.rgb = rgb; this.screenFlash.a = Math.max(this.screenFlash.a, a); }

  // Todo acerto do jogador passa por aqui: hit stop, tremor, faíscas, números, combo
  onEnemyHit(e, dmg, crit, def, kx, ky) {
    const p = this.player;
    this.stats.dmgDealt += dmg;
    this.counter.addHit();
    this.stats.score += Math.round(dmg * 10 * this.counter.mult);
    if (!def.ability) p.addFury((def.fury || 3) + dmg * 0.06);
    p.applyLifesteal(dmg);
    this.addHitStop((def.hitstop || 0.04) * (crit ? 1.35 : 1) * (e.isBoss ? 0.8 : 1));
    this.camera.shake((def.shake || 0.1) * (crit ? 1.4 : 1));
    if (def.zoom) this.camera.zoomPunch(def.zoom);
    const dir = Math.atan2(ky, kx);
    const hz = Math.min(e.height * 0.55, 46) + e.z;
    const hx = e.x - kx * e.radius * 0.6, hy = e.y - ky * e.radius * 0.6;
    this.particles.sparks(hx, hy, hz, dir, crit ? 16 : def.heavy ? 12 : 8, crit ? '235,248,255' : def.spark || '150,205,255', def.heavy ? 560 : 420);
    if (e.T.mech) this.particles.sparks(hx, hy, hz, dir, 4, '255,190,120', 380);   // faíscas de metal
    this.particles.flash(hx, hy, hz, crit ? 48 : def.heavy ? 38 : 26, crit ? '240,250,255' : '190,220,255', 0.1);
    this.particles.blood(e.x, e.y, hz, dir, def.heavy ? 8 : 5, e.T.blood);
    if (def.heavy) this.particles.ring(e.x, e.y, 42, def.spark || '120,190,255', 0.22, 4);
    if (Settings.v.damageNumbers) {
      this.texts.spawn(e.x, e.y, (e.height || 40) + e.z + (e.jumpZ || 0), crit ? `${dmg}!` : dmg,
        crit ? PAL.accentHi : def.heavy ? '#8fd0ff' : '#ffffff', crit ? 31 : def.heavy ? 25 : 21);
    }
    if (def.heavy || crit) this.input.rumble(0.25, 0.35, 70);
    this.audio.play(def.heavy ? 'hitHeavy' : 'hit');
    if (crit) this.audio.play('crit');
  }

  onEnemyKilled(e) {
    const p = this.player;
    this.stats.kills++;
    this.stats.score += Math.round(e.T.score * this.counter.mult);
    // Células de energia (moeda) e cápsulas de reparo
    const total = Math.max(1, Math.round(randInt(e.T.souls[0], e.T.souls[1]) * p.stats.soulMult * (e.elite ? 2 : 1)));
    const n = Math.min(total, e.isBoss ? 16 : 6);
    for (let i = 0; i < n; i++) this.pickups.drop('soul', e.x, e.y, Math.floor(total / n) + (i < total % n ? 1 : 0));
    if (!e.isBoss && (e.elite || Math.random() < e.T.orb + p.stats.orbChance)) this.pickups.drop('health', e.x, e.y, 12);
    this.gainXP(this.xpFor(e), e.x, e.y);
    if (p.kit) p.kit.onKill(p, e);
    LoyaltyQuests.onKill(e);   // missões de lealdade (js/quests.js)
    HeroPassives.kill(p, e);   // passivas das árvores (js/heroes/passivas.js)
    if (this.world) this.world.onKill(e);   // chefe regional do mundo aberto
    if (e.elite) this.hud.toast('Unidade de elite destruída', '255,200,90');
    // Efeitos de morte: máquinas explodem em faíscas e peças; humanos sangram
    if (e.T.mech) {
      this.particles.sparks(e.x, e.y, 20, rand(0, TAU), 12, '255,200,140', 420, Math.PI);
      this.particles.debris(e.x, e.y, e.radius > 20 ? 14 : 7, '58,64,76');
      this.particles.blood(e.x, e.y, 18, rand(0, TAU), 8, e.T.blood);
      this.arcs.crackle(e.x, e.y, Math.min(e.height * 0.5, 60), 3, e.radius * 2.2, '140,200,255', 0.18);
    } else this.particles.blood(e.x, e.y, 22, rand(0, TAU), 14, e.T.blood);
    this.particles.smoke(e.x, e.y, 10, 6, '14,18,26', e.radius);
    this.particles.embers(e.x, e.y, 10, 10, e.T.glow, e.radius, 90);
    this.particles.flash(e.x, e.y, 20, e.radius * 3, '170,210,255', 0.15);
    this.room.addDecal(e.x, e.y, e.radius * 1.2, e.T.blood);
    this.audio.play('enemyDeath', e.radius > 20 ? 0.6 : 1);
    this.camera.shake(e.radius > 20 ? 0.3 : 0.08);
    // Último inimigo da sala: câmera lenta dramática
    const wv = this.waves;
    if (!e.isBoss && wv.state === 'fighting' && wv.aliveCount() === 0 && wv.waveIndex === wv.def.waves.length - 1) {
      this.slowMo(0.25, 0.7);
      this.camera.zoomPunch(0.05);
    }
  }

  collectSoul(v, x, y) {
    this.stats.soulsBank += v;
    this.stats.soulsTotal += v;
    this.stats.score += v * 5;
    this.audio.play('soul');
    this.particles.flash(x, y, 20, 18, '120,190,255', 0.12);
  }

  // Um fragmento de memória surge em algum ponto do setor liberado
  spawnMemory() {
    if (this.stats.memories + this.stats.memLost >= MEMORIES.length) return;
    const done = this.flags.memRooms || (this.flags.memRooms = []);
    if (done.includes(this.waves.roomIndex)) return;   // a lembrança deste setor já foi encontrada (ou perdida)
    const pt = this.room.randomPoint(90, this.player, 220);
    this.pickups.place('memory', pt.x, pt.y);
    this.hud.say('KAEL', 'A espada está vibrando… Há uma lembrança presa neste lugar.', 3.8, 2.8);
  }

  collectMemory(x, y) {
    const idx = this.stats.memories++;
    (this.flags.memRooms || (this.flags.memRooms = [])).push(this.waves.roomIndex);
    this.gainXP(XP_SRC.memory, x, y);
    this.hud.memory(MEMORIES[Math.min(idx, MEMORIES.length - 1)], idx + 1);
    AllyRadio.event('memory', Math.min(idx, MEMORIES.length - 1), 5);   // depois que a lembrança some da tela
    this.audio.play('memory');
    this.flashScreen('200,225,255', 0.5);
    this.glitch(0.3);
    this.slowMo(0.4, 0.6);
    this.particles.ring(x, y, 120, '170,215,255', 0.6, 8);
    this.particles.flash(x, y, 30, 120, '200,230,255', 0.3);
    this.arcs.crackle(x, y, 30, 5, 70, '170,215,255', 0.25);
    this.player.addFury(25);
    this.player.heal(10);
    this.stats.score += 500;
  }

  glitch(t) { this.glitchT = Math.max(this.glitchT, t); }
  startEclipseFx(x, y) { this.eclipse = { x, y, t: 0 }; }

  onPlayerHurt(dmg, dx, dy) {
    const p = this.player;
    this.stats.dmgTaken += dmg;
    this.counter.reset();
    this.texts.spawn(p.x, p.y, 52, `-${dmg}`, '#ff3b4f', 25);
    this.camera.shake(0.35);
    this.addHitStop(0.07);
    this.hurtVignette = 0.55;
    this.particles.blood(p.x, p.y, 26, Math.atan2(dy, dx), 8, '150,10,30');
    this.particles.sparks(p.x, p.y, 26, Math.atan2(dy, dx), 6, '255,90,110', 300);
    this.audio.play('playerHurt');
    this.input.rumble(0.7, 0.5, 170);
    this.flashScreen('255,20,50', 0.22);
    this.glitch(0.1);
  }

  onPlayerDeath() {
    this.input.rumble(1, 0.8, 420);
    this.slowMo(0.3, 1.4);
    this.camera.shake(0.6);
    this.camera.zoomPunch(0.08);
    this.audio.play('defeat');
    this.glitch(0.6);
    this.hud.message('SINAL PERDIDO', 'UNIDADE ZERO', 2.2);
  }

  onPerfectDodge(p) {
    if (this.realTime - this.lastDodge < 0.35) return;
    this.lastDodge = this.realTime;
    this.texts.spawn(p.x, p.y, 64, 'ESQUIVA PERFEITA!', '#9fd6ff', 17, 1.0);
    p.addFury(10);
    if (p.stats.counter > 0) p.counterT = 1.5;
    this.slowMo(0.35, 0.22 * (1 + p.stats.perfectBonus));
    this.particles.ring(p.x, p.y, 60, '150,210,255', 0.35, 5);
    this.arcs.crackle(p.x, p.y, 26, 3, 36, '150,210,255', 0.15);
    this.audio.play('chargeTier', 1);
  }

  onDeflect(proj) {
    const p = this.player;
    p.addFury(3);
    this.stats.score += 25;
    this.texts.spawn(proj.x, proj.y, proj.z + 10, 'APARADO', '#9fe8ff', 15, 0.6);
    this.particles.sparks(proj.x, proj.y, proj.z, proj.angle + Math.PI, 10, '190,230,255', 380, 1.2);
    this.audio.play('deflect');
    this.addHitStop(0.03);
  }

  onBossDying(b) {
    this.input.rumble(1, 1, 650);
    this.slowMo(0.25, 2.2);
    this.flashScreen('220,250,255', 0.85);
    this.glitch(0.8);
    this.camera.shake(1);
    this.camera.zoomPunch(0.1);
    this.audio.play('bossRoar');
    this.audio.play('explosion');
    this.hud.message('NEXUS SE DESFAZ', '', 2.6, false, true);
    this.hud.say('NEXUS', 'Se eu cair… quem vai proteger vocês de vocês mesmos?', 3.6, 0.4);
    for (const e of this.enemies) if (e !== b && e.canBeHit()) e.die({ kx: 0, ky: 0 });
  }

  onBossDefeated(b) {
    const bosses = this.flags.bosses || (this.flags.bosses = []);
    if (!bosses.includes('nexus')) bosses.push('nexus');
    this.checkRosterUnlocks();
    this.particles.flash(b.x, b.y, 60, 260, '170,240,255', 0.5);
    this.particles.ring(b.x, b.y, 380, '90,220,255', 1.0, 18);
    for (let i = 0; i < 6; i++) this.particles.sparks(b.x, b.y, 60, (i / 6) * TAU, 14, '200,250,255', 700, 0.8);
    this.particles.embers(b.x, b.y, 20, 50, '120,240,255', 80, 200);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU, r = rand(160, 320);
      this.arcs.spawn(b.x, b.y, 80, b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 0, { w: 3, life: 0.4, rgb: '150,240,255' });
    }
    this.audio.play('thunder');
    this.camera.shake(0.8);
    this.audio.play('explosion');
    this.pickups.attractAll();
    this.stats.roomsCleared++;
    this.victoryTimer = 2.4;
  }

  exitRoom() {
    this.audio.play('uiSelect');
    // Fragmento de memória deixado para trás se perde para sempre
    this.lostMemory = !!this.pickups.find('memory');
    if (this.lostMemory) { this.stats.memLost++; (this.flags.memRooms || (this.flags.memRooms = [])).push(this.waves.roomIndex); }
    this.fadeTo(() => this.openUpgrade());
  }

  // ------------------------------------------------------- tela de melhorias
  openUpgrade() {
    this.upgradeChoices = this.upgrades.roll(3);
    this.upgradeSel = Math.min(1, this.upgradeChoices.length - 1);
    this.healCost = 20 + this.waves.roomIndex * 5;
    this.upgradeLock = 0.35;
    this.fadeTarget = 0;
    if (!this.upgradeChoices.length) { this.goToNextRoom(); return; }
    this.state = 'upgrade';
  }

  // Entre os setores, o próximo capítulo da história (quando houver)
  goToNextRoom() {
    const next = this.waves.roomIndex + 1;
    this.checkpoint = next;
    // Setor concluído = capítulo concluído: libera aliados e armaduras da história
    this.flags.chapters = Math.max(this.flags.chapters | 0, next);
    this.checkRosterUnlocks();
    this.saveGame();
    const enter = () => { this.state = 'playing'; this.loadRoom(next); this.fadeTarget = 0; };
    // Encontro do aliado que este capítulo traz (js/story.js) e, depois, o capítulo seguinte
    const recruits = pendingRecruits(this);
    const pages = [...recruitPages(recruits, this), ...(CHAPTERS[next] ? CHAPTERS[next](this) : [])];
    if (pages.length) this.fadeTo(() => this.playStory(pages, () => { joinAllies(recruits, this); this.fadeTo(enter); }));
    else this.fadeTo(enter);
  }

  chooseUpgrade(i) {
    const u = this.upgradeChoices[i];
    if (!u || this.fadeCb) return;
    this.upgrades.apply(u, this.player);
    this.audio.play('upgrade');
    this.goToNextRoom();
  }

  updateUpgrade(dt) {
    if (this.upgradeLock > 0) { this.upgradeLock -= dt; return; }
    if (this.fadeCb) return;
    const inp = this.input, n = this.upgradeChoices.length;
    if (inp.pressed.left) { this.upgradeSel = (this.upgradeSel + n - 1) % n; this.audio.play('uiMove'); }
    if (inp.pressed.right) { this.upgradeSel = (this.upgradeSel + 1) % n; this.audio.play('uiMove'); }
    const rects = this.screens.cardRects();
    if (inp.mouse.moved || inp.mouse.clicked) {
      rects.forEach((r, i) => {
        if (inp.mouse.x >= r.x && inp.mouse.x <= r.x + r.w && inp.mouse.y >= r.y && inp.mouse.y <= r.y + r.h) {
          if (this.upgradeSel !== i) { this.upgradeSel = i; this.audio.play('uiMove'); }
          if (inp.mouse.clicked) this.chooseUpgrade(i);
        }
      });
    }
    if (inp.pressed.one) this.chooseUpgrade(0);
    else if (inp.pressed.two) this.chooseUpgrade(1);
    else if (inp.pressed.three) this.chooseUpgrade(2);
    else if (inp.pressed.confirm) this.chooseUpgrade(this.upgradeSel);
    if (inp.pressed.reroll) {
      if (this.stats.soulsBank >= this.rerollCost) {
        this.stats.soulsBank -= this.rerollCost;
        this.rerollCost += 6;
        this.upgradeChoices = this.upgrades.roll(3);
        this.upgradeSel = Math.min(this.upgradeSel, this.upgradeChoices.length - 1);
        this.audio.play('uiSelect');
      } else this.audio.play('uiDeny');
    }
    if (inp.pressed.buyHeal) {
      const p = this.player;
      if (this.stats.soulsBank >= this.healCost && p.hp < p.maxHp) {
        this.stats.soulsBank -= this.healCost;
        p.heal(Math.round(p.maxHp * 0.4), false);
        this.hud.ghostHp = p.hp;
        this.audio.play('health');
      } else this.audio.play('uiDeny');
    }
  }

  // Pausa: o menu de pausa (js/menus.js) assume a entrada até RETOMAR
  pauseGame() {
    if (this.state !== 'playing') return;
    this.captureThumb();          // a tela ainda mostra o último quadro da ação
    this.state = 'paused';
    this.menu.openPause();
    this.audio.play('uiMove');
    if (this.audio && this.audio.music) this.audio.music.setPausedState(true);
  }
  resume() {
    this.state = 'playing';
    this.audio.play('uiMove');
    if (this.audio && this.audio.music) this.audio.music.setPausedState(false);
  }
  // Volta ao menu principal (o progresso é salvo antes)
  toMenu() {
    this.saveGame();
    if (this.world) { this.world.save(); this.world.stop(); }
    this.state = 'menu';
    this.menu.toMain();
    this.audio.stopAmbient();
    this.audio.narration.stop();
    this.audio.playMusic('menu');
    this.fadeTarget = 0;
  }

  endRun(victory) {
    this.state = victory ? 'victory' : 'gameover';
    this.fadeTarget = 0;
    this.endLock = 1.0;
    const s = this.stats;
    // Classificação final (tempo, dano recebido e maior combo)
    let pts = 0;
    if (s.time < 900) pts++;
    if (s.dmgTaken < 300) pts++;
    if (this.counter.best >= 40) pts++;
    this.rank = ['C', 'B', 'A', 'S'][pts];
    if (s.score > this.best) {
      this.best = Math.round(s.score);
      this.newRecord = true;
      try { localStorage.setItem('eclipse_zero_best', String(this.best)); } catch (e) { /* armazenamento indisponível */ }
    } else this.newRecord = false;
    if (victory) {
      this.audio.play('victory');
      // Novo ciclo: a evolução de Kael continua, a jornada recomeça
      const sv = this.makeSave();
      sv.room = 0; sv.flags = { cycle: (this.flags.cycle || 0) + 1 };
      sv.stats = { soulsBank: this.stats.soulsBank };
      if (this.slot) SaveSys.write(this.slot, sv);
    } else {
      this.saveGame();
      this.audio.stopMusic({ fade: 1.5 });
    }
    this.audio.stopAmbient();
  }

  updateEnd(dt) {
    this.particles.update(dt);
    this.texts.update(dt);
    this.trails.update(dt);
    this.arcs.update(dt);
    if (this.endLock > 0) { this.endLock -= dt; return; }
    const inp = this.input;
    if (this.fadeCb) return;
    if (inp.pressed.confirm || inp.mouse.clicked) {
      this.audio.play('uiSelect');
      if (this.state === 'victory') this.fadeTo(() => this.continueGame());
      else this.fadeTo(() => this.respawn(true));
    } else if (inp.pressed.toTitle || inp.pressed.pause) this.fadeTo(() => this.toMenu());
  }

  // ---------------------------------------------------- progressão e XP
  xpFor(e) {
    if (e.isBoss) return XP_ENEMY.chefe;
    return (XP_ENEMY[e.type] || 15) * (1 + 0.2 * (e.level || 0)) * (e.elite ? 3 : 1) * (this.world ? WorldTime.xpMult() : 1);   // mundo: +20% à noite
  }

  // Progresso do personagem em campo (o do Kael é this.progress, no formato de sempre)
  activeProgress() { return PartyProgress.of(RosterManager.active) || this.progress; }

  gainXP(n, x, y) {
    const pr = this.activeProgress();
    n = Math.round(n);
    if (n <= 0 || pr.level >= PROG.maxLevel) return;
    pr.xp += n;
    this.hud.xpGain(n);
    if (x !== undefined) this.texts.spawn(x, y, 70, `+${n} XP`, '#b9a8ff', 13, 0.9);
    const from = pr.level;
    while (pr.level < PROG.maxLevel && pr.xp >= pr.xpNext) { pr.xp -= pr.xpNext; pr.level++; }
    if (pr.level >= PROG.maxLevel) pr.xp = 0;
    if (pr.level > from) this.onLevelUp(from, pr.level);
  }

  // Subida de nível: atributos, pontos de habilidade, vida e energia restauradas
  onLevelUp(from, to) {
    const p = this.player, pr = this.activeProgress();
    let sp = 0;
    for (let l = from + 1; l <= to; l++) sp += PROG.pointsAt(l);
    pr.sp += sp;
    p.recalc();
    p.hp = p.maxHp; p.fury = Math.max(p.fury, p.maxEnergy);
    this.hud.ghostHp = p.hp;
    const fresh = Object.values(skillsOf(RosterManager.active)).filter((s) => s.lvl > from && s.lvl <= to).map((s) => s.name);
    this.hud.levelUp(to, sp, fresh);
    const P_ = this.particles;
    P_.ring(p.x, p.y, 150, '170,140,255', 0.6, 10);
    P_.ring(p.x, p.y, 90, '230,220,255', 0.4, 6);
    P_.flash(p.x, p.y, 40, 160, '190,170,255', 0.3);
    P_.embers(p.x, p.y, 0, 40, '190,160,255', 40, 220);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      this.arcs.spawn(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, 320, p.x, p.y, 30, { w: 2, life: 0.35, rgb: '200,180,255' });
    }
    this.flashScreen('190,170,255', 0.3);
    this.slowMo(0.5, 0.35);
    this.audio.play('levelUp');
    this.checkRosterUnlocks();
    this.saveGame();
  }

  setFlag(k, v) {
    this.flags[k] = v;
    this.checkRosterUnlocks();
    if (this.player) this.player.recalc();
    this.saveGame();
  }

  // ------------------------------------------------- elenco de personagens
  // O que a campanha já cumpriu (para as condições de desbloqueio do roster)
  rosterContext() {
    const f = this.flags;
    const lvl = this.progress ? this.progress.level : 1;
    return { chapter: Math.max(f.chapters | 0, this.checkpoint | 0), flags: f, bosses: f.bosses || [], quests: f.quests || [], level: lvl };
  }
  checkRosterUnlocks() { return RosterManager.checkUnlocks(this.rosterContext()); }
  onCharacterUnlocked(d) {
    PartyProgress.join(d.id, this.progress.level);   // entra um nível abaixo do Kael (mínimo 1), com os pontos
    const soon = d.devStatus === 'coming_soon';
    this.hud.toast(`${soon ? t('newAllySoon') : t('newAlly')} · ${d.name.toUpperCase()}`, hexToRgb(d.color));
    this.audio.play('memory');
  }
  onArmorUnlocked(a) {
    const owner = a.owner === 'all' ? t('everyone') : (RosterManager.def(a.owner) || {}).name;
    this.hud.toast(`${t('newArmor')} · ${a.name} (${owner})`, '185,168,255');
  }
  onWeaponUnlocked(w) {
    const owner = w.owner === 'all' ? t('everyone') : (RosterManager.def(w.owner) || {}).name;
    this.hud.toast(`${t('newWeapon')} · ${w.name} (${owner})`, '255,185,120');
  }
  // Troca de personagem (PERSONAGENS na pausa, com o setor liberado, ou o console dev):
  // um Player novo com a ficha escolhida, no mesmo lugar, com a mesma % de vida e energia
  onCharacterChanged() {
    const old = this.player, def = RosterManager.activeDef;
    if (!old || !this.room || this.state === 'menu' || old.def === def) return;
    PartyProgress.join(def.id, this.progress.level);   // liberado sem progresso (dev, salvamento antigo)
    const hpK = old.maxHp > 0 ? clamp(old.hp / old.maxHp, 0, 1) : 1;
    const enK = old.maxEnergy > 0 ? clamp(old.fury / old.maxEnergy, 0, 1) : 0;
    const p = new Player(old.x, old.y, def);
    p.facing = old.facing;
    p.recalc(true);
    p.hp = Math.max(1, Math.round(p.maxHp * hpK));
    p.fury = p.maxEnergy * enK;
    this.player = p;
    this.hud.ghostHp = p.hp;
    this.saveGame();
  }

  // ------------------------------------------------------- salvamento
  makeSave() {
    const s = this.stats;
    return {
      v: SAVE_VERSION, time: Date.now(), room: this.checkpoint, slot: this.slot, thumb: this.thumb,
      roster: RosterManager.toJSON(), party: PartyProgress.toJSON(),
      progress: this.progress.toJSON(), upgrades: Object.assign({}, this.upgrades.levels), flags: this.flags,
      stats: { memories: s.memories, memLost: s.memLost, soulsBank: s.soulsBank, soulsTotal: s.soulsTotal, score: Math.round(s.score), kills: s.kills, time: Math.round(s.time) },
    };
  }
  saveGame() {
    if (!this.player || !this.slot || this.state === 'menu' || this.state === 'victory') return;
    if (SaveSys.write(this.slot, this.makeSave())) this.hud.saved();
  }
  // Miniatura 16:9 da tela atual para a lista de salvamentos
  captureThumb() {
    if (this.thumbBroken) return;
    try {
      const c = this.thumbCanvas || (this.thumbCanvas = document.createElement('canvas'));
      c.width = 192; c.height = 108;
      const src = this.canvas;
      let sw = src.width, sh = sw * 9 / 16;
      if (sh > src.height) { sh = src.height; sw = sh * 16 / 9; }
      c.getContext('2d').drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, 192, 108);
      this.thumb = c.toDataURL('image/jpeg', 0.62);
    } catch (e) { this.thumbBroken = true; }
  }
  applySave(s) {
    this.progress.load(s.progress);
    for (const id in s.upgrades || {}) {
      const u = UPGRADES.find((q) => q.id === id);
      if (u) this.upgrades.levels[id] = clamp(s.upgrades[id] | 0, 0, u.max);
    }
    this.flags = Object.assign({}, s.flags || {});
    const st = s.stats || {}, d = this.stats;
    for (const k of ['memories', 'memLost', 'soulsBank', 'soulsTotal', 'score', 'kills', 'time']) d[k] = Math.max(0, +st[k] || 0);
  }

  // Novo jogo no espaço escolhido: história de abertura e o primeiro setor
  newGame(slot, roster = null) {
    this.slot = slot;
    this.newRoster = roster;   // elenco escolhido na seleção de personagem (js/rosterscreen.js)
    SaveSys.clear(slot);
    this.fadeTo(() => this.playStory(STORY.intro(), () => this.fadeTo(() => this.startRun())));
  }
  // Continua o salvamento de um espaço (sem argumento: o espaço em uso)
  continueGame(slot = this.slot) {
    const s = SaveSys.read(slot);
    this.slot = slot;
    this.startRun(s || null);
    if (s) this.hud.toast(`Sinal restaurado · nível ${this.activeProgress().level}`, '185,168,255');
    // Encontro com um aliado interrompido (o jogo fechou durante as páginas): termina antes de seguir
    const late = pendingRecruits(this);
    if (late.length) this.playStory(recruitPages(late, this), () => { joinAllies(late, this); this.fadeTo(() => { this.state = 'playing'; this.fadeTarget = 0; }); });
  }

  // Derrota: Kael desperta no último ponto seguro, mantendo a evolução
  respawn(penalty = true) {
    if (this.world) { this.world.respawn(); return; }   // mundo aberto: volta ao último portal
    const s = this.stats;
    const lost = penalty ? Math.floor(s.soulsBank * 0.25) : 0;
    s.soulsBank -= lost;
    this.counter = new ComboCounter();
    this.player = new Player(0, 0);
    this.player.recalc(true);
    this.hud.reset();
    this.victoryTimer = 0; this.ending = null; this.glitchT = 0;
    this.timeScale = 1; this.slowTimer = 0; this.hitStop = 0;
    this.loadRoom(this.checkpoint);
    this.state = 'playing';
    this.fade = 1; this.fadeTarget = 0;
    if (lost > 0) this.hud.toast(`${lost} células de energia se perderam`, '255,92,122');
    this.saveGame();
  }

  // ------------------------------------------------ árvore de habilidades
  // Abre nas árvores do personagem ativo; Z/C (LT/RT) mostram as dos outros personagens, e
  // cada personagem do grupo gasta os próprios pontos (skillTreeAccess em js/data/skilltrees.js)
  openSkills(from = 'playing') {
    const ui = this.skillUI;
    ui.from = from; ui.msg = ''; ui.msgT = 0; ui.fx = null;
    this.setSkillChar(RosterManager.active, true);
    this.state = 'skills';
    this.audio.play('uiMove');
  }
  closeSkills() { this.state = this.skillUI.from || 'playing'; this.audio.play('uiMove'); }
  treeNodes(ti, charId = this.skillUI.char) {
    const tr = skillTreesOf(charId)[ti];
    return tr ? skillNodesOf(tr.id) : [];
  }
  setSkillTree(ti) {
    const ui = this.skillUI, n = skillTreesOf(ui.char).length;
    ui.tree = (ti + n) % n;
    const list = this.treeNodes(ui.tree);
    ui.sel = (list.find((s) => s.row === 0) || list[0]).id;
    this.audio.play('uiMove');
  }
  // Personagem mostrado na tela (cada um lembra a árvore e o nó escolhidos)
  setSkillChar(id, quiet = false) {
    const ui = this.skillUI;
    if (!skillTreesOf(id).length) id = DEFAULT_CHARACTER;
    if (ui.char === id) return;
    ui.memo[ui.char] = { tree: ui.tree, sel: ui.sel };
    ui.char = id; ui.fx = null; ui.respecT = 0;
    const m = ui.memo[id], n = skillTreesOf(id).length;
    ui.tree = m && m.tree < n ? m.tree : 0;
    const list = this.treeNodes(ui.tree);
    ui.sel = m && list.some((s) => s.id === m.sel) ? m.sel : (list.find((s) => s.row === 0) || list[0]).id;
    if (!quiet) this.audio.play('uiMove');
  }
  cycleSkillChar(d) {
    const ids = skillCharacters(), i = Math.max(0, ids.indexOf(this.skillUI.char));
    this.setSkillChar(ids[(i + d + ids.length) % ids.length]);
  }
  // Seleção pelo teclado: o nó mais próximo na direção pressionada
  moveSkillSel(dx, dy) {
    const ui = this.skillUI, cur = skillDef(ui.sel);
    let best = null, bs = Infinity;
    for (const s of this.treeNodes(ui.tree)) {
      if (s === cur) continue;
      const ddx = s.col - cur.col, ddy = s.row - cur.row;
      const along = ddx * dx + ddy * dy, side = Math.abs(ddx * dy) + Math.abs(ddy * dx);
      if (along <= 0) continue;
      const sc = along + side * 1.6;
      if (sc < bs) { bs = sc; best = s; }
    }
    if (best) { ui.sel = best.id; this.audio.play('uiMove'); }
  }
  skillMsg(text, rgb = '255,92,122') { this.skillUI.msg = text; this.skillUI.msgRgb = rgb; this.skillUI.msgT = 2; }
  learnSkill(id) {
    const acc = skillTreeAccess(this.skillUI.char);
    if (!acc.editable) { this.audio.play('uiDeny'); this.skillMsg(acc.deny); return; }
    const pr = PartyProgress.of(this.skillUI.char), why = pr.blocker(id);   // Kael: this.progress
    if (why) { this.audio.play('uiDeny'); this.skillMsg(why); return; }
    const first = pr.lv(id) === 0;
    pr.learn(id);
    this.player.recalc();
    this.skillUI.fx = { id, t: 0 };
    const s = skillDef(id);
    let msg = first ? `${s.name} desbloqueada!` : `${s.name} aprimorada · nível ${pr.lv(id)}`;
    const k = pr.slots.indexOf(id);
    if (first && k >= 0) msg += ` Atalho ${k + 1}.`;
    this.skillMsg(msg, '140,255,190');
    this.audio.play('skill');
    this.saveGame();
  }
  // Redistribuir os pontos (respec): devolve tudo o que o herói mostrado gastou na árvore e
  // limpa os atalhos. A primeira de cada herói é grátis; as seguintes custam 10 células por
  // ponto devolvido. Pede confirmação: o primeiro aperto mostra o preço, o segundo (em 4 s) faz
  respecPrice(pr) { return pr.respecs > 0 ? pr.spent() * 10 : 0; }
  respecSkills() {
    const ui = this.skillUI, acc = skillTreeAccess(ui.char);
    if (!acc.editable) { this.audio.play('uiDeny'); this.skillMsg(acc.deny); return false; }
    const pr = PartyProgress.of(ui.char), n = pr.spent(), preco = this.respecPrice(pr);
    if (!n) { this.audio.play('uiDeny'); this.skillMsg('Nenhum ponto gasto para redistribuir'); return false; }
    if (!(ui.respecT > 0)) {
      ui.respecT = 4;
      this.skillMsg(`Redistribuir: devolve ${n} ${n > 1 ? 'pontos' : 'ponto'}${preco ? ` por ${preco} células` : ' (a primeira é grátis)'} · aperte de novo para confirmar`, '255,212,122');
      ui.msgT = 4;
      this.audio.play('uiMove');
      return false;
    }
    ui.respecT = 0;
    if (preco > this.stats.soulsBank) { this.audio.play('uiDeny'); this.skillMsg(`Faltam ${preco - this.stats.soulsBank} células para redistribuir`); return false; }
    this.stats.soulsBank -= preco;
    pr.respec();
    this.player.recalc();
    ui.fx = null;
    this.skillMsg(`${n} ${n > 1 ? 'pontos devolvidos' : 'ponto devolvido'}${preco ? ` · −${preco} células` : ''} · distribua de novo`, '140,255,190');
    this.audio.play('skill');
    this.saveGame();
    if (this.world) this.world.save();
    return true;
  }
  bindSkill(id, k) {
    const acc = skillTreeAccess(this.skillUI.char);
    if (!acc.editable) { this.skillMsg(acc.deny); this.audio.play('uiDeny'); return; }
    if (!skillIsActive(id)) { this.skillMsg('Só habilidades ativas vão para os atalhos'); this.audio.play('uiDeny'); return; }
    if (!PartyProgress.of(this.skillUI.char).bind(id, k)) { this.skillMsg('Desbloqueie a habilidade primeiro'); this.audio.play('uiDeny'); return; }
    this.skillMsg(`${skillDef(id).name} → atalho ${k + 1}`, '140,200,255');
    this.audio.play('uiSelect');
    this.saveGame();
  }
  updateSkills(dt) {
    const inp = this.input, ui = this.skillUI;
    if (ui.fx) { ui.fx.t += dt; if (ui.fx.t > 0.9) ui.fx = null; }
    if (ui.msgT > 0) ui.msgT -= dt;
    if (ui.respecT > 0) ui.respecT -= dt;
    if (inp.pressed.skills || inp.pressed.back) { this.closeSkills(); return; }
    if (inp.pressed.respec) this.respecSkills();
    if (inp.pressed.charPrev) this.cycleSkillChar(-1);
    if (inp.pressed.charNext) this.cycleSkillChar(1);
    if (inp.pressed.tabPrev) this.setSkillTree(ui.tree - 1);
    if (inp.pressed.tabNext) this.setSkillTree(ui.tree + 1);
    if (inp.pressed.left) this.moveSkillSel(-1, 0);
    if (inp.pressed.right) this.moveSkillSel(1, 0);
    if (inp.pressed.up) this.moveSkillSel(0, -1);
    if (inp.pressed.down) this.moveSkillSel(0, 1);
    for (let k = 0; k < 4; k++) if (inp.pressed['ab' + (k + 1)]) this.bindSkill(ui.sel, k);
    const L = this.screens.skillLayout(), m = inp.mouse;
    const inR = (r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
    if (m.moved || m.clicked) {
      for (const id in L.nodes) {
        const n = L.nodes[id];
        if (dist(m.x, m.y, n.x, n.y) <= n.r + 6 && ui.sel !== id) { ui.sel = id; this.audio.play('uiMove'); }
      }
    }
    if (m.clicked) {
      L.chars.forEach((r) => { if (inR(r) && r.id !== ui.char) this.setSkillChar(r.id); });
      L.tabs.forEach((r, i) => { if (inR(r) && i !== ui.tree) this.setSkillTree(i); });
      if (inR(L.btn)) this.learnSkill(ui.sel);
      if (L.respec && inR(L.respec)) this.respecSkills();
      if (skillIsActive(ui.sel) && skillTreeAccess(ui.char).editable) L.slots.forEach((r, k) => { if (inR(r)) this.bindSkill(ui.sel, k); });
      if (inR(L.close)) this.closeSkills();
    }
    if (inp.pressed.confirm) this.learnSkill(ui.sel);
  }

  // --------------------------------------------------------------- desenho
  // Registra um brilho (desenhado depois da escuridão); coordenadas no sistema atual do ctx
  addGlow(ctx, x, y, r, rgb, a) {
    if (this.glowCount >= 200) return;
    const m = ctx.getTransform();
    let g = this.glows[this.glowCount];
    if (!g) g = this.glows[this.glowCount] = { x: 0, y: 0, r: 0, rgb: '', a: 0 };
    g.x = m.a * x + m.c * y + m.e; g.y = m.b * x + m.d * y + m.f;
    g.r = r * Math.hypot(m.a, m.b); g.rgb = rgb; g.a = a;
    this.glowCount++;
  }

  drawGlows(ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.glowCount; i++) {
      const g = this.glows[i];
      GlowCache.draw(ctx, g.rgb, g.x, g.y, g.r, g.a);
    }
    ctx.restore();
  }

  render(dt) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offX, this.offY);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip();
    if (this.state === 'menu') {
      this.menu.draw(ctx, this.realTime);
    } else if (this.state === 'thirdperson') {
      if (this.thirdPerson) this.thirdPerson.draw(ctx, this.realTime);
    } else if (this.state === 'story') {
      this.story.draw(ctx, this.realTime);
    } else if (this.player && this.room) {
      this.renderWorld(ctx);
      if (this.world) WorldTime.drawOverlay(ctx);   // dia e noite, clima (js/mundo/tempo.js)
      this.renderScreenFx(ctx);
      if (this.state === 'playing') { this.hud.draw(ctx); TouchControls.draw(ctx); }   // botões de toque (celular)
      if (this.state === 'paused') this.menu.draw(ctx, this.realTime);
      else if (this.state === 'worldmap') World.drawMap(ctx, this.realTime);
      else if (this.state === 'worldinv') WorldInv.draw(ctx, this.realTime);
      else if (this.state === 'worlddlg') { this.hud.draw(ctx); Dialogo.draw(ctx, this.realTime); }
      else if (this.state === 'skills') this.screens.drawSkills(ctx, this.realTime);
      else if (this.state === 'upgrade') this.screens.drawUpgrade(ctx, this.realTime);
      else if (this.state === 'gameover') this.screens.drawEnd(ctx, false, this.realTime);
      else if (this.state === 'victory') this.screens.drawEnd(ctx, true, this.realTime);
    }
    if (this.debug) this.drawDebugInfo(ctx);
    if (this.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fade.toFixed(3)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    DevTools.draw(ctx);
    this.menu.drawNotice(ctx);
    ctx.restore();
    // Atualiza a miniatura do salvamento a cada poucos segundos de ação
    if (this.state === 'playing' && this.realTime - this.thumbT > 6 && this.fade < 0.02 && !this.fadeCb) { this.thumbT = this.realTime; this.captureThumb(); }
  }

  // ------------------------------------------------------------- modelos 3D
  // Constrói (uma única vez) o modelo 3D de uma chave do registro MODELS3D
  model3(key) {
    const def = MODELS3D[key];
    if (!def || def.broken) return null;
    if (!def.model) {
      try { def.model = def.build(); } catch (e) { console.error(e); def.broken = true; return null; }
    }
    return def.model;
  }
  // Opções reaproveitadas por entidade (sem alocar a cada quadro)
  opts3(e, flash) {
    const o = e._o3 || (e._o3 = {});
    o.yaw = (typeof e.viewFacing === 'number' ? e.viewFacing : e.facing) || 0; o.flash = flash; o.ghost = null; o.holo = false; o.emi = undefined; o.scale = 1; o.lift = 0; o.roll = 0; o.pitch = 0; o.tint = null; o.vart = null;
    return o;
  }
  queue3(key, e, o) {
    const m = this.model3(key);
    if (!m) return null;
    const def = MODELS3D[key];
    if (def.opts) Object.assign(o, def.opts(e));
    if (e.elite) o.scale = (o.scale || 1) * 1.18;
    if (e.escala) o.scale = (o.scale || 1) * e.escala;   // variantes de inimigos (js/mundo/variantes.js): tamanho e cor
    if (e.tint) o.vart = e.tint;
    return R3D.queue(m, def.pose, e, o);
  }
  // Halos definidos pelo modelo, posicionados pelas âncoras projetadas
  glows3D(ctx, key, e, spr, sx, sy, alpha = 1) {
    const def = MODELS3D[key];
    if (!def || !def.glows || !spr || !spr.ok) return;
    def.glows(e, (name, r, rgb, a) => {
      const q = spr.anchors[name];
      if (q) this.addGlow(ctx, sx + q.x, sy + q.y, r, rgb, a * alpha);
    });
  }
  // Fantasma da esquiva: a entidade do jogador vista em pose de investida
  ghostProxy(i, p, g) {
    let gp = this.ghostProxies[i];
    if (!gp || Object.getPrototypeOf(gp) !== p) gp = this.ghostProxies[i] = Object.create(p);
    gp.state = 'dash'; gp.stateTime = 0.08; gp.facing = g.f; gp.attack = null; gp.flash = 0; gp.z = 0;
    return gp;
  }
  // Posa e desenha no atlas todos os modelos 3D visíveis neste quadro
  prepare3D() {
    this.use3D = R3D.active;
    if (!this.use3D) return;
    const th = this.room.theme, lc = th.lamp.split(',').map((v) => v / 255);
    R3D.light.amb = [0.34 + lc[0] * 0.16, 0.38 + lc[1] * 0.16, 0.5 + lc[2] * 0.16];
    const p = this.player, art = !p.kit && p.def.id === DEFAULT_CHARACTER && KaelArt.active();   // os sprites da arte oficial são só do Kael
    // Modelo do personagem: a versão texturizada (<modelo>Tex) tem preferência; sem ela, o modelo
    // procedural do herói (ou o do Kael)
    const mk0 = p.def.model || 'kael', mk = heroModelKey(p.def);
    p.mk3 = mk;
    const o3 = this.opts3(p, p.flash > 0 ? 0.9 : 0);
    o3.tint = heroArmorTint(p.def.id);   // cor da armadura equipada no modelo texturizado
    p.spr = art ? null : this.queue3(mk, p, o3);
    let n = art ? 99 : 0;   // com a arte oficial, os fantasmas da esquiva também são sprites
    for (let i = 0; i < p.ghosts.length; i++) {
      const g = p.ghosts[i];
      g.spr = null;
      if (g.life <= 0 || n >= 5) continue;
      n++;
      const gp = this.ghostProxy(i, p, g);
      const o = g._o3 || (g._o3 = {});
      o.yaw = g.f; o.ghost = p.kit ? p.kit.ghostRgb : heroGhostRgb(p.def); o.flash = 0; o.emi = undefined; o.holo = false; o.scale = 1; o.lift = 0; o.roll = 0; o.pitch = 0;
      g.spr = this.queue3(MODELS3D[mk0] ? mk0 : 'kael', gp, o);   // fantasmas: o modelo procedural do herói
    }
    for (const e of this.enemies) e.spr = this.queue3(e.isBoss ? 'nexus' : e.type, e, this.opts3(e, e.flash > 0 ? 0.85 : 0));
    for (const n of this.npcs) n.spr = this.queue3(n.key, n, this.opts3(n, 0));
    let cells = 0;
    for (let i = 0; i < this.pickups.count; i++) {
      const it = this.pickups.items[i];
      it.spr = null;
      const key = it.kind === 'memory' ? 'memoria' : it.kind === 'health' ? 'capsula' : (cells++ < 36 ? 'celula' : null);
      if (key) it.spr = this.queue3(key, it, this.opts3(it, 0));
    }
    R3D.flush(Math.min(4, this.scale * this.camera.zoom));   // até 4 pixels por unidade (telas 4K e zoom alto)
  }

  // Fundo atrás da sala: a cidade sob o céu artificial, o topo da torre ou a escuridão
  drawSky(ctx) {
    const th = this.room.theme, cam = this.camera, t = this.realTime;
    if (th.sky === 'indoor') {
      const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H * 0.35, 40, VIEW_W / 2, VIEW_H * 0.35, VIEW_W * 0.75);
      g.addColorStop(0, rgba(th.lamp, 0.05)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      return;
    }
    const layer = Backdrop.layer('sky-' + th.sky, VIEW_W + 160, VIEW_H + 120, (g, w, h) => Backdrop.paintSky(g, w, h, th.sky));
    const px = clamp(-cam.x * 0.04, -70, 70), py = clamp(-cam.y * 0.04, -50, 50);
    ctx.drawImage(layer, -80 + px, -60 + py);
    // Rachaduras do céu artificial (fase III de NEXUS)
    if (this.room.skyCrack > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
      const rnd = mulberry32(31);
      for (let i = 0; i < Math.ceil(this.room.skyCrack * 6); i++) {
        const x = rnd() * VIEW_W, y = rnd() * VIEW_H * 0.35;
        drawBolt(ctx, x, y, x + (rnd() - 0.5) * 300, y + rnd() * 120, mulberry32(i * 7 + 3), 0.3, 1.5, '120,230,255', 0.5 + 0.2 * Math.sin(t * 3 + i));
      }
      ctx.restore();
    }
    // Relâmpago distante
    if (this.skyFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(170,210,255,${(0.18 * this.skyFlash).toFixed(3)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
      const bx = this.skyBoltX * VIEW_W;
      drawBolt(ctx, bx, -10, bx + 80, VIEW_H * 0.3, mulberry32(this.skySeed || 1), 0.28, 2.6, '170,225,255', this.skyFlash);
      ctx.restore();
    }
  }

  // O "sol negro" do Eclipse Absoluto: disco escuro com coroa elétrica
  drawEclipseFx(ctx) {
    const e = this.eclipse;
    if (!e) return;
    const k = e.t / 1.2;
    if (k >= 1) { this.eclipse = null; return; }
    const sx = isoX(e.x, e.y), sy = isoY(e.x, e.y) - 100;
    const R = 34 + easeOutCubic(Math.min(1, k * 2.5)) * 46;
    const a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, '50,120,255', sx, sy, R * 3.4, 0.7 * a);
    GlowCache.draw(ctx, '210,235,255', sx, sy, R * 1.7, 0.85 * a);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a;
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(sx, sy, R * 0.8, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba('210,235,255', 0.9 * a); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(sx, sy, R * 0.83, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba('90,160,255', 0.6 * a); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const an = (i / 18) * TAU + e.t * 0.8, r1 = R * (1.15 + 0.35 * Math.abs(Math.sin(i * 2.3 + e.t * 9)));
      ctx.moveTo(sx + Math.cos(an) * R * 0.9, sy + Math.sin(an) * R * 0.9);
      ctx.lineTo(sx + Math.cos(an) * r1, sy + Math.sin(an) * r1);
    }
    ctx.stroke();
    ctx.restore();
  }

  renderWorld(ctx) {
    const p = this.player, cam = this.camera, room = this.room, t = this.time;
    this.glowCount = 0;
    if (ThirdView.active()) { ThirdView.render(ctx); return; }   // câmera em terceira pessoa
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawSky(ctx);
    this.prepare3D();

    // 1) Camada sólida: cenário, sombras e corpos ordenados por profundidade
    ctx.save();
    cam.apply(ctx);
    room.drawBackground(ctx);
    room.drawDoor(ctx);
    p.drawShadow(ctx);
    for (const e of this.enemies) if (e.state !== 'spawn') e.drawShadow(ctx);
    for (const n of this.npcs) if (!n.holo) n.drawShadow(ctx);
    this.projectiles.drawShadows(ctx);
    const list = this.drawList;
    list.length = 0;
    list.push(p);
    for (const e of this.enemies) list.push(e);
    for (const n of this.npcs) list.push(n);
    for (const pl of room.pillars) list.push(pl);
    list.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const o of list) {
      if (o.sprite !== undefined) drawPillar(ctx, o, p);
      else o.draw(ctx);
    }
    this.particles.drawSolid(ctx);
    ctx.restore();

    // 2) Escuridão com luzes (jogador, tochas, projéteis, chefe)
    const L = this.lighting;
    L.clear();
    const flick = Math.sin(this.realTime * 9) * 6 + Math.sin(this.realTime * 23) * 3;
    L.add(isoX(p.x, p.y), isoY(p.x, p.y) - 30, (p.state === 'special' ? 620 : 470) + flick, 1);
    room.addLights(L, this.realTime);
    for (const n of this.npcs) if (n.lightRgb) L.add(isoX(n.x, n.y), isoY(n.x, n.y) - 30, n.holo ? 150 : 95, 0.5);
    this.projectiles.addLights(L);
    HeroObjects.addLights(L);
    for (const e of this.enemies) {
      if (e.isBoss) L.add(isoX(e.x, e.y), isoY(e.x, e.y) - 60 - e.jumpZ, e.phase === 3 ? 300 : 220, 0.7);
      else if (e.telegraph) L.add(isoX(e.x, e.y), isoY(e.x, e.y) - 20, 90, 0.45);
    }
    for (const h of this.hazards.list) if (h.fired || h.kind === 'ring') L.add(isoX(h.x, h.y), isoY(h.x, h.y) - 20, h.kind === 'ring' ? 200 : 150, 0.6);
    if (this.eclipse) L.add(isoX(this.eclipse.x, this.eclipse.y), isoY(this.eclipse.x, this.eclipse.y) - 60, 700, 1);
    if (this.skyFlash > 0.3) L.add(isoX(room.w / 2, room.h / 2), isoY(room.w / 2, room.h / 2), 900, this.skyFlash * 0.35);
    L.render(ctx, cam, this.world ? WorldTime.escuridao(room.theme) : room.theme.darkness, room.theme.dark, room.outlinePts);   // mundo: hora e clima

    // 3) Camada emissiva: tochas, avisos, coletáveis, projéteis, faíscas e rastros
    ctx.save();
    cam.apply(ctx);
    room.drawEmissive(ctx, this.realTime);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    GlowCache.drawFlat(ctx, p.kit ? p.kit.glowRgb || p.kit.rgb : '60,120,255', isoX(p.x, p.y), isoY(p.x, p.y), 260, 0.14 + 0.08 * (p.fury / 100));
    if (p.state === 'charge') GlowCache.drawFlat(ctx, p.kit ? p.kit.rgb : '120,180,255', isoX(p.x, p.y), isoY(p.x, p.y), 60 + p.chargeLevel * 30, 0.4 + 0.1 * p.chargeLevel);
    for (const e of this.enemies) {
      if (e.elite && e.state !== 'dying') GlowCache.drawFlat(ctx, '255,180,60', isoX(e.x, e.y), isoY(e.x, e.y), e.radius * 3.4, 0.4 + 0.12 * Math.sin(this.realTime * 5 + e.id));
    }
    ctx.restore();
    p.drawAura(ctx, this.realTime);
    for (const e of this.enemies) {
      if (e.telegraph) drawTelegraph(ctx, e.telegraph, e.tgProgress, t);
      if (e.state === 'spawn') this.drawSpawnSigil(ctx, e);
    }
    this.hazards.draw(ctx, t);
    if (this.traps) this.traps.draw(ctx);
    this.pickups.draw(ctx, this.realTime);
    this.projectiles.draw(ctx);
    HeroObjects.draw(ctx);
    this.particles.drawEmissive(ctx);
    this.trails.draw(ctx);
    p.drawEmissive(ctx);
    if (this.use3D) {
      for (const e of this.enemies) e.drawEmissive(ctx);
      for (const n of this.npcs) n.drawEmissive(ctx);
    }
    this.drawEclipseFx(ctx);
    this.arcs.draw(ctx, this.realTime);
    ctx.restore();
    this.drawGlows(ctx);
    if (room.theme.rain) Backdrop.drawRain(ctx, this.realTime, 0.7);

    // 4) Sobreposições do mundo: barras de vida, números de dano e debug
    ctx.save();
    cam.apply(ctx);
    for (const e of this.enemies) if (!e.isBoss) e.drawHpBar(ctx);
    this.texts.draw(ctx);
    if (this.debug) {
      room.drawDebug(ctx);
      for (const e of this.enemies) e.drawDebug(ctx);
      p.drawDebug(ctx);
      this.projectiles.drawDebug(ctx);
    }
    ctx.restore();
  }

  // Portal de materialização no chão enquanto um inimigo surge (cor do seu sensor)
  drawSpawnSigil(ctx, e) {
    const k = clamp(e.stateTime / e.spawnDur, 0, 1), r = e.radius * 2.3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    GlowCache.drawFlat(ctx, e.T.glow, isoX(e.x, e.y), isoY(e.x, e.y), r * 2.2, 0.5 * (1 - k * 0.5));
    ctx.strokeStyle = rgba(e.T.glow, 0.85 * (1 - k * 0.4));
    ctx.lineWidth = 2;
    isoCirclePath(ctx, e.x, e.y, r); ctx.stroke();
    isoCirclePath(ctx, e.x, e.y, r * 0.62); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + this.realTime * 2.5;
      const x0 = e.x + Math.cos(a) * r * 0.62, y0 = e.y + Math.sin(a) * r * 0.62;
      const x1 = e.x + Math.cos(a + 0.5) * r, y1 = e.y + Math.sin(a + 0.5) * r;
      ctx.moveTo(isoX(x0, y0), isoY(x0, y0)); ctx.lineTo(isoX(x1, y1), isoY(x1, y1));
    }
    ctx.stroke();
    ctx.restore();
  }

  // Pós-processamento (configurações): 0 desligado, 1 reduzido, 2 completo.
  // O aviso vermelho de vida baixa continua sempre visível (é informação de jogo).
  renderScreenFx(ctx) {
    const fx = Settings.v.postfx;
    if (fx > 0) { ctx.globalAlpha = fx === 1 ? 0.6 : 1; ctx.drawImage(this.vignette, 0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1; }
    const p = this.player;
    let red = this.hurtVignette;
    if (p.state !== 'dead' && p.hp / p.maxHp < 0.3) red = Math.max(red, 0.3 + 0.18 * Math.sin(this.realTime * 6));
    if (red > 0) { ctx.globalAlpha = clamp(red, 0, 1) * (fx === 0 ? 0.7 : 1); ctx.drawImage(this.redVignette, 0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1; }
    if (this.screenFlash.a > 0) {
      ctx.fillStyle = rgba(this.screenFlash.rgb, this.screenFlash.a * [0.35, 0.6, 1][fx]);
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // Interferência digital: faixas deslocadas da imagem (NEXUS, memórias, Eclipse)
    if (this.glitchT > 0 && fx > 0) {
      const k = Math.min(1, this.glitchT * 3) * (fx === 1 ? 0.5 : 1), c = this.canvas, s = this.scale;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < 7; i++) {
        if (Math.random() > k) continue;
        const y = Math.random() * c.height, h = Math.min(rand(4, 28) * s, c.height - y), off = rand(-26, 26) * s * k;
        if (h >= 1) ctx.drawImage(c, 0, y, c.width, h, off, y, c.width, h);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(60,140,255,${(0.1 * k).toFixed(3)})`;
      ctx.fillRect(0, rand(0, c.height), c.width, rand(2, 6) * s);
      ctx.restore();
    }
  }

  drawDebugInfo(ctx) {
    const p = this.player;
    const lines = [
      `FPS: ${this.fps}   VIEW: ${VIEW_W}x${VIEW_H}   escala: ${this.scale.toFixed(2)}`,
      `Partículas: ${this.particles.count}/${this.particles.max}   Projéteis: ${this.projectiles.count}/${this.projectiles.items.length}   Coletáveis: ${this.pickups.count}`,
      `Inimigos: ${this.enemies.length}   Fichas de ataque: ${this.director.tokens.size}/${this.director.maxTokens}   Perigos: ${this.hazards.list.length}`,
      `3D: ${R3D.ok ? (R3D.enabled ? 'ligado' : 'desligado') : 'indisponível'}   escala do atlas: ${R3D.scale.toFixed(2)}   (G alterna)`,
    ];
    if (p && this.state !== 'menu') {
      lines.push(`Jogador: ${p.state}  invuln: ${Math.max(0, p.invuln).toFixed(2)}  cadeia: "${p.combo.seq}"  buffer: ${p.combo.buffer || '-'}  janela esquiva: ${Math.max(0, p.combo.dashWindow).toFixed(2)}`);
      lines.push(`Hit stop: ${Math.max(0, this.hitStop).toFixed(3)}  escala de tempo: ${this.timeScale.toFixed(2)}  ondas: ${this.waves.state}`);
      lines.push('F1 debug · F2 eliminar inimigos · F3 energia e vida cheias');
    }
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(8, VIEW_H - 18 - lines.length * 16, 640, lines.length * 16 + 10);
    ctx.font = `12px Consolas, monospace`;
    ctx.fillStyle = '#8fffb0';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, 14, VIEW_H - 13 - lines.length * 16 + i * 16));
    ctx.restore();
  }
}

