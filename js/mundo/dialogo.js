'use strict';
// ECLIPSE ZERO · Mundo aberto: caixa de diálogo com respostas (Dialogo)
// ---------------------------------------------------------------------------
// Conversa com os moradores do mundo aberto: um painel na parte de baixo da tela com o retrato
// (o próprio modelo do NPC, ampliado), o nome e a função, a fala (aparece aos poucos, na
// velocidade do texto das configurações; Enter mostra tudo) e as respostas do jogador.
// Setas, analógico e Enter, as teclas 1 a 9, o mouse ou o toque escolhem; Esc encerra. O jogo
// fica parado enquanto conversam (estado 'worlddlg'), como na mochila. As falas usam a voz
// sintetizada quando ela está ligada (js/voz.js).
// Quem monta a conversa é Povo.conversar (js/mundo/povo.js). Cada opção é
// { id, txt, fn, tag, off }: 'tag' é o marcador colorido (! missão nova, ? entregar, $ loja,
// ✚ serviço, … rumor) e 'off' desativa a opção mostrando o motivo.
// ---------------------------------------------------------------------------
const DIALOGO_TAGS = { '!': '#ffd47a', '?': '#7dffb0', '$': '#9fd0ff', '✚': '#8dffc0', '…': '#c9b8ff', '◆': '#ffd47a', '★': '#ffb860', '⚔': '#ff8a9a' };

const Dialogo = {
  aberto: false, npc: null, quem: '', papel: '', rgb: '255,212,122',
  texto: '', vis: 0, opcoes: [], sel: 0, rects: [], t: 0, linhas: null, linhasDe: '',

  // Abre a conversa (o NPC fica virado para o herói enquanto ela durar)
  abrir(npc, texto, opcoes, papel) {
    this.aberto = true; this.npc = npc; this.quem = npc ? npc.name : ''; this.papel = papel || (npc && npc.papel) || '';
    this.rgb = (npc && (npc.corDialogo || npc.lightRgb)) || '255,212,122';
    if (npc) npc.talkT = 1e9;
    game.state = 'worlddlg';
    game.audio.play('uiMove');
    this.mostrar(texto, opcoes);
  },
  // Troca a fala e as respostas
  mostrar(texto, opcoes) {
    this.texto = String(texto || ''); this.vis = 0; this.t = 0;
    this.opcoes = opcoes && opcoes.length ? opcoes : [{ id: 'sair', txt: 'Até logo.', fn: () => this.fechar() }];
    this.sel = Math.max(0, this.opcoes.findIndex((o) => !o.off));
    if (this.texto) VozSintetica.falar(this.quem, this.texto);
  },
  fechar() {
    if (!this.aberto) return;
    this.aberto = false;
    if (this.npc) this.npc.talkT = 1.5;
    this.npc = null;
    VozSintetica.parar();
    if (game.state === 'worlddlg') game.state = 'playing';
    World.save();
  },
  escolher(i) {
    const o = this.opcoes[i];
    if (!o) return;
    if (o.off) { game.audio.play('uiDeny'); return; }
    game.audio.play('uiSelect');
    o.fn();
  },
  // Escolhe a opção pelo id (atalhos e testes); devolve se ela existia
  escolherId(id) { const i = this.opcoes.findIndex((o) => o.id === id); if (i >= 0) this.escolher(i); return i >= 0; },
  temId(id) { return this.opcoes.some((o) => o.id === id); },

  update(dt, inp) {
    this.t += dt;
    const completo = this.vis >= this.texto.length;
    this.vis = Math.min(this.texto.length, this.vis + dt * 60 * Settings.textRate());
    if (inp.pressed.back || inp.pressed.pause) { this.fechar(); return; }
    // o primeiro toque com a fala ainda aparecendo mostra a fala inteira
    if (!completo && this.t > 0.08 && (inp.pressed.confirm || inp.pressed.interact)) { this.vis = this.texto.length; return; }
    const n = this.opcoes.length;
    const mv = (d) => {
      let s = this.sel;
      for (let k = 0; k < n; k++) { s = (s + d + n) % n; if (!this.opcoes[s].off) break; }
      if (s !== this.sel) { this.sel = s; game.audio.play('uiMove'); }
    };
    if (inp.pressed.up) mv(-1);
    if (inp.pressed.down) mv(1);
    for (let k = 0; k < Math.min(9, n); k++) if (inp.keyPressed.has('Digit' + (k + 1)) || inp.keyPressed.has('Numpad' + (k + 1))) { this.escolher(k); return; }
    const m = inp.mouse;
    if (m.moved || m.clicked) {
      for (const r of this.rects) {
        if (m.x < r.x || m.x > r.x + r.w || m.y < r.y || m.y > r.y + r.h) continue;
        if (m.clicked) { if (!completo) this.vis = this.texto.length; else this.escolher(r.i); return; }
        if (r.i !== this.sel && !this.opcoes[r.i].off) this.sel = r.i;
      }
      if (m.clicked && !completo) { this.vis = this.texto.length; return; }
    }
    if (this.t > 0.08 && (inp.pressed.confirm || inp.pressed.interact)) this.escolher(this.sel);
  },

  // Quebra a fala em linhas que cabem na largura (guardado até a fala mudar)
  quebrar(ctx, w) {
    const key = `${w}|${this.texto}`;
    if (this.linhasDe === key) return this.linhas;
    const out = [];
    for (const par of this.texto.split('\n')) {
      let cur = '';
      for (const p of par.split(' ')) {
        const tt = cur ? `${cur} ${p}` : p;
        if (cur && ctx.measureText(tt).width > w) { out.push(cur); cur = p; } else cur = tt;
      }
      out.push(cur);
    }
    this.linhas = out; this.linhasDe = key;
    return out;
  },
  draw(ctx, t) {
    const n = this.npc, rgb = this.rgb;
    ctx.save();
    ctx.fillStyle = 'rgba(2,5,12,0.42)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const W = Math.min(VIEW_W - 32, 1000), x0 = (VIEW_W - W) / 2, pw = Math.min(150, W * 0.2), tx = x0 + pw + 30, tw = W - pw - 50;
    ctx.font = `15px ${FONT_UI}`;
    const L = this.quebrar(ctx, tw), lh = 21, oh = 27;
    const no = this.opcoes.length, H = Math.min(VIEW_H - 40, 64 + L.length * lh + 14 + no * oh + 16), y0 = VIEW_H - 16 - H;
    // painel
    ctx.fillStyle = 'rgba(4,8,18,0.94)';
    techPanelPath(ctx, x0, y0, W, H, 10); ctx.fill();
    ctx.strokeStyle = rgba(rgb, 0.75); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = rgba(rgb, 0.9); ctx.fillRect(x0 + 10, y0, 70, 2);
    // retrato: o modelo do NPC ampliado (sem WebGL, a figura 2D; objetos: um emblema)
    const px = x0 + 14, py = y0 + 14, ph = Math.min(H - 28, 176);
    const g = ctx.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, rgba(rgb, 0.22)); g.addColorStop(1, 'rgba(6,10,20,0.9)');
    ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
    ctx.save();
    ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    this.desenharRetrato(ctx, n, px, py, pw, ph, t);
    ctx.restore();
    ctx.strokeStyle = rgba(rgb, 0.5); ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
    // nome, função e fala
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 17px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = rgba(rgb, 1);
    ctx.fillText(this.quem, tx, y0 + 26);
    const nw = ctx.measureText(this.quem).width;
    ctx.letterSpacing = '0px';
    if (this.papel) { ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.75)'; ctx.fillText(`· ${this.papel}`, tx + nw + 12, y0 + 27); }
    ctx.font = `15px ${FONT_UI}`; ctx.fillStyle = '#eef3fa';
    let resto = Math.floor(this.vis);
    L.forEach((ln, i) => {
      if (resto <= 0) return;
      ctx.fillText(ln.slice(0, resto), tx, y0 + 56 + i * lh);
      resto -= ln.length + 1;
    });
    // respostas
    this.rects = [];
    const oy = y0 + 56 + L.length * lh + 14, completo = this.vis >= this.texto.length;
    ctx.globalAlpha = completo ? 1 : 0.45;
    this.opcoes.forEach((o, i) => {
      const y = oy + i * oh, sel = i === this.sel && completo;
      if (y + oh > y0 + H) return;
      if (sel) { ctx.fillStyle = rgba(rgb, 0.16); ctx.fillRect(tx - 8, y - 2, tw + 8, oh - 4); ctx.fillStyle = rgba(rgb, 0.95); ctx.fillRect(tx - 8, y - 2, 3, oh - 4); }
      this.rects.push({ i, x: tx - 8, y: y - 2, w: tw + 8, h: oh - 4 });
      ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,180,210,0.7)'; ctx.fillText(`${i + 1}.`, tx, y + oh / 2 - 2);
      let x = tx + 22;
      if (o.tag) { ctx.fillStyle = DIALOGO_TAGS[o.tag] || '#ffd47a'; ctx.fillText(o.tag, x, y + oh / 2 - 2); x += ctx.measureText(o.tag).width + 8; }
      ctx.font = `${sel ? 'bold ' : ''}14px ${FONT_UI}`; ctx.fillStyle = o.off ? 'rgba(160,175,200,0.5)' : sel ? '#ffffff' : 'rgba(225,235,248,0.92)';
      ctx.fillText(o.txt, x, y + oh / 2 - 2);
      if (o.off && typeof o.off === 'string') { const w2 = ctx.measureText(o.txt).width; ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(255,150,160,0.75)'; ctx.fillText(`(${o.off})`, x + w2 + 10, y + oh / 2 - 2); }
    });
    ctx.globalAlpha = 1;
    // dica
    ctx.font = `11px ${FONT_UI}`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(200,214,235,0.55)';
    ctx.fillText(game.input.lastDevice === 'pad' ? `${game.input.padLabels.a}: escolher · ${game.input.padLabels.b}: sair` : '↑/↓ e Enter, 1–9 ou clique · Esc: sair', x0 + W - 16, y0 + 18);
    ctx.restore();
  },
  desenharRetrato(ctx, n, px, py, pw, ph, t) {
    if (!n) return;
    const cx = px + pw / 2;
    if (!n.kind && game.use3D && n.spr && n.spr.ok) {
      const hd = n.spr.anchors && n.spr.anchors.head, k = 3.3;   // cabeça e tronco
      ctx.translate(cx, py + ph * 0.3);
      ctx.scale(k, k);
      R3D.blit(ctx, n.spr, -(hd ? hd.x : 0), -(hd ? hd.y : -n.height));
      return;
    }
    if (!n.kind && n.draw2D) {
      ctx.translate(cx, py + ph * 0.3);
      ctx.scale(3.4, 3.4);
      n.draw2D(ctx, 0, n.height * 0.9);
      return;
    }
    // objeto (quadro de contratos, sinal): emblema aceso
    const rgb = this.rgb, k = 0.75 + 0.25 * Math.sin(t * 3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, rgb, cx, py + ph / 2, pw * 0.45, 0.5 * k);
    ctx.restore();
    ctx.font = `bold ${Math.round(pw * 0.36)}px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(rgb, 1); ctx.fillText(n.emblema || '◆', cx, py + ph / 2);
  },
};
