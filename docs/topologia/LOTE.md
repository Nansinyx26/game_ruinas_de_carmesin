# Topologia inteligente — lote controlado com validação peça a peça

Gerado por `tools/blender/topologia/lote.py`. 18 peças processadas, **15 aprovadas**. As fontes não foram alteradas; as saídas estão em `assets/_retopo/` (o jogo continua com as versões dele até uma peça ser trocada de propósito).

| peça | tipo | método | triângulos antes → depois | quads | desvio médio / 95% (da diagonal) | resultado |
|---|---|---|---|---|---|---|
| `assets/Criar_Personagem/Rosto/Rosto_1.glb` | rosto | QuadriFlow na fonte limpa (quads) | 69,796 → 11,410 | 100.0% | 0.07% / 0.28% | aprovada |
| `assets/Criar_Personagem/Rosto/rosto_2.glb` | rosto | QuadriFlow na fonte limpa (quads) | 75,036 → 11,846 | 100.0% | 0.08% / 0.32% | aprovada |
| `assets/Criar_Personagem/Rosto/rosto_3.glb` | rosto | QuadriFlow na fonte limpa (quads) | 73,594 → 10,980 | 100.0% | 0.07% / 0.26% | aprovada |
| `assets/Criar_Personagem/Rosto/rosto_4.glb` | rosto | QuadriFlow na fonte limpa (quads) | 74,926 → 11,170 | 100.0% | 0.08% / 0.34% | aprovada |
| `assets/Criar_Personagem/Rosto/rosto_6.glb` | rosto | QuadriFlow na fonte limpa (quads) | 68,452 → 11,498 | 100.0% | 0.07% / 0.25% | aprovada |
| `assets/Criar_Personagem/Rosto/rosto_7.glb` | rosto | QuadriFlow na fonte limpa (quads) | 63,944 → 11,824 | 100.0% | 0.07% / 0.30% | aprovada |
| `assets/modelos/armaduras/kael/kael_n1.glb` | armadura | QuadriFlow na fonte limpa (quads) | 238,318 → 10,170 | 100.0% | 0.17% / 0.65% | aprovada |
| `assets/modelos/armaduras/kael/kael_n2.glb` | armadura | QuadriFlow na fonte limpa (quads) | 136,878 → 8,906 | 100.0% | 0.15% / 0.50% | aprovada |
| `assets/modelos/armaduras/kael/kael_n4.glb` | armadura | QuadriFlow na fonte limpa (quads) | 99,906 → 10,780 | 100.0% | 0.12% / 0.40% | aprovada |
| `assets/modelos/armaduras/kael/kael_n5.glb` | armadura | QuadriFlow na fonte limpa (quads) | 163,662 → 9,126 | 100.0% | 0.19% / 0.65% | aprovada |
| `assets/modelos/armaduras/kael/kael_n7.glb` | armadura | QuadriFlow na fonte limpa (quads) | 190,672 → 9,096 | 100.0% | 0.25% / 0.83% | aprovada |
| `assets/Criar_Personagem/Cabelo/Cabelo_6.glb` | cabelo | redução mecha a mecha (colapso; UV e bordas das mechas preservadas) | 441,942 → 11,000 | 0.0% | 0.06% / 0.15% | aprovada |
| `assets/Criar_Personagem/Rosto/rosto_5.glb` | rosto | QuadriFlow na fonte limpa (quads) | 67,152 → 10,594 | 100.0% | 0.08% / 0.37% | aprovada |
| `assets/Criar_Personagem/Rosto/rosto_8.glb` | rosto | QuadriFlow na fonte limpa (quads) | 62,312 → 11,256 | 100.0% | 0.07% / 0.26% | aprovada |
| `assets/modelos/armaduras/kael/kael_n3.glb` | armadura | QuadriFlow na fonte limpa (quads) | 197,796 → 10,794 | 100.0% | 0.36% / 1.53% | reprovada: desvio de 95% 1.53% acima de 1.5% |
| `assets/modelos/armaduras/kael/kael_n6.glb` | armadura | QuadriFlow na fonte limpa (quads) | 220,294 → 11,298 | 100.0% | 0.35% / 1.67% | reprovada: desvio de 95% 1.67% acima de 1.5% |
| `assets/Criar_Personagem/Cabelo/Cabelo_4.glb` | cabelo | redução mecha a mecha (colapso; UV e bordas das mechas preservadas) | 966,718 → 10,670 | 0.0% | 0.20% / 1.08% | aprovada |
| `assets/Criar_Personagem/Cabelo/cabelo_1.glb` | cabelo | redução mecha a mecha (colapso; UV e bordas das mechas preservadas) | 1,399,168 → 12,026 | 0.0% | 0.58% / 3.02% | reprovada: desvio de 95% 3.02% acima de 2.5%; 12026 triângulos acima do orçamento 12000 |

## Regras

- **rosto**: quads, desvio de 95% até 1.2% da diagonal, até 12,000 triângulos.
- **armadura**: quads, desvio de 95% até 1.5% da diagonal, até 12,000 triângulos.
- **cabelo**: mechas, desvio de 95% até 2.5% da diagonal, até 12,000 triângulos.
