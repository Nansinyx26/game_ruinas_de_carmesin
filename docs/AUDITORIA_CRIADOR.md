# Criador de personagens e armaduras GLB — auditoria e o que mudou

Resposta aos pedidos "Aprimoramento completo do criador de personagens 3D" e "Implementação de todas
as armaduras GLB" (31/10/2026). A ordem pedida foi seguida: primeiro a auditoria e o encaixe (cabelo,
barba, roupas), depois os modelos novos. Estados: **feito** (funciona e tem teste ou captura),
**parcial**, **pendente**.

## 1. Como o criador funciona (o que já existia)

| Parte | Onde | O que faz |
|---|---|---|
| Tela | `js/criacao/tela.js` | Classe (as cinco), nome, aparência em categorias (Corpo, Rosto, Cabelo, Barba, Cores), equipamentos; modelo 3D girando, zoom em três planos (corpo, busto, rosto), poses (parado, guarda, vitória, correndo, golpe) |
| Montagem | `js/criacao/montagem.js` | Corpo, rosto, cabelo, barba e as nove vagas de armadura no esqueleto do Kael; um atlas de textura por personagem (2048 px: corpo e rosto em 1024, peças em 512, ombreiras/acessório/barba em 256); a pele recua para dentro das peças onde atravessaria |
| Conversor | `tools/importar_criacao.py` | GLB de origem → peça do jogo (reduz a malha, reassa as texturas, encaixa no corpo, transfere os pesos do esqueleto) |
| Salvamento | `js/criacao/dados.js` (Perfis) | Conta local com id, personagens com id único, versão, validação campo a campo e cópia de reserva |
| Mundo aberto | `PersonagemModelo` | O mesmo modelo montado aparece na vista isométrica, na 3ª pessoa e no retrato do HUD; as peças vestidas vêm do Arsenal |

## 2. Auditoria: o que foi encontrado e o que foi feito

| Item | Antes | Agora | Estado |
|---|---|---|---|
| Cor dos olhos (estilo Realista) | não existia: os olhos só vinham pintados na textura de cada rosto | o conversor acha a íris de cada rosto (cada pixel da região dos olhos volta para a posição na cabeça; a esclera dá a abertura e os pixels escuros o centro) e grava uma máscara; o jogo pinta a íris na cor escolhida, com a pupila e o brilho intactos. 12 cores (6 novas: mel, violeta, carmesim, gelo, dourados, esmeralda) | feito nos rostos em que a íris é achada (ver a seção 3) |
| Barba atravessando a pele | a barba não fazia o rosto recuar (só cabelo e armaduras) | a barba também cobre: o rosto recua até 0,35 unidade sob ela (mais que isso afundava a boca) | feito |
| Cor da barba | sempre a do cabelo | campo próprio "Cor da barba" (a do cabelo ou uma das 8) | feito |
| Estilos de barba e bigode | 5 barbas cheias do Meshy | + 9 feitas no Blender em mechas (`tools/blender/barbas.py`): por fazer, curta com bigode, média com bigode, cheia, longa, cavanhaque, contorno sem bigode, bigode e bigode guidão | feito |
| Barba flutuando ou fora da mandíbula | o encaixe por cobertura (feito para barbas cheias) esticava bigode e cavanhaque até a mandíbula inteira | as barbas do Blender vão direto para o espaço da cabeça e andam da pele medida para o rosto de referência pela diferença entre as duas superfícies (`molde_rosto.json`) | feito (as 5 do Meshy continuam no encaixe antigo) |
| Cabelos masculinos | 18 (8 do Meshy, 10 em mechas) | + 5 em mechas no Blender: raspado, militar, topete, undercut, moicano | feito |
| Peças novas de armadura | — | Mago 75 (6 GLB, com asas de cristal presas às costas), Patrulheiro 75 (5), Guardião Arcano 75 (7) | feito |
| Inventário das armaduras GLB | — | `tools/inventario_armaduras.py` → `docs/INVENTARIO_ARMADURAS_GLB.md` (cada GLB, triângulos, texturas, esqueleto, peça do jogo, orçamento da conversão) | feito |
| Estrutura para o online futuro | perfis locais | + pacote do personagem (`Perfis.pacote` / `Perfis.dePacote`): aparência, opções e peças vestidas num objeto versionado, validado na volta | feito (sem servidor, como pedido) |

## 3. Cor dos olhos por rosto

O detector depende da textura de cada rosto (os olhos ficam picados entre pedaços da UV). Conferido
em captura com olhos violeta (`.cache_criacao/smoke/ap_olhos_*.png`, regenerável):

| Rosto | Resultado | Cor dos olhos |
|---|---|---|
| 1, 2, 4 (masculinos), 5, 6 (femininos) | as duas íris achadas | aplicada |
| 3 | a esclera quase não aparece na textura (máscara de ~40 pixels) | não aplicada |
| 7 | só um olho sai inteiro | não aplicada |
| 8 | a máscara cai na pálpebra maquiada | não aplicada |

Os rostos sem íris ficam em `tools/criacao_iris.json` (com o motivo); a tela avisa quando o rosto
escolhido é um deles. Melhor sem cor que com a pálpebra pintada.

Testado e descartado: achar o centro pelo ponto mais para a frente (o ápice da córnea); nestes
rostos ele cai na sobrancelha ou na pálpebra.

## 4. Qualidade original das armaduras e desempenho (o limite real)

- **Os GLB de origem ficam intactos** no repositório (Git LFS): ~1,5 milhão de triângulos e texturas
  de 2048 a 4096 px cada. Nenhum arquivo enviado foi alterado; o conversor grava cópias para o jogo.
- **A versão do jogo** tem 5 a 8 mil triângulos por peça e a textura reassada (cor, material e
  normais) numa célula de 512 px do atlas do personagem (256 nas ombreiras e no acessório). Motivo:
  o motor do jogo (R3D, WebGL 1) faz a pele dos personagens na CPU, a cada quadro; nove peças de 1,5
  milhão de triângulos (13 milhões por personagem) e 22 MB por peça para baixar não rodam num
  navegador, e o GitHub Pages não serve os arquivos do LFS.
- **O que dá para subir sem trocar de motor** (pendente, decisão de custo): atlas de 4096 com as
  peças em 1024 px (4× a resolução de textura, ~100 MB de memória de vídeo por personagem, fora de
  alcance dos celulares mais fracos) e o orçamento de triângulos 1,5× nas peças prontas; um nível de
  detalhe menor na vista isométrica de longe. O modelo de alta continua sendo o da criação e da 3ª
  pessoa.

## 5. O que o pedido traz e ainda não existe

| Pedido | Estado | Por quê |
|---|---|---|
| Bigode como vaga separada da barba | parcial | as combinações vêm prontas (curta/média com bigode, cavanhaque, contorno sem bigode, bigode, guidão); uma vaga própria precisa de outra célula no atlas, que está cheio em 2048 |
| Barba acompanhando animações faciais | pendente | o esqueleto não tem ossos do rosto (sem boca ou mandíbula animadas); a barba segue a cabeça |
| Formato do rosto, nariz, boca, queixo, mandíbula por controle deslizante | pendente | os rostos são 8 malhas prontas; deformar exige alvos de forma (shape keys) nos rostos |
| Proporções do corpo além da altura | pendente | só corpo masculino/feminino e altura; as armaduras são encaixadas por corpo |
| Braçadeiras e cinto como vagas | pendente | o Arsenal tem 9 vagas (capacete, peitoral, 2 ombreiras, luvas, calças, botas, capa, acessório) |
| Física nas capas | existe | molas do rig do Kael (abas) |
| Raspado como cabelo | feito | cabelo raspado em mechas curtas |

## 6. Testes

- Suíte automática (`js/testes.js`): catálogo (23 cabelos, 14 barbas), opções da tela, cortes
  masculinos com física, olhos pintados num rosto montado, barba do Blender com cor própria e o
  topete montados, pacote do personagem indo e voltando, as peças de nível 75 das três classes.
- Capturas da tela de criação: os três conjuntos de nível 75 nos dois corpos; os 8 rostos com olhos
  violeta; as 9 barbas; os 5 cortes.
