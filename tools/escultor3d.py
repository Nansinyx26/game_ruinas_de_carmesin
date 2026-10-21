"""Peças comuns dos geradores de personagens 3D (tools/gerar_kael3d.py e tools/gerar_aliado3d.py).

Fluxo: silhuetas de 4 vistas (frente, lado direito, costas, lado esquerdo) → escultura
(casco visual numa grade de voxels, com seções arredondadas) → partes ligadas aos nós do
esqueleto do Kael (js/models/kael.js) → malhas → atlas UV (xatlas) → textura assada com as
cores das vistas (peso pela direção da superfície e teste de oclusão) → js/assets/<id>3d.js.

Convenção das vistas: +X é a frente do personagem, +Y o lado direito (que aparece à
esquerda na vista de frente) e +Z para cima; a altura vai de 0 (sola) a HU (topo).
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
from skimage import measure

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIEWS = ('front', 'sideR', 'back', 'sideL')
# Coordenada horizontal de cada vista (unidades) e direção de cada câmera (para onde a vista olha de volta)
HOR = {'front': lambda x, y: -y, 'back': lambda x, y: y, 'sideR': lambda x, y: x, 'sideL': lambda x, y: -x}
CAM = {'front': (1, 0, 0), 'back': (-1, 0, 0), 'sideR': (0, 1, 0), 'sideL': (0, -1, 0)}
Q = 256             # posições gravadas em int16 com 1/256 de unidade


def unit(v):
    return v / (np.linalg.norm(v) + 1e-9)


def rot_entre(a, b):
    """Rotação mínima que leva a direção a em b."""
    a, b = unit(a), unit(b)
    v, c = np.cross(a, b), a @ b
    if np.linalg.norm(v) < 1e-8:
        return np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1 / (1 + c))


def dois_ossos(a, c, l1, l2, dobra):
    """Junta do meio (joelho/cotovelo) entre a e c com os comprimentos l1 e l2, dobrando para 'dobra'."""
    d = c - a
    L = np.linalg.norm(d)
    if L > l1 + l2 - 1e-3:
        c = a + unit(d) * (l1 + l2 - 1e-3)
        d = c - a
        L = np.linalg.norm(d)
    x = (L * L + l1 * l1 - l2 * l2) / (2 * L)
    h = np.sqrt(max(l1 * l1 - x * x, 0))
    return a + unit(d) * x + unit(dobra - unit(d) * np.dot(dobra, unit(d))) * h, c


def esqueleto(props=None):
    """Matrizes de mundo (3×4) dos nós do esqueleto do Kael na pose de repouso (tools/kael_rig.js)."""
    cmd = ['node', os.path.join(RAIZ, 'tools', 'kael_rig.js')]
    if props:
        cmd.append(json.dumps(props))
    rig = json.loads(subprocess.check_output(cmd))
    return {k: np.array(v['w']).reshape(3, 4) for k, v in rig['nodes'].items()}


def projecao(masks, HU, centro=(0.28, 0.5)):
    """Topo, escala (pixels por unidade) e centro horizontal (média dos centros entre as alturas
    relativas 'centro', do peito à cintura) de cada vista."""
    P = {}
    for v, m in masks.items():
        ys, xs = np.nonzero(m)
        top, bot = ys.min(), ys.max()
        s = (bot - top) / HU
        cs = []
        for f in np.linspace(centro[0], centro[1], 12):
            r = np.nonzero(m[int(top + f * (bot - top))])[0]
            cs.append((r.min() + r.max()) / 2)
        P[v] = {'top': float(top), 's': float(s), 'c': float(np.mean(cs))}
        print('vista', v, 'pixels/unidade', round(float(s), 2))
    return P


class Escultura:
    """Casco visual das 4 silhuetas numa grade de voxels, com seções em superelipse
    (largura da frente × profundidade do lado)."""

    def __init__(self, masks, P, HU, vox, grade, expoente):
        self.masks, self.P, self.HU, self.vox = masks, P, HU, vox
        (x0, x1), (y0, y1), (z0, z1) = grade
        self.xs = np.arange(x0, x1 + 1e-6, vox)
        self.ys = np.arange(y0, y1 + 1e-6, vox)
        self.zs = np.arange(z0, z1 + 1e-6, vox)
        X, Y, Z = np.meshgrid(self.xs, self.ys, self.zs, indexing='ij')
        self.X, self.Y, self.Z = X, Y, Z
        inside = np.ones(X.shape, bool)
        spans = {}
        for v in VIEWS:
            m = masks[v]
            row, col = self.proj(v, X, Y, Z)
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
        fa, fb = faixa('front')          # em −y
        sa, sb = faixa('sideR')          # em x
        yc, hy = -(fa + fb) / 2, (fb - fa) / 2
        xc, hx = (sa + sb) / 2, (sb - sa) / 2
        hx = np.where(hy < 3.5, np.minimum(hx, hy * 1.15), hx)   # membros finos: profundidade limitada pela largura
        PE = expoente(Z)
        self.solid = inside & ((np.abs((Y - yc) / np.maximum(hy, 1e-3)) ** PE + np.abs((X - xc) / np.maximum(hx, 1e-3)) ** PE) <= 1.0)
        print('voxels', int(self.solid.sum()), 'grade', self.solid.shape)

    def proj(self, v, x, y, z):
        """(linha, coluna) do ponto na imagem da vista v."""
        p = self.P[v]
        return p['top'] + (self.HU - z) * p['s'], p['c'] + HOR[v](x, y) * p['s']

    def dist_seg(self, a, b):
        """Distância de cada voxel ao segmento a–b."""
        X, Y, Z = self.X, self.Y, self.Z
        ab = b - a
        t = np.clip(((X - a[0]) * ab[0] + (Y - a[1]) * ab[1] + (Z - a[2]) * ab[2]) / (ab @ ab), 0, 1)
        return np.sqrt((X - a[0] - t * ab[0]) ** 2 + (Y - a[1] - t * ab[1]) ** 2 + (Z - a[2] - t * ab[2]) ** 2)

    def malha(self, vol, alvo):
        """Marching cubes + simplificação até 'alvo' triângulos; normais para fora."""
        if vol.sum() < 20:
            return None
        vox = self.vox
        sm = ndimage.gaussian_filter(np.pad(vol.astype(np.float32), 2), 0.85)
        if sm.max() <= 0.5:          # só voxels soltos: a suavização apaga a parte
            return None
        verts, faces, _, _ = measure.marching_cubes(sm, 0.5, spacing=(vox, vox, vox))
        verts = verts - 2 * vox + np.array([self.xs[0], self.ys[0], self.zs[0]])
        if len(faces) > alvo:
            verts, faces = fast_simplification.simplify(verts.astype(np.float32), faces.astype(np.int32), target_reduction=1 - alvo / len(faces))
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


def amostrar(im, x, y):
    """Cor (bicúbica) da imagem nos pontos (x, y); o remap aceita no máximo 32767 linhas."""
    N = len(x)
    k = -(-N // 1024) * 1024
    mx = np.zeros(k, np.float32)
    my = np.zeros(k, np.float32)
    mx[:N], my[:N] = x, y
    out = cv2.remap(im, mx.reshape(-1, 1024), my.reshape(-1, 1024), cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return out.reshape(-1, 3)[:N].astype(np.float64)


def assar(esc, malhas, cores, tex, nitidez, rosto=None, peso_cabeca=1.45, nomes_cabeca=('head',)):
    """Atlas UV (xatlas) das partes e textura assada com as cores das 4 vistas.
    rosto(p, malhas) → máscara dos texels onde só vale a vista de frente.
    Devolve (uvmesh, JPEG em base64, imagem BGR)."""
    P = esc.P
    # Mapa de profundidade de cada vista (10 pixels por unidade, qualquer que seja a resolução da imagem)
    DS = {v: 10.0 / P[v]['s'] for v in VIEWS}
    todos_v = np.concatenate([m[0] for m in malhas.values()])
    base = np.cumsum([0] + [len(m[0]) for m in malhas.values()])
    todas_f = np.concatenate([m[2] + base[i] for i, m in enumerate(malhas.values())])
    prof = {}
    for v in VIEWS:
        H, W = esc.masks[v].shape
        r, c = esc.proj(v, todos_v[:, 0], todos_v[:, 1], todos_v[:, 2])
        k = DS[v]
        Hk, Wk = int(H * k) + 1, int(W * k) + 1
        zb = np.full((Hk, Wk), -1e9)
        rasterizar(np.stack([(c + 0.5) * k, (r + 0.5) * k], 1), todas_f, None, Hk, Wk, None, todos_v @ np.array(CAM[v], float), zb)
        prof[v] = zb
        print('profundidade', v)

    # UV: a cabeça ganha mais texels (o rosto é o que mais aparece)
    atlas = xatlas.Atlas()
    nomes = list(malhas)
    for k in nomes:
        v, n, f = malhas[k]
        atlas.add_mesh((v * (peso_cabeca if k in nomes_cabeca else 1.0)).astype(np.float32), f.astype(np.uint32), n.astype(np.float32))
    co = xatlas.ChartOptions()
    co.max_iterations = 4
    po = xatlas.PackOptions()
    po.resolution = tex
    po.padding = 4
    po.bilinear = True
    po.bruteForce = True
    atlas.generate(co, po)
    if max(atlas.width, atlas.height) > tex:
        # densidade de texels ajustada para caber exatamente no lado da textura
        po.texels_per_unit = atlas.texels_per_unit * tex / max(atlas.width, atlas.height) * 0.995
        atlas.generate(co, po)
    print('atlas', atlas.width, atlas.height, 'texels/unidade', round(float(atlas.texels_per_unit), 2), 'gráficos', atlas.chart_count, 'aproveitamento', round(float(atlas.utilization), 3))
    uvmesh = {}
    for i, k in enumerate(nomes):
        vmap, idx, uv = atlas[i]
        uvmesh[k] = (vmap.astype(np.int64), idx.astype(np.int64), uv.astype(np.float64))

    # Posição e normal de cada texel
    pos = np.zeros((tex, tex, 3))
    nor = np.zeros((tex, tex, 3))
    cheio = np.zeros((tex, tex), bool)
    for k in nomes:
        v, n, _ = malhas[k]
        vmap, idx, uv = uvmesh[k]
        attr = np.concatenate([v[vmap], n[vmap], np.ones((len(vmap), 1))], 1)
        buf = np.zeros((tex, tex, 7))
        rasterizar(uv * tex, idx, attr, tex, tex, buf)
        sel = buf[:, :, 6] > 0.5
        pos[sel], nor[sel] = buf[sel, :3], buf[sel, 3:6]
        cheio |= sel
    iy, ix = np.nonzero(cheio)
    p, n = pos[iy, ix], nor[iy, ix]
    face = rosto(p, malhas) if rosto else np.zeros(len(p), bool)
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-9
    soma = np.zeros((len(p), 3))
    peso = np.zeros(len(p))
    visto = np.zeros(len(p))
    for v in VIEWS:
        d = np.array(CAM[v], float)
        nd = n @ d
        r, c = esc.proj(v, p[:, 0], p[:, 1], p[:, 2])
        # visível se nada na vista está à frente (tolerância de 0,9 unidade)
        zb = prof[v]
        rr = np.clip(((r + 0.5) * DS[v]).astype(int), 0, zb.shape[0] - 1)
        cc = np.clip(((c + 0.5) * DS[v]).astype(int), 0, zb.shape[1] - 1)
        vis = (p @ d) >= zb[rr, cc] - 0.9
        w = np.where(vis, np.clip(nd, 0, 1) ** 4, 0) + 1e-4 * ((nd + 1) / 2) ** 4
        # rosto: o casco não tem o formato real da cabeça, então o rosto de perfil cairia ao lado
        # do rosto de frente (rosto duplo); na frente da cabeça e do pescoço só vale a vista de frente
        if v.startswith('side'):
            w = np.where(face, w * 0.02, w)
        visto += np.where(vis, np.clip(nd, 0, 1) ** 4, 0)
        soma += amostrar(cores[v], c, r) * w[:, None]
        peso += w
    cor = soma / peso[:, None]
    # o que nenhuma vista enxerga (dentro das abas, entre as partes) fica na sombra
    cor *= (0.55 + 0.45 * np.clip(visto / 0.05, 0, 1))[:, None]
    img = np.zeros((tex, tex, 3), np.float64)
    img[iy, ix] = cor
    # Fora dos gráficos: a cor do texel preenchido mais próximo (sem bordas escuras nos mipmaps)
    _, (ny_, nx_) = ndimage.distance_transform_edt(~cheio, return_indices=True)
    img = img[ny_, nx_]
    # Leve realce de nitidez (a mistura entre vistas e a reamostragem suavizam os detalhes)
    img = img + nitidez * (img - cv2.GaussianBlur(img, (0, 0), 1.2))
    img8 = np.clip(img + 0.5, 0, 255).astype(np.uint8)
    rgb = Image.fromarray(cv2.cvtColor(img8, cv2.COLOR_BGR2RGB))
    bio = io.BytesIO()
    rgb.save(bio, 'JPEG', quality=90, optimize=True, progressive=True)
    return uvmesh, base64.b64encode(bio.getvalue()).decode('ascii'), img8


def codificar(malhas, uvmesh, bind):
    """Por parte: vértices no espaço do nó (posição int16 ×Q, normal int16 ×32767, uv uint16)
    e os índices dos triângulos (uint16), em base64."""
    saida, tot_v, tot_t = {}, 0, 0
    for k in malhas:
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
    return saida, tot_v, tot_t


def referencias(ident, origens, masks, HU, destino, altura=720):
    """js/assets/<ident>_ref.js: as vistas da arte (recortadas e reduzidas) para comparar com o
    modelo no inspetor 3D (js/inspector3d.js). Por vista: imagem JPEG, topo, base e centro da
    figura em pixels da imagem reduzida (a figura tem HU unidades de altura)."""
    P = projecao(masks, HU)
    out = {}
    for v in VIEWS:
        m, im = masks[v], origens[v]
        ys, xs = np.nonzero(m)
        top, bot = ys.min(), ys.max()
        k = altura / (bot - top)
        mg = int(0.04 * (bot - top))
        y0, y1 = max(0, top - mg), min(m.shape[0], bot + mg + 1)
        x0, x1 = max(0, xs.min() - mg), min(m.shape[1], xs.max() + mg + 1)
        rec = cv2.resize(im[y0:y1, x0:x1], (int((x1 - x0) * k), int((y1 - y0) * k)), interpolation=cv2.INTER_AREA)
        ok, buf = cv2.imencode('.jpg', rec, [cv2.IMWRITE_JPEG_QUALITY, 84])
        out[v] = {'src': 'data:image/jpeg;base64,' + base64.b64encode(buf.tobytes()).decode('ascii'),
                  'top': round((top - y0) * k, 2), 'bot': round((bot - y0) * k, 2), 'c': round((P[v]['c'] - x0) * k, 2),
                  'w': rec.shape[1], 'h': rec.shape[0]}
    with open(destino, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n// Vistas da arte de " + ident + " para o inspetor 3D (gerado por tools/; carregado só quando o inspetor abre)\n")
        f.write('(window.REF3D = window.REF3D || {}).' + ident + ' = ' + json.dumps({'altura': HU, 'vistas': out}, separators=(',', ':')) + ';\n')
    print('Gerado', destino, f'({os.path.getsize(destino) // 1024} KB)')


# ============================================================ pele (skinning) e materiais
def pesos_pele(esc, rotulo, nomes, sigma, verts, maximo=4):
    """Pesos de pele dos vértices: para cada parte (rotulo == índice em nomes), a indicadora
    suavizada (gaussiana de sigma unidades) amostrada no vértice; ficam os 'maximo' maiores,
    somando 1. Nas juntas a pele passa de um osso ao outro numa faixa de ~2·sigma.
    Devolve (índices uint8 [n, 4], pesos float [n, 4])."""
    sv = sigma / esc.vox
    coords = np.stack([(verts[:, 0] - esc.xs[0]) / esc.vox, (verts[:, 1] - esc.ys[0]) / esc.vox, (verts[:, 2] - esc.zs[0]) / esc.vox])
    W = np.zeros((len(verts), len(nomes)))
    for i in range(len(nomes)):
        ind = ndimage.gaussian_filter((rotulo == i).astype(np.float32), sv)
        W[:, i] = ndimage.map_coordinates(ind, coords, order=1, mode='nearest')
    # vértice longe de tudo (raro): o osso do voxel rotulado mais próximo
    vazio = W.sum(axis=1) < 1e-4
    if vazio.any():
        _, (ix, iy, iz) = ndimage.distance_transform_edt(rotulo < 0, return_indices=True)
        c = np.clip(np.round(coords[:, vazio]).astype(int), 0, np.array(rotulo.shape)[:, None] - 1)
        W[vazio, rotulo[ix[c[0], c[1], c[2]], iy[c[0], c[1], c[2]], iz[c[0], c[1], c[2]]]] = 1.0
    if W.shape[1] < maximo:          # menos partes que pesos: completa com colunas vazias
        W = np.concatenate([W, np.zeros((len(W), maximo - W.shape[1]))], axis=1)
    ordem = np.argsort(-W, axis=1)[:, :maximo]
    w = np.take_along_axis(W, ordem, axis=1)
    ordem = np.minimum(ordem, len(nomes) - 1)
    w[w < 0.02 * w[:, :1]] = 0
    w /= w.sum(axis=1, keepdims=True)
    return ordem.astype(np.uint8), w


def mapa_material(img8, lado=1024):
    """Mapa de material tirado da textura assada (espaço da textura): R = metal (claro e sem cor:
    fivelas, rebites, placas polidas), G = aspereza (couro brilhante mais liso, tecido áspero),
    B = relevo (detalhe fino da luminância, 0,5 = plano). JPEG em base64 (lado × lado)."""
    f = img8.astype(np.float32) / 255.0
    b, g, r = f[:, :, 0], f[:, :, 1], f[:, :, 2]
    L = 0.114 * b + 0.587 * g + 0.299 * r
    mx, mn = f.max(axis=2), f.min(axis=2)
    sat = (mx - mn) / (mx + 0.04)
    ss = lambda a, c, x: np.clip((x - a) / (c - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (c - a), 0, 1))
    loc = L - cv2.GaussianBlur(L, (0, 0), 3)
    azul = ss(0.08, 0.2, b - np.maximum(r, g))                 # luzes azuis: emissivas, não metal
    pele = ss(0.04, 0.1, r - b) * ss(0.18, 0.3, L) * (1 - azul)
    # metal: só os pontos claros e pequenos (rebites, fivelas, bordas de placa); as dobras claras
    # do casaco são couro (mais liso que o tecido, sem reflexo colorido)
    metal = ss(0.06, 0.16, loc) * ss(0.24, 0.45, L) * (1 - ss(0.15, 0.32, sat))
    metal *= (1 - azul) * (1 - pele)
    aspero = np.clip(0.9 - 0.22 * ss(0.16, 0.42, L) - 0.4 * metal, 0.3, 1) * (1 - pele) + 0.62 * pele
    relevo = 0.5 + np.clip((cv2.GaussianBlur(L, (0, 0), 0.8) - cv2.GaussianBlur(L, (0, 0), 5)) * 2.4, -0.5, 0.5)
    m = np.stack([relevo, aspero, metal], axis=2)              # BGR → R metal, G aspereza, B relevo
    m = cv2.resize(m, (lado, lado), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode('.jpg', np.clip(m * 255 + 0.5, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 88])
    return base64.b64encode(buf.tobytes()).decode('ascii')


def codificar_pele(v, n, att, faces, ossos, bi, bw, cor=False, lod=0):
    """Uma malha com pele em base64: a = vértices (int16 x, y, z ×Q no espaço da arte, normal
    ×32767, e 4 bytes: u, v uint16 — ou, com cor, r, g, b e material·16 + emissão·15), w = 4
    índices de osso + 4 pesos (uint8, somando 255), i = triângulos (uint16)."""
    nv = len(v)
    assert nv < 65536 and np.abs(v).max() * Q < 32767
    a = np.zeros((nv, 8), np.int16)
    a[:, :3] = np.round(v * Q)
    nn = n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-9)
    a[:, 3:6] = np.round(nn * 32767)
    raw = a.view(np.uint8).reshape(nv, 16)
    if cor:
        raw[:, 12:15] = np.clip(np.round(att[:, :3] * 255), 0, 255).astype(np.uint8)
        raw[:, 15] = (np.clip(att[:, 3], 0, 15).astype(np.uint8) << 4) | np.clip(np.round(att[:, 4] * 15), 0, 15).astype(np.uint8)
    else:
        uv = np.round(np.clip(att[:, :2], 0, 1) * 65535).astype(np.uint16)
        raw[:, 12:16] = uv.view(np.uint8).reshape(nv, 4)
    w8 = np.round(bw * 255).astype(np.int32)
    w8[:, 0] += 255 - w8.sum(axis=1)                         # soma exata 255
    pw = np.concatenate([bi.astype(np.uint8), np.clip(w8, 0, 255).astype(np.uint8)], axis=1)
    out = {'ossos': list(ossos), 'a': base64.b64encode(raw.tobytes()).decode('ascii'),
           'w': base64.b64encode(pw.tobytes()).decode('ascii'),
           'i': base64.b64encode(faces.astype('<u2').tobytes()).decode('ascii')}
    if cor:
        out['cor'] = 1
    if lod:
        out['lod'] = lod
    return out
