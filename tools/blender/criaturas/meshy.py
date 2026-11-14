"""Criaturas enviadas prontas (GLB do Meshy) de Eclipse Zero: cavalo, beagle, gato e galinha, com
retopologia, esqueleto, animações e pelagens feitos no Blender.

As fontes ficam intactas em .../<id>/fonte/ (Git LFS): malhas estáticas de 58 a 190 mil
triângulos, sem esqueleto, com cor, metal/aspereza e normais (texturas 2K).
Etapas (as mesmas do lobo neon e da Asa Noturna; tools/blender/topologia/retopologia.py):
  limpeza → retopologia em quads com simetria → encosto na fonte → UV nova → assado da cor,
  aspereza, metal e normais (sem emissão: são animais naturais) → LOD 1–3
Esqueleto:
  quadrúpedes (cavalo, beagle, gato): o esqueleto do lobo (31 ossos, lobo.py) levado às medidas de
    cada malha (focinho, patas, cernelha, linha do corpo e das pernas: lobo_neon.fazer_mapa), pesos
    pelo calor dos ossos e as 15 animações do lobo, com os deslocamentos do corpo (deitar, pular,
    o sobe e desce do passo) na escala da altura de cada animal;
  galinha: esqueleto de ave (o da Asa Noturna) com as ASAS DOBRADAS junto ao corpo, medidas na
    malha (a asa da galinha não fica aberta como a de uma ave de voo), e animações próprias de
    galinha: andar balançando a cabeça, ciscar, cantar, bater as asas, dormir, sentar…
Cavalo: a SELA é medida na malha (a altura do assento entre o arção e a patilha, a posição ao longo
do corpo e a largura dos estribos): o herói montado senta nela (js/mundo/montarias.js).
Pelagens: a cor assada é remapeada só onde a máscara deixa (o pelo do cavalo sem a sela e as
rédeas; o gato sem os olhos; as penas claras da galinha sem a crista, o bico e as pernas).
Saída: assets/Creatures/<pasta>/<id>/<id>.{glb,blend,png} + <id>_topologia.json (+ as pelagens).
Rode: python3 tools/blender/criaturas/meshy.py [cavalo beagle gato_malhado galinha]
"""
import json
import math
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'topologia'))
import base as B   # noqa: E402
import lobo   # noqa: E402
import retopologia as R   # noqa: E402
import bpy   # noqa: E402
from mathutils import Vector   # noqa: E402
from lobo import ciclo, unica   # noqa: E402
from lobo_neon import MOLDE_CERNELHA_Z, fazer_mapa, medir, sem_mandibula, wire, zerar   # noqa: E402
import asa_noturna as AN   # noqa: E402

U = B.U

# pelagem: (máscara, escuro, médio, claro[, listras acesas: (cor, força)])
CRIATURAS = {
    'cavalo': dict(fonte='Mounts/cavalo/fonte/cavalo.glb', pasta='Mounts', molde='lobo', sela=True,
                   amortecer={'correr': 0.55, 'trotar': 0.8, 'saltar': 0.6},   # (pernas longas: a passada do lobo molde exagera)
                   pelagens={'cavalo_negro': ('pelo_cavalo', (0.03, 0.03, 0.035), (0.11, 0.1, 0.1), (0.3, 0.28, 0.27)),
                             'cavalo_tordilho': ('pelo_cavalo', (0.34, 0.34, 0.36), (0.66, 0.66, 0.68), (0.92, 0.92, 0.93))}),
    'beagle': dict(fonte='Pets/Dogs/beagle/fonte/cachorro.glb', pasta='Pets/Dogs', molde='lobo', pelagens={}),
    'gato_malhado': dict(fonte='Pets/Cats/gato_malhado/fonte/gato.glb', pasta='Pets/Cats', molde='lobo',
                         pelagens={'gato_cinza': ('sem_olhos', (0.17, 0.18, 0.21), (0.46, 0.48, 0.53), (0.9, 0.9, 0.92)),
                                   'gato_sombra': ('sem_olhos', (0.025, 0.025, 0.04), (0.09, 0.08, 0.12), (0.34, 0.31, 0.42), ((0.66, 0.36, 1.0), 1.6))}),
    # cabra e ovelha REAIS (enviadas): substituem as feitas a partir da malha do lobo (especies.py); a cabra
    # traz os chifres na própria malha
    'cabra': dict(fonte='DomesticAnimals/cabra/fonte/cabra_de_verdade.glb', pasta='DomesticAnimals', molde='lobo', pelagens={}),
    'ovelha': dict(fonte='DomesticAnimals/ovelha/fonte/ovelha_de_verdade.glb', pasta='DomesticAnimals', molde='lobo', pelagens={}),
    'galinha': dict(fonte='DomesticAnimals/galinha/fonte/Galinha.glb', pasta='DomesticAnimals', molde='ave',
                    pelagens={'galinha_ruiva': ('penas_claras', (0.32, 0.12, 0.04), (0.64, 0.3, 0.1), (0.9, 0.6, 0.34)),
                              'galinha_preta': ('penas_claras', (0.025, 0.025, 0.03), (0.09, 0.09, 0.11), (0.3, 0.3, 0.34))}),
}


# ------------------------------------------------------------------ medidas extras
def medir_sela(M):
    """O assento da sela (cavalo): no meio do lombo, o perfil de cima (z mais alto por fatia de Y)
    tem o arção na frente e a patilha atrás; o assento é o ponto mais baixo entre os dois. Os
    estribos são o que mais sai para os lados abaixo da sela."""
    V, W, H = M['V'], M['W'], M['H']
    y0, y1 = M['fy'] + 0.2 * (M['hy'] - M['fy']), M['fy'] + 0.8 * (M['hy'] - M['fy'])
    meio = V[(np.abs(V[:, 0]) < 0.12 * W) & (V[:, 1] > y0) & (V[:, 1] < y1)]
    ys = np.linspace(y0, y1, 25)
    topo = []
    for a, b in zip(ys[:-1], ys[1:]):
        S = meio[(meio[:, 1] >= a) & (meio[:, 1] < b)]
        if len(S) > 4:
            topo.append(((a + b) / 2, float(S[:, 2].max())))
    T = np.array(topo)
    k0 = int(np.argmax(T[:len(T) // 2, 1]))   # arção (frente)
    k1 = len(T) // 2 + int(np.argmax(T[len(T) // 2:, 1]))   # patilha (trás)
    k = k0 + int(np.argmin(T[k0:k1 + 1, 1])) if k1 > k0 else int(np.argmin(T[:, 1]))
    sy, sz = float(T[k, 0]), float(T[k, 1])
    lado = V[(np.abs(V[:, 1] - sy) < 0.12 * M['L']) & (V[:, 2] > 0.3 * H) & (V[:, 2] < sz - 0.1 * H)]
    estribo = float(np.percentile(np.abs(lado[:, 0]), 99)) if len(lado) else 0.5 * W
    barril = V[(np.abs(V[:, 1] - sy) < 0.05 * M['L']) & (np.abs(V[:, 2] - (sz - 0.12 * H)) < 0.04 * H)]
    meia = float(np.percentile(np.abs(barril[:, 0]), 90)) if len(barril) else 0.3 * W
    return dict(z=round(sz, 4), y=round(sy, 4), z_frac=round(sz / H, 4), y_frac=round(sy / M['L'], 4),
                estribo_x=round(estribo, 4), meia_largura=round(meia, 4), arcao_z=round(float(T[k0, 1]), 4), patilha_z=round(float(T[k1, 1]), 4))


def escalar_locs(s):
    """Os deslocamentos das ações (o corpo que deita, o pulo, o sobe e desce do passo) foram feitos
    para a altura do lobo molde: aqui ficam na escala da altura deste animal."""
    for a in bpy.data.actions:
        for fc in B._fcurves(a):
            if fc.data_path.endswith('location'):
                for kp in fc.keyframe_points:
                    kp.co[1] *= s
                    kp.handle_left[1] *= s
                    kp.handle_right[1] *= s


PERNAS_OSSOS = ('escapula', 'braco', 'antebraco', 'mao', 'coxa', 'canela', 'metatarso', 'pe')


def amortecer(fatores):
    """Reduz o giro das pernas nas ações pedidas (fração): a passada do lobo molde numa perna mais
    longa joga o casco longe demais (o galope do cavalo ficava com as patas de trás arrastando)."""
    for nome, k in fatores.items():
        a = bpy.data.actions.get(nome)
        if not a:
            continue
        for fc in B._fcurves(a):
            if fc.data_path.endswith('rotation_euler') and any(f'"{o}.' in fc.data_path for o in PERNAS_OSSOS):
                for kp in fc.keyframe_points:
                    kp.co[1] *= k
                    kp.handle_left[1] *= k
                    kp.handle_right[1] *= k


def mapa_posicao(ob, lado):
    """A posição 3D de cada texel (assada da própria malha, na UV dela): para as máscaras por região
    do corpo (a sela do cavalo tem a mesma cor do pelo; o lugar dela no corpo, não)."""
    im = bpy.data.images.new('posicao_texel', lado, lado, alpha=False, float_buffer=True)
    im.colorspace_settings.name = 'Non-Color'
    mt = bpy.data.materials.new('mat_posicao')
    mt.use_nodes = True
    nt = mt.node_tree
    nt.nodes.clear()
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    va = nt.nodes.new('ShaderNodeVectorMath')
    va.operation = 'MULTIPLY_ADD'
    va.inputs[1].default_value = (0.25, 0.25, 0.25)
    va.inputs[2].default_value = (0.5, 0.5, 0.5)
    em = nt.nodes.new('ShaderNodeEmission')
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(geo.outputs['Position'], va.inputs[0])
    nt.links.new(va.outputs['Vector'], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    tx = nt.nodes.new('ShaderNodeTexImage')
    tx.image = im
    tx.select = True
    nt.nodes.active = tx
    antes = list(ob.data.materials)
    ob.data.materials.clear()
    ob.data.materials.append(mt)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 1
    sc.render.bake.use_selected_to_active = False
    U.ativar(ob)
    bpy.ops.object.bake(type='EMIT', margin=6)
    P = (np.array(im.pixels[:], dtype=np.float32).reshape(lado, lado, 4)[..., :3] - 0.5) / 0.25
    ob.data.materials.clear()
    for m in antes:
        ob.data.materials.append(m)
    bpy.data.images.remove(im)
    bpy.data.materials.remove(mt)
    return P


# ------------------------------------------------------------------ galinha (asas dobradas)
def asa_dobrada(M, lado, f):
    """Junta da asa dobrada: fatias em Y do ombro (frente, alto) até a ponta (trás); em cada fatia,
    a parte mais de fora do corpo daquele lado (a asa cobre o flanco), um pouco para dentro."""
    V, L, H = M['V'], M['L'], M['H']
    sx = 1 if lado == 'L' else -1
    y = M['bico'] + (0.36 + 0.44 * f) * L
    S = V[(np.abs(V[:, 1] - y) < 0.03 * L) & (V[:, 0] * sx > 0) & (V[:, 2] > 0.3 * H) & (V[:, 2] < 0.8 * H)]
    if len(S) < 8:
        return Vector((0.3 * M['W'] * sx, y, 0.55 * H))
    xm = float((S[:, 0] * sx).max())
    S2 = S[S[:, 0] * sx > 0.8 * xm]
    return Vector((0.82 * xm * sx, y, float(np.median(S2[:, 2]))))


def esqueleto_galinha(M):
    c, H = M['centro'], M['H']
    o = []

    def add(nm, h, t, pai, para=(0, 0, 1)):
        o.append((nm, Vector(h), Vector(t), pai, para))
    quadril, coluna, peito = c(0.56), c(0.45), c(0.34)
    pesc0, pesc1, cab, bico = c(0.25), c(0.15), c(0.08), c(0.0)
    add('raiz', (0, 0, 0), (0, 0.1, 0), None)
    add('quadril', quadril, coluna, 'raiz')
    add('coluna', coluna, peito, 'quadril')
    add('peito', peito, pesc0, 'coluna')
    add('pescoco1', pesc0, pesc1, 'peito')
    add('pescoco2', pesc1, cab, 'pescoco1')
    add('cabeca', cab, bico, 'pescoco2')
    add('cauda1', c(0.62), c(0.75), 'quadril')
    add('cauda2', c(0.75), c(0.88), 'cauda1')
    add('cauda3', c(0.88), c(0.99), 'cauda2')
    for L in ('L', 'R'):
        a = [asa_dobrada(M, L, f) for f in (0.0, 0.25, 0.5, 0.75, 1.0)]
        raiz_asa = Vector((a[0].x * 0.45, a[0].y - 0.02 * M['L'], a[0].z + 0.02 * H))
        add(f'ombro.{L}', raiz_asa, a[0], 'peito')
        add(f'braco.{L}', a[0], a[1], f'ombro.{L}')
        add(f'antebraco.{L}', a[1], a[2], f'braco.{L}')
        add(f'mao.{L}', a[2], a[3], f'antebraco.{L}')
        add(f'ponta.{L}', a[3], a[4], f'mao.{L}')
        p = M['pes'][L]
        joelho, tornozelo = M['perna'](L, 0.24 * H), M['perna'](L, 0.06 * H)
        anca = Vector((joelho.x * 0.8, quadril.y - 0.02 * M['L'], quadril.z - 0.05 * H))
        add(f'coxa.{L}', anca, joelho, 'quadril', (0, -1, 0))
        add(f'tarso.{L}', joelho, tornozelo, f'coxa.{L}', (0, -1, 0))
        add(f'pe.{L}', tornozelo, (p.x, p.y - 0.08 * M['L'], 0.01), f'tarso.{L}', (0, 0, 1))
    ad = bpy.data.armatures.new('Galinha_Esqueleto')
    arm = bpy.data.objects.new('Galinha_Esqueleto', ad)
    bpy.context.scene.collection.objects.link(arm)
    U.ativar(arm)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = ad.edit_bones
    for nm, h, t, pai, para in o:
        b = eb.new(nm)
        b.head, b.tail = h, t
        if (t - h).length < 1e-3:
            b.tail = h + Vector((0, 0, 0.02))
        b.align_roll(Vector(para))
        if pai:
            b.parent = eb[pai]
            b.use_connect = (eb[pai].tail - b.head).length < 1e-4
    bpy.ops.object.mode_set(mode='OBJECT')
    ad.bones['raiz'].use_deform = False
    for pb in arm.pose.bones:
        pb.rotation_mode = 'XYZ'
    return arm


SN = math.sin
TAU = 2 * math.pi


def asas_g(abre=0.0, bate=0.0):
    """As asas da galinha (dobradas no repouso): abre (0 … 1: a asa sai do flanco para o lado) e
    bate (graus: a ponta sobe). O osso aponta para trás com Z para cima: girar em Z leva a ponta para
    fora (sinal pelo lado), girar em X levanta a ponta."""
    D = {}
    for L, sd in (('L', 1), ('R', -1)):
        D[f'ombro.{L}'] = (0.55 * bate, 0, -48 * abre * sd)
        D[f'braco.{L}'] = (0.35 * bate, 0, -26 * abre * sd)
        D[f'antebraco.{L}'] = (0.25 * bate, 0, -16 * abre * sd)
        D[f'mao.{L}'] = (0.15 * bate, 0, -8 * abre * sd)
        D[f'ponta.{L}'] = (0.1 * bate, 0, 0)
    return D


def junta(*ds):
    out = {}
    for d in ds:
        out.update(d)
    return out


def animacoes_galinha(arm, H):
    h = H   # deslocamentos em fração da altura
    # idle: respira, olha em volta aos trancos (a cabeça da galinha para no ar e muda de lado)
    ciclo(arm, 'idle', 96, lambda t: junta(asas_g(), {
        'peito': (1.5 * SN(t * TAU * 3), 0, 0),
        'pescoco1': (2 * SN(t * TAU * 2), 0, 0),
        'cabeca': (-4 * SN(t * TAU), 0, 26 * max(-1, min(1, 3 * SN(t * TAU * 2)))),
        'cauda1': (3 * SN(t * TAU * 3), 0, 0)}))
    # andar: passo alternado, a cabeça vai para a frente e para trás (o "pescoço de galinha"),
    # o corpo balança de um lado para o outro
    def andar(t):
        u = t * TAU
        D = junta(asas_g(0.02, 2 * SN(u * 2)), {
            'raiz': ((0, 0, 4 * SN(u)), (0, 0, 0.012 * h * abs(SN(u)))),
            'pescoco1': (-9 * SN(u * 2), 0, 0), 'pescoco2': (-6 * SN(u * 2), 0, 0), 'cabeca': (13 * SN(u * 2), 0, 0),
            'cauda1': (3 * SN(u * 2), 0, 3 * SN(u))})
        for L, ph in (('L', 0.0), ('R', math.pi)):
            s = SN(u + ph)
            lev = max(0.0, SN(u + ph + math.pi / 2))
            D[f'coxa.{L}'] = (22 * s, 0, 0)
            D[f'tarso.{L}'] = (-30 * lev, 0, 0)
            D[f'pe.{L}'] = (24 * lev, 0, 0)
        return D
    ciclo(arm, 'andar', 20, andar)
    # comer (ciscar): o corpo inclina e o bico vai ao chão duas vezes; um pé raspa a terra
    unica(arm, 'comer', 40, {
        1: junta(asas_g(), {'peito': (0, 0, 0), 'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'coxa.R': (0, 0, 0), 'tarso.R': (0, 0, 0)}),
        6: {'coxa.R': (-18, 0, 0), 'tarso.R': (-20, 0, 0)},
        10: {'coxa.R': (14, 0, 0), 'tarso.R': (0, 0, 0)},
        14: {'peito': (-20, 0, 0), 'pescoco1': (-34, 0, 0), 'pescoco2': (-22, 0, 0), 'cabeca': (-14, 0, 0), 'coxa.R': (0, 0, 0)},
        18: {'peito': (-14, 0, 0), 'pescoco1': (-22, 0, 0), 'pescoco2': (-14, 0, 0), 'cabeca': (-4, 0, 0)},
        22: {'peito': (-21, 0, 0), 'pescoco1': (-36, 0, 0), 'pescoco2': (-24, 0, 0), 'cabeca': (-16, 0, 0)},
        30: {'peito': (-6, 0, 0), 'pescoco1': (-8, 0, 8), 'pescoco2': (-4, 0, 0), 'cabeca': (4, 0, 14)},
        40: junta(asas_g(), {'peito': (0, 0, 0), 'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'coxa.R': (0, 0, 0), 'tarso.R': (0, 0, 0)})})
    # dormir: agacha sobre as pernas, as penas fofas (asa um pouco aberta), a cabeça encolhida
    # no peito, respiração lenta
    ciclo(arm, 'dormir', 72, lambda t: junta(asas_g(0.06, -3), AN.pernas_dobradas(0.7), {
        'raiz': ((0, 0, 0), (0, 0, -0.1 * h)), 'peito': (1.2 * SN(t * TAU), 0, 0),
        'pescoco1': (-26, 0, 0), 'pescoco2': (-18, 0, 10), 'cabeca': (14, 0, 22), 'cauda1': (-5, 0, 0)}))
    # sentar: chocando (agachada, olhando em volta devagar)
    ciclo(arm, 'sentar', 60, lambda t: junta(asas_g(0.04), AN.pernas_dobradas(0.6), {
        'raiz': ((0, 0, 0), (0, 0, -0.085 * h)), 'peito': (1.2 * SN(t * TAU * 2), 0, 0),
        'pescoco1': (-6, 0, 0), 'cabeca': (0, 0, 16 * SN(t * TAU))}))
    # voar (o pulo assustado batendo as asas): asas abertas batendo depressa, pernas recolhidas
    ciclo(arm, 'voar', 10, lambda t: junta(asas_g(1.0, 40 * SN(t * TAU)), AN.pernas_dobradas(0.5), {
        'raiz': ((0, 0, 0), (0, 0, -0.01 * h * SN(t * TAU))), 'peito': (6, 0, 0), 'pescoco1': (10, 0, 0), 'cabeca': (-8, 0, 0),
        'cauda1': (8, 0, 0)}))
    # planar: asas abertas quase paradas
    ciclo(arm, 'planar', 24, lambda t: junta(asas_g(1.0, 8 + 4 * SN(t * TAU)), AN.pernas_dobradas(0.5), {
        'peito': (6, 0, 0), 'pescoco1': (8, 0, 0)}))
    # chamar (cantar/cacarejar): estufa o peito, estica o pescoço para cima, abre um pouco as asas
    unica(arm, 'chamar', 44, {
        1: junta(asas_g(), {'peito': (0, 0, 0), 'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'raiz': ((0, 0, 0), (0, 0, 0))}),
        8: junta(asas_g(0.35, 25), {'peito': (10, 0, 0), 'pescoco1': (16, 0, 0), 'pescoco2': (12, 0, 0), 'cabeca': (14, 0, 0), 'raiz': ((0, 0, 0), (0, 0, 0.015 * h))}),
        14: junta(asas_g(0.5, -10), {}),
        20: junta(asas_g(0.35, 25), {'pescoco1': (22, 0, 0), 'pescoco2': (16, 0, 0), 'cabeca': (24, 0, 0)}),
        32: junta(asas_g(0.2, 5), {'pescoco1': (20, 0, 0), 'pescoco2': (14, 0, 0), 'cabeca': (20, 0, 0)}),
        44: junta(asas_g(), {'peito': (0, 0, 0), 'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'raiz': ((0, 0, 0), (0, 0, 0))})})
    # brincar: pulinhos batendo as asas
    ciclo(arm, 'brincar', 28, lambda t: junta(asas_g(0.6 + 0.3 * SN(t * TAU * 2), 30 * SN(t * TAU * 4)), {
        'raiz': ((0, 6 * SN(t * TAU), 0), (0, 0, 0.05 * h * abs(SN(t * TAU * 2)))), 'pescoco1': (8 * SN(t * TAU * 2), 0, 0),
        'cabeca': (0, 0, 16 * SN(t * TAU)), 'coxa.L': (10 * SN(t * TAU * 2), 0, 0), 'coxa.R': (10 * SN(t * TAU * 2), 0, 0)}))
    # carinho: inclina a cabeça para o lado, fecha os olhos (cabeça baixa), arrepia as penas
    unica(arm, 'carinho', 48, {
        1: junta(asas_g(), {'pescoco1': (0, 0, 0), 'cabeca': (0, 0, 0), 'cauda1': (0, 0, 0)}),
        12: junta(asas_g(0.12, 6), {'pescoco1': (-12, 0, 8), 'cabeca': (-6, 20, 12), 'cauda1': (6, 0, 0)}),
        30: junta(asas_g(0.1, 4), {'pescoco1': (-14, 0, 10), 'cabeca': (-8, -12, 16), 'cauda1': (4, 0, 0)}),
        48: junta(asas_g(), {'pescoco1': (0, 0, 0), 'cabeca': (0, 0, 0), 'cauda1': (0, 0, 0)})})
    # dano: encolhe e arrepia
    unica(arm, 'dano', 12, {
        1: junta(asas_g(), {'raiz': ((0, 0, 0), (0, 0, 0)), 'pescoco1': (0, 0, 0), 'cabeca': (0, 0, 0)}),
        4: junta(asas_g(0.5, 22), {'raiz': ((0, 10, 0), (0, 0.02 * h, -0.01 * h)), 'pescoco1': (-12, 0, -10), 'cabeca': (10, 0, -14)}),
        12: junta(asas_g(), {'raiz': ((0, 0, 0), (0, 0, 0)), 'pescoco1': (0, 0, 0), 'cabeca': (0, 0, 0)})})


# ------------------------------------------------------------------ pelagens
def hsv(cor):
    rgb = cor[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    s = d / np.maximum(mx, 1e-4)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / np.maximum(d, 1e-4)) % 6, np.where(mx == g, (b - r) / np.maximum(d, 1e-4) + 2, (r - g) / np.maximum(d, 1e-4) + 4)) * 60
    return np.where(d < 1e-4, 0, h), s, mx


def mascara(nome, cor, pos=None, regiao=None):
    """Onde a pelagem nova entra (0 … 1, bordas suaves). pos: a posição 3D de cada texel; regiao:
    as caixas medidas na malha (a sela do cavalo)."""
    h, s, v = hsv(cor)
    def faixa(x, a, b, m):
        return np.clip((x - a) / m, 0, 1) * np.clip((b - x) / m, 0, 1)
    if nome == 'pelo_cavalo':
        # o castanho do pelo, também na sombra (vermelho-alaranjado e saturado); a manta azul, as
        # meias e a estrela brancas, a crina preta e o metal ficam pela cor. A sela e os loros são do
        # mesmo couro castanho: ficam pela POSIÇÃO (a caixa da sela medida na malha)
        M = faixa(h, 0, 38, 5) * np.clip((s - 0.38) / 0.1, 0, 1) * faixa(v, 0.14, 0.98, 0.05)
        if pos is not None and regiao:
            y, z = pos[..., 1], pos[..., 2]
            sela = faixa(y, regiao['y0'], regiao['y1'], regiao['borda']) * np.clip((z - regiao['z0']) / regiao['borda'], 0, 1)
            M = M * (1 - sela)
        return M
    if nome == 'sem_olhos':   # tudo, menos os olhos (amarelo-esverdeados) e o nariz rosado
        olhos = faixa(h, 48, 175, 10) * np.clip((s - 0.25) / 0.1, 0, 1)
        nariz = (faixa(h, -1, 12, 4) + faixa(h, 335, 361, 4)) * faixa(s, 0.15, 0.55, 0.05) * np.clip((v - 0.6) / 0.1, 0, 1)
        return np.clip(1 - olhos - nariz, 0, 1)
    if nome == 'penas_claras':   # as penas creme e brancas (pouco saturadas); crista, barbela, bico,
        # pernas e as pontas marrons da cauda ficam
        return np.clip((0.36 - s) / 0.1, 0, 1) * np.clip((v - 0.3) / 0.1, 0, 1)
    raise ValueError(nome)


def remap(cor, M, esc, med, cla, listras=None):
    L = cor[..., 0] * 0.3 + cor[..., 1] * 0.59 + cor[..., 2] * 0.11
    sel = M > 0.5
    lo, hi = (np.percentile(L[sel], 3), np.percentile(L[sel], 97)) if sel.sum() > 100 else (0.04, 0.9)
    t = np.clip((L - lo) / max(hi - lo, 1e-3), 0, 1)[..., None]
    e, m, c = (np.array(x, np.float32) for x in (esc, med, cla))
    novo = np.where(t < 0.5, e + (m - e) * (t / 0.5), m + (c - m) * ((t - 0.5) / 0.5))
    out = cor.copy()
    out[..., :3] = cor[..., :3] * (1 - M[..., None]) + novo * M[..., None]
    emi = np.zeros_like(cor)
    emi[..., 3] = 1
    k = 0.0
    if listras:
        (lc, k) = listras
        # as listras do malhado (o mais escuro do pelo) acendem
        thr = np.percentile(L[sel], 35) if sel.sum() > 100 else 0.3
        ml = np.clip((thr - L) / 0.05, 0, 1) * M
        emi[..., :3] = np.array(lc, np.float32) * ml[..., None]
        out[..., :3] = out[..., :3] * (1 - 0.6 * ml[..., None]) + np.array(lc, np.float32) * 0.6 * ml[..., None] * 0.5
    return out, emi, k


def pelagens(ID, E, arm, objs, lod0, regiao=None):
    mat = lod0.active_material
    nos = {n.image.name: n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image}
    ncor = next(n for k, n in nos.items() if k.endswith('_cor'))
    nemi = next(n for k, n in nos.items() if k.endswith('_emissao'))
    P = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    i0, e0, k0 = ncor.image, nemi.image, P.inputs['Emission Strength'].default_value
    W, H = i0.size
    cor = np.array(i0.pixels[:], dtype=np.float32).reshape(H, W, 4)
    pos = mapa_posicao(lod0, W) if regiao else None
    feitos = []
    for pid, spec in E['pelagens'].items():
        nm, esc, med, cla = spec[:4]
        M = mascara(nm, cor, pos, regiao)
        nc, ne, k = remap(cor, M, esc, med, cla, spec[4] if len(spec) > 4 else None)
        ic = bpy.data.images.new(f'{pid}_cor', W, H, alpha=False)
        ic.pixels[:] = nc.reshape(-1)
        ie = bpy.data.images.new(f'{pid}_emissao', W, H, alpha=False)
        ie.pixels[:] = ne.reshape(-1)
        ic.pack()
        ie.pack()
        ncor.image, nemi.image = ic, ie
        P.inputs['Emission Strength'].default_value = k
        pasta = B.pasta(E['pasta'], pid)
        glb = B.exportar(os.path.join(pasta, f'{pid}.glb'), objs)
        prev = os.path.join(pasta, f'{pid}.png')
        zerar(arm)
        U.renderizar_previa(prev, [lod0], lado=480, amostras=16, angulo=(70, 0, 55))
        U.registrar(pid, 'criatura', glb, prev, [lod0], extra={'base': ID, 'mascara': nm, 'pelagem': [list(esc), list(med), list(cla)],
                    'mascara_pct': round(100.0 * float((M > 0.5).mean()), 1)})
        feitos.append(dict(id=pid, glb=os.path.relpath(glb, B.RAIZ), mascara=nm, mascara_pct=round(100.0 * float((M > 0.5).mean()), 1)))
    ncor.image, nemi.image = i0, e0
    P.inputs['Emission Strength'].default_value = k0
    return feitos


# ------------------------------------------------------------------ construir
def construir(ID):
    t0 = time.time()
    E = CRIATURAS[ID]
    tipo = 'quadrupede' if E['molde'] == 'lobo' else 'ave'
    FONTE = os.path.join(B.CRIATURAS, E['fonte'])
    U.limpar_cena()
    pasta = B.pasta(E['pasta'], ID)
    cache = os.path.join(B.RAIZ, '.cache_criacao', ID)
    os.makedirs(cache, exist_ok=True)
    rel = dict(id=ID, fonte=os.path.relpath(FONTE, B.RAIZ))
    fonte = R.importar(FONTE, 'Fonte_Meshy')
    rel['antes'] = R.diagnosticar(fonte)
    rel['limpeza'] = R.limpar(fonte)
    rel['fonte_limpa'] = R.diagnosticar(fonte)
    print('antes', rel['antes'], flush=True)
    wire(fonte, 'fonte', os.path.join(cache, 'topologia_antes.png'))
    lod0, info = R.retopologia(fonte, tipo, nome='corpo')
    rel['retopologia'] = info
    print('retopologia', info, flush=True)
    R.uv(lod0)
    T = R.TIPOS[tipo]
    _, binfo = R.assar(lod0, fonte, lado=T['lado'], extrusao=max(fonte.dimensions) * T['extrusao'],
                       pasta=os.path.join(cache, 'texturas'), prefixo=ID, emissao=False)
    rel['assado'] = binfo
    wire(lod0, 'lod0', os.path.join(cache, 'topologia_depois.png'))
    if E['molde'] == 'lobo':
        M = medir(fonte)
        mapa, minfo = fazer_mapa(M)
        rel['ajuste_esqueleto'] = dict(minfo, comprimento=round(float(M['L']), 3), altura=round(float(M['H']), 3),
                                       patas={k: [round(float(a), 3) for a in v] for k, v in M['patas'].items()})
        if E.get('sela'):
            rel['sela'] = medir_sela(M)
            print('SELA', json.dumps(rel['sela']), flush=True)
        arm = lobo.esqueleto(mapa, nome=f'{ID}_esqueleto')
    else:
        M = AN.medir(fonte)
        arm = esqueleto_galinha(M)
        rel['medidas'] = dict(largura=round(float(M['W']), 3), comprimento=round(float(M['L']), 3), altura=round(float(M['H']), 3))
    fonte.hide_set(True)
    fonte.hide_render = True
    sem = B.pesar(lod0, arm, None, None)
    rel['sem_osso_lod0'] = sem
    L = R.lods(lod0, T['lods'])
    R.copiar_pesos(lod0, L, arm)
    rel['lods'] = [dict(nome=o.name, triangulos=R.diagnosticar(o)['triangulos'], sem_osso=R.sem_peso(o, arm)) for o in [lod0] + L]
    if E['molde'] == 'lobo':
        lobo.animacoes(arm)
        sem_mandibula(arm)   # (a boca da malha é fechada, como a do lobo neon)
        s = rel['ajuste_esqueleto']['escala_z']
        escalar_locs(s)
        rel['escala_deslocamentos'] = s
        if E.get('amortecer'):
            amortecer(E['amortecer'])
            rel['amortecer'] = E['amortecer']
    else:
        animacoes_galinha(arm, float(M['H']))
    objs = [lod0, arm] + L
    glb = B.exportar(os.path.join(pasta, f'{ID}.glb'), objs)
    regiao = None
    if rel.get('sela'):   # a caixa da sela (com as abas e os loros) no lombo
        Sl = rel['sela']
        regiao = dict(y0=Sl['y'] - 0.15 * float(M['L']), y1=Sl['y'] + 0.12 * float(M['L']), z0=Sl['z'] - 0.3 * float(M['H']), borda=0.015 * float(M['L']))
        rel['sela']['caixa'] = {k: round(v, 4) for k, v in regiao.items()}
    rel['pelagens'] = pelagens(ID, E, arm, objs, lod0, regiao)
    for o in L:
        o.hide_render = True
    prev = os.path.join(pasta, f'{ID}.png')
    zerar(arm)
    U.renderizar_previa(prev, [lod0], lado=640, amostras=24, angulo=(70, 0, 55))
    folha = []
    poses = (('andar', 8), ('trotar', 6), ('correr', 5), ('comer', 18), ('sentar', 10), ('dormir', 10), ('uivar', 50), ('brincar', 6)) if E['molde'] == 'lobo' else \
        (('idle', 1), ('andar', 6), ('comer', 14), ('dormir', 10), ('voar', 3), ('chamar', 20), ('sentar', 10), ('brincar', 8))
    for nm, q in poses:
        zerar(arm)
        arm.animation_data.action = bpy.data.actions[nm]
        bpy.context.scene.frame_set(q)
        f = os.path.join(cache, f'{ID}_{nm}.png')
        U.renderizar_previa(f, [lod0], lado=360, amostras=10, angulo=(80, 0, 90))
        folha.append(os.path.relpath(f, B.RAIZ))
    arm.animation_data.action = None
    zerar(arm)
    bpy.context.scene.frame_set(1)
    blend = B.salvar_blend(os.path.join(pasta, f'{ID}.blend'))
    rel.update(glb=os.path.relpath(glb, B.RAIZ), blend=os.path.relpath(blend, B.RAIZ), previa=os.path.relpath(prev, B.RAIZ), folha=folha,
               ossos=len(arm.data.bones), animacoes=sorted(a.name for a in bpy.data.actions), segundos=round(time.time() - t0))
    with open(os.path.join(pasta, f'{ID}_topologia.json'), 'w', encoding='utf-8') as f:
        json.dump(rel, f, ensure_ascii=False, indent=1)
    U.registrar(ID, 'criatura', glb, prev, [lod0], extra={'blend': rel['blend'], 'ossos': rel['ossos'], 'animacoes': rel['animacoes'], 'sem_osso': sem,
                'lods': rel['lods'], 'retopologia': info.get('metodo'), 'sela': rel.get('sela')})
    print('RELATORIO', json.dumps({k: v for k, v in rel.items() if k not in ('folha',)}, ensure_ascii=False)[:1500], flush=True)
    return glb


if __name__ == '__main__':
    args = U.args()
    erradas = [a for a in args if a not in CRIATURAS]
    if erradas:
        sys.exit(f'criaturas desconhecidas: {erradas} (existem: {sorted(CRIATURAS)})')
    for ID in args or list(CRIATURAS):
        construir(ID)
