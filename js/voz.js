'use strict';
// ECLIPSE ZERO · Voz sintetizada (opcional) para as falas sem dublagem gravada
// ---------------------------------------------------------------------------
// Configurações → ÁUDIO → "Voz sintetizada nas falas" (desligada por padrão). Ligada, lê em
// voz alta, com a síntese de voz do próprio navegador (speechSynthesis, sem biblioteca nem
// internet), as falas que não têm dublagem: as legendas do HUD (rádio dos aliados, campanhas
// dos heróis, NPCs, terminais, missões) e as páginas da história. A dublagem gravada sempre tem
// preferência: se um arquivo de voz está tocando (NarrationPlayer), a síntese fica quieta.
// Cada personagem tem um timbre (tom e velocidade) sobre a voz em português do aparelho; o
// volume segue Volume geral × Voz / Narração e o botão de som. Sem vozes em português no
// sistema, usa a voz padrão do navegador; sem speechSynthesis, a opção não faz nada.
// ---------------------------------------------------------------------------
const VOZ_PERFIS = {
  KAEL: { pitch: 0.82, rate: 0.98 }, LYRA: { pitch: 1.22, rate: 1.06 }, DRAKOS: { pitch: 0.62, rate: 0.9 },
  SERA: { pitch: 1.1, rate: 1.02 }, ORION: { pitch: 0.74, rate: 0.94 }, NEXUS: { pitch: 0.5, rate: 0.82 },
  REN: { pitch: 1.18, rate: 1.1 }, VANNA: { pitch: 1.15, rate: 1.0 }, 'ANCIÃ': { pitch: 1.05, rate: 0.86 },
  TERMINAL: { pitch: 0.9, rate: 1.08 }, '???': { pitch: 0.55, rate: 0.8 },
  _narrador: { pitch: 0.95, rate: 1.0 }, _padrao: { pitch: 1.0, rate: 1.0 },
};

const VozSintetica = {
  fila: [],
  get ok() { return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'; },
  get ligada() { return this.ok && !!Settings.v.synthVoice; },
  // Voz em português do sistema (a do Brasil primeiro); null = a padrão do navegador
  voz() {
    if (!this.ok) return null;
    const vs = speechSynthesis.getVoices() || [];
    return vs.find((v) => /^pt[-_]BR/i.test(v.lang)) || vs.find((v) => /^pt/i.test(v.lang)) || null;
  },
  // Timbre de quem fala ('LYRA · RÁDIO' → LYRA; vazio → narrador)
  perfil(quem) {
    if (!quem) return VOZ_PERFIS._narrador;
    const Q = String(quem).toUpperCase();
    for (const k in VOZ_PERFIS) if (k[0] !== '_' && Q.indexOf(k) >= 0) return VOZ_PERFIS[k];
    return VOZ_PERFIS._padrao;
  },
  volume() {
    const a = typeof game !== 'undefined' && game.audio;
    if (!a || a.muted || !Settings.v.sound) return 0;
    return clamp((Settings.v.master / 100) * (Settings.v.voice / 100), 0, 1);
  },
  dublagemTocando() { const a = typeof game !== 'undefined' && game.audio; return !!(a && a.narration && a.narration.isPlaying()); },
  // Lê uma fala (interrompe a anterior). Devolve a fala montada ou null quando não falou
  falar(quem, texto) { this.parar(); return this.enfileirar([[quem, texto]]); },
  // Lê várias falas em sequência: [[quem, texto], ...] (quem vazio = narração)
  enfileirar(lista) {
    if (!this.ligada || this.dublagemTocando()) return null;
    const vol = this.volume();
    if (vol <= 0) return null;
    const voz = this.voz(), feitas = [];
    for (const [quem, texto] of lista) {
      const t = String(texto || '').replace(/[«»"“”]/g, '').trim();
      if (!t) continue;
      const P = this.perfil(quem), u = new SpeechSynthesisUtterance(t);
      u.lang = voz ? voz.lang : 'pt-BR'; if (voz) u.voice = voz;
      u.pitch = P.pitch; u.rate = P.rate * clamp(Settings.textRate(), 0.85, 1.25); u.volume = vol;
      try { speechSynthesis.speak(u); } catch (e) { return null; }
      feitas.push({ quem, texto: t, pitch: u.pitch, rate: u.rate });
    }
    return feitas.length ? feitas : null;
  },
  parar() { if (this.ok) { try { speechSynthesis.cancel(); } catch (e) { /* sem síntese */ } } },
};
// As vozes do sistema chegam depois de abrir a página em alguns navegadores
if (VozSintetica.ok) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch (e) { /* sem síntese */ } }
