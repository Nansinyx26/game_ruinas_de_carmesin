"""Importa um modelo 3D detalhado (OBJ com MTL e textura, ou GLB) para o motor do jogo.

O casco visual das 4 vistas (tools/gerar_kael3d.py) não consegue reproduzir mechas de
cabelo, o rosto de verdade, cintos e placas separados: para isso é preciso uma malha
modelada (por exemplo, exportada do Tripo, do Meshy ou do Blender). Este importador converte
essa malha para o mesmo formato usado pelo jogo (js/assets/<id>3d.js, versão 2: malhas com
pele no esqueleto do Kael, textura e mapa de material), sem trocar o motor:
  1. Leitura: OBJ (v, vt, vn, f; textura do map_Kd do MTL) ou GLB (glTF 2.0 binário: malhas,
     nós, cor base, e metal/aspereza quando existir).
  2. Eixos e escala: o modelo é girado para os eixos do jogo (+X frente, +Y lado direito do
     personagem, +Z para cima), apoiado no chão e escalado para a altura do personagem.
  3. Esqueleto: silhuetas de frente/lados/costas desenhadas a partir da própria malha → marcos
     do corpo (ombros, mãos, quadril, pescoço, tornozelos; tools/gerar_aliado3d.py) → ossos
     e proporções do esqueleto (MODELS3D.kael.build(props)).
  4. Pele: cada vértice recebe o osso da sua região (cabeça, tronco, braço, antebraço, mão,
     coxa, canela, pé e, com casaco, as 6 abas e as barras); os pesos são suavizados pela
     malha (vizinhos) para as juntas dobrarem sem quebrar; até 4 ossos por vértice.
  5. Malha grande (mais que --max-tri): soldada e reduzida (erro quadrático), com UV nova
     (xatlas); cor, metal/aspereza e normais são reassados da malha original — cada texel da
     reduzida busca o ponto mais próximo da original — e o detalhe da geometria perdida e o
     mapa de normais do arquivo vão para um mapa de normais no espaço tangente (o motor monta
     o referencial pelas derivadas de tela, sem atributo de tangente).
  6. Kael: as mãos da malha saem e entram as luvas com dedos articulados do jogo (fecham no
     cabo da espada; --maos-do-modelo mantém as da malha) e o símbolo luminoso das costas da
     ficha é acrescentado como peça emissiva (--sem-simbolo tira).
  7. Saída: textura (lado potência de 2), mapa de material (do glTF quando houver; senão
     tirado da cor), mapa de normais e as malhas em pedaços de até 65535 vértices.

O Kael do jogo vem de assets/modelos/kael_meshy.glb (gerado no Meshy a partir da arte):
  python3 tools/importar_modelo.py assets/modelos/kael_meshy.glb --id kael

Uso (na pasta do projeto):
  python3 tools/importar_modelo.py modelo.glb --id kael
  python3 tools/importar_modelo.py modelo.obj --id kael --cima +y --frente +z --altura 62.1
Opções: --cima/--frente: eixo do arquivo que aponta para cima / para onde o personagem olha
(padrão do glTF: +y e +z); --casaco (abas animadas, padrão para o Kael); --sem-casaco;
--tex 2048; --max-tri 40000 (reduz e reassa malhas maiores); --saida arquivo.js.
Com --id kael o arquivo gerado substitui js/assets/kael3d.js (o Kael do jogo passa a usar a
malha importada; as luvas modeladas ficam de fora, porque a malha já tem as mãos). Para os
aliados, grava HERO3D.<id> no mesmo formato (js/models/hero_tex3d.js lê as duas versões).
Armaduras vestidas em jogo (os GLB de assets/modelos/armaduras/, personagens completos com a
armadura): --armadura <nome> grava ARMOR3D[<nome>] em js/assets/armaduras/<nome>.js, carregado
só quando a armadura é equipada (js/heroes/armaduras3d.js):
  python3 tools/importar_modelo.py assets/modelos/armaduras/lyra/lyra_n1.glb --id lyra --armadura lyra_n1 --tex 1024 --max-tri 16000
Requer numpy, scipy, opencv-python-headless, fast-simplification, xatlas e node; GLB com malha
comprimida (KHR_draco_mesh_compression) pede também o DracoPy (pip install DracoPy).
"""
import argparse
import base64
import json
import os
import struct
import sys

import cv2
import numpy as np
from scipy import ndimage, sparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from escultor3d import RAIZ, VIEWS, Q, codificar_pele, esqueleto, mapa_material, projecao, rot_entre, unit  # noqa: E402
from gerar_aliado3d import marcos, ossos_e_proporcoes  # noqa: E402

PX = 10.0          # pixels por unidade nas silhuetas desenhadas a partir da malha


# ============================================================ leitura
def ler_obj(path):
    """OBJ → (posições [n,3], uv [n,2] com v para baixo, triângulos [m,3], {'cor': textura BGR ou None})."""
    vs, vts, faces, mtl, usado = [], [], [], None, None
    base = os.path.dirname(path)
    with open(path, encoding='utf-8', errors='replace') as f:
        for ln in f:
            p = ln.split()
            if not p:
                continue
            if p[0] == 'v':
                vs.append([float(x) for x in p[1:4]])
            elif p[0] == 'vt':
                vts.append([float(x) for x in p[1:3]])
            elif p[0] == 'f':
                idx = []
                for c in p[1:]:
                    q = c.split('/')
                    vi = int(q[0])
                    ti = int(q[1]) if len(q) > 1 and q[1] else 0
                    idx.append((vi - 1 if vi > 0 else len(vs) + vi, ti - 1 if ti > 0 else (len(vts) + ti if ti else -1)))
                for i in range(1, len(idx) - 1):
                    faces.append((idx[0], idx[i], idx[i + 1]))
            elif p[0] == 'mtllib':
                mtl = os.path.join(base, ' '.join(p[1:]))
            elif p[0] == 'usemtl' and usado is None:
                usado = ' '.join(p[1:])
    vs, vts = np.array(vs, float), np.array(vts, float) if vts else np.zeros((1, 2))
    # vértice = par (posição, uv): as costuras da UV viram vértices separados
    chave, V, UV, F = {}, [], [], []
    for tri in faces:
        t = []
        for vi, ti in tri:
            k = (vi, ti)
            if k not in chave:
                chave[k] = len(V)
                V.append(vs[vi])
                uv = vts[ti] if ti >= 0 else (0.5, 0.5)
                UV.append((uv[0], 1.0 - uv[1]))           # OBJ: v para cima; textura do jogo: para baixo
            t.append(chave[k])
        F.append(t)
    tex = None
    if mtl and os.path.exists(mtl):
        atual, mapas = None, {}
        with open(mtl, encoding='utf-8', errors='replace') as f:
            for ln in f:
                p = ln.split()
                if p and p[0] == 'newmtl':
                    atual = ' '.join(p[1:])
                elif p and p[0].lower() == 'map_kd' and atual:
                    mapas[atual] = os.path.join(base, p[-1])
        arq = mapas.get(usado) or next(iter(mapas.values()), None)
        if len(mapas) > 1:
            print('aviso: o MTL tem', len(mapas), 'texturas; usada a do primeiro material:', arq)
        if arq and os.path.exists(arq):
            tex = cv2.imread(arq, cv2.IMREAD_COLOR)
    return np.array(V, float), np.array(UV, float), np.array(F, np.int64), {'cor': tex}


def ler_glb(path):
    """GLB (glTF 2.0) → (posições, uv, triângulos, mapas): mapas = {'cor', 'mr' (metal/aspereza),
    'nrm' (normais no espaço tangente), 'normais' (normais dos vértices, se o arquivo tiver)}."""
    raw = open(path, 'rb').read()
    magic, ver, _ = struct.unpack_from('<4sII', raw, 0)
    if magic != b'glTF' or ver != 2:
        raise SystemExit('não é um GLB (glTF 2.0 binário)')
    off, js, binc = 12, None, b''
    while off < len(raw):
        n, tipo = struct.unpack_from('<I4s', raw, off)
        dado = raw[off + 8: off + 8 + n]
        if tipo == b'JSON':
            js = json.loads(dado.decode('utf-8'))
        elif tipo == b'BIN\x00':
            binc = dado
        off += 8 + n
    TIPOS = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
    LARG = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

    def acc(i):
        a = js['accessors'][i]
        bv = js['bufferViews'][a['bufferView']]
        dt, k = np.dtype(TIPOS[a['componentType']]), LARG[a['type']]
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        passo = bv.get('byteStride', dt.itemsize * k)
        arr = np.ndarray((a['count'], k), dt, binc, o, (passo, dt.itemsize)).astype(np.float64)
        if a.get('normalized'):
            arr /= np.iinfo(dt).max
        return arr

    def imagem(ti):
        if ti is None:
            return None
        tx = js['textures'][ti['index']]
        src = tx.get('source', tx.get('extensions', {}).get('EXT_texture_webp', {}).get('source'))   # WebP (EXT_texture_webp)
        im = js['images'][src]
        bv = js['bufferViews'][im['bufferView']]
        b = binc[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
        return cv2.imdecode(np.frombuffer(b, np.uint8), cv2.IMREAD_COLOR)

    def trs(nd):
        if 'matrix' in nd:
            return np.array(nd['matrix'], float).reshape(4, 4).T
        t, r, s = nd.get('translation', [0, 0, 0]), nd.get('rotation', [0, 0, 0, 1]), nd.get('scale', [1, 1, 1])
        x, y, z, w = r
        R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                      [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                      [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        M = np.eye(4)
        M[:3, :3] = R * np.array(s)
        M[:3, 3] = t
        return M

    V, UV, F, NV, mapas = [], [], [], [], {}
    cena = js['scenes'][js.get('scene', 0)]

    def visita(i, P):
        nd = js['nodes'][i]
        M = P @ trs(nd)
        if 'mesh' in nd:
            for pr in js['meshes'][nd['mesh']]['primitives']:
                if pr.get('mode', 4) != 4:
                    continue
                draco = pr.get('extensions', {}).get('KHR_draco_mesh_compression')
                if draco:
                    # malha comprimida (KHR_draco_mesh_compression, ex.: exportada do Blender): DracoPy
                    import DracoPy
                    bv = js['bufferViews'][draco['bufferView']]
                    d = DracoPy.decode(binc[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']])
                    pos = np.asarray(d.points, np.float64).reshape(-1, 3)
                    tc = getattr(d, 'tex_coord', None)
                    uv = np.asarray(tc, np.float64).reshape(-1, 2) if tc is not None and len(tc) else np.full((len(pos), 2), 0.5)
                    ind = np.asarray(d.faces, np.int64).ravel()
                    nd_ = getattr(d, 'normals', None)
                    nv = np.asarray(nd_, np.float64).reshape(-1, 3) if nd_ is not None and len(nd_) else np.zeros((len(pos), 3))
                else:
                    pos = acc(pr['attributes']['POSITION'])
                    uv = acc(pr['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in pr['attributes'] else np.full((len(pos), 2), 0.5)
                    ind = acc(pr['indices']).astype(np.int64).ravel() if 'indices' in pr else np.arange(len(pos))
                    nv = acc(pr['attributes']['NORMAL']) if 'NORMAL' in pr['attributes'] else np.zeros((len(pos), 3))
                base = sum(len(v) for v in V)
                V.append((np.c_[pos, np.ones(len(pos))] @ M.T)[:, :3])
                NV.append(nv @ np.linalg.inv(M[:3, :3]))          # normais: inversa transposta
                UV.append(uv)
                F.append(ind.reshape(-1, 3) + base)
                if 'cor' not in mapas and 'material' in pr:
                    mt = js['materials'][pr['material']]
                    pbr = mt.get('pbrMetallicRoughness', {})
                    mapas['cor'] = imagem(pbr.get('baseColorTexture'))
                    mapas['mr'] = imagem(pbr.get('metallicRoughnessTexture'))
                    mapas['nrm'] = imagem(mt.get('normalTexture'))
        for k in nd.get('children', []):
            visita(k, M)
    for i in cena['nodes']:
        visita(i, np.eye(4))
    NV = np.concatenate(NV)
    if np.abs(NV).sum() > 0:
        mapas['normais'] = NV
    return np.concatenate(V), np.concatenate(UV), np.concatenate(F), mapas


# ============================================================ eixos, silhuetas e esqueleto
EIXOS = {'+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1]}


def para_o_jogo(V, cima, frente, altura):
    """Gira para os eixos do jogo (+X frente, +Y lado direito do personagem, +Z cima), apoia no
    chão, centra e escala para a altura. O lado direito de quem olha para 'frente' com 'cima'
    para cima é frente × cima (no espaço do arquivo)."""
    c, f = np.array(EIXOS[cima], float), np.array(EIXOS[frente], float)
    d = np.cross(f, c)
    R = np.stack([f, d, c])                       # linhas: eixos do jogo no espaço do arquivo
    P = V @ R.T
    P[:, 2] -= P[:, 2].min()
    P *= altura / P[:, 2].max()
    meio = (P[:, 2] > 0.45 * altura) & (P[:, 2] < 0.7 * altura)
    P[:, 0] -= np.median(P[meio, 0])
    P[:, 1] -= np.median(P[meio, 1])
    return P, R


def silhuetas(V, F, H):
    """Máscaras das 4 vistas (frente, lado direito, costas, lado esquerdo) desenhadas da malha,
    no mesmo formato das vistas da arte (topo = cabeça, PX pixels por unidade)."""
    HOR = {'front': lambda p: -p[:, 1], 'back': lambda p: p[:, 1], 'sideR': lambda p: p[:, 0], 'sideL': lambda p: -p[:, 0]}
    masks = {}
    for v in VIEWS:
        h = HOR[v](V)
        W = int((h.max() - h.min()) * PX) + 40
        Hh = int(H * PX) + 40
        col = (h - h.min()) * PX + 20
        row = (H - V[:, 2]) * PX + 20
        m = np.zeros((Hh, W), np.uint8)
        pts = np.round(np.stack([col, row], 1) * 4).astype(np.int32)      # 2 bits de subpixel
        for t in pts[F]:                          # um triângulo por vez (fillPoly com vários usa par/ímpar)
            cv2.fillConvexPoly(m, t, 1, lineType=cv2.LINE_8, shift=2)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        masks[v] = ndimage.binary_fill_holes(m.astype(bool))
    return masks


def marcos_robustos(masks, P, H):
    """Marcos do corpo para modelos de braços abertos ("A") ou caídos ao lado do corpo: com os
    braços caídos, as mãos e a axila saem do vão entre o braço e o tronco na vista de frente
    (linhas com três trechos: braço, tronco, braço); sem vão, vale marcos() (pose "A")."""
    k = marcos(masks, P, H)
    m, p = masks['front'], P['front']
    row = lambda z: int(round(p['top'] + (H - z) * p['s']))
    yof = lambda c: -(c - p['c']) / p['s']
    linhas = []
    for z in np.arange(0.36 * H, 0.76 * H, 0.1):
        lin = m[min(max(row(z), 0), m.shape[0] - 1)]
        d = np.diff(np.concatenate([[0], lin.astype(int), [0]]))
        cs = list(zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0] - 1))
        # braço | tronco | braço: o trecho do meio contém o centro, os de fora são estreitos
        ok = len(cs) >= 3 and any(a <= p['c'] <= b for a, b in cs[1:-1]) and all((b - a) / p['s'] < 0.13 * H for a, b in (cs[0], cs[-1]))
        linhas.append((z, ok, yof((cs[-1][0] + cs[-1][1]) / 2) if ok else 0, yof((cs[0][0] + cs[0][1]) / 2) if ok else 0))
    # o maior trecho contínuo de linhas com o vão (falhas de até 0,5 unidade)
    melhor, atual, falha = [], [], 0
    for ln in linhas:
        if ln[1]:
            atual.append(ln)
            falha = 0
        else:
            falha += 1
            if falha > 5:
                if len(atual) > len(melhor):
                    melhor = atual
                atual = []
    if len(atual) > len(melhor):
        melhor = atual
    if len(melhor) * 0.1 < 0.1 * H:
        print('braços em "A" (sem vão entre braço e tronco)')
        return k
    vao = np.array([(z, yr, yl) for z, _, yr, yl in melhor])
    z0, z1 = vao[:, 0].min(), vao[:, 0].max()
    # braços em "A" também deixam vão; a diferença é a inclinação: em "A" o braço se afasta do
    # corpo conforme desce (|y| cresce quando z diminui), caído ele desce quase reto
    incl = np.polyfit(vao[:, 0], (np.abs(vao[:, 1]) + np.abs(vao[:, 2])) / 2, 1)[0]
    if incl < -0.3:
        print(f'braços em "A" (inclinação {incl:.2f})')
        return k
    print(f'braços caídos: vão de z={z0:.1f} a {z1:.1f} (inclinação {incl:.2f})')
    baixo = vao[vao[:, 0] < z0 + 0.6]
    k['mao'] = {1: np.array([0.3, float(np.mean(baixo[:, 2])), z0]), -1: np.array([0.3, float(np.mean(baixo[:, 1])), z0])}
    k['axila'] = z1
    ombro_y = float(np.mean(np.abs(vao[vao[:, 0] > z1 - 1.0][:, 1:])))
    k['ombro'] = {sg: np.array([0.0, sg * max(ombro_y - 0.04 * H, 0.08 * H), z1 + 0.04 * H]) for sg in (1, -1)}
    return k


def ajustar_braços(V, k, bones, props):
    """Os marcos vêm da vista de frente: a profundidade (x) das juntas do braço é medida na
    própria malha — mediana dos vértices em volta de cada junta (as mãos de muitos modelos
    ficam bem à frente do corpo; com o eixo errado, a mão gira fora do lugar ao baixar o braço)."""
    L = lambda a, b: float(np.linalg.norm(b - a))

    def x_em(p, r=1.6):
        perto = np.hypot(V[:, 1] - p[1], V[:, 2] - p[2]) < r
        return float(np.median(V[perto, 0])) if perto.sum() > 8 else p[0]
    for nm in 'RL':
        sh, cot = bones['arm' + nm + 'u'][:2]
        tip, pun = bones['arm' + nm + 'f'][1], k['punho'][nm]
        for q in (sh, cot, pun, tip):
            q[0] = x_em(q)
        bones['arm' + nm + 'u'] = (sh, cot, bones['arm' + nm + 'u'][2])
        bones['arm' + nm + 'f'] = (cot, tip, bones['arm' + nm + 'f'][2])
    props['AUP'] = round(np.mean([L(*bones['arm' + n + 'u'][:2]) for n in 'RL']), 3)
    props['AFO'] = round(np.mean([L(bones['arm' + n + 'f'][0], k['punho'][n]) for n in 'RL']), 3)


def suavizar_pesos(W, F, n, it=6):
    """Pesos de pele suavizados pela malha: média com os vizinhos (it vezes)."""
    i = np.concatenate([F[:, 0], F[:, 1], F[:, 2], F[:, 1], F[:, 2], F[:, 0]])
    j = np.concatenate([F[:, 1], F[:, 2], F[:, 0], F[:, 0], F[:, 1], F[:, 2]])
    A = sparse.coo_matrix((np.ones(len(i)), (i, j)), shape=(n, n)).tocsr()
    A.data[:] = 1
    A = A + sparse.eye(n)
    D = sparse.diags(1 / np.asarray(A.sum(axis=1)).ravel())
    S = D @ A
    for _ in range(it):
        W = S @ W
    return W


def dist_seg(P, a, b):
    ab = b - a
    t = np.clip(((P - a) @ ab) / (ab @ ab + 1e-12), 0, 1)
    return np.linalg.norm(P - (a + np.outer(t, ab)), axis=1)


# ============================================================ redução e textura reassada
def soldar(V, F, tol=1e-6):
    """Une os vértices na mesma posição (o arquivo separa os vértices nas costuras da UV).
    Devolve (vértices, triângulos, índice soldado de cada vértice original)."""
    q = np.round(V / tol).astype(np.int64)
    _, idx, inv = np.unique(q, axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel()
    F2 = inv[F]
    F2 = F2[(F2[:, 0] != F2[:, 1]) & (F2[:, 1] != F2[:, 2]) & (F2[:, 0] != F2[:, 2])]
    return V[idx], F2, inv


def reduzir(V, F, alvo):
    """Malha soldada e simplificada (erro quadrático) até 'alvo' triângulos, sem vértices soltos."""
    import fast_simplification
    Vw, Fw, _ = soldar(V, F)
    V2, F2 = fast_simplification.simplify(Vw.astype(np.float32), Fw.astype(np.int32), target_reduction=max(0.0, 1 - alvo / len(Fw)))
    F2 = F2.astype(np.int64)
    F2 = F2[(F2[:, 0] != F2[:, 1]) & (F2[:, 1] != F2[:, 2]) & (F2[:, 0] != F2[:, 2])]
    usados = np.unique(F2)
    novo = np.full(len(V2), -1, np.int64)
    novo[usados] = np.arange(len(usados))
    return V2[usados].astype(float), novo[F2]


def normais_vertices(V, F):
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    N = np.zeros_like(V)
    for j in range(3):
        np.add.at(N, F[:, j], fn)
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-12)


def gradientes_uv(V, F, UV):
    """Por triângulo: gradiente de u e de v sobre a superfície (vetores no plano do triângulo).
    É o referencial que o shader reconstrói pelas derivadas de tela (R3D_FS_TEX, mapa de normais)."""
    e1, e2 = V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]
    d1, d2 = UV[F[:, 1]] - UV[F[:, 0]], UV[F[:, 2]] - UV[F[:, 0]]
    g11, g12, g22 = np.einsum('ij,ij->i', e1, e1), np.einsum('ij,ij->i', e1, e2), np.einsum('ij,ij->i', e2, e2)
    det = g11 * g22 - g12 * g12
    det = np.where(np.abs(det) < 1e-14, 1e-14, det)
    out = []
    for k in (0, 1):
        a = (g22 * d1[:, k] - g12 * d2[:, k]) / det
        b = (g11 * d2[:, k] - g12 * d1[:, k]) / det
        out.append(a[:, None] * e1 + b[:, None] * e2)
    return out[0], out[1]


def mais_proximo(P, A, B, C):
    """Ponto mais próximo de P em cada triângulo ABC (vetorizado; Ericson): (ponto, bary [.., 3])."""
    dot = lambda x, y: np.sum(x * y, axis=-1)
    ab, ac = B - A, C - A
    ap, bp, cp = P - A, P - B, P - C
    d1, d2, d3, d4, d5, d6 = dot(ab, ap), dot(ac, ap), dot(ab, bp), dot(ac, bp), dot(ab, cp), dot(ac, cp)
    va, vb, vc = d3 * d6 - d5 * d4, d5 * d2 - d1 * d6, d1 * d4 - d3 * d2
    den = va + vb + vc
    den = np.where(np.abs(den) < 1e-20, 1e-20, den)
    v, w = vb / den, vc / den
    bc = np.stack([1 - v - w, v, w], -1)
    sd = lambda x: np.where(np.abs(x) < 1e-20, 1e-20, x)
    t = (d4 - d3) / sd((d4 - d3) + (d5 - d6))
    m = (va <= 0) & ((d4 - d3) >= 0) & ((d5 - d6) >= 0)
    bc = np.where(m[..., None], np.stack([np.zeros_like(t), 1 - t, t], -1), bc)
    t = d2 / sd(d2 - d6)
    m = (vb <= 0) & (d2 >= 0) & (d6 <= 0)
    bc = np.where(m[..., None], np.stack([1 - t, np.zeros_like(t), t], -1), bc)
    m = (d6 >= 0) & (d5 <= d6)
    bc = np.where(m[..., None], np.array([0.0, 0, 1]), bc)
    t = d1 / sd(d1 - d3)
    m = (vc <= 0) & (d1 >= 0) & (d3 <= 0)
    bc = np.where(m[..., None], np.stack([1 - t, t, np.zeros_like(t)], -1), bc)
    m = (d3 >= 0) & (d4 <= d3)
    bc = np.where(m[..., None], np.array([0.0, 1, 0]), bc)
    m = (d1 <= 0) & (d2 <= 0)
    bc = np.where(m[..., None], np.array([1.0, 0, 0]), bc)
    Q = bc[..., 0:1] * A + bc[..., 1:2] * B + bc[..., 2:3] * C
    return Q, bc


def amostra(img, uv):
    """Cor bilinear da imagem nas coordenadas uv (repetidas, v para baixo)."""
    h, w = img.shape[:2]
    x = (np.mod(uv[:, 0], 1.0) * w - 0.5).astype(np.float32)
    y = (np.mod(uv[:, 1], 1.0) * h - 0.5).astype(np.float32)
    n = len(x)
    k = -(-n // 1024) * 1024
    mx, my = np.zeros(k, np.float32), np.zeros(k, np.float32)
    mx[:n], my[:n] = x, y
    out = cv2.remap(img, mx.reshape(-1, 1024), my.reshape(-1, 1024), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    return out.reshape(k, -1)[:n].astype(np.float64)


def reassar(Vh, Fh, UVh, Nh, mapas, VL, FL, NL, lado=2048, K=8):
    """Assa os mapas da malha original (cor, metal/aspereza e normais, com o detalhe da geometria
    que a redução perdeu) numa UV nova da malha reduzida. Cada texel da malha reduzida busca o
    ponto mais próximo da original (preferindo superfícies voltadas para o mesmo lado).
    Devolve (vmap, idx, uv, cor BGR, mr BGR, normais no espaço tangente BGR)."""
    import xatlas
    from scipy.spatial import cKDTree
    from escultor3d import rasterizar
    atlas = xatlas.Atlas()
    atlas.add_mesh(VL.astype(np.float32), FL.astype(np.uint32), NL.astype(np.float32))
    co = xatlas.ChartOptions()
    co.max_iterations = 4
    po = xatlas.PackOptions()
    po.resolution = lado
    po.padding = 3
    po.bilinear = True
    po.bruteForce = True
    atlas.generate(co, po)
    if max(atlas.width, atlas.height) > lado:
        po.texels_per_unit = atlas.texels_per_unit * lado / max(atlas.width, atlas.height) * 0.995
        atlas.generate(co, po)
    vmap, idx, uv = atlas[0]
    vmap, idx = vmap.astype(np.int64), idx.astype(np.int64)
    print('atlas', atlas.width, atlas.height, 'gráficos', atlas.chart_count, 'aproveitamento', round(float(atlas.utilization), 3))
    # posição, normal e triângulo de cada texel (cantos sem índice: o número do triângulo não se mistura)
    cant = idx.ravel()
    Pc, Nc = VL[vmap][cant], NL[vmap][cant]
    tri = np.repeat(np.arange(len(idx)), 3)[:, None].astype(float)
    attr = np.concatenate([Pc, Nc, tri, np.ones((len(cant), 1))], 1)
    buf = np.zeros((lado, lado, 8))
    rasterizar((uv[cant] * lado), np.arange(len(cant)).reshape(-1, 3), attr, lado, lado, buf)
    cheio = buf[:, :, 7] > 0.5
    iy, ix = np.nonzero(cheio)
    p, nl, ti = buf[iy, ix, :3], buf[iy, ix, 3:6], np.round(buf[iy, ix, 6]).astype(np.int64)
    nl /= np.linalg.norm(nl, axis=1, keepdims=True) + 1e-12
    print('texels', len(p))
    # referencial tangente da malha reduzida (gradientes de u e v no triângulo do texel)
    gu, gv = gradientes_uv(VL[vmap], idx, uv)
    # malha original: normais das faces, referencial tangente das faces e árvore dos centros
    A, B, C = Vh[Fh[:, 0]], Vh[Fh[:, 1]], Vh[Fh[:, 2]]
    fn = np.cross(B - A, C - A)
    fn /= np.linalg.norm(fn, axis=1, keepdims=True) + 1e-12
    hu, hv = gradientes_uv(Vh, Fh, UVh)
    arv = cKDTree((A + B + C) / 3)
    cor = np.zeros((len(p), 3))
    mr = np.zeros((len(p), 3))
    nt = np.zeros((len(p), 3))
    temN = mapas.get('nrm') is not None
    for o in range(0, len(p), 60000):
        sl = slice(o, o + 60000)
        P0, N0 = p[sl], nl[sl]
        _, cand = arv.query(P0, k=K)
        Q, bc = mais_proximo(P0[:, None, :], A[cand], B[cand], C[cand])
        d = np.linalg.norm(Q - P0[:, None, :], axis=-1)
        contra = np.einsum('nkj,nj->nk', fn[cand], N0) < 0.0
        j = np.argmin(d + contra * 0.6, axis=1)
        r = np.arange(len(P0))
        f, b = cand[r, j], bc[r, j]
        uvh = np.einsum('nk,nkj->nj', b, UVh[Fh[f]])
        cor[sl] = amostra(mapas['cor'], uvh)
        if mapas.get('mr') is not None:
            mr[sl] = amostra(mapas['mr'], uvh)
        # normal de detalhe: normal suave da original + mapa de normais da original (glTF: verde = −v)
        n = np.einsum('nk,nkj->nj', b, Nh[Fh[f]])
        n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
        if temN:
            tx = amostra(mapas['nrm'], uvh)[:, ::-1] / 127.5 - 1.0       # BGR → RGB
            T = hu[f] - n * np.einsum('ij,ij->i', hu[f], n)[:, None]
            T /= np.linalg.norm(T, axis=1, keepdims=True) + 1e-12
            Bu = -hv[f] - n * np.einsum('ij,ij->i', -hv[f], n)[:, None]
            Bu /= np.linalg.norm(Bu, axis=1, keepdims=True) + 1e-12
            n = T * tx[:, 0:1] + Bu * tx[:, 1:2] + n * tx[:, 2:3]
            n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
        # no referencial da malha reduzida (o mesmo que o shader monta)
        t = ti[sl]
        T = gu[t] - N0 * np.einsum('ij,ij->i', gu[t], N0)[:, None]
        T /= np.linalg.norm(T, axis=1, keepdims=True) + 1e-12
        Bu = -gv[t] - N0 * np.einsum('ij,ij->i', -gv[t], N0)[:, None]
        Bu /= np.linalg.norm(Bu, axis=1, keepdims=True) + 1e-12
        nt[sl] = np.stack([np.einsum('ij,ij->i', n, T), np.einsum('ij,ij->i', n, Bu), np.einsum('ij,ij->i', n, N0)], 1)
    from scipy import ndimage

    def imagem(vals, vazio):
        im = np.zeros((lado, lado, 3))
        im[iy, ix] = vals
        _, (ny_, nx_) = ndimage.distance_transform_edt(~cheio, return_indices=True)
        return im[ny_, nx_]
    nt[:, 2] = np.maximum(nt[:, 2], 0.05)
    nt /= np.linalg.norm(nt, axis=1, keepdims=True)
    nrm = imagem((nt[:, ::-1] + 1) * 127.5, 0)          # RGB → BGR
    return vmap, idx, uv, imagem(cor, 0), imagem(mr, 0) if mapas.get('mr') is not None else None, nrm


# ============================================================ principal
def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('arquivo')
    ap.add_argument('--id', default='kael')
    ap.add_argument('--altura', type=float, default=None)
    ap.add_argument('--cima', default='+y', choices=list(EIXOS))
    ap.add_argument('--frente', default='+z', choices=list(EIXOS))
    ap.add_argument('--casaco', action='store_true', default=None)
    ap.add_argument('--sem-casaco', dest='casaco', action='store_false')
    ap.add_argument('--tex', type=int, default=2048)
    ap.add_argument('--max-tri', type=int, default=40000)
    ap.add_argument('--saida', default=None)
    ap.add_argument('--maos-do-modelo', action='store_true', help='mantém as mãos da malha (sem as luvas articuladas do jogo)')
    ap.add_argument('--sem-simbolo', action='store_true', help='não acrescenta o símbolo luminoso das costas (Kael)')
    ap.add_argument('--armadura', default=None, help='grava ARMOR3D[<nome>] (armadura vestida em jogo, js/heroes/armaduras3d.js) em vez do modelo do herói')
    a = ap.parse_args()
    H = a.altura or {'kael': 62.1, 'lyra': 58.5, 'drakos': 66.5, 'sera': 60.0, 'orion': 63.0}.get(a.id, 62.1)
    casaco = a.casaco if a.casaco is not None else a.id in ('kael', 'lyra', 'sera', 'orion')

    ler = ler_glb if a.arquivo.lower().endswith('.glb') else ler_obj
    V, UV, F, mapas = ler(a.arquivo)
    print(f'lido {a.arquivo}: {len(V)} vértices, {len(F)} triângulos, mapas {[k for k, v in mapas.items() if v is not None]}')
    if mapas.get('cor') is None:
        mapas['cor'] = np.full((256, 256, 3), 40, np.uint8)
        print('aviso: sem textura; cor cinza escura')
    V, Rx = para_o_jogo(V, a.cima, a.frente, H)
    # os eixos do jogo são espelhados em relação aos do arquivo (+Y é a direita do personagem):
    # a troca inverte a ordem dos vértices dos triângulos, então as faces voltam a ser desviradas
    if np.linalg.det(Rx) < 0:
        F = F[:, [0, 2, 1]]
    Nh = mapas['normais'] @ Rx.T if mapas.get('normais') is not None else None
    if Nh is not None:
        Nh /= np.linalg.norm(Nh, axis=1, keepdims=True) + 1e-12
        # faces e normais do arquivo concordam? (algumas ferramentas exportam a ordem invertida)
        Vs, Fs, inv0 = soldar(V, F)
        if np.einsum('ij,ij->i', normais_vertices(Vs, Fs)[inv0], Nh).mean() < 0:
            print('ordem dos triângulos invertida no arquivo: corrigida')
            F = F[:, [0, 2, 1]]
    else:
        Vs, Fs, inv0 = soldar(V, F)
        Nh = normais_vertices(Vs, Fs)[inv0]
    if len(F) > a.max_tri:
        # malha grande: reduzida, com UV nova e os mapas reassados da original (o detalhe da
        # geometria perdida vai para o mapa de normais)
        Vr, Fr = reduzir(V, F, a.max_tri)
        Nr = normais_vertices(Vr, Fr)
        print('reduzida para', len(Fr), 'triângulos, reassando os mapas…')
        vmap, Fo, Uo, cor, mr, nrm = reassar(V, F, UV, Nh, mapas, Vr, Fr, Nr, a.tex)
        o2r = vmap
    else:
        Vr, Fr, o2r = soldar(V, F)
        Nr = normais_vertices(Vr, Fr)
        Fo, Uo, cor, mr, nrm = F, UV, mapas['cor'], mapas.get('mr'), mapas.get('nrm')
    V, F = Vr, Fr                                   # malha soldada: esqueleto e pesos

    # ---- esqueleto a partir das silhuetas da própria malha
    masks = silhuetas(V, F, H)
    P = projecao(masks, H, centro=(0.3, 0.42))
    k = marcos_robustos(masks, P, H)
    bones, props = ossos_e_proporcoes(k, H)
    ajustar_braços(V, k, bones, props)
    props['HAIR'] = round(0.06 * H, 3)
    Wn = esqueleto(props)
    print('proporções', props)

    # ---- regiões (osso dominante de cada vértice)
    n = len(V)
    X, Y, Z = V[:, 0], V[:, 1], V[:, 2]
    z_pesc = k['pescoco'] - 0.02 * H
    z_cint = k['quadril_z'] + 0.6
    nomes = ['head', 'torso', 'hips']
    for nm in 'RL':
        nomes += ['arm' + nm + 'u', 'arm' + nm + 'f', 'hand' + nm, 'thigh' + nm, 'shin' + nm, 'foot' + nm]
    ABAS = {'cFR': 64, 'cSR': 107, 'cBR': 147, 'cBL': -147, 'cSL': -107, 'cFL': -64}
    if casaco:
        nomes += list(ABAS) + [c + '2' for c in ABAS]
    cabelo = a.id != 'drakos'                 # o Drakos usa elmo (os chifres não balançam)
    if cabelo:
        nomes.append('hair')
    ix = {nm: i for i, nm in enumerate(nomes)}
    rot = np.full(n, ix['torso'])
    rot[Z < z_cint] = ix['hips']
    # pernas: perto dos ossos das pernas, abaixo da cintura
    dl = {kk: dist_seg(V, bones[kk][0], bones[kk][1]) for kk in bones}
    pernas = [kk for kk in bones if kk[:4] in ('thig', 'shin', 'foot')]
    perto = np.argmin(np.stack([dl[kk] for kk in pernas]), axis=0)
    dmin = np.min(np.stack([dl[kk] for kk in pernas]), axis=0)
    # com casaco, só o que está bem perto do osso é perna (o pano em volta é das abas)
    raio_perna = 0.055 * H if casaco else 0.12 * H
    perna = (Z < z_cint + 1.0) & (dmin < raio_perna)
    if casaco:
        # botas e caneleiras: abaixo do joelho a perna é mais grossa (botas de armadura). O que está
        # perto do osso nessa altura é perna, não a barra do casaco; senão a bota balança com a aba
        # e vira uma cunha comprida no chão ao andar
        z_joelho = props['ANK'] + props['LSH']
        z_bota = props['ANK'] + 0.07 * H
        r_baixo = np.interp(Z, [z_bota, z_joelho], [0.09 * H, raio_perna])
        perna |= (Z < z_joelho) & (dmin < r_baixo)
    for i, kk in enumerate(pernas):
        rot[perna & (perto == i)] = ix[kk]
    if casaco:
        # casaco: o que está abaixo da cintura e longe das pernas, em 6 abas e barras
        ang = np.degrees(np.arctan2(Y, X))
        aba = np.argmin(np.stack([np.abs((ang - c + 180) % 360 - 180) for c in ABAS.values()]), axis=0)
        fora = (Z < z_cint) & ~perna & (np.abs(ang) > 25)
        for i, c in enumerate(ABAS):
            dobra = Wn[c + '2'][2, 3]
            rot[fora & (aba == i) & (Z >= dobra)] = ix[c]
            rot[fora & (aba == i) & (Z < dobra)] = ix[c + '2']
    # braços: fora da largura do tronco (vista de frente), entre o ombro e a mão
    pf, mf = P['front'], masks['front']
    linhas = {}
    for zz in np.unique(np.round(Z * 2) / 2):
        r = int(round(pf['top'] + (H - min(zz, k['axila'] - 0.5)) * pf['s']))
        lin = mf[min(max(r, 0), mf.shape[0] - 1)]
        d = np.diff(np.concatenate([[0], lin.astype(int), [0]]))
        cs = list(zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0] - 1))
        meio = [(x0, x1) for x0, x1 in cs if x0 <= pf['c'] <= x1] or ([min(cs, key=lambda t: abs((t[0] + t[1]) / 2 - pf['c']))] if cs else [(pf['c'], pf['c'])])
        linhas[zz] = max(pf['c'] - meio[0][0], meio[0][1] - pf['c']) / pf['s']
    meia = np.array([linhas[zz] for zz in np.round(Z * 2) / 2])
    z_mao = min(k['mao'][1][2], k['mao'][-1][2]) - 0.08 * H
    perto_braco = np.minimum.reduce([dl['arm' + nm + p_] for nm in 'RL' for p_ in 'uf']) < 0.1 * H
    braco = (np.abs(Y) > meia + 0.3) & (Z < k['ombro'][1][2] + 0.03 * H) & (Z > z_mao) & perto_braco
    for nm, sg in (('R', 1), ('L', -1)):
        lado = braco & (np.sign(Y) == sg)
        u, f_ = 'arm' + nm + 'u', 'arm' + nm + 'f'
        pun = k['punho'][nm]
        ax = unit(bones[f_][1] - bones[f_][0])
        alem = ((V - pun) @ ax) > 0                    # depois do punho: a mão
        rot[lado & (dl[u] <= dl[f_])] = ix[u]
        rot[lado & (dl[u] > dl[f_]) & ~alem] = ix[f_]
        rot[lado & (dl[u] > dl[f_]) & alem] = ix['hand' + nm]
    cab = (Z > z_pesc) & (np.hypot(X - 0.0, Y) < 0.13 * H) | (Z > z_pesc + 0.055 * H)
    rot[cab & ~braco] = ix['head']

    # ---- pesos suavizados pela malha (as juntas dobram sem quebrar)
    W = np.zeros((n, len(nomes)))
    W[np.arange(n), rot] = 1
    W = suavizar_pesos(W, F, n, it=5)
    if cabelo:
        # cabelo: o que sai do crânio (mechas, franja, rabo de cavalo, capuz solto) passa aos poucos
        # para o osso 'hair' (raiz na cabeça, ponta solta): balança com o movimento secundário. O
        # rosto (frente e abaixo da testa) fica na cabeça
        hd = W[:, ix['head']]
        sel = hd > 0.5
        if sel.sum() > 20:
            zc = z_pesc + 0.065 * H
            xc = float(np.median(X[sel]))
            d = np.sqrt((X - xc) ** 2 + Y ** 2 + ((Z - zc) * 0.85) ** 2)
            wh = np.clip((d - 0.062 * H) / (0.05 * H), 0, 1)
            rosto = np.clip((X - (xc + 0.015 * H)) / (0.03 * H), 0, 1) * np.clip(((zc + 0.035 * H) - Z) / (0.03 * H), 0, 1)
            wh *= 1 - rosto
            tr = hd * wh
            W[:, ix['hair']] += tr
            W[:, ix['head']] -= tr
            print('cabelo:', int((tr > 0.3).sum()), 'vértices soltos')
    ordem = np.argsort(-W, axis=1)[:, :4]
    w = np.take_along_axis(W, ordem, axis=1)
    w[w < 0.04] = 0
    w /= w.sum(axis=1, keepdims=True)

    # ---- ligação de cada osso (osso → espaço do modelo): membros pela junta e direção do modelo
    jt = {'hand' + nm: (k['punho'][nm], bones['arm' + nm + 'f'][1]) for nm in 'RL'}

    def ligacao(kk):
        B = Wn[kk].copy()
        seg = bones.get(kk) or jt.get(kk)
        if seg is not None and not kk.startswith('foot'):
            a0, b0 = seg[0], seg[1]
            R = B[:, :3]
            B = np.hstack([rot_entre(-unit(R[:, 2]), b0 - a0) @ R, np.asarray(a0, float).reshape(3, 1)])
        elif seg is not None:
            B = np.hstack([B[:, :3], np.asarray(seg[0], float).reshape(3, 1)])
        return B
    inv = {}
    for kk in nomes:
        B = ligacao(kk)
        Mi = np.linalg.inv(B[:, :3])
        inv[kk] = [round(float(x), 6) for x in np.hstack([Mi, (-Mi @ B[:, 3]).reshape(3, 1)]).ravel()]

    # ---- mapas: cor, material (R metal, G aspereza, B relevo neutro) e normais
    def jpg(img, lado_, q):
        img = cv2.resize(np.clip(img, 0, 255).astype(np.uint8), (lado_, lado_), interpolation=cv2.INTER_AREA)
        ok, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, q])
        return base64.b64encode(buf.tobytes()).decode('ascii')
    pot = lambda im: min(a.tex, 1 << int(np.ceil(np.log2(max(im.shape[:2])))))
    tex64 = jpg(cor, pot(cor), 90)
    if mr is not None:
        mm = np.zeros_like(mr, dtype=np.float64)
        mm[:, :, 2], mm[:, :, 1], mm[:, :, 0] = mr[:, :, 0], mr[:, :, 1], 128     # glTF: B metal, G aspereza
        mat64 = jpg(mm, a.tex // 2, 88)
    else:
        mat64 = mapa_material(np.clip(cor, 0, 255).astype(np.uint8), a.tex // 2)
    nrm64 = None
    if nrm is not None:
        nn = cv2.resize(np.asarray(nrm, np.float64), (a.tex // 2, a.tex // 2), interpolation=cv2.INTER_AREA) / 127.5 - 1
        nn /= np.linalg.norm(nn, axis=2, keepdims=True) + 1e-9
        nrm64 = jpg((nn + 1) * 127.5, a.tex // 2, 92)

    # ---- mãos: as da malha saem e entram as luvas com dedos articulados do jogo
    # (js/models/kael_tex3d.js), que fecham no cabo da espada; a malha corta no punho
    luvas = a.id == 'kael' and not a.maos_do_modelo
    if luvas:
        mao = np.isin(rot, [ix['handR'], ix['handL']])
        fica = ~np.all(mao[o2r][Fo], axis=1)
        print('mãos da malha retiradas:', int((~fica).sum()), 'triângulos')
        Fo = Fo[fica]

    # ---- peças acrescentadas: o símbolo luminoso das costas da ficha (anel, barra e elo)
    pecas = None
    if a.id == 'kael' and not a.sem_simbolo:
        from detalhes3d import FOSCO, Pecas, base_local, caixa, raio, toro
        k_ = H / 62.1
        h = raio(V, F, np.array([-30.0, 0.0, 0.758 * H]), np.array([1.0, 0, 0]))
        if h is not None:
            c, nn = h
            pecas = Pecas()
            luz = (0.25, 0.72, 1.0)
            toro(pecas, c + nn * 0.2 * k_, nn, 1.69 * k_, 0.17 * k_, luz, FOSCO, 1.0)
            u_, v_, nn = base_local(nn)
            db = unit(-u_ * 60 + v_ * 90)
            caixa(pecas, c + nn * 0.24 * k_, db * 2.6 * k_, unit(np.cross(nn, db)) * 0.17 * k_, nn * 0.12 * k_, luz, FOSCO, 1.0)
            toro(pecas, c + nn * 0.3 * k_, nn, 0.42 * k_, 0.12 * k_, luz, FOSCO, 1.0, seg=12, lados=4)
            print('símbolo das costas em', np.round(c, 1))
    ordem_r, w_r = ordem, w

    # ---- vértices de saída (separados nas costuras da UV) com os pesos do vértice soldado
    Vo, No = V[o2r], Nr[o2r]
    ordem, w = ordem[o2r], w[o2r]

    # ---- saída: pedaços de até 65535 vértices (índices uint16)
    skins = []
    usados = sorted(set(np.unique(ordem[w > 0])))
    remap = np.full(len(nomes), 255, np.int64)
    remap[usados] = np.arange(len(usados))
    ossos = [nomes[i] for i in usados]
    bi = np.where(w > 0, remap[ordem], 0).astype(np.uint8)
    ini = 0
    while ini < len(Fo):
        # junta triângulos até o limite de vértices
        fim, vist = ini, {}
        while fim < len(Fo) and len(vist) + 3 <= 65535:
            for v in Fo[fim]:
                vist.setdefault(int(v), len(vist))
            fim += 1
        sel = np.array(list(vist.keys()))
        loc = np.vectorize(vist.get)(Fo[ini:fim])
        sk = codificar_pele(Vo[sel], No[sel], Uo[sel], loc, ossos, bi[sel], w[sel])
        sk['nome'] = f'importado{len(skins)}'
        skins.append(sk)
        ini = fim
    if pecas is not None and len(pecas):
        from scipy.spatial import cKDTree
        Vp, Np_, Ap, Fp = pecas.arrays()
        _, j = cKDTree(V).query(Vp)
        bip = np.where(w_r[j] > 0, remap[ordem_r[j]], 0).astype(np.uint8)
        sk = codificar_pele(Vp, Np_, Ap, Fp, ossos, bip, w_r[j], cor=True)
        sk['nome'] = 'det_simbolo'
        skins.append(sk)
    dados = {'v': 2, 'q': Q, 'props': props, 'inv': {kk: inv[kk] for kk in ossos}, 'skins': skins, 'importado': os.path.basename(a.arquivo), 'altura': H, 'pbr': 1}
    if luvas:
        dados['luvas'] = 1
    destino = a.saida or os.path.join(RAIZ, 'js', 'assets', f'{a.id}3d.js')
    cabec = f"""'use strict';
// ECLIPSE ZERO · {a.id} 3D importado de {os.path.basename(a.arquivo)} (tools/importar_modelo.py)
// ---------------------------------------------------------------------------
// v: 2 (malhas com pele no esqueleto do Kael); ver tools/gerar_kael3d.py para o formato.
// Não edite à mão: importe de novo o modelo.
// ---------------------------------------------------------------------------
"""
    if a.armadura:
        dados['heroi'] = a.id
        destino = a.saida or os.path.join(RAIZ, 'js', 'assets', 'armaduras', f'{a.armadura}.js')
        os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino, 'w', encoding='utf-8') as f:
        f.write(cabec)
        if a.armadura:
            k = json.dumps(a.armadura)
            f.write(f'(window.ARMOR3D = window.ARMOR3D || {{}})[{k}] = ' + json.dumps(dados, separators=(',', ':')) + ';\n')
            f.write(f"ARMOR3D[{k}].tex = 'data:image/jpeg;base64," + tex64 + "';\n")
            f.write(f"ARMOR3D[{k}].mat = 'data:image/jpeg;base64," + mat64 + "';\n")
            if nrm64:
                f.write(f"ARMOR3D[{k}].nrm = 'data:image/jpeg;base64," + nrm64 + "';\n")
            f.write(f"if (typeof ArmorModels !== 'undefined') ArmorModels.loaded({k});\n")
        elif a.id == 'kael':
            f.write('const KAEL3D = ' + json.dumps(dados, separators=(',', ':')) + ';\n')
            f.write("KAEL3D.tex = 'data:image/jpeg;base64," + tex64 + "';\n")
            f.write("KAEL3D.mat = 'data:image/jpeg;base64," + mat64 + "';\n")
            if nrm64:
                f.write("KAEL3D.nrm = 'data:image/jpeg;base64," + nrm64 + "';\n")
        else:
            f.write(f'(window.HERO3D = window.HERO3D || {{}}).{a.id} = ' + json.dumps(dados, separators=(',', ':')) + ';\n')
            f.write(f"HERO3D.{a.id}.tex = 'data:image/jpeg;base64," + tex64 + "';\n")
            f.write(f"HERO3D.{a.id}.mat = 'data:image/jpeg;base64," + mat64 + "';\n")
            if nrm64:
                f.write(f"HERO3D.{a.id}.nrm = 'data:image/jpeg;base64," + nrm64 + "';\n")
    cont = {nm: int((rot == ix[nm]).sum()) for nm in nomes}
    print('regiões', {kk: v for kk, v in cont.items() if v})
    print('Gerado', destino, f'({os.path.getsize(destino) // 1024} KB: {len(Vo)} vértices, {len(Fo)} triângulos, {len(skins)} malha(s), {len(ossos)} ossos)')


if __name__ == '__main__':
    main()
