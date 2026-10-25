'use strict';
// ECLIPSE ZERO · Mundo aberto: encontros com os acampamentos (Encontros)
// ---------------------------------------------------------------------------
// Os grupos de inimigos (World.camps) ficam no seu lugar, parados ou em patrulha, e só entram na
// luta quando PERCEBEM o herói:
//   - distância: 300 de dia (menos à noite e com pouca visibilidade: WorldTime.senseMult);
//     elites e chefes um pouco mais;
//   - frente: de costas para o herói, só percebem a pouco mais da metade da distância;
//   - linha de visão: colunas, árvores, rochas e cristais escondem (Room.linhaLivre); colado
//     neles (110), sentem mesmo sem ver;
//   - barulho: golpes, esquivas, cargas e tiros fazem ser notado de mais longe; andar devagar
//     (analógico pela metade) faz menos.
// Percebido → ALERTA: o grupo para, vira para o herói e um "!" aparece (0,6 s; elites e chefes
// mais rápidos). Se no fim ele ainda está à vista, a luta começa (World.wake); se sumiu, "?" e
// voltam ao que faziam. Atingido, o grupo acorda na hora.
// Na luta cada um segue a própria IA (js/enemies.js). COLEIRA: com o herói longe demais da casa
// do grupo (pouco mais da metade da zona, até 720; chefes até 980), longe de todos eles ou com
// um deles arrastado longe de casa por 2,5 s, ou sem vê-lo por 4 s, o grupo DESISTE — volta
// para casa recuperando a vida e dorme de novo. Dá para fugir. O barulho da luta (golpes e mortes) deixa
// em alerta os acampamentos vizinhos que tenham linha de visão: encontros puxam encontros.
// Só os acampamentos: ondas de eventos e inimigos de missões continuam como antes.
// ---------------------------------------------------------------------------
const ENCONTRO = {
  VISTA: 300,          // distância de percepção (de dia, herói andando normal)
  PERTO: 110,          // colado: sente mesmo sem ver
  COSTAS: 0.55,        // de costas: fração da distância
  ALERTA: 0.6,         // segundos de alerta antes de atacar (elite e chefe: 0,4)
  COLEIRA: 720,        // distância máxima da casa (chefes: COLEIRA_CHEFE)
  COLEIRA_CHEFE: 980,
  LONGE_T: 2.5,        // segundos longe demais antes de desistir
  PERDE_T: 4,          // segundos sem ver o herói (e longe) antes de desistir
  CURA: 0.3,           // vida recuperada por segundo ao voltar (fração da máxima)
  RUIDO: 360,          // alcance do barulho da luta
};

const Encontros = {
  t: 0,
  // Quanto o herói chama a atenção agora: furtivo (devagar), parado, andando, barulhento
  ruido(p) {
    const st = p.state;
    if (st === 'attack' || st === 'charge' || st === 'special' || st === 'dash' || st === 'plunge') return 1.35;
    if (st === 'run') return p.moveSpeed < p.baseSpeed * 0.55 ? 0.62 : 1;
    return 0.8;
  },
  chefe(c) { return !!(c.def && c.def.boss) || !!c.chefeMissao; },
  // Um inimigo do grupo percebe o herói?
  percebe(e, p, c) {
    if (!e.alive || e.state === 'dying') return false;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d < ENCONTRO.PERTO) return true;
    let alc = ENCONTRO.VISTA * WorldTime.senseMult() * this.ruido(p) * (e.elite ? 1.2 : 1) * (this.chefe(c) ? 1.15 : 1);
    if (Math.abs(angleDiff(e.facing || 0, Math.atan2(p.y - e.y, p.x - e.x))) > 1.2) alc *= ENCONTRO.COSTAS;
    return d < alc && e.vejo(p);
  },
  // Casa de cada um (onde volta a dormir): o lugar de origem ou, na patrulha, o ponto atual
  casa(e) {
    const P = e.patrulha;
    if (P) { const q = P.pts[(e.pi || 0) % P.pts.length]; return { x: q.x + e.pOff.x, y: q.y + e.pOff.y }; }
    if (!e.casa) e.casa = { x: e.x, y: e.y };
    return e.casa;
  },
  fase(c) { return c.fase || (c.awake ? 'luta' : 'calmo'); },

  // ------------------------------------------------------------------ por quadro (World.update)
  update(dt) {
    const p = game.player;
    this.t += dt;
    const olhar = this.t >= 0.1;   // percepção 10 vezes por segundo (leve)
    if (olhar) this.t = 0;
    for (const c of World.camps) {
      if (c.patrulha && !c.awake) { const e = c.enemies.find((q) => q.alive); if (e) { c.x = e.x; c.y = e.y; } }   // o acampamento anda com a patrulha
      const vivos = c.enemies.filter((q) => q.alive && q.state !== 'dying');
      if (!vivos.length) continue;
      const f = this.fase(c);
      if (f === 'calmo') {
        if (c.esperaT > 0) { c.esperaT -= dt; continue; }
        if (olhar && p.state !== 'dead' && vivos.some((e) => this.percebe(e, p, c))) this.alertar(c, vivos);
      } else if (f === 'alerta') {
        c.alertaT -= dt;
        if (c.alertaT <= 0) {
          const ve = p.state !== 'dead' && vivos.some((e) => dist(e.x, e.y, p.x, p.y) < ENCONTRO.VISTA * 1.4 && (e.vejo(p) || dist(e.x, e.y, p.x, p.y) < ENCONTRO.PERTO));
          if (ve) World.wake(vivos[0]);
          else this.acalmar(c, vivos, '?');
        }
      } else if (f === 'luta') this.coleira(c, vivos, p, dt);
      else if (f === 'volta') this.voltando(c, vivos, dt);
    }
  },
  // Percebeu: param, viram e o "!" aparece; colado ou já atingido, a luta começa sem espera
  alertar(c, vivos, motivo = '!') {
    c.fase = 'alerta';
    c.alertaT = this.chefe(c) || vivos.some((e) => e.elite) ? 0.4 : ENCONTRO.ALERTA;
    for (const e of vivos) { e.marca = motivo; e.marcaT = 1.1; }
    game.audio.play('telegraph', 0.5);
  },
  acalmar(c, vivos, marca) {
    c.fase = 'calmo'; c.awake = false; c.esperaT = 1.2;
    for (const e of vivos) { e.dormant = true; if (marca) { e.marca = marca; e.marcaT = 1.2; } }
  },
  // Acordou (World.wake): guarda a casa do grupo e zera as contas da coleira
  acordou(c) {
    c.fase = 'luta'; c.longeT = 0; c.semVerT = 0;
    if (!c.casa) c.casa = { x: c.x, y: c.y };
    for (const e of c.enemies) { this.casa(e); e.voltando = false; e.hpCalmo = undefined; if (e.marca !== '!') { e.marca = '!'; e.marcaT = 0.7; } }
  },
  // Até onde o grupo persegue: COLEIRA (chefes mais), limitada a pouco mais da metade da zona
  // (um campo aberto tem ~1180 de lado: fugir para o outro lado basta)
  limite(c) {
    const R = game.room, base = this.chefe(c) ? ENCONTRO.COLEIRA_CHEFE : ENCONTRO.COLEIRA;
    return R ? clamp(Math.max(R.w, R.h) * (this.chefe(c) ? 0.75 : 0.55), 460, base) : base;
  },
  // Coleira: o herói (ou um deles) longe demais da casa, o herói longe de todos, ou fora de vista
  // por um tempo → desiste
  coleira(c, vivos, p, dt) {
    const H = c.casa || c, lim = this.limite(c);
    let perto = 1e9, ve = false, solto = false;
    for (const e of vivos) {
      perto = Math.min(perto, dist(e.x, e.y, p.x, p.y));
      if (!ve && e.vejo(p)) ve = true;
      if (dist(e.x, e.y, H.x, H.y) > lim + 120) solto = true;
    }
    c.longeT = dist(p.x, p.y, H.x, H.y) > lim || solto || perto > lim * 0.8 ? (c.longeT || 0) + dt : 0;
    c.semVerT = !ve && perto > 380 ? (c.semVerT || 0) + dt : 0;
    if (c.longeT > ENCONTRO.LONGE_T || c.semVerT > ENCONTRO.PERDE_T) this.desistir(c, vivos);
  },
  desistir(c, vivos) {
    c.fase = 'volta'; c.awake = false; c.voltaT = 0;
    for (const e of vivos) {
      e.interrupt(); e.telegraph = null;
      if (e.state !== 'stun') e.setState('idle');
      e.dormant = true; e.voltando = true; e.hpCalmo = e.hp;
      e.marca = '?'; e.marcaT = 1.3;
    }
    if (game.hud && game.hud.toast) game.hud.toast('O grupo desistiu e voltou ao acampamento', '170,190,210');
  },
  // Voltando: anda para casa recuperando a vida; todos em casa (ou 7 s), dormem de novo
  voltando(c, vivos, dt) {
    c.voltaT += dt;
    let todos = true;
    for (const e of vivos) {
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * ENCONTRO.CURA * dt); e.hpCalmo = e.hp;
      const H = this.casa(e);
      if (dist(e.x, e.y, H.x, H.y) > 22) todos = false;
    }
    if (todos || c.voltaT > 7) {
      for (const e of vivos) { e.hp = e.maxHp; e.voltando = false; e.hpCalmo = undefined; }
      this.acalmar(c, vivos, null);
    }
  },
  // Barulho da luta em (x, y): acampamentos calmos por perto, com linha de visão, ficam em alerta
  barulho(x, y, raio = ENCONTRO.RUIDO) {
    if (!World.camps) return;
    for (const c of World.camps) {
      if (this.fase(c) !== 'calmo' || c.esperaT > 0) continue;
      const vivos = c.enemies.filter((q) => q.alive && q.state !== 'dying');
      if (vivos.some((e) => dist2(e.x, e.y, x, y) < raio * raio && game.room.linhaLivre(e.x, e.y, x, y, -4))) this.alertar(c, vivos);
    }
  },

  // ------------------------------------------------------------------ cada inimigo (Enemy.update)
  // Dormindo: parado, em patrulha, em alerta (vira para o herói) ou voltando para casa
  calmo(e, dt) {
    const c = e.camp, f = c ? this.fase(c) : 'calmo', p = game.player;
    if (f === 'alerta') { e.brake(dt, 10); e.faceToward(p.x, p.y, dt, 9); return; }
    if (e.voltando) {
      const H = this.casa(e);
      if (dist(e.x, e.y, H.x, H.y) > 18) { e.moveToward(H.x, H.y, e.speed * 1.1, dt, 600); e.faceToward(H.x, H.y, dt, 6); }
      else e.brake(dt, 10);
      return;
    }
    const P = e.patrulha;
    if (P) {
      const q = P.pts[e.pi % P.pts.length], tx = q.x + e.pOff.x, ty = q.y + e.pOff.y;
      if (dist(e.x, e.y, tx, ty) < 26) e.pi++;
      e.moveToward(tx, ty, e.speed * 0.35, dt, 300); e.faceToward(tx, ty, dt, 4);
    } else {
      e.brake(dt, 8);
      // parado olhando em volta (devagar), não sempre para o mesmo lado
      e.olharT = (e.olharT || rand(2, 5)) - dt;
      if (e.olharT <= 0) { e.olharT = rand(3, 6); e.olharA = (e.facing || 0) + rand(-1.4, 1.4); }
      if (e.olharA !== undefined) e.facing = angleLerp(e.facing || 0, e.olharA, 1 - Math.exp(-1.5 * dt));
    }
  },

  // "!" (percebeu) ou "?" (perdeu o herói) sobre a cabeça; desenhado com as barras de vida
  desenharMarca(ctx, e) {
    if (!(e.marcaT > 0) || !e.marca) return;
    const sx = isoX(e.x, e.y), sy = isoY(e.x, e.y) - e.z - e.height * (e.elite ? 1.18 : 1) - 34;
    const k = Math.min(1, e.marcaT / 0.25), pop = e.marca === '!' ? 1 + Math.max(0, e.marcaT - 0.85) * 1.6 : 1;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.font = `bold ${Math.round(22 * pop)}px ${FONT_TITLE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(e.marca, sx, sy);
    ctx.fillStyle = e.marca === '!' ? (e.elite || e.worldBoss ? '#ffb43a' : '#ff5a4a') : '#b8c6d8';
    ctx.fillText(e.marca, sx, sy);
    ctx.restore();
  },
};
