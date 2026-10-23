'use strict';
// ECLIPSE ZERO · Kits dos personagens: o que muda de um herói para outro
// ---------------------------------------------------------------------------
// O Player (js/player.js) é um só. Movimento, esquiva, dano recebido, morte, energia,
// recargas e câmera são comuns a todos. O que é PRÓPRIO de cada personagem vem do KIT
// registrado em HERO_KITS[id] (um arquivo por personagem em js/heroes/<id>.js):
//   ataque leve (J), pesado/carregado (K), técnicas de combo, as ativas dos atalhos 1–4,
//   a suprema (tecla I, 100 de energia), passivas da árvore, efeitos, desenho e arma.
// O KAEL NÃO TEM KIT: player.kit === null e o Player segue exatamente o código de sempre
// (os ganchos do Player só desviam quando this.kit existe).
//
// COMO CRIAR O KIT DE UM PERSONAGEM NOVO (ex.: Drakos, em js/heroes/drakos.js):
//   registerHeroKit({ id: 'drakos', ...métodos... })  — os que faltarem vêm de HERO_KIT_BASE.
//   Obrigatórios: attacks (tabela de golpes, como ATTACKS), combo (tabela de combos),
//     startAttack, updateAttack (o golpe em andamento), abilities ({ idDaÁrvore: { type,
//     cast(p, nível, direção) } }) e ult (id do nó 'suprema' da árvore) + startUltimate.
//   Opcionais: passives(p, S, pr) (passivas → atributos), update(p, dt) (efeitos por
//     quadro), updateCharge, damageTakenMult, onHurt, onDash, onKill, timeStep, draw2D,
//     drawAura, drawWorld, hudBuffs, techniques (lista da pausa).
//   Progresso: PartyProgress.of(id) (nível, pontos, habilidades e atalhos do personagem).
//   Modelo 3D: def.model na ficha (MODELS3D[model]; MODELS3D[model + 'Tex'] é usado no
//     lugar quando existir) e a arma em HERO_WEAPONS[id] = { add(model), pose(model, e, o) }.
//   Inclua o <script> no index.html depois deste arquivo e mude o devStatus da ficha.
// Objetos soltos no mundo (flechas, minas, iscas…) vão para HeroObjects: atualizados,
// desenhados e limpos pelo jogo a cada troca de setor (vazio com o Kael).
// ---------------------------------------------------------------------------
const HERO_KITS = {};
// Armas 3D dos personagens (gancho reutilizável pelos modelos procedurais e texturizados):
//   add(model)            acrescenta os nós da arma no rig do Kael já montado (MODELS3D.kael.build)
//   pose(model, e, opts)  chamado DEPOIS de MODELS3D.kael.pose: ajusta braços, tronco e arma
//   glows(e, add)         halos da arma (âncoras criadas em add)
// (o mesmo objeto de window.HERO_WEAPONS, onde os modelos procedurais de js/models/ registram as suas)
const HERO_WEAPONS = (window.HERO_WEAPONS = window.HERO_WEAPONS || {});

// Kit do personagem de uma ficha (null = Kael, que usa o código original do Player)
function heroKitOf(def) { return (def && def.id !== DEFAULT_CHARACTER && HERO_KITS[def.id]) || null; }
// Progresso do personagem do Player: o do kit, o do aliado (PartyProgress, com nível e árvores
// próprios, onde a experiência dele já entra) ou, para o Kael, o game.progress de sempre
function heroProgressOf(p) {
  if (p && p.kit) return p.kit.progress(p);
  return (p && p.def && PartyProgress.of(p.def.id)) || game.progress;
}
// Árvore (cor e nome) de um nó de qualquer personagem
function heroTreeOf(treeId) { return SKILL_TREES.find((q) => q.id === treeId) || ROSTER_SKILL_TREES.find((q) => q.id === treeId) || null; }
// Suprema do personagem ativo para o HUD (o Kael: Eclipse Absoluto, com as cores de sempre)
// Supremas dos aliados ainda sem kit (feitas em js/player.js): nome, rótulo curto e ícone
const HERO_ULT_INFO = {
  lyra: ['Foco de Batalha', 'FOCO', 'focus'], drakos: ['Zona de Impacto', 'IMPACTO', 'quake'],
  sera: ['Cura de Emergência', 'CURA', 'heal'], orion: ['Dança das Sombras', 'SOMBRA', 'shadowStrike'],
};
function heroUltInfo(p) {
  if (!p.kit && p.def.id !== DEFAULT_CHARACTER) {
    const u = HERO_ULT_INFO[p.def.id] || ['Suprema', 'SUPREMA', 'eclipse'];
    return { learned: true, lvl: 1, name: u[0], icon: u[2], label: u[1], rgb: hexToRgb(p.def.color) };
  }
  if (!p.kit) return { learned: game.progress.lv('eclipse_absoluto') > 0, lvl: SKILLS.eclipse_absoluto.lvl, name: 'Eclipse Absoluto', icon: 'eclipse', label: 'ECLIPSE', rgb: null };
  const k = p.kit, s = skillDef(k.ult);
  return { learned: k.ultLevel(p) > 0, lvl: s ? s.lvl : 1, name: s ? s.name : 'Suprema', icon: k.ultIcon || (s && s.icon) || 'eclipse', label: k.ultLabel || 'SUPREMA', rgb: k.rgb };
}
// Chave do modelo 3D em uso: a armadura especial equipada vestida em 3D (js/heroes/armaduras3d.js,
// assim que a malha dela carrega), senão o texturizado, se existir. semArmadura: o modelo de sempre
function heroModelKey(def, semArmadura) {
  const ak = !semArmadura && def && typeof ArmorModels !== 'undefined' ? ArmorModels.keyFor(def.id) : null;
  if (ak) return ak;
  const k0 = (def && def.model) || 'kael';
  return MODELS3D[k0 + 'Tex'] ? k0 + 'Tex' : MODELS3D[k0] ? k0 : 'kael';
}
// Cor da armadura equipada para o modelo 3D texturizado: [r, g, b, intensidade] ou null (a padrão
// de cada um não tem cor própria: visual.tint null em js/data/armors.js; a armadura vestida em 3D
// já traz as cores na textura)
const HERO_TINTS = {};
function heroArmorTint(id) {
  const aid = typeof RosterManager !== 'undefined' ? RosterManager.equippedArmor(id) : null;
  if (aid && typeof ArmorModels !== 'undefined' && ArmorModels.keyFor(id, aid)) return null;
  const a = aid && ARMOR_DEFS[aid], hx = a && a.visual && a.visual.tint;
  if (!hx) return null;
  return HERO_TINTS[hx] || (HERO_TINTS[hx] = [...hexToRgb(hx).split(',').map((v) => +v / 255), 0.72]);
}
// Cor dos fantasmas da esquiva de quem não tem kit (Kael: o azul de sempre; aliados: a cor-tema)
function heroGhostRgb(def) {
  if (!def || def.id === DEFAULT_CHARACTER) return [0.25, 0.55, 1.0];
  return hexToRgb(def.color).split(',').map((v) => Math.min(1, (+v / 255) * 0.8 + 0.12));
}

// ---------------------------------------------------------------------------
// COMBOS DE UM KIT: a mesma mecânica do ComboSystem (buffer, janelas, cadeia), com a
// tabela do personagem. table: { L, LL, LLL, LLH, H, ... } → id do golpe;
// dash: { L, H } (Esquiva → Leve/Pesado); needs: { golpe: idDaÁrvore } (técnicas que
// exigem uma habilidade aprendida); prog(): progresso do personagem
// ---------------------------------------------------------------------------
class HeroCombo extends ComboSystem {
  constructor(table, dash, needs, prog) {
    super();
    this.table = table; this.dash = dash || {}; this.needs = needs || {}; this.prog = prog;
  }
  isUnlocked(id) {
    const sk = this.needs[id];
    if (!sk) return true;
    const pr = this.prog();
    return !!pr && pr.lv(sk) > 0;
  }
  resolve(type) {
    if (this.dashWindow > 0) {
      this.dashWindow = 0;
      const d = this.dash[type];
      if (d && this.isUnlocked(d)) { this.seq = 'D'; return d; }
    }
    const s = this.seq + type, id = this.table[s];
    if (id && this.isUnlocked(id)) { this.seq = s; return id; }
    this.seq = type;
    return this.table[type];
  }
}

// ---------------------------------------------------------------------------
// BASE DOS KITS: comportamento padrão (o kit só sobrescreve o que é dele)
// ---------------------------------------------------------------------------
const HERO_KIT_BASE = {
  rgb: '255,255,255',            // cor-tema 'r,g,b' (registerHeroKit preenche pela ficha)
  glowRgb: null,                 // brilho no chão em volta do herói (null = a cor-tema)
  ult: null, ultIcon: null, ultLabel: 'SUPREMA',
  abilities: {},
  init(p) {},
  progress(p) { return PartyProgress.of(p.def.id); },
  // Passivas da árvore → atributos (S = p.stats já com nível, evoluções e escolhas)
  passives(p, S, pr) {},
  update(p, dt) {},
  // Passo de tempo do personagem (o mundo usa sdt; uma suprema pode deixar o herói no tempo real)
  timeStep(p, dt, sdt) { return sdt; },
  ultLevel(p) { return this.ult ? this.progress(p).lv(this.ult) : 0; },
  ultCost() { const s = skillDef(this.ult); return s ? s.energy : SPECIAL_COST; },
  canUltimate(p) { return this.ultLevel(p) > 0 && p.fury >= p.ultCost(); },   // p.ultCost: com o desconto do ramo Supremas
  denyUltimate(p) {
    const s = skillDef(this.ult), tr = s && heroTreeOf(s.tree);
    if (s && !this.ultLevel(p)) game.hud.toast(`${s.name} bloqueado · Árvore ${tr ? tr.name.charAt(0) + tr.name.slice(1).toLowerCase() : ''} (nível ${s.lvl})`, '255,92,122');
    game.hud.furyDenied();
    game.audio.play('uiDeny');
  },
  startUltimate(p) {},
  updateSpecial(p, dt) { p.state = 'idle'; },
  // Atalho k (0–3): mesma forma do Player.abilityInfo do Kael
  abilityInfo(p, k) {
    const pr = this.progress(p), id = pr.slots[k];
    return id ? { id, lv: pr.lv(id), S: skillDef(id), A: this.abilities[id] } : null;
  },
  startAttack(p, id, wd, charge) {},
  updateAttack(p, dt, input, wd) { p.endAttack(); p.state = 'idle'; },
  updateCharge(p, dt, input, wd) { p.state = 'idle'; },
  damageTakenMult(p) { return 1; },
  onHurt(p, dmg) {}, onDash(p) {}, onKill(p, e) {},
  // Desenho: modelo 3D (fantasmas da esquiva, corpo e halos) ou o desenho 2D do kit
  alpha(p) { return 1; },
  draw(p, ctx, sx, sy) {
    const a = this.alpha(p);
    if (game.use3D && p.spr && p.spr.ok) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const g of p.ghosts) {
        if (g.life <= 0 || !g.spr || !g.spr.ok) continue;
        ctx.globalAlpha = (g.life / 0.22) * 0.6;
        R3D.blit(ctx, g.spr, isoX(g.x, g.y), isoY(g.x, g.y));
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = (p.blinking() ? 0.55 : 1) * a;
      R3D.blit(ctx, p.spr, sx, sy);
      ctx.restore();
      const key = p.mk3 && MODELS3D[p.mk3] && MODELS3D[p.mk3].glows ? p.mk3 : p.def.model;
      game.glows3D(ctx, key, p, p.spr, sx, sy, a);
      return;
    }
    this.draw2D(p, ctx, sx, sy, a);
  },
  drawEmissive(p, ctx) {
    if (!game.use3D || !p.spr || !p.spr.ok) return;
    R3D.blitEmissive(ctx, p.spr, isoX(p.x, p.y), isoY(p.x, p.y) - p.z, (p.blinking() ? 0.55 : 1) * this.alpha(p));
  },
  // Sem WebGL: silhueta simples na cor-tema
  draw2D(p, ctx, sx, sy, a) {
    ctx.save();
    ctx.globalAlpha = a * (p.blinking() ? 0.55 : 1);
    ctx.fillStyle = '#0b0a12';
    ctx.beginPath(); ctx.ellipse(sx, sy - 22, 8, 20, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy - 48, 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(this.rgb, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  },
  drawAura(p, ctx, t) {},
  drawWorld(p, ctx) {},
  hudBuffs(p, list) {},
  techniques(p) { return []; },
  ghostRgb: [0.6, 0.6, 1.0],
};
function registerHeroKit(kit) {
  Object.setPrototypeOf(kit, HERO_KIT_BASE);
  const d = CHARACTERS_BY_ID[kit.id];
  if (d && !Object.prototype.hasOwnProperty.call(kit, 'rgb')) kit.rgb = hexToRgb(d.color);
  if (!Object.prototype.hasOwnProperty.call(kit, 'ghostRgb')) kit.ghostRgb = kit.rgb.split(',').map((v) => Math.min(1, (+v / 255) * 0.8 + 0.12));
  HERO_KITS[kit.id] = kit;
  return kit;
}

// ---------------------------------------------------------------------------
// OBJETOS DOS HERÓIS NO MUNDO: { update(dt) → false quando acaba, draw(ctx), light(L) }
// draw é chamado na camada emissiva (depois da escuridão), em coordenadas de mundo.
// 'lure: true' marca uma isca que atrai os inimigos (heroTargetFor)
// ---------------------------------------------------------------------------
const HeroObjects = {
  list: [],
  add(o) { this.list.push(o); return o; },
  clear() { this.list.length = 0; },
  count(fn) { let n = 0; for (const o of this.list) if (fn(o)) n++; return n; },
  update(dt) {
    const L = this.list;
    let w = 0;
    for (let i = 0; i < L.length; i++) { const o = L[i]; if (o.update(dt) !== false) L[w++] = o; }
    L.length = w;
  },
  draw(ctx) {
    const p = game.player;
    if (!this.list.length && !(p && p.kit)) return;
    ctx.save();
    for (const o of this.list) if (o.draw) o.draw(ctx);
    if (p && p.kit) p.kit.drawWorld(p, ctx);
    ctx.restore();
  },
  addLights(L) { for (const o of this.list) if (o.light) o.light(L); },
};

// Alvo que um inimigo persegue: o jogador ou uma isca próxima (os chefes ignoram iscas)
function heroTargetFor(e) {
  const L = HeroObjects.list;
  if (!L.length || e.isBoss) return game.player;
  let best = null, bd = Infinity;
  for (const o of L) {
    if (!o.lure || o.dead) continue;
    const d = dist2(o.x, o.y, e.x, e.y);
    if (d < o.lureR * o.lureR && d < bd) { bd = d; best = o; }
  }
  return best || game.player;
}

// ---------------------------------------------------------------------------
// UTILITÁRIOS COMUNS DOS KITS
// ---------------------------------------------------------------------------
// Direção de mira (assistida): o inimigo mais próximo dentro do cone em volta da direção
// pressionada (ou de onde o herói olha). Com 'speed' (projéteis), mira à frente do alvo
// que se move. Devolve o ângulo no mundo.
function heroAim(p, wd, range = 520, cone = 0.7, speed = 0) {
  const dir = wd ? Math.atan2(wd.y, wd.x) : p.facing;
  const c = wd ? cone : cone * 1.6;
  let best = null, bs = Infinity;
  for (const e of game.enemies) {
    if (!e.canBeHit()) continue;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
    if (d > range + e.radius) continue;
    const ad = Math.abs(angleDiff(dir, Math.atan2(dy, dx)));
    if (ad > c) continue;
    const s = d + ad * 220;
    if (s < bs) { bs = s; best = e; }
  }
  if (!best) return dir;
  const lt = speed > 0 ? Math.min(0.6, dist(p.x, p.y, best.x, best.y) / speed) : 0;
  return Math.atan2(best.y + (best.vy || 0) * lt - p.y, best.x + (best.vx || 0) * lt - p.x);
}
// Inimigo mais próximo de um ponto (com filtro opcional)
function heroNearest(x, y, range, filter) {
  let best = null, bd = range * range;
  for (const e of game.enemies) {
    if (!e.canBeHit() || (filter && !filter(e))) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
// Inimigos dentro de um raio: fn(e, distância, kx, ky)
function heroInRadius(x, y, R, fn) {
  for (const e of game.enemies) {
    if (!e.canBeHit()) continue;
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy);
    if (d > R + e.radius) continue;
    const l = d || 1;
    fn(e, d, dx / l, dy / l);
  }
}
// Aplica um acerto do herói (dano já calculado): knockback, atordoamento, números e energia
function heroStrike(e, dmg, crit, def, kx, ky, h = {}) {
  dmg = Math.max(1, Math.round(dmg));
  if (!e.takeHit({ dmg, kx, ky, kb: h.kb || 0, launch: h.launch || 0, stun: h.stun || 0, heavy: !!h.heavy, crit, shock: !!h.shock, breakArmor: !!h.breakArmor, poise: 1 })) return false;
  game.onEnemyHit(e, dmg, crit, def, kx, ky);
  return true;
}
// Lentidão temporária num inimigo (k = fração da velocidade perdida); renovável
function heroSlow(e, k, t) {
  if (!e || e.isBoss) return;
  const s = e._heroSlow;
  if (s) { s.t = Math.max(s.t, t); return; }
  e._heroSlow = { k, t };
  e.speed *= 1 - k;
}
// Atualiza as lentidões (chamado pelo kit a cada quadro)
function heroUpdateSlows(dt) {
  for (const e of game.enemies) {
    const s = e._heroSlow;
    if (!s) continue;
    s.t -= dt;
    if (s.t <= 0 || !e.alive) { e.speed /= 1 - s.k; e._heroSlow = null; }
  }
}
// Atordoa uma máquina por 'dur' segundos (pulsos eletromagnéticos); chefes não
function heroStunMachine(e, dur) {
  if (!e.canBeHit() || e.isBoss || !e.T || !e.T.mech) return false;
  e.interrupt();
  e.stun = Math.max(e.stun, dur);
  e.setState('stun');
  return true;
}

// ---------------------------------------------------------------------------
// PROJÉTIL DE HERÓI (flechas, estilhaços, lâminas…): voa em linha reta, para em
// paredes e pilares, acerta até maxHits inimigos. o.hit(e, shot) aplica o acerto;
// o.end(shot, motivo, e) roda quando acaba ('enemy' | 'wall' | 'range').
// Desenho: rastro luminoso na cor 'rgb' com núcleo 'core' (estilo 'arrow' ou 'shard')
// ---------------------------------------------------------------------------
class HeroShot {
  constructor(o) {
    this.x = 0; this.y = 0; this.z = 36; this.vx = 0; this.vy = 0; this.life = 0.5; this.r = 6;
    this.maxHits = 1; this.rgb = '255,255,255'; this.core = '255,255,255'; this.len = 26; this.w = 2;
    this.style = 'arrow'; this.hit = null; this.end = null;
    Object.assign(this, o);
    this.max = this.life;
    this.hits = new Set();
    this.angle = Math.atan2(this.vy, this.vx);
    this.dead = false;
  }
  update(dt) {
    if (this.dead) return false;
    this.life -= dt;
    const step = Math.hypot(this.vx, this.vy) * dt, n = Math.max(1, Math.ceil(step / 12));
    for (let k = 0; k < n; k++) {
      this.x += (this.vx * dt) / n; this.y += (this.vy * dt) / n;
      if (game.room.blocksPoint(this.x, this.y, 2)) { this.finish('wall', null); return false; }
      for (const e of game.enemies) {
        if (!e.canBeHit() || this.hits.has(e) || e.z > this.z + 30) continue;
        const rr = this.r + e.radius;
        if (dist2(this.x, this.y, e.x, e.y) > rr * rr) continue;
        this.hits.add(e);
        if (this.hit) this.hit(e, this);
        if (this.hits.size >= this.maxHits) { this.finish('enemy', e); return false; }
      }
    }
    if (this.life <= 0) { this.finish('range', null); return false; }
    return true;
  }
  finish(reason, e) {
    if (this.dead) return;
    this.dead = true;
    if (this.end) this.end(this, reason, e);
    else if (reason !== 'range') {
      game.particles.sparks(this.x, this.y, this.z, this.angle + Math.PI, 6, this.rgb, 240, Math.PI);
      game.particles.flash(this.x, this.y, this.z, 20, this.rgb, 0.1);
    }
  }
  light(L) { L.add(isoX(this.x, this.y), isoY(this.x, this.y) - this.z * 0.5, this.style === 'shard' ? 60 : 110, 0.5); }
  draw(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y) - this.z;
    const sv = worldAngleToScreen(this.angle, game.tmpV), l = Math.hypot(sv.x, sv.y) || 1;
    const ux = sv.x / l, uy = sv.y / l, L = this.len * (0.55 + 0.45 * l);
    const fade = Math.min(1, this.life / 0.08);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.globalAlpha = fade;
    ctx.strokeStyle = rgba(this.rgb, 0.5); ctx.lineWidth = this.w * 2.2;
    ctx.beginPath(); ctx.moveTo(sx - ux * L, sy - uy * L); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.strokeStyle = rgba(this.core, 0.95); ctx.lineWidth = this.w;
    ctx.beginPath(); ctx.moveTo(sx - ux * L * 0.75, sy - uy * L * 0.75); ctx.lineTo(sx, sy); ctx.stroke();
    if (this.style === 'arrow') {
      // ponta da flecha (losango de luz)
      const nx = -uy, ny = ux;
      ctx.fillStyle = rgba(this.core, 0.95);
      ctx.beginPath(); ctx.moveTo(sx + ux * 6, sy + uy * 6); ctx.lineTo(sx + nx * 2.4, sy + ny * 2.4); ctx.lineTo(sx - ux * 2, sy - uy * 2); ctx.lineTo(sx - nx * 2.4, sy - ny * 2.4); ctx.closePath(); ctx.fill();
    }
    GlowCache.draw(ctx, this.rgb, sx, sy, this.style === 'shard' ? 10 : 16 + this.w * 2, 0.75 * fade);
    ctx.restore();
  }
}
