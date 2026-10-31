"""Cenário feito no Blender → motor do jogo: js/assets/props3d.js (PROPS3D).

Os objetos de cenário das cidades são modelados por scripts do Blender (tools/blender/asset_*.py,
tipo 'prop' ou 'modular') e exportados em assets/models/cenario/<id>.glb (glTF, +Y para cima,
metros, um material com atlas de cor, metal/aspereza e emissão). Este conversor lê cada GLB e
grava a versão do jogo. Com as texturas assadas pelo kit do Blender (cor com oclusão, ORM, normais,
emissão): 14 bytes por canto de triângulo — posição int16 ×3, normal int8 ×3, UV uint16 ×2 — e as
texturas embutidas em WebP (cor; material = R metal, G aspereza, B emissão; mapa de normais), 1024
px nos objetos grandes e 512 nos pequenos. Sem elas, o formato das armas (js/heroes/armas3d.js):
14 bytes por canto — posição, normal, cor RGB amostrada, material (1 metal) e emissão.
Eixos do jogo: +X frente, +Y direita, +Z cima; 1 m = 34 unidades (o Kael, ~1,8 m, tem ~62).
Também grava o raio de colisão (pela base) e a altura de cada objeto.

Grupos: 'cenario' (as cidades: assets/models/cenario/ → js/assets/props3d.js, const PROPS3D) e
'natureza' (o kit medieval e natural das florestas, tools/blender/natureza.py:
assets/models/natureza/ → js/assets/natureza3d.js, que junta os objetos ao PROPS3D; texturas de
512 px).

Uso (na pasta do projeto):
  python3 tools/importar_prop.py                   # todos os .glb de assets/models/cenario/
  python3 tools/importar_prop.py torre_neon        # só alguns (os outros ficam como estão)
  python3 tools/importar_prop.py --grupo natureza  # o kit da natureza
"""
import argparse
import base64
import glob
import json
import os
import re
import struct
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importar_modelo import amostra, ler_glb  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRUPOS = {'cenario': (os.path.join('assets', 'models', 'cenario'), os.path.join('js', 'assets', 'props3d.js'), 1024),
          'natureza': (os.path.join('assets', 'models', 'natureza'), os.path.join('js', 'assets', 'natureza3d.js'), 512)}
ESCALA = 34.0
R_JOGO = np.array([[0, 0, 1], [-1, 0, 0], [0, 1, 0]], float)   # linhas: frente, direita, cima do jogo no glTF


def data_url(img, lado, qualidade=88):
    """Imagem (BGR) → data URL WebP no lado pedido (o jogo roda de file://: tudo embutido no .js)."""
    if img.shape[0] != lado or img.shape[1] != lado:
        img = cv2.resize(img, (lado, lado), interpolation=cv2.INTER_AREA)
    ok, b = cv2.imencode('.webp', img, [cv2.IMWRITE_WEBP_QUALITY, qualidade])
    return 'data:image/webp;base64,' + base64.b64encode(b.tobytes()).decode('ascii')


def converter(caminho, lado_max=1024):
    V, UV, F, mapas = ler_glb(caminho)
    V = V @ R_JOGO.T * ESCALA
    F = F[:, [0, 2, 1]]                      # a troca de eixos espelha: desvira os triângulos
    N = mapas.get('normais')
    if N is None:
        raise SystemExit(f'{caminho}: sem normais')
    N = N @ R_JOGO.T
    N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9
    V[:, 2] -= V[:, 2].min()                 # base no chão
    c = F.reshape(-1)
    uv = UV[c]
    cor = amostra(mapas['cor'], uv)[:, ::-1] if mapas.get('cor') is not None else np.full((len(c), 3), 160.0)   # BGR → RGB
    met = amostra(mapas['mr'], uv)[:, 0] / 255 if mapas.get('mr') is not None else np.zeros(len(c))           # glTF: azul = metal
    emi = amostra(mapas['emi'], uv).max(1) / 255 if mapas.get('emi') is not None else np.zeros(len(c))
    lim = np.abs(V).max()
    q = 32000 / max(lim, 1e-6)
    ext = V.max(0) - V.min(0)
    # Com as texturas assadas do Blender (cor, ORM, normais): posição, normal e UV por canto, e as
    # texturas embutidas; sem elas, a cor amostrada por canto (o formato das armas)
    tex = mapas.get('cor') is not None and mapas.get('nrm') is not None and mapas.get('mr') is not None
    reg = bytearray()
    for i, v in enumerate(c):
        x, y, z = (int(round(a * q)) for a in V[v])
        nx, ny, nz = (int(round(a * 127)) for a in N[v])
        if tex:
            u, w = (int(round(np.clip(a, 0, 1) * 65535)) for a in UV[v])
            reg += struct.pack('<hhhbbbxHH', x, y, z, nx, ny, nz, u, w)
        else:
            r, g, b = (int(np.clip(a, 0, 255)) for a in cor[i])
            reg += struct.pack('<hhhbbbBBBBB', x, y, z, nx, ny, nz, r, g, b, 1 if met[i] > 0.5 else 0, int(round(np.clip(emi[i], 0, 1) * 255)))
    base = V[V[:, 2] < V[:, 2].max() * 0.15 + 0.5]
    raio = float(np.percentile(np.hypot(base[:, 0], base[:, 1]), 90)) if len(base) else 10.0
    e = np.clip(emi, 0, 1)
    glow = None
    if (e > 0.3).any():
        cg = cor[e > 0.3].mean(0)
        glow = ','.join(str(int(v)) for v in cg)
    info = dict(n=int(len(F)), q=round(float(q), 4), w=round(float(ext[0]), 1), d=round(float(ext[1]), 1), h=round(float(ext[2]), 1),
                r=round(raio, 1), glow=glow, src=os.path.relpath(caminho, RAIZ).replace(os.sep, '/'))
    kb_tex = 0
    if tex:
        # textura no jogo: 1024 nos objetos grandes (mais de 4 m), 512 nos pequenos
        lado = min(lado_max, 1024 if ext.max() / ESCALA > 4 else 512)
        if lado_max < 1024 and ext.max() / ESCALA < 1.6:
            lado = 256                                     # (kit da natureza: as peças pequenas, de chão)
        mr = mapas['mr']                                   # BGR: B metal, G aspereza, R oclusão
        em = mapas['emi'].max(2) if mapas.get('emi') is not None else np.zeros(mr.shape[:2], np.uint8)
        if em.shape != mr.shape[:2]:
            em = cv2.resize(em, (mr.shape[1], mr.shape[0]))
        mat = np.dstack([em, mr[..., 1], mr[..., 0]])      # motor (RGB): R metal, G aspereza, B emissão → BGR
        info.update(uv=1, lado=lado, tc=data_url(mapas['cor'], lado), tm=data_url(mat, lado, 92), tn=data_url(mapas['nrm'], lado, 92))
        kb_tex = sum(len(info[k]) for k in ('tc', 'tm', 'tn')) // 1024
    info['a'] = base64.b64encode(bytes(reg)).decode('ascii')
    print(f"{os.path.basename(caminho)}: {len(F)} triângulos, {ext.round(1).tolist()} unidades, raio {raio:.1f}, emissivos {float((e > 0.3).mean()):.0%}, "
          f"{len(reg) // 1024} KB de malha" + (f", texturas {info['lado']}px {kb_tex} KB" if tex else ', cor por canto'))
    return info


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('ids', nargs='*', help='ids (nome do .glb sem extensão); padrão: todos')
    ap.add_argument('--grupo', default='cenario', choices=sorted(GRUPOS))
    a = ap.parse_args()
    PASTA, SAIDA, lado_max = GRUPOS[a.grupo]
    junta = a.grupo != 'cenario'
    arqs = sorted(glob.glob(os.path.join(RAIZ, PASTA, '*.glb')))
    if a.ids:
        arqs = [x for x in arqs if os.path.splitext(os.path.basename(x))[0] in a.ids]
    destino = os.path.join(RAIZ, SAIDA)
    atuais = {}
    if os.path.exists(destino):
        m = re.search(r'Object\.assign\(PROPS3D, (\{.*\})\);' if junta else r'PROPS3D = (\{.*\});', open(destino, encoding='utf-8').read(), re.S)
        if m:
            atuais = json.loads(m.group(1))
    for arq in arqs:
        atuais[os.path.splitext(os.path.basename(arq))[0]] = converter(arq, lado_max)
    with open(destino, 'w', encoding='utf-8') as f:
        if junta:
            f.write("'use strict';\n// ECLIPSE ZERO · Kit medieval e natural das florestas, modelado no Blender (tools/blender/natureza.py →\n"
                    '// assets/models/natureza/*.glb) e convertido por tools/importar_prop.py --grupo natureza; não edite à mão.\n'
                    '// Junta os objetos ao PROPS3D (js/assets/props3d.js). Uso: js/mundo/cenario.js e js/mundo/natureza3d.js\n')
            f.write('Object.assign(PROPS3D, ' + json.dumps(dict(sorted(atuais.items())), separators=(',', ':')) + ');\n')
        else:
            f.write("'use strict';\n// ECLIPSE ZERO · Cenário 3D das cidades, modelado no Blender (tools/blender/asset_*.py → assets/models/cenario/*.glb)\n"
                    '// e convertido por tools/importar_prop.py; não edite à mão. Uso: js/mundo/cenario.js\n')
            f.write('const PROPS3D = ' + json.dumps(dict(sorted(atuais.items())), separators=(',', ':')) + ';\n')
    print('gravado', SAIDA, os.path.getsize(destino) // 1024, 'KB,', len(atuais), 'objetos')


if __name__ == '__main__':
    main()
