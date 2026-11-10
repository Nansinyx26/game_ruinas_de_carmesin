# Validação do encaixe das barbas e bigodes

Gerado por `tools/validar_barbas.mjs` (não edite à mão).

- **Casos:** 720 (cada barba e cada bigode nos 8 rostos, nos dois corpos, mais 5 formatos de rosto extremos nos rostos 1, 3, 5 e 7 do corpo masculino).
- **Aprovados:** 720 de 720.
- **Critérios:** menos de 1% dos vértices atravessando a pele, até 2 vértices sobre cada olho e sobre o nariz, e menos de 8% de vãos na face de dentro (barbas em casca).

| Peça | Aprovados | Refeitos na 2ª tentativa | Atravessa (pior) | Vãos (pior) | Tempo médio |
|---|---|---|---|---|---|
| barba_cacheada | 36/36 | 8 | 0.00% | 4.0% | 40 ms |
| barba_curta | 36/36 | 1 | 0.00% | 7.4% | 33 ms |
| barba_longa | 36/36 | 0 | 0.11% | 0.0% | 33 ms |
| barba_media | 36/36 | 12 | 0.21% | 2.5% | 35 ms |
| barba_viking | 36/36 | 8 | 0.16% | 8.0% | 34 ms |
| barba_b_por_fazer | 36/36 | 0 | 0.12% | 0.0% | 88 ms |
| barba_b_curta | 36/36 | 0 | 0.08% | 0.0% | 91 ms |
| barba_b_media | 36/36 | 0 | 0.09% | 0.0% | 82 ms |
| barba_b_cheia | 36/36 | 0 | 0.09% | 0.0% | 97 ms |
| barba_b_longa | 36/36 | 0 | 0.05% | 0.0% | 98 ms |
| barba_b_cavanhaque | 36/36 | 0 | 0.11% | 0.0% | 33 ms |
| barba_b_queixo | 36/36 | 0 | 0.18% | 0.0% | 77 ms |
| barba_b_bigode | 72/72 | 0 | 0.00% | 0.0% | 26 ms |
| barba_b_guidao | 72/72 | 0 | 0.00% | 0.0% | 31 ms |
| barba_b_cheia_sem | 36/36 | 0 | 0.15% | 0.0% | 93 ms |
| barba_b_cavanhaque_sem | 36/36 | 0 | 0.16% | 0.0% | 28 ms |
| barba_b_fino | 36/36 | 0 | 0.00% | 0.0% | 33 ms |
| barba_b_ferradura | 36/36 | 0 | 0.00% | 0.0% | 40 ms |
