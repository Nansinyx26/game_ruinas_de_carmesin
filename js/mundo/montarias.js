'use strict';
// ECLIPSE ZERO · Mundo aberto: montarias (a terceira categoria de animais; js/mundo/pets.js e
// js/mundo/animais_cidade.js são as outras duas)
// ---------------------------------------------------------------------------
// LOBOS DE MONTARIA (a malha do lobo com retopologia, remodelada no esqueleto para um lobo grande e
// robusto, tools/blender/criaturas/especies.py): vendidos na ESTREBARIA DA GUARDA (Bairro da
// Muralha) pelo domador Tobias, com nível mínimo e preço em células:
//   Lobo de Montaria (comum), Lobo de Guerra (raro, nível 30), Lobo da Aurora (lendário, nível 60)
// [E] perto da montaria: montar; montado, [E] ou qualquer golpe: desmontar. Montado, o herói vai
// sentado na sela (pose 'montado' do esqueleto do Kael: quadril na altura da sela, pernas dos
// lados do lombo, mãos nas rédeas), corre mais (×1,6 a ×2) e não luta; a montaria acompanha o
// passo (andar/trotar/correr pela velocidade). Fora da sela, ela segue o herói como um animal de
// companhia. Estado: World.state.montarias.
// CAVALOS: a malha enviada (GLB do Meshy, com sela, manta e rédeas) com retopologia, esqueleto e
// animações no Blender (tools/blender/criaturas/meshy.py). A SELA foi medida na malha: o assento
// (altura e posição ao longo do corpo) e a largura dos estribos vêm em sela/selaY/estribo, e o
// herói senta no assento de verdade. Parado sem cavaleiro, o cavalo pasta (não senta como o lobo).
//   Cavalo castanho (comum), tordilho (incomum, nível 15) e negro (raro, nível 40).
// ---------------------------------------------------------------------------
const MONTARIAS_TIPOS = {
  // medidos na malha (tools/blender/criaturas/meshy.py → cavalo_topologia.json, "sela"): sela =
  // altura do assento (74,5% da altura do modelo, entre o arção e a patilha); selaY = o assento
  // atrás do centro (5,7% do comprimento); estribo = meia largura do lombo abaixo da sela (35% da
  // largura); perna = o quanto os pés descem abaixo do assento (até os estribos)
  cavalo: { nome: 'Cavalo castanho', modelo: 'cavalo', preco: 1800, nivel: 1, vel: 1.75, escala: 1.25, raridade: 'comum',
    sela: 0.745, selaY: 0.057, estribo: 0.35, perna: 21, clipes: { sentar: 'comer' },
    desc: 'Castanho de meias brancas, arreado com sela de couro e manta azul. Manso, resistente e bom de estrada.' },
  cavalo_tordilho: { nome: 'Cavalo tordilho', modelo: 'cavalo_tordilho', preco: 4200, nivel: 15, vel: 1.85, escala: 1.25, raridade: 'incomum',
    sela: 0.745, selaY: 0.057, estribo: 0.35, perna: 21, clipes: { sentar: 'comer' },
    desc: 'Pelo cinza-prateado que clareia com a idade. Atento, rápido na arrancada, não refuga ponte nem rio.' },
  cavalo_negro: { nome: 'Cavalo negro', modelo: 'cavalo_negro', preco: 9000, nivel: 40, vel: 1.95, escala: 1.3, raridade: 'rara',
    sela: 0.745, selaY: 0.057, estribo: 0.35, perna: 21, clipes: { sentar: 'comer' },
    desc: 'Negro de crina longa, dos haras de Asterion. Fôlego de sobra e gênio forte: só aceita quem já provou o seu valor.' },
  lobo_montaria: { nome: 'Lobo de Montaria', modelo: 'lobo_montaria', preco: 2500, nivel: 1, vel: 1.6, escala: 1.65, raridade: 'comum',
    desc: 'Lobo grande da Guarda, criado para carregar batedores. Firme na trilha, paciente com cavaleiro novato.' },
  lobo_guerra: { nome: 'Lobo de Guerra', modelo: 'lobo_guerra', preco: 6000, nivel: 30, vel: 1.8, escala: 1.75, raridade: 'rara',
    desc: 'Negro, com marcas rubras que acendem na corrida. Não teme fogo nem multidão.' },
  lobo_aurora: { nome: 'Lobo da Aurora', modelo: 'lobo_aurora', preco: 15000, nivel: 60, vel: 2.0, escala: 1.8, raridade: 'lendária',
    desc: 'Branco como a primeira luz, com fios dourados que brilham no escuro. Dizem que escolhe o cavaleiro.' },
};
const MONTARIA_CLIPES = { parado: 'idle', andar: 'andar', trotar: 'trotar', correr: 'correr', sentar: 'sentar', dormir: 'dormir', comer: 'comer', brincar: 'brincar', carinho: 'carinho', chamar: 'uivar' };

const Montarias = {
  S() {
    const W = World.state;
    if (!W.montarias) W.montarias = { lista: [], ativa: null };
    return W.montarias;
  },
  ent() { return game.npcs.find((n) => n instanceof MontariaEnt) || null; },
  // ------------------------------------------------------------------ estrebaria
  comprar(tipo) {
    const T = MONTARIAS_TIPOS[tipo], S = this.S();
    if (!T) return 'Esse eu não tenho.';
    if (S.lista.includes(tipo)) return 'Esse já é seu.';
    if (game.activeProgress().level < T.nivel) return `Ele não aceita cavaleiro abaixo do nível ${T.nivel}.`;
    const err = Oficios.cobrar(T.preco);
    if (err) return err;
    S.lista.push(tipo);
    this.chamar(tipo);
    World.save();
    return '';
  },
  chamar(tipo) {
    const S = this.S();
    if (!S.lista.includes(tipo)) return;
    this.desmontar();
    S.ativa = tipo;
    game.npcs = game.npcs.filter((n) => !(n instanceof MontariaEnt));
    this.porNaZona();
  },
  guardar() {
    this.desmontar();
    this.S().ativa = null;
    game.npcs = game.npcs.filter((n) => !(n instanceof MontariaEnt));
    World.save();
  },
  porNaZona() {
    const S = this.S();
    if (!S.ativa || !game.world || !game.player || this.ent()) return;
    const p = game.player, a = (p.facing || 0) + Math.PI * 0.5;
    const m = new MontariaEnt(S.ativa, p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70);
    game.room.collide(m, false);
    game.npcs.push(m);
    if (p.montado) { p.montado = m; m.cavaleiro = p; }   // trocou de zona montado: continua na sela
  },
  aoCarregar(z) {
    if (!game.world || !World.state) return;
    if (z && z.distrito === 'interior') { if (game.player) game.player.montado = null; return; }   // a montaria espera do lado de fora
    this.porNaZona();
  },
  // ------------------------------------------------------------------ montar
  montar(m) {
    const p = game.player;
    if (!m || p.montado || p.state === 'dead' || game.combatActive()) return false;
    p.montado = m; m.cavaleiro = p;
    p.x = m.x; p.y = m.y; p.facing = p.viewFacing = m.facing; p.vx = p.vy = 0;
    p.state = 'idle'; p.stateTime = 0;
    game.audio.play('uiSelect');
    return true;
  },
  desmontar() {
    const p = game.player;
    if (!p || !p.montado) return false;
    const m = p.montado;
    p.montado = null; m.cavaleiro = null;
    // desce do lado esquerdo da montaria
    const a = (m.facing || 0) - Math.PI / 2;
    p.x = m.x + Math.cos(a) * 34; p.y = m.y + Math.sin(a) * 34;
    game.room.collide(p, false);
    p.vx = p.vy = 0;
    return true;
  },
  // velocidade do herói montado
  vel(p) { return p.montado ? p.montado.T.vel : 1; },
  // entidade que o motor 3D posa no lugar do herói montado (a pose 'montado' com a altura da sela)
  proxy(p) {
    if (!p.montado) return p;
    const X = p._proxyMont || (p._proxyMont = Object.create(p));
    X.state = 'montado'; X.stateTime = p.stateTime; X.animTime = p.animTime; X.sela = p.montado.sela(); X.moveSpeed = p.moveSpeed;
    X.estribo = p.montado.estribo(); X.pernaSela = p.montado.T.perna || 13.5;
    return X;
  },
  // ------------------------------------------------------------------ estrebaria (serviço do Tobias)
  servico(npc, s, o, volta) {
    if (s !== 'montarias') return false;
    o.push({ id: 'montarias', tag: '$', txt: 'Ver as montarias', fn: () => this.catalogo(volta) });
    const S = this.S();
    if (S.lista.length) o.push({ id: 'minhas', tag: '✚', txt: `Suas montarias (${S.lista.length})`, fn: () => this.minhas(volta) });
    return true;
  },
  catalogo(volta) {
    const lv = game.activeProgress().level, cel = game.stats.soulsBank, S = this.S();
    const o = Object.keys(MONTARIAS_TIPOS).map((t) => {
      const T = MONTARIAS_TIPOS[t];
      const off = S.lista.includes(t) ? 'já é seu' : lv < T.nivel ? `nível ${T.nivel}` : cel < T.preco ? `faltam ${T.preco - cel} células` : null;
      return { id: 'm_' + t, tag: '$', txt: `${T.nome} (${T.raridade}) — ${T.preco} células`, off, fn: () => this.confirmar(t, volta) };
    });
    o.push({ id: 'voltar', txt: 'Voltar', fn: () => volta('Quando quiser, eles estão no cercado.') });
    Dialogo.mostrar('Cavalos do cercado e os lobos da Guarda. Rápidos na estrada, inúteis na briga: montado, você não luta. Escolha com calma.', o);
  },
  confirmar(t, volta) {
    const T = MONTARIAS_TIPOS[t];
    Dialogo.mostrar(`${T.nome}: ${T.desc}\nVelocidade ×${T.vel}. Preço: ${T.preco} células. Confirma?`, [
      { id: 'sim', tag: '$', txt: 'Sim, confirmo a compra', fn: () => { const e = this.comprar(t); volta(e || `${T.nome} é seu. [E] perto dele para montar; [E] de novo, ou qualquer golpe, para descer.`); } },
      { id: 'nao', txt: 'Ainda não', fn: () => this.catalogo(volta) },
    ]);
  },
  minhas(volta) {
    const S = this.S();
    const o = S.lista.map((t) => ({ id: 'c_' + t, tag: S.ativa === t ? '★' : '✚', txt: S.ativa === t ? `${MONTARIAS_TIPOS[t].nome} — com você: deixar no cercado` : `${MONTARIAS_TIPOS[t].nome} — levar`,
      fn: () => { if (S.ativa === t) { this.guardar(); volta('Fica no cercado. Bem tratado.'); } else { this.chamar(t); volta(`${MONTARIAS_TIPOS[t].nome} vem trotando.`); } } }));
    o.push({ id: 'voltar', txt: 'Voltar', fn: () => volta('Mais alguma coisa?') });
    Dialogo.mostrar('Qual vai com você?', o);
  },
};

// A montaria no mundo: segue o herói (como um animal de companhia) ou o carrega na sela
class MontariaEnt extends NPC {
  constructor(tipo, x, y) {
    super({ model: 'civil', name: MONTARIAS_TIPOS[tipo].nome, lines: ['…'] }, x, y);
    this.tipo = tipo; this.T = MONTARIAS_TIPOS[tipo];
    this.K = Object.assign({}, MONTARIA_CLIPES, this.T.clipes || {});
    this.E = { modelo: this.T.modelo, clipes: this.K, voa: false };
    this.key = null; this.escala = this.T.escala; this.height = 46; this.radius = 16; this.papel = 'Montaria';
    this.vx = 0; this.vy = 0; this.alt = 0; this.paradoT = 0; this.cavaleiro = null; this.state = 'idle';
  }
  get verb() { return this.cavaleiro ? 'Desmontar' : 'Montar'; }
  set verb(v) { /* (o NPC base define verb; aqui é calculado) */ }
  canTalk() { return !game.combatActive() || !!this.cavaleiro; }
  talk() { if (this.cavaleiro) Montarias.desmontar(); else Montarias.montar(this); }
  // altura da sela (onde o quadril do cavaleiro senta), pelo tamanho do modelo: no cavalo, o
  // assento medido na malha; nos lobos, 68% da altura
  sela() { const C = Criaturas3D.dados[this.T.modelo]; return (C ? C.h : 33) * this.escala * (this.T.sela || 0.68); }
  // meia largura do lombo onde as pernas do cavaleiro descem (os pés ficam do lado de fora)
  estribo() { const C = Criaturas3D.dados[this.T.modelo]; return this.T.estribo && C ? Math.max(8.8, C.d * this.escala * this.T.estribo + 1.5) : 8.8; }   // (C.d: a largura; C.w: o comprimento)
  // o assento fica atrás do centro do modelo: a montaria anda à frente do herói essa distância
  recuo() { const C = Criaturas3D.dados[this.T.modelo]; return this.T.selaY && C ? C.w * this.escala * this.T.selaY : 0; }
  update(dt) {
    this.animTime += dt;
    const id = this.T.modelo;
    if (Criaturas3D.pronto(id)) this.key = 'cri_' + id; else Criaturas3D.carregar(id);
    const p = game.player;
    if (this.cavaleiro) {
      // na sela: o lugar e o giro são os do herói; o passo é o dele
      const r = this.recuo();
      this.x = p.x + Math.cos(p.facing || 0) * r; this.y = p.y + Math.sin(p.facing || 0) * r; this.vx = p.vx; this.vy = p.vy; this.facing = p.facing;
      this.paradoT = Math.hypot(p.vx, p.vy) < 10 ? this.paradoT + dt : 0;
      this.state = Math.hypot(p.vx, p.vy) > 10 ? 'walk' : 'idle';
      return;
    }
    // sem cavaleiro: segue atrás e de lado
    const a = (p.facing || 0) + Math.PI + 0.9, r = game.combatActive() ? 150 : 95;
    const tx = p.x + Math.cos(a) * r, ty = p.y + Math.sin(a) * r, dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    if (d > 800) { this.x = tx; this.y = ty; this.vx = this.vy = 0; }
    const alvo = d > 20 ? Math.min(320, (d - 14) * 2.4) : 0, k = 1 - Math.exp(-5 * dt);
    this.vx += ((d > 1 ? dx / d : 0) * alvo - this.vx) * k;
    this.vy += ((d > 1 ? dy / d : 0) * alvo - this.vy) * k;
    this.x += this.vx * dt; this.y += this.vy * dt;
    game.room.collide(this, false);
    const v = Math.hypot(this.vx, this.vy);
    if (v > 12) this.facing = angleLerp(this.facing, Math.atan2(this.vy, this.vx), 1 - Math.exp(-6 * dt));
    this.paradoT = v < 12 ? this.paradoT + dt : 0;
    this.state = v > 12 ? 'walk' : 'idle';
  }
  petClipe(S, C, dt) {
    const K = this.K, d = (n) => (C.clipes[n] ? C.clipes[n].d : 1);
    const v = Math.hypot(this.vx, this.vy) / (this.cavaleiro ? 1.6 : 1);   // (montado, a passada é a de um animal grande)
    if (v > 10) {
      const n = v < 90 ? K.andar : v < 190 ? K.trotar : K.correr;
      S.fl = (S.fl + dt * Math.max(0.6, Math.min(1.7, v / (n === K.andar ? 55 : n === K.trotar ? 115 : 200))) / d(n)) % 1;
      return [n, S.fl * d(n)];
    }
    const n = !this.cavaleiro && this.paradoT > 20 ? K.dormir : !this.cavaleiro && this.paradoT > 6 ? K.sentar : K.parado;
    S.fi += dt;
    return [n, S.fi % d(n)];
  }
}
