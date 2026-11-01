# Criaturas do Blender e Topologia Inteligente

Estado real em 01/11/2026. Este documento lista o que foi feito e verificado, e também o que ainda não foi feito.

## 1. O que está no jogo

| criatura | uso no jogo | origem da malha | LOD 0 → 3 (triângulos) | ossos | animações | GLB / .blend |
|---|---|---|---|---|---|---|
| **Lobo Sombra Neon** | inimigo `lobo_neon` na **Metrópole Tecnológica** (traços matilha e teleporta) | GLB do Meshy enviado (127.298 tri), com **retopologia, rig e animações no Blender** — é a **base** das pelagens abaixo | 11.056 → 5.528 → 2.764 → 1.104 | 31 | 15 | `assets/Creatures/Enemies/lobo_sombra_neon/` |
| **Asa Noturna** (Azure Nightwing) | pet raro do viveiro e ave de neon nos telhados da Metrópole | GLB do Meshy enviado (128.844 tri), com **retopologia, rig de ave e animações no Blender** | 11.222 → 5.610 → 2.804 → 1.122 | 26 | 13 | `assets/Creatures/Pets/Exotic/asa_noturna/` |
| Lobo de Raiz | inimigo `lobo_raiz` em **Velmora** | pelagem da base (musgo e linhas verdes acesas) | como a base | 31 | 15 | `assets/Creatures/Enemies/lobo_raiz/` |
| Lobo das Neves | inimigo `lobo_neve` em **Asterion** | pelagem da base (branco gelo, linhas azul-claro) | como a base | 31 | 15 | `assets/Creatures/Enemies/lobo_neve/` |
| Lobo Cinzento | **Lobo da Muralha** (pet) e os **cães de caça** de Velmora | pelagem da base (cinza, sem brilho) | como a base | 31 | 15 | `assets/Creatures/Wildlife/Mammals/lobo_cinzento/` |
| **Cão da Aurora** | pet do viveiro e **cães de rua** do Refúgio (adotáveis) | pelagem da base (marrom e creme) | como a base | 31 | 15 | `assets/Creatures/Pets/Dogs/cao_aurora/` |
| **Cão das Neves** | pet do viveiro e cães de trenó de Asterion | pelagem da base (cinza e branco) | como a base | 31 | 15 | `assets/Creatures/Pets/Dogs/cao_neve/` |

**As pelagens** (`tools/blender/criaturas/lobo_neon.py → PELAGENS`): a mesma malha com retopologia, o mesmo esqueleto e as mesmas animações da base, com a cor assada **remapeada pela luminância** (o detalhe do pelo continua) e as linhas acesas recoloridas (com brilho) ou viradas em marcas no pelo. Os arquivos do jogo das pelagens trazem **só as texturas** (cerca de 0,6 MB em vez de 1,8 MB); o motor usa a malha da base, carregada uma vez. As pelagens são materiais do `.blend` da base. Os lobos feitos antes por script (`lobo.py`, qualidade inferior) foram movidos para `assets/Creatures/Prototypes/`; o script continua como **molde** do esqueleto e das animações.

**Boca fechada:** a malha do Meshy não tem mandíbula separada, então as chaves da mandíbula saíram das animações. A mordida fica no bote da cabeça, sem esticar a pele.

Cada pasta tem o `.glb` final (texturas embutidas, armadura, animações com nome), o `.blend` editável (no Git LFS) e uma prévia `.png`. As criaturas do Meshy também têm o relatório `*_topologia.json` (antes e depois) e a fonte original intacta em `fonte/` (Git LFS).

**Animações:**
- Lobos e cães: `idle`, `andar`, `trotar`, `correr`, `atacar` (bote), `saltar` (investida), `dano`, `atordoado`, `morte`, `uivar`, e as de companhia: `sentar`, `dormir` (deitado), `comer`, `brincar` (o convite) e `carinho`. As posturas foram conferidas na vista lateral.
- Asa Noturna: `idle` (pousada, asas meio dobradas), `andar` (saltita), `voar`, `planar`, `decolar`, `pousar`, `comer`, `dormir`, `sentar`, `brincar`, `carinho`, `chamar` (comando) e `dano`.

## 1b. Animais de companhia (`js/mundo/pets.js`)

O projeto separa os animais em três categorias: **companhia** (seguem o herói), **domésticos das cidades** e **montarias**. Nesta etapa está pronta a de **companhia**, com os dois modelos do Blender que já existem.

| espécie | modelo | preço | raridade | comportamento |
|---|---|---|---|---|
| **Asa Noturna** | `asa_noturna` (malha do Meshy, retopologia e rig de ave) | 2.400 células | rara | voa atrás do herói, pousa ao lado, senta, dorme, come, brinca, carinho, chamado |
| **Cão da Aurora** | `cao_aurora` (pelagem da base) | 600 células | comum | como o lobo; também adotável na rua |
| **Cão das Neves** | `cao_neve` (pelagem da base) | 1.100 células | incomum | como o lobo |
| **Lobo da Muralha** | `lobo_cinzento` (pelagem da base) | 900 células | comum | anda, trota e corre atrás do herói, senta, deita para dormir, come, brinca (o convite), carinho, uivo |

- **Loja física:** o **Viveiro dos Alves**, no Bairro da Muralha (a antiga Casa dos Alves, agora com interior 3D). Os atendentes são a tratadora **Cora** (vendedora) e o aprendiz **Davi**. Os animais da **vitrine** ficam lá dentro, em 3D: dá para chegar perto e ver o preço.
- **Fluxo de compra:** catálogo → ficha do animal com o preço → **confirmação** → cobrança em **células** (`Oficios.cobrar`, a mesma moeda do jogo; nenhuma economia nova) → escolha do **nome** (sugestões da espécie ou digitado; até 16 letras, sem símbolos). A Cora também **guarda e devolve** os animais (até 6 por personagem).
- **O companheiro:**
  - segue atrás e de lado; a ave voa;
  - na luta, fica longe (a ave sobe mais) e não ataca: **nenhuma vantagem de combate**;
  - parado, senta; à noite ou depois de muito tempo parado, dorme;
  - se ficar muito para trás, aparece perto; na troca de zona, chega junto.
- **[E] no companheiro:** dar um petisco (6 células), brincar, fazer carinho, ficar/seguir, chamar (comando), ver como está, mudar o nome e deixar no viveiro.
- **Coleiras** (acessório 3D):
  - a Cora vende três: **couro** (40 células), **ferro com plaqueta** (120) e **neon** (300), que brilha;
  - a coleira se escolhe no menu do animal e fica salva nele;
  - a peça é presa ao osso do pescoço, com o raio medido na fatia da própria malha, por isso serve em qualquer espécie com esse osso;
  - os cães de caça (couro) e os das neves (ferro) já usam a dos donos;
  - as aves não usam coleira.
- **Necessidades:** fome (sobe com o tempo de jogo), humor (cai com fome, sobe ao brincar) e afinidade (sobe ao alimentar, brincar e fazer carinho). Aparecem no **HUD**, embaixo da temperatura, e no texto do menu.
- **Salvamento:** `World.state.pets`, no mundo de cada personagem.
- **Testes:** `js/testes.js → pets()` (veja a seção 4).

## 1b'. Espécies por remodelagem no esqueleto (`tools/blender/criaturas/especies.py`)

Sem malha de origem para cada espécie, as duas bases com retopologia (o lobo e a ave do Meshy) foram **remodeladas no próprio esqueleto**, no Blender:

1. Cada osso recebe uma escala. Y muda o comprimento; X e Z mudam a espessura. A herança de escala fica desligada, então alongar a coxa empurra a canela sem engrossá-la.
2. A deformação é aplicada na malha de cada LOD, e a pose vira a nova pose de repouso. Os pesos e as animações continuam valendo.
3. A ovelha "infla" pelas normais onde os ossos do tronco mandam, o que forma a lã.
4. **Tosa (pelo curto)**, nos gatos, no cão de colo e no buldogue: a malha do lobo tem o pelo eriçado em pontas. Para cada osso, os vértices em que ele manda são divididos em fatias ao longo do osso e em 8 setores em volta dele. Em cada fatia e setor, o raio que passa do percentil vira um corte suave. Assim o corte segue a forma do corpo (barriga, costas, peito) e não vira um tubo. Depois, só as regiões aparadas são alisadas.
5. Os pés voltam ao chão, e a cor assada é remapeada para a pelagem.

| espécie | base | pelagens | uso no jogo | peça extra |
|---|---|---|---|---|
| gato | lobo (com tosa) | malhado, cinzento, da Sombra (rara, veios violeta acesos) | pet; gatos de rua (adotáveis) no Refúgio, no Bairro e no Mercado Vertical | — |
| raposa | lobo | vermelha | pet (incomum) | — |
| cão de colo | lobo (com tosa) | fulvo | pet | — |
| buldogue | lobo (com tosa: cabeça larga e curta, peito largo, pernas curtas, cauda curta) | fulvo, tigrado | pet; o tigrado é o cão de guarda dos comerciantes do Mercado Vertical | — |
| cabra | lobo | marrom e branca | Clareira de Velmora, oásis de Seraph | chifres |
| ovelha | lobo (lã inflada) | creme | Acampamento de Asterion | — |
| lobo de montaria | lobo (robusto) | comum, de guerra (marcas rubras acesas), da Aurora (lendário, fios dourados) | montarias | — |
| galinha | ave | carijó | Bairro e Clareira | crista e barbela |
| pato / ganso | ave | verde-azulado / branco | vila do lago | bico chato |
| pombo / canário | ave | cinza / amarelo | pombos no Refúgio, na Metrópole e no Mercado; canário como pet | — |
| papagaio | ave | verde, vermelho e amarelo | pet (exótico) | — |
| pavão | ave | azul, com as pontas da cauda acesas | o pavão do Conselho, no Refúgio | — |

Cada espécie tem o `.blend` editável (malha remodelada, esqueleto, ações e pelagens), o GLB por pelagem com texturas de 1024 px e o relatório `<espécie>_remodelagem.json`.

## 1d. Montarias (`js/mundo/montarias.js`)

- **Estrebaria da Guarda**, no Bairro da Muralha. O domador **Tobias** vende o Lobo de Montaria (2.500 células), o Lobo de Guerra (6.000, a partir do nível 30) e o Lobo da Aurora (15.000, a partir do nível 60). A compra tem confirmação.
- **Montar:**
  - [E] perto da montaria monta. O herói vai **sentado na sela**, com a pose `montado` do esqueleto do Kael: quadril na altura da sela, pernas dos lados do lombo, mãos nas rédeas e o corpo balançando no trote.
  - A velocidade sobe ×1,6 a ×2.
  - A montaria anda no passo do herói.
  - [E] ou qualquer golpe desmonta; montado, o herói não luta.
- **Fora da sela**, a montaria segue o herói. Na troca de zona ela vem junto, mesmo com o herói montado. Nos interiores ela espera do lado de fora.
- **Cavalos:** a malha do lobo não vira um cavalo convincente (testei e ficou um "lobo de pernas longas"). Por isso as montarias são lobos, um clássico de fantasia. O cavalo entra com uma malha própria, e a lógica da montaria já está pronta para ele.

## 1c. Animais domésticos das cidades (`js/mundo/animais_cidade.js`)

Cada cidade tem os seus animais, pela cultura e pelo clima. Não são todas as espécies em todo lugar:

| cidade | animais | comportamento |
|---|---|---|
| Refúgio da Aurora (praça) | cães e gatos de rua, pombos e o pavão do Conselho | cães farejam, gatos desconfiam, pombos voam; cães e gatos **podem ser adotados** |
| Bairro da Muralha | cães e gatos de rua, galinhas nos quintais | as galinhas ciscam e correm assustadas |
| Clareira dos Sinais (Velmora) | cães de caça, cabras e galinhas | as cabras pastam |
| Vila do lago | patos e gansos | ciscam; o ganso defende o território |
| Acampamento e Fortaleza de Asterion | cães das neves (trenós da Vigília) e ovelhas | as ovelhas pastam |
| Praça Central da Metrópole | Asas Noturnas nos telhados e pombos | pousadas; levantam voo quando o herói chega perto ou começa uma luta |
| Mercado Vertical / oásis de Seraph | gatos e pombos / cabras | — |

- **Em comum:** fogem da luta e voltam depois. [E] serve para afagar.
- **Adoção:** o cão de rua vira animal de companhia, com nome à escolha e chegando com fome. Ele sai da rua para sempre (`World.state.adotados`).
- **Desempenho:** 2 ou 3 animais por zona, com LOD e pose guardada fora da tela.

## 2. O tocador de animações do motor (`js/mundo/criaturas3d.js`)

- **Carga sob demanda.** `js/assets/criaturas/<id>.js` é gerado por `tools/importar_criatura.py` (texturas em WebP de 1024 px). Ele só é carregado quando a criatura aparece. Até chegar, o inimigo usa o modelo de sempre.
- **Clipe pelo estado do inimigo:**
  - parado → `idle`;
  - velocidade < 80 → `andar`, < 160 → `trotar`, acima disso → `correr`, com o ritmo ajustado à velocidade;
  - preparo, golpe e volta do bote → fases de `atacar`;
  - investida → `saltar`;
  - recuo do golpe → `dano`;
  - atordoado → `atordoado`;
  - morte → `morte`;
  - no acampamento calmo, um `uivar` de vez em quando.
- **Mistura entre clipes em quatérnios** (sem os saltos dos ângulos de Euler). O `R3D.misturar` fica de fora nesses modelos (`m.mixProprio`).
- **LOD:** pela distância do herói na 3ª pessoa (380 / 760 / 1250) e pelo zoom na isométrica. Fora da tela, a pose fica guardada por 0,25 s e a malha usada é a leve.
- **A morte de quem tem animação própria dura 1,3 s.** O inimigo cai e só depois some. Os demais continuam com 0,45 s.
- **Variantes de carne** (`organico`): sem as faíscas de máquina, com sangue próprio e sem a tinta por cima da textura.

## 3. Topologia inteligente

### 3.1 Diagnóstico (só leitura): `tools/topologia/diagnostico.py`

Percorre o projeto e mede cada GLB/GLTF:
- vértices, triângulos e cascas;
- duplicados reais, faces degeneradas, arestas não manifold, bordas abertas e vértices soltos;
- triângulos finos e normais;
- UVs, materiais, texturas, ossos e animações.

Classifica cada modelo por tipo e recomenda **retopologia**, **correção**, **LOD** ou **OK**. Saídas: `docs/topologia/inventario.json` e `docs/topologia/RELATORIO.md`.

Resultado em 01/11/2026: **369 arquivos** — 230 GLB medidos, 5 fontes (.blend) e 134 não medidos:
- **104 GLB comprimidos com Draco** (peças da criação e armaduras). O decodificador não está instalado aqui, e instalá-lo seria uma dependência nova sem autorização; medir esses exige o decodificador ou a versão já convertida do jogo.
- **30 arquivos que são imagens PNG com extensão `.glb`** em `assets/armaduras_extras/`. Não foram alterados.

Entre os 230 medidos, o relatório recomenda **retopologia em 67**, correção em 36 e LOD em 86. A maioria são fontes de alta resolução (cabelos de 1 a 1,7 milhão de triângulos, armaduras de 200 a 300 mil) que **o jogo não carrega diretamente**: ele usa as versões já convertidas e reduzidas em `js/assets/`.

### 3.2 Retopologia, LOD e assado no Blender: `tools/blender/topologia/retopologia.py`

As etapas, sempre sobre uma cópia (a fonte nunca é alterada):

1. **importar**: põe os pés no chão e centraliza.
2. **diagnosticar**: mede o "antes".
3. **limpar**: solda os vértices repetidos (no lobo, 10.761 costuras abertas viraram uma casca só), tira as degeneradas e os soltos, e refaz as normais.
4. **retopologia**: QuadriFlow com **quads alinhados à curvatura** e simetria em X.
   - O QuadriFlow do Blender recusa arestas menores que 0,0001 em valor absoluto, então a cópia é ampliada 100× durante a remalha.
   - Se ainda assim falhar, a ordem de reserva é: remalha por voxels → QuadriFlow → redução.
   - Depois disso, a malha é encostada na superfície da fonte (shrinkwrap) para manter a silhueta.
5. **uv**: desdobramento novo.
6. **assar** da fonte (Cycles, selecionado → ativo):
   - cor (sRGB), aspereza e metal;
   - **mapa de normais** (o detalhe fino da fonte vira relevo);
   - **emissão** das linhas neon, separada pela cor.
7. **lods**: LOD 1–3 por colapso, com simetria e UV preservadas (as mesmas texturas). Os pesos dos ossos são copiados do LOD 0.

A configuração muda por finalidade (`TIPOS`: quadrúpede, ave, humanoide, rígido). Não é a mesma regra para tudo.

**Antes → depois:**

| | antes (Meshy) | depois (LOD 0) |
|---|---|---|
| Lobo Sombra Neon | 127.298 tri, 0% quads, 410 cascas, 20.696 bordas abertas | **8.609 quads (100%, 17.218 tri)**, 1 casca, 0 bordas, 0 não manifold, 0 vértices sem osso; LODs 8.608 / 4.304 / 1.721 tri |
| Asa Noturna | 128.844 tri, 0% quads, 707 cascas, 26.762 bordas abertas | **7.910 quads (100%, 15.820 tri)**, 1 casca, 0 não manifold, 0 vértices sem osso; LODs 7.910 / 3.954 / 1.582 tri |

O LOD 0 das duas bases começou com 5,5 mil quads. Ele foi refeito mais denso (cerca de 8 mil quads) para segurar as pontas finas de pelo e pena na silhueta. Os LODs 1–3 mantêm o custo à distância.

Captura: `capturas_armaduras/12_topologia_inteligente_antes_depois.png`.

### 3.3 Lote controlado: rostos, armaduras e cabelos, peça a peça (`tools/blender/topologia/lote.py`)

A retopologia foi aplicada em lote às peças de personagem. O lote segue a regra pedida: nada é destrutivo, cada peça é validada sozinha e cada lote é controlado.

- **A fonte nunca é alterada.** Cada peça é lida, tratada e gravada em `assets/_retopo/<mesmo caminho>.glb`.
- **O jogo continua com as versões dele.** Uma peça só entra no jogo quando for trocada de propósito, depois de olhada.
- **Regra por tipo** (não é a mesma para tudo):
  - **rosto:** QuadriFlow com simetria, até 6.000 quads, e o assado da cor e do relevo da fonte;
  - **armadura:** peça rígida, QuadriFlow sem simetria forçada, e o assado;
  - **cabelo:** sem remalha, porque o QuadriFlow fundiria as mechas num bloco. A redução é **mecha a mecha**: cada casca solta reduz sozinha, com as bordas e a UV preservadas.
- **Validação de cada peça** (passa ou não passa):
  - o desvio de 95% da superfície até a fonte, em fração da diagonal da peça: no máximo 1,2% (rosto), 1,5% (armadura) ou 2,5% (cabelo);
  - nenhuma face degenerada, nenhum vértice solto e nenhuma aresta não manifold nova;
  - no máximo 12 mil triângulos.
- **Até 3 passadas por peça, sempre a partir da fonte:**
  - quando o QuadriFlow passa do orçamento, a peça é refeita menor;
  - quando uma armadura de muitas cascas desvia demais e ainda sobra orçamento, ela é refeita com mais quads;
  - no cabelo, quando as mechas pequenas param de reduzir antes do alvo, entram mais passadas de redução.

**Resultado** (o relatório completo está em `docs/topologia/LOTE.md`, e os dados em `assets/_retopo/lote.json`): **18 peças, 15 aprovadas.**

| grupo | peças | aprovadas | antes → depois | desvio de 95% |
|---|---|---|---|---|
| rostos da criação | 8 | **8** | 62–75 mil → 10,6–11,8 mil tri, 100% quads | 0,25–0,37% |
| armaduras do Kael (n1–n7) | 7 | **5** | 100–238 mil → 8,9–11,3 mil tri, 100% quads | 0,40–0,83% nas aprovadas |
| cabelos (6, 4 e 1) | 3 | **2** | 442 mil e 967 mil → 11,0 e 10,7 mil tri | 0,15% e 1,08% |

**As 3 reprovadas ficam de fora** (o jogo continua com as versões dele):
- `kael_n3` e `kael_n6` têm 590 e 450 cascas finas (fivelas, placas e tiras). Mesmo com 11 mil triângulos, o desvio de 95% fica em 1,53% e 1,67%, acima do limite de 1,5%.
- `cabelo_1` tem 1,4 milhão de triângulos em mechas muito finas. Reduzido a 12 mil, desvia 3,0%, acima do limite de 2,5%.

Os limites não foram afrouxados para essas peças passarem. Para elas, o caminho é um orçamento maior ou a remalha parte por parte.

Comparação visual (fonte e saída com a malha aparente, e a saída só com o assado): `tools/blender/topologia/comparar.py` → `capturas_armaduras/19_retopologia_em_lote.png`.

### 3.4 Rig ajustado à malha

- **Lobo neon:** o esqueleto de 31 ossos do lobo (`lobo.py`) foi levado às medidas desta malha:
  - focinho, as 4 patas (vértices mais baixos), a cernelha e a ponta da cauda;
  - a linha central do corpo e da cabeça, medida fatia por fatia;
  - o centro de cada perna em cada altura.
  
  Os pesos vêm do calor dos ossos no LOD 0, que achou solução para todos os ossos.
- **Asa Noturna:** esqueleto de ave medido na malha: coluna e pescoço pela linha central, asa em 4 segmentos pelo **bordo de ataque** (fatias de |x|) e pernas pelo centro dos pés.

## 4. Testes

`js/testes.js → criaturas()`. A suíte completa passa: **1134/1134**. O que é verificado:
- a carga dos 5 modelos;
- 31 ossos e 10 clipes;
- o modelo montado (PBR e quatérnios duplos);
- as variantes usando os modelos;
- carne, não máquina;
- a escolha do clipe em 9 estados;
- a pose muda de verdade entre os clipes;
- a mistura;
- uma malha por LOD;
- a morte longa;
- o desenho pelo motor 3D;
- os 4 LODs do lobo neon, decrescentes e dentro do orçamento;
- o lobo neon na Metrópole;
- a ave com 13 animações.

Também verifiquei no navegador, na isométrica e na 3ª pessoa: `capturas_armaduras/11_criaturas_no_jogo.png` e `13_asa_noturna_animacoes.png`.

## 5. Limites conhecidos (o que ainda não está feito)

- **Ainda faltam:**
  - **cavalos de verdade**: precisam de uma malha de cavalo; as montarias são lobos;
  - os **gatos são estilizados**: têm focinho curto e cabeça redonda, e a tosa alisa o corpo, mas as orelhas e a cara longa ainda lembram um gato-do-mato ou uma raposa. Um gato doméstico realista precisa de malha própria;
  - selas, roupinhas e outros acessórios além das coleiras.
- **Cães:**
  - o Cão da Aurora e o Cão das Neves são pelagens do lobo: cães de porte e focinho de lobo, do tipo husky ou cão-lobo;
  - o cão de colo e o buldogue (dois pelos, com tosa) dão as raças pequenas e de focinho curto, mas são estilizados: a textura ainda é a pintura de pelo do lobo, e a juba continua na cabeça.
  
  Um pug ou um buldogue realista precisa de malha e textura próprias.
- **Pets no bairro em renderização por software:** o bairro já é pesado nesse modo (cada quadro passa de 4 s no SwiftShader, por causa dos moradores com 50 mil triângulos). Numa placa de vídeo comum, isso não acontece.
- **Retopologia dos personagens: as saídas não foram trocadas no jogo.**
  - O lote (3.3) gerou e validou 18 peças: 8 rostos, as 7 armaduras do Kael e 3 cabelos. 15 delas foram aprovadas.
  - Para trocar uma peça no jogo, ela precisa passar de novo pelo conversor do criador ou do Kael, que cuida do atlas e dos pesos. Isso fica para quando cada peça for olhada.
  - As 104 armaduras com Draco não entraram no lote: o decodificador não está instalado.
  - Os outros cabelos e armaduras do relatório seguem a mesma regra e ainda não foram processados.
- **Loops de topologia:** o QuadriFlow alinha os quads à curvatura, mas não desenha à mão os anéis em volta de olhos, boca e articulações (como no rosto de referência). Para os humanoides, isso fica para uma etapa com guias por região.
- **Pontas finas de pelo e pena:** com o LOD 0 mais denso (17 mil triângulos no lobo e 16 mil na ave), a silhueta segura bem melhor as pontas. As mais finas, porém, ainda ficam um pouco mais arredondadas que na fonte, de 127 mil triângulos.
- **A Asa Noturna em `comer`** torce bastante o corpo.

## 6. Como refazer

```
python3 tools/blender/criaturas/lobo_neon.py        # retopologia + rig + animações → GLB + .blend
python3 tools/blender/criaturas/asa_noturna.py
python3 tools/blender/criaturas/lobo.py             # os 3 lobos procedurais
python3 tools/importar_criatura.py assets/Creatures/Enemies/lobo_sombra_neon/lobo_sombra_neon.glb   # → js/assets/criaturas/
python3 tools/topologia/diagnostico.py              # inventário e relatório (só leitura)
```
