"""Auditoria dos assets que o jogo já tem: assets/AUDITORIA.md.

Para cada .glb de assets/: triângulos, vértices, materiais (e repetidos), texturas (lado e
formato), UV, compressão Draco, tamanho do arquivo e as medidas (escala: o glTF é em metros).
Para cada PNG/JPG/WebP: dimensões, potência de 2 e canal alfa. E, quando existe, a versão que o
jogo realmente carrega (js/assets/criacao/<id>.js, convertida por tools/importar_criacao.py):
triângulos e tamanho no jogo. No fim, a lista priorizada do que otimizar ou refazer, pelo
orçamento da web (personagens ≤ 5 mil triângulos, props e armas ≤ 1,5 mil, peças modulares
≤ 3 mil, texturas ≤ 1024).

Não precisa do Blender (lê o cabeçalho JSON e os binários dos GLB direto):
  python3 tools/blender/auditoria.py
"""
import base64
import json
import os
import re
import struct
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASSETS = os.path.join(RAIZ, 'assets')
SAIDA = os.path.join(ASSETS, 'AUDITORIA.md')
ORC = {'personagem': 5000, 'parte': 5000, 'equipamento': 3000, 'arma': 1500, 'prop': 1500, 'modular': 3000}
TEX_MAX = 1024


def categoria(rel):
    r = rel.lower()
    if 'armas/' in r:
        return 'arma'
    if 'armadura' in r or 'armaduras_extras' in r:
        return 'equipamento'
    if 'rosto/' in r or 'cabelo/' in r or 'barbas/' in r:
        return 'parte'
    if 'corpo_' in r or 'modelos/' in r:
        return 'personagem'
    return 'prop'


def dims_imagem(b):
    """(largura, altura, alfa) de PNG, JPEG ou WebP pelos bytes do cabeçalho."""
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        w, h = struct.unpack('>II', b[16:24])
        tipo = b[25]
        return w, h, tipo in (4, 6)
    if b[:2] == b'\xff\xd8':
        i = 2
        while i < len(b) - 9:
            if b[i] != 0xFF:
                i += 1
                continue
            m = b[i + 1]
            if m in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack('>HH', b[i + 5:i + 9])
                return w, h, False
            i += 2 + struct.unpack('>H', b[i + 2:i + 4])[0]
        return None
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP':
        if b[12:16] == b'VP8X':
            return 1 + int.from_bytes(b[24:27], 'little'), 1 + int.from_bytes(b[27:30], 'little'), bool(b[20] & 0x10)
        if b[12:16] == b'VP8L':
            v = int.from_bytes(b[21:25], 'little')
            return (v & 0x3FFF) + 1, ((v >> 14) & 0x3FFF) + 1, bool((v >> 28) & 1)
        if b[12:16] == b'VP8 ':
            return struct.unpack('<H', b[26:28])[0] & 0x3FFF, struct.unpack('<H', b[28:30])[0] & 0x3FFF, False
    return None


def ler_glb(caminho):
    """Cabeçalho JSON e um leitor de trechos do binário (sem carregar os 20 MB do arquivo)."""
    f = open(caminho, 'rb')
    cab = f.read(20)
    if cab[:4] != b'glTF':
        f.close()
        raise ValueError('não é GLB')
    n = struct.unpack('<I', cab[12:16])[0]
    js = json.loads(f.read(n))
    ini_bin = 20 + n + 8

    def trecho(ofs, tam):
        f.seek(ini_bin + ofs)
        return f.read(tam)
    return js, trecho, f


def auditar_glb(caminho):
    js, trecho, arq = ler_glb(caminho)
    acc = js.get('accessors', [])
    tris = verts = 0
    uv = True
    draco = False
    mn = [1e9] * 3
    mx = [-1e9] * 3
    for me in js.get('meshes', []):
        for pr in me.get('primitives', []):
            at = pr.get('attributes', {})
            if 'KHR_draco_mesh_compression' in pr.get('extensions', {}):
                draco = True
            if 'POSITION' in at:
                a = acc[at['POSITION']]
                verts += a['count']
                if 'min' in a:
                    mn = [min(x, y) for x, y in zip(mn, a['min'])]
                    mx = [max(x, y) for x, y in zip(mx, a['max'])]
            if 'TEXCOORD_0' not in at:
                uv = False
            tris += (acc[pr['indices']]['count'] if 'indices' in pr else acc[at['POSITION']]['count']) // 3
    mats = [m.get('name', '') for m in js.get('materials', [])]
    assin = [json.dumps({k: v for k, v in m.items() if k != 'name'}, sort_keys=True) for m in js.get('materials', [])]
    repetidos = len(assin) - len(set(assin))
    texs = []
    for im in js.get('images', []):
        b = None
        if 'bufferView' in im:
            bv = js['bufferViews'][im['bufferView']]
            b = trecho(bv.get('byteOffset', 0), min(bv['byteLength'], 65536))
        elif str(im.get('uri', '')).startswith('data:'):
            b = base64.b64decode(im['uri'].split(',', 1)[1])[:65536]
        dm = dims_imagem(b) if b else None
        texs.append(dict(w=dm[0], h=dm[1], tipo=im.get('mimeType', '?')) if dm else dict(w=0, h=0, tipo=im.get('mimeType', '?')))
    arq.close()
    med = [round(b - a, 3) for a, b in zip(mn, mx)] if mn[0] < 1e8 else None
    return dict(tris=tris, verts=verts, uv=uv, draco=draco, materiais=len(mats), repetidos=repetidos, texturas=texs, medidas=med,
                kb=os.path.getsize(caminho) // 1024)


def tris_no_jogo(id_):
    """Triângulos da versão convertida (js/assets/criacao/<id>.js), se existir."""
    p = os.path.join(RAIZ, 'js', 'assets', 'criacao', id_ + '.js')
    if not os.path.exists(p):
        return None
    s = open(p, encoding='utf-8').read()
    m = re.search(r'\] = (\{.*?\});\n', s)
    if not m:
        return None
    D = json.loads(m.group(1))
    skins = D.get('skins') or next(iter((D.get('porCorpo') or {}).values()), [])
    n = sum(len(base64.b64decode(S['i'])) // 6 for S in skins)
    return dict(tris=n, kb=os.path.getsize(p) // 1024)


def ids_da_criacao():
    """Caminho do GLB → id do catálogo da criação."""
    p = os.path.join(RAIZ, 'js', 'assets', 'criacao', 'catalogo.js')
    if not os.path.exists(p):
        return {}
    s = open(p, encoding='utf-8').read()
    L = json.loads(s[s.index('['):s.rindex(']') + 1])
    return {c['arq']: c['id'] for c in L}


def main():
    ids = ids_da_criacao()
    glbs, imgs = [], []
    for raiz, _, arqs in os.walk(ASSETS):
        if '_backup' in raiz:
            continue
        for a in sorted(arqs):
            c = os.path.join(raiz, a)
            rel = os.path.relpath(c, RAIZ)
            if a.lower().endswith('.glb'):
                try:
                    g = auditar_glb(c)
                except Exception as e:
                    g = dict(erro=str(e), kb=os.path.getsize(c) // 1024)
                g['rel'] = rel
                g['cat'] = categoria(rel)
                g['jogo'] = tris_no_jogo(ids[rel]) if rel in ids else None
                glbs.append(g)
            elif a.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                with open(c, 'rb') as f:
                    dm = dims_imagem(f.read(65536))
                imgs.append(dict(rel=rel, w=dm[0] if dm else 0, h=dm[1] if dm else 0, alfa=bool(dm and dm[2]), kb=os.path.getsize(c) // 1024))
    # problemas e prioridade
    prob = []
    for g in glbs:
        if 'erro' in g:
            prob.append((100, g['rel'], f"não abriu: {g['erro']}"))
            continue
        orc = ORC.get(g['cat'], 1500)
        p = []
        if g['tris'] > orc:
            p.append(f"{g['tris']:,} triângulos ({g['tris'] / orc:.0f}× o orçamento de {orc:,})".replace(',', '.'))
        big = [t for t in g['texturas'] if max(t['w'], t['h']) > TEX_MAX]
        if big:
            p.append(f"{len(big)} textura(s) de {max(max(t['w'], t['h']) for t in big)} px")
        if not g['uv']:
            p.append('sem UV')
        if g['repetidos']:
            p.append(f"{g['repetidos']} material(is) repetido(s)")
        if g['kb'] > 5000:
            p.append(f"arquivo de {g['kb'] / 1024:.0f} MB")
        if g['medidas'] and max(g['medidas']) > 5:
            p.append(f"escala suspeita ({max(g['medidas']):.1f} m)")
        if p:
            peso = g['tris'] / orc + (3 if big else 0) + g['kb'] / 10000
            prob.append((peso, g['rel'], '; '.join(p) + (f" · no jogo já reduzido: {g['jogo']['tris']:,} tri, {g['jogo']['kb']} KB".replace(',', '.') if g.get('jogo') else '')))
    for im in imgs:
        pot = lambda n: n > 0 and not (n & (n - 1))
        p = []
        if max(im['w'], im['h']) > 2048:
            p.append(f"{im['w']}×{im['h']}")
        if p:
            prob.append((0.5, im['rel'], 'imagem grande: ' + ', '.join(p)))
    prob.sort(key=lambda x: -x[0])
    # relatório
    L = ['# Auditoria dos assets', '', 'Gerado por `tools/blender/auditoria.py`. Orçamento da web: personagens ≤ 5.000 triângulos, '
         'armas e props ≤ 1.500, peças modulares e equipamento ≤ 3.000, texturas ≤ 1024 px.', '',
         '**Importante:** os GLB de `assets/` são as **fontes** (geradas no Meshy). O jogo não carrega esses arquivos: os conversores '
         '(`tools/importar_criacao.py`, `tools/importar_modelo.py`, `tools/importar_arma.py`) geram versões reduzidas em `js/assets/`. '
         'A coluna "no jogo" mostra o que realmente vai para o navegador, quando a peça é da criação de personagem.', '',
         f'Total: {len(glbs)} modelos GLB ({sum(g["kb"] for g in glbs) / 1024:.0f} MB) e {len(imgs)} imagens ({sum(i["kb"] for i in imgs) / 1024:.0f} MB).', '',
         '## Prioridades (do mais pesado ao mais leve)', '']
    for i, (peso, rel, txt) in enumerate(prob[:60], 1):
        L.append(f'{i}. `{rel}` — {txt}')
    # custo de um personagem criado montado no jogo (corpo, rosto, cabelo, barba e o conjunto inicial)
    comp = ['corpo_m', 'rosto_1', 'cabelo_1', 'barba_curta', 'ini_capuz', 'ini_peitoral', 'ini_luvas', 'ini_calca', 'ini_botas', 'ini_capa']
    cj = [(c, tris_no_jogo(c)) for c in comp]
    if all(x for _, x in cj):
        tot = sum(x['tris'] for _, x in cj)
        L += ['', '## Custo no jogo de um personagem criado (estilo Realista, conjunto do Iniciado)', '',
              '| Peça | Triângulos | Arquivo |', '|---|---|---|'] + [f"| {c} | {x['tris']:,} | {x['kb']} KB |".replace(',', '.') for c, x in cj] + [
              f"| **Total** | **{tot:,}** | **{sum(x['kb'] for _, x in cj) / 1024:.1f} MB** |".replace(',', '.'), '',
              f"O orçamento pedido para personagens é 5.000 triângulos; montado, o personagem tem {tot / 5000:.0f}× isso. "
              'Para caber, a saída é um LOD por distância (o motor já esconde malhas por nível de detalhe): a versão completa na tela '
              'de criação e na 3ª pessoa de perto, uma versão reduzida (≈ 5 mil) na vista isométrica. Decisão de arte pendente.']
    L += ['', '## Modelos', '', '| Arquivo | Categoria | Triângulos | Vértices | Texturas | UV | Draco | Materiais | Medidas (m) | Tamanho | No jogo |', '|---|---|---|---|---|---|---|---|---|---|---|']
    for g in glbs:
        if 'erro' in g:
            L.append(f"| `{g['rel']}` | {g['cat']} | erro: {g['erro']} | | | | | | | {g['kb']} KB | |")
            continue
        tx = ', '.join(f"{t['w']}" for t in g['texturas']) or '—'
        jg = f"{g['jogo']['tris']:,} tri".replace(',', '.') if g.get('jogo') else '—'
        md = '×'.join(f'{v:.2f}' for v in g['medidas']) if g['medidas'] else '—'
        L.append(f"| `{g['rel']}` | {g['cat']} | {g['tris']:,} | {g['verts']:,} | {tx} | {'sim' if g['uv'] else 'não'} | {'sim' if g['draco'] else 'não'} | {g['materiais']}{f' ({g[chr(114)+chr(101)+chr(112)+chr(101)+chr(116)+chr(105)+chr(100)+chr(111)+chr(115)]} rep.)' if g['repetidos'] else ''} | {md} | {g['kb'] / 1024:.1f} MB | {jg} |".replace(',', '.'))
    L += ['', '## Imagens', '', '| Arquivo | Dimensões | Alfa | Tamanho |', '|---|---|---|---|']
    for im in imgs:
        L.append(f"| `{im['rel']}` | {im['w']}×{im['h']} | {'sim' if im['alfa'] else 'não'} | {im['kb']} KB |")
    with open(SAIDA, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')
    print(f'auditoria: {SAIDA} · {len(glbs)} modelos, {len(imgs)} imagens, {len(prob)} problemas')


if __name__ == '__main__':
    sys.exit(main())
