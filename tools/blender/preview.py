"""Prévia PNG de qualquer .glb (câmera e luz padrão do utils.renderizar_previa).

  python3 tools/blender/preview.py -- arquivo.glb saida.png [lado]
  blender -b -P tools/blender/preview.py -- arquivo.glb saida.png
Também mostra os triângulos e as medidas (para conferir escala e eixo depois da exportação).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import utils as U  # noqa: E402


def main():
    a = U.args()
    if len(a) < 2:
        print(__doc__)
        return 1
    glb, png = a[0], a[1]
    lado = int(a[2]) if len(a) > 2 else 512
    U.limpar_cena()
    bpy.ops.import_scene.gltf(filepath=glb)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    mn, mx = U.medidas(objs)
    print(f'prévia: {len(objs)} malha(s), {U.contar_tris(objs)} triângulos, medidas {tuple(round(v, 3) for v in (mx - mn))} m '
          f'(Blender: Z para cima; o glTF importado volta de +Y para +Z)')
    U.renderizar_previa(png, objs, lado=lado)
    print('prévia:', png)
    return 0


if __name__ == '__main__':
    sys.exit(main())
