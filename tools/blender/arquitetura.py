"""Kit modular de arquitetura medieval da cidade principal (Refúgio da Aurora), feito no Blender.

ESTADO: em desenvolvimento (fase 2 da expansão) — ainda não executado nem conferido; nada do jogo usa este arquivo.

Fase 2 da expansão do mundo aberto (docs/EXPANSAO_MUNDO_ABERTO.md). Tudo é montado aqui, por regras:

MÓDULOS (funções que constroem num referencial próprio; a parede é o plano y = 0 e a frente olha
para -Y; Montagem.modulo() põe o módulo em qualquer face do prédio, girado):
  parede de pedra, parede de enxaimel (reboco com vigas aparentes e mãos-francesas), porta, janela
  (caixilho, vidro aceso, peitoril e venezianas), telhado de duas águas (fiadas de telhas de verdade,
  cumeeira e empenas), escada, coluna, arco (aduelas e fecho), sacada, ameias, chaminé, lampião,
  placa pendurada e estandarte.
Cada módulo também sai sozinho em assets/models/arquitetura/modulos/<nome>.glb (o kit para montar
outros prédios), com a prévia em assets/models/previews/.

MOBÍLIA E OBJETOS (assets/models/arquitetura/<nome>.glb, vão para o jogo): mesa, banco, cadeira,
cama, barril, balcão, estante, lareira, caixote, boneco de treino, armeiro (suporte de armas),
lampião de rua e estandarte.

PRÉDIOS MONTADOS COM OS MÓDULOS (assets/models/arquitetura/<nome>.glb, vão para o jogo): taverna,
hospedaria, conselho, quartel e três casas. Cada prédio grava também <nome>.json com as marcas
(portas e janelas, em metros, no referencial do GLB) que o jogo usa para a luz das janelas à noite e
para a porta de entrada do interior.

Materiais: até seis células procedurais por objeto (utils.material_procedural: pedra em blocos,
reboco, madeira com veio, telha, ardósia, ferro, vidro aceso, tecido), assadas em texturas (cor com
oclusão, ORM, normais e emissão): 1024 px nos prédios, 512 nas peças.

Rode: python3 tools/blender/arquitetura.py (tudo), ou com nomes: python3 tools/blender/arquitetura.py taverna mesa
Depois: python3 tools/importar_prop.py --grupo arquitetura
Eixos (Blender): Z para cima, metros, origem no centro da base; a frente dos prédios olha para -Y.
"""
import json
import math
import os
import random
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utils as U   # noqa: E402
from kit import Obj, rad   # noqa: E402

TAU = 2 * math.pi
U.ORCAMENTO.update({'predio': 6000, 'movel': 1500, 'modulo': 1500})
PASTA = 'arquitetura'

# ------------------------------------------------------------ materiais (células)
PEDRA = dict(cor=(0.25, 0.235, 0.215), aspereza=0.9, desgaste=0.65, padrao='blocos', escala=0.75)
PEDRA_CLARA = dict(cor=(0.40, 0.37, 0.32), aspereza=0.88, desgaste=0.6, padrao='blocos', escala=0.65)
PEDRA_LISA = dict(cor=(0.34, 0.32, 0.29), aspereza=0.85, desgaste=0.55)
REBOCO = dict(cor=(0.58, 0.52, 0.41), aspereza=0.93, desgaste=0.75, escala=0.7)
MADEIRA = dict(cor=(0.19, 0.115, 0.06), aspereza=0.86, desgaste=0.55, padrao='pelo', escala=0.55)
MADEIRA_CLARA = dict(cor=(0.34, 0.23, 0.12), aspereza=0.82, desgaste=0.5, padrao='pelo', escala=0.5)
TELHA = dict(cor=(0.29, 0.105, 0.065), aspereza=0.8, desgaste=0.65, padrao='blocos', escala=0.28)
ARDOSIA = dict(cor=(0.085, 0.095, 0.11), aspereza=0.7, desgaste=0.5, padrao='blocos', escala=0.26)
FERRO = dict(cor=(0.13, 0.13, 0.14), metal=0.85, aspereza=0.55, desgaste=0.7, borda_metal=True)
LATAO = dict(cor=(0.45, 0.32, 0.12), metal=0.9, aspereza=0.4, desgaste=0.5, borda_metal=True)
VIDRO = dict(cor=(0.9, 0.58, 0.26), aspereza=0.3, desgaste=0.1, emissao=(1.0, 0.58, 0.22))
FOGO = dict(cor=(1.0, 0.45, 0.12), aspereza=0.5, desgaste=0.2, emissao=(1.0, 0.42, 0.1))
TECIDO_RUBRO = dict(cor=(0.34, 0.045, 0.045), aspereza=0.92, desgaste=0.4, padrao='tecido', escala=0.35)
TECIDO_AZUL = dict(cor=(0.05, 0.09, 0.26), aspereza=0.92, desgaste=0.4, padrao='tecido', escala=0.35)
LINHO = dict(cor=(0.62, 0.58, 0.5), aspereza=0.95, desgaste=0.35, padrao='tecido', escala=0.3)
PALHA = dict(cor=(0.44, 0.34, 0.14), aspereza=0.95, desgaste=0.45, padrao='pelo', escala=0.22)
LIVROS = dict(cor=(0.30, 0.09, 0.06), aspereza=0.75, desgaste=0.5, padrao='couro', escala=0.2)


# ------------------------------------------------------------ montagem
class Montagem(Obj):
    """Obj com seis células e módulos posicionados (giro em volta de Z, depois translação)."""
    def __init__(self, nome, tipo='prop'):
        super().__init__(nome, tipo)
        self.partes.update({4: [], 5: []})
        self.marcas = {'janelas': [], 'portas': []}
        self._M = Matrix.Identity(4)

    def modulo(self, fn, pos=(0, 0, 0), giro=0.0, **kw):
        """Constrói fn(self, **kw) no referencial do módulo e leva para pos, girado em Z."""
        antes = {k: len(v) for k, v in self.partes.items()}
        M0 = self._M
        M = Matrix.Translation(Vector(pos)) @ Matrix.Rotation(giro, 4, 'Z')
        self._M = M0 @ M
        r = fn(self, **kw)
        self._M = M0
        for k, L in self.partes.items():
            for ob in L[antes[k]:]:
                ob.matrix_world = M @ ob.matrix_world
        return r

    def marcar(self, tipo, p, **extra):
        """Marca (janela acesa, porta) no referencial do prédio."""
        q = self._M @ Vector(p)
        self.marcas[tipo].append(dict(p=[round(q.x, 3), round(q.y, 3), round(q.z, 3)], **extra))

    def finalizar(self, celulas, **kw):
        objs = [ob for L in self.partes.values() for ob in L]
        mn, mx = U.medidas(objs)
        base = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
        if self.marcas['janelas'] or self.marcas['portas']:
            out = {k: [dict(m, p=[round(m['p'][0] - base.x, 3), round(m['p'][1] - base.y, 3), round(m['p'][2] - base.z, 3)]) for m in v] for k, v in self.marcas.items()}
            out['tamanho_m'] = [round(v, 3) for v in (mx - mn)]
            caminho = os.path.join(U.MODELOS, PASTA, f'{self.nome}.json')
            os.makedirs(os.path.dirname(caminho), exist_ok=True)
            with open(caminho, 'w', encoding='utf-8') as f:
                json.dump(out, f, ensure_ascii=False, indent=1)
        return super().finalizar(celulas, **kw)


def prisma_tri(o, cel, larg, alt, esp, pos=(0, 0, 0), giro=0.0, topo=0.0):
    """Empena: trapézio (topo=0: triângulo) com a base de largura larg no eixo X, a ponta alt
    acima e espessura esp no eixo Y."""
    bm = bmesh.new()
    pts = [(-larg / 2, 0), (larg / 2, 0), (topo / 2, alt), (-topo / 2, alt)] if topo else [(-larg / 2, 0), (larg / 2, 0), (0, alt)]
    n = len(pts)
    vs = [bm.verts.new((x, y0, z)) for y0 in (-esp / 2, esp / 2) for (x, z) in pts]
    bm.faces.new(vs[:n])
    bm.faces.new(vs[n:][::-1])
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((vs[i], vs[j], vs[n + j], vs[n + i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('empena')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('empena', me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = pos
    return o._fim(ob, cel, (0, 0, giro))


# ------------------------------------------------------------ módulos de parede
# Referencial: a face externa da parede é o plano y = 0, a frente olha para -Y; x ao longo da
# parede (centrada em 0), z para cima a partir de 0. Células: 0 pedra, 1 reboco/2ª pedra,
# 2 madeira, 3 telhado, 4 ferro, 5 vidro aceso (padrão dos prédios).
def parede_pedra(o, larg=4.0, alt=3.0, esp=0.5, cel=0, rodape=True, cornija=True):
    o.caixa(cel, larg, esp, alt, (0, esp / 2, 0))
    if rodape:
        o.caixa(cel, larg + 0.04, esp + 0.16, 0.38, (0, esp / 2 - 0.08, 0), chanfro=0.02)
    if cornija:
        o.caixa(cel, larg + 0.06, esp + 0.12, 0.16, (0, esp / 2 - 0.06, alt - 0.16), chanfro=0.02)


def parede_enxaimel(o, larg=4.0, alt=2.8, esp=0.3, vaos=None, cel_reboco=1, cel_madeira=2, sem_reboco=False):
    """Reboco com a estrutura de madeira aparente. vaos: o que vai em cada vão entre os pilares
    ('x' mãos-francesas cruzadas, '/' e '\\' uma diagonal, 'j' janela, 'p' porta, '-' liso)."""
    vaos = vaos or ['x', 'j', 'x']
    n = len(vaos)
    if not sem_reboco:
        o.caixa(cel_reboco, larg, esp, alt, (0, esp / 2, 0))
    v = 0.17   # viga
    sai = 0.05
    for z in (0.0, alt - v):
        o.caixa(cel_madeira, larg + 0.08, v + sai, v, (0, (v + sai) / 2 - sai, z))
    o.caixa(cel_madeira, larg, 0.12 + sai, 0.12, (0, 0.06 - sai, 0.92))    # travessa do peitoril
    xs = [-larg / 2 + larg * k / n for k in range(n + 1)]
    for x in xs:
        o.caixa(cel_madeira, v, v + sai, alt, (min(max(x, -larg / 2 + v / 2), larg / 2 - v / 2), (v + sai) / 2 - sai, 0))
    for k, tipo in enumerate(vaos):
        a, b = xs[k] + v / 2, xs[k + 1] - v / 2
        cx, w = (a + b) / 2, b - a
        if tipo in ('x', '/', '\\'):
            for zi, zf in ((v, 0.92), (1.04, alt - v)):
                h = zf - zi
                ang = math.atan2(h, w)
                L = math.hypot(w, h)
                for s in ((1, -1) if tipo == 'x' else ((1,) if tipo == '/' else (-1,))):
                    o.caixa(cel_madeira, L, 0.11 + sai, 0.12, (cx, (0.11 + sai) / 2 - sai, (zi + zf) / 2 - 0.06), rot=(0, -s * ang, 0))
        elif tipo == 'j':
            o.modulo(janela, (cx, -0.02, 1.0), larg=min(0.95, w - 0.25), alt=min(1.15, alt - 1.45))
        elif tipo == 'p':
            o.modulo(porta, (cx, -0.02, 0.0), larg=min(1.3, w - 0.2), alt=min(2.3, alt - 0.3))


# ------------------------------------------------------------ aberturas
def janela(o, larg=0.9, alt=1.1, cel_madeira=2, cel_vidro=5, venezianas=True, arco=False):
    """Janela com caixilho, vidro aceso (luz da casa), cruzeta, peitoril e venezianas abertas."""
    f = 0.09
    o.caixa(cel_vidro, larg - 0.04, 0.03, alt - 0.04, (0, -0.005, 0.02))
    o.caixa(cel_madeira, larg + 2 * f, 0.1, f, (0, -0.05, alt))                       # verga
    o.caixa(cel_madeira, larg + 2 * f + 0.14, 0.2, 0.08, (0, -0.1, -0.08))           # peitoril
    for s in (-1, 1):
        o.caixa(cel_madeira, f, 0.1, alt, (s * (larg / 2 + f / 2), -0.05, 0))
    o.caixa(cel_madeira, 0.05, 0.06, alt, (0, -0.04, 0))                            # cruzeta
    o.caixa(cel_madeira, larg, 0.06, 0.05, (0, -0.04, alt * 0.55))
    if arco:
        prisma_tri(o, cel_madeira, larg + 2 * f, 0.32, 0.1, (0, -0.05, alt + f), topo=0.25)
    if venezianas:
        for s in (-1, 1):
            o.caixa(cel_madeira, larg / 2, 0.04, alt, (s * (larg / 2 + f + larg / 4 + 0.02), -0.03, 0))
            for z in (0.25, alt - 0.3):
                o.caixa(4, 0.22, 0.05, 0.04, (s * (larg / 2 + f + 0.08), -0.06, z))       # dobradiças
    o.marcar('janelas', (0, -0.06, alt * 0.5), larg=round(larg, 2), alt=round(alt, 2))


def porta(o, larg=1.2, alt=2.25, cel_madeira=2, cel_moldura=0, arco=True, dupla=False):
    """Porta de tábuas com ferragens, argola, moldura de pedra (com arco) e degrau."""
    m = 0.2
    nt = 6 if not dupla else 8
    for k in range(nt):
        w = larg / nt
        o.caixa(cel_madeira, w - 0.012, 0.08, alt - 0.02 - (0.04 if k % 2 else 0), (-larg / 2 + w * (k + 0.5), -0.04, 0.01))
    for z in (0.32, alt - 0.45):
        o.caixa(4, larg * (0.45 if dupla else 0.8), 0.03, 0.08, (-larg * (0.27 if dupla else 0.1), -0.095, z))
        if dupla:
            o.caixa(4, larg * 0.45, 0.03, 0.08, (larg * 0.27, -0.095, z))
    for s in ((-1, 1) if dupla else (1,)):
        o.anel(4, 0.08, 0.014, (s * larg * (0.12 if dupla else 0.3), -0.11, alt * 0.48), lados=10, seg=4, rot=(rad(90), 0, 0))
    for s in (-1, 1):
        o.caixa(cel_moldura, m, 0.22, alt, (s * (larg / 2 + m / 2), -0.1, 0), chanfro=0.02)
    if arco:
        n = 7
        R = larg / 2 + m / 2
        for k in range(n):
            a = math.pi * (k + 0.5) / n
            o.caixa(cel_moldura, m * 1.05, 0.24, 0.42 * R * math.pi / n * 1.9, (R * math.cos(a), -0.11, alt + R * math.sin(a) * 0.55 - 0.14),
                    rot=(0, -(a - math.pi / 2), 0))
        prisma_tri(o, 2, larg, R * 0.5, 0.08, (0, -0.04, alt - 0.02), topo=larg * 0.5)
    else:
        o.caixa(cel_moldura, larg + 2 * m + 0.1, 0.24, 0.24, (0, -0.11, alt), chanfro=0.02)
    o.caixa(cel_moldura, larg + 2 * m + 0.3, 0.55, 0.16, (0, -0.28, -0.0), chanfro=0.02)   # degrau
    o.marcar('portas', (0, -0.3, 0.0), larg=round(larg, 2), alt=round(alt, 2))


# ------------------------------------------------------------ telhados e topo
def telhado(o, larg=8.0, prof=5.0, alt=2.6, beiral=0.45, cel_telha=3, cel_empena=1, cel_madeira=2, empenas=True):
    """Duas águas com a cumeeira ao longo de X: fiadas de telhas (caixas finas que se sobrepõem),
    cumeeira, testeiras e as empenas nas pontas. z = 0 é o topo das paredes."""
    d = prof / 2 + beiral
    th = math.atan2(alt, prof / 2)
    L = d / math.cos(th)
    n = max(4, int(L / 0.36))
    passo = L / n
    W = larg + 2 * beiral * 0.8
    for s in (-1, 1):                    # -1: água da frente (-Y)
        for k in range(n):
            t = (k + 0.5) * passo
            y = s * (d - t * math.cos(th))
            z = -beiral * math.tan(th) + t * math.sin(th) + 0.05 + 0.012 * (k % 2)
            o.caixa(cel_telha, W, passo * 1.32, 0.06, (0, y, z - 0.03), rot=(s * th, 0, 0))
        o.caixa(cel_madeira, W + 0.04, 0.06, 0.2, (0, s * (d - 0.02), -beiral * math.tan(th) - 0.12))   # testeira
    o.cilindro(cel_telha, 0.13, W + 0.1, (-(W + 0.1) / 2, 0, alt + 0.06), lados=8, rot=(0, rad(90), 0))     # cumeeira
    if empenas:
        for s in (-1, 1):
            prisma_tri(o, cel_empena, prof, alt, 0.3, (s * (larg / 2 - 0.15), 0, 0), giro=rad(90))
            for k in range(2):
                o.caixa(cel_madeira, 0.12, 0.14, alt * (0.8 - 0.35 * k), (s * (larg / 2 + 0.02), (k - 0.5) * prof * 0.3, 0))


def chamine(o, alt=1.6, cel=0, pos=(0, 0, 0)):
    x, y, z = pos
    o.caixa(cel, 0.7, 0.7, alt, (x, y, z))
    o.caixa(cel, 0.84, 0.84, 0.14, (x, y, z + alt), chanfro=0.02)
    o.caixa(4, 0.5, 0.5, 0.1, (x, y, z + alt + 0.14))


def ameias(o, larg=8.0, prof=5.0, cel=0, alt=0.7):
    """Parapeito com ameias no topo plano (quartel)."""
    for s in (-1, 1):
        o.caixa(cel, larg + 0.3, 0.35, 0.4, (0, s * (prof / 2 - 0.02), 0))
        n = int(larg / 0.9)
        for k in range(n):
            x = -larg / 2 + (k + 0.5) * larg / n
            if k % 2 == 0:
                o.caixa(cel, larg / n * 0.95, 0.38, alt, (x, s * (prof / 2 - 0.02), 0.4), chanfro=0.02)
    for s in (-1, 1):
        o.caixa(cel, 0.35, prof, 0.4, (s * (larg / 2 + 0.0), 0, 0))
        n = int(prof / 0.9)
        for k in range(n):
            if k % 2 == 0:
                o.caixa(cel, 0.38, prof / n * 0.95, alt, (s * larg / 2, -prof / 2 + (k + 0.5) * prof / n, 0.4), chanfro=0.02)


# ------------------------------------------------------------ peças avulsas
def escada(o, larg=1.6, degraus=4, alt_d=0.17, prof_d=0.32, cel=0):
    """Degraus de pedra subindo para +Y, com as muretas dos lados."""
    for k in range(degraus):
        o.caixa(cel, larg, prof_d * (degraus - k), alt_d, (0, prof_d * (degraus - k) / 2 + prof_d * k - prof_d * degraus / 2 + prof_d * (degraus - k) / 2 - prof_d * (degraus - k) / 2, alt_d * k), chanfro=0.015)
    for s in (-1, 1):
        prisma_tri(o, cel, prof_d * degraus, alt_d * degraus + 0.25, 0.22, (s * (larg / 2 + 0.11), 0, 0), giro=rad(90), topo=prof_d)


def coluna(o, alt=3.0, r=0.22, cel=0):
    o.caixa(cel, r * 2.8, r * 2.8, 0.22, chanfro=0.03)
    o.cilindro(cel, r * 1.15, 0.12, (0, 0, 0.22), lados=12, r2=r)
    o.cilindro(cel, r, alt - 0.68, (0, 0, 0.34), lados=12, r2=r * 0.9)
    o.cilindro(cel, r * 0.9, 0.12, (0, 0, alt - 0.34), lados=12, r2=r * 1.2)
    o.caixa(cel, r * 2.7, r * 2.7, 0.22, (0, 0, alt - 0.22), chanfro=0.03)


def arco(o, larg=2.2, alt=2.6, esp=0.5, cel=0):
    """Arco de pedra: dois pés, aduelas em semicírculo e a pedra de fecho."""
    m = 0.42
    for s in (-1, 1):
        o.caixa(cel, m, esp, alt, (s * (larg / 2 + m / 2), 0, 0), chanfro=0.02)
        o.caixa(cel, m + 0.1, esp + 0.1, 0.18, (s * (larg / 2 + m / 2), 0, alt - 0.18), chanfro=0.02)
    n = 9
    R = larg / 2 + m / 2
    for k in range(n):
        a = math.pi * (k + 0.5) / n
        fecho = k == n // 2
        o.caixa(cel, m * (1.25 if fecho else 1.0), esp + (0.08 if fecho else 0), R * math.pi / n * 0.96, (R * math.cos(a), 0, alt + R * math.sin(a) - R * math.pi / n * 0.48),
                rot=(0, -(a - math.pi / 2), 0), chanfro=0.015)


def sacada(o, larg=2.4, prof=0.9, cel=2):
    """Sacada de madeira: piso, mãos-francesas por baixo e o guarda-corpo."""
    o.caixa(cel, larg, prof, 0.12, (0, -prof / 2, 0))
    for s in (-1, 1):
        L = math.hypot(prof * 0.8, 0.7)
        o.caixa(cel, 0.1, L, 0.1, (s * (larg / 2 - 0.2), -prof * 0.4, -0.38), rot=(math.atan2(0.7, prof * 0.8), 0, 0))
    for k in range(9):
        x = -larg / 2 + 0.06 + k * (larg - 0.12) / 8
        o.caixa(cel, 0.06, 0.06, 0.9, (x, -prof + 0.05, 0.12))
    for s in (-1, 1):
        for j in range(4):
            o.caixa(cel, 0.06, 0.06, 0.9, (s * (larg / 2 - 0.05), -prof + 0.05 + j * (prof - 0.1) / 3, 0.12))
    o.caixa(cel, larg + 0.06, 0.12, 0.08, (0, -prof + 0.05, 1.0))
    for s in (-1, 1):
        o.caixa(cel, 0.12, prof, 0.08, (s * (larg / 2 - 0.02), -prof / 2, 1.0))


def placa_pendurada(o, emblema='caneca', cel_madeira=2, cel_ferro=4, cor_emblema=3):
    """Placa de loja pendurada num braço de ferro que sai da parede (para -Y)."""
    o.caixa(cel_ferro, 0.06, 1.05, 0.06, (0, -0.52, 0))
    o.caixa(cel_ferro, 0.05, 0.5, 0.05, (0, -0.28, -0.32), rot=(rad(-38), 0, 0))
    for y in (-0.2, -0.85):
        o.caixa(cel_ferro, 0.02, 0.02, 0.2, (0, y, -0.2))
    o.caixa(cel_madeira, 0.08, 0.86, 0.6, (0, -0.52, -0.82), chanfro=0.02)
    if emblema == 'caneca':
        o.cilindro(cor_emblema, 0.13, 0.26, (0.05, -0.52, -0.66), lados=10, rot=(0, rad(90), 0))
    elif emblema == 'cama':
        o.caixa(cor_emblema, 0.05, 0.5, 0.12, (0.05, -0.52, -0.62))
        o.caixa(cor_emblema, 0.05, 0.14, 0.1, (0.05, -0.68, -0.52))
    elif emblema == 'escudo':
        o.caixa(cor_emblema, 0.05, 0.34, 0.36, (0.05, -0.52, -0.7))
    o.marcar('janelas', (0.0, -0.52, -0.55), larg=0.5, alt=0.4, placa=emblema)


def estandarte(o, alt=3.2, cel_pau=2, cel_tecido=3, cel_ferro=4, mastro=True, parede=False):
    """Estandarte: mastro (ou suporte de parede) e o pano com a barra de baixo recortada."""
    if mastro:
        o.cilindro(cel_ferro, 0.18, 0.12, lados=8, r2=0.14)
        o.cilindro(cel_pau, 0.05, alt, lados=8, r2=0.04)
        o.esfera(cel_ferro, 0.07, (0, 0, alt + 0.04), seg=8, aneis=5)
        top = alt - 0.15
    else:
        top = alt
    o.caixa(cel_pau, 0.9, 0.06, 0.06, (0, -0.06 if parede else 0, top - 0.06), rot=(0, 0, 0))
    o.caixa(cel_tecido, 0.8, 0.025, 1.3, (0, -0.06 if parede else 0.0, top - 1.42))
    for s in (-1, 1):
        prisma_tri(o, cel_tecido, 0.4, 0.28, 0.025, (s * 0.2, -0.06 if parede else 0.0, top - 1.42), giro=0, topo=0)
    o.caixa(cel_ferro, 0.12, 0.08, 0.12, (0, -0.06 if parede else 0, top - 0.8))


def lampiao(o, alt=3.0, cel_ferro=4, cel_vidro=5, cel_pedra=0, rua=True):
    """Lampião de ferro: base de pedra, poste, braço curvo e a lanterna com vidro aceso."""
    if rua:
        o.caixa(cel_pedra, 0.42, 0.42, 0.3, chanfro=0.03)
        o.cilindro(cel_ferro, 0.07, alt - 0.3, (0, 0, 0.3), lados=8, r2=0.05)
        o.anel(cel_ferro, 0.09, 0.03, (0, 0, 0.36), lados=10, seg=4)
        for k in range(4):
            a = TAU * k / 4
            o.caixa(cel_ferro, 0.03, 0.03, 0.4, (math.cos(a) * 0.08, math.sin(a) * 0.08, 0.3), rot=(math.sin(a) * rad(14), -math.cos(a) * rad(14), 0))
        o.caixa(cel_ferro, 0.05, 0.62, 0.05, (0, -0.28, alt - 0.08))
        o.caixa(cel_ferro, 0.04, 0.4, 0.04, (0, -0.14, alt - 0.3), rot=(rad(-45), 0, 0))
        cx, cy, cz = 0, -0.56, alt - 0.62
    else:
        o.caixa(cel_ferro, 0.05, 0.42, 0.05, (0, -0.2, 0))
        cx, cy, cz = 0, -0.42, -0.5
    o.caixa(cel_vidro, 0.2, 0.2, 0.34, (cx, cy, cz + 0.06))
    for sx in (-1, 1):
        for sy in (-1, 1):
            o.caixa(cel_ferro, 0.03, 0.03, 0.42, (cx + sx * 0.11, cy + sy * 0.11, cz + 0.02))
    o.caixa(cel_ferro, 0.28, 0.28, 0.04, (cx, cy, cz))
    o.cilindro(cel_ferro, 0.2, 0.18, (cx, cy, cz + 0.42), lados=4, r2=0.03, rot=(0, 0, rad(45)))
    o.cilindro(cel_ferro, 0.02, 0.14, (cx, cy, cz + 0.6), lados=6)
    o.marcar('janelas', (cx, cy, cz + 0.22), larg=0.2, alt=0.3, lampiao=True)


def ponte(o, comp=7.0, larg=2.4, alt=2.0, cel=0):
    """Ponte de pedra em arco (sobre um riacho): tabuleiro, aduelas do arco, parapeitos e
    cabeceiras. O comprimento vai em Y."""
    n = 12
    R = comp * 0.36
    for k in range(n):
        a = math.pi * (k + 0.5) / n
        y = -R * math.cos(a)
        z = alt * 0.15 + R * math.sin(a) * (alt * 0.75 / R)
        o.caixa(cel, larg, comp / n * 1.25, 0.42, (0, y * 1.25, z), rot=(-math.atan2(math.cos(a) * alt * 0.75, R * math.sin(a) + 1e-6) * 0.6, 0, 0), chanfro=0.02)
    for s in (-1, 1):
        o.caixa(cel, larg + 0.6, 1.2, alt * 0.7, (0, s * (comp / 2 - 0.4), 0), chanfro=0.03)
        for k in range(7):
            y = -comp / 2 + 0.5 + k * (comp - 1) / 6
            zt = alt * 0.15 + max(0.0, (1 - (y / (R * 1.25)) ** 2)) ** 0.5 * alt * 0.75 if abs(y) < R * 1.25 else alt * 0.7
            o.caixa(cel, 0.3, (comp - 1) / 6 * 0.98, 0.55, (s * (larg / 2 + 0.05), y, zt + 0.2), chanfro=0.02)


# ------------------------------------------------------------ mobília
def mesa(o, larg=1.8, prof=0.9, alt=0.78, cel=0, cel2=1):
    for k in range(5):
        o.caixa(cel, larg, prof / 5 - 0.008, 0.06, (0, -prof / 2 + prof / 5 * (k + 0.5), alt - 0.06), chanfro=0.006)
    for sx in (-1, 1):
        for sy in (-1, 1):
            o.caixa(cel2, 0.09, 0.09, alt - 0.06, (sx * (larg / 2 - 0.12), sy * (prof / 2 - 0.1), 0), chanfro=0.01)
    o.caixa(cel2, larg - 0.24, 0.06, 0.08, (0, 0, 0.16))
    for sx in (-1, 1):
        o.caixa(cel2, 0.06, prof - 0.2, 0.08, (sx * (larg / 2 - 0.12), 0, 0.16))


def banco(o, larg=1.6, cel=0, cel2=1):
    o.caixa(cel, larg, 0.32, 0.06, (0, 0, 0.42), chanfro=0.008)
    for sx in (-1, 1):
        o.caixa(cel2, 0.07, 0.3, 0.42, (sx * (larg / 2 - 0.14), 0, 0), chanfro=0.01)
        o.caixa(cel2, 0.06, 0.06, 0.4, (sx * (larg / 2 - 0.24), 0, 0.12), rot=(0, rad(sx * 35), 0))


def cadeira(o, cel=0, cel2=1):
    o.caixa(cel, 0.46, 0.44, 0.05, (0, 0, 0.44), chanfro=0.006)
    for sx in (-1, 1):
        for sy in (-1, 1):
            h = 1.0 if sy > 0 else 0.44
            o.caixa(cel2, 0.05, 0.05, h, (sx * 0.19, sy * 0.18, 0))
    for z in (0.62, 0.86):
        o.caixa(cel, 0.38, 0.04, 0.08, (0, 0.19, z))
    o.caixa(cel2, 0.38, 0.03, 0.04, (0, -0.18, 0.18))


def cama(o, cel_madeira=0, cel_tecido=2, cel_linho=3):
    o.caixa(cel_madeira, 1.0, 2.05, 0.3, (0, 0, 0.12), chanfro=0.01)
    o.caixa(cel_madeira, 1.08, 0.08, 1.0, (0, 1.04, 0), chanfro=0.01)
    o.caixa(cel_madeira, 1.08, 0.08, 0.62, (0, -1.04, 0), chanfro=0.01)
    o.caixa(cel_linho, 0.94, 1.98, 0.16, (0, 0, 0.42), chanfro=0.05)
    o.caixa(cel_tecido, 0.98, 1.3, 0.08, (0, -0.33, 0.52), chanfro=0.03)
    o.caixa(cel_tecido, 0.06, 1.3, 0.3, (0.49, -0.33, 0.28))
    o.caixa(cel_linho, 0.62, 0.34, 0.14, (0, 0.78, 0.56), chanfro=0.06)


def barril(o, r=0.36, alt=0.95, cel=0, cel_ferro=1, deitado=False):
    rot = (rad(90), 0, 0) if deitado else (0, 0, 0)
    base = (0, alt / 2, r) if deitado else (0, 0, 0)
    n = 4
    for k in range(n):
        z0 = alt * k / n
        z1 = alt * (k + 1) / n
        rr0 = r * (0.86 + 0.14 * math.sin(math.pi * k / n))
        rr1 = r * (0.86 + 0.14 * math.sin(math.pi * (k + 1) / n))
        if deitado:
            o.cilindro(cel, rr0, z1 - z0, (0, alt / 2 - z0, r), lados=14, r2=rr1, rot=(rad(90), 0, 0))
        else:
            o.cilindro(cel, rr0, z1 - z0, (0, 0, z0), lados=14, r2=rr1)
    for t in (0.12, 0.4, 0.6, 0.88):
        rr = r * (0.86 + 0.14 * math.sin(math.pi * t)) + 0.012
        if deitado:
            o.anel(cel_ferro, rr, 0.022, (0, alt / 2 - alt * t, r), lados=16, seg=4, rot=(rad(90), 0, 0))
        else:
            o.anel(cel_ferro, rr, 0.022, (0, 0, alt * t), lados=16, seg=4)
    _ = (rot, base)


def balcao(o, larg=3.4, prof=0.7, alt=1.1, cel=0, cel2=1, cel_ferro=2):
    """Balcão da taverna: frente de tábuas com almofadas, tampo grosso e o apoio de pé de ferro."""
    o.caixa(cel2, larg, prof, alt - 0.08, (0, 0, 0))
    o.caixa(cel, larg + 0.12, prof + 0.16, 0.08, (0, 0.04, alt - 0.08), chanfro=0.015)
    n = int(larg / 0.55)
    for k in range(n):
        x = -larg / 2 + (k + 0.5) * larg / n
        o.caixa(cel, larg / n - 0.1, 0.04, alt - 0.4, (x, -prof / 2 - 0.02, 0.2), chanfro=0.01)
    o.cilindro(cel_ferro, 0.025, larg - 0.2, (-(larg - 0.2) / 2, -prof / 2 - 0.16, 0.22), lados=6, rot=(0, rad(90), 0))
    for x in (-larg / 2 + 0.2, 0, larg / 2 - 0.2):
        o.caixa(cel_ferro, 0.03, 0.16, 0.03, (x, -prof / 2 - 0.08, 0.21))
    for k, x in enumerate((-1.0, -0.2, 0.7)):
        o.cilindro(cel_ferro, 0.05, 0.16, (x, 0.05, alt), lados=8, r2=0.06)        # canecas


def estante(o, larg=1.6, alt=2.0, prof=0.4, cel=0, cel_livros=1, cel_livros2=2):
    o.caixa(cel, larg, 0.04, alt, (0, prof / 2 - 0.02, 0))
    for s in (-1, 1):
        o.caixa(cel, 0.05, prof, alt, (s * (larg / 2 - 0.025), 0, 0))
    rng = random.Random(5)
    for k in range(5):
        z = 0.06 + k * (alt - 0.1) / 4.6
        o.caixa(cel, larg, prof, 0.04, (0, 0, z))
        if k < 4:
            x = -larg / 2 + 0.08
            while x < larg / 2 - 0.15:
                w = rng.uniform(0.04, 0.09)
                h = rng.uniform(0.22, 0.34)
                if rng.random() < 0.88:
                    o.caixa(cel_livros if rng.random() < 0.5 else cel_livros2, w, prof * 0.8, h, (x + w / 2, -0.02, z + 0.04), rot=(0, rad(rng.uniform(-6, 6)), 0))
                x += w + 0.008


def lareira(o, larg=2.0, alt=2.6, cel=0, cel_fogo=1, cel_ferro=2, cel_madeira=3):
    """Lareira de pedra (encosta na parede, frente para -Y), com fogo aceso e a lenha."""
    o.caixa(cel, larg, 0.7, 1.15, (0, 0.0, 0), chanfro=0.03)
    o.caixa(cel, larg * 0.6, 0.06, 0.8, (0, -0.33, 0.12))       # a boca (escura) vai pintada pela oclusão
    o.caixa(cel, larg + 0.3, 0.86, 0.14, (0, -0.06, 1.15), chanfro=0.02)
    prisma_tri(o, cel, larg, 0.6, 0.6, (0, 0.04, 1.29), topo=larg * 0.5)
    o.caixa(cel, larg * 0.5, 0.5, alt - 1.89, (0, 0.08, 1.89))
    o.caixa(cel, larg + 0.5, 0.9, 0.12, (0, -0.5, 0), chanfro=0.02)   # soleira
    for k in range(3):
        o.cilindro(cel_madeira, 0.07, 0.62, (-0.31, -0.18 + k * 0.03, 0.2 + k * 0.06), lados=6, rot=(0, rad(90), rad(15 * (k - 1))))
    o.esfera(cel_fogo, 0.26, (0, -0.2, 0.42), seg=8, aneis=5, esc=(1.2, 0.6, 1.2))
    o.cilindro(cel_fogo, 0.2, 0.42, (0, -0.2, 0.45), lados=6, r2=0.02)
    o.caixa(cel_ferro, 0.03, 0.4, 0.03, (larg * 0.3, -0.4, 0.15))
    o.marcar('janelas', (0, -0.3, 0.5), larg=0.6, alt=0.5, fogo=True)


def caixote(o, l=0.7, cel=0, cel2=1):
    o.caixa(cel, l, l, l, (0, 0, 0))
    for s in (-1, 1):
        o.caixa(cel2, l + 0.02, 0.04, 0.08, (0, s * l / 2, 0.06))
        o.caixa(cel2, l + 0.02, 0.04, 0.08, (0, s * l / 2, l - 0.14))
        o.caixa(cel2, 0.04, l + 0.02, 0.08, (s * l / 2, 0, l * 0.45))
    o.caixa(cel2, l * 1.3, 0.04, 0.08, (0, -l / 2 - 0.01, l / 2 - 0.04), rot=(0, rad(45), 0))


def boneco_treino(o, cel_madeira=0, cel_palha=1, cel_tecido=2):
    """Boneco de treino: estaca, corpo de palha amarrado, braços de madeira e cabeça de saco."""
    o.caixa(cel_madeira, 0.5, 0.5, 0.12, chanfro=0.02)
    o.cilindro(cel_madeira, 0.07, 1.9, (0, 0, 0.1), lados=8)
    o.cilindro(cel_palha, 0.26, 0.8, (0, 0, 0.75), lados=10, r2=0.22)
    for z in (0.85, 1.25):
        o.anel(cel_tecido, 0.25, 0.025, (0, 0, z), lados=12, seg=4)
    o.caixa(cel_madeira, 1.25, 0.08, 0.08, (0, 0, 1.38))
    o.esfera(cel_tecido, 0.2, (0, 0, 1.78), seg=10, aneis=6, esc=(1, 0.9, 1.1))
    o.caixa(cel_tecido, 0.36, 0.38, 0.05, (0, 0, 1.36))


def armeiro(o, cel_madeira=0, cel_ferro=1, cel_couro=2):
    """Suporte de armas: lanças e espadas encostadas, um escudo pendurado."""
    for x in (-0.8, 0.8):
        o.caixa(cel_madeira, 0.1, 0.4, 1.6, (x, 0, 0))
        o.caixa(cel_madeira, 0.12, 0.6, 0.08, (x, 0, 0))
    for z in (0.5, 1.4):
        o.caixa(cel_madeira, 1.7, 0.08, 0.08, (0, 0.05, z))
    for k in range(4):
        x = -0.55 + k * 0.36
        o.cilindro(cel_madeira, 0.025, 2.1, (x, -0.02, 0.0), lados=6, rot=(rad(-6), 0, 0))
        o.cilindro(cel_ferro, 0.04, 0.24, (x, -0.13, 2.08), lados=4, r2=0.0, rot=(rad(-6), 0, 0))
    for k in range(2):
        x = -0.35 + k * 0.7
        o.caixa(cel_ferro, 0.06, 0.02, 0.9, (x + 0.18, -0.12, 0.35))
        o.caixa(cel_couro, 0.22, 0.05, 0.05, (x + 0.18, -0.12, 1.25))
        o.cilindro(cel_couro, 0.025, 0.2, (x + 0.18, -0.12, 1.3), lados=6)
    o.cilindro(cel_ferro, 0.32, 0.06, (0.0, 0.15, 1.0), lados=12, rot=(rad(90), 0, 0))


# ------------------------------------------------------------ prédios
# Cada prédio: largura L (X), profundidade P (Y), frente em -Y. Células: 0 pedra, 1 reboco,
# 2 madeira, 3 telhado, 4 ferro, 5 vidro aceso.
def _casco(o, L, P, terreo, andares, h_t=3.2, h_a=2.7, vaos_frente=None, vaos_lado=None, cel_pedra=0, porta_frente=True,
           janelas_terreo=None, porta_larg=1.25, dupla=False):
    """Térreo de pedra (com porta e janelas) e andares de enxaimel nas quatro faces."""
    z = 0.0
    # térreo de pedra
    o.modulo(parede_pedra, (0, -P / 2, 0), 0, larg=L, alt=h_t, esp=P, cel=cel_pedra)
    for s in (-1, 1):
        o.caixa(cel_pedra, 0.5, 0.5, h_t + 0.1, (s * (L / 2 - 0.2), -P / 2 + 0.2, 0), chanfro=0.03)      # cunhais
    if porta_frente:
        o.modulo(porta, (0, -P / 2 - 0.0, 0.0), 0, larg=porta_larg, alt=2.3, dupla=dupla)
    for x in (janelas_terreo if janelas_terreo is not None else [-L * 0.3, L * 0.3]):
        o.modulo(janela, (x, -P / 2, 1.0), 0, larg=1.0, alt=1.25, venezianas=False, arco=True)
    for s in (-1, 1):                                    # uma janela em cada lado do térreo
        o.modulo(janela, (s * L / 2, 0.0, 1.0), s * rad(90), larg=0.8, alt=1.1, venezianas=False)
    z = h_t
    for k in range(andares):
        vf = (vaos_frente or [['x', 'j', 'j', 'x']])[min(k, len(vaos_frente or [0]) - 1)] if vaos_frente else ['x', 'j', 'j', 'x']
        vl = vaos_lado or ['/', 'j', '\\']
        o.modulo(parede_enxaimel, (0, -P / 2 - 0.12 * (k + 1), z), 0, larg=L + 0.24 * (k + 1), alt=h_a, esp=P + 0.24 * (k + 1), vaos=vf)
        for s in (-1, 1):
            o.modulo(parede_enxaimel, (s * (L / 2 + 0.12 * (k + 1)), 0, z), s * rad(90), larg=P + 0.24 * (k + 1) - 0.02, alt=h_a, esp=0.04, vaos=vl, sem_reboco=True)
        o.modulo(parede_enxaimel, (0, P / 2 + 0.12 * (k + 1), z), rad(180), larg=L + 0.24 * (k + 1) - 0.02, alt=h_a, esp=0.04, vaos=['x', '-', 'x'], sem_reboco=True)
        z += h_a
    return z, L + 0.24 * andares, P + 0.24 * andares


def taverna(rng):
    """Taverna do Javali Dourado: térreo de pedra com porta dupla e janelões, dois andares de
    enxaimel, sacada sobre a porta, telhado de telhas, duas chaminés, placa da caneca, barris e
    lampiões na porta (10,5 × 5 m)."""
    o = Montagem('taverna', 'predio')
    L, P = 10.0, 4.6
    z, Lt, Pt = _casco(o, L, P, True, 2, vaos_frente=[['x', 'j', '-', 'j', 'x'], ['j', 'x', 'j', 'x', 'j']], vaos_lado=['/', 'j', '\\'],
                       janelas_terreo=[-3.3, -1.7, 1.7, 3.3], porta_larg=1.5, dupla=True)
    o.modulo(sacada, (0, -Pt / 2 + 0.12, 3.2 + 0.05), 0, larg=2.6, prof=0.85)
    o.modulo(telhado, (0, 0, z), 0, larg=Lt, prof=Pt, alt=2.9, beiral=0.5)
    chamine(o, 2.6, 0, (-L * 0.32, 0.6, z + 0.9))
    chamine(o, 2.2, 0, (L * 0.36, -0.4, z + 0.9))
    o.modulo(placa_pendurada, (2.6, -P / 2, 3.0), 0, emblema='caneca', cor_emblema=4)
    for x in (-1.4, 1.4):
        o.modulo(lampiao, (x, -P / 2, 2.55), 0, rua=False)
    for k, (x, y) in enumerate(((-4.4, -P / 2 - 0.55), (-3.7, -P / 2 - 0.5))):
        o.modulo(barril, (x, y, 0), 0, r=0.34, alt=0.9, cel=2, cel_ferro=4)
    o.modulo(caixote, (4.3, -P / 2 - 0.45, 0), rad(12), l=0.62, cel=2, cel2=4)
    o.finalizar([PEDRA, REBOCO, MADEIRA, TELHA, FERRO, VIDRO], angulo=(60, 0, 30), lado=1024, bisel=0.02, pasta=PASTA)


def hospedaria(rng):
    """Hospedaria da Chama: três andares (pedra e enxaimel em balanço), água-furtada no telhado de
    ardósia, sacada corrida no 2º andar, placa da cama e lampião (9 × 5 m)."""
    o = Montagem('hospedaria', 'predio')
    L, P = 9.0, 4.4
    z, Lt, Pt = _casco(o, L, P, True, 3, vaos_frente=[['j', 'x', 'j', 'x', 'j'], ['j', 'j', 'x', 'j', 'j'], ['x', 'j', 'x', 'j', 'x']],
                       vaos_lado=['j', 'x', 'j'], janelas_terreo=[-2.9, 2.9], porta_larg=1.3)
    o.modulo(sacada, (0, -P / 2 - 0.36, 3.2 + 2.7), 0, larg=7.0, prof=0.8)
    o.modulo(telhado, (0, 0, z), 0, larg=Lt, prof=Pt, alt=3.0, beiral=0.5, cel_telha=3)
    # água-furtada (janela no telhado)
    o.modulo(parede_enxaimel, (0, -Pt / 4, z + 0.3), 0, larg=1.6, alt=1.4, esp=1.4, vaos=['j'])
    o.modulo(telhado, (0, -Pt / 4 + 0.6, z + 1.7), rad(90), larg=1.6, prof=1.8, alt=0.7, beiral=0.2, empenas=False)
    chamine(o, 2.4, 0, (L * 0.3, 0.8, z + 1.0))
    o.modulo(placa_pendurada, (-2.0, -P / 2, 3.0), 0, emblema='cama', cor_emblema=1)
    o.modulo(lampiao, (1.3, -P / 2, 2.55), 0, rua=False)
    o.finalizar([PEDRA_CLARA, REBOCO, MADEIRA, ARDOSIA, FERRO, VIDRO], angulo=(60, 0, 30), lado=1024, bisel=0.02, pasta=PASTA)


def conselho(rng):
    """Conselho da Aurora: prédio público todo de pedra clara, pórtico de colunas com arco, escadaria,
    janelões em arco, torre do sino com telhado em pirâmide, estandartes (11 × 5,2 m)."""
    o = Montagem('conselho', 'predio')
    L, P, H = 10.4, 4.4, 6.2
    o.modulo(parede_pedra, (0, -P / 2, 0), 0, larg=L, alt=H, esp=P, cel=0)
    o.caixa(0, L + 0.3, P + 0.3, 0.5, (0, 0, 0), chanfro=0.04)                 # embasamento
    for s in (-1, 1):
        o.caixa(0, 0.6, 0.6, H + 0.2, (s * (L / 2 - 0.25), -P / 2 + 0.25, 0), chanfro=0.03)
    o.caixa(0, L + 0.4, P + 0.4, 0.3, (0, 0, 3.15), chanfro=0.03)              # friso entre os andares
    # pórtico: escadaria, duas colunas e o arco da entrada
    o.modulo(escada, (0, -P / 2 - 0.62, 0), rad(180), larg=3.2, degraus=3, alt_d=0.17, prof_d=0.38)
    for x in (-1.45, 1.45):
        o.modulo(coluna, (x, -P / 2 - 0.55, 0.5), 0, alt=3.0, r=0.2)
    o.caixa(0, 3.6, 0.95, 0.42, (0, -P / 2 - 0.42, 3.5), chanfro=0.03)
    prisma_tri(o, 0, 3.8, 0.9, 0.95, (0, -P / 2 - 0.42, 3.92))
    o.modulo(porta, (0, -P / 2, 0.5), 0, larg=1.6, alt=2.5, dupla=True, cel_moldura=0)
    for x in (-3.7, -2.5, 2.5, 3.7):
        o.modulo(janela, (x, -P / 2, 1.25), 0, larg=0.8, alt=1.6, venezianas=False, arco=True)
    for x in (-3.7, -2.5, -0.0, 2.5, 3.7):
        o.modulo(janela, (x, -P / 2, 4.0), 0, larg=0.8, alt=1.4, venezianas=False, arco=True)
    for s in (-1, 1):
        for y in (-1.0, 1.0):
            o.modulo(janela, (s * L / 2, y, 4.0), s * rad(90), larg=0.75, alt=1.3, venezianas=False, arco=True)
    o.modulo(telhado, (0, 0, H), 0, larg=L, prof=P, alt=2.2, beiral=0.4, cel_empena=0)
    # torre do sino
    tx, ty = L * 0.28, 0.2
    o.caixa(0, 1.8, 1.8, 3.6, (tx, ty, H + 0.8))
    for s in (-1, 1):
        o.caixa(0, 2.0, 0.25, 0.25, (tx, ty + s * 0.95, H + 4.4))
        o.caixa(0, 0.25, 2.0, 0.25, (tx + s * 0.95, ty, H + 4.4))
    o.cilindro(4, 0.32, 0.5, (tx, ty, H + 3.5), lados=10, r2=0.12)
    for sx in (-1, 1):
        for sy in (-1, 1):
            o.caixa(0, 0.3, 0.3, 1.2, (tx + sx * 0.78, ty + sy * 0.78, H + 4.4))
    o.cilindro(3, 1.55, 1.8, (tx, ty, H + 5.6), lados=4, r2=0.04, rot=(0, 0, rad(45)))
    o.cilindro(4, 0.04, 0.8, (tx, ty, H + 7.3), lados=6)
    for x in (-2.3, 2.3):
        o.modulo(estandarte, (x, -P / 2, 5.4), 0, alt=0.0, mastro=False, parede=True, cel_tecido=5 if False else 1)
    o.finalizar([PEDRA_CLARA, TECIDO_AZUL, MADEIRA, ARDOSIA, LATAO, VIDRO], angulo=(60, 0, 30), lado=1024, bisel=0.02, pasta=PASTA)


def quartel(rng):
    """Quartel da Guarda: pedra escura, sem telhado à vista (terraço com ameias), torre de canto,
    seteiras, portão de madeira reforçado, estandartes vermelhos e suporte de armas (10 × 5 m)."""
    o = Montagem('quartel', 'predio')
    L, P, H = 9.6, 4.6, 6.4
    o.modulo(parede_pedra, (0, -P / 2, 0), 0, larg=L, alt=H, esp=P, cel=0, cornija=False)
    o.caixa(0, L + 0.5, P + 0.5, 0.6, (0, 0, 0), chanfro=0.05)                 # talude
    o.caixa(0, L + 0.3, P + 0.3, 0.3, (0, 0, H - 0.3), chanfro=0.03)
    o.modulo(ameias, (0, 0, H), 0, larg=L + 0.2, prof=P + 0.2, cel=0, alt=0.75)
    # torre de canto
    tx, ty = -L / 2 + 0.6, P / 2 - 1.0
    o.cilindro(0, 1.45, H + 2.4, (tx, ty, 0), lados=12, r2=1.35)
    o.cilindro(0, 1.6, 0.35, (tx, ty, H + 2.4), lados=12)
    for k in range(6):
        a = TAU * k / 6
        o.caixa(0, 0.6, 0.45, 0.7, (tx + math.cos(a) * 1.45, ty + math.sin(a) * 1.45, H + 2.75), rot=(0, 0, a + rad(90)), chanfro=0.02)
    for z in (2.2, 4.6, 7.0):                                                    # seteiras da torre
        o.caixa(5, 0.12, 0.08, 0.7, (tx, ty - 1.42, z))
    o.modulo(porta, (0.8, -P / 2, 0.0), 0, larg=1.9, alt=2.7, dupla=True, arco=True)
    for x in (-2.6, 3.4):
        for z in (1.4, 3.9):
            o.caixa(5, 0.14, 0.06, 0.95, (x, -P / 2 - 0.02, z))                # seteiras
            o.caixa(0, 0.5, 0.14, 1.25, (x, -P / 2 - 0.06, z - 0.15), chanfro=0.02)
            o.marcar('janelas', (x, -P / 2 - 0.06, z + 0.45), larg=0.14, alt=0.95)
    for x in (-0.9, 2.5):
        o.modulo(estandarte, (x, -P / 2, 5.8), 0, alt=0.0, mastro=False, parede=True, cel_tecido=1)
    o.modulo(lampiao, (-0.8, -P / 2, 3.0), 0, rua=False)
    o.modulo(placa_pendurada, (3.0, -P / 2, 3.4), 0, emblema='escudo', cor_emblema=1)
    o.finalizar([PEDRA, TECIDO_RUBRO, MADEIRA, PEDRA_LISA, FERRO, VIDRO], angulo=(60, 0, 30), lado=1024, bisel=0.02, pasta=PASTA)


def _casa(nome, rng, L, P, andares, vaos, telha, pedra, sacada_=False, chamine_x=None, jettied=True):
    o = Montagem(nome, 'predio')
    z, Lt, Pt = _casco(o, L, P, True, andares, vaos_frente=vaos, vaos_lado=['/', 'j', '\\'] if P > 4 else ['x', 'j'],
                       janelas_terreo=[-L * 0.3, L * 0.3], porta_larg=1.1)
    if sacada_:
        o.modulo(sacada, (L * 0.22, -Pt / 2 + 0.12, 3.2 + 0.05), 0, larg=2.0, prof=0.75)
    o.modulo(telhado, (0, 0, z), 0, larg=Lt, prof=Pt, alt=2.4 + 0.15 * L / 7, beiral=0.45)
    if chamine_x is not None:
        chamine(o, 2.0, 0, (chamine_x, 0.5, z + 0.7))
    o.modulo(barril, (L / 2 - 0.5, -P / 2 - 0.5, 0), 0, r=0.3, alt=0.8, cel=2, cel_ferro=4)
    o.finalizar([pedra, REBOCO, MADEIRA, telha, FERRO, VIDRO], angulo=(60, 0, 30), lado=1024, bisel=0.02, pasta=PASTA)


def casa_a(rng):
    """Casa de um andar de enxaimel, telhado de telhas, chaminé lateral (7 × 4,4 m)."""
    _casa('casa_a', rng, 7.0, 4.2, 1, [['x', 'j', 'x', 'j']], TELHA, PEDRA, chamine_x=-2.2)


def casa_b(rng):
    """Casa de dois andares com sacada, telhado de ardósia (7,4 × 4,6 m)."""
    _casa('casa_b', rng, 7.4, 4.3, 2, [['j', 'x', 'j'], ['x', 'j', 'j', 'x']], ARDOSIA, PEDRA_CLARA, sacada_=True, chamine_x=2.4)


def casa_c(rng):
    """Casa estreita e alta, dois andares em balanço, telhado de telhas (6,4 × 4,4 m)."""
    _casa('casa_c', rng, 6.4, 4.2, 2, [['j', '/', 'j'], ['\\', 'j', '/']], TELHA, PEDRA, chamine_x=1.9)


# ------------------------------------------------------------ peças avulsas (o kit e a mobília)
def _peca(nome, fn, celulas, tipo='movel', pasta=PASTA, angulo=(60, 0, 30), **kw):
    o = Montagem(nome, tipo)
    fn(o, **kw)
    o.finalizar(celulas, angulo=angulo, lado=512, bisel=0.012, pasta=pasta)


MOVEIS = {
    'mesa': lambda r: _peca('mesa', mesa, [MADEIRA_CLARA, MADEIRA]),
    'banco': lambda r: _peca('banco', banco, [MADEIRA_CLARA, MADEIRA]),
    'cadeira': lambda r: _peca('cadeira', cadeira, [MADEIRA_CLARA, MADEIRA]),
    'cama': lambda r: _peca('cama', cama, [MADEIRA, MADEIRA, TECIDO_RUBRO, LINHO]),
    'barril': lambda r: _peca('barril', barril, [MADEIRA_CLARA, FERRO]),
    'balcao': lambda r: _peca('balcao', balcao, [MADEIRA_CLARA, MADEIRA, LATAO]),
    'estante': lambda r: _peca('estante', estante, [MADEIRA, LIVROS, TECIDO_AZUL]),
    'lareira': lambda r: _peca('lareira', lareira, [PEDRA, FOGO, FERRO, MADEIRA]),
    'caixote': lambda r: _peca('caixote', caixote, [MADEIRA_CLARA, MADEIRA]),
    'boneco_treino': lambda r: _peca('boneco_treino', boneco_treino, [MADEIRA, PALHA, LINHO]),
    'armeiro': lambda r: _peca('armeiro', armeiro, [MADEIRA, FERRO, LIVROS]),
    'lampiao_rua': lambda r: _peca('lampiao_rua', lampiao, [PEDRA, MADEIRA, MADEIRA, MADEIRA, FERRO, VIDRO], rua=True),
    'estandarte_rubro': lambda r: _peca('estandarte_rubro', estandarte, [PEDRA, MADEIRA, MADEIRA, TECIDO_RUBRO, FERRO], alt=3.2),
}
MODULOS = {   # o kit (assets/models/arquitetura/modulos/): para montar outros prédios
    'parede_pedra': lambda r: _peca('parede_pedra', parede_pedra, [PEDRA], 'modulo', PASTA + '/modulos', larg=3.0, alt=3.0, esp=0.5),
    'parede_enxaimel': lambda r: _peca('parede_enxaimel', parede_enxaimel, [PEDRA, REBOCO, MADEIRA, TELHA, FERRO, VIDRO], 'modulo', PASTA + '/modulos', larg=3.6, alt=2.8, vaos=['x', 'j', '/']),
    'porta': lambda r: _peca('porta', porta, [PEDRA, REBOCO, MADEIRA, TELHA, FERRO, VIDRO], 'modulo', PASTA + '/modulos'),
    'janela': lambda r: _peca('janela', janela, [PEDRA, REBOCO, MADEIRA, TELHA, FERRO, VIDRO], 'modulo', PASTA + '/modulos'),
    'telhado': lambda r: _peca('telhado', telhado, [PEDRA, REBOCO, MADEIRA, TELHA], 'modulo', PASTA + '/modulos', larg=4.0, prof=4.0, alt=2.2),
    'escada': lambda r: _peca('escada', escada, [PEDRA], 'modulo', PASTA + '/modulos'),
    'coluna': lambda r: _peca('coluna', coluna, [PEDRA_CLARA], 'modulo', PASTA + '/modulos'),
    'arco': lambda r: _peca('arco', arco, [PEDRA_CLARA], 'modulo', PASTA + '/modulos'),
    'sacada': lambda r: _peca('sacada', sacada, [PEDRA, REBOCO, MADEIRA], 'modulo', PASTA + '/modulos'),
    'ponte': lambda r: _peca('ponte', ponte, [PEDRA], 'modulo', PASTA + '/modulos'),
    'chamine': lambda r: _peca('chamine', lambda o: chamine(o, 1.6, 0, (0, 0, 0)), [PEDRA, REBOCO, MADEIRA, TELHA, FERRO], 'modulo', PASTA + '/modulos'),
    'ameias': lambda r: _peca('ameias', ameias, [PEDRA], 'modulo', PASTA + '/modulos', larg=4.0, prof=3.0),
}
PREDIOS = dict(taverna=taverna, hospedaria=hospedaria, conselho=conselho, quartel=quartel, casa_a=casa_a, casa_b=casa_b, casa_c=casa_c)
PECAS = dict(MOVEIS, **MODULOS, **PREDIOS)


def gerar(nome, semente=11):
    U.limpar_cena()
    return PECAS[nome](random.Random(semente + sum(map(ord, nome))))


if __name__ == '__main__':
    for n in ([a for a in U.args() if a in PECAS] or list(PECAS)):
        gerar(n)
