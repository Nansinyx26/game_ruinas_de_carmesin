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
| I · O Homem de Preto | Instalação de Contenção | “Unidade ZERO despertada.” Kael foge entre luzes de emergência |
| II · A Espada que Devora a Tempestade | Túneis de Serviço | A espada reage às memórias de Kael |
| III · O Segredo da Unidade ZERO | Avenidas de Vesper | Uma cidade morta e a gravação do projeto ZERO |
| IV · A Cidade dos Esquecidos | Refúgio dos Desconectados | As três facções e uma escolha |
| IV · Os Fiéis da Máquina | Catedral do Eclipse | O Culto que venera NEXUS |
| V · A Voz Dentro da Máquina / VI · O Último Eclipse | Topo da Torre Central | O confronto com **NEXUS** |

### Facções
- **Os Desconectados**: humanos que vivem fora da rede de NEXUS.
- **A Legião de Ferro**: soldados artificiais que reconhecem Kael como ameaça prioritária.
- **O Culto do Eclipse**: humanos que veneram NEXUS como uma divindade.

### Fragmentos de memória
Cada setor liberado esconde um **fragmento de memória**. Se Kael sair do setor sem pegá-lo, o fragmento se perde para sempre.

### Os três finais
- **Final I: O Rei do Vazio.** Kael absorve o núcleo e assume o controle das máquinas.
- **Final II: O Último Humano.** Kael destrói o núcleo e apaga a rede.
- **Final III: Eclipse Zero.** Kael separa NEXUS de seus protocolos. *Exige as 5 memórias recuperadas.*

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
| ESC | Pausa (menu de pausa) / pular história / voltar nos menus |
| M | Som liga/desliga |
| G | Gráficos 3D / 2D |
| F1 | Modo debug (hitboxes; F2 elimina inimigos, F3 enche vida e energia, F4 dá XP) |

Nos menus: setas (ou mouse) navegam, Enter/J confirma, Esc volta, Q/E trocam de aba, Del apaga um salvamento.

### Controle (gamepad)

Funciona com controles Xbox, PlayStation (DualShock 4 e DualSense), GameSir e genéricos reconhecidos pelo navegador (Gamepad API, mapeamento "standard"). Os nomes e ícones dos botões mudam conforme o controle conectado (A/B/X/Y ou ✕/○/□/△).

| Xbox | PlayStation | Ação |
|---|---|---|
| Analógico esquerdo / D-pad | Analógico esquerdo / D-pad | Mover (e navegar nos menus) |
| RT ou X | R2 ou □ | Ataque leve |
| RB ou Y | R1 ou △ | Ataque pesado (segure para o Impacto Carregado) |
| B ou A | ○ ou ✕ | Esquiva |
| LT | L2 | Eclipse Absoluto |
| LB + X / Y / B / A | L1 + □ / △ / ○ / ✕ | Habilidades 1 / 2 / 3 / 4 |
| X (perto de um NPC) | □ (perto de um NPC) | Conversar (no lugar do ataque leve) |
| Analógico direito | Analógico direito | Olhar ao redor (câmera) |
| View / Back | Create / Share | Árvore de habilidades |
| Menu / Start | Options | Pausa |
| A · B | ✕ · ○ | Confirmar · voltar nos menus |
| LB · RB | L1 · R1 | Trocar de aba nos menus |

- **Conectar:** por USB, ligue o cabo e aperte qualquer botão com a janela do jogo em foco. Por Bluetooth, pareie o controle nas configurações do sistema (Xbox: botão de parear; DualShock 4/DualSense: segure Share/Create + PS; GameSir: modo XInput/Android) e aperte um botão.
- Ao conectar ou desconectar aparece um aviso discreto no topo da tela. Se o controle desconectar durante a ação, o jogo pausa e toda a entrada do controle é zerada (Kael não continua andando sozinho).
- **Configurações → CONTROLES** mostra o estado (conectado, nome, tipo, mapeamento, "EM USO"), um **diagnóstico ao vivo** (analógicos com a zona morta, gatilhos e botões que acendem), a lista completa de comandos e as instruções de conexão. Ali também se ajustam sensibilidade, zona morta, eixo Y invertido da câmera e vibração.
- O teclado e o mouse continuam funcionando ao mesmo tempo; a interface mostra os ícones do último dispositivo usado.

**Limitações conhecidas:** controles que o navegador não reconhece como "standard" podem ter botões trocados (o diagnóstico avisa); a vibração depende do navegador (Chrome/Edge sim; Firefox e Safari geralmente não); um botão do controle não conta como "gesto" para o navegador, então a tela cheia precisa ser ligada com um clique ou tecla (ou F11); no Safari antigo e em alguns navegadores de celular a Gamepad API é limitada.

## Elenco de personagens (em desenvolvimento)

Kael Veyron é o personagem inicial. Lyra Kaede, Drakos, Sera Vyne e Orion já existem nos dados e são liberados pela campanha (Capítulos I, II, III e IV concluídos), mas ainda aparecem como **EM BREVE**: ficam salvos como desbloqueados e passam a ser escolhíveis quando forem implementados. O desbloqueio mostra um aviso "NOVO ALIADO DESBLOQUEADO". Cada personagem tem 4 habilidades, 4 armaduras e armas próprias; a Armadura Exoesqueleto serve para todos.

- **Dados** (`js/data/`): `characters.js` (fichas: atributos, cor-tema, lore, habilidades, armaduras, armas, condição de desbloqueio e `devStatus`: `ready` | `partial` | `coming_soon`), `abilities.js`, `armors.js`, `weapons.js` e `strings.js` (textos da interface, prontos para tradução).
- **`RosterManager`** (`js/roster.js`): personagens desbloqueados, personagem ativo e armadura de cada um; `isUnlocked`, `unlock`, `setActive`, `equipArmor`, `checkUnlocks` e os eventos `characterUnlocked` / `characterChanged` / `armorUnlocked` / `armorChanged`. O jogo chama `checkUnlocks` ao concluir um setor, ao derrotar NEXUS e ao registrar escolhas da história.
- **Kael usa a própria ficha**: vida, energia, velocidade, raio, nome no HUD e modelo vêm de `CHARACTER_DEFS`. As 4 habilidades da ficha dele apontam para o que o jogo já tem (combos da espada, esquiva, Ruptura de Plasma e Sobrecarga); a árvore de habilidades continua a mesma.
- **Salvamento v2**: guarda o elenco de cada espaço (desbloqueados, ativo, armaduras). Salvamentos antigos carregam com Kael ativo e armadura Padrão.

Próximas fases: tela de elenco com os 5 cartões e menu de desenvolvimento → Lyra → Drakos, Sera e Orion → armaduras (visual e atributos) → popup animado de desbloqueio.

## Menus, salvamentos e configurações

- **Capa** → **Tela inicial** (JOGAR, CONFIGURAÇÕES, CRÉDITOS, SAIR) → **Menu principal** (CONTINUAR, NOVO JOGO, CARREGAR, CONFIGURAÇÕES, SAIR) com o painel **Última missão**.
- **5 espaços de salvamento** independentes, cada um com miniatura da tela, setor, data, nível e tempo de jogo. NOVO JOGO usa o primeiro espaço livre (ou pede um para substituir); em CARREGAR, um espaço vazio começa um jogo novo ali. O salvamento é automático (níveis, habilidades, troca de setor, pausa, saída). Saves da versão anterior viram o espaço 1.
- **Seleção de personagem:** Kael (modelo 3D) e três personagens ainda bloqueados.
- **Pausa:** RETOMAR, HABILIDADES, CONFIGURAÇÕES, REINICIAR SETOR, SAIR PARA O MENU, SAIR DO JOGO, com técnicas e evoluções conhecidas.
- **SAIR** fecha a janela quando o jogo roda como aplicativo; no navegador (que não deixa uma página fechar a própria aba) aparece uma tela de despedida.

Configurações (salvas no navegador e aplicadas com **APLICAR**; **PADRÃO** restaura a aba):

| Aba | Opções |
|---|---|
| JOGO | Dificuldade (Narrativa / Normal / Difícil: vida e dano dos inimigos), tremor de tela, números de dano, velocidade do texto |
| VÍDEO | Janela / tela cheia, resolução interna (50–100%), visual do Kael (arte oficial ou modelo 3D), inimigos e NPCs em 3D ou 2D, qualidade dos efeitos (partículas), limite de FPS (sem limite / 60 / 30), pós-processamento (vinheta, clarões, interferência), brilho |
| ÁUDIO | Som liga/desliga, volume geral, efeitos sonoros, ambiente |
| CONTROLES | Sensibilidade do analógico, zona morta, inverter eixo Y da câmera, vibração + diagnóstico e comandos |
| IDIOMA | Português (Brasil), tamanho das legendas, falas durante o jogo |

As teclas M (som) e G (3D/2D) também atualizam as configurações salvas.

## Progressão e habilidades

Kael ganha **experiência** derrotando inimigos (elites valem o triplo), liberando setores, recuperando memórias e vencendo NEXUS. Cada nível aumenta vida, energia, dano, poder das habilidades, defesa, velocidade e reduz as recargas, além de dar **pontos de habilidade** (dois a cada cinco níveis).

Os pontos são gastos em **quatro árvores** (Tab):

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
- **NEXUS**: chefe em três fases. Usa raios do céu artificial e convoca suas defesas, e na fase III o próprio céu desmorona.

Máquinas atingidas por descargas elétricas (Arco Voltaico, Corrente Relâmpago, Campo Magnético…) entram em curto-circuito e ficam atordoadas por mais tempo.

## Como executar

Abra o `index.html` no navegador (duplo clique). Não precisa de servidor, instalação nem internet: o jogo usa apenas scripts clássicos e não carrega nenhum arquivo externo além dos próprios `css/` e `js/`.

Se preferir um servidor local (por exemplo, para testar em outro aparelho da rede): `python3 -m http.server 8000` na pasta do projeto e acesse `http://localhost:8000`.

## Estrutura do código

```
index.html          página mínima: canvas, CSS e scripts na ordem de carregamento
css/main.css        estilos da página (o jogo é todo desenhado no canvas)
js/
  config.js         resolução lógica, constantes de física, paleta, fontes, variável global "game"
  utils.js          matemática, projeção isométrica, formas e utilidades
  controls.js       entrada: KEYMAP/PADMAP e a classe Input (teclado, mouse, gamepad)
  audio.js          AudioSys: sons e ambiente sintetizados (Web Audio API)
  effects.js        GlowCache, partículas, números de dano, rastros da lâmina, raios
  camera.js         Camera: acompanhamento, tremor e zoom
  lighting.js       Lighting: escuridão com furos de luz
  combat.js         avisos de ataque, Hitbox, ATTACKS (golpes), ComboSystem, ComboCounter
  progression.js    UPGRADES/UpgradeSystem, PROG (curva de XP), SKILLS/SKILL_TREES, Progress
  save.js           SaveSys: 5 espaços de salvamento no localStorage (versão do conteúdo e migração)
  settings.js       SETTINGS_TABS, Settings: opções do jogador e onde cada uma é aplicada
  data/             fichas do elenco: characters.js, abilities.js, armors.js, weapons.js, strings.js
  roster.js         RosterManager: desbloqueios, personagem ativo e armaduras
  engine3d.js       motor 3D WebGL próprio (G3, N3, Model3, R3D) e o registro MODELS3D
  entity.js         Entity, base de jogador e inimigos
  abilities.js      ABILITIES: efeitos das habilidades ativas
  player.js         Player (Kael): movimento, golpes, esquiva, habilidades, Eclipse, desenho 2D
  kaelart.js        KaelArt: desenha o Kael com os sprites da arte oficial (quadro por estado)
  enemies.js        ENEMY_TYPES, Enemy, Crawler, Legionary, Shooter, Hunter, AIDirector
  boss.js           HazardSystem e Boss (NEXUS)
  projectiles.js    ProjectileSystem
  pickups.js        PickupSystem (células, cápsulas, memórias)
  rooms.js          THEMES, ROOM_DEFS e Room (cenário pré-renderizado e colisões)
  waves.js          WaveManager (ondas, porta, chefe)
  ui.js             wrapText, glowText, drawIcon (ícones procedurais)
  hud.js            HUD
  screens.js        Screens: árvore de habilidades, evoluções, derrota e finais
  story.js          MEMORIES, STORY, ENDINGS, CHAPTERS (textos da história)
  storyscreen.js    Backdrop (cenários pintados) e StoryScreen
  assets/capa.js    arte da capa embutida (data URI gerado de assets/images/capa.jpg)
  assets/kael_sprites.js  sprites do Kael recortados da folha oficial (atlas embutido)
  assets/kael_arte.js     ilustração de corpo inteiro e rosto do Kael (seleção de personagem)
  menus.js          Menus: capa, tela inicial, menu principal, carregar, personagem,
                    configurações, créditos, pausa, confirmações e avisos
  game.js           Game: loop, estados, eventos de combate, XP, salvamento, renderização
  models/           modelos 3D (um arquivo por modelo, registrados em MODELS3D)
  main.js           boot(): cria o jogo — sempre o último script
assets/images/capa.jpg   arte da capa original (fonte do js/assets/capa.js)
tools/gerar_capa.py      gera js/assets/capa.js a partir da imagem
tools/gerar_sprites_kael.py  recorta a folha de sprites e a ficha do Kael (assets/images/kael_*.jpg)
                             e gera js/assets/kael_sprites.js e js/assets/kael_arte.js
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
| Elementos do HUD | `js/hud.js` |
| Menus, pausa, créditos, versão | `js/menus.js` (`CREDITS`, `GAME_VERSION`, `CHARACTERS` no topo do arquivo) |
| Personagem, habilidade, armadura ou arma do elenco | `js/data/characters.js`, `abilities.js`, `armors.js`, `weapons.js` (`RosterManager.validate()` avisa no console se uma referência estiver errada) |
| Condição de desbloqueio | campo `unlock` da ficha (`always`, `chapter_complete`, `boss_defeated`, `quest_complete`, `flag`) |
| Nova opção de configuração | `SETTINGS_DEFAULT` e `SETTINGS_TABS` em `js/settings.js` (+ o efeito em `Settings.apply()` ou onde a opção é lida) |
| Telas de evolução, árvore e finais | `js/screens.js` (desenho) e `js/game.js` (estado e entrada) |
| Textos da história | `js/story.js` |
| Novos sons | `AudioSys.play()` em `js/audio.js` |
| Teclas e botões | `KEYMAP` e `PADMAP` em `js/controls.js` |
| Novo modelo 3D | crie `js/models/<chave>.js` com `MODELS3D.<chave> = { build, pose, opts, glows }` e inclua o `<script>` no `index.html` |
| Estilos da página | `css/main.css` |
| Trocar a capa | substitua `assets/images/capa.jpg` e gere `js/assets/capa.js` de novo (abaixo) |
| Sprites do Kael | ajuste as caixas de cada quadro em `ANIMS` no `tools/gerar_sprites_kael.py` e rode `python3 tools/gerar_sprites_kael.py` (requer Pillow, numpy e scipy); a escolha do quadro por estado fica em `KaelArt.pick()` (`js/kaelart.js`) |

Para gerar o `js/assets/capa.js` a partir da imagem: `python3 tools/gerar_capa.py` (requer Pillow). A imagem fica embutida no JavaScript para o jogo funcionar abrindo o `index.html` direto do disco sem bloquear as miniaturas dos salvamentos.

Para manter o projeto organizado, coloque código novo no arquivo da responsabilidade correspondente (ou crie um arquivo novo e inclua-o no `index.html` na posição certa) em vez de voltar a concentrar tudo no `index.html`.

### Dependências

Nenhuma. Não há bibliotecas, CDNs, fontes externas nem arquivos de áudio: cenários, modelos 3D e sons são gerados por código. As imagens são a arte da capa (`js/assets/capa.js`) e a arte oficial do Kael (`js/assets/kael_sprites.js` e `js/assets/kael_arte.js`), todas embutidas no JavaScript. Os dados ficam no `localStorage` do navegador: `eclipse_zero_save_v1_slot1` … `_slot5` (salvamentos), `eclipse_zero_settings_v1` (configurações), `eclipse_zero_last_slot` e `eclipse_zero_best` (recorde).

### Versão de arquivo único

Até a reorganização, o jogo inteiro ficava no `index.html`. Essa versão continua no histórico do Git; para restaurá-la: `git checkout 12b0d26 -- index.html` (e apague `css/` e `js/` se quiser voltar ao formato antigo).
