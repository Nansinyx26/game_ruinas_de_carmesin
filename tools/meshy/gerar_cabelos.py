"""ECLIPSE ZERO · Cabelos gerados no Meshy por texto (peças soltas para a criação de personagem).

A lista fica em tools/meshy/cabelos.json (id, nome e a descrição em inglês). Em duas etapas, para
não gastar à toa: --etapa previa gera a malha (prévia, 20 créditos) e baixa a miniatura para conferir;
--etapa refino aplica a textura PBR (10 créditos) só nos ids pedidos. O GLB do Meshy fica em
.cache_criacao/meshy_cabelos/fonte/ (vem preso a uma cabeça de manequim e passa de 50 MB: não vai
para o repositório); tools/meshy/separar_cabelo.py tira o cabelo, reduz a malha e grava a peça em
assets/Criar_Personagem/Cabelo_Meshy/, que entra pelo tools/importar_criacao.py.
Créditos: nada é gasto sem --confirmar; sem ele, a estimativa do CLI e o saldo. Tarefa já feita não
é paga de novo (o registro fica em .cache_criacao/meshy_cabelos/).
A sessão é a do CLI (login pelo navegador): a chave não passa por aqui.
Uso: python3 tools/meshy/gerar_cabelos.py --etapa previa|refino [--ids a,b] [--confirmar]
"""
import argparse
import json
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LISTA = os.path.join(RAIZ, 'tools', 'meshy', 'cabelos.json')
REG = os.path.join(RAIZ, '.cache_criacao', 'meshy_cabelos')
SAIDA = os.path.join(REG, 'fonte')
CLI = ['npm', 'exec', '--yes', '--package=meshy-cli@0.4.0', '--', 'meshy']
AMB = dict(os.environ, NODE_USE_ENV_PROXY='1', NODE_NO_WARNINGS='1')
CUSTO = {'previa': 20, 'refino': 10}


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


def baixa(id_, task_id, nome):
    snap = os.path.join(REG, f'task_{task_id}.json')
    w = meshy('text-to-3d', 'wait', task_id, '--timeout', '1500', '--save-json', snap) if not os.path.exists(snap) else {'result': {'task': {'status': 'SUCCEEDED'}}}
    st = ((w.get('result') or {}).get('task') or {}).get('status')
    if st != 'SUCCEEDED':
        print('NÃO TERMINOU', id_, st, flush=True)
        return False
    os.makedirs(SAIDA, exist_ok=True)
    meshy('download', '--task-json', snap, '--model-format', 'glb', '--output', os.path.join(SAIDA, nome + '.glb'), '--workspace', RAIZ)
    meshy('download', '--task-json', snap, '--asset', 'thumbnail.primary', '--output', os.path.join(SAIDA, nome + '.png'), '--workspace', RAIZ)
    return os.path.exists(os.path.join(SAIDA, nome + '.glb'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--etapa', choices=['previa', 'refino'], required=True)
    ap.add_argument('--ids', default='')
    ap.add_argument('--confirmar', action='store_true')
    a = ap.parse_args()
    L = json.load(open(LISTA, encoding='utf-8'))
    ids = [x for x in (a.ids.split(',') if a.ids else L) if x]
    if a.etapa == 'previa':
        falta = [x for x in ids if not reg(x).get('previa')]
    else:
        falta = [x for x in ids if reg(x).get('previa') and not reg(x).get('refino')]
    saldo = (meshy('balance').get('result') or {}).get('balance')
    total = CUSTO[a.etapa] * len(falta)
    print(f'{a.etapa}: {len(falta)} cabelos · {CUSTO[a.etapa]} créditos cada, {total} no total · saldo {saldo}', flush=True)
    if not a.confirmar or not falta:
        return
    if saldo is not None and total > saldo:
        sys.exit('acima do saldo')
    for x in falta:
        r = reg(x)
        if a.etapa == 'previa':
            d = meshy('text-to-3d', 'create', '--mode', 'preview', '--prompt', L[x]['prompt'], '--target-formats', 'glb', '--async')
        else:
            d = meshy('text-to-3d', 'create', '--mode', 'refine', '--preview-task-id', r['previa'], '--enable-pbr', 'true', '--texture-resolution', '2k', '--target-formats', 'glb', '--async')
        tid = ((d.get('result') or {}).get('submission') or {}).get('task_id')
        if not tid:
            print('FALHOU', a.etapa, x, json.dumps(d.get('error'), ensure_ascii=False)[:300], flush=True)
            continue
        r['previa' if a.etapa == 'previa' else 'refino'] = tid
        grava(x, r)
        print('ENVIADA', a.etapa, x, tid, flush=True)
    for x in falta:
        r = reg(x)
        tid = r.get('previa' if a.etapa == 'previa' else 'refino')
        if tid:
            print('PRONTO' if baixa(x, tid, x if a.etapa == 'refino' else x + '_previa') else 'SEM GLB', a.etapa, x, flush=True)


if __name__ == '__main__':
    main()
