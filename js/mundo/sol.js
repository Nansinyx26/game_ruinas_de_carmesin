'use strict';
// ECLIPSE ZERO · Sol, lua e a luz direcional do mundo (Sol)
// ---------------------------------------------------------------------------
// A luz principal da 3ª pessoa vem de uma posição FÍSICA no céu, calculada pela hora do relógio do
// mundo (WorldTime, js/mundo/tempo.js), não de um filtro de cor:
//  · SOL: ângulo horário (15° por hora a partir do meio-dia), latitude de 20° e declinação que muda
//    devagar com os dias. Nasce a leste às 06:00, sobe até ~70° ao meio-dia (as sombras ficam
//    curtas, mas existem) e se põe a oeste às 18:00; às 17:30 já está baixo e alaranjado.
//  · COR DO SOL pela atmosfera: quanto mais baixo, mais ar a luz atravessa (massa de ar de Kasten e
//    Young) e mais azul é espalhado (transmitância por canal): branco ao meio-dia, dourado à tarde,
//    laranja e vermelho no horizonte. A intensidade cai suave quando ele passa do horizonte.
//  · LUA: do lado oposto do céu conforme a fase (ciclo de 29,5 dias do mundo); a luz dela, azulada
//    e fraca, é a luz direcional da noite (sombras de luar suaves e claras), proporcional à fase.
//  · CHAVE: a luz que o motor usa (direção, cor, força) é a soma do sol e da lua; a troca de um para
//    o outro acontece no crepúsculo, quando os dois estão quase apagados (sem salto de direção).
//  · SOMBRAS: força (céu limpo forte; nublado/chuva/neblina fracas e difusas), suavidade (sol baixo
//    e céu fechado deixam a penumbra mais larga) e o comprimento, que sai sozinho da elevação.
//  · LUGARES FECHADOS (interiores, masmorras, a megacidade subterrânea de Nexus, cavernas): o sol
//    não atravessa o teto. A chave vira a luz ARTIFICIAL do lugar (painéis e luminárias do teto, na
//    cor do tema), quase vertical, com sombras curtas e macias coerentes com ela; fogo, neon e
//    explosões continuam como luzes pontuais (js/fogo.js).
// Horários do ciclo (transições graduais): 06:00 amanhecer · 08:00 manhã · 12:00 sol intenso ·
// 15:00 tarde · 17:30 pôr do sol · 19:00 crepúsculo · 21:00 noite · 00:00 madrugada.
// A duração do dia é configurável (Configurações › Vídeo › Duração do dia).
// ---------------------------------------------------------------------------
const SOL_HORARIOS = [
  [0, 'MADRUGADA'], [6, 'AMANHECER'], [8, 'MANHÃ'], [12, 'SOL INTENSO'], [15, 'TARDE'], [17.5, 'PÔR DO SOL'], [19, 'CREPÚSCULO'], [21, 'NOITE'],
];
const Sol = {
  LAT: 20 * Math.PI / 180,     // latitude do mundo (o sol do meio-dia fica ao sul, a ~70°)
  LUA_CICLO: 29.5,             // dias do mundo de uma lua nova à outra
  BETA: [0.11, 0.2, 0.42],     // espalhamento da atmosfera por canal (vermelho, verde, azul)
  _v: null, _chave: null,

  hora() { return typeof WorldTime !== 'undefined' && World && World.state ? WorldTime.hora() : 12; },
  dia() { return typeof World !== 'undefined' && World.state ? (World.state.dia || 1) : 1; },
  // Nome do período (os horários pedidos)
  periodo(h = this.hora()) { let n = SOL_HORARIOS[0][1]; for (const [ini, nome] of SOL_HORARIOS) if (h >= ini) n = nome; return n; },

  // Declinação do sol (±8° ao longo de um "ano" curto de 48 dias): os dias não são todos iguais
  declinacao(dia = this.dia()) { return 8 * Math.PI / 180 * Math.sin((dia / 48) * Math.PI * 2); },
  // Direção no mundo de um astro com ângulo horário H (radianos, 0 = no meridiano) e declinação d.
  // Eixos: leste = −y, sul = +x, z para cima (o céu de js/terceira_ambiente.js usa os mesmos)
  direcao(H, d, o = [0, 0, 0]) {
    const f = this.LAT, leste = -Math.cos(d) * Math.sin(H);
    const norte = Math.sin(d) * Math.cos(f) - Math.cos(d) * Math.cos(H) * Math.sin(f);
    const cima = Math.sin(d) * Math.sin(f) + Math.cos(d) * Math.cos(H) * Math.cos(f);
    o[0] = -norte; o[1] = -leste; o[2] = cima;
    return o;
  },
  // Sol: direção (de onde vem a luz), elevação (rad) e azimute (rad, no mesmo sentido do céu)
  sol(h = this.hora(), dia = this.dia()) {
    const d = this.direcao((h - 12) * Math.PI / 12, this.declinacao(dia));
    return { dir: d, el: Math.asin(Math.max(-1, Math.min(1, d[2]))), az: Math.atan2(d[1], d[0]) };
  },
  // Fase da lua (0 nova, 0,5 cheia) e quanto dela está iluminado (0 a 1)
  faseLua(dia = this.dia(), h = this.hora()) { const f = (((dia - 1) + h / 24 + 14.75) / this.LUA_CICLO) % 1; return { fase: f, luz: (1 - Math.cos(f * Math.PI * 2)) / 2 }; },
  lua(h = this.hora(), dia = this.dia()) {
    const F = this.faseLua(dia, h);
    // a lua anda ~12° por dia atrás do sol: cheia, do lado oposto (nasce quando o sol se põe)
    const d = this.direcao((h - 12) * Math.PI / 12 - F.fase * Math.PI * 2, -this.declinacao(dia) * 0.8);
    return { dir: d, el: Math.asin(Math.max(-1, Math.min(1, d[2]))), az: Math.atan2(d[1], d[0]), fase: F.fase, luz: F.luz };
  },
  // Transmitância da atmosfera para um astro na elevação el: [r, g, b] (massa de ar de Kasten e Young)
  transmitancia(el) {
    const g = Math.max(el * 180 / Math.PI, -2.5);
    const m = Math.min(38, 1 / (Math.max(Math.sin(Math.max(el, -0.04)), 0) + 0.50572 * Math.pow(g + 6.07995, -1.6364)));
    return this.BETA.map((b) => Math.exp(-b * m * 0.55));
  },
  sm(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); },
  // Céu fechado pelo clima (0 limpo, 1 tempestade): sombras fracas e difusas
  nuvens() {
    if (typeof WorldTime === 'undefined' || !World || !World.state) return 0;
    const F = { chuva: 0.6, tempestade: 0.92, neblina: 0.7, areia: 0.7, nevasca: 0.85, cinzas: 0.55, neve: 0.5 }[WorldTime.clima()] || 0;
    return F * WorldTime.intensidade();
  },
  // O lugar é a céu aberto? (interiores, masmorras, subsolos e salas com teto: luz artificial)
  ceuAberto(R) {
    if (!R) return true;
    const th = R.theme || {};
    if (R.interior || th.subsolo || th.fechado || th.teto) return false;
    return typeof WorldTime !== 'undefined' ? WorldTime.aberto(th) >= 0.55 : true;
  },

  // Estado completo da luz direcional neste momento. R = sala (para saber se há céu)
  estado(R, h = this.hora(), dia = this.dia()) {
    const S = this.sol(h, dia), L = this.lua(h, dia), nuv = this.nuvens();
    // força do sol: some de vez ~4° abaixo do horizonte (o céu ainda clareia depois: crepúsculo)
    const tS = this.transmitancia(S.el);
    const kSol = this.sm(-0.07, 0.1, S.el) * (1 - nuv * 0.55) * (0.62 + 0.4 * tS[0]);   // (baixo, a atmosfera também tira força)
    const corSol = [1.04 * tS[0] / Math.max(tS[0], 0.001), tS[1] / Math.max(tS[0], 0.001), tS[2] / Math.max(tS[0], 0.001)].map((v) => Math.min(1.05, v));
    // lua: azulada, fraca, proporcional à fase (lua nova: só o céu estrelado)
    const kLua = this.sm(-0.05, 0.18, L.el) * (0.12 + 0.3 * L.luz) * (1 - nuv * 0.7) * (1 - this.sm(-0.12, 0.05, S.el));
    const corLua = [0.62, 0.72, 1.0];
    // chave: direção ponderada pela força de cada um (no crepúsculo os dois estão fracos: sem salto)
    const ws = kSol * 4, wl = kLua, dir = [S.dir[0] * ws + L.dir[0] * wl, S.dir[1] * ws + L.dir[1] * wl, Math.max(S.dir[2], 0.04) * ws + Math.max(L.dir[2], 0.04) * wl];
    let q = Math.hypot(dir[0], dir[1], dir[2]);
    if (q < 1e-4) { dir[0] = 0.2; dir[1] = 0.1; dir[2] = 1; q = Math.hypot(0.2, 0.1, 1); }
    // a luz nunca vem de baixo do chão: no máximo rasante (o sol "deita" no horizonte)
    dir[0] /= q; dir[1] /= q; dir[2] /= q;
    if (dir[2] < 0.06) { dir[2] = 0.06; const r = Math.hypot(dir[0], dir[1]) / Math.sqrt(1 - 0.0036); dir[0] /= r; dir[1] /= r; }
    const cor = [corSol[0] * kSol + corLua[0] * kLua, corSol[1] * kSol + corLua[1] * kLua, corSol[2] * kSol + corLua[2] * kLua];
    const forte = Math.max(kSol, kLua * 0.9);
    // sombras: forte com céu limpo e sol alto; de noite, só o luar (claras); com nuvens, difusas
    const forca = Math.min(1, (kSol * 0.92 + kLua * 1.6) * (1 - nuv * 0.75));
    const suave = 1 + (1 - this.sm(0.05, 0.9, S.el)) * 1.6 * (kSol > kLua ? 1 : 0) + nuv * 3 + (kSol > kLua ? 0 : 1.5);
    const v = {
      hora: h, periodo: this.periodo(h), aberto: this.ceuAberto(R), nuvens: nuv,
      sol: { dir: S.dir, el: S.el, az: S.az, k: kSol, cor: corSol },
      lua: { dir: L.dir, el: L.el, az: L.az, k: kLua, cor: corLua, fase: L.fase, luz: L.luz },
      chave: { dir, cor, k: forte },
      sombra: { forca, suave, comprimento: 1 / Math.tan(Math.max(Math.asin(dir[2]), 0.06)) },
      // hora dourada (o céu e a névoa esquentam) e crepúsculo (azul-violeta logo depois do pôr)
      dourado: this.sm(0.0, 0.05, S.el + 0.05) * (1 - this.sm(0.1, 0.38, S.el)),
      crepusculo: this.sm(-0.33, -0.12, S.el) * (1 - this.sm(-0.07, 0.02, S.el)),   // (até ~18° abaixo do horizonte: 18:00 → 19:15)
    };
    if (!v.aberto) {
      // Lugar fechado: luz artificial do teto (direção quase vertical, sombras curtas e macias)
      const th = (R && R.theme) || {}, lc = typeof th.lamp === 'string' ? th.lamp.split(',').map((x) => Math.min(1, x / 255 * 0.5 + 0.55)) : [1, 0.95, 0.85];
      v.chave = { dir: [0.24, 0.16, 0.957], cor: lc, k: 0.85 };
      v.sombra = { forca: 0.62, suave: 2.6, comprimento: 0.3 };
      v.artificial = true;
    }
    this._v = v;
    return v;
  },
  // Para os testes e o painel de depuração: um resumo
  resumo(R) {
    const v = this.estado(R), f = (a) => a.map((x) => +x.toFixed(2));
    return { hora: +v.hora.toFixed(2), periodo: v.periodo, aberto: v.aberto, solEl: +(v.sol.el * 180 / Math.PI).toFixed(1), solK: +v.sol.k.toFixed(2), luaK: +v.lua.k.toFixed(2), chave: f(v.chave.dir), cor: f(v.chave.cor), sombra: +v.sombra.forca.toFixed(2), suave: +v.sombra.suave.toFixed(2) };
  },
};
if (typeof window !== 'undefined') { window.Sol = Sol; window.SOL_HORARIOS = SOL_HORARIOS; }
