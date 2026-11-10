"""Lâmina do Iniciado: espada de uma mão que acompanha o conjunto do nível 1.

Gerada por código (bmesh e primitivas): lâmina de seção em losango com ponta, filete de neon no
centro das duas faces, guarda chanfrada, cabo de couro com anéis e pomo. Um objeto, um material
(atlas 2×2 de 512: aço, metal escuro, couro, neon), ~700 triângulos, origem na base do pomo,
metros, exportada em .glb (+Y para cima) com a prévia PNG.

Variações por parâmetro:
  python3 tools/blender/asset_lamina_iniciado.py -- --neon 1,0.3,0.2 --comprimento 0.9 --desgaste 0.6 --nome lamina_rubra
  blender -b -P tools/blender/asset_lamina_iniciado.py -- --neon 0.2,0.9,1
"""
import argparse
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import bmesh  # noqa: E402
import utils as U  # noqa: E402


def opcoes():
    ap = argparse.ArgumentParser()
    ap.add_argument('--nome', default='lamina_do_iniciado')
    ap.add_argument('--neon', default='0.25,0.85,1.0', help='cor do filete aceso (r,g,b de 0 a 1)')
    ap.add_argument('--comprimento', type=float, default=0.75, help='lâmina em metros')
    ap.add_argument('--desgaste', type=float, default=0.35, help='0 = nova, 1 = muito gasta')
    return ap.parse_args(U.args())


def lamina(comp, largura=0.052, espessura=0.011, aneis=9):
    """Seção em losango com fio dos dois lados, afinando até a ponta (bmesh)."""
    me = bpy.data.meshes.new('lamina')
    bm = bmesh.new()
    secao = [(1, 0), (0.45, 1), (-0.45, 1), (-1, 0), (-0.45, -1), (0.45, -1)]
    z0 = 0.0
    rings = []
    for i in range(aneis):
        t = i / (aneis - 1)
        z = z0 + t * comp * 0.9
        k = 1 - 0.18 * t                       # afina devagar
        rings.append([bm.verts.new((x * largura / 2 * k, y * espessura / 2 * k, z)) for x, y in secao])
    ponta = bm.verts.new((0, 0, z0 + comp))
    n = len(secao)
    for a, b in zip(rings, rings[1:]):
        for j in range(n):
            bm.faces.new((a[j], a[(j + 1) % n], b[(j + 1) % n], b[j]))
    for j in range(n):
        bm.faces.new((rings[-1][j], rings[-1][(j + 1) % n], ponta))
    bm.faces.new(list(reversed(rings[0])))
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new('lamina', me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def caixa(nome, dx, dy, dz, pos, chanfro=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    o = bpy.context.active_object
    o.name = nome
    o.scale = (dx, dy, dz)
    U.ativar(o)
    bpy.ops.object.transform_apply(scale=True)
    if chanfro:
        m = o.modifiers.new('chanfro', 'BEVEL')
        m.width = chanfro
        m.segments = 2
    return o


def main():
    a = opcoes()
    neon = tuple(float(v) for v in a.neon.split(','))
    U.limpar_cena()
    # partes (Blender: +Z para cima; a exportação vira +Y)
    pomo_h, cabo_h, guarda_h = 0.045, 0.18, 0.032
    z_cabo = pomo_h
    z_guarda = z_cabo + cabo_h
    z_lamina = z_guarda + guarda_h
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.026, location=(0, 0, pomo_h * 0.55))
    pomo = bpy.context.active_object
    pomo.scale = (1, 1, 0.8)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.016, depth=cabo_h, location=(0, 0, z_cabo + cabo_h / 2))
    cabo = bpy.context.active_object
    aneis = []
    for k in range(3):
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.0185, depth=0.008, location=(0, 0, z_cabo + 0.03 + k * 0.06))
        aneis.append(bpy.context.active_object)
    guarda = caixa('guarda', 0.21, 0.036, guarda_h, (0, 0, z_guarda + guarda_h / 2), chanfro=0.006)
    lam = lamina(a.comprimento)
    lam.location.z = z_lamina
    # filete de neon nas duas faces, no centro da lâmina
    filetes = []
    for lado in (1, -1):
        f = caixa('neon', 0.006, 0.002, a.comprimento * 0.62, (0, lado * 0.0052, z_lamina + 0.03 + a.comprimento * 0.31))
        filetes.append(f)
    # um material só: atlas 2×2 (aço, metal escuro, couro, neon)
    mat, uv_celula = U.material_atlas(U.nome_limpo(a.nome), [
        dict(cor=(0.62, 0.64, 0.68), metal=1.0, aspereza=0.32, desgaste=a.desgaste),
        dict(cor=(0.16, 0.17, 0.2), metal=0.9, aspereza=0.45, desgaste=a.desgaste),
        dict(cor=(0.22, 0.13, 0.08), metal=0.0, aspereza=0.82, desgaste=a.desgaste * 1.4),
        dict(cor=neon, metal=0.0, aspereza=0.3, emissao=neon, desgaste=0.0),
    ])
    for objs, k in [([lam], 0), ([guarda, pomo], 1), ([cabo] + aneis, 2), (filetes, 3)]:
        for o in objs:
            U.aplicar_modificadores(o)
            U.uv_desdobrar(o)
            uv_celula(o, k)
            U.dar_material(o, mat)
    obj = U.juntar([lam, guarda, pomo, cabo] + aneis + filetes, a.nome)
    U.normais_consistentes(obj)
    U.origem_na_base(obj)
    U.limpar_sobras()
    glb = U.exportar_glb(os.path.join(U.MODELOS, 'armas', f'{U.nome_limpo(a.nome)}.glb'), [obj])
    prev = U.renderizar_previa(os.path.join(U.MODELOS, 'previews', f'{U.nome_limpo(a.nome)}.png'), [obj], angulo=(70, 0, 35))
    U.registrar(U.nome_limpo(a.nome), 'arma', glb, prev, [obj], extra=dict(neon=list(neon), comprimento=a.comprimento, desgaste=a.desgaste))


if __name__ == '__main__':
    main()
