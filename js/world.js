'use strict';
// ECLIPSE ZERO · Mundo aberto (protótipo jogável, fase 2 do plano): regiões, zonas, mapa
// ---------------------------------------------------------------------------
// MODO MUNDO ABERTO (menu inicial → MUNDO ABERTO): 10 regiões exploráveis em quatro faixas de
// nível até o 100 (WORLD_FAIXAS). As RUÍNAS DE CARMESIN têm 9 zonas numa grade 3×3; as outras seis
// da faixa inicial (js/mundo/regioes.js), 6 zonas em 2×3; as três cidades das faixas altas
// (Metrópole Tecnológica, Ruínas Carmesins e Nexus Zero), 9 zonas em 3×3 com a cidade no centro.
// As zonas se ligam por PASSAGENS nas bordas (pare sobre a luz para seguir), com
// ACAMPAMENTOS de inimigos que dormem até o herói chegar perto (ou ser atacado), BAÚS
// (células, experiência e reparo), TERMINAIS com memórias, um local SECRETO, PORTAIS de
// viagem rápida, NPCs na zona de chegada e o CHEFE REGIONAL na última zona. Entrar numa zona
// pela primeira vez a DESCOBRE (experiência). O MAPA (tecla M, ou o portal) mostra as 7
// regiões com o nível recomendado; uma região abre com o chefe da anterior derrotado ou com
// o herói no nível mínimo dela, e a primeira ida é pelo portal até a zona de chegada.
// Tudo reaproveita o jogo: Room (cenário e colisão, com a zona no lugar de ROOM_DEFS),
// inimigos, combate, NPCs, HUD, árvores e o Player de qualquer personagem. O progresso fica
// numa chave própria do localStorage (não mexe nos 5 espaços da campanha).
// ---------------------------------------------------------------------------
const WORLD_SAVE_KEY = 'eclipse_zero_mundo_v1';

// Regiões do mapa do mundo (at: posição no mapa, de 0 a 1). hub: zona de chegada (portal e
// mercador); boss: o chefe regional (nome e tipo do inimigo); order: a sequência sugerida — uma região
// abre quando a anterior tem o chefe derrotado ou o herói chega ao nível mínimo dela
// (World.regionOpen). As zonas de Carmesin estão aqui embaixo; as das outras, em js/mundo/regioes.js.
// minLv: região das faixas altas, que só abre com o herói nesse nível (o chefe anterior não basta)
const WORLD_REGIONS = [
  { id: 'carmesin', name: 'Ruínas de Carmesin', biome: 'Zona de Corrupção', lv: [1, 10], rgb: '255,50,90', at: [0.5, 0.45], r: 0.15, open: true,
    order: 0, hub: 'mercado', boss: { name: 'GUARDIÃO CARMESIM', type: 'legionario', hp: 2 },
    desc: 'Estruturas destruídas, energia vermelha e criaturas corrompidas no coração do mundo.' },
  { id: 'nexus', name: 'Nexus', biome: 'Área Urbana', lv: [10, 20], rgb: '90,200,255', at: [0.74, 0.2], r: 0.12,
    order: 3, hub: 'nexus_portao', boss: { name: 'ARAUTO DE NEXUS', type: 'legionario', hp: 2.6 },
    desc: 'A metrópole de NEXUS: comerciantes, missões e a torre que vigia tudo.' },
  { id: 'velmora', name: 'Floresta de Velmora', biome: 'Floresta', lv: [8, 16], rgb: '90,220,120', at: [0.2, 0.28], r: 0.13,
    order: 1, hub: 'velmora_clareira', boss: { name: 'GUARDIÃ DAS RAÍZES', type: 'cacador', hp: 3 },
    desc: 'Vegetação densa, ruínas antigas e caminhos secretos.' },
  { id: 'asterion', name: 'Montanhas de Asterion', biome: 'Montanha', lv: [18, 28], rgb: '210,225,255', at: [0.45, 0.1], r: 0.12,
    order: 5, hub: 'asterion_acampamento', boss: { name: 'TITÃ DO PICO', type: 'legionario', hp: 3 },
    desc: 'Picos nevados, cavernas, fortalezas e chefes poderosos.' },
  { id: 'seraph', name: 'Deserto de Seraph', biome: 'Deserto', lv: [14, 24], rgb: '240,170,80', at: [0.2, 0.7], r: 0.14,
    order: 4, hub: 'seraph_oasis', boss: { name: 'FARAÓ DE SUCATA', type: 'legionario', hp: 2.8 },
    desc: 'Dunas, templos soterrados, tempestades e equipamentos raros.' },
  { id: 'lagoa', name: 'Lagoa Cristalina', biome: 'Água / Lago', lv: [12, 22], rgb: '60,225,255', at: [0.78, 0.55], r: 0.12,
    order: 2, hub: 'lagoa_cais', boss: { name: 'SENTINELA DO ABISMO', type: 'sacerdote', hp: 3.2 },
    desc: 'Águas luminosas, ilhas e ruínas submersas.' },
  { id: 'obsidiano', name: 'Cratera de Obsidiano', biome: 'Vulcânico', lv: [25, 40], rgb: '255,110,40', at: [0.52, 0.8], r: 0.13,
    order: 6, hub: 'obsidiano_posto', boss: { name: 'NÚCLEO DE OBSIDIANA', type: 'legionario', hp: 3.6 },
    desc: 'Território vulcânico: lava, inimigos de alto nível e eventos mundiais.' },
  // Faixas altas: cidades enormes com distritos, cada uma com a sua chegada (a cidade no centro)
  { id: 'metropole', name: 'Metrópole Tecnológica', biome: 'Megacidade', lv: [25, 50], minLv: 25, rgb: '80,225,255', at: [0.92, 0.37], r: 0.085,
    order: 7, hub: 'metro_centro', boss: { name: 'SUPERVISOR ÔMEGA', type: 'legionario', hp: 4.4 },
    desc: 'Torres de vidro, trens suspensos e a corporação que ainda vigia cada rua. A cidade de quem chega ao nível 25.' },
  { id: 'ruinas', name: 'Cidade das Ruínas Carmesins', biome: 'Cidade em ruínas', lv: [50, 75], minLv: 50, rgb: '230,50,80', at: [0.07, 0.45], r: 0.08,
    order: 8, hub: 'rc_cidadela', boss: { name: 'REI CARMESIM', type: 'sacerdote', hp: 5.2 },
    desc: 'A capital antiga, partida pela energia vermelha: catedrais, mercados mortos e a cidadela onde os sobreviventes resistem.' },
  { id: 'nexuszero', name: 'Nexus Zero', biome: 'Núcleo digital', lv: [75, 100], minLv: 75, rgb: '175,135,255', at: [0.92, 0.1], r: 0.075,
    order: 9, hub: 'nz_santuario', boss: { name: 'NEXUS ZERO', type: 'legionario', hp: 6.5 },
    desc: 'O lugar onde o NEXUS nasceu: uma cidade de dados que se reescreve sozinha. O fim do caminho, até o nível 100.' },
];
// Faixas de nível do mundo e a cidade de cada uma (mapa, portões da cidade e README)
const WORLD_FAIXAS = [
  { id: 'inicial', nome: 'Cidade inicial · Refúgio da Aurora', lv: [1, 25], cidade: 'aurora', regioes: ['carmesin', 'velmora', 'nexus', 'lagoa', 'seraph', 'asterion'] },
  { id: 'metropole', nome: 'Metrópole Tecnológica', lv: [25, 50], cidade: 'metro_centro', regioes: ['obsidiano', 'metropole'] },
  { id: 'ruinas', nome: 'Cidade das Ruínas Carmesins', lv: [50, 75], cidade: 'rc_cidadela', regioes: ['ruinas'] },
  { id: 'nexuszero', nome: 'Nexus Zero', lv: [75, 100], cidade: 'nz_santuario', regioes: ['nexuszero'] },
];

// Zonas das Ruínas de Carmesin (grade 3×3: r = linha, c = coluna; o norte é r = 0).
// Campos de Room: name, sub, theme, tiles, pillars; do mundo: lv, camps, chests, terminal,
// portal, npcs, secret (baú escondido), boss (acampamento do chefe regional)
const WORLD_ZONES = {
  portoes: { r: 0, c: 0, name: 'Portões Partidos', theme: 'city', tiles: 15, pillars: 4, lv: 2, portal: true,
    camps: [{ at: [0.3, 0.3], mobs: { rastejador: 3 } }, { at: [0.72, 0.62], mobs: { rastejador: 2, cacador: 1 } }],
    chests: [{ at: [0.15, 0.82], cells: 14, xp: 40 }],
    terminal: { at: [0.82, 0.18], lines: ['Registro de tráfego: os portões fecharam às 03:12 do Dia Zero.', 'Ninguém abriu de novo. Ninguém precisou.'] } },
  avenida: { r: 0, c: 1, name: 'Avenida dos Ecos', theme: 'city', tiles: 16, pillars: 5, lv: 3,
    camps: [{ at: [0.25, 0.4], mobs: { drone: 2, rastejador: 2 } }, { at: [0.7, 0.3], mobs: { cacador: 2 } }, { at: [0.6, 0.75], mobs: { rastejador: 3 } }],
    chests: [{ at: [0.88, 0.85], cells: 18, xp: 50, heal: true }] },
  vigia: { r: 0, c: 2, name: 'Torre de Vigia', theme: 'tunnel', tiles: 14, pillars: 4, lv: 5,
    camps: [{ at: [0.5, 0.35], mobs: { drone: 3, sacerdote: 1 } }, { at: [0.3, 0.7], mobs: { cacador: 2, rastejador: 2 } }],
    chests: [{ at: [0.85, 0.15], cells: 24, xp: 80 }],
    terminal: { at: [0.15, 0.2], lines: ['A torre via a cidade inteira. Hoje vê só a luz vermelha.', 'Última ordem recebida: "não olhem para o céu".'] } },
  mercado: { r: 1, c: 0, name: 'Mercado Afundado', theme: 'refuge', tiles: 15, pillars: 4, lv: 1, portal: true, hub: true,
    npcs: [
      { model: 'civil', variant: 1, name: 'COMERCIANTE', merchant: true, at: [0.78, 0.3], facing: 2.2, lines: [
        'As Ruínas de Carmesin começam aqui. Cada passagem acesa leva para uma parte da cidade.',
        'Os baús antigos ainda guardam células. Ninguém teve coragem de abrir os do sul.',
      ] },
      { model: 'ancia', name: 'ANCIÃ DESCONECTADA', quest: true, at: [0.22, 0.32], facing: 0.4, lines: [
        'No Coração Carmesim, ao sudeste, algo grande guarda a fenda. Vá forte, ou não vá.',
        'Os portais respondem a quem já pisou neles. Use o mapa (M) para voltar depressa.',
      ] },
    ],
    chests: [{ at: [0.85, 0.82], cells: 8, xp: 20, heal: true }] },
  praca: { r: 1, c: 1, name: 'Praça Carmesim', theme: 'cathedral', tiles: 16, pillars: 5, lv: 4,
    camps: [{ at: [0.35, 0.3], mobs: { sacerdote: 1, rastejador: 3 } }, { at: [0.65, 0.65], mobs: { legionario: 1, drone: 1 } }],
    chests: [{ at: [0.12, 0.88], cells: 20, xp: 60 }],
    secret: { at: [0.92, 0.1], cells: 40, xp: 150 },
    terminal: { at: [0.5, 0.9], lines: ['A praça era vermelha antes da energia: era o mercado das flores.', 'Agora a cor vem do chão. E o chão pulsa.'] } },
  galerias: { r: 1, c: 2, name: 'Galerias de Serviço', theme: 'tunnel', tiles: 14, pillars: 4, lv: 5, portal: true,
    camps: [{ at: [0.3, 0.45], mobs: { rastejador: 2, enxame: 3 } }, { at: [0.7, 0.35], mobs: { cacador: 2, drone: 1 } }],
    chests: [{ at: [0.88, 0.88], cells: 22, xp: 70, heal: true }] },
  laboratorio: { r: 2, c: 0, name: 'Laboratório Esquecido', theme: 'lab', tiles: 14, pillars: 3, lv: 4,
    camps: [{ at: [0.5, 0.4], mobs: { drone: 2, cacador: 1 } }, { at: [0.25, 0.75], mobs: { rastejador: 3 } }],
    chests: [{ at: [0.85, 0.2], cells: 18, xp: 60 }],
    terminal: { at: [0.15, 0.15], lines: ['Projeto ZERO — ala C. Sujeito estável. Memória: em branco.', 'Nota à mão: "se ele acordar, não diga o nome dele".'] } },
  fendas: { r: 2, c: 1, name: 'Fendas Rubras', theme: 'tunnel', tiles: 16, pillars: 5, lv: 6,
    camps: [{ at: [0.3, 0.3], mobs: { legionario: 1, rastejador: 2 } }, { at: [0.7, 0.55], mobs: { cacador: 2, sacerdote: 1 } }, { at: [0.4, 0.8], mobs: { drone: 2, enxame: 3 } }],
    chests: [{ at: [0.9, 0.12], cells: 28, xp: 90 }] },
  coracao: { r: 2, c: 2, name: 'Coração Carmesim', theme: 'cathedral', tiles: 17, pillars: 4, lv: 8,
    camps: [{ at: [0.5, 0.35], mobs: { legionario: 1, sacerdote: 2 }, boss: true }, { at: [0.25, 0.72], mobs: { rastejador: 3, drone: 1 } }],
    chests: [{ at: [0.5, 0.12], cells: 60, xp: 250, heal: true, boss: true }] },
};
const worldRegion = (id) => WORLD_REGIONS.find((q) => q.id === id) || WORLD_REGIONS[0];
// Completa uma zona (id, região, subtítulo); as das outras regiões entram por aqui (js/mundo/regioes.js)
function worldPrepZone(id, z) {
  WORLD_ZONES[id] = z;
  z.id = id; z.region = z.region || 'carmesin';
  z.sub = `${worldRegion(z.region).name.toUpperCase()} · NÍVEL RECOMENDADO ${z.lv}`;
  z.waves = []; z.npcs = z.npcs || [];
  return z;
}
for (const id in WORLD_ZONES) worldPrepZone(id, WORLD_ZONES[id]);
const worldZoneAt = (r, c, region = 'carmesin') => Object.values(WORLD_ZONES).find((z) => z.region === region && z.r === r && z.c === c) || null;
const worldZonesOf = (region) => Object.values(WORLD_ZONES).filter((z) => z.region === region && !z.instancia && !z.cidade);   // sem os andares das masmorras nem a cidade
const WORLD_START = 'mercado';
// Recursos de coleta dos campos abertos, por bioma (nome, cor, cura ao colher)
// (mat: o material que vai para a mochila, js/mundo/oficios.js)
const WORLD_RECURSOS = {
  floresta: { nome: 'ERVA LUMINOSA', rgb: '150,255,140', cura: 0.1, mat: 'erva' },
  lagoa: { nome: 'CRISTAL DA LAGOA', rgb: '120,235,255', mat: 'cristal' },
  neve: { nome: 'MINÉRIO DE GELO', rgb: '200,230,255', mat: 'gelo' },
  deserto: { nome: 'FRAGMENTO ENTERRADO', rgb: '255,205,120', mat: 'fragmento' },
  vulcao: { nome: 'OBSIDIANA BRUTA', rgb: '255,120,60', mat: 'obsidiana' },
};
// Monte de ferro-velho das zonas fechadas (cidade, túneis, laboratório): sucata
const WORLD_FERRO_VELHO = { nome: 'FERRO-VELHO', rgb: '170,182,204', mat: 'sucata' };
const WORLD_DIRS = { N: [-1, 0], S: [1, 0], W: [0, -1], E: [0, 1] };
const WORLD_OPP = { N: 'S', S: 'N', W: 'E', E: 'W' };

// ---------------------------------------------------------------------------
// OBJETOS DA ZONA (baú, passagem, portal, terminal): entram em game.npcs, então usam a
// mesma conversa ([E]), sombra e ordem de desenho dos NPCs; o desenho é próprio (2D + luz)
// ---------------------------------------------------------------------------
class WorldProp extends NPC {
  constructor(kind, x, y, data) {
    super({ model: null, name: '', lines: ['…'] }, x, y);
    this.kind = kind; this.data = data || {};
    this.key = null; this.height = kind === 'gate' || kind === 'portal' ? 6 : 30;
    this.flat = kind === 'gate' || kind === 'portal';   // placas no chão: o herói pisa nelas
    this.lightRgb = { chest: '255,190,90', gate: '120,200,255', portal: '170,120,255', terminal: '90,230,200', coleta: (data && data.rgb) || '160,255,170' }[kind];
    this.t = rand(0, 10); this.dwell = 0;
    this.name = { chest: 'BAÚ', gate: 'PASSAGEM', portal: 'PORTAL', terminal: 'TERMINAL', coleta: (data && data.nome) || 'RECURSO' }[kind];
    this.verb = { chest: 'Abrir', portal: 'Viajar', terminal: 'Ler', coleta: 'Coletar' }[kind];   // texto do aviso [E] no HUD
    if (kind === 'coleta') this.height = 18;
  }
  get used() {
    if (this.kind === 'coleta') return !World.coletaPronta(this.data.key);
    return this.kind === 'chest' && World.state.baus.includes(this.data.key);
  }
  update(dt) {
    this.t += dt;
    if (this.talkT > 0) this.talkT -= dt;
    // Passagem: parar sobre a luz por um instante leva para a zona vizinha
    if (this.kind === 'gate') {
      const p = game.player;
      if (p && p.state !== 'dead' && dist(p.x, p.y, this.x, this.y) < 30 && !game.fadeCb && !this.selada()) {
        this.dwell += dt;
        if (this.dwell > 0.35) { this.dwell = -99; World.go(this.data.to, this.data.dir, null, this.data.chegada || null); }
      } else if (this.dwell > 0) this.dwell = 0;
    }
  }
  // Masmorra: a passagem para o andar de cima fica selada enquanto houver inimigos de pé
  selada() { return this.kind === 'gate' && this.data.dir === 'N' && typeof Locais !== 'undefined' && Locais.selada(); }
  canTalk() {
    if (this.kind === 'gate') return false;
    if (this.kind === 'chest') return !this.used && (!this.data.secret || dist(game.player.x, game.player.y, this.x, this.y) < 120);
    if (this.kind === 'coleta') return !this.used;
    return true;
  }
  talk() {
    this.talkT = 1.2;
    if (this.kind === 'chest') World.openChest(this);
    else if (this.kind === 'coleta') World.coletar(this);
    else if (this.kind === 'portal') World.openMap(true);
    else if (this.kind === 'terminal') World.readTerminal(this);
  }
  headPoint() { return { x: isoX(this.x, this.y), y: isoY(this.x, this.y) - this.height - 18 }; }
  drawShadow(ctx) {}
  // Desenho no chão (antes da escuridão)
  draw(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), t = this.t;
    ctx.save();
    if (this.kind === 'chest') {
      if (this.data.secret && !this.used) ctx.globalAlpha = clamp(1.4 - dist(game.player.x, game.player.y, this.x, this.y) / 160, 0.06, 1);
      const open = this.used;
      ctx.fillStyle = '#1b1720'; ctx.strokeStyle = open ? 'rgba(120,110,100,0.6)' : 'rgba(255,190,90,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx - 16, sy - 6); ctx.lineTo(sx, sy + 2); ctx.lineTo(sx + 16, sy - 6); ctx.lineTo(sx + 16, sy - 20); ctx.lineTo(sx, sy - 12); ctx.lineTo(sx - 16, sy - 20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = open ? '#2a2420' : '#3a2c22';
      ctx.beginPath(); ctx.moveTo(sx - 16, sy - 20); ctx.lineTo(sx, sy - 12); ctx.lineTo(sx + 16, sy - 20); ctx.lineTo(sx, sy - (open ? 34 : 28)); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (this.kind === 'coleta') {
      // recurso do campo aberto: tufo ou cristal na cor do bioma (apagado depois de colhido)
      const rgb = this.lightRgb, on = !this.used;
      ctx.globalAlpha = on ? 1 : 0.35;
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.35, L = 10 + (k % 2 ? 6 : 12);
        ctx.strokeStyle = rgba(rgb, on ? 0.9 : 0.4); ctx.lineWidth = k % 2 ? 2 : 3;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * L, sy + Math.sin(a) * L * 1.3); ctx.stroke();
      }
    } else if (this.kind === 'terminal') {
      ctx.fillStyle = '#141a22'; ctx.fillRect(sx - 7, sy - 34, 14, 34);
      ctx.fillStyle = 'rgba(90,230,200,0.75)'; ctx.fillRect(sx - 9, sy - 44, 18, 11);
    } else {
      // passagem e portal: placa luminosa no chão
      const rgb = this.lightRgb, k = 0.6 + 0.25 * Math.sin(t * 3);
      ctx.strokeStyle = rgba(rgb, 0.8 * k); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sx, sy, 30, 15, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(rgb, 0.45 * k); ctx.beginPath(); ctx.ellipse(sx, sy, 20, 10, 0, 0, TAU); ctx.stroke();
      if (this.kind === 'portal') {
        const g = ctx.createLinearGradient(0, sy - 90, 0, sy);
        g.addColorStop(0, rgba(rgb, 0)); g.addColorStop(1, rgba(rgb, 0.22 * k));
        ctx.fillStyle = g; ctx.fillRect(sx - 18, sy - 90, 36, 90);
      }
    }
    ctx.restore();
  }
  // Luz e rótulos (depois da escuridão)
  drawEmissive(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), rgb = this.lightRgb;
    if (this.kind === 'chest' && (this.used || (this.data.secret && dist(game.player.x, game.player.y, this.x, this.y) > 160))) return;
    if (this.kind === 'coleta' && this.used) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, rgb, sx, sy - (this.kind === 'chest' ? 16 : this.kind === 'terminal' ? 40 : this.kind === 'coleta' ? 10 : 4), this.kind === 'portal' ? 70 : this.kind === 'coleta' ? 22 : 34, 0.35 + 0.1 * Math.sin(this.t * 3));
    ctx.restore();
    if (this.kind === 'gate' || this.kind === 'portal') {
      const z = WORLD_ZONES[this.data.to];
      const label = this.kind === 'portal' ? 'PORTAL · VIAGEM RÁPIDA' : this.data.rotulo ? this.data.rotulo : this.selada() ? '🔒 SELADA · DERROTE OS INIMIGOS'
        : `${this.data.dir === 'N' ? '↑' : this.data.dir === 'S' ? '↓' : this.data.dir === 'W' ? '←' : '→'} ${z ? z.name.toUpperCase() : ''}`;
      ctx.save();
      ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(label).width + 16;
      ctx.fillStyle = 'rgba(3,7,16,0.78)'; ctx.fillRect(sx - w / 2, sy - 44, w, 16);
      ctx.fillStyle = rgba(rgb, 0.95); ctx.fillText(label, sx, sy - 35.5);
      ctx.letterSpacing = '0px';
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// MODO MUNDO
// ---------------------------------------------------------------------------
const World = {
  active: false,
  zone: null,               // definição da zona atual (WORLD_ZONES)
  state: null,              // { descobertos, baus, portais, terminais, chefe, zona }
  camps: [],                // acampamentos vivos desta zona: { def, enemies, awake }
  map: { open: false, travel: false, zoom: 1, x: 0.5, y: 0.45, sel: 0, t: 0 },
  saveT: 0,

  fresh() { return { descobertos: [], baus: [], portais: [], terminais: [], chefe: false, chefes: {}, zona: WORLD_START, hora: 9, dia: 1, clima: null }; },
  bossDone(region) { const S = this.state; return !!(S.chefes && S.chefes[region]) || (region === 'carmesin' && !!S.chefe); },
  // A região abre com o chefe da anterior (na ordem sugerida) derrotado ou com o nível mínimo dela
  regionOpen(id) {
    const r = worldRegion(id);
    if (r.open) return true;
    const prev = WORLD_REGIONS.find((q) => q.order === r.order - 1);
    const nv = game.progress ? Math.max(game.progress.level, game.activeProgress ? game.activeProgress().level : 0) : 0;   // o herói em campo também conta (o personagem criado)
    if (r.minLv) return nv >= r.minLv;   // faixas altas: só pelo nível (25, 50, 75)
    return (prev && this.bossDone(prev.id)) || nv >= r.lv[0]
      || (typeof Campanhas !== 'undefined' && Campanhas.abreRegiao(id));   // capítulo da campanha do herói (js/mundo/campanhas.js)
  },

  // Começa o modo (continua do salvamento do mundo, se houver)
  start() {
    const g = game, saved = this.read();
    g.audio.unlock(); g.audio.startAmbient();
    g.stats = g.freshStats(); g.upgrades.reset(); g.progress.reset(); g.flags = {};
    if (saved && saved.game) g.applySave(saved.game);
    RosterManager.load(saved && saved.game ? saved.game.roster : (g.newRoster || null));
    g.newRoster = null;
    // Modo livre: no primeiro acesso, todos os personagens jogáveis ficam liberados para explorar
    if (!saved) for (const c of CHARACTER_DEFS) if (c.devStatus !== 'coming_soon') RosterManager.unlock(c.id, true);
    // personagem criado pelo jogador (js/criacao/): é ele quem entra no mundo (o mundo é só dele)
    const perf = typeof Perfis !== 'undefined' ? Perfis.ativo() : null;
    if (perf && CHARACTERS_BY_ID[perf.id]) { RosterManager.unlock(perf.id, true); RosterManager.active = perf.id; }
    PartyProgress.load(saved && saved.game ? saved.game.party : null);
    PartyProgress.join(RosterManager.active, g.progress.level);
    AllyRadio.reset();
    this.state = Object.assign(this.fresh(), saved ? saved.world : null);
    if (!this.state.chefes) this.state.chefes = {};
    if (this.state.chefe) this.state.chefes.carmesin = true;   // salvamentos antigos (só Carmesin)
    Aventuras.validar();   // missões sem definição, passos fora da lista, contratos velhos (sem travas)
    Dialogo.aberto = false; Eventos.prox = 150;
    this.active = true; g.world = this; g.slot = 0;   // sem espaço da campanha: o mundo salva na chave dele
    g.checkpoint = 0;
    g.counter = new ComboCounter();
    g.player = new Player(0, 0);
    g.player.recalc(true);
    if (perf && !saved) PersCriacao.equiparInicial(perf);   // equipamento inicial da classe (na mochila e vestido)
    else if (perf) Arsenal.inicial(perf.id, false);   // mundo salvo antes do conjunto do Iniciado: as peças entram na mochila (uma vez)
    g.hud.reset();
    g.victoryTimer = 0; g.ending = null; g.lostMemory = false; g.glitchT = 0;
    g.timeScale = 1; g.slowTimer = 0; g.hitStop = 0;
    const P = this.state.pos;   // (lido antes: carregar a zona salva o mundo com a posição de chegada)
    this.loadZone(this.state.zona in WORLD_ZONES ? this.state.zona : WORLD_START, null);
    // volta ao ponto onde o herói estava ao salvar (a sala é sorteada de novo: se ali agora tem um
    // pilar, o ponto livre mais perto)
    const pl = g.player, q = P && P.zona === this.zone.id ? this.pontoLivre(P.x, P.y, pl.radius + 2) : null;
    if (q) { pl.x = q[0]; pl.y = q[1]; g.camera.snap(isoX(pl.x, pl.y), isoY(pl.x, pl.y) - 30); }
    g.state = 'playing';
    g.fade = 1; g.fadeTarget = 0;
    const reg = worldRegion(this.zone.region);
    g.hud.toast(`MUNDO ABERTO · ${reg.name} — mapa: M`, reg.rgb);
  },
  // Ponto livre mais perto de (x, y) na sala atual (anéis de 20 em 20 até 240), ou null
  pontoLivre(x, y, r) {
    const R = game.room;
    if (R.canStand(x, y, r)) return [x, y];
    for (let d = 20; d <= 240; d += 20) for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, qx = x + Math.cos(a) * d, qy = y + Math.sin(a) * d;
      if (R.canStand(qx, qy, r)) return [qx, qy];
    }
    return null;
  },
  stop() { this.active = false; this.map.open = false; if (game.world === this) game.world = null; Clima.silenciar(); },

  // Carrega uma zona; 'from' = lado por onde o herói chega (N, S, W, E) ou null (portal / início);
  // 'along' (0 a 1) = onde, ao longo da borda, ele cruzou (campo aberto: sai em qualquer ponto)
  loadZone(id, from, along = null, chegada = null) {
    const g = game, z = WORLD_ZONES[id];
    this.zone = z; this.state.zona = id;
    g.audio.playMusic({ cathedral: 'nexus_encounter', lab: 'facility', vulcao: 'nexus_encounter', tower: 'nexus_encounter' }[z.theme] || 'vesper');
    g.enemies.length = 0;
    g.projectiles.clear(); g.pickups.clear(); g.particles.clear();
    g.hazards.clear(); g.trails.clear(); g.texts.clear(); g.arcs.clear();
    HeroObjects.clear();
    g.boss = null; g.eclipse = null; g.skyFlash = 0;
    g.counter.reset(true);
    g.room = new Room(0, z);
    g.room.render(g.roomScale());
    g.director.reset(Math.min(5, z.lv - 1));
    // a barra de missão e as ondas leem a zona; as ondas ficam paradas no modo mundo
    const W = g.waves;
    W.def = z; W.roomIndex = Math.min(5, z.lv - 1); W.state = 'world'; W.queue.length = 0;
    g.npcs.length = 0; g.talkTarget = null;
    // moradores (js/mundo/povo.js): a conversa abre o diálogo com missões, loja, serviços e rumores
    for (const d of z.npcs) {
      if (d.persona && d.persona.id && Aventuras.oculta(d.persona.id)) continue;   // está sendo escoltado (aparece como escolta)
      const pt = npcSpot(g.room, d.at[0], d.at[1]);
      g.npcs.push(new Morador(d, pt.x, pt.y));
    }
    const R = g.room, m = 64;
    const gatePos = { N: [R.w / 2, m], S: [R.w / 2, R.h - m], W: [m, R.h / 2], E: [R.w - m, R.h / 2] };
    for (const dir in WORLD_DIRS) {
      const nz = worldZoneAt(z.r + WORLD_DIRS[dir][0], z.c + WORLD_DIRS[dir][1], z.region);
      if (nz) g.npcs.push(new WorldProp('gate', gatePos[dir][0], gatePos[dir][1], { to: nz.id, dir }));
    }
    const spot = (at) => npcSpot(R, at[0], at[1]);
    if (z.portal) { const pt = spot([0.5, 0.5]); g.npcs.push(new WorldProp('portal', pt.x, pt.y, { to: id })); }
    (z.chests || []).forEach((c, k) => { const pt = spot(c.at); g.npcs.push(new WorldProp('chest', pt.x, pt.y, Object.assign({ key: `${id}:${k}` }, c))); });
    if (z.secret) { const pt = spot(z.secret.at); g.npcs.push(new WorldProp('chest', pt.x, pt.y, Object.assign({ key: `${id}:segredo`, secret: true }, z.secret))); }
    if (z.terminal) { const pt = spot(z.terminal.at); g.npcs.push(new WorldProp('terminal', pt.x, pt.y, Object.assign({ key: id }, z.terminal))); }
    // Campo aberto: recursos de coleta em lugares fixos da zona (voltam a crescer a cada dia)
    // (zonas fechadas fora das cidades: dois montes de ferro-velho com sucata, js/mundo/oficios.js)
    const RC = z.aberto ? WORLD_RECURSOS[z.theme] : !z.hub && !z.vila && !z.cidade ? WORLD_FERRO_VELHO : null;
    if (RC) {
      let h = 7;
      for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const rr = mulberry32(h);
      for (let k = 0; k < (z.aberto ? 5 : 2); k++) { const pt = spot([0.12 + 0.76 * rr(), 0.12 + 0.76 * rr()]); g.npcs.push(new WorldProp('coleta', pt.x, pt.y, Object.assign({ key: `${id}:c${k}` }, RC))); }
    }
    // Acampamentos (o do chefe só volta enquanto ele não foi derrotado)
    this.camps = [];
    for (const c of z.camps || []) {
      if (c.boss && this.bossDone(z.region)) continue;
      if (!Povo.campoLivre(z, c)) continue;   // vilarejo: as pessoas de lá precisam estar acessíveis
      const pt = spot(c.at), camp = { def: c, enemies: [], awake: false, x: pt.x, y: pt.y };
      for (const type in c.mobs) for (let i = 0; i < c.mobs[type]; i++) {
        const a = rand(0, TAU), r = rand(18, 70);
        let x = pt.x + Math.cos(a) * r, y = pt.y + Math.sin(a) * r;
        if (!R.canStand(x, y, 20)) { x = pt.x; y = pt.y; }
        const e = this.criarNaZona(type, x, y);
        e.dormant = true; e.camp = camp; e.setState('idle');   // já no lugar (sem a animação de surgir)
        camp.enemies.push(e); g.enemies.push(e);
      }
      // a partir do nível 6, às vezes o primeiro do acampamento é uma unidade de elite
      if (!c.boss && z.lv >= 6 && camp.enemies.length && Math.random() < Math.min(0.5, 0.1 + z.lv * 0.012)) camp.enemies[0].makeElite();
      // Campo aberto: o primeiro acampamento anda em patrulha entre três pontos da zona
      if (z.aberto && !c.boss && !this.camps.some((q) => q.patrulha)) {
        const [fx, fy] = c.at, pts = [pt, spot([clamp(fx + 0.28, 0.12, 0.88), fy]), spot([clamp(fx + 0.14, 0.12, 0.88), clamp(fy + 0.3, 0.12, 0.88)])];
        camp.patrulha = { pts };
        for (const e of camp.enemies) { e.patrulha = camp.patrulha; e.pi = 0; e.pOff = { x: e.x - pt.x, y: e.y - pt.y }; }
      }
      if (c.boss) {
        const B = worldRegion(z.region).boss;
        const b = camp.enemies.find((e) => e.type === B.type && !e.variante) || camp.enemies.find((e) => e.type === B.type) || camp.enemies[0];
        b.makeElite(); b.maxHp = b.hp = Math.round(b.maxHp * B.hp); b.worldBoss = true; b.worldRegion = z.region; b.name = b.chefeNome = B.name;
      }
      this.camps.push(camp);
    }
    // Herói: na passagem oposta à de onde veio, ou no portal / centro
    const p = g.player, arrive = from ? gatePos[WORLD_OPP[from]] : [R.w / 2, R.h / 2 + 60];
    const inward = from ? { N: [0, 70], S: [0, -70], W: [70, 0], E: [-70, 0] }[WORLD_OPP[from]] : [0, 0];
    p.x = arrive[0] + inward[0]; p.y = arrive[1] + inward[1]; p.z = 0;
    if (chegada) { const q = npcSpot(R, chegada[0], chegada[1]); p.x = q.x; p.y = q.y + 40; }   // saída de masmorra: ao lado da entrada
    if (from && along !== null) {
      // cruzou a borda num ponto qualquer: entra no mesmo ponto da borda oposta (se der para ficar ali)
      const lado = WORLD_OPP[from], k = clamp(along, 0.06, 0.94);
      const x = lado === 'W' ? 70 : lado === 'E' ? R.w - 70 : k * R.w, y = lado === 'N' ? 70 : lado === 'S' ? R.h - 70 : k * R.h;
      if (R.canStand(x, y, 22)) { p.x = x; p.y = y; }
    }
    p.air = false; p.vz = 0;
    p.vx = p.vy = p.kbx = p.kby = 0;
    p.state = 'idle'; p.stateTime = 0; p.attack = null; p.combo.reset();
    g.camera.snap(isoX(p.x, p.y), isoY(p.x, p.y) - 30);
    const dif = z.lv - g.activeProgress().level;   // zona acima do nível do herói: aviso no letreiro
    g.hud.message(z.name.toUpperCase(), dif >= 4 ? `${z.sub} · PERIGOSA PARA VOCÊ` : z.vila ? `${z.vila.nome.toUpperCase()} · ${z.sub}` : z.sub, 2.2);
    // Descoberta
    if (!this.state.descobertos.includes(id)) {
      this.state.descobertos.push(id);
      if (this.state.descobertos.length > 1) { g.hud.toast(`LOCAL DESCOBERTO · ${z.name}`, '120,220,255'); g.gainXP(30 * z.lv, p.x, p.y); }
      WorldQuests.check();
    }
    if (z.portal && !this.state.portais.includes(id)) { this.state.portais.push(id); g.hud.toast(`Portal ativado · ${z.name}`, '170,120,255'); }
    Campanhas.aoCarregar(id);   // sinal do capítulo da campanha do herói, se for esta zona (js/mundo/campanhas.js)
    Povo.aoCarregar(z);         // rotinas e quadro de contratos (js/mundo/povo.js)
    Cidade.aoCarregar(z);       // estações, bancas, monumento e portões da cidade principal (js/mundo/cidade.js)
    Clima.aoCarregar(z);        // poças, bancos de neblina, água e neve no chão da zona (js/mundo/clima.js)
    Locais.aoCarregar(z);       // entradas de masmorra, tesouros, andares (js/mundo/locais.js)
    Cenario.aoCarregar(z);      // objetos de cenário modelados no Blender (js/mundo/cenario.js)
    Aventuras.aoCarregar(z);    // pistas, desaparecidos, escoltas e chefes das missões ativas (js/mundo/aventuras.js)
    Eventos.montar();           // evento dinâmico desta zona, se houver (js/mundo/eventos.js)
    this.save();
  },
  // Inimigo (tipo ou variante, js/mundo/variantes.js) no nível da zona: acampamentos e campanhas.
  // Nível limitado (a velocidade cresce com ele); acima do nível 20 da zona, mais vida e dano
  criarNaZona(tipo, x, y) {
    const z = this.zone, e = criarInimigo(tipo, x, y, Math.min(14, game.waves.roomIndex + Math.floor(z.lv / 3)));
    if (z.lv > 20) { e.maxHp = e.hp = Math.round(e.hp * (1 + (z.lv - 20) * 0.05)); e.dmg *= 1 + (z.lv - 20) * 0.025; }
    return e;
  },
  // Vai para outra zona (passagem: 'dir'; portal: dir null)
  go(id, dir, along = null, chegada = null) {
    if (!WORLD_ZONES[id] || game.fadeCb) return;
    game.audio.play('uiSelect');
    game.fadeTo(() => { this.loadZone(id, dir, along, chegada); game.fadeTarget = 0; });
  },
  // Recursos de coleta: prontos de novo a cada dia do mundo (js/mundo/tempo.js)
  coletaPronta(key) { const C = this.state.coletas || {}; return (C[key] || 0) < (this.state.dia || 1); },
  coletar(prop) {
    const g = game, d = prop.data, z = this.zone, p = g.player;
    if (!this.coletaPronta(d.key)) return;
    (this.state.coletas || (this.state.coletas = {}))[d.key] = this.state.dia || 1;
    const cel = Math.round(4 + z.lv * 1.6);
    for (let i = 0; i < 3; i++) g.pickups.drop('soul', prop.x, prop.y, Math.round(cel / 3));
    if (d.cura) p.heal(Math.round(p.maxHp * d.cura));
    g.particles.sparks(prop.x, prop.y, 12, -Math.PI / 2, 12, d.rgb, 220, Math.PI);
    g.audio.play('soul');
    g.hud.toast(`${d.nome.charAt(0)}${d.nome.slice(1).toLowerCase()} · ${cel} células${d.cura ? ' e vida' : ''}`, d.rgb);
    if (Math.random() < 0.15) WorldInv.ganhar(WorldInv.gerar(z.lv, z.region, 0), prop.x, prop.y);
    Oficios.aoColetar(d);   // o material do recurso (e o ofício de Coleta)
    this.state.coletados = (this.state.coletados || 0) + 1;
    WorldQuests.check();
    this.save();
  },

  // Acampamentos: acordam com o herói perto ou com um deles atingido (Enemy.update chama wake)
  wake(e) {
    const c = e.camp;
    if (!c || c.awake) { e.dormant = false; return; }
    c.awake = true;
    for (const q of c.enemies) { q.dormant = false; game.particles.ring(q.x, q.y, q.radius * 2.2, q.T.glow, 0.35, 4); }
    Encontros.acordou(c);   // casa do grupo e a coleira (js/mundo/encontros.js)
    if (c.def.boss) { game.hud.message(worldRegion(this.zone.region).boss.name, 'CHEFE REGIONAL', 2.6, false, true); game.camera.shake(0.35); game.audio.play('bossRoar'); }
    else if (c.chefeMissao) { game.hud.message(c.chefeMissao, this.zone.instancia ? 'CHEFE DA MASMORRA' : 'CHEFE OPCIONAL', 2.4, false, true); game.camera.shake(0.3); game.audio.play('bossRoar'); }
    else game.audio.play('spawn');
  },
  update(dt) {
    const p = game.player;
    WorldTime.update(dt);
    // Campo aberto: andar para fora por qualquer ponto da borda leva à zona vizinha
    const z = this.zone, Rm = game.room;
    if (z && z.aberto && p.state !== 'dead' && !game.fadeCb) {
      const b = p.radius + 6;
      let dir = null;
      if (p.x <= b && p.vx < -20) dir = 'W'; else if (p.x >= Rm.w - b && p.vx > 20) dir = 'E';
      else if (p.y <= b && p.vy < -20) dir = 'N'; else if (p.y >= Rm.h - b && p.vy > 20) dir = 'S';
      const nz = dir && worldZoneAt(z.r + WORLD_DIRS[dir][0], z.c + WORLD_DIRS[dir][1], z.region);
      if (nz) this.go(nz.id, dir, dir === 'N' || dir === 'S' ? p.x / Rm.w : p.y / Rm.h);
    }
    Encontros.update(dt);   // acampamentos: percepção, alerta, luta e coleira (js/mundo/encontros.js)
    Campanhas.update(dt);
    Aventuras.update(dt);   // lugares escondidos e quem volta para casa
    Eventos.update(dt);     // eventos dinâmicos da região
    this.saveT += dt;
    if (this.saveT > 20) { this.saveT = 0; this.save(); }
  },
  inCombat() {
    for (const e of game.enemies) if (e.alive && e.state !== 'dying' && !e.dormant) return true;
    return false;
  },
  onKill(e) {
    WorldInv.onKill(e);       // saque de relíquias (js/mundo/inventario.js)
    WorldQuests.onKill(e);    // missões de abate (js/mundo/missoes.js)
    Oficios.aoAbater(e);      // materiais (sucata, núcleo, essência)
    Aventuras.onKill(e);      // missões secundárias e contratos
    Locais.onKill(e);         // chefe de masmorra, mapa do tesouro
    Eventos.onKill(e);        // caçador errante
    if (e.worldBoss) {
      Fabrica.onBoss(e);   // o plano de família da região (js/mundo/fabrica.js)
      const reg = worldRegion(e.worldRegion || 'carmesin');
      this.state.chefes[reg.id] = true;
      if (reg.id === 'carmesin') this.state.chefe = true;
      game.hud.message('CHEFE REGIONAL DERROTADO', `${reg.name.toUpperCase()} CONCLUÍDA`, 3, false, true);
      const next = WORLD_REGIONS.find((q) => q.order === reg.order + 1);
      game.hud.toast(next ? `Nova região liberada · ${next.name} (mapa: M)` : 'Todas as regiões concluídas', reg.rgb);
      game.gainXP(500 * (reg.order + 1), e.x, e.y);
      Oficios.ganharRep(reg.id, 150);
      for (let i = 0; i < 8 + reg.order * 2; i++) game.pickups.drop('soul', e.x, e.y, 6 + reg.order * 2);
      WorldQuests.check();
      this.save();
    }
  },
  openChest(prop) {
    const d = prop.data, g = game;
    const sel = (d.boss && !this.bossDone(this.zone.region)) || (d.masmorra && Locais.chefeVivo());
    if (prop.used || sel) {
      if (sel) { g.hud.toast(`Selado por ${d.masmorra ? WORLD_MASMORRAS[d.masmorra].chefe.nome : worldRegion(this.zone.region).boss.name}`, '255,92,122'); g.audio.play('uiDeny'); }
      return;
    }
    this.state.baus.push(d.key);
    const n = Math.max(1, Math.round(d.cells / 4));
    for (let i = 0; i < n; i++) g.pickups.drop('soul', prop.x, prop.y, Math.round(d.cells / n));
    if (d.heal) g.pickups.drop('health', prop.x, prop.y, 25);
    g.gainXP(d.xp, prop.x, prop.y);
    g.particles.sparks(prop.x, prop.y, 20, -Math.PI / 2, 16, '255,200,110', 300, Math.PI);
    g.audio.play('memory');
    g.hud.toast(d.secret ? `SEGREDO ENCONTRADO · ${d.cells} células` : `Baú aberto · ${d.cells} células`, '255,190,90');
    WorldInv.onChest(d, prop.x, prop.y);   // todo baú tem uma relíquia
    WorldQuests.check();
    this.save();
  },
  readTerminal(prop) {
    const d = prop.data;
    d.lines.forEach((ln, k) => setTimeout(() => { if (game.state === 'playing') game.hud.say('TERMINAL', ln, 3.6, 0, true); }, k * 3800));
    if (!this.state.terminais.includes(d.key)) { this.state.terminais.push(d.key); game.gainXP(25, prop.x, prop.y); WorldQuests.check(); Fabrica.onTerminal(); }   // às vezes um manual técnico
    game.audio.play('uiMove');
  },

  // Textos do quadro de missão do HUD
  kicker() { return this.zone.cidade ? 'CIDADE · ZONA SEGURA' : `MUNDO · NÍVEL ${this.zone.lv}`; },
  objective() {
    const S = this.state, reg = worldRegion(this.zone.region), zs = worldZonesOf(reg.id);
    const baus = zs.reduce((n, z) => n + (z.chests || []).length + (z.secret ? 1 : 0), 0);
    const bausAqui = S.baus.filter((k) => zs.some((z) => k.indexOf(z.id + ':') === 0)).length;
    const bz = zs.find((z) => (z.camps || []).some((c) => c.boss));
    const base = this.bossDone(reg.id) ? `${reg.name} concluída` : `Derrote ${reg.boss.name}${bz ? ` em ${bz.name}` : ''}`;
    const quest = typeof WorldQuests !== 'undefined' ? WorldQuests.line() : '', camp = Campanhas.linha(), ev = Eventos.linha(), av = Aventuras.linha();
    if (this.zone.cidade) return `${ev ? `${ev} · ` : ''}${camp ? `${camp} · ` : ''}${av ? `${av} · ` : ''}${quest ? `${quest} · ` : ''}Refúgio da Aurora: forje, aprimore, guarde e descanse · portões para as regiões abertas`;
    if (this.zone.instancia) { const M = WORLD_MASMORRAS[this.zone.instancia]; return `${ev ? `${ev} · ` : ''}${M.nome}: ${this.zone.ultimo ? (Locais.chefeVivo() ? `derrote ${M.chefe.nome}` : 'vencida! Abra o baú e saia') : Locais.selada() ? 'derrote os inimigos para abrir a passagem' : 'suba pela passagem'}${av ? ` · ${av}` : ''}`; }
    return `${ev ? `${ev} · ` : ''}${camp ? `${camp} · ` : ''}${av ? `${av} · ` : ''}${quest || base} · locais ${zs.filter((z) => S.descobertos.includes(z.id)).length}/${zs.length} · baús ${bausAqui}/${baus}`;
  },

  // Salvamento próprio do mundo (o jogo, o elenco e o estado das zonas)
  // Chave do salvamento: o mundo de sempre ou o do personagem criado em uso (um mundo por personagem)
  chave() { const p = typeof Perfis !== 'undefined' ? Perfis.ativo() : null; return p ? `${WORLD_SAVE_KEY}:${p.id}` : WORLD_SAVE_KEY; },
  save() {
    if (!this.active || !game.player) return;
    const p = game.player;
    if (this.zone && !this.zone.instancia) this.state.pos = { zona: this.zone.id, x: Math.round(p.x), y: Math.round(p.y) };   // posição no mundo
    const k = this.chave();
    try {
      const txt = JSON.stringify({ v: 1, game: game.makeSave(), world: this.state });
      const ant = localStorage.getItem(k);
      if (ant) localStorage.setItem(k + '_reserva', ant);   // a versão anterior fica de reserva
      localStorage.setItem(k, txt);
    } catch (e) { console.warn('Mundo: não foi possível salvar', e.message); }
  },
  // Lê o salvamento; corrompido (JSON inválido ou sem o formato), tenta a reserva
  read() {
    const k = this.chave(), ler = (kk) => { try { const s = JSON.parse(localStorage.getItem(kk) || 'null'); return s && s.v === 1 && s.world && typeof s.world === 'object' ? s : null; } catch (e) { return undefined; } };
    const s = ler(k);
    if (s) return s;
    if (s === undefined || localStorage.getItem(k)) { const r = ler(k + '_reserva'); if (r) { console.warn('Mundo: salvamento danificado, usando a reserva'); return r; } }
    return null;
  },
  // Morte no mundo: volta ao último portal com a vida cheia (os acampamentos voltam)
  respawn() {
    const g = game, last = this.state.portais[this.state.portais.length - 1] || WORLD_START;
    g.counter = new ComboCounter();
    g.player = new Player(0, 0); g.player.recalc(true);
    g.hud.reset();
    g.timeScale = 1; g.slowTimer = 0; g.hitStop = 0;
    Clima.descansar();   // volta com o corpo seco e na temperatura normal
    this.loadZone(last, null);
    g.state = 'playing'; g.fade = 1; g.fadeTarget = 0;
  },

  // ------------------------------------------------------------- mapa do mundo
  openMap(travel = false) {
    const M = this.map;
    M.open = true; M.travel = travel; M.t = 0;
    const list = this.mapTargets();
    M.sel = Math.max(0, list.indexOf(this.zone.id));
    game.state = 'worldmap';
    game.audio.play('uiMove');
  },
  closeMap() { this.map.open = false; game.state = 'playing'; game.audio.play('uiMove'); },
  // Destinos selecionáveis: zonas descobertas; na viagem, os portais ativados e a zona de chegada
  // de cada região aberta (a primeira ida a uma região nova é pelo portal)
  mapTargets() {
    const S = this.state, ids = [];
    for (const id in WORLD_ZONES) {
      const z = WORLD_ZONES[id], seen = S.descobertos.includes(id);
      if (z.instancia) continue;   // andares de masmorra não entram no mapa
      if (z.cidade) { ids.push(id); continue; }   // a cidade principal: sempre conhecida, sempre ao alcance
      if (!this.map.travel) { if (seen) ids.push(id); continue; }
      if ((seen && S.portais.includes(id)) || (worldRegion(z.region).hub === id && this.regionOpen(z.region))) ids.push(id);
    }
    return ids;
  },
  updateMap(dt, inp) {
    const M = this.map, list = this.mapTargets();
    M.t += dt;
    if (inp.pressed.back || inp.pressed.worldMap || inp.pressed.pause) { this.closeMap(); return; }
    if (inp.pressed.tabPrev) M.zoom = clamp(M.zoom / 1.25, 0.8, 3);
    if (inp.pressed.tabNext) M.zoom = clamp(M.zoom * 1.25, 0.8, 3);
    if (list.length) {
      if (inp.pressed.right || inp.pressed.down) { M.sel = (M.sel + 1) % list.length; game.audio.play('uiMove'); }
      if (inp.pressed.left || inp.pressed.up) { M.sel = (M.sel - 1 + list.length) % list.length; game.audio.play('uiMove'); }
    }
    const m = inp.mouse;
    if (m.clicked) {
      const L = this.mapLayout();
      for (const id of list) { const q = L.zones[id]; if (q && Math.abs(m.x - q.x) < q.s / 2 && Math.abs(m.y - q.y) < q.s / 2) { M.sel = list.indexOf(id); if (M.travel) { this.travel(id); return; } } }
    }
    if (inp.pressed.confirm && M.travel && list[M.sel]) this.travel(list[M.sel]);
    // fora da viagem: Enter na cidade principal começa o teletransporte (como o botão AURORA)
    else if (inp.pressed.confirm && list[M.sel] === CIDADE_ID && !Cidade.aqui()) { this.closeMap(); Cidade.teleportar(); }
  },
  travel(id) {
    this.map.open = false; game.state = 'playing';
    if (id === this.zone.id) return;
    this.go(id, null);
  },
  mapLayout() {
    const M = this.map, W = VIEW_W, H = VIEW_H, mw = Math.min(W - 80, 1100) * M.zoom, mh = (H - 150) * M.zoom;
    // com zoom, centra na região onde o herói está
    const reg = worldRegion(this.zone ? this.zone.region : 'carmesin'), at = this.zone && this.zone.cidade ? this.zone.mapa : reg.at;
    const cx = W / 2 - (at[0] - 0.5) * mw * (M.zoom - 1) / M.zoom, cy = 82 + (H - 150) / 2 - (at[1] - 0.5) * mh * (M.zoom - 1) / M.zoom;
    const x0 = cx - mw / 2, y0 = cy - mh / 2;
    const pos = (a) => ({ x: x0 + a[0] * mw, y: y0 + a[1] * mh });
    const zones = {}, s = 22 * M.zoom;
    // grade de zonas de cada região, centrada na região
    const dims = {};
    for (const id in WORLD_ZONES) { const z = WORLD_ZONES[id]; if (z.instancia || z.cidade) continue; const d = dims[z.region] || (dims[z.region] = [0, 0]); d[0] = Math.max(d[0], z.r); d[1] = Math.max(d[1], z.c); }
    for (const id in WORLD_ZONES) {
      const z = WORLD_ZONES[id], c = pos(worldRegion(z.region).at), d = dims[z.region];
      if (z.instancia) continue;
      if (z.cidade) { const q = pos(z.mapa); zones[id] = { x: q.x, y: q.y, s: s * 1.5 }; continue; }   // a cidade: no seu lugar do mapa, maior
      zones[id] = { x: c.x + (z.c - d[1] / 2) * s * 1.5, y: c.y + (z.r - d[0] / 2) * s * 1.5, s };
    }
    return { x0, y0, mw, mh, pos, zones };
  },
  // Mapa desenhado: o terreno pintado (js/mundo/mapa.js, WorldMapArt), névoa nas regiões não
  // exploradas, trilhas e marcadores das zonas, nomes das regiões, a ★ da campanha, moldura de
  // atlas e o painel da zona escolhida
  drawMap(ctx, t) {
    const M = this.map, L = this.mapLayout(), S = this.state, list = this.mapTargets();
    const CX = 20, CY = 70, CW = VIEW_W - 40, CH = VIEW_H - 130, zk = Math.min(1.5, M.zoom);
    const sel = list[M.sel];
    ctx.save();
    ctx.fillStyle = '#03060d'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);   // opaco: o mundo e os números de dano não vazam
    ctx.beginPath(); ctx.rect(CX, CY, CW, CH); ctx.clip();
    ctx.fillStyle = '#061020'; ctx.fillRect(CX, CY, CW, CH);            // o mar continua além do terreno
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(WorldMapArt.terreno(L.mw / M.zoom, L.mh / M.zoom), L.x0, L.y0, L.mw, L.mh);
    // Névoa: regiões sem nenhuma zona descoberta (bloqueadas: mais fechada, com hachura)
    const explorada = (id) => (this.zone && !this.zone.cidade && this.zone.region === id) || worldZonesOf(id).some((z) => S.descobertos.includes(z.id));
    for (const r of WORLD_REGIONS) {
      if (explorada(r.id)) continue;
      const c = L.pos(r.at);
      WorldMapArt.nevoa(ctx, c.x, c.y, r.r * Math.min(L.mw, L.mh), !this.regionOpen(r.id), t);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // Trilhas entre zonas vizinhas (passagens)
    for (const id in WORLD_ZONES) {
      const z = WORLD_ZONES[id], q = L.zones[id], rgb = worldRegion(z.region).rgb;
      if (!q) continue;
      for (const dir of ['E', 'S']) {
        const n = worldZoneAt(z.r + WORLD_DIRS[dir][0], z.c + WORLD_DIRS[dir][1], z.region);
        if (!n) continue;
        const q2 = L.zones[n.id], seen = S.descobertos.includes(id) || S.descobertos.includes(n.id);
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q2.x, q2.y); ctx.stroke();
        ctx.setLineDash(seen ? [] : [3, 4]);
        ctx.strokeStyle = rgba(rgb, seen ? 0.85 : 0.3); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q2.x, q2.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // Etiqueta com o nome de uma zona, embaixo do marcador (larg = largura máxima do texto)
    const etiqueta = (q, m, nome, larg, forte) => {
      ctx.font = `bold ${Math.round(10 * zk)}px ${FONT_UI}`;
      let txt = nome;
      if (ctx.measureText(txt).width > larg) { while (txt.length > 3 && ctx.measureText(txt + '…').width > larg) txt = txt.slice(0, -1); txt = txt.trimEnd() + '…'; }
      const w = ctx.measureText(txt).width + 10, ty = q.y + m + 10 * zk;
      ctx.fillStyle = forte ? 'rgba(3,7,16,0.92)' : 'rgba(3,7,16,0.8)'; ctx.fillRect(q.x - w / 2, ty - 7 * zk, w, 14 * zk);
      ctx.fillStyle = forte ? '#ffffff' : 'rgba(220,230,245,0.9)'; ctx.fillText(txt, q.x, ty + 0.5);
    };
    // Marcadores das zonas: losango na cor da região; ícone do que há nela
    const aqui = this.zone && (this.zone.instancia ? WORLD_MASMORRAS[this.zone.instancia].zona : this.zone.id);   // na masmorra: a zona da entrada
    for (const id in WORLD_ZONES) {
      const z = WORLD_ZONES[id], q = L.zones[id], seen = S.descobertos.includes(id), here = id === aqui;
      if (!q) continue;
      if (z.cidade) { this.drawMapCidade(ctx, q, id === sel, here, M.travel, t); continue; }
      const rgb = worldRegion(z.region).rgb, reach = seen || list.includes(id), m = q.s * 0.46;
      const chefe = z.camps && z.camps.some((c) => c.boss) && !this.bossDone(z.region);
      if (M.travel && list.includes(id)) { ctx.strokeStyle = `rgba(190,150,255,${0.45 + 0.35 * Math.sin(t * 4)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, m * 1.7, 0, TAU); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(q.x, q.y - m); ctx.lineTo(q.x + m, q.y); ctx.lineTo(q.x, q.y + m); ctx.lineTo(q.x - m, q.y); ctx.closePath();
      ctx.fillStyle = seen ? 'rgba(10,14,24,0.92)' : 'rgba(10,12,18,0.72)'; ctx.fill();
      ctx.strokeStyle = id === sel ? '#ffffff' : reach ? rgba(rgb, 0.95) : 'rgba(150,150,170,0.45)'; ctx.lineWidth = id === sel ? 2.5 : 1.4; ctx.stroke();
      const mark = !seen ? (reach ? '⌂' : '?') : chefe ? '☠' : S.portais.includes(id) ? '◈' : z.hub ? '⌂' : '•';
      ctx.font = `bold ${Math.round(m * 1.05)}px ${FONT_UI}`;
      ctx.fillStyle = !seen ? 'rgba(170,165,185,0.75)' : chefe ? '#ff7a8f' : rgba(rgb, 1);
      ctx.fillText(mark, q.x, q.y + 1);
      if (here) {
        const k = 0.5 + 0.5 * Math.sin(t * 6);
        ctx.strokeStyle = `rgba(120,220,255,${0.55 + 0.45 * k})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(q.x, q.y, m * (1.5 + 0.2 * k), 0, TAU); ctx.stroke();
      }
      // com zoom, o nome das já descobertas (cortado no espaço entre as zonas)
      if (seen && M.zoom >= 1.8 && id !== sel && !here) etiqueta(q, m, z.name, q.s * 1.5 - 6, false);
    }
    // a zona escolhida e a atual: o nome inteiro, por cima de tudo
    if (aqui && !WORLD_ZONES[aqui].cidade) { const q = L.zones[aqui]; if (q && aqui !== sel) etiqueta(q, q.s * 0.46, this.zone.name, 999, false); }
    if (sel && L.zones[sel] && !WORLD_ZONES[sel].cidade) etiqueta(L.zones[sel], L.zones[sel].s * 0.46, WORLD_ZONES[sel].name, 999, true);
    // Capítulo da campanha do herói: ★ na cor dele
    const alvo = Campanhas.zonaAlvo();
    if (alvo && L.zones[alvo]) {
      const q = L.zones[alvo], C = Campanhas.def(Campanhas.heroi()), k = 0.6 + 0.4 * Math.sin(t * 4);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      GlowCache.draw(ctx, C.rgb, q.x, q.y, q.s * 1.6, 0.6 * k);
      ctx.restore();
      ctx.font = `bold ${Math.round(q.s * 0.8)}px ${FONT_UI}`; ctx.fillStyle = rgba(C.rgb, 1);
      ctx.fillText('★', q.x + q.s * 0.55, q.y - q.s * 0.55);
    }
    // Missões (◆ dourado; a rastreada maior e pulsando), masmorras (▼), tesouros (✦), rumores (…) e eventos (⚔)
    const cantos = {};
    const marca = (zona, icon, rgb, grande) => {
      const q = L.zones[zona];
      if (!q) return;
      const n = cantos[zona] = (cantos[zona] || 0) + 1, a = -Math.PI * 0.25 + n * Math.PI * 0.5, d = q.s * 0.7;
      const x = q.x + Math.cos(a) * d, y = q.y + Math.sin(a) * d, k = 0.6 + 0.4 * Math.sin(t * 5);
      if (grande) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; GlowCache.draw(ctx, rgb, x, y, q.s * 1.2, 0.6 * k); ctx.restore(); }
      ctx.font = `bold ${Math.round(q.s * (grande ? 0.78 : 0.6))}px ${FONT_UI}`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(3,7,16,0.9)'; ctx.strokeText(icon, x, y + 1);
      ctx.fillStyle = rgba(rgb, 1); ctx.fillText(icon, x, y + 1);
    };
    for (const A of Aventuras.alvosMapa()) marca(A.zona, '◆', '255,212,122', A.rastreada);
    for (const A of Locais.marcasMapa()) marca(A.zona, A.icon, A.feito ? '160,150,180' : A.rgb, false);
    for (const A of Eventos.marcasMapa()) marca(A.zona, A.icon, A.rgb, true);
    // Nomes das regiões, numa faixa sobre cada uma
    for (const r of WORLD_REGIONS) {
      const c = L.pos(r.at), rad = r.r * Math.min(L.mw, L.mh), open = this.regionOpen(r.id), done = this.bossDone(r.id);
      const ly = M.zoom <= 1.05 ? Math.max(CY + 30, c.y - rad - 4) : c.y - rad - 4;   // com zoom, sai pela borda com a região
      const prev = WORLD_REGIONS.find((q) => q.order === r.order - 1);
      const t1 = r.name.toUpperCase() + (done ? ' ✓' : ''), t2 = `${r.biome} · Nv ${r.lv[0]}–${r.lv[1]}`;
      const t3 = open ? '' : `🔒 nível ${r.lv[0]}${prev ? ` ou o chefe de ${prev.name}` : ''}`;
      ctx.font = `bold ${Math.round(13 * zk)}px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
      const w1 = ctx.measureText(t1).width;
      ctx.letterSpacing = '0px'; ctx.font = `${Math.round(11 * zk)}px ${FONT_UI}`;
      const w = Math.max(w1, ctx.measureText(t2).width, t3 ? ctx.measureText(t3).width : 0) + 22, h = (t3 ? 50 : 36) * zk;
      ctx.fillStyle = 'rgba(3,7,16,0.72)'; ctx.fillRect(c.x - w / 2, ly - h / 2, w, h);
      ctx.fillStyle = rgba(r.rgb, open ? 0.95 : 0.45); ctx.fillRect(c.x - w / 2, ly - h / 2, w, 2);
      ctx.font = `bold ${Math.round(13 * zk)}px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
      ctx.fillStyle = open ? '#ffffff' : 'rgba(205,214,230,0.75)';
      ctx.fillText(t1, c.x, ly - h / 2 + 12 * zk);
      ctx.letterSpacing = '0px'; ctx.font = `${Math.round(11 * zk)}px ${FONT_UI}`;
      ctx.fillStyle = rgba(r.rgb, open ? 0.95 : 0.6); ctx.fillText(t2, c.x, ly - h / 2 + 26 * zk);
      if (t3) { ctx.fillStyle = 'rgba(255,190,150,0.85)'; ctx.fillText(t3, c.x, ly - h / 2 + 40 * zk); }
    }
    ctx.restore();
    WorldMapArt.moldura(ctx, CX, CY, CW, CH, t);
    // Cabeçalho, legenda e o painel da zona escolhida
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 22px ${FONT_TITLE}`; ctx.letterSpacing = '6px'; ctx.fillStyle = '#ffffff';
    ctx.fillText(M.travel ? 'VIAGEM RÁPIDA' : 'MAPA DO MUNDO', 40, 40);
    ctx.letterSpacing = '0px';
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)';
    const legenda = '⌂ base · ◈ portal · ☠ chefe · ★ campanha · ◆ missão · ▼ masmorra · ✦ tesouro · ⚔ evento · ? não descoberto · ◯ você';
    const dica = M.travel ? 'Enter: viajar · ←/→ escolher · Q/E zoom · Esc fechar' : `←/→ escolher${sel === CIDADE_ID && !Cidade.aqui() ? ' · Enter: teletransporte' : ''} · Q/E zoom · Esc fechar`;
    const duas = ctx.measureText(legenda).width + ctx.measureText(dica).width + 120 > VIEW_W;   // tela estreita: legenda e dica em duas linhas
    ctx.fillText(legenda, 40, duas ? VIEW_H - 46 : VIEW_H - 40);
    if (sel) {
      const z = WORLD_ZONES[sel], R = worldRegion(z.region);
      ctx.textAlign = 'right'; ctx.font = `bold 14px ${FONT_TITLE}`; ctx.fillStyle = '#ffd2dc';
      ctx.fillText(`${R.name.toUpperCase()} · ${z.name.toUpperCase()} · ${z.cidade ? 'CIDADE PRINCIPAL' : `NÍVEL ${z.lv}`}`, VIEW_W - 40, 40);
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.85)';
      ctx.fillText(dica, VIEW_W - 40, duas ? VIEW_H - 24 : VIEW_H - 40);
      this.drawMapInfo(ctx, sel, CX + CW - 14, CY + CH - 14);
    }
    if (this.zone && this.zone.cidade) Cidade.desenharPlanta(ctx, CX + 14, CY + CH - 254, 300, 240);   // planta dos distritos
    ctx.restore();
  },
  // Marcador da cidade principal: escudo dourado com a chama e o nome sempre à vista
  drawMapCidade(ctx, q, sel, here, travel, t) {
    const m = q.s * 0.5, rgb = '255,200,120';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; GlowCache.draw(ctx, rgb, q.x, q.y, q.s * 1.4, 0.45 + 0.15 * Math.sin(t * 2)); ctx.globalCompositeOperation = 'source-over';
    if (travel) { ctx.strokeStyle = `rgba(190,150,255,${0.45 + 0.35 * Math.sin(t * 4)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, m * 1.7, 0, TAU); ctx.stroke(); }
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + Math.PI / 8; ctx[k ? 'lineTo' : 'moveTo'](q.x + Math.cos(a) * m, q.y + Math.sin(a) * m); }
    ctx.closePath(); ctx.fillStyle = 'rgba(30,20,12,0.95)'; ctx.fill();
    ctx.strokeStyle = sel ? '#ffffff' : rgba(rgb, 1); ctx.lineWidth = sel ? 2.5 : 1.8; ctx.stroke();
    ctx.font = `bold ${Math.round(m * 1.1)}px ${FONT_UI}`; ctx.fillStyle = rgba(rgb, 1); ctx.fillText('♜', q.x, q.y + 1);
    if (here) { const k = 0.5 + 0.5 * Math.sin(t * 6); ctx.strokeStyle = `rgba(120,220,255,${0.55 + 0.45 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, m * (1.5 + 0.2 * k), 0, TAU); ctx.stroke(); }
    ctx.font = `bold ${Math.round(10 * Math.min(1.5, this.map.zoom))}px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px';
    const nome = 'REFÚGIO DA AURORA', w = ctx.measureText(nome).width + 12, ty = q.y + m + 12;
    ctx.fillStyle = 'rgba(3,7,16,0.85)'; ctx.fillRect(q.x - w / 2, ty - 8, w, 16);
    ctx.fillStyle = '#ffd08a'; ctx.fillText(nome, q.x, ty + 0.5); ctx.letterSpacing = '0px';
    ctx.restore();
  },
  // Painel da zona escolhida (canto inferior direito do mapa): o que já se sabe dela
  drawMapInfo(ctx, id, right, bottom) {
    const z = WORLD_ZONES[id], R = worldRegion(z.region), S = this.state, seen = S.descobertos.includes(id) || !!z.cidade;
    const itens = [];
    if (z.cidade) itens.push('Cidade principal · zona segura', 'Forja · Armaria · Laboratório · Engenharia · Alquimia', 'Guilda · Missões · Armazém · Alojamento · Mercado', 'Volta de qualquer lugar: botão AURORA (T)');
    else if (!seen) itens.push(this.mapTargets().includes(id) ? 'Chegada da região: viagem pelo portal' : 'Ainda não descoberta');
    else {
      if (z.hub) itens.push('Mercador e missões');
      if (z.portal) itens.push(S.portais.includes(id) ? 'Portal ativo (viagem rápida)' : 'Portal');
      if ((z.camps || []).some((c) => c.boss)) itens.push(this.bossDone(z.region) ? 'Chefe regional derrotado' : `Chefe: ${R.boss.name}`);
      const nb = (z.chests || []).length + (z.secret ? 1 : 0);
      if (nb) itens.push(`Baús ${S.baus.filter((k) => k.indexOf(id + ':') === 0).length}/${nb}`);
      if (z.terminal) itens.push(S.terminais.includes(id) ? 'Terminal lido' : 'Terminal');
      if (z.aberto) itens.push('Campo aberto · recursos para colher');
    }
    if (Campanhas.zonaAlvo() === id) { const c = Campanhas.cap(); itens.push(`★ Campanha: ${c.nome}`); }
    if (z.vila) itens.push(z.vila.nome);
    for (const A of Aventuras.alvosMapa()) if (A.zona === id) itens.push(`◆ ${A.q.nome}`);
    for (const A of Locais.marcasMapa()) if (A.zona === id) itens.push(`${A.icon} ${A.nome}${A.feito ? ' (vencida)' : ''}`);
    for (const A of Eventos.marcasMapa()) if (A.zona === id) itens.push(`⚔ Evento: ${A.nome}`);
    ctx.font = `12px ${FONT_UI}`;
    const linhas = [], W = 320;
    let cur = '';
    for (const it of itens) { const tt = cur ? `${cur} · ${it}` : it; if (ctx.measureText(tt).width > W - 28 && cur) { linhas.push(cur); cur = it; } else cur = tt; }
    if (cur) linhas.push(cur);
    const H = 50 + linhas.length * 16, x = right - W, y = bottom - H;
    ctx.fillStyle = 'rgba(3,7,16,0.86)'; ctx.fillRect(x, y, W, H);
    ctx.strokeStyle = rgba(R.rgb, 0.6); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, W - 1, H - 1);
    ctx.fillStyle = rgba(R.rgb, 0.95); ctx.fillRect(x, y, 3, H);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold 14px ${FONT_TITLE}`; ctx.fillStyle = '#ffffff'; ctx.fillText(z.name.toUpperCase(), x + 14, y + 16);
    ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = rgba(R.rgb, 0.95); ctx.fillText(z.cidade ? `${R.name} · base da Resistência` : `${R.name} · ${R.biome} · nível ${z.lv}`, x + 14, y + 33);
    ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(210,222,240,0.9)';
    linhas.forEach((ln, k) => ctx.fillText(ln, x + 14, y + 50 + k * 16));
  },
};
