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
  python3 tools/importar_prop.py --grupo estruturas [ids]   # estruturas enviadas (um .js por objeto + índice)
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
          'natureza': (os.path.join('assets', 'models', 'natureza'), os.path.join('js', 'assets', 'natureza3d.js'), 512),
          'arquitetura': (os.path.join('assets', 'models', 'arquitetura'), os.path.join('js', 'assets', 'arquitetura3d.js'), 1024)}
# Objetos que não saem do Blender, por grupo: id → GLB (caminho a partir da raiz do projeto)
#   caixotes: a pilha de caixotes enviada (assets/estruturas_ambiente/Estruturas_Superficie/item_ambiente_md_1.glb,
#   183 mil triângulos) pelo remesh do Meshy (lote de teste, docs/topologia/LOTE_MESHY.md: 4.893 triângulos),
#   já devolvido à escala da fonte
EXTRAS = {'natureza': {'caixotes': os.path.join('assets', '_retopo', 'meshy', 'item_ambiente_md_1_alinhado.glb')}}
ESCALA = 34.0
R_JOGO = np.array([[0, 0, 1], [-1, 0, 0], [0, 1, 0]], float)   # linhas: frente, direita, cima do jogo no glTF


def data_url(img, lado, qualidade=88):
    """Imagem (BGR) → data URL WebP no lado pedido (o jogo roda de file://: tudo embutido no .js)."""
    if img.shape[0] != lado or img.shape[1] != lado:
        img = cv2.resize(img, (lado, lado), interpolation=cv2.INTER_AREA)
    ok, b = cv2.imencode('.webp', img, [cv2.IMWRITE_WEBP_QUALITY, qualidade])
    return 'data:image/webp;base64,' + base64.b64encode(b.tobytes()).decode('ascii')


def converter(caminho, lado_max=1024, escala=None, indexado=False, chao=True):
    """escala: unidades do jogo por unidade do arquivo (padrão: metros → 34); indexado: vértices
    únicos + índices (as estruturas enviadas, malhas grandes: ~40% menor que um canto por vez)."""
    V, UV, F, mapas = ler_glb(caminho)
    if indexado:
        # estruturas enviadas: mapas que faltam viram neutros (as de Draco trazem só cor e metal/aspereza)
        if mapas.get('cor') is not None and mapas.get('nrm') is None:
            mapas['nrm'] = np.full(mapas['cor'].shape, (255, 128, 128), np.uint8)          # BGR: normal (0, 0, 1)
        if mapas.get('cor') is not None and mapas.get('mr') is None:
            mapas['mr'] = np.full(mapas['cor'].shape, (0, 200, 255), np.uint8)             # BGR: sem metal, aspereza 0,78
    V = V @ R_JOGO.T * (ESCALA if escala is None else escala)
    F = F[:, [0, 2, 1]]                      # a troca de eixos espelha: desvira os triângulos
    N = mapas.get('normais')
    if N is None:
        raise SystemExit(f'{caminho}: sem normais')
    N = N @ R_JOGO.T
    N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9
    if chao:
        V[:, 2] -= V[:, 2].min()             # base no chão (as peças móveis, como a tampa do baú, ficam com a origem do arquivo)
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
    if indexado and tex:
        for v in range(len(V)):
            x, y, z = (int(round(a * q)) for a in V[v])
            nx, ny, nz = (int(round(a * 127)) for a in N[v])
            u, w = (int(round(np.clip(a, 0, 1) * 65535)) for a in UV[v])
            reg += struct.pack('<hhhbbbxHH', x, y, z, nx, ny, nz, u, w)
        c = []                                                     # (sem o laço por canto abaixo)
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
    # marcas do prédio (tools/blender/arquitetura.py grava <id>.json: portas e janelas em metros,
    # eixos do Blender): no espaço do jogo, para a porta de entrada e a luz das janelas
    lado_json = os.path.splitext(caminho)[0] + '.json'
    if os.path.exists(lado_json):
        M = json.load(open(lado_json, encoding='utf-8'))
        conv = lambda p: [round(-p[1] * ESCALA, 1), round(-p[0] * ESCALA, 1), round(p[2] * ESCALA, 1)]   # as marcas já vêm com a base em 0
        info['marcas'] = {k: [dict(m, p=conv(m['p'])) for m in v] for k, v in M.items() if k in ('portas', 'janelas')}
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
    if indexado and tex:
        i32 = len(V) > 65535
        info['ix'] = base64.b64encode(F.reshape(-1).astype('<u4' if i32 else '<u2').tobytes()).decode('ascii')
        if i32:
            info['i32'] = 1
    print(f"{os.path.basename(caminho)}: {len(F)} triângulos, {ext.round(1).tolist()} unidades, raio {raio:.1f}, emissivos {float((e > 0.3).mean()):.0%}, "
          f"{len(reg) // 1024} KB de malha" + (f", texturas {info['lado']}px {kb_tex} KB" if tex else ', cor por canto'))
    return info


def estruturas(ids):
    """Grupo 'estruturas' (as estruturas e plantas enviadas, reduzidas por tools/blender/cenario/estruturas.py):
    um arquivo por objeto (js/assets/estruturas/<id>.js, carregado sob demanda por js/mundo/estruturas.js) e o
    índice leve com as medidas de todos (js/assets/estruturas/indice.js, no index.html). Só as aprovadas na
    redução; tamanho real pela tabela tools/estruturas/escalas.json; malha indexada."""
    pasta = os.path.join(RAIZ, 'assets', 'models', 'estruturas')
    saida = os.path.join(RAIZ, 'js', 'assets', 'estruturas')
    os.makedirs(saida, exist_ok=True)
    rel = json.load(open(os.path.join(pasta, 'estruturas.json'), encoding='utf-8'))
    esc = json.load(open(os.path.join(RAIZ, 'tools', 'estruturas', 'escalas.json'), encoding='utf-8'))
    p_idx = os.path.join(saida, 'indice.js')
    indice = {}
    if os.path.exists(p_idx):
        m = re.search(r'ESTRUTURAS_INDICE = (\{.*\});', open(p_idx, encoding='utf-8').read(), re.S)
        if m:
            indice = json.loads(m.group(1))
    for r in rel:
        id_ = r['id']
        if ids and id_ not in ids:
            continue
        if not r.get('aprovada') or 'glb' not in r:
            print(f"{id_}: fora (reprovada na redução: {'; '.join(r.get('falhas') or [r.get('erro', '')])})")
            indice.pop(id_, None)
            continue
        def fator(i, rr):
            E = esc.get(i) if any(c in esc.get(i, {}) for c in ('altura', 'lado', 'como')) else dict(esc['_tipos'].get(rr['tipo'], {'altura': 4}), **esc.get(i, {}))   # (a medida da peça manda; o padrão do tipo só sem ela)
            if 'como' in E:      # a mesma escala de outra peça (a tampa do baú: a do corpo)
                ref = next(x for x in rel if x['id'] == E['como'])
                return fator(E['como'], ref)[0], E
            dx, dy, dz = rr['dims']                  # Blender: z para cima
            return (E['altura'] * ESCALA / dz if 'altura' in E else E['lado'] * ESCALA / max(dx, dy)), E
        k, E = fator(id_, r)
        info = converter(os.path.join(RAIZ, r['glb']), 1024 if r['tipo'] in ('estrutura', 'arvore') else 512, escala=k, indexado=True, chao=r.get('base_no_chao', True))
        info.update(tipo=r['tipo'], estilo=r['estilo'])
        if r.get('dobradica'):   # a dobradiça da tampa (Blender → jogo: x = −y, y = −x, z = z)
            d = r['dobradica']
            info['dob'] = [round(-d[1] * k, 2), round(-d[0] * k, 2), round(d[2] * k, 2)]
        js = os.path.join(saida, f'{id_}.js')
        with open(js, 'w', encoding='utf-8') as f:
            f.write("'use strict';\n// ECLIPSE ZERO · Estrutura enviada '" + id_ + "' (" + r['fonte'].replace('\n', ' ') + ')\n'
                    '// reduzida por tools/blender/cenario/estruturas.py e convertida por tools/importar_prop.py --grupo estruturas;\n'
                    '// não edite à mão. Carregada sob demanda por js/mundo/estruturas.js.\n')
            f.write('Object.assign(PROPS3D, ' + json.dumps({id_: info}, separators=(',', ':')) + ');\n')
            f.write(f"if (typeof Estruturas !== 'undefined') Estruturas.chegou('{id_}');\n")
        indice[id_] = dict(nome=E.get('nome', id_), tipo=r['tipo'], estilo=r['estilo'], w=info['w'], d=info['d'], h=info['h'], r=info['r'],
                           kb=os.path.getsize(js) // 1024)
    with open(p_idx, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n// ECLIPSE ZERO · Índice das estruturas enviadas (medidas no jogo, para pôr e colidir antes de o modelo chegar).\n"
                '// Gerado por tools/importar_prop.py --grupo estruturas; não edite à mão. Uso: js/mundo/estruturas.js\n')
        f.write('const ESTRUTURAS_INDICE = ' + json.dumps(dict(sorted(indice.items())), ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('gravado', os.path.relpath(p_idx, RAIZ), len(indice), 'estruturas,', sum(v['kb'] for v in indice.values()) // 1024, 'MB nos arquivos')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('ids', nargs='*', help='ids (nome do .glb sem extensão); padrão: todos')
    ap.add_argument('--grupo', default='cenario', choices=sorted(GRUPOS) + ['estruturas'])
    a = ap.parse_args()
    if a.grupo == 'estruturas':
        estruturas(a.ids)
        return
    PASTA, SAIDA, lado_max = GRUPOS[a.grupo]
    junta = a.grupo != 'cenario'
    arqs = {os.path.splitext(os.path.basename(x))[0]: x for x in sorted(glob.glob(os.path.join(RAIZ, PASTA, '*.glb')))}
    arqs.update({k: os.path.join(RAIZ, v) for k, v in EXTRAS.get(a.grupo, {}).items()})
    if a.ids:
        arqs = {k: x for k, x in arqs.items() if k in a.ids}
    destino = os.path.join(RAIZ, SAIDA)
    atuais = {}
    if os.path.exists(destino):
        m = re.search(r'Object\.assign\(PROPS3D, (\{.*\})\);' if junta else r'PROPS3D = (\{.*\});', open(destino, encoding='utf-8').read(), re.S)
        if m:
            atuais = json.loads(m.group(1))
    for pid, arq in arqs.items():
        atuais[pid] = converter(arq, lado_max)
    with open(destino, 'w', encoding='utf-8') as f:
        if a.grupo == 'arquitetura':
            f.write("'use strict';\n// ECLIPSE ZERO · Kit de arquitetura medieval da cidade (tools/blender/arquitetura.py → assets/models/arquitetura/*.glb),\n"
                    '// convertido por tools/importar_prop.py --grupo arquitetura; não edite à mão. Carregado sob demanda por\n'
                    '// js/mundo/bairro.js (prédios do Bairro da Muralha e a mobília dos interiores); junta os objetos ao PROPS3D.\n')
        elif junta:
            f.write("'use strict';\n// ECLIPSE ZERO · Kit medieval e natural das florestas, modelado no Blender (tools/blender/natureza.py →\n"
                    '// assets/models/natureza/*.glb) e convertido por tools/importar_prop.py --grupo natureza; não edite à mão.\n'
                    '// Junta os objetos ao PROPS3D (js/assets/props3d.js). Uso: js/mundo/cenario.js e js/mundo/natureza3d.js\n')
        if junta:
            f.write('Object.assign(PROPS3D, ' + json.dumps(dict(sorted(atuais.items())), separators=(',', ':')) + ');\n')
            if a.grupo == 'arquitetura':
                f.write("if (typeof Bairro !== 'undefined') Bairro.carregado();\n")
        else:
            f.write("'use strict';\n// ECLIPSE ZERO · Cenário 3D das cidades, modelado no Blender (tools/blender/asset_*.py → assets/models/cenario/*.glb)\n"
                    '// e convertido por tools/importar_prop.py; não edite à mão. Uso: js/mundo/cenario.js\n')
            f.write('const PROPS3D = ' + json.dumps(dict(sorted(atuais.items())), separators=(',', ':')) + ';\n')
    print('gravado', SAIDA, os.path.getsize(destino) // 1024, 'KB,', len(atuais), 'objetos')


if __name__ == '__main__':
    main()
