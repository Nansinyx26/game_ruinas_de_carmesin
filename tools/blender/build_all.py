"""Roda todos os scripts de asset (tools/blender/asset_*.py) e gera assets/REPORT.md.

Cada script grava tools/blender/_saida/<nome>.json (nome, tipo, triângulos, orçamento, .glb,
tamanho, prévia, medidas, materiais); este junta tudo numa tabela com as prévias.

  python3 tools/blender/build_all.py                 # com o módulo bpy
  blender -b -P tools/blender/build_all.py           # com o Blender instalado (cada asset roda
                                                     # num Blender novo, em segundo plano)
  python3 tools/blender/build_all.py -- lamina       # só os scripts com 'lamina' no nome
"""
import glob
import json
import os
import subprocess
import sys
import time

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
SAIDA = os.path.join(AQUI, '_saida')
REPORT = os.path.join(RAIZ, 'assets', 'REPORT.md')


def comando(script):
    """Mesmo jeito de rodar de quem chamou: Blender (-b -P) ou python3 com o bpy."""
    try:
        import bpy
        if bpy.app.binary_path and not bpy.app.binary_path.endswith(('python', 'python3')) and os.path.basename(sys.executable) != os.path.basename(bpy.app.binary_path):
            return [bpy.app.binary_path, '-b', '-P', script]
    except Exception:
        pass
    return [sys.executable, script]


def main():
    filtro = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    scripts = sorted(glob.glob(os.path.join(AQUI, 'asset_*.py')))
    if filtro:
        scripts = [s for s in scripts if any(f in os.path.basename(s) for f in filtro)]
    falhas = []
    for s in scripts:
        t0 = time.time()
        r = subprocess.run(comando(s), cwd=RAIZ, capture_output=True, text=True)
        ok = r.returncode == 0 and 'ASSET ' in r.stdout
        print(f"{'ok ' if ok else 'ERRO'} {os.path.basename(s)} ({time.time() - t0:.0f}s)")
        if not ok:
            falhas.append(os.path.basename(s))
            print((r.stdout + r.stderr)[-2500:])
    itens = [json.load(open(f, encoding='utf-8')) for f in sorted(glob.glob(os.path.join(SAIDA, '*.json')))]
    L = ['# Assets gerados no Blender', '', 'Gerado por `tools/blender/build_all.py` a partir dos scripts `tools/blender/asset_*.py` '
         '(cada asset é um script reproduzível; o que não virou script não conta como entregue).', '',
         '| Asset | Tipo | Triângulos | Orçamento | Arquivo | Tamanho | Medidas (m) | Materiais | Prévia |', '|---|---|---|---|---|---|---|---|---|']
    for d in itens:
        orc = d.get('orcamento')
        estado = '✓' if not orc or d['tris'] <= orc else '✗ acima'
        prev = f"![{d['nome']}]({os.path.relpath(os.path.join(RAIZ, d['previa']), os.path.dirname(REPORT))})" if d.get('previa') else '—'
        L.append(f"| {d['nome']} | {d['tipo']} | {d['tris']:,} {estado} | {orc or '—'} | `{d['glb']}` | {d['kb']} KB | "
                 f"{' × '.join(str(v) for v in d['tamanho_m'])} | {len(d['materiais'])} | {prev} |".replace(',', '.'))
    if falhas:
        L += ['', '**Falharam:** ' + ', '.join(falhas)]
    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')
    print('relatório:', REPORT)
    return 1 if falhas else 0


if __name__ == '__main__':
    sys.exit(main())
