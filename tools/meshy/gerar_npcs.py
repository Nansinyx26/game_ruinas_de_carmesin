"""ECLIPSE ZERO · NPCs (moradores) gerados no Meshy por texto, em A-pose, pelo meshy-cli 0.4.0.

A lista fica em tools/meshy/npcs.json (id, nome, estilo, descrição em inglês). Cada NPC é uma
prévia text-to-3d em A-pose (a malha) e o refinamento (textura PBR); o GLB vai para
assets/npcs/meshy/<id>.glb. Daí o tools/blender/npcs/npc_meshy.py põe o esqueleto do jogo
(o mesmo dos personagens criados) e converte para o motor.
Créditos: nada é gasto sem --confirmar; sem ele, só a estimativa do CLI e o saldo. NPC já baixado
não é pago de novo; prévia já feita não é refeita (o registro fica em .cache_criacao/meshy_npcs/).
A sessão é a do CLI (login pelo navegador ou MESHY_API_KEY no ambiente): a chave não passa por aqui.
Uso: python3 tools/meshy/gerar_npcs.py [--confirmar] [--ids a,b] [--max-creditos N]
"""
import argparse
import json
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LISTA = os.path.join(RAIZ, 'tools', 'meshy', 'npcs.json')
REG = os.path.join(RAIZ, '.cache_criacao', 'meshy_npcs')
SAIDA = os.path.join(RAIZ, 'assets', 'npcs', 'meshy')
CLI = ['npm', 'exec', '--yes', '--package=meshy-cli@0.4.0', '--', 'meshy']
AMB = dict(os.environ, NODE_USE_ENV_PROXY='1', NODE_NO_WARNINGS='1')


def meshy(*args, timeout=1800):
    p = subprocess.run(CLI + list(args) + ['--output-schema', 'v1', '--format', 'json', '--no-update-check'], capture_output=True, text=True, env=AMB, cwd=RAIZ, timeout=timeout)
    try:
        d = json.loads(p.stdout)
    except json.JSONDecodeError:
        d = {'ok': False, 'error': {'message': (p.stderr or p.stdout)[-300:]}}
    d['_exit'] = p.returncode
    return d


def reg(id_):
    f = os.path.join(REG, id_ + '.json')
    return json.load(open(f)) if os.path.exists(f) else {}


def grava(id_, r):
    os.makedirs(REG, exist_ok=True)
    json.dump(r, open(os.path.join(REG, id_ + '.json'), 'w'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', default='')
    ap.add_argument('--confirmar', action='store_true')
    ap.add_argument('--max-creditos', type=int, default=0)
    a = ap.parse_args()
    L = json.load(open(LISTA, encoding='utf-8'))
    ids = [x for x in (a.ids.split(',') if a.ids else L) if x]
    falta = [x for x in ids if not os.path.exists(os.path.join(SAIDA, x + '.glb'))]
    est = meshy('make', L[falta[0]]['prompt'] if falta else 'x', '--dry-run')
    por = (est.get('result') or {}).get('estimated_credits') or 30
    saldo = (meshy('balance').get('result') or {}).get('balance')
    total = por * len(falta)
    print(f'{len(falta)} NPCs a gerar · {por} créditos cada (prévia + textura), {total} no total · saldo {saldo}', flush=True)
    if not a.confirmar or not falta:
        return
    if (a.max_creditos and total > a.max_creditos) or (saldo is not None and total > saldo):
        sys.exit('acima do limite ou do saldo')
    os.makedirs(SAIDA, exist_ok=True)
    # 1) prévias (a malha em A-pose), todas de uma vez
    for x in falta:
        r = reg(x)
        if r.get('previa'):
            continue
        d = meshy('text-to-3d', 'create', '--mode', 'preview', '--prompt', L[x]['prompt'], '--pose-mode', 'a-pose', '--target-formats', 'glb', '--async')
        tid = ((d.get('result') or {}).get('submission') or {}).get('task_id')
        if not tid:
            print('FALHOU prévia', x, json.dumps(d.get('error'), ensure_ascii=False)[:300], flush=True)
            continue
        r['previa'] = tid; grava(x, r); print('PRÉVIA ENVIADA', x, tid, flush=True)
    # 2) espera cada prévia e manda o refinamento (textura PBR)
    for x in falta:
        r = reg(x)
        if not r.get('previa') or r.get('refino'):
            continue
        w = meshy('text-to-3d', 'wait', r['previa'], '--timeout', '1500')
        st = ((w.get('result') or {}).get('task') or {}).get('status')
        if st != 'SUCCEEDED':
            print('PRÉVIA NÃO TERMINOU', x, st, flush=True); continue
        d = meshy('text-to-3d', 'create', '--mode', 'refine', '--preview-task-id', r['previa'], '--enable-pbr', 'true', '--texture-resolution', '2k', '--target-formats', 'glb', '--async')
        tid = ((d.get('result') or {}).get('submission') or {}).get('task_id')
        if not tid:
            print('FALHOU refino', x, json.dumps(d.get('error'), ensure_ascii=False)[:300], flush=True); continue
        r['refino'] = tid; grava(x, r); print('REFINO ENVIADO', x, tid, flush=True)
    # 3) espera os refinamentos e baixa o GLB e a prévia
    for x in falta:
        r = reg(x)
        if not r.get('refino'):
            continue
        snap = os.path.join(REG, f"task_{r['refino']}.json")
        w = meshy('text-to-3d', 'wait', r['refino'], '--timeout', '1500', '--save-json', snap) if not os.path.exists(snap) else {'result': {'task': {'status': 'SUCCEEDED'}}}
        st = ((w.get('result') or {}).get('task') or {}).get('status')
        if st != 'SUCCEEDED':
            print('REFINO NÃO TERMINOU', x, st, flush=True); continue
        out = os.path.join(SAIDA, x + '.glb')
        meshy('download', '--task-json', snap, '--model-format', 'glb', '--output', out, '--workspace', RAIZ)
        meshy('download', '--task-json', snap, '--asset', 'thumbnail.primary', '--output', os.path.join(REG, x + '.png'), '--workspace', RAIZ)
        print('PRONTO' if os.path.exists(out) else 'SEM GLB', x, flush=True)


if __name__ == '__main__':
    main()
