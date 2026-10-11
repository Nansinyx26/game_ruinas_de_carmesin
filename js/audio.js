'use strict';
// ECLIPSE ZERO · Áudio: efeitos e ambiente sintetizados com a Web Audio API
// ---------------------------------------------------------------------------
// ÁUDIO: efeitos sintetizados em tempo real com a Web Audio API
// ---------------------------------------------------------------------------
class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.55;
    this.last = {};
    this.noiseBuf = null;
    this.ambient = null;
  }

  // O navegador só libera o áudio após uma interação do usuário
  unlock() {
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
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
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
    o.connect(g); g.connect(dest || this.master);
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
    src.connect(f); f.connect(g); g.connect(this.master);
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
          lp.connect(env); env.connect(this.master);
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
    lp.connect(out); out.connect(this.master);
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

