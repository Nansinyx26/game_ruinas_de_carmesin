# Expansão do mundo aberto — Fase 1: análise e plano

Resposta à fase 1 do "Prompt mestre — expansão completa do mundo aberto". Tudo abaixo foi conferido no código de `main` (31/10/2026), não presumido. Estados: **existe** (funciona no jogo e tem teste), **parcial** (existe, mas abaixo do pedido), **falta**.

## 1. Como o jogo é feito

| Parte | O que é | Onde |
|---|---|---|
| Plataforma | HTML5 + JavaScript em scripts clássicos, sem bundler; roda do disco (`file://`) e no GitHub Pages | `index.html`, `js/` |
| Motor 3D | **R3D**, próprio, WebGL 1: na vista isométrica cada modelo vira um sprite num atlas; na 3ª pessoa, a cena inteira em perspectiva. Pele na CPU (linear; quatérnios duplos nos personagens principais) | `js/engine3d.js`, `js/terceira.js` |
| Render realista | Three.js 0.186 (MIT, autorizado) por cima do R3D na 3ª pessoa, por http | `js/realista/realista.js` |
| Animação | **Poses procedurais em código** por estado (parado, andar, correr, golpes, esquiva, dano, pulo…), com transição entre poses; não há tocador de clipes de animação | `js/models/*.js`, `R3D.misturar` |
| Modelos | GLB (Meshy e Blender) convertidos offline para `.js` (base64) e carregados sob demanda; peças orgânicas e cenário feitos por scripts do Blender | `tools/importar_*.py`, `tools/blender/` |
| Mundo | Zonas (salas) carregadas uma por vez (`World.loadZone`), cada região uma grade de zonas; campo aberto com margem de paisagem | `js/world.js`, `js/mundo/regioes.js`, `js/rooms.js` |

## 2. O pedido contra o que já existe

### Cidade principal (seção 2) — Refúgio da Aurora (`js/mundo/cidade.js`)

| Pedido | Estado | Observação |
|---|---|---|
| Praça central, portões de saída, mural de missões | existe | praça com a Chama da Aurora, portal, portões por região, Centro de Missões |
| Ferreiro, armaria (armas e armaduras), mercado, oficina de fabricação, guilda | existe | estações com serviços reais (Arsenal, Fábrica, WorldInv, Aventuras) |
| Hospedaria | parcial | o Alojamento descansa até de manhã; não é uma hospedaria com taverneiro |
| Taverna, conselho/prefeitura, quartel de guardas, área residencial, treino | falta (treinador existe como morador) | |
| Áreas secretas, passagens escondidas | parcial | segredos e baús existem nas regiões, não na cidade |
| **Entrar nas construções (interiores)** | **falta** | os prédios são fachadas; o serviço fica na porta |
| Arquitetura 3D com identidade por prédio | parcial | fachadas desenhadas por código (2D na isométrica, caixas na 3ª pessoa); 12 objetos do Blender nas outras cidades |

### Cidades e assentamentos (seção 3)

| Pedido | Estado | Observação |
|---|---|---|
| Várias cidades | existe | Metrópole Tecnológica, Cidade das Ruínas Carmesins, Nexus Zero (`js/mundo/expansao.js`) e vilarejos |
| Vila florestal | parcial | a clareira de Velmora ganhou a vila de estrada do kit do Blender |
| Cidade fortificada, povoado congelado, cidade abandonada, assentamento subterrâneo, fortaleza inimiga com arquitetura própria | parcial | há zonas com esses temas (Fortaleza da Vigília, Cidade Engolida, cavernas), mas com o cenário por tema de cor, não com arquitetura exclusiva |

### NPCs, diálogo e missões (seções 5 e 6)

| Pedido | Estado | Observação |
|---|---|---|
| Nome, função, personalidade, assuntos, rumores, serviços | existe | `js/mundo/povo.js` |
| Diálogo com escolhas, missões, recompensas, reputação | existe | `js/mundo/dialogo.js`, reputação por facção |
| Rotina dia/noite, abrigo no tempo ruim, encolher com inimigos por perto | existe | |
| Sentar, comer na taverna, conversar entre NPCs, dormir em casa, guardas mudando a patrulha | falta | |
| Modelo 3D próprio por NPC importante | parcial | poucos modelos de morador (civil, cientista, anciã…) repetidos |
| Missões: principais, secundárias, contratos de caça, coleta, exploração, chefes, diário | existe | `missoes.js`, `aventuras.js`, `campanhas.js`, quadro de contratos |
| Proteção de NPC, investigação, missões secretas | parcial | há tipos próximos nas aventuras; não todos |

### Inimigos, IA e chefes (seções 7 a 11)

| Pedido | Estado | Observação |
|---|---|---|
| **Inimigos com modelo exclusivo** | **falta** | 5 modelos base (rastejador, legionário, drone, sacerdote, caçador) e 20+ variantes por cor, tamanho e traços (`js/mundo/variantes.js`) — exatamente o "mesmo modelo com cores diferentes" que o pedido proíbe |
| Traços de comportamento (matilha, veneno, explode, enterra, teleporta, regenera…) | existe | |
| Percepção (distância, frente, linha de visão, barulho, noite), alerta, perseguição, coleira, volta para casa, fuga do herói | existe | `js/mundo/encontros.js` |
| Desvio de obstáculos, linha de visão | existe | `Room.desvio`, `Room.linhaLivre` |
| Patrulha | parcial | acampamentos parados ou em patrulha simples |
| Procurar o herói ("?"), defender, recuar em desvantagem, proteger aliados, táticas de grupo | parcial / falta | |
| **Chefes com modelo, arena, fases e mecânicas próprias** | **falta nos regionais** | os 10 chefes regionais são modelos base com mais vida (`hp: 2` a `6.5`); só o NEXUS da história tem 3 fases e ataques avisados (`js/boss.js`) |
| Spawn: sem inimigos na cidade, por faixa de nível, eventos, sem excesso | existe | zonas seguras, faixas 1–100 |

### Blender, animação, clima, desempenho (seções 4, 12 a 15)

| Pedido | Estado | Observação |
|---|---|---|
| Pipeline do Blender por scripts, texturas PBR assadas, GLB | existe | `tools/blender/`, 16 peças da natureza, 120 armaduras, 10 cabelos |
| Kit modular de arquitetura (paredes, portas, janelas, telhados, escadas, arcos…) | falta | |
| Rig humanoide com pesos; molas de cabelo e capa | existe | |
| Rigs de quadrúpede, alado, criatura especial | falta | |
| Clipes de animação do Blender tocados no jogo | falta | o R3D anima por poses em código; os clipes exigiriam um tocador (ou o caminho Three.js) |
| Clima: chuva, neve, neblina, calor, frio, roupas molhadas, abrigo dos moradores, percepção menor na neblina | existe | `js/mundo/clima.js` |
| Criaturas que só aparecem em certo clima, chefes que usam o clima | falta | |
| Carregar por zona, peças sob demanda, nível de detalhe, cache de vértices parados | existe | |

## 3. Limitações reais

- **Animação:** o motor não toca clipes. Criaturas novas recebem poses procedurais em código, como os heróis. Um tocador de clipes de GLB é possível, mas é trabalho de motor à parte.
- **Visual "nova geração":** o R3D é WebGL 1 com pele na CPU. O realismo maior vem do Three.js na 3ª pessoa, por http. Geometria e texturas ficam dentro do orçamento (props até 1,5 mil triângulos, personagens até ~12 mil por peça).
- **Interiores:** o mundo é feito de zonas. Um interior será uma zona fechada pequena, ligada à porta do prédio, como as masmorras.
- **Armazenamento:** os GLB de origem no Git LFS ocupam ~1,3 GB; a cota gratuita das contas pessoais do GitHub é de 10 GB (a de 1 GB citada antes estava desatualizada). Modelos novos do Blender saem em GLB pequenos, fora do LFS.
- **Escala do pedido:** é o escopo de meses de uma equipe. Cada fase abaixo entrega partes funcionando e testadas, e o estado de cada item fica registrado aqui.

## 4. Plano por fases

1. **Fase 1 — análise (este documento).** Concluída.
2. **Fase 2 — cidade principal:** concluída (relatório na seção 5).
   - kit modular de arquitetura no Blender (paredes de pedra e madeira, portas, janelas, telhados, escadas, arcos, colunas, sacadas, cercas, ponte, mobília, lampiões) e prédios montados com ele;
   - taverna, hospedaria, conselho, quartel e casas no Refúgio da Aurora, com **interiores** (zonas fechadas com mobília, quem trabalha ali e serviços);
   - a praça e as ruas com mobiliário.
3. **Fase 3 — NPCs:** concluída (relatório na seção 6).
   - atividades da rotina: sentar, comer na taverna, conversar entre si, dormir em casa, guardas em turnos;
   - modelos 3D próprios para os NPCs importantes;
   - missões ligadas aos prédios novos.
4. **Fase 4 — inimigos com modelo exclusivo** (Blender + poses em código), começando por:
   - lobo monstruoso (quadrúpede);
   - inseto mutante;
   - criatura voadora;
   - espectro;
   - bandido e cultista (humanoides);
   - estados de IA que faltam: patrulha por rota, busca, defesa, recuo e grupo.
5. **Fase 5 — chefes de mapa com modelo e arena próprios:**
   - Colosso das Ruínas, Guardiã da Floresta (Velmora), Rei Corrompido e Dragão da Tempestade;
   - usam o sistema de fases e avisos do NEXUS, com pontos fracos, intro e recompensas;
   - entram no lugar dos chefes regionais de mesmo tema.
6. **Fase 6 — integração** com combate, progressão, missões e mapa.
7. **Fase 7 — otimização:** nível de detalhe das criaturas, limite de entidades e carregamento por zona.
8. **Fase 8 — testes no jogo:** suíte automática e capturas.

Ao fim de cada fase, este documento recebe o que foi feito, os arquivos e os problemas.

## 5. Fase 2 — cidade principal: o que foi feito

Entregue em 31/10/2026. Tudo abaixo funciona no jogo, tem teste na suíte (`js/testes.js`: `bairro()` e
`bairroFotos()`, 1073/1073 passando) e foi conferido em capturas (vista isométrica de dia e de noite,
3ª pessoa e os quatro interiores).

### Kit modular de arquitetura no Blender (`tools/blender/arquitetura.py`)

| Grupo | Peças | Onde fica |
|---|---|---|
| Módulos (o kit) | parede de pedra, parede de enxaimel (reboco, vigas, mãos-francesas), porta, janela (caixilho, vidro aceso, venezianas), telhado de duas águas (fiadas de telhas, cumeeira, empenas), escada, coluna, arco (aduelas e fecho), sacada, ponte, chaminé, ameias | `assets/models/arquitetura/modulos/*.glb` (para montar outros prédios) |
| Prédios montados com os módulos | taverna, hospedaria, conselho, quartel, três casas (2,4 a 7,7 mil triângulos, texturas assadas de 1024 px) | `assets/models/arquitetura/<id>.glb` + `<id>.json` (portas e janelas marcadas) |
| Mobília e objetos de rua | mesa, banco, cadeira, cama, barril, balcão, estante, lareira, caixote, boneco de treino, armeiro, lampião de rua, estandarte (96 a 912 triângulos, 512 px) | `assets/models/arquitetura/<id>.glb` |

Tudo sai de regras em código (nada modelado à mão, nada de bloco no lugar de peça): o prédio é uma
`Montagem` que posiciona os módulos (giro e translação), com seis células de material procedural
(pedra em blocos, reboco, madeira com veio, telha, ardósia, ferro, vidro aceso, tecido) assadas em cor
com oclusão, metal/aspereza, normais e emissão. `python3 tools/blender/arquitetura.py [nomes]` gera e
`python3 tools/importar_prop.py --grupo arquitetura` converte (marcas incluídas) para
`js/assets/arquitetura3d.js` (10 MB, carregado sob demanda).

### Bairro da Muralha e interiores (`js/mundo/bairro.js`)

| Pedido | Estado | Como |
|---|---|---|
| Taverna, hospedaria, conselho, quartel, área residencial | existe | zona nova da cidade, o **Bairro da Muralha** (passagem na borda leste da praça): quartel, taverna e conselho na muralha de cima; hospedaria e três casas na da esquerda, distribuídos pelas larguras reais dos modelos |
| Arquitetura 3D com identidade por prédio | existe | os modelos do Blender: na isométrica, uma foto de cada prédio pelo motor 3D (com a passada emissiva das janelas, mais forte à noite); na 3ª pessoa, os modelos na cena (o que tem a câmera dentro some) |
| **Entrar nas construções** | existe | porta de cada prédio público ([E] Entrar) leva à sala do interior; a saída na frente da sala volta para a porta do prédio no bairro; as casas respondem à porta e ficam fechadas |
| Interiores mobiliados | existe | taverna (balcão, barris, mesas com bancos e cadeiras, estante, lareira), hospedaria (recepção, camas, lareira), conselho (mesa do conselho, estantes, estandartes) e quartel (armeiros, bonecos de treino, beliches); piso de tábuas ou lajes, colisão em fileira para os móveis compridos (dá para chegar ao balcão) |
| Quem trabalha ali e os serviços | existe | Bento (refeição: vida, energia e o corpo aquecido por 5 min; rumores que marcam masmorras e tesouros) e o bardo Cosme; Rosa (descanso até de manhã e o armário) e um viajante; a Conselheira Helena (missões e contratos da Guilda) e o escriba; a Capitã Irene (treino, desafio da arena, árvore de habilidades) e um soldado; na rua, um guarda em ronda, uma moradora e um carroceiro |
| Praça e ruas com mobiliário | existe | calçamento diante dos prédios, praça do poço, carroça e feno, lampiões nos vãos entre os prédios, barris, caixotes, estandartes, boneco de treino e armeiro diante do quartel |
| Zona segura, clima e mapa | existe | sem inimigos nem eventos (os eventos nunca caem numa zona da cidade); abrigo da chuva junto aos prédios e dentro das salas; no mapa, o bairro e os interiores contam como a cidade, e a planta (M) mostra o bairro |

### Arquivos

- novos: `tools/blender/arquitetura.py`, `js/mundo/bairro.js`, `js/assets/arquitetura3d.js`,
  `assets/models/arquitetura/` (20 GLB do jogo, 7 JSON de marcas, 12 módulos), prévias em `assets/models/previews/`;
- alterados: `tools/blender/kit.py` (chanfro aplicado antes de girar), `tools/importar_prop.py` (grupo
  arquitetura e as marcas), `js/engine3d.js` (`R3D.foto` devolve a passada emissiva),
  `js/mundo/cenario.js` (`registrarModelos` para kits carregados depois), `js/rooms.js` (sala do bairro
  e dos interiores, pisos de tábuas e lajes), `js/world.js`, `js/mundo/cidade.js`, `js/mundo/clima.js`,
  `js/mundo/eventos.js`, `js/mundo/povo.js`, `js/game.js`, `js/terceira.js`,
  `js/terceira_ambiente.js` (luz quente nas salas do bairro), `index.html`, `js/testes.js`.

### Problemas encontrados e limites

- O terraço do quartel saía preto no assado (faces coincidentes no topo) e a água-furtada da
  hospedaria ficava enterrada no telhado: corrigidos e refeitos.
- Os prédios da muralha da esquerda não cabiam lado a lado em 26 ladrilhos: o bairro tem 28 e os
  prédios são distribuídos pelas larguras medidas dos modelos.
- Os interiores são maiores que os prédios por fora (18 a 20 m de lado), como é comum em jogos; a
  entrada é por troca de zona (com o escurecimento), não sem costura.
- Os moradores ainda não sentam, comem nem dormem: são as atividades da Fase 3.

## 6. Fase 3 — moradores: o que foi feito

Entregue em 01/11/2026. Testado na suíte (`rotina()`, 1105/1105 passando) e em capturas.

### Rotina por hora (`js/mundo/rotina.js`)

| Pedido | Estado | Como |
|---|---|---|
| Sentar, comer na taverna | existe | cadeiras e bancos dos interiores; comendo ou bebendo, a mão vai da mesa à boca. Às 20 h a taverna tem 6 moradores sentados, além do taverneiro e do bardo |
| Dormir em casa | existe | nas camas da hospedaria e nos beliches do quartel, deitados de costas; quem mora nas casas do bairro entra pela porta à noite e só sai de manhã |
| Conversar entre si | existe | em pares, frente a frente, um fala e o outro escuta, com as falas em balões (Nina e Jorge no poço, à tarde) |
| Guardas em turnos | existe | o Rui faz a ronda de dia e a Marta à noite; os dois trocam na porta do quartel às 6 h e às 18 h, com a fala da troca, e quem sai do turno vai comer e dormir no quartel |
| Ir e vir | existe | com o herói na zona, quem tem compromisso em outro lugar anda até a porta (ou a passagem) e entra; quem chega sai pela porta do prédio de onde vem; ao carregar uma zona, cada um já está onde a agenda manda |
| Conversa com o herói em qualquer postura | existe | sentado, quem conversa continua sentado; quem dorme só resmunga num balão |

Doze moradores têm agenda: Bento, Cosme, Rosa, o viajante, a Conselheira Helena, o escriba, a Capitã Irene, o Soldado Pedro, os guardas Rui e Marta, Nina e Jorge. O diário e os marcadores apontam a zona onde a pessoa está naquela hora. Nada novo vai para o salvamento: tudo sai da hora do mundo.

### Modelos 3D próprios dos moradores importantes (`js/mundo/npc3d.js`)

- **Quem ganhou modelo próprio:** Bento, Cosme, Rosa, Helena, Irene, Rui e Marta.
- **Como são montados:** com as mesmas peças GLB da criação de personagem (corpo, rosto, cabelo, barba, as roupas e armaduras do catálogo), no esqueleto do Kael. Cada um tem aparência e roupa próprias. Exemplos:
  - a conselheira usa o conjunto arcano azul do nível 50;
  - a capitã usa as placas e a capa de batalha;
  - os guardas usam o couro e as placas do nível 30.
- **Posturas novas no esqueleto** (`js/models/kael.js`): sentar, comer, beber, falar, ouvir, guarda em sentido e dormir deitado. O modelo `civil` (os outros moradores) também ganhou essas posturas (`js/models/civil.js`).
- **Desempenho (medido):** um corpo destes tem 52 a 66 mil triângulos com pele. Três deles na fila de todo quadro deixavam a pose em ~11 ms por quadro.
  - Agora, na vista isométrica, cada um vira uma foto do motor 3D. A foto é refeita de 2 a 30 vezes por segundo, conforme a postura: dormindo, poucas vezes; andando, quase todo quadro. Fora da tela, a foto não é refeita.
  - Na 3ª pessoa entra o modelo, com a pele reaproveitada enquanto a postura não muda (o cache de pose `o.cache` do `R3D.poseAll`).
  - Na taverna cheia, a pose média caiu de 67–77 ms para 17 ms por quadro (os moradores comuns sozinhos dão 15 ms). Os números são do SwiftShader do ambiente de testes.
  - Os modelos dos ausentes saem da memória na troca de zona.

### Missões ligadas aos prédios

| Missão | Quem dá | Passos |
|---|---|---|
| O Ensopado do Javali Dourado | Bento (taverna) | levar 3 couros e 4 ervas; depois disso, a refeição fica pela metade do preço para sempre |
| O Hóspede Encapuzado | Rosa (hospedaria) | conversar com o viajante, seguir o rastro do caçador nas Galerias de Serviço (3 pistas), derrotar o Caçador do NEXUS, levar o núcleo de volta e escolher o destino dele |
| Selo do Conselho | Helena (conselho) | mostrar o selo à Mestra Veridiana (praça) e à Capitã Irene (quartel) e voltar |
| Recruta da Muralha | Irene (quartel) | derrotar 10 inimigos em Carmesin, contar ao Soldado Pedro como foi e voltar |

### Outros ajustes

- Dentro dos prédios não chove nem neva (antes passava um pouco "pelas frestas", como nas ruínas).

### Limites

- As posturas são poses em código no esqueleto, como as do herói. Não são clipes de animação gravados.
- Os moradores da praça antiga continuam com o modelo genérico e sem agenda.
