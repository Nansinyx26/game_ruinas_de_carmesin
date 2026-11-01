# Criaturas do Blender e Topologia Inteligente

Estado real em 01/11/2026. Este documento lista o que foi feito e verificado, e também o que ainda não foi feito.

## 1. O que está no jogo

| criatura | uso no jogo | origem da malha | LOD 0 → 3 (triângulos) | ossos | animações | GLB / .blend |
|---|---|---|---|---|---|---|
| **Lobo Sombra Neon** | inimigo `lobo_neon` na **Metrópole Tecnológica** (traços matilha e teleporta) | GLB do Meshy enviado (127.298 tri), com **retopologia, rig e animações no Blender** | 11.056 → 5.528 → 2.764 → 1.104 | 31 | 10 | `assets/Creatures/Enemies/lobo_sombra_neon/` |
| **Asa Noturna** (Azure Nightwing) | ave exótica rara: modelo pronto para o **pet de companhia** (o sistema de pets é a próxima etapa) | GLB do Meshy enviado (128.844 tri), com **retopologia, rig de ave e animações no Blender** | 11.222 → 5.610 → 2.804 → 1.122 | 26 | 13 | `assets/Creatures/Pets/Exotic/asa_noturna/` |
| Lobo de Raiz | inimigo `lobo_raiz` em **Velmora** | modelado no Blender por script (`lobo.py`) | 7.856 | 31 | 10 | `assets/Creatures/Enemies/lobo_raiz/` |
| Lobo das Neves | inimigo `lobo_neve` em **Asterion** | modelado no Blender por script (`lobo.py`) | 7.856 | 31 | 10 | `assets/Creatures/Enemies/lobo_neve/` |
| Lobo Cinzento | fauna (pronto, ainda sem comportamento de fauna) | modelado no Blender por script (`lobo.py`) | 7.856 | 31 | 10 | `assets/Creatures/Wildlife/Mammals/lobo_cinzento/` |

Cada pasta tem o `.glb` final (texturas embutidas, armadura, animações com nome), o `.blend` editável (no Git LFS) e uma prévia `.png`. As criaturas do Meshy também têm o relatório `*_topologia.json` (antes e depois) e a fonte original intacta em `fonte/` (Git LFS).

**Animações:**
- Lobos: `idle`, `andar`, `trotar`, `correr`, `atacar` (bote com mordida), `saltar` (investida), `dano`, `atordoado`, `morte`, `uivar`.
- Asa Noturna: `idle` (pousada, asas meio dobradas), `andar` (saltita), `voar`, `planar`, `decolar`, `pousar`, `comer`, `dormir`, `sentar`, `brincar`, `carinho`, `chamar` (comando) e `dano`.

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

- **Sistema de pets, animais das cidades e montarias:** ainda não implementado. A Asa Noturna já está pronta como modelo, mas não há loja, adoção nem companheiro seguindo o herói. É a próxima etapa.
- **Retopologia aplicada só às duas criaturas do Meshy.** Armaduras, cabelos, rostos e personagens estão no relatório com a recomendação, mas não foram alterados. Cada um exige validação individual (troca de equipamento, pesos existentes), e mexer em massa iria contra a regra de não fazer alterações destrutivas em lote.
- **Loops de topologia:** o QuadriFlow alinha os quads à curvatura, mas não desenha à mão os anéis em volta de olhos, boca e articulações (como no rosto de referência). Para os humanoides, isso fica para uma etapa com guias por região.
- Mesmo com 11 mil triângulos, as pontas finas de pelo e pena ficam mais arredondadas que na fonte. A textura e o mapa de normais compensam só em parte.
- **A boca do lobo neon é fechada na malha:** a mandíbula estica a pele em vez de abrir.
- **Os lobos procedurais** (`lobo.py`) têm qualidade inferior à malha do Meshy (corpo em tubos, garras um pouco soltas sob as patas).
- **A Asa Noturna em `comer`** torce bastante o corpo.

## 6. Como refazer

```
python3 tools/blender/criaturas/lobo_neon.py        # retopologia + rig + animações → GLB + .blend
python3 tools/blender/criaturas/asa_noturna.py
python3 tools/blender/criaturas/lobo.py             # os 3 lobos procedurais
python3 tools/importar_criatura.py assets/Creatures/Enemies/lobo_sombra_neon/lobo_sombra_neon.glb   # → js/assets/criaturas/
python3 tools/topologia/diagnostico.py              # inventário e relatório (só leitura)
```
