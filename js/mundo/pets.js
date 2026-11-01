'use strict';
// ECLIPSE ZERO · Mundo aberto: animais de companhia (Pets)
// ---------------------------------------------------------------------------
// Três categorias de animais no projeto: COMPANHIA (seguem o herói), DOMÉSTICOS das cidades e
// MONTARIAS. Nesta etapa, os de companhia, com os modelos do Blender que já existem
// (js/mundo/criaturas3d.js):
//   Asa Noturna (ave exótica rara, da malha do Meshy com retopologia e rig de ave) e
//   Lobo da Muralha (lobo cinzento criado pelos guardas, modelado no Blender).
// Compra no VIVEIRO DOS ALVES (Bairro da Muralha, js/mundo/bairro.js): a tratadora Cora vende,
// guarda e devolve os animais; os da vitrine ficam lá dentro, em 3D. O preço é em CÉLULAS
// (Oficios.cobrar: a mesma moeda do resto do jogo).
// O companheiro ativo segue o herói (atrás e de lado; voa se for ave; fica para trás e longe da
// luta; reaparece ao lado na troca de zona) e tem NECESSIDADES: fome, humor e afinidade. [E] perto
// dele: alimentar (petisco), brincar, carinho, ficar/seguir, ver como está, mudar o nome e
// guardar no viveiro. Parado, ele senta; à noite, dorme; com fome, fica abatido. Nada disso dá
// vantagem de combate (o pedido: sem vantagens exageradas).
// Estado: World.state.pets (salvo com o mundo de cada personagem).
// ---------------------------------------------------------------------------
const PETS_ESPECIES = {
  asa_noturna: {
    nome: 'Asa Noturna', categoria: 'companhia', modelo: 'asa_noturna', preco: 2400, raridade: 'rara', voa: true, escala: 0.62,
    desc: 'Ave das torres de neon. As penas guardam a luz do dia e brilham à noite. Rara: o viveiro recebe uma por estação.',
    nomes: ['Lume', 'Cobalto', 'Nyx', 'Safira', 'Vega'],
    clipes: { parado: 'idle', andar: 'andar', voar: 'voar', planar: 'planar', sentar: 'sentar', dormir: 'dormir', comer: 'comer', brincar: 'brincar', carinho: 'carinho', chamar: 'chamar' },
  },
  lobo_manso: {
    nome: 'Lobo da Muralha', categoria: 'companhia', modelo: 'lobo_cinzento', preco: 900, raridade: 'comum', voa: false, escala: 0.82,
    desc: 'Lobo cinzento criado desde filhote pelos guardas da muralha. Leal, guloso e medroso com trovão.',
    nomes: ['Brasa', 'Trovão', 'Cinza', 'Fumaça', 'Farol'],
    clipes: { parado: 'idle', andar: 'andar', trotar: 'trotar', correr: 'correr', sentar: 'sentar', dormir: 'dormir', comer: 'comer', brincar: 'brincar', carinho: 'carinho', chamar: 'uivar' },
  },
};
const PET_PETISCO = 6;   // células por petisco

const Pets = {
  // ------------------------------------------------------------------ estado
  S() {
    const W = World.state;
    if (!W.pets) W.pets = { lista: [], ativo: null, uid: 1 };
    return W.pets;
  },
  ativo() { const S = this.S(); return S.lista.find((p) => p.uid === S.ativo) || null; },
  companheiro() { return game.npcs.find((n) => n instanceof CompanheiroPet) || null; },
  nomeLimpo(t) { return String(t || '').replace(/[^\p{L}\p{N} '\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16); },

  // ------------------------------------------------------------------ viveiro
  comprar(especie, nome) {
    const E = PETS_ESPECIES[especie];
    if (!E) return 'Esse eu não tenho.';
    const S = this.S();
    if (S.lista.length >= 6) return 'O viveiro só guarda seis animais por pessoa.';
    const err = Oficios.cobrar(E.preco);
    if (err) return err;
    const P = { uid: S.uid++, especie, nome: this.nomeLimpo(nome) || E.nomes[0], fome: 20, humor: 75, afinidade: 10 };
    S.lista.push(P);
    this.chamar(P.uid);
    World.save();
    return '';
  },
  chamar(uid) {
    const S = this.S();
    if (!S.lista.some((p) => p.uid === uid)) return;
    S.ativo = uid;
    this.tirarDaZona();
    this.porNaZona();
  },
  guardar() {
    this.S().ativo = null;
    this.tirarDaZona();
    World.save();
  },
  renomear(P, nome) {
    const n = this.nomeLimpo(nome);
    if (!n) return false;
    P.nome = n;
    const c = this.companheiro();
    if (c && c.pet === P) c.name = n;
    return true;
  },
  // ------------------------------------------------------------------ cuidados
  alimentar(P) {
    if (P.fome < 20) return `${P.nome} cheira o petisco e vira a cara. Está satisfeito.`;
    const err = Oficios.cobrar(PET_PETISCO);
    if (err) return err;
    P.fome = Math.max(0, P.fome - 45); P.humor = Math.min(100, P.humor + 8); P.afinidade = Math.min(100, P.afinidade + 3);
    const c = this.companheiro();
    if (c) c.fazer('comer');
    return `${P.nome} come tudo e lambe o focinho.`;
  },
  brincar(P) {
    const c = this.companheiro();
    if (P.fome > 80) return `${P.nome} está com fome demais para brincar.`;
    P.humor = Math.min(100, P.humor + 18); P.fome = Math.min(100, P.fome + 6); P.afinidade = Math.min(100, P.afinidade + 2);
    if (c) c.fazer('brincar');
    return `${P.nome} pula de alegria.`;
  },
  carinho(P) {
    P.humor = Math.min(100, P.humor + 6); P.afinidade = Math.min(100, P.afinidade + 1);
    const c = this.companheiro();
    if (c) c.fazer('carinho');
    return `${P.nome} se encosta na sua mão.`;
  },
  estadoTexto(P) {
    const E = PETS_ESPECIES[P.especie];
    const f = P.fome > 70 ? 'faminto' : P.fome > 40 ? 'com um pouco de fome' : 'alimentado';
    const h = P.humor > 70 ? 'feliz' : P.humor > 35 ? 'tranquilo' : 'abatido';
    const a = P.afinidade > 80 ? 'inseparável' : P.afinidade > 50 ? 'muito ligado a você' : P.afinidade > 20 ? 'confia em você' : 'ainda desconfiado';
    return `${P.nome} (${E.nome}): ${f}, ${h}, ${a}.  Fome ${Math.round(P.fome)} · Humor ${Math.round(P.humor)} · Afinidade ${Math.round(P.afinidade)}`;
  },
  // Necessidades com o tempo de jogo (só a do companheiro ativo muda)
  update(dt) {
    if (!game.world || !World.state) return;
    const P = this.ativo();
    if (!P) return;
    P.fome = Math.min(100, P.fome + dt / 36);   // ~1 h de jogo para a fome encher
    if (P.fome > 70) P.humor = Math.max(0, P.humor - dt / 60);
    else if (P.humor < 60) P.humor = Math.min(60, P.humor + dt / 240);
  },

  // ------------------------------------------------------------------ zona
  tirarDaZona() {
    if (typeof game === 'undefined' || !game.npcs) return;
    game.npcs = game.npcs.filter((n) => !(n instanceof CompanheiroPet));
  },
  porNaZona() {
    const P = this.ativo();
    if (!P || !game.world || !game.player) return;
    if (this.companheiro()) return;
    const p = game.player, a = (p.facing || 0) + Math.PI * 0.8;
    const c = new CompanheiroPet(P, p.x + Math.cos(a) * 50, p.y + Math.sin(a) * 50);
    game.room.collide(c, false);
    game.npcs.push(c);
  },
  // Troca de zona: o companheiro chega junto; no viveiro, os animais da vitrine
  aoCarregar(z) {
    this.S();
    this.porNaZona();
    if (z && z.id === 'aurora_animais') this.vitrine();
  },
  vitrine() {
    const R = game.room;
    for (const [esp, fx, fy, pose] of [['asa_noturna', 0.45, 0.4, 'sentar'], ['lobo_manso', 0.7, 0.2, 'dormir'], ['asa_noturna', 0.64, 0.64, 'parado']]) {
      const v = new VitrinePet(esp, R.w * fx, R.h * fy, pose);
      game.npcs.push(v);
    }
  },

  // ------------------------------------------------------------------ conversas
  // [E] no companheiro
  conversar(c) { this.menu(c, c.pet, null); },
  menu(c, P, texto) {
    const v = (t) => this.menu(c, P, t);
    const o = [
      { id: 'alimentar', tag: '♨', txt: `Dar um petisco (${PET_PETISCO} células)`, fn: () => v(this.alimentar(P)) },
      { id: 'brincar', tag: '★', txt: 'Brincar', fn: () => v(this.brincar(P)) },
      { id: 'carinho', tag: '✚', txt: 'Fazer carinho', fn: () => v(this.carinho(P)) },
      c.modo === 'ficar' ? { id: 'seguir', txt: 'Vem comigo!', fn: () => { c.modo = 'seguir'; v(`${P.nome} vem atrás de você.`); } }
        : { id: 'ficar', txt: 'Fica aqui.', fn: () => { c.modo = 'ficar'; c.fazer('sentar'); v(`${P.nome} senta e espera.`); } },
      { id: 'chamar', txt: 'Chamar a atenção (comando)', fn: () => { c.fazer('chamar'); v(`${P.nome} responde ao chamado.`); } },
      { id: 'nome', txt: 'Mudar o nome', fn: () => this.menuNome(P, () => v(`Agora é ${P.nome}.`)) },
      { id: 'guardar', txt: 'Deixar no Viveiro dos Alves', fn: () => { this.guardar(); Dialogo.fechar(); game.hud.toast(`${P.nome} foi para o Viveiro dos Alves`, '170,220,255'); } },
      { id: 'sair', txt: 'Até já.', fn: () => Dialogo.fechar() },
    ];
    const t = (texto ? texto + '\n\n' : '') + this.estadoTexto(P);
    if (Dialogo.aberto) Dialogo.mostrar(t, o); else Dialogo.abrir(c, t, o, PETS_ESPECIES[P.especie].nome);
  },
  // Nome: sugestões da espécie ou digitado (quando o navegador deixa)
  menuNome(P, fim) {
    const E = PETS_ESPECIES[P.especie];
    const o = E.nomes.filter((n) => n !== P.nome).slice(0, 4).map((n, i) => ({ id: 'n' + i, txt: n, fn: () => { this.renomear(P, n); fim(); } }));
    if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
      o.push({ id: 'digitar', txt: 'Digitar outro nome…', fn: () => { const n = window.prompt('Nome do animal (até 16 letras):', P.nome); if (n && this.renomear(P, n)) fim(); else fim(); } });
    }
    o.push({ id: 'manter', txt: `Manter "${P.nome}"`, fn: fim });
    Dialogo.mostrar(`Como vai se chamar? (agora: ${P.nome})`, o);
  },
  // Serviço da tratadora (Povo.servico → Bairro.servico): catálogo, compra, guardar e retirar
  servico(npc, s, o, volta) {
    if (s !== 'animais') return false;
    o.push({ id: 'catalogo', tag: '$', txt: 'Ver os animais à venda', fn: () => this.catalogo(npc, volta) });
    const S = this.S();
    if (S.lista.length) o.push({ id: 'meus', tag: '✚', txt: `Seus animais (${S.lista.length})`, fn: () => this.meus(npc, volta) });
    return true;
  },
  catalogo(npc, volta) {
    const o = Object.keys(PETS_ESPECIES).map((esp) => {
      const E = PETS_ESPECIES[esp];
      return { id: 'ver_' + esp, tag: '$', txt: `${E.nome} — ${E.preco} células (${E.raridade})`, fn: () => this.ver(npc, esp, volta) };
    });
    o.push({ id: 'voltar', txt: 'Voltar', fn: () => volta('Fique à vontade. Eles gostam de visita.') });
    Dialogo.mostrar('Os da vitrine estão aqui dentro: pode olhar de perto. Qual quer conhecer?', o);
  },
  ver(npc, esp, volta) {
    const E = PETS_ESPECIES[esp], cel = game.stats.soulsBank;
    Dialogo.mostrar(`${E.nome} (${E.categoria}, ${E.raridade}). ${E.desc}\nPreço: ${E.preco} células. Você tem ${cel}.`, [
      { id: 'comprar', tag: '$', txt: `Comprar por ${E.preco} células`, off: cel < E.preco ? `faltam ${E.preco - cel} células` : null, fn: () => this.confirmar(npc, esp, volta) },
      { id: 'voltar', txt: 'Ver os outros', fn: () => this.catalogo(npc, volta) },
    ]);
  },
  confirmar(npc, esp, volta) {
    const E = PETS_ESPECIES[esp];
    Dialogo.mostrar(`Confirma? ${E.preco} células pelo ${E.nome}. Ele vai com você, e pode voltar para cá quando quiser.`, [
      { id: 'sim', tag: '$', txt: 'Sim, confirmo a compra', fn: () => {
        const err = this.comprar(esp, E.nomes[0]);
        if (err) { volta(err); return; }
        const P = this.ativo();
        this.menuNome(P, () => volta(`${P.nome} é seu. Petisco duas vezes por dia, carinho sempre. E nada de luta: ${E.voa ? 'ela voa para longe' : 'ele fica para trás'} quando o aço sai da bainha.`));
      } },
      { id: 'nao', txt: 'Ainda não', fn: () => this.catalogo(npc, volta) },
    ]);
  },
  meus(npc, volta) {
    const S = this.S();
    const o = S.lista.map((P, i) => {
      const at = S.ativo === P.uid;
      return { id: 'pet' + i, tag: at ? '★' : '✚', txt: at ? `${P.nome} (${PETS_ESPECIES[P.especie].nome}) — com você: deixar aqui` : `${P.nome} (${PETS_ESPECIES[P.especie].nome}) — levar com você`,
        fn: () => { if (at) { this.guardar(); volta(`${P.nome} fica comigo. Volte para buscar.`); } else { this.chamar(P.uid); volta(`${P.nome} sai correndo atrás de você.`); } } };
    });
    o.push({ id: 'voltar', txt: 'Voltar', fn: () => volta('Mais alguma coisa?') });
    Dialogo.mostrar('Os seus ficam no cercado dos fundos. Quem vai com você?', o.slice(0, 9));
  },

  // ------------------------------------------------------------------ HUD
  desenharHud(ctx, x, y) {
    const P = game.world && World.state && World.state.pets ? this.ativo() : null;
    if (!P) return;
    const w = 150, h = 34;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(8,10,16,0.72)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#cfe6ff';
    ctx.font = `bold 11px ${FONT_UI}`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`${P.nome}`, x + 6, y + 3);
    const barra = (i, v, cor, rot) => {
      const bx = x + 6 + i * 48, by = y + 20;
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(bx, by, 42, 5);
      ctx.fillStyle = cor; ctx.fillRect(bx, by, 42 * Math.max(0, Math.min(1, v / 100)), 5);
      ctx.fillStyle = 'rgba(220,230,255,0.75)'; ctx.font = `9px ${FONT_UI}`; ctx.fillText(rot, bx, by + 6);
    };
    barra(0, 100 - P.fome, '#ffb860', 'alimento');
    barra(1, P.humor, '#7dffb0', 'humor');
    barra(2, P.afinidade, '#9fd0ff', 'afinidade');
    ctx.restore();
  },
};

// O companheiro no mundo: segue, voa (ave), senta, dorme, come, brinca
class CompanheiroPet extends NPC {
  constructor(P, x, y) {
    super({ model: 'civil', name: P.nome, lines: ['…'] }, x, y);
    this.pet = P; this.E = PETS_ESPECIES[P.especie];
    this.key = null; this.escala = this.E.escala; this.height = this.E.voa ? 26 : 30; this.radius = 9;
    this.papel = this.E.nome; this.verb = 'Cuidar'; this.lightRgb = '170,220,255';
    this.vx = 0; this.vy = 0; this.alt = 0; this.modo = 'seguir'; this.acao = null; this.acaoT = 0; this.paradoT = 0; this.state = 'idle';
    this.lado = Math.random() < 0.5 ? 1 : -1;
  }
  canTalk() { return !game.combatActive(); }
  talk() { Pets.conversar(this); }
  // ação de uma vez (o clipe inteiro): comer, brincar, carinho, chamar
  fazer(a) {
    const c = this.E.clipes[a];
    if (!c) return;
    if (a === 'sentar') { this.paradoT = 99; return; }
    this.acao = a; this.acaoT = 0;
  }
  update(dt) {
    this.animTime += dt; this.stateTime += dt;
    const id = this.E.modelo;
    if (typeof Criaturas3D !== 'undefined') { if (Criaturas3D.pronto(id)) this.key = 'cri_' + id; else Criaturas3D.carregar(id); }
    const p = game.player, luta = game.combatActive();
    if (this.acao) {
      this.acaoT += dt;
      const C = Criaturas3D.dados[id], cl = C && C.clipes[this.E.clipes[this.acao]];
      if (!cl || this.acaoT > cl.d) this.acao = null;
    }
    // alvo: atrás do herói e de lado; na luta, mais longe (e a ave, mais alto)
    let tx = this.x, ty = this.y;
    if (this.modo === 'seguir') {
      const a = (p.facing || 0) + Math.PI + this.lado * 0.9, r = luta ? 130 : 78;
      tx = p.x + Math.cos(a) * r; ty = p.y + Math.sin(a) * r;
    }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    if (d > 700) { this.x = tx; this.y = ty; this.vx = this.vy = 0; }   // ficou muito para trás: aparece perto
    const vmax = this.E.voa ? 300 : 280;
    const alvoV = this.acao ? 0 : d > 18 ? Math.min(vmax, (d - 12) * 2.6) : 0;
    const k = 1 - Math.exp(-6 * dt);
    this.vx += ((d > 1 ? dx / d : 0) * alvoV - this.vx) * k;
    this.vy += ((d > 1 ? dy / d : 0) * alvoV - this.vy) * k;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (!this.E.voa || this.alt < 6) game.room.collide(this, false);
    const v = Math.hypot(this.vx, this.vy);
    if (v > 12) this.facing = angleLerp(this.facing, Math.atan2(this.vy, this.vx), 1 - Math.exp(-8 * dt));
    else if (Math.hypot(p.x - this.x, p.y - this.y) < 200) this.facing = angleLerp(this.facing, Math.atan2(p.y - this.y, p.x - this.x), 1 - Math.exp(-2 * dt));
    // ave: voa quando anda longe ou na luta; pousa perto e parada
    if (this.E.voa) {
      const alvoAlt = luta ? 70 : (v > 70 || d > 90) ? 34 : 0;
      this.alt += (alvoAlt - this.alt) * (1 - Math.exp(-3 * dt));
    }
    this.paradoT = v < 12 && !this.acao ? this.paradoT + dt : 0;
    this.state = v > 12 ? 'walk' : 'idle';
  }
  // clipe pelo comportamento (Criaturas3D.escolher pergunta aqui primeiro)
  petClipe(S, C, dt) {
    const K = this.E.clipes, d = (n) => (C.clipes[n] ? C.clipes[n].d : 1), tem = (n) => !!C.clipes[n];
    if (this.acao && tem(K[this.acao])) return [K[this.acao], Math.min(this.acaoT, d(K[this.acao]))];
    const v = Math.hypot(this.vx, this.vy);
    if (this.E.voa && this.alt > 6) {
      const n = v > 140 || this.alt < 30 ? K.voar : K.planar;
      S.fl = (S.fl + dt / d(n)) % 1;
      return [n, S.fl * d(n)];
    }
    if (v > 12) {
      const n = v < 90 || !K.trotar ? K.andar : v < 180 || !K.correr ? K.trotar : K.correr;
      S.fl = (S.fl + dt * Math.max(0.6, Math.min(1.6, v / (n === K.andar ? 55 : n === K.trotar ? 115 : 200))) / d(n)) % 1;
      return [n, S.fl * d(n)];
    }
    const h = typeof WorldTime !== 'undefined' ? WorldTime.hora() : 12, noite = h >= 22 || h < 5;
    const P = this.pet;
    let n = K.parado;
    if ((noite && this.paradoT > 10) || this.paradoT > 45) n = K.dormir;
    else if (this.paradoT > 5 || this.modo === 'ficar' || P.humor < 25) n = K.sentar;
    if (!tem(n)) n = K.parado;
    S.fi += dt;
    return [n, S.fi % d(n)];
  }
  drawShadow(ctx) { if (!this.E.voa || this.alt < 50) super.drawShadow(ctx); }
}

// Os animais da vitrine do viveiro (3D, parados numa pose; [E] mostra o preço)
class VitrinePet extends NPC {
  constructor(esp, x, y, pose) {
    super({ model: 'civil', name: PETS_ESPECIES[esp].nome, lines: ['…'] }, x, y);
    this.E = PETS_ESPECIES[esp]; this.esp = esp; this.pose = pose; this.key = null; this.escala = this.E.escala; this.height = 26; this.radius = 9;
    this.papel = 'Vitrine do viveiro'; this.verb = 'Ver'; this.alt = 0; this.vx = 0; this.vy = 0; this.facing = Math.PI * 0.75 + Math.random() * 0.6;
  }
  canTalk() { return true; }
  talk() { game.hud.say(this.E.nome, `${this.E.desc} Preço: ${this.E.preco} células — fale com a Cora no balcão.`, 4.8, 0, true); }
  update(dt) {
    this.animTime += dt;
    const id = this.E.modelo;
    if (Criaturas3D.pronto(id)) this.key = 'cri_' + id; else Criaturas3D.carregar(id);
  }
  petClipe(S, C, dt) {
    const n = this.E.clipes[this.pose] && C.clipes[this.E.clipes[this.pose]] ? this.E.clipes[this.pose] : 'idle', c = C.clipes[n];
    S.fi += dt;
    return [n, c ? S.fi % c.d : 0];
  }
}
