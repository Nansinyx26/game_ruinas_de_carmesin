"""ECLIPSE ZERO · Comparação visual do lote de topologia (bpy): fonte x saída, com a malha aparente
---------------------------------------------------------------------------
Para cada peça (caminho da FONTE, como no lote), renderiza três vistas iguais:
  <nome>_antes.png   a fonte, com a malha aparente
  <nome>_depois.png  a saída de assets/_retopo/, com a malha aparente
  <nome>_assado.png  a saída sem malha, só com a cor e o relevo assados (o que o jogo mostraria)
em .cache_criacao/comparar/. Só lê os arquivos; não grava nada em assets/.
Rode: python3 tools/blender/topologia/comparar.py <arquivo.glb ...>
---------------------------------------------------------------------------
"""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import retopologia as R   # noqa: E402
import utils as U   # noqa: E402

SAIDA = os.path.join(U.RAIZ, '.cache_criacao', 'comparar')


def fio(ob, nome):
    """Cópia da malha só com as arestas (fio claro e aceso, por cima da peça sombreada)."""
    c = R.copia(ob, nome + '_fio')
    for m in list(c.modifiers):
        c.modifiers.remove(m)
    c.vertex_groups.clear()
    w = c.modifiers.new('fio', 'WIREFRAME')
    area = sum(p.area for p in ob.data.polygons)
    w.thickness = 0.06 * math.sqrt(area / max(1, len(ob.data.polygons)))
    w.use_replace = True
    w.use_even_offset = False
    mt = bpy.data.materials.new('fio')
    mt.use_nodes = True
    P = mt.node_tree.nodes['Principled BSDF']
    P.inputs['Base Color'].default_value = (0.9, 0.95, 1.0, 1)
    P.inputs['Emission Color'].default_value = (0.55, 0.75, 1.0, 1)
    P.inputs['Emission Strength'].default_value = 0.6
    c.data.materials.clear()
    c.data.materials.append(mt)
    return c


def angulo_de(rel):
    s = rel.lower()
    if '/rosto' in s:
        return (84, 0, 28)
    if 'cabelo' in s:
        return (70, 0, 40)
    return (80, 0, 30)


def comparar(rel):
    nome = os.path.splitext(os.path.basename(rel))[0]
    saida = os.path.join(U.RAIZ, 'assets', '_retopo', rel)
    if not os.path.exists(saida):
        print('SEM SAIDA', rel, flush=True)
        return
    U.limpar_cena()
    fonte = R.importar(os.path.join(U.RAIZ, rel), 'Fonte')
    nova = R.importar(saida, 'Retopo')
    ang = angulo_de(rel)
    nova.hide_render = True
    f = fio(fonte, 'fonte')
    U.renderizar_previa(os.path.join(SAIDA, f'{nome}_antes.png'), [fonte, f], lado=460, amostras=8, angulo=ang)
    bpy.data.objects.remove(f, do_unlink=True)
    fonte.hide_render = True
    nova.hide_render = False
    g = fio(nova, 'nova')
    U.renderizar_previa(os.path.join(SAIDA, f'{nome}_depois.png'), [nova, g], lado=460, amostras=8, angulo=ang)
    bpy.data.objects.remove(g, do_unlink=True)
    U.renderizar_previa(os.path.join(SAIDA, f'{nome}_assado.png'), [nova], lado=460, amostras=12, angulo=ang)
    print('COMPARADA', rel, flush=True)


if __name__ == '__main__':
    os.makedirs(SAIDA, exist_ok=True)
    for a in U.args():
        try:
            comparar(a)
        except Exception as err:   # noqa: BLE001
            print('ERRO', a, err, flush=True)
