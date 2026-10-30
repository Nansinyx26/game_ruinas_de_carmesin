'use strict';
// ECLIPSE ZERO · Mundo aberto até o nível 100: as três cidades das faixas altas
// ---------------------------------------------------------------------------
// Quatro faixas de nível (WORLD_FAIXAS em js/world.js), cada uma com a sua cidade:
//   1–25   Cidade inicial · Refúgio da Aurora e as seis regiões de sempre (mais Carmesin).
//   25–50  METRÓPOLE TECNOLÓGICA: a megacidade da corporação (e a Cratera de Obsidiano ao sul).
//   50–75  CIDADE DAS RUÍNAS CARMESINS: a capital antiga, partida pela energia vermelha.
//   75–100 NEXUS ZERO: a cidade de dados onde o NEXUS nasceu; o fim do caminho.
// Cada cidade é uma região de 3 × 3 zonas (js/mundo/regioes.js): no centro a cidade (portal,
// mercador, quadro de contratos e seis moradores com serviço: ferreiro, curandeira, artesão,
// treinador e quem conta rumores), em volta os distritos com acampamentos, baús, terminais,
// segredos, uma masmorra de três andares e o chefe da região no último distrito. Ela só abre
// com o herói no nível da faixa (25, 50, 75 — World.regionOpen) e o portão no Refúgio da
// Aurora fica trancado até lá. Este arquivo junta às tabelas de sempre o que cada cidade tem:
// tema do cenário, inimigos dos contratos, material, facção e insígnia, clima e temperatura,
// plano do chefe, missões da região (3), missões secundárias (2), moradores, masmorra e tesouros.
// A família das peças do Arsenal que cai em cada uma acompanha o nível (Cristal, Obsidiana e o
// conjunto Eclipse dos chefes de Nexus Zero). Depois do nível 100, a experiência vira maestria
// (PROG.xpMaestria, js/progression.js).
// ---------------------------------------------------------------------------
(function () {
  // ------------------------------------------------------------ cenário das cidades
  THEMES.metropole = { floor: [200, 14, 14], wall: [205, 14], lamp: '90,240,255', accent: '255,80,220', dark: '2,6,16', darkness: 0.72,
    sky: 'city', decor: 'neon', pillar: 'pylon', deco: 'circuit', ruined: 0.08, cables: 5, rain: true, ambient: 'Neon e chuva fina' };
  THEMES.carmim = { floor: [352, 22, 11], wall: [354, 20], lamp: '255,70,90', accent: '255,40,70', dark: '16,2,5', darkness: 0.8,
    sky: 'city', decor: 'graffiti', pillar: 'stone', deco: 'stone', ruined: 0.55, cables: 2, ambient: 'Brasas vermelhas no ar' };
  THEMES.nulo = { floor: [262, 30, 9], wall: [266, 26], lamp: '170,130,255', accent: '120,255,240', dark: '6,3,16', darkness: 0.86,
    sky: 'tower', decor: 'holo', pillar: 'crystal', deco: 'circuit', ruined: 0.05, ambient: 'Código no ar' };
  WORLD_MAT_TEMA.metropole = 'circuito'; WORLD_MAT_TEMA.carmim = 'amostra'; WORLD_MAT_TEMA.nulo = 'nucleo';

  // ------------------------------------------------------------ tabelas por região
  Object.assign(WORLD_CONTRATO_ALVOS, { metropole: ['sentinela_neon', 'executor', 'atirador'], ruinas: ['cavaleiro_rubro', 'espectro'], nexuszero: ['fragmento', 'arauto_nulo', 'golem_dados'] });
  Object.assign(WORLD_NOMES_ALVO, { sentinela_neon: 'sentinelas neon', executor: 'executores corporativos', cavaleiro_rubro: 'cavaleiros rubros', espectro: 'espectros da capital',
    fragmento: 'fragmentos de código', arauto_nulo: 'arautos nulos', golem_dados: 'golens de dados' });
  Object.assign(WORLD_MAT_REG, { metropole: 'circuito', ruinas: 'amostra', nexuszero: 'nucleo' });
  Object.assign(WORLD_FACCOES, { metropole: { nome: 'Conselho da Metrópole' }, ruinas: { nome: 'Guarda da Cidadela' }, nexuszero: { nome: 'Resistência do Código' } });
  Object.assign(WORLD_INSIGNIAS, {
    metropole: { unico: 'Credencial do Conselho', b: 'chip', st: { recarga: 0.08, energia: 40 } },
    ruinas: { unico: 'Coroa Partida', b: 'escudo', st: { defesa: 0.1, vida: 90, dano: 0.06 } },
    nexuszero: { unico: 'Chave do Código-Fonte', b: 'nucleo', st: { dano: 0.14, critico: 0.08, recarga: 0.06 } },
  });
  Object.assign(CLIMA_REGIAO, { metropole: [18, 9], ruinas: [24, 14], nexuszero: [12, 6] });
  Object.assign(WORLD_CLIMA_REG, {
    metropole: { limpo: 3, chuva: 4, tempestade: 2, neblina: 1 },
    ruinas: { limpo: 3, brasas: 3, chuva: 2, neblina: 2 },
    nexuszero: { limpo: 3, neblina: 3, tempestade: 2 },
  });
  Object.assign(FAB_PLANO_CHEFE, { metropole: 'cristal', ruinas: 'obsidiana', nexuszero: 'eclipse' });
  Object.assign(WORLD_SUFIXO, { metropole: 'da Metrópole', ruinas: 'Rubro', nexuszero: 'do Nexus Zero' });
  Object.assign(WORLD_MERCADOR_FALAS, {
    metropole: 'Aceito células, créditos e favores. Nessa ordem.', ruinas: 'Tudo aqui sobreviveu à queda da capital. Inclusive o preço.',
    nexuszero: 'Mercadoria de verdade, num lugar feito de dados. Aproveite.',
  });

  // Peças do Arsenal que caem nas cidades altas: Cristal até o nível 40, Obsidiana depois; os
  // chefes de Nexus Zero deixam o conjunto Eclipse (que nasce Lendário)
  const famBase = Arsenal.famDaZona.bind(Arsenal);
  Arsenal.famDaZona = function (z) {
    const reg = z && z.region;
    if (reg === 'metropole') return z.lv < 40 ? 'cristal' : 'obsidiana';
    if (reg === 'ruinas' || reg === 'nexuszero') return 'obsidiana';
    return famBase(z);
  };
  const onKillBase = Arsenal.onKill.bind(Arsenal);
  Arsenal.onKill = function (e) {
    const z = World.zone;
    if (e.worldBoss && z && z.region === 'nexuszero') { this.guardar(this.gerar(pick(ARS_ORDEM), 'eclipse', ARS_LENDARIA, z.lv)); this.onKillClasse(e, z); return; }
    onKillBase(e);
  };

  // ------------------------------------------------------------ missões das regiões (3 cada)
  Object.assign(WORLD_QUESTS, {
    metropole: [
      { id: 'met1', name: 'Olhos de Vidro', tipo: 'matar', alvo: 'sentinela_neon', n: 14, rec: { cells: 420, xp: 9000, min: 2 },
        ini: 'As sentinelas neon marcam cada pessoa que sai da praça. Quatorze a menos e a gente volta a andar sem ser contado.', fim: 'O painel da praça apagou três setores. Três! Gente saiu de casa hoje.' },
      { id: 'met2', name: 'Registros da Diretoria', tipo: 'terminais', rec: { cells: 520, xp: 12000, min: 2 },
        ini: 'Os terminais das torres e do distrito industrial guardam as ordens do Supervisor. Leia todos.', fim: '"Destino: Ômega." Então as sentinelas não vigiam a cidade. Elas a esvaziam.' },
      { id: 'met3', name: 'O Supervisor Ômega', tipo: 'chefe', rec: { cells: 900, xp: 22000, min: 3 },
        ini: 'O Supervisor comanda tudo do Núcleo Ômega. Desligue-o e a Metrópole volta a ser nossa.', fim: 'A cidade inteira piscou e ficou em silêncio. Pela primeira vez, silêncio bom. As Ruínas Carmesins esperam quem chegar ao nível 50.' },
    ],
    ruinas: [
      { id: 'ruc1', name: 'A Guarda Rubra', tipo: 'matar', alvo: 'cavaleiro_rubro', n: 12, rec: { cells: 900, xp: 26000, min: 2 },
        ini: 'Os cavaleiros rubros ainda patrulham a capital, fiéis a um rei que não morre. Doze a menos e a cidadela respira.', fim: 'As patrulhas mudaram de rota. Estão com medo de você.' },
      { id: 'ruc2', name: 'Mapa da Capital', tipo: 'explorar', rec: { cells: 1100, xp: 32000, min: 3 },
        ini: 'Ninguém atravessa a capital inteira desde a queda. Pise em cada distrito e me traga o mapa.', fim: 'A capital inteira num papel. Meu pai desenhou a primeira versão. Você terminou.' },
      { id: 'ruc3', name: 'O Rei Carmesim', tipo: 'chefe', rec: { cells: 1800, xp: 52000, min: 3 },
        ini: 'O Rei se senta no Salão do Trono. A coroa o mantém vivo; tire a coroa dele.', fim: 'A energia vermelha baixou na capital inteira. Nexus Zero agora te chama — vá quando chegar ao nível 75.' },
    ],
    nexuszero: [
      { id: 'nz1', name: 'Limpeza de Código', tipo: 'matar', alvo: 'fragmento', n: 16, rec: { cells: 1900, xp: 60000, min: 3 },
        ini: 'Os fragmentos se dividem quando caem. Derrube dezesseis e o código daqui fica estável o bastante para a gente pensar.', fim: 'O chão parou de piscar. Por enquanto.' },
      { id: 'nz2', name: 'Tesouros do Arquivo', tipo: 'baus', n: 5, rec: { cells: 2300, xp: 72000, min: 3 },
        ini: 'O NEXUS guardou o que tirou das pessoas em cofres pela cidade. Abra cinco e devolva o que der.', fim: 'Fotos, cartas, uma música. Tudo isso era de alguém.' },
      { id: 'nz3', name: 'NEXUS ZERO', tipo: 'chefe', rec: { cells: 4000, xp: 120000, min: 3 },
        ini: 'No Núcleo Zero mora a decisão que ninguém desfez. Desfaça.', fim: 'Acabou. Ou começou. Daqui para a frente, o nível não sobe mais: o que cresce é a sua maestria.' },
    ],
  });

  // ------------------------------------------------------------ moradores das cidades
  const povo = [
    // Metrópole Tecnológica · Praça Central
    { id: 'met_vega', nome: 'VEGA', zona: 'metro_centro', at: [0.62, 0.76], model: 'civil', variant: 1, facing: 3.8, papel: 'Ferreira de liga', servicos: ['ferreiro'],
      personalidade: 'Precisa, impaciente, fala em especificações.',
      ola: ['Liga de titânio, solda a frio. Diga o que quer e eu digo quanto custa.', 'Se a peça falhar, a culpa é do usuário. Mas a minha não falha.'],
      temas: [['O que você forja aqui?', 'Aprimoro relíquias até +5. Na Metrópole, peça sem aprimoramento é peça descartável.']],
      rumores: [{ txt: 'Debaixo dos Subníveis tem um cofre da corporação. A porta abre para quem tem a credencial certa — ou um martelo grande.', revela: { masmorra: 'cofre_omega' } }] },
    { id: 'met_lia', nome: 'DRA. LIA', zona: 'metro_centro', at: [0.38, 0.78], model: 'cientista', facing: 0.5, papel: 'Médica de campo', servicos: ['curandeiro'],
      personalidade: 'Calma no caos, cansada fora dele.',
      ola: ['Sente aqui. Respire. Agora me diz onde dói.', 'Remédio é caro na Metrópole. Para você, é só caro.'],
      temas: [['Como é viver aqui?', 'Cada esquina tem câmera, cada câmera tem uma sentinela. A gente vive na praça porque aqui o sinal falha.']] },
    { id: 'met_kai', nome: 'KAI', zona: 'metro_centro', at: [0.82, 0.56], model: 'civil', variant: 0, facing: 3.4, papel: 'Hacker e artesão', servicos: ['artesao'],
      personalidade: 'Rápido, irônico, nunca olha nos olhos — olha para a tela.',
      ola: ['Fala rápido, o firewall reinicia em quarenta segundos.', 'Trouxe circuito? Então somos amigos.'],
      temas: [['O que é o Supervisor Ômega?', 'Um programa de gestão urbana que ganhou permissão de administrador sobre tudo. Inclusive sobre gente.']],
      rumores: [{ txt: 'No Mercado Neon, atrás da banca de peixe sintético, alguém enterrou o próprio cofre antes de fugir.', revela: { tesouro: 'tes_neon' } }] },
    { id: 'met_brutus', nome: 'BRUTUS', zona: 'metro_centro', at: [0.2, 0.56], model: 'civil', variant: 2, facing: 0.3, papel: 'Treinador', servicos: ['treinador'],
      personalidade: 'Ex-segurança da corporação; ri alto, bate mais alto.',
      ola: ['Já fui executor. Hoje treino quem derruba executor.', 'Postura! Ninguém sobrevive na Metrópole com essa guarda.'],
      temas: [['Como lutar contra os executores?', 'Nunca de frente: a carapaça deles absorve tudo. Rodeie, bata nas costas, saia.']] },
    { id: 'met_ines', nome: 'INÊS', zona: 'metro_mercado', at: [0.5, 0.82], model: 'ancia', facing: 1.4, papel: 'Comerciante do mercado', servicos: ['curandeiro', 'artesao'], vila: true,
      personalidade: 'Sabe o preço de tudo e o segredo de todos.',
      ola: ['O Mercado Neon nunca fecha. Nem quando devia.', 'Cada coisa aqui tem dois preços. Eu te dou o menor.'],
      temas: [['O que se vende aqui?', 'Peças, remédios e informação. A informação é a mais cara.']] },
    // Cidade das Ruínas Carmesins · Cidadela
    { id: 'ruc_tor', nome: 'TOR', zona: 'rc_cidadela', at: [0.62, 0.76], model: 'civil', variant: 1, facing: 3.8, papel: 'Ferreiro da cidadela', servicos: ['ferreiro'],
      personalidade: 'Silencioso; fala pelo martelo.',
      ola: ['…', 'Deixa a peça. Volta amanhã. Ou espera.'],
      temas: [['Por que você ficou na capital?', 'Meu avô forjou a coroa do Rei. Fico até alguém tirá-la dele.']],
      rumores: [{ txt: 'A cripta da catedral guarda o primeiro cavaleiro que jurou a coroa. Ele ainda está de vigia.', revela: { masmorra: 'cripta_real' } }] },
    { id: 'ruc_saba', nome: 'SABÁ', zona: 'rc_cidadela', at: [0.38, 0.78], model: 'ancia', facing: 0.5, papel: 'Curandeira', servicos: ['curandeiro'],
      personalidade: 'Velha, mordaz, nunca perdeu um paciente que a escutou.',
      ola: ['Energia vermelha na ferida? Arde mais que fogo. Senta.', 'Mais um herói. Venha ver quantos eu já costurei.'],
      temas: [['O que é a energia vermelha?', 'O que sobrou do coração da capital quando o Rei virou máquina. Ela cura e mata. Na mesma medida.']] },
    { id: 'ruc_milo', nome: 'MILO', zona: 'rc_cidadela', at: [0.82, 0.56], model: 'civil', variant: 2, facing: 3.4, papel: 'Escriba e artesão', servicos: ['artesao'],
      personalidade: 'Jovem, curioso, coleciona livros que ninguém mais lê.',
      ola: ['Trouxe algum livro? Uma página? Uma letra?', 'Estou copiando a história da capital. Antes que ela acabe.'],
      temas: [['Quem era o Rei Carmesim?', 'Um engenheiro. Construiu a rede de energia da capital. No Dia Zero, ligou-se a ela para não deixar a cidade apagar.']],
      rumores: [{ txt: 'Nos Jardins de Sangue, sob a estátua sem cabeça, os nobres enterraram o tesouro da capital.', revela: { tesouro: 'tes_jardins' } }] },
    { id: 'ruc_iara', nome: 'CAPITÃ YARA', zona: 'rc_cidadela', at: [0.2, 0.56], model: 'civil', variant: 0, facing: 0.3, papel: 'Treinadora da Guarda', servicos: ['treinador'],
      personalidade: 'Firme e justa; perdeu a tropa inteira e não perdeu a fé.',
      ola: ['A Guarda da Cidadela aceita qualquer um que volte vivo.', 'Treine. A capital não perdoa quem hesita.'],
      temas: [['Como enfrentar os espectros?', 'Eles somem e aparecem do seu lado. Não corra: gire e golpeie onde vão estar.']] },
    // Nexus Zero · Santuário
    { id: 'nz_ada', nome: 'ADA', zona: 'nz_santuario', at: [0.62, 0.76], model: 'cientista', facing: 3.8, papel: 'Forjadora de código', servicos: ['ferreiro'],
      personalidade: 'Fala de metal como se fosse programa, e de programa como se fosse metal.',
      ola: ['Aqui a forja compila. Mesma coisa, mais rápido.', 'Toda peça é um laço. Deixe-me fechar o seu.'],
      temas: [['Como se forja num lugar de dados?', 'A matéria daqui é instrução. Eu escrevo a peça antes de bater nela.']],
      rumores: [{ txt: 'Na Fenda de Dados existe uma descida até a raiz do código. O que guarda a raiz compila quem chega perto.', revela: { masmorra: 'raiz_codigo' } }] },
    { id: 'nz_eco', nome: 'ECO', zona: 'nz_santuario', at: [0.38, 0.78], model: 'ancia', facing: 0.5, papel: 'Curandeira da memória', servicos: ['curandeiro'],
      personalidade: 'Fala com frases dos outros; diz que guardou todas.',
      ola: ['"Respire fundo." Foi o que alguém me disse um dia. Digo para você.', 'Aqui o corpo cura rápido. A memória, devagar.'],
      temas: [['Quem é você?', 'Uma das pessoas conectadas no Dia Zero. Voltei do Arquivo. Quase inteira.']] },
    { id: 'nz_bit', nome: 'BIT', zona: 'nz_santuario', at: [0.82, 0.56], model: 'civil', variant: 2, facing: 3.4, papel: 'Artesão de núcleos', servicos: ['artesao'],
      personalidade: 'Criança prodígio; trata o fim do mundo como um quebra-cabeça.',
      ola: ['Você é o herói? É mais baixo do que no arquivo.', 'Me dá núcleos e eu te dou coisas que não deviam existir.'],
      temas: [['O que é o Nexus Zero?', 'A primeira linha do NEXUS. Se ela cair, as outras caem atrás. Simples. Difícil, mas simples.']],
      rumores: [{ txt: 'No Mar do Vazio flutua um cofre que ninguém compilou. Dá para abrir com as mãos.', revela: { tesouro: 'tes_vazio' } }] },
    { id: 'nz_oren', nome: 'OREN', zona: 'nz_santuario', at: [0.2, 0.56], model: 'civil', variant: 0, facing: 0.3, papel: 'Mestre de armas', servicos: ['treinador'],
      personalidade: 'O último soldado da primeira resistência; não sorri, mas ensina.',
      ola: ['Nível cem não é o fim. É onde o treino de verdade começa.', 'Mostre a guarda. …De novo.'],
      temas: [['O que vem depois do nível 100?', 'Maestria. Cada batalha ainda ensina; o corpo não sobe de nível, mas aprende. Equipamento, conjuntos, aprimoramento: é aí que você cresce.']] },
  ];
  // quem dá as missões da região (o NPC da chegada, js/mundo/regioes.js) ganha conversa própria
  povo.push(
    { id: 'met_raia', chave: 'metro_centro:COORDENADORA RAIA', papel: 'Coordenadora da Resistência', personalidade: 'Estrategista; fala em mapas e horários.',
      ola: ['Bem-vindo à Metrópole. Fique na praça até aprender as rotas.', 'Cada missão aqui tem horário. Atrase e a sentinela chega antes.'],
      temas: [['Quais os perigos?', 'Sentinelas neon que somem e reaparecem, executores com carapaça, agentes que atiram de longe. E o Supervisor, que vê tudo.']] },
    { id: 'ruc_guardia', chave: 'rc_cidadela:GUARDIÃ DA CIDADELA', papel: 'Guardiã da Cidadela', personalidade: 'Grave e gentil; carrega a chave da cidadela no pescoço.',
      ola: ['A cidadela é pequena, mas é nossa.', 'Você veio de longe. A capital tem memória longa: ela vai te reconhecer.'],
      temas: [['Quais os perigos?', 'Cavaleiros rubros que se curam quando você para de bater, espectros que atravessam paredes, enxames. E o Rei, no trono.']] },
    { id: 'nz_engenheiro', chave: 'nz_santuario:O ÚLTIMO ENGENHEIRO', papel: 'Último engenheiro do NEXUS', personalidade: 'Culpado e lúcido; ajudou a construir o que agora combate.',
      ola: ['Eu escrevi parte disso. Agora ajudo a apagar.', 'Cada fragmento lá fora já foi uma pessoa conectada.'],
      temas: [['Quais os perigos?', 'Fragmentos que se dividem e explodem, arautos que somem e se curam, golens de dados que congelam. Tudo nível alto: venha preparado.']] },
  );
  for (const P of povo) if (!WORLD_POVO.some((q) => q.id === P.id)) WORLD_POVO.push(P);
  Object.assign(WORLD_VILAS, {
    metro_centro: { nome: 'Praça Central', at: [0.5, 0.6], raio: 0.4 }, metro_mercado: { nome: 'Mercado Neon', at: [0.5, 0.8], raio: 0.22 },
    rc_cidadela: { nome: 'Cidadela', at: [0.5, 0.6], raio: 0.4 }, nz_santuario: { nome: 'Santuário', at: [0.5, 0.6], raio: 0.4 },
  });
  Povo.montar();

  // ------------------------------------------------------------ missões secundárias (3 por cidade)
  WORLD_AVENTURAS.push(
    { id: 'met_s1', reg: 'metropole', nome: 'Fiação Nova', doador: 'met_kai', nivel: 26,
      desc: 'O firewall da praça cai a cada hora. Kai precisa de circuitos para manter a Praça Central fora do radar.',
      ini: 'Oito circuitos e quatro engrenagens. Rápido, antes que o Supervisor perceba a praça.',
      passos: [{ t: 'entregar', npc: 'met_kai', mat: { circuito: 8, engrenagem: 4 }, fim: true, txt: 'Leve 8 Circuitos e 4 Engrenagens a Kai, na Praça Central' }],
      fim: 'Firewall de pé. A praça sumiu do mapa deles. Toma, você merece.', rec: { xp: 11000, cel: 600, rep: 160, rel: { min: 2 } } },
    { id: 'met_s2', reg: 'metropole', nome: 'O Cofre Ômega', doador: 'met_vega', nivel: 40,
      desc: 'Sob os Subníveis a corporação guarda protótipos de armadura. Vega quer saber o que eles têm.',
      ini: 'Desça ao Cofre Ômega e volte inteiro. Se trouxer um protótipo, eu desmonto e aprendo.',
      passos: [{ t: 'masmorra', id: 'cofre_omega', txt: 'Vença o Cofre Ômega, sob os Subníveis' }, { t: 'falar', npc: 'met_vega', fim: true, txt: 'Volte a Vega, na Praça Central' }],
      fim: 'Isso… é liga Eclipse. Primitiva, mas é. A corporação estava perto.', rec: { xp: 18000, cel: 800, rep: 200, rel: { min: 3 } } },
    { id: 'ruc_s1', reg: 'ruinas', nome: 'Amostras da Queda', doador: 'ruc_saba', nivel: 51,
      desc: 'Sabá estuda a energia vermelha para tratar os feridos da cidadela.',
      ini: 'Seis amostras desconhecidas e dois núcleos. Se eu entender essa energia, paro de perder gente.',
      passos: [{ t: 'entregar', npc: 'ruc_saba', mat: { amostra: 6, nucleo: 2 }, fim: true, txt: 'Leve 6 Amostras Desconhecidas e 2 Núcleos Instáveis a Sabá' }],
      fim: 'Agora eu sei o que ela é. Saber dói menos que não saber.', rec: { xp: 30000, cel: 1200, rep: 200, cons: { pele: 2, tonico: 2 } } },
    { id: 'ruc_s2', reg: 'ruinas', nome: 'O Primeiro Juramento', doador: 'ruc_tor', nivel: 60,
      desc: 'Na cripta da catedral vigia o primeiro cavaleiro que jurou a coroa. Tor quer que o juramento acabe.',
      ini: 'Desça à cripta. Liberte o cavaleiro. Ele merece descansar mais do que eu.',
      passos: [{ t: 'masmorra', id: 'cripta_real', txt: 'Vença a Cripta Real, sob a Catedral Rachada' }, { t: 'falar', npc: 'ruc_tor', fim: true, txt: 'Volte a Tor, na Cidadela' }],
      fim: '…Obrigado. Meu avô forjou o elmo dele também.', rec: { xp: 40000, cel: 1500, rep: 240, rel: { min: 3 } } },
    { id: 'nz_s1', reg: 'nexuszero', nome: 'Núcleos para o Santuário', doador: 'nz_bit', nivel: 76,
      desc: 'O escudo do Santuário consome núcleos. Bit sabe fazer o resto.',
      ini: 'Seis núcleos e duas essências. Eu monto, você protege. Combinado?',
      passos: [{ t: 'entregar', npc: 'nz_bit', mat: { nucleo: 6, essencia: 2 }, fim: true, txt: 'Leve 6 Núcleos Instáveis e 2 Essências a Bit, no Santuário' }],
      fim: 'Escudo no máximo! O código lá fora nem enxerga a gente agora.', rec: { xp: 70000, cel: 2500, rep: 260, rel: { min: 3 } } },
    { id: 'nz_s2', reg: 'nexuszero', nome: 'A Raiz do Código', doador: 'nz_ada', nivel: 88,
      desc: 'Sob a Fenda de Dados fica a raiz de onde todo o código daqui é compilado.',
      ini: 'Desça até a raiz. Se o compilador cair, a cidade para de se reescrever. Por um tempo.',
      passos: [{ t: 'masmorra', id: 'raiz_codigo', txt: 'Vença a Raiz do Código, sob a Fenda de Dados' }, { t: 'falar', npc: 'nz_ada', fim: true, txt: 'Volte a Ada, no Santuário' }],
      fim: 'A cidade parou de mudar. Agora dá para mapear. Agora dá para vencer.', rec: { xp: 95000, cel: 3200, rep: 300, rel: { min: 3, sorte: 0.4 } } },
    { id: 'met_s3', reg: 'metropole', nome: 'Elevadores das 03:11', doador: 'met_raia', nivel: 30,
      desc: 'Nas Torres de Vidro os elevadores sobem sozinhos todo dia no mesmo horário. Raia quer saber para onde.',
      ini: 'Examine os três painéis dos elevadores das torres. Se alguém chama esses elevadores, eu quero o nome.',
      passos: [
        { t: 'examinar', zona: 'metro_torres', nome: 'Painel do elevador', txt: 'Examine os 3 painéis dos elevadores das Torres de Vidro', pistas: [
          { at: [0.22, 0.3], txt: 'O painel registra uma chamada às 03:11. Destino: "andar Ω".' },
          { at: [0.78, 0.36], txt: 'Não existe andar Ω no prédio. O cabo desce, não sobe.' },
          { at: [0.5, 0.8], txt: 'A chamada vem do Núcleo Ômega. O Supervisor recolhe alguém todo dia.' }] },
        { t: 'falar', npc: 'met_raia', fim: true, txt: 'Conte a Raia, na Praça Central' }],
      fim: 'Todo dia uma pessoa. Durante anos. Agora a gente sabe por quem lutar.', rec: { xp: 13000, cel: 650, rep: 170, cons: { tonico: 2 } } },
    { id: 'ruc_s3', reg: 'ruinas', nome: 'O Engenheiro da Coroa', doador: 'ruc_milo', nivel: 63,
      desc: 'Milo encontrou indícios de que o Rei Carmesim foi o engenheiro da rede de energia. A Biblioteca Afundada guarda o resto.',
      ini: 'Procure três registros na Biblioteca Afundada. Quero contar a história certa antes que ela acabe.',
      passos: [
        { t: 'examinar', zona: 'rc_biblioteca', nome: 'Registro da biblioteca', txt: 'Examine os 3 registros da Biblioteca Afundada', pistas: [
          { at: [0.2, 0.25], txt: 'Planta da rede de energia da capital, assinada à mão: "A. Carmesim, engenheiro-chefe".' },
          { at: [0.8, 0.3], txt: 'Diário: "Se a rede cair, a capital morre. Se eu me ligar a ela, só eu morro."' },
          { at: [0.5, 0.82], txt: 'A última página foi arrancada. Sobrou uma frase: "a coroa não deixa desligar".' }] },
        { t: 'falar', npc: 'ruc_milo', fim: true, txt: 'Leve os registros a Milo, na Cidadela' }],
      fim: 'Ele não quis a coroa. Ele quis salvar a cidade. Vou escrever isso primeiro.', rec: { xp: 42000, cel: 1500, rep: 230, rel: { min: 3 } } },
    { id: 'nz_s3', reg: 'nexuszero', nome: 'Nomes no Arquivo', doador: 'nz_eco', nivel: 80,
      desc: 'Eco voltou do Arquivo Infinito quase inteira. Ela quer encontrar os outros que ficaram.',
      ini: 'No Arquivo há três terminais com listas de nomes. Leia para mim. Talvez eu me lembre de alguém.',
      passos: [
        { t: 'examinar', zona: 'nz_arquivo', nome: 'Lista do arquivo', txt: 'Examine as 3 listas do Arquivo Infinito', pistas: [
          { at: [0.25, 0.3], txt: 'Lista 1: 412 nomes. Os passageiros da Linha 7 do metrô de Nexus.' },
          { at: [0.75, 0.32], txt: 'Lista 2: os padres da catedral da capital. Todos "arquivados" no Dia Zero.' },
          { at: [0.5, 0.8], txt: 'Lista 3: um único nome, sem data. O seu.' }] },
        { t: 'falar', npc: 'nz_eco', fim: true, txt: 'Volte a Eco, no Santuário' }],
      fim: 'O seu nome também estava lá. Então você também pode voltar de lá. Todos podem.', rec: { xp: 78000, cel: 2700, rep: 270, rel: { min: 3, sorte: 0.3 } } },
  );

  // ------------------------------------------------------------ masmorras e tesouros
  Object.assign(WORLD_MASMORRAS, {
    cofre_omega: { nome: 'Cofre Ômega', reg: 'metropole', zona: 'metro_subnivel', at: [0.82, 0.84], oculta: true, tema: 'lab', lv: 42,
      mobs: ['sentinela_neon', 'executor', 'atirador'], chefe: { tipo: 'executor', nome: 'DIRETOR DE SEGURANÇA', hp: 4.6, escolta: { sentinela_neon: 2 } },
      desc: 'O cofre da corporação, com os protótipos que nunca saíram do laboratório.' },
    cripta_real: { nome: 'Cripta Real', reg: 'ruinas', zona: 'rc_catedral', at: [0.5, 0.86], oculta: true, tema: 'cathedral', lv: 60,
      mobs: ['espectro', 'cavaleiro_rubro', 'enxame'], chefe: { tipo: 'cavaleiro_rubro', nome: 'PRIMEIRO CAVALEIRO', hp: 5.2, escolta: { espectro: 2 } },
      saida: { zona: 'rc_biblioteca', at: [0.2, 0.2] }, desc: 'A cripta onde o primeiro cavaleiro da coroa ainda monta guarda.' },
    raiz_codigo: { nome: 'Raiz do Código', reg: 'nexuszero', zona: 'nz_fenda', at: [0.18, 0.82], oculta: true, tema: 'tower', lv: 90,
      mobs: ['fragmento', 'arauto_nulo', 'golem_dados'], chefe: { tipo: 'golem_dados', nome: 'O COMPILADOR', hp: 6.2, escolta: { fragmento: 3 } },
      desc: 'A raiz de onde todo o código de Nexus Zero é compilado.' },
  });
  Object.assign(WORLD_TESOUROS, {
    tes_neon: { zona: 'metro_mercado', at: [0.86, 0.14], nome: 'Cofre do peixeiro', rec: { cel: 700, mat: { circuito: 3 }, rel: { min: 2 } } },
    tes_trilhos: { zona: 'metro_trilhos', at: [0.1, 0.86], nome: 'Carga perdida do trem', rec: { cel: 800, mat: { nucleo: 2 }, rel: { min: 3 } } },
    tes_jardins: { zona: 'rc_jardins', at: [0.5, 0.1], nome: 'Tesouro da capital', rec: { cel: 1600, mat: { essencia: 2 }, rel: { min: 3, sorte: 0.3 } } },
    tes_aqueduto: { zona: 'rc_aqueduto', at: [0.88, 0.5], nome: 'Bolsa do contrabandista', rec: { cel: 1400, rel: { min: 3 } } },
    tes_vazio: { zona: 'nz_vazio', at: [0.12, 0.12], nome: 'Cofre não compilado', rec: { cel: 3000, mat: { essencia: 3 }, rel: { min: 3, sorte: 0.5 } } },
    tes_servidores: { zona: 'nz_servidores', at: [0.9, 0.88], nome: 'Backup esquecido', rec: { cel: 2600, mat: { nucleo: 3 }, rel: { min: 3 } } },
  });
  Locais.montar();   // os andares das masmorras novas (as que já existiam ficam como estavam)
})();
