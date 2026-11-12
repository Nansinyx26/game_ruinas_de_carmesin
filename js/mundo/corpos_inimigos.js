'use strict';
// ECLIPSE ZERO · Inimigos com o corpo dos GLB enviados (CorposInimigos)
// ---------------------------------------------------------------------------
// Os zumbis de assets/extra e de assets/Creatures/Enemies (malhas do Meshy, sem esqueleto) recebem o
// esqueleto do jogo pelo conversor de corpo inteiro (tools/importar_criacao.py --so zumbi …, a lista
// em tools/meshy/npcs.json) e viram o CORPO de variantes de inimigo (js/mundo/variantes.js, campo
// corpo): a IA, os golpes e os números continuam os do tipo base; o que se vê é o modelo enviado,
// com textura própria, andando cambaleante, dando o bote com os dois braços e caindo ao morrer
// (poses zb_* de js/models/kael.js). Nada de modelo provisório: enquanto o arquivo do corpo chega
// (pedido na carga da zona), o inimigo ainda está saindo do chão.
// Cada inimigo leva um corpo de vitrine (um Player fora do jogo, como os moradores do
// js/mundo/npc3d.js) que recebe a posição, o giro e o estado dele.
// Desmembramento (js/mundo/desmembrar.js): as peles do corpo são separadas por membro; a parte que
// sai fica oculta no corpo e vira um pedaço solto com física própria.
// ---------------------------------------------------------------------------
const CorposInimigos = {
  defs: {},
  MORTE: 1.5,   // segundos da queda antes de sumir
  // jeito de andar de cada corpo: curva (curvado), bracos (1 estendidos, 0 pendurados), manca
  JEITO: {
    zumbi: { curva: 0.3, bracos: 1, manca: 0.5 }, zumbi_mulher: { curva: 0.2, bracos: 0.85, manca: 0.15 }, zumbi_errante: { curva: 0.25, bracos: 0.7, manca: 0.3 },
    zumbi_bruto: { curva: 0.6, bracos: 0.15, manca: 0.1 }, zumbi_pesadelo: { curva: 0.45, bracos: 0.55, manca: 0 }, zumbi_ossos: { curva: 0.5, bracos: 0.35, manca: 0.6 },
  },
  ok() { return typeof PersonagemModelo !== 'undefined' && typeof Criacao3D !== 'undefined' && typeof Player !== 'undefined' && typeof persAparenciaPadrao === 'function'; },
  corpoDe(e) { const V = e && e.variante && typeof ENEMY_VARIANTS !== 'undefined' ? ENEMY_VARIANTS[e.variante] : null; return (V && V.corpo) || null; },
  // Modelo do corpo do inimigo (registrado na primeira vez) ou null (variante sem corpo enviado)
  chave(e) {
    const id = this.corpoDe(e);
    if (!id) return null;
    let d = this.defs[id];
    if (d === undefined) {
      if (!this.ok() || !Criacao3D.disponivel(id)) { if (!this._avisou) { this._avisou = true; console.error(`CorposInimigos: corpo '${id}' não está no catálogo da criação (rode tools/importar_criacao.py --so ${id})`); } return null; }
      d = { id: 'ini_' + id, name: id, model: 'ini_' + id, base: 'npc', classe: 'guerreiro', npc: true, stats: { hp: 100, energy: 100, speed: 200, radius: 14 },
        aparencia: Object.assign(persAparenciaPadrao('guerreiro'), { npc: id, estilo: 0, altura: 2, porte: 1 }), roupa: {} };
      if (!Criacao3D.usa(d)) { this.defs[id] = null; return null; }
      PersonagemModelo.registrar(d);
      const M = MODELS3D[d.model], pose0 = M.pose, opts0 = M.opts, build0 = M.build;
      M.build = () => { const m = build0(); if (m) { m.pecas = null; m.mixProprio = true; } return m; };   // só o corpo enviado (sem peças do Arsenal)
      M.pose = (m, en, o) => {
        pose0(m, this.corpo(en, d), o);
        if (typeof Desmembrar !== 'undefined') Desmembrar.aplicar(m, en);   // membros que já saíram: ocultos no corpo
      };
      M.opts = (en) => {
        const b = opts0(this.corpo(en, d)), O = en._oCorpo || (en._oCorpo = {});
        for (const k in O) delete O[k];
        Object.assign(O, b);
        if (en.flash > 0) O.flash = 0.85;
        O.cache = 0;
        return O;
      };
      M.glows = null; M.semTinta = true;
      this.defs[id] = d;
    }
    if (!d) return null;
    e.corpoGLB = id;
    return d.model;
  },
  // Corpo de vitrine do inimigo: o estado dele → as poses do esqueleto
  corpo(e, d) {
    if (!e) return null;
    let c = e._corpo;
    if (!c) {
      c = e._corpo = new Player(e.x, e.y, d);
      c.vitrine = true; c.wpnOut = false; c.pecasPrevia = d.roupa; c.idleVariant = 'idle_breathing'; c.idleBlend = 0;
      c.zb = Object.assign({ fase: 0 }, this.JEITO[e.corpoGLB] || this.JEITO.zumbi);
    }
    const st = e.state, v = Math.hypot(e.vx || 0, e.vy || 0);
    let S = 'zb_andar';
    if (st === 'dying') S = 'dead';
    else if (st === 'stun') S = 'zb_tonto';
    else if (st === 'windup' || st === 'attack' || st === 'recover') {
      S = 'zb_ataque';
      c.zb.fase = st === 'windup' ? Math.min(1, e.stateTime / 0.3) : st === 'attack' ? 1 + Math.min(1, e.stateTime / 0.12) : 2 + Math.min(1, e.stateTime / 0.4);
    }
    if (c.state !== S) c.stateTime = 0;
    c.state = S;
    c.x = e.x; c.y = e.y; c.z = e.z || 0; c.facing = c.viewFacing = e.facing;
    c.animTime = e.animTime; c.stateTime = e.stateTime;
    c.moveSpeed = st === 'dash' ? Math.max(v, 160) : v;
    c.vx = e.vx || 0; c.vy = e.vy || 0;
    c.hp = st === 'dying' ? 0 : c.maxHp; c.flash = 0;
    return c;
  },
  // Carga da zona: pede de antemão os corpos dos inimigos que já estão nela (e os dos bandos dela)
  aoCarregar(z) {
    if (typeof game === 'undefined' || !game.enemies || !this.ok()) return;
    for (const e of game.enemies) this.chave(e);
    const L = (z && z.mobs) || [];
    for (const t of L) { const V = typeof ENEMY_VARIANTS !== 'undefined' && ENEMY_VARIANTS[t]; if (V && V.corpo && Criacao3D.disponivel(V.corpo)) Criacao3D.carregar(V.corpo); }
  },
};
