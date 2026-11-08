"""ECLIPSE ZERO · Corpo em T → pose A por um rig de verdade (os corpos atléticos enviados).

O jogo monta a pele no esqueleto com os braços em A. Girar a malha no ombro (a função antiga do
conversor, abaixar_bracos) entorta o deltoide e a axila: fica um calombo e uma dobra. Aqui o corpo
em T ganha um esqueleto simples no Blender (tronco, braço, antebraço e mão de cada lado, nas juntas
medidas na malha), os pesos automáticos (calor dos ossos) e os braços descem pelos ossos até
ANGULO graus abaixo da horizontal; a pose é aplicada na malha e o GLB sai em A, com a textura de
sempre. O conversor (tools/importar_criacao.py) usa esse GLB sem baixar mais nada.
A atlética vem do modelo COM textura do Meshy (Atletica_Feminina_Meshy.glb, da conta do usuário); dele
sai o rabo de cavalo esculpido, que pende atrás das costas (o jogo põe o rosto e o cabelo escolhidos; a
sobra ficava presa na nuca e nas costas), e a tinta escura que o cabelo deixou na pele da nuca.
Uso (Blender como módulo): python3 tools/blender/corpo_pose_a.py [Feminina|Masculino]
"""
import math
import os
import sys

import bpy
import bmesh
import mathutils
import numpy as np
from mathutils.bvhtree import BVHTree

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PASTA = os.path.join(RAIZ, 'assets', 'Criar_Personagem', 'Corpos_Atleticos')
CORPOS = [('Atletico_Masculino_T.glb', 'Atletico_Masculino_A.glb', False), ('Atletica_Feminina_Meshy.glb', 'Atletica_Feminina_A.glb', True)]
TEX = 2048      # lado máximo das texturas no GLB em A (o conversor usa 1024)
ANGULO = 48.0   # graus abaixo da horizontal (a pose A que o rig do jogo reconhece)


def medir(me):
    """Juntas do braço em T (Z para cima, braços ao longo de X): altura e posição do ombro, cotovelo,
    punho e ponta da mão de cada lado, pelas fatias da malha."""
    V = [v.co.copy() for v in me.vertices]
    zs = [v.z for v in V]
    z0, z1 = min(zs), max(zs)
    H = z1 - z0
    xs = [v.x for v in V]
    cx = (min(xs) + max(xs)) / 2
    # meia largura do tronco logo abaixo da axila: trecho contínuo a partir do centro (fatias)
    def meia(z, faixa=0.006):
        a = sorted(abs(v.x - cx) for v in V if abs(v.z - z) < faixa * H)
        if len(a) < 20:
            return None
        passo, ult = 0.01 * H, 0.0
        for x in a:
            if x - ult > passo:
                break
            ult = x
        return ult
    larg = [meia(z0 + f * H) for f in (0.66, 0.68, 0.70)]
    tw = sorted(w for w in larg if w)[len([w for w in larg if w]) // 2]
    # altura do braço: as fatias que passam bem além do tronco (o braço em T está na horizontal)
    zb = [v.z for v in V if abs(v.x - cx) > tw + 0.12 * H]
    zm = sorted(zb)[len(zb) // 2]
    alcance = max(abs(v.x - cx) for v in V)
    # espessura do braço (no meio do braço) e a axila logo abaixo dele: ali a largura contínua do tronco
    # dá onde o braço encosta; a junta do ombro fica um pouco para dentro disso, na altura do braço
    zz = [v.z for v in V if 0.24 * H < abs(v.x - cx) < 0.28 * H]
    esp = (max(zz) - min(zz)) if zz else 0.05 * H
    # (desce do meio do braço até a primeira fatia em que o tronco já não emenda no braço)
    axila = tw
    for k in range(1, 60):
        sp = meia(zm - k * 0.004 * H, 0.003)
        if sp and sp < 0.2 * H:
            axila = sp
            break
    # a junta do ombro fica a 1,33 vez a meia largura das costelas (a medida da axila falha quando a
    # pele do braço encosta no tronco); cotovelo e punho pelo comprimento do braço até a ponta da mão
    ombro = 1.33 * tw
    L = alcance - ombro
    juntas = dict(cx=cx, H=H, z0=z0, tw=tw, axila=axila, esp=esp, zb=zm, ombro=ombro, cotovelo=ombro + 0.42 * L, punho=ombro + 0.78 * L, ponta=alcance)
    print('juntas:', {k: round(v, 3) for k, v in juntas.items()}, flush=True)
    return juntas


def _ligados(bm, H):
    """Vizinhos de cada vértice: as arestas e os repetidos na mesma posição (as costuras da UV do Meshy
    separam vértices sem aresta entre eles; sem isso, o rabo vira centenas de pedacinhos)."""
    gemeos = {}
    chave = lambda co: (round(co.x / H, 5), round(co.y / H, 5), round(co.z / H, 5))
    for v in bm.verts:
        gemeos.setdefault(chave(v.co), []).append(v.index)
    def viz(u):
        for e in u.link_edges:
            yield e.other_vert(u).index
        for j in gemeos[chave(u.co)]:
            if j != u.index:
                yield j
    return viz


def _componentes(bm, ids, viz):
    vist, out = set(), []
    for i in ids:
        if i in vist:
            continue
        comp, pilha = [], [i]; vist.add(i)
        while pilha:
            u = pilha.pop(); comp.append(u)
            for j in viz(bm.verts[u]):
                if j in ids and j not in vist:
                    vist.add(j); pilha.append(j)
        out.append(comp)
    return out


def tirar_rabo(o):
    """Rabo de cavalo (e o coque de onde ele sai): o que pende atrás das costas e da cabeça. De cada vértice atrás de um plano (um pouco atrás do
    meio do tronco, medido abaixo do rabo), perto da linha do meio e acima da cintura, sai um raio para a
    frente (e outro inclinado para o meio): se ele ENTRA num sólido ainda atrás do plano (a pele das costas,
    do pescoço ou da cabeça), o vértice é de algo pendurado ali. A pele das costas não é marcada: o raio
    dela atravessa o próprio tronco e sai pela frente. Ficam os pedaços grandes; ilhas pequenas cercadas
    por eles (mechas que os raios não pegaram) vão junto; sobras soltas depois do corte também saem."""
    me = o.data
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.normal_update()
    zs = [v.co.z for v in bm.verts]; z0 = min(zs); H = max(zs) - z0
    xs = [v.co.x for v in bm.verts]; cx = (min(xs) + max(xs)) / 2
    ys = sorted(v.co.y for v in bm.verts if 0.62 < (v.co.z - z0) / H < 0.68 and abs(v.co.x - cx) < 0.03 * H)
    plano = ys[int(0.03 * len(ys))] + 0.75 * (ys[int(0.97 * len(ys))] - ys[int(0.03 * len(ys))])
    bvh = BVHTree.FromBMesh(bm)
    centro_cab = mathutils.Vector((cx, plano + 0.02 * H, z0 + 0.92 * H))
    def atras(v):
        sx = 1 if v.co.x > cx else -1
        ds = [mathutils.Vector((0, -1, 0)), mathutils.Vector((-0.5 * sx, -1, 0)).normalized()]
        if (v.co.z - z0) / H > 0.95:   # o coque, no alto da cabeça: o raio vai para o meio da cabeça
            ds.append((centro_cab - v.co).normalized())
        for d in ds:
            p = v.co + d * (1e-4 * H)
            for _ in range(60):
                loc, nrm, idx, dist = bvh.ray_cast(p, d)
                if loc is None:
                    break
                if nrm.dot(d) < 0 and loc.y > plano:
                    return True
                p = loc + d * (1e-5 * H)
        return False
    caixa = lambda v: 0.66 <= (v.co.z - z0) / H and abs(v.co.x - cx) < 0.14 * H and v.co.y > plano
    viz = _ligados(bm, H)
    marc = set(v.index for v in bm.verts if caixa(v) and atras(v))
    marc = set(i for c in _componentes(bm, marc, viz) if len(c) >= 300 for i in c)
    resto = set(v.index for v in bm.verts if caixa(v) and v.index not in marc)
    for c in _componentes(bm, resto, viz):
        if len(c) < 4000 and any(j in marc for i in c for j in viz(bm.verts[i])):
            marc.update(c)
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in marc], context='VERTS')
    bm.verts.ensure_lookup_table()
    viz = _ligados(bm, H)
    comps = sorted(_componentes(bm, set(range(len(bm.verts))), viz), key=len, reverse=True)
    soltos = [bm.verts[i] for c in comps[1:] if len(c) < 0.02 * len(bm.verts) for i in c]
    bmesh.ops.delete(bm, geom=soltos, context='VERTS')
    bm.to_mesh(me); bm.free()
    print(f'rabo de cavalo: {len(marc)} vértices tirados (+{len(soltos)} soltos), plano {plano / H:.3f}H', flush=True)
    return dict(z0=z0, H=H, cx=cx, plano=plano)


def limpar_tinta(o, R):
    """A textura do Meshy pintou o cabelo (castanho-escuro, quente) na pele da nuca e do alto das costas,
    onde o rabo encostava. Nas faces dessa região, abaixo do corte da cabeça, o texel escuro e quente
    volta ao tom de pele dela; o top (preto azulado) não é tocado."""
    from PIL import Image, ImageDraw
    me = o.data
    mat = me.materials[0]; nt = mat.node_tree
    bsdf = [n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'][0]
    lk = bsdf.inputs['Base Color'].links
    if not lk or lk[0].from_node.type != 'TEX_IMAGE':
        print('limpar_tinta: sem textura de cor', flush=True)
        return
    img = lk[0].from_node.image
    w, h = img.size
    z0, H, cx, plano = R['z0'], R['H'], R['cx'], R['plano']
    V = np.array([v.co[:] for v in me.vertices])
    # corte da cabeça como no conversor: abaixo do queixo, pelo nariz (o ponto mais à frente da cabeça)
    cab = V[(V[:, 2] > z0 + 0.86 * H) & (np.abs(V[:, 0] - cx) < 0.03 * H)]
    zn = cab[np.argmin(cab[:, 1]), 2]
    corte = zn - 0.55 * (z0 + H - zn)
    uv = me.uv_layers.active.data
    nf = [0]
    def mascara(cond):
        """Máscara na UV das faces da região (abaixo do corte) que passam em cond(centro)."""
        mask = Image.new('L', (w, h), 0); dr = ImageDraw.Draw(mask)
        for f in me.polygons:
            c = f.center
            if z0 + 0.70 * H < c.z < corte + 0.03 * H and abs(c.x - cx) < 0.11 * H and c.y > plano - 0.04 * H and cond(c):
                dr.polygon([(uv[l].uv.x * w, (1 - uv[l].uv.y) * h) for l in f.loop_indices], fill=255)
                nf[0] += 1
        return mask
    M = np.asarray(mascara(lambda c: True))[::-1] > 0          # (a imagem do Blender começa embaixo)
    n = nf[0]
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(h, w, 4)
    C = px[M][:, :3]
    lum = C @ np.array([0.299, 0.587, 0.114], np.float32)
    pele = np.median(C[(C[:, 0] > 0.55) & (C[:, 0] - C[:, 2] > 0.1)], axis=0)
    lp = float(pele @ np.array([0.299, 0.587, 0.114]))
    quente = np.clip((C[:, 0] - C[:, 2] - 0.01) / 0.03, 0, 1)
    wt = np.clip((0.9 - lum / lp) / 0.3, 0, 1) * quente
    # no pescoço (entre as alças, acima delas) não há roupa: todo texel longe do tom de pele volta a ele
    Mn = np.asarray(mascara(lambda c: c.z > z0 + 0.83 * H and abs(c.x - cx) < 0.045 * H))[::-1] > 0
    s3 = C.sum(axis=1, keepdims=True) + 1e-6
    dist = np.linalg.norm(C / s3 - pele / pele.sum(), axis=1) + np.abs(lum / lp - 1) * 0.15
    wt = np.maximum(wt, np.clip((dist - 0.02) / 0.04, 0, 1) * Mn[M])[:, None]
    px[M, :3] = C * (1 - wt) + pele[None, :] * wt
    img.pixels.foreach_set(px.ravel()); img.update()
    print(f'tinta do cabelo: {n} faces, {int((wt > 0.5).sum())} texels refeitos (pele {np.round(pele, 3).tolist()}), corte {(corte - z0) / H:.3f}H', flush=True)


def sem_metal(o):
    """O material do Meshy marca alguns texels da pele como metal (até 0,4): no jogo eles refletem branco.
    Pele e roupa de tecido não são metal: o canal de metal (B, no glTF) vai a zero."""
    nt = o.data.materials[0].node_tree
    bsdf = [n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'][0]
    lk = bsdf.inputs['Metallic'].links
    if not lk:
        bsdf.inputs['Metallic'].default_value = 0.0
        return
    no = lk[0].from_node
    while no.type != 'TEX_IMAGE':
        ent = [i for i in no.inputs if i.links]
        if not ent:
            return
        no = ent[0].links[0].from_node
    img = no.image; w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(-1, 4)
    print(f'metal: máximo {px[:, 2].max():.2f} → 0', flush=True)
    px[:, 2] = 0
    img.pixels.foreach_set(px.ravel()); img.update()


def pose_a(arq, saida, feminina):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(PASTA, arq))
    o = [x for x in bpy.context.scene.objects if x.type == 'MESH'][0]
    # transformações aplicadas: a malha fica no espaço do mundo
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if feminina:
        limpar_tinta(o, tirar_rabo(o))
    sem_metal(o)
    J = medir(o.data)
    # esqueleto: tronco (pelve → pescoço) e, de cada lado, braço, antebraço e mão ao longo de X
    arm = bpy.data.armatures.new('rig'); rig = bpy.data.objects.new('rig', arm)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    cx, z0, H, zb = J['cx'], J['z0'], J['H'], J['zb']
    tronco = arm.edit_bones.new('tronco'); tronco.head = (cx, 0, z0 + 0.50 * H); tronco.tail = (cx, 0, z0 + 0.86 * H)
    pernas = arm.edit_bones.new('pernas'); pernas.head = (cx, 0, z0 + 0.50 * H); pernas.tail = (cx, 0, z0 + 0.02 * H)
    for s, ld in ((1, 'E'), (-1, 'D')):
        prev = tronco
        for nome, a, b in (('braco', 'ombro', 'cotovelo'), ('antebraco', 'cotovelo', 'punho'), ('mao', 'punho', 'ponta')):
            e = arm.edit_bones.new(f'{nome}.{ld}')
            e.head = (cx + s * J[a], 0, zb); e.tail = (cx + s * J[b], 0, zb)
            e.parent = prev; e.use_connect = nome != 'braco'
            prev = e
    bpy.ops.object.mode_set(mode='OBJECT')
    # pesos automáticos (calor dos ossos) numa cópia FECHADA da malha (remalha por voxels: a do Meshy
    # tem buracos e pedaços soltos, e o calor dos ossos falha nela), passados para a malha de verdade
    # pela face mais próxima
    px = o.copy(); px.data = o.data.copy(); bpy.context.scene.collection.objects.link(px)
    # (na cópia: solda as costuras da UV e tapa os furos que sobrarem, senão a remalha não acha o volume)
    bm = bmesh.new(); bm.from_mesh(px.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5 * H)
    bord = [e for e in bm.edges if e.is_boundary]
    bmesh.ops.holes_fill(bm, edges=bord, sides=0)
    print(f'cópia: {len(bord)} arestas de borda tapadas', flush=True)
    bm.to_mesh(px.data); bm.free()
    rm = px.modifiers.new('fecha', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.006 * H
    bpy.ops.object.select_all(action='DESELECT'); px.select_set(True); bpy.context.view_layer.objects.active = px
    bpy.ops.object.modifier_apply(modifier=rm.name)
    print(f'cópia fechada: {len(px.data.vertices)} vértices', flush=True)
    bpy.ops.object.select_all(action='DESELECT'); px.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    print(f'cópia: vértices sem peso {sum(1 for v in px.data.vertices if not v.groups)}', flush=True)
    for g in px.vertex_groups:
        o.vertex_groups.new(name=g.name)
    dt = o.modifiers.new('pesos', 'DATA_TRANSFER'); dt.object = px
    dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=dt.name)
    bpy.data.objects.remove(px)
    md = o.modifiers.new('rig', 'ARMATURE'); md.object = rig
    # quem ficou sem peso (pontas finas dos dedos que a remalha perdeu, pedaços soltos) vai inteiro
    # para o osso mais próximo: sem isso, o vértice ficava parado e esticava em linha até o braço
    ossos = [(b.name, b.head_local.copy(), b.tail_local.copy()) for b in rig.data.bones]
    def perto(p):
        best, bn = 1e9, None
        for nome, a_, b_ in ossos:
            ab = b_ - a_; t = max(0.0, min(1.0, (p - a_).dot(ab) / max(ab.length_squared, 1e-12)))
            d = (p - (a_ + ab * t)).length
            if d < best:
                best, bn = d, nome
        return bn
    sem = 0
    for v in o.data.vertices:
        if not v.groups or sum(g.weight for g in v.groups) < 1e-4:
            o.vertex_groups[perto(v.co)].add([v.index], 1.0, 'REPLACE'); sem += 1
    print(f'vértices sem peso (agora no osso mais próximo): {sem}', flush=True)
    # braços descem pelos ossos: giro em volta do eixo da frente (Y), no ombro
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    for s, ld in ((1, 'E'), (-1, 'D')):
        pb = rig.pose.bones[f'braco.{ld}']
        h = pb.head.copy()
        R = mathutils.Matrix.Translation(h) @ mathutils.Matrix.Rotation(math.radians(ANGULO) * s, 4, 'Y') @ mathutils.Matrix.Translation(-h)   # (+X desce com giro positivo em Y)
        pb.matrix = R @ pb.matrix
        bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode='OBJECT')
    # aplica a pose na malha e tira o esqueleto
    bpy.context.view_layer.objects.active = o
    for m in o.modifiers:
        if m.type == 'ARMATURE':
            bpy.ops.object.modifier_apply(modifier=m.name)
    o.parent = None
    bpy.data.objects.remove(rig)
    for g in list(o.vertex_groups):
        o.vertex_groups.remove(g)
    # texturas no máximo TEX (as de 4096 do Meshy só pesam no arquivo) e guardadas no .blend da sessão,
    # para o exportador gravar a versão editada
    for im in bpy.data.images:
        if im.size[0] > TEX:
            im.scale(TEX, TEX)
        if im.is_dirty or im.size[0] == TEX:
            im.pack()
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(PASTA, saida), export_format='GLB', use_selection=True, export_yup=True, export_apply=True)
    print('GLB:', saida, os.path.getsize(os.path.join(PASTA, saida)) // 1024, 'KB', flush=True)


def main():
    so = sys.argv[1:]   # (opcional: parte do nome dos que refazer, ex.: Feminina)
    for arq, saida, fem in CORPOS:
        if not so or any(x in saida for x in so):
            pose_a(arq, saida, fem)


if __name__ == '__main__':
    sys.exit(main())
