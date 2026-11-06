"""ECLIPSE ZERO · Estruturas que faltam → Meshy (imagem para 3D, com textura), pelo meshy-cli 0.4.0.

A lista fica em tools/meshy/estruturas_faltantes.json: cada peça tem o recorte da folha de
referência enviada (assets/referencias/estruturas_meshy/<id>.png), o estilo (medieval ou
cyberpunk) e o tipo (estrutura ou item). Cada peça vira uma tarefa image-to-3d (modelo padrão,
texturizada, mapas PBR) e o GLB é baixado para a pasta das estruturas enviadas:
  medieval  → assets/estruturas_ambiente/Estruturas_Superficie/Meshy/<id>.glb
  cyberpunk → assets/estruturas_ambiente/Estruturas_Subsolo_tecnologico/Meshy/<id>.glb
dali seguem o mesmo caminho das outras (tools/estruturas/processar.sh: redução no Blender e jogo).

Créditos: nada é gasto sem --confirmar. Sem ele, o script só mostra a estimativa do próprio CLI
(meshy make --dry-run) e o saldo. Com --max-creditos, recusa começar acima do limite.
A sessão do Meshy é a do CLI (meshy auth login: navegador; ou MESHY_API_KEY no ambiente): a chave
nunca passa por este script, pelo repositório ou pelo log. Os registros das tarefas (com os
endereços temporários de download) ficam em .cache_criacao/meshy_output/ (fora do git).

Uso (na pasta do projeto):
  python3 tools/meshy/gerar_estruturas.py                         # estimativa e saldo
  python3 tools/meshy/gerar_estruturas.py --confirmar --ids a,b,c # envia, espera e baixa
  python3 tools/meshy/gerar_estruturas.py --confirmar --max-creditos 400
Peça que já tem o GLB na pasta de destino é pulada (não paga de novo).
"""
import argparse
import json
import os
import subprocess
import sys
import time

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LISTA = os.path.join(RAIZ, 'tools', 'meshy', 'estruturas_faltantes.json')
PROJETOS = os.path.join(RAIZ, '.cache_criacao', 'meshy_output')
DESTINO = {'medieval': os.path.join('assets', 'estruturas_ambiente', 'Estruturas_Superficie', 'Meshy'),
           'cyberpunk': os.path.join('assets', 'estruturas_ambiente', 'Estruturas_Subsolo_tecnologico', 'Meshy')}
CLI = ['npm', 'exec', '--yes', '--package=meshy-cli@0.4.0', '--', 'meshy']
COMUM = ['--output-schema', 'v1', '--format', 'json', '--no-update-check']
# o fetch do Node só passa pelo proxy do ambiente com isto (Node >= 22.21)
AMB = dict(os.environ, NODE_USE_ENV_PROXY='1', NODE_NO_WARNINGS='1')


def meshy(*args, ws=True, timeout=1200):
    cmd = CLI + list(args) + (['--workspace', RAIZ] if ws else []) + COMUM
    p = subprocess.run(cmd, capture_output=True, text=True, env=AMB, cwd=RAIZ, timeout=timeout)
    try:
        d = json.loads(p.stdout)
    except json.JSONDecodeError:
        d = {'ok': False, 'error': {'code': 'sem_json', 'message': (p.stderr or p.stdout)[-400:]}}
    d['_exit'] = p.returncode
    return d


def destino(id_, P):
    return os.path.join(RAIZ, DESTINO[P['estilo']], f'{id_}.glb')


def estimar(ids, L):
    d = meshy('make', os.path.join(RAIZ, L[ids[0]]['referencia']), '--dry-run', ws=False)
    por = (d.get('result') or {}).get('estimated_credits')
    s = meshy('balance', ws=False)
    saldo = (s.get('result') or {}).get('balance')
    return por, saldo


def textura(P):
    # sem marcas nem logotipos reais: só o letreiro genérico da referência
    base = 'game-ready environment asset, stylized realistic, clean materials, no real-world brand logos'
    return f"{P['nome']}. {base}."


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--ids', default='', help='ids separados por vírgula (padrão: todos os que faltam)')
    ap.add_argument('--confirmar', action='store_true', help='envia as tarefas (gasta créditos)')
    ap.add_argument('--max-creditos', type=int, default=0)
    a = ap.parse_args()
    L = json.load(open(LISTA, encoding='utf-8'))
    ids = [x for x in (a.ids.split(',') if a.ids else L) if x]
    for x in ids:
        if x not in L:
            sys.exit(f'peça desconhecida: {x}')
    falta = [x for x in ids if not os.path.exists(destino(x, L[x]))]
    por, saldo = estimar(falta or ids, L)
    total = (por or 0) * len(falta)
    print(f'{len(falta)} peças a gerar · estimativa do CLI: {por} créditos por peça, {total} no total · saldo: {saldo}', flush=True)
    if not a.confirmar or not falta:
        return
    if a.max_creditos and total > a.max_creditos:
        sys.exit(f'estimativa {total} acima do limite --max-creditos {a.max_creditos}')
    if saldo is not None and total > saldo:
        sys.exit(f'saldo {saldo} não cobre a estimativa {total}')
    os.makedirs(PROJETOS, exist_ok=True)
    # 1) envia todas (uma tarefa por peça) e registra cada uma num projeto do CLI
    tarefas = {}
    for x in falta:
        P = L[x]
        reg = os.path.join(PROJETOS, x, 'envio.json')
        if os.path.exists(reg):   # já enviada antes (o script caiu no meio): só espera
            tarefas[x] = json.load(open(reg))
            continue
        d = meshy('image-to-3d', 'create', '--image-url', os.path.join(RAIZ, P['referencia']), '--model-type', 'standard',
                  '--should-texture', 'true', '--enable-pbr', 'true', '--texture-resolution', '2k', '--texture-prompt', textura(P),
                  '--target-formats', 'glb', '--async', ws=False)
        tid = ((d.get('result') or {}).get('submission') or {}).get('task_id')
        if not tid:
            print('FALHOU envio', x, json.dumps(d.get('error'), ensure_ascii=False), flush=True)
            if d['_exit'] == 9:   # sem crédito: para tudo
                break
            continue
        i = meshy('project', 'init', '--root', PROJETOS, '--name', x, '--task-id', tid, '--task-type', 'image-to-3d')
        pdir = (i.get('result') or {}).get('project_dir') or os.path.join(PROJETOS, x)
        tarefas[x] = dict(task_id=tid, project_dir=pdir)
        os.makedirs(os.path.join(PROJETOS, x), exist_ok=True)
        json.dump(tarefas[x], open(reg, 'w'))
        print('ENVIADA', x, tid, flush=True)
    # 2) espera cada uma, baixa o GLB e a prévia
    rel = []
    for x, T in tarefas.items():
        t0 = time.time()
        w = meshy('image-to-3d', 'wait', T['task_id'], '--timeout', '1500', '--project', T['project_dir'], '--stage', 'textured', timeout=1700)
        tk = (w.get('result') or {}).get('task') or {}
        st = tk.get('status')
        if st != 'SUCCEEDED':
            print('NÃO TERMINOU', x, st, json.dumps(w.get('error'), ensure_ascii=False)[:300], flush=True)
            rel.append(dict(id=x, task_id=T['task_id'], status=st))
            continue
        snap = os.path.join(T['project_dir'], f"task_{T['task_id']}.json")
        out = destino(x, L[x])
        os.makedirs(os.path.dirname(out), exist_ok=True)
        g = meshy('download', '--task-json', snap, '--asset', 'model.glb', '--output', out, '--project', T['project_dir'], '--stage', 'textured')
        if not os.path.exists(out):
            g = meshy('download', '--task-json', snap, '--model-format', 'glb', '--output', out, '--project', T['project_dir'], '--stage', 'textured')
        prev = os.path.join(T['project_dir'], 'previa.png')
        meshy('download', '--task-json', snap, '--asset', 'thumbnail.primary', '--output', prev, '--project', T['project_dir'], '--stage', 'preview')
        cred = tk.get('consumed_credits')
        ok = os.path.exists(out)
        print('PRONTA' if ok else 'SEM GLB', x, T['task_id'], f'créditos {cred}', f'{round(time.time() - t0)} s', '' if ok else json.dumps(g.get('error'), ensure_ascii=False)[:300], flush=True)
        rel.append(dict(id=x, task_id=T['task_id'], status=st, creditos=cred, glb=os.path.relpath(out, RAIZ) if ok else None,
                        previa=os.path.relpath(prev, RAIZ) if os.path.exists(prev) else None))
    with open(os.path.join(PROJETOS, f'lote_{int(time.time())}.json'), 'w', encoding='utf-8') as f:
        json.dump(rel, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
