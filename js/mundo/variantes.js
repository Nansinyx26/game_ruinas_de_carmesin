'use strict';
// ECLIPSE ZERO · Mundo aberto: inimigos variados por região (variantes e traços)
// ---------------------------------------------------------------------------
// Cada VARIANTE parte de um dos cinco inimigos do jogo (o modelo 3D, a IA e os golpes dele) e
// muda o nome, a cor (tinta sobre o metal escuro do modelo, e a cor dos sensores), o tamanho,
// os atributos e ganha TRAÇOS de comportamento:
//   matilha     mais rápido com outros do mesmo bando por perto
//   veneno      o golpe envenena (dano ao longo do tempo; o veneno não mata, deixa com 1)
//   congela     o golpe ou o tiro deixa o herói lento
//   esporos     os tiros deixam o herói lento
//   explode     ao morrer, solta uma explosão em área (aviso no chão antes)
//   kamikaze    corre para o herói e explode ao chegar perto
//   rastro      deixa poças (fogo ou gelo) por onde passa; pisar nelas fere (e o gelo deixa lento)
//   enterra     de tempos em tempos some debaixo da terra e sai perto do herói, com impacto
//   divide      ao morrer, se divide em dois menores
//   carapaca    golpes de frente perdem 60% do dano (vá pelas costas)
//   teleporta   some e reaparece ao lado do herói
//   regenera    recupera vida quando passa um tempo sem apanhar
// As zonas pedem variantes pelo nome (js/mundo/regioes.js, js/mundo/campanhas.js); a missão
// de abate de um tipo conta a variante dele (ex.: lobos de raiz contam como rastejadores).
// ---------------------------------------------------------------------------
const ENEMY_VARIANTS = {
  enxame: { base: 'rastejador', nome: 'Enxame Carmesim', tint: [0.55, 0.08, 0.12, 0.85], glow: '255,40,70', escala: 0.82, vida: 0.7, dano: 0.9, vel: 1.2, tracos: ['divide'] },
  lobo_raiz: { base: 'rastejador', nome: 'Lobo de Raiz', tint: [0.28, 0.4, 0.14, 0.9], glow: '160,255,90', escala: 1.18, vida: 1.3, dano: 1.1, vel: 1.15, tracos: ['matilha', 'veneno'] },
  esporo: { base: 'sacerdote', nome: 'Sentinela de Esporos', tint: [0.3, 0.42, 0.16, 0.9], glow: '190,255,110', escala: 1.05, vida: 1.2, dano: 0.9, vel: 0.9, tracos: ['esporos', 'regenera'] },
  medusa: { base: 'drone', nome: 'Medusa Elétrica', tint: [0.2, 0.45, 0.6, 0.85], glow: '120,240,255', escala: 1.1, vida: 0.9, dano: 1, vel: 1, tracos: ['explode'] },
  carangueijo: { base: 'legionario', nome: 'Caranguejo de Cristal', tint: [0.25, 0.55, 0.65, 0.85], glow: '120,235,255', escala: 0.9, vida: 1.1, dano: 0.9, vel: 1.1, tracos: ['carapaca'] },
  atirador: { base: 'cacador', nome: 'Agente Corporativo', tint: [0.18, 0.2, 0.3, 0.7], glow: '90,200,255', escala: 1, vida: 1, dano: 1.15, vel: 1.05, tracos: ['teleporta'] },
  escorpiao: { base: 'cacador', nome: 'Escorpião de Sucata', tint: [0.55, 0.38, 0.16, 0.9], glow: '255,190,80', escala: 1.12, vida: 1.25, dano: 1.05, vel: 0.95, tracos: ['veneno', 'enterra'] },
  lobo_neve: { base: 'rastejador', nome: 'Lobo das Neves', tint: [0.75, 0.82, 0.95, 0.85], glow: '170,220,255', escala: 1.2, vida: 1.35, dano: 1.1, vel: 1.15, tracos: ['matilha', 'congela'] },
  golem_gelo: { base: 'legionario', nome: 'Golem de Gelo', tint: [0.55, 0.72, 0.9, 0.9], glow: '160,220,255', escala: 1.15, vida: 1.4, dano: 1.15, vel: 0.8, tracos: ['congela', 'rastro'], rastro: 'gelo' },
  magma: { base: 'sacerdote', nome: 'Elemental de Magma', tint: [0.6, 0.18, 0.05, 0.9], glow: '255,120,40', escala: 1.12, vida: 1.3, dano: 1.1, vel: 0.95, tracos: ['rastro', 'divide'], rastro: 'fogo' },
  diabrete: { base: 'drone', nome: 'Diabrete de Cinza', tint: [0.4, 0.2, 0.12, 0.85], glow: '255,140,50', escala: 0.85, vida: 0.6, dano: 1.4, vel: 1.5, tracos: ['kamikaze'] },
};
const POCAS = { fogo: { rgb: '255,110,40', dmg: 6 }, gelo: { rgb: '150,215,255', dmg: 3, lento: 2 } };

// Cria o inimigo do tipo base ou da variante pedida (o nível é o do acampamento ou do encontro)
function criarInimigo(tipo, x, y, nivel) {
  const V = ENEMY_VARIANTS[tipo];
  if (!V) return createEnemy(tipo, x, y, nivel);
  const e = createEnemy(V.base, x, y, nivel);
  EnemyTraits.aplicar(e, tipo);
  return e;
}

const EnemyTraits = {
  aplicar(e, id) {
    const V = ENEMY_VARIANTS[id];
    e.variante = id; e.varNome = V.nome; e.tracos = V.tracos.slice(); e.rastro = V.rastro || null;
    e.tint = V.tint; e.escala = V.escala;
    e.T = Object.assign({}, e.T, { glow: V.glow, name: V.nome });
    e.maxHp = e.hp = Math.round(e.hp * V.vida);
    e.dmg *= V.dano; e.speed *= V.vel; e.velBase = e.speed;
    e.radius = Math.round(e.radius * V.escala); e.height = Math.round(e.height * V.escala);
    e.tracoT = rand(3, 6); e.semDanoT = 0; e.rastroT = 0;
    if (e.tracos.includes('esporos') || e.tracos.includes('congela')) e.projEfeito = e.tracos.includes('congela') ? 'congela' : 'lento';
    if (e.tracos.includes('carapaca')) {
      const orig = e.takeHit.bind(e);
      e.takeHit = (h) => {
        // de frente (o golpe empurra o inimigo para trás dele): só 40% do dano
        const fx = Math.cos(e.facing), fy = Math.sin(e.facing);
        if (-(h.kx * fx + h.ky * fy) > 0.35 && !h.breakArmor) {
          h = Object.assign({}, h, { dmg: Math.max(1, Math.round(h.dmg * 0.4)) });
          game.particles.sparks(e.x, e.y, 24, e.facing, 6, '170,240,255', 220, 1);
        }
        return orig(h);
      };
    }
    return e;
  },

  // Chamado por Enemy.update a cada quadro (fora do acampamento dormindo)
  tick(e, dt) {
    if (!e.alive || e.state === 'dying' || e.dormant) return;
    const p = game.player, T = e.tracos, d = dist(e.x, e.y, p.x, p.y);
    e.semDanoT += dt;
    if (T.includes('matilha')) {
      let n = 0;
      for (const q of game.enemies) if (q !== e && q.alive && q.variante === e.variante && dist2(q.x, q.y, e.x, e.y) < 220 * 220) n++;
      e.speed = e.velBase * (n >= 2 ? 1.3 : n === 1 ? 1.12 : 1);
    }
    if (T.includes('regenera') && e.semDanoT > 3 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.03 * dt);
    if (T.includes('rastro') && Math.hypot(e.vx, e.vy) > 30 && (e.rastroT -= dt) <= 0) {
      e.rastroT = 0.55;
      const P = POCAS[e.rastro] || POCAS.fogo;
      game.hazards.add({ kind: 'poca', x: e.x, y: e.y, r: 30 + e.radius * 0.6, dur: 3.2, dmg: Math.round(P.dmg + e.level * 0.6), rgb: P.rgb, lento: P.lento || 0 });
    }
    if (T.includes('kamikaze') && d < 54 + e.radius && p.state !== 'dead') {
      this.explodir(e, 70, e.dmg * 1.6, '255,140,50', 0.05);
      e.die({ kx: 0, ky: 0 });
      return;
    }
    // enterra e teleporta: de tempos em tempos, quando não está atacando
    if ((T.includes('enterra') || T.includes('teleporta')) && (e.tracoT -= dt) <= 0 && !e.telegraph && e.state !== 'stun' && d < 520) {
      e.tracoT = rand(6, 9);
      if (T.includes('enterra')) {
        e.oculto = 1.1; e.invulnerable = true; e.interrupt();
        e.stun = 1.1; e.setState('stun');
        game.particles.dust(e.x, e.y, 14, 14, 160); game.particles.debris(e.x, e.y, 6);
        game.audio.play('stomp', 0.4);
      } else {
        const a = rand(0, TAU), nx = clamp(p.x + Math.cos(a) * 130, 40, game.room.w - 40), ny = clamp(p.y + Math.sin(a) * 130, 40, game.room.h - 40);
        game.particles.flash(e.x, e.y, 30, 50, e.T.glow, 0.2);
        if (game.room.canStand(nx, ny, e.radius)) { e.x = nx; e.y = ny; }
        game.particles.flash(e.x, e.y, 30, 50, e.T.glow, 0.2);
        game.audio.play('zap', 0.5);
      }
    }
    if (e.oculto > 0) {
      // debaixo da terra: vai até perto do herói e sai com um impacto em volta
      e.oculto -= dt;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      if (d > 60) { e.x += Math.cos(a) * 240 * dt; e.y += Math.sin(a) * 240 * dt; game.room.collide(e, false); }
      if (Math.random() < 0.5) game.particles.dust(e.x, e.y, 2, 8, 60);
      if (e.oculto <= 0) {
        e.oculto = 0; e.invulnerable = false; e.stun = 0.25;
        this.explodir(e, 70, e.dmg, '255,200,120', 0.01);
      }
    }
  },
  // Traços que tomam o lugar da IA do inimigo neste quadro (true = não chama o think dele)
  conduz(e, dt) {
    if (!e.tracos.includes('kamikaze') || e.oculto > 0) return false;
    const p = game.player, d = dist(e.x, e.y, p.x, p.y);
    if (d > 460 || p.state === 'dead') return false;
    // kamikaze: larga o tiro e corre direto para o herói, piscando
    if (e.telegraph) e.interrupt();
    if (e.state !== 'idle') e.setState('idle');
    e.attackCd = Math.max(e.attackCd, 0.5);
    e.moveToward(p.x, p.y, e.velBase * 1.7, dt, 1400); e.faceToward(p.x, p.y, dt, 12);
    if (Math.random() < dt * 14) game.particles.embers(e.x, e.y, 30, 1, e.T.glow, e.radius, 70);
    if (Math.random() < dt * 3) e.flash = 0.06;
    return true;
  },
  // O golpe corpo a corpo acertou o herói (Enemy.strikePlayer)
  acertou(e, p) {
    if (e.tracos.includes('veneno')) this.efeito(p, 'veneno', e.dmg);
    if (e.tracos.includes('congela')) this.efeito(p, 'congela');
  },
  // Efeitos no herói: veneno (dano ao longo do tempo) e lentidão
  efeito(p, tipo, base = 10) {
    if (tipo === 'veneno') {
      if (!(p.venenoT > 0)) game.texts.spawn(p.x, p.y, 70, 'ENVENENADO', '#a8ff7a', 14, 0.8);
      p.venenoT = 4; p.venenoDps = Math.max(2, base * 0.18) * (1 - (p.stats.resVeneno || 0));   // peças com resistência (js/mundo/arsenal.js)
    } else {
      if (!(p.lentoT > 0)) game.texts.spawn(p.x, p.y, 70, tipo === 'congela' ? 'CONGELANDO' : 'LENTO', '#bfe6ff', 14, 0.8);
      p.lentoT = Math.max(p.lentoT || 0, (tipo === 'congela' ? 2.2 : 1.6) * (1 - (p.stats.resGelo || 0)));
    }
  },
  morreu(e) {
    const T = e.tracos;
    if (T.includes('explode')) this.explodir(e, 90, e.dmg * 1.3, e.T.glow, 0.55);
    if (T.includes('divide') && !e.filhote) {
      for (let k = 0; k < 2; k++) {
        const a = rand(0, TAU), x = e.x + Math.cos(a) * 26, y = e.y + Math.sin(a) * 26;
        if (!game.room.canStand(x, y, 10)) continue;
        const f = criarInimigo(e.variante, x, y, e.level);
        f.filhote = true; f.maxHp = f.hp = Math.max(4, Math.round(e.maxHp * 0.3));
        f.escala = (f.escala || 1) * 0.7; f.radius = Math.max(8, Math.round(f.radius * 0.7)); f.dmg *= 0.6;
        f.tracos = f.tracos.filter((t) => t !== 'divide');
        f.setState('idle'); f.camp = null;
        game.enemies.push(f);
      }
      game.particles.flash(e.x, e.y, 20, 40, e.T.glow, 0.2);
    }
  },
  // Explosão em área: aviso no chão por 'atraso' segundos e o impacto
  explodir(e, r, dmg, rgb, atraso) {
    game.hazards.add({ kind: 'estouro', x: e.x, y: e.y, r, delay: atraso, dmg: Math.round(dmg), rgb });
  },
  // Herói: lentidão e veneno (chamado por Player.update)
  heroi(p, dt) {
    if (p.lentoT > 0) { p.lentoT -= dt; if (Math.random() < dt * 8) game.particles.embers(p.x, p.y, 10, 1, '190,230,255', 14, 40); }
    if (p.venenoT > 0) {
      p.venenoT -= dt;
      if (p.state !== 'dead') p.hp = Math.max(1, p.hp - p.venenoDps * dt);   // o veneno não mata
      if (Math.random() < dt * 8) game.particles.embers(p.x, p.y, 20, 1, '150,255,100', 12, 50);
    }
  },
  lento(p) { return p.lentoT > 0 ? 0.62 : 1; },
};
