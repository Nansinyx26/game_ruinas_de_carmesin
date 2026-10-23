"""Importa as armas 3D (GLB) para o motor do jogo: js/assets/armas3d.js (WEAPON3D).

As armas de assets/armas/eclipse/*.glb (geradas no Meshy, ~10 a 27 MB cada, 20 mil a 600 mil
triângulos, texturas de 2048 a 4096) são pesadas demais para o jogo e não abrem por file://.
Este importador gera a versão do jogo a partir do GLB, que continua sendo a fonte:
  1. Leitura do GLB (malhas, cor base, metal/aspereza; tools/importar_modelo.py: ler_glb).
  2. Eixos da arma: +X do cabo para a ponta (ou para a cabeça do machado/martelo), +Z a largura
     (gume, cabeça, curva do arco), +Y a espessura. A origem fica no ponto em que a mão segura.
     Cada arma tem a sua configuração em ARMAS (eixo do comprimento, inversões, posição do cabo,
     comprimento no jogo) — conferida nas prévias (--previa).
  3. Redução (erro quadrático, fast-simplification) até o número de triângulos da arma.
  4. Cor por canto de triângulo: cada canto busca o ponto mais próximo na malha original e
     amostra a textura dali (média de 3 pontos perto do canto); metal pelo mapa metal/aspereza
     (azul do glTF) → material 1 (metal) ou 2 (placa); as partes de neon (claras e saturadas)
     viram emissão (brilham na passada emissiva do motor, como as veias da espada do Kael).
  5. Normais por canto com quina viva acima de 40° (gume, arestas da cabeça).
  6. Saída: WEAPON3D.<id> = { n, q, a (base64), len, w, h, glow } — 14 bytes por canto:
     posição int16 ×3, normal int8 ×3, cor RGB uint8, material uint8, emissão uint8.
     js/heroes/armas3d.js monta a geometria no formato do motor e encaixa na mão e nas costas.

Uso (na pasta do projeto):
  python3 tools/importar_arma.py                  # todas as armas de ARMAS
  python3 tools/importar_arma.py kael_espada      # só uma (as outras ficam como estão)
  python3 tools/importar_arma.py --previa pasta/  # imagens de conferência (frente e topo)
Requer numpy, scipy, opencv-python-headless, fast-simplification (os mesmos do importar_modelo).
"""
import argparse
import base64
import json
import os
import re
import struct
import sys

import cv2
import numpy as np
from scipy.spatial import cKDTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importar_modelo import amostra, ler_glb, mais_proximo, reduzir  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = 'assets/armas/eclipse'
SAIDA = 'js/assets/armas3d.js'

# Configuração de cada arma (unidades do jogo: o Kael tem ~62 de altura)
#   eixo: eixo do arquivo ao longo do comprimento ('x', 'y' ou 'z'); largura: eixo da largura
#   inv: inverte o comprimento (a ponta do arquivo está no lado negativo)
#   invz: inverte a largura (o gume/cabeça para +Z)
#   cabo: posição da mão ao longo do comprimento (0 = base, 1 = ponta); mz: altura da mão (fração)
#   pca: alinha pelos eixos principais da malha (arma na diagonal no arquivo)
#   len: comprimento total no jogo; tri: triângulos depois da redução
#   glow: cor do brilho (halos do jogo) 'r,g,b'
#   fio: filetes finos acesos (emissão pela maior amostra do canto, não pela cor média)
#   parte: (eixo, sinal) — só os triângulos daquele lado do arquivo (par de lâminas num arquivo só)
#   sem_corda: tira a corda do arco (o jogo desenha a corda que estica ao puxar)
#   cabo_z: a origem em Z fica na empunhadura (meio do arco), não no centro da caixa
#   limpar: tira fragmentos soltos minúsculos (menos de 0,5% dos triângulos)
#   cortar: caixas (x0, x1, z0, z1) no referencial da arma cujos triângulos saem (lascas da geração)
ARMAS = {
    # Kael: a espada oficial (Kael_Espada_oficial) e a versão anterior como variação
    'kael_espada': dict(arq='kael_espada_oficial.glb', cortar=[(50, 70, -9, -2.4)], eixo='y', largura='x', inv=True, invz=False, cabo=0.1, len=64, tri=2600, glow='60,150,255'),
    'kael_espada_alt': dict(arq='kael_espada.glb', pca=True, eixo='x', largura='z', inv=True, invz=False, cabo=0.12, len=64, tri=2400, glow='60,150,255'),
    'drakos_machado': dict(arq='drakos_machado.glb', eixo='y', largura='x', inv=False, invz=True, cabo=0.2, len=60, tri=2800, glow='255,46,61'),
    'drakos_martelo': dict(arq='drakos_martelo.glb', eixo='y', largura='x', inv=False, invz=False, cabo=0.2, len=60, tri=2800, glow='255,46,61'),
    'lyra_arco': dict(arq='lyra_arco.glb', eixo='y', largura='x', inv=False, invz=False, cabo=0.5, len=46, tri=2600, glow='190,90,255',
                      sem_corda=True, cabo_z=True),
    # Orion: cada arquivo traz o par de lâminas (uma de cada lado em X); parte separa cada uma
    'orion_lamina_d': dict(arq='orion_laminas_v2.glb', parte=('x', 1), eixo='y', largura='x', inv=False, invz=False, cabo=0.25, len=34, tri=1600, glow='255,138,31'),
    'orion_lamina_e': dict(arq='orion_laminas_v2.glb', parte=('x', -1), eixo='y', largura='x', inv=False, invz=False, cabo=0.25, len=34, tri=1600, glow='255,138,31'),
    'orion_lamina_v1_d': dict(arq='orion_laminas_v1.glb', parte=('x', 1), eixo='y', largura='x', inv=False, invz=False, cabo=0.25, len=34, tri=1600, glow='255,138,31'),
    'orion_lamina_v1_e': dict(arq='orion_laminas_v1.glb', parte=('x', -1), eixo='y', largura='x', inv=False, invz=False, cabo=0.25, len=34, tri=1600, glow='255,138,31'),
    'orion_pistola': dict(arq='orion_secundaria.glb', eixo='x', largura='y', inv=True, invz=False, cabo=0.1, mz=-0.2, len=19, tri=6000, fio=True, glow='255,138,31'),
    'sera_bastao': dict(arq='sera_bastao.glb', eixo='x', largura='z', inv=False, invz=False, cabo=0.45, len=62, tri=2400, glow='25,230,210'),
    'sera_drone': dict(arq='sera_drone.glb', eixo='x', largura='z', inv=False, invz=False, cabo=0.5, len=17, tri=2600, glow='25,230,210'),
}
EIXO = {'x': 0, 'y': 1, 'z': 2}


def orientar(V, c):
    """Eixos do arquivo → eixos da arma (+X comprimento, +Z largura, +Y espessura), origem na
    mão, escala para o comprimento do jogo. Devolve (V2, matriz 3×3 aplicada às normais)."""
    R = np.zeros((3, 3))
    if c.get('pca'):
        # arma na diagonal no arquivo: comprimento, largura e espessura pelos eixos principais
        M = V - V.mean(0)
        _, _, eixos = np.linalg.svd(M[:: max(1, len(M) // 20000)], full_matrices=False)
        R[0] = eixos[0] * (-1 if c['inv'] else 1)
        R[2] = eixos[1] * (-1 if c['invz'] else 1)
    else:
        a, b = EIXO[c['eixo']], EIXO[c['largura']]
        R[0, a] = -1 if c['inv'] else 1
        R[2, b] = -1 if c['invz'] else 1
    # espessura: completa a base direita (Y = Z × X)
    R[1] = np.cross(R[2], R[0])
    assert abs(np.linalg.det(R) - 1) < 1e-6
    P = V @ R.T
    lo, hi = P.min(0), P.max(0)
    P -= (lo + hi) / 2
    k = c['len'] / (hi[0] - lo[0])
    P *= k
    P[:, 0] -= -c['len'] / 2 + c['cabo'] * c['len']
    P[:, 2] -= c.get('mz', 0) * c['len']                 # mão abaixo do cano (pistola)
    return P, R


def normais_cantos(V, F, quina=40.0):
    """Normal de cada canto: média das faces vizinhas que não fazem quina viva com a face."""
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    area = np.linalg.norm(fn, axis=1, keepdims=True)
    fu = fn / (area + 1e-12)
    viz = [[] for _ in range(len(V))]
    for f, tri in enumerate(F):
        for v in tri:
            viz[v].append(f)
    cq = np.cos(np.radians(quina))
    N = np.zeros((len(F), 3, 3))
    for f, tri in enumerate(F):
        for j, v in enumerate(tri):
            vs = viz[v]
            ok = [g for g in vs if fu[g] @ fu[f] >= cq]
            s = fn[ok].sum(0)
            N[f, j] = s / (np.linalg.norm(s) + 1e-12)
    return N


def emissao(cor):
    """Brilho das cores fortes e saturadas da textura (veias, filetes acesos)."""
    mx, mn = cor.max(-1), cor.min(-1)
    sat = (mx - mn) / (mx + 1e-6)
    return np.clip((mx - 0.45) / 0.35, 0, 1) * np.clip((sat - 0.35) / 0.3, 0, 1)


def cores_cantos(Vh, Fh, UVh, mapas, VL, FL, fio=False):
    """Cor, metal e emissão de cada canto (amostrados na malha original perto do canto).
    fio: a emissão do canto é a maior entre as amostras, não a da cor média (filetes finos
    acesos, como os da pistola do Orion, somem na média)."""
    A, B, C = Vh[Fh[:, 0]], Vh[Fh[:, 1]], Vh[Fh[:, 2]]
    fh = np.cross(B - A, C - A)
    fh /= np.linalg.norm(fh, axis=1, keepdims=True) + 1e-12
    arv = cKDTree((A + B + C) / 3)
    fl = np.cross(VL[FL[:, 1]] - VL[FL[:, 0]], VL[FL[:, 2]] - VL[FL[:, 0]])
    fl /= np.linalg.norm(fl, axis=1, keepdims=True) + 1e-12
    cen = VL[FL].mean(1)
    cor = np.zeros((len(FL), 3, 3))
    met = np.zeros((len(FL), 3))
    emi_fio = np.zeros((len(FL), 3))
    cor_fio = np.zeros((len(FL), 3, 3))
    # 3 pontos perto de cada canto (o canto puxado para o centro e para os vizinhos)
    W = [(0.72, 0.18, 0.10), (0.72, 0.10, 0.18), (0.55, 0.225, 0.225)]
    for j in range(3):
        acc_c, acc_m = 0, 0
        for w in W:
            P = w[0] * VL[FL[:, j]] + w[1] * VL[FL[:, (j + 1) % 3]] + w[2] * VL[FL[:, (j + 2) % 3]]
            P = 0.85 * P + 0.15 * cen
            _, cand = arv.query(P, k=8)
            Q, bc = mais_proximo(P[:, None, :], A[cand], B[cand], C[cand])
            d = np.linalg.norm(Q - P[:, None, :], axis=-1)
            contra = np.einsum('nkj,nj->nk', fh[cand], fl) < 0.0
            k = np.argmin(d + contra * 0.02 * (d.max() + 1e-9), axis=1)
            r = np.arange(len(P))
            f, b = cand[r, k], bc[r, k]
            uv = np.einsum('nk,nkj->nj', b, UVh[Fh[f]])
            amo = amostra(mapas['cor'], uv)[:, ::-1] / 255.0                    # BGR → RGB
            acc_c = acc_c + amo
            e = emissao(amo)
            maior = e > emi_fio[:, j]
            emi_fio[maior, j], cor_fio[maior, j] = e[maior], amo[maior]
            if mapas.get('mr') is not None:
                acc_m = acc_m + amostra(mapas['mr'], uv)[:, 0] / 255.0          # azul = metal
        cor[:, j] = acc_c / len(W)
        met[:, j] = acc_m / len(W) if mapas.get('mr') is not None else 0.5
    emi = emi_fio if fio else emissao(cor)
    if fio:                                     # o canto aceso fica com a cor do filete
        cor = np.where(emi[..., None] > 0.3, cor_fio, cor)
    return cor, met, emi


def sem_fragmentos(V, F, frac=0.005):
    """Tira as peças soltas minúsculas (restos da geração: lascas fora da arma)."""
    from scipy import sparse
    from scipy.sparse.csgraph import connected_components
    from importar_modelo import soldar
    _, Fw, _ = soldar(V, F)
    n = Fw.max() + 1
    ij = np.concatenate([Fw[:, [0, 1]], Fw[:, [1, 2]], Fw[:, [2, 0]]])
    G = sparse.coo_matrix((np.ones(len(ij)), (ij[:, 0], ij[:, 1])), shape=(n, n))
    _, rot = connected_components(G, directed=False)
    comp = rot[Fw[:, 0]]
    cont = np.bincount(comp)
    fica = cont[comp] >= frac * len(F)
    print('  fragmentos removidos:', int((~fica).sum()), 'triângulos em', int((cont < frac * len(F)).sum()), 'peças')
    return F[fica]


def sem_corda(V, F, c):
    """Tira a corda do arco (o jogo desenha a corda que estica ao puxar): em fatias ao longo do
    comprimento, a corda é o grupo de triângulos separado do arco por um vão na largura, do
    lado da corda (+largura). Perto das pontas (sem vão) ela fica: são os encaixes."""
    ex, ew = EIXO[c['eixo']], EIXO[c['largura']]
    C = V[F].mean(1)
    L = V[:, ex].max() - V[:, ex].min()
    tira = np.zeros(len(F), bool)
    for y0 in np.arange(V[:, ex].min(), V[:, ex].max(), 0.02 * L):
        sel = np.nonzero(np.abs(C[:, ex] - y0) < 0.01 * L)[0]
        if len(sel) < 10:
            continue
        xs = np.sort(C[sel, ew])
        d = np.diff(xs)
        i = np.argmax(d)
        if d[i] > 0.03 * L and (xs > xs[i]).sum() < 0.4 * len(xs):
            tira[sel[C[sel, ew] > xs[i]]] = True
    print('  corda removida:', int(tira.sum()), 'triângulos')
    return F[~tira]


def importar(nome, c):
    V, UV, F, mapas = ler_glb(os.path.join(RAIZ, PASTA, c['arq']))
    if mapas.get('cor') is None:
        raise SystemExit(f'{nome}: o GLB não tem textura de cor')
    if c.get('parte'):
        ex, sg = c['parte']
        F = F[(V[F][:, :, EIXO[ex]].mean(1) * sg) > 0]
    if c.get('sem_corda'):
        F = sem_corda(V, F, c)
    if c.get('limpar'):
        F = sem_fragmentos(V, F)
    usados = np.unique(F)                                 # só os vértices que sobraram (caixa certa)
    novo = np.full(len(V), -1, np.int64)
    novo[usados] = np.arange(len(usados))
    V, UV, F = V[usados], UV[usados], novo[F]
    P, R = orientar(V, c)
    for x0, x1, z0, z1 in c.get('cortar', []):
        C = P[F].mean(1)
        fora = (C[:, 0] > x0) & (C[:, 0] < x1) & (C[:, 2] > z0) & (C[:, 2] < z1)
        print('  lasca cortada:', int(fora.sum()), 'triângulos')
        F = F[~fora]
    if c.get('cabo_z'):
        meio = np.abs(P[np.unique(F), 0]) < 0.04 * c['len']
        P[:, 2] -= P[np.unique(F)][meio, 2].mean()
    if len(F) > c['tri']:
        VL, FL = reduzir(P, F, c['tri'])
    else:
        VL, FL = P.copy(), F.copy()
    cor, met, emi = cores_cantos(P, F, UV, mapas, VL, FL, c.get('fio', False))
    N = normais_cantos(VL, FL)
    q = 32767 / (np.abs(VL).max() + 1e-6)
    reg = bytearray()
    for f in range(len(FL)):
        mat = 1 if met[f].mean() > 0.5 else 2
        for j in range(3):
            x, y, z = np.round(VL[FL[f, j]] * q).astype(int)
            nx, ny, nz = np.round(N[f, j] * 127).astype(int)
            r, g, b = np.round(np.clip(cor[f, j], 0, 1) * 255).astype(int)
            reg += struct.pack('<hhhbbbBBBBB', x, y, z, nx, ny, nz, r, g, b, mat, int(round(emi[f, j] * 255)))
    ext = VL.max(0) - VL.min(0)
    # pontas: média dos 1% de vértices mais extremos em cada ponta do comprimento (x, z)
    k = max(3, len(VL) // 100)
    ordx = np.argsort(VL[:, 0])
    pontas = [np.round(VL[ordx[-k:]][:, [0, 2]].mean(0), 2).tolist(), np.round(VL[ordx[:k]][:, [0, 2]].mean(0), 2).tolist()]
    info = dict(n=int(len(FL)), q=round(float(q), 4), len=c['len'], cabo=round(-float(VL[:, 0].min()), 2),
                w=round(float(ext[2]), 2), h=round(float(ext[1]), 2), pontas=pontas, glow=c['glow'], src=f"{PASTA}/{c['arq']}",
                a=base64.b64encode(bytes(reg)).decode('ascii'))
    print(f"{nome}: {len(F)} → {len(FL)} triângulos, {ext.round(1).tolist()} (x, y, z), emissivos {float((emi > 0.3).mean()):.0%}, {len(reg) // 1024} KB")
    return info, (VL, FL, cor, emi)


def previa(nome, dados, pasta):
    """Duas vistas (de lado: X-Z; de cima: X-Y) com a régua do comprimento e a mão em 0."""
    from escultor3d import rasterizar
    VL, FL, cor, emi = dados
    imgs = []
    for vista in ((0, 2, 1), (0, 1, 2)):
        a, b, prof = vista
        lo, hi = VL.min(0), VL.max(0)
        S = 520 / max(hi[a] - lo[a], hi[b] - lo[b])
        W, H = int((hi[a] - lo[a]) * S) + 40, int((hi[b] - lo[b]) * S) + 40
        xy = np.stack([(VL[:, a] - lo[a]) * S + 20, (hi[b] - VL[:, b]) * S + 20], 1)
        xyc = xy[FL].reshape(-1, 2)
        Fc = np.arange(len(xyc)).reshape(-1, 3)
        luz = np.clip(0.35 + 0.65 * np.abs(np.cross(VL[FL[:, 1]] - VL[FL[:, 0]], VL[FL[:, 2]] - VL[FL[:, 0]])[:, prof]
                                           / (np.linalg.norm(np.cross(VL[FL[:, 1]] - VL[FL[:, 0]], VL[FL[:, 2]] - VL[FL[:, 0]]), axis=1) + 1e-9)), 0, 1)
        col = (cor * luz[:, None, None] + emi[..., None] * 0.6).reshape(-1, 3)
        ordem = np.argsort(VL[FL][:, :, prof].mean(1))      # do fundo para a frente (pintor)
        buf = np.zeros((H, W, 3))
        rasterizar(xyc, Fc[ordem], col, H, W, buf)
        im = (np.clip(buf, 0, 1) * 255).astype(np.uint8)[:, :, ::-1].copy()
        x0 = int((0 - lo[a]) * S + 20)
        cv2.line(im, (x0, 0), (x0, H), (0, 255, 0), 1)
        cv2.putText(im, f'{nome} {"lado X-Z" if prof == 1 else "topo X-Y"}  (verde = mao, +X para a direita)', (5, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        imgs.append(im)
    w = max(i.shape[1] for i in imgs)
    out = np.concatenate([np.pad(i, ((0, 0), (0, w - i.shape[1]), (0, 0))) for i in imgs], 0)
    cv2.imwrite(os.path.join(pasta, f'{nome}.png'), out)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('armas', nargs='*', help='ids de ARMAS (padrão: todas)')
    ap.add_argument('--previa', help='pasta para as imagens de conferência')
    args = ap.parse_args()
    nomes = args.armas or list(ARMAS)
    destino = os.path.join(RAIZ, SAIDA)
    atuais = {}
    if os.path.exists(destino):
        m = re.search(r'WEAPON3D = (\{.*\});', open(destino, encoding='utf-8').read(), re.S)
        if m:
            atuais = json.loads(m.group(1))
    for nome in nomes:
        if nome not in ARMAS:
            raise SystemExit(f'arma desconhecida: {nome} (use: {", ".join(ARMAS)})')
        info, dados = importar(nome, ARMAS[nome])
        atuais[nome] = info
        if args.previa:
            os.makedirs(args.previa, exist_ok=True)
            previa(nome, dados, args.previa)
    cab = ('// ECLIPSE ZERO · Armas 3D do jogo (gerado por tools/importar_arma.py a partir dos GLB de\n'
           f'// {PASTA}/; não edite à mão). Formato e encaixes: js/heroes/armas3d.js\n')
    with open(destino, 'w', encoding='utf-8') as fo:
        fo.write(cab + 'const WEAPON3D = ' + json.dumps({k: atuais[k] for k in ARMAS if k in atuais}, separators=(',', ':')) + ';\n')
    print('gravado', SAIDA, os.path.getsize(destino) // 1024, 'KB')


if __name__ == '__main__':
    main()
