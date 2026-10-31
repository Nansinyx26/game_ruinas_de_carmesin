'use strict';
// ECLIPSE ZERO · Configurações do jogador (persistentes) e o que cada uma altera
// ---------------------------------------------------------------------------
// CONFIGURAÇÕES: valores salvos no localStorage e aplicados aos sistemas reais
// (áudio, câmera, partículas, resolução, limite de FPS, pós-processamento,
// dificuldade, legendas e controle). Cada opção listada em SETTINGS_TABS tem
// efeito no jogo; nada aqui é apenas decorativo.
// ---------------------------------------------------------------------------
const SETTINGS_KEY = 'eclipse_zero_settings_v1';
const SETTINGS_DEFAULT = {
  // Jogo
  difficulty: 1, shake: 100, damageNumbers: true, textSpeed: 1,
  // Vídeo
  display: 'window', renderScale: 100, kaelLook: '3d', gfx3d: true, quality: 2, clima: 2, fpsLimit: 0, postfx: 2, brightness: 0,
  render3d: 'realista', realQual: 2,
  // Áudio
  master: 80, music: 60, voice: 100, sfx: 100, ambient: 70, sound: true, synthVoice: false,
  // Controles (gamepad)
  padSens: 100, deadzone: 20, invertY: false, vibration: true,
  // Idioma e legendas
  subtitleSize: 0, gameSubs: true,
};
const DIFFICULTY = [
  { name: 'Narrativa', hp: 0.7, dmg: 0.6 },
  { name: 'Normal', hp: 1, dmg: 1 },
  { name: 'Difícil', hp: 1.3, dmg: 1.35 },
];
const TEXT_SPEED = [0.6, 1, 1.8];
const QUALITY_KEEP = [0.4, 0.7, 1];     // fração das partículas emitidas em cada qualidade

// Abas e opções da tela de configurações
const SETTINGS_TABS = [
  { id: 'jogo', name: 'JOGO', icon: 'gear', opts: [
    { key: 'difficulty', label: 'Dificuldade', type: 'choice', values: [0, 1, 2], names: DIFFICULTY.map((d) => d.name),
      hint: 'Altera a vida e o dano dos inimigos (os que já estão em campo mantêm a vida atual).' },
    { key: 'shake', label: 'Tremor de tela', type: 'range', min: 0, max: 100, step: 10, unit: '%', hint: 'Intensidade do tremor da câmera nos impactos.' },
    { key: 'damageNumbers', label: 'Números de dano', type: 'bool', hint: 'Mostra o dano causado sobre os inimigos.' },
    { key: 'textSpeed', label: 'Velocidade do texto', type: 'choice', values: [0, 1, 2], names: ['Lenta', 'Normal', 'Rápida'], hint: 'Velocidade com que as falas e a história aparecem.' },
  ] },
  { id: 'video', name: 'VÍDEO', icon: 'monitor', opts: [
    { key: 'display', label: 'Modo de exibição', type: 'choice', values: ['window', 'full'], names: ['Janela', 'Tela cheia'] },
    { key: 'renderScale', label: 'Resolução interna', type: 'choice', values: [50, 75, 100, 150], names: ['50%', '75%', '100% (nativa)', '150% (ultra)'], hint: 'Menos deixa o jogo mais leve em aparelhos fracos; 150% desenha acima da resolução da tela (placa de vídeo forte).' },
    { key: 'kaelLook', label: 'Visual do Kael', type: 'choice', values: ['3d', 'art'], names: ['3D com a arte oficial', 'Sprites 2D da arte'], hint: '3D: modelo com a textura das vistas oficiais. Sprites: os quadros da folha de personagem.' },
    { key: 'gfx3d', label: 'Inimigos e NPCs em 3D', type: 'bool', hint: 'Modelos 3D (WebGL) ou desenho 2D. Tecla G alterna durante o jogo.' },
    { key: 'render3d', label: 'Renderizador da 3ª pessoa', type: 'choice', values: ['realista', 'classico'], names: ['Realista (Three.js)', 'Clássico'],
      hint: 'Realista: sol com sombras projetadas, materiais PBR, reflexos, névoa, oclusão ambiente e brilho. Precisa abrir o jogo por http (GitHub Pages ou servidor local); abrindo o arquivo do disco, fica o Clássico.' },
    { key: 'realQual', label: 'Qualidade realista', type: 'choice', values: [0, 1, 2, 3, 4], names: ['Baixo', 'Médio', 'Alto', 'Ultra', 'Cinematográfico'],
      hint: 'Sombras (1024 a 4096), oclusão ambiente, brilho, multiamostragem e resolução (70% no Baixo, 125% no Cinematográfico).' },
    { key: 'quality', label: 'Qualidade dos efeitos', type: 'choice', values: [0, 1, 2], names: ['Baixa', 'Média', 'Alta'], hint: 'Quantidade de partículas, faíscas e fumaça.' },
    { key: 'clima', label: 'Efeitos de clima', type: 'choice', values: [0, 1, 2], names: ['Leves', 'Médios', 'Completos'], hint: 'Poças, pegadas, neve e bancos de neblina desenhados, gotas no chão e o ar tremendo no calor. O efeito no jogo (frio, calor, roupa molhada) é o mesmo em todos.' },
    { key: 'fpsLimit', label: 'Limite de FPS', type: 'choice', values: [0, 60, 30], names: ['Sem limite', '60', '30'] },
    { key: 'postfx', label: 'Pós-processamento', type: 'choice', values: [0, 1, 2], names: ['Desligado', 'Reduzido', 'Completo'], hint: 'Vinheta, clarões e interferência digital na tela.' },
    { key: 'brightness', label: 'Brilho', type: 'range', min: -30, max: 30, step: 5, unit: '' },
  ] },
  { id: 'audio', name: 'ÁUDIO', icon: 'speaker', opts: [
    { key: 'sound', label: 'Som', type: 'bool', hint: 'Também liga e desliga com a tecla M.' },
    { key: 'master', label: 'Volume geral', type: 'range', min: 0, max: 100, step: 10, unit: '%' },
    { key: 'music', label: 'Música', type: 'range', min: 0, max: 100, step: 10, unit: '%', hint: 'Volume da trilha sonora oficial.' },
    { key: 'voice', label: 'Voz / Narração', type: 'range', min: 0, max: 100, step: 10, unit: '%', hint: 'Volume da dublagem e narração da história.' },
    { key: 'synthVoice', label: 'Voz sintetizada nas falas', type: 'bool', hint: 'Lê em voz alta, com a voz do próprio aparelho, as falas e a história que não têm dublagem gravada.' },
    { key: 'sfx', label: 'Efeitos sonoros', type: 'range', min: 0, max: 100, step: 10, unit: '%' },
    { key: 'ambient', label: 'Ambiente', type: 'range', min: 0, max: 100, step: 10, unit: '%' },
  ] },
  { id: 'controles', name: 'CONTROLES', icon: 'pad', opts: [
    { key: 'padSens', label: 'Sensibilidade do analógico', type: 'range', min: 50, max: 150, step: 10, unit: '%' },
    { key: 'deadzone', label: 'Zona morta', type: 'range', min: 5, max: 40, step: 5, unit: '%', hint: 'Aumente se o personagem andar sozinho com o analógico solto.' },
    { key: 'invertY', label: 'Inverter eixo Y (câmera)', type: 'bool', hint: 'Inverte o analógico direito, que move a câmera para olhar ao redor.' },
    { key: 'vibration', label: 'Vibração', type: 'bool', hint: 'Vibra ao receber dano e em impactos fortes (se o controle e o navegador permitirem).' },
  ] },
  { id: 'idioma', name: 'IDIOMA', icon: 'globe', opts: [
    { key: 'lang', label: 'Idioma', type: 'info', text: 'Português (Brasil)' },
    { key: 'subtitleSize', label: 'Tamanho das legendas', type: 'choice', values: [0, 1], names: ['Normal', 'Grande'] },
    { key: 'gameSubs', label: 'Falas durante o jogo', type: 'bool', hint: 'Mostra as falas dos personagens durante a ação.' },
  ] },
];

const Settings = {
  v: Object.assign({}, SETTINGS_DEFAULT),
  load() {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (s) for (const k in SETTINGS_DEFAULT) if (s[k] !== undefined && typeof s[k] === typeof SETTINGS_DEFAULT[k]) this.v[k] = s[k];
      // Preferência antiga da tecla G
      else if (localStorage.getItem('eclipse_zero_3d') === '0') this.v.gfx3d = false;
    } catch (e) { /* armazenamento indisponível */ }
    return this.v;
  },
  save() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.v)); } catch (e) { /* armazenamento indisponível */ } },
  get diff() { return DIFFICULTY[this.v.difficulty] || DIFFICULTY[1]; },
  // Aplica tudo aos sistemas do jogo (ao iniciar e ao confirmar a tela de configurações)
  apply(g, boot = false) {
    const v = this.v;
    if (g.audio) g.audio.setMix(v.sound, v.master / 100, v.sfx / 100, v.ambient / 100, (v.music !== undefined ? v.music : 60) / 100, (v.voice !== undefined ? v.voice : 100) / 100);
    if (R3D.ok) R3D.enabled = v.gfx3d;
    g.particles.quality = QUALITY_KEEP[v.quality] ?? 1;
    g.input.deadzone = v.deadzone / 100; g.input.sensitivity = v.padSens / 100; g.input.vibration = v.vibration; g.input.invertY = v.invertY;
    g.canvas.style.filter = v.brightness ? `brightness(${(1 + v.brightness / 100).toFixed(2)})` : '';
    if (g.renderScale !== v.renderScale / 100) { g.renderScale = v.renderScale / 100; g.resize(); }
    // Ao abrir o jogo a tela cheia espera o primeiro clique ou tecla (exigência dos navegadores)
    if (!boot) this.applyDisplay();
  },
  // Tela cheia exige um gesto recente do jogador (tecla ou clique); o gamepad não conta como gesto
  applyDisplay() {
    const want = this.v.display === 'full', is = !!document.fullscreenElement;
    try {
      if (want && !is && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      else if (!want && is && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) { /* navegador sem suporte */ }
    if (want && !is) {
      setTimeout(() => {
        if (document.fullscreenElement || this.v.display !== 'full') return;
        this.v.display = 'window'; this.save();
        if (game && game.menu) {
          if (game.menu.st.edit) game.menu.st.edit.display = 'window';
          game.menu.notify('O navegador bloqueou a tela cheia: use um clique, Enter ou F11', '255,200,90', 'monitor');
        }
      }, 700);
    }
  },
  // Sincroniza com F11/Esc do navegador
  onFullscreenChange() {
    const full = document.fullscreenElement ? 'full' : 'window';
    if (this.v.display !== full) { this.v.display = full; this.save(); }
    if (game && game.menu && game.menu.st.edit) game.menu.st.edit.display = full;
  },
  textRate() { return TEXT_SPEED[this.v.textSpeed] ?? 1; },
};
Settings.load();
