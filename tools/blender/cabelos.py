"""Cabelos com movimento feitos no Blender (a opção "Cabelo com física" da criação de personagem).

Dez cortes — curto, médio, longo, espetado, ondulado, coque, rabo de cavalo, tranças, franja e
repicado — montados em mechas e camadas sobre a cabeça medida dos dois corpos do jogo
(moldes_corpo.json, de medir_corpos.py), com cadeias de ossos para a física do jogo.

Como cada corte é feito
- A touca: uma casca fina sobre o couro cabeludo (cobre a cabeça entre as mechas).
- As mechas: fitas grossas (seção em losango achatado) que nascem na casca e seguem o penteado (o
  fluxo do corte: para trás, para os lados da risca, para a frente na franja, para cima no
  espetado, até o laço no rabo, no coque e nas tranças) encostadas na cabeça; depois caem com o
  peso, desviando da cabeça, do pescoço, das costas e dos ombros. Duas ou três camadas por corte,
  com comprimentos e larguras sorteados, ondas no ondulado e pontas afinando.
- Rabo de cavalo, coque e tranças: as mechas do couro cabeludo vão até o laço; dali sai o rabo
  (mechas penduradas), o coque (mechas enroladas) ou as tranças (três mechas que se cruzam).
- Os ossos: cadeias (cab<k>_<j>) ao longo das partes soltas, presas à cabeça ('head'); o que fica
  encostado na cabeça segue só a cabeça. No jogo, js/criacao/cabelo_fisica.js move as cadeias
  (molas com inércia, peso, vento, limites e colisão com a cabeça, o pescoço e os ombros).
- A mesma malha nos dois corpos (as mesmas regras e os mesmos sorteios): a forma do corpo feminino
  numa shape key ('corpo_f'), como as armaduras (armaduras.py).
- A textura de fios é feita aqui (numpy): cada mecha tem a UV ao longo do comprimento, e os fios
  da textura correm com ela; castanho neutro (o jogo tinge com a cor escolhida), raiz mais escura,
  pontas mais claras, o relevo dos fios no mapa de normais.

Saídas (assets/Criar_Personagem/Cabelo_Fisica/)
- <corte>.glb: a malha com a shape key, as texturas e os pesos dos ossos como atributos dos
  vértices (_W0 a _W3: índice do osso na lista do JSON + o peso na parte fracionária);
- <corte>.json: os ossos, as cadeias (as juntas nos dois corpos, em metros, eixos do Blender) e os
  parâmetros da física;
- cabelos_demo.blend: a cena de demonstração com os cortes em cabeças de manequim, cada um com a
  armadura (as cadeias) e os grupos de vértices, e uma animação da cabeça girando e balançando com
  as cadeias simuladas pelo mesmo algoritmo do jogo;
- <corte>.png: a prévia num manequim (a miniatura da tela de criação).
Rode com o módulo bpy (ou dentro do Blender):  python3 tools/blender/cabelos.py [corte ...]

Eixos (Blender): frente do personagem para −Y, lado direito dele para −X, Z para cima, metros.
"""
import json
import math
import os
import random
import sys

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import utils as U                      # noqa: E402
from armaduras import Molde, suave     # noqa: E402

MOLDES = os.path.join(AQUI, 'moldes_corpo.json')
PASTA = os.path.join(U.RAIZ, 'assets', 'Criar_Personagem', 'Cabelo_Fisica')
TAU = 2 * math.pi
FRENTE, TRAS, CIMA, BAIXO = Vector((0, -1, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)), Vector((0, 0, -1))
LADO_TEX = 512
FAIXAS = 8                             # colunas da textura (variações de fios); a última é da touca
CORTES_ORDEM = ['curto', 'medio', 'longo', 'espetado', 'ondulado', 'coque', 'rabo', 'trancas', 'franja', 'repicado']


# ============================================================ a cabeça e o corpo medidos
class Corpo:
    """A cabeça (casca em latitude/longitude) e os tubos do tronco e dos braços de um corpo, para
    as mechas nascerem e desviarem."""
    def __init__(self, cid, d):
        self.cid = cid
        self.m = Molde(d)
        self.C = Vector(self.m.H['centro'])
        self.z_queixo = self.m.H['queixo']
        self.nt = self.m.n('tronco')
        self.topo_tronco = self.m.anel('tronco', self.nt - 1)['c'].z

    def casca(self, la, lo, off=0.0):
        return self.m.cabeca(la, lo, off)

    def latlon(self, P):
        d = P - self.C
        r = d.length or 1e-9
        d = d / r
        return math.degrees(math.asin(max(-1.0, min(1.0, d.z)))), math.degrees(math.atan2(-d.x, -d.y)), r

    def raio(self, la, lo):
        return (self.m.cabeca(la, lo, 0.0)[0] - self.C).length

    def fora_da_cabeca(self, P, folga):
        la, lo, r = self.latlon(P)
        if la < -58:
            return P
        R = self.raio(la, lo) + folga
        return self.C + (P - self.C).normalized() * R if r < R else P

    def fora_do_tubo(self, P, tb, i, folga):
        A = self.m.anel(tb, i)
        q = P - A['c']
        ao_longo = q.dot(A['t'])
        qp = q - A['t'] * ao_longo
        a = math.atan2(qp.dot(A['v']), qp.dot(A['u']))
        rs = self.m.raio(A['r'], a) + folga
        if qp.length < rs:
            return A['c'] + A['t'] * ao_longo + (qp.normalized() if qp.length > 1e-9 else A['u']) * rs
        return P

    def empurrar(self, P, folga):
        """Põe o ponto para fora da cabeça, do pescoço, das costas e do alto dos braços."""
        P = self.fora_da_cabeca(P, folga)
        if P.z < self.topo_tronco + 0.01:
            i = self.m.indice_z('tronco', P.z)
            if 0 < i < self.nt - 1 or abs(P.z - self.topo_tronco) < 0.02:
                P = self.fora_do_tubo(P, 'tronco', min(i, self.nt - 1.001), folga)
        for tb in ('bracoR', 'bracoL'):
            n = self.m.n(tb)
            i = self.m.indice(tb, P)
            if i < 0.45 * n and (self.m.anel(tb, i)['c'] - P).length < 0.12:
                P = self.fora_do_tubo(P, tb, i, folga)
        return P

    def linha_do_cabelo(self, lo):
        """Latitude mínima do couro cabeludo em cada longitude (testa, têmporas, orelhas, nuca)."""
        a = abs(lo)
        if a <= 25:
            return 42
        if a <= 70:
            return 42 - (a - 25) / 45 * 24
        if a <= 110:
            return 18 - (a - 70) / 40 * 14
        return 4 - (a - 110) / 70 * 52


# ============================================================ fluxos (o penteado)
def fluxo(tipo, corpo, P, alvo=None):
    C = corpo.C
    if tipo == 'tras':
        return (TRAS * 0.8 + BAIXO * 0.6).normalized()
    if tipo == 'risca':
        lado = 1.0 if P.x >= C.x else -1.0
        return (Vector((lado, 0, 0)) * 0.85 + BAIXO * 0.55 + TRAS * 0.2).normalized()
    if tipo == 'frente':
        return (FRENTE * 0.75 + BAIXO * 0.65).normalized()
    if tipo == 'cima':
        n = (P - C).normalized()
        return (n * 0.55 + CIMA * 0.6 + TRAS * 0.35).normalized()
    if tipo == 'laco':
        d = alvo - P
        return d.normalized() if d.length > 1e-6 else BAIXO
    if tipo == 'baixo':
        return BAIXO
    raise ValueError(tipo)


def crescer(corpo, P0, D0, comp, tipo, folga, rig=0.0, peso=0.35, passo=0.01, alvo=None, fim_no_alvo=False):
    """Caminho da mecha: segue o fluxo encostada na cabeça e cai com o peso (rig: quanto ela resiste
    a cair), desviando do corpo. Devolve os pontos (a cada 'passo' metros)."""
    P, D = P0.copy(), D0.normalized()
    pts = [P.copy()]
    s = 0.0
    while s < comp - 1e-9:
        la, lo, r = corpo.latlon(P)
        perto = la > -58 and r < corpo.raio(la, lo) + folga + 0.02
        F = fluxo(tipo, corpo, P, alvo)
        f = 0.55 if perto or tipo in ('laco', 'cima') else 0.12
        D = (D * (1 - f) + F * f + BAIXO * peso * (1 - rig)).normalized()
        Q = corpo.empurrar(P + D * passo, folga)
        if (Q - P).length > 1e-6:
            D = (Q - P).normalized()
        P = Q
        pts.append(P.copy())
        s += passo
        if fim_no_alvo and alvo is not None and (P - alvo).length < passo * 1.5:
            break
    return pts


def ondular(pts, corpo, amp, onda, fase):
    """Ondas: desloca a mecha de lado, crescendo da raiz para a ponta."""
    out = [pts[0]]
    s = 0.0
    for k in range(1, len(pts)):
        s += (pts[k] - pts[k - 1]).length
        t = (pts[min(k + 1, len(pts) - 1)] - pts[k - 1]).normalized()
        o = Vector((pts[k].x - corpo.C.x, pts[k].y - corpo.C.y, 0))
        lat = t.cross(o).normalized() if o.length > 1e-6 and t.cross(o).length > 1e-6 else Vector((1, 0, 0))
        out.append(pts[k] + lat * amp * suave(0.0, 0.06, s) * math.sin(TAU * s / onda + fase))
    return out


def comprimento(pts):
    return sum((pts[k] - pts[k - 1]).length for k in range(1, len(pts)))


def reamostrar(pts, n):
    """n pontos igualmente espaçados ao longo da polilinha (e o comprimento de cada um)."""
    acc = [0.0]
    for k in range(1, len(pts)):
        acc.append(acc[-1] + (pts[k] - pts[k - 1]).length)
    L = acc[-1] or 1e-9
    out, ss = [], []
    j = 0
    for q in range(n):
        s = L * q / (n - 1)
        while j < len(acc) - 2 and acc[j + 1] < s:
            j += 1
        f = (s - acc[j]) / ((acc[j + 1] - acc[j]) or 1e-9)
        out.append(pts[j].lerp(pts[j + 1], max(0.0, min(1.0, f))))
        ss.append(s)
    return out, ss


# ============================================================ malha (com UV por canto e pesos)
class Malha:
    def __init__(self):
        self.V, self.F, self.UV, self.W = [], [], [], []

    def v(self, p, w):
        self.V.append((p.x, p.y, p.z))
        self.W.append(w)
        return len(self.V) - 1

    def face(self, idx, uvs):
        self.F.append(tuple(idx))
        self.UV.append(tuple(uvs))

    def tris(self):
        return sum(len(f) - 2 for f in self.F)


def faixa_uv(k, u, v):
    """UV na coluna k da textura (u de 0 a 1 na largura, v de 0 a 1 da raiz à ponta)."""
    m = 1.5 / LADO_TEX
    return ((k + m * FAIXAS + u * (1 - 2 * m * FAIXAS)) / FAIXAS, m + v * (1 - 2 * m))


def fita(M, corpo, pts, larg, esp, pesos, faixa, afina=0.85, ponta=1.6, achata=None):
    """Mecha: anéis em losango achatado ao longo de pts (largura larg na raiz, afinando para a
    ponta), a última vira ponta. pesos(s, k) → {osso: peso} de cada anel."""
    n = len(pts)
    L = comprimento(pts) or 1e-9
    aneis, ss = [], [0.0]
    for k in range(1, n):
        ss.append(ss[-1] + (pts[k] - pts[k - 1]).length)
    for k, P in enumerate(pts):
        t = (pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]).normalized()
        o = P - corpo.C if P.z > corpo.z_queixo else Vector((P.x - corpo.C.x, P.y - corpo.C.y, 0))
        o = o - t * o.dot(t)
        if o.length < 1e-6:
            o = t.orthogonal()
        o.normalize()
        u = t.cross(o).normalized()
        f = ss[k] / L
        w = 0.5 * larg * max(0.04, 1 - afina * f ** ponta)        # meia largura
        h = w * (achata if achata is not None else esp)
        P = P + o * h * 0.5                                    # a mecha se apoia por baixo
        W = pesos(ss[k], k)
        if k == n - 1:
            aneis.append([M.v(P + t * w * 0.6, W)])
        else:
            aneis.append([M.v(P + u * w, W), M.v(P + o * h, W), M.v(P - u * w, W), M.v(P - o * h, W)])
    us = [0.0, 0.25, 0.5, 0.75, 1.0]
    for k in range(n - 1):
        a, b = aneis[k], aneis[k + 1]
        va, vb = ss[k] / L, ss[k + 1] / L
        if len(b) == 1:
            for j in range(4):
                M.face([a[j], a[(j + 1) % 4], b[0]], [faixa_uv(faixa, us[j], va), faixa_uv(faixa, us[j + 1], va), faixa_uv(faixa, (us[j] + us[j + 1]) / 2, vb)])
        else:
            for j in range(4):
                M.face([a[j], a[(j + 1) % 4], b[(j + 1) % 4], b[j]], [faixa_uv(faixa, us[j], va), faixa_uv(faixa, us[j + 1], va), faixa_uv(faixa, us[j + 1], vb), faixa_uv(faixa, us[j], vb)])


def touca(M, corpo, folga, pesos):
    """Casca fina sobre o couro cabeludo (da linha do cabelo para cima), na última coluna da textura."""
    LON = list(range(-180, 180, 12))
    LAT = [i for i in range(-36, 91, 9)]
    ids = []
    for la in LAT:
        linha = []
        for lo in LON:
            lim = corpo.linha_do_cabelo(lo) - 4
            p, _ = corpo.casca(max(la, lim) if la < 90 else 90, lo, folga)
            linha.append(M.v(p, pesos(0.0, 0)))
        ids.append(linha)
    nl, nc = len(LAT), len(LON)
    for i in range(nl - 1):
        for j in range(nc):
            j2 = (j + 1) % nc
            u0, u1 = j / nc, (j + 1) / nc
            v0, v1 = 1 - i / (nl - 1), 1 - (i + 1) / (nl - 1)
            M.face([ids[i][j], ids[i + 1][j], ids[i + 1][j2], ids[i][j2]],
                   [faixa_uv(FAIXAS - 1, u0, v0), faixa_uv(FAIXAS - 1, u0, v1), faixa_uv(FAIXAS - 1, u1, v1), faixa_uv(FAIXAS - 1, u1, v0)])


# ============================================================ os cortes
# camada: n mechas, comp (min, máx) em metros, larg (min, máx), esp (espessura/largura), fluxo,
# folga (afastamento da cabeça), rig (resiste ao peso), lift (sobe na raiz), região do couro
# cabeludo (la mínima a mais que a linha do cabelo, faixa de longitudes), ondas (amp, onda)
# cadeias: longitudes (graus; 0 = frente, ±180 = nuca) das cadeias de ossos das partes soltas
def corte(nome):
    C = dict(
        curto=dict(nome='Curto', camadas=[dict(n=150, comp=(0.035, 0.06), larg=(0.011, 0.016), esp=0.3, fluxo='tras', folga=0.004, rig=0.55, lift=0.12),
                                          dict(n=80, comp=(0.03, 0.05), larg=(0.01, 0.014), esp=0.3, fluxo='tras', folga=0.009, rig=0.55, lift=0.18, la_min=20)],
                   cadeias=[], fisica=None),
        medio=dict(nome='Médio', camadas=[dict(n=70, comp=(0.13, 0.17), larg=(0.02, 0.028), esp=0.38, fluxo='risca', folga=0.006, lift=0.25),
                                          dict(n=46, comp=(0.10, 0.15), larg=(0.018, 0.026), esp=0.38, fluxo='risca', folga=0.013, lift=0.35, la_min=15)],
                   cadeias=[180, 135, -135, 95, -95], fisica=dict(rigidez=0.35, amortecimento=0.14, peso=1.0, limite=60)),
        longo=dict(nome='Longo', camadas=[dict(n=80, comp=(0.40, 0.48), larg=(0.022, 0.03), esp=0.34, fluxo='risca', folga=0.006, lift=0.2),
                                          dict(n=50, comp=(0.32, 0.44), larg=(0.02, 0.028), esp=0.34, fluxo='risca', folga=0.014, lift=0.3, la_min=15)],
                   cadeias=[180, 145, -145, 112, -112, 82, -82], fisica=dict(rigidez=0.22, amortecimento=0.1, peso=1.0, limite=75)),
        espetado=dict(nome='Espetado', camadas=[dict(n=70, comp=(0.06, 0.09), larg=(0.02, 0.028), esp=0.5, fluxo='cima', folga=0.006, rig=0.95, lift=0.6, afina=1.0, ponta=1.0),
                                                dict(n=110, comp=(0.03, 0.05), larg=(0.011, 0.015), esp=0.3, fluxo='tras', folga=0.004, rig=0.6, lift=0.12)],
                      cadeias=[], fisica=None),
        ondulado=dict(nome='Ondulado', camadas=[dict(n=72, comp=(0.24, 0.30), larg=(0.024, 0.032), esp=0.36, fluxo='risca', folga=0.008, lift=0.35, ondas=(0.014, 0.075)),
                                                dict(n=46, comp=(0.18, 0.26), larg=(0.022, 0.03), esp=0.36, fluxo='risca', folga=0.017, lift=0.45, la_min=15, ondas=(0.016, 0.07))],
                      cadeias=[180, 140, -140, 100, -100], fisica=dict(rigidez=0.3, amortecimento=0.12, peso=1.0, limite=65)),
        coque=dict(nome='Coque', laco=(48, 180, 0.02), camadas=[dict(n=140, comp=(0.25, 0.25), larg=(0.011, 0.015), esp=0.3, fluxo='laco', folga=0.004, lift=0.02)],
                   coque=True, cadeias=[], fisica=None),
        rabo=dict(nome='Rabo de cavalo', laco=(18, 180, 0.018), camadas=[dict(n=140, comp=(0.25, 0.25), larg=(0.011, 0.015), esp=0.3, fluxo='laco', folga=0.004, lift=0.02)],
                  rabo=dict(n=26, comp=(0.30, 0.38), larg=(0.02, 0.026)), cadeias=['rabo'], fisica=dict(rigidez=0.15, amortecimento=0.09, peso=1.0, limite=85)),
        trancas=dict(nome='Tranças', lacos=((-12, 128, 0.016), (-12, -128, 0.016)), camadas=[dict(n=140, comp=(0.25, 0.25), larg=(0.011, 0.015), esp=0.3, fluxo='laco', folga=0.004, lift=0.02)],
                     trancas=dict(comp=0.34, larg=0.014), cadeias=['tranca0', 'tranca1'], fisica=dict(rigidez=0.2, amortecimento=0.1, peso=1.2, limite=80)),
        franja=dict(nome='Franja', camadas=[dict(n=64, comp=(0.13, 0.17), larg=(0.02, 0.028), esp=0.38, fluxo='risca', folga=0.006, lift=0.25, lo_fora=(-40, 40)),
                                            dict(n=26, comp=(0.06, 0.08), larg=(0.02, 0.026), esp=0.4, fluxo='frente', folga=0.022, lift=0.5, lo=(-42, 42), la_min=4, la_max=82),
                                            dict(n=36, comp=(0.10, 0.15), larg=(0.018, 0.026), esp=0.38, fluxo='risca', folga=0.013, lift=0.35, la_min=15, lo_fora=(-40, 40))],
                    cadeias=['franja', 180, 130, -130, 92, -92], fisica=dict(rigidez=0.38, amortecimento=0.14, peso=1.0, limite=55)),
        repicado=dict(nome='Repicado', camadas=[dict(n=64, comp=(0.28, 0.38), larg=(0.022, 0.03), esp=0.34, fluxo='risca', folga=0.006, lift=0.25, afina=0.95, ponta=1.2),
                                                dict(n=48, comp=(0.18, 0.28), larg=(0.02, 0.028), esp=0.34, fluxo='risca', folga=0.013, lift=0.35, la_min=12, afina=0.95, ponta=1.2),
                                                dict(n=32, comp=(0.10, 0.17), larg=(0.018, 0.026), esp=0.34, fluxo='risca', folga=0.019, lift=0.45, la_min=30, afina=0.95, ponta=1.1)],
                       cadeias=[180, 140, -140, 102, -102, 80, -80], fisica=dict(rigidez=0.27, amortecimento=0.12, peso=1.0, limite=70)),
    )
    return C[nome]


# ============================================================ raízes, cadeias e pesos
def raizes(corpo, cam, rng):
    """Raízes de uma camada no couro cabeludo: pontos bem espalhados (espiral de Fibonacci) da
    região da camada, com um sorteio pequeno de posição."""
    n = cam['n']
    out = []
    N = n * 5
    for i in range(N):
        z = 1 - (i + 0.5) / N * 1.6
        if z < -0.6:
            break
        la = math.degrees(math.asin(max(-1, min(1, z))))
        lo = ((i * 137.508) % 360) - 180
        lim = corpo.linha_do_cabelo(lo) + cam.get('la_min', 0)
        if la < lim or la > cam.get('la_max', 91):
            continue
        if 'lo' in cam and not (cam['lo'][0] <= lo <= cam['lo'][1]):
            continue
        if 'lo_fora' in cam and cam['lo_fora'][0] <= lo <= cam['lo_fora'][1] and la < 70:
            continue
        out.append((la, lo))
    rng.shuffle(out)
    out = sorted(out[:n], key=lambda x: (-x[0], x[1]))
    return [(la + rng.uniform(-2.5, 2.5), lo + rng.uniform(-3, 3)) for la, lo in out]


def ponto_solto(corpo, pts, extra=0.012):
    """Comprimento ao longo da mecha onde ela deixa a cabeça (abaixo da orelha ou afastada)."""
    s = 0.0
    for k in range(1, len(pts)):
        s += (pts[k] - pts[k - 1]).length
        P = pts[k]
        la, lo, r = corpo.latlon(P)
        if P.z < corpo.C.z - 0.03 or la < -50 or r > corpo.raio(la, lo) + extra + 0.02:
            return s
    return s


def lon_horizontal(corpo, P):
    return math.degrees(math.atan2(-(P.x - corpo.C.x), -(P.y - corpo.C.y)))


def dang(a, b):
    return abs((a - b + 180) % 360 - 180)


def pesos_cadeia(s, solta, nb, seg, cad):
    """{osso: peso} de um ponto a s metros da raiz, numa cadeia de nb ossos de seg metros que
    começa a 'solta' metros: perto das juntas mistura os dois ossos vizinhos; a transição da cabeça
    para a cadeia é suave."""
    r = s - solta
    if r <= 0:
        return {'head': 1.0}
    hb = suave(0.0, 0.03, r)
    f = r / seg
    j = min(int(f), nb - 1)
    t = min(f - j, 1.0)
    w = {}
    w[f'cab{cad}_{j}'] = 1.0
    if t > 0.5 and j + 1 < nb:
        x = (t - 0.5) / 0.5 * 0.5
        w[f'cab{cad}_{j}'] -= x
        w[f'cab{cad}_{j + 1}'] = x
    elif t < 0.5 and j > 0:
        x = (0.5 - t) / 0.5 * 0.5
        w[f'cab{cad}_{j}'] -= x
        w[f'cab{cad}_{j - 1}'] = x
    out = {k: v * hb for k, v in w.items()}
    out['head'] = out.get('head', 0.0) + (1 - hb)
    return out


def misturar(*pares):
    out = {}
    for f, w in pares:
        for k, v in w.items():
            out[k] = out.get(k, 0.0) + f * v
    return out


# ============================================================ montagem de um corte num corpo
SEG_OSSO = 0.07


def montar(nome, corpo, semente=7, plano=None):
    """A malha do corte neste corpo (Malha), as cadeias {nome: dict(juntas, nb, seg, solta)} e o
    plano (ossos por cadeia): o segundo corpo usa o plano do primeiro, e a malha sai igual (as
    contagens de anéis só dependem dos sorteios, não do caminho medido)."""
    E = corte(nome)
    rng = random.Random(semente + sum(map(ord, nome)))
    M = Malha()
    cadeias = {}

    def guia(lo, comp, tipo, cam):
        la0 = max(corpo.linha_do_cabelo(lo) + 6, 30 if abs(lo) > 100 else 40)
        P0, d0 = corpo.casca(la0, lo, cam['folga'])
        D0 = fluxo(tipo, corpo, P0) + d0 * cam.get('lift', 0.2)
        return crescer(corpo, P0, D0, comp, tipo, cam['folga'], cam.get('rig', 0.0))

    plano = plano if plano is not None else {}

    def nova_cadeia(chave, pts, solta):
        L = comprimento(pts)
        nb = plano.setdefault(chave, max(2, min(6, int((L - solta) / SEG_OSSO + 0.5))))
        seg = (L - solta) / nb
        acc, juntas = 0.0, []
        alvos = [solta + seg * j for j in range(nb + 1)]
        q = 0
        for k in range(1, len(pts)):
            d = (pts[k] - pts[k - 1]).length
            while q < len(alvos) and acc + d >= alvos[q] - 1e-9:
                f = (alvos[q] - acc) / (d or 1e-9)
                juntas.append(pts[k - 1].lerp(pts[k], max(0, min(1, f))))
                q += 1
            acc += d
        while len(juntas) < nb + 1:
            juntas.append(pts[-1].copy())
        cadeias[chave] = dict(k=len(cadeias), juntas=juntas, nb=nb, seg=seg, solta=solta)
        return cadeias[chave]

    # cadeias das partes soltas (guias crescidas com as regras da primeira camada)
    cam0 = E['camadas'][0]
    for c in E['cadeias']:
        if isinstance(c, (int, float)):
            pts = guia(c, cam0['comp'][1], cam0['fluxo'], cam0)
            nova_cadeia(c, pts, ponto_solto(corpo, pts))
        elif c == 'franja':
            cf = E['camadas'][1]
            P0, d0 = corpo.casca(70, 0, cf['folga'])
            pts = crescer(corpo, P0, fluxo('frente', corpo, P0) + d0 * cf['lift'], cf['comp'][1], 'frente', cf['folga'])
            nova_cadeia('franja', pts, 0.03)
    fis = E.get('fisica')

    def peso_por_angulo(s, solta, lo_s):
        """Mistura das duas cadeias de longitude mais perto."""
        num = [c for c in cadeias if isinstance(c, (int, float))]
        if not num:
            return {'head': 1.0}
        d = sorted(num, key=lambda c: dang(c, lo_s))
        a, b = d[0], d[1] if len(d) > 1 else d[0]
        da, db = dang(a, lo_s), dang(b, lo_s)
        f = da / (da + db) if da + db > 1e-6 else 0.0
        A, B = cadeias[a], cadeias[b]
        return misturar((1 - f, pesos_cadeia(s, solta, A['nb'], A['seg'], A['k'])), (f, pesos_cadeia(s, solta, B['nb'], B['seg'], B['k'])))

    cabeca = lambda s, k: {'head': 1.0}
    touca(M, corpo, 0.003, cabeca)
    lacos = []
    if 'laco' in E:
        lacos = [corpo.casca(E['laco'][0], E['laco'][1], E['laco'][2])[0]]
    if 'lacos' in E:
        lacos = [corpo.casca(la, lo, f)[0] for la, lo, f in E['lacos']]
    for ci, cam in enumerate(E['camadas']):
        for la, lo in raizes(corpo, cam, rng):
            comp = rng.uniform(*cam['comp'])
            larg = rng.uniform(*cam['larg'])
            P0, d0 = corpo.casca(la, lo, cam['folga'])
            if cam['fluxo'] == 'laco':
                alvo = min(lacos, key=lambda T: (T - P0).length)
                D0 = (alvo - P0).normalized() + d0 * cam['lift']
                pts = crescer(corpo, P0, D0, 0.3, 'laco', cam['folga'], 0.0, peso=0.0, alvo=alvo, fim_no_alvo=True)
                if len(pts) < 2:
                    pts = [P0, alvo]
            else:
                D0 = fluxo(cam['fluxo'], corpo, P0) + d0 * cam.get('lift', 0.2)
                pts = crescer(corpo, P0, D0, comp, cam['fluxo'], cam['folga'], cam.get('rig', 0.0))
            if 'ondas' in cam:
                pts = ondular(pts, corpo, cam['ondas'][0], cam['ondas'][1] * rng.uniform(0.85, 1.15), rng.uniform(0, TAU))
            L = comprimento(pts)
            n = 6 if cam['fluxo'] == 'laco' else max(3, min(14, int(comp / 0.028) + 2))
            pts, _ = reamostrar(pts, n)
            if not cadeias or cam['fluxo'] in ('laco', 'cima'):
                pes = cabeca
            elif cam['fluxo'] == 'frente' and 'franja' in cadeias:
                F_ = cadeias['franja']
                pes = (lambda F_: lambda s, k: pesos_cadeia(s, 0.03, F_['nb'], F_['seg'], F_['k']))(F_)
            else:
                solta = ponto_solto(corpo, pts)
                k_s = min(len(pts) - 1, max(1, int(solta / (L / (n - 1)))))
                lo_s = lon_horizontal(corpo, pts[k_s])
                pes = (lambda solta, lo_s: lambda s, k: peso_por_angulo(s, solta, lo_s))(solta, lo_s)
            fita(M, corpo, pts, larg, cam['esp'], pes, rng.randrange(FAIXAS - 1), cam.get('afina', 0.85), cam.get('ponta', 1.6))
    # rabo de cavalo: o laço (mecha enrolada) e o rabo pendurado
    if 'rabo' in E:
        T = lacos[0]
        R = E['rabo']
        n_ = (T - corpo.C).normalized()
        pts_g = crescer(corpo, T + n_ * 0.01, (TRAS * 0.6 + BAIXO * 0.6), R['comp'][1], 'baixo', 0.02, 0.0, peso=0.25)
        cad = nova_cadeia('rabo', pts_g, 0.0)
        enrolar(M, T, n_, 0.022, 0.012, cabeca)
        u_ = n_.orthogonal().normalized()
        w_ = n_.cross(u_)
        for i in range(R['n']):
            a = TAU * i / R['n'] + rng.uniform(-0.2, 0.2)
            rr = 0.012 * math.sqrt(rng.uniform(0.15, 1))
            P0 = T + n_ * 0.006 + (u_ * math.cos(a) + w_ * math.sin(a)) * rr
            comp = rng.uniform(*R['comp'])
            pts = crescer(corpo, P0, (TRAS * 0.6 + BAIXO * 0.6 + (u_ * math.cos(a) + w_ * math.sin(a)) * 0.25), comp, 'baixo', 0.02 + rr * 0.6, 0.0, peso=0.25)
            pts, _ = reamostrar(pts, max(4, min(14, int(comp / 0.03) + 2)))
            pes = (lambda c: lambda s, k: pesos_cadeia(s, -0.03, c['nb'], c['seg'], c['k']))(cad)
            fita(M, corpo, pts, rng.uniform(*R['larg']), 0.4, pes, rng.randrange(FAIXAS - 1), 0.85, 1.4)
    # coque: mechas enroladas em volta do laço
    if E.get('coque'):
        T = lacos[0]
        n_ = (T - corpo.C).normalized()
        for i in range(9):
            enrolar(M, T + n_ * (0.008 + 0.005 * (i % 3)), n_, 0.026 + 0.006 * (i % 3) + rng.uniform(-0.003, 0.003), 0.016, cabeca, giro=rng.uniform(0, TAU), incl=rng.uniform(-0.5, 0.5), faixa=i % (FAIXAS - 1))
    # tranças: três mechas que se cruzam, do laço atrás da orelha até a ponta, com o laço e o tufo
    if 'trancas' in E:
        Tr = E['trancas']
        for q, T in enumerate(lacos):
            lado = 1.0 if T.x >= corpo.C.x else -1.0
            pts_g = crescer(corpo, T, (TRAS * 0.35 + BAIXO * 0.8 + Vector((lado * 0.25, 0, 0))), Tr['comp'], 'baixo', 0.02, 0.0, peso=0.3)
            cad = nova_cadeia(f'tranca{q}', pts_g, 0.0)
            pes = (lambda c: lambda s, k: pesos_cadeia(s, -0.02, c['nb'], c['seg'], c['k']))(cad)
            guia_, ss = reamostrar(pts_g, 40)
            L = ss[-1]
            for k3 in range(3):
                fio = []
                for i, P in enumerate(guia_):
                    t = (guia_[min(i + 1, 39)] - guia_[max(i - 1, 0)]).normalized()
                    o = Vector((P.x - corpo.C.x, P.y - corpo.C.y, 0))
                    o = (o - t * o.dot(t)).normalized() if o.length > 1e-6 else t.orthogonal()
                    u = t.cross(o).normalized()
                    fa = TAU * ss[i] / 0.05 + TAU * k3 / 3
                    r = Tr['larg'] * (1 - 0.35 * ss[i] / L)
                    fio.append(P + u * r * math.sin(fa) + o * r * 0.55 * math.sin(2 * fa))
                fita(M, corpo, fio, Tr['larg'] * 0.95, 0.6, pes, (k3 + q) % (FAIXAS - 1), 0.45, 2.0)
            ponta_ = guia_[-1]
            enrolar(M, ponta_, (guia_[-1] - guia_[-2]).normalized(), Tr['larg'] * 0.9, 0.007, pes, s_fixo=L)
            for i in range(7):
                a = TAU * i / 7
                d = (guia_[-1] - guia_[-2]).normalized()
                u = d.orthogonal().normalized()
                w = d.cross(u)
                P0 = ponta_ + (u * math.cos(a) + w * math.sin(a)) * 0.005
                pts = [P0 + (d + (u * math.cos(a) + w * math.sin(a)) * 0.35).normalized() * 0.012 * j for j in range(5)]
                fita(M, corpo, pts, 0.008, 0.5, (lambda L: lambda s, k: pes(L + s, k))(L), i % (FAIXAS - 1), 0.9, 1.0)
    return M, cadeias, E, plano


def enrolar(M, T, eixo, raio, larg, pesos, giro=0.0, incl=0.0, faixa=0, s_fixo=0.0):
    """Mecha enrolada em anel (o laço do rabo, as voltas do coque)."""
    u = eixo.orthogonal().normalized()
    w = eixo.cross(u)
    if incl:
        u = (u + eixo * incl).normalized()
    pts = []
    for i in range(17):
        a = giro + TAU * i / 16
        pts.append(T + (u * math.cos(a) + w * math.sin(a)) * raio)
    n = len(pts)
    aneis = []
    for k, P in enumerate(pts):
        t = (pts[(k + 1) % (n - 1)] - pts[(k - 1) % (n - 1)]).normalized()
        o = (P - T).normalized()
        b = t.cross(o).normalized()
        W = pesos(s_fixo, k)
        aneis.append([M.v(P + o * larg * 0.45, W), M.v(P + b * larg, W), M.v(P - o * larg * 0.45, W), M.v(P - b * larg, W)])
    us = [0.0, 0.25, 0.5, 0.75, 1.0]
    for k in range(n - 1):
        a, b = aneis[k], aneis[k + 1]
        for j in range(4):
            M.face([a[j], a[(j + 1) % 4], b[(j + 1) % 4], b[j]], [faixa_uv(faixa, us[j], k / (n - 1)), faixa_uv(faixa, us[j + 1], k / (n - 1)), faixa_uv(faixa, us[j + 1], (k + 1) / (n - 1)), faixa_uv(faixa, us[j], (k + 1) / (n - 1))])


# ============================================================ textura de fios (numpy)
_TEX = None


def textura():
    """Cor (sRGB), ORM e normais da textura de fios: FAIXAS colunas de fios ao longo de v (da raiz,
    em v = 0, à ponta, em v = 1); a última coluna é a da touca (fios mais finos e escuros)."""
    global _TEX
    if _TEX is not None:
        return _TEX
    L, w = LADO_TEX, LADO_TEX // FAIXAS
    rng = np.random.default_rng(11)
    v = np.linspace(0, 1, L)[:, None]

    def ruido1(n, esc):
        x = rng.normal(0, 1, n + 8)
        k = np.exp(-0.5 * (np.arange(-4, 5) / esc) ** 2)
        return np.convolve(x, k / k.sum(), 'same')[4:4 + n]
    cor = np.zeros((L, L, 3))
    alt = np.zeros((L, L))
    ao = np.zeros((L, L))
    asp = np.zeros((L, L))
    base = np.array([0.36, 0.26, 0.18])
    for f in range(FAIXAS):
        x0 = f * w
        b = 1 + 0.2 * ruido1(w, 0.9) / 0.45                     # brilho de cada fio
        h = ruido1(w, 0.7)                                      # relevo dos fios
        tom = rng.normal(0, 0.018, 3)
        lenta = np.stack([ruido1(L, 18) for _ in range(4)], 1)  # variação lenta ao longo do fio
        mist = (np.arange(w) * 4 // w).clip(0, 3)
        ao_fio = np.clip(0.62 + 0.38 * (v ** 0.5), 0, 1)        # raiz na sombra
        ponta = 1 + 0.16 * np.clip((v - 0.65) / 0.35, 0, 1)    # pontas mais claras
        var = 1 + 0.06 * lenta[:, mist] / 0.3
        if f == FAIXAS - 1:
            b = 1 + 0.18 * ruido1(w, 0.7) / 0.45
            ponta, ao_fio = 1.0, np.full_like(v, 0.7)
        k = (b[None, :] * var * ponta * ao_fio)[:, :, None]
        cor[:, x0:x0 + w] = np.clip((base + tom)[None, None, :] * k, 0, 1)
        alt[:, x0:x0 + w] = h[None, :] + 0.15 * lenta[:, mist]
        ao[:, x0:x0 + w] = ao_fio * np.ones((1, w))
        asp[:, x0:x0 + w] = np.clip(0.48 + 0.12 * (1 - b[None, :]) + 0.1 * v, 0.3, 0.8)
    dx = np.gradient(alt, axis=1) * 2.2
    dy = np.gradient(alt, axis=0) * 0.3
    n = np.stack([-dx, dy, np.ones_like(dx)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    nrm = n * 0.5 + 0.5
    orm = np.stack([ao, asp, np.zeros_like(ao)], -1)
    _TEX = dict(cor=cor, orm=orm, nrm=nrm)
    return _TEX


def imagem(nome, arr, cor):
    L = arr.shape[0]
    im = bpy.data.images.get(nome) or bpy.data.images.new(nome, L, L, alpha=False)
    im.colorspace_settings.name = 'sRGB' if cor else 'Non-Color'
    px = np.ones((L, L, 4), np.float32)
    px[..., :3] = arr[::-1]                                    # (a imagem do Blender começa embaixo)
    im.pixels.foreach_set(px.ravel())
    im.pack()
    return im


def material_cabelo():
    m = bpy.data.materials.get('Cabelo_fios')
    if m:
        return m
    T = textura()
    m = bpy.data.materials.new('Cabelo_fios')
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    t_cor = nt.nodes.new('ShaderNodeTexImage')
    t_cor.image = imagem('cabelo_cor', T['cor'], True)
    t_orm = nt.nodes.new('ShaderNodeTexImage')
    t_orm.image = imagem('cabelo_orm', T['orm'], False)
    t_nrm = nt.nodes.new('ShaderNodeTexImage')
    t_nrm.image = imagem('cabelo_normais', T['nrm'], False)
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(t_cor.outputs['Color'], p.inputs['Base Color'])
    nt.links.new(t_orm.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], p.inputs['Roughness'])
    nt.links.new(sep.outputs['Blue'], p.inputs['Metallic'])
    nt.links.new(t_nrm.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    for i, t in enumerate((t_cor, t_orm, t_nrm)):
        t.location = (-700, 300 - 300 * i)
    return m


# ============================================================ objeto, pesos, armadura
def ossos_do_corte(cadeias):
    nomes = ['head']
    for c in sorted(cadeias.values(), key=lambda c: c['k']):
        nomes += [f"cab{c['k']}_{j}" for j in range(c['nb'])]
    return nomes


def objeto(nome, Mm, Mf, ossos):
    me = bpy.data.meshes.new(nome)
    me.from_pydata(Mm.V, [], Mm.F)
    me.update()
    uv = me.uv_layers.new(name='UVMap')
    li = 0
    for f, uvs in zip(Mm.F, Mm.UV):
        for q in uvs:
            uv.data[li].uv = q
            li += 1
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(material_cabelo())
    U.ativar(ob)
    ob.shape_key_add(name='Basis')
    kf = ob.shape_key_add(name='corpo_f')
    for k, p in enumerate(Mf.V):
        kf.data[k].co = p
    kf.value = 0.0                                             # (nasce em 1: a cena mostraria o corpo feminino)
    for pl in me.polygons:
        pl.use_smooth = True
    # pesos como atributos (_W0.._W3: índice do osso + peso na parte fracionária)
    ix = {n: i for i, n in enumerate(ossos)}
    cols = [[0.0] * len(Mm.W) for _ in range(4)]
    for v, W in enumerate(Mm.W):
        it = sorted(((p, o) for o, p in W.items() if p > 1e-4), reverse=True)[:4]
        s = sum(p for p, _ in it) or 1.0
        for q, (p, o) in enumerate(it):
            cols[q][v] = ix[o] + min(p / s, 1.0) * 0.999
    for q in range(4):
        at = me.attributes.new(name=f'_W{q}', type='FLOAT', domain='POINT')
        at.data.foreach_set('value', cols[q])
    return ob


def exportar(ob, caminho):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    U.backup(caminho)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=caminho, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='EXPORT', export_cameras=False, export_lights=False,
                              export_image_format='JPEG', export_jpeg_quality=90, export_attributes=True)
    return caminho


def armadura(ob, cadeias, ossos, Mm):
    """Armadura com as cadeias (para editar e animar no Blender) e os grupos de vértices."""
    ad = bpy.data.armatures.new(ob.name + '_rig')
    ar = bpy.data.objects.new(ob.name + '_rig', ad)
    bpy.context.scene.collection.objects.link(ar)
    U.ativar(ar)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = ad.edit_bones
    C = Vector(json.load(open(MOLDES, encoding='utf-8'))['corpo_m']['cabeca']['centro'])
    h = eb.new('head')
    h.head, h.tail = C.copy(), C + Vector((0, 0, 0.12))          # gira em torno do centro da cabeça
    for c in sorted(cadeias.values(), key=lambda c: c['k']):
        pai = h
        for j in range(c['nb']):
            b = eb.new(f"cab{c['k']}_{j}")
            b.head, b.tail = c['juntas'][j], c['juntas'][j + 1]
            if (b.tail - b.head).length < 1e-4:
                b.tail = b.head + Vector((0, 0, -0.01))
            b.parent = pai
            b.use_connect = j > 0
            pai = b
    bpy.ops.object.mode_set(mode='OBJECT')
    grupos = {n: ob.vertex_groups.new(name=n) for n in ossos}
    for v, W in enumerate(Mm.W):
        for o, p in W.items():
            if p > 1e-4:
                grupos[o].add([v], p, 'REPLACE')
    md = ob.modifiers.new('Armadura', 'ARMATURE')
    md.object = ar
    ob.parent = ar
    return ar


# ============================================================ física (a mesma do jogo, para a demonstração)
def simular(cadeias, fis, quadros, cabeca_mat, dt=1 / 24):
    """Verlet das juntas de cada cadeia com a cabeça se mexendo (cabeca_mat(q) → matriz 4×4 da
    cabeça no quadro q): peso, volta à pose, amortecimento e comprimento fixo; devolve as juntas
    de cada quadro."""
    out = {}
    for ch, c in cadeias.items():
        J0 = [Vector(p) for p in c['juntas']]
        M0inv = cabeca_mat(0).inverted()
        loc = [M0inv @ p for p in J0]
        X = [p.copy() for p in J0]
        Xp = [p.copy() for p in J0]
        seg = [(J0[i + 1] - J0[i]).length for i in range(len(J0) - 1)]
        quad = []
        for q in range(quadros):
            M = cabeca_mat(q)
            alvo = [M @ p for p in loc]
            X[0] = alvo[0]
            for i in range(1, len(X)):
                vel = (X[i] - Xp[i]) * (1 - fis['amortecimento'])
                Xp[i] = X[i].copy()
                X[i] = X[i] + vel + Vector((0, 0, -9.8 * fis['peso'] * 0.12)) * dt * dt
                X[i] = X[i].lerp(X[i - 1] + (alvo[i] - alvo[i - 1]), fis['rigidez'] * 0.5)
            for _ in range(3):
                for i in range(1, len(X)):
                    d = X[i] - X[i - 1]
                    X[i] = X[i - 1] + d.normalized() * seg[i - 1] if d.length > 1e-9 else X[i]
            quad.append([p.copy() for p in X])
        out[ch] = quad
    return out


# ============================================================ manequim, prévia, demonstração
def manequim(corpo, nome):
    """Cabeça, pescoço e ombros do corpo medido (para a prévia e a demonstração)."""
    me = bpy.data.meshes.new(nome)
    V, F = [], []
    LAT = list(range(-60, 91, 6))
    LON = list(range(-180, 180, 10))
    for la in LAT:
        for lo in LON:
            V.append(tuple(corpo.casca(la, lo, -0.002)[0]))
    nl, nc = len(LAT), len(LON)
    for i in range(nl - 1):
        for j in range(nc):
            F.append((i * nc + j, i * nc + (j + 1) % nc, (i + 1) * nc + (j + 1) % nc, (i + 1) * nc + j))
    b = len(V)
    nt = corpo.nt
    an = [corpo.nt - 1 - k * 0.6 for k in range(8)]
    for i in an:
        for k in range(36):
            V.append(tuple(corpo.m.p('tronco', i, TAU * k / 36, -0.002)))
    for r in range(len(an) - 1):
        for k in range(36):
            F.append((b + r * 36 + k, b + r * 36 + (k + 1) % 36, b + (r + 1) * 36 + (k + 1) % 36, b + (r + 1) * 36 + k))
    me.from_pydata(V, [], F)
    me.update()
    for pl in me.polygons:
        pl.use_smooth = True
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    mt = bpy.data.materials.get('manequim') or U.material_pbr('manequim', (0.62, 0.5, 0.44), 0.0, 0.6)
    ob.data.materials.append(mt)
    return ob


def gerar(nome, previa=True):
    D = json.load(open(MOLDES, encoding='utf-8'))
    corpos = {cid: Corpo(cid, D[cid]) for cid in ('corpo_m', 'corpo_f')}
    res = {'corpo_m': montar(nome, corpos['corpo_m'])}
    res['corpo_f'] = montar(nome, corpos['corpo_f'], plano=dict(res['corpo_m'][3]))
    (Mm, cad_m, E, _), (Mf, cad_f, _, _) = res['corpo_m'], res['corpo_f']
    assert len(Mm.V) == len(Mf.V) and Mm.F == Mf.F, f'{nome}: a malha mudou entre os corpos'
    assert list(cad_m) == list(cad_f), f'{nome}: as cadeias mudaram entre os corpos'
    ossos = ossos_do_corte(cad_m)
    ob = objeto(f'cabelo_{nome}', Mm, Mf, ossos)
    glb = exportar(ob, os.path.join(PASTA, nome + '.glb'))
    fis = E.get('fisica')
    info = dict(corte=nome, nome=E['nome'], ossos=ossos, tris=Mm.tris(), fisica=fis,
                cadeias=[dict(nome=str(ch), ossos=[f"cab{c['k']}_{j}" for j in range(c['nb'])],
                              juntas={cid: [[round(x, 5) for x in p] for p in res[cid][1][ch]['juntas']] for cid in corpos})
                         for ch, c in sorted(cad_m.items(), key=lambda x: x[1]['k'])])
    with open(os.path.join(PASTA, nome + '.json'), 'w', encoding='utf-8') as f:
        json.dump(info, f, ensure_ascii=False, indent=1)
    prev = None
    if previa:
        mq = manequim(corpos['corpo_m'], 'manequim_' + nome)
        prev = U.renderizar_previa(os.path.join(PASTA, nome + '.png'), [ob, mq], lado=360, amostras=12, angulo=(78, 0, 28))   # (a miniatura da criação)
        bpy.data.objects.remove(mq, do_unlink=True)
    print(f'{nome}: {Mm.tris()} triângulos, {len(cad_m)} cadeias, {len(ossos) - 1} ossos → {os.path.relpath(glb, U.RAIZ)}', flush=True)
    return ob, cad_m, ossos, Mm, E, prev, glb


def demonstracao(nomes):
    """cabelos_demo.blend: os cortes lado a lado em manequins, com as armaduras e uma animação da
    cabeça girando e balançando (as cadeias simuladas)."""
    U.limpar_cena()
    D = json.load(open(MOLDES, encoding='utf-8'))
    corpo = Corpo('corpo_m', D['corpo_m'])
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end, sc.render.fps = 1, 96, 24
    for i, nome in enumerate(nomes):
        Mm, cad, E, plano = montar(nome, corpo)
        Mf = montar(nome, Corpo('corpo_f', D['corpo_f']), plano=dict(plano))[0]
        ossos = ossos_do_corte(cad)
        ob = objeto(f'cabelo_{nome}', Mm, Mf, ossos)
        ar = armadura(ob, cad, ossos, Mm)
        mq = manequim(corpo, f'manequim_{nome}')
        mq.parent = ar
        mq.parent_type = 'BONE'
        mq.parent_bone = 'head'
        mq.matrix_parent_inverse = (ar.matrix_world @ ar.pose.bones['head'].matrix).inverted()
        ar.location.x = (i - (len(nomes) - 1) / 2) * 0.45
        fis = E.get('fisica') or dict(rigidez=0.5, amortecimento=0.15, peso=1.0)
        C = corpo.C

        def cab(q, C=C):
            a = 0.6 * math.sin(TAU * q / 48)
            b = 0.15 * math.sin(TAU * q / 32)
            R = (Quaternion((0, 0, 1), a) @ Quaternion((1, 0, 0), b)).to_matrix().to_4x4()
            return Matrix.Translation(C) @ R @ Matrix.Translation(-C)
        pb = ar.pose.bones
        rest = {b.name: b.matrix_local.copy() for b in ar.data.bones}
        sim = simular(cad, fis, 96, cab)
        for b in pb:
            b.rotation_mode = 'QUATERNION'
        for q in range(96):
            Mq = cab(q)
            posta = {'head': Mq @ rest['head']}
            pb['head'].rotation_quaternion = (rest['head'].inverted() @ posta['head']).to_quaternion()
            pb['head'].keyframe_insert('rotation_quaternion', frame=q + 1)
            for ch, c in sorted(cad.items(), key=lambda x: x[1]['k']):
                X = sim[ch][q]
                for j in range(c['nb']):
                    nm = f"cab{c['k']}_{j}"
                    pai = 'head' if j == 0 else f"cab{c['k']}_{j - 1}"
                    base = posta[pai] @ rest[pai].inverted() @ rest[nm]
                    d = X[j + 1] - X[j]
                    L = Vector((0, 1, 0)).rotation_difference(base.to_3x3().normalized().inverted() @ d) if d.length > 1e-6 else Quaternion()
                    posta[nm] = base @ L.to_matrix().to_4x4()
                    pb[nm].rotation_quaternion = L
                    pb[nm].keyframe_insert('rotation_quaternion', frame=q + 1)
    caminho = os.path.join(PASTA, 'cabelos_demo.blend')
    U.backup(caminho)
    bpy.ops.wm.save_as_mainfile(filepath=caminho, compress=True)
    print('demonstração:', os.path.relpath(caminho, U.RAIZ))


def main(nomes):
    for nome in nomes:
        U.limpar_cena()
        gerar(nome)
        U.limpar_sobras()
    demonstracao(CORTES_ORDEM)          # a cena de demonstração sempre com os dez cortes


if __name__ == '__main__':
    pedidos = [a for a in U.args() if a in CORTES_ORDEM] or CORTES_ORDEM
    main(pedidos)
