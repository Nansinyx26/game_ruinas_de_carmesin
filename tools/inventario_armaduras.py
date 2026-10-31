"""Inventário de todas as armaduras GLB do projeto → docs/INVENTARIO_ARMADURAS_GLB.md.

Lê só o cabeçalho de cada GLB (o JSON do glTF e os primeiros bytes de cada imagem), sem carregar
as malhas: triângulos, vértices, imagens (tamanho em pixels), materiais, se tem esqueleto (skin) ou
animações, o tamanho do arquivo e se está no Git LFS. Cruza com o catálogo da criação
(tools/importar_criacao.py: id, vaga, classe, nível, se é peça pronta ou do Blender, o orçamento da
conversão) e com o arquivo convertido para o jogo (js/assets/criacao/<id>.js).

Uso: python3 tools/inventario_armaduras.py
"""
import json
import os
import struct
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'tools'))
import importar_criacao as ic  # noqa: E402

PASTAS = ('Armaduras_Inicial_Level_1', 'Armaduras_Level_30', 'Armaduras_Level_50', 'Armaduras_Level_75', 'Armaduras_Level_100')


def tamanho_imagem(b):
    """(largura, altura) de um PNG, JPEG ou WebP pelos primeiros bytes."""
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', b[16:24])
    if b[:2] == b'\xff\xd8':
        i = 2
        while i < len(b) - 9:
            if b[i] != 0xFF:
                i += 1
                continue
            m = b[i + 1]
            if m in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack('>HH', b[i + 5:i + 9])
                return w, h
            i += 2 + struct.unpack('>H', b[i + 2:i + 4])[0]
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP':
        if b[12:16] == b'VP8 ':
            w, h = struct.unpack('<HH', b[26:30])
            return w & 0x3FFF, h & 0x3FFF
    return None


def ler_cabecalho(caminho):
    with open(caminho, 'rb') as f:
        magic, ver, total = struct.unpack('<4sII', f.read(12))
        if magic != b'glTF':
            return None
        n, tipo = struct.unpack('<I4s', f.read(8))
        js = json.loads(f.read(n).decode('utf-8'))
        bin0 = 12 + 8 + n + 8                                # início dos dados do bloco BIN
        tris = verts = 0
        for me in js.get('meshes', []):
            for pr in me.get('primitives', []):
                pos = js['accessors'][pr['attributes']['POSITION']]['count']
                verts += pos
                tris += (js['accessors'][pr['indices']]['count'] if 'indices' in pr else pos) // 3
        imgs = []
        for im in js.get('images', []):
            if 'bufferView' not in im:
                continue
            bv = js['bufferViews'][im['bufferView']]
            f.seek(bin0 + bv.get('byteOffset', 0))
            d = tamanho_imagem(f.read(min(bv['byteLength'], 65536)))
            if d:
                imgs.append(d)
        mats = js.get('materials', [])
        mapas = sorted({k for m in mats for k in ('baseColorTexture', 'metallicRoughnessTexture') if k in m.get('pbrMetallicRoughness', {})} |
                       {k for m in mats for k in ('normalTexture', 'occlusionTexture', 'emissiveTexture') if k in m})
        return dict(tris=tris, verts=verts, imgs=imgs, mats=len(mats), mapas=mapas, skin=bool(js.get('skins')), anim=len(js.get('animations', [])),
                    mb=os.path.getsize(caminho) / 1e6)


def main():
    lfs = set(subprocess.run(['git', '-c', 'core.quotepath=off', 'lfs', 'ls-files', '-n'], cwd=RAIZ, capture_output=True, text=True).stdout.split('\n'))
    git = set(subprocess.run(['git', '-c', 'core.quotepath=off', 'ls-files'], cwd=RAIZ, capture_output=True, text=True).stdout.split('\n'))
    por_arq = {}
    for p in ic.PECAS:
        if p['tipo'] == 'peca':
            por_arq.setdefault(os.path.normpath(os.path.join(ic.ORIG, p['arq'])), []).append(p)
    linhas, total, sem_uso = [], 0, []
    cont = dict(real=0, blender=0, meshy=0)
    for pasta in PASTAS:
        base = os.path.join(ic.ORIG, pasta)
        for dirp, _, arqs in sorted(os.walk(base)):
            for a in sorted(arqs):
                if not a.lower().endswith('.glb'):
                    continue
                c = os.path.join(dirp, a)
                rel = os.path.relpath(c, RAIZ).replace(os.sep, '/')
                h = ler_cabecalho(c)
                total += 1
                ps = por_arq.get(os.path.normpath(c), [])
                if not ps:
                    sem_uso.append((rel, h))
                    continue
                for p in ps:
                    js = os.path.join(RAIZ, f"js/assets/criacao/{p['id']}.js")
                    origem = 'pronto (enviado)' if p.get('real') else ('Blender' if p.get('blender') else 'Meshy')
                    cont['real' if p.get('real') else 'blender' if p.get('blender') else 'meshy'] += 1
                    img = ', '.join(f'{w}×{hh}' for w, hh in h['imgs'][:3]) if h['imgs'] else '—'
                    linhas.append(f"| {p.get('nivel', '')} | {p.get('classe', 'todas')} | {p['vaga']} | `{p['id']}` | {origem} | `{rel}` | {h['tris']:,} | {img} | "
                                  f"{'sim' if h['skin'] else 'não'} | {h['mb']:.1f} MB{' (LFS)' if rel in lfs else '' if rel in git else ' (fora do git)'} | "
                                  f"{p['tri']:,} tri · {p['tex']} px | {'sim' if os.path.exists(js) else 'NÃO'} ({os.path.getsize(js) // 1024 if os.path.exists(js) else 0} KB) |")
    out = ['# Inventário das armaduras GLB', '',
           'Gerado por `python3 tools/inventario_armaduras.py` (lê só o cabeçalho de cada GLB). Uma linha por peça do jogo; as ombreiras '
           'vêm em par num arquivo só e viram duas peças (esquerda e direita).', '',
           f'**{total} arquivos GLB de armadura**; peças no jogo: {cont["real"]} prontas (enviadas), {cont["blender"]} do Blender, {cont["meshy"]} do Meshy '
           f'(níveis 1 e 30); {len(sem_uso)} arquivos sem peça no catálogo.', '',
           '| Nível | Classe | Vaga | Peça no jogo | Origem | GLB original (intacto) | Triângulos no original | Texturas no original | Esqueleto no original | Arquivo | Versão do jogo (orçamento) | Convertida |',
           '|---|---|---|---|---|---|---|---|---|---|---|---|'] + linhas
    if sem_uso:
        out += ['', '## Arquivos sem peça no catálogo', '', '| GLB | Triângulos | Motivo |', '|---|---|---|']
        for rel, h in sem_uso:
            out.append(f"| `{rel}` | {h['tris']:,} | substituído por um GLB pronto na mesma vaga, ou enviado sem vaga definida |")
    destino = os.path.join(RAIZ, 'docs', 'INVENTARIO_ARMADURAS_GLB.md')
    with open(destino, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) + '\n')
    print(f'{total} GLB, {len(linhas)} peças, {len(sem_uso)} sem uso → {destino}')


if __name__ == '__main__':
    main()
