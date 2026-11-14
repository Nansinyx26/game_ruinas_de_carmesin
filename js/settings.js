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
  display: 'window', renderScale: 100, kaelLook: '3d', gfx3d: true, quality: 2, clima: 2, texHD: 2, vegQ: 2, sombras: 3, diaMin: 10, fpsLimit: 0, postfx: 2, brightness: 0,
  camModo: '', vizinhos: true, visao: 2, perfilGfx: 'auto', medidor: false, cineCor: true, cineVinheta: true, cineGrao: false, cineNitidez: true,
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
    { key: 'camModo', label: 'Câmera', type: 'choice', values: ['iso', 'iso3d', '3p'], names: ['Isométrica clássica', 'Isométrica 3D', 'Terceira pessoa'],
      hint: 'O mesmo mundo, os mesmos heróis e o mesmo combate nas três. Isométrica 3D: o mundo em 3D visto do alto, com rotação (Z/C ou botão direito) e zoom (roda). Terceira pessoa: atrás do herói. V alterna durante o jogo.' },
    { key: 'visao', label: 'Distância de visão', type: 'choice', values: [0, 1, 2, 3], names: ['Curta', 'Média', 'Longa', 'Horizonte'],
      hint: 'Até onde se enxerga nas câmeras 3D: a névoa recua, o chão segue até o horizonte e, no Horizonte, aparecem também as zonas a duas casas de distância (com as estruturas grandes). Horizonte pede placa de vídeo forte.' },
    { key: 'vizinhos', label: 'Território vizinho visível', type: 'bool', hint: 'Nas regiões abertas, o chão, o relevo e a mata das zonas vizinhas aparecem além da borda nas câmeras 3D (o território continua). Desligue em aparelhos fracos.' },
    { key: 'perfilGfx', label: 'Perfil gráfico', type: 'choice', values: ['auto', 'celular', 'web', 'desktop', 'extremo', 'custom'], names: ['Automático (benchmark)', 'Celular', 'Web', 'Desktop', 'Extreme PC', 'Personalizado'],
      hint: 'Escolhe de uma vez todas as opções de vídeo abaixo (cada uma continua ajustável). Automático: mede o aparelho e os quadros por alguns segundos e escolhe sozinho (refaz o benchmark ao confirmar).' },
    { key: 'display', label: 'Modo de exibição', type: 'choice', values: ['window', 'full'], names: ['Janela', 'Tela cheia'] },
    { key: 'renderScale', label: 'Resolução interna', type: 'choice', values: [50, 75, 100, 125, 150, 200], names: ['50%', '75%', '100% (nativa)', '125%', '150% (ultra)', '200% (4K numa tela 1080p)'], hint: 'Menos deixa o jogo mais leve em aparelhos fracos; acima de 100% desenha com mais pixels que a tela e reduz (supersampling: bordas lisas, placa de vídeo forte).' },
    { key: 'kaelLook', label: 'Visual do Kael', type: 'choice', values: ['3d', 'art'], names: ['3D com a arte oficial', 'Sprites 2D da arte'], hint: '3D: modelo com a textura das vistas oficiais. Sprites: os quadros da folha de personagem.' },
    { key: 'gfx3d', label: 'Inimigos e NPCs em 3D', type: 'bool', hint: 'Modelos 3D (WebGL) ou desenho 2D. Tecla G alterna durante o jogo.' },
    { key: 'render3d', label: 'Renderizador da 3ª pessoa', type: 'choice', values: ['realista', 'classico'], names: ['Realista (Three.js)', 'Clássico'],
      hint: 'Realista: sol com sombras projetadas, materiais PBR, reflexos, névoa, oclusão ambiente e brilho. Precisa abrir o jogo por http (GitHub Pages ou servidor local); abrindo o arquivo do disco, fica o Clássico.' },
    { key: 'realQual', label: 'Qualidade realista', type: 'choice', values: [0, 1, 2, 3, 4, 5], names: ['Baixo', 'Médio', 'Alto', 'Ultra', 'Cinematográfico', 'Extreme PC'],
      hint: 'Sombras (1024 a 4096), oclusão ambiente, brilho, multiamostragem e resolução (70% no Baixo, 125% no Cinematográfico, 150% no Extreme PC: para placas de vídeo dedicadas).' },
    { key: 'cineCor', label: 'Gradação de cor (3ª pessoa)', type: 'bool', hint: 'Contraste e saturação de cinema, sombras frias e luzes quentes (no renderizador realista).' },
    { key: 'cineVinheta', label: 'Vinheta (3ª pessoa)', type: 'bool', hint: 'Bordas da imagem um pouco mais escuras.' },
    { key: 'cineGrao', label: 'Granulação de filme (3ª pessoa)', type: 'bool', hint: 'Grão fino de película, opcional.' },
    { key: 'cineNitidez', label: 'Nitidez (3ª pessoa)', type: 'bool', hint: 'Realça os detalhes depois do antisserrilhado.' },
    { key: 'texHD', label: 'Texturas dos modelos', type: 'choice', values: [0, 1, 2], names: ['Padrão (1K)', 'Alta (2K)', 'Máxima (4K)'],
      hint: 'Os prédios e objetos mais perto usam a textura original do GLB (2048 ou 4096 px); os de longe ficam na versão leve. Precisa abrir o jogo por http. Em celular, use Padrão.' },
    { key: 'vegQ', label: 'Vegetação (grama e flores)', type: 'choice', values: [0, 1, 2, 3, 4], names: ['Baixa', 'Média', 'Alta', 'Ultra', 'Cinematográfica'],
      hint: 'Quantidade de lâminas de grama e flores e até onde elas aparecem. A grama dobra com o vento e quando o herói passa.' },
    { key: 'sombras', label: 'Sombras do sol', type: 'choice', values: [0, 1, 2, 3, 4], names: ['Desligadas', 'Baixa', 'Média', 'Alta', 'Ultra'],
      hint: 'Sombras projetadas pelo sol (e pela lua) em tudo: heróis, moradores, inimigos, árvores, prédios, armas e objetos. Média em diante: duas cascatas (perto com mais detalhe); Alta e Ultra: raios de sol no ar. Desligadas: só a sombra de contato sob os pés.' },
    { key: 'diaMin', label: 'Duração do dia', type: 'choice', values: [10, 20, 30, 60], names: ['10 min', '20 min', '30 min', '60 min'],
      hint: 'Quanto tempo real dura um dia inteiro do mundo (amanhecer 6h, pôr do sol 17h30, noite 21h). O sol e as sombras andam com o relógio.' },
    { key: 'quality', label: 'Qualidade dos efeitos', type: 'choice', values: [0, 1, 2], names: ['Baixa', 'Média', 'Alta'], hint: 'Quantidade de partículas, faíscas e fumaça.' },
    { key: 'clima', label: 'Efeitos de clima', type: 'choice', values: [0, 1, 2], names: ['Leves', 'Médios', 'Completos'], hint: 'Poças, pegadas, neve e bancos de neblina desenhados, gotas no chão e o ar tremendo no calor. O efeito no jogo (frio, calor, roupa molhada) é o mesmo em todos.' },
    { key: 'fpsLimit', label: 'Limite de FPS', type: 'choice', values: [0, 60, 30], names: ['Sem limite', '60', '30'] },
    { key: 'postfx', label: 'Pós-processamento', type: 'choice', values: [0, 1, 2], names: ['Desligado', 'Reduzido', 'Completo'], hint: 'Vinheta, clarões e interferência digital na tela.' },
    { key: 'brightness', label: 'Brilho', type: 'range', min: -30, max: 30, step: 5, unit: '' },
    { key: 'medidor', label: 'Medidor de desempenho', type: 'bool', hint: 'FPS, tempo do quadro, CPU, placa de vídeo, memória e triângulos no canto da tela (F4 liga e desliga).' },
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
    // texturas 4K: celulares e aparelhos com pouca memória começam no Padrão (a escolha salva vale sempre)
    try {
      const salvo = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      const fraco = (typeof navigator !== 'undefined' && navigator.deviceMemory && navigator.deviceMemory < 8) || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
      if ((!salvo || salvo.texHD === undefined) && fraco) this.v.texHD = 0;
      if ((!salvo || salvo.vegQ === undefined) && fraco) this.v.vegQ = 1;
      // sombras: celular e pouca memória na Baixa; navegador automatizado (testes) na Média
      if ((!salvo || salvo.vizinhos === undefined) && fraco) this.v.vizinhos = false;
      if ((!salvo || salvo.visao === undefined) && fraco) this.v.visao = 1;   // (o território vizinho: só em aparelhos com folga)
      if ((!salvo || salvo.sombras === undefined) && (fraco || (typeof navigator !== 'undefined' && navigator.webdriver))) this.v.sombras = fraco ? 1 : 2;
    } catch (e) { /* nada */ }
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
    // perfil gráfico (js/graficos.js): escolhido agora, aplica as opções dele; mexeu numa opção do perfil, vira Personalizado
    if (typeof Graficos !== 'undefined' && !boot) {
      const P = GRAFICOS_PERFIS[v.perfilGfx];
      if (v.perfilGfx !== this._perfil && P) { for (const k in P) if (k !== 'nome' && k in v) v[k] = P[k]; this.save(); }
      else if (v.perfilGfx === this._perfil && P && Object.keys(P).some((k) => k !== 'nome' && k in v && v[k] !== P[k])) { v.perfilGfx = 'custom'; this.save(); }
      else if (v.perfilGfx === 'auto' && this._perfil !== 'auto' && !Graficos.bench) Graficos.iniciar();
    }
    this._perfil = v.perfilGfx;
    // câmera (js/terceira.js): a escolha das configurações vale para o jogo
    if (!boot && typeof ThirdView !== 'undefined' && v.camModo && v.camModo !== ThirdView.qual()) ThirdView.setModo(v.camModo, true);
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
