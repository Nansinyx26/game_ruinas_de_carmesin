'use strict';
// ECLIPSE ZERO · Dublagem dos moradores (Vozes)
// ---------------------------------------------------------------------------
// As falas dos moradores na conversa (cumprimentos, respostas dos assuntos e rumores) têm voz
// gravada: um MP3 por fala em dublagem/npcs/<morador>/<código>.mp3, gerado FORA do jogo pelo
// tools/dublagem/gerar_falas.py (ElevenLabs; a chave fica só no ambiente de geração, nunca aqui).
// A voz de cada morador foi escolhida pelo sexo, pela idade e pelo temperamento dele (o ELENCO da
// ferramenta); o jogador não escolhe nem troca voz: não há painel de vozes.
// O <código> é o FNV-1a de 32 bits do texto da fala. Na conversa, o jogo procura, entre as falas
// do morador que têm gravação (js/assets/vozes_npcs.js), a que está no texto mostrado (o texto pode
// trazer um complemento, como o aviso da noite ou o comentário do tempo: esses ficam só escritos).
// Volume: o geral e o de vozes das opções. Sem gravação para a fala, o morador dublado fica só com
// a legenda (nada de voz sintética do navegador no lugar da voz dele).
// ---------------------------------------------------------------------------
const Vozes = {
  audio: null, atual: null, _falas: {},
  codigo(txt) {
    let h = 0x811c9dc5;
    for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  },
  manifesto() { return typeof VOZES_NPC !== 'undefined' ? VOZES_NPC : null; },
  dublado(P) { const M = this.manifesto(); return !!(M && P && P.id && M[P.id]); },
  // Falas do morador com gravação: [{ txt, c (código), d (segundos) }], da mais longa para a mais curta
  falasDe(P) {
    let L = this._falas[P.id];
    if (L) return L;
    const M = this.manifesto(), V = M && M[P.id];
    L = this._falas[P.id] = [];
    if (!V) return L;
    const todas = [].concat(P.ola || [], (P.temas || []).map((t) => t[1]), (P.rumores || []).map((r) => (r && r.txt) || r));
    for (const txt of todas) {
      if (typeof txt !== 'string' || !txt) continue;
      const c = this.codigo(txt);
      if (V.falas[c] !== undefined && !L.some((q) => q.c === c)) L.push({ txt, c, d: V.falas[c] });
    }
    L.sort((a, b) => b.txt.length - a.txt.length);
    return L;
  },
  achar(P, texto) {
    if (!P || !P.id || !texto) return null;
    for (const q of this.falasDe(P)) if (texto.indexOf(q.txt) >= 0) return q;
    return null;
  },
  volume() {
    const a = typeof game !== 'undefined' && game.audio;
    if (!a || a.muted) return 0;
    return clamp((a.volume / 0.69) * (a.voiceVol === undefined ? 1 : a.voiceVol), 0, 1);
  },
  // Toca a voz gravada da fala mostrada. true: o morador é dublado (com ou sem gravação desta fala)
  falar(npc, texto) {
    const P = npc && npc.P;
    if (!this.dublado(P)) { this.parar(); return false; }
    const q = this.achar(P, texto), vol = this.volume();
    if (q && this.atual && this.atual.id === P.id && this.atual.c === q.c && this.falando()) return true;   // a mesma fala, ainda tocando: segue
    this.parar();
    if (!q || vol <= 0 || typeof Audio === 'undefined') return true;
    const a = this.audio = new Audio(`dublagem/npcs/${P.id}/${q.c}.mp3`);
    a.volume = vol;
    this.atual = { id: P.id, c: q.c };
    a.addEventListener('ended', () => { if (this.audio === a) { this.audio = null; this.atual = null; } });
    const p = a.play();
    if (p && p.catch) p.catch(() => { if (this.audio === a) { this.audio = null; this.atual = null; } });
    return true;
  },
  parar() {
    const a = this.audio;
    if (a) { try { a.pause(); } catch (e) { /* nada */ } }
    this.audio = null; this.atual = null;
  },
  falando() { const a = this.audio; return !!(a && !a.paused && !a.ended); },
};
if (typeof window !== 'undefined') window.Vozes = Vozes;
