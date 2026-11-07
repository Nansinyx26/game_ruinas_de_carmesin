# Pisos e terrenos por região

O chão de cada sala do jogo é um **atlas próprio**: cidades, regiões abertas, túneis, masmorras, interiores e as salas da campanha. Ele é pintado ao carregar a zona a partir de uma biblioteca de materiais gerados por código. Não há imagens baixadas nem bibliotecas novas.

O código fica em `js/terreno.js` (módulo `Terreno`). As mudanças no motor estão em `js/engine3d.js`.

## Como era

**Na 3ª pessoa**, só o campo aberto tinha textura, uma por bioma (`js/texturas.js`). Cidades, Metrópole, Nexus, túneis, catedrais, laboratórios e interiores usavam **placas de cor lisa**.

**Na isométrica** era a mesma coisa:
- os biomas tinham um padrão repetido;
- o resto eram placas com variação de cor;
- a praça e as ruas da Aurora e do Bairro eram anéis e quadrados semitransparentes por cima.

## Materiais (30)

Cada material é uma textura que se repete sem emenda. Ela traz:
- **cor**, com a oclusão das frestas já embutida;
- um **mapa de material**: metal (R), aspereza (G) e relevo/altura (B);
- **emissão**, nos que brilham.

O lado é de 256 px, ou 512 nos que têm linhas finas. Cada material é gerado **uma vez por sessão** (de 25 a 280 ms).

| Grupo | Materiais |
|---|---|
| Natureza | grama (tons e capim seco, fios, florzinhas), terra batida (seixos, fissuras), folhiço e musgo, rocha (estratos, líquen, fendas), areia (ondulações, grãos), deserto rachado, solo contaminado (poças tóxicas acesas), neve, gelo, basalto com lava (frestas acesas), cinza vulcânica (brasas), destroços tecnológicos, lama, leito de lago, cascalho |
| Cidade medieval e interiores | paralelepípedo, lajes de pedra (com rachaduras), assoalho de madeira (pregos), mármore da catedral |
| Cidade futurista | asfalto (agregado, remendos, rachaduras), concreto tecnológico (painéis, frisos, parafusos), calçada modular (mato nas juntas), chapa de metal industrial (relevo em losango, ferrugem), grade de metal, plataforma com neon, vidro reforçado (luz por baixo), circuito luminoso, pedra carmim em ruínas, cristal do Nulo (veios acesos), azulejo do laboratório |

A folha com todos fica em `docs/terrenos_materiais.png`.

## Receitas por região

**Nenhuma região usa uma textura só.** Cada tema, e algumas zonas, combina materiais por **máscaras**:
- **manchas de ruído** com a borda irregular e suave, que fazem a transição natural entre terrenos;
- **ruas, calçadas, praças, trilhas, trilhos e canaletas.**

Cada camada sorteia giro, escala e deslocamento. O material da base entra duas vezes, com giro e escala diferentes, misturado por manchas grandes. Por cima vêm:
- **variação** de luz e de tom em grande escala;
- **sujeira**, manchas e óleo;
- **rachaduras**, escuras e com o relevo baixo;
- **poças** lisas, que refletem o ambiente;
- **marcas de pneu** e de **passos**: o caminho mais usado fica mais claro e mais liso;
- **faixas pintadas** e **faixas de pedestre**;
- **setas holográficas** e **painéis de luz** embutidos;
- a **luz dos postes e tochas** no chão;
- as **sombras de contato** no pé das árvores, rochas, pilares, estruturas e paredes.

| Região | Combinação |
|---|---|
| Floresta de Velmora | grama + terra + folhiço + rocha; folhiço no pé das árvores; trilhas de terra até as passagens |
| Deserto de Seraph | areia + deserto rachado + rocha + destroços (a região do Faraó de Sucata) |
| Montanhas de Asterion | neve + gelo + rocha exposta; trilha de terra sob a neve |
| Lagoa Cristalina | grama + lama + folhiço + cascalho; **leito do lago e margem molhada** sob a água |
| Cratera de Obsidiano | basalto com lava + cinza + solo contaminado + destroços + rocha |
| Refúgio da Aurora | lajes; ruas de paralelepípedo até os portões; a praça em anéis alternados com o mármore no centro; terra e mato junto dos muros |
| Bairro da Muralha | terra e grama; calçada de lajes diante das fachadas; a praça do poço e as ruas de paralelepípedo |
| Metrópole e Nexus | cada zona tem o seu chão (abaixo) |
| Ruínas de Carmesin (ruas da campanha) | concreto + calçada; a avenida de asfalto rachada, entulho e poças |
| Túneis e galerias | concreto; passarela central de grade; canaletas de água dos dois lados; faixas âmbar acesas; tubulações nas paredes |
| Laboratórios | azulejo; chapas de metal sob as máquinas; faixa de segurança; luz de emergência vermelha nas bordas |
| Torres | plataforma com neon; raios de circuito a partir do centro; disco de vidro com anel aceso |
| Catedrais | mármore em xadrez; a nave de lajes gasta no meio; entulho |
| Refúgios | concreto, terra e estrados de madeira |
| Ruínas Carmesins (região) | pedra carmim com brasas nas frestas, destroços, cinza e asfalto quebrado |
| Nexus Zero | cristal do Nulo com veios violeta, circuitos ciano em grade, vidro |
| Masmorras, pelo nome da zona | **caverna** (grutas e ecos): rocha, cascalho, terra e lama; **cripta** (catacumbas, tumbas, criptas): lajes gastas e terra; **raízes**: terra, folhiço e rocha; **forja** (Primeiro Fogo): basalto, metal e cinza |
| Interiores | assoalho com tapete (taverna, hospedaria) ou lajes (conselho, quartel) |

### As cidades subterrâneas

As zonas da Metrópole e de Nexus ficam em `ZONAS_TEC`:
- **Praça Central:** concreto e calçada; a avenida em frente às lojas; a praça circular de plataforma com o anel magenta.
- **Mercado Neon:** calçada e concreto; painéis de vidro com a luz por baixo no corredor do mercado.
- **Distrito Industrial:** chapas de metal com ferrugem, grade e concreto; trilho de carga; faixas zebradas; tubulações.
- **Trilhos:** dois trilhos no leito de cascalho, com faixas de segurança.
- **Porto:** concreto molhado, cais de metal e canaletas de água.
- **Torres:** plataforma, vidro e circuito.
- **Subnível:** concreto, grade, lama, canaletas, destroços e poças tóxicas.
- **Arcologia Verde:** grama, folhiço e calçada, com a praça de plataforma.
- **Nexus (Portão, Avenida, Mercado):** os mesmos elementos, com magenta e âmbar.

As ruas do gerador (`ruas()`) trazem:
- asfalto e calçadas, com o **meio-fio**;
- as **canaletas** na beira, com grade e relevo fundo;
- o **circuito aceso** na borda da calçada;
- a faixa central tracejada, as **setas holográficas** de cada sentido e as **faixas de pedestre** depois dos cruzamentos;
- marcas de pneu, manchas de óleo, **painéis de luz** alternando as duas cores e poças na pista.

Nas zonas com paredes, **passarelas elevadas** correm ao longo das paredes do fundo, com guarda-corpo, pilares e a faixa de luz por baixo.

## No jogo

### 3ª pessoa

O piso usa o programa com textura do motor. Ele recebe:
- **cor**;
- **material**: metal, aspereza e relevo pelo mapa de altura;
- **emissão**: um canal novo no shader, `uEmiT`, com o neon, a lava, as brasas e os painéis;
- **detalhe de perto**: um canal novo, `uDet`/`uDetP`.

O detalhe de perto é uma textura de relevo de 256 px **repetida pela posição no mundo**. Ela soma a normal e a micro-oclusão e tem **parallax**: o que é alto anda com o olhar. O detalhe some entre ~270 e 760 unidades da câmera, o que evita cintilar ao longe. Há nove famílias: solo, grama, areia, neve, pedra, concreto, metal, madeira e vidro.

O chão tem também **reflexo controlado do ambiente** (céu ou teto da caverna) no que é liso: vidro, metal polido, poças, gelo e margens molhadas. O reflexo é mais forte de lado (Fresnel).

A **geometria de detalhe** fica em `Terreno.geometria`:
- meio-fio, trilhos com dormentes, molduras das canaletas e os anéis de luz das praças;
- **tubulações** e **passarelas**, como filhas da parede, que somem junto com ela quando a câmera passa.

### Isométrica

O mesmo atlas entra na imagem pré-renderizada da sala, com o **relevo sombreado** (luz de cima da tela) e a emissão. No campo aberto, os detalhes soltos do bioma continuam por cima, mais espaçados. A praça e as ruas antigas da Aurora e do Bairro não são mais desenhadas por cima, porque já estão no chão.

## Desempenho

- **Materiais:** gerados uma vez por sessão. A zona vizinha já tem os materiais preparados no tempo livre (`Terreno.aquecer`), quando o herói chega perto da borda.
- **Atlas da sala:** 2048 px de cor, mais 1024 px de material e de emissão, com mipmaps. Na qualidade média, 1024/512. É composto pelo canvas (GPU), não pixel a pixel. Nos testes, a montagem leva **de 0,2 a 1 s** por zona, só ao carregar, nunca a cada quadro.
- **Piso:** 72 triângulos.
- **Geometria de detalhe:** caixas e cilindros simples, com poucas centenas de triângulos.
- **Qualidade baixa:** o chão volta às placas de cor de antes.

## Testes

- `terrenos` (`js/testes.js`), em 22 zonas, uma por receita:
  - cada zona combina 3 ou mais materiais, e as combinações são diferentes entre as regiões;
  - emissão nas cidades de neon e na lava;
  - detalhe de perto em todas;
  - o leito sob a água da lagoa;
  - a geometria: meio-fio, trilhos, canaletas, tubos e passarelas;
  - na 3ª pessoa, o piso com os quatro canais e as passarelas presas às paredes; os programas do motor ligam com os uniforms novos;
  - o tempo de montagem fica medido.
- O teste da qualidade baixa, que já existia, continua passando: sem textura, as placas de antes.

## Limites

- **Instancing:** o WebGL 1 do motor não tem desenho por instâncias. Os elementos repetidos são pintados no atlas ou vão numa malha só.
- **Relevo:** displacement de verdade (malha deformada) não entrou. O relevo é por mapa de altura, detalhe e parallax; o chão continua plano para a colisão e os passos.
- **Compressão de textura:** sem compressão em GPU (KTX/Basis), que exigiria uma biblioteca nova. Os atlas são gerados no aparelho, em tamanhos potência de 2, com mipmaps.
