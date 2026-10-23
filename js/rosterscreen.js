'use strict';
// ECLIPSE ZERO · Tela de personagens: seleção com os 5 cartões, armaduras e armas
// ---------------------------------------------------------------------------
// ELENCO NA INTERFACE: a página 'char' dos menus (js/menus.js), em três abas
// (Q/E no teclado, LB/RB no controle, clique nas abas):
//   PERSONAGENS  um cartão por ficha de CHARACTER_DEFS, nos estados ativo, disponível,
//                bloqueado (condição de RosterManager.describe) e em breve; a ficha
//                mostra lore, HABILIDADES (ícones de ABILITY_DEFS) e atributos (rating)
//   ARMADURAS    as 4 variações do personagem escolhido + as compartilhadas; confirmar
//                equipa (RosterManager.equipArmor). Por enquanto é só prévia: a troca
//                visual e os modificadores reais entram numa fase seguinte
//   ARMAS        a grade de WEAPON_DEFS, com o dono entre parênteses
// Abre no NOVO JOGO (com quem começar: o elenco de um jogo novo) e na PAUSA (troca de
// personagem, só com o setor liberado). Quem não tem arte própria aparece como uma
// silhueta na cor-tema (as mesmas da história: Backdrop.ally em js/storyscreen.js).
// ---------------------------------------------------------------------------
const ROSTER_TABS = [
  { id: 'chars', label: 'tabCharacters' },
  { id: 'armors', label: 'tabArmors' },
  { id: 'weapons', label: 'tabWeapons' },
];
// Barras de atributos da ficha: campo de 'rating' → texto da interface
const ROSTER_STATS = [['vida', 'statHp'], ['energia', 'statEnergy'], ['ataque', 'statAttack'], ['defesa', 'statDefense'], ['velocidade', 'statSpeed']];
const ABILITY_TYPE_TEXT = {
  melee: 'typeMelee', projectile: 'typeProjectile', aoe: 'typeAoe', buff: 'typeBuff', summon: 'typeSummon',
  trap: 'typeTrap', mobility: 'typeMobility', shield: 'typeShield', stealth: 'typeStealth',
};

// Estado de um personagem na seleção: 'active' | 'available' | 'locked' | 'soon'
// (bloqueado vence o "em breve": a condição de desbloqueio é o que o jogador precisa saber)
function rosterState(def) {
  if (!RosterManager.isUnlocked(def.id)) return 'locked';
  if (def.devStatus === 'coming_soon') return 'soon';
  return RosterManager.active === def.id ? 'active' : 'available';
}
const rosterShortName = (d) => d.name.split(' ')[0].toUpperCase();
// Cor-tema clareada (nomes e bordas acesas): '47,140,255' → mistura com branco
function rgbMix(rgb, k, to = 255) {
  return rgb.split(',').map((v) => Math.round(+v + (to - +v) * k)).join(',');
}
// Modificadores de uma armadura em texto ("+4% de defesa", "−4% de velocidade")
function armorModLines(a) {
  const m = (a && a.mods) || {}, out = [];
  const pct = (v) => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}`;
  const num = (v) => `${v > 0 ? '+' : '−'}${Math.abs(v)}`;
  if (m.hpBonus) out.push(t('modHp', { v: num(m.hpBonus) }));
  if (m.energyBonus) out.push(t('modEnergy', { v: num(m.energyBonus) }));
  if (m.armor) out.push(t('modArmor', { v: pct(m.armor) }));
  if (m.speedMult) out.push(t('modSpeed', { v: pct(m.speedMult) }));
  if (m.dmgMult) out.push(t('modDmg', { v: pct(m.dmgMult) }));
  if (m.crit) out.push(t('modCrit', { v: pct(m.crit) }));
  if (m.cdr) out.push(t('modCdr', { v: pct(m.cdr) }));
  return out;
}
// Atributos de uma arma em texto
function weaponStatLines(w) {
  if (w.armorRef) return armorModLines(ARMOR_DEFS[w.armorRef]);
  const s = w.stats || {}, out = [];
  if (s.dmg) out.push(t('wDmg', { v: s.dmg }));
  if (s.hits) out.push(t('wHits', { v: s.hits }));
  if (s.range) out.push(t('wRange', { v: s.range }));
  if (s.radius) out.push(t('wRadius', { v: s.radius }));
  if (s.dps) out.push(t('wDps', { v: s.dps }));
  if (s.duration) out.push(t('wDuration', { v: s.duration }));
  return out;
}
// Corta o texto com reticências até caber na largura
function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s.trimEnd() + '…';
}
// Brilho barato em volta de um contorno (sem shadowBlur, caro de refazer a cada quadro)
function strokeGlow(ctx, path, rgb, width) {
  ctx.save();
  for (const [lw, a] of [[width + 7, 0.1], [width + 3.5, 0.22]]) { path(); ctx.strokeStyle = rgba(rgb, a); ctx.lineWidth = lw; ctx.stroke(); }
  ctx.restore();
}
// Selo pequeno de estado ("ATIVO", "EM BREVE"...). Devolve a largura
function rosterChip(ctx, text, x, y, rgb, filled, h = 15) {
  ctx.save();
  ctx.font = `bold ${Math.round(h * 0.6)}px ${FONT_TITLE}`; ctx.letterSpacing = '1px';
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = filled ? rgba(rgb, 0.9) : 'rgba(3,6,14,0.86)';
  techPanelPath(ctx, x, y, w, h, 4); ctx.fill();
  ctx.strokeStyle = rgba(rgb, filled ? 1 : 0.85); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = filled ? '#ffffff' : rgba(rgbMix(rgb, 0.45), 1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 6, y + h / 2 + 0.5);
  ctx.letterSpacing = '0px';
  ctx.restore();
  return w;
}

// ---------------------------------------------------------------------------
// ÍCONES DAS HABILIDADES DO ELENCO (os que js/ui.js drawIcon ainda não tem).
// Mesmo padrão de drawIcon: caixa de 40 unidades centrada em (0, 0), traço de 3.
// ---------------------------------------------------------------------------
const ROSTER_ICONS = {
  // Tiro Preciso: mira com o ponto central
  aim(c) {
    c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(0, -19); c.lineTo(0, -6); c.moveTo(0, 6); c.lineTo(0, 19); c.moveTo(-19, 0); c.lineTo(-6, 0); c.moveTo(6, 0); c.lineTo(19, 0); c.stroke();
    c.beginPath(); c.arc(0, 0, 2.8, 0, TAU); c.fill();
  },
  // Armadilha de Plasma: mina achatada no chão soltando faíscas
  trap(c) {
    c.beginPath(); c.ellipse(0, 8, 17, 6.5, 0, 0, TAU); c.stroke();
    c.beginPath(); c.ellipse(0, 6.5, 7, 3, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(0, 1); c.lineTo(0, -10); c.moveTo(-8, 2); c.lineTo(-14, -8); c.moveTo(8, 2); c.lineTo(14, -8); c.stroke();
    for (const [x, y] of [[0, -15], [-16, -12], [16, -12]]) { c.beginPath(); c.arc(x, y, 2.4, 0, TAU); c.fill(); }
  },
  // Flecha Explosiva: flecha com a ponta estourando
  arrowBurst(c) {
    c.beginPath(); c.moveTo(-17, 17); c.lineTo(5, -5); c.stroke();
    c.beginPath(); c.moveTo(-17, 17); c.lineTo(-17, 9); c.moveTo(-17, 17); c.lineTo(-9, 17); c.stroke();
    c.beginPath(); c.moveTo(1, -9); c.lineTo(9, -9); c.lineTo(9, -1); c.closePath(); c.fill();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      c.beginPath(); c.moveTo(11 + Math.cos(a) * 4, -11 + Math.sin(a) * 4); c.lineTo(11 + Math.cos(a) * 9, -11 + Math.sin(a) * 9); c.stroke();
    }
  },
  // Foco de Batalha: estrela de oito pontas com o centro aceso
  focus(c) {
    c.beginPath();
    for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (i / 16) * TAU, r = i % 2 ? 7 : (i % 4 ? 13 : 18); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.stroke();
    c.beginPath(); c.arc(0, 0, 3.5, 0, TAU); c.fill();
  },
  // Golpe Pesado: martelo descendo com as linhas do impacto
  hammer(c) {
    c.save(); c.rotate(-0.65);
    c.fillRect(-12, -18, 24, 11); c.fillRect(-2.5, -8, 5, 26);
    c.restore();
    c.beginPath(); c.moveTo(10, 12); c.lineTo(18, 10); c.moveTo(8, 17); c.lineTo(16, 19); c.moveTo(4, 9); c.lineTo(9, 3); c.stroke();
  },
  // Escudo de Energia: escudo frontal com a carga correndo por dentro
  shieldFront(c) {
    c.beginPath(); c.moveTo(0, -17); c.lineTo(15, -11); c.quadraticCurveTo(15, 8, 0, 17); c.quadraticCurveTo(-15, 8, -15, -11); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(3, -10); c.lineTo(-5, 1); c.lineTo(1, 1); c.lineTo(-3, 11); c.lineTo(6, -2); c.lineTo(0, -2); c.closePath(); c.fill();
  },
  // Investida: duas setas largas com rastro
  charge(c) {
    for (const x of [-4, 7]) { c.beginPath(); c.moveTo(x - 6, -13); c.lineTo(x + 7, 0); c.lineTo(x - 6, 13); c.lineTo(x - 1, 0); c.closePath(); c.fill(); }
    c.beginPath(); c.moveTo(-19, -7); c.lineTo(-13, -7); c.moveTo(-20, 0); c.lineTo(-12, 0); c.moveTo(-19, 7); c.lineTo(-13, 7); c.stroke();
  },
  // Zona de Impacto: queda sobre o chão que se abre em ondas
  quake(c) {
    c.beginPath(); c.moveTo(0, -19); c.lineTo(0, -2); c.moveTo(-6, -8); c.lineTo(0, -2); c.lineTo(6, -8); c.stroke();
    c.beginPath(); c.ellipse(0, 9, 8, 3, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0, 9, 18, 7, 0, Math.PI * 0.05, Math.PI * 0.95); c.stroke();
    c.beginPath(); c.ellipse(0, 9, 18, 7, Math.PI, Math.PI * 0.05, Math.PI * 0.32); c.stroke();
    c.beginPath(); c.ellipse(0, 9, 18, 7, Math.PI, Math.PI * 0.68, Math.PI * 0.95); c.stroke();
  },
  // Drone de Suporte: drone com dois rotores disparando
  droneAlly(c) {
    c.beginPath(); c.arc(0, -3, 6, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-6, -4); c.lineTo(-13, -9); c.moveTo(6, -4); c.lineTo(13, -9); c.stroke();
    c.beginPath(); c.ellipse(-14, -11, 6, 2, 0, 0, TAU); c.stroke();
    c.beginPath(); c.ellipse(14, -11, 6, 2, 0, 0, TAU); c.stroke();
    c.setLineDash([3, 4]); c.beginPath(); c.moveTo(2, 4); c.lineTo(12, 17); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(14, 18, 2.5, 0, TAU); c.fill();
  },
  // Campo de Força: domo hexagonal sobre o chão
  dome(c) {
    c.beginPath(); c.arc(0, 10, 17, Math.PI, 0); c.stroke();
    c.beginPath(); c.moveTo(-20, 10); c.lineTo(20, 10); c.stroke();
    c.beginPath(); c.ellipse(0, 10, 8, 17, 0, Math.PI, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(-15, 2); c.lineTo(15, 2); c.stroke();
  },
  // Hack de Sistema: chip com os pinos e o código
  hack(c) {
    c.strokeRect(-10, -10, 20, 20);
    c.beginPath();
    for (const k of [-5, 0, 5]) { c.moveTo(k, -10); c.lineTo(k, -16); c.moveTo(k, 10); c.lineTo(k, 16); c.moveTo(-10, k); c.lineTo(-16, k); c.moveTo(10, k); c.lineTo(16, k); }
    c.stroke();
    c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(-2, -5); c.lineTo(-6, 0); c.lineTo(-2, 5); c.moveTo(2, -5); c.lineTo(6, 0); c.lineTo(2, 5); c.stroke();
  },
  // Cura de Emergência: cruz dentro do pulso
  heal(c) {
    c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.stroke();
    c.fillRect(-3.5, -10, 7, 20); c.fillRect(-10, -3.5, 20, 7);
  },
  // Furtividade: olho cortado
  stealth(c) {
    c.beginPath(); c.moveTo(-18, 0); c.quadraticCurveTo(0, -15, 18, 0); c.quadraticCurveTo(0, 15, -18, 0); c.stroke();
    c.beginPath(); c.arc(0, 0, 4.5, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-15, 15); c.lineTo(15, -15); c.stroke();
  },
  // Lâmina de Energia: lâmina em arco lançada, com rastro
  bladeThrow(c) {
    c.beginPath(); c.arc(4, 0, 13, -1.25, 1.25); c.arc(-2, 0, 9, 1.0, -1.0, true); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-19, -6); c.lineTo(-9, -6); c.moveTo(-21, 0); c.lineTo(-8, 0); c.moveTo(-19, 6); c.lineTo(-9, 6); c.stroke();
  },
  // Fúria Sombria: caminho de teleportes em zigue-zague até o golpe final
  shadowStrike(c) {
    c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(-17, 14); c.lineTo(-8, -8); c.lineTo(1, 10); c.lineTo(9, -10); c.stroke();
    c.setLineDash([]);
    for (const [x, y] of [[-17, 14], [-8, -8], [1, 10]]) { c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill(); }
    c.beginPath(); c.moveTo(7, -15); c.lineTo(18, -4); c.moveTo(13, -18); c.lineTo(19, -12); c.stroke();
  },
};
// Ícone de habilidade: os novos acima; os demais vêm de drawIcon (js/ui.js)
function drawAbilityIcon(ctx, kind, x, y, s, color) {
  const fn = ROSTER_ICONS[kind];
  if (!fn) { drawIcon(ctx, kind, x, y, s, color); return; }
  ctx.save();
  ctx.translate(x, y); ctx.scale(s / 40, s / 40);
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  fn(ctx);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ÍCONES DAS ARMAS E EQUIPAMENTOS (por 'kind' de WEAPON_DEFS): corpo em aço e as
// partes de energia na cor do dono. Caixa de 48 unidades centrada em (0, 0).
// ---------------------------------------------------------------------------
function drawWeaponIcon(ctx, kind, x, y, s, rgb, on, now) {
  const steel = on ? '#c5cfdd' : 'rgba(170,182,200,0.75)', dark = '#0b0f18', e = on ? 1 : 0.7;
  const glow = (gx, gy, r, a) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; GlowCache.draw(ctx, rgb, gx, gy, r, a * e); ctx.restore(); };
  ctx.save();
  ctx.translate(x, y); ctx.scale(s / 48, s / 48);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = steel; ctx.fillStyle = dark; ctx.lineWidth = 2;
  const energy = (a = 1) => rgba(rgb, a * e);
  const pulse = 0.75 + 0.25 * Math.sin(now * 3);
  switch (kind) {
    case 'sword': {
      glow(2, -2, 30, 0.35 * pulse);
      ctx.beginPath(); ctx.moveTo(-14, 14); ctx.lineTo(15, -17); ctx.lineTo(19, -19); ctx.lineTo(17, -15); ctx.lineTo(-11, 17); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = energy(0.95); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-10, 12); ctx.lineTo(16, -16); ctx.stroke();
      ctx.strokeStyle = steel; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(-19, 7); ctx.lineTo(-7, 19); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-15, 15); ctx.lineTo(-21, 21); ctx.stroke();
      break;
    }
    case 'grenade': {
      glow(0, 2, 22, 0.45 * pulse);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-9, -13, 18, 28, 7) : ctx.rect(-9, -13, 18, 28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = steel; ctx.fillRect(-6, -18, 12, 5);
      ctx.beginPath(); ctx.arc(9, -16, 4, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.fillStyle = energy(0.95); ctx.beginPath(); ctx.arc(0, 2, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = energy(0.7); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-9, -5); ctx.lineTo(9, -5); ctx.moveTo(-9, 9); ctx.lineTo(9, 9); ctx.stroke();
      break;
    }
    case 'bow': {
      glow(-2, 0, 26, 0.3 * pulse);
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, -21); ctx.quadraticCurveTo(-24, 0, -4, 21); ctx.stroke();
      ctx.strokeStyle = energy(0.9); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-4, -21); ctx.lineTo(6, 0); ctx.lineTo(-4, 21); ctx.stroke();
      ctx.strokeStyle = energy(1); ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-20, 0); ctx.stroke();
      ctx.fillStyle = energy(1); ctx.beginPath(); ctx.moveTo(-23, 0); ctx.lineTo(-16, -4); ctx.lineTo(-16, 4); ctx.closePath(); ctx.fill();
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(11, k * 4); ctx.stroke(); }
      break;
    }
    case 'spear': {
      glow(13, -13, 18, 0.5 * pulse);
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, 20); ctx.lineTo(8, -8); ctx.stroke();
      ctx.fillStyle = energy(0.95);
      ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(9, -15); ctx.lineTo(21, -21); ctx.lineTo(15, -9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = steel; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1, -7); ctx.lineTo(7, -1); ctx.stroke();
      ctx.strokeStyle = energy(0.7); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(-6, 6); ctx.stroke();
      break;
    }
    case 'cannon': {
      glow(19, -4, 16, 0.55 * pulse);
      ctx.beginPath(); ctx.rect(-20, -8, 22, 15); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(2, -6, 16, 11); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, 7); ctx.lineTo(-15, 15); ctx.lineTo(-8, 15); ctx.lineTo(-6, 7); ctx.stroke();
      ctx.strokeStyle = energy(0.95); ctx.lineWidth = 1.6;
      for (const k of [6, 10, 14]) { ctx.beginPath(); ctx.moveTo(k, -6); ctx.lineTo(k, 5); ctx.stroke(); }
      ctx.fillStyle = energy(1); ctx.fillRect(18, -4, 3, 7);
      ctx.fillStyle = energy(0.8); ctx.fillRect(-16, -4, 10, 3);
      break;
    }
    case 'orb': {
      glow(0, 0, 26, 0.45 * pulse);
      ctx.strokeStyle = energy(0.7); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(0, 0, 21, 8, -0.35 + now * 0.4, 0, TAU); ctx.stroke();
      ctx.strokeStyle = steel; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; ctx.save(); ctx.translate(Math.cos(a) * 15, Math.sin(a) * 15); ctx.rotate(a); ctx.beginPath(); ctx.rect(-3, -4, 6, 8); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = energy(1); ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      break;
    }
    case 'drone': {
      glow(0, 0, 20, 0.45 * pulse);
      ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(-19, -9); ctx.moveTo(9, -3); ctx.lineTo(19, -9); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-19, -11, 6, 2.2, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(19, -11, 6, 2.2, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = energy(0.85); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.stroke();
      ctx.fillStyle = energy(1); ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = steel; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, 11); ctx.lineTo(-7, 17); ctx.moveTo(5, 11); ctx.lineTo(7, 17); ctx.stroke();
      break;
    }
    case 'blades': {
      glow(0, 0, 24, 0.35 * pulse);
      for (const k of [-1, 1]) {
        ctx.save(); ctx.scale(k, 1);
        ctx.fillStyle = dark; ctx.strokeStyle = steel; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-14, 16); ctx.quadraticCurveTo(-6, -4, 14, -19); ctx.quadraticCurveTo(0, -1, -10, 19); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = energy(0.95); ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(-11, 13); ctx.quadraticCurveTo(-4, -3, 13, -18); ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'module': {
      glow(0, -2, 18, 0.4 * pulse);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke();
      ctx.fillStyle = energy(0.95); ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
      ctx.strokeStyle = energy(0.6); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, 21, -0.6, 0.6); ctx.moveTo(-21 * Math.cos(0.6), 21 * Math.sin(0.6)); ctx.arc(0, 0, 21, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
      break;
    }
    case 'armor': {
      glow(0, -2, 18, 0.35 * pulse);
      ctx.beginPath(); ctx.moveTo(-8, -16); ctx.lineTo(8, -16); ctx.lineTo(19, -10); ctx.lineTo(16, 4); ctx.lineTo(10, 2); ctx.lineTo(9, 18); ctx.lineTo(-9, 18); ctx.lineTo(-10, 2); ctx.lineTo(-16, 4); ctx.lineTo(-19, -10); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(9, 6); ctx.moveTo(-8, 12); ctx.lineTo(8, 12); ctx.moveTo(0, -16); ctx.lineTo(0, -6); ctx.stroke();
      ctx.fillStyle = energy(1); ctx.beginPath(); ctx.arc(0, -3, 3.5, 0, TAU); ctx.fill();
      break;
    }
    default:
      drawIcon(ctx, 'orb', 0, 0, 40, rgba(rgb, 1));
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// FIGURAS: silhueta na cor-tema (sem arte própria) e o Kael da ficha oficial
// ---------------------------------------------------------------------------
// Imagens de corpo inteiro para a lateral esquerda da seleção
const CHAR_PORTRAIT_PATHS = {
  kael:   'assets/selecionar_personagem/kael_full.png',
  lyra:   'assets/selecionar_personagem/lyra_full.png',
  drakos: 'assets/selecionar_personagem/drakos_full.png',
  sera:   'assets/selecionar_personagem/sera_full.png',
  orion:  'assets/selecionar_personagem/orion_full.png',
};
// Bases/pedestais holograficos (plataforma sob o personagem)
const CHAR_BASE_PATHS = {
  kael:   'assets/selecionar_personagem/kael_base.png',
  lyra:   'assets/selecionar_personagem/lyra_base.png',
  drakos: 'assets/selecionar_personagem/drakos_base.png',
  sera:   'assets/selecionar_personagem/sera_base.png',
  orion:  'assets/selecionar_personagem/orion_base.png',
};
// Rostos para os cartões dos personagens (aba inferior)
const CHAR_FACE_PATHS = {
  kael:   'assets/selecionar_personagem/rosto_kael.jpeg',
  lyra:   'assets/selecionar_personagem/rosto_lyra.jpeg',
  drakos: 'assets/selecionar_personagem/rosto_drakos.jpeg',
  sera:   'assets/selecionar_personagem/rosto_sera.jpeg',
  orion:  'assets/selecionar_personagem/rosto_orion.jpeg',
};
// Imagem de fundo do elenco (tela de seleção de personagem)
const ROSTER_BG_PATH = 'assets/selecionar_personagem/esquadrao_neon.png';

const RosterArt = {
  pool: new Map(),
  imgCache: new Map(),

  // Carrega (ou retorna do cache) uma HTMLImageElement
  getImg(src) {
    if (!src) return null;
    if (this.imgCache.has(src)) return this.imgCache.get(src);
    const img = new Image();
    img.src = encodeURI(src);
    this.imgCache.set(src, img);
    return img;
  },

  // Halo eliptico suave no chao sob a base (100% circular/eliptico, sem cantos ou caixas)
  drawFloorGlow(ctx, cx, footY, bw, rgb) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rx = bw * 0.52;
    const ry = rx * 0.25;
    const g = ctx.createRadialGradient(cx, footY, 0, cx, footY, rx);
    g.addColorStop(0,   `rgba(${rgb}, 0.28)`);
    g.addColorStop(0.35, `rgba(${rgb}, 0.12)`);
    g.addColorStop(0.7,  `rgba(${rgb}, 0.03)`);
    g.addColorStop(1,   `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, footY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // Fumaca holografica / nevoa energetica em movimento continuo na cor-tema
  // cx: centro X, footY: linha do chao, dw: largura, dh: altura, rgb: cor-tema
  drawSmoke(ctx, cx, footY, dw, dh, rgb, layer = 'back') {
    const t = Date.now() / 1000;
    const isFront = (layer === 'front');
    // Particulas separadas entre camada traseira e frontal
    const count  = isFront ? 12 : 22;
    const offset = isFront ? 22 : 0;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < count; i++) {
      const idx = i + offset;
      // Sementes deterministicas pseudo-aleatorias por indice
      const s1 = Math.sin(idx * 131.7) * 43758.5453;
      const s2 = Math.sin(idx * 313.3) * 43758.5453;
      const s3 = Math.sin(idx * 79.1)  * 43758.5453;
      const s4 = Math.sin(idx * 59.3)  * 43758.5453;
      const s5 = Math.sin(idx * 23.7)  * 43758.5453;
      const r1 = s1 - Math.floor(s1);
      const r2 = s2 - Math.floor(s2);
      const r3 = s3 - Math.floor(s3);
      const r4 = s4 - Math.floor(s4);
      const r5 = s5 - Math.floor(s5);

      // Velocidade de subida e ciclo continuo (0 -> 1)
      const speed = (isFront ? 0.08 : 0.09) + r1 * 0.11;
      const phase = r2 * Math.PI * 2;
      const cycle = (t * speed + phase) % 1;

      // Tamanho do puff de fumaca (expande conforme sobe)
      const baseR = dw * ((isFront ? 0.09 : 0.13) + r3 * 0.11);
      const r = baseR * (0.65 + cycle * 0.85);

      // Espalhamento horizontal e oscilacao suave
      const spread = dw * (isFront ? 0.52 : 0.44);
      const swaySpeed = 0.4 + r4 * 0.55;
      const swayAmp = dw * (0.05 + r5 * 0.07);
      const px = cx + (r4 - 0.5) * spread + Math.sin(t * swaySpeed + phase) * swayAmp;

      // Altura da subida (frente envolve pes e joelhos; tras sobe ate a parte superior do corpo)
      const maxRise = isFront ? (dh * 0.36) : (dh * 0.76);
      const py = footY + (dw * 0.04) - cycle * maxRise;

      // Opacidade fluida: fade in suave, permanencia, fade out ao dissipar
      const envelope = Math.sin(cycle * Math.PI);
      const maxAlpha = isFront ? (0.08 + r3 * 0.06) : (0.13 + r3 * 0.08);
      const a = envelope * maxAlpha;
      if (a <= 0.002) continue;

      // Gradiente radial volumetrico e suave
      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0,    `rgba(${rgb}, ${(a * 1.5).toFixed(3)})`);
      grad.addColorStop(0.30, `rgba(${rgb}, ${(a * 0.95).toFixed(3)})`);
      grad.addColorStop(0.65, `rgba(${rgb}, ${(a * 0.35).toFixed(3)})`);
      grad.addColorStop(1,    `rgba(${rgb}, 0)`);

      ctx.beginPath();
      // Leve achatamento horizontal dando aspecto de vapor denso
      ctx.ellipse(px, py, r, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  },

  // Desenha a base holografica + fumaca em movimento + corpo inteiro do personagem a esquerda.
  // cx: centro X, footY: linha do chao, h: altura do corpo.
  // Suporta troca dinamica de armadura (imagem especifica da armadura ou tint).
  // Retorna true se a imagem do corpo ja estava pronta.
  drawPortrait(ctx, def, cx, footY, h, maxX, armorDef) {
    let src = (armorDef && armorDef.png) ? armorDef.png : CHAR_PORTRAIT_PATHS[def.id];
    let img = this.getImg(src);
    if (!img || !img.complete || !img.naturalWidth) {
      src = CHAR_PORTRAIT_PATHS[def.id];
      img = this.getImg(src);
    }
    if (!img || !img.complete || !img.naturalWidth) return false;
    const rgb = hexToRgb(def.color);
    // Contain-fit: preserva o personagem inteiro sem cortar
    const aspect = img.naturalWidth / img.naturalHeight;
    let dh = h;
    let dw = dh * aspect;
    if (maxX && dw > maxX - 28) {
      const sc = (maxX - 28) / dw;
      dw = maxX - 28;
      dh *= sc;
    }
    const safeCx = maxX ? Math.min(cx, maxX - 14 - dw / 2) : cx;
    const dx = safeCx - dw / 2;
    const dy = footY - dh;

    // 1. BASE HOLOGRAFICA (plataforma sob o personagem)
    const bSrc = CHAR_BASE_PATHS[def.id];
    const bImg = bSrc ? this.getImg(bSrc) : null;
    const bw = dw * 1.15;
    if (bImg && bImg.complete && bImg.naturalWidth) {
      const bAspect = bImg.naturalWidth / bImg.naturalHeight;
      const bh = bw / bAspect;
      // Halo eliptico suave no chao sob a base (sem cantos ou caixas)
      this.drawFloorGlow(ctx, safeCx, footY, bw, rgb);
      ctx.drawImage(bImg, safeCx - bw / 2, footY - bh * 0.6, bw, bh);
    } else {
      // Fallback: pedestal procedural animado
      this.pedestal(ctx, rgb, safeCx, footY, h, Date.now() / 1000, rosterState(def) === 'locked');
    }

    // 2. FUMACA EM MOVIMENTO (CAMADA TRASEIRA)
    // Sobe da plataforma e envolve o personagem com nevoa holografica viva na cor-tema
    this.drawSmoke(ctx, safeCx, footY, dw, dh, rgb, 'back');

    // 3. CORPO INTEIRO DO PERSONAGEM (PINTURA DIRETA DA ARMADURA/PERSONAGEM)
    ctx.drawImage(img, dx, dy, dw, dh);

    // Se a armadura tiver tint e estiver usando o retrato padrão, aplica filtro de cor
    const tint = (armorDef && armorDef.visual && armorDef.visual.tint) || null;
    if (tint && (!armorDef || !armorDef.png)) {
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = tint;
      ctx.fillRect(dx, dy, dw, dh);
      ctx.restore();
    }

    // 4. FUMACA EM MOVIMENTO (CAMADA FRONTAL)
    // Nevoa sutil passando pela frente dos pes, botas e pedestal holografico
    this.drawSmoke(ctx, safeCx, footY, dw, dh, rgb, 'front');

    return true;
  },
  // Canvas de trabalho reaproveitado (só durante a pintura de uma camada), na resolução
  // real da tela. Devolve o canvas e o contexto já limpo e em unidades lógicas
  scratch(key, w, h) {
    const sc = clamp(game.scale, 0.5, 2), W = Math.max(2, Math.round(w * sc)), H = Math.max(2, Math.round(h * sc));
    let c = this.pool.get(key);
    if (!c) { c = document.createElement('canvas'); this.pool.set(key, c); }
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.setTransform(sc, 0, 0, sc, 0, 0);
    return { c, g, sc, W, H };
  },
  // Camada estática em cache (Backdrop.layer) na resolução real da tela: a figura é pintada
  // uma vez por combinação de personagem, estado, cor e tamanho; a cada quadro só é copiada
  cached(key, w, h, paint) {
    const sc = clamp(game.scale, 0.5, 2);
    return Backdrop.layer('rs-' + key, Math.max(2, Math.round(w * sc)), Math.max(2, Math.round(h * sc)), (g) => {
      g.setTransform(sc, 0, 0, sc, 0, 0);
      paint(g, sc);
    });
  },
  // Silhueta de um aliado (Backdrop.ally): corpo escuro com um leve tom da cor-tema,
  // contorno de neon nítido e brilho em volta. h: altura do corpo (a lança do Drakos
  // passa disso). o.state 'locked' = mais apagada; o.tint: cor de uma armadura (#hex)
  // no lugar da cor-tema; o.big: figura grande (linhas de holograma e pedestal)
  silhouette(ctx, def, cx, footY, h, now, o = {}) {
    const rgb = hexToRgb(def.color), dim = o.state === 'locked';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, rgb, cx, footY - h * 0.55, h * 0.8, dim ? 0.1 : 0.22);
    GlowCache.drawFlat(ctx, rgb, cx, footY, h * 0.42, dim ? 0.14 : 0.3);
    ctx.restore();
    if (o.big) this.pedestal(ctx, rgb, cx, footY, h, now, dim);
    const w = h * 1.12, H = h * 1.62, fy = h * 1.56, pad = Math.ceil(clamp(h / 18, 6, 22) * 1.6 + 4);
    const key = `sil-${def.id}-${dim ? 1 : 0}-${o.tint || ''}-${o.big ? 1 : 0}-${Math.round(h)}`;
    const L = this.cached(key, w + pad * 2, H + pad * 2, (g, sc) => this.paintSilhouette(g, sc, def, w, H, fy, h, pad, o.tint, dim, !!o.big));
    ctx.drawImage(L, cx - w / 2 - pad, footY - fy - pad, w + pad * 2, H + pad * 2);
  },
  paintSilhouette(g, sc, def, w, H, fy, h, pad, tintHex, dim, big) {
    const rgb = hexToRgb(def.color), tint = tintHex ? hexToRgb(tintHex) : rgb, lit = rgbMix(tint, 0.4), s = h / 112, pose = 0.8;
    // Máscara do contorno: a mesma figura sem os halos de luz (GlowCache desligado só
    // durante esta pintura), preenchida com a cor clara
    const M = this.scratch('silm', w, H), glowDraw = GlowCache.draw;
    GlowCache.draw = () => {};
    try { Backdrop.ally(M.g, def.id, w / 2, fy, s, pose, 'stand', 1); } finally { GlowCache.draw = glowDraw; }
    M.g.globalCompositeOperation = 'source-in';
    M.g.fillStyle = rgba(lit, 1); M.g.fillRect(0, 0, w, H);
    // A figura com as luzes, o corpo levemente tingido e (grande) as linhas de holograma
    const A = this.scratch('sil', w, H);
    Backdrop.ally(A.g, def.id, w / 2, fy, s, pose, 'stand', 1);
    A.g.globalCompositeOperation = 'source-atop';
    const body = A.g.createLinearGradient(0, fy - h, 0, fy);
    body.addColorStop(0, rgba(tint, dim ? 0.07 : 0.16)); body.addColorStop(1, rgba(tint, 0.02));
    A.g.fillStyle = body; A.g.fillRect(0, 0, w, H);
    if (big) { A.g.fillStyle = rgba(lit, dim ? 0.035 : 0.07); for (let y = 0; y < H; y += 4) A.g.fillRect(0, y, w, 1.2); }
    A.g.globalCompositeOperation = 'source-over';
    // Brilho (sombra), contorno (máscara deslocada) e a figura por cima
    const d = clamp(h / 240, 0.8, 1.6);
    g.save();
    g.translate(pad, pad);
    g.globalAlpha = dim ? 0.35 : 0.6;
    g.shadowColor = rgba(rgb, 1); g.shadowBlur = clamp(h / 18, 6, 22) * (dim ? 0.6 : 1) * sc;
    g.drawImage(M.c, 0, 0, w, H);
    g.shadowBlur = 0;
    g.globalAlpha = dim ? 0.5 : 0.95;
    for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d]]) g.drawImage(M.c, dx, dy, w, H);
    g.globalAlpha = 1;
    g.drawImage(A.c, 0, 0, w, H);
    g.restore();
  },
  // Pedestal holográfico sob a figura grande: anéis no chão e um feixe de luz subindo
  pedestal(ctx, rgb, cx, y, h, now, dim) {
    const a = dim ? 0.3 : 0.65, rx = h * 0.36;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createLinearGradient(0, y - h * 1.15, 0, y);
    beam.addColorStop(0, rgba(rgb, 0)); beam.addColorStop(1, rgba(rgb, dim ? 0.05 : 0.11));
    ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(cx - rx, y); ctx.lineTo(cx - rx * 0.55, y - h * 1.15); ctx.lineTo(cx + rx * 0.55, y - h * 1.15); ctx.lineTo(cx + rx, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(rgb, a); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(cx, y, rx, rx * 0.2, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(rgb, a * 0.45); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, y, rx * 1.35, rx * 0.27, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([12, 16]); ctx.lineDashOffset = -now * 24;
    ctx.strokeStyle = rgba(rgb, a * 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, y, rx * 1.17, rx * 0.235, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  // Kael de corpo inteiro (arte oficial) num retângulo, com a cor de uma armadura por
  // cima (prévia: mantém o brilho da arte e troca o tom). Em cache por cor e tamanho
  kaelBody(ctx, x, y, w, h, tintHex) {
    if (!kaelPortraitReady('body')) return false;
    const L = this.cached(`kael-${tintHex || 'base'}-${Math.round(w)}x${Math.round(h)}`, w, h, (g, sc) => {
      const im = KAEL_PORTRAIT.body, s = (h * 1.04) / im.naturalHeight, iw = im.naturalWidth * s;
      g.drawImage(im, (w - iw) / 2, -h * 0.01, iw, im.naturalHeight * s);
      if (tintHex) {
        g.globalCompositeOperation = 'color'; g.globalAlpha = 0.75;
        g.fillStyle = tintHex; g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.5; g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      softEdges(g, g.canvas.width, g.canvas.height, { l: 10, r: 10, b: 14 }, sc);
    });
    ctx.drawImage(L, x, y, w, h);
    return true;
  },
  // Ícone de arma em cache (sem a pulsação: a cada quadro só uma cópia)
  weaponIcon(ctx, kind, x, y, s, rgb, on) {
    const box = s * 1.5;
    const L = this.cached(`arma-${kind}-${rgb}-${on ? 1 : 0}-${Math.round(s)}`, box, box, (g) => drawWeaponIcon(g, kind, box / 2, box / 2, s, rgb, on, 0.5));
    ctx.drawImage(L, x - box / 2, y - box / 2, box, box);
  },
};

// ---------------------------------------------------------------------------
// TELA DE PERSONAGENS
// ---------------------------------------------------------------------------
class RosterScreen {
  constructor(menu) {
    this.menu = menu;
    this.mode = 'new';          // 'new' = NOVO JOGO · 'pause' = aberta pela pausa
    this.tab = 0;
    this.charSel = 0; this.armorSel = 0; this.weaponSel = 0;
    this.btn = 0;               // botão sob o mouse (0 = nenhum: o principal fica aceso)
    this.msg = null;            // aviso curto { text, rgb, t }
    this.selT = 0;              // tempo desde a última troca de seleção (barras animadas)
    this.hoverAb = -1;          // habilidade sob o mouse (dica)
  }
  get def() { return CHARACTER_DEFS[this.charSel] || CHARACTER_DEFS[0]; }
  get tabId() { return ROSTER_TABS[this.tab].id; }
  // Aviso curto ao lado dos botões (drawStatus): recusa em vermelho; confirmações passam a cor
  say(text, rgb = '255,120,140') { this.msg = { text, rgb, t: 3 }; }
  armorList() { return RosterManager.armorsFor(this.def.id); }
  weaponList() { return Object.keys(WEAPON_DEFS); }
  syncArmorSel() { this.armorSel = Math.max(0, this.armorList().indexOf(RosterManager.equippedArmor(this.def.id))); }
  // Troca de personagem na pausa: liberado fora de combate ou em novo jogo
  canSwap() {
    if (this.mode === 'new') return true;
    if (!game.waves) return true;
    if (game.world) return !game.world.inCombat();   // mundo aberto: fora de combate (acampamentos dormindo não contam)
    return game.waves.state === 'cleared' || (game.enemies && game.enemies.length === 0);
  }

  open(mode) {
    this.mode = mode;
    // Jogo novo: o elenco começa como o de uma jornada nova (só o personagem inicial)
    if (mode === 'new') RosterManager.reset();
    this.tab = 0; this.btn = 0; this.msg = null; this.selT = 0; this.hoverAb = -1;
    this.charSel = Math.max(0, CHARACTER_DEFS.findIndex((d) => d.id === RosterManager.active));
    this.syncArmorSel();
    this.weaponSel = 0;
  }
  setTab(i) {
    const n = ROSTER_TABS.length;
    this.tab = (i + n) % n; this.btn = 0; this.msg = null; this.hoverAb = -1; this.selT = 0;
    if (this.tabId === 'armors') this.syncArmorSel();
    if (this.tabId === 'weapons') this.weaponSel = Math.max(0, this.weaponList().indexOf(this.def.weapons[0]));
    game.audio.play('uiMove');
  }
  pickChar(i) {
    if (i === this.charSel) return;
    this.charSel = i; this.selT = 0; this.msg = null;
    this.syncArmorSel();
    game.audio.play('uiMove');
  }

  // ------------------------------------------------------------- geometria
  // Coluna da direita (abas, cartões, ficha e botões) e a figura grande à esquerda,
  // nas mesmas proporções da seleção aprovada; tudo cabe de 960 a 1760 de largura
  layout() {
    const x0 = Math.round(Math.max(VIEW_W * 0.4, 384));
    const avail = Math.min(VIEW_W - x0 - 36, 700), gap = avail < 600 ? 10 : 12;
    const cw = Math.floor(Math.min(124, (avail - 4 * gap) / 5)), w = cw * 5 + gap * 4, top = 112;
    const L = { x0, w, cw, gap, top, artCx: (x0 - 30) / 2 + 30 };
    const capW = 34, tw = (w - capW * 2 - 8) / ROSTER_TABS.length;
    L.capW = capW;
    L.tabs = ROSTER_TABS.map((tb, i) => ({ id: i, x: x0 + capW + 4 + i * tw, y: 64, w: tw - 6, h: 32 }));
    const tab = this.tabId;
    // Botões SEMPRE fixos no rodapé, nunca sobrepõem os cards; a linha de dicas de teclas fica
    // embaixo deles (VIEW_H − 13, ver draw), sem cobrir o CONFIRMAR
    const by = VIEW_H - 74;
    const b1 = 184, b2 = 150;
    let infoY, infoH;
    if (tab === 'chars') {
      const ch = Math.round(cw * 1.25);
      L.cards = CHARACTER_DEFS.map((d, i) => ({ id: i, x: x0 + i * (cw + gap), y: top, w: cw, h: ch }));
      infoY = top + ch + 16; infoH = by - infoY - 18;
      const sw = (w - 44) / 4;
      L.abil = [0, 1, 2, 3].map((k) => ({ id: k, x: x0 + 22 + k * sw, y: infoY + 196, w: sw, h: 98 }));
    } else if (tab === 'armors') {
      L.prev = { x: x0, y: top, w: 32, h: 30 };
      L.next = { x: x0 + Math.min(330, w * 0.6) - 32, y: top, w: 32, h: 30 };
      const armList = this.armorList();
      const cols = 6;
      L.cols = cols;
      const perPage = cols * 2; // 2 linhas por página
      L.perPage = perPage;
      this.armorPage = this.armorPage || 0;
      const totalPages = Math.max(1, Math.ceil(armList.length / perPage));
      if (this.armorPage >= totalPages) this.armorPage = totalPages - 1;
      L.totalPages = totalPages;
      L.armorPage = this.armorPage;
      const cardW = Math.floor((w - (cols - 1) * gap) / cols);
      const ch = Math.round(cardW * 1.28);
      const y = top + 38;
      const startIdx = this.armorPage * perPage;
      const pageItems = armList.slice(startIdx, startIdx + perPage);
      L.cards = pageItems.map((id, i) => ({ id: startIdx + i, x: x0 + (i % cols) * (cardW + gap), y: y + Math.floor(i / cols) * (ch + gap), w: cardW, h: ch }));
      const numRows = Math.min(2, Math.ceil(pageItems.length / cols));
      infoY = y + numRows * (ch + gap) + 8;
      infoH = by - infoY - 18;
      // Botões de paginação
      if (totalPages > 1) {
        L.pagePrev = { x: x0 + w - 110, y: top + 4, w: 24, h: 24 };
        L.pageNext = { x: x0 + w - 30, y: top + 4, w: 24, h: 24 };
        L.pageLabel = { x: x0 + w - 70, y: top + 16 };
      }
    } else {
      const wepList = this.weaponList();
      const cols = 6;
      L.cols = cols;
      const perPage = cols * 2;
      L.perPage = perPage;
      this.weaponPage = this.weaponPage || 0;
      const totalPages = Math.max(1, Math.ceil(wepList.length / perPage));
      if (this.weaponPage >= totalPages) this.weaponPage = totalPages - 1;
      L.totalPages = totalPages;
      L.weaponPage = this.weaponPage;
      const cardW = Math.floor((w - (cols - 1) * gap) / cols);
      const ch = 74;
      const startIdx = this.weaponPage * perPage;
      const pageItems = wepList.slice(startIdx, startIdx + perPage);
      L.cards = pageItems.map((id, i) => ({ id: startIdx + i, x: x0 + (i % cols) * (cardW + gap), y: top + Math.floor(i / cols) * (ch + gap), w: cardW, h: ch }));
      const numRows = Math.min(2, Math.ceil(pageItems.length / cols));
      infoY = top + numRows * (ch + gap) + 8;
      infoH = by - infoY - 18;
      if (totalPages > 1) {
        L.pagePrev = { x: x0 + w - 110, y: top - 30, w: 24, h: 24 };
        L.pageNext = { x: x0 + w - 30, y: top - 30, w: 24, h: 24 };
        L.pageLabel = { x: x0 + w - 70, y: top - 18 };
      }
    }
    L.info = { x: x0, y: infoY, w, h: Math.max(120, infoH) };
    let selectedItem = null;
    if (tab === 'armors') {
      const aid = this.armorList()[this.armorSel];
      selectedItem = aid ? ARMOR_DEFS[aid] : null;
    } else if (tab === 'weapons') {
      const wid = this.weaponList()[this.weaponSel];
      selectedItem = wid ? WEAPON_DEFS[wid] : null;
    }

    if (tab === 'armors' || tab === 'weapons') {
      const realInfoH = Math.max(120, infoH);
      const boxW = clamp(Math.round(w * 0.28), 185, 235);
      const boxH = Math.min(realInfoH - 16, 175);
      const boxX = x0 + Math.round((w - boxW) * 0.47);
      const boxY = infoY + Math.round((realInfoH - boxH) / 2);
      L.box3D = { x: boxX, y: boxY, w: boxW, h: boxH };
      L.btn3D = (selectedItem && selectedItem.glb) ? { x: x0 + w - 170, y: infoY + realInfoH - 34, w: 154, h: 26 } : null;
    } else {
      L.box3D = null;
      L.btn3D = null;
    }

    // Botões de ação: EQUIPAR agora disponível tanto em armaduras como armas
    L.btns = (tab === 'armors' || tab === 'weapons')
      ? [{ id: 'ok', label: t('equip'), icon: 'check', x: x0 + w - b2 - 12 - b1, y: by, w: b1, h: 44 },
        { id: 'back', label: t('back'), icon: 'back', x: x0 + w - b2, y: by, w: b2, h: 44 }]
      : [{ id: 'ok', label: t('confirm'), icon: 'check', x: x0 + w - b2 - 12 - b1, y: by, w: b1, h: 44 },
        { id: 'back', label: t('back'), icon: 'back', x: x0 + w - b2, y: by, w: b2, h: 44 }];
    L.status = { x: x0 + 4, y: by, w: L.btns[0].x - x0 - 18, h: 44 };
    return L;
  }

  // ------------------------------------------------------------- entrada
  update(dt, inp) {
    const M = this.menu, m = inp.mouse;
    this.selT += dt;
    if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
    if (inp.pressed.back || (this.mode === 'pause' && inp.pressed.pause)) { M.back(); return; }
    if (inp.pressed.tabPrev) { this.setTab(this.tab - 1); return; }
    if (inp.pressed.tabNext) { this.setTab(this.tab + 1); return; }
    const L = this.layout();

    // Rotação 3D interativa de 360 graus com arrasto do mouse
    if (L.box3D) {
      if (m.down && inRect(m, L.box3D)) {
        if (!this.dragging3D) {
          this.dragging3D = true;
          this.dragStartX = m.x;
          this.dragStartY = m.y;
          this.startYaw = this.previewYaw || 0;
          this.startPitch = this.previewPitch || 0.2;
        } else {
          this.previewYaw = this.startYaw + (m.x - this.dragStartX) * 0.02;
          this.previewPitch = clamp(this.startPitch + (m.y - this.dragStartY) * 0.02, -0.6, 0.75);
        }
      }
    }
    if (!m.down) {
      this.dragging3D = false;
      this.previewYaw = (this.previewYaw || 0) + dt * 1.5; // Auto-rotação contínua em 360°!
    }

    if (inp.pressed.view3d || (m.clicked && L.btn3D && inRect(m, L.btn3D)) || (m.clicked && L.box3D && inRect(m, { x: L.box3D.x + L.box3D.w - 76, y: L.box3D.y, w: 76, h: 26 }))) {
      this.open3DViewer();
      return;
    }
    if (m.clicked) {
      const tb = L.tabs.find((r) => inRect(m, r));
      if (tb) { if (tb.id !== this.tab) this.setTab(tb.id); return; }
    }
    if (m.moved || m.clicked) { this.btn = 0; L.btns.forEach((r, i) => { if (inRect(m, r)) this.btn = i + 1; }); }
    if (m.clicked) {
      const b = L.btns.find((r) => inRect(m, r));
      if (b) { if (b.id === 'back') M.back(); else this.act(); return; }
    }
    if (this.tabId === 'chars') this.updChars(inp, L);
    else if (this.tabId === 'armors') this.updArmors(inp, L);
    else this.updWeapons(inp, L);
  }
  open3DViewer() {
    let item = null;
    if (this.tabId === 'armors') {
      const aid = this.armorList()[this.armorSel];
      item = aid ? ARMOR_DEFS[aid] : null;
    } else if (this.tabId === 'weapons') {
      const wid = this.weaponList()[this.weaponSel];
      item = wid ? WEAPON_DEFS[wid] : null;
    }
    if (item && typeof GLBViewer !== 'undefined') {
      game.audio.play('uiSelect');
      GLBViewer.open(item);
    } else {
      game.audio.play('uiDeny');
    }
  }
  updChars(inp, L) {
    const m = inp.mouse, n = CHARACTER_DEFS.length;
    let s = this.charSel;
    if (inp.pressed.left) s = (s + n - 1) % n;
    if (inp.pressed.right) s = (s + 1) % n;
    if (m.moved || m.clicked) L.cards.forEach((r, i) => { if (inRect(m, r)) s = i; });
    this.pickChar(s);
    if (m.moved || m.clicked) { this.hoverAb = -1; L.abil.forEach((r, k) => { if (inRect(m, r)) this.hoverAb = k; }); }
    if (inp.pressed.confirm) this.act();
  }
  updArmors(inp, L) {
    const m = inp.mouse, n = this.armorList().length, nc = CHARACTER_DEFS.length;
    const cols = L.cols || 6;
    const perPage = L.perPage || 12;
    // Paginação: cliques nos botões de página
    if (L.pagePrev && m.clicked && inRect(m, L.pagePrev)) { this.armorPage = Math.max(0, (this.armorPage || 0) - 1); game.audio.play('uiMove'); return; }
    if (L.pageNext && m.clicked && inRect(m, L.pageNext)) { this.armorPage = Math.min((L.totalPages || 1) - 1, (this.armorPage || 0) + 1); game.audio.play('uiMove'); return; }
    // Setas ao lado do nome trocam o personagem
    if ((m.clicked && inRect(m, L.prev)) || inp.pressed.charPrev) { this.pickChar((this.charSel + nc - 1) % nc); return; }
    if ((m.clicked && inRect(m, L.next)) || inp.pressed.charNext) { this.pickChar((this.charSel + 1) % nc); return; }
    let s = this.armorSel;
    if (inp.pressed.left) s = (s + n - 1) % n;
    if (inp.pressed.right) s = (s + 1) % n;
    if (inp.pressed.up) {
      if (s >= cols) s -= cols;
      else this.pickChar((this.charSel + nc - 1) % nc);
    }
    if (inp.pressed.down) {
      if (s + cols < n) s += cols;
      else this.pickChar((this.charSel + 1) % nc);
    }
    if (m.moved || m.clicked) L.cards.forEach((r) => { if (inRect(m, r)) s = r.id; });
    if (s !== this.armorSel) { this.armorSel = s; this.msg = null; game.audio.play('uiMove'); }
    // Auto-paginação: garante que o item selecionado fique visível
    if (n > 0) this.armorPage = Math.floor(this.armorSel / perPage);
    if (inp.pressed.confirm) this.act();
  }
  updWeapons(inp, L) {
    const m = inp.mouse, n = this.weaponList().length;
    const cols = L.cols || 6;
    const perPage = L.perPage || 12;
    // Paginação: cliques nos botões de página
    if (L.pagePrev && m.clicked && inRect(m, L.pagePrev)) { this.weaponPage = Math.max(0, (this.weaponPage || 0) - 1); game.audio.play('uiMove'); return; }
    if (L.pageNext && m.clicked && inRect(m, L.pageNext)) { this.weaponPage = Math.min((L.totalPages || 1) - 1, (this.weaponPage || 0) + 1); game.audio.play('uiMove'); return; }
    let s = this.weaponSel;
    if (inp.pressed.left) s = (s + n - 1) % n;
    if (inp.pressed.right) s = (s + 1) % n;
    if (inp.pressed.up && s >= cols) s -= cols;
    if (inp.pressed.down && s + cols < n) s = Math.min(n - 1, s + cols);
    if (m.moved || m.clicked) L.cards.forEach((r) => { if (inRect(m, r)) s = r.id; });
    if (s !== this.weaponSel) { this.weaponSel = s; this.selT = 0; this.msg = null; game.audio.play('uiMove'); }
    // Auto-paginação
    if (n > 0) this.weaponPage = Math.floor(this.weaponSel / perPage);
    if (inp.pressed.confirm) this.act();
  }
  // Confirmar: escolher o personagem, equipar a armadura ou (armas) só avisar
  act() {
    if (this.tabId === 'chars') this.confirmChar();
    else if (this.tabId === 'armors') this.equipSelected();
    else this.equipSelectedWeapon();
  }
  equipSelectedWeapon() {
    const d = this.def, wid = this.weaponList()[this.weaponSel], w = WEAPON_DEFS[wid];
    if (!w) return;
    if (!RosterManager.isUnlocked(d.id)) { game.audio.play('uiDeny'); this.say(t('charLockedWeapon', { name: d.name })); return; }
    if (!RosterManager.isWeaponUnlocked(wid)) { game.audio.play('uiDeny'); this.say(t('weaponLockedMsg', { cond: RosterManager.describe(w.unlock) })); return; }
    if (w.owner !== 'all' && w.owner !== d.id) { game.audio.play('uiDeny'); this.say(t('weaponsFixed'), '150,190,255'); return; }
    if (RosterManager.equippedWeapon(d.id) === wid) { game.audio.play('uiDeny'); this.say(t('weaponAlready'), '150,190,255'); return; }
    if (RosterManager.equipWeapon(d.id, wid)) {
      game.audio.play('uiSelect');
      this.say(t('weaponEquippedMsg', { weapon: w.name, name: d.name }), hexToRgb(d.color));
      if (this.mode === 'pause') game.saveGame();
    }
  }
  confirmChar() {
    const d = this.def, st = rosterState(d);
    if (st === 'locked') { game.audio.play('uiDeny'); this.say(t('lockedMsg', { name: d.name, cond: RosterManager.describe(d.unlock) })); return; }
    if (st === 'soon') { game.audio.play('uiDeny'); this.say(t('comingSoonMsg', { name: d.name })); return; }
    if (this.mode === 'new') {
      // Jogo novo com o personagem e as armaduras escolhidos aqui
      game.audio.play('uiSelect');
      RosterManager.setActive(d.id);
      game.newGame(this.menu.newSlot, RosterManager.toJSON());
      return;
    }
    if (st === 'active') { game.audio.play('uiDeny'); this.say(t('alreadyActive', { name: d.name }), '150,190,255'); return; }
    if (!this.canSwap()) { game.audio.play('uiDeny'); this.say(t('combatLocked')); return; }
    // RosterManager avisa o jogo (characterChanged), que recria o Player com a nova ficha
    if (RosterManager.setActive(d.id)) { game.audio.play('uiSelect'); this.say(t('switched', { name: d.name }), hexToRgb(d.color)); }
  }
  equipSelected() {
    const d = this.def, id = this.armorList()[this.armorSel], a = ARMOR_DEFS[id];
    if (!a) return;
    if (!RosterManager.isUnlocked(d.id)) { game.audio.play('uiDeny'); this.say(t('charLockedArmor', { name: d.name })); return; }
    if (!RosterManager.isArmorUnlocked(id)) { game.audio.play('uiDeny'); this.say(t('armorLockedMsg', { cond: RosterManager.describe(a.unlock) })); return; }
    if (RosterManager.equippedArmor(d.id) === id) { game.audio.play('uiDeny'); this.say(t('armorAlready'), '150,190,255'); return; }
    if (RosterManager.equipArmor(d.id, id)) {
      game.audio.play('uiSelect');
      this.say(t('armorEquippedMsg', { armor: a.name, name: d.name }), hexToRgb(d.color));
      if (this.mode === 'pause') game.saveGame();
    }
  }

  // ------------------------------------------------------------- desenho
  draw(ctx, now) {
    const M = this.menu, L = this.layout(), tab = this.tabId;
    if (this.mode === 'pause') { ctx.fillStyle = 'rgba(1,3,8,0.86)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    else {
      // Fundo artístico do elenco — tenta a imagem real, fallback para o procedural
      const bgImg = RosterArt.getImg(ROSTER_BG_PATH);
      if (bgImg && bgImg.complete && bgImg.naturalWidth) {
        // Cobre a tela mantendo proporção
        const iw = bgImg.naturalWidth, ih = bgImg.naturalHeight;
        const sc = Math.max(VIEW_W / iw, VIEW_H / ih);
        const dw = iw * sc, dh = ih * sc;
        ctx.drawImage(bgImg, (VIEW_W - dw) / 2, (VIEW_H - dh) / 2, dw, dh);
        ctx.fillStyle = 'rgba(1,3,8,0.68)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      } else {
        M.drawSkyBg(ctx, now);
        Backdrop.drawRain(ctx, now, 0.5);
        ctx.fillStyle = 'rgba(1,3,8,0.4)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    }
    // Figura grande: o personagem escolhido (na aba de armas, o dono da arma)
    let fd = this.def;
    if (tab === 'weapons') { const w = WEAPON_DEFS[this.weaponList()[this.weaponSel]]; if (w && CHARACTERS_BY_ID[w.owner]) fd = CHARACTERS_BY_ID[w.owner]; }
    this.drawFigure(ctx, fd, L, now);
    Backdrop.drawMotes(ctx, now);
    M.drawHeader(ctx, this.mode === 'pause' ? t('rosterTitle') : t('selectTitle'));
    this.drawTabs(ctx, L);
    if (tab === 'chars') this.drawChars(ctx, L, now);
    else if (tab === 'armors') this.drawArmors(ctx, L, now);
    else this.drawWeapons(ctx, L, now);
    this.drawStatus(ctx, L);
    const okOn = tab === 'chars' ? this.okEnabled() : true;
    L.btns.forEach((r, i) => {
      const lit = this.btn === i + 1 || (this.btn === 0 && i === 0 && (r.id === 'back' || okOn));
      M.drawButton(ctx, r, r.label, r.icon, lit, { size: 14, disabled: r.id === 'ok' && !okOn });
    });
    const hints = [[['#Q', '#E'], ['@lb', '@rb'], t('changeTab')]];
    if (tab === 'chars') hints.push([['#←', '#→'], ['@dpad'], t('choose')], [['#Enter'], ['@a'], t('confirm')]);
    else if (tab === 'armors') hints.push([['#←', '#→', '#↑', '#↓'], ['@dpad'], t('armors')], [['#Enter'], ['@a'], t('equip')], [['#V'], ['@y'], '3D']);
    else hints.push([['#←', '#→', '#↑', '#↓'], ['@dpad'], t('choose')], [['#Enter'], ['@a'], t('equip')], [['#V'], ['@y'], '3D']);
    hints.push([['#Esc'], ['@b'], t('back')]);
    M.drawHints(ctx, hints, VIEW_W - 34, VIEW_H - 13);
    if (tab === 'chars' && this.hoverAb >= 0) this.drawAbilityTip(ctx, L);
  }
  // CONFIRMAR aceso só quando faz algo: no jogo novo, personagem escolhível; na pausa,
  // outro personagem escolhível com o setor liberado
  okEnabled() {
    const st = rosterState(this.def);
    if (this.mode === 'new') return st === 'active' || st === 'available';
    return st === 'available' && this.canSwap();
  }

  // Figura grande à esquerda: a arte oficial do Kael (como na seleção aprovada) ou a
  // silhueta estilizada na cor-tema; nunca vazio
  drawFigure(ctx, d, L, now) {
    const hx = L.artCx;
    // Clipa a figura à esquerda para nunca invadir os painéis da direita
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, L.x0 - 8, VIEW_H); ctx.clip();
    const footY = VIEW_H * 0.87;
    const h = Math.min(VIEW_H * 0.74, (L.x0 - 20) * 1.4);
    const rgb = hexToRgb(d.color);

    // 1. Fogo / Aura em chamas na cor do personagem + Fumaça saindo (fundo)
    this.drawFigureFireAuraAndSmoke(ctx, d, hx, footY, h, rgb, now, false);

    // Armadura ativa (se estiver na aba de armaduras, usa a selecionada; caso contrário, a equipada)
    const tab = this.tabId;
    let currentArmorDef = null;
    if (tab === 'armors') {
      const aid = this.armorList()[this.armorSel];
      currentArmorDef = aid ? ARMOR_DEFS[aid] : null;
    } else {
      const aid = RosterManager.equippedArmor(d.id);
      currentArmorDef = aid ? ARMOR_DEFS[aid] : null;
    }

    // Primeiro: tenta o retrato real (imagem da pasta Selecionar_Personagem ou imagem da armadura)
    if (RosterArt.drawPortrait(ctx, d, hx, footY, h, L.x0 - 8, currentArmorDef)) {
      this.drawFigureFireAuraAndSmoke(ctx, d, hx, footY, h, rgb, now, true);
      ctx.restore();
      return;
    }
    // Fallback para o Kael: arte 2D oficial ou modelo 3D
    if (d.art === 'kael') {
      const bh = VIEW_H * 0.86, bw = bh * 310 / 584;
      const body = imageLayer('kael-corpo', KAEL_PORTRAIT.body, bw, bh, { l: 80, r: 80, t: 90, b: 80 });
      if (body) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        GlowCache.drawFlat(ctx, '60,130,255', hx, VIEW_H * 0.92, 200, 0.35);
        ctx.restore();
        ctx.drawImage(body, hx - bw / 2, VIEW_H * 0.1, bw, bh);
      } else if (!this.menu.drawKael3D(ctx, now, hx, VIEW_H * 0.9, 6)) {
        drawCapaLayer(ctx, 'personagem', 0, 0, L.x0 - 30, VIEW_H, 580, 330, 1.6, { r: 220, b: 220 });
      }
      this.drawFigureFireAuraAndSmoke(ctx, d, hx, footY, h, rgb, now, true);
      ctx.restore();
      return;
    }
    const st = rosterState(d);
    // Fallback: silhueta procedural enquanto a imagem de rosto carrega
    RosterArt.silhouette(ctx, d, hx, footY, Math.min(VIEW_H * 0.52, (L.x0 - 40) * 1.05), now, { state: st, big: true });
    this.drawFigureFireAuraAndSmoke(ctx, d, hx, footY, h, rgb, now, true);

    // Placa sob a figura: bloqueado (com a condição) ou em breve
    if (st !== 'locked' && st !== 'soon') { ctx.restore(); return; }
    const text = st === 'locked' ? `${t('locked')} · ${RosterManager.describe(d.unlock)}` : t('comingSoon');
    ctx.save();
    ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
    const tw = ctx.measureText(text).width, pw = tw + 52, px = clamp(hx - pw / 2, 12, L.x0 - pw - 12), py = footY + 28;
    ctx.fillStyle = 'rgba(3,6,14,0.88)'; techPanelPath(ctx, px, py, pw, 28, 7); ctx.fill();
    ctx.strokeStyle = rgba(rgb, 0.75); ctx.lineWidth = 1; ctx.stroke();
    drawMenuIcon(ctx, 'lock', px + 20, py + 14, 15, rgba(rgbMix(rgb, 0.35), 1));
    ctx.fillStyle = st === 'locked' ? '#dfe6f2' : rgba(rgbMix(rgb, 0.45), 1); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, px + 36, py + 15);
    ctx.letterSpacing = '0px';
    ctx.restore();
    ctx.restore(); // fecha o clip de drawFigure
  }

  // Aura estilo fogo na cor do personagem + fumaça e vapor estéticos
  drawFigureFireAuraAndSmoke(ctx, d, hx, footY, h, rgb, now, foreground) {
    ctx.save();
    if (!foreground) {
      // 1. Base energética no solo (elipse com pulso de luz)
      ctx.globalCompositeOperation = 'lighter';
      if (typeof GlowCache !== 'undefined') {
        GlowCache.drawFlat(ctx, rgb, hx, footY, h * 0.42, 0.42 + 0.14 * Math.sin(now * 3.4));
      }
      ctx.strokeStyle = rgba(rgb, 0.65 + 0.2 * Math.sin(now * 2.8));
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(hx, footY, h * 0.35, 14, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = rgba(rgbMix(rgb, 0.5), 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(hx, footY, h * 0.22, 9, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Fumaça saindo do personagem (volumétrica e ascendente)
      ctx.globalCompositeOperation = 'source-over';
      const smokePuffs = 9;
      for (let i = 0; i < smokePuffs; i++) {
        const offsetT = (now * 0.45 + i / smokePuffs) % 1.0;
        const py = footY - offsetT * (h * 0.95);
        const sway = Math.sin(now * 2.2 + i * 1.5) * (18 + offsetT * 30);
        const px = hx + (i % 2 === 0 ? 1 : -1) * (12 + (i % 3) * 16) + sway;
        const radius = (16 + offsetT * 38) * (h / 380);
        const alpha = Math.sin(offsetT * Math.PI) * 0.28;

        const radGrad = ctx.createRadialGradient(px, py, radius * 0.1, px, py, radius);
        radGrad.addColorStop(0, rgba(rgb, alpha * 0.7));
        radGrad.addColorStop(0.4, `rgba(18, 25, 40, ${alpha * 0.5})`);
        radGrad.addColorStop(1, 'rgba(4, 8, 16, 0)');

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Aura estilo Fogo em chamas na cor do personagem
      ctx.globalCompositeOperation = 'lighter';
      const flameTongues = 11;
      for (let k = -5; k <= 5; k++) {
        const factor = 1.0 - Math.abs(k) / 6.0;
        const flameH = (h * 0.72) * factor * (0.82 + 0.26 * Math.sin(now * 4.6 + k * 1.4));
        const baseOffset = k * (h * 0.052);
        const swayBase = Math.sin(now * 3.2 + k * 0.8) * 8;
        const swayTip = Math.sin(now * 5.8 + k * 1.2) * (14 + factor * 16);
        const bx = hx + baseOffset + swayBase;
        const tx = hx + baseOffset * 0.5 + swayTip;

        const grad = ctx.createLinearGradient(0, footY, 0, footY - flameH);
        grad.addColorStop(0, rgba(rgb, 0.75 * factor));
        grad.addColorStop(0.35, rgba(rgbMix(rgb, 0.45), 0.58 * factor));
        grad.addColorStop(0.75, rgba(rgbMix(rgb, 0.8), 0.3 * factor));
        grad.addColorStop(1, rgba('255, 255, 255', 0));

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(bx - 18 * factor, footY);
        ctx.bezierCurveTo(
          bx - 24 * factor + Math.cos(now * 4.8 + k) * 10, footY - flameH * 0.45,
          tx - 12 + Math.sin(now * 6.2 + k) * 12, footY - flameH * 0.8,
          tx, footY - flameH
        );
        ctx.bezierCurveTo(
          tx + 12 + Math.cos(now * 6.2 + k) * 12, footY - flameH * 0.8,
          bx + 24 * factor + Math.sin(now * 4.8 + k) * 10, footY - flameH * 0.45,
          bx + 18 * factor, footY
        );
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // 4. Primeiro Plano: Faíscas / Brasas de fogo subindo cintilantes
      ctx.globalCompositeOperation = 'lighter';
      const emberCount = 28;
      for (let i = 0; i < emberCount; i++) {
        const seed = i * 13.37;
        const t = (now * 0.65 + (i / emberCount)) % 1.0;
        const ey = footY - t * (h * 0.98);
        const sway = Math.sin(now * 3.8 + seed) * (26 * Math.sin(t * Math.PI));
        const ex = hx + ((Math.sin(seed * 7) * 0.5)) * (h * 0.36) + sway;
        const eAlpha = Math.sin(t * Math.PI) * (0.6 + 0.4 * Math.sin(now * 14 + seed));
        const eRadius = 1.2 + (seed % 2.4);

        ctx.fillStyle = (i % 3 === 0) ? `rgba(255,255,255,${eAlpha})` : rgba(rgbMix(rgb, 0.65), eAlpha);
        ctx.beginPath();
        ctx.arc(ex, ey, eRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pequeno vapor térmico na frente dos pés e juntas
      const steamCount = 4;
      for (let s = 0; s < steamCount; s++) {
        const stT = (now * 0.8 + s / steamCount) % 1.0;
        const sy = footY - 8 - stT * 42;
        const sx = hx + (s % 2 === 0 ? -1 : 1) * (18 + s * 8) + Math.sin(now * 3 + s) * 6;
        const sRad = 10 + stT * 18;
        const sAlpha = (1.0 - stT) * 0.22;
        const sGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, sRad);
        sGrad.addColorStop(0, rgba(rgbMix(rgb, 0.5), sAlpha));
        sGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, sRad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Abas com as teclas Q/E (ou LB/RB) nas pontas
  drawTabs(ctx, L) {
    const pad = game.input.lastDevice === 'pad', kind = game.input.pad ? game.input.pad.kind : 'xbox';
    const cy = L.tabs[0].y + L.tabs[0].h / 2;
    ctx.save();
    const lw = drawTokens(ctx, pad ? ['@lb'] : ['#Q'], 0, 0, 20, kind, '', true);
    drawTokens(ctx, pad ? ['@lb'] : ['#Q'], L.x0 + (L.capW - lw) / 2, cy, 20, kind);
    const rw = drawTokens(ctx, pad ? ['@rb'] : ['#E'], 0, 0, 20, kind, '', true);
    drawTokens(ctx, pad ? ['@rb'] : ['#E'], L.x0 + L.w - L.capW + (L.capW - rw) / 2, cy, 20, kind);
    L.tabs.forEach((r, i) => {
      const sel = i === this.tab;
      if (sel) {
        const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
        g.addColorStop(0, 'rgba(40,110,255,0.8)'); g.addColorStop(1, 'rgba(20,60,170,0.45)');
        ctx.fillStyle = g; techPanelPath(ctx, r.x, r.y, r.w, r.h, 7); ctx.fill();
        strokeGlow(ctx, () => techPanelPath(ctx, r.x, r.y, r.w, r.h, 7), '70,150,255', 1.3);
        ctx.strokeStyle = 'rgba(160,210,255,0.95)'; ctx.lineWidth = 1.3; ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(4,9,20,0.66)'; techPanelPath(ctx, r.x, r.y, r.w, r.h, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(61,139,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.font = `${sel ? 'bold ' : ''}13px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
      ctx.fillStyle = sel ? '#ffffff' : '#c9d6ea'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t(ROSTER_TABS[i].label), r.x + r.w / 2 + 1, r.y + r.h / 2 + 1);
      ctx.letterSpacing = '0px';
    });
    ctx.restore();
  }

  // Nome (com brilho), selo de estado e a linha de baixo (título ou dono). O nome encolhe
  // para caber na coluna; se nem assim o selo couber ao lado, ele vai para a linha de baixo
  titleRow(ctx, I, name, sub, rgb, chip, maxW) {
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1px';
    const cw = chip ? ctx.measureText(chip[0]).width + 24 : 0;
    let size = 20, nw = 0;
    for (size of [20, 18, 16, 15]) {
      ctx.font = `bold ${size}px ${FONT_TITLE}`; ctx.letterSpacing = size > 16 ? '3px' : '2px';
      nw = ctx.measureText(name).width;
      if (nw + cw <= maxW) break;
    }
    glowText(ctx, name, I.x + 22, I.y + 30, rgba(rgbMix(rgb, 0.6), 1), rgba(rgb, 0.8), 10);
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = rgba(rgb, 1);
    ctx.fillText(sub, I.x + 22, I.y + 54);
    const sw = ctx.measureText(sub).width;
    ctx.letterSpacing = '0px';
    if (chip) {
      if (nw + cw <= maxW) rosterChip(ctx, chip[0], I.x + 22 + nw + 12, I.y + 22, chip[2], chip[1], 16);
      else rosterChip(ctx, chip[0], I.x + 22 + sw + 12, I.y + 46, chip[2], chip[1], 16);
    }
    ctx.restore();
  }

  // ----------------------------------------------------- aba PERSONAGENS
  drawChars(ctx, L, now) {
    L.cards.forEach((r, i) => this.drawCharCard(ctx, r, CHARACTER_DEFS[i], i === this.charSel, now));
    this.drawCharInfo(ctx, L, now);
  }
  // Moldura comum dos cartões: fundo, faixa do nome e borda neon na cor-tema
  cardFrame(ctx, r, rgb, sel, dark, label, paint) {
    const ph = r.h - 28;
    ctx.save();
    const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    bg.addColorStop(0, 'rgba(5,9,19,0.95)'); bg.addColorStop(1, rgba(rgb, dark ? 0.1 : 0.22));
    ctx.fillStyle = bg; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, ph); ctx.clip();
    paint(ph);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = sel ? rgba(rgb, 0.85) : 'rgba(8,14,28,0.95)';
    ctx.fillRect(r.x, r.y + ph, r.w, 28);
    // O nome encolhe até caber na faixa ("EXOESQUELETO" num cartão estreito)
    for (const [fs, ls] of [[13, 2], [12, 1.5], [11, 1], [10, 0.5]]) {
      ctx.font = `bold ${fs}px ${FONT_TITLE}`; ctx.letterSpacing = `${ls}px`;
      if (ctx.measureText(label).width <= r.w - 8) break;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = sel ? '#ffffff' : dark ? 'rgba(200,214,235,0.62)' : 'rgba(220,230,245,0.88)';
    ctx.fillText(label, r.x + r.w / 2 + 1, r.y + r.h - 13);
    ctx.letterSpacing = '0px';
    if (sel) strokeGlow(ctx, () => { ctx.beginPath(); ctx.rect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }, rgb, 2);
    ctx.strokeStyle = sel ? rgba(rgbMix(rgb, 0.45), 1) : rgba(rgb, dark ? 0.3 : 0.55); ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    ctx.restore();
  }
  // Cadeado no meio do retrato, com a condição (bloqueado) ou "EM BREVE"
  lockOverlay(ctx, r, ph, rgb, locked, text) {
    ctx.fillStyle = locked ? 'rgba(2,4,9,0.5)' : 'rgba(2,4,9,0.2)'; ctx.fillRect(r.x, r.y, r.w, ph);
    const cx = r.x + r.w / 2, cy = r.y + ph * 0.44;
    ctx.fillStyle = 'rgba(3,6,14,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(rgb, locked ? 0.6 : 0.95); ctx.lineWidth = 1.5; ctx.stroke();
    drawMenuIcon(ctx, 'lock', cx, cy, 18, locked ? 'rgba(205,214,230,0.85)' : rgba(rgbMix(rgb, 0.3), 1));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!locked) {
      ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
      ctx.fillStyle = 'rgba(2,4,9,0.75)'; ctx.fillRect(r.x, cy + 22, r.w, 18);
      ctx.fillStyle = rgba(rgbMix(rgb, 0.5), 1); ctx.fillText(text, cx + 1, cy + 31.5);
      ctx.letterSpacing = '0px';
    } else {
      ctx.font = `10px ${FONT_UI}`;
      const lines = wrapText(ctx, text, r.w - 14).slice(0, 2);
      ctx.fillStyle = 'rgba(2,4,9,0.72)'; ctx.fillRect(r.x, cy + 21, r.w, lines.length * 12 + 6);
      ctx.fillStyle = 'rgba(222,230,244,0.92)';
      lines.forEach((ln, k) => ctx.fillText(ln, cx, cy + 30 + k * 12));
    }
  }
  drawCharCard(ctx, r, d, sel, now) {
    const st = rosterState(d), rgb = hexToRgb(d.color), dark = st === 'locked' || st === 'soon';
    this.cardFrame(ctx, r, rgb, sel, dark, rosterShortName(d), (ph) => {
      if (d.art === 'kael') {
        if (kaelPortraitReady('face')) {
          const im = KAEL_PORTRAIT.face, s = Math.max(r.w / im.naturalWidth, ph / im.naturalHeight);
          ctx.drawImage(im, r.x + (r.w - im.naturalWidth * s) / 2, r.y, im.naturalWidth * s, im.naturalHeight * s);
        } else if (!drawCapaCrop(ctx, 'rosto', r.x - 6, r.y, r.w + 12, r.w + 12)) drawMenuIcon(ctx, 'sword', r.x + r.w / 2, r.y + 60, 40, PAL.accent);
      } else {
        // Tenta o rosto JPEG do personagem; fallback para a silhueta procedural
        const pSrc = CHAR_FACE_PATHS[d.id];
        const pImg = pSrc ? RosterArt.getImg(pSrc) : null;
        if (pImg && pImg.complete && pImg.naturalWidth) {
          // Cover-fit: ocupa toda a área do cartão (recortando se necessário)
          const s = Math.max(r.w / pImg.naturalWidth, ph / pImg.naturalHeight);
          const pw = pImg.naturalWidth * s, pph = pImg.naturalHeight * s;
          ctx.drawImage(pImg, r.x + (r.w - pw) / 2, r.y + (ph - pph) / 2, pw, pph);
          // Gradiente descendente na cor-tema na metade inferior (legibilidade da faixa de nome)
          const rg = ctx.createLinearGradient(0, r.y + ph * 0.45, 0, r.y + ph);
          rg.addColorStop(0, 'rgba(1,3,8,0)'); rg.addColorStop(1, rgba(rgb, 0.72));
          ctx.fillStyle = rg; ctx.fillRect(r.x, r.y, r.w, ph);
        } else {
          RosterArt.silhouette(ctx, d, r.x + r.w / 2, r.y + ph + 6, ph * 0.8, now, { state: st });
        }
      }
      if (dark) this.lockOverlay(ctx, r, ph, rgb, st === 'locked', st === 'locked' ? RosterManager.describe(d.unlock) : t('comingSoon'));
    });
    // Selo do estado no topo do cartão
    const chip = { active: [t('active'), true], available: [t('available'), false], locked: [t('locked'), false] }[st];
    if (chip) rosterChip(ctx, chip[0], r.x + 6, r.y + 6, st === 'locked' ? '150,160,180' : rgb, chip[1]);
  }
  drawCharInfo(ctx, L, now) {
    const I = L.info, d = this.def, rgb = hexToRgb(d.color), st = rosterState(d);
    this.menu.drawPanel(ctx, I.x, I.y, I.w, I.h, 0.86, 12);
    ctx.save();
    // Filete na cor-tema no alto do painel
    const fl = ctx.createLinearGradient(I.x, 0, I.x + I.w, 0);
    fl.addColorStop(0, rgba(rgb, 0)); fl.addColorStop(0.15, rgba(rgb, 0.85)); fl.addColorStop(0.6, rgba(rgb, 0.25)); fl.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = fl; ctx.fillRect(I.x + 14, I.y, I.w - 28, 2);
    const statW = clamp(I.w * 0.3, 160, 230), colW = I.w - statW - 66;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    // Nome, selo e título
    const chip = { active: [t('active'), true], available: [t('available'), false], locked: [t('locked'), false], soon: [t('comingSoon'), false] }[st];
    this.titleRow(ctx, I, d.name.toUpperCase(), d.title.toUpperCase(), rgb, [chip[0], chip[1], st === 'locked' ? '150,160,180' : rgb], colW);
    // Lore: até 3 linhas; em telas estreitas a letra diminui um pouco para caber
    ctx.font = `13px ${FONT_UI}`;
    let lore = wrapText(ctx, d.lore, colW), lh = 19;
    if (lore.length > 3) { ctx.font = `12px ${FONT_UI}`; lore = wrapText(ctx, d.lore, colW); lh = 17; }
    lore = lore.slice(0, 4);
    ctx.fillStyle = '#c9d6ea';
    lore.forEach((ln, k) => ctx.fillText(ln, I.x + 22, I.y + 80 + k * lh));
    // Situação (uma linha): condição de desbloqueio, "em breve" ou o papel no combate
    const sy = I.y + 80 + lore.length * lh + 6;
    if (st === 'locked' || st === 'soon') {
      drawMenuIcon(ctx, 'lock', I.x + 29, sy, 14, st === 'locked' ? 'rgba(255,150,170,0.95)' : rgba(rgbMix(rgb, 0.35), 1));
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = st === 'locked' ? '#ffb0c0' : rgba(rgbMix(rgb, 0.45), 1);
      const txt = st === 'locked' ? `${RosterManager.describe(d.unlock)}${d.devStatus === 'coming_soon' ? ` · ${t('comingSoon')}` : ''}` : t('soonNote');
      ctx.fillText(fitText(ctx, txt, colW - 20), I.x + 42, sy);
    } else {
      ctx.font = `italic 12px ${FONT_UI}`; ctx.fillStyle = 'rgba(190,205,228,0.75)';
      ctx.fillText(fitText(ctx, d.role, colW), I.x + 22, sy);
    }
    // Atributos (rating): barras na cor-tema, animadas ao trocar de personagem
    const sx = I.x + I.w - statW - 22, k0 = Math.min(1, this.selT * 3);
    ROSTER_STATS.forEach(([key, label], k) => {
      const y = I.y + 26 + k * 28, v = clamp(d.rating[key] || 0, 0, 1);
      ctx.font = `bold 10.5px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(200,214,235,0.85)';
      ctx.fillText(t(label), sx, y);
      ctx.letterSpacing = '0px';
      ctx.fillStyle = 'rgba(20,34,60,0.95)'; ctx.fillRect(sx, y + 9, statW, 6);
      const g = ctx.createLinearGradient(sx, 0, sx + statW, 0);
      g.addColorStop(0, rgba(rgbMix(rgb, 0.35, 0), 1)); g.addColorStop(1, rgba(rgbMix(rgb, 0.5), 1));
      ctx.fillStyle = g; ctx.fillRect(sx, y + 9, statW * v * easeOutCubic(k0), 6);
      for (let q = 1; q < 10; q++) { ctx.fillStyle = 'rgba(3,8,18,0.7)'; ctx.fillRect(sx + (statW * q) / 10, y + 9, 1, 6); }
    });
    // HABILIDADES: 4 ícones quadrados com o nome
    const hy = I.y + 176;
    ctx.fillStyle = rgba(rgb, 0.22); ctx.fillRect(I.x + 22, hy - 6, I.w - 44, 1);
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = rgba(rgb, 1);
    ctx.fillText(t('abilities'), I.x + 22, hy + 10);
    ctx.letterSpacing = '0px';
    d.abilities.forEach((id, k) => this.drawAbilitySlot(ctx, ABILITY_DEFS[id], L.abil[k], rgb, k === this.hoverAb));
    ctx.restore();
  }
  drawAbilitySlot(ctx, a, r, rgb, hover) {
    if (!a) return;
    const on = a.implemented, col = on ? rgb : '128,138,156', S = 42, cx = r.x + r.w / 2, y = r.y + 8;
    ctx.save();
    // Quadro do ícone
    ctx.fillStyle = 'rgba(4,8,18,0.95)'; techPanelPath(ctx, cx - S / 2, y, S, S, 6); ctx.fill();
    const ig = ctx.createLinearGradient(0, y, 0, y + S);
    ig.addColorStop(0, rgba(col, on ? 0.28 : 0.12)); ig.addColorStop(1, rgba(col, 0.02));
    ctx.fillStyle = ig; ctx.fill();
    if (hover) strokeGlow(ctx, () => techPanelPath(ctx, cx - S / 2, y, S, S, 6), col, 1.6);
    techPanelPath(ctx, cx - S / 2, y, S, S, 6);
    ctx.strokeStyle = rgba(col, on ? (hover ? 1 : 0.85) : 0.5); ctx.lineWidth = hover ? 1.6 : 1.2; ctx.stroke();
    if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; GlowCache.draw(ctx, rgb, cx, y + S / 2, S * 0.7, 0.32); ctx.restore(); }
    drawAbilityIcon(ctx, a.icon, cx, y + S / 2, 27, on ? rgba(rgbMix(rgb, 0.35), 1) : 'rgba(150,160,180,0.55)');
    if (a.ultimate) {   // suprema: losango no canto
      ctx.fillStyle = on ? rgba(rgbMix(rgb, 0.5), 1) : 'rgba(150,160,180,0.6)';
      diamondPath(ctx, cx + S / 2 - 1, y + 1, 4); ctx.fill();
    }
    // Nome (até duas linhas) e o tipo, ou "Em desenvolvimento"
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 11px ${FONT_UI}`; ctx.fillStyle = on ? '#dfe8f5' : 'rgba(170,180,198,0.62)';
    const lines = wrapText(ctx, a.name, r.w - 8).slice(0, 2);
    lines.forEach((ln, k) => ctx.fillText(ln, cx, y + S + 13 + k * 13));
    const ty = y + S + 13 + lines.length * 13 + 1;
    if (on) {
      ctx.font = `10px ${FONT_UI}`; ctx.fillStyle = a.ultimate ? rgba(rgbMix(rgb, 0.4), 0.9) : 'rgba(170,186,210,0.7)';
      ctx.fillText(a.ultimate ? t('ultimate') : t(ABILITY_TYPE_TEXT[a.type] || 'typeMelee'), cx, ty);
    } else {
      ctx.font = `italic 10px ${FONT_UI}`; ctx.fillStyle = 'rgba(214,190,150,0.72)';
      ctx.fillText(t('inDevelopment'), cx, ty);
    }
    ctx.restore();
  }
  // Dica da habilidade sob o mouse: descrição, custo e recarga
  drawAbilityTip(ctx, L) {
    const d = this.def, a = ABILITY_DEFS[d.abilities[this.hoverAb]], r = L.abil[this.hoverAb];
    if (!a || !r) return;
    const rgb = a.implemented ? hexToRgb(d.color) : '150,160,180', w = 280;
    const bits = [a.ultimate ? t('ultimate') : null, t(ABILITY_TYPE_TEXT[a.type] || 'typeMelee')];
    if (a.cost) bits.push(t('abilityCost', { v: a.cost }));
    if (a.cooldown) bits.push(t('abilityCd', { v: a.cooldown }));
    ctx.save();
    ctx.font = `12px ${FONT_UI}`;
    const desc = wrapText(ctx, a.desc || '', w - 24);
    const h = 52 + desc.length * 16 + (a.implemented ? 0 : 20);
    const x = clamp(r.x + r.w / 2 - w / 2, 8, VIEW_W - w - 8), y = r.y - h - 6;
    ctx.fillStyle = 'rgba(4,7,16,0.97)'; techPanelPath(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = rgba(rgb, 0.8); ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = '#eef3fa'; ctx.fillText(a.name, x + 12, y + 16);
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1px'; ctx.fillStyle = rgba(rgbMix(rgb, 0.4), 1);
    ctx.fillText(bits.filter(Boolean).join(' · ').toUpperCase(), x + 12, y + 34);
    ctx.letterSpacing = '0px';
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = '#c9d6ea';
    desc.forEach((ln, k) => ctx.fillText(ln, x + 12, y + 52 + k * 16));
    if (!a.implemented) { ctx.font = `italic 12px ${FONT_UI}`; ctx.fillStyle = 'rgba(214,190,150,0.85)'; ctx.fillText(t('inDevelopment'), x + 12, y + 52 + desc.length * 16 + 4); }
    ctx.restore();
  }

  // ------------------------------------------------------ aba ARMADURAS
  drawArmors(ctx, L, now) {
    const d = this.def, rgb = hexToRgb(d.color), list = this.armorList();
    // Personagem cujas armaduras aparecem (↑/↓ ou as setas)
    ctx.save();
    for (const [r, dir] of [[L.prev, -1], [L.next, 1]]) {
      ctx.fillStyle = 'rgba(4,9,20,0.7)'; techPanelPath(ctx, r.x, r.y, r.w, r.h, 6); ctx.fill();
      ctx.strokeStyle = rgba(rgb, 0.6); ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = '#d8ecff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      ctx.beginPath(); ctx.moveTo(cx - dir * 3, cy - 6); ctx.lineTo(cx + dir * 3, cy); ctx.lineTo(cx - dir * 3, cy + 6); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 14px ${FONT_TITLE}`; ctx.letterSpacing = '3px';
    const midX = (L.prev.x + L.prev.w + L.next.x) / 2;
    glowText(ctx, d.name.toUpperCase(), midX + 1, L.top + 16, rgba(rgbMix(rgb, 0.55), 1), rgba(rgb, 0.8), 8);
    ctx.letterSpacing = '0px';
    const st = rosterState(d);
    if (st !== 'active' && st !== 'available') rosterChip(ctx, st === 'locked' ? t('locked') : t('comingSoon'), L.next.x + L.next.w + 12, L.top + 7, st === 'locked' ? '150,160,180' : rgb, false, 16);
    ctx.restore();
    // Indicador de p\u00e1gina
    if (L.totalPages > 1) {
      this.drawPageIndicator(ctx, L, L.armorPage, L.totalPages, rgb);
    }
    L.cards.forEach((r) => this.drawArmorCard(ctx, r, d, list[r.id], r.id === this.armorSel, now));
    this.drawArmorInfo(ctx, L, list[this.armorSel]);
  }
  drawPageIndicator(ctx, L, page, totalPages, rgb) {
    ctx.save();
    // Bot\u00e3o <
    if (L.pagePrev) {
      const r = L.pagePrev;
      ctx.fillStyle = 'rgba(4,9,20,0.8)'; techPanelPath(ctx, r.x, r.y, r.w, r.h, 5); ctx.fill();
      ctx.strokeStyle = `rgba(${rgb}, 0.6)`; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = '#d8ecff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      ctx.beginPath(); ctx.moveTo(cx + 3, cy - 5); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx + 3, cy + 5); ctx.stroke();
    }
    // Bot\u00e3o >
    if (L.pageNext) {
      const r = L.pageNext;
      ctx.fillStyle = 'rgba(4,9,20,0.8)'; techPanelPath(ctx, r.x, r.y, r.w, r.h, 5); ctx.fill();
      ctx.strokeStyle = `rgba(${rgb}, 0.6)`; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = '#d8ecff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      ctx.beginPath(); ctx.moveTo(cx - 3, cy - 5); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx - 3, cy + 5); ctx.stroke();
    }
    // Label: 1 / 2
    if (L.pageLabel) {
      ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '1px';
      ctx.fillStyle = '#c9d6ea'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${page + 1} / ${totalPages}`, L.pageLabel.x, L.pageLabel.y);
      ctx.letterSpacing = '0px';
    }
    ctx.restore();
  }
  drawArmorCard(ctx, r, d, id, sel, now) {
    const a = ARMOR_DEFS[id], rgb = hexToRgb(d.color), unlocked = RosterManager.isArmorUnlocked(id);
    const eq = RosterManager.equippedArmor(d.id) === id, tint = a.visual && a.visual.tint;
    const label = a.name.replace(/^Armadura\s+/i, '').replace(/^(Kael|Lyra|Drakos|Sera|Orion)\s+/i, '').toUpperCase();
    this.cardFrame(ctx, r, rgb, sel, !unlocked, label, (ph) => {
      const img = a.png ? SpecialAssets.getImg(a.png) : null;
      if (img && img.complete && img.naturalWidth) {
        const s = Math.min((r.w - 6) / img.naturalWidth, (ph - 6) / img.naturalHeight);
        const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        ctx.drawImage(img, r.x + (r.w - dw) / 2, r.y + (ph - dh) / 2 + 2, dw, dh);
      } else if (d.art === 'kael' && RosterArt.kaelBody(ctx, r.x, r.y + 4, r.w, ph - 4, tint)) { /* arte oficial */ }
      else RosterArt.silhouette(ctx, d, r.x + r.w / 2, r.y + ph + 4, ph * 0.84, now, { state: unlocked ? 'soon' : 'locked', tint });
      if (!unlocked) this.lockOverlay(ctx, r, ph, rgb, true, RosterManager.describe(a.unlock));
    });
    if (sel && tint) {
      const aRgb = hexToRgb(tint);
      if (aRgb) strokeGlow(ctx, () => { ctx.beginPath(); ctx.rect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }, aRgb, 2.5);
    }
    const chip = eq ? [t('equipped'), true] : unlocked ? [t('available'), false] : [t('lockedF'), false];
    rosterChip(ctx, chip[0], r.x + 4, r.y + 4, unlocked ? rgb : '150,160,180', chip[1], 12);
    if (a.glb) rosterChip(ctx, '3D', r.x + r.w - 24, r.y + 4, '60,160,255', false, 12);
    if (a.owner === 'all') rosterChip(ctx, t('everyone').toUpperCase(), r.x + 4, r.y + 18, '170,185,210', false, 12);
  }
  drawArmorInfo(ctx, L, id) {
    const I = L.info, d = this.def, a = ARMOR_DEFS[id], rgb = hexToRgb(d.color);
    if (!a) return;
    const unlocked = RosterManager.isArmorUnlocked(id), eq = RosterManager.equippedArmor(d.id) === id;
    this.menu.drawPanel(ctx, I.x, I.y, I.w, I.h, 0.86, 12);
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const modW = clamp(I.w * 0.35, 180, 280), colW = L.box3D ? (L.box3D.x - I.x - 36) : (I.w - modW - 66);
    const chip = eq ? [t('equipped'), true] : unlocked ? [t('available'), false] : [t('lockedF'), false];
    this.titleRow(ctx, I, a.name.toUpperCase(), a.owner === 'all' ? t('armorShared') : t('armorOf', { name: d.name.toUpperCase() }), rgb,
      [chip[0], chip[1], unlocked ? rgb : '150,160,180'], colW);
    // Situação
    ctx.font = `12.5px ${FONT_UI}`;
    let y = I.y + 76;
    if (a.desc) {
      ctx.fillStyle = '#b5c8e2';
      wrapText(ctx, a.desc, colW).slice(0, 3).forEach((ln) => { ctx.fillText(ln, I.x + 22, y); y += 17; });
      y += 2;
    }
    if (!RosterManager.isUnlocked(d.id)) { ctx.fillStyle = '#ffb0c0'; wrapText(ctx, t('charLockedArmor', { name: d.name }), colW).forEach((ln) => { ctx.fillText(ln, I.x + 22, y); y += 18; }); }
    if (!unlocked) {
      drawMenuIcon(ctx, 'lock', I.x + 29, y, 14, 'rgba(255,150,170,0.95)');
      ctx.fillStyle = '#ffb0c0'; ctx.fillText(RosterManager.describe(a.unlock), I.x + 42, y); y += 18;
    } else {
      ctx.fillStyle = '#c9d6ea';
      ctx.fillText(eq ? t('armorWornBy', { name: d.name }) : t('armorFree'), I.x + 22, y); y += 18;
    }
    // Modificadores (texto)
    const mx = I.x + I.w - modW - 22;
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = rgba(rgb, 1);
    ctx.fillText(t('modsTitle'), mx, I.y + 26);
    ctx.letterSpacing = '0px';
    const mods = armorModLines(a);
    ctx.font = `12px ${FONT_UI}`;
    if (!mods.length) { ctx.fillStyle = 'rgba(190,205,228,0.7)'; wrapText(ctx, t('noMods'), modW).forEach((ln, k) => ctx.fillText(ln, mx, I.y + 48 + k * 17)); }
    mods.forEach((ln, k) => {
      ctx.fillStyle = ln[0] === '−' ? '#ffb38a' : '#9ff0c4';
      ctx.fillText(ln, mx, I.y + 48 + k * 18);
    });

    // Preview 3D giratório 360° com aura e fumaça
    if (L.box3D && typeof GLBViewer !== 'undefined' && GLBViewer.drawTurntablePreview) {
      GLBViewer.drawTurntablePreview(ctx, a, L.box3D, Date.now() / 1000, { yaw: this.previewYaw, pitch: this.previewPitch });
    }

    // Botão 3D se disponível
    if (a.glb && L.btn3D) {
      const b = L.btn3D;
      const m = game.input.mouse, hover = inRect(m, b);
      ctx.fillStyle = hover ? 'rgba(30, 80, 180, 0.9)' : 'rgba(12, 30, 70, 0.85)';
      techPanelPath(ctx, b.x, b.y, b.w, b.h, 6); ctx.fill();
      ctx.strokeStyle = hover ? '#7db8ff' : 'rgba(60, 140, 255, 0.7)'; ctx.lineWidth = hover ? 1.5 : 1; ctx.stroke();
      ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1px';
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('[V] AMPLIAR 3D', b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------- aba ARMAS
  drawWeapons(ctx, L, now) {
    const list = this.weaponList();
    const od = CHARACTERS_BY_ID[this.def.id], rgb = od ? hexToRgb(od.color) : '170,185,210';
    // Indicador de página
    if (L.totalPages > 1) {
      this.drawPageIndicator(ctx, L, L.weaponPage, L.totalPages, rgb);
    }
    L.cards.forEach((r) => this.drawWeaponCell(ctx, r, WEAPON_DEFS[list[r.id]], r.id === this.weaponSel, now));
    this.drawWeaponInfo(ctx, L, WEAPON_DEFS[list[this.weaponSel]]);
  }
  ownerLabel(w) { const od = CHARACTERS_BY_ID[w.owner]; return od ? rosterShortName(od) : t('everyone').toUpperCase(); }
  drawWeaponCell(ctx, r, w, sel, now) {
    const od = CHARACTERS_BY_ID[w.owner], rgb = od ? hexToRgb(od.color) : '170,185,210';
    const unlocked = RosterManager.isWeaponUnlocked(this.weaponList()[r.id]);
    ctx.save();
    ctx.fillStyle = sel ? 'rgba(10,20,42,0.92)' : 'rgba(4,9,20,0.84)';
    techPanelPath(ctx, r.x, r.y, r.w, r.h, 7); ctx.fill();
    const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    bg.addColorStop(0, rgba(rgb, 0)); bg.addColorStop(1, rgba(rgb, sel ? 0.22 : 0.08));
    ctx.fillStyle = bg; ctx.fill();
    if (sel) { strokeGlow(ctx, () => techPanelPath(ctx, r.x, r.y, r.w, r.h, 7), rgb, 1.8); techPanelPath(ctx, r.x, r.y, r.w, r.h, 7); }
    ctx.strokeStyle = sel ? rgba(rgbMix(rgb, 0.45), 1) : rgba(rgb, unlocked ? 0.45 : 0.25); ctx.lineWidth = sel ? 1.8 : 1; ctx.stroke();
    const cx = r.x + r.w / 2;

    const img = w.png ? SpecialAssets.getImg(w.png) : null;
    if (img && img.complete && img.naturalWidth) {
      const is = Math.min((r.w - 12) / img.naturalWidth, 34 / img.naturalHeight);
      const iw = img.naturalWidth * is, ih = img.naturalHeight * is;
      ctx.drawImage(img, cx - iw / 2, r.y + 22 - ih / 2, iw, ih);
    } else {
      RosterArt.weaponIcon(ctx, w.kind, cx, r.y + 22, Math.min(32, r.w * 0.45), rgb, w.implemented);
    }

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 10px ${FONT_UI}`; ctx.fillStyle = unlocked ? '#e6eefa' : '#8899aa';
    const lines = wrapText(ctx, w.name, r.w - 8).slice(0, 2);
    lines.forEach((ln, k) => ctx.fillText(ln, cx, r.y + 44 + k * 11));

    if (w.glb) rosterChip(ctx, '3D', r.x + r.w - 24, r.y + 3, '60,160,255', false, 11);
    if (!unlocked) rosterChip(ctx, t('locked'), r.x + 3, r.y + 3, '180,120,120', false, 11);
    ctx.restore();
  }
  drawWeaponInfo(ctx, L, w) {
    if (!w) return;
    const I = L.info, od = CHARACTERS_BY_ID[w.owner], rgb = od ? hexToRgb(od.color) : '170,185,210';
    const wid = this.weaponList()[this.weaponSel];
    const unlocked = RosterManager.isWeaponUnlocked(wid);
    this.menu.drawPanel(ctx, I.x, I.y, I.w, I.h, 0.86, 12);
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const statW = clamp(I.w * 0.35, 180, 280), colW = L.box3D ? (L.box3D.x - I.x - 36) : (I.w - statW - 66);
    const chip = !unlocked ? [t('locked').toUpperCase(), false, '180,120,120']
      : !w.implemented ? [t('inDevelopment').toUpperCase(), false, '214,190,150']
      : w.owner === RosterManager.active ? [t('weaponInUse').toUpperCase(), true, '120,230,170'] : null;
    this.titleRow(ctx, I, w.name.toUpperCase(), w.owner === 'all' ? t('weaponShared') : t('weaponOf', { name: od ? od.name.toUpperCase() : w.owner }), rgb, chip, colW);

    ctx.font = `12.5px ${FONT_UI}`; ctx.fillStyle = '#c9d6ea';
    let y = I.y + 76;
    wrapText(ctx, w.desc || '', colW).slice(0, 3).forEach((ln, k) => { ctx.fillText(ln, I.x + 22, y + k * 18); });
    y += 58;

    if (!unlocked && w.unlock) {
      drawMenuIcon(ctx, 'lock', I.x + 29, y, 14, 'rgba(255,150,170,0.95)');
      ctx.fillStyle = '#ffb0c0'; ctx.fillText(RosterManager.describe(w.unlock), I.x + 42, y);
    }

    // Atributos da arma
    const sx = I.x + I.w - statW - 22;
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = rgba(rgb, 1);
    ctx.fillText(w.armorRef ? t('modsTitle') : t('statsTitle'), sx, I.y + 26);
    ctx.letterSpacing = '0px';
    ctx.font = `12.5px ${FONT_UI}`; ctx.fillStyle = '#dfe8f5';
    const stats = weaponStatLines(w);
    if (!stats.length) { ctx.fillStyle = 'rgba(190,205,228,0.7)'; ctx.fillText('—', sx, I.y + 50); }
    stats.slice(0, 5).forEach((ln, k) => ctx.fillText(ln, sx, I.y + 50 + k * 18));

    // Preview 3D giratório 360° com aura e fumaça
    if (L.box3D && typeof GLBViewer !== 'undefined' && GLBViewer.drawTurntablePreview) {
      GLBViewer.drawTurntablePreview(ctx, w, L.box3D, Date.now() / 1000, { yaw: this.previewYaw, pitch: this.previewPitch });
    }

    // Botão 3D se disponível
    if (w.glb && L.btn3D) {
      const b = L.btn3D;
      const m = game.input.mouse, hover = inRect(m, b);
      ctx.fillStyle = hover ? 'rgba(30, 80, 180, 0.9)' : 'rgba(12, 30, 70, 0.85)';
      techPanelPath(ctx, b.x, b.y, b.w, b.h, 6); ctx.fill();
      ctx.strokeStyle = hover ? '#7db8ff' : 'rgba(60, 140, 255, 0.7)'; ctx.lineWidth = hover ? 1.5 : 1; ctx.stroke();
      ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1px';
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('[V] AMPLIAR 3D', b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
    ctx.restore();
  }

  // Aviso curto (ou a situação da troca, na pausa) ao lado dos botões
  drawStatus(ctx, L) {
    let text = null, rgb = '170,190,215', a = 1;
    if (this.msg) { text = this.msg.text; rgb = this.msg.rgb; a = clamp(this.msg.t * 2, 0, 1); }
    else if (this.tabId === 'chars' && this.mode === 'pause') { const ok = this.canSwap(); text = t(ok ? 'swapReady' : 'swapCombat'); rgb = ok ? '120,230,170' : '255,190,110'; }
    else if (this.tabId === 'chars') text = t('newGameHint');
    if (!text) return;
    const S = L.status;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `12px ${FONT_UI}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const lines = wrapText(ctx, text, S.w - 18).slice(0, 3), y0 = S.y + S.h / 2 - ((lines.length - 1) * 14) / 2;
    ctx.fillStyle = rgba(rgb, 1);
    diamondPath(ctx, S.x + 4, y0, 3.5); ctx.fill();
    ctx.fillStyle = this.msg ? rgba(rgbMix(rgb, 0.45), 1) : rgba(rgbMix(rgb, 0.3), 0.92);
    lines.forEach((ln, k) => ctx.fillText(ln, S.x + 16, y0 + k * 14));
    ctx.restore();
  }
}
