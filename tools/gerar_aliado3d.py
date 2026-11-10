"""Gera js/assets/<id>3d.js: o modelo 3D texturizado de um aliado (Lyra, Drakos, Sera, Orion).

Origem: assets/images/<id>_front|sideR|back|sideL.webp — as 4 vistas tiradas do vídeo do
modelo 3D (tools/extrair_vistas.py), com a silhueta no canal alfa. Os modelos estão em
pose "A" (braços abertos).
  1. Marcos do corpo medidos na vista de frente: axila/ombro, mão, gancho (quadril),
     pescoço, tornozelos e a barra do casaco.
  2. Proporções do esqueleto (js/models/kael.js, build(props)) tiradas desses marcos: o
     aliado usa as mesmas animações do Kael, mas com os próprios ombros, braços e pernas.
  3. Escultura, partes, malhas, atlas UV e textura assada: tools/escultor3d.py (o mesmo
     caminho do Kael). Os braços em "A" giram para a direção de repouso do esqueleto.

Uso (na pasta do projeto):  python3 tools/gerar_aliado3d.py [lyra drakos sera orion]
Requer node, numpy, scipy, opencv-python-headless, scikit-image, fast-simplification,
xatlas e Pillow. SALVAR_PNG=pasta também salva as texturas para conferir.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import morphology

from escultor3d import RAIZ, VIEWS, Escultura, Q, assar, codificar, esqueleto, projecao, rot_entre, unit


def orion_cor(c8):
    """O vídeo do Orion está no modo de malha (cinza claro): escurece para o preto do traje e
    mantém as linhas laranja da arte (ficha do Orion: preto com veios laranja)."""
    hsv = cv2.cvtColor(c8, cv2.COLOR_BGR2HSV).astype(np.float32)
    laranja = (hsv[..., 0] > 4) & (hsv[..., 0] < 32) & (hsv[..., 1] > 55)
    out = c8.astype(np.float32) * 0.36 + np.array([4, 5, 7], np.float32)   # carvão levemente frio
    brilho = np.clip(c8.astype(np.float32) * np.array([0.35, 0.75, 1.25]) + np.array([0, 10, 40]), 0, 255)
    out[laranja] = brilho[laranja]
    return np.clip(out, 0, 255).astype(np.uint8)


# Altura em unidades do jogo (Kael = 62,1), casaco longo (abas animadas) e ajuste de cor
def tom(k):
    """O visualizador ilumina mais que o jogo: escurece as cores (as linhas de neon quase não mudam)."""
    def f(c8):
        hsv = cv2.cvtColor(c8, cv2.COLOR_BGR2HSV)
        neon = (hsv[..., 1] > 110) & (hsv[..., 2] > 150)
        out = c8.astype(np.float32) * k
        out[neon] = c8[neon].astype(np.float32) * min(1.0, k + 0.25)
        return np.clip(out, 0, 255).astype(np.uint8)
    return f


# barra: altura da barra do casaco (medida nas vistas; a silhueta nem sempre mostra onde ela acaba)
ALIADOS = {
    'lyra': {'altura': 58.5, 'casaco': True, 'barra': 10.0, 'cor': tom(0.8)},
    'drakos': {'altura': 66.5, 'casaco': False, 'cor': tom(0.62)},
    'sera': {'altura': 60.0, 'casaco': True, 'barra': 8.5, 'cor': tom(0.72)},
    'orion': {'altura': 63.0, 'casaco': True, 'barra': 15.0, 'cor': orion_cor},
}
VOX = 0.36
TEX = 1536
NITIDEZ = 0.3


def carregar(pid):
    masks, cores = {}, {}
    for v in VIEWS:
        a = np.array(Image.open(os.path.join(RAIZ, 'assets', 'images', f'{pid}_{v}.webp')).convert('RGBA'))
        m = a[..., 3] > 127
        c8 = cv2.cvtColor(a[..., :3], cv2.COLOR_RGB2BGR)
        # cores de 2 px para dentro (a borda mistura com o fundo) estendidas para fora da silhueta
        _, (iy, ix) = ndimage.distance_transform_edt(~ndimage.binary_erosion(m, iterations=2), return_indices=True)
        masks[v], cores[v] = m, c8[iy, ix]
    return masks, cores


def corridas(linha):
    """Trechos contínuos (início, fim) de uma linha da máscara."""
    d = np.diff(np.concatenate([[0], linha.astype(int), [0]]))
    return list(zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0] - 1))


def marcos(masks, P, H):
    """Marcos do corpo em unidades (y: +direita do personagem; z: altura) a partir da vista de frente."""
    m, p = masks['front'], P['front']
    row = lambda z: int(round(p['top'] + (H - z) * p['s']))
    yof = lambda c: -(c - p['c']) / p['s']
    # Mão: ponto mais externo de cada lado na metade de cima do corpo (os braços em "A")
    mao = {}
    for s in (1, -1):
        best = None
        for z in np.arange(0.3 * H, 0.75 * H, 0.1):
            r = np.nonzero(m[row(z)])[0]
            if not len(r):
                continue
            y = yof(r.min() if s > 0 else r.max())
            if s * y > (best[0] * s if best else -1e9):
                best = (y, z)
        mao[s] = np.array([0.3, best[0], best[1]])
    # Axila: subindo a partir das mãos, a primeira linha em que o braço encosta no tronco
    # (deixa de haver três trechos: braço, tronco, braço)
    z_ax = 0.72 * H
    for z in np.arange(max(mao[1][2], mao[-1][2]) + 1.0, 0.9 * H, 0.1):
        if len(corridas(m[row(z)])) < 3:
            z_ax = z
            break
    # Ombro: um pouco acima da axila, na borda do tronco
    rr = corridas(m[row(z_ax - 0.5)])
    tronco = max(rr, key=lambda t: t[1] - t[0])
    meia = (tronco[1] - tronco[0]) / 2 / p['s']
    z_sh = z_ax + 0.06 * H
    ombro = {s: np.array([0.0, s * max(meia, 0.08 * H), z_sh]) for s in (1, -1)}
    # Quadril: o gancho fica escondido pelo casaco nas vistas; usa a proporção do corpo
    quadril_z = 0.49 * H
    # Pescoço (base do queixo): gola e capuz escondem o pescoço na silhueta; usa a proporção
    z_pesc = 0.855 * H
    # Tornozelos: centro de cada perna perto do chão
    tornozelo = {}
    for s in (1, -1):
        cs = [yof((a + b) / 2) for a, b in corridas(m[row(0.07 * H)]) if b - a > 0.02 * H * p['s']]
        cs = [c for c in cs if np.sign(c) == s] or [s * 0.07 * H]
        tornozelo[s] = np.array([0.6, max(cs, key=abs) if s > 0 else min(cs), 0.058 * H])
    # Barra do casaco: subindo das botas, a primeira linha da frente bem mais larga que as pernas
    larg = lambda z: (np.ptp(np.nonzero(m[row(z)])[0]) / p['s']) if m[row(z)].any() else 0
    botas = larg(0.06 * H)
    barra = 0.0
    for z in np.arange(0.06 * H, quadril_z, 0.1):
        if larg(z) > botas * 1.3 + 0.03 * H:
            barra = z
            break
    return {'axila': z_ax, 'ombro': ombro, 'mao': mao, 'quadril_z': quadril_z, 'pescoco': z_pesc,
            'tornozelo': tornozelo, 'barra': barra}


def ossos_e_proporcoes(k, H):
    """Ossos na pose da arte (início, fim, raio) e proporções do esqueleto (build(props)) a partir
    dos marcos do corpo (marcos()). Também usado por tools/importar_modelo.py."""
    bones = {}
    HIPY = 0.056 * H
    for s, nm in ((1, 'R'), (-1, 'L')):
        sh, tip = k['ombro'][s], k['mao'][s]
        d = tip - sh
        cot = sh + d * 0.43 + np.array([-0.5, 0, 0])
        pun = sh + d * 0.82
        bones['arm' + nm + 'u'] = (sh, cot, 0.055 * H)
        bones['arm' + nm + 'f'] = (cot, tip, 0.048 * H)
        hip = np.array([0.0, s * HIPY, k['quadril_z']])
        ank = k['tornozelo'][s]
        joe = (hip + ank) / 2 + np.array([0.7, 0, 0])
        bones['thigh' + nm] = (hip, joe, 0.06 * H)
        bones['shin' + nm] = (joe, ank, 0.055 * H)
        bones['foot' + nm] = (ank, ank + np.array([0.05 * H, 0, -0.058 * H]), 0.06 * H)
        bones['_pun' + nm] = (pun, pun, 0)
    # ---------------------------------------------------------------- proporções do esqueleto
    L = lambda a, b: float(np.linalg.norm(b - a))
    hips_z = k['quadril_z'] + 1.0                      # nó 'hips' = junta da coxa + 1
    torso_z = hips_z + 0.5
    props = {
        'SHY': round(float(np.mean([abs(k['ombro'][s][1]) for s in (1, -1)])), 3),
        'SHZ': round(float(k['ombro'][1][2] - torso_z), 3),
        'HIPY': round(HIPY, 3), 'HZ0': round(hips_z - 26.5, 3), 'HAND0': 1.4,
        'AUP': round(np.mean([L(*bones['arm' + n + 'u'][:2]) for n in 'RL']), 3),
        'AFO': round(np.mean([L(bones['arm' + n + 'f'][0], bones['_pun' + n][0]) for n in 'RL']), 3),
        'LTH': round(np.mean([L(*bones['thigh' + n][:2]) for n in 'RL']), 3),
        'LSH': round(np.mean([L(*bones['shin' + n][:2]) for n in 'RL']), 3),
        'ANK': round(0.058 * H, 3), 'NECK': round(float(k['pescoco'] - 0.02 * H - torso_z), 3),
    }
    k['punho'] = {n: bones['_pun' + n][0] for n in 'RL'}
    for n in 'RL':
        del bones['_pun' + n]
    return bones, props


def gerar(pid, cfg):
    H = cfg['altura']
    masks, cores = carregar(pid)
    if cfg.get('cor'):
        cores = {v: cfg['cor'](c) for v, c in cores.items()}
    P = projecao(masks, H, centro=(0.3, 0.42))
    k = marcos(masks, P, H)
    print(pid, 'axila', round(k['axila'], 1), 'quadril', round(k['quadril_z'], 1), 'pescoço', round(k['pescoco'], 1), 'barra', round(k['barra'], 1),
          'ombro', np.round(k['ombro'][1], 1), 'mão', np.round(k['mao'][1], 1), np.round(k['mao'][-1], 1), 'tornozelo', np.round(k['tornozelo'][1], 1))

    bones, props = ossos_e_proporcoes(k, H)
    print(pid, 'proporções', props)
    Wn = esqueleto(props)

    # ---------------------------------------------------------------- escultura e partes
    z_pesc = k['pescoco'] - 0.02 * H
    esc = Escultura(masks, P, H, VOX, ((-0.24 * H, 0.24 * H), (-0.42 * H, 0.42 * H), (-0.6, H + 1.0)),
                    lambda Z: np.where(Z > z_pesc, 1.9, 2.4))
    X, Y, Z, solid = esc.X, esc.Y, esc.Z, esc.solid
    Z_CINTURA = k['quadril_z'] + 0.6
    Z_OMBRO = k['ombro'][1][2] + 0.03 * H
    Z_BARRA = cfg.get('barra', k['barra']) if cfg['casaco'] else 0.0
    part = {}
    dist = {kk: esc.dist_seg(a, b) for kk, (a, b, r) in bones.items()}
    # Braços em "A": tudo o que fica para fora da largura do tronco (medida na vista de frente,
    # linha a linha; acima da axila vale a largura da axila), dividido entre braço e antebraço
    mf, pf = masks['front'], P['front']
    meia = np.zeros(len(esc.zs))
    for i, z in enumerate(esc.zs):
        zz = min(z, k['axila'] - 0.5)
        r = int(round(pf['top'] + (H - zz) * pf['s']))
        cs = corridas(mf[min(max(r, 0), mf.shape[0] - 1)])
        meio = [(a, b) for a, b in cs if a <= pf['c'] <= b] or [min(cs, key=lambda t: abs((t[0] + t[1]) / 2 - pf['c']))] if cs else [(pf['c'], pf['c'])]
        a, b = meio[0]
        meia[i] = max(pf['c'] - a, b - pf['c']) / pf['s']
    fora = np.abs(Y) > meia[None, None, :] + 0.3
    zmao = min(k['mao'][1][2], k['mao'][-1][2]) - 0.06 * H
    braco = solid & fora & (Z < Z_OMBRO) & (Z > zmao)
    for nm, sgn in (('R', 1), ('L', -1)):
        lado = braco & (np.sign(Y) == sgn)
        u, f = 'arm' + nm + 'u', 'arm' + nm + 'f'
        part[u] = lado & (dist[u] <= dist[f])
        part[f] = lado & (dist[u] > dist[f])
    rcab = 0.09 * H
    cabeca = solid & (Z > z_pesc) & ((((X - 0.4) ** 2 + Y ** 2) < rcab ** 2) | (Z > z_pesc + 0.055 * H))
    part['head'] = cabeca
    tronco = solid & (Z >= Z_CINTURA) & ~cabeca & ~braco
    for i in range(tronco.shape[2]):
        if esc.zs[i] < Z_OMBRO and tronco[:, :, i].sum() > 3:
            tronco[:, :, i] = morphology.convex_hull_image(tronco[:, :, i]) & (solid[:, :, i] | ~braco[:, :, i])
    part['torso'] = tronco & ~cabeca
    pernas = {}
    for nm in ('R', 'L'):
        for kk in ('thigh' + nm, 'shin' + nm, 'foot' + nm):
            pernas[kk] = (dist[kk] < bones[kk][2] * (1.0 if cfg['casaco'] else 1.6)) & (Z < Z_CINTURA + 1.0)
    chaves = list(pernas)
    dono = np.argmin(np.stack([dist[kk] for kk in chaves]), axis=0)
    for i, kk in enumerate(chaves):
        part[kk] = pernas[kk] & (dono == i) & (solid | (Z > Z_BARRA)) & ~braco
        if kk.startswith('foot'):
            part[kk] &= np.abs(Y - bones[kk][0][1]) < 0.045 * H
    baixo = solid & (Z < Z_CINTURA) & ~braco
    usado = np.any(np.stack([part[kk] for kk in chaves]), axis=0)
    if cfg['casaco']:
        # casaco: casca externa entre a cintura e a barra, sem a abertura da frente, em 6 abas
        casca = baixo & (ndimage.distance_transform_edt(baixo, sampling=VOX) <= 1.6)
        ang = np.degrees(np.arctan2(Y, X))
        abertura = (np.abs(ang) < 30) & (np.abs(Y) < 0.12 * H)
        casaco = casca & ~abertura & ~np.any(np.stack([part[kk] & (Z < Z_BARRA) for kk in chaves]), axis=0)
        ABAS = {'cFR': 64, 'cSR': 107, 'cBR': 147, 'cBL': -147, 'cSL': -107, 'cFL': -64}
        aba = np.argmin(np.stack([np.abs((ang - c + 180) % 360 - 180) for c in ABAS.values()]), axis=0)
        for i, kk in enumerate(ABAS):
            dobra = Wn[kk + '2'][2, 3]
            sel = casaco & (aba == i)
            part[kk] = sel & (Z >= dobra)
            part[kk + '2'] = sel & (Z < dobra)
        part['hips'] = casca & abertura & (Z >= Z_BARRA)
    else:
        # sem casaco: o que sobra entre a cintura e as coxas é o quadril (armadura da pelve)
        part['hips'] = baixo & ~usado & (Z > k['quadril_z'] - 0.06 * H)

    ORCAMENTO = {'head': 1700, 'torso': 1900, 'hips': 420}
    malhas = {}
    for kk, vol in part.items():
        r = esc.malha(vol, ORCAMENTO.get(kk, 560 if kk.startswith('arm') else 360 if kk.startswith('c') else 480))
        if r is None:
            print('vazio', kk)
            continue
        malhas[kk] = r
        print(f'{kk:7s} voxels={int(vol.sum()):6d} triângulos={len(r[2])}')

    # Ligação: membros pela junta da arte, girando da direção da arte para a de repouso
    bind = {}
    for kk in malhas:
        B = Wn[kk].copy()
        if kk in bones:
            a, b, _ = bones[kk]
            R = B[:, :3]
            Rn = R if kk.startswith('foot') else rot_entre(-unit(R[:, 2]), b - a) @ R
            B = np.hstack([Rn, a.reshape(3, 1)])
        bind[kk] = B

    rosto = lambda p, ms: (p[:, 2] > z_pesc) & (p[:, 0] > float(np.mean(ms['head'][0][:, 0])) - 0.03 * H)
    uvmesh, tex64, img8 = assar(esc, malhas, cores, TEX, NITIDEZ, rosto)
    if os.environ.get('SALVAR_PNG'):
        Image.fromarray(cv2.cvtColor(img8, cv2.COLOR_BGR2RGB)).save(os.path.join(os.environ['SALVAR_PNG'], f'{pid}_tex.png'))
    saida, tot_v, tot_t = codificar(malhas, uvmesh, bind)
    destino = os.path.join(RAIZ, 'js', 'assets', f'{pid}3d.js')
    cab = f"""'use strict';
// ECLIPSE ZERO · {pid.capitalize()} 3D (gerado por tools/gerar_aliado3d.py a partir de assets/images/{pid}_*.webp)
// ---------------------------------------------------------------------------
// props: proporções do esqueleto (js/models/kael.js build(props)); parts: malha de cada
// parte no espaço do seu nó, em base64 (a = vértices int16: x, y, z ×q, normal ×32767,
// u, v; i = triângulos uint16); tex: textura assada (JPEG). Não edite à mão.
// ---------------------------------------------------------------------------
"""
    with open(destino, 'w', encoding='utf-8') as f:
        f.write(cab)
        f.write(f"(window.HERO3D = window.HERO3D || {{}}).{pid} = " + json.dumps({'q': Q, 'altura': H, 'props': props, 'parts': saida}, separators=(',', ':')) + ';\n')
        f.write(f"HERO3D.{pid}.tex = 'data:image/jpeg;base64," + tex64 + "';\n")
    print('Gerado', destino, f'({os.path.getsize(destino) // 1024} KB: {tot_v} vértices, {tot_t} triângulos, textura {len(tex64) // 1024} KB)')


if __name__ == '__main__':
    for pid in (sys.argv[1:] or list(ALIADOS)):
        gerar(pid, ALIADOS[pid])
