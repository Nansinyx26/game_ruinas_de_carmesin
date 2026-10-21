"""Peças de detalhe modeladas sobre a malha esculpida (tools/gerar_kael3d.py).

O casco visual das 4 vistas dá a silhueta e a textura da arte, mas não tem relevo próprio
para mechas de cabelo, tiras, fivelas, placas e luzes. Estas funções constroem essas peças
como geometria de verdade, encaixada na superfície da malha (raios lançados contra ela), no
espaço da arte (+X frente, +Y lado direito, +Z para cima). Cada peça é uma lista de
triângulos com normal por face, cor, material (ver R3D_FS_TEX: 1 metal, 2 couro/placa,
3 tecido, 4 cabelo, 5 pele, 0 fosco) e emissão; depois recebe os pesos de pele da malha
onde está apoiada, então acompanha as animações sem descolar.
"""
import numpy as np

from escultor3d import unit

METAL, COURO, TECIDO, CABELO, PELE, FOSCO = 1, 2, 3, 4, 5, 0


class Pecas:
    """Acumula triângulos (sem índice: 3 vértices por face, normal da face)."""

    def __init__(self):
        self.v, self.c, self.m, self.e = [], [], [], []

    def tri(self, a, b, c, cor, mat, emi=0.0):
        self.v.append((a, b, c))
        self.c.append(cor)
        self.m.append(mat)
        self.e.append(emi)

    def quad(self, a, b, c, d, cor, mat, emi=0.0):
        self.tri(a, b, c, cor, mat, emi)
        self.tri(a, c, d, cor, mat, emi)

    def __len__(self):
        return len(self.v)

    def arrays(self):
        """Malha indexada: (vértices [n, 3], normais, atributos [n, 5] = r, g, b, material, emissão,
        triângulos [t, 3]). Vértices iguais são unidos; o cabelo ganha normais suaves (mechas
        arredondadas) e as peças duras mantêm as faces planas (a normal entra na chave)."""
        if not self.v:
            return None
        V = np.array(self.v, float)                       # [t, 3, 3]
        fn = np.cross(V[:, 1] - V[:, 0], V[:, 2] - V[:, 0])
        area = np.linalg.norm(fn, axis=1, keepdims=True)
        fn /= area + 1e-12
        A = np.zeros((len(V), 3, 5))
        A[:, :, :3] = np.array(self.c, float)[:, None, :]
        A[:, :, 3] = np.array(self.m, float)[:, None]
        A[:, :, 4] = np.array(self.e, float)[:, None]
        Vf, Af = V.reshape(-1, 3), A.reshape(-1, 5)
        Nf = np.repeat(fn[:, None, :], 3, axis=1).reshape(-1, 3)
        suave = Af[:, 3] == CABELO
        chave = np.concatenate([np.round(Vf * 1e4), np.round(Af * 1e3), np.where(suave[:, None], 0, np.round(Nf * 1e3))], axis=1)
        _, primeiro, inv = np.unique(chave, axis=0, return_index=True, return_inverse=True)
        inv = inv.ravel()
        F = inv.reshape(-1, 3)
        N = np.zeros((len(primeiro), 3))
        np.add.at(N, inv, np.repeat((fn * area)[:, None, :], 3, axis=1).reshape(-1, 3))
        N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
        return Vf[primeiro], N, Af[primeiro], F


# ------------------------------------------------------------------ raios contra a malha
def raio(V, F, o, d):
    """Primeiro ponto (t > 0) do raio o + t·d na malha (V, F): (ponto, normal da face) ou None."""
    A, B, C = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    e1, e2 = B - A, C - A
    p = np.cross(d, e2)
    det = np.einsum('ij,ij->i', e1, p)
    ok = np.abs(det) > 1e-12
    inv = np.where(ok, 1.0 / np.where(ok, det, 1), 0)
    s = o - A
    u = np.einsum('ij,ij->i', s, p) * inv
    q = np.cross(s, e1)
    v = (q @ d) * inv
    t = np.einsum('ij,ij->i', e2, q) * inv
    hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-6)
    if not hit.any():
        return None
    i = np.argmin(np.where(hit, t, np.inf))
    n = unit(np.cross(e1[i], e2[i]))
    if n @ d > 0:
        n = -n
    return o + d * t[i], n


def na_superficie(malha, pontos, direcao):
    """Projeta pontos sobre a malha ao longo de 'direcao' (raios de fora para dentro):
    lista de (ponto, normal) — None onde o raio não acerta."""
    V, _, F = malha
    d = unit(np.asarray(direcao, float))
    return [raio(V, F, np.asarray(p, float) - d * 30, d) for p in pontos]


def perfil(malha, centro, eixo, ang, ref=None):
    """Raio externo da malha em volta de um eixo (fatia perpendicular em 'centro'), nos ângulos
    'ang': devolve (pontos na superfície, direções radiais)."""
    V, _, F = malha
    eixo = unit(np.asarray(eixo, float))
    a = unit(np.cross(eixo, ref if ref is not None else ([0, 0, 1] if abs(eixo[2]) < 0.9 else [1, 0, 0])))
    b = np.cross(eixo, a)
    pts, dirs = [], []
    for t in ang:
        r = a * np.cos(t) + b * np.sin(t)
        h = raio(V, F, centro + r * 25, -r)
        pts.append(h[0] if h else centro + r * 1.0)
        dirs.append(r)
    return np.array(pts), np.array(dirs)


# ------------------------------------------------------------------ formas
def fita(P, pts, nors, larg, esp, cor, mat, emi=0.0, desvio=0.06, tampa=True):
    """Tira sobre a superfície: seção retangular (largura × espessura) ao longo dos pontos,
    afastada 'desvio' da pele na direção das normais."""
    pts, nors = np.asarray(pts, float), np.asarray(nors, float)
    n = len(pts)
    tg = np.gradient(pts, axis=0)
    rings = []
    for i in range(n):
        nn = unit(nors[i])
        s = unit(np.cross(nn, tg[i]))
        base = pts[i] + nn * desvio
        rings.append([base - s * larg / 2, base + s * larg / 2, base + s * larg / 2 + nn * esp, base - s * larg / 2 + nn * esp])
    for i in range(n - 1):
        r0, r1 = rings[i], rings[i + 1]
        for k in range(4):
            j = (k + 1) % 4
            P.quad(r0[k], r1[k], r1[j], r0[j], cor, mat, emi)
    if tampa:
        P.quad(*rings[0][::-1], cor, mat, emi)
        P.quad(*rings[-1], cor, mat, emi)


def anel(P, pts, dirs, larg, esp, eixo, cor, mat, emi=0.0, desvio=0.05):
    """Tira fechada em volta de um membro (pontos do perfil e direções radiais)."""
    eixo = unit(np.asarray(eixo, float))
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        a0, a1 = pts[i] + dirs[i] * desvio, pts[j] + dirs[j] * desvio
        b0, b1 = a0 + dirs[i] * esp, a1 + dirs[j] * esp
        h = eixo * larg / 2
        P.quad(b0 - h, b1 - h, b1 + h, b0 + h, cor, mat, emi)        # face externa
        P.quad(a0 + h, a1 + h, b1 + h, b0 + h, cor, mat, emi)        # borda de cima
        P.quad(a0 - h, b0 - h, b1 - h, a1 - h, cor, mat, emi)        # borda de baixo


def caixa(P, c, ex, ey, ez, cor, mat, emi=0.0):
    """Caixa centrada em c com meios-eixos ex, ey, ez (vetores)."""
    c = np.asarray(c, float)
    s = [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1), (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]
    q = [c + a * ex + b * ey + d * ez for a, b, d in s]
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        P.quad(*[q[i] for i in f], cor, mat, emi)


def base_local(n, cima=(0, 0, 1)):
    """Base (u, v, n) na superfície: v aponta o mais perto possível de 'cima'."""
    n = unit(np.asarray(n, float))
    v = np.asarray(cima, float) - n * (n @ cima)
    if np.linalg.norm(v) < 1e-6:
        v = np.array([1.0, 0, 0]) - n * n[0]
    v = unit(v)
    return np.cross(v, n), v, n


def fivela(P, p, n, w, h, esp, cor, mat=METAL, cima=(0, 0, 1)):
    """Fivela retangular vazada (moldura) sobre a superfície."""
    u, v, n = base_local(n, cima)
    p = np.asarray(p, float) + n * 0.08
    b = 0.22 * min(w, h)
    for du, dv, eu, ev in ((0, (h - b) / 2, w / 2, b / 2), (0, -(h - b) / 2, w / 2, b / 2), ((w - b) / 2, 0, b / 2, h / 2 - b), (-(w - b) / 2, 0, b / 2, h / 2 - b)):
        caixa(P, p + u * du + v * dv + n * esp / 2, u * eu, v * ev, n * esp / 2, cor, mat)


def placa(P, p, n, w, h, esp, cor, mat=COURO, cima=(0, 0, 1), chanfro=0.18, emi=0.0):
    """Placa chanfrada (topo menor que a base) sobre a superfície."""
    u, v, n = base_local(n, cima)
    p = np.asarray(p, float) + n * 0.04
    bw, bh, tw, th = w / 2, h / 2, w / 2 - chanfro, h / 2 - chanfro
    B = [p - u * bw - v * bh, p + u * bw - v * bh, p + u * bw + v * bh, p - u * bw + v * bh]
    T = [p + n * esp - u * tw - v * th, p + n * esp + u * tw - v * th, p + n * esp + u * tw + v * th, p + n * esp - u * tw + v * th]
    P.quad(*T, cor, mat, emi)
    for i in range(4):
        j = (i + 1) % 4
        P.quad(B[i], B[j], T[j], T[i], cor, mat, emi)


def rebite(P, p, n, r, cor, mat=METAL):
    """Rebite: pirâmide baixa de 6 lados."""
    u, v, n = base_local(n)
    p = np.asarray(p, float) + n * 0.05
    top = p + n * r * 0.7
    ring = [p + (u * np.cos(a) + v * np.sin(a)) * r for a in np.linspace(0, 2 * np.pi, 7)[:-1]]
    for i in range(6):
        P.tri(ring[i], ring[(i + 1) % 6], top, cor, mat)


def arco(P, centro, eixo, ref, raio_, a0, a1, z0, z1, esp, cor, mat, n=10, emi=0.0, conico=0.0):
    """Placa curva: pedaço de cilindro em volta de 'eixo' (de z0 a z1 ao longo do eixo, ângulos
    a0..a1 a partir de 'ref'), com espessura; conico afina o raio no fim (placas em escama)."""
    eixo = unit(np.asarray(eixo, float))
    a = unit(np.asarray(ref, float) - eixo * (eixo @ ref))
    b = np.cross(eixo, a)
    ang = np.linspace(a0, a1, n)
    for i in range(n - 1):
        for (r0, r1) in ((raio_, raio_ + esp),):
            d0 = a * np.cos(ang[i]) + b * np.sin(ang[i])
            d1 = a * np.cos(ang[i + 1]) + b * np.sin(ang[i + 1])
            pA0, pA1 = centro + eixo * z0 + d0 * r1, centro + eixo * z0 + d1 * r1
            pB0, pB1 = centro + eixo * z1 + d0 * (r1 - conico), centro + eixo * z1 + d1 * (r1 - conico)
            iA0, iA1 = centro + eixo * z0 + d0 * r0, centro + eixo * z0 + d1 * r0
            iB0, iB1 = centro + eixo * z1 + d0 * (r0 - conico), centro + eixo * z1 + d1 * (r0 - conico)
            P.quad(pA0, pA1, pB1, pB0, cor, mat, emi)          # face externa
            P.quad(iA0, pA0, pB0, iB0, cor, mat, emi) if i == 0 else None
            P.quad(pA1, iA1, iB1, pB1, cor, mat, emi) if i == n - 2 else None
            P.quad(iA0, iA1, pA1, pA0, cor, mat, emi)          # borda z0
            P.quad(pB0, pB1, iB1, iB0, cor, mat, emi)          # borda z1


def toro(P, centro, n, r, tubo, cor, mat, emi=0.0, seg=28, lados=5, cima=(0, 0, 1)):
    """Anel (toro) deitado sobre a superfície de normal n."""
    u, v, n = base_local(n, cima)
    pts = []
    for i in range(seg):
        a = 2 * np.pi * i / seg
        c = centro + (u * np.cos(a) + v * np.sin(a)) * r
        rd = u * np.cos(a) + v * np.sin(a)
        pts.append([c + (rd * np.cos(b) + n * np.sin(b)) * tubo for b in np.linspace(0, 2 * np.pi, lados + 1)[:-1]])
    for i in range(seg):
        j = (i + 1) % seg
        for k in range(lados):
            l = (k + 1) % lados
            P.quad(pts[i][k], pts[j][k], pts[j][l], pts[i][l], cor, mat, emi)


def mecha(P, raiz, d, L, r, curva, cor, mat=CABELO, segs=4, achata=0.55, giro=0.0):
    """Mecha de cabelo: cone curvo de 4 lados (seção achatada), da raiz na direção d com
    comprimento L e raio r, dobrando para 'curva' (vetor) ao longo do caminho."""
    d = unit(np.asarray(d, float))
    curva = np.asarray(curva, float)
    pts = [np.asarray(raiz, float)]
    dd = d.copy()
    for i in range(segs):
        dd = unit(dd + curva / segs)
        pts.append(pts[-1] + dd * L / segs)
    pts = np.array(pts)
    ref = unit(np.cross(d, [0.31, 0.52, 0.8]))
    rings = []
    for i, p in enumerate(pts):
        t = np.gradient(pts, axis=0)[i]
        t = unit(t)
        a = unit(np.cross(t, ref))
        b = np.cross(t, a)
        ca, sa = np.cos(giro), np.sin(giro)
        a, b = a * ca + b * sa, -a * sa + b * ca
        rr = r * (1 - i / segs) ** 0.9
        rings.append([p + a * rr, p + b * rr * achata, p - a * rr, p - b * rr * achata])
    for i in range(segs):
        for k in range(4):
            j = (k + 1) % 4
            if i == segs - 1:
                P.tri(rings[i][k], rings[i][j], pts[-1], cor, mat)
            else:
                P.quad(rings[i][k], rings[i][j], rings[i + 1][j], rings[i + 1][k], cor, mat)


def mecha_sobre(P, arvore, V, N, raiz, f, L, larg, esp, cor, alt=0.5, ponta=0.5, segs=6, para=None, mat=CABELO, rng=None, base=0.15):
    """Mecha que acompanha a superfície (cabelo bagunçado sem espetos): o caminho anda na
    direção f e é puxado de volta para perto da malha (vértices V, normais N, árvore KD), a uma
    altura que sobe no meio (o cacho) e na ponta ('ponta'); seção achatada (larg × esp) deitada
    na superfície. para(ponto) → True interrompe o caminho (não cobrir o rosto)."""
    rng = rng or np.random.default_rng(0)
    pts, nors = [], []
    p = np.asarray(raiz, float)
    d = unit(np.asarray(f, float))
    passo = L / segs
    for i in range(segs + 1):
        t = i / segs
        _, j = arvore.query(p)
        q, n = V[j], unit(N[j])
        h = alt * np.sin(np.pi * min(t * 1.15, 1.0)) * 0.8 + ponta * t ** 2 + base
        pt = q + n * h
        if para is not None and i > 1 and para(pt):
            break
        pts.append(pt)
        nors.append(n)
        d = unit(d - n * (d @ n) + rng.normal(0, 0.12, 3))
        p = pt + d * passo
    if len(pts) < 3:
        return
    pts, nors = np.array(pts), np.array(nors)
    tg = np.gradient(pts, axis=0)
    k = len(pts) - 1
    rings = []
    for i in range(len(pts)):
        n = unit(nors[i])
        b = unit(np.cross(n, tg[i]))
        w = larg * (1 - (i / k) ** 1.6) / 2 + 0.03
        e = esp * (1 - (i / k) ** 1.3) / 2 + 0.02
        rings.append([pts[i] - b * w, pts[i] + n * e, pts[i] + b * w, pts[i] - n * e])
    for i in range(k):
        for a in range(4):
            c = (a + 1) % 4
            P.quad(rings[i][a], rings[i + 1][a], rings[i + 1][c], rings[i][c], cor, mat)
    P.quad(*rings[0][::-1], cor, mat)
    P.quad(*rings[-1], cor, mat)
