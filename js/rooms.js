'use strict';
// ECLIPSE ZERO · Setores: temas, definição das salas (ROOM_DEFS), cenário pré-renderizado e colisões
// ---------------------------------------------------------------------------
// SETORES: temas visuais, layout, pré-renderização do chão/paredes e colisões
// ---------------------------------------------------------------------------
// floor: [matiz, saturação, luminosidade]   lamp/accent: cores RGB das luzes
// dark: cor da escuridão   sky: fundo atrás da sala   decor: enfeites das paredes
const THEMES = {
  lab:       { floor: [214, 9, 15], wall: [216, 10], lamp: '255,40,50', accent: '255,60,70', dark: '22,3,7', darkness: 0.82,
               sky: 'indoor', decor: 'screen', pillar: 'pylon', deco: 'lab', ruined: 0.08, ambient: 'Luzes de emergência' },
  tunnel:    { floor: [196, 10, 13], wall: [200, 12], lamp: '255,170,70', accent: '60,200,255', dark: '3,9,12', darkness: 0.84,
               sky: 'indoor', decor: 'pipes', pillar: 'pylon', deco: 'grate', ruined: 0.12, cables: 3 },
  city:      { floor: [228, 9, 12], wall: [232, 12], lamp: '110,180,255', accent: '255,60,200', dark: '3,4,14', darkness: 0.78,
               sky: 'city', decor: 'neon', pillar: 'concrete', deco: 'street', ruined: 0.35, cables: 4, rain: true },
  refuge:    { floor: [24, 10, 14], wall: [26, 10], lamp: '255,150,60', accent: '255,170,90', dark: '18,9,3', darkness: 0.8,
               sky: 'indoor', decor: 'graffiti', pillar: 'concrete', deco: 'refuge', ruined: 0.25 },
  cathedral: { floor: [262, 10, 15], wall: [262, 12], lamp: '190,140,255', accent: '170,120,255', dark: '10,5,18', darkness: 0.82,
               sky: 'indoor', decor: 'window', pillar: 'stone', deco: 'stone', ruined: 0.2, cables: 2 },
  tower:     { floor: [205, 16, 11], wall: [205, 16], lamp: '120,255,240', accent: '90,220,255', dark: '2,5,10', darkness: 0.86,
               sky: 'tower', decor: 'holo', pillar: 'pylon', deco: 'circuit', ruined: 0.15, rain: true },
  // Biomas do mundo aberto (js/mundo/regioes.js): paredes sem letreiros (decor 'none'), no lugar dos
  // pilares árvores, rochas (cap: neve no topo; lava: fendas acesas) ou cristais, e o chão com
  // manchas da natureza (deco 'natural', cores em speck)
  floresta:  { floor: [128, 24, 12], wall: [138, 20], lamp: '140,255,170', accent: '90,220,120', dark: '2,10,4', darkness: 0.78,
               sky: 'indoor', decor: 'none', pillar: 'tree', deco: 'natural', ruined: 0.1, speck: ['40,90,40', '20,40,18', '90,140,60'] },
  neve:      { floor: [208, 16, 34], wall: [212, 14], lamp: '200,230,255', accent: '150,210,255', dark: '6,10,18', darkness: 0.62,
               sky: 'indoor', decor: 'none', pillar: 'rock', deco: 'natural', ruined: 0.08, cap: '235,242,255', speck: ['230,240,255', '150,170,200', '90,110,140'] },
  deserto:   { floor: [36, 38, 26], wall: [30, 30], lamp: '255,200,120', accent: '255,170,80', dark: '18,10,4', darkness: 0.6,
               sky: 'indoor', decor: 'none', pillar: 'rock', deco: 'natural', ruined: 0.3, speck: ['200,150,80', '120,80,40', '230,190,120'] },
  lagoa:     { floor: [192, 34, 15], wall: [196, 26], lamp: '90,230,255', accent: '60,225,255', dark: '2,10,16', darkness: 0.74,
               sky: 'indoor', decor: 'none', pillar: 'crystal', deco: 'natural', ruined: 0.15, speck: ['40,160,200', '20,80,110', '120,230,255'] },
  vulcao:    { floor: [12, 28, 9], wall: [8, 24], lamp: '255,110,40', accent: '255,80,20', dark: '18,4,2', darkness: 0.82,
               sky: 'indoor', decor: 'none', pillar: 'rock', deco: 'natural', ruined: 0.25, lava: true, speck: ['255,90,30', '40,14,10', '120,40,20'] },
};

const ROOM_DEFS = [
  { name: 'Instalação de Contenção', sub: 'CAPÍTULO I · O HOMEM DE PRETO', theme: 'lab', tiles: 12, pillars: 3,
    say: ['SISTEMA', 'Unidade ZERO despertada. Protocolo de contenção comprometido.'],
    waves: [{ rastejador: 5 }, { rastejador: 7 }],
    npcs: [
      { model: 'cientista', name: 'GRAVAÇÃO · PROJETO ZERO', at: [0.2, 0.28], facing: 0.8, lines: [
        'Registro 0417. Projeto ZERO… a integração neural foi concluída.',
        'Se esta gravação estiver tocando, a contenção falhou. Ou alguém a desligou de propósito.',
        'A marca no pulso não é um defeito. Ela é a chave para… [sinal corrompido]',
      ] },
    ] },
  { name: 'Túneis de Serviço', sub: 'CAPÍTULO II · A ESPADA QUE DEVORA A TEMPESTADE', theme: 'tunnel', tiles: 13, pillars: 4,
    say: ['KAEL', 'A cada golpe ela fica mais forte. E algo em mim fica mais fraco.'],
    waves: [{ rastejador: 5, drone: 2 }, { rastejador: 6, drone: 3 }] },
  { name: 'Avenidas de Vesper', sub: 'CAPÍTULO III · O SEGREDO DA UNIDADE ZERO', theme: 'city', tiles: 13, pillars: 4,
    say: ['KAEL', 'Letreiros anunciando produtos para pessoas que já não existem.'],
    npcs: [
      { model: 'civil', variant: 0, name: 'SOBREVIVENTE', at: [0.88, 0.16], facing: 2.4, lines: [
        'Fica longe da avenida principal. Os drones veem tudo que brilha.',
        'Esse casaco… você é o homem de preto de que os Desconectados falam?',
      ], after: [
        'Você derrubou as sentinelas… Siga os cabos luminosos sob o asfalto. Eles levam ao refúgio.',
        'Tem um terminal militar ainda ligado em algum lugar destas ruínas. Ninguém tem coragem de chegar perto.',
      ] },
    ],
    waves: [{ rastejador: 4, cacador: 2 }, { rastejador: 4, drone: 2, cacador: 2 }, { legionario: 1, rastejador: 4 }] },
  { name: 'Refúgio dos Desconectados', sub: 'CAPÍTULO IV · A CIDADE DOS ESQUECIDOS', theme: 'refuge', tiles: 14, pillars: 5,
    say: ['DESCONECTADA', 'A Legião de Ferro achou o refúgio! Eles vieram atrás de você, homem de preto!'],
    npcs: [
      { model: 'ancia', name: 'ANCIÃ DESCONECTADA', at: [0.14, 0.45], facing: 0.4, lines: [
        'Você lutou por nós, homem de preto. Poucos lutariam por quem não pode pagar.',
        'A Legião não esquece um rosto. E o seu… eles conhecem há muito tempo.',
        'Se quer respostas, vá à Catedral. Mas os fiéis de NEXUS não dão nada de graça.',
      ] },
      { model: 'civil', variant: 1, name: 'COMERCIANTE', at: [0.86, 0.24], facing: 2.2, lines: [
        'Filtros, cabos, baterias velhas… Tudo que a rede esqueceu, eu guardo.',
        'Essa sua espada vale mais que o refúgio inteiro. Não que eu esteja oferecendo nada.',
      ] },
      { model: 'civil', variant: 2, name: 'COMBATENTE DESCONECTADA', at: [0.2, 0.84], facing: -0.6, lines: [
        'A Legião vai voltar. Da próxima vez, estaremos prontos.',
        'Sem rede, sem dono. É isso que está pintado nas paredes — e é isso que a gente defende.',
      ] },
      { model: 'civil', variant: 3, name: 'JOVEM DESCONECTADO', at: [0.82, 0.74], facing: 3.6, lines: [
        'É verdade que a sua espada come raios?',
        'Minha mãe dizia que o céu já foi azul de verdade. Você lembra disso?',
      ] },
      { model: 'civil', variant: 0, name: 'VIGIA', at: [0.32, 0.12], facing: 1.2, lines: [
        'Eu estava de vigia na entrada. Quando eles vieram, nem deu tempo de gritar.',
      ] },
    ],
    waves: [{ legionario: 1, drone: 3, rastejador: 3 }, { cacador: 3, rastejador: 5 }, { legionario: 2, drone: 2, rastejador: 2 }] },
  { name: 'Catedral do Eclipse', sub: 'CAPÍTULO IV · OS FIÉIS DA MÁQUINA', theme: 'cathedral', tiles: 14, pillars: 5,
    say: ['SACERDOTE', 'O mensageiro do novo mundo chegou... ou a causa de sua destruição definitiva.'],
    waves: [{ rastejador: 6, sacerdote: 2, cacador: 2 }, { legionario: 2, sacerdote: 3, cacador: 2 }, { legionario: 2, cacador: 3, rastejador: 5, sacerdote: 2 }] },
  { name: 'Topo da Torre Central', sub: 'CAPÍTULO VI · O ÚLTIMO ECLIPSE', theme: 'tower', tiles: 15, pillars: 4, boss: true, waves: [] },
];

const NEON_WORDS = ['BAR', 'HOTEL', 'VESPER', 'NEXUS', 'ABERTO', 'SONHOS', 'MEMÓRIAS', 'CLÍNICA', 'NOODLES', '24H'];
const NEON_COLORS = ['255,60,200', '80,220,255', '170,100,255', '255,70,90'];
const GRAFFITI = ['DESCONECTE-SE', 'SEM REDE SEM DONO', 'LEMBRE-SE', 'NEXUS MENTE', 'LIVRES'];

class Room {
  // def: definição própria (zonas do mundo aberto, js/world.js); sem ela, o setor ROOM_DEFS[index]
  constructor(index, def = null) {
    this.index = index;
    this.def = def || ROOM_DEFS[index];
    this.theme = THEMES[this.def.theme];
    this.w = this.h = this.def.tiles * TILE;
    this.seed = 9973 * (index + 1) + Math.floor(Math.random() * 100000);
    this.wallH = 150;
    // campo aberto (zonas de bioma do mundo, def.aberto): sem paredes nem plataforma; o chão segue
    // além da borda (a margem) com árvores, rochas ou cristais de paisagem, que não colidem
    this.aberto = !!this.def.aberto;
    this.margem = this.aberto ? TILE * 4 : 0;
    this.door = { x: this.w / 2, halfW: 46, open: 0, opening: false };
    this.pillars = [];
    this.torches = [];
    this.decor = [];
    this.cables = [];
    this.decals = [];
    this.skyCrack = 0;
    this.canvas = null; this.scale = 0;
    this.generate();
    this.outlinePts = this.outline();
  }

  generate() {
    const r = mulberry32(this.seed), w = this.w, h = this.h, n = this.def.tiles, th = this.theme;
    if (this.aberto) { this.generateAberto(r); return; }
    // Luminárias nas duas paredes do fundo (evitando a porta)
    for (let x = TILE * 1.5; x < w - TILE; x += TILE * 3) {
      if (Math.abs(x - this.door.x) < TILE * 1.6) continue;
      this.torches.push({ x, y: 0, ph: r() * 10 });
    }
    for (let y = TILE * 1.5; y < h - TILE; y += TILE * 3) this.torches.push({ x: 0, y, ph: r() * 10 });
    // Enfeites das paredes (telas, letreiros neon, vitrais, painéis holográficos)
    for (const side of ['L', 'R']) {
      for (let i = 0; i < n; i++) {
        if (side === 'R' && Math.abs((i + 0.5) * TILE - this.door.x) < TILE * 1.2) continue;
        const nearLamp = this.torches.some((t) => (side === 'R' ? t.y === 0 && Math.abs(t.x - (i + 0.5) * TILE) < TILE * 0.8 : t.x === 0 && Math.abs(t.y - (i + 0.5) * TILE) < TILE * 0.8));
        const prev = this.decor[this.decor.length - 1];
        if (prev && prev.side === side && prev.i === i - 1) continue;   // nunca dois enfeites colados
        if (th.decor === 'none' || nearLamp || r() > (th.decor === 'window' ? 0.32 : 0.24)) continue;
        this.decor.push({ side, i, ph: r() * 10, text: pick(th.decor === 'graffiti' ? GRAFFITI : NEON_WORDS), rgb: NEON_COLORS[(r() * NEON_COLORS.length) | 0], s: r() });
      }
    }
    // Cabos luminosos sob o piso levando energia para a torre central
    for (let c = 0; c < (th.cables || 0); c++) {
      const pts = [];
      let x = TILE * (1 + Math.floor(r() * (n - 2))), y = h;
      pts.push({ x, y });
      let horiz = false;
      while (y > 0 && pts.length < 12) {
        if (horiz) x = clamp(x + (r() < 0.5 ? -1 : 1) * TILE * (1 + Math.floor(r() * 3)), TILE, w - TILE);
        else y = Math.max(0, y - TILE * (1 + Math.floor(r() * 4)));
        pts.push({ x, y });
        horiz = !horiz;
      }
      let len = 0;
      for (let k = 1; k < pts.length; k++) len += dist(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y);
      this.cables.push({ pts, len, ph: r() });
    }
    // No topo da torre, os cabos partem do selo central em todas as direções
    if (this.def.boss) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + Math.PI / 8, cx = w / 2, cy = h / 2;
        const pts = [{ x: cx + Math.cos(a) * 240, y: cy + Math.sin(a) * 240 }, { x: cx + Math.cos(a) * (w * 0.5), y: cy + Math.sin(a) * (h * 0.5) }];
        pts[1].x = clamp(pts[1].x, 4, w - 4); pts[1].y = clamp(pts[1].y, 4, h - 4);
        this.cables.push({ pts, len: dist(pts[0].x, pts[0].y, pts[1].x, pts[1].y), ph: k / 8 });
      }
    }
    // Pilares (no topo da torre ficam simétricos)
    if (this.def.boss) {
      const m = TILE * 3.2;
      for (const [px, py] of [[m, m], [w - m, m], [m, h - m], [w - m, h - m]]) this.pillars.push(this.makePillar(r, px, py, true));
    } else {
      let tries = 0;
      while (this.pillars.length < this.def.pillars && tries++ < 200) {
        const px = TILE * 2 + r() * (w - TILE * 4), py = TILE * 2 + r() * (h - TILE * 4);
        if (dist(px, py, w / 2, h - 110) < 170) continue;          // área de entrada
        if (Math.abs(px - w / 2) < 100 && py < 230) continue;      // caminho da porta
        if (this.pillars.some((p) => dist(px, py, p.x, p.y) < 190)) continue;
        this.pillars.push(this.makePillar(r, px, py, r() < 0.55));
      }
    }
  }

  // Campo aberto: lumes no chão (fogueiras, cristais, brasas), obstáculos naturais espalhados
  // (fora do centro, onde se chega, e do meio das bordas, por onde se sai) e a paisagem em volta
  generateAberto(r) {
    const w = this.w, h = this.h, M = this.margem;
    for (let k = 0; k < 4; k++) this.torches.push({ x: w * (0.15 + 0.7 * r()), y: h * (0.15 + 0.7 * r()), ph: r() * 10, chao: true });
    let tries = 0;
    while (this.pillars.length < this.def.pillars && tries++ < 500) {
      const px = TILE + r() * (w - 2 * TILE), py = TILE + r() * (h - 2 * TILE);
      if (dist(px, py, w / 2, h / 2) < 210) continue;
      if ((Math.abs(px - w / 2) < 120 && (py < 190 || py > h - 190)) || (Math.abs(py - h / 2) < 120 && (px < 190 || px > w - 190))) continue;
      if (this.pillars.some((p) => dist(px, py, p.x, p.y) < 150)) continue;
      this.pillars.push(this.makePillar(r, px, py, r() < 0.6));
    }
    const anel = [];
    for (let x = -M + 40; x < w + M; x += 95 + r() * 55) { anel.push([x, -M * (0.2 + 0.65 * r())]); anel.push([x, h + M * (0.25 + 0.6 * r())]); }
    for (let y = -M + 40; y < h + M; y += 95 + r() * 55) { anel.push([-M * (0.2 + 0.65 * r()), y]); anel.push([w + M * (0.25 + 0.6 * r()), y]); }
    for (const [x, y] of anel) { const p = this.makePillar(r, x, y, r() < 0.75); p.deco = true; this.pillars.push(p); }
  }

  makePillar(r, x, y, tall) {
    return { x, y, r: 20 + r() * 6, h: tall ? 130 + r() * 50 : 40 + r() * 40, broken: !tall || r() < 0.4, seed: Math.floor(r() * 1e6), sprite: null, ox: 0, oy: 0 };
  }

  // Ponto aleatório livre de pilares (opcionalmente longe de 'avoid')
  randomPoint(margin = 50, avoid = null, minDist = 0) {
    let x = 0, y = 0;
    for (let i = 0; i < 40; i++) {
      x = rand(margin, this.w - margin); y = rand(margin, this.h - margin);
      if (this.pillars.some((p) => !p.deco && dist(x, y, p.x, p.y) < p.r + 34)) continue;
      if (avoid && dist(x, y, avoid.x, avoid.y) < minDist) continue;
      break;
    }
    return { x, y };
  }

  // Resolve colisão de um círculo com as paredes e pilares; retorna true se colidiu
  collide(e, isPlayer) {
    const r = e.radius, d = this.door;
    let hit = false;
    // Porta aberta: a passagem é tolerante e "encaixa" o jogador na abertura
    const inDoor = isPlayer && d.open > 0.9 && Math.abs(e.x - d.x) < d.halfW + 16;
    if (e.x < r) { e.x = r; hit = true; }
    if (e.x > this.w - r) { e.x = this.w - r; hit = true; }
    if (e.y > this.h - r) { e.y = this.h - r; hit = true; }
    if (e.y < r) {
      if (inDoor) e.x = clamp(e.x, d.x - d.halfW + r, d.x + d.halfW - r);   // atravessando a porta
      else { e.y = r; hit = true; }
    }
    for (const p of this.pillars) {
      if (p.deco) continue;   // paisagem além da borda do campo aberto
      const dx = e.x - p.x, dy = e.y - p.y, dd = Math.hypot(dx, dy), min = r + p.r;
      if (dd < min) {
        const nx = dd > 0.001 ? dx / dd : 1, ny = dd > 0.001 ? dy / dd : 0;
        e.x = p.x + nx * min; e.y = p.y + ny * min;
        hit = true;
      }
    }
    return hit;
  }

  // Ponto livre para Kael ficar de pé (Salto Dimensional)
  canStand(x, y, r) { return x > r && y > r && x < this.w - r && y < this.h - r && !this.blocksPoint(x, y, r); }

  blocksPoint(x, y, r) {
    if (x < 0 || y < 0 || x > this.w || y > this.h) return true;
    for (const p of this.pillars) if (!p.deco && dist2(x, y, p.x, p.y) < (p.r + r) * (p.r + r)) return true;
    return false;
  }

  // Linha de visão: nenhum pilar (coluna, árvore, rocha, cristal) corta o segmento; folga
  // aumenta (> 0) ou diminui (< 0) o raio de cada pilar
  linhaLivre(x0, y0, x1, y1, folga = 0) {
    const sx = x1 - x0, sy = y1 - y0, L2 = sx * sx + sy * sy || 1;
    for (const p of this.pillars) {
      if (p.deco) continue;
      const t = clamp(((p.x - x0) * sx + (p.y - y0) * sy) / L2, 0, 1), r = p.r + folga;
      if (r > 0 && dist2(x0 + sx * t, y0 + sy * t, p.x, p.y) < r * r) return false;
    }
    return true;
  }

  // Desvio de obstáculos: quem anda com velocidade (vx, vy) e vai bater num pilar até 'olhar'
  // à frente passa a seguir a tangente do pilar (o menor desvio que não bate), do lado em que já
  // está; de frente, mantém o lado escolhido para o mesmo pilar (sem ficar indeciso). out recebe
  // a nova velocidade (mesmo módulo); devolve true se desviou
  desvio(e, vx, vy, out, olhar = 60) {
    out.x = vx; out.y = vy;
    const sp = Math.hypot(vx, vy);
    if (sp < 1) return false;
    const ux = vx / sp, uy = vy / sp;
    let best = null, bt = 1e9, bl = 0, bR = 0;
    for (const p of this.pillars) {
      if (p.deco) continue;
      const R = p.r + e.radius + 3, dx = p.x - e.x, dy = p.y - e.y, t = dx * ux + dy * uy;
      if (t <= 0 || t > olhar + R) continue;
      const lat = ux * dy - uy * dx;               // > 0: o pilar fica à esquerda do caminho
      if (Math.abs(lat) >= R || t >= bt) continue;
      best = p; bt = t; bl = lat; bR = R;
    }
    if (!best) { e.desvioP = null; return false; }
    if (e.desvioP !== best) { e.desvioP = best; e.desvioLado = Math.abs(bl) > 2 ? (bl > 0 ? -1 : 1) : (e.desvioLado || (e.id % 2 ? 1 : -1)); }
    const dx = best.x - e.x, dy = best.y - e.y, D = Math.hypot(dx, dy) || 1;
    const a = Math.atan2(dy, dx) + e.desvioLado * Math.asin(Math.min(1, bR / D)) * (D < bR ? 1.15 : 1);
    out.x = Math.cos(a) * sp; out.y = Math.sin(a) * sp;
    return true;
  }

  update(dt) {
    if (this.door.opening && this.door.open < 1) this.door.open = Math.min(1, this.door.open + dt * 0.9);
  }

  // Contorno da sala na tela isométrica (a escuridão só cobre esta área; o céu fica livre)
  outline() {
    const w = this.w, h = this.h, H = this.wallH + 40, D = 64, M = this.margem;
    if (this.aberto) return [isoX(-M, h + M), isoY(-M, h + M), isoX(-M, -M), isoY(-M, -M) - 80, isoX(w + M, -M), isoY(w + M, -M), isoX(w + M, h + M), isoY(w + M, h + M) + 40];
    return [
      isoX(0, h), isoY(0, h) + D, isoX(0, h), isoY(0, h) - H, isoX(0, 0), isoY(0, 0) - H,
      isoX(w, 0), isoY(w, 0) - H, isoX(w, 0), isoY(w, 0) + D, isoX(w, h), isoY(w, h) + D,
    ];
  }

  // ---------------------------------------------------- pré-renderização
  bounds() {
    const M = this.margem;
    if (this.aberto) return { minX: -this.h - 2 * M - 40, maxX: this.w + 2 * M + 40, minY: -M - 60, maxY: (this.w + this.h) / 2 + M + 60 };
    return { minX: -this.h - 40, maxX: this.w + 40, minY: -this.wallH - 60, maxY: (this.w + this.h) / 2 + 90 };
  }

  render(scale) {
    const b = this.bounds();
    // salas grandes (campo aberto): a imagem do chão fica abaixo de ~12 Mpx (limite dos celulares)
    scale = Math.min(scale, Math.sqrt(12e6 / ((b.maxX - b.minX) * (b.maxY - b.minY))));
    this.scale = scale;
    const W = Math.ceil((b.maxX - b.minX) * scale), H = Math.ceil((b.maxY - b.minY) * scale);
    if (!this.canvas) this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, -b.minX * scale, -b.minY * scale);
    const r = mulberry32(this.seed + 17);
    if (!this.aberto) this.drawLedges(ctx, r);
    this.drawFloor(ctx, r);
    if (!this.aberto) this.drawSigil(ctx);
    if (!this.aberto) this.drawWalls(ctx, r);
    for (const d of this.decals) this.paintDecal(ctx, d);
    for (const p of this.pillars) this.renderPillar(p, scale);
  }

  // Bordas frontais: a plataforma flutua sobre o abismo, com uma faixa de luz
  drawLedges(ctx, r) {
    const w = this.w, h = this.h, depth = 60;
    const faces = [
      [[w, 0], [w, h]],    // borda inferior direita
      [[0, h], [w, h]],    // borda inferior esquerda
    ];
    faces.forEach(([a, b], idx) => {
      const ax = isoX(a[0], a[1]), ay = isoY(a[0], a[1]), bx = isoX(b[0], b[1]), by = isoY(b[0], b[1]);
      const g = ctx.createLinearGradient(0, Math.min(ay, by), 0, Math.max(ay, by) + depth);
      g.addColorStop(0, idx === 0 ? '#1a1f29' : '#141821');
      g.addColorStop(1, 'rgba(2,4,9,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by + depth); ctx.lineTo(ax, ay + depth); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(this.theme.accent, 0.22); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ax, ay + 6); ctx.lineTo(bx, by + 6); ctx.stroke();
      // Juntas das placas
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
      const n = Math.round(this.def.tiles);
      for (let i = 1; i < n; i++) {
        const t = i / n, x = lerp(ax, bx, t), y = lerp(ay, by, t);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 26 + r() * 10); ctx.stroke();
      }
    });
  }

  drawFloor(ctx, r) {
    const n = this.def.tiles, th = this.theme, [fh, fs, fl] = th.floor, deco = th.deco;
    if (this.aberto) { this.drawFloorAberto(ctx, r); return; }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x0 = i * TILE, y0 = j * TILE, x1 = x0 + TILE, y1 = y0 + TILE;
        const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [isoX(x, y), isoY(x, y)]);
        const v = r();
        // Escurece perto das bordas para dar profundidade
        const edge = Math.min(i, j, n - 1 - i, n - 1 - j);
        const dark = edge === 0 ? 0.65 : edge === 1 ? 0.85 : 1;
        const missing = v < 0.035;
        const l = (missing ? 5 : fl + r() * 5) * dark;
        ctx.fillStyle = `hsl(${fh + r() * 10},${fs + r() * 6}%,${l.toFixed(1)}%)`;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < 4; k++) ctx.lineTo(pts[k][0], pts[k][1]);
        ctx.closePath(); ctx.fill();
        // Chanfro das placas: borda superior clara, inferior escura
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(pts[3][0], pts[3][1]); ctx.lineTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.moveTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); ctx.stroke();
        const cx = isoX(x0 + TILE / 2, y0 + TILE / 2), cy = isoY(x0 + TILE / 2, y0 + TILE / 2);
        if (missing) {
          // Placa arrancada: buraco com cabos expostos
          ctx.strokeStyle = rgba(th.accent, 0.25); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx - 14, cy - 2); ctx.quadraticCurveTo(cx, cy + 6, cx + 12, cy - 3); ctx.stroke();
          ctx.fillStyle = 'rgba(70,76,90,0.6)';
          for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(cx + (r() - 0.5) * 40, cy + (r() - 0.5) * 18, 1.5 + r() * 2, 0, TAU); ctx.fill(); }
          continue;
        }
        this.floorDetail(ctx, r, deco, cx, cy, i, j, pts);
      }
    }
    // Faixa de rua no centro das avenidas
    if (deco === 'street') {
      ctx.strokeStyle = 'rgba(230,200,90,0.16)'; ctx.lineWidth = 3;
      ctx.setLineDash([22, 26]);
      ctx.beginPath(); ctx.moveTo(isoX(this.w / 2, this.h), isoY(this.w / 2, this.h)); ctx.lineTo(isoX(this.w / 2, 0), isoY(this.w / 2, 0)); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Chão natural do campo aberto: manchas grandes de cor (sem placas), detalhes do bioma e,
  // na margem, o chão escurecendo até o horizonte; uma trilha clara liga as saídas ao centro
  drawFloorAberto(ctx, r) {
    const n = this.def.tiles, th = this.theme, [fh, fs, fl] = th.floor, m = Math.round(this.margem / TILE);
    // textura do bioma no plano do chão (js/texturas.js) e a cor da terra distante, onde a borda some
    const pad = typeof TexturasMundo !== 'undefined' ? TexturasMundo.padraoIso(ctx, this.def.theme) : null;
    const longe = pad && typeof Ambiente3P !== 'undefined' ? Ambiente3P.longeIso(this.def.theme) : null;
    let varia = null, vg = null;
    if (pad) {
      const a = -m * TILE, b = (n + m) * TILE;
      ctx.fillStyle = pad;
      ctx.beginPath(); ctx.moveTo(isoX(a, a), isoY(a, a)); ctx.lineTo(isoX(b, a), isoY(b, a)); ctx.lineTo(isoX(b, b), isoY(b, b)); ctx.lineTo(isoX(a, b), isoY(a, b)); ctx.closePath(); ctx.fill();
      // variação de luz e a borda: um pixel por placa, desenhado no plano com suavização (sem emendas)
      const N = n + 2 * m;
      varia = document.createElement('canvas'); varia.width = varia.height = N;
      vg = varia.getContext('2d');
    }
    for (let i = -m; i < n + m; i++) {
      for (let j = -m; j < n + m; j++) {
        const x0 = i * TILE, y0 = j * TILE, x1 = x0 + TILE, y1 = y0 + TILE;
        const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [isoX(x, y), isoY(x, y)]);
        const fora = Math.max(0, -i, -j, i - n + 1, j - n + 1);          // tiles além da borda
        const onda = Math.sin(i * 0.7 + j * 0.31) * 0.5 + Math.sin(i * 0.23 - j * 0.57) * 0.5;
        if (vg) {
          const v = onda * 0.6 + (r() - 0.5) * 0.4;
          vg.fillStyle = fora && longe ? `rgba(${longe},${Math.min(1, fora * 0.26).toFixed(3)})` : v > 0 ? `rgba(255,248,230,${(v * 0.1).toFixed(3)})` : `rgba(0,0,0,${(-v * 0.2).toFixed(3)})`;
          vg.fillRect(i + m, j + m, 1, 1);
        } else {
          const l = (fl + onda * 2.2 + r() * 1.6) * Math.max(0.25, 1 - fora * 0.17);
          ctx.fillStyle = `hsl(${fh + onda * 6 + r() * 4},${fs + r() * 4}%,${l.toFixed(1)}%)`;
          ctx.beginPath(); ctx.moveTo(pts[0][0] - 0.6, pts[0][1]);
          for (let k = 1; k < 4; k++) ctx.lineTo(pts[k][0] + (k === 2 ? 0.6 : 0), pts[k][1] + (k === 2 ? 0.6 : 0));
          ctx.closePath(); ctx.fill();
        }
        if (fora < 2 && r() < (pad ? 0.3 : 0.8)) this.floorDetail(ctx, r, 'natural', isoX(x0 + TILE / 2, y0 + TILE / 2), isoY(x0 + TILE / 2, y0 + TILE / 2), i, j, pts);
      }
    }
    if (varia) {
      ctx.save();
      ctx.transform(1, 0.5, -1, 0.5, 0, 0);   // plano do chão (isoX = x − y, isoY = (x + y) / 2)
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(varia, -m * TILE, -m * TILE, (n + 2 * m) * TILE, (n + 2 * m) * TILE);
      ctx.restore();
    }
    // trilhas: do centro até o meio de cada borda (onde ficam as passagens)
    const w = this.w, h = this.h, S = th.speck || ['120,120,120'];
    ctx.strokeStyle = `rgba(${S[2] || S[0]},0.07)`; ctx.lineCap = 'round'; ctx.lineWidth = 34;
    for (const [x, y] of [[w / 2, 0], [w / 2, h], [0, h / 2], [w, h / 2]]) {
      ctx.beginPath(); ctx.moveTo(isoX(w / 2, h / 2), isoY(w / 2, h / 2));
      const mx = (w / 2 + x) / 2 + (r() - 0.5) * 120, my = (h / 2 + y) / 2 + (r() - 0.5) * 120;
      ctx.quadraticCurveTo(isoX(mx, my), isoY(mx, my), isoX(x, y), isoY(x, y)); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // Detalhes de cada placa do piso conforme o tema
  floorDetail(ctx, r, deco, cx, cy, i, j, pts) {
    const d = r();
    const crack = () => {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath();
      let px = cx + (r() - 0.5) * 40, py = cy + (r() - 0.5) * 16;
      ctx.moveTo(px, py);
      for (let k = 0; k < 4; k++) { px += (r() - 0.5) * 24; py += (r() - 0.5) * 10; ctx.lineTo(px, py); }
      ctx.stroke();
    };
    const grate = () => {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.4;
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath(); ctx.moveTo(cx + k * 6 - 10, cy + k * 3 - 5); ctx.lineTo(cx + k * 6 + 10, cy + k * 3 + 5); ctx.stroke();
      }
    };
    const rivets = () => {
      ctx.fillStyle = 'rgba(160,170,190,0.18)';
      for (let k = 0; k < 4; k++) {
        const px = lerp(pts[k][0], cx, 0.2), py = lerp(pts[k][1], cy, 0.2);
        ctx.fillRect(px - 1, py - 0.6, 2, 1.2);
      }
    };
    const puddle = (tint) => {
      ctx.fillStyle = `rgba(${tint},0.10)`;
      ctx.beginPath(); ctx.ellipse(cx + (r() - 0.5) * 20, cy + (r() - 0.5) * 8, 14 + r() * 14, 5 + r() * 4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,220,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();
    };
    const stain = (rgb, a) => {
      ctx.fillStyle = `rgba(${rgb},${a})`;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(cx + (r() - 0.5) * 40, cy + (r() - 0.5) * 16, 5 + r() * 10, 2 + r() * 4, 0, 0, TAU); ctx.fill(); }
    };
    switch (deco) {
      case 'natural': {
        // grama, neve, areia, musgo ou cinza: manchas e pedrinhas nas cores do bioma
        const S = this.theme.speck || ['80,80,80'];
        if (d < 0.35) stain(S[(r() * S.length) | 0], 0.18);
        else if (d < 0.5) puddle(S[2] || S[0]);
        else if (d < 0.62) crack();
        else if (d < 0.8) {
          ctx.fillStyle = `rgba(${S[1] || S[0]},0.35)`;
          for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(cx + (r() - 0.5) * 44, cy + (r() - 0.5) * 18, 1 + r() * 2.2, 0, TAU); ctx.fill(); }
        }
        break;
      }
      case 'lab':
        if (d < 0.25) rivets();
        else if (d < 0.36) grate();
        else if (d < 0.44) crack();
        else if (d < 0.48) {
          // Faixa de advertência amarela e preta
          ctx.save();
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < 4; k++) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); ctx.clip();
          ctx.strokeStyle = 'rgba(200,170,40,0.18)'; ctx.lineWidth = 6;
          for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(cx + k * 14 - 20, cy + 20); ctx.lineTo(cx + k * 14 + 20, cy - 20); ctx.stroke(); }
          ctx.restore();
        } else if (d < 0.53) stain('10,12,16', 0.4);
        break;
      case 'grate':
        if (d < 0.3) grate();
        else if (d < 0.4) puddle('80,160,200');
        else if (d < 0.55) rivets();
        else if (d < 0.62) crack();
        break;
      case 'street':
        if (d < 0.14) puddle(pick(['255,60,200', '80,200,255', '120,140,255']));
        else if (d < 0.3) crack();
        else if (d < 0.33) {
          // Tampa de bueiro
          ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(cx, cy, 13, 6.5, 0, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.stroke();
        } else if (d < 0.4) stain('8,8,12', 0.35);
        break;
      case 'refuge':
        if (d < 0.05) {
          // Tapete improvisado
          ctx.fillStyle = pick(['rgba(110,40,30,0.35)', 'rgba(60,70,40,0.35)', 'rgba(90,70,40,0.35)']);
          ctx.beginPath(); ctx.ellipse(cx, cy, 20, 9, 0, 0, TAU); ctx.fill();
        } else if (d < 0.18) {
          // Sucata espalhada
          ctx.fillStyle = 'rgba(120,110,100,0.25)';
          for (let k = 0; k < 4; k++) ctx.fillRect(cx + (r() - 0.5) * 36, cy + (r() - 0.5) * 14, 2 + r() * 5, 1.5 + r() * 2);
        } else if (d < 0.3) crack();
        else if (d < 0.38) stain('20,12,6', 0.35);
        break;
      case 'stone':
        if (d < 0.2) crack();
        else if (d < 0.26) {
          // Circuito gravado com brilho violeta tênue
          ctx.strokeStyle = 'rgba(160,110,255,0.3)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.ellipse(cx, cy, 14, 7, 0, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 22, cy - 4); ctx.moveTo(cx + 14, cy); ctx.lineTo(cx + 22, cy + 4); ctx.stroke();
        } else if (d < 0.32) stain('30,24,40', 0.3);
        break;
      case 'circuit':
        if (d < 0.32) {
          ctx.strokeStyle = 'rgba(90,220,255,0.16)'; ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx - 20, cy - 2); ctx.lineTo(cx - 6, cy - 2); ctx.lineTo(cx, cy + 3); ctx.lineTo(cx + 18, cy + 3);
          ctx.stroke();
          ctx.fillStyle = 'rgba(120,240,255,0.25)';
          ctx.fillRect(cx - 21, cy - 3.5, 3, 3); ctx.fillRect(cx + 17, cy + 1.5, 3, 3);
        } else if (d < 0.4) rivets();
        else if (d < 0.46) crack();
        break;
    }
  }

  // Emblema circular no centro da sala (o selo de NEXUS no topo da torre)
  drawSigil(ctx) {
    const cx = this.w / 2, cy = this.h / 2;
    const big = !!this.def.boss, rgb = this.theme.accent;
    const R = big ? 230 : 120;
    const ring = (rad, a, lw) => { ctx.strokeStyle = rgba(rgb, a); ctx.lineWidth = lw; isoCirclePath(ctx, cx, cy, rad); ctx.stroke(); };
    ring(R, big ? 0.35 : 0.14, 2);
    ring(R * 0.86, big ? 0.25 : 0.1, 1.2);
    ring(R * 0.42, big ? 0.3 : 0.12, 1.5);
    // Hexágono e marcações radiais
    ctx.strokeStyle = rgba(rgb, big ? 0.3 : 0.12);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * TAU;
      const x = cx + Math.cos(a) * R * 0.7, y = cy + Math.sin(a) * R * 0.7;
      i ? ctx.lineTo(isoX(x, y), isoY(x, y)) : ctx.moveTo(isoX(x, y), isoY(x, y));
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU, r0 = R * 0.86, r1 = R * (i % 6 === 0 ? 1.06 : 0.94);
      ctx.moveTo(isoX(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0), isoY(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0));
      ctx.lineTo(isoX(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1), isoY(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1));
    }
    ctx.stroke();
  }

  // Referencial do plano de uma parede (para desenhar enfeites "colados" nela)
  wallFrame(ctx, side, i) {
    const mx = side === 'R' ? (i + 0.5) * TILE : 0, my = side === 'R' ? 0 : (i + 0.5) * TILE;
    ctx.transform(1, side === 'R' ? 0.5 : -0.5, 0, 1, isoX(mx, my), isoY(mx, my));
  }

  drawWalls(ctx, r) {
    const w = this.w, h = this.h, n = this.def.tiles, th = this.theme, [wh, ws] = th.wall;
    // Parede esquerda (x = 0) e parede direita (y = 0), em segmentos de placas metálicas
    const segs = [];
    for (let j = n - 1; j >= 0; j--) segs.push({ ax: 0, ay: (j + 1) * TILE, bx: 0, by: j * TILE, side: 'L' });
    for (let i = 0; i < n; i++) segs.push({ ax: i * TILE, ay: 0, bx: (i + 1) * TILE, by: 0, side: 'R' });
    for (const s of segs) {
      const isDoor = s.side === 'R' && Math.abs((s.ax + s.bx) / 2 - this.door.x) < TILE;
      const hh = isDoor ? this.wallH + 20 : this.wallH - (r() < th.ruined ? 20 + r() * 50 : r() * 6);
      const ax = isoX(s.ax, s.ay), ay = isoY(s.ax, s.ay), bx = isoX(s.bx, s.by), by = isoY(s.bx, s.by);
      // Face da parede com gradiente vertical
      const g = ctx.createLinearGradient(0, Math.min(ay, by) - hh, 0, Math.max(ay, by));
      g.addColorStop(0, `hsl(${wh},${ws}%,${s.side === 'L' ? 17 : 14}%)`);
      g.addColorStop(1, `hsl(${wh},${ws}%,${s.side === 'L' ? 8 : 6}%)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by - hh); ctx.lineTo(ax, ay - hh); ctx.closePath(); ctx.fill();
      // Painéis: juntas horizontais, emenda vertical e rebites
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
      const step = th.pillar === 'stone' ? 18 : 30;
      for (let k = step; k < hh; k += step) {
        ctx.beginPath(); ctx.moveTo(ax, ay - k); ctx.lineTo(bx, by - k); ctx.stroke();
        if (th.pillar === 'stone') {
          const off = (k / 18) % 2 ? 0.25 : 0.75;
          const jx = lerp(ax, bx, off), jy = lerp(ay, by, off);
          ctx.beginPath(); ctx.moveTo(jx, jy - k); ctx.lineTo(jx, jy - k + 18); ctx.stroke();
        }
      }
      if (th.pillar !== 'stone') {
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - hh); ctx.stroke();
        ctx.fillStyle = 'rgba(170,180,200,0.12)';
        for (let k = step; k < hh; k += step) { ctx.fillRect(ax + (bx - ax) * 0.1 - 1, ay + (by - ay) * 0.1 - k + 3, 2, 2); ctx.fillRect(ax + (bx - ax) * 0.9 - 1, ay + (by - ay) * 0.9 - k + 3, 2, 2); }
      }
      // Faixa de luz de serviço
      ctx.strokeStyle = rgba(th.accent, 0.16); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay - 22); ctx.lineTo(bx, by - 22); ctx.stroke();
      // Tubulações nos túneis
      if (th.decor === 'pipes') {
        for (const [py, lw, col] of [[46, 7, '#1d2a30'], [58, 4, '#2a2620']]) {
          ctx.strokeStyle = col; ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(ax, ay - py); ctx.lineTo(bx, by - py); ctx.stroke();
          ctx.strokeStyle = 'rgba(200,220,230,0.1)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ax, ay - py - lw * 0.3); ctx.lineTo(bx, by - py - lw * 0.3); ctx.stroke();
        }
      }
      // Topo da parede (espessura)
      const t = 16;
      const tx = s.side === 'L' ? -t : 0, ty = s.side === 'R' ? -t : 0;
      ctx.fillStyle = `hsl(${wh},${ws}%,22%)`;
      ctx.beginPath();
      ctx.moveTo(ax, ay - hh); ctx.lineTo(bx, by - hh);
      ctx.lineTo(isoX(s.bx + tx, s.by + ty), isoY(s.bx + tx, s.by + ty) - hh);
      ctx.lineTo(isoX(s.ax + tx, s.ay + ty), isoY(s.ax + tx, s.ay + ty) - hh);
      ctx.closePath(); ctx.fill();
    }
    // Molduras dos enfeites (a parte luminosa é desenhada na camada emissiva)
    for (const d of this.decor) {
      ctx.save();
      this.wallFrame(ctx, d.side, d.i);
      switch (th.decor) {
        case 'screen': case 'holo':
          ctx.fillStyle = '#07090d'; ctx.fillRect(-18, -98, 36, 26);
          ctx.strokeStyle = '#3a404c'; ctx.lineWidth = 2; ctx.strokeRect(-18, -98, 36, 26);
          break;
        case 'neon':
          ctx.fillStyle = 'rgba(5,6,12,0.85)'; ctx.fillRect(-24, -112, 48, 22);
          break;
        case 'window':
          ctx.fillStyle = '#06040c';
          ctx.beginPath(); ctx.moveTo(-11, -40); ctx.lineTo(-11, -104); ctx.quadraticCurveTo(0, -126, 11, -104); ctx.lineTo(11, -40); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#3a3346'; ctx.lineWidth = 2.5; ctx.stroke();
          break;
        case 'graffiti':
          ctx.font = `bold 11px ${FONT_TITLE}`; ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(${d.rgb},0.28)`;
          ctx.fillText(d.text, 0, -60 - d.s * 30);
          break;
      }
      ctx.restore();
    }
    // Moldura da comporta: batentes metálicos e faixa de advertência no topo
    const d = this.door;
    const lx = isoX(d.x - d.halfW, 0), ly = isoY(d.x - d.halfW, 0), rx = isoX(d.x + d.halfW, 0), ry = isoY(d.x + d.halfW, 0);
    const dh = 112;
    ctx.fillStyle = '#020306';
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.lineTo(rx, ry - dh); ctx.lineTo(lx, ly - dh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3c4350'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - dh); ctx.lineTo(rx, ry - dh); ctx.lineTo(rx, ry); ctx.stroke();
    ctx.strokeStyle = '#1a1e25'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.moveTo(lx - 4, ly - dh - 4); ctx.lineTo(rx + 4, ry - dh - 4); ctx.lineTo(rx + 4, ry - dh - 16); ctx.lineTo(lx - 4, ly - dh - 16); ctx.closePath();
    ctx.fillStyle = '#1b1d20'; ctx.fill(); ctx.clip();
    ctx.strokeStyle = 'rgba(210,170,40,0.55)'; ctx.lineWidth = 4;
    for (let k = -2; k < 16; k++) {
      const x = lerp(lx, rx, k / 12), y = lerp(ly, ry, k / 12) - dh;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y - 20); ctx.stroke();
    }
    ctx.restore();
    // Suportes das luminárias
    for (const tc of this.torches) {
      const sx = isoX(tc.x, tc.y), sy = isoY(tc.x, tc.y) - 64;
      ctx.fillStyle = '#14171d'; ctx.fillRect(sx - 3, sy, 6, 14);
      ctx.fillStyle = '#3a404c'; ctx.fillRect(sx - 6, sy - 3, 12, 5);
    }
  }

  // Sprite pré-renderizado de cada pilar (pilone metálico, concreto ou pedra)
  renderPillar(p, scale) {
    if (NATURE_PILLARS.includes(this.theme.pillar)) { this.renderNature(p, scale); return; }
    const rx = p.r * ISO_RX, ry = p.r * ISO_RY;
    const Wd = rx * 2 + 16, Hd = p.h + ry * 2 + 40;
    const c = p.sprite || (p.sprite = document.createElement('canvas'));
    c.width = Math.ceil(Wd * scale); c.height = Math.ceil(Hd * scale);
    const g = c.getContext('2d');
    g.setTransform(scale, 0, 0, scale, 0, 0);
    p.ox = Wd / 2; p.oy = Hd - ry - 6;   // posição da base dentro do sprite
    const bx = p.ox, by = p.oy;
    const r = mulberry32(p.seed);
    const kind = this.theme.pillar, acc = this.theme.accent;
    const cols = kind === 'pylon' ? ['#12161c', '#3d4553', '#262c37', '#0d1015']
      : kind === 'concrete' ? ['#18191d', '#4a4d55', '#33363d', '#111215']
        : ['#17131b', '#3b3343', '#2a2430', '#100d13'];
    // Base
    g.fillStyle = kind === 'pylon' ? '#1a1e26' : '#1d1b22';
    g.beginPath(); g.ellipse(bx, by, rx + 6, ry + 3, 0, 0, Math.PI); g.lineTo(bx - rx - 6, by - 10); g.ellipse(bx, by - 10, rx + 6, ry + 3, 0, Math.PI, 0, true); g.closePath(); g.fill();
    // Fuste com gradiente cilíndrico
    const top = by - p.h;
    const grd = g.createLinearGradient(bx - rx, 0, bx + rx, 0);
    grd.addColorStop(0, cols[0]); grd.addColorStop(0.35, cols[1]); grd.addColorStop(0.6, cols[2]); grd.addColorStop(1, cols[3]);
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(bx - rx, by - 10);
    g.lineTo(bx - rx, top);
    const jag = [];
    if (p.broken) {
      // Topo quebrado irregular
      const steps = 6;
      for (let i = 0; i <= steps; i++) {
        const x = bx - rx + (2 * rx * i) / steps, y = top - (r() * 22) + (i % 2) * 6;
        jag.push([x, y]);
        g.lineTo(x, y);
      }
    } else g.lineTo(bx + rx, top);
    g.lineTo(bx + rx, by - 10);
    g.ellipse(bx, by - 10, rx, ry, 0, 0, Math.PI);
    g.closePath(); g.fill();
    if (kind === 'pylon') {
      // Anéis metálicos e faixa de luz vertical
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;
      for (let y = by - 30; y > top + 10; y -= 28) { g.beginPath(); g.ellipse(bx, y, rx, ry * 0.6, 0, 0, Math.PI); g.stroke(); }
      g.strokeStyle = 'rgba(200,215,235,0.12)'; g.lineWidth = 1;
      for (let y = by - 32; y > top + 10; y -= 28) { g.beginPath(); g.ellipse(bx, y, rx, ry * 0.6, 0, 0, Math.PI); g.stroke(); }
      g.fillStyle = rgba(acc, 0.55);
      g.fillRect(bx - rx * 0.45, top + 16, 2.5, Math.max(4, p.h - 40));
    } else {
      // Caneluras, rachaduras e (no concreto) vergalhões expostos
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
      for (let k = -2; k <= 2; k++) { const x = bx + k * rx * 0.38; g.beginPath(); g.moveTo(x, by - 12); g.lineTo(x, top + 14); g.stroke(); }
      if (kind === 'stone') {
        g.strokeStyle = rgba(acc, 0.35); g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(bx - rx * 0.2, by - 20); g.lineTo(bx - rx * 0.2, top + 30); g.lineTo(bx + rx * 0.2, top + 22); g.stroke();
      }
    }
    if (p.broken) {
      // Pontas expostas: vergalhões ou cabos
      g.strokeStyle = kind === 'pylon' ? '#2e3440' : '#5a4a3e'; g.lineWidth = 1.5;
      for (const [x, y] of jag) { if (r() < 0.5) { g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + (r() - 0.5) * 8, y - 10 - r() * 10); g.stroke(); } }
      if (kind === 'pylon') { g.fillStyle = rgba(acc, 0.7); g.fillRect(bx - 1, top - 4, 2, 2); }
    } else {
      // Capitel / tampa
      g.fillStyle = kind === 'pylon' ? '#2a303b' : '#2e2b33';
      g.fillRect(bx - rx - 6, top - 12, rx * 2 + 12, 14);
      g.fillStyle = kind === 'pylon' ? '#3a4250' : '#3d3943';
      g.beginPath(); g.ellipse(bx, top - 12, rx + 6, ry + 2, 0, 0, TAU); g.fill();
      if (kind === 'pylon') { g.fillStyle = rgba(acc, 0.6); g.beginPath(); g.ellipse(bx, top - 12, 4, 2, 0, 0, TAU); g.fill(); }
    }
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
    g.beginPath(); let cx = bx + (r() - 0.5) * rx, cy = top + 20 + r() * 20; g.moveTo(cx, cy);
    for (let k = 0; k < 5; k++) { cx += (r() - 0.5) * 8; cy += 8 + r() * 8; g.lineTo(cx, cy); }
    g.stroke();
    // Pichação neon nas colunas de Vesper
    if (this.theme.decor === 'neon' && r() < 0.6) {
      g.strokeStyle = `rgba(${pick(NEON_COLORS)},0.4)`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(bx - rx * 0.6, by - 30); g.quadraticCurveTo(bx, by - 46, bx + rx * 0.5, by - 28); g.stroke();
    }
  }

  // Árvore, rocha ou cristal no lugar do pilar (biomas do mundo aberto). A colisão continua a do
  // pilar (o tronco ou a base); p.hw = meia largura do desenho (a copa), para a transparência
  renderNature(p, scale) {
    const th = this.theme, kind = th.pillar, r = mulberry32(p.seed), tall = !p.broken;
    const rx = p.r * ISO_RX, ry = p.r * ISO_RY;
    const crown = kind === 'tree' ? p.r * (tall ? 2.7 : 1.9) : 0;
    const hw = kind === 'tree' ? Math.max(rx, crown * 1.1) : rx * (kind === 'rock' ? 1.45 : 1.5);
    const H = kind === 'rock' ? Math.min(p.h * 0.62, 96) : p.h;
    const Wd = hw * 2 + 20, Hd = H + crown * 0.6 + ry * 2 + 40;
    const c = p.sprite || (p.sprite = document.createElement('canvas'));
    c.width = Math.ceil(Wd * scale); c.height = Math.ceil(Hd * scale);
    const g = c.getContext('2d');
    g.setTransform(scale, 0, 0, scale, 0, 0);
    p.ox = Wd / 2; p.oy = Hd - ry - 6; p.hw = hw;
    const bx = p.ox, by = p.oy, acc = th.accent, [wh, ws] = th.wall;
    // sombra no chão
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.ellipse(bx + 4, by + 2, hw * 0.9, ry * 1.4 + 3, 0, 0, TAU); g.fill();
    if (kind === 'tree') {
      // tronco com raízes e casca, copa em tufos (escura embaixo, com a luz do tema por cima)
      const top = by - (tall ? H * 0.55 : H * 0.35), tw = rx * 0.55;
      g.fillStyle = '#1c130d';
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI + 0.3; g.beginPath(); g.ellipse(bx + Math.cos(a) * tw * 1.3, by - 2 + Math.sin(a) * 2, tw * 0.7, 4, a * 0.4, 0, TAU); g.fill(); }
      const tg = g.createLinearGradient(bx - tw, 0, bx + tw, 0);
      tg.addColorStop(0, '#140d08'); tg.addColorStop(0.4, '#4a3324'); tg.addColorStop(1, '#100a06');
      g.fillStyle = tg;
      g.beginPath(); g.moveTo(bx - tw * 1.15, by); g.lineTo(bx - tw * 0.8, top); g.lineTo(bx + tw * 0.8, top); g.lineTo(bx + tw * 1.15, by); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;
      for (let k = 0; k < 4; k++) { const x = bx + (r() - 0.5) * tw * 1.4; g.beginPath(); g.moveTo(x, by - 4); g.lineTo(x + (r() - 0.5) * 4, top + 6); g.stroke(); }
      const cy = top - crown * 0.35, leaves = th.speck || ['40,90,40', '20,40,18', '90,140,60'];
      const blobs = [];
      for (let k = 0; k < 9; k++) { const a = r() * TAU, d = r() * crown * 0.55; blobs.push([bx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6 - r() * crown * 0.25, crown * (0.42 + r() * 0.25)]); }
      blobs.sort((u, v) => u[1] - v[1]);
      for (const [x, y, rr] of blobs) {
        const lg = g.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr);
        lg.addColorStop(0, `rgba(${leaves[2] || leaves[0]},0.95)`); lg.addColorStop(0.55, `rgba(${leaves[0]},0.95)`); lg.addColorStop(1, `rgba(${leaves[1] || leaves[0]},0.95)`);
        g.fillStyle = lg; g.beginPath(); g.ellipse(x, y, rr, rr * 0.8, 0, 0, TAU); g.fill();
      }
      g.fillStyle = rgba(acc, 0.5);
      for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(bx + (r() - 0.5) * crown * 1.4, cy + (r() - 0.6) * crown * 0.8, 1 + r() * 1.3, 0, TAU); g.fill(); }
    } else if (kind === 'rock') {
      // rocha facetada: pontos ao redor da base subindo a um cume torto, com faces claras e escuras
      const top = by - H, n = 7, pts = [];
      for (let k = 0; k < n; k++) { const a = Math.PI + (k / (n - 1)) * Math.PI; pts.push([bx + Math.cos(a) * hw * (0.85 + r() * 0.15), by + Math.sin(a) * ry * 0.3 - (k > 0 && k < n - 1 ? H * (0.35 + r() * 0.3) * Math.sin((k / (n - 1)) * Math.PI) : 0)]); }
      const peak = [bx + (r() - 0.5) * hw * 0.5, top];
      const col = (l) => `rgb(${thirdHsl(wh / 360, ws / 100 * 0.7, l).map((v) => Math.round(v * 255)).join(',')})`;   // js/terceira.js
      g.fillStyle = col(0.16);
      g.beginPath(); g.moveTo(bx - hw, by); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(bx + hw, by); g.ellipse(bx, by, hw, ry * 0.9, 0, 0, Math.PI); g.closePath(); g.fill();
      for (let k = 0; k < n - 1; k++) {
        const a = pts[k], b = pts[k + 1], lit = k < (n - 1) / 2;
        g.fillStyle = col(lit ? 0.26 + r() * 0.08 : 0.12 + r() * 0.05);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(peak[0], peak[1]); g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
      for (const [x, y] of pts) { g.beginPath(); g.moveTo(x, y); g.lineTo(peak[0], peak[1]); g.stroke(); }
      if (th.cap) {
        g.fillStyle = rgba(th.cap, 0.92);
        g.beginPath(); g.moveTo(peak[0], peak[1]);
        for (const k of [2, 3, 4]) { const [x, y] = pts[k]; g.lineTo(peak[0] + (x - peak[0]) * 0.45, peak[1] + (y - peak[1]) * 0.45 + r() * 4); }
        g.closePath(); g.fill();
      }
      if (th.lava) {
        g.strokeStyle = rgba(acc, 0.85); g.lineWidth = 1.6;
        for (let k = 0; k < 3; k++) { let x = bx + (r() - 0.5) * hw, y = by - 4; g.beginPath(); g.moveTo(x, y); for (let q = 0; q < 4; q++) { x += (r() - 0.5) * 10; y -= H * 0.12; g.lineTo(x, y); } g.stroke(); }
      }
    } else {
      // cristais: prismas finos saindo do chão, translúcidos e acesos na cor do tema
      const n = tall ? 5 : 3;
      for (let k = 0; k < n; k++) {
        const ox = (k - (n - 1) / 2) * rx * 0.55 + (r() - 0.5) * 6, hh = H * (k === (n >> 1) ? 1 : 0.45 + r() * 0.35), lean = (ox / rx) * 0.35, w = rx * (0.28 + r() * 0.12);
        const x0 = bx + ox, y0 = by - 2, tx = x0 + lean * hh, ty = y0 - hh;
        const cg = g.createLinearGradient(x0 - w, 0, x0 + w, 0);
        cg.addColorStop(0, rgba(acc, 0.35)); cg.addColorStop(0.45, rgba('220,250,255', 0.75)); cg.addColorStop(1, rgba(acc, 0.25));
        g.fillStyle = cg;
        g.beginPath(); g.moveTo(x0 - w, y0); g.lineTo(tx - w * 0.8, ty + w * 1.4); g.lineTo(tx, ty); g.lineTo(tx + w * 0.8, ty + w * 1.4); g.lineTo(x0 + w, y0); g.closePath(); g.fill();
        g.strokeStyle = rgba(acc, 0.9); g.lineWidth = 1; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(tx, ty); g.stroke();
      }
    }
  }

  // Manchas (fluidos e queimaduras) pintadas permanentemente no chão
  addDecal(x, y, r, rgb) {
    if (x < 0 || y < 0 || x > this.w || y > this.h) return;
    const d = { x, y, r, rgb, kind: 'blood' };
    this.pushDecal(d);
  }
  addScorch(x, y, r) { this.pushDecal({ x, y, r, rgb: '0,0,0', kind: 'scorch' }); }
  pushDecal(d) {
    this.decals.push(d);
    if (this.decals.length > 500) this.decals.shift();
    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      const b = this.bounds(), s = this.scale;
      ctx.setTransform(s, 0, 0, s, -b.minX * s, -b.minY * s);
      this.paintDecal(ctx, d);
    }
  }
  paintDecal(ctx, d) {
    const sx = isoX(d.x, d.y), sy = isoY(d.x, d.y);
    const r = mulberry32(Math.floor(d.x * 13 + d.y * 7));
    if (d.kind === 'scorch') {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, d.r * 1.3);
      g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(sx, sy, d.r * 1.3, d.r * 0.65, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
      for (let k = 0; k < 5; k++) {
        const a = r() * TAU;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * d.r * (0.6 + r() * 0.6), sy + Math.sin(a) * d.r * 0.4); ctx.stroke();
      }
      return;
    }
    ctx.fillStyle = `rgba(${d.rgb},0.55)`;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(sx + (r() - 0.5) * d.r * 1.6, sy + (r() - 0.5) * d.r * 0.8, d.r * (0.5 + r() * 0.6), d.r * (0.25 + r() * 0.3), 0, 0, TAU);
      ctx.fill();
    }
  }

  // ---------------------------------------------------- desenho em tempo real
  drawBackground(ctx) {
    if (!this.canvas) return;
    const b = this.bounds();
    ctx.drawImage(this.canvas, b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
  }

  // Comporta blindada: duas folhas que deslizam para os lados ao abrir
  drawDoor(ctx) {
    if (this.aberto) return;
    const d = this.door, dh = 112;
    const lx = isoX(d.x - d.halfW, 0), ly = isoY(d.x - d.halfW, 0), rx = isoX(d.x + d.halfW, 0), ry = isoY(d.x + d.halfW, 0);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.lineTo(rx, ry - dh); ctx.lineTo(lx, ly - dh); ctx.closePath(); ctx.clip();
    const slide = easeInOut(d.open) * d.halfW;
    for (const k of [-1, 1]) {
      const x0 = k < 0 ? d.x - d.halfW - slide : d.x + slide, x1 = x0 + d.halfW;
      const ax = isoX(x0, 0), ay = isoY(x0, 0), bx = isoX(x1, 0), by = isoY(x1, 0);
      ctx.fillStyle = k < 0 ? '#2b313b' : '#242932';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by - dh); ctx.lineTo(ax, ay - dh); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5;
      for (let yy = 22; yy < dh; yy += 22) { ctx.beginPath(); ctx.moveTo(ax, ay - yy); ctx.lineTo(bx, by - yy); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(210,170,40,0.35)'; ctx.lineWidth = 3;
      const ex = k < 0 ? bx : ax, ey = k < 0 ? by : ay;
      ctx.beginPath(); ctx.moveTo(ex, ey - 6); ctx.lineTo(ex, ey - dh + 6); ctx.stroke();
    }
    ctx.restore();
  }

  // Camada emissiva: luminárias, enfeites luminosos, cabos de energia e a comporta
  drawEmissive(ctx, time) {
    const th = this.theme;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Cabos de energia sob o piso, com pulsos correndo em direção à torre
    for (const c of this.cables) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(th.accent, 0.05); ctx.lineWidth = 4;
      ctx.beginPath();
      c.pts.forEach((pt, k) => (k ? ctx.lineTo(isoX(pt.x, pt.y), isoY(pt.x, pt.y)) : ctx.moveTo(isoX(pt.x, pt.y), isoY(pt.x, pt.y))));
      ctx.stroke();
      ctx.strokeStyle = rgba(th.accent, 0.11); ctx.lineWidth = 1.2; ctx.stroke();
      let dd = ((time * 0.18 + c.ph) % 1) * c.len;
      for (let k = 1; k < c.pts.length; k++) {
        const a = c.pts[k - 1], b = c.pts[k], L = dist(a.x, a.y, b.x, b.y);
        if (dd <= L) { const t = dd / (L || 1), x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t); GlowCache.drawFlat(ctx, th.accent, isoX(x, y), isoY(x, y), 26, 0.55); break; }
        dd -= L;
      }
    }
    // Luminárias de cada tema
    for (const tc of this.torches) {
      if (tc.chao) {
        // lume no chão do campo aberto (fogueira, cristal ou brasa, na cor da luz do tema)
        const sx = isoX(tc.x, tc.y), sy = isoY(tc.x, tc.y), f = 0.8 + 0.2 * Math.sin(time * 9 + tc.ph);
        GlowCache.drawFlat(ctx, th.lamp, sx, sy, 70 * f, 0.4 * f);
        GlowCache.draw(ctx, th.lamp, sx, sy - 8, 16 * f, 0.85);
        GlowCache.draw(ctx, '255,255,255', sx, sy - 8, 4, 0.6);
        continue;
      }
      const sx = isoX(tc.x, tc.y), sy = isoY(tc.x, tc.y) - 70;
      let f = 0.85 + 0.15 * Math.sin(time * 11 + tc.ph);
      if (th.decor === 'screen') f = 0.35 + 0.65 * Math.max(0, Math.sin(time * 3.2 + tc.ph));   // giroflex de emergência
      GlowCache.draw(ctx, th.lamp, sx, sy, 34 * f, 0.6 * f);
      GlowCache.draw(ctx, th.lamp, sx, sy, 12, 0.9);
      GlowCache.draw(ctx, '255,255,255', sx, sy, 4, 0.8);
    }
    // Enfeites luminosos das paredes
    for (const d of this.decor) {
      const fl = 0.75 + 0.25 * Math.sin(time * 7 + d.ph) * (Math.sin(time * 1.3 + d.ph * 3) > 0.92 ? 1 : 0.15);
      ctx.globalAlpha = 1;
      ctx.save();
      this.wallFrame(ctx, d.side, d.i);
      switch (th.decor) {
        case 'screen': case 'holo': {
          const rgb = th.decor === 'holo' ? th.lamp : '190,230,255';
          ctx.fillStyle = rgba(rgb, 0.16 * fl);
          ctx.fillRect(-16, -96, 32, 22);
          ctx.fillStyle = rgba(rgb, 0.4 * fl);
          for (let k = 0; k < 4; k++) ctx.fillRect(-13, -93 + k * 5, 8 + ((d.ph * 7 + k * 5 + Math.floor(time * 2)) % 18), 1.5);
          GlowCache.draw(ctx, rgb, 0, -85, 38, 0.3 * fl);
          break;
        }
        case 'neon': {
          ctx.font = `bold 15px ${FONT_TITLE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const tw = ctx.measureText(d.text).width;
          if (tw > 42) ctx.font = `bold ${Math.floor(15 * 42 / tw)}px ${FONT_TITLE}`;
          const on = Math.sin(time * 9 + d.ph) > -0.95 ? 1 : 0.2;
          ctx.fillStyle = rgba(d.rgb, 0.95 * on);
          ctx.fillText(d.text, 0, -101);
          ctx.strokeStyle = rgba(d.rgb, 0.6 * on); ctx.lineWidth = 1.2;
          ctx.strokeRect(-23, -111, 46, 20);
          GlowCache.draw(ctx, d.rgb, 0, -101, 46, 0.4 * on);
          break;
        }
        case 'window': {
          ctx.fillStyle = rgba(th.lamp, 0.16 * fl);
          ctx.beginPath(); ctx.moveTo(-9, -42); ctx.lineTo(-9, -103); ctx.quadraticCurveTo(0, -122, 9, -103); ctx.lineTo(9, -42); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = rgba(th.lamp, 0.35 * fl); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(0, -112); ctx.moveTo(-9, -80); ctx.lineTo(9, -80); ctx.stroke();
          GlowCache.draw(ctx, th.lamp, 0, -80, 34, 0.25 * fl);
          break;
        }
      }
      ctx.restore();
    }
    // Luz de status da comporta: vermelha fechada, azul aberta
    ctx.globalAlpha = 1;
    if (this.aberto) { ctx.restore(); return; }
    const d = this.door;
    const mx = isoX(d.x, 0), my = isoY(d.x, 0);
    GlowCache.draw(ctx, d.open > 0 ? '90,200,255' : '255,50,70', mx, my - 130, 16, 0.9);
    if (d.open > 0) {
      GlowCache.draw(ctx, '110,190,255', mx, my - 50, 120 * d.open, 0.4 * d.open);
      GlowCache.drawFlat(ctx, '110,190,255', isoX(d.x, 30), isoY(d.x, 30), 120 * d.open, 0.35 * d.open);
    }
    ctx.restore();
  }

  addLights(lighting, time) {
    const th = this.theme;
    for (const tc of this.torches) {
      if (tc.chao) { lighting.add(isoX(tc.x, tc.y), isoY(tc.x, tc.y) - 20, 230 * (0.85 + 0.15 * Math.sin(time * 9 + tc.ph)), 0.7); continue; }
      let f = 0.85 + 0.15 * Math.sin(time * 11 + tc.ph);
      if (th.decor === 'screen') f = 0.55 + 0.45 * Math.max(0, Math.sin(time * 3.2 + tc.ph));
      lighting.add(isoX(tc.x + (tc.x === 0 ? 30 : 0), tc.y + (tc.y === 0 ? 30 : 0)), isoY(tc.x, tc.y) - 40, 210 * f, 0.75);
    }
    for (const d of this.decor) {
      if (th.decor === 'graffiti' || th.decor === 'pipes') continue;
      const x = d.side === 'R' ? (d.i + 0.5) * TILE : 20, y = d.side === 'R' ? 20 : (d.i + 0.5) * TILE;
      lighting.add(isoX(x, y), isoY(x, y) - 60, 130, 0.45);
    }
    if (this.door.open > 0) lighting.add(isoX(this.door.x, 20), isoY(this.door.x, 20) - 40, 260, 0.8 * this.door.open);
  }

  drawDebug(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,230,80,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(isoX(0, 0), isoY(0, 0)); ctx.lineTo(isoX(this.w, 0), isoY(this.w, 0));
    ctx.lineTo(isoX(this.w, this.h), isoY(this.w, this.h)); ctx.lineTo(isoX(0, this.h), isoY(0, this.h));
    ctx.closePath(); ctx.stroke();
    for (const p of this.pillars) drawHurtbox(ctx, p.x, p.y, p.r, '90,160,255');
    ctx.restore();
  }
}

// Estilos de pilar que viram natureza (Room.renderNature)
const NATURE_PILLARS = ['tree', 'rock', 'crystal'];

// Pilar como objeto desenhável na ordenação por profundidade
function drawPillar(ctx, p, player) {
  if (!p.sprite) return;
  const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y);
  // Fica translúcido quando esconde o jogador
  let alpha = 1;
  if (player && player.depth < p.x + p.y) {
    const px = isoX(player.x, player.y), py = isoY(player.x, player.y);
    if (Math.abs(px - sx) < (p.hw || p.r * ISO_RX) + 18 && py < sy + 10 && py > sy - p.h - 40) alpha = 0.38;
  }
  ctx.globalAlpha = alpha;
  ctx.drawImage(p.sprite, sx - p.ox, sy - p.oy, p.sprite.width / game.room.scale, p.sprite.height / game.room.scale);
  ctx.globalAlpha = 1;
}

