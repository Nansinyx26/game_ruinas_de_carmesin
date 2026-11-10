# Fogo, água, animações dos personagens, ambiente e efeitos

Estado real desta etapa: o que entrou no jogo, como funciona, os testes e o que ainda falta. Tudo foi feito **sobre o que já existia**, sem trocar o motor, os modelos nem as poses dos personagens.

## O que já existia (análise antes de mexer)

- **Motor:** `js/engine3d.js` (WebGL 1). Na isométrica, cada modelo vira um sprite. Na 3ª pessoa, a cena é desenhada em perspectiva. Os efeitos 2D (partículas, auras, projéteis) são projetados pela câmera.
- **Animação:** poses procedurais por estado e por personagem (`js/models/*.js`), já com:
  - idle variado, corrida com inclinação, golpes com antecipação, golpe e recuperação;
  - esquiva, bloqueio, dano, pulo, queda e aterrissagem;
  - **pés presos ao chão** (IK das pernas) e **dedos**;
  - **molas** do casaco, capuz e cabelo;
  - **transição entre poses** (`R3D.misturar`) e o recuo do inimigo atingido.
- **Fogo:** não havia. As tochas, os lumes e a fogueira portátil eram brilhos (círculos de luz).
- **Água:** as ondas, o reflexo do céu, a transparência e a espuma da etapa anterior.
- **Partículas:** faíscas, brasas, poeira, fumaça, anéis, clarões, destroços; mais os raios e os rastros das armas.

## 1. Fogo (`js/fogo.js`)

- **Chamas:**
  - várias línguas por foco, com altura, largura e inclinação que mudam em várias frequências ao mesmo tempo, sem repetir;
  - núcleo **branco e amarelo**, passando a **laranja e vermelho** até sumir;
  - somadas à imagem, então clareiam o que está atrás;
  - pedacinhos de chama se soltam da ponta e somem subindo.
- **Vento:** as chamas, a fumaça e as brasas seguem a direção e a força do vento do clima, com rajadas.
- **Fumaça:** baforadas que nascem acima das chamas, crescem, sobem, derivam com o vento e se dissolvem.
- **Brasas:** partículas incandescentes que sobem e apagam.
- **Calor:** o ar acima das chamas maiores treme; são faixas da imagem deslocadas, nas três maiores da tela.
- **Luz dinâmica:**
  - **na isométrica**, cada foco abre luz no mapa de escuridão, tremulando;
  - **na 3ª pessoa**, cada foco é uma **luz pontual do motor** (até 4 por quadro, as mais perto da câmera). Ela ilumina personagens, chão e paredes e **brilha no metal, no vidro, no chão molhado e na água**.
- **Intensidades:**
  - **tocha**: nas luminárias de luz quente das paredes e nos braseiros;
  - **fogueira**: com lenha, nos lumes da floresta, do deserto e da cratera, e a Fogueira Portátil da alquimia;
  - **chamas**: as que se espalham, as poças de fogo dos inimigos e as fendas da cratera;
  - **incêndio**: várias chamas numa área, nas Ruínas Carmesins;
  - **chaminé**: só a fumaça, no forno e na forja.
- **Explosões** (`Fogo.explosao`):
  - bola de fogo que cresce e apaga, com línguas para fora;
  - clarão, **onda de choque** (anel de partículas e um anel que dobra a imagem como lente);
  - fumaça para os lados, faíscas, brasas e destroços;
  - a **luz forte** que decai;
  - **na água**, respingo e ondas;
  - **no capim e no mato seco** (floresta, deserto, sem chuva), o fogo **pega e se espalha** por algumas gerações, com limite de focos, e apaga sozinho;
  - os coletáveis no chão são empurrados.
- **Onde entram explosões:**
  - os perigos que detonam (inimigos que explodem, fragmentos do chefe);
  - a flecha explosiva da Lyra (energia roxa);
  - a Granada de Plasma e a Ruptura de Plasma do Kael (energia azul);
  - as máquinas destruídas (fogo e fumaça);
  - a derrota do NEXUS.
- **LOD:** longe da câmera, menos línguas, sem fumaça nem brasas. Há limite de focos (48) e de baforadas (160), e a Qualidade dos efeitos reduz tudo.

## 2. Água (`js/mundo/agua.js` + o programa de água do motor)

- **Água corrente:**
  - nos rios, o sentido do leito vai em cada vértice;
  - **as ondas e a espuma descem o rio**, com marolas da correnteza;
  - **a correnteza empurra** quem está no rio (mais forte nadando).
- **Ondulações circulares:**
  - quem anda ou nada na água deixa anéis, e os inimigos também;
  - entrar, cair ou ser atingido na água dá um **respingo** (gotas que sobem e caem, anel de espuma) e uma ondulação maior;
  - até 4 ondulações vão ao shader, que dobra a superfície e põe espuma na crista.
- **Chuva:** aneizinhos de pingos na superfície, no shader e na isométrica.
- **Agitada e tempestade:** as ondas crescem com o vento e a tempestade.
- **Rasa e profunda:**
  - a margem é transparente (o leito pintado no chão aparece);
  - o fundo é escuro e opaco;
  - o reflexo do céu é forte de lado (Fresnel).
- **Fogo e explosões refletem na água**, pelas luzes pontuais.
- **Cachoeira:** a estrutura das Ruínas de Velmora ganha névoa, gotas e ondulação constante na base.
- **Poças e chão molhado:**
  - as poças dos terrenos refletem o ambiente;
  - na chuva, o chão da 3ª pessoa **escurece e fica liso** e reflete mais as luzes.
- **Personagens molhados:** a roupa e a armadura molhadas no shader, que já existiam.

## 3. Personagens (`js/animacao.js`)

Uma **camada comum** somada **depois** da pose de cada modelo e **antes** da transição entre poses, nos ossos que todos têm com o mesmo nome. A coreografia de cada personagem continua a mesma:
- **Olhar:**
  - a cabeça vira para o alvo travado na mira, o inimigo acordado mais perto à frente ou quem conversa com ele;
  - os moradores olham o herói que chega perto ou conversa;
  - os inimigos olham o herói;
  - tem limite de giro e mola (sem tremer) e cede durante golpes, esquivas e especiais.
- **Fala:** enquanto o texto da conversa aparece (com a voz sintetizada), a cabeça acompanha as sílabas com acenos.
- **Peso:**
  - na arrancada o corpo vai para a frente;
  - na parada volta e passa um pouco antes de assentar (parada progressiva);
  - a inclinação parte dos pés; o tronco não é mexido, porque os braços saem dos ombros calculados com ele.
- **Personalidade:**
  - Drakos, soldado pesado: mexe pouco a cabeça e assenta devagar;
  - Lyra e Sera: mais vivas;
  - Orion: contido e atento.

Continuam valendo os sistemas que já existiam:
- transição entre poses (animation blending) e IK dos pés;
- dedos, molas de capa, casaco, capuz e cabelo;
- recuo nos golpes recebidos;
- golpes com antecipação, impacto e recuperação, e os combos.

## 4. Ambiente

- **Árvores, arbustos, plantas e estandartes ao vento:**
  - **na 3ª pessoa**, na placa de vídeo (vertex shader): o que é alto balança mais, com rajada e um tremor fino de folhas;
  - **na isométrica**, a imagem da árvore inclina a partir da base.
- **Fumaça** das chaminés do forno e da forja.
- **Luzes artificiais do chão** (neon, painéis, circuitos) com pequenas variações e falhas raras.
- **Superfícies molhadas** refletindo a luz (chão na chuva, poças, margens).
- **Poeira dos passos e folhas, pólen, cinzas e brasas no ar:** já existiam.

## 5. Efeitos das habilidades

- **Explosões de energia** (plasma, flecha explosiva, Ruptura, NEXUS): bola de energia, onda de choque que dobra a imagem e luz pontual que ilumina a cena.
- **Já existiam:** descargas elétricas, rastros nas armas, faíscas de impacto e anéis de onda de choque.
- **LOD das partículas:** longe do herói, metade ou menos é emitida.

## Testes

`fogoAguaAnimacao` (`js/testes.js`) confere:
- **fogo:**
  - as fogueiras da floresta com lenha e o braseiro aceso;
  - fumaça e brasas;
  - as luzes da isométrica e as luzes pontuais da 3ª pessoa;
  - a explosão que pega no capim e se espalha com limite, e a de energia que não queima o chão;
  - o calor e a onda de choque nas duas câmeras;
  - os incêndios das Ruínas Carmesins;
- **água:**
  - a correnteza do rio e o empurrão;
  - o respingo e as ondulações de quem nada;
  - o estado para o shader;
- **animação:** a cabeça do herói vira para o inimigo ao lado;
- **motor:** os programas da 3ª pessoa ligam com as luzes pontuais, o vento e as ondulações;
- **vento:** as árvores do kit marcadas para balançar.

## Limites (o que ainda não dá)

- **Animação facial (piscar, olhos, sincronização labial, expressões):** os modelos atuais não têm ossos nem formas no rosto. Os heróis são malhas do Meshy e Tripo com a cabeça num osso só, e o personagem criado usa o rosto inteiro como peça. Para isso, é preciso refazer o rig do rosto no Blender (mandíbula, pálpebras, olhos) e voltar as malhas com esses ossos. Hoje, a fala move a cabeça.
- **Física de pano de verdade (capas que colidem com o corpo):** as capas, os casacos e o cabelo usam molas por osso, que já existiam. Não há simulação de malha.
- **Incêndio em estruturas que se espalha pela construção:** o fogo se espalha no chão inflamável. Nos prédios, os incêndios são fixos.
- **Refração real da água** (o fundo distorcido pela onda): a água é transparente na margem, sem distorção do que está por baixo.
- **Cachoeira:** a névoa, as gotas e a ondulação ficam na base. A queda d'água do modelo continua sem animação de fluxo.
- **Instancing e animação na GPU:** o WebGL 1 do motor não tem desenho por instâncias. A pele dos personagens continua na CPU; o vento e as ondas vão na GPU.
