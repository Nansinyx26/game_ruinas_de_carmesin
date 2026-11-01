"""Converte uma criatura feita no Blender (GLB com esqueleto próprio, pele e animações) para o jogo.

Lê o GLB exportado por tools/blender/criaturas/<espécie>.py (assets/Creatures/...) e grava
js/assets/criaturas/<id>.js (carregado sob demanda por js/mundo/criaturas3d.js):
  ossos      nome, pai e a pose de repouso local (posição e giro) nos eixos do jogo
  peles      malha com pele no formato do motor (o mesmo das malhas do Kael: posição, normal e UV
             em inteiros, até 4 ossos por vértice), e as matrizes de ligação inversas por osso
  animações  cada animação do GLB (pelo nome), amostrada a 30 quadros por segundo: posição e
             quatérnio local de cada osso que se mexe, em inteiros de 16 bits
  texturas   cor (com a oclusão), material (R metal, G aspereza, B emissão) e normais, em WebP
Eixos: glTF (Y para cima, frente +Z) → jogo (+X frente, +Y direita, +Z cima), 34 unidades por metro.

Uso: python3 tools/importar_criatura.py assets/Creatures/Enemies/lobo_raiz/lobo_raiz.glb [--id lobo_raiz] [--tex 1024]
"""
import argparse
import base64
import json
import math
import os
import re
import struct
import sys

import numpy as np
import cv2

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESCALA = 34.0
FPS = 30
C = np.array([[0, 0, 1], [-1, 0, 0], [0, 1, 0]], float)   # linhas: frente, direita, cima do jogo no glTF
TIPOS = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def ler(caminho):
    b = open(caminho, 'rb').read()
    assert b[:4] == b'glTF', 'não é GLB'
    n = struct.unpack_from('<I', b, 12)[0]
    J = json.loads(b[20:20 + n])
    o = 20 + n
    BIN = b''
    if o < len(b):
        n2 = struct.unpack_from('<I', b, o)[0]
        BIN = b[o + 8:o + 8 + n2]
    return J, BIN


def acessor(J, BIN, i):
    A = J['accessors'][i]
    dt, nc, cnt = TIPOS[A['componentType']], NCOMP[A['type']], A['count']
    if 'bufferView' not in A:
        return np.zeros((cnt, nc), dt)
    V = J['bufferViews'][A['bufferView']]
    off = V.get('byteOffset', 0) + A.get('byteOffset', 0)
    tam = np.dtype(dt).itemsize * nc
    passo = V.get('byteStride', tam)
    if passo == tam:
        arr = np.frombuffer(BIN, dt, cnt * nc, off).reshape(cnt, nc)
    else:
        arr = np.stack([np.frombuffer(BIN, dt, nc, off + k * passo) for k in range(cnt)])
    if A.get('normalized'):
        arr = arr.astype(np.float32) / float(np.iinfo(dt).max)
    return arr.copy()


def imagem(J, BIN, tex):
    if tex is None:
        return None
    src = J['textures'][tex['index']]['source']
    V = J['bufferViews'][J['images'][src]['bufferView']]
    raw = BIN[V.get('byteOffset', 0):V.get('byteOffset', 0) + V['byteLength']]
    return cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_UNCHANGED)


def webp(img, lado, q=88):
    if img.shape[0] != lado:
        img = cv2.resize(img, (lado, lado), interpolation=cv2.INTER_AREA)
    ok, b = cv2.imencode('.webp', img, [cv2.IMWRITE_WEBP_QUALITY, q])
    return 'data:image/webp;base64,' + base64.b64encode(b.tobytes()).decode('ascii')


# ------------------------------------------------------------------ matrizes
def quat_mat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def mat_quat(R):
    t = R[0, 0] + R[1, 1] + R[2, 2]
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        q = [(R[2, 1] - R[1, 2]) / s, (R[0, 2] - R[2, 0]) / s, (R[1, 0] - R[0, 1]) / s, 0.25 * s]
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = math.sqrt(1.0 + R[0, 0] - R[1, 1] - R[2, 2]) * 2
        q = [0.25 * s, (R[0, 1] + R[1, 0]) / s, (R[0, 2] + R[2, 0]) / s, (R[2, 1] - R[1, 2]) / s]
    elif R[1, 1] > R[2, 2]:
        s = math.sqrt(1.0 + R[1, 1] - R[0, 0] - R[2, 2]) * 2
        q = [(R[0, 1] + R[1, 0]) / s, 0.25 * s, (R[1, 2] + R[2, 1]) / s, (R[0, 2] - R[2, 0]) / s]
    else:
        s = math.sqrt(1.0 + R[2, 2] - R[0, 0] - R[1, 1]) * 2
        q = [(R[0, 2] + R[2, 0]) / s, (R[1, 2] + R[2, 1]) / s, 0.25 * s, (R[1, 0] - R[0, 1]) / s]
    q = np.array(q)
    return q / np.linalg.norm(q)


def trs(t, q, s):
    M = np.eye(4)
    M[:3, :3] = quat_mat(q) * np.array(s)[None, :]
    M[:3, 3] = t
    return M


def local_no(N):
    if 'matrix' in N:
        return np.array(N['matrix'], float).reshape(4, 4).T
    return trs(N.get('translation', [0, 0, 0]), N.get('rotation', [0, 0, 0, 1]), N.get('scale', [1, 1, 1]))


S4 = np.eye(4)
S4[:3, :3] = C * ESCALA
S4i = np.linalg.inv(S4)


def para_jogo(M):
    """Matriz (4×4) do glTF para os eixos e a escala do jogo: S · M · S⁻¹."""
    return S4 @ M @ S4i


def euler_zyx(R):
    """Ângulos (rx, ry, rz) com R = Rz · Ry · Rx (a convenção do M3.trs do motor)."""
    sy = -R[2, 0]
    ry = math.asin(max(-1.0, min(1.0, sy)))
    if abs(sy) < 0.99999:
        rx = math.atan2(R[2, 1], R[2, 2])
        rz = math.atan2(R[1, 0], R[0, 0])
    else:
        rx = math.atan2(-R[1, 2], R[1, 1])
        rz = 0.0
    return [rx, ry, rz]


# ------------------------------------------------------------------ amostragem das animações
def amostra(S, t):
    """Valor de um canal (tempos, valores, interpolação) no tempo t."""
    T, V, interp = S
    if t <= T[0]:
        return V[0] if interp != 'CUBICSPLINE' else V[1]
    if t >= T[-1]:
        return V[-1] if interp != 'CUBICSPLINE' else V[-2]
    i = int(np.searchsorted(T, t) - 1)
    t0, t1 = T[i], T[i + 1]
    a = (t - t0) / max(t1 - t0, 1e-9)
    if interp == 'STEP':
        return V[i]
    if interp == 'CUBICSPLINE':
        p0, p1 = V[i * 3 + 1], V[(i + 1) * 3 + 1]
        m0, m1 = V[i * 3 + 2] * (t1 - t0), V[(i + 1) * 3] * (t1 - t0)
        a2, a3 = a * a, a * a * a
        return (2 * a3 - 3 * a2 + 1) * p0 + (a3 - 2 * a2 + a) * m0 + (-2 * a3 + 3 * a2) * p1 + (a3 - a2) * m1
    v0, v1 = V[i], V[i + 1]
    if len(v0) == 4:   # quatérnio: nlerp no mesmo hemisfério
        if np.dot(v0, v1) < 0:
            v1 = -v1
        q = v0 * (1 - a) + v1 * a
        return q / np.linalg.norm(q)
    return v0 * (1 - a) + v1 * a


def converter(caminho, ident, lado=1024):
    J, BIN = ler(caminho)
    nos = J['nodes']
    pai = {}
    for i, N in enumerate(nos):
        for c in N.get('children', []):
            pai[c] = i
    malhas = [i for i, N in enumerate(nos) if 'mesh' in N and 'skin' in N]
    assert malhas, 'GLB sem malha com pele'
    skin = J['skins'][nos[malhas[0]]['skin']]
    juntas = skin['joints']
    nome = [nos[j].get('name', f'osso{k}') for k, j in enumerate(juntas)]
    IB = acessor(J, BIN, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)

    def global_(i, loc=None):
        M = (loc or {}).get(i, local_no(nos[i]))
        while i in pai:
            i = pai[i]
            M = (loc or {}).get(i, local_no(nos[i])) @ M
        return M
    # pai de cada osso dentro do esqueleto (o primeiro ancestral que é osso)
    jset = set(juntas)
    paiosso = {}
    for j in juntas:
        k = pai.get(j)
        while k is not None and k not in jset:
            k = pai.get(k)
        paiosso[j] = k
    ordem = []   # pais antes dos filhos
    feito = set()
    def vis(j):
        if j in feito:
            return
        if paiosso[j] is not None:
            vis(paiosso[j])
        feito.add(j)
        ordem.append(j)
    for j in juntas:
        vis(j)

    def locais(loc=None):
        """Matriz local (no jogo) de cada osso em relação ao osso pai (ou ao mundo, para a raiz)."""
        out = {}
        for j in juntas:
            G = global_(j, loc)
            if paiosso[j] is not None:
                G = np.linalg.inv(global_(paiosso[j], loc)) @ G
            out[j] = para_jogo(G)
        return out
    L0 = locais()
    ossos = []
    for j in ordem:
        M = L0[j]
        R = M[:3, :3]
        sc = np.linalg.norm(R, axis=0)
        ossos.append(dict(n=nos[j].get('name'), pai=nos[paiosso[j]].get('name') if paiosso[j] is not None else None,
                          p=[round(float(v), 4) for v in M[:3, 3]], r=[round(v, 5) for v in euler_zyx(R / sc[None, :])], s=[round(float(v), 4) for v in sc]))
    inv = {}
    for k, j in enumerate(juntas):
        M = para_jogo(IB[k])
        inv[nome[k]] = [round(float(v), 5) for v in M[:3, :].reshape(-1)]

    # malhas com pele: o LOD 0 ("corpo") e, se houver, os LODs 1–3 ("corpo_LOD1"…) no mesmo esqueleto
    def ler_malha(no):
        prim = J['meshes'][nos[no]['mesh']]['primitives'][0]
        A = prim['attributes']
        V = (acessor(J, BIN, A['POSITION']).astype(float) @ C.T) * ESCALA
        N = acessor(J, BIN, A['NORMAL']).astype(float) @ C.T
        N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9
        UV = acessor(J, BIN, A['TEXCOORD_0']).astype(float)
        JI = acessor(J, BIN, A['JOINTS_0']).astype(int)
        W = acessor(J, BIN, A['WEIGHTS_0']).astype(float)
        W = W / np.maximum(W.sum(1, keepdims=True), 1e-9)
        F = acessor(J, BIN, prim['indices']).reshape(-1, 3).astype(int)[:, [0, 2, 1]]   # a troca de eixos espelha: desvira os triângulos
        assert len(V) < 65536, 'malha grande demais para um pedaço (65535 vértices)'
        return prim, V, N, UV, JI, W, F
    def nome_lod(no):
        n = nos[no].get('name') or 'corpo'
        m = re.search(r'_LOD(\d)$', n)
        return ('corpo_LOD' + m.group(1)) if m else 'corpo'
    malhas.sort(key=lambda no: nome_lod(no))
    lod0 = next((no for no in malhas if nome_lod(no) == 'corpo'), malhas[0])
    prim, V, N, UV, JI, W, F = ler_malha(lod0)
    q = 32000.0 / max(np.abs(V).max(), 1e-6)
    peles = []
    for no in malhas:
        if nos[no].get('skin') != nos[malhas[0]].get('skin'):
            continue
        _, Vm, Nm, UVm, JIm, Wm, Fm = ler_malha(no)
        reg = bytearray()
        for v in range(len(Vm)):
            x, y, z = (int(round(max(-32767, min(32767, a * q)))) for a in Vm[v])
            nx, ny, nz = (int(round(a * 32767)) for a in Nm[v])
            u, w = (int(round(np.clip(a, 0, 1) * 65535)) for a in UVm[v])
            reg += struct.pack('<hhhhhhHH', x, y, z, nx, ny, nz, u, w)
        pw = bytearray()
        for v in range(len(Vm)):
            ws = [int(round(a * 255)) for a in Wm[v]]
            ws[int(np.argmax(ws))] += 255 - sum(ws)
            pw += bytes([int(a) for a in JIm[v]]) + bytes([max(0, min(255, a)) for a in ws])
        peles.append(dict(nome=nome_lod(no), ossos=nome, a=base64.b64encode(bytes(reg)).decode(), w=base64.b64encode(bytes(pw)).decode(),
                          i=base64.b64encode(Fm.astype('<u2').tobytes()).decode(), tris=int(len(Fm))))

    # animações (amostradas a 30 q/s), só os ossos que se mexem
    clipes = {}
    for an in J.get('animations', []):
        canais = {}
        tmax = 0.0
        for ch in an['channels']:
            sm = an['samplers'][ch['sampler']]
            T = acessor(J, BIN, sm['input']).reshape(-1).astype(float)
            Vv = acessor(J, BIN, sm['output']).astype(float)
            canais[(ch['target']['node'], ch['target']['path'])] = (T, Vv, sm.get('interpolation', 'LINEAR'))
            tmax = max(tmax, float(T[-1]))
        mexem = sorted({n for (n, _) in canais if n in jset}, key=lambda j: juntas.index(j))
        if not mexem:
            continue
        nq = max(2, int(round(tmax * FPS)) + 1)
        P_ = np.zeros((nq, len(mexem), 3))
        Q_ = np.zeros((nq, len(mexem), 4))
        for f in range(nq):
            t = f / FPS
            loc = {}
            for j in set(mexem) | {pj for pj in paiosso.values() if pj is not None}:
                Nn = nos[j]
                tt = canais.get((j, 'translation'))
                rr = canais.get((j, 'rotation'))
                ss = canais.get((j, 'scale'))
                loc[j] = trs(amostra(tt, t) if tt else Nn.get('translation', [0, 0, 0]), amostra(rr, t) if rr else Nn.get('rotation', [0, 0, 0, 1]),
                             amostra(ss, t) if ss else Nn.get('scale', [1, 1, 1]))
            Lt = locais(loc)
            for k, j in enumerate(mexem):
                M = Lt[j]
                R = M[:3, :3] / np.linalg.norm(M[:3, :3], axis=0)[None, :]
                qq = mat_quat(R)
                if f and np.dot(qq, Q_[f - 1, k]) < 0:
                    qq = -qq
                P_[f, k] = M[:3, 3]
                Q_[f, k] = qq
        pq = 32000.0 / max(np.abs(P_).max(), 1e-6)
        clipes[an['name']] = dict(n=nq, d=round((nq - 1) / FPS, 4), ossos=[nos[j].get('name') for j in mexem], pq=round(pq, 4),
                                  p=base64.b64encode(np.round(P_ * pq).astype('<i2').tobytes()).decode(),
                                  q=base64.b64encode(np.round(Q_ * 32767).astype('<i2').tobytes()).decode())

    # texturas
    mat = J['materials'][prim.get('material', 0)]
    pb = mat.get('pbrMetallicRoughness', {})
    cor = imagem(J, BIN, pb.get('baseColorTexture'))
    orm = imagem(J, BIN, pb.get('metallicRoughnessTexture'))
    nrm = imagem(J, BIN, mat.get('normalTexture'))
    emi = imagem(J, BIN, mat.get('emissiveTexture'))
    lado = min(lado, cor.shape[0])
    if cor.ndim == 3 and cor.shape[2] == 4:
        cor = cor[..., :3]
    em = emi[..., :3].max(2) if emi is not None else np.zeros(orm.shape[:2], np.uint8)
    em = cv2.resize(em, (orm.shape[1], orm.shape[0])) if em.shape != orm.shape[:2] else em
    matmap = np.dstack([em, orm[..., 1], orm[..., 0]])   # (BGR) R metal, G aspereza, B emissão
    ext = V.max(0) - V.min(0)
    base = V[V[:, 2] < V[:, 2].min() + ext[2] * 0.25]
    raio = float(np.percentile(np.hypot(base[:, 0] - V[:, 0].mean(), base[:, 1]), 75)) if len(base) else 12.0
    info = dict(v=1, id=ident, q=round(q, 4), ossos=ossos, inv=inv, peles=peles, clipes=clipes, fps=FPS,
                w=round(float(ext[0]), 1), d=round(float(ext[1]), 1), h=round(float(ext[2]), 1), r=round(raio, 1),
                tc=webp(cor, lado), tm=webp(matmap, lado, 92), tn=webp(nrm[..., :3] if nrm.ndim == 3 else nrm, lado, 92),
                src=os.path.relpath(caminho, RAIZ).replace(os.sep, '/'))
    return info


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('glb')
    ap.add_argument('--id')
    ap.add_argument('--tex', type=int, default=1024)
    ap.add_argument('--base', help='pelagem de outra criatura já convertida: grava só as texturas (malha, esqueleto e animações da base)')
    a = ap.parse_args()
    ident = a.id or os.path.splitext(os.path.basename(a.glb))[0]
    info = converter(os.path.join(RAIZ, a.glb) if not os.path.isabs(a.glb) else a.glb, ident, a.tex)
    pasta = os.path.join(RAIZ, 'js', 'assets', 'criaturas')
    os.makedirs(pasta, exist_ok=True)
    destino = os.path.join(pasta, f'{ident}.js')
    if a.base:
        # confere que é mesmo a mesma malha/esqueleto/animações da base antes de cortar os dados
        with open(os.path.join(pasta, f'{a.base}.js'), encoding='utf-8') as f:
            txt = f.read()
        B0 = json.loads(txt[txt.index('= {') + 2:txt.rindex('};') + 1])
        assert [o['n'] for o in B0['ossos']] == [o['n'] for o in info['ossos']], 'esqueleto diferente da base'
        assert sorted(B0['clipes']) == sorted(info['clipes']), 'animações diferentes da base'
        assert [p_['tris'] for p_ in B0['peles']] == [p_['tris'] for p_ in info['peles']], 'malha diferente da base'
        slim = dict(v=1, id=ident, base=a.base, tc=info['tc'], tm=info['tm'], tn=info['tn'], w=info['w'], d=info['d'], h=info['h'], r=info['r'], src=info['src'])
        with open(destino, 'w', encoding='utf-8') as f:
            f.write("'use strict';\n// ECLIPSE ZERO · Pelagem de criatura do Blender (tools/blender/criaturas/), convertida por tools/importar_criatura.py;\n"
                    f'// não edite à mão. Só as texturas: a malha, o esqueleto e as animações vêm de {a.base}.js (js/mundo/criaturas3d.js).\n')
            f.write('var CRIATURAS3D = typeof CRIATURAS3D !== "undefined" ? CRIATURAS3D : {};\n')
            f.write(f'CRIATURAS3D[{json.dumps(ident)}] = ' + json.dumps(slim, separators=(',', ':')) + ';\n')
            f.write(f"if (typeof Criaturas3D !== 'undefined') Criaturas3D.carregado({json.dumps(ident)});\n")
        print(f'{ident}: pelagem de {a.base} (mesma malha, esqueleto e {len(info["clipes"])} animações), {os.path.getsize(destino) // 1024} KB → {os.path.relpath(destino, RAIZ)}')
        return
    with open(destino, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n// ECLIPSE ZERO · Criatura do Blender (tools/blender/criaturas/), convertida por tools/importar_criatura.py;\n"
                '// não edite à mão. Carregada sob demanda por js/mundo/criaturas3d.js.\n')
        f.write('var CRIATURAS3D = typeof CRIATURAS3D !== "undefined" ? CRIATURAS3D : {};\n')
        f.write(f'CRIATURAS3D[{json.dumps(ident)}] = ' + json.dumps(info, separators=(',', ':')) + ';\n')
        f.write(f"if (typeof Criaturas3D !== 'undefined') Criaturas3D.carregado({json.dumps(ident)});\n")
    kb = os.path.getsize(destino) // 1024
    anims = ', '.join('%s %ss' % (k, v['d']) for k, v in info['clipes'].items())
    tris = sum(len(base64.b64decode(p['i'])) // 6 for p in info['peles'])
    print(f"{ident}: {len(info['ossos'])} ossos, {tris} triângulos, {len(info['clipes'])} animações ({anims}), "
          f"{info['w']}×{info['d']}×{info['h']} unidades, raio {info['r']}, {kb} KB → {os.path.relpath(destino, RAIZ)}")


if __name__ == '__main__':
    main()
