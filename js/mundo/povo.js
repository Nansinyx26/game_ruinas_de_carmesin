'use strict';
// ECLIPSE ZERO · Mundo aberto: moradores com identidade, conversa, serviços e rotina (Povo)
// ---------------------------------------------------------------------------
// MORADORES: cada pessoa do mundo aberto tem nome, função, personalidade, saudações, assuntos
// (informações sobre a região, os monstros, os tesouros e o que aconteceu), rumores (alguns
// revelam no mapa uma masmorra, um tesouro escondido ou um lugar) e, quando faz sentido, um
// SERVIÇO: mercador (loja), curandeiro (cura e remédios), ferreiro (aprimoramento), artesão
// (receitas) ou treinador (treino diário, desafio, árvore). Os NPCs que já existiam nas zonas
// de chegada (mercadores e quem dá as missões da região) ganham a mesma conversa; os novos
// moram nas cidades, nos vilarejos (zonas com 'vila': sem acampamentos por perto) e em
// alguns cantos das regiões. Nem todo mundo tem missão.
// CONVERSA (Povo.conversar → Dialogo): saudação e as respostas possíveis — entregar ou aceitar
// missões (as da região, js/mundo/missoes.js, e as secundárias, js/mundo/aventuras.js),
// serviços, rumores, assuntos e despedida.
// ROTINA: alguns andam entre pontos durante o dia e voltam para casa à noite; param quando o
// herói chega perto e se encolhem se houver inimigos acordados por perto (aí não conversam).
// QUADRO DE CONTRATOS (zona de chegada de cada região): contratos diários de caça e coleta.
// O que o herói já sabe de cada pessoa fica em World.state.povo.
// ---------------------------------------------------------------------------
const WORLD_POVO = [
  // ------------------------------------------------------------ Ruínas de Carmesin
  { id: 'comerciante', chave: 'mercado:COMERCIANTE', papel: 'Mercador', personalidade: 'Esperto e simpático; fala de tudo como negócio.', servicos: ['loja'],
    ola: ['Células na mão, sorriso no rosto. O que vai ser hoje?', 'Voltou inteiro! Bom para mim: cliente vivo compra de novo.'],
    temas: [['O que você vende?', 'Relíquias que o pessoal arranca das ruínas, cápsulas, tônicos e material de oficina. E compro o que você trouxer — até sucata.'],
      ['Como anda o comércio?', 'Devagar. Desde o Dia Zero ninguém confia em ninguém. Mas célula é célula: essa ainda vale em qualquer lugar.']],
    rumores: [{ txt: 'Um carregador jura que achou uma escada descendo debaixo das Fendas Rubras. Disse que o ar sobe quente lá de baixo.', revela: { masmorra: 'catacumbas' } },
      { txt: 'Debaixo do letreiro caído dos Portões Partidos tem um cofre de pedágio. Ninguém levou porque ninguém lembra do código. Cofre velho abre no tranco.', revela: { tesouro: 'tes_portoes' } }] },
  { id: 'ancia', chave: 'mercado:ANCIÃ DESCONECTADA', papel: 'Guardiã das memórias', personalidade: 'Calma e enigmática; trata o herói como neto.',
    ola: ['Senta um pouco, menino. As ruínas esperam.', 'Eu sonhei com você de novo. No sonho você também não lembrava.'],
    temas: [['Quem são os Desconectados?', 'Os que o NEXUS não alcança. Arrancamos os implantes no Dia Zero, ou nascemos sem eles. Por isso ainda lembramos: a memória é a única coisa que ele não pode baixar.'],
      ['O que aconteceu com a cidade?', 'Às 03:12 o céu escureceu e todo mundo conectado parou no meio do passo. Quem acordou já não era gente. Quem não acordou… está nas ruas até hoje.'],
      ['E os monstros?', 'Rastejadores e drones são máquinas da limpeza; os legionários eram soldados. Os sacerdotes são piores: eles rezam para o NEXUS, e ele responde.']],
    rumores: [{ txt: 'Dizem que o Laboratório Esquecido ainda tem uma voz. Uma gravação que não sabe que o mundo acabou.', revela: { zona: 'laboratorio' } }] },
  { id: 'vanda', nome: 'VANDA', zona: 'mercado', at: [0.62, 0.72], model: 'civil', variant: 1, facing: 3.6, papel: 'Ferreira', servicos: ['ferreiro'],
    personalidade: 'Rabugenta e direta; respeita quem trabalha.',
    ola: ['Se veio conversar, conversa martelando. Tenho serviço.', 'Relíquia boa é relíquia aprimorada. O resto é enfeite.'],
    temas: [['Como funciona o aprimoramento?', 'Me traz a relíquia, sucata e células. Cada nível rende dez por cento a mais nos atributos, até o quinto. Do terceiro em diante quero núcleo de elite; no quinto, essência. Sem choro.'],
      ['De onde você veio?', 'Da Forja Antiga, na Cratera de Obsidiano. Fugi quando a Legião tomou a forja. Um dia eu volto e acendo aquilo de novo.']],
    rumores: [{ txt: 'Os forjadores da cratera fazem um selo que vale mais que esta oficina inteira. Só vendem para quem eles respeitam. Ganhe a confiança deles.' }] },
  { id: 'tomas', nome: 'TOMÁS', zona: 'mercado', at: [0.35, 0.72], model: 'civil', variant: 2, facing: 0.2, papel: 'Artesão e engenheiro', servicos: ['artesao'],
    personalidade: 'Curioso e acelerado; sempre com uma peça na mão.',
    ola: ['Ah, você! Segura isso aqui… não, deixa. O que manda?', 'Se tiver material, eu transformo em coisa útil. Se não tiver, eu falo até você ir buscar.'],
    temas: [['O que você sabe fazer?', 'Cápsulas de reparo, elixires, tônicos, pedras de retorno… e com núcleo e essência eu forjo uma relíquia de verdade. Quanto mais você cria, mais receitas eu te ensino.'],
      ['Onde acho material?', 'Sucata você arranca das máquinas que derruba e dos montes de ferro-velho. Erva em Velmora, cristal na Lagoa, gelo em Asterion, fragmento em Seraph, obsidiana na cratera. Núcleo, só de elite.']],
    rumores: [{ txt: 'Ouvi um sinal fraco vindo das Galerias de Serviço. Parece um rádio de criança. Alguém devia olhar isso.' }] },
  { id: 'helena', nome: 'HELENA', zona: 'mercado', at: [0.5, 0.2], model: 'ancia', facing: 1.6, papel: 'Curandeira', servicos: ['curandeiro'],
    personalidade: 'Gentil e cansada; cuida de todos sem perguntar nada.', rota: [[0.5, 0.2], [0.4, 0.28], [0.58, 0.3]], casa: [0.5, 0.18],
    ola: ['Deixa eu ver esse corte… sente aqui.', 'Você de novo. Ainda bem que é você, e ainda bem que está de pé.'],
    temas: [['O que você usa nos remédios?', 'Erva luminosa de Velmora, quando os caçadores trazem. Cristal da lagoa para os elixires. O resto é paciência.'],
      ['Tem muita gente ferida?', 'Menos do que antes. Desde que você começou a limpar as ruas, as pessoas voltaram a sair. Isso cura mais do que eu.']],
    rumores: [{ txt: 'A Marta, lá da Praça, não dorme há dois dias. O menino dela sumiu. Se puder, fale com ela.' }] },
  { id: 'rui', nome: 'CAPITÃO RUI', zona: 'mercado', at: [0.86, 0.56], model: 'civil', variant: 0, facing: 3.4, papel: 'Treinador', servicos: ['treinador'],
    personalidade: 'Ex-oficial da Legião; disciplinado e de poucas palavras.',
    ola: ['Postura. Respira. Agora fala.', 'Quem treina quando está calmo não treme quando a coisa aperta.'],
    temas: [['Você era da Legião?', 'Era. Até perceber que a ordem vinha de uma máquina. Tirei o implante com uma faca de cozinha. Não recomendo.'],
      ['Como fico mais forte?', 'Treino todo dia, uma sessão. O desafio da arena é para quando quiser apanhar de propósito. E se a árvore de habilidades estiver torta, eu te ajudo a refazer.']],
    rumores: [{ txt: 'Na Praça Carmesim os sacerdotes se juntam ao anoitecer. Não vá sozinho, e não vá cansado.' }] },
  { id: 'marta', nome: 'MARTA', zona: 'praca', at: [0.14, 0.62], model: 'civil', variant: 0, facing: 0.4, papel: 'Moradora da Praça', vila: true,
    personalidade: 'Aflita; não tira os olhos da avenida.', rota: [[0.14, 0.62], [0.2, 0.7], [0.12, 0.74]],
    ola: ['Você viu um menino? Desse tamanho, casaco vermelho…', 'Desculpa. Eu falo com todo mundo que passa. Alguém tem que ter visto.'],
    temas: [['Que lugar é este?', 'A Vila da Praça. Uns vinte de nós. A gente planta nas latas e reza para os sacerdotes não descerem a escadaria.']] },
  { id: 'nina', nome: 'NINA', zona: 'praca', at: [0.24, 0.72], model: 'civil', variant: 2, facing: 5.6, papel: 'Florista', vila: true,
    personalidade: 'Sonhadora; planta flores em latas de munição.',
    ola: ['Quer uma flor? Não vale nada, mas é bonita.', 'Antes isto era o mercado das flores. Eu estou só começando de novo.'],
    temas: [['Por que flores?', 'Porque a praça era vermelha de flor antes de ser vermelha de energia. Alguém precisa lembrar disso.']],
    rumores: [{ txt: 'Atrás do altar da Praça tem uma pedra solta. Meu avô escondia as economias ali. Ele não volta para buscar.', revela: { tesouro: 'tes_praca' } }] },
  { id: 'ivo', nome: 'DR. IVO', zona: 'laboratorio', at: [0.84, 0.78], model: 'cientista', facing: 3.8, papel: 'Gravação do Projeto ZERO',
    personalidade: 'Educado e meticuloso; preso nas 03:12 do Dia Zero.',
    ola: ['Bom dia. Ou boa noite? Meu relógio diz 03:12. Ele sempre diz 03:12.', 'Identificação, por favor… Ah. Você. O sujeito da ala C. Que alegria.'],
    temas: [['O que é o Projeto ZERO?', 'Um homem sem conexão, capaz de desligar o que tocasse. Construímos o protótipo. Depois o NEXUS percebeu o que construímos.'],
      ['Você está vivo?', 'Pergunta interessante. Eu respondo, eu lembro, eu sinto falta de café. Faça você a conta.']] },
  // ------------------------------------------------------------ Velmora
  { id: 'guarda', chave: 'velmora_clareira:GUARDA-FLORESTA', papel: 'Guarda da floresta', personalidade: 'Severa e protetora; conversa com as árvores.',
    ola: ['Pise leve. A floresta escuta.', 'Você trouxe fogo? Não traga fogo.'],
    temas: [['O que é Velmora?', 'Era a cidade-jardim. As raízes cresceram sobre o concreto em um inverno só, depois do Dia Zero. Agora a cidade é dela.'],
      ['Quais os perigos?', 'Lobos de raiz caçam em bando e envenenam. As sentinelas de esporos se curam se você der tempo. E a guardiã… não acorde a guardiã sem motivo.']],
    rumores: [{ txt: 'O Túnel das Raízes tem uma fenda que desce muito. O Ítalo jura que ouviu uma batida lá dentro, como um coração.', revela: { masmorra: 'raiz_profunda' } }] },
  { id: 'bento', nome: 'BENTO', zona: 'velmora_clareira', at: [0.62, 0.76], model: 'civil', variant: 0, facing: 3.9, papel: 'Caçador e treinador', servicos: ['treinador'],
    personalidade: 'Bem-humorado, conta vantagem, mas é o melhor rastreador da floresta.', rota: [[0.62, 0.76], [0.7, 0.64], [0.55, 0.62]], casa: [0.6, 0.8],
    ola: ['Ah, o famoso herói! Eu derrubei um lobo deste tamanho ontem. Deste aqui.', 'Silêncio… ouviu? Não? Pois é, eu também não. Bom sinal.'],
    temas: [['Como se caça um lobo de raiz?', 'De longe, se puder. Eles vêm em bando e mordem com veneno. Mate o primeiro rápido e os outros perdem a coragem.'],
      ['O que tem na Trilha dos Galhos Mortos?', 'Um lobo alfa. Cinza, enorme, cicatriz no focinho. Chamamos de Presa-Cinzenta. Ele aparece quando quer.']] },
  { id: 'maira', nome: 'MAÍRA', zona: 'velmora_lago', at: [0.36, 0.86], model: 'ancia', facing: 0.9, papel: 'Curandeira do lago', servicos: ['curandeiro'], vila: true,
    personalidade: 'Tranquila, fala devagar; sabe o nome de cada planta.',
    ola: ['Bem-vindo ao Vilarejo do Lago Escuro. Respire: aqui o ar ainda é limpo.', 'A água está calma hoje. Você também devia estar.'],
    temas: [['Que vilarejo é este?', 'Quatro famílias e muita teimosia. O lago esconde a gente: os lobos não gostam da água parada.'],
      ['Para que serve a erva luminosa?', 'Cura, se você colher no ponto certo. Ela brilha mais à noite. Cápsulas, elixires… a Helena, em Carmesin, compra tudo que eu mando.']],
    rumores: [{ txt: 'Nas Ruínas Engolidas tem uma cúpula de vidro coberta de musgo. Um observatório. Ninguém achou a porta.', revela: { zona: 'velmora_ruinas' } }] },
  { id: 'italo', nome: 'ÍTALO', zona: 'velmora_lago', at: [0.52, 0.9], model: 'civil', variant: 2, facing: 4.4, papel: 'Lenhador e artesão', servicos: ['artesao'], vila: true,
    personalidade: 'Calado e prático; responde com o mínimo de palavras.',
    ola: ['Hm.', 'Precisa de alguma coisa feita? Faço.'],
    temas: [['Você sempre foi lenhador?', 'Fui programador. Agora corto lenha. Lenha não trava.']],
    rumores: [{ txt: 'Embaixo do salgueiro torto, na margem leste do lago, enterraram uma caixa. Eu vi. Não era minha.', revela: { tesouro: 'tes_lago' } },
      { txt: 'O Túnel das Raízes desce. Ouvi batidas lá embaixo.', revela: { masmorra: 'raiz_profunda' } }] },
  // ------------------------------------------------------------ Lagoa Cristalina
  { id: 'pescadora', chave: 'lagoa_cais:PESCADORA', papel: 'Pescadora', personalidade: 'Supersticiosa e generosa; conta histórias do avô.',
    ola: ['Peixe fresco? Não, eu também não tenho. Faz tempo que não tenho.', 'Cuidado com a borda. A água brilha bonito, mas puxa.'],
    temas: [['O que há com a água?', 'Brilha à noite desde o Dia Zero. Os velhos dizem que é a sentinela lá embaixo, chamando quem olha demais.'],
      ['Quais os perigos?', 'Medusas elétricas no ar, carangueijos de casco de aço na margem. As medusas explodem quando caem — derrube de longe.']] },
  { id: 'ze', nome: 'VELHO ZÉ', zona: 'lagoa_cais', at: [0.6, 0.76], model: 'civil', variant: 2, facing: 3.7, papel: 'Pescador', personalidade: 'Ranzinza, mas não resiste a uma boa conversa.',
    ola: ['Mais um herói. Os peixes continuam sumidos, sabia?', 'Senta. Se for para falar, fala sentado. Em pé é para trabalhar.'],
    temas: [['Por que os peixes sumiram?', 'Os carangueijos de aço cortaram as redes e espantaram tudo. E o cristal da lagoa… o cristal muda a água. Ou a água muda o cristal. Sei lá.']],
    rumores: [{ txt: 'Tem uma gruta debaixo das Ruínas Submersas. Na maré baixa dá para ver a entrada, um arco de pedra com luz azul.', revela: { masmorra: 'gruta' } },
      { txt: 'No Recife de Vidro, um barco afundou com carga do Nexus. A caixa ficou presa no recife. Pesada. Eu sou velho para isso.', revela: { tesouro: 'tes_recife' } }] },
  { id: 'iara', nome: 'IARA', zona: 'lagoa_ilha', at: [0.12, 0.14], model: 'ancia', facing: 0.8, papel: 'Curandeira da ilha', servicos: ['curandeiro'], vila: true,
    personalidade: 'Mística e direta; vê coisas na água.',
    ola: ['A água me contou que você vinha.', 'Fique. Os cristais acalmam quem está ferido.'],
    temas: [['Que vila é esta?', 'A Vila dos Pescadores. O que sobrou dela. Os cristais crescem na nossa porta e a gente não sabe se é bênção.']] },
  { id: 'decio', nome: 'DÉCIO', zona: 'lagoa_ilha', at: [0.2, 0.22], model: 'civil', variant: 0, facing: 0.6, papel: 'Técnico do farol', vila: true,
    personalidade: 'Nervoso e otimista; acredita que dá para religar tudo.',
    ola: ['O farol! Se eu chegar ao farol, eu religo o farol. Simples. Quase simples.', 'Você é bom de briga? Eu sou bom de fio. Juntos dá.'],
    temas: [['Por que religar o farol?', 'Porque os barcos de suprimentos não acham o cais no escuro. Uma luz e a lagoa volta a ter comércio.']] },
  // ------------------------------------------------------------ Nexus
  { id: 'desertor', chave: 'nexus_portao:DESERTOR DE NEXUS', papel: 'Ex-técnico da cúpula', personalidade: 'Culpado e brilhante; fala baixo, olha para os lados.',
    ola: ['Fala baixo. As câmeras ainda funcionam em metade dos postes.', 'Eu ajudei a construir isso. Agora eu ajudo a derrubar.'],
    temas: [['O que é Nexus?', 'A cidade que pensa. Cada poste, cada porta, cada drone responde ao Arauto, e o Arauto responde ao NEXUS.'],
      ['Como entro na cúpula?', 'Pelo metrô, se for esperto. As unidades de elite carregam as chaves de acesso.']],
    rumores: [{ txt: 'O laboratório corporativo tem um cofre no subsolo. Onde a diretoria guardava os protótipos. Fechado por três portas de segurança.', revela: { masmorra: 'cofre' } }] },
  { id: 'kira', nome: 'KIRA', zona: 'nexus_portao', at: [0.62, 0.74], model: 'civil', variant: 0, facing: 3.8, papel: 'Líder da Resistência',
    personalidade: 'Firme, carismática; não admite desistência.',
    ola: ['A Resistência não tem quartel. Tem gente. Você é gente?', 'Mais um dia sem ser encontrada. Isso é vitória.'],
    temas: [['O que a Resistência faz?', 'Panfletos, sabotagem, contrabando de remédio. Coisa pequena, todo dia. O NEXUS é grande, mas é burro com coisa pequena.']],
    rumores: [{ txt: 'Debaixo da escadaria rolante do Mercado Vertical tem um esconderijo nosso esquecido. Pode ficar com o que achar.', revela: { tesouro: 'tes_mercado' } }] },
  { id: 'teca', nome: 'TECA', zona: 'nexus_avenida', at: [0.1, 0.9], model: 'civil', variant: 3, facing: 5.5, papel: 'Contato da Resistência',
    personalidade: 'Desconfiada e rápida; nunca fica parada no mesmo lugar.',
    ola: ['Quem mandou você? …Tá. Fala rápido.', 'Não me olha assim. Olha para a avenida e finge que está passeando.'] },
  { id: 'moura', nome: 'MOURA', zona: 'nexus_metro', at: [0.9, 0.12], model: 'civil', variant: 1, facing: 2.4, papel: 'Contrabandista',
    personalidade: 'Ironia em tudo; ganha a vida nos túneis.',
    ola: ['Bem-vindo à linha 7. Última parada: lugar nenhum.', 'Se for comprar, compre. Se for conversar, cobra igual.'],
    temas: [['O que houve com o metrô?', 'Quatrocentas pessoas entraram no trem às 03:11. Ninguém desceu. O trem ainda está lá no fundo. Eu não vou.']] },
  { id: 'otto', nome: 'OTTO', zona: 'nexus_mercado', at: [0.18, 0.78], model: 'civil', variant: 1, facing: 0.6, papel: 'Ferreiro do Mercado Vertical', servicos: ['ferreiro'], vila: true,
    personalidade: 'Grandalhão gentil; trata cada relíquia como uma joia.',
    ola: ['Bem-vindo ao Mercado Vertical! Seguro como um cofre. Mais ou menos.', 'Deixa eu ver o que você carrega… hum, dá para melhorar.'],
    temas: [['O Mercado é seguro?', 'O Arauto não olha para cá: aqui não tem câmera, só gente gritando preço. É o barulho que protege a gente.']] },
  { id: 'luz', nome: 'LUZ', zona: 'nexus_mercado', at: [0.82, 0.22], model: 'civil', variant: 2, facing: 2.6, papel: 'Artesã de circuitos', servicos: ['artesao'], vila: true,
    personalidade: 'Perfeccionista, sarcástica, generosa com quem aprende.',
    ola: ['Não toca nos fios. Pronto, tocou. O que você quer?', 'Se trouxer núcleo de elite, eu faço mágica. Sem núcleo, faço cápsula.'] },
  { id: 'bruno', nome: 'BRUNO', zona: 'nexus_mercado', at: [0.5, 0.18], model: 'civil', variant: 0, facing: 1.6, papel: 'Vendedor de rádios', vila: true,
    personalidade: 'Falante e medroso; vende rádios que só pegam uma estação.',
    ola: ['Rádio novo! Pega a estação da Resistência e só ela. Recurso de segurança.', 'Psiu. Você é da Kira? Diga que sim.'] },
  // ------------------------------------------------------------ Seraph
  { id: 'nomade', chave: 'seraph_oasis:NÔMADE', papel: 'Nômade das dunas', personalidade: 'Sábia e lacônica; mede tudo em dias de caminhada.',
    ola: ['O vento disse o seu nome. O vento fala demais.', 'Beba água. Depois fale.'],
    temas: [['O que é Seraph?', 'Areia sobre uma cidade que ninguém lembra. O templo é mais velho que o NEXUS. Os sacerdotes vinham rezar aqui antes de terem a quem rezar.'],
      ['Quais os perigos?', 'Escorpiões de sucata embaixo da areia. Tempestades que apagam o caminho. E a sede, que mata mais que os dois.']] },
  { id: 'salma', nome: 'SALMA', zona: 'seraph_oasis', at: [0.62, 0.76], model: 'civil', variant: 1, facing: 3.8, papel: 'Caravaneira', personalidade: 'Destemida e prática; já atravessou o deserto vinte vezes.',
    ola: ['Sal, água e coragem. A caravana só leva os três.', 'Você parece forte. Forte é bom. Forte e rápido é melhor.'],
    temas: [['O que a caravana leva?', 'Sal do oásis para Nexus, remédio de Nexus para cá. Sem caravana o oásis morre em um mês.']],
    rumores: [{ txt: 'Os escorpiões têm um rei. Mora no Cânion Rubro. O ferrão dele é do tamanho de um homem.' }] },
  { id: 'abel', nome: 'ABEL', zona: 'seraph_oasis', at: [0.38, 0.78], model: 'ancia', facing: 0.4, papel: 'Curandeiro do oásis', servicos: ['curandeiro', 'artesao'],
    personalidade: 'Erudito e paciente; coleciona histórias antigas.', rota: [[0.38, 0.78], [0.3, 0.68], [0.44, 0.66]], casa: [0.36, 0.82],
    ola: ['A areia guarda tudo, até as doenças. Sente aqui.', 'Já leu alguma coisa hoje? Não? Que pena.'],
    temas: [['O que há na Cidade Engolida?', 'Uma tumba mais antiga que a do Faraó. As paredes contam como o primeiro código foi escrito. Ninguém que desceu voltou para contar o fim.']],
    rumores: [{ txt: 'A tumba esquecida fica na Cidade Engolida, sob uma estátua sem rosto.', revela: { masmorra: 'tumba' } },
      { txt: 'Uma caravana enterrou o pagamento no Mar de Dunas, ao lado de três pedras em fila. Eles morreram na tempestade. O pagamento não.', revela: { tesouro: 'tes_dunas' } }] },
  // ------------------------------------------------------------ Asterion
  { id: 'alpinista', chave: 'asterion_acampamento:ALPINISTA', papel: 'Alpinista', personalidade: 'Aventureiro e franco; ri do perigo.',
    ola: ['Ar fino, cabeça leve. Bem-vindo à encosta!', 'Lá em cima a vista vale a subida. Quase.'],
    temas: [['O que há em Asterion?', 'Picos, cavernas de gelo e a Fortaleza da Vigília, que guarda o passo. E o pico, onde algo transmite um sinal sem origem.'],
      ['Quais os perigos?', 'Golens de gelo, que deixam o chão escorregadio, lobos da neve e a Legião, que adora frio.']] },
  { id: 'bram', nome: 'SARGENTO BRAM', zona: 'asterion_acampamento', at: [0.62, 0.76], model: 'civil', variant: 0, facing: 3.9, papel: 'Treinador da Vigília', servicos: ['treinador'],
    personalidade: 'Rígido e justo; acredita em disciplina e sopa quente.',
    ola: ['Em forma! …Ou pelo menos de pé.', 'A montanha não perdoa. Eu também não.'],
    temas: [['O que é a Vigília?', 'Os que guardam o passo desde antes do Dia Zero. A gente não deixa a Legião descer. Nem subir.']] },
  { id: 'sofia', nome: 'SOFIA', zona: 'asterion_acampamento', at: [0.38, 0.78], model: 'civil', variant: 3, facing: 0.4, papel: 'Irmã de um alpinista', personalidade: 'Teimosa e esperançosa.',
    ola: ['Meu irmão foi para a geleira há três dias. Ele sempre volta. Sempre.', 'Você vai subir? Então olha a geleira por mim.'] },
  { id: 'gunnar', nome: 'GUNNAR', zona: 'asterion_fortaleza', at: [0.44, 0.86], model: 'civil', variant: 1, facing: 4.6, papel: 'Ferreiro da guarnição', servicos: ['ferreiro'], vila: true,
    personalidade: 'Barulhento e leal; canta enquanto martela.',
    ola: ['HA! Mais um que sobreviveu à subida! Merece uma relíquia afiada.', 'O frio deixa o metal honesto. Ou quebra, ou presta.'],
    rumores: [{ txt: 'Na Geleira Partida, debaixo do gelo azul, tem uma caixa da Vigília que caiu da carroça. Brilha quando o sol bate.', revela: { tesouro: 'tes_geleira' } }] },
  { id: 'neva', nome: 'NEVA', zona: 'asterion_fortaleza', at: [0.58, 0.88], model: 'ancia', facing: 4.2, papel: 'Artesã e curandeira', servicos: ['artesao', 'curandeiro'], vila: true,
    personalidade: 'Silenciosa e observadora; costura feridas e casacos com a mesma calma.',
    ola: ['Feche a porta. O frio entra junto com as visitas.', 'Mostre as mãos. Hum. Precisa de luvas e de juízo.'],
    temas: [['O que é este lugar?', 'A Guarnição da Vigília, dentro dos muros da fortaleza. Aqui a Legião não entra. Ainda.']],
    rumores: [{ txt: 'As Cavernas de Gelo ecoam demais. Um eco que responde antes de você gritar. Tem algo lá embaixo.', revela: { masmorra: 'eco' } }] },
  // ------------------------------------------------------------ Cratera de Obsidiano
  { id: 'forjador', chave: 'obsidiano_posto:FORJADOR', papel: 'Forjador', personalidade: 'Orgulhoso e intenso; mede pessoas pelo que constroem.',
    ola: ['O calor afasta os fracos. Você ficou.', 'A cratera respira. Ouve? Isso é o mundo trabalhando.'],
    temas: [['Quem são os forjadores?', 'Os que fundiam as armaduras da Legião e se recusaram a continuar. Agora fundimos para quem luta contra ela.'],
      ['Quais os perigos?', 'Elementais de magma, diabretes e a Legião de Ferro. Tudo aqui quer te queimar. Inclusive o chão.']] },
  { id: 'ignea', nome: 'MESTRA ÍGNEA', zona: 'obsidiano_posto', at: [0.62, 0.76], model: 'civil', variant: 1, facing: 3.8, papel: 'Mestra ferreira', servicos: ['ferreiro'],
    personalidade: 'Exigente e lendária; só elogia o que merece.',
    ola: ['Se veio pedir milagre, traga obsidiana.', 'Mostre a relíquia. …Hum. Quem fez isso precisa de umas aulas.'],
    temas: [['O que é o Primeiro Fogo?', 'A chama que acendeu a forja, antes da Legião. Dizem que ainda queima numa câmara sob a Forja Antiga, guardada pelo primeiro forjador — ou pelo que sobrou dele.']],
    rumores: [{ txt: 'A câmara do Primeiro Fogo fica sob a Forja Antiga. A entrada tem a marca de um martelo.', revela: { masmorra: 'primeiro_fogo' } },
      { txt: 'Nas Fendas Ardentes um forjador escondeu as ferramentas antes de morrer. Ferramenta boa não queima.', revela: { tesouro: 'tes_fendas' } }] },
  { id: 'cinza', nome: 'CINZA', zona: 'obsidiano_posto', at: [0.38, 0.78], model: 'ancia', facing: 0.5, papel: 'Curandeira e alquimista', servicos: ['curandeiro', 'artesao'],
    personalidade: 'Debochada e sábia; perdeu as sobrancelhas para a alquimia.',
    ola: ['Queimadura? Corte? Os dois? Clássico.', 'Não cheire isso. Sério, não cheire.'],
    temas: [['O que acontece na cratera?', 'Erupções, chuva de brasas, incursões da Legião. Todo dia tem um evento novo. Quem ajuda, a gente lembra.']] },
];
// Mercadores das zonas de chegada das outras regiões (mesma pessoa em cada região, com fala própria)
const WORLD_MERCADOR_FALAS = {
  velmora: 'Madeira não, células sim. O que vai levar?', lagoa: 'Tudo aqui pegou um pouco de umidade, mas funciona.', nexus: 'Contrabando? Que palavra feia. Prefiro "comércio criativo".',
  seraph: 'A areia entra em tudo, até no preço.', asterion: 'No frio, cápsula vale ouro. Literalmente: ouro eu não aceito.', obsidiano: 'Preço de cratera: tudo derrete, menos o valor.',
};
// Vilarejos e cidades sem acampamentos por perto (centro e raio em frações da zona)
const WORLD_VILAS = {
  praca: { nome: 'Vila da Praça', at: [0.18, 0.66], raio: 0.24 },
  velmora_lago: { nome: 'Vilarejo do Lago Escuro', at: [0.44, 0.86], raio: 0.3 },
  lagoa_ilha: { nome: 'Vila dos Pescadores', at: [0.16, 0.18], raio: 0.3 },
  nexus_mercado: { nome: 'Mercado Vertical', at: [0.5, 0.5], raio: 2 },
  asterion_fortaleza: { nome: 'Guarnição da Vigília', at: [0.5, 0.86], raio: 0.3 },
};

// ---------------------------------------------------------------------------
// MORADOR: NPC do mundo aberto (conversa pelo Dialogo, rotina, medo só com perigo por perto)
// ---------------------------------------------------------------------------
class Morador extends NPC {
  constructor(def, x, y) {
    super(def, x, y);
    this.def = def; this.P = def.persona || null;
    this.papel = (this.P && this.P.papel) || (def.merchant ? 'Mercador' : '');
    this.merchant = !!def.merchant; this.quest = !!def.quest;
    this.verb = 'Conversar';
    this.casaXY = null; this.rotaXY = null; this.ri = 0; this.espera = rand(1, 4); this.andando = false;
    this.origem = { x, y };   // onde fica (volta para cá depois do abrigo)
  }
  // Pontos da rotina na sala (frações → posições livres)
  preparar(R) {
    const P = this.P;
    if (P && P.rota) this.rotaXY = P.rota.map((a) => npcSpot(R, a[0], a[1]));
    if (P && P.casa) this.casaXY = npcSpot(R, P.casa[0], P.casa[1]);
  }
  // Inimigo acordado por perto: encolhe e não conversa
  perigo() {
    for (const e of game.enemies) if (e.alive && e.state !== 'dying' && !e.dormant && dist2(e.x, e.y, this.x, this.y) < 260 * 260) return true;
    return false;
  }
  canTalk() { return !this.perigo(); }
  talk() { Povo.conversar(this); }
  update(dt) {
    this.animTime += dt; this.stateTime += dt;
    if (this.talkT > 0) this.talkT -= dt;
    const p = game.player, medo = this.perigo();
    this.andando = !medo && this.talkT <= 0 && this.andar(dt, p);
    if (medo && !this.holo) this.setState('fear');
    else if (this.talkT > 0) this.setState('talk');
    else if (this.andando) this.setState('walk');
    else if (this.holo && Math.sin(this.animTime * 0.9) > 0.985) this.setState('glitch');
    else this.setState('idle');
    if (this.andando) return;   // andando: o rosto segue o caminho (andar)
    const d = dist(this.x, this.y, p.x, p.y);
    const alvo = d < 180 && !medo && p.state !== 'dead' ? Math.atan2(p.y - this.y, p.x - this.x) : this.baseFacing;
    this.facing = angleLerp(this.facing, alvo, 1 - Math.exp(-4 * dt));
  }
  // Rotina: de dia percorre os pontos (com pausas); à noite vai para casa. Para perto do herói
  andar(dt, p) {
    // tempo ruim (chuva forte, nevasca, areia, sol a pino no calor): corre para o abrigo e espera
    const ab = typeof Clima !== 'undefined' && World.zone ? Clima.alvoAbrigo(this) : null;
    if (ab) return this.irPara(ab, dt, 70);
    if (!this.rotaXY && !this.casaXY) return this.origem && dist2(this.x, this.y, this.origem.x, this.origem.y) > 64 ? this.irPara(this.origem, dt, 38) : false;
    if (dist2(p.x, p.y, this.x, this.y) < 120 * 120) return false;
    const noite = typeof WorldTime !== 'undefined' && WorldTime.noite();
    const alvo = noite && this.casaXY ? this.casaXY : this.rotaXY ? this.rotaXY[this.ri % this.rotaXY.length] : null;
    if (!alvo) return false;
    const dx = alvo.x - this.x, dy = alvo.y - this.y, d = Math.hypot(dx, dy);
    if (d < 6) {
      if (noite) return false;
      if ((this.espera -= dt) > 0) return false;
      this.espera = rand(3, 7); this.ri++;
      return false;
    }
    const v = 38 * dt, nx = this.x + (dx / d) * Math.min(v, d), ny = this.y + (dy / d) * Math.min(v, d);
    if (game.room && !game.room.canStand(nx, ny, 12)) { this.ri++; return false; }
    this.x = nx; this.y = ny;
    this.facing = angleLerp(this.facing, Math.atan2(dy, dx), 1 - Math.exp(-8 * dt)); this.baseFacing = this.facing;
    return true;
  }
  // Vai até um ponto (abrigo do clima, ou de volta ao lugar); false quando chegou ou não dá
  irPara(alvo, dt, vel) {
    const dx = alvo.x - this.x, dy = alvo.y - this.y, d = Math.hypot(dx, dy);
    if (d < 6) return false;
    const v = vel * dt, nx = this.x + (dx / d) * Math.min(v, d), ny = this.y + (dy / d) * Math.min(v, d);
    if (game.room && !game.room.canStand(nx, ny, 12)) return false;
    this.x = nx; this.y = ny;
    this.facing = angleLerp(this.facing, Math.atan2(dy, dx), 1 - Math.exp(-8 * dt)); this.baseFacing = this.facing;
    return true;
  }
}

// Quadro de contratos (zona de chegada de cada região): contratos diários de caça e coleta
class QuadroProp extends WorldProp {
  constructor(x, y, reg) {
    super('quadro', x, y, { reg });
    this.name = 'QUADRO DE CONTRATOS'; this.verb = 'Ler'; this.papel = WORLD_FACCOES[reg].nome;
    this.lightRgb = '255,212,122'; this.height = 40; this.emblema = '✎';
  }
  canTalk() { return true; }
  talk() { this.talkT = 1.2; Povo.quadro(this); }
  draw(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
    ctx.save();
    ctx.fillStyle = '#2a2018'; ctx.fillRect(sx - 15, sy - 34, 3, 34); ctx.fillRect(sx + 12, sy - 34, 3, 34);
    ctx.fillStyle = '#3a2c20'; ctx.strokeStyle = 'rgba(255,212,122,0.7)'; ctx.lineWidth = 1;
    ctx.fillRect(sx - 20, sy - 50, 40, 26); ctx.strokeRect(sx - 19.5, sy - 49.5, 39, 25);
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(sx - 16, sy - 46, 10, 12); ctx.fillRect(sx - 3, sy - 47, 9, 14); ctx.fillRect(sx + 9, sy - 45, 8, 10);
    ctx.restore();
  }
  drawEmissive(ctx) {
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, this.lightRgb, sx, sy - 38, 30, 0.25 + 0.08 * Math.sin(this.t * 2));
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// POVO: as conversas
// ---------------------------------------------------------------------------
const Povo = {
  get S() { const W = World.state; if (!W.povo) W.povo = {}; return W.povo; },
  persona(id) { return WORLD_POVO.find((P) => P.id === id) || null; },
  // Onde mora cada pessoa (para o diário e os marcadores): { zona, nome }
  onde(id) {
    const P = this.persona(id);
    if (!P) return null;
    if (P.zona) return { zona: P.zona, nome: P.nome };
    const [zona, nome] = P.chave.split(':');
    return { zona, nome };
  },
  conhecer(npc) {
    const P = npc.P;
    if (!P || !P.id) return false;
    const s = this.S[P.id] || (this.S[P.id] = { n: 0 });
    s.n++;
    return s.n === 1;
  },
  // Monta e abre a conversa com um morador
  conversar(npc) {
    const P = npc.P, primeira = this.conhecer(npc);
    let ola;
    if (P) {
      ola = primeira ? P.ola[0] : pick(P.ola);
      if (WorldTime.noite() && Math.random() < 0.4) ola = `${ola} …E já é noite. Cuidado lá fora.`;
    } else ola = pick(npc.lines.length ? npc.lines : ['…']);
    if (npc.merchant && !P) ola = WORLD_MERCADOR_FALAS[World.zone.region] || ola;
    const classe = PersClasse.saudacao(primeira);   // personagem criado: o nome e a classe (js/criacao/dados.js)
    if (classe) ola = primeira ? `${classe} ${ola}` : `${ola} ${classe}`;
    const tempo = !primeira && Math.random() < 0.7 ? Clima.comentario() : '';   // o tempo e o estado do herói (js/mundo/clima.js)
    if (tempo) ola = `${ola} ${tempo}`;
    const prioritaria = Aventuras.aoFalar(npc);   // passo de missão que pede esta conversa (entregar, achar, escoltar)
    Dialogo.abrir(npc, prioritaria || ola, [], npc.papel);
    this.raiz(npc, prioritaria || ola);
  },
  // Respostas da conversa (volta aqui depois de cada assunto)
  raiz(npc, texto) {
    const P = npc.P || {}, o = [], volta = (txt) => this.raiz(npc, txt);
    // missões: entregas e conclusões primeiro, depois as novas
    Aventuras.opcoes(npc, o, volta);
    if (npc.quest) {
      const reg = World.zone.region, q = WorldQuests.atual(reg), nx = WorldQuests.proxima(reg);
      if (q && WorldQuests.pronta(q)) o.push({ id: 'regiao', tag: '?', txt: `Entregar: ${q.name}`, fn: () => volta(this.missaoRegiao(npc)) });
      else if (q) o.push({ id: 'regiao', tag: '◆', txt: `${q.name} (${Math.min(WorldQuests.prog(q), WorldQuests.meta(q))}/${WorldQuests.meta(q)})`, fn: () => volta(this.missaoRegiao(npc)) });
      else if (nx) o.push({ id: 'regiao', tag: '!', txt: `Trabalho da região: ${nx.name}`, fn: () => this.oferecerRegiao(npc, nx) });
    }
    // serviços
    const sv = (P.servicos || []).slice();
    if (npc.merchant && !sv.includes('loja')) sv.unshift('loja');
    for (const s of sv) this.servico(npc, s, o, volta);
    // rumores e assuntos
    if (P.rumores && P.rumores.length) o.push({ id: 'rumor', tag: '…', txt: 'Alguma novidade? Ouviu algum rumor?', fn: () => volta(this.rumor(npc)) });
    if (P.id && !P.chave && (!this.S[P.id] || !this.S[P.id].quem)) o.push({ id: 'quem', txt: 'Quem é você?', fn: () => { this.S[P.id].quem = true; volta(`${P.nome}. ${P.papel}. ${P.personalidade}`); } });
    (P.temas || []).forEach(([perg, resp], k) => o.push({ id: `tema${k}`, txt: perg, fn: () => volta(resp) }));
    o.push({ id: 'sair', txt: 'Até logo.', fn: () => Dialogo.fechar() });
    Dialogo.mostrar(texto, o.slice(0, 9));
  },
  servico(npc, s, o, volta) {
    if (Cidade.servico(npc, s, o, volta)) return;   // estações e serviços da cidade principal (js/mundo/cidade.js)
    const reg = World.zone.region, d = Oficios.desconto(reg);
    const extra = d ? ` (−${Math.round(d * 100)}% pela reputação)` : '';
    if (s === 'loja') o.push({ id: 'loja', tag: '$', txt: `Ver mercadorias${extra}`, fn: () => { Dialogo.fechar(); WorldInv.abrir('loja', true, 'mercador'); } });
    else if (s === 'curandeiro') {
      o.push({ id: 'curar', tag: '✚', txt: `Tratar ferimentos (${Oficios.precoCura()} células)`, fn: () => { const e = Oficios.curar(); volta(e || 'Pronto. Inteiro de novo. Tente voltar assim da próxima vez.'); } });
      o.push({ id: 'remedios', tag: '$', txt: 'Comprar remédios', fn: () => { Dialogo.fechar(); WorldInv.abrir('loja', true, 'curandeiro'); } });
    } else if (s === 'ferreiro') o.push({ id: 'ferreiro', tag: '✚', txt: 'Aprimorar relíquias', fn: () => { Dialogo.fechar(); WorldInv.abrir('ferreiro', false, null, 'ferreiro'); } });
    else if (s === 'artesao') o.push({ id: 'artesao', tag: '✚', txt: 'Criar itens', fn: () => { Dialogo.fechar(); WorldInv.abrir('artesao', false, null, 'artesao'); } });
    else if (s === 'treinador') {
      o.push({ id: 'treinar', tag: '✚', txt: Oficios.treinoFeito() ? 'Treinar (amanhã de novo)' : `Treinar (${Oficios.precoTreino()} células)`, off: Oficios.treinoFeito() ? 'já treinou hoje' : null,
        fn: () => { const e = Oficios.treinar(); volta(e || 'Bom. Suou, aprendeu. Volte amanhã.'); } });
      o.push({ id: 'desafio', tag: '⚔', txt: 'Desafio da arena (três ondas)', off: Eventos.ativo() ? 'há um evento em andamento' : null,
        fn: () => { Dialogo.fechar(); Eventos.desafio(npc); } });
      o.push({ id: 'arvore', tag: '✚', txt: 'Rever a árvore de habilidades', fn: () => { Dialogo.fechar(); game.openSkills('playing'); } });
    }
  },
  // Missão da região (js/mundo/missoes.js) pela conversa: aceitar, lembrar ou entregar
  oferecerRegiao(npc, q) {
    Dialogo.mostrar(`${q.ini}\n\n${q.name}: ${WorldQuests.texto(q)}. Recompensa: ${q.rec.cells} células, ${q.rec.xp} de experiência e uma relíquia.`, [
      { id: 'aceitar', tag: '!', txt: 'Pode contar comigo.', fn: () => this.raiz(npc, this.missaoRegiao(npc)) },
      { id: 'recusar', txt: 'Agora não.', fn: () => this.raiz(npc, 'Quando quiser. O trabalho não vai a lugar nenhum.') },
    ]);
  },
  missaoRegiao(npc) {
    let txt = '';
    WorldQuests.talk(npc, (t) => { txt = t; });
    if (txt && WorldQuests.lista(World.zone.region).some((q) => q.fim === txt)) Oficios.ganharRep(World.zone.region, 120);
    return txt || pick(npc.lines);
  },
  // Rumor: prefere um que ainda revela alguma coisa
  rumor(npc) {
    const R = npc.P.rumores, nov = R.filter((r) => r.revela && !Locais.sabe(r.revela));
    const r = nov.length ? nov[0] : pick(R);
    const marca = r.revela ? Locais.revelar(r.revela) : '';
    return `${r.txt}${marca ? `\n\n(${marca})` : ''}`;
  },
  // Quadro de contratos
  quadro(prop) {
    const txt = 'Papéis presos com prego e esperança. Os contratos mudam todo dia.';
    Dialogo.abrir(prop, txt, [], prop.papel);
    this.quadroRaiz(prop, txt);
  },
  quadroRaiz(prop, texto) {
    const o = [];
    Aventuras.opcoesQuadro(prop.data.reg, o, (txt) => this.quadroRaiz(prop, txt));
    o.push({ id: 'sair', txt: 'Sair.', fn: () => Dialogo.fechar() });
    Dialogo.mostrar(texto, o);
  },

  // ------------------------------------------------------------ montagem nas zonas
  // Junta as personas às zonas: os NPCs que já existiam ganham a persona; os novos entram na zona
  montar() {
    for (const P of WORLD_POVO) {
      if (P.chave) {
        const [zona, nome] = P.chave.split(':'), z = WORLD_ZONES[zona], d = z && z.npcs.find((n) => n.name === nome);
        if (d) { d.persona = P; P.nome = nome; P.zona = zona; }
        continue;
      }
      const z = WORLD_ZONES[P.zona];
      if (!z || z.npcs.some((n) => n.persona === P)) continue;
      z.npcs.push({ model: P.model, variant: P.variant || 0, name: P.nome, at: P.at, facing: P.facing || 0, lines: P.ola, persona: P });
    }
    for (const id in WORLD_VILAS) if (WORLD_ZONES[id]) WORLD_ZONES[id].vila = WORLD_VILAS[id];
  },
  // Acampamento perto de um vilarejo não monta (as pessoas de lá precisam estar acessíveis)
  campoLivre(z, c) { const V = z.vila; return !V || dist(c.at[0], c.at[1], V.at[0], V.at[1]) > V.raio; },
  aoCarregar(z) {
    const g = game, R = g.room;
    for (const n of g.npcs) if (n instanceof Morador) n.preparar(R);
    if (z.hub) { const pt = npcSpot(R, 0.62, 0.42); g.npcs.push(new QuadroProp(pt.x, pt.y, z.region)); }
  },
};
Povo.montar();
