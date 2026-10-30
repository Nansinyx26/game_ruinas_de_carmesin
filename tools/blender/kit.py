"""Peças de modelagem dos objetos de cenário (tools/blender/asset_*.py).

Cada objeto é montado com primitivas (caixa, cilindro, cone, anel, esfera, prisma) agrupadas
por célula (0 a 3: os quatro materiais do objeto) e fechado por finalizar(): cada célula vira um
material procedural, as partes são juntadas, normais e origem na base, e tudo é assado em
texturas (cor, ORM, normais, emissão) num material só; exporta assets/models/cenario/<nome>.glb,
a prévia em assets/models/previews/ e o registro do relatório.
"""
import math
import os

import bpy
import utils as U


class Obj:
    """Junta as partes por célula do atlas."""
    def __init__(self, nome, tipo='prop'):
        self.nome = U.nome_limpo(nome)
        self.tipo = tipo
        self.partes = {0: [], 1: [], 2: [], 3: []}

    def _fim(self, o, cel, rot=(0, 0, 0)):
        o.rotation_euler = rot
        U.ativar(o)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        self.partes[cel].append(o)
        return o

    def caixa(self, cel, dx, dy, dz, pos=(0, 0, 0), rot=(0, 0, 0), chanfro=0.0):
        """Caixa com o fundo em pos[2] (não o centro)."""
        bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0], pos[1], pos[2] + dz / 2))
        o = bpy.context.active_object
        o.scale = (dx, dy, dz)
        if chanfro:
            U.ativar(o)
            bpy.ops.object.transform_apply(scale=True)
            m = o.modifiers.new('chanfro', 'BEVEL')
            m.width = chanfro
            m.segments = 1
            U.aplicar_modificadores(o)
        return self._fim(o, cel, rot)

    def cilindro(self, cel, r, h, pos=(0, 0, 0), lados=12, r2=None, rot=(0, 0, 0)):
        """Cilindro (ou tronco de cone com r2) com o fundo em pos[2]."""
        if r2 is None:
            bpy.ops.mesh.primitive_cylinder_add(vertices=lados, radius=r, depth=h, location=(pos[0], pos[1], pos[2] + h / 2))
        else:
            bpy.ops.mesh.primitive_cone_add(vertices=lados, radius1=r, radius2=r2, depth=h, location=(pos[0], pos[1], pos[2] + h / 2))
        return self._fim(bpy.context.active_object, cel, rot)

    def anel(self, cel, r, espessura, pos=(0, 0, 0), lados=24, seg=6, rot=(0, 0, 0)):
        bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=espessura, major_segments=lados, minor_segments=seg, location=pos)
        return self._fim(bpy.context.active_object, cel, rot)

    def esfera(self, cel, r, pos=(0, 0, 0), seg=10, aneis=6, esc=(1, 1, 1)):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=aneis, radius=r, location=pos)
        o = bpy.context.active_object
        o.scale = esc
        return self._fim(o, cel)

    def prisma(self, cel, r, h, pos=(0, 0, 0), lados=6, ponta=0.35, rot=(0, 0, 0)):
        """Cristal: prisma com a ponta em pirâmide (ponta = fração da altura)."""
        bm_h = h * (1 - ponta)
        bpy.ops.mesh.primitive_cylinder_add(vertices=lados, radius=r, depth=bm_h, location=(0, 0, bm_h / 2))
        base = bpy.context.active_object
        bpy.ops.mesh.primitive_cone_add(vertices=lados, radius1=r, radius2=0, depth=h * ponta, location=(0, 0, bm_h + h * ponta / 2))
        topo = bpy.context.active_object
        o = U.juntar([base, topo], 'prisma_tmp')
        o.location = pos
        U.ativar(o)
        bpy.ops.object.transform_apply(location=True)
        return self._fim(o, cel, rot)

    def finalizar(self, celulas, angulo=(60, 0, 35), semente=1, assado=True, lado=1024, bisel=0.03):
        """Fecha o objeto. assado=True (padrão): cada célula vira um material procedural
        (utils.material_procedural: desgaste, bordas, padrão, chanfro) e tudo é assado em texturas
        lado×lado numa UV sem sobreposição (utils.assar): cor com oclusão, ORM, normais, emissão.
        assado=False: o atlas 2×2 simples de antes (utils.material_atlas)."""
        todos = []
        if assado:
            mats = [U.material_procedural(f'{self.nome}_{k}', C, semente=semente + k, bisel=bisel) for k, C in enumerate(celulas)]
            for k, objs in self.partes.items():
                for o in objs:
                    U.aplicar_modificadores(o)
                    U.dar_material(o, mats[min(k, len(mats) - 1)])
                    todos.append(o)
        else:
            mat, uv_celula = U.material_atlas(self.nome, celulas, semente=semente)
            for k, objs in self.partes.items():
                for o in objs:
                    U.aplicar_modificadores(o)
                    U.uv_desdobrar(o)
                    uv_celula(o, k)
                    U.dar_material(o, mat)
                    todos.append(o)
        obj = U.juntar(todos, self.nome)
        U.normais_consistentes(obj)
        U.origem_na_base(obj)
        if assado:
            U.assar(obj, lado)
        U.limpar_sobras()
        glb = U.exportar_glb(os.path.join(U.MODELOS, 'cenario', f'{self.nome}.glb'), [obj], imagens='JPEG' if assado else 'AUTO')
        prev = U.renderizar_previa(os.path.join(U.MODELOS, 'previews', f'{self.nome}.png'), [obj], angulo=angulo)
        return U.registrar(self.nome, self.tipo, glb, prev, [obj], extra={'texturas': f'{lado}px assadas' if assado else 'atlas 512px'})


def rad(g):
    return math.radians(g)
