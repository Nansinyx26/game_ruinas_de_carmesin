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
  5: () => [
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

