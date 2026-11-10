"""ECLIPSE ZERO · Fila de geração das barbas e bigodes no Meshy (texto → 3D), uma peça por estilo.

A biblioteca (31 estilos: curtas, médias, longas, bigodes e especiais) fica em tools/meshy/barbas.json,
cada um com a descrição própria de forma, comprimento, densidade e direção dos fios. A fila:
  - gera a PRÉVIA (malha; modelo mais recente do Meshy, triângulos, remalha com meta de 30 mil
    polígonos) e depois o REFINO (texturas PBR em 4K: cor, normal, metal e aspereza, sem luz pintada);
  - guarda o estado de cada estilo em .cache_criacao/meshy_barbas/<id>.json: o que já foi gerado nunca
    é pago de novo, e uma tarefa em andamento é retomada (esperada), não recriada;
  - confere o saldo antes de cada envio e para quando não há créditos para o próximo passo;
  - repete o que falhar (até 3 tentativas, com espera crescente) e registra o erro;
  - baixa o GLB e a miniatura em .cache_criacao/meshy_barbas/fonte/ (a fonte vem presa a uma cabeça de
    manequim e não vai para o repositório); tools/meshy/separar_cabelo.py --tipo barba separa a barba,
    mede o manequim e grava em assets/personagens/barbas/<categoria>/.
Créditos: nada é gasto sem --confirmar (sem ele: o plano, o custo e o saldo).
A sessão é a do meshy-cli (login pelo navegador): nenhuma chave passa por aqui, pelo código ou pelo
jogo — o jogo só carrega os arquivos já convertidos.
A mesma fila gera os penteados (--lista cabelos: tools/meshy/cabelos.json, registro em
.cache_criacao/meshy_cabelos/; tools/meshy/gerar_cabelos.py chama esta).
Uso: python3 tools/meshy/gerar_barbas.py [--lista barbas|cabelos] [--etapa previa|refino|tudo] [--ids a,b] [--confirmar]
"""
import argparse
import json
import os
import subprocess
import sys
import time

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LISTA = os.path.join(RAIZ, 'tools', 'meshy', 'barbas.json')
REG = os.path.join(RAIZ, '.cache_criacao', 'meshy_barbas')
FONTE = os.path.join(REG, 'fonte')


def usar_lista(nome):
    """Barbas (padrão) ou cabelos: a lista de estilos e a pasta do registro."""
    global LISTA, REG, FONTE
    LISTA = os.path.join(RAIZ, 'tools', 'meshy', nome + '.json')
    REG = os.path.join(RAIZ, '.cache_criacao', 'meshy_' + nome)
    FONTE = os.path.join(REG, 'fonte')
CLI = ['npm', 'exec', '--yes', '--package=meshy-cli@0.4.0', '--', 'meshy']
AMB = dict(os.environ, NODE_USE_ENV_PROXY='1', NODE_NO_WARNINGS='1')
CUSTO = {'previa': 20, 'refino': 10}
PREVIA = {'ai_model': 'latest', 'topology': 'triangle', 'target_polycount': 30000, 'should_remesh': True}
TENTATIVAS, ESPERA = 3, [30, 60, 120]


def meshy(*args, timeout=1800):
    p = subprocess.run(CLI + list(args) + ['--output-schema', 'v1', '--format', 'json', '--no-update-check'], capture_output=True, text=True, env=AMB, cwd=RAIZ, timeout=timeout)
    try:
        d = json.loads(p.stdout)
    except json.JSONDecodeError:
        d = {'ok': False, 'error': {'message': (p.stderr or p.stdout)[-300:]}}
    d['_exit'] = p.returncode
    return d


def saldo():
    d = meshy('balance')
    return (d.get('result') or d).get('balance')


def reg(id_):
    f = os.path.join(REG, id_ + '.json')
    return json.load(open(f)) if os.path.exists(f) else {}


def grava(id_, r):
    os.makedirs(REG, exist_ok=True)
    r['atualizado'] = time.strftime('%Y-%m-%d %H:%M:%S')
    json.dump(r, open(os.path.join(REG, id_ + '.json'), 'w'), indent=1)


def log(*a):
    os.makedirs(REG, exist_ok=True)
    linha = time.strftime('%H:%M:%S ') + ' '.join(str(x) for x in a)
    print(linha, flush=True)
    with open(os.path.join(REG, 'fila.log'), 'a') as f:
        f.write(linha + '\n')


def tarefa_id(d):
    r = d.get('result') or {}
    return (r.get('task') or {}).get('id') or r.get('task_id') or r.get('id')


def esperar(task_id):
    """Espera a tarefa (retoma se já existe) e devolve o JSON salvo, ou None se falhou."""
    snap = os.path.join(REG, f'task_{task_id}.json')
    if os.path.exists(snap):
        return snap
    w = meshy('text-to-3d', 'wait', task_id, '--timeout', '1500', '--save-json', snap)
    st = ((w.get('result') or {}).get('task') or {}).get('status')
    if st != 'SUCCEEDED':
        if os.path.exists(snap):
            os.remove(snap)
        log('  tarefa', task_id, 'terminou como', st, (w.get('error') or {}).get('message', ''))
        return None
    return snap


def baixar(id_, snap, nome):
    os.makedirs(FONTE, exist_ok=True)
    meshy('download', '--task-json', snap, '--model-format', 'glb', '--output', os.path.join(FONTE, nome + '.glb'), '--workspace', RAIZ)
    meshy('download', '--task-json', snap, '--asset', 'thumbnail.primary', '--output', os.path.join(FONTE, nome + '.png'), '--workspace', RAIZ)
    return os.path.exists(os.path.join(FONTE, nome + '.glb'))


def passo(id_, cfg, etapa, r):
    """Uma etapa de um estilo, com tentativas. Devolve True quando a etapa está pronta."""
    chave = etapa
    if r.get(chave + '_ok'):
        return True
    for t in range(TENTATIVAS):
        if not r.get(chave):
            if etapa == 'previa':
                d = meshy('text-to-3d', 'create', '--mode', 'preview', '--prompt', cfg['prompt'], '--pose-mode', 'auto', '--data', json.dumps(PREVIA), '--async')
            else:
                d = meshy('text-to-3d', 'create', '--mode', 'refine', '--preview-task-id', r['previa'], '--enable-pbr', 'true', '--texture-resolution', '4k',
                          '--remove-lighting', 'true', '--texture-prompt', cfg.get('textura', 'realistic individual hair strands, natural colour variation, matte skin'), '--async')
            tid = tarefa_id(d)
            if not tid:
                r['erro'] = (d.get('error') or {}).get('message', 'sem id da tarefa')
                grava(id_, r)
                log(f'  {id_} {etapa}: falhou ao enviar ({r["erro"]}); tentativa {t + 1}/{TENTATIVAS}')
                time.sleep(ESPERA[t])
                continue
            r[chave] = tid
            grava(id_, r)
            log(f'  {id_} {etapa}: tarefa {tid}')
        snap = esperar(r[chave])
        if snap and baixar(id_, snap, id_ + ('_previa' if etapa == 'previa' else '')):
            r[chave + '_ok'] = True
            r.pop('erro', None)
            grava(id_, r)
            log(f'  {id_} {etapa}: pronto')
            return True
        r.pop(chave, None)   # (falhou: a próxima tentativa cria outra tarefa)
        r['erro'] = f'{etapa} falhou'
        grava(id_, r)
        log(f'  {id_} {etapa}: falhou; tentativa {t + 1}/{TENTATIVAS}')
        if t + 1 < TENTATIVAS:
            time.sleep(ESPERA[t])
    return False


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--lista', choices=['barbas', 'cabelos'], default='barbas')
    ap.add_argument('--etapa', choices=['previa', 'refino', 'tudo'], default='tudo')
    ap.add_argument('--ids', default='', help='estilos separados por vírgula (sem: todos)')
    ap.add_argument('--confirmar', action='store_true', help='gasta os créditos')
    a = ap.parse_args(argv)
    usar_lista(a.lista)
    lista = json.load(open(LISTA, encoding='utf-8'))
    ids = [x for x in (a.ids.split(',') if a.ids else lista.keys()) if x in lista]
    etapas = ['previa', 'refino'] if a.etapa == 'tudo' else [a.etapa]
    # plano e custo (o que já foi feito não conta)
    plano = []
    for id_ in ids:
        r = reg(id_)
        for e in etapas:
            if not r.get(e + '_ok'):
                plano.append((id_, e, 0 if r.get(e) else CUSTO[e]))   # (tarefa já criada: só esperar e baixar, sem custo)
    custo = sum(c for _, _, c in plano)
    s = saldo()
    log(f'fila: {len(plano)} passos em {len(ids)} estilos, {custo} créditos; saldo {s}')
    if not a.confirmar:
        for id_, e, c in plano[:40]:
            print(f'  {id_:28s} {e:7s} {c:3d}  ({lista[id_].get("categoria", a.lista)}: {lista[id_]["nome"]})')
        print('(nada foi gasto: rode com --confirmar)')
        return
    for id_ in ids:
        cfg, r = lista[id_], reg(id_)
        for e in etapas:
            if r.get(e + '_ok'):
                continue
            if e == 'refino' and not r.get('previa_ok'):
                break
            s = saldo()
            if not r.get(e) and (s is None or s < CUSTO[e]):
                log(f'saldo {s} não basta para {id_} {e} ({CUSTO[e]}): a fila para aqui; rode de novo depois de recarregar')
                return
            if not passo(id_, cfg, e, r):
                log(f'{id_}: {e} não saiu depois de {TENTATIVAS} tentativas (fica no registro; a fila segue)')
                break
    log('fila terminada')


if __name__ == '__main__':
    sys.exit(main())
