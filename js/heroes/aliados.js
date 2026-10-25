'use strict';
// ECLIPSE ZERO · Habilidades, passivas e técnicas das árvores do Drakos, da Sera e do Orion (AllyFx)
// ---------------------------------------------------------------------------
// Os nós que antes só apareciam na árvore passam a ter efeito:
//   ATIVAS (ABILITIES.<id do nó>): Muralha Viva, Onda do Martelo, Grito de Guerra (Drakos);
//     Sentinela Fixa, Pulso Repulsor, Apagão, Injeção Estimulante (Sera); Bomba de Fumaça e
//     Leque de Lâminas (Orion). As ativas da ficha (Campo de Força, Hack, Drone, Lâmina) são
//     achadas pelo 'ability' do nó (Player.abilityInfo).
//   PASSIVAS (HERO_PASSIVES, js/heroes/passivas.js): Bloqueio Perfeito, Escudo Refletor, Sem Freio;
//     Enxame, Domo Condutor, Matriz Estável, Arquivo 0-ZERO; Há Três Dias, Ricochete, Marca do Alvo.
//   TÉCNICAS (TECH_UPGRADES em js/combat.js): os golpes novos chamam as funções daqui no início
//     da fase ativa (onStart).
// Efeitos que duram ficam em p.buffs (muralha, grito, injecao, apagao) e são tocados por
// AllyFx.tick (Player.updateAbilities); objetos no chão (torreta, fumaça, machado, onda) usam
// HeroObjects (js/heroes/kit.js).
// ---------------------------------------------------------------------------
const AllyFx = {
  // nível do nó na árvore do personagem em campo (0 = não aprendido)
  lv(p, id) {
    if (!p || !p.def || id.indexOf(heroBase(p.def.id) + '_') !== 0) return 0;
    const pr = heroProgressOf(p);
    return pr && pr.lv ? pr.lv(id) || 0 : 0;
  },

  // ------------------------------------------------------------------ técnicas
  // dano da técnica pelo nível do nó: [nível 1, nível 2]; derruba só no nível 2 (lv2Launch)
  tecnica(p, a, id, dmgs, lv2Launch) {
    const l = Math.max(1, this.lv(p, id)), d = a.def;
    a.mult *= dmgs[Math.min(l, dmgs.length) - 1] / d.dmg;
    if (lv2Launch) a.launchMult = l >= 2 ? 1 : 0;
    return l;
  },
  // Esquiva → Pesado (Drakos): o machado voa até 380 e volta à mão
  arremesso(p, a) {
    const l = Math.max(1, this.lv(p, 'drakos_arremesso')), dmg = (l >= 2 ? 90 : 70) * p.stats.dmgMult;
    const dir = a.dir, R = 380, T = 0.62;
    const hitOut = new Set(), hitBack = new Set();
    HeroObjects.add({
      x: p.x, y: p.y, z: 34, t: 0, spin: 0,
      update(dt) {
        this.t += dt; this.spin += dt * 22;
        const k = this.t / T;
        if (k >= 1) return false;
        // ida e volta: até R na direção do arremesso e de volta a quem lançou
        const out = k < 0.5, s = out ? Math.sin(k * Math.PI) : Math.sin(k * Math.PI);
        if (out) { this.x = p.x + Math.cos(dir) * R * s; this.y = p.y + Math.sin(dir) * R * s; }
        else { this.x = lerp(this.x, p.x, Math.min(1, dt * 9)); this.y = lerp(this.y, p.y, Math.min(1, dt * 9)); }
        const set = out ? hitOut : hitBack;
        if (out || l >= 2) heroInRadius(this.x, this.y, 46, (e, d, kx, ky) => {
          if (set.has(e)) return;
          set.add(e);
          const c = Math.random() < p.stats.crit;
          heroStrike(e, dmg * p.targetMult(e) * (c ? 2 : 1) * (out ? 1 : 0.7), c, PROJ_HIT_DEF, kx, ky, { kb: 320, stun: 0.5, heavy: true });
        });
        if (Math.random() < dt * 30) game.particles.sparks(this.x, this.y, this.z, rand(0, TAU), 1, '255,90,80', 200, Math.PI);
        return true;
      },
      draw(ctx) {
        const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y) - this.z;
        GlowCache.draw(ctx, '255,46,61', sx, sy, 30, 0.7);
        ctx.strokeStyle = 'rgba(255,190,190,0.9)'; ctx.lineWidth = 3;
        for (let i = 0; i < 2; i++) {
          const q = this.spin + i * Math.PI;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(q) * 16, sy + Math.sin(q) * 9); ctx.stroke();
        }
      },
    });
    game.audio.play('swingHeavy');
  },
  // L L H (Sera): o drone mergulha no alvo e o eletrocuta
  ordemAtaque(p, a) {
    const l = Math.max(1, this.lv(p, 'sera_ordem_ataque'));
    const e = heroNearest(p.x + Math.cos(a.dir) * 140, p.y + Math.sin(a.dir) * 140, 380);
    if (!e) { game.hud.toast('Nenhum alvo para o drone'); return; }
    const x0 = p.x + Math.cos(p._droneAng || 0) * 42, y0 = p.y + Math.sin(p._droneAng || 0) * 42;
    HeroObjects.add({
      t: 0, x: x0, y: y0, z: 40,
      update(dt) {
        this.t += dt;
        const k = Math.min(1, this.t / 0.22);
        this.x = lerp(x0, e.x, k); this.y = lerp(y0, e.y, k); this.z = 40 - 20 * k;
        if (k < 1) return true;
        if (e.canBeHit()) {
          const c = Math.random() < p.stats.crit, dmg = (l >= 2 ? 65 : 50) * p.stats.dmgMult * p.targetMult(e) * (c ? 2 : 1);
          heroStrike(e, dmg, c, PROJ_HIT_DEF, 0, 0, { kb: 160, stun: 0.5, shock: true });
          if (l >= 2) heroStunMachine(e, 1);
          game.arcs.crackle(e.x, e.y, 30, 4, 50, '40,255,220', 0.2);
        }
        game.particles.flash(this.x, this.y, 30, 50, '120,255,235', 0.15);
        game.audio.play('zap');
        return false;
      },
      draw(ctx) { GlowCache.draw(ctx, '40,255,220', isoX(this.x, this.y), isoY(this.x, this.y) - this.z, 22, 0.8); },
    });
  },
  // L L L (Sera): o orbe descarrega no alvo (nível 2: salta para outra máquina)
  sobrecarga(p, a) {
    const l = Math.max(1, this.lv(p, 'sera_sobrecarga_remota')), base = (l >= 2 ? 49 : 37) * p.stats.dmgMult;
    const e = heroNearest(p.x + Math.cos(a.dir) * 120, p.y + Math.sin(a.dir) * 120, 330);
    if (!e) return;
    const zap = (from, to, k) => {
      game.arcs.spawn(from.x, from.y, 36, to.x, to.y, Math.min(to.height * 0.5, 40) + to.z, { w: 2.4, life: 0.2, rgb: '40,255,220' });
      const c = Math.random() < p.stats.crit;
      heroStrike(to, base * k * p.targetMult(to) * (c ? 2 : 1), c, PROJ_HIT_DEF, 0, 0, { kb: 120, stun: 0.45, shock: true });
    };
    zap(p, e, 1);
    if (l >= 2) {
      const e2 = heroNearest(e.x, e.y, 220, (o) => o !== e && o.T && o.T.mech);
      if (e2) zap(e, e2, 0.75);
    }
  },
  // Esquiva → Leve (Orion): reaparece atrás do inimigo mais próximo e corta (sempre crítico)
  passoSombra(p, a) {
    const l = Math.max(1, this.tecnica(p, a, 'orion_passo_sombra', [50, 65]));
    const e = heroNearest(p.x, p.y, 320);
    if (e) {
      const f = e.facing || 0, x0 = p.x, y0 = p.y;
      p.x = e.x - Math.cos(f) * (e.radius + 30); p.y = e.y - Math.sin(f) * (e.radius + 30);
      game.room.collide(p, true);
      a.dir = p.facing = Math.atan2(e.y - p.y, e.x - p.x);
      if (p.trailGhosts) p.trailGhosts(x0, y0, p.x, p.y, a.dir);
      game.particles.smoke(x0, y0, 10, 6, '20,16,24', 14);
    }
    if (l >= 2) p.dashStock = p.stats.dashCharges;
  },

  // ------------------------------------------------------------------ passivas com gancho próprio
  // Bloqueio Perfeito: escudo erguido há menos de 0,35 s devolve o golpe num empurrão
  onBlock(p, sx, sy) {
    const l = this.lv(p, 'drakos_bloqueio');
    if (!l || !(p.animTime - (p._escudoT || -9) < 0.35)) return;
    const e = heroNearest(sx, sy, 90);
    if (!e) return;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    heroStrike(e, (l >= 2 ? 60 : 45) * p.stats.power * p.targetMult(e), true, ABILITY_DEF, dx / d, dy / d, { kb: 520, stun: l >= 2 ? 1 : 0.5, heavy: true });
    game.texts.spawn(p.x, p.y, 80, 'BLOQUEIO PERFEITO', '#ff9a8a', 16, 0.8);
    game.camera.shake(0.2);
  },
  // Escudo Refletor: projétil que bate no escudo frontal volta contra quem atirou
  reflectShot(pl, pr) {
    const l = this.lv(pl, 'drakos_refletor');
    if (!l || !(pl.buffs.drakosShield > 0)) return false;
    if (Math.abs(angleDiff(pl.facing, Math.atan2(pr.y - pl.y, pr.x - pl.x))) >= 1.6) return false;
    const P = game.projectiles, i = P.items.indexOf(pr);
    if (i < 0 || i >= P.count) return false;
    P.reflect(i, l >= 2 ? 1 : 0.5);
    game.audio.play('deflect');
    return true;
  },
  // Devolve (mult) todos os projéteis hostis dentro do raio
  reflectInRadius(x, y, R, mult) {
    const P = game.projectiles;
    for (let i = P.count - 1; i >= 0; i--) {
      const q = P.items[i];
      if (q.hostile && dist2(q.x, q.y, x, y) < R * R) P.reflect(i, mult);
    }
  },
  // Campo de Força: domo onde foi lançado (com a Matriz Estável, acompanha a Sera e reflete)
  field(p) {
    const F = this._F || (this._F = { x: 0, y: 0, r: 130, reflete: false });
    const m = this.lv(p, 'sera_matriz') > 0;
    F.x = m || p.forceFieldX === undefined ? p.x : p.forceFieldX;
    F.y = m || p.forceFieldY === undefined ? p.y : p.forceFieldY;
    F.r = p.forceFieldR || 130; F.reflete = m;
    return F;
  },
  // Marca do Alvo: o próximo crítico num inimigo marcado causa mais dano
  critMod(p, e, dmg, crit) {
    if (crit && e._marcaT > 0) {
      const l = this.lv(p, 'orion_marca');
      if (l) { e._marcaT = 0; game.texts.spawn(e.x, e.y, (e.height || 40) + 40, 'MARCA', '#ffb852', 14, 0.7); return dmg * (1 + 0.3 * l); }
    }
    return dmg;
  },
  // Inimigo na fumaça: persegue um ponto falso perto dele (perdeu o alvo)
  alvoFalso(e) {
    const f = e._falso || (e._falso = { x: 0, y: 0, vx: 0, vy: 0, radius: 10, state: 'idle' });
    const q = (e._cegoQ = (e._cegoQ || rand(0, TAU)) + 0.02);
    f.x = e.x + Math.cos(q) * 140; f.y = e.y + Math.sin(q) * 140;
    return f;
  },

  // ------------------------------------------------------------------ multiplicadores dos efeitos ativos
  dealt(p, e) {
    let m = 1;
    if (p.buffs.grito > 0) m *= 1 + 0.2 * (p._gritoLv || 1);
    return m;
  },
  taken(p) {
    let m = 1;
    if (p.buffs.muralha > 0) m *= 1 - (p._muralhaLv >= 2 ? 0.4 : 0.3);
    return m;
  },

  // ------------------------------------------------------------------ a cada quadro (Player.updateAbilities)
  tick(p, dt) {
    const b = p.buffs;
    // Grito de Guerra: os inimigos perto ficam mais lentos enquanto dura
    if (b.grito > 0 && (p._gritoTk = (p._gritoTk || 0) - dt) <= 0) {
      p._gritoTk = 0.4;
      heroInRadius(p.x, p.y, 220, (e) => heroSlow(e, p._gritoLv >= 2 ? 0.2 : 0.1, 0.6));
    }
    // Injeção Estimulante: velocidade e recargas
    if (heroBase(p.def.id) === 'sera') {
      const inj = b.injecao > 0, k = p._injLv >= 2 ? 0.3 : 0.15;
      p.stats.speedMult = (p._baseSpeedMult || p.stats.speedMult) * (inj ? 1 + k : 1);
      if (inj) for (const id in p.cds) if (p.cds[id] > 0) p.cds[id] = Math.max(0, p.cds[id] - dt * (p._injLv >= 2 ? 0.4 : 0.2));
    }
    // Apagão: os projéteis inimigos se apagam perto da Sera
    if (b.apagao > 0) game.projectiles.clearInRadius(p.x, p.y, p._apagaoR || 300);
    // Domo Condutor: dano e lentidão dentro do campo
    if (b.forceField > 0) {
      const l = this.lv(p, 'sera_domo_condutor');
      if (l && (p._domoTk = (p._domoTk || 0) - dt) <= 0) {
        p._domoTk = 0.5;
        const F = this.field(p);
        heroInRadius(F.x, F.y, F.r, (e, d, kx, ky) => {
          heroStrike(e, (l >= 2 ? 20 : 14) * 0.5 * p.stats.power, false, FIELD_DEF, kx, ky, { kb: 0, shock: true });
          heroSlow(e, l >= 2 ? 0.4 : 0.2, 0.7);
        });
      }
    }
    // Enxame: drones menores ao lado do S-01, com metade do dano dele
    if (b.supportDrone > 0) {
      const n = this.lv(p, 'sera_enxame');
      if (n && (p._enxTk = (p._enxTk || 0) - dt) <= 0) {
        p._enxTk = 0.75;
        for (let i = 0; i < n; i++) {
          const q = (p._droneAng || 0) + Math.PI * (i + 1) / (n + 1) * 2, dx = p.x + Math.cos(q) * 58, dy = p.y + Math.sin(q) * 58;
          const e = heroNearest(dx, dy, 280);
          if (!e) break;
          const a = Math.atan2(e.y - dy, e.x - dx);
          game.projectiles.spawn({ x: dx, y: dy, z: 30, vx: Math.cos(a) * 860, vy: Math.sin(a) * 860, r: 9, dmg: Math.round(10 * p.stats.power), hostile: false, kind: 'drone_laser', life: 0.55 });
        }
      }
    }
    // Há Três Dias: começa cada setor invisível
    if (this.lv(p, 'orion_tres_dias') && game.waves) {
      const r = game.waves.roomIndex;
      if (p._tresSetor !== r) { p._tresSetor = r; b.stealth = Math.max(b.stealth || 0, 8); game.hud.toast('HÁ TRÊS DIAS · invisível', '255,138,31'); }
      // segunda carga da Furtividade: recarrega no tempo de uma recarga
      if (p._furtCarga === undefined) p._furtCarga = 1;
      if (p._furtCarga < 1 && (p._furtT = (p._furtT || 0) - dt) <= 0) p._furtCarga = 1;
    }
    // marcas e cegueira nos inimigos
    for (const e of game.enemies) {
      if (e._marcaT > 0) e._marcaT -= dt;
      if (e._cego > 0) e._cego -= dt;
    }
  },

  // ------------------------------------------------------------------ desenho (camada emissiva)
  drawAura(p, ctx, t) {
    const b = p.buffs, sx = isoX(p.x, p.y), sy = isoY(p.x, p.y);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (b.muralha > 0) {
      const a = Math.min(1, b.muralha * 2);
      GlowCache.drawFlat(ctx, '255,60,60', sx, sy, 70, 0.28 * a);
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.8 + i * 0.5) % 1;
        ctx.strokeStyle = rgba('255,110,90', 0.55 * (1 - k) * a); ctx.lineWidth = 2;
        isoCirclePath(ctx, p.x, p.y, 30 + k * 120); ctx.stroke();
      }
    }
    if (b.grito > 0) {
      const a = Math.min(1, b.grito * 2);
      ctx.strokeStyle = rgba('255,150,60', 0.35 * a); ctx.lineWidth = 1.5;
      ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 40;
      isoCirclePath(ctx, p.x, p.y, 220); ctx.stroke(); ctx.setLineDash([]);
    }
    if (b.injecao > 0 && Math.random() < 0.3) game.particles.sparks(p.x, p.y, rand(10, 40), rand(0, TAU), 1, '120,255,180', 140, Math.PI);
    if (b.apagao > 0) {
      ctx.strokeStyle = rgba('140,200,255', 0.3); ctx.lineWidth = 1.2;
      isoCirclePath(ctx, p.x, p.y, p._apagaoR || 300); ctx.stroke();
    }
    if (b.supportDrone > 0) {
      const n = this.lv(p, 'sera_enxame');
      for (let i = 0; i < n; i++) {
        const q = (p._droneAng || 0) + Math.PI * (i + 1) / (n + 1) * 2, dx = p.x + Math.cos(q) * 58, dy = p.y + Math.sin(q) * 58;
        GlowCache.draw(ctx, '40,255,220', isoX(dx, dy), isoY(dx, dy) - 30, 16, 0.55);
      }
    }
    ctx.restore();
  },
};

// Escudo do Drakos: guarda quando foi erguido (Bloqueio Perfeito)
{
  const esc = ABILITIES.drakos_escudo.cast;
  ABILITIES.drakos_escudo.cast = (p, lv) => { p._escudoT = p.animTime; return esc(p, lv); };
}
// Campo de Força: raio e duração do nó (130/150/170 por 5/6/7 s), fixo onde foi lançado
ABILITIES.sera_campo.cast = (p, lv) => {
  const R = 110 + 20 * lv;
  p.buffs.forceField = 4 + lv; p.forceFieldX = p.x; p.forceFieldY = p.y; p.forceFieldR = R;
  game.particles.ring(p.x, p.y, R, '25,230,210', 0.5, 8);
  game.arcs.crackle(p.x, p.y, 30, 5, R, '120,255,240', 0.2);
  game.audio.play('chargeTier', 1); game.audio.play('deflect');
  return true;
};
// Hack de Sistema + Arquivo 0-ZERO: também desacelera os chefes por 2 s
{
  const hack = ABILITIES.sera_hack.cast;
  ABILITIES.sera_hack.cast = (p, lv, wd) => {
    const ok = hack(p, lv, wd);
    if (ok && AllyFx.lv(p, 'sera_arquivo_zero')) heroInRadius(p.x, p.y, 230 + 30 * lv, (e) => {
      if (!e.isBoss || e._heroSlow) return;
      e._heroSlow = { k: 0.35, t: 2 }; e.speed *= 0.65;
      game.texts.spawn(e.x, e.y, (e.height || 60) + 30, 'ARQUIVO 0-ZERO', '#7fffe0', 14, 0.8);
    });
    return ok;
  };
}
// Furtividade + Há Três Dias: duas cargas
{
  const furt = ABILITIES.orion_furtividade.cast;
  ABILITIES.orion_furtividade.cast = (p, lv) => {
    const ok = furt(p, lv);
    if (ok && AllyFx.lv(p, 'orion_tres_dias') && p._furtCarga > 0) {
      p._furtCarga = 0; p._furtT = 10 * p.stats.cdr;
      setTimeout(() => { if (p.cds) p.cds.orion_furtividade = 0; }, 0);   // a recarga começa depois do castAbility
    }
    return ok;
  };
}

// Gestos das ativas que lançam algo (o corpo anima; o dano vem da onda e das lâminas)
ATTACKS.drakos_onda = Object.assign({}, ATTACKS.drakos_quake, { name: 'ONDA DO MARTELO', noHit: true, ability: true });
ATTACKS.orion_leque_gesto = Object.assign({}, ATTACKS.orion_light2, { name: 'LEQUE DE LÂMINAS', noHit: true, multiHit: 0, ability: true });

// ---------------------------------------------------------------------------
// ATIVAS NOVAS (atalhos 1–4)
// ---------------------------------------------------------------------------
Object.assign(ABILITIES, {
  drakos_muralha: { type: 'buff', cast: (p, lv) => {
    const dur = lv >= 2 ? 8 : 6;
    p.buffs.muralha = dur; p._muralhaLv = lv;
    HeroObjects.add({ lure: true, lureR: 300, x: p.x, y: p.y, vx: 0, vy: 0, radius: 20, state: 'idle',
      update() { this.x = p.x; this.y = p.y; return p.buffs.muralha > 0 && p.state !== 'dead'; } });
    game.particles.ring(p.x, p.y, 120, '255,60,60', 0.5, 8);
    game.texts.spawn(p.x, p.y, 90, 'MURALHA VIVA', '#ff8a7a', 18, 1);
    game.audio.play('stomp'); game.camera.shake(0.2);
    return true;
  } },
  drakos_canhao: { type: 'attack', cast: (p, lv, wd) => {
    const dir = heroAim(p, wd, 420, 0.5), dmg = (45 + 20 * lv) * p.stats.power, hit = new Set();
    p.facing = dir;
    p.startAttack('drakos_onda', { x: Math.cos(dir), y: Math.sin(dir) });
    HeroObjects.add({ t: 0, x: p.x, y: p.y, update(dt) {
      this.t += dt;
      if (this.t < 0.2) return true;                       // o martelo ainda está descendo
      const d = (this.t - 0.2) * 900;
      if (d > 420) return false;
      this.x = p.x + Math.cos(dir) * d; this.y = p.y + Math.sin(dir) * d;
      if (game.room.blocksPoint(this.x, this.y, 10)) return false;
      if (Math.random() < 0.7) game.particles.dust(this.x, this.y, 2, 12, 120);
      heroInRadius(this.x, this.y, 50, (e) => {
        if (hit.has(e)) return;
        hit.add(e);
        heroStrike(e, dmg * p.targetMult(e), false, ABILITY_DEF, Math.cos(dir), Math.sin(dir), { kb: 560, launch: 120, stun: 0.6, heavy: true });
      });
      return true;
    }, draw(ctx) {
      if (this.t < 0.2) return;
      const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
      GlowCache.drawFlat(ctx, '255,70,60', sx, sy, 50, 0.5);
    } });
    return true;
  } },
  drakos_grito: { type: 'buff', cast: (p, lv) => {
    p.buffs.grito = lv >= 2 ? 7 : 6; p._gritoLv = lv; p._gritoTk = 0;
    game.particles.ring(p.x, p.y, 220, '255,150,60', 0.5, 10);
    game.flashScreen('255,120,60', 0.1); game.camera.shake(0.3);
    game.texts.spawn(p.x, p.y, 90, 'GRITO DE GUERRA', '#ffb070', 18, 1);
    game.audio.play('thunder', 0.5); game.audio.play('stomp');
    return true;
  } },
  sera_sentinela: { type: 'buff', cast: (p, lv) => {
    const dur = lv >= 2 ? 18 : 14, dps = lv >= 2 ? 40 : 30;
    for (const o of HeroObjects.list) if (o.sentinela) o.dead = true;    // uma torreta por vez
    HeroObjects.add({ sentinela: true, x: p.x + Math.cos(p.facing) * 40, y: p.y + Math.sin(p.facing) * 40, t: 0, tk: 0, ang: 0, dead: false,
      update(dt) {
        this.t += dt;
        if (this.dead || this.t > dur) { game.particles.flash(this.x, this.y, 20, 40, '120,255,235', 0.15); return false; }
        if ((this.tk -= dt) <= 0) {
          const e = heroNearest(this.x, this.y, 300);
          if (e) {
            this.tk = 0.25; this.ang = Math.atan2(e.y - this.y, e.x - this.x);
            game.projectiles.spawn({ x: this.x, y: this.y, z: 30, vx: Math.cos(this.ang) * 900, vy: Math.sin(this.ang) * 900, r: 9,
              dmg: Math.round(dps * 0.25 * p.stats.power), hostile: false, kind: 'drone_laser', life: 0.45 });
            if (Math.random() < 0.3) game.audio.play('zap', 0.35);
          } else this.tk = 0.1;
        }
        return true;
      },
      light(L) { L.add(isoX(this.x, this.y), isoY(this.x, this.y) - 26, 70, 0.4); },
      draw(ctx) {
        const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
        ctx.fillStyle = '#0d1c1f'; ctx.beginPath(); ctx.ellipse(sx, sy - 10, 11, 8, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(64,255,220,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, sy - 18); ctx.lineTo(sx + Math.cos(this.ang) * 16, sy - 18 + Math.sin(this.ang) * 8); ctx.stroke();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        GlowCache.draw(ctx, '40,255,220', sx, sy - 18, 18, 0.7);
        const k = clamp(1 - this.t / dur, 0, 1);
        ctx.fillStyle = 'rgba(64,255,220,0.8)'; ctx.fillRect(sx - 12, sy - 34, 24 * k, 2);
        ctx.restore();
      } });
    game.audio.play('door', 0.5); game.audio.play('zap');
    return true;
  } },
  sera_pulso: { type: 'buff', cast: (p, lv) => {
    const R = lv >= 2 ? 190 : 170;
    game.projectiles.clearInRadius(p.x, p.y, R);
    heroInRadius(p.x, p.y, R, (e, d, kx, ky) => { if (e.takeHit({ dmg: Math.max(1, Math.round(8 * p.stats.power)), kx, ky, kb: 620, launch: 0, stun: 0.35, heavy: true, crit: false, shock: true })) game.onEnemyHit(e, 8, false, FIELD_DEF, kx, ky); });
    game.particles.ring(p.x, p.y, R, '25,230,210', 0.4, 10);
    game.particles.flash(p.x, p.y, 25, R, '120,255,235', 0.18);
    game.audio.play('deflect'); game.audio.play('zap');
    game.camera.shake(0.2);
    return true;
  } },
  sera_apagao: { type: 'buff', cast: (p, lv) => {
    const R = lv >= 2 ? 340 : 300, dur = lv >= 2 ? 4 : 3;
    p.buffs.apagao = dur; p._apagaoR = R;
    game.projectiles.clearInRadius(p.x, p.y, R);
    heroInRadius(p.x, p.y, R, (e, d, kx, ky) => {
      if (!e.T || !e.T.mech) return;
      heroStunMachine(e, dur);
      if (e.type === 'drone') heroStrike(e, 40 * p.stats.power, false, FIELD_DEF, kx, ky, { kb: 60, stun: dur, shock: true });
    });
    game.flashScreen('10,20,40', 0.35);
    game.particles.ring(p.x, p.y, R, '140,200,255', 0.6, 12);
    game.texts.spawn(p.x, p.y, 90, 'APAGÃO', '#b8dcff', 20, 1);
    game.audio.play('thunder', 0.6);
    return true;
  } },
  sera_injecao: { type: 'buff', cast: (p, lv) => {
    p.buffs.injecao = lv >= 2 ? 7 : 6; p._injLv = lv;
    game.particles.ring(p.x, p.y, 50, '120,255,180', 0.35, 5);
    game.texts.spawn(p.x, p.y, 80, 'INJEÇÃO', '#9fffc8', 16, 0.8);
    game.audio.play('memory');
    return true;
  } },
  orion_fumaca: { type: 'buff', cast: (p, lv) => {
    const R = lv >= 2 ? 170 : 150, dur = lv >= 2 ? 5 : 4, x = p.x, y = p.y;
    HeroObjects.add({ t: 0, x, y, update(dt) {
      this.t += dt;
      if (this.t > dur) return false;
      if (Math.random() < 0.8) game.particles.smoke(x + rand(-R, R) * 0.7, y + rand(-R, R) * 0.7, 0, 1, '26,22,30', 30);
      // quem está dentro perde o alvo; os disparos que saem de dentro saem tortos
      heroInRadius(x, y, R, (e) => { e._cego = 0.4; });
      const P = game.projectiles;
      for (let i = 0; i < P.count; i++) {
        const q = P.items[i];
        if (!q.hostile || q._fum || q.life < q.max - 0.1 || dist2(q.x, q.y, x, y) > R * R) continue;
        q._fum = true;
        const sp = Math.hypot(q.vx, q.vy), a = Math.atan2(q.vy, q.vx) + rand(0.5, 1.1) * (Math.random() < 0.5 ? -1 : 1);
        q.vx = Math.cos(a) * sp; q.vy = Math.sin(a) * sp; q.angle = a;
      }
      return true;
    } });
    game.particles.smoke(x, y, 0, 18, '26,22,30', 40);
    game.audio.play('dash'); game.audio.play('door', 0.3);
    return true;
  } },
  orion_leque: { type: 'attack', cast: (p, lv, wd) => {
    const n = 3 + 2 * lv, dmg = (20 + 8 * lv) * p.stats.power, dir = heroAim(p, wd, 420, 0.6), rc = AllyFx.lv(p, 'orion_ricochete');
    p.facing = dir;
    p.startAttack('orion_leque_gesto', { x: Math.cos(dir), y: Math.sin(dir) });
    for (let i = 0; i < n; i++) {
      const a = dir + (i - (n - 1) / 2) * (1.2 / (n - 1));
      game.projectiles.spawn({ x: p.x + Math.cos(a) * 24, y: p.y + Math.sin(a) * 24, z: 26, vx: Math.cos(a) * 860, vy: Math.sin(a) * 860, r: 12,
        dmg: Math.round(dmg), hostile: false, kind: 'phantom_blade', life: 0.55, pierce: false, bounces: rc, jumps: 0 });
    }
    game.audio.play('thrust'); game.audio.play('swing');
    return true;
  } },
});

// ---------------------------------------------------------------------------
// PASSIVAS (efeitos que dependem de golpes e abates; as outras usam os ganchos acima)
// ---------------------------------------------------------------------------
Object.assign(HERO_PASSIVES, {
  // Sem Freio: 3 ou mais abates quase juntos recarregam a Investida
  drakos_sem_freio: { kill: (p, e, l) => {
    const t = p.animTime;
    if (!(t - (p._sfT || -9) < 0.6)) p._sfN = 0;
    p._sfT = t; p._sfN = (p._sfN || 0) + 1;
    if (p._sfN === 3) {
      p.cds.drakos_investida = 0;
      if (l >= 2) p.gainEnergy(15);
      game.hud.toast('SEM FREIO · Investida recarregada', '255,46,61');
    }
  } },
  // Marca do Alvo: os golpes marcam por 6 s (o próximo crítico nele: AllyFx.critMod)
  orion_marca: { hit: (p, e) => { e._marcaT = 6; } },
});
// Lâmina de Energia com Ricochete e Leque de Lâminas: já na hora do arremesso (firePhantomBlade e
// orion_leque). Domo Condutor, Enxame, Há Três Dias e Injeção: AllyFx.tick. Matriz Estável:
// AllyFx.field. Escudo Refletor: ProjectileSystem.update → AllyFx.reflectShot.
