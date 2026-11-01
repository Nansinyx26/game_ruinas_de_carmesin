"""Lobo Sombra Neon de Eclipse Zero: a malha do Meshy enviada, com retopologia, rig e animações no Blender.

Fonte (não muda): assets/Creatures/Enemies/lobo_sombra_neon/fonte/Meshy_AI_Neon_Shadow_Wolf_1101011401_texture.glb
(127 mil triângulos, uma malha estática, textura PBR 2K com as linhas neon).
Etapas (tools/blender/topologia/retopologia.py):
  limpeza → retopologia (voxel + QuadriFlow em quads, simetria) → encosto na superfície → UV nova →
  assado da fonte (cor, aspereza, metal, normais, emissão das linhas) → LOD 1–3
Rig: o esqueleto do lobo (31 ossos, tools/blender/criaturas/lobo.py) AJUSTADO às medidas desta
malha (focinho, patas, cernelha, linha do corpo e das pernas medidas nos vértices), pesos por
calor dos ossos no LOD 0 (copiados para os LODs), e as 10 animações do lobo.
Saída: assets/Creatures/Enemies/lobo_sombra_neon/lobo_sombra_neon.{glb,blend,png} + relatório JSON.
Rode: python3 tools/blender/criaturas/lobo_neon.py
"""
import json
import math
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'topologia'))
import base as B   # noqa: E402
import lobo   # noqa: E402
import retopologia as R   # noqa: E402
import bpy   # noqa: E402

U = B.U
ID = 'lobo_sombra_neon'
FONTE = os.path.join(B.RAIZ, 'assets', 'Creatures', 'Enemies', ID, 'fonte', 'Meshy_AI_Neon_Shadow_Wolf_1101011401_texture.glb')

# marcos do molde (lobo.py, metros): ponta do focinho, patas da frente e de trás, ponta da cauda
MOLDE_Y = [-0.85, -0.285, 0.41, 0.93]
MOLDE_CERNELHA_Z = 0.66
CABECA = {'cabeca', 'mandibula', 'orelha.L', 'orelha.R'}
PERNAS = {'escapula', 'braco', 'antebraco', 'mao', 'coxa', 'canela', 'metatarso', 'pe'}


def medir(ob):
    """Marcos da malha: focinho, cauda, as 4 patas, a altura do corpo e as linhas centrais."""
    V = np.array([v.co[:] for v in ob.data.vertices])
    H = V[:, 2].max()
    W = V[:, 0].max() - V[:, 0].min()
    L = V[:, 1].max() - V[:, 1].min()
    baixo = V[V[:, 2] < 0.05 * H]
    patas = {}
    for lado, sx in (('L', 1), ('R', -1)):
        S = baixo[baixo[:, 0] * sx > 0.02 * W]
        corte = (S[:, 1].min() + S[:, 1].max()) / 2
        patas['F' + lado] = S[S[:, 1] < corte].mean(0)
        patas['H' + lado] = S[S[:, 1] >= corte].mean(0)
    return dict(V=V, H=H, W=W, L=L, nariz=V[:, 1].min(), cauda=V[:, 1].max(), patas=patas,
                fy=(patas['FL'][1] + patas['FR'][1]) / 2, hy=(patas['HL'][1] + patas['HR'][1]) / 2,
                fx=(patas['FL'][0] - patas['FR'][0]) / 2, hx=(patas['HL'][0] - patas['HR'][0]) / 2)


def linha_central(M, y, faixa, zmin=0.0):
    V = M['V']
    S = V[(np.abs(V[:, 1] - y) < faixa) & (np.abs(V[:, 0]) < M['W'] * 0.22) & (V[:, 2] > zmin)]
    return float(S[:, 2].mean()) if len(S) > 8 else None


def coluna_perna(M, lado, frente, z):
    """Centro da perna (x, y) na altura z."""
    V, sx = M['V'], 1 if lado == 'L' else -1
    py = M['fy'] if frente else M['hy']
    S = V[(V[:, 0] * sx > M['W'] * 0.04) & (np.abs(V[:, 1] - py) < M['L'] * 0.09) & (np.abs(V[:, 2] - z) < M['H'] * 0.035)]
    return (float(S[:, 0].mean()), float(S[:, 1].mean())) if len(S) > 6 else None


def fazer_mapa(M):
    """Leva as juntas do molde para esta malha (piecewise em Y pelos marcos; Z pela cernelha;
    a coluna e a cabeça encostadas na linha central; as pernas no centro de cada perna)."""
    alvo_y = [M['nariz'], M['fy'], M['hy'], M['cauda']]
    cz = linha_central(M, M['fy'] + 0.06 * M['L'], 0.03 * M['L'], zmin=0.45 * M['H'])
    s = (cz or MOLDE_CERNELHA_Z) / MOLDE_CERNELHA_Z
    sxf, sxh = M['fx'] / 0.106, M['hx'] / 0.106
    def gy(y):
        return float(np.interp(y, MOLDE_Y, alvo_y, left=None, right=None)) if MOLDE_Y[0] <= y <= MOLDE_Y[-1] else \
            (alvo_y[0] + (y - MOLDE_Y[0]) * (alvo_y[1] - alvo_y[0]) / (MOLDE_Y[1] - MOLDE_Y[0]) if y < MOLDE_Y[0] else alvo_y[-1] + (y - MOLDE_Y[-1]))
    # deslocamento da cabeça: o centro do crânio do molde (0, -0.56, 0.8) encostado na linha central
    hy = gy(-0.56)
    hz = linha_central(M, hy, 0.025 * M['L']) or 0.8 * s
    dcab = hz - 0.8 * s

    def mapa(nm, p):
        x, y, z = p
        base = nm.split('.')[0]
        Y, Z = gy(y), z * s
        if base in PERNAS:
            frente = base in ('escapula', 'braco', 'antebraco', 'mao')
            X = x * (sxf if frente else sxh)
            lado = 'L' if x > 0 else 'R'
            if z < 0.42 and base != 'escapula':
                c = coluna_perna(M, lado, frente, max(Z, M['H'] * 0.035))
                if c:
                    X, Y = c
            return (X, Y, Z)
        X = x * (M['W'] / 0.42)
        if nm in CABECA:
            return (X, Y, Z + dcab)
        if abs(x) < 1e-6 and nm != 'raiz':
            zc = linha_central(M, Y, 0.022 * M['L'], zmin=0.3 * M['H'] if y < 0.5 else 0.0)
            if zc is not None:
                # pescoço: mistura da linha do corpo com a altura da cabeça
                return (0.0, Y, zc)
        return (X, Y, Z)
    return mapa, dict(escala_z=round(s, 3), cabeca_dz=round(dcab, 3))


# Pelagens derivadas da mesma malha, esqueleto e animações: a cor assada é remapeada pela luminância
# (escuro → médio → claro, o detalhe do pelo fica) e as linhas acesas da arte ganham a cor da
# pelagem (com emissão) ou viram marcas no pelo (sem emissão). id: (pasta, escuro, médio, claro,
# cor das linhas, força da emissão; 0 = marcas sem brilho)
PELAGENS = {
    'lobo_raiz': ('Enemies', (0.07, 0.08, 0.05), (0.24, 0.27, 0.16), (0.62, 0.66, 0.48), (0.45, 1.0, 0.22), 2.2),
    'lobo_neve': ('Enemies', (0.40, 0.45, 0.53), (0.72, 0.77, 0.84), (0.95, 0.97, 1.0), (0.62, 0.88, 1.0), 1.4),
    'lobo_cinzento': ('Wildlife/Mammals', (0.15, 0.14, 0.13), (0.42, 0.40, 0.37), (0.86, 0.83, 0.77), (0.10, 0.09, 0.08), 0),
    'cao_aurora': ('Pets/Dogs', (0.20, 0.12, 0.06), (0.55, 0.36, 0.18), (0.93, 0.88, 0.80), (0.16, 0.09, 0.05), 0),
    'cao_neve': ('Pets/Dogs', (0.19, 0.20, 0.23), (0.50, 0.52, 0.56), (0.96, 0.96, 0.97), (0.12, 0.12, 0.14), 0),
}


def remapear(cor, mascara, escuro, medio, claro, linha, k):
    """Cor nova (sRGB 0–1, H×W×4) e emissão a partir da cor assada e da máscara das linhas."""
    L = cor[..., 0] * 0.3 + cor[..., 1] * 0.59 + cor[..., 2] * 0.11
    t = np.clip((L - 0.04) / 0.86, 0, 1)[..., None]
    e, m, c = (np.array(x, np.float32) for x in (escuro, medio, claro))
    pelo = np.where(t < 0.45, e + (m - e) * (t / 0.45), m + (c - m) * ((t - 0.45) / 0.55))
    li = np.array(linha, np.float32) * (0.65 + 0.35 * t) if k else np.array(linha, np.float32) + 0 * t
    M = mascara[..., None]
    out = cor.copy()
    out[..., :3] = pelo * (1 - M) + li * M
    emi = np.zeros_like(cor)
    emi[..., 3] = 1
    if k:
        emi[..., :3] = li * M
    return out, emi


def pelagens(arm, objs, lod0, cache, so=None):
    """Exporta cada pelagem com a mesma malha e animações (texturas novas no material)."""
    mat = lod0.active_material
    nos = {n.image.name: n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image}
    ncor = next(n for k, n in nos.items() if k.endswith('_cor'))
    nemi = next(n for k, n in nos.items() if k.endswith('_emissao'))
    P = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    i0, e0, k0 = ncor.image, nemi.image, P.inputs['Emission Strength'].default_value
    W, H = i0.size
    cor = np.array(i0.pixels[:], dtype=np.float32).reshape(H, W, 4)
    emi0 = np.array(e0.pixels[:], dtype=np.float32).reshape(H, W, 4)
    mascara = np.clip(emi0[..., :3].max(-1) / np.maximum(cor[..., :3].max(-1), 1e-3), 0, 1)
    feitos = []
    for pid, (pasta_rel, esc, med, cla, lin, k) in PELAGENS.items():
        if so and pid not in so:
            continue
        nc, ne = remapear(cor, mascara, esc, med, cla, lin, k)
        ic = bpy.data.images.new(f'{pid}_cor', W, H, alpha=False)
        ic.colorspace_settings.name = 'sRGB'
        ic.pixels[:] = nc.reshape(-1)
        ie = bpy.data.images.new(f'{pid}_emissao', W, H, alpha=False)
        ie.pixels[:] = ne.reshape(-1)
        ic.pack()
        ie.pack()
        ncor.image, nemi.image = ic, ie
        P.inputs['Emission Strength'].default_value = k or 0.0
        pasta = B.pasta(pasta_rel, pid)
        glb = B.exportar(os.path.join(pasta, f'{pid}.glb'), objs)
        prev = os.path.join(pasta, f'{pid}.png')
        zerar(arm)
        U.renderizar_previa(prev, [lod0], lado=640, amostras=20, angulo=(68, 0, 55))
        U.registrar(pid, 'criatura', glb, prev, [lod0], extra={'base': ID, 'blend': os.path.relpath(os.path.join(B.pasta('Enemies', ID), f'{ID}.blend'), B.RAIZ),
                    'pelagem': [esc, med, cla, lin, k]})
        feitos.append(glb)
    ncor.image, nemi.image = i0, e0
    P.inputs['Emission Strength'].default_value = k0
    return feitos


def sem_mandibula(arm):
    """A boca da malha do Meshy é fechada (não há mandíbula separada): girar o osso só esticaria a
    pele. As chaves da mandíbula saem de todas as ações (a mordida fica no bote da cabeça)."""
    for a in bpy.data.actions:
        colecoes = []
        try:
            colecoes.append(a.fcurves)
        except AttributeError:
            for lay in a.layers:
                for st in lay.strips:
                    for bag in st.channelbags:
                        colecoes.append(bag.fcurves)
        for col in colecoes:
            for fc in [fc for fc in col if 'mandibula' in fc.data_path]:
                col.remove(fc)


def zerar(arm):
    """Pose de repouso (uma ação só mexe nos ossos dela; os outros guardariam a pose anterior)."""
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_euler = (0, 0, 0)
        pb.scale = (1, 1, 1)


def wire(ob, nome, caminho, lado=640, angulo=(78, 0, 62)):
    """Prévia com a malha aparente (para comparar a topologia antes e depois)."""
    c = R.copia(ob, nome + '_wire')
    for m in list(c.modifiers):
        c.modifiers.remove(m)
    c.vertex_groups.clear()
    w = c.modifiers.new('wire', 'WIREFRAME')
    area = sum(p.area for p in ob.data.polygons)
    w.thickness = 0.07 * math.sqrt(area / max(1, len(ob.data.polygons)))   # (proporcional ao tamanho médio da face)
    w.use_replace = True
    mt = bpy.data.materials.new('fio')
    mt.use_nodes = True
    mt.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.02, 0.02, 0.025, 1)
    c.data.materials.clear()
    c.data.materials.append(mt)
    U.renderizar_previa(caminho, [ob, c], lado=lado, amostras=16, angulo=angulo)
    bpy.data.objects.remove(c, do_unlink=True)


def construir():
    t0 = time.time()
    U.limpar_cena()
    pasta = B.pasta('Enemies', ID)
    cache = os.path.join(B.RAIZ, '.cache_criacao', ID)
    os.makedirs(cache, exist_ok=True)
    rel = dict(id=ID, fonte=os.path.relpath(FONTE, B.RAIZ))
    fonte = R.importar(FONTE, 'Fonte_Meshy')
    rel['antes'] = R.diagnosticar(fonte)
    rel['limpeza'] = R.limpar(fonte)
    rel['fonte_limpa'] = R.diagnosticar(fonte)
    print('antes', rel['antes'], flush=True)
    wire(fonte, 'fonte', os.path.join(cache, 'topologia_antes.png'))
    # retopologia em quads + UV + assado
    lod0, info = R.retopologia(fonte, 'quadrupede', nome='corpo')
    rel['retopologia'] = info
    print('retopologia', info, flush=True)
    R.uv(lod0)
    _, binfo = R.assar(lod0, fonte, lado=R.TIPOS['quadrupede']['lado'], extrusao=max(fonte.dimensions) * R.TIPOS['quadrupede']['extrusao'],
                       pasta=os.path.join(cache, 'texturas'), prefixo=ID)
    rel['assado'] = binfo
    wire(lod0, 'lod0', os.path.join(cache, 'topologia_depois.png'))
    # esqueleto ajustado às medidas desta malha
    M = medir(fonte)
    mapa, minfo = fazer_mapa(M)
    rel['ajuste_esqueleto'] = dict(minfo, comprimento=round(float(M['L']), 3), altura=round(float(M['H']), 3),
                                   patas={k: [round(float(a), 3) for a in v] for k, v in M['patas'].items()})
    arm = lobo.esqueleto(mapa, nome='Lobo_Neon_Esqueleto')
    fonte.hide_set(True)
    fonte.hide_render = True
    sem = B.pesar(lod0, arm, None, None)
    rel['sem_osso_lod0'] = sem
    L = R.lods(lod0, R.TIPOS['quadrupede']['lods'])
    R.copiar_pesos(lod0, L, arm)
    rel['lods'] = [dict(nome=o.name, triangulos=R.diagnosticar(o)['triangulos'], sem_osso=R.sem_peso(o, arm)) for o in [lod0] + L]
    lobo.animacoes(arm)
    sem_mandibula(arm)
    glb = B.exportar(os.path.join(pasta, f'{ID}.glb'), [lod0, arm] + L)
    rel['pelagens'] = [os.path.relpath(g, B.RAIZ) for g in pelagens(arm, [lod0, arm] + L, lod0, cache)]
    prev = os.path.join(pasta, f'{ID}.png')
    for o in L:
        o.hide_render = True
    U.renderizar_previa(prev, [lod0], lado=640, amostras=24, angulo=(68, 0, 55))
    folha = []
    for nm, q in (('andar', 8), ('correr', 5), ('atacar', 11), ('uivar', 50), ('morte', 40), ('saltar', 10)):
        zerar(arm)
        arm.animation_data.action = bpy.data.actions[nm]
        bpy.context.scene.frame_set(q)
        f = os.path.join(cache, f'{ID}_{nm}.png')
        U.renderizar_previa(f, [lod0], lado=400, amostras=12, angulo=(70, 0, 55))
        folha.append(os.path.relpath(f, B.RAIZ))
    arm.animation_data.action = None
    zerar(arm)
    bpy.context.scene.frame_set(1)
    # LODs lado a lado (a silhueta tem de se manter)
    for i, o in enumerate(L, 1):
        o.hide_render = False
        U.renderizar_previa(os.path.join(cache, f'{ID}_LOD{i}.png'), [o], lado=360, amostras=10, angulo=(68, 0, 55))
        o.hide_render = True
    blend = B.salvar_blend(os.path.join(pasta, f'{ID}.blend'))
    rel.update(glb=os.path.relpath(glb, B.RAIZ), blend=os.path.relpath(blend, B.RAIZ), previa=os.path.relpath(prev, B.RAIZ), folha=folha,
               ossos=len(arm.data.bones), animacoes=sorted(a.name for a in bpy.data.actions), segundos=round(time.time() - t0))
    with open(os.path.join(pasta, f'{ID}_topologia.json'), 'w', encoding='utf-8') as f:
        json.dump(rel, f, ensure_ascii=False, indent=1)
    U.registrar(ID, 'criatura', glb, prev, [lod0], extra={'blend': rel['blend'], 'ossos': rel['ossos'], 'animacoes': rel['animacoes'], 'sem_osso': sem,
                'lods': rel['lods'], 'retopologia': info.get('metodo')})
    print('RELATORIO', json.dumps({k: v for k, v in rel.items() if k not in ('folha',)}, ensure_ascii=False), flush=True)
    return glb


if __name__ == '__main__':
    construir()
