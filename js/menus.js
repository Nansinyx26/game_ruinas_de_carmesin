'use strict';
// ECLIPSE ZERO · Menus: capa, tela inicial, menu principal, carregar, personagem, configurações, créditos e pausa
// ---------------------------------------------------------------------------
// MENUS: todas as páginas fora da ação (e a pausa), desenhadas no canvas.
// Cada página monta seus botões numa função lay*(): o mesmo retângulo serve
// para desenhar e para o mouse. Teclado, gamepad e mouse navegam igual.
// Fluxo: CAPA → TELA INICIAL → MENU PRINCIPAL → CARREGAR ou SELEÇÃO DE
// PERSONAGEM → história → jogo. CONFIGURAÇÕES e CRÉDITOS saem da tela inicial
// e do menu; a PAUSA também abre as CONFIGURAÇÕES.
// ---------------------------------------------------------------------------
const GAME_VERSION = '1.0.0';

// Créditos (edite aqui)
const CREDITS = [
  ['DESENVOLVEDOR', 'Renan Oliveira'],
  ['ARTE E DESIGN', 'Renan Oliveira'],
  ['PROGRAMAÇÃO', 'Renan Oliveira'],
  ['MÚSICA E SFX', 'Sintetizados por código (Web Audio)'],
  ['AGRADECIMENTOS', 'Você que joga!'],
];
const CREDITS_THANKS = 'OBRIGADO POR FAZER PARTE DESSA JORNADA.';

// Personagens da seleção: a ficha do Kael vem de js/data/characters.js; os outros
// três cartões continuam bloqueados até a tela de elenco completa (próxima fase)
const KAEL_CARD = ((d) => ({
  id: d.id, name: d.name.toUpperCase(), role: d.title.toUpperCase(), desc: d.lore,
  stats: [['VIDA', d.rating.vida], ['ENERGIA', d.rating.energia], ['ATAQUE', d.rating.ataque], ['DEFESA', d.rating.defesa], ['VELOCIDADE', d.rating.velocidade]],
}))(CHARACTERS_BY_ID.kael);
const CHARACTERS = [KAEL_CARD, { id: null }, { id: null }, { id: null }];

// Arte da capa (js/assets/capa.js) e pontos de interesse dela (coordenadas na imagem de 1024×1024)
const CAPA = new Image();
let CAPA_OK = false;
CAPA.onload = () => { CAPA_OK = true; };
if (typeof CAPA_SRC === 'string') CAPA.src = CAPA_SRC;
const CAPA_CROP = {
  rosto: [432, 22, 216, 216],     // retrato de Kael (cartão da seleção)
  eclipse: [690, 4, 196, 196],    // o sol negro (créditos)
  logo: [196, 588, 612, 248],     // logotipo ECLIPSE ZERO (créditos)
};

// Preenche o retângulo com a capa, centrada no ponto (fx, fy) da arte, com zoom
function drawCapa(ctx, x, y, w, h, fx = 512, fy = 512, zoom = 1, alpha = 1) {
  if (!CAPA_OK) return false;
  const k = CAPA.naturalWidth / 1024;
  const s = Math.max(w / 1024, h / 1024) * zoom;
  const cw = w / s, ch = h / s;
  const sx = clamp(fx - cw / 2, 0, 1024 - cw), sy = clamp(fy - ch / 2, 0, 1024 - ch);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(CAPA, sx * k, sy * k, cw * k, ch * k, x, y, w, h);
  ctx.restore();
  return true;
}
// Arte da capa recortada com bordas esfumadas até ficarem transparentes (o fundo aparece
// por trás, sem emendas). Pré-renderizada na resolução real da tela e guardada em cache.
function capaLayer(key, w, h, fx, fy, zoom, fade) {
  if (!CAPA_OK) return null;
  const sc = clamp(game.scale, 0.5, 2), W = Math.round(w * sc), H = Math.round(h * sc);
  return Backdrop.layer('capa-' + key, W, H, (g) => {
    drawCapa(g, 0, 0, W, H, fx, fy, zoom);
    softEdges(g, W, H, fade, sc);
  });
}
// Apaga as bordas de uma camada: { l, r, t, b } em pixels lógicos, ou 'radial' (círculo esfumado)
function softEdges(g, W, H, fade, sc) {
  g.save();
  if (fade === 'radial') {
    g.globalCompositeOperation = 'destination-in';
    g.translate(W / 2, H / 2); g.scale(W / 2, H / 2);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(-1, -1, 2, 2);
    g.restore();
    return;
  }
  g.globalCompositeOperation = 'destination-out';
  const side = (x0, y0, x1, y1, rx, ry, rw, rh) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  };
  if (fade.l) { const d = fade.l * sc; side(0, 0, d, 0, 0, 0, d, H); }
  if (fade.r) { const d = fade.r * sc; side(W, 0, W - d, 0, W - d, 0, d, H); }
  if (fade.t) { const d = fade.t * sc; side(0, 0, 0, d, 0, 0, W, d); }
  if (fade.b) { const d = fade.b * sc; side(0, H, 0, H - d, 0, H - d, W, d); }
  g.restore();
}
// Qualquer imagem ajustada ao retângulo (cobrindo) com bordas esfumadas, em cache
function imageLayer(key, img, w, h, fade) {
  if (!img || !img.complete || !img.naturalWidth) return null;
  const sc = clamp(game.scale, 0.5, 2), W = Math.round(w * sc), H = Math.round(h * sc);
  return Backdrop.layer('img-' + key, W, H, (g) => {
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    g.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
    softEdges(g, W, H, fade, sc);
  });
}
function drawCapaLayer(ctx, key, x, y, w, h, fx, fy, zoom, fade, alpha = 1) {
  const c = capaLayer(key, w, h, fx, fy, zoom, fade);
  if (!c) return false;
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(c, x, y, w, h); ctx.restore();
  return true;
}
// Desenha um recorte nomeado da capa (com 'fade', as bordas se dissolvem no fundo)
function drawCapaCrop(ctx, name, x, y, w, h, alpha = 1, op = 'source-over', fade = null) {
  if (!CAPA_OK) return false;
  const k = CAPA.naturalWidth / 1024, c = CAPA_CROP[name];
  ctx.save();
  ctx.globalAlpha = alpha; ctx.globalCompositeOperation = op;
  if (fade) {
    const sc = clamp(game.scale, 0.5, 2), W = Math.round(w * sc), H = Math.round(h * sc);
    const layer = Backdrop.layer('recorte-' + name, W, H, (g) => {
      g.drawImage(CAPA, c[0] * k, c[1] * k, c[2] * k, c[3] * k, 0, 0, W, H);
      softEdges(g, W, H, fade, sc);
    });
    ctx.drawImage(layer, x, y, w, h);
  } else ctx.drawImage(CAPA, c[0] * k, c[1] * k, c[2] * k, c[3] * k, x, y, w, h);
  ctx.restore();
  return true;
}
// Funde uma borda com o fundo: 'dir' é o lado opaco
function fadeEdge(ctx, x, y, w, h, dir, rgb = '1,3,8', a = 1) {
  const g = dir === 'left' ? ctx.createLinearGradient(x, 0, x + w, 0)
    : dir === 'right' ? ctx.createLinearGradient(x + w, 0, x, 0)
      : dir === 'top' ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(0, y + h, 0, y);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
const inRect = (m, r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
const two = (n) => String(n).padStart(2, '0');
function fmtDate(ms) {
  const d = new Date(ms || 0);
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}  ${two(d.getHours())}:${two(d.getMinutes())}`;
}
function fmtPlay(sec) { sec = Math.max(0, sec | 0); return `${two((sec / 3600) | 0)}:${two(((sec / 60) | 0) % 60)}:${two(sec % 60)}`; }

// Ícones de linha dos menus
function drawMenuIcon(ctx, kind, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s / 24, s / 24);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (kind) {
    case 'play': ctx.moveTo(-6, -9); ctx.lineTo(9, 0); ctx.lineTo(-6, 9); ctx.closePath(); ctx.stroke(); break;
    case 'sword':
      ctx.moveTo(-9, 9); ctx.lineTo(8, -8); ctx.moveTo(-10, 3); ctx.lineTo(-3, 10); ctx.moveTo(8, -8); ctx.lineTo(10, -10); ctx.stroke(); break;
    case 'folder':
      ctx.moveTo(-10, -7); ctx.lineTo(-3, -7); ctx.lineTo(-1, -4); ctx.lineTo(10, -4); ctx.lineTo(10, 8); ctx.lineTo(-10, 8); ctx.closePath(); ctx.stroke(); break;
    case 'gear':
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); ctx.lineTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5); }
      ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.stroke(); break;
    case 'exit':
      ctx.moveTo(2, -9); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.lineTo(2, 9); ctx.moveTo(-2, 0); ctx.lineTo(10, 0);
      ctx.moveTo(6, -4); ctx.lineTo(10, 0); ctx.lineTo(6, 4); ctx.stroke(); break;
    case 'power': ctx.arc(0, 1, 8, -Math.PI * 0.32, Math.PI * 1.32); ctx.moveTo(0, -10); ctx.lineTo(0, -1); ctx.stroke(); break;
    case 'star':
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 4.2 : 10; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.stroke(); break;
    case 'tree':
      ctx.arc(0, -7, 3, 0, TAU); ctx.moveTo(-4, 7); ctx.arc(-7, 7, 3, 0, TAU); ctx.moveTo(10, 7); ctx.arc(7, 7, 3, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 1); ctx.lineTo(-7, 1); ctx.lineTo(-7, 4); ctx.moveTo(0, 1); ctx.lineTo(7, 1); ctx.lineTo(7, 4); ctx.stroke(); break;
    case 'restart':
      ctx.arc(0, 0, 8, -Math.PI * 0.2, Math.PI * 1.45); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(7.6, -4.6); ctx.lineTo(1.8, -3.4); ctx.stroke(); break;
    case 'monitor': ctx.rect(-10, -8, 20, 13); ctx.moveTo(-4, 9); ctx.lineTo(4, 9); ctx.moveTo(0, 5); ctx.lineTo(0, 9); ctx.stroke(); break;
    case 'speaker':
      ctx.moveTo(-9, -3); ctx.lineTo(-5, -3); ctx.lineTo(1, -8); ctx.lineTo(1, 8); ctx.lineTo(-5, 3); ctx.lineTo(-9, 3); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(2, 0, 5, -0.8, 0.8); ctx.moveTo(6.2, -7); ctx.arc(2, 0, 9, -0.8, 0.8); ctx.stroke(); break;
    case 'pad':
      ctx.moveTo(-6, -6); ctx.lineTo(6, -6); ctx.quadraticCurveTo(11, -6, 11, 2); ctx.quadraticCurveTo(11, 8, 7, 8); ctx.lineTo(4, 4); ctx.lineTo(-4, 4);
      ctx.lineTo(-7, 8); ctx.quadraticCurveTo(-11, 8, -11, 2); ctx.quadraticCurveTo(-11, -6, -6, -6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -2.5); ctx.lineTo(-6, 2.5); ctx.moveTo(-8.5, 0); ctx.lineTo(-3.5, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(5.5, -1.2, 1.2, 0, TAU); ctx.arc(7.5, 1.6, 1.2, 0, TAU); ctx.fill(); break;
    case 'globe':
      ctx.arc(0, 0, 9, 0, TAU); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 9, 0, 0, TAU); ctx.stroke(); break;
    case 'trash':
      ctx.moveTo(-8, -6); ctx.lineTo(8, -6); ctx.moveTo(-3, -6); ctx.lineTo(-3, -9); ctx.lineTo(3, -9); ctx.lineTo(3, -6);
      ctx.moveTo(-6, -6); ctx.lineTo(-5, 9); ctx.lineTo(5, 9); ctx.lineTo(6, -6); ctx.stroke(); break;
    case 'check': ctx.moveTo(-8, 0); ctx.lineTo(-2, 6); ctx.lineTo(9, -7); ctx.stroke(); break;
    case 'back': ctx.moveTo(9, 0); ctx.lineTo(-8, 0); ctx.moveTo(-3, -6); ctx.lineTo(-9, 0); ctx.lineTo(-3, 6); ctx.stroke(); break;
    case 'lock':
      ctx.rect(-7, -1, 14, 10); ctx.moveTo(-4, -1); ctx.lineTo(-4, -5); ctx.arc(0, -5, 4, Math.PI, 0); ctx.lineTo(4, -1); ctx.stroke(); break;
  }
  ctx.restore();
}

// Botões do controle: A/B/X/Y com as cores do Xbox ou os símbolos do PlayStation;
// ombros, gatilhos e botões de menu como etiquetas. Devolve a largura desenhada.
const PAD_FACE_RGB = { a: '#5dc21e', b: '#e2252b', x: '#2a7de1', y: '#f5c400' };
const PS_FACE_RGB = { a: '#8fb4ff', b: '#ff6b78', x: '#ff8ad8', y: '#3fe0b5' };
function drawPadButton(ctx, kind, b, x, y, r, lit = false) {
  const L = PAD_LABELS[kind] || PAD_LABELS.xbox;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let w = r * 2;
  if (b === 'a' || b === 'b' || b === 'x' || b === 'y') {
    const col = kind === 'ps' ? PS_FACE_RGB[b] : PAD_FACE_RGB[b];
    ctx.fillStyle = lit ? col : 'rgba(8,12,22,0.95)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.2, r * 0.14); ctx.stroke();
    const fg = lit ? '#0a0e18' : col;
    if (kind === 'ps') {
      const q = r * 0.42;
      ctx.strokeStyle = fg; ctx.lineWidth = Math.max(1.3, r * 0.17);
      ctx.beginPath();
      if (b === 'a') { ctx.moveTo(x - q, y - q); ctx.lineTo(x + q, y + q); ctx.moveTo(x + q, y - q); ctx.lineTo(x - q, y + q); }
      else if (b === 'b') ctx.arc(x, y, q, 0, TAU);
      else if (b === 'x') ctx.rect(x - q * 0.85, y - q * 0.85, q * 1.7, q * 1.7);
      else { ctx.moveTo(x, y - q); ctx.lineTo(x + q, y + q * 0.7); ctx.lineTo(x - q, y + q * 0.7); ctx.closePath(); }
      ctx.stroke();
    } else {
      ctx.fillStyle = fg; ctx.font = `bold ${Math.round(r * 1.15)}px ${FONT_UI}`;
      ctx.fillText(L[b], x, y + r * 0.08);
    }
  } else if (b === 'dpad') {
    const q = r * 0.36;
    ctx.fillStyle = lit ? '#cfe3ff' : 'rgba(170,190,220,0.9)';
    ctx.fillRect(x - q, y - r, q * 2, r * 2); ctx.fillRect(x - r, y - q, r * 2, q * 2);
  } else if (b === 'ls' || b === 'rs') {
    ctx.fillStyle = lit ? 'rgba(90,160,255,0.9)' : 'rgba(8,12,22,0.95)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(170,190,220,0.9)'; ctx.lineWidth = Math.max(1.2, r * 0.12); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#dfe9f7'; ctx.font = `bold ${Math.round(r * 0.8)}px ${FONT_UI}`;
    ctx.fillText(b === 'ls' ? 'L' : 'R', x, y + r * 0.05);
  } else {
    const txt = L[b] || b.toUpperCase();
    ctx.font = `bold ${Math.round(r * 0.82)}px ${FONT_TITLE}`;
    w = Math.max(r * 2.2, ctx.measureText(txt).width + r * 1.1);
    const h = r * 1.6, x0 = x - w / 2, y0 = y - h / 2, trig = b === 'lt' || b === 'rt';
    ctx.fillStyle = lit ? 'rgba(90,160,255,0.95)' : 'rgba(8,12,22,0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0, y0, w, h, trig ? [h * 0.55, h * 0.55, 3, 3] : h / 2); else ctx.rect(x0, y0, w, h);
    ctx.fill();
    ctx.strokeStyle = 'rgba(170,190,220,0.9)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = lit ? '#08101e' : '#e6eefa'; ctx.fillText(txt, x, y + r * 0.06);
  }
  ctx.restore();
  return w;
}
// Tecla do teclado (x é a borda esquerda). Devolve a largura
function drawKeyCap(ctx, label, x, y, h) {
  ctx.save();
  ctx.font = `bold ${Math.round(h * 0.5)}px ${FONT_UI}`;
  const w = Math.max(h, ctx.measureText(label).width + h * 0.6);
  ctx.fillStyle = 'rgba(16,24,40,0.95)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y - h / 2, w, h, 4); else ctx.rect(x, y - h / 2, w, h);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,190,230,0.6)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#e6eefa'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + 1);
  ctx.restore();
  return w;
}
// Sequência de tokens: '@x' = botão do controle, '#Enter' = tecla, resto = texto. Devolve a largura
function drawTokens(ctx, tokens, x, y, h, kind, color = '#c9d6ea', measureOnly = false) {
  let cx = x;
  ctx.save();
  ctx.font = `${Math.round(h * 0.62)}px ${FONT_UI}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for (const tk of tokens) {
    if (tk[0] === '@') {
      const b = tk.slice(1), r = h / 2;
      if (measureOnly) {
        if ('abxy'.includes(b) && b.length === 1) cx += r * 2;
        else if (b === 'dpad' || b === 'ls' || b === 'rs') cx += r * 2;
        else { ctx.save(); ctx.font = `bold ${Math.round(r * 0.82)}px ${FONT_TITLE}`; cx += Math.max(r * 2.2, ctx.measureText((PAD_LABELS[kind] || PAD_LABELS.xbox)[b] || b).width + r * 1.1); ctx.restore(); }
      } else {
        let w = r * 2;
        if (!('abxy'.includes(b) && b.length === 1) && b !== 'dpad' && b !== 'ls' && b !== 'rs') {
          ctx.save(); ctx.font = `bold ${Math.round(r * 0.82)}px ${FONT_TITLE}`;
          w = Math.max(r * 2.2, ctx.measureText((PAD_LABELS[kind] || PAD_LABELS.xbox)[b] || b).width + r * 1.1); ctx.restore();
        }
        drawPadButton(ctx, kind, b, cx + w / 2, y, r);
        cx += w;
      }
      cx += 3;
    } else if (tk[0] === '#') {
      if (measureOnly) { ctx.save(); ctx.font = `bold ${Math.round(h * 0.5)}px ${FONT_UI}`; cx += Math.max(h, ctx.measureText(tk.slice(1)).width + h * 0.6) + 3; ctx.restore(); }
      else cx += drawKeyCap(ctx, tk.slice(1), cx, y, h) + 3;
    } else {
      if (!measureOnly) { ctx.fillStyle = color; ctx.fillText(tk, cx, y + 1); }
      cx += ctx.measureText(tk).width + 3;
    }
  }
  ctx.restore();
  return cx - x;
}

// Comandos (aba CONTROLES): ação · teclado · controle
const COMMANDS = [
  ['Mover', 'WASD · Setas', ['@ls', '·', '@dpad']],
  ['Ataque leve', 'J', ['@rt', '·', '@x']],
  ['Ataque pesado / Impacto', 'K (segure)', ['@rb', '·', '@y']],
  ['Esquiva', 'L · Espaço', ['@b', '·', '@a']],
  ['Eclipse Absoluto', 'I', ['@lt']],
  ['Habilidades 1–4', '1 2 3 4', ['@lb', '+', '@x', '@y', '@b', '@a']],
  ['Conversar (perto de NPC)', 'E · F', ['@x']],
  ['Olhar ao redor', '—', ['@rs']],
  ['Árvore de habilidades', 'Tab · H', ['@back']],
  ['Pausa', 'Esc', ['@start']],
  ['Menus: confirmar · voltar', 'Enter · Esc', ['@a', '·', '@b']],
  ['Menus: trocar aba', 'Q · E', ['@lb', '·', '@rb']],
];
// Nomes curtos dos botões no diagnóstico (índices do mapeamento "standard")
const PAD_DIAG = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'back', 'start', 'ls', 'rs', '↑', '↓', '←', '→', '⌂'];

class Menus {
  constructor() {
    this.page = 'cover'; this.stack = []; this.sel = 0;
    this.t = 0; this.pageT = 0;
    this.dialog = null;
    this.slotMode = 'load';      // 'load' = carregar · 'new' = escolher espaço para o novo jogo
    this.newSlot = 0;            // espaço do novo jogo
    this.charSel = 0; this.charBtn = 0; this.charMsg = 0;
    this.st = { tab: 0, row: 0, area: 'opts', btn: 0, edit: null };
    this.slots = []; this.thumbs = {};
    this.notice = null;
    this.kael = null;
  }

  // ------------------------------------------------------------ navegação
  go(page, sel = 0) {
    this.page = page; this.sel = sel; this.pageT = 0; this.dialog = null;
    if (page === 'load' || page === 'main') this.refreshSlots();
    if (page === 'char') { this.charSel = 0; this.charBtn = 0; this.charMsg = 0; }
    if (page === 'settings') { const s = this.st; s.edit = Object.assign({}, Settings.v); s.row = 0; s.area = 'opts'; s.btn = 0; }
  }
  open(page, sel = 0) { this.stack.push({ page: this.page, sel: this.sel }); this.go(page, sel); }
  back() {
    const prev = this.stack.pop();
    game.audio.play('uiMove');
    if (prev) this.go(prev.page, prev.sel);
  }
  reset(page, sel = 0) { this.stack.length = 0; this.go(page, sel); }
  // Volta do jogo para o menu principal (com a tela inicial por baixo)
  toMain() { this.stack = [{ page: 'start', sel: 0 }]; this.go('main', SaveSys.exists() ? 0 : 1); }
  openPause() { this.reset('pause'); }

  ask(title, text, buttons, rgb = '255,92,122') { this.dialog = { title, text, buttons, sel: 0, rgb }; game.audio.play('uiMove'); }
  notify(text, rgb = '110,190,255', icon = 'pad') { this.notice = { text, rgb, icon, t: 0, max: 3.4 }; }

  refreshSlots() {
    this.slots = SaveSys.list();
    this.slots.forEach((s, i) => {
      if (!s || !s.thumb) { delete this.thumbs[i]; return; }
      if (this.thumbs[i] && this.thumbs[i].src === s.thumb) return;
      const im = new Image(); im.src = s.thumb; this.thumbs[i] = im;
    });
  }

  askQuit() {
    const playing = game.state === 'paused';
    this.ask('SAIR DO JOGO', playing ? 'Seu progresso é salvo automaticamente. Deseja sair do jogo?' : 'Deseja fechar o ECLIPSE ZERO?',
      [['SAIR', () => this.quit()], ['CANCELAR', null]]);
  }
  quit() {
    if (game.state === 'paused') game.toMenu();
    // Navegadores só fecham janelas abertas por script; na versão instalada a janela fecha
    try { window.close(); } catch (e) { /* sem permissão */ }
    this.reset('bye');
  }
  // NOVO JOGO: usa o primeiro espaço livre; com todos ocupados, pede um para substituir
  startNew() {
    const free = SaveSys.firstEmpty();
    if (free) { this.newSlot = free; this.open('char'); }
    else { this.slotMode = 'new'; this.open('load', Math.max(0, SaveSys.last() - 1)); }
  }

  // Notificações e animações que correm em qualquer estado do jogo
  tick(dt) {
    this.t += dt; this.pageT += dt;
    if (this.charMsg > 0) this.charMsg -= dt;
    if (this.notice) { this.notice.t += dt; if (this.notice.t > this.notice.max) this.notice = null; }
  }

  update(dt, inp) {
    if (game.fadeCb) return;
    if (this.dialog) { this.updateDialog(inp); return; }
    switch (this.page) {
      case 'cover': this.updCover(inp); break;
      case 'start': this.updStart(inp); break;
      case 'main': this.updMain(inp); break;
      case 'load': this.updLoad(inp); break;
      case 'char': this.updChar(inp); break;
      case 'settings': this.updSettings(inp); break;
      case 'credits': if (this.pageT > 0.3 && (inp.pressed.back || inp.pressed.confirm || inp.mouse.clicked)) this.back(); break;
      case 'bye': this.updBye(inp); break;
      case 'pause': this.updPause(inp); break;
    }
  }

  // Lista vertical: setas/analógico/D-pad, mouse e confirmação
  navList(inp, rects, onPick) {
    const n = rects.length;
    if (!n) return;
    let s = clamp(this.sel, 0, n - 1);
    const step = (d) => { for (let k = 0; k < n; k++) { s = (s + d + n) % n; if (!rects[s].disabled) break; } };
    if (rects[s].disabled) step(1);
    if (inp.pressed.up) step(-1);
    if (inp.pressed.down) step(1);
    const m = inp.mouse;
    let clickHit = false;
    if (m.moved || m.clicked) rects.forEach((r, i) => { if (inRect(m, r)) { if (!r.disabled) s = i; if (m.clicked) clickHit = true; } });
    if (s !== this.sel) { this.sel = s; game.audio.play('uiMove'); }
    if (inp.pressed.confirm || clickHit) {
      const r = rects[this.sel];
      if (clickHit && !inRect(m, r)) return;
      if (r.disabled) { game.audio.play('uiDeny'); return; }
      game.audio.play('uiSelect');
      onPick(r.id, this.sel);
    }
  }

  // ---------------------------------------------------------------- capa
  updCover(inp) {
    if (this.pageT > 0.5 && inp.anyPressed) { game.audio.unlock(); game.audio.play('uiSelect'); this.go('start'); }
  }
  drawCover(ctx, t) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const S = VIEW_H, x = (VIEW_W - S) / 2;
    if (drawCapa(ctx, 0, 0, VIEW_W, VIEW_H, 512, 420, 1, 0.35)) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawCapa(ctx, x, 0, S, S);
      fadeEdge(ctx, x - 1, 0, 90, VIEW_H, 'left', '0,0,0', 0.9);
      fadeEdge(ctx, x + S - 89, 0, 90, VIEW_H, 'right', '0,0,0', 0.9);
    } else this.drawLogoText(ctx, VIEW_W / 2, VIEW_H * 0.42, 1);
    Backdrop.drawRain(ctx, t, 0.35);
    Backdrop.drawMotes(ctx, t);
    // Convite piscando
    const a = this.pageT < 0.8 ? 0 : 0.55 + 0.45 * Math.sin(t * 3.2);
    ctx.save();
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(VIEW_W / 2 - 220, VIEW_H - 64, 440, 34);
    ctx.font = `bold 15px ${FONT_TITLE}`; ctx.letterSpacing = '5px';
    glowText(ctx, game.input.lastDevice === 'pad' ? 'PRESSIONE QUALQUER BOTÃO' : 'PRESSIONE QUALQUER TECLA', VIEW_W / 2 + 2, VIEW_H - 47, '#e6f1ff', 'rgba(60,140,255,0.9)', 14);
    ctx.letterSpacing = '0px';
    ctx.restore();
    // Abertura com fade do preto
    if (this.pageT < 1.2) { ctx.fillStyle = `rgba(0,0,0,${(1 - this.pageT / 1.2).toFixed(3)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  }

  // Logotipo desenhado (usado se a arte da capa não carregar)
  drawLogoText(ctx, x, y, s) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(92 * s)}px ${FONT_TITLE}`; ctx.letterSpacing = `${Math.round(18 * s)}px`;
    glowText(ctx, 'ECLIPSE', x + 9 * s, y, '#eef5ff', 'rgba(60,140,255,0.85)', 30);
    ctx.font = `bold ${Math.round(42 * s)}px ${FONT_TITLE}`; ctx.letterSpacing = `${Math.round(34 * s)}px`;
    glowText(ctx, 'ZERO', x + 17 * s, y + 78 * s, PAL.accent, 'rgba(40,120,255,1)', 28);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // Fundo procedural: céu artificial de Vesper com chuva
  drawSkyBg(ctx, t) {
    const sky = Backdrop.layer('title-sky', VIEW_W, VIEW_H, (g, w, h) => Backdrop.paintSky(g, w, h, 'city'));
    ctx.drawImage(sky, 0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(1,3,8,0.45)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // Botão de menu no estilo da arte (selecionado: faixa azul com brilho e seta)
  drawButton(ctx, r, label, icon, sel, o = {}) {
    const { x, y, w, h } = r;
    ctx.save();
    if (sel) {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, 'rgba(40,110,255,0.8)'); g.addColorStop(1, 'rgba(20,60,170,0.35)');
      ctx.fillStyle = g;
      techPanelPath(ctx, x, y, w, h, 8); ctx.fill();
      ctx.shadowColor = 'rgba(70,150,255,0.9)'; ctx.shadowBlur = 12 + 4 * Math.sin(this.t * 4);
      ctx.strokeStyle = 'rgba(160,210,255,0.95)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.shadowBlur = 0;
      if (!o.center) {
        ctx.strokeStyle = '#d8ecff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + w - 22, y + h / 2 - 6); ctx.lineTo(x + w - 16, y + h / 2); ctx.lineTo(x + w - 22, y + h / 2 + 6); ctx.stroke();
      }
    } else if (!o.flat) {
      ctx.fillStyle = 'rgba(4,9,20,0.62)';
      techPanelPath(ctx, x, y, w, h, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(61,139,255,0.28)'; ctx.lineWidth = 1; ctx.stroke();
    }
    const col = o.disabled ? 'rgba(150,160,180,0.38)' : sel ? '#ffffff' : '#c9d6ea';
    let tx = x + 18;
    if (icon) { drawMenuIcon(ctx, icon, x + 26, y + h / 2, 19, o.disabled ? col : sel ? '#ffffff' : '#7fb4ff'); tx = x + 50; }
    ctx.font = `${sel ? 'bold ' : ''}${o.size || 15}px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
    ctx.textAlign = o.center ? 'center' : 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col;
    ctx.fillText(label, o.center ? x + w / 2 + 1 : tx, y + h / 2 + 1);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }
  drawPanel(ctx, x, y, w, h, a = 0.8, c = 14) {
    ctx.save();
    ctx.fillStyle = `rgba(3,8,18,${a})`;
    techPanelPath(ctx, x, y, w, h, c); ctx.fill();
    ctx.strokeStyle = 'rgba(61,139,255,0.42)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  drawHeader(ctx, text, x = 40, y = 46) {
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 20px ${FONT_TITLE}`; ctx.letterSpacing = '4px';
    glowText(ctx, text, x, y, '#e6f1ff', 'rgba(60,140,255,0.7)', 10);
    ctx.letterSpacing = '0px';
    ctx.strokeStyle = 'rgba(61,139,255,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.lineTo(x + 160, y + 18); ctx.stroke();
    ctx.restore();
  }
  // Dicas do rodapé, alinhadas à direita: [[tokensTeclado, tokensControle, texto], ...]
  drawHints(ctx, list, xr = VIEW_W - 34, y = VIEW_H - 26) {
    const pad = game.input.lastDevice === 'pad', kind = game.input.pad ? game.input.pad.kind : 'xbox';
    ctx.save();
    ctx.font = `13px ${FONT_TITLE}`;
    const items = list.map(([kb, pd, txt]) => {
      const tk = pad ? pd : kb;
      const w = drawTokens(ctx, tk, 0, 0, 20, kind, '', true) + 6 + ctx.measureText(txt).width;
      return { tk, txt, w };
    });
    let x = xr - items.reduce((s, it) => s + it.w + 24, -24);
    for (const it of items) {
      const tw = drawTokens(ctx, it.tk, x, y, 20, kind);
      ctx.font = `13px ${FONT_TITLE}`; ctx.letterSpacing = '1px';
      ctx.fillStyle = 'rgba(214,226,242,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(it.txt, x + tw + 6, y + 1);
      ctx.letterSpacing = '0px';
      x += it.w + 24;
    }
    ctx.restore();
  }

  // -------------------------------------------------------- tela inicial
  layStart() {
    const artW = Math.min(VIEW_W - 340, 780);
    const w = 300, h = 44, gap = 12, cx = (artW - 80 + VIEW_W) / 2;
    const x = Math.min(VIEW_W - w - 40, cx - w / 2), y0 = VIEW_H * 0.44;
    const items = [['play', 'JOGAR', 'play'], ['settings', 'CONFIGURAÇÕES', 'gear'], ['credits', 'CRÉDITOS', 'star'], ['quit', 'SAIR', 'power']];
    return { artW, rects: items.map(([id, label, icon], i) => ({ id, label, icon, x, y: y0 + i * (h + gap), w, h })) };
  }
  updStart(inp) {
    const L = this.layStart();
    if (inp.pressed.back) { this.reset('cover'); game.audio.play('uiMove'); return; }
    this.navList(inp, L.rects, (id) => {
      if (id === 'play') this.open('main', SaveSys.exists() ? 0 : 1);
      else if (id === 'settings') this.open('settings');
      else if (id === 'credits') this.open('credits');
      else this.askQuit();
    });
  }
  drawStart(ctx, t) {
    const L = this.layStart();
    this.drawSkyBg(ctx, t);
    Backdrop.drawRain(ctx, t, 0.6);
    if (!drawCapaLayer(ctx, 'inicio', 0, 0, L.artW, VIEW_H, 512, 400, 1, { r: 280, b: 60 })) this.drawLogoText(ctx, L.artW / 2, VIEW_H * 0.4, 0.9);
    Backdrop.drawMotes(ctx, t);
    L.rects.forEach((r, i) => this.drawButton(ctx, r, r.label, r.icon, i === this.sel));
    ctx.save();
    ctx.font = `12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(200,214,235,0.7)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`VER. ${GAME_VERSION}`, 24, VIEW_H - 24);
    ctx.letterSpacing = '0px';
    if (game.best > 0) { ctx.textAlign = 'center'; ctx.fillText(`Recorde: ${game.best.toLocaleString('pt-BR')} pontos`, L.rects[0].x + L.rects[0].w / 2, L.rects[3].y + 80); }
    ctx.restore();
    this.drawHints(ctx, [[['#Enter'], ['@a'], 'SELECIONAR'], [['#Esc'], ['@b'], 'VOLTAR']]);
  }

  // ------------------------------------------------------- menu principal
  layMain() {
    const x = Math.max(32, Math.min(80, VIEW_W * 0.05)), y0 = 150, w = 330, h = 48, gap = 10;
    const has = SaveSys.exists();
    const items = [['continue', 'CONTINUAR', 'play', !has], ['new', 'NOVO JOGO', 'sword'], ['load', 'CARREGAR', 'folder'], ['settings', 'CONFIGURAÇÕES', 'gear'], ['quit', 'SAIR', 'exit']];
    const rects = items.map(([id, label, icon, disabled], i) => ({ id, label, icon, disabled: !!disabled, x: x + 20, y: y0 + 22 + i * (h + gap), w, h }));
    return { panel: { x, y: y0, w: w + 40, h: items.length * (h + gap) + 34 }, rects };
  }
  updMain(inp) {
    const L = this.layMain();
    if (inp.pressed.back) { this.back(); return; }
    this.navList(inp, L.rects, (id) => {
      if (id === 'continue') { const n = SaveSys.last(); game.fadeTo(() => game.continueGame(n)); }
      else if (id === 'new') this.startNew();
      else if (id === 'load') { this.slotMode = 'load'; this.open('load', Math.max(0, SaveSys.last() - 1)); }
      else if (id === 'settings') this.open('settings');
      else this.askQuit();
    });
  }
  drawMain(ctx, t) {
    const L = this.layMain();
    this.drawSkyBg(ctx, t);
    const ax = VIEW_W * 0.3, aw = VIEW_W - ax - 110;
    drawCapaLayer(ctx, 'menu', ax, 0, aw, VIEW_H, 560, 300, 1.5, { l: 300, r: 180, b: 240 });
    Backdrop.drawRain(ctx, t, 0.6);
    Backdrop.drawMotes(ctx, t);
    this.drawHeader(ctx, 'MENU PRINCIPAL');
    const P = L.panel;
    this.drawPanel(ctx, P.x, P.y, P.w, P.h, 0.72);
    L.rects.forEach((r, i) => this.drawButton(ctx, r, r.label, r.icon, i === this.sel, { flat: true, disabled: r.disabled, size: 16 }));
    // Última missão (salvamento mais recente)
    const n = SaveSys.last(), s = n ? this.slots[n - 1] : null;
    const pw = 330, px = VIEW_W - pw - 30, py = 40;
    this.drawPanel(ctx, px, py, pw, 104, 0.82, 10);
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    drawMenuIcon(ctx, 'star', px + 22, py + 22, 14, PAL.accent);
    ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = PAL.accentHi;
    ctx.fillText('ÚLTIMA MISSÃO', px + 38, py + 23);
    ctx.letterSpacing = '0px';
    if (s) {
      const room = ROOM_DEFS[clamp(s.room | 0, 0, ROOM_DEFS.length - 1)];
      ctx.font = `bold 15px ${FONT_UI}`; ctx.fillStyle = '#eef3fa';
      ctx.fillText(room.name, px + 22, py + 50);
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.75)';
      ctx.fillText(room.sub, px + 22, py + 70);
      const lv = (s.progress && s.progress.level) | 0, mem = (s.stats && s.stats.memories) | 0;
      ctx.fillText(`Espaço ${n} · Nv. ${lv || 1} · Memórias ${mem}/${MEMORIES.length} · ${fmtPlay(s.stats && s.stats.time)}`, px + 22, py + 88);
    } else {
      ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.8)';
      ctx.fillText('Nenhuma missão salva ainda.', px + 22, py + 52);
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.6)';
      ctx.fillText('Comece um NOVO JOGO para despertar Kael.', px + 22, py + 74);
    }
    // Citação
    ctx.textAlign = 'right'; ctx.font = `italic 17px ${FONT_UI}`;
    glowText(ctx, '“O fim não é o final…', VIEW_W - 40, VIEW_H - 92, 'rgba(225,235,250,0.92)', 'rgba(60,140,255,0.6)', 8);
    glowText(ctx, 'É apenas o começo.”', VIEW_W - 40, VIEW_H - 68, 'rgba(225,235,250,0.92)', 'rgba(60,140,255,0.6)', 8);
    ctx.restore();
    this.drawHints(ctx, [[['#Enter'], ['@a'], 'SELECIONAR'], [['#Esc'], ['@b'], 'VOLTAR']], VIEW_W - 34, VIEW_H - 26);
  }

  // -------------------------------------------------------- carregar jogo
  layLoad() {
    const x = Math.max(28, Math.min(60, VIEW_W * 0.04)), w = Math.min(600, VIEW_W * 0.5), h = 92, gap = 10, y0 = 104;
    const rects = [];
    for (let i = 0; i < SAVE_SLOTS; i++) rects.push({ id: i + 1, x, y: y0 + i * (h + gap), w, h });
    return { rects, artX: x + w + 30 };
  }
  pickSlot(n) {
    const s = this.slots[n - 1];
    if (this.slotMode === 'load' && s) { game.fadeTo(() => game.continueGame(n)); return; }
    if (s) {
      this.ask('SUBSTITUIR ESPAÇO', `Começar um novo jogo no espaço ${n} apagará o progresso salvo nele.`,
        [['SUBSTITUIR', () => { this.newSlot = n; this.open('char'); }], ['CANCELAR', null]]);
      return;
    }
    this.newSlot = n; this.open('char');
  }
  updLoad(inp) {
    const L = this.layLoad();
    if (inp.pressed.back) { this.back(); return; }
    this.navList(inp, L.rects, (id) => this.pickSlot(id));
    if (inp.pressed.erase && this.slots[this.sel]) {
      const n = this.sel + 1;
      this.ask('APAGAR ESPAÇO', `Apagar para sempre o progresso salvo no espaço ${n}?`,
        [['APAGAR', () => { SaveSys.clear(n); this.refreshSlots(); game.audio.play('uiSelect'); }], ['CANCELAR', null]]);
    }
  }
  drawLoad(ctx, t) {
    const L = this.layLoad();
    ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (!drawCapaLayer(ctx, 'carregar', L.artX - 120, 0, VIEW_W - L.artX + 120, VIEW_H, 860, 480, 1.05, { l: 320, b: 140 })) this.drawSkyBg(ctx, t);
    Backdrop.drawRain(ctx, t, 0.5);
    this.drawHeader(ctx, this.slotMode === 'new' ? 'NOVO JOGO · ESCOLHA UM ESPAÇO' : 'CARREGAR JOGO');
    L.rects.forEach((r, i) => this.drawSlot(ctx, r, i, this.slots[i], i === this.sel));
    const hints = [[['#Enter'], ['@a'], 'SELECIONAR']];
    if (this.slots[this.sel]) hints.push([['#Del'], ['@x'], 'APAGAR']);
    hints.push([['#Esc'], ['@b'], 'VOLTAR']);
    this.drawHints(ctx, hints);
  }
  drawSlot(ctx, r, i, s, sel) {
    const { x, y, w, h } = r;
    ctx.save();
    ctx.fillStyle = sel ? 'rgba(14,34,80,0.88)' : 'rgba(4,9,20,0.8)';
    techPanelPath(ctx, x, y, w, h, 10); ctx.fill();
    if (sel) { ctx.shadowColor = 'rgba(70,150,255,0.9)'; ctx.shadowBlur = 12; }
    ctx.strokeStyle = sel ? 'rgba(130,190,255,0.95)' : 'rgba(61,139,255,0.3)'; ctx.lineWidth = sel ? 1.5 : 1; ctx.stroke();
    ctx.shadowBlur = 0;
    // Miniatura
    const tw = Math.round((h - 18) * 16 / 9), th = h - 18, tx = x + 10, ty = y + 9;
    const im = this.thumbs[i];
    ctx.fillStyle = 'rgba(10,18,34,0.95)'; ctx.fillRect(tx, ty, tw, th);
    if (s && im && im.complete && im.naturalWidth) ctx.drawImage(im, tx, ty, tw, th);
    else if (s) {
      const g = ctx.createLinearGradient(tx, ty, tx, ty + th);
      g.addColorStop(0, 'rgba(30,60,120,0.9)'); g.addColorStop(1, 'rgba(5,10,22,0.9)');
      ctx.fillStyle = g; ctx.fillRect(tx, ty, tw, th);
      drawMenuIcon(ctx, 'sword', tx + tw / 2, ty + th / 2, 26, 'rgba(160,200,255,0.8)');
    } else {
      ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,175,200,0.55)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Vazio', tx + tw / 2, ty + th / 2);
    }
    ctx.strokeStyle = 'rgba(61,139,255,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
    // Texto
    const lx = tx + tw + 18;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 15px ${FONT_TITLE}`; ctx.fillStyle = sel ? PAL.accentHi : PAL.accent;
    ctx.fillText(two(i + 1), lx, y + 24);
    if (s) {
      const room = ROOM_DEFS[clamp(s.room | 0, 0, ROOM_DEFS.length - 1)];
      ctx.font = `bold 15px ${FONT_UI}`; ctx.fillStyle = '#eef3fa';
      ctx.fillText(room.name, lx + 34, y + 24);
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(190,205,228,0.8)';
      ctx.fillText(fmtDate(s.time), lx + 34, y + 46);
      const lv = (s.progress && s.progress.level) | 0, cyc = (s.flags && s.flags.cycle) | 0;
      ctx.fillText(`Nv. ${lv || 1}   |   ${fmtPlay(s.stats && s.stats.time)}${cyc ? `   |   Ciclo ${cyc + 1}` : ''}`, lx + 34, y + 66);
    } else {
      ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = 'rgba(170,185,210,0.6)';
      ctx.fillText('Vazio', lx + 34, y + 24);
      ctx.font = `12px ${FONT_UI}`;
      ctx.fillText('--/--/----  --:--', lx + 34, y + 46);
    }
    ctx.restore();
  }

  // ------------------------------------------------ seleção de personagem
  layChar() {
    const x0 = Math.max(VIEW_W * 0.42, 400), cw = 118, ch = 148, gap = 12, y0 = 112;
    const cards = CHARACTERS.map((c, i) => ({ id: i, x: x0 + i * (cw + gap), y: y0, w: cw, h: ch }));
    const pw = Math.min(680, VIEW_W - x0 - 40);
    const info = { x: x0, y: y0 + ch + 26, w: pw, h: 210 };
    const by = info.y + info.h + 22;
    const btns = [{ id: 'ok', label: 'CONFIRMAR', icon: 'check', x: x0 + pw - 340, y: by, w: 170, h: 44 }, { id: 'back', label: 'VOLTAR', icon: 'back', x: x0 + pw - 160, y: by, w: 160, h: 44 }];
    return { cards, info, btns };
  }
  confirmChar() {
    if (!CHARACTERS[this.charSel].id) { game.audio.play('uiDeny'); this.charMsg = 2; return; }
    game.audio.play('uiSelect');
    game.newGame(this.newSlot);
  }
  updChar(inp) {
    const L = this.layChar(), n = CHARACTERS.length, m = inp.mouse;
    if (inp.pressed.back) { this.back(); return; }
    let s = this.charSel;
    if (inp.pressed.left) s = (s + n - 1) % n;
    if (inp.pressed.right) s = (s + 1) % n;
    if (m.moved || m.clicked) {
      L.cards.forEach((r, i) => { if (inRect(m, r)) s = i; });
      L.btns.forEach((r, i) => { if (inRect(m, r)) this.charBtn = i + 1; });
    }
    if (s !== this.charSel) { this.charSel = s; game.audio.play('uiMove'); }
    if (m.clicked) {
      if (inRect(m, L.btns[0])) { this.confirmChar(); return; }
      if (inRect(m, L.btns[1])) { this.back(); return; }
    }
    if (inp.pressed.confirm) this.confirmChar();
  }
  drawChar(ctx, t) {
    const L = this.layChar(), c = CHARACTERS[this.charSel];
    this.drawSkyBg(ctx, t);
    Backdrop.drawRain(ctx, t, 0.5);
    ctx.fillStyle = 'rgba(1,3,8,0.4)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Kael da ficha oficial (sem ela: o modelo 3D ou a arte da capa)
    const hx = (L.cards[0].x - 30) / 2 + 30;
    const bh = VIEW_H * 0.86, bw = bh * 310 / 584;
    const body = imageLayer('kael-corpo', KAEL_PORTRAIT.body, bw, bh, { l: 80, r: 80, t: 90, b: 80 });
    if (body) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      GlowCache.drawFlat(ctx, '60,130,255', hx, VIEW_H * 0.92, 200, 0.35);
      ctx.restore();
      ctx.drawImage(body, hx - bw / 2, VIEW_H * 0.1, bw, bh);
    } else if (!this.drawKael3D(ctx, t, hx, VIEW_H * 0.9, 6)) {
      drawCapaLayer(ctx, 'personagem', 0, 0, L.cards[0].x - 30, VIEW_H, 580, 330, 1.6, { r: 220, b: 220 });
    }
    Backdrop.drawMotes(ctx, t);
    this.drawHeader(ctx, 'SELEÇÃO DE PERSONAGEM');
    // Cartões
    L.cards.forEach((r, i) => {
      const ch = CHARACTERS[i], sel = i === this.charSel;
      ctx.save();
      ctx.fillStyle = 'rgba(4,9,20,0.9)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h - 28); ctx.clip();
      if (ch.id) {
        if (kaelPortraitReady('face')) {
          const im = KAEL_PORTRAIT.face, s = Math.max(r.w / im.naturalWidth, (r.h - 28) / im.naturalHeight);
          ctx.drawImage(im, r.x + (r.w - im.naturalWidth * s) / 2, r.y, im.naturalWidth * s, im.naturalHeight * s);
        } else if (!drawCapaCrop(ctx, 'rosto', r.x - 6, r.y, r.w + 12, r.w + 12)) drawMenuIcon(ctx, 'sword', r.x + r.w / 2, r.y + 60, 40, PAL.accent);
      } else {
        // Silhueta bloqueada
        const cx = r.x + r.w / 2, cy = r.y + 52;
        const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
        g.addColorStop(0, 'rgba(30,40,58,0.9)'); g.addColorStop(1, 'rgba(8,12,22,0.9)');
        ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = 'rgba(2,4,9,0.95)';
        ctx.beginPath(); ctx.arc(cx, cy, 22, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - 48, r.y + r.h); ctx.quadraticCurveTo(cx - 44, cy + 26, cx, cy + 24); ctx.quadraticCurveTo(cx + 44, cy + 26, cx + 48, r.y + r.h); ctx.fill();
        ctx.strokeStyle = 'rgba(90,140,220,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, 22, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.fillStyle = sel ? 'rgba(40,110,255,0.85)' : 'rgba(8,14,28,0.95)';
      ctx.fillRect(r.x, r.y + r.h - 28, r.w, 28);
      ctx.font = `bold 13px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = sel ? '#ffffff' : 'rgba(200,214,235,0.75)';
      ctx.fillText(ch.id ? 'KAEL' : '???', r.x + r.w / 2 + 1, r.y + r.h - 13);
      ctx.letterSpacing = '0px';
      if (sel) { ctx.shadowColor = 'rgba(70,150,255,0.95)'; ctx.shadowBlur = 14; }
      ctx.strokeStyle = sel ? 'rgba(150,205,255,1)' : 'rgba(61,139,255,0.3)'; ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.restore();
    });
    // Ficha do personagem
    const I = L.info;
    this.drawPanel(ctx, I.x, I.y, I.w, I.h, 0.82, 12);
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const colW = Math.max(220, I.w - 300);
    if (c.id) {
      ctx.font = `bold 20px ${FONT_TITLE}`; ctx.letterSpacing = '3px';
      glowText(ctx, c.name, I.x + 22, I.y + 30, PAL.accentHi, 'rgba(60,140,255,0.8)', 10);
      ctx.font = `bold 11px ${FONT_TITLE}`; ctx.fillStyle = PAL.accent;
      ctx.fillText(c.role, I.x + 22, I.y + 54);
      ctx.letterSpacing = '0px';
      ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = '#c9d6ea';
      wrapText(ctx, c.desc, colW - 30).forEach((ln, k) => ctx.fillText(ln, I.x + 22, I.y + 82 + k * 20));
      const sx = I.x + colW + 10, bw = I.w - colW - 40;
      c.stats.forEach(([name, v], k) => {
        const y = I.y + 34 + k * 34;
        ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(200,214,235,0.85)';
        ctx.fillText(name, sx, y);
        ctx.letterSpacing = '0px';
        ctx.fillStyle = 'rgba(20,34,60,0.95)'; ctx.fillRect(sx, y + 9, bw, 7);
        const g = ctx.createLinearGradient(sx, 0, sx + bw, 0);
        g.addColorStop(0, '#2a6dff'); g.addColorStop(1, '#8fd0ff');
        ctx.fillStyle = g; ctx.fillRect(sx, y + 9, bw * v * Math.min(1, this.pageT * 2.5), 7);
      });
    } else {
      ctx.font = `bold 20px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = 'rgba(200,214,235,0.7)';
      ctx.fillText('???', I.x + 22, I.y + 30);
      ctx.letterSpacing = '0px';
      ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.6)';
      ctx.fillText('Uma lembrança que Kael ainda não recuperou.', I.x + 22, I.y + 70);
      ctx.fillText('Este personagem ainda não está disponível.', I.x + 22, I.y + 92);
      drawMenuIcon(ctx, 'lock', I.x + I.w - 70, I.y + I.h / 2, 46, 'rgba(150,170,200,0.5)');
    }
    if (this.charMsg > 0) {
      ctx.globalAlpha = clamp(this.charMsg, 0, 1);
      ctx.font = `bold 14px ${FONT_UI}`; ctx.fillStyle = '#ff8aa0';
      ctx.fillText('Personagem bloqueado. Somente Kael pode despertar agora.', I.x + 22, I.y + I.h - 22);
    }
    ctx.restore();
    L.btns.forEach((r, i) => this.drawButton(ctx, r, r.label, r.icon, this.charBtn === i + 1 || (i === 0 && this.charBtn === 0), { center: false, size: 14 }));
    this.drawHints(ctx, [[['#←', '#→'], ['@dpad'], 'ESCOLHER'], [['#Enter'], ['@a'], 'CONFIRMAR'], [['#Esc'], ['@b'], 'VOLTAR']]);
  }

  // Kael grande em 3D, aceso, girando devagar (seleção de personagem)
  drawKael3D(ctx, t, x, y, sc) {
    if (!R3D.active || !game.model3('kael')) return false;
    const k = this.kael || (this.kael = new Player(0, 0));
    k.state = 'idle'; k.animTime = t; k.stateTime = t; k.fury = 100; k.moveSpeed = 0; k.flash = 0;
    k.facing = 0.55 + 0.5 * Math.sin(t * 0.3);
    const o = game.opts3(k, 0); o.scale = sc;
    const it = game.queue3('kael', k, o);
    R3D.flush(Math.min(3, game.scale));
    if (!it || !it.ok) return false;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    GlowCache.drawFlat(ctx, '60,130,255', x, y, 45 * sc, 0.5);
    ctx.restore();
    R3D.blit(ctx, it, x, y);
    R3D.blitEmissive(ctx, it, x, y, 1);
    const def = MODELS3D.kael;
    if (def.glows) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      def.glows(k, (name, r, rgb, a) => { const q = it.anchors[name]; if (q) GlowCache.draw(ctx, rgb, x + q.x, y + q.y, r * sc * 0.8, a); });
      ctx.restore();
    }
    return true;
  }

  // -------------------------------------------------------- configurações
  laySettings() {
    const narrow = VIEW_W < 1100;
    const x0 = Math.max(24, Math.min(60, VIEW_W * 0.04)), tabW = narrow ? 168 : 200, top = 104;
    const rightW = clamp(VIEW_W * 0.28, 270, 380);
    const ox = x0 + tabW + 18, ow = Math.min(620, VIEW_W - ox - rightW - 40);
    const tab = SETTINGS_TABS[this.st.tab], ctl = tab.id === 'controles';
    const tabs = SETTINGS_TABS.map((tb, i) => ({ id: i, x: x0, y: top + 10 + i * 50, w: tabW, h: 42 }));
    const rowH = 36, ry = top + 56;
    const rows = tab.opts.map((o, i) => {
      const vw = Math.min(230, ow * 0.46), vx = ox + ow - vw - 16, y = ry + i * rowH;
      return { o, x: ox + 8, y, w: ow - 16, h: rowH - 4, vx, vw, l: { x: vx, y: y + 2, w: 30, h: rowH - 8 }, r: { x: vx + vw - 30, y: y + 2, w: 30, h: rowH - 8 } };
    });
    const tableH = ctl ? COMMANDS.length * 19 + 34 : 0;
    const panel = { x: ox, y: top, w: ow, h: 56 + rows.length * rowH + 40 + tableH };
    const by = panel.y + panel.h + 14;
    const btns = [
      { id: 'apply', label: 'APLICAR', x: ox, y: by, w: 150, h: 40 },
      { id: 'reset', label: 'PADRÃO', x: ox + 162, y: by, w: 130, h: 40 },
      { id: 'back', label: 'VOLTAR', x: ox + 304, y: by, w: 150, h: 40 },
    ];
    const right = { x: ox + ow + 20, y: top, w: VIEW_W - (ox + ow + 20) - x0, h: panel.h + 54 };
    return { tabs, rows, panel, btns, right, ctl, tab, tableY: panel.y + 56 + rows.length * rowH + 40 };
  }
  setDirty() { const e = this.st.edit; for (const k in SETTINGS_DEFAULT) if (e[k] !== Settings.v[k]) return true; return false; }
  setTab(i) {
    const n = SETTINGS_TABS.length;
    this.st.tab = (i + n) % n; this.st.row = 0; this.st.area = 'opts';
    game.audio.play('uiMove');
  }
  // Muda o valor de uma opção (dir = -1 / +1)
  changeOpt(o, dir) {
    const e = this.st.edit;
    if (o.type === 'info') { game.audio.play('uiDeny'); return; }
    if (o.type === 'bool') e[o.key] = !e[o.key];
    else if (o.type === 'range') {
      const v = clamp(e[o.key] + dir * o.step, o.min, o.max);
      if (v === e[o.key]) { game.audio.play('uiDeny'); return; }
      e[o.key] = v;
    } else {
      const i = o.values.indexOf(e[o.key]), n = o.values.length;
      e[o.key] = o.values[((i < 0 ? 0 : i) + dir + n) % n];
    }
    game.audio.play('uiMove');
    if (o.key === 'vibration' && e.vibration) game.input.rumble(0.5, 0.5, 220, true);
  }
  applySettings() {
    Object.assign(Settings.v, this.st.edit);
    Settings.save();
    Settings.apply(game);
    game.audio.play('uiSelect');
    this.notify('Configurações aplicadas', '140,255,190', 'check');
  }
  leaveSettings() {
    if (!this.setDirty()) { this.back(); return; }
    this.ask('ALTERAÇÕES NÃO APLICADAS', 'Deseja aplicar as alterações antes de sair?',
      [['APLICAR', () => { this.applySettings(); this.back(); }], ['DESCARTAR', () => this.back()]], '110,190,255');
  }
  settingsAct(id) {
    if (id === 'apply') this.applySettings();
    else if (id === 'reset') {
      for (const o of SETTINGS_TABS[this.st.tab].opts) if (o.key in SETTINGS_DEFAULT) this.st.edit[o.key] = SETTINGS_DEFAULT[o.key];
      game.audio.play('uiSelect');
    } else this.leaveSettings();
  }
  updSettings(inp) {
    const st = this.st, L = this.laySettings(), m = inp.mouse, nRows = L.rows.length;
    if (inp.pressed.back) { this.leaveSettings(); return; }
    if (inp.pressed.tabPrev) { this.setTab(st.tab - 1); return; }
    if (inp.pressed.tabNext) { this.setTab(st.tab + 1); return; }
    // Mouse: abas, linhas, setas e botões
    if (m.moved || m.clicked) {
      L.tabs.forEach((r, i) => { if (m.clicked && inRect(m, r) && i !== st.tab) this.setTab(i); });
      L.rows.forEach((r, i) => { if (inRect(m, r)) { if (st.area !== 'opts' || st.row !== i) { st.area = 'opts'; st.row = i; } } });
      L.btns.forEach((r, i) => { if (inRect(m, r)) { st.area = 'btns'; st.btn = i; } });
      if (m.clicked) {
        const row = L.rows[st.row];
        if (st.area === 'opts' && row && inRect(m, row)) {
          if (inRect(m, row.l)) this.changeOpt(row.o, -1);
          else this.changeOpt(row.o, 1);
          return;
        }
        const b = L.btns.find((r) => inRect(m, r));
        if (b) { this.settingsAct(b.id); return; }
      }
    }
    if (st.area === 'opts') {
      if (inp.pressed.up) { if (st.row > 0) { st.row--; game.audio.play('uiMove'); } }
      if (inp.pressed.down) { if (st.row < nRows - 1) st.row++; else { st.area = 'btns'; st.btn = 0; } game.audio.play('uiMove'); }
      const row = L.rows[st.row];
      if (row) {
        if (inp.pressed.left) this.changeOpt(row.o, -1);
        if (inp.pressed.right || inp.pressed.confirm) this.changeOpt(row.o, 1);
      }
    } else {
      if (inp.pressed.up) { st.area = 'opts'; st.row = nRows - 1; game.audio.play('uiMove'); }
      if (inp.pressed.left) { st.btn = (st.btn + 2) % 3; game.audio.play('uiMove'); }
      if (inp.pressed.right) { st.btn = (st.btn + 1) % 3; game.audio.play('uiMove'); }
      if (inp.pressed.confirm) this.settingsAct(L.btns[st.btn].id);
    }
  }
  drawSettings(ctx, t) {
    const st = this.st, L = this.laySettings(), e = st.edit;
    if (game.state === 'paused') { ctx.fillStyle = 'rgba(1,3,8,0.86)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    else {
      ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      if (!L.ctl && L.right.w > 180) drawCapaLayer(ctx, 'config', L.right.x - 40, 0, VIEW_W - L.right.x + 40, VIEW_H, 230, 220, 2, { l: 240, b: 170 }, 0.85);
      Backdrop.drawMotes(ctx, t);
    }
    this.drawHeader(ctx, 'CONFIGURAÇÕES');
    // Abas
    L.tabs.forEach((r, i) => {
      const tb = SETTINGS_TABS[i], sel = i === st.tab;
      ctx.save();
      if (sel) {
        ctx.fillStyle = 'rgba(30,90,220,0.7)'; techPanelPath(ctx, r.x, r.y, r.w, r.h, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(150,205,255,0.95)'; ctx.lineWidth = 1.3; ctx.stroke();
      }
      drawMenuIcon(ctx, tb.icon, r.x + 24, r.y + r.h / 2, 18, sel ? '#ffffff' : '#7fb4ff');
      ctx.font = `${sel ? 'bold ' : ''}14px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
      ctx.fillStyle = sel ? '#ffffff' : '#c9d6ea'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(tb.name, r.x + 46, r.y + r.h / 2 + 1);
      ctx.letterSpacing = '0px';
      ctx.restore();
    });
    // Opções
    const P = L.panel;
    this.drawPanel(ctx, P.x, P.y, P.w, P.h, 0.86, 12);
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = `bold 14px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = PAL.accentHi; ctx.textAlign = 'left';
    ctx.fillText(L.tab.name, P.x + 18, P.y + 26);
    ctx.letterSpacing = '0px';
    L.rows.forEach((r, i) => {
      const o = r.o, sel = st.area === 'opts' && st.row === i;
      if (sel) { ctx.fillStyle = 'rgba(40,100,230,0.28)'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = PAL.accent; ctx.fillRect(r.x, r.y, 3, r.h); }
      else if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(r.x, r.y, r.w, r.h); }
      ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = sel ? '#ffffff' : '#c9d6ea'; ctx.textAlign = 'left';
      ctx.fillText(o.label, r.x + 12, r.y + r.h / 2 + 1);
      const cy = r.y + r.h / 2;
      ctx.textAlign = 'center';
      if (o.type === 'info') {
        ctx.fillStyle = PAL.accentHi; ctx.fillText(o.text, r.vx + r.vw / 2, cy + 1);
        return;
      }
      // Setas ‹ ›
      ctx.strokeStyle = sel ? '#d8ecff' : 'rgba(150,180,220,0.7)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r.l.x + 18, cy - 6); ctx.lineTo(r.l.x + 12, cy); ctx.lineTo(r.l.x + 18, cy + 6);
      ctx.moveTo(r.r.x + 12, cy - 6); ctx.lineTo(r.r.x + 18, cy); ctx.lineTo(r.r.x + 12, cy + 6); ctx.stroke();
      const v = e[o.key];
      if (o.type === 'range') {
        const bx = r.vx + 36, bw = r.vw - 72 - 46, k = (v - o.min) / (o.max - o.min);
        ctx.fillStyle = 'rgba(20,34,60,0.95)'; ctx.fillRect(bx, cy - 3, bw, 6);
        ctx.fillStyle = PAL.accent; ctx.fillRect(bx, cy - 3, bw * k, 6);
        ctx.fillStyle = '#e6f1ff'; ctx.beginPath(); ctx.arc(bx + bw * k, cy, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = sel ? '#ffffff' : '#c9d6ea'; ctx.textAlign = 'right';
        ctx.fillText(`${o.key === 'brightness' && v > 0 ? '+' : ''}${v}${o.unit}`, r.r.x - 2, cy + 1);
      } else {
        const txt = o.type === 'bool' ? (v ? 'Ligado' : 'Desligado') : o.names[Math.max(0, o.values.indexOf(v))];
        ctx.fillStyle = sel ? '#ffffff' : '#c9d6ea';
        ctx.fillText(txt, r.vx + r.vw / 2, cy + 1);
      }
    });
    // Dica da opção selecionada
    const cur = st.area === 'opts' ? L.rows[st.row] : null;
    const hy = P.y + 56 + L.rows.length * 36 + 16;
    ctx.textAlign = 'left'; ctx.font = `italic 12px ${FONT_UI}`; ctx.fillStyle = 'rgba(190,205,228,0.75)';
    const hint = cur && cur.o.hint ? cur.o.hint : this.setDirty() ? 'Há alterações ainda não aplicadas.' : '';
    ctx.fillText(hint, P.x + 20, hy);
    ctx.restore();
    if (L.ctl) { this.drawCommands(ctx, P.x + 16, L.tableY, P.w - 32); this.drawPadStatus(ctx, L.right); }
    L.btns.forEach((r, i) => this.drawButton(ctx, r, r.label, null, st.area === 'btns' && st.btn === i, { center: true, size: 14 }));
    this.drawHints(ctx, [[['#Q', '#E'], ['@lb', '@rb'], 'ABA'], [['#←', '#→'], ['@dpad'], 'AJUSTAR'], [['#Esc'], ['@b'], 'VOLTAR']]);
  }

  // Tabela de comandos (teclado e controle)
  drawCommands(ctx, x, y, w) {
    const kind = game.input.pad ? game.input.pad.kind : 'xbox';
    const c1 = w * 0.42, c2 = w * 0.24;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = PAL.accent;
    ctx.fillText('COMANDOS', x, y);
    ctx.fillText('TECLADO', x + c1, y);
    ctx.fillText('CONTROLE', x + c1 + c2, y);
    ctx.letterSpacing = '0px';
    COMMANDS.forEach(([act, kb, pd], i) => {
      const yy = y + 22 + i * 19;
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(x - 4, yy - 9, w + 8, 18); }
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = '#c9d6ea'; ctx.fillText(act, x, yy);
      ctx.fillStyle = PAL.accentHi; ctx.fillText(kb, x + c1, yy);
      drawTokens(ctx, pd, x + c1 + c2, yy, 16, kind, '#c9d6ea');
    });
    ctx.restore();
  }

  // Estado do controle, diagnóstico ao vivo e instruções de conexão
  drawPadStatus(ctx, R) {
    const inp = game.input, pad = inp.pad, e = this.st.edit;
    this.drawPanel(ctx, R.x, R.y, R.w, R.h, 0.86, 12);
    const x = R.x + 18, w = R.w - 36;
    let y = R.y + 26;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 14px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = PAL.accentHi;
    ctx.fillText('CONTROLE', x, y);
    ctx.letterSpacing = '0px';
    y += 28;
    ctx.fillStyle = pad ? '#5dff8a' : 'rgba(255,120,140,0.9)';
    ctx.beginPath(); ctx.arc(x + 5, y, 5, 0, TAU); ctx.fill();
    ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = '#eef3fa';
    ctx.fillText(pad ? `Conectado · ${pad.labels.name}` : 'Nenhum controle detectado', x + 16, y);
    if (pad && inp.lastDevice === 'pad') {
      ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
      const tw = ctx.measureText('EM USO').width + 14;
      ctx.fillStyle = 'rgba(40,110,255,0.85)'; ctx.fillRect(x + w - tw, y - 9, tw, 18);
      ctx.fillStyle = '#ffffff'; ctx.fillText('EM USO', x + w - tw + 7, y + 1);
      ctx.letterSpacing = '0px';
    }
    y += 20;
    ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(190,205,228,0.7)';
    if (pad) {
      let id = pad.id;
      while (id.length > 4 && ctx.measureText(id).width > w) id = id.slice(0, -2);
      if (id !== pad.id) id = id.slice(0, -1) + '…';
      ctx.fillText(id, x, y);
      y += 17;
      ctx.fillStyle = pad.mapping === 'standard' ? 'rgba(190,205,228,0.7)' : '#ffcf7a';
      ctx.fillText(pad.mapping === 'standard' ? 'Mapeamento padrão reconhecido' : 'Mapeamento não padrão: alguns botões podem ficar trocados', x, y);
    } else {
      ctx.fillText(inp.lastDevice === 'pad' ? '' : 'Teclado e mouse em uso.', x, y);
      y += 17;
      ctx.fillText('Conecte um controle e aperte qualquer botão.', x, y);
    }
    // Diagnóstico
    y += 26;
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = PAL.accent;
    ctx.fillText('DIAGNÓSTICO', x, y);
    ctx.letterSpacing = '0px';
    y += 44;
    const ax = pad ? pad.axes : [0, 0, 0, 0], dz = e.deadzone / 100, sens = e.padSens / 100;
    const stick = (cx, cy, sx, sy, label) => {
      const r = 30;
      ctx.strokeStyle = 'rgba(120,150,200,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,140,0.16)'; ctx.beginPath(); ctx.arc(cx, cy, r * dz, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
      ctx.strokeStyle = 'rgba(120,150,200,0.2)'; ctx.stroke();
      const mag = Math.hypot(sx, sy), out = mag <= dz ? 0 : Math.min(1, ((mag - dz) / (1 - dz)) * sens);
      ctx.fillStyle = out > 0 ? '#8fd0ff' : 'rgba(200,214,235,0.6)';
      ctx.beginPath(); ctx.arc(cx + clamp(sx, -1, 1) * r, cy + clamp(sy, -1, 1) * r, 4, 0, TAU); ctx.fill();
      ctx.font = `10px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(190,205,228,0.75)';
      ctx.fillText(`${label} ${out.toFixed(2)}`, cx, cy + r + 12);
      ctx.textAlign = 'left';
    };
    stick(x + 34, y, ax[0] || 0, ax[1] || 0, 'ESQ');
    stick(x + 112, y, ax[2] || 0, e.invertY ? -(ax[3] || 0) : ax[3] || 0, 'DIR');
    // Gatilhos
    const bt = pad ? pad.buttons : [];
    const trig = (tx, label, v) => {
      ctx.fillStyle = 'rgba(20,34,60,0.95)'; ctx.fillRect(tx, y - 30, 12, 60);
      ctx.fillStyle = PAL.accent; ctx.fillRect(tx, y + 30 - 60 * clamp(v || 0, 0, 1), 12, 60 * clamp(v || 0, 0, 1));
      ctx.font = `10px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(190,205,228,0.75)';
      ctx.fillText(label, tx + 6, y + 42); ctx.textAlign = 'left';
    };
    const lbl = pad ? pad.labels : PAD_LABELS.xbox;
    if (w > 220) { trig(x + 168, lbl.lt, bt[6]); trig(x + 196, lbl.rt, bt[7]); }
    // Botões (acendem quando apertados)
    y += 58;
    const cols = Math.max(4, Math.min(9, Math.floor(w / 34))), cw = w / cols;
    PAD_DIAG.forEach((b, i) => {
      const cx = x + (i % cols) * cw + cw / 2, cy = y + Math.floor(i / cols) * 30, lit = (bt[i] || 0) > 0.5;
      if (b.length > 1 || 'abxy'.includes(b)) drawPadButton(ctx, pad ? pad.kind : 'xbox', b, cx, cy, 11, lit);
      else {
        ctx.fillStyle = lit ? 'rgba(90,160,255,0.95)' : 'rgba(8,12,22,0.95)';
        ctx.fillRect(cx - 11, cy - 9, 22, 18);
        ctx.strokeStyle = 'rgba(170,190,220,0.9)'; ctx.lineWidth = 1; ctx.strokeRect(cx - 10.5, cy - 8.5, 21, 17);
        ctx.font = `bold 11px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillStyle = lit ? '#08101e' : '#e6eefa';
        ctx.fillText(b, cx, cy + 1); ctx.textAlign = 'left';
      }
    });
    y += Math.ceil(PAD_DIAG.length / cols) * 30 + 10;
    // Como conectar
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = PAL.accent;
    ctx.fillText('COMO CONECTAR', x, y);
    ctx.letterSpacing = '0px';
    ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.78)';
    const tips = [
      'USB: ligue o cabo e aperte qualquer botão com o jogo em foco.',
      'Bluetooth: pareie nas configurações do sistema. Xbox: botão de parear; DualShock 4/DualSense: segure Share/Create + PS; GameSir: modo XInput/Android.',
      'Funciona em navegadores com Gamepad API (Chrome, Edge, Firefox).',
    ];
    let ly = y + 18;
    for (const tp of tips) for (const ln of wrapText(ctx, tp, w)) { if (ly < R.y + R.h - 8) ctx.fillText(ln, x, ly); ly += 15; }
    ctx.restore();
  }

  // -------------------------------------------------------------- créditos
  drawCredits(ctx, t) {
    ctx.fillStyle = '#010205'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawCapa(ctx, 0, 0, VIEW_W, VIEW_H, 512, 360, 1, 0.12);
    Backdrop.drawMotes(ctx, t);
    this.drawHeader(ctx, 'CRÉDITOS');
    drawCapaCrop(ctx, 'eclipse', VIEW_W - 260, 20, 200, 200, 0.95, 'lighter', 'radial');
    const lw = Math.min(540, VIEW_W * 0.46), lh = lw * CAPA_CROP.logo[3] / CAPA_CROP.logo[2];
    if (!drawCapaCrop(ctx, 'logo', VIEW_W / 2 - lw / 2, 50, lw, lh, 1, 'lighter', { l: 50, r: 110, t: 30, b: 26 })) this.drawLogoText(ctx, VIEW_W / 2, 130, 0.8);
    const y0 = 50 + lh + 34, cx = VIEW_W / 2;
    ctx.save();
    ctx.textBaseline = 'middle';
    CREDITS.forEach(([role, name], i) => {
      const y = y0 + i * 34, a = clamp(this.pageT * 2 - i * 0.25, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `bold 13px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(190,205,228,0.8)';
      ctx.fillText(role, cx - 24, y);
      ctx.letterSpacing = '0px';
      ctx.font = `15px ${FONT_UI}`; ctx.textAlign = 'left'; ctx.fillStyle = '#eef3fa';
      ctx.fillText(name, cx + 24, y);
    });
    ctx.globalAlpha = clamp(this.pageT - 1.2, 0, 1);
    ctx.textAlign = 'center'; ctx.font = `bold 14px ${FONT_TITLE}`; ctx.letterSpacing = '4px';
    glowText(ctx, CREDITS_THANKS, cx + 2, y0 + CREDITS.length * 34 + 44, '#dfeaff', 'rgba(60,140,255,0.8)', 12);
    ctx.letterSpacing = '0px';
    ctx.restore();
    this.drawHints(ctx, [[['#Esc'], ['@b'], 'VOLTAR']]);
  }

  // ------------------------------------------------------------- despedida
  updBye(inp) { if (this.pageT > 0.4 && (inp.pressed.confirm || inp.pressed.back || inp.mouse.clicked)) { game.audio.play('uiSelect'); this.reset('start'); } }
  drawBye(ctx, t) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawCapa(ctx, 0, 0, VIEW_W, VIEW_H, 512, 300, 1, 0.18);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 30px ${FONT_TITLE}`; ctx.letterSpacing = '6px';
    glowText(ctx, 'OBRIGADO POR JOGAR', VIEW_W / 2 + 3, VIEW_H * 0.42, '#eef5ff', 'rgba(60,140,255,0.9)', 18);
    ctx.letterSpacing = '0px';
    ctx.font = `15px ${FONT_UI}`; ctx.fillStyle = 'rgba(214,226,242,0.85)';
    ctx.fillText('Seu progresso está salvo. Você já pode fechar esta aba ou janela com segurança.', VIEW_W / 2, VIEW_H * 0.5);
    ctx.restore();
    this.drawHints(ctx, [[['#Enter'], ['@a'], 'VOLTAR AO JOGO']], VIEW_W / 2 + 90, VIEW_H * 0.62);
  }

  // ------------------------------------------------------------------ pausa
  layPause() {
    const x = Math.max(32, Math.min(70, VIEW_W * 0.05)), y0 = 130, w = 320, h = 46, gap = 8;
    const items = [['resume', 'RETOMAR', 'play'], ['skills', 'HABILIDADES', 'tree'], ['settings', 'CONFIGURAÇÕES', 'gear'],
      ['restart', 'REINICIAR SETOR', 'restart'], ['menu', 'SAIR PARA O MENU', 'exit'], ['quit', 'SAIR DO JOGO', 'power']];
    return { panel: { x, y: y0, w: w + 40, h: items.length * (h + gap) + 34 }, rects: items.map(([id, label, icon], i) => ({ id, label, icon, x: x + 20, y: y0 + 22 + i * (h + gap), w, h })) };
  }
  updPause(inp) {
    if (inp.pressed.pause || inp.pressed.back) { game.resume(); return; }
    if (inp.pressed.skills) { game.openSkills('paused'); return; }
    if (inp.pressed.restart) { game.fadeTo(() => game.respawn(false)); return; }
    if (inp.pressed.toTitle) { game.fadeTo(() => game.toMenu()); return; }
    this.navList(inp, this.layPause().rects, (id) => {
      if (id === 'resume') game.resume();
      else if (id === 'skills') game.openSkills('paused');
      else if (id === 'settings') this.open('settings');
      else if (id === 'restart') this.ask('REINICIAR SETOR', 'Kael volta ao início deste setor. Níveis, habilidades e evoluções são mantidos.',
        [['REINICIAR', () => game.fadeTo(() => game.respawn(false))], ['CANCELAR', null]], '110,190,255');
      else if (id === 'menu') game.fadeTo(() => game.toMenu());
      else this.askQuit();
    });
  }
  drawPause(ctx, t) {
    const L = this.layPause();
    ctx.fillStyle = 'rgba(1,3,8,0.74)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    fadeEdge(ctx, 0, 0, VIEW_W * 0.45, VIEW_H, 'left', '1,3,8', 0.6);
    this.drawHeader(ctx, 'PAUSA');
    const P = L.panel;
    this.drawPanel(ctx, P.x, P.y, P.w, P.h, 0.88);
    L.rects.forEach((r, i) => this.drawButton(ctx, r, r.label, r.icon, i === this.sel, { flat: true, size: 15 }));
    // Situação atual, técnicas e evoluções
    const ix = P.x + P.w + 36, iw = Math.min(760, VIEW_W - ix - 40);
    if (iw > 300) {
      const g = game, p = g.player;
      this.drawPanel(ctx, ix, P.y, iw, P.h, 0.88);
      ctx.save();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const room = ROOM_DEFS[g.waves.roomIndex];
      ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = PAL.accent;
      ctx.fillText(room.sub, ix + 22, P.y + 28);
      ctx.letterSpacing = '0px';
      ctx.font = `bold 18px ${FONT_UI}`; ctx.fillStyle = '#eef3fa';
      ctx.fillText(room.name, ix + 22, P.y + 54);
      ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = PAL.accentHi;
      ctx.fillText(`Nível ${g.progress.level}   ·   Memórias ${g.stats.memories} / ${MEMORIES.length}   ·   Tempo ${fmtPlay(g.stats.time)}   ·   Espaço ${g.slot}`, ix + 22, P.y + 78);
      const lv = (id) => g.progress.lv(id);
      const list = [['Leve · Leve', 'Golpes da Tempestade Nula'], ['Pesado (segurado)', 'Impacto Carregado']];
      if (lv('corte_duplo')) list.push(['Leve · Leve · Leve', 'Descarga Tríplice']);
      if (lv('lamina_giratoria')) list.push(['Leve · Leve · Pesado', 'Círculo da Ruína']);
      if (lv('pulso_fantasma')) list.push(['Esquiva → Leve', 'Pulso Fantasma']);
      if (lv('corte_vazio')) list.push(['Esquiva → Pesado', 'Corte do Vazio']);
      if (p.combo.unlocked.has('slam')) list.push(['Pesado · Pesado', 'Colapso Magnético']);
      if (p.combo.unlocked.has('uppercut')) list.push(['Leve · Pesado', 'Relâmpago Ascendente']);
      if (lv('eclipse_absoluto')) list.push(['Eclipse (100 de energia)', 'Eclipse Absoluto']);
      const c2 = ix + Math.max(320, iw * 0.56);
      ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = PAL.accent;
      ctx.fillText('TÉCNICAS', ix + 22, P.y + 114);
      ctx.fillText('EVOLUÇÕES', c2, P.y + 114);
      ctx.letterSpacing = '0px';
      ctx.font = `13px ${FONT_UI}`;
      list.forEach(([k, n], i) => {
        const y = P.y + 140 + i * 21;
        ctx.fillStyle = '#c9d3e2'; ctx.fillText(k, ix + 22, y);
        ctx.fillStyle = '#7fc0ff'; ctx.fillText(n, ix + 170, y);
      });
      const ups = UPGRADES.filter((u) => g.upgrades.level(u.id) > 0);
      if (!ups.length) { ctx.fillStyle = 'rgba(201,211,226,0.6)'; ctx.fillText('Nenhuma ainda', c2, P.y + 140); }
      ups.slice(0, 9).forEach((u, i) => {
        ctx.fillStyle = '#c9d3e2';
        ctx.fillText(`${u.name}${u.max > 1 ? ` (${g.upgrades.level(u.id)}/${u.max})` : ''}`, c2, P.y + 140 + i * 21);
      });
      ctx.restore();
    }
    ctx.save();
    ctx.font = `12px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(200,214,235,0.65)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Jogo pausado · progresso salvo automaticamente', 24, VIEW_H - 24);
    ctx.letterSpacing = '0px';
    ctx.restore();
    this.drawHints(ctx, [[['#Enter'], ['@a'], 'SELECIONAR'], [['#Esc'], ['@start'], 'RETOMAR']]);
  }

  // ---------------------------------------------------------- confirmação
  layDialog() {
    const d = this.dialog, w = Math.min(560, VIEW_W - 80), h = 190, x = VIEW_W / 2 - w / 2, y = VIEW_H / 2 - h / 2;
    const n = d.buttons.length, bw = 170, gap = 16, bx = VIEW_W / 2 - (n * bw + (n - 1) * gap) / 2;
    return { x, y, w, h, btns: d.buttons.map((b, i) => ({ id: i, x: bx + i * (bw + gap), y: y + h - 62, w: bw, h: 40 })) };
  }
  updateDialog(inp) {
    const d = this.dialog, L = this.layDialog(), n = d.buttons.length, m = inp.mouse;
    if (inp.pressed.back) { this.dialog = null; game.audio.play('uiMove'); return; }
    let s = d.sel;
    if (inp.pressed.left || inp.pressed.up) s = (s + n - 1) % n;
    if (inp.pressed.right || inp.pressed.down) s = (s + 1) % n;
    let hit = -1;
    if (m.moved || m.clicked) L.btns.forEach((r, i) => { if (inRect(m, r)) { s = i; if (m.clicked) hit = i; } });
    if (s !== d.sel) { d.sel = s; game.audio.play('uiMove'); }
    if (inp.pressed.confirm || hit >= 0) {
      const fn = d.buttons[d.sel][1];
      this.dialog = null;
      game.audio.play('uiSelect');
      if (fn) fn();
    }
  }
  drawDialog(ctx) {
    const d = this.dialog, L = this.layDialog();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(6,8,16,0.97)';
    techPanelPath(ctx, L.x, L.y, L.w, L.h, 14); ctx.fill();
    ctx.strokeStyle = rgba(d.rgb, 0.75); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 18px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = rgba(d.rgb, 1);
    ctx.fillText(d.title, VIEW_W / 2 + 1, L.y + 34);
    ctx.letterSpacing = '0px';
    ctx.font = `15px ${FONT_UI}`; ctx.fillStyle = '#dfe6f2';
    wrapText(ctx, d.text, L.w - 60).forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, L.y + 70 + i * 21));
    ctx.restore();
    L.btns.forEach((r, i) => this.drawButton(ctx, r, d.buttons[i][0], null, i === d.sel, { center: true, size: 14 }));
  }

  // Aviso discreto (controle conectado/desconectado, configurações aplicadas)
  drawNotice(ctx) {
    const n = this.notice;
    if (!n) return;
    const k = n.t < 0.25 ? n.t / 0.25 : n.t > n.max - 0.4 ? (n.max - n.t) / 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = clamp(k, 0, 1);
    ctx.font = `bold 13px ${FONT_UI}`;
    // Durante a ação, o aviso fica no espaço livre entre os painéis do HUD (retrato e radar);
    // na luta contra NEXUS, logo abaixo da barra do chefe
    const play = game.state === 'playing', top = play && game.boss ? 96 : 14;
    const w = ctx.measureText(n.text).width + 56, y = top - (1 - clamp(k, 0, 1)) * 20;
    const S = play ? game.hud.freeSpan(top, top + 34) : null;
    const x = S ? clamp(VIEW_W / 2, S.min + w / 2, S.max - w / 2) - w / 2 : VIEW_W / 2 - w / 2;
    ctx.fillStyle = 'rgba(3,7,16,0.9)';
    techPanelPath(ctx, x, y, w, 34, 8); ctx.fill();
    ctx.strokeStyle = rgba(n.rgb, 0.8); ctx.lineWidth = 1; ctx.stroke();
    drawMenuIcon(ctx, n.icon, x + 20, y + 17, 18, rgba(n.rgb, 1));
    ctx.fillStyle = '#eef3fa'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(n.text, x + 38, y + 18);
    ctx.restore();
  }

  draw(ctx, t) {
    switch (this.page) {
      case 'cover': this.drawCover(ctx, t); break;
      case 'start': this.drawStart(ctx, t); break;
      case 'main': this.drawMain(ctx, t); break;
      case 'load': this.drawLoad(ctx, t); break;
      case 'char': this.drawChar(ctx, t); break;
      case 'settings': this.drawSettings(ctx, t); break;
      case 'credits': this.drawCredits(ctx, t); break;
      case 'bye': this.drawBye(ctx, t); break;
      case 'pause': this.drawPause(ctx, t); break;
    }
    if (this.dialog) this.drawDialog(ctx);
  }
}
