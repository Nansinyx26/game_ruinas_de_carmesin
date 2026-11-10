'use strict';
// ECLIPSE ZERO · Configuração geral: resolução lógica, constantes de física, paleta e fontes
/* ===========================================================================
   ECLIPSE ZERO — RPG de ação isométrico dark futurista em um único arquivo HTML
   Ano 2189. Kael Veyron, a Unidade ZERO, desperta sem memórias com a espada
   Tempestade Nula e precisa atravessar Vesper até o núcleo de NEXUS.
   Canvas 2D puro + Web Audio API. Nenhum asset externo: formas, gradientes,
   partículas, raios e sons são todos gerados por código.
   =========================================================================== */

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO GERAL
// ---------------------------------------------------------------------------
let VIEW_H = 720;                // altura lógica da tela: 720, menos em telas baixas (celular deitado: tudo maior); a largura se adapta
let VIEW_W = 1280;               // largura lógica (recalculada ao redimensionar)
const TILE = 56;                 // tamanho de um tile em unidades de mundo
const GRAVITY = 1700;            // gravidade para corpos lançados ao ar
const TAU = Math.PI * 2;
const ISO_RX = Math.SQRT2;       // fator do raio horizontal de um círculo projetado
const ISO_RY = Math.SQRT2 / 2;   // fator do raio vertical de um círculo projetado
const MAX_DT = 1 / 30;           // passo máximo de simulação (evita "teleportes")

// Paleta dark futurista: preto, cinza-aço e azul elétrico (a energia da Tempestade Nula)
const PAL = {
  bg: '#020409',
  red: '#ff2e55', redHi: '#ff5c7a', redDark: '#5a0a1e',
  accent: '#3d8bff', accentHi: '#a8d8ff', accentDark: '#0c2a66',
  text: '#dfe6f2', textDim: '#9aa6b8', steel: '#9aa3b2', ink: '#05070c',
};
const FONT_TITLE = '"Bahnschrift", "DIN Alternate", "Eurostile", "Segoe UI", "Roboto Condensed", "Arial Narrow", sans-serif';
const FONT_UI = '"Segoe UI", "Roboto", "Helvetica Neue", Tahoma, sans-serif';
const FONT_NUM = '"Bahnschrift", Impact, "Arial Black", "Segoe UI Black", sans-serif';

let game = null; // instância única do jogo (definida na inicialização)

