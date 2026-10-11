'use strict';
// ECLIPSE ZERO · Salvamento persistente em localStorage (SaveSys)
// ---------------------------------------------------------------------------
// SALVAMENTO persistente (localStorage): progresso, missões, mundo e local
// ---------------------------------------------------------------------------
const SAVE_KEY = 'eclipse_zero_save_v1';
const SaveSys = {
  exists() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  read() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  write(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; } },
  clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* armazenamento indisponível */ } },
};

