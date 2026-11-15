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
// O herói também tem voz: a pergunta que o jogador escolhe toca primeiro, e a resposta do morador
// vem depois dela (perguntar). Volume: o geral e o de vozes das opções. Sem gravação para a fala, o morador dublado fica só com
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
    // as falas fixas que não estão na ficha (Quem é você?, missões, serviços): pelo código de cada
    // parágrafo do texto mostrado (a missão vem entre a descrição e a recompensa)
    const M = this.manifesto(), V = M && M[P.id];
    if (V) for (const par of texto.split('\n\n')) {
      const c = this.codigo(par.trim()), d = V.falas[c] !== undefined ? V.falas[c] : V.extras && V.extras[c];
      if (d !== undefined) return { txt: par.trim(), c, d };
    }
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
    if (!this.dublado(P)) { this.parar(true); return false; }
    const q = this.achar(P, texto), vol = this.volume();
    if (q && this.atual && this.atual.id === P.id && this.atual.c === q.c && this.falando()) return true;   // a mesma fala, ainda tocando: segue
    this.parar(true);
    if (!q || vol <= 0 || typeof Audio === 'undefined') return true;
    const a = this.audio = new Audio(`dublagem/npcs/${P.id}/${q.c}.mp3`);
    a.volume = vol;
    this.atual = { id: P.id, c: q.c };
    a.addEventListener('ended', () => { if (this.audio === a) { this.audio = null; this.atual = null; } });
    // o morador responde depois que o herói termina a pergunta
    const tocar = () => { if (this.audio !== a) return; const p = a.play(); if (p && p.catch) p.catch(() => { if (this.audio === a) { this.audio = null; this.atual = null; } }); };
    if (this.perguntando()) this.depois = tocar; else tocar();
    return true;
  },
  // fecharConversa: a pergunta do herói ("Até logo.") termina mesmo com a conversa fechada
  parar(manterHeroi) {
    const a = this.audio;
    if (a) { try { a.pause(); } catch (e) { /* nada */ } }
    this.audio = null; this.atual = null; this.depois = null;
    if (!manterHeroi && this.heroiAudio) { try { this.heroiAudio.pause(); } catch (e) { /* nada */ } this.heroiAudio = null; }
  },

  // ------------------------------------------------------------ o herói perguntando
  // As perguntas da conversa têm a voz do herói ativo (dublagem/herois/<herói>/<código>.mp3, gerado por
  // tools/dublagem/gerar_perguntas.py; manifesto js/assets/vozes_herois.js). Personagem criado: a voz
  // do herói da classe dele se o corpo for do mesmo sexo; senão a do Kael ou da Lyra.
  heroiAudio: null, depois: null,
  heroi() {
    const M = typeof VOZES_HEROI !== 'undefined' ? VOZES_HEROI : null, d = typeof game !== 'undefined' && game.player && game.player.def;
    if (!M || !d) return null;
    if (M[d.id]) return d.id;
    const A = d.aparencia;
    const sexo = A && Number.isInteger(A.corpoG) ? (A.corpoG % 2 ? 'f' : 'm') : null;
    const base = typeof heroBase === 'function' ? heroBase(d.id) : null;
    if (base && M[base] && (!sexo || M[base].sexo === sexo)) return base;
    const h = sexo === 'f' ? 'lyra' : 'kael';
    return M[h] ? h : null;
  },
  perguntar(texto) {
    const h = this.heroi(), vol = this.volume();
    if (this.heroiAudio) { try { this.heroiAudio.pause(); } catch (e) { /* nada */ } this.heroiAudio = null; }
    if (!h || !texto || vol <= 0 || typeof Audio === 'undefined') return false;
    const c = this.codigo(String(texto)), V = VOZES_HEROI[h];
    if (V.falas[c] === undefined) return false;
    const a = this.heroiAudio = new Audio(`dublagem/herois/${h}/${c}.mp3`);
    a.volume = vol;
    const fim = () => { if (this.heroiAudio !== a) return; this.heroiAudio = null; const f = this.depois; this.depois = null; if (f) f(); };
    a.addEventListener('ended', fim);
    a.addEventListener('error', fim);
    setTimeout(fim, (V.falas[c] + 0.8) * 1000);   // (se o áudio travar ou demorar a carregar, o morador não fica esperando)
    const p = a.play();
    if (p && p.catch) p.catch(fim);
    return true;
  },
  perguntando() { const a = this.heroiAudio; return !!(a && !a.paused && !a.ended); },
  falando() { const a = this.audio; return !!(a && !a.paused && !a.ended); },
};
if (typeof window !== 'undefined') window.Vozes = Vozes;
