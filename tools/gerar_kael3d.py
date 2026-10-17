"""Gera js/assets/kael3d.js: o Kael 3D (malha + textura) a partir da ficha oficial.

Origem: assets/images/kael_ficha.jpg (ficha "KAEL VEYRON · UNIDADE ZERO"), vistas
FRENTE, LADO DIREITO, COSTAS e LADO ESQUERDO.
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

Uso (na pasta do projeto):  python3 tools/gerar_kael3d.py
Requer node, numpy, scipy, opencv-python-headless, scikit-image, fast-simplification,
xatlas e Pillow. SALVAR_PNG=arquivo.png também salva a textura para conferir.
"""
import base64
import io
import json
import os
import subprocess

import cv2
import fast_simplification
import numpy as np
import xatlas
from PIL import Image
from scipy import ndimage
from skimage import measure, morphology

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEM = os.path.join(RAIZ, 'assets', 'images', 'kael_ficha.jpg')
DESTINO = os.path.join(RAIZ, 'js', 'assets', 'kael3d.js')
# Caixas das vistas na ficha (x0, y0, x1, y1); o rótulo fica nas últimas linhas
VIEWS = {'front': (325, 24, 472, 372), 'sideR': (478, 24, 578, 372), 'back': (598, 24, 742, 372), 'sideL': (752, 24, 856, 372)}
HU = 62.1           # altura do Kael em unidades do jogo (a mesma do esqueleto)
VOX = 0.42          # aresta do voxel da escultura
TEX = 1024          # lado da textura
Q = 256             # posições gravadas em int16 com 1/256 de unidade
NITIDEZ = 0.6       # realce de nitidez da textura assada
# Coordenada horizontal de cada vista (unidades): +X é a frente do Kael, +Y o lado direito
# (que aparece à esquerda na vista de frente). Direção de cada câmera (para onde a vista olha de volta):
HOR = {'front': lambda x, y: -y, 'back': lambda x, y: y, 'sideR': lambda x, y: x, 'sideL': lambda x, y: -x}
CAM = {'front': (1, 0, 0), 'back': (-1, 0, 0), 'sideR': (0, 1, 0), 'sideL': (0, -1, 0)}


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
    # Cores do personagem estendidas para o fundo (vizinho mais próximo dentro da silhueta)
    _, (iy, ix) = ndimage.distance_transform_edt(~m, return_indices=True)
    return c8[iy, ix], m


im8 = cv2.imread(ORIGEM)
masks, cores = {}, {}
for nome, box in VIEWS.items():
    cores[nome], masks[nome] = segmentar(im8, box, nome.startswith('side'))

# Projeção de cada vista: topo da cabeça, escala (pixels por unidade) e centro horizontal
P = {}
for v, m in masks.items():
    ys, xs = np.nonzero(m)
    top, bot = ys.min(), ys.max()
    s = (bot - top) / HU
    # centro: média dos centros do peito à cintura (28%–50% da altura)
    cs = []
    for f in np.linspace(0.28, 0.5, 12):
        r = np.nonzero(m[int(top + f * (bot - top))])[0]
        cs.append((r.min() + r.max()) / 2)
    P[v] = {'top': float(top), 's': float(s), 'c': float(np.mean(cs))}
    print('vista', v, 'pixels/unidade', round(float(s), 2))


def proj(v, x, y, z):
    """(linha, coluna) do ponto na imagem da vista v."""
    p = P[v]
    return p['top'] + (HU - z) * p['s'], p['c'] + HOR[v](x, y) * p['s']


# ======================================================================== 2. escultura
xs_ = np.arange(-13, 13 + 1e-6, VOX)
ys_ = np.arange(-15.5, 15.5 + 1e-6, VOX)
zs_ = np.arange(-0.6, 63.2 + 1e-6, VOX)
X, Y, Z = np.meshgrid(xs_, ys_, zs_, indexing='ij')
inside = np.ones(X.shape, bool)
spans = {}
for v in VIEWS:
    m = masks[v]
    row, col = proj(v, X, Y, Z)
    ri = np.clip(np.round(row).astype(int), 0, m.shape[0] - 1)
    ci = np.clip(np.round(col).astype(int), 0, m.shape[1] - 1)
    inside &= (row >= 0) & (row < m.shape[0]) & (col >= 0) & (col < m.shape[1]) & m[ri, ci]
    # trecho contínuo (início/fim) de cada pixel na sua linha, para arredondar as seções
    st = np.zeros(m.shape, np.int32)
    en = np.zeros(m.shape, np.int32)
    for r in range(m.shape[0]):
        d = np.diff(np.concatenate([[0], m[r].astype(int), [0]]))
        for a0, b0 in zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0] - 1):
            st[r, a0:b0 + 1] = a0
            en[r, a0:b0 + 1] = b0
    spans[v] = (st[ri, ci], en[ri, ci])


def faixa(v):
    st, en = spans[v]
    p = P[v]
    return (st - p['c']) / p['s'], (en + 1 - p['c']) / p['s']


# Seção arredondada (superelipse) dentro do retângulo largura (frente) × profundidade (lado)
fa, fb = faixa('front')          # em −y
sa, sb = faixa('sideR')          # em x
yc, hy = -(fa + fb) / 2, (fb - fa) / 2
xc, hx = (sa + sb) / 2, (sb - sa) / 2
hx = np.where(hy < 3.5, np.minimum(hx, hy * 1.15), hx)   # membros finos: profundidade limitada pela largura
PE = np.where(Z > 52.0, 1.9, 2.4)    # a cabeça é mais redonda que o casaco
solid = inside & ((np.abs((Y - yc) / np.maximum(hy, 1e-3)) ** PE + np.abs((X - xc) / np.maximum(hx, 1e-3)) ** PE) <= 1.0)
print('voxels', int(solid.sum()), 'grade', solid.shape)

# ======================================================================== 3. partes
rig = json.loads(subprocess.check_output(['node', os.path.join(RAIZ, 'tools', 'kael_rig.js')]))
Wn = {k: np.array(v['w']).reshape(3, 4) for k, v in rig['nodes'].items()}


def unit(v):
    return v / (np.linalg.norm(v) + 1e-9)


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


def dois_ossos(a, c, l1, l2, dobra):   # joelho entre a e c com os comprimentos do esqueleto
    d = c - a
    L = np.linalg.norm(d)
    if L > l1 + l2 - 1e-3:
        c = a + unit(d) * (l1 + l2 - 1e-3)
        d = c - a
        L = np.linalg.norm(d)
    x = (L * L + l1 * l1 - l2 * l2) / (2 * L)
    h = np.sqrt(max(l1 * l1 - x * x, 0))
    return a + unit(d) * x + unit(dobra - unit(d) * np.dot(dobra, unit(d))) * h, c


# Ossos na pose da arte: (início, fim, raio)
LTH, LSH = 12.8, 12.2
bones = {}
for lado, nm in ((1, 'R'), (-1, 'L')):
    # braços: caem ao lado do corpo, centro a ~2,6 da borda externa; ombro, cotovelo e
    # punho na altura da arte (os braços da ficha são mais curtos que os do esqueleto)
    y_braco = lado * (np.mean([borda_frente(z, lado) for z in (30, 34, 38)]) - 2.6)
    ombro = np.array([0.6, lado * min(abs(y_braco), 8.5), 44.0])
    cot = np.array([-0.4, y_braco, 34.6])
    pun = np.array([1.0, y_braco, 26.4])
    bones['arm' + nm + 'u'] = (ombro, cot, 3.0)
    bones['arm' + nm + 'f'] = (cot, pun + unit(pun - cot) * 3.6, 2.7)
    # pernas: do quadril do esqueleto ao tornozelo na abertura da arte
    quadril = Wn['thigh' + nm][:, 3].copy()
    joelho, tornozelo = dois_ossos(quadril, np.array([0.6, centro_perna(5.0, lado), 3.6]), LTH, LSH, np.array([1.0, 0, 0]))
    bones['thigh' + nm] = (quadril, joelho, 3.3)
    bones['shin' + nm] = (joelho, tornozelo, 3.1)
    bones['foot' + nm] = (tornozelo, tornozelo + np.array([3, 0, -3.6]), 3.4)


def dist_seg(a, b):
    ab = b - a
    t = np.clip(((X - a[0]) * ab[0] + (Y - a[1]) * ab[1] + (Z - a[2]) * ab[2]) / (ab @ ab), 0, 1)
    return np.sqrt((X - a[0] - t * ab[0]) ** 2 + (Y - a[1] - t * ab[1]) ** 2 + (Z - a[2] - t * ab[2]) ** 2)


Z_CINTURA, Z_OMBRO, Z_PESCOCO, Z_BARRA = 28.6, 47.0, 52.0, 10.2
part = {}
dist = {k: dist_seg(a, b) for k, (a, b, r) in bones.items()}
braco = np.zeros(X.shape, bool)
for k in ('armRu', 'armRf', 'armLu', 'armLf'):
    part[k] = solid & (dist[k] < bones[k][2]) & (Z < 44)
    braco |= part[k]
cabeca = solid & (Z > Z_PESCOCO) & ((((X - 1.0) ** 2 + Y ** 2) < 5.4 ** 2) | (Z > 55.5))
part['head'] = cabeca
# tronco (sem braços nem cabeça) com as axilas preenchidas: casco convexo de cada fatia
# até a altura dos ombros (acima disso o casco convexo criaria volume em volta do queixo)
tronco = solid & (Z >= Z_CINTURA) & ~cabeca & ~braco
for k in range(tronco.shape[2]):
    if zs_[k] < Z_OMBRO and tronco[:, :, k].sum() > 3:
        tronco[:, :, k] = morphology.convex_hull_image(tronco[:, :, k]) & (solid[:, :, k] | ~braco[:, :, k])
part['torso'] = tronco & ~cabeca
# pernas: abaixo da barra, e as coxas/canelas dentro do casaco
pernas = {}
for nm in ('R', 'L'):
    for k in ('thigh' + nm, 'shin' + nm, 'foot' + nm):
        pernas[k] = (dist[k] < bones[k][2]) & (Z < Z_CINTURA + 1.0)
chaves = list(pernas)
dono = np.argmin(np.stack([dist[k] for k in chaves]), axis=0)
for i, k in enumerate(chaves):
    part[k] = pernas[k] & (dono == i) & (solid | (Z > Z_BARRA))
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
# calça na abertura da frente (entre as abas) fica no quadril
part['hips'] = casca & abertura & (Z >= Z_BARRA)


# ======================================================================== malhas
def malha(vol, alvo):
    if vol.sum() < 20:
        return None
    sm = ndimage.gaussian_filter(np.pad(vol.astype(np.float32), 2), 0.85)
    verts, faces, _, _ = measure.marching_cubes(sm, 0.5, spacing=(VOX, VOX, VOX))
    verts = verts - 2 * VOX + np.array([xs_[0], ys_[0], zs_[0]])
    if len(faces) > alvo:
        verts, faces = fast_simplification.simplify(verts.astype(np.float32), faces.astype(np.int32), target_reduction=1 - alvo / len(faces))
    # orientação: as normais das faces apontam para fora da peça
    v0, v1, v2 = verts[faces[:, 0]], verts[faces[:, 1]], verts[faces[:, 2]]
    fn = np.cross(v1 - v0, v2 - v0)
    if np.sum(np.einsum('ij,ij->i', fn, (v0 + v1 + v2) / 3 - verts.mean(axis=0))) < 0:
        faces = faces[:, [0, 2, 1]]
        fn = -fn
    vn = np.zeros_like(verts)
    for j in range(3):
        np.add.at(vn, faces[:, j], fn)
    vn /= np.linalg.norm(vn, axis=1, keepdims=True) + 1e-9
    return verts.astype(np.float64), vn, faces.astype(np.int64)


ORCAMENTO = {'head': 1800, 'torso': 1900, 'hips': 300}
malhas = {}
for k, vol in part.items():
    r = malha(vol, ORCAMENTO.get(k, 560 if k.startswith('arm') else 380 if k.startswith('c') else 460))
    if r is None:
        print('vazio', k)
        continue
    malhas[k] = r
    print(f'{k:7s} voxels={int(vol.sum()):6d} triângulos={len(r[2])}')


# Ligação de cada parte ao seu nó: a rotação de repouso do esqueleto; os membros giram
# em volta da junta do esqueleto da direção de repouso para a direção da arte
def rot_entre(a, b):
    a, b = unit(a), unit(b)
    v, c = np.cross(a, b), a @ b
    if np.linalg.norm(v) < 1e-8:
        return np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1 / (1 + c))


bind = {}
for k in malhas:
    B = Wn[k].copy()
    if k in bones:
        a, b, _ = bones[k]
        R = B[:, :3]
        B = np.hstack([rot_entre(-unit(R[:, 2]), b - a) @ R, B[:, 3:4]])   # o membro aponta para −Z local
    bind[k] = B


# ======================================================================== rasterização
def rasterizar(xy, F, attr, H, W, buf, z=None, zbuf=None):
    """Preenche buf (H, W, k) com attr (n, k) interpolado nos triângulos F, nos pixels cujo
    centro cai dentro; com z/zbuf mantém o maior z (o mais perto da câmera)."""
    for f in F:
        p = xy[f]
        x0, y0 = np.floor(p.min(axis=0) - 0.5).astype(int)
        x1, y1 = np.ceil(p.max(axis=0) - 0.5).astype(int)
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W - 1), min(y1, H - 1)
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = p
        den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(den) < 1e-12:
            continue
        w0 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / den
        w1 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / den
        w2 = 1 - w0 - w1
        ok = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
        if not ok.any():
            continue
        iy, ix = np.nonzero(ok)
        iy, ix = iy + y0, ix + x0
        w = np.stack([w0[ok], w1[ok], w2[ok]], 1)
        if zbuf is not None:
            zz = w @ z[f]
            keep = zz > zbuf[iy, ix]
            zbuf[iy[keep], ix[keep]] = zz[keep]
        else:
            buf[iy, ix] = w @ attr[f]


# Mapa de profundidade de cada vista (2× a resolução da ficha), com todas as partes
DS = 2
todos_v = np.concatenate([m[0] for m in malhas.values()])
base = np.cumsum([0] + [len(m[0]) for m in malhas.values()])
todas_f = np.concatenate([m[2] + base[i] for i, m in enumerate(malhas.values())])
prof = {}
for v in VIEWS:
    H, W = masks[v].shape
    r, c = proj(v, todos_v[:, 0], todos_v[:, 1], todos_v[:, 2])
    zb = np.full((H * DS, W * DS), -1e9)
    rasterizar(np.stack([c * DS + DS / 2, r * DS + DS / 2], 1), todas_f, None, H * DS, W * DS, None, todos_v @ np.array(CAM[v], float), zb)
    prof[v] = zb
    print('profundidade', v)

# ======================================================================== 4. UV (xatlas)
atlas = xatlas.Atlas()
nomes = list(malhas)
for k in nomes:
    v, n, f = malhas[k]
    # a cabeça ganha mais texels (o rosto é o que mais aparece)
    atlas.add_mesh((v * (1.45 if k == 'head' else 1.0)).astype(np.float32), f.astype(np.uint32), n.astype(np.float32))
co = xatlas.ChartOptions()
co.max_iterations = 4
po = xatlas.PackOptions()
po.resolution = TEX
po.padding = 4
po.bilinear = True
po.bruteForce = True
atlas.generate(co, po)
if max(atlas.width, atlas.height) > TEX:
    # densidade de texels ajustada para caber exatamente no lado da textura
    po.texels_per_unit = atlas.texels_per_unit * TEX / max(atlas.width, atlas.height) * 0.995
    atlas.generate(co, po)
print('atlas', atlas.width, atlas.height, 'texels/unidade', round(float(atlas.texels_per_unit), 2), 'gráficos', atlas.chart_count, 'aproveitamento', round(float(atlas.utilization), 3))
uvmesh = {}
for i, k in enumerate(nomes):
    vmap, idx, uv = atlas[i]
    uvmesh[k] = (vmap.astype(np.int64), idx.astype(np.int64), uv.astype(np.float64))

# ======================================================================== 5. textura
pos = np.zeros((TEX, TEX, 3))
nor = np.zeros((TEX, TEX, 3))
cheio = np.zeros((TEX, TEX), bool)
for k in nomes:
    v, n, _ = malhas[k]
    vmap, idx, uv = uvmesh[k]
    xy = uv * TEX
    attr = np.concatenate([v[vmap], n[vmap], np.ones((len(vmap), 1))], 1)
    buf = np.zeros((TEX, TEX, 7))
    rasterizar(xy, idx, attr, TEX, TEX, buf)
    sel = buf[:, :, 6] > 0.5
    pos[sel], nor[sel] = buf[sel, :3], buf[sel, 3:6]
    cheio |= sel
def amostrar(im, x, y):
    """Cor (bicúbica) da imagem nos pontos (x, y); o remap aceita no máximo 32767 linhas."""
    N = len(x)
    k = -(-N // 1024) * 1024
    mx = np.zeros(k, np.float32)
    my = np.zeros(k, np.float32)
    mx[:N], my[:N] = x, y
    out = cv2.remap(im, mx.reshape(-1, 1024), my.reshape(-1, 1024), cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return out.reshape(-1, 3)[:N].astype(np.float64)


iy, ix = np.nonzero(cheio)
p, n = pos[iy, ix], nor[iy, ix]
# frente da cabeça e do pescoço (o queixo e a gola ficam no tronco)
rosto = (p[:, 2] > 50.5) & (p[:, 0] > float(np.mean(malhas['head'][0][:, 0])) - 2.0)
n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-9
soma = np.zeros((len(p), 3))
peso = np.zeros(len(p))
visto = np.zeros(len(p))
for v in VIEWS:
    d = np.array(CAM[v], float)
    nd = n @ d
    r, c = proj(v, p[:, 0], p[:, 1], p[:, 2])
    # visível se nada na vista está à frente (tolerância de 0,9 unidade)
    zb = prof[v]
    rr = np.clip((r * DS + DS / 2).astype(int), 0, zb.shape[0] - 1)
    cc = np.clip((c * DS + DS / 2).astype(int), 0, zb.shape[1] - 1)
    vis = (p @ d) >= zb[rr, cc] - 0.9
    w = np.where(vis, np.clip(nd, 0, 1) ** 4, 0) + 1e-4 * ((nd + 1) / 2) ** 4
    # rosto: o casco não tem o formato real da cabeça, então o rosto de perfil cairia ao lado
    # do rosto de frente (rosto duplo); na frente da cabeça e do pescoço só vale a vista de frente
    if v.startswith('side'):
        w = np.where(rosto, w * 0.02, w)
    visto += np.where(vis, np.clip(nd, 0, 1) ** 4, 0)
    amostra = amostrar(cores[v], c, r)
    soma += amostra * w[:, None]
    peso += w
cor = soma / peso[:, None]
# o que nenhuma vista enxerga (dentro das abas, entre as partes) fica na sombra
cor *= (0.55 + 0.45 * np.clip(visto / 0.05, 0, 1))[:, None]
img = np.zeros((TEX, TEX, 3), np.float64)
img[iy, ix] = cor
# Fora dos gráficos: a cor do texel preenchido mais próximo (sem bordas escuras nos mipmaps)
_, (ny_, nx_) = ndimage.distance_transform_edt(~cheio, return_indices=True)
img = img[ny_, nx_]
# Leve realce de nitidez (a mistura entre vistas e a reamostragem suavizam os detalhes)
img = img + NITIDEZ * (img - cv2.GaussianBlur(img, (0, 0), 1.2))
img8 = np.clip(img + 0.5, 0, 255).astype(np.uint8)
rgb = Image.fromarray(cv2.cvtColor(img8, cv2.COLOR_BGR2RGB))
if os.environ.get('SALVAR_PNG'):
    rgb.save(os.environ['SALVAR_PNG'])
bio = io.BytesIO()
rgb.save(bio, 'JPEG', quality=90, optimize=True, progressive=True)
tex64 = base64.b64encode(bio.getvalue()).decode('ascii')

# ======================================================================== saída
# Por parte: vértices no espaço do nó (posição int16 ×Q, normal int16 ×32767, uv uint16)
# e os índices dos triângulos (uint16), em base64
saida, tot_v, tot_t = {}, 0, 0
for k in nomes:
    v, n, _ = malhas[k]
    vmap, idx, uv = uvmesh[k]
    B = bind[k]
    M, t = B[:, :3], B[:, 3]
    Mi = np.linalg.inv(M)
    pl = (v[vmap] - t) @ Mi.T                       # mundo da arte → espaço do nó
    nl = n[vmap] @ M                                 # normais: transposta da parte linear
    nl /= np.linalg.norm(nl, axis=1, keepdims=True) + 1e-9
    a = np.empty((len(vmap), 8), np.int64)
    a[:, :3] = np.round(pl * Q)
    a[:, 3:6] = np.round(nl * 32767)
    a[:, 6:8] = np.round(np.clip(uv, 0, 1) * 65535) - 32768
    assert np.abs(a[:, :3]).max() < 32767 and len(vmap) < 65536
    saida[k] = {'a': base64.b64encode(a.astype('<i2').tobytes()).decode('ascii'),
                'i': base64.b64encode(idx.astype('<u2').tobytes()).decode('ascii')}
    tot_v += len(vmap)
    tot_t += idx.size // 3
CAB = """'use strict';
// ECLIPSE ZERO · Kael 3D com a arte oficial (gerado por tools/gerar_kael3d.py a partir da ficha)
// ---------------------------------------------------------------------------
// parts: malha de cada parte do esqueleto do Kael, no espaço do seu nó, em base64:
//   a = vértices (int16 little-endian: x, y, z ×Q, normal ×32767, u, v −32768..32767),
//   i = triângulos (uint16). tex: textura assada (JPEG) com as cores das 4 vistas.
// Não edite à mão: troque assets/images/kael_ficha.jpg e gere de novo.
// ---------------------------------------------------------------------------
"""
with open(DESTINO, 'w', encoding='utf-8') as f:
    f.write(CAB)
    f.write('const KAEL3D = ' + json.dumps({'q': Q, 'parts': saida}, separators=(',', ':')) + ';\n')
    f.write("KAEL3D.tex = 'data:image/jpeg;base64," + tex64 + "';\n")
print('Gerado', DESTINO, f'({os.path.getsize(DESTINO) // 1024} KB: {tot_v} vértices, {tot_t} triângulos, textura {len(tex64) // 1024} KB)')
