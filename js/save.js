'use strict';
// ECLIPSE ZERO · Salvamento persistente em localStorage (SaveSys)
// ---------------------------------------------------------------------------
// SALVAMENTO persistente (localStorage): progresso, evoluções, memórias, setor,
// miniatura da tela e tempo de jogo, em até SAVE_SLOTS espaços independentes
// ---------------------------------------------------------------------------
const SAVE_KEY = 'eclipse_zero_save_v1';            // formato antigo (um único espaço)
const SAVE_SLOTS = 5;
const SAVE_LAST_KEY = 'eclipse_zero_last_slot';
const SaveSys = {
  key(n) { return `${SAVE_KEY}_slot${n}`; },
  // Converte o salvamento antigo (sem espaços) para o espaço 1
  migrate() {
    try {
      const old = localStorage.getItem(SAVE_KEY);
      if (old && !localStorage.getItem(this.key(1))) localStorage.setItem(this.key(1), old);
      if (old) localStorage.removeItem(SAVE_KEY);
    } catch (e) { /* armazenamento indisponível */ }
  },
  read(n) {
    try { const s = localStorage.getItem(this.key(n)); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  },
  exists(n) {
    if (n !== undefined) return !!this.read(n);
    for (let i = 1; i <= SAVE_SLOTS; i++) if (this.read(i)) return true;
    return false;
  },
  write(n, data) {
    try {
      localStorage.setItem(this.key(n), JSON.stringify(data));
      localStorage.setItem(SAVE_LAST_KEY, String(n));
      return true;
    } catch (e) {
      // Sem espaço (miniaturas grandes): tenta de novo sem a imagem
      if (data && data.thumb) { data = Object.assign({}, data, { thumb: null }); return this.write(n, data); }
      return false;
    }
  },
  clear(n) { try { localStorage.removeItem(this.key(n)); } catch (e) { /* armazenamento indisponível */ } },
  // Todos os espaços (null quando vazio)
  list() { const out = []; for (let i = 1; i <= SAVE_SLOTS; i++) out.push(this.read(i)); return out; },
  // Espaço jogado mais recentemente
  last() {
    let best = 0, bt = -1;
    for (let i = 1; i <= SAVE_SLOTS; i++) { const s = this.read(i); if (s && (s.time || 0) > bt) { bt = s.time || 0; best = i; } }
    return best;
  },
  // Primeiro espaço vazio (0 se todos estiverem ocupados)
  firstEmpty() { for (let i = 1; i <= SAVE_SLOTS; i++) if (!this.read(i)) return i; return 0; },
};
SaveSys.migrate();
