"""Baús por raridade (assets/baús/*.glb, enviados): reduz e SEPARA a tampa do corpo para o baú abrir.

Os cinco GLB do Meshy são uma malha única, fechada, sem animação. Para cada um:
  1. limpa e reduz (o mesmo redutor das estruturas: tools/blender/cenario/estruturas.py);
  2. corta na emenda da tampa (plano horizontal na cinta de metal), fecha os dois cortes e abre a
     cavidade: o corpo ganha o fundo de dentro com o tesouro e a tampa, o forro (faces novas, com a
     UV num bloco livre da textura pintado de madeira escura e de ouro: a textura original não muda
     em mais nada);
  3. exporta assets/models/estruturas/<id>.glb (corpo, base no chão) e <id>_tampa.glb (a tampa com a
     DOBRADIÇA na origem: o jogo gira a tampa em volta dela, js/mundo/baus.js) e a prévia aberta;
  4. grava no relatório das estruturas (estruturas.json) a dobradiça do corpo (campo dobradica, em
     unidades do arquivo: o conversor leva para o jogo).
Raridade pela cor do metal de cada arquivo (não pelo nome): cinza = comum, verde = incomum,
azul = raro, roxo = épico, dourado = lendário.

Rode: python3 tools/blender/cenario/baus.py [id ...]
"""
import json
import math
import os
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import estruturas as EST   # noqa: E402
R, U = EST.R, EST.U

RAIZ = U.RAIZ
ORIG = os.path.join(RAIZ, 'assets', 'baús')
# id → (arquivo, fração da altura onde fica a emenda da tampa)
BAUS = {
    'bau_comum': ('Bau_Comun.glb', 0.535),
    'bau_incomum': ('Bau_Normal.glb', 0.535),
    'bau_raro': ('Bau_Bom.glb', 0.545),
    'bau_epico': ('Bau_Épico.glb', 0.545),
    'bau_lendario': ('Bau_Raro.glb', 0.575),
}
TRIS = 5200
LADO = 512
ESCURO, OURO = (0.085, 0.05, 0.03), (1.0, 0.72, 0.2)


def imagens(ob):
    """{papel: imagem} do material (cor, metal/aspereza, normais)"""
    out = {}
    for mt in ob.data.materials:
        if not mt or not mt.use_nodes:
            continue
        bsdf = next((n for n in mt.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue

        def de(sock):
            lk = bsdf.inputs[sock].links
            n = lk[0].from_node if lk else None
            for _ in range(4):
                if n is None or n.type == 'TEX_IMAGE':
                    break
                ent = next((i for i in n.inputs if i.links), None)
                n = ent.links[0].from_node if ent else None
            return n.image if n is not None and n.type == 'TEX_IMAGE' else None
        out = dict(cor=de('Base Color'), mr=de('Roughness') or de('Metallic'), nrm=de('Normal'))
    return out


def blocos_livres(ob, lado, n=2):
    """n blocos de pixels sem nenhum triângulo da UV por perto: [(u, v do centro, x, y, t)]. Os
    triângulos são desenhados de verdade na máscara (com folga de 3 px); sem bloco de 14 px livre,
    tenta de 8 e, no fim, os blocos menos ocupados."""
    import cv2
    me = ob.data
    me.calc_loop_triangles()
    uv = np.empty(len(me.loops) * 2, np.float32)
    me.uv_layers.active.data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    L = np.empty(len(me.loop_triangles) * 3, np.int32)
    me.loop_triangles.foreach_get('loops', L)
    T = np.round(uv[L].reshape(-1, 3, 2) * lado).astype(np.int32)
    ocup = np.zeros((lado, lado), np.uint8)
    cv2.fillPoly(ocup, list(T), 1)
    cv2.polylines(ocup, list(T), True, 1, 1)
    ocup = cv2.dilate(ocup, np.ones((7, 7), np.uint8))
    for t in (14, 8):
        out = []
        m = ocup.copy()
        for y in range(2, lado - t - 2, t):
            for x in range(2, lado - t - 2, t):
                if not m[y:y + t, x:x + t].any():
                    out.append((x, y))
                    m[y:y + t, x:x + t] = 1
                    if len(out) == n:
                        return [((x + t / 2) / lado, (y + t / 2) / lado, x, y, t) for x, y in out]
    t = 8
    notas = sorted((int(ocup[y:y + t, x:x + t].sum()), x, y) for y in range(2, lado - t - 2, t) for x in range(2, lado - t - 2, t))
    return [((x + t / 2) / lado, (y + t / 2) / lado, x, y, t) for _, x, y in notas[:n]]


def pintar(im, x, y, t, rgb):
    if im is None:
        return
    w, h = im.size
    px = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    k = w / LADO
    px[int(y * k):int((y + t) * k), int(x * k):int((x + t) * k), :3] = rgb
    px[int(y * k):int((y + t) * k), int(x * k):int((x + t) * k), 3] = 1
    im.pixels.foreach_set(px.ravel())
    im.update()
    im.pack()


def cortar(ob, z0, cima, ret, zf, uv_escuro, uv_ouro):
    """Fica com a parte de cima ou de baixo do plano z0, fecha o corte e abre a cavidade (o retângulo
    ret = (x0, x1, y0, y1) do forro, até a altura zf); no corpo, o tesouro por cima do fundo."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    camada = bm.loops.layers.uv.verify()
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z0), plane_no=(0, 0, 1),
                                 clear_outer=not cima, clear_inner=cima)
    borda = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    antes = set(bm.faces)
    bmesh.ops.triangle_fill(bm, edges=borda, use_beauty=True)
    tampo = [f for f in bm.faces if f not in antes]
    # o tampo olha para fora da peça (para cima no corpo, para baixo na tampa)
    for f in tampo:
        if (f.normal.z > 0) == cima:
            f.normal_flip()
    # o buraco da cavidade: corta o tampo nos quatro lados do retângulo e tira o miolo
    x0, x1, y0, y1 = ret
    for co, no in (((x0, 0, 0), (1, 0, 0)), ((x1, 0, 0), (1, 0, 0)), ((0, y0, 0), (0, 1, 0)), ((0, y1, 0), (0, 1, 0))):
        tampo = [f for f in tampo if f.is_valid]
        g = list({v for f in tampo for v in f.verts}) + list({e for f in tampo for e in f.edges}) + tampo
        r2 = bmesh.ops.bisect_plane(bm, geom=g, plane_co=co, plane_no=no)
        tampo = list({f for f in r2['geom'] if isinstance(f, bmesh.types.BMFace)} | set(tampo))
    tampo = [f for f in tampo if f.is_valid]
    miolo = [f for f in tampo if x0 < f.calc_center_median().x < x1 and y0 < f.calc_center_median().y < y1]
    bmesh.ops.delete(bm, geom=miolo, context='FACES')
    novas = [f for f in tampo if f.is_valid]
    # o forro: quatro paredes e o fundo, olhando para dentro
    c = [Vector(p) for p in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
    em = [bm.verts.new((p.x, p.y, z0)) for p in c]
    fu = [bm.verts.new((p.x, p.y, zf)) for p in c]
    centro = Vector(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + zf) / 2))
    for i in range(4):
        j = (i + 1) % 4
        novas.append(bm.faces.new((em[i], em[j], fu[j], fu[i])))
    novas.append(bm.faces.new(fu))
    bm.normal_update()
    for f in novas[-5:]:
        if (centro - f.calc_center_median()).dot(f.normal) < 0:
            f.normal_flip()
    for f in novas:
        for lp in f.loops:
            lp[camada].uv = uv_escuro
    if not cima:   # o tesouro: um plano de ouro um pouco acima do fundo
        zt = zf + (z0 - zf) * 0.42
        m = 0.06 * (x1 - x0)
        vs = [bm.verts.new(p) for p in ((x0 + m, y0 + m, zt), (x1 - m, y0 + m, zt), (x1 - m, y1 - m, zt), (x0 + m, y1 - m, zt))]
        f = bm.faces.new(vs)
        bm.normal_update()
        if f.normal.z < 0:
            f.normal_flip()
        for lp in f.loops:
            lp[camada].uv = uv_ouro
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data)
    bm.free()
    for p in ob.data.polygons:
        p.use_smooth = True


def processar(id_):
    arq, f = BAUS[id_]
    U.limpar_cena()
    fonte = R.importar(os.path.join(ORIG, arq), 'Fonte')
    antes = R.diagnosticar(fonte)
    R.limpar(fonte)
    nova, _ = EST.reduzir(fonte, TRIS)
    dist = EST.distancia(fonte, nova)
    fonte.hide_set(True)
    fonte.hide_render = True
    EST.texturas([nova], LADO)
    V = np.array([nova.matrix_world @ v.co for v in nova.data.vertices])
    lo, hi = V.min(0), V.max(0)
    nova.data.transform(nova.matrix_world)
    nova.matrix_world = Matrix.Identity(4)
    # centro no eixo e base no chão
    nova.data.transform(Matrix.Translation((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])))
    hi = hi - lo
    hi[0] /= 2
    hi[1] /= 2
    z0 = float(hi[2] * f)
    livres = blocos_livres(nova, LADO)
    if not livres:
        raise RuntimeError('sem bloco livre na textura para o forro')
    (ue, ve, xe, ye, t), (uo, vo, xo, yo, _) = livres
    I = imagens(nova)
    pintar(I.get('cor'), xe, ye, t, ESCURO)
    pintar(I.get('cor'), xo, yo, t, OURO)
    for (x, y) in ((xe, ye), (xo, yo)):
        pintar(I.get('nrm'), x, y, t, (0.5, 0.5, 1.0))
    pintar(I.get('mr'), xe, ye, t, (1.0, 0.85, 0.0))    # (oclusão, aspereza, metal)
    pintar(I.get('mr'), xo, yo, t, (1.0, 0.3, 1.0))
    # cavidade: 78% da largura e 72% da profundidade (as paredes de madeira ficam com espessura)
    ret = (-hi[0] * 0.74, hi[0] * 0.74, -hi[1] * 0.7, hi[1] * 0.7)
    tampa = R.copia(nova, 'Tampa')
    cortar(nova, z0, False, ret, z0 * 0.22, (ue, ve), (uo, vo))
    cortar(tampa, z0, True, ret, z0 + (hi[2] - z0) * 0.5, (ue, ve), (uo, vo))
    # a dobradiça: atrás (+Y no Blender; a frente, com a fechadura, é −Y), na emenda
    Vt = np.array([v.co for v in tampa.data.vertices])
    yh = float(Vt[np.abs(Vt[:, 2] - z0) < hi[2] * 0.03][:, 1].max())
    tampa.data.transform(Matrix.Translation((0, -yh, -z0)))
    os.makedirs(EST.SAIDA, exist_ok=True)
    glb = os.path.join(EST.SAIDA, f'{id_}.glb')
    glb_t = os.path.join(EST.SAIDA, f'{id_}_tampa.glb')
    tampa.hide_set(True)
    U.exportar_glb(glb, [nova], imagens='JPEG')
    tampa.hide_set(False)
    nova.hide_set(True)
    U.exportar_glb(glb_t, [tampa], imagens='JPEG')
    nova.hide_set(False)
    # prévia: aberto a 105°
    tampa.matrix_world = Matrix.Translation((0, yh, z0)) @ Matrix.Rotation(math.radians(-105), 4, 'X')
    U.renderizar_previa(os.path.join(EST.SAIDA, f'{id_}.png'), [nova, tampa], lado=320, amostras=8, angulo=(62, 0, 35))
    dn, dt = [round(float(x), 3) for x in nova.dimensions], [round(float(x), 3) for x in tampa.dimensions]
    tn, tt = EST._tris(nova), EST._tris(tampa)
    comum = dict(fonte=os.path.relpath(os.path.join(ORIG, arq), RAIZ), tipo='item', estilo='bau', antes=antes['triangulos'], passadas=1, distancia=dist,
                 texturas=3, lado=LADO, aprovada=True, falhas=[], segundos=0)
    return [dict(comum, id=id_, depois=tn, lod=tn, dims=dn, glb=os.path.relpath(glb, RAIZ), dobradica=[0.0, round(yh, 4), round(z0, 4)]),
            dict(comum, id=id_ + '_tampa', depois=tt, lod=tt, dims=dt, glb=os.path.relpath(glb_t, RAIZ), base_no_chao=False)]


if __name__ == '__main__':
    ids = [a for a in U.args() if a in BAUS] or list(BAUS)
    for i in ids:
        try:
            r = processar(i)
            EST.relatorio(r)
            print('BAU', json.dumps(dict(id=i, corpo=r[0]['depois'], tampa=r[1]['depois'], dims=r[0]['dims'], dobradica=r[0]['dobradica'], p95=r[0]['distancia']['p95']), ensure_ascii=False), flush=True)
        except Exception as err:   # noqa: BLE001
            import traceback
            traceback.print_exc()
            print('ERRO', i, err, flush=True)
