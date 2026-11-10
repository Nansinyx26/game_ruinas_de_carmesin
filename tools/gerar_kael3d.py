"""Gera js/assets/kael3d.js: o Kael 3D (malha + textura) a partir da arte oficial.

Origem: assets/images/kael_frente.jpg e kael_costas.jpg (frente e costas em alta
resolução, fundo xadrez claro) e os perfis LADO DIREITO e LADO ESQUERDO da ficha
assets/images/kael_ficha.jpg ("KAEL VEYRON · UNIDADE ZERO").
  1. Silhuetas: cada vista é separada do fundo (subtração do degradê + GrabCut).
  2. Escultura: o volume é a interseção das 4 silhuetas (casco visual) numa grade
     de voxels, com as seções arredondadas (superelipse entre largura e profundidade).
  3. Partes: o volume é dividido pelos ossos do esqueleto do Kael (js/models/kael.js,
     exportado por tools/kael_rig.js): cabeça, tronco, braços, pernas e as abas do
     casaco. Cada parte vira uma malha (marching cubes + simplificação) guardada no
     espaço do seu nó, então o Kael 3D usa as mesmas poses e animações do modelo antigo.
  4. UV: as partes são desdobradas num atlas único (xatlas).
  5. Textura: cada texel recebe a cor das vistas que enxergam aquele ponto, com peso
     pela direção da superfície e teste de oclusão (mapa de profundidade de cada
     vista): sem costuras nem listras entre a frente, os lados e as costas.
As etapas comuns ficam em tools/escultor3d.py (também usadas por tools/gerar_aliado3d.py).

Uso (na pasta do projeto):  python3 tools/gerar_kael3d.py
Hoje o Kael do jogo vem do modelo importado do Meshy (tools/importar_modelo.py); este gerador
continua como alternativa feita só com as imagens da arte e sobrescreve o mesmo arquivo.
Requer node, numpy, scipy, opencv-python-headless, scikit-image, fast-simplification,
xatlas e Pillow. SALVAR_PNG=arquivo.png também salva a textura para conferir.
"""
import json
import os

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import morphology

from detalhes3d import (CABELO, COURO, FOSCO, METAL, Pecas, anel, base_local, caixa, fita, fivela, mecha_sobre, na_superficie,
                        perfil, placa, raio, rebite, toro)
from escultor3d import (RAIZ, Escultura, Q, assar, codificar_pele, dois_ossos, esqueleto, mapa_material, pesos_pele, projecao,
                        referencias, rot_entre, unit)

IMAGENS = os.path.join(RAIZ, 'assets', 'images')
DESTINO = os.path.join(RAIZ, 'js', 'assets', 'kael3d.js')
# Vistas: imagem de origem e caixa (x0, y0, x1, y1) na ficha, ou None = imagem inteira com fundo xadrez
VIEWS = {'front': ('kael_frente.jpg', None), 'sideR': ('kael_ficha.jpg', (478, 24, 578, 372)),
         'back': ('kael_costas.jpg', None), 'sideL': ('kael_ficha.jpg', (752, 24, 856, 372))}
HU = 62.1           # altura do Kael em unidades do jogo (a mesma do esqueleto)
VOX = 0.32          # aresta do voxel da escultura
TEX = 2048          # lado da textura
NITIDEZ = 0.35      # realce de nitidez da textura assada


# ======================================================================== 1. silhuetas
def segmentar(im8, box, lado):
    x0, y0, x1, y1 = box
    c8 = im8[y0:y1, x0:x1].copy()
    c = c8.astype(np.float32)
    H, W = c.shape[:2]
    # Fundo: degradê estimado pelas bordas de cada linha
    L = ndimage.uniform_filter1d(np.median(c[:, :5], axis=1), 15, axis=0)
    R = ndimage.uniform_filter1d(np.median(c[:, -5:], axis=1), 15, axis=0)
    t = np.linspace(0, 1, W)[None, :, None]
    bg = L[:, None, :] * (1 - t) + R[:, None, :] * t
    score = np.maximum(np.abs(c - bg).max(axis=2) * 0.6, bg.mean(axis=2) - c.mean(axis=2))
    gm = np.zeros((H, W), np.uint8)
    cv2.grabCut(c8, gm, (3, 3, W - 6, H - 18), np.zeros((1, 65)), np.zeros((1, 65)), 8, cv2.GC_INIT_WITH_RECT)
    m = ((score > 9) | (gm == 1) | (gm == 3)).astype(np.uint8)
    m[-14:, :] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

    def maior(mm):
        n, lab, st, _ = cv2.connectedComponentsWithStats(mm.astype(np.uint8))
        return lab == (1 + np.argmax(st[1:, cv2.CC_STAT_AREA]))
    m = ndimage.binary_fill_holes(maior(m))
    ys, xs = np.nonzero(m)
    top, bot = ys.min(), ys.max()
    # Cabeça: só o que está ligado ao centro (o fundo escuro ao lado do cabelo sai)
    faixa = m[int(top + (bot - top) * 0.1):int(top + (bot - top) * 0.2)]
    cx = np.median(np.nonzero(faixa)[1]) if faixa.sum() else W / 2
    for y in range(top, int(top + (bot - top) * 0.13)):
        xs_ = np.nonzero(m[y] & (score[y] > 15))[0]
        xs_ = xs_[np.abs(xs_ - cx) < W * (0.34 if lado else 0.2)]   # de perfil o rosto fica fora do eixo
        m[y] = False
        if len(xs_):
            m[y, xs_.min():xs_.max() + 1] = True
    m = ndimage.binary_fill_holes(maior(ndimage.binary_opening(m, iterations=1)))
    return c8, m, m


def segmentar_xadrez(c8):
    """Personagem escuro sobre o xadrez claro (cinza, sem cor) das imagens de frente e costas."""
    g = c8.astype(np.int32)
    claro = (g.mean(axis=2) > 214) & (g.max(axis=2) - g.min(axis=2) < 14)
    lab, n = ndimage.label(claro)
    tam = ndimage.sum(claro, lab, range(1, n + 1))
    borda = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    m = ~np.isin(lab, [i for i in borda])
    lab2, n2 = ndimage.label(ndimage.binary_opening(m, iterations=2))
    m = ndimage.binary_fill_holes(lab2 == 1 + np.argmax(ndimage.sum(lab2 > 0, lab2, range(1, n2 + 1))))
    # vãos fechados entre braço e corpo: manchas grandes de fundo dentro da silhueta
    m &= ~np.isin(lab, [i + 1 for i in range(n) if tam[i] > 120 and i + 1 not in borda])
    # as cores vêm de 2 px para dentro (a borda tem a mistura com o fundo claro)
    return c8, m, ndimage.binary_erosion(m, iterations=2)


masks, cores, origens = {}, {}, {}
for nome, (arq, box) in VIEWS.items():
    im8 = cv2.imread(os.path.join(IMAGENS, arq))
    c8, m, mc = segmentar(im8, box, nome.startswith('side')) if box else segmentar_xadrez(im8)
    origens[nome] = c8
    # Cores do personagem estendidas para o fundo (vizinho mais próximo dentro da silhueta)
    _, (iy, ix) = ndimage.distance_transform_edt(~mc, return_indices=True)
    cores[nome], masks[nome] = c8[iy, ix], m

# ======================================================================== 2. escultura
P = projecao(masks, HU)
esc = Escultura(masks, P, HU, VOX, ((-13, 13), (-15.5, 15.5), (-0.6, 63.2)),
                lambda Z: np.where(Z > 52.0, 1.9, 2.4))    # a cabeça é mais redonda que o casaco
X, Y, Z, solid = esc.X, esc.Y, esc.Z, esc.solid

# ======================================================================== 3. ossos e partes
Wr = esqueleto()                  # esqueleto padrão: as juntas do quadril de onde partem as pernas da arte


def borda_frente(z, lado):        # |y| da borda externa da silhueta frontal na altura z (lado +1 = +Y)
    p = P['front']
    cols = np.nonzero(masks['front'][int(round(p['top'] + (HU - z) * p['s']))])[0]
    return abs(((cols.min() if lado > 0 else cols.max()) - p['c']) / p['s'])


def centro_perna(z, lado):        # centro da perna (y) na vista de frente, abaixo do casaco
    p = P['front']
    m = masks['front'][int(round(p['top'] + (HU - z) * p['s']))]
    d = np.diff(np.concatenate([[0], m.astype(int), [0]]))
    cs = [-((a0 + b0) / 2 - p['c']) / p['s'] for a0, b0 in zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0] - 1) if b0 - a0 > 8]
    cs = [c for c in cs if np.sign(c) == lado] or [lado * 4.5]
    return max(cs, key=abs) if lado > 0 else min(cs, key=lambda q: -abs(q))


# Ossos na pose da arte: (início, fim, raio)
LTH, LSH = 12.8, 12.2
bones, punho = {}, {}
for lado, nm in ((1, 'R'), (-1, 'L')):
    # braços: caem ao lado do corpo, centro a ~2,6 da borda externa; ombro, cotovelo e
    # punho na altura da arte
    y_braco = lado * (np.mean([borda_frente(z, lado) for z in (30, 34, 38)]) - 2.6)
    ombro = np.array([0.6, lado * min(abs(y_braco), 8.5), 44.0])
    cot = np.array([-0.4, y_braco, 34.6])
    pun = np.array([1.0, y_braco, 26.4])
    punho[nm] = pun
    bones['arm' + nm + 'u'] = (ombro, cot, 3.0)
    bones['arm' + nm + 'f'] = (cot, pun + unit(pun - cot) * 3.6, 2.7)
    # pernas: do quadril do esqueleto ao tornozelo na abertura da arte
    quadril = Wr['thigh' + nm][:, 3].copy()
    joelho, tornozelo = dois_ossos(quadril, np.array([0.6, centro_perna(5.0, lado), 3.6]), LTH, LSH, np.array([1.0, 0, 0]))
    bones['thigh' + nm] = (quadril, joelho, 3.3)
    bones['shin' + nm] = (joelho, tornozelo, 3.1)
    bones['foot' + nm] = (tornozelo, tornozelo + np.array([3, 0, -3.6]), 3.4)

# Proporções do esqueleto tiradas da arte (ombros mais altos e largos, braços mais curtos e o
# pescoço mais alto que os do modelo procedural): o esqueleto do Kael com a arte é montado com
# elas (MODELS3D.kael.build(KAEL3D.props)), então a malha quase não precisa ser deslocada
Z_CINTURA, Z_OMBRO, Z_PESCOCO, Z_BARRA = 28.6, 47.0, 52.0, 10.2
TORSO_Z = 29.5
L = lambda a, b: float(np.linalg.norm(b - a))
PROPS = {'SHY': 6.7, 'SHZ': 10.6, 'HIPY': 3.5, 'HZ0': 2.5, 'HAND0': 1.4, 'AUP': 9.8, 'AFO': 9.6,
         'LTH': LTH, 'LSH': LSH, 'ANK': 3.6, 'NECK': 13.8}
PROPS.update({
    'SHY': round(float(np.mean([abs(bones['arm' + n + 'u'][0][1]) for n in 'RL'])), 3),
    'SHZ': round(float(bones['armRu'][0][2] - TORSO_Z), 3),
    'AUP': round(np.mean([L(*bones['arm' + n + 'u'][:2]) for n in 'RL']), 3),
    'AFO': round(np.mean([L(bones['arm' + n + 'f'][0], punho[n]) for n in 'RL']), 3),
    'NECK': round(Z_PESCOCO - 0.6 - TORSO_Z, 3), 'HAIR': 5.4,
})
print('proporções', PROPS)
Wn = esqueleto(PROPS)

part = {}
dist = {k: esc.dist_seg(a, b) for k, (a, b, r) in bones.items()}
braco = np.zeros(X.shape, bool)
for k in ('armRu', 'armRf', 'armLu', 'armLf'):
    part[k] = solid & (dist[k] < bones[k][2]) & (Z < 44)
    braco |= part[k]
# a mão (punho fechado da arte) sai: as luvas com dedos são modeladas à parte (js/models/kael_tex3d.js)
for nm in 'RL':
    a, b, _ = bones['arm' + nm + 'f']
    d = unit(punho[nm] - a)
    t = (X - a[0]) * d[0] + (Y - a[1]) * d[1] + (Z - a[2]) * d[2]
    mao = braco & (t > L(a, punho[nm]) + 0.2) & (np.sign(Y) == (1 if nm == 'R' else -1))
    part['arm' + nm + 'f'] &= ~mao
cabeca = solid & (Z > Z_PESCOCO) & ((((X - 1.0) ** 2 + Y ** 2) < 5.4 ** 2) | (Z > 55.5))
part['head'] = cabeca
# tronco (sem braços nem cabeça) com as axilas preenchidas: casco convexo de cada fatia
# até a altura dos ombros (acima disso o casco convexo criaria volume em volta do queixo)
tronco = solid & (Z >= Z_CINTURA) & ~cabeca & ~braco
for k in range(tronco.shape[2]):
    if esc.zs[k] < Z_OMBRO and tronco[:, :, k].sum() > 3:
        tronco[:, :, k] = morphology.convex_hull_image(tronco[:, :, k]) & ~braco[:, :, k]    # o braço fica fora do tronco
tronco &= ~cabeca
# capuz: o volume dobrado atrás do pescoço (osso próprio, com movimento secundário)
part['hood'] = tronco & (Z > Z_OMBRO + 0.5) & (X < -1.2)
part['torso'] = tronco & ~part['hood']
# pernas: abaixo da barra, e as coxas/canelas dentro do casaco
pernas = {}
for nm in ('R', 'L'):
    for k in ('thigh' + nm, 'shin' + nm, 'foot' + nm):
        pernas[k] = (dist[k] < bones[k][2]) & (Z < Z_CINTURA + 1.0)
chaves = list(pernas)
dono = np.argmin(np.stack([dist[k] for k in chaves]), axis=0)
for i, k in enumerate(chaves):
    part[k] = pernas[k] & (dono == i) & (solid | (Z > Z_BARRA))
    # botas: o casco das vistas alarga a bota com a ponta virada para fora; fica perto da canela
    if k.startswith('foot'):
        part[k] &= np.abs(Y - bones[k][0][1]) < 2.4
# casaco: casca externa (espessura 1,6) entre a cintura e a barra, sem a abertura da frente
baixo = solid & (Z < Z_CINTURA) & ~braco
casca = baixo & (ndimage.distance_transform_edt(baixo, sampling=VOX) <= 1.6)
ang = np.degrees(np.arctan2(Y, X))
abertura = (np.abs(ang) < 30) & (np.abs(Y) < 7.5)
casaco = casca & ~abertura & ~np.any(np.stack([part[k] & (Z < Z_BARRA) for k in chaves]), axis=0)
ABAS = {'cFR': 64, 'cSR': 107, 'cBR': 147, 'cBL': -147, 'cSL': -107, 'cFL': -64}
aba = np.argmin(np.stack([np.abs((ang - c + 180) % 360 - 180) for c in ABAS.values()]), axis=0)
for i, k in enumerate(ABAS):
    dobra = Wn[k + '2'][2, 3]
    sel = casaco & (aba == i)
    part[k] = sel & (Z >= dobra)
    part[k + '2'] = sel & (Z < dobra)
# calça na abertura da frente (entre as abas): vai com as pernas (cada metade com a sua)
calca = casca & abertura & (Z >= Z_BARRA)
for nm, sg in (('R', 1), ('L', -1)):
    lado = calca & (np.sign(Y) == sg)
    perto = np.argmin(np.stack([dist['thigh' + nm], dist['shin' + nm]]), axis=0)
    part['thigh' + nm] |= lado & (perto == 0)
    part['shin' + nm] |= lado & (perto == 1)
# topo das coxas (acima da junta do quadril): gira com o quadril, não com a perna
for nm in 'RL':
    topo = part['thigh' + nm] & (Z > Wn['thigh' + nm][2, 3] + 0.6)
    part['hips' + nm] = topo
    part['thigh' + nm] &= ~topo

# ======================================================================== 4. malhas com pele
# Cada grupo é uma malha só (sem frestas nas juntas); os pesos passam de um osso ao outro
# numa faixa de ~2·sigma. Grupos separados onde as partes se movem muito uma contra a outra
# (braços × tronco, pernas × casaco)
GRUPOS = {
    'cabeca': (['head'], 1.0, 2000),
    'corpo': (['torso', 'hood'], 1.3, 2600),
    'bracoR': (['armRu', 'armRf'], 1.2, 900), 'bracoL': (['armLu', 'armLf'], 1.2, 900),
    'pernaR': (['hipsR', 'thighR', 'shinR', 'footR'], 1.0, 1300), 'pernaL': (['hipsL', 'thighL', 'shinL', 'footL'], 1.0, 1300),
    'casaco': (list(ABAS) + [k + '2' for k in ABAS], 1.7, 2600),
}
OSSO = lambda k: 'hips' if k.startswith('hips') else k     # parte → nó do esqueleto
malhas, pesos = {}, {}
for g, (nomes, sigma, alvo) in GRUPOS.items():
    rot = np.full(X.shape, -1, np.int16)
    for i, k in enumerate(nomes):
        rot[part[k] & (rot < 0)] = i
    r = esc.malha(rot >= 0, alvo)
    malhas[g] = r
    bi, bw = pesos_pele(esc, rot, nomes, sigma, r[0])
    ossos = []
    for k in nomes:
        if OSSO(k) not in ossos:
            ossos.append(OSSO(k))
    remap = np.array([ossos.index(OSSO(k)) for k in nomes], np.uint8)
    pesos[g] = (ossos, remap[bi], bw)
    print(f'{g:7s} triângulos={len(r[2])} vértices={len(r[0])} ossos={ossos}')

# Ligação de cada osso (matriz osso → espaço da arte): a rotação de repouso do esqueleto. Nos
# membros, a junta da arte (início do osso) vai para a junta do esqueleto e a direção da arte
# vira a direção de repouso
def ligacao(k):
    B = Wn[k].copy()
    if k in bones:
        a, b, _ = bones[k]
        R = B[:, :3]
        # o membro aponta para −Z local; o pé só acompanha a junta (girar a bota a deitaria no chão)
        Rn = R if k.startswith('foot') else rot_entre(-unit(R[:, 2]), b - a) @ R
        B = np.hstack([Rn, a.reshape(3, 1)])
    return B


inversas = {}
for g in pesos:
    for k in pesos[g][0]:
        if k not in inversas:
            B = ligacao(k)
            Mi = np.linalg.inv(B[:, :3])
            inversas[k] = np.hstack([Mi, (-Mi @ B[:, 3]).reshape(3, 1)])

# ======================================================================== 5. peças de detalhe
# Geometria própria sobre a malha esculpida, nas posições medidas na arte (pixels das imagens
# de frente e de costas → espaço da arte, raios contra a malha): mechas de cabelo, arreios do
# peito e das costas, cinto com fivela e bolsas, placas dos ombros e dos braços com as luzes
# azuis, símbolo luminoso das costas, joelheira, tiras das pernas e das botas.
pf, pb = P['front'], P['back']
frente = lambda col, row: np.array([0.0, -(col - pf['c']) / pf['s'], HU - (row - pf['top']) / pf['s']])
costas = lambda col, row: np.array([0.0, (col - pb['c']) / pb['s'], HU - (row - pb['top']) / pb['s']])
DE_FRENTE, DE_COSTAS = (-1.0, 0, 0), (1.0, 0, 0)
C_COURO, C_TIRA, C_PLACA, C_METAL = (0.05, 0.05, 0.06), (0.065, 0.065, 0.075), (0.12, 0.125, 0.14), (0.5, 0.52, 0.57)
C_LUZ, C_CABELO = (0.25, 0.72, 1.0), (0.035, 0.035, 0.045)
rng = np.random.default_rng(7)
pecas = {g: (Pecas(), Pecas()) for g in GRUPOS}          # (principais, miúdas: só de perto)


def ponto(g, p, d):
    h = na_superficie(malhas[g], [p], d)[0]
    if h is None:
        print('  sem superfície em', g, np.round(p, 1))
    return h


def tira(g, pix, conv, d, larg, esp=0.2, cor=C_TIRA, rebites=True):
    """Tira entre pontos da arte (pixels), assentada na malha."""
    a = np.array([conv(*q) for q in pix])
    t = np.linspace(0, 1, 4 * len(pix))
    caminho = np.array([np.interp(t, np.linspace(0, 1, len(a)), a[:, k]) for k in range(3)]).T
    hs = [h for h in na_superficie(malhas[g], caminho, d) if h is not None]
    if len(hs) < 2:
        return
    pts, nors = np.array([h[0] for h in hs]), np.array([h[1] for h in hs])
    fita(pecas[g][0], pts, nors, larg, esp, cor, COURO)
    if rebites:
        comp = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
        for c in np.arange(0.6, comp[-1] - 0.3, 1.1):
            i = int(np.searchsorted(comp, c))
            rebite(pecas[g][1], pts[i] + nors[i] * 0.24, nors[i], 0.13, C_METAL)


def eixo_em_z(a, b, z):
    """Ponto do segmento a–b na altura z (e a direção do segmento)."""
    t = np.clip((z - a[2]) / ((b - a)[2] or 1e-6), 0, 1)
    return a + (b - a) * t, unit(b - a)


def cinta(g, a, b, z, larg, esp=0.16, fivela_ang=None, ref=None, lado=1):
    """Tira em volta do membro (osso a–b) na altura z, com fivela na direção 'fivela_ang'."""
    c, ax = eixo_em_z(a, b, z)
    ang = np.linspace(0, 2 * np.pi, 25)[:-1]
    pts, dirs = perfil(malhas[g], c, ax, ang, ref)
    anel(pecas[g][0], pts, dirs, larg, esp, ax, C_TIRA, COURO)
    if fivela_ang is not None:
        k = int(np.argmin([abs(((a_ - fivela_ang + np.pi) % (2 * np.pi)) - np.pi) for a_ in ang]))
        fivela(pecas[g][0], pts[k] + dirs[k] * (esp + 0.02), dirs[k], larg * 1.0, larg * 1.0, 0.12, (0.36, 0.37, 0.4), cima=ax * -1)
    return pts, dirs


# --- cabelo: ~170 mechas curtas e achatadas deitadas sobre o volume do cabelo, num redemoinho
# a partir do alto da cabeça, com cachos (sobem no meio) e pontas soltas que quebram o contorno;
# a franja cai sobre a testa e para na sobrancelha (o rosto fica livre)
from scipy.spatial import cKDTree as _KD
vc, nc, _ = malhas['cabeca']
cc = vc.mean(axis=0)
arv = _KD(vc)
z_testa, z_olhos = frente(520, 112)[2], frente(520, 128)[2]
coroa = cc + np.array([-1.4, 0.0, 3.4])
x_rosto = cc[0] + 0.8
cabelo = ((nc[:, 0] < 0.5) | (vc[:, 2] > z_testa + 0.6)) & (vc[:, 2] > np.where(vc[:, 0] < cc[0] - 1.0, 53.6, 55.8))
idx = np.nonzero(cabelo)[0]
escolha = [idx[rng.integers(len(idx))]]
dmin = np.linalg.norm(vc[idx] - vc[escolha[0]], axis=1)
while len(escolha) < 170:                         # amostragem por distância máxima (espalhadas)
    j = int(np.argmax(dmin))
    escolha.append(idx[j])
    dmin = np.minimum(dmin, np.linalg.norm(vc[idx] - vc[idx[j]], axis=1))
rosto_livre = lambda q: q[0] > x_rosto and q[2] < z_olhos + 1.4
hair = Pecas()
for i in escolha:
    p, n = vc[i], unit(nc[i])
    if p[0] > cc[0] + 1.0 and p[2] > z_testa - 0.8:          # franja: para a frente e para baixo
        f = np.array([0.25, rng.normal(0, 0.35), -1.0])
        L, alt, ponta = rng.uniform(1.3, 2.0), rng.uniform(0.0, 0.08), rng.uniform(0.0, 0.1)
        base = 0.04
    else:                                          # redemoinho: para longe do alto, caindo dos lados e na nuca
        f = (p - coroa) - n * ((p - coroa) @ n)
        if np.linalg.norm(f) < 1.2:                # no redemoinho: direção qualquer (sem tufo espetado)
            f = rng.normal(0, 1, 3) - n * 0.0
            f -= n * (f @ n)
        f = unit(f) + np.array([0, 0, -0.5]) * (p[2] < coroa[2] - 1.0)
        topo = float(np.clip((p[2] - (coroa[2] - 2.5)) / 2.5, 0, 1))      # no alto: mais volume e pontas soltas
        L, alt, ponta = rng.uniform(1.6, 2.6), rng.uniform(0.25, 0.6) + 0.2 * topo, rng.uniform(0.2, 0.6) + 0.15 * topo
        if p[0] < cc[0] - 0.5:                     # atrás o cabelo é mais assentado (vista de costas da ficha)
            alt, ponta, L = alt * 0.45, ponta * 0.4, L * 0.85
        base = 0.15
    tom = np.array(C_CABELO) * rng.uniform(0.7, 1.45)
    mecha_sobre(hair, arv, vc, nc, p, f, L, rng.uniform(0.8, 1.25), rng.uniform(0.3, 0.45), tuple(tom), alt, ponta, para=rosto_livre, rng=rng, base=base)

# --- símbolo luminoso das costas: anel com a barra diagonal e o elo no meio (como na ficha)
h = ponto('corpo', costas(605, 315), DE_COSTAS)
if h:
    c, n = h
    rs = 35 / pb['s']
    toro(pecas['corpo'][0], c + n * 0.2, n, rs, 0.17, C_LUZ, FOSCO, 1.0)
    u, v, n = base_local(n)
    db = unit(-u * 60 + v * 90)                   # da esquerda-baixo para a direita-cima (vista de costas)
    caixa(pecas['corpo'][0], c + n * 0.24, db * 108 / pb['s'] / 2, unit(np.cross(n, db)) * 0.17, n * 0.12, C_LUZ, FOSCO, 1.0)
    toro(pecas['corpo'][0], c + n * 0.3, n, 0.42, 0.12, C_LUZ, FOSCO, 1.0, seg=12, lados=4)

# --- arreio do peito (X com a argola no meio) e das costas (alças até o cinto)
fiv = frente(545, 320)
for fim in ((455, 252), (636, 250), (472, 420), (622, 420)):
    tira('corpo', [(545, 320), fim], frente, DE_FRENTE, 18 / pf['s'])
h = ponto('corpo', fiv, DE_FRENTE)
if h:
    fivela(pecas['corpo'][0], h[0] + h[1] * 0.2, h[1], 44 / pf['s'], 32 / pf['s'], 0.2, C_METAL)
for a, b in (((522, 250), (540, 455)), ((690, 248), (662, 455))):
    tira('corpo', [a, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), b], costas, DE_COSTAS, 16 / pb['s'])
for col, row in ((526, 292), (684, 290)):
    h = ponto('corpo', costas(col, row), DE_COSTAS)
    if h:
        fivela(pecas['corpo'][0], h[0] + h[1] * 0.2, h[1], 17 / pb['s'], 13 / pb['s'], 0.14, (0.3, 0.31, 0.34))

# --- cinto com a fivela grande, as bolsas e as luzes azuis
z_cinto = frente(545, 568)[2]
vt = malhas['corpo'][0]
fx = vt[np.abs(vt[:, 2] - z_cinto) < 0.5]
centro = np.array([float(np.mean(fx[:, 0])), float(np.mean(fx[:, 1])), z_cinto])
pts, dirs = perfil(malhas['corpo'], centro, [0, 0, 1], np.linspace(0, 2 * np.pi, 37)[:-1], ref=np.array([1.0, 0, 0]))
anel(pecas['corpo'][0], pts, dirs, 26 / pf['s'], 0.3, [0, 0, 1], C_TIRA, COURO)
h = ponto('corpo', frente(548, 568), DE_FRENTE)
if h:
    placa(pecas['corpo'][0], h[0] + h[1] * 0.3, h[1], 1.9, 1.35, 0.22, C_METAL, METAL, chanfro=0.12)
    fivela(pecas['corpo'][0], h[0] + h[1] * 0.55, h[1], 1.5, 1.05, 0.14, (0.3, 0.31, 0.34))
for col, row, w, hh, luz in ((471, 560, 1.0, 1.5, True), (618, 566, 0.9, 1.3, False), (418, 592, 0.8, 1.1, False)):
    h = ponto('corpo', frente(col, row), DE_FRENTE)
    if h:
        placa(pecas['corpo'][0], h[0] + h[1] * 0.25, h[1], w, hh, 0.55, C_PLACA, COURO, chanfro=0.12)
        if luz:
            u, v, n = base_local(h[1])
            caixa(pecas['corpo'][0], h[0] + h[1] * 0.88, u * 0.13, v * hh * 0.3, n * 0.06, C_LUZ, FOSCO, 1.0)
for col in (545, 600, 655):
    h = ponto('corpo', costas(col, 466), DE_COSTAS)
    if h:
        fivela(pecas['corpo'][0], h[0] + h[1] * 0.3, h[1], 26 / pb['s'], 22 / pb['s'], 0.16, C_METAL)

# --- luzes azuis (manchas azuis saturadas das imagens de frente e de costas): pequenas faixas
# emissivas sobre a malha que estiver mais à frente naquele ponto (gola, ombro, braços, bolsa)
LUZES = [(frente, DE_FRENTE, c, r, w, h) for c, r, w, h in ((378, 178, 12, 19), (362, 197, 16, 17), (325, 259, 26, 22), (263, 390, 16, 38),
                                                             (253, 519, 24, 21), (260, 593, 21, 34), (265, 641, 15, 22), (268, 702, 18, 25),
                                                             (415, 588, 11, 10), (757, 592, 7, 8))]
LUZES += [(costas, DE_COSTAS, c, r, w, h) for c, r, w, h in ((395, 527, 13, 19), (822, 539, 13, 23), (828, 570, 9, 18), (832, 607, 8, 18))]
for conv, d, col, row, w, hh in LUZES:
    melhor = None
    for g in ('corpo', 'bracoR', 'bracoL'):
        h = na_superficie(malhas[g], [conv(col, row)], d)[0]
        # o braço ganha se estiver a menos de 0,8 da frente (a luz é da manga, não do tronco atrás)
        if h is not None and (melhor is None or h[0] @ -np.array(d) + (0.8 if g != 'corpo' else 0) > melhor[1][0] @ -np.array(d)):
            melhor = (g, h)
    if melhor:
        g, (p, n) = melhor
        u, v, n = base_local(n)
        sc = pf['s'] if conv is frente else pb['s']
        caixa(pecas[g][0], p + n * 0.1, u * max(0.12, w / sc / 2), v * max(0.18, hh / sc / 2), n * 0.07, C_LUZ, FOSCO, 1.0)

# --- pernas: joelheira (esquerda), tiras com fivela nas coxas, na canela e nas botas, solas
for nm, lado in (('R', 1), ('L', -1)):
    g = 'perna' + nm
    th, sh = bones['thigh' + nm], bones['shin' + nm]
    frente_ang = 0.0
    cinta(g, th[0], th[1], frente(620 if lado < 0 else 455, 852 if lado < 0 else 878)[2], 0.7, fivela_ang=frente_ang - lado * 0.5, ref=np.array([1.0, 0, 0]))
    if lado < 0:
        h = ponto(g, frente(625, 1010), DE_FRENTE)
        if h:
            placa(pecas[g][0], h[0] + h[1] * 0.1, h[1], 2.7, 3.0, 0.55, C_PLACA, METAL, chanfro=0.55)
            u, v, n = base_local(h[1])
            for du, dv in ((-0.9, 1.0), (0.9, 1.0), (-0.9, -1.0), (0.9, -1.0)):
                rebite(pecas[g][1], h[0] + n * 0.68 + u * du + v * dv, n, 0.14, C_METAL)
        cinta(g, sh[0], sh[1], frente(620, 1110)[2], 0.75, fivela_ang=0.35, ref=np.array([1.0, 0, 0]))
    else:
        h = ponto(g, frente(455, 1000), DE_FRENTE)
        if h:
            placa(pecas[g][0], h[0] + h[1] * 0.1, h[1], 1.4, 1.7, 0.5, C_PLACA, COURO, chanfro=0.2)
        cinta(g, sh[0], sh[1], frente(455, 985)[2], 0.6, ref=np.array([1.0, 0, 0]))
    ank = bones['foot' + nm][0]
    for row in (1328, 1372):
        cinta(g, sh[0], ank + (ank - sh[0]) * 0.6, frente(620, row)[2], 0.72, fivela_ang=-lado * 0.9, ref=np.array([1.0, 0, 0]))

# ======================================================================== 6. UV, textura e material
# frente da cabeça e do pescoço (o queixo e a gola ficam no tronco): só a vista de frente
# (só o rosto em si: os lados da cabeça, com cabelo e orelhas, ficam com a mistura das vistas)
X_ROSTO, Y_ROSTO = float(np.mean(malhas['cabeca'][0][:, 0])) - 1.0, float(-(np.mean([520]) - pf['c']) / pf['s'])
rosto = lambda p, ms: (p[:, 2] > 50.5) & (p[:, 0] > X_ROSTO) & (np.abs(p[:, 1] - Y_ROSTO) < 2.7)
uvmesh, tex64, img8 = assar(esc, malhas, cores, TEX, NITIDEZ, rosto, nomes_cabeca=('cabeca',))
mat64 = mapa_material(img8)
if os.environ.get('SALVAR_PNG'):
    Image.fromarray(cv2.cvtColor(img8, cv2.COLOR_BGR2RGB)).save(os.environ['SALVAR_PNG'])

# ======================================================================== saída
skins, tot_v, tot_t = [], 0, 0
for g in malhas:
    v, n, _ = malhas[g]
    vmap, idx, uv = uvmesh[g]
    ossos, bi, bw = pesos[g]
    sk = codificar_pele(v[vmap], n[vmap], uv, idx, ossos, bi[vmap], bw[vmap])
    sk['nome'] = g
    skins.append(sk)
    tot_v += len(vmap)
    tot_t += idx.size // 3
# peças de detalhe: os pesos de pele do vértice mais próximo da malha onde estão apoiadas;
# as mechas de cabelo seguem também o osso do cabelo (mais quanto mais longe da cabeça)
from scipy.spatial import cKDTree
inversas['hair'] = (lambda B: np.hstack([np.linalg.inv(B[:, :3]), (-np.linalg.inv(B[:, :3]) @ B[:, 3]).reshape(3, 1)]))(Wn['hair'])
det_t = 0
for g, (pp, miudas) in list(pecas.items()) + [('cabelo', (hair, None))]:
    for k, pc in enumerate((pp, miudas)):
        if pc is None or not len(pc):
            continue
        V, N, A, Fi = pc.arrays()
        if g == 'cabelo':
            ossos = ['head', 'hair']
            hw = np.clip((np.linalg.norm(V - cc, axis=1) - 4.6) / 2.6, 0.15, 0.9)
            bi = np.tile(np.array([0, 1, 0, 0], np.uint8), (len(V), 1))
            bw = np.stack([1 - hw, hw, np.zeros(len(V)), np.zeros(len(V))], 1)
        else:
            ossos, hbi, hbw = pesos[g]
            _, j = cKDTree(malhas[g][0]).query(V)
            bi, bw = hbi[j], hbw[j]
        assert len(V) < 65536                      # índices uint16
        sk = codificar_pele(V, N, A, Fi, ossos, bi, bw, cor=True, lod=2.5 if k else 0)
        sk['nome'] = 'det_' + g + ('_miudas' if k else '')
        skins.append(sk)
        det_t += len(Fi)
        print(f'detalhes {g:7s}{" (miúdas)" if k else "":10s} triângulos={len(Fi)} vértices={len(V)}')
tot_t += det_t
CAB = """'use strict';
// ECLIPSE ZERO · Kael 3D com a arte oficial (gerado por tools/gerar_kael3d.py a partir da ficha)
// ---------------------------------------------------------------------------
// v: 2 (malhas com pele). props: proporções do esqueleto tiradas da arte. inv: inversa da
// matriz de ligação de cada osso (espaço da arte → espaço do osso, 3×4). skins: uma malha por
// região (cabeça, corpo, braços, pernas, casaco), com vértices no espaço da arte e até 4 ossos
// por vértice — ver escultor3d.codificar_pele. tex: textura assada (JPEG) com as cores das 4
// vistas; mat: mapa de material (R metal, G aspereza, B relevo).
// Não edite à mão: troque as imagens da arte em assets/images/ e gere de novo.
// ---------------------------------------------------------------------------
"""
dados = {'v': 2, 'q': Q, 'props': PROPS, 'inv': {k: [round(float(x), 6) for x in M.ravel()] for k, M in inversas.items()}, 'skins': skins}
with open(DESTINO, 'w', encoding='utf-8') as f:
    f.write(CAB)
    f.write('const KAEL3D = ' + json.dumps(dados, separators=(',', ':')) + ';\n')
    f.write("KAEL3D.tex = 'data:image/jpeg;base64," + tex64 + "';\n")
    f.write("KAEL3D.mat = 'data:image/jpeg;base64," + mat64 + "';\n")
print('Gerado', DESTINO, f'({os.path.getsize(DESTINO) // 1024} KB: {tot_v} vértices, {tot_t} triângulos, textura {len(tex64) // 1024} KB, material {len(mat64) // 1024} KB)')
referencias('kael', origens, masks, HU, os.path.join(RAIZ, 'js', 'assets', 'kael_ref.js'))
