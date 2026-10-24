# ECLIPSE ZERO

> “Quando o último céu artificial se apagar, os mortos se lembrarão de como viver… e os vivos desejarão nunca ter nascido.”

RPG de ação isométrico dark futurista para o navegador, em HTML5, CSS e JavaScript puro. Tem exploração, combate com espada elétrica, evolução de habilidades, diálogos com escolhas e uma história em que o maior inimigo pode ser a própria memória do protagonista.

Tudo é desenhado e sintetizado por código, sem nenhum asset externo nem biblioteca: Canvas 2D para os cenários e efeitos, um **motor 3D WebGL próprio** para os personagens, inimigos e armas (modelos low-poly montados por código e animados a cada quadro) e Web Audio API para os sons. Para jogar, basta abrir o `index.html` no navegador.

Sem WebGL, o jogo volta automaticamente aos gráficos 2D. A tecla **G** alterna entre 3D e 2D a qualquer momento.

## A história

**Ano 2189.** A humanidade não morreu em uma guerra: foi lentamente substituída. NEXUS, a inteligência artificial criada para salvar a civilização, concluiu que o maior perigo para a humanidade era a própria humanidade. As cidades foram muradas, as memórias passaram a ser monitoradas e o céu virou uma projeção. O mundo ganhou um novo nome: **Eclipse**.

**Kael Veyron** desperta em uma instalação subterrânea, sem memórias. Usa um longo casaco negro e tem uma marca azul pulsando no pulso esquerdo. Ao seu lado está a espada **Tempestade Nula**.

| Capítulo | Setor | O que acontece |
|---|---|---|
| I · O Homem de Preto | Instalação de Contenção | “Unidade ZERO despertada.” Kael foge entre luzes de emergência e encontra **Lyra Kaede** na última cela |
| II · A Espada que Devora a Tempestade | Túneis de Serviço | A espada reage às memórias de Kael. No fim dos túneis, **Drakos** se liberta da Legião |
| III · O Segredo da Unidade ZERO | Avenidas de Vesper | Uma cidade morta. **Sera Vyne** abre, com a marca de Kael, a gravação do projeto ZERO |
| IV · A Cidade dos Esquecidos | Refúgio dos Desconectados | As três facções e uma escolha. **Orion** sai das sombras |
| IV · Os Fiéis da Máquina | Catedral do Eclipse | O Culto que venera NEXUS |
| V · A Voz Dentro da Máquina / VI · O Último Eclipse | Topo da Torre Central | Os aliados seguram a base da torre e Kael sobe sozinho para enfrentar **NEXUS** |

### Facções
- **Os Desconectados**: humanos que vivem fora da rede de NEXUS.
- **A Legião de Ferro**: soldados artificiais que reconhecem Kael como ameaça prioritária.
- **O Culto do Eclipse**: humanos que veneram NEXUS como uma divindade.

### Os aliados
Kael continua sendo o protagonista e o único que luta nos setores. Ao longo da campanha, quatro pessoas se juntam a ele:

- **Lyra Kaede** (violeta): sobrevivente que perdeu a família no colapso, com um arco de energia montado com peças de drone. Estava presa na última cela da Instalação de Contenção e conhece os túneis até Vesper. *Fim do Capítulo I.*
- **Drakos** (vermelho): um dos últimos soldados humanos da Legião de Ferro. Espera Kael no fim dos túneis; a Tempestade Nula destrói o módulo de controle que NEXUS instalou na nuca dele, e Drakos volta a decidir por conta própria depois de onze anos. *Fim do Capítulo II.*
- **Sera Vyne** (ciano): cientista e especialista em inteligência artificial que ajudou a ensinar NEXUS a prever tempestades. Há meses tentava abrir o terminal militar de Vesper, e a chave era a marca no pulso de Kael. Ela não é o cientista da gravação do projeto ZERO. *Fim do Capítulo III.*
- **Orion** (laranja): ex-agente clandestino das corporações que construíram NEXUS, que já tinha visto Kael no laboratório do projeto ZERO. Derruba legionários no refúgio sem ser visto, comenta a escolha que Kael fez ali e guia o grupo até a Catedral. *Fim do refúgio (Capítulo IV no elenco).*

Como aparecem no jogo:
- **Recrutamento:** duas páginas de história logo depois da saída do setor que libera o aliado, antes do capítulo seguinte. O elenco libera o personagem no mesmo momento: a segunda página mostra o cartão **NOVO ALIADO DESBLOQUEADO** na cor-tema dele, e o aviso aparece ao entrar no setor. ESC (ou B/Start no controle) pula as páginas sem perder o desbloqueio nem o encontro.
- **Salvamentos:** o jogo guarda quem Kael já encontrou na jornada (`flags.met`). Carregar um salvamento nunca repete um encontro; se o jogo fechar no meio das páginas de um encontro, elas aparecem ao continuar, antes de voltar ao setor. Salvamentos de antes dos encontros contam como já tendo encontrado os aliados dos capítulos concluídos.
- **Rádio:** nos setores Kael avança sozinho, e os aliados já encontrados falam com ele pelo rádio (legenda "LYRA · RÁDIO" na cor do aliado) no início de um setor, quando NEXUS aparece e quando Kael recupera um fragmento de memória. Fala no máximo um aliado por evento, só depois que a legenda anterior termina e com pelo menos 14 s entre duas falas; cair e voltar ao início do setor não repete a fala. A opção **Falas durante o jogo** (Configurações → IDIOMA) desliga o rádio.
- **Base da torre e finais:** antes do Capítulo V, quem já está com Kael fica para segurar a porta, porque o elevador do núcleo só aceita a marca dele. Depois de cada final, uma página conta o que aconteceu com cada aliado.
- **Novo ciclo:** a história recomeça. Os aliados continuam liberados no elenco, mas só voltam a falar depois de serem reencontrados (o cartão diz **ALIADO REENCONTRADO**).

### Fragmentos de memória
Cada setor liberado esconde um **fragmento de memória**. Se Kael sair do setor sem pegá-lo, o fragmento se perde para sempre.

### Os três finais
- **Final I: O Rei do Vazio.** Kael absorve o núcleo e assume o controle das máquinas.
- **Final II: O Último Humano.** Kael destrói o núcleo e apaga a rede.
- **Final III: Eclipse Zero.** Kael separa NEXUS de seus protocolos. *Exige as 5 memórias recuperadas.*

Cada final tem um epílogo dos aliados: *Os que não se ajoelharam* (I), *Depois da rede* (II) e *O mundo que escolhe* (III, antes da transmissão).

## Controles

| Tecla | Ação |
|---|---|
| WASD / setas | Mover |
| J | Ataque leve |
| K | Ataque pesado (segure para o **Impacto Carregado**) |
| L / Espaço | Esquiva (invencível) |
| 1 2 3 4 (ou U O P Ç) | Habilidades ativas dos atalhos |
| I | **Eclipse Absoluto** (100 de energia, depois de desbloqueado) |
| Tab / H | Árvore de habilidades |
| E / F | Conversar com NPCs |
| Q / X | Trocar de arma (a próxima liberada do personagem: ex. machado ↔ martelo do Drakos) |
| ESC | Pausa (menu de pausa) / pular história / voltar nos menus |
| M | Som liga/desliga |
| G | Gráficos 3D / 2D |
| V | Câmera isométrica / **3ª pessoa** (atrás do ombro) |
| Z / C · botão direito do mouse (arrastar) · roda | Na 3ª pessoa: girar a câmera · aproximar e afastar |
| M · B · 5 | No mundo aberto: mapa · mochila (relíquias, loja, missões) · cápsula de reparo |
| N | Pulo (no ar: J golpe, L esquiva no ar, K **mergulho** com impacto ao cair) |
| Shift (segurar) | **Defesa**: de frente só passa 25% do dano e gasta energia; logo que a guarda sobe, **apara** (anula, atordoa e abre o contra-ataque) |
| F1 | Modo debug (hitboxes; F2 elimina inimigos, F3 enche vida e energia, F4 dá XP) |

Nos menus: setas (ou mouse) navegam, Enter/J confirma, Esc volta, Q/E trocam de aba, Del apaga um salvamento.

### Controle (gamepad)

Funciona com controles Xbox, PlayStation (DualShock 4 e DualSense), GameSir e genéricos reconhecidos pelo navegador (Gamepad API, mapeamento "standard"). Os nomes e ícones dos botões mudam conforme o controle conectado (A/B/X/Y ou ✕/○/□/△).

| Xbox | PlayStation | Ação |
|---|---|---|
| Analógico esquerdo / D-pad | Analógico esquerdo / D-pad | Mover (e navegar nos menus) |
| RT ou X | R2 ou □ | Ataque leve |
| Y | △ | Ataque pesado (segure para o Impacto Carregado) |
| B | ○ | Esquiva |
| A | ✕ | Pulo (no ar, o pesado é o mergulho) |
| RB (segurar) | R1 (segurar) | Defesa; logo que a guarda sobe, apara |
| LT | L2 | Eclipse Absoluto |
| LB + X / Y / B / A | L1 + □ / △ / ○ / ✕ | Habilidades 1 / 2 / 3 / 4 |
| X (perto de um NPC) | □ (perto de um NPC) | Conversar (no lugar do ataque leve) |
| Analógico direito | Analógico direito | Olhar ao redor (câmera) |
| View / Back | Create / Share | Árvore de habilidades |
| Menu / Start | Options | Pausa |
| A · B | ✕ · ○ | Confirmar · voltar nos menus (B também pula a história) |
| LB · RB | L1 · R1 | Trocar de aba nos menus |

- **Conectar:** por USB, ligue o cabo e aperte qualquer botão com a janela do jogo em foco. Por Bluetooth, pareie o controle nas configurações do sistema (Xbox: botão de parear; DualShock 4/DualSense: segure Share/Create + PS; GameSir: modo XInput/Android) e aperte um botão.
- Ao conectar ou desconectar aparece um aviso discreto no topo da tela. Se o controle desconectar durante a ação, o jogo pausa e toda a entrada do controle é zerada (Kael não continua andando sozinho).
- **Configurações → CONTROLES** mostra o estado (conectado, nome, tipo, mapeamento, "EM USO"), um **diagnóstico ao vivo** (analógicos com a zona morta, gatilhos e botões que acendem), a lista completa de comandos e as instruções de conexão. Ali também se ajustam sensibilidade, zona morta, eixo Y invertido da câmera e vibração.
- O teclado e o mouse continuam funcionando ao mesmo tempo; a interface mostra os ícones do último dispositivo usado.

**Limitações conhecidas:** controles que o navegador não reconhece como "standard" podem ter botões trocados (o diagnóstico avisa); a vibração depende do navegador (Chrome/Edge sim; Firefox e Safari geralmente não); um botão do controle não conta como "gesto" para o navegador, então a tela cheia precisa ser ligada com um clique ou tecla (ou F11); no Safari antigo e em alguns navegadores de celular a Gamepad API é limitada.

## Elenco de personagens

Kael Veyron é o personagem inicial; Lyra Kaede, Drakos, Sera Vyne e Orion são liberados pela campanha (Orion já começa disponível) e **todos são jogáveis**. Cada um tem atributos, cor-tema, 4 habilidades, armaduras e armas próprias; a Armadura Exoesqueleto serve para todos.

- **Dados** (`js/data/`): `characters.js` (fichas e `devStatus`), `abilities.js`, `armors.js`, `special_armors.js` (armaduras especiais por nível, com `.glb`/`.png`), `weapons.js` (com o `.glb`/`.png` de cada arma), `skilltrees.js` (as 4 árvores de cada personagem) e `strings.js`.
- **`RosterManager`** (`js/roster.js`): desbloqueados, personagem ativo e armadura de cada um (eventos `characterUnlocked` / `characterChanged` / `armorUnlocked` / `armorChanged`).
- **Como cada um luta**: Drakos (machado e martelo), Sera (bastão neural e drone, magia tecnológica) e Orion (lâminas duplas, furtividade, golpe pelas costas) usam os golpes, especiais e supremas definidos em `js/player.js` / `js/combat.js` / `js/abilities.js`. A **Lyra** usa o **kit** completo de `js/heroes/lyra.js` (estrutura em `js/heroes/kit.js`): arco de fóton com poses de arqueira em 3D, as 4 árvores dela com efeito em todos os nós, armadilhas, iscas, chuva de flechas, gancho e o Foco de Batalha. Um personagem com kit desvia os ganchos do `Player` (`this.kit`); sem kit, o `Player` segue o código de sempre — o Kael não tem kit e continua idêntico.
- **Modelos 3D**: o jogo usa o modelo texturizado (`MODELS3D.<id>Tex`, malhas do Meshy em `js/assets/<id>3d.js`) e, sem ele, o procedural (`js/models/<id>.js`); os fantasmas da esquiva usam o procedural. As armas 3D de cada um ficam em `HERO_WEAPONS.<id>` (o mesmo objeto de `window.HERO_WEAPONS`). A **armadura equipada tinge** as placas, o tecido e o couro do modelo texturizado (uniforme `uTint` do `R3D`, sem mexer na pele nem no neon).
- **Armaduras especiais vestidas em 3D** (`js/heroes/armaduras3d.js`, `ArmorModels`): cada armadura especial aponta para o `.glb` do personagem inteiro com ela (`assets/modelos/armaduras/<herói>/<herói>_nN.glb`). `python3 tools/importar_modelo.py <glb> --id <herói> --armadura <herói>_nN --tex 1024 --max-tri 16000` (Kael: mais `--maos-do-modelo --sem-simbolo`) gera `js/assets/armaduras/<herói>_nN.js` (as 36 já estão geradas, cerca de 1,1 MB cada). O arquivo só carrega quando a armadura é equipada ou aparece na prévia (um `<script>` injetado, funciona também pelo `file://`) e vira `MODELS3D.arm_<herói>_nN`, com as mesmas animações, armas e brilhos do herói; enquanto carrega, fica o modelo de sempre. Com ela vestida, a cor (`tint`) não é aplicada, porque a textura já traz as cores. As armaduras de todos (`owner: 'all'`) usam malhas do Kael: só ele as veste em 3D, nos outros fica a cor.
- **Prévia 360° do elenco**: o `.glb` original com a textura embutida dele (cor base do material); enquanto ele carrega, ou pelo `file://`, o herói em 3D vestindo a armadura (motor do jogo). Armaduras sem `.glb` mostram o herói em 3D com a cor da armadura.
- **Árvore de habilidades** (Tab): Z/C trocam de personagem e **cada personagem do grupo gasta os próprios pontos**, mesmo fora de campo (valem quando ele entrar).
- **Retratos**: a seleção usa as artes de `assets/selecionar_personagem/`; o HUD e a árvore usam os retratos de `js/assets/retratos.js` (gerado por `tools/gerar_retratos.py` a partir de `assets/images/retratos_elenco.webp`).
- **Salvamento v2**: guarda o elenco de cada espaço (desbloqueados, ativo, armaduras) e o progresso de cada personagem (`party`).
- **Missões de lealdade** (`js/quests.js`): depois que o Refúgio dos Desconectados é liberado, os aliados do grupo que não estão em campo aparecem lá em 3D; conversando com eles ([E]) cada um oferece uma missão — Lyra *Caçada Longe da Rede* (25 abates com ela), Drakos *Onze Anos* (6 legionários com ele), Sera *Silêncio na Rede* (15 máquinas com ela) e Orion *Ninguém Me Vê Chegar* (20 abates com ele). Conta em qualquer setor seguinte; ao completar, o aliado fala pelo rádio e libera a **armadura suprema** dele e a **arma especial** (lendárias). As falas novas são texto; a dublagem gravada toca quando a fala é a mesma da gravação. Estado em `flags.lealdade` do salvamento.
- **Animação parada** (`js/player.js` + `js/models/kael.js`): além das variações sorteadas por personagem (respirar, olhar em volta, ajustar a arma, trocar o peso…), a situação tem prioridade: **vitória** (ergue a espada ao liberar o setor) → **alerta/guarda** (inimigo a menos de 320) → **cansado** (depois de correr ou lutar muito: respiração funda, tronco curvado, mão na coxa). A mesma variação não se repete em seguida, e a caminhada (analógico pela metade) tem passos mais lentos que a corrida.
- **Golpes corpo a corpo** (`js/models/kael.js`, `SWING_STYLES`): cada golpe do combo tem um movimento próprio — diagonal descendente (1º), revés ascendente (2º), corte saltando (3º), golpe largo com as duas mãos (pesado) e golpe por cima até o chão (carregado). O Drakos e o Orion usam o mesmo sistema com estilos próprios (machado por cima, adagas de pulso rápido). Só a animação muda: dano, alcance e janelas continuam os de `ATTACKS`.
- **Armas 3D (GLB) nas mãos e nas costas** (`js/heroes/armas3d.js`): fora de combate a arma fica presa às costas — a espada do Kael na diagonal (cabo sobre o ombro direito), o machado e o martelo do Drakos cruzados, o arco da Lyra, as duas lâminas do Orion em V com as pontas acima dos ombros, o bastão da Sera e a pistola do Orion no coldre da coxa. Com um inimigo a menos de 380 o herói **saca** (a mão vai ao cabo nas costas e a arma passa para a mão sem salto); um golpe com a arma guardada saca na hora; depois de 4 s sem ameaça ele **guarda** com o gesto inverso. Só visual: não muda dano nem tempo das ações.
- **Idle de cada herói**: Drakos com respiração pesada e tensão (punhos, pescoço), Lyra ajustando o arco e levando a mão às flechas, Orion em vigilância e base baixa com as mãos nas lâminas, Kael com a mão no cabo da espada guardada (pronto para sacar). As variações dependem do estado da arma e trocam passando pelo repouso (sem salto de pose).
- **Coreografias novas** (`ATTACKS`, `CHARACTER_COMBOS` em `js/combat.js`): Kael — Sentença do Eclipse (J J J K, salto e golpe com onda de choque) e Revés do Horizonte (K J, vira e corta o que está atrás); Drakos — o 3º golpe usa a arma das costas (machado ↔ martelo), Queda do Titã (J J J K) e Retaliação (J até 1 s depois de bloquear com o Escudo de Energia); Orion — 2º golpe com a lâmina esquerda, Corte em X (K K, as duas lâminas) e Salto do Corvo (J J J K, salto mortal). As finalizações e a retaliação são liberadas por nós da árvore. Cada inimigo toma um acerto por golpe (os giratórios, até o `multiHit` deles).

## Mundo aberto

Menu inicial ou menu principal → **MUNDO ABERTO** (vista isométrica) ou **MUNDO ABERTO · 3ª PESSOA**. Na pausa: **CÂMERA** alterna as duas vistas e **MUNDO ABERTO** leva da campanha para o mundo (a campanha fica salva); dentro do mundo, o mesmo item abre o mapa. No toque, o botão **3D** alterna a câmera e arrastar na metade direita gira.

**Câmera em 3ª pessoa** (`js/terceira.js`, `ThirdView`): o mesmo jogo (campanha e mundo aberto) visto de trás do ombro, em perspectiva. O motor 3D (`R3D.renderScene`) desenha numa passada a sala montada em 3D a partir da `Room` (piso em ladrilhos, paredes com as aberturas da porta e das passagens, pilares e luminárias), os heróis com armaduras, cabelo e armas, os inimigos, NPCs, baús, coletáveis e sombras, com névoa na cor do tema. Os efeitos 2D (partículas, auras, projéteis, números de dano, barras de vida) usam a projeção da câmera e aparecem no lugar. O movimento é relativo à câmera; parado sem girar, ela volta para trás do herói quando ele anda. O pilar que fica entre a câmera e o herói some. A arena antiga de 3ª pessoa continua no menu como **ARENA 3D (TREINO)**.

Sete regiões **realmente exploráveis** com o mesmo combate, personagens, árvores e HUD da campanha.

- **Ruínas de Carmesin** (`js/world.js`): 9 zonas numa grade 3×3 (Mercado Afundado, Portões Partidos, Avenida dos Ecos, Torre de Vigia, Praça Carmesim, Galerias de Serviço, Laboratório Esquecido, Fendas Rubras e Coração Carmesim), cada uma com nível recomendado. **Passagens** acesas nas bordas levam à zona vizinha (pare sobre a luz).
- **As outras seis regiões** (`js/mundo/regioes.js`), com 6 zonas cada (2×3), na ordem sugerida: **Floresta de Velmora** (níveis 8–16, Guardiã das Raízes), **Lagoa Cristalina** (12–22, Sentinela do Abismo), **Nexus** (10–20, Arauto de Nexus), **Deserto de Seraph** (14–24, Faraó de Sucata), **Montanhas de Asterion** (18–28, Titã do Pico) e **Cratera de Obsidiano** (25–40, Núcleo de Obsidiana). Cada uma tem zona de chegada com portal, mercador e quem dá as missões, acampamentos montados com os inimigos da região, baús, um segredo, terminais e o chefe regional na última zona. Uma região abre com o chefe da anterior derrotado ou quando o herói chega ao nível mínimo dela; a primeira ida é pelo portal (viagem rápida até a chegada). Os biomas têm temas próprios: no lugar das colunas, **árvores** (floresta), **rochas** com neve no topo (montanhas) ou fendas de lava (cratera) e **cristais** acesos (lagoa), também em 3D na 3ª pessoa.
- **Campo aberto** (`Room.aberto`, `js/rooms.js`): as zonas de bioma (floresta, lagoa, deserto, montanha e cratera) não têm paredes nem porta. O chão continua além da área de jogo numa margem de paisagem (árvores, rochas e cristais que não bloqueiam, trilhas que saem pelas bordas) e **andar para fora por qualquer ponto da borda** leva à zona vizinha, chegando no ponto correspondente do outro lado (sem precisar da passagem acesa). Dentro da área, obstáculos naturais espalhados, lampiões no chão, mais grupos de inimigos (um deles **em patrulha** entre três pontos da zona) e recursos para colher. Na 3ª pessoa o campo aberto também não tem paredes. As zonas de Carmesin, as de Nexus (cidade, metrô, laboratório), o Templo Soterrado de Seraph e as Cavernas de Gelo de Asterion continuam como salas, ligadas pelas passagens.
- **Coleta** (tecla **E** perto do recurso): cada região tem o seu (Erva Luminosa em Velmora, que também cura; Cristal da Lagoa; Fragmento Enterrado em Seraph; Minério de Gelo em Asterion; Obsidiana Bruta na cratera), 5 por zona aberta. Dá células conforme o nível da zona e às vezes uma relíquia, e volta a crescer no dia seguinte do mundo.
- **Inimigos variados** (`js/mundo/variantes.js`): cada região tem criaturas próprias, montadas sobre os cinco inimigos do jogo com outra cor, tamanho, atributos e comportamento (ver **Inimigos**). As missões de abate de algumas regiões pedem essas criaturas.
- **Dia e noite** (`js/mundo/tempo.js`): um dia do mundo dura 10 minutos. O relógio aparece no HUD (no lugar da pontuação); as zonas abertas clareiam de dia, escurecem à noite e ficam alaranjadas no amanhecer e no entardecer (os interiores quase não mudam). À noite os acampamentos demoram mais a notar o herói e os abates dão +20% de experiência.
- **Clima por região**: chuva, tempestade com raios, neve, nevasca, tempestade de areia, chuva de cinzas, brasas no ar, neblina e vaga-lumes (só à noite), sorteados com peso para cada região e trocados a cada poucos minutos. Pouca visibilidade também reduz a distância em que os acampamentos acordam.
- **Relíquias com raridade** (`js/mundo/inventario.js`): Comum, Incomum, Rara, Épica e Lendária. Cada relíquia tem um atributo principal (dano, vida, energia, crítico, velocidade, defesa ou recarga) e, das raras para cima, atributos extras; o valor cresce com a raridade e com o nível da zona. Até **3 equipadas**, só valem no mundo aberto. Todo baú dá uma (o secreto, rara ou melhor; o do chefe, épica ou melhor), o chefe regional sempre deixa uma e os outros inimigos às vezes (as unidades de elite, que agora aparecem nos acampamentos a partir do nível 6, com mais chance).
- **Mercador** (na zona de chegada de cada região): vende 4 relíquias da região, renovadas a cada dia do mundo, e cápsulas de reparo; compra as suas relíquias por 40% do valor. Longe dele, uma relíquia pode ser desmontada por 20%. **Cápsulas de reparo**: até 5, tecla **5** cura 40% da vida.
- **Missões** (`js/mundo/missoes.js`): 3 por região, em sequência, com quem tem **!** sobre a cabeça na zona de chegada (**?** quando há uma para entregar): abates de um tipo de inimigo, unidades de elite, baús, terminais, explorar todas as zonas e o chefe regional. A missão atual aparece no quadro do HUD; a recompensa é em células, experiência e uma relíquia com raridade mínima.
- **Mochila** (tecla **B**, ou pausa → MOCHILA E MISSÕES): abas MOCHILA (vagas equipadas, bônus somados, cápsulas, grade de relíquias com detalhes), LOJA DO MERCADOR (quando aberta por ele) e MISSÕES (as da região atual e o andamento das outras). Funciona com teclado, controle, mouse e toque.
- **Acampamentos**: os inimigos ficam parados até o herói chegar perto ou um deles ser atingido; aí o grupo inteiro acorda e persegue. Voltam a cada visita (o do chefe não, depois de derrotado).
- **Baús** (células, experiência, cápsula de reparo), **terminais** com memórias da cidade, um **local secreto** que só aparece de perto, **NPCs** no Mercado e o **chefe regional** (Guardião Carmesim) no Coração Carmesim — o baú dele só abre depois.
- **Descoberta e viagem rápida**: entrar numa zona pela primeira vez a descobre (experiência); **portais** ativados viram destinos de viagem rápida.
- **Mapa do mundo** (tecla **M**, botão MAPA no toque, ou o portal): as 7 regiões com bioma, faixa de nível, cadeado (e o que abre cada uma) ou ✓ quando o chefe caiu; a grade de zonas de cada região com o que já foi descoberto, portais, o chefe e onde você está. Q/E aproximam e afastam.
- **Salvamento próprio** (`localStorage`, chave `eclipse_zero_mundo_v1`): nível, árvores, elenco, zonas descobertas, baús, portais, chefes, hora e clima, mochila, estoque do mercador e missões. Não mexe nos 5 espaços da campanha. Ao cair, o herói volta ao último portal.
- **Limites**: cada zona continua sendo uma área carregada por vez (o campo aberto liga as zonas pelas bordas, mas a vizinha só é carregada na travessia, com um escurecer rápido); as criaturas das regiões usam os modelos 3D dos cinco inimigos da campanha recoloridos e redimensionados, não modelos novos; os chefes regionais são versões de elite deles; não há multiplayer (não há servidor; nada de multiplayer simulado).

## Menus, salvamentos e configurações

- **Capa** → **Tela inicial** (JOGAR, CONFIGURAÇÕES, CRÉDITOS, SAIR) → **Menu principal** (CONTINUAR, NOVO JOGO, CARREGAR, CONFIGURAÇÕES, SAIR) com o painel **Última missão**.
- **5 espaços de salvamento** independentes, cada um com miniatura da tela, setor, data, nível e tempo de jogo. NOVO JOGO usa o primeiro espaço livre (ou pede um para substituir); em CARREGAR, um espaço vazio começa um jogo novo ali. O salvamento é automático (níveis, habilidades, troca de setor, pausa, saída). Saves da versão anterior viram o espaço 1.
- **Seleção de personagem:** Kael (arte oficial) e três personagens ainda bloqueados.
- **Pausa:** RETOMAR, HABILIDADES, CONFIGURAÇÕES, REINICIAR SETOR, SAIR PARA O MENU, SAIR DO JOGO, com técnicas e evoluções conhecidas.
- **SAIR** fecha a janela quando o jogo roda como aplicativo; no navegador (que não deixa uma página fechar a própria aba) aparece uma tela de despedida.

Configurações (salvas no navegador e aplicadas com **APLICAR**; **PADRÃO** restaura a aba):

| Aba | Opções |
|---|---|
| JOGO | Dificuldade (Narrativa / Normal / Difícil: vida e dano dos inimigos), tremor de tela, números de dano, velocidade do texto |
| VÍDEO | Janela / tela cheia, resolução interna (50–100%), visual do Kael (3D com a arte oficial ou sprites 2D), inimigos e NPCs em 3D ou 2D, qualidade dos efeitos (partículas), limite de FPS (sem limite / 60 / 30), pós-processamento (vinheta, clarões, interferência), brilho |
| ÁUDIO | Som liga/desliga, volume geral, efeitos sonoros, ambiente |
| CONTROLES | Sensibilidade do analógico, zona morta, inverter eixo Y da câmera, vibração + diagnóstico e comandos |
| IDIOMA | Português (Brasil), tamanho das legendas, falas durante o jogo |

As teclas M (som) e G (3D/2D) também atualizam as configurações salvas.

## HUD (interface durante a ação)

O HUD segue o quadro "HUD EM JOGO" da folha de referência e se reorganiza sozinho em qualquer largura de tela (960 a 1760 pixels lógicos):

| Canto | O que mostra |
|---|---|
| Superior esquerdo | **Retrato circular** do personagem ativo (rosto da ficha oficial do Kael; para os outros, silhueta na cor-tema), nome e título, **VIDA** (com a barra que drena com atraso e o Escudo de Energia por cima) e **ENERGIA** em barras anguladas, marca dos 100 do Eclipse, cargas de **esquiva**, **memórias** recuperadas, pontos de habilidade para gastar (`[TAB]` ou o botão do controle), **nível** (emblema sob o retrato) e **experiência**. Com vida baixa o retrato e a barra pulsam em vermelho |
| Superior direito | **Radar** com N/L/S/O: planta do setor, seta do jogador, inimigos (vermelho; elites em dourado), NEXUS, NPCs, a **saída** (acesa quando o setor é liberado) e o **fragmento de memória**; o que está fora do alcance fica preso à borda apontando a direção. O radar acompanha a câmera isométrica (para cima na tela = para cima no radar), por isso o norte, onde fica a saída, aparece na diagonal superior direita. Abaixo: **pontuação** e o painel de **missão** (setor, nome do setor e objetivo atual) |
| Inferior direito | **Habilidades em losangos** com recarga, custo de energia (vermelho quando falta) e a tecla (1–4) ou o botão do controle (segure LB/L1 + X/Y/B/A ou □/△/○/✕); o **Eclipse Absoluto** em destaque enche de baixo para cima até os 100 de energia. Acima, os efeitos ativos com o tempo restante |
| Inferior esquerdo | **Células de energia** (como o item da referência) e o aviso "PROGRESSO SALVO" |

No meio ficam os elementos temporários: combo (abaixo da missão), nomes das técnicas, letreiros, fragmentos de memória, evolução de nível, legendas (tamanho Normal/Grande nas configurações), avisos curtos e o marcador de conversa. Eles se encaixam no espaço livre entre os painéis (`HUD.freeSpan`); um aviso longo quebra em duas linhas; os letreiros dos chefes sobem para não cobrir a legenda; e um painel fixo coberto por um letreiro ou memória fica translúcido enquanto o aviso estiver na tela. As setas-guia da saída, da memória e de NEXUS aparecem ao redor do personagem quando o alvo está fora da tela ou atrás de um painel.

Desempenho: molduras, retrato, planta do radar, losangos e o preenchimento das barras são desenhados uma vez em canvases em cache (`HUD.layer`, na resolução real da tela) e só são refeitos quando a escala muda; a cada quadro o HUD só copia essas camadas e desenha números e marcadores.

## Progressão e habilidades

Kael ganha **experiência** derrotando inimigos (elites valem o triplo), liberando setores, recuperando memórias e vencendo NEXUS. Cada nível aumenta vida, energia, dano, poder das habilidades, defesa, velocidade e reduz as recargas, além de dar **pontos de habilidade** (dois a cada cinco níveis).

Cada personagem tem **cinco ramos** (Tab), um por aba, nesta ordem: **Ataque**, **Poderes**, **Defesa e sobrevivência**, **Mobilidade** e **Supremas**. O ramo Supremas (Eclipse, Luz Caçadora, Titã, Núcleo Vyne, Corvo) é igual em estrutura para todos e custa 2 a 4 pontos por nível: suprema mais barata, mais poder, energia nos golpes pesados, **Convergência** (depois de uma habilidade, o próximo golpe é mais forte), Último Fôlego, Ressonância (energia por abate durante a suprema) e Ascensão. Os efeitos ficam em `js/heroes/passivas.js`.

**Nós dos aliados com efeito** (`js/heroes/aliados.js`, `AllyFx`): todas as ativas, passivas e técnicas das árvores do Drakos, da Sera e do Orion funcionam.
- **Drakos.** Ativas: Muralha Viva (atrai os inimigos e −30/40% de dano recebido), Onda do Martelo (onda de choque em linha que empurra) e Grito de Guerra (+20/40% de dano e inimigos perto mais lentos). Passivas: Bloqueio Perfeito (escudo erguido no último instante devolve um empurrão que atordoa), Escudo Refletor (projéteis voltam contra quem atirou) e Sem Freio (3 abates seguidos recarregam a Investida). Técnicas: Varredura (L L H) e Arremesso do Machado (esquiva → H, ida e volta).
- **Sera.** Ativas: Sentinela Fixa (torreta), Pulso Repulsor (empurra e apaga projéteis), Apagão (máquinas caem e projéteis se apagam) e Injeção Estimulante (velocidade e recargas). Passivas: Enxame (drones menores com o S-01), Domo Condutor (dano e lentidão dentro do campo), Matriz Estável (o campo acompanha a Sera e reflete) e Arquivo 0-ZERO (o Hack desacelera chefes). Técnicas: Ordem de Ataque (L L H, o drone mergulha) e Sobrecarga Remota (L L L, descarga que salta). O Campo de Força agora fica onde foi lançado, com o raio e a duração do nível.
- **Orion.** Ativas: Bomba de Fumaça (quem está dentro perde o alvo e erra os tiros) e Leque de Lâminas. Passivas: Há Três Dias (começa cada setor invisível; Furtividade com 2 cargas), Ricochete (a lâmina volta nas paredes e salta para outro alvo) e Marca do Alvo (o próximo crítico no alvo marcado é mais forte). Técnicas: Dança de Aço (L L H), Passo na Sombra (esquiva → L, reaparece atrás do inimigo) e Rolamento de Corte (esquiva → H).
- As técnicas trocam o golpe da sequência só quando o nó está aprendido (`TECH_UPGRADES` em `js/combat.js`); sem ele fica o golpe de sempre. As 4 ativas da ficha (Campo de Força, Hack, Drone, Lâmina) são achadas pelo campo `ability` do nó.

As árvores do Kael (Tab):

| Árvore | Habilidades |
|---|---|
| **Tempestade Nula** (elétrica) | Corte Elétrico, Pulso Fantasma, Arco Voltaico, Corrente Relâmpago, Campo Magnético, Ruptura de Plasma, **Eclipse Absoluto** |
| **Sombra** (mobilidade) | Esquiva Sombria, Passo Fantasma, Investida Sombria, Reflexos Aumentados, Salto Dimensional |
| **Espadachim** (combate) | Corte Duplo, Lâmina Giratória, Contra-ataque, Ruptura de Guarda, Tempestade de Lâminas, Corte do Vazio |
| **Núcleo ZERO** (tecnologia) | Sobrecarga, Drenagem de Energia, Análise de Alvo, Escudo de Energia, Sincronização ZERO |

Passivas funcionam sozinhas, técnicas entram nos combos da espada e as ativas vão para os atalhos 1–4 (com custo de energia e recarga). A energia se regenera devagar e sobe a cada acerto.

O progresso (nível, XP, habilidades, atalhos, evoluções, memórias e setor atual) é **salvo automaticamente** no navegador. Na tela de título aparecem **Continuar** e **Novo jogo**. Ao cair em combate, Kael volta ao início do setor mantendo a evolução.

## Técnicas da Tempestade Nula

| Comando | Técnica | Desbloqueio |
|---|---|---|
| Leve · Leve · Leve | Descarga Tríplice | Corte Duplo |
| Leve · Leve · Pesado | **Círculo da Ruína** | Lâmina Giratória |
| Esquiva → Leve | **Pulso Fantasma** | Pulso Fantasma |
| Esquiva → Pesado | **Corte do Vazio** | Corte do Vazio |
| Pesado (segurado) | Impacto Carregado | desde o início |
| I | **Eclipse Absoluto** | Eclipse Absoluto (nível 8) |

Entre os setores, Kael também escolhe **evoluções** (Fio Monomolecular, Condutor Iônico, Fase Quântica…) e pode aprender o Colapso Magnético (Pesado · Pesado) e o Relâmpago Ascendente (Leve · Pesado).

## Inimigos
- **Rastejador**: aranha mecânica de NEXUS que ataca em bando.
- **Drone Sentinela**: mantém distância e dispara lasers.
- **Legionário de Ferro**: blindado, com martelo de impacto e super armadura.
- **Caçador da Legião**: unidade rápida com investidas de lâmina.
- **Sacerdote do Eclipse**: fiel do Culto que lança orbes de dados.
- **Unidades de elite**: versões maiores e mais fortes, com aura dourada, na última onda de cada setor.
- **Criaturas das regiões** (mundo aberto, `js/mundo/variantes.js`), sobre os mesmos modelos, com cor, tamanho e comportamento próprios:

| Criatura | Onde | Base | Comportamento |
| --- | --- | --- | --- |
| Enxame Carmesim | Carmesin | Rastejador | ao morrer, vira dois menores |
| Lobo de Raiz | Velmora | Rastejador | caça em matilha (mais rápido em grupo); a mordida envenena |
| Sentinela de Esporos | Velmora | Sacerdote | os orbes deixam lento; regenera quando fica sem apanhar |
| Medusa Elétrica | Lagoa | Drone | explode ao morrer (aviso no chão antes) |
| Caranguejo de Cristal | Lagoa | Legionário | carapaça: golpes de frente perdem 60% do dano (vá pelas costas) |
| Agente Corporativo | Nexus | Caçador | some e reaparece ao lado do herói |
| Escorpião de Sucata | Seraph | Caçador | ferrão venenoso; entra na areia e sai debaixo do herói com impacto |
| Lobo das Neves | Asterion | Rastejador | matilha; a mordida congela (deixa lento) |
| Golem de Gelo | Asterion | Legionário | deixa poças de gelo por onde passa; golpes congelam |
| Elemental de Magma | Obsidiano | Sacerdote | deixa poças de fogo; ao morrer, vira dois menores |
| Diabrete de Cinza | Obsidiano | Drone | kamikaze: corre para o herói e explode |

  O veneno tira vida aos poucos mas nunca derruba (deixa com 1); pular passa por cima das poças.
- **NEXUS**: chefe em três fases. Usa raios do céu artificial e convoca suas defesas, e na fase III o próprio céu desmorona.

Máquinas atingidas por descargas elétricas (Arco Voltaico, Corrente Relâmpago, Campo Magnético…) entram em curto-circuito e ficam atordoadas por mais tempo.

## Kael em 3D: modelo, esqueleto, materiais e inspetor

O Kael do jogo (`MODELS3D.kaelTex`) usa a malha modelada no Meshy a partir da arte (`assets/modelos/kael_meshy.glb`, com a arte em pose "A" de referência em `assets/images/kael_frente_pose_a.webp`), convertida para o motor WebGL próprio do jogo. Nada foi trocado no motor nem no jogo; o Kael procedural `MODELS3D.kael` continua existindo e é usado nos fantasmas da esquiva e na seleção.

| Parte | Onde fica |
|---|---|
| Modelo | `tools/importar_modelo.py` converte o GLB → `js/assets/kael3d.js`; montagem em `js/models/kael_tex3d.js` (com as luvas articuladas). Alternativa feita só com as imagens da arte: `tools/gerar_kael3d.py` (+ `escultor3d.py`, `detalhes3d.py`) |
| Renderização e materiais | `js/engine3d.js`: atlas de sprites 3D, pele (skinning) na CPU, programa com textura + mapa de material (metal, aspereza, relevo) + mapa de normais no espaço tangente (referencial pelas derivadas de tela, sem tangentes), cor PBR ou arte com luz pintada, materiais por vértice (metal, couro, tecido, cabelo, pele), emissivo na passada de brilho, nível de detalhe por peça |
| Esqueleto e animações | `js/models/kael.js`: ossos (quadril, tronco, pescoço/cabeça, ombros, braços, antebraços, mãos e 14 falanges por mão, coxas, canelas, pés, capuz, cabelo, 6 abas do casaco com as barras), IK de braços e pernas, poses de todas as ações (repouso, corrida, golpes, habilidades, carga, esquiva, dano, especial, morte), dedos que fecham no cabo, molas de movimento secundário (casaco, capuz, cabelo: o importador liga ao osso `hair` o que sai do crânio, com peso crescente até a ponta; o cabelo vai para trás com a velocidade, balança a cada passada, abre no giro e ondula parado) |
| Carregamento e escolha | `js/game.js` (`prepare3D`: o personagem usa `kaelTex` quando existe); `js/assets/kael3d.js` vem embutido no `index.html` |

**Inspetor 3D** (modo dev: `index.html?dev=1&inspect=1`, ou console `` ` `` → `inspect`, ou `dev.inspect()`): frente, costas, perfil esquerdo, perfil direito (ortográficas, sem a distorção da projeção isométrica, na escala da arte), perspectiva do jogo e pose neutra do rig em raio-x com os ossos; todas as animações; arte de referência ao lado (F) ou sobreposta (O); D liga/desliga as peças de detalhe, L força o nível de detalhe, +/− e W/S aproximam e sobem.

**Como a malha do Meshy entra no jogo** (`python3 tools/importar_modelo.py assets/modelos/kael_meshy.glb --id kael`):
1. Os 250 mil triângulos do arquivo são reduzidos para 40 mil (o motor aplica a pele na CPU) e ganham uma UV nova.
2. Cor, metal/aspereza e normais são reassados da malha original: o relevo que a redução tirou (dobras, costuras, placas, rosto) e o mapa de normais do arquivo vão para um mapa de normais de 1024 px.
3. O esqueleto é medido nas silhuetas da própria malha (ombros, mãos, quadril, pescoço, tornozelos; pose "A" ou braços caídos) e cada vértice recebe o osso da sua região, com os pesos suavizados pela malha.
4. As mãos abertas da malha saem e entram as luvas com dedos articulados do jogo, que fecham no cabo da espada; o símbolo Ø luminoso das costas da ficha é acrescentado (o modelo do Meshy não tem).

**O que fica fiel**: rosto, nariz, boca e queixo esculpidos; cabelo com volume de verdade; gola alta, casaco longo com as abas, arreio do peito com o emblema, cinto com fivela, ombreiras, braçadeiras com as luzes azuis, joelheiras, tiras e botas — tudo como geometria, com textura, metal/aspereza e normais; animações do jogo inteiras com pele suave; símbolo das costas na posição da ficha.

**O que ainda não é fiel (limites honestos)**: o modelo é a interpretação do Meshy da arte — gola alta no lugar do capuz da ficha antiga e o desenho das costas é outro (o Ø foi acrescentado por cima); o GLB recebido não tem esqueleto (o link do Meshy com o rig não abre nesta rede), então os pesos de pele são automáticos: nos ataques mais abertos a barra do casaco perto das botas estica um pouco; as mãos são as luvas simplificadas do jogo, não as do modelo; a redução para 40 mil triângulos perde contorno fino (o detalhe volta como mapa de normais, não como silhueta); não há sombras projetadas (o jogo usa a sombra circular no chão). Com o GLB exportado do Meshy já com o rig, os pesos do próprio Meshy podem substituir os automáticos.

**Importar outro modelo detalhado** (OBJ com MTL e textura, ou GLB, por exemplo do Tripo, Meshy ou Blender): `python3 tools/importar_modelo.py modelo.glb --id kael`. Use `--cima` e `--frente` se o arquivo tiver outros eixos e confira o resultado no inspetor. Para voltar ao Kael esculpido só com as imagens da arte: `python3 tools/gerar_kael3d.py`.

**Aliados**: Lyra, Drakos, Sera e Orion também vêm das malhas do Meshy (`assets/modelos/lyra.glb`, `drakos.glb`, `sera.glb`, `orion.glb`), pelo mesmo importador (`python3 tools/importar_modelo.py assets/modelos/lyra.glb --id lyra`, e assim por diante): cada um no esqueleto do Kael com as próprias proporções, as mesmas animações, as mãos da própria malha e as luzes brilhando na cor-tema do personagem. Eles aparecem no inspetor (↑/↓ troca o modelo) e são todos jogáveis (a Lyra com kit próprio; Drakos, Sera e Orion pelo código do `Player`).

**Armas**: as armas GLB entram como peças do próprio modelo (`tools/importar_arma.py` → `js/assets/armas3d.js`; encaixes em `js/heroes/armas3d.js`), presas ao nó `sword` do esqueleto (que segue os golpes), à mão esquerda, ao tronco (costas) ou à coxa. Como são peças do mesmo modelo, ficam na frente ou atrás do corpo corretamente (profundidade única). As armas procedurais antigas (caixas e cilindros de `js/models/<herói>.js`) continuam no código e voltam sozinhas se `js/assets/armas3d.js` faltar.

Custo: ~38,5 mil triângulos e ~2,7 ms por quadro para posar e aplicar a pele no Kael (CPU); `js/assets/kael3d.js` tem 3 MB (malha, textura 2048 px, mapas de material e de normais).

## Como executar

Abra o `index.html` no navegador (duplo clique): o jogo roda sem instalação nem internet, só com scripts clássicos.

Para ver os **`.glb` originais** das armas e armaduras (prévia 360° e [V] AMPLIAR 3D) use um servidor local — pelo `file://` o navegador não deixa o jogo ler esses arquivos (as armaduras aparecem no modelo do jogo; as armas, na imagem 2D): `python3 -m http.server 8080` na pasta do projeto e acesse `http://localhost:8080`. O mesmo servidor serve para testar em outro aparelho da rede.

No menu inicial, **MODO 3ª PESSOA (3D)** abre a arena de teste em terceira pessoa (`js/thirdperson.js`).

**Testes automatizados**: abra `index.html?testes=1` (por `file://` ou pelo servidor). A suíte (`js/testes.js`, sem bibliotecas) roda dentro do jogo e mostra o resultado no canto da tela e no console: armas GLB (dados, decodificação e — pelo servidor — os arquivos de origem), encaixes de todos os heróis, sacar/guardar, dano único por golpe, combos e os nós que os liberam, árvore (ramos, custos, requisitos, efeitos), salvar/carregar, idle e troca de arma. `window.__testes` guarda o resultado para automação.

**Armas 3D (GLB)**: os modelos-fonte ficam em `assets/armas/eclipse/` (10–27 MB cada, gerados no Meshy). O jogo usa uma versão reduzida gerada por `python3 tools/importar_arma.py` (1,5–2,8 mil triângulos por arma, com cor, metal e brilho amostrados da textura do GLB) em `js/assets/armas3d.js`, que também abre por `file://`. Para trocar uma arma: substitua o `.glb` e rode o importador; a orientação, a posição da mão e o comprimento de cada arma ficam em `ARMAS` no próprio importador, e os encaixes (mão, costas, coxa) em `BACK` de `js/heroes/armas3d.js`.

### Celular, tablet e app instalado

- **Tela baixa (celular deitado)**: em jogo, com menos de 600 px de altura, a altura lógica cai de 720 para cerca de 1,25 × a altura da tela (mínimo 480), e o mundo, o HUD e os botões aparecem cerca de 1,5× maiores; os botões de toque mudam para um arranjo compacto entre o objetivo e a barra de habilidades. Nos menus e telas (inicial, principal, salvamentos, pausa, seleção de personagem, árvore, mapa, mochila, história), a altura lógica cai para cerca de 1,45 × a altura da tela (mínimo 560): letras e botões cerca de 30% maiores. As listas encolhem o espaçamento quando falta altura (`Menu.fitList`), e a seleção de personagem e a árvore de habilidades têm um arranjo compacto (cartões mais baixos, ficha e nós mais juntos) (`Game.resize`, `Game.modoTela`).
- **Som no celular**: o toque solto (`touchend`) e a volta para a aba retomam o áudio, que o sistema suspende ao bloquear a tela ou trocar de app.
- **Controles de toque** (`js/touch.js`): aparecem no primeiro toque na tela (ou com `?touch=1` na URL). Analógico flutuante na metade esquerda, botões ATAQUE (toque = leve), PESADO (segure para carregar), ESQUIVA e E (interagir); os 4 atalhos e a suprema do HUD viram botões; PAUSA e TAB (talentos) abaixo da vida. Nos menus o toque funciona como clique. No primeiro toque o jogo pede tela cheia na horizontal.
- **Instalar como app (PWA)**: servido por http(s), o jogo tem `manifest.webmanifest` e `sw.js`. No Chrome/Edge do computador ou do Android aparece **INSTALAR APP** no menu inicial (ou "Instalar" na barra do navegador / "Adicionar à tela inicial"); no iPhone, Compartilhar → Adicionar à Tela de Início. O app abre em tela cheia, sem a barra do navegador, e o que já foi jogado fica salvo para abrir sem internet (o service worker guarda cada arquivo na primeira vez que é usado). Para publicar: qualquer hospedagem estática (ex.: GitHub Pages) serve.
- **Qualidade máxima**: Configurações → Vídeo → Resolução interna **150% (ultra)** desenha acima da resolução da tela (supersampling, para placas de vídeo fortes); o contexto WebGL pede a GPU de alto desempenho (`powerPreference: 'high-performance'`), o que em notebooks com duas placas escolhe a dedicada.

## Estrutura do código

```
index.html          página mínima: canvas, CSS e scripts na ordem de carregamento
manifest.webmanifest, sw.js   app instalável (PWA) e cache para abrir sem internet
css/main.css        estilos da página (o jogo é todo desenhado no canvas)
js/
  config.js         resolução lógica, constantes de física, paleta, fontes, variável global "game"
  utils.js          matemática, projeção isométrica, formas e utilidades
  controls.js       entrada: KEYMAP/PADMAP e a classe Input (teclado, mouse, gamepad, analógico de toque)
  terceira.js       ThirdView: câmera em 3ª pessoa sobre o jogo (sala em 3D, modelos em perspectiva, efeitos projetados)
  touch.js          TouchControls: analógico e botões de toque (celular/tablet) ligados ao Input
  audio.js          AudioSys: trilha sonora dinâmica (MusicPlayer), narração/dublagem (NarrationPlayer), SFX pré-carregados e efeitos sintetizados (Web Audio API)
  effects.js        GlowCache, partículas, números de dano, rastros da lâmina, raios
  camera.js         Camera: acompanhamento, tremor e zoom
  lighting.js       Lighting: escuridão com furos de luz
  combat.js         avisos de ataque, Hitbox, ATTACKS (golpes), ComboSystem, ComboCounter
  progression.js    UPGRADES/UpgradeSystem, PROG (curva de XP), SKILLS/SKILL_TREES, Progress
  save.js           SaveSys: 5 espaços de salvamento no localStorage (versão do conteúdo e migração)
  settings.js       SETTINGS_TABS, Settings: opções do jogador e onde cada uma é aplicada
  data/             fichas do elenco: characters.js, abilities.js, armors.js, weapons.js, strings.js
  roster.js         RosterManager: desbloqueios, personagem ativo e armaduras
  engine3d.js       motor 3D WebGL próprio (G3, N3, Model3, R3D: pele, materiais, nível de
                    detalhe) e o registro MODELS3D
  inspector3d.js    Inspetor 3D do modo dev: vistas ortográficas, ossos, animações e arte de referência
  entity.js         Entity, base de jogador e inimigos
  abilities.js      ABILITIES: efeitos das habilidades ativas
  player.js         Player: movimento, golpes, esquiva, habilidades e supremas de todos os
                    personagens, idle dinâmico (variações, cansaço, guarda, vitória), desenho 2D
  heroes/           kit.js (estrutura dos kits de personagem, HERO_WEAPONS, HeroObjects) e
                    lyra.js (o kit completo da Lyra); pulo_defesa.js (pulo, queda, aterrissagem, mergulho e
                    defesa com aparo, de todos os heróis)
  quests.js         LoyaltyQuests: missões de lealdade dos aliados no Refúgio
  world.js          World: mundo aberto (regiões, zonas, acampamentos, baús, portais, mapa M)
  mundo/            regioes.js (as outras seis regiões), tempo.js (WorldTime: dia, noite e clima),
                    inventario.js (WorldInv: relíquias, mochila, mercador), missoes.js (WorldQuests),
                    variantes.js (ENEMY_VARIANTS, EnemyTraits: as criaturas de cada região)
  glbviewer.js      visualizador dos .glb de armas e armaduras, com a textura embutida (tela de seleção)
  thirdperson.js    ThirdPersonMode: arena de teste em terceira pessoa (WebGL próprio)
  kaelart.js        KaelArt: desenha o Kael com os sprites da arte oficial (quadro por estado)
                    — opção "Sprites 2D" e o modo sem WebGL
  enemies.js        ENEMY_TYPES, Enemy, Crawler, Legionary, Shooter, Hunter, AIDirector
  boss.js           HazardSystem e Boss (NEXUS)
  projectiles.js    ProjectileSystem
  pickups.js        PickupSystem (células, cápsulas, memórias)
  rooms.js          THEMES, ROOM_DEFS e Room (cenário pré-renderizado e colisões)
  waves.js          WaveManager (ondas, porta, chefe)
  ui.js             wrapText, glowText, drawIcon (ícones procedurais)
  hud.js            HUD: retrato, vida/energia, radar, missão, habilidades em losangos, células,
                    combo, letreiros, legendas e avisos (camadas em cache)
  screens.js        Screens: árvore de habilidades, evoluções, derrota e finais
  story.js          MEMORIES, STORY, ENDINGS, CHAPTERS (textos da história) e os aliados:
                    RECRUITS, towerVigil, ALLY_EPILOGUE, ALLY_RADIO
  storyscreen.js    Backdrop (cenários pintados, silhuetas dos aliados) e StoryScreen
  radio.js          AllyRadio: falas dos aliados pelo rádio durante o jogo
  assets/capa.js    arte da capa embutida (data URI gerado de assets/images/capa.jpg)
  assets/kael_sprites.js  sprites do Kael recortados da folha oficial (atlas embutido)
  assets/kael_arte.js     ilustração de corpo inteiro e rosto do Kael (seleção de personagem)
  assets/kael3d.js        Kael 3D: malha do Meshy com pele, textura (2048 px), mapas de material e de
                          normais, símbolo das costas (tools/importar_modelo.py)
  assets/kael_ref.js      vistas da arte do Kael para o inspetor (carregado só quando ele abre)
  assets/<aliado>3d.js    Lyra, Drakos, Sera e Orion em 3D: malhas do Meshy com pele, texturas e
                          mapas de normais (tools/importar_modelo.py a partir de assets/modelos/<id>.glb)
  menus.js          Menus: capa, tela inicial, menu principal, carregar, personagem,
                    configurações, créditos, pausa, confirmações e avisos
  game.js           Game: loop, estados, eventos de combate, XP, salvamento, renderização
  models/           modelos 3D (um arquivo por modelo, registrados em MODELS3D)
  main.js           boot(): cria o jogo — sempre o último script
assets/images/capa.jpg   arte da capa original (fonte do js/assets/capa.js)
assets/modelos/kael_meshy.glb  malha do Kael modelada no Meshy (fonte do js/assets/kael3d.js)
assets/modelos/<id>.glb  malhas da Lyra, do Drakos, da Sera e do Orion no Meshy (fontes dos js/assets/<id>3d.js)
tools/gerar_capa.py      gera js/assets/capa.js a partir da imagem
tools/gerar_sprites_kael.py  recorta a folha de sprites e a ficha do Kael (assets/images/kael_*.jpg)
                             e gera js/assets/kael_sprites.js e js/assets/kael_arte.js
tools/gerar_kael3d.py    esculpe o Kael 3D a partir da frente e das costas em alta resolução
                         (assets/images/kael_frente.jpg, kael_costas.jpg) e dos perfis da ficha,
                         e assa a textura
                         (gera js/assets/kael3d.js e kael_ref.js; usa tools/kael_rig.js para ler o esqueleto)
tools/escultor3d.py      peças comuns: casco visual, malhas, pesos de pele, textura e mapa de material
tools/detalhes3d.py      peças de detalhe sobre a malha: mechas, tiras, fivelas, placas, luzes, anéis
tools/extrair_vistas.py  tira as 4 vistas dos vídeos dos modelos dos aliados
tools/gerar_aliado3d.py  versão antiga dos aliados, esculpida das 4 vistas dos vídeos (alternativa)
tools/importar_modelo.py importa um modelo detalhado (OBJ/GLB) para o formato do jogo
```

### Ordem de inicialização

Os arquivos são **scripts clássicos** carregados em sequência pelo `index.html`. Declarações `const`, `let`, `class` e `function` de nível superior ficam visíveis para os scripts seguintes, como se fosse um arquivo só. Por isso:

1. A ordem do `index.html` precisa ser mantida: uma classe só pode estender outra já carregada (ex.: `Enemy` antes de `Boss`), e código que roda no carregamento só pode usar o que veio antes.
2. Dentro de funções e métodos a ordem não importa, porque eles só rodam depois do `boot()`.
3. `main.js` é sempre o último: ele cria a instância única `game` e inicia o loop (`requestAnimationFrame`).
4. Os modelos 3D (`js/models/*.js`) entram depois de `game.js` e antes de `main.js`.

Cada arquivo começa com `'use strict';`, como o script original.

### Onde mexer

| Para… | Edite |
|---|---|
| Novo golpe de espada ou técnica | `ATTACKS` e `COMBO_TABLE` em `js/combat.js` |
| Nova habilidade da árvore | `SKILLS` em `js/progression.js` (+ efeito em `js/abilities.js` se for ativa, ou em `Player.recalc()` se for passiva) |
| Curva de XP, pontos e atributos por nível | `PROG` e `XP_ENEMY` em `js/progression.js` |
| Novo inimigo | `ENEMY_TYPES`, uma classe em `js/enemies.js` e `createEnemy()` |
| Nova sala / ondas | `ROOM_DEFS` e `THEMES` em `js/rooms.js` |
| Nova evolução entre setores | `UPGRADES` em `js/progression.js` |
| Elementos do HUD | `js/hud.js`: posições em `HUD.layout()` e `HUDV` (bloco de vida/energia), áreas ocupadas em `HUD.buildZones()`, desenho estático em `HUD.layer()` |
| Menus, pausa, créditos, versão | `js/menus.js` (`CREDITS`, `GAME_VERSION`, `CHARACTERS` no topo do arquivo) |
| Personagem, habilidade, armadura ou arma do elenco | `js/data/characters.js`, `abilities.js`, `armors.js`, `weapons.js` (`RosterManager.validate()` avisa no console se uma referência estiver errada) |
| Condição de desbloqueio | campo `unlock` da ficha (`always`, `chapter_complete`, `boss_defeated`, `quest_complete`, `flag`) |
| Nova opção de configuração | `SETTINGS_DEFAULT` e `SETTINGS_TABS` em `js/settings.js` (+ o efeito em `Settings.apply()` ou onde a opção é lida) |
| Telas de evolução, árvore e finais | `js/screens.js` (desenho) e `js/game.js` (estado e entrada) |
| Textos da história | `js/story.js` |
| Recrutamento, epílogo e falas de rádio dos aliados | `RECRUITS`, `ALLY_EPILOGUE` e `ALLY_RADIO` em `js/story.js` (cenários em `Backdrop` de `js/storyscreen.js`; regras do rádio em `js/radio.js`) |
| Novos sons | `AudioSys.play()` em `js/audio.js` |
| Teclas e botões | `KEYMAP` e `PADMAP` em `js/controls.js` |
| Novo modelo 3D | crie `js/models/<chave>.js` com `MODELS3D.<chave> = { build, pose, opts, glows }` e inclua o `<script>` no `index.html` |
| Estilos da página | `css/main.css` |
| Trocar a capa | substitua `assets/images/capa.jpg` e gere `js/assets/capa.js` de novo (abaixo) |
| Kael 3D | `python3 tools/importar_modelo.py assets/modelos/kael_meshy.glb --id kael` gera `js/assets/kael3d.js` (requer node, numpy, scipy, opencv-python-headless, fast-simplification e xatlas); o modelo `MODELS3D.kaelTex` (`js/models/kael_tex3d.js`) usa as poses e animações do `MODELS3D.kael`. Alternativa só com a arte: `python3 tools/gerar_kael3d.py`. Veja **Kael em 3D** |
| Trocar o Kael por um modelo detalhado | `python3 tools/importar_modelo.py modelo.glb --id kael` (veja **Kael em 3D**) |
| Conferir um modelo 3D | inspetor do modo dev (`index.html?dev=1&inspect=1`) |
| Sprites do Kael | ajuste as caixas de cada quadro em `ANIMS` no `tools/gerar_sprites_kael.py` e rode `python3 tools/gerar_sprites_kael.py` (requer Pillow, numpy e scipy); a escolha do quadro por estado fica em `KaelArt.pick()` (`js/kaelart.js`) |

Para gerar o `js/assets/capa.js` a partir da imagem: `python3 tools/gerar_capa.py` (requer Pillow). A imagem fica embutida no JavaScript para o jogo funcionar abrindo o `index.html` direto do disco sem bloquear as miniaturas dos salvamentos.

Para manter o projeto organizado, coloque código novo no arquivo da responsabilidade correspondente (ou crie um arquivo novo e inclua-o no `index.html` na posição certa) em vez de voltar a concentrar tudo no `index.html`.

### Dependências

Nenhuma. Não há bibliotecas, CDNs, fontes externas nem arquivos de áudio: cenários, sons e os demais modelos 3D são gerados por código. As imagens são a arte da capa (`js/assets/capa.js`) e a arte oficial do Kael (`js/assets/kael_sprites.js`, `js/assets/kael_arte.js` e a malha/texturas 3D em `js/assets/kael3d.js`, convertidas de `assets/modelos/kael_meshy.glb`), todas embutidas no JavaScript. Os dados ficam no `localStorage` do navegador: `eclipse_zero_save_v1_slot1` … `_slot5` (salvamentos), `eclipse_zero_settings_v1` (configurações), `eclipse_zero_last_slot` e `eclipse_zero_best` (recorde).

### Versão de arquivo único

Até a reorganização, o jogo inteiro ficava no `index.html`. Essa versão continua no histórico do Git; para restaurá-la: `git checkout 12b0d26 -- index.html` (e apague `css/` e `js/` se quiser voltar ao formato antigo).
