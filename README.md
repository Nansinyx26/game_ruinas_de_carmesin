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
| R | **Granada de Plasma** do Kael (3 cargas, cada uma volta em 8 s) · na árvore de habilidades: **redistribuir os pontos** (aperte de novo para confirmar) |
| ESC | Pausa (menu de pausa) / pular história / voltar nos menus |
| M | Som liga/desliga |
| G | Gráficos 3D / 2D |
| V | Câmera isométrica / **3ª pessoa** (atrás do ombro) |
| Z / C · botão direito do mouse (arrastar) · roda | Na 3ª pessoa: girar a câmera · aproximar e afastar |
| M · B · Y · 5 | No mundo aberto: mapa · mochila (relíquias, ofícios, diário, campanhas) · diário de missões · cápsula de reparo |
| T | No mundo aberto: **teletransporte** para a cidade principal, o Refúgio da Aurora (ou o botão **AURORA** ao lado dos poderes) |
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
| L3 | L3 | Granada de Plasma (Kael) |
| Y (na árvore) | △ (na árvore) | Redistribuir os pontos |

- **Conectar:** por USB, ligue o cabo e aperte qualquer botão com a janela do jogo em foco. Por Bluetooth, pareie o controle nas configurações do sistema (Xbox: botão de parear; DualShock 4/DualSense: segure Share/Create + PS; GameSir: modo XInput/Android) e aperte um botão.
- Ao conectar ou desconectar aparece um aviso discreto no topo da tela. Se o controle desconectar durante a ação, o jogo pausa e toda a entrada do controle é zerada (Kael não continua andando sozinho).
- **Configurações → CONTROLES** mostra o estado (conectado, nome, tipo, mapeamento, "EM USO"), um **diagnóstico ao vivo** (analógicos com a zona morta, gatilhos e botões que acendem), a lista completa de comandos e as instruções de conexão. Ali também se ajustam sensibilidade, zona morta, eixo Y invertido da câmera e vibração.
- O teclado e o mouse continuam funcionando ao mesmo tempo; a interface mostra os ícones do último dispositivo usado.

**Limitações conhecidas:** controles que o navegador não reconhece como "standard" podem ter botões trocados (o diagnóstico avisa); a vibração depende do navegador (Chrome/Edge sim; Firefox e Safari geralmente não); um botão do controle não conta como "gesto" para o navegador, então a tela cheia precisa ser ligada com um clique ou tecla (ou F11); no Safari antigo e em alguns navegadores de celular a Gamepad API é limitada.

## Elenco de personagens

Kael Veyron é o personagem inicial; Lyra Kaede, Drakos, Sera Vyne e Orion são liberados pela campanha (Orion já começa disponível) e **todos são jogáveis**. Cada um tem atributos, cor-tema, 4 habilidades, armaduras e armas próprias; a Armadura Exoesqueleto serve para todos.

- **Granada de Plasma** (`js/heroes/granada.js`): equipamento do Kael, levado junto com a espada (não entra na troca Q; na aba ARMAS aparece como **SEMPRE EQUIPADA**). Tecla **R** (controle: **L3**; toque: botão **GRANADA**, só com o Kael): arremessa na direção pressionada ou para onde ele olha, com mira assistida no inimigo do cone, até 300 de distância. Voa em arco, pousa, mostra o anel de aviso e explode: dano em área (cresce com o poder do herói e cai com a distância do centro), empurrão para fora e curto-circuito nas máquinas (atordoadas por mais tempo). 3 cargas; cada uma volta em 8 s. O painel da arma no HUD mostra a tecla e as cargas. Funciona na campanha, no mundo aberto e nas duas câmeras. Não tem modelo `.glb` próprio: a granada é desenhada pelo jogo.
- **Exoesqueleto** (`js/heroes/exoesqueleto.js`): a armadura de todos agora aparece em 3D por cima de qualquer herói — armação de metal escuro com filetes azuis presa ao esqueleto: hastes do lado de fora das coxas, canelas, braços e antebraços, juntas nos quadris, joelhos, cotovelos e tornozelos, punhos, a coluna nas costas com a canga dos ombros e a bateria. As hastes encostam no corpo de cada herói porque as medidas vêm da própria malha. Além de +8% de defesa, +15 de vida e −3% de velocidade, **segura metade do empurrão** recebido. Escolher o Exoesqueleto na aba ARMAS veste a armadura.
- **Lâminas Sombra**: a arma especial do Orion (nível 55) que estava cadastrada como "Fuzil Sombra" é um par de lâminas, como o `.glb` dela (`orion_primaria.glb`): nome, tipo e atributos corrigidos (o id e os salvamentos continuam os mesmos).

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

## Criação de personagem

**Tela inicial** ou **Menu principal → PERSONAGENS · CRIAR** (`js/criacao/`). O jogador cria o próprio herói e joga o mundo aberto com ele, na vista isométrica e na 3ª pessoa. O mundo original do Kael e da história continua igual e separado.

- **Lista de personagens**: os personagens da conta, com classe e nível salvo. Dá para jogar (isométrica ou 3ª pessoa), editar a aparência, excluir (com confirmação; o mundo dele vai junto), criar um novo ou voltar ao mundo original do Kael.
- **Tela de criação**: o personagem aparece no centro em **3D de verdade**, desenhado pelo próprio motor do jogo em perspectiva, sobre um altar de runas, com luz, sombra e brasas no ar.
  - **Girar**: arraste com o mouse ou o dedo, ou use Z / C e os botões.
  - **Aproximar**: roda do mouse, + / − ou os botões (corpo inteiro, busto, rosto).
  - **Poses**: parado, guarda, vitória, correndo e o golpe da arma da classe.
  - **Painéis**: CLASSE, APARÊNCIA e EQUIPAMENTO (Q/E trocam de aba). À direita ficam o **nome**, os números reais da classe, as habilidades e a câmera inicial (isométrica ou 3ª pessoa).
  - **ALEATÓRIO** sorteia a aparência. Tudo muda na hora no modelo.
- **Nome**: de 2 a 16 caracteres (letras com acento, números, espaço, hífen ou apóstrofo), sem repetir outro personagem da conta. Recusado, aparece o motivo.
- **Aparência — estilo Realista** (o padrão; `js/criacao/montagem.js`): o personagem é montado com as **peças GLB** de `assets/Criar_Personagem/`, em grades de miniaturas (as PNG da pasta) por categoria:
  - **Corpo**: masculino ou feminino, e 5 alturas (de 92% a 108%).
  - **Rosto**: 8 rostos (4 masculinos e 4 femininos; qualquer um em qualquer corpo).
  - **Cabelo**: 8 penteados (curtos, espetados, longos, tranças, coque) ou sem cabelo; o cabelo comprido balança.
  - **Barba**: cacheada, curta, longa, média, viking ou sem barba.
  - **Cores**: 8 tons de pele (corpo e rosto juntos, a emenda do pescoço some) e 8 cores de cabelo (cabelo e barba). A cor é aplicada pixel a pixel na textura: sombras, poros e reflexos continuam.
  - Personagens salvos antes recebem as peças mais parecidas com o que tinham (corpo curvilíneo → feminino, o penteado e a barba pelo formato).
- **Aparência — estilo Estilizado** (13 opções, o modelo paramétrico de antes; `PERS_APAR` em `js/criacao/dados.js`):
  - **Corpo e altura**: 4 tipos de corpo (esguio, atlético, robusto, curvilíneo: ombros, quadril, braços e pernas) e 5 alturas (de 92% a 108%).
  - **Rosto**: 8 tons de pele e 4 formatos de rosto. Olhos em 6 cores; os **arcanos** brilham. Sobrancelhas em 4 opções.
  - **Cabelo e barba**: 8 cabelos (raspado, curto, topete, longo, rabo de cavalo, moicano, tranças, coque) em 8 cores; 5 barbas.
  - **Marcas**: cicatrizes, tatuagem, runas acesas ou pintura de guerra.
  - **Roupa**: 3 roupas por classe, com cor da roupa e cor dos detalhes.
- **Equipamento**: escolher a arma principal entre as da classe, escolher o peitoral inicial (gibão leve ou couraça pesada), ver o **conjunto do Iniciado** vestido na prévia (as sete peças em miniatura) e esconder o capuz.

### Classes

Cada classe luta com o conjunto de combate de um herói do jogo: golpes, combos, poderes, suprema, arma 3D e as 5 árvores de habilidades. O progresso é próprio do personagem. Por cima disso a classe tem vida, energia, velocidade e bônus próprios, aplicados de verdade no `Player.recalc`.

| Classe | Luta como | Vida · Energia · Velocidade | Bônus da classe | Peitoral inicial (padrão) |
|---|---|---|---|---|
| Guerreiro | Drakos (machado e martelo, escudo, investida, retaliação) | 150 · 90 · 210 | +6% defesa, +15% quebra de guarda | couraça (pesada) |
| Mago | Sera (bastão neural, drone, pulsos, campo de força) | 90 · 135 · 228 | +10% poder das habilidades, −8% recarga | gibão (leve) |
| Assassino | Orion (lâminas duplas, furtividade, golpe pelas costas, pistola) | 82 · 100 · 268 | +6% crítico | gibão (leve) |
| Patrulheiro | Lyra (kit completo: arco de fóton, armadilhas, iscas, chuva de flechas, gancho) | 92 · 110 · 250 | +4% crítico, alcance maior para coletar | gibão (leve) |
| Guardião Arcano | Kael (Tempestade Nula, técnicas, granada, Eclipse Absoluto) | 115 · 115 · 232 | +3% defesa, +6% poder | couraça (pesada) |

Todas as classes começam com o mesmo **conjunto do Iniciado** (nível 1, Comum): capuz, peitoral, luvas, calças, botas e capa vestidos, e o outro peitoral na mochila. O conjunto de nível 30 de cada classe se conquista no mundo (veja *Armaduras GLB* em *Mundo aberto*).

### No jogo

- **Mundo próprio**: confirmar a criação começa um mundo novo só daquele personagem, no Mercado Afundado, com o conjunto do Iniciado na mochila e vestido no **Arsenal** e 2 pontos de habilidade.
- **Personagem ativo**: o último escolhido na lista continua ativo, e **MUNDO ABERTO** no menu volta para o mundo dele. Para jogar com o Kael, escolha **Mundo original do Kael** na lista.
- **Retrato e árvores**: o HUD mostra o rosto do próprio modelo (com a aparência escolhida). Na árvore de habilidades (Tab), ele é a primeira aba.
- **Visual**: o modelo usa as peças de armadura vestidas, o clima na roupa (molhado, neve, geada), as poses de combate e as armas da classe, nas duas câmeras.
- **Moradores**: no primeiro encontro chamam o personagem pelo nome e comentam a classe; às vezes voltam a comentar depois.
- **O resto vale como para os heróis do elenco**: missões, contratos, ofícios, cidade, fabricação e campanha das regiões.
- **Salvamento** (no navegador):
  - **Perfis**: `eclipse_zero_perfis_v1` guarda a conta e os personagens; a versão anterior fica em `_reserva`.
  - **Mundo de cada personagem**: `eclipse_zero_mundo_v1:<id>`, com a posição em que ele estava; também tem reserva.
  - **Validação**: na leitura, tudo é validado. Um arquivo danificado usa a reserva, e o jogo avisa. Entradas inválidas são descartadas uma a uma (nome, classe, id e cada campo da aparência, que volta ao padrão se vier fora das opções).
  - **Excluir** um personagem apaga o mundo dele.
- **Pronto para servidor (sem rede)**:
  - **Ids**: cada personagem tem um id único (`p_…`) e a conta tem o dela (`conta_…`).
  - **Repositório**: `Perfis` (`lista`, `obter`, `criar`, `excluir`, `ativar`, `carregar`, `salvar`) é o único lugar que lê e grava; trocar o `localStorage` por chamadas a um servidor muda só esse objeto.
  - **Camadas**: dados e regras (`dados.js`), modelo 3D (`modelo.js`) e tela (`tela.js`) ficam separados.
  - **Não há multijogador**: nada é enviado pela rede.
- **Desempenho**: o modelo de cada personagem é montado uma vez (e refeito só quando a aparência muda). O retrato é desenhado uma vez e guardado. A prévia da tela usa o mesmo motor e as mesmas malhas do jogo.

### Limites

- **Peças GLB**: os modelos da pasta foram gerados separados, sem esqueleto e em escalas diferentes. O conversor encaixa cada um sozinho (o rosto pelo crânio, cabelo, barba e capuz pela cobertura da cabeça, as armaduras pela região do corpo, empurradas para fora da pele) e liga tudo ao esqueleto do Kael; em poses extremas uma peça pode encostar ou atravessar um pouco a outra. O cabelo some debaixo do capuz. Não há controles deslizantes livres nem *morph targets*: as escolhas são as peças da pasta.
- **Tamanho**: cada peça convertida tem de 0,3 a 1,4 MB (45 MB ao todo em `js/assets/criacao/`); o jogo só carrega as peças que o personagem usa.
- **Estilizado**: o modelo paramétrico tem menos polígonos, no estilo dos modelos procedurais do jogo.
- **Classe**: não muda depois de criada (as árvores e o equipamento são dela).
- **Animações e campanha**: as animações e os golpes são os do herói da base da classe. O personagem criado não entra na campanha da história nem nas missões de lealdade e campanhas dos heróis do elenco: ele joga o mundo aberto.

### Peças GLB da criação: conversão

`tools/importar_criacao.py` (Python com numpy, scipy, OpenCV, fast-simplification, xatlas e DracoPy) lê os GLB de `assets/Criar_Personagem/` **sem mover, renomear nem copiar** os arquivos e grava `js/assets/criacao/<id>.js` (malhas com pele, textura, mapa de material e de normais reassados), `catalogo.js` (os caminhos reais de cada GLB e miniatura) e `minis.js` (as miniaturas em data URI, porque imagens de arquivo não podem ir para o canvas abrindo o jogo do disco).

```bash
python3 tools/importar_criacao.py --listar          # inventário dos GLB por pasta
python3 tools/importar_criacao.py                   # tudo (corpos primeiro, ~15 min, 2 processos)
python3 tools/importar_criacao.py --so rosto_3      # só algumas peças (os corpos já convertidos ficam)
python3 tools/importar_criacao.py --minis           # só miniaturas e catálogo
```

- **Corpos** (masculino e feminino, 1,5 milhão de triângulos e textura 4K cada): reduzidos a 18 mil triângulos e ligados ao esqueleto pelas silhuetas (o mesmo processo dos heróis); a cabeça careca sai e o corpo é dividido em regiões (tronco, braços, mãos, pernas, pés) para esconder o que fica dentro de botas, luvas e calças.
- **Rostos**: crânio do busto encaixado no crânio do corpo (escala e posição pela distância entre as superfícies), pescoço levado à forma do pescoço do corpo.
- **Cabelos, barbas e capuzes**: escala e posição que melhor cobrem a cabeça sem entrar nela nem tapar os olhos.
- **Armaduras**: botas e luvas em par (separadas e postas em cada pé e mão), peitoral e calças na caixa da região, capa presa na base do pescoço e pendurada nas abas do casaco do Kael (balança), amuleto no peito.

## Mundo aberto

Menu inicial ou menu principal → **MUNDO ABERTO** (vista isométrica), **MUNDO ABERTO · 3ª PESSOA** ou **CAMPANHAS DOS HERÓIS** (o mundo com a lista das campanhas aberta). Na pausa: **CÂMERA** alterna as duas vistas e **MUNDO ABERTO** leva da campanha para o mundo (a campanha fica salva); dentro do mundo, o mesmo item abre o mapa. No toque, o botão **3D** alterna a câmera e arrastar na metade direita gira.

**Câmera em 3ª pessoa** (`js/terceira.js`, `ThirdView`): o mesmo jogo (campanha e mundo aberto) visto de trás do ombro, em perspectiva. O motor 3D (`R3D.renderScene`) desenha numa passada a sala montada em 3D a partir da `Room` (piso em ladrilhos, paredes com as aberturas da porta e das passagens, pilares e luminárias), os heróis com armaduras, cabelo e armas, os inimigos, NPCs, baús, coletáveis e sombras, com névoa na cor do tema. Os efeitos 2D (partículas, auras, projéteis, números de dano, barras de vida) usam a projeção da câmera e aparecem no lugar. O movimento é relativo à câmera; parado sem girar, ela volta para trás do herói quando ele anda. O pilar que fica entre a câmera e o herói some. A arena antiga de 3ª pessoa continua no menu como **ARENA 3D (TREINO)**.

- **Movimento**: a câmera segue o herói por uma mola, antecipando um pouco o movimento (sem trancos), balança de leve com os passos, afunda na aterrissagem e abre o campo de visão na esquiva (com linhas de velocidade nas bordas, se o pós-processamento estiver ligado). O corpo do herói inclina para a frente ao correr e para dentro das curvas; no campo aberto, os passos levantam poeira na cor do chão.
- **Ambientação** (`js/terceira_ambiente.js`, `Ambiente3P`): **céu** por bioma e pela hora do mundo — degradê do zênite ao horizonte, dourado no amanhecer e no entardecer, sol e lua que andam com a hora, estrelas, nuvens que derivam e escurecem com chuva, tempestade, neblina e areia (na campanha, sempre noite). No **horizonte**, duas camadas de relevo em volta inteira: copas (floresta), dunas (deserto), montanhas com neve nos picos (Asterion), ilhas com cristais (lagoa), vulcões com a boca acesa (cratera) e prédios com janelas (cidade). A névoa tem a cor da terra distante e o chão continua até o horizonte, então não há linha onde o chão acaba. A luz ambiente e a do sol mudam com a hora (quente no entardecer, azulada à noite), e a direção da luz acompanha o sol durante o dia. Interiores ganham um teto escuro.
- **Chão do campo aberto com textura e relevo** (`js/texturas.js`): o piso vira um atlas da zona com a textura do bioma, manchas grandes, as trilhas até as passagens e a borda que some na terra distante, desenhado pelo programa com textura do motor e com relevo (o sol desenha as ondulações da areia e as rachaduras do basalto). Por cima, detalhes que não colidem: capim e flores acesas (floresta), ondulações, pedras e arbustos secos (deserto), montes de neve e lascas de gelo (neve), poças e juncos (lagoa), fendas de lava (cratera) e poças de neon (cidade); e no ar, partículas com profundidade — pólen (vaga-lumes à noite), poeira levada pelo vento, cristais de gelo, névoa baixa, cinzas e brasas que sobem. A quantidade segue a **Qualidade dos efeitos** (na baixa, o chão volta às placas sem textura).

Sete regiões **realmente exploráveis** com o mesmo combate, personagens, árvores e HUD da campanha.

- **Ruínas de Carmesin** (`js/world.js`): 9 zonas numa grade 3×3 (Mercado Afundado, Portões Partidos, Avenida dos Ecos, Torre de Vigia, Praça Carmesim, Galerias de Serviço, Laboratório Esquecido, Fendas Rubras e Coração Carmesim), cada uma com nível recomendado. **Passagens** acesas nas bordas levam à zona vizinha (pare sobre a luz).
- **As outras seis regiões** (`js/mundo/regioes.js`), com 6 zonas cada (2×3), na ordem sugerida: **Floresta de Velmora** (níveis 8–16, Guardiã das Raízes), **Lagoa Cristalina** (12–22, Sentinela do Abismo), **Nexus** (10–20, Arauto de Nexus), **Deserto de Seraph** (14–24, Faraó de Sucata), **Montanhas de Asterion** (18–28, Titã do Pico) e **Cratera de Obsidiano** (25–40, Núcleo de Obsidiana). Cada uma tem zona de chegada com portal, mercador e quem dá as missões, acampamentos montados com os inimigos da região, baús, um segredo, terminais e o chefe regional na última zona. Uma região abre com o chefe da anterior derrotado ou quando o herói chega ao nível mínimo dela; a primeira ida é pelo portal (viagem rápida até a chegada). Os biomas têm temas próprios: no lugar das colunas, **árvores** (floresta), **rochas** com neve no topo (montanhas) ou fendas de lava (cratera) e **cristais** acesos (lagoa), também em 3D na 3ª pessoa.
- **Mundo até o nível 100** (`js/mundo/expansao.js`, `WORLD_FAIXAS` em `js/world.js`): quatro faixas de nível, cada uma com a sua cidade.
  - **1–25 · Cidade inicial**: o Refúgio da Aurora, Carmesin e as seis regiões acima.
  - **25–50 · Metrópole Tecnológica** (e a Cratera de Obsidiano): megacidade da corporação, cenário neon com chuva; chefe **Supervisor Ômega** no Núcleo Ômega.
  - **50–75 · Cidade das Ruínas Carmesins**: a capital antiga partida pela energia vermelha, catedrais e mercados mortos; chefe **Rei Carmesim** no Salão do Trono.
  - **75–100 · Nexus Zero**: a cidade de dados onde o NEXUS nasceu; chefe **NEXUS ZERO** no Núcleo Zero.
  - Cada cidade é uma região de **9 zonas (3×3)**: no centro a cidade (portal, mercador, quadro de contratos e moradores com ferreiro, curandeiro, artesão, treinador e quem conta rumores), em volta os distritos com acampamentos, baús, terminais e segredos, uma **masmorra** de três andares (Cofre Ômega, Cripta Real, Raiz do Código), dois **tesouros**, 3 missões da região, 3 missões secundárias, contratos diários, facção com insígnia, clima e temperatura próprios e inimigos novos (sentinelas neon, executores, cavaleiros rubros, espectros, fragmentos de código, arautos nulos, golens de dados).
  - **Acesso só pelo nível**: a Metrópole abre no **25**, as Ruínas no **50** e Nexus Zero no **75** — derrotar o chefe anterior não basta. O portão no Refúgio da Aurora mostra o cadeado e o nível até lá.
  - **Equipamento por faixa**: as peças do Arsenal que caem têm o nível da zona (e pedem o nível − 4); a família acompanha a faixa (Cristal, depois Obsidiana) e os chefes de Nexus Zero deixam o conjunto **Eclipse** (Lendário). Os conjuntos GLB de nível 30 de cada classe caem a partir das zonas 25+.
  - **Experiência**: acima da zona 40 cada inimigo rende mais (+9% por nível da zona, cerca de 6× na zona 99), para o nível 100 ser alcançável jogando as cidades.
  - **Nível máximo 100**: defesa e mobilidade por nível rendem 1/4 depois do 40 (o herói não fica blindado nem rápido demais; o resto vem do equipamento). No nível 100 a experiência vira **maestria**: um ponto a cada 60 mil (+0,5% de dano e +3 de vida cada, até 200), mostrada na barra de experiência e guardada no salvamento.
- **Texturas e céu na vista isométrica**: o chão das zonas de bioma tem a textura do bioma gerada por código (`js/texturas.js`, sem imagens): capim com touceiras, terra e florzinhas; areia com ondulações do vento; neve com sombras azuladas, placas de gelo e cintilância; lama com musgo, poças e pedrinhas; basalto rachado com cinza e brasas. Ela é aplicada no plano do chão (com a projeção), com variações de luz suaves e a borda que se funde na terra distante. Atrás da área de jogo, o **céu** da hora e do bioma (nuvens, sol ou lua, estrelas), o relevo ao longe e a terra distante, com um leve paralaxe; os relâmpagos das tempestades também aparecem nos biomas.
- **Campo aberto** (`Room.aberto`, `js/rooms.js`): as zonas de bioma (floresta, lagoa, deserto, montanha e cratera) não têm paredes nem porta. O chão continua além da área de jogo numa margem de paisagem (árvores, rochas e cristais que não bloqueiam, trilhas que saem pelas bordas) e **andar para fora por qualquer ponto da borda** leva à zona vizinha, chegando no ponto correspondente do outro lado (sem precisar da passagem acesa). Dentro da área, obstáculos naturais espalhados, lampiões no chão, mais grupos de inimigos (um deles **em patrulha** entre três pontos da zona) e recursos para colher. Na 3ª pessoa o campo aberto também não tem paredes. As zonas de Carmesin, as de Nexus (cidade, metrô, laboratório), o Templo Soterrado de Seraph e as Cavernas de Gelo de Asterion continuam como salas, ligadas pelas passagens.
- **Coleta** (tecla **E** perto do recurso): cada região tem o seu (Erva Luminosa em Velmora, que também cura; Cristal da Lagoa; Fragmento Enterrado em Seraph; Minério de Gelo em Asterion; Obsidiana Bruta na cratera), 5 por zona aberta, e as zonas fechadas fora das cidades têm 2 montes de **ferro-velho** (sucata). Dá o **material** do recurso (ver Ofícios), células conforme o nível da zona e às vezes uma relíquia, e volta a crescer no dia seguinte do mundo.
- **Inimigos variados** (`js/mundo/variantes.js`): cada região tem criaturas próprias, montadas sobre os cinco inimigos do jogo com outra cor, tamanho, atributos e comportamento (ver **Inimigos**). As missões de abate de algumas regiões pedem essas criaturas.
- **Dia e noite** (`js/mundo/tempo.js`): um dia do mundo dura 10 minutos. O relógio aparece no HUD (no lugar da pontuação); as zonas abertas clareiam de dia, escurecem à noite e ficam alaranjadas no amanhecer e no entardecer (os interiores quase não mudam). À noite os acampamentos demoram mais a notar o herói e os abates dão +20% de experiência.
- **Clima por região**: chuva, tempestade com raios, neve, nevasca, tempestade de areia, chuva de cinzas, brasas no ar, neblina e vaga-lumes (só à noite), sorteados com peso para cada região e trocados a cada poucos minutos. Pouca visibilidade também reduz a distância em que os acampamentos acordam.
- **Relíquias com raridade** (`js/mundo/inventario.js`): Comum, Incomum, Rara, Épica e Lendária. Cada relíquia tem um atributo principal (dano, vida, energia, crítico, velocidade, defesa ou recarga) e, das raras para cima, atributos extras; o valor cresce com a raridade e com o nível da zona. Até **3 equipadas**, só valem no mundo aberto. Todo baú dá uma (o secreto, rara ou melhor; o do chefe, épica ou melhor), o chefe regional sempre deixa uma e os outros inimigos às vezes (as unidades de elite, que agora aparecem nos acampamentos a partir do nível 6, com mais chance).
- **Mercador** (na zona de chegada de cada região, pela conversa → *Ver mercadorias*): vende 4 relíquias da região, renovadas a cada dia do mundo, cápsulas de reparo, consumíveis, sucata e o material da região, e — com reputação **Honrado** — a **insígnia da facção** (relíquia única); os preços caem com a reputação. Compra as suas relíquias por 40% do valor e os materiais pela metade. Longe dele, uma relíquia pode ser desmontada por 20%. **Cápsulas de reparo**: até 5, tecla **5** cura 40% da vida.
- **Requisito e aprimoramento das relíquias**: equipar pede o nível do herói (nível da relíquia − 4; as já equipadas continuam). O **ferreiro** aprimora de +1 a +5 (+10% nos atributos por nível) com células e materiais (núcleo a partir do +3, essência no +5).
- **Missões da região** (`js/mundo/missoes.js`): 3 por região, em sequência, com quem tem **!** sobre a cabeça na zona de chegada (**?** quando há uma para entregar): abates de um tipo de inimigo, unidades de elite, baús, terminais, explorar todas as zonas e o chefe regional. Aceitar, ver o andamento e entregar é pela conversa. A recompensa é em células, experiência, uma relíquia com raridade mínima e reputação.
- **Moradores e conversa** (`js/mundo/povo.js`, `js/mundo/dialogo.js`): cerca de 40 pessoas com nome, função e personalidade, nas cidades (zonas de chegada, Mercado Vertical), nos **vilarejos** (Vila da Praça, Vilarejo do Lago Escuro, Vila dos Pescadores, Guarnição da Vigília — sem acampamentos por perto, para que ninguém fique inacessível) e em alguns cantos das regiões. [E] abre uma **caixa de diálogo** com o retrato (o próprio modelo 3D, ampliado), o nome, a função e a fala (aparece aos poucos; Enter mostra tudo) e as **respostas**: entregar ou aceitar missões, serviços, *Alguma novidade?* (rumores — alguns marcam no mapa uma masmorra, um tesouro ou um lugar), *Quem é você?*, assuntos sobre a região, os monstros e o que aconteceu, e despedida. Setas e Enter, 1–9, mouse ou toque escolhem; Esc sai; o jogo fica parado enquanto conversam. Alguns andam entre pontos de dia e voltam para casa à noite; param quando o herói chega perto e só se encolhem (sem conversar) com inimigos acordados por perto. Nem todo mundo tem missão. As falas usam a voz sintetizada quando ela está ligada.
- **Serviços**: **curandeiro** (cura a vida e a energia por células; vende remédios), **ferreiro** (aprimoramento), **artesão** (receitas) e **treinador** (uma sessão de treino por dia do mundo, que dá experiência; o **desafio da arena**, três ondas em 90 segundos; e a árvore de habilidades). Há cada um em pelo menos três regiões.
- **Missões secundárias** (`js/mundo/aventuras.js`): 23, de 3 a 5 por região, independentes da campanha e das missões da região, cada uma com título, descrição, quem dá, nível recomendado, requisitos, objetivos, recompensas e histórico (dia e hora do mundo de cada avanço). Tipos de objetivo: **abater** (de um tipo, numa região), **coletar e entregar** materiais, **conversar/levar** uma carta ou pacotes a outras pessoas (até em outra região), **encontrar alguém desaparecido** (a pessoa aparece na zona e volta para casa), **investigar** pistas (ou **sabotar** relés), **chefe opcional** com nome que só aparece com a missão, **escoltar** alguém pela zona (com emboscadas; a pessoa perde vida com inimigos perto dela e, se cair, a escolta recomeça), **chegar a um lugar escondido**, **vencer uma masmorra** e **participar de eventos**. Algumas terminam com uma **escolha** (cada resposta com a própria recompensa). Recompensas: experiência, células, relíquias (algumas únicas), materiais, consumíveis, experiência de ofício e reputação. Nenhuma bloqueia a campanha: o mundo tem salvamento próprio e a história principal não muda.
- **Contratos** (o **quadro de contratos** na zona de chegada de cada região): dois por dia do mundo — uma caçada e uma coleta —, entregues no próprio quadro.
- **Diário de missões** (tecla **Y**, pausa → DIÁRIO DE MISSÕES, ou a aba DIÁRIO da mochila): ATIVAS, DISPONÍVEIS e CONCLUÍDAS (secundárias, contratos, missões das regiões e a campanha do herói), com objetivos, recompensa, histórico e onde falar com quem dá. **Rastrear** uma missão põe o objetivo no quadro do HUD, um **◆** no mapa (maior para a rastreada) e um ◆ dourado sobre o alvo na zona (e no radar); dá para **abandonar** e aceitar de novo. Uma disponível também pode ser marcada no mapa.
- **Ofícios, materiais e consumíveis** (`js/mundo/oficios.js`, aba OFÍCIOS da mochila): materiais — sucata, erva, cristal, fragmento, gelo, obsidiana, núcleo instável (elites) e essência carmesim (chefes e masmorras). Consumíveis — **Tônico de Fúria** (+20% de dano por 60 s), **Poção Pele de Pedra** (+15% de defesa por 60 s), **Elixir de Energia** e **Pedra de Retorno** (viagem rápida de qualquer lugar). Dois ofícios, de 1 a 10: **Coleta** (mais material por coleta, essência a partir do nível 5) e **Criação** (libera receitas e melhora a raridade da **relíquia forjada**).
- **Reputação** (uma facção por região: Desconectados de Carmesin, Guardiões de Velmora, Pescadores da Lagoa, Resistência de Nexus, Nômades de Seraph, Vigília de Asterion, Forjadores da Cratera): missões, contratos, eventos, masmorras e chefes dão reputação. Níveis Neutro, Amigável (−5% no mercador da região), Honrado (−10% e a insígnia), Reverenciado (−15%) e Exaltado (−20%).
- **Masmorras** (`js/mundo/locais.js`): uma por região (Catacumbas Carmesins, Raiz Profunda, Gruta Submersa, Cofre Corporativo, Tumba Esquecida, Caverna do Eco, Câmara do Primeiro Fogo), com a entrada numa zona do mapa — a maioria escondida até um rumor ou até o herói passar bem perto. Três andares: a passagem para cima fica **selada** até os inimigos do andar caírem; no último, o **chefe da masmorra** e o baú dela (paga uma vez por dia do mundo; a primeira vitória dá experiência e reputação). Duas saem em outra zona (**caminho alternativo**). Recomeçam a cada visita.
- **Tesouros escondidos**: oito pontos de escavação que só brilham de perto, a menos que um rumor (ou um raro **mapa do tesouro** deixado por uma elite) marque o lugar (✦ no mapa). Pagam uma vez.
- **Eventos dinâmicos** (`js/mundo/eventos.js`): de tempos em tempos (2 a 4 minutos) começa um evento numa zona já descoberta da região — **incursão** (três ondas em volta de um estandarte), **caravana atacada** (salve a carroça antes que caia), **chuva de fragmentos** (colete seis) ou **caçador errante** (uma elite com nome em patrulha). Aparece no mapa (⚔), no quadro do HUD e num aviso; dura algumas horas do mundo se ninguém for até lá.
- **Mochila** (tecla **B**, ou pausa → MOCHILA E OFÍCIOS): abas MOCHILA (vagas equipadas, bônus somados, cápsulas, grade de relíquias com detalhes e requisito), OFÍCIOS, DIÁRIO e CAMPANHAS; aberta por um morador, também LOJA (mercador ou curandeiro), FERREIRO ou ARTESÃO. Funciona com teclado, controle, mouse e toque.
- **Campanha de cada herói** (`js/mundo/campanhas.js`; menu → **CAMPANHAS DOS HERÓIS** ou mochila → aba CAMPANHAS): cinco histórias de 5 capítulos cada, que atravessam as regiões e só andam jogando com o herói delas (escolher a campanha de outro herói troca para ele). Cada uma abre com páginas de história; cada capítulo fica numa zona, marcada com **★** no mapa, no radar e no quadro de missão. Lá aparece o **sinal** (uma luz na cor do herói): investigar ([E]) começa os passos do capítulo, um depois do outro, com falas do herói: **pistas** para examinar espalhadas pela zona, **grupos** de inimigos, **ondas** em sequência e **chefes** com nome (elite, mais vida, outra cor e escolta). Cada capítulo termina com uma página de história, experiência e células; o capítulo em andamento abre a região dele no mapa (mesmo abaixo do nível; o nível recomendado aparece na aba). O último dá uma **relíquia lendária única**. Sair da zona ou cair recomeça o capítulo.

| Herói | Campanha | Capítulos (zona) | Relíquia final |
| --- | --- | --- | --- |
| Kael | Ecos do Projeto ZERO | A Ala C (Laboratório Esquecido) · Servidores Sob as Raízes (Ruínas Engolidas) · A Luz que Chama (Farol Apagado, Vigia do Farol) · O Nome no Rádio (Cavernas de Gelo) · Onde a Tempestade Foi Forjada (Fendas Ardentes, Protótipo ZERO-1) | Coração da Tempestade |
| Lyra | Longe da Rede | As Muralhas (Portões Partidos) · Rastros (Trilha dos Galhos Mortos) · Os Que Ficaram de Fora (Lago Escuro, Predador de Musgo) · A Travessia (Recife de Vidro) · Família (Cidade Engolida, Caçador de Sucata) | Corda Violeta |
| Drakos | A Voz da Legião | Ameaça Prioritária (Fendas Rubras) · Listas (Avenida Central) · Os Outros Soldados (Metrô Abandonado) · A Fortaleza (Fortaleza da Vigília, Centurião de Ferro) · O Último Módulo (Forja Antiga, Marechal da Legião) | Placa de Onze Anos |
| Sera | A Mente de NEXUS | Ouvidos de NEXUS (Torre de Vigia) · Memória Líquida (Ilha dos Cristais) · O Laboratório (Laboratório Corporativo) · O Primeiro Código (Templo Soterrado, Guardião do Código) · Silêncio (Geleira Partida, defesa em 3 ondas) | Drone Silencioso |
| Orion | Sem Registro | Contrato Antigo (Galerias de Serviço) · Rostos (Mercado Vertical) · A Corporação (Cânion Rubro) · O Laboratório Atrás do Vidro (Ruínas Submersas) · Apagar o Nome (Cratera Viva, A Mão Invisível) | Lâmina Sem Nome |

  As falas das campanhas são só texto (sem dublagem gravada). O andamento fica no salvamento do mundo.
- **Acampamentos e encontros** (`js/mundo/encontros.js`, `Encontros`): os grupos ficam no seu lugar, parados (olhando em volta) ou em patrulha, e só entram na luta quando **percebem** o herói — pela distância (300 de dia; menos à noite e com pouca visibilidade; elites e chefes um pouco mais), pela frente (de costas, só pouco mais da metade), pela **linha de visão** (colunas, árvores, rochas e cristais escondem; colado neles, 110, sentem mesmo sem ver) e pelo **barulho** (golpes, esquivas e cargas são notados de mais longe; andar devagar, com o analógico pela metade, menos). Percebido, o grupo para, vira para o herói e um **"!"** aparece (0,6 s; elites e chefes mais rápidos): se ele continua à vista, a luta começa; se sumiu, **"?"** e voltam ao que faziam. Atingido, o grupo acorda na hora. **Coleira**: com o herói longe da casa do grupo (pouco mais da metade da zona, até 720; chefes mais), longe de todos eles ou fora de vista por alguns segundos, o grupo **desiste** ("?"), volta para casa recuperando a vida e dorme de novo — dá para **fugir** de uma luta sem sair da zona. O **barulho da luta** (golpes e mortes) deixa em alerta os acampamentos vizinhos que tenham linha de visão. Voltam a cada visita (o do chefe não, depois de derrotado); ondas de eventos e inimigos de missões continuam acordados desde o começo.
- **Baús** (células, experiência, cápsula de reparo), **terminais** com memórias da cidade, um **local secreto** que só aparece de perto, **NPCs** no Mercado e o **chefe regional** (Guardião Carmesim) no Coração Carmesim — o baú dele só abre depois.
- **Descoberta e viagem rápida**: entrar numa zona pela primeira vez a descobre (experiência); **portais** ativados viram destinos de viagem rápida.
- **Mapa do mundo** (tecla **M**, botão MAPA no toque, ou o portal; `js/mundo/mapa.js`, WorldMapArt): um mapa ilustrado, pintado uma vez quando abre (sem imagens nem bibliotecas: ruído determinístico, sempre o mesmo mapa). Um continente cercado de mar, com o relevo sombreado e o terreno de cada região no seu bioma: as ruínas rachadas e o núcleo vermelho de Carmesin, as árvores de Velmora, os picos nevados de Asterion, os prédios e a cúpula do Nexus, as dunas e o cânion de Seraph, as ilhas e cristais da Lagoa e a cratera com rios de lava do Obsidiano; rios e estradas ligando Carmesin às outras regiões. Regiões ainda não exploradas ficam sob névoa (as bloqueadas, mais fechada e hachurada). Por cima: trilhas entre as zonas vizinhas (cheias as descobertas, tracejadas as outras), um marcador por zona com o ícone do que há nela (⌂ base com mercador, ◈ portal ativado, ☠ chefe regional, ? não descoberta) e, ao lado, as missões (◆), masmorras conhecidas (▼), tesouros marcados (✦), lugares de rumor (…) e eventos (⚔), o nome de cada região com a faixa de nível, cadeado (e o que abre cada uma) ou ✓ quando o chefe caiu, a ★ da campanha e onde você está; moldura de atlas com coordenadas, rosa dos ventos e escala. O painel da zona escolhida mostra região, bioma, nível e o que já se sabe dela (mercador, portal, chefe, baús abertos, terminal, campo aberto, capítulo da campanha). Q/E aproximam e afastam (os nomes das zonas descobertas aparecem com zoom); na viagem rápida, os destinos pulsam.
- **Salvamento próprio** (`localStorage`, chave `eclipse_zero_mundo_v1`): nível, árvores, elenco, zonas descobertas, baús, portais, chefes, hora e clima, mochila, estoque do mercador, missões, missões secundárias e contratos, materiais, consumíveis, ofícios, reputação, masmorras, tesouros, eventos e o que se sabe de cada morador. Não mexe nos 5 espaços da campanha. Ao cair, o herói volta ao último portal. Ao carregar, as missões são conferidas (missão desconhecida, passo fora da lista, contrato velho, rastreio inválido) para nada ficar travado; as recompensas são pagas uma vez só.
- **Limites**: cada zona continua sendo uma área carregada por vez (o campo aberto liga as zonas pelas bordas, mas a vizinha só é carregada na travessia, com um escurecer rápido); as criaturas das regiões usam os modelos 3D dos cinco inimigos da campanha recoloridos e redimensionados, não modelos novos; os chefes regionais, opcionais e de masmorra são versões de elite deles; os moradores usam os modelos dos NPCs que já existiam (sobrevivente, anciã e gravação holográfica); os retratos do diálogo são o próprio modelo ampliado, não arte desenhada; não há multiplayer (não há servidor; nada de multiplayer simulado).

### Clima dinâmico e temperatura do corpo

- **Intensidade e transição** (`js/mundo/tempo.js`): cada clima tem intensidade — **chuva fraca ou moderada**, **tempestade** (raios, e o trovão chega depois do clarão, mais baixo quanto mais longe), **neve fraca**, **neve**, **nevasca**, **neblina leve ou densa**, tempestade de areia, cinzas, brasas, vaga-lumes e a **onda de calor** (só de dia, no deserto e na cratera). A troca é gradual: o clima atual enfraquece por alguns segundos e o próximo cresce do zero. A neblina é mais comum de madrugada. Nos interiores, a chuva só entra pelas frestas.
- **Chão** (`js/mundo/clima.js`, `Clima`): a chuva enche **poças** em lugares fixos de cada zona (com ondinhas e respingos; o herói espirra água ao pisar nelas) que secam depois com o sol e o calor; a **neve acumula** no chão quando faz frio e derrete com a temperatura (e mais depressa com chuva); **pegadas** ficam na neve, na areia do deserto e na lama, e somem com o tempo (a neve caindo cobre mais depressa), com o som de passos na neve. **Bancos de neblina** andam com o vento pela zona (e aparecem de manhã nos campos abertos); dentro deles a visão fecha, os acampamentos notam menos o herói e o som fica abafado. No calor forte, o **ar treme** perto do chão. Na 3ª pessoa, poças, manchas de neve e fogueiras são objetos 3D na cena e a névoa da câmera fecha com a neblina.
- **Roupa e corpo no 3D**: o shader recebe o estado de cada um (`uWet`): a roupa **molhada** escurece (mais o tecido e o cabelo, menos o couro, quase nada o metal) e ganha brilho liso; a **neve assenta** no que olha para cima (cabeça, capuz, ombros, braços); a **geada** clareia e azula as bordas. Com frio, o corpo **treme** e solta **vapor** da respiração; no calor, aparecem gotas de **suor** e o herói fica ofegante (pose cansada).
- **Temperatura do corpo**: a temperatura do ar vem da região (dia e noite — o deserto esquenta de dia e esfria muito à noite; as montanhas congelam), do bioma e do clima. A **sensação térmica** soma o vento, a roupa molhada, o isolamento, a impermeabilidade, a proteção contra o vento e o reflexo do calor das **peças vestidas**, o **esforço** (correr e lutar esquentam), o **fogo por perto** (fogueira portátil, a Chama da Aurora, a forja), o **chá quente** e o **refresco gelado**, e o **abrigo** (interiores, toldos da cidade, copas das árvores). A temperatura do corpo anda devagar até o alvo e dá os estados **HIPOTERMIA · CONGELANDO · COM FRIO · FRESCO · CONFORTÁVEL · AQUECIDO · COM CALOR · SUPERAQUECIDO · INSOLAÇÃO**, com efeitos graduais de verdade: menos velocidade, menos dano e menos recuperação de energia; nos extremos a vida cai devagar (até 1 — o clima sozinho não mata) e as bordas da tela ganham geada ou calor. A roupa **molha** na chuva (menos com peças impermeáveis; nada com a aura do conjunto Eclipse), **seca** no sol, no fogo e no abrigo, junta **neve** (que cai na esquiva e derrete molhando) e **congela** no frio extremo; encharcada, pesa. O **termômetro** fica embaixo dos vitais no HUD (estado, temperatura do ar, roupa molhada, neve, abrigo e fogo).
- **Pessoas**: na chuva forte, na nevasca, na areia e no sol a pino do deserto, os moradores **vão para o abrigo** mais perto (toldos dos distritos, copa das árvores, paredes) e voltam depois; eles se molham e soltam vapor no frio, e **comentam** o tempo e o estado do herói nas conversas.
- **Som**: chuva e vento sintetizados com intensidade, rajadas e abafados debaixo do teto; passos na neve e na água; respiração no frio; trovão atrasado; eco nos interiores; tudo abafado na neblina densa e na nevasca.
- **Fogueira portátil** (alquimia/engenharia): acende na frente do herói por 90 s (a chuva forte apaga mais depressa), ilumina, aquece e seca quem está perto.
- **Configurações → Vídeo → Efeitos de clima** (leves, médios, completos): a quantidade de partículas, poças, pegadas e bancos de neblina desenhados, os objetos 3D do chão e o ar tremendo; o efeito no jogo é o mesmo em todos.

### Armaduras, fabricação e a cidade principal

- **Armadura modular** (`js/mundo/arsenal.js`, aba **EQUIPAMENTO** da mochila): nove vagas — capacete, peitoral, ombreira esquerda, ombreira direita, luvas, calças, botas, capa e acessório —, cada uma trocada sozinha. As peças vêm em oito famílias (Viajante, Couro, Inverno, Deserto, Placas, Cristal, Obsidiana e o conjunto especial **Eclipse**, que nasce Lendário) e exatamente **quatro raridades**: Comum (branco), Incomum (verde), Raro (azul) e Lendário (dourado). A raridade não depende do nível. Salvamentos antigos (seis graus) são convertidos: Épica vira Raro; Lendária e Eclipse viram Lendário. Cada peça soma defesa e vida (pelo tamanho da vaga, pela família e pela raridade), muda a velocidade conforme o material, dá **resistências** (fogo, gelo, elétrico e veneno, que reduzem de verdade o dano das poças, o veneno, a lentidão e os lasers) e tem **peso** (acima da carga, o herói fica mais lento; o acessório mochila aumenta a carga). Cada peça veste um herói por vez e pede o nível dele. A tela mostra as vagas, a lista da vaga escolhida, a **prévia 3D** do herói com a peça escolhida no lugar da atual, a **comparação** atributo por atributo (▲▼), e deixa esconder capacete, capa e acessório. Tudo fica no salvamento do mundo na hora.
- **Armaduras GLB** (`js/mundo/armaduras.js`, catálogo central `ARMADURAS_GLB` com os caminhos reais de `js/assets/criacao/catalogo.js`): cada definição tem `itemLevel`, `rarity`, `requiredLevel`, `allowedClasses`, `equipmentSlot`, `baseStats`, `bonusStats`, `modelPath`, `iconPath`, `description`, `sellValue` e `setId`.
  - **Conjunto do Iniciado** (`Armaduras_Inicial_Level_1/`, nível 1, todas as classes): capuz, gibão, couraça com ombreiras, luvas, calças, botas e capa. Todo personagem criado recebe as sete na mochila **uma vez** (sem repetir, nem ao voltar ao mundo; personagens antigos recebem ao entrar) e começa com seis vestidas.
  - **Conjuntos de nível 30** (`Armaduras_Level_30/<classe>/`, um por classe: peitoral com ombreiras, capa, luvas, capuz, calças, botas e amuleto): pedem nível 30 e a classe certa; **nunca vêm de graça**. Os chefes das zonas de nível 25+ sempre deixam uma peça da classe do personagem, as elites às vezes, e a Armaria vende duas por dia a partir do nível 30. A raridade de cada peça é sorteada.
  - **Conjuntos de nível 50, 75 e 100** (`Armaduras_Level_<nível>/<classe>/`, um por classe e nível: peitoral, ombreiras, capa, capuz, luvas, calça, botas e amuleto, com os nomes e as imagens da pasta — 120 peças; as ombreiras viram duas, esquerda e direita, nas vagas do Arsenal). Feitos no Blender (`tools/blender/asset_armadura_<classe>_n<nível>.py` → `<Nome_da_Peça>_nivel<nível>.glb` ao lado da imagem): o "alfaiate" mede os dois corpos do jogo em anéis (`tools/blender/medir_corpos.py` → `moldes_corpo.json`: tronco, braços, mãos, pernas, pés e a casca da cabeça) e monta cada peça sobre essas medidas com a folga certa e os detalhes de cada classe (placas, lâminas e espinhos; couro, alças e lascas de cristal; túnica com frisos e cristais; couro, pelo e folhas; placas prateadas e cristais de energia), com mais camadas e brilho em cada nível e runas acesas no 100. A peça sai com a mesma malha nos corpos masculino e feminino (a forma do feminino numa shape key). As cores vêm das imagens (`tools/blender/paletas_armaduras.py` → `armaduras_paletas.json`), e os materiais procedurais são assados em textura (cor com oclusão, ORM, normais e emissão). Caem nas zonas da faixa (45+, 70+ e 95+), a Armaria vende as da faixa do herói, e os bônus de conjunto valem com 2, 5 e as 9 peças.
  - **GLB realistas prontos** no lugar das peças geradas (`tools/blender/armaduras_reais.json`): o **Guerreiro nível 50** usa os cinco GLB enviados (`Classe_Guerreiro_nvl50/exemplo_glb/`: peitoral com ombreiras, calça com saiote de placas, capa com gola de pelo — girada 180°, porque o arquivo foi gerado de costas —, botas e elmo) e o **Assassino nível 50** os cinco dele (`Classe_Assassino_nvl50/exemplo_glb/`: peitoral de couro com ombreiras e alças, capa de penas — também girada —, manoplas, capuz e botas com gemas roxas), convertidos pelo caminho das peças do Meshy (reduz, reassa as texturas e encaixa no corpo). Com o peitoral que já traz ombreiras, as ombreiras vestidas contam nos atributos sem serem desenhadas por cima. Para trocar outra peça por um GLB pronto, basta pôr o arquivo na pasta da classe, registrar no JSON e rodar o conversor.
  - **Atributos**: os de base (defesa e vida pela vaga e pelo nível; a couraça protege mais e pesa; as botas dão velocidade; o amuleto, o atributo do tema) mais um atributo sorteado por grau de raridade, do tema do conjunto.
  - **Bônus de conjunto** com 2, 4 e o conjunto completo vestidos (6 no Iniciado, 7 nos de classe); cada faixa conta uma vez.
  - **No personagem criado** (estilo Realista) as peças GLB vestidas aparecem no próprio corpo e trocam na hora; nos outros heróis e no estilo Estilizado, a peça usa o visual procedural da família dela.
  - **Aba EQUIPAMENTO**: miniatura de cada peça, filtro de raridade (Z/C ou o botão) e "só as que posso usar" (V), e os detalhes ao passar o mouse (raridade, níveis, classes, atributos de base e da raridade, o conjunto com as faixas ativas, descrição e valor).
- **Peças no modelo 3D** (`js/heroes/pecas3d.js`, `PecasRig`): as peças vestidas aparecem no próprio herói (vista isométrica com gráficos 3D, 3ª pessoa e prévia), medidas a partir da malha de cada herói: capuz, turbante, gorro ou elmo com viseira; peitoral de pano ou de placas curvas; ombreiras de cada lado; braçadeiras e luvas; cinto com faldas, coxotes e grevas; botas; capa presa nos ombros que balança com o movimento e o vento. Material próprio por família (pano, couro, metal, cristal, partes acesas); as armaduras especiais e o Exoesqueleto continuam por cima.
- **Materiais** (aba INVENTÁRIO → MATERIAIS): ferro, tecido, couro, componente mecânico, tecnologia antiga e amostra desconhecida, além dos materiais das regiões; cada um com nome, descrição, raridade, onde achar e em que receitas entra. Vêm do ferro-velho, das criaturas (couro), das máquinas (componentes), dos baús, terminais, chefes e elites, e do mercado da cidade.
- **Fabricação** (`js/mundo/fabrica.js`): cinco estações — **forja** (as peças de corpo e o aprimoramento delas, até +5), **bancada de armas** (aprimora a arma equipada de cada herói, +6% de dano por nível), **laboratório** (acessórios e a relíquia forjada), **engenharia** (ferramentas de coleta, que rendem mais material, pedra de retorno e fogueira portátil) e **alquimia** (cápsulas, elixires, tônicos, chá quente e refresco). Cada receita mostra os materiais (verde: tem; vermelho: falta), as células, o nível de Criação e o nível do herói; o botão **FABRICAR** só aparece quando tudo está certo, e fabricar gasta exatamente o que foi mostrado. As famílias acima do Couro pedem o **plano** — do armeiro, de baús, chefes regionais, missões, terminais ou do pesquisador.
- **Inventário por categorias** (aba INVENTÁRIO): tudo, armas, peças, materiais, consumíveis, acessórios, missão e receitas, com busca (tecla **/**), equipar, usar, vender ou desmontar; os materiais pedidos por uma missão ativa ficam protegidos. **Economia**: vender uma peça (ou desmontá-la, que devolve 35% do material) sempre rende menos do que o material custa, mesmo com o maior desconto de reputação — fabricar para vender não dá lucro.
- **Refúgio da Aurora** (`js/mundo/cidade.js`): a cidade principal, base da Resistência, uma zona própria entre Carmesin e Nexus no mapa. Os distritos ficam nas fachadas (com portas e janelas acesas e letreiros): Ferreiros (forja), Armaria (bancada de armas e o armeiro, que vende peças e planos do dia), Distrito Tecnológico (laboratório, a engenheira e o pesquisador, que reconstrói planos e identifica amostras), Oficina de Engenharia, Guilda de Exploradores (contratos de todas as regiões abertas), Centro de Missões, Armazém (depósito pessoal de materiais e peças) e Alojamento (descansar até de manhã, vida e energia cheias, e o armário do equipamento). No meio, a praça com a Chama da Aurora, o portal e o mercado (material das oficinas). **Onze moradores** com nome, função, personalidade e assuntos; as estações também funcionam direto (**E**). Os **portões de saída**, um por região, levam à chegada de cada uma (fechados até a região abrir). No mapa (**M**) a cidade tem marcador próprio e, dentro dela, a **planta** dos distritos.
- **Teletransporte** (tecla **T**, botão **AURORA** ao lado dos poderes, toque no botão, ou Enter na cidade no mapa): de qualquer zona do mundo aberto e fora de combate, o herói se concentra por 1,2 s (anéis, faíscas e uma coluna de luz; andar, apanhar ou um inimigo acordar interrompe), some num clarão e chega na praça por uma coluna de luz que desce.
- **Limites**: os prédios são fachadas (os distritos funcionam pelas estações e pelas pessoas na frente deles, sem interiores para entrar); fabricar é instantâneo (sem tempo de espera) e as peças não se desgastam.

## Menus, salvamentos e configurações

- **Capa** → **Tela inicial** (JOGAR, CONFIGURAÇÕES, CRÉDITOS, SAIR) → **Menu principal** (CONTINUAR, NOVO JOGO, CARREGAR, CONFIGURAÇÕES, SAIR) com o painel **Última missão**.
- **Abertura com riscos de tela** (`RiscoTelaFx`, `js/menus.js`): a capa abre do escuro com sinais fracos de interferência. Ao entrar, a imagem sofre uma interferência sombria que cresce aos poucos — riscos horizontais de espessura, comprimento e velocidade diferentes, faixas deslocadas, blocos de pixels, uma separação de cor discreta (carmesim e azul), grão e varredura —, com calmarias e picos irregulares; rompe por um instante (a tela escurece e rola, sem clarão; o som do corte toca aí) e se estabiliza, com as faixas revelando o menu principal (cerca de 2,4 s). Um segundo comando no meio não reinicia; o menu só recebe comandos no fim. Com **movimento reduzido** no sistema (ou Pós-processamento desligado), vira uma troca suave sem deslocamentos.
- **5 espaços de salvamento** independentes, cada um com miniatura da tela, setor, data, nível e tempo de jogo. NOVO JOGO usa o primeiro espaço livre (ou pede um para substituir); em CARREGAR, um espaço vazio começa um jogo novo ali. O salvamento é automático (níveis, habilidades, troca de setor, pausa, saída). Saves da versão anterior viram o espaço 1.
- **Seleção de personagem:** Kael (arte oficial) e três personagens ainda bloqueados.
- **Pausa:** RETOMAR, HABILIDADES, CONFIGURAÇÕES, REINICIAR SETOR, SAIR PARA O MENU, SAIR DO JOGO, com técnicas e evoluções conhecidas.
- **SAIR** fecha a janela quando o jogo roda como aplicativo; no navegador (que não deixa uma página fechar a própria aba) aparece uma tela de despedida.

Configurações (salvas no navegador e aplicadas com **APLICAR**; **PADRÃO** restaura a aba):

| Aba | Opções |
|---|---|
| JOGO | Dificuldade (Narrativa / Normal / Difícil: vida e dano dos inimigos), tremor de tela, números de dano, velocidade do texto |
| VÍDEO | Janela / tela cheia, resolução interna (50–100%), visual do Kael (3D com a arte oficial ou sprites 2D), inimigos e NPCs em 3D ou 2D, qualidade dos efeitos (partículas), limite de FPS (sem limite / 60 / 30), pós-processamento (vinheta, clarões, interferência), brilho |
| ÁUDIO | Som liga/desliga, volume geral, música, voz/narração, **voz sintetizada nas falas** (desligada por padrão), efeitos sonoros, ambiente |
| CONTROLES | Sensibilidade do analógico, zona morta, inverter eixo Y da câmera, vibração + diagnóstico e comandos |
| IDIOMA | Português (Brasil), tamanho das legendas, falas durante o jogo |

As teclas M (som) e G (3D/2D) também atualizam as configurações salvas.

**Voz sintetizada** (`js/voz.js`, opcional): ligada, lê em voz alta, com a síntese de voz do próprio navegador (`speechSynthesis`, sem biblioteca nem internet), as falas que não têm dublagem gravada — as legendas do HUD (rádio dos aliados, campanhas dos heróis, NPCs, terminais, missões) e as páginas da história. A dublagem gravada sempre tem preferência. Cada personagem tem um timbre próprio (tom e velocidade) sobre a voz em português do aparelho; o volume segue Volume geral × Voz / Narração. A qualidade e o sotaque dependem das vozes instaladas no sistema (sem voz em português, o navegador usa a padrão).

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

Cada personagem tem **cinco ramos** (Tab), um por aba, nesta ordem: **Ataque**, **Poderes**, **Defesa e sobrevivência**, **Mobilidade** e **Supremas**. O ramo Supremas (Eclipse, Luz Caçadora, Titã, Núcleo Vyne, Corvo) é igual em estrutura para todos e custa 2 a 4 pontos por nível (campo `pts` do nó; o custo em energia das ativas é outro campo): suprema mais barata, mais poder, energia nos golpes pesados, **Convergência** (depois de uma habilidade, o próximo golpe é mais forte), Último Fôlego, Ressonância (energia por abate durante a suprema) e Ascensão. Os efeitos ficam em `js/heroes/passivas.js`.

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

**Redistribuir os pontos** (botão **REDISTRIBUIR** no alto da árvore, tecla **R** ou **Y/△** no controle): devolve todos os pontos que o herói mostrado gastou na árvore e limpa os atalhos, para distribuir de novo. O primeiro aperto mostra o que volta e o preço; o segundo, em até 4 s, confirma. A primeira redistribuição de cada herói é grátis; as seguintes custam 10 células por ponto devolvido. A contagem fica no salvamento.

O progresso (nível, XP, habilidades, atalhos, evoluções, memórias e setor atual) é **salvo automaticamente** no navegador. Na tela de título aparecem **Continuar** e **Novo jogo**. Ao cair em combate, Kael volta ao início do setor mantendo a evolução.

## Combate em movimento

O combate é o mesmo em qualquer lugar — campanha, mundo aberto, masmorras, eventos e chefes —, sem tela de batalha: os golpes, combos, cargas, habilidades, esquivas, pulo e defesa saem no meio da exploração, e a exploração continua assim que a luta acaba.

- **Movimento**: oito direções relativas à câmera (no analógico, andar devagar e correr), aceleração e freada curtas, o corpo gira suave para a nova direção (os pés dão passos em vez de escorregar). Correndo de frente para uma coluna, árvore ou rocha, o herói **contorna** pela tangente em vez de empacar (`Room.desvio`); a freada e a virada brusca levantam poeira.
- **Golpes**: preparação, fase ativa (o dano só sai nela, no mesmo instante do impacto visual) e recuperação de cada golpe vêm da tabela de ataques; o combo encadeia pelo buffer, a esquiva cancela a preparação e a recuperação e, no **fim da recuperação, andar já sai do golpe** (o começo continua preso, para o golpe ter peso). A mira corrige um pouco para o inimigo no cone da arma.
- **Transição de poses** (`R3D.misturar`): ao trocar de estado (parado, correndo, golpe, esquiva, dano, atordoado…) ou ao emendar outro golpe do combo, as juntas do modelo 3D saem da última pose e chegam à nova em poucos centésimos — rápido ao entrar numa ação, mais longo ao voltar dela. Vale para heróis, inimigos e moradores; só a pose muda.
- **Impacto**: hit stop, tremor, faíscas, rastro da lâmina e números de dano (como antes). Os inimigos **recuam** (o corpo tomba na direção do golpe e volta, mais no pesado e no crítico; a super armadura quase não mexe), atordoam, são lançados ou caem conforme o golpe.
- **Defesa e dano recebido**: a esquiva continua invencível mas agora **contorna os corpos** (não atravessa inimigos nem pessoas; só as supremas com teletransporte atravessam). Golpe leve dá um tranco curto, golpe pesado faz **cambalear**; um **arco vermelho no chão** em volta do herói aponta de onde veio o dano. Avisos no chão mostram a preparação dos ataques inimigos (cone, círculo ou linha).
- **IA dos inimigos**: cada um com o seu estado (perseguir, cercar, preparar, atacar, recuperar); **contornam os pilares** no caminho e, empacados, dão um passo de lado; **não golpeiam nem atiram através de obstáculos** (atiradores sem linha de tiro se reposicionam); o rastejador desiste do bote se o herói esquivou para longe; o diretor de IA limita quantos atacam ao mesmo tempo. No mundo aberto, percepção, alerta e coleira ficam com os **encontros** (ver Mundo aberto).
- **Conversa e interação**: o botão que fecha uma conversa, loja ou mapa não vira golpe (0,25 s de trava); fora de combate, o golpe leve colado num morador abre a conversa (na luta, é golpe); no controle, X conversa perto de alguém. Moradores se encolhem e não conversam com inimigos acordados por perto.

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

**Testes no GitHub** (`.github/workflows/testes.yml`): a cada push e pull request, o GitHub Actions confere a sintaxe dos scripts, roda a suíte do jogo num Chromium sem janela (`tools/testes_navegador.mjs`: sobe um servidor da pasta do projeto, abre `index.html?testes=1` e falha se algum teste falhar ou a página lançar exceção) e as botas dos modelos (`tools/conferir_botas.js`). O Playwright é instalado só no workflow; o jogo continua sem bibliotecas. Para rodar igual na sua máquina: `npm install --no-save playwright && npx playwright install chromium && node tools/testes_navegador.mjs`.

**Armas 3D (GLB)**: os modelos-fonte ficam em `assets/armas/eclipse/` (10–27 MB cada, gerados no Meshy). O jogo usa uma versão reduzida gerada por `python3 tools/importar_arma.py` (1,5–2,8 mil triângulos por arma, com cor, metal e brilho amostrados da textura do GLB) em `js/assets/armas3d.js`, que também abre por `file://`. Para trocar uma arma: substitua o `.glb` e rode o importador; a orientação, a posição da mão e o comprimento de cada arma ficam em `ARMAS` no próprio importador, e os encaixes (mão, costas, coxa) em `BACK` de `js/heroes/armas3d.js`.

**Assets no Blender** (`tools/blender/`): cada asset novo é um script Python reproduzível que monta o modelo por código (primitivas, bmesh, modificadores), desdobra a UV, cria o material PBR (um por objeto, com atlas de textura gerado), põe a origem na base, exporta `.glb` (glTF 2.0, +Y para cima, metros) para `assets/models/` e renderiza a prévia PNG (Cycles na CPU, sem placa de vídeo). Antes de sobrescrever qualquer arquivo, a cópia vai para `assets/_backup/<data>/`. O mesmo script roda no Blender instalado ou com o módulo `bpy` (`pip install bpy`, Python 3.13):

```bash
blender -b -P tools/blender/build_all.py                  # todos os asset_*.py → assets/REPORT.md
python3 tools/blender/build_all.py                        # o mesmo, com o módulo bpy
python3 tools/blender/asset_lamina_iniciado.py -- --neon 1,0.3,0.2 --nome lamina_rubra   # variação
python3 tools/blender/preview.py -- arquivo.glb previa.png   # prévia e medidas de qualquer .glb
python3 tools/blender/auditoria.py                        # assets/AUDITORIA.md (sem Blender)
python3 tools/importar_arma.py --blender lamina_do_iniciado --saida /tmp/armas.js   # .glb → formato do motor
```

`utils.py` tem as funções comuns (limpar a cena, material PBR e atlas, aplicar modificadores, origem na base, normais, UV, triângulos, exportar, prévia, relatório) e o orçamento da web (personagens ≤ 5 mil triângulos, armas e props ≤ 1,5 mil, peças modulares ≤ 3 mil, texturas ≤ 1024). A auditoria (`assets/AUDITORIA.md`) lista os GLB e imagens que já existem, com triângulos, texturas, UV, materiais repetidos e medidas, e a prioridade do que otimizar.

**Texturas assadas.** Os objetos de cenário (`kit.py`) usam materiais procedurais por parte (`utils.material_procedural`: variação de cor e sujeira em duas escalas, bordas gastas com metal à mostra, padrões de janelas acesas, blocos de pedra, chapas com frestas, veios de cristal, trama de tecido, runas, couro e pelo, e o chanfro das quinas pelo nó Bevel) que o `utils.assar` assa no Cycles numa UV própria sem sobreposição: cor com oclusão ambiente, ORM (oclusão, aspereza, metal), mapa de normais e emissão, num material só (1024 px nos objetos grandes). `tools/importar_prop.py` leva posição, normal e UV para `js/assets/props3d.js` com as texturas em WebP; o motor desenha com o programa de textura (o mesmo dos heróis), lendo a emissão no canal azul do mapa de material.

**Renderizador realista da 3ª pessoa** (`js/realista/realista.js`, Three.js 0.186.1 com licença MIT em `js/vendor/three/`, carregado como módulo pelo `importmap` do `index.html`): a 3ª pessoa continua com a mesma lógica, as mesmas poses e a mesma sala, mas a cena é desenhada pelo Three.js (WebGL 2) com luz física — sol com sombras projetadas que seguem o herói, luz do céu e do chão (hemisfério), reflexo do ambiente, materiais PBR com as texturas de cor, metal/aspereza, normais e emissão de cada modelo, névoa e tone mapping ACES —, e, conforme a qualidade, oclusão ambiente (GTAO), brilho (bloom) e multiamostragem. Os triângulos já posados pelo `R3D.poseAll` (o mesmo `R3D.data`) viram um buffer intercalado do Three.js sem cópia; cada item vira um grupo com o material do modelo. A imagem fica numa camada por baixo do canvas do jogo, que deixa a vista transparente e desenha por cima os efeitos, o HUD e os menus. Configurações → Vídeo: **Renderizador da 3ª pessoa** (Realista ou Clássico) e **Qualidade realista** (Baixo, Médio, Alto, Ultra, Cinematográfico: sombras de 1024 a 4096, oclusão ambiente, brilho, multiamostragem e resolução de 70% a 125%). Funciona abrindo o jogo por http (GitHub Pages ou `npx serve` na pasta); abrindo o `index.html` do disco o módulo não carrega e fica o Clássico. Numa placa de vídeo emulada por software (SwiftShader, llvmpipe) também fica o Clássico (forçar: `localStorage['eclipse_zero_realista'] = 'forcar'`). A vista isométrica segue no motor clássico.

**Git LFS** (`.gitattributes`): os GLB de origem enviados prontos (`assets/Criar_Personagem/**/exemplo_glb/`), a pasta `assets/fontes/` e os projetos `.blend` ficam no LFS. O jogo não carrega esses arquivos (usa os convertidos em `js/assets/`), então o GitHub Pages e o CI não precisam deles. Para clonar com eles: `git lfs install` antes do `git clone` (ou `git lfs pull` depois). No ambiente na nuvem, a rede precisa liberar `lfs.github.com`. A cota gratuita do LFS no GitHub é de 1 GB de armazenamento e 1 GB de download por mês.

**Relatório técnico de gráficos e rig** (`docs/RELATORIO_GRAFICOS_E_RIG.md`): como o jogo é desenhado hoje, o que falta para o visual realista, as tecnologias avaliadas (a recomendação é o Three.js como novo renderizador, sem migrar para outra engine), as decisões pendentes e o plano por etapas.

**Resolução do motor 3D.** O canvas do motor cresce conforme a tela pede (até 4096, ou o limite da placa de vídeo; 2048 em aparelhos de toque e com pouca memória): a 3ª pessoa é desenhada na resolução nativa da tela (antes, no máximo 1024 de altura) com a passada de brilho em meia resolução, e os sprites da vista isométrica não perdem nitidez quando há muita gente e cenário na tela (o atlas aumenta antes de baixar a escala).

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
  texturas.js       TexturasMundo: texturas do chão de cada bioma, geradas por código (vista isométrica e atlas da 3ª pessoa)
  terceira_ambiente.js  Ambiente3P: céu, horizonte, luz, névoa, chão distante, detalhes e partículas da 3ª pessoa (e o céu da vista isométrica)
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
  voz.js            VozSintetica: voz sintetizada opcional para as falas sem dublagem
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
                    defesa com aparo, de todos os heróis); granada.js (Granada de Plasma do Kael);
                    exoesqueleto.js (ExoRig: a armação 3D do Exoesqueleto em qualquer herói);
                    pecas3d.js (PecasRig: as peças da armadura modular no modelo 3D de cada herói)
  quests.js         LoyaltyQuests: missões de lealdade dos aliados no Refúgio
  world.js          World: mundo aberto (regiões, zonas, acampamentos, baús, portais, mapa M)
  mundo/            regioes.js (as outras regiões), expansao.js (as cidades dos níveis 25 a 100), tempo.js (WorldTime: dia, noite e clima),
                    inventario.js (WorldInv: relíquias, mochila, mercador), missoes.js (WorldQuests),
                    variantes.js (ENEMY_VARIANTS, EnemyTraits: as criaturas de cada região),
                    campanhas.js (HERO_CAMPAIGNS, Campanhas: a campanha de cada herói),
                    dialogo.js (Dialogo: a caixa de diálogo com respostas), oficios.js (materiais,
                    consumíveis, ofícios, reputação e serviços), povo.js (WORLD_POVO, Morador, Povo:
                    moradores, conversas, rotinas, vilarejos, quadro de contratos), aventuras.js
                    (WORLD_AVENTURAS, Aventuras: missões secundárias, contratos e diário), locais.js
                    (masmorras, tesouros escondidos), eventos.js (eventos dinâmicos e desafio da arena),
                    encontros.js (ENCONTRO, Encontros: percepção, alerta, coleira e volta dos acampamentos),
                    mapa.js (WorldMapArt: o terreno pintado, a névoa e a moldura do mapa do mundo),
                    arsenal.js (ARS_*, Arsenal: armadura modular, aba EQUIPAMENTO, armeiro),
                    fabrica.js (FAB_*, Fabrica: estações, receitas, planos, aprimoramentos, armazém e a
                    aba INVENTÁRIO), cidade.js (Cidade, CidadeProp, PortaoCidade: o Refúgio da Aurora e
                    o teletransporte; carrega depois de rooms.js, que define THEMES), clima.js (Clima:
                    poças, neve, pegadas, neblina, fogueiras, temperatura do corpo, roupa molhada,
                    moradores no abrigo e o som do clima)
  glbviewer.js      visualizador dos .glb de armas e armaduras, com a textura embutida (tela de seleção)
  criacao/          criação de personagem: dados.js (PERS_CLASSES, PERS_APAR, PersClasse, Perfis,
                    PersCriacao: classes, aparência, validação, perfis locais e equipamento inicial),
                    modelo.js (PersonagemModelo: o modelo 3D paramétrico no esqueleto do Kael e o
                    retrato do HUD), tela.js (CriacaoTela: a tela de criação e a lista de personagens)
  thirdperson.js    ThirdPersonMode: arena de teste em terceira pessoa (WebGL próprio)
  kaelart.js        KaelArt: desenha o Kael com os sprites da arte oficial (quadro por estado)
                    — opção "Sprites 2D" e o modo sem WebGL
  enemies.js        ENEMY_TYPES, Enemy, Crawler, Legionary, Shooter, Hunter, AIDirector
  boss.js           HazardSystem e Boss (NEXUS)
  projectiles.js    ProjectileSystem
  pickups.js        PickupSystem (células, cápsulas, memórias)
  rooms.js          THEMES, ROOM_DEFS e Room (cenário pré-renderizado, colisões, linha de visão e desvio)
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
| Classe do personagem criado (base, atributos, bônus, peças iniciais, falas) ou opção de aparência | `PERS_CLASSES` e `PERS_APAR` em `js/criacao/dados.js` (o desenho de cada opção em `js/criacao/modelo.js`) |
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

Nenhuma. Não há bibliotecas, CDNs, fontes externas nem arquivos de áudio: cenários, sons e os demais modelos 3D são gerados por código. As imagens são a arte da capa (`js/assets/capa.js`) e a arte oficial do Kael (`js/assets/kael_sprites.js`, `js/assets/kael_arte.js` e a malha/texturas 3D em `js/assets/kael3d.js`, convertidas de `assets/modelos/kael_meshy.glb`), todas embutidas no JavaScript. Os dados ficam no `localStorage` do navegador: `eclipse_zero_save_v1_slot1` … `_slot5` (salvamentos), `eclipse_zero_settings_v1` (configurações), `eclipse_zero_last_slot` e `eclipse_zero_best` (recorde), `eclipse_zero_mundo_v1` (mundo aberto do Kael), `eclipse_zero_perfis_v1` (personagens criados) e `eclipse_zero_mundo_v1:<id>` (mundo de cada personagem criado), com as cópias `_reserva`.

### Versão de arquivo único

Até a reorganização, o jogo inteiro ficava no `index.html`. Essa versão continua no histórico do Git; para restaurá-la: `git checkout 12b0d26 -- index.html` (e apague `css/` e `js/` se quiser voltar ao formato antigo).
