"""Funções comuns dos scripts do Blender (tools/blender/).

Cada asset é um script reproduzível em tools/blender/asset_<nome>.py que usa estas funções:
limpar a cena, criar materiais PBR, aplicar modificadores, pôr a origem na base, desdobrar UV,
contar triângulos, fazer cópia de segurança, exportar .glb (glTF 2.0 binário, +Y para cima,
metros) e renderizar a prévia PNG (câmera e luz padrão).

Roda de dois jeitos (o mesmo script):
  blender -b -P tools/blender/asset_x.py            # Blender instalado (ex.: no seu PC)
  python3 tools/blender/asset_x.py                  # módulo bpy (pip install bpy; o ambiente
                                                    # na nuvem usa este)
A prévia usa o Cycles na CPU (funciona sem placa de vídeo e sem tela).
"""
import json
import math
import os
import shutil
import sys
import time

import bpy
import bmesh
from mathutils import Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELOS = os.path.join(RAIZ, 'assets', 'models')
SPRITES = os.path.join(RAIZ, 'assets', 'sprites')
TEXTURAS = os.path.join(RAIZ, 'assets', 'textures')
BACKUP = os.path.join(RAIZ, 'assets', '_backup')
SAIDA = os.path.join(RAIZ, 'tools', 'blender', '_saida')   # relatórios de cada script (não versionado)

# Orçamento da web (triângulos e lado da textura)
ORCAMENTO = {'personagem': 5000, 'prop': 1500, 'modular': 3000, 'arma': 1500, 'textura': 1024}


# ------------------------------------------------------------------ cena
def limpar_cena():
    """Cena vazia (sem o cubo, a câmera e a luz da cena padrão)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.cameras, bpy.data.lights):
        for b in list(col):
            col.remove(b)


def ativar(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def nome_limpo(txt):
    """snake_case sem acentos."""
    import unicodedata
    t = unicodedata.normalize('NFKD', txt).encode('ascii', 'ignore').decode().lower()
    return ''.join(c if c.isalnum() else '_' for c in t).strip('_').replace('__', '_')


# ------------------------------------------------------------------ materiais PBR
def material_pbr(nome, cor=(0.5, 0.5, 0.5), metal=0.0, aspereza=0.5, emissao=None, forca=0.0):
    """Princípio BSDF com cor base, metal, aspereza e emissão (o glTF exporta direto)."""
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*cor, 1.0)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = aspereza
    if emissao is not None:
        k = 'Emission Color' if 'Emission Color' in p.inputs else 'Emission'
        p.inputs[k].default_value = (*emissao, 1.0)
        if 'Emission Strength' in p.inputs:
            p.inputs['Emission Strength'].default_value = forca
    return m


def material_atlas(nome, celulas, lado=512, semente=1):
    """Um material só (como pede o orçamento) com um atlas de 2×2 células geradas por código:
    cor base com ruído de desgaste, metal/aspereza (canais B e G, como o glTF) e emissão.
    celulas: até 4 dicts {cor, metal, aspereza, emissao (cor ou None), desgaste (0..1)}.
    Devolve (material, uv_celula(obj, k)) — a função leva a UV do objeto para a célula k."""
    import random
    rnd = random.Random(semente)
    n = lado * lado
    base = [0.0] * (n * 4)
    mr = [0.0] * (n * 4)
    em = [0.0] * (n * 4)
    meio = lado // 2
    # ruído em blocos (barato em Python puro): manchas de desgaste por célula
    grade = 16
    ruido = [[rnd.random() for _ in range(lado // grade + 2)] for _ in range(lado // grade + 2)]
    for y in range(lado):
        gy = y / grade
        iy, fy = int(gy), gy - int(gy)
        for x in range(lado):
            k = (1 if x >= meio else 0) + (2 if y >= meio else 0)
            if k >= len(celulas):
                continue
            C = celulas[k]
            gx = x / grade
            ix, fx = int(gx), gx - int(gx)
            r = (ruido[iy][ix] * (1 - fx) + ruido[iy][ix + 1] * fx) * (1 - fy) + (ruido[iy + 1][ix] * (1 - fx) + ruido[iy + 1][ix + 1] * fx) * fy
            d = C.get('desgaste', 0.3) * (r - 0.5)
            i = (y * lado + x) * 4
            cr, cg, cb = C['cor']
            base[i:i + 4] = [max(0, min(1, cr * (1 + d))), max(0, min(1, cg * (1 + d))), max(0, min(1, cb * (1 + d))), 1.0]
            mr[i:i + 4] = [0.0, max(0.02, min(1, C.get('aspereza', 0.5) + d * 0.4)), C.get('metal', 0.0), 1.0]
            e = C.get('emissao')
            em[i:i + 4] = [*(e if e else (0, 0, 0)), 1.0]
    def imagem(nm, px, cor_linear):
        im = bpy.data.images.new(nm, lado, lado, alpha=False)
        im.colorspace_settings.name = 'sRGB' if cor_linear else 'Non-Color'
        im.pixels = px
        im.pack()
        return im
    i_base, i_mr, i_em = imagem(nome + '_cor', base, True), imagem(nome + '_mr', mr, False), imagem(nome + '_emissao', em, True)
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    t_base = nt.nodes.new('ShaderNodeTexImage'); t_base.image = i_base
    t_mr = nt.nodes.new('ShaderNodeTexImage'); t_mr.image = i_mr
    t_em = nt.nodes.new('ShaderNodeTexImage'); t_em.image = i_em
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(t_base.outputs['Color'], p.inputs['Base Color'])
    nt.links.new(t_mr.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], p.inputs['Roughness'])
    nt.links.new(sep.outputs['Blue'], p.inputs['Metallic'])
    ke = 'Emission Color' if 'Emission Color' in p.inputs else 'Emission'
    nt.links.new(t_em.outputs['Color'], p.inputs[ke])
    if 'Emission Strength' in p.inputs:
        p.inputs['Emission Strength'].default_value = 3.0

    def uv_celula(obj, k, margem=0.02):
        """UV do objeto (já desdobrada em 0..1) espremida na célula k do atlas."""
        ox, oy = (0.5 if k % 2 else 0.0), (0.5 if k >= 2 else 0.0)
        uv = obj.data.uv_layers.active.data
        for l in uv:
            u, v = l.uv
            l.uv = (ox + margem + u * (0.5 - 2 * margem), oy + margem + v * (0.5 - 2 * margem))
    return m, uv_celula


# ------------------------------------------------------------------ materiais procedurais e texturas assadas
def _no(nt, tipo, x=0, y=0, **props):
    n = nt.nodes.new(tipo)
    n.location = (x, y)
    for k, v in props.items():
        setattr(n, k, v)
    return n


def _mat(nt, op, a, b=None, x=0, y=0, clamp=False):
    """Nó Math: a e b podem ser números ou saídas de outros nós."""
    n = _no(nt, 'ShaderNodeMath', x, y, operation=op, use_clamp=clamp)
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def _mix(nt, fator, a, b, x=0, y=0):
    """Mistura de cores (Mix RGBA): a → b pelo fator (número ou saída)."""
    n = _no(nt, 'ShaderNodeMix', x, y, data_type='RGBA', blend_type='MIX')
    for v, s in ((fator, n.inputs[0]), (a, n.inputs[6]), (b, n.inputs[7])):
        if isinstance(v, (int, float)):
            s.default_value = v
        elif isinstance(v, (tuple, list)):
            s.default_value = (*v[:3], 1.0)
        else:
            nt.links.new(v, s)
    return n.outputs[2]


def material_procedural(nome, C, semente=1, bisel=0.03):
    """Material de uma célula com detalhe procedural (coordenadas do objeto, não depende da UV):
    variação de cor e sujeira em duas escalas, bordas gastas (mais claras e lisas; metal à mostra
    com C['borda_metal']), o padrão da superfície e o chanfro das quinas (nó Bevel: o mapa de
    normais assado deixa a malha leve com quinas arredondadas). Feito para ser assado (assar()).
    C: {cor, metal, aspereza, emissao (cor ou None), desgaste (0..1), padrao, escala, cor2, borda_metal}
    padrao: None | 'janelas' (vidro com janelas acesas ao acaso, cor2 = luz) | 'blocos' (pedra em
    blocos) | 'paineis' (chapas com frestas) | 'veios' (cristal com veios mais claros) | 'tecido'
    (trama e dobras) | 'runas' (tecido com runas na cor2; acesas com runas_acesas) | 'couro'
    (grão) | 'pelo' (fios)."""
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    cor = tuple(C['cor'])
    desg = C.get('desgaste', 0.3)
    esc = C.get('escala', 1.0)
    rnd = (semente * 7.31) % 10
    tc = _no(nt, 'ShaderNodeTexCoord', -1400, 0)
    co = _no(nt, 'ShaderNodeMapping', -1200, 0)
    co.inputs['Location'].default_value = (rnd, rnd * 0.7, rnd * 0.3)
    nt.links.new(tc.outputs['Object'], co.inputs['Vector'])
    vco = co.outputs[0]
    # ruído grande (manchas) e fino (grão)
    n1 = _no(nt, 'ShaderNodeTexNoise', -1000, 200)
    n1.inputs['Scale'].default_value = 2.2 / esc
    n1.inputs['Detail'].default_value = 6
    nt.links.new(vco, n1.inputs['Vector'])
    n2 = _no(nt, 'ShaderNodeTexNoise', -1000, -100)
    n2.inputs['Scale'].default_value = 26 / esc
    n2.inputs['Detail'].default_value = 3
    nt.links.new(vco, n2.inputs['Vector'])
    f1, f2 = n1.outputs[0], n2.outputs[0]
    var = _mat(nt, 'ADD', _mat(nt, 'MULTIPLY', _mat(nt, 'SUBTRACT', f1, 0.5), desg * 1.1), _mat(nt, 'MULTIPLY', _mat(nt, 'SUBTRACT', f2, 0.5), desg * 0.5))
    # quinas: chanfro (Bevel) comparado com a normal verdadeira → máscara de borda
    bev = _no(nt, 'ShaderNodeBevel', -800, -400, samples=8)
    bev.inputs['Radius'].default_value = bisel
    geo = _no(nt, 'ShaderNodeNewGeometry', -800, -600)
    dot = _no(nt, 'ShaderNodeVectorMath', -600, -500, operation='DOT_PRODUCT')
    nt.links.new(bev.outputs[0], dot.inputs[0])
    nt.links.new(geo.outputs['True Normal'], dot.inputs[1])
    borda = _mat(nt, 'MULTIPLY', _mat(nt, 'SUBTRACT', 1.0, dot.outputs['Value']), 9.0, clamp=True)
    borda = _mat(nt, 'MULTIPLY', borda, _mat(nt, 'GREATER_THAN', f2, 0.42), clamp=True)   # gasto aos pedaços
    base = _no(nt, 'ShaderNodeVectorMath', -400, 200, operation='SCALE')
    base.inputs[0].default_value = cor
    nt.links.new(_mat(nt, 'ADD', 1.0, var), base.inputs['Scale'])
    corf = base.outputs[0]
    asp = _mat(nt, 'ADD', C.get('aspereza', 0.5), _mat(nt, 'MULTIPLY', var, 0.6), clamp=True)
    metal_v = C.get('metal', 0.0)
    metal = None
    altura = None        # relevo do padrão (vai no Bump, antes do chanfro)
    emis = None
    pad = C.get('padrao')
    if pad in ('tecido', 'runas'):
        # trama fina e dobras verticais (no objeto)
        wv = _no(nt, 'ShaderNodeTexWave', -650, 650, wave_type='BANDS', bands_direction='Z')
        wv.inputs['Scale'].default_value = 90 / esc
        wv.inputs['Distortion'].default_value = 1.5
        nt.links.new(vco, wv.inputs['Vector'])
        dob = _no(nt, 'ShaderNodeTexNoise', -650, 450)
        dob.inputs['Scale'].default_value = 6 / esc
        mpz = _no(nt, 'ShaderNodeMapping', -800, 450)
        mpz.inputs['Scale'].default_value = (1, 1, 0.15)
        nt.links.new(vco, mpz.inputs['Vector'])
        nt.links.new(mpz.outputs[0], dob.inputs['Vector'])
        tr = _mat(nt, 'ADD', 0.9, _mat(nt, 'MULTIPLY', wv.outputs[1], 0.12))
        tr = _mat(nt, 'MULTIPLY', tr, _mat(nt, 'ADD', 0.85, _mat(nt, 'MULTIPLY', dob.outputs[0], 0.3)))
        tb = _no(nt, 'ShaderNodeVectorMath', -250, 300, operation='SCALE')
        nt.links.new(corf, tb.inputs[0])
        nt.links.new(tr, tb.inputs['Scale'])
        corf = tb.outputs[0]
        altura = _mat(nt, 'MULTIPLY', wv.outputs[1], 0.4)
        if pad == 'runas':
            # runas: traços nas bordas de células de Voronoi, só em algumas (sorteio por célula)
            vr = _no(nt, 'ShaderNodeTexVoronoi', -650, 850, feature='DISTANCE_TO_EDGE')
            vr.inputs['Scale'].default_value = 14 / esc
            nt.links.new(vco, vr.inputs['Vector'])
            vs = _no(nt, 'ShaderNodeTexVoronoi', -650, 1050)
            vs.inputs['Scale'].default_value = 14 / esc
            nt.links.new(vco, vs.inputs['Vector'])
            sv = _no(nt, 'ShaderNodeSeparateColor', -450, 1050)
            nt.links.new(vs.outputs['Color'], sv.inputs[0])
            traco = _mat(nt, 'MULTIPLY', _mat(nt, 'LESS_THAN', vr.outputs[0], 0.035), _mat(nt, 'GREATER_THAN', sv.outputs[0], 0.55))
            luz = tuple(C.get('cor2', (1.0, 0.8, 0.4)))
            corf = _mix(nt, traco, corf, luz)
            if C.get('runas_acesas'):
                ve = _no(nt, 'ShaderNodeVectorMath', -200, 1100, operation='SCALE')
                ve.inputs[0].default_value = luz
                nt.links.new(_mat(nt, 'MULTIPLY', traco, 0.9), ve.inputs['Scale'])
                emis = ve.outputs[0]
    if pad == 'couro':
        vr = _no(nt, 'ShaderNodeTexVoronoi', -650, 650)
        vr.inputs['Scale'].default_value = 140 / esc
        nt.links.new(vco, vr.inputs['Vector'])
        gr = _mat(nt, 'ADD', 0.88, _mat(nt, 'MULTIPLY', vr.outputs[0], 0.2))
        tb = _no(nt, 'ShaderNodeVectorMath', -250, 300, operation='SCALE')
        nt.links.new(corf, tb.inputs[0])
        nt.links.new(gr, tb.inputs['Scale'])
        corf = tb.outputs[0]
        altura = _mat(nt, 'MULTIPLY', vr.outputs[0], 0.5)
    if pad == 'pelo':
        mpz = _no(nt, 'ShaderNodeMapping', -800, 650)
        mpz.inputs['Scale'].default_value = (14, 14, 1.2)
        nt.links.new(vco, mpz.inputs['Vector'])
        fio = _no(nt, 'ShaderNodeTexNoise', -650, 650)
        fio.inputs['Scale'].default_value = 30 / esc
        fio.inputs['Detail'].default_value = 8
        nt.links.new(mpz.outputs[0], fio.inputs['Vector'])
        tr = _mat(nt, 'ADD', 0.55, _mat(nt, 'MULTIPLY', fio.outputs[0], 0.9))
        tb = _no(nt, 'ShaderNodeVectorMath', -250, 300, operation='SCALE')
        nt.links.new(corf, tb.inputs[0])
        nt.links.new(tr, tb.inputs['Scale'])
        corf = tb.outputs[0]
        altura = fio.outputs[0]
    if pad in ('janelas', 'blocos', 'paineis'):
        sep = _no(nt, 'ShaderNodeSeparateXYZ', -1000, 500)
        nt.links.new(tc.outputs['Object'], sep.inputs[0])
        cmb = _no(nt, 'ShaderNodeCombineXYZ', -850, 500)
        nt.links.new(_mat(nt, 'ADD', sep.outputs[0], sep.outputs[1]), cmb.inputs[0])
        nt.links.new(sep.outputs[2], cmb.inputs[1])
        bk = _no(nt, 'ShaderNodeTexBrick', -650, 500)
        bk.offset = 0.0 if pad != 'blocos' else 0.5
        bk.inputs['Color1'].default_value = (0, 0, 0, 1)
        bk.inputs['Color2'].default_value = (1, 1, 1, 1)
        bk.inputs['Mortar'].default_value = (0, 0, 0, 1)
        bk.inputs['Scale'].default_value = 1.0 / esc
        tam = {'janelas': (0.62, 0.78, 0.09), 'blocos': (0.7, 0.34, 0.025), 'paineis': (1.1, 0.55, 0.012)}[pad]
        bk.inputs['Brick Width'].default_value = tam[0]
        bk.inputs['Row Height'].default_value = tam[1]
        bk.inputs['Mortar Size'].default_value = tam[2]
        nt.links.new(cmb.outputs[0], bk.inputs['Vector'])
        sorte, junta = bk.outputs[0], bk.outputs[1]
        sv = _no(nt, 'ShaderNodeSeparateColor', -450, 600)
        nt.links.new(sorte, sv.inputs[0])
        sorte = sv.outputs[0]
        if pad == 'janelas':
            acesa = _mat(nt, 'MULTIPLY', _mat(nt, 'GREATER_THAN', sorte, 0.7), _mat(nt, 'SUBTRACT', 1.0, junta), clamp=True)
            luz = tuple(C.get('cor2', (1.0, 0.78, 0.45)))
            moldura = tuple(v * 1.4 + 0.03 for v in cor)
            corf = _mix(nt, junta, corf, moldura)
            corf = _mix(nt, _mat(nt, 'MULTIPLY', acesa, 0.5), corf, luz)
            ve = _no(nt, 'ShaderNodeVectorMath', -200, 700, operation='SCALE')
            ve.inputs[0].default_value = luz
            nt.links.new(_mat(nt, 'MULTIPLY', acesa, _mat(nt, 'ADD', 0.3, _mat(nt, 'MULTIPLY', f1, 0.4))), ve.inputs['Scale'])
            emis = ve.outputs[0]
            asp = _mat(nt, 'ADD', asp, _mat(nt, 'MULTIPLY', junta, 0.35), clamp=True)
            altura = _mat(nt, 'SUBTRACT', 1.0, junta)
        else:
            k = 0.35 if pad == 'blocos' else 0.12
            tom = _mat(nt, 'ADD', 1.0 - k / 2, _mat(nt, 'MULTIPLY', sorte, k))
            tb = _no(nt, 'ShaderNodeVectorMath', -250, 300, operation='SCALE')
            nt.links.new(corf, tb.inputs[0])
            nt.links.new(tom, tb.inputs['Scale'])
            corf = _mix(nt, _mat(nt, 'MULTIPLY', junta, 0.75), tb.outputs[0], tuple(v * 0.35 for v in cor))
            altura = _mat(nt, 'SUBTRACT', 1.0, junta)
            asp = _mat(nt, 'ADD', asp, _mat(nt, 'MULTIPLY', junta, 0.2), clamp=True)
    if pad == 'veios':
        vo = _no(nt, 'ShaderNodeTexVoronoi', -650, 500, feature='DISTANCE_TO_EDGE')
        vo.inputs['Scale'].default_value = 5.0 / esc
        nt.links.new(vco, vo.inputs['Vector'])
        veio = _mat(nt, 'LESS_THAN', vo.outputs[0], 0.05)
        corf = _mix(nt, _mat(nt, 'MULTIPLY', veio, 0.7), corf, tuple(min(1.0, v * 1.6 + 0.25) for v in cor))
    # borda gasta: mais clara e lisa (metal à mostra se pedido)
    if desg > 0:
        clara = tuple(min(1.0, v * 1.7 + 0.07) for v in cor) if not C.get('borda_metal') else (0.62, 0.6, 0.58)
        corf = _mix(nt, _mat(nt, 'MULTIPLY', borda, min(1.0, desg * 1.3)), corf, clara)
        asp = _mat(nt, 'SUBTRACT', asp, _mat(nt, 'MULTIPLY', borda, desg * 0.35), clamp=True)
        if C.get('borda_metal'):
            metal = _mat(nt, 'ADD', metal_v, _mat(nt, 'MULTIPLY', borda, 1.0), clamp=True)
    nt.links.new(corf, p.inputs['Base Color'])
    nt.links.new(asp, p.inputs['Roughness'])
    if metal is not None:
        nt.links.new(metal, p.inputs['Metallic'])
    else:
        p.inputs['Metallic'].default_value = metal_v
    ke = 'Emission Color' if 'Emission Color' in p.inputs else 'Emission'
    e = C.get('emissao')
    if e:
        ve = _no(nt, 'ShaderNodeVectorMath', -200, 900, operation='SCALE')
        ve.inputs[0].default_value = tuple(e)
        nt.links.new(_mat(nt, 'ADD', 0.82, _mat(nt, 'MULTIPLY', f1, 0.36)), ve.inputs['Scale'])
        emis = ve.outputs[0]
    if emis is not None:
        nt.links.new(emis, p.inputs[ke])
        p.inputs['Emission Strength'].default_value = 1.0
    # relevo: padrão (Bump) por cima do chanfro das quinas
    nrm = bev.outputs[0]
    if altura is not None or desg > 0:
        bp = _no(nt, 'ShaderNodeBump', -300, -400)
        bp.inputs['Strength'].default_value = 0.6 if altura is not None else 0.25
        bp.inputs['Distance'].default_value = 0.02
        h = altura if altura is not None else f2
        if altura is not None and desg > 0:
            h = _mat(nt, 'ADD', altura, _mat(nt, 'MULTIPLY', f2, 0.15))
        nt.links.new(h, bp.inputs['Height'])
        nt.links.new(bev.outputs[0], bp.inputs['Normal'])
        nrm = bp.outputs[0]
    nt.links.new(nrm, p.inputs['Normal'])
    return m


def assar(obj, lado=1024, amostras_ao=32, margem_px=6, forca_emissao=3.0):
    """Assa os materiais (procedurais) do objeto numa UV própria sem sobreposição e troca tudo por
    um material só com as imagens (texturas de verdade, lado×lado): cor com a oclusão ambiente,
    ORM (glTF: R oclusão, G aspereza, B metal), normais no espaço tangente e emissão.
    Cycles na CPU. Devolve o material novo."""
    import numpy as np
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    me = obj.data
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    me.uv_layers.new(name='UVMap')
    uv_desdobrar(obj, margem=0.008)
    ativar(obj)
    mats = [s.material for s in obj.material_slots if s.material]

    def img(nm, cor):
        im = bpy.data.images.new(f'{obj.name}_{nm}', lado, lado, alpha=False)
        im.colorspace_settings.name = 'sRGB' if cor else 'Non-Color'
        return im

    alvo = {}
    for m in mats:
        n = m.node_tree.nodes.new('ShaderNodeTexImage')
        n.location = (600, -600)
        alvo[m.name] = n

    def bake(tipo, im, amostras=1, **kw):
        sc.cycles.samples = amostras
        for m in mats:
            n = alvo[m.name]
            n.image = im
            for q in m.node_tree.nodes:
                q.select = False
            n.select = True
            m.node_tree.nodes.active = n
        bpy.ops.object.bake(type=tipo, margin=margem_px, use_clear=True, **kw)
        return im

    def canal_por_emissao(entrada, im):
        """Assa uma entrada do Principled (ex.: Metallic) ligando-a numa emissão pura."""
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
            em.inputs['Strength'].default_value = 1.0
            nt.links.new(em.outputs[0], out.inputs['Surface'])
            salvos.append((nt, p, out, em))
        bake('EMIT', im)
        for nt, p, out, em in salvos:
            nt.links.new(p.outputs[0], out.inputs['Surface'])
            nt.nodes.remove(em)
        return im

    t0 = time.time()
    i_cor = bake('DIFFUSE', img('cor', True), 1, pass_filter={'COLOR'})
    i_ao = bake('AO', img('ao', False), amostras_ao)
    i_rough = bake('ROUGHNESS', img('aspereza', False))
    i_metal = canal_por_emissao('Metallic', img('metal', False))
    i_emi = bake('EMIT', img('emissao', True))
    i_nrm = bake('NORMAL', img('normais', False), 8, normal_space='TANGENT')
    print(f'assado {obj.name}: {lado}px em {time.time() - t0:.1f}s')

    def px(im):
        a = np.empty(lado * lado * 4, np.float32)
        im.pixels.foreach_get(a)
        return a.reshape(lado, lado, 4)
    ao = px(i_ao)[..., 0]
    cor = px(i_cor)
    cor[..., :3] *= (0.42 + 0.58 * ao)[..., None]      # oclusão na cor (o motor não tem passada de oclusão)
    i_cor.pixels.foreach_set(cor.ravel())
    orm = np.ones((lado, lado, 4), np.float32)
    orm[..., 0] = ao
    orm[..., 1] = px(i_rough)[..., 0]
    orm[..., 2] = px(i_metal)[..., 0]
    i_orm = img('orm', False)
    i_orm.pixels.foreach_set(orm.ravel())
    for im in (i_cor, i_orm, i_nrm, i_emi):
        im.pack()
    # material final: as imagens assadas
    fim = bpy.data.materials.new(obj.name)
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
    for m in mats:
        bpy.data.materials.remove(m)
    return fim


def dar_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


# ------------------------------------------------------------------ geometria
def aplicar_modificadores(obj):
    ativar(obj)
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def juntar(objs, nome):
    """Junta os objetos num só (modificadores aplicados antes) e devolve o objeto."""
    for o in objs:
        aplicar_modificadores(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = obj.data.name = nome_limpo(nome)
    return obj


def origem_na_base(obj):
    """Origem no centro da base (os pés / o chão), transformações aplicadas."""
    ativar(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    base = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    obj.data.transform(__import__('mathutils').Matrix.Translation(-base))
    obj.location = (0, 0, 0)


def normais_consistentes(obj):
    """Normais para fora e sombreamento suave com quinas vivas (auto smooth por ângulo)."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    ativar(obj)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(40))
    except Exception:
        bpy.ops.object.shade_smooth()


def uv_desdobrar(obj, margem=0.02):
    """UV sem sobreposição (Smart UV Project)."""
    ativar(obj)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=margem)
    bpy.ops.object.mode_set(mode='OBJECT')


def contar_tris(objs):
    n = 0
    for o in objs:
        if o.type != 'MESH':
            continue
        o.data.calc_loop_triangles()
        n += len(o.data.loop_triangles)
    return n


def medidas(objs):
    """Caixa (min, max) em metros de todos os objetos."""
    vs = [o.matrix_world @ v.co for o in objs if o.type == 'MESH' for v in o.data.vertices]
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return mn, mx


def limpar_sobras():
    """Sem objetos vazios, ocultos ou dados órfãos."""
    for o in list(bpy.data.objects):
        if o.type in ('EMPTY',) or o.hide_get() or o.hide_render:
            bpy.data.objects.remove(o, do_unlink=True)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for b in list(col):
            if b.users == 0:
                col.remove(b)


# ------------------------------------------------------------------ arquivos
def backup(caminho):
    """Cópia de segurança antes de mexer num asset que já existe (assets/_backup/<data>/...)."""
    if not os.path.exists(caminho):
        return None
    rel = os.path.relpath(caminho, RAIZ)
    dst = os.path.join(BACKUP, time.strftime('%Y%m%d-%H%M%S'), rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(caminho, dst)
    return dst


def exportar_glb(caminho, objs, draco=False, imagens='AUTO'):
    """glTF 2.0 binário, +Y para cima, modificadores aplicados, só os objetos pedidos.
    imagens: 'AUTO' (PNG) ou 'JPEG' (texturas assadas: arquivo bem menor)."""
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    backup(caminho)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=caminho, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_draco_mesh_compression_enable=draco,
                              export_materials='EXPORT', export_cameras=False, export_lights=False,
                              export_image_format=imagens, export_jpeg_quality=92)
    return caminho


# ------------------------------------------------------------------ prévia
def renderizar_previa(caminho, objs=None, lado=512, amostras=24, angulo=(55, 0, 40), fundo=None):
    """PNG com câmera enquadrando os objetos, luz de três pontos e chão sombreado (Cycles na CPU)."""
    objs = objs or [o for o in bpy.context.scene.objects if o.type == 'MESH']
    mn, mx = medidas(objs)
    centro = (mn + mx) / 2
    raio = max((mx - mn).length / 2, 0.05)
    sc = bpy.context.scene
    cam_d = bpy.data.cameras.new('previa_cam')
    cam_d.lens = 50
    cam = bpy.data.objects.new('previa_cam', cam_d)
    sc.collection.objects.link(cam)
    el, _, az = (math.radians(a) for a in angulo)
    dist = raio / math.tan(cam_d.angle / 2) * 1.15
    cam.location = centro + Vector((math.sin(az) * math.cos(math.pi / 2 - el), -math.cos(az) * math.cos(math.pi / 2 - el), math.sin(math.pi / 2 - el))) * dist
    cam.rotation_euler = (centro - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    luzes = []
    for nome, energia, pos, cor in [('chave', 900, (3, -3, 4), (1, 0.96, 0.9)), ('preench', 300, (-4, -2, 2), (0.8, 0.88, 1)), ('contra', 600, (0, 4, 3), (1, 1, 1))]:
        ld = bpy.data.lights.new(nome, 'AREA')
        ld.energy = energia * raio * raio
        ld.size = raio * 2
        ld.color = cor
        lo = bpy.data.objects.new(nome, ld)
        lo.location = centro + Vector(pos) * raio * 1.5
        lo.rotation_euler = (centro - lo.location).to_track_quat('-Z', 'Y').to_euler()
        sc.collection.objects.link(lo)
        luzes.append(lo)
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = amostras
    try:
        sc.cycles.use_denoising = False
    except Exception:
        pass
    sc.render.resolution_x = sc.render.resolution_y = lado
    sc.render.film_transparent = fundo is None
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    if sc.world is None:
        sc.world = bpy.data.worlds.new('mundo')
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes.get('Background')
    bg.inputs[0].default_value = (*(fundo or (0.42, 0.44, 0.5)), 1)   # (o fundo transparente não aparece, mas ilumina e reflete nos metais)
    bg.inputs[1].default_value = 1.0
    sc.render.filepath = caminho
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    bpy.ops.render.render(write_still=True)
    for o in luzes + [cam]:
        bpy.data.objects.remove(o, do_unlink=True)
    return caminho


# ------------------------------------------------------------------ relatório
def registrar(nome, tipo, glb, previa, objs, extra=None):
    """Grava tools/blender/_saida/<nome>.json (o build_all.py junta tudo em assets/REPORT.md)."""
    mn, mx = medidas(objs)
    d = dict(nome=nome, tipo=tipo, tris=contar_tris(objs), orcamento=ORCAMENTO.get(tipo),
             glb=os.path.relpath(glb, RAIZ), kb=round(os.path.getsize(glb) / 1024, 1),
             previa=os.path.relpath(previa, RAIZ) if previa else None,
             tamanho_m=[round(v, 3) for v in (mx - mn)], materiais=sorted({m.name for o in objs for m in o.data.materials if m}))
    if extra:
        d.update(extra)
    os.makedirs(SAIDA, exist_ok=True)
    with open(os.path.join(SAIDA, nome + '.json'), 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    print('ASSET', json.dumps(d, ensure_ascii=False))
    return d


def args():
    """Argumentos depois de '--' (blender -b -P script.py -- a b) ou os do python3."""
    return sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
