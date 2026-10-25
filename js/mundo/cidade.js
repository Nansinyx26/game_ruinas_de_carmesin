'use strict';
// ECLIPSE ZERO · Mundo aberto: a cidade principal — Nexus · Refúgio da Aurora (Cidade)
// ---------------------------------------------------------------------------
// A base de operações do herói: uma zona própria do mundo aberto ('aurora', fora da grade das
// regiões; no mapa, entre Carmesin e Nexus), explorável a pé na vista isométrica e na 3ª
// pessoa. Escondida pela Resistência de Nexus, ela é murada; os DISTRITOS ficam nas fachadas
// do fundo (prédios com portas, janelas acesas e letreiros próprios) e cada um tem a sua
// estação e quem trabalha nela:
//   Distrito dos Ferreiros (forja), Armaria (bancada de armas e o armeiro, que vende peças e
//   planos), Distrito Tecnológico (laboratório, engenheira e pesquisador), Oficina de
//   Engenharia, Guilda de Exploradores (contratos de todas as regiões abertas), Centro de
//   Missões (o diário com as missões disponíveis), Armazém (o depósito pessoal) e Alojamento
//   (descansar até de manhã e organizar o equipamento). No meio, a PRAÇA com a Chama da
//   Aurora (o monumento), o portal e o MERCADO (bancas: mercador, alquimista). Nas bordas da
//   frente, os PORTÕES DE SAÍDA, um para a chegada de cada região (fechados até a região abrir).
// TELETRANSPORTE: o botão AURORA ao lado dos poderes (tecla T, toque no botão) leva de volta à
// cidade de qualquer zona do mundo aberto fora de combate: o herói se concentra (1,2 s, com
// anéis, faíscas subindo e uma coluna de luz; andar, apanhar ou um inimigo acordar cancela),
// some num clarão e chega na praça por uma coluna de luz que desce.
// Os serviços usam os sistemas de sempre (WorldInv, Arsenal, Fabrica, Aventuras, Povo); o
// mapa (M) mostra a planta da cidade com os distritos quando o herói está nela.
// ---------------------------------------------------------------------------
const CIDADE_ID = 'aurora';
THEMES.aurora = { floor: [218, 12, 19], wall: [220, 14], lamp: '255,196,120', accent: '255,180,90', dark: '10,8,18', darkness: 0.55, aberto: 0.8,
  sky: 'indoor', decor: 'none', pillar: 'concrete', deco: 'stone', ruined: 0.02 };
// Prédios das fachadas. lado N: encostado na parede de cima (frente para +y); W: na da esquerda
// (frente para +x); a..b: trecho da parede (fração); h: altura; est: a estação na porta
const CIDADE_PREDIOS = [
  { id: 'forja', curto: 'FERREIROS', lado: 'N', a: 0.14, b: 0.34, h: 150, nome: 'DISTRITO DOS FERREIROS', parede: '#5a3a2e', telhado: '#2a1a16', luz: '255,140,60', est: 'forja', chamine: true },
  { id: 'armas', curto: 'ARMARIA', lado: 'N', a: 0.34, b: 0.52, h: 128, nome: 'ARMARIA', parede: '#4a4f5c', telhado: '#22252d', luz: '255,205,130', est: 'armas' },
  { id: 'lab', curto: 'TECNOLOGIA', lado: 'N', a: 0.52, b: 0.74, h: 196, nome: 'DISTRITO TECNOLÓGICO', parede: '#283a52', telhado: '#142030', luz: '120,230,255', est: 'laboratorio', antena: true },
  { id: 'oficina', curto: 'ENGENHARIA', lado: 'N', a: 0.74, b: 0.96, h: 136, nome: 'OFICINA DE ENGENHARIA', parede: '#4c4632', telhado: '#24221a', luz: '255,214,90', est: 'engenharia', listras: true },
  { id: 'guilda', curto: 'GUILDA', lado: 'W', a: 0.14, b: 0.36, h: 172, nome: 'GUILDA DE EXPLORADORES', parede: '#4a3626', telhado: '#24180f', luz: '255,190,110', est: 'guilda', bandeiras: true },
  { id: 'missoes', curto: 'MISSÕES', lado: 'W', a: 0.36, b: 0.55, h: 140, nome: 'CENTRO DE MISSÕES', parede: '#2c3a4e', telhado: '#161e2a', luz: '140,190,255', est: 'missoes' },
  { id: 'armazem', curto: 'ARMAZÉM', lado: 'W', a: 0.55, b: 0.74, h: 118, nome: 'ARMAZÉM', parede: '#3a3e44', telhado: '#1c1e22', luz: '200,210,230', est: 'armazem', portao: true },
  { id: 'alojamento', curto: 'ALOJAMENTO', lado: 'W', a: 0.74, b: 0.96, h: 150, nome: 'ALOJAMENTO', parede: '#4a3a40', telhado: '#22181c', luz: '255,170,140', est: 'cama' },
];
const CIDADE_RECUO = 3.2 * TILE;   // fundo das fachadas (nem o herói nem os moradores passam)
// Moradores da cidade: quem trabalha nos distritos e quem só mora ali
const CIDADE_POVO = [
  { id: 'aur_brasa', nome: 'MESTRA BRASA', at: [0.24, 0.2], model: 'civil', variant: 2, facing: 1.6, papel: 'Ferreira-chefe', servicos: ['forja', 'ferreiro'],
    personalidade: 'Direta, orgulhosa do ofício; fala alto por causa da forja.',
    ola: ['Chega mais. Metal bom não espera, e eu também não.', 'Trouxe minério? Então fala. Se não trouxe, fala mesmo assim.'],
    temas: [['Como funciona a forja?', 'Você traz o material, eu dou forma. Cada peça vai num lugar do corpo: capacete, peitoral, ombreiras, luvas, calças, botas, capa. Troque uma de cada vez, combine conjuntos. E se gostar de uma peça, eu aprimoro.'],
      ['De onde vem o material?', 'Ferro dos montes de sucata, couro das feras, tecido dos baús e do mercado. O raro… o raro vem de quem você derruba. Chefes guardam planos que eu não sei fazer sozinha.']] },
  { id: 'aur_dante', nome: 'DANTE', at: [0.43, 0.2], model: 'civil', variant: 0, facing: 1.6, papel: 'Armeiro', servicos: ['armas', 'armeiro'],
    personalidade: 'Calmo e meticuloso; trata cada arma pelo nome.',
    ola: ['Toda lâmina tem um ponto de equilíbrio. Me deixa achar o da sua.', 'Voltou. A arma ainda canta?'],
    temas: [['O que você faz aqui?', 'Afino as armas que vocês carregam: cada aprimoramento rende mais dano. E vendo planos e peças que o pessoal da Guilda traz das expedições.'],
      ['Planos?', 'Desenhos de conjuntos inteiros: Inverno, Deserto, Placas… Com o plano, a Mestra Brasa forja a família toda.']] },
  { id: 'aur_iris', nome: 'ÍRIS', at: [0.6, 0.2], model: 'civil', variant: 2, facing: 1.6, papel: 'Engenheira', servicos: ['laboratorio', 'engenharia'],
    personalidade: 'Rápida, curiosa, termina as frases dos outros.',
    ola: ['Oi! Cuidado com os cabos — não, esses não, esses dão choque.', 'Tenho três protótipos queimando. Um deles pode ser o seu.'],
    temas: [['O que o laboratório faz?', 'Acessórios: módulos, amuletos, núcleos. E relíquias forjadas, se você trouxer núcleo e essência. A bancada de engenharia ali do lado faz ferramentas de coleta e fogueiras portáteis — sim, fogueira portátil, não ri.'],
      ['Por que "Aurora"?', 'Porque a gente acende uma luz todo amanhecer no alto da torre. Se a luz apaga, todo mundo sabe que alguma coisa entrou.']] },
  { id: 'aur_otto', nome: 'PROFESSOR OTTO', at: [0.68, 0.24], model: 'ancia', facing: 2.0, papel: 'Pesquisador', servicos: ['pesquisa'],
    personalidade: 'Distraído, apaixonado por qualquer pedra que brilhe.',
    ola: ['Ah! Um explorador. Trouxe alguma coisa que ninguém entende?', 'Diga que trouxe uma amostra. Por favor.'],
    temas: [['O que você pesquisa?', 'Materiais raros. Me dê essência, núcleos e tecnologia antiga e eu reconstruo os planos que o NEXUS apagou. As amostras desconhecidas eu identifico por uma ninharia.']] },
  { id: 'aur_veridiana', nome: 'VERIDIANA', at: [0.2, 0.26], model: 'civil', variant: 3, facing: 0.2, papel: 'Mestra da Guilda', servicos: ['guilda'], rota: [[0.2, 0.26], [0.32, 0.4], [0.24, 0.5]],
    personalidade: 'Aventureira aposentada; mede as pessoas pelas cicatrizes.',
    ola: ['Mais um que quer ver o mundo? O mundo quer te ver também. Morto, de preferência.', 'Contratos novos todo dia. Escolha um que você consiga voltar.'],
    temas: [['O que a Guilda faz?', 'Juntamos os contratos de todas as regiões abertas: caçadas, coletas. Você escolhe a região aqui e cumpre lá fora. O pagamento vem com reputação.']] },
  { id: 'aur_caio', nome: 'CAIO', at: [0.2, 0.44], model: 'civil', variant: 0, facing: 0.0, papel: 'Coordenador de missões', servicos: ['missoes'],
    personalidade: 'Organizado ao extremo; tem uma lista para tudo.',
    ola: ['Painel atualizado. Quer ver o que precisa de gente?', 'Missão cumprida é missão riscada. Adoro riscar.'],
    temas: [['Onde vejo as missões?', 'No painel aqui e no seu diário (Y). Tudo que está disponível nas regiões aparece lá, com quem dá e onde fica.']] },
  { id: 'aur_berta', nome: 'BERTA', at: [0.2, 0.62], model: 'civil', variant: 1, facing: 0.0, papel: 'Armazenista', servicos: ['armazem'],
    personalidade: 'Desconfiada, anota cada parafuso.',
    ola: ['Guardar ou tirar? Fala logo, tem fila.', 'Seu depósito está como você deixou. Eu conferi duas vezes.'],
    temas: [['Como funciona o armazém?', 'Materiais e peças que não cabem ou que você não quer carregar ficam aqui. Ninguém mexe. Nem eu. Bom, eu conto.']] },
  { id: 'aur_lia', nome: 'LIA', at: [0.2, 0.82], model: 'civil', variant: 3, facing: 0.0, papel: 'Estalajadeira', servicos: ['descanso'],
    personalidade: 'Maternal e risonha; sabe o nome de todo mundo.',
    ola: ['Cama limpa e sopa quente. O resto do mundo pode esperar uma noite.', 'Você está com cara de quem dormiu em pedra.'],
    temas: [['O que tem no alojamento?', 'Uma cama para descansar até de manhã — vida e energia de volta — e um armário para organizar o equipamento e esconder o capacete, se quiser.']] },
  { id: 'aur_salvio', nome: 'SÁLVIO', at: [0.38, 0.72], model: 'civil', variant: 1, facing: 5.2, papel: 'Mercador', servicos: ['loja'],
    personalidade: 'Falante; conta vantagem de tudo que vende.',
    ola: ['Mercadoria de todas as regiões! Material, cápsula, tônico. Sem fiado.', 'Voltou rico? Ótimo, eu também quero voltar rico.'],
    temas: [['O que você vende?', 'Material de oficina — ferro, tecido, couro, componentes —, cápsulas, tônicos e relíquias. E compro o que você trouxer.']] },
  { id: 'aur_mae_ana', nome: 'MÃE ANA', at: [0.52, 0.78], model: 'ancia', facing: 4.6, papel: 'Alquimista', servicos: ['alquimia', 'curandeiro'],
    personalidade: 'Sábia e brincalhona; cheira a ervas.',
    ola: ['Chá quente para o frio, refresco para o sol. E para a teimosia, nada resolve.', 'Machucado de novo? Senta.'],
    temas: [['O que é alquimia aqui?', 'Ervas, cristais e paciência: cápsulas, elixires, tônicos, chá quente e refresco. Quem anda nas montanhas sem chá volta azul. Quem anda no deserto sem refresco não volta.']] },
  { id: 'aur_teo', nome: 'TEO', at: [0.6, 0.56], model: 'civil', variant: 3, facing: 3.0, papel: 'Morador', rota: [[0.6, 0.56], [0.74, 0.66], [0.56, 0.84], [0.44, 0.6]],
    personalidade: 'Menino curioso; quer ser explorador.',
    ola: ['Você já foi até a Cratera? É verdade que o chão queima?', 'Quando eu crescer vou ter uma capa igual à sua.'],
    temas: [['Você mora aqui?', 'Desde sempre! A Aurora é o único lugar onde os drones não chegam. Minha mãe diz que é porque a cidade fica atrás de um espelho.']] },
];
// Bancas do mercado e onde ficam as estações (frações da sala)
const CIDADE_BANCAS = [{ at: [0.36, 0.66], cor: '#7a2a2a' }, { at: [0.5, 0.72], cor: '#2a5a3a' }, { at: [0.28, 0.78], cor: '#2a3a6a' }];

const Cidade = {
  tp: null,          // teletransporte em andamento { t, x, y, hp }
  chegada: null,     // coluna de luz da chegada { t0, x, y }
  botao: null,       // retângulo do botão no HUD
  zona() { return WORLD_ZONES[CIDADE_ID]; },
  aqui() { return !!(World.zone && World.zone.cidade); },
  // ------------------------------------------------------------ geometria dos prédios
  caixa(B, R) {
    const RX = CIDADE_RECUO, w = R.w, h = R.h;
    if (B.lado === 'N') return { x0: Math.max(RX, B.a * w), x1: B.b * w, y0: 0, y1: RX };
    return { x0: 0, x1: RX, y0: Math.max(RX, B.a * h), y1: B.b * h };
  },
  frente(B, R) { const C = this.caixa(B, R); return B.lado === 'N' ? { x: (C.x0 + C.x1) / 2, y: C.y1 + 46 } : { x: C.x1 + 46, y: (C.y0 + C.y1) / 2 }; },
  // ------------------------------------------------------------ montagem da zona (World.loadZone → aoCarregar)
  aoCarregar(z) {
    if (!z.cidade) return;
    const g = game, R = g.room, spot = (at) => npcSpot(R, at[0], at[1]);
    for (const B of CIDADE_PREDIOS) { const f = this.frente(B, R); g.npcs.push(new CidadeProp('estacao', f.x, f.y, { est: B.est, predio: B })); }
    g.npcs.push(new CidadeProp('monumento', R.w * 0.42, R.h * 0.42, {}));
    CIDADE_BANCAS.forEach((b, k) => { const pt = spot(b.at); g.npcs.push(new CidadeProp('banca', pt.x, pt.y, { cor: b.cor, k })); });
    // portões de saída: um por região, nas bordas da frente (sul e leste)
    const regs = WORLD_REGIONS.slice().sort((a, b) => a.order - b.order);
    regs.forEach((reg, k) => {
      const sul = k < 4, f = sul ? 0.2 + k * 0.2 : 0.3 + (k - 4) * 0.22;
      const x = sul ? R.w * f : R.w - 64, y = sul ? R.h - 64 : R.h * f;
      g.npcs.push(new PortaoCidade(x, y, reg));
    });
  },
  // Postes de rua (Room.generate: as luminárias da cidade): em volta da praça e nas ruas
  postes(R) {
    const out = [], cx = R.w * 0.42, cy = R.h * 0.42;
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.39; out.push({ x: cx + Math.cos(a) * 262, y: cy + Math.sin(a) * 262, ph: k * 1.7, poste: true }); }
    for (const [fx, fy] of [[0.47, 0.86], [0.86, 0.52], [0.56, 0.3], [0.28, 0.55]]) out.push({ x: R.w * fx, y: R.h * fy, ph: fx * 9, poste: true });
    return out;
  },
  // Luz que sai das portas dos distritos (Room.addLights)
  luzes(lighting, R) {
    for (const B of CIDADE_PREDIOS) { const f = this.frente(B, R); lighting.add(isoX(f.x, f.y), isoY(f.x, f.y) - 30, 200, 0.6); }
    const m = [R.w * 0.42, R.h * 0.42];
    lighting.add(isoX(m[0], m[1]), isoY(m[0], m[1]) - 60, 300, 0.85);
  },
  // ------------------------------------------------------------ desenho (pré-renderizado na sala)
  // Rua de pedra, a praça em mosaico e as fachadas dos distritos (Room.render)
  desenharFundo(ctx, R) {
    const P = (x, y, z = 0) => [isoX(x, y), isoY(x, y) - z];
    const poly = (pts, fill, stroke) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } };
    // praça: anéis de pedra em volta da Chama
    const cx = R.w * 0.42, cy = R.h * 0.42;
    for (let k = 5; k >= 1; k--) {
      const r = 46 + k * 34, pts = [];
      for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; pts.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
      poly(pts, k % 2 ? 'rgba(70,64,80,0.55)' : 'rgba(40,38,52,0.55)', 'rgba(255,190,110,0.12)');
    }
    // ruas até os portões (faixas claras)
    ctx.lineWidth = 1;
    for (const [x0, y0, x1, y1] of [[cx, cy, R.w * 0.5, R.h], [cx, cy, R.w, R.h * 0.55], [cx, cy, R.w * 0.6, CIDADE_RECUO], [cx, cy, CIDADE_RECUO, R.h * 0.55]]) {
      const n = 26;
      for (let i = 0; i < n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        poly([P(x - 20, y - 20), P(x + 20, y - 20), P(x + 20, y + 20), P(x - 20, y + 20)], i % 2 ? 'rgba(90,86,100,0.22)' : 'rgba(60,58,74,0.22)');
      }
    }
    // postes de rua (a lâmpada acesa fica na camada emissiva da sala)
    for (const tc of R.torches) {
      if (!tc.poste) continue;
      const a = P(tc.x, tc.y), b = P(tc.x, tc.y, 62);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(a[0], a[1], 9, 4.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1c1e26'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.strokeStyle = '#3a3e4c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0] - 1, a[1]); ctx.lineTo(b[0] - 1, b[1]); ctx.stroke();
      ctx.fillStyle = '#2a2c36'; ctx.fillRect(b[0] - 7, b[1] - 8, 14, 5);
      ctx.fillStyle = '#ffe2b0'; ctx.fillRect(b[0] - 4, b[1] - 4, 8, 4);
    }
    // torre da Aurora no canto e as fachadas (de trás para a frente)
    this.predio(ctx, P, poly, { x0: 0, x1: CIDADE_RECUO, y0: 0, y1: CIDADE_RECUO }, 300, { parede: '#2c2a3a', telhado: '#15141e', luz: '255,200,120', torre: true });
    const ord = CIDADE_PREDIOS.slice().sort((a, b) => { const A = this.caixa(a, R), B = this.caixa(b, R); return (A.x0 + A.y0) - (B.x0 + B.y0); });
    for (const B of ord) this.predio(ctx, P, poly, this.caixa(B, R), B.h, B);
  },
  // Um prédio: caixa com telhado, a frente (porta, janelas, letreiro) e os enfeites do distrito
  predio(ctx, P, poly, C, H, B) {
    const { x0, x1, y0, y1 } = C, sombra = (hex, k) => { const c = hex3(hex).map((v) => Math.round(v * 255 * k)); return `rgb(${c[0]},${c[1]},${c[2]})`; };
    // faces visíveis: a de +x (direita) e a de +y (frente), depois o topo
    poly([P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, H), P(x1, y0, H)], sombra(B.parede, 0.62));
    poly([P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, H), P(x0, y1, H)], sombra(B.parede, 0.85));
    poly([P(x0, y0, H), P(x1, y0, H), P(x1, y1, H), P(x0, y1, H)], B.telhado);
    // cornija
    poly([P(x0, y1, H - 6), P(x1, y1, H - 6), P(x1, y1 + 8, H), P(x0, y1 + 8, H)], sombra(B.telhado, 1.4));
    const frenteN = y1 > x1 ? false : true;   // N: a frente é o plano y = y1; W: x = x1
    const F = (u, z) => (B.lado === 'W' ? P(x1, y0 + (y1 - y0) * u, z) : P(x0 + (x1 - x0) * u, y1, z));
    const quad = (u0, u1, z0, z1, fill) => poly([F(u0, z0), F(u1, z0), F(u1, z1), F(u0, z1)], fill);
    if (B.torre) {
      for (let k = 0; k < 6; k++) quad(0.2, 0.8, 30 + k * 42, 52 + k * 42, 'rgba(20,18,30,0.9)');
      return;
    }
    // porta (aberta, com luz por dentro) e janelas em fileiras
    const L = B.lado === 'W' ? y1 - y0 : x1 - x0, du = 34 / L;
    quad(0.5 - du, 0.5 + du, 0, B.portao ? 76 : 64, 'rgba(14,10,8,0.95)');
    quad(0.5 - du * 0.8, 0.5 + du * 0.8, 0, (B.portao ? 76 : 64) - 6, `rgba(${B.luz},0.18)`);
    for (let r = 0; r < Math.floor((H - 90) / 38); r++) for (const u of [0.18, 0.32, 0.68, 0.82]) quad(u - 0.04, u + 0.04, 92 + r * 38, 114 + r * 38, 'rgba(10,12,20,0.9)');
    // toldo sobre a porta
    poly([F(0.5 - du * 1.6, 82), F(0.5 + du * 1.6, 82), B.lado === 'W' ? P(x1 + 24, y0 + (y1 - y0) * (0.5 + du * 1.6), 70) : P(x0 + (x1 - x0) * (0.5 + du * 1.6), y1 + 24, 70), B.lado === 'W' ? P(x1 + 24, y0 + (y1 - y0) * (0.5 - du * 1.6), 70) : P(x0 + (x1 - x0) * (0.5 - du * 1.6), y1 + 24, 70)], sombra(B.parede, 0.5));
    if (B.listras) for (let k = 0; k < 8; k++) quad(k / 8, k / 8 + 0.06, 6, 16, k % 2 ? '#d4b030' : '#1a1810');
    if (B.chamine) { const cx = x0 + (x1 - x0) * 0.2; poly([P(cx, 16, H), P(cx + 24, 16, H), P(cx + 24, 16, H + 70), P(cx, 16, H + 70)], '#3a2620'); poly([P(cx + 24, 16, H), P(cx + 24, 40, H), P(cx + 24, 40, H + 70), P(cx + 24, 16, H + 70)], '#2a1a16'); }
    if (B.antena) { const ax = x0 + (x1 - x0) * 0.75, a = P(ax, 30, H), b = P(ax, 30, H + 90); ctx.strokeStyle = '#8aa0b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    if (B.bandeiras) for (const u of [0.12, 0.88]) quad(u - 0.03, u + 0.03, 40, 120, '#8a2a20');
  },
  // Luzes das fachadas (depois da escuridão): janelas, letreiros, a porta, o farol da torre
  desenharLuzes(ctx, R, t) {
    const P = (x, y, z = 0) => [isoX(x, y), isoY(x, y) - z];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const B of CIDADE_PREDIOS) {
      const C = this.caixa(B, R), L = B.lado === 'W' ? C.y1 - C.y0 : C.x1 - C.x0;
      const F = (u, z) => (B.lado === 'W' ? P(C.x1, C.y0 + (C.y1 - C.y0) * u, z) : P(C.x0 + (C.x1 - C.x0) * u, C.y1, z));
      const porta = F(0.5, 30);
      GlowCache.draw(ctx, B.luz, porta[0], porta[1], 60, 0.45);
      for (let r = 0; r < Math.floor((B.h - 90) / 38); r++) for (const [k, u] of [0.18, 0.32, 0.68, 0.82].entries()) {
        const on = (Math.sin(r * 3.1 + k * 1.7 + B.h) + 1) / 2 > 0.3;
        if (!on) continue;
        const q = F(u, 103 + r * 38);
        GlowCache.draw(ctx, B.luz, q[0], q[1], 16, 0.4 + 0.1 * Math.sin(t * 0.7 + r + k));
      }
      // letreiro aceso sobre o toldo
      const s = F(0.5, 100);
      ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(B.nome).width + 18;
      ctx.fillStyle = `rgba(${B.luz},0.16)`; ctx.fillRect(s[0] - w / 2, s[1] - 9, w, 18);
      ctx.fillStyle = `rgba(${B.luz},0.95)`; ctx.fillText(B.nome, s[0], s[1]);
      ctx.letterSpacing = '0px';
      if (B.chamine) { const c = P(C.x0 + (C.x1 - C.x0) * 0.2 + 12, 28, B.h + 74); GlowCache.draw(ctx, '255,120,40', c[0], c[1], 26, 0.5 + 0.2 * Math.sin(t * 5)); }
      if (B.antena) { const a = P(C.x0 + (C.x1 - C.x0) * 0.75, 30, B.h + 92); GlowCache.draw(ctx, '255,60,60', a[0], a[1], 12, Math.sin(t * 3) > 0 ? 0.9 : 0.2); }
    }
    // farol da torre: a luz da Aurora
    const f = P(CIDADE_RECUO / 2, CIDADE_RECUO / 2, 318);
    GlowCache.draw(ctx, '255,200,120', f[0], f[1], 90, 0.6 + 0.15 * Math.sin(t * 1.3));
    ctx.restore();
  },
  // ------------------------------------------------------------ 3ª pessoa (ThirdView.buildRoom)
  modelo3D(root, R) {
    const g = new G3(), luz = new G3();
    const caixa = (C, H, parede, telhado) => {
      const cx = (C.x0 + C.x1) / 2, cy = (C.y0 + C.y1) / 2;
      g.box(cx, cy, H / 2, C.x1 - C.x0, C.y1 - C.y0, H, parede, 0);
      g.box(cx, cy, H + 3, C.x1 - C.x0 + 8, C.y1 - C.y0 + 8, 6, telhado, 0);
    };
    caixa({ x0: 0, x1: CIDADE_RECUO, y0: 0, y1: CIDADE_RECUO }, 300, '#2c2a3a', '#15141e');
    // praça: anéis de pedra em volta da Chama (como na vista isométrica)
    for (let k = 5; k >= 1; k--) g.cyl(R.w * 0.42, R.h * 0.42, 0, 46 + k * 34, 46 + k * 34, 0.4 + (6 - k) * 0.05, 40, k % 2 ? '#3a3646' : '#2a2836', 0, { caps: true });
    luz.box(CIDADE_RECUO / 2, CIDADE_RECUO / 2, 318, 18, 18, 18, '#ffd08a', 1);
    for (const B of CIDADE_PREDIOS) {
      const C = this.caixa(B, R), W = B.lado === 'W', L = W ? C.y1 - C.y0 : C.x1 - C.x0;
      caixa(C, B.h, B.parede, B.telhado);
      const fx = W ? C.x1 + 1 : (C.x0 + C.x1) / 2, fy = W ? (C.y0 + C.y1) / 2 : C.y1 + 1;
      // porta acesa, janelas e o letreiro
      g.box(fx, fy, 32, W ? 2 : 64, W ? 64 : 2, 64, '#0e0a08', 0);
      luz.box(fx + (W ? 1 : 0), fy + (W ? 0 : 1), 28, W ? 1 : 52, W ? 52 : 1, 52, '#' + B.luz.split(',').map((v) => Math.round(+v * 0.35).toString(16).padStart(2, '0')).join(''), 1);
      for (let r = 0; r < Math.floor((B.h - 90) / 38); r++) for (const u of [0.18, 0.32, 0.68, 0.82]) {
        const px = W ? C.x1 + 1.5 : C.x0 + L * u, py = W ? C.y0 + L * u : C.y1 + 1.5;
        luz.box(px, py, 103 + r * 38, W ? 1 : 14, W ? 14 : 1, 20, '#' + B.luz.split(',').map((v) => Math.round(+v * 0.7).toString(16).padStart(2, '0')).join(''), 0.9);
      }
      luz.box(fx + (W ? 3 : 0), fy + (W ? 0 : 3), 100, W ? 1 : 120, W ? 120 : 1, 16, '#' + B.luz.split(',').map((v) => (+v).toString(16).padStart(2, '0')).join(''), 1);
    }
    root.add(new N3('cidade', g));
    root.add(new N3('cidadeLuz', luz));
  },
  // ------------------------------------------------------------ planta da cidade (mapa, M)
  desenharPlanta(ctx, x, y, w, h) {
    const R = game.room, p = game.player;
    if (!R) return;
    ctx.save();
    ctx.fillStyle = 'rgba(6,10,20,0.92)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,190,110,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd08a';
    ctx.fillText('PLANTA · REFÚGIO DA AURORA', x + 10, y + 14); ctx.letterSpacing = '0px';
    const m = 12, mx = x + m, my = y + 28, mw = w - 2 * m, mh = h - 28 - m, sx = (v) => mx + (v / R.w) * mw, sy = (v) => my + (v / R.h) * mh;
    ctx.fillStyle = 'rgba(40,44,60,0.9)'; ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = 'rgba(30,24,40,0.95)'; ctx.fillRect(mx, my, sx(CIDADE_RECUO) - mx, sy(CIDADE_RECUO) - my);
    ctx.font = `9px ${FONT_UI}`;
    for (const B of CIDADE_PREDIOS) {
      const C = this.caixa(B, R);
      ctx.fillStyle = `rgba(${B.luz},0.35)`; ctx.fillRect(sx(C.x0) + 1, sy(C.y0) + 1, sx(C.x1) - sx(C.x0) - 2, sy(C.y1) - sy(C.y0) - 2);
      ctx.fillStyle = `rgba(${B.luz},1)`;
      if (B.lado === 'N') { ctx.textAlign = 'center'; ctx.fillText(B.curto, sx((C.x0 + C.x1) / 2), sy(C.y1) + 8); }
      else { ctx.textAlign = 'left'; ctx.fillText(B.curto, sx(C.x1) + 4, sy((C.y0 + C.y1) / 2)); }
      ctx.textAlign = 'center';
    }
    // praça, mercado, portões e o herói
    ctx.strokeStyle = 'rgba(255,190,110,0.8)'; ctx.beginPath(); ctx.arc(sx(R.w * 0.42), sy(R.h * 0.42), 6, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffd08a'; ctx.fillText('PRAÇA', sx(R.w * 0.42), sy(R.h * 0.42) + 14);
    ctx.fillStyle = '#9fffb0'; ctx.fillText('MERCADO', sx(R.w * 0.38), sy(R.h * 0.76));
    for (const n of game.npcs) if (n instanceof PortaoCidade) { ctx.fillStyle = n.selada() ? 'rgba(160,160,170,0.6)' : rgba(n.data.rgb, 1); ctx.fillRect(sx(n.x) - 3, sy(n.y) - 3, 6, 6); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 3.5, 0, TAU); ctx.fill();
    ctx.restore();
  },

  // ------------------------------------------------------------ teletransporte
  pode() {
    const p = game.player;
    if (!game.world || !World.zone) return 'Só no mundo aberto.';
    if (this.aqui()) return 'Você já está no Refúgio da Aurora.';
    if (World.inCombat()) return 'Não dá para se concentrar com inimigos acordados por perto.';
    if (!p || p.state === 'dead' || game.fadeCb) return 'Agora não.';
    return '';
  },
  teleportar() {
    if (this.tp) return false;
    const e = this.pode();
    if (e) { game.hud.toast(e, '255,140,140'); game.audio.play('uiDeny'); return false; }
    const p = game.player;
    this.tp = { t: 0, dur: 1.2, x: p.x, y: p.y, hp: p.hp };
    p.vx = p.vy = 0;
    game.hud.toast('Teletransporte · Refúgio da Aurora', '255,200,120');
    game.audio.play('specialCharge', 0.6);
    return true;
  },
  // Por quadro (Game.updatePlaying): canaliza, cancela se andar, apanhar ou um inimigo acordar
  update(dt, inp) {
    const T = this.tp, g = game, p = g.player;
    if (inp && inp.pressed.teleporte) this.teleportar();
    if (!T) return false;
    T.t += dt;
    const anda = inp && (Math.hypot(inp.move.x, inp.move.y) > 0.3 || inp.pressed.dash || inp.pressed.light || inp.pressed.heavy);
    if (anda || p.hp < T.hp || World.inCombat() || p.state === 'dead') {
      this.tp = null;
      g.hud.toast('Teletransporte interrompido', '255,140,140'); g.audio.play('uiDeny');
      return false;
    }
    if (Math.random() < 0.8) g.particles.embers(p.x, p.y, 4, 2, '255,200,120', 22, 140);
    if (Math.random() < 0.25) g.particles.ring(p.x, p.y, 30 + 30 * (T.t / T.dur), '255,190,110', 0.25, 3);
    if (T.t >= T.dur) {
      this.tp = null;
      g.particles.flash(p.x, p.y, 40, 160, '255,220,170', 0.25);
      g.flashScreen('255,220,170', 0.35);
      g.audio.play('dash');
      World.go(CIDADE_ID, null);
      this.chegada = { t0: g.realTime + 0.6, x: 0, y: 0, pend: true };
    }
    return true;   // canalizando: o herói fica parado
  },
  // Coluna de luz (subindo na canalização, descendo na chegada), desenhada com os efeitos
  desenhar(ctx) {
    const g = game, p = g.player;
    let k = 0, x = 0, y = 0;
    if (this.tp) { k = this.tp.t / this.tp.dur; x = p.x; y = p.y; }
    else if (this.chegada) {
      const C = this.chegada;
      if (C.pend && this.aqui()) { C.pend = false; C.t0 = g.realTime; C.x = p.x; C.y = p.y; g.particles.ring(p.x, p.y, 70, '255,200,120', 0.5, 6); g.audio.play('memory', 0.5); }
      if (C.pend) return;
      const a = g.realTime - C.t0;
      if (a > 1.1) { this.chegada = null; return; }
      k = 1 - a / 1.1; x = C.x; y = C.y;
    } else return;
    const sx = isoX(x, y), sy = isoY(x, y), hgt = 40 + 260 * k, w = 10 + 26 * k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(0, sy - hgt, 0, sy);
    gr.addColorStop(0, 'rgba(255,210,150,0)'); gr.addColorStop(0.6, `rgba(255,200,130,${(0.35 * k + 0.1).toFixed(3)})`); gr.addColorStop(1, `rgba(255,230,190,${(0.55 * k + 0.1).toFixed(3)})`);
    ctx.fillStyle = gr; ctx.fillRect(sx - w / 2, sy - hgt, w, hgt);
    for (let i = 0; i < 3; i++) {
      const r = (18 + i * 16) * (0.6 + k * 0.6), al = (0.5 - i * 0.12) * (0.4 + k);
      ctx.strokeStyle = `rgba(255,200,130,${al.toFixed(3)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sx, sy - i * 10 * k, r, r * 0.5, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  },
  // Botão AURORA ao lado dos poderes (no HUD, acima do painel da arma)
  desenharBotao(ctx, L) {
    if (!game.world || !L.wp) return;
    const r = 20, x = L.wp.x + L.wp.w - r - 4, y = L.wp.y - r - 10, ok = !this.pode(), on = !!this.tp, t = game.realTime;
    this.botao = { x: x - r, y: y - r, w: 2 * r, h: 2 * r, cx: x, cy: y, r };
    ctx.save();
    ctx.globalAlpha = ok || on ? 1 : 0.45;
    ctx.fillStyle = 'rgba(14,18,32,0.88)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = on ? '#ffe0a8' : 'rgba(255,190,110,0.85)'; ctx.lineWidth = 2; ctx.stroke();
    if (on) { ctx.strokeStyle = '#ffd08a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 3, -Math.PI / 2, -Math.PI / 2 + TAU * (this.tp.t / this.tp.dur)); ctx.stroke(); }
    // casinha com a chama
    ctx.fillStyle = '#ffd08a'; ctx.strokeStyle = '#ffd08a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - 9, y + 1); ctx.lineTo(x, y - 8); ctx.lineTo(x + 9, y + 1); ctx.lineTo(x + 6, y + 1); ctx.lineTo(x + 6, y + 9); ctx.lineTo(x - 6, y + 9); ctx.lineTo(x - 6, y + 1); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y + 4 + Math.sin(t * 6) * 0.4, 2.2, 3.4, 0, 0, TAU); ctx.fill();
    ctx.font = `bold 8px ${FONT_TITLE}`; ctx.letterSpacing = '1px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,214,150,0.95)'; ctx.fillText('AURORA', x, y + r + 9);
    ctx.fillStyle = 'rgba(200,214,235,0.75)'; ctx.fillText(game.input.lastDevice === 'pad' ? '' : '[T]', x - r - 12, y);
    ctx.letterSpacing = '0px';
    ctx.restore();
  },
  // Clique no botão (mouse; no toque, o botão de toque manda a tecla T)
  clique(m) { const B = this.botao; if (!B || !m.clicked) return false; if (Math.hypot(m.x - B.cx, m.y - B.cy) > B.r + 4) return false; this.teleportar(); return true; },

  // ------------------------------------------------------------ serviços dos moradores (Povo.servico)
  servico(npc, s, o, volta) {
    if (FAB_ESTACOES[s]) { o.push({ id: s, tag: '⚒', txt: `${FAB_ESTACOES[s].nome}`, fn: () => { Dialogo.fechar(); WorldInv.abrir('fabrica', false, null, s); } }); return true; }
    if (s === 'armazem') { o.push({ id: 'armazem', tag: '▣', txt: 'Abrir o meu depósito', fn: () => { Dialogo.fechar(); WorldInv.abrir('armazem', false, null, 'armazem'); } }); return true; }
    if (s === 'armeiro') { o.push({ id: 'armeiro', tag: '$', txt: 'Ver peças e planos à venda', fn: () => { Dialogo.fechar(); WorldInv.abrir('loja', true, 'armeiro'); } }); return true; }
    if (s === 'pesquisa') {
      const prox = Fabrica.planoNovo();
      o.push({ id: 'pesquisar', tag: '✦', txt: prox ? `Estudar materiais raros (${Oficios.fmtMat(Fabrica.CUSTO_PESQUISA)})` : 'Estudar (você já conhece todos os planos)', off: prox ? (Oficios.tem(Fabrica.CUSTO_PESQUISA) ? null : `faltam ${Oficios.falta(Fabrica.CUSTO_PESQUISA)}`) : 'nada a estudar',
        fn: () => { const e = Fabrica.pesquisar(); volta(e || 'Fascinante! Reconstruí o plano. A Mestra Brasa vai adorar.'); } });
      o.push({ id: 'identificar', tag: '?', txt: `Identificar uma amostra (15 células · você tem ${Oficios.mat('amostra')})`, off: Oficios.mat('amostra') > 0 ? null : 'sem amostras',
        fn: () => { const r = Fabrica.identificar(); volta(/^Você|^A análise/.test(r) ? r : `Era ${r}! Guardei na sua mochila.`); } });
      return true;
    }
    if (s === 'guilda') {
      // os contratos do quadro de cada região aberta, na própria conversa (cumprir lá fora, entregar aqui ou lá)
      for (const reg of WORLD_REGIONS.filter((q) => World.regionOpen(q.id)).sort((a, b) => a.order - b.order).slice(0, 6)) {
        o.push({ id: `guilda_${reg.id}`, tag: '⚔', txt: `Contratos · ${reg.name}`, fn: () => Povo.quadroRaiz({ data: { reg: reg.id } }, `Contratos de ${reg.name}. Pagamento na entrega, reputação com a facção de lá.`) });
      }
      return true;
    }
    if (s === 'missoes') { o.push({ id: 'painel', tag: '!', txt: 'Ver as missões disponíveis (diário)', fn: () => { Dialogo.fechar(); WorldInv.ui.cat = 'disponiveis'; WorldInv.abrir('diario'); WorldInv.ui.cat = 'disponiveis'; } }); return true; }
    if (s === 'descanso') {
      o.push({ id: 'descansar', tag: '☾', txt: 'Descansar até de manhã (vida e energia cheias)', fn: () => volta(this.descansar()) });
      o.push({ id: 'armario', tag: '▣', txt: 'Organizar o equipamento (armário)', fn: () => { Dialogo.fechar(); WorldInv.abrir('equipamento'); } });
      return true;
    }
    return false;
  },
  descansar() {
    const p = game.player, S = World.state;
    if (S.hora >= 5 && S.hora < 8 && p.hp >= p.maxHp) return 'Já amanheceu. Vai lá, o mundo está esperando.';
    if (S.hora >= 8) S.dia = (S.dia || 1) + 1;
    S.hora = 7;
    p.hp = p.maxHp; p.fury = p.maxEnergy; game.hud.ghostHp = p.hp;
    if (typeof Clima !== 'undefined') Clima.descansar();
    game.flashScreen('255,220,180', 0.25);
    game.audio.play('health');
    World.save();
    return 'Dormiu como pedra. Bom dia — o sol acabou de nascer.';
  },
};

// ---------------------------------------------------------------------------
// Objetos da cidade: estação de trabalho de cada distrito, monumento e bancas do mercado
// ---------------------------------------------------------------------------
class CidadeProp extends NPC {
  constructor(kind, x, y, data) {
    super({ model: null, name: '', lines: ['…'] }, x, y);
    this.kind = kind; this.data = data || {}; this.key = null; this.t = rand(0, 10);
    const B = this.data.predio;
    this.radius = kind === 'monumento' ? 46 : kind === 'banca' ? 30 : 20;
    this.height = kind === 'monumento' ? 90 : 34;
    this.lightRgb = kind === 'monumento' ? '255,190,110' : kind === 'banca' ? '255,214,150' : B ? B.luz : '255,200,120';
    const nomes = { forja: 'FORJA', armas: 'BANCADA DE ARMAS', laboratorio: 'LABORATÓRIO', engenharia: 'BANCADA DE ENGENHARIA', guilda: 'QUADRO DA GUILDA', missoes: 'PAINEL DE MISSÕES', armazem: 'DEPÓSITO', cama: 'CAMA' };
    this.name = kind === 'monumento' ? 'CHAMA DA AURORA' : kind === 'banca' ? 'BANCA DO MERCADO' : nomes[this.data.est] || 'ESTAÇÃO';
    this.verb = kind === 'estacao' ? (this.data.est === 'cama' ? 'Descansar' : this.data.est === 'guilda' || this.data.est === 'missoes' ? 'Ler' : this.data.est === 'armazem' ? 'Abrir' : 'Usar') : kind === 'monumento' ? 'Olhar' : 'Ver';
    this.papel = this.name;
  }
  canTalk() { return true; }
  talk() {
    this.talkT = 1;
    const e = this.data.est;
    if (this.kind === 'monumento') { game.hud.say('CHAMA DA AURORA', 'A luz que a Resistência acende todo amanhecer. Enquanto ela queimar, o NEXUS não enxerga esta cidade.', 4); return; }
    if (this.kind === 'banca') { WorldInv.abrir('loja', true, 'mercador'); return; }
    if (FAB_ESTACOES[e]) { WorldInv.abrir('fabrica', false, null, e); return; }
    if (e === 'armazem') { WorldInv.abrir('armazem', false, null, 'armazem'); return; }
    if (e === 'cama') { game.hud.toast(Cidade.descansar(), '255,220,180'); return; }
    if (e === 'missoes') { WorldInv.abrir('diario'); WorldInv.ui.cat = 'disponiveis'; return; }
    if (e === 'guilda') {
      const o = [], raiz = (txt) => { const q = []; Cidade.servico(this, 'guilda', q, raiz); q.push({ id: 'sair', txt: 'Sair.', fn: () => Dialogo.fechar() }); Dialogo.mostrar(txt, q); };
      Dialogo.abrir(this, '', o, 'GUILDA DE EXPLORADORES');
      raiz('Contratos de todas as regiões abertas. Escolha a região.');
    }
  }
  update(dt) { this.t += dt; if (this.talkT > 0) this.talkT -= dt; }
  headPoint() { return { x: isoX(this.x, this.y), y: isoY(this.x, this.y) - this.height - 18 }; }
  drawShadow(ctx) {}
  draw(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), t = this.t, e = this.data.est;
    const P = (x, y, z) => [sx + (x - y), sy + (x + y) / 2 - z];
    const caixa = (x, y, z, w, d, h, top, lado, frente) => {
      const f = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); };
      f([P(x + w / 2, y - d / 2, z), P(x + w / 2, y + d / 2, z), P(x + w / 2, y + d / 2, z + h), P(x + w / 2, y - d / 2, z + h)], lado);
      f([P(x - w / 2, y + d / 2, z), P(x + w / 2, y + d / 2, z), P(x + w / 2, y + d / 2, z + h), P(x - w / 2, y + d / 2, z + h)], frente);
      f([P(x - w / 2, y - d / 2, z + h), P(x + w / 2, y - d / 2, z + h), P(x + w / 2, y + d / 2, z + h), P(x - w / 2, y + d / 2, z + h)], top);
    };
    ctx.save();
    if (this.kind === 'monumento') {
      caixa(0, 0, 0, 70, 70, 14, '#4a4658', '#2a2836', '#36334a');
      caixa(0, 0, 14, 40, 40, 40, '#5a566c', '#2e2c3c', '#403c54');
      // a chama: cristal âmbar
      ctx.fillStyle = '#ffb860'; ctx.beginPath(); const c = P(0, 0, 54);
      ctx.moveTo(c[0], c[1] - 46 - Math.sin(t * 3) * 3); ctx.lineTo(c[0] + 12, c[1] - 12); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0] - 12, c[1] - 12); ctx.closePath(); ctx.fill();
    } else if (this.kind === 'banca') {
      caixa(0, 0, 0, 44, 30, 22, '#4a3a2a', '#2a2018', '#3a2c20');
      for (const [x, y] of [[-20, -13], [20, -13], [-20, 13], [20, 13]]) { const a = P(x, y, 22), b = P(x, y, 56); ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      caixa(0, 0, 56, 52, 38, 4, this.data.cor, '#1a1414', '#2a1e1e');
      for (const [x, cor] of [[-10, '#c86040'], [4, '#d0c060'], [14, '#60b070']]) caixa(x, 0, 22, 8, 8, 6, cor, '#222', '#333');
    } else {
      // estações: forja, bancadas, laboratório, depósito, cama, quadros
      if (e === 'forja') { caixa(-10, 0, 0, 26, 26, 30, '#3a2620', '#22140f', '#2e1c16'); caixa(16, 0, 0, 20, 12, 18, '#5a5e68', '#2a2c32', '#3e424a'); }
      else if (e === 'armas') { caixa(0, 0, 0, 40, 20, 20, '#4a3a2a', '#2a2018', '#3a2c20'); for (const x of [-12, 0, 12]) { const a = P(x, -8, 20), b = P(x, -8, 52); ctx.strokeStyle = '#aab4c4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
      else if (e === 'laboratorio' || e === 'engenharia') { caixa(0, 0, 0, 40, 20, 22, '#2c3a4e', '#161e2a', '#20304a'); caixa(0, -6, 22, 26, 4, 18, '#141a22', '#0a0e14', e === 'laboratorio' ? '#3cc8e8' : '#e8c840'); }
      else if (e === 'armazem') { caixa(0, 0, 0, 32, 24, 40, '#4a4e56', '#2a2c32', '#3a3e46'); }
      else if (e === 'cama') { caixa(0, 0, 0, 48, 26, 12, '#e0d4c0', '#5a4a3a', '#6a5a48'); caixa(-18, 0, 12, 10, 22, 6, '#ffffff', '#ccc', '#ddd'); }
      else { const a = P(-14, 0, 0), b = P(-14, 0, 42), c = P(14, 0, 0), d = P(14, 0, 42); ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); caixa(0, 0, 26, 34, 3, 22, '#3a2c20', '#2a2018', '#e8dcc0'); }
    }
    ctx.restore();
  }
  drawEmissive(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), e = this.data.est;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (this.kind === 'monumento') GlowCache.draw(ctx, '255,190,110', sx, sy - 80, 120, 0.55 + 0.1 * Math.sin(this.t * 3));
    else if (e === 'forja') GlowCache.draw(ctx, '255,120,40', sx - 12, sy - 26, 44, 0.6 + 0.2 * Math.sin(this.t * 7));
    else if (e === 'laboratorio' || e === 'engenharia') GlowCache.draw(ctx, e === 'laboratorio' ? '80,220,255' : '255,214,90', sx, sy - 34, 34, 0.45);
    else GlowCache.draw(ctx, this.lightRgb, sx, sy - 30, 30, 0.25);
    ctx.restore();
  }
  // Modelo para a 3ª pessoa (ThirdView.queueProp)
  modelo3D() {
    const C = Cidade._m3 || (Cidade._m3 = {}), k = this.kind === 'estacao' ? `est:${this.data.est}` : this.kind;
    if (C[k]) return C[k];
    const g = new G3(), e = this.data.est;
    if (this.kind === 'monumento') { g.box(0, 0, 7, 70, 70, 14, '#36334a', 0); g.box(0, 0, 34, 40, 40, 40, '#403c54', 0); g.cyl(0, 0, 54, 12, 0, 46, 4, '#e8902e', 0.55); g.cyl(0, 0, 58, 6, 0, 30, 4, '#ffd08a', 0.8); }
    else if (this.kind === 'banca') { g.box(0, 0, 11, 44, 30, 22, '#3a2c20', 0); for (const [x, y] of [[-20, -13], [20, -13], [-20, 13], [20, 13]]) g.box(x, y, 39, 2, 2, 34, '#2a2018', 0); g.box(0, 0, 58, 52, 38, 4, this.data.cor, 0); }
    else if (e === 'forja') { g.box(-10, 0, 15, 26, 26, 30, '#2e1c16', 0); g.box(-10, 0, 20, 14, 2, 10, '#ff7a2a', 1); g.box(16, 0, 9, 20, 12, 18, '#3e424a', 0); }
    else if (e === 'armas') { g.box(0, 0, 10, 40, 20, 20, '#3a2c20', 0); for (const x of [-12, 0, 12]) g.box(x, -8, 36, 1.5, 1.5, 32, '#aab4c4', 0.2); }
    else if (e === 'laboratorio' || e === 'engenharia') { g.box(0, 0, 11, 40, 20, 22, '#20304a', 0); g.box(0, -6, 31, 26, 4, 18, e === 'laboratorio' ? '#3cc8e8' : '#e8c840', 0.9); }
    else if (e === 'armazem') g.box(0, 0, 20, 32, 24, 40, '#3a3e46', 0);
    else if (e === 'cama') { g.box(0, 0, 6, 48, 26, 12, '#6a5a48', 0); g.box(-18, 0, 15, 10, 22, 6, '#ffffff', 0.1); }
    else { g.box(-14, 0, 21, 3, 3, 42, '#2a2018', 0); g.box(14, 0, 21, 3, 3, 42, '#2a2018', 0); g.box(0, 0, 37, 34, 3, 22, '#3a2c20', 0); g.box(0, 1.8, 37, 28, 0.5, 16, '#e8dcc0', 0.15); }
    return (C[k] = new Model3(new N3(k, g)));
  }
}

// Portão de saída: leva à chegada de uma região (fechado até ela abrir)
class PortaoCidade extends WorldProp {
  constructor(x, y, reg) {
    super('gate', x, y, { to: reg.hub, dir: null, reg: reg.id, rgb: reg.rgb });
    this.lightRgb = reg.rgb;
    this.data.rotulo = World.regionOpen(reg.id) ? `PORTÃO · ${reg.name.toUpperCase()}` : `🔒 ${reg.name.toUpperCase()} · NÍVEL ${reg.lv[0]}`;
  }
  selada() { return !World.regionOpen(this.data.reg); }
  update(dt) {
    super.update(dt);
    const p = game.player;
    if (this.selada() && p && dist(p.x, p.y, this.x, this.y) < 30) {
      if (!(this.avisoT > 0)) { game.hud.toast(`${worldRegion(this.data.reg).name}: abre no nível ${worldRegion(this.data.reg).lv[0]} ou com o chefe anterior derrotado`, '255,160,160'); this.avisoT = 3; }
    }
    if (this.avisoT > 0) this.avisoT -= dt;
  }
}

// A zona da cidade (fora da grade das regiões; no mapa, entre Carmesin e Nexus) e quem mora nela
worldPrepZone(CIDADE_ID, { r: -50, c: -50, region: 'nexus', cidade: true, name: 'Refúgio da Aurora', theme: 'aurora', tiles: 26, pillars: 0, lv: 1, portal: true,
  mapa: [0.62, 0.36], camps: [], chests: [] });
WORLD_ZONES[CIDADE_ID].sub = 'NEXUS · CIDADE PRINCIPAL · BASE DA RESISTÊNCIA';
for (const P of CIDADE_POVO) {
  P.zona = CIDADE_ID;
  if (!WORLD_POVO.includes(P)) WORLD_POVO.push(P);
  WORLD_ZONES[CIDADE_ID].npcs.push({ model: P.model, variant: P.variant || 0, name: P.nome, at: P.at, facing: P.facing || 0, lines: P.ola, persona: P, merchant: (P.servicos || []).includes('loja') });
}
