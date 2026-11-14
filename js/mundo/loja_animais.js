'use strict';
// ECLIPSE ZERO · Aba PETS & MONTARIAS (LojaAnimais), dentro da janela do inventário (js/mundo/inventario.js)
// ---------------------------------------------------------------------------
// Uma aba sempre visível com quatro categorias claras:
//   PETS            os animais de companhia (js/mundo/pets.js)
//   MONTARIAS       cavalos e lobos (Estrebaria da Guarda) e as AVES DE MONTARIA (Viveiro dos Alves)
//   MINHAS MONTARIAS  as desbloqueadas (EQUIPAR / DESEQUIPAR) e as bloqueadas (com o que falta)
//   MEUS PETS       os seus animais (LEVAR / DEIXAR NO VIVEIRO)
// Cada cartão: modelo 3D (foto do próprio modelo da criatura), nome, raridade, preço, descrição,
// velocidade, tipo (terrestre ou ave), nível pedido e o botão: COMPRAR / SALDO INSUFICIENTE / NÍVEL X /
// JÁ É SUA. Comprar só dá na loja certa (aberta pelo vendedor: Tobias na estrebaria, Cora no viveiro);
// fora dela, o cartão diz onde vende. A compra desconta as células, salva no progresso (World.state),
// avisa ("Compra realizada com sucesso!") e a montaria já fica disponível para equipar.
// Realce ao passar o mouse, troca de categoria com animação, sons e o selo NOVO nos que você ainda não viu.
// ---------------------------------------------------------------------------
// Aves de montaria (vendidas no Viveiro dos Alves): as aves do jogo em tamanho de montaria. No chão,
// correm (o planar abre as asas na corrida); não voam com o cavaleiro.
const CLIPES_AVE_MONTARIA = { parado: 'idle', andar: 'andar', trotar: 'andar', correr: 'planar', sentar: 'sentar', dormir: 'dormir', comer: 'comer', brincar: 'brincar', carinho: 'carinho', chamar: 'chamar' };
if (typeof MONTARIAS_TIPOS !== 'undefined') {
  Object.assign(MONTARIAS_TIPOS, {
    ave_arara: { nome: 'Arara-Real de Montaria', modelo: 'papagaio', preco: 3800, nivel: 8, vel: 1.85, escala: 2.1, raridade: 'incomum', loja: 'viveiro', ave: true, sela: 0.62, clipes: CLIPES_AVE_MONTARIA,
      desc: 'Arara das ilhas do sul criada grande no viveiro. Corre de asas abertas e não larga o cavaleiro.' },
    ave_asa_noturna: { nome: 'Asa Noturna Gigante', modelo: 'asa_noturna', preco: 7500, nivel: 20, vel: 2.1, escala: 2.3, raridade: 'épica', loja: 'viveiro', ave: true, sela: 0.6, clipes: CLIPES_AVE_MONTARIA,
      desc: 'A ave das torres de neon em tamanho de montaria. As penas guardam a luz do dia e acendem na corrida noturna.' },
  });
  for (const k in MONTARIAS_TIPOS) if (!MONTARIAS_TIPOS[k].loja) MONTARIAS_TIPOS[k].loja = 'estrebaria';
}
const LOJA_RARIDADE = { comum: '170,180,195', incomum: '110,210,140', rara: '90,160,255', 'exótica': '255,170,80', 'épica': '190,110,255', 'lendária': '255,205,90' };
const LOJA_LUGAR = { estrebaria: 'Estrebaria da Guarda (Tobias)', viveiro: 'Viveiro dos Alves (Cora)' };

const LojaAnimais = {
  ui: { sub: 'montarias', t: 0, trocaT: 1, flash: null, flashT: 0, rol: 0 },
  CATS: [['pets', 'PETS'], ['montarias', 'MONTARIAS'], ['minhas', 'MINHAS MONTARIAS'], ['meuspets', 'MEUS PETS']],
  loja: null,   // 'estrebaria' | 'viveiro' | null (aberta pelo inventário: só ver e equipar)
  fotos: new Map(),
  // Abrir pelo vendedor (a categoria certa já selecionada)
  abrir(loja, sub) {
    this.loja = loja || null;
    WorldInv.abrir('animais');
    this.ui.sub = sub || (loja === 'viveiro' ? 'pets' : 'montarias'); this.ui.trocaT = 0; this.ui.rol = 0;
  },
  vistos() { const W = World.state; if (!W.lojaVistos) W.lojaVistos = []; return W.lojaVistos; },
  // ---------------------------------------------------------------- dados dos cartões
  cartoes() {
    const sub = this.ui.sub, out = [];
    if (sub === 'pets') for (const k in PETS_ESPECIES) { const E = PETS_ESPECIES[k]; if (E.categoria !== 'companhia' && E.categoria) continue; out.push({ tipo: 'pet', id: k, E }); }
    else if (sub === 'montarias') for (const k in MONTARIAS_TIPOS) out.push({ tipo: 'mont', id: k, E: MONTARIAS_TIPOS[k] });
    else if (sub === 'minhas') { const S = Montarias.S(); for (const k in MONTARIAS_TIPOS) out.push({ tipo: 'mont', id: k, E: MONTARIAS_TIPOS[k], minha: S.lista.includes(k) }); out.sort((a, b) => (b.minha ? 1 : 0) - (a.minha ? 1 : 0)); }
    else { const S = Pets.S(); for (const P of S.lista) out.push({ tipo: 'meupet', id: P.especie, E: PETS_ESPECIES[P.especie], P }); }
    return out;
  },
  // estado do botão de um cartão: [rótulo, cor, ação ou null]
  botao(c) {
    const cel = game.stats.soulsBank, lv = game.activeProgress().level;
    if (c.tipo === 'meupet') { const at = Pets.S().ativo === c.P.uid; return at ? ['DEIXAR NO VIVEIRO', '120,140,170', 'guardarPet'] : ['LEVAR COM VOCÊ', '90,160,255', 'chamarPet']; }
    if (c.tipo === 'mont') {
      const S = Montarias.S(), tem = S.lista.includes(c.id);
      if (this.ui.sub === 'minhas') { if (!tem) return [`BLOQUEADA · ${LOJA_LUGAR[c.E.loja].split(' (')[0]}`, '90,96,110', null]; return S.ativa === c.id ? ['DESEQUIPAR', '200,120,120', 'desequipar'] : ['EQUIPAR MONTARIA', '90,200,140', 'equipar']; }
      if (tem) return ['✓ JÁ É SUA', '110,200,150', null];
      if (this.loja !== c.E.loja) return [`À VENDA: ${LOJA_LUGAR[c.E.loja].toUpperCase()}`, '90,110,150', null];
      if (lv < c.E.nivel) return [`NÍVEL ${c.E.nivel} NECESSÁRIO`, '160,120,90', null];
      if (cel < c.E.preco) return ['💰 SALDO INSUFICIENTE', '170,80,80', null];
      return [c.E.ave ? '🐦 COMPRAR MONTARIA' : '🐎 COMPRAR MONTARIA', '230,180,80', 'comprarMont'];
    }
    if (Pets.S().lista.some((P) => P.especie === c.id)) return ['✓ VOCÊ JÁ TEM', '110,200,150', null];
    if (this.loja !== 'viveiro') return ['À VENDA: VIVEIRO DOS ALVES', '90,110,150', null];
    if (cel < c.E.preco) return ['💰 SALDO INSUFICIENTE', '170,80,80', null];
    return ['🐾 COMPRAR PET', '230,180,80', 'comprarPet'];
  },
  executar(acao, c) {
    let msg = '', erro = '';
    if (acao === 'comprarMont') { erro = Montarias.comprar(c.id); if (!erro) msg = `Compra realizada com sucesso! ${c.E.ave ? '🐦' : '🐎'} Montaria desbloqueada: ${c.E.nome}`; }
    else if (acao === 'comprarPet') { erro = Pets.comprar(c.id, (c.E.nomes || [c.E.nome])[0]); if (!erro) msg = `Compra realizada com sucesso! 🐾 ${c.E.nome} agora é seu`; }
    else if (acao === 'equipar') { Montarias.chamar(c.id); World.save(); msg = `${c.E.nome} equipada: [E] perto dela para montar`; }
    else if (acao === 'desequipar') { Montarias.guardar(); msg = `${c.E.nome} voltou para o cercado`; }
    else if (acao === 'chamarPet') { Pets.chamar(c.P.uid); World.save(); msg = `${c.P.nome} vai com você`; }
    else if (acao === 'guardarPet') { Pets.guardar(); msg = `${c.P.nome} ficou no viveiro`; }
    if (erro) { WorldInv.aviso(erro); game.audio.play('uiDeny'); return false; }
    WorldInv.aviso(msg, true);
    game.audio.play(acao.startsWith('comprar') ? 'compra' : 'uiSelect');
    this.ui.flash = c.id; this.ui.flashT = 1;
    if (game.hud && game.hud.toast && acao.startsWith('comprar')) game.hud.toast(msg, '255,212,122');
    return true;
  },
  // ---------------------------------------------------------------- entrada
  updateUI(dt, inp) {
    const U = this.ui;
    U.t += dt; U.trocaT = Math.min(1, U.trocaT + dt * 4); if (U.flashT > 0) U.flashT -= dt * 1.5;
    if (inp.pressed.left || inp.pressed.right) {
      const L = this.cartoes(); WorldInv.ui.sel = clamp(WorldInv.ui.sel + (inp.pressed.right ? 1 : -1), 0, Math.max(0, L.length - 1)); game.audio.play('uiMove');
    }
    if (inp.pressed.up || inp.pressed.down) {
      const i = this.CATS.findIndex((c) => c[0] === U.sub), n = this.CATS.length;
      this.trocar(this.CATS[(i + (inp.pressed.down ? 1 : n - 1)) % n][0]);
    }
    if (inp.pressed.confirm) { const c = this.cartoes()[WorldInv.ui.sel], b = c && this.botao(c); if (b && b[2]) this.executar(b[2], c); else if (c) game.audio.play('uiDeny'); }
  },
  trocar(sub) { if (sub === this.ui.sub) return; this.ui.sub = sub; this.ui.trocaT = 0; this.ui.rol = 0; WorldInv.ui.sel = 0; game.audio.play('uiMove'); },
  clique(r) {
    if (r.sub) { this.trocar(r.sub); return; }
    const L = this.cartoes();
    if (r.acao) { const c = L[r.card]; if (c) this.executar(r.acao, c); return; }
    if (r.card !== undefined) { WorldInv.ui.sel = r.card; game.audio.play('uiMove'); return; }
    if (r.rolar) { this.ui.rol = clamp(this.ui.rol + r.rolar, 0, Math.max(0, L.length - 1)); game.audio.play('uiMove'); }
  },
  dica() { return '↑/↓: categoria · ←/→: escolher · Enter: comprar / equipar · Q/E: abas · Esc: fechar'; },
  // ---------------------------------------------------------------- foto 3D do modelo
  foto(modelo, escala) {
    const k = modelo, agora = performance.now(), F = this.fotos.get(k);
    // (refeita algumas vezes nos primeiros segundos: a textura da pelagem chega depois da malha)
    if (F && (F.n >= 4 || agora - F.t < 1500)) return F.c;
    if (typeof Criaturas3D === 'undefined' || !R3D.active) return null;
    if (!Criaturas3D.pronto(modelo)) { Criaturas3D.carregar(modelo); return null; }
    const m = game.model3('cri_' + modelo); if (!m) return null;
    const o = { yaw: 2.3, scale: 1, lift: 0, roll: 0, pitch: 0, flash: 0, emi: 1, holo: false, ghost: null, tint: null };
    try {
      const f = R3D.foto(m, o, 3.2);
      if (!f || !f.canvas) return null;
      const c = document.createElement('canvas'); c.width = f.canvas.width; c.height = f.canvas.height; c.getContext('2d').drawImage(f.canvas, 0, 0);
      this.fotos.set(k, { c, t: agora, n: (F ? F.n : 0) + 1 });
      return c;
    } catch (e) { this.fotos.set(k, { c: null, t: agora, n: 9 }); return null; }
  },
  // ---------------------------------------------------------------- desenho
  draw(ctx, Ly, t) {
    const U = this.ui, WU = WorldInv.ui, x0 = Ly.lx, top = Ly.top, W = VIEW_W - 36 - x0, fundo = Ly.det + 124, mouse = game.input && game.input.mouse;
    const sobre = (r) => mouse && mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h;
    const caixa = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
    const corta = (s, w) => { if (ctx.measureText(s).width <= w) return s; while (s.length > 3 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; };
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    // categorias (botões grandes, sempre à vista)
    let x = x0;
    const ICONE = { pets: '🐾', montarias: '🐎', minhas: '★', meuspets: '♥' };
    for (const [id, nome] of this.CATS) {
      ctx.font = `bold 13px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
      const n = id === 'minhas' ? Montarias.S().lista.length : id === 'meuspets' ? Pets.S().lista.length : null;
      const txt = `${ICONE[id]}  ${nome}${n !== null ? `  ${n}` : ''}`, w = ctx.measureText(txt).width + 32, on = U.sub === id, r = { sub: id, x, y: top - 34, w, h: 34 }, hv = sobre(r);
      caixa(x, top - 34, w, 34, 7); ctx.fillStyle = on ? 'rgba(255,205,120,0.22)' : hv ? 'rgba(60,90,150,0.5)' : 'rgba(16,24,42,0.85)'; ctx.fill();
      ctx.strokeStyle = on ? 'rgba(255,212,122,0.95)' : hv ? 'rgba(170,210,255,0.7)' : 'rgba(90,120,170,0.4)'; ctx.lineWidth = on ? 1.6 : 1; ctx.stroke();
      ctx.fillStyle = on ? '#ffe6b0' : '#d8e4f6'; ctx.fillText(txt, x + 16, top - 16.5); ctx.letterSpacing = '0px';
      WU.rects.push(r);
      x += w + 10;
    }
    // onde você está (o que dá para comprar aqui)
    ctx.textAlign = 'right'; ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(190,205,228,0.8)';
    ctx.fillText(this.loja ? `Comprando em: ${LOJA_LUGAR[this.loja]}` : 'Para comprar, fale com o Tobias (montarias) ou a Cora (pets e aves)', VIEW_W - 36, top - 16.5);
    ctx.textAlign = 'left';
    // cartões (com a animação de entrada da categoria)
    const L = this.cartoes(), k = U.trocaT, ease = 1 - Math.pow(1 - k, 3);
    if (!L.length) {
      ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = 'rgba(180,195,220,0.8)';
      ctx.fillText(U.sub === 'meuspets' ? 'Você ainda não tem pets. A Cora vende no Viveiro dos Alves.' : 'Nada aqui ainda.', x0, top + 30);
      return;
    }
    const cw = 232, ch = fundo - top - 14, gap = 14, vis = Math.max(1, Math.floor((W + gap) / (cw + gap)));
    WU.sel = clamp(WU.sel, 0, L.length - 1);
    if (WU.sel < U.rol) U.rol = WU.sel; if (WU.sel >= U.rol + vis) U.rol = WU.sel - vis + 1;
    const vistos = this.vistos();
    ctx.save(); ctx.globalAlpha = ease;
    L.slice(U.rol, U.rol + vis).forEach((c, j) => {
      const i = U.rol + j, cx = x0 + j * (cw + gap), cy = top + 8 + (1 - ease) * 26, on = i === WU.sel, R = { card: i, x: cx, y: cy, w: cw, h: ch }, hv = sobre(R);
      const rar = LOJA_RARIDADE[c.E.raridade] || '170,180,195', b = this.botao(c), novo = !vistos.includes(c.id) && U.sub !== 'minhas' && U.sub !== 'meuspets';
      const bloq = U.sub === 'minhas' && !c.minha, fl = U.flash === c.id && U.flashT > 0 ? U.flashT : 0;
      // moldura
      caixa(cx, cy - (hv ? 3 : 0), cw, ch, 10);
      const g = ctx.createLinearGradient(0, cy, 0, cy + ch); g.addColorStop(0, rgba(rar, bloq ? 0.06 : 0.18)); g.addColorStop(0.45, 'rgba(12,18,34,0.94)'); g.addColorStop(1, 'rgba(8,12,24,0.96)');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = fl ? rgba('255,230,150', 0.5 + fl * 0.5) : on ? 'rgba(255,255,255,0.92)' : hv ? rgba(rar, 0.95) : rgba(rar, 0.45); ctx.lineWidth = on || hv || fl ? 2 : 1; ctx.stroke();
      if (hv || on) { ctx.save(); ctx.shadowColor = rgba(rar, 0.7); ctx.shadowBlur = 16; ctx.stroke(); ctx.restore(); }
      WU.rects.push(R);
      const yy = cy - (hv ? 3 : 0);
      // modelo 3D
      const img = this.foto(c.E.modelo, c.E.escala);
      const ph = 150;
      ctx.save(); caixa(cx + 10, yy + 10, cw - 20, ph, 8); ctx.clip();
      const gg = ctx.createRadialGradient(cx + cw / 2, yy + 10 + ph * 0.75, 4, cx + cw / 2, yy + 10 + ph * 0.6, cw * 0.6); gg.addColorStop(0, rgba(rar, 0.28)); gg.addColorStop(1, 'rgba(4,8,16,0.9)');
      ctx.fillStyle = gg; ctx.fillRect(cx + 10, yy + 10, cw - 20, ph);
      if (img) { const s = Math.min((cw - 30) / img.width, (ph - 14) / img.height); ctx.globalAlpha = bloq ? 0.35 : 1; ctx.drawImage(img, cx + cw / 2 - img.width * s / 2, yy + 10 + ph - 6 - img.height * s, img.width * s, img.height * s); ctx.globalAlpha = 1; }
      else { ctx.font = `40px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(200,215,240,0.4)'; ctx.fillText(c.E.ave || c.E.voa ? '🐦' : c.tipo === 'mont' ? '🐎' : '🐾', cx + cw / 2, yy + 10 + ph / 2); ctx.textAlign = 'left'; }
      if (bloq) { ctx.font = `30px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,225,235,0.8)'; ctx.fillText('🔒', cx + cw / 2, yy + 10 + ph / 2); ctx.textAlign = 'left'; }
      ctx.restore();
      // selos: raridade, NOVO, equipada
      const selo = (txt, sx, rgb, cheio) => { ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px'; const w = ctx.measureText(txt).width + 14; caixa(sx, yy + 16, w, 18, 4); ctx.fillStyle = rgba(rgb, cheio ? 0.92 : 0.22); ctx.fill(); ctx.strokeStyle = rgba(rgb, 0.9); ctx.stroke(); ctx.fillStyle = cheio ? '#0c1220' : rgba(rgb, 1); ctx.fillText(txt, sx + 7, yy + 25.5); ctx.letterSpacing = '0px'; return w; };
      selo(String(c.E.raridade || 'comum').toUpperCase(), cx + 16, rar, true);
      if (novo) selo('NOVO', cx + cw - 16 - 44, '120,230,170', false);
      if (c.tipo === 'mont' && Montarias.S().ativa === c.id) selo('EQUIPADA', cx + cw - 16 - 76, '255,212,122', false);
      // nome, tipo, descrição e atributos
      let ty = yy + ph + 30;
      ctx.font = `bold 15px ${FONT_UI}`; ctx.fillStyle = bloq ? 'rgba(190,198,212,0.7)' : '#ffffff'; ctx.fillText(corta(c.P ? `${c.P.nome} · ${c.E.nome}` : c.E.nome, cw - 24), cx + 12, ty); ty += 20;
      ctx.font = `11.5px ${FONT_UI}`; ctx.fillStyle = 'rgba(185,200,225,0.85)';
      const tipoTxt = c.tipo === 'mont' ? (c.E.ave ? 'Montaria · ave (corre de asas abertas)' : 'Montaria · terrestre') : `Pet · ${c.E.voa ? 'ave' : 'companhia'}`;
      ctx.fillText(corta(tipoTxt, cw - 24), cx + 12, ty); ty += 18;
      ctx.font = `11.5px ${FONT_UI}`; ctx.fillStyle = 'rgba(215,225,240,0.82)';
      let cur = '', lin = 0;
      for (const p of String(c.E.desc || '').split(' ')) { const tt = cur ? `${cur} ${p}` : p; if (ctx.measureText(tt).width > cw - 24) { if (lin < 3) ctx.fillText(cur, cx + 12, ty + lin * 15); lin++; cur = p; } else cur = tt; }
      if (cur && lin < 3) ctx.fillText(lin === 3 ? corta(cur, cw - 24) : cur, cx + 12, ty + lin * 15);
      ty += 3 * 15 + 8;
      // atributos em linhas
      const at = (rot, val) => { ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,178,205,0.85)'; ctx.fillText(rot, cx + 12, ty); ctx.textAlign = 'right'; ctx.font = `bold 12px ${FONT_UI}`; ctx.fillStyle = '#e6eefb'; ctx.fillText(val, cx + cw - 12, ty); ctx.textAlign = 'left'; ty += 17; };
      if (c.tipo === 'mont') { at('Velocidade', `×${c.E.vel.toFixed(2)}`); at('Nível necessário', String(c.E.nivel)); }
      if (c.tipo !== 'meupet') at('Preço', `◆ ${c.E.preco} células`);
      else at('Afinidade', `${Math.round(c.P.afinidade || 0)}%`);
      // botão
      const by = cy + ch - 46, br = { acao: b[2], card: i, x: cx + 12, y: by, w: cw - 24, h: 34 }, bh = b[2] && sobre(br);
      caixa(br.x, by, br.w, 34, 7); ctx.fillStyle = rgba(b[1], b[2] ? (bh ? 0.95 : 0.75) : 0.25); ctx.fill(); ctx.strokeStyle = rgba(b[1], b[2] ? 1 : 0.5); ctx.lineWidth = 1; ctx.stroke();
      ctx.font = `bold ${b[0].length > 26 ? 10 : 12}px ${FONT_TITLE}`; ctx.letterSpacing = '1px'; ctx.textAlign = 'center'; ctx.fillStyle = b[2] ? '#0d1220' : 'rgba(225,232,245,0.85)';
      ctx.fillText(corta(b[0], cw - 34), cx + cw / 2, by + 17.5); ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
      if (b[2]) WU.rects.push(br);
      if (on && novo && U.t > 0.8) vistos.push(c.id);   // (o selo NOVO some depois de visto)
    });
    ctx.restore();
    // setas de rolagem
    if (L.length > vis) {
      ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,215,240,0.8)'; ctx.textAlign = 'center';
      ctx.fillText(`${U.rol + 1}–${Math.min(L.length, U.rol + vis)} de ${L.length}   ←/→`, x0 + W / 2, fundo + 4); ctx.textAlign = 'left';
      if (U.rol > 0) WU.rects.push({ rolar: -1, x: x0 - 30, y: top + 100, w: 28, h: 60 });
      if (U.rol + vis < L.length) WU.rects.push({ rolar: 1, x: x0 + W + 2, y: top + 100, w: 28, h: 60 });
    }
  },
};
if (typeof window !== 'undefined') window.LojaAnimais = LojaAnimais;
