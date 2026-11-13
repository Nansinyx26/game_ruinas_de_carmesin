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
    # (folhagem: as folhas finas não cabem em poucos triângulos e o desvio medido sobe; mais
    # orçamento e mais tolerância para não virar um arbusto liso)
    'arvore': dict(tris=12000, limite=0.04, lado=1024),
    'planta': dict(tris=12000, limite=0.06, lado=512),
}


# Fontes com o nome de exportação do Meshy (assets/extra: a cidade abandonada): pedaço do nome do
# arquivo → (id no jogo, tipo, estilo). O carimbo de data do nome identifica cada uma.
APELIDOS = {
    # (4º campo: orçamento próprio — prédios cheios de janelas e vegetação solta, em que a redução
    # empaca acima dos 16 mil triângulos sem perder a forma)
    '1110202628': ('predio_abandonado', 'estrutura', 'ruina'), '1110202521': ('bloco_17', 'estrutura', 'ruina', 36000),
    '1110202848': ('predio_musgo', 'estrutura', 'ruina', 30000), '1110095313': ('galpao_abandonado', 'estrutura', 'ruina'),
    '1110202701': ('torre_tomada', 'estrutura', 'ruina', 30000), '1110203224': ('ruinas_retomadas', 'estrutura', 'ruina'),
    '1110202815': ('predio_de_guerra', 'estrutura', 'ruina'), '1110090007': ('arranha_ceu_caido', 'estrutura', 'ruina'),
    '1110203006': ('casarao_abandonado', 'estrutura', 'ruina'), '1110203337': ('sobrado_pos_punk', 'estrutura', 'ruina', 30000, 0.015),   # (5º campo: desvio aceito — sacadas e grades finas)
    'pistola_gm': ('pistola_gm', 'item', 'cyberpunk'), 'metralhadora_gm': ('metralhadora_gm', 'item', 'cyberpunk'), 'coldre_t': ('coldre_gm', 'item', 'cyberpunk'),
    'alaude_bardo': ('alaude_bardo', 'item', 'medieval'),
    # o altar que guarda a Chama da Aurora, no centro da praça do Refúgio (peça de destaque: orçamento de prédio)
    'altar_cristal': ('altar_cristal', 'estrutura', 'medieval', 12000),
}


def _apelido(caminho):
    b = os.path.basename(caminho).lower()
    for k, v in APELIDOS.items():
        if k in b:
            return v
    return None


def ident(caminho):
    ap = _apelido(caminho)
    if ap:
        return ap[0]
    n = os.path.splitext(os.path.basename(caminho))[0]
    n = unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode()
    n = re.sub(r'[^a-zA-Z0-9]+', '_', n).strip('_').lower()
    n = re.sub(r'composicao_de_plantas_?(\d+)', r'planta_\1', n)
    return n


def tipo_de(caminho, nome):
    ap = _apelido(caminho)
    if ap:
        return ap[1]
    s = (caminho + ' ' + nome).lower()
    if 'planta' in s:
        return 'planta'
    if 'arvore' in s:
        return 'arvore'
    if 'item_ambiente' in s or 'fast_travel' in s or 'quadro' in s:
        return 'item'
    return 'estrutura'


def estilo_de(caminho):
    ap = _apelido(caminho)
    if ap:
        return ap[2]
    s = caminho.lower()
    return 'cyberpunk' if 'subsolo' in s or 'cbp' in s or 'cyber' in s or 'neon' in s else 'medieval'


def _tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def _quadrica(ob, alvo):
    """Redução por quádricas sem preservar a topologia (fast_simplification): a saída das malhas de
    folhagem do Meshy, cheias de furos e alças (gênero alto), em que o COLLAPSE do Blender empaca
    muito acima do orçamento. Os triângulos que sobrevivem levam as UV dos seus cantos originais."""
    import numpy as np
    import fast_simplification as fs
    me = ob.data
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    P = np.empty(len(me.vertices) * 3, np.float64); me.vertices.foreach_get('co', P); P = P.reshape(-1, 3)
    T = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('vertices', T); T = T.reshape(-1, 3)
    L = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('loops', L); L = L.reshape(-1, 3)
    MI = np.empty(nt, np.int32); me.loop_triangles.foreach_get('material_index', MI)
    uv = None
    if me.uv_layers.active:
        uv = np.empty(len(me.loops) * 2, np.float32); me.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)[L]
    # (malhas com muitas bordas soltas não chegam ao alvo com a agressividade padrão: sobe até chegar)
    for agg in (7.0, 9.0, 10.0):
        _, Tq, col = fs.simplify(P, T, target_count=int(alvo), agg=agg, return_collapses=True)
        if len(Tq) <= alvo * 1.08:
            break
    P2, _, mapa = fs.replay_simplification(P, T, col)
    M = np.asarray(mapa)[T]
    ok = (M[:, 0] != M[:, 1]) & (M[:, 1] != M[:, 2]) & (M[:, 0] != M[:, 2])
    _, prim = np.unique(np.sort(M[ok], axis=1), axis=0, return_index=True)   # (sem faces repetidas sobre os mesmos vértices)
    idx = np.flatnonzero(ok)[np.sort(prim)]
    bm = bmesh.new()
    vs = [bm.verts.new(tuple(c)) for c in np.asarray(P2)]
    camada = bm.loops.layers.uv.new('UVMap') if uv is not None else None
    for i in idx:
        try:
            f = bm.faces.new((vs[M[i, 0]], vs[M[i, 1]], vs[M[i, 2]]))
        except ValueError:
            continue
        f.material_index = int(MI[i]); f.smooth = True
        if camada is not None:
            for k, lp in enumerate(f.loops):
                lp[camada].uv = uv[i, k]
    soltos = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=soltos, context='VERTS')
    nova = bpy.data.meshes.new(me.name + '_q')
    bm.to_mesh(nova); bm.free()
    for mt in me.materials:
        nova.materials.append(mt)
    ob.data = nova
    return ob


def reduzir(fonte, alvo):
    nova = R.copia(fonte, 'Estrutura')
    tris = _tris(nova)
    passadas = 0
    while tris > alvo * 1.05 and passadas < 6:
        antes = tris
        m = nova.modifiers.new('reduz', 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = max(0.002, min(1.0, alvo / tris * (1.0 if passadas == 0 else 0.97)))
        m.use_collapse_triangulate = True
        U.ativar(nova)
        bpy.ops.object.modifier_apply(modifier=m.name)
        tris = _tris(nova)
        passadas += 1
        if tris > antes * 0.98:   # empacou (o COLLAPSE preserva a topologia): só as quádricas resolvem
            break
    if tris > alvo * 1.1:
        _quadrica(nova, alvo)
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
    T = dict(TIPOS[tipo])
    ap = _apelido(original or arq)
    if ap and len(ap) > 3:
        T['tris'] = ap[3]
    if ap and len(ap) > 4:
        T['limite'] = ap[4]
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
