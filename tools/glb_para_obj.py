"""GLB (inclusive com Draco e WebP, como os do Meshy) → OBJ + MTL + textura PNG, reduzido.

Serve para abrir no Blender um GLB comprimido quando o Blender usado não tem o Draco (o módulo bpy
do pip não traz a biblioteca): prévia, conferência de escala e de eixo.
  python3 tools/glb_para_obj.py arquivo.glb pasta_saida [triângulos]
"""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importar_modelo as im  # noqa: E402


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    arq, pasta = sys.argv[1], sys.argv[2]
    alvo = int(sys.argv[3]) if len(sys.argv) > 3 else 120000
    os.makedirs(pasta, exist_ok=True)
    V, UV, F, mapas = im.ler_glb(arq)
    nome = os.path.splitext(os.path.basename(arq))[0]
    if len(F) > alvo:
        # redução simples por agrupamento de vértices numa grade (mantém UV do vértice representante)
        lado = (V.max(0) - V.min(0)).max() / (alvo ** 0.5 * 0.5)
        chave = np.floor((V - V.min(0)) / lado).astype(np.int64)
        _, rep, inv = np.unique(chave, axis=0, return_index=True, return_inverse=True)
        inv = inv.ravel()
        F2 = inv[F]
        ok = (F2[:, 0] != F2[:, 1]) & (F2[:, 1] != F2[:, 2]) & (F2[:, 0] != F2[:, 2])
        V, UV, F = V[rep], UV[rep], F2[ok]
    if mapas.get('cor') is not None:
        cv2.imwrite(os.path.join(pasta, nome + '.png'), mapas['cor'])
    with open(os.path.join(pasta, nome + '.mtl'), 'w') as f:
        f.write(f'newmtl m\nKd 1 1 1\nmap_Kd {nome}.png\n')
    with open(os.path.join(pasta, nome + '.obj'), 'w') as f:
        f.write(f'mtllib {nome}.mtl\nusemtl m\n')
        for v in V:
            f.write(f'v {v[0]:.5f} {v[1]:.5f} {v[2]:.5f}\n')
        for u in UV:
            f.write(f'vt {u[0]:.5f} {1 - u[1]:.5f}\n')
        for a, b, c in F + 1:
            f.write(f'f {a}/{a} {b}/{b} {c}/{c}\n')
    print(f'{nome}: {len(F)} triângulos → {pasta}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
