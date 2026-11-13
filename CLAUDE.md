# ECLIPSE ZERO — instruções para o Claude

- Leia primeiro `docs/PENDENCIAS.md`: a lista de tudo o que foi pedido, feito e o que falta. Atualize-a ao
  terminar cada etapa (mova o item, registre o arquivo).
- Responda em português. O código e os comentários do projeto são em português.
- Use os modelos GLB do projeto (convertidos pelos scripts de `tools/`); nunca primitivas, cubos ou canvas no
  lugar de uma peça que tem GLB. Python só para processar fora do jogo.
- Chaves de API (Meshy, ElevenLabs) só no ambiente: nunca no código, no repositório nem no navegador.
- Antes de cada push: `node tools/testes_navegador.mjs` (precisa de `node_modules` com o Playwright) e analise as
  falhas; o servidor de chat tem `node servidor/teste.mjs`.
- Imagens para o usuário vão em `capturas_armaduras/`.
