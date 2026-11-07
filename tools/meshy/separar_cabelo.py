"""ECLIPSE ZERO · Separa o cabelo gerado no Meshy da cabeça de manequim que vem junto.

O Meshy, mesmo pedindo "só o cabelo", devolve a peça presa a uma cabeça de manequim (às vezes a um
busto inteiro), numa malha só. Este passo (Blender como módulo Python, bpy) tira o que não é cabelo:
  - modo "cor" (peça com textura): cada triângulo pela luminância da textura no centro da UV —
    o cabelo é escuro, a pele do manequim é clara;
  - modo "altura" (prévia sem textura): fica o que está acima da linha do couro cabeludo (fração da
    altura da peça), e a peça ganha UV e uma textura de fios (a criação tinge o cabelo).
Depois, a malha é reduzida (Decimate, uns 60 mil triângulos: o conversor da criação ainda reduz para
o jogo e reassa a textura a partir desta). Saída: assets/Criar_Personagem/Cabelo_Meshy/<id>.glb, o molde do
encaixe <id>.json (nariz e pescoço do manequim, medir_manequim) e a miniatura <id>.png, renderizada da peça já separada (a fonte do Meshy, em .cache_criacao/meshy_cabelos/,
não muda). As regras de cada cabelo ficam em tools/meshy/cabelos.json ("separar").
Barbas e bigodes (--tipo barba, tools/meshy/barbas.json, gerados por tools/meshy/gerar_barbas.py): o mesmo
caminho (pele quente fora, giro, perfil do manequim); além disso fica só o que está abaixo do nariz (as
sobrancelhas escuras do manequim não passam por barba). Saída em assets/personagens/barbas/<categoria>/
<id>.glb e .json, a miniatura em previews/<id>.png e a textura de cor em texturas/<id>.png.
Uso: python3 tools/meshy/separar_cabelo.py [--tipo cabelo|barba] <id> [<id> ...]
"""
import json
import os
import sys

import bpy  # (o bmesh só existe depois do bpy)
import bmesh
import numpy as np
from mathutils import Matrix
from scipy import ndimage

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TIPO = 'barba' if '--tipo' in sys.argv and sys.argv[sys.argv.index('--tipo') + 1] == 'barba' else 'cabelo'
FONTE = os.path.join(RAIZ, '.cache_criacao', 'meshy_barbas' if TIPO == 'barba' else 'meshy_cabelos', 'fonte')
PASTA = os.path.join(RAIZ, 'assets', 'Criar_Personagem', 'Cabelo_Meshy')
BARBAS = os.path.join(RAIZ, 'assets', 'personagens', 'barbas')
sys.path.insert(0, os.path.join(RAIZ, 'tools', 'blender'))
import utils as U  # noqa: E402  (a prévia em Cycles, a mesma das miniaturas dos cabelos do Blender)
LISTA = json.load(open(os.path.join(RAIZ, 'tools', 'meshy', 'barbas.json' if TIPO == 'barba' else 'cabelos.json'), encoding='utf-8'))


def textura_fios(S=512, seed=7):
    """Fios de cabelo (cinza escuro com variação, para a tintura da criação)."""
    rng = np.random.default_rng(seed)
    x = np.arange(S)
    linhas = np.zeros((S, S))
    for f, a in ((3, 0.5), (11, 0.3), (37, 0.2)):
        fase = rng.uniform(0, 2 * np.pi, size=f)
        linhas += a * np.sin(x[None, :] / S * 2 * np.pi * f * 3 + np.interp(x, np.linspace(0, S, f), fase)[:, None])
    ruido = rng.normal(0, 0.06, (S, S))
    lum = np.clip(0.26 + 0.08 * linhas + ruido, 0.06, 0.55)
    img = np.stack([lum, lum * 0.95, lum * 0.9, np.ones_like(lum)], axis=-1).astype(np.float32)
    return img


def pele_principal(me, co, pele):
    """Os vértices do maior pedaço contínuo de pele, nos eixos do jogo (+X frente, +Y direita, +Z cima;
    no Blender a frente é −Y): pontinhos soltos da textura no meio das mechas ficam de fora."""
    nf = len(me.polygons)
    vi = np.empty(sum(len(p.vertices) for p in me.polygons), np.int32); me.polygons.foreach_get('vertices', vi)
    lt = np.empty(nf, np.int32); me.polygons.foreach_get('loop_total', lt)
    idx = np.unique(vi[np.repeat(pele, lt)])
    G = np.stack([-co[:, 1], -co[:, 0], co[:, 2]], 1)          # Blender → jogo (o GLB exportado volta igual)
    H = np.ptp(G[:, 2])
    P = G[idx]
    q = np.floor((P - G.min(0)) / (H / 120)).astype(int)
    occ = np.zeros(q.max(0) + 1, bool)
    occ[tuple(q.T)] = True
    rot, _ = ndimage.label(ndimage.binary_closing(occ, iterations=1) | occ)
    maior = np.argmax(np.bincount(rot[tuple(q.T)])[1:]) + 1
    return P[rot[tuple(q.T)] == maior], H


def pescoco(P):
    """A fatia mais estreita da pele entre o busto e a cabeça (raio horizontal, sem depender do giro)."""
    z0, z1 = P[:, 2].min(), P[:, 2].max()
    melhor = None
    for z in np.linspace(z0 + 0.12 * (z1 - z0), z1 - 0.2 * (z1 - z0), 50):
        f = P[np.abs(P[:, 2] - z) < 0.01 * (z1 - z0)]
        if len(f) > 20:
            r = np.percentile(np.hypot(*(f[:, :2] - f[:, :2].mean(0)).T), 95)
            if melhor is None or r < melhor[0]:
                melhor = (r, z, f)
    return melhor


def giro_do_manequim(P):
    """Para onde o manequim olha: perpendicular à linha dos ombros (eixo maior do busto), o lado mais
    perto da frente do glTF (o Meshy às vezes devolve a peça virada na diagonal). Ângulo no jogo."""
    _, zp, _ = pescoco(P)
    busto = P[P[:, 2] < zp - 0.08 * np.ptp(P[:, 2])]
    if len(busto) < 50:
        return 0.0
    xy = busto[:, :2] - busto[:, :2].mean(0)
    w, v = np.linalg.eigh(xy.T @ xy)
    ombros = v[:, 1]
    frente = np.array([ombros[1], -ombros[0]])
    if frente[0] < 0:
        frente = -frente
    return float(np.arctan2(frente[1], frente[0]))


def medir_manequim(P, H):
    """O molde do encaixe: a cabeça de manequim que veio junto é a cabeça para a qual o cabelo foi feito.
    Mede o nariz (o ponto mais à frente da cabeça, perto do meio) e o pescoço (a fatia mais estreita),
    como o conversor mede os corpos. O tools/importar_criacao.py leva nariz e pescoço do manequim para os
    do corpo: a escala vem da distância entre os dois e a posição, do nariz."""
    r, zp, f = pescoco(P)
    cy = float(np.median(f[:, 1]))
    cab = P[P[:, 2] > zp]
    # (só nos dois terços de baixo da cabeça: no alto, a pele que aparece entre as mechas e a franja
    # ficaria mais à frente que o nariz)
    cab = cab[cab[:, 2] < zp + 0.66 * (cab[:, 2].max() - zp)]
    meio = cab[np.abs(cab[:, 1] - cy) < 0.35 * np.ptp(cab[:, 1])]
    nariz = meio[np.argmax(meio[:, 0])]
    return dict(nariz=[round(float(x), 5) for x in nariz], pescoco=round(float(zp), 5), cy=round(cy, 5),
                cx=round(float(np.median(f[:, 0])), 5), raioPescoco=round(float(r), 5), altura=round(float(H), 5),
                perfil=perfil(P))


def perfil(P, n=90):
    """A forma da pele por altura: [z, raio, centro x, centro y] de cada fatia (o raio é o 90º percentil da
    distância ao centro). O conversor encaixa este perfil, do pescoço aos olhos, no da cabeça do corpo."""
    z0, z1 = P[:, 2].min(), P[:, 2].max()
    d = (z1 - z0) / n
    out = []
    for z in np.linspace(z0 + d / 2, z1 - d / 2, n):
        f = P[np.abs(P[:, 2] - z) < 0.8 * d]
        if len(f) >= 15:
            c = np.median(f[:, :2], 0)
            out.append([round(float(v), 5) for v in (z, np.percentile(np.hypot(*(f[:, :2] - c).T), 90), c[0], c[1])])
    return out


def separar(id_):
    cfg = LISTA[id_].get('separar') or {}
    modo = cfg.get('modo', 'cor')
    src = os.path.join(FONTE, id_ + '.glb')
    if not os.path.exists(src):
        src = os.path.join(FONTE, id_ + '_previa.glb')
    pasta = os.path.join(BARBAS, LISTA[id_]['categoria']) if TIPO == 'barba' else PASTA
    os.makedirs(pasta, exist_ok=True)
    out = os.path.join(pasta, id_ + '.glb')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = ob.data
    nf = len(me.polygons)
    co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    if modo == 'cor':
        img = None
        for m in me.materials:
            if m and m.use_nodes:
                for nd in m.node_tree.nodes:
                    if nd.type == 'TEX_IMAGE' and nd.image and any(l.to_socket.name == 'Base Color' for l in nd.outputs['Color'].links):
                        img = nd.image
        if img is None:
            sys.exit(f'{id_}: sem textura de cor (use o modo "altura")')
        W, H = img.size
        px = np.empty(W * H * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(H, W, 4)
        uv = np.empty(len(me.loops) * 2, np.float32); me.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
        ls = np.empty(nf, np.int32); me.polygons.foreach_get('loop_start', ls)
        lt = np.empty(nf, np.int32); me.polygons.foreach_get('loop_total', lt)
        cu = np.array([uv[s:s + n].mean(0) for s, n in zip(ls, lt)])
        xs = np.clip((cu[:, 0] % 1) * W, 0, W - 1).astype(int); ys = np.clip((cu[:, 1] % 1) * H, 0, H - 1).astype(int)
        rgb = px[ys, xs, :3]
        lum = rgb @ np.array([0.299, 0.587, 0.114])
        # pele do manequim: clara e quente (vermelho > verde > azul); o brilho do cabelo é claro mas
        # neutro e fica (tirar o claro todo abria buracos nas mechas)
        quente = (rgb[:, 0] > rgb[:, 1]) & (rgb[:, 1] > rgb[:, 2]) & (rgb[:, 0] - rgb[:, 2] > cfg.get('quente', 0.08))
        manter = ~(quente & (lum > cfg.get('lum_pele', 0.3)))
    else:
        z = co[:, 2]
        corte = z.min() + (z.max() - z.min()) * cfg.get('acima', 0.75)
        vi = np.empty(sum(len(p.vertices) for p in me.polygons), np.int32); me.polygons.foreach_get('vertices', vi)
        lt = np.empty(nf, np.int32); me.polygons.foreach_get('loop_total', lt)
        idx = np.repeat(np.arange(nf), lt)
        zmin = np.full(nf, np.inf); np.minimum.at(zmin, idx, z[vi])
        manter = zmin > corte
    P, H = pele_principal(me, co, ~manter)
    giro = giro_do_manequim(P)
    if abs(giro) > 0.03:
        # vira a peça de frente (no jogo o giro θ em torno de Z é −θ no Blender: os eixos trocam de lado)
        me.transform(Matrix.Rotation(giro, 4, 'Z'))
        me.update()
        co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        P, H = pele_principal(me, co, ~manter)
    molde = medir_manequim(P, H)
    molde['giro'] = round(float(np.degrees(giro)), 2)
    molde['giroDepois'] = round(float(np.degrees(giro_do_manequim(P))), 2)
    if cfg.get('abaixo_do_nariz'):
        # barba e bigode: só o que está abaixo do nariz do manequim (as sobrancelhas ficam de fora)
        vi = np.empty(sum(len(p.vertices) for p in me.polygons), np.int32); me.polygons.foreach_get('vertices', vi)
        lt = np.empty(nf, np.int32); me.polygons.foreach_get('loop_total', lt)
        idx = np.repeat(np.arange(nf), lt)
        zc = np.zeros(nf); np.add.at(zc, idx, co[vi, 2]); zc /= lt
        manter &= zc < molde['nariz'][2] + 0.02 * molde['altura']
    json.dump(molde, open(os.path.join(pasta, id_ + '.json'), 'w', encoding='utf-8'), indent=1)
    print(f'{id_}: manequim', molde, flush=True)
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    tirar = [f for f, k in zip(bm.faces, manter) if not k]
    bmesh.ops.delete(bm, geom=tirar, context='FACES')
    soltos = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=soltos, context='VERTS')
    bm.to_mesh(me); bm.free()
    nk = len(me.polygons)
    alvo = cfg.get('tri', 60000)
    if nk > alvo:
        dec = ob.modifiers.new('reduzir', 'DECIMATE')
        dec.ratio = alvo / nk
        dec.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=dec.name)
    print(f'{id_}: {nf} → {nk} (cabelo) → {len(me.polygons)} triângulos ({modo})', flush=True)
    if modo != 'cor':
        # UV nova e a textura de fios
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.01)
        bpy.ops.object.mode_set(mode='OBJECT')
        S = 512
        im = bpy.data.images.new(id_ + '_fios', S, S)
        im.pixels.foreach_set(textura_fios(S).ravel())
        im.filepath_raw = os.path.join(FONTE, id_ + '_fios.png'); im.file_format = 'PNG'; im.save()
        im.pack()
        mat = bpy.data.materials.new(id_ + '_mat'); mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = im
        mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.55
        me.materials.clear(); me.materials.append(mat)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_apply=True)
    if TIPO == 'barba':
        U.renderizar_previa(os.path.join(BARBAS, 'previews', id_ + '.png'), [ob], lado=360, amostras=12, angulo=(80, 0, 20))
        for m in me.materials:   # a textura de cor, à parte (a referência da peça)
            for nd in (m.node_tree.nodes if m and m.use_nodes else []):
                if nd.type == 'TEX_IMAGE' and nd.image:
                    os.makedirs(os.path.join(BARBAS, 'texturas'), exist_ok=True)
                    nd.image.filepath_raw = os.path.join(BARBAS, 'texturas', id_ + '.png'); nd.image.file_format = 'PNG'; nd.image.save()
                    break
    else:
        U.renderizar_previa(os.path.join(PASTA, id_ + '.png'), [ob], lado=360, amostras=12, angulo=(78, 0, 28))
    return out


if __name__ == '__main__':
    for x in [a for i, a in enumerate(sys.argv[1:], 1) if a != '--tipo' and sys.argv[i - 1] != '--tipo']:
        print('PRONTO', separar(x), flush=True)
