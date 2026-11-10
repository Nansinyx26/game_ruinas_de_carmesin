# Barbas e bigodes gerados no Meshy

Cada estilo de `tools/meshy/barbas.json` tem o próprio modelo 3D, a textura e um identificador. Os arquivos chegam aqui por três passos:
1. `tools/meshy/gerar_barbas.py`, a fila de geração no Meshy;
2. `tools/meshy/separar_cabelo.py --tipo barba`, que separa a barba da cabeça de manequim;
3. `tools/importar_criacao.py`, que converte para o jogo.

| Pasta | Conteúdo |
|---|---|
| `curtas/`, `medias/`, `longas/`, `bigodes/`, `especiais/` | `<id>.glb`: a barba já separada da cabeça de manequim e reduzida (Git LFS). `<id>.json`: o molde do encaixe, com o perfil do manequim. |
| `texturas/` | `<id>.png`: a textura de cor do Meshy (referência; a textura PBR completa vai dentro do GLB). |
| `previews/` | `<id>.png`: a miniatura da tela de criação. |

O jogo não carrega estes arquivos. Ele usa os convertidos em `js/assets/criacao/<id>.js`, carregados sob demanda quando a barba é escolhida.
