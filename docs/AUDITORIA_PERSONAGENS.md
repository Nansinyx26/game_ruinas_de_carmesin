# Auditoria do sistema de personagens (missão prioritária — passo 1 e 2)

Pedido: "Sistema AAA de criação e compatibilidade de personagens": armadura inicial em todos os corpos,
cabeças, barbas, os cabelos das pastas ainda fora do jogo, encaixe universal e testes de todas as combinações
(também em movimento). Levantamento feito no código e nos arquivos; nada foi alterado nesta auditoria.

## 1. Pastas de cabelos

**`assets/cabelos/` — 12 GLB do Meshy, nenhum no jogo.** Malha única, sem esqueleto, caixa ±0,95.

| Arquivo (Meshy_AI_…) | MB | Triângulos | Textura |
|---|---|---|---|
| 3D_hair_asset_isolat | 10,8 | 10 mil | sim |
| Brown_Topknot_with_Go | 67,6 | 1,6 mi | sim |
| Midnight_Bob | 152,8 | 4,8 mi | sim |
| Midnight_Tresses_with | 19,0 | 1,06 mi | não |
| Rockstar_Hair | 96,7 | 4,0 mi | não |
| Silver_Veil | 54,7 | 3,0 mi | não |
| Street_Mode | 343,5 | 7,5 mi | sim |
| Textured_Shadow_Crop | 123,5 | 5,2 mi | não |
| Textured_Silver_Under (1) | 103,7 | 4,3 mi | não |
| character_hair_3d | 82,2 | 1,9 mi | sim |
| hair_01_short_spiky_3 | 85,4 | 1,8 mi | sim |
| hair_08_wavy_medium_3 | 114,7 | 1,8 mi | sim |

**Segunda pasta:** todos os cabelos de `Cabelo/`, `Cabelo_Fisica/` e `Cabelo_Meshy/` já estão no jogo. Os
candidatos são `assets/_retopo/assets/Criar_Personagem/Cabelo/` (retopologias de `Cabelo_4` e `Cabelo_6` não
ligadas; no clone são ponteiros LFS) e os 10 cabelos planejados em `tools/meshy/cabelos.json` que nunca foram
gerados.

**No jogo hoje:** 25 cabelos + "sem cabelo" (`js/criacao/dados.js:100-116`): `cabelo_1..8` (Meshy), 15 em
mechas com física (`Cabelo_Fisica/`), `cabelo_meshy_longo` e `cabelo_meshy_cyber`.

## 2. Inventário

| Item | Origem | Gerado em | Encaixe |
|---|---|---|---|
| Corpos (4) | `Corpo_Masculino`, `Corpo_Feminino`, `Corpos_Atleticos` | `js/assets/criacao/corpo_{m,f,am,af}.js` | Pele no esqueleto do Kael |
| Rostos (8) | `Rosto/` | `rosto_1..8.js` | Cabeça e pescoço no pescoço |
| Cabelos (25) | `Cabelo/`, `Cabelo_Fisica/`, `Cabelo_Meshy/` | `cabelo_*.js` | Peso na cabeça; mechas com cadeias de ossos |
| Barbas (18) | `Barbas/` (5 Meshy), `Barbas_Blender/` (13) | `barba_*.js` | Conformadas ao rosto (`barba_encaixe.js`) |
| Armadura inicial | `Armaduras_Inicial_Level_1/` | `ini_capuz/peitoral/armadura/luvas/calca/botas/capa` | Pesos do corpo |
| Armaduras 30–100 | `Armaduras_Level_*` | `n{30,50,75,100}_<classe>_<vaga>.js` | 9 vagas |
| Heróis fixos | GLB inteiros | `js/assets/<herói>3d.js` | Corpo inteiro por nível |
| NPCs (GM, moradores, zumbis) | `assets/npcs`, `assets/GM`, `assets/extra` | `npc_*.js` | Rig automático |

Braçadeiras e cinto não existem como vaga; ombreiras só do nível 50 ou dentro da couraça inicial.

## 3. Como as peças se prendem

- Esqueleto único (o do Kael) para todos os corpos; pele na CPU (`R3D.skin`, com quatérnios duplos).
- Encaixe feito na conversão (`tools/importar_criacao.py`): por cobertura (cabelo, barba, capuz, com fatores
  fixos), pelo molde do manequim (cabelos do Meshy), peitoral com âncora validada, ombreiras, botas e luvas por lado.
- No jogo (`js/criacao/montagem.js`): a pele recua sob a armadura; barba e cabelo conformados ao rosto;
  formato do rosto por deformações gaussianas; altura e porte por escala global.

## 4. Tela e salvamento (para não quebrar saves)

`js/criacao/tela.js`; perfis em `eclipse_zero_perfis_v1` com a aparência em **índices**. Opção nova só entra
**no fim** de `PERS_GLB.cabeloG` e `PERS_CABELOS_GLB`; os NPCs usam índices fixos (`npc3d.js:19-36`).

## 5. Problemas encontrados e causas

| Problema | Causa medida |
|---|---|
| **GM: um pé maior que o outro** | 657 vértices das botas e da barra da calça têm o **quadril** como osso principal: o rig automático põe as pernas numa profundidade fixa (`tools/gerar_aliado3d.py:146-152`), só os braços são medidos na malha. A bota fica presa ao quadril e estica quando o pé anda. |
| GM: coldre | 13,5 de comprimento, passa do joelho (coxa 13,9) e não acompanha a perna. |
| Botas diferentes no corpo feminino | A escala das botas é feita **por lado** e o corpo feminino é assimétrico (L 10,14 × R 9,82 de comprimento). |
| Barbas longas do Meshy descolando ao virar a cabeça | A parte de baixo herda pesos do pescoço e do tronco (`importar_criacao.py:1111-1114`). |
| Barbas nos corpos atléticos | Nenhuma validação cobre os corpos 2 e 3 (`tools/validar_barbas.mjs:26`). |
| Peitoral | Corrigido antes, mas o teste aceita 30 % no peito e não roda nos corpos 2 e 3. |
| Escalas e posições fixas | Fatores do encaixe, recuo, folga do capacete, adereços do GM e do Bardo à mão. |

## 6. Plano de execução

1. **GM:** pernas medidas na malha no rig automático (como os braços), reconverter o `npc_gm` e os moradores,
   coldre e pistola refeitos para a coxa. Teste: pés do mesmo tamanho andando.
2. **Botas simétricas:** uma escala única para o par; teste "par simétrico" em todos os corpos.
3. **Barbas do Meshy:** peso todo na cabeça; validação nos 4 corpos e com a cabeça girada.
4. **Os 12 cabelos de `assets/cabelos`:** registrar em `tools/meshy/cabelos.json`, separar (com molde quando
   houver manequim), reduzir de 1–7,5 mi para 16–40 mil triângulos, converter, ligar no fim das listas, testar
   em todos os rostos e corpos.
5. **Perfis anatômicos** (recomendação do pedido): medir em cada corpo os pontos (ombros, tórax, cintura,
   quadril, joelhos, tornozelos, mandíbula, queixo) e guardar como perfil; o encaixe usa o perfil, não escala global.
6. **Testes de compatibilidade** de todas as combinações (corpo × rosto × cabelo × barba × armadura inicial)
   **parado e em movimento** (andar, correr, levantar a espada, girar a cabeça): interseção, peças flutuando,
   escala, pesos; relatório em `docs/COMPATIBILIDADE_PERSONAGENS.md`.
