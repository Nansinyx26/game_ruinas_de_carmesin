'use strict';
// ECLIPSE ZERO · Perfis gráficos (celular, web, desktop, extremo), benchmark com perfil automático e
// o medidor de desempenho (Graficos)
// ---------------------------------------------------------------------------
// PERFIS: um perfil escolhe de uma vez as opções de vídeo (resolução interna, renderizador e qualidade
// da 3ª pessoa, texturas, vegetação, sombras, efeitos, clima e o pós-processamento cinematográfico);
// cada opção continua ajustável sozinha depois (Configurações → Vídeo).
// BENCHMARK (na primeira vez que o jogo abre, ou em "Perfil gráfico → Automático"): olha o aparelho
// (placa de vídeo, tamanho máximo de textura, núcleos, memória, tela, toque) e mede os quadros do
// próprio jogo por alguns segundos; escolhe o perfil, aplica, salva e avisa. Placa emulada por
// software (SwiftShader, llvmpipe) fica no perfil Web leve.
// MEDIDOR (Configurações → Vídeo → Medidor de desempenho, ou F4): FPS, tempo do quadro (média e o pior
// 1%), tempo de CPU do quadro (atualização + desenho), a placa de vídeo, a memória do JavaScript, os
// triângulos e chamadas de desenho do 3D e a resolução interna.
// ---------------------------------------------------------------------------
const GRAFICOS_PERFIS = {
  celular: { visao: 0, nome: 'Celular', vizinhos: false, renderScale: 75, render3d: 'classico', realQual: 0, texHD: 0, vegQ: 1, sombras: 1, quality: 1, clima: 1, postfx: 1, cineCor: false, cineVinheta: false, cineGrao: false, cineNitidez: false },
  web: { visao: 1, vizinhos: true, nome: 'Web', renderScale: 100, render3d: 'realista', realQual: 1, texHD: 1, vegQ: 2, sombras: 2, quality: 2, clima: 2, postfx: 2, cineCor: true, cineVinheta: true, cineGrao: false, cineNitidez: false },
  desktop: { visao: 2, vizinhos: true, nome: 'Desktop', renderScale: 100, render3d: 'realista', realQual: 3, texHD: 2, vegQ: 3, sombras: 3, quality: 2, clima: 2, postfx: 2, cineCor: true, cineVinheta: true, cineGrao: false, cineNitidez: true },
  extremo: { visao: 3, vizinhos: true, nome: 'Extreme PC', renderScale: 125, render3d: 'realista', realQual: 5, texHD: 2, vegQ: 4, sombras: 4, quality: 2, clima: 2, postfx: 2, cineCor: true, cineVinheta: true, cineGrao: true, cineNitidez: true },
};
const Graficos = {
  CHAVE: 'eclipse_zero_benchmark_v1',
  bench: null,      // benchmark em andamento: { t, quadros: [], hw }
  ultimo: null,     // resultado salvo: { perfil, fps, gpu, quando }
  // medidor
  med: { quadros: new Float32Array(240), i: 0, n: 0, cpu: 0, cpuAcc: 0, cpuN: 0, t0: 0 },
  // ------------------------------------------------------------ o aparelho
  hardware() {
    if (this._hw) return this._hw;
    const hw = { gpu: '?', maxTex: 0, nucleos: 0, memoria: 0, dpr: 1, tela: [0, 0], toque: false, software: false, webgl2: false };
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
      if (gl) {
        hw.webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        const d = gl.getExtension('WEBGL_debug_renderer_info');
        hw.gpu = String(d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
        hw.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
        const L = gl.getExtension('WEBGL_lose_context'); if (L) L.loseContext();
      }
    } catch (e) { /* sem WebGL */ }
    if (typeof navigator !== 'undefined') { hw.nucleos = navigator.hardwareConcurrency || 0; hw.memoria = navigator.deviceMemory || 0; }
    if (typeof window !== 'undefined') { hw.dpr = window.devicePixelRatio || 1; hw.tela = [screen.width * hw.dpr, screen.height * hw.dpr]; }
    hw.toque = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    hw.software = /swiftshader|llvmpipe|software|basic render/i.test(hw.gpu);
    hw.dedicada = /nvidia|geforce|rtx|gtx|radeon rx|radeon pro|arc a/i.test(hw.gpu);
    return (this._hw = hw);
  },
  // ------------------------------------------------------------ perfis
  aplicarPerfil(id, g = typeof game !== 'undefined' ? game : null) {
    const P = GRAFICOS_PERFIS[id];
    if (!P) return false;
    const v = Settings.v;
    for (const k in P) if (k !== 'nome' && k in v) v[k] = P[k];
    v.perfilGfx = id;
    Settings.save();
    if (g) Settings.apply(g);
    return true;
  },
  // Escolhe o perfil pelo aparelho e pelos quadros medidos (fps: média do benchmark)
  escolher(hw, fps) {
    if (hw.software) return 'web';
    if (hw.toque && !hw.dedicada) return 'celular';
    if (hw.memoria && hw.memoria < 4) return 'celular';
    if (fps < 28) return hw.toque ? 'celular' : 'web';
    if (fps < 50) return 'web';
    if (hw.dedicada && fps >= 58 && (hw.memoria === 0 || hw.memoria >= 8) && hw.nucleos >= 8 && hw.maxTex >= 16384) return 'extremo';
    return 'desktop';
  },
  // ------------------------------------------------------------ benchmark (no menu, na primeira vez)
  carregar() {
    try { this.ultimo = JSON.parse(localStorage.getItem(this.CHAVE) || 'null'); } catch (e) { this.ultimo = null; }
    return this.ultimo;
  },
  precisa() {
    if (typeof navigator !== 'undefined' && navigator.webdriver) return false;   // (testes automáticos: sem benchmark sozinho)
    return !this.carregar() || Settings.v.perfilGfx === 'auto';
  },
  iniciar(seg = 4) { this.bench = { t: 0, dur: seg, quadros: [], hw: this.hardware() }; },
  // a cada quadro (game.loop): guarda o tempo; no fim decide
  quadro(raw, g) {
    const B = this.bench;
    if (!B) return;
    B.t += raw;
    if (B.t > Math.min(0.8, B.dur * 0.3)) B.quadros.push(raw);   // (o começo é de aquecimento: shaders e texturas)
    if (B.t < B.dur) return;
    this.bench = null;
    const Q = B.quadros.slice().sort((a, b) => a - b), med = Q.length ? Q[Math.floor(Q.length / 2)] : 1 / 30;
    const fps = Math.round(1 / Math.max(1e-3, med)), perfil = this.escolher(B.hw, fps);
    this.ultimo = { perfil, fps, gpu: B.hw.gpu, quando: Date.now() };
    try { localStorage.setItem(this.CHAVE, JSON.stringify(this.ultimo)); } catch (e) { /* nada */ }
    this.aplicarPerfil(perfil, g);
    const msg = `Perfil gráfico: ${GRAFICOS_PERFIS[perfil].nome} · benchmark ${fps} FPS`;
    if (g && g.menu && g.menu.notify) g.menu.notify(msg, '120,220,255', 'monitor');
    else if (g && g.hud && g.hud.toast) g.hud.toast(msg, '120,220,255');
    return this.ultimo;
  },
  // ------------------------------------------------------------ medidor
  // marca o começo do trabalho do quadro (CPU) e o fim
  ini() { this.med.t0 = performance.now(); },
  fim(raw) {
    const M = this.med, ms = performance.now() - M.t0;
    M.cpuAcc += ms; M.cpuN++;
    if (M.cpuN >= 20) { M.cpu = M.cpuAcc / M.cpuN; M.cpuAcc = 0; M.cpuN = 0; }
    M.quadros[M.i] = raw * 1000; M.i = (M.i + 1) % M.quadros.length; M.n = Math.min(M.n + 1, M.quadros.length);
  },
  estatisticas() {
    const M = this.med, n = M.n;
    if (!n) return { fps: 0, ms: 0, pior: 0, cpu: 0 };
    const L = Array.from(M.quadros.subarray(0, n)).sort((a, b) => a - b), soma = L.reduce((s, x) => s + x, 0), ms = soma / n;
    return { fps: Math.round(1000 / Math.max(0.1, ms)), ms, pior: L[Math.max(0, Math.floor(n * 0.99) - 1)], cpu: M.cpu };
  },
  ligado() { return !!(Settings.v.medidor || (typeof game !== 'undefined' && game.medidor)); },
  desenhar(ctx, g) {
    if (!this.ligado()) return;
    const S = this.estatisticas(), hw = this.hardware(), x = 76, y = VIEW_H - 372;   // (à esquerda, acima do chat: longe do painel da missão)
    const real = typeof Realista3D !== 'undefined' && Realista3D.ok && typeof ThirdView !== 'undefined' && ThirdView.active() ? Realista3D.info() : null;
    const mem = typeof performance !== 'undefined' && performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    const perfil = GRAFICOS_PERFIS[Settings.v.perfilGfx];
    const L = [
      [`${S.fps} FPS`, S.fps >= 55 ? '120,255,160' : S.fps >= 30 ? '255,220,110' : '255,110,110'],
      [`quadro ${S.ms.toFixed(1)} ms · pior 1% ${S.pior.toFixed(1)} ms`],
      [`CPU ${S.cpu.toFixed(1)} ms por quadro`],
      [`GPU ${hw.gpu.replace(/^ANGLE \(|\)$/g, '').slice(0, 40)}`],
      [mem !== null ? `memória JS ${mem} MB` : `memória do aparelho ${hw.memoria || '?'} GB`],
      [real ? `3D realista: ${(real.tris / 1000).toFixed(0)} mil triângulos · ${real.chamadas} chamadas` : `3D: ${typeof R3D !== 'undefined' && R3D.ok ? 'motor clássico' : 'desligado'}`],
      [`resolução ${Math.round(VIEW_W * (g.renderScale || 1))}×${Math.round(VIEW_H * (g.renderScale || 1))} (${Math.round((g.renderScale || 1) * 100)}%) · ${perfil ? perfil.nome : 'Personalizado'}`],
    ];
    ctx.save();
    ctx.fillStyle = 'rgba(4,8,16,0.72)'; ctx.strokeStyle = 'rgba(120,220,255,0.35)'; ctx.lineWidth = 1;
    ctx.fillRect(x, y, 300, 22 + L.length * 16); ctx.strokeRect(x + 0.5, y + 0.5, 300, 22 + L.length * 16);
    ctx.font = `11px ${typeof FONT_UI !== 'undefined' ? FONT_UI : 'sans-serif'}`; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(120,220,255,0.9)'; ctx.fillText('DESEMPENHO', x + 10, y + 15);
    L.forEach(([t, c], k) => { ctx.fillStyle = `rgba(${c || '225,235,245'},0.95)`; ctx.fillText(t, x + 10, y + 32 + k * 16); });
    // o gráfico dos últimos quadros (ms): verde até 16,7, amarelo até 33
    const M = this.med, gw = 120, gx = x + 170, gy = y + 4, gh = 14;
    for (let k = 0; k < gw; k++) {
      const v = M.quadros[(M.i - gw + k + M.quadros.length) % M.quadros.length];
      if (!v) continue;
      ctx.fillStyle = v <= 17.5 ? 'rgba(120,255,160,0.8)' : v <= 34 ? 'rgba(255,220,110,0.8)' : 'rgba(255,110,110,0.85)';
      const h = Math.min(gh, v / 50 * gh); ctx.fillRect(gx + k, gy + gh - h, 1, h);
    }
    ctx.restore();
  },
};
if (typeof window !== 'undefined') window.Graficos = Graficos;
