'use strict';
// ECLIPSE ZERO · Mundo aberto: o clima no chão, no corpo, nas pessoas e no som (Clima)
// ---------------------------------------------------------------------------
// O CÉU (qual clima, intensidade e a troca gradual) é do WorldTime (js/mundo/tempo.js); daqui
// sai o que o clima FAZ:
// - CHÃO: poças que crescem com a chuva e secam com o sol (com ondinhas e respingos), neve que
//   acumula e derrete pela temperatura, pegadas na neve, na areia e na lama, bancos de neblina que
//   andam com o vento, o ar tremendo no calor e fogueiras (a Fogueira Portátil da alquimia).
// - CORPO DO HERÓI: a sensação térmica vem da temperatura da região (dia e noite, bioma, clima),
//   do vento, da roupa molhada, das peças vestidas (isolamento, impermeabilidade, vento, reflexo
//   do calor: Arsenal.protecao), do esforço, do fogo por perto, do chá e do refresco e do abrigo
//   (interiores, toldos da cidade, copas das árvores). A temperatura do corpo anda devagar até o
//   alvo e dá os estados CONFORTÁVEL → … → HIPOTERMIA / INSOLAÇÃO, com efeitos graduais de verdade
//   (velocidade, dano, recuperação de energia e, no extremo, vida). A roupa molha, seca, junta neve
//   e congela (o shader escurece e dá brilho no molhado, põe neve nos ombros e geada nas bordas).
// - PESSOAS: moradores vão para o abrigo na chuva forte, na nevasca e na areia (e voltam depois),
//   se molham, soltam vapor no frio e comentam o tempo e o estado do herói na conversa.
// - SOM: chuva e vento sintetizados (abafados debaixo do teto), passos na neve, respiração no frio,
//   trovão atrasado depois do clarão, eco nos interiores e tudo abafado na neblina densa.
// Configurações → Vídeo → Efeitos de clima: só a quantidade do que se desenha muda (o efeito no
// jogo é o mesmo em qualquer qualidade).
// ---------------------------------------------------------------------------
// Temperatura do ar de cada região (°C): [de dia, de noite]
const CLIMA_REGIAO = { carmesin: [22, 13], velmora: [20, 10], lagoa: [19, 10], nexus: [16, 7], seraph: [41, 4], asterion: [-6, -18], obsidiano: [40, 28] };
// Ajuste de cada clima (na intensidade cheia) e do bioma da zona
const CLIMA_AJUSTE = { chuva: -3, tempestade: -6, neve: -3, nevasca: -9, areia: 3, cinzas: 2, brasas: 3, neblina: -2, calor: 9 };
const CLIMA_BIOMA = { neve: -3, vulcao: 5, deserto: 1 };
// Estados do corpo (do mais frio ao mais quente): efeitos em Clima.apply e Clima.update
const CLIMA_NIVEIS = {
  '-4': { nome: 'HIPOTERMIA', rgb: '150,190,255', vel: -0.2, dano: -0.15, regen: 0.5, drena: 0.012 },
  '-3': { nome: 'CONGELANDO', rgb: '150,200,255', vel: -0.12, dano: -0.08, regen: 0.7 },
  '-2': { nome: 'COM FRIO', rgb: '170,215,255', vel: -0.05, regen: 0.85 },
  '-1': { nome: 'FRESCO', rgb: '190,225,255' },
  0: { nome: 'CONFORTÁVEL', rgb: '160,240,190' },
  1: { nome: 'AQUECIDO', rgb: '255,220,150' },
  2: { nome: 'COM CALOR', rgb: '255,190,120', vel: -0.04, regen: 0.8 },
  3: { nome: 'SUPERAQUECIDO', rgb: '255,150,90', vel: -0.1, dano: -0.06, regen: 0.65 },
  4: { nome: 'INSOLAÇÃO', rgb: '255,110,80', vel: -0.16, dano: -0.12, regen: 0.5, drena: 0.012 },
};
// Limites da temperatura do corpo (°C) entre os estados: -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4
const CLIMA_FAIXAS = [33.6, 34.8, 35.9, 36.5, 37.6, 38.3, 39.2, 40.2];
// Qualidade dos efeitos (Configurações → Vídeo → Efeitos de clima)
const CLIMA_QUAL = [
  { part: 0.45, pocas: 6, pegadas: 30, bancos: 1, haze: false, chao3d: false, respingos: 0.3 },
  { part: 0.75, pocas: 10, pegadas: 70, bancos: 2, haze: false, chao3d: true, respingos: 0.6 },
  { part: 1, pocas: 14, pegadas: 120, bancos: 3, haze: true, chao3d: true, respingos: 1 },
];

const Clima = {
  // estado desta zona (não salvo): poças, bancos de neblina, fogueiras, pegadas e partículas
  pocas: [], bancos: [], fogueiras: [], pegadas: [], fx: [], ondas: [], trovoes: [],
  nivelAtual: 0, esforco: 0, sens: 21, passoD: 0, passoL: 1, vaporT: 1, avisoT: 0, au: null, zid: null,

  // ------------------------------------------------------------ estado salvo (World.state.amb)
  get S() {
    const W = World.state;
    if (!W.amb) W.amb = { zonas: {}, corpo: { temp: 37, molhado: 0, neve: 0, geada: 0 } };
    return W.amb;
  },
  get corpo() { return this.S.corpo; },
  chao() { const id = World.zone ? World.zone.id : '-'; return this.S.zonas[id] || (this.S.zonas[id] = { agua: 0, neve: 0 }); },
  qual() { return CLIMA_QUAL[typeof Settings !== 'undefined' && Settings.v.clima !== undefined ? Settings.v.clima : 2] || CLIMA_QUAL[2]; },

  // ------------------------------------------------------------ leitura do tempo
  tipo() { return WorldTime.clima(); },
  k() { return WorldTime.intensidade(); },
  // A zona é a céu aberto? (biomas e a cidade: 1; interiores: 0.2, só pelas frestas)
  exposicao() { const R = game.room; return R && WorldTime.aberto(R.theme) >= 0.6 ? 1 : 0.2; },
  chuva() { const C = WorldTime.C(); return C.rain ? C.rain * this.k() : 0; },
  nevando() { const C = WorldTime.C(); return C.flakes ? Math.min(1, C.flakes / 120 + 0.35) * this.k() : 0; },
  // Vento (0 a ~2): a capa das peças balança com ele (js/heroes/pecas3d.js)
  vento() { const C = WorldTime.C(); return Math.min(2.2, (C.wind || 0.2) * (0.4 + 0.6 * this.k())) * this.exposicao(); },
  // Temperatura do ar (°C) na zona atual, com a hora, o bioma e o clima
  tempAr() {
    const z = World.zone, R = game.room;
    if (!z || !R) return 20;
    const T = CLIMA_REGIAO[z.region] || [20, 12], luz = WorldTime.luz();
    let t = T[1] + (T[0] - T[1]) * luz + (CLIMA_AJUSTE[this.tipo()] || 0) * this.k() + (CLIMA_BIOMA[z.theme] || 0);
    if (this.exposicao() < 1) t = t + (18 - t) * 0.6;   // interiores: protegidos do extremo
    return t;
  },
  // Abrigo num ponto (0 a 1): interiores, toldos da cidade, perto das paredes, sob as árvores
  abrigado(x, y) {
    const R = game.room;
    if (!R) return 0;
    if (this.exposicao() < 1) return 1;
    if (R.cidade) return x < CIDADE_RECUO + 70 || y < CIDADE_RECUO + 70 ? 1 : 0;
    if (!R.aberto && (x < 80 || y < 80)) return 0.8;
    let a = 0;
    for (const p of R.pillars) {
      if (p.deco || R.theme.pillar !== 'tree') continue;
      const d = dist(x, y, p.x, p.y);
      if (d < p.r * 2.6 + 18) a = Math.max(a, 0.65 * (1 - Math.max(0, d - p.r) / (p.r * 1.6 + 18)));
    }
    return a;
  },
  // Calor de fontes por perto (°C a mais): fogueiras, a Chama da Aurora, a forja, lumes acesos
  calorDe(x, y) {
    let c = 0;
    for (const f of this.fogueiras) c += 24 * Math.max(0, 1 - dist(x, y, f.x, f.y) / 210);
    const g = game;
    for (const n of g.npcs) {
      if (typeof CidadeProp !== 'undefined' && n instanceof CidadeProp) {
        if (n.kind === 'monumento') c += 14 * Math.max(0, 1 - dist(x, y, n.x, n.y) / 240);
        else if (n.data.est === 'forja') c += 10 * Math.max(0, 1 - dist(x, y, n.x, n.y) / 160);
      }
    }
    const R = g.room, lamp = R && R.theme.lamp.split(',').map(Number);
    if (R && lamp[0] > lamp[2] + 40) for (const t of R.torches) if (t.chao) c += 8 * Math.max(0, 1 - dist(x, y, t.x, t.y) / 130);
    return c;
  },
  // Neblina onde o herói está (0 a 1): o clima e os bancos que passam por ele
  neblina() {
    const p = game.player, tp = this.tipo(), k = this.k();
    if (!p || !World.zone) return 0;
    let n = tp === 'neblina' ? 0.5 * k : tp === 'nevasca' ? 0.45 * k : tp === 'areia' ? 0.5 * k : 0;
    n *= this.exposicao();
    return clamp(n + this.bancoEm(p.x, p.y), 0, 1);
  },
  forcaBancos() {
    const h = WorldTime.hora(), R = game.room, manha = R && R.aberto && h >= 4 && h < 8.5 ? 0.35 : 0;
    return Math.min(1, (this.tipo() === 'neblina' ? this.k() : 0) + manha);
  },
  bancoEm(x, y) {
    const f = this.forcaBancos();
    if (!f) return 0;
    let n = 0;
    for (const b of this.bancos) { const d = dist(x, y, b.x, b.y); if (d < b.r) n += Math.pow(1 - d / b.r, 1.5); }
    return Math.min(0.7, n * 0.7 * f);
  },

  // ------------------------------------------------------------ zona nova (World.loadZone)
  aoCarregar(z) {
    const R = game.room, Q = this.qual();
    this.pocas.length = 0; this.bancos.length = 0; this.fogueiras.length = 0; this.pegadas.length = 0; this.fx.length = 0; this.ondas.length = 0;
    this.zid = z.id;
    let h = 17;
    for (const ch of z.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const r = mulberry32(h);
    // poças: lugares fixos da zona, longe dos pilares (o tamanho vem da água no chão)
    if (WorldTime.aberto(R.theme) >= 0.6) {
      for (let i = 0, tent = 0; i < 14 && tent < 80; tent++) {
        const x = R.w * (0.08 + 0.84 * r()), y = R.h * (0.08 + 0.84 * r()), rr = 26 + r() * 44;
        if (!R.canStand(x, y, rr * 0.6)) continue;
        this.pocas.push({ x, y, r: rr, a: r() * Math.PI, e: 0.55 + r() * 0.3, b: [r() - 0.5, r() - 0.5], i: i++ });
      }
      for (let i = 0; i < 3; i++) this.bancos.push({ x: R.w * r(), y: R.h * r(), r: 220 + r() * 160, ph: r() * 10 });
    }
    // a água e a neve da zona: o que já estava (salvo) e o que o clima de agora deixaria
    const C = this.chao(), k = this.k(), cl = World.state.clima;
    if (cl && cl.reg === z.region) {   // (numa região nova, o clima dela só é sorteado no próximo quadro)
      if (this.chuva() > 0) C.agua = Math.max(C.agua, 0.5 * k);
      if (this.nevando() > 0 && this.tempAr() < 1) C.neve = Math.max(C.neve, 0.4 * k);
    }
    for (const n of game.npcs) { n.molhado = this.chuva() * this.exposicao() * 0.6; n.abrigoXY = undefined; }
  },
  // Fogueira Portátil (js/mundo/oficios.js) e outras: aquece e seca quem está perto
  acenderFogueira(x, y, dur = 90) {
    const R = game.room;
    if (R && !R.canStand(x, y, 14)) { x = game.player.x; y = game.player.y + 30; }
    this.fogueiras.push({ x, y, t: dur, dur, ph: Math.random() * 10 });
    game.particles.embers(x, y, 10, 14, '255,150,60', 20, 90);
    game.hud.toast('Fogueira acesa · aquece e seca a roupa por perto', '255,170,90');
    game.audio.play('fireball', 0.5);
  },
  trovao() { const t = rand(0.4, 2.6); this.trovoes.push({ t, t0: t }); },
  descansar() { const c = this.corpo; c.temp = 37; c.molhado = 0; c.neve = 0; c.geada = 0; this.mudouNivel(0, true); },

  // ------------------------------------------------------------ por quadro (Game.updatePlaying, no mundo)
  update(dt) {
    const g = game, p = g.player, R = g.room;
    if (!World.zone || !R || !p) return;
    const C = this.chao(), tAr = this.tempAr(), sol = WorldTime.luz(), expo = this.exposicao();
    const chuva = this.chuva() * expo, neve = this.nevando() * expo;
    // chão: poças e neve
    if (chuva > 0.05) C.agua = Math.min(1, C.agua + chuva * dt / 35);
    else C.agua = Math.max(0, C.agua - dt * (0.004 + 0.008 * sol + Math.max(0, tAr - 18) * 0.0012));
    if (neve > 0.05 && tAr < 1.5) C.neve = Math.min(1, C.neve + neve * dt / 45);
    else if (tAr > 0.5) C.neve = Math.max(0, C.neve - dt * (tAr + 1) * (chuva > 0.05 ? 0.0012 : 0.0006) * (0.6 + sol));
    if (tAr > 0.5 && C.neve > 0 && chuva > 0.05) C.agua = Math.min(1, C.agua + dt * 0.004);   // a neve derretendo vira água
    // bancos de neblina andam com o vento (e dão a volta na zona)
    const W = WorldTime.C(), vx = 10 + (W.wind || 0.2) * 14;
    for (const b of this.bancos) { b.ph += dt; b.x += vx * dt; b.y += Math.sin(b.ph * 0.2) * 6 * dt; if (b.x - b.r > R.w) b.x = -b.r; }
    // fogueiras
    for (let i = this.fogueiras.length - 1; i >= 0; i--) {
      const f = this.fogueiras[i];
      f.t -= dt; f.ph += dt;
      if (Math.random() < dt * 6) g.particles.embers(f.x, f.y, 14, 1, '255,150,60', 8, 60);
      if (chuva > 0.5) f.t -= dt * 0.5;   // a chuva forte apaga mais depressa
      if (f.t <= 0) this.fogueiras.splice(i, 1);
    }
    // trovões atrasados (o som vem depois do clarão; quanto mais longe, mais baixo)
    for (let i = this.trovoes.length - 1; i >= 0; i--) {
      const T = this.trovoes[i];
      if ((T.t -= dt) > 0) continue;
      g.audio.play('thunder', clamp(0.55 - T.t0 * 0.12, 0.15, 0.5));
      this.trovoes.splice(i, 1);
    }
    this.corpoUpdate(dt, p, tAr, chuva, neve);
    this.pessoas(dt, chuva, neve, tAr);
    this.pisadas(dt, p, C);
    this.particulas(dt, chuva, C);
    this.som(dt, chuva, tAr);
  },

  // Corpo do herói: sensação térmica → temperatura do corpo → estado; roupa molhada, neve, geada
  corpoUpdate(dt, p, tAr, chuva, neve) {
    const c = this.corpo, P = typeof Arsenal !== 'undefined' ? Arsenal.protecao() : { agua: 0.3, absorve: 0.6, seca: 0.45, isola: 0.32, vento: 0.4, neve: 0.3, reflete: 0.3, calor: 0, fresco: 0, repele: 0 };
    const ab = this.abrigado(p.x, p.y), fogo = this.calorDe(p.x, p.y), b = p.buffs || {};
    // esforço: sobe correndo, golpeando e esquivando; desce parado
    const st = p.state, forca = st === 'run' ? 0.5 : st === 'attack' || st === 'charge' || st === 'special' || st === 'dash' ? 1 : 0;
    this.esforco = approach(this.esforco, forca, dt * (forca > this.esforco ? 0.25 : 0.12));
    // roupa: molha na chuva (menos com peça impermeável, nada com a aura), seca no sol, no fogo e no abrigo
    const aqui = P.repele ? 0 : chuva * (1 - ab);
    const teto = 0.3 + 0.7 * P.absorve;
    if (aqui > 0.04) c.molhado = Math.min(teto, c.molhado + aqui * (1 - P.agua) * (0.5 + P.absorve) * 0.06 * dt);
    else c.molhado = Math.max(0, c.molhado - dt * (0.004 + 0.012 * P.seca + Math.max(0, tAr - 15) * 0.0008 + fogo * 0.0015 + ab * 0.004));
    // neve na roupa: junta no aberto, derrete no calor e no fogo (e molha), cai na esquiva
    const nAqui = neve * (1 - ab) * (1 - P.neve * 0.6);
    if (nAqui > 0.03 && tAr < 2) c.neve = Math.min(1, c.neve + nAqui * 0.05 * dt);
    const derrete = Math.min(c.neve, dt * (Math.max(0, tAr + 1) * 0.01 + fogo * 0.004 + (st === 'dash' ? 0.6 : 0)));
    c.neve -= derrete; if (tAr > 0 || fogo > 4) c.molhado = Math.min(1, c.molhado + derrete * 0.4);
    // sensação térmica
    const isola = P.isola * (1 - 0.55 * c.molhado) + P.calor + (b.cha > 0 ? 0.35 : 0);
    let S = tAr;
    if (tAr < 21) { const fal = 21 - tAr; S += Math.min(fal, fal * 0.55 * isola + 6 * isola); }
    if (tAr < 18) S -= this.vento() * 2.4 * (1 - P.vento) * (1 - ab);
    if (tAr < 24) S -= c.molhado * 6 * (1 - P.agua * 0.5);
    if (tAr > 24) {
      const ex = tAr - 24, sombra = Math.max(ab, 1 - WorldTime.luz());
      S -= Math.min(ex, ex * P.reflete * 0.5 + P.fresco * 12 + (b.refresco > 0 ? 9 : 0) + sombra * 4 + c.molhado * 3);
      S += Math.max(0, P.isola - 0.4) * 10 * Math.min(1, ex / 10);   // roupa de frio no calor
    }
    S += this.esforco * 4 + fogo;
    this.sens = S;
    const alvo = 37 + clamp((S - 21) * 0.11, -4.5, 4.5);
    c.temp = approach(c.temp, alvo, dt * (Math.abs(alvo - c.temp) > 1.5 ? 0.07 : 0.035));
    let n = -4;
    while (n < 4 && c.temp > CLIMA_FAIXAS[n + 4]) n++;
    if (n !== this.nivelAtual) this.mudouNivel(n);
    // geada: no frio forte (ou molhado num frio de rachar)
    const gAlvo = n <= -4 ? 0.8 : n <= -3 ? 0.45 : tAr < -10 && c.molhado > 0.3 ? 0.35 : 0;
    c.geada = approach(c.geada, gAlvo, dt * (gAlvo > c.geada ? 0.03 : 0.06 + fogo * 0.01));
    // extremos: a vida cai devagar (até 1; o resto fica com os inimigos)
    const L = CLIMA_NIVEIS[n];
    if (L.drena && p.state !== 'dead' && p.hp > 1) p.hp = Math.max(1, p.hp - p.maxHp * L.drena * dt);
    if (L.drena && (this.avisoT -= dt) <= 0) { this.avisoT = 12; game.hud.toast(n < 0 ? 'HIPOTERMIA · fogo, abrigo, chá quente ou roupas de frio' : 'INSOLAÇÃO · sombra, água, refresco ou roupas leves', L.rgb); }
    // vapor da respiração no frio e suor no calor
    if ((this.vaporT -= dt) <= 0) {
      this.vaporT = n >= 3 ? 0.9 : 2.2 + Math.random();
      if (tAr < 6) this.vapor(p, true);
      if (n >= 1) this.suor(p);
    }
  },
  mudouNivel(n, quieto = false) {
    const antes = this.nivelAtual;
    this.nivelAtual = n;
    if (game.player) game.player.recalc(false);   // velocidade, dano e energia do estado (Clima.apply)
    if (quieto || !game.hud) return;
    const L = CLIMA_NIVEIS[n], pior = Math.abs(n) > Math.abs(antes);
    if (Math.abs(n) >= 2 || (n === 0 && Math.abs(antes) >= 2)) game.hud.toast(`Corpo · ${L.nome}${pior && Math.abs(n) >= 2 ? (n < 0 ? ' · procure calor' : ' · procure sombra') : ''}`, L.rgb);
  },
  nivel() { return this.nivelAtual; },
  // Efeito do estado nos atributos (Player.recalc → WorldInv.apply → aqui)
  apply(S) {
    const L = CLIMA_NIVEIS[this.nivelAtual];
    if (L.vel) S.speedMult += L.vel;
    if (L.dano) S.dmgMult += L.dano;
    if (L.regen) S.regen *= L.regen;
    const m = this.S.corpo.molhado;
    if (m > 0.3) S.speedMult -= m * 0.03;   // roupa encharcada pesa
  },

  // ------------------------------------------------------------ moradores
  // Querem abrigo? (chuva forte, nevasca, areia, ou o sol a pino no calor)
  querAbrigo() {
    const tp = this.tipo(), k = this.k();
    return this.exposicao() >= 1 && ((this.chuva() > 0.45) || (tp === 'nevasca' && k > 0.5) || (tp === 'areia' && k > 0.5) || (this.tempAr() > 36 && WorldTime.luz() > 0.6));
  },
  // Para onde o morador vai (ou null): os toldos da cidade, a copa mais perto, a parede do fundo
  alvoAbrigo(npc) {
    if (!this.querAbrigo()) { npc.abrigoXY = undefined; return null; }
    if (npc.abrigoXY === undefined) npc.abrigoXY = this.pontoAbrigo(npc.x, npc.y);
    return npc.abrigoXY;
  },
  pontoAbrigo(x, y) {
    const R = game.room;
    if (!R) return null;
    if (this.abrigado(x, y) >= 0.6) return null;   // já está
    let best = null, bd = 1e9;
    const tenta = (px, py) => { const d = dist(x, y, px, py); if (d < bd && R.canStand(px, py, 14)) { bd = d; best = { x: px, y: py }; } };
    if (R.cidade) {
      for (const B of CIDADE_PREDIOS) {
        const C = Cidade.caixa(B, R);
        if (B.lado === 'N') tenta(clamp(x + rand(-40, 40), C.x0 + 30, C.x1 - 30), C.y1 + 34);
        else tenta(C.x1 + 34, clamp(y + rand(-40, 40), C.y0 + 30, C.y1 - 30));
      }
    } else if (R.theme.pillar === 'tree') {
      for (const p of R.pillars) { if (p.deco) continue; const a = Math.atan2(y - p.y, x - p.x); tenta(p.x + Math.cos(a) * (p.r + 18), p.y + Math.sin(a) * (p.r + 18)); }
    } else if (!R.aberto) { tenta(x, 56); tenta(56, y); }
    return best;
  },
  pessoas(dt, chuva, neve, tAr) {
    const g = game;
    for (const n of g.npcs) {
      if (!(typeof Morador !== 'undefined' && n instanceof Morador)) continue;
      const ab = this.abrigado(n.x, n.y);
      n.molhado = clamp((n.molhado || 0) + (chuva * (1 - ab) > 0.05 ? chuva * (1 - ab) * 0.05 : -0.008 - ab * 0.01) * dt, 0, 0.9);
      n.neveRoupa = clamp((n.neveRoupa || 0) + (neve * (1 - ab) > 0.05 && tAr < 2 ? neve * 0.04 : -0.01) * dt, 0, 0.8);
      if (tAr < 5 && Math.random() < dt * 0.4 && dist2(n.x, n.y, g.player.x, g.player.y) < 700 * 700) this.vapor(n, false);
    }
  },
  // Comentário do morador sobre o tempo (Povo.conversar)
  comentario() {
    const n = this.nivelAtual, c = this.corpo, tp = this.tipo(), k = this.k(), tAr = this.tempAr();
    if (n <= -3) return 'Você está azul! Chega perto do fogo — ou toma um chá quente.';
    if (n >= 3) return 'Você está vermelho feito brasa. Sai do sol e bebe alguma coisa gelada.';
    if (c.molhado > 0.6) return 'Encharcado, hein? Fica perto do fogo até secar.';
    if (c.neve > 0.5) return 'Sacode essa neve dos ombros antes que vire gelo.';
    if (tp === 'tempestade') return 'Os raios hoje estão perto demais. Não fica no aberto.';
    if (tp === 'chuva') return k > 0.45 ? 'Essa chuva não dá trégua… pelo menos lava a poeira.' : 'Garoa fina. Daqui a pouco passa.';
    if (tp === 'nevasca') return 'Com essa nevasca, nem os drones saem.';
    if (tp === 'neve') return 'Neve fresca: dá pra ver a pegada de tudo que passou.';
    if (tp === 'areia') return 'Cobre o rosto. Essa areia corta.';
    if (tp === 'calor') return 'Calor assim derrete até o juízo.';
    if (tp === 'neblina') return 'Nessa neblina, ouvido vale mais que olho.';
    if (tAr < 5) return 'Frio de doer. Se for sair, leva cachecol.';
    if (tAr > 33) return 'Esse sol não perdoa. Anda pela sombra.';
    return '';
  },

  // ------------------------------------------------------------ pegadas, respingos, vapor
  pisadas(dt, p, C) {
    const R = game.room, Q = this.qual();
    if (p.air || p.state === 'dead') return;
    const v = Math.hypot(p.vx, p.vy);
    if (v < 20) return;
    this.passoD += v * dt;
    if (this.passoD < 26) return;
    this.passoD = 0; this.passoL = -this.passoL;
    const tipo = C.neve > 0.15 ? 'neve' : World.zone.theme === 'deserto' ? 'areia' : C.agua > 0.4 && R.aberto ? 'lama' : null;
    const a = Math.atan2(p.vy, p.vx), ox = Math.cos(a + Math.PI / 2) * 5 * this.passoL, oy = Math.sin(a + Math.PI / 2) * 5 * this.passoL;
    if (tipo) {
      this.pegadas.push({ x: p.x + ox, y: p.y + oy, a, t: game.realTime, tipo });
      while (this.pegadas.length > Q.pegadas) this.pegadas.shift();
      if (tipo === 'neve' && game.audio.ctx && game.audio.throttle('passoNeve', 0.12)) game.audio.noise(0.09, 0.09, 'bandpass', 2600, 1100, 1.3);
    }
    // pisando numa poça: respingo
    for (const q of this.pocas) {
      const r = q.r * this.tamPoca(C);
      if (r > 8 && dist(p.x, p.y, q.x, q.y) < r) {
        for (let i = 0; i < 4; i++) this.addFx('gota', p.x, p.y, 2, rand(-50, 50), rand(-50, 50), rand(60, 120), 0.5);
        if (game.audio.ctx && game.audio.throttle('passoAgua', 0.15)) game.audio.noise(0.12, 0.08, 'bandpass', 1400, 700, 1);
        break;
      }
    }
  },
  tamPoca(C) { return clamp(C.agua * 1.5 - 0.15, 0, 1); },
  addFx(k, x, y, z, vx, vy, vz, life, s = 1) {
    const F = this.fx;
    if (F.length >= 220) F.shift();
    F.push({ k, x, y, z, vx, vy, vz, t: 0, life, s });
  },
  vapor(e, heroi) {
    const a = e.facing || 0, h = heroi ? 50 : 44;
    for (let i = 0; i < 3; i++) this.addFx('vapor', e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, h, Math.cos(a) * 16 + rand(-4, 4), Math.sin(a) * 16 + rand(-4, 4), 6, 1.4, rand(0.8, 1.2));
    if (heroi && game.audio.ctx && game.audio.throttle('respira', 1.5)) game.audio.noise(0.45, 0.03, 'lowpass', 900, 300, 0.6);
  },
  suor(e) { for (let i = 0; i < 2; i++) this.addFx('suor', e.x + rand(-6, 6), e.y + rand(-6, 6), 52, rand(-8, 8), rand(-8, 8), -10, 0.7); },
  particulas(dt, chuva, C) {
    const F = this.fx, Q = this.qual(), p = game.player;
    for (let i = F.length - 1; i >= 0; i--) {
      const f = F[i];
      f.t += dt;
      if (f.t >= f.life) { F.splice(i, 1); continue; }
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      if (f.k === 'gota' || f.k === 'suor') { f.vz -= 420 * dt; if (f.z < 0) { f.z = 0; f.vz = 0; f.vx *= 0.5; f.vy *= 0.5; } }
    }
    // respingos da chuva no chão em volta do herói e ondinhas nas poças
    if (chuva > 0.05 && p) {
      const n = chuva * 26 * Q.respingos * dt;
      for (let i = 0; i < n || Math.random() < n - i; i++) { this.addFx('resp', p.x + rand(-520, 520), p.y + rand(-420, 420), 0, 0, 0, 0, 0.32); if (i > 6) break; }
      const tam = this.tamPoca(C);
      if (tam > 0.15) for (const q of this.pocas) if (Math.random() < chuva * dt * 4) this.ondas.push({ x: q.x + rand(-0.5, 0.5) * q.r * tam, y: q.y + rand(-0.5, 0.5) * q.r * tam * q.e, t: 0 });
    }
    for (let i = this.ondas.length - 1; i >= 0; i--) if ((this.ondas[i].t += dt) > 0.9) this.ondas.splice(i, 1);
    if (this.ondas.length > 80) this.ondas.splice(0, this.ondas.length - 80);
  },

  // ------------------------------------------------------------ desenho (vista isométrica)
  // Ponto na tela: vista isométrica ou 3ª pessoa (z para cima; k = pixels por unidade)
  _P: { x: 0, y: 0, k: 1, vis: true },
  pt(x, y, z = 0) {
    if (typeof ThirdView !== 'undefined' && ThirdView.active()) return ThirdView.proj(x, y, z);
    const P = this._P;
    P.x = x - y; P.y = (x + y) / 2 - z; P.k = 1; P.vis = true;
    return P;
  },
  // Contorno de uma figura no chão (pontos do mundo) já projetado
  chaoPoly(ctx, cx, cy, rx, ry, a, n = 14) {
    const ca = Math.cos(a), sa = Math.sin(a);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU, u = Math.cos(t) * rx, v = Math.sin(t) * ry;
      const P = this.pt(cx + u * ca - v * sa, cy + u * sa + v * ca, 0.2);
      if (!P.vis) return false;
      if (i) ctx.lineTo(P.x, P.y); else ctx.moveTo(P.x, P.y);
    }
    ctx.closePath();
    return true;
  },
  // Chão (Game.renderWorld, antes dos corpos): neve acumulada, poças, ondinhas, pegadas, respingos e a lenha das fogueiras
  desenharChao(ctx) {
    const R = game.room, C = this.chao(), t = game.realTime, tres = typeof ThirdView !== 'undefined' && ThirdView.active();
    if (!R || !World.zone) return;
    ctx.save();
    // neve no chão (na 3ª pessoa vira manchas 3D: fila3P)
    if (C.neve > 0.02 && !tres) {
      const M = R.margem || 0, pts = [[-M, -M], [R.w + M, -M], [R.w + M, R.h + M], [-M, R.h + M]];
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(isoX(x, y), isoY(x, y)) : ctx.moveTo(isoX(x, y), isoY(x, y)))); ctx.closePath();
      ctx.fillStyle = `rgba(232,238,250,${(0.22 + 0.4 * C.neve).toFixed(3)})`; ctx.fill();
      ctx.globalAlpha = Math.min(1, C.neve * 1.3); ctx.fillStyle = this.padraoNeve(ctx); ctx.fill(); ctx.globalAlpha = 1;
    }
    // poças (na 3ª pessoa, discos 3D)
    const tam = this.tamPoca(C);
    if (tam > 0.02 && !tres) {
      const n = Math.min(this.pocas.length, this.qual().pocas);
      for (let i = 0; i < n; i++) {
        const q = this.pocas[i], r = q.r * tam;
        if (!this.chaoPoly(ctx, q.x, q.y, r, r * q.e, q.a)) continue;
        ctx.fillStyle = `rgba(22,34,56,${(0.5 * Math.min(1, tam * 1.4)).toFixed(3)})`; ctx.fill();
        ctx.strokeStyle = 'rgba(120,150,190,0.22)'; ctx.lineWidth = 1; ctx.stroke();
        if (this.chaoPoly(ctx, q.x + q.b[0] * r * 0.4, q.y + q.b[1] * r * 0.3, r * 0.5, r * 0.12 * q.e, q.a + 0.3)) { ctx.fillStyle = 'rgba(170,200,235,0.14)'; ctx.fill(); }
      }
    }
    // ondinhas da chuva nas poças
    ctx.lineWidth = 1;
    for (const o of this.ondas) {
      const k = o.t / 0.9;
      if (this.chaoPoly(ctx, o.x, o.y, 2 + k * 9, 2 + k * 9, 0, 10)) { ctx.strokeStyle = `rgba(190,215,245,${(0.5 * (1 - k)).toFixed(3)})`; ctx.stroke(); }
    }
    // pegadas (somem com o tempo; a neve caindo cobre mais depressa)
    const vida = this.nevando() > 0.1 ? 22 : 50;
    for (const f of this.pegadas) {
      const idade = t - f.t;
      if (idade > vida) continue;
      const a = (1 - idade / vida) * (f.tipo === 'lama' ? 0.5 : 0.42);
      if (!this.chaoPoly(ctx, f.x, f.y, 5.5, 2.6, f.a, 8)) continue;
      ctx.fillStyle = f.tipo === 'neve' ? `rgba(110,130,165,${a.toFixed(3)})` : f.tipo === 'areia' ? `rgba(110,78,40,${a.toFixed(3)})` : `rgba(36,26,18,${a.toFixed(3)})`;
      ctx.fill();
    }
    // respingos da chuva (coroinhas no chão)
    ctx.strokeStyle = 'rgba(200,220,250,0.5)';
    for (const f of this.fx) {
      if (f.k !== 'resp') continue;
      const k = f.t / f.life, P = this.pt(f.x, f.y, 0);
      if (!P.vis) continue;
      const s = (2 + k * 5) * Math.min(2, P.k);
      ctx.globalAlpha = 1 - k;
      ctx.beginPath(); ctx.ellipse(P.x, P.y, s, s * 0.45, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(P.x - s * 0.5, P.y); ctx.lineTo(P.x - s * 0.8, P.y - s * 1.2); ctx.moveTo(P.x + s * 0.5, P.y); ctx.lineTo(P.x + s * 0.8, P.y - s * 1.2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // lenha das fogueiras
    if (!tres) for (const f of this.fogueiras) {
      const sx = isoX(f.x, f.y), sy = isoY(f.x, f.y);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(sx, sy, 22, 11, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(sx - 14, sy + 2); ctx.lineTo(sx + 12, sy - 6); ctx.moveTo(sx - 12, sy - 6); ctx.lineTo(sx + 14, sy + 2); ctx.stroke();
      for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; ctx.fillStyle = '#4a4a52'; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * 18, sy + Math.sin(a) * 9, 3.2, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  },
  padraoNeve(ctx) {
    if (!this._neve) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d'), r = mulberry32(77);
      for (let i = 0; i < 70; i++) {
        const x = r() * 256, y = r() * 256, s = 10 + r() * 34, gr = g.createRadialGradient(x, y, 0, x, y, s);
        gr.addColorStop(0, `rgba(250,252,255,${(0.5 + r() * 0.4).toFixed(2)})`); gr.addColorStop(1, 'rgba(250,252,255,0)');
        g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2);
      }
      this._neve = c;
    }
    return ctx.createPattern(this._neve, 'repeat');
  },
  // Ar (depois da escuridão): bancos de neblina, vapor, suor, gotas e as chamas das fogueiras
  desenharAr(ctx) {
    const R = game.room, t = game.realTime, luz = 0.35 + 0.65 * WorldTime.luz(), tres = typeof ThirdView !== 'undefined' && ThirdView.active();
    if (!R || !World.zone) return;
    if (tres) this.desenharChao(ctx);   // 3ª pessoa: as marcas no chão vão por cima da cena (projetadas)
    ctx.save();
    // bancos de neblina (rente ao chão, andando com o vento)
    const fb = this.forcaBancos() * this.exposicao(), nb = Math.min(this.bancos.length, this.qual().bancos);
    if (fb > 0.02) for (let i = 0; i < nb; i++) {
      const b = this.bancos[i], P = this.pt(b.x, b.y, 20);
      if (!P.vis) continue;
      const rx = b.r * 1.4 * P.k, ry = b.r * 0.7 * P.k;
      if (rx < 4) continue;
      ctx.save(); ctx.translate(P.x, P.y); ctx.scale(1, ry / rx);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx), c = `${Math.round(180 * luz)},${Math.round(196 * luz)},${Math.round(210 * luz)}`;
      gr.addColorStop(0, `rgba(${c},${(0.42 * fb).toFixed(3)})`); gr.addColorStop(0.6, `rgba(${c},${(0.2 * fb).toFixed(3)})`); gr.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = gr; ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    }
    // vapor da respiração, suor e gotas
    for (const f of this.fx) {
      if (f.k === 'resp') continue;
      const k = f.t / f.life, P = this.pt(f.x, f.y, f.z);
      if (!P.vis) continue;
      if (f.k === 'vapor') {
        const s = (3 + k * 9) * f.s * Math.min(2.5, P.k);
        ctx.fillStyle = `rgba(235,242,255,${(0.32 * (1 - k) * luz).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(P.x, P.y, s, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = f.k === 'suor' ? `rgba(200,230,255,${(0.8 * (1 - k)).toFixed(3)})` : `rgba(170,200,240,${(0.7 * (1 - k)).toFixed(3)})`;
        ctx.fillRect(P.x - 1, P.y - 1.5, 2, 3);
      }
    }
    // chamas das fogueiras
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.fogueiras) {
      const P = this.pt(f.x, f.y, 0), q = Math.min(1, f.t / 6) * (0.85 + 0.15 * Math.sin(t * 13 + f.ph));
      if (!P.vis) continue;
      const k = Math.min(2.5, P.k);
      GlowCache.draw(ctx, '255,140,50', P.x, P.y - 16 * k, 60 * k * q, 0.55 * q);
      for (let i = 0; i < 3; i++) {
        const h = (22 + 10 * Math.sin(t * 9 + i * 2 + f.ph)) * k * q, w = (7 - i * 1.5) * k, ox = (i - 1) * 6 * k;
        ctx.fillStyle = i === 1 ? 'rgba(255,220,140,0.85)' : 'rgba(255,130,40,0.75)';
        ctx.beginPath(); ctx.moveTo(P.x + ox - w, P.y - 2 * k); ctx.quadraticCurveTo(P.x + ox - w * 0.6, P.y - h * 0.6, P.x + ox, P.y - h); ctx.quadraticCurveTo(P.x + ox + w * 0.6, P.y - h * 0.6, P.x + ox + w, P.y - 2 * k); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  },
  // Luz das fogueiras (Game.renderWorld, junto das luzes da sala)
  luzes(L) { for (const f of this.fogueiras) L.add(isoX(f.x, f.y), isoY(f.x, f.y) - 20, 280 * Math.min(1, f.t / 6) * (0.9 + 0.1 * Math.sin(game.realTime * 11 + f.ph)), 0.85); },
  // Por cima de tudo (antes do HUD): o ar tremendo no calor, a visibilidade na neblina e o
  // frio e o calor extremos nas bordas da tela
  desenharTela(ctx) {
    const g = game, p = g.player, R = g.room;
    if (!p || !R || !World.zone) return;
    const t = g.realTime, tAr = this.tempAr();
    // calor: faixas da imagem deslocadas (o ar tremendo), mais perto do chão
    if (this.qual().haze && tAr > 32 && WorldTime.luz() > 0.3 && this.exposicao() >= 1) {
      const amp = Math.min(3, (tAr - 32) / 4), cv = g.canvas, s = g.scale;
      const off = this._haze || (this._haze = document.createElement('canvas'));
      if (off.width !== cv.width || off.height !== cv.height) { off.width = cv.width; off.height = cv.height; }
      const o2 = off.getContext('2d'); o2.setTransform(1, 0, 0, 1, 0, 0); o2.drawImage(cv, 0, 0);
      const y0 = Math.round(VIEW_H * 0.35), step = 6;
      for (let y = y0; y < VIEW_H; y += step) {
        const dx = Math.sin(t * 3.1 + y * 0.09) * amp * ((y - y0) / (VIEW_H - y0) * 0.7 + 0.3);
        ctx.drawImage(off, g.offX, g.offY + y * s, VIEW_W * s, step * s, dx, y, VIEW_W, step);
      }
      ctx.fillStyle = `rgba(255,170,90,${(0.03 * amp).toFixed(3)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // neblina densa, nevasca, areia: a visão fecha em volta do herói
    const nd = this.neblina();
    if (nd > 0.05) {
      const P = typeof ThirdView !== 'undefined' && ThirdView.active() ? ThirdView.proj(p.x, p.y, 30) : g.camera.toScreen(isoX(p.x, p.y), isoY(p.x, p.y) - 30), tp = this.tipo(), luz = 0.35 + 0.65 * WorldTime.luz();
      const base = tp === 'areia' ? [205, 155, 95] : tp === 'nevasca' ? [228, 234, 246] : [185, 198, 210];
      const c = base.map((v) => Math.round(v * luz)).join(','), r0 = 620 - 470 * nd, r1 = r0 + 300;
      const gr = ctx.createRadialGradient(P.x, P.y, r0, P.x, P.y, r1);
      gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(1, `rgba(${c},${(0.9 * nd).toFixed(3)})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = `rgba(${c},${(0.12 * nd).toFixed(3)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // extremos do corpo: geada ou calor nas bordas
    const n = this.nivelAtual;
    if (Math.abs(n) >= 3) {
      const k = (Math.abs(n) - 2) / 2 * (0.75 + 0.25 * Math.sin(t * (n > 0 ? 2.4 : 1.2)));
      const gr = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
      const c = n < 0 ? '200,225,255' : '255,120,60';
      gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(1, `rgba(${c},${(0.38 * k).toFixed(3)})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  },
  // Termômetro do HUD (embaixo dos vitais): estado do corpo, roupa molhada, neve e abrigo
  desenharHud(ctx, x, y) {
    const c = this.corpo, n = this.nivelAtual, L = CLIMA_NIVEIS[n], p = game.player, tAr = this.tempAr();
    ctx.save();
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(4,8,18,0.72)'; ctx.fillRect(x, y, 300, 18);
    ctx.fillStyle = rgba(L.rgb, 0.9); ctx.fillRect(x, y, 2, 18);
    // barra: do frio (esquerda) ao calor (direita), com o ponto do corpo
    const bx = x + 10, bw = 74, k = clamp((c.temp - 33) / 8, 0, 1);
    const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    gr.addColorStop(0, '#7ab8ff'); gr.addColorStop(0.5, '#8cf0b4'); gr.addColorStop(1, '#ff7a50');
    ctx.fillStyle = gr; ctx.fillRect(bx, y + 7, bw, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + bw * k - 1.5, y + 4, 3, 10);
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px'; ctx.fillStyle = rgba(L.rgb, 1);
    ctx.fillText(L.nome, bx + bw + 8, y + 9.5);
    const tx = bx + bw + 8 + ctx.measureText(L.nome).width + 14;
    ctx.letterSpacing = '0px';
    ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)';
    const itens = [`${Math.round(tAr)}°C`];
    if (c.molhado > 0.05) itens.push(`💧${Math.round(c.molhado * 100)}%`);
    if (c.neve > 0.1) itens.push('❄');
    if (p && this.abrigado(p.x, p.y) >= 0.6) itens.push('⌂');
    if (p && this.calorDe(p.x, p.y) > 4) itens.push('🔥');
    ctx.fillText(itens.join('  '), tx, y + 9.5);
    ctx.restore();
  },
  // Tremor de frio (o corpo treme) no modelo 3D (Game.queue3)
  tremor(e, o) {
    if (!World.zone) return;
    const heroi = e === game.player, n = heroi ? this.nivelAtual : this.tempAr() < 0 && this.calorDe(e.x, e.y) < 4 ? -2 : 0;
    if (n > -2) return;
    const a = (n <= -3 ? 0.03 : 0.014) * Math.sin(game.realTime * 41 + (e.id || 0));
    o.roll = (o.roll || 0) + a;
  },
  // Clima no corpo para o shader (molhado, neve, geada): o herói pela roupa; os outros pelo lugar
  roupa(e) {
    if (!World.zone) return null;
    const w = e._clima || (e._clima = [0, 0, 0]);
    if (e === game.player) {
      const c = this.corpo, P = typeof Arsenal !== 'undefined' ? Arsenal.protecao() : null;
      w[0] = c.molhado * (P ? 0.6 + 0.6 * P.absorve : 1); w[1] = c.neve; w[2] = c.geada;
    } else if (typeof Morador !== 'undefined' && e instanceof Morador) {
      w[0] = e.molhado || 0; w[1] = e.neveRoupa || 0; w[2] = this.tempAr() < -10 ? 0.35 : 0;
    } else {
      const ab = this.abrigado(e.x, e.y);
      w[0] = this.chuva() * this.exposicao() * (1 - ab) * 0.8; w[1] = this.nevando() * this.exposicao() * (1 - ab) * 0.6; w[2] = this.tempAr() < -10 ? 0.35 : 0;
    }
    return w[0] + w[1] + w[2] > 0.01 ? w : null;
  },

  // ------------------------------------------------------------ 3ª pessoa
  // Poças, manchas de neve e fogueiras como discos e modelos 3D na cena (ThirdView.render)
  fila3P(Q) {
    const C = this.chao(), R = game.room, q = this.qual();
    if (!R || !World.zone) return;
    let n = 0;
    const pool = this._o3 || (this._o3 = []);
    const add = (model, x, y, z, sx, sy, yaw, clima) => {
      const o = pool[n] || (pool[n] = { m: M3.make(), flash: 0, emi: 1, holo: false, ghost: null, tint: null, scale: 1, lift: 0, roll: 0, pitch: 0, yaw: 0 });
      n++;
      M3.trs(o.m, [x, y, z], [0, 0, yaw], [sx, sy, 1]);
      o.clima = clima;
      const it = R3D.queue(model, null, null, o); it.ent = null; Q.push(it);
    };
    const tam = this.tamPoca(C);
    if (q.chao3d && tam > 0.02) {
      const molha = this._molha || (this._molha = [1, 0, 0]);
      for (let i = 0; i < Math.min(this.pocas.length, q.pocas); i++) { const p = this.pocas[i], r = p.r * tam; add(this.modelo('poca'), p.x, p.y, 0.35, r, r * p.e, p.a, molha); }
    }
    if (q.chao3d && C.neve > 0.05) {
      const M = this.manchas || (this.manchas = (() => { const rr = mulberry32(5), L = []; for (let i = 0; i < 46; i++) L.push([rr(), rr(), 30 + rr() * 70, rr() * 3]); return L; })());
      const k = Math.round(M.length * Math.min(1, C.neve * 1.2));
      for (let i = 0; i < k; i++) { const [u, v, r, a] = M[i]; add(this.modelo('neve'), u * R.w, v * R.h, 0.3 + i * 0.002, r, r * 0.7, a, null); }
    }
    for (const f of this.fogueiras) add(this.modelo('fogueira'), f.x, f.y, 0, 1, 1, 0, null);
  },
  modelo(k) {
    const C = this._m3 || (this._m3 = {});
    if (C[k]) return C[k];
    const g = new G3();
    if (k === 'poca') g.cyl(0, 0, 0, 1, 1, 0.2, 18, '#101a2a', 0);
    else if (k === 'neve') g.cyl(0, 0, 0, 1, 1, 0.25, 14, '#e8eef8', 0.08);
    else {
      g.box(0, 0, 3, 28, 5, 5, '#3a2416', 0); g.box(0, 0, 3, 5, 28, 5, '#3a2416', 0);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; g.sphere(Math.cos(a) * 18, Math.sin(a) * 18, 2, 4, 4, 3, 6, 4, '#4a4a52', 0); }
      g.cyl(0, 0, 4, 8, 0, 22, 6, '#ff8a30', 0.9); g.cyl(0, 0, 4, 4.5, 0, 30, 6, '#ffd890', 1);
    }
    return (C[k] = new Model3(new N3(k, g)));
  },
  // Névoa da 3ª pessoa (Ambiente3P.luzes): começa mais perto e puxa para a cor da neblina
  nevoa3P(fog) {
    const nd = this.neblina();
    if (!fog || nd < 0.02) return fog;
    const tp = this.tipo(), c = tp === 'areia' ? [0.8, 0.6, 0.38] : tp === 'nevasca' ? [0.86, 0.9, 0.96] : [0.7, 0.76, 0.82], luz = 0.35 + 0.65 * WorldTime.luz();
    for (let i = 0; i < 3; i++) fog[i] = fog[i] + (c[i] * luz - fog[i]) * nd * 0.7;
    fog[3] *= 1 - 0.72 * nd;
    return fog;
  },

  // ------------------------------------------------------------ som
  montarSom(A) {
    const c = A.ctx, U = {};
    const ruido = () => { const s = c.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true; s.start(0, Math.random()); return s; };
    // chuva: ruído claro (passa-alta + passa-baixa, que fecha debaixo do teto)
    U.chuva = c.createGain(); U.chuva.gain.value = 0;
    U.chuvaHp = c.createBiquadFilter(); U.chuvaHp.type = 'highpass'; U.chuvaHp.frequency.value = 600;
    U.chuvaLp = c.createBiquadFilter(); U.chuvaLp.type = 'lowpass'; U.chuvaLp.frequency.value = 6500;
    ruido().connect(U.chuvaHp); U.chuvaHp.connect(U.chuvaLp); U.chuvaLp.connect(U.chuva); U.chuva.connect(A.amb);
    // vento: ruído grave numa faixa que sobe e desce com as rajadas
    U.vento = c.createGain(); U.vento.gain.value = 0;
    U.ventoBp = c.createBiquadFilter(); U.ventoBp.type = 'bandpass'; U.ventoBp.frequency.value = 420; U.ventoBp.Q.value = 0.9;
    ruido().connect(U.ventoBp); U.ventoBp.connect(U.vento); U.vento.connect(A.amb);
    // abafado (neblina densa, nevasca) e eco (interiores): no canal dos efeitos
    U.abafa = c.createBiquadFilter(); U.abafa.type = 'lowpass'; U.abafa.frequency.value = 20000; U.abafa.Q.value = 0.5;
    U.eco = c.createGain(); U.eco.gain.value = 0;
    const conv = c.createConvolver(), n = Math.floor(c.sampleRate * 1.6), imp = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = imp.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    conv.buffer = imp;
    try {
      A.sfx.disconnect();
      A.sfx.connect(U.abafa); U.abafa.connect(A.master);
      A.sfx.connect(U.eco); U.eco.connect(conv); conv.connect(A.master);
    } catch (e) { A.sfx.connect(A.master); }
    this.au = U;
  },
  som(dt, chuva, tAr) {
    const A = game.audio;
    if (!A.ctx || !A.noiseBuf) return;
    if (!this.au) this.montarSom(A);
    const U = this.au, t = A.ctx.currentTime, p = game.player, ab = p ? this.abrigado(p.x, p.y) : 0;
    const expo = this.exposicao(), tp = this.tipo(), k = this.k();
    U.chuva.gain.setTargetAtTime(Math.min(0.3, (this.chuva() * (0.25 + 0.75 * expo)) * 0.28 * (1 - 0.4 * ab)), t, 0.6);
    U.chuvaLp.frequency.setTargetAtTime(ab > 0.5 || expo < 1 ? 1500 : 6500, t, 0.5);
    const w = this.vento(), rajada = 0.7 + 0.3 * Math.sin(t * 0.4) * Math.sin(t * 1.3);
    const ventoVol = (tp === 'nevasca' || tp === 'areia' ? 0.12 : 0.05) * Math.min(1, w) * rajada * k;
    U.vento.gain.setTargetAtTime(ventoVol * (1 - 0.5 * ab), t, 0.8);
    U.ventoBp.frequency.setTargetAtTime(320 + 380 * rajada * Math.min(1, w), t, 0.4);
    const nd = this.neblina();
    U.abafa.frequency.setTargetAtTime(nd > 0.05 || this.nevando() > 0.5 ? Math.max(1800, 20000 * (1 - nd * 1.2) - this.nevando() * 6000) : 20000, t, 0.5);
    U.eco.gain.setTargetAtTime(expo < 1 ? 0.22 : game.room && game.room.cidade ? 0.08 : 0.02, t, 0.5);
  },
  // Fora do mundo (World.stop): silencia a chuva e o vento
  silenciar() {
    const U = this.au, A = game.audio;
    if (!U || !A.ctx) return;
    const t = A.ctx.currentTime;
    U.chuva.gain.setTargetAtTime(0, t, 0.3); U.vento.gain.setTargetAtTime(0, t, 0.3);
    U.abafa.frequency.setTargetAtTime(20000, t, 0.3); U.eco.gain.setTargetAtTime(0, t, 0.3);
  },
};
