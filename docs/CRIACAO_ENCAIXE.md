# Criação de personagem: padrão de encaixe das peças e *pipeline* dos assets do Meshy

## O defeito do peitoral inicial e a correção

**Sintoma:** a couraça inicial (`ini_armadura`, a "Couraça do Iniciado" do Guerreiro e do Guardião Arcano) ficava na região da barriga. As placas apareciam no abdome e no quadril, e no peito só aparecia a roupa de baixo.

**Causa:** o conversor (`tools/importar_criacao.py`) encaixava os peitorais vindos de GLB **esticando a caixa da peça** entre o quadril e os ombros do corpo. A couraça tem gola alta e ombreiras largas e termina na cintura. Por isso:
- a gola ia para a altura do ombro;
- o peito descia;
- a borda de baixo (a cintura da peça) ia parar no quadril.

Não era deslocamento da malha nem pivô errado do GLB. A origem e a escala vinham de uma regra de âncora errada para esse tipo de peça.

**Correção (na conversão, não deslocando a malha no jogo):**
- Todo peitoral vindo de GLB passa pelo **encaixe anatômico** (`ajuste_peitoral`), o mesmo que os peitorais realistas prontos já usavam. Ele faz três coisas:
  - **Escala:** pela cobertura do tronco (e dos ombros, quando a peça tem ombreiras ou mangas).
  - **Topo:** entre o ombro e a base do pescoço.
  - **Centro:** no peito, na altura da axila.
- A peça sem ombreira nem manga (o gibão leve, `ini_peitoral`, marcado `sem_ombros`) mira só o tronco. Mirar os braços inflava o colete para cobri-los.
- Peças reconvertidas: os dois peitorais iniciais e os cinco de nível 30.

**Hierarquia:** a peça é uma pele no esqueleto do jogo. Cada vértice herda os pesos do corpo que ela cobre (`js/criacao/montagem.js`, `recuarCorpo`). A pele coberta, por sua vez, herda os pesos da peça. Por isso o peitoral acompanha o tronco em qualquer animação (andar, correr, golpe, pulo).

## Padrão de âncoras

Toda peça encaixa pelo **corpo de referência** (`corpo_m`/`corpo_f`), medido na conversão: pescoço, ombro, axila, quadril, tornozelo e as regiões de pele (tronco, braços, mãos, pernas, pés). A âncora é a região do corpo que a peça cobre e o critério que fixa escala e posição:

| Âncora | Vaga | Como encaixa | Regra validada |
|---|---|---|---|
| Chest / UpperChest / Spine | peitoral | cobertura do tronco (e ombros, se a peça tem ombreiras) | topo entre a axila e o pescoço; o peito coberto; mais peça no peito que na barriga |
| Shoulders | ombroE, ombroD | cobertura do alto do braço, aberta em A | sem atravessar a pele; simétricas |
| Arms / Hands | luvas | mão e punho; depois, fatia a fatia, na grossura da mão | alinhada nos dedos; pesos só do braço e da mão do mesmo lado |
| Hips / Legs | calças (ou saia) | região do quadril ao tornozelo | sem atravessar; pesos só do tronco e das pernas |
| Feet | botas | comprimento do pé, sola no chão; o cano, fatia a fatia, na grossura da perna | calcanhar alinhado; pesos só da perna e do pé do mesmo lado |
| Head | capacete, capuz, cabelo, barba | cobertura do crânio | sem tapar os olhos nem flutuar |

**Validação automática:**
- **Na conversão:** `ancora_peitoral` grava `docs/topologia/ancoras_peitoral.json` (topo, base, axila, ombro, pescoço e quadril de cada peitoral nos dois corpos). A peça que sair da regra **reprova com erro**, para que o problema não volte em peças novas.
- **No jogo:** `Criacao3D.ancoras(m)` mede, por vaga, quanto da peça está na faixa do peito e na da barriga, e o desvio entre a pele e a peça em cada pose. `Criacao3D.encaixe(m)` mede a pele que fura a peça.
- **Testes** (`js/testes.js`): `criacaoAncoras` passa os dois peitorais iniciais e um de nível 30 pelos dois corpos, em repouso, correndo, golpeando e no ar. A couraça antiga reprovava (8% no peito, 67% na barriga); as corrigidas passam, com desvio 0. `criacaoEncaixe` confere que nenhum ponto da pele fura a armadura.

## Luvas e botas saindo do corpo (correção)

**Sintoma:** em movimento, as luvas e as botas se soltavam das mãos e dos pés. Na prévia, as luvas pareciam copos ocos em volta do punho, havia uma barra escura de uma mão à outra na altura da cintura, e o cano das botas parecia um tubo largo em volta da canela.

**Causas** (todas na conversão, em `tools/importar_criacao.py`):
- **Pesos do membro errado.** Cada vértice da peça herdava os pesos do vértice do corpo mais próximo. Em A-pose, as mãos ficam junto das coxas, e as luvas pegavam peso da coxa (às vezes do tronco). As calças pegavam peso da mão. Ao andar ou golpear, parte da luva seguia a perna.
- **Par separado pela mediana.** As luvas e as botas vêm em par lado a lado no GLB. Elas eram separadas triângulo a triângulo pela mediana, e a ponta de uma peça que passava do meio (o polegar, o bico) ia para o outro lado. Os vértices em comum levavam as duas transformações e viravam triângulos esticados de uma mão à outra: a barra escura.
- **Escala só pelo comprimento.** Medidas pelo comprimento da mão (ou da sola), as peças do Meshy ficavam uns 50% mais grossas que a mão e a perna.

**Correção:**
- `pesos_da_peca`: as luvas só pegam peso do braço e da mão do mesmo lado, as botas só da perna e do pé do mesmo lado, e as calças só do tronco e das pernas. Vale para as peças do Meshy e para as do Blender.
- `separar_par`: cada pedaço contínuo vai inteiro para o lado do seu centro.
- `conformar_membro`: em cada fatia ao longo da altura, a largura e a profundidade da peça encolhem até no máximo 1,08 vez a do membro mais 0,2 de cada lado. As escalas são suavizadas para a forma não ondular. As peças nunca crescem, e no pé o comprimento e o bico da bota ficam como estão. Resultado: a luva ficou com 1,2 vez a mão (antes, 1,5), e o cano da bota ficou mais rente à perna.
- As 63 luvas, botas e calças foram reconvertidas. O arquivo das que não mudaram saiu idêntico.

**Validação** (`membrosTela`, em `js/testes.js`):
- As 63 peças, nos dois corpos, só têm ossos do próprio membro.
- Nas luvas e botas iniciais, nenhuma aresta passa de 6 (a barra tinha arestas de umas 20 unidades).
- Correndo, golpeando e parado, cada vértice da luva fica perto do punho do seu lado e cada vértice da bota perto do tornozelo do seu lado.

## Corpos atléticos (opção nova de corpo)

Os dois corpos atléticos enviados vieram do Meshy em T. A primeira versão descia os braços girando a
malha no ombro (`abaixar_bracos` do conversor): o deltoide e a axila entortavam, com calombo e dobra
("os bonecos do corpo novo ficaram tortos"). Agora o T vira A **no Blender, por um rig de verdade**
(`tools/blender/corpo_pose_a.py`):

1. **Esqueleto simples** nas juntas medidas na malha: tronco, pernas e, de cada lado, braço, antebraço e
   mão (ombro a 1,33 vez a meia largura das costelas; cotovelo e punho pelo comprimento do braço).
2. **Pesos automáticos** (calor dos ossos) numa **cópia fechada** da malha: as costuras da UV são
   soldadas, os furos tapados e a cópia é remalhada por voxels (na malha do Meshy, aberta, o calor dos
   ossos falha). Os pesos voltam para a malha de verdade pela face mais próxima; quem ficar sem peso vai
   para o osso mais próximo.
3. Os **braços descem pelos ossos** até 48° abaixo da horizontal (a pose A que o rig do jogo
   reconhece), a pose é aplicada e o GLB sai em A (`*_A.glb`), com as texturas em 2048.

A atlética vem do modelo **com textura** da conta do Meshy (`Atletica_Feminina_Meshy.glb`), que trazia
um rabo de cavalo longo e um coque:

- **Rabo de cavalo e coque por raios**: de cada vértice atrás de um plano (um pouco atrás do meio do
  tronco), perto da linha do meio, sai um raio para a frente (e outro inclinado para o meio; no alto da
  cabeça, para o centro dela). Se o raio **entra** num sólido ainda atrás do plano (a pele das costas, do
  pescoço ou da cabeça), o vértice é de algo pendurado ali. A pele das costas não é marcada (o raio dela
  sai pela frente do tronco). Os vértices repetidos nas costuras da UV contam como ligados (sem isso o
  rabo virava centenas de pedacinhos e o filtro de tamanho o deixava). Saíram 155 mil vértices, sem furo
  nas costas.
- **Tinta do cabelo na pele**: o Meshy pintou o castanho do cabelo na nuca e no alto das costas; os texels
  escuros e quentes dessa região voltam ao tom de pele (o top, preto azulado, fica).
- **Metal**: alguns texels de pele vinham marcados como metal (até 0,46) e refletiam branco no jogo; o
  canal de metal vai a zero nos dois corpos.

No conversor (`tools/importar_criacao.py`), os atléticos são **corpos extra**:

- **Cabeça pelo perfil** (`marcos_cabeca_extra`): com cabelo esculpido e pescoço curto, o ponto mais à
  frente da cabeça pode ser a franja (o atlético) e o mais estreito cai no rosto. O queixo é onde a frente
  do perfil cai de uma vez; o nariz, o ponto mais à frente logo acima dele; o corte da cabeça fica logo
  abaixo do queixo. Assim o rosto esculpido do corpo (com a barba do atlético) sai inteiro, e o rosto
  escolhido encaixa no lugar dele. O pescoço do rosto não desce sobre o trapézio (que nesses corpos sobe
  até perto do queixo).
- **Arquivos à parte**: o encaixe de cada peça nos atléticos vai para `js/assets/criacao/atl/<peça>.js`,
  carregado só por quem escolhe um deles (`--so-extra` refaz só esses arquivos; os de sempre não mudam).
- **Peças do Blender** (feitas sobre os dois corpos de sempre): vão para o atlético pelo **deslocamento da
  pele** de um corpo para o outro (cada vértice do corpo-base vai por um mapa grosso — marcos de altura e
  largura do tronco, eixo de cada osso dos membros — e assenta na pele do extra; a peça anda o
  deslocamento médio da pele embaixo dela, e o que entrar na pele sai em bloco, sem amassar as placas).
  As da cabeça (capacete, barbas e cabelos do Blender) vão pela cabeça de referência (centro e tamanho).
- **Cabelo com física**: as mechas assentam por fora das esferas dos ombros, as esferas não passam da
  pele (o trapézio alto deixava o cabelo pousado acima do ombro, aberto para os lados) e o empurrão para
  fora da cabeça só usa a cabeça (o pescoço largo da referência jogava as mechas para os lados).

## *Pipeline* de um asset novo do Meshy

1. **Gerar:** `tools/meshy/gerar_estruturas.py` (imagem para 3D) ou `tools/meshy/gerar_npcs.py` (texto para 3D, personagens em A-pose). Antes de gastar mostram a estimativa do CLI e o saldo, e só gastam com `--confirmar`. A chave nunca entra no código.
2. **Exportar:** GLB (`assets/estruturas_ambiente/*/Meshy/`, `assets/npcs/meshy/`).
3. **Validar escala e orientação na conversão:**
   - convenção: +Y para cima e frente +Z no GLB;
   - no jogo, z para cima e 34 unidades por metro;
   - tamanho real pela tabela `tools/estruturas/escalas.json` ou pela altura do corpo.
4. **Origem e pivô:** a base no chão (z = 0) e o centro em X/Y, aplicados na conversão.
5. **UV e materiais:** a UV da fonte é mantida; as texturas são reduzidas, e um mapa neutro é criado quando falta.
6. **Rig:**
   - **peças da criação:** os pesos vêm do corpo de referência;
   - **personagens inteiros (NPCs):** o rig automático do jogo (`importar_modelo.rigar`), o mesmo dos corpos da criação e dos heróis. Se o modelo veio com os braços abertos em T, marque `"abaixar_bracos": true` em `tools/meshy/npcs.json`: a conversão baixa os braços para "A" antes do rig.
7. **Âncoras:** pela tabela acima.
8. **Importar no jogo:** `tools/importar_criacao.py --so <id>` (peças) ou `tools/importar_prop.py --grupo estruturas` (cenário).
9. **Testar no personagem:** capturas de frente, de lado e de costas (`.cache_criacao/cap_peitoral.mjs`) e a suíte.
10. **Validar as animações:** `criacaoAncoras` e `criacaoEncaixe` em várias poses.

**Nomes:** minúsculas, sem acentos, com `_`. Peças da criação seguem `<faixa>_<classe>_<vaga>` (ex.: `n30_guerreiro_peitoral`); estruturas e NPCs, o id da lista (`castelo_medieval`, `npc_ferreiro`).

## Pendências que dependem de modelos novos do Meshy

O saldo restante é de **60 créditos**: dá para uns 2 modelos com textura, a 30 créditos cada. Cada item abaixo precisa de geração nova e cabe num lote quando houver créditos. O caminho de conversão já está pronto (cobertura do crânio para cabelos, rosto pelo encaixe do pescoço, corpo pelo rig automático).
- **Cabelos novos:** curtos, longos, espetados, futuristas, cyberpunk. Uns 30 créditos cada.
- **Rostos novos:** novas estruturas de mandíbula, olhos, nariz e boca, masculinos e femininos. Uns 30 créditos cada. Hoje há 8 rostos com 7 controles de formato por deformação.
- **Corpos novos com outras proporções:** precisam passar pelo mesmo rig e pela medição do corpo de referência, e todas as peças seriam reconvertidas para cada corpo novo. Hoje há 2 corpos com altura e porte ajustáveis.
