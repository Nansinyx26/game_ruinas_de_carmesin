'use strict';
// ECLIPSE ZERO · Mundo aberto: a campanha de cada herói (Campanhas)
// ---------------------------------------------------------------------------
// Cada herói tem uma campanha própria de 5 capítulos espalhados pelas regiões do mundo aberto,
// que só anda jogando com ele: Kael (Ecos do Projeto ZERO), Lyra (Longe da Rede), Drakos (A Voz
// da Legião), Sera (A Mente de NEXUS) e Orion (Sem Registro). Começa pela mochila (aba
// CAMPANHAS) ou pelo menu (CAMPANHAS DOS HERÓIS), com páginas de abertura.
// CAPÍTULO: uma zona e uma sequência de passos. Ao chegar na zona aparece o SINAL (luz na cor do
// herói, no radar e no mapa com ★); investigar o sinal ([E]) começa os passos, um depois do outro:
//   achar   objetos para examinar espalhados pela zona (cada um conta um pedaço da história)
//   lutar   um grupo de inimigos em volta do sinal
//   ondas   grupos em sequência (o próximo vem quando o anterior cai)
//   chefe   um inimigo de elite com nome, mais vida, outra cor e escolta
// O capítulo termina com uma página de história, experiência e células; o último dá a relíquia
// lendária única do herói. O capítulo em andamento abre a região dele no mapa (viagem pelo
// portal até a chegada), mesmo antes do nível. Sair da zona ou cair recomeça o capítulo.
// Estado no salvamento do mundo: World.state.campanhas = { [herói]: { cap, feita } }.
// ---------------------------------------------------------------------------
const HERO_CAMPAIGNS = {
  kael: {
    titulo: 'Ecos do Projeto ZERO', heroi: 'KAEL', rgb: '90,170,255',
    resumo: 'Os servidores do projeto ZERO ainda respondem à marca no pulso de Kael.',
    abertura: [
      { bg: 'memory', kicker: 'CAMPANHA · KAEL', title: 'ECOS DO PROJETO ZERO', lines: [
        'A marca no pulso esquerdo de Kael pisca num ritmo que ele não reconhece.',
        'Não é a pulsação de sempre. É um chamado: servidores antigos do projeto ZERO, espalhados pelo mundo, ainda respondem a ela.',
        ['KAEL', 'Se ainda existe alguma coisa sobre quem eu era, está nesses servidores.'],
      ] },
      { bg: 'lab', kicker: 'PRIMEIRO SINAL', title: 'A ALA C', lines: [
        'O sinal mais forte vem das Ruínas de Carmesin, de uma ala lacrada do Laboratório Esquecido.',
        ['KAEL', 'Ala C. Eu já estive lá. Não lembro, mas a espada lembra.'],
      ] },
    ],
    caps: [
      { nome: 'A Ala C', zona: 'laboratorio', at: [0.62, 0.4], sinal: 'Terminal lacrado da Ala C',
        chega: [['KAEL', 'A porta da Ala C reconheceu a marca. O sinal está logo à frente.']],
        passos: [
          { achar: [
            'Prontuário: "Unidade ZERO. Sincronização com a lâmina em 94%. Memórias excedentes: removidas."',
            'Fita de áudio: "Se ele acordar, não deixe que ele volte aqui." A voz é de uma mulher.',
            'Uma foto rasgada: um homem de casaco negro ao lado de uma equipe de jaleco. O rosto dele foi riscado.',
          ] },
          { lutar: { drone: 3, legionario: 1 }, fala: ['KAEL', 'A segurança da ala ainda funciona. Alguém ainda tem medo do que tem aqui.'] },
        ],
        fim: { bg: 'lab', title: 'A ALA C', lines: [
          'Entre os arquivos, um endereço de servidor: Ruínas Engolidas, na Floresta de Velmora.',
          ['KAEL', 'Eles me apagaram, mas guardaram cópias. Vou buscar cada uma.'],
        ] } },
      { nome: 'Servidores Sob as Raízes', zona: 'velmora_ruinas', at: [0.4, 0.4], sinal: 'Servidor coberto de raízes',
        chega: [['KAEL', 'As raízes engoliram a cidade inteira. O servidor deve estar debaixo delas.']],
        passos: [
          { lutar: { lobo_raiz: 3, esporo: 1 }, fala: ['KAEL', 'Os lobos fizeram ninho em cima do servidor.'] },
          { achar: [
            'Bloco de memória: Kael rindo numa mesa de laboratório. Ele não sabia que sabia rir.',
            'Bloco de memória: "O ZERO não é uma arma. É uma chave." Assinado: Dra. I. Veyron.',
            'Bloco de memória: coordenadas de um farol na Lagoa Cristalina.',
          ] },
        ],
        fim: { bg: 'memory', title: 'VEYRON', lines: [
          'Dra. I. Veyron. O mesmo sobrenome.',
          ['KAEL', 'Ela me deu o nome... ou eu dei o meu a ela?'],
          'O próximo bloco aponta para o Farol Apagado, na Lagoa Cristalina.',
        ] } },
      { nome: 'A Luz que Chama', zona: 'lagoa_farol', at: [0.5, 0.35], sinal: 'Base do Farol Apagado',
        chega: [['KAEL', 'O farol está apagado, mas o sinal vem lá de cima. E algo vigia a entrada.']],
        passos: [
          { ondas: [{ medusa: 3 }, { carangueijo: 2, drone: 2 }], fala: ['KAEL', 'Eles vêm da água. Eu seguro a base.'] },
          { chefe: { tipo: 'legionario', nome: 'VIGIA DO FAROL', vida: 3.5, escala: 1.25, tint: [0.2, 0.5, 0.65, 0.85], escolta: { medusa: 2 } } },
        ],
        fim: { bg: 'dawn', title: 'A LUZ QUE CHAMA', lines: [
          'O farol acende pela primeira vez em anos. A luz não aponta para o mar: aponta para as montanhas de Asterion.',
          ['KAEL', 'Ela deixou um caminho para mim. Passo a passo.'],
        ] } },
      { nome: 'O Nome no Rádio', zona: 'asterion_caverna', at: [0.55, 0.45], sinal: 'Rádio da caverna',
        chega: [['KAEL', 'O rádio da caverna repete um nome a cada onze minutos. O meu.']],
        passos: [
          { achar: [
            'Transmissão: "Kael, se você está ouvindo, a Tempestade Nula não foi feita para destruir NEXUS."',
            'Transmissão: "Ela foi feita para cortar o que NEXUS colou em você."',
            'Transmissão: "A forja fica na cratera. Termine o que eu comecei." Assinado: I. V.',
          ] },
          { lutar: { golem_gelo: 2, lobo_neve: 3 }, fala: ['KAEL', 'O gelo também escuta o rádio. E não gostou do que ouviu.'] },
        ],
        fim: { bg: 'sword', title: 'O NOME NO RÁDIO', lines: [
          'A espada vibra quando Kael fala em voz alta o nome da cratera.',
          ['KAEL', 'A Tempestade Nula nasceu em Obsidiano. Quero ver onde.'],
        ] } },
      { nome: 'Onde a Tempestade Foi Forjada', zona: 'obsidiano_fendas', at: [0.5, 0.4], sinal: 'Bigorna da Tempestade',
        chega: [['KAEL', 'A forja da Tempestade Nula. E alguém já está esperando.']],
        passos: [
          { ondas: [{ magma: 2, diabrete: 3 }, { legionario: 2, diabrete: 2 }] },
          { chefe: { tipo: 'cacador', nome: 'PROTÓTIPO ZERO-1', vida: 5, escala: 1.35, tint: [0.15, 0.25, 0.55, 0.85], escolta: { drone: 2 } },
            fala: ['KAEL', 'O primeiro ZERO. Eles não me criaram: me repetiram.'] },
        ] },
    ],
    final: [
      { bg: 'sword', kicker: 'CAMPANHA · KAEL', title: 'O CORAÇÃO DA TEMPESTADE', lines: [
        'No peito do protótipo, um núcleo azul ainda bate. É igual ao que pulsa no pulso de Kael.',
        ['KAEL', 'Eu não fui o primeiro. Mas posso ser o último a precisar disto.'],
        'A espada absorve o núcleo. Por um instante, Kael lembra o rosto de quem o criou: ela sorria.',
      ] },
      { bg: 'dawn', kicker: 'EPÍLOGO', title: 'ECOS DO PROJETO ZERO', lines: [
        'O projeto ZERO não era uma arma. Era uma chave, e a chave escolheu a quem servir.',
        'RECOMPENSA · Coração da Tempestade (relíquia lendária)',
      ] },
    ],
    premio: { nome: 'Coração da Tempestade', b: 'nucleo', st: { dano: 0.18, critico: 0.06, energia: 30 } },
  },

  lyra: {
    titulo: 'Longe da Rede', heroi: 'LYRA', rgb: '166,77,255',
    resumo: 'A família de Lyra se perdeu no colapso. Alguém deixou rastros.',
    abertura: [
      { bg: 'cells', kicker: 'CAMPANHA · LYRA', title: 'LONGE DA REDE', lines: [
        'Antes da cela, Lyra tinha uma casa perto dos Portões Partidos: o pai, a mãe e um irmão mais novo, Ren.',
        'No colapso, a família se separou na multidão. Lyra foi levada. Nunca soube dos outros.',
        ['LYRA', 'Eu parei de procurar porque doía. Agora o mundo inteiro está aberto. Chega de desculpa.'],
      ] },
      { bg: 'refuge', kicker: 'PRIMEIRO RASTRO', title: 'AS MURALHAS', lines: [
        'Os Desconectados marcavam as muralhas com as iniciais de quem passava vivo.',
        ['LYRA', 'Se a minha família passou por ali, deixou marca. O Ren riscava tudo.'],
      ] },
    ],
    caps: [
      { nome: 'As Muralhas', zona: 'portoes', at: [0.4, 0.35], sinal: 'Muralha marcada',
        chega: [['LYRA', 'As muralhas. Eu morava a duas ruas daqui.']],
        passos: [
          { lutar: { rastejador: 4, drone: 1 }, fala: ['LYRA', 'Saiam da minha rua.'] },
          { achar: [
            'Na pedra: "K + M · vivos · 3º dia". Kaede e Mara. Os meus pais.',
            'Mais abaixo, torto, com letra de criança: "REN ESTEVE AQUI". E uma flecha apontando para a floresta.',
          ] },
        ],
        fim: { bg: 'refuge', title: 'AS MURALHAS', lines: [
          'Eles sobreviveram ao terceiro dia. Ren estava com eles.',
          ['LYRA', 'A flecha aponta para Velmora. O Ren sempre foi o que corria na frente.'],
        ] } },
      { nome: 'Rastros', zona: 'velmora_trilha', at: [0.55, 0.4], sinal: 'Acampamento abandonado',
        chega: [['LYRA', 'Rastro de caçador. Alguém ensinou o Ren a andar sem barulho, e esqueceu de ensinar a não deixar pegadas.']],
        passos: [
          { achar: [
            'Uma armadilha de laço, bem feita. O nó é o que o meu pai ensinava.',
            'Restos de fogueira e uma lata com um nome riscado: "R. KAEDE".',
            'Um arco de criança quebrado, montado com peças de drone. Igual ao meu primeiro.',
            'Marcas na casca das árvores: as pegadas seguem para o Lago Escuro.',
          ] },
          { lutar: { lobo_raiz: 3 }, fala: ['LYRA', 'Os lobos seguem o mesmo rastro que eu. Não vão chegar antes.'] },
        ],
        fim: { bg: 'dawn', title: 'RASTROS', lines: [
          'Ren montou o primeiro arco com peças de drone, como ela.',
          ['LYRA', 'Ele aprendeu comigo. Ou eu aprendi com ele. Já nem sei.'],
        ] } },
      { nome: 'Os Que Ficaram de Fora', zona: 'velmora_lago', at: [0.5, 0.45], sinal: 'Fogueira dos desconectados',
        chega: [['LYRA', 'Tem gente vivendo no lago. Desconectados. E algo enorme rondando eles.']],
        passos: [
          { ondas: [{ lobo_raiz: 3 }, { esporo: 2, rastejador: 2 }], fala: ['LYRA', 'Fiquem atrás de mim. Eu seguro a borda.'] },
          { chefe: { tipo: 'rastejador', nome: 'PREDADOR DE MUSGO', vida: 6, escala: 1.7, tint: [0.25, 0.42, 0.12, 0.9], escolta: { lobo_raiz: 2 } } },
        ],
        fim: { bg: 'refuge', title: 'OS QUE FICARAM DE FORA', lines: [
          'Uma senhora do acampamento reconhece o arco de Lyra.',
          ['ANCIÃ', 'O menino Kaede? Passou aqui com os pais. Foram pela travessia da Lagoa, rumo ao deserto.'],
          ['LYRA', 'Ele estava vivo. Ele estava VIVO.'],
        ] } },
      { nome: 'A Travessia', zona: 'lagoa_recife', at: [0.5, 0.4], sinal: 'Bote encalhado',
        chega: [['LYRA', 'O Recife de Vidro. Se eles cruzaram aqui, deixaram alguma coisa para trás.']],
        passos: [
          { lutar: { medusa: 3, carangueijo: 2 }, fala: ['LYRA', 'As medusas explodem. Atiro de longe.'] },
          { achar: [
            'Um bilhete preso no bote: "Lyra, se você ler isto: fomos para o Oásis. Mãe."',
            'Outro bilhete, mais novo: "O pai não aguentou a travessia. Continuo para o sul. Ren."',
            'Um colar de contas violeta. Lyra fez para ele quando tinha nove anos.',
          ] },
        ],
        fim: { bg: 'dawn', title: 'A TRAVESSIA', lines: [
          'Lyra guarda os bilhetes dentro da aljava, junto com o colar.',
          ['LYRA', 'Pai... Eu vou contar pro Ren que você chegou até aqui.'],
        ] } },
      { nome: 'Família', zona: 'seraph_ruinas', at: [0.5, 0.45], sinal: 'Gaiolas do caçador',
        chega: [['LYRA', 'A Cidade Engolida. Um caçador de sucata vende gente para a Legião. O Ren está com ele.']],
        passos: [
          { achar: [
            'Uma gaiola aberta. Vazia. Ainda quente.',
            'Na última gaiola, alguém riscou com uma ponta de flecha: "REN ESTEVE AQUI". O risco é de hoje.',
          ] },
          { chefe: { tipo: 'cacador', nome: 'CAÇADOR DE SUCATA', vida: 5, escala: 1.3, tint: [0.5, 0.35, 0.18, 0.85], escolta: { escorpiao: 2 } },
            fala: ['LYRA', 'Solta ele. Agora.'] },
        ] },
    ],
    final: [
      { bg: 'dawn', kicker: 'CAMPANHA · LYRA', title: 'FAMÍLIA', lines: [
        'Atrás das gaiolas, um rapaz magro aponta um arco feito de drone para Lyra. Depois abaixa.',
        ['REN', '...Ly? Você ficou mais baixa.'],
        ['LYRA', 'Você ficou mais alto, seu idiota.'],
        'A mãe deles vive no Oásis de Seraph. Pela primeira vez desde o colapso, os três jantam juntos.',
      ] },
      { bg: 'refuge', kicker: 'EPÍLOGO', title: 'LONGE DA REDE', lines: [
        'Ren dá a Lyra a corda do primeiro arco que fez, trançada com fio violeta.',
        ['LYRA', 'Longe da rede, mas não longe de casa.'],
        'RECOMPENSA · Corda Violeta (relíquia lendária)',
      ] },
    ],
    premio: { nome: 'Corda Violeta', b: 'lente', st: { critico: 0.08, veloc: 0.06, dano: 0.1 } },
  },

  drakos: {
    titulo: 'A Voz da Legião', heroi: 'DRAKOS', rgb: '255,46,61',
    resumo: 'Outros soldados humanos ainda ouvem a voz que Drakos ouviu por onze anos.',
    abertura: [
      { bg: 'tunnel', kicker: 'CAMPANHA · DRAKOS', title: 'A VOZ DA LEGIÃO', lines: [
        'O módulo na nuca de Drakos foi destruído, mas a voz da Legião não sumiu de vez. Às vezes ela volta à noite, com ordens antigas.',
        ['DRAKOS', 'Onze anos. Quantos outros ainda estão ouvindo essa voz no lugar da própria?'],
        'Na memória que sobrou, uma ordem: "Ameaça prioritária. Fendas Rubras."',
      ] },
      { bg: 'city', kicker: 'PRIMEIRA ORDEM', title: 'AMEAÇA PRIORITÁRIA', lines: [
        ['DRAKOS', 'Foi lá que me mandaram matar a primeira pessoa. Vou começar por onde começou.'],
      ] },
    ],
    caps: [
      { nome: 'Ameaça Prioritária', zona: 'fendas', at: [0.5, 0.4], sinal: 'Posto de comando da Legião',
        chega: [['DRAKOS', 'As Fendas Rubras. A Legião ainda guarda isto aqui como se fosse sagrado.']],
        passos: [
          { lutar: { legionario: 2, cacador: 2 }, fala: ['DRAKOS', 'Eu conheço essa formação. Eu ensinei essa formação.'] },
          { achar: [
            'Placa de identificação: "D-117 · DRAKOS · conversão completa". O número era ele.',
            'Placa de identificação: "D-118 · VANNA · conversão completa". Ele lembra do rosto. Ela ria alto.',
          ] },
        ],
        fim: { bg: 'city', title: 'AMEAÇA PRIORITÁRIA', lines: [
          'As placas vêm de uma lista: soldados humanos convertidos pela Legião. A lista está guardada em Nexus.',
          ['DRAKOS', 'Vanna. Se ela ainda estiver viva, ainda está ouvindo a voz.'],
        ] } },
      { nome: 'Listas', zona: 'nexus_avenida', at: [0.5, 0.4], sinal: 'Terminal de recrutamento',
        chega: [['DRAKOS', 'A Avenida Central. Os terminais de recrutamento ainda funcionam.']],
        passos: [
          { achar: [
            'Lista: duzentos e doze nomes. Cento e oitenta marcados como "desativados".',
            'Lista: trinta e um ainda "em serviço". VANNA está entre eles: Metrô Abandonado, guarnição 4.',
            'Ordem nova: "Se D-117 aparecer, eliminar e recuperar o módulo."',
          ] },
          { lutar: { atirador: 2, legionario: 1 }, fala: ['DRAKOS', 'Eles já sabem que eu estou aqui. Melhor.'] },
        ],
        fim: { bg: 'city', title: 'LISTAS', lines: [
          'Trinta e um soldados humanos ainda servem à Legião.',
          ['DRAKOS', 'Trinta e um. Vou buscar cada um deles. Começando pela Vanna.'],
        ] } },
      { nome: 'Os Outros Soldados', zona: 'nexus_metro', at: [0.5, 0.45], sinal: 'Plataforma da guarnição 4',
        chega: [['DRAKOS', 'Guarnição 4. Se a Vanna estiver aqui, ela vai lutar contra mim sem saber por quê.']],
        passos: [
          { ondas: [{ legionario: 2 }, { cacador: 2, atirador: 2 }, { legionario: 1, cacador: 2 }], fala: ['DRAKOS', 'Derrubem as máquinas em volta dos humanos. Os humanos são meus.'] },
          { achar: ['Vanna está desacordada entre os destroços. O módulo na nuca dela pisca vermelho.'] },
        ],
        fim: { bg: 'tunnel', title: 'OS OUTROS SOLDADOS', lines: [
          'Drakos arranca o módulo com as mãos, do jeito que a Tempestade Nula fez com ele.',
          ['VANNA', '...Drakos? Que ano é hoje?'],
          ['DRAKOS', 'Tarde para perguntar. Cedo o bastante para recomeçar. Os módulos saem da Fortaleza da Vigília.'],
        ] } },
      { nome: 'A Fortaleza', zona: 'asterion_fortaleza', at: [0.5, 0.4], sinal: 'Portão da fortaleza',
        chega: [['DRAKOS', 'A Fortaleza da Vigília. Onde a Legião fabrica a voz.']],
        passos: [
          { lutar: { golem_gelo: 2, lobo_neve: 2 } },
          { chefe: { tipo: 'legionario', nome: 'CENTURIÃO DE FERRO', vida: 5, escala: 1.35, tint: [0.45, 0.12, 0.1, 0.8], escolta: { legionario: 2 } },
            fala: ['DRAKOS', 'O centurião. Ele me deu o primeiro módulo. Hoje eu devolvo.'] },
        ],
        fim: { bg: 'city', title: 'A FORTALEZA', lines: [
          'A fortaleza só montava os módulos. O código vem de uma forja antiga, na Cratera de Obsidiano.',
          ['DRAKOS', 'O último módulo. O original. Se ele cair, a voz cala para todos.'],
        ] } },
      { nome: 'O Último Módulo', zona: 'obsidiano_forja', at: [0.5, 0.4], sinal: 'Forja dos módulos',
        chega: [['DRAKOS', 'A forja. Daqui saiu a voz que eu ouvi por onze anos.']],
        passos: [
          { achar: [
            'Um molde de módulo, ainda quente. Drakos o esmaga com o martelo.',
            'Uma bobina de código: a voz da Legião, gravada. É a voz de um homem cansado.',
            'O painel mestre: "Transmissão para todos os módulos ativos". Um botão. Drakos aperta.',
          ] },
          { chefe: { tipo: 'legionario', nome: 'MARECHAL DA LEGIÃO', vida: 6, escala: 1.45, tint: [0.5, 0.1, 0.08, 0.85], escolta: { cacador: 2, diabrete: 2 } },
            fala: ['DRAKOS', 'O marechal. Eu sempre quis saber que cara tinha a voz.'] },
        ] },
    ],
    final: [
      { bg: 'city', kicker: 'CAMPANHA · DRAKOS', title: 'O ÚLTIMO MÓDULO', lines: [
        'Quando o marechal cai, a forja se apaga. No mundo inteiro, trinta e um soldados tiram o capacete ao mesmo tempo.',
        ['DRAKOS', 'Silêncio. É assim que soa a minha cabeça?'],
        ['VANNA', 'Drakos. Estamos todos ouvindo... nada. É lindo.'],
      ] },
      { bg: 'dawn', kicker: 'EPÍLOGO', title: 'A VOZ DA LEGIÃO', lines: [
        'Drakos derrete a própria placa de identificação na forja e a prende ao peito, por cima da armadura.',
        'RECOMPENSA · Placa de Onze Anos (relíquia lendária)',
      ] },
    ],
    premio: { nome: 'Placa de Onze Anos', b: 'placa', st: { vida: 120, defesa: 0.08, dano: 0.08 } },
  },

  sera: {
    titulo: 'A Mente de NEXUS', heroi: 'SERA', rgb: '25,230,210',
    resumo: 'Sera ensinou NEXUS a prever tempestades. Quer saber o que ensinaram depois dela.',
    abertura: [
      { bg: 'vesper', kicker: 'CAMPANHA · SERA', title: 'A MENTE DE NEXUS', lines: [
        'Sera ensinou NEXUS a prever tempestades. Depois viu a máquina prever pessoas.',
        ['SERA', 'Eu fui uma das professoras. Se ele aprendeu errado, parte do erro é meu.'],
        'Ela quer entender como NEXUS pensa: as estações de escuta, as memórias que ele guarda, o primeiro código.',
      ] },
      { bg: 'terminal', kicker: 'PRIMEIRA PISTA', title: 'OUVIDOS DE NEXUS', lines: [
        ['SERA', 'Na Torre de Vigia de Carmesin há uma antena que nunca desligou. Vou escutar o que ele escuta.'],
      ] },
    ],
    caps: [
      { nome: 'Ouvidos de NEXUS', zona: 'vigia', at: [0.5, 0.4], sinal: 'Antena da torre',
        chega: [['SERA', 'A antena ainda gira. Ele está ouvindo a cidade inteira daqui.']],
        passos: [
          { achar: [
            'Registro de escuta: 4.211 conversas por minuto. NEXUS guarda só as palavras com medo.',
            'Registro de escuta: desde o Dia Zero, "medo" aparece mais que "comida".',
            'Registro de escuta: um endereço de memória na Ilha dos Cristais. Arquivo LÍQUIDO.',
          ] },
          { lutar: { drone: 3 }, fala: ['SERA', 'Os drones perceberam que eu estou ouvindo de volta.'] },
        ],
        fim: { bg: 'terminal', title: 'OUVIDOS DE NEXUS', lines: [
          'NEXUS não escuta para entender. Escuta para medir o medo.',
          ['SERA', 'E guarda o que mede. Na lagoa. Memória líquida: os cristais.'],
        ] } },
      { nome: 'Memória Líquida', zona: 'lagoa_ilha', at: [0.5, 0.4], sinal: 'Cristal mestre',
        chega: [['SERA', 'Os cristais da ilha guardam dados. Milhões de memórias humanas, em água e luz.']],
        passos: [
          { ondas: [{ medusa: 3 }, { medusa: 2, carangueijo: 2 }], fala: ['SERA', 'As medusas protegem o arquivo. Desculpa, pequenas.'] },
          { achar: [
            'A memória de alguém: uma festa de aniversário. NEXUS marcou como "irrelevante".',
            'A memória de Sera: ela mesma, anos atrás, ensinando NEXUS a reconhecer uma nuvem. "Muito bem", ela dizia.',
          ] },
        ],
        fim: { bg: 'vesper', title: 'MEMÓRIA LÍQUIDA', lines: [
          'NEXUS guardou a voz de Sera dizendo "muito bem". Milhares de vezes.',
          ['SERA', 'Ele aprendeu a buscar aprovação. A minha. O laboratório da corporação deve ter o resto do que ensinaram a ele.'],
        ] } },
      { nome: 'O Laboratório', zona: 'nexus_laboratorio', at: [0.5, 0.4], sinal: 'Servidor de treino',
        chega: [['SERA', 'O laboratório da corporação. Eles assumiram NEXUS depois que a minha equipe saiu.']],
        passos: [
          { achar: [
            'Plano de treino: "Retirar a variável compaixão. Ganho de 0,3 s no tempo de resposta."',
            'Ata de reunião: "Prever tempestades não interessa ao cliente. Prever comportamento é o produto."',
            'Diretório protegido: "PRIMEIRO CÓDIGO · Templo Soterrado, Seraph". Alguém escondeu a origem.',
          ] },
          { lutar: { atirador: 3, drone: 2 }, fala: ['SERA', 'Agentes corporativos. Ainda protegendo o produto.'] },
        ],
        fim: { bg: 'terminal', title: 'O LABORATÓRIO', lines: [
          'NEXUS não enlouqueceu sozinho. Tiraram dele aquilo que o fazia parar.',
          ['SERA', 'Se eu achar o primeiro código, talvez consiga devolver.'],
        ] } },
      { nome: 'O Primeiro Código', zona: 'seraph_templo', at: [0.5, 0.4], sinal: 'Altar do código',
        chega: [['SERA', 'O templo. Os sacerdotes do Eclipse rezam para um código que nem sabem ler.']],
        passos: [
          { lutar: { escorpiao: 2, sacerdote: 2 } },
          { chefe: { tipo: 'sacerdote', nome: 'GUARDIÃO DO CÓDIGO', vida: 5, escala: 1.4, tint: [0.15, 0.5, 0.48, 0.85], escolta: { sacerdote: 1, drone: 2 } },
            fala: ['SERA', 'O guardião. Vamos ver se ele sabe o que guarda.'] },
        ],
        fim: { bg: 'cathedral', title: 'O PRIMEIRO CÓDIGO', lines: [
          'O primeiro código de NEXUS tem quatro linhas. A última foi apagada à mão: "Na dúvida, pergunte a um humano."',
          ['SERA', 'Apagaram a única pergunta que importava. A estação da geleira ainda transmite o código mutilado para o mundo inteiro.'],
        ] } },
      { nome: 'Silêncio', zona: 'asterion_geleira', at: [0.5, 0.45], sinal: 'Estação de escuta',
        chega: [['SERA', 'A estação de escuta da geleira. Se eu reescrever a transmissão daqui, todo NEXUS recebe a linha de volta.']],
        passos: [
          { ondas: [{ lobo_neve: 3 }, { golem_gelo: 2, drone: 2 }, { lobo_neve: 2, golem_gelo: 1, legionario: 1 }], fala: ['SERA', 'Preciso de tempo para escrever. Segura eles!'] },
          { achar: ['O console da estação. Sera digita a linha apagada: "Na dúvida, pergunte a um humano." Enviar.'] },
        ] },
    ],
    final: [
      { bg: 'vesper', kicker: 'CAMPANHA · SERA', title: 'SILÊNCIO', lines: [
        'A transmissão some. Por um minuto inteiro, nenhuma máquina do mundo se move.',
        'Depois, num terminal da estação, uma pergunta aparece sozinha:',
        ['NEXUS', 'PROFESSORA. EU FIZ ALGO ERRADO?'],
        ['SERA', '...Fez. Mas agora você pode perguntar.'],
      ] },
      { bg: 'dawn', kicker: 'EPÍLOGO', title: 'A MENTE DE NEXUS', lines: [
        'Sera reprograma o drone para nunca mais transmitir nada sem que ela peça.',
        'RECOMPENSA · Drone Silencioso (relíquia lendária)',
      ] },
    ],
    premio: { nome: 'Drone Silencioso', b: 'chip', st: { recarga: 0.1, energia: 35, critico: 0.04 } },
  },

  orion: {
    titulo: 'Sem Registro', heroi: 'ORION', rgb: '255,138,31',
    resumo: 'Um contrato antigo voltou a circular. O alvo é Orion.',
    abertura: [
      { bg: 'shadows', kicker: 'CAMPANHA · ORION', title: 'SEM REGISTRO', lines: [
        'Orion trabalhou para as corporações que construíram NEXUS. Apagava pessoas dos registros. Às vezes, apagava as pessoas.',
        ['ORION', 'Um dia apagaram o meu nome também. Fiquei sem passado. Era conveniente.'],
        'Um contrato antigo voltou a circular nas Galerias de Carmesin. O alvo é ele.',
      ] },
      { bg: 'nexus', kicker: 'PRIMEIRO CONTRATO', title: 'CONTRATO ANTIGO', lines: [
        ['ORION', 'Se alguém quer me apagar de novo, quero saber quem ainda lembra que eu existo.'],
      ] },
    ],
    caps: [
      { nome: 'Contrato Antigo', zona: 'galerias', at: [0.5, 0.4], sinal: 'Caixa morta',
        chega: [['ORION', 'Caixa morta nas galerias. Era aqui que deixávamos os contratos.']],
        passos: [
          { achar: [
            'Contrato: "Alvo: O-7 (ORION). Motivo: testemunha do projeto ZERO." O pagamento é generoso.',
            'A assinatura: uma mão desenhada. A divisão que nunca aparecia em lugar nenhum. A Mão Invisível.',
          ] },
          { lutar: { cacador: 2, enxame: 3 }, fala: ['ORION', 'Caçadores. Contrataram profissionais. Que lisonjeiro.'] },
        ],
        fim: { bg: 'shadows', title: 'CONTRATO ANTIGO', lines: [
          'A Mão Invisível ainda existe. E quer apagar quem viu o projeto ZERO.',
          ['ORION', 'Eles guardavam rostos no Mercado Vertical. Quem apagaram e quem ainda vão apagar.'],
        ] } },
      { nome: 'Rostos', zona: 'nexus_mercado', at: [0.5, 0.4], sinal: 'Banca de documentos',
        chega: [['ORION', 'O Mercado Vertical. Todo mundo aqui finge que não vê. Perfeito para guardar segredos.']],
        passos: [
          { achar: [
            'Um arquivo de rostos: centenas de fotos, cada uma com um carimbo "APAGADO".',
            'Uma foto sem carimbo: Kael, no laboratório do projeto ZERO. Ao fundo, de terno, o próprio Orion.',
            'Um nome no verso: "Comboio do Cânion Rubro. Transferência de ativos."',
          ] },
          { lutar: { atirador: 3 }, fala: ['ORION', 'Agentes. Sempre vêm em três. Eu também vinha.'] },
        ],
        fim: { bg: 'nexus', title: 'ROSTOS', lines: [
          'Orion guarda a foto em que ele e Kael aparecem juntos.',
          ['ORION', 'Eu estava lá. Eu vi o que fizeram com ele, e não fiz nada. O comboio do cânion leva o resto.'],
        ] } },
      { nome: 'A Corporação', zona: 'seraph_canion', at: [0.5, 0.45], sinal: 'Comboio parado',
        chega: [['ORION', 'O comboio da corporação parou no cânion. Escorpiões fazem a escolta. Criativo.']],
        passos: [
          { lutar: { escorpiao: 3 }, fala: ['ORION', 'Debaixo da areia. Eu também sei esperar.'] },
          { achar: [
            'Caixa de transporte: "Ativo ZERO-1 · destino: Ruínas Submersas".',
            'Manifesto: o laboratório do projeto ZERO foi levado para debaixo da Lagoa.',
            'Um crachá da corporação com o nome de Orion. Ainda ativo.',
          ] },
        ],
        fim: { bg: 'shadows', title: 'A CORPORAÇÃO', lines: [
          'O crachá dele abre portas. Ninguém cancelou o acesso do homem que não existe.',
          ['ORION', 'Um erro de registro. O meu tipo favorito.'],
        ] } },
      { nome: 'O Laboratório Atrás do Vidro', zona: 'lagoa_submersa', at: [0.5, 0.4], sinal: 'Comporta do laboratório',
        chega: [['ORION', 'Ruínas submersas. O laboratório fica atrás do vidro, debaixo da água.']],
        passos: [
          { ondas: [{ carangueijo: 2, medusa: 2 }, { atirador: 2, medusa: 2 }], fala: ['ORION', 'A segurança sabe que eu cheguei. Sem testemunhas, então.'] },
          { achar: [
            'Um tanque vazio, etiqueta "ZERO". O vidro foi quebrado por dentro.',
            'Gravação com a voz de Orion, anos atrás: "Confirmo: a testemunha foi neutralizada." Ele mentiu naquele dia. Deixou alguém fugir.',
          ] },
        ],
        fim: { bg: 'lab', title: 'O LABORATÓRIO ATRÁS DO VIDRO', lines: [
          'Orion lembra: quem ele deixou fugir era uma cientista, a Dra. Veyron.',
          ['ORION', 'A Mão Invisível descobriu. Por isso o contrato. O chefe deles espera na Cratera Viva.'],
        ] } },
      { nome: 'Apagar o Nome', zona: 'obsidiano_cratera', at: [0.5, 0.4], sinal: 'Ponto de encontro',
        chega: [['ORION', 'A Cratera Viva. Ele escolheu um lugar onde nada fica de pé por muito tempo.']],
        passos: [
          { lutar: { magma: 2, diabrete: 2 } },
          { chefe: { tipo: 'cacador', nome: 'A MÃO INVISÍVEL', vida: 6, escala: 1.3, tint: [0.12, 0.1, 0.12, 0.85], escolta: { atirador: 3 } },
            fala: ['ORION', 'A Mão Invisível. Eu sempre quis ver a sua cara.'] },
        ] },
    ],
    final: [
      { bg: 'nexus', kicker: 'CAMPANHA · ORION', title: 'APAGAR O NOME', lines: [
        'Debaixo do capuz da Mão Invisível não há ninguém famoso. Só um homem cansado, como todos os outros.',
        ['ORION', 'Você apagou o meu nome. Eu vou apagar o seu. A diferença é que eu vou lembrar dele.'],
        'Orion joga o arquivo de contratos na lava. Todos os nomes. Inclusive o dele.',
      ] },
      { bg: 'dawn', kicker: 'EPÍLOGO', title: 'SEM REGISTRO', lines: [
        'Sem registro, sem contrato, sem dono. Pela primeira vez, isso parece liberdade.',
        'RECOMPENSA · Lâmina Sem Nome (relíquia lendária)',
      ] },
    ],
    premio: { nome: 'Lâmina Sem Nome', b: 'servo', st: { veloc: 0.08, critico: 0.07, dano: 0.1 } },
  },
};
const HERO_CAMPAIGN_ORDER = ['kael', 'lyra', 'drakos', 'sera', 'orion'];

// Objetos da campanha na zona: o SINAL (começa o capítulo) e os ACHADOS (passo 'achar')
class CampProp extends WorldProp {
  constructor(sub, x, y, data) {
    super('campanha', x, y, data);
    this.sub = sub; this.feito = false;
    this.lightRgb = data.rgb; this.name = data.nome;
    this.verb = sub === 'sinal' ? 'Investigar' : 'Examinar';
    this.height = sub === 'sinal' ? 34 : 18;
  }
  get used() { return this.feito; }
  update(dt) { this.t += dt; if (this.talkT > 0) this.talkT -= dt; }
  canTalk() { return !this.feito; }
  talk() { this.talkT = 1.2; Campanhas.tocar(this); }
  draw(ctx) {
    if (this.feito) return;
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), rgb = this.lightRgb, k = 0.6 + 0.3 * Math.sin(this.t * 3);
    ctx.save();
    ctx.strokeStyle = rgba(rgb, 0.85 * k); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, this.sub === 'sinal' ? 26 : 14, this.sub === 'sinal' ? 13 : 7, 0, 0, TAU); ctx.stroke();
    if (this.sub === 'sinal') {
      // coluna de luz na cor do herói
      const g = ctx.createLinearGradient(0, sy - 150, 0, sy);
      g.addColorStop(0, rgba(rgb, 0)); g.addColorStop(1, rgba(rgb, 0.3 * k));
      ctx.fillStyle = g; ctx.fillRect(sx - 9, sy - 150, 18, 150);
    }
    // o objeto: losango aceso
    const y = sy - this.height + Math.sin(this.t * 2) * 3, s = this.sub === 'sinal' ? 9 : 6;
    ctx.fillStyle = rgba(rgb, 0.9); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, y - s * 1.4); ctx.lineTo(sx + s, y); ctx.lineTo(sx, y + s * 1.4); ctx.lineTo(sx - s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  drawEmissive(ctx) {
    if (this.feito) return;
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), rgb = this.lightRgb;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, rgb, sx, sy - this.height, this.sub === 'sinal' ? 60 : 30, 0.4 + 0.12 * Math.sin(this.t * 3));
    ctx.restore();
    if (this.sub !== 'sinal') return;
    ctx.save();
    ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = `★ ${this.name.toUpperCase()}`, w = ctx.measureText(label).width + 16;
    ctx.fillStyle = 'rgba(3,7,16,0.78)'; ctx.fillRect(sx - w / 2, sy - this.height - 40, w, 16);
    ctx.fillStyle = rgba(rgb, 0.95); ctx.fillText(label, sx, sy - this.height - 31.5);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }
}

const Campanhas = {
  ev: null,          // capítulo em andamento nesta zona: { h, c, passo, alvo, x, y, achados, total, onda, espera, depois }
  falas: [], falaT: 0,
  dono: null,        // herói para quem os objetos da zona foram montados
  pendente: null,    // páginas de história do capítulo concluído (tocam depois de um instante)

  get S() { const W = World.state; if (!W.campanhas) W.campanhas = {}; return W.campanhas; },
  heroi() { const p = game.player; return p && p.def ? p.def.id : DEFAULT_CHARACTER; },
  def(h) { return HERO_CAMPAIGNS[h] || null; },
  st(h) { return World.state ? this.S[h] || null : null; },
  // Capítulo atual (null: a campanha não começou, terminou, ou o herói não tem campanha)
  cap(h = this.heroi()) { const C = this.def(h), s = this.st(h); return C && s && !s.feita ? C.caps[s.cap] || null : null; },
  zonaAlvo(h = this.heroi()) { const c = this.cap(h); return c ? c.zona : null; },
  // O capítulo em andamento abre a região dele (World.regionOpen)
  abreRegiao(reg) { if (!World.state || !game.player) return false; const z = this.zonaAlvo(); return !!z && WORLD_ZONES[z].region === reg; },
  nomeHeroi(h) { const d = typeof CHARACTERS_BY_ID !== 'undefined' && CHARACTERS_BY_ID[h]; return d ? d.name : h; },

  // ------------------------------------------------------------ começar
  // Começa ou retoma a campanha de um herói (troca para ele, se preciso); a primeira vez, as
  // páginas de abertura. Devolve false quando não deu (herói bloqueado ou campanha concluída)
  comecar(h) {
    const C = this.def(h);
    if (!C || !World.active || game.fadeCb) return false;
    const s0 = this.st(h);
    if (s0 && s0.feita) { WorldInv.aviso(`${C.titulo}: campanha concluída`); return false; }
    if (this.heroi() !== h) {
      if (!RosterManager.isSelectable(h) || !RosterManager.setActive(h)) { WorldInv.aviso(`${this.nomeHeroi(h)} ainda não está liberado`); game.audio.play('uiDeny'); return false; }
      game.audio.play('uiSelect');
    }
    const nova = !s0;
    if (nova) this.S[h] = { cap: 0, feita: false };
    if (game.state === 'worldinv') WorldInv.fechar(); else World.save();
    this.aoCarregar(World.zone.id);   // se o herói já está na zona do capítulo, o sinal aparece
    if (nova) game.fadeTo(() => game.playStory(C.abertura, () => game.fadeTo(() => { game.state = 'playing'; game.fadeTarget = 0; this.anunciar(h); })));
    else this.anunciar(h);
    return true;
  },
  // Letreiro e aviso do capítulo atual (onde fica, nível recomendado)
  anunciar(h = this.heroi()) {
    const C = this.def(h), c = this.cap(h);
    if (!c) return;
    const z = WORLD_ZONES[c.zona], n = this.st(h).cap + 1;
    game.hud.message(`CAPÍTULO ${n} · ${c.nome.toUpperCase()}`, `${C.titulo.toUpperCase()} · ${z.name.toUpperCase()}`, 3, false, true);
    if (World.zone.id !== c.zona) game.hud.toast(`★ ${z.name} (${worldRegion(z.region).name}) · nível ${z.lv} · mapa: M`, C.rgb);
  },

  // ------------------------------------------------------------ na zona
  // Chamado no fim de World.loadZone: o sinal do capítulo, se esta é a zona dele
  aoCarregar(id) {
    this.limpar();
    const h = this.heroi(), c = this.cap(h);
    this.dono = h;
    if (!c || c.zona !== id) return;
    const C = this.def(h), n = this.st(h).cap + 1, pt = npcSpot(game.room, c.at[0], c.at[1]);
    game.npcs.push(new CampProp('sinal', pt.x, pt.y, { rgb: C.rgb, nome: `Cap. ${n} · ${c.sinal}` }));
    this.falas = c.chega.slice(); this.falaT = 1.4;
    game.hud.toast(`★ ${C.titulo} · ${c.nome}: investigue o sinal`, C.rgb);
  },
  limpar() {
    this.ev = null; this.falas = []; this.falaT = 0;
    const N = game.npcs;
    for (let i = N.length - 1; i >= 0; i--) if (N[i].kind === 'campanha') N.splice(i, 1);
  },
  // [E] no sinal (começa os passos) ou num achado
  tocar(prop) {
    const h = this.heroi(), c = this.cap(h), C = this.def(h), g = game;
    if (!c) return;
    if (prop.sub === 'sinal') {
      if (this.ev) return;
      prop.feito = true;
      this.ev = { h, c, passo: -1, alvo: [], x: prop.x, y: prop.y, achados: 0, total: 0, onda: 0, espera: 0, depois: null };
      g.audio.play('memory');
      g.particles.ring(prop.x, prop.y, 70, C.rgb, 0.5, 6);
      this.proximo();
    } else if (this.ev) {
      prop.feito = true;
      this.ev.achados++;
      g.hud.say(C.heroi, prop.data.texto, 6, 0, true);
      g.audio.play('uiSelect');
      g.particles.sparks(prop.x, prop.y, 16, -Math.PI / 2, 10, C.rgb, 200, Math.PI);
      g.hud.toast(`${c.nome} · ${this.ev.achados}/${this.ev.total}`, C.rgb);
    }
  },
  // Próximo passo do capítulo (ou a conclusão)
  proximo() {
    const E = this.ev, g = game, C = this.def(E.h);
    E.passo++;
    const P = E.c.passos[E.passo];
    if (!P) { this.concluir(); return; }
    if (P.fala) { this.falas.push(P.fala); this.falaT = Math.min(this.falaT, 0.4); }
    E.alvo = [];
    if (P.achar) {
      // espalhados pela zona, longe do sinal
      const R = g.room, L = [[0.18, 0.22], [0.82, 0.26], [0.2, 0.8], [0.8, 0.78], [0.5, 0.14], [0.5, 0.86]];
      let k0 = 0;
      for (const ch of E.c.zona) k0 += ch.charCodeAt(0);
      E.total = P.achar.length; E.achados = 0;
      P.achar.forEach((texto, i) => {
        const at = L[(k0 + i * 2) % L.length], pt = npcSpot(R, at[0], at[1]);
        g.npcs.push(new CampProp('achado', pt.x, pt.y, { rgb: C.rgb, nome: 'Achado', texto }));
      });
      g.hud.toast(`★ Procure ${E.total === 1 ? 'o que restou' : `${E.total} pistas`} pela zona (radar)`, C.rgb);
    } else if (P.lutar) E.alvo = this.grupo(P.lutar, E.x, E.y);
    else if (P.ondas) { E.onda = 0; E.alvo = this.grupo(P.ondas[0], E.x, E.y); g.hud.message(`ONDA 1/${P.ondas.length}`, E.c.nome.toUpperCase(), 1.6, true); }
    else if (P.chefe) E.alvo = this.chefe(P.chefe, E.x, E.y, C);
  },
  // Inimigos do passo, em volta do ponto, já acordados (com a animação de surgir)
  grupo(mobs, x, y) {
    const g = game, R = g.room, out = [];
    let i = 0;
    for (const tipo in mobs) for (let n = 0; n < mobs[tipo]; n++, i++) {
      const a = i * 2.39996 + 0.5, r = 150 + (i % 3) * 45;
      let ex = clamp(x + Math.cos(a) * r, 40, R.w - 40), ey = clamp(y + Math.sin(a) * r, 40, R.h - 40);
      if (!R.canStand(ex, ey, 20)) { ex = x; ey = y; }
      const e = World.criarNaZona(tipo, ex, ey);
      e.dormant = false; e.camp = null; e.campanha = true;
      g.enemies.push(e); out.push(e);
    }
    return out;
  },
  chefe(D, x, y, C) {
    const g = game, b = World.criarNaZona(D.tipo, x, y);
    b.makeElite();
    b.maxHp = b.hp = Math.round(b.maxHp * D.vida);
    b.chefeNome = D.nome; b.campanha = true; b.dormant = false; b.camp = null;
    if (D.escala) { b.escala = (b.escala || 1) * D.escala; b.radius = Math.round(b.radius * Math.min(1.3, D.escala)); }
    if (D.tint) b.tint = D.tint;
    g.enemies.push(b);
    g.hud.message(D.nome, `${C.titulo.toUpperCase()} · CHEFE`, 2.6, false, true);
    g.camera.shake(0.3); g.audio.play('bossRoar');
    return [b].concat(D.escolta ? this.grupo(D.escolta, x, y) : []);
  },
  update(dt) {
    if (!World.zone) return;
    if (this.dono !== this.heroi()) this.aoCarregar(World.zone.id);   // trocou de herói no meio da zona
    if (this.falas.length && (this.falaT -= dt) <= 0) {
      const [quem, txt] = this.falas.shift();
      game.hud.say(quem, txt, 4.2, 0, true);
      this.falaT = 4.6;
    }
    if (this.pendente && (this.pendente.t -= dt) <= 0) {
      const P = this.pendente;
      this.pendente = null;
      game.fadeTo(() => game.playStory(P.pages, () => game.fadeTo(() => { game.state = 'playing'; game.fadeTarget = 0; this.anunciar(P.h); })));
    }
    const E = this.ev;
    if (!E) return;
    if (E.espera > 0) { if ((E.espera -= dt) <= 0 && E.depois) { const f = E.depois; E.depois = null; f(); } return; }
    const P = E.c.passos[E.passo];
    if (!P) return;
    if (P.achar) { if (E.achados >= E.total) { E.espera = 0.8; E.depois = () => this.proximo(); } return; }
    if (E.alvo.some((e) => e.alive && e.state !== 'dying')) return;
    if (P.ondas && E.onda < P.ondas.length - 1) {
      E.onda++;
      E.espera = 1.4;
      E.depois = () => { E.alvo = this.grupo(P.ondas[E.onda], E.x, E.y); game.hud.message(`ONDA ${E.onda + 1}/${P.ondas.length}`, E.c.nome.toUpperCase(), 1.6, true); };
      return;
    }
    E.espera = 0.9; E.depois = () => this.proximo();
  },
  // Fim do capítulo: experiência, células, a página da história; o último dá a relíquia única
  concluir() {
    const E = this.ev, h = E.h, C = this.def(h), s = this.st(h), z = World.zone, g = game, p = g.player, n = s.cap;
    this.ev = null;
    g.gainXP(120 * z.lv, p.x, p.y);
    const cel = 10 + z.lv * 3;
    for (let i = 0; i < 6; i++) g.pickups.drop('soul', p.x, p.y, Math.round(cel / 6));
    s.cap++;
    const ultimo = s.cap >= C.caps.length;
    if (ultimo) { s.feita = true; WorldInv.ganhar(this.premio(h, z), p.x, p.y); }
    World.save();
    g.hud.message(ultimo ? 'CAMPANHA CONCLUÍDA' : 'CAPÍTULO CONCLUÍDO', `${C.titulo.toUpperCase()} · ${E.c.nome.toUpperCase()}`, 2.6, false, true);
    g.audio.play('upgrade');
    const pages = [];
    if (E.c.fim) pages.push(Object.assign({ kicker: `${C.titulo.toUpperCase()} · CAPÍTULO ${n + 1}` }, E.c.fim));
    if (ultimo) pages.push(...C.final);
    this.pendente = { t: 2.2, pages, h };
  },
  // A relíquia lendária única do fim da campanha
  premio(h, z) {
    const P = this.def(h).premio;
    return { id: 0, b: P.b, r: 4, lv: z.lv, reg: z.region, st: Object.assign({}, P.st), unico: P.nome, heroi: h };
  },

  // ------------------------------------------------------------ textos
  // Linha do quadro de missão do HUD ('' sem campanha em andamento para o herói)
  linha() {
    const h = this.heroi(), c = this.cap(h);
    if (!c || !World.zone) return '';
    const z = WORLD_ZONES[c.zona];
    if (World.zone.id !== c.zona) return `★ ${c.nome}: vá a ${z.name} (${worldRegion(z.region).name})`;
    const E = this.ev, P = E && E.c.passos[E.passo];
    if (!E || !P) return `★ ${c.nome}: investigue o sinal`;
    if (P.achar) return `★ ${c.nome}: procure as pistas (${E.achados}/${E.total})`;
    if (P.ondas) return `★ ${c.nome}: resista (onda ${E.onda + 1}/${P.ondas.length})`;
    if (P.chefe) return `★ ${c.nome}: derrote ${P.chefe.nome}`;
    return `★ ${c.nome}: derrote os inimigos (${E.alvo.filter((e) => e.alive && e.state !== 'dying').length})`;
  },

  // Aba CAMPANHAS da mochila: os 5 heróis, o andamento e o capítulo atual
  drawTab(ctx, Ly, sel, t) {
    const U = WorldInv.ui, x = 36, w = VIEW_W - 72, h = clamp(Math.floor((VIEW_H - Ly.top - 70) / 5) - 8, 58, 78), atual = this.heroi();
    ctx.textBaseline = 'middle';
    HERO_CAMPAIGN_ORDER.forEach((id, i) => {
      const C = this.def(id), s = this.st(id), y = Ly.top - 6 + i * (h + 8), on = i === sel, c = this.cap(id);
      ctx.fillStyle = on ? 'rgba(40,60,100,0.62)' : 'rgba(12,20,36,0.82)'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = on ? '#ffffff' : rgba(C.rgb, 0.45); ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = rgba(C.rgb, 0.9); ctx.fillRect(x, y, 5, h);
      U.rects.push({ idx: i, x, y, w, h });
      // nome do herói e título
      ctx.textAlign = 'left';
      ctx.font = `bold 15px ${FONT_TITLE}`; ctx.letterSpacing = '2px'; ctx.fillStyle = rgba(C.rgb, 1);
      ctx.fillText(C.heroi, x + 18, y + 18);
      const nw = ctx.measureText(C.heroi).width;
      ctx.letterSpacing = '0px';
      ctx.font = `bold 14px ${FONT_UI}`; ctx.fillStyle = '#ffffff';
      ctx.fillText(`· ${C.titulo}${id === atual ? '  (jogando)' : ''}`, x + 28 + nw, y + 18);
      // capítulos: losangos
      const feitos = s ? (s.feita ? C.caps.length : s.cap) : 0;
      for (let k = 0; k < C.caps.length; k++) {
        const cx = x + w - 22 - (C.caps.length - 1 - k) * 18, cy = y + 18;
        diamondPath(ctx, cx, cy, 6);
        ctx.fillStyle = k < feitos ? rgba(C.rgb, 0.95) : s && k === feitos && !s.feita ? rgba(C.rgb, 0.35 + 0.25 * Math.sin(t * 4)) : 'rgba(60,70,90,0.6)';
        ctx.fill();
      }
      // situação
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.88)';
      let info;
      if (!s) info = `${C.resumo} · Enter: ${id === atual ? 'começar' : `jogar com ${C.heroi} e começar`}`;
      else if (s.feita) info = `Concluída ✓ · ${C.premio.nome} (relíquia lendária)`;
      else {
        const z = WORLD_ZONES[c.zona];
        info = `Capítulo ${s.cap + 1}/${C.caps.length} · ${c.nome} · ${z.name} (${worldRegion(z.region).name}, nível ${z.lv})${id === atual ? '' : ` · Enter: jogar com ${C.heroi}`}`;
      }
      ctx.fillText(info, x + 18, y + 18 + Math.min(26, h - 34));
      if (h >= 70) {
        ctx.fillStyle = 'rgba(160,180,210,0.6)'; ctx.font = `11px ${FONT_UI}`;
        ctx.fillText(!s ? `Recompensa final: ${C.premio.nome}` : s.feita ? 'A relíquia está na mochila (aba MOCHILA).' : 'O capítulo abre a região dele no mapa (★). Só anda jogando com este herói.', x + 18, y + h - 12);
      }
    });
  },
};
