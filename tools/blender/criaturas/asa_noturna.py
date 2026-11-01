"""Asa Noturna (Azure Nightwing) de Eclipse Zero: a ave exótica rara (pet de companhia), da malha do
Meshy enviada, com retopologia, esqueleto de ave e animações feitos no Blender.

Fonte (não muda): assets/Creatures/Pets/Exotic/asa_noturna/fonte/Meshy_AI_Azure_Nightwing_1101011952_texture.glb
(129 mil triângulos, asas abertas, sem esqueleto).
Etapas: tools/blender/topologia/retopologia.py (configuração 'ave': quads com simetria, LOD 0–3,
assado da cor, aspereza, metal, normais e das penas acesas).
Esqueleto de ave (medido na malha): raiz, quadril, coluna, peito, pescoço (2), cabeça, cauda (3) e,
de cada lado, ombro, braço, antebraço e mão da asa (pelo BORDO DE ATAQUE da asa, medido fatia por
fatia), coxa, tarso e pé.
Animações (24 q/s, no lugar): idle (pousado, asas meio dobradas), andar (saltitar), voar (bater de
asas), planar, decolar, pousar, comer (bicar), dormir (cabeça para trás, asas fechadas), sentar
(descanso), brincar, carinho, chamar (comando: abre as asas e grita) e dano.
Saída: assets/Creatures/Pets/Exotic/asa_noturna/asa_noturna.{glb,blend,png} + relatório JSON.
Rode: python3 tools/blender/criaturas/asa_noturna.py
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
import retopologia as R   # noqa: E402
import bpy   # noqa: E402
from mathutils import Vector   # noqa: E402
from lobo import ciclo, unica   # noqa: E402  (os mesmos ajudantes de ação)
from lobo_neon import wire, zerar   # noqa: E402

U = B.U
ID = 'asa_noturna'
FONTE = os.path.join(B.RAIZ, 'assets', 'Creatures', 'Pets', 'Exotic', ID, 'fonte', 'Meshy_AI_Azure_Nightwing_1101011952_texture.glb')


# ------------------------------------------------------------------ medidas e esqueleto
def medir(ob):
    V = np.array([v.co[:] for v in ob.data.vertices])
    H, W = V[:, 2].max(), V[:, 0].max() - V[:, 0].min()
    bico, cauda = V[:, 1].min(), V[:, 1].max()
    L = cauda - bico
    meio = V[np.abs(V[:, 0]) < 0.05 * W]

    def centro(fr, faixa=0.035):
        y = bico + fr * L
        S = meio[np.abs(meio[:, 1] - y) < faixa * L]
        return Vector((0.0, y, float(np.median(S[:, 2])) if len(S) > 4 else 0.5 * H))
    # pés: os vértices mais baixos, um grupo de cada lado
    baixo = V[V[:, 2] < 0.04 * H]
    pes = {}
    for lado, sx in (('L', 1), ('R', -1)):
        S = baixo[baixo[:, 0] * sx > 0]
        pes[lado] = Vector(S.mean(0)) if len(S) else Vector((0.06 * sx, bico + 0.5 * L, 0.0))

    def perna(lado, z):
        p = pes[lado]
        S = V[(np.abs(V[:, 0] - p.x) < 0.035 * W) & (np.abs(V[:, 1] - p.y) < 0.1 * L) & (np.abs(V[:, 2] - z) < 0.025 * H)]
        return Vector((float(S[:, 0].mean()), float(S[:, 1].mean()), z)) if len(S) > 4 else Vector((p.x, p.y, z))
    # asa: bordo de ataque (frente e alto) em fatias de |x|, da raiz à ponta
    corpo_x = 0.075 * W

    def asa(lado, fr):
        sx = 1 if lado == 'L' else -1
        ponta = np.abs(V[:, 0]).max()
        x = corpo_x + fr * (ponta - corpo_x) * 0.97
        S = V[(V[:, 0] * sx > x - 0.025 * W) & (V[:, 0] * sx < x + 0.025 * W)]
        if len(S) < 5:
            return Vector((x * sx, bico + 0.4 * L, 0.6 * H))
        return Vector((x * sx, float(np.percentile(S[:, 1], 22)), float(np.percentile(S[:, 2], 72))))
    return dict(V=V, H=H, W=W, L=L, bico=bico, cauda=cauda, centro=centro, pes=pes, perna=perna, asa=asa)


def esqueleto(M):
    c, H = M['centro'], M['H']
    o = []
    def add(nm, h, t, pai, para=(0, 0, 1)):
        o.append((nm, Vector(h), Vector(t), pai, para))
    quadril, coluna, peito = c(0.56), c(0.45), c(0.34)
    pesc0, pesc1, cab, bico = c(0.27), c(0.18), c(0.1), c(0.0)
    add('raiz', (0, 0, 0), (0, 0.1, 0), None)
    add('quadril', quadril, coluna, 'raiz')
    add('coluna', coluna, peito, 'quadril')
    add('peito', peito, pesc0, 'coluna')
    add('pescoco1', pesc0, pesc1, 'peito')
    add('pescoco2', pesc1, cab, 'pescoco1')
    add('cabeca', cab, bico, 'pescoco2')
    add('cauda1', c(0.6), c(0.72), 'quadril')
    add('cauda2', c(0.72), c(0.86), 'cauda1')
    add('cauda3', c(0.86), c(0.99), 'cauda2')
    for L in ('L', 'R'):
        a = [M['asa'](L, f) for f in (0.0, 0.22, 0.48, 0.74, 1.0)]
        raiz_asa = Vector((a[0].x * 0.55, peito.y + 0.02 * M['L'], peito.z + 0.08 * H))
        add(f'ombro.{L}', raiz_asa, a[0], 'peito')
        add(f'braco.{L}', a[0], a[1], f'ombro.{L}')
        add(f'antebraco.{L}', a[1], a[2], f'braco.{L}')
        add(f'mao.{L}', a[2], a[3], f'antebraco.{L}')
        add(f'ponta.{L}', a[3], a[4], f'mao.{L}')
        p = M['pes'][L]
        joelho, tornozelo = M['perna'](L, 0.26 * H), M['perna'](L, 0.06 * H)
        anca = Vector((joelho.x * 0.8, quadril.y - 0.02 * M['L'], quadril.z - 0.05 * H))
        add(f'coxa.{L}', anca, joelho, 'quadril', (0, -1, 0))
        add(f'tarso.{L}', joelho, tornozelo, f'coxa.{L}', (0, -1, 0))
        add(f'pe.{L}', tornozelo, (p.x, p.y - 0.08 * M['L'], 0.01), f'tarso.{L}', (0, 0, 1))
    ad = bpy.data.armatures.new('Asa_Esqueleto')
    arm = bpy.data.objects.new('Asa_Esqueleto', ad)
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


# ------------------------------------------------------------------ animações
S = math.sin
TAU = 2 * math.pi


def asas(dobra=0.0, bate=0.0, onda=0.0, t=0.0, varre=0.0):
    """Pose das duas asas: dobra (0 aberta … 1 fechada junto ao corpo), bate (graus, + para cima),
    onda (atraso do bater até a ponta), varre (graus para trás)."""
    D = {}
    for L, sd in (('L', 1), ('R', -1)):
        D[f'ombro.{L}'] = (-12 * dobra + bate, 0, (28 * dobra + varre) * sd)
        D[f'braco.{L}'] = (-6 * dobra + bate * 0.35 * math.cos(onda), 0, 30 * dobra * sd)
        D[f'antebraco.{L}'] = (-8 * dobra + bate * 0.3 * math.cos(onda * 2), 0, 62 * dobra * sd)
        D[f'mao.{L}'] = (bate * 0.25 * math.cos(onda * 3), 0, 48 * dobra * sd)
        D[f'ponta.{L}'] = (bate * 0.2 * math.cos(onda * 4), 0, 20 * dobra * sd)
    return D


def pernas_dobradas(k):
    D = {}
    for L in ('L', 'R'):
        D[f'coxa.{L}'] = (40 * k, 0, 0)
        D[f'tarso.{L}'] = (-70 * k, 0, 0)
        D[f'pe.{L}'] = (30 * k, 0, 0)
    return D


def animacoes(arm):
    def junta(*ds):
        out = {}
        for d in ds:
            out.update(d)
        return out
    # idle: pousado, asas meio dobradas, respiração, olhar em volta, a cauda de vez em quando
    ciclo(arm, 'idle', 72, lambda t: junta(asas(0.72), {
        'peito': (1.5 * S(t * TAU * 3), 0, 0), 'pescoco1': (2 * S(t * TAU), 0, 0),
        'cabeca': (-3 * S(t * TAU), 0, 22 * max(-1, min(1, 2.5 * S(t * TAU)))),
        'cauda1': (4 * max(0, S(t * TAU * 2)) ** 6, 0, 3 * S(t * TAU))}))
    # andar: saltitar (pulinhos), asas fechadas que equilibram
    ciclo(arm, 'andar', 16, lambda t: junta(asas(0.8, bate=6 * S(t * TAU)), {
        'raiz': ((0, 0, 0), (0, 0, 0.05 * abs(S(t * TAU)))), 'pescoco1': (-6 * S(t * TAU * 2), 0, 0), 'cabeca': (6 * S(t * TAU * 2), 0, 0),
        'coxa.L': (14 * S(t * TAU), 0, 0), 'coxa.R': (14 * S(t * TAU), 0, 0), 'tarso.L': (-18 * abs(S(t * TAU)), 0, 0), 'tarso.R': (-18 * abs(S(t * TAU)), 0, 0),
        'cauda1': (-5 * S(t * TAU), 0, 0)}))
    # voar: bater de asas (a ponta atrasada), pernas recolhidas, cauda aberta
    ciclo(arm, 'voar', 20, lambda t: junta(asas(0.0, bate=38 * S(t * TAU), onda=0.6), pernas_dobradas(0.9), {
        'raiz': ((0, 0, 0), (0, 0, -0.04 * S(t * TAU))), 'peito': (-4 * S(t * TAU), 0, 0), 'pescoco1': (8, 0, 0), 'cabeca': (-6 + 3 * S(t * TAU), 0, 0),
        'cauda1': (6, 0, 0), 'cauda2': (3 * S(t * TAU - 1), 0, 0)}))
    # planar: asas abertas paradas, leve rolagem
    ciclo(arm, 'planar', 48, lambda t: junta(asas(0.0, bate=4 + 3 * S(t * TAU)), pernas_dobradas(0.9), {
        'raiz': ((0, 6 * S(t * TAU), 0), (0, 0, 0.02 * S(t * TAU))), 'pescoco1': (8, 0, 0), 'cauda1': (4, 0, 6 * S(t * TAU))}))
    # decolar: agacha, salta com a batida para baixo, sobe
    unica(arm, 'decolar', 24, {
        1: junta(asas(0.72), pernas_dobradas(0), {'raiz': ((0, 0, 0), (0, 0, 0))}),
        6: junta(asas(0.3, bate=45), pernas_dobradas(0.5), {'raiz': ((0, 0, 0), (0, 0, -0.05))}),
        11: junta(asas(0.0, bate=-30), pernas_dobradas(0), {'raiz': ((0, 0, 0), (0, 0, 0.18))}),
        17: junta(asas(0.0, bate=40), pernas_dobradas(0.7), {'raiz': ((0, 0, 0), (0, 0, 0.3))}),
        24: junta(asas(0.0, bate=-20), pernas_dobradas(0.9), {'raiz': ((0, 0, 0), (0, 0, 0.42))})})
    # pousar: o contrário (asas freando, pernas para a frente)
    unica(arm, 'pousar', 24, {
        1: junta(asas(0.0, bate=10), pernas_dobradas(0.9), {'raiz': ((0, 0, 0), (0, 0, 0.42)), 'peito': (0, 0, 0)}),
        9: junta(asas(0.0, bate=50, varre=-12), pernas_dobradas(-0.2), {'raiz': ((0, 0, 0), (0, 0, 0.16)), 'peito': (14, 0, 0)}),
        16: junta(asas(0.2, bate=-25), pernas_dobradas(0.4), {'raiz': ((0, 0, 0), (0, 0, -0.03)), 'peito': (6, 0, 0)}),
        24: junta(asas(0.72), pernas_dobradas(0), {'raiz': ((0, 0, 0), (0, 0, 0)), 'peito': (0, 0, 0)})})
    # comer: bica o chão duas vezes
    unica(arm, 'comer', 36, {
        1: junta(asas(0.75), {'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'peito': (0, 0, 0)}),
        8: junta(asas(0.75), {'pescoco1': (-30, 0, 0), 'pescoco2': (-25, 0, 0), 'cabeca': (-20, 0, 0), 'peito': (-12, 0, 0)}),
        12: {'pescoco1': (-18, 0, 0), 'pescoco2': (-14, 0, 0), 'cabeca': (-6, 0, 0)},
        18: {'pescoco1': (-32, 0, 0), 'pescoco2': (-26, 0, 0), 'cabeca': (-22, 0, 0)},
        26: {'pescoco1': (-10, 0, 6), 'pescoco2': (-6, 0, 0), 'cabeca': (4, 0, 10)},
        36: junta(asas(0.75), {'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'peito': (0, 0, 0)})})
    # dormir: abaixa, asas fechadas, a cabeça vira para trás e descansa nas costas
    ciclo(arm, 'dormir', 72, lambda t: junta(asas(1.0, bate=-4), pernas_dobradas(0.65), {
        'raiz': ((0, 0, 0), (0, 0, -0.07)), 'peito': (1.2 * S(t * TAU), 0, 0),
        'pescoco1': (-18, 0, 30), 'pescoco2': (-10, 0, 55), 'cabeca': (-20, 0, 40), 'cauda1': (-4, 0, 0)}))
    # sentar: descanso pousado (mais baixo, asas fechadas, olha em volta devagar)
    ciclo(arm, 'sentar', 48, lambda t: junta(asas(0.95), pernas_dobradas(0.5), {
        'raiz': ((0, 0, 0), (0, 0, -0.05)), 'peito': (1.2 * S(t * TAU * 2), 0, 0), 'cabeca': (0, 0, 14 * S(t * TAU))}))
    # brincar: pulinhos e asas agitadas
    ciclo(arm, 'brincar', 32, lambda t: junta(asas(0.35, bate=28 * S(t * TAU * 4), onda=0.4), {
        'raiz': ((0, 8 * S(t * TAU), 0), (0, 0, 0.09 * abs(S(t * TAU * 2)))), 'pescoco1': (10 * S(t * TAU * 2), 0, 0), 'cabeca': (0, 0, 18 * S(t * TAU)),
        'cauda1': (8 * S(t * TAU * 2), 0, 10 * S(t * TAU)), 'coxa.L': (12 * S(t * TAU * 2), 0, 0), 'coxa.R': (12 * S(t * TAU * 2), 0, 0)}))
    # carinho: inclina a cabeça para o dono, abre e fecha um pouco as asas, abana a cauda
    unica(arm, 'carinho', 48, {
        1: junta(asas(0.72), {'pescoco1': (0, 0, 0), 'cabeca': (0, 0, 0), 'cauda1': (0, 0, 0)}),
        12: junta(asas(0.5, bate=10), {'pescoco1': (-14, 0, 10), 'cabeca': (-8, 18, 16), 'cauda1': (0, 0, 10)}),
        24: junta(asas(0.6, bate=4), {'pescoco1': (-16, 0, 12), 'cabeca': (-10, -10, 18), 'cauda1': (0, 0, -10)}),
        36: junta(asas(0.5, bate=10), {'pescoco1': (-12, 0, 8), 'cabeca': (-6, 14, 12), 'cauda1': (0, 0, 8)}),
        48: junta(asas(0.72), {'pescoco1': (0, 0, 0), 'cabeca': (0, 0, 0), 'cauda1': (0, 0, 0)})})
    # chamar (comando): abre as asas bem alto e grita com a cabeça erguida
    unica(arm, 'chamar', 40, {
        1: junta(asas(0.72), {'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'peito': (0, 0, 0)}),
        10: junta(asas(0.0, bate=42), {'pescoco1': (18, 0, 0), 'pescoco2': (14, 0, 0), 'cabeca': (16, 0, 0), 'peito': (8, 0, 0)}),
        26: junta(asas(0.0, bate=36), {'pescoco1': (22, 0, 0), 'pescoco2': (16, 0, 0), 'cabeca': (20, 0, 0), 'peito': (10, 0, 0)}),
        40: junta(asas(0.72), {'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'peito': (0, 0, 0)})})
    # dano: encolhe e eriça
    unica(arm, 'dano', 12, {
        1: junta(asas(0.72), {'raiz': ((0, 0, 0), (0, 0, 0)), 'pescoco1': (0, 0, 0), 'cabeca': (0, 0, 0)}),
        4: junta(asas(0.3, bate=20), {'raiz': ((0, 10, 0), (0, 0.03, -0.02)), 'pescoco1': (-12, 0, -10), 'cabeca': (10, 0, -14)}),
        12: junta(asas(0.72), {'raiz': ((0, 0, 0), (0, 0, 0)), 'pescoco1': (0, 0, 0), 'cabeca': (0, 0, 0)})})


def construir():
    t0 = time.time()
    U.limpar_cena()
    pasta = B.pasta(os.path.join('Pets', 'Exotic'), ID)
    cache = os.path.join(B.RAIZ, '.cache_criacao', ID)
    os.makedirs(cache, exist_ok=True)
    rel = dict(id=ID, fonte=os.path.relpath(FONTE, B.RAIZ))
    fonte = R.importar(FONTE, 'Fonte_Meshy')
    rel['antes'] = R.diagnosticar(fonte)
    rel['limpeza'] = R.limpar(fonte)
    rel['fonte_limpa'] = R.diagnosticar(fonte)
    print('antes', rel['antes'], flush=True)
    lod0, info = R.retopologia(fonte, 'ave', nome='corpo')
    rel['retopologia'] = info
    print('retopologia', info, flush=True)
    R.uv(lod0)
    _, binfo = R.assar(lod0, fonte, lado=R.TIPOS['ave']['lado'], extrusao=max(fonte.dimensions) * R.TIPOS['ave']['extrusao'],
                       pasta=os.path.join(cache, 'texturas'), prefixo=ID)
    rel['assado'] = binfo
    wire(fonte, 'fonte', os.path.join(cache, 'topologia_antes.png'))
    wire(lod0, 'lod0', os.path.join(cache, 'topologia_depois.png'))
    M = medir(fonte)
    arm = esqueleto(M)
    rel['medidas'] = dict(envergadura=round(float(M['W']), 3), comprimento=round(float(M['L']), 3), altura=round(float(M['H']), 3))
    fonte.hide_set(True)
    fonte.hide_render = True
    sem = B.pesar(lod0, arm, None, None)
    rel['sem_osso_lod0'] = sem
    L = R.lods(lod0, R.TIPOS['ave']['lods'])
    R.copiar_pesos(lod0, L, arm)
    rel['lods'] = [dict(nome=o.name, triangulos=R.diagnosticar(o)['triangulos'], sem_osso=R.sem_peso(o, arm)) for o in [lod0] + L]
    animacoes(arm)
    glb = B.exportar(os.path.join(pasta, f'{ID}.glb'), [lod0, arm] + L)
    for o in L:
        o.hide_render = True
    prev = os.path.join(pasta, f'{ID}.png')
    U.renderizar_previa(prev, [lod0], lado=640, amostras=24, angulo=(68, 0, 55))
    folha = []
    for nm, q in (('idle', 1), ('voar', 5), ('voar', 15), ('planar', 1), ('comer', 8), ('dormir', 1), ('brincar', 9), ('chamar', 20), ('andar', 5)):
        zerar(arm)
        arm.animation_data.action = bpy.data.actions[nm]
        bpy.context.scene.frame_set(q)
        f = os.path.join(cache, f'{ID}_{nm}{q}.png')
        U.renderizar_previa(f, [lod0], lado=360, amostras=10, angulo=(70, 0, 40))
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
                'lods': rel['lods'], 'retopologia': info.get('metodo')})
    print('RELATORIO', json.dumps({k: v for k, v in rel.items() if k != 'folha'}, ensure_ascii=False), flush=True)
    return glb


if __name__ == '__main__':
    construir()
