"""ECLIPSE ZERO · Topologia inteligente em LOTE CONTROLADO, com validação peça a peça (bpy)
---------------------------------------------------------------------------
Nada é substituído: cada peça é lida da fonte (que fica intacta), tratada pela regra do TIPO dela e
gravada em assets/_retopo/<mesmo caminho>.glb, com a validação e o relatório
(docs/topologia/LOTE.md e assets/_retopo/lote.json). O jogo continua com as versões dele até
uma peça ser aprovada e trocada de propósito.
Regras por tipo (não é a mesma para tudo):
  rosto      remalha em quads com simetria (QuadriFlow) no orçamento do rosto + assado da cor e
             das normais da fonte (os detalhes viram relevo)
  armadura   peça rígida: QuadriFlow sem simetria forçada, com as quinas preservadas, + assado
  cabelo     NÃO remalha (o QuadriFlow fundiria as mechas num bloco): redução MECHA A MECHA
             (cada casca solta reduz sozinha, a borda e a UV preservadas), até o orçamento
Validação de cada peça (passa ou não passa):
  - distância da fonte à malha nova (média e 95%), em fração da diagonal da peça: o desvio de 95%
    tem de ficar abaixo de 1,2% (rosto), 1,5% (armadura) ou 2,5% (cabelo)
  - malha nova sem faces degeneradas, sem arestas não manifold novas, sem vértices soltos
  - triângulos dentro do orçamento do tipo
Rode: python3 tools/blender/topologia/lote.py <arquivo.glb ...>  (ou: rostos | kael | cabelos)
---------------------------------------------------------------------------
"""
import json
import os
import sys
import time

import bmesh
import bpy
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import retopologia as R   # noqa: E402
import utils as U   # noqa: E402

RAIZ = U.RAIZ
SAIDA = os.path.join(RAIZ, 'assets', '_retopo')
REGRAS = {
    'rosto': dict(metodo='quads', tipo='humanoide', quads=6000, limite=0.012, orcamento=12000),
    'armadura': dict(metodo='quads', tipo='rigido', quads=5200, limite=0.015, orcamento=12000),
    'cabelo': dict(metodo='mechas', alvo=11000, limite=0.025, orcamento=12000),
}
GRUPOS = {
    'rostos': lambda: sorted(os.path.join('assets', 'Criar_Personagem', 'Rosto', f) for f in os.listdir(os.path.join(RAIZ, 'assets', 'Criar_Personagem', 'Rosto')) if f.endswith('.glb')),
    'kael': lambda: sorted(os.path.join('assets', 'modelos', 'armaduras', 'kael', f) for f in os.listdir(os.path.join(RAIZ, 'assets', 'modelos', 'armaduras', 'kael')) if f.endswith('.glb')),
    'cabelos': lambda: [os.path.join('assets', 'Criar_Personagem', 'Cabelo', f) for f in ('Cabelo_6.glb', 'Cabelo_4.glb', 'cabelo_1.glb')],
}


def tipo_de(caminho):
    s = caminho.lower()
    return 'cabelo' if 'cabelo' in s or 'hair' in s else 'rosto' if '/rosto' in s else 'armadura'


def distancia(fonte, nova, amostras=6000):
    """Desvio da superfície: de pontos da fonte até a malha nova (média e 95%), em fração da diagonal."""
    bm = bmesh.new()
    bm.from_mesh(nova.data)
    arv = BVHTree.FromBMesh(bm)
    V = fonte.data.vertices
    passo = max(1, len(V) // amostras)
    ds = []
    for i in range(0, len(V), passo):
        r = arv.find_nearest(V[i].co)
        if r[0] is not None:
            ds.append(r[3])
    bm.free()
    diag = max(fonte.dimensions.length, 1e-6)
    ds.sort()
    return dict(media=round(sum(ds) / max(1, len(ds)) / diag, 5), p95=round(ds[int(len(ds) * 0.95)] / diag, 5) if ds else 1.0)


def mechas(fonte, alvo):
    """Cabelo: cada casca (mecha) reduz sozinha pela mesma fração, sem fundir mechas."""
    nova = R.copia(fonte, fonte.name + '_mechas')
    tris = sum(len(p.vertices) - 2 for p in nova.data.polygons)
    fr = max(0.02, min(1.0, alvo / max(1, tris)))
    m = nova.modifiers.new('reduz', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = fr
    m.use_collapse_triangulate = True
    U.ativar(nova)
    bpy.ops.object.modifier_apply(modifier=m.name)
    return nova, dict(metodo='redução mecha a mecha (colapso; UV e bordas das mechas preservadas)', fracao=round(fr, 4))


def processar(rel):
    t0 = time.time()
    tipo = tipo_de(rel)
    Rg = REGRAS[tipo]
    U.limpar_cena()
    fonte = R.importar(os.path.join(RAIZ, rel), 'Fonte')
    antes = R.diagnosticar(fonte)
    R.limpar(fonte)
    if Rg['metodo'] == 'quads':
        nova, info = R.retopologia(fonte, Rg['tipo'], nome='Retopo', quads=Rg['quads'])
        R.uv(nova)
        try:
            _, binfo = R.assar(nova, fonte, lado=1024, extrusao=max(fonte.dimensions) * 0.01, prefixo='retopo')
            info['assado'] = binfo
        except Exception as err:   # noqa: BLE001  (fonte sem textura: fica a cor do material)
            info['assado'] = f'sem assado ({err})'
    else:
        nova, info = mechas(fonte, Rg['alvo'])
    depois = R.diagnosticar(nova)
    dist = distancia(fonte, nova)
    falhas = []
    if dist['p95'] > Rg['limite']:
        falhas.append(f"desvio de 95% {dist['p95'] * 100:.2f}% acima de {Rg['limite'] * 100:.1f}%")
    if depois['degeneradas']:
        falhas.append(f"{depois['degeneradas']} faces degeneradas")
    if depois['nao_manifold'] > antes['nao_manifold']:
        falhas.append(f"arestas não manifold: {antes['nao_manifold']} → {depois['nao_manifold']}")
    if depois['soltos']:
        falhas.append(f"{depois['soltos']} vértices soltos")
    if depois['triangulos'] > Rg['orcamento']:
        falhas.append(f"{depois['triangulos']} triângulos acima do orçamento {Rg['orcamento']}")
    destino = os.path.join(SAIDA, rel)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    fonte.hide_set(True)
    U.exportar_glb(destino, [nova])
    r = dict(arquivo=rel, tipo=tipo, antes=antes, depois=depois, distancia=dist, metodo=info.get('metodo'), info={k: v for k, v in info.items() if k != 'metodo'},
             aprovado=not falhas, falhas=falhas, saida=os.path.relpath(destino, RAIZ), segundos=round(time.time() - t0))
    print('PECA', json.dumps({k: r[k] for k in ('arquivo', 'tipo', 'aprovado', 'falhas', 'distancia')}, ensure_ascii=False), flush=True)
    return r


def relatorio(L):
    os.makedirs(SAIDA, exist_ok=True)
    with open(os.path.join(SAIDA, 'lote.json'), 'w', encoding='utf-8') as f:
        json.dump(L, f, ensure_ascii=False, indent=1)
    ok = [r for r in L if r.get('aprovado')]
    linhas = ['# Topologia inteligente — lote controlado com validação peça a peça', '',
              f'Gerado por `tools/blender/topologia/lote.py`. {len(L)} peças processadas, **{len(ok)} aprovadas**. '
              'As fontes não foram alteradas; as saídas estão em `assets/_retopo/` (o jogo continua com as versões dele até uma peça ser trocada de propósito).', '',
              '| peça | tipo | método | triângulos antes → depois | quads | desvio médio / 95% (da diagonal) | resultado |', '|---|---|---|---|---|---|---|']
    for r in L:
        if 'erro' in r:
            linhas.append(f"| `{r['arquivo']}` | {r.get('tipo', '')} | — | — | — | — | erro: {r['erro']} |")
            continue
        a, d, ds = r['antes'], r['depois'], r['distancia']
        linhas.append(f"| `{r['arquivo']}` | {r['tipo']} | {r['metodo']} | {a['triangulos']:,} → {d['triangulos']:,} | {d['quads_pct']}% | "
                      f"{ds['media'] * 100:.2f}% / {ds['p95'] * 100:.2f}% | {'aprovada' if r['aprovado'] else 'reprovada: ' + '; '.join(r['falhas'])} |")
    linhas += ['', '## Regras', '']
    for t, Rg in REGRAS.items():
        linhas.append(f"- **{t}**: {Rg['metodo']}, desvio de 95% até {Rg['limite'] * 100:.1f}% da diagonal, até {Rg['orcamento']:,} triângulos.")
    with open(os.path.join(RAIZ, 'docs', 'topologia', 'LOTE.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(linhas) + '\n')


if __name__ == '__main__':
    args = U.args()
    arquivos = []
    for a in args:
        arquivos += GRUPOS[a]() if a in GRUPOS else [a]
    anterior = []
    p = os.path.join(SAIDA, 'lote.json')
    if os.path.exists(p):
        with open(p, encoding='utf-8') as f:
            anterior = [r for r in json.load(f) if r['arquivo'] not in arquivos]
    L = []
    for rel in arquivos:
        try:
            L.append(processar(rel))
        except Exception as err:   # noqa: BLE001
            L.append(dict(arquivo=rel, tipo=tipo_de(rel), erro=str(err)[:200], aprovado=False))
            print('ERRO', rel, err, flush=True)
        relatorio(anterior + L)
    relatorio(anterior + L)
