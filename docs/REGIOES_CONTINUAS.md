# Grandes Regiões contínuas — análise, plano e etapas

Resposta ao pedido "ECLIPSE ZERO: grandes regiões exploráveis com câmera isométrica e terceira pessoa"
(referência de exploração: The Witcher 3). Tudo abaixo foi conferido no código, não presumido.

## 1. Como o mundo é feito hoje

| Parte | Hoje | Onde |
|---|---|---|
| Regiões | 11 regiões, cada uma uma grade de zonas (2×3 ou 3×3) | `js/world.js`, `js/mundo/regioes.js`, `js/mundo/expansao.js` |
| Zonas abertas | Velmora, Lagoa, Obsidiano, Cidade Morta e quase todo o Seraph e o Asterion: campo aberto de 46–50 tiles (~2.600–2.800 unidades, ~80 m) sem paredes | `Room.generateAberto` |
| Travessia entre zonas abertas | Já sem tela de carregamento: andar pela borda leva à vizinha na hora (dissolve de 0,28 s), no mesmo ponto da borda oposta e no mesmo passo; os modelos da vizinha já vinham carregando (`World.preCarregar`) | `World.go`, `World.loadZone(…, continuo)` |
| Relevo | Contínuo entre zonas (o mesmo campo em coordenadas do mundo) | `js/mundo/relevo.js` |
| Zonas de cidade (Carmesin, Nexus, Metrópole, Ruínas, Nexus Zero) | Salas fechadas de 15–24 tiles com paredes e passagens com escurecer | `Room.generate` |
| Interiores e masmorras | Zonas próprias, entradas por porta (carregamento curto) | `js/mundo/bairro.js`, `js/mundo/locais.js` |
| Câmeras | Isométrica clássica (2D com sprites do motor 3D) e 3ª pessoa (3D, motor R3D ou Three.js) | `js/game.js`, `js/terceira.js` |
| Mapa do mundo | Regiões, zonas descobertas, portais e viagem rápida | `World.drawMap` |

O que falta em relação ao pedido: (a) cada zona ainda é um pedaço pequeno e, ao chegar à borda, não se
via o território continuar; (b) as regiões de cidade são salas com paredes ligadas por passagens; (c) a
câmera isométrica não era 3D (sem rotação); (d) a viagem entre regiões não tem tela de carregamento
própria (com salvar → descarregar → carregar → posicionar).

## 2. Decisão de arquitetura

Não refazer o mundo como uma sala gigante: mais de 30 sistemas montam o conteúdo por zona
(acampamentos, baús, estruturas, paisagem, água, vegetação, moradores, missões, eventos) e já funcionam.
A região contínua é feita por **streaming de setores**: a zona onde o herói está continua sendo a
"lógica" (inimigos, colisão, missões), e as zonas em volta são **mostradas de verdade** além da borda e
montadas de antemão; ao cruzar, a vizinha vira a zona atual sem tela de carregamento e a de onde se veio
vira vizinha. Para isso cada zona passou a ter **semente fixa** (o mesmo lugar é sempre igual: o que se vê
além da borda é exatamente o que se encontra ao entrar).

## 3. Etapas

| Etapa | O quê | Estado |
|---|---|---|
| 1 | Câmera **Isométrica 3D** (o mesmo mundo 3D, do alto, com rotação e zoom) selecionável; semente fixa por zona; **território vizinho visível** nas câmeras 3D nas regiões abertas (chão pintado, água pintada, relevo contínuo, mata do kit do Blender); a zona de origem vira vizinha sem custo | **feita** |
| 2 | Vizinhas também com as estruturas GLB e a paisagem gerada (árvores grandes, rochas, ruínas) e a travessia com dissolve curto (0,12 s) quando a vizinha já está à vista — **feito**; falta a superfície da água, a grama 3D e a vista isométrica clássica mostrando as vizinhas | parcial |
| 3 | Zonas de cidade como bairros abertos: tirar as paredes entre zonas da mesma região (ruas que continuam), portões só na muralha; Refúgio da Aurora integrado à região inicial com a estrada saindo pelos portões | falta |
| 4 | Regiões maiores: mais zonas por região (estradas entre vilas, campos, rios com pontes) usando o kit e as estruturas que já existem | falta |
| 5 | Viagem entre regiões e masmorras com tela de carregamento própria (salvar → descarregar → carregar → posicionar) e o Mapa do Mundo com as regiões | falta |
| 6 | Desempenho em mapa grande: LOD das vizinhas, distância de renderização configurável, culling por setor, memória (atlas das vizinhas em 1024, cache de 8 já feitos) | parcial |

## 4. Etapa 1 — o que foi feito

- **Câmera Isométrica 3D** (`js/terceira.js`): o modo `iso3d` usa o mesmo desenho da 3ª pessoa com a câmera
  no alto (inclinação ~52°), longe (820, zoom de 420 a 1700 pela roda) e com a lente fechada (30°, quase sem
  perspectiva). Começa olhando como a isométrica clássica e gira com Z/C, botão direito ou o analógico; não
  volta sozinha para trás do herói; fica acima das paredes; a névoa começa depois do herói. O movimento é
  relativo à câmera. V alterna isométrica → isométrica 3D → 3ª pessoa; Configurações → Vídeo → Câmera; no
  pause, "CÂMERA". As três câmeras usam o mesmo mapa, heróis, inimigos, equipamentos e combate.
- **Semente fixa por zona** (`js/rooms.js`, `Room.semente`): pela zona e pela semente do mundo.
- **Território vizinho** (`js/mundo/vizinhos.js`): nas regiões abertas, as até oito zonas em volta são
  montadas no tempo livre, uma por vez (a sala, o atlas do chão em 1024, a malha com o relevo de
  `Relevo.campo`, que é contínuo na borda), e entram na cena das câmeras 3D: o piso pintado (com o leito
  dos rios) e, na floresta, as árvores, arbustos e pedras do kit do Blender nos lugares delas. A vizinha
  ocupa a casa ao lado com a mesma regra de frações da travessia. O chão vizinho recebe sombra mas não
  projeta (a emenda ficava riscada). A mata falsa da margem sai de cima dela. Configurações → Vídeo →
  Território vizinho visível (desligado em celular e no perfil Celular).
- Testes: `EclipseTests.regioesContinuas` (15 verificações).

Limites desta etapa: as vizinhas ainda não mostram as estruturas GLB, a superfície da água nem a grama 3D;
a vista isométrica clássica não as mostra; nas regiões de cidade (salas com paredes) nada muda ainda; no
renderizador realista (Three.js) o chão vizinho ainda projeta sombra.

## 5. Etapa 2 — o que foi feito até agora

- As vizinhas mostram também as **estruturas GLB** da lista da zona (`Estruturas.ZONAS`) e a **paisagem
  gerada pela semente** dela (`Paisagem.fantasma`): árvores grandes, plantas, rochas e ruínas nos mesmos
  lugares (a geração usa a água, o relevo, as passagens, o portal e os baús da definição da zona). Já
  visitada, a lista é a de verdade; não visitada, a gerada fica à parte (a carga de verdade gera a dela,
  com tudo o que estiver na zona). Os modelos vêm sob demanda, um arquivo por estrutura.
- Travessia: com a vizinha já à vista, o disfarce da troca cai de 0,28 s para 0,12 s.
- Testes: mais 3 verificações em `EclipseTests.regioesContinuas`.
- **Distância de visão** (pedido "campo de visão grande até o horizonte"): Configurações → Vídeo → Distância
  de visão (Curta, Média, Longa, Horizonte; perfil Desktop em Longa, Extreme PC em Horizonte). A névoa
  recua (até ×3,2), o plano de corte vai a 12 mil (Longa) ou 20 mil (Horizonte), o chão distante vai até
  o horizonte e, em Longa e Horizonte, também o **segundo anel** de zonas (a duas casas) aparece, com o
  atlas em 512 e só as estruturas grandes. O renderizador realista usa a mesma lente e o mesmo corte.
- Limite conhecido: cada vizinha é montada de uma vez no tempo livre (a pintura do chão leva de dezenas a
  centenas de milissegundos): numa máquina lenta, um pequeno engasgo por zona na primeira vez.
