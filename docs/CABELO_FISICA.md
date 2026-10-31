# Cabelo com física — Eclipse Zero

Cabelos em mechas feitos no Blender, com cadeias de ossos que o jogo move por física. Ficam ao lado dos oito cabelos do Meshy (que continuam com a mola antiga de um osso só), como as opções 9 a 18 do campo **Cabelo** da tela de criação (estilo Realista).

## Cortes

| Opção | Corte | Cadeias de ossos | Triângulos |
|---|---|---|---|
| Curto (mechas) | curto, penteado para trás | — (preso à cabeça) | ~3,8 mil |
| Médio (mechas) | na altura do queixo, risca no meio | 5 × 2 ossos | ~5,5 mil |
| Longo (mechas) | até o meio das costas, risca no meio | 7 × 6 ossos | ~13,8 mil |
| Espetado (mechas) | pontas para cima e para trás | — | ~3,7 mil |
| Ondulado (mechas) | ombros, com ondas | 5 cadeias | ~9,2 mil |
| Coque (mechas) | preso no alto da nuca | — | ~7 mil |
| Rabo de cavalo (mechas) | preso atrás, rabo pendurado | 1 × 6 ossos | ~8,4 mil |
| Tranças (mechas) | duas tranças atrás das orelhas | 2 cadeias | ~8,4 mil |
| Franja (mechas) | médio com franja na testa | franja + 5 cadeias | ~5 mil |
| Repicado (mechas) | três camadas de comprimentos diferentes | 7 cadeias | ~11,3 mil |

Os cortes servem nos dois corpos (masculino e feminino) com a mesma malha: a forma do corpo feminino vai numa shape key, como as armaduras. Trocar o cabelo não remonta o personagem.

## Como é feito (tools/blender/cabelos.py)

- **Cabeça medida:** a casca da cabeça e os tubos do tronco e dos braços de cada corpo (`tools/blender/moldes_corpo.json`, de `medir_corpos.py`).
- **Touca:** uma casca fina sobre o couro cabeludo, da linha do cabelo para cima (testa, têmporas, orelhas e nuca).
- **Mechas:** fitas grossas (seção em losango achatado) que nascem em pontos bem espalhados do couro cabeludo, seguem o fluxo do corte encostadas na cabeça (para trás, para os lados da risca, para a frente na franja, para cima no espetado, até o laço no rabo, no coque e nas tranças) e depois caem com o peso, desviando da cabeça, do pescoço, das costas e dos ombros. Cada corte tem duas ou três camadas, com comprimento e largura sorteados; o ondulado ganha ondas; as pontas afinam.
- **Presos:** no rabo, no coque e nas tranças as mechas do couro cabeludo vão até o laço; dali saem o rabo (mechas penduradas), as voltas do coque ou as tranças (três mechas que se cruzam, com laço e tufo na ponta).
- **Ossos e pesos:** cadeias `cab<k>_<j>` ao longo das partes soltas, presas à cabeça. Cada mecha pesa nas duas cadeias mais perto (pela volta da cabeça), e o trecho encostado na cabeça segue só o osso `head`. A transição da cabeça para a cadeia e de um osso para o outro é suave.
- **Textura:** feita no próprio script (numpy, 512 px): oito colunas de fios. Cada mecha tem a UV ao longo do comprimento, e os fios correm junto com ela. A cor é castanho neutro, porque o jogo tinge com a cor escolhida. A raiz é mais escura, as pontas mais claras e o relevo dos fios vai no mapa de normais.
- **Saídas** (`assets/Criar_Personagem/Cabelo_Fisica/`):
  - `<corte>.glb`: malha, shape key, texturas e pesos como atributos dos vértices (`_W0` a `_W3`).
  - `<corte>.json`: ossos, juntas das cadeias nos dois corpos e parâmetros da física.
  - `<corte>.png`: miniatura.
  - `cabelos_demo.blend`: a cena de demonstração.

Rodar: `python3 tools/blender/cabelos.py` (todos) ou `python3 tools/blender/cabelos.py longo rabo`. Depois: `python3 tools/importar_criacao.py --sem-corpos --so cabelo_longo cabelo_rabo`.

## Cena de demonstração no Blender

`cabelos_demo.blend` traz os dez cortes lado a lado, em cabeças de manequim. Cada um tem:

- a armadura com as cadeias e os grupos de vértices, para editar os pesos;
- uma animação de 96 quadros com a cabeça girando e balançando, e as cadeias seguindo pelo mesmo algoritmo do jogo, já gravado em quadros-chave.

## No jogo

**Conversor** (`tools/importar_criacao.py`, `processar_cabelo_fisica`):

- lê a malha, a forma do corpo feminino e os pesos;
- monta os ossos novos de cada cadeia, presos à cabeça, com as matrizes inversas calculadas a partir da do osso da cabeça de cada corpo;
- calcula esferas de colisão presas aos ossos: duas na cabeça, uma no pescoço, três no peito e nas costas e duas em cada ombro.

**Montagem** (`js/criacao/montagem.js`):

- antes de instanciar a pele do cabelo, os nós das cadeias entram no esqueleto como filhos da cabeça (e saem quando o cabelo muda);
- a pele do rosto recua para dentro da touca onde atravessaria. Os rostos maiores que a cabeça de referência apareciam por cima das mechas curtas. O recuo vai até 1 unidade, para não afundar a testa sob a franja.

**Física** (`js/criacao/cabelo_fisica.js`): o motor chama `m.depoisPose` depois de calcular as matrizes dos ossos e antes das peles (`R3D.poseAll`, usado na vista isométrica, na 3ª pessoa clássica e no renderizador realista). Cada junta anda por Verlet, com:

- **inércia:** a ponta fica para trás quando a cabeça se mexe (giro, passada, golpe, esquiva, pulo);
- **tranco ao levar dano;**
- **peso**;
- **vento do clima** (`Clima.vento()`, com rajadas; na tela de criação, uma brisa);
- **ar contra o movimento do corpo** (correndo, o cabelo vai para trás);
- **volta à pose** (rigidez) e **amortecimento**;
- **comprimento fixo** de cada osso e **ângulo máximo** em relação à pose;
- **colisão** com as esferas (as que já contêm a junta em repouso são ignoradas, para o cabelo não ficar flutuando);
- **chuva:** com a roupa molhada (`Clima.roupa`), o cabelo fica mais pesado, mais amortecido e menos levado pelo vento. A aparência molhada vem do shader de clima, que já escurece e dá brilho a tudo.

Cada osso então gira da direção de repouso para a simulada, e a malha segue pela pele.

Parâmetros por corte (`fisica` no JSON):

- `rigidez`: de 0,15 no rabo a 0,38 na franja;
- `amortecimento`;
- `peso`: as tranças, 1,2;
- `limite`: o ângulo máximo, em graus.

## Nível de detalhe e desempenho

- Com menos de 1 pixel por unidade (longe), o cabelo fica preso à cabeça, sem simulação. Com menos de 2,5 px, uma iteração por passo; de perto, três.
- O passo é de 1/60 s, com subpassos quando o quadro demora.
- O custo é pequeno: no máximo 7 cadeias de 7 juntas.
- Debaixo de elmo ou capuz o cabelo fica escondido e a física para.
- Se o modelo é desenhado em outra vista no mesmo quadro (o retrato do HUD, a 3ª pessoa), o estado vai junto com a cabeça, sem tranco.

## Limites (honestos)

- **Mechas, não fios:** o motor não tem transparência por recorte (alpha test) nem fios individuais. O visual é estilizado, de jogo.
- **A cabeça de referência é uma só** (o Rosto 1 encaixado). Em rostos muito maiores, a pele recua só até 1 unidade sob a touca.
- **Os oito cabelos do Meshy** continuam com a mola de um osso (`hair`).
- **No Blender**, a física da demonstração é a mesma do jogo, simplificada (sem vento nem colisão), gravada em quadros-chave. Não é uma simulação de partículas de cabelo do Blender.
