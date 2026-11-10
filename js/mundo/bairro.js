'use strict';
// ECLIPSE ZERO · Mundo aberto: Bairro da Muralha e os interiores dos prédios (Bairro)
// ---------------------------------------------------------------------------
// O distrito medieval do Refúgio da Aurora (Fase 2 da expansão, docs/EXPANSAO_MUNDO_ABERTO.md).
// Uma zona própria da cidade ('aurora_bairro', com a passagem na borda leste da praça) onde os
// prédios são os modelos do kit de arquitetura feito no Blender (tools/blender/arquitetura.py →
// assets/models/arquitetura/*.glb → js/assets/arquitetura3d.js, carregado sob demanda):
//   parede de cima (norte): Quartel da Guarda, Taverna do Javali Dourado e Conselho da Aurora;
//   parede da esquerda (oeste): Hospedaria da Chama e três casas.
// Na vista isométrica cada prédio é fotografado pelo motor 3D uma vez (R3D.foto) e desenhado atrás
// de tudo que anda (os prédios ficam no recuo junto à muralha, como as fachadas da praça); as
// janelas e os lampiões acesos entram na camada emissiva, mais fortes à noite. Na 3ª pessoa os
// mesmos modelos entram na cena. Sem o motor 3D (ou antes de o kit chegar), caixas simples.
// INTERIORES: cada prédio público tem a porta ([E] Entrar) para uma sala fechada própria
// ('aurora_taverna', 'aurora_hospedaria', 'aurora_conselho', 'aurora_quartel') com a mobília do
// kit (mesa, banco, cadeira, cama, barril, balcão, estante, lareira, caixote, boneco de treino,
// armeiro, estandarte), quem trabalha ali e os serviços:
//   taverna: refeição (vida, energia e o corpo aquecido) e rumores; hospedaria: descanso e o
//   armário; conselho: as missões disponíveis e os contratos da Guilda; quartel: o treino, o
//   desafio da arena e a árvore de habilidades.
// As casas do bairro ficam fechadas (os moradores respondem à porta). Zona segura, sem inimigos.
// ---------------------------------------------------------------------------
const BAIRRO_ID = 'aurora_bairro';
const BAIRRO_RECUO = 4 * TILE;   // fundo dos prédios (nem o herói nem os moradores passam)
// O bairro: a luz da praça da Aurora com o chão de lajes de pedra; os interiores: tábuas (taverna e
// hospedaria) e lajes (conselho e quartel), paredes de pedra e a luz quente das lareiras na 3ª
// pessoa (amb3p: a luz ambiente no lugar da azulada das salas fechadas)
THEMES.bairro = Object.assign({}, THEMES.aurora, { floor: [32, 9, 20], wall: [30, 10], deco: 'lajes', pillar: 'stone', ruined: 0, amb3p: [0.56, 0.52, 0.5] });
THEMES.interior = { floor: [26, 34, 15], wall: [24, 16], lamp: '255,170,90', accent: '255,150,70', dark: '14,8,4', darkness: 0.6, aberto: 0,
  sky: 'indoor', decor: 'none', pillar: 'stone', deco: 'madeira', ruined: 0, amb3p: [0.66, 0.52, 0.4] };
THEMES.interior_pedra = { floor: [32, 8, 17], wall: [30, 8], lamp: '255,190,120', accent: '255,170,90', dark: '10,8,6', darkness: 0.6, aberto: 0,
  sky: 'indoor', decor: 'none', pillar: 'stone', deco: 'lajes', ruined: 0, amb3p: [0.6, 0.52, 0.44] };

// Prédios: lado N (frente para +y, giro π/2) ou W (frente para +x, giro 0), na ordem ao longo da
// parede (distribuídos pelas larguras reais, com vãos iguais); cor/telhado: o desenho simples
// enquanto o modelo não chega
const BAIRRO_PREDIOS = [
  { id: 'quartel', lado: 'N', nome: 'QUARTEL DA GUARDA', curto: 'QUARTEL', interior: 'aurora_quartel', luz: '255,160,110', cor: '#3c3834', tel: '#24211e', alt: 330 },
  { id: 'taverna', lado: 'N', nome: 'TAVERNA DO JAVALI DOURADO', curto: 'TAVERNA', interior: 'aurora_taverna', luz: '255,196,110', cor: '#5a4a36', tel: '#4a2016', alt: 420 },
  { id: 'conselho', lado: 'N', nome: 'CONSELHO DA AURORA', curto: 'CONSELHO', interior: 'aurora_conselho', luz: '255,220,160', cor: '#5c5650', tel: '#1c2028', alt: 440 },
  { id: 'hospedaria', lado: 'W', nome: 'HOSPEDARIA DA CHAMA', curto: 'HOSPEDARIA', interior: 'aurora_hospedaria', luz: '255,170,120', cor: '#5e5240', tel: '#1c2028', alt: 470 },
  { id: 'casa_a', lado: 'W', nome: 'VIVEIRO DOS ALVES', curto: 'VIVEIRO', interior: 'aurora_animais', luz: '255,210,150', cor: '#5a4c3a', tel: '#4a2016', alt: 270 },
  { id: 'casa_b', lado: 'W', nome: 'CASA DE DONA CÉLIA', curto: 'CASA', casa: '"Já vai! …Ah, não é o padeiro. Volte de dia, querido."', cor: '#5e5444', tel: '#1c2028', alt: 380 },
  { id: 'casa_c', lado: 'W', nome: 'CASA DO VELHO ARNALDO', curto: 'CASA', casa: '"Se for cobrança, eu morri. Se for visita, também."', cor: '#584a38', tel: '#4a2016', alt: 380 },
];
// Medidas de cada prédio antes do kit chegar ([fundo, largura] em unidades do jogo; os reais
// vêm do PROPS3D: w ao longo da frente, d ao longo da parede)
const BAIRRO_MEDIDAS = { quartel: [212, 373], taverna: [219, 387], conselho: [206, 379], hospedaria: [221, 361], casa_a: [193, 274], casa_b: [202, 296], casa_c: [197, 262] };

// Objetos da rua do bairro: [id, x, y (fração), giro, escala] (mais um lampião em cada vão entre os prédios)
const BAIRRO_RUA = [
  ['lampiao_rua', 0.47, 0.5, 0, 1], ['lampiao_rua', 0.76, 0.64, 0, 1],
  ['poco', 0.6, 0.48, 0, 1], ['banco', 0.6, 0.36, Math.PI / 2, 1], ['carroca', 0.84, 0.8, 2.6, 1], ['fardo_feno', 0.9, 0.7, 0.4, 1], ['fardo_feno', 0.76, 0.86, 1.2, 0.9],
  ['estandarte_rubro', 0.22, 0.2, 0, 1], ['boneco_treino', 0.3, 0.24, 2.2, 1], ['armeiro', 0.4, 0.27, 1.57, 1],
  ['barril', 0.5, 0.2, 0, 1], ['barril', 0.53, 0.205, 0.7, 1], ['caixote', 0.66, 0.205, 0.3, 1], ['caixote', 0.215, 0.5, 1.1, 1],
  ['estandarte_rubro', 0.92, 0.25, 0, 1],
];
// Interiores: o prédio de onde se entra, o tamanho da sala e a mobília ([id, x, y, giro, escala])
const P2 = Math.PI / 2;
const BAIRRO_INTERIORES = {
  aurora_taverna: { predio: 'taverna', name: 'Taverna do Javali Dourado', theme: 'interior', tiles: 11,
    moveis: [['balcao', 0.17, 0.36, 0, 1], ['barril', 0.06, 0.1, 0, 1], ['barril', 0.13, 0.07, 0.7, 1], ['barril', 0.06, 0.62, 0.2, 1], ['caixote', 0.07, 0.72, 0.4, 1],
      ['estante', 0.42, 0.025, P2, 1], ['lareira', 0.72, 0.04, P2, 1],
      ['mesa', 0.45, 0.42, P2, 1], ['banco', 0.45, 0.365, P2, 1], ['banco', 0.45, 0.475, P2, 1],
      ['mesa', 0.74, 0.52, P2, 1], ['cadeira', 0.665, 0.52, 0, 1], ['cadeira', 0.815, 0.52, Math.PI, 1], ['cadeira', 0.74, 0.465, P2, 1], ['cadeira', 0.74, 0.575, -P2, 1],
      ['mesa', 0.22, 0.74, 0, 1], ['banco', 0.165, 0.74, 0, 1], ['banco', 0.275, 0.74, 0, 1],
      ['caixote', 0.9, 0.12, 0.3, 1], ['barril', 0.94, 0.22, 0, 1],
      ['alaude_bardo', 0.635, 0.21, 0.6, 1]] },
  aurora_hospedaria: { predio: 'hospedaria', name: 'Hospedaria da Chama', theme: 'interior', tiles: 10,
    moveis: [['balcao', 0.2, 0.3, 0, 0.85], ['barril', 0.07, 0.08, 0, 1], ['caixote', 0.15, 0.06, 0.3, 1],
      ['cama', 0.55, 0.075, P2, 1], ['cama', 0.69, 0.075, P2, 1], ['cama', 0.83, 0.075, P2, 1],
      ['estante', 0.025, 0.6, 0, 1], ['lareira', 0.05, 0.84, 0, 1],
      ['mesa', 0.62, 0.55, P2, 1], ['cadeira', 0.62, 0.49, P2, 1], ['cadeira', 0.62, 0.61, -P2, 1], ['caixote', 0.93, 0.3, 0.6, 1]] },
  aurora_conselho: { predio: 'conselho', name: 'Conselho da Aurora', theme: 'interior_pedra', tiles: 11,
    moveis: [['mesa', 0.45, 0.3, P2, 1], ['mesa', 0.549, 0.3, P2, 1],
      ['cadeira', 0.42, 0.245, P2, 1], ['cadeira', 0.58, 0.245, P2, 1], ['cadeira', 0.42, 0.355, -P2, 1], ['cadeira', 0.58, 0.355, -P2, 1],
      ['estante', 0.2, 0.025, P2, 1], ['estante', 0.75, 0.025, P2, 1], ['estante', 0.89, 0.025, P2, 1],
      ['estandarte_rubro', 0.06, 0.08, 0, 1], ['estandarte_rubro', 0.94, 0.12, 0, 1], ['lareira', 0.05, 0.5, 0, 1], ['caixote', 0.08, 0.8, 0.5, 1]] },
  aurora_quartel: { predio: 'quartel', name: 'Quartel da Guarda', theme: 'interior_pedra', tiles: 11,
    moveis: [['armeiro', 0.3, 0.04, P2, 1], ['armeiro', 0.46, 0.04, P2, 1], ['estandarte_rubro', 0.1, 0.08, 0, 1], ['estandarte_rubro', 0.62, 0.06, 0, 1],
      ['boneco_treino', 0.56, 0.48, 2.4, 1], ['boneco_treino', 0.72, 0.4, 2.8, 1], ['boneco_treino', 0.72, 0.6, 2.0, 1],
      ['cama', 0.065, 0.55, 0, 1], ['cama', 0.065, 0.68, 0, 1], ['cama', 0.065, 0.81, 0, 1],
      ['mesa', 0.32, 0.32, P2, 1], ['banco', 0.32, 0.265, P2, 1], ['banco', 0.32, 0.375, P2, 1],
      ['barril', 0.88, 0.1, 0, 1], ['caixote', 0.93, 0.18, 0.5, 1], ['caixote', 0.86, 0.17, 1.2, 1]] },
  // a loja de animais (js/mundo/pets.js): balcão da Cora, cercado de palha e caixotes de ração; os
  // animais da vitrine entram por Pets.vitrine()
  aurora_animais: { predio: 'casa_a', name: 'Viveiro dos Alves', theme: 'interior', tiles: 10,
    moveis: [['balcao', 0.2, 0.62, 0, 0.85], ['caixote', 0.07, 0.08, 0.3, 1], ['caixote', 0.12, 0.07, 1.1, 1], ['barril', 0.06, 0.2, 0, 1],
      ['cama', 0.62, 0.075, P2, 1], ['cama', 0.78, 0.075, P2, 1], ['estante', 0.025, 0.45, 0, 1], ['mesa', 0.8, 0.5, P2, 1],
      ['caixote', 0.93, 0.3, 0.6, 1], ['barril', 0.94, 0.8, 0, 1], ['lareira', 0.05, 0.84, 0, 1]] },
};
// Quem mora e trabalha no bairro e nos prédios
const BAIRRO_POVO = [
  { id: 'aur_tobias', nome: 'TOBIAS', zona: BAIRRO_ID, at: [0.2, 0.42], model: 'civil', variant: 0, facing: 0.2, papel: 'Domador da Estrebaria da Guarda', servicos: ['montarias'],
    personalidade: 'Grandalhão de voz mansa; trata os lobos de montaria como filhos.',
    ola: ['Devagar perto do cercado. Eles sentem pressa.', 'Montaria boa é a que volta sozinha para casa.'],
    temas: [['Por que lobos e não cavalos?', 'Cavalo não aguenta o Nexus: se assusta com neon, empaca na neve. Lobo grande vai a qualquer lugar. Os cavalos que restam estão nas fazendas do sul, e eu não vendo o que não tenho.'],
      ['Posso lutar montado?', 'Não. Montado você corre; para lutar, desce. O lobo se afasta e espera.']] },
  { id: 'aur_cora', nome: 'CORA ALVES', zona: 'aurora_animais', at: [0.2, 0.7], model: 'civil', variant: 3, facing: 4.7, papel: 'Tratadora de animais', servicos: ['animais'],
    personalidade: 'Calma e direta; fala com os bichos antes de falar com gente.',
    ola: ['Devagar ao entrar: a Asa Noturna estranha gente nova.', 'Veio adotar ou só matar a saudade de bicho?'],
    temas: [['Que lugar é este?', 'O Viveiro dos Alves. Meu avô criava os lobos da guarda; eu cuido de quem chega: lobos, aves, o gato da janela que não é de ninguém.'],
      ['Como cuido de um companheiro?', 'Petisco quando tiver fome, brincadeira quando estiver abatido, carinho sempre. Com fome e sozinho, ele murcha. E não leve para a briga: eles não são soldados.']] },
  { id: 'aur_davi', nome: 'DAVI ALVES', zona: 'aurora_animais', at: [0.7, 0.32], model: 'civil', variant: 2, facing: 1.6, papel: 'Aprendiz do viveiro',
    personalidade: 'Menino curioso; jura que entende o que os lobos dizem.',
    ola: ['O Farol uivou três vezes hoje. Vai chover, pode escrever.', 'A Asa Noturna brilha mais quando está feliz. Repara!'],
    temas: [['O que você faz aqui?', 'Troco a palha, dou comida e escovo os lobos. A Cora diz que um dia eu fico com o viveiro. Se eu não esquecer o portão aberto de novo.']] },
  { id: 'aur_rui', nome: 'GUARDA RUI', zona: BAIRRO_ID, at: [0.34, 0.33], model: 'civil', variant: 0, facing: 1.2, papel: 'Guarda da muralha', rota: [[0.34, 0.33], [0.62, 0.3], [0.34, 0.62], [0.3, 0.86]],
    personalidade: 'Sério e cansado; conta os passos da ronda.',
    ola: ['Ronda da muralha. Tudo calmo. Por enquanto.', 'Se ouvir o sino do conselho, corra para dentro.'],
    temas: [['Que bairro é este?', 'O Bairro da Muralha: as casas mais velhas da Aurora, encostadas no muro. Taverna, hospedaria, o conselho e o nosso quartel. Quem chega de fora dorme aqui.'],
      ['O quartel aceita voluntários?', 'A Capitã Irene treina qualquer um que aguente o boneco de palha. Lá dentro, no quartel.'],
      ['Você nunca dorme?', 'Durmo. Das nove às cinco e meia, no beliche do quartel. A Marta fica com a noite; a gente troca na porta, às seis e às dezoito.']] },
  { id: 'aur_marta', nome: 'GUARDA MARTA', zona: BAIRRO_ID, at: [0.3, 0.86], model: 'civil', variant: 2, facing: 4.0, papel: 'Guarda da muralha (turno da noite)', rota: [[0.3, 0.86], [0.66, 0.75], [0.86, 0.5], [0.62, 0.3]],
    personalidade: 'Calada e atenta; prefere a noite porque "ninguém pergunta nada".',
    ola: ['Ronda da noite. Siga com a lanterna acesa.', 'Viu alguma coisa estranha na muralha? Não? Ótimo.'],
    temas: [['Por que o turno da noite?', 'Porque à noite a rua é honesta: quem anda nela tem motivo. Troco com o Rui na porta do quartel, às seis e às dezoito.'],
      ['O que acontece à noite no bairro?', 'A taverna enche, a hospedaria apaga as luzes, o Jorge some para a carroça. E eu conto lampiões.']] },
  { id: 'aur_nina', nome: 'NINA', zona: BAIRRO_ID, at: [0.66, 0.56], model: 'civil', variant: 3, facing: 3.6, papel: 'Moradora', rota: [[0.66, 0.56], [0.52, 0.62], [0.66, 0.7]],
    personalidade: 'Falante, conhece a vida de todo mundo do bairro.',
    ola: ['O poço é o melhor lugar para saber das coisas. Água e fofoca, as duas frescas.', 'Já foi à taverna? O ensopado do Bento cura até saudade.'],
    temas: [['O que tem para fazer aqui?', 'Comer no Javali Dourado, dormir na Chama, levar recado ao conselho e apanhar no quartel. Nessa ordem, se tiver juízo.']],
    rumores: [{ txt: 'Meu primo jura que viu luz debaixo da praça de Carmesin. Diz que tem um cofre do tempo do pedágio enterrado lá.', revela: { tesouro: 'tes_portoes' } }] },
  { id: 'aur_jorge', nome: 'JORGE', zona: BAIRRO_ID, at: [0.8, 0.72], model: 'civil', variant: 1, facing: 3.9, papel: 'Carroceiro',
    personalidade: 'Desconfiado com estranhos, generoso com quem ajuda a descarregar.',
    ola: ['Feno, barril e notícia ruim: é o que a carroça traz.', 'Cuidado com a roda, está solta desde Velmora.'],
    temas: [['De onde você vem?', 'Das estradas de Velmora. A floresta engole a trilha toda semana; a gente abre de novo.']],
    rumores: [{ txt: 'Na estrada eu passei por uma raiz enorme que descia para o escuro. Os lobos não chegam perto dela.', revela: { masmorra: 'raiz_profunda' } }] },
  // interiores
  { id: 'aur_bento', nome: 'BENTO', zona: 'aurora_taverna', at: [0.11, 0.36], model: 'civil', variant: 1, facing: 0, papel: 'Taverneiro', servicos: ['refeicao'],
    personalidade: 'Barrigudo e risonho; serve primeiro e pergunta depois.',
    ola: ['Senta! Ensopado de javali, pão de ontem e cerveja de hoje.', 'Voltou! O caldeirão sabia.'],
    temas: [['Por que "Javali Dourado"?', 'O primeiro javali que eu cacei tinha um colar de cobre. Brilhava. Ficou o nome, foi-se o javali.']],
    rumores: [{ txt: 'Um cliente bêbado falou de túneis de manutenção em Carmesin que viraram ossário de máquinas. Disse que a entrada fica nas fendas.', revela: { masmorra: 'catacumbas' } },
      { txt: 'Dizem que um avô escondeu as economias na praça velha, antes do Dia Zero. Ninguém achou.', revela: { tesouro: 'tes_praca' } }] },
  { id: 'aur_cosme', nome: 'COSME', zona: 'aurora_taverna', at: [0.6, 0.2], model: 'civil', variant: 0, facing: 2.0, papel: 'Bardo',
    retrato: 'assets/npcs/meshy/Bardo.png',
    personalidade: 'Dramático; transforma qualquer conversa em balada.',
    ola: ['Uma moeda para a canção da noite em que o céu escureceu?', 'Ah, um herói! Me conte tudo, eu exagero depois.'],
    temas: [
      ['Cante a cantiga da taverna!', '"Enche a caneca até derramar! Que a noite é longa e o inverno vai durar! O porco tá no fogo e a cerveja é de barril! Batam as botas com força no tablado, que hoje a cantoria é no Javali Dourado! Às três e doze o céu caiu, e quem dormia não acordou; mas numa torre a chama ardeu, e a Aurora ninguém apagou! Bebam até o barril secar, cantem até a garganta rasgar! Um brinde aos loucos que ficaram de pé, um brinde ao Javali Dourado!"', 'dublagem/Bardo/brinde_javali_dourado.mp3'],
      ['Cante mais uma estrofe.', '"O vento uiva forte na velha muralha, mas dentro da taberna ninguém perde a batalha! O guarda tá bebendo, esqueceu da guarnição, o taverneiro ri com a moeda na mão! Peguem mais uma rodada de hidromel! Lá fora o mundo desaba em trovão, aqui dentro a gente bate no balcão! Quem cair no chão o companheiro carrega!"'],
      ['E esse alaúde?', 'Feito de carvalho antigo e cordas de liga flexível. Sobreviveu ao Dia Zero e a duas brigas de taberna. O Bento tentou usar como remo uma vez, mas eu não deixei.'],
      ['Você sempre foi bardo?', 'Fui programador de elevadores. Acredite: a balada paga melhor.']] },
  { id: 'aur_rosa', nome: 'ROSA', zona: 'aurora_hospedaria', at: [0.134, 0.3], model: 'civil', variant: 2, facing: 0, papel: 'Estalajadeira', servicos: ['descanso'],
    personalidade: 'Prática e gentil; troca os lençóis antes de você pedir.',
    ola: ['Quarto limpo, porta que tranca e silêncio garantido. Quase sempre.', 'A lareira está acesa. Descanse um pouco.'],
    temas: [['A hospedaria é sua?', 'Da minha mãe, e da mãe dela. A Chama nunca fechou, nem no Dia Zero. A gente só apagou as luzes de fora.']] },
  { id: 'aur_viajante', nome: 'VIAJANTE ENCAPUZADO', zona: 'aurora_hospedaria', at: [0.66, 0.4], model: 'civil', variant: 1, facing: 2.6, papel: 'Viajante',
    personalidade: 'Reservado; fala baixo e olha para a porta.',
    ola: ['…Você não me viu aqui.', 'As estradas do leste estão vigiadas. Eu vim pelo sul.'],
    temas: [['Para onde você vai?', 'Para onde o NEXUS não olha. Ainda estou procurando esse lugar.']],
    rumores: [{ txt: 'Debaixo da lagoa há um arco de pedra com luz azul. Quem desce ouve o mar falando.', revela: { masmorra: 'gruta' } }] },
  { id: 'aur_helena', nome: 'CONSELHEIRA HELENA', zona: 'aurora_conselho', at: [0.33, 0.3], model: 'ancia', facing: 0, papel: 'Conselheira da Aurora', servicos: ['missoes', 'guilda'],
    personalidade: 'Firme e paciente; mede cada palavra.',
    ola: ['O conselho ouve todo mundo. Decide devagar, mas decide.', 'Há trabalho para quem quer ajudar a cidade.'],
    temas: [['O que o conselho faz?', 'Decide quem entra, quem sai, onde vai a comida e quando a Chama acende. E distribui o trabalho: missões e contratos das regiões abertas.'],
      ['Quem governa a Aurora?', 'Ninguém e todos. O conselho tem sete cadeiras; uma está sempre vazia, para quem ainda não voltou.']] },
  { id: 'aur_didimo', nome: 'ESCRIBA DÍDIMO', zona: 'aurora_conselho', at: [0.8, 0.2], model: 'civil', variant: 1, facing: 2.2, papel: 'Escriba',
    personalidade: 'Minucioso; corrige a gramática de quem fala com ele.',
    ola: ['Registro tudo. Inclusive esta conversa. Inclusive esta frase.', 'Cuidado com os livros. Mais cuidado ainda com o que eles dizem.'],
    temas: [['O que você escreve?', 'A história da Aurora desde o Dia Zero. Nomes, datas, quem voltou e quem não. O NEXUS apaga; nós escrevemos de novo.'],
      ['O que aconteceu no Dia Zero?', 'Às 03:12 a rede inteira obedeceu a uma voz só. Quem estava conectado parou. Quem não estava… fundou esta cidade.']] },
  { id: 'aur_irene', nome: 'CAPITÃ IRENE', zona: 'aurora_quartel', at: [0.52, 0.28], model: 'civil', variant: 2, facing: 2.4, papel: 'Capitã da Guarda', servicos: ['treinador'],
    personalidade: 'Dura nos treinos, leal fora deles.',
    ola: ['Postura! …Ah, é você. Veio treinar ou apanhar?', 'O boneco de palha não revida. Os drones revidam. Treine.'],
    temas: [['O que a guarda faz?', 'Ronda na muralha, escolta das caravanas e treino de quem quer sair pelos portões e voltar inteiro.']] },
  { id: 'aur_pedro', nome: 'SOLDADO PEDRO', zona: 'aurora_quartel', at: [0.84, 0.5], model: 'civil', variant: 0, facing: 3.0, papel: 'Soldado',
    personalidade: 'Novato animado; ainda acha que a armadura é bonita.',
    ola: ['Já derrubei o boneco três vezes hoje! Ele levantou as três.', 'A capitã diz que eu luto bem. Ela diz isso rindo.'],
    temas: [['Há quanto tempo você é soldado?', 'Duas semanas. Antes eu vendia pão. Sinto falta do pão.']] },
];

const Bairro = {
  estado: '',        // kit de arquitetura: '' | 'carregando' | 'pronto' | 'falhou'
  fotos: new Map(),  // fotos dos prédios na vista isométrica (id → { canvas, emi, minX, minY, s, escala })
  objetos: [],       // objetos do Blender postos na zona atual (lampiões, mobília)
  _o3: {},           // matrizes dos prédios na 3ª pessoa
  zona() { return WORLD_ZONES[BAIRRO_ID]; },
  aqui() { return !!(World.zone && World.zone.distrito); },
  pronto() { return this.estado === 'pronto' && typeof PROPS3D !== 'undefined' && !!PROPS3D.taverna; },
  // ------------------------------------------------------------ o kit (js/assets/arquitetura3d.js, sob demanda)
  carregar() {
    if (this.estado || typeof document === 'undefined') return;
    if (typeof PROPS3D !== 'undefined' && PROPS3D.taverna) { this.carregado(); return; }
    this.estado = 'carregando';
    const s = document.createElement('script');
    s.src = 'js/assets/arquitetura3d.js';
    s.async = true;
    s.onerror = () => { this.estado = 'falhou'; console.warn('Bairro: não foi possível carregar js/assets/arquitetura3d.js'); };
    document.head.appendChild(s);
  },
  // Chamado pelo próprio js/assets/arquitetura3d.js no fim (e quando ele já estava carregado)
  carregado() {
    this.estado = 'pronto';
    if (typeof Cenario !== 'undefined') Cenario.registrarModelos();
    this.fotos.clear();
    const z = World.zone;
    if (game && game.room && z && (z.distrito || z.id === BAIRRO_ID)) { this.colocarObjetos(z); this.moverPortas(); }
  },
  // ------------------------------------------------------------ geometria dos prédios
  // Fundo (ao longo da frente) e largura (ao longo da parede) do prédio
  medidas(B) {
    const W = this.pronto() && PROPS3D[B.id];
    return W ? [W.w, W.d] : BAIRRO_MEDIDAS[B.id];
  },
  // Centro de cada prédio ao longo da sua parede: as larguras somadas e os vãos iguais (também
  // nas pontas) — devolve { c: { id: centro }, vaos: os meios dos vãos de cada parede (os lampiões) }
  aoLongo(R) {
    const k = `${R.w}|${R.h}|${this.pronto()}`;
    if (this._ao && this._ao.k === k) return this._ao;
    const out = { k, c: {}, vaos: { N: [], W: [] } };
    for (const lado of ['N', 'W']) {
      const Bs = BAIRRO_PREDIOS.filter((B) => B.lado === lado), a = BAIRRO_RECUO + 12, b = (lado === 'N' ? R.w : R.h) - 12;
      const soma = Bs.reduce((t, B) => t + this.medidas(B)[1], 0), vao = Math.max(0, (b - a - soma) / (Bs.length + 1));
      let x = a + vao;
      Bs.forEach((B, i) => {
        const L = this.medidas(B)[1];
        out.c[B.id] = x + L / 2;
        x += L + vao;
        if (i < Bs.length - 1) out.vaos[lado].push(x - vao / 2);
      });
    }
    return (this._ao = out);
  },
  // Origem do modelo (centro da base), o giro e a caixa no chão; a frente fica na linha do recuo
  lugar(B, R) {
    const [fundo, larg] = this.medidas(B), c = this.aoLongo(R).c[B.id], o = BAIRRO_RECUO - fundo / 2;
    return B.lado === 'N'
      ? { x: c, y: o, giro: Math.PI / 2, x0: c - larg / 2, x1: c + larg / 2, y0: BAIRRO_RECUO - fundo, y1: BAIRRO_RECUO }
      : { x: o, y: c, giro: 0, x0: BAIRRO_RECUO - fundo, x1: BAIRRO_RECUO, y0: c - larg / 2, y1: c + larg / 2 };
  },
  // Ponto do mundo de uma marca do prédio (porta, janela), em coordenadas locais do modelo
  ponto(L, p) {
    const c = Math.cos(L.giro), s = Math.sin(L.giro);
    return { x: L.x + p[0] * c - p[1] * s, y: L.y + p[0] * s + p[1] * c, z: p[2] };
  },
  // A porta de entrada (a marca do modelo; antes do kit, o meio da frente) e o ponto da rua diante dela
  porta(B, R) {
    const L = this.lugar(B, R), W = this.pronto() && PROPS3D[B.id], m = W && W.marcas && W.marcas.portas && W.marcas.portas[0];
    const q = m ? this.ponto(L, m.p) : { x: B.lado === 'N' ? L.x : BAIRRO_RECUO, y: B.lado === 'N' ? BAIRRO_RECUO : L.y, z: 0 };
    return B.lado === 'N' ? { x: q.x, y: BAIRRO_RECUO + 26, px: q.x, py: q.y } : { x: BAIRRO_RECUO + 26, y: q.y, px: q.x, py: q.y };
  },
  predio(id) { return BAIRRO_PREDIOS.find((B) => B.id === id) || null; },

  // ------------------------------------------------------------ montagem das zonas (World.loadZone)
  aoCarregar(z) {
    const g = game, R = g.room;
    this.objetos = [];
    if (z.id === CIDADE_ID) {
      // a passagem da praça para o bairro (borda leste, perto da muralha de cima); o kit já começa a vir
      g.npcs.push(new WorldProp('gate', R.w - 64, R.h * 0.17, { to: BAIRRO_ID, dir: null, chegada: [0.3, 0.8], rotulo: '→ BAIRRO DA MURALHA' }));
      this.carregar();
      return;
    }
    if (!z.distrito) return;
    this.carregar();
    if (z.id === BAIRRO_ID) {
      for (const B of BAIRRO_PREDIOS) { const d = this.porta(B, R); g.npcs.push(new PortaBairro(d.x, d.y, B)); }
      g.npcs.push(new WorldProp('gate', R.w * 0.3, R.h - 64, { to: CIDADE_ID, dir: null, chegada: [0.92, 0.2], rotulo: '← PRAÇA DA AURORA' }));
    } else {
      // interior: a saída fica na frente da sala e leva para a porta do prédio no bairro
      const B = this.predio(z.predio), Rb = { w: this.zona().tiles * TILE, h: this.zona().tiles * TILE }, d = B ? this.porta(B, Rb) : { x: Rb.w / 2, y: Rb.h / 2 };
      const ch = B && B.lado === 'W' ? [(BAIRRO_RECUO + 60) / Rb.w, d.y / Rb.h] : [d.x / Rb.w, (BAIRRO_RECUO + 30) / Rb.h];
      g.npcs.push(new WorldProp('gate', R.w * 0.5, R.h - 60, { to: BAIRRO_ID, dir: null, chegada: ch, rotulo: '↓ SAIR · BAIRRO DA MURALHA' }));
    }
    if (this.pronto()) this.colocarObjetos(z);
  },
  // Objetos do Blender da zona: os da rua (bairro) ou a mobília (interior), com os colisores
  colocarObjetos(z) {
    const g = game, R = g.room;
    if (!R || this.objetos.length || typeof Cenario === 'undefined') return 0;
    let L = (BAIRRO_INTERIORES[z.id] || {}).moveis || [];
    if (z.id === BAIRRO_ID) {   // a rua: um lampião em cada vão entre os prédios, na calçada
      const V = this.aoLongo(R).vaos, d = BAIRRO_RECUO + 44;
      L = V.N.map((x) => ['lampiao_rua', x / R.w, d / R.h, 0, 1]).concat(V.W.map((y) => ['lampiao_rua', d / R.w, y / R.h, 0, 1]), BAIRRO_RUA);
    }
    const portas = g.npcs.filter((n) => n instanceof PortaBairro || (n instanceof WorldProp && n.kind === 'gate'));
    for (const [id, fx, fy, giro, esc] of L) {
      if (!PROPS3D[id] || !MODELS3D['cen_' + id]) continue;
      const x = R.w * fx, y = R.h * fy, W = PROPS3D[id];
      if (portas.some((q) => dist(q.x, q.y, x, y) < W.r * esc + 50)) continue;   // nunca na frente de uma porta ou passagem
      const o = new Cenario.Objeto(id, x, y, giro, esc);
      g.npcs.push(o); this.objetos.push(o);
      for (const c of this.colisores(W, x, y, giro, esc)) R.pillars.push(Object.assign(c, { h: W.h * esc, cenario: true, sprite: null }));
    }
    return this.objetos.length;
  },
  // Colisores redondos de um objeto: um para os quase quadrados, uma fileira para os compridos
  // (balcão, mesa, banco, cama, estante) — o herói chega perto do balcão e da mesa
  colisores(W, x, y, giro, esc) {
    const a = W.w * esc, b = W.d * esc, curto = Math.min(a, b), longo = Math.max(a, b);
    if (longo < curto * 1.5) return [{ x, y, r: W.r * esc * 0.85 }];
    const n = Math.max(2, Math.round(longo / curto)), r = curto * 0.45 + 2, passo = (longo - curto) / (n - 1);
    const dx = b > a ? -Math.sin(giro) : Math.cos(giro), dy = b > a ? Math.cos(giro) : Math.sin(giro);
    const out = [];
    for (let k = 0; k < n; k++) { const t = (k - (n - 1) / 2) * passo; out.push({ x: x + dx * t, y: y + dy * t, r }); }
    return out;
  },
  // As portas mudam de lugar quando as medidas reais chegam com o kit
  moverPortas() {
    const R = game.room;
    for (const n of game.npcs) if (n instanceof PortaBairro) { const d = this.porta(n.B, R); n.x = d.x; n.y = d.y; }
  },

  // ------------------------------------------------------------ desenho (vista isométrica)
  // Começo do quadro (motor 3D livre): fotografa um prédio que falta na escala atual
  processar() {
    const R = game.room;
    if (!R || !R.bairro || !this.pronto() || typeof R3D === 'undefined' || !R3D.active || R3D.used || !game.use3D) return;
    const esc = game.roomScale();
    for (const B of BAIRRO_PREDIOS) {
      const f = this.fotos.get(B.id);
      if (f && f.escala === esc) continue;
      const m = game.model3('cen_' + B.id);
      if (!m || !this.texturasProntas(m)) continue;
      const L = this.lugar(B, R);
      const o = { yaw: L.giro, scale: 1, lift: 0, roll: 0, pitch: 0, flash: 0, emi: 1, holo: false, ghost: null, tint: null };
      const nf = R3D.foto(m, o, esc);
      if (!nf) continue;
      nf.escala = esc;
      this.fotos.set(B.id, nf);
      return;   // um por quadro
    }
  },
  texturasProntas(m) {
    const tex = m.tex;
    if (!tex) return true;
    const mt = tex.mat ? (tex.matTex || (tex.matTex = typeof tex.mat === 'string' ? { src: tex.mat } : { canvas: tex.mat })) : null;
    const nt = tex.nrm ? (tex.nrmTex || (tex.nrmTex = typeof tex.nrm === 'string' ? { src: tex.nrm } : { canvas: tex.nrm })) : null;
    for (const t of [tex, mt, nt]) if (t && R3D.texOf(t) === R3D.blankTex) return false;
    return true;
  },
  ordem(R) { return BAIRRO_PREDIOS.map((B) => ({ B, L: this.lugar(B, R) })).sort((a, b) => (a.L.x + a.L.y) - (b.L.x + b.L.y)); },
  // Os prédios (Room.drawBackground): a foto do modelo ou, sem ela, a caixa simples
  desenharPredios(ctx, R) {
    for (const { B, L } of this.ordem(R)) {
      const f = this.fotos.get(B.id), sx = isoX(L.x, L.y), sy = isoY(L.x, L.y);
      if (f) { ctx.drawImage(f.canvas, sx + f.minX, sy + f.minY, f.canvas.width / f.s, f.canvas.height / f.s); continue; }
      this.caixa(ctx, L, B);
    }
  },
  // Prédio provisório (sem o motor 3D ou com o kit ainda chegando): paredes, telhado e a porta
  caixa(ctx, L, B) {
    const P = (x, y, z = 0) => [isoX(x, y), isoY(x, y) - z], H = B.alt;
    const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); };
    const tom = (hex, k) => { const c = hex3(hex).map((v) => Math.round(v * 255 * k)); return `rgb(${c[0]},${c[1]},${c[2]})`; };
    const { x0, x1, y0, y1 } = L;
    poly([P(x1, y0), P(x1, y1), P(x1, y1, H), P(x1, y0, H)], tom(B.cor, 0.7));
    poly([P(x0, y1), P(x1, y1), P(x1, y1, H), P(x0, y1, H)], tom(B.cor, 0.9));
    poly([P(x0, y0, H), P(x1, y0, H), P(x1, y1, H), P(x0, y1, H)], B.tel);
    const d = this.porta(B, game.room), w = 26;
    if (B.lado === 'N') poly([P(d.px - w, y1), P(d.px + w, y1), P(d.px + w, y1, 78), P(d.px - w, y1, 78)], '#140e0a');
    else poly([P(x1, d.py - w), P(x1, d.py + w), P(x1, d.py + w, 78), P(x1, d.py - w, 78)], '#140e0a');
  },
  // Chão do bairro (pré-renderizado na sala): calçamento diante dos prédios, a praça do poço e o bastião do canto
  desenharFundo(ctx, R) {
    const P = (x, y, z = 0) => [isoX(x, y), isoY(x, y) - z];
    const poly = (pts, fill) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    const r = mulberry32(4242), RX = BAIRRO_RECUO, piso = !!R._terreno;   // (com o piso por região, js/terreno.js, calçada, praça e ruas já estão no chão)
    // calçada de pedras diante das fachadas (as duas paredes)
    for (const [ax, ay, bx, by] of piso ? [] : [[RX, RX, R.w, RX + 120], [RX, RX + 120, RX + 120, R.h]]) {
      for (let x = ax; x < bx; x += 28) for (let y = ay; y < by; y += 28) {
        const v = r();
        poly([P(x + 1, y + 1), P(x + 27, y + 1), P(x + 27, y + 27), P(x + 1, y + 27)], `rgba(${70 + v * 30 | 0},${64 + v * 26 | 0},${58 + v * 20 | 0},0.38)`);
      }
    }
    // praça do poço: anéis de pedra
    const cx = R.w * 0.6, cy = R.h * 0.48;
    for (let k = 4; k >= 1 && !piso; k--) {
      const rr = 40 + k * 30, pts = [];
      for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU; pts.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)); }
      poly(pts, k % 2 ? 'rgba(84,76,66,0.42)' : 'rgba(58,52,46,0.42)');
    }
    // rua até a passagem da praça (sul) e até a carroça
    for (const [x0, y0, x1, y1] of piso ? [] : [[cx, cy, R.w * 0.3, R.h], [cx, cy, R.w * 0.84, R.h * 0.8], [cx, cy, R.w * 0.565, RX]]) {
      for (let i = 0; i < 22; i++) {
        const t = i / 22, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        poly([P(x - 22, y - 22), P(x + 22, y - 22), P(x + 22, y + 22), P(x - 22, y + 22)], i % 2 ? 'rgba(96,88,76,0.22)' : 'rgba(70,64,56,0.22)');
      }
    }
    // bastião do canto (a muralha faz a curva)
    const H = 360, k0 = RX * 0.95;
    poly([P(k0, 0), P(k0, k0), P(k0, k0, H), P(k0, 0, H)], '#2c2824');
    poly([P(0, k0), P(k0, k0), P(k0, k0, H), P(0, k0, H)], '#36312c');
    poly([P(0, 0, H), P(k0, 0, H), P(k0, k0, H), P(0, k0, H)], '#1e1b18');
    for (let i = 0; i < 6; i++) { const a = i / 6 * k0, b = a + k0 / 12; poly([P(a, k0, H), P(b, k0, H), P(b, k0, H + 26), P(a, k0, H + 26)], '#3a342e'); poly([P(k0, a, H), P(k0, b, H), P(k0, b, H + 26), P(k0, a, H + 26)], '#2e2a26'); }
  },
  // Janelas e lampiões acesos (depois da escuridão): a passada emissiva dos modelos, mais forte à
  // noite, o halo das janelas e os letreiros dos prédios públicos
  desenharLuzes(ctx, R, t) {
    const noite = 1 - WorldTime.luz();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const { B, L } of this.ordem(R)) {
      const f = this.fotos.get(B.id), sx = isoX(L.x, L.y), sy = isoY(L.x, L.y);
      if (f && f.emi) { ctx.globalAlpha = 0.35 + 0.65 * noite; ctx.drawImage(f.emi, sx + f.minX, sy + f.minY, f.canvas.width / f.s, f.canvas.height / f.s); ctx.globalAlpha = 1; }
      const W = this.pronto() && PROPS3D[B.id], J = (W && W.marcas && W.marcas.janelas) || [];
      for (const [k, m] of J.entries()) {
        const q = this.ponto(L, m.p), on = (Math.sin(k * 2.3 + B.id.length * 1.7) + 1) / 2 > 0.25;
        if (on) GlowCache.draw(ctx, B.luz || '255,190,120', isoX(q.x, q.y), isoY(q.x, q.y) - q.z, 22, (0.12 + 0.3 * noite) * (0.9 + 0.1 * Math.sin(t * 0.8 + k)));
      }
      const d = this.porta(B, R);
      GlowCache.draw(ctx, B.luz || '255,190,120', isoX(d.px, d.py), isoY(d.px, d.py) - 34, 50, 0.18 + 0.25 * noite);
    }
    ctx.globalCompositeOperation = 'source-over';
    // letreiros (os prédios com interior)
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const B of BAIRRO_PREDIOS) {
      if (!B.interior) continue;
      const d = this.porta(B, R), s = [isoX(d.px, d.py), isoY(d.px, d.py) - 112], w = ctx.measureText(B.nome).width + 16;
      ctx.fillStyle = 'rgba(12,8,6,0.72)'; ctx.fillRect(s[0] - w / 2, s[1] - 8, w, 16);
      ctx.fillStyle = `rgba(${B.luz},0.95)`; ctx.fillText(B.nome, s[0], s[1] + 0.5);
    }
    ctx.letterSpacing = '0px';
    ctx.restore();
  },
  // Luz que corta a escuridão (Room.addLights): portas, janelas e lampiões
  luzes(lighting, R) {
    const noite = 1 - WorldTime.luz();
    for (const B of BAIRRO_PREDIOS) { const d = this.porta(B, R); lighting.add(isoX(d.px, d.py), isoY(d.px, d.py) - 30, 170 + 60 * noite, 0.6); }
    for (const o of this.objetos) if (o.cenId === 'lampiao_rua') lighting.add(isoX(o.x, o.y), isoY(o.x, o.y) - 90, 230, 0.75);
  },

  // ------------------------------------------------------------ 3ª pessoa (ThirdView: depois das árvores)
  // Os modelos dos prédios; o que tem a câmera dentro some
  fila3P(R, Q, E) {
    if (!R.bairro || !this.pronto()) return;
    for (const B of BAIRRO_PREDIOS) {
      const L = this.lugar(B, R);
      if (E[0] > L.x0 - 24 && E[0] < L.x1 + 24 && E[1] > L.y0 - 24 && E[1] < L.y1 + 24) continue;
      const m = game.model3('cen_' + B.id);
      if (!m) continue;
      let o = this._o3[B.id];
      if (!o || o.x !== L.x || o.y !== L.y) {
        o = this._o3[B.id] = { m: M3.make(), fixo: true, flash: 0, emi: 1, holo: false, ghost: null, tint: null, scale: 1, lift: 0, roll: 0, pitch: 0, yaw: 0, x: L.x, y: L.y };
        M3.trs(o.m, [L.x, L.y, 0], [0, 0, L.giro], [1, 1, 1]);
      }
      const it = R3D.queue(m, null, null, o);
      it.ent = null;
      Q.push(it);
    }
  },

  // ------------------------------------------------------------ planta (mapa, M) e textos do HUD
  desenharPlanta(ctx, x, y, w, h) {
    const R = game.room, p = game.player, z = World.zone;
    if (!R || !z || z.id !== BAIRRO_ID) return;
    ctx.save();
    ctx.fillStyle = 'rgba(6,10,20,0.92)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,190,110,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd08a';
    ctx.fillText('PLANTA · BAIRRO DA MURALHA', x + 10, y + 14); ctx.letterSpacing = '0px';
    const m = 12, mx = x + m, my = y + 28, mw = w - 2 * m, mh = h - 28 - m, sx = (v) => mx + (v / R.w) * mw, sy = (v) => my + (v / R.h) * mh;
    ctx.fillStyle = 'rgba(40,44,60,0.9)'; ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = 'rgba(30,24,40,0.95)'; ctx.fillRect(mx, my, sx(BAIRRO_RECUO) - mx, sy(BAIRRO_RECUO) - my);
    ctx.font = `9px ${FONT_UI}`; ctx.textAlign = 'center';
    for (const B of BAIRRO_PREDIOS) {
      const L = this.lugar(B, R), rgb = B.luz || '200,180,150';
      ctx.fillStyle = `rgba(${rgb},${B.interior ? 0.4 : 0.18})`; ctx.fillRect(sx(L.x0) + 1, sy(L.y0) + 1, sx(L.x1) - sx(L.x0) - 2, sy(L.y1) - sy(L.y0) - 2);
      ctx.fillStyle = `rgba(${rgb},${B.interior ? 1 : 0.6})`;
      if (B.lado === 'N') ctx.fillText(B.curto, sx((L.x0 + L.x1) / 2), sy(L.y1) + 8);
      else { ctx.textAlign = 'left'; ctx.fillText(B.curto, sx(L.x1) + 4, sy((L.y0 + L.y1) / 2)); ctx.textAlign = 'center'; }
    }
    ctx.strokeStyle = 'rgba(160,200,255,0.8)'; ctx.beginPath(); ctx.arc(sx(R.w * 0.6), sy(R.h * 0.48), 5, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#a8d0ff'; ctx.fillText('POÇO', sx(R.w * 0.6), sy(R.h * 0.48) + 13);
    ctx.fillStyle = '#ffd08a'; ctx.fillText('← PRAÇA', sx(R.w * 0.3), sy(R.h) - 8);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 3.5, 0, TAU); ctx.fill();
    ctx.restore();
  },
  objetivo() {
    const z = World.zone;
    if (z.id === BAIRRO_ID) return 'Bairro da Muralha: taverna (refeição e rumores), hospedaria (descanso), conselho (missões e contratos) e quartel (treino) · a praça fica a oeste';
    const txt = { aurora_taverna: 'refeição quente e rumores com o Bento', aurora_hospedaria: 'descanso e o armário com a Rosa', aurora_conselho: 'missões e contratos com a Conselheira Helena', aurora_quartel: 'treino, desafio da arena e habilidades com a Capitã Irene' }[z.id] || '';
    return `${z.name}: ${txt} · saída na frente da sala`;
  },

  // ------------------------------------------------------------ serviços (Povo.servico)
  servico(npc, s, o, volta) {
    if (typeof Pets !== 'undefined' && Pets.servico(npc, s, o, volta)) return true;   // a tratadora do viveiro (js/mundo/pets.js)
    if (typeof Montarias !== 'undefined' && Montarias.servico(npc, s, o, volta)) return true;   // a estrebaria da Guarda (js/mundo/montarias.js)
    if (s !== 'refeicao') return false;
    const preco = this.precoRefeicao();
    o.push({ id: 'refeicao', tag: '♨', txt: `Pedir o ensopado do dia (${preco} células: vida, energia e o corpo aquecido)`, fn: () => volta(this.refeicao()) });
    return true;
  },
  // (com a missão do ensopado feita, pela metade)
  precoRefeicao() { const v = 18 + Math.floor(game.activeProgress().level / 4) * 2, S = World.state && World.state.aventuras; return S && S.aur_ensopado && S.aur_ensopado.st === 'feita' ? Math.ceil(v / 2) : v; },
  // Ensopado: vida e energia cheias e o calor do chá quente por 5 minutos (Clima: isola do frio)
  refeicao() {
    const p = game.player;
    if (p.hp >= p.maxHp && p.fury >= p.maxEnergy && (p.buffs.cha || 0) > 200) return 'Mais um prato? Você ainda nem digeriu o primeiro.';
    const err = Oficios.cobrar(this.precoRefeicao());
    if (err) return `${err} O caldeirão não fia, amigo.`;
    p.hp = p.maxHp; p.fury = Math.max(p.fury, p.maxEnergy); game.hud.ghostHp = p.hp;
    p.buffs.cha = 300; p.buffs.refresco = 0;
    game.particles.ring(p.x, p.y, 44, '255,180,100', 0.5, 4);
    game.audio.play('health');
    return 'Aí está: ensopado de javali, pão e um caneco. Vai esquentar até a ponta do nariz.';
  },
};

// Porta de um prédio do bairro: [E] Entrar (o interior) ou bater (as casas)
class PortaBairro extends NPC {
  constructor(x, y, B) {
    super({ model: null, name: '', lines: ['…'] }, x, y);
    this.B = B; this.key = null; this.height = 70; this.t = rand(0, 10);
    this.name = B.nome; this.papel = B.nome; this.verb = B.interior ? 'Entrar' : 'Bater';
    this.lightRgb = B.luz || '255,190,120';
  }
  canTalk() { return true; }
  talk() {
    this.talkT = 1;
    if (this.B.interior) { World.go(this.B.interior, null, null, [0.5, 0.7]); return; }
    game.hud.say(this.B.nome, this.B.casa, 3.5);
    game.audio.play('uiMove');
  }
  update(dt) { this.t += dt; if (this.talkT > 0) this.talkT -= dt; }
  headPoint() { return { x: isoX(this.x, this.y), y: isoY(this.x, this.y) - this.height }; }
  drawShadow() {}
  draw() {}
  drawEmissive() {}
}

// As zonas do bairro e dos interiores (fora da grade das regiões; no mapa, dentro da cidade)
worldPrepZone(BAIRRO_ID, { r: -60, c: -60, region: 'nexus', cidade: true, distrito: 'bairro', bairro: true, name: 'Bairro da Muralha', theme: 'bairro', tiles: 28, pillars: 0, lv: 1,
  mapa: [0.62, 0.36], camps: [], chests: [] });
WORLD_ZONES[BAIRRO_ID].sub = 'REFÚGIO DA AURORA · BAIRRO DA MURALHA';
Object.keys(BAIRRO_INTERIORES).forEach((id, k) => {
  const I = BAIRRO_INTERIORES[id];
  worldPrepZone(id, { r: -62 - 2 * k, c: -60, region: 'nexus', cidade: true, distrito: 'interior', predio: I.predio, name: I.name, theme: I.theme, tiles: I.tiles, pillars: 0, lv: 1,
    mapa: [0.62, 0.36], camps: [], chests: [] });
  WORLD_ZONES[id].sub = 'REFÚGIO DA AURORA · BAIRRO DA MURALHA';
});
for (const P of BAIRRO_POVO) {
  if (!WORLD_POVO.includes(P)) WORLD_POVO.push(P);
  const z = WORLD_ZONES[P.zona];
  if (!z.npcs.some((n) => n.persona === P)) z.npcs.push({ model: P.model, variant: P.variant || 0, name: P.nome, at: P.at, facing: P.facing || 0, lines: P.ola, persona: P });
}

// Missões dos prédios do bairro (Fase 3 da expansão): a taverna, a hospedaria, o conselho e o quartel
WORLD_AVENTURAS.push(
  { id: 'aur_ensopado', reg: 'nexus', nome: 'O Ensopado do Javali Dourado', doador: 'aur_bento', nivel: 3,
    desc: 'O caldeirão do Bento está quase vazio: falta carne de fera e erva para o ensopado da semana.',
    ini: 'Três couros com carne ainda presa e quatro ervas luminosas. Traz isso e o ensopado sai — e o seu prato fica pela metade do preço. Palavra de taverneiro.',
    passos: [{ t: 'entregar', npc: 'aur_bento', mat: { couro: 3, erva: 4 }, fim: true, txt: 'Leve 3 Couros e 4 Ervas Luminosas ao Bento, na taverna' }],
    fim: 'Isso! Cheiro de ensopado de verdade. A partir de hoje o seu prato sai pela metade do preço. E leva um chá para a estrada.',
    rec: { xp: 300, cel: 40, rep: 60, cons: { cha: 2 } } },
  { id: 'aur_hospede', reg: 'nexus', nome: 'O Hóspede Encapuzado', doador: 'aur_rosa', nivel: 6, regioes: ['carmesin'],
    desc: 'Rosa desconfia do viajante encapuzado: ele paga em núcleos do NEXUS e não dorme sem olhar a porta.',
    ini: 'Não quero confusão na Chama. Converse com ele, descubra o que carrega. Se for perigo, quero saber antes do conselho.',
    passos: [
      { t: 'falar', npc: 'aur_viajante', opcao: 'perguntar o que ele esconde', txt: 'Converse com o viajante encapuzado (hospedaria de manhã e à noite; de dia, no banco do poço)',
        fala: 'Eu era técnico do NEXUS. Fugi com um núcleo de memória: os nomes de quem eles apagaram. Escondi nas Galerias de Serviço, mas um caçador me seguiu até lá.' },
      { t: 'examinar', zona: 'galerias', nome: 'Rastro do caçador', txt: 'Siga o rastro do caçador nas Galerias de Serviço', pistas: [
        { at: [0.18, 0.7], txt: 'Pegadas de bota com sola de aço. Pesadas demais para um sobrevivente.' },
        { at: [0.55, 0.15], txt: 'Um marcador do NEXUS colado na parede: "ALVO: DESERTOR 0447".' },
        { at: [0.86, 0.45], txt: 'O esconderijo foi revirado. O núcleo não está aqui — o caçador ainda está.' }] },
      { t: 'chefe', zona: 'galerias', at: [0.8, 0.8], chefe: { tipo: 'cacador', nome: 'CAÇADOR DO NEXUS', hp: 2.6, escolta: { drone: 2 } }, txt: 'Derrote o caçador do NEXUS nas Galerias de Serviço' },
      { t: 'falar', npc: 'aur_viajante', fim: true, txt: 'Leve o núcleo de memória de volta ao viajante' }],
    fim: 'Os nomes estão aqui. Todos. Obrigado — a Aurora vai lembrar deles.',
    escolha: { txt: 'O que eu faço com o núcleo? Fico com ele ou entrego ao conselho?', opcoes: [
      { txt: 'Entregue ao conselho. A cidade precisa saber.', fim: 'Você tem razão. A Conselheira Helena vai guardar melhor do que eu.', rec: { rep: 120, cel: 60 } },
      { txt: 'Guarde. É a sua história.', fim: 'Então eu levo comigo. E isto aqui é seu: foi o que sobrou do meu pagamento.', rec: { rel: { min: 2, sorte: 0.3 }, cel: 30 } }] },
    rec: { xp: 700, cel: 70, rep: 60 } },
  { id: 'aur_selo', reg: 'nexus', nome: 'Selo do Conselho', doador: 'aur_helena', nivel: 4,
    desc: 'A Conselheira Helena precisa que o novo selo das expedições seja visto pela Guilda e pela guarda antes de valer.',
    ini: 'Leve o selo à Mestra Veridiana, na Guilda, e depois à Capitã Irene, no quartel. Sem as duas, é só cera bonita.',
    passos: [
      { t: 'falar', npc: 'aur_veridiana', opcao: 'mostrar o selo do conselho', txt: 'Mostre o selo à Mestra Veridiana, na praça da Aurora',
        fala: 'Hm. Bonito, firme. A Guilda reconhece. Vai, a capitã é mais chata que eu.' },
      { t: 'falar', npc: 'aur_irene', opcao: 'mostrar o selo do conselho', txt: 'Mostre o selo à Capitã Irene, no quartel do bairro',
        fala: 'Selo do conselho, aprovado pela Guilda. A guarda reconhece. Diga à Helena que a ronda da muralha cumpre.' },
      { t: 'falar', npc: 'aur_helena', fim: true, txt: 'Volte à Conselheira Helena, no conselho' }],
    fim: 'Guilda e guarda de acordo. É assim que uma cidade funciona: devagar, mas junta.',
    rec: { xp: 380, cel: 50, rep: 80, cons: { retorno: 1 } } },
  { id: 'aur_recruta', reg: 'nexus', nome: 'Recruta da Muralha', doador: 'aur_irene', nivel: 5, regioes: ['carmesin'],
    desc: 'A Capitã Irene só confia em quem já enfrentou as máquinas lá fora. O Soldado Pedro quer saber como é.',
    ini: 'Dez máquinas abatidas nas Ruínas de Carmesin. Depois conte ao Pedro como foi — ele precisa ouvir de alguém que voltou.',
    passos: [
      { t: 'matar', n: 10, reg: 'carmesin', txt: 'Derrote 10 inimigos nas Ruínas de Carmesin' },
      { t: 'falar', npc: 'aur_pedro', opcao: 'contar como foi lá fora', txt: 'Conte ao Soldado Pedro como foi (no quartel de dia; à noite, na taverna)',
        fala: 'Dez?! E voltou andando? Tá, eu vou treinar mais. Muito mais.' },
      { t: 'falar', npc: 'aur_irene', fim: true, txt: 'Volte à Capitã Irene' }],
    fim: 'O Pedro treinou o dobro hoje. Isso vale mais que as dez máquinas. Bem-vindo à muralha.',
    rec: { xp: 520, cel: 60, rep: 90, rel: { min: 2 } } },
);
