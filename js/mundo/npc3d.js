'use strict';
// ECLIPSE ZERO · Mundo aberto: modelos 3D próprios dos moradores importantes (NpcModelo)
// ---------------------------------------------------------------------------
// Fase 3 da expansão (docs/EXPANSAO_MUNDO_ABERTO.md). Os moradores importantes do Bairro da
// Muralha deixam o modelo genérico de sobrevivente e ganham corpo próprio, montado com as MESMAS
// peças GLB da criação de personagem (js/criacao/montagem.js: corpo, rosto, cabelo, barba e as
// roupas e armaduras do catálogo), no esqueleto do Kael, com aparência e roupa de cada um:
//   Bento (taverneiro), Cosme (bardo), Rosa (estalajadeira), a Conselheira Helena, a Capitã
//   Irene e os guardas Rui e Marta (os turnos da muralha).
// A pose vem do esqueleto do Kael (js/models/kael.js), com as posturas da rotina (sentar,
// comer, beber, falar, ouvir, guarda em sentido, dormir): cada morador leva um corpo de vitrine
// (um Player sem jogo, como o retrato da criação) que recebe a posição, o giro e o estado dele.
// Custo: um corpo destes tem 50 a 65 mil triângulos com pele; parado, a pele é refeita só a cada
// fração de segundo (R3D: o.cache) e, andando, a cada poucos quadros. Os modelos dos ausentes
// são liberados na troca de zona (atlas de 2048 px por morador). Sem as peças da criação (ou sem
// o motor 3D) o morador fica com o modelo de sempre.
// ---------------------------------------------------------------------------
const NPC3D = {
  aur_bento: { ap: { corpoG: 0, rostoG: 3, cabeloG: 19, barbaG: 9, pele: 3, corCabelo: 1, corBarba: 0, olhos: 0, porte: 2, altura: 1 },
    roupa: { peitoral: 'ini_peitoral', calcas: 'ini_calca', botas: 'ini_botas' } },
  aur_cosme: { ap: { corpoG: 0, rostoG: 1, cabeloG: 13, barbaG: 11, pele: 1, corCabelo: 3, corBarba: 0, olhos: 2, porte: 0, altura: 3 },
    roupa: { peitoral: 'n30_patrulheiro_peitoral', calcas: 'ini_calca', botas: 'ini_botas', capa: 'ini_capa' } },
  aur_rosa: { ap: { corpoG: 1, rostoG: 4, cabeloG: 14, barbaG: 0, pele: 1, corCabelo: 2, olhos: 1, porte: 1, altura: 1 },
    roupa: { peitoral: 'ini_peitoral', calcas: 'n30_mago_calcas', botas: 'ini_botas' } },
  aur_helena: { ap: { corpoG: 1, rostoG: 5, cabeloG: 11, barbaG: 0, pele: 2, corCabelo: 4, olhos: 3, porte: 1, altura: 2 },
    roupa: { peitoral: 'n50_mago_peitoral', calcas: 'n50_mago_calcas', botas: 'n50_mago_botas', capa: 'n50_mago_capa' } },
  aur_irene: { ap: { corpoG: 1, rostoG: 6, cabeloG: 15, barbaG: 0, pele: 4, corCabelo: 0, olhos: 4, porte: 2, altura: 3 },
    roupa: { peitoral: 'n50_guerreiro_peitoral', calcas: 'n50_guerreiro_calcas', botas: 'n50_guerreiro_botas', luvas: 'n50_guerreiro_luvas', capa: 'n50_guerreiro_capa' } },
  aur_rui: { ap: { corpoG: 0, rostoG: 0, cabeloG: 20, barbaG: 6, pele: 2, corCabelo: 1, corBarba: 0, olhos: 0, porte: 1, altura: 2 },
    roupa: { peitoral: 'n30_guerreiro_peitoral', calcas: 'n30_guerreiro_calcas', botas: 'n30_guerreiro_botas', luvas: 'n30_guerreiro_luvas', capa: 'n30_guerreiro_capa' } },
  aur_marta: { ap: { corpoG: 1, rostoG: 7, cabeloG: 15, barbaG: 0, pele: 5, corCabelo: 0, olhos: 6, porte: 1, altura: 2 },
    roupa: { peitoral: 'n30_guerreiro_peitoral', calcas: 'n30_guerreiro_calcas', botas: 'n30_guerreiro_botas', luvas: 'n30_guerreiro_luvas', capa: 'n30_guerreiro_capa' } },
};

const NpcModelo = {
  defs: {},
  // Estado do morador → estado do corpo no esqueleto do Kael (e a ação da postura)
  ESTADOS: { walk: ['run', null], talk: ['npc_falar', null], listen: ['npc_falar', 'ouvir'], sit: ['npc_sentar', null], eat: ['npc_sentar', 'comer'],
    drink: ['npc_sentar', 'beber'], sleep: ['npc_dormir', null], guard: ['npc_guarda', null], fear: ['block', null], idle: ['idle', null] },
  ok() { return typeof PersonagemModelo !== 'undefined' && typeof Criacao3D !== 'undefined' && typeof Player !== 'undefined' && typeof persAparenciaPadrao === 'function'; },
  // Chave do modelo próprio do morador (registrada na primeira vez) ou null (fica o de sempre)
  chave(P) {
    const N = P && NPC3D[P.id];
    if (!N || !this.ok()) return null;
    let d = this.defs[P.id];
    if (d === undefined) {
      d = { id: 'npc_' + P.id, name: P.nome, model: 'npc_' + P.id, base: 'npc', classe: 'guerreiro', npc: true,
        stats: { hp: 100, energy: 100, speed: 200, radius: 14 }, aparencia: Object.assign(persAparenciaPadrao('guerreiro'), N.ap, { estilo: 0 }) };
      d.roupa = {};
      for (const v in N.roupa) if (Criacao3D.disponivel(N.roupa[v])) d.roupa[v] = { cat: N.roupa[v] };
      if (!Criacao3D.usa(d)) { this.defs[P.id] = null; return null; }   // sem as peças do corpo: o modelo de sempre
      PersonagemModelo.registrar(d);
      const M = MODELS3D[d.model], pose0 = M.pose, opts0 = M.opts, build0 = M.build;
      M.build = () => { const m = build0(); if (m) m.pecas = null; return m; };   // só as peças GLB (sem as procedurais do Arsenal)
      M.pose = (m, e, o) => pose0(m, this.corpo(e, d), o);
      M.opts = (e) => {
        const b = opts0(this.corpo(e, d)), O = e._oNpc || (e._oNpc = {});
        for (const k in O) delete O[k];
        Object.assign(O, b);
        O.cache = e.state === 'walk' ? 0.05 : 0.2;   // a pele refeita a cada 0,2 s parado, a cada 3 quadros andando
        return O;
      };
      M.glows = null;
      this.defs[P.id] = d;
    }
    return d ? d.model : null;
  },
  // Corpo de vitrine do morador: um Player fora do jogo com a posição, o giro e o estado dele
  corpo(e, d) {
    let c = e._corpo;
    if (!c) {
      c = e._corpo = new Player(e.x, e.y, d);
      c.vitrine = true; c.wpnOut = false; c.pecasPrevia = d.roupa; c.idleVariant = 'idle_breathing'; c.idleBlend = 0;
    }
    const S = this.ESTADOS[e.state] || this.ESTADOS.idle;
    if (c.state !== S[0]) c.stateTime = 0;
    c.state = S[0]; c.npcAcao = S[1];
    c.x = e.x; c.y = e.y; c.z = 0; c.facing = c.viewFacing = e.facing;
    c.animTime = e.animTime; c.stateTime = e.stateTime;
    c.moveSpeed = e.state === 'walk' ? 58 : 0; c.vx = e.state === 'walk' ? Math.cos(e.facing) * 38 : 0; c.vy = e.state === 'walk' ? Math.sin(e.facing) * 38 : 0;
    c.assento = e.assento; c.camaZ = e.camaZ; c.camaPe = e.camaPe;
    c.hp = c.maxHp; c.flash = 0;
    return c;
  },
  // Vista isométrica: cada morador destes vira uma FOTO do motor 3D refeita de tempos em tempos
  // (pelo estado: andando, quase todo quadro; falando, comendo ou bebendo, 10 vezes por segundo;
  // parado, 6; sentado, 4; dormindo, 2), em vez de entrar com 50 mil triângulos na fila de todo
  // quadro. Fora da tela, a foto espera. No começo do quadro, uma foto (motor 3D livre).
  INTERVALO: { walk: 0.034, talk: 0.1, eat: 0.1, drink: 0.1, listen: 0.16, idle: 0.16, guard: 0.16, fear: 0.05, sit: 0.25, sleep: 0.5 },
  processar() {
    const g = game;
    if (!g.world || typeof R3D === 'undefined' || !R3D.active || R3D.used || (typeof ThirdView !== 'undefined' && ThirdView.on)) {
      for (const n of g.npcs) if (n.foto3d) n.foto3d = false;
      return;
    }
    const esc = g.roomScale(), agora = g.realTime, cam = g.camera;
    const cx = cam.x, cy = cam.y, mx = VIEW_W / (2 * (cam.zoom || 1)) + 120, my = VIEW_H / (2 * (cam.zoom || 1)) + 160;
    const L = [];
    for (const n of g.npcs) {
      if (!(n instanceof Morador) || !n.key || !n.key.startsWith('npc_') || n.sumiu) continue;
      const m = g.model3(n.key);
      if (!m || m.criaVazio || (m.cria && !Criacao3D.pintado(m))) { n.foto3d = false; continue; }   // peças ainda chegando: a fila normal
      const sx = isoX(n.x, n.y), sy = isoY(n.x, n.y);
      const naTela = Math.abs(sx - cx) < mx && Math.abs(sy - cy) < my;
      if (n.fotoImg && n.fotoEsc === esc) n.foto3d = true;
      const velha = !n.fotoImg || n.fotoEsc !== esc || n.fotoEstado !== n.state || agora - n.fotoT > (this.INTERVALO[n.state] || 0.12);
      if (velha && (naTela || !n.fotoImg)) L.push([n, m, agora - (n.fotoT || 0)]);
    }
    L.sort((a, b) => b[2] - a[2]);   // a mais velha primeiro
    const max = L.length > 1 && L[1][2] > 0.6 ? 2 : 1;   // uma foto por quadro (duas se alguma está muito atrasada)
    for (let i = 0; i < Math.min(max, L.length); i++) {
      const [n, m] = L[i], M = MODELS3D[n.key], o = g.opts3(n, 0);
      Object.assign(o, M.opts(n));
      o.cache = 0;   // (a foto é a pose nova)
      const f = R3D.foto(m, o, esc, M.pose, n);
      if (!f) continue;
      n.fotoImg = f; n.fotoT = agora; n.fotoEsc = esc; n.fotoEstado = n.state; n.foto3d = true;
    }
  },
  // Desenho da foto (Morador.draw, vista isométrica)
  desenhar(ctx, n) {
    const f = n.fotoImg, sx = isoX(n.x, n.y), sy = isoY(n.x, n.y);
    ctx.drawImage(f.canvas, sx + f.minX, sy + f.minY, f.canvas.width / f.s, f.canvas.height / f.s);
  },
  // Troca de zona: libera os modelos (atlas e texturas) dos moradores que não estão nela
  liberar() {
    const aqui = new Set();
    if (typeof game !== 'undefined') for (const n of game.npcs) if (n.key && n.key.startsWith('npc_')) aqui.add(n.key);
    for (const id in this.defs) {
      const d = this.defs[id];
      if (!d || aqui.has(d.model)) continue;
      const M = MODELS3D[d.model];
      if (M && M.model) { if (M.model.tex && typeof R3D !== 'undefined' && R3D.freeTex) R3D.freeTex(M.model.tex); M.model = null; }
    }
  },
};
