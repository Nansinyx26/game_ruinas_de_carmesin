'use strict';
// ECLIPSE ZERO · Áudio: efeitos e ambiente sintetizados com a Web Audio API
// ---------------------------------------------------------------------------
// ÁUDIO: efeitos sintetizados em tempo real com a Web Audio API
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// TRILHA SONORA (MÚSICA): reprodução das faixas com transições suaves (crossfade)
// ---------------------------------------------------------------------------
const MUSIC_TRACKS = {
  menu: {
    id: 'menu',
    src: 'assets/music/00_main_menu.mp3',
    alt: 'Musica jogo eclispe zero/ECLIPSE ZERO — Main Menu Theme.mp3',
    title: 'ECLIPSE ZERO — Main Menu Theme',
  },
  prologue: {
    id: 'prologue',
    src: 'assets/music/01_nascimento_eclipse.mp3',
    alt: 'Musica jogo eclispe zero/01-—-O-nascimento-de-Eclipse-versao-1.mp3',
    title: 'O Nascimento de Eclipse',
  },
  facility: {
    id: 'facility',
    src: 'assets/music/02_despertar_kael.mp3',
    alt: 'Musica jogo eclispe zero/02-—-O-despertar-de-Kael.mp3',
    title: 'O Despertar de Kael',
  },
  vesper: {
    id: 'vesper',
    src: 'assets/music/03_vesper_faccoes.mp3',
    alt: 'Musica jogo eclispe zero/03-—-Vesper-e-as-três-facçõe.mp3',
    title: 'Vesper e as Três Facções',
  },
  nexus_encounter: {
    id: 'nexus_encounter',
    src: 'assets/music/04_encontro_nexus.mp3',
    alt: 'Musica jogo eclispe zero/04-—-O-encontro-com-NEXUS.mp3',
    title: 'O Encontro com NEXUS',
  },
  boss: {
    id: 'boss',
    src: 'assets/music/05_batalha_final.mp3',
    alt: 'Musica jogo eclispe zero/05-—-A-batalha-final.mp3',
    title: 'A Batalha Final',
  },
  ending: {
    id: 'ending',
    src: 'assets/music/06_tres_finais_v1.mp3',
    title: 'Os Três Finais',
  },
  ending_1: {
    id: 'ending_1',
    src: 'assets/music/06_tres_finais_v1.mp3',
    title: 'Os Três Finais',
  },
};

class MusicPlayer {
  constructor(sys) {
    this.sys = sys;
    this.tracks = MUSIC_TRACKS;
    this.cache = {};
    this.currentKey = null;
    this.currentAudio = null;
    this.currentGain = 0;
    this.fadingAudio = null;
    this.fadingGain = 0;
    this.fadeDur = 1.2;
    this.pausedByGame = false;
    this.unlocked = false;
    this.pendingKey = null;
    this.pendingOpts = null;
    this.duckGain = 1.0;
  }

  getAudio(key) {
    if (!key || !this.tracks[key]) return null;
    if (this.cache[key]) return this.cache[key];
    const def = this.tracks[key];
    const a = new Audio();
    a.src = def.src;
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    // Fallback caso o arquivo em assets/music não carregue
    a.addEventListener('error', () => {
      if (def.alt && a.src !== def.alt) {
        a.src = encodeURI(def.alt);
        if (this.currentKey === key && this.unlocked) {
          a.play().catch(() => {});
        }
      }
    });
    // Garantir loop contínuo sem interrupções (fallback se o navegador não repetir nativamente)
    a.addEventListener('ended', () => {
      if (a.loop && this.currentKey === key) {
        try {
          a.currentTime = 0;
          a.play().catch(() => {});
        } catch (e) {}
      }
    });
    this.cache[key] = a;
    return a;
  }

  unlock() {
    this.unlocked = true;
    if (this.pendingKey) {
      const k = this.pendingKey, opts = this.pendingOpts;
      this.pendingKey = null;
      this.pendingOpts = null;
      this.play(k, opts);
    } else if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(() => {});
    } else if (!this.currentAudio && typeof game !== 'undefined' && game.state === 'menu') {
      this.play('menu', { loop: true });
    }
  }

  play(key, { fade = 1.2, loop = true, restart = false } = {}) {
    if (!key || !this.tracks[key]) {
      this.stop({ fade });
      return;
    }

    if (this.currentKey === key && this.currentAudio && !restart) {
      this.currentAudio.loop = loop;
      if (this.unlocked && this.currentAudio.paused) {
        this.currentAudio.play().catch(() => {});
      }
      return;
    }

    if (!this.unlocked) {
      this.pendingKey = key;
      this.pendingOpts = { fade, loop, restart };
      const testAudio = this.getAudio(key);
      if (testAudio) {
        const p = testAudio.play();
        if (p && p.then) {
          p.then(() => {
            this.unlocked = true;
            this.pendingKey = null;
            this.pendingOpts = null;
            this.setupCurrent(key, testAudio, fade, loop, restart);
          }).catch(() => {
            // navegador aguardará interação
          });
        }
      }
      return;
    }

    const nextAudio = this.getAudio(key);
    if (!nextAudio) return;
    this.setupCurrent(key, nextAudio, fade, loop, restart);
  }

  setupCurrent(key, nextAudio, fade, loop, restart) {
    if (this.currentAudio && this.currentAudio !== nextAudio) {
      if (this.fadingAudio && this.fadingAudio !== this.currentAudio) {
        try { this.fadingAudio.pause(); } catch (e) {}
      }
      this.fadingAudio = this.currentAudio;
      this.fadingGain = this.currentGain;
    }

    this.currentKey = key;
    this.currentAudio = nextAudio;
    this.currentAudio.loop = loop;
    this.fadeDur = Math.max(0.1, fade);

    if (restart || this.currentAudio.paused) {
      try { this.currentAudio.currentTime = 0; } catch (e) {}
    }

    this.currentGain = (fade > 0 && this.fadingAudio) ? 0 : 1;
    this.applyVolume();

    try {
      const p = this.currentAudio.play();
      if (p && p.catch) {
        p.catch(() => {
          this.pendingKey = key;
        });
      }
    } catch (e) {
      this.pendingKey = key;
    }
  }

  stop({ fade = 1.2 } = {}) {
    if (this.currentAudio) {
      this.fadingAudio = this.currentAudio;
      this.fadingGain = this.currentGain;
      this.currentAudio = null;
      this.currentKey = null;
      this.currentGain = 0;
      this.fadeDur = Math.max(0.1, fade);
    }
    this.pendingKey = null;
  }

  setPausedState(paused) {
    this.pausedByGame = !!paused;
    this.applyVolume();
  }

  computeBaseVolume() {
    if (this.sys.muted) return 0;
    const master = this.sys.volume / 0.69;
    const music = this.sys.musicVol ?? 0.60;
    const pauseMult = this.pausedByGame ? 0.6 : 1.0;
    // Músicas masterizadas a 0dB (Suno): ganho calibrado para harmonizar com efeitos e voz
    const balance = 0.35;
    return clamp(master * music * pauseMult * balance * this.duckGain, 0, 1);
  }

  applyVolume() {
    const base = this.computeBaseVolume();
    if (this.currentAudio) {
      this.currentAudio.volume = clamp(base * this.currentGain, 0, 1);
    }
    if (this.fadingAudio) {
      this.fadingAudio.volume = clamp(base * this.fadingGain, 0, 1);
    }
  }

  update(dt) {
    let changed = false;
    const rate = dt / Math.max(0.1, this.fadeDur);

    if (this.currentAudio && this.currentGain < 1) {
      this.currentGain = Math.min(1, this.currentGain + rate);
      changed = true;
    }

    if (this.fadingAudio) {
      this.fadingGain = Math.max(0, this.fadingGain - rate);
      changed = true;
      if (this.fadingGain <= 0) {
        try {
          this.fadingAudio.pause();
          this.fadingAudio.currentTime = 0;
        } catch (e) {}
        this.fadingAudio = null;
      }
    }

    // Ducking automático para priorizar a voz/narração
    const isNarrating = this.sys.narration && this.sys.narration.isPlaying();
    const inStory = (typeof game !== 'undefined' && game.state === 'story');
    // Quando a voz fala: abaixa para 0.15 (voz reina com clareza cristalina)
    // Na tela de história entre falas: 0.40 (ambiente sutil para leitura)
    // No jogo/menu normal: 1.0
    const targetDuck = isNarrating ? 0.15 : (inStory ? 0.40 : 1.0);
    if (Math.abs(this.duckGain - targetDuck) > 0.005) {
      const duckSpeed = isNarrating ? 4.5 : 1.2; // abaixa instantaneamente (~0.18s), volta suave
      if (this.duckGain > targetDuck) {
        this.duckGain = Math.max(targetDuck, this.duckGain - duckSpeed * dt);
      } else {
        this.duckGain = Math.min(targetDuck, this.duckGain + duckSpeed * dt);
      }
      changed = true;
    }

    if (changed) {
      this.applyVolume();
    }

    // Garantia de loop contínuo da música (mantém a trilha repetindo sem parar)
    if (this.unlocked && !this.pausedByGame && this.currentAudio && this.currentAudio.loop) {
      if (this.currentAudio.ended) {
        try {
          this.currentAudio.currentTime = 0;
          this.currentAudio.play().catch(() => {});
        } catch (e) {}
      } else if (this.currentAudio.paused && this.currentGain > 0.05 && this.currentAudio.currentTime > 0) {
        this.currentAudio.play().catch(() => {});
      }
    }
  }
}

// ---------------------------------------------------------------------------
// NARRAÇÃO: reprodução de áudio de dublagem sincronizado com as páginas da história
// ---------------------------------------------------------------------------
class NarrationPlayer {
  constructor(sys) {
    this.sys = sys;
    this.audio = null;       // <Audio> em reprodução (ou null)
    this.currentSrc = null;  // caminho do arquivo tocando agora
    this.fadingAudio = null; // <Audio> saindo com fade-out
    this.fadeGain = 1;       // ganho do áudio que está saindo (0→1)
    this.fadeRate = 0;       // taxa de fade por segundo
    this.cache = {};         // cache de elementos <Audio> já criados
    this.queue = [];
    this.queueTimer = null;
  }

  // Obtém (ou cria) um elemento <Audio> para o caminho dado
  getAudio(src) {
    if (!src) return null;
    if (this.cache[src]) return this.cache[src];
    const a = new Audio();
    a.src = encodeURI(src);
    a.preload = 'auto';
    a.loop = false;
    a.volume = 0;
    this.cache[src] = a;
    return a;
  }

  computeVolume() {
    if (this.sys.muted) return 0;
    const master = this.sys.volume / 0.69;
    const voice = (this.sys.voiceVol !== undefined) ? this.sys.voiceVol : 1.0;
    // Voz / Narração sempre com ganho total (1.0) para clareza e inteligibilidade absoluta
    return clamp(master * voice * 1.0, 0, 1);
  }

  // Inicia (ou troca) a narração de uma página ou sequência de falas
  play(src, { fade = 0.6 } = {}) {
    this.clearQueue();
    if (!src) { this.stop({ fade }); return; }
    if (Array.isArray(src)) {
      const list = src.filter(Boolean);
      if (!list.length) { this.stop({ fade }); return; }
      this.queue = list.slice(1);
      this._playItem(list[0], { fade });
      return;
    }
    this._playItem(src, { fade });
  }

  _playItem(src, { fade = 0.6 } = {}) {
    if (this.currentSrc === src && this.audio && !this.audio.ended && !this.audio.paused) return;
    // Descarta narração anterior com fade-out
    if (this.audio && !this.audio.paused) {
      if (this.fadingAudio && this.fadingAudio !== this.audio) {
        try { this.fadingAudio.pause(); } catch (e) {}
      }
      this.fadingAudio = this.audio;
      this.fadeGain = 1;
      this.fadeRate = fade > 0 ? 1 / fade : 100;
    }
    const a = this.getAudio(src);
    if (this.fadingAudio === a) this.fadingAudio = null;
    this.audio = a;
    this.currentSrc = src;
    try { a.currentTime = 0; } catch (e) {}
    a.volume = clamp(this.computeVolume(), 0, 1);
    a.onended = () => {
      if (this.audio === a && this.queue && this.queue.length > 0) {
        const next = this.queue.shift();
        this.queueTimer = setTimeout(() => {
          this.queueTimer = null;
          this._playItem(next, { fade: 0.1 });
        }, 320); // pausa natural entre falas
      }
    };
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  }

  clearQueue() {
    this.queue = [];
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }
  }

  // Verifica se a voz está sendo reproduzida no momento
  isPlaying() {
    if (this.queueTimer) return true;
    if (this.queue && this.queue.length > 0) return true;
    if (!this.audio) return false;
    return !this.audio.paused && !this.audio.ended;
  }

  // Para a narração com fade-out
  stop({ fade = 0.5 } = {}) {
    this.clearQueue();
    if (this.audio) {
      if (this.audio.onended) this.audio.onended = null;
      if (this.fadingAudio && this.fadingAudio !== this.audio) {
        try { this.fadingAudio.pause(); } catch (e) {}
      }
      this.fadingAudio = this.audio;
      this.fadeGain = 1;
      this.fadeRate = fade > 0 ? 1 / fade : 100;
      this.audio = null;
      this.currentSrc = null;
    }
  }

  // Atualiza volumes e fade-out (chamado a cada frame)
  update(dt) {
    const vol = this.computeVolume();
    if (this.audio && !this.audio.paused) {
      this.audio.volume = clamp(vol, 0, 1);
    }
    if (this.fadingAudio) {
      this.fadeGain = Math.max(0, this.fadeGain - this.fadeRate * dt);
      this.fadingAudio.volume = clamp(vol * this.fadeGain, 0, 1);
      if (this.fadeGain <= 0) {
        try { this.fadingAudio.pause(); this.fadingAudio.currentTime = 0; } catch (e) {}
        this.fadingAudio = null;
      }
    }
  }

  applyVolume() {
    const vol = this.computeVolume();
    if (this.audio && !this.audio.paused) this.audio.volume = clamp(vol, 0, 1);
    if (this.fadingAudio) this.fadingAudio.volume = clamp(vol * this.fadeGain, 0, 1);
  }
}

class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.55; this.sfxVol = 1; this.ambVol = 1; this.musicVol = 0.60; this.voiceVol = 1.0;
    this.sfx = null; this.amb = null;
    this.last = {};
    this.noiseBuf = null;
    this.ambient = null;
    this.music = new MusicPlayer(this);
    this.narration = new NarrationPlayer(this);

    // SFX oficial da espada energética (intro/corte cinematográfico)
    this.sfxSword = new Audio();
    this.sfxSword.src = 'assets/sfx/sfx_espada_energetica.mp3';
    this.sfxSword.preload = 'auto';
    this.sfxSword.volume = 0.95;
    this.sfxSword.addEventListener('error', () => {
      const alt = 'Sound Effect (SFX)/SFX de espada energética no ECLIPSE ZERO.mp3';
      if (this.sfxSword.src !== alt) {
        this.sfxSword.src = encodeURI(alt);
      }
    });
  }

  playSwordSlashSFX() {
    if (this.muted) return;
    try {
      this.sfxSword.currentTime = 0;
      const master = this.volume / 0.69;
      const sfx = this.sfxVol ?? 1;
      this.sfxSword.volume = clamp(master * sfx * 0.95, 0, 1);
      const p = this.sfxSword.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  // O navegador só libera o áudio após uma interação do usuário
  unlock() {
    this.music.unlock();
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4;
      comp.attack.value = 0.003; comp.release.value = 0.2;
      this.master.connect(comp);
      comp.connect(c.destination);
      // Canais separados para efeitos e ambiente (volumes nas configurações)
      this.sfx = c.createGain(); this.sfx.gain.value = this.sfxVol; this.sfx.connect(this.master);
      this.amb = c.createGain(); this.amb.gain.value = this.ambVol; this.amb.connect(this.master);
      // Buffer de ruído branco reutilizado por todos os sons de "sopro" e impacto
      const len = Math.floor(c.sampleRate * 1.5);
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx ? this.ctx.currentTime : 0, 0.02);
    this.music.applyVolume();
    this.narration.applyVolume();
    if (this.sfxSword) this.sfxSword.volume = this.muted ? 0 : clamp((this.volume / 0.69) * (this.sfxVol ?? 1) * 0.95, 0, 1);
    return !this.muted;
  }

  // Volumes vindos das configurações (0..1); 'sound' liga/desliga tudo
  setMix(sound, master, sfx, amb, music, voice) {
    this.muted = !sound;
    this.volume = 0.69 * master; this.sfxVol = sfx; this.ambVol = amb;
    if (music !== undefined) this.musicVol = music;
    if (voice !== undefined) this.voiceVol = voice;
    this.music.applyVolume();
    this.narration.applyVolume();
    if (this.sfxSword) this.sfxSword.volume = this.muted ? 0 : clamp((this.volume / 0.69) * (this.sfxVol ?? 1) * 0.95, 0, 1);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, t, 0.02);
    this.sfx.gain.setTargetAtTime(this.sfxVol, t, 0.02);
    this.amb.gain.setTargetAtTime(this.ambVol, t, 0.02);
  }

  playMusic(name, opts) {
    return this.music.play(name, opts);
  }

  stopMusic(opts) {
    return this.music.stop(opts);
  }

  update(dt) {
    this.music.update(dt);
    this.narration.update(dt);
  }

  // Evita sobreposição excessiva do mesmo som (ex.: vários acertos no mesmo frame)
  throttle(name, gap) {
    const t = this.ctx.currentTime;
    if (this.last[name] !== undefined && t - this.last[name] < gap) return false;
    this.last[name] = t;
    return true;
  }

  // Oscilador com envelope e varredura de frequência
  osc(type, f0, f1, dur, vol, delay = 0, attack = 0.004, dest = null) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  // Ruído filtrado com envelope (sopros, impactos, explosões)
  noise(dur, vol, ftype, f0, f1, q = 1, delay = 0, attack = 0.003) {
    const c = this.ctx, t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter();
    f.type = ftype; f.Q.value = q;
    f.frequency.setValueAtTime(Math.max(20, f0), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfx);
    src.start(t, Math.random() * 1.2); src.stop(t + dur + 0.05);
  }

  // Sequência de notas (jingles de interface)
  arp(notes, step, dur, vol, type = 'triangle') {
    notes.forEach((n, i) => this.osc(type, n, n, dur, vol, i * step, 0.01));
  }

  play(name, p = 1) {
    if (!this.ctx || this.muted) return;
    try {
      switch (name) {
        case 'swing':
          if (!this.throttle(name, 0.03)) return;
          this.noise(0.13, 0.2 * p, 'bandpass', 700, 3400, 1.3);
          this.osc('sine', 320, 120, 0.08, 0.04 * p);
          this.osc('square', 2400, 900, 0.05, 0.012 * p);   // estalo elétrico da lâmina
          break;
        case 'draw':          // sacar a arma das costas: lâmina deslizando para fora + tinido
          if (!this.throttle(name, 0.2)) return;
          this.noise(0.22, 0.12 * p, 'bandpass', 1800, 5200, 2.2);
          this.osc('sine', 2600, 3400, 0.35, 0.018 * p, 0.16);
          this.osc('square', 900, 1400, 0.05, 0.01 * p);
          break;
        case 'sheathe':       // guardar: lâmina deslizando para dentro + clique da trava
          if (!this.throttle(name, 0.2)) return;
          this.noise(0.26, 0.1 * p, 'bandpass', 4200, 1500, 2.0);
          this.osc('square', 1700, 600, 0.04, 0.02 * p, 0.27);
          this.noise(0.03, 0.12 * p, 'highpass', 3000, 3000, 0.8, 0.27);
          break;
        case 'swingHeavy':
          this.noise(0.26, 0.3, 'bandpass', 380, 1900, 1.1);
          this.osc('sawtooth', 130, 55, 0.22, 0.05);
          this.noise(0.12, 0.08, 'highpass', 5200, 2400, 0.8, 0.03);
          break;
        case 'zap':
          if (!this.throttle(name, 0.05)) return;
          this.noise(0.09, 0.16 * p, 'bandpass', 5200, 1600, 2.5);
          this.osc('square', 1900, 420, 0.07, 0.035 * p);
          this.osc('sawtooth', 120, 60, 0.06, 0.04 * p);
          break;
        case 'thunder':
          if (!this.throttle(name, 0.12)) return;
          this.noise(0.08, 0.5 * p, 'highpass', 3000, 1200, 0.7);
          this.noise(1.1, 0.45 * p, 'lowpass', 900, 60, 0.7, 0.04);
          this.osc('sine', 70, 28, 0.9, 0.4 * p, 0.03);
          break;
        case 'memory':
          this.arp([523, 784, 1046, 1568], 0.11, 0.9, 0.05, 'sine');
          this.osc('triangle', 2093, 2093, 1.2, 0.02, 0.4, 0.2);
          this.noise(1.4, 0.05, 'bandpass', 900, 3000, 4);
          break;
        case 'glitch':
          if (!this.throttle(name, 0.1)) return;
          for (let i = 0; i < 4; i++) this.osc('square', rand(200, 2400), rand(80, 1800), 0.04, 0.03, i * 0.035);
          this.noise(0.18, 0.12, 'bandpass', 2600, 700, 3);
          break;
        case 'type':
          if (!this.throttle(name, 0.045)) return;
          this.osc('square', rand(1500, 1900), 900, 0.018, 0.01);
          break;
        case 'thrust':
          this.noise(0.12, 0.28, 'bandpass', 1500, 4200, 1.5);
          this.osc('sine', 700, 180, 0.12, 0.06);
          break;
        case 'hit':
          if (!this.throttle(name, 0.035)) return;
          this.noise(0.07, 0.34 * p, 'lowpass', 3600, 600, 0.8);
          this.osc('sine', 190, 55, 0.13, 0.42 * p);
          this.osc('square', 1400, 420, 0.03, 0.05 * p);
          break;
        case 'hitHeavy':
          if (!this.throttle(name, 0.05)) return;
          this.noise(0.17, 0.5, 'lowpass', 2600, 180, 0.8);
          this.osc('sine', 140, 36, 0.26, 0.7);
          this.osc('triangle', 900, 200, 0.06, 0.12);
          break;
        case 'crit':
          if (!this.throttle(name, 0.05)) return;
          this.osc('triangle', 2600, 2150, 0.2, 0.1);
          this.osc('sine', 3900, 3400, 0.14, 0.05);
          break;
        case 'dash':
          this.noise(0.2, 0.24, 'highpass', 3600, 700, 0.7);
          this.osc('sine', 480, 900, 0.12, 0.035);
          break;
        case 'enemyDeath':
          if (!this.throttle(name, 0.05)) return;
          this.osc('sawtooth', 330 * p, 48, 0.38, 0.09);
          this.noise(0.32, 0.24, 'lowpass', 1900, 140, 0.9);
          break;
        case 'playerHurt':
          this.osc('square', 210, 70, 0.28, 0.14);
          this.noise(0.22, 0.34, 'lowpass', 1300, 200, 0.9);
          this.osc('sine', 95, 40, 0.3, 0.5);
          break;
        case 'soul': {
          if (!this.throttle(name, 0.04)) return;
          const r = rand(0.92, 1.18);
          this.osc('sine', 880 * r, 1320 * r, 0.12, 0.06);
          this.osc('triangle', 1760 * r, 1760 * r, 0.09, 0.025, 0.03);
          break;
        }
        case 'health':
          this.osc('sine', 523, 784, 0.18, 0.11);
          this.osc('sine', 784, 1046, 0.24, 0.09, 0.08);
          break;
        case 'shoot':
          if (!this.throttle(name, 0.05)) return;
          this.osc('square', 720, 180, 0.16, 0.05);
          this.noise(0.1, 0.09, 'bandpass', 2200, 800, 2);
          break;
        case 'laser':
          if (!this.throttle(name, 0.05)) return;
          this.osc('sawtooth', 1800, 300, 0.14, 0.045);
          this.osc('sine', 2600, 600, 0.1, 0.03);
          break;
        case 'fireball':   // disparo de dados de NEXUS
          if (!this.throttle(name, 0.06)) return;
          this.noise(0.22, 0.12, 'bandpass', 1800, 500, 2);
          this.osc('square', 880, 220, 0.12, 0.025);
          this.osc('sine', 440, 1320, 0.08, 0.02);
          break;
        case 'telegraph':
          if (!this.throttle(name, 0.08)) return;
          this.osc('sine', 240, 540, 0.28, 0.06);
          this.osc('triangle', 480, 1080, 0.28, 0.025);
          break;
        case 'chargeTier':
          this.osc('triangle', 900 + 500 * p, 900 + 500 * p, 0.16, 0.1);
          this.osc('sine', 1800 + 900 * p, 1800 + 900 * p, 0.22, 0.04, 0.02);
          break;
        case 'special':
          this.noise(1.3, 0.6, 'lowpass', 5200, 110, 0.7);
          this.noise(0.25, 0.4, 'highpass', 6000, 1800, 0.8);
          this.osc('sine', 110, 28, 1.1, 0.8);
          this.osc('sawtooth', 220, 55, 0.8, 0.1);
          this.osc('triangle', 392, 392, 1.0, 0.05, 0.02);
          this.osc('triangle', 466, 466, 1.0, 0.04, 0.04);
          this.osc('triangle', 587, 587, 1.0, 0.04, 0.06);
          for (let i = 0; i < 5; i++) this.osc('square', rand(900, 2600), rand(200, 600), 0.06, 0.03, 0.05 + i * 0.07);
          break;
        case 'specialCharge':
          this.noise(0.45, 0.2, 'bandpass', 300, 2600, 2);
          this.osc('sawtooth', 80, 320, 0.45, 0.05);
          this.osc('square', 60, 1200, 0.45, 0.02);
          break;
        case 'bossRoar': {
          const c = this.ctx, t = c.currentTime;
          const lp = c.createBiquadFilter(); lp.type = 'lowpass';
          lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(260, t + 1.9);
          const env = c.createGain();
          env.gain.setValueAtTime(0.0001, t);
          env.gain.exponentialRampToValueAtTime(0.5, t + 0.15);
          env.gain.setValueAtTime(0.5, t + 1.2);
          env.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
          // LFO de amplitude dá o "rosnado" gutural
          const lfo = c.createOscillator(), lfoG = c.createGain();
          lfo.frequency.value = 23; lfoG.gain.value = 0.22;
          lfo.connect(lfoG); lfoG.connect(env.gain);
          lp.connect(env); env.connect(this.sfx);
          for (const f of [55, 62, 74, 93]) {
            const o = c.createOscillator(); o.type = 'sawtooth';
            o.frequency.setValueAtTime(f * 1.25, t);
            o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 2.0);
            o.detune.value = rand(-15, 15);
            o.connect(lp); o.start(t); o.stop(t + 2.1);
          }
          lfo.start(t); lfo.stop(t + 2.1);
          this.noise(1.7, 0.3, 'bandpass', 420, 140, 0.8);
          break;
        }
        case 'door':   // comporta hidráulica
          this.noise(0.5, 0.25, 'bandpass', 2400, 600, 1.5);
          this.noise(1.2, 0.3, 'lowpass', 320, 70, 1, 0.3);
          this.osc('sawtooth', 48, 38, 1.3, 0.08);
          this.osc('square', 880, 880, 0.08, 0.04, 0);
          this.osc('square', 1320, 1320, 0.1, 0.04, 0.1);
          break;
        case 'uiMove':
          this.osc('triangle', 660, 660, 0.05, 0.04);
          break;
        case 'uiSelect':
          this.osc('triangle', 660, 990, 0.12, 0.07);
          this.osc('sine', 1320, 1320, 0.16, 0.035, 0.05);
          break;
        case 'uiDeny':
          this.osc('square', 180, 120, 0.15, 0.05);
          break;
        case 'comboName':
          this.osc('triangle', 784, 784, 0.12, 0.045);
          this.osc('triangle', 1175, 1175, 0.2, 0.045, 0.06);
          break;
        case 'explosion':
          if (!this.throttle(name, 0.06)) return;
          this.noise(0.6, 0.5, 'lowpass', 1800, 90, 0.8);
          this.osc('sine', 100, 30, 0.5, 0.55);
          break;
        case 'stomp':
          if (!this.throttle(name, 0.06)) return;
          this.noise(0.36, 0.44, 'lowpass', 650, 60, 0.9);
          this.osc('sine', 72, 30, 0.36, 0.65);
          break;
        case 'deflect':
          if (!this.throttle(name, 0.04)) return;
          this.osc('square', 1800, 1200, 0.06, 0.05);
          this.osc('triangle', 2400, 2000, 0.16, 0.05);
          break;
        case 'wallHit':
          if (!this.throttle(name, 0.06)) return;
          this.noise(0.12, 0.3, 'lowpass', 900, 100, 1);
          this.osc('sine', 120, 50, 0.14, 0.3);
          break;
        case 'upgrade':
          this.arp([523, 659, 784, 1046], 0.06, 0.25, 0.06);
          break;
        case 'skill':   // habilidade desbloqueada na árvore
          this.arp([784, 988, 1175, 1568], 0.05, 0.35, 0.06);
          this.osc('sine', 196, 392, 0.4, 0.06);
          break;
        case 'levelUp':
          this.arp([392, 523, 659, 784, 1046, 1318], 0.07, 0.55, 0.07);
          this.arp([196, 262, 330], 0.1, 1.1, 0.05, 'sine');
          this.noise(0.6, 0.08, 'bandpass', 900, 5200, 1.2);
          break;
        case 'roomClear':
          this.arp([659, 784, 988, 1318], 0.09, 0.4, 0.06);
          break;
        case 'waveStart':
          this.osc('sawtooth', 110, 104, 0.7, 0.06, 0, 0.05);
          this.osc('sawtooth', 165, 156, 0.7, 0.04, 0, 0.05);
          break;
        case 'victory':
          this.arp([392, 523, 659, 784, 1046], 0.14, 0.7, 0.08);
          this.arp([196, 262, 330], 0.14, 1.4, 0.05, 'sine');
          break;
        case 'defeat':
          this.arp([392, 311, 262, 196], 0.28, 0.8, 0.07, 'sawtooth');
          this.osc('sine', 98, 49, 2.0, 0.2, 0.2);
          break;
        case 'jump':
          this.noise(0.32, 0.2, 'lowpass', 400, 1600, 1);
          break;
        case 'spawn':
          if (!this.throttle(name, 0.08)) return;
          this.noise(0.35, 0.12, 'bandpass', 200, 900, 2);
          this.osc('sine', 90, 180, 0.3, 0.06);
          this.osc('square', 600, 1500, 0.12, 0.012, 0.1);
          break;
      }
    } catch (e) { /* falhas de áudio nunca devem travar o jogo */ }
  }

  // Zumbido ambiente grave com filtro modulado (a rede elétrica de Vesper)
  startAmbient() {
    if (!this.ctx || this.ambient) return;
    const c = this.ctx, t = c.currentTime;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.05, t + 3);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 230; lp.Q.value = 3;
    const lfo = c.createOscillator(), lfoG = c.createGain();
    lfo.frequency.value = 0.07; lfoG.gain.value = 90;
    lfo.connect(lfoG); lfoG.connect(lp.frequency);
    const oscs = [];
    for (const [f, type] of [[49, 'sawtooth'], [49.3, 'sawtooth'], [73.4, 'triangle'], [120, 'sine']]) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f;
      o.connect(lp); o.start(); oscs.push(o);
    }
    lp.connect(out); out.connect(this.amb);
    lfo.start(); oscs.push(lfo);
    this.ambient = { out, oscs };
  }

  stopAmbient() {
    if (!this.ambient) return;
    const { out, oscs } = this.ambient, t = this.ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setTargetAtTime(0.0001, t, 0.4);
    for (const o of oscs) o.stop(t + 2);
    this.ambient = null;
  }
}

