"""Espécies novas de Eclipse Zero por REMODELAGEM NO ESQUELETO, no Blender.

As duas bases com retopologia (a malha do Meshy do lobo neon e a da Asa Noturna) viram outras
espécies sem perder a qualidade da malha nem o rig:
  1. cada osso ganha uma escala (comprimento = Y do osso; espessura = X/Z) com a herança de escala
     desligada (alongar a coxa empurra a canela sem engrossá-la);
  2. a deformação é aplicada na malha de cada LOD, a pose vira a nova pose de repouso
     (pose.armature_apply) e o modificador do esqueleto volta: OS PESOS E AS ANIMAÇÕES CONTINUAM
     valendo (as ações só giram os ossos);
  3. opcionalmente a malha "infla" (lã da ovelha) pelas normais, onde os ossos do tronco mandam;
  4. os pés voltam ao chão; a cor assada é remapeada para cada pelagem (como lobo_neon.py).
Peças que não existem na malha (chifres da cabra, crista da galinha, bico chato do pato e do ganso) entram no
motor presas ao osso (js/mundo/criaturas3d.js → ACESSORIOS), como as coleiras.
Saída por espécie: assets/Creatures/<pasta>/<id>/<id>.{glb,blend,png}; texturas de 1024 px (as do
jogo; a fonte 2K continua na base).
Rode: python3 tools/blender/criaturas/especies.py [espécie ...]
"""
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as B   # noqa: E402
import bpy   # noqa: E402
from mathutils import Matrix, Vector   # noqa: E402
from lobo_neon import remapear, zerar   # noqa: E402

U = B.U
BASES = {'lobo': os.path.join('Enemies', 'lobo_sombra_neon'), 'ave': os.path.join('Pets', 'Exotic', 'asa_noturna')}
PERNAS_LOBO = ['escapula', 'braco', 'antebraco', 'mao', 'coxa', 'canela', 'metatarso', 'pe']
ASAS = ['ombro', 'braco', 'antebraco', 'mao', 'ponta']


def lr(nomes, esc):
    return {f'{n}.{s}': esc for n in nomes for s in ('L', 'R')}


def d(*partes):
    out = {}
    for p in partes:
        out.update(p)
    return out


# Escalas por osso: (espessura X, comprimento Y, espessura Z). Pelagens: id → (escuro, médio,
# claro, cor das linhas/marcas, emissão). A primeira pelagem é a "base" da espécie (o arquivo do
# jogo das outras só traz as texturas).
ESPECIES = {
    'gato': dict(base='lobo', pasta='Pets/Cats', ossos=d(
        {'cabeca': (1.3, 0.48, 1.25), 'pescoco1': (0.65, 0.72, 0.65), 'pescoco2': (0.68, 0.75, 0.68), 'peito': (0.75, 0.85, 0.78),
         'coluna1': (0.72, 1.08, 0.75), 'coluna2': (0.72, 1.08, 0.75), 'quadril': (0.8, 1.0, 0.8),
         'cauda1': (0.4, 1.25, 0.4), 'cauda2': (0.38, 1.35, 0.38), 'cauda3': (0.36, 1.4, 0.36), 'cauda4': (0.34, 1.45, 0.34)},
        lr(['orelha'], (1.35, 1.15, 1.35)), lr(['escapula', 'braco', 'antebraco', 'coxa', 'canela', 'metatarso'], (0.65, 0.88, 0.65)), lr(['mao', 'pe'], (0.75, 0.8, 0.75))),
        pelagens={'gato_malhado': ((0.38, 0.18, 0.05), (0.82, 0.48, 0.18), (0.98, 0.9, 0.76), (0.3, 0.13, 0.04), 0),
                  'gato_cinza': ((0.22, 0.24, 0.28), (0.5, 0.53, 0.58), (0.88, 0.9, 0.92), (0.18, 0.19, 0.22), 0),
                  'gato_sombra': ((0.03, 0.03, 0.05), (0.14, 0.13, 0.18), (0.45, 0.42, 0.52), (0.65, 0.35, 1.0), 1.6)}),
    'raposa': dict(base='lobo', pasta='Wildlife/Mammals', ossos=d(
        {'cabeca': (0.88, 1.08, 0.9), 'pescoco1': (0.85, 0.9, 0.85), 'pescoco2': (0.85, 0.9, 0.85), 'peito': (0.85, 1.0, 0.85),
         'coluna1': (0.85, 1.0, 0.85), 'coluna2': (0.85, 1.0, 0.85), 'quadril': (0.85, 1.0, 0.85),
         'cauda1': (1.2, 1.1, 1.2), 'cauda2': (1.25, 1.12, 1.25), 'cauda3': (1.25, 1.12, 1.25), 'cauda4': (1.2, 1.1, 1.2)},
        lr(['orelha'], (1.35, 1.45, 1.3)), lr(PERNAS_LOBO, (0.75, 0.88, 0.75))),
        pelagens={'raposa': ((0.32, 0.1, 0.03), (0.86, 0.36, 0.08), (0.97, 0.93, 0.86), (0.12, 0.05, 0.02), 0)}),
    'cao_pequeno': dict(base='lobo', pasta='Pets/Dogs', ossos=d(
        {'cabeca': (1.12, 0.55, 1.05), 'pescoco1': (0.95, 0.8, 0.95), 'pescoco2': (0.95, 0.8, 0.95), 'peito': (1.05, 0.85, 1.0),
         'coluna1': (1.05, 0.85, 1.0), 'coluna2': (1.05, 0.85, 1.0), 'cauda1': (0.85, 0.75, 0.85), 'cauda2': (0.85, 0.75, 0.85), 'cauda3': (0.8, 0.7, 0.8), 'cauda4': (0.8, 0.7, 0.8)},
        lr(['orelha'], (1.0, 0.72, 1.0)), lr(['escapula', 'braco', 'antebraco', 'coxa', 'canela', 'metatarso'], (0.95, 0.58, 0.95)), lr(['mao', 'pe'], (1.0, 0.85, 1.0))),
        pelagens={'cao_pequeno': ((0.42, 0.28, 0.14), (0.83, 0.66, 0.44), (0.98, 0.95, 0.9), (0.3, 0.2, 0.1), 0)}),
    'cabra': dict(base='lobo', pasta='DomesticAnimals', ossos=d(
        {'cabeca': (0.78, 1.18, 0.88), 'pescoco1': (0.8, 1.05, 0.8), 'pescoco2': (0.8, 1.05, 0.8), 'peito': (0.88, 1.0, 0.95),
         'coluna1': (0.88, 1.0, 0.95), 'coluna2': (0.88, 1.0, 0.95), 'quadril': (0.88, 1.0, 0.95),
         'cauda1': (0.5, 0.35, 0.5), 'cauda2': (0.3, 0.3, 0.3), 'cauda3': (0.3, 0.3, 0.3), 'cauda4': (0.3, 0.3, 0.3)},
        lr(['orelha'], (0.9, 0.8, 0.9)), lr(['escapula', 'braco', 'antebraco', 'coxa', 'canela', 'metatarso'], (0.68, 1.22, 0.68)), lr(['mao', 'pe'], (0.75, 0.9, 0.75))),
        pelagens={'cabra': ((0.26, 0.17, 0.1), (0.58, 0.44, 0.3), (0.93, 0.9, 0.84), (0.18, 0.12, 0.07), 0)}),
    'ovelha': dict(base='lobo', pasta='DomesticAnimals', inflar=(0.075, ['coluna1', 'coluna2', 'peito', 'quadril', 'pescoco1']), ossos=d(
        {'cabeca': (0.85, 0.9, 0.85), 'pescoco1': (0.95, 0.75, 0.95), 'pescoco2': (0.95, 0.75, 0.95), 'peito': (1.05, 0.95, 1.05),
         'coluna1': (1.05, 0.95, 1.05), 'coluna2': (1.05, 0.95, 1.05), 'quadril': (1.05, 0.95, 1.05),
         'cauda1': (0.6, 0.35, 0.6), 'cauda2': (0.4, 0.3, 0.4), 'cauda3': (0.4, 0.3, 0.4), 'cauda4': (0.4, 0.3, 0.4)},
        lr(['orelha'], (1.1, 0.65, 1.1)), lr(['escapula', 'braco', 'antebraco', 'coxa', 'canela', 'metatarso'], (0.62, 1.0, 0.62)), lr(['mao', 'pe'], (0.7, 0.85, 0.7))),
        pelagens={'ovelha': ((0.62, 0.58, 0.5), (0.86, 0.83, 0.75), (0.97, 0.96, 0.92), (0.55, 0.5, 0.44), 0)}),
    # montaria: o lobo grande e robusto (a malha do lobo não vira um cavalo de verdade; o cavalo
    # precisa de malha própria). No jogo ele é escalado para carregar o herói.
    'lobo_montaria': dict(base='lobo', pasta='Mounts', ossos=d(
        {'peito': (1.18, 1.05, 1.15), 'coluna1': (1.18, 1.1, 1.12), 'coluna2': (1.18, 1.1, 1.12), 'quadril': (1.15, 1.05, 1.1),
         'pescoco1': (1.12, 1.08, 1.12), 'pescoco2': (1.1, 1.05, 1.1), 'cabeca': (1.08, 1.0, 1.05)},
        lr(['escapula', 'braco', 'coxa'], (1.12, 1.12, 1.12)), lr(['antebraco', 'canela', 'metatarso'], (1.05, 1.12, 1.05)), lr(['mao', 'pe'], (1.15, 1.05, 1.15))),
        pelagens={'lobo_montaria': ((0.1, 0.07, 0.04), (0.42, 0.28, 0.16), (0.78, 0.66, 0.5), (0.08, 0.05, 0.03), 0),
                  'lobo_guerra': ((0.03, 0.03, 0.035), (0.12, 0.12, 0.13), (0.32, 0.31, 0.33), (0.75, 0.12, 0.08), 1.2),
                  'lobo_aurora': ((0.75, 0.72, 0.66), (0.92, 0.9, 0.86), (1.0, 0.99, 0.97), (1.0, 0.78, 0.3), 1.8)}),
    # ---- aves (da Asa Noturna)
    'galinha': dict(base='ave', pasta='DomesticAnimals', ossos=d(
        {'peito': (1.45, 1.0, 1.4), 'coluna': (1.45, 1.0, 1.4), 'quadril': (1.35, 1.0, 1.3), 'pescoco1': (1.1, 0.8, 1.1), 'pescoco2': (1.05, 0.8, 1.05),
         'cabeca': (1.05, 0.85, 1.05), 'cauda1': (1.0, 0.55, 1.2), 'cauda2': (1.0, 0.5, 1.2), 'cauda3': (1.0, 0.5, 1.2)},
        lr(ASAS, (0.62, 0.45, 0.62)), lr(['coxa', 'tarso'], (1.2, 0.9, 1.2))),
        pelagens={'galinha': ((0.42, 0.22, 0.1), (0.76, 0.5, 0.26), (0.96, 0.9, 0.8), (0.55, 0.1, 0.06), 0)}),
    'pato': dict(base='ave', pasta='DomesticAnimals', ossos=d(
        {'peito': (1.6, 1.1, 1.2), 'coluna': (1.6, 1.15, 1.15), 'quadril': (1.5, 1.1, 1.1), 'pescoco1': (1.0, 1.05, 1.0), 'pescoco2': (1.0, 1.05, 1.0),
         'cabeca': (1.1, 1.0, 0.9), 'cauda1': (1.0, 0.4, 0.8), 'cauda2': (1.0, 0.4, 0.8), 'cauda3': (1.0, 0.4, 0.8)},
        lr(ASAS, (0.65, 0.5, 0.65)), lr(['coxa'], (1.1, 0.7, 1.1)), lr(['tarso'], (1.0, 0.55, 1.0))),
        pelagens={'pato': ((0.08, 0.24, 0.14), (0.5, 0.42, 0.32), (0.86, 0.83, 0.76), (0.15, 0.35, 0.65), 0)}),
    'ganso': dict(base='ave', pasta='DomesticAnimals', ossos=d(
        {'peito': (1.5, 1.1, 1.2), 'coluna': (1.5, 1.15, 1.15), 'quadril': (1.45, 1.1, 1.1), 'pescoco1': (0.95, 1.7, 0.95), 'pescoco2': (0.95, 1.7, 0.95),
         'cabeca': (1.05, 1.05, 0.95), 'cauda1': (1.0, 0.45, 0.8), 'cauda2': (1.0, 0.45, 0.8), 'cauda3': (1.0, 0.45, 0.8)},
        lr(ASAS, (0.7, 0.55, 0.7)), lr(['coxa'], (1.1, 0.75, 1.1)), lr(['tarso'], (1.0, 0.6, 1.0))),
        pelagens={'ganso': ((0.62, 0.62, 0.6), (0.88, 0.88, 0.86), (0.99, 0.99, 0.98), (0.5, 0.5, 0.5), 0)}),
    'pombo': dict(base='ave', pasta='DomesticAnimals', ossos=d(
        {'peito': (1.15, 0.95, 1.15), 'coluna': (1.15, 1.0, 1.15), 'quadril': (1.1, 1.0, 1.1), 'pescoco1': (1.0, 0.75, 1.0), 'pescoco2': (1.0, 0.75, 1.0),
         'cauda1': (0.9, 0.6, 0.9), 'cauda2': (0.9, 0.6, 0.9), 'cauda3': (0.9, 0.6, 0.9)},
        lr(ASAS, (0.75, 0.6, 0.75))),
        pelagens={'pombo': ((0.24, 0.25, 0.3), (0.5, 0.52, 0.58), (0.76, 0.78, 0.83), (0.28, 0.55, 0.45), 0),
                  'canario': ((0.6, 0.48, 0.05), (0.98, 0.85, 0.15), (1.0, 0.97, 0.75), (0.55, 0.4, 0.05), 0)}),
    'papagaio': dict(base='ave', pasta='Pets/Exotic', ossos=d(
        {'cabeca': (1.15, 0.9, 1.15), 'cauda1': (0.7, 1.3, 0.7), 'cauda2': (0.7, 1.3, 0.7), 'cauda3': (0.6, 1.3, 0.6)}, lr(ASAS, (0.8, 0.7, 0.8))),
        pelagens={'papagaio': ((0.04, 0.32, 0.1), (0.12, 0.68, 0.2), (0.96, 0.86, 0.22), (0.9, 0.16, 0.1), 0)}),
    'pavao': dict(base='ave', pasta='DomesticAnimals', ossos=d(
        {'peito': (1.1, 1.0, 1.1), 'coluna': (1.1, 1.0, 1.1), 'pescoco1': (0.9, 1.25, 0.9), 'pescoco2': (0.9, 1.25, 0.9),
         'cauda1': (1.8, 2.4, 1.8), 'cauda2': (1.8, 2.4, 1.8), 'cauda3': (1.8, 2.4, 1.8)}, lr(ASAS, (0.75, 0.6, 0.75))),
        pelagens={'pavao': ((0.03, 0.18, 0.42), (0.06, 0.45, 0.62), (0.6, 0.8, 0.7), (0.1, 0.85, 0.55), 1.2)}),
}


def malhas_lod():
    out = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name == 'corpo' or o.name.startswith('corpo_LOD'))]
    return sorted(out, key=lambda o: o.name)


def remodelar(arm, malhas, ossos):
    """Escala os ossos, aplica a deformação nas malhas e faz da pose o novo repouso."""
    arm.animation_data.action = None
    for tr in arm.animation_data.nla_tracks:
        tr.mute = True
    zerar(arm)
    for b in arm.data.bones:
        b.inherit_scale = 'NONE'
    for nome, esc in ossos.items():
        if nome in arm.pose.bones:
            arm.pose.bones[nome].scale = esc
    bpy.context.view_layer.update()
    for m in malhas:
        U.ativar(m)
        for md in list(m.modifiers):
            if md.type == 'ARMATURE':
                bpy.ops.object.modifier_apply(modifier=md.name)
    U.ativar(arm)
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.select_all(action='SELECT')
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    for b in arm.data.bones:
        b.inherit_scale = 'FULL'
    for m in malhas:
        am = m.modifiers.new('Armature', 'ARMATURE')
        am.object = arm


def inflar(malhas, arm, quanto, grupos):
    """Lã: empurra a superfície pelas normais onde os ossos do tronco mandam."""
    for m in malhas:
        idx = {m.vertex_groups[g].index for g in grupos if g in m.vertex_groups}
        me = m.data
        for v in me.vertices:
            w = sum(x.weight for x in v.groups if x.group in idx)
            if w > 0.02:
                v.co += v.normal * (quanto * min(1.0, w))
        me.update()


def ao_chao(arm, malhas):
    """Os pés voltam ao chão (z mínimo do LOD 0 = 0), malha e esqueleto juntos."""
    z = min(v.co.z for v in malhas[0].data.vertices)
    T = Matrix.Translation((0, 0, -z))
    for m in malhas:
        m.data.transform(T)
        m.data.update()
    U.ativar(arm)
    bpy.ops.object.mode_set(mode='EDIT')
    for eb in arm.data.edit_bones:
        eb.head.z -= z
        eb.tail.z -= z
    bpy.ops.object.mode_set(mode='OBJECT')
    return z


def pelagem(lod0, cor0, emi0, W, H, nome, P):
    esc, med, cla, lin, k = P
    mascara = np.clip(emi0[..., :3].max(-1) / np.maximum(cor0[..., :3].max(-1), 1e-3), 0, 1)
    nc, ne = remapear(cor0, mascara, esc, med, cla, lin, k)
    mat = lod0.active_material
    nos = [n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]
    ncor = next(n for n in nos if n.image.name.endswith('_cor'))
    nemi = next(n for n in nos if n.image.name.endswith('_emissao'))
    ic = bpy.data.images.new(f'{nome}_cor', W, H, alpha=False)
    ic.pixels[:] = nc.reshape(-1)
    ie = bpy.data.images.new(f'{nome}_emissao', W, H, alpha=False)
    ie.pixels[:] = ne.reshape(-1)
    for im in (ic, ie):
        im.scale(1024, 1024)
        im.pack()
    ncor.image, nemi.image = ic, ie
    Pr = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    Pr.inputs['Emission Strength'].default_value = k or 0.0


def construir(esp):
    t0 = time.time()
    E = ESPECIES[esp]
    base = os.path.join(B.CRIATURAS, BASES[E['base']], os.path.basename(BASES[E['base']]) + '.blend')
    bpy.ops.wm.open_mainfile(filepath=base)
    for o in list(bpy.data.objects):
        if o.name.startswith('Fonte'):
            bpy.data.objects.remove(o, do_unlink=True)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    malhas = malhas_lod()
    remodelar(arm, malhas, E['ossos'])
    if E.get('inflar'):
        inflar(malhas, arm, *E['inflar'])
    dz = ao_chao(arm, malhas)
    lod0 = malhas[0]
    # as texturas de dados (aspereza, metal, normais) da base em 1024 (as do jogo)
    for im in bpy.data.images:
        if im.size[0] > 1024 and not im.name.endswith(('_cor', '_emissao')):
            im.scale(1024, 1024)
            im.pack()
    mat = lod0.active_material
    nos = [n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]
    i0 = next(n for n in nos if n.image.name.endswith('_cor')).image
    e0 = next(n for n in nos if n.image.name.endswith('_emissao')).image
    W, H = i0.size
    cor0 = np.array(i0.pixels[:], dtype=np.float32).reshape(H, W, 4)
    emi0 = np.array(e0.pixels[:], dtype=np.float32).reshape(H, W, 4)
    for tr in arm.animation_data.nla_tracks:
        tr.mute = True
    feitos = []
    pasta_base = None
    for i, (pid, P) in enumerate(E['pelagens'].items()):
        pelagem(lod0, cor0, emi0, W, H, pid, P)
        pasta = B.pasta(E['pasta'], pid)
        glb = B.exportar(os.path.join(pasta, f'{pid}.glb'), [lod0, arm] + malhas[1:])
        prev = os.path.join(pasta, f'{pid}.png')
        zerar(arm)
        U.renderizar_previa(prev, [lod0], lado=480, amostras=14, angulo=(70, 0, 50))
        folha = []
        if i == 0:
            pasta_base = pasta
            for nm, q in (('andar', 8), ('idle', 1), ('sentar', 10) if 'sentar' in bpy.data.actions else ('voar', 5), ('dormir', 10)):
                if nm not in bpy.data.actions:
                    continue
                zerar(arm)
                arm.animation_data.action = bpy.data.actions[nm]
                bpy.context.scene.frame_set(q)
                f = os.path.join(B.RAIZ, '.cache_criacao', 'especies', f'{pid}_{nm}.png')
                U.renderizar_previa(f, [lod0], lado=320, amostras=8, angulo=(80, 0, 90))
                folha.append(f)
            arm.animation_data.action = None
            zerar(arm)
        U.registrar(pid, 'criatura', glb, prev, [lod0], extra={'especie': esp, 'base': os.path.basename(BASES[E['base']]), 'pelagem': list(P),
                    'lods': [len(m.data.polygons) for m in malhas], 'animacoes': sorted(a.name for a in bpy.data.actions)})
        feitos.append((pid, glb))
    # o .blend editável da espécie (malhas remodeladas, esqueleto, ações e as pelagens)
    for im in list(bpy.data.images):
        if im.users == 0:
            bpy.data.images.remove(im)
    blend = B.salvar_blend(os.path.join(pasta_base, f'{esp}.blend'))
    rel = dict(especie=esp, base=BASES[E['base']], ossos=E['ossos'], inflar=E.get('inflar'), chao_dz=round(dz, 4),
               pelagens=[p for p, _ in feitos], blend=os.path.relpath(blend, B.RAIZ), lods=[len(m.data.polygons) for m in malhas],
               segundos=round(time.time() - t0))
    with open(os.path.join(pasta_base, f'{esp}_remodelagem.json'), 'w', encoding='utf-8') as f:
        json.dump(rel, f, ensure_ascii=False, indent=1)
    print('ESPECIE', json.dumps(rel, ensure_ascii=False)[:400], flush=True)
    return feitos


if __name__ == '__main__':
    os.makedirs(os.path.join(B.RAIZ, '.cache_criacao', 'especies'), exist_ok=True)
    pedidas = [a for a in U.args() if a in ESPECIES] or list(ESPECIES)
    for esp in pedidas:
        construir(esp)
