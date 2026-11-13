#!/usr/bin/env python3
"""ECLIPSE ZERO · Texturas em alta resolução das estruturas (nível "Máxima" da qualidade de textura)

As estruturas convertidas (js/assets/estruturas/<id>.js) levam as texturas embutidas em 512–1024 px,
o que roda em qualquer aparelho. Este script tira as MESMAS texturas, na resolução de origem do GLB
enviado (2048 px na maioria, 4096 nas que vieram assim), direto da fonte (o arquivo do Meshy), e grava
em assets/tex_hd/<id>_{cor,mat,nrm}.webp. A UV é a mesma (a redução no Blender preserva a UV da fonte
e só reduz as imagens), então o jogo troca a textura sem mexer na malha.
O índice js/assets/estruturas/hd.js diz ao jogo quais peças têm a versão HD e em que lado. Quem
decide quando usar é o jogo (opção "Texturas" das configurações, com orçamento de memória de vídeo).

Uso: python3 tools/texturas_hd.py [ids…] [--max 4096] [--qualidade 86]
"""
import argparse
import json
import os
import struct
import sys

import cv2
import numpy as np

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REL = os.path.join(RAIZ, 'assets', 'models', 'estruturas', 'estruturas.json')
SAIDA = os.path.join(RAIZ, 'assets', 'tex_hd')
INDICE = os.path.join(RAIZ, 'js', 'assets', 'estruturas', 'hd.js')
# peças cuja textura foi alterada depois da redução (o forro e o tesouro dentro dos baús): a fonte não serve
PULAR = ('bau_',)


def imagens(caminho):
    """Mapas do primeiro material do GLB (só as imagens; a geometria pode estar em Draco): BGR"""
    with open(caminho, 'rb') as f:
        if f.read(4) != b'glTF':
            return None
        f.read(8)
        n, _ = struct.unpack('<II', f.read(8))
        J = json.loads(f.read(n))
        n2, _ = struct.unpack('<II', f.read(8))
        B = f.read(n2)

    def img(info):
        if not info:
            return None
        t = J['textures'][info['index']]
        src = t.get('source')
        if src is None:   # (EXT_texture_webp e afins)
            src = next(iter((t.get('extensions') or {}).values()), {}).get('source')
        im = J['images'][src]
        bv = J['bufferViews'][im['bufferView']]
        o = bv.get('byteOffset', 0)
        return cv2.imdecode(np.frombuffer(B[o:o + bv['byteLength']], np.uint8), cv2.IMREAD_UNCHANGED)

    M = (J.get('materials') or [{}])[0]
    P = M.get('pbrMetallicRoughness', {})
    tira3 = lambda a: a[..., :3] if a is not None and a.ndim == 3 and a.shape[2] == 4 else a
    return {'cor': tira3(img(P.get('baseColorTexture'))), 'mr': tira3(img(P.get('metallicRoughnessTexture'))),
            'nrm': tira3(img(M.get('normalTexture'))), 'emi': tira3(img(M.get('emissiveTexture')))}


def gravar(img, caminho, lado, q):
    if img.shape[0] != lado or img.shape[1] != lado:
        img = cv2.resize(img, (lado, lado), interpolation=cv2.INTER_AREA if img.shape[0] > lado else cv2.INTER_CUBIC)
    ok, b = cv2.imencode('.webp', img, [cv2.IMWRITE_WEBP_QUALITY, q])
    with open(caminho + '.parte', 'wb') as f:
        f.write(b.tobytes())
    os.replace(caminho + '.parte', caminho)
    return len(b)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ids', nargs='*')
    ap.add_argument('--max', type=int, default=4096)
    ap.add_argument('--qualidade', type=int, default=86)
    a = ap.parse_args()
    rel = json.load(open(REL, encoding='utf-8'))
    rel = rel if isinstance(rel, list) else rel.get('estruturas', rel.get('itens', []))
    os.makedirs(SAIDA, exist_ok=True)
    try:
        hd = json.loads(open(INDICE, encoding='utf-8').read().split('=', 1)[1].rsplit(';', 1)[0])
    except Exception:
        hd = {}
    total = 0
    for r in rel:
        i = r.get('id')
        if not i or (a.ids and i not in a.ids) or not r.get('aprovada') or i.startswith(PULAR) or i.endswith('_tampa'):
            continue
        fonte = os.path.join(RAIZ, r.get('fonte_original') or r['fonte'])
        if not os.path.exists(fonte):
            print(f'{i}: fonte ausente ({os.path.relpath(fonte, RAIZ)})'); continue
        try:
            m = imagens(fonte)
        except Exception as e:
            print(f'{i}: não li as imagens da fonte ({e})'); continue
        if not m or m['cor'] is None:
            print(f'{i}: fonte sem textura de cor'); continue
        lado = min(a.max, max(m['cor'].shape[:2]))
        lado = 1 << int(np.log2(lado))   # potência de 2 (mipmaps)
        if lado <= int(r.get('lado', 1024)):
            print(f'{i}: a fonte ({lado}px) não é maior que a do jogo'); continue
        cor = m['cor']
        nrm = m['nrm'] if m['nrm'] is not None else np.full(cor.shape, (255, 128, 128), np.uint8)
        mr = m['mr'] if m['mr'] is not None else np.full(cor.shape, (0, 200, 255), np.uint8)
        em = m['emi'].max(2) if m['emi'] is not None else np.zeros(mr.shape[:2], np.uint8)
        if em.shape != mr.shape[:2]:
            em = cv2.resize(em, (mr.shape[1], mr.shape[0]))
        mat = np.dstack([em, mr[..., 1], mr[..., 0]])   # (como em tools/importar_prop.py: R metal, G aspereza, B emissão)
        b = sum(gravar(img, os.path.join(SAIDA, f'{i}_{k}.webp'), lado, a.qualidade if k == 'cor' else a.qualidade + 4) for k, img in (('cor', cor), ('mat', mat), ('nrm', nrm)))
        hd[i] = lado
        total += b
        print(f'{i}: {lado}px, {b // 1024} KB')
    with open(INDICE, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n// ECLIPSE ZERO · Estruturas com textura em alta resolução (GERADO por tools/texturas_hd.py — não editar)\n"
                "// id → lado (px) das texturas em assets/tex_hd/<id>_{cor,mat,nrm}.webp; usadas no nível \"Máxima\"/\"Alta\"\n"
                f"const ESTRUTURAS_HD = {json.dumps(hd, sort_keys=True, separators=(',', ':'))};\n")
    print(f'{len(hd)} estruturas com textura HD; {total // 2**20} MB gravados agora')


if __name__ == '__main__':
    sys.exit(main())
