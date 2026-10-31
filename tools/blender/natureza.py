"""Kit de cenário medieval e natural (florestas e vilas das regiões iniciais) feito no Blender.

Referência de estilo: os campos e florestas de RPGs de fantasia medieval (como The Witcher 3) — só a
atmosfera: carvalhos largos, pinheiros escuros, bétulas claras, chão com arbustos, samambaias,
musgo e cogumelos, e as coisas de uma vila de estrada (cerca, carroça, placa, feno, poço). Nenhum
modelo, textura ou lugar daquele jogo é copiado: tudo é montado aqui, por regras.

Peças orgânicas (além das primitivas do kit.py):
- tubo: tronco ou galho ao longo de uma polilinha, afinando, sem torcer (transporte paralelo);
- bolota: icosfera deformada por ruído (copa de folhas, arbusto, rocha, musgo);
- fronde: folha de samambaia (fita curvada).
Cada peça usa até quatro materiais procedurais (utils.material_procedural) assados em texturas de
512 px (cor com oclusão, ORM, normais) e sai em assets/models/natureza/<nome>.glb, com a prévia em
assets/models/previews/. O conversor (tools/importar_prop.py --grupo natureza) leva ao jogo
(js/assets/natureza3d.js), e js/mundo/natureza3d.js põe as árvores e rochas no lugar dos
obstáculos das florestas e espalha as outras peças.

Rode uma peça: python3 tools/blender/asset_nat_<nome>.py; todas: python3 tools/blender/natureza.py
Eixos (Blender): Z para cima, metros, origem na base.
"""
import math
import os
import random
import sys

import bpy
import bmesh
from mathutils import Vector, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utils as U   # noqa: E402
from kit import Obj, rad   # noqa: E402

TAU = 2 * math.pi

# ------------------------------------------------------------ materiais (células)
CASCA = dict(cor=(0.13, 0.085, 0.05), aspereza=0.95, desgaste=0.55, padrao='pelo', escala=0.45)
CASCA_PINHO = dict(cor=(0.16, 0.09, 0.05), aspereza=0.95, desgaste=0.6, padrao='pelo', escala=0.35)
CASCA_BETULA = dict(cor=(0.72, 0.70, 0.64), aspereza=0.8, desgaste=0.95, padrao='couro', escala=0.5)
FOLHAS = dict(cor=(0.055, 0.13, 0.03), aspereza=0.85, desgaste=0.55, padrao='couro', escala=0.35)
FOLHAS_CLARAS = dict(cor=(0.12, 0.21, 0.045), aspereza=0.8, desgaste=0.5, padrao='couro', escala=0.3)
AGULHAS = dict(cor=(0.04, 0.11, 0.06), aspereza=0.9, desgaste=0.45, padrao='pelo', escala=0.25)
MUSGO = dict(cor=(0.07, 0.13, 0.03), aspereza=0.95, desgaste=0.5, padrao='couro', escala=0.3)
PEDRA = dict(cor=(0.11, 0.105, 0.095), aspereza=0.92, desgaste=0.75)
MADEIRA = dict(cor=(0.26, 0.17, 0.09), aspereza=0.88, desgaste=0.6, padrao='pelo', escala=0.6)
MADEIRA_ESCURA = dict(cor=(0.13, 0.08, 0.045), aspereza=0.9, desgaste=0.55, padrao='pelo', escala=0.6)
FERRO = dict(cor=(0.16, 0.16, 0.17), metal=0.85, aspereza=0.6, desgaste=0.7, borda_metal=True)
FENO = dict(cor=(0.42, 0.32, 0.12), aspereza=0.95, desgaste=0.4, padrao='pelo', escala=0.25)
CHAPEU_COGUMELO = dict(cor=(0.5, 0.14, 0.07), aspereza=0.6, desgaste=0.5, padrao='couro', escala=0.2)
PE_COGUMELO = dict(cor=(0.78, 0.72, 0.6), aspereza=0.7, desgaste=0.3)


# ------------------------------------------------------------ peças orgânicas
def _objeto(nome, bm):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    for pl in me.polygons:
        pl.use_smooth = True                 # orgânico: sombreado liso (as quinas vêm do mapa de normais)
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def tubo(o, cel, pontos, raios, lados=8, ponta=True):
    """Tronco ou galho: anéis ao longo de pontos (Vector), com o raio de cada um; o referencial
    anda por transporte paralelo (o tubo não torce). ponta=True fecha a ponta num vértice."""
    bm = bmesh.new()
    n = len(pontos)
    t0 = (pontos[1] - pontos[0]).normalized()
    u = t0.orthogonal().normalized()
    aneis = []
    for k, p in enumerate(pontos):
        t = (pontos[min(k + 1, n - 1)] - pontos[max(k - 1, 0)]).normalized()
        u = (u - t * u.dot(t)).normalized()
        w = t.cross(u)
        if ponta and k == n - 1:
            aneis.append([bm.verts.new(p)])
            continue
        aneis.append([bm.verts.new(p + (u * math.cos(TAU * j / lados) + w * math.sin(TAU * j / lados)) * raios[k]) for j in range(lados)])
    for k in range(n - 1):
        a, b = aneis[k], aneis[k + 1]
        for j in range(lados):
            j2 = (j + 1) % lados
            if len(b) == 1:
                bm.faces.new((a[j], a[j2], b[0]))
            else:
                bm.faces.new((a[j], a[j2], b[j2], b[j]))
    bm.faces.new(list(reversed(aneis[0])))
    if not ponta:
        bm.faces.new(aneis[-1])
    return o._fim(_objeto('tubo', bm), cel)


def bolota(o, cel, centro, raio, esc=(1, 1, 1), sub=1, ruido=0.28, semente=1, freq=1.6, base=None):
    """Copa, arbusto, rocha ou musgo: icosfera deformada por ruído (base: corta o que fica abaixo
    dessa altura, achatando o fundo)."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub + 1, radius=1.0)   # (no bmesh, 1 é o icosaedro: 20 faces)
    off = Vector((semente * 3.17, semente * 1.71, semente * 2.53))
    for v in bm.verts:
        d = v.co.normalized()
        f = 1 + ruido * noise.noise(d * freq + off) + ruido * 0.5 * noise.noise(d * freq * 2.3 + off * 1.7)
        p = Vector((d.x * esc[0], d.y * esc[1], d.z * esc[2])) * raio * f + Vector(centro)
        if base is not None and p.z < base:
            p.z = base + (p.z - base) * 0.08
        v.co = p
    return o._fim(_objeto('bolota', bm), cel)


def fronde(o, cel, base, direcao, comp, larg, curva=0.35, segs=5):
    """Folha de samambaia: fita que sai da base, sobe e curva para baixo, afinando na ponta."""
    bm = bmesh.new()
    d = Vector(direcao).normalized()
    lado = d.cross(Vector((0, 0, 1))).normalized()
    if lado.length < 1e-6:
        lado = Vector((1, 0, 0))
    linhas = []
    for k in range(segs + 1):
        t = k / segs
        p = Vector(base) + d * comp * t + Vector((0, 0, comp * (0.55 * t - curva * t * t)))
        w = larg * math.sin(math.pi * min(1, 0.15 + t)) * (1 - 0.8 * t)
        linhas.append((bm.verts.new(p - lado * w), bm.verts.new(p + Vector((0, 0, w * 0.15))), bm.verts.new(p + lado * w)))
    for k in range(segs):
        a, b = linhas[k], linhas[k + 1]
        bm.faces.new((a[0], a[1], b[1], b[0]))
        bm.faces.new((a[1], a[2], b[2], b[1]))
    return o._fim(_objeto('fronde', bm), cel)


def galho(rng, base, direcao, comp, r0, curva=0.25, nseg=4):
    """Pontos e raios de um galho que sai da base na direção dada, curvando para cima."""
    d = Vector(direcao).normalized()
    pts, rs = [], []
    for k in range(nseg + 1):
        t = k / nseg
        p = Vector(base) + d * comp * t + Vector((0, 0, comp * curva * t * t)) + Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)) * comp * 0.04 * t
        pts.append(p)
        rs.append(r0 * (1 - 0.8 * t))
    return pts, rs


def tronco_curvo(rng, altura, r0, r1, nseg=6, torto=0.08):
    pts, rs = [], []
    ox, oy = rng.uniform(-1, 1), rng.uniform(-1, 1)
    for k in range(nseg + 1):
        t = k / nseg
        pts.append(Vector((ox * torto * altura * math.sin(t * 2.2) * t, oy * torto * altura * math.sin(t * 1.7) * t, altura * t)))
        rs.append(r0 + (r1 - r0) * t ** 0.8)
    return pts, rs


def raizes(o, cel, rng, r_tronco, n=4):
    for k in range(n):
        a = TAU * k / n + rng.uniform(-0.3, 0.3)
        d = Vector((math.cos(a), math.sin(a), 0))
        pts = [Vector((0, 0, 0.35)) + d * r_tronco * 0.5, Vector((0, 0, 0.12)) + d * r_tronco * 1.4, d * r_tronco * 2.4 + Vector((0, 0, -0.03))]
        tubo(o, cel, pts, [r_tronco * 0.45, r_tronco * 0.3, r_tronco * 0.08], lados=5)


# ------------------------------------------------------------ peças do kit
def carvalho(rng):
    """Carvalho largo: tronco grosso e torto, raízes, três ou quatro galhos abertos e a copa em
    tufos grandes (5,5 m)."""
    o = Obj('carvalho', 'prop')
    pts, rs = tronco_curvo(rng, 2.6, 0.34, 0.2, 6, 0.06)
    tubo(o, 0, pts, rs, lados=9, ponta=False)
    raizes(o, 0, rng, 0.34, 5)
    topo = pts[-1]
    pontas = []
    for k in range(4):
        a = TAU * k / 4 + rng.uniform(-0.4, 0.4)
        base = pts[4 + k % 2]
        gp, gr = galho(rng, base, (math.cos(a), math.sin(a), 0.75), rng.uniform(1.4, 1.9), 0.13, 0.3)
        tubo(o, 0, gp, gr, lados=6)
        pontas.append(gp[-1])
    pontas.append(topo + Vector((0, 0, 0.6)))
    for k, p in enumerate(pontas):
        bolota(o, 1, p + Vector((0, 0, 0.3)), rng.uniform(1.0, 1.3), (1.15, 1.15, 0.85), sub=1, ruido=0.3, semente=k + 1)
    for k in range(6):
        a = TAU * (k + 0.5) / 6 + rng.uniform(-0.2, 0.2)
        d = 0.9 if k % 2 else 1.5
        bolota(o, 1, topo + Vector((math.cos(a) * d, math.sin(a) * d, 0.7 + (0.6 if k % 2 else 0.0) + rng.uniform(-0.2, 0.3))), rng.uniform(0.75, 1.0), (1.1, 1.1, 0.85), sub=1, ruido=0.3, semente=k + 11)
    o.finalizar([CASCA, FOLHAS], angulo=(70, 0, 30), lado=512, bisel=0.02, pasta='natureza')


def pinheiro(rng):
    """Pinheiro escuro: tronco reto e fino, saias de galhos em cones serrilhados que diminuem
    para o alto (7 m)."""
    o = Obj('pinheiro', 'prop')
    tubo(o, 0, [Vector((0, 0, 0)), Vector((0, 0, 3.5)), Vector((0, 0, 7.0))], [0.2, 0.13, 0.03], lados=7)
    n = 9
    for k in range(n):
        t = k / (n - 1)
        z = 1.1 + t * 5.3
        r = 1.95 * (1 - t) ** 0.9 + 0.3
        h = 1.15 - 0.45 * t
        bm = bmesh.new()
        lados = 16
        topo = bm.verts.new((0, 0, z + h))
        anel, baixo = [], []
        for j in range(lados):
            a = TAU * j / lados + k * 0.37
            ponta_ = j % 2 == 0
            rr = r * (1.0 + (0.16 if ponta_ else -0.1) + rng.uniform(-0.08, 0.08))
            cai = (0.28 if ponta_ else 0.12) * (1 - 0.5 * t) + rng.uniform(0, 0.08)
            anel.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, z - cai)))
            baixo.append(bm.verts.new((math.cos(a) * rr * 0.55, math.sin(a) * rr * 0.55, z + 0.05 - cai * 0.3)))
        miolo = bm.verts.new((0, 0, z + 0.25))
        for j in range(lados):
            j2 = (j + 1) % lados
            bm.faces.new((anel[j], anel[j2], topo))
            bm.faces.new((anel[j2], anel[j], baixo[j], baixo[j2]))
            bm.faces.new((baixo[j2], baixo[j], miolo))
        o._fim(_objeto('saia', bm), 1)
    o.finalizar([CASCA_PINHO, AGULHAS], angulo=(75, 0, 30), lado=512, bisel=0.015, pasta='natureza')


def betula(rng):
    """Bétula: tronco fino e claro, um pouco inclinado, galhos finos e copa leve, de folhas claras
    (6 m)."""
    o = Obj('betula', 'prop')
    pts, rs = tronco_curvo(rng, 4.6, 0.16, 0.07, 7, 0.05)
    tubo(o, 0, pts, rs, lados=7, ponta=False)
    pontas = [pts[-1] + Vector((0, 0, 0.6))]
    for k in range(5):
        a = TAU * k / 5 + rng.uniform(-0.3, 0.3)
        gp, gr = galho(rng, pts[3 + k % 3], (math.cos(a), math.sin(a), 1.1), rng.uniform(0.9, 1.3), 0.05, 0.25, 3)
        tubo(o, 0, gp, gr, lados=5)
        pontas.append(gp[-1])
    for k, p in enumerate(pontas):
        bolota(o, 1, p + Vector((0, 0, 0.15)), rng.uniform(0.6, 0.85), (0.95, 0.95, 1.2), sub=1, ruido=0.32, semente=k + 21)
    for k in range(3):
        a = TAU * k / 3 + 0.4
        bolota(o, 1, pts[-2] + Vector((math.cos(a) * 0.7, math.sin(a) * 0.7, 0.4)), rng.uniform(0.5, 0.7), (1, 1, 1.15), sub=1, ruido=0.32, semente=k + 27)
    o.finalizar([CASCA_BETULA, FOLHAS_CLARAS], angulo=(72, 0, 30), lado=512, bisel=0.015, pasta='natureza')


def arvore_seca(rng):
    """Árvore morta: tronco torto e rachado, galhos nus e retorcidos (5 m)."""
    o = Obj('arvore_seca', 'prop')
    pts, rs = tronco_curvo(rng, 3.4, 0.3, 0.1, 6, 0.12)
    tubo(o, 0, pts, rs, lados=7)
    raizes(o, 0, rng, 0.3, 4)
    for k in range(6):
        a = TAU * k / 6 + rng.uniform(-0.4, 0.4)
        base = pts[2 + k % 4]
        gp, gr = galho(rng, base, (math.cos(a), math.sin(a), rng.uniform(0.3, 1.2)), rng.uniform(0.9, 1.6), 0.09, 0.35, 4)
        tubo(o, 0, gp, gr, lados=5)
        if k % 2 == 0:
            gp2, gr2 = galho(rng, gp[2], (math.cos(a + 0.8), math.sin(a + 0.8), 0.9), 0.6, 0.035, 0.3, 3)
            tubo(o, 0, gp2, gr2, lados=4)
    o.finalizar([dict(CASCA, cor=(0.11, 0.09, 0.075), desgaste=0.75)], angulo=(70, 0, 30), lado=512, bisel=0.015, pasta='natureza')


def arbusto(rng):
    """Arbusto: tufos de folhas baixos e largos (0,9 m)."""
    o = Obj('arbusto', 'prop')
    for k in range(6):
        a = TAU * k / 6 + rng.uniform(-0.3, 0.3)
        d = rng.uniform(0.2, 0.45) if k else 0
        bolota(o, 0 if k % 2 else 1, (math.cos(a) * d, math.sin(a) * d, 0.32 + rng.uniform(0, 0.18)), rng.uniform(0.35, 0.5), (1.1, 1.1, 0.8), sub=1, ruido=0.32, semente=k + 31, base=0.0)
    o.finalizar([FOLHAS, FOLHAS_CLARAS], angulo=(65, 0, 30), lado=512, bisel=0.01, pasta='natureza')


def samambaia(rng):
    """Samambaia: folhas compridas que saem do chão em roseta e curvam para fora."""
    o = Obj('samambaia', 'prop')
    for k in range(9):
        a = TAU * k / 9 + rng.uniform(-0.2, 0.2)
        fronde(o, 0, (0, 0, 0.02), (math.cos(a), math.sin(a), 0), rng.uniform(0.55, 0.8), 0.11, curva=0.5)
    o.finalizar([FOLHAS_CLARAS], angulo=(60, 0, 30), lado=512, bisel=0.005, pasta='natureza')


def pedra_musgo(rng):
    """Pedra grande com musgo por cima (1,1 m)."""
    o = Obj('pedra_musgo', 'prop')
    bolota(o, 0, (0, 0, 0.45), 0.75, (1.25, 1.0, 0.75), sub=2, ruido=0.22, semente=41, freq=1.3, base=0.0)
    bolota(o, 1, (0.05, 0.0, 0.88), 0.55, (1.25, 1.0, 0.32), sub=1, ruido=0.3, semente=42)
    bolota(o, 0, (0.95, 0.35, 0.18), 0.28, (1.2, 1.0, 0.8), sub=1, ruido=0.25, semente=43, base=0.0)
    o.finalizar([PEDRA, MUSGO], angulo=(62, 0, 30), lado=512, bisel=0.02, pasta='natureza')


def rochedo(rng):
    """Rochedo de granito alto e partido, para as encostas (2,4 m)."""
    o = Obj('rochedo', 'prop')
    bolota(o, 0, (0, 0, 1.0), 1.15, (1.0, 0.85, 1.15), sub=2, ruido=0.26, semente=51, freq=1.1, base=0.0)
    bolota(o, 0, (0.85, 0.3, 0.45), 0.6, (1.0, 1.0, 0.9), sub=1, ruido=0.25, semente=52, base=0.0)
    bolota(o, 1, (-0.1, 0.0, 2.1), 0.55, (1.2, 1.0, 0.3), sub=1, ruido=0.3, semente=53)
    o.finalizar([PEDRA, MUSGO], angulo=(65, 0, 30), lado=512, bisel=0.02, pasta='natureza')


def tronco_caido(rng):
    """Tronco caído, com os cotos dos galhos e musgo por cima (2,6 m)."""
    o = Obj('tronco_caido', 'prop')
    pts = [Vector((-1.3, 0, 0.26)), Vector((-0.4, 0.05, 0.27)), Vector((0.5, -0.04, 0.25)), Vector((1.3, 0.02, 0.22))]
    tubo(o, 0, pts, [0.27, 0.26, 0.24, 0.21], lados=9, ponta=False)
    for x, a in ((-0.6, 1.2), (0.4, -0.9), (0.9, 2.2)):
        gp, gr = galho(rng, (x, 0, 0.4), (0.3, math.cos(a), math.sin(abs(a)) * 0.6), 0.45, 0.07, 0.1, 2)
        tubo(o, 0, gp, gr, lados=5)
    bolota(o, 1, (0.1, 0.0, 0.47), 0.42, (2.0, 0.55, 0.22), sub=1, ruido=0.3, semente=61)
    o.finalizar([CASCA, MUSGO], angulo=(55, 0, 25), lado=512, bisel=0.015, pasta='natureza')


def toco(rng):
    """Toco cortado, com os anéis no topo e raízes (0,6 m)."""
    o = Obj('toco', 'prop')
    o.cilindro(0, 0.36, 0.55, lados=10, r2=0.31)
    o.cilindro(1, 0.3, 0.03, (0, 0, 0.55), lados=10)
    raizes(o, 0, rng, 0.36, 5)
    o.finalizar([CASCA, dict(MADEIRA, cor=(0.45, 0.33, 0.18), padrao='veios')], angulo=(55, 0, 30), lado=512, bisel=0.02, pasta='natureza')


def cogumelos(rng):
    """Cogumelos de chapéu vermelho em grupo (0,35 m)."""
    o = Obj('cogumelos', 'prop')
    for k in range(5):
        a = TAU * k / 5 + rng.uniform(-0.3, 0.3)
        d = 0.12 + 0.08 * (k % 2)
        h = rng.uniform(0.12, 0.3)
        x, y = math.cos(a) * d, math.sin(a) * d
        o.cilindro(1, 0.025 + 0.01 * h, h, (x, y, 0), lados=6, r2=0.02)
        o.esfera(0, 0.06 + 0.12 * h, (x, y, h), seg=8, aneis=5, esc=(1, 1, 0.55))
    o.finalizar([CHAPEU_COGUMELO, PE_COGUMELO], angulo=(55, 0, 30), lado=512, bisel=0.008, pasta='natureza')


def cerca(rng):
    """Cerca de madeira rústica: três mourões e duas travessas tortas (2,4 m)."""
    o = Obj('cerca', 'prop')
    for k, x in enumerate((-1.15, 0.0, 1.15)):
        o.cilindro(0, 0.075, 1.15 + rng.uniform(-0.08, 0.08), (x, 0, 0), lados=6, r2=0.06, rot=(rad(rng.uniform(-3, 3)), rad(rng.uniform(-3, 3)), 0))
    for z in (0.45, 0.9):
        tubo(o, 1, [Vector((-1.25, 0.05, z)), Vector((0, 0.06, z + rng.uniform(-0.04, 0.04))), Vector((1.25, 0.05, z + rng.uniform(-0.05, 0.05)))], [0.05, 0.055, 0.05], lados=6, ponta=False)
    o.finalizar([MADEIRA_ESCURA, MADEIRA], angulo=(60, 0, 25), lado=512, bisel=0.01, pasta='natureza')


def carroca(rng):
    """Carroça de vila: caixa de tábuas, duas rodas de raios com aro de ferro e os varais (2,8 m)."""
    o = Obj('carroca', 'prop')
    o.caixa(0, 2.0, 1.15, 0.08, (0, 0, 0.62), chanfro=0.01)
    for y in (-0.55, 0.55):
        o.caixa(0, 2.0, 0.06, 0.38, (0, y, 0.7), chanfro=0.01)
    for x in (-0.97, 0.97):
        o.caixa(0, 0.06, 1.15, 0.34, (x, 0, 0.7), chanfro=0.01)
    for y in (-0.68, 0.68):
        o.anel(2, 0.5, 0.045, (0.2, y, 0.52), lados=16, seg=4, rot=(rad(90), 0, 0))
        o.cilindro(1, 0.08, 0.14, (0.2, y - 0.07, 0.52), lados=8, rot=(rad(90), 0, 0))
        for k in range(4):
            o.cilindro(1, 0.022, 0.92, (0.2, y, 0.52 - 0.46), lados=4, rot=(0, TAU * k / 8, 0))   # raios (diâmetros) no plano da roda
    o.cilindro(1, 0.05, 1.5, (0.2, -0.75, 0.52), lados=6, rot=(rad(-90), 0, 0))
    for y in (-0.35, 0.35):
        tubo(o, 1, [Vector((1.0, y, 0.6)), Vector((1.8, y * 0.85, 0.42)), Vector((2.5, y * 0.75, 0.35))], [0.04, 0.04, 0.035], lados=5, ponta=False)
    o.caixa(3, 0.5, 0.5, 0.35, (-0.5, 0.15, 0.7), chanfro=0.02)
    o.finalizar([MADEIRA, MADEIRA_ESCURA, FERRO, FENO], angulo=(62, 0, 35), lado=512, bisel=0.012, pasta='natureza')


def placa_estrada(rng):
    """Placa de estrada: mourão com duas tábuas em forma de seta (2,2 m)."""
    o = Obj('placa_estrada', 'prop')
    o.cilindro(0, 0.08, 2.2, lados=6, r2=0.065)
    for z, a in ((1.75, rad(20)), (1.4, rad(-140))):
        o.caixa(1, 0.85, 0.05, 0.2, (0.38 * math.cos(a), 0.38 * math.sin(a), z), rot=(0, 0, a), chanfro=0.01)
        o.caixa(1, 0.16, 0.05, 0.16, (0.82 * math.cos(a), 0.82 * math.sin(a), z + 0.02), rot=(0, rad(45), a), chanfro=0.005)   # ponta da seta
    o.finalizar([MADEIRA_ESCURA, MADEIRA], angulo=(65, 0, 30), lado=512, bisel=0.01, pasta='natureza')


def fardo_feno(rng):
    """Fardo de feno amarrado (1,1 m)."""
    o = Obj('fardo_feno', 'prop')
    o.caixa(0, 1.1, 0.6, 0.55, chanfro=0.12)
    for x in (-0.28, 0.28):
        o.caixa(1, 0.04, 0.62, 0.57, (x, 0, -0.01))
    o.finalizar([FENO, MADEIRA_ESCURA], angulo=(60, 0, 30), lado=512, bisel=0.02, pasta='natureza')


def poco(rng):
    """Poço de pedra com telhadinho de madeira, sarilho e balde (2,6 m)."""
    o = Obj('poco', 'prop')
    for k in range(10):
        a = TAU * k / 10
        o.caixa(0, 0.42, 0.26, 0.75, (math.cos(a) * 0.62, math.sin(a) * 0.62, 0), rot=(0, 0, a + rad(90)), chanfro=0.03)
    o.cilindro(0, 0.78, 0.08, (0, 0, 0.75), lados=12, r2=0.74)
    for y in (-0.6, 0.6):
        o.caixa(1, 0.1, 0.1, 1.75, (0, y, 0.8))
    o.cilindro(1, 0.06, 1.3, (0, -0.65, 1.95), lados=6, rot=(rad(-90), 0, 0))
    for x in (-0.45, 0.45):
        o.caixa(1, 0.9, 1.6, 0.06, (x * 0.62, 0, 2.45), rot=(0, rad(32 if x > 0 else -32), 0))
    o.cilindro(2, 0.13, 0.22, (0, 0, 1.55), lados=8, r2=0.15)
    o.finalizar([PEDRA, MADEIRA_ESCURA, FERRO], angulo=(62, 0, 30), lado=512, bisel=0.015, pasta='natureza')


PECAS = dict(carvalho=carvalho, pinheiro=pinheiro, betula=betula, arvore_seca=arvore_seca, arbusto=arbusto, samambaia=samambaia,
             pedra_musgo=pedra_musgo, rochedo=rochedo, tronco_caido=tronco_caido, toco=toco, cogumelos=cogumelos,
             cerca=cerca, carroca=carroca, placa_estrada=placa_estrada, fardo_feno=fardo_feno, poco=poco)


def gerar(nome, semente=7):
    U.limpar_cena()
    return PECAS[nome](random.Random(semente + sum(map(ord, nome))))


if __name__ == '__main__':
    for n in ([a for a in U.args() if a in PECAS] or list(PECAS)):
        gerar(n)
