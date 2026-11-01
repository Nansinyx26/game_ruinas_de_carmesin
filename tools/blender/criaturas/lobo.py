"""Lobo de Eclipse Zero (quadrúpede), feito no Blender por regras: a criatura piloto.

Três pelagens do mesmo corpo, esqueleto e animações:
  lobo_cinzento  o lobo selvagem das florestas (fauna)            → assets/Creatures/Wildlife/Mammals/
  lobo_raiz      Lobo de Raiz: corrompido pela floresta de Velmora, pelo musgoso com veias de raiz
                 acesas e olhos verdes (inimigo)                    → assets/Creatures/Enemies/
  lobo_neve      Lobo das Neves: pelagem branca e olhos de gelo (inimigo de Asterion)
                                                                    → assets/Creatures/Enemies/
Anatomia (metros, frente para -Y): 0,82 m na cernelha, 1,45 m do focinho à garupa, cauda de 0,5 m;
peito fundo, barriga recolhida, garupa e espáduas musculosas, crânio largo e focinho afilado,
orelhas em ponta, mandíbula separada (morde), caninos e incisivos, garras, olhos com íris.
Esqueleto (31 ossos): raiz, quadril, 2 da coluna, peito, 2 do pescoço, cabeça, mandíbula, 2 orelhas,
4 da cauda, e em cada perna escápula, braço, antebraço e mão (frente) ou coxa, canela, metatarso e pé.
Animações (24 q/s, no lugar): idle, uivar, andar, trotar, correr (galope), atacar (bote com
mordida), saltar (investida), dano, atordoado e morte; e as do animal de companhia: sentar,
dormir (deitado), comer, brincar (o convite) e carinho.

Rode: python3 tools/blender/criaturas/lobo.py [forma] (forma: só a malha e a prévia, sem assar)
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as B   # noqa: E402
import bpy   # noqa: E402
from mathutils import Vector   # noqa: E402

U = B.U

# ------------------------------------------------------------------ o grafo anatômico
P = [
    (0, 0.86, 0.3), (0, 0.76, 0.41), (0, 0.66, 0.52), (0, 0.55, 0.61),           # 0-3 cauda (ponta → base), caída
    (0, 0.43, 0.6), (0, 0.25, 0.61), (0, 0.07, 0.62), (0, -0.11, 0.63),         # 4 quadril, 5 lombo, 6 dorso, 7 peito
    (0, -0.24, 0.66), (0, -0.34, 0.71), (0, -0.43, 0.77), (0, -0.52, 0.825),    # 8 cernelha, 9-10 pescoço, 11 nuca
    (0, -0.62, 0.835), (0, -0.725, 0.805), (0, -0.815, 0.787),                  # 12 testa, 13 focinho, 14 nariz
]
ARESTAS = [(i, i + 1) for i in range(14)]
RAIOS = [(0.04, 0.04), (0.06, 0.062), (0.066, 0.068), (0.06, 0.06),
         (0.135, 0.16), (0.125, 0.168), (0.135, 0.198), (0.163, 0.228),
         (0.155, 0.21), (0.126, 0.145), (0.11, 0.12), (0.108, 0.1),
         (0.093, 0.088), (0.06, 0.054), (0.038, 0.037)]
PERNAS = {   # [ombro/quadril, cotovelo/joelho, pulso/jarrete, pata], ligadas à cernelha (8) ou ao quadril (4)
    'FL': (8, [(0.125, -0.25, 0.56), (0.118, -0.21, 0.37), (0.106, -0.24, 0.13), (0.106, -0.285, 0.033)], [(0.086, 0.11), (0.058, 0.06), (0.037, 0.038), (0.055, 0.031)]),
    'HL': (4, [(0.125, 0.39, 0.55), (0.135, 0.27, 0.37), (0.106, 0.46, 0.17), (0.106, 0.41, 0.033)], [(0.1, 0.13), (0.068, 0.07), (0.036, 0.038), (0.055, 0.031)]),
}


def corpo():
    pts, ars, rs = list(P), list(ARESTAS), list(RAIOS)
    for nome, (liga, Q, R) in PERNAS.items():
        for s in (1, -1):
            i0 = len(pts)
            for q, r in zip(Q, R):
                pts.append((q[0] * s, q[1], q[2]))
                rs.append(r)
            ars.append((liga, i0))
            ars += [(i0 + k, i0 + k + 1) for k in range(3)]
    ob = B.grafo_pele('Lobo_Base', pts, ars, rs, subdiv=2, raiz=6)
    return ob


ESCULTURA = [
    dict(c=(0, -0.13, 0.42), r=0.13, d=(0, 0, -0.06)),               # peito fundo
    dict(c=(0, 0.2, 0.47), r=0.11, d=(0, 0, 0.05)),                  # barriga recolhida
    dict(c=(0.13, -0.22, 0.56), r=0.08, n=0.02, espelho=True),       # espáduas
    dict(c=(0.12, 0.37, 0.57), r=0.1, n=0.024, espelho=True),        # garupa e coxas
    dict(c=(0, -0.38, 0.68), r=0.12, n=0.035),                       # juba do pescoço (pelo mais longo)
    dict(c=(0, -0.57, 0.9), r=0.06, d=(0, 0, -0.01)),                # topo do crânio mais chato
    dict(c=(0.07, -0.57, 0.81), r=0.05, n=0.016, espelho=True),      # bochechas
    dict(c=(0, -0.75, 0.81), r=0.055, s=(0.84, 1.0, 0.9)),           # focinho afilado
    dict(c=(0, -0.63, 0.86), r=0.03, d=(0, 0, -0.007)),              # o degrau da testa
    dict(c=(0, 0.5, 0.6), r=0.06, n=0.012),                          # base da cauda
]


def tufos():
    """Mechas de pelo deitadas que quebram a silhueta lisa: a juba do pescoço, as bochechas, o peito,
    a escova da cauda e as calças das coxas (cones achatados quase rentes ao corpo, no material do
    pelo; a base entra um pouco na pele)."""
    import random
    rnd = random.Random(7)
    out = []
    def mecha(base, d, r, comp):
        dv = Vector(d).normalized()
        b0 = Vector(base) - dv * comp * 0.35
        out.append(B.cone(f'tufo_{len(out)}', tuple(b0), tuple(b0 + dv * comp), r, lados=4, achatar=0.22, grupo='g_tufo'))
    for k in range(16):   # juba: em volta do pescoço, deitada para trás
        a = rnd.uniform(-2.2, 2.2)
        y = rnd.uniform(-0.45, -0.31)
        cz = 0.72 - (y + 0.31) * 0.65
        base = (math.sin(a) * 0.112, y, cz + math.cos(a) * 0.105)
        mecha(base, (math.sin(a) * 0.3, 1.0, math.cos(a) * 0.05 - 0.25), rnd.uniform(0.02, 0.026), rnd.uniform(0.05, 0.07))
    for s in (1, -1):     # bochechas
        for k in range(3):
            mecha((0.082 * s, -0.56 + k * 0.014, 0.79 - k * 0.014), (0.35 * s, 0.85, -0.35), 0.015, rnd.uniform(0.035, 0.045))
    for k in range(5):    # peito
        mecha((rnd.uniform(-0.05, 0.05), -0.31, 0.5 - k * 0.015), (0, -0.15, -1), 0.018, rnd.uniform(0.04, 0.055))
    for k in range(10):   # cauda (escova, mais na ponta e embaixo)
        t = rnd.uniform(0.35, 1.0)
        c = Vector(P[3]).lerp(Vector(P[0]), t)
        a = rnd.uniform(-1.2, 1.2) + math.pi
        base = c + Vector((math.sin(a) * 0.045, 0, math.cos(a) * 0.045))
        mecha(tuple(base), (math.sin(a) * 0.3, 0.8, -0.6), 0.02, rnd.uniform(0.05, 0.07))
    for s in (1, -1):     # calças das coxas
        for k in range(3):
            mecha((0.135 * s, 0.42, 0.5 - k * 0.035), (0.2 * s, 1, -0.5), 0.018, rnd.uniform(0.04, 0.05))
    return out


def pecas():
    """Orelhas, olhos, mandíbula, dentes, nariz e garras (cada um no seu grupo de vértices)."""
    out = []
    for s in (1, -1):
        lado = 'L' if s > 0 else 'R'
        o = B.cone(f'orelha_{s}', (0.052 * s, -0.54, 0.87), (0.07 * s, -0.515, 0.975), 0.042, lados=8, achatar=0.34, grupo='g_orelha_' + lado, eixo_lado=(0, 1, 0))
        out.append(('orelha', o))
        out.append(('olho', B.esfera(f'olho_{s}', (0.046 * s, -0.645, 0.852), 0.0145, 10, 7, (1, 1.15, 0.8), grupo='g_olho')))
    out.append(('pele', B.esfera('mandibula', (0, -0.7, 0.765), 0.04, 12, 8, (0.95, 2.4, 0.55), grupo='g_mandibula')))
    out.append(('nariz', B.esfera('nariz', (0, -0.835, 0.796), 0.02, 10, 7, (1.25, 1, 0.85), grupo='g_nariz')))
    for s in (1, -1):   # caninos (de cima e de baixo, dentro da linha dos lábios) e incisivos
        out.append(('dente', B.cone(f'canino_cima_{s}', (0.021 * s, -0.79, 0.778), (0.022 * s, -0.792, 0.758), 0.005, 5, grupo='g_dente_cima')))
        out.append(('dente', B.cone(f'canino_baixo_{s}', (0.018 * s, -0.775, 0.768), (0.019 * s, -0.778, 0.785), 0.0045, 5, grupo='g_mandibula')))
        for k in range(2):
            out.append(('dente', B.cone(f'incisivo_{s}_{k}', ((0.005 + 0.006 * k) * s, -0.8, 0.777), ((0.005 + 0.006 * k) * s, -0.801, 0.766), 0.003, 4, grupo='g_dente_cima')))
    for nome, (liga, Q, R) in PERNAS.items():
        for s in (1, -1):
            px, py = Q[3][0] * s, Q[3][1]
            for k in range(4):
                dx = (k - 1.5) * 0.019
                out.append(('garra', B.cone(f'garra_{nome}_{s}_{k}', (px + dx, py - 0.035, 0.022), (px + dx * 1.15, py - 0.06, 0.004), 0.006, 5, grupo=f'g_pata_{nome[0]}{"L" if s > 0 else "R"}')))
    return out


PELAGENS = {   # cores em sRGB
    'lobo_cinzento': dict(dorso=(0.24, 0.22, 0.2), flanco=(0.47, 0.43, 0.38), barriga=(0.74, 0.7, 0.62), patas=(0.55, 0.5, 0.43), aspereza=0.84,
                          olho=(0.85, 0.55, 0.12), olho_k=0.6, pasta='Wildlife/Mammals'),
    'lobo_raiz': dict(dorso=(0.14, 0.17, 0.1), flanco=(0.27, 0.31, 0.18), barriga=(0.4, 0.42, 0.3), patas=(0.22, 0.2, 0.14), aspereza=0.88,
                      veias=(0.45, 1.0, 0.22, 1), veias_k=2.2, z_veias=0.6, olho=(0.55, 1.0, 0.25), olho_k=3.0, pasta='Enemies'),
    'lobo_neve': dict(dorso=(0.66, 0.7, 0.76), flanco=(0.84, 0.87, 0.91), barriga=(0.94, 0.95, 0.97), patas=(0.76, 0.8, 0.85), aspereza=0.8,
                      olho=(0.55, 0.85, 1.0), olho_k=2.2, pasta='Enemies'),
}


def montar_malha(pel):
    """A malha final do lobo (baixa), com os materiais procedurais da pelagem."""
    base = corpo()
    low = B.copia(base, 'Lobo')
    B.aplicar_tudo(low)
    B.esculpir(low, ESCULTURA)
    g = low.vertex_groups.new(name='g_corpo')
    g.add(list(range(len(low.data.vertices))), 1.0, 'REPLACE')
    corpo_peso = B.copia(low, 'Lobo_Pesos')   # (o corpo sozinho, para o calor dos ossos)
    M = PELAGENS[pel]
    m_pelo = B.material_pelagem(f'{pel}_pelo', dict(M, z_barriga=0.42, z_dorso=0.8))
    m_escuro = B.material_liso(f'{pel}_escuro', (0.025, 0.022, 0.02), aspereza=0.32)
    m_dente = B.material_liso(f'{pel}_dente', (0.82, 0.78, 0.66), aspereza=0.38)
    m_olho = B.material_liso(f'{pel}_olho', (0.04, 0.03, 0.02), aspereza=0.12, emissao=M['olho'], forca=M['olho_k'])
    m_orelha = B.material_pelagem(f'{pel}_orelha', dict(M, z_barriga=0.85, z_dorso=1.0))
    low.data.materials.append(m_pelo)
    partes = [low]
    for o in tufos():
        o.data.materials.append(m_pelo)
        partes.append(o)
    for tipo, o in pecas():
        mat = {'orelha': m_orelha, 'olho': m_olho, 'dente': m_dente, 'garra': m_escuro, 'nariz': m_escuro, 'pele': m_pelo}[tipo]
        o.data.materials.append(mat)
        partes.append(o)
    lobo = B.juntar(partes, 'Lobo')
    base.hide_set(True)
    base.hide_render = True
    corpo_peso.hide_render = True
    return base, lobo, corpo_peso


# ------------------------------------------------------------------ esqueleto
def esqueleto(mapa=None, nome='Lobo_Esqueleto'):
    """31 ossos com a anatomia do lobo. Rolagem: o eixo X local de pernas e coluna fica de lado
    (girar em X = levar para a frente ou para trás; na coluna e no pescoço, erguer ou baixar).
    mapa(nome_do_osso, ponto) → ponto: leva as juntas do molde para outra malha de lobo (ex.: a do
    Meshy, tools/blender/criaturas/lobo_neon.py, ajustada pelas medidas dela)."""
    o = []
    def add(nm, h, t, pai, para=(0, 0, 1)):
        o.append((nm, h, t, pai, para))
    add('raiz', (0, 0, 0), (0, 0.12, 0), None)
    add('quadril', (0, 0.43, 0.6), (0, 0.25, 0.61), 'raiz')
    add('coluna1', (0, 0.25, 0.61), (0, 0.07, 0.62), 'quadril')
    add('coluna2', (0, 0.07, 0.62), (0, -0.11, 0.63), 'coluna1')
    add('peito', (0, -0.11, 0.63), (0, -0.24, 0.66), 'coluna2')
    add('pescoco1', (0, -0.24, 0.66), (0, -0.38, 0.73), 'peito')
    add('pescoco2', (0, -0.38, 0.73), (0, -0.5, 0.8), 'pescoco1')
    add('cabeca', (0, -0.5, 0.8), (0, -0.8, 0.8), 'pescoco2')
    add('mandibula', (0, -0.62, 0.772), (0, -0.8, 0.765), 'cabeca')
    for s, L in ((1, 'L'), (-1, 'R')):
        add(f'orelha.{L}', (0.052 * s, -0.54, 0.87), (0.07 * s, -0.515, 0.975), 'cabeca', (0, -1, 0))
    add('cauda1', P[3], P[2], 'quadril')
    add('cauda2', P[2], P[1], 'cauda1')
    add('cauda3', P[1], P[0], 'cauda2')
    add('cauda4', P[0], (0, P[0][1] + 0.05, P[0][2] - 0.08), 'cauda3')
    for s, L in ((1, 'L'), (-1, 'R')):
        Q = PERNAS['FL'][1]
        q = [(x * s, y, z) for x, y, z in Q]
        add(f'escapula.{L}', (0.1 * s, -0.19, 0.72), q[0], 'peito', (0, -1, 0))
        add(f'braco.{L}', q[0], q[1], f'escapula.{L}', (0, -1, 0))
        add(f'antebraco.{L}', q[1], q[2], f'braco.{L}', (0, -1, 0))
        add(f'mao.{L}', q[2], (q[3][0], q[3][1] - 0.03, q[3][2]), f'antebraco.{L}', (0, 0, 1))
        Q = PERNAS['HL'][1]
        q = [(x * s, y, z) for x, y, z in Q]
        add(f'coxa.{L}', q[0], q[1], 'quadril', (0, -1, 0))
        add(f'canela.{L}', q[1], q[2], f'coxa.{L}', (0, -1, 0))
        add(f'metatarso.{L}', q[2], (q[3][0], q[3][1], q[3][2] + 0.015), f'canela.{L}', (0, -1, 0))
        add(f'pe.{L}', (q[3][0], q[3][1], q[3][2] + 0.015), (q[3][0], q[3][1] - 0.07, q[3][2]), f'metatarso.{L}', (0, 0, 1))
    ad = bpy.data.armatures.new(nome)
    arm = bpy.data.objects.new(nome, ad)
    bpy.context.scene.collection.objects.link(arm)
    U.ativar(arm)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = ad.edit_bones
    for nm, h, t, pai, para in o:
        b = eb.new(nm)
        b.head = Vector(mapa(nm, h) if mapa else h)
        b.tail = Vector(mapa(nm, t) if mapa else t)
        b.align_roll(Vector(para) if nm.startswith(('orelha', 'escapula', 'braco', 'antebraco', 'coxa', 'canela', 'metatarso')) else Vector((0, 0, 1)))
        if pai:
            b.parent = eb[pai]
            b.use_connect = (eb[pai].tail - b.head).length < 1e-4
    bpy.ops.object.mode_set(mode='OBJECT')
    ad.bones['raiz'].use_deform = False
    for pb in arm.pose.bones:
        pb.rotation_mode = 'XYZ'
    return arm


# ------------------------------------------------------------------ animações
PERNAS_F = (('L', 'braco', 'antebraco', 'mao'), ('R', 'braco', 'antebraco', 'mao'))
PERNAS_T = (('L', 'coxa', 'canela', 'metatarso'), ('R', 'coxa', 'canela', 'metatarso'))


def passo(u, frente, amp, levanta):
    """Ângulos de uma perna no ciclo (u em 0..1): apoio (60%: vai da frente para trás, esticada) e
    balanço (40%: dobra e volta para a frente). Devolve (superior, meio, inferior) em graus."""
    u %= 1.0
    if u < 0.6:
        k = u / 0.6
        sup = amp * (1 - 2 * k)
        meio = 4 * math.sin(k * math.pi) if frente else -6 * math.sin(k * math.pi)
        inf = -8 * k if frente else 6 * k
    else:
        k = (u - 0.6) / 0.4
        sup = amp * (-1 + 2 * (0.5 - 0.5 * math.cos(k * math.pi)))
        f = math.sin(k * math.pi)
        meio = (-levanta * f) if frente else (levanta * 0.9 * f)
        inf = (-levanta * 0.8 * f - 8 * (1 - k)) if frente else (-levanta * 0.7 * f + 6 * (1 - k))
    return sup, meio, inf


def ciclo(arm, nome, quadros, fn, passo_q=2):
    """Ação cíclica a partir de fn(t em 0..1) → {osso: (rot) ou (rot, loc)}."""
    chaves = {}
    for f in range(1, quadros + 1, passo_q):
        t = (f - 1) / quadros
        for osso, v in fn(t).items():
            if len(v) == 3 and not isinstance(v[0], (tuple, list)):
                v = (v,)
            chaves.setdefault(osso, []).append((f,) + tuple(v))
    return B.acao(arm, nome, quadros + 1, chaves, ciclo=True)


def unica(arm, nome, quadros, chaves_q):
    """Ação de uma vez (ataque, dano, morte): chaves_q[quadro] = {osso: (rot) ou (rot, loc)}."""
    chaves = {}
    for f, D in sorted(chaves_q.items()):
        for osso, v in D.items():
            if len(v) == 3 and not isinstance(v[0], (tuple, list)):
                v = (v,)
            chaves.setdefault(osso, []).append((f,) + tuple(v))
    # ossos sem chave num quadro ficam na pose de repouso nas pontas
    for osso, K in chaves.items():
        if K[0][0] > 1:
            K.insert(0, (1, (0, 0, 0)) + ((((0, 0, 0)),) if len(K[0]) > 2 else ()))
    return B.acao(arm, nome, quadros, chaves, ciclo=False)


def animacoes(arm):
    S = math.sin
    def andar_gen(fases, amp_f, amp_t, lev, bob, cauda, cabeca, coluna=0.0):
        def fn(t):
            D = {}
            for (L, a, b, c), ph in zip(PERNAS_F, fases[:2]):
                s1, s2, s3 = passo(t + ph, True, amp_f, lev)
                D[f'{a}.{L}'] = (s1, 0, 0); D[f'{b}.{L}'] = (s2, 0, 0); D[f'{c}.{L}'] = (s3, 0, 0)
            for (L, a, b, c), ph in zip(PERNAS_T, fases[2:]):
                s1, s2, s3 = passo(t + ph, False, amp_t, lev)
                D[f'{a}.{L}'] = (s1, 0, 0); D[f'{b}.{L}'] = (s2, 0, 0); D[f'{c}.{L}'] = (s3, 0, 0)
            D['raiz'] = ((0, 0, 0), (0, 0, bob * abs(S(t * 4 * math.pi))))
            D['quadril'] = (coluna * S(t * 2 * math.pi), 0, 3 * S(t * 2 * math.pi))
            D['coluna1'] = (-coluna * 0.5 * S(t * 2 * math.pi + 0.6), 0, -1.5 * S(t * 2 * math.pi))
            D['peito'] = (-coluna * 0.5 * S(t * 2 * math.pi + 1.2), 0, -2 * S(t * 2 * math.pi))
            D['pescoco1'] = (cabeca * S(t * 4 * math.pi), 0, 0)
            D['cabeca'] = (-cabeca * 0.6 * S(t * 4 * math.pi), 0, 0)
            D['cauda1'] = (-6, 0, cauda * S(t * 2 * math.pi))
            D['cauda2'] = (-4, 0, cauda * 1.2 * S(t * 2 * math.pi - 0.8))
            D['cauda3'] = (-2, 0, cauda * 1.4 * S(t * 2 * math.pi - 1.6))
            return D
        return fn
    # idle: respiração, a cabeça olhando em volta, a cauda devagar, uma orelha que mexe
    ciclo(arm, 'idle', 72, lambda t: {
        'coluna2': (1.2 * S(t * 2 * math.pi * 3), 0, 0), 'peito': (1.5 * S(t * 2 * math.pi * 3 + 0.4), 0, 0),
        'pescoco1': (2 * S(t * 2 * math.pi), 0, 6 * S(t * 2 * math.pi)), 'cabeca': (-2 * S(t * 2 * math.pi), 0, 10 * S(t * 2 * math.pi + 0.5)),
        'orelha.L': (-18 * max(0, S(t * 2 * math.pi * 2)) ** 8, 0, 0), 'orelha.R': (-14 * max(0, S(t * 2 * math.pi * 2 + 2.2)) ** 8, 0, 0),
        'cauda1': (-8, 0, 7 * S(t * 2 * math.pi)), 'cauda2': (-4, 0, 9 * S(t * 2 * math.pi - 0.7)), 'cauda3': (-2, 0, 11 * S(t * 2 * math.pi - 1.4)),
        'mandibula': (-3 * max(0, S(t * 2 * math.pi * 3)), 0, 0)})
    # andar (passo lateral: TE, FE, TD, FD), trotar (diagonais) e correr (galope rotativo)
    ciclo(arm, 'andar', 28, andar_gen((0.25, 0.75, 0.0, 0.5), 20, 18, 34, 0.012, 9, 3))
    ciclo(arm, 'trotar', 18, andar_gen((0.0, 0.5, 0.5, 0.0), 26, 24, 48, 0.02, 12, 4))
    ciclo(arm, 'correr', 14, andar_gen((0.0, 0.1, 0.55, 0.62), 36, 34, 62, 0.05, 6, 6, coluna=9))
    # atacar: abaixa, dá o bote (o corpo vai à frente), a mandíbula abre e fecha na mordida, volta
    A = lambda dz=0, dy=0: (0, dy, dz)
    unica(arm, 'atacar', 22, {
        1: {'raiz': ((0, 0, 0), A()), 'pescoco1': (0, 0, 0), 'cabeca': (0, 0, 0), 'mandibula': (0, 0, 0), 'orelha.L': (0, 0, 0), 'orelha.R': (0, 0, 0),
            'braco.L': (0, 0, 0), 'braco.R': (0, 0, 0), 'coxa.L': (0, 0, 0), 'coxa.R': (0, 0, 0), 'canela.L': (0, 0, 0), 'canela.R': (0, 0, 0)},
        7: {'raiz': ((0, 0, 0), A(-0.07, 0.05)), 'pescoco1': (-14, 0, 0), 'cabeca': (6, 0, 0), 'mandibula': (-6, 0, 0), 'orelha.L': (-30, 0, 0), 'orelha.R': (-30, 0, 0),
            'braco.L': (14, 0, 0), 'braco.R': (14, 0, 0), 'coxa.L': (18, 0, 0), 'coxa.R': (18, 0, 0), 'canela.L': (16, 0, 0), 'canela.R': (16, 0, 0)},
        11: {'raiz': ((0, 0, 0), A(0.06, -0.22)), 'pescoco1': (6, 0, 0), 'cabeca': (8, 0, 0), 'mandibula': (-38, 0, 0), 'orelha.L': (-20, 0, 0), 'orelha.R': (-20, 0, 0),
             'braco.L': (34, 0, 0), 'braco.R': (30, 0, 0), 'coxa.L': (-30, 0, 0), 'coxa.R': (-28, 0, 0), 'canela.L': (-10, 0, 0), 'canela.R': (-10, 0, 0)},
        13: {'mandibula': (2, 0, 0), 'cabeca': (-4, 0, 0)},
        16: {'raiz': ((0, 0, 0), A(0, -0.14)), 'pescoco1': (-4, 0, 0), 'cabeca': (-6, 0, 6), 'mandibula': (0, 0, 0)},
        22: {'raiz': ((0, 0, 0), A()), 'pescoco1': (0, 0, 0), 'cabeca': (0, 0, 0), 'mandibula': (0, 0, 0), 'orelha.L': (0, 0, 0), 'orelha.R': (0, 0, 0),
             'braco.L': (0, 0, 0), 'braco.R': (0, 0, 0), 'coxa.L': (0, 0, 0), 'coxa.R': (0, 0, 0), 'canela.L': (0, 0, 0), 'canela.R': (0, 0, 0)}})
    # saltar (investida): agacha, voa esticado, pousa
    unica(arm, 'saltar', 20, {
        1: {'raiz': ((0, 0, 0), A()), 'braco.L': (0, 0, 0), 'braco.R': (0, 0, 0), 'coxa.L': (0, 0, 0), 'coxa.R': (0, 0, 0), 'pescoco1': (0, 0, 0), 'cauda1': (0, 0, 0)},
        5: {'raiz': ((0, 0, 0), A(-0.08)), 'braco.L': (10, 0, 0), 'braco.R': (10, 0, 0), 'coxa.L': (22, 0, 0), 'coxa.R': (22, 0, 0), 'pescoco1': (-10, 0, 0), 'cauda1': (-10, 0, 0)},
        10: {'raiz': ((0, 0, 0), A(0.22, -0.1)), 'braco.L': (48, 0, 0), 'braco.R': (44, 0, 0), 'coxa.L': (-42, 0, 0), 'coxa.R': (-40, 0, 0), 'pescoco1': (8, 0, 0), 'cauda1': (8, 0, 0)},
        15: {'raiz': ((0, 0, 0), A(0.02, -0.04)), 'braco.L': (20, 0, 0), 'braco.R': (18, 0, 0), 'coxa.L': (-8, 0, 0), 'coxa.R': (-8, 0, 0), 'pescoco1': (-6, 0, 0), 'cauda1': (-4, 0, 0)},
        20: {'raiz': ((0, 0, 0), A()), 'braco.L': (0, 0, 0), 'braco.R': (0, 0, 0), 'coxa.L': (0, 0, 0), 'coxa.R': (0, 0, 0), 'pescoco1': (0, 0, 0), 'cauda1': (0, 0, 0)}})
    # dano: o corpo encolhe de lado, a cabeça recua, orelhas para trás, cauda entre as pernas
    unica(arm, 'dano', 12, {
        1: {'raiz': ((0, 0, 0), A()), 'cabeca': (0, 0, 0), 'pescoco1': (0, 0, 0), 'orelha.L': (0, 0, 0), 'orelha.R': (0, 0, 0), 'cauda1': (0, 0, 0)},
        4: {'raiz': ((0, 9, 0), A(-0.03, 0.04)), 'cabeca': (10, 0, -16), 'pescoco1': (-8, 0, -8), 'orelha.L': (-40, 0, 0), 'orelha.R': (-40, 0, 0), 'cauda1': (-30, 0, 0)},
        12: {'raiz': ((0, 0, 0), A()), 'cabeca': (0, 0, 0), 'pescoco1': (0, 0, 0), 'orelha.L': (0, 0, 0), 'orelha.R': (0, 0, 0), 'cauda1': (0, 0, 0)}})
    # atordoado: cabeça baixa balançando, orelhas caídas
    ciclo(arm, 'atordoado', 36, lambda t: {
        'pescoco1': (-18, 0, 8 * S(t * 2 * math.pi)), 'cabeca': (-10, 6 * S(t * 2 * math.pi), 0), 'orelha.L': (-35, 0, 0), 'orelha.R': (-35, 0, 0),
        'raiz': ((0, 4 * S(t * 2 * math.pi), 0), (0, 0, -0.02)), 'cauda1': (-26, 0, 0)})
    # morte: as pernas cedem, o corpo cai de lado e fica
    unica(arm, 'morte', 40, {
        1: {'raiz': ((0, 0, 0), A()), 'braco.L': (0, 0, 0), 'braco.R': (0, 0, 0), 'antebraco.L': (0, 0, 0), 'antebraco.R': (0, 0, 0), 'coxa.L': (0, 0, 0), 'coxa.R': (0, 0, 0),
            'canela.L': (0, 0, 0), 'canela.R': (0, 0, 0), 'pescoco1': (0, 0, 0), 'cabeca': (0, 0, 0), 'mandibula': (0, 0, 0), 'cauda1': (0, 0, 0)},
        10: {'raiz': ((0, 0, 0), A(-0.16)), 'braco.L': (22, 0, 0), 'braco.R': (18, 0, 0), 'antebraco.L': (-40, 0, 0), 'antebraco.R': (-36, 0, 0), 'coxa.L': (24, 0, 0), 'coxa.R': (20, 0, 0),
             'canela.L': (30, 0, 0), 'canela.R': (26, 0, 0), 'pescoco1': (-22, 0, 0), 'cabeca': (-8, 0, 0), 'mandibula': (-10, 0, 0), 'cauda1': (-20, 0, 0)},
        22: {'raiz': ((0, 82, 0), A(-0.33, 0)), 'braco.L': (30, 0, 0), 'braco.R': (8, 0, 0), 'antebraco.L': (-20, 0, 0), 'antebraco.R': (-12, 0, 0), 'coxa.L': (10, 0, 0), 'coxa.R': (-6, 0, 0),
             'canela.L': (12, 0, 0), 'canela.R': (6, 0, 0), 'pescoco1': (-10, 0, 14), 'cabeca': (-14, 0, 10), 'mandibula': (-14, 0, 0), 'cauda1': (-6, 0, 10)},
        40: {'raiz': ((0, 86, 0), A(-0.34, 0)), 'braco.L': (28, 0, 0), 'braco.R': (10, 0, 0), 'antebraco.L': (-18, 0, 0), 'antebraco.R': (-10, 0, 0), 'coxa.L': (8, 0, 0), 'coxa.R': (-4, 0, 0),
             'canela.L': (10, 0, 0), 'canela.R': (4, 0, 0), 'pescoco1': (-8, 0, 18), 'cabeca': (-16, 0, 12), 'mandibula': (-12, 0, 0), 'cauda1': (-4, 0, 12)}})
    # --- animal de companhia (js/mundo/pets.js): sentar, dormir deitado, comer, brincar e carinho
    # (sinais conferidos na vista lateral: quadril + ergue a frente; coxa + leva o joelho à frente;
    # canela − dobra o jarrete para trás; metatarso + apoia a pata; braço − leva a pata da frente para trás)
    # sentar: a garupa desce, peito erguido, as patas da frente retas; olha em volta
    ciclo(arm, 'sentar', 48, lambda t: {
        'raiz': ((0, 0, 0), A(-0.2, 0.1)), 'quadril': (24, 0, 0), 'coluna1': (2, 0, 0), 'peito': (2 + 1.2 * S(t * 2 * math.pi * 2), 0, 0),
        'braco.L': (-28, 0, 0), 'braco.R': (-28, 0, 0), 'antebraco.L': (2, 0, 0), 'antebraco.R': (2, 0, 0),
        'coxa.L': (30, 0, 0), 'coxa.R': (30, 0, 0), 'canela.L': (-100, 0, 0), 'canela.R': (-100, 0, 0), 'metatarso.L': (72, 0, 0), 'metatarso.R': (72, 0, 0),
        'pescoco1': (-12, 0, 0), 'cabeca': (-2, 0, 12 * S(t * 2 * math.pi)), 'cauda1': (-6, 0, 6 * S(t * 2 * math.pi)), 'cauda2': (10, 0, 0)})
    # dormir: deitado de barriga, as patas dobradas, a cabeça à frente sobre as patas, respiração lenta
    ciclo(arm, 'dormir', 72, lambda t: {
        'raiz': ((0, 0, 0), A(-0.36 + 0.006 * S(t * 2 * math.pi * 2), 0.02)), 'peito': (1.5 * S(t * 2 * math.pi * 2), 0, 0),
        'braco.L': (-30, 0, 0), 'braco.R': (-30, 0, 0), 'antebraco.L': (100, 0, 0), 'antebraco.R': (100, 0, 0), 'mao.L': (-20, 0, 0), 'mao.R': (-20, 0, 0),
        'coxa.L': (70, 0, 0), 'coxa.R': (70, 0, 0), 'canela.L': (-120, 0, 0), 'canela.R': (-120, 0, 0), 'metatarso.L': (60, 0, 0), 'metatarso.R': (60, 0, 0),
        'pescoco1': (-22, 0, 6), 'cabeca': (-10, 0, 8), 'orelha.L': (-30, 0, 0), 'orelha.R': (-30, 0, 0),
        'cauda1': (-20, 0, 30), 'cauda2': (-8, 0, 24), 'cauda3': (0, 0, 18)})
    # comer: a cabeça no chão, mastiga
    unica(arm, 'comer', 36, {
        1: {'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'mandibula': (0, 0, 0), 'braco.L': (0, 0, 0), 'braco.R': (0, 0, 0)},
        8: {'pescoco1': (-46, 0, 0), 'pescoco2': (-20, 0, 0), 'cabeca': (-16, 0, 0), 'mandibula': (-14, 0, 0), 'braco.L': (14, 0, 0), 'braco.R': (14, 0, 0)},
        14: {'mandibula': (-2, 0, 0)}, 20: {'mandibula': (-14, 0, 0)}, 26: {'mandibula': (-2, 0, 0), 'pescoco1': (-40, 0, 0)},
        36: {'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'mandibula': (0, 0, 0), 'braco.L': (0, 0, 0), 'braco.R': (0, 0, 0)}})
    # brincar: o convite (peito no chão, garupa alta, cauda abanando) e pulinhos de lado
    ciclo(arm, 'brincar', 24, lambda t: {
        'raiz': ((0, 6 * S(t * 2 * math.pi), 0), A(-0.06 + 0.05 * abs(S(t * 2 * math.pi)), 0)), 'peito': (-16, 0, 0), 'quadril': (8, 0, 0),
        'braco.L': (40, 0, 0), 'braco.R': (40, 0, 0), 'antebraco.L': (-34, 0, 0), 'antebraco.R': (-34, 0, 0),
        'pescoco1': (10 + 6 * S(t * 2 * math.pi * 2), 0, 0), 'cabeca': (0, 10 * S(t * 2 * math.pi), 0), 'mandibula': (-12, 0, 0),
        'cauda1': (8, 0, 34 * S(t * 2 * math.pi * 3)), 'cauda2': (4, 0, 24 * S(t * 2 * math.pi * 3 - 0.8))})
    # carinho: inclina a cabeça, orelhas para trás, a cauda abana forte
    unica(arm, 'carinho', 48, {
        1: {'cabeca': (0, 0, 0), 'pescoco1': (0, 0, 0), 'orelha.L': (0, 0, 0), 'orelha.R': (0, 0, 0), 'cauda1': (0, 0, 0), 'cauda2': (0, 0, 0)},
        10: {'cabeca': (-6, 16, 10), 'pescoco1': (-10, 0, 8), 'orelha.L': (-34, 0, 0), 'orelha.R': (-34, 0, 0), 'cauda1': (10, 0, 30), 'cauda2': (6, 0, 22)},
        18: {'cauda1': (10, 0, -30), 'cauda2': (6, 0, -22)}, 26: {'cauda1': (10, 0, 30), 'cauda2': (6, 0, 22), 'cabeca': (-8, -12, 12)},
        34: {'cauda1': (10, 0, -30), 'cauda2': (6, 0, -22)},
        48: {'cabeca': (0, 0, 0), 'pescoco1': (0, 0, 0), 'orelha.L': (0, 0, 0), 'orelha.R': (0, 0, 0), 'cauda1': (0, 0, 0), 'cauda2': (0, 0, 0)}})
    # uivar: senta um pouco, ergue a cabeça e abre a boca devagar
    unica(arm, 'uivar', 72, {
        1: {'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'mandibula': (0, 0, 0), 'coxa.L': (0, 0, 0), 'coxa.R': (0, 0, 0), 'canela.L': (0, 0, 0), 'canela.R': (0, 0, 0), 'raiz': ((0, 0, 0), A()), 'quadril': (0, 0, 0)},
        16: {'pescoco1': (24, 0, 0), 'pescoco2': (18, 0, 0), 'cabeca': (22, 0, 0), 'mandibula': (-10, 0, 0), 'coxa.L': (26, 0, 0), 'coxa.R': (26, 0, 0), 'canela.L': (24, 0, 0), 'canela.R': (24, 0, 0), 'raiz': ((0, 0, 0), A(-0.06, 0.02)), 'quadril': (-12, 0, 0)},
        50: {'pescoco1': (28, 0, 0), 'pescoco2': (22, 0, 0), 'cabeca': (26, 0, 0), 'mandibula': (-24, 0, 0)},
        72: {'pescoco1': (0, 0, 0), 'pescoco2': (0, 0, 0), 'cabeca': (0, 0, 0), 'mandibula': (0, 0, 0), 'coxa.L': (0, 0, 0), 'coxa.R': (0, 0, 0), 'canela.L': (0, 0, 0), 'canela.R': (0, 0, 0), 'raiz': ((0, 0, 0), A()), 'quadril': (0, 0, 0)}})


RIGIDOS = {'g_olho': 'cabeca', 'g_nariz': 'cabeca', 'g_dente_cima': 'cabeca', 'g_mandibula': 'mandibula', 'g_orelha_L': 'orelha.L', 'g_orelha_R': 'orelha.R',
           'g_pata_FL': 'mao.L', 'g_pata_FR': 'mao.R', 'g_pata_HL': 'pe.L', 'g_pata_HR': 'pe.R'}


def construir(pel, assar=True):
    U.limpar_cena()
    base, lobo, corpo_peso = montar_malha(pel)
    hi = None
    if assar:
        hi = B.alta_de(lobo, f'{pel}_alta', subdiv=1, deslocamentos=[('pelo', 0.035, 0.008), ('tufos', 0.09, 0.014)])
        for m in hi.modifiers:
            if m.type == 'DISPLACE':
                m.vertex_group = 'g_corpo'
        B.assar_alta_baixa(lobo, hi, lado=1024, amostras_ao=16, extrusao=0.025, forca_emissao=2.0)
        hi.hide_set(True)
        hi.hide_render = True
    arm = esqueleto()
    sem = B.pesar(lobo, arm, RIGIDOS, corpo=corpo_peso)
    print('vértices sem osso:', sem)
    animacoes(arm)
    M = PELAGENS[pel]
    pasta = B.pasta(M['pasta'], pel)
    glb = B.exportar(os.path.join(pasta, f'{pel}.glb'), [lobo, arm])
    # prévias: a pose de repouso e quadros das animações
    prev = os.path.join(pasta, f'{pel}.png')
    U.renderizar_previa(prev, [lobo], lado=640, amostras=24, angulo=(68, 0, 55))
    folha = []
    for nm, q in (('andar', 8), ('correr', 5), ('atacar', 11), ('uivar', 50), ('morte', 40), ('sentar', 10), ('dormir', 10), ('comer', 8), ('brincar', 6)):
        for pb in arm.pose.bones:
            pb.location = (0, 0, 0)
            pb.rotation_euler = (0, 0, 0)
        arm.animation_data.action = bpy.data.actions[nm]
        bpy.context.scene.frame_set(q)
        f = os.path.join(B.RAIZ, '.cache_criacao', f'{pel}_{nm}.png')
        U.renderizar_previa(f, [lobo], lado=400, amostras=12, angulo=(70, 0, 55))
        folha.append(f)
    arm.animation_data.action = None
    bpy.context.scene.frame_set(1)
    blend = B.salvar_blend(os.path.join(pasta, f'{pel}.blend'))
    U.registrar(pel, 'criatura', glb, prev, [lobo], extra={'blend': os.path.relpath(blend, B.RAIZ), 'ossos': len(arm.data.bones),
                'animacoes': sorted(a.name for a in bpy.data.actions), 'sem_osso': sem, 'folha': [os.path.relpath(x, B.RAIZ) for x in folha]})
    return glb


if __name__ == '__main__':
    so_forma = 'forma' in U.args()
    if not so_forma:
        for pel in [a for a in U.args() if a in PELAGENS] or list(PELAGENS):
            construir(pel)
        sys.exit(0)
    U.limpar_cena()
    base, lobo, _ = montar_malha('lobo_cinzento')
    print('tris', U.contar_tris([lobo]))
    if so_forma:
        out = os.path.join(B.RAIZ, '.cache_criacao', 'lobo_forma.png')
        U.renderizar_previa(out, [lobo], lado=640, amostras=16, angulo=(70, 0, 55))
        U.renderizar_previa(out.replace('.png', '_lado.png'), [lobo], lado=640, amostras=16, angulo=(85, 0, 90))
        U.renderizar_previa(out.replace('.png', '_frente.png'), [lobo], lado=640, amostras=16, angulo=(80, 0, 0))
