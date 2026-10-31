"""Armaduras dos níveis 50, 75 e 100 (cinco classes, oito peças cada) feitas no Blender.

Cada conjunto é um script tools/blender/asset_armadura_<classe>_n<nível>.py que chama gerar() daqui.
As imagens de referência (assets/Criar_Personagem/Armaduras_Level_<nível>/<classe>/) dão o nome
de cada peça e as cores (tools/blender/armaduras_paletas.json, de paletas_armaduras.py); a forma
de cada peça segue o que as imagens mostram por classe (placas e espinhos do Guerreiro, couro e
lascas de cristal do Assassino, túnica com frisos dourados e cristais do Mago, couro, pelo e folhas
do Patrulheiro, placas prateadas e cristais de energia do Guardião Arcano), e o nível acrescenta
camadas: mais espinhos e cristais, mais brilho, runas acesas no 100.

O "alfaiate": cada peça é montada sobre o corpo do jogo medido em anéis (moldes_corpo.json, de
medir_corpos.py) — tubos do tronco, braços, mãos, pernas e pés e a casca da cabeça — com a folga
da peça. A peça é montada duas vezes, no corpo masculino e no feminino, com a mesma malha (os mesmos
anéis, os mesmos sorteios): a forma do feminino vai numa shape key ('corpo_f') do mesmo GLB. Depois
os materiais procedurais (utils.material_procedural) são assados em texturas (utils.assar), e sai
<Nome_da_Peça>_nivel<nível>.glb ao lado da imagem, com a prévia em assets/models/previews/armaduras/.
O conversor (tools/importar_criacao.py) leva o GLB para o jogo com os pesos do corpo.

Eixos (Blender): frente do personagem para −Y, lado direito dele para −X, Z para cima, metros.
"""
import json
import math
import os
import random

import bpy
from mathutils import Vector

import utils as U

AQUI = os.path.dirname(os.path.abspath(__file__))
MOLDES = os.path.join(AQUI, 'moldes_corpo.json')
PALETAS = os.path.join(AQUI, 'armaduras_paletas.json')
PREVIAS = os.path.join(U.MODELOS, 'previews', 'armaduras')
NIVEL_L = {50: 0, 75: 1, 100: 2}
TAU = 2 * math.pi
NA = 32
# materiais de cada peça (índices das faces)
PRI, ESC, ACA, BRI, PELO, FOLHA, RUNA = range(7)
TRI_MAX = {'peitoral': 8000, 'calcas': 6000, 'botas': 6000, 'luvas': 5000, 'capacete': 6000, 'capa': 6000, 'acessorio': 2500, 'ombros': 5000}


# ============================================================ molde (o corpo medido)
class Molde:
    def __init__(self, d):
        self.d = d
        self.T = {}
        for k in ('tronco', 'bracoR', 'bracoL', 'maoR', 'maoL', 'pernaR', 'pernaL', 'peR', 'peL'):
            self.T[k] = [dict(c=Vector(a['c']), t=Vector(a['t']), u=Vector(a['u']), v=Vector(a['v']), r=a['r']) for a in d[k]]
        self.J = {k: Vector(v) for k, v in d['juntas'].items()}
        self.B = {k: (Vector(a), Vector(b)) for k, (a, b) in d['ossos'].items()}
        self.H = d['cabeca']
        self.alt = d['altura']

    def n(self, tb):
        return len(self.T[tb])

    def anel(self, tb, i):
        """Anel i (fracionário; fora do tubo, continua reto pelo eixo)."""
        A = self.T[tb]
        n = len(A)
        if i <= 0 or i >= n - 1:
            k = 0 if i <= 0 else n - 1
            a = A[k]
            passo = (A[1]['c'] - A[0]['c']).length if k == 0 else (A[-1]['c'] - A[-2]['c']).length
            ext = i if i <= 0 else i - (n - 1)
            return dict(c=a['c'] + a['t'] * passo * ext, t=a['t'], u=a['u'], v=a['v'], r=a['r'])
        k = int(i)
        f = i - k
        a, b = A[k], A[k + 1]
        r = [x + (y - x) * f for x, y in zip(a['r'], b['r'])]
        return dict(c=a['c'].lerp(b['c'], f), t=a['t'].lerp(b['t'], f).normalized(), u=a['u'].lerp(b['u'], f).normalized(), v=a['v'].lerp(b['v'], f).normalized(), r=r)

    @staticmethod
    def raio(r, a):
        f = (a % TAU) / TAU * NA
        k = int(f) % NA
        g = f - int(f)
        return r[k] * (1 - g) + r[(k + 1) % NA] * g

    def p(self, tb, i, a, off=0.0, esc=1.0):
        """Ponto da superfície do tubo no anel i e ângulo a (0 = u), a off metros por fora."""
        A = self.anel(tb, i)
        d = A['u'] * math.cos(a) + A['v'] * math.sin(a)
        return A['c'] + d * (self.raio(A['r'], a) * esc + off)

    def normal(self, tb, i, a):
        A = self.anel(tb, i)
        return (A['u'] * math.cos(a) + A['v'] * math.sin(a)).normalized()

    def ang(self, tb, i, direcao):
        """Ângulo, no anel i, da direção dada (projetada no plano do anel)."""
        A = self.anel(tb, i)
        return math.atan2(direcao.dot(A['v']), direcao.dot(A['u']))

    def indice(self, tb, ponto):
        """Anel (fracionário) mais perto de um ponto."""
        A = self.T[tb]
        melhor, im = 1e9, 0
        for k, a in enumerate(A):
            d = (a['c'] - ponto).length
            if d < melhor:
                melhor, im = d, k
        return im

    def indice_z(self, tb, z):
        A = self.T[tb]
        for k in range(len(A) - 1):
            z0, z1 = A[k]['c'].z, A[k + 1]['c'].z
            if (z0 - z) * (z1 - z) <= 0:
                return k + (z - z0) / ((z1 - z0) or 1e-9)
        return 0 if abs(A[0]['c'].z - z) < abs(A[-1]['c'].z - z) else len(A) - 1

    def cabeca(self, la, lo, off=0.0):
        """Ponto da casca da cabeça na latitude/longitude (graus; lon 0 = frente, +90 = direita)."""
        H = self.H
        LAT, LON, R = H['lat'], H['lon'], H['r']
        fi = min(max((la - LAT[0]) / (LAT[1] - LAT[0]), 0), len(LAT) - 1.001)
        fj = ((lo - LON[0]) / (LON[1] - LON[0])) % len(LON)
        i0, j0 = int(fi), int(fj)
        gi, gj = fi - i0, fj - j0
        i1, j1 = min(i0 + 1, len(LAT) - 1), (j0 + 1) % len(LON)
        r = (R[i0][j0] * (1 - gj) + R[i0][j1] * gj) * (1 - gi) + (R[i1][j0] * (1 - gj) + R[i1][j1] * gj) * gi
        cl, sl, co, so = math.cos(math.radians(la)), math.sin(math.radians(la)), math.cos(math.radians(lo)), math.sin(math.radians(lo))
        d = Vector((-cl * so, -cl * co, sl))           # jogo (frente, direita, cima) → Blender
        return Vector(H['centro']) + d * (r + off), d


# ============================================================ malha (montada à mão: a mesma nos dois corpos)
class Malha:
    def __init__(self):
        self.V, self.F, self.M = [], [], []

    def v(self, p):
        self.V.append((p.x, p.y, p.z))
        return len(self.V) - 1

    def face(self, idx, mat):
        self.F.append(tuple(idx))
        self.M.append(mat)

    def grade(self, pts, mat, fechada=False, mats=None):
        """Quadrados de uma grade pts[linha][coluna] (fechada: a última coluna liga na primeira).
        mats(l, c) → material da célula (padrão: mat); None pula a célula."""
        ids = [[self.v(p) for p in linha] for linha in pts]
        nl, nc = len(ids), len(ids[0])
        for l in range(nl - 1):
            for c in range(nc if fechada else nc - 1):
                c2 = (c + 1) % nc
                m = mats(l, c) if mats else mat
                if m is None:
                    continue
                self.face([ids[l][c], ids[l][c2], ids[l + 1][c2], ids[l + 1][c]], m)
        return ids

    def tubo(self, caminho, raio, lados, mat, fechar=True):
        """Tubo fino ao longo de uma polilinha (correntes, alças, frisos)."""
        aneis = []
        for k, p in enumerate(caminho):
            t = (caminho[min(k + 1, len(caminho) - 1)] - caminho[max(k - 1, 0)]).normalized()
            u = t.orthogonal().normalized()
            w = t.cross(u)
            r = raio(k) if callable(raio) else raio
            aneis.append([p + (u * math.cos(TAU * j / lados) + w * math.sin(TAU * j / lados)) * r for j in range(lados)])
        ids = self.grade(aneis, mat, fechada=True)
        if fechar:
            for linha in (ids[0], ids[-1]):
                self.face(linha if linha is ids[0] else linha[::-1], mat)
        return ids

    def ponta(self, base, direcao, raio, altura, lados, mat, lado_ref=None, achatar=1.0, torcer=0.0):
        """Espinho ou lasca: pirâmide de 'lados' faces sobre a base (achatar < 1: lâmina)."""
        d = direcao.normalized()
        u = (lado_ref - d * lado_ref.dot(d)).normalized() if lado_ref is not None and (lado_ref - d * lado_ref.dot(d)).length > 1e-6 else d.orthogonal().normalized()
        w = d.cross(u)
        anel = [self.v(base + (u * math.cos(TAU * j / lados + torcer) + w * math.sin(TAU * j / lados + torcer) * achatar) * raio) for j in range(lados)]
        topo = self.v(base + d * altura)
        fundo = self.v(base - d * raio * 0.3)
        for j in range(lados):
            self.face([anel[j], anel[(j + 1) % lados], topo], mat)
            self.face([anel[(j + 1) % lados], anel[j], fundo], mat)

    def cristal(self, base, direcao, raio, altura, mat, lados=6, ponta=0.35, lado_ref=None, achatar=1.0):
        """Cristal: prisma com ponta (a base um pouco enterrada)."""
        d = direcao.normalized()
        u = (lado_ref - d * lado_ref.dot(d)).normalized() if lado_ref is not None and (lado_ref - d * lado_ref.dot(d)).length > 1e-6 else d.orthogonal().normalized()
        w = d.cross(u)
        h0 = altura * (1 - ponta)
        a0 = [self.v(base - d * raio * 0.4 + (u * math.cos(TAU * j / lados) + w * math.sin(TAU * j / lados) * achatar) * raio * 0.85) for j in range(lados)]
        a1 = [self.v(base + d * h0 + (u * math.cos(TAU * j / lados) + w * math.sin(TAU * j / lados) * achatar) * raio) for j in range(lados)]
        topo = self.v(base + d * altura)
        for j in range(lados):
            j2 = (j + 1) % lados
            self.face([a0[j], a0[j2], a1[j2], a1[j]], mat)
            self.face([a1[j], a1[j2], topo], mat)
        self.face(a0[::-1], mat)

    def folha(self, base, direcao, normal, comp, larg, mat):
        """Folha: losango com a nervura levantada (4 triângulos)."""
        d = direcao.normalized()
        n = normal.normalized()
        s = d.cross(n).normalized()
        a = self.v(base)
        b = self.v(base + d * comp * 0.45 + s * larg / 2)
        c = self.v(base + d * comp)
        e = self.v(base + d * comp * 0.45 - s * larg / 2)
        m = self.v(base + d * comp * 0.45 + n * larg * 0.18)
        for q in ((a, b, m), (b, c, m), (c, e, m), (e, a, m)):
            self.face(q, mat)

    def caixa(self, centro, eixos, meias, mat):
        """Caixa orientada (eixos: três vetores; meias: meias medidas)."""
        X, Y, Z = (e.normalized() * m for e, m in zip(eixos, meias))
        P = [self.v(centro + X * sx + Y * sy + Z * sz) for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]
        for q in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)):
            self.face([P[k] for k in q], mat)

    def tris(self):
        return sum(len(f) - 2 for f in self.F)

    def objeto(self, nome):
        me = bpy.data.meshes.new(nome)
        me.from_pydata(self.V, [], self.F)
        me.update()
        for pl, m in zip(me.polygons, self.M):
            pl.material_index = m
        ob = bpy.data.objects.new(nome, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


def suave(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def dang(a, b):
    """Diferença de ângulos em (−π, π]."""
    return (a - b + math.pi) % TAU - math.pi


# ============================================================ estilo de cada classe
def estilo(classe, nivel):
    P = json.load(open(PALETAS, encoding='utf-8'))[classe][str(nivel)]
    L = NIVEL_L[nivel]
    pri, esc, aca, bri = (tuple(P[k]) for k in ('principal', 'escuro', 'acabamento', 'brilho'))
    # as imagens são escuras (arte com luz pintada): o albedo sobe um pouco para a luz do jogo
    pri = tuple(min(1.0, v * 1.7 + 0.008) for v in pri)
    esc = tuple(min(1.0, v * 1.5 + 0.006) for v in esc)
    escurecer = lambda c, k: tuple(v * k for v in c)
    misturar = lambda a, b, k: tuple(x + (y - x) * k for x, y in zip(a, b))
    luz = tuple(min(1.0, v * (1.15 + 0.2 * L)) for v in bri)
    runas = dict(padrao='runas', cor2=aca if L < 2 else luz, runas_acesas=L >= 2)
    tecido = dict(padrao='tecido')
    if classe == 'guerreiro':
        mats = [dict(cor=misturar(escurecer(esc, 1.4), (0.16, 0.155, 0.16), 0.7), metal=0.75, aspereza=0.4, desgaste=0.5, padrao='paineis', escala=0.12, borda_metal=True),
                dict(cor=pri, aspereza=0.75, desgaste=0.3, **tecido, escala=0.5),
                dict(cor=aca, metal=1.0, aspereza=0.3, desgaste=0.3),
                dict(cor=luz, aspereza=0.2, emissao=luz, desgaste=0, padrao='veios', escala=0.06),
                dict(cor=(0.16, 0.12, 0.09), aspereza=0.95, desgaste=0.2, padrao='pelo', escala=0.2),
                None,
                dict(cor=pri, aspereza=0.75, desgaste=0.3, **runas, escala=1.0)]
    elif classe == 'guardiao':
        mats = [dict(cor=misturar(aca, (0.55, 0.6, 0.7), 0.3), metal=0.95, aspereza=0.28, desgaste=0.3, padrao='paineis', escala=0.1, borda_metal=True),
                dict(cor=pri, aspereza=0.7, desgaste=0.25, **tecido, escala=0.5),
                dict(cor=escurecer(aca, 0.7), metal=1.0, aspereza=0.32, desgaste=0.3),
                dict(cor=luz, aspereza=0.15, emissao=luz, desgaste=0, padrao='veios', escala=0.06),
                None, None,
                dict(cor=pri, aspereza=0.7, desgaste=0.25, **runas, escala=1.0)]
    elif classe == 'mago':
        mats = [dict(cor=pri, aspereza=0.7, desgaste=0.2, **tecido, escala=0.5),
                dict(cor=esc, aspereza=0.8, desgaste=0.2, padrao='tecido', escala=0.5),
                dict(cor=aca, metal=1.0, aspereza=0.28, desgaste=0.35),
                dict(cor=luz, aspereza=0.15, emissao=luz, desgaste=0, padrao='veios', escala=0.06),
                None, None,
                dict(cor=pri, aspereza=0.7, desgaste=0.2, **runas, escala=1.0)]
    elif classe == 'assassino':
        mats = [dict(cor=pri, aspereza=0.55, desgaste=0.35, padrao='couro', escala=0.5),
                dict(cor=esc, aspereza=0.6, desgaste=0.3, padrao='couro', escala=0.4),
                dict(cor=aca, metal=1.0, aspereza=0.32, desgaste=0.3),
                dict(cor=luz, aspereza=0.15, emissao=luz, desgaste=0, padrao='veios', escala=0.05)]
    else:   # patrulheiro
        folha = misturar(escurecer(bri, 0.55), pri, 0.35)
        mats = [dict(cor=pri, aspereza=0.6, desgaste=0.4, padrao='couro', escala=0.5),
                dict(cor=esc, aspereza=0.65, desgaste=0.3, padrao='couro', escala=0.4),
                dict(cor=aca, metal=0.9, aspereza=0.38, desgaste=0.4),
                dict(cor=luz, aspereza=0.15, emissao=luz, desgaste=0, padrao='veios', escala=0.05),
                dict(cor=(0.3, 0.24, 0.16), aspereza=0.95, desgaste=0.25, padrao='pelo', escala=0.2),
                dict(cor=folha, aspereza=0.6, desgaste=0.25, padrao='veios', escala=0.05)]
    return dict(classe=classe, nivel=nivel, L=L, mats=mats, paleta=P, rnd=random.Random(nivel * 31 + len(classe)))


def rng(E, chave):
    """Sorteio fixo por peça e chave (o mesmo nos dois corpos)."""
    return random.Random(f"{E['classe']}{E['nivel']}{chave}")


# ============================================================ peças
def peitoral(m, E):
    M = Malha()
    cls, L = E['classe'], E['L']
    T = 'tronco'
    nt = m.n(T)
    topo = nt - 2.2                       # abaixo do pescoço
    baixo = 1.8
    placas = cls in ('guerreiro', 'guardiao')
    folga = 0.016 + (0.01 if placas else 0)
    # casca do tronco (32 ângulos × anéis), com gola e barra
    linhas = []
    nl = 18
    for k in range(nl + 1):
        i = baixo + (topo - baixo) * k / nl
        linhas.append([m.p(T, i, TAU * j / NA, folga + 0.004 * suave(0.7, 1, k / nl)) for j in range(NA)])
    M.grade(linhas, ESC if placas else PRI, fechada=True)
    # gola alta (Assassino, Mago, Guardião) ou colarinho baixo
    gola = 0.05 if cls in ('assassino', 'mago', 'guardiao') else 0.025
    aneis_gola = []
    for k in range(3):
        f = k / 2
        aneis_gola.append([m.p(T, topo + f * 1.6, TAU * j / NA, folga + 0.006 + f * gola * 0.5) + Vector((0, 0, f * gola * 0.6)) for j in range(NA)])
    M.grade(aneis_gola, ESC if cls != 'mago' else ACA, fechada=True)
    # barra: aba que desce sobre o quadril (casaco), mais longa na túnica do Mago
    desce = {'mago': 0.42, 'patrulheiro': 0.16, 'assassino': 0.12, 'guerreiro': 0.1, 'guardiao': 0.1}[cls] + 0.03 * L
    aneis_barra = []
    for k in range(5):
        f = k / 4
        dz = -desce * f
        aneis_barra.append([m.p(T, baixo, TAU * j / NA, folga + 0.01 + 0.05 * f + (0.03 * f if cls == 'mago' else 0)) + Vector((0, 0, dz)) for j in range(NA)])
    # pontas recortadas na barra (abertura na frente da túnica)
    mat_barra = (lambda l, c: None if cls == 'mago' and abs(dang(TAU * (c + 0.5) / NA, 0)) < 0.25 else (ESC if placas else PRI))
    M.grade(aneis_barra, PRI, fechada=True, mats=mat_barra)
    # mangas até o cotovelo (Mago: até o punho, abrindo)
    for lado in ('R', 'L'):
        B = 'braco' + lado
        ico = m.indice(B, m.B['arm' + lado + 'u'][1])
        fim = (m.n(B) - 1.5) if cls == 'mago' else ico + 3.0
        nm = 10
        linhas = []
        for k in range(nm + 1):
            i = 0.0 + fim * k / nm
            abre = (0.03 * suave(0.5, 1, k / nm) if cls == 'mago' else 0)
            linhas.append([m.p(B, i, TAU * j / 16, folga * 0.8 + abre) for j in range(16)])
        M.grade(linhas, PRI if cls != 'guerreiro' else ESC, fechada=True)
        # punho da manga: friso
        M.grade([[m.p(B, fim - 0.5 + 0.5 * q, TAU * j / 16, folga * 0.8 + 0.008 + (0.03 if cls == 'mago' else 0)) for j in range(16)] for q in range(2)], ACA, fechada=True)
    # cinto
    ic = baixo + 0.6
    M.grade([[m.p(T, ic + q * 0.9, TAU * j / NA, folga + 0.012) for j in range(NA)] for q in range(2)], ESC, fechada=True)
    fivela = m.p(T, ic + 0.45, 0.0, folga + 0.02)
    nf = m.normal(T, ic + 0.45, 0.0)
    M.caixa(fivela, (Vector((1, 0, 0)), nf, Vector((0, 0, 1))), (0.022, 0.006, 0.016), ACA)
    r = rng(E, 'peitoral')
    if placas:
        # peito: placa grande na frente e nas costas, com friso; abdômen em lâminas sobrepostas
        for centro, larg in ((0.0, 1.45), (math.pi, 1.5)):
            i0, i1 = topo - 9.5, topo - 0.5
            linhas = []
            for k in range(7):
                i = i0 + (i1 - i0) * k / 6
                linhas.append([m.p(T, i, centro + larg * (c / 8 - 0.5) * 2, folga + 0.014 + 0.008 * math.sin(math.pi * c / 8)) for c in range(9)])
            M.grade(linhas, PRI)
            M.grade([[m.p(T, i0 + q * 0.4, centro + larg * (c / 8 - 0.5) * 2, folga + 0.02) for c in range(9)] for q in range(2)], ACA)
        for b in range(4):
            i0 = baixo + 1.2 + b * 2.0
            M.grade([[m.p(T, i0 + q * 1.7, TAU * j / NA, folga + 0.01 + 0.006 * (3 - b) + 0.004 * q) for j in range(NA)] for q in range(2)], PRI,
                    fechada=True, mats=lambda l, c: PRI if abs(dang(TAU * (c + 0.5) / NA, 0)) < 1.85 else None)
        # gema no esterno; espinhos nos ombros do peitoral pelo nível
        ig = topo - 4.5
        M.cristal(m.p(T, ig, 0.0, folga + 0.02), m.normal(T, ig, 0.0), 0.022 + 0.006 * L, 0.03 + 0.01 * L, BRI, lados=4, ponta=0.5, lado_ref=Vector((0, 0, 1)), achatar=0.7)
        for lado, a0 in (('R', math.pi / 2), ('L', -math.pi / 2)):
            for s in range(1 + L):
                a = a0 + (0.35 + 0.25 * s) * (1 if a0 > 0 else -1) * -1
                base = m.p(T, topo - 0.8 - s * 1.3, a, folga + 0.02)
                dirc = (m.normal(T, topo - 0.8, a) + Vector((0, 0, 1.1))).normalized()
                M.ponta(base, dirc, 0.014 + 0.003 * L, 0.05 + 0.02 * L + r.uniform(-0.005, 0.005), 4, ACA if cls == 'guerreiro' else BRI)
        if cls == 'guardiao':
            # linhas de energia descendo do cristal
            for a in (-0.5, 0.5):
                M.grade([[m.p(T, ig - 0.5 - k * 1.5, a + dd, folga + 0.024) for dd in (-0.04, 0.04)] for k in range(6)], BRI)
    else:
        # alças cruzadas (Assassino, Patrulheiro) ou frisos verticais da túnica (Mago)
        if cls in ('assassino', 'patrulheiro'):
            for sgn in (1, -1):
                caminho = []
                for k in range(14):
                    f = k / 13
                    i = topo - 1.0 - (topo - 1.0 - (baixo + 1.5)) * f
                    a = sgn * (-1.2 + 2.4 * f)
                    caminho.append((i, a))
                for frente in (0.0, math.pi):
                    pts = [[m.p(T, i + dd, a + frente, folga + 0.012) for (i, a) in caminho] for dd in (-0.45, 0.45)]
                    M.grade(pts, ESC)
            for k in range(3 + L):
                i, a = topo - 2.0 - k * 2.2, 0.55
                M.caixa(m.p(T, i, a, folga + 0.017), (Vector((1, 0, 0)), m.normal(T, i, a), Vector((0, 0, 1))), (0.008, 0.004, 0.006), ACA)
        if cls == 'mago':
            for a in (-0.22, 0.22):
                M.grade([[m.p(T, baixo - 0.2 + (topo - baixo) * k / 12, a + dd, folga + 0.008) for dd in (-0.05, 0.05)] for k in range(13)], ACA)
            ig = topo - 5.0
            M.cristal(m.p(T, ig, 0.0, folga + 0.012), m.normal(T, ig, 0.0), 0.018 + 0.006 * L, 0.035 + 0.012 * L, BRI, lados=4, ponta=0.5, lado_ref=Vector((0, 0, 1)), achatar=0.6)
            for s in range(L):
                for sg in (1, -1):
                    a = sg * (0.9 + 0.3 * s)
                    M.cristal(m.p(T, topo - 2 - 2.5 * s, a, folga + 0.01), m.normal(T, topo - 2, a), 0.01, 0.025, BRI, lados=4, ponta=0.5)
        if cls == 'assassino':
            # lascas de cristal nos ombros e no peito (mais e maiores pelo nível)
            for k in range(4 + 3 * L):
                sg = 1 if k % 2 else -1
                i = topo - 0.5 - r.uniform(0, 3.5)
                a = sg * r.uniform(1.0, 1.9)
                base = m.p(T, i, a, folga + 0.01)
                dirc = (m.normal(T, i, a) * 0.6 + Vector((0, 0, 1)) + Vector((r.uniform(-.2, .2), r.uniform(-.2, .2), 0))).normalized()
                M.cristal(base, dirc, 0.012 + 0.003 * L, r.uniform(0.05, 0.08) * (1 + 0.3 * L), BRI, lados=4, ponta=0.55, achatar=0.5)
            ig = topo - 4.0
            M.cristal(m.p(T, ig, 0.0, folga + 0.014), m.normal(T, ig, 0.0), 0.014, 0.03, BRI, lados=4, ponta=0.5, lado_ref=Vector((0, 0, 1)), achatar=0.6)
        if cls == 'patrulheiro':
            # gola de pelo e folhas em camadas nos ombros e na barra
            caminho = [m.p(T, topo + 0.6, TAU * j / 24, folga + 0.03) for j in range(25)]
            M.tubo(caminho, lambda k: 0.03 + 0.008 * math.sin(k * 2.3), 6, PELO, fechar=False)
            for k in range(18 + 8 * L):
                sg = 1 if k % 2 else -1
                i = topo - 0.5 - r.uniform(0, 3.0)
                a = sg * r.uniform(0.9, 2.1)
                base = m.p(T, i, a, folga + 0.014)
                n = m.normal(T, i, a)
                M.folha(base, (Vector((0, 0, -1)) + n * 0.4).normalized(), n, r.uniform(0.05, 0.075), 0.03, FOLHA)
            for k in range(20 + 6 * L):
                a = TAU * k / (20 + 6 * L) + r.uniform(-0.1, 0.1)
                base = m.p(T, baixo + 0.2, a, folga + 0.02) + Vector((0, 0, -0.02))
                n = m.normal(T, baixo, a)
                M.folha(base, (Vector((0, 0, -1)) + n * 0.25).normalized(), n, r.uniform(0.06, 0.09), 0.035, FOLHA)
            ig = topo - 4.0
            M.cristal(m.p(T, ig, 0.0, folga + 0.014), m.normal(T, ig, 0.0), 0.012 + 0.004 * L, 0.025, BRI, lados=4, ponta=0.5, lado_ref=Vector((0, 0, 1)), achatar=0.6)
    if cls == 'guerreiro':
        # gola de pelo atrás do pescoço (como nas imagens)
        caminho = [m.p(T, topo + 0.8, math.pi + 1.9 * (j / 12 - 0.5) * 2, folga + 0.035) for j in range(13)]
        M.tubo(caminho, lambda k: 0.03 + 0.01 * math.sin(k * 1.7), 6, PELO)
    return M


def lado_externo(m, B, i, lado):
    """Ângulo, no anel i do braço, que aponta para fora e para cima (o topo do ombro)."""
    A = m.anel(B, i)
    fora = Vector((-1, 0, 0)) if lado == 'R' else Vector((1, 0, 0))
    return m.ang(B, i, (fora * 0.6 + Vector((0, 0, 1))).normalized())


def ombreiras(m, E):
    """As duas ombreiras (o conversor separa: ombreira direita e esquerda)."""
    M = Malha()
    cls, L = E['classe'], E['L']
    r = rng(E, 'ombros')
    camadas = {'guerreiro': 3, 'guardiao': 3, 'mago': 2, 'assassino': 2, 'patrulheiro': 2}[cls] + (1 if L >= 1 else 0)
    for lado in ('R', 'L'):
        B = 'braco' + lado
        topo_a = lado_externo(m, B, 1.0, lado)
        # domo sobre o ombro (do tronco ao braço) e camadas que descem pelo braço
        for c in range(camadas):
            i0, i1 = -2.2 + c * 1.5, 1.6 + c * 1.6
            larg = 1.45 - 0.12 * c
            off = 0.03 + 0.016 * (camadas - c) + 0.006 * L
            linhas = []
            for k in range(6):
                i = i0 + (i1 - i0) * k / 5
                linhas.append([m.p(B, i, topo_a + larg * (j / 10 - 0.5) * 2, off + 0.012 * math.sin(math.pi * j / 10) - 0.01 * k / 5) for j in range(11)])
            M.grade(linhas, PRI if cls != 'patrulheiro' else (PRI if c % 2 else ESC))
            M.grade([[m.p(B, i1 - 0.35 + 0.35 * q, topo_a + larg * (j / 10 - 0.5) * 2, off + 0.006) for j in range(11)] for q in range(2)], ACA)
        # detalhes por classe: espinhos (Guerreiro), cristais (Mago, Guardião, Assassino), folhas e pelo (Patrulheiro)
        n_det = 2 + 2 * L
        for k in range(n_det):
            i = r.uniform(-1.5, 2.5)
            a = topo_a + r.uniform(-0.8, 0.8)
            base = m.p(B, i, a, 0.03 + 0.016 * camadas)
            n = m.normal(B, i, a)
            dirc = (n + Vector((0, 0, 0.8))).normalized()
            if cls == 'guerreiro':
                M.ponta(base, dirc, 0.016 + 0.004 * L, r.uniform(0.05, 0.08) * (1 + 0.35 * L), 4, ACA)
            elif cls == 'patrulheiro':
                for q in range(3):
                    M.folha(base + Vector((r.uniform(-.02, .02), r.uniform(-.02, .02), 0)), (Vector((0, 0, -1)) + n * 0.5).normalized(), n, r.uniform(0.06, 0.09), 0.035, FOLHA)
            else:
                M.cristal(base, dirc, 0.012 + 0.004 * L, r.uniform(0.045, 0.075) * (1 + 0.3 * L), BRI, lados=4 if cls == 'assassino' else 6, ponta=0.5, achatar=0.55 if cls == 'assassino' else 1.0)
        if cls == 'patrulheiro':
            caminho = [m.p(B, -0.5, topo_a + 1.4 * (j / 8 - 0.5) * 2, 0.06 + 0.01 * L) for j in range(9)]
            M.tubo(caminho, 0.022, 6, PELO)
        if cls in ('guardiao', 'mago'):
            i, a = 1.0, topo_a + 0.2
            M.cristal(m.p(B, i, a, 0.06), m.normal(B, i, a), 0.016 + 0.004 * L, 0.03, BRI, lados=4, ponta=0.5, achatar=0.7)
    return M


def capa(m, E):
    M = Malha()
    cls, L = E['classe'], E['L']
    T = 'tronco'
    nt = m.n(T)
    alt = m.alt
    z_barra = alt * (0.2 if cls in ('mago', 'guardiao') else 0.26) - 0.03 * L
    ncol, nlin = 15, 18
    meia = 1.3                                  # ângulo para cada lado das costas no alto
    oR, oL = m.J['ombroR'], m.J['ombroL']
    z_topo = m.T[T][-3]['c'].z
    r = rng(E, 'capa')
    pontas = cls in ('assassino', 'guerreiro', 'mago') or L >= 1
    linhas = []
    for l in range(nlin + 1):
        f = l / nlin
        z = z_topo + (z_barra - z_topo) * f
        linha = []
        for c in range(ncol):
            g = c / (ncol - 1) * 2 - 1              # −1 (direita) … 1 (esquerda)
            a = math.pi - g * meia * (1 + 0.12 * f)
            i = m.indice_z(T, min(z, z_topo))
            folga = 0.04 + 0.1 * suave(0.0, 0.6, f)
            if z >= m.T[T][0]['c'].z:
                p = m.p(T, i, a, folga)
            else:
                p0 = m.p(T, 0, a, folga)
                p = Vector((p0.x, p0.y, z)) + (p0 - m.T[T][0]['c']).normalized() * 0.04 * (m.T[T][0]['c'].z - z) / max(m.T[T][0]['c'].z - z_barra, 0.01)
            # nos ombros, o alto da capa vai para cima da junta do ombro
            if l <= 2:
                lado = oR if g < 0 else oL
                w = suave(0.45, 1.0, abs(g)) * (1 - l / 3)
                alvo = lado + Vector((0, 0.03, 0.065)) + (lado - Vector((m.T[T][0]['c'].x, lado.y, lado.z))).normalized() * 0.0
                p = p.lerp(alvo + Vector((0, 0.02, 0)), w)
            if l == nlin and pontas:
                p.z += (0.07 + 0.03 * L) * (0.5 + 0.5 * math.cos(c * math.pi)) * (1 if c % 2 else 0.3) + r.uniform(-0.01, 0.01)
            linha.append(p)
        linhas.append(linha)
    ids = M.grade(linhas, RUNA if cls in ('guerreiro', 'guardiao', 'mago') else PRI)
    # friso nas bordas laterais e embaixo (o forro escuro por dentro fica no mesmo pano)
    for c in (0, ncol - 1):
        M.grade([[linhas[l][c] + (linhas[l][c] - linhas[l][c + (1 if c == 0 else -1)]).normalized() * 0.012 * q for q in range(2)] for l in range(nlin + 1)], ACA)
    # gola: pelo (Guerreiro, Patrulheiro) ou gola alta (os outros) e o broche
    col = [m.p(T, nt - 2, math.pi + 2.1 * (j / 12 - 0.5) * 2, 0.06) + Vector((0, 0, 0.02)) for j in range(13)]
    if cls in ('guerreiro', 'patrulheiro'):
        M.tubo(col, lambda k: 0.04 + 0.012 * math.sin(k * 1.9) + 0.006 * L, 7, PELO)
    else:
        M.tubo(col, 0.018, 6, ESC)
        if cls in ('mago', 'guardiao', 'assassino'):
            gola = [[p + Vector((0, 0, 0.05 + 0.02 * L)) * q + (p - Vector((m.T[T][-1]['c'].x, m.T[T][-1]['c'].y, p.z))).normalized() * 0.03 * q for p in col] for q in range(2)]
            M.grade(gola, PRI)
    for lado in (oR, oL):
        M.cristal(lado + Vector((0, -0.03, 0.06)), Vector((0, -1, 0.3)), 0.014 + 0.004 * L, 0.022, BRI, lados=6, ponta=0.4)
    return M


def capuz(m, E):
    M = Malha()
    cls, L = E['classe'], E['L']
    H = m.H
    LAT, LON = H['lat'], H['lon']
    elmo = cls == 'guerreiro'
    folga = 0.022 + (0.012 if elmo else 0) + 0.004 * L
    linhas = []
    for la in LAT:
        linha = []
        for lo in LON:
            # o capuz cresce para trás e para o alto (ponta), o elmo fica justo
            extra = 0 if elmo else 0.035 * suave(30, 80, la) * suave(100, 180, abs(lo)) + 0.012 * suave(60, 180, abs(lo))
            p, d = m.cabeca(la, lo, folga + extra)
            linha.append(p)
        linhas.append(linha)
    # gola do capuz: desce do queixo ao pescoço e abre sobre os ombros
    T = 'tronco'
    nt = m.n(T)
    abaixo = []
    for q, (i, off) in enumerate(((nt - 1.0, 0.035), (nt - 2.5, 0.05), (nt - 4.0, 0.065))):
        abaixo.append([m.p(T, i, -math.radians(lo), off) for lo in LON])
    grade = abaixo[::-1] + linhas
    nla = len(LAT)

    def mat(l, c):
        li = l - 3                                    # índice na grade da cabeça (−: gola)
        if li < 0:
            return PRI
        la, lo = LAT[li], LON[c] + 7.5
        frente = abs(lo) < 62
        if elmo:
            if frente and 0 <= la < 12 and abs(lo) < 48:
                return BRI                            # a fresta dos olhos, acesa
            return PRI
        if cls == 'assassino':
            if frente and -12 <= la < 32:
                return None                           # olhos; a máscara cobre o resto do rosto
            if frente and la < -12:
                return ESC
            return PRI
        if frente and -48 <= la < 38:
            return None                               # rosto à mostra
        return PRI
    ids = M.grade(grade, PRI, fechada=True, mats=mat)
    # friso em volta da abertura do rosto (e a gema na testa no Mago, no Guardião e no Assassino)
    if not elmo:
        borda = []
        for lo in range(-60, 61, 10):
            borda.append(m.cabeca(38, lo, folga + 0.006)[0])
        for la in range(38, -49, -12):
            borda.append(m.cabeca(la, 62, folga + 0.006)[0])
        borda2 = [m.cabeca(la, -62, folga + 0.006)[0] for la in range(-48, 39, 12)]
        M.tubo(borda2[::-1][:-1] + borda, 0.008 + 0.002 * L, 5, PELO if cls == 'patrulheiro' else ACA, fechar=False)
    else:
        # elmo: crista e chifres pelo nível
        crista = [m.cabeca(la, 180 - 1, folga + 0.012)[0] for la in range(-20, 91, 10)] + [m.cabeca(la, 0, folga + 0.012)[0] for la in range(80, 10, -10)]
        M.tubo(crista, 0.01, 5, ACA, fechar=False)
        for sg in (1, -1):
            for s in range(1 + L):
                p, d = m.cabeca(40 + 10 * s, sg * (80 + 20 * s), folga)
                M.ponta(p, (d + Vector((0, 0, 1.2))).normalized(), 0.014, 0.05 + 0.03 * L, 4, ACA)
    if cls in ('mago', 'guardiao', 'assassino') or L >= 1:
        p, d = m.cabeca(46, 0, folga + 0.01)
        M.cristal(p, d, 0.012 + 0.003 * L, 0.02 + 0.008 * L, BRI, lados=4, ponta=0.5, lado_ref=Vector((0, 0, 1)), achatar=0.6)
    if cls == 'patrulheiro':
        r = rng(E, 'capuz')
        for k in range(10 + 6 * L):
            la, lo = r.uniform(-10, 70), r.uniform(70, 290)
            p, d = m.cabeca(la, lo, folga + 0.01)
            M.folha(p, (Vector((0, 0, -1)) + d * 0.3).normalized(), d, r.uniform(0.05, 0.07), 0.03, FOLHA)
    return M


def luvas(m, E):
    M = Malha()
    cls, L = E['classe'], E['L']
    r = rng(E, 'luvas')
    for lado in ('R', 'L'):
        Mo, B = 'mao' + lado, 'braco' + lado
        nm, nb = m.n(Mo), m.n(B)
        linhas = [[m.p(Mo, i, TAU * j / 16, 0.006 + 0.002 * (i < 3)) for j in range(16)] for i in range(nm)]
        # a ponta fecha num anel pequeno
        linhas.append([m.p(Mo, nm - 1 + 0.4, TAU * j / 16, 0.0, esc=0.5) for j in range(16)])
        M.grade(linhas, PRI if cls in ('guerreiro', 'guardiao') else (ESC if cls == 'mago' else PRI), fechada=True)
        # manopla: do meio do antebraço ao punho, abrindo para o cotovelo
        i0 = nb - 1 - (6.5 + 0.8 * L)
        cano = []
        for k in range(7):
            i = i0 + (nb - 0.6 - i0) * k / 6
            cano.append([m.p(B, i, TAU * j / 16, 0.012 + 0.016 * (1 - k / 6) + 0.004 * L) for j in range(16)])
        M.grade(cano, PRI, fechada=True)
        M.grade([[m.p(B, i0 + 0.35 * q, TAU * j / 16, 0.03 + 0.004 * L) for j in range(16)] for q in range(2)], ACA, fechada=True)
        fora = Vector((-1, 0, 0)) if lado == 'R' else Vector((1, 0, 0))
        a_dorso = m.ang(Mo, 4, fora)
        if cls in ('guerreiro', 'guardiao', 'assassino'):
            # placa no dorso da mão
            M.grade([[m.p(Mo, i, a_dorso + 0.9 * (j / 4 - 0.5) * 2, 0.013) for j in range(5)] for i in (1.5, 3.5, 5.5, 7.5)], PRI if cls != 'assassino' else ESC)
        if cls == 'guerreiro':
            for k in range(3 + L):
                i = 8.0
                a = a_dorso + 0.5 * (k / max(1, 2 + L) - 0.5) * 2
                M.ponta(m.p(Mo, i, a, 0.012), m.normal(Mo, i, a), 0.007, 0.018 + 0.008 * L, 4, ACA)
            for k in range(1 + L):
                ia, aa = i0 + 2 + 1.5 * k, m.ang(B, i0 + 2, fora)
                M.ponta(m.p(B, ia, aa, 0.03), (m.normal(B, ia, aa) + m.anel(B, ia)['t'] * -0.6).normalized(), 0.012, 0.04 + 0.02 * L, 4, ACA)
        if cls == 'assassino':
            for k in range(1 + L):
                ia, aa = i0 + 1.5 + 1.8 * k, m.ang(B, i0 + 2, fora)
                M.cristal(m.p(B, ia, aa, 0.028), (m.normal(B, ia, aa) - m.anel(B, ia)['t'] * 0.8).normalized(), 0.01, 0.05 + 0.02 * L, BRI, lados=4, ponta=0.6, achatar=0.5)
            if L >= 1:
                for k in range(4):
                    a = a_dorso + math.pi + 1.0 * (k / 3 - 0.5) * 2
                    A = m.anel(Mo, nm - 1)
                    M.cristal(m.p(Mo, nm - 1.2, a, 0.004), A['t'], 0.004, 0.025 + 0.01 * L, BRI, lados=4, ponta=0.6)
        if cls in ('mago', 'guardiao'):
            ia, aa = i0 + 3, m.ang(B, i0 + 3, fora)
            M.cristal(m.p(B, ia, aa, 0.03), m.normal(B, ia, aa), 0.012 + 0.003 * L, 0.025 + 0.008 * L, BRI, lados=4, ponta=0.5, lado_ref=m.anel(B, ia)['t'], achatar=0.6)
            M.cristal(m.p(Mo, 3.5, a_dorso, 0.012), m.normal(Mo, 3.5, a_dorso), 0.008, 0.012, BRI, lados=4, ponta=0.5)
        if cls == 'patrulheiro':
            for k in range(6 + 3 * L):
                i = i0 + r.uniform(0.5, 5)
                a = r.uniform(0, TAU)
                n = m.normal(B, i, a)
                M.folha(m.p(B, i, a, 0.028), (m.anel(B, i)['t'] + n * 0.4).normalized(), n, r.uniform(0.04, 0.06), 0.025, FOLHA)
            M.cristal(m.p(Mo, 3.5, a_dorso, 0.01), m.normal(Mo, 3.5, a_dorso), 0.007 + 0.002 * L, 0.012, BRI, lados=4, ponta=0.5)
    return M


def calcas(m, E):
    M = Malha()
    cls, L = E['classe'], E['L']
    r = rng(E, 'calcas')
    T = 'tronco'
    # cintura (do alto das pernas ao cinto) e as duas pernas até o tornozelo
    M.grade([[m.p(T, i, TAU * j / NA, 0.011) for j in range(NA)] for i in (-0.6, 0.6, 1.6, 2.6, 3.4)], ESC if cls == 'mago' else PRI, fechada=True)
    for lado in ('R', 'L'):
        P = 'perna' + lado
        n = m.n(P)
        M.grade([[m.p(P, i, TAU * j / 20, 0.01 + 0.004 * (i < 4)) for j in range(20)] for i in [x * (n - 1.5) / 20 for x in range(21)]], ESC if cls in ('mago', 'guerreiro') else PRI, fechada=True)
        ij = m.indice(P, m.B['thigh' + lado][1])
        frente = m.ang(P, ij, Vector((0, -1, 0)))
        if cls in ('guerreiro', 'guardiao', 'assassino'):
            # joelheira
            M.grade([[m.p(P, ij + d, frente + 1.0 * (j / 6 - 0.5) * 2, 0.022 + 0.006 * math.cos(d)) for j in range(7)] for d in (-1.6, -0.6, 0.4, 1.4)], PRI if cls != 'assassino' else ESC)
            if cls == 'guerreiro' or L >= 1:
                pc = m.p(P, ij - 0.1, frente, 0.03)
                if cls == 'assassino':
                    M.cristal(pc, m.normal(P, ij, frente), 0.01, 0.03 + 0.012 * L, BRI, lados=4, ponta=0.6, achatar=0.5)
                else:
                    M.ponta(pc, m.normal(P, ij, frente), 0.011, 0.025 + 0.012 * L, 4, ACA)
        if cls in ('guerreiro', 'guardiao'):
            # coxote (placa da coxa) e a canela fica para a bota
            M.grade([[m.p(P, i, frente + 1.2 * (j / 6 - 0.5) * 2, 0.02) for j in range(7)] for i in (2.5, 5.5, 8.5, ij - 2.0)], PRI)
            if cls == 'guardiao':
                lat = m.ang(P, 6, Vector((-1, 0, 0)) if lado == 'R' else Vector((1, 0, 0)))
                M.grade([[m.p(P, i, lat + dd, 0.016) for dd in (-0.06, 0.06)] for i in range(2, int(ij) + 6, 2)], BRI)
        if cls == 'assassino':
            for k in range(2 + L):
                i = 4 + 3.2 * k
                M.grade([[m.p(P, i + q * 0.6, TAU * j / 20, 0.016) for j in range(20)] for q in range(2)], ESC, fechada=True)
    # cinto com fivela
    M.grade([[m.p(T, 1.6 + q * 1.0, TAU * j / NA, 0.022) for j in range(NA)] for q in range(2)], ESC, fechada=True)
    M.caixa(m.p(T, 2.1, 0.0, 0.03), (Vector((1, 0, 0)), m.normal(T, 2.1, 0.0), Vector((0, 0, 1))), (0.026, 0.006, 0.018), ACA)
    z_cinto = m.anel(T, 1.6)['c'].z
    if cls in ('guerreiro', 'mago', 'patrulheiro'):
        # saiote: abas (Guerreiro: tecido vermelho entre placas; Mago: túnica até o tornozelo;
        # Patrulheiro: folhas em camadas)
        comp = {'guerreiro': 0.36, 'mago': 0.72, 'patrulheiro': 0.24}[cls] + 0.03 * L
        nab = {'guerreiro': 6, 'mago': 10, 'patrulheiro': 0}[cls]
        for k in range(nab):
            ac = TAU * (k + 0.5) / nab
            if cls == 'mago' and abs(dang(ac, 0)) < 0.35:
                continue
            larg = TAU / nab * 0.62
            linhas = []
            for q in range(9):
                f = q / 8
                z = z_cinto - comp * f
                i = m.indice_z(T, z) if z >= m.T[T][0]['c'].z else 0
                linha = []
                for j in range(4):
                    a = ac + larg * (j / 3 - 0.5) * 2 * (1 + 0.25 * f)
                    p0 = m.p(T, i, a, 0.03 + 0.06 * f)
                    p = Vector((p0.x, p0.y, z))
                    if q == 8:
                        p.z += (0.03 + 0.02 * L) * (1 if j in (1, 2) else 0) * (-1 if cls == 'mago' else 1)
                    linha.append(p)
                linhas.append(linha)
            mt = (PRI if k % 2 else RUNA) if cls == 'guerreiro' else (RUNA if cls == 'mago' else PRI)
            M.grade(linhas, mt)
            if cls != 'patrulheiro':
                for j, sg in ((0, -1), (3, 1)):
                    M.grade([[linhas[q][j] + (linhas[q][j] - linhas[q][3 - j]).normalized() * 0.01 * w for w in range(2)] for q in range(9)], ACA)
            M.grade([[linhas[q][j] + Vector((0, 0, 0)) + (linhas[q][j] - Vector((m.T[T][0]['c'].x, m.T[T][0]['c'].y, linhas[q][j].z))).normalized() * 0.002 for j in (0, 1, 2, 3)] for q in (7, 8)], ACA)
        if cls == 'patrulheiro':
            for k in range(30 + 10 * L):
                a = TAU * k / (30 + 10 * L) + r.uniform(-0.08, 0.08)
                camada = k % 3
                z = z_cinto - 0.02 - camada * 0.07
                i = m.indice_z(T, z) if z >= m.T[T][0]['c'].z else 0
                base = m.p(T, i, a, 0.035 + 0.01 * camada)
                base.z = z
                n = m.normal(T, i, a)
                M.folha(base, (Vector((0, 0, -1)) + n * 0.2).normalized(), n, r.uniform(0.09, 0.13), 0.045, FOLHA)
    return M


def botas(m, E):
    M = Malha()
    cls, L = E['classe'], E['L']
    r = rng(E, 'botas')
    for lado in ('R', 'L'):
        P, Pe = 'perna' + lado, 'pe' + lado
        n = m.n(P)
        ij = m.indice(P, m.B['thigh' + lado][1])
        alto = ij + (3.0 if cls in ('guerreiro', 'guardiao') else 4.5) - 0.6 * L
        cano = [[m.p(P, i, TAU * j / 20, 0.012 + 0.012 * suave(alto + 2, alto, i)) for j in range(20)] for i in [alto + (n - 0.4 - alto) * k / 10 for k in range(11)]]
        M.grade(cano, PRI if cls not in ('guerreiro', 'guardiao') else ESC, fechada=True)
        M.grade([[m.p(P, alto + 0.4 * q, TAU * j / 20, 0.026) for j in range(20)] for q in range(2)], ACA, fechada=True)
        npe = m.n(Pe)
        pe = []
        for i in range(npe):
            linha = []
            for j in range(16):
                p = m.p(Pe, i, TAU * j / 16, 0.009)
                p.z = max(p.z, 0.0)
                linha.append(p)
            pe.append(linha)
        ponta = m.anel(Pe, npe - 1)
        pe.append([ponta['c'] + ponta['t'] * 0.012 for _ in range(16)])
        M.grade(pe, PRI if cls not in ('guerreiro', 'guardiao') else ESC, fechada=True)
        # sola
        sola = [[Vector((p.x, p.y, 0.0)) + (p - Vector((m.anel(Pe, i)['c'].x, m.anel(Pe, i)['c'].y, 0))).normalized() * 0.004 * 0 for p in pe[i][::4]] for i in range(npe)]
        frente = m.ang(P, ij, Vector((0, -1, 0)))
        if cls in ('guerreiro', 'guardiao'):
            # grevas: placa da canela e do peito do pé
            M.grade([[m.p(P, i, frente + 1.15 * (j / 6 - 0.5) * 2, 0.022) for j in range(7)] for i in [alto + (n - 1.2 - alto) * k / 4 for k in range(5)]], PRI)
            M.grade([[m.p(Pe, i, m.ang(Pe, i, Vector((0, 0, 1))) + 1.0 * (j / 4 - 0.5) * 2, 0.016) for j in range(5)] for i in (npe - 9, npe - 6, npe - 3)], PRI)
            for k in range(1 + L):
                i = alto + 1.5 + 2.5 * k
                M.ponta(m.p(P, i, frente, 0.03), (m.normal(P, i, frente) + Vector((0, 0, 0.5))).normalized(), 0.011, 0.03 + 0.012 * L, 4, ACA)
            if cls == 'guardiao':
                i = alto + 2.5
                M.cristal(m.p(P, i, frente, 0.03), m.normal(P, i, frente), 0.012 + 0.003 * L, 0.02 + 0.008 * L, BRI, lados=4, ponta=0.5, lado_ref=Vector((0, 0, 1)), achatar=0.6)
        if cls == 'assassino':
            for k in range(3):
                i = alto + 1.5 + 2.6 * k
                M.grade([[m.p(P, i + q * 0.5, TAU * j / 20, 0.02) for j in range(20)] for q in range(2)], ESC, fechada=True)
            for k in range(1 + L):
                fora = Vector((-1, 0, 0)) if lado == 'R' else Vector((1, 0, 0))
                i = alto + 1 + 3 * k
                a = m.ang(P, i, fora)
                M.cristal(m.p(P, i, a, 0.024), (m.normal(P, i, a) + Vector((0, 0, 0.9))).normalized(), 0.009, 0.04 + 0.015 * L, BRI, lados=4, ponta=0.6, achatar=0.5)
        if cls == 'mago':
            M.grade([[m.p(P, i, frente + dd, 0.016) for dd in (-0.07, 0.07)] for i in [alto + (n - 1 - alto) * k / 6 for k in range(7)]], ACA)
            i = alto + 1.2
            M.cristal(m.p(P, i, frente, 0.028), m.normal(P, i, frente), 0.01 + 0.003 * L, 0.02, BRI, lados=4, ponta=0.5, lado_ref=Vector((0, 0, 1)), achatar=0.6)
        if cls == 'patrulheiro':
            for k in range(10 + 4 * L):
                i = alto + r.uniform(0, 3.5)
                a = r.uniform(0, TAU)
                nn = m.normal(P, i, a)
                M.folha(m.p(P, i, a, 0.03), (Vector((0, 0, -1)) + nn * 0.3).normalized(), nn, r.uniform(0.05, 0.08), 0.03, FOLHA)
            caminho = [m.p(P, alto + 0.2, TAU * j / 12, 0.03) for j in range(13)]
            M.tubo(caminho, 0.016, 5, PELO, fechar=False)
    return M


def amuleto(m, E):
    M = Malha()
    cls, L = E['classe'], E['L']
    T = 'tronco'
    nt = m.n(T)
    ip = nt - 9.5
    pend = m.p(T, ip, 0.0, 0.03)
    n = m.normal(T, ip, 0.0)
    cima = Vector((0, 0, 1))
    lado = n.cross(cima).normalized()
    # corrente: da gola em volta do pescoço até o pingente
    pescoco = [m.p(T, nt - 1.6, TAU * (j / 20) + 0.6, 0.018) for j in range(int(20 * (TAU - 1.2) / TAU) + 1)]
    desce = [m.p(T, nt - 1.6 - (nt - 1.6 - ip - 1.2) * f, 0.6 * (1 - f) + 0.06 * f, 0.02 + 0.01 * f) for f in (0.2, 0.45, 0.7, 0.9)]
    desce2 = [m.p(T, nt - 1.6 - (nt - 1.6 - ip - 1.2) * f, -0.6 * (1 - f) - 0.06 * f, 0.02 + 0.01 * f) for f in (0.9, 0.7, 0.45, 0.2)]
    M.tubo(desce2 + pescoco + desce, 0.0035, 5, ACA, fechar=False)
    k = 1.6 + 0.35 * L
    c = pend + n * 0.012
    if cls in ('mago', 'guardiao'):
        R0 = 0.026 * k
        aro = [c + (lado * math.cos(TAU * j / 20) + cima * math.sin(TAU * j / 20)) * R0 for j in range(21)]
        M.tubo(aro, 0.005 * k, 6, ACA, fechar=False)
        M.cristal(c - n * 0.006, n, 0.015 * k, 0.022 * k, BRI, lados=8, ponta=0.5)
        for j in range(4 + 4 * L):
            a = TAU * j / (4 + 4 * L) + math.pi / 4
            d = lado * math.cos(a) + cima * math.sin(a)
            M.ponta(c + d * R0, d, 0.004 * k, 0.012 * k, 4, ACA)
    elif cls == 'guerreiro':
        R0 = 0.028 * k
        aro = [c + (lado * math.cos(TAU * j / 4) * 0.7 + cima * math.sin(TAU * j / 4)) * R0 for j in range(5)]
        M.tubo(aro, 0.005 * k, 4, ACA, fechar=False)
        M.cristal(c - cima * R0 * 0.8, cima, 0.012 * k, R0 * 1.8, BRI, lados=4, ponta=0.45, lado_ref=n, achatar=0.5)
        for sg in (1, -1):
            M.ponta(c + lado * sg * R0 * 0.7, lado * sg, 0.005 * k, 0.03 * k, 4, ACA)
    elif cls == 'assassino':
        M.cristal(c + cima * 0.02 * k, -cima, 0.011 * k, 0.07 * k, BRI, lados=4, ponta=0.4, lado_ref=n, achatar=0.5)
        for sg in (1, -1):
            pts = [c + cima * 0.012 * k + (lado * sg * (0.012 + 0.012 * q) + cima * (0.006 * q - 0.002 * q * q)) * k for q in range(5)]
            M.tubo(pts, lambda q: 0.004 * k * (1 - q / 5), 4, ACA)
    else:
        M.cristal(c + cima * 0.022 * k, -cima, 0.012 * k, 0.055 * k, BRI, lados=6, ponta=0.35)
        for sg in (1, -1):
            for q in range(1 + L):
                base = c + cima * 0.02 * k + lado * sg * 0.008
                M.ponta(base, (cima + lado * sg * (0.6 + 0.3 * q)).normalized(), 0.003 * k, 0.04 * k, 4, ACA)
        aro = [c + (lado * math.cos(TAU * j / 16) * 0.8 + cima * math.sin(TAU * j / 16)) * 0.024 * k for j in range(17)]
        M.tubo(aro, 0.0035 * k, 5, ACA, fechar=False)
    return M


CONSTRUTORES = {'peitoral': peitoral, 'ombros': ombreiras, 'capa': capa, 'capacete': capuz, 'luvas': luvas, 'calcas': calcas, 'botas': botas, 'acessorio': amuleto}
ORDEM = ['peitoral', 'ombros', 'capa', 'capacete', 'luvas', 'calcas', 'botas', 'acessorio']


# ============================================================ montagem, textura, exportação
def peca(classe, nivel, vaga, lado_tex=512, previa=True):
    D = json.load(open(MOLDES, encoding='utf-8'))
    E = estilo(classe, nivel)
    info = E['paleta']['pecas'][vaga]
    U.limpar_cena()
    malhas = {cid: CONSTRUTORES[vaga](Molde(D[cid]), E) for cid in ('corpo_m', 'corpo_f')}
    a, b = malhas['corpo_m'], malhas['corpo_f']
    assert len(a.V) == len(b.V) and a.F == b.F, f'{classe} {nivel} {vaga}: a malha mudou entre os corpos'
    nome = os.path.splitext(os.path.basename(info['imagem']))[0]
    ob = a.objeto(U.nome_limpo(nome))
    usados = sorted(set(a.M))
    mats = [U.material_procedural(f'{ob.name}_{k}', E['mats'][k] or E['mats'][0], semente=nivel + k, bisel=0.004) for k in range(max(usados) + 1)]
    for mt in mats:
        ob.data.materials.append(mt)
    # forma do corpo feminino: shape key
    U.ativar(ob)
    ob.shape_key_add(name='Basis')
    kf = ob.shape_key_add(name='corpo_f')
    for k, p in enumerate(b.V):
        kf.data[k].co = p
    # normais: lisas com quinas vivas (sem modificador: a shape key exporta)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(38))
    tris = U.contar_tris([ob])
    U.assar(ob, lado_tex, amostras_ao=16)
    U.limpar_sobras()
    pasta = os.path.join(U.RAIZ, os.path.dirname(info['imagem']))
    glb = U.exportar_glb(os.path.join(pasta, nome + '.glb'), [ob], imagens='JPEG')
    prev = U.renderizar_previa(os.path.join(PREVIAS, f'n{nivel}_{classe}_{vaga}.png'), [ob], lado=320, amostras=16,
                               angulo=(70, 0, 160) if vaga == 'capa' else (84, 0, 8) if vaga == 'acessorio' else (70, 0, 20)) if previa else None
    return U.registrar(f'armadura_n{nivel}_{classe}_{vaga}', 'armadura', glb, prev, [ob],
                       extra=dict(classe=classe, nivel=nivel, vaga=vaga, peca=info['nome'], imagem=info['imagem'], tris=tris, orcamento=TRI_MAX[vaga], texturas=f'{lado_tex}px assadas'))


REAIS = os.path.join(AQUI, 'armaduras_reais.json')


def gerar(classe, nivel, so=None):
    """As oito peças do conjunto (ou só as pedidas), menos as que vêm prontas em GLB realista
    (armaduras_reais.json: o conversor usa o arquivo pronto no lugar)."""
    prontas = json.load(open(REAIS, encoding='utf-8')).get(classe, {}).get(str(nivel), {}) if os.path.exists(REAIS) else {}
    out = []
    for vaga in ORDEM:
        if (so and vaga not in so) or vaga in prontas:
            continue
        out.append(peca(classe, nivel, vaga))
    return out
