'use strict';
// ECLIPSE ZERO · Funções utilitárias: matemática, projeção isométrica, formas e texto
// ---------------------------------------------------------------------------
// FUNÇÕES UTILITÁRIAS
// ---------------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const chance = (p) => Math.random() < p;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
const rgba = (rgb, a) => `rgba(${rgb},${clamp(a, 0, 1).toFixed(3)})`;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

// Menor diferença angular (de a para b), no intervalo [-PI, PI]
function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
  return d;
}
const angleLerp = (a, b, t) => a + angleDiff(a, b) * t;
function approach(v, target, delta) { return v < target ? Math.min(v + delta, target) : Math.max(v - delta, target); }

// Projeção isométrica 2:1 (coordenadas de mundo → coordenadas de tela)
// (let: a câmera em terceira pessoa troca as duas pela projeção dela ao desenhar os efeitos, js/terceira.js)
let isoX = (x, y) => x - y;
let isoY = (x, y) => (x + y) * 0.5;

// Converte uma direção de TELA (dx, dy) numa direção de MUNDO normalizada
function screenToWorldDir(dx, dy, out) {
  if (typeof ThirdView !== 'undefined' && ThirdView.active()) return ThirdView.inputDir(dx, dy, out);   // relativo à câmera
  const wx = dy + dx * 0.5, wy = dy - dx * 0.5;
  const l = Math.hypot(wx, wy) || 1;
  out.x = wx / l; out.y = wy / l;
  return out;
}
// Vetor de tela correspondente a um ângulo de mundo (sem normalizar)
function worldAngleToScreen(a, out) {
  const c = Math.cos(a), s = Math.sin(a);
  out.x = c - s; out.y = (c + s) * 0.5;
  return out;
}

// Gerador pseudoaleatório com semente (salas reproduzíveis ao redesenhar)
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Distância de um ponto (px, py) ao segmento AB
function pointSegDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 0 ? ((px - ax) * abx + (py - ay) * aby) / len2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

// Caminho de um círculo do mundo projetado (vira elipse na tela)
function isoCirclePath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.ellipse(isoX(x, y), isoY(x, y), Math.max(0.1, r * ISO_RX), Math.max(0.1, r * ISO_RY), 0, 0, TAU);
}

// Retângulo de cantos arredondados
function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Formata segundos como mm:ss
function formatTime(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

