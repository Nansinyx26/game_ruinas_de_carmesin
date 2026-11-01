"""ECLIPSE ZERO · Topologia inteligente no Blender: limpeza, RETOPOLOGIA, LODs e assado (bpy)
---------------------------------------------------------------------------
Para malhas de origem densas e desorganizadas (as do Meshy/escaneadas: 120–130 mil triângulos,
triângulos finos, sem esqueleto), sem tocar no arquivo original:
  1. importar   a fonte entra como cópia (o GLB de origem fica intacto em .../fonte/), com os pés
                no chão e centrada; o relatório "antes" sai dela (diagnosticar)
  2. limpar     solda vértices repetidos, tira faces degeneradas e soltos, refaz as normais
  3. retopologia remalha por voxels (fecha a malha num volume só, sem buracos nem não manifold)
                e QuadriFlow: QUADS com laços que seguem a curvatura (tronco, pescoço, patas,
                cauda), simetria em X, no número de faces do orçamento do tipo; depois a malha
                nova é encostada na superfície da fonte (shrinkwrap) para manter a silhueta
  4. uv         desdobramento novo (ilhas por ângulo) para o assado
  5. assar      da fonte para a malha nova (Cycles, de selecionado para ativo): cor, aspereza,
                metal e o mapa de NORMAIS (os detalhes finos da fonte viram relevo no mapa), e a
                emissão (as linhas acesas da arte) separada pela cor
  6. lods       LOD 1–3 pela redução que preserva a borda e a UV (as mesmas texturas do LOD 0)
Cada função devolve medidas para o relatório (antes/depois). Os scripts de cada criatura
(tools/blender/criaturas/*.py) chamam estas etapas e acrescentam o esqueleto e as animações.
Configurações por finalidade (TIPOS): quadrúpede, ave, humanoide, peça rígida — não é a mesma
regra para tudo (a densidade, a simetria e as partes finas mudam).
---------------------------------------------------------------------------
"""
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import utils as U   # noqa: E402

# Configuração por finalidade: faces do LOD 0 (quads pedidos ao QuadriFlow, que entrega ~75% disso:
# 7000 → ~5300 quads ≈ 10,6 mil triângulos, dentro do orçamento de criatura de 12 mil, o bastante para
# as pontas de pelo e de pena manterem a silhueta), voxel (fração do comprimento), simetria,
# frações dos LODs, lado das texturas e o empurrão do assado (fração do comprimento)
TIPOS = {
    'quadrupede': dict(quads=7000, voxel=1 / 230, simetria=True, lods=(0.5, 0.25, 0.1), lado=2048, extrusao=0.012),
    'ave': dict(quads=7600, voxel=1 / 260, simetria=True, lods=(0.5, 0.25, 0.1), lado=2048, extrusao=0.01),
    'humanoide': dict(quads=9000, voxel=1 / 300, simetria=True, lods=(0.5, 0.25, 0.12), lado=2048, extrusao=0.008),
    'rigido': dict(quads=3000, voxel=1 / 200, simetria=False, lods=(0.5, 0.25, 0.1), lado=1024, extrusao=0.01),
}


# ------------------------------------------------------------------ 1. importar e medir
def importar(caminho, nome='Fonte'):
    """Importa o GLB de origem (uma cópia na cena; o arquivo não muda), junta as malhas, aplica as
    transformações, põe os pés em z = 0 e centra em X e Y."""
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=caminho)
    novos = [o for o in bpy.data.objects if o not in antes]
    malhas = [o for o in novos if o.type == 'MESH']
    for o in novos:
        if o.type != 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)
    ob = U.juntar(malhas, nome) if len(malhas) > 1 else malhas[0]
    ob.name = nome
    ob.parent = None
    U.ativar(ob)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    V = np.array([v.co[:] for v in ob.data.vertices])
    mn, mx = V.min(0), V.max(0)
    d = Vector((-(mn[0] + mx[0]) / 2, -(mn[1] + mx[1]) / 2, -mn[2]))
    ob.data.transform(__import__('mathutils').Matrix.Translation(d))
    ob.data.update()
    return ob


def diagnosticar(ob):
    """Medidas da malha (bmesh): vértices, faces, triângulos, quads, n-ágonos, arestas não
    manifold, bordas, vértices soltos, faces degeneradas, cascas, triângulos finos (%)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    tris = sum(len(f.verts) - 2 for f in bm.faces)
    quads = sum(1 for f in bm.faces if len(f.verts) == 4)
    ngon = sum(1 for f in bm.faces if len(f.verts) > 4)
    nm = sum(1 for e in bm.edges if len(e.link_faces) > 2)
    borda = sum(1 for e in bm.edges if len(e.link_faces) == 1)
    soltos = sum(1 for v in bm.verts if not v.link_faces)
    degen = sum(1 for f in bm.faces if f.calc_area() < 1e-12)
    finos = 0
    for f in bm.faces:
        if len(f.verts) == 3:
            a = f.calc_area()
            if a > 1e-12:
                e2 = max((e.verts[0].co - e.verts[1].co).length_squared for e in f.edges)
                finos += e2 / (2 * a) > 20
    # cascas (pedaços ligados)
    vistos, cascas = set(), 0
    for v in bm.verts:
        if v.index in vistos or not v.link_faces:
            continue
        cascas += 1
        pilha = [v]
        vistos.add(v.index)
        while pilha:
            x = pilha.pop()
            for e in x.link_edges:
                o = e.other_vert(x)
                if o.index not in vistos:
                    vistos.add(o.index)
                    pilha.append(o)
    r = dict(vertices=len(bm.verts), faces=len(bm.faces), triangulos=tris, quads=quads, quads_pct=round(100.0 * quads / max(1, len(bm.faces)), 1),
             ngonos=ngon, nao_manifold=nm, bordas=borda, soltos=soltos, degeneradas=degen, cascas=cascas,
             finos_pct=round(100.0 * finos / max(1, sum(1 for f in bm.faces if len(f.verts) == 3)), 1))
    bm.free()
    return r


# ------------------------------------------------------------------ 2. limpar
def limpar(ob, dist=1e-5):
    """Solda vértices repetidos, dissolve faces degeneradas, tira soltos e refaz as normais."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    n0 = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=dist)
    soltos = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=soltos, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    n1 = len(bm.verts)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    return dict(soldados=n0 - n1 - len(soltos), soltos_removidos=len(soltos))


# ------------------------------------------------------------------ 3. retopologia
def copia(ob, nome):
    c = ob.copy()
    c.data = ob.data.copy()
    c.name = nome
    c.data.name = nome
    bpy.context.scene.collection.objects.link(c)
    return c


def so_maior(ob):
    """Deixa só a maior casca (as ilhas pequenas que o voxel solta) e acerta as normais."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    vistos, grupos = set(), []
    for v in bm.verts:
        if v in vistos:
            continue
        g, pilha = [], [v]
        vistos.add(v)
        while pilha:
            x = pilha.pop()
            g.append(x)
            for e in x.link_edges:
                o = e.other_vert(x)
                if o not in vistos:
                    vistos.add(o)
                    pilha.append(o)
        grupos.append(g)
    grupos.sort(key=len, reverse=True)
    fora = [v for g in grupos[1:] for v in g]
    if fora:
        bmesh.ops.delete(bm, geom=fora, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    return len(grupos) - 1


def _aplicar(ob, tipo, **kw):
    m = ob.modifiers.new(tipo.lower(), tipo)
    for k, v in kw.items():
        setattr(m, k, v)
    U.ativar(ob)
    bpy.ops.object.modifier_apply(modifier=m.name)
    return ob


def quadriflow(ob, quads, simetria):
    """QuadriFlow (quads alinhados à curvatura). Ele recusa arestas menores que 1e-4 em valor
    absoluto ("não manifold"): a malha em metros tem arestas de centésimos de milímetro, então a
    cópia é ampliada 100× durante a remalha e volta ao tamanho depois."""
    from mathutils import Matrix
    k = 100.0
    ob.data.transform(Matrix.Scale(k, 4))
    ob.data.update()
    U.ativar(ob)
    try:
        r = bpy.ops.object.quadriflow_remesh(use_mesh_symmetry=simetria, use_preserve_sharp=False, use_preserve_boundary=False,
                                             preserve_attributes=False, smooth_normals=False, mode='FACES', target_faces=quads, seed=7)
        ok = 'FINISHED' in r and len(ob.data.polygons) > quads * 0.5
    except Exception:   # noqa: BLE001
        ok = False
    ob.data.transform(Matrix.Scale(1 / k, 4))
    ob.data.update()
    return ok


def retopologia(fonte, tipo='quadrupede', nome='LOD0', quads=None):
    """Malha nova em quads sobre a fonte. Devolve (objeto, info).
    1º QuadriFlow direto na fonte limpa (uma casca fechada); se ela não servir (buracos, várias
    cascas), remalha por voxels antes (volume fechado) e QuadriFlow nele; por último, redução."""
    T = TIPOS[tipo]
    quads = quads or T['quads']
    comp = max(fonte.dimensions)
    info = {}
    vox = copia(fonte, nome + '_volume')
    vox.data.materials.clear()
    ok = quadriflow(vox, quads, T['simetria'])
    if ok:
        info['metodo'] = 'QuadriFlow na fonte limpa (quads)'
    else:
        bpy.data.objects.remove(vox, do_unlink=True)
        vox = copia(fonte, nome + '_volume')
        vox.data.materials.clear()
        _aplicar(vox, 'REMESH', mode='VOXEL', voxel_size=comp * T['voxel'], adaptivity=0.0, use_smooth_shade=True)
        info.update(voxel_m=round(comp * T['voxel'], 4), volume_faces=len(vox.data.polygons))
        info['pedacos_removidos'] = so_maior(vox)   # pontas de pelo soltas viram ilhas: fica o corpo (o QuadriFlow pede uma casca só)
        info['soldados_voxel'] = limpar(vox, dist=comp * 1e-5)['soldados']   # o voxel deixa arestas quase nulas
        ok = quadriflow(vox, quads, T['simetria'])
        if ok:
            info['metodo'] = 'voxel + QuadriFlow (quads)'
    if not ok:
        # sem QuadriFlow (falhou na malha): redução que preserva a borda até o orçamento
        info['metodo'] = 'voxel + redução (QuadriFlow falhou)'
        alvo = quads * 2 / max(1, len(vox.data.polygons) * 2)
        _aplicar(vox, 'DECIMATE', decimate_type='COLLAPSE', ratio=max(0.002, min(1.0, alvo)), use_symmetry=T['simetria'], symmetry_axis='X')
    vox.name = nome
    vox.data.name = nome
    # encosta na superfície da fonte: a silhueta (orelhas, tufos, garras) volta para o lugar
    sw = vox.modifiers.new('encostar', 'SHRINKWRAP')
    sw.target = fonte
    sw.wrap_method = 'NEAREST_SURFACEPOINT'
    U.ativar(vox)
    bpy.ops.object.modifier_apply(modifier=sw.name)
    _aplicar(vox, 'CORRECTIVE_SMOOTH', factor=0.35, iterations=3, smooth_type='LENGTH_WEIGHTED', use_only_smooth=False)
    for p in vox.data.polygons:
        p.use_smooth = True
    vox.data.validate(clean_customdata=False)
    info.update(diagnosticar(vox))
    return vox, info


# ------------------------------------------------------------------ 4. UV
def uv(ob, margem=0.004, angulo=62):
    U.ativar(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(angulo), island_margin=margem, area_weight=0.6, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


# ------------------------------------------------------------------ 5. assar da fonte
def _imagens_fonte(fonte):
    """Imagens do material glTF da fonte: cor, metal/aspereza (canais B/G), normais."""
    m = fonte.active_material
    nt = m.node_tree
    P = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    def img_de(sock):
        pilha = [sock]
        while pilha:
            s = pilha.pop()
            for l in s.links:
                n = l.from_node
                if n.type == 'TEX_IMAGE':
                    return n.image
                pilha += [i for i in n.inputs if i.is_linked]
        return None
    return dict(cor=img_de(P.inputs['Base Color']), orm=img_de(P.inputs['Roughness']) or img_de(P.inputs['Metallic']), nrm=img_de(P.inputs['Normal']))


def _material_emissao(nome, img, canal=None, cor=True):
    """Material da fonte só para o assado: a imagem (ou um canal dela) na emissão."""
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = img
    em = nt.nodes.new('ShaderNodeEmission')
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    if canal is None:
        nt.links.new(t.outputs['Color'], em.inputs['Color'])
    else:
        sp = nt.nodes.new('ShaderNodeSeparateColor')
        nt.links.new(t.outputs['Color'], sp.inputs['Color'])
        nt.links.new(sp.outputs[canal], em.inputs['Color'])
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m


def assar(baixa, fonte, lado=2048, extrusao=0.02, pasta=None, prefixo='criatura'):
    """Assa a fonte na malha nova: cor (sRGB), aspereza e metal (dados), normais (espaço
    tangente) e a emissão (as partes acesas da arte, separadas pela cor). Devolve as imagens e o
    material PBR da malha nova."""
    I = _imagens_fonte(fonte)
    for k in ('cor', 'orm'):
        if I[k] is not None and k == 'orm':
            I[k].colorspace_settings.name = 'Non-Color'
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 4
    sc.render.bake.use_selected_to_active = True
    sc.render.bake.cage_extrusion = extrusao
    sc.render.bake.max_ray_distance = extrusao * 2.5
    sc.render.bake.margin = 6
    # material da malha nova com os nós de imagem para assar
    mb = bpy.data.materials.new(prefixo + '_pbr')
    mb.use_nodes = True
    nt = mb.node_tree
    P = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    baixa.data.materials.clear()
    baixa.data.materials.append(mb)
    imgs = {}
    def alvo(nome, dados):
        im = bpy.data.images.new(f'{prefixo}_{nome}', lado, lado, alpha=False, float_buffer=False)
        im.colorspace_settings.name = 'Non-Color' if dados else 'sRGB'
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = im
        n.name = 'bake_' + nome
        imgs[nome] = (im, n)
        return n
    for nome, dados in (('cor', False), ('aspereza', True), ('metal', True), ('normal', True)):
        alvo(nome, dados)
    mat_orig = fonte.active_material

    def bake(nome, tipo, mat_fonte):
        fonte.data.materials.clear()
        fonte.data.materials.append(mat_fonte)
        for n in nt.nodes:
            n.select = False
        imgs[nome][1].select = True
        nt.nodes.active = imgs[nome][1]
        bpy.ops.object.select_all(action='DESELECT')
        fonte.select_set(True)
        baixa.select_set(True)
        bpy.context.view_layer.objects.active = baixa
        kw = dict(type=tipo, use_selected_to_active=True, cage_extrusion=extrusao, max_ray_distance=extrusao * 2.5, margin=6)
        if tipo == 'NORMAL':
            kw.update(normal_space='TANGENT')
        bpy.ops.object.bake(**kw)
    bake('cor', 'EMIT', _material_emissao('bake_cor', I['cor']))
    if I['orm'] is not None:
        bake('aspereza', 'EMIT', _material_emissao('bake_asp', I['orm'], canal='Green'))
        bake('metal', 'EMIT', _material_emissao('bake_met', I['orm'], canal='Blue'))
    else:
        for nome, v in (('aspereza', 0.8), ('metal', 0.0)):
            imgs[nome][0].generated_color = (v, v, v, 1)
    bake('normal', 'NORMAL', mat_orig)
    fonte.data.materials.clear()
    fonte.data.materials.append(mat_orig)
    # emissão: as linhas acesas (ciano/azul saturado e claro) da cor assada
    cor = np.array(imgs['cor'][0].pixels[:], dtype=np.float32).reshape(lado, lado, 4)
    r, g, b = cor[..., 0], cor[..., 1], cor[..., 2]
    mx, mn = cor[..., :3].max(-1), cor[..., :3].min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    azul = np.clip((np.maximum(g, b) - r - 0.18) / 0.25, 0, 1)
    em = np.clip((sat - 0.45) / 0.3, 0, 1) * np.clip((mx - 0.55) / 0.3, 0, 1) * azul
    emi = bpy.data.images.new(f'{prefixo}_emissao', lado, lado, alpha=False, float_buffer=False)
    emi.colorspace_settings.name = 'sRGB'
    E = np.zeros_like(cor)
    E[..., :3] = cor[..., :3] * em[..., None]
    E[..., 3] = 1
    emi.pixels[:] = E.reshape(-1)
    # material final PBR (as texturas assadas ligadas)
    ic, ia, imt, inn = (imgs[k][1] for k in ('cor', 'aspereza', 'metal', 'normal'))
    nt.links.new(ic.outputs['Color'], P.inputs['Base Color'])
    nt.links.new(ia.outputs['Color'], P.inputs['Roughness'])
    nt.links.new(imt.outputs['Color'], P.inputs['Metallic'])
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(inn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], P.inputs['Normal'])
    ne = nt.nodes.new('ShaderNodeTexImage')
    ne.image = emi
    ke = 'Emission Color' if 'Emission Color' in P.inputs else 'Emission'
    nt.links.new(ne.outputs['Color'], P.inputs[ke])
    P.inputs['Emission Strength'].default_value = 2.0
    if pasta:
        os.makedirs(pasta, exist_ok=True)
        for nome, (im, _) in list(imgs.items()) + [('emissao', (emi, None))]:
            im.filepath_raw = os.path.join(pasta, f'{prefixo}_{nome}.png')
            im.file_format = 'PNG'
            im.save()
    for im, _ in imgs.values():
        im.pack()
    emi.pack()
    return mb, dict(lado=lado, emissao_pct=round(100.0 * float((em > 0.2).mean()), 2))


# ------------------------------------------------------------------ 6. LODs
def lods(lod0, fracoes=(0.5, 0.25, 0.1), base='corpo'):
    """Cópias do LOD 0 reduzidas (colapso que respeita a borda e a UV; mesmas texturas)."""
    out = []
    for i, fr in enumerate(fracoes, 1):
        c = copia(lod0, f'{base}_LOD{i}')
        for m in list(c.modifiers):
            c.modifiers.remove(m)
        c.vertex_groups.clear()
        _aplicar(c, 'DECIMATE', decimate_type='COLLAPSE', ratio=fr, use_symmetry=True, symmetry_axis='X', use_collapse_triangulate=False)
        c.data.validate(clean_customdata=False)
        out.append(c)
    return out


def copiar_pesos(origem, destinos, arm):
    """Pesos do LOD 0 para os outros LODs (transferência pela superfície mais próxima)."""
    for d in destinos:
        for g in origem.vertex_groups:
            if not d.vertex_groups.get(g.name):
                d.vertex_groups.new(name=g.name)
        m = d.modifiers.new('pesos', 'DATA_TRANSFER')
        m.object = origem
        m.use_vert_data = True
        m.data_types_verts = {'VGROUP_WEIGHTS'}
        m.vert_mapping = 'POLYINTERP_NEAREST'
        m.layers_vgroup_select_src = 'ALL'
        m.layers_vgroup_select_dst = 'NAME'
        U.ativar(d)
        bpy.ops.object.modifier_apply(modifier=m.name)
        bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
        d.parent = arm
        am = d.modifiers.new('Armature', 'ARMATURE')
        am.object = arm


def sem_peso(ob, arm):
    nomes = {b.name for b in arm.data.bones if b.use_deform}
    return sum(1 for v in ob.data.vertices if not any(ob.vertex_groups[g.group].name in nomes and g.weight > 0 for g in v.groups))
