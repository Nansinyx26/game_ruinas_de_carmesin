"""ECLIPSE ZERO · Topologia inteligente, etapa 1: DIAGNÓSTICO de todos os modelos 3D (sem alterar nada)
---------------------------------------------------------------------------
Percorre o projeto, lê cada GLB/GLTF (o formato que o jogo converte; FBX/OBJ/.blend entram no
inventário com o tamanho) e mede, por malha:
  vértices, triângulos, cascas (pedaços soltos), vértices duplicados de verdade (mesma posição,
  normal e UV), faces degeneradas (área zero ou índice repetido), arestas não manifold (3+
  faces), bordas abertas, vértices soltos (sem face), triângulos finos (agulhas, ruins para
  deformar), normais ausentes/nulas/invertidas em relação à face, UVs ausentes, fora de 0–1 ou
  com área zero, materiais, texturas (resolução), esqueleto (ossos) e animações.
Classifica o modelo pelo caminho (personagem, armadura, cabelo, arma, criatura, cenário…) e
recomenda: RETOPOLOGIA (acima do orçamento do tipo com sinais de malha de escaneamento/IA:
triângulos finos, muitas cascas, não manifold), CORREÇÃO (duplicados, degeneradas, normais),
LOD (acima do orçamento de perto) ou OK.
Saída: docs/topologia/inventario.json (tudo) e docs/topologia/RELATORIO.md (resumo por tipo e a
lista do que precisa de trabalho). Só leitura: nenhum modelo é modificado.
Uso: python3 tools/topologia/diagnostico.py [pasta ...]   (padrão: o projeto, sem .git e caches)
---------------------------------------------------------------------------
"""
import json
import os
import struct
import sys
import time

import numpy as np
try:
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
except ImportError:   # (sem o SciPy, as cascas não são contadas)
    connected_components = None

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FORA = {'.git', 'node_modules', '.cache_criacao', '__pycache__', '_saida', '_backup'}
EXT = {'.glb', '.gltf', '.fbx', '.obj', '.blend'}

# Orçamento de triângulos por tipo (o motor desenha a pele na CPU: perto da câmera, LOD 0)
ORCAMENTO = {
    'personagem': 30000, 'rosto': 12000, 'corpo': 20000, 'cabelo': 12000, 'barba': 6000, 'armadura': 12000,
    'arma': 6000, 'criatura': 16000, 'pet': 16000, 'montaria': 15000, 'chefe': 30000,
    'construcao': 8000, 'cenario': 4000, 'natureza': 3000, 'outro': 10000,
}
TIPO_COMP = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
N_COMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def tipo_por_caminho(c):
    s = c.lower()
    if '/creatures/' in s or 'criatura' in s:
        if '/pets/' in s:
            return 'pet'
        if 'boss' in s:
            return 'chefe'
        return 'criatura'
    if 'montaria' in s or 'horse' in s or 'cavalo' in s:
        return 'montaria'
    if 'cabelo' in s or 'hair' in s:
        return 'cabelo'
    if 'barba' in s or 'bigode' in s or 'beard' in s:
        return 'barba'
    if '/rosto' in s or 'face' in s:
        return 'rosto'
    if '/corpo' in s or 'body' in s:
        return 'corpo'
    if 'armadura' in s or 'armor' in s or 'armour' in s:
        return 'armadura'
    if '/armas' in s or 'weapon' in s or 'espada' in s or 'sword' in s:
        return 'arma'
    if 'arquitetura' in s:
        return 'construcao'
    if 'natureza' in s:
        return 'natureza'
    if 'cenario' in s or 'props' in s:
        return 'cenario'
    if '/modelos/' in s or 'personag' in s or 'kael' in s or 'heroi' in s:
        return 'personagem'
    return 'outro'


def ler_glb(caminho):
    with open(caminho, 'rb') as f:
        b = f.read()
    if b[:4] != b'glTF':
        if b[:40].startswith(b'version https://git-lfs'):
            raise ValueError('ponteiro do Git LFS (o arquivo não foi baixado)')
        if b[:8] == b'\x89PNG\r\n\x1a\n':
            raise ValueError('é uma imagem PNG com extensão .glb (não é modelo 3D)')
        if b[:2] == b'\xff\xd8':
            raise ValueError('é uma imagem JPEG com extensão .glb (não é modelo 3D)')
        raise ValueError('não é GLB')
    _, _, n = struct.unpack('<III', b[:12])
    o, J, BIN = 12, None, b''
    while o < n:
        cl, ct = struct.unpack('<II', b[o:o + 8])
        d = b[o + 8:o + 8 + cl]
        if ct == 0x4E4F534A:
            J = json.loads(d)
        elif ct == 0x004E4942:
            BIN = d
        o += 8 + cl
    return J, BIN


def ler_gltf(caminho):
    with open(caminho, encoding='utf-8') as f:
        J = json.load(f)
    bufs = []
    for B in J.get('buffers', []):
        u = B.get('uri', '')
        if u.startswith('data:'):
            import base64
            bufs.append(base64.b64decode(u.split(',', 1)[1]))
        else:
            with open(os.path.join(os.path.dirname(caminho), u), 'rb') as f:
                bufs.append(f.read())
    return J, bufs


def acessor(J, bufs, i):
    A = J['accessors'][i]
    nc, t = N_COMP[A['type']], TIPO_COMP[A['componentType']]
    cnt = A['count']
    if 'bufferView' not in A:
        return np.zeros((cnt, nc)) if nc > 1 else np.zeros(cnt)
    V = J['bufferViews'][A['bufferView']]
    buf = bufs[V.get('buffer', 0)]
    off = V.get('byteOffset', 0) + A.get('byteOffset', 0)
    tam = struct.calcsize('<' + t)
    passo = V.get('byteStride', 0) or tam * nc
    if passo == tam * nc:
        a = np.frombuffer(buf, dtype='<' + t, count=cnt * nc, offset=off)
    else:
        a = np.lib.stride_tricks.as_strided(np.frombuffer(buf, dtype='<' + t, offset=off), shape=(cnt, nc), strides=(passo, tam)).copy().reshape(-1)
    a = a.astype(np.float64) if t == 'f' else a.astype(np.int64)
    if A.get('normalized') and t != 'f':
        a = a / float({'b': 127, 'B': 255, 'h': 32767, 'H': 65535}[t])
    return a.reshape(cnt, nc) if nc > 1 else a


def dim_imagem(J, bufs, img):
    """Largura × altura de uma imagem embutida (PNG, JPEG, WebP) sem decodificar."""
    try:
        if 'bufferView' not in img:
            return None
        V = J['bufferViews'][img['bufferView']]
        d = bufs[V.get('buffer', 0)][V.get('byteOffset', 0):V.get('byteOffset', 0) + V['byteLength']]
        if d[:8] == b'\x89PNG\r\n\x1a\n':
            return struct.unpack('>II', d[16:24])
        if d[:2] == b'\xff\xd8':
            i = 2
            while i < len(d):
                if d[i] != 0xFF:
                    i += 1
                    continue
                m = d[i + 1]
                if m in (0xC0, 0xC1, 0xC2):
                    h, w = struct.unpack('>HH', d[i + 5:i + 9])
                    return (w, h)
                i += 2 + struct.unpack('>H', d[i + 2:i + 4])[0]
        if d[:4] == b'RIFF' and d[8:12] == b'WEBP':
            if d[12:16] == b'VP8 ':
                w, h = struct.unpack('<HH', d[26:30])
                return (w & 0x3FFF, h & 0x3FFF)
            if d[12:16] == b'VP8L':
                bits = struct.unpack('<I', d[21:25])[0]
                return ((bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1)
            if d[12:16] == b'VP8X':
                return (1 + int.from_bytes(d[24:27], 'little'), 1 + int.from_bytes(d[27:30], 'little'))
    except Exception:
        return None
    return None


def unicas(A, inverso=False):
    """np.unique por linha (rápido: cada linha vira um bloco de bytes)."""
    A = np.ascontiguousarray(A)
    v = A.view(np.dtype((np.void, A.dtype.itemsize * A.shape[1]))).reshape(-1)
    if inverso:
        _, inv = np.unique(v, return_inverse=True)
        return inv.reshape(-1)
    return len(np.unique(v))


def analisar_primitiva(J, bufs, prim):
    A = prim.get('attributes', {})
    if 'POSITION' not in A or prim.get('mode', 4) != 4:
        return None
    P = acessor(J, bufs, A['POSITION'])
    nv = len(P)
    if 'indices' in prim:
        F = acessor(J, bufs, prim['indices']).reshape(-1, 3)
    else:
        F = np.arange(nv - nv % 3).reshape(-1, 3)
    nt = len(F)
    r = dict(vertices=int(nv), triangulos=int(nt))
    if nt == 0:
        return r
    ext = P.max(0) - P.min(0)
    diag = float(np.linalg.norm(ext)) or 1.0
    eps = diag * 1e-6
    # posições soldadas (para topologia: as costuras de UV/normal duplicam vértices de propósito)
    Q = np.round(P / eps).astype(np.int64)
    wid = unicas(Q, inverso=True)
    W = wid[F]
    # duplicados de verdade: mesma posição, normal e UV
    chave = [Q]
    N = acessor(J, bufs, A['NORMAL']) if 'NORMAL' in A else None
    UV = acessor(J, bufs, A['TEXCOORD_0']) if 'TEXCOORD_0' in A else None
    if N is not None:
        chave.append(np.round(N * 1000).astype(np.int64))
    if UV is not None:
        chave.append(np.round(UV * 1e5).astype(np.int64))
    nuniq = unicas(np.hstack(chave))
    r['duplicados'] = int(nv - nuniq)
    # faces degeneradas
    a, b, c = P[F[:, 0]], P[F[:, 1]], P[F[:, 2]]
    cr = np.cross(b - a, c - a)
    area2 = np.linalg.norm(cr, axis=1)
    repetido = (W[:, 0] == W[:, 1]) | (W[:, 1] == W[:, 2]) | (W[:, 0] == W[:, 2])
    degen = repetido | (area2 < (eps * eps))
    r['degeneradas'] = int(degen.sum())
    # agulhas: aresta mais longa² / área muito grande (triângulos finos)
    e2 = np.stack([np.sum((b - a) ** 2, 1), np.sum((c - b) ** 2, 1), np.sum((a - c) ** 2, 1)], 1).max(1)
    ok = ~degen
    razao = np.where(ok, e2 / np.maximum(area2, 1e-30), 0)
    r['finos'] = int((razao[ok] > 40).sum())   # ~ ângulo mínimo abaixo de ~3°
    r['finos_pct'] = round(100.0 * r['finos'] / max(1, int(ok.sum())), 2)
    # arestas: manifold, bordas
    Fv = W[ok]
    E = np.sort(np.concatenate([Fv[:, [0, 1]], Fv[:, [1, 2]], Fv[:, [2, 0]]]), axis=1)
    ek = E[:, 0] * (int(wid.max()) + 1) + E[:, 1]
    _, ce = np.unique(ek, return_counts=True)
    r['arestas'] = int(len(ce))
    r['nao_manifold'] = int((ce > 2).sum())
    r['bordas'] = int((ce == 1).sum())
    # vértices soltos (sem face)
    usados = np.zeros(nv, bool)
    usados[F.reshape(-1)] = True
    r['soltos'] = int((~usados).sum())
    # cascas (componentes ligados), por união das posições soldadas
    nw = int(wid.max()) + 1
    if connected_components is not None and len(E):
        G = coo_matrix((np.ones(len(E), np.int8), (E[:, 0], E[:, 1])), shape=(nw, nw))
        _, rot = connected_components(G, directed=False)
        usadosw = np.unique(Fv)
        r['cascas'] = int(len(np.unique(rot[usadosw])))
    else:
        r['cascas'] = None
    # normais
    if N is None:
        r['normais'] = 'ausentes'
    else:
        ln = np.linalg.norm(N, axis=1)
        fn = cr[ok] / np.maximum(area2[ok][:, None], 1e-30)
        vn = (N[F[ok, 0]] + N[F[ok, 1]] + N[F[ok, 2]])
        inv = (np.sum(fn * vn, 1) < 0).sum()
        r['normais_nulas'] = int((ln < 0.5).sum())
        r['normais_invertidas_pct'] = round(100.0 * inv / max(1, int(ok.sum())), 2)
    # UVs
    if UV is None:
        r['uv'] = 'ausente'
    else:
        fora = ((UV < -0.001) | (UV > 1.001)).any(1).sum()
        ua, ub, uc = UV[F[ok, 0]], UV[F[ok, 1]], UV[F[ok, 2]]
        uarea = np.abs((ub[:, 0] - ua[:, 0]) * (uc[:, 1] - ua[:, 1]) - (uc[:, 0] - ua[:, 0]) * (ub[:, 1] - ua[:, 1]))
        r['uv_fora_pct'] = round(100.0 * fora / nv, 2)
        r['uv_area_zero'] = int((uarea < 1e-12).sum())
    r['medidas'] = [round(float(x), 4) for x in ext]
    return r


def analisar(caminho):
    rel = os.path.relpath(caminho, RAIZ).replace(os.sep, '/')
    ext = os.path.splitext(caminho)[1].lower()
    R = dict(arquivo=rel, formato=ext[1:], kb=round(os.path.getsize(caminho) / 1024, 1), tipo=tipo_por_caminho('/' + rel))
    if ext not in ('.glb', '.gltf'):
        R['obs'] = 'fonte (inventário; o jogo usa a versão exportada em GLB)'
        return R
    try:
        J, B = ler_glb(caminho) if ext == '.glb' else ler_gltf(caminho)
    except Exception as err:   # noqa: BLE001
        R['erro'] = str(err)
        return R
    bufs = B if isinstance(B, list) else [B]
    if 'KHR_draco_mesh_compression' in (J.get('extensionsUsed') or []):
        R['erro'] = 'malha comprimida com Draco (KHR_draco_mesh_compression): o decodificador não está instalado aqui; medir pela versão convertida do jogo'
        return R
    tot = dict(vertices=0, triangulos=0, duplicados=0, degeneradas=0, finos=0, nao_manifold=0, bordas=0, soltos=0, cascas=0, uv_area_zero=0, normais_nulas=0)
    malhas, inv_pct, sem_uv, sem_n = [], [], 0, 0
    for mi, M in enumerate(J.get('meshes', [])):
        for pi, prim in enumerate(M.get('primitives', [])):
            try:
                r = analisar_primitiva(J, bufs, prim)
            except Exception as err:   # noqa: BLE001
                r = dict(erro=str(err))
            if not r:
                continue
            r['malha'] = M.get('name') or f'malha{mi}'
            malhas.append(r)
            for k in tot:
                if isinstance(r.get(k), int):
                    tot[k] += r[k]
            if 'normais_invertidas_pct' in r:
                inv_pct.append((r['normais_invertidas_pct'], r.get('triangulos', 0)))
            sem_uv += r.get('uv') == 'ausente'
            sem_n += r.get('normais') == 'ausentes'
    R.update(tot)
    R['finos_pct'] = round(100.0 * tot['finos'] / max(1, tot['triangulos']), 2)
    R['normais_invertidas_pct'] = round(sum(p * t for p, t in inv_pct) / max(1, sum(t for _, t in inv_pct)), 2) if inv_pct else None
    R['malhas'] = len(malhas)
    R['sem_uv'] = sem_uv
    R['sem_normais'] = sem_n
    R['materiais'] = len(J.get('materials', []))
    R['texturas'] = [list(dim_imagem(J, bufs, im) or ()) for im in J.get('images', [])]
    R['ossos'] = sum(len(S.get('joints', [])) for S in J.get('skins', []))
    R['animacoes'] = [A.get('name', '') for A in J.get('animations', [])]
    R['detalhe'] = malhas
    recomendar(R)
    return R


def recomendar(R):
    """Diagnóstico → recomendação (não aplica nada)."""
    orc = ORCAMENTO.get(R['tipo'], ORCAMENTO['outro'])
    t, rec, prob = R['triangulos'], [], []
    if R['degeneradas']:
        prob.append(f"{R['degeneradas']} faces degeneradas")
    if R['duplicados'] > max(8, R['vertices'] * 0.001):
        prob.append(f"{R['duplicados']} vértices duplicados")
    if R['soltos']:
        prob.append(f"{R['soltos']} vértices soltos")
    if R['nao_manifold'] > 0:
        prob.append(f"{R['nao_manifold']} arestas não manifold")
    if R.get('normais_invertidas_pct') and R['normais_invertidas_pct'] > 2:
        prob.append(f"{R['normais_invertidas_pct']}% de normais contra a face")
    if R['sem_uv']:
        prob.append(f"{R['sem_uv']} malha(s) sem UV")
    if R['finos_pct'] > 8:
        prob.append(f"{R['finos_pct']}% de triângulos finos")
    escaneado = R['finos_pct'] > 8 or R['nao_manifold'] > t * 0.002 or ((R['cascas'] or 0) > 60 and R['tipo'] not in ('cabelo', 'barba', 'natureza', 'cenario'))
    deformavel = R['tipo'] in ('personagem', 'corpo', 'rosto', 'criatura', 'pet', 'montaria', 'chefe', 'armadura', 'cabelo', 'barba')
    if t > orc * 2.5 and escaneado:
        rec.append('RETOPOLOGIA')
    elif t > orc * 2.5 and deformavel:
        rec.append('RETOPOLOGIA')
    if R['degeneradas'] or R['soltos'] or R['duplicados'] > max(8, R['vertices'] * 0.001) or (R.get('normais_invertidas_pct') or 0) > 2:
        rec.append('CORREÇÃO')
    if t > orc:
        rec.append('LOD')
    R['orcamento'] = orc
    R['problemas'] = prob
    R['recomendacao'] = rec or ['OK']


def main():
    pastas = [os.path.abspath(p) for p in sys.argv[1:]] or [RAIZ]
    arquivos = []
    for base in pastas:
        for d, subs, fs in os.walk(base):
            subs[:] = sorted(s for s in subs if s not in FORA and not s.startswith('.'))
            for f in sorted(fs):
                if os.path.splitext(f)[1].lower() in EXT:
                    arquivos.append(os.path.join(d, f))
    t0 = time.time()
    L = []
    for i, c in enumerate(arquivos):
        L.append(analisar(c))
        if (i + 1) % 50 == 0:
            print(f'{i + 1}/{len(arquivos)} … {time.time() - t0:.0f} s', flush=True)
    out = os.path.join(RAIZ, 'docs', 'topologia')
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'inventario.json'), 'w', encoding='utf-8') as f:
        json.dump(dict(gerado=time.strftime('%Y-%m-%d %H:%M'), total=len(L), modelos=L), f, ensure_ascii=False, indent=1)
    relatorio(L, os.path.join(out, 'RELATORIO.md'))
    print(f'{len(L)} arquivos em {time.time() - t0:.0f} s → docs/topologia/inventario.json e RELATORIO.md')


def relatorio(L, caminho):
    glb = [r for r in L if r['formato'] in ('glb', 'gltf') and 'erro' not in r]
    erros = [r for r in L if 'erro' in r]
    fontes = [r for r in L if r['formato'] not in ('glb', 'gltf')]
    por = {}
    for r in glb:
        por.setdefault(r['tipo'], []).append(r)
    linhas = ['# Topologia inteligente — diagnóstico dos modelos 3D', '',
              f'Gerado por `tools/topologia/diagnostico.py` (só leitura; nenhum modelo foi alterado). '
              f'{len(L)} arquivos: {len(glb)} GLB/GLTF analisados, {len(fontes)} fontes (.blend/.fbx/.obj, só inventário), {len(erros)} não lidos.', '',
              '## Resumo por tipo', '', '| tipo | modelos | triângulos (total) | maior | orçamento | retopologia | correção | LOD |', '|---|---|---|---|---|---|---|---|']
    for tp in sorted(por):
        G = por[tp]
        mx = max(G, key=lambda r: r['triangulos'])
        linhas.append(f"| {tp} | {len(G)} | {sum(r['triangulos'] for r in G):,} | {mx['triangulos']:,} | {ORCAMENTO.get(tp, 10000):,} | "
                      f"{sum('RETOPOLOGIA' in r['recomendacao'] for r in G)} | {sum('CORREÇÃO' in r['recomendacao'] for r in G)} | {sum('LOD' in r['recomendacao'] for r in G)} |")
    linhas += ['', '## Precisam de retopologia', '', '| arquivo | tipo | triângulos | finos | não manifold | cascas | problemas |', '|---|---|---|---|---|---|---|']
    for r in sorted((r for r in glb if 'RETOPOLOGIA' in r['recomendacao']), key=lambda r: -r['triangulos']):
        linhas.append(f"| `{r['arquivo']}` | {r['tipo']} | {r['triangulos']:,} | {r['finos_pct']}% | {r['nao_manifold']} | {r['cascas']} | {'; '.join(r['problemas'])} |")
    linhas += ['', '## Precisam de correção (sem retopologia)', '', '| arquivo | tipo | triângulos | problemas |', '|---|---|---|---|']
    for r in sorted((r for r in glb if 'CORREÇÃO' in r['recomendacao'] and 'RETOPOLOGIA' not in r['recomendacao']), key=lambda r: -r['triangulos']):
        linhas.append(f"| `{r['arquivo']}` | {r['tipo']} | {r['triangulos']:,} | {'; '.join(r['problemas'])} |")
    if erros:
        linhas += ['', '## Não lidos', '']
        linhas += [f"- `{r['arquivo']}`: {r['erro']}" for r in erros]
    linhas += ['', '## Critérios', '',
               '- **Retopologia**: acima de 2,5× o orçamento do tipo com sinais de malha de escaneamento/IA (mais de 8% de triângulos finos, '
               'arestas não manifold, dezenas de cascas) ou deformável (personagem, criatura, roupa) muito acima do orçamento.',
               '- **Correção**: faces degeneradas, vértices soltos, duplicados de verdade (mesma posição, normal e UV) ou normais contra a face.',
               '- **LOD**: acima do orçamento de perto (o motor faz a pele na CPU); os níveis 1–3 entram pela distância.',
               '- Orçamentos (triângulos, LOD 0): ' + ', '.join(f'{k} {v:,}' for k, v in ORCAMENTO.items()) + '.']
    with open(caminho, 'w', encoding='utf-8') as f:
        f.write('\n'.join(linhas) + '\n')


if __name__ == '__main__':
    main()
