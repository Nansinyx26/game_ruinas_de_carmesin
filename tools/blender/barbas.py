"""Barbas e bigodes em mechas, feitos no Blender (criação de personagem, estilo Realista).

Usa as peças do gerador de cabelos (tools/blender/cabelos.py): a cabeça medida do corpo masculino
(a casca em latitude/longitude de moldes_corpo.json), o crescimento das mechas encostadas na pele
(desviando do rosto e do pescoço), as fitas (mechas em losango achatado que afinam na ponta) e a
mesma textura de fios (castanho neutro: o jogo tinge com a cor escolhida para a barba).

Cada estilo tem:
- a BASE: uma casca fina sobre a região da barba, com a coluna de fios curtos da textura (é a
  "barba por fazer" e a sombra por baixo das mechas, para a pele não aparecer entre elas);
- CAMADAS de mechas: região do rosto (bochechas e mandíbula, queixo, embaixo do queixo, buço),
  comprimento, largura e o fluxo (para baixo; o bigode para baixo e para os lados; o guidão
  enrola para cima nas pontas).
A boca fica livre. O conversor (tools/importar_criacao.py) põe a barba direto no espaço da cabeça
(como os cabelos em mechas) e a leva da pele medida (molde_rosto.json, gravado aqui) para o rosto de
referência e para o corpo feminino; no jogo, o rosto recua para dentro dela onde atravessaria.

Saídas: assets/Criar_Personagem/Barbas_Blender/<estilo>.glb e <estilo>.png (a miniatura).
Rode: python3 tools/blender/barbas.py [estilo ...]
Eixos (Blender): frente para −Y, Z para cima, metros.
"""
import json
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cabelos as C   # noqa: E402
import utils as U     # noqa: E402

PASTA = os.path.join(U.RAIZ, 'assets', 'Criar_Personagem', 'Barbas_Blender')
ESTILOS_ORDEM = ['por_fazer', 'curta', 'media', 'cheia', 'longa', 'cavanhaque', 'queixo', 'bigode', 'guidao',
                 'fino', 'ferradura', 'cheia_sem', 'cavanhaque_sem']   # (bigodes avulsos e barbas sem bigode: o bigode é vaga própria)


# ------------------------------------------------------------ regiões do rosto (graus)
def boca(la, lo):
    return abs(lo) < 24 and -37 < la < -29


def bochechas(la, lo):
    a = abs(lo)
    if a > 98 or a < 30:
        return False
    teto = -20 + max(0.0, a - 35) / 60 * 18           # sobe até a costeleta, perto da orelha
    return -57 <= la <= teto


def queixo(la, lo):
    return abs(lo) <= 34 and -57 <= la <= -37


def sob_queixo(la, lo):
    return abs(lo) < 72 and -66 <= la < -56


def buco(la, lo):
    return abs(lo) < 26 and -30 <= la <= -21


def buco_fino(la, lo):
    return abs(lo) < 22 and -25 <= la <= -21


def cantos(la, lo):
    """Dos cantos da boca até a linha do queixo (o bigode ferradura)."""
    return 22 <= abs(lo) <= 32 and -46 <= la <= -26


REGIOES = dict(bochechas=bochechas, queixo=queixo, sob_queixo=sob_queixo, buco=buco, buco_fino=buco_fino, cantos=cantos)


def na_regiao(nomes, la, lo):
    return not boca(la, lo) and any(REGIOES[n](la, lo) for n in nomes)


# ------------------------------------------------------------ fluxos
def fluxo(tipo, corpo, P):
    lado = 1.0 if P.x >= corpo.C.x else -1.0
    if tipo == 'barba':
        return (C.BAIXO * 0.85 + C.FRENTE * 0.22).normalized()
    if tipo == 'bigode':
        return (C.BAIXO * 0.78 + Vector((lado, 0, 0)) * 0.5 + C.FRENTE * 0.1).normalized()
    if tipo == 'guidao':
        return (Vector((lado, 0, 0)) * 0.85 + C.CIMA * 0.35 + C.FRENTE * 0.15).normalized()
    raise ValueError(tipo)


def crescer(corpo, P0, D0, comp, tipo, folga, rig, peso=0.35, passo=0.004):
    """Como o crescer dos cabelos, com passo menor (mechas curtas) e o fluxo da barba."""
    P, D = P0.copy(), D0.normalized()
    pts = [P.copy()]
    s = 0.0
    while s < comp - 1e-9:
        F = fluxo(tipo, corpo, P)
        D = (D * 0.6 + F * 0.4 + C.BAIXO * peso * (1 - rig)).normalized()
        Q = corpo.empurrar(P + D * passo, folga)
        if (Q - P).length > 1e-6:
            D = (Q - P).normalized()
        P = Q
        pts.append(P.copy())
        s += passo
    return pts


# ------------------------------------------------------------ estilos
# camada: regiões, n mechas, comp (min, máx), larg, esp, fluxo, folga, rig (resiste a cair)
def estilo(nome):
    B = ['bochechas', 'queixo', 'sob_queixo']
    E = dict(
        # por fazer: só pontas curtas (2 a 4 mm), sem a casca por baixo (a pele aparece entre elas)
        por_fazer=dict(nome='Por fazer', base=[], camadas=[
            dict(reg=B + ['buco'], n=720, comp=(0.0025, 0.004), larg=(0.004, 0.006), esp=0.45, fluxo='barba', folga=0.0012, rig=0.9)]),
        curta=dict(nome='Curta com bigode', base=B + ['buco'], camadas=[
            dict(reg=B, n=460, comp=(0.008, 0.014), larg=(0.007, 0.01), esp=0.3, fluxo='barba', folga=0.003, rig=0.75),
            dict(reg=['buco'], n=70, comp=(0.012, 0.018), larg=(0.007, 0.01), esp=0.3, fluxo='bigode', folga=0.003, rig=0.7)]),
        media=dict(nome='Média com bigode', base=B + ['buco'], camadas=[
            dict(reg=B, n=420, comp=(0.02, 0.034), larg=(0.009, 0.013), esp=0.32, fluxo='barba', folga=0.004, rig=0.55),
            dict(reg=['buco'], n=70, comp=(0.02, 0.028), larg=(0.008, 0.011), esp=0.3, fluxo='bigode', folga=0.004, rig=0.6)]),
        cheia=dict(nome='Cheia', base=B + ['buco'], camadas=[
            dict(reg=B, n=420, comp=(0.035, 0.055), larg=(0.011, 0.016), esp=0.34, fluxo='barba', folga=0.005, rig=0.45),
            dict(reg=['queixo', 'sob_queixo'], n=120, comp=(0.04, 0.06), larg=(0.012, 0.016), esp=0.34, fluxo='barba', folga=0.011, rig=0.45),
            dict(reg=['buco'], n=80, comp=(0.025, 0.04), larg=(0.009, 0.012), esp=0.3, fluxo='bigode', folga=0.005, rig=0.5)]),
        longa=dict(nome='Longa', base=B + ['buco'], camadas=[
            dict(reg=B, n=270, comp=(0.06, 0.1), larg=(0.013, 0.018), esp=0.34, fluxo='barba', folga=0.005, rig=0.3),
            dict(reg=['queixo', 'sob_queixo'], n=110, comp=(0.1, 0.15), larg=(0.014, 0.019), esp=0.34, fluxo='barba', folga=0.012, rig=0.25),
            dict(reg=['buco'], n=80, comp=(0.03, 0.045), larg=(0.009, 0.012), esp=0.3, fluxo='bigode', folga=0.005, rig=0.45)]),
        cavanhaque=dict(nome='Cavanhaque', base=['queixo', 'buco'], camadas=[
            dict(reg=['queixo'], n=150, comp=(0.02, 0.035), larg=(0.009, 0.012), esp=0.32, fluxo='barba', folga=0.004, rig=0.5),
            dict(reg=['buco'], n=70, comp=(0.018, 0.026), larg=(0.008, 0.011), esp=0.3, fluxo='bigode', folga=0.004, rig=0.6)]),
        queixo=dict(nome='Contorno sem bigode', base=B, camadas=[
            dict(reg=B, n=380, comp=(0.012, 0.02), larg=(0.008, 0.011), esp=0.3, fluxo='barba', folga=0.003, rig=0.7)]),
        bigode=dict(nome='Bigode', base=['buco'], camadas=[
            dict(reg=['buco'], n=100, comp=(0.018, 0.028), larg=(0.008, 0.011), esp=0.32, fluxo='bigode', folga=0.004, rig=0.6)]),
        guidao=dict(nome='Bigode guidão', base=['buco'], camadas=[
            dict(reg=['buco'], n=70, comp=(0.016, 0.024), larg=(0.008, 0.011), esp=0.3, fluxo='bigode', folga=0.004, rig=0.6),
            dict(reg=['buco'], n=40, comp=(0.04, 0.055), larg=(0.009, 0.012), esp=0.34, fluxo='guidao', folga=0.006, rig=0.9, lo_min=12)]),
        fino=dict(nome='Bigode fino', base=['buco_fino'], camadas=[
            dict(reg=['buco_fino'], n=60, comp=(0.006, 0.01), larg=(0.005, 0.007), esp=0.3, fluxo='bigode', folga=0.003, rig=0.8)]),
        ferradura=dict(nome='Bigode ferradura', base=['buco', 'cantos'], camadas=[
            dict(reg=['buco'], n=80, comp=(0.018, 0.026), larg=(0.008, 0.011), esp=0.32, fluxo='bigode', folga=0.004, rig=0.6),
            dict(reg=['cantos'], n=70, comp=(0.012, 0.02), larg=(0.008, 0.011), esp=0.32, fluxo='barba', folga=0.004, rig=0.6)]),
        cheia_sem=dict(nome='Cheia sem bigode', base=B, camadas=[
            dict(reg=B, n=420, comp=(0.035, 0.055), larg=(0.011, 0.016), esp=0.34, fluxo='barba', folga=0.005, rig=0.45),
            dict(reg=['queixo', 'sob_queixo'], n=120, comp=(0.04, 0.06), larg=(0.012, 0.016), esp=0.34, fluxo='barba', folga=0.011, rig=0.45)]),
        cavanhaque_sem=dict(nome='Cavanhaque sem bigode', base=['queixo'], camadas=[
            dict(reg=['queixo'], n=150, comp=(0.02, 0.035), larg=(0.009, 0.012), esp=0.32, fluxo='barba', folga=0.004, rig=0.5)]),
    )
    return E[nome]


def raizes(regs, n, rng, lo_min=0):
    """Pontos bem espalhados (espiral de Fibonacci) nas regiões pedidas, com um sorteio pequeno."""
    out = []
    N = 20000
    for i in range(N):
        z = 1 - 2 * (i + 0.5) / N
        la = math.degrees(math.asin(z))
        if la > 0 or la < -70:
            continue
        lo = ((i * 137.508) % 360) - 180
        if abs(lo) >= lo_min and na_regiao(regs, la, lo):
            out.append((la, lo))
    rng.shuffle(out)
    return [(la + rng.uniform(-0.6, 0.6), lo + rng.uniform(-0.8, 0.8)) for la, lo in out[:n]]


def base(M, corpo, regs, folga):
    """Casca fina sobre as regiões (a coluna dos fios curtos da textura)."""
    LA = [-68 + 2 * i for i in range(35)]
    LO = [-100 + 2.5 * j for j in range(81)]
    idx = {}
    cab = lambda s, k: {'head': 1.0}

    def v(i, j):
        if (i, j) not in idx:
            p, _ = corpo.casca(LA[i], LO[j], folga)
            idx[(i, j)] = M.v(p, cab(0, 0))
        return idx[(i, j)]
    n = 0
    for i in range(len(LA) - 1):
        for j in range(len(LO) - 1):
            la, lo = (LA[i] + LA[i + 1]) / 2, (LO[j] + LO[j + 1]) / 2
            if not na_regiao(regs, la, lo):
                continue
            u0, u1 = j / (len(LO) - 1), (j + 1) / (len(LO) - 1)
            v0, v1 = i / (len(LA) - 1), (i + 1) / (len(LA) - 1)
            F = C.FAIXAS - 1
            M.face([v(i, j), v(i, j + 1), v(i + 1, j + 1), v(i + 1, j)],
                   [C.faixa_uv(F, u0, v0), C.faixa_uv(F, u1, v0), C.faixa_uv(F, u1, v1), C.faixa_uv(F, u0, v1)])
            n += 1
    return n


def montar(nome, corpo, semente=11):
    E = estilo(nome)
    rng = random.Random(semente + sum(map(ord, nome)))
    M = C.Malha()
    cab = lambda s, k: {'head': 1.0}
    if E['base']:
        base(M, corpo, E['base'], 0.0018)
    for cam in E['camadas']:
        for la, lo in raizes(cam['reg'], cam['n'], rng, cam.get('lo_min', 0)):
            comp = rng.uniform(*cam['comp'])
            larg = rng.uniform(*cam['larg'])
            P0, d0 = corpo.casca(la, lo, cam['folga'])
            D0 = fluxo(cam['fluxo'], corpo, P0) + d0 * 0.15
            pts = crescer(corpo, P0, D0, comp, cam['fluxo'], cam['folga'], cam['rig'])
            n = max(3, min(6, int(comp / 0.02) + 2))      # (poucos anéis: a barba cheia cabe em ~14 mil triângulos)
            pts, _ = C.reamostrar(pts, n)
            C.fita(M, corpo, pts, larg, cam['esp'], cab, rng.randrange(C.FAIXAS - 1), 0.85, 1.4)
    return M, E


def exportar_molde():
    """A pele do rosto medida (casca da cabeça, de la −70 a 0 e lo −100 a 100) nos dois corpos, com as
    normais: o conversor leva a barba do rosto medido para o rosto de referência do jogo (a diferença
    entre as duas superfícies) e do corpo masculino para o feminino (mesma grade)."""
    D = json.load(open(C.MOLDES, encoding='utf-8'))
    out = {}
    for cid in ('corpo_m', 'corpo_f'):
        corpo = C.Corpo(cid, D[cid])
        P, N = [], []
        for la in range(-70, 1, 2):
            for lo in range(-100, 101, 3):
                p, n = corpo.casca(la, lo, 0.0)
                P.append([round(p.x, 5), round(p.y, 5), round(p.z, 5)])
                N.append([round(n.x, 4), round(n.y, 4), round(n.z, 4)])
        out[cid] = dict(p=P, n=N)
    os.makedirs(PASTA, exist_ok=True)
    with open(os.path.join(PASTA, 'molde_rosto.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'))


def gerar(nome):
    D = json.load(open(C.MOLDES, encoding='utf-8'))
    corpo = C.Corpo('corpo_m', D['corpo_m'])
    M, E = montar(nome, corpo)
    ob = C.objeto(f'barba_{nome}', M, M, ['head'])
    os.makedirs(PASTA, exist_ok=True)
    glb = C.exportar(ob, os.path.join(PASTA, nome + '.glb'))
    mq = C.manequim(corpo, 'manequim_' + nome)
    U.renderizar_previa(os.path.join(PASTA, nome + '.png'), [ob, mq], lado=360, amostras=12, angulo=(84, 0, 22))
    bpy.data.objects.remove(mq, do_unlink=True)
    with open(os.path.join(PASTA, nome + '.json'), 'w', encoding='utf-8') as f:
        json.dump(dict(estilo=nome, nome=E['nome'], tris=M.tris()), f, ensure_ascii=False, indent=1)
    print(f'{nome}: {M.tris()} triângulos → {os.path.relpath(glb, U.RAIZ)}', flush=True)


if __name__ == '__main__':
    exportar_molde()
    for n in ([a for a in U.args() if a in ESTILOS_ORDEM] or ESTILOS_ORDEM):
        U.limpar_cena()
        gerar(n)
        U.limpar_sobras()
