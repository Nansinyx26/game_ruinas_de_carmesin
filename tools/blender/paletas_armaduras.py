"""Paletas e nomes dos conjuntos de armadura dos níveis 50, 75 e 100, tirados das imagens.

As imagens de referência (uma por peça, recortadas com transparência) ficam em
assets/Criar_Personagem/Armaduras_Level_<nível>/<pasta da classe>/<Nome_da_Peça>_nivel<nível>.png,
com o MANIFESTO_level_<nível>.csv de cada nível. Daqui sai tools/blender/armaduras_paletas.json:
para cada classe e nível, o nome de cada peça (o do manifesto), a imagem e as quatro cores que o
gerador do Blender (tools/blender/armaduras.py) usa nos materiais:
  principal  — a cor dominante do conjunto (tecido, couro ou placa)
  escuro     — o tom escuro de baixo (couro, forro, metal escurecido)
  acabamento — os frisos (ouro, bronze ou prata)
  brilho     — os cristais e as runas acesas
Rode com o python3 do sistema (numpy e OpenCV):  python3 tools/blender/paletas_armaduras.py
"""
import csv
import glob
import json
import os
import sys

import cv2
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
ORIG = os.path.join(RAIZ, 'assets', 'Criar_Personagem')
SAIDA = os.path.join(AQUI, 'armaduras_paletas.json')
NIVEIS = (50, 75, 100)
CLASSES = {'Classe_Assassino': 'assassino', 'Classe_Guerreiro': 'guerreiro', 'Classe_Mago': 'mago', 'Classe_Patrulheiro': 'patrulheiro', 'Guardião_Arcano': 'guardiao'}
# primeira palavra do nome da peça → vaga do Arsenal (as ombreiras viram duas peças: esquerda e direita)
VAGAS = {'Peitoral': 'peitoral', 'Ombreiras': 'ombros', 'Capa': 'capa', 'Capuz': 'capacete', 'Luvas': 'luvas', 'Calça': 'calcas', 'Botas': 'botas', 'Amuleto': 'acessorio'}


def lin(c):
    return [round(float(v), 4) for v in (np.asarray(c, float) / 255.0) ** 2.2]   # sRGB → linear (cores dos materiais)


def paleta(imgs):
    """As quatro cores de um conjunto (pixels opacos de todas as peças)."""
    px = np.concatenate([im[im[:, :, 3] > 200][:, :3] for im in imgs]).astype(np.uint8)   # BGR
    hsv = cv2.cvtColor(px.reshape(-1, 1, 3), cv2.COLOR_BGR2HSV).reshape(-1, 3).astype(float)
    h, s, v = hsv[:, 0] * 2, hsv[:, 1] / 255, hsv[:, 2] / 255
    rgb = px[:, ::-1].astype(float)
    ouro = (h > 18) & (h < 52) & (s > 0.35) & (v > 0.4)
    vivo = (s > 0.45) & (v > 0.55) & ~ouro
    # brilho: o mais vivo e claro (fora o dourado)
    if vivo.sum() > 30:
        cand = rgb[vivo]
        k = np.argsort(-(s[vivo] * v[vivo]))[:max(30, int(vivo.sum() * 0.25))]
        brilho = np.median(cand[k], 0)
    else:
        brilho = np.array([120, 200, 255.0])
    # acabamento: dourado/bronze, ou prata (claro e pouco saturado)
    if ouro.sum() > 0.01 * len(px):
        acab = np.median(rgb[ouro], 0)
    else:
        prata = (s < 0.18) & (v > 0.55)
        acab = np.median(rgb[prata], 0) if prata.sum() > 20 else np.array([180, 180, 190.0])
    # principal: o grupo mais comum entre os meio-tons; escuro: o grupo escuro
    meio = (v > 0.16) & ~ouro & ~(vivo & (v > 0.75))
    Z = rgb[meio].astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
    _, lab, cen = cv2.kmeans(Z, 4, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    cont = np.bincount(lab.ravel(), minlength=4)
    sat = np.array([np.ptp(c) / max(c.max(), 1) for c in cen])
    # prefere um grupo com cor (a do conjunto) se ele for grande o bastante
    nota = cont * (0.5 + sat)
    principal = cen[int(np.argmax(nota))]
    escuro_px = rgb[(v > 0.05) & (v < 0.25)]
    escuro = np.median(escuro_px, 0) if len(escuro_px) > 20 else principal * 0.35
    return dict(principal=lin(principal), escuro=lin(escuro), acabamento=lin(acab), brilho=lin(brilho),
                srgb=dict(principal=[int(x) for x in principal], escuro=[int(x) for x in escuro], acabamento=[int(x) for x in acab], brilho=[int(x) for x in brilho]))


def main():
    out = {}
    for nv in NIVEIS:
        pasta = os.path.join(ORIG, f'Armaduras_Level_{nv}')
        man = os.path.join(pasta, f'MANIFESTO_level_{nv}.csv')
        if not os.path.exists(man):
            print('falta', os.path.relpath(man, RAIZ))
            return 1
        linhas = list(csv.DictReader(open(man, encoding='utf-8-sig'), delimiter=';'))
        for prefixo, cls in CLASSES.items():
            sub = [l for l in linhas if l['pasta'].startswith(prefixo)]
            if not sub:
                print(f'nível {nv}: sem {prefixo}')
                continue
            pecas, imgs = {}, []
            for l in sub:
                arq = os.path.join(pasta, l['pasta'], l['arquivo'])
                if not os.path.exists(arq):
                    print('falta', os.path.relpath(arq, RAIZ))
                    continue
                vaga = VAGAS[l['peca'].split()[0]]
                im = cv2.imread(arq, cv2.IMREAD_UNCHANGED)
                imgs.append(im)
                pecas[vaga] = dict(nome=l['peca'], imagem=os.path.relpath(arq, RAIZ).replace(os.sep, '/'), revisar=l.get('revisar') or None)
            P = paleta(imgs)
            out.setdefault(cls, {})[str(nv)] = dict(pasta=os.path.relpath(os.path.join(pasta, sub[0]['pasta']), RAIZ).replace(os.sep, '/'), pecas=pecas, **P)
            print(f"{cls:12s} {nv:3d}: {len(pecas)} peças · principal {P['srgb']['principal']} escuro {P['srgb']['escuro']} acabamento {P['srgb']['acabamento']} brilho {P['srgb']['brilho']}")
    with open(SAIDA, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print('gravado', os.path.relpath(SAIDA, RAIZ))
    return 0


if __name__ == '__main__':
    sys.exit(main())
