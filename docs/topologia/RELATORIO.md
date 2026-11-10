# Topologia inteligente — diagnóstico dos modelos 3D

Gerado por `tools/topologia/diagnostico.py` (só leitura; nenhum modelo foi alterado). 369 arquivos: 230 GLB/GLTF analisados, 5 fontes (.blend/.fbx/.obj, só inventário), 134 não lidos.

## Resumo por tipo

| tipo | modelos | triângulos (total) | maior | orçamento | retopologia | correção | LOD |
|---|---|---|---|---|---|---|---|
| arma | 12 | 947,970 | 604,676 | 6,000 | 0 | 0 | 11 |
| armadura | 98 | 7,266,462 | 306,806 | 12,000 | 38 | 20 | 38 |
| barba | 18 | 1,555,702 | 548,708 | 6,000 | 6 | 0 | 12 |
| cabelo | 23 | 9,253,812 | 1,709,692 | 12,000 | 8 | 15 | 9 |
| cenario | 12 | 4,350 | 872 | 4,000 | 0 | 0 | 0 |
| construcao | 32 | 41,944 | 7,652 | 8,000 | 0 | 0 | 0 |
| criatura | 5 | 165,496 | 127,298 | 12,000 | 1 | 0 | 2 |
| natureza | 16 | 7,410 | 1,276 | 3,000 | 0 | 1 | 0 |
| personagem | 5 | 877,232 | 250,892 | 30,000 | 5 | 0 | 5 |
| pet | 1 | 128,844 | 128,844 | 8,000 | 1 | 0 | 1 |
| rosto | 8 | 555,212 | 75,036 | 12,000 | 8 | 0 | 8 |

## Precisam de retopologia

| arquivo | tipo | triângulos | finos | não manifold | cascas | problemas |
|---|---|---|---|---|---|---|
| `assets/Criar_Personagem/Cabelo/Cabelo_3.glb` | cabelo | 1,709,692 | 0.02% | 0 | 1 |  |
| `assets/Criar_Personagem/Cabelo/cabelo_1.glb` | cabelo | 1,399,168 | 0.03% | 0 | 1 |  |
| `assets/Criar_Personagem/Cabelo/Cabelo_5.glb` | cabelo | 1,305,646 | 0.03% | 0 | 1 |  |
| `assets/Criar_Personagem/Cabelo/cabelo_7.glb` | cabelo | 1,219,358 | 0.05% | 0 | 1 |  |
| `assets/Criar_Personagem/Cabelo/Cabelo_2.glb` | cabelo | 1,081,170 | 0.02% | 0 | 1 |  |
| `assets/Criar_Personagem/Cabelo/Cabelo_8.glb` | cabelo | 1,020,834 | 0.03% | 0 | 1 |  |
| `assets/Criar_Personagem/Cabelo/Cabelo_4.glb` | cabelo | 966,718 | 0.03% | 0 | 8 |  |
| `assets/Criar_Personagem/Barbas/Barba_Curta.glb` | barba | 548,708 | 0.04% | 0 | 1 |  |
| `assets/Criar_Personagem/Cabelo/Cabelo_6.glb` | cabelo | 441,942 | 0.03% | 0 | 2 |  |
| `assets/Criar_Personagem/Barbas/Barba_Cacheada.glb` | barba | 417,274 | 0.01% | 0 | 2 |  |
| `assets/modelos/armaduras/drakos/drakos_n6.glb` | armadura | 306,806 | 0.02% | 0 | 1 |  |
| `assets/modelos/armaduras/drakos/drakos_n4.glb` | armadura | 267,020 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/orion/orion_n4.glb` | armadura | 254,372 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/drakos/drakos_n1.glb` | armadura | 253,472 | 0.02% | 0 | 1 |  |
| `assets/modelos/kael_meshy.glb` | personagem | 250,892 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/drakos/drakos_n5.glb` | armadura | 248,656 | 0.0% | 0 | 1 |  |
| `assets/modelos/armaduras/sera/sera_n1.glb` | armadura | 242,190 | 0.03% | 0 | 1 |  |
| `assets/modelos/armaduras/drakos/drakos_n3.glb` | armadura | 242,062 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/drakos/drakos_n2.glb` | armadura | 240,970 | 0.0% | 0 | 1 |  |
| `assets/armaduras_extras/kael/kael_n1.glb` | armadura | 238,318 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/kael/kael_n1.glb` | armadura | 238,318 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/kael/kael_n6.glb` | armadura | 220,294 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/lyra/lyra_n8.glb` | armadura | 217,824 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/orion/orion_n5.glb` | armadura | 212,928 | 0.01% | 0 | 1 |  |
| `assets/Criar_Personagem/Barbas/Barba_Média.glb` | barba | 202,920 | 0.05% | 0 | 3 |  |
| `assets/modelos/armaduras/kael/kael_n3.glb` | armadura | 197,796 | 0.01% | 0 | 1 |  |
| `assets/modelos/sera.glb` | personagem | 194,770 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/kael/kael_n7.glb` | armadura | 190,672 | 0.02% | 0 | 1 |  |
| `assets/Criar_Personagem/Barbas/Barba_Viking.glb` | barba | 187,448 | 0.03% | 0 | 1 |  |
| `assets/modelos/armaduras/drakos/drakos_n7.glb` | armadura | 186,818 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/lyra/lyra_n7.glb` | armadura | 186,134 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/sera/sera_n2.glb` | armadura | 185,844 | 0.01% | 0 | 1 |  |
| `assets/modelos/lyra.glb` | personagem | 172,520 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/sera/sera_n6.glb` | armadura | 171,046 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/sera/sera_n3.glb` | armadura | 170,636 | 0.01% | 0 | 5 |  |
| `assets/modelos/armaduras/orion/orion_n2.glb` | armadura | 167,878 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/lyra/lyra_n6.glb` | armadura | 164,786 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/kael/kael_n5.glb` | armadura | 163,662 | 0.02% | 0 | 3 |  |
| `assets/modelos/armaduras/lyra/lyra_n4.glb` | armadura | 162,238 | 0.01% | 0 | 2 |  |
| `assets/modelos/armaduras/orion/orion_n7.glb` | armadura | 160,908 | 0.02% | 0 | 6 |  |
| `assets/modelos/armaduras/sera/sera_n4.glb` | armadura | 160,372 | 0.01% | 0 | 5 |  |
| `assets/modelos/armaduras/sera/sera_n5.glb` | armadura | 159,972 | 0.01% | 0 | 2 |  |
| `assets/modelos/drakos.glb` | personagem | 159,950 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/sera/sera_n7.glb` | armadura | 158,028 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/lyra/lyra_n5.glb` | armadura | 157,098 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/lyra/lyra_n3.glb` | armadura | 152,794 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/orion/orion_n1.glb` | armadura | 151,632 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/lyra/lyra_n1.glb` | armadura | 150,650 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/orion/orion_n6.glb` | armadura | 148,916 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/lyra/lyra_n2.glb` | armadura | 142,964 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/orion/orion_n3.glb` | armadura | 140,752 | 0.01% | 0 | 1 |  |
| `assets/armaduras_extras/kael/kael_n2.glb` | armadura | 136,878 | 0.01% | 0 | 1 |  |
| `assets/modelos/armaduras/kael/kael_n2.glb` | armadura | 136,878 | 0.01% | 0 | 1 |  |
| `assets/Creatures/Pets/Exotic/asa_noturna/fonte/Meshy_AI_Azure_Nightwing_1101011952_texture.glb` | pet | 128,844 | 0.02% | 0 | 1 |  |
| `assets/Creatures/Enemies/lobo_sombra_neon/fonte/Meshy_AI_Neon_Shadow_Wolf_1101011401_texture.glb` | criatura | 127,298 | 0.02% | 0 | 1 |  |
| `assets/Criar_Personagem/Barbas/Barba_Longa.glb` | barba | 105,440 | 0.0% | 0 | 1 |  |
| `assets/modelos/armaduras/kael/kael_n4.glb` | armadura | 99,906 | 0.01% | 0 | 1 |  |
| `assets/modelos/orion.glb` | personagem | 99,100 | 0.01% | 0 | 1 |  |
| `assets/Criar_Personagem/Rosto/rosto_2.glb` | rosto | 75,036 | 0.0% | 0 | 1 |  |
| `assets/Criar_Personagem/Rosto/rosto_4.glb` | rosto | 74,926 | 0.0% | 0 | 1 |  |
| `assets/Criar_Personagem/Rosto/rosto_3.glb` | rosto | 73,594 | 0.0% | 0 | 1 |  |
| `assets/Criar_Personagem/Rosto/Rosto_1.glb` | rosto | 69,796 | 0.0% | 0 | 1 |  |
| `assets/Criar_Personagem/Rosto/rosto_6.glb` | rosto | 68,452 | 0.0% | 0 | 1 |  |
| `assets/Criar_Personagem/Rosto/rosto_5.glb` | rosto | 67,152 | 0.0% | 0 | 1 |  |
| `assets/Criar_Personagem/Rosto/rosto_7.glb` | rosto | 63,944 | 0.0% | 0 | 1 |  |
| `assets/Criar_Personagem/Rosto/rosto_8.glb` | rosto | 62,312 | 0.0% | 0 | 1 |  |
| `assets/Criar_Personagem/Barbas_Blender/longa.glb` | barba | 17,472 | 0.0% | 0 | 462 |  |

## Precisam de correção (sem retopologia)

| arquivo | tipo | triângulos | problemas |
|---|---|---|---|
| `assets/Criar_Personagem/Cabelo_Fisica/longo.glb` | cabelo | 13,760 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/repicado.glb` | cabelo | 11,296 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/ondulado.glb` | cabelo | 9,248 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/undercut.glb` | cabelo | 8,796 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/trancas.glb` | cabelo | 8,376 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/rabo.glb` | cabelo | 8,368 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/topete.glb` | cabelo | 7,048 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/coque.glb` | cabelo | 7,032 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/moicano.glb` | cabelo | 6,240 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/raspado.glb` | cabelo | 5,880 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/medio.glb` | cabelo | 5,456 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/militar.glb` | cabelo | 5,388 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/franja.glb` | cabelo | 4,972 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/curto.glb` | cabelo | 3,760 | 252 faces degeneradas |
| `assets/Criar_Personagem/Cabelo_Fisica/espetado.glb` | cabelo | 3,664 | 252 faces degeneradas |
| `assets/Criar_Personagem/Armaduras_Level_100/Classe_Patrulheiro_nvl100/Botas_de_Couro_nivel100.glb` | armadura | 2,416 | 32 faces degeneradas |
| `assets/Criar_Personagem/Armaduras_Level_100/Classe_Assassino_nvl100/Botas_de_Couro_nivel100.glb` | armadura | 2,356 | 32 faces degeneradas |
| `assets/Criar_Personagem/Armaduras_Level_100/Guardião_Arcano_nvl100/Botas_de_Energia_nivel100.glb` | armadura | 2,236 | 32 faces degeneradas |
| `assets/Criar_Personagem/Armaduras_Level_100/Classe_Guerreiro_nvl100/Botas_de_Placas_nivel100.glb` | armadura | 2,208 | 32 faces degeneradas |
| `assets/Criar_Personagem/Armaduras_Level_100/Classe_Mago_nvl100/Botas_de_Tecido_nivel100.glb` | armadura | 2,084 | 32 faces degeneradas |
| `assets/Criar_Personagem/Armaduras_Level_100/Classe_Patrulheiro_nvl100/Capuz_do_Patrulheiro_nivel100.glb` | armadura | 1,108 | 1 faces degeneradas |
| `assets/Criar_Personagem/Armaduras_Level_100/Classe_Guerreiro_nvl100/Capuz_de_Guerreiro_nivel100.glb` | armadura | 1,106 | 1 faces degeneradas |
| `assets/Criar_Personagem/Armaduras_Level_100/Classe_Assassino_nvl100/Capuz_do_Assassino_nivel100.glb` | armadura | 1,068 | 1 faces degeneradas |
| `assets/Criar_Personagem/Armaduras_Level_100/Classe_Mago_nvl100/Capuz_do_Mago_nivel100.glb` | armadura | 1,020 | 1 faces degeneradas |
| `assets/Criar_Personagem/Armaduras_Level_100/Guardião_Arcano_nvl100/Capuz_Arcano_nivel100.glb` | armadura | 1,020 | 1 faces degeneradas |
| `assets/Criar_Personagem/Armaduras_Level_50/Classe_Mago_nvl50/Amuleto_de_Cristal_Arcano_nivel50.glb` | armadura | 542 | 2.03% de normais contra a face |
| `assets/Criar_Personagem/Armaduras_Level_50/Guardião_Arcano_nvl50/Amuleto_do_Equilíbrio_nivel50.glb` | armadura | 542 | 2.03% de normais contra a face |
| `assets/Criar_Personagem/Armaduras_Level_100/Classe_Patrulheiro_nvl100/Amuleto_da_Natureza_nivel100.glb` | armadura | 470 | 2.34% de normais contra a face |
| `assets/Criar_Personagem/Armaduras_Level_75/Classe_Patrulheiro_nvl75/Amuleto_da_Natureza_nivel75.glb` | armadura | 454 | 2.42% de normais contra a face |
| `assets/Criar_Personagem/Armaduras_Level_50/Classe_Patrulheiro_nvl50/Amuleto_da_Natureza_nivel50.glb` | armadura | 438 | 2.51% de normais contra a face |
| `assets/Criar_Personagem/Armaduras_Level_100/Classe_Assassino_nvl100/Amuleto_da_Sombra_nivel100.glb` | armadura | 326 | 3.37% de normais contra a face |
| `assets/Criar_Personagem/Armaduras_Level_50/Classe_Assassino_nvl50/Amuleto_da_Sombra_nivel50.glb` | armadura | 326 | 3.37% de normais contra a face |
| `assets/Criar_Personagem/Armaduras_Level_100/Classe_Guerreiro_nvl100/Amuleto_de_Fúria_nivel100.glb` | armadura | 302 | 6.29% de normais contra a face |
| `assets/Criar_Personagem/Armaduras_Level_50/Classe_Guerreiro_nvl50/Amuleto_de_Rubi_de_Batalha_nivel50.glb` | armadura | 302 | 6.29% de normais contra a face |
| `assets/Criar_Personagem/Armaduras_Level_75/Classe_Guerreiro_nvl75/Amuleto_de_Rubi_de_Batalha_nivel75.glb` | armadura | 302 | 6.29% de normais contra a face |
| `assets/models/natureza/samambaia.glb` | natureza | 180 | 18 faces degeneradas |

## Não lidos

- `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Bota_level_1.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Calça_level_1.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capa_level_1.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Capuz_level_1.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Luvas_level_1.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Inicial_Level_1/Peitoral_leve_level_1.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Inicial_Level_1/madura_pesada_level1.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Amardura_Assasino.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Botas_Assasino.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Capuz_Assasino.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/Luvas_Assasino.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/amuleto_Assasino.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/calça_Assasino.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Assassino_nvl30/capa_assasino.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Amuleto_Guerreiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Botas_Guerreiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Luva_Guerreiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/Peitoral_Guerreiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/calça_Guerreiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capa_Guerreiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Guerreiro_nvl30/capuz_Guerreiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Luvas_Mago.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/Peitoral_Mago.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/amuleto_Mago.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/bota_Mago.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/calça_Mago.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capa_Mago.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Mago_nvl30/capuz_Mago.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/Armadura_Patrulheiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/amulerto_patrulheiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/bota_patrulheiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/calça_patrulheiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capa_patrulheiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/capuz_patrulheiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Classe_Patrulheiro_nvl30/luvas_patrulheiro.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Luvas_Guardião_Arcano.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/Peitoral_Guardião_Arcano.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/amuleto_Guardião_Arcano.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/botas_Guardião_Arcano.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/calça_Guardião_Arcano.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capa_Guardião_Arcano.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_30/Guardião_Arcano_nvl30/capuz_Guardião_Arcano.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Assassino_nvl50/exemplo_glb/Dark_Leather_Armor.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Assassino_nvl50/exemplo_glb/Feathered_Cloak.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Assassino_nvl50/exemplo_glb/Gauntlets.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Assassino_nvl50/exemplo_glb/Hooded_Figure.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Assassino_nvl50/exemplo_glb/Purple_Gem_Boots.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Guerreiro_nvl50/exemplo_glb/Red_Fur-Collared_Cloak.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Guerreiro_nvl50/exemplo_glb/armor.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Guerreiro_nvl50/exemplo_glb/armor_boots_1.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Guerreiro_nvl50/exemplo_glb/armored_skirt.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Guerreiro_nvl50/exemplo_glb/knight_helmet.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Mago_nvl50/exemplo_glb/Blue_Armored_Boots.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Mago_nvl50/exemplo_glb/Blue_Cloak.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Mago_nvl50/exemplo_glb/Blue_Robe.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Mago_nvl50/exemplo_glb/Blue_and_Gold_Gauntlets.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Mago_nvl50/exemplo_glb/Hood.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Mago_nvl50/exemplo_glb/Shoulder_Armor.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Mago_nvl50/exemplo_glb/blue_skirt.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Patrulheiro_nvl50/exemplo_glb/Fur-Lined_Hood.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Patrulheiro_nvl50/exemplo_glb/Green_Leather_Armor.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Patrulheiro_nvl50/exemplo_glb/Leaf_Armor.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Patrulheiro_nvl50/exemplo_glb/Leaf_Boots.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Patrulheiro_nvl50/exemplo_glb/Leafy_Pants.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Patrulheiro_nvl50/exemplo_glb/Leather_Gauntlets.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Classe_Patrulheiro_nvl50/exemplo_glb/cloak.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Guardião_Arcano_nvl50/exemplo_glb/Arcane_Hood.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Guardião_Arcano_nvl50/exemplo_glb/Blue_Cloak.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Guardião_Arcano_nvl50/exemplo_glb/Blue_Crystal_Armor_Pants.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Guardião_Arcano_nvl50/exemplo_glb/Crystal_Gauntlets.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Guardião_Arcano_nvl50/exemplo_glb/Fantasy_Armor.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_50/Guardião_Arcano_nvl50/exemplo_glb/Fantasy_Boots.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Assassino_nvl75/exemplo_glb/Amuleto_da_Sombra_nivel75.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Assassino_nvl75/exemplo_glb/Botas_de_Couro_nivel75.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Assassino_nvl75/exemplo_glb/Cal_a_do_Assassino_nivel75.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Assassino_nvl75/exemplo_glb/Capuz_do_Assassino_nivel75.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Assassino_nvl75/exemplo_glb/Luvas_de_Couro_nivel75.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Assassino_nvl75/exemplo_glb/Ombreiras_Leves_nivel75.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Assassino_nvl75/exemplo_glb/Peitoral_de_Couro_nivel75.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Guerreiro_nvl75/exemplo_glb/Crimson_Robe.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Guerreiro_nvl75/exemplo_glb/Dark_Fantasy_Armor.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Guerreiro_nvl75/exemplo_glb/Demon_Helm.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Guerreiro_nvl75/exemplo_glb/Fantasy_Armor_Legs.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Guerreiro_nvl75/exemplo_glb/armor_boots_2.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Mago_nvl75/exemplo_glb/Armored_Robe.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Mago_nvl75/exemplo_glb/Blue_Crystal_Greaves.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Mago_nvl75/exemplo_glb/Blue_Gemstone_Wings.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Mago_nvl75/exemplo_glb/Blue_Ornate_Skirt.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Mago_nvl75/exemplo_glb/Mystic_Hood.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Mago_nvl75/exemplo_glb/Royal_Cape.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Patrulheiro_nvl75/exemplo_glb/Fantasy_Armor.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Patrulheiro_nvl75/exemplo_glb/Green_Druid_Cloak.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Patrulheiro_nvl75/exemplo_glb/Leaf_Armor_Legs.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Patrulheiro_nvl75/exemplo_glb/Leaf_Boots.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Classe_Patrulheiro_nvl75/exemplo_glb/Leaf_Cloak.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Guardião_Arcano_nvl75/exemplo_glb/Blue_Cloak.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Guardião_Arcano_nvl75/exemplo_glb/Blue_Gauntlets.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Guardião_Arcano_nvl75/exemplo_glb/Fantasy_Armor_Pants.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Guardião_Arcano_nvl75/exemplo_glb/Hood.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Guardião_Arcano_nvl75/exemplo_glb/Sci-Fi_Boots.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Guardião_Arcano_nvl75/exemplo_glb/crystal_shoulder_armor.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Armaduras_Level_75/Guardião_Arcano_nvl75/exemplo_glb/fantasy_armor.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Corpo_Feminino/Corpo_Feminino.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/Criar_Personagem/Corpo_Masculino/Corpo_Masculino.glb`: malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo
- `assets/armaduras_extras/drakos/drakos_extra_drakos__varia__es_da_armadura___copia__2__copia.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/drakos/drakos_n1.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/drakos/drakos_n2.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/drakos/drakos_n3.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/drakos/drakos_n4.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/drakos/drakos_n5.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/drakos/drakos_n6.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/drakos/drakos_n7.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/kael/kael_cyberpunk.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/kael/kael_n3.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/kael/kael_n4.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/kael/kael_n5.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/kael/kael_n6.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/kael/kael_n7.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/lyra/lyra_n1.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/lyra/lyra_n2.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/lyra/lyra_n3.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/lyra/lyra_n4.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/lyra/lyra_n5.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/lyra/lyra_n6.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/lyra/lyra_n7.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/lyra/lyra_n8.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/orion/orion_extra_ficha_de_refer_ncia_da_armadura_orion___copia_copia.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/orion/orion_n1.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/orion/orion_n2.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/orion/orion_n3.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/orion/orion_n4.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/orion/orion_n5.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/orion/orion_n6.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)
- `assets/armaduras_extras/orion/orion_n7.glb`: é uma imagem PNG com extensão .glb (não é modelo 3D)

## Critérios

- **Retopologia**: acima de 2,5× o orçamento do tipo com sinais de malha de escaneamento/IA (mais de 8% de triângulos finos, arestas não manifold, dezenas de cascas) ou deformável (personagem, criatura, roupa) muito acima do orçamento.
- **Correção**: faces degeneradas, vértices soltos, duplicados de verdade (mesma posição, normal e UV) ou normais contra a face.
- **LOD**: acima do orçamento de perto (o motor faz a pele na CPU); os níveis 1–3 entram pela distância.
- Orçamentos (triângulos, LOD 0): personagem 30,000, rosto 12,000, corpo 20,000, cabelo 12,000, barba 6,000, armadura 12,000, arma 6,000, criatura 12,000, pet 8,000, montaria 15,000, chefe 30,000, construcao 8,000, cenario 4,000, natureza 3,000, outro 10,000.
