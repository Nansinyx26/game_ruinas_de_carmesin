'use strict';
// ECLIPSE ZERO · RosterManager: personagens desbloqueados, personagem ativo e armaduras
// ---------------------------------------------------------------------------
// ROSTER: estado do elenco de um salvamento. Não sabe nada de cenas ou setores:
// quem conclui objetivos (js/game.js) chama checkUnlocks(contexto) e o roster
// libera o que tiver a condição cumprida, emitindo eventos para a interface.
//   Eventos: 'characterUnlocked' (def), 'characterChanged' ({ from, to }),
//            'armorUnlocked' (armor), 'armorChanged' ({ charId, armorId })
//   Contexto: { chapter: capítulos concluídos, flags: {...}, bosses: [...], quests: [...] }
// Um personagem 'coming_soon' pode ser desbloqueado (fica salvo), mas só pode ser
// escolhido quando o devStatus dele mudar numa atualização do jogo.
// ---------------------------------------------------------------------------
const ROSTER_VERSION = 1;
// '#2F8CFF' → '47,140,255' (as cores-tema dos dados viram o formato usado pelos efeitos)
function hexToRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return Number.isFinite(n) ? `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}` : '255,255,255';
}

const RosterManager = {
  unlocked: new Set(), active: DEFAULT_CHARACTER, armor: {}, weapon: {}, armorsUnlocked: new Set(), weaponsUnlocked: new Set(),
  listeners: {},

  // ------------------------------------------------------------- eventos
  on(ev, fn) { (this.listeners[ev] || (this.listeners[ev] = [])).push(fn); return fn; },
  off(ev, fn) { const l = this.listeners[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(ev, data) { for (const fn of (this.listeners[ev] || []).slice()) { try { fn(data); } catch (e) { console.error(e); } } },

  // ------------------------------------------------------------- consultas
  def(id) { return CHARACTERS_BY_ID[id] || null; },
  get activeDef() { return this.def(this.active) || this.def(DEFAULT_CHARACTER); },
  isUnlocked(id) {
    if (id === 'kael' || id === 'orion') return true;
    return this.unlocked.has(id);
  },
  // Pode ser escolhido agora? (desbloqueado e já existente no jogo)
  isSelectable(id) { const d = this.def(id); return !!d && this.isUnlocked(id) && d.devStatus !== 'coming_soon'; },
  isArmorUnlocked(id) {
    const a = ARMOR_DEFS[id];
    if (a && (a.owner === 'kael' || a.owner === 'orion' || a.owner === 'all')) return true;
    return this.armorsUnlocked.has(id);
  },
  isWeaponUnlocked(id) {
    const w = WEAPON_DEFS[id];
    if (!w) return false;
    if (w.owner === 'kael' || w.owner === 'orion' || w.owner === 'all') return true;
    if (!w.unlock || w.unlock.type === 'always') return true;
    return this.weaponsUnlocked.has(id);
  },
  equippedArmor(charId) { return this.armor[charId] || (this.def(charId) ? this.def(charId).armors[0] : null); },
  equippedWeapon(charId) {
    // equipamento (gadget) e armadura listada nas armas (armorRef) nunca são a arma da mão (salvamentos antigos)
    const w = this.weapon[charId], d = w && WEAPON_DEFS[w];
    return w && !(d && (d.gadget || d.armorRef)) ? w : (this.def(charId) ? this.def(charId).weapons[0] : null);
  },
  // Armaduras que o personagem pode vestir (as dele e as compartilhadas)
  armorsFor(charId) {
    const d = this.def(charId);
    const own = d ? d.armors.slice() : [];
    for (const id in ARMOR_DEFS) if (ARMOR_DEFS[id].owner === 'all' && !own.includes(id)) own.push(id);
    return own;
  },
  // Armas que o personagem pode equipar (as dele e as compartilhadas)
  weaponsFor(charId) {
    const d = this.def(charId);
    const own = d ? d.weapons.slice() : [];
    for (const id in WEAPON_DEFS) if (WEAPON_DEFS[id].owner === 'all' && !own.includes(id)) own.push(id);
    return own;
  },

  // ------------------------------------------------------------- mudanças
  // Estado de um jogo novo: só os personagens 'always' e as armaduras 'always'
  reset() {
    this.unlocked = new Set(CHARACTER_DEFS.filter((c) => c.unlock.type === 'always').map((c) => c.id));
    this.armorsUnlocked = new Set(Object.keys(ARMOR_DEFS).filter((id) => {
      const a = ARMOR_DEFS[id];
      return !a.unlock || a.unlock.type === 'always' || a.owner === 'kael' || a.owner === 'orion' || a.owner === 'all';
    }));
    this.weaponsUnlocked = new Set(Object.keys(WEAPON_DEFS).filter((id) => {
      const w = WEAPON_DEFS[id];
      return !w.unlock || w.unlock.type === 'always' || w.owner === 'kael' || w.owner === 'orion' || w.owner === 'all';
    }));
    this.active = DEFAULT_CHARACTER;
    this.armor = {};
    this.weapon = {};
    for (const c of CHARACTER_DEFS) {
      this.armor[c.id] = c.armors[0];
      this.weapon[c.id] = c.weapons[0];
    }
  },
  unlock(id, silent = false) {
    const d = this.def(id);
    if (!d || this.unlocked.has(id)) return false;
    this.unlocked.add(id);
    if (!silent) this.emit('characterUnlocked', d);
    return true;
  },
  // Só para testes/depuração: o personagem inicial nunca é bloqueado
  lock(id) {
    const d = this.def(id);
    if (!d || d.unlock.type === 'always' || !this.unlocked.has(id)) return false;
    this.unlocked.delete(id);
    if (this.active === id) this.setActive(DEFAULT_CHARACTER);
    return true;
  },
  setActive(id) {
    if (!this.isSelectable(id) || this.active === id) return false;
    const from = this.active;
    this.active = id;
    this.emit('characterChanged', { from, to: id });
    return true;
  },
  unlockArmor(id, silent = false) {
    const a = ARMOR_DEFS[id];
    if (!a || this.armorsUnlocked.has(id)) return false;
    this.armorsUnlocked.add(id);
    if (!silent) this.emit('armorUnlocked', Object.assign({ id }, a));
    return true;
  },
  unlockWeapon(id, silent = false) {
    const w = WEAPON_DEFS[id];
    if (!w || this.weaponsUnlocked.has(id)) return false;
    this.weaponsUnlocked.add(id);
    if (!silent) this.emit('weaponUnlocked', Object.assign({ id }, w));
    return true;
  },
  // Só para testes/depuração: bloqueia uma armadura (quem a vestia volta para a Padrão)
  lockArmor(id) {
    const a = ARMOR_DEFS[id];
    if (!a || a.unlock.type === 'always' || !this.armorsUnlocked.has(id)) return false;
    this.armorsUnlocked.delete(id);
    for (const c of CHARACTER_DEFS) {
      if (this.armor[c.id] === id) { this.armor[c.id] = c.armors[0]; this.emit('armorChanged', { charId: c.id, armorId: c.armors[0] }); }
    }
    return true;
  },
  equipArmor(charId, armorId) {
    const a = ARMOR_DEFS[armorId];
    if (!a || !this.def(charId) || !this.isArmorUnlocked(armorId)) return false;
    if (a.owner !== 'all' && a.owner !== charId) return false;
    this.armor[charId] = armorId;
    this.emit('armorChanged', { charId, armorId });
    return true;
  },
  equipWeapon(charId, weaponId) {
    const w = WEAPON_DEFS[weaponId];
    if (!w || w.gadget || w.armorRef || !this.def(charId) || !this.isWeaponUnlocked(weaponId)) return false;
    if (w.owner !== 'all' && w.owner !== charId) return false;
    this.weapon[charId] = weaponId;
    this.emit('weaponChanged', { charId, weaponId });
    return true;
  },

  // ------------------------------------------------------- desbloqueios
  conditionMet(c, ctx) {
    if (!c) return false;
    switch (c.type) {
      case 'always': return true;
      case 'level': {
        const lvl = (ctx.level | 0);
        if (lvl >= c.value) return true;
        // Missões/capítulos concluídos também contam para desbloquear patamares de armadura e arma:
        const ch = (ctx.chapter | 0);
        const boss = (ctx.bosses || []).includes('nexus');
        if (boss && c.value <= 70) return true;
        if (ch >= 5 && c.value <= 40) return true;
        if (ch >= 4 && c.value <= 30) return true;
        if (ch >= 3 && c.value <= 20) return true;
        if (ch >= 2 && c.value <= 10) return true;
        if (ch >= 1 && c.value <= 5) return true;
        return false;
      }
      case 'chapter_complete': return (ctx.chapter | 0) >= c.value;
      case 'boss_defeated': return (ctx.bosses || []).includes(c.value);
      case 'quest_complete': return (ctx.quests || []).includes(c.value);
      case 'flag': return !!(ctx.flags && ctx.flags[c.value]);
      default: return false;
    }
  },
  // Texto da condição para a interface ("Conclua o Capítulo 2")
  describe(c) {
    if (!c) return '';
    switch (c.type) {
      case 'always': return t('unlockAlways');
      case 'level': return t('unlockLevel', { n: c.value });
      case 'chapter_complete': return t('unlockChapter', { n: romanNumeral(c.value) });
      case 'boss_defeated': return t('unlockBoss', { name: c.value === 'nexus' ? 'NEXUS' : c.value });
      case 'quest_complete': return t('unlockQuest', { name: c.label || c.value });
      case 'flag': return t('unlockFlag', { name: c.label || c.value });
      default: return '';
    }
  },
  // Libera tudo cuja condição já foi cumprida; devolve o que foi liberado agora
  checkUnlocks(ctx) {
    const fresh = [];
    for (const c of CHARACTER_DEFS) if (!this.unlocked.has(c.id) && this.conditionMet(c.unlock, ctx) && this.unlock(c.id)) fresh.push(c.id);
    for (const id in ARMOR_DEFS) if (!this.armorsUnlocked.has(id) && this.conditionMet(ARMOR_DEFS[id].unlock, ctx) && this.unlockArmor(id)) fresh.push(id);
    for (const id in WEAPON_DEFS) {
      const w = WEAPON_DEFS[id];
      if (w.unlock && !this.weaponsUnlocked.has(id) && this.conditionMet(w.unlock, ctx) && this.unlockWeapon(id)) fresh.push(id);
    }
    return fresh;
  },

  // ------------------------------------------------------------- salvamento
  toJSON() {
    return {
      v: ROSTER_VERSION,
      unlocked: [...this.unlocked],
      active: this.active,
      armor: Object.assign({}, this.armor),
      weapon: Object.assign({}, this.weapon),
      armorsUnlocked: [...this.armorsUnlocked],
      weaponsUnlocked: [...this.weaponsUnlocked],
    };
  },
  // Carrega o elenco salvo. Sem dados (salvamentos antigos, só Kael): estado inicial
  load(data) {
    this.reset();
    if (!data || typeof data !== 'object') return;
    for (const id of data.unlocked || []) if (this.def(id)) this.unlocked.add(id);
    for (const c of CHARACTER_DEFS) if (c.unlock && c.unlock.type === 'always') this.unlocked.add(c.id);
    for (const id of data.armorsUnlocked || []) if (ARMOR_DEFS[id]) this.armorsUnlocked.add(id);
    for (const id of data.weaponsUnlocked || []) if (WEAPON_DEFS[id]) this.weaponsUnlocked.add(id);
    for (const cid in data.armor || {}) {
      const aid = data.armor[cid], a = ARMOR_DEFS[aid];
      if (this.def(cid) && a && this.armorsUnlocked.has(aid) && (a.owner === 'all' || a.owner === cid)) this.armor[cid] = aid;
    }
    for (const cid in data.weapon || {}) {
      const wid = data.weapon[cid], w = WEAPON_DEFS[wid];
      if (this.def(cid) && w && this.weaponsUnlocked.has(wid) && (w.owner === 'all' || w.owner === cid)) this.weapon[cid] = wid;
    }
    // O ativo precisa ser escolhível nesta versão do jogo; senão volta ao inicial
    this.active = this.isSelectable(data.active) ? data.active : DEFAULT_CHARACTER;
  },

  // Confere se os dados apontam para coisas que existem (avisa no console)
  validate() {
    const bad = [];
    for (const c of CHARACTER_DEFS) {
      for (const id of c.abilities) if (!ABILITY_DEFS[id]) bad.push(`${c.id}: habilidade ${id}`);
      for (const id of c.armors) if (!ARMOR_DEFS[id]) bad.push(`${c.id}: armadura ${id}`);
      for (const id of c.weapons) if (!WEAPON_DEFS[id]) bad.push(`${c.id}: arma ${id}`);
      if (c.abilities.length !== 4) bad.push(`${c.id}: ${c.abilities.length} habilidades (esperado 4)`);
    }
    for (const id in ABILITY_DEFS) { const a = ABILITY_DEFS[id]; if (a.binding && a.binding.skill && !SKILLS[a.binding.skill]) bad.push(`${id}: ${a.binding.skill} não existe em SKILLS`); }
    if (bad.length) console.warn('Dados do roster inconsistentes:\n' + bad.join('\n'));
    return bad;
  },
};
RosterManager.reset();
