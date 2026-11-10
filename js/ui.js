'use strict';
// ECLIPSE ZERO · Interface: quebra de texto, texto com brilho e ícones procedurais
// ---------------------------------------------------------------------------
// FUNÇÕES DE TEXTO E ÍCONES DA INTERFACE
// ---------------------------------------------------------------------------
function wrapText(ctx, text, maxW) {
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function glowText(ctx, text, x, y, color, glow, blur = 18) {
  ctx.save();
  ctx.shadowColor = glow; ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Ícones procedurais das evoluções
function drawIcon(ctx, kind, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 40, s / 40);
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (kind) {
    case 'sword':
      ctx.moveTo(-14, 14); ctx.lineTo(12, -12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(-4, 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, -12); ctx.lineTo(16, -16); ctx.stroke();
      break;
    case 'boot':
      ctx.moveTo(-8, -16); ctx.lineTo(-8, 8); ctx.lineTo(10, 12); ctx.lineTo(12, 4); ctx.lineTo(2, 0); ctx.lineTo(2, -16); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(-12, -6); ctx.moveTo(-20, 0); ctx.lineTo(-12, 0); ctx.stroke();
      break;
    case 'fang':
      ctx.moveTo(-12, -12); ctx.lineTo(-6, 10); ctx.lineTo(-2, -12); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, -12); ctx.lineTo(6, 10); ctx.lineTo(12, -12); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(6, 15, 3, 0, TAU); ctx.fill();
      break;
    case 'heart':
      ctx.moveTo(0, 14); ctx.bezierCurveTo(-22, 0, -14, -18, 0, -6); ctx.bezierCurveTo(14, -18, 22, 0, 0, 14); ctx.fill();
      break;
    case 'flame':
      ctx.moveTo(0, -18); ctx.bezierCurveTo(14, -4, 14, 14, 0, 16); ctx.bezierCurveTo(-14, 14, -12, 0, -4, -6); ctx.bezierCurveTo(-4, 2, 2, 4, 0, -18); ctx.fill();
      break;
    case 'eye':
      ctx.moveTo(-18, 0); ctx.quadraticCurveTo(0, -16, 18, 0); ctx.quadraticCurveTo(0, 16, -18, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      break;
    case 'wing':
      ctx.moveTo(-14, 12); ctx.quadraticCurveTo(-10, -14, 16, -14); ctx.quadraticCurveTo(6, -6, 10, -2); ctx.quadraticCurveTo(0, 0, 4, 6); ctx.quadraticCurveTo(-6, 6, -14, 12); ctx.fill();
      break;
    case 'shield':
      ctx.moveTo(0, -16); ctx.lineTo(14, -10); ctx.quadraticCurveTo(14, 8, 0, 16); ctx.quadraticCurveTo(-14, 8, -14, -10); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
      break;
    case 'soul':
      ctx.arc(0, 4, 8, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, -1); ctx.quadraticCurveTo(-4, -14, 4, -18); ctx.quadraticCurveTo(2, -8, 7, -2); ctx.fill();
      break;
    case 'bolt':
      ctx.moveTo(4, -18); ctx.lineTo(-10, 2); ctx.lineTo(0, 2); ctx.lineTo(-4, 18); ctx.lineTo(10, -4); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill();
      break;
    case 'chain':
      ctx.moveTo(-16, -12); ctx.lineTo(-4, -2); ctx.lineTo(-8, 2); ctx.lineTo(6, 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -16); ctx.lineTo(10, -6); ctx.lineTo(6, -4); ctx.lineTo(16, 6); ctx.stroke();
      ctx.beginPath(); ctx.arc(-16, -12, 3, 0, TAU); ctx.arc(16, 6, 3, 0, TAU); ctx.fill();
      break;
    case 'orb':
      ctx.arc(0, 0, 13, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
      break;
    case 'scroll':
      ctx.strokeRect(-12, -14, 24, 28);
      ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(7, -6); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(-7, 6); ctx.lineTo(3, 6); ctx.stroke();
      break;
    // ----- Habilidades das árvores
    case 'spark':
      ctx.moveTo(2, -18); ctx.lineTo(-8, 0); ctx.lineTo(0, 0); ctx.lineTo(-4, 18); ctx.lineTo(10, -4); ctx.lineTo(2, -4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(-10, -6); ctx.moveTo(12, 10); ctx.lineTo(17, 14); ctx.moveTo(14, -14); ctx.lineTo(18, -18); ctx.stroke();
      break;
    case 'dash':
      ctx.moveTo(-6, -12); ctx.lineTo(16, 0); ctx.lineTo(-6, 12); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(-8, -8); ctx.moveTo(-20, 0); ctx.lineTo(-6, 0); ctx.moveTo(-18, 8); ctx.lineTo(-8, 8); ctx.stroke();
      break;
    case 'orbBolt':
      ctx.arc(6, 0, 8, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(-10, 2); ctx.lineTo(-6, -4); ctx.lineTo(0, 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(6, 0, 13, -1.2, 1.2); ctx.stroke();
      break;
    case 'field':
      ctx.arc(0, 0, 15, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(3, -1); ctx.lineTo(-2, 2); ctx.lineTo(3, 5); ctx.stroke();
      break;
    case 'burst':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      break;
    case 'eclipse':
      ctx.arc(0, 0, 15, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.beginPath(); ctx.arc(3, -2, 9, 0, TAU); ctx.fill(); ctx.restore();
      break;
    case 'shadow':
      ctx.moveTo(-4, -16); ctx.quadraticCurveTo(10, -10, 6, 4); ctx.quadraticCurveTo(2, 14, -10, 16); ctx.quadraticCurveTo(0, 6, -4, -16); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, -14); ctx.quadraticCurveTo(18, -4, 12, 10); ctx.stroke();
      break;
    case 'lunge':
      ctx.moveTo(-18, 12); ctx.lineTo(14, -12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, -12); ctx.lineTo(4, -12); ctx.moveTo(14, -12); ctx.lineTo(14, -2); ctx.stroke();
      ctx.beginPath(); ctx.arc(-12, 14, 3, 0, TAU); ctx.arc(-4, 8, 2.5, 0, TAU); ctx.fill();
      break;
    case 'reflex':
      ctx.moveTo(-18, 0); ctx.quadraticCurveTo(0, -14, 18, 0); ctx.quadraticCurveTo(0, 14, -18, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(-6, 2); ctx.lineTo(0, 2); ctx.lineTo(-2, 10); ctx.lineTo(6, -2); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill();
      break;
    case 'teleport':
      ctx.arc(-9, 6, 7, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(9, -6, 7, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.setLineDash([3, 4]); ctx.moveTo(-4, 1); ctx.lineTo(4, -2); ctx.stroke(); ctx.setLineDash([]);
      break;
    case 'twin':
      ctx.moveTo(-16, 12); ctx.lineTo(8, -14); ctx.moveTo(-8, 16); ctx.lineTo(16, -10); ctx.stroke();
      break;
    case 'spin':
      ctx.arc(0, 0, 14, -2.6, 2.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, 13); ctx.lineTo(-14, 6); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(10, 0); ctx.stroke();
      break;
    case 'counter':
      ctx.moveTo(-14, -14); ctx.lineTo(14, 14); ctx.moveTo(14, -14); ctx.lineTo(-14, 14); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      break;
    case 'break':
      ctx.moveTo(0, -16); ctx.lineTo(14, -10); ctx.quadraticCurveTo(14, 8, 0, 16); ctx.quadraticCurveTo(-14, 8, -14, -10); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, -16); ctx.lineTo(-3, -4); ctx.lineTo(4, 2); ctx.lineTo(-2, 16); ctx.stroke();
      break;
    case 'blades':
      for (let i = -1; i <= 1; i++) { ctx.moveTo(-14 + i * 4, 14 + i * 2); ctx.lineTo(12 + i * 4, -12 + i * 2); }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 18, -0.9, 0.2); ctx.stroke();
      break;
    case 'void':
      ctx.arc(-4, 0, 14, -1.1, 1.1); ctx.arc(-10, 0, 11, 0.95, -0.95, true); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(10, -8); ctx.lineTo(18, -8); ctx.moveTo(12, 0); ctx.lineTo(19, 0); ctx.moveTo(10, 8); ctx.lineTo(18, 8); ctx.stroke();
      break;
    case 'overload':
      ctx.moveTo(0, -18); ctx.lineTo(14, -6); ctx.lineTo(14, 8); ctx.lineTo(0, 18); ctx.lineTo(-14, 8); ctx.lineTo(-14, -6); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, -11); ctx.lineTo(-6, 2); ctx.lineTo(1, 2); ctx.lineTo(-3, 12); ctx.lineTo(7, -2); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill();
      break;
    case 'drain':
      ctx.moveTo(0, -16); ctx.bezierCurveTo(12, -2, 10, 12, 0, 14); ctx.bezierCurveTo(-10, 12, -12, -2, 0, -16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(0, 9); ctx.lineTo(5, 4); ctx.moveTo(0, -4); ctx.lineTo(0, 9); ctx.stroke();
      break;
    case 'scan':
      ctx.moveTo(-16, -8); ctx.lineTo(-16, -16); ctx.lineTo(-8, -16); ctx.moveTo(8, -16); ctx.lineTo(16, -16); ctx.lineTo(16, -8);
      ctx.moveTo(16, 8); ctx.lineTo(16, 16); ctx.lineTo(8, 16); ctx.moveTo(-8, 16); ctx.lineTo(-16, 16); ctx.lineTo(-16, 8); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.stroke();
      break;
    case 'hex':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        if (i) ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); else ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
      }
      ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        if (i) ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); else ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      }
      ctx.closePath(); ctx.fill();
      break;
    case 'sync':
      ctx.arc(0, 0, 14, -0.3, 2.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 14, 2.85, 5.75); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, 4); ctx.lineTo(18, -4); ctx.lineTo(9, -3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(-18, 4); ctx.lineTo(-9, 3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
      break;
    case 'lock':
      ctx.rect(-11, -2, 22, 16); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -4, 8, Math.PI, 0); ctx.lineTo(8, -2); ctx.moveTo(-8, -2); ctx.lineTo(-8, -4); ctx.stroke();
      break;
  }
  ctx.restore();
}

