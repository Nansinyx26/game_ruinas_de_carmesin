'use strict';
// ECLIPSE ZERO · Atributos do personagem: Força, Vitalidade, Resistência, Agilidade, Inteligência e Sorte
// ---------------------------------------------------------------------------
// Cada nível acima do 1 dá ATRIB_POR_NIVEL pontos (o total sai do nível: salvamentos antigos já
// chegam com os pontos dos níveis que tinham). O jogador distribui os pontos na aba ATRIBUTOS da
// mochila (tecla B): soma pendente com + e −, CONFIRMAR grava. Os pontos ficam no progresso de cada
// personagem (Progress/CharacterProgress, campo atrib) e entram no Player.recalc com efeito real:
//   Força        dano dos golpes e quebra de guarda
//   Vitalidade   vida máxima e cura recebida
//   Resistência  defesa (dano recebido menor) e firmeza contra empurrões
//   Agilidade    velocidade, recarga da esquiva e um pouco de crítico
//   Inteligência poder das habilidades, energia máxima e recarga das habilidades
//   Sorte        crítico, raridade e chance do saque e células ganhas
// Acima de ATRIB_LIMIAR pontos num atributo, cada ponto rende a metade (o herói do nível 100 não
// fica com um atributo absurdo: o resto vem do equipamento). REDISTRIBUIR devolve todos os pontos
// (grátis até o nível 9; depois custa células).
// ---------------------------------------------------------------------------
const ATRIB_POR_NIVEL = 3, ATRIB_LIMIAR = 40;
const atribFmt = (v, d = 1) => v.toFixed(d).replace('.', ',');
const ATRIBUTOS = [
  { id: 'forca', nome: 'Força', sigla: 'FOR', rgb: '255,120,90',
    efeito: (e) => `+${atribFmt(1.2 * e)}% de dano · +${atribFmt(0.3 * e)}% de quebra de guarda`,
    aplicar(S, e) { S.dmgMult += 0.012 * e; S.guardBreak += 0.003 * e; } },
  { id: 'vitalidade', nome: 'Vitalidade', sigla: 'VIT', rgb: '255,90,120',
    efeito: (e) => `+${Math.round(7 * e)} de vida máxima · +${atribFmt(0.4 * e)}% de cura recebida`,
    aplicar(S, e) { S.hpBonus += 7 * e; S.healMult += 0.004 * e; } },
  { id: 'resistencia', nome: 'Resistência', sigla: 'RES', rgb: '150,170,200',
    efeito: (e) => `+${atribFmt(0.35 * e)}% de defesa · +${atribFmt(0.4 * e)}% de firmeza`,
    aplicar(S, e) { S.armor += 0.0035 * e; S.kbResist += 0.004 * e; } },
  { id: 'agilidade', nome: 'Agilidade', sigla: 'AGI', rgb: '120,230,150',
    efeito: (e) => `+${atribFmt(0.3 * e)}% de velocidade · esquiva ${atribFmt(100 - 100 / (1 + 0.006 * e))}% mais rápida · +${atribFmt(0.1 * e)}% de crítico`,
    aplicar(S, e) { S.speedMult += 0.003 * e; S.dashCdMult /= 1 + 0.006 * e; S.crit += 0.001 * e; } },
  { id: 'inteligencia', nome: 'Inteligência', sigla: 'INT', rgb: '120,170,255',
    efeito: (e) => `+${atribFmt(1.5 * e)}% de poder das habilidades · +${Math.round(2 * e)} de energia · −${atribFmt(0.2 * e)}% de recarga`,
    aplicar(S, e) { S.power += 0.015 * e; S.energyBonus += 2 * e; S.cdr = Math.max(0.3, S.cdr - 0.002 * e); } },
  { id: 'sorte', nome: 'Sorte', sigla: 'SOR', rgb: '255,210,90',
    efeito: (e) => `+${atribFmt(0.3 * e)}% de crítico · saque ${atribFmt(0.4 * e)}% mais raro e frequente · +${atribFmt(0.5 * e)}% de células`,
    aplicar(S, e) { S.crit += 0.003 * e; S.sorte += e; S.ganhoCelulas += 0.005 * e; } },
];
const ATRIB_POR_ID = {};
for (const A of ATRIBUTOS) ATRIB_POR_ID[A.id] = A;

const Atributos = {
  ui: { sel: 0, pend: {}, rects: [], confirma: false, t: 0 },
  // ------------------------------------------------------------ regras
  ef(n) { return n <= ATRIB_LIMIAR ? n : ATRIB_LIMIAR + (n - ATRIB_LIMIAR) * 0.5; },   // pontos efetivos
  total(pr) { return pr ? ATRIB_POR_NIVEL * Math.max(0, (pr.level | 0) - 1) : 0; },
  valor(pr, id) { return (pr && pr.atrib && pr.atrib[id]) | 0; },
  gastos(pr) { let n = 0; for (const A of ATRIBUTOS) n += this.valor(pr, A.id); return n; },
  livres(pr) { return Math.max(0, this.total(pr) - this.gastos(pr)); },
  pendentes() { let n = 0; for (const k in this.ui.pend) n += this.ui.pend[k]; return n; },
  // Efeito nos atributos de base (Player.recalc)
  aplicar(pr, S) {
    if (!pr || !pr.atrib) return;
    for (const A of ATRIBUTOS) { const n = this.valor(pr, A.id); if (n > 0) A.aplicar(S, this.ef(n)); }
  },
  // Põe n pontos direto (sem a soma pendente); devolve quantos entraram
  distribuir(pr, id, n = 1) {
    if (!pr || !ATRIB_POR_ID[id]) return 0;
    const k = Math.max(0, Math.min(n | 0, this.livres(pr)));
    if (!k) return 0;
    pr.atrib = pr.atrib || {};
    pr.atrib[id] = this.valor(pr, id) + k;
    return k;
  },
  custoRedistribuir(pr) { return !pr || pr.level < 10 ? 0 : 15 * pr.level; },
  redistribuir(pr) {
    if (!pr || !this.gastos(pr)) return false;
    const c = this.custoRedistribuir(pr), st = game.stats;
    if (c > st.soulsBank) return false;
    st.soulsBank -= c;
    pr.atrib = {};
    return true;
  },
  // Para o salvamento: só os atributos com pontos; ao carregar, nada negativo nem acima do total
  limpar(o, nivel) {
    const out = {};
    let soma = 0;
    if (o && typeof o === 'object') for (const A of ATRIBUTOS) { const n = Math.max(0, o[A.id] | 0); if (n) { out[A.id] = n; soma += n; } }
    return soma > ATRIB_POR_NIVEL * Math.max(0, nivel - 1) ? {} : out;   // (nível menor que os pontos: devolve tudo)
  },
  // Bônus de saque e de células da Sorte do herói em campo
  sorteSaque() { const p = game.player; return p && p.stats ? (p.stats.sorte || 0) * 0.004 : 0; },
  chanceSaque(c) { return Math.min(1, c * (1 + this.sorteSaque())); },

  // ------------------------------------------------------------ tela (aba ATRIBUTOS da mochila)
  abrir() { this.ui.pend = {}; this.ui.confirma = false; this.ui.t = 0; },
  heroi() { return game.activeProgress(); },
  mudar(id, d) {
    const pr = this.heroi(), U = this.ui, p = U.pend[id] || 0;
    if (d > 0 && this.pendentes() >= this.livres(pr)) { game.audio.play('uiDeny'); return false; }
    if (d < 0 && p <= 0) { game.audio.play('uiDeny'); return false; }
    U.pend[id] = p + d;
    if (!U.pend[id]) delete U.pend[id];
    game.audio.play('uiMove');
    return true;
  },
  confirmar() {
    const pr = this.heroi(), U = this.ui;
    if (!this.pendentes()) return false;
    for (const id in U.pend) this.distribuir(pr, id, U.pend[id]);
    U.pend = {};
    if (game.player) game.player.recalc(false);
    game.audio.play('atributo');
    if (typeof WorldInv !== 'undefined') WorldInv.aviso('Atributos distribuídos', true);
    if (game.world && typeof World !== 'undefined') World.save();
    return true;
  },
  desfazer() { if (!this.pendentes()) return false; this.ui.pend = {}; game.audio.play('uiMove'); return true; },
  pedirRedistribuir() {
    const pr = this.heroi();
    if (!this.gastos(pr)) { if (typeof WorldInv !== 'undefined') WorldInv.aviso('Nenhum ponto distribuído ainda'); return; }
    const c = this.custoRedistribuir(pr);
    if (c > game.stats.soulsBank) { if (typeof WorldInv !== 'undefined') WorldInv.aviso(`Redistribuir custa ${c} células`); return; }
    this.ui.confirma = true;
  },
  updateUI(dt, inp) {
    const U = this.ui;
    U.t += dt;
    if (U.confirma) {
      if (inp.pressed.confirm) { U.confirma = false; if (this.redistribuir(this.heroi())) { U.pend = {}; if (game.player) game.player.recalc(false); WorldInv.aviso('Pontos devolvidos: distribua de novo', true); World.save(); } }
      else if (inp.pressed.erase || inp.pressed.back) U.confirma = false;
      return;
    }
    const n = ATRIBUTOS.length;
    if (inp.pressed.up) { U.sel = (U.sel - 1 + n) % n; game.audio.play('uiMove'); }
    if (inp.pressed.down) { U.sel = (U.sel + 1) % n; game.audio.play('uiMove'); }
    if (inp.pressed.right) this.mudar(ATRIBUTOS[U.sel].id, 1);
    if (inp.pressed.left) this.mudar(ATRIBUTOS[U.sel].id, -1);
    if (inp.pressed.confirm) this.confirmar();
    if (inp.pressed.erase) this.desfazer();
  },
  clique(r) {
    const U = this.ui;
    if (r.confirmaSim) { U.confirma = false; if (this.redistribuir(this.heroi())) { U.pend = {}; if (game.player) game.player.recalc(false); WorldInv.aviso('Pontos devolvidos: distribua de novo', true); World.save(); } return; }
    if (r.confirmaNao) { U.confirma = false; return; }
    if (U.confirma) return;
    if (r.atrib !== undefined) { U.sel = r.linha; this.mudar(r.atrib, r.d); return; }
    if (r.linha !== undefined) { U.sel = r.linha; game.audio.play('uiMove'); return; }
    if (r.acao === 'confirmar') this.confirmar();
    else if (r.acao === 'desfazer') this.desfazer();
    else if (r.acao === 'redistribuir') this.pedirRedistribuir();
  },
  dica() { return '↑/↓: atributo · ←/→ ou −/+: pontos · Enter: confirmar · Delete: desfazer · Q/E: abas · Esc: fechar'; },
  // Linhas da ficha: os números de verdade do herói em campo (Player.stats depois do recalc)
  ficha(p) {
    const S = p.stats, pct = (v) => `${atribFmt(v * 100).replace('.', ',')}%`;
    return [
      ['Vida máxima', `${p.maxHp}`], ['Energia máxima', `${p.maxEnergy}`],
      ['Dano dos golpes', pct(S.dmgMult)], ['Poder das habilidades', pct(S.power)],
      ['Defesa', pct(S.armor)], ['Crítico', pct(S.crit)],
      ['Velocidade', pct(S.speedMult)], ['Recarga das habilidades', pct(S.cdr)],
      ['Recarga da esquiva', pct(S.dashCdMult)], ['Firmeza', pct(Math.min(0.9, S.kbResist))],
      ['Cura recebida', pct(S.healMult)], ['Sorte no saque', `+${atribFmt((S.sorte || 0) * 0.4)}%`],
    ];
  },
  draw(ctx, Ly, t) {
    const U = this.ui, pr = this.heroi(), p = game.player, W = VIEW_W, H = VIEW_H, R = WorldInv.ui.rects;
    const x0 = 36, top = 88, larg = Math.min(620, Math.max(360, W * 0.52)), fim = H - 52;
    const livres = this.livres(pr) - this.pendentes();
    // cabeçalho: pontos livres
    ctx.save();
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = `bold 13px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = 'rgba(160,200,255,0.9)';
    ctx.fillText('PONTOS LIVRES', x0, top + 10); ctx.letterSpacing = '0px';
    ctx.font = `bold 26px ${FONT_TITLE}`; ctx.fillStyle = livres > 0 ? '#ffe08a' : 'rgba(220,230,245,0.8)';
    ctx.fillText(`${livres}`, x0 + 150, top + 10);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.75)';
    ctx.fillText(`Nível ${pr.level} · ${ATRIB_POR_NIVEL} pontos por nível · ${this.gastos(pr)} distribuídos`, x0 + 190, top + 10);
    // linhas dos atributos
    const n = ATRIBUTOS.length, y0 = top + 34, rh = clamp((fim - y0 - 56) / n, 40, 66);
    ATRIBUTOS.forEach((A, i) => {
      const y = y0 + i * rh, sel = U.sel === i, v = this.valor(pr, A.id), pd = U.pend[A.id] || 0;
      ctx.fillStyle = sel ? `rgba(${A.rgb},0.14)` : 'rgba(14,20,34,0.82)'; ctx.fillRect(x0, y, larg, rh - 6);
      ctx.strokeStyle = sel ? `rgba(${A.rgb},0.9)` : 'rgba(90,120,170,0.35)'; ctx.lineWidth = sel ? 1.6 : 1; ctx.strokeRect(x0 + 0.5, y + 0.5, larg - 1, rh - 7);
      // sigla na cor do atributo
      const s = rh - 16;
      ctx.fillStyle = `rgba(${A.rgb},0.22)`; ctx.fillRect(x0 + 8, y + 5, s, s);
      ctx.strokeStyle = `rgba(${A.rgb},0.9)`; ctx.strokeRect(x0 + 8.5, y + 5.5, s - 1, s - 1);
      ctx.font = `bold ${Math.round(s * 0.34)}px ${FONT_TITLE}`; ctx.textAlign = 'center'; ctx.fillStyle = `rgb(${A.rgb})`;
      ctx.fillText(A.sigla, x0 + 8 + s / 2, y + 5 + s / 2);
      // nome e efeito (o pendente em verde)
      const tx = x0 + 18 + s, bw = 30, xb = x0 + larg - 12 - bw * 2 - 64, lt = xb - tx - 8;
      ctx.textAlign = 'left'; ctx.font = `bold 15px ${FONT_TITLE}`; ctx.fillStyle = '#ffffff';
      ctx.fillText(A.nome.toUpperCase(), tx, y + rh * 0.3);
      const ef = this.ef(v + pd), txt = ef > 0 ? A.efeito(ef) : 'sem pontos ainda';
      let fs = 11;
      ctx.font = `${fs}px ${FONT_UI}`;
      while (fs > 8 && ctx.measureText(txt).width > lt) ctx.font = `${--fs}px ${FONT_UI}`;
      ctx.fillStyle = pd ? 'rgba(150,255,170,0.95)' : 'rgba(200,214,235,0.8)';
      ctx.fillText(txt, tx, y + rh * 0.62);
      // valor e botões − / +
      ctx.textAlign = 'center'; ctx.font = `bold 18px ${FONT_UI}`; ctx.fillStyle = '#ffffff';
      ctx.fillText(`${v}`, xb + 14, y + (rh - 6) / 2);
      if (pd) { ctx.font = `bold 12px ${FONT_UI}`; ctx.fillStyle = '#96ffaa'; ctx.fillText(`+${pd}`, xb + 38, y + (rh - 6) / 2); }
      for (const [d, bx, rot, pode] of [[-1, x0 + larg - 12 - bw * 2 - 6, '−', pd > 0], [1, x0 + larg - 12 - bw, '+', livres > 0]]) {
        const by = y + (rh - 6) / 2 - 14;
        ctx.fillStyle = pode ? `rgba(${A.rgb},0.28)` : 'rgba(30,36,52,0.7)'; ctx.fillRect(bx, by, bw, 28);
        ctx.strokeStyle = pode ? `rgba(${A.rgb},0.95)` : 'rgba(90,110,150,0.4)'; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 27);
        ctx.font = `bold 18px ${FONT_UI}`; ctx.fillStyle = pode ? '#ffffff' : 'rgba(170,180,200,0.5)'; ctx.fillText(rot, bx + bw / 2, by + 14);
        R.push({ atrib: A.id, d, linha: i, x: bx, y: by, w: bw, h: 28 });
      }
      R.push({ linha: i, x: x0, y, w: xb - x0, h: rh - 6 });
    });
    // botões: confirmar, desfazer, redistribuir
    const by = y0 + n * rh + 4, pend = this.pendentes(), c = this.custoRedistribuir(pr);
    const bts = [['confirmar', `CONFIRMAR${pend ? ` (${pend})` : ''}`, pend > 0, '120,230,150'], ['desfazer', 'DESFAZER', pend > 0, '170,190,230'], ['redistribuir', c ? `REDISTRIBUIR · ${c} ◆` : 'REDISTRIBUIR (GRÁTIS)', this.gastos(pr) > 0, '255,170,120']];
    const bw2 = (larg - 16) / 3;
    bts.forEach(([acao, rot, on, rgb], k) => {
      const bx = x0 + k * (bw2 + 8);
      ctx.fillStyle = on ? `rgba(${rgb},0.2)` : 'rgba(24,30,46,0.7)'; ctx.fillRect(bx, by, bw2, 32);
      ctx.strokeStyle = on ? `rgba(${rgb},0.9)` : 'rgba(90,110,150,0.4)'; ctx.strokeRect(bx + 0.5, by + 0.5, bw2 - 1, 31);
      let fs = 12;
      ctx.font = `bold ${fs}px ${FONT_TITLE}`;
      while (fs > 8 && ctx.measureText(rot).width > bw2 - 10) ctx.font = `bold ${--fs}px ${FONT_TITLE}`;
      ctx.textAlign = 'center'; ctx.fillStyle = on ? '#ffffff' : 'rgba(170,180,200,0.55)'; ctx.fillText(rot, bx + bw2 / 2, by + 16);
      R.push({ acao, x: bx, y: by, w: bw2, h: 32 });
    });
    // ficha à direita: os números de verdade do herói
    const fx = x0 + larg + 24, fw = W - fx - 36;
    if (p && fw > 180) {
      ctx.fillStyle = 'rgba(10,16,30,0.85)'; ctx.fillRect(fx, top, fw, fim - top);
      ctx.strokeStyle = 'rgba(110,150,210,0.4)'; ctx.strokeRect(fx + 0.5, top + 0.5, fw - 1, fim - top - 1);
      ctx.textAlign = 'left'; ctx.font = `bold 13px ${FONT_TITLE}`; ctx.letterSpacing = '3px'; ctx.fillStyle = 'rgba(160,200,255,0.9)';
      ctx.fillText('FICHA', fx + 16, top + 22); ctx.letterSpacing = '0px';
      ctx.font = `bold 15px ${FONT_TITLE}`; ctx.fillStyle = '#ffffff';
      ctx.fillText(`${(p.def.name || '').toUpperCase()} · NÍVEL ${pr.level}`, fx + 16, top + 46);
      const L = this.ficha(p), lh = clamp((fim - top - 80) / L.length, 16, 26);
      L.forEach(([k, v], i) => {
        const yy = top + 74 + i * lh;
        ctx.font = `12px ${FONT_UI}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(200,214,235,0.85)'; ctx.fillText(k, fx + 16, yy);
        ctx.font = `bold 13px ${FONT_UI}`; ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.fillText(v, fx + fw - 16, yy);
      });
    }
    // confirmação de redistribuir
    if (U.confirma) {
      const w = 440, h = 120, cx = W / 2 - w / 2, cy = H / 2 - h / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(14,18,32,0.98)'; ctx.fillRect(cx, cy, w, h);
      ctx.strokeStyle = 'rgba(255,170,120,0.85)'; ctx.strokeRect(cx + 0.5, cy + 0.5, w - 1, h - 1);
      ctx.textAlign = 'center'; ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = '#ffffff';
      ctx.fillText(c ? `Devolver os ${this.gastos(pr)} pontos por ${c} células?` : `Devolver os ${this.gastos(pr)} pontos (grátis até o nível 9)?`, W / 2, cy + 36);
      for (const [k, rot] of [[0, 'SIM'], [1, 'NÃO']]) {
        const bx = cx + 60 + k * 180;
        ctx.fillStyle = 'rgba(40,50,80,0.9)'; ctx.fillRect(bx, cy + 66, 140, 34);
        ctx.strokeStyle = 'rgba(160,200,255,0.7)'; ctx.strokeRect(bx + 0.5, cy + 66.5, 139, 33);
        ctx.font = `bold 13px ${FONT_TITLE}`; ctx.fillStyle = '#ffffff'; ctx.fillText(rot, bx + 70, cy + 83);
        R.unshift(k ? { confirmaNao: true, x: bx, y: cy + 66, w: 140, h: 34 } : { confirmaSim: true, x: bx, y: cy + 66, w: 140, h: 34 });   // (antes das linhas de baixo: o clique fica com a caixa)
      }
    }
    ctx.restore();
  },
};
