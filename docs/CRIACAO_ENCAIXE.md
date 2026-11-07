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
| Arms / Hands | luvas | mão e punho | alinhada nos dedos |
| Hips / Legs | calças (ou saia) | região do quadril ao tornozelo | sem atravessar |
| Feet | botas | comprimento do pé, sola no chão | calcanhar alinhado |
| Head | capacete, capuz, cabelo, barba | cobertura do crânio | sem tapar os olhos nem flutuar |

**Validação automática:**
- **Na conversão:** `ancora_peitoral` grava `docs/topologia/ancoras_peitoral.json` (topo, base, axila, ombro, pescoço e quadril de cada peitoral nos dois corpos). A peça que sair da regra **reprova com erro**, para que o problema não volte em peças novas.
- **No jogo:** `Criacao3D.ancoras(m)` mede, por vaga, quanto da peça está na faixa do peito e na da barriga, e o desvio entre a pele e a peça em cada pose. `Criacao3D.encaixe(m)` mede a pele que fura a peça.
- **Testes** (`js/testes.js`): `criacaoAncoras` passa os dois peitorais iniciais e um de nível 30 pelos dois corpos, em repouso, correndo, golpeando e no ar. A couraça antiga reprovava (8% no peito, 67% na barriga); as corrigidas passam, com desvio 0. `criacaoEncaixe` confere que nenhum ponto da pele fura a armadura.

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
   - **personagens inteiros (NPCs):** o rig automático do jogo (`importar_modelo.rigar`), o mesmo dos corpos da criação e dos heróis.
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
