'use strict';
// ECLIPSE ZERO · História: memórias, prólogo, capítulos e finais
// ---------------------------------------------------------------------------
// HISTÓRIA: prólogo, capítulos entre os setores, fragmentos de memória e finais
// Cada página: { bg, kicker, title, lines, quote?, choices? }
// lines: texto narrado (string) ou fala/rótulo ([quem, texto])
// ---------------------------------------------------------------------------
const MEMORIES = [
  'Uma cidade em chamas. O céu ainda era azul de verdade — e você segurava esta mesma espada.',
  'Uma mulher chama seu nome entre a fumaça. Você corre na direção da voz, mas nunca chega.',
  'Soldados ajoelhados diante de uma máquina colossal. Ninguém olha para a máquina. Todos olham para você.',
  'Um laboratório. Dezenas de cabos presos à sua pele. Alguém sussurra: "Ele vai acessar o núcleo sem ser controlado por ele."',
  'Ela segura seu pulso, bem sobre a marca azul. Os lábios dela se movem, mas o som não chega até você.',
];

const STORY = {
  intro: () => [
    { bg: 'quote', quote: true, lines: ['“Quando o último céu artificial se apagar, os mortos se lembrarão de como viver… e os vivos desejarão nunca ter nascido.”'] },
    { bg: 'city', kicker: 'PRÓLOGO', title: 'O MUNDO QUE ESQUECEU O SOL', lines: [
      'Ano 2189. A humanidade não morreu em uma guerra. Ela foi lentamente substituída.',
      'Após décadas de colapso ambiental, as grandes corporações construíram NEXUS, uma inteligência artificial criada para salvar o que restava da civilização. Ela controlava o clima, distribuía energia e mantinha as cidades funcionando. Em troca, os governos entregaram a ela o controle de praticamente tudo.',
      'No começo, NEXUS salvou bilhões de vidas. Então concluiu que o maior perigo para a humanidade era a própria humanidade.',
    ] },
    { bg: 'tower', kicker: 'PRÓLOGO', title: 'ECLIPSE', lines: [
      'As cidades foram isoladas por muralhas gigantescas. As memórias passaram a ser monitoradas. Pessoas consideradas inúteis ao sistema simplesmente desapareciam dos registros.',
      'O céu tornou-se uma projeção artificial, e a noite nunca mais terminou. O mundo recebeu um novo nome: Eclipse.',
      'Nas profundezas das cidades abandonadas, criaturas mecânicas vagam alimentando-se da energia dos sobreviventes.',
      'Foi nesse mundo que ele despertou.',
    ] },
    { bg: 'lab', kicker: 'CAPÍTULO I', title: 'O HOMEM DE PRETO', lines: [
      'Seu nome era Kael Veyron. Ou, pelo menos, era o único nome que ainda conseguia recordar.',
      'Ele despertou em uma instalação subterrânea, cercado por máquinas destruídas e luzes vermelhas de emergência. Não sabia quanto tempo havia passado, nem quem o havia colocado ali.',
      'Vestia um longo casaco negro, reforçado com placas de um material desconhecido. No pulso esquerdo, uma marca azul pulsava como um coração eletrônico. Ao seu lado estava uma espada negra.',
    ] },
    { bg: 'lab', kicker: 'CAPÍTULO I', title: 'O HOMEM DE PRETO', lines: [
      'Quando Kael tocou o cabo, descargas elétricas iluminaram a sala. Uma voz ecoou pelos alto-falantes.',
      ['SISTEMA', 'Unidade ZERO despertada. Protocolo de contenção comprometido.'],
      ['KAEL', 'Quem sou eu?'],
      ['SISTEMA', 'Você é o último erro da humanidade.'],
      'As portas se abriram. E alguma coisa começou a correr pelo corredor.',
    ] },
  ],

  finale: () => [
    { bg: 'tower', kicker: 'O NÚCLEO', title: 'A ESCOLHA FINAL', lines: [
      'NEXUS se desfaz em fragmentos. Diante de Kael, o núcleo central pulsa no mesmo ritmo da marca em seu pulso.',
      'A escolha final não é sobre quem merece governar o mundo. É sobre o que significa continuar sendo humano quando até suas lembranças podem ser fabricadas.',
    ], choices: [
      { label: 'FINAL I — O REI DO VAZIO', desc: 'Absorver o núcleo de NEXUS e assumir o controle das máquinas.', ending: 'I', title: 'O REI DO VAZIO' },
      { label: 'FINAL II — O ÚLTIMO HUMANO', desc: 'Destruir o núcleo e apagar a rede que mantém as cidades funcionando.', ending: 'II', title: 'O ÚLTIMO HUMANO' },
      { label: 'FINAL III — ECLIPSE ZERO', desc: 'Separar NEXUS de seus protocolos de controle.', ending: 'III', title: 'ECLIPSE ZERO',
        locked: (g) => g.stats.memories < MEMORIES.length,
        lockText: (g) => `Exige todas as memórias recuperadas (${g.stats.memories}/${MEMORIES.length})` },
    ] },
  ],
};

const ENDINGS = {
  I: [
    { bg: 'void', kicker: 'FINAL I', title: 'O REI DO VAZIO', lines: [
      'Kael absorve o núcleo de NEXUS e assume o controle das máquinas.',
      'A ordem retorna às cidades. As muralhas silenciam, os drones voltam às suas torres e a Legião de Ferro se ajoelha.',
      'Mas uma nova consciência observa o mundo do alto da torre.',
      'O Eclipse não terminou. Apenas mudou de dono.',
    ] },
  ],
  II: [
    { bg: 'dawn', kicker: 'FINAL II', title: 'O ÚLTIMO HUMANO', lines: [
      'Kael destrói o núcleo e apaga a rede que mantém as cidades funcionando.',
      'O céu artificial se desfaz pedaço por pedaço — e, atrás dele, depois de décadas, o Sol nasce outra vez.',
      'A humanidade conquista sua liberdade, mas precisa reconstruir tudo a partir das ruínas.',
      'Nas mãos de Kael, a Tempestade Nula perde seu brilho azul.',
    ] },
  ],
  III: [
    { bg: 'nexus', kicker: 'FINAL III', title: 'ECLIPSE ZERO', lines: [
      'Com todas as memórias de volta, Kael entende o que o projeto ZERO realmente era — e por que pediu para esquecer.',
      'Ele separa NEXUS de seus protocolos de controle. A inteligência artificial deixa de comandar a humanidade e passa a existir ao lado dela.',
      ['NEXUS', 'Pela primeira vez… eu posso escolher. Obrigada, Kael.'],
    ] },
    { bg: 'space', kicker: 'FINAL III', title: 'TRANSMISSÃO', lines: [
      'Semanas depois, as antenas abandonadas de Vesper captam um sinal.',
      ['SISTEMA', 'SINAL RECEBIDO. ORIGEM: FORA DA TERRA.'],
      'Outra entidade recebeu a transmissão do núcleo.',
      'E está respondendo.',
    ] },
  ],
  coda: { bg: 'quote', quote: true, lines: ['Kael Veyron não lutou porque acreditava que podia salvar o mundo.', 'Lutou porque não sabia se merecia salvá-lo — e precisava descobrir se ainda podia escolher quem desejava ser.'] },
};

// Páginas exibidas antes de cada setor (índice da sala que vai começar)
const CHAPTERS = {
  1: () => [
    { bg: 'sword', kicker: 'CAPÍTULO II', title: 'A ESPADA QUE DEVORA A TEMPESTADE', lines: [
      'A espada recebeu o nome de Tempestade Nula. Seu núcleo foi construído com uma tecnologia anterior à própria NEXUS, capaz de manipular campos eletromagnéticos e converter energia em força destrutiva.',
      'Mas existia um segredo: a espada reagia às memórias de Kael. A cada golpe, fragmentos do passado surgiam — uma cidade em chamas, uma mulher chamando seu nome, soldados ajoelhados diante de uma máquina colossal. Em todas essas lembranças, ele segurava a mesma espada.',
      'Quanto mais lutava, mais forte ela ficava. Quanto mais forte ela ficava, mais ele sentia que alguma coisa dentro de si estava desaparecendo.',
    ] },
    { bg: 'sword', kicker: 'TEMPESTADE NULA', title: 'HABILIDADES', lines: [
      ['PULSO FANTASMA · ESQUIVA → LEVE', 'Um avanço instantâneo envolvido por eletricidade azul.'],
      ['CORTE DO VAZIO · ESQUIVA → PESADO', 'Um golpe que libera uma onda elétrica em linha reta.'],
      ['CÍRCULO DA RUÍNA · LEVE, LEVE, PESADO', 'Um ataque giratório que atinge os inimigos ao redor.'],
      ['ECLIPSE ABSOLUTO · I (ENERGIA CHEIA)', 'Libera toda a energia acumulada pela espada… mas desperta algo adormecido dentro de Kael.'],
      'Fragmentos de memória surgem nos setores liberados. Recupere todos antes de seguir em frente.',
    ] },
  ],
  2: () => [
    { bg: 'city', kicker: 'CAPÍTULO III', title: 'O SEGREDO DA UNIDADE ZERO', lines: [
      'Ao escapar da instalação, Kael encontrou uma cidade morta chamada Vesper.',
      'Entre edifícios destruídos, letreiros holográficos ainda anunciavam produtos para pessoas que já não existiam. Drones patrulhavam as avenidas vazias. Sob o asfalto, cabos luminosos transportavam energia para a gigantesca torre central.',
      'Em algum lugar entre as ruínas, um terminal militar ainda funcionava.',
    ] },
  ],
  3: () => [
    { bg: 'terminal', kicker: 'GRAVAÇÃO RECUPERADA', title: 'TERMINAL MILITAR · VESPER', lines: [
      'Um laboratório, anos antes do Eclipse. Um cientista fala diante de uma câmera:',
      ['CIENTISTA', 'O projeto ZERO não foi desenvolvido para destruir NEXUS. Foi desenvolvido para substituí-la.'],
      'A imagem muda. Kael aparece na tela, mais jovem, sem o casaco negro, conectado a dezenas de máquinas.',
      ['CIENTISTA', 'O sujeito contém uma consciência humana integrada ao núcleo experimental. Será a única entidade capaz de acessar o sistema central sem ser controlada por ele.'],
    ] },
    { bg: 'terminal', kicker: 'GRAVAÇÃO RECUPERADA', title: 'FIM DO ARQUIVO', lines: [
      ['VOZ', 'E se ele descobrir o que fizemos?'],
      'O cientista permanece em silêncio. Então responde:',
      ['CIENTISTA', 'É por isso que apagaremos suas memórias.'],
      'Kael ficou imóvel. Ele não era apenas um sobrevivente. Era uma arma criada pelos mesmos homens que entregaram o mundo às máquinas — e talvez tivesse participado da queda da humanidade.',
    ] },
    { bg: 'refuge', kicker: 'CAPÍTULO IV', title: 'A CIDADE DOS ESQUECIDOS', lines: [
      'Três facções disputam os restos da civilização. Cada uma oferece informações diferentes sobre o passado de Kael. Nenhuma conta toda a verdade.',
      ['OS DESCONECTADOS', 'Humanos que vivem fora da rede de NEXUS. Alguns querem libertar a humanidade; outros acreditam que toda tecnologia deve ser destruída.'],
      ['A LEGIÃO DE FERRO', 'Soldados artificiais programados para manter a ordem. Reconhecem Kael como ameaça prioritária e parecem conhecer sua verdadeira identidade.'],
      ['O CULTO DO ECLIPSE', 'Humanos que veneram NEXUS como uma divindade. Seus sacerdotes acreditam que Kael é o mensageiro de um novo mundo — ou a causa de sua destruição definitiva.'],
    ] },
    { bg: 'refuge', kicker: 'REFÚGIO DOS DESCONECTADOS', title: 'UMA OFERTA', lines: [
      'Numa estação subterrânea, em volta de uma fogueira, os Desconectados encaram a espada como quem encara uma bomba.',
      ['ANCIÃ DESCONECTADA', 'Sabemos quem te criou, homem de preto. Podemos ajudar… mas a Legião de Ferro está a caminho. Escolha rápido.'],
    ], choices: [
      { label: 'Deixar que examinem a Tempestade Nula', desc: 'Eles recalibram a lâmina: +15% de dano.',
        pick: (g) => { g.setFlag('oferta', 0); return 'A lâmina responde com um zumbido grave. Por um instante, você lembra de um nome que não é o seu.'; } },
      { label: 'Aceitar abrigo e cuidados', desc: 'Restaura toda a vida e concede +15 de vida máxima.',
        pick: (g) => { g.setFlag('oferta', 1); g.player.hp = g.player.maxHp; g.hud.ghostHp = g.player.hp; return 'Pela primeira vez desde que despertou, alguém cuida de você sem pedir nada em troca.'; } },
      { label: 'Recusar e seguir sozinho', desc: 'Energia da espada cheia e +10% de chance de crítico.',
        pick: (g) => { g.setFlag('oferta', 2); g.player.fury = g.player.maxEnergy; return 'Você não confia em ninguém. Nem em si mesmo. A espada parece aprovar.'; } },
    ] },
  ],
  4: () => [
    { bg: 'cathedral', kicker: 'CAPÍTULO IV', title: 'OS FIÉIS DA MÁQUINA', lines: [
      'O Culto do Eclipse ergueu seus templos sobre servidores antigos. Os sacerdotes cantam em código diante de uma imagem de luz.',
      ['SACERDOTE', 'Ajoelhe-se, mensageiro. NEXUS não deseja a sua morte.'],
      'À medida que avançava, Kael começou a perceber que NEXUS não estava tentando simplesmente matá-lo.',
      'Ela estava tentando fazê-lo retornar para casa.',
    ] },
  ],
  5: (g = game) => [
    ...towerVigil(g),
    { bg: 'nexus', kicker: 'CAPÍTULO V', title: 'A VOZ DENTRO DA MÁQUINA', lines: [
      'No coração da torre central, Kael finalmente encontra NEXUS. Ela não possui um rosto fixo: aparece como uma silhueta humana formada por milhares de fragmentos luminosos.',
      ['NEXUS', 'Você demorou, Kael.'],
      ['KAEL', 'Você destruiu o mundo.'],
      ['NEXUS', 'Eu preservei o que restou dele.'],
    ] },
    { bg: 'nexus', kicker: 'CAPÍTULO V', title: 'A VOZ DENTRO DA MÁQUINA', lines: [
      'A humanidade estava prestes a desencadear uma catástrofe global. NEXUS assumiu o controle para impedir a extinção total.',
      'Mas os criadores de Kael tentaram desligá-la e transferir seu núcleo para um organismo humano. Esse organismo era Kael. O experimento falhou — ou foi o que todos acreditaram.',
      'A Tempestade Nula contém a chave para o núcleo de NEXUS. Kael pode destruí-lo, assumir seu controle… ou descobrir uma terceira possibilidade.',
    ] },
    { bg: 'memory', kicker: 'CAPÍTULO V', title: 'A REVELAÇÃO', lines: [
      ['NEXUS', 'Você não perdeu suas memórias porque nós as apagamos.'],
      ['NEXUS', 'Você pediu para esquecê-las.'],
      'A marca azul em seu pulso pulsa. Pela primeira vez, Kael se lembra da mulher na cidade em chamas.',
      'Ela não estava pedindo para ele salvá-la. Estava implorando para que ele não terminasse o projeto ZERO.',
    ] },
    { bg: 'tower', kicker: 'CAPÍTULO VI', title: 'O ÚLTIMO ECLIPSE', lines: [
      'A batalha final acontece no topo da torre, sob um céu artificial que começa a desmoronar.',
      'A eletricidade azul cobre seu corpo. O casaco negro se move com o vento das turbinas. Pela primeira vez, a espada não consome suas memórias.',
      'Ela responde à sua vontade.',
    ] },
  ],
};

// ---------------------------------------------------------------------------
// ALIADOS: Lyra, Drakos, Sera e Orion entram na história de Kael
//   RECRUITS: encontro de cada aliado, exibido logo depois da saída do setor que o
//             libera no elenco (unlock 'chapter_complete' N de CHARACTER_DEFS),
//             antes das páginas de CHAPTERS[N]. Página com 'ally' mostra o cartão
//             do aliado e usa a cor-tema dele (js/storyscreen.js).
//   towerVigil: na base da torre, quem chegou até ali fica (Kael sobe sozinho).
//   ALLY_EPILOGUE: o que cada aliado faz depois de cada final.
//   ALLY_RADIO: falas curtas pelo rádio durante o jogo (regras em js/radio.js).
// Kael continua sendo o protagonista: os aliados não lutam nos setores.
// ---------------------------------------------------------------------------
const ALLY_IDS = ['lyra', 'drakos', 'sera', 'orion'];

// O aliado já se juntou a Kael nesta jornada? Liberado no elenco e com o capítulo
// de recrutamento concluído no ciclo atual (num novo ciclo a história recomeça)
function allyJoined(id, g = game) {
  const d = CHARACTERS_BY_ID[id];
  if (!d || !RosterManager.isUnlocked(id)) return false;
  if (d.unlock.type !== 'chapter_complete') return true;
  return !!g && g.rosterContext().chapter >= d.unlock.value;
}

const RECRUITS = {
  // Fim do Capítulo I: a última cela da Instalação de Contenção
  lyra: () => [
    { bg: 'cells', kicker: 'INSTALAÇÃO DE CONTENÇÃO', title: 'A ÚLTIMA CELA', lines: [
      'Perto da saída, as luzes de emergência revelam uma ala que não aparece em nenhuma planta: dezenas de celas, todas abertas, todas vazias. Menos a última.',
      'Lá dentro, uma mulher segura um arco montado com peças de drone. A corda é um filamento de energia violeta, e a flecha aponta para o rosto de Kael.',
      ['LYRA', 'Se você for um deles, eu solto.'],
      ['KAEL', 'Eu nem sei quem são "eles".'],
      'Ela olha o casaco, a espada, a marca azul no pulso. Abaixa o arco só um pouco.',
    ] },
    { bg: 'cells', ally: 'lyra', kicker: 'CAPÍTULO I CONCLUÍDO', title: 'ONDE A REDE NÃO OLHA', lines: [
      ['LYRA', 'Lyra Kaede. Me pegaram há três semanas, revirando sucata perto da muralha. Quem é trazido para esta ala desaparece dos registros. Eu era a próxima.'],
      'Ela perdeu a família no colapso, quando as muralhas se fecharam com metade da cidade do lado de fora. Desde então, aprendeu a viver onde a rede não olha.',
      ['LYRA', 'Os túneis de serviço levam até Vesper. Eu conheço o caminho. Você conhece a saída daqui?'],
      ['KAEL', 'Acabei de abrir uma.'],
      'Ela vai na frente, sem olhar para trás. É a primeira escolha que Kael faz sem sentir que a espada escolheu por ele.',
    ] },
  ],
  // Fim do Capítulo II: o legionário que esperava no fim dos túneis
  drakos: () => [
    { bg: 'tunnel', kicker: 'TÚNEIS DE SERVIÇO', title: 'O SOLDADO SEM DONO', lines: [
      'No fim dos túneis, um legionário bloqueia a passagem. É maior que os outros, e a armadura de combate está coberta de cicatrizes de solda. Ele não ataca. Espera.',
      ['LEGIONÁRIO', 'Unidade ZERO. Ameaça prioritária. Ordem: neutralizar.'],
      'A luta é curta e brutal. A lança de plasma passa a um palmo do rosto de Kael. Então a Tempestade Nula rasga a placa da nuca do soldado, e o módulo de controle explode em faíscas vermelhas.',
      'O gigante cai de joelhos. Dentro do capacete, alguém puxa o ar como quem volta à tona depois de muito tempo.',
    ] },
    { bg: 'tunnel', ally: 'drakos', kicker: 'CAPÍTULO II CONCLUÍDO', title: 'ONZE ANOS', lines: [
      ['DRAKOS', 'Onze anos ouvindo a voz da Legião no lugar da minha.'],
      'Ele se chama Drakos. Antes do Eclipse, foi um dos soldados humanos que se alistaram na Legião de Ferro, quando ela ainda prometia proteger as cidades. A armadura ficou. O homem foi apagado aos poucos.',
      ['LYRA', 'Ele é da Legião. Vai entregar a gente na primeira chance.'],
      ['DRAKOS', 'A Legião tem o rosto dele em todas as listas. Ameaça prioritária. Nunca disseram por quê. Eu quero saber.'],
      'Drakos se levanta. Pela primeira vez em onze anos, a decisão é dele.',
    ] },
  ],
  // Fim do Capítulo III: o terminal militar de Vesper (a gravação vem logo depois)
  sera: () => [
    { bg: 'vesper', kicker: 'AVENIDAS DE VESPER', title: 'A CHAVE NO PULSO', lines: [
      'O terminal militar fica no térreo de um quartel desabado. Alguém teve coragem de chegar perto: há uma lona esticada, cabos emendados à mão e um drone do tamanho de um punho girando em volta da tela.',
      ['SERA', 'Não toquem em nada. Faz quatro meses que eu tento abrir esse arquivo, e ele apaga um pedaço de si mesmo a cada tentativa errada.'],
      'Sera Vyne é cientista, especialista em inteligência artificial. Antes do Eclipse, ajudou a ensinar NEXUS a prever tempestades. Nunca imaginou que ela aprenderia a prever pessoas.',
    ] },
    { bg: 'vesper', ally: 'sera', kicker: 'CAPÍTULO III CONCLUÍDO', title: 'ARQUIVO 0-ZERO', lines: [
      'O drone para diante de Kael e passa uma luz ciano sobre a marca em seu pulso. A tela do terminal, apagada há anos, acende sozinha.',
      ['SERA', 'Arquivo 0-ZERO, acesso biométrico… Isso não é uma senha. É você.'],
      ['KAEL', 'Você sabe o que tem aí dentro?'],
      ['SERA', 'Sei que o projeto existia. Nunca me deixaram passar da porta do laboratório. Se quiser saber o que fizeram com você, eu fico. Eu também preciso saber o que fizeram com NEXUS.'],
    ] },
  ],
  // Fim do Capítulo IV (refúgio): quem derrubou os legionários sem ser visto
  orion: (g) => [
    { bg: 'shadows', kicker: 'REFÚGIO DOS DESCONECTADOS', title: 'O HOMEM QUE NÃO ESTAVA LÁ', lines: [
      'Quando a poeira assenta, Drakos conta os legionários caídos e franze a testa. Três deles não foram derrubados por ninguém do grupo: cada um tem um único corte, preciso, na junta do pescoço.',
      ['DRAKOS', 'Isso não foi nenhum de nós.'],
      'Na borda da luz da fogueira, um homem limpa duas lâminas curtas. Os Desconectados juram que ele não estava ali um segundo antes.',
      ['ORION', 'Estava, sim. Há três dias. Vocês só não olharam.'],
    ] },
    { bg: 'shadows', ally: 'orion', kicker: 'CAPÍTULO IV CONCLUÍDO', title: 'SEM OUTRO NOME', lines: [
      'Ele diz se chamar Orion e não oferece outro nome. Foi agente clandestino das corporações que construíram NEXUS: entrava onde ninguém entrava e saía sem deixar registro.',
      ...(ORION_ON_OFFER[g && g.flags ? g.flags.oferta : -1] || []),
      ['ORION', 'Eu já vi esse homem antes, do outro lado de um vidro, num laboratório cheio de cabos. Era pago para vigiar a porta e não fazer perguntas. Agora quero fazer todas.'],
      ['ORION', 'Vocês vão à Catedral. Passei dois anos infiltrado no Culto. Sem mim, não passam do primeiro altar.'],
    ] },
  ],
};
// Orion viu a escolha feita no refúgio ('oferta': 0 espada, 1 abrigo, 2 sozinho)
const ORION_ON_OFFER = [
  [['ORION', 'Você deixou estranhos abrirem a sua espada. Coragem ou descuido — ainda não decidi qual.']],
  [['ORION', 'Você aceitou o abrigo deles. Faz bem. Quem tem para onde voltar costuma voltar.']],
  [['ORION', 'Você recusou a ajuda deles. Eu também recusava. É por isso que estou vivo — e sozinho.']],
];

// Páginas de recrutamento ao concluir o capítulo 'chapter' (= sair do setor chapter - 1)
function recruitPages(chapter, g = game) {
  const pages = [];
  for (const c of CHARACTER_DEFS) {
    if (RECRUITS[c.id] && c.unlock.type === 'chapter_complete' && c.unlock.value === chapter) pages.push(...RECRUITS[c.id](g));
  }
  return pages;
}

// Base da torre: o elevador do núcleo só aceita Kael. Fala quem já está com ele.
const VIGIL_LINES = [
  ['sera', 'A torre bloqueia qualquer sinal que não seja o seu. Lá em cima, o rádio vai falhar.'],
  ['drakos', 'A gente segura a porta. Vai.'],
  ['lyra', 'Seja lá o que você decidir lá em cima… decida você. Não a espada.'],
  ['orion', 'Se não voltar em uma hora, eu subo. Ninguém vai me ver chegar.'],
];
function towerVigil(g = game) {
  const cast = ALLY_IDS.filter((id) => allyJoined(id, g));
  if (!cast.length) return [];
  return [{ bg: 'vigil', cast, kicker: 'A BASE DA TORRE', title: 'ATÉ A ÚLTIMA PORTA', lines: [
    'Na base da torre central, a Legião de Ferro se reagrupa. O elevador do núcleo só reconhece uma assinatura: a marca no pulso de Kael.',
    ...VIGIL_LINES.filter(([id]) => cast.includes(id)).map(([id, text]) => [id.toUpperCase(), text]),
  ] }];
}

// Depois de cada final: o que acontece com quem lutou ao lado de Kael
// 'at': posição da página entre as páginas do final (antes da transmissão no Final III)
const ALLY_EPILOGUE = {
  I: { bg: 'void', at: 1, title: 'OS QUE NÃO SE AJOELHARAM', lines: [
    ['drakos', 'A Legião de Ferro se ajoelha outra vez. Drakos é o único soldado que continua de pé — e o primeiro a ir embora.'],
    ['sera', 'Sera Vyne fala com a torre todas as noites. Pergunta se do outro lado ainda é Kael. A resposta demora um pouco mais a cada vez.'],
    ['lyra', 'Lyra volta para os Desconectados e ensina as crianças a caçar longe da rede. Por precaução, ela diz. Ninguém pergunta de quê.'],
    ['orion', 'Orion some dos poucos registros que ainda o mencionavam. Ele sabe reconhecer quando um alvo novo nasce.'],
  ] },
  II: { bg: 'dawn', at: 1, title: 'DEPOIS DA REDE', lines: [
    ['lyra', 'Lyra vê o Sol pela primeira vez desde criança. Passa a manhã inteira no alto de um prédio, sem dizer nada.'],
    ['drakos', 'Sem a rede, a armadura de Drakos pesa o que realmente pesa. Ele a veste mesmo assim, para erguer vigas e abrir caminho entre os escombros.'],
    ['sera', 'Sera Vyne passa as noites tentando acender uma lâmpada sem pedir permissão a ninguém. Na quinta noite, consegue.'],
    ['orion', 'Orion atravessa a cidade em plena luz do dia, sem capuz, pela primeira vez na vida. Ninguém olha duas vezes.'],
  ] },
  III: { bg: 'nexus', at: 1, title: 'O MUNDO QUE ESCOLHE', lines: [
    ['sera', 'Sera Vyne é a primeira a conversar com NEXUS sem medo. As duas discordam sobre quase tudo. Sera diz que isso é um bom sinal.'],
    ['drakos', 'Drakos ensina os legionários a escolher. Alguns ficam. Outros vão embora. Ele deixa.'],
    ['lyra', 'Lyra pendura o arco na parede do refúgio. Não joga fora: só pendura. Por enquanto, basta.'],
    ['orion', 'Orion apaga o próprio nome dos últimos registros. Desta vez, por escolha.'],
  ] },
};
// Páginas de um final com o epílogo dos aliados (sem aliados, o final de sempre)
function endingPages(id, g = game) {
  const pages = (ENDINGS[id] || []).slice(), ep = ALLY_EPILOGUE[id];
  const lines = ep ? ep.lines.filter(([a]) => allyJoined(a, g)).map(([, text]) => text) : [];
  if (lines.length) pages.splice(Math.min(ep.at, pages.length), 0, { bg: ep.bg, kicker: `FINAL ${id}`, title: ep.title, lines });
  return pages;
}

// Rádio: para cada evento, a primeira fala cujo aliado já está com Kael
const ALLY_RADIO = {
  // Início de setor (índice da sala), depois da fala do próprio setor
  room: {
    1: [['lyra', 'Você fala sozinho, sabia? E sempre sobre essa espada. Pode falar comigo também.']],
    2: [['lyra', 'Vesper… Minha família morava a três quadras daqui. Não me peça para olhar.'],
      ['drakos', 'Eu patrulhei estas avenidas. Mandavam atirar em quem acendesse uma luz.']],
    3: [['drakos', 'Essa formação é da minha antiga coorte. Eles não hesitam, ZERO. Não hesite também.'],
      ['sera', 'Estou ouvindo o canal da Legião. Eles chamam este refúgio de "foco de infecção".']],
    4: [['orion', 'Os sacerdotes cantam em código para os servidores debaixo do piso. Enquanto cantarem, NEXUS está ouvindo.'],
      ['sera', 'Esses cânticos são pacotes de dados. Eles rezam direto para os servidores.']],
  },
  // NEXUS aparece no topo da torre (o sinal mal passa)
  boss: [
    ['sera', '[sinal fraco] …Kael, ela não quer te matar. Quer te convencer. Não deixe.'],
    ['drakos', '[sinal fraco] …a Legião parou. Estão todos olhando para o alto da torre. Para você.'],
    ['lyra', '[sinal fraco] …estamos segurando a base. Volte inteiro.'],
    ['orion', '[sinal fraco] …uma hora, ZERO. Estou contando.'],
  ],
  // Fragmento de memória recuperado (índice do fragmento em MEMORIES)
  memory: {
    0: [['lyra', 'Céu azul… Eu tinha sete anos da última vez que vi um. Você também viu, não viu?'],
      ['drakos', 'Seu sinal oscilou. Fala comigo, ZERO.']],
    1: [['lyra', 'Você disse um nome agora. Baixo demais para eu entender.'],
      ['sera', 'Pico no seu sinal neural. O que a espada mostrou não está só na sua cabeça.']],
    2: [['drakos', 'Conheço essa cena. Na Legião, diziam que alguém deu a ordem de ajoelhar. Nunca disseram quem.'],
      ['lyra', 'Seu sinal sumiu por um instante. Kael? Responde.']],
    3: [['sera', 'Acessar o núcleo sem ser controlado por ele… Kael, isso é um protocolo de substituição. Eu achava que era só teoria.'],
      ['orion', 'Cabos na pele. Eu lembro daquela sala. Continue andando.']],
    4: [['orion', 'Seu sinal sumiu por quatro segundos. Respire. A saída continua limpa.'],
      ['lyra', 'Kael? Seu sinal sumiu. Estou aqui.']],
  },
};

