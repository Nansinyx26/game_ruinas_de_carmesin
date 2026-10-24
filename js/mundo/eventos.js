'use strict';
// ECLIPSE ZERO · Mundo aberto: eventos dinâmicos das regiões e o desafio da arena (Eventos)
// ---------------------------------------------------------------------------
// De tempos em tempos (2 a 4 minutos de jogo no mundo) começa um EVENTO numa zona já
// descoberta da região onde o herói está (fora da zona de chegada, da zona do chefe e das
// masmorras). Ele aparece no mapa (⚔), no quadro de missão e num aviso, e dura algumas horas
// do mundo se ninguém for até lá. Tipos:
//   incursão   inimigos tomam um ponto: três ondas em volta do estandarte
//   caravana   uma caravana cercada perde vida enquanto houver inimigos perto dela
//   chuva      fragmentos caem do céu: colete seis antes que o evento acabe
//   caçador    uma elite com nome patrulha a zona
// O treinador também começa o DESAFIO DA ARENA (três ondas em 90 segundos, ali mesmo).
// Concluir dá experiência, células, materiais e reputação, e conta para as missões de evento
// (js/mundo/aventuras.js). Sair da zona no meio recomeça a incursão e a caravana.
// Estado: World.state.eventos = { atual, feitos: { região: n } }.
// ---------------------------------------------------------------------------
const WORLD_EVENTOS = {
  incursao: { nome: 'Incursão', rgb: '255,120,90', desc: 'Inimigos tomaram um ponto de {z}. Segure a posição por três ondas.' },
  caravana: { nome: 'Caravana atacada', rgb: '255,200,110', desc: 'Uma caravana foi cercada em {z}. Salve-a antes que caia.' },
  chuva: { nome: 'Chuva de fragmentos', rgb: '150,220,255', desc: 'Fragmentos caem do céu sobre {z}. Colete seis.' },
  cacador: { nome: 'Caçador errante', rgb: '255,90,140', desc: 'Uma elite com nome caça em {z}. Encontre-a e derrube-a.' },
  desafio: { nome: 'Desafio da arena', rgb: '255,212,122', desc: 'Três ondas em 90 segundos.' },
};
const WORLD_CACADORES = ['O ERRANTE', 'SOMBRA DA ESTRADA', 'MÃO DE FERRO', 'OLHO VERMELHO', 'A ÚLTIMA PATRULHA'];

// Estandarte da incursão, carroça da caravana e fragmentos caídos
class EventoProp extends WorldProp {
  constructor(sub, x, y, data) {
    super('evento', x, y, data);
    this.sub = sub; this.lightRgb = sub === 'fragmento' ? '150,220,255' : sub === 'carroca' ? '255,200,110' : '255,120,90';
    this.name = { estandarte: 'ESTANDARTE', carroca: 'CARAVANA', fragmento: 'FRAGMENTO CAÍDO' }[sub];
    this.verb = 'Coletar'; this.height = sub === 'carroca' ? 30 : 16;
    this.flat = sub === 'fragmento';
    if (sub === 'carroca') { this.maxHp = this.hp = data.hp; this.hitT = 0; this.radius = 22; }
  }
  canTalk() { return this.sub === 'fragmento' && !this.feito; }
  talk() { Eventos.coletar(this); }
  update(dt) { this.t += dt; if (this.hitT > 0) this.hitT -= dt; }
  draw(ctx) {
    if (this.feito) return;
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), rgb = this.lightRgb;
    ctx.save();
    if (this.sub === 'estandarte') {
      ctx.fillStyle = '#1a1418'; ctx.fillRect(sx - 2, sy - 70, 4, 70);
      const w = Math.sin(this.t * 3) * 3;
      ctx.fillStyle = rgba(rgb, 0.85); ctx.beginPath(); ctx.moveTo(sx + 2, sy - 68); ctx.lineTo(sx + 30 + w, sy - 60); ctx.lineTo(sx + 2, sy - 48); ctx.closePath(); ctx.fill();
    } else if (this.sub === 'carroca') {
      const fl = this.hitT > 0 ? 0.4 : 0;
      ctx.fillStyle = fl ? '#5a2a2a' : '#3a2c20'; ctx.strokeStyle = rgba(rgb, 0.7); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx - 26, sy - 8); ctx.lineTo(sx, sy + 4); ctx.lineTo(sx + 26, sy - 8); ctx.lineTo(sx + 26, sy - 26); ctx.lineTo(sx, sy - 14); ctx.lineTo(sx - 26, sy - 26); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c8b898'; ctx.beginPath(); ctx.moveTo(sx - 24, sy - 26); ctx.quadraticCurveTo(sx, sy - 52, sx + 24, sy - 26); ctx.lineTo(sx, sy - 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#15110c'; for (const dx of [-16, 16]) { ctx.beginPath(); ctx.ellipse(sx + dx, sy - 2, 6, 7, 0, 0, TAU); ctx.fill(); }
    } else {
      const y = sy - 10 + Math.sin(this.t * 3) * 2;
      ctx.fillStyle = rgba(rgb, 0.9); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, y - 9); ctx.lineTo(sx + 5, y); ctx.lineTo(sx, y + 6); ctx.lineTo(sx - 5, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  drawEmissive(ctx) {
    if (this.feito) return;
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, this.lightRgb, sx, sy - (this.sub === 'estandarte' ? 58 : 12), this.sub === 'fragmento' ? 22 : 46, 0.35 + 0.12 * Math.sin(this.t * 4));
    ctx.restore();
    if (this.sub !== 'carroca') return;
    const w = 60, k = clamp(this.hp / this.maxHp, 0, 1);
    ctx.save();
    ctx.fillStyle = 'rgba(3,7,16,0.85)'; ctx.fillRect(sx - w / 2 - 1, sy - 64, w + 2, 7);
    ctx.fillStyle = k > 0.35 ? '#ffd47a' : '#ff5c7a'; ctx.fillRect(sx - w / 2, sy - 63, w * k, 5);
    ctx.restore();
  }
}

const Eventos = {
  prox: 150,       // segundos até o próximo evento
  alvo: [],        // inimigos da onda atual
  get S() { const W = World.state; if (!W.eventos) W.eventos = {}; const E = W.eventos; E.feitos = E.feitos || {}; if (E.atual === undefined) E.atual = null; return E; },
  ativo() { return this.S.atual; },
  feitos(reg) { return this.S.feitos[reg] || 0; },
  agora() { return ((World.state.dia || 1) - 1) * 24 + WorldTime.hora(); },
  def(A) { return WORLD_EVENTOS[A.tipo]; },
  // Sorteia um evento numa zona descoberta da região atual (com o herói nela, de preferência)
  sortear(tipo = null, zona = null) {
    const z0 = World.zone;
    if (!z0 || z0.instancia || this.S.atual) return null;
    const reg = z0.region, ok = (z) => !z.hub && !z.instancia && !(z.camps || []).some((c) => c.boss) && World.state.descobertos.includes(z.id);
    const cand = worldZonesOf(reg).filter(ok);
    if (!cand.length && !zona) return null;
    const z = zona ? WORLD_ZONES[zona] : ok(z0) && Math.random() < 0.5 ? z0 : pick(cand);
    const t = tipo || pick(['incursao', 'caravana', 'chuva', 'cacador']);
    const A = this.S.atual = { tipo: t, reg, zona: z.id, fase: 'espera', fim: this.agora() + 8, onda: 0, prog: 0, col: [], at: [rand(0.32, 0.68), rand(0.32, 0.68)] };
    game.hud.toast(`EVENTO · ${this.def(A).nome} em ${z.name} (mapa: M)`, this.def(A).rgb);
    game.audio.play('spawn');
    if (World.zone.id === z.id) this.montar();
    return A;
  },
  // Desafio da arena (treinador): começa aqui mesmo
  desafio(npc) {
    if (this.S.atual) return false;
    const A = this.S.atual = { tipo: 'desafio', reg: World.zone.region, zona: World.zone.id, fase: 'ativo', tempo: 90, onda: 0, prog: 0, col: [], at: null };
    const p = game.player;
    A.x = p.x; A.y = p.y;
    game.hud.message('DESAFIO DA ARENA', '3 ONDAS · 90 SEGUNDOS', 2, false, true);
    this.alvo = [];
    this.onda(A);
    return true;
  },
  mobs(A) {
    const lv = World.zone.lv, alvos = WORLD_CONTRATO_ALVOS[A.reg] || ['rastejador'], n = 3 + Math.floor(lv / 10) + A.onda, m = {};
    for (let i = 0; i < n; i++) { const t = alvos[(i + A.onda) % alvos.length]; m[t] = (m[t] || 0) + 1; }
    return m;
  },
  // Uma onda em volta do ponto do evento
  onda(A) {
    const g = game, R = g.room, cx = A.x, cy = A.y, M = this.mobs(A);
    this.alvo = [];
    let i = 0;
    for (const t in M) for (let k = 0; k < M[t]; k++, i++) {
      const a = i * 2.39996 + A.onda, r = 170 + (i % 3) * 40;
      let x = clamp(cx + Math.cos(a) * r, 40, R.w - 40), y = clamp(cy + Math.sin(a) * r, 40, R.h - 40);
      if (!R.canStand(x, y, 20)) { x = cx; y = cy; }
      const e = World.criarNaZona(t, x, y);
      e.dormant = false; e.camp = null; e.evento = true;
      g.enemies.push(e); this.alvo.push(e);
      g.particles.ring(e.x, e.y, 40, e.T.glow, 0.4, 4);
    }
    g.hud.message(`ONDA ${A.onda + 1}/3`, this.def(A).nome.toUpperCase(), 1.4, true);
    g.audio.play('spawn');
  },
  // Objetos do evento na zona (ao carregar a zona ou ao começar com o herói nela)
  montar() {
    const A = this.S.atual, g = game, R = g.room;
    if (!A || !World.zone || World.zone.id !== A.zona) return;
    if (A.tipo === 'desafio') { this.falhar('Desafio interrompido'); return; }
    const pt = npcSpot(R, A.at[0], A.at[1]);
    A.x = pt.x; A.y = pt.y;
    if (A.fase === 'ativo' && (A.tipo === 'incursao' || A.tipo === 'caravana')) { A.fase = 'espera'; A.onda = 0; }   // saiu no meio: recomeça
    this.alvo = [];
    if (A.tipo === 'incursao') g.npcs.push(new EventoProp('estandarte', pt.x, pt.y, {}));
    else if (A.tipo === 'caravana') { const c = new EventoProp('carroca', pt.x, pt.y, { hp: 200 + World.zone.lv * 8 }); this.carroca = c; g.npcs.push(c); }
    else if (A.tipo === 'chuva') {
      A.fase = 'ativo';
      const rr = mulberry32((A.zona.length * 977 + (World.state.dia || 1)) >>> 0);
      for (let k = 0; k < 8; k++) {
        if (A.col.includes(k)) continue;
        const q = npcSpot(R, 0.12 + 0.76 * rr(), 0.12 + 0.76 * rr());
        g.npcs.push(new EventoProp('fragmento', q.x, q.y, { k }));
      }
    } else if (A.tipo === 'cacador') {
      const e = World.criarNaZona((WORLD_CONTRATO_ALVOS[A.reg] || ['cacador'])[0], pt.x, pt.y);
      e.makeElite(); e.maxHp = e.hp = Math.round(e.maxHp * 1.8); e.escala = (e.escala || 1) * 1.15;
      e.chefeNome = e.name = A.nome || (A.nome = pick(WORLD_CACADORES)); e.eventoCacador = true;
      const camp = { def: { mobs: {} }, enemies: [e], awake: false, x: pt.x, y: pt.y, chefeMissao: e.name };
      const pts = [pt, npcSpot(R, clamp(A.at[0] + 0.25, 0.12, 0.88), A.at[1]), npcSpot(R, A.at[0], clamp(A.at[1] + 0.25, 0.12, 0.88))];
      camp.patrulha = { pts }; e.patrulha = camp.patrulha; e.pi = 0; e.pOff = { x: 0, y: 0 };
      e.dormant = true; e.camp = camp; e.setState('idle');
      g.enemies.push(e); World.camps.push(camp);
    }
  },
  limpar() { game.npcs = game.npcs.filter((n) => !(n instanceof EventoProp)); this.carroca = null; this.alvo = []; },
  update(dt) {
    const z = World.zone;
    if (!z) return;
    const A = this.S.atual;
    if (!A) {
      if (z.instancia) return;
      if ((this.prox -= dt) <= 0) { this.prox = rand(130, 240); this.sortear(); }
      return;
    }
    if (A.fase === 'espera' && A.tipo !== 'desafio' && this.agora() > A.fim) {
      game.hud.toast(`O evento terminou sem você · ${this.def(A).nome}`, '200,214,235');
      this.S.atual = null; if (z.id === A.zona) this.limpar();
      return;
    }
    if (z.id !== A.zona) return;
    const p = game.player, vivos = this.alvo.some((e) => e.alive && e.state !== 'dying');
    if (A.tipo === 'desafio') {
      if ((A.tempo -= dt) <= 0) { this.falhar('O tempo acabou'); return; }
      if (!vivos) { if (A.onda >= 2) this.concluir(); else { A.onda++; this.onda(A); } }
      return;
    }
    if (A.tipo === 'incursao') {
      if (A.fase === 'espera') { if (dist2(p.x, p.y, A.x, A.y) < 280 * 280) { A.fase = 'ativo'; A.onda = 0; this.onda(A); } return; }
      if (!vivos) { if (A.onda >= 2) this.concluir(); else { A.onda++; this.onda(A); } }
    } else if (A.tipo === 'caravana') {
      const c = this.carroca;
      if (!c) return;
      if (A.fase === 'espera') {
        if (dist2(p.x, p.y, c.x, c.y) < 320 * 320) { A.fase = 'ativo'; A.onda = 1; this.onda(A); game.hud.message('CARAVANA CERCADA', 'DERROTE OS ATACANTES', 1.6, true); }
        return;
      }
      let n = 0;
      for (const e of game.enemies) if (e.alive && e.state !== 'dying' && !e.dormant && dist2(e.x, e.y, c.x, c.y) < 130 * 130) n++;
      if (n) { c.hp -= n * 3 * dt; if (c.hitT <= 0) { c.hitT = 0.5; game.particles.sparks(c.x, c.y, 26, rand(0, TAU), 4, '255,140,90', 160, 1); } }
      if (c.hp <= 0) { this.falhar('A caravana caiu'); return; }
      if (!vivos) this.concluir();
    }
  },
  coletar(prop) {
    const A = this.S.atual;
    if (!A || prop.feito) return;
    prop.feito = true;
    A.col.push(prop.data.k); A.prog++;
    game.particles.sparks(prop.x, prop.y, 12, -Math.PI / 2, 12, prop.lightRgb, 220, Math.PI);
    game.audio.play('soul');
    Oficios.dar(Math.random() < 0.3 ? 'cristal' : WORLD_MAT_REG[A.reg], 1);
    game.stats.soulsBank += 3 + Math.round(World.zone.lv * 0.6);
    if (A.prog >= 6) this.concluir();
    else game.hud.toast(`Fragmentos ${A.prog}/6`, prop.lightRgb);
  },
  onKill(e) { if (e.eventoCacador) this.concluir(); },
  concluir() {
    const A = this.S.atual, g = game, p = g.player, z = World.zone;
    if (!A) return;
    this.S.atual = null;
    this.S.feitos[A.reg] = this.feitos(A.reg) + 1;
    g.hud.message('EVENTO CONCLUÍDO', this.def(A).nome.toUpperCase(), 2.4, false, true);
    g.audio.play('upgrade');
    const lv = z.lv;
    g.gainXP(lv * 40, p.x, p.y);
    g.stats.soulsBank += 10 + lv * 4;
    Oficios.dar(WORLD_MAT_REG[A.reg], 2);
    if (Math.random() < 0.35) Oficios.dar('nucleo', 1);
    Oficios.ganharRep(A.reg, A.tipo === 'desafio' ? 20 : 40);
    g.hud.toast(`Recompensa: ${lv * 40} XP · ${10 + lv * 4} células`, this.def(A).rgb);
    if (A.tipo === 'desafio') Oficios.darCons('tonico', 1);
    this.limpar();
    Aventuras.aoEvento(A.reg);
    World.save();
  },
  falhar(motivo) {
    const A = this.S.atual;
    if (!A) return;
    this.S.atual = null;
    game.hud.message('EVENTO FALHOU', motivo.toUpperCase(), 2.2, true);
    game.audio.play('uiDeny');
    this.limpar();
  },
  // Linha do quadro de missão e marca no mapa
  linha() {
    const A = this.S.atual;
    if (!A || !World.zone || A.reg !== World.zone.region) return '';
    const z = WORLD_ZONES[A.zona];
    if (A.tipo === 'desafio') return `⚔ Desafio: onda ${A.onda + 1}/3 · ${Math.ceil(A.tempo)}s`;
    if (A.tipo === 'chuva' && World.zone.id === A.zona) return `⚔ Chuva de fragmentos: ${A.prog}/6`;
    if (A.tipo === 'incursao' && A.fase === 'ativo') return `⚔ Incursão: onda ${A.onda + 1}/3`;
    return `⚔ ${this.def(A).nome} em ${z.name}`;
  },
  marcasMapa() { const A = this.S.atual; return A && A.tipo !== 'desafio' ? [{ zona: A.zona, icon: '⚔', rgb: this.def(A).rgb, nome: this.def(A).nome }] : []; },
};
