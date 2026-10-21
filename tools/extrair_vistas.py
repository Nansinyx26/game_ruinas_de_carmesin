"""Extrai as 4 vistas (frente, lado direito, costas, lado esquerdo) de um personagem de um
vídeo do visualizador 3D (gravação de tela do Tripo, fundo em degradê cinza escuro) e salva
em assets/images/<id>_<vista>.webp com a silhueta no canal alfa. As vistas alimentam
tools/gerar_aliado3d.py.

Uso: python3 tools/extrair_vistas.py <id> <vídeo.mp4> <quadro frente> <lado dir.> <costas> <lado esq.>
O quadro de cada vista é escolhido olhando o vídeo (lado direito = personagem virado para a
direita da tela, mostrando o lado direito do corpo). Requer numpy, scipy, opencv e Pillow.
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOMES = ('front', 'sideR', 'back', 'sideL')


def fundo(im):
    """Degradê radial do fundo: luminância mediana por anel nos pixels claramente de fundo."""
    g = im.astype(np.float32)
    h, w = g.shape[:2]
    lum, sat = g.mean(2), g.max(2) - g.min(2)
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot((yy - h * 0.42) / h, (xx - w * 0.5) / h)
    sel = ~ndimage.binary_dilation((lum > 70) | (sat > 18), iterations=25)
    rb = np.clip((r * 60).astype(int), 0, 59)
    prof = np.array([np.median(lum[sel & (rb == i)]) if (sel & (rb == i)).sum() > 50 else np.nan for i in range(60)])
    i = np.arange(60)
    ok = ~np.isnan(prof)
    return np.interp(i, i[ok], prof[ok])[rb]


def sem_cursor(im):
    """Apaga o cursor do mouse (seta branca pequena) quando ele está por cima do personagem."""
    branco = im.min(axis=2) > 228
    lab, n = ndimage.label(branco)
    tira = np.zeros(branco.shape, bool)
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        area = int((lab[sl] == i).sum())
        if 20 <= area <= 1500 and 10 <= h <= 70 and 6 <= w <= 50:
            tira[sl] |= lab[sl] == i
    if not tira.any():
        return im
    tira = ndimage.binary_dilation(tira, iterations=3)      # inclui o contorno escuro da seta
    return cv2.inpaint(im, tira.astype(np.uint8), 5, cv2.INPAINT_TELEA)


def estatico(cap, q0, q1, n=40):
    """O que não muda enquanto o personagem gira (a sombra e o reflexo do chão do visualizador):
    mediana e desvio da luminância de cada pixel nos quadros da volta."""
    lums = []
    for q in np.linspace(q0, q1, n).astype(int):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(q))
        ok, im = cap.read()
        if ok:
            lums.append(im.astype(np.float32).mean(2))
    L = np.stack(lums)
    return np.median(L, axis=0), L.std(axis=0)


def silhueta(im, med=None, std=None):
    """Personagem iluminado sobre o fundo escuro; o chão (parado durante a volta) fica de fora."""
    g = im.astype(np.float32)
    lum, sat = g.mean(2), g.max(2) - g.min(2)
    d = lum - fundo(im)
    m = (d > 9) | (sat > 20)
    if med is not None:
        m &= ~((std < 3) & (np.abs(lum - med) < 6))
    m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(m)
    m = lab == 1 + np.argmax(ndimage.sum(m, lab, range(1, n + 1)))
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=3))
    # Refinamento por cor (GrabCut): o vão entre as pernas, perto do centro do degradê, é mais
    # claro que o resto do fundo e passaria por personagem; o modelo de cor separa os dois
    gc = np.full(m.shape, cv2.GC_BGD, np.uint8)
    gc[ndimage.binary_dilation(m, iterations=12)] = cv2.GC_PR_BGD
    gc[m] = cv2.GC_PR_FGD
    gc[m & ((d > 30) | (sat > 30))] = cv2.GC_FGD
    cv2.grabCut(im, gc, None, np.zeros((1, 65)), np.zeros((1, 65)), 6, cv2.GC_INIT_WITH_MASK)
    m = (gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD)
    m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(m)
    m = lab == 1 + np.argmax(ndimage.sum(m, lab, range(1, n + 1)))
    return ndimage.binary_fill_holes(m)


def main():
    pid, video = sys.argv[1], sys.argv[2]
    quadros = [int(q) for q in sys.argv[3:7]]
    cap = cv2.VideoCapture(video)
    med, std = estatico(cap, min(quadros), max(quadros))
    for nome, q in zip(NOMES, quadros):
        cap.set(cv2.CAP_PROP_POS_FRAMES, q)
        ok, im = cap.read()
        if not ok:
            raise SystemExit(f'quadro {q} não lido')
        m = silhueta(im, med, std)
        im = sem_cursor(im)
        ys, xs = np.nonzero(m)
        pad = int(0.02 * im.shape[0])
        y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, im.shape[0])
        x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, im.shape[1])
        rgba = np.dstack([cv2.cvtColor(im[y0:y1, x0:x1], cv2.COLOR_BGR2RGB), (m[y0:y1, x0:x1] * 255).astype(np.uint8)])
        dst = os.path.join(RAIZ, 'assets', 'images', f'{pid}_{nome}.webp')
        Image.fromarray(rgba, 'RGBA').save(dst, 'WEBP', quality=92, method=6)
        print(dst, f'{x1 - x0}x{y1 - y0}', f'{os.path.getsize(dst) // 1024} KB')


if __name__ == '__main__':
    main()
