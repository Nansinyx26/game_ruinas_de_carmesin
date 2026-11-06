# Lote de teste do Meshy — remesh validado peça a peça

Gerado por `tools/topologia/validar_meshy.py`. 5 peças processadas no remesh do Meshy (5 créditos cada, 25 no total), **3 aprovadas**. As fontes não foram alteradas; as saídas estão em `assets/_retopo/meshy/`. Critérios iguais aos do lote local (`LOTE.md`), com orçamentos próprios para arma e cenário.

| peça | tipo | pedido ao Meshy | triângulos antes → depois | desvio médio / 95% (da diagonal) | resultado |
|---|---|---|---|---|---|
| `assets/armas/eclipse/kael_espada.glb` | arma | triângulos, 3.000 | 23,850 → 2,986 | 0.02% / 0.04% | aprovada |
| `assets/modelos/armaduras/kael/kael_n6.glb` | armadura | quads, 11.000 | 220,294 → 21,506 | 0.13% / 0.34% | reprovada: 21,506 triângulos acima do orçamento 12,000 |
| `assets/Criar_Personagem/Cabelo/cabelo_1.glb` | cabelo | triângulos, 12.000 | 1,399,168 → 11,529 | 0.13% / 0.31% | aprovada |
| `assets/Criar_Personagem/Rosto/rosto_3.glb` | rosto | quads, 11.000 | 73,594 → 20,038 | 0.03% / 0.07% | reprovada: 20,038 triângulos acima do orçamento 12,000 |
| `assets/estruturas_ambiente/Estruturas_Superficie/item_ambiente_md_1.glb` | cenario | triângulos, 5.000 | 183,296 → 4,893 | 0.05% / 0.15% | aprovada |

## Critérios

- **arma**: desvio de 95% até 1.5% da diagonal, até 4,000 triângulos.
- **armadura**: desvio de 95% até 1.5% da diagonal, até 12,000 triângulos.
- **cabelo**: desvio de 95% até 2.5% da diagonal, até 12,000 triângulos.
- **rosto**: desvio de 95% até 1.2% da diagonal, até 12,000 triângulos.
- **cenario**: desvio de 95% até 1.5% da diagonal, até 6,000 triângulos.

## Observações

- O Meshy devolve a malha reescalada para caber em [-1, 1]; o validador e a integração a levam de volta à escala da fonte.
- Com `topology: quad`, a meta do Meshy conta quads: 11.000 quads viram cerca de 21 mil triângulos no GLB.
- Texturas embutidas em cada GLB: `kael_espada` cor, metal_aspereza; `kael_n6` cor, metal_aspereza; `cabelo_1` cor, metal_aspereza; `rosto_3` cor, metal_aspereza; `item_ambiente_md_1` cor, metal_aspereza.
- `<id>.glb` é a saída do Meshy como veio; `<id>_alinhado.glb` é a mesma malha sob um nó que a devolve à escala
  e à posição da fonte (é o que os importadores do jogo leem).

## No jogo

Só as peças aprovadas entraram; as fontes continuam intactas e a troca se desfaz apontando de volta para elas.

- **Arma**: a variação da espada do Kael (`kael_espada_alt`, item `espada_kael_3d`) lê `kael_espada_alinhado.glb`
  (`tools/importar_arma.py` → `js/assets/armas3d.js`, 2.400 triângulos no jogo).
- **Cabelo**: o Cabelo 1 do criador lê `cabelo_1_alinhado.glb` (`tools/importar_criacao.py` → `js/assets/criacao/cabelo_1.js`).
  Antes saía da redução de 1,4 milhão de triângulos (reprovada no lote local); agora vem da malha do Meshy.
  O remesh não traz mapa de normais, então o Cabelo 1 ficou sem ele (cor e metal/aspereza continuam).
- **Cenário**: a pilha de caixotes (`caixotes`, `tools/importar_prop.py --grupo natureza` → `js/assets/natureza3d.js`)
  entrou na clareira de Velmora (`js/mundo/cenario.js`, escala 0,65).
- **Armadura e rosto**: reprovados só pelo orçamento (11.000 quads = cerca de 21 mil triângulos); não entraram.
  Refazer com cerca de 6.000 quads (5 créditos cada) deve caber nos 12 mil triângulos.

Testes: `node tools/testes_navegador.mjs` (inclui a pilha de caixotes na clareira e a origem da espada); capturas:
`node tools/captura_meshy.mjs saida.png` (caixotes e um personagem criado com o Cabelo 1).
