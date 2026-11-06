"""ECLIPSE ZERO · Biblioteca de assets do Blender com as estruturas do jogo (bpy)
---------------------------------------------------------------------------
Junta numa biblioteca do Blender (Asset Browser) todas as estruturas aprovadas na redução
(assets/models/estruturas/<id>.glb: as enviadas em assets/estruturas_ambiente/ e as geradas no Meshy
a partir das folhas de referência medieval e cyberpunk), já no tamanho real do jogo:
  - um objeto por estrutura, com as texturas embutidas, marcado como asset;
  - catálogos Eclipse Zero / Medieval | Cyberpunk / Estruturas | Itens | Árvores | Plantas
    (blender_assets.cats.txt ao lado do .blend), etiquetas (estilo, tipo) e o nome em português;
  - os objetos em fila na cena, por catálogo (para ver a biblioteca aberta como arquivo comum).
Saída: assets/fontes/bibliotecas/eclipse_estruturas.blend (+ blender_assets.cats.txt). No Blender:
Preferências → Arquivos → Bibliotecas de Assets → acrescentar a pasta assets/fontes/bibliotecas;
o Asset Browser passa a mostrar as estruturas para arrastar para qualquer cena.
Rode: python3 tools/blender/cenario/biblioteca.py
"""
import json
import os
import sys
import uuid

import bpy

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'topologia'))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import retopologia as R   # noqa: E402
import utils as U   # noqa: E402

RAIZ = U.RAIZ
SAIDA = os.path.join(RAIZ, 'assets', 'fontes', 'bibliotecas')
TIPOS = {'estrutura': 'Estruturas', 'item': 'Itens', 'arvore': 'Árvores', 'planta': 'Plantas'}
ESCALA_M = 1 / 34   # o jogo usa 34 unidades por metro; o índice já traz as medidas do jogo


def catalogos(L):
    """Um catálogo por (estilo, tipo), com UUID fixo (o mesmo a cada vez que roda)."""
    C = {}
    for x in L:
        caminho = f"Eclipse Zero/{x['estilo'].capitalize()}/{TIPOS.get(x['tipo'], 'Outros')}"
        if caminho not in C:
            C[caminho] = str(uuid.uuid5(uuid.NAMESPACE_URL, 'eclipse-zero/' + caminho))
    linhas = ['# Catálogos da biblioteca de estruturas do Eclipse Zero (tools/blender/cenario/biblioteca.py)', 'VERSION 1', '']
    for caminho, u in sorted(C.items()):
        linhas.append(f"{u}:{caminho}:{caminho.replace('/', '-')}")
    with open(os.path.join(SAIDA, 'blender_assets.cats.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(linhas) + '\n')
    return C


def main():
    os.makedirs(SAIDA, exist_ok=True)
    rel = json.load(open(os.path.join(RAIZ, 'assets', 'models', 'estruturas', 'estruturas.json'), encoding='utf-8'))
    esc = json.load(open(os.path.join(RAIZ, 'tools', 'estruturas', 'escalas.json'), encoding='utf-8'))
    L = [x for x in rel if x.get('aprovada') and x.get('glb')]
    C = catalogos(L)
    U.limpar_cena()
    colecoes, fila = {}, {}
    for x in sorted(L, key=lambda q: (q['estilo'], q['tipo'], q['id'])):
        cam = f"Eclipse Zero/{x['estilo'].capitalize()}/{TIPOS.get(x['tipo'], 'Outros')}"
        nome_col = cam.split('/', 1)[1].replace('/', ' · ')
        if nome_col not in colecoes:
            col = bpy.data.collections.new(nome_col)
            bpy.context.scene.collection.children.link(col)
            colecoes[nome_col] = col
        ob = R.importar(os.path.join(RAIZ, x['glb']), x['id'])
        # tamanho real (metros) pela mesma tabela do jogo (tools/estruturas/escalas.json)
        E = esc.get(x['id']) if ('altura' in esc.get(x['id'], {}) or 'lado' in esc.get(x['id'], {})) else esc['_tipos'].get(x['tipo'], {'altura': 4})
        dx, dy, dz = ob.dimensions
        k = E['altura'] / max(dz, 1e-6) if 'altura' in E else E['lado'] / max(dx, dy, 1e-6)
        ob.scale = (k, k, k)
        U.ativar(ob)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        for c in list(ob.users_collection):
            c.objects.unlink(ob)
        colecoes[nome_col].objects.link(ob)
        # em fila por catálogo (x ao longo da fila, y um catálogo por linha)
        i = fila.get(nome_col, (len(fila) * 30.0, 0.0))
        ob.location = (i[1], i[0], 0)
        fila[nome_col] = (i[0], i[1] + max(ob.dimensions[0], 2) + 3)
        ob.asset_mark()
        A = ob.asset_data
        A.catalog_id = C[cam]
        A.description = (esc.get(x['id'], {}).get('nome') or x['id']) + f" · {x['depois']} triângulos · fonte: {x['fonte']}"
        for t in (x['estilo'], x['tipo'], 'meshy' if '/Meshy/' in x['fonte'] else 'enviada'):
            A.tags.new(t, skip_if_exists=True)
        # miniatura: a prévia renderizada na redução (assets/models/estruturas/<id>.png); o
        # asset_generate_preview do Blender precisa de GPU (sem ela, o Blender gera ao abrir)
        png = os.path.join(RAIZ, 'assets', 'models', 'estruturas', x['id'] + '.png')
        if os.path.exists(png):
            try:
                with bpy.context.temp_override(id=ob):
                    bpy.ops.ed.lib_id_load_custom_preview(filepath=png)
            except Exception as err:   # noqa: BLE001
                print('SEM MINIATURA', x['id'], err, flush=True)
        print('ASSET', x['id'], cam, flush=True)
    bpy.ops.file.pack_all()
    destino = os.path.join(SAIDA, 'eclipse_estruturas.blend')
    bpy.ops.wm.save_as_mainfile(filepath=destino, compress=True)
    print('BIBLIOTECA', destino, len(L), 'assets,', os.path.getsize(destino) >> 20, 'MB', flush=True)


if __name__ == '__main__':
    main()
