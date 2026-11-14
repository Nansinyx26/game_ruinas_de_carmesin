'use strict';
// ECLIPSE ZERO · Mundo aberto: missões secundárias, contratos e diário (Aventuras)
// ---------------------------------------------------------------------------
// Missões independentes da campanha e das missões de cada região (js/mundo/missoes.js), dadas
// pelos moradores (js/mundo/povo.js) e pelos quadros de contratos. Cada uma tem título,
// descrição, quem dá, nível recomendado, requisitos, passos (objetivos), recompensas e um
// histórico com o dia e a hora do mundo de cada avanço. Nada daqui mexe na história principal:
// o modo mundo tem o próprio salvamento e as missões nunca bloqueiam a campanha.
// PASSOS ('t'):
//   matar     n inimigos (de um tipo, elite, numa região ou zona)
//   entregar  materiais para alguém (ou no quadro: t 'quadro')
//   falar     conversar com alguém (levar uma carta, avisar, voltar a quem deu a missão)
//   achar     encontrar uma pessoa desaparecida numa zona (ela volta para casa)
//   examinar  pistas numa zona (investigar, sabotar)
//   chefe     um chefe opcional com nome que só aparece com a missão ativa
//   escolta   acompanhar alguém de um ponto a outro de uma zona, com emboscadas
//   local     chegar a um lugar escondido
//   masmorra  vencer uma masmorra (js/mundo/locais.js)
//   evento    participar de eventos da região (js/mundo/eventos.js)
// Um passo com 'fim' conclui a missão; com 'escolha' a conclusão pergunta o que o herói faz,
// e cada resposta tem a própria recompensa. As recompensas são dadas uma vez só (o estado
// vira 'feita' antes de pagar). CONTRATOS: dois por região a cada dia do mundo (caça e coleta),
// no quadro da zona de chegada. O DIÁRIO (aba da mochila) lista ativas, disponíveis e
// concluídas; uma missão rastreada aparece no quadro do HUD, no mapa e com marcador na zona.
// Estado: World.state.aventuras[id] = { st, p, prog, hist, vistas, leva, ev0, dia, aviso }.
// ---------------------------------------------------------------------------
const WORLD_AVENTURAS = [
  // ------------------------------------------------------------ Ruínas de Carmesin
  { id: 'car_s1', reg: 'carmesin', nome: 'Peças para o Gerador', doador: 'tomas', nivel: 1,
    desc: 'O gerador do Mercado Afundado falha toda noite. Tomás precisa de sucata boa para trocar as peças queimadas.',
    ini: 'Sucata! Seis peças, das boas. As máquinas que você derruba soltam, e os montes de ferro-velho também.',
    passos: [{ t: 'entregar', npc: 'tomas', mat: { sucata: 6 }, fim: true, txt: 'Junte 6 Sucatas de Máquina e leve ao Tomás' }],
    fim: 'Ouviu isso? É o gerador ronronando. Isto é seu. E presta atenção: eu te ensino a montar uma cápsula.',
    rec: { xp: 220, cel: 40, rep: 60, cons: { elixir: 1 }, oficio: { criacao: 40 } } },
  { id: 'car_s2', reg: 'carmesin', nome: 'O Menino da Praça', doador: 'marta', nivel: 2,
    desc: 'Lucas, o filho de Marta, sumiu há dois dias. Tomás ouviu um rádio de criança nas Galerias de Serviço.',
    ini: 'As Galerias… ele sempre quis ver os túneis. Por favor. Traga meu filho.',
    passos: [
      { t: 'achar', zona: 'galerias', at: [0.86, 0.62], pessoa: { nome: 'LUCAS', model: 'civil', variant: 3 },
        fala: 'Você… não é uma máquina? Eu me escondi aqui quando os drones vieram. Minha mãe vai me matar! Fala pra ela que eu estou indo pra casa!', txt: 'Procure Lucas nas Galerias de Serviço' },
      { t: 'falar', npc: 'marta', fim: true, txt: 'Conte a Marta que Lucas está voltando' }],
    fim: 'Ele está vivo. Está VIVO. Eu… nem sei como agradecer.',
    escolha: { txt: 'Isto era do pai dele. É tudo o que eu tenho de valor. Aceite, por favor.', opcoes: [
      { txt: 'Aceito. Obrigado, Marta.', fim: 'Que ele te proteja como protegia a gente.', rec: { unico: { unico: 'Amuleto da Praça', b: 'placa', r: 2, st: { vida: 30, defesa: 0.03 } } } },
      { txt: 'Guarde para o Lucas. Ele vai precisar.', fim: 'Você… é uma pessoa boa. A vila inteira vai saber disso.', rec: { rep: 100, cel: 30 } }] },
    rec: { xp: 320, cel: 30, rep: 50 } },
  { id: 'car_s3', reg: 'carmesin', nome: 'A Voz do Laboratório', doador: 'ivo', nivel: 4,
    desc: 'A gravação do Dr. Ivo quer saber o que aconteceu com o Experimento 7, o protótipo que fugiu da ala C no Dia Zero.',
    ini: 'O Experimento 7. Ele sumiu da contenção às 03:12. Os registros da ala C devem dizer para onde. Pode verificar?',
    passos: [
      { t: 'examinar', zona: 'laboratorio', nome: 'Registro da ala C', txt: 'Examine os registros da ala C no Laboratório Esquecido', pistas: [
        { at: [0.2, 0.55], txt: 'Um crachá queimado: "EXP-7 · contenção nível 4". A porta da cela foi aberta por dentro.' },
        { at: [0.62, 0.2], txt: 'Marcas de garra no metal. Vão na direção do sudeste, para as Fendas Rubras.' },
        { at: [0.45, 0.86], txt: 'Um terminal repete sem parar: "EXP-7 responde ao nome de ECO. Não responda de volta."' }] },
      { t: 'chefe', zona: 'fendas', at: [0.78, 0.82], chefe: { tipo: 'cacador', nome: 'EXPERIMENTO 7 · ECO', hp: 3, escolta: { rastejador: 2 } }, txt: 'Encontre e derrote o Experimento 7 nas Fendas Rubras' },
      { t: 'falar', npc: 'ivo', fim: true, txt: 'Volte ao Dr. Ivo no Laboratório Esquecido' }],
    fim: 'Então era isso. Nós criamos um eco de você… e ele se perdeu sozinho no escuro. Obrigado. Arquivo encerrado.',
    rec: { xp: 650, cel: 80, rep: 80, rel: { min: 2, sorte: 0.3 } } },
  { id: 'car_s4', reg: 'carmesin', nome: 'Carta para Velmora', doador: 'ancia', nivel: 6, regioes: ['velmora'],
    desc: 'A Anciã escreveu para a Guarda-Floresta de Velmora. Ninguém mais atravessa a mata levando cartas.',
    ini: 'Leve isto à Guarda-Floresta, na Clareira dos Sinais. E não abra. Algumas coisas são só nossas.',
    leva: 'Carta selada da Anciã',
    passos: [
      { t: 'falar', npc: 'guarda', opcao: 'Entregar a carta da Anciã', fala: 'Uma carta da velha de Carmesin? Ela ainda escreve com tinta… Diga a ela: as raízes lembram.', txt: 'Entregue a carta à Guarda-Floresta, na Clareira dos Sinais (Velmora)' },
      { t: 'falar', npc: 'ancia', fim: true, opcao: 'Trazer a resposta de Velmora', txt: 'Leve a resposta à Anciã, no Mercado Afundado' }],
    fim: '"As raízes lembram." Então ela me perdoou. Obrigada, menino. Você não sabe o peso que tirou de mim.',
    rec: { xp: 520, cel: 60, rep: 60, repExtra: { velmora: 40 } } },
  { id: 'car_s5', reg: 'carmesin', nome: 'Defesa das Ruínas', doador: 'rui', nivel: 3,
    desc: 'As incursões das máquinas não param. O Capitão Rui quer saber se você aguenta uma de verdade.',
    ini: 'Quando vir o aviso de evento nas ruínas, vá. Segure a posição até o fim. Depois volte aqui.',
    passos: [{ t: 'evento', reg: 'carmesin', n: 1, txt: 'Participe de um evento nas Ruínas de Carmesin (aviso no mapa)' },
      { t: 'falar', npc: 'rui', fim: true, txt: 'Conte ao Capitão Rui' }],
    fim: 'Segurou. Bom. A maioria corre. Isto é para quem não corre.',
    rec: { xp: 380, cel: 50, rep: 70, cons: { tonico: 1 } } },
  // ------------------------------------------------------------ Velmora
  { id: 'vel_s1', reg: 'velmora', nome: 'Ervas do Lago Escuro', doador: 'maira', nivel: 8,
    desc: 'Maíra precisa de erva luminosa para os remédios do vilarejo. A erva cresce nos campos abertos de Velmora.',
    ini: 'Cinco ramos de erva luminosa. Colha com cuidado: a raiz fica, a erva volta.',
    passos: [{ t: 'entregar', npc: 'maira', mat: { erva: 5 }, fim: true, txt: 'Colha 5 Ervas Luminosas e leve a Maíra' }],
    fim: 'Perfeitas. Com isso eu curo o vilarejo inteiro por um mês. Leve uma cápsula; eu fiz com a erva da semana passada.',
    rec: { xp: 750, cel: 90, rep: 80, capsulas: 1, oficio: { coleta: 40 } } },
  { id: 'vel_s2', reg: 'velmora', nome: 'Presa-Cinzenta', doador: 'bento', nivel: 10,
    desc: 'Um lobo de raiz alfa, enorme e cinzento, ronda a Trilha dos Galhos Mortos. Bento quer a cabeça dele.',
    ini: 'Presa-Cinzenta. Cicatriz no focinho, olho de vidro. Ele mora no lado norte da trilha. Vá com veneno no bolso e paciência.',
    passos: [
      { t: 'chefe', zona: 'velmora_trilha', at: [0.72, 0.24], chefe: { tipo: 'lobo_raiz', nome: 'PRESA-CINZENTA', hp: 4, escolta: { lobo_raiz: 2 } }, txt: 'Cace Presa-Cinzenta na Trilha dos Galhos Mortos' },
      { t: 'falar', npc: 'bento', fim: true, txt: 'Volte ao Bento, na Clareira dos Sinais' }],
    fim: 'Você… pegou o Presa-Cinzenta? Sozinho? Tá, agora EU vou contar essa história. Toma, fiz um colar com a presa dele.',
    rec: { xp: 1050, cel: 120, rep: 100, unico: { unico: 'Colar de Presa-Cinzenta', b: 'servo', r: 3, st: { veloc: 0.06, critico: 0.04 } } } },
  { id: 'vel_s3', reg: 'velmora', nome: 'O Observatório Engolido', doador: 'italo', nivel: 11,
    desc: 'Ítalo viu uma cúpula de vidro coberta de musgo nas Ruínas Engolidas. Ninguém sabe o que tem lá dentro.',
    ini: 'Cúpula de vidro. Canto nordeste das ruínas. Vai lá. Me conta.',
    passos: [
      { t: 'local', zona: 'velmora_ruinas', at: [0.86, 0.16], nome: 'Observatório Engolido', txt: 'Encontre o observatório nas Ruínas Engolidas' },
      { t: 'examinar', zona: 'velmora_ruinas', nome: 'Diário do astrônomo', txt: 'Leia o diário do astrônomo', pistas: [
        { at: [0.8, 0.1], txt: '"O céu escureceu às 03:12. Não era nuvem. Era um sinal, e ele vinha de dentro da cidade."' },
        { at: [0.93, 0.25], txt: '"Apontei o telescópio para o eclipse. O eclipse olhou de volta. Amanhã eu desligo tudo."' }] },
      { t: 'falar', npc: 'italo', fim: true, txt: 'Conte ao Ítalo o que achou' }],
    fim: 'Um sinal de dentro da cidade. Hm. Isso muda coisa. Toma. Achei no lago, não é meu.',
    rec: { xp: 950, cel: 100, rep: 70, rel: { min: 2 } } },
  // ------------------------------------------------------------ Lagoa Cristalina
  { id: 'lag_s1', reg: 'lagoa', nome: 'Redes Rasgadas', doador: 'ze', nivel: 12,
    desc: 'Os carangueijos de casco de aço cortaram as redes do Velho Zé. Ele quer os bichos longe e cristal para a rede nova.',
    ini: 'Oito carangueijos de aço. Depois três cristais, para a rede brilhar e os peixes voltarem. É ciência. Mais ou menos.',
    passos: [
      { t: 'matar', alvo: 'carangueijo', n: 8, reg: 'lagoa', txt: 'Derrote 8 carangueijos de aço na Lagoa' },
      { t: 'entregar', npc: 'ze', mat: { cristal: 3 }, fim: true, txt: 'Leve 3 Cristais da Lagoa ao Velho Zé' }],
    fim: 'Rede nova, lagoa limpa. Amanhã tem peixe. Se não tiver, a culpa é sua.',
    rec: { xp: 1150, cel: 120, rep: 90 } },
  { id: 'lag_s2', reg: 'lagoa', nome: 'Luz no Farol', doador: 'decio', nivel: 13,
    desc: 'Décio, o técnico do farol, precisa atravessar a Ilha dos Cristais até a ponte do farol. Sozinho, ele não chega.',
    ini: 'Eu ando, você protege. Fala comigo quando estiver pronto e a gente vai. Fica perto de mim, por favor.',
    passos: [{ t: 'escolta', zona: 'lagoa_ilha', de: [0.22, 0.26], ate: [0.86, 0.82], pessoa: { id: 'decio', nome: 'DÉCIO', model: 'civil', variant: 0, hp: 180 },
      emboscadas: [{ p: 0.3, mobs: { carangueijo: 2, medusa: 1 } }, { p: 0.66, mobs: { medusa: 2, drone: 1 } }], fim: true,
      fala: 'Chegamos! Daqui eu vejo o farol. Esta noite ele acende. Prometo!', txt: 'Escolte Décio pela Ilha dos Cristais até a ponte do farol' }],
    fim: 'Chegamos! Daqui eu vejo o farol. Esta noite ele acende. Prometo!',
    rec: { xp: 1200, cel: 120, rep: 110, cons: { retorno: 1 } } },
  { id: 'lag_s3', reg: 'lagoa', nome: 'A Luz Sob a Água', doador: 'iara', nivel: 16,
    desc: 'Iara vê na água uma luz que chama os pescadores para o fundo. As pistas estão no Recife de Vidro.',
    ini: 'A luz tem um olho. Eu vi. Procure as marcas no recife e depois desça às Ruínas Submersas.',
    passos: [
      { t: 'examinar', zona: 'lagoa_recife', nome: 'Marcas no recife', txt: 'Examine as marcas no Recife de Vidro', pistas: [
        { at: [0.25, 0.3], txt: 'Redes queimadas por eletricidade, todas apontando para o sul.' },
        { at: [0.7, 0.55], txt: 'Um cristal partido ao meio; dentro, um circuito do Nexus.' },
        { at: [0.4, 0.85], txt: 'Pegadas de pescador indo para dentro da água. Nenhuma voltando.' }] },
      { t: 'chefe', zona: 'lagoa_submersa', at: [0.5, 0.6], chefe: { tipo: 'medusa', nome: 'OLHO DA MARÉ', hp: 4.5, escolta: { medusa: 2, carangueijo: 1 } }, txt: 'Destrua o Olho da Maré nas Ruínas Submersas' },
      { t: 'falar', npc: 'iara', fim: true, txt: 'Volte a Iara, na Vila dos Pescadores' }],
    fim: 'A água está escura de novo. Escura e limpa. Os pescadores vão poder sonhar outra vez.',
    rec: { xp: 1600, cel: 160, rep: 110, rel: { min: 3, sorte: 0.2 } } },
  // ------------------------------------------------------------ Nexus
  { id: 'nex_s1', reg: 'nexus', nome: 'Panfletos da Resistência', doador: 'kira', nivel: 10,
    desc: 'Kira precisa que três pacotes de panfletos cheguem aos contatos da Resistência espalhados por Nexus.',
    ini: 'Teca na Avenida Central, Moura no metrô, Bruno no Mercado Vertical. Não abra os pacotes, não pare para ler. Vá.',
    leva: 'Pacotes de panfletos',
    passos: [
      { t: 'falar', npc: 'teca', opcao: 'Entregar o pacote', fala: 'Finalmente. Some daqui antes que alguém veja a gente junto.', txt: 'Entregue um pacote a Teca, na Avenida Central' },
      { t: 'falar', npc: 'moura', opcao: 'Entregar o pacote', fala: 'Panfleto? Eu esperava dinheiro. Tá bom, tá bom, eu distribuo.', txt: 'Entregue um pacote a Moura, no Metrô Abandonado' },
      { t: 'falar', npc: 'bruno', opcao: 'Entregar o pacote', fala: 'Psiu! Coloca embaixo dos rádios. Isso. Ninguém viu nada.', txt: 'Entregue um pacote a Bruno, no Mercado Vertical' },
      { t: 'falar', npc: 'kira', fim: true, txt: 'Volte a Kira, no Portão de Nexus' }],
    fim: 'Amanhã a cidade inteira vai ler o que o Arauto esconde. Isso vale mais que mil tiros.',
    rec: { xp: 950, cel: 110, rep: 100 } },
  { id: 'nex_s2', reg: 'nexus', nome: 'O Engenheiro Sumido', doador: 'otto', nivel: 13,
    desc: 'Vítor, aprendiz de Otto, foi buscar peças no Metrô Abandonado e não voltou.',
    ini: 'Ele é teimoso e jovem, que é o mesmo que burro e jovem. Traga o menino de volta, por favor.',
    passos: [
      { t: 'achar', zona: 'nexus_metro', at: [0.82, 0.82], pessoa: { nome: 'VÍTOR', model: 'civil', variant: 2 },
        fala: 'Ufa! Os drones me cercaram e eu me escondi no vagão. Achei as peças, pelo menos! Diz pro Otto que eu estou indo.', txt: 'Encontre Vítor no Metrô Abandonado' },
      { t: 'falar', npc: 'otto', fim: true, txt: 'Avise Otto, no Mercado Vertical' }],
    fim: 'Vivo e com as peças! Burro, mas competente. Leve estes núcleos, eu tinha guardado para ele.',
    rec: { xp: 1050, cel: 130, rep: 80, mat: { nucleo: 2 } } },
  { id: 'nex_s3', reg: 'nexus', nome: 'Sabotagem', doador: 'kira', nivel: 14, req: ['nex_s1'],
    desc: 'Os relés de vigilância do Arauto alimentam as câmeras da cidade. Sem eles, a Resistência se move às cegas — para o Arauto.',
    ini: 'Dois relés na Avenida, um no metrô. Desligue os três e o Arauto fica cego por uma semana.',
    passos: [
      { t: 'examinar', zona: 'nexus_avenida', nome: 'Relé de vigilância', verbo: 'Sabotar', txt: 'Sabote os 2 relés da Avenida Central', pistas: [
        { at: [0.15, 0.2], txt: 'Fios cortados. A câmera do poste mais próximo apaga com um estalo.' },
        { at: [0.85, 0.6], txt: 'O relé solta faíscas e morre. Um drone ao longe para no ar, confuso.' }] },
      { t: 'examinar', zona: 'nexus_metro', nome: 'Relé de vigilância', verbo: 'Sabotar', txt: 'Sabote o relé do Metrô Abandonado', pistas: [
        { at: [0.5, 0.15], txt: 'O último relé apaga. Por um instante, a cidade inteira fica em silêncio.' }] },
      { t: 'falar', npc: 'kira', fim: true, txt: 'Volte a Kira' }],
    fim: 'Uma semana de olhos fechados. A Resistência não esquece isso.',
    escolha: { txt: 'Temos pouco, mas é seu. Ou… você poderia deixar para comprar remédio para quem precisa.', opcoes: [
      { txt: 'Eu aceito a recompensa.', fim: 'Justo. Você arriscou o pescoço.', rec: { cel: 150, rel: { min: 2 } } },
      { txt: 'Fique com tudo. Compre os remédios.', fim: 'Você é dos nossos. De verdade.', rec: { rep: 140 } }] },
    rec: { xp: 1350, rep: 60 } },
  // ------------------------------------------------------------ Seraph
  { id: 'ser_s1', reg: 'seraph', nome: 'A Caravana de Sal', doador: 'salma', nivel: 15,
    desc: 'A caravana de sal precisa atravessar o Mar de Dunas. Os escorpiões de sucata atacam quem passa devagar.',
    ini: 'A caravana espera no lado oeste das dunas. Fale com o guia e ande junto. Se ela cair, o oásis fica sem remédio.',
    passos: [
      { t: 'escolta', zona: 'seraph_dunas', de: [0.1, 0.5], ate: [0.9, 0.5], pessoa: { nome: 'CARAVANA DE SAL', model: 'civil', variant: 1, hp: 260 },
        emboscadas: [{ p: 0.25, mobs: { escorpiao: 2 } }, { p: 0.55, mobs: { escorpiao: 2, cacador: 1 } }, { p: 0.8, mobs: { escorpiao: 3 } }],
        fala: 'O outro lado! A caravana passou inteira. Avise Salma, ela vai dançar.', txt: 'Escolte a caravana pelo Mar de Dunas' },
      { t: 'falar', npc: 'salma', fim: true, txt: 'Volte a Salma, no Oásis de Seraph' }],
    fim: 'Inteira? A caravana inteira? Hoje o oásis bebe à sua saúde.',
    rec: { xp: 1450, cel: 180, rep: 120, mat: { fragmento: 3 } } },
  { id: 'ser_s2', reg: 'seraph', nome: 'A Tumba Esquecida', doador: 'abel', nivel: 18,
    desc: 'Sob a Cidade Engolida há uma tumba mais antiga que a do Faraó. Abel quer saber o que as paredes contam.',
    ini: 'Desça à tumba esquecida, na Cidade Engolida, e volte com o que encontrar. Se voltar.',
    passos: [{ t: 'masmorra', id: 'tumba', txt: 'Vença a Tumba Esquecida, sob a Cidade Engolida' },
      { t: 'falar', npc: 'abel', fim: true, txt: 'Conte a Abel o que viu' }],
    fim: 'O primeiro código foi escrito à mão… por alguém que tinha medo. Guarde isto: é a cópia que ele deixou.',
    rec: { xp: 1850, cel: 200, rep: 120, unico: { unico: 'Pergaminho do Primeiro Código', b: 'chip', r: 3, st: { recarga: 0.06, energia: 25 } } } },
  { id: 'ser_s3', reg: 'seraph', nome: 'O Escorpião-Rei', doador: 'salma', nivel: 17, req: ['ser_s1'],
    desc: 'Os escorpiões têm um rei, e ele mora no Cânion Rubro. Enquanto ele viver, nenhuma caravana fica segura.',
    ini: 'O ferrão dele é do tamanho de um homem. Leve antídoto. Leve coragem. Traga o ferrão.',
    passos: [
      { t: 'chefe', zona: 'seraph_canion', at: [0.75, 0.7], chefe: { tipo: 'escorpiao', nome: 'ESCORPIÃO-REI', hp: 4.5, escolta: { escorpiao: 3 } }, txt: 'Derrote o Escorpião-Rei no Cânion Rubro' },
      { t: 'falar', npc: 'salma', fim: true, txt: 'Leve o ferrão a Salma' }],
    fim: 'O ferrão! As caravanas vão cantar isso por gerações. E eu vou cantar mais alto.',
    rec: { xp: 1750, cel: 200, rep: 100, rel: { min: 3, sorte: 0.4 } } },
  // ------------------------------------------------------------ Asterion
  { id: 'ast_s1', reg: 'asterion', nome: 'Pegadas na Geleira', doador: 'sofia', nivel: 20,
    desc: 'Elo, irmão de Sofia, subiu para a Geleira Partida há três dias. Ele sempre volta. Desta vez não voltou.',
    ini: 'Ele usa um casaco azul. Se estiver ferido, diga que eu estou esperando. Ele vai levantar.',
    passos: [
      { t: 'achar', zona: 'asterion_geleira', at: [0.2, 0.78], pessoa: { nome: 'ELO', model: 'civil', variant: 0 },
        fala: 'Minha perna… mas eu estou bem. A Sofia mandou você? Claro que mandou. Diga que eu desço ainda hoje.', txt: 'Encontre Elo na Geleira Partida' },
      { t: 'falar', npc: 'sofia', fim: true, txt: 'Avise Sofia, no Acampamento da Encosta' }],
    fim: 'Eu disse! Ele sempre volta. Obrigada. Leve isto; protege do frio e de coisa pior.',
    rec: { xp: 1950, cel: 210, rep: 110, cons: { pele: 2 } } },
  { id: 'ast_s2', reg: 'asterion', nome: 'Minério para a Vigília', doador: 'bram', nivel: 19,
    desc: 'A Vigília precisa reforçar os portões da fortaleza antes da próxima nevasca.',
    ini: 'Seis minérios de gelo e quatro sucatas. Sem desculpas, sem atraso.',
    passos: [{ t: 'entregar', npc: 'bram', mat: { gelo: 6, sucata: 4 }, fim: true, txt: 'Leve 6 Minérios de Gelo e 4 Sucatas ao Sargento Bram' }],
    fim: 'Portão reforçado. Você trabalha bem. Para um civil.',
    rec: { xp: 1750, cel: 190, rep: 120, oficio: { coleta: 60 } } },
  { id: 'ast_s3', reg: 'asterion', nome: 'O Sinal do Pico', doador: 'neva', nivel: 22,
    desc: 'As antenas das Cavernas de Gelo captam um sinal que repete um nome. Neva quer saber de onde ele vem.',
    ini: 'Examine as três antenas. Depois desça onde o eco nasce. E feche bem a porta quando voltar.',
    passos: [
      { t: 'examinar', zona: 'asterion_caverna', nome: 'Antena de escuta', txt: 'Examine as 3 antenas das Cavernas de Gelo', pistas: [
        { at: [0.2, 0.25], txt: 'A antena treme. O visor mostra uma palavra em loop: um nome. O seu.' },
        { at: [0.75, 0.4], txt: 'Os cabos descem pela rocha, para dentro da montanha.' },
        { at: [0.5, 0.82], txt: 'O sinal fica mais forte para baixo. Algo responde antes do eco.' }] },
      { t: 'masmorra', id: 'eco', txt: 'Vença a Caverna do Eco' },
      { t: 'falar', npc: 'neva', fim: true, txt: 'Conte a Neva, na Guarnição da Vigília' }],
    fim: 'Então o pico chama você pelo nome. Isso não é coincidência, é convite. Tome cuidado lá em cima.',
    rec: { xp: 2700, cel: 260, rep: 140, rel: { min: 3 } } },
  // ------------------------------------------------------------ Cratera de Obsidiano
  { id: 'obs_s1', reg: 'obsidiano', nome: 'Forja Fria', doador: 'ignea', nivel: 25,
    desc: 'A forja do posto está fria. A Mestra Ígnea precisa de obsidiana e núcleos para reacender o fogo certo.',
    ini: 'Seis obsidianas brutas e dois núcleos de elite. Fogo de verdade come caro.',
    passos: [{ t: 'entregar', npc: 'ignea', mat: { obsidiana: 6, nucleo: 2 }, fim: true, txt: 'Leve 6 Obsidianas Brutas e 2 Núcleos Instáveis à Mestra Ígnea' }],
    fim: 'Ouviu? A forja respira de novo. Primeira coisa que ela fez: isto. É seu.',
    rec: { xp: 2700, cel: 280, rep: 140, unico: { unico: 'Brasa da Mestra', b: 'nucleo', r: 3, st: { dano: 0.09, critico: 0.03 } } } },
  { id: 'obs_s2', reg: 'obsidiano', nome: 'Dias de Fogo', doador: 'cinza', nivel: 26,
    desc: 'Erupções, incursões, chuva de brasas: na cratera todo dia tem um evento. Cinza quer saber quem ajuda.',
    ini: 'Dois eventos na cratera. Ajude em dois e eu te dou do meu estoque bom. O que não explode.',
    passos: [{ t: 'evento', reg: 'obsidiano', n: 2, txt: 'Participe de 2 eventos na Cratera de Obsidiano' },
      { t: 'falar', npc: 'cinza', fim: true, txt: 'Volte a Cinza, no Posto da Borda' }],
    fim: 'Dois! E com as duas sobrancelhas. Melhor que eu. Toma, tônicos do bom.',
    rec: { xp: 2900, cel: 300, rep: 160, cons: { tonico: 2 } } },
  { id: 'obs_s3', reg: 'obsidiano', nome: 'O Primeiro Fogo', doador: 'ignea', nivel: 30, req: ['obs_s1'],
    desc: 'Sob a Forja Antiga queima a chama que acendeu a primeira forja. Algo a guarda.',
    ini: 'Desça à câmara do Primeiro Fogo. Se a chama ainda queima, traga uma brasa. Se não queima, traga a verdade.',
    passos: [{ t: 'masmorra', id: 'primeiro_fogo', txt: 'Vença a Câmara do Primeiro Fogo, sob a Forja Antiga' },
      { t: 'falar', npc: 'ignea', fim: true, txt: 'Volte à Mestra Ígnea' }],
    fim: 'A brasa… ainda quente. Depois de tudo.',
    escolha: { txt: 'Onde essa chama deve queimar agora?', opcoes: [
      { txt: 'Aqui, na forja do posto.', fim: 'Então os forjadores vão lembrar seu nome toda vez que o martelo bater.', rec: { rep: 200, cel: 200 } },
      { txt: 'Em Carmesin, onde tudo começou.', fim: 'Levar o fogo para o coração das ruínas… Ousado. Os Desconectados vão precisar dele.', rec: { repExtra: { carmesin: 200 }, rel: { min: 4 } } }] },
    rec: { xp: 4300, cel: 300, rep: 120 } },
];
// Alvos dos contratos de caça de cada região
const WORLD_CONTRATO_ALVOS = {
  carmesin: ['rastejador', 'drone', 'cacador'], velmora: ['lobo_raiz', 'esporo'], lagoa: ['medusa', 'carangueijo'], nexus: ['atirador', 'drone', 'legionario'],
  seraph: ['escorpiao', 'cacador'], asterion: ['lobo_neve', 'golem_gelo'], obsidiano: ['magma', 'diabrete'],
};
const WORLD_NOMES_ALVO = { rastejador: 'rastejadores', drone: 'drones', cacador: 'caçadores', legionario: 'legionários', sacerdote: 'sacerdotes', atirador: 'atiradores',
  lobo_raiz: 'lobos de raiz', esporo: 'sentinelas de esporos', medusa: 'medusas elétricas', carangueijo: 'carangueijos de aço', escorpiao: 'escorpiões de sucata',
  lobo_neve: 'lobos da neve', golem_gelo: 'golens de gelo', magma: 'elementais de magma', diabrete: 'diabretes', enxame: 'enxames' };

// Marcador de missão numa zona: pistas (examinar/sabotar) e o lugar escondido (local)
class MissaoProp extends WorldProp {
  constructor(sub, x, y, data) {
    super('missao', x, y, data);
    this.sub = sub; this.feito = false; this.alvoMissao = data.q;
    this.lightRgb = '255,212,122'; this.name = (data.nome || 'PISTA').toUpperCase();
    this.verb = data.verbo || 'Examinar'; this.height = 18; this.emblema = sub === 'pista' ? '?' : '◆';
  }
  get used() { return this.feito; }
  update(dt) { this.t += dt; if (this.talkT > 0) this.talkT -= dt; }
  canTalk() { return this.sub === 'pista' && !this.feito; }
  talk() { this.talkT = 1.2; Aventuras.tocar(this); }
  draw(ctx) {
    if (this.feito) return;
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y), rgb = this.lightRgb, k = 0.6 + 0.3 * Math.sin(this.t * 3);
    if (this.sub === 'local' && dist(game.player.x, game.player.y, this.x, this.y) > 280) return;
    ctx.save();
    ctx.strokeStyle = rgba(rgb, 0.8 * k); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, this.sub === 'local' ? 30 : 13, this.sub === 'local' ? 15 : 6.5, 0, 0, TAU); ctx.stroke();
    const y = sy - this.height + Math.sin(this.t * 2) * 3, s = 6;
    ctx.fillStyle = rgba(rgb, 0.9); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, y - s * 1.4); ctx.lineTo(sx + s, y); ctx.lineTo(sx, y + s * 1.4); ctx.lineTo(sx - s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  drawEmissive(ctx) {
    if (this.feito) return;
    if (this.sub === 'local' && dist(game.player.x, game.player.y, this.x, this.y) > 280) return;
    const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    GlowCache.draw(ctx, this.lightRgb, sx, sy - this.height, this.sub === 'local' ? 60 : 28, 0.35 + 0.12 * Math.sin(this.t * 3));
    ctx.restore();
  }
}

// Pessoa escoltada: espera o herói falar, anda até o destino, para quando ele se afasta e
// perde vida com inimigos acordados por perto (o herói precisa derrubá-los depressa)
class Escoltado extends Morador {
  constructor(def, x, y, q, P) {
    super(def, x, y);
    this.alvoMissao = q.id; this.passo = P; this.maxHp = this.hp = P.pessoa.hp || 180;
    this.estado = 'espera'; this.destino = null; this.inicio = { x, y }; this.feitas = 0; this.hitT = 0;
    this.papel = 'Escolta'; this.verb = 'Conversar';
  }
  canTalk() { return this.estado !== 'morto'; }
  talk() { Povo.conversar(this); }
  progresso() {
    const D = this.destino, I = this.inicio, tot = dist(I.x, I.y, D.x, D.y) || 1;
    return clamp(1 - dist(this.x, this.y, D.x, D.y) / tot, 0, 1);
  }
  update(dt) {
    this.animTime += dt; this.stateTime += dt;
    if (this.talkT > 0) this.talkT -= dt;
    if (this.hitT > 0) this.hitT -= dt;
    const p = game.player;
    let anda = false;
    if (this.estado === 'andando') {
      // pressão: cada inimigo acordado perto tira vida
      let n = 0;
      for (const e of game.enemies) if (e.alive && e.state !== 'dying' && !e.dormant && dist2(e.x, e.y, this.x, this.y) < 115 * 115) n++;
      if (n) { this.hp -= n * 3.2 * dt; if (this.hitT <= 0) { this.hitT = 0.6; game.particles.sparks(this.x, this.y, 22, rand(0, TAU), 4, '255,90,110', 160, 1); } }
      if (this.hp <= 0) { Aventuras.falhaEscolta(this); return; }
      const D = this.destino, longe = dist2(p.x, p.y, this.x, this.y) > 260 * 260;
      if (!n && !longe && this.talkT <= 0) {
        const dx = D.x - this.x, dy = D.y - this.y, d = Math.hypot(dx, dy);
        if (d < 26) { Aventuras.chegouEscolta(this); return; }
        const v = 44 * dt;
        let nx = this.x + (dx / d) * v, ny = this.y + (dy / d) * v;
        if (!game.room.canStand(nx, ny, 12)) { const s = Math.sin(this.animTime) > 0 ? 1 : -1; nx = this.x - (dy / d) * v * s; ny = this.y + (dx / d) * v * s; }
        if (game.room.canStand(nx, ny, 12)) { this.x = nx; this.y = ny; anda = true; }
        this.facing = angleLerp(this.facing, Math.atan2(dy, dx), 1 - Math.exp(-8 * dt));
      }
      Aventuras.emboscada(this);
    }
    if (this.perigo() && !anda) this.setState('fear');
    else if (this.talkT > 0) this.setState('talk');
    else this.setState(anda ? 'walk' : 'idle');
    if (!anda && this.estado !== 'andando') {
      const alvo = dist(this.x, this.y, p.x, p.y) < 180 ? Math.atan2(p.y - this.y, p.x - this.x) : this.baseFacing;
      this.facing = angleLerp(this.facing, alvo, 1 - Math.exp(-4 * dt));
    }
  }
}

const Aventuras = {
  get S() { const W = World.state; if (!W.aventuras) W.aventuras = {}; return W.aventuras; },
  dia() { return World.state.dia || 1; },
  // Definição pelo id (as fixas e os contratos do dia: ct_<região>_<dia>_<k>)
  def(id) {
    const q = WORLD_AVENTURAS.find((a) => a.id === id);
    if (q) return q;
    const m = /^ct_([a-z]+)_(\d+)_(\d)$/.exec(id || '');
    return m && WORLD_REGIONS.some((r) => r.id === m[1]) ? this.contrato(m[1], +m[2], +m[3]) : null;
  },
  st(id) { return this.S[id] || null; },
  ativa(id) { const s = this.S[id]; return !!s && s.st === 'ativa'; },
  feita(id) { const s = this.S[id]; return !!s && s.st === 'feita'; },
  ativas() { return Object.keys(this.S).filter((id) => this.S[id].st === 'ativa').map((id) => this.def(id)).filter(Boolean); },
  passo(q) { const s = this.S[q.id]; return s ? q.passos[Math.min(s.p, q.passos.length - 1)] : null; },
  nivelHeroi() { return game.activeProgress().level; },
  // Pode aceitar agora? Devolve '' (pode) ou o motivo
  bloqueio(q) {
    if (this.S[q.id]) return this.S[q.id].st === 'feita' ? 'concluída' : 'em andamento';
    if (!World.regionOpen(q.reg)) return 'região bloqueada';
    for (const r of q.regioes || []) if (!World.regionOpen(r)) return `${worldRegion(r).name} bloqueada`;
    for (const r of q.req || []) if (!this.feita(r)) return `depois de "${this.def(r).nome}"`;
    if (this.nivelHeroi() < q.nivel - 2) return `nível ${q.nivel - 2}`;
    return '';
  },
  disponivel(q) { return !this.bloqueio(q); },

  // ------------------------------------------------------------ contratos do quadro
  contrato(reg, dia, k) {
    const R = worldRegion(reg), hub = WORLD_ZONES[R.hub], lv = hub ? hub.lv : 1, rnd = mulberry32((dia * 7919 + R.order * 131 + k * 17) >>> 0);
    const id = `ct_${reg}_${dia}_${k}`, base = { id, reg, contrato: true, cat: 'Contrato', doador: null, nivel: Math.max(1, lv - 2), dia };
    if (k === 0) {
      const alvos = WORLD_CONTRATO_ALVOS[reg], alvo = alvos[Math.floor(rnd() * alvos.length)], n = 6 + R.order + Math.floor(rnd() * 4);
      return Object.assign(base, { nome: `Caçada: ${WORLD_NOMES_ALVO[alvo] || alvo}`, desc: `O quadro paga por ${n} ${WORLD_NOMES_ALVO[alvo] || alvo} a menos em ${R.name}. Volte ao quadro para receber.`,
        passos: [{ t: 'matar', alvo, n, reg, txt: `Derrote ${n} ${WORLD_NOMES_ALVO[alvo] || alvo} em ${R.name}` }, { t: 'quadro', reg, fim: true, txt: 'Receba no quadro de contratos' }],
        rec: { xp: 60 * lv, cel: 18 + lv * 4, rep: 30 } });
    }
    const mat = WORLD_MAT_REG[reg], n = 3 + Math.floor(R.order / 2) + Math.floor(rnd() * 2);
    return Object.assign(base, { nome: `Coleta: ${WORLD_MATERIAIS[mat].nome}`, desc: `Alguém em ${R.name} precisa de ${n} ${WORLD_MATERIAIS[mat].nome}. Entregue no quadro de contratos.`,
      passos: [{ t: 'quadro', reg, mat: { [mat]: n }, fim: true, txt: `Entregue ${n} ${WORLD_MATERIAIS[mat].nome} no quadro de contratos` }],
      rec: { xp: 45 * lv, cel: 14 + lv * 4, rep: 30, oficio: { coleta: 20 } } });
  },
  contratosDe(reg) { const d = this.dia(); return [0, 1].map((k) => this.contrato(reg, d, k)); },

  // ------------------------------------------------------------ andamento
  hist(id, txt) {
    const s = this.S[id];
    if (!s) return;
    s.hist.push({ d: this.dia(), h: Math.floor(WorldTime.hora()), txt });
    if (s.hist.length > 12) s.hist.splice(0, s.hist.length - 12);
  },
  aceitar(id) {
    const q = this.def(id);
    if (!q || !this.disponivel(q)) return false;
    this.S[id] = { st: 'ativa', p: 0, prog: 0, hist: [], vistas: [], dia: this.dia(), ev0: 0 };
    if (q.leva) this.S[id].leva = q.leva;
    this.hist(id, 'Missão aceita');
    this.iniciarPasso(q);
    if (!World.state.rastreada || !this.ativa(World.state.rastreada)) World.state.rastreada = id;
    game.hud.toast(`NOVA MISSÃO · ${q.nome}`, '255,212,122');
    game.audio.play('upgrade');
    this.montarZona();
    World.save();
    return true;
  },
  abandonar(id) {
    const q = this.def(id);
    if (!q || !this.ativa(id)) return false;
    delete this.S[id];
    if (World.state.rastreada === id) World.state.rastreada = null;
    this.limparZona(id);
    game.hud.toast(`Missão abandonada · ${q.nome} (pode aceitar de novo)`, '200,214,235');
    World.save();
    return true;
  },
  iniciarPasso(q) {
    const s = this.S[q.id], P = this.passo(q);
    s.prog = 0; s.vistas = []; s.aviso = false;
    if (P.t === 'evento') s.ev0 = Eventos.feitos(P.reg);
  },
  // Passo cumprido: o próximo, ou a conclusão (quando o passo tem 'fim' e não pede conversa)
  avancar(q, txt) {
    const s = this.S[q.id];
    if (!s || s.st !== 'ativa') return;
    const P = this.passo(q);
    this.hist(q.id, txt || `Feito: ${P.txt}`);
    if (P.fim) return;   // a conclusão é feita por quem chama (concluir)
    s.p++;
    this.iniciarPasso(q);
    const N = this.passo(q);
    game.hud.toast(`${q.nome} · ${N.txt}`, '255,212,122');
    game.audio.play('uiSelect');
    this.limparZona(q.id);
    this.montarZona();
    World.save();
  },
  // Paga a recompensa uma única vez (o estado vira 'feita' antes)
  concluir(q, k = -1) {
    const s = this.S[q.id];
    if (!s || s.st !== 'ativa') return false;
    s.st = 'feita'; s.dia = this.dia();
    if (k >= 0 && q.escolha) s.escolha = k;
    delete s.leva;
    this.hist(q.id, 'Concluída');
    if (World.state.rastreada === q.id) World.state.rastreada = (this.ativas()[0] || {}).id || null;
    this.pagar(q, q.rec || {});
    if (k >= 0 && q.escolha && q.escolha.opcoes[k]) this.pagar(q, q.escolha.opcoes[k].rec || {});
    game.hud.message('MISSÃO CONCLUÍDA', q.nome.toUpperCase(), 2.6, false, true);
    game.audio.play('upgrade');
    Fabrica.aoConcluirMissao(q);   // às vezes ensina um plano (js/mundo/fabrica.js)
    this.limparZona(q.id);
    WorldQuests.check();
    World.save();
    return true;
  },
  pagar(q, R) {
    const g = game, p = g.player, z = World.zone, partes = [];
    if (R.xp) { g.gainXP(R.xp, p.x, p.y); partes.push(`${R.xp} XP`); }
    if (R.cel) { g.stats.soulsBank += R.cel; partes.push(`${R.cel} células`); }
    if (R.rep) Oficios.ganharRep(q.reg, R.rep);
    for (const f in R.repExtra || {}) Oficios.ganharRep(f, R.repExtra[f]);
    for (const k in R.mat || {}) Oficios.dar(k, R.mat[k], false), partes.push(`${R.mat[k]} ${WORLD_MATERIAIS[k].nome}`);
    for (const k in R.cons || {}) { Oficios.darCons(k, R.cons[k]); partes.push(`${R.cons[k]} ${WORLD_CONSUMIVEIS[k].nome}`); }
    if (R.capsulas) { WorldInv.S.capsulas = Math.min(WorldInv.CAPS, WorldInv.S.capsulas + R.capsulas); partes.push('cápsula de reparo'); }
    for (const k in R.oficio || {}) Oficios.ganharXp(k, R.oficio[k]);
    if (R.rel) { WorldInv.ganhar(WorldInv.gerar(Math.max(q.nivel, z ? z.lv : 1) + 1, q.reg, R.rel.min || 0, R.rel.sorte || 0.2), p.x, p.y); partes.push('relíquia'); }
    if (R.unico) { WorldInv.ganhar({ id: 0, b: R.unico.b, r: R.unico.r || 3, lv: Math.max(q.nivel, 1) + 1, reg: q.reg, st: Object.assign({}, R.unico.st), unico: R.unico.unico }, p.x, p.y); partes.push(R.unico.unico); }
    if (partes.length) g.hud.toast(`Recompensa: ${partes.join(' · ')}`, '255,212,122');
  },

  // ------------------------------------------------------------ eventos do jogo
  onKill(e) {
    for (const q of this.ativas()) {
      const s = this.S[q.id], P = this.passo(q);
      if (P.t === 'chefe' && e.missao === q.id) { this.avancar(q, `Derrotou ${P.chefe.nome}`); continue; }
      if (P.t !== 'matar') continue;
      if (P.alvo && e.type !== P.alvo && e.variante !== P.alvo) continue;
      if (P.elite && !e.elite) continue;
      if (P.reg && (!World.zone || World.zone.region !== P.reg)) continue;
      if (P.zona && (!World.zone || World.zone.id !== P.zona)) continue;
      s.prog = (s.prog || 0) + 1;
      if (s.prog >= P.n) this.avancar(q);
      else if (s.prog % 3 === 0 || P.n - s.prog <= 2) game.hud.toast(`${q.nome} · ${s.prog}/${P.n}`, '255,212,122');
    }
  },
  aoMasmorra(id) { for (const q of this.ativas()) { const P = this.passo(q); if (P.t === 'masmorra' && P.id === id) this.avancar(q, `Venceu ${Locais.masmorra(id).nome}`); } },
  aoEvento(reg) {
    for (const q of this.ativas()) {
      const s = this.S[q.id], P = this.passo(q);
      if (P.t !== 'evento' || P.reg !== reg) continue;
      s.prog = Eventos.feitos(reg) - (s.ev0 || 0);
      if (s.prog >= P.n) this.avancar(q, 'Participou dos eventos');
    }
  },
  // Avisa uma vez quando dá para entregar
  check() {
    for (const q of this.ativas()) {
      const s = this.S[q.id], P = this.passo(q);
      if (P.mat && !s.aviso && Oficios.tem(P.mat)) { s.aviso = true; game.hud.toast(`${q.nome} · pronto para entregar`, '125,255,176'); }
    }
  },
  // Progresso do passo atual (feito, meta)
  progresso(q) {
    const s = this.S[q.id], P = this.passo(q);
    if (!s || !P) return [0, 1];
    if (P.t === 'matar') return [Math.min(s.prog || 0, P.n), P.n];
    if (P.t === 'evento') return [Math.min(s.prog || 0, P.n), P.n];
    if (P.t === 'examinar') return [s.vistas.length, P.pistas.length];
    if (P.mat) { const R = Oficios.resolver(P.mat); let a = 0, b = 0; for (const k in R) { a += Math.min(Oficios.mat(k), R[k]); b += R[k]; } return [a, b]; }
    return [0, 1];
  },
  textoPasso(q) {
    const P = this.passo(q), [a, b] = this.progresso(q);
    return b > 1 ? `${P.txt} (${a}/${b})` : P.txt;
  },

  // ------------------------------------------------------------ conversa (Povo → Dialogo)
  // Conversa que já é parte de um passo (achar, escolta): devolve a fala ou null
  aoFalar(npc) {
    const q = npc.alvoMissao && this.def(npc.alvoMissao);
    if (!q || !this.ativa(q.id)) return null;
    const P = this.passo(q);
    if (npc instanceof Escoltado) {
      if (npc.estado === 'espera') { npc.estado = 'andando'; npc.talkT = 0; this.hist(q.id, 'A escolta começou'); return 'Vamos! Fique perto. Se eu parar, é porque tem coisa na frente — ou porque você ficou para trás.'; }
      if (npc.estado === 'chegou') return P.fala || 'Obrigado!';
      return `Estou indo… ${Math.round(npc.progresso() * 100)}% do caminho. Não me deixe sozinho.`;
    }
    if (P.t === 'achar' && npc.achado !== true) {
      npc.achado = true; npc.sumir = 2.5;
      this.avancar(q, `Encontrou ${P.pessoa.nome}`);
      return P.fala;
    }
    return null;
  },
  // Respostas de missão na conversa com um morador
  opcoes(npc, o, volta) {
    const id = npc.P && npc.P.id;
    if (!id || npc.alvoMissao) return;
    for (const q of this.ativas()) {
      const P = this.passo(q);
      if (P.npc !== id || (P.t !== 'falar' && P.t !== 'entregar')) continue;
      if (P.t === 'entregar') {
        const ok = Oficios.tem(P.mat);
        o.push({ id: `ent_${q.id}`, tag: ok ? '?' : '◆', txt: `${q.nome}: entregar ${Oficios.fmtMat(P.mat)}`, off: ok ? null : `faltam ${Oficios.falta(P.mat)}`,
          fn: () => { if (!Oficios.gastar(P.mat)) return; this.cumprirFala(q, P, npc, volta); } });
      } else o.push({ id: `fal_${q.id}`, tag: '?', txt: `${q.nome}: ${P.opcao || (P.fim ? 'contar o que aconteceu' : 'conversar')}`, fn: () => this.cumprirFala(q, P, npc, volta) });
    }
    // missões que este morador dá: novas e em andamento
    for (const q of WORLD_AVENTURAS) {
      if (q.doador !== id) continue;
      if (this.ativa(q.id)) {
        const P = this.passo(q);
        if (P.npc === id) continue;
        o.push({ id: `and_${q.id}`, tag: '◆', txt: `Sobre "${q.nome}"`, fn: () => volta(`${pick(['Ainda esperando.', 'Como vai isso?', 'Conto com você.'])} ${this.textoPasso(q)}.`) });
      } else if (this.disponivel(q)) o.push({ id: `nova_${q.id}`, tag: '!', txt: q.nome, fn: () => this.oferecer(q, npc, volta) });
    }
  },
  oferecer(q, npc, volta) {
    const R = this.resumoRec(q);
    Dialogo.mostrar(`${q.desc}\n\n${q.ini}\n\nRecompensa: ${R}.`, [
      { id: 'aceitar', tag: '!', txt: 'Aceito.', fn: () => { this.aceitar(q.id); volta(`${pick(['Obrigado. De verdade.', 'Eu sabia que podia contar com você.', 'Boa. Não demore.'])}\n\n${q.nome}: ${this.textoPasso(q)}.`); } },
      { id: 'recusar', txt: 'Agora não.', fn: () => volta('Tudo bem. Se mudar de ideia, eu estou aqui.') },
    ]);
  },
  cumprirFala(q, P, npc, volta) {
    if (!P.fim) { this.avancar(q, P.opcao ? `${P.opcao} (${npc.name})` : `Falou com ${npc.name}`); volta(P.fala || 'Certo.'); return; }
    if (q.escolha) {
      Dialogo.mostrar(`${q.fim}\n\n${q.escolha.txt}`, q.escolha.opcoes.map((op, k) => ({ id: `esc${k}`, tag: '★', txt: op.txt, fn: () => { this.concluir(q, k); volta(op.fim); } })));
      return;
    }
    this.concluir(q);
    volta(q.fim);
  },
  resumoRec(q) {
    const R = q.rec || {}, p = [];
    if (R.xp) p.push(`${R.xp} XP`);
    if (R.cel) p.push(`${R.cel} células`);
    if (R.rep) p.push(`reputação com ${WORLD_FACCOES[q.reg].nome}`);
    if (R.rel) p.push(`relíquia ${WORLD_RARIDADES[R.rel.min || 0].name.toLowerCase()}+`);
    if (R.unico) p.push(`${R.unico.unico} (única)`);
    for (const k in R.cons || {}) p.push(WORLD_CONSUMIVEIS[k].nome);
    for (const k in R.mat || {}) p.push(`${R.mat[k]} ${WORLD_MATERIAIS[k].nome}`);
    if (R.capsulas) p.push('cápsula de reparo');
    if (q.escolha) p.push('e o que você escolher no fim');
    return p.join(', ');
  },
  // Quadro de contratos: aceitar, entregar ou ver o andamento
  opcoesQuadro(reg, o, volta) {
    for (const q of this.contratosDe(reg).concat(this.ativas().filter((a) => a.contrato && a.reg === reg && a.dia !== this.dia()))) {
      const s = this.S[q.id];
      if (s && s.st === 'feita') { o.push({ id: `cf_${q.id}`, txt: `${q.nome} (cumprido hoje)`, off: 'volte amanhã', fn: () => {} }); continue; }
      if (s && s.st === 'ativa') {
        const P = this.passo(q);
        if (P.t === 'quadro') {
          const ok = !P.mat || Oficios.tem(P.mat);
          o.push({ id: `cq_${q.id}`, tag: ok ? '?' : '◆', txt: `${q.nome}: ${P.mat ? `entregar ${Oficios.fmtMat(P.mat)}` : 'receber'}`, off: ok ? null : `faltam ${Oficios.falta(P.mat)}`,
            fn: () => { if (P.mat && !Oficios.gastar(P.mat)) return; this.concluir(q); volta(`Contrato cumprido. ${this.resumoRec(q)} — pagos na hora.`); } });
        } else o.push({ id: `ca_${q.id}`, tag: '◆', txt: `${q.nome}: ${this.textoPasso(q)}`, fn: () => volta(`${q.desc}\n\nAndamento: ${this.textoPasso(q)}.`) });
        continue;
      }
      const b = this.bloqueio(q);
      o.push({ id: `cn_${q.id}`, tag: '!', txt: q.nome, off: b || null, fn: () => Dialogo.mostrar(`${q.desc}\n\nPagamento: ${this.resumoRec(q)}.`, [
        { id: 'aceitar', tag: '!', txt: 'Pegar o contrato.', fn: () => { this.aceitar(q.id); volta(`Contrato aceito: ${this.textoPasso(q)}.`); } },
        { id: 'recusar', txt: 'Deixar no quadro.', fn: () => volta('Os papéis continuam lá.') }]) });
    }
  },
  // Marca acima da cabeça: ! (missão para dar) e ? (entregar/conversar)
  marca(npc) {
    if (npc instanceof QuadroProp) {
      const L = this.contratosDe(npc.data.reg);
      if (L.some((q) => this.ativa(q.id) && this.passo(q).t === 'quadro' && (!this.passo(q).mat || Oficios.tem(this.passo(q).mat)))) return '?';
      return L.some((q) => this.disponivel(q)) ? '!' : '';
    }
    const id = npc.P && npc.P.id;
    if (!id || npc.alvoMissao) return '';
    for (const q of this.ativas()) { const P = this.passo(q); if (P.npc === id && (P.t === 'falar' || (P.t === 'entregar' && Oficios.tem(P.mat)))) return '?'; }
    return WORLD_AVENTURAS.some((q) => q.doador === id && this.disponivel(q)) ? '!' : '';
  },

  // ------------------------------------------------------------ objetos e pessoas nas zonas
  // Esconde a pessoa que está sendo escoltada (ela aparece como Escoltado)
  oculta(personaId) {
    return this.ativas().some((q) => { const P = this.passo(q); return P.t === 'escolta' && P.pessoa.id === personaId; });
  },
  limparZona(qid) {
    const g = game;
    g.npcs = g.npcs.filter((n) => !(n.alvoMissao === qid && !(n instanceof Escoltado && n.estado === 'chegou') && !n.sumir));
  },
  // Monta os objetos dos passos ativos que ficam nesta zona (sem repetir os que já estão)
  montarZona() {
    const g = game, z = World.zone;
    if (!z || !g.room) return;
    const R = g.room, tem = (k) => g.npcs.some((n) => n.chaveMissao === k) || g.enemies.some((e) => e.chaveMissao === k && e.alive);
    for (const q of this.ativas()) {
      const s = this.S[q.id], P = this.passo(q);
      if (P.zona !== z.id) continue;
      const base = `${q.id}:${s.p}`;
      if (P.t === 'examinar') P.pistas.forEach((pi, k) => {
        if (s.vistas.includes(k) || tem(`${base}:${k}`)) return;
        const pt = npcSpot(R, pi.at[0], pi.at[1]), m = new MissaoProp('pista', pt.x, pt.y, { q: q.id, k, nome: P.nome, verbo: P.verbo, txt: pi.txt });
        m.chaveMissao = `${base}:${k}`; g.npcs.push(m);
      });
      else if (P.t === 'local' && !tem(base)) { const pt = npcSpot(R, P.at[0], P.at[1]), m = new MissaoProp('local', pt.x, pt.y, { q: q.id, nome: P.nome }); m.chaveMissao = base; g.npcs.push(m); }
      else if (P.t === 'achar' && !tem(base)) {
        const pt = npcSpot(R, P.at[0], P.at[1]), d = { model: P.pessoa.model, variant: P.pessoa.variant || 0, name: P.pessoa.nome, at: P.at, lines: [P.fala], persona: { papel: 'Desaparecido', ola: [P.fala] } };
        const n = new Morador(d, pt.x, pt.y); n.alvoMissao = q.id; n.chaveMissao = base; n.papel = 'Desaparecido'; n.preparar(R);
        g.npcs.push(n);
      } else if (P.t === 'escolta' && !tem(base)) {
        const pt = npcSpot(R, P.de[0], P.de[1]), d = { model: P.pessoa.model, variant: P.pessoa.variant || 0, name: P.pessoa.nome, at: P.de, lines: ['…'], persona: { papel: 'Escolta', ola: ['Pronto quando você estiver.'] } };
        const n = new Escoltado(d, pt.x, pt.y, q, P); n.chaveMissao = base; n.destino = npcSpot(R, P.ate[0], P.ate[1]);
        g.npcs.push(n);
      } else if (P.t === 'chefe' && !tem(base)) this.criarChefe(q, P, base);
    }
  },
  criarChefe(q, P, chave) {
    const g = game, R = g.room, pt = npcSpot(R, P.at[0], P.at[1]), D = P.chefe;
    const camp = { def: { mobs: {} }, enemies: [], awake: false, x: pt.x, y: pt.y };
    const b = World.criarNaZona(D.tipo, pt.x, pt.y);
    b.makeElite(); b.maxHp = b.hp = Math.round(b.maxHp * D.hp); b.chefeNome = b.name = D.nome; b.missao = q.id; b.chaveMissao = chave;
    b.escala = (b.escala || 1) * 1.25;
    const lista = [b];
    let i = 0;
    for (const t in D.escolta || {}) for (let n = 0; n < D.escolta[t]; n++, i++) {
      const a = i * 2.4, x = pt.x + Math.cos(a) * 70, y = pt.y + Math.sin(a) * 70;
      lista.push(World.criarNaZona(t, R.canStand(x, y, 20) ? x : pt.x, R.canStand(x, y, 20) ? y : pt.y));
    }
    for (const e of lista) { e.dormant = true; e.camp = camp; e.setState('idle'); camp.enemies.push(e); g.enemies.push(e); }
    camp.chefeMissao = D.nome;
    World.camps.push(camp);
  },
  aoCarregar() { this.montarZona(); },
  // Pista examinada (abre a leitura no diálogo)
  tocar(prop) {
    const q = this.def(prop.data.q);
    if (!q || !this.ativa(q.id)) { prop.feito = true; return; }
    const s = this.S[q.id], P = this.passo(q);
    if (P.t !== 'examinar' || s.vistas.includes(prop.data.k)) { prop.feito = true; return; }
    s.vistas.push(prop.data.k); prop.feito = true;
    game.audio.play('memory');
    const fim = s.vistas.length >= P.pistas.length;
    Dialogo.abrir(prop, prop.data.txt, [{ id: 'ok', txt: fim ? 'Isso é tudo daqui.' : 'Continuar procurando.', fn: () => Dialogo.fechar() }], `${q.nome} · ${s.vistas.length}/${P.pistas.length}`);
    if (fim) this.avancar(q, `${P.verbo === 'Sabotar' ? 'Sabotou' : 'Examinou'} ${P.nome.toLowerCase()}`);
    else World.save();
  },
  // Escolta: emboscadas pelo caminho, chegada e falha
  emboscada(n) {
    const P = n.passo, f = n.progresso(), E = P.emboscadas || [];
    while (n.feitas < E.length && f >= E[n.feitas].p) {
      const M = E[n.feitas++], R = game.room;
      let i = 0;
      for (const t in M.mobs) for (let k = 0; k < M.mobs[t]; k++, i++) {
        const a = Math.atan2(n.destino.y - n.y, n.destino.x - n.x) + (i - 1) * 0.6, x = n.x + Math.cos(a) * 230, y = n.y + Math.sin(a) * 230;
        const e = World.criarNaZona(t, R.canStand(x, y, 20) ? x : n.destino.x, R.canStand(x, y, 20) ? y : n.destino.y);
        e.dormant = false; e.camp = null; game.enemies.push(e);
        game.particles.ring(e.x, e.y, 40, e.T.glow, 0.4, 4);
      }
      game.hud.message('EMBOSCADA!', n.name, 1.6, true);
      game.audio.play('spawn');
    }
  },
  chegouEscolta(n) {
    const q = this.def(n.alvoMissao);
    n.estado = 'chegou'; n.baseFacing = n.facing;
    if (!q || !this.ativa(q.id)) return;
    const P = this.passo(q);
    game.hud.say(n.name, P.fala || 'Chegamos!', 4, 0, true);
    if (P.fim) this.concluir(q); else this.avancar(q, `Escoltou ${P.pessoa.nome}`);
  },
  falhaEscolta(n) {
    const q = this.def(n.alvoMissao), g = game;
    g.particles.ring(n.x, n.y, 60, '255,90,110', 0.6, 6);
    g.hud.message('A ESCOLTA FALHOU', `${n.name} ficou para trás · fale de novo para tentar`, 2.6, true);
    g.audio.play('uiDeny');
    if (q) { this.S[q.id].falhas = (this.S[q.id].falhas || 0) + 1; this.hist(q.id, 'A escolta falhou; recomeçou do início'); }
    n.x = n.inicio.x; n.y = n.inicio.y; n.hp = n.maxHp; n.estado = 'espera'; n.feitas = 0;
  },
  update(dt) {
    const g = game, p = g.player;
    for (const n of g.npcs) {
      // lugar escondido: chegar perto descobre
      if (n instanceof MissaoProp && n.sub === 'local' && !n.feito && dist2(p.x, p.y, n.x, n.y) < 90 * 90) {
        n.feito = true;
        const q = this.def(n.data.q);
        g.hud.message('LOCAL SECRETO DESCOBERTO', n.name, 2.4, false, true);
        g.audio.play('memory'); g.gainXP(60 + World.zone.lv * 6, n.x, n.y);
        if (q && this.ativa(q.id) && this.passo(q).t === 'local') this.avancar(q, `Descobriu ${n.data.nome}`);
      }
      // quem foi encontrado volta para casa depois da conversa
      if (n.sumir && g.state === 'playing' && (n.sumir -= dt) <= 0) { n.remover = true; g.particles.ring(n.x, n.y, 30, '255,212,122', 0.5, 4); }
    }
    if (g.npcs.some((n) => n.remover)) g.npcs = g.npcs.filter((n) => !n.remover);
  },
  // Corrige estados antigos ou impossíveis (missão sem definição, passo fora da lista,
  // contratos velhos já pagos, rastreio de missão que não está ativa)
  validar() {
    const S = this.S, hoje = this.dia();
    for (const id of Object.keys(S)) {
      const q = this.def(id), s = S[id];
      if (!q || !s || (s.st !== 'ativa' && s.st !== 'feita')) { delete S[id]; continue; }
      if (q.contrato && s.st === 'feita' && s.dia < hoje) { delete S[id]; continue; }
      s.hist = Array.isArray(s.hist) ? s.hist : []; s.vistas = Array.isArray(s.vistas) ? s.vistas : [];
      s.p = clamp(s.p | 0, 0, q.passos.length - 1); s.prog = s.prog | 0;
    }
    if (World.state.rastreada && !this.ativa(World.state.rastreada) && !this.def(World.state.rastreada)) World.state.rastreada = null;
  },

  // ------------------------------------------------------------ HUD e mapa
  rastreada() { const id = World.state && World.state.rastreada, q = id && this.def(id); return q || null; },
  // Linha do quadro de missão do HUD
  linha() {
    const q = this.rastreada();
    if (!q) return '';
    if (this.ativa(q.id)) return `◆ ${q.nome}: ${this.textoPasso(q)}`;
    if (this.disponivel(q)) { const O = q.doador && Povo.onde(q.doador); return `◆ ${q.nome}: fale com ${O ? `${O.nome} (${WORLD_ZONES[O.zona].name})` : 'o quadro de contratos'}`; }
    return '';
  },
  // Zona de destino do passo atual (ou de quem dá a missão): para o mapa
  zonaAlvo(q) {
    const s = this.S[q.id];
    if (!s || s.st !== 'ativa') { const O = q.doador ? Povo.onde(q.doador) : null; return O ? O.zona : worldRegion(q.reg).hub; }
    const P = this.passo(q);
    if (P.zona) return P.zona;
    if (P.npc) { const O = Povo.onde(P.npc); return O && O.zona; }
    if (P.t === 'quadro') return worldRegion(P.reg).hub;
    if (P.t === 'masmorra') return Locais.masmorra(P.id).zona;
    return null;
  },
  alvosMapa() {
    const out = [], tr = this.rastreada();
    for (const q of this.ativas()) { const z = this.zonaAlvo(q); if (z && WORLD_ZONES[z]) out.push({ zona: z, q, rastreada: tr === q }); }
    if (tr && !this.ativa(tr.id)) { const z = this.zonaAlvo(tr); if (z) out.push({ zona: z, q: tr, rastreada: true }); }
    return out;
  },
  // Marcadores na zona: losango sobre os alvos da missão e a vida de quem é escoltado
  drawMarks(ctx, t) {
    const cam = game.camera;
    for (const n of game.npcs) {
      if (!n.alvoMissao || n.feito || n.sumir || n === game.talkTarget) continue;
      if (n instanceof MissaoProp && n.sub === 'local') continue;
      const q = hudHeadPoint(n, 18 - Math.sin(t * 3) * 3);
      if (!q) continue;
      ctx.save();
      diamondPath(ctx, q.x, q.y, 6); ctx.fillStyle = '#ffd47a'; ctx.fill();
      ctx.strokeStyle = 'rgba(20,12,0,0.85)'; ctx.lineWidth = 1.5; ctx.stroke();
      if (n instanceof Escoltado && n.estado !== 'chegou') {
        const w = 56, k = clamp(n.hp / n.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(3,7,16,0.85)'; ctx.fillRect(q.x - w / 2 - 1, q.y - 22, w + 2, 7);
        ctx.fillStyle = k > 0.35 ? '#7dffb0' : '#ff5c7a'; ctx.fillRect(q.x - w / 2, q.y - 21, w * k, 5);
        if (n.estado === 'espera') { ctx.font = `bold 10px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd47a'; ctx.fillText('FALE PARA COMEÇAR', q.x, q.y - 30); }
      }
      ctx.restore();
    }
    // chefe de missão já acordado: nada (a barra de elite já aparece); adormecido: losango
    for (const e of game.enemies) {
      if (!e.missao || !e.alive || !e.dormant) continue;
      const q = cam.toScreen(isoX(e.x, e.y), isoY(e.x, e.y) - 70 - Math.sin(t * 3) * 3);
      ctx.save(); diamondPath(ctx, q.x, q.y, 6); ctx.fillStyle = '#ff8a5a'; ctx.fill(); ctx.restore();
    }
  },

  // ------------------------------------------------------------ DIÁRIO (aba da mochila)
  CATS: ['ativas', 'disponiveis', 'concluidas'],
  // Entradas da categoria: missões secundárias e contratos, as da região e a campanha do herói
  diarioLista(cat) {
    const out = [];
    if (cat === 'ativas') {
      for (const q of this.ativas()) out.push({ av: q.id });
      for (const R of WORLD_REGIONS) { const q = WorldQuests.atual(R.id); if (q) out.push({ wq: q.id, reg: R.id }); }
      const c = Campanhas.cap && Campanhas.cap();
      if (c) out.push({ camp: true });
    } else if (cat === 'disponiveis') {
      for (const q of WORLD_AVENTURAS) if (!this.S[q.id] && World.regionOpen(q.reg)) out.push({ av: q.id, bloq: this.bloqueio(q) });
      for (const R of WORLD_REGIONS) if (World.regionOpen(R.id)) { for (const q of this.contratosDe(R.id)) if (!this.S[q.id]) out.push({ av: q.id, bloq: this.bloqueio(q) }); const n = WorldQuests.proxima(R.id); if (n && !WorldQuests.atual(R.id)) out.push({ wq: n.id, reg: R.id, nova: true }); }
      out.sort((a, b) => (a.bloq ? 1 : 0) - (b.bloq ? 1 : 0));
    } else {
      for (const id in this.S) if (this.S[id].st === 'feita' && this.def(id)) out.push({ av: id });
      for (const R of WORLD_REGIONS) for (const q of WorldQuests.lista(R.id)) if (WorldQuests.S[q.id] && WorldQuests.S[q.id].st === 'feita') out.push({ wq: q.id, reg: R.id });
    }
    return out;
  },
  nomeEntrada(e) {
    if (e.av) return this.def(e.av).nome;
    if (e.wq) return WorldQuests.lista(e.reg).find((q) => q.id === e.wq).name;
    const c = Campanhas.cap(); return c ? `Campanha: ${c.nome}` : 'Campanha';
  },
  agirDiario(e, alt) {
    if (!e) return;
    const U = WorldInv.ui;
    if (e.av) {
      const q = this.def(e.av);
      if (alt && this.ativa(q.id)) { if (U.confirma === q.id) { this.abandonar(q.id); U.confirma = null; WorldInv.aviso('Missão abandonada', true); } else { U.confirma = q.id; WorldInv.aviso('Aperte de novo para abandonar'); } return; }
      if (World.state.rastreada === q.id) { World.state.rastreada = null; WorldInv.aviso('Sem missão rastreada', true); }
      else { World.state.rastreada = q.id; WorldInv.aviso(`Rastreando: ${q.nome}`, true); }
    }
  },
  // ---- desenho do DIÁRIO ----
  // À esquerda, a lista: cada missão com o ícone do TIPO (secundária, contrato do dia, missão da região,
  // campanha) na cor da região, o nome, de quem é e o estado à direita (nível, rastreada, bloqueada com o
  // motivo). À direita, a ficha: tipo e nível em etiquetas, título, quem pede e onde, a descrição, os
  // OBJETIVOS (os feitos riscados, o atual com barra de progresso), as RECOMPENSAS em cartões (uma coisa por
  // cartão: experiência, células, reputação, itens) e o histórico; os botões ficam no rodapé da ficha.
  TIPOS_DIARIO: { sec: ['SECUNDÁRIA', '255,196,96'], con: ['CONTRATO DO DIA', '120,220,170'], reg: ['MISSÃO DA REGIÃO', '130,190,255'], camp: ['CAMPANHA', '255,150,90'] },
  tipoEntrada(e) { return e.camp ? 'camp' : e.wq ? 'reg' : this.def(e.av).contrato ? 'con' : 'sec'; },
  // ícones de traço (o mesmo desenho em qualquer tamanho)
  iconeDiario(ctx, k, x, y, s, cor) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = Math.max(1.4, s * 0.11); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const h = s / 2;
    ctx.beginPath();
    if (k === 'sec') { ctx.moveTo(0, -h); ctx.lineTo(h, 0); ctx.lineTo(0, h); ctx.lineTo(-h, 0); ctx.closePath(); ctx.stroke(); ctx.fillRect(-s * 0.06, -h * 0.5, s * 0.12, h * 0.6); ctx.fillRect(-s * 0.06, h * 0.26, s * 0.12, s * 0.12); }
    else if (k === 'con') { ctx.rect(-h * 0.7, -h * 0.9, h * 1.4, h * 1.8); ctx.stroke(); ctx.beginPath(); for (const yy of [-0.45, 0, 0.45]) { ctx.moveTo(-h * 0.4, h * yy); ctx.lineTo(h * 0.4, h * yy); } ctx.stroke(); }
    else if (k === 'reg') { ctx.arc(0, -h * 0.25, h * 0.6, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(0, h); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -h * 0.25, h * 0.2, 0, TAU); ctx.fill(); }
    else if (k === 'camp' || k === 'xp') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? h * 0.45 : h; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); if (k === 'xp') ctx.fill(); else ctx.stroke(); }
    else if (k === 'cadeado') { ctx.rect(-h * 0.6, -h * 0.1, h * 1.2, h); ctx.fill(); ctx.beginPath(); ctx.arc(0, -h * 0.1, h * 0.42, Math.PI, 0); ctx.stroke(); }
    else if (k === 'feito') { ctx.moveTo(-h * 0.7, 0); ctx.lineTo(-h * 0.15, h * 0.55); ctx.lineTo(h * 0.75, -h * 0.55); ctx.stroke(); }
    else if (k === 'cel') { ctx.moveTo(0, -h); ctx.lineTo(h * 0.7, 0); ctx.lineTo(0, h); ctx.lineTo(-h * 0.7, 0); ctx.closePath(); ctx.fill(); }
    else if (k === 'rep') { ctx.moveTo(-h * 0.6, h); ctx.lineTo(-h * 0.6, -h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-h * 0.6, -h); ctx.lineTo(h * 0.8, -h * 0.55); ctx.lineTo(-h * 0.6, -h * 0.05); ctx.closePath(); ctx.fill(); }
    else if (k === 'alvo') { ctx.arc(0, 0, h * 0.85, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, h * 0.3, 0, TAU); ctx.fill(); }
    else { ctx.moveTo(0, -h); ctx.lineTo(h * 0.9, -h * 0.45); ctx.lineTo(h * 0.9, h * 0.45); ctx.lineTo(0, h); ctx.lineTo(-h * 0.9, h * 0.45); ctx.lineTo(-h * 0.9, -h * 0.45); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-h * 0.9, -h * 0.45); ctx.lineTo(0, 0); ctx.lineTo(h * 0.9, -h * 0.45); ctx.moveTo(0, 0); ctx.lineTo(0, h); ctx.stroke(); }   // item: caixa
    ctx.restore();
  },
  // Recompensas da missão em cartões: [ícone, valor, rótulo, cor]
  cartoesRec(e) {
    const o = [];
    if (e.wq) { const q = WorldQuests.lista(e.reg).find((a) => a.id === e.wq); o.push(['xp', `${q.rec.xp}`, 'experiência', '190,150,255'], ['cel', `${q.rec.cells}`, 'células', '130,200,255'], ['item', 'Relíquia', 'da região', '255,205,120'], ['rep', 'Reputação', worldRegion(e.reg).name, '120,220,170']); return o; }
    if (!e.av) return o;
    const q = this.def(e.av), R = q.rec || {};
    if (R.xp) o.push(['xp', `${R.xp}`, 'experiência', '190,150,255']);
    if (R.cel) o.push(['cel', `${R.cel}`, 'células', '130,200,255']);
    if (R.rep) o.push(['rep', `+${R.rep}`, WORLD_FACCOES[q.reg] ? WORLD_FACCOES[q.reg].nome : 'reputação', '120,220,170']);
    if (R.rel) o.push(['item', 'Relíquia', `${WORLD_RARIDADES[R.rel.min || 0].name.toLowerCase()} ou melhor`, '255,205,120']);
    if (R.unico) o.push(['item', R.unico.unico, 'peça única', '255,170,90']);
    for (const k in R.cons || {}) o.push(['item', WORLD_CONSUMIVEIS[k].nome, R.cons[k] > 1 ? `× ${R.cons[k]}` : 'consumível', '235,240,250']);
    for (const k in R.mat || {}) o.push(['item', WORLD_MATERIAIS[k].nome, `× ${R.mat[k]}`, '235,240,250']);
    if (R.capsulas) o.push(['item', 'Cápsula de reparo', 'consumível', '235,240,250']);
    return o;
  },
  drawDiario(ctx, Ly, L, sel, t) {
    const U = WorldInv.ui, cat = U.cat || 'ativas', x0 = Ly.lx, top = Ly.top, lw = Math.min(430, (VIEW_W - 72) * 0.4), rx = x0 + lw + 22, rw = VIEW_W - 36 - rx;
    const fundo = Ly.det + 132 - 8, mouse = typeof game !== 'undefined' && game.input && game.input.mouse ? game.input.mouse : null;
    const sobre = (r) => mouse && mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h;
    const caixa = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
    const corta = (txt, w) => { if (ctx.measureText(txt).width <= w) return txt; while (txt.length > 4 && ctx.measureText(txt + '…').width > w) txt = txt.slice(0, -1); return txt.trimEnd() + '…'; };
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    // ---- categorias: um seletor só, com a contagem de cada uma
    let x = x0;
    const NOMES = { ativas: 'ATIVAS', disponiveis: 'DISPONÍVEIS', concluidas: 'CONCLUÍDAS' };
    for (const c of this.CATS) {
      const n = this.diarioLista(c).length, on = c === cat;
      ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '2px';
      const tw = ctx.measureText(NOMES[c]).width, w = tw + 54, r = { cat: c, x, y: top - 30, w, h: 30 }, hv = sobre(r);
      caixa(x, top - 30, w, 30, 6); ctx.fillStyle = on ? 'rgba(255,205,120,0.2)' : hv ? 'rgba(60,90,150,0.45)' : 'rgba(16,24,42,0.8)'; ctx.fill();
      ctx.strokeStyle = on ? 'rgba(255,212,122,0.9)' : 'rgba(90,120,170,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = on ? '#ffe6b0' : 'rgba(205,218,238,0.8)'; ctx.fillText(NOMES[c], x + 12, top - 15);
      ctx.letterSpacing = '0px';
      caixa(x + tw + 22, top - 24, 24, 18, 9); ctx.fillStyle = on ? 'rgba(255,212,122,0.9)' : 'rgba(90,120,170,0.5)'; ctx.fill();
      ctx.font = `bold 11px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillStyle = on ? '#1a1206' : '#e6eefb'; ctx.fillText(String(n), x + tw + 34, top - 15); ctx.textAlign = 'left';
      U.rects.push(r);
      x += w + 8;
    }
    // ---- lista
    const rh = 52, vao = 6, maxN = Math.max(1, Math.floor((fundo - top - 8) / (rh + vao)));
    const ini = clamp(sel - maxN + 2, 0, Math.max(0, L.length - maxN));
    if (!L.length) {
      caixa(x0, top + 8, lw, 92, 8); ctx.fillStyle = 'rgba(12,20,36,0.7)'; ctx.fill(); ctx.strokeStyle = 'rgba(90,120,170,0.3)'; ctx.stroke();
      this.iconeDiario(ctx, cat === 'concluidas' ? 'feito' : 'sec', x0 + 34, top + 54, 24, 'rgba(160,180,210,0.7)');
      ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = '#dbe6f7'; ctx.fillText(cat === 'ativas' ? 'Nenhuma missão ativa' : cat === 'disponiveis' ? 'Nada disponível agora' : 'Nenhuma concluída ainda', x0 + 62, top + 44);
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(170,186,212,0.8)'; ctx.fillText(cat === 'ativas' ? 'Fale com quem tem ! sobre a cabeça ou veja DISPONÍVEIS.' : cat === 'disponiveis' ? 'Novas missões aparecem ao abrir regiões e subir de nível.' : 'As missões terminadas ficam guardadas aqui.', x0 + 62, top + 64);
    }
    L.slice(ini, ini + maxN).forEach((e, j) => {
      const i = ini + j, y = top + 8 + j * (rh + vao), on = i === sel, tipo = this.tipoEntrada(e), TD = this.TIPOS_DIARIO[tipo];
      const q = e.av && this.def(e.av), R = worldRegion(e.reg || (q && q.reg) || 'carmesin'), tr = q && World.state.rastreada === q.id, r = { idx: i, x: x0, y, w: lw, h: rh }, hv = sobre(r);
      caixa(x0, y, lw, rh, 7); ctx.fillStyle = on ? 'rgba(46,78,140,0.72)' : hv ? 'rgba(28,44,80,0.85)' : 'rgba(12,20,36,0.86)'; ctx.fill();
      ctx.strokeStyle = on ? 'rgba(170,215,255,0.95)' : 'rgba(90,120,170,0.3)'; ctx.lineWidth = on ? 1.6 : 1; ctx.stroke();
      U.rects.push(r);
      // ícone do tipo num quadro na cor da região
      caixa(x0 + 8, y + 8, 36, 36, 6); ctx.fillStyle = rgba(R.rgb, e.bloq ? 0.1 : 0.2); ctx.fill(); ctx.strokeStyle = rgba(R.rgb, e.bloq ? 0.3 : 0.75); ctx.lineWidth = 1; ctx.stroke();
      this.iconeDiario(ctx, e.bloq ? 'cadeado' : cat === 'concluidas' ? 'feito' : tipo, x0 + 26, y + 26, 18, e.bloq ? 'rgba(170,180,200,0.7)' : cat === 'concluidas' ? 'rgba(140,225,170,0.95)' : rgba(TD[1], 1));
      // estado à direita: nível, rastreada
      let dx = x0 + lw - 10;
      ctx.textAlign = 'right';
      if (q && q.nivel) { ctx.font = `bold 10px ${FONT_TITLE}`; const tw2 = ctx.measureText(`NV ${q.nivel}`).width + 12; caixa(dx - tw2, y + 9, tw2, 16, 4); ctx.fillStyle = 'rgba(8,14,26,0.8)'; ctx.fill(); ctx.strokeStyle = 'rgba(120,150,200,0.4)'; ctx.stroke(); ctx.fillStyle = e.bloq ? 'rgba(170,180,200,0.7)' : '#cfe0fa'; ctx.fillText(`NV ${q.nivel}`, dx - 6, y + 17.5); dx -= tw2 + 6; }
      if (tr) { ctx.font = `bold 10px ${FONT_TITLE}`; const tw2 = ctx.measureText('◆ RASTREADA').width + 12; caixa(dx - tw2, y + 9, tw2, 16, 4); ctx.fillStyle = 'rgba(255,205,120,0.2)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,212,122,0.8)'; ctx.stroke(); ctx.fillStyle = '#ffe2a0'; ctx.fillText('◆ RASTREADA', dx - 6, y + 17.5); dx -= tw2 + 6; }
      ctx.textAlign = 'left';
      ctx.font = `bold 14px ${FONT_UI}`; ctx.fillStyle = e.bloq ? 'rgba(170,182,205,0.7)' : '#ffffff';
      ctx.fillText(corta(this.nomeEntrada(e), dx - (x0 + 54) - 6), x0 + 54, y + 18);
      ctx.font = `11px ${FONT_UI}`;
      if (e.bloq) { ctx.fillStyle = 'rgba(255,170,150,0.85)'; ctx.fillText(corta(`Bloqueada · ${e.bloq}`, lw - 66), x0 + 54, y + 37); }
      else { ctx.fillStyle = rgba(TD[1], 0.9); const tt = TD[0].charAt(0) + TD[0].slice(1).toLowerCase(); ctx.fillText(tt, x0 + 54, y + 37); const twt = ctx.measureText(tt).width;
        ctx.fillStyle = 'rgba(190,205,228,0.75)'; ctx.fillText(corta(` · ${R.name}${q && cat === 'ativas' ? ` · ${this.textoPasso(q)}` : ''}`, lw - 66 - twt), x0 + 54 + twt, y + 37); }
    });
    if (L.length > maxN) {   // barra de rolagem
      const bh = fundo - top - 12, k = maxN / L.length;
      ctx.fillStyle = 'rgba(90,120,170,0.25)'; ctx.fillRect(x0 + lw + 6, top + 8, 3, bh);
      ctx.fillStyle = 'rgba(170,215,255,0.8)'; ctx.fillRect(x0 + lw + 6, top + 8 + bh * (ini / L.length), 3, Math.max(18, bh * k));
    }
    // ---- ficha
    const e = L[sel], py = top - 30, ph = fundo - py;
    const tipo = e ? this.tipoEntrada(e) : 'sec', TD = this.TIPOS_DIARIO[tipo], q = e && e.av ? this.def(e.av) : null, wq = e && e.wq ? WorldQuests.lista(e.reg).find((a) => a.id === e.wq) : null;
    const Rg = worldRegion((e && (e.reg || (q && q.reg))) || 'carmesin');
    caixa(rx, py, rw, ph, 10);
    const gf = ctx.createLinearGradient(0, py, 0, py + ph); gf.addColorStop(0, 'rgba(14,22,42,0.96)'); gf.addColorStop(1, 'rgba(6,10,20,0.96)');
    ctx.fillStyle = gf; ctx.fill(); ctx.strokeStyle = 'rgba(110,140,190,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    if (!e) { ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,178,205,0.7)'; ctx.textAlign = 'center'; ctx.fillText('Escolha uma missão na lista para ver os detalhes.', rx + rw / 2, py + ph / 2); ctx.textAlign = 'left'; return; }
    // faixa do topo na cor da região
    ctx.save(); caixa(rx, py, rw, ph, 10); ctx.clip();
    const gt = ctx.createLinearGradient(rx, 0, rx + rw, 0); gt.addColorStop(0, rgba(Rg.rgb, 0.3)); gt.addColorStop(1, rgba(Rg.rgb, 0));
    ctx.fillStyle = gt; ctx.fillRect(rx, py, rw, 92); ctx.fillStyle = rgba(Rg.rgb, 0.95); ctx.fillRect(rx, py, rw, 3);
    ctx.restore();
    const px = rx + 22, pw = rw - 44;
    const wrap = (txt, xx, yy, w, lh, max = 6) => {
      let cur = '', n = 0;
      for (const p of String(txt).split(' ')) { const tt = cur ? `${cur} ${p}` : p; if (cur && ctx.measureText(tt).width > w) { if (n < max) ctx.fillText(cur, xx, yy + n * lh); n++; cur = p; } else cur = tt; }
      if (cur && n < max) { ctx.fillText(cur, xx, yy + n * lh); n++; }
      return Math.min(n, max) * lh;
    };
    const etiqueta = (txt, xx, yy, rgb, cheio) => { ctx.font = `bold 10px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px'; const w = ctx.measureText(txt).width + 16; caixa(xx, yy, w, 20, 4); ctx.fillStyle = rgba(rgb, cheio ? 0.9 : 0.16); ctx.fill(); ctx.strokeStyle = rgba(rgb, 0.8); ctx.stroke(); ctx.fillStyle = cheio ? '#0c1220' : rgba(rgb, 1); ctx.fillText(txt, xx + 8, yy + 10.5); ctx.letterSpacing = '0px'; return w + 6; };
    const secao = (txt, yy) => { ctx.font = `bold 11px ${FONT_TITLE}`; ctx.letterSpacing = '2.5px'; ctx.fillStyle = 'rgba(150,205,255,0.9)'; ctx.fillText(txt, px, yy); const w = ctx.measureText(txt).width; ctx.letterSpacing = '0px'; ctx.fillStyle = 'rgba(110,140,190,0.3)'; ctx.fillRect(px + w + 12, yy, pw - w - 12, 1); };
    let y = py + 18;
    // etiquetas: tipo, nível, região, estado
    let ex = px;
    const s = q ? this.S[q.id] : null, stq = wq ? WorldQuests.S[wq.id] : null, feita = (s && s.st === 'feita') || (stq && stq.st === 'feita'), ativa = (s && s.st === 'ativa') || (stq && stq.st === 'ativa') || e.camp;
    ex += etiqueta(TD[0], ex, y, TD[1], true);
    if (q && q.nivel) ex += etiqueta(`NÍVEL ${q.nivel}`, ex, y, '205,220,245');
    ex += etiqueta(Rg.name.toUpperCase(), ex, y, Rg.rgb);
    if (feita) ex += etiqueta('CONCLUÍDA', ex, y, '140,225,170'); else if (e.bloq) ex += etiqueta('BLOQUEADA', ex, y, '255,150,130'); else if (ativa) ex += etiqueta('EM ANDAMENTO', ex, y, '255,212,122');
    y += 44;
    const camp = e.camp ? Campanhas.cap() : null, titulo = e.camp ? (camp ? camp.nome : 'Campanha') : wq ? wq.name : q.nome;
    ctx.font = `bold 23px ${FONT_TITLE}`; ctx.fillStyle = '#ffffff'; ctx.fillText(corta(titulo.toUpperCase(), pw), px, y); y += 26;
    // quem pede e onde
    const O = q && q.doador && Povo.onde(q.doador), D = wq ? WorldQuests.doador(e.reg) : null;
    const quem = e.camp ? 'Campanha do herói · aba CAMPANHAS para os capítulos' : D ? `${D.nome} · ${D.zona}` : O ? `${O.nome} · ${WORLD_ZONES[O.zona].name}` : 'Quadro de contratos';
    this.iconeDiario(ctx, 'alvo', px + 7, y, 12, rgba(Rg.rgb, 0.95));
    ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = rgba(Rg.rgb, 0.98); ctx.fillText(corta(quem, pw - 22), px + 22, y); y += 28;
    if (e.bloq) { caixa(px, y - 12, pw, 26, 5); ctx.fillStyle = 'rgba(120,40,40,0.35)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,150,130,0.55)'; ctx.stroke(); this.iconeDiario(ctx, 'cadeado', px + 14, y + 1, 12, '#ffb4a0'); ctx.font = `bold 12px ${FONT_UI}`; ctx.fillStyle = '#ffd2c6'; ctx.fillText(`Para liberar: ${e.bloq}`, px + 30, y + 1); y += 30; }
    // descrição
    ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = 'rgba(228,236,248,0.92)';
    y += wrap(e.camp ? (Campanhas.linha() || 'Campanha do herói em andamento.') : wq ? wq.ini : q.desc, px, y, pw, 21, 4) + 16;
    // objetivos
    const limite = fundo - 60;
    if (!e.camp && y < limite - 40) {
      secao('OBJETIVOS', y); y += 22;
      const linha = (txt, feito, atual) => {
        const m = /\((\d+)\s*\/\s*(\d+)\)\s*$/.exec(txt), limpo = m ? txt.slice(0, m.index).trimEnd() : txt;
        caixa(px, y - 13, pw, m && atual ? 38 : 26, 5); ctx.fillStyle = atual ? 'rgba(255,205,120,0.09)' : 'rgba(20,30,52,0.5)'; ctx.fill(); if (atual) { ctx.strokeStyle = 'rgba(255,212,122,0.4)'; ctx.stroke(); }
        if (feito) this.iconeDiario(ctx, 'feito', px + 14, y, 11, 'rgba(140,225,170,0.95)'); else { ctx.beginPath(); ctx.arc(px + 14, y, 4.5, 0, TAU); ctx.strokeStyle = atual ? '#ffd47a' : 'rgba(170,186,212,0.7)'; ctx.lineWidth = 1.6; ctx.stroke(); }
        ctx.font = `${atual ? 'bold ' : ''}13px ${FONT_UI}`; ctx.fillStyle = feito ? 'rgba(160,195,175,0.8)' : atual ? '#ffe2a0' : 'rgba(220,230,245,0.9)';
        ctx.fillText(corta(limpo, pw - (m ? 96 : 40)), px + 30, y);
        if (feito) { const w = Math.min(ctx.measureText(limpo).width, pw - 40); ctx.fillStyle = 'rgba(160,195,175,0.6)'; ctx.fillRect(px + 30, y, w, 1); }
        if (m) { ctx.textAlign = 'right'; ctx.font = `bold 13px ${FONT_NUM}`; ctx.fillStyle = atual ? '#ffe2a0' : 'rgba(200,214,235,0.8)'; ctx.fillText(`${m[1]} / ${m[2]}`, px + pw - 12, y); ctx.textAlign = 'left';
          if (atual) { const k = clamp(+m[1] / Math.max(1, +m[2]), 0, 1); ctx.fillStyle = 'rgba(8,12,22,0.9)'; ctx.fillRect(px + 30, y + 13, pw - 42, 5); ctx.fillStyle = '#ffc860'; ctx.fillRect(px + 30, y + 13, (pw - 42) * k, 5); y += 12; } }
        y += 30;
      };
      if (wq) linha(`${WorldQuests.texto(wq)}${stq && stq.st === 'ativa' ? ` (${Math.min(WorldQuests.prog(wq), WorldQuests.meta(wq))}/${WorldQuests.meta(wq)})` : ''}`, !!(stq && stq.st === 'feita'), !(stq && stq.st === 'feita'));
      else {
        const ate = s ? (s.st === 'feita' ? q.passos.length : s.p + 1) : 1;
        q.passos.slice(0, ate).forEach((P, k) => { if (y > limite - 60) return; const fe = !!(s && (s.st === 'feita' || k < s.p)); linha(fe || !s ? P.txt : this.textoPasso(q), fe, !fe); });
        if (!s && q.passos.length > 1 && y < limite - 50) { ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(170,186,212,0.7)'; ctx.fillText(`+ ${q.passos.length - 1} ${q.passos.length - 1 > 1 ? 'etapas' : 'etapa'} depois desta`, px + 30, y - 6); y += 14; }
        if (s && s.leva && y < limite - 40) { ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,214,235,0.8)'; ctx.fillText(`Levando: ${s.leva}`, px + 30, y - 4); y += 18; }
      }
      y += 6;
    }
    // recompensas em cartões
    const recs = this.cartoesRec(e);
    if (recs.length && y < limite - 50) {
      secao('RECOMPENSAS', y); y += 18;
      const cw = Math.min(168, (pw - 8 * 3) / 4), ch = 46;
      let cx = px, cy = y;
      for (const [ic, valor, rot, rgb] of recs) {
        if (cx + cw > px + pw + 1) { cx = px; cy += ch + 8; }
        if (cy + ch > limite) break;
        caixa(cx, cy, cw, ch, 6); ctx.fillStyle = 'rgba(18,28,50,0.85)'; ctx.fill(); ctx.strokeStyle = rgba(rgb, 0.4); ctx.stroke();
        caixa(cx + 7, cy + 8, 30, 30, 5); ctx.fillStyle = rgba(rgb, 0.16); ctx.fill();
        this.iconeDiario(ctx, ic, cx + 22, cy + 23, 15, rgba(rgb, 1));
        ctx.font = `bold 13px ${FONT_UI}`; ctx.fillStyle = '#ffffff'; ctx.fillText(corta(valor, cw - 52), cx + 44, cy + 16);
        ctx.font = `10.5px ${FONT_UI}`; ctx.fillStyle = 'rgba(185,200,225,0.8)'; ctx.fillText(corta(rot, cw - 52), cx + 44, cy + 32);
        cx += cw + 8;
      }
      y = cy + ch + 16;
    }
    // histórico (se couber)
    if (s && s.hist && s.hist.length && y < limite - 40) {
      secao('HISTÓRICO', y); y += 20;
      ctx.font = `11.5px ${FONT_UI}`;
      for (const h of s.hist.slice(-4).reverse()) { if (y > limite - 8) break; ctx.fillStyle = 'rgba(150,170,200,0.75)'; ctx.fillText(`Dia ${h.d}, ${String(h.h).padStart(2, '0')}h`, px, y); ctx.fillStyle = 'rgba(210,222,240,0.85)'; ctx.fillText(corta(h.txt, pw - 90), px + 84, y); y += 17; }
    }
    // botões no rodapé da ficha
    const acoes = [];
    if (q && s && s.st === 'ativa') { acoes.push(['main', World.state.rastreada === q.id ? 'PARAR DE RASTREAR' : 'RASTREAR']); acoes.push(['alt', U.confirma === q.id ? 'CONFIRMAR ABANDONO' : 'ABANDONAR']); }
    else if (q && !s) acoes.push(['main', World.state.rastreada === q.id ? 'DESMARCAR' : 'MARCAR NO MAPA']);
    ctx.fillStyle = 'rgba(110,140,190,0.25)'; ctx.fillRect(rx + 1, fundo - 52, rw - 2, 1);
    let bx = rx + rw - 18;
    const by = fundo - 42;
    for (const [id, label] of acoes.slice().reverse()) {
      ctx.font = `bold 12px ${FONT_TITLE}`; ctx.letterSpacing = '1.5px';
      const bw = ctx.measureText(label).width + 34, r = { btn: id, x: bx - bw, y: by, w: bw, h: 32 }, hv = sobre(r);
      bx -= bw;
      caixa(bx, by, bw, 32, 6);
      ctx.fillStyle = id === 'alt' ? (hv ? 'rgba(130,40,54,0.95)' : 'rgba(80,30,40,0.85)') : (hv ? 'rgba(54,110,210,0.95)' : 'rgba(34,78,156,0.9)'); ctx.fill();
      ctx.strokeStyle = id === 'alt' ? 'rgba(255,120,140,0.8)' : 'rgba(160,210,255,0.9)'; ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(label, bx + bw / 2, by + 16.5); ctx.letterSpacing = '0px';
      U.rects.push(r);
      bx -= 10;
    }
    ctx.textAlign = 'left'; ctx.font = `11.5px ${FONT_UI}`; ctx.fillStyle = 'rgba(160,178,205,0.75)';
    ctx.fillText(q && !s ? (e.bloq ? 'Ainda não dá para aceitar esta missão.' : `Aceite falando com ${O ? O.nome : 'o quadro de contratos'}.`) : ativa && q ? 'A missão rastreada aparece com ◆ no mapa e na zona.' : '', px, by + 16);
  },
};
