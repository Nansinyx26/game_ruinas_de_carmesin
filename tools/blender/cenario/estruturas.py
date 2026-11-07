"""ECLIPSE ZERO · Estruturas e plantas enviadas (assets/estruturas_ambiente, assets/Composição_de_Plantas)
→ versões de jogo, no Blender (bpy). Uma por vez, sem tocar nos originais.

As fontes têm de 28 mil a 1,9 milhão de triângulos numa malha só (geradas por IA), com a cor, o
metal/aspereza e o mapa de normais em textura. Para tempo real:
  1. importar (a cópia descomprimida, quando a fonte vem com Draco: tools/estruturas/descomprimir_draco.mjs)
  2. limpar (solda vértices repetidos, tira degeneradas)
  3. reduzir por COLAPSO até o orçamento do tipo: a UV e as texturas da fonte continuam valendo
     (o detalhe fino fica no mapa de normais da própria fonte; não há assado nem textura nova)
  4. medir o desvio da superfície (da fonte até a malha nova, em fração da diagonal) e reprovar a
     peça que passar do limite do tipo, com o motivo no relatório
  5. LOD de longe (um quarto do orçamento) e as texturas reduzidas para o tamanho do tipo
  6. exportar assets/models/estruturas/<id>.glb (+ <id>_lod.glb) e a prévia .png
Tipos (pela pasta e pelo nome): estrutura (prédios), item (objetos do cenário), arvore, planta.
Relatório: assets/models/estruturas/estruturas.json (antes/depois, desvio, aprovada ou não).
Rode: python3 tools/blender/cenario/estruturas.py <arquivo.glb ...> [--fonte-original <caminho>]
"""
import json
import os
import re
import sys
import time
import unicodedata

import bpy
import bmesh   # noqa: F401  (depois do bpy)

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'topologia'))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import retopologia as R   # noqa: E402
import utils as U   # noqa: E402
from lote import distancia   # noqa: E402

RAIZ = U.RAIZ
SAIDA = os.path.join(RAIZ, 'assets', 'models', 'estruturas')
# orçamento (triângulos), limite do desvio de 95% (fração da diagonal) e lado das texturas
TIPOS = {
    'estrutura': dict(tris=16000, limite=0.012, lado=1024),
    'item': dict(tris=6000, limite=0.015, lado=512),
    'arvore': dict(tris=9000, limite=0.02, lado=1024),
    'planta': dict(tris=6000, limite=0.025, lado=512),
}


def ident(caminho):
    n = os.path.splitext(os.path.basename(caminho))[0]
    n = unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode()
    n = re.sub(r'[^a-zA-Z0-9]+', '_', n).strip('_').lower()
    n = re.sub(r'composicao_de_plantas_?(\d+)', r'planta_\1', n)
    return n


def tipo_de(caminho, nome):
    s = (caminho + ' ' + nome).lower()
    if 'planta' in s:
        return 'planta'
    if 'arvore' in s:
        return 'arvore'
    if 'item_ambiente' in s or 'fast_travel' in s or 'quadro' in s:
        return 'item'
    return 'estrutura'


def estilo_de(caminho):
    s = caminho.lower()
    return 'cyberpunk' if 'subsolo' in s or 'cbp' in s or 'cyber' in s or 'neon' in s else 'medieval'


def reduzir(fonte, alvo):
    nova = R.copia(fonte, 'Estrutura')
    tris = sum(len(p.vertices) - 2 for p in nova.data.polygons)
    passadas = 0
    while tris > alvo * 1.05 and passadas < 3:
        m = nova.modifiers.new('reduz', 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = max(0.002, min(1.0, alvo / tris * (1.0 if passadas == 0 else 0.97)))
        m.use_collapse_triangulate = True
        U.ativar(nova)
        bpy.ops.object.modifier_apply(modifier=m.name)
        tris = sum(len(p.vertices) - 2 for p in nova.data.polygons)
        passadas += 1
    for p in nova.data.polygons:
        p.use_smooth = True
    nova.data.validate(clean_customdata=False)
    return nova, passadas


def texturas(objs, lado):
    feitas = set()
    for o in objs:
        for mt in o.data.materials:
            if not mt or not mt.use_nodes:
                continue
            for n in mt.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image and n.image.name not in feitas:
                    im = n.image
                    if im.size[0] > lado or im.size[1] > lado:
                        im.scale(lado, lado)
                    im.pack()
                    feitas.add(im.name)
    return len(feitas)


def processar(arq, original=None):
    t0 = time.time()
    rel = os.path.relpath(original or arq, RAIZ)
    nome = ident(original or arq)
    tipo = tipo_de(rel, nome)
    T = TIPOS[tipo]
    U.limpar_cena()
    fonte = R.importar(arq, 'Fonte')
    antes = R.diagnosticar(fonte)
    R.limpar(fonte)
    nova, passadas = reduzir(fonte, T['tris'])
    depois = R.diagnosticar(nova)
    dist = distancia(fonte, nova)
    falhas = []
    if dist['p95'] > T['limite']:
        falhas.append(f"desvio de 95% {dist['p95'] * 100:.2f}% acima de {T['limite'] * 100:.1f}%")
    if depois['triangulos'] > T['tris'] * 1.1:
        falhas.append(f"{depois['triangulos']} triângulos acima do orçamento {T['tris']}")
    fonte.hide_set(True)
    fonte.hide_render = True
    lod = R.copia(nova, 'Estrutura_LOD')
    m = lod.modifiers.new('reduz', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = 0.25
    m.use_collapse_triangulate = True
    U.ativar(lod)
    bpy.ops.object.modifier_apply(modifier=m.name)
    ntex = texturas([nova, lod], T['lado'])
    os.makedirs(SAIDA, exist_ok=True)
    glb = os.path.join(SAIDA, f'{nome}.glb')
    U.exportar_glb(glb, [nova], imagens='JPEG')
    lod.hide_set(False)
    U.exportar_glb(os.path.join(SAIDA, f'{nome}_lod.glb'), [lod], imagens='JPEG')
    lod.hide_render = True
    prev = os.path.join(SAIDA, f'{nome}.png')
    U.renderizar_previa(prev, [nova], lado=320, amostras=8, angulo=(70, 0, 40))
    dims = [round(x, 3) for x in nova.dimensions]
    r = dict(id=nome, fonte=rel, tipo=tipo, estilo=estilo_de(rel), antes=antes['triangulos'], depois=depois['triangulos'],
             lod=sum(len(p.vertices) - 2 for p in lod.data.polygons), passadas=passadas, distancia=dist, texturas=ntex, lado=T['lado'],
             dims=dims, aprovada=not falhas, falhas=falhas, glb=os.path.relpath(glb, RAIZ), segundos=round(time.time() - t0))
    print('ESTRUTURA', json.dumps(r, ensure_ascii=False), flush=True)
    return r


def relatorio(novos):
    import fcntl   # (dois lotes podem gravar ao mesmo tempo)
    os.makedirs(SAIDA, exist_ok=True)
    with open(os.path.join(SAIDA, '.trava'), 'w') as tv:
        fcntl.flock(tv, fcntl.LOCK_EX)
        _relatorio(novos)


def _relatorio(novos):
    p = os.path.join(SAIDA, 'estruturas.json')
    L = []
    if os.path.exists(p):
        with open(p, encoding='utf-8') as f:
            L = [x for x in json.load(f) if x['id'] not in {n['id'] for n in novos}]
    L += novos
    L.sort(key=lambda x: x['id'])
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(L, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    a = U.args()
    orig = None
    if '--fonte-original' in a:
        i = a.index('--fonte-original')
        orig = a[i + 1]
        a = a[:i] + a[i + 2:]
    feitos = []
    for arq in a:
        try:
            feitos.append(processar(arq, os.path.join(RAIZ, orig) if orig else None))
        except Exception as err:   # noqa: BLE001
            print('ERRO', arq, err, flush=True)
            feitos.append(dict(id=ident(orig or arq), fonte=os.path.relpath(orig or arq, RAIZ), erro=str(err)[:200], aprovada=False))
        relatorio(feitos)
