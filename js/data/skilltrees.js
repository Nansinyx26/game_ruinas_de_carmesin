'use strict';
// ECLIPSE ZERO · Árvores de habilidades de todos os personagens (registro por personagem)
// ---------------------------------------------------------------------------
// ÁRVORES DO ELENCO: Lyra, Drakos, Sera e Orion têm 4 árvores temáticas cada, com
// nós no mesmo formato dos SKILLS do Kael (js/progression.js):
//   kind: 'passiva' | 'tecnica' | 'ativa' | 'suprema'   col (0–2) / row (0–4): posição no grafo
//   req: [[id, nível]] (todos exigidos, sempre da mesma árvore)   lvl: nível de personagem exigido
//   energy/cd: custo e recarga das ativas e da suprema   desc(l): efeito no nível l
//   icon: ícone de drawSkillIcon (js/skillicons.js; os do Kael vêm de drawIcon)
//   ability: habilidade da ficha (ABILITY_DEFS) que o nó representa. As 4 da ficha estão
//            nas árvores, e a suprema de cada personagem é a ultimate da ficha.
// Árvore: { id, owner (personagem dono), name, sub, tint }. A cor (rgb) sai da cor-tema da
// ficha deslocada por 'tint': h = matiz em graus, s e l = saturação e luminosidade (-1 a 1).
// O Kael continua com SKILL_TREES/SKILLS de js/progression.js (mesmos ids, custos e efeitos,
// e o mesmo Progress no salvamento): o registro só aponta para eles.
// Quem ainda não entrou no grupo ou está "EM BREVE" tem as árvores só para consulta
// (skillTreeAccess). Acesso: skillTreesOf(charId), skillNodesOf(treeId), skillsOf(charId),
// skillDef(id); progresso de cada personagem: PartyProgress.of(charId) (js/progression.js).
// ---------------------------------------------------------------------------

// 1.5 → '1,5' (números decimais nas descrições)
const skillNum = (x) => String(Math.round(x * 100) / 100).replace('.', ',');

// Cor-tema '#A64DFF' deslocada em HSL → 'r,g,b'
function skillTreeTint(hex, tint = {}) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0, s = 0, l = (mx + mn) / 2;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  h = (((h + (tint.h || 0)) % 360) + 360) % 360;
  s = Math.min(1, Math.max(0, s + (tint.s || 0)));
  l = Math.min(0.9, Math.max(0.25, l + (tint.l || 0)));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const k = Math.floor(h / 60) % 6;
  [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k];
  return [r, g, b].map((v) => Math.round((v + m) * 255)).join(',');
}

const ROSTER_SKILL_TREES = [
  // ----- LYRA KAEDE: o arco de fóton, as armadilhas de quem caça longe da rede e a fuga
  { id: 'lyra_foton', owner: 'lyra', name: 'ARCO DE FÓTON', sub: 'Árvore de Precisão', tint: {}, branch: 'ataque' },
  { id: 'lyra_caca', owner: 'lyra', name: 'CAÇADORA', sub: 'Árvore de Armadilhas', tint: { h: -24, s: -0.15 }, branch: 'defesa' },
  { id: 'lyra_instavel', owner: 'lyra', name: 'FÓTON INSTÁVEL', sub: 'Árvore Explosiva', tint: { h: 42 }, branch: 'poderes' },
  { id: 'lyra_sobrevivente', owner: 'lyra', name: 'SOBREVIVENTE', sub: 'Árvore de Mobilidade', tint: { s: -0.45, l: 0.1 }, branch: 'mobilidade' },
  { id: 'lyra_supremas', owner: 'lyra', name: 'LUZ CAÇADORA', sub: 'Ramo Supremo', tint: { h: 15, l: 0.12 }, branch: 'supremas' },
  // ----- DRAKOS: o machado e o martelo, a armadura da Legião e a vontade que voltou a ser dele
  { id: 'drakos_lanca', owner: 'drakos', name: 'MACHADO E MARTELO', sub: 'Árvore de Força', tint: {}, branch: 'ataque' },
  { id: 'drakos_bastiao', owner: 'drakos', name: 'BASTIÃO', sub: 'Árvore de Defesa', tint: { s: -0.5, l: 0.06 }, branch: 'defesa' },
  { id: 'drakos_frente', owner: 'drakos', name: 'LINHA DE FRENTE', sub: 'Árvore de Investida', tint: { h: 22 }, branch: 'mobilidade' },
  { id: 'drakos_vontade', owner: 'drakos', name: 'VONTADE PRÓPRIA', sub: 'Árvore de Fúria', tint: { h: -24, l: 0.06 }, branch: 'poderes' },
  { id: 'drakos_supremas', owner: 'drakos', name: 'TITÃ', sub: 'Ramo Supremo', tint: { h: 12, l: 0.12 }, branch: 'supremas' },
  // ----- SERA VYNE: o drone S-01, os campos de força, a invasão de sistemas e a nanomedicina
  { id: 'sera_drones', owner: 'sera', name: 'DRONE S-01', sub: 'Árvore de Drones', tint: {}, branch: 'ataque' },
  { id: 'sera_campos', owner: 'sera', name: 'CAMPO DE FORÇA', sub: 'Árvore de Proteção', tint: { h: 32 }, branch: 'defesa' },
  { id: 'sera_intrusao', owner: 'sera', name: 'INTRUSÃO', sub: 'Árvore de Controle', tint: { h: -50 }, branch: 'poderes' },
  { id: 'sera_nano', owner: 'sera', name: 'NANOMEDICINA', sub: 'Árvore de Suporte', tint: { s: -0.2, l: 0.16 }, branch: 'defesa' },
  { id: 'sera_supremas', owner: 'sera', name: 'NÚCLEO VYNE', sub: 'Ramo Supremo', tint: { h: 20, l: 0.1 }, branch: 'supremas' },
  // ----- ORION: as lâminas duplas, a furtividade do agente, os arremessos e a infiltração
  { id: 'orion_laminas', owner: 'orion', name: 'LÂMINAS DUPLAS', sub: 'Árvore de Combate', tint: {}, branch: 'ataque' },
  { id: 'orion_fantasma', owner: 'orion', name: 'FANTASMA', sub: 'Árvore de Furtividade', tint: { s: -0.55, l: 0.1 }, branch: 'defesa' },
  { id: 'orion_precisao', owner: 'orion', name: 'PRECISÃO', sub: 'Árvore de Arremesso', tint: { h: 18 }, branch: 'poderes' },
  { id: 'orion_infiltrado', owner: 'orion', name: 'INFILTRADO', sub: 'Árvore de Mobilidade', tint: { h: -17 }, branch: 'mobilidade' },
  { id: 'orion_supremas', owner: 'orion', name: 'CORVO', sub: 'Ramo Supremo', tint: { h: 14, l: 0.12 }, branch: 'supremas' },
];
for (const tr of ROSTER_SKILL_TREES) {
  const d = CHARACTERS_BY_ID[tr.owner];
  tr.rgb = skillTreeTint(d ? d.color : '#ffffff', tr.tint);
}

const ROSTER_SKILLS = {
  // ======================================================================= LYRA
  // ----- Arco de Fóton (precisão): o Tiro Preciso da ficha e a suprema Foco de Batalha
  lyra_tiro_preciso: { tree: 'lyra_foton', name: 'Tiro Preciso', kind: 'tecnica', icon: 'aim', ability: 'lyra_tiro', max: 3, lvl: 1, col: 1, row: 0, req: [],
    desc: (l) => `Pesado (segurado por ${skillNum(1 - 0.1 * l)}s): disparo carregado de ${45 + 15 * l} de dano, com +${50 + 10 * l}% de dano crítico.` },
  lyra_mira_sucata: { tree: 'lyra_foton', name: 'Mira de Sucata', kind: 'passiva', icon: 'scan', max: 3, lvl: 2, col: 0, row: 1, req: [['lyra_tiro_preciso', 1]],
    desc: (l) => `A lente de um drone abatido ajusta cada disparo: +${5 * l}% de chance de crítico e +${10 * l}% de alcance.` },
  lyra_flecha_perfurante: { tree: 'lyra_foton', name: 'Flecha Perfurante', kind: 'tecnica', icon: 'arrowPierce', max: 2, lvl: 2, col: 2, row: 1, req: [['lyra_tiro_preciso', 1]],
    desc: (l) => `Leve, Leve, Pesado: a terceira flecha atravessa até ${1 + 2 * l} inimigos em linha${l >= 2 ? ', com +30% de dano' : ''}.` },
  lyra_ponto_cego: { tree: 'lyra_foton', name: 'Ponto Cego', kind: 'passiva', icon: 'target', max: 3, lvl: 4, col: 0, row: 2, req: [['lyra_mira_sucata', 1]],
    desc: (l) => `Disparos em inimigos atordoados, lentos ou de costas causam +${15 * l}% de dano.` },
  lyra_rajada: { tree: 'lyra_foton', name: 'Rajada Tripla', kind: 'ativa', icon: 'arrows3', max: 3, lvl: 4, col: 2, row: 2, req: [['lyra_flecha_perfurante', 1]], energy: 18, cd: 4,
    desc: (l) => `Dispara ${l >= 3 ? 'cinco' : 'três'} flechas em leque (${20 + 8 * l} de dano cada).` },
  lyra_folego: { tree: 'lyra_foton', name: 'Fôlego Contido', kind: 'passiva', icon: 'bow', max: 2, lvl: 6, col: 1, row: 3, req: [['lyra_ponto_cego', 1], ['lyra_rajada', 1]],
    desc: (l) => `Enquanto carrega um disparo, Lyra recebe ${15 * l}% menos dano e a carga fica ${10 * l}% mais rápida.` },
  lyra_foco_batalha: { tree: 'lyra_foton', name: 'Foco de Batalha', kind: 'suprema', icon: 'focus', ability: 'lyra_foco', max: 3, lvl: 8, col: 1, row: 4, req: [['lyra_folego', 1]], energy: 100, cd: 0,
    desc: (l) => `Tecla I (100 de energia): o mundo desacelera para 40% por ${skillNum(3 + 0.5 * (l - 1))}s (Lyra continua no ritmo normal) e todo disparo é crítico garantido${l >= 3 ? '; cada abate devolve 10 de energia' : ''}.` },

  // ----- Caçadora (armadilhas): a Armadilha de Plasma da ficha
  lyra_armadilha_plasma: { tree: 'lyra_caca', name: 'Armadilha de Plasma', kind: 'ativa', icon: 'trap', ability: 'lyra_armadilha', max: 3, lvl: 2, col: 1, row: 0, req: [], energy: 20, cd: 8,
    desc: (l) => `Mina no chão que explode ao contato (raio ${60 + 10 * l}, ${55 + 25 * l} de dano); até ${1 + l} minas ativas ao mesmo tempo.` },
  lyra_fio_tropeco: { tree: 'lyra_caca', name: 'Fio de Tropeço', kind: 'passiva', icon: 'wire', max: 2, lvl: 3, col: 0, row: 1, req: [['lyra_armadilha_plasma', 1]],
    desc: (l) => `As armadilhas também prendem: quem pisa nelas fica ${30 + 20 * l}% mais lento por ${1 + l}s.` },
  lyra_rastreadora: { tree: 'lyra_caca', name: 'Rastreadora', kind: 'passiva', icon: 'footprint', max: 3, lvl: 3, col: 2, row: 1, req: [['lyra_armadilha_plasma', 1]],
    desc: (l) => `Inimigos pegos por uma armadilha ou por um disparo carregado ficam marcados por 5s: +${10 * l}% de dano contra eles.` },
  lyra_isca: { tree: 'lyra_caca', name: 'Isca de Sucata', kind: 'ativa', icon: 'decoy', max: 2, lvl: 5, col: 0, row: 2, req: [['lyra_fio_tropeco', 1]], energy: 22, cd: 14,
    desc: (l) => `Arremessa um drone desmontado que chia por ${3 + 2 * l}s e atrai os inimigos próximos; quando é destruído ou o tempo acaba, explode (${30 + 20 * l} de dano).` },
  lyra_reacao: { tree: 'lyra_caca', name: 'Reação em Cadeia', kind: 'passiva', icon: 'chain', max: 2, lvl: 6, col: 2, row: 2, req: [['lyra_rastreadora', 1]],
    desc: (l) => `Uma armadilha que explode detona as outras a até ${180 + 60 * l} de distância, com +${20 * l}% de dano.` },
  lyra_campo_minado: { tree: 'lyra_caca', name: 'Campo Minado', kind: 'passiva', icon: 'burst', max: 2, lvl: 7, col: 1, row: 3, req: [['lyra_isca', 1], ['lyra_reacao', 1]],
    desc: (l) => `Cada esquiva deixa uma mina pequena para trás (${30 + 20 * l} de dano, dura ${4 + 2 * l}s).` },

  // ----- Fóton Instável (explosivos): a Flecha Explosiva da ficha
  lyra_flecha_explosiva: { tree: 'lyra_instavel', name: 'Flecha Explosiva', kind: 'ativa', icon: 'arrowBurst', ability: 'lyra_flecha', max: 3, lvl: 2, col: 1, row: 0, req: [], energy: 25, cd: 6,
    desc: (l) => `Flecha que explode no impacto (raio ${95 + 15 * l}, ${50 + 20 * l} de dano).` },
  lyra_carga_volatil: { tree: 'lyra_instavel', name: 'Carga Volátil', kind: 'passiva', icon: 'flame', max: 3, lvl: 3, col: 0, row: 1, req: [['lyra_flecha_explosiva', 1]],
    desc: (l) => `As explosões de Lyra têm raio ${10 * l}% maior e arremessam os inimigos para longe.` },
  lyra_estilhacos: { tree: 'lyra_instavel', name: 'Estilhaços', kind: 'passiva', icon: 'shards', max: 2, lvl: 4, col: 2, row: 1, req: [['lyra_flecha_explosiva', 1]],
    desc: (l) => `Cada explosão espalha ${2 + 2 * l} estilhaços de fóton (${12 + 6 * l} de dano cada).` },
  lyra_flecha_pulso: { tree: 'lyra_instavel', name: 'Flecha de Pulso', kind: 'ativa', icon: 'field', max: 2, lvl: 5, col: 0, row: 2, req: [['lyra_carga_volatil', 1]], energy: 24, cd: 10,
    desc: (l) => `Flecha que estoura num pulso eletromagnético: as máquinas num raio de ${120 + 20 * l} ficam atordoadas por ${1 + l}s.` },
  lyra_chuva_fotons: { tree: 'lyra_instavel', name: 'Chuva de Fótons', kind: 'ativa', icon: 'rain', max: 3, lvl: 7, col: 1, row: 3, req: [['lyra_flecha_pulso', 1], ['lyra_estilhacos', 1]], energy: 40, cd: 16,
    desc: (l) => `Dispara para o alto: ${6 + 2 * l} flechas caem numa área de raio 160 ao longo de 2s (${24 + 10 * l} de dano cada).` },

  // ----- Sobrevivente (mobilidade): viver onde a rede não olha
  lyra_passos_leves: { tree: 'lyra_sobrevivente', name: 'Passos Leves', kind: 'passiva', icon: 'boot', max: 3, lvl: 1, col: 1, row: 0, req: [],
    desc: (l) => `Recarga da esquiva ${10 * l}% menor e +${5 * l}% de velocidade de movimento.` },
  lyra_salto_recuado: { tree: 'lyra_sobrevivente', name: 'Salto Recuado', kind: 'tecnica', icon: 'dash', max: 2, lvl: 2, col: 0, row: 1, req: [['lyra_passos_leves', 1]],
    desc: (l) => `Esquiva → Leve: salta para trás disparando uma flecha rápida (${25 + 15 * l} de dano)${l >= 2 ? ' que atordoa por 0,5s' : ''}.` },
  lyra_fora_da_rede: { tree: 'lyra_sobrevivente', name: 'Onde a Rede Não Olha', kind: 'passiva', icon: 'stealth', max: 2, lvl: 3, col: 2, row: 1, req: [['lyra_passos_leves', 1]],
    desc: (l) => `Depois de 3s sem lutar, Lyra se camufla: os inimigos demoram ${30 * l}% mais para atacá-la e o primeiro disparo causa +${25 * l}% de dano.` },
  lyra_sangue_frio: { tree: 'lyra_sobrevivente', name: 'Sangue-Frio', kind: 'passiva', icon: 'heart', max: 3, lvl: 5, col: 0, row: 2, req: [['lyra_salto_recuado', 1]],
    desc: (l) => `Abaixo de 35% de vida: +${15 * l}% de velocidade e +${10 * l}% de chance de crítico por 5s (no máximo uma vez a cada 30s).` },
  lyra_gancho: { tree: 'lyra_sobrevivente', name: 'Gancho de Cabo', kind: 'ativa', icon: 'hook', max: 2, lvl: 6, col: 2, row: 2, req: [['lyra_fora_da_rede', 1]], energy: 15, cd: 7,
    desc: (l) => `Dispara um cabo e se puxa até ${260 + 60 * l} de distância, atravessando inimigos; a próxima flecha em 2s causa +${30 * l}% de dano.` },
  lyra_atalhos: { tree: 'lyra_sobrevivente', name: 'Atalhos dos Túneis', kind: 'passiva', icon: 'wing', max: 2, lvl: 7, col: 1, row: 3, req: [['lyra_sangue_frio', 1], ['lyra_gancho', 1]],
    desc: (l) => `Lyra conhece os túneis de cor: +${l} ${l > 1 ? 'cargas' : 'carga'} de esquiva e esquivas ${20 * l}% mais longas.` },

  // ===================================================================== DRAKOS
  // ----- Machado e Martelo (força): o Golpe Pesado da ficha
  drakos_golpe_pesado: { tree: 'drakos_lanca', name: 'Golpe Pesado', kind: 'tecnica', icon: 'hammer', ability: 'drakos_golpe', max: 3, lvl: 1, col: 1, row: 0, req: [],
    desc: (l) => `Pesado: golpe lento do martelo (${40 + 15 * l} de dano) que quebra escudos e a super armadura${l >= 3 ? ' e derruba quem atinge' : ''}.` },
  drakos_peso: { tree: 'drakos_lanca', name: 'Peso da Armadura', kind: 'passiva', icon: 'weight', max: 3, lvl: 2, col: 0, row: 1, req: [['drakos_golpe_pesado', 1]],
    desc: (l) => `Golpes pesados causam +${10 * l}% de dano e empurram os inimigos ${20 * l}% mais longe.` },
  drakos_varredura: { tree: 'drakos_lanca', name: 'Varredura', kind: 'tecnica', icon: 'spin', max: 2, lvl: 3, col: 2, row: 1, req: [['drakos_golpe_pesado', 1]],
    desc: (l) => `Leve, Leve, Pesado: o machado gira num arco largo à frente (${30 + 12 * l} de dano)${l >= 2 ? ' e derruba quem estiver perto' : ''}.` },
  drakos_ruptura: { tree: 'drakos_lanca', name: 'Golpe de Ruptura', kind: 'passiva', icon: 'break', max: 2, lvl: 4, col: 0, row: 2, req: [['drakos_peso', 1]],
    desc: (l) => `+${25 * l}% de dano contra blindados, escudos e chefes.` },
  drakos_terremoto: { tree: 'drakos_lanca', name: 'Terremoto', kind: 'ativa', icon: 'shockwave', max: 3, lvl: 5, col: 2, row: 2, req: [['drakos_varredura', 1]], energy: 30, cd: 10,
    desc: (l) => `Crava o martelo no chão: uma onda de choque em cone (${50 + 20 * l} de dano) deixa os inimigos lentos por 2s.` },
  drakos_onze_anos: { tree: 'drakos_lanca', name: 'Onze Anos de Guerra', kind: 'passiva', icon: 'medal', max: 2, lvl: 7, col: 1, row: 3, req: [['drakos_ruptura', 1], ['drakos_terremoto', 1]],
    desc: (l) => `Onze anos na Legião ensinam a lutar cercado: +${4 * l}% de dano para cada inimigo a até 200 de distância (até +${20 * l}%).` },

  // ----- Bastião (defesa): o Escudo de Energia da ficha
  drakos_escudo_energia: { tree: 'drakos_bastiao', name: 'Escudo de Energia', kind: 'tecnica', icon: 'shieldFront', ability: 'drakos_escudo', max: 3, lvl: 1, col: 1, row: 0, req: [],
    desc: (l) => `Segure a esquiva: Drakos ergue um escudo à frente que absorve ${75 + 5 * l}% do dano frontal (recarga de ${skillNum(4.5 - 0.5 * l)}s ao baixar).` },
  drakos_placas: { tree: 'drakos_bastiao', name: 'Placas Soldadas', kind: 'passiva', icon: 'armor', max: 3, lvl: 2, col: 0, row: 1, req: [['drakos_escudo_energia', 1]],
    desc: (l) => `As cicatrizes de solda viraram blindagem: +${15 * l} de vida máxima e ${4 * l}% menos dano recebido.` },
  drakos_bloqueio: { tree: 'drakos_bastiao', name: 'Bloqueio Perfeito', kind: 'passiva', icon: 'shield', max: 2, lvl: 3, col: 2, row: 1, req: [['drakos_escudo_energia', 1]],
    desc: (l) => `Erguer o escudo no último instante devolve o golpe num empurrão (${30 + 15 * l} de dano) que atordoa por ${skillNum(0.5 * l)}s.` },
  drakos_muralha: { tree: 'drakos_bastiao', name: 'Muralha Viva', kind: 'ativa', icon: 'wall', max: 2, lvl: 5, col: 0, row: 2, req: [['drakos_placas', 1]], energy: 25, cd: 16,
    desc: (l) => `Por ${4 + 2 * l}s, Drakos atrai os inimigos próximos e recebe ${20 + 10 * l}% menos dano.` },
  drakos_refletor: { tree: 'drakos_bastiao', name: 'Escudo Refletor', kind: 'passiva', icon: 'reflect', max: 2, lvl: 6, col: 2, row: 2, req: [['drakos_bloqueio', 1]],
    desc: (l) => `Projéteis bloqueados pelo escudo voltam contra quem atirou, com ${50 * l}% do dano.` },
  drakos_ultimo: { tree: 'drakos_bastiao', name: 'Último de Pé', kind: 'passiva', icon: 'banner', max: 1, lvl: 8, col: 1, row: 3, req: [['drakos_muralha', 1], ['drakos_refletor', 1]],
    desc: () => 'Uma vez por setor, um golpe fatal deixa Drakos com 1 de vida e invencível por 2s.' },

  // ----- Linha de Frente (investida): a Investida da ficha e a onda do martelo
  drakos_investida: { tree: 'drakos_frente', name: 'Investida', kind: 'ativa', icon: 'charge', ability: 'drakos_investida', max: 3, lvl: 2, col: 1, row: 0, req: [], energy: 20, cd: 7,
    desc: (l) => `Carga em linha reta de ${260 + 60 * l} de distância (${25 + 15 * l} de dano) que derruba os inimigos no caminho.` },
  drakos_ombro: { tree: 'drakos_frente', name: 'Ombro Blindado', kind: 'passiva', icon: 'hex', max: 2, lvl: 3, col: 0, row: 1, req: [['drakos_investida', 1]],
    desc: (l) => `Durante a Investida, Drakos não pode ser interrompido e recebe ${25 * l}% menos dano.` },
  drakos_atropelo: { tree: 'drakos_frente', name: 'Atropelo', kind: 'passiva', icon: 'lunge', max: 3, lvl: 3, col: 2, row: 1, req: [['drakos_investida', 1]],
    desc: (l) => `Inimigos derrubados ficam no chão ${skillNum(0.4 * l)}s a mais e recebem +${10 * l}% de dano enquanto se levantam.` },
  drakos_canhao: { tree: 'drakos_frente', name: 'Onda do Martelo', kind: 'ativa', icon: 'cannon', max: 3, lvl: 5, col: 0, row: 2, req: [['drakos_ombro', 1]], energy: 28, cd: 9,
    desc: (l) => `Bate o martelo no chão e solta uma onda de choque em linha (${45 + 20 * l} de dano) que empurra tudo o que atinge.` },
  drakos_arremesso: { tree: 'drakos_frente', name: 'Arremesso do Machado', kind: 'tecnica', icon: 'spear', max: 2, lvl: 6, col: 2, row: 2, req: [['drakos_atropelo', 1]],
    desc: (l) => `Esquiva → Pesado: arremessa o machado (${50 + 20 * l} de dano), que volta à mão de Drakos${l >= 2 ? ' atravessando os inimigos de novo' : ''}.` },
  drakos_sem_freio: { tree: 'drakos_frente', name: 'Sem Freio', kind: 'passiva', icon: 'sync', max: 2, lvl: 7, col: 1, row: 3, req: [['drakos_canhao', 1], ['drakos_arremesso', 1]],
    desc: (l) => `Derrubar 3 ou mais inimigos de uma vez recarrega a Investida${l >= 2 ? ' e devolve 15 de energia' : ''}.` },

  // ----- Vontade Própria (fúria): a suprema Zona de Impacto
  drakos_modulo: { tree: 'drakos_vontade', name: 'Módulo Rompido', kind: 'passiva', icon: 'brokenChip', max: 3, lvl: 1, col: 1, row: 0, req: [],
    desc: (l) => `Sem a voz da Legião na nuca, Drakos decide sozinho: +${5 * l}% de dano e +${15 * l}% de energia por acerto.` },
  drakos_folego: { tree: 'drakos_vontade', name: 'Fôlego de Soldado', kind: 'passiva', icon: 'drain', max: 3, lvl: 3, col: 0, row: 1, req: [['drakos_modulo', 1]],
    desc: (l) => `Recupera ${2 * l} de vida a cada inimigo derrubado ou destruído.` },
  drakos_grito: { tree: 'drakos_vontade', name: 'Grito de Guerra', kind: 'ativa', icon: 'roar', max: 2, lvl: 4, col: 2, row: 1, req: [['drakos_modulo', 1]], energy: 25, cd: 18,
    desc: (l) => `Por ${5 + l}s: +${20 * l}% de dano, e os inimigos a até 220 de distância ficam ${10 * l}% mais lentos.` },
  drakos_aco: { tree: 'drakos_vontade', name: 'Aço e Vontade', kind: 'passiva', icon: 'flame', max: 2, lvl: 6, col: 1, row: 2, req: [['drakos_folego', 1], ['drakos_grito', 1]],
    desc: (l) => `Abaixo de 50% de vida: +${15 * l}% de dano e ${10 * l}% menos dano recebido.` },
  drakos_zona_impacto: { tree: 'drakos_vontade', name: 'Zona de Impacto', kind: 'suprema', icon: 'quake', ability: 'drakos_zona', max: 3, lvl: 8, col: 1, row: 3, req: [['drakos_aco', 1]], energy: 100, cd: 0,
    desc: (l) => `Tecla I (100 de energia): salta e cai com o martelo (raio ${240 + 30 * (l - 1)}, ${140 + 40 * (l - 1)} de dano), arremessando os inimigos${l >= 3 ? ' e deixando o chão em chamas por 3s' : ''}.` },

  // ======================================================================= SERA
  // ----- Drone S-01 (drones): o Drone de Suporte da ficha
  sera_drone_suporte: { tree: 'sera_drones', name: 'Drone de Suporte', kind: 'ativa', icon: 'droneAlly', ability: 'sera_drone', max: 3, lvl: 1, col: 1, row: 0, req: [], energy: 30, cd: 14,
    desc: (l) => `Invoca o Drone S-01 por ${8 + 2 * l}s: ele atira nos inimigos a até ${240 + 20 * l} de distância (${12 + 6 * l} de dano por segundo).` },
  sera_baterias: { tree: 'sera_drones', name: 'Baterias de Campo', kind: 'passiva', icon: 'battery', max: 3, lvl: 2, col: 0, row: 1, req: [['sera_drone_suporte', 1]],
    desc: (l) => `Os drones duram +${2 * l}s, e cada abate deles devolve ${3 * l} de energia a Sera.` },
  sera_mira_assistida: { tree: 'sera_drones', name: 'Mira Assistida', kind: 'passiva', icon: 'scan', max: 2, lvl: 3, col: 2, row: 1, req: [['sera_drone_suporte', 1]],
    desc: (l) => `O drone marca o alvo que atinge: Sera causa +${12 * l}% de dano contra ele.` },
  sera_enxame: { tree: 'sera_drones', name: 'Enxame', kind: 'passiva', icon: 'swarm', max: 2, lvl: 5, col: 0, row: 2, req: [['sera_baterias', 1]],
    desc: (l) => `O S-01 chega acompanhado de ${l > 1 ? `${l} drones menores` : 'um drone menor'}, com metade do dano dele.` },
  sera_ordem_ataque: { tree: 'sera_drones', name: 'Ordem de Ataque', kind: 'tecnica', icon: 'orbBolt', max: 2, lvl: 4, col: 2, row: 2, req: [['sera_mira_assistida', 1]],
    desc: (l) => `Leve, Leve, Pesado: o drone mergulha no alvo de Sera e o eletrocuta (${35 + 15 * l} de dano)${l >= 2 ? ', atordoando máquinas por 1s' : ''}.` },
  sera_sentinela: { tree: 'sera_drones', name: 'Sentinela Fixa', kind: 'ativa', icon: 'turret', max: 2, lvl: 7, col: 1, row: 3, req: [['sera_enxame', 1], ['sera_ordem_ataque', 1]], energy: 35, cd: 20,
    desc: (l) => `Instala uma torreta no chão por ${10 + 4 * l}s (${20 + 10 * l} de dano por segundo, alcance de 300).` },

  // ----- Campo de Força (proteção): o Campo de Força da ficha
  sera_campo_forca: { tree: 'sera_campos', name: 'Campo de Força', kind: 'ativa', icon: 'dome', ability: 'sera_campo', max: 3, lvl: 2, col: 1, row: 0, req: [], energy: 30, cd: 16,
    desc: (l) => `Domo de raio ${110 + 20 * l} por ${4 + l}s que bloqueia todos os projéteis.` },
  sera_barreira: { tree: 'sera_campos', name: 'Barreira Pessoal', kind: 'passiva', icon: 'shield', max: 3, lvl: 3, col: 0, row: 1, req: [['sera_campo_forca', 1]],
    desc: (l) => `Uma barreira que absorve ${15 + 10 * l} de dano se recarrega depois de 12s sem receber golpes.` },
  sera_domo_condutor: { tree: 'sera_campos', name: 'Domo Condutor', kind: 'passiva', icon: 'field', max: 2, lvl: 3, col: 2, row: 1, req: [['sera_campo_forca', 1]],
    desc: (l) => `Inimigos dentro do domo levam ${8 + 6 * l} de dano por segundo e ficam ${20 * l}% mais lentos.` },
  sera_pulso: { tree: 'sera_campos', name: 'Pulso Repulsor', kind: 'ativa', icon: 'pulse', max: 2, lvl: 5, col: 0, row: 2, req: [['sera_barreira', 1]], energy: 20, cd: 9,
    desc: (l) => `Onda de choque ao redor de Sera (raio ${150 + 20 * l}) que empurra os inimigos e anula os projéteis no ar.` },
  sera_previsao: { tree: 'sera_campos', name: 'Previsão de Tempestade', kind: 'passiva', icon: 'storm', max: 2, lvl: 6, col: 2, row: 2, req: [['sera_domo_condutor', 1]],
    desc: (l) => `O modelo que ensinou NEXUS a prever tempestades agora prevê golpes: os avisos de ataque surgem ${skillNum(0.15 * l)}s antes e esquivas a tempo devolvem ${5 * l} de energia.` },
  sera_matriz: { tree: 'sera_campos', name: 'Matriz Estável', kind: 'passiva', icon: 'hex', max: 1, lvl: 8, col: 1, row: 3, req: [['sera_pulso', 1], ['sera_previsao', 1]],
    desc: () => 'O Campo de Força passa a acompanhar Sera e devolve os projéteis que bloqueia.' },

  // ----- Intrusão (controle): o Hack de Sistema da ficha
  sera_hack_sistema: { tree: 'sera_intrusao', name: 'Hack de Sistema', kind: 'ativa', icon: 'hack', ability: 'sera_hack', max: 3, lvl: 2, col: 1, row: 0, req: [], energy: 35, cd: 12,
    desc: (l) => `Desativa as máquinas num raio de ${180 + 20 * l} por ${3 + l}s${l >= 3 ? '; as mais fracas passam a lutar ao lado de Sera' : ''}.` },
  sera_leitura: { tree: 'sera_intrusao', name: 'Leitura de Código', kind: 'passiva', icon: 'code', max: 3, lvl: 3, col: 0, row: 1, req: [['sera_hack_sistema', 1]],
    desc: (l) => `Sera lê o código das máquinas de NEXUS: +${8 * l}% de dano contra elas e barras de vida sempre visíveis.` },
  sera_sobrecarga_remota: { tree: 'sera_intrusao', name: 'Sobrecarga Remota', kind: 'tecnica', icon: 'spark', max: 2, lvl: 4, col: 2, row: 1, req: [['sera_hack_sistema', 1]],
    desc: (l) => `Leve, Leve, Leve: o orbe de controle descarrega no alvo (${25 + 12 * l} de dano)${l >= 2 ? ' e salta para outra máquina próxima' : ''}.` },
  sera_porta_fundos: { tree: 'sera_intrusao', name: 'Porta dos Fundos', kind: 'passiva', icon: 'key', max: 2, lvl: 6, col: 0, row: 2, req: [['sera_leitura', 1]],
    desc: (l) => `Máquinas hackeadas recebem +${20 * l}% de dano, e o Hack de Sistema recarrega ${15 * l}% mais rápido.` },
  sera_apagao: { tree: 'sera_intrusao', name: 'Apagão', kind: 'ativa', icon: 'power', max: 2, lvl: 7, col: 2, row: 2, req: [['sera_sobrecarga_remota', 1]], energy: 45, cd: 30,
    desc: (l) => `Corta a energia ao redor (raio ${260 + 40 * l}): os drones caem e os projéteis inimigos se apagam por ${2 + l}s.` },
  sera_arquivo_zero: { tree: 'sera_intrusao', name: 'Arquivo 0-ZERO', kind: 'passiva', icon: 'file', max: 1, lvl: 9, col: 1, row: 3, req: [['sera_porta_fundos', 1], ['sera_apagao', 1]],
    desc: () => 'O que Sera aprendeu no arquivo do projeto ZERO abre até as defesas de NEXUS: o Hack de Sistema também desacelera chefes por 2s.' },

  // ----- Nanomedicina (suporte): a suprema Cura de Emergência
  sera_nanorreparo: { tree: 'sera_nano', name: 'Nanorreparadores', kind: 'passiva', icon: 'nano', max: 3, lvl: 1, col: 1, row: 0, req: [],
    desc: (l) => `Sera regenera ${l} de vida por segundo fora de combate, e as cápsulas de reparo curam +${15 * l}%.` },
  sera_injecao: { tree: 'sera_nano', name: 'Injeção Estimulante', kind: 'ativa', icon: 'syringe', max: 2, lvl: 3, col: 0, row: 1, req: [['sera_nanorreparo', 1]], energy: 20, cd: 15,
    desc: (l) => `Por ${5 + l}s: +${15 * l}% de velocidade e recargas ${20 * l}% mais rápidas.` },
  sera_triagem: { tree: 'sera_nano', name: 'Protocolo de Triagem', kind: 'passiva', icon: 'heart', max: 2, lvl: 4, col: 2, row: 1, req: [['sera_nanorreparo', 1]],
    desc: (l) => `Abaixo de 30% de vida, Sera ganha um escudo que absorve ${30 + 20 * l} de dano (uma vez a cada 40s).` },
  sera_sem_permissao: { tree: 'sera_nano', name: 'Sem Pedir Permissão', kind: 'passiva', icon: 'bulb', max: 2, lvl: 6, col: 1, row: 2, req: [['sera_injecao', 1], ['sera_triagem', 1]],
    desc: (l) => `As habilidades de Sera custam ${10 * l}% menos energia, e a energia se regenera ${25 * l}% mais rápido.` },
  sera_cura_emergencia: { tree: 'sera_nano', name: 'Cura de Emergência', kind: 'suprema', icon: 'heal', ability: 'sera_cura', max: 3, lvl: 8, col: 1, row: 3, req: [['sera_sem_permissao', 1]], energy: 100, cd: 0,
    desc: (l) => `Tecla I (100 de energia): um pulso de nanomáquinas restaura ${50 + 10 * (l - 1)}% da vida do grupo num raio de ${200 + 30 * (l - 1)}${l >= 3 ? ' e remove os efeitos negativos' : ''}.` },

  // ====================================================================== ORION
  // ----- Lâminas Duplas (combate): o Ataque Duplo da ficha
  orion_ataque_duplo: { tree: 'orion_laminas', name: 'Ataque Duplo', kind: 'tecnica', icon: 'twin', ability: 'orion_duplo', max: 3, lvl: 1, col: 1, row: 0, req: [],
    desc: (l) => `Leve: as duas lâminas cortam em sequência (2 golpes de ${12 + 6 * l} de dano)${l >= 3 ? '; o terceiro Leve seguido vira um giro com as duas' : ''}.` },
  orion_corte_junta: { tree: 'orion_laminas', name: 'Corte na Junta', kind: 'passiva', icon: 'counter', max: 3, lvl: 2, col: 0, row: 1, req: [['orion_ataque_duplo', 1]],
    desc: (l) => `Um corte só, no ponto certo: acertos pelas costas ou pelo flanco causam +${15 * l}% de dano e ignoram ${10 * l}% da blindagem.` },
  orion_danca_aco: { tree: 'orion_laminas', name: 'Dança de Aço', kind: 'tecnica', icon: 'spin', max: 2, lvl: 3, col: 2, row: 1, req: [['orion_ataque_duplo', 1]],
    desc: (l) => `Leve, Leve, Pesado: sequência giratória de ${4 + 2 * l} cortes ao redor (${10 + 4 * l} de dano cada).` },
  orion_ritmo: { tree: 'orion_laminas', name: 'Ritmo Letal', kind: 'passiva', icon: 'tempo', max: 3, lvl: 4, col: 0, row: 2, req: [['orion_corte_junta', 1]],
    desc: (l) => `Cada acerto seguido deixa os golpes ${2 * l}% mais rápidos (até ${10 * l}%); o ritmo se perde depois de 2s sem acertar.` },
  orion_corte_profundo: { tree: 'orion_laminas', name: 'Corte Profundo', kind: 'passiva', icon: 'drain', max: 2, lvl: 5, col: 2, row: 2, req: [['orion_danca_aco', 1]],
    desc: (l) => `Os cortes abrem fendas que causam ${4 + 3 * l} de dano por segundo por 3s (acumulam até 3 vezes).` },
  orion_execucao: { tree: 'orion_laminas', name: 'Execução', kind: 'passiva', icon: 'skull', max: 2, lvl: 7, col: 1, row: 3, req: [['orion_ritmo', 1], ['orion_corte_profundo', 1]],
    desc: (l) => `Golpes em inimigos com menos de ${10 + 5 * l}% de vida os eliminam na hora (contra chefes, +${25 * l}% de dano).` },

  // ----- Fantasma (furtividade): a Furtividade da ficha
  orion_furtividade: { tree: 'orion_fantasma', name: 'Furtividade', kind: 'ativa', icon: 'stealth', ability: 'orion_furtividade', max: 3, lvl: 2, col: 1, row: 0, req: [], energy: 20, cd: 10,
    desc: (l) => `Fica invisível por até ${4 + 2 * l}s ou até atacar; o golpe que sai da furtividade causa +${60 + 20 * l}% de dano.` },
  orion_sem_registro: { tree: 'orion_fantasma', name: 'Sem Registro', kind: 'passiva', icon: 'mask', max: 2, lvl: 3, col: 0, row: 1, req: [['orion_furtividade', 1]],
    desc: (l) => `Entrar e sair sem deixar rastro: um abate saindo da furtividade devolve ${10 * l} de energia e reduz a recarga dela em ${20 * l}%.` },
  orion_passo_silencioso: { tree: 'orion_fantasma', name: 'Passo Silencioso', kind: 'passiva', icon: 'footprint', max: 3, lvl: 3, col: 2, row: 1, req: [['orion_furtividade', 1]],
    desc: (l) => `Invisível, Orion fica ${10 * l}% mais rápido e atravessa os inimigos sem ser notado.` },
  orion_fumaca: { tree: 'orion_fantasma', name: 'Bomba de Fumaça', kind: 'ativa', icon: 'smoke', max: 2, lvl: 5, col: 0, row: 2, req: [['orion_sem_registro', 1]], energy: 22, cd: 14,
    desc: (l) => `Nuvem de fumaça (raio ${130 + 20 * l}) por ${3 + l}s: os inimigos dentro dela perdem o alvo e erram os disparos.` },
  orion_passo_sombra: { tree: 'orion_fantasma', name: 'Passo na Sombra', kind: 'tecnica', icon: 'teleport', max: 2, lvl: 6, col: 2, row: 2, req: [['orion_passo_silencioso', 1]],
    desc: (l) => `Esquiva → Leve: reaparece atrás do inimigo mais próximo e corta (${35 + 15 * l} de dano, sempre crítico)${l >= 2 ? '; a esquiva recarrega na hora' : ''}.` },
  orion_tres_dias: { tree: 'orion_fantasma', name: 'Há Três Dias', kind: 'passiva', icon: 'hourglass', max: 1, lvl: 8, col: 1, row: 3, req: [['orion_fumaca', 1], ['orion_passo_sombra', 1]],
    desc: () => 'Orion já estava lá: começa cada setor invisível por 8s, e a Furtividade passa a ter 2 cargas.' },

  // ----- Precisão (arremesso): a Lâmina de Energia da ficha
  orion_lamina_energia: { tree: 'orion_precisao', name: 'Lâmina de Energia', kind: 'ativa', icon: 'bladeThrow', ability: 'orion_lamina', max: 3, lvl: 2, col: 1, row: 0, req: [], energy: 15, cd: 4,
    desc: (l) => `Arremessa uma lâmina de energia (${30 + 15 * l} de dano) que atravessa até ${1 + l} inimigos.` },
  orion_fio_recarregado: { tree: 'orion_precisao', name: 'Fio Recarregado', kind: 'passiva', icon: 'sync', max: 3, lvl: 3, col: 0, row: 1, req: [['orion_lamina_energia', 1]],
    desc: (l) => `Cada acerto corpo a corpo reduz a recarga da Lâmina de Energia em ${skillNum(0.2 * l)}s.` },
  orion_ricochete: { tree: 'orion_precisao', name: 'Ricochete', kind: 'passiva', icon: 'ricochet', max: 2, lvl: 4, col: 2, row: 1, req: [['orion_lamina_energia', 1]],
    desc: (l) => `A lâmina ricocheteia nas paredes e salta para ${l > 1 ? `mais ${l} alvos próximos` : 'mais um alvo próximo'}.` },
  orion_leque: { tree: 'orion_precisao', name: 'Leque de Lâminas', kind: 'ativa', icon: 'blades', max: 3, lvl: 6, col: 1, row: 2, req: [['orion_fio_recarregado', 1], ['orion_ricochete', 1]], energy: 28, cd: 9,
    desc: (l) => `Arremessa ${3 + 2 * l} lâminas em leque (${20 + 8 * l} de dano cada).` },
  orion_olho_vigia: { tree: 'orion_precisao', name: 'Olho do Vigia', kind: 'passiva', icon: 'eye', max: 2, lvl: 7, col: 1, row: 3, req: [['orion_leque', 1]],
    desc: (l) => `Anos vigiando a porta de um laboratório: +${10 * l}% de chance de crítico contra alvos a mais de 250 de distância e lâminas ${15 * l}% mais rápidas.` },

  // ----- Infiltrado (mobilidade): a suprema Fúria Sombria
  orion_reflexos: { tree: 'orion_infiltrado', name: 'Reflexos de Agente', kind: 'passiva', icon: 'shadow', max: 3, lvl: 1, col: 1, row: 0, req: [],
    desc: (l) => `Recarga da esquiva ${10 * l}% menor e esquivas ${8 * l}% mais longas.` },
  orion_rolamento: { tree: 'orion_infiltrado', name: 'Rolamento de Corte', kind: 'tecnica', icon: 'void', max: 2, lvl: 2, col: 0, row: 1, req: [['orion_reflexos', 1]],
    desc: (l) => `Esquiva → Pesado: rola por entre os inimigos cortando tudo no caminho (${30 + 15 * l} de dano).` },
  orion_marca: { tree: 'orion_infiltrado', name: 'Marca do Alvo', kind: 'passiva', icon: 'target', max: 2, lvl: 4, col: 2, row: 1, req: [['orion_reflexos', 1]],
    desc: (l) => `Os golpes marcam o alvo por 6s: o próximo crítico nele causa +${30 * l}% de dano.` },
  orion_culto: { tree: 'orion_infiltrado', name: 'Dois Anos no Culto', kind: 'passiva', icon: 'eclipse', max: 2, lvl: 6, col: 1, row: 2, req: [['orion_rolamento', 1], ['orion_marca', 1]],
    desc: (l) => `Orion conhece os ritos do Culto do Eclipse: +${15 * l}% de dano contra sacerdotes, e os orbes de dados ficam ${20 * l}% mais lentos perto dele.` },
  orion_furia_sombria: { tree: 'orion_infiltrado', name: 'Fúria Sombria', kind: 'suprema', icon: 'shadowStrike', ability: 'orion_furia', max: 3, lvl: 8, col: 1, row: 3, req: [['orion_culto', 1]], energy: 100, cd: 0,
    desc: (l) => `Tecla I (100 de energia): ${5 + l} teleportes seguidos, cada um atacando um inimigo diferente (${40 + 20 * l} de dano)${l >= 3 ? '; os abates devolvem 15 de energia' : ''}.` },
  // ----- Linha 5 de cada árvore (nós novos; efeitos em js/heroes/passivas.js)
  lyra_vento_cruzado: { tree: 'lyra_foton', name: 'Vento Cruzado', kind: 'passiva', icon: 'aim', max: 3, lvl: 10, col: 0, row: 4, req: [['lyra_folego', 1]],
    desc: (l) => `Disparos contra alvos a mais de 260 de distância causam +${10 * l}% de dano.` },
  lyra_mira_firme: { tree: 'lyra_foton', name: 'Mira Firme', kind: 'passiva', icon: 'scan', max: 3, lvl: 12, col: 2, row: 4, req: [['lyra_folego', 1]],
    desc: (l) => `+${4 * l}% de chance de crítico e carga ${8 * l}% mais rápida.` },
  lyra_sucata_viva: { tree: 'lyra_caca', name: 'Sucata Viva', kind: 'passiva', icon: 'chain', max: 3, lvl: 10, col: 0, row: 4, req: [['lyra_campo_minado', 1]],
    desc: (l) => `Cada máquina destruída devolve ${3 * l} de energia.` },
  lyra_cacadora_paciente: { tree: 'lyra_caca', name: 'Caçadora Paciente', kind: 'passiva', icon: 'eye', max: 3, lvl: 12, col: 2, row: 4, req: [['lyra_campo_minado', 1]],
    desc: (l) => `+${10 * l}% de dano contra inimigos atordoados ou lentos.` },
  lyra_po_de_estrela: { tree: 'lyra_instavel', name: 'Pó de Estrela', kind: 'passiva', icon: 'spark', max: 3, lvl: 10, col: 0, row: 4, req: [['lyra_chuva_fotons', 1]],
    desc: (l) => `+${6 * l}% de poder: as habilidades de fóton causam mais dano.` },
  lyra_reator_instavel: { tree: 'lyra_instavel', name: 'Reator Instável', kind: 'passiva', icon: 'flame', max: 3, lvl: 12, col: 2, row: 4, req: [['lyra_chuva_fotons', 1]],
    desc: (l) => `Recargas das habilidades ${5 * l}% mais rápidas.` },
  lyra_pele_curtida: { tree: 'lyra_sobrevivente', name: 'Pele Curtida', kind: 'passiva', icon: 'heart', max: 3, lvl: 10, col: 0, row: 4, req: [['lyra_atalhos', 1]],
    desc: (l) => `+${12 * l} de vida máxima e curas ${10 * l}% mais fortes.` },
  lyra_segundo_folego: { tree: 'lyra_sobrevivente', name: 'Segundo Fôlego', kind: 'passiva', icon: 'wing', max: 3, lvl: 12, col: 2, row: 4, req: [['lyra_atalhos', 1]],
    desc: (l) => `Uma vez por setor, um golpe fatal deixa Lyra com ${15 * l}% da vida.` },
  // Combos novos (js/combat.js: COMBO_SKILLS)
  drakos_queda_tita: { tree: 'drakos_lanca', name: 'Queda do Titã', kind: 'tecnica', icon: 'quake', max: 1, lvl: 9, col: 1, row: 4, req: [['drakos_onze_anos', 1]],
    desc: () => 'L → L → L → H: salto com a arma erguida e a queda sobre o chão (70 de dano em área, rompe escudos).' },
  drakos_retaliacao: { tree: 'drakos_bastiao', name: 'Retaliação', kind: 'tecnica', icon: 'reflect', max: 2, lvl: 9, col: 1, row: 4, req: [['drakos_ultimo', 1]],
    desc: (l) => `Depois de bloquear com o Escudo de Energia, L em até 1 s: golpe de retaliação crítico${l > 1 ? ' com +25% de dano' : ''}.` },
  orion_salto_corvo: { tree: 'orion_laminas', name: 'Salto do Corvo', kind: 'tecnica', icon: 'shadowStrike', max: 1, lvl: 9, col: 1, row: 4, req: [['orion_execucao', 1]],
    desc: () => 'L → L → L → H: salto mortal por cima do alvo e as duas lâminas na queda (dois acertos em área).' },
  drakos_machado_largo: { tree: 'drakos_lanca', name: 'Machado Largo', kind: 'passiva', icon: 'blades', max: 3, lvl: 10, col: 0, row: 4, req: [['drakos_onze_anos', 1]],
    desc: (l) => `+${5 * l}% de dano para cada outro inimigo a até 140 (até +${15 * l}%): o machado pega mais de um.` },
  drakos_martelo_sismico: { tree: 'drakos_lanca', name: 'Martelo Sísmico', kind: 'passiva', icon: 'burst', max: 3, lvl: 12, col: 2, row: 4, req: [['drakos_onze_anos', 1]],
    desc: (l) => `Golpes pesados do martelo causam +${8 * l}% de dano e carregam ${10 * l}% mais rápido.` },
  drakos_baluarte: { tree: 'drakos_bastiao', name: 'Baluarte', kind: 'passiva', icon: 'shield', max: 3, lvl: 10, col: 0, row: 4, req: [['drakos_ultimo', 1]],
    desc: (l) => `Recebe ${3 * l}% menos dano para cada inimigo a até 220 (até ${15 * l}%).` },
  drakos_forja_interior: { tree: 'drakos_bastiao', name: 'Forja Interior', kind: 'passiva', icon: 'flame', max: 3, lvl: 12, col: 2, row: 4, req: [['drakos_ultimo', 1]],
    desc: (l) => `+${20 * l} de vida máxima e energia ${10 * l}% mais rápida.` },
  drakos_ariete: { tree: 'drakos_frente', name: 'Aríete', kind: 'passiva', icon: 'lunge', max: 3, lvl: 10, col: 0, row: 4, req: [['drakos_sem_freio', 1]],
    desc: (l) => `Esquiva ${8 * l}% mais longa e guarda inimiga rompida ${10 * l}% melhor.` },
  drakos_marcha_ferro: { tree: 'drakos_frente', name: 'Marcha de Ferro', kind: 'passiva', icon: 'fang', max: 3, lvl: 12, col: 2, row: 4, req: [['drakos_sem_freio', 1]],
    desc: (l) => `Derrubar um legionário ou uma elite devolve ${6 * l} de energia.` },
  drakos_cicatrizes: { tree: 'drakos_vontade', name: 'Cicatrizes', kind: 'passiva', icon: 'heart', max: 3, lvl: 10, col: 0, row: 4, req: [['drakos_zona_impacto', 1]],
    desc: (l) => `Recupera ${2 * l}% do dano causado como vida.` },
  drakos_juramento: { tree: 'drakos_vontade', name: 'Juramento', kind: 'passiva', icon: 'soul', max: 3, lvl: 12, col: 2, row: 4, req: [['drakos_zona_impacto', 1]],
    desc: (l) => `+${12 * l}% de dano contra elites e chefes.` },
  sera_rede_neural: { tree: 'sera_drones', name: 'Rede Neural', kind: 'passiva', icon: 'sync', max: 3, lvl: 10, col: 0, row: 4, req: [['sera_sentinela', 1]],
    desc: (l) => `+${7 * l}% de poder: drones, torretas e orbes causam mais dano.` },
  sera_drone_blindado: { tree: 'sera_drones', name: 'Drone Blindado', kind: 'passiva', icon: 'shield', max: 3, lvl: 12, col: 2, row: 4, req: [['sera_sentinela', 1]],
    desc: (l) => `Com o Drone de Suporte ativo, Sera recebe ${8 * l}% menos dano.` },
  sera_campo_residual: { tree: 'sera_campos', name: 'Campo Residual', kind: 'passiva', icon: 'field', max: 3, lvl: 10, col: 0, row: 4, req: [['sera_matriz', 1]],
    desc: (l) => `+${3 * l}% de resistência e recargas ${4 * l}% mais rápidas.` },
  sera_ressonancia: { tree: 'sera_campos', name: 'Ressonância', kind: 'passiva', icon: 'spark', max: 3, lvl: 12, col: 2, row: 4, req: [['sera_matriz', 1]],
    desc: (l) => `+${12 * l}% de dano contra inimigos atordoados.` },
  sera_firewall: { tree: 'sera_intrusao', name: 'Firewall', kind: 'passiva', icon: 'hex', max: 3, lvl: 10, col: 0, row: 4, req: [['sera_arquivo_zero', 1]],
    desc: (l) => `Recebe ${5 * l}% menos dano de tudo.` },
  sera_eco_digital: { tree: 'sera_intrusao', name: 'Eco Digital', kind: 'passiva', icon: 'scan', max: 3, lvl: 12, col: 2, row: 4, req: [['sera_arquivo_zero', 1]],
    desc: (l) => `Cada máquina destruída restaura ${3 * l} de vida.` },
  sera_celulas_tronco: { tree: 'sera_nano', name: 'Células-Tronco', kind: 'passiva', icon: 'heart', max: 3, lvl: 10, col: 0, row: 4, req: [['sera_cura_emergencia', 1]],
    desc: (l) => `+${12 * l} de vida máxima e curas ${10 * l}% mais fortes.` },
  sera_otimizacao: { tree: 'sera_nano', name: 'Otimização', kind: 'passiva', icon: 'orb', max: 3, lvl: 12, col: 2, row: 4, req: [['sera_cura_emergencia', 1]],
    desc: (l) => `+${10 * l} de energia máxima e energia ${10 * l}% mais rápida.` },
  orion_laminas_gemeas: { tree: 'orion_laminas', name: 'Lâminas Gêmeas', kind: 'passiva', icon: 'twin', max: 3, lvl: 10, col: 0, row: 4, req: [['orion_execucao', 1]],
    desc: (l) => `Golpes leves das adagas causam +${6 * l}% de dano.` },
  orion_veneno: { tree: 'orion_laminas', name: 'Lâmina Envenenada', kind: 'passiva', icon: 'fang', max: 3, lvl: 12, col: 2, row: 4, req: [['orion_execucao', 1]],
    desc: (l) => `+${8 * l}% de dano contra inimigos sangrando (Corte Profundo).` },
  orion_sombra_viva: { tree: 'orion_fantasma', name: 'Sombra Viva', kind: 'passiva', icon: 'shadow', max: 3, lvl: 10, col: 0, row: 4, req: [['orion_tres_dias', 1]],
    desc: (l) => `Esquiva ${skillNum(0.04 * l)}s mais invencível e +${3 * l}% de velocidade.` },
  orion_contrato: { tree: 'orion_fantasma', name: 'Contrato Cumprido', kind: 'passiva', icon: 'soul', max: 3, lvl: 12, col: 2, row: 4, req: [['orion_tres_dias', 1]],
    desc: (l) => `Derrubar uma elite ou um chefe restaura ${10 * l} de vida.` },
  orion_ponta_fina: { tree: 'orion_precisao', name: 'Ponta Fina', kind: 'passiva', icon: 'aim', max: 3, lvl: 10, col: 0, row: 4, req: [['orion_olho_vigia', 1]],
    desc: (l) => `+${5 * l}% de chance de crítico.` },
  orion_assinatura: { tree: 'orion_precisao', name: 'Assinatura', kind: 'passiva', icon: 'drain', max: 3, lvl: 12, col: 2, row: 4, req: [['orion_olho_vigia', 1]],
    desc: (l) => `Cada crítico restaura ${l} de vida.` },
  orion_agente_duplo: { tree: 'orion_infiltrado', name: 'Agente Duplo', kind: 'passiva', icon: 'counter', max: 3, lvl: 10, col: 0, row: 4, req: [['orion_furia_sombria', 1]],
    desc: (l) => `Cercado por 3 ou mais inimigos (a até 160), recebe ${10 * l}% menos dano.` },
  orion_ultima_porta: { tree: 'orion_infiltrado', name: 'A Última Porta', kind: 'passiva', icon: 'void', max: 3, lvl: 12, col: 2, row: 4, req: [['orion_furia_sombria', 1]],
    desc: (l) => `+${12 * l}% de dano contra inimigos com mais de 80% da vida (o primeiro golpe).` },
};
// ---------------------------------------------------------------------------
// RAMOS DA PROGRESSÃO: cada árvore pertence a um ramo; a tela mostra as árvores nessa ordem.
// O 5º ramo (Supremas) é igual em estrutura para todos: custa mais pontos (pts) e pede nível
// alto; os efeitos ficam em js/heroes/passivas.js (HERO_PASSIVES, ids <prefixo>_sup_*).
// ---------------------------------------------------------------------------
const SKILL_BRANCHES = { ataque: 'ATAQUE', poderes: 'PODERES', defesa: 'DEFESA E SOBREVIVÊNCIA', mobilidade: 'MOBILIDADE', supremas: 'SUPREMAS' };
const SKILL_BRANCH_ORDER = ['ataque', 'poderes', 'defesa', 'mobilidade', 'supremas'];
function supremeNodes(tree, pre) {
  const id = (k) => `${pre}_sup_${k}`;
  return {
    [id('nucleo')]: { tree, name: 'Núcleo Supremo', kind: 'passiva', icon: 'overload', max: 3, lvl: 10, pts: 2, col: 1, row: 0, req: [],
      desc: (l) => `A suprema custa ${6 * l}% menos energia.` },
    [id('amplificador')]: { tree, name: 'Amplificador', kind: 'passiva', icon: 'burst', max: 3, lvl: 12, pts: 2, col: 0, row: 1, req: [[id('nucleo'), 1]],
      desc: (l) => `+${8 * l}% de poder: habilidades e a suprema causam mais dano.` },
    [id('recarga')]: { tree, name: 'Recarga de Combate', kind: 'passiva', icon: 'bolt', max: 3, lvl: 12, pts: 2, col: 2, row: 1, req: [[id('nucleo'), 1]],
      desc: (l) => `Golpes pesados e finalizações que acertam devolvem ${2 * l} de energia.` },
    [id('convergencia')]: { tree, name: 'Convergência', kind: 'passiva', icon: 'chain', max: 2, lvl: 15, pts: 2, col: 1, row: 2, req: [[id('amplificador'), 1], [id('recarga'), 1]],
      desc: (l) => `Combinação: depois de usar uma habilidade, o próximo golpe em até 2,5 s causa +${25 * l}% de dano.` },
    [id('folego')]: { tree, name: 'Último Fôlego', kind: 'passiva', icon: 'heart', max: 1, lvl: 18, pts: 3, col: 0, row: 3, req: [[id('convergencia'), 1]],
      desc: () => 'Uma vez por setor, um golpe fatal deixa o herói com 30% da vida e metade da energia.' },
    [id('ressonancia')]: { tree, name: 'Ressonância Suprema', kind: 'passiva', icon: 'soul', max: 2, lvl: 18, pts: 2, col: 2, row: 3, req: [[id('convergencia'), 1]],
      desc: (l) => `Cada inimigo derrubado durante a suprema devolve ${8 * l} de energia.` },
    [id('ascensao')]: { tree, name: 'Ascensão', kind: 'passiva', icon: 'eclipse', max: 1, lvl: 25, pts: 4, col: 1, row: 4, req: [[id('folego'), 1], [id('ressonancia'), 1]],
      desc: () => '+10% de dano, 10% menos dano recebido e a suprema custa mais 10% menos.' },
  };
}
for (const c of ['lyra', 'drakos', 'sera', 'orion']) Object.assign(ROSTER_SKILLS, supremeNodes(`${c}_supremas`, c));
Object.assign(SKILLS, supremeNodes('kael_supremas', 'kael'));
for (const id in SKILLS) SKILLS[id].id = SKILLS[id].id || id;
const ROSTER_TREE_OWNER = {};
for (const tr of ROSTER_SKILL_TREES) ROSTER_TREE_OWNER[tr.id] = tr.owner;
for (const id in ROSTER_SKILLS) { const s = ROSTER_SKILLS[id]; s.id = id; s.owner = ROSTER_TREE_OWNER[s.tree]; }
// As árvores do Kael (js/progression.js) também dizem a quem pertencem
for (const tr of SKILL_TREES) if (!tr.owner) tr.owner = 'kael';

// ---------------------------------------------------------------------------
// REGISTRO POR PERSONAGEM: árvores, nós e de onde vem o progresso de cada um.
//   progress: 'legacy' = o Progress do jogo (game.progress, o do Kael e do salvamento
//   de sempre) · 'party' = CharacterProgress próprio (PartyProgress, js/progression.js)
//   combo: complemento da dica das técnicas ("…entram nos combos <combo>…")
// ---------------------------------------------------------------------------
const byBranch = (trees) => trees.slice().sort((a, b) => SKILL_BRANCH_ORDER.indexOf(a.branch) - SKILL_BRANCH_ORDER.indexOf(b.branch));
const SKILL_SETS = {
  kael: { trees: byBranch(SKILL_TREES), skills: SKILLS, progress: 'legacy', combo: 'da espada' },
};
const SKILL_COMBO_WEAPON = { lyra: 'do arco', drakos: 'do machado', sera: 'do orbe', orion: 'das lâminas' };
for (const c of CHARACTER_DEFS) {
  if (SKILL_SETS[c.id]) continue;
  const trees = byBranch(ROSTER_SKILL_TREES.filter((tr) => tr.owner === c.id));
  if (!trees.length) continue;
  const skills = {};
  for (const id in ROSTER_SKILLS) if (ROSTER_SKILLS[id].owner === c.id) skills[id] = ROSTER_SKILLS[id];
  SKILL_SETS[c.id] = { trees, skills, progress: 'party', combo: SKILL_COMBO_WEAPON[c.id] || '' };
}
const SKILL_NODE_CACHE = {};

// Árvores de um personagem (o Kael recebe exatamente SKILL_TREES)
function skillTreesOf(charId) { const set = SKILL_SETS[charId]; return set ? set.trees : []; }
// Todas as habilidades de um personagem: { id: definição } (o Kael recebe exatamente SKILLS)
function skillsOf(charId) { const set = SKILL_SETS[charId]; return set ? set.skills : {}; }
// Nós de uma árvore, na ordem dos dados
function skillNodesOf(treeId) {
  if (SKILL_NODE_CACHE[treeId]) return SKILL_NODE_CACHE[treeId];
  const owner = ROSTER_TREE_OWNER[treeId] || 'kael';
  return (SKILL_NODE_CACHE[treeId] = Object.values(skillsOf(owner)).filter((s) => s.tree === treeId));
}
// Definição de qualquer habilidade de árvore, de qualquer personagem
function skillDef(id) { return SKILLS[id] || ROSTER_SKILLS[id] || null; }
// Pontos de habilidade por nível de um nó (pts; sem o campo, 1). O custo em energia das ativas é
// outro campo ('energy', ou 'cost' em ABILITY_DEFS): Player.abilityCost
function skillPts(s) { return (s && s.pts) || 1; }
function skillIsActive(id) { const s = skillDef(id); return !!s && s.kind === 'ativa'; }
// Personagens com árvores, na ordem do elenco
function skillCharacters() { return CHARACTER_DEFS.filter((c) => SKILL_SETS[c.id]).map((c) => c.id); }
function charFirstName(id) { const d = CHARACTERS_BY_ID[id]; return d ? d.name.split(' ')[0] : ''; }
// Habilidade da ficha (ABILITY_DEFS) que um nó representa: 'ability' nos nós do elenco,
// 'binding.skill' nas fichas do Kael
function skillSheetAbility(id) {
  const s = skillDef(id);
  if (s && s.ability) return ABILITY_DEFS[s.ability] || null;
  for (const aid in ABILITY_DEFS) { const a = ABILITY_DEFS[aid]; if (a.binding && a.binding.skill === id) return a; }
  return null;
}

// Pode aprender agora? Qualquer personagem do grupo (os bloqueados e os em breve só para consulta):
//   state: 'active' | 'locked' (ainda não entrou no grupo) | 'soon' (EM BREVE) | 'inactive' (fora de campo, editável)
//   badge: selo curto · title/detail: aviso da tela · deny: mensagem ao tentar aprender
function skillTreeAccess(charId) {
  const d = CHARACTERS_BY_ID[charId], name = charFirstName(charId);
  if (!d) return { editable: false, state: 'locked', badge: t('locked'), title: '', detail: '', deny: '' };
  if (!RosterManager.isUnlocked(charId)) {
    const title = t('skillsLocked', { name });
    return { editable: false, state: 'locked', badge: t('locked'), title, detail: RosterManager.describe(d.unlock), deny: title };
  }
  if (d.devStatus === 'coming_soon') {
    return { editable: false, state: 'soon', badge: t('comingSoon'), title: t('inDevelopment'), detail: t('skillsSoonDetail', { name }), deny: t('skillsSoonDeny', { name }) };
  }
  // Fora de campo também evolui: cada um gasta os próprios pontos (valem quando ele entrar em campo)
  if (RosterManager.active !== charId) return { editable: true, state: 'inactive', badge: t('available'), title: '', detail: '', deny: '' };
  return { editable: true, state: 'active', badge: t('active'), title: '', detail: '', deny: '' };
}

// Confere os dados das árvores (avisa no console, como RosterManager.validate)
function validateSkillTrees() {
  const bad = [], KINDS = ['passiva', 'tecnica', 'ativa', 'suprema'];
  for (const id in ROSTER_SKILLS) {
    const s = ROSTER_SKILLS[id];
    if (SKILLS[id]) bad.push(`${id}: colide com uma habilidade do Kael`);
    if (!s.owner) bad.push(`${id}: árvore ${s.tree} não existe`);
    if (!KINDS.includes(s.kind)) bad.push(`${id}: tipo ${s.kind}`);
    if (!(s.col >= 0 && s.col <= 2 && s.row >= 0 && s.row <= 4)) bad.push(`${id}: posição ${s.col},${s.row} fora do grafo`);
    if ((s.kind === 'ativa' || s.kind === 'suprema') && !(Number.isFinite(s.energy) && Number.isFinite(s.cd))) bad.push(`${id}: sem custo/recarga`);
    for (const [rid] of s.req) { const r = ROSTER_SKILLS[rid]; if (!r || r.tree !== s.tree) bad.push(`${id}: requisito ${rid} fora da árvore`); }
    for (let l = 1; l <= s.max; l++) { const d = s.desc(l); if (typeof d !== 'string' || /undefined|NaN/.test(d)) bad.push(`${id}: descrição do nível ${l}`); }
    if (s.ability && (!ABILITY_DEFS[s.ability] || ABILITY_DEFS[s.ability].owner !== s.owner)) bad.push(`${id}: habilidade da ficha ${s.ability}`);
  }
  for (const tr of ROSTER_SKILL_TREES) {
    const nodes = Object.values(ROSTER_SKILLS).filter((s) => s.tree === tr.id), cells = new Set();
    if (nodes.length < 5 || nodes.length > 9) bad.push(`${tr.id}: ${nodes.length} nós (esperado 5 a 9)`);
    if (!SKILL_BRANCHES[tr.branch]) bad.push(`${tr.id}: ramo ${tr.branch}`);
    for (const s of nodes) { const k = `${s.col},${s.row}`; if (cells.has(k)) bad.push(`${tr.id}: nós sobrepostos em ${k}`); cells.add(k); }
    if (SKILL_TREES.some((q) => q.id === tr.id)) bad.push(`${tr.id}: colide com uma árvore do Kael`);
  }
  for (const c of CHARACTER_DEFS) {
    if (c.id === 'kael' || !SKILL_SETS[c.id]) continue;
    const nodes = Object.values(SKILL_SETS[c.id].skills), trees = SKILL_SETS[c.id].trees.length;
    if (trees < 3 || trees > 5) bad.push(`${c.id}: ${trees} árvores (esperado 3 a 5)`);
    if (!SKILL_SETS[c.id].trees.some((tr) => tr.branch === 'supremas')) bad.push(`${c.id}: sem o ramo Supremas`);
    for (const aid of c.abilities) {
      const n = nodes.find((s) => s.ability === aid);
      if (!n) bad.push(`${c.id}: a habilidade ${aid} da ficha não está nas árvores`);
      else if (ABILITY_DEFS[aid].ultimate && n.kind !== 'suprema') bad.push(`${c.id}: a ultimate ${aid} não é a suprema`);
    }
    if (nodes.filter((s) => s.kind === 'suprema').length !== 1) bad.push(`${c.id}: precisa de exatamente uma suprema`);
  }
  if (bad.length) console.warn('Árvores de habilidades inconsistentes:\n' + bad.join('\n'));
  return bad;
}
validateSkillTrees();
