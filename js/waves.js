'use strict';
// ECLIPSE ZERO · Gerenciador de ondas, porta e chefe
// ---------------------------------------------------------------------------
// GERENCIADOR DE ONDAS: ondas por sala, porta, transição e chefe
// ---------------------------------------------------------------------------
class WaveManager {
  constructor() { this.state = 'idle'; this.queue = []; this.waveIndex = -1; this.timer = 0; this.roomIndex = 0; this.def = ROOM_DEFS[0]; }

  startRoom(index) {
    this.roomIndex = index;
    this.def = ROOM_DEFS[index];
    this.waveIndex = -1;
    this.queue.length = 0;
    this.state = 'intro';
    this.timer = 1.8;
    game.hud.message(this.def.name.toUpperCase(), this.def.sub, 2.4);
    if (this.def.say) game.hud.say(this.def.say[0], this.def.say[1], 4.2, 1.4);
  }

  get totalWaves() { return this.def.boss ? 1 : this.def.waves.length; }

  spawnEnemy(type, x, y, level = this.roomIndex) {
    const e = createEnemy(type, x, y, level);
    game.enemies.push(e);
    game.particles.ring(x, y, e.radius * 2.5, e.T.glow, e.spawnDur, 4);
    game.particles.smoke(x, y, 0, 4, '10,16,26', 14);
    game.audio.play('spawn');
    if (type === 'legionario') game.camera.shake(0.15);
    return e;
  }

  nextWave() {
    this.waveIndex++;
    const wd = this.def.waves[this.waveIndex];
    const list = [];
    for (const t in wd) for (let i = 0; i < wd[t]; i++) list.push(t);
    // Embaralha para variar a ordem de entrada
    for (let i = list.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = list[i]; list[i] = list[j]; list[j] = t; }
    this.queue = list.map((t, i) => ({ type: t, delay: i === 0 ? 0 : rand(0.1, 0.28) }));
    // A última onda de cada setor (a partir do segundo) traz uma unidade de elite
    if (this.roomIndex >= 1 && this.waveIndex === this.def.waves.length - 1 && this.queue.length) this.queue[this.queue.length - 1].elite = true;
    this.state = 'spawning';
    this.timer = 0;
    game.hud.message(`ONDA ${this.waveIndex + 1} / ${this.def.waves.length}`, '', 1.3, true);
    game.audio.play('waveStart');
  }

  startBoss() {
    const r = game.room;
    const boss = new Boss(r.w / 2, r.h / 2 - 60);
    game.enemies.push(boss);
    game.boss = boss;
    this.state = 'boss';
    game.hud.message(boss.name, 'A VOZ DENTRO DA MÁQUINA', 2.8, false, true);
    game.camera.shake(0.4);
  }

  aliveCount() {
    let n = 0;
    for (const e of game.enemies) if (e.alive && e.state !== 'dying') n++;
    return n;
  }

  update(dt) {
    switch (this.state) {
      case 'intro':
        this.timer -= dt;
        if (this.timer <= 0) { if (this.def.boss) this.startBoss(); else this.nextWave(); }
        break;
      case 'spawning':
        this.timer -= dt;
        while (this.queue.length && this.timer <= 0) {
          const q = this.queue.shift();
          const minD = q.type === 'drone' || q.type === 'sacerdote' ? 300 : 230;
          const pt = game.room.randomPoint(60, game.player, minD);
          const e = this.spawnEnemy(q.type, pt.x, pt.y);
          if (q.elite) e.makeElite();
          if (this.queue.length) this.timer += this.queue[0].delay;
        }
        if (!this.queue.length) this.state = 'fighting';
        break;
      case 'fighting':
        if (this.aliveCount() === 0) {
          if (this.waveIndex < this.def.waves.length - 1) { this.state = 'between'; this.timer = 1.1; }
          else this.roomCleared();
        }
        break;
      case 'between':
        this.timer -= dt;
        if (this.timer <= 0) this.nextWave();
        break;
      case 'cleared': {
        const p = game.player;
        if (p.y < -14 && game.room.door.open > 0.9) { this.state = 'exiting'; game.exitRoom(); }
        break;
      }
    }
  }

  roomCleared() {
    this.state = 'cleared';
    game.room.door.opening = true;
    game.pickups.attractAll();
    game.stats.roomsCleared++;
    game.audio.play('door');
    game.audio.play('roomClear');
    game.hud.message('SETOR LIBERADO', 'A comporta se abriu — siga para o norte', 2.6);
    game.gainXP(XP_SRC.roomClear(this.roomIndex));
    if (!this.def.boss) game.spawnMemory();
  }
}

