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
- **Necessidades:** fome (sobe com o tempo de jogo), humor (cai com fome, sobe ao brincar) e afinidade (sobe ao alimentar, brincar e fazer carinho). Aparecem no **HUD**, embaixo da temperatura, e no texto do menu.
- **Salvamento:** `World.state.pets`, no mundo de cada personagem.
- **Testes:** `js/testes.js → pets()` (veja a seção 4).

## 1c. Animais domésticos das cidades (`js/mundo/animais_cidade.js`)

Cada cidade tem os seus animais, pela cultura e pelo clima. Não são todas as espécies em todo lugar:

| cidade | animais | comportamento |
|---|---|---|
| Refúgio da Aurora (praça e Bairro da Muralha) | cães de rua (Cão da Aurora) | vagam, farejam o herói, sentam, dormem à noite; **podem ser adotados** |
| Clareira dos Sinais (Velmora) | cães de caça cinzentos dos caçadores | ficam perto do posto do caçador |
| Acampamento e Fortaleza de Asterion | cães das neves (trenós da Vigília) | o mesmo dos cães |
| Praça Central da Metrópole | Asas Noturnas nos telhados | pousadas; levantam voo quando o herói chega perto ou começa uma luta |

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
| Lobo Sombra Neon | 127.298 tri, 0% quads, 410 cascas, 20.696 bordas abertas | **5.528 quads (100%)**, 1 casca, 0 bordas, 0 não manifold, 0 vértices sem osso |
| Asa Noturna | 128.844 tri, 0% quads, 707 cascas, 26.762 bordas abertas | **5.611 quads (100%)**, 1 casca, 0 não manifold, 0 vértices sem osso |

Captura: `capturas_armaduras/12_topologia_inteligente_antes_depois.png`.

### 3.3 Rig ajustado à malha

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
  - **gatos, galinhas, patos, gansos, cabras, ovelhas, cavalos e as aves pequenas**: cada espécie tem anatomia própria e precisa de malha, rig e animações. Com um GLB de origem (por exemplo do Meshy), o mesmo processo do lobo faz retopologia, rig e animações em poucos minutos; sem malha de origem, cada uma é modelada do zero;
  - as **montarias**: o cavalo, a sela, o herói montado (animação e câmera);
  - as **coleiras e acessórios** (peças 3D por espécie).
- **Os cães são pelagens do lobo:** saem como cães de porte e focinho de lobo (do tipo husky ou cão-lobo). Raças pequenas e de focinho curto precisam de malha própria.
- **Pets no bairro em renderização por software:** o bairro já é pesado nesse modo (cada quadro passa de 4 s no SwiftShader, por causa dos moradores com 50 mil triângulos). Numa placa de vídeo comum, isso não acontece.
- **Retopologia aplicada só às duas criaturas do Meshy.** Armaduras, cabelos, rostos e personagens estão no relatório com a recomendação, mas não foram alterados. Cada um exige validação individual (troca de equipamento, pesos existentes), e mexer em massa iria contra a regra de não fazer alterações destrutivas em lote.
- **Loops de topologia:** o QuadriFlow alinha os quads à curvatura, mas não desenha à mão os anéis em volta de olhos, boca e articulações (como no rosto de referência). Para os humanoides, isso fica para uma etapa com guias por região.
- Mesmo com 11 mil triângulos, as pontas finas de pelo e pena ficam mais arredondadas que na fonte. A textura e o mapa de normais compensam só em parte.
- **A Asa Noturna em `comer`** torce bastante o corpo.

## 6. Como refazer

```
python3 tools/blender/criaturas/lobo_neon.py        # retopologia + rig + animações → GLB + .blend
python3 tools/blender/criaturas/asa_noturna.py
python3 tools/blender/criaturas/lobo.py             # os 3 lobos procedurais
python3 tools/importar_criatura.py assets/Creatures/Enemies/lobo_sombra_neon/lobo_sombra_neon.glb   # → js/assets/criaturas/
python3 tools/topologia/diagnostico.py              # inventário e relatório (só leitura)
```
