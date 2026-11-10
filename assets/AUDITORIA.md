# Auditoria dos assets

Gerado por `tools/blender/auditoria.py`. Orçamento da web: personagens ≤ 5.000 triângulos, armas e props ≤ 1.500, peças modulares e equipamento ≤ 3.000, texturas ≤ 1024 px.

**Importante:** os GLB de `assets/` são as **fontes** (geradas no Meshy). O jogo não carrega esses arquivos: os conversores (`tools/importar_criacao.py`, `tools/importar_modelo.py`, `tools/importar_arma.py`) geram versões reduzidas em `js/assets/`. A coluna "no jogo" mostra o que realmente vai para o navegador, quando a peça é da criação de personagem.

Total: 149 modelos GLB (2058 MB) e 177 imagens (42 MB).

## Prioridades (do mais pesado ao mais leve)

1. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/bota_patrulheiro.glb` — 1.499.554 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 22 MB · no jogo já reduzido: 6.000 tri. 603 KB
2. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Botas_Guerreiro.glb` — 1.499.678 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 22 MB · no jogo já reduzido: 6.000 tri. 568 KB
3. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/calça_Mago.glb` — 1.499.657 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 22 MB · no jogo já reduzido: 5.999 tri. 678 KB
4. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/Armadura_Patrulheiro.glb` — 1.499.456 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 22 MB · no jogo já reduzido: 7.998 tri. 764 KB
5. `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Bota_level_1.glb` — 1.499.372 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 22 MB · no jogo já reduzido: 5.998 tri. 649 KB
6. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capa_patrulheiro.glb` — 1.499.458 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 22 MB · no jogo já reduzido: 5.999 tri. 682 KB
7. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capuz_patrulheiro.glb` — 1.499.508 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 22 MB · no jogo já reduzido: 6.000 tri. 547 KB
8. `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capuz_level_1.glb` — 1.499.514 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 21 MB · no jogo já reduzido: 5.998 tri. 524 KB
9. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/luvas_patrulheiro.glb` — 1.499.366 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 22 MB · no jogo já reduzido: 5.000 tri. 539 KB
10. `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capuz_Guardião_Arcano.glb` — 1.499.527 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 21 MB · no jogo já reduzido: 6.000 tri. 563 KB
11. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capa_Guerreiro.glb` — 1.499.546 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 21 MB · no jogo já reduzido: 6.000 tri. 711 KB
12. `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/botas_Guardião_Arcano.glb` — 1.499.564 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 21 MB · no jogo já reduzido: 6.000 tri. 545 KB
13. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capuz_Guerreiro.glb` — 1.499.521 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 21 MB · no jogo já reduzido: 6.000 tri. 541 KB
14. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Peitoral_Mago.glb` — 1.499.342 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 22 MB · no jogo já reduzido: 7.999 tri. 803 KB
15. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Botas_Assasino.glb` — 1.499.516 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 21 MB · no jogo já reduzido: 6.000 tri. 645 KB
16. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capuz_Mago.glb` — 1.499.402 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 21 MB · no jogo já reduzido: 5.998 tri. 562 KB
17. `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Luvas_Guardião_Arcano.glb` — 1.499.322 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 21 MB · no jogo já reduzido: 4.998 tri. 528 KB
18. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Peitoral_Guerreiro.glb` — 1.499.296 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 21 MB · no jogo já reduzido: 7.998 tri. 820 KB
19. `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Luvas_level_1.glb` — 1.499.368 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 21 MB · no jogo já reduzido: 4.998 tri. 502 KB
20. `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Peitoral_leve_level_1.glb` — 1.499.492 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 21 MB · no jogo já reduzido: 7.998 tri. 731 KB
21. `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capa_level_1.glb` — 1.499.408 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 21 MB · no jogo já reduzido: 5.998 tri. 532 KB
22. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/bota_Mago.glb` — 1.499.374 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 21 MB · no jogo já reduzido: 5.998 tri. 577 KB
23. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Luva_Guerreiro.glb` — 1.499.348 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 21 MB · no jogo já reduzido: 4.998 tri. 540 KB
24. `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Peitoral_Guardião_Arcano.glb` — 1.499.268 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 21 MB · no jogo já reduzido: 8.000 tri. 768 KB
25. `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capa_Guardião_Arcano.glb` — 1.499.411 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 20 MB · no jogo já reduzido: 6.000 tri. 615 KB
26. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/capa_assasino.glb` — 1.499.364 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 20 MB · no jogo já reduzido: 5.998 tri. 628 KB
27. `assets/Criar_Personagem/Armaduras_Inicial_Level_1/madura_pesada_level1.glb` — 1.499.048 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 21 MB · no jogo já reduzido: 8.000 tri. 739 KB
28. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Luvas_Mago.glb` — 1.499.272 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 20 MB · no jogo já reduzido: 5.000 tri. 552 KB
29. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Amardura_Assasino.glb` — 1.499.200 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 20 MB · no jogo já reduzido: 8.000 tri. 748 KB
30. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Capuz_Assasino.glb` — 1.499.256 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 20 MB · no jogo já reduzido: 6.000 tri. 490 KB
31. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Luvas_Assasino.glb` — 1.499.188 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 20 MB · no jogo já reduzido: 4.998 tri. 527 KB
32. `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/calça_Guardião_Arcano.glb` — 1.499.262 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 20 MB · no jogo já reduzido: 6.000 tri. 583 KB
33. `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Calça_level_1.glb` — 1.499.098 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 20 MB · no jogo já reduzido: 6.000 tri. 582 KB
34. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/calça_Assasino.glb` — 1.499.070 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 20 MB · no jogo já reduzido: 5.998 tri. 612 KB
35. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capa_Mago.glb` — 1.499.180 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 19 MB · no jogo já reduzido: 5.998 tri. 665 KB
36. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/calça_patrulheiro.glb` — 1.499.016 triângulos (500× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 20 MB · no jogo já reduzido: 5.998 tri. 567 KB
37. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/calça_Guerreiro.glb` — 1.498.926 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 19 MB · no jogo já reduzido: 5.998 tri. 584 KB
38. `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/amuleto_Guardião_Arcano.glb` — 1.498.750 triângulos (500× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 17 MB · no jogo já reduzido: 2.500 tri. 261 KB
39. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/amuleto_Assasino.glb` — 1.497.492 triângulos (499× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 16 MB · no jogo já reduzido: 2.500 tri. 252 KB
40. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/amulerto_patrulheiro.glb` — 1.497.108 triângulos (499× o orçamento de 3.000); 2 textura(s) de 4096 px; arquivo de 17 MB · no jogo já reduzido: 2.500 tri. 254 KB
41. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/amuleto_Mago.glb` — 1.497.341 triângulos (499× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 16 MB · no jogo já reduzido: 2.499 tri. 273 KB
42. `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Amuleto_Guerreiro.glb` — 1.496.595 triângulos (499× o orçamento de 3.000); 2 textura(s) de 2048 px; arquivo de 16 MB · no jogo já reduzido: 2.500 tri. 284 KB
43. `assets/armas/eclipse/sera_drone.glb` — 604.676 triângulos (403× o orçamento de 1.500); 3 textura(s) de 2048 px; arquivo de 26 MB
44. `assets/Criar_Personagem/Cabelo/Cabelo_3.glb` — 1.709.692 triângulos (342× o orçamento de 5.000); 3 textura(s) de 2048 px; arquivo de 59 MB · no jogo já reduzido: 11.998 tri. 1422 KB
45. `assets/Criar_Personagem/Corpo_Masculino/Corpo_Masculino.glb` — 1.497.768 triângulos (300× o orçamento de 5.000); 2 textura(s) de 4096 px; arquivo de 16 MB · no jogo já reduzido: 17.023 tri. 826 KB
46. `assets/Criar_Personagem/Corpo_Feminino/Corpo_Feminino.glb` — 1.497.906 triângulos (300× o orçamento de 5.000); 2 textura(s) de 2048 px; arquivo de 16 MB · no jogo já reduzido: 16.657 tri. 781 KB
47. `assets/Criar_Personagem/Cabelo/cabelo_1.glb` — 1.399.168 triângulos (280× o orçamento de 5.000); 3 textura(s) de 2048 px; arquivo de 50 MB · no jogo já reduzido: 12.000 tri. 1365 KB
48. `assets/Criar_Personagem/Cabelo/Cabelo_5.glb` — 1.305.646 triângulos (261× o orçamento de 5.000); 3 textura(s) de 2048 px; arquivo de 45 MB · no jogo já reduzido: 12.000 tri. 1324 KB
49. `assets/Criar_Personagem/Cabelo/cabelo_7.glb` — 1.219.358 triângulos (244× o orçamento de 5.000); 3 textura(s) de 2048 px; arquivo de 45 MB · no jogo já reduzido: 11.998 tri. 1406 KB
50. `assets/Criar_Personagem/Cabelo/Cabelo_2.glb` — 1.081.170 triângulos (216× o orçamento de 5.000); 3 textura(s) de 2048 px; arquivo de 38 MB · no jogo já reduzido: 11.996 tri. 1238 KB
51. `assets/Criar_Personagem/Cabelo/Cabelo_8.glb` — 1.020.834 triângulos (204× o orçamento de 5.000); 3 textura(s) de 2048 px; arquivo de 38 MB · no jogo já reduzido: 11.996 tri. 1419 KB
52. `assets/Criar_Personagem/Cabelo/Cabelo_4.glb` — 966.718 triângulos (193× o orçamento de 5.000); 3 textura(s) de 2048 px; arquivo de 37 MB · no jogo já reduzido: 12.000 tri. 1366 KB
53. `assets/Criar_Personagem/Barbas/Barba_Curta.glb` — 548.708 triângulos (110× o orçamento de 5.000); 3 textura(s) de 2048 px; arquivo de 23 MB · no jogo já reduzido: 5.000 tri. 699 KB
54. `assets/modelos/armaduras/drakos/drakos_n6.glb` — 306.806 triângulos (102× o orçamento de 3.000); 3 textura(s) de 2048 px; arquivo de 17 MB
55. `assets/armaduras_extras/drakos/drakos_extra_drakos__varia__es_da_armadura___copia__2__copia.glb` — não abriu: não é GLB
56. `assets/armaduras_extras/drakos/drakos_n1.glb` — não abriu: não é GLB
57. `assets/armaduras_extras/drakos/drakos_n2.glb` — não abriu: não é GLB
58. `assets/armaduras_extras/drakos/drakos_n3.glb` — não abriu: não é GLB
59. `assets/armaduras_extras/drakos/drakos_n4.glb` — não abriu: não é GLB
60. `assets/armaduras_extras/drakos/drakos_n5.glb` — não abriu: não é GLB

## Custo no jogo de um personagem criado (estilo Realista, conjunto do Iniciado)

| Peça | Triângulos | Arquivo |
|---|---|---|
| corpo_m | 17.023 | 826 KB |
| rosto_1 | 8.869 | 787 KB |
| cabelo_1 | 12.000 | 1365 KB |
| barba_curta | 5.000 | 699 KB |
| ini_capuz | 5.998 | 524 KB |
| ini_peitoral | 7.998 | 731 KB |
| ini_luvas | 4.998 | 502 KB |
| ini_calca | 6.000 | 582 KB |
| ini_botas | 5.998 | 649 KB |
| ini_capa | 5.998 | 532 KB |
| **Total** | **79.882** | **7.0 MB** |

O orçamento pedido para personagens é 5.000 triângulos; montado, o personagem tem 16× isso. Para caber, a saída é um LOD por distância (o motor já esconde malhas por nível de detalhe): a versão completa na tela de criação e na 3ª pessoa de perto, uma versão reduzida (≈ 5 mil) na vista isométrica. Decisão de arte pendente.

## Modelos

| Arquivo | Categoria | Triângulos | Vértices | Texturas | UV | Draco | Materiais | Medidas (m) | Tamanho | No jogo |
|---|---|---|---|---|---|---|---|---|---|---|
| `assets/modelos/drakos.glb` | personagem | 159.950 | 89.646 | 2048. 2048. 2048 | sim | não | 1 | 1.33×1.90×0.42 | 11.6 MB | — |
| `assets/modelos/kael_meshy.glb` | personagem | 250.892 | 140.630 | 2048. 2048. 2048 | sim | não | 1 | 1.07×1.90×0.59 | 13.6 MB | — |
| `assets/modelos/lyra.glb` | personagem | 172.520 | 99.831 | 2048. 2048. 2048 | sim | não | 1 | 1.18×1.90×0.59 | 10.9 MB | — |
| `assets/modelos/orion.glb` | personagem | 99.100 | 56.439 | 2048. 2048. 2048 | sim | não | 1 | 1.03×1.90×0.49 | 8.3 MB | — |
| `assets/modelos/sera.glb` | personagem | 194.770 | 114.009 | 2048. 2048. 2048 | sim | não | 1 | 1.01×1.90×0.50 | 12.2 MB | — |
| `assets/modelos/armaduras/drakos/drakos_n1.glb` | equipamento | 253.472 | 143.289 | 2048. 2048. 2048 | sim | não | 1 | 1.32×1.89×0.73 | 15.6 MB | — |
| `assets/modelos/armaduras/drakos/drakos_n2.glb` | equipamento | 240.970 | 133.057 | 2048. 2048. 2048 | sim | não | 1 | 1.33×1.90×0.70 | 14.8 MB | — |
| `assets/modelos/armaduras/drakos/drakos_n3.glb` | equipamento | 242.062 | 136.494 | 2048. 2048. 2048 | sim | não | 1 | 1.24×1.90×0.82 | 14.4 MB | — |
| `assets/modelos/armaduras/drakos/drakos_n4.glb` | equipamento | 267.020 | 147.919 | 2048. 2048. 2048 | sim | não | 1 | 1.18×1.90×0.70 | 14.5 MB | — |
| `assets/modelos/armaduras/drakos/drakos_n5.glb` | equipamento | 248.656 | 141.994 | 2048. 2048. 2048 | sim | não | 1 | 1.16×1.90×0.73 | 15.0 MB | — |
| `assets/modelos/armaduras/drakos/drakos_n6.glb` | equipamento | 306.806 | 180.093 | 2048. 2048. 2048 | sim | não | 1 | 1.20×1.86×0.78 | 17.2 MB | — |
| `assets/modelos/armaduras/drakos/drakos_n7.glb` | equipamento | 186.818 | 105.213 | 2048. 2048. 2048 | sim | não | 1 | 1.31×1.90×0.77 | 13.4 MB | — |
| `assets/modelos/armaduras/lyra/lyra_n1.glb` | equipamento | 150.650 | 85.556 | 2048. 2048. 2048 | sim | não | 1 | 1.07×1.90×0.71 | 12.2 MB | — |
| `assets/modelos/armaduras/lyra/lyra_n2.glb` | equipamento | 142.964 | 80.730 | 2048. 2048. 2048 | sim | não | 1 | 1.00×1.90×0.71 | 10.6 MB | — |
| `assets/modelos/armaduras/lyra/lyra_n3.glb` | equipamento | 152.794 | 88.108 | 2048. 2048. 2048 | sim | não | 1 | 0.99×1.90×0.67 | 12.2 MB | — |
| `assets/modelos/armaduras/lyra/lyra_n4.glb` | equipamento | 162.238 | 93.972 | 2048. 2048. 2048 | sim | não | 1 | 0.95×1.90×0.67 | 13.4 MB | — |
| `assets/modelos/armaduras/lyra/lyra_n5.glb` | equipamento | 157.098 | 92.049 | 2048. 2048. 2048 | sim | não | 1 | 1.00×1.90×0.71 | 13.0 MB | — |
| `assets/modelos/armaduras/lyra/lyra_n6.glb` | equipamento | 164.786 | 94.990 | 2048. 2048. 2048 | sim | não | 1 | 0.96×1.90×0.71 | 13.3 MB | — |
| `assets/modelos/armaduras/lyra/lyra_n7.glb` | equipamento | 186.134 | 107.193 | 2048. 2048. 2048 | sim | não | 1 | 1.01×1.89×0.69 | 12.1 MB | — |
| `assets/modelos/armaduras/lyra/lyra_n8.glb` | equipamento | 217.824 | 126.252 | 2048. 2048. 2048 | sim | não | 1 | 0.98×1.90×0.69 | 14.6 MB | — |
| `assets/modelos/armaduras/kael/kael_n1.glb` | equipamento | 238.318 | 132.333 | 2048. 2048. 2048 | sim | não | 1 | 1.36×1.90×0.70 | 14.0 MB | — |
| `assets/modelos/armaduras/kael/kael_n2.glb` | equipamento | 136.878 | 76.885 | 2048. 2048. 2048 | sim | não | 1 | 1.33×1.90×0.47 | 11.7 MB | — |
| `assets/modelos/armaduras/kael/kael_n3.glb` | equipamento | 197.796 | 113.546 | 2048. 2048. 2048 | sim | não | 1 | 1.30×1.90×0.64 | 12.4 MB | — |
| `assets/modelos/armaduras/kael/kael_n4.glb` | equipamento | 99.906 | 57.356 | 2048. 2048. 2048 | sim | não | 1 | 1.33×1.90×0.38 | 11.2 MB | — |
| `assets/modelos/armaduras/kael/kael_n5.glb` | equipamento | 163.662 | 92.822 | 2048. 2048. 2048 | sim | não | 1 | 1.35×1.89×0.62 | 13.2 MB | — |
| `assets/modelos/armaduras/kael/kael_n6.glb` | equipamento | 220.294 | 124.258 | 2048. 2048. 2048 | sim | não | 1 | 1.27×1.90×0.62 | 13.0 MB | — |
| `assets/modelos/armaduras/kael/kael_n7.glb` | equipamento | 190.672 | 109.503 | 2048. 2048. 2048 | sim | não | 1 | 1.24×1.90×0.70 | 14.3 MB | — |
| `assets/modelos/armaduras/sera/sera_n1.glb` | equipamento | 242.190 | 137.650 | 2048. 2048. 2048 | sim | não | 1 | 1.08×1.90×0.72 | 15.4 MB | — |
| `assets/modelos/armaduras/sera/sera_n2.glb` | equipamento | 185.844 | 107.319 | 2048. 2048. 2048 | sim | não | 1 | 1.12×1.90×0.66 | 13.9 MB | — |
| `assets/modelos/armaduras/sera/sera_n3.glb` | equipamento | 170.636 | 97.988 | 2048. 2048. 2048 | sim | não | 1 | 1.03×1.90×0.69 | 12.7 MB | — |
| `assets/modelos/armaduras/sera/sera_n4.glb` | equipamento | 160.372 | 91.793 | 2048. 2048. 2048 | sim | não | 1 | 1.08×1.90×0.71 | 13.8 MB | — |
| `assets/modelos/armaduras/sera/sera_n5.glb` | equipamento | 159.972 | 93.327 | 2048. 2048. 2048 | sim | não | 1 | 1.08×1.90×0.64 | 14.0 MB | — |
| `assets/modelos/armaduras/sera/sera_n6.glb` | equipamento | 171.046 | 97.612 | 2048. 2048. 2048 | sim | não | 1 | 1.12×1.90×0.70 | 12.6 MB | — |
| `assets/modelos/armaduras/sera/sera_n7.glb` | equipamento | 158.028 | 90.250 | 2048. 2048. 2048 | sim | não | 1 | 1.02×1.90×0.70 | 12.9 MB | — |
| `assets/modelos/armaduras/orion/orion_n1.glb` | equipamento | 151.632 | 85.226 | 2048. 2048. 2048 | sim | não | 1 | 1.45×1.90×0.73 | 11.7 MB | — |
| `assets/modelos/armaduras/orion/orion_n2.glb` | equipamento | 167.878 | 94.129 | 2048. 2048. 2048 | sim | não | 1 | 1.47×1.90×0.65 | 12.2 MB | — |
| `assets/modelos/armaduras/orion/orion_n3.glb` | equipamento | 140.752 | 79.438 | 2048. 2048. 2048 | sim | não | 1 | 1.45×1.90×0.70 | 11.0 MB | — |
| `assets/modelos/armaduras/orion/orion_n4.glb` | equipamento | 254.372 | 142.648 | 2048. 2048. 2048 | sim | não | 1 | 1.39×1.90×0.71 | 15.5 MB | — |
| `assets/modelos/armaduras/orion/orion_n5.glb` | equipamento | 212.928 | 120.278 | 2048. 2048. 2048 | sim | não | 1 | 1.41×1.90×0.66 | 14.3 MB | — |
| `assets/modelos/armaduras/orion/orion_n6.glb` | equipamento | 148.916 | 83.640 | 2048. 2048. 2048 | sim | não | 1 | 1.46×1.90×0.72 | 12.2 MB | — |
| `assets/modelos/armaduras/orion/orion_n7.glb` | equipamento | 160.908 | 94.066 | 2048. 2048. 2048 | sim | não | 1 | 1.40×1.90×0.61 | 12.8 MB | — |
| `assets/Criar_Personagem/Rosto/Rosto_1.glb` | parte | 69.796 | 39.770 | 2048. 2048. 2048 | sim | não | 1 | 1.88×1.90×1.26 | 7.6 MB | 8.869 tri |
| `assets/Criar_Personagem/Rosto/rosto_2.glb` | parte | 75.036 | 42.812 | 2048. 2048. 2048 | sim | não | 1 | 1.79×1.90×1.29 | 7.3 MB | 8.999 tri |
| `assets/Criar_Personagem/Rosto/rosto_3.glb` | parte | 73.594 | 41.661 | 2048. 2048. 2048 | sim | não | 1 | 1.89×1.90×1.30 | 7.4 MB | 8.852 tri |
| `assets/Criar_Personagem/Rosto/rosto_4.glb` | parte | 74.926 | 42.445 | 2048. 2048. 2048 | sim | não | 1 | 1.89×1.90×1.15 | 7.1 MB | 8.750 tri |
| `assets/Criar_Personagem/Rosto/rosto_5.glb` | parte | 67.152 | 38.445 | 2048. 2048. 2048 | sim | não | 1 | 1.79×1.90×1.15 | 7.2 MB | 8.378 tri |
| `assets/Criar_Personagem/Rosto/rosto_6.glb` | parte | 68.452 | 38.909 | 2048. 2048. 2048 | sim | não | 1 | 1.82×1.90×1.11 | 6.7 MB | 8.566 tri |
| `assets/Criar_Personagem/Rosto/rosto_7.glb` | parte | 63.944 | 36.822 | 2048. 2048. 2048 | sim | não | 1 | 1.82×1.90×1.13 | 7.0 MB | 8.498 tri |
| `assets/Criar_Personagem/Rosto/rosto_8.glb` | parte | 62.312 | 35.789 | 2048. 2048. 2048 | sim | não | 1 | 1.69×1.90×1.13 | 6.8 MB | 8.258 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Luvas_Guardião_Arcano.glb` | equipamento | 1.499.322 | 4.487.326 | 4096. 4096 | sim | sim | 1 | 1.94×1.99×0.81 | 21.3 MB | 4.998 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Peitoral_Guardião_Arcano.glb` | equipamento | 1.499.268 | 4.487.558 | 2048. 2048 | sim | sim | 1 | 1.85×1.99×1.03 | 20.7 MB | 8.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/amuleto_Guardião_Arcano.glb` | equipamento | 1.498.750 | 4.452.732 | 2048. 2048 | sim | sim | 1 | 1.33×1.99×0.46 | 17.0 MB | 2.500 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/botas_Guardião_Arcano.glb` | equipamento | 1.499.564 | 4.482.099 | 4096. 4096 | sim | sim | 1 | 1.10×1.99×1.01 | 20.9 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/calça_Guardião_Arcano.glb` | equipamento | 1.499.262 | 4.480.967 | 2048. 2048 | sim | sim | 1 | 1.08×1.99×0.64 | 19.5 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capa_Guardião_Arcano.glb` | equipamento | 1.499.411 | 4.489.577 | 2048. 2048 | sim | sim | 1 | 1.23×1.99×0.96 | 20.2 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capuz_Guardião_Arcano.glb` | equipamento | 1.499.527 | 4.485.917 | 4096. 4096 | sim | sim | 1 | 1.59×1.99×1.74 | 21.1 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Luvas_Mago.glb` | equipamento | 1.499.272 | 4.485.912 | 2048. 2048 | sim | sim | 1 | 1.60×1.99×0.84 | 20.1 MB | 5.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Peitoral_Mago.glb` | equipamento | 1.499.342 | 4.492.037 | 2048. 2048 | sim | sim | 1 | 1.60×1.99×0.94 | 21.5 MB | 7.999 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/amuleto_Mago.glb` | equipamento | 1.497.341 | 4.410.825 | 2048. 2048 | sim | sim | 1 | 1.28×1.99×0.36 | 15.9 MB | 2.499 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/bota_Mago.glb` | equipamento | 1.499.374 | 4.482.175 | 2048. 2048 | sim | sim | 1 | 1.30×1.99×1.07 | 20.5 MB | 5.998 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/calça_Mago.glb` | equipamento | 1.499.657 | 4.493.561 | 2048. 2048 | sim | sim | 1 | 1.21×1.99×1.01 | 21.6 MB | 5.999 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capa_Mago.glb` | equipamento | 1.499.180 | 4.485.365 | 2048. 2048 | sim | sim | 1 | 0.97×1.98×0.73 | 19.2 MB | 5.998 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capuz_Mago.glb` | equipamento | 1.499.402 | 4.489.245 | 2048. 2048 | sim | sim | 1 | 1.42×1.98×1.61 | 21.2 MB | 5.998 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/Armadura_Patrulheiro.glb` | equipamento | 1.499.456 | 4.492.423 | 4096. 4096 | sim | sim | 1 | 1.85×1.99×1.10 | 22.2 MB | 7.998 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/amulerto_patrulheiro.glb` | equipamento | 1.497.108 | 4.445.034 | 4096. 4096 | sim | sim | 1 | 1.04×1.99×0.65 | 17.4 MB | 2.500 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/bota_patrulheiro.glb` | equipamento | 1.499.554 | 4.488.048 | 4096. 4096 | sim | sim | 1 | 1.31×1.99×1.15 | 22.3 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/calça_patrulheiro.glb` | equipamento | 1.499.016 | 4.481.695 | 4096. 4096 | sim | sim | 1 | 1.14×1.99×0.64 | 19.5 MB | 5.998 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capa_patrulheiro.glb` | equipamento | 1.499.458 | 4.492.222 | 4096. 4096 | sim | sim | 1 | 1.08×1.99×0.97 | 22.0 MB | 5.999 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capuz_patrulheiro.glb` | equipamento | 1.499.508 | 4.492.249 | 4096. 4096 | sim | sim | 1 | 1.99×1.75×1.99 | 21.6 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/luvas_patrulheiro.glb` | equipamento | 1.499.366 | 4.489.211 | 4096. 4096 | sim | sim | 1 | 1.72×1.98×0.76 | 21.7 MB | 5.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Amuleto_Guerreiro.glb` | equipamento | 1.496.595 | 4.438.169 | 2048. 2048 | sim | sim | 1 | 1.46×1.99×1.10 | 16.5 MB | 2.500 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Botas_Guerreiro.glb` | equipamento | 1.499.678 | 4.487.497 | 2048. 2048 | sim | sim | 1 | 1.65×1.99×1.48 | 21.7 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Luva_Guerreiro.glb` | equipamento | 1.499.348 | 4.488.866 | 2048. 2048 | sim | sim | 1 | 1.84×1.99×0.97 | 20.5 MB | 4.998 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Peitoral_Guerreiro.glb` | equipamento | 1.499.296 | 4.491.398 | 2048. 2048 | sim | sim | 1 | 1.97×1.99×1.20 | 21.4 MB | 7.998 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/calça_Guerreiro.glb` | equipamento | 1.498.926 | 4.480.819 | 2048. 2048 | sim | sim | 1 | 1.14×1.99×0.60 | 19.4 MB | 5.998 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capa_Guerreiro.glb` | equipamento | 1.499.546 | 4.491.764 | 2048. 2048 | sim | sim | 1 | 1.16×1.98×1.15 | 21.0 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capuz_Guerreiro.glb` | equipamento | 1.499.521 | 4.489.906 | 2048. 2048 | sim | sim | 1 | 1.64×1.83×1.99 | 21.0 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Amardura_Assasino.glb` | equipamento | 1.499.200 | 4.488.811 | 2048. 2048 | sim | sim | 1 | 1.57×1.99×0.81 | 20.2 MB | 8.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Botas_Assasino.glb` | equipamento | 1.499.516 | 4.492.183 | 2048. 2048 | sim | sim | 1 | 1.41×1.99×1.10 | 20.8 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Capuz_Assasino.glb` | equipamento | 1.499.256 | 4.485.198 | 2048. 2048 | sim | sim | 1 | 1.48×1.99×1.59 | 20.0 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Luvas_Assasino.glb` | equipamento | 1.499.188 | 4.484.990 | 2048. 2048 | sim | sim | 1 | 1.54×1.99×0.72 | 19.9 MB | 4.998 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/amuleto_Assasino.glb` | equipamento | 1.497.492 | 4.422.188 | 2048. 2048 | sim | sim | 1 | 1.09×1.99×0.71 | 16.4 MB | 2.500 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/calça_Assasino.glb` | equipamento | 1.499.070 | 4.482.006 | 4096. 4096 | sim | sim | 1 | 1.07×1.99×0.63 | 20.0 MB | 5.998 tri |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/capa_assasino.glb` | equipamento | 1.499.364 | 4.491.235 | 2048. 2048 | sim | sim | 1 | 1.10×1.98×0.86 | 20.2 MB | 5.998 tri |
| `assets/Criar_Personagem/Barbas/Barba_Cacheada.glb` | parte | 417.274 | 244.388 | 2048. 2048. 2048 | sim | não | 1 | 1.75×1.89×1.09 | 19.0 MB | 4.998 tri |
| `assets/Criar_Personagem/Barbas/Barba_Curta.glb` | parte | 548.708 | 349.954 | 2048. 2048. 2048 | sim | não | 1 | 1.89×1.37×1.40 | 22.9 MB | 5.000 tri |
| `assets/Criar_Personagem/Barbas/Barba_Longa.glb` | parte | 105.440 | 60.151 | 2048. 2048. 2048 | sim | não | 1 | 1.71×1.90×0.98 | 8.8 MB | 5.000 tri |
| `assets/Criar_Personagem/Barbas/Barba_Média.glb` | parte | 202.920 | 130.327 | 2048. 2048. 2048 | sim | não | 1 | 1.89×1.48×1.00 | 13.2 MB | 5.000 tri |
| `assets/Criar_Personagem/Barbas/Barba_Viking.glb` | parte | 187.448 | 109.260 | 2048. 2048. 2048 | sim | não | 1 | 1.53×1.89×0.81 | 12.3 MB | 4.998 tri |
| `assets/Criar_Personagem/Corpo_Feminino/Corpo_Feminino.glb` | personagem | 1.497.906 | 4.369.214 | 2048. 2048 | sim | sim | 1 | 0.76×1.99×0.35 | 15.9 MB | 16.657 tri |
| `assets/Criar_Personagem/Cabelo/Cabelo_2.glb` | parte | 1.081.170 | 625.032 | 2048. 2048. 2048 | sim | não | 1 | 1.82×1.85×1.64 | 37.8 MB | 11.996 tri |
| `assets/Criar_Personagem/Cabelo/Cabelo_3.glb` | parte | 1.709.692 | 997.647 | 2048. 2048. 2048 | sim | não | 1 | 1.78×1.89×1.81 | 59.0 MB | 11.998 tri |
| `assets/Criar_Personagem/Cabelo/Cabelo_4.glb` | parte | 966.718 | 560.851 | 2048. 2048. 2048 | sim | não | 1 | 1.76×1.72×1.89 | 37.2 MB | 12.000 tri |
| `assets/Criar_Personagem/Cabelo/Cabelo_5.glb` | parte | 1.305.646 | 769.248 | 2048. 2048. 2048 | sim | não | 1 | 1.31×1.83×1.14 | 45.3 MB | 12.000 tri |
| `assets/Criar_Personagem/Cabelo/Cabelo_6.glb` | parte | 441.942 | 259.079 | 2048. 2048. 2048 | sim | não | 1 | 0.90×1.90×1.22 | 19.7 MB | 12.000 tri |
| `assets/Criar_Personagem/Cabelo/Cabelo_8.glb` | parte | 1.020.834 | 607.783 | 2048. 2048. 2048 | sim | não | 1 | 1.20×1.87×1.09 | 38.2 MB | 11.996 tri |
| `assets/Criar_Personagem/Cabelo/cabelo_1.glb` | parte | 1.399.168 | 824.942 | 2048. 2048. 2048 | sim | não | 1 | 1.72×1.70×1.85 | 49.9 MB | 12.000 tri |
| `assets/Criar_Personagem/Cabelo/cabelo_7.glb` | parte | 1.219.358 | 770.934 | 2048. 2048. 2048 | sim | não | 1 | 1.24×1.89×1.24 | 45.4 MB | 11.998 tri |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Bota_level_1.glb` | equipamento | 1.499.372 | 4.491.323 | 4096. 4096 | sim | sim | 1 | 1.99×1.99×1.63 | 22.4 MB | 5.998 tri |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Calça_level_1.glb` | equipamento | 1.499.098 | 4.483.102 | 4096. 4096 | sim | sim | 1 | 1.11×1.99×0.66 | 20.0 MB | 6.000 tri |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capa_level_1.glb` | equipamento | 1.499.408 | 4.491.040 | 4096. 4096 | sim | sim | 1 | 1.99×1.99×1.02 | 20.9 MB | 5.998 tri |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capuz_level_1.glb` | equipamento | 1.499.514 | 4.488.466 | 4096. 4096 | sim | sim | 1 | 1.60×1.99×1.39 | 21.3 MB | 5.998 tri |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Luvas_level_1.glb` | equipamento | 1.499.368 | 4.486.224 | 4096. 4096 | sim | sim | 1 | 1.99×1.75×0.95 | 21.1 MB | 4.998 tri |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Peitoral_leve_level_1.glb` | equipamento | 1.499.492 | 4.488.322 | 4096. 4096 | sim | sim | 1 | 1.59×1.99×1.13 | 20.6 MB | 7.998 tri |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/madura_pesada_level1.glb` | equipamento | 1.499.048 | 4.485.941 | 4096. 4096 | sim | sim | 1 | 1.99×1.62×0.93 | 21.1 MB | 8.000 tri |
| `assets/Criar_Personagem/Corpo_Masculino/Corpo_Masculino.glb` | personagem | 1.497.768 | 4.391.007 | 4096. 4096 | sim | sim | 1 | 0.83×1.99×0.34 | 16.4 MB | 17.023 tri |
| `assets/armaduras_extras/drakos/drakos_extra_drakos__varia__es_da_armadura___copia__2__copia.glb` | equipamento | erro: não é GLB | | | | | | | 1048 KB | |
| `assets/armaduras_extras/drakos/drakos_n1.glb` | equipamento | erro: não é GLB | | | | | | | 132 KB | |
| `assets/armaduras_extras/drakos/drakos_n2.glb` | equipamento | erro: não é GLB | | | | | | | 127 KB | |
| `assets/armaduras_extras/drakos/drakos_n3.glb` | equipamento | erro: não é GLB | | | | | | | 130 KB | |
| `assets/armaduras_extras/drakos/drakos_n4.glb` | equipamento | erro: não é GLB | | | | | | | 120 KB | |
| `assets/armaduras_extras/drakos/drakos_n5.glb` | equipamento | erro: não é GLB | | | | | | | 122 KB | |
| `assets/armaduras_extras/drakos/drakos_n6.glb` | equipamento | erro: não é GLB | | | | | | | 134 KB | |
| `assets/armaduras_extras/drakos/drakos_n7.glb` | equipamento | erro: não é GLB | | | | | | | 134 KB | |
| `assets/armaduras_extras/lyra/lyra_n1.glb` | equipamento | erro: não é GLB | | | | | | | 104 KB | |
| `assets/armaduras_extras/lyra/lyra_n2.glb` | equipamento | erro: não é GLB | | | | | | | 91 KB | |
| `assets/armaduras_extras/lyra/lyra_n3.glb` | equipamento | erro: não é GLB | | | | | | | 94 KB | |
| `assets/armaduras_extras/lyra/lyra_n4.glb` | equipamento | erro: não é GLB | | | | | | | 98 KB | |
| `assets/armaduras_extras/lyra/lyra_n5.glb` | equipamento | erro: não é GLB | | | | | | | 99 KB | |
| `assets/armaduras_extras/lyra/lyra_n6.glb` | equipamento | erro: não é GLB | | | | | | | 95 KB | |
| `assets/armaduras_extras/lyra/lyra_n7.glb` | equipamento | erro: não é GLB | | | | | | | 97 KB | |
| `assets/armaduras_extras/lyra/lyra_n8.glb` | equipamento | erro: não é GLB | | | | | | | 97 KB | |
| `assets/armaduras_extras/kael/kael_cyberpunk.glb` | equipamento | erro: não é GLB | | | | | | | 2499 KB | |
| `assets/armaduras_extras/kael/kael_n1.glb` | equipamento | 238.318 | 132.333 | 2048. 2048. 2048 | sim | não | 1 | 1.36×1.90×0.70 | 14.0 MB | — |
| `assets/armaduras_extras/kael/kael_n2.glb` | equipamento | 136.878 | 76.885 | 2048. 2048. 2048 | sim | não | 1 | 1.33×1.90×0.47 | 11.7 MB | — |
| `assets/armaduras_extras/kael/kael_n3.glb` | equipamento | erro: não é GLB | | | | | | | 113 KB | |
| `assets/armaduras_extras/kael/kael_n4.glb` | equipamento | erro: não é GLB | | | | | | | 107 KB | |
| `assets/armaduras_extras/kael/kael_n5.glb` | equipamento | erro: não é GLB | | | | | | | 116 KB | |
| `assets/armaduras_extras/kael/kael_n6.glb` | equipamento | erro: não é GLB | | | | | | | 115 KB | |
| `assets/armaduras_extras/kael/kael_n7.glb` | equipamento | erro: não é GLB | | | | | | | 122 KB | |
| `assets/armaduras_extras/orion/orion_extra_ficha_de_refer_ncia_da_armadura_orion___copia_copia.glb` | equipamento | erro: não é GLB | | | | | | | 694 KB | |
| `assets/armaduras_extras/orion/orion_n1.glb` | equipamento | erro: não é GLB | | | | | | | 105 KB | |
| `assets/armaduras_extras/orion/orion_n2.glb` | equipamento | erro: não é GLB | | | | | | | 100 KB | |
| `assets/armaduras_extras/orion/orion_n3.glb` | equipamento | erro: não é GLB | | | | | | | 101 KB | |
| `assets/armaduras_extras/orion/orion_n4.glb` | equipamento | erro: não é GLB | | | | | | | 105 KB | |
| `assets/armaduras_extras/orion/orion_n5.glb` | equipamento | erro: não é GLB | | | | | | | 106 KB | |
| `assets/armaduras_extras/orion/orion_n6.glb` | equipamento | erro: não é GLB | | | | | | | 105 KB | |
| `assets/armaduras_extras/orion/orion_n7.glb` | equipamento | erro: não é GLB | | | | | | | 377 KB | |
| `assets/armas/eclipse/drakos_machado.glb` | arma | 36.180 | 21.997 | 2048. 2048. 2048 | sim | não | 1 | 0.85×1.90×0.17 | 9.5 MB | — |
| `assets/armas/eclipse/drakos_martelo.glb` | arma | 42.622 | 24.535 | 2048. 2048. 2048 | sim | não | 1 | 0.65×1.88×0.53 | 8.9 MB | — |
| `assets/armas/eclipse/kael_espada.glb` | arma | 23.850 | 14.879 | 2048. 2048. 2048 | sim | não | 1 | 1.90×0.70×0.85 | 9.5 MB | — |
| `assets/armas/eclipse/kael_espada_oficial.glb` | arma | 10.862 | 7.636 | 2048. 2048. 2048 | sim | não | 1 | 0.41×1.90×0.09 | 8.2 MB | — |
| `assets/armas/eclipse/lyra_arco.glb` | arma | 34.474 | 21.554 | 2048. 2048. 2048 | sim | não | 1 | 0.72×1.90×0.11 | 9.5 MB | — |
| `assets/armas/eclipse/orion_laminas_v1.glb` | arma | 62.426 | 36.659 | 2048. 2048. 2048 | sim | não | 1 | 0.72×1.90×0.09 | 10.6 MB | — |
| `assets/armas/eclipse/orion_laminas_v2.glb` | arma | 39.400 | 24.640 | 2048. 2048. 2048 | sim | não | 1 | 0.64×1.90×0.07 | 10.3 MB | — |
| `assets/armas/eclipse/orion_primaria.glb` | arma | 23.672 | 15.027 | 4096. 2048. 4096 | sim | não | 1 | 0.29×1.90×0.12 | 24.4 MB | — |
| `assets/armas/eclipse/orion_secundaria.glb` | arma | 48.088 | 28.610 | 2048. 2048. 2048 | sim | não | 1 | 1.90×0.89×0.22 | 8.5 MB | — |
| `assets/armas/eclipse/sera_bastao.glb` | arma | 21.138 | 13.977 | 2048. 2048. 2048 | sim | não | 1 | 1.90×0.25×0.12 | 9.7 MB | — |
| `assets/armas/eclipse/sera_drone.glb` | arma | 604.676 | 329.638 | 2048. 2048. 2048 | sim | não | 1 | 1.86×1.70×1.90 | 25.8 MB | — |

## Imagens

| Arquivo | Dimensões | Alfa | Tamanho |
|---|---|---|---|
| `assets/modelos/armaduras/drakos/drakos_n1.png` | 225×312 | sim | 132 KB |
| `assets/modelos/armaduras/drakos/drakos_n2.png` | 221×313 | sim | 127 KB |
| `assets/modelos/armaduras/drakos/drakos_n3.png` | 219×314 | sim | 130 KB |
| `assets/modelos/armaduras/drakos/drakos_n4.png` | 201×315 | sim | 120 KB |
| `assets/modelos/armaduras/drakos/drakos_n5.png` | 201×313 | sim | 122 KB |
| `assets/modelos/armaduras/drakos/drakos_n6.png` | 200×322 | sim | 134 KB |
| `assets/modelos/armaduras/drakos/drakos_n7.png` | 224×316 | sim | 134 KB |
| `assets/modelos/armaduras/lyra/lyra_n1.png` | 189×299 | sim | 104 KB |
| `assets/modelos/armaduras/lyra/lyra_n2.png` | 170×286 | sim | 91 KB |
| `assets/modelos/armaduras/lyra/lyra_n3.png` | 173×286 | sim | 94 KB |
| `assets/modelos/armaduras/lyra/lyra_n4.png` | 168×286 | sim | 98 KB |
| `assets/modelos/armaduras/lyra/lyra_n5.png` | 171×286 | sim | 99 KB |
| `assets/modelos/armaduras/lyra/lyra_n6.png` | 175×286 | sim | 95 KB |
| `assets/modelos/armaduras/lyra/lyra_n7.png` | 174×286 | sim | 97 KB |
| `assets/modelos/armaduras/lyra/lyra_n8.png` | 172×288 | sim | 97 KB |
| `assets/modelos/armaduras/kael/kael_n1.png` | 214×312 | sim | 112 KB |
| `assets/modelos/armaduras/kael/kael_n2.png` | 212×311 | sim | 108 KB |
| `assets/modelos/armaduras/kael/kael_n3.png` | 212×317 | sim | 113 KB |
| `assets/modelos/armaduras/kael/kael_n4.png` | 210×318 | sim | 107 KB |
| `assets/modelos/armaduras/kael/kael_n5.png` | 211×321 | sim | 116 KB |
| `assets/modelos/armaduras/kael/kael_n6.png` | 216×317 | sim | 115 KB |
| `assets/modelos/armaduras/kael/kael_n7.png` | 212×320 | sim | 122 KB |
| `assets/modelos/armaduras/sera/sera_n1.png` | 161×262 | sim | 84 KB |
| `assets/modelos/armaduras/sera/sera_n2.png` | 172×263 | sim | 89 KB |
| `assets/modelos/armaduras/sera/sera_n3.png` | 165×260 | sim | 85 KB |
| `assets/modelos/armaduras/sera/sera_n4.png` | 170×259 | sim | 90 KB |
| `assets/modelos/armaduras/sera/sera_n5.png` | 163×263 | sim | 88 KB |
| `assets/modelos/armaduras/sera/sera_n6.png` | 170×260 | sim | 87 KB |
| `assets/modelos/armaduras/sera/sera_n7.png` | 172×262 | sim | 86 KB |
| `assets/modelos/armaduras/orion/orion_n1.png` | 218×308 | sim | 105 KB |
| `assets/modelos/armaduras/orion/orion_n2.png` | 221×308 | sim | 100 KB |
| `assets/modelos/armaduras/orion/orion_n3.png` | 223×308 | sim | 101 KB |
| `assets/modelos/armaduras/orion/orion_n4.png` | 216×308 | sim | 105 KB |
| `assets/modelos/armaduras/orion/orion_n5.png` | 220×308 | sim | 106 KB |
| `assets/modelos/armaduras/orion/orion_n6.png` | 223×308 | sim | 105 KB |
| `assets/modelos/armaduras/orion/orion_n7.png` | 386×508 | sim | 377 KB |
| `assets/images/capa.jpg` | 1254×1254 | não | 387 KB |
| `assets/images/drakos_back.webp` | 698×1002 | sim | 45 KB |
| `assets/images/drakos_front.webp` | 720×1003 | sim | 51 KB |
| `assets/images/drakos_sideL.webp` | 244×1019 | sim | 30 KB |
| `assets/images/drakos_sideR.webp` | 246×1017 | sim | 29 KB |
| `assets/images/kael_costas.jpg` | 1214×1295 | não | 340 KB |
| `assets/images/kael_ficha.jpg` | 1536×1024 | não | 428 KB |
| `assets/images/kael_frente.jpg` | 1024×1536 | não | 367 KB |
| `assets/images/kael_frente_pose_a.webp` | 1024×1536 | não | 252 KB |
| `assets/images/kael_sprites_ref.jpg` | 1536×1024 | não | 384 KB |
| `assets/images/lyra_back.webp` | 536×984 | sim | 37 KB |
| `assets/images/lyra_front.webp` | 545×1008 | sim | 32 KB |
| `assets/images/lyra_sideL.webp` | 253×1014 | sim | 24 KB |
| `assets/images/lyra_sideR.webp` | 247×1015 | sim | 25 KB |
| `assets/images/orion_back.webp` | 605×984 | sim | 35 KB |
| `assets/images/orion_front.webp` | 623×1006 | sim | 40 KB |
| `assets/images/orion_sideL.webp` | 252×1027 | sim | 25 KB |
| `assets/images/orion_sideR.webp` | 250×1033 | sim | 25 KB |
| `assets/images/retratos_elenco.webp` | 1536×1024 | não | 295 KB |
| `assets/images/sera_back.webp` | 526×939 | sim | 43 KB |
| `assets/images/sera_front.webp` | 543×1001 | sim | 56 KB |
| `assets/images/sera_sideL.webp` | 284×974 | sim | 34 KB |
| `assets/images/sera_sideR.webp` | 286×974 | sim | 37 KB |
| `assets/images/fx/aura/anel_pulso.png` | 256×256 | sim | 31 KB |
| `assets/images/fx/aura/aura_dourado.png` | 256×256 | sim | 51 KB |
| `assets/images/fx/aura/aura_drakos.png` | 256×256 | sim | 48 KB |
| `assets/images/fx/aura/aura_kael.png` | 256×256 | sim | 49 KB |
| `assets/images/fx/aura/aura_lyra.png` | 256×256 | sim | 48 KB |
| `assets/images/fx/aura/aura_orion.png` | 256×256 | sim | 48 KB |
| `assets/images/fx/aura/aura_sera.png` | 256×256 | sim | 53 KB |
| `assets/images/fx/fumaca/fumaca_combate.png` | 128×128 | sim | 12 KB |
| `assets/images/fx/fumaca/plasma_azul.png` | 128×128 | sim | 13 KB |
| `assets/images/fx/fumaca/plasma_ciano.png` | 128×128 | sim | 13 KB |
| `assets/images/fx/fumaca/plasma_laranja.png` | 128×128 | sim | 14 KB |
| `assets/images/fx/fumaca/vapor_neutro.png` | 128×128 | sim | 14 KB |
| `assets/Criar_Personagem/Rosto/rosto_1.png` | 381×503 | sim | 261 KB |
| `assets/Criar_Personagem/Rosto/rosto_2.png` | 357×482 | sim | 248 KB |
| `assets/Criar_Personagem/Rosto/rosto_3.png` | 381×500 | sim | 260 KB |
| `assets/Criar_Personagem/Rosto/rosto_4.png` | 381×497 | sim | 245 KB |
| `assets/Criar_Personagem/Rosto/rosto_5.png` | 382×492 | sim | 249 KB |
| `assets/Criar_Personagem/Rosto/rosto_6.png` | 379×511 | sim | 256 KB |
| `assets/Criar_Personagem/Rosto/rosto_7.png` | 375×519 | sim | 250 KB |
| `assets/Criar_Personagem/Rosto/rosto_8.png` | 368×521 | sim | 247 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Luvas_Guardião_Arcano.png` | 156×161 | sim | 47 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Peitoral_Guardião_Arcano.png` | 165×211 | sim | 69 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/amuleto_Guardião_Arcano.png` | 168×133 | sim | 32 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/botas_Guardião_Arcano.png` | 126×194 | sim | 50 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/calça_Guardião_Arcano.png` | 126×203 | sim | 53 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capa_Guardião_Arcano.png` | 135×223 | sim | 56 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capuz_Guardião_Arcano.png` | 134×167 | sim | 41 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Catálogo de Equipamentos Eclipse Zero.png` | 277×946 | sim | 430 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Luvas_Mago.png` | 130×163 | sim | 44 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Peitoral_Mago.png` | 163×219 | sim | 72 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/amuleto_Mago.png` | 177×143 | sim | 31 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/bota_Mago.png` | 145×199 | sim | 54 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/calça_Mago.png` | 130×214 | sim | 53 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capa_Mago.png` | 114×229 | sim | 49 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capuz_Mago.png` | 123×161 | sim | 36 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/Armadura_Patrulheiro.png` | 179×204 | sim | 76 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/Catálogo de Equipamentos Eclipse Zero.png` | 306×946 | sim | 476 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/amulerto_patrulheiro.png` | 229×140 | sim | 36 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/bota_patrulheiro.png` | 154×199 | sim | 59 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/calça_patrulheiro.png` | 149×204 | sim | 59 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capa_patrulheiro.png` | 127×214 | sim | 53 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capuz_patrulheiro.png` | 155×173 | sim | 48 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/luvas_patrulheiro.png` | 144×150 | sim | 43 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Amuleto_Guerreiro.png` | 201×146 | sim | 32 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Botas_Guerreiro.png` | 171×190 | sim | 58 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Catálogo de Equipamentos Eclipse Zero - Copia.png` | 323×946 | sim | 472 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Luva_Guerreiro.png` | 146×159 | sim | 44 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Peitoral_Guerreiro.png` | 181×201 | sim | 73 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/calça_Guerreiro.png` | 128×201 | sim | 51 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capa_Guerreiro.png` | 147×230 | sim | 59 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capuz_Guerreiro.png` | 159×164 | sim | 42 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Amardura_Assasino.png` | 151×205 | sim | 62 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Botas_Assasino.png` | 1024×1536 | sim | 2443 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Capuz_Assasino.png` | 127×157 | sim | 34 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Catálogo de Equipamentos Eclipse Zero.png` | 302×938 | sim | 441 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Luvas_Assasino.png` | 132×162 | sim | 40 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/amuleto_Assasino.png` | 207×135 | sim | 32 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/calça_Assasino.png` | 138×198 | sim | 51 KB |
| `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/capa_Assasino.png` | 131×227 | sim | 52 KB |
| `assets/Criar_Personagem/Barbas/Barba_Cacheada.png` | 228×237 | sim | 88 KB |
| `assets/Criar_Personagem/Barbas/Barba_Curta.png` | 246×203 | sim | 62 KB |
| `assets/Criar_Personagem/Barbas/Barba_Longa.png` | 185×222 | sim | 64 KB |
| `assets/Criar_Personagem/Barbas/Barba_Média.png` | 201×222 | sim | 63 KB |
| `assets/Criar_Personagem/Barbas/Barba_Viking.png` | 180×224 | sim | 75 KB |
| `assets/Criar_Personagem/Corpo_Feminino/Corpo_Feminino.png` | 440×1024 | sim | 504 KB |
| `assets/Criar_Personagem/Corpo_Feminino/Folha_de_referência_Feminina.png` | 1536×1024 | não | 1597 KB |
| `assets/Criar_Personagem/Cabelo/Cabelo_3.png` | 761×790 | sim | 1013 KB |
| `assets/Criar_Personagem/Cabelo/Cabelo_4.png` | 678×708 | sim | 814 KB |
| `assets/Criar_Personagem/Cabelo/cabelo_1.png` | 365×491 | sim | 276 KB |
| `assets/Criar_Personagem/Cabelo/cabelo_2.png` | 348×406 | sim | 219 KB |
| `assets/Criar_Personagem/Cabelo/cabelo_5.png` | 390×569 | sim | 335 KB |
| `assets/Criar_Personagem/Cabelo/cabelo_6.png` | 312×594 | sim | 283 KB |
| `assets/Criar_Personagem/Cabelo/cabelo_7.png` | 317×565 | sim | 306 KB |
| `assets/Criar_Personagem/Cabelo/cabelo_8.png` | 378×598 | sim | 377 KB |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Bota_level_1.png` | 350×240 | sim | 126 KB |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Calça_level_1.png` | 194×285 | sim | 91 KB |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capa_level_1.png` | 298×303 | sim | 121 KB |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capuz_level_1.png` | 229×284 | sim | 93 KB |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Luvas_level_1.png` | 264×253 | sim | 107 KB |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Peitoral_leve_level_1.png` | 275×272 | sim | 116 KB |
| `assets/Criar_Personagem/Armaduras_Inicial_Level_1/madura_pesada_level1.png` | 365×277 | sim | 163 KB |
| `assets/Criar_Personagem/Corpo_Masculino/Corpor_Mascuilino.png` | 444×1115 | sim | 573 KB |
| `assets/Criar_Personagem/Corpo_Masculino/Folha_de_referência_corporal_Masculino.png` | 1411×1115 | não | 1661 KB |
| `assets/icons/apple-touch-icon.png` | 180×180 | não | 48 KB |
| `assets/icons/icon-192.png` | 192×192 | não | 54 KB |
| `assets/icons/icon-512.png` | 512×512 | não | 285 KB |
| `assets/icons/icon-maskable-512.png` | 512×512 | não | 234 KB |
| `assets/armas/eclipse/drakos_machado.png` | 159×416 | sim | 95 KB |
| `assets/armas/eclipse/drakos_martelo.png` | 168×404 | sim | 87 KB |
| `assets/armas/eclipse/kael_espada.png` | 1126×659 | sim | 468 KB |
| `assets/armas/eclipse/kael_espada_oficial.png` | 163×536 | sim | 128 KB |
| `assets/armas/eclipse/lyra_arco.png` | 461×1024 | sim | 478 KB |
| `assets/armas/eclipse/orion_laminas_v1.png` | 489×1280 | sim | 654 KB |
| `assets/armas/eclipse/orion_laminas_v2.png` | 640×960 | sim | 407 KB |
| `assets/armas/eclipse/orion_primaria.png` | 238×428 | sim | 150 KB |
| `assets/armas/eclipse/orion_secundaria.png` | 317×310 | sim | 129 KB |
| `assets/armas/eclipse/sera_bastao.png` | 1098×542 | sim | 365 KB |
| `assets/armas/eclipse/sera_drone.png` | 747×999 | sim | 958 KB |
| `assets/selecionar_personagem/drakos_base.png` | 935×262 | sim | 260 KB |
| `assets/selecionar_personagem/drakos_full.png` | 336×722 | sim | 419 KB |
| `assets/selecionar_personagem/esquadrao_neon.png` | 1774×887 | não | 2437 KB |
| `assets/selecionar_personagem/kael_base.png` | 846×310 | sim | 240 KB |
| `assets/selecionar_personagem/kael_full.png` | 322×719 | sim | 422 KB |
| `assets/selecionar_personagem/lyra_base.png` | 892×299 | sim | 248 KB |
| `assets/selecionar_personagem/lyra_full.png` | 329×692 | sim | 409 KB |
| `assets/selecionar_personagem/orion_base.png` | 899×258 | sim | 238 KB |
| `assets/selecionar_personagem/orion_full.png` | 396×732 | sim | 497 KB |
| `assets/selecionar_personagem/rosto_drakos.jpeg` | 571×494 | não | 74 KB |
| `assets/selecionar_personagem/rosto_kael.jpeg` | 507×512 | não | 66 KB |
| `assets/selecionar_personagem/rosto_lyra.jpeg` | 509×509 | não | 74 KB |
| `assets/selecionar_personagem/rosto_orion.jpeg` | 508×508 | não | 68 KB |
| `assets/selecionar_personagem/rosto_sera.jpeg` | 568×496 | não | 82 KB |
| `assets/selecionar_personagem/sera_base.png` | 847×268 | sim | 251 KB |
| `assets/selecionar_personagem/sera_full.png` | 308×678 | sim | 378 KB |
| `assets/backgroundstory/eclipse.png` | 1897×829 | não | 1957 KB |
| `assets/backgroundstory/homem_de_preto.png` | 1672×941 | não | 1686 KB |
| `assets/backgroundstory/mundo_sem_sol.png` | 1670×942 | não | 2031 KB |
| `assets/backgroundstory/prologo_citacao.png` | 1672×941 | não | 1925 KB |
