'use strict';
// ECLIPSE ZERO · Telas: título, pausa, árvore de habilidades, evoluções, derrota e final
// ---------------------------------------------------------------------------
// TELAS: título, pausa, evoluções, derrota e final
// ---------------------------------------------------------------------------
const CONTROLS = [
  ['WASD / Setas', 'Mover'],
  ['J · K', 'Ataque leve · pesado (segure: Impacto)'],
  ['L / Espaço', 'Esquiva (invencível)'],
  ['1 2 3 4', 'Habilidades ativas (gastam energia)'],
  ['I', 'Eclipse Absoluto (100 de energia)'],
  ['Tab / H', 'Árvore de habilidades'],
  ['E · ESC', 'Conversar · pausa / pular história'], ['M · G · F1', 'Som · gráficos 3D/2D · debug'],
];
const COMBO_LIST = [
  ['Leve · Leve · Leve', 'Descarga Tríplice'],
  ['Leve · Leve · Pesado', 'Círculo da Ruína'],
  ['Pesado (segurado)', 'Impacto Carregado'],
  ['Esquiva → Leve', 'Pulso Fantasma'],
  ['Esquiva → Pesado', 'Corte do Vazio'],
];

class Screens {
  overlay(ctx, a = 0.72) {
    ctx.fillStyle = `rgba(1,3,8,${a})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // Partículas de energia flutuando (título e telas finais)
  drawEmbers(ctx, t) { Backdrop.drawMotes(ctx, t); }

  // Kael em 3D na tela de título, em grande escala, com a espada carregada
  drawHero3D(ctx, t) {
    if (!R3D.active || !game.model3('kael')) return false;
    const k = game.titleKael || (game.titleKael = new Player(0, 0));
    k.state = 'idle'; k.animTime = t; k.stateTime = t; k.fury = 100; k.moveSpeed = 0; k.flash = 0;
    k.facing = 0.55 + 0.5 * Math.sin(t * 0.3);
    const sc = 3.1;
    const o = game.opts3(k, 0); o.scale = sc;
    const it = game.queue3('kael', k, o);
    R3D.flush(Math.min(3, game.scale));
    if (!it || !it.ok) return false;
    const x = Math.min(VIEW_W * 0.13, 160), y = VIEW_H * 0.985;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    GlowCache.drawFlat(ctx, '60,130,255', x, y, 140, 0.5);
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

  drawTitle(ctx, t) {
    // Vesper sob o céu artificial, a torre central e Kael de costas com a espada acesa
    const sky = Backdrop.layer('title-sky', VIEW_W, VIEW_H, (g, w, h) => Backdrop.paintSky(g, w, h, 'city'));
    ctx.drawImage(sky, 0, 0, VIEW_W, VIEW_H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, '90,170,255', VIEW_W * 0.5, VIEW_H * 0.12, 60, 0.4 + 0.3 * Math.sin(t * 3));
    ctx.restore();
    if (Math.sin(t * 0.9) > 0.97) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(150,190,255,0.08)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawBolt(ctx, VIEW_W * (0.2 + 0.6 * ((Math.floor(t * 0.9 / TAU) * 0.37) % 1)), 0, VIEW_W * 0.5, VIEW_H * 0.14, mulberry32(Math.floor(t * 18)), 0.25, 2.5, '170,220,255', 0.9);
      ctx.restore();
    }
    Backdrop.drawRain(ctx, t, 0.9);
    const vg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    vg.addColorStop(0, 'rgba(1,3,8,0.35)'); vg.addColorStop(0.5, 'rgba(1,3,8,0.15)'); vg.addColorStop(1, 'rgba(1,3,8,0.85)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (!this.drawHero3D(ctx, t)) Backdrop.kael(ctx, Math.min(VIEW_W * 0.1, 120), VIEW_H * 0.99, 2.1, t);
    this.drawEmbers(ctx, t);
    // Título
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const jx = Math.sin(t * 37) > 0.985 ? rand(-6, 6) : 0;
    ctx.font = `bold 98px ${FONT_TITLE}`;
    ctx.letterSpacing = '22px';
    glowText(ctx, 'ECLIPSE', VIEW_W / 2 + 11 + jx, VIEW_H * 0.2, '#eef5ff', 'rgba(60,140,255,0.85)', 30);
    ctx.font = `bold 46px ${FONT_TITLE}`;
    ctx.letterSpacing = '40px';
    glowText(ctx, 'ZERO', VIEW_W / 2 + 20, VIEW_H * 0.31, PAL.accent, 'rgba(40,120,255,1)', 28);
    ctx.letterSpacing = '0px';
    ctx.strokeStyle = 'rgba(61,139,255,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(VIEW_W / 2 - 210, VIEW_H * 0.31); ctx.lineTo(VIEW_W / 2 - 90, VIEW_H * 0.31); ctx.moveTo(VIEW_W / 2 + 90, VIEW_H * 0.31); ctx.lineTo(VIEW_W / 2 + 210, VIEW_H * 0.31); ctx.stroke();
    ctx.font = `italic 16px ${FONT_UI}`;
    ctx.fillStyle = 'rgba(214,225,240,0.82)';
    wrapText(ctx, '“Quando o último céu artificial se apagar, os mortos se lembrarão de como viver… e os vivos desejarão nunca ter nascido.”', 640)
      .forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, VIEW_H * 0.385 + i * 22));
    ctx.restore();
    // Painel de controles e técnicas
    // Em telas estreitas o painel ocupa a largura toda (sobre a silhueta de Kael)
    const { px, py, pw, ph } = this.titleLayout();
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,14,0.78)';
    techPanelPath(ctx, px, py, pw, ph, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(61,139,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textBaseline = 'middle';
    const col = pw / 2;
    ctx.font = `bold 13px ${FONT_TITLE}`; ctx.fillStyle = PAL.accent; ctx.textAlign = 'left';
    ctx.letterSpacing = '3px';
    ctx.fillText('CONTROLES', px + 24, py + 22);
    ctx.fillText('TÉCNICAS DA TEMPESTADE NULA', px + col + 14, py + 22);
    ctx.letterSpacing = '0px';
    ctx.font = `13px ${FONT_UI}`;
    CONTROLS.forEach(([k, d], i) => {
      ctx.fillStyle = PAL.accentHi; ctx.fillText(k, px + 24, py + 48 + i * 21);
      ctx.fillStyle = '#c9d3e2'; ctx.fillText(d, px + 132, py + 48 + i * 21);
    });
    COMBO_LIST.forEach(([k, d], i) => {
      ctx.fillStyle = '#c9d3e2'; ctx.fillText(k, px + col + 14, py + 48 + i * 22);
      ctx.fillStyle = '#7fc0ff'; ctx.fillText(d, px + col + 180, py + 48 + i * 22);
    });
    ctx.fillStyle = 'rgba(201,211,226,0.6)'; ctx.font = `12px ${FONT_UI}`;
    ctx.fillText('Técnicas e poderes se desbloqueiam na árvore de habilidades.', px + col + 14, py + 166);
    ctx.fillText('Gamepad: X leve · Y pesado · A esquiva · B Eclipse', px + col + 14, py + 188);
    ctx.fillText('LT · RB · L3 · R3 habilidades · Back árvore · Start pausa', px + col + 14, py + 208);
    ctx.restore();
    // Menu (continuar / novo jogo) + recorde
    this.drawTitleMenu(ctx, t);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(214,225,240,0.6)';
    if (game.best > 0 && !game.titleConfirm) ctx.fillText(`Recorde: ${game.best.toLocaleString('pt-BR')} pontos`, px + pw / 2, VIEW_H - 14);
    ctx.restore();
  }
  // Painel de controles do título e itens do menu (também usados pelo mouse)
  titleLayout() {
    const wide = VIEW_W - 300 >= 800;
    const pw = wide ? Math.min(860, VIEW_W - 300) : Math.min(860, VIEW_W - 60);
    const px = (VIEW_W - pw) / 2 + (wide ? 60 : 0), py = VIEW_H * 0.47, ph = 228;
    return { px, py, pw, ph };
  }
  titleMenuRects(n) {
    const L = this.titleLayout(), w = 380, out = [];
    for (let i = 0; i < n; i++) out.push({ x: L.px + L.pw / 2 - w / 2, y: L.py + L.ph + 14 + i * 38, w, h: 32 });
    return out;
  }
  drawTitleMenu(ctx, t) {
    const items = game.titleItems(), rects = this.titleMenuRects(items.length);
    const save = items[0] === 'continue' ? SaveSys.read() : null;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    items.forEach((it, i) => {
      const r = rects[i], sel = i === game.titleSel, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      let label = it === 'continue' ? 'CONTINUAR' : 'NOVO JOGO';
      if (it === 'continue' && save && save.progress) {
        const room = ROOM_DEFS[clamp(save.room | 0, 0, ROOM_DEFS.length - 1)];
        label += `  ·  NÍVEL ${save.progress.level | 0}  ·  ${room.name.toUpperCase()}`;
      }
      ctx.font = `bold ${sel ? 19 : 16}px ${FONT_TITLE}`;
      ctx.letterSpacing = '3px';
      if (sel) {
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 4);
        const w = ctx.measureText(label).width / 2 + 26;
        ctx.fillStyle = 'rgba(20,50,110,0.45)'; ctx.fillRect(cx - w, r.y + 2, w * 2, r.h - 4);
        glowText(ctx, label, cx, cy, PAL.accentHi, 'rgba(40,120,255,0.9)', 12);
        ctx.fillStyle = PAL.accent;
        ctx.beginPath(); ctx.moveTo(cx - w - 4, cy - 6); ctx.lineTo(cx - w + 6, cy); ctx.lineTo(cx - w - 4, cy + 6); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(201,211,226,0.6)';
        ctx.fillText(label, cx, cy);
      }
    });
    ctx.letterSpacing = '0px';
    if (game.titleConfirm) {
      this.overlay(ctx, 0.75);
      const w = Math.min(560, VIEW_W - 80), h = 150, x = VIEW_W / 2 - w / 2, y = VIEW_H / 2 - h / 2;
      ctx.fillStyle = 'rgba(8,4,12,0.95)';
      techPanelPath(ctx, x, y, w, h, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(255,92,122,0.7)'; ctx.stroke();
      ctx.font = `bold 18px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = '#ff8aa0';
      ctx.fillText('NOVO JOGO', VIEW_W / 2, y + 32);
      ctx.letterSpacing = '0px';
      ctx.font = `15px ${FONT_UI}`; ctx.fillStyle = '#dfe6f2';
      ctx.fillText('Começar de novo apagará o progresso salvo de Kael.', VIEW_W / 2, y + 68);
      ctx.font = `bold 14px ${FONT_UI}`; ctx.fillStyle = PAL.accentHi;
      ctx.fillText('ENTER / J — confirmar        ESC — cancelar', VIEW_W / 2, y + 108);
    }
    ctx.restore();
  }

  // --------------------------------------------------- árvore de habilidades
  skillLayout() {
    const W = Math.min(1180, VIEW_W - 40), x0 = (VIEW_W - W) / 2;
    const tabs = [], tw = W / 4;
    for (let i = 0; i < 4; i++) tabs.push({ x: x0 + i * tw + 4, y: 84, w: tw - 8, h: 48 });
    const gy = 146, gh = 512, gw = Math.round(W * 0.56), gx = x0;
    const ix = x0 + gw + 14, iw = W - gw - 14;
    const nodes = {};
    for (const s of game.treeNodes(game.skillUI.tree)) nodes[s.id] = { x: gx + gw * (0.2 + 0.3 * s.col), y: gy + 54 + s.row * 100, r: 28 };
    const btn = { x: ix + 18, y: gy + gh - 134, w: iw - 36, h: 42 };
    const slots = [];
    for (let k = 0; k < 4; k++) slots.push({ x: ix + 18 + k * 56, y: gy + gh - 64, w: 48, h: 48 });
    const close = { x: x0 + W - 36, y: 20, w: 36, h: 36 };
    return { W, x0, tabs, gx, gy, gw, gh, ix, iw, nodes, btn, slots, close };
  }

  skillShape(ctx, kind, x, y, r) {
    ctx.beginPath();
    if (kind === 'passiva') { ctx.arc(x, y, r, 0, TAU); return; }
    if (kind === 'tecnica') {
      const q = r * 1.15;
      ctx.moveTo(x, y - q); ctx.lineTo(x + q, y); ctx.lineTo(x, y + q); ctx.lineTo(x - q, y); ctx.closePath();
      return;
    }
    const n = kind === 'suprema' ? 8 : 6, rr = r * (kind === 'suprema' ? 1.18 : 1.06), off = Math.PI / n;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + off;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  drawSkills(ctx, t) {
    const pr = game.progress, ui = game.skillUI, L = this.skillLayout();
    const tree = SKILL_TREES[ui.tree], trgb = tree.rgb;
    this.overlay(ctx, 0.88);
    ctx.save();
    ctx.textBaseline = 'middle';
    // Cabeçalho: nível, experiência e pontos
    ctx.textAlign = 'left';
    ctx.font = `bold 24px ${FONT_TITLE}`; ctx.letterSpacing = '5px';
    glowText(ctx, 'EVOLUÇÃO DE KAEL', L.x0, 36, '#eef5ff', 'rgba(40,120,255,0.8)', 14);
    ctx.letterSpacing = '0px';
    const xpk = pr.level >= PROG.maxLevel ? 1 : pr.xp / pr.xpNext;
    ctx.font = `bold 13px ${FONT_TITLE}`; ctx.fillStyle = '#c8b8ff';
    ctx.fillText(`NÍVEL ${pr.level}`, L.x0, 64);
    ctx.fillStyle = 'rgba(3,6,14,0.9)'; ctx.fillRect(L.x0 + 70, 59, 240, 9);
    ctx.fillStyle = '#9b7dff'; ctx.fillRect(L.x0 + 70, 59, 240 * xpk, 9);
    ctx.strokeStyle = 'rgba(185,168,255,0.6)'; ctx.strokeRect(L.x0 + 69.5, 58.5, 241, 10);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(214,225,240,0.75)';
    ctx.fillText(pr.level >= PROG.maxLevel ? 'NÍVEL MÁXIMO' : `${pr.xp} / ${pr.xpNext} XP`, L.x0 + 322, 64);
    ctx.textAlign = 'right';
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(255,220,150,0.85)';
    ctx.fillText('PONTOS DE HABILIDADE', L.x0 + L.W - 104, 36);
    ctx.letterSpacing = '0px';
    ctx.font = `38px ${FONT_NUM}`;
    glowText(ctx, String(pr.sp), L.x0 + L.W - 52, 44, pr.sp > 0 ? '#ffe7a8' : '#7d8799', pr.sp > 0 ? 'rgba(255,180,60,0.9)' : 'rgba(0,0,0,0)', 14);
    // Fechar
    const c = L.close;
    ctx.strokeStyle = 'rgba(214,225,240,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(c.x + 11, c.y + 11); ctx.lineTo(c.x + c.w - 11, c.y + c.h - 11); ctx.moveTo(c.x + c.w - 11, c.y + 11); ctx.lineTo(c.x + 11, c.y + c.h - 11); ctx.stroke();

    // Abas das quatro árvores
    ctx.textAlign = 'center';
    SKILL_TREES.forEach((tr, i) => {
      const r = L.tabs[i], sel = i === ui.tree;
      const nodes = game.treeNodes(i), learned = nodes.filter((s) => pr.lv(s.id) > 0).length;
      const avail = nodes.some((s) => !pr.blocker(s.id));
      ctx.fillStyle = sel ? rgba(tr.rgb, 0.2) : 'rgba(5,10,20,0.85)';
      techPanelPath(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
      ctx.strokeStyle = rgba(tr.rgb, sel ? 0.95 : 0.35); ctx.lineWidth = sel ? 2 : 1; ctx.stroke();
      ctx.font = `bold ${r.w < 200 ? 12 : 14}px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
      ctx.fillStyle = sel ? '#ffffff' : rgba(tr.rgb, 0.85);
      ctx.fillText(tr.name, r.x + r.w / 2, r.y + 17);
      ctx.letterSpacing = '0px';
      ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,210,225,0.7)';
      ctx.fillText(`${tr.sub} · ${learned}/${nodes.length}`, r.x + r.w / 2, r.y + 35);
      if (avail) {
        ctx.fillStyle = '#ffd47a';
        ctx.beginPath(); ctx.arc(r.x + r.w - 12, r.y + 12, 4 + Math.sin(t * 6), 0, TAU); ctx.fill();
      }
    });

    // Grafo da árvore selecionada
    ctx.fillStyle = 'rgba(3,7,16,0.7)';
    techPanelPath(ctx, L.gx, L.gy, L.gw, L.gh, 14); ctx.fill();
    ctx.strokeStyle = rgba(trgb, 0.3); ctx.lineWidth = 1; ctx.stroke();
    const list = game.treeNodes(ui.tree);
    for (const s of list) {
      const n = L.nodes[s.id];
      for (const [rid, rl] of s.req) {
        const m = L.nodes[rid];
        if (!m) continue;
        const ok = pr.lv(rid) >= rl;
        ctx.strokeStyle = ok ? rgba(trgb, 0.85) : 'rgba(110,120,140,0.35)';
        ctx.lineWidth = ok ? 3 : 2;
        ctx.setLineDash(ok ? [] : [6, 6]);
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(n.x, n.y); ctx.stroke();
        if (ok) {
          const k = (t * 0.8 + s.row * 0.2) % 1;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          GlowCache.draw(ctx, trgb, lerp(m.x, n.x, k), lerp(m.y, n.y, k), 10, 0.8);
          ctx.restore();
        }
      }
    }
    ctx.setLineDash([]);
    for (const s of list) {
      const n = L.nodes[s.id], lv = pr.lv(s.id), sel = s.id === ui.sel;
      const can = !pr.blocker(s.id), met = pr.reqMet(s.id);
      const state = lv >= s.max ? 'max' : lv > 0 ? 'learned' : met ? 'open' : 'locked';
      if (sel || can) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        GlowCache.draw(ctx, can ? '255,200,90' : trgb, n.x, n.y, n.r * 2.4, sel ? 0.5 : 0.25 + 0.15 * Math.sin(t * 5));
        ctx.restore();
      }
      this.skillShape(ctx, s.kind, n.x, n.y, n.r);
      if (state === 'locked') ctx.fillStyle = '#070b14';
      else {
        const g = ctx.createRadialGradient(n.x, n.y - n.r * 0.4, 2, n.x, n.y, n.r * 1.2);
        g.addColorStop(0, rgba(trgb, lv > 0 ? 0.55 : 0.18)); g.addColorStop(1, lv > 0 ? 'rgba(6,12,26,0.95)' : 'rgba(5,9,18,0.95)');
        ctx.fillStyle = g;
      }
      ctx.fill();
      ctx.lineWidth = state === 'max' ? 3 : 2;
      ctx.strokeStyle = state === 'locked' ? 'rgba(110,120,140,0.4)' : can ? `rgba(255,212,122,${0.6 + 0.4 * Math.sin(t * 6)})`
        : state === 'max' ? '#ffffff' : rgba(trgb, lv > 0 ? 0.95 : 0.5);
      ctx.stroke();
      if (lv >= 2) { this.skillShape(ctx, s.kind, n.x, n.y, n.r + 5); ctx.lineWidth = 1; ctx.strokeStyle = rgba(trgb, 0.6); ctx.stroke(); }
      drawIcon(ctx, s.icon, n.x, n.y, n.r * 1.15, state === 'locked' ? 'rgba(120,130,150,0.45)' : lv > 0 ? '#f2f7ff' : rgba(trgb, 0.8));
      if (state === 'locked') drawIcon(ctx, 'lock', n.x + n.r * 0.72, n.y + n.r * 0.72, 16, 'rgba(170,180,200,0.8)');
      if (can) {
        ctx.fillStyle = '#ffd47a';
        ctx.beginPath(); ctx.arc(n.x + n.r * 0.8, n.y - n.r * 0.8, 8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1a1200'; ctx.font = `bold 13px ${FONT_UI}`; ctx.textAlign = 'center';
        ctx.fillText('+', n.x + n.r * 0.8, n.y - n.r * 0.8 + 1);
      }
      if (sel) {
        ctx.save();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 20;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 11, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      // Níveis (pontos) e nome
      for (let k = 0; k < s.max; k++) {
        ctx.fillStyle = k < lv ? rgba(trgb, 1) : 'rgba(255,255,255,0.14)';
        ctx.fillRect(n.x - (s.max * 9) / 2 + k * 9 + 1, n.y + n.r + 6, 7, 3);
      }
      ctx.textAlign = 'center';
      ctx.font = `${sel ? 'bold ' : ''}11px ${FONT_UI}`;
      ctx.fillStyle = state === 'locked' ? 'rgba(150,160,180,0.6)' : '#dfe6f2';
      ctx.fillText(s.name, n.x, n.y + n.r + 19);
      if (state === 'locked' && pr.level < s.lvl) {
        ctx.font = `bold 10px ${FONT_UI}`; ctx.fillStyle = 'rgba(255,140,150,0.8)';
        ctx.fillText(`NÍVEL ${s.lvl}`, n.x, n.y + n.r + 32);
      }
    }
    // Confirmação visual do desbloqueio
    if (ui.fx && L.nodes[ui.fx.id]) {
      const n = L.nodes[ui.fx.id], k = ui.fx.t / 0.9;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      GlowCache.draw(ctx, '255,230,160', n.x, n.y, n.r * (2 + k * 3), (1 - k) * 0.9);
      ctx.strokeStyle = rgba('255,240,200', 1 - k); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + k * 70, 0, TAU); ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + k, r = n.r + k * 90;
        GlowCache.draw(ctx, trgb, n.x + Math.cos(a) * r, n.y + Math.sin(a) * r, 8, 1 - k);
      }
      ctx.restore();
    }

    // Painel de informações
    const s = SKILLS[ui.sel], lv = pr.lv(s.id), x = L.ix, w = L.iw;
    ctx.fillStyle = 'rgba(3,7,16,0.85)';
    techPanelPath(ctx, x, L.gy, w, L.gh, 14); ctx.fill();
    ctx.strokeStyle = rgba(trgb, 0.45); ctx.lineWidth = 1; ctx.stroke();
    const KIND = { passiva: 'PASSIVA', tecnica: 'TÉCNICA DE COMBO', ativa: 'HABILIDADE ATIVA', suprema: 'HABILIDADE SUPREMA' };
    ctx.textAlign = 'left';
    let y = L.gy + 26;
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = rgba(trgb, 0.95);
    ctx.fillText(`${KIND[s.kind]} · ${tree.name}`, x + 18, y);
    ctx.letterSpacing = '0px';
    y += 30;
    ctx.font = `bold 24px ${FONT_TITLE}`;
    glowText(ctx, s.name, x + 18, y, '#ffffff', rgba(trgb, 0.8), 10);
    y += 28;
    for (let k = 0; k < s.max; k++) {
      ctx.fillStyle = k < lv ? rgba(trgb, 1) : 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + 18 + k * 22, y - 4, 18, 7);
    }
    ctx.font = `bold 12px ${FONT_UI}`; ctx.fillStyle = '#c9d3e2';
    ctx.fillText(lv >= s.max ? `NÍVEL ${lv} / ${s.max} · MÁXIMO` : `NÍVEL ${lv} / ${s.max}`, x + 26 + s.max * 22, y);
    y += 24;
    if (s.kind === 'ativa' || s.kind === 'suprema') {
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = '#8fc4ff';
      ctx.fillText(s.kind === 'suprema' ? `Custo: ${s.energy} de energia · tecla I` : `Custo: ${s.energy} de energia · Recarga: ${s.cd}s`, x + 18, y);
      y += 22;
    }
    const para = (label, text, col) => {
      ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(168,216,255,0.7)';
      ctx.fillText(label, x + 18, y); ctx.letterSpacing = '0px';
      y += 18;
      ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = col;
      for (const ln of wrapText(ctx, text, w - 36)) { ctx.fillText(ln, x + 18, y); y += 19; }
      y += 8;
    };
    if (lv > 0) para('EFEITO ATUAL', s.desc(lv), '#e6edf8');
    if (lv < s.max) para(lv > 0 ? 'PRÓXIMO NÍVEL' : 'EFEITO', s.desc(lv + 1), lv > 0 ? '#bfe0ff' : '#e6edf8');
    // Requisitos
    const reqs = [[`Nível de Kael ${s.lvl}`, pr.level >= s.lvl]];
    for (const [rid, rl] of s.req) reqs.push([`${SKILLS[rid].name}${rl > 1 ? ` (nível ${rl})` : ''}`, pr.lv(rid) >= rl]);
    let ry = Math.max(y + 4, L.btn.y - 22 - reqs.length * 19);
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(168,216,255,0.7)';
    ctx.fillText('REQUISITOS', x + 18, ry - 2); ctx.letterSpacing = '0px';
    ry += 17;
    ctx.font = `13px ${FONT_UI}`;
    for (const [txt, ok] of reqs) {
      ctx.fillStyle = ok ? '#7dffb0' : '#ff7d8f';
      ctx.fillText(`${ok ? '✓' : '✗'}  ${txt}`, x + 18, ry); ry += 19;
    }
    // Botão de desbloqueio / aprimoramento
    const why = pr.blocker(s.id), b = L.btn;
    ctx.fillStyle = why ? 'rgba(30,34,44,0.9)' : `rgba(255,190,80,${0.2 + 0.08 * Math.sin(t * 5)})`;
    techPanelPath(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
    ctx.strokeStyle = why ? 'rgba(120,130,150,0.5)' : '#ffd47a'; ctx.lineWidth = why ? 1 : 2; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = `bold 14px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
    ctx.fillStyle = why ? 'rgba(180,190,205,0.75)' : '#fff3d6';
    const btxt = why ? why.toUpperCase() : lv > 0 ? `[J] APRIMORAR → NÍVEL ${lv + 1} · 1 PONTO` : '[J] DESBLOQUEAR · 1 PONTO';
    ctx.fillText(btxt, b.x + b.w / 2, b.y + b.h / 2 + 1);
    ctx.letterSpacing = '0px';
    // Atalhos (habilidades ativas)
    ctx.textAlign = 'left';
    if (s.kind === 'ativa') {
      ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = 'rgba(168,216,255,0.7)';
      ctx.fillText(lv > 0 ? 'ATALHO · tecle 1–4 ou clique' : 'ATALHO (após desbloquear)', x + 18, L.slots[0].y - 10);
      ctx.letterSpacing = '0px';
      L.slots.forEach((r, k) => {
        const id = pr.slots[k], mine = id === s.id;
        ctx.fillStyle = mine ? rgba(trgb, 0.3) : 'rgba(5,10,20,0.9)';
        techPanelPath(ctx, r.x, r.y, r.w, r.h, 7); ctx.fill();
        ctx.strokeStyle = mine ? '#ffffff' : 'rgba(120,130,150,0.45)'; ctx.lineWidth = mine ? 2 : 1; ctx.stroke();
        if (id) drawIcon(ctx, SKILLS[id].icon, r.x + r.w / 2, r.y + r.h / 2, 26, mine ? '#ffffff' : 'rgba(170,185,205,0.7)');
        ctx.font = `bold 11px ${FONT_TITLE}`; ctx.fillStyle = '#dfe6f2';
        ctx.fillText(String(k + 1), r.x + 4, r.y + r.h - 8);
      });
    } else {
      ctx.font = `italic 12px ${FONT_UI}`; ctx.fillStyle = 'rgba(190,200,215,0.7)';
      ctx.fillText(s.kind === 'suprema' ? 'Usada com a tecla I quando a energia chega a 100.'
        : s.kind === 'tecnica' ? 'Técnicas entram nos combos da espada automaticamente.' : 'Passivas funcionam automaticamente.', x + 18, L.slots[0].y + 20);
    }
    // Mensagem e ajuda
    ctx.textAlign = 'center';
    if (ui.msgT > 0 && ui.msg) {
      ctx.globalAlpha = clamp(ui.msgT * 2, 0, 1);
      ctx.font = `bold 15px ${FONT_UI}`;
      glowText(ctx, ui.msg, VIEW_W / 2, VIEW_H - 46, rgba(ui.msgRgb || '255,255,255', 1), rgba(ui.msgRgb || '255,255,255', 0.6), 10);
      ctx.globalAlpha = 1;
    }
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,210,225,0.6)';
    ctx.fillText('Setas navegar · Q / E trocar árvore · J / Enter desbloquear · 1–4 atalho · Tab / Esc voltar · mouse', VIEW_W / 2, VIEW_H - 20);
    ctx.restore();
  }

  drawPause(ctx) {
    this.overlay(ctx, 0.78);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 54px ${FONT_TITLE}`;
    ctx.letterSpacing = '10px';
    glowText(ctx, 'PAUSADO', VIEW_W / 2, VIEW_H * 0.18, '#eef5ff', 'rgba(40,120,255,0.9)', 20);
    ctx.letterSpacing = '0px';
    ctx.font = `15px ${FONT_UI}`; ctx.fillStyle = '#c9d3e2';
    ctx.fillText('ESC — continuar      TAB — habilidades      R — reiniciar setor      T — título (progresso salvo)', VIEW_W / 2, VIEW_H * 0.27);
    ctx.fillStyle = PAL.accentHi;
    ctx.fillText(`${ROOM_DEFS[game.waves.roomIndex].sub}   ·   nível ${game.progress.level}   ·   memórias: ${game.stats.memories} / ${MEMORIES.length}`, VIEW_W / 2, VIEW_H * 0.32);
    // Técnicas conhecidas
    const p = game.player, lv = (id) => game.progress.lv(id);
    const list = [['Leve · Leve', 'Golpes da Tempestade Nula'], ['Pesado (segurado)', 'Impacto Carregado']];
    if (lv('corte_duplo')) list.push(['Leve · Leve · Leve', 'Descarga Tríplice']);
    if (lv('lamina_giratoria')) list.push(['Leve · Leve · Pesado', 'Círculo da Ruína']);
    if (lv('pulso_fantasma')) list.push(['Esquiva → Leve', 'Pulso Fantasma']);
    if (lv('corte_vazio')) list.push(['Esquiva → Pesado', 'Corte do Vazio']);
    if (p.combo.unlocked.has('slam')) list.push(['Pesado · Pesado', 'Colapso Magnético']);
    if (p.combo.unlocked.has('uppercut')) list.push(['Leve · Pesado', 'Relâmpago Ascendente']);
    if (lv('eclipse_absoluto')) list.push(['I (100 de energia)', 'Eclipse Absoluto']);
    ctx.font = `bold 14px ${FONT_TITLE}`; ctx.fillStyle = PAL.accent;
    ctx.letterSpacing = '3px';
    ctx.fillText('TÉCNICAS', VIEW_W / 2 - 200, VIEW_H * 0.4);
    ctx.fillText('EVOLUÇÕES', VIEW_W / 2 + 220, VIEW_H * 0.4);
    ctx.letterSpacing = '0px';
    ctx.font = `14px ${FONT_UI}`;
    // Colunas: sequência (alinhada à direita) → nome da técnica (alinhado à esquerda)
    const cx = VIEW_W / 2 - 200;
    list.forEach(([k, n], i) => {
      const y = VIEW_H * 0.45 + i * 24;
      ctx.textAlign = 'right'; ctx.fillStyle = '#c9d3e2'; ctx.fillText(k, cx - 14, y);
      ctx.textAlign = 'center'; ctx.fillStyle = PAL.accent; ctx.fillText('→', cx, y);
      ctx.textAlign = 'left'; ctx.fillStyle = '#7fc0ff'; ctx.fillText(n, cx + 14, y);
    });
    ctx.textAlign = 'center';
    const ups = UPGRADES.filter((u) => game.upgrades.level(u.id) > 0);
    if (!ups.length) { ctx.fillStyle = 'rgba(201,211,226,0.6)'; ctx.fillText('Nenhuma ainda', VIEW_W / 2 + 220, VIEW_H * 0.45); }
    ups.forEach((u, i) => {
      ctx.fillStyle = '#c9d3e2';
      ctx.fillText(`${u.name}${u.max > 1 ? ` (${game.upgrades.level(u.id)}/${u.max})` : ''}`, VIEW_W / 2 + 220, VIEW_H * 0.45 + i * 24);
    });
    ctx.restore();
  }

  // Retângulos dos cartões de evolução (também usados para o mouse)
  cardRects() {
    const n = game.upgradeChoices.length;
    const w = Math.min(260, (VIEW_W - 120) / 3 - 20), h = 330, gap = 28;
    const total = n * w + (n - 1) * gap, x0 = (VIEW_W - total) / 2, y = VIEW_H * 0.24;
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: x0 + i * (w + gap), y, w, h });
    return out;
  }

  drawUpgrade(ctx, t) {
    this.overlay(ctx, 0.82);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold 14px ${FONT_TITLE}`; ctx.fillStyle = PAL.accent;
    ctx.letterSpacing = '4px';
    ctx.fillText(`${ROOM_DEFS[game.waves.roomIndex].name.toUpperCase()} · LIBERADO`, VIEW_W / 2, VIEW_H * 0.09);
    ctx.font = `bold 38px ${FONT_TITLE}`;
    glowText(ctx, 'ESCOLHA UMA EVOLUÇÃO', VIEW_W / 2, VIEW_H * 0.155, '#eef5ff', 'rgba(40,120,255,0.85)', 18);
    ctx.letterSpacing = '0px';
    if (game.lostMemory) {
      ctx.font = `italic 14px ${FONT_UI}`; ctx.fillStyle = '#ff5c7a';
      ctx.fillText('Um fragmento de memória ficou para trás. Ele se perdeu para sempre.', VIEW_W / 2, VIEW_H * 0.205);
    }
    const rects = this.cardRects();
    game.upgradeChoices.forEach((u, i) => {
      const r = rects[i], sel = i === game.upgradeSel;
      const lift = sel ? -10 - Math.sin(t * 4) * 2 : 0;
      const lvl = game.upgrades.level(u.id);
      ctx.save();
      ctx.translate(0, lift);
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, sel ? '#0e2246' : '#0a1426'); g.addColorStop(1, '#03060d');
      ctx.fillStyle = g;
      techPanelPath(ctx, r.x, r.y, r.w, r.h, 16); ctx.fill();
      ctx.lineWidth = sel ? 2.5 : 1.2;
      ctx.strokeStyle = sel ? PAL.accentHi : u.combo ? 'rgba(127,192,255,0.7)' : 'rgba(61,139,255,0.55)';
      if (sel) { ctx.shadowColor = 'rgba(60,140,255,0.9)'; ctx.shadowBlur = 20; }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Ícone com brilho
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      GlowCache.draw(ctx, u.combo ? '120,200,255' : '50,120,255', r.x + r.w / 2, r.y + 70, 60, sel ? 0.55 : 0.3);
      ctx.restore();
      drawIcon(ctx, u.icon, r.x + r.w / 2, r.y + 70, 54, u.combo ? '#d6ecff' : '#7fc0ff');
      ctx.font = `bold 11px ${FONT_UI}`; ctx.fillStyle = u.combo ? PAL.accentHi : PAL.accent;
      ctx.letterSpacing = '2px';
      ctx.fillText(u.combo ? 'NOVA TÉCNICA' : 'EVOLUÇÃO', r.x + r.w / 2, r.y + 124);
      ctx.letterSpacing = '0px';
      ctx.font = `bold 19px ${FONT_TITLE}`; ctx.fillStyle = '#eef5ff';
      wrapText(ctx, u.name, r.w - 30).forEach((ln, k) => ctx.fillText(ln, r.x + r.w / 2, r.y + 150 + k * 22));
      ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = '#b8c5d8';
      wrapText(ctx, u.desc, r.w - 36).forEach((ln, k) => ctx.fillText(ln, r.x + r.w / 2, r.y + 205 + k * 19));
      // Níveis
      if (u.max > 1) {
        for (let k = 0; k < u.max; k++) {
          ctx.fillStyle = k < lvl ? PAL.accent : k === lvl ? PAL.accentHi : 'rgba(255,255,255,0.15)';
          ctx.beginPath(); ctx.arc(r.x + r.w / 2 + (k - (u.max - 1) / 2) * 16, r.y + r.h - 34, 5, 0, TAU); ctx.fill();
        }
      }
      ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = 'rgba(214,225,240,0.55)';
      ctx.fillText(`[${i + 1}]`, r.x + r.w / 2, r.y + r.h - 14);
      ctx.restore();
    });
    // Rodapé: células, rerolagem e reparo
    const fy = VIEW_H * 0.84;
    ctx.font = `bold 16px ${FONT_UI}`;
    ctx.fillStyle = '#cfe6ff';
    ctx.fillText(`Células de energia: ${game.stats.soulsBank}`, VIEW_W / 2, fy);
    ctx.font = `14px ${FONT_UI}`;
    const canR = game.stats.soulsBank >= game.rerollCost, canH = game.stats.soulsBank >= game.healCost && game.player.hp < game.player.maxHp;
    ctx.fillStyle = canR ? '#c9d3e2' : 'rgba(201,211,226,0.35)';
    ctx.fillText(`[R / X] Recalcular opções — ${game.rerollCost} células`, VIEW_W / 2 - 210, fy + 30);
    ctx.fillStyle = canH ? '#c9d3e2' : 'rgba(201,211,226,0.35)';
    ctx.fillText(`[C / Y] Reparar 40% da vida — ${game.healCost} células`, VIEW_W / 2 + 210, fy + 30);
    ctx.fillStyle = 'rgba(214,225,240,0.6)'; ctx.font = `13px ${FONT_UI}`;
    ctx.fillText('← → escolher   ·   J / Enter confirmar   ·   1 2 3 ou clique', VIEW_W / 2, fy + 60);
    ctx.restore();
  }

  drawEnd(ctx, victory, t) {
    this.overlay(ctx, victory ? 0.74 : 0.8);
    this.drawEmbers(ctx, t);
    const s = game.stats, end = game.ending;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (victory) {
      ctx.font = `bold 15px ${FONT_TITLE}`; ctx.fillStyle = PAL.accent;
      ctx.letterSpacing = '6px';
      ctx.fillText(end ? `FINAL ${end.ending}` : 'FIM', VIEW_W / 2, VIEW_H * 0.08);
      ctx.font = `bold 62px ${FONT_TITLE}`;
      ctx.letterSpacing = '8px';
      glowText(ctx, end ? end.title : 'VITÓRIA', VIEW_W / 2, VIEW_H * 0.155, '#eef5ff', 'rgba(40,120,255,0.95)', 30);
    } else {
      ctx.font = `bold 70px ${FONT_TITLE}`;
      ctx.letterSpacing = '8px';
      glowText(ctx, 'SINAL PERDIDO', VIEW_W / 2, VIEW_H * 0.15, '#ff2e55', 'rgba(255,30,70,0.9)', 30);
    }
    ctx.letterSpacing = '0px';
    ctx.font = `italic 18px ${FONT_UI}`; ctx.fillStyle = 'rgba(214,225,240,0.82)';
    ctx.fillText(victory ? 'Kael Veyron escolheu quem desejava ser. O último eclipse chegou ao fim.'
      : `${ROOM_DEFS[game.waves.roomIndex].name}: a Tempestade Nula se apaga. NEXUS recolhe o que resta de você.`, VIEW_W / 2, VIEW_H * 0.245);
    const rows = [
      ['Tempo', formatTime(s.time)],
      ['Inimigos destruídos', s.kills],
      ['Maior combo', `${game.counter.best} hits`],
      ['Pontuação', Math.round(s.score).toLocaleString('pt-BR')],
      ['Células coletadas', s.soulsTotal],
      ['Memórias recuperadas', `${s.memories} / ${MEMORIES.length}`],
      ['Dano causado', Math.round(s.dmgDealt).toLocaleString('pt-BR')],
      ['Dano recebido', Math.round(s.dmgTaken)],
      ['Setores liberados', `${s.roomsCleared} / 6`],
    ];
    const pw = 460, px = VIEW_W / 2 - pw / 2, py = VIEW_H * 0.3;
    ctx.fillStyle = 'rgba(2,6,14,0.8)';
    techPanelPath(ctx, px, py, pw, rows.length * 30 + 24, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(61,139,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = `16px ${FONT_UI}`;
    rows.forEach(([k, v], i) => {
      const y = py + 27 + i * 30;
      ctx.textAlign = 'left'; ctx.fillStyle = '#b8c5d8'; ctx.fillText(k, px + 28, y);
      ctx.textAlign = 'right'; ctx.fillStyle = PAL.accentHi; ctx.fillText(String(v), px + pw - 28, y);
    });
    ctx.textAlign = 'center';
    if (victory) {
      ctx.font = `bold 14px ${FONT_TITLE}`; ctx.fillStyle = PAL.accent;
      ctx.letterSpacing = '3px';
      ctx.fillText('CLASSIFICAÇÃO', px + pw + 100, py + 30);
      ctx.letterSpacing = '0px';
      ctx.font = `bold 96px ${FONT_TITLE}`;
      glowText(ctx, game.rank, px + pw + 100, py + 110, game.rank === 'S' ? '#ffffff' : PAL.accentHi, 'rgba(40,120,255,0.95)', 24);
    }
    if (game.newRecord) {
      ctx.font = `bold 20px ${FONT_TITLE}`;
      glowText(ctx, 'NOVO RECORDE!', VIEW_W / 2, py + rows.length * 30 + 52, PAL.accentHi, 'rgba(60,140,255,0.9)', 14);
    }
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 4);
    ctx.font = `bold 19px ${FONT_TITLE}`;
    ctx.letterSpacing = '2px';
    glowText(ctx, victory ? 'ENTER — novo ciclo (mantém a evolução)      T — título' : 'ENTER — reconectar no último ponto seguro      T — título',
      VIEW_W / 2, VIEW_H * 0.93, '#eef5ff', 'rgba(40,120,255,0.8)', 10);
    ctx.restore();
  }
}

