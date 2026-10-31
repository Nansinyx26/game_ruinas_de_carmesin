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
- **Armazenamento:** os GLB de origem no Git LFS já ocupam ~820 MB da cota gratuita de 1 GB. Modelos novos do Blender saem em GLB pequenos, fora do LFS.
- **Escala do pedido:** é o escopo de meses de uma equipe. Cada fase abaixo entrega partes funcionando e testadas, e o estado de cada item fica registrado aqui.

## 4. Plano por fases

1. **Fase 1 — análise (este documento).** Concluída.
2. **Fase 2 — cidade principal:**
   - kit modular de arquitetura no Blender (paredes de pedra e madeira, portas, janelas, telhados, escadas, arcos, colunas, sacadas, cercas, ponte, mobília, lampiões) e prédios montados com ele;
   - taverna, hospedaria, conselho, quartel e casas no Refúgio da Aurora, com **interiores** (zonas fechadas com mobília, quem trabalha ali e serviços);
   - a praça e as ruas com mobiliário.
3. **Fase 3 — NPCs:**
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
