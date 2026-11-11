#!/usr/bin/env python3
"""Auditoria dos GLB do repositório: o que está no jogo, o que é fonte/intermediário e o que sobrou.

Uso: python3 tools/auditoria_glb.py [--json saida.json]

Verifica, para todo .glb versionado no git:
  1. se é mesmo um GLB (cabeçalho 'glTF'): arquivos .glb que são PNG/JPEG renomeados não abrem;
     ponteiros do Git LFS ainda não baixados aparecem como 'lfs' (rode git lfs pull);
  2. duplicatas exatas (mesmo conteúdo);
  3. se o nome aparece no código do jogo (js/, index.html) ou num manifesto/ferramenta do pipeline
     que gera o arquivo do motor (estruturas.json, lote.json do retopo, *_topologia.json das
     criaturas, tools/**/*.json e *.py);
  4. estruturas e plantas (assets/estruturas_ambiente, assets/Composição_de_Plantas, assets/extra,
     assets/baús): aprovada na redução (assets/models/estruturas/estruturas.json) → convertida
     (js/assets/estruturas/<id>.js) → posta numa zona (js/mundo/estruturas.js, cenario.js, baus.js).
O relatório comentado fica em docs/AUDITORIA_GLB.md.
"""
import collections
import hashlib
import json
import os
import re
import subprocess
import sys
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(RAIZ)
nfc = lambda s: unicodedata.normalize('NFC', s)   # noqa: E731


def glbs_no_git():
    out = subprocess.run(['git', 'ls-files', '-z', '*.glb', '*.GLB'], capture_output=True, check=True).stdout
    return sorted(nfc(p) for p in out.decode('utf-8').split('\0') if p)


def tipo_real(p):
    with open(p, 'rb') as f:
        h = f.read(12)
    if h[:4] == b'glTF':
        return 'glb'
    if h[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'
    if h[:3] == b'\xff\xd8\xff':
        return 'jpeg'
    if h[:7] == b'version':
        return 'lfs'          # ponteiro do Git LFS (o arquivo não foi baixado)
    return 'desconhecido'


def md5(p):
    m = hashlib.md5()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            m.update(b)
    return m.hexdigest()


RX = re.compile(r'[^"\'`\s,()\[\]{}<>=:;|*]{1,160}\.glb', re.I)
BASE64 = re.compile(r'[A-Za-z0-9+/=]{120,}')


def referencias():
    """nome do arquivo (minúsculo) → onde aparece; 'jogo' (js/, index.html) ou 'pipeline' (manifestos e ferramentas)"""
    refs = collections.defaultdict(set)
    alvos = [('js', 'jogo'), ('index.html', 'jogo'), ('assets', 'pipeline'), ('tools', 'pipeline')]
    for raiz, tipo in alvos:
        arquivos = [(raiz, '')] if os.path.isfile(raiz) else [(dp, f) for dp, _, fs in os.walk(raiz) for f in fs]
        for dp, f in arquivos:
            p = os.path.join(dp, f) if f else dp
            ext = ('.js', '.json', '.html', '.mjs') + (('.py',) if tipo == 'pipeline' else ())
            if '/node_modules' in p or not p.endswith(ext):
                continue
            if tipo == 'jogo' and os.path.getsize(p) > 3_000_000 and not p.endswith(('catalogo.js', 'indice.js')):
                # arquivos de malha (base64): só o cabeçalho cita a origem
                with open(p, encoding='utf-8', errors='ignore') as fh:
                    t = fh.read(4000)
            else:
                try:
                    t = BASE64.sub(' ', open(p, encoding='utf-8', errors='ignore').read())
                except OSError:
                    continue
            for m in RX.findall(nfc(t)):
                refs[os.path.basename(m).lower()].add((tipo, p))
    return refs


def estruturas():
    man = json.load(open('assets/models/estruturas/estruturas.json', encoding='utf-8'))
    zonas = ''
    for f in ('js/mundo/estruturas.js', 'js/mundo/cenario.js', 'js/mundo/baus.js', 'js/mundo/cidade_morta.js'):
        if os.path.exists(f):
            zonas += open(f, encoding='utf-8').read()
    out = []
    for e in man:
        i = e['id']
        out.append({'id': i, 'fonte': nfc(e['fonte']), 'aprovada': bool(e.get('aprovada')), 'tris': e.get('depois'),
                    'convertida': os.path.exists(f'js/assets/estruturas/{i}.js'),
                    'na_zona': bool(re.search(r"['\"]" + re.escape(i) + r"['\"]", zonas))})
    return out


def main():
    G = glbs_no_git()
    refs = referencias()
    real = {p: tipo_real(p) for p in G}
    falsos = {p: t for p, t in real.items() if t not in ('glb', 'lfs')}
    lfs = [p for p, t in real.items() if t == 'lfs']
    dup = collections.defaultdict(list)
    for p in G:
        if real[p] == 'glb':
            dup[md5(p)].append(p)
    dup = [v for v in dup.values() if len(v) > 1]
    E = estruturas()
    fontes_estr = {e['fonte'] for e in E}
    saidas_estr = {f"assets/models/estruturas/{e['id']}.glb" for e in E}

    cat = collections.defaultdict(list)
    for p in G:
        b = os.path.basename(p).lower()
        onde = refs.get(b, set())
        if p in falsos:
            cat['não é GLB (imagem com extensão .glb)'].append(p)
        elif p.endswith('_lod.glb') and p.startswith('assets/models/estruturas/'):
            cat['LOD exportado, ainda não usado pelo motor'].append(p)
        elif p in fontes_estr or p in saidas_estr:
            cat['estrutura/planta (ver tabela)'].append(p)
        elif any(t == 'jogo' for t, _ in onde):
            cat['no jogo (citado em js/)'].append(p)
        elif onde:
            cat['fonte de pipeline (manifesto ou ferramenta gera o arquivo do motor)'].append(p)
        else:
            cat['sem referência'].append(p)

    print(f'GLB versionados: {len(G)}' + (f' ({len(lfs)} ainda como ponteiro do LFS)' if lfs else ''))
    for k, v in sorted(cat.items(), key=lambda kv: -len(kv[1])):
        print(f'  {len(v):4d}  {k}')
    print('\nNão são GLB:')
    for p, t in falsos.items():
        print(f'  {t:5s} {p}')
    print('\nDuplicatas exatas:')
    for v in dup:
        print('  ' + '  =  '.join(v))
    print('\nEstruturas e plantas (aprovada / convertida / na zona):')
    for e in E:
        if not (e['aprovada'] and e['convertida'] and e['na_zona']):
            print(f"  {e['id']:28s} aprovada={e['aprovada']!s:5s} convertida={e['convertida']!s:5s} na_zona={e['na_zona']!s:5s} tris={e['tris']}")
    print('  (as demais: aprovadas, convertidas e postas numa zona)')
    print('\nSem referência:')
    for p in cat.get('sem referência', []):
        print('  ' + p)
    if '--json' in sys.argv:
        json.dump({'categorias': cat, 'falsos': falsos, 'duplicatas': dup, 'estruturas': E, 'lfs': lfs},
                  open(sys.argv[sys.argv.index('--json') + 1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
