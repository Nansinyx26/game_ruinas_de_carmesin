# Eclipse Zero — relatório técnico: gráficos realistas e rig dos personagens

Fase 1 (auditoria, sem mudar nada) e Fase 2 (escolha da tecnologia) dos pedidos "Gráficos realistas de nova geração (AAA)" e "Rig dos personagens do mundo aberto". Tudo abaixo foi verificado no código do projeto (`main`, outubro de 2026), não presumido.

## 1. Como o jogo é feito hoje

| Parte | O que existe | Onde |
|---|---|---|
| Plataforma | HTML5 + JavaScript puro: 111 arquivos, ~51 mil linhas, 122 `<script>` clássicos no `index.html`; sem bundler, sem bibliotecas externas. Roda abrindo o `index.html` do disco (`file://`) e no GitHub Pages. | `index.html`, `js/` |
| Desenho 2D | Canvas 2D: mundo isométrico, HUD, efeitos, pós-processamento (vinheta, clarões, interferência). | `js/game.js`, `js/hud.js`, `js/effects.js` |
| Motor 3D | **R3D**, motor próprio em **WebGL 1** (~900 linhas). Na vista isométrica cada personagem/objeto é desenhado num atlas e colado no Canvas 2D como sprite ordenado por profundidade; na 3ª pessoa desenha a sala inteira em perspectiva e o resultado é composto no Canvas 2D. | `js/engine3d.js`, `js/terceira.js` |
| Iluminação e materiais | Uma luz-chave e um contraluz fixos por cena, difusa com "wrap", especular Blinn-Phong; textura de cor, mapa de material (metal, aspereza, relevo), mapa de normais (base pelas derivadas de tela), emissão; névoa na 3ª pessoa; clima no shader (molhado, neve, geada). | `R3D_FS_TEX` |
| O que **não** existe | Sombras projetadas (só a mancha escura no chão), iluminação global, reflexo do ambiente (IBL), oclusão ambiente em tempo real, HDR e tone mapping, pós-processamento 3D (bloom real, SSAO, profundidade de campo), várias luzes dinâmicas, terreno com relevo. | — |
| Pele (skinning) | Linear, até 4 ossos por vértice, calculada **na CPU** em JavaScript a cada quadro. | `R3D.skin` |
| Personagens | GLB do Meshy (1,5 milhão de triângulos e texturas 2K–4K na origem) reduzidos offline para 8–12 mil triângulos por peça, texturas 512–1024 num atlas de 2048, embutidos em base64 dentro de `.js` (138 MB em `js/assets`). O personagem criado completo tem ~80 mil triângulos. | `tools/importar_criacao.py`, `tools/importar_modelo.py` |
| Cenário | Salas em grade 2D com chão texturizado por código; na 3ª pessoa paredes e pilares viram caixas; 12 objetos do Blender com texturas assadas nas cidades. | `js/rooms.js`, `js/mundo/`, `tools/blender/` |
| Câmeras | Isométrica fixa com zoom; 3ª pessoa em perspectiva com colisão simples. | `js/game.js`, `js/terceira.js` |

## 2. Rig e animação hoje

- **Esqueleto:** 16 ossos (cabeça, tronco, quadril, braço/antebraço/mão ×2, coxa/canela/pé ×2, cabelo) e 12 ossos de capa (abas da frente, lados e costas). Não há coluna articulada (um osso só de tronco), clavículas, dedos, ossos de torção, ossos faciais nem IK.
- **Pesos:** automáticos — gaussiana sobre voxels rotulados por parte (`tools/escultor3d.py`, `pesos_pele`) no corpo e transferência por vizinhança para as peças de roupa (`transferir_pesos`). Sem pintura manual nem correção das juntas.
- **Animação:** poses procedurais em código para cada estado (parado, andar, correr, golpes, esquiva, dano, pulo…), transição suave entre poses (`R3D.misturar`), molas simples no cabelo e na capa. Não há clipes de animação (keyframes), captura de movimento, blendshapes faciais nem IK de pés.
- **Problemas que aparecem:** ombros e quadris amassam (tronco de um osso e pesos por distância), cotovelos e joelhos afinam ao dobrar (sem torção nem correção), mãos sem dedos, rosto parado.

## 3. Distância entre o pedido AAA e o que o projeto suporta

| Pedido | Hoje | O que impede |
|---|---|---|
| Malhas densas, anatomia realista | 8–12 mil triângulos por peça | Pele na CPU, uma thread: o personagem de 80 mil triângulos já custa. Precisa de pele na GPU. |
| Materiais PBR completos | Shader simplificado | Falta o modelo GGX, IBL e AO. |
| Sombras dinâmicas | Não existem | O caminho isométrico por sprites não tem mapa de sombras; precisa de cena 3D única. |
| GI, luz volumétrica, god rays | Não existem | WebGL 1 sem alvos de render flutuantes; aproximável com IBL, sondas de luz e neblina volumétrica em pós. |
| Texturas 2K/4K | 512–1024 no atlas | Tudo embutido em base64 no JS para abrir do disco: memória e download. Precisa de streaming (KTX2/Basis), o que exige servir por http. |
| Rig facial, dedos, IK | Esqueleto de 16 ossos | Os ossos não existem; os rostos do Meshy não têm blendshapes nem topologia para isso. |
| Mundo aberto realista (florestas, montanhas, água) | Salas 2D em grade | Não há terreno 3D com relevo nem vegetação instanciada. |

## 4. Tecnologias avaliadas (sem migrar nada)

| Opção | A favor | Contra | Veredito |
|---|---|---|---|
| **Unreal Engine 5** | O maior realismo (Nanite, Lumen, MetaHuman, Control Rig). | Não roda no navegador; reescrever as 51 mil linhas do jogo em C++/Blueprints; perde o GitHub Pages. | Não agora. |
| **Unity HDRP** | Realismo alto. | Reescrever em C#; o WebGL do Unity não suporta HDRP. | Não. |
| **Three.js** (WebGL 2 + WebGPU) | PBR físico, sombras em cascata, IBL, SSAO/GTAO, bloom, SMAA, tone mapping ACES/AgX, GLB com Draco e KTX2, pele na GPU, mixer de animações, morph targets (rosto), LOD, instancing. Lê direto os GLB do Blender e do Meshy. Continua no navegador. | Biblioteca externa (precisa da sua autorização); duas formas de desenhar convivendo durante a troca. | **Recomendado.** |
| Babylon.js | Recursos parecidos, inspetor bom. | Mais pesado; API mais distante do código atual. | Alternativa. |
| WebGPU puro | Controle total. | Refazer o que o Three.js já entrega. | Não. |
| Blender | Modelos, rig, pesos, shape keys e animações por script (já em uso em `tools/blender/`). | — | Ferramenta de produção. |

**Arquitetura recomendada:** manter a lógica do jogo (combate, mundo, inventário, criação, HUD, salvamento) e trocar só o desenho 3D por um novo renderizador em Three.js, começando pela 3ª pessoa, atrás de uma opção nas configurações. O R3D continua como modo leve (celular e computadores fracos) até o novo estar completo.

### Decisões que dependem de você

1. **Autorizar o Three.js** (arquivo copiado em `js/vendor/`, licença MIT). As regras do projeto pedem autorização para bibliotecas externas.
2. **Modo realista por http:** texturas 2K/4K e GLB carregados sob demanda funcionam no GitHub Pages ou num servidor local (`npx serve`), mas não abrindo o `index.html` do disco. O modo atual continua abrindo do disco.
3. **De onde vêm os assets realistas:** GLB prontos (como os cinco do Guerreiro nível 50 que você mandou), o Meshy (precisa da `MESHY_API_KEY` no ambiente) ou modelagem no Blender. Peças geradas por script no Blender ficam boas como base, mas não chegam ao nível dos modelos esculpidos.
4. **Git LFS** para os GLB (cada um tem 20–30 MB; a pasta `assets` já passa de 2 GB).

## 5. Riscos

- Dois renderizadores convivendo durante a troca (isométrico por sprites e 3ª pessoa nova).
- Desempenho em celular: o modo realista é para computador; perfis Baixo, Médio, Alto, Ultra e Cinematográfico.
- Tamanho do repositório e do download.
- O rig novo exige refazer as poses procedurais como clipes de animação (ou traduzir as poses para o esqueleto novo).

## 6. Plano incremental (cada etapa testada sem quebrar o que existe)

1. **Base:** Three.js no projeto e o modo Realista na 3ª pessoa: personagem criado em GLB com PBR, luz do sol com sombra, IBL do céu, tone mapping, SMAA. O modo atual continua o padrão e os testes atuais seguem passando.
2. **Mundo:** terreno com relevo por região, vegetação instanciada com vento no shader, água com reflexo, neblina volumétrica barata, dia e noite movendo o sol e o céu.
3. **Personagens:** esqueleto novo (seção 7), pele na GPU, clipes de animação em GLB com mistura, IK de pés no terreno, cabelo e capa com molas.
4. **Materiais e carga:** texturas 2K/4K em KTX2 com carregamento progressivo, LOD de três níveis, instancing.
5. **Pós-processamento:** SSAO/GTAO, bloom, profundidade de campo na câmera, os cinco perfis de qualidade.
6. **Vista isométrica:** a mesma cena com câmera ortográfica, no lugar dos sprites, depois de validada.

## 7. Rig novo (Blender → GLB)

- **Esqueleto humano (~65 ossos):** raiz, quadril, coluna ×3, pescoço ×2, cabeça, clavículas, braço e antebraço com ossos de torção, mãos com cinco dedos de três falanges, coxa e canela com torção, pé e dedos do pé, olhos ×2, mandíbula; cadeias para capa, cabelo, cinto e bolsas.
- **Pesos:** transferidos do corpo, suavizados e corrigidos nas juntas (ombro, cotovelo, quadril, joelho), com shape keys corretivas para cotovelo e joelho.
- **IK/FK:** controles no Blender (Rigify ou rig próprio) só para animar; no jogo vai o esqueleto deformante e os clipes; IK de dois ossos em JavaScript para pés no chão e mãos em objetos.
- **Rosto:** 52 blendshapes no padrão ARKit (piscar, olhar, sobrancelhas, boca, visemas para a fala). Exige rostos com topologia própria (os do Meshy precisam de retopologia).
- **Equipamentos:** todas as armaduras e cabelos presos ao mesmo esqueleto, trocados sem remontar o personagem, como já acontece hoje.

## 8. O que já foi feito sem trocar de tecnologia

- 3ª pessoa na resolução nativa da tela (antes ficava em 63% dela) e atlas isométrico que cresce em vez de borrar.
- Cenário das cidades com texturas assadas no Blender (cor com oclusão, metal/aspereza, normais, emissão).
- Armaduras dos níveis 50, 75 e 100: 120 peças geradas no Blender sobre o corpo medido, com a mesma malha nos corpos masculino e feminino. O Guerreiro nível 50 usa os cinco GLB realistas que você mandou (peitoral com ombreiras, calça com saiote de placas, capa com gola de pelo, botas e elmo).

## 9. O que não dá para fazer só com código

Personagens, rostos e cenários no nível dos jogos AAA vêm de escultura, escaneamento e captura de movimento. Dá para integrar esse material no jogo (conversores, rig, materiais, render), mas não para inventá-lo por script com a mesma qualidade. Com o Three.js e GLB realistas (seus, do Meshy ou de bancos de assets com licença), o salto visual é grande; sem assets novos, o ganho fica em luz, sombra e materiais.
