"""Base das criaturas de Eclipse Zero feitas no Blender (tools/blender/criaturas/).

O caminho de cada criatura (um script por espécie, que importa este módulo):
  1. FORMA: um grafo anatômico (pontos com raio: coluna, pescoço, cabeça, focinho, pernas, cauda)
     vira malha pelo modificador Skin (quadriláteros que seguem o corpo, bons para deformar) e é
     suavizada por subdivisão; campos de escultura (deslocamentos suaves em volta de pontos)
     dão músculo, peito fundo, barriga recolhida, crânio e focinho; peças à parte (orelhas,
     olhos, mandíbula, dentes, garras) entram na mesma malha com grupos de vértices próprios.
  2. ALTA E BAIXA: a malha de baixa (a do jogo, poucos milhares de triângulos) e uma cópia de
     alta (subdivisão e deslocamento por textura: pelo, escamas, placas) que só serve para assar.
  3. TEXTURAS PBR: cor (com a oclusão), ORM (oclusão, aspereza, metal), normais no espaço tangente
     ASSADAS DA ALTA NA BAIXA (o detalhe da alta vira mapa de normais) e emissão (olhos, veias).
  4. ESQUELETO próprio da anatomia (coluna, pescoço, cabeça, mandíbula, orelhas, cauda, pernas
     com ombro, cotovelo, pulso e pata) e PESOS automáticos (calor dos ossos), com as peças rígidas
     (olhos, dentes, mandíbula, garras) presas ao osso delas.
  5. ANIMAÇÕES gravadas como ações do Blender (idle, andar, correr, atacar, dano, morte e as da
     espécie), cada uma no próprio trilho de NLA, exportadas com o GLB por nome.
  6. SAÍDA: o .blend editável (com o grafo de base e a alta como modificadores, não aplicados) e o
     .glb do jogo, as prévias (pose e folha das animações) e o relatório.
Eixos (Blender): Z para cima, metros, a frente olha para -Y (como o resto do kit).
"""
import json
import math
import os
import sys
import time

import bpy
import bmesh
from mathutils import Vector, Matrix, Euler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import utils as U   # noqa: E402

RAIZ = U.RAIZ
CRIATURAS = os.path.join(RAIZ, 'assets', 'Creatures')
FPS = 24


# ------------------------------------------------------------------ forma
def grafo_pele(nome, pontos, arestas, raios, subdiv=2, raiz=0):
    """Malha do grafo anatômico pelo modificador Skin. pontos: [(x, y, z)], raios: [(rx, ry)]
    (rx de lado, ry de cima a baixo, no referencial do osso), arestas: [(i, j)]. Devolve o objeto
    com os modificadores (Skin e subdivisão) ainda NÃO aplicados (o .blend fica editável)."""
    me = bpy.data.meshes.new(nome)
    me.from_pydata([Vector(p) for p in pontos], arestas, [])
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    sk = ob.modifiers.new('Skin', 'SKIN')
    sk.use_smooth_shade = True
    sk.branch_smoothing = 0.6
    for i, r in enumerate(raios):
        v = me.skin_vertices[0].data[i]
        v.radius = r
        v.use_root = (i == raiz)
    sd = ob.modifiers.new('Subdiv', 'SUBSURF')
    sd.levels = subdiv
    sd.render_levels = subdiv
    return ob


def aplicar_tudo(ob):
    U.ativar(ob)
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    return ob


def copia(ob, nome):
    d = ob.copy()
    d.data = ob.data.copy()
    d.name = nome
    bpy.context.scene.collection.objects.link(d)
    return d


def esculpir(ob, campos):
    """Deslocamentos suaves (gaussianos) da malha: cada campo {c: centro, r: raio, d: vetor} ou
    {c, r, n: valor ao longo da normal} ou {c, r, s: (sx, sy, sz) escala em volta do centro};
    'lado': +1/-1 só de um lado do plano x = 0 (e espelha o centro para o outro com 'espelho')."""
    me = ob.data
    me.calc_loop_triangles()
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.normal_update()
    for C in campos:
        cs = [Vector(C['c'])]
        if C.get('espelho'):
            q = Vector(C['c'])
            q.x = -q.x
            cs.append(q)
        for c in cs:
            r2 = C['r'] * C['r']
            for v in bm.verts:
                d2 = (v.co - c).length_squared
                if d2 > r2 * 9:
                    continue
                w = math.exp(-d2 / (2 * r2 * 0.36)) * C.get('k', 1.0)
                if 'd' in C:
                    dv = Vector(C['d'])
                    if C.get('espelho') and c.x < 0:
                        dv.x = -dv.x
                    v.co += dv * w
                if 'n' in C:
                    v.co += v.normal * C['n'] * w
                if 's' in C:
                    s = Vector(C['s'])
                    rel = v.co - c
                    v.co = c + Vector((rel.x * (1 + (s.x - 1) * w), rel.y * (1 + (s.y - 1) * w), rel.z * (1 + (s.z - 1) * w)))
    bm.to_mesh(me)
    bm.free()
    me.update()
    return ob


def peca(nome, verts, faces, grupo=None, liso=True):
    me = bpy.data.meshes.new(nome)
    me.from_pydata([Vector(v) for v in verts], [], faces)
    me.update()
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    if liso:
        for p in me.polygons:
            p.use_smooth = True
    if grupo:
        g = ob.vertex_groups.new(name=grupo)
        g.add(list(range(len(verts))), 1.0, 'REPLACE')
    return ob


def esfera(nome, centro, raio, seg=12, aneis=8, escala=(1, 1, 1), grupo=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=aneis, radius=raio)
    for v in bm.verts:
        v.co = Vector((v.co.x * escala[0], v.co.y * escala[1], v.co.z * escala[2])) + Vector(centro)
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    if grupo:
        g = ob.vertex_groups.new(name=grupo)
        g.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
    return ob


def cone(nome, base, ponta, raio, lados=6, achatar=1.0, grupo=None, eixo_lado=(1, 0, 0)):
    """Cone (dente, garra, orelha, espinho) da base até a ponta; achatar < 1 achata no eixo_lado."""
    base, ponta = Vector(base), Vector(ponta)
    ax = (ponta - base).normalized()
    u = Vector(eixo_lado).cross(ax)
    if u.length < 1e-4:
        u = Vector((0, 1, 0)).cross(ax)
    u.normalize()
    w = ax.cross(u).normalized()
    vs = [base + (u * math.cos(2 * math.pi * k / lados) + w * math.sin(2 * math.pi * k / lados) * achatar) * raio for k in range(lados)]
    vs.append(ponta)
    vs.append(base)
    fs = [(k, (k + 1) % lados, lados) for k in range(lados)] + [((k + 1) % lados, k, lados + 1) for k in range(lados)]
    return peca(nome, vs, fs, grupo, liso=True)


def juntar(objs, nome):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = nome
    ob.data.name = nome
    return ob


# ------------------------------------------------------------------ materiais
def _no(nt, tipo, x=0, y=0, **kw):
    return U._no(nt, tipo, x, y, **kw)


def material_pelagem(nome, P, semente=1):
    """Pelagem procedural (para assar): cor do dorso, dos flancos e da barriga pela altura e pelo
    lado do corpo (gradiente em coordenadas do objeto), máscaras de manchas, fios finos alongados
    (Noise esticado no comprimento do corpo), pontas mais claras, aspereza alta, e emissão
    opcional (veias de raiz acesas: P['veias'] = cor, P['veias_k'] intensidade).
    P: {dorso, flanco, barriga, focinho (cor), aspereza, veias, veias_k, escuro_patas}"""
    lin = lambda c: tuple(v ** 2.2 for v in c)   # (as cores da ficha são sRGB; o Blender pede linear)
    P = dict(P, dorso=lin(P['dorso']), flanco=lin(P['flanco']), barriga=lin(P['barriga']), patas=lin(P.get('patas', P['flanco'])))
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    tc = _no(nt, 'ShaderNodeTexCoord', -1600, 0)
    obj = tc.outputs['Object']
    sep = _no(nt, 'ShaderNodeSeparateXYZ', -1400, 200)
    nt.links.new(obj, sep.inputs[0])
    # altura relativa (0 nas patas, 1 no dorso) e o lado (|x|)
    alt = _no(nt, 'ShaderNodeMapRange', -1200, 300)
    alt.inputs['From Min'].default_value = P.get('z_barriga', 0.55)
    alt.inputs['From Max'].default_value = P.get('z_dorso', 0.92)
    nt.links.new(sep.outputs['Z'], alt.inputs['Value'])
    ramp = _no(nt, 'ShaderNodeValToRGB', -1000, 300)
    cr = ramp.color_ramp
    cr.elements[0].position = 0.0
    cr.elements[0].color = (*P['barriga'], 1)
    cr.elements[1].position = 1.0
    cr.elements[1].color = (*P['dorso'], 1)
    e = cr.elements.new(0.55)
    e.color = (*P['flanco'], 1)
    nt.links.new(alt.outputs[0], ramp.inputs['Fac'])
    cor = ramp.outputs['Color']
    # patas mais escuras embaixo (z < 0.25)
    pz = _no(nt, 'ShaderNodeMapRange', -1200, -100)
    pz.inputs['From Min'].default_value = 0.08
    pz.inputs['From Max'].default_value = 0.32
    nt.links.new(sep.outputs['Z'], pz.inputs['Value'])
    mixp = _no(nt, 'ShaderNodeMix', -800, 200, data_type='RGBA')
    sA = [x for x in mixp.inputs if x.name == 'A' and x.type == 'RGBA'][0]
    sB = [x for x in mixp.inputs if x.name == 'B' and x.type == 'RGBA'][0]
    sF = [x for x in mixp.inputs if x.name == 'Factor' and x.type == 'VALUE'][0]
    sA.default_value = (*P.get('patas', P['flanco']), 1)
    nt.links.new(pz.outputs[0], sF)
    nt.links.new(cor, sB)
    cor = [x for x in mixp.outputs if x.name == 'Result' and x.type == 'RGBA'][0]
    # fios: ruído esticado no comprimento (y) e fino no resto
    mp = _no(nt, 'ShaderNodeMapping', -1200, -400)
    mp.inputs['Scale'].default_value = (60, 9, 60)
    mp.inputs['Location'].default_value = (semente * 1.7, semente * 0.3, 0)
    nt.links.new(obj, mp.inputs['Vector'])
    fio = _no(nt, 'ShaderNodeTexNoise', -1000, -400)
    fio.inputs['Scale'].default_value = 3.0
    fio.inputs['Detail'].default_value = 10
    fio.inputs['Roughness'].default_value = 0.7
    nt.links.new(mp.outputs[0], fio.inputs['Vector'])
    # manchas grandes
    mn = _no(nt, 'ShaderNodeTexNoise', -1000, -700)
    mn.inputs['Scale'].default_value = 3.5
    mn.inputs['Detail'].default_value = 3
    nt.links.new(obj, mn.inputs['Vector'])
    k1 = _no(nt, 'ShaderNodeMath', -800, -400, operation='MULTIPLY_ADD')
    nt.links.new(fio.outputs['Fac'], k1.inputs[0])
    k1.inputs[1].default_value = 0.75
    k1.inputs[2].default_value = 0.62
    k2 = _no(nt, 'ShaderNodeMath', -650, -560, operation='MULTIPLY_ADD')
    nt.links.new(mn.outputs['Fac'], k2.inputs[0])
    k2.inputs[1].default_value = 0.5
    k2.inputs[2].default_value = 0.75
    k = _no(nt, 'ShaderNodeMath', -500, -450, operation='MULTIPLY')
    nt.links.new(k1.outputs[0], k.inputs[0])
    nt.links.new(k2.outputs[0], k.inputs[1])
    sc = _no(nt, 'ShaderNodeVectorMath', -350, 100, operation='SCALE')
    nt.links.new(cor, sc.inputs[0])
    nt.links.new(k.outputs[0], sc.inputs['Scale'])
    nt.links.new(sc.outputs[0], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = P.get('aspereza', 0.82)
    p.inputs['Metallic'].default_value = 0.0
    if P.get('veias'):
        # veias de raiz acesas: as cristas finas de um Voronoi (distância à aresta) nas costas
        vo = _no(nt, 'ShaderNodeTexVoronoi', -1000, -1000, feature='DISTANCE_TO_EDGE')
        vo.inputs['Scale'].default_value = 9.0
        nt.links.new(obj, vo.inputs['Vector'])
        ve = _no(nt, 'ShaderNodeMapRange', -800, -1000)
        ve.inputs['From Min'].default_value = 0.0
        ve.inputs['From Max'].default_value = 0.035
        ve.inputs['To Min'].default_value = 1.0
        ve.inputs['To Max'].default_value = 0.0
        nt.links.new(vo.outputs['Distance'], ve.inputs['Value'])
        dorso = _no(nt, 'ShaderNodeMapRange', -800, -1200)
        dorso.inputs['From Min'].default_value = P.get('z_veias', 0.7)
        dorso.inputs['From Max'].default_value = P.get('z_dorso', 0.92)
        nt.links.new(sep.outputs['Z'], dorso.inputs['Value'])
        mv = _no(nt, 'ShaderNodeMath', -600, -1100, operation='MULTIPLY')
        nt.links.new(ve.outputs[0], mv.inputs[0])
        nt.links.new(dorso.outputs[0], mv.inputs[1])
        em = _no(nt, 'ShaderNodeVectorMath', -400, -1100, operation='SCALE')
        em.inputs[0].default_value = tuple(v ** 2.2 for v in P['veias'][:3])   # (vetor: 3 componentes, linear)
        nt.links.new(mv.outputs[0], em.inputs['Scale'])
        ke = 'Emission Color' if 'Emission Color' in p.inputs else 'Emission'
        nt.links.new(em.outputs[0], p.inputs[ke])
        p.inputs['Emission Strength'].default_value = P.get('veias_k', 1.0)
    return m


def material_liso(nome, cor, aspereza=0.4, metal=0.0, emissao=None, forca=0.0):
    lin = lambda c: tuple(v ** 2.2 for v in c)
    return U.material_pbr(nome, cor=lin(cor), metal=metal, aspereza=aspereza, emissao=emissao, forca=forca)


# ------------------------------------------------------------------ alta, baixa e o assado
def alta_de(low, nome, subdiv=2, deslocamentos=()):
    """A malha de alta: cópia da baixa com subdivisão e deslocamentos por textura (pelo, escamas,
    placas), como MODIFICADORES (o .blend continua leve e editável). deslocamentos: [(tipo,
    escala, força)] com tipo 'pelo' (fios alongados), 'tufos' (mechas grandes), 'escamas' (Voronoi)."""
    hi = copia(low, nome)
    for m in list(hi.modifiers):
        hi.modifiers.remove(m)
    sd = hi.modifiers.new('Subdiv', 'SUBSURF')
    sd.levels = subdiv
    sd.render_levels = subdiv
    for k, (tipo, esc, forca) in enumerate(deslocamentos):
        tx = bpy.data.textures.new(f'{nome}_{tipo}_{k}', 'VORONOI' if tipo == 'escamas' else 'CLOUDS' if tipo == 'tufos' else 'STUCCI')
        if tipo == 'escamas':
            tx.noise_scale = esc
            tx.distance_metric = 'DISTANCE'
        elif tipo == 'tufos':
            tx.noise_scale = esc
            tx.noise_depth = 3
        else:
            tx.noise_scale = esc
            tx.turbulence = 6
            tx.stucci_type = 'WALL_IN'
        d = hi.modifiers.new(f'Desloca_{tipo}_{k}', 'DISPLACE')
        d.texture = tx
        d.texture_coords = 'LOCAL'
        d.strength = forca
        d.mid_level = 0.5
    return hi


def assar_alta_baixa(low, high, lado=1024, amostras_ao=24, extrusao=0.03, forca_emissao=2.0):
    """Assa na UV da baixa: a cor, a aspereza, o metal e a emissão dos materiais procedurais da
    baixa; as NORMAIS e a OCLUSÃO a partir da ALTA (selecionada para ativa, com gaiola por
    extrusão). Troca os materiais da baixa por um só com as quatro imagens (cor com a oclusão, ORM,
    normais e emissão). Devolve o material e as imagens."""
    import numpy as np
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    me = low.data
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    me.uv_layers.new(name='UVMap')
    U.ativar(low)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(55), island_margin=0.006, area_weight=0.4)
    bpy.ops.uv.pack_islands(margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')
    mats = [s.material for s in low.material_slots if s.material]
    # a alta usa os mesmos materiais (a AO e as normais vêm dela; a cor vem da baixa)
    alvo = {}
    for m in mats:
        n = m.node_tree.nodes.new('ShaderNodeTexImage')
        n.location = (600, -600)
        alvo[m.name] = n

    def img(nm, cor):
        im = bpy.data.images.new(f'{low.name}_{nm}', lado, lado, alpha=False)
        im.colorspace_settings.name = 'sRGB' if cor else 'Non-Color'
        return im

    def prepara(im):
        for m in mats:
            n = alvo[m.name]
            n.image = im
            for q in m.node_tree.nodes:
                q.select = False
            n.select = True
            m.node_tree.nodes.active = n

    def bake_proprio(tipo, im, amostras=1, **kw):
        sc.cycles.samples = amostras
        prepara(im)
        bpy.ops.object.select_all(action='DESELECT')
        low.select_set(True)
        bpy.context.view_layer.objects.active = low
        bpy.ops.object.bake(type=tipo, margin=6, use_clear=True, use_selected_to_active=False, **kw)
        return im

    def bake_da_alta(tipo, im, amostras=1, **kw):
        sc.cycles.samples = amostras
        prepara(im)
        bpy.ops.object.select_all(action='DESELECT')
        high.select_set(True)
        low.select_set(True)
        bpy.context.view_layer.objects.active = low
        bpy.ops.object.bake(type=tipo, margin=6, use_clear=True, use_selected_to_active=True, cage_extrusion=extrusao, max_ray_distance=extrusao * 2.5, **kw)
        return im

    def canal_por_emissao(entrada, im):
        salvos = []
        for m in mats:
            nt = m.node_tree
            p = nt.nodes.get('Principled BSDF')
            out = nt.nodes.get('Material Output')
            em = nt.nodes.new('ShaderNodeEmission')
            sk = p.inputs[entrada]
            if sk.is_linked:
                nt.links.new(sk.links[0].from_socket, em.inputs['Color'])
            else:
                v = sk.default_value
                em.inputs['Color'].default_value = (v, v, v, 1) if isinstance(v, float) else tuple(v)
            nt.links.new(em.outputs[0], out.inputs['Surface'])
            salvos.append((nt, p, out, em))
        bake_proprio('EMIT', im)
        for nt, p, out, em in salvos:
            nt.links.new(p.outputs[0], out.inputs['Surface'])
            nt.nodes.remove(em)
        return im

    t0 = time.time()
    if not high.data.materials:
        for m in mats:
            high.data.materials.append(m)
    i_cor = canal_por_emissao('Base Color', img('cor', True))
    i_rough = canal_por_emissao('Roughness', img('aspereza', False))
    i_metal = canal_por_emissao('Metallic', img('metal', False))
    i_emi = bake_proprio('EMIT', img('emissao', True))
    i_ao = bake_da_alta('AO', img('ao', False), amostras_ao)
    i_nrm = bake_da_alta('NORMAL', img('normais', False), 4, normal_space='TANGENT')
    print(f'assado {low.name}: {lado}px (normais e oclusão da alta) em {time.time() - t0:.1f}s')

    def px(im):
        a = np.empty(lado * lado * 4, np.float32)
        im.pixels.foreach_get(a)
        return a.reshape(lado, lado, 4)
    ao = px(i_ao)[..., 0]
    cor = px(i_cor)
    cor[..., :3] *= (0.38 + 0.62 * ao)[..., None]
    i_cor.pixels.foreach_set(cor.ravel())
    orm = np.ones((lado, lado, 4), np.float32)
    orm[..., 0] = ao
    orm[..., 1] = px(i_rough)[..., 0]
    orm[..., 2] = px(i_metal)[..., 0]
    i_orm = img('orm', False)
    i_orm.pixels.foreach_set(orm.ravel())
    for im in (i_cor, i_orm, i_nrm, i_emi):
        im.pack()
    fim = bpy.data.materials.new(low.name)
    fim.use_nodes = True
    nt = fim.node_tree
    p = nt.nodes.get('Principled BSDF')
    t_cor = _no(nt, 'ShaderNodeTexImage', -700, 300, image=i_cor)
    t_orm = _no(nt, 'ShaderNodeTexImage', -700, 0, image=i_orm)
    t_nrm = _no(nt, 'ShaderNodeTexImage', -700, -300, image=i_nrm)
    t_emi = _no(nt, 'ShaderNodeTexImage', -700, -600, image=i_emi)
    sep = _no(nt, 'ShaderNodeSeparateColor', -400, 0)
    nm = _no(nt, 'ShaderNodeNormalMap', -400, -300)
    nt.links.new(t_cor.outputs['Color'], p.inputs['Base Color'])
    nt.links.new(t_orm.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], p.inputs['Roughness'])
    nt.links.new(sep.outputs['Blue'], p.inputs['Metallic'])
    nt.links.new(t_nrm.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    ke = 'Emission Color' if 'Emission Color' in p.inputs else 'Emission'
    nt.links.new(t_emi.outputs['Color'], p.inputs[ke])
    p.inputs['Emission Strength'].default_value = forca_emissao
    me.materials.clear()
    me.materials.append(fim)
    for pl in me.polygons:
        pl.material_index = 0
    for im in (i_ao, i_rough, i_metal):
        bpy.data.images.remove(im)
    return fim


# ------------------------------------------------------------------ esqueleto, pesos e ações
def armadura(nome, ossos):
    """ossos: [(nome, cabeça, cauda, pai, rolagem)] em metros. Devolve o objeto da armadura."""
    ad = bpy.data.armatures.new(nome)
    ao = bpy.data.objects.new(nome, ad)
    bpy.context.scene.collection.objects.link(ao)
    U.ativar(ao)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = ad.edit_bones
    for nm, h, t, pai, rol in ossos:
        b = eb.new(nm)
        b.head = Vector(h)
        b.tail = Vector(t)
        b.roll = rol
        if pai:
            b.parent = eb[pai]
            b.use_connect = (eb[pai].tail - b.head).length < 1e-4
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in ao.pose.bones:
        pb.rotation_mode = 'XYZ'
    return ao


def pesar(malha, arm, rigidos=None, corpo=None):
    """Pele por pesos automáticos (calor dos ossos) e as peças rígidas presas ao osso delas
    (rigidos: {grupo_da_peça: osso}); normaliza até 4 ossos por vértice. corpo: cópia do corpo sem
    as peças (uma malha só, fechada: o calor dos ossos acha solução), com os vértices na mesma
    ordem do começo da malha final; os pesos dele são copiados para ela."""
    nomes_ossos = {b.name for b in arm.data.bones}
    bpy.ops.object.select_all(action='DESELECT')
    if corpo is not None:
        corpo.select_set(True)
        arm.select_set(True)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        bpy.ops.object.select_all(action='DESELECT')
        malha.select_set(True)
        arm.select_set(True)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.parent_set(type='ARMATURE_NAME')
        for g in corpo.vertex_groups:
            if g.name not in nomes_ossos:
                continue
            dst = malha.vertex_groups.get(g.name) or malha.vertex_groups.new(name=g.name)
            for v in corpo.data.vertices:
                for x in v.groups:
                    if x.group == g.index and x.weight > 0:
                        dst.add([v.index], x.weight, 'REPLACE')
        bpy.data.objects.remove(corpo, do_unlink=True)
    else:
        malha.select_set(True)
        arm.select_set(True)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    for grupo, osso in (rigidos or {}).items():
        g = malha.vertex_groups.get(grupo)
        if not g:
            continue
        idx = [v.index for v in malha.data.vertices if any(x.group == g.index and x.weight > 0.5 for x in v.groups)]
        for vg in malha.vertex_groups:
            if vg.name in nomes_ossos:
                vg.remove(idx)
        malha.vertex_groups[osso].add(idx, 1.0, 'REPLACE')
    # quem o calor dos ossos não alcançou (peças soltas, mechas, garras): os dois ossos mais perto
    # (distância ao segmento do osso), com peso pela proximidade
    mw = arm.matrix_world.inverted() @ malha.matrix_world
    segs = [(b.name, b.head_local.copy(), b.tail_local.copy()) for b in arm.data.bones if b.use_deform]
    def dist_seg(p, a, c):
        ab = c - a
        t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
        return (p - (a + ab * t)).length
    for v in malha.data.vertices:
        if any(malha.vertex_groups[x.group].name in nomes_ossos and x.weight > 0 for x in v.groups):
            continue
        p = mw @ v.co
        ds = sorted((dist_seg(p, h, t), nm) for nm, h, t in segs)[:2]
        w0 = 1.0 / max(ds[0][0], 1e-4) ** 2
        w1 = 1.0 / max(ds[1][0], 1e-4) ** 2
        for d, nm in ((ds[0], w0), (ds[1], w1))[:2] if False else ((ds[0][1], w0 / (w0 + w1)), (ds[1][1], w1 / (w0 + w1))):
            g = malha.vertex_groups.get(d) or malha.vertex_groups.new(name=d)
            g.add([v.index], nm, 'ADD')
    U.ativar(malha)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='BONE_DEFORM', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)
    sem = sum(1 for v in malha.data.vertices if not any(malha.vertex_groups[x.group].name in nomes_ossos and x.weight > 0 for x in v.groups))
    return sem


def acao(arm, nome, quadros, chaves, ciclo=True):
    """Grava uma ação: chaves[osso] = [(quadro, (rx, ry, rz) em graus) ...] ou
    [(quadro, (rx, ry, rz), (lx, ly, lz))] com translação; 'ciclo': o último quadro repete o
    primeiro (o laço fecha sem salto). Cada ação vai para o seu trilho de NLA (o GLB leva todas)."""
    act = bpy.data.actions.new(nome)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    for pb in arm.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    for osso, K in chaves.items():
        pb = arm.pose.bones.get(osso)
        if pb is None:
            continue
        for k in K:
            f, rot = k[0], k[1]
            pb.rotation_euler = tuple(math.radians(a) for a in rot)
            pb.keyframe_insert('rotation_euler', frame=f)
            if len(k) > 2:
                pb.location = k[2]
                pb.keyframe_insert('location', frame=f)
        if ciclo and K and K[-1][0] < quadros:
            pb.rotation_euler = tuple(math.radians(a) for a in K[0][1])
            pb.keyframe_insert('rotation_euler', frame=quadros)
            if len(K[0]) > 2:
                pb.location = K[0][2]
                pb.keyframe_insert('location', frame=quadros)
    for fc in _fcurves(act):
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'
            kp.easing = 'AUTO'
        if ciclo:
            fc.modifiers.new('CYCLES') if False else None
    tr = arm.animation_data.nla_tracks.new()
    tr.name = nome
    st = tr.strips.new(nome, 1, act)
    st.name = nome
    tr.mute = True
    arm.animation_data.action = None
    return act


def _fcurves(act):
    """F-curves de uma ação (as ações em camadas do Blender 4.4+ e as antigas)."""
    try:
        return list(act.fcurves)
    except AttributeError:
        out = []
        for lay in act.layers:
            for st in lay.strips:
                for bag in st.channelbags:
                    out.extend(bag.fcurves)
        return out


# ------------------------------------------------------------------ saída
def pasta(categoria, ident):
    p = os.path.join(CRIATURAS, categoria, ident)
    os.makedirs(p, exist_ok=True)
    return p


def exportar(caminho, objs):
    """GLB com a malha com pele, a armadura e TODAS as ações (cada trilho de NLA vira uma animação
    com o nome dele); texturas JPEG embutidas (as normais em PNG)."""
    U.backup(caminho)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    kw = dict(filepath=caminho, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
              export_materials='EXPORT', export_cameras=False, export_lights=False, export_skins=True,
              export_animations=True, export_image_format='AUTO')
    try:
        bpy.ops.export_scene.gltf(**kw, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1)
    except TypeError:
        bpy.ops.export_scene.gltf(**kw)
    return caminho


def salvar_blend(caminho):
    U.backup(caminho)
    bpy.ops.wm.save_as_mainfile(filepath=caminho, compress=True)
    return caminho
