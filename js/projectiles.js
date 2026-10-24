'use strict';
// ECLIPSE ZERO · Projéteis do jogador e dos inimigos (pool)
// ---------------------------------------------------------------------------
// PROJÉTEIS com pooling (inimigos e jogador)
// ---------------------------------------------------------------------------
class ProjectileSystem {
  constructor(max = 320) {
    this.items = [];
    for (let i = 0; i < max; i++) {
      this.items.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, r: 8, dmg: 0, hostile: true, kind: 'orb',
        life: 0, max: 1, pierce: false, hits: new Set(), dodgeCredited: false, angle: 0 });
    }
    this.count = 0;
  }
  spawn(o) {
    if (this.count >= this.items.length) return null;
    const p = this.items[this.count++];
    p.x = o.x; p.y = o.y; p.z = o.z || 30; p.vx = o.vx; p.vy = o.vy; p.r = o.r || 8;
    p.dmg = o.dmg || 10; p.hostile = o.hostile !== false; p.kind = o.kind || 'orb';
    p.life = p.max = o.life || 2; p.pierce = !!o.pierce;
    p.hits.clear(); p.dodgeCredited = false;
    p.bounces = o.bounces || 0; p.jumps = o.jumps || 0;   // Ricochete (Orion): paredes e saltos entre alvos
    p.efeito = o.efeito || null;                            // tiro de variante que deixa lento (js/mundo/variantes.js)
    p.angle = Math.atan2(p.vy, p.vx);
    return p;
  }
  color(p) {
    switch (p.kind) {
      case 'orb': return '200,120,255';
      case 'laser': return '255,80,80';
      case 'data': return '110,255,230';
      case 'crescent': return '140,210,255';
      case 'volt': return '150,210,255';
      case 'arrow':
      case 'pierce_arrow':
      case 'arrow_burst': return '180,90,255';
      case 'charged_arrow': return '220,140,255';
      case 'explosive_arrow': return '255,110,255';
      case 'tech_orb': return '25,230,210';
      case 'drone_laser': return '40,255,225';
      case 'phantom_blade': return '255,140,30';
      case 'bullet': case 'bullet_pierce': case 'bullet_big': return '255,180,80';
      default: return '110,170,255';
    }
  }
  burst(p) {
    const c = this.color(p);
    game.particles.sparks(p.x, p.y, p.z, p.angle + Math.PI, 7, c, 260, Math.PI);
    game.particles.flash(p.x, p.y, p.z, 26, c, 0.12);
  }
  kill(i, fx) {
    const p = this.items[i];
    if (fx) this.burst(p);
    const last = this.count - 1;
    if (i !== last) { this.items[i] = this.items[last]; this.items[last] = p; }
    this.count--;
  }
  clear() { this.count = 0; }
  clearHostile(fx) {
    for (let i = this.count - 1; i >= 0; i--) if (this.items[i].hostile) this.kill(i, fx);
  }
  // Devolve o projétil hostil i contra quem atirou (Escudo Refletor, Matriz Estável): mult = fração do dano
  reflect(i, mult) {
    const p = this.items[i];
    p.hostile = false; p.vx = -p.vx * 1.15; p.vy = -p.vy * 1.15; p.angle = Math.atan2(p.vy, p.vx);
    p.dmg = Math.max(1, Math.round(p.dmg * mult)); p.life = Math.max(p.life, 0.9); p.hits.clear();
    game.particles.flash(p.x, p.y, p.z, 30, '255,200,140', 0.12);
  }
  // Campo Magnético e Ruptura de Plasma: destroem projéteis hostis dentro do raio
  clearInRadius(x, y, r) {
    for (let i = this.count - 1; i >= 0; i--) {
      const p = this.items[i];
      if (!p.hostile || dist2(p.x, p.y, x, y) > r * r) continue;
      game.arcs.spawn(x, y, 30, p.x, p.y, p.z, { w: 1.4, life: 0.12, rgb: '150,205,255' });
      this.kill(i, true);
    }
  }

  update(dt) {
    const pl = game.player;
    outer:
    for (let i = this.count - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.kind === 'explosive_arrow') this.detonateExplosive(p);
        this.kill(i, p.hostile);
        continue;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'data' && Math.random() < 0.35) game.particles.emit(P.WISP, p.x, p.y, p.z, -p.vx * 0.1, -p.vy * 0.1, 10, 0.3, 1.6, '110,255,230', 0, 1);
      if (game.room.blocksPoint(p.x, p.y, p.r * 0.4)) {
        if (p.bounces > 0) {                    // ricocheteia: volta pelo caminho e procura outro alvo
          p.bounces--; p.x -= p.vx * dt; p.y -= p.vy * dt; p.vx = -p.vx; p.vy = -p.vy;
          p.angle = Math.atan2(p.vy, p.vx); p.life = Math.max(p.life, 0.35);
          this.burst(p);
          continue;
        }
        if (p.kind === 'explosive_arrow') this.detonateExplosive(p);
        this.kill(i, true);
        continue;
      }
      if (p.hostile) {
        const rr = p.r + pl.radius;
        if (pl.state !== 'dead' && dist2(p.x, p.y, pl.x, pl.y) < rr * rr && pl.z < PULO.ALTO + 14) {   // por cima no pulo
          if (pl.state === 'dash' && pl.invuln > 0) {
            if (!p.dodgeCredited) { p.dodgeCredited = true; game.onPerfectDodge(pl); }
            continue;
          }
          if (typeof AllyFx !== 'undefined' && AllyFx.reflectShot(pl, p)) continue;   // Escudo Refletor (Drakos)
          if (pl.takeDamage(p.dmg, p.x - p.vx * 0.05, p.y - p.vy * 0.05, 200)) {
            if (p.efeito && typeof EnemyTraits !== 'undefined') EnemyTraits.efeito(pl, p.efeito);
            this.kill(i, true); continue;
          }
        }
      } else {
        for (const e of game.enemies) {
          if (!e.canBeHit() || p.hits.has(e)) continue;
          const rr = p.r + e.radius;
          if (dist2(p.x, p.y, e.x, e.y) < rr * rr) {
            p.hits.add(e);
            const l = Math.hypot(p.vx, p.vy) || 1, kx = p.vx / l, ky = p.vy / l;
            const dmg = Math.max(1, Math.round(p.dmg * (e.vulnerable || 1) * pl.targetMult(e) * rand(0.9, 1.1)));
            const volt = p.kind === 'volt';
            if (volt) game.arcs.crackle(e.x, e.y, Math.min(e.height * 0.5, 40) + e.z, 2, e.radius * 1.5, '160,215,255', 0.12);
            if (p.kind === 'explosive_arrow') {
              this.detonateExplosive(p);
              this.kill(i, true);
              continue outer;
            }
            if (e.takeHit({ dmg, kx, ky, kb: volt ? 160 : 220, launch: 0, stun: volt ? 0.45 : 0.3, heavy: false, crit: false, shock: volt })) {
              game.onEnemyHit(e, dmg, false, PROJ_HIT_DEF, kx, ky);
            }
            if (p.jumps > 0) {                  // salta para o inimigo mais próximo ainda não atingido
              let nx = null, nd = 260 * 260;
              for (const o of game.enemies) {
                if (!o.canBeHit() || p.hits.has(o)) continue;
                const d2 = dist2(o.x, o.y, p.x, p.y);
                if (d2 < nd) { nd = d2; nx = o; }
              }
              if (nx) {
                p.jumps--;
                const sp = Math.hypot(p.vx, p.vy), q = Math.atan2(nx.y - p.y, nx.x - p.x);
                p.vx = Math.cos(q) * sp; p.vy = Math.sin(q) * sp; p.angle = q; p.life = Math.max(p.life, 0.4);
                continue outer;
              }
            }
            if (!p.pierce) { this.kill(i, true); continue outer; }
          }
        }
      }
    }
  }

  detonateExplosive(p) {
    const R = 115, pl = game.player;
    game.particles.ring(p.x, p.y, R, '200,90,255', 0.45, 8);
    game.particles.flash(p.x, p.y, p.z || 20, R * 1.2, '230,140,255', 0.2);
    game.arcs.crackle(p.x, p.y, 25, 4, R, '220,150,255', 0.2);
    game.audio.play('zap');
    game.audio.play('thunder', 0.3);
    game.camera.shake(0.25);
    for (const e of game.enemies) {
      if (!e.canBeHit() || dist2(p.x, p.y, e.x, e.y) > R * R) continue;
      const dx = e.x - p.x, dy = e.y - p.y, l = Math.hypot(dx, dy) || 1;
      const dmg = Math.max(1, Math.round(p.dmg * (e.vulnerable || 1) * (pl ? pl.targetMult(e) : 1)));
      if (e.takeHit({ dmg, kx: dx / l, ky: dy / l, kb: 280, launch: 0, stun: 0.5, heavy: true, crit: false, shock: true })) {
        game.onEnemyHit(e, dmg, false, PROJ_HIT_DEF, dx / l, dy / l);
      }
    }
  }

  // Golpes do jogador destroem (aparam) projéteis inimigos
  slashTest(shape, ox, oy, dir) {
    for (let i = this.count - 1; i >= 0; i--) {
      const p = this.items[i];
      if (p.hostile && Hitbox.test(shape, ox, oy, dir, p.x, p.y, p.r)) {
        game.onDeflect(p);
        this.kill(i, true);
      }
    }
  }

  drawShadows(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < this.count; i++) {
      const p = this.items[i];
      ctx.beginPath();
      ctx.ellipse(isoX(p.x, p.y), isoY(p.x, p.y), p.r * 1.1, p.r * 0.55, 0, 0, TAU);
      ctx.fill();
    }
  }

  addLights(lighting) {
    for (let i = 0; i < this.count && i < 40; i++) {
      const p = this.items[i];
      lighting.add(isoX(p.x, p.y), isoY(p.x, p.y) - p.z * 0.5, p.kind === 'crescent' || p.kind === 'volt' ? 150 : 80, 0.55);
    }
  }

  // Camada emissiva
  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.count; i++) {
      const p = this.items[i];
      const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y) - p.z;
      const fade = Math.min(1, p.life / 0.15);
      switch (p.kind) {
        case 'orb':   // orbe de dados do Culto
          GlowCache.draw(ctx, '180,100,255', sx, sy, p.r * 3.4, 0.85 * fade);
          GlowCache.draw(ctx, '245,225,255', sx, sy, p.r * 1.3, fade);
          break;
        case 'laser': {   // disparo do Drone Sentinela
          const sv = worldAngleToScreen(p.angle, game.tmpV);
          const l = Math.hypot(sv.x, sv.y) || 1, ux = sv.x / l, uy = sv.y / l;
          ctx.globalAlpha = fade;
          ctx.strokeStyle = 'rgba(255,70,70,0.55)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sx - ux * 22, sy - uy * 22); ctx.lineTo(sx, sy); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,225,225,0.95)'; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(sx - ux * 18, sy - uy * 18); ctx.lineTo(sx, sy); ctx.stroke();
          ctx.lineCap = 'butt';
          GlowCache.draw(ctx, '255,60,60', sx, sy, p.r * 2.6, 0.7 * fade);
          break;
        }
        case 'data': {   // fragmentos de dados de NEXUS
          const sv = worldAngleToScreen(p.angle, game.tmpV);
          for (let k = 3; k >= 1; k--) GlowCache.draw(ctx, '60,220,200', sx - sv.x * k * 6, sy - sv.y * k * 6, p.r * (2.4 - k * 0.4), 0.3 * fade);
          GlowCache.draw(ctx, '90,255,220', sx, sy, p.r * 3, 0.75 * fade);
          ctx.save();
          ctx.translate(sx, sy); ctx.rotate(p.life * 9);
          ctx.globalAlpha = fade;
          ctx.fillStyle = 'rgba(230,255,250,0.95)';
          ctx.fillRect(-p.r * 0.55, -p.r * 0.55, p.r * 1.1, p.r * 1.1);
          ctx.restore();
          break;
        }
        case 'volt': {   // Arco Voltaico: raio concentrado em movimento
          const sv = worldAngleToScreen(p.angle, game.tmpV);
          const l = Math.hypot(sv.x, sv.y) || 1, ux = sv.x / l, uy = sv.y / l;
          GlowCache.draw(ctx, '70,150,255', sx, sy, p.r * 3.4, 0.8 * fade);
          GlowCache.draw(ctx, '230,245,255', sx, sy, p.r * 1.3, fade);
          ctx.lineJoin = 'round';
          drawBolt(ctx, sx - ux * 46, sy - uy * 46, sx + ux * 10, sy + uy * 10,
            mulberry32(i * 97 + Math.floor(game.realTime * 40)), 0.45, 1.8, '170,220,255', fade, false);
          break;
        }
        case 'crescent':
        case 'blade': {
          // Onda elétrica em crescente orientada pela velocidade
          const sv = worldAngleToScreen(p.angle, game.tmpV);
          const a = Math.atan2(sv.y, sv.x);
          const isC = p.kind === 'crescent';
          const R = isC ? 30 : 18;
          ctx.globalAlpha = fade;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(a);
          ctx.scale(1, isC ? 1 : 0.6);
          ctx.fillStyle = isC ? 'rgba(110,180,255,0.7)' : 'rgba(60,130,255,0.8)';
          ctx.beginPath();
          ctx.arc(0, 0, R, -1.2, 1.2);
          ctx.arc(-R * 0.45, 0, R * 0.8, 1.0, -1.0, true);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(230,245,255,0.95)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, R, -1.1, 1.1); ctx.stroke();
          if (isC) {
            ctx.lineJoin = 'round';
            drawBolt(ctx, Math.cos(-1.1) * R, Math.sin(-1.1) * R, Math.cos(1.1) * R, Math.sin(1.1) * R,
              mulberry32(i * 131 + Math.floor(game.realTime * 30)), 0.5, 1.1, '150,210,255', fade, false);
          }
          ctx.restore();
          GlowCache.draw(ctx, isC ? '90,160,255' : '60,120,255', sx, sy, R * 2.2, 0.5 * fade);
          break;
        }
        case 'arrow':
        case 'pierce_arrow':
        case 'arrow_burst':
        case 'charged_arrow':
        case 'explosive_arrow': {
          const sv = worldAngleToScreen(p.angle, game.tmpV);
          const l = Math.hypot(sv.x, sv.y) || 1, ux = sv.x / l, uy = sv.y / l;
          const isCh = p.kind === 'charged_arrow';
          const isEx = p.kind === 'explosive_arrow';
          const len = isCh ? 34 : isEx ? 28 : 22;
          const rgb = isCh ? '220,140,255' : isEx ? '255,100,255' : '180,90,255';
          ctx.globalAlpha = fade;
          ctx.strokeStyle = `rgba(${rgb},0.45)`; ctx.lineWidth = isCh ? 6 : 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sx - ux * len, sy - uy * len); ctx.lineTo(sx, sy); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = isCh ? 2.5 : 1.8;
          ctx.beginPath(); ctx.moveTo(sx - ux * (len * 0.8), sy - uy * (len * 0.8)); ctx.lineTo(sx, sy); ctx.stroke();
          GlowCache.draw(ctx, rgb, sx, sy, p.r * (isCh ? 3.5 : 2.6), 0.75 * fade);
          break;
        }
        case 'tech_orb': {
          GlowCache.draw(ctx, '25,230,210', sx, sy, p.r * 3.2, 0.85 * fade);
          GlowCache.draw(ctx, '200,255,250', sx, sy, p.r * 1.4, fade);
          ctx.save();
          ctx.translate(sx, sy); ctx.rotate(p.life * 10);
          ctx.strokeStyle = 'rgba(120,255,240,0.9)'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(0, 0, p.r * 1.1, 0, TAU); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'drone_laser': {
          const sv = worldAngleToScreen(p.angle, game.tmpV);
          const l = Math.hypot(sv.x, sv.y) || 1, ux = sv.x / l, uy = sv.y / l;
          ctx.globalAlpha = fade;
          ctx.strokeStyle = 'rgba(40,255,225,0.6)'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sx - ux * 20, sy - uy * 20); ctx.lineTo(sx, sy); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(sx - ux * 16, sy - uy * 16); ctx.lineTo(sx, sy); ctx.stroke();
          GlowCache.draw(ctx, '40,255,225', sx, sy, p.r * 2.5, 0.7 * fade);
          break;
        }
        case 'bullet':
        case 'bullet_pierce':
        case 'bullet_big': {
          // tiro da pistola do Orion: traçador fino com núcleo branco
          const sv = worldAngleToScreen(p.angle, game.tmpV);
          const l = Math.hypot(sv.x, sv.y) || 1, ux = sv.x / l, uy = sv.y / l, big = p.kind === 'bullet_big';
          const len = big ? 34 : p.kind === 'bullet_pierce' ? 26 : 18;
          ctx.globalAlpha = fade; ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(255,170,60,0.55)'; ctx.lineWidth = big ? 6 : 3.5;
          ctx.beginPath(); ctx.moveTo(sx - ux * len, sy - uy * len); ctx.lineTo(sx, sy); ctx.stroke();
          ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = big ? 2.4 : 1.4;
          ctx.beginPath(); ctx.moveTo(sx - ux * len * 0.7, sy - uy * len * 0.7); ctx.lineTo(sx, sy); ctx.stroke();
          GlowCache.draw(ctx, '255,170,60', sx, sy, p.r * (big ? 3 : 2.2), 0.7 * fade);
          break;
        }
        case 'phantom_blade': {
          const sv = worldAngleToScreen(p.angle, game.tmpV);
          ctx.save();
          ctx.translate(sx, sy); ctx.rotate(p.life * 18);
          GlowCache.draw(ctx, '255,140,30', 0, 0, p.r * 3.2, 0.75 * fade);
          ctx.fillStyle = 'rgba(255,160,45,0.85)';
          ctx.beginPath();
          ctx.moveTo(-p.r * 1.5, 0); ctx.lineTo(0, -p.r * 0.6); ctx.lineTo(p.r * 1.5, 0); ctx.lineTo(0, p.r * 0.6);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.restore();
          break;
        }
      }
    }
    ctx.restore();
  }

  drawDebug(ctx) {
    for (let i = 0; i < this.count; i++) {
      const p = this.items[i];
      drawHurtbox(ctx, p.x, p.y, p.r, p.hostile ? '255,90,220' : '120,220,255');
    }
  }
}

