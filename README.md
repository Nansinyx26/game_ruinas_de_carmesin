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
| ESC | Pausa / pular história |
| M | Som liga/desliga |
| G | Gráficos 3D / 2D |
| F1 | Modo debug (hitboxes; F2 elimina inimigos, F3 enche vida e energia, F4 dá XP) |

Gamepad (layout padrão): X leve · Y pesado · A esquiva · B/RT Eclipse · LT, RB, L3, R3 habilidades · Back árvore · Start pausa.

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
  save.js           SaveSys (localStorage)
  engine3d.js       motor 3D WebGL próprio (G3, N3, Model3, R3D) e o registro MODELS3D
  entity.js         Entity, base de jogador e inimigos
  abilities.js      ABILITIES: efeitos das habilidades ativas
  player.js         Player (Kael): movimento, golpes, esquiva, habilidades, Eclipse, desenho 2D
  enemies.js        ENEMY_TYPES, Enemy, Crawler, Legionary, Shooter, Hunter, AIDirector
  boss.js           HazardSystem e Boss (NEXUS)
  projectiles.js    ProjectileSystem
  pickups.js        PickupSystem (células, cápsulas, memórias)
  rooms.js          THEMES, ROOM_DEFS e Room (cenário pré-renderizado e colisões)
  waves.js          WaveManager (ondas, porta, chefe)
  ui.js             wrapText, glowText, drawIcon (ícones procedurais)
  hud.js            HUD
  screens.js        Screens: título, pausa, árvore de habilidades, evoluções, finais
  story.js          MEMORIES, STORY, ENDINGS, CHAPTERS (textos da história)
  storyscreen.js    Backdrop (cenários pintados) e StoryScreen
  game.js           Game: loop, estados, eventos de combate, XP, salvamento, renderização
  models/           modelos 3D (um arquivo por modelo, registrados em MODELS3D)
  main.js           boot(): cria o jogo — sempre o último script
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
| Novas telas e menus | `js/screens.js` (desenho) e `js/game.js` (estado e entrada) |
| Textos da história | `js/story.js` |
| Novos sons | `AudioSys.play()` em `js/audio.js` |
| Teclas e botões | `KEYMAP` e `PADMAP` em `js/controls.js` |
| Novo modelo 3D | crie `js/models/<chave>.js` com `MODELS3D.<chave> = { build, pose, opts, glows }` e inclua o `<script>` no `index.html` |
| Estilos da página | `css/main.css` |

Para manter o projeto organizado, coloque código novo no arquivo da responsabilidade correspondente (ou crie um arquivo novo e inclua-o no `index.html` na posição certa) em vez de voltar a concentrar tudo no `index.html`.

### Dependências

Nenhuma. Não há bibliotecas, CDNs, fontes externas, imagens nem arquivos de áudio: gráficos, modelos 3D e sons são gerados por código. Os dados salvos ficam no `localStorage` do navegador (`eclipse_zero_save_v1`, `eclipse_zero_best`, `eclipse_zero_3d`).

### Versão de arquivo único

Até a reorganização, o jogo inteiro ficava no `index.html`. Essa versão continua no histórico do Git; para restaurá-la: `git checkout 12b0d26 -- index.html` (e apague `css/` e `js/` se quiser voltar ao formato antigo).
