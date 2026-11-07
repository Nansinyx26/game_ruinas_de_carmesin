# Estruturas, Meshy, água, megacidades subterrâneas, mundo contínuo, câmeras e mira

Estado real do que foi feito nesta etapa: o que funciona e foi testado, e o que falta.

## 1. Estruturas enviadas e geradas no Meshy

**Fontes.** As 60 estruturas e 6 composições de plantas enviadas estão em `assets/estruturas_ambiente/` e `assets/Composição_de_Plantas/`. Elas têm de 28 mil a 1,9 milhão de triângulos, e 37 vêm com Draco.

As estruturas que faltavam nas duas folhas de referência foram geradas no Meshy, imagem para 3D. A folha medieval e a folha cyberpunk foram enviadas antes.
- **Medievais:** castelo, cais com barco, escadaria em ruínas, canhão, muro em ruínas, forno de pedra, banca de cerâmica, rochas e arco com braseiros.
- **Cyberpunk:** hotel neon, torre de antena, loja de armas, loja de tecnologia, oficina, estufa em cúpula, portão de setor, carro, moto, drone, ponto de ônibus, arco neon, máquina de venda, painel de anúncio e totem de informação.

**Geração no Meshy.**
- **Recortes de referência:** `assets/referencias/estruturas_meshy/`. A lista com nome, estilo e tipo fica em `tools/meshy/estruturas_faltantes.json`.
- **Script:** `tools/meshy/gerar_estruturas.py`, que usa o `meshy-cli` 0.4.0. Ele mostra a estimativa do CLI e o saldo, e só gasta com `--confirmar`, respeitando `--max-creditos`. Peça já baixada não é paga de novo.
- **Custo real:** 24 peças × 30 créditos = 720 créditos.
- **Registro das tarefas:** `tools/meshy/estruturas_geradas.json`. Cada GLB pode ser baixado de novo da conta pelo ID da tarefa.
- **A chave nunca entra no código nem no Git.** Nesta sessão o acesso foi pelo login do CLI pelo navegador (`meshy auth login --device`). O host `www.meshy.ai` foi liberado no ambiente para isso, e o Node precisa de `NODE_USE_ENV_PROXY=1` para passar pelo proxy.
- **Fontes guardadas:** os GLB do Meshy vêm com 18 a 230 MB. Ficam comprimidos com Draco (`tools/estruturas/comprimir_draco.mjs`, de 1,2 GB para 287 MB), no Git LFS.

**Redução para o jogo** (`tools/estruturas/processar.sh` → `tools/blender/cenario/estruturas.py`):
1. tira o Draco numa cópia;
2. reduz por colapso até o orçamento do tipo: 16 mil triângulos para estrutura, 6 mil para item, 9 mil para árvore e 6 mil para planta. A UV e as texturas da fonte continuam valendo;
3. mede o desvio da superfície e reprova a peça que passar do limite;
4. grava o LOD de longe e a prévia.

O relatório fica em `assets/models/estruturas/estruturas.json`. O resultado foi **82 aprovadas de 90**: todas as 24 do Meshy e 58 das 66 enviadas. Nos prédios, o desvio de 95% ficou abaixo de 0,3% da diagonal.

**Reprovadas:**
- **Composições de plantas (6 de 6):** a folhagem tem milhares de folhas soltas, e o colapso não passa de 10 a 70 mil triângulos.
- **`arvore_5` e `arvore_8`:** mesmo motivo.

Para essas peças falta outro caminho: desbastar as folhas, mantendo a cobertura, ou usar cartões e *impostores*. Elas não entram no jogo.

**No jogo** (`tools/importar_prop.py --grupo estruturas`):
- **Um arquivo por estrutura**, em `js/assets/estruturas/<id>.js`. A malha é indexada, cerca de 40% menor que um canto por vez. Mapas neutros são criados quando a fonte não traz normais ou metal/aspereza.
- **Índice leve:** `js/assets/estruturas/indice.js`, com nome, tipo, estilo e medidas.
- **Tamanho real** pela tabela `tools/estruturas/escalas.json`, em metros: a altura, ou o maior lado no chão para peças baixas e compridas. Os prédios altos ficam um pouco abaixo do real para caberem na vista isométrica.
- **Módulo `js/mundo/estruturas.js`:**
  - a lista de onde cada uma fica, por zona. As medievais vão para Velmora e as Ruínas Carmesins; as cyberpunk, para a Metrópole;
  - o colisor entra assim que a zona carrega;
  - o modelo é baixado só quando a zona pede;
  - na vista isométrica, uma foto de cada modelo, tirada uma vez;
  - na 3ª pessoa, o modelo entra na cena.

**Biblioteca de assets do Blender** (`tools/blender/cenario/biblioteca.py`):
- **Arquivo:** `assets/fontes/bibliotecas/eclipse_estruturas.blend`, com as 82 estruturas marcadas como *asset*, já no tamanho real.
- **Catálogos:** Eclipse Zero / Medieval ou Cyberpunk / Estruturas, Itens ou Árvores, em `blender_assets.cats.txt`.
- **Etiquetas e miniaturas:** estilo, tipo e enviada/meshy; a miniatura é a prévia renderizada.
- **Como usar:** em Preferências → Arquivos → Bibliotecas de Assets, acrescente a pasta `assets/fontes/bibliotecas`.

## 2. Painel do Meshy

`node tools/meshy/painel.mjs` abre um servidor só nesta máquina, em http://127.0.0.1:8787. Ele mostra:
- a fila das peças, com a referência e a prévia de cada uma;
- o estado: na fila, enviada, gerada, reduzida ou no jogo;
- o saldo e o custo estimado pelo CLI.

**Gerar:** só depois de digitar o total estimado para confirmar. Uma geração roda por vez, e o registro aparece ao vivo. **Peça nova:** pelo formulário (imagem, id, nome, estilo e tipo). A chave não passa pelo navegador: quem fala com o Meshy é o CLI, com a sessão dele.

**Limite do plano.** O plano atual do Meshy aceita cerca de 20 tarefas na fila ao mesmo tempo; acima disso ele recusa, sem cobrar. O script registra a recusa, e basta rodar de novo.

## 3. Rios e lagos com nado (`js/mundo/agua.js`)

- **Onde há água:** lagos (elipses) e rios (linhas com largura) em 12 zonas. Entre elas: o Lago Escuro, a clareira e a trilha de Velmora, a Lagoa Cristalina, o oásis de Seraph, o aqueduto e os jardins das Ruínas e a Arcologia Verde.
- **Margem rasa:** o herói anda mais devagar, até 70% da velocidade.
- **Fundo:** o herói **nada** a 55% da velocidade. Não golpeia, não pula, não defende nem usa poderes; a esquiva vira braçada e a arma fica guardada. O corpo afunda até o peito nas duas câmeras.
- **Inimigos** param na margem.
- **Nada nasce dentro d'água:** árvores, pedras, moradores, objetos de cenário e estruturas ficam fora.
- **Forma:** o lago não é mais uma elipse lisa; a margem tem reentrâncias (a borda varia com o ângulo, por uma semente de cada lago). O rio muda de largura ao longo do curso.
- **Na isométrica:** areia molhada em volta, seis faixas de profundidade (da margem rasa ao fundo escuro), linhas de onda que andam, brilhos do sol e espuma tracejada e animada na margem. Quem nada fica coberto até o peito e solta anéis na água.
- **Na 3ª pessoa** (programa de água do motor, `js/engine3d.js`, ativado por `o.agua`):
  - a malha vem em anéis (lagos) ou faixas (rios), com a cor pela profundidade em cada vértice e a margem marcada;
  - os vértices sobem e descem com as ondas;
  - no fragmento, a normal sai de cinco ondas somadas, em direções e tamanhos diferentes, andando no tempo;
  - Fresnel: de lado a água reflete o céu, de cima mostra a cor do fundo;
  - brilho do sol (especular estreito) e espuma que respira na margem;
  - a névoa da cena por cima.
- **Limite:** a água é opaca. Não há refração do chão por baixo nem reflexo dos objetos da cena (só do céu).

## 4. Megacidades subterrâneas

**Onde:** a Metrópole Tecnológica e a cidade de Nexus (Portão, Avenida e Mercado).

**Ficam sob o teto de uma caverna:**
- **Luz:** não segue o sol; a escuridão é a mesma ao meio-dia e à meia-noite.
- **Clima:** não chove; a neblina vira o vapor dos dutos.
- **Teto:** luzes neon, nas duas câmeras.
- **Cidade:** as estruturas cyberpunk (prédios, lojas, bar, hotel, clínica, monotrilho, viaduto, estufa, antena).

## 5. Mundo contínuo

**Travessia pelas bordas:** no campo aberto, sair pela borda leva à zona vizinha **sem tela preta**. O herói chega pela borda oposta, no mesmo ponto e no mesmo passo, e a imagem anterior se dissolve por cima em 0,28 s.

***Streaming*:** perto de uma borda (320 unidades), a zona vizinha já começa a carregar os modelos dela.

**Continuam com o escurecer:** portais e passagens das cidades, que são teletransporte e portas.

**Mapas extensos, sem parede na borda.** As zonas do campo aberto ficaram maiores: 46 a 50 ladrilhos de lado (eram 20 ou 21, ou seja, cerca de cinco vezes a área), com mais acampamentos espalhados. O anel denso de árvores e rochas agora só fecha os lados **sem zona vizinha**. Para o lado que continua, o terreno segue aberto até a borda, com poucas árvores soltas, e a travessia leva à vizinha. O chão ganhou mais manchas, proporcionais à área.

**Limite:** o motor ainda trabalha com uma zona por vez. A zona vizinha não aparece desenhada além da borda antes de cruzar; isso exige desenhar as vizinhas juntas, em blocos (*chunks*), e é a próxima etapa.

### Metrópole: cidade segura

As 9 zonas da Metrópole Tecnológica (`seguro: true` em `js/mundo/regioes.js`) não têm acampamentos, chefe na rua nem eventos com inimigos (`js/mundo/eventos.js`). O letreiro diz **CIDADE SEGURA** em vez do nível recomendado. O chefe da região, o **Supervisor Ômega**, fica no **Cofre Ômega**, a masmorra da Metrópole, e vencê-lo conta como o chefe regional (`js/mundo/locais.js`).

### Cidades com os assets do Meshy

As listas de `js/mundo/estruturas.js` (`ZONAS`) foram refeitas:
- **Refúgio da Aurora:** a praça do mercado ganhou a Fonte do Guardião, bancas, forno de pedra, carroças, estandartes, lampiões, poços e o canhão. Os prédios que já existiam continuam.
- **Praça Central da Metrópole:** loja de armas, loja de tecnologia, hotel neon, ponto de ônibus, máquinas de venda, carro e moto estacionados, totens de informação, painel de anúncio, arco neon e drone.
- **Mercado Neon:** bar, hotel, loja de armas, café, máquina de venda, painel, totem e moto.
- **Cidade de Nexus:** portão de setor na chegada, arco neon, prédios, carro, ponto de ônibus, café e loja de tecnologia.

### Moradores gerados no Meshy

Seis moradores foram gerados por texto no Meshy, em A-pose, a 30 créditos cada (`tools/meshy/gerar_npcs.py`, lista em `tools/meshy/npcs.json`):
- **medievais:** ferreiro, camponesa e guarda;
- **cyberpunk:** hacker, operário e comerciante.

A conversão passa cada um pelo **rig automático** do jogo, o mesmo dos corpos da criação (`tools/importar_criacao.py --so npc_ferreiro`). A fonte com Draco é descomprimida numa cópia antes.

**No jogo, os seis** (`js/mundo/npc3d.js`), com nome, rotina e fala dos moradores:
- o ferreiro, no Bairro da Muralha;
- a camponesa e o guarda, na praça do Refúgio da Aurora;
- o hacker e o operário, na Praça Central da Metrópole;
- o comerciante, no Mercado Neon.

**Braços abertos.** A camponesa e o guarda vieram do Meshy com os braços quase em T, mesmo pedindo A-pose, e o rig automático deformava as mãos. A conversão agora baixa os braços antes do rig (`abaixar_bracos` em `tools/importar_criacao.py`, ligado por `"abaixar_bracos": true` em `tools/meshy/npcs.json`):
- mede a largura do tronco logo abaixo da axila e acha o ombro de cada lado;
- gira o braço em volta do ombro até a direção média dele ficar a 48° abaixo da horizontal;
- a rotação entra aos poucos no ombro, sem rasgar a malha, e não toca o tronco, a cabeça nem as pernas;
- as normais giram junto; a UV e as texturas não mudam.

Sem gastar créditos. Os cotovelos continuam dobrados como no modelo original.

## 6. Câmeras

- **Padrão:** a 3D (3ª pessoa) quando o motor 3D está ativo; a isométrica continua como opção (V). Quem já tinha escolhido uma câmera continua com ela.
- **Movimento** (opção no menu de pausa): **relativo à câmera** (padrão) ou **relativo ao mundo**, em que o W anda sempre para o norte do mapa, como na isométrica, com a câmera em qualquer giro.

## 7. Combate: mira travada

O *buffer* de entrada, os combos por personagem, o lançamento, o malabarismo no ar, o golpe aéreo e o mergulho já existiam. A mira travada é nova (`js/heroes/mira.js`):
- **Comandos:** X ou o botão do meio do mouse (no controle, R3). A troca de arma foi para Q (no controle, LB + R3).
- **Travar:** trava no inimigo mais perto da frente; apertar de novo passa para o próximo; segurar solta.
- **Com a mira travada:** cada golpe começa virado para o alvo, o herói parado olha para ele e a câmera 3D enquadra o alvo.
- **Marcador** sobre o alvo nas duas câmeras.
- **Solta sozinha** quando o alvo morre ou se afasta; o próximo perto assume.

## Testes

Testes novos na suíte do jogo (`js/testes.js`):
- `cameras`
- `mira`
- `estruturasMundo`
- `agua`
- `megacidades`
- `mundoContinuo`
- `criacaoEncaixe` (encaixe das armaduras, da etapa anterior)
- `criacaoAncoras` (peitoral no peito, em quatro poses)
- `metropoleSegura`
- `moradoresMeshy`
