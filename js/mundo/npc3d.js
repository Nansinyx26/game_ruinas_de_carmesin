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
  // Cosme, o bardo: o corpo é o GLB enviado (assets/npcs/meshy/Bardo.glb, convertido com o esqueleto
  // do jogo: tools/importar_criacao.py --so npc_bardo) e o alaúde é o GLB enviado
  // (assets/npcs/meshy/alaude_bardo.glb → WEAPON3D.bardo_alaude): nas costas e, cantando, nas mãos
  aur_cosme: { ap: { npc: 'npc_bardo' }, roupa: {},
    props: [{ id: 'bardo_alaude', no: 'torso', g: [-6.4, 1.5, 9], d: [-0.04, -0.5, 0.86], y: [-1, 0, 0], se: (c) => c.state !== 'npc_tocar' },
      { id: 'bardo_alaude', no: 'torso', g: [6.5, 3.5, 4], d: [0.033, -0.783, 0.62], y: [1, 0, 0], se: (c) => c.state === 'npc_tocar' }] },
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
  TOCAR: ['npc_tocar', null],
  ESTADOS: { walk: ['run', null], talk: ['npc_falar', null], listen: ['npc_falar', 'ouvir'], sit: ['npc_sentar', null], eat: ['npc_sentar', 'comer'],
    drink: ['npc_sentar', 'beber'], sleep: ['npc_dormir', null], guard: ['npc_guarda', null], fear: ['block', null], idle: ['idle', null],
    clap: ['npc_palmas', null], dance: ['npc_dancar', null], standDrink: ['npc_falar', 'ouvir'], dj: ['npc_dj', null] },
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
      M.build = () => { const m = build0(); if (m) { m.pecas = null; this.aderecos(m, N); } return m; };   // só as peças GLB (sem as procedurais do Arsenal)
      M.pose = (m, e, o) => {
        const c = this.corpo(e, d);
        pose0(m, c, o);
        if (m.aderecos) for (const q of m.aderecos) q.nd.vis = !q.se || q.se(c);   // (o alaúde nas costas ou nas mãos)
      };
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
  // Adereços do morador (N.props): modelos GLB convertidos pelo importador das armas (WEAPON3D),
  // presos a um osso — g: ponto no osso; d: para onde aponta o comprimento; y: para onde vai a
  // espessura (a frente do instrumento, o lado da arma); se(corpo): quando aparece
  aderecos(m, N) {
    if (!N.props || !m.nodes) return;
    const nor = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    m.aderecos = [];
    N.props.forEach((Q, k) => {
      const pai = m.nodes[Q.no], geo = typeof WeaponRig !== 'undefined' ? WeaponRig.geo(Q.id, !!m.tex) : null;
      if (!pai || !geo) { console.error(`NpcModelo: adereço '${Q.id}' sem modelo convertido (tools/importar_arma.py ${Q.id})`); return; }
      const nd = pai.add(new N3('adereco' + k)), X = nor(Q.d), Y = nor(Q.y);
      let Z = nor([X[1] * Y[2] - X[2] * Y[1], X[2] * Y[0] - X[0] * Y[2], X[0] * Y[1] - X[1] * Y[0]]);
      nd.geo = geo; nd.p = Q.g.slice(); if (Q.e) nd.s = [Q.e, Q.e, Q.e];   // (e: escala da peça)
      // ângulos do nó (como o encaixe das armas, js/heroes/armas3d.js): X ao longo da peça, Z a largura
      const y2 = Z[0] * X[1] - Z[1] * X[0];
      nd.r = [Math.atan2(y2, Z[2]), Math.asin(clamp(-X[2], -1, 1)), Math.atan2(X[1], X[0])];
      m.nodes[nd.name] = nd; m.rest[nd.name] = { p: nd.p.slice(), r: nd.r.slice(), s: nd.s.slice() };
      m.aderecos.push({ nd, se: Q.se });
    });
  },
  // Corpo de vitrine do morador: um Player fora do jogo com a posição, o giro e o estado dele
  corpo(e, d) {
    let c = e._corpo;
    if (!c) {
      c = e._corpo = new Player(e.x, e.y, d);
      c.vitrine = true; c.wpnOut = false; c.pecasPrevia = d.roupa; c.idleVariant = 'idle_breathing'; c.idleBlend = 0;
      const N = e.P && NPC3D[e.P.id]; if (N && N.pose) Object.assign(c, N.pose);   // ajuste da pose pelo corpo (mãos)
    }
    let S = this.ESTADOS[e.state] || this.ESTADOS.idle;
    // cantando na hora da cantoria (js/mundo/rotina.js): toca o alaúde, no compasso e na voz da música
    if (e.P && (e.state === 'talk' || e.state === 'idle') && typeof Rotina !== 'undefined' && Rotina.cantando && Rotina.cantando(e)) {
      S = this.TOCAR;
      c.compasso = Rotina.compasso ? Rotina.compasso() : 2; c.voz = Rotina.voz ? Rotina.voz() : 0.6;
    }
    if (c.state !== S[0]) c.stateTime = 0;
    c.state = S[0]; c.npcAcao = S[1];
    c.x = e.x; c.y = e.y; c.z = 0; c.facing = c.viewFacing = e.facing;
    c.animTime = e.animTime; c.stateTime = e.stateTime;
    c.moveSpeed = e.state === 'walk' ? 58 : 0; c.vx = e.state === 'walk' ? Math.cos(e.facing) * 38 : 0; c.vy = e.state === 'walk' ? Math.sin(e.facing) * 38 : 0;
    c.assento = e.assento; c.camaZ = e.camaZ; c.camaPe = e.camaPe;
    c.danca = e.danca; c.ritmo = e.ritmo; c.fase = e.fase0 || 0; c.refeicaoK = e.refeicaoK; c.temCaneca = e.temCaneca; c.temPrato = e.temPrato; c.bebida = e.bebida; c.semMesa = e.semMesa;   // (a taverna viva)
    c.hp = c.maxHp; c.flash = 0;
    return c;
  },
  // Vista isométrica: cada morador destes vira uma FOTO do motor 3D refeita de tempos em tempos
  // (pelo estado: andando, quase todo quadro; falando, comendo ou bebendo, 10 vezes por segundo;
  // parado, 6; sentado, 4; dormindo, 2), em vez de entrar com 50 mil triângulos na fila de todo
  // quadro. Fora da tela, a foto espera. No começo do quadro, uma foto (motor 3D livre).
  INTERVALO: { walk: 0.034, talk: 0.1, eat: 0.1, drink: 0.1, listen: 0.16, idle: 0.16, guard: 0.16, fear: 0.05, sit: 0.25, sleep: 0.5, clap: 0.08, dance: 0.06, standDrink: 0.16, dj: 0.06 },
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

// ---------------------------------------------------------------------------
// MORADORES GERADOS NO MESHY (tools/meshy/gerar_npcs.py → assets/npcs/meshy/, convertidos por
// tools/importar_criacao.py --so npc_…: corpo inteiro com roupa, rosto e cabelo próprios, no
// esqueleto do jogo pelo mesmo rig automático dos corpos da criação): o ferreiro no Bairro da
// Muralha, a camponesa e o guarda na praça do Refúgio da Aurora e três cyberpunk (a Praça Central
// e o Mercado Neon da Metrópole), com a rotina, as falas e as posturas dos outros moradores. (A
// camponesa e o guarda vieram com os braços quase em T: a conversão baixa os braços para "A" antes
// do rig — abaixar_bracos em tools/importar_criacao.py.)
// ---------------------------------------------------------------------------
(function () {
  const M = [
    { id: 'mes_ferreiro', npc: 'npc_ferreiro', nome: 'OSVALDO', zona: 'aurora_bairro', at: [0.56, 0.62], facing: 2.4, papel: 'Ferreiro ambulante',
      personalidade: 'Fala pouco e mostra muito: tudo o que diz cabe numa martelada.',
      ola: ['Ferradura, prego, dobradiça. Espada não: espada é com a ferraria grande.', 'O fogo da forja esfria se eu parar de falar com você. Brincadeira. Mas nem tanto.'],
      temas: [['Trabalha onde?', 'Onde precisarem. Hoje, nas portas do bairro: metade das dobradiças desta rua fui eu que fiz.']] },
    { id: 'mes_camponesa', npc: 'npc_camponesa', nome: 'LÚCIA', zona: 'aurora', at: [0.46, 0.33], facing: 1.2, papel: 'Camponesa da feira',
      personalidade: 'Prática e risonha; sabe o preço de tudo e o nome de todo mundo.',
      ola: ['Ovos de hoje, pão de ontem, conselho de graça.', 'Se for subir para a floresta, leve um casaco. A névoa de Velmora não perdoa.'],
      temas: [['O que se vende aqui?', 'Do campo para a praça: trigo, lã e ervas. O ferreiro troca dobradiça por queijo, e todo mundo sai ganhando.']] },
    { id: 'mes_guarda', npc: 'npc_guarda', nome: 'BRUNO', zona: 'aurora', at: [0.2, 0.52], facing: 0, papel: 'Guarda da praça',
      personalidade: 'Sério no turno, piadista fora dele.',
      ola: ['Praça segura, viajante. Mantenha a lâmina na bainha.', 'Ronda das seis, ronda das doze, ronda das dezoito. Entre uma e outra, um pão.'],
      temas: [['Tem perigo por aqui?', 'Na praça, não. Passando os portões, cada região tem o seu. Pergunte no quadro de missões antes de sair.']] },
    { id: 'mes_hacker', npc: 'npc_hacker', nome: 'NOVA', zona: 'metro_centro', at: [0.7, 0.36], facing: 3.3, papel: 'Hacker de rua',
      personalidade: 'Rápida, irônica, sempre com um olho no visor.',
      ola: ['Seu chip está desatualizado. Brincadeira. Você nem tem chip. Isso é ótimo, aliás.', 'A praça é segura porque eu deixo ela invisível para eles.'],
      temas: [['O que você faz?', 'Escondo a cidade das câmeras do Supervisor. Ele vê um parque vazio. Nós vemos a feira.']] },
    { id: 'mes_operario', npc: 'npc_operario', nome: 'BRAGA', zona: 'metro_centro', at: [0.3, 0.32], facing: 0.6, papel: 'Operário do subsolo',
      personalidade: 'Cansado, honesto, cheira a óleo e a café.',
      ola: ['Turno de doze horas nos dutos. Se eu dormir em pé, me acorda.', 'O teto da caverna pinga. Sempre pingou. A gente só parou de reparar.'],
      temas: [['Como é o trabalho?', 'Mantenho o ar circulando. Sem os exaustores, a Metrópole vira uma garrafa fechada.']] },
    { id: 'mes_comerciante', npc: 'npc_comerciante', nome: 'SILAS', zona: 'metro_mercado', at: [0.42, 0.62], facing: 5.6, papel: 'Comerciante neon',
      personalidade: 'Sorriso largo, preço mais largo ainda.',
      ola: ['Tudo original, tudo com garantia. A garantia sou eu.', 'Neon novo pro seu casaco? Fica lindo na escuridão.'],
      temas: [['O que você vende?', 'Luz. Em fios, em placas, em casacos. Aqui embaixo, luz é o que mais vende.']] },
    // O Guardião do Mundo (GM): o corpo é o GLB enviado (assets/GM/GM_parado.glb → npc_gm), com o fuzil
    // (assets/GM/Fuzil_GM.glb → WEAPON3D.gm_fuzil) atravessado nas costas e a pistola
    // (assets/GM/Pistola_GM.glb → gm_pistola) no coldre tático da coxa (Coldre_Tático.glb → gm_coldre). As bênçãos dele: js/mundo/guardiao.js
    { id: 'mes_gm', npc: 'npc_gm', nome: 'GUARDIÃO DO MUNDO', zona: 'aurora', at: [0.6, 0.42], facing: 1.9, papel: 'Guardião do Mundo · GM', servicos: ['gm'],
      personalidade: 'Calmo, direto e justo: fala como quem cuida do mundo inteiro e ainda tem tempo para você.',
      ola: ['Eu vigio este mundo. Se precisar de força para a próxima jornada, peça.', 'Toda bênção tem hora para acabar. Use bem a sua.'],
      temas: [['O que você faz aqui?', 'Vigio. Cuido para que quem luta por este lugar não lute sozinho.'],
        ['O que são as bênçãos?', 'Força emprestada: experiência em dobro, golpes mais fortes, pele mais dura, pés mais leves. Cada uma dura um tempo do relógio de verdade — e acaba mesmo se você for dormir.']],
      pose: { maoZ: -1.5, maoY: 1.2 },   // (ombros largos: as mãos descem ao lado das coxas, com o braço estendido)
      props: [{ id: 'gm_fuzil', no: 'torso', g: [-6.2, 4.0, 4.0], d: [0.04, 0.42, 0.9], y: [-1, 0, 0] },   // (a origem do fuzil é o punho: o corpo dele fica 12 unidades para o lado, daí o ponto à direita)
        // o coldre tático (assets/GM/Coldre_Tático.glb → gm_coldre) preso à coxa direita, com a pistola dentro
        // (a pistola fica DENTRO do estojo: mesmo eixo do coldre, o cano até o fundo e só o punho de fora)
        { id: 'gm_coldre', no: 'thighR', g: [0, 3.0, -6.2], d: [0, 0, -1], y: [0, -1, 0], e: 0.9 },
        { id: 'gm_pistola', no: 'thighR', g: [0.3, 5.5, -4.4], d: [0, 0, -1], y: [0, 1, 0], e: 0.82 }] },
  ];
  for (const P of M) {
    NPC3D[P.id] = { ap: { npc: P.npc }, roupa: {}, props: P.props, pose: P.pose };
    if (typeof WORLD_POVO !== 'undefined' && !WORLD_POVO.some((q) => q.id === P.id)) {
      const { npc, props, pose, ...dados } = P;
      WORLD_POVO.push(Object.assign({ model: 'civil', variant: 0, servicos: [], meshy: npc }, dados));
    }
  }
  if (typeof Povo !== 'undefined' && Povo.montar) Povo.montar();   // (entram na lista da zona; quem já estava é ignorado)
})();
