"""Valida o lote de remesh do Meshy contra as fontes, com os mesmos critérios do lote local
(tools/blender/topologia/lote.py): triângulos dentro do orçamento do tipo e desvio de 95% da fonte
para a malha nova, em fração da diagonal da peça.

O Meshy devolve a malha reescalada para caber em [-1, 1]; antes de medir, a malha nova é levada de
volta ao centro e à escala da fonte (pela caixa envolvente, escala uniforme pelo maior lado).
O desvio é medido de pontos amostrados na superfície da fonte até a superfície da malha nova.

Saída: assets/_retopo/meshy/lote.json, docs/topologia/LOTE_MESHY.md e, para cada peça,
<id>_alinhado.glb: o GLB do Meshy intacto (malha, UV, texturas) sob um nó raiz que o leva de volta
à escala e à posição da fonte — é este arquivo que os importadores do jogo leem.
Rode: python3 tools/topologia/validar_meshy.py   (requer trimesh, scipy, rtree)
"""
import json
import os
import struct

import numpy as np
import trimesh

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SAIDA = os.path.join(RAIZ, 'assets', '_retopo', 'meshy')

# limite do desvio de 95% (fração da diagonal) e orçamento de triângulos por tipo
REGRAS = {
    'arma': dict(limite=0.015, orcamento=4000),
    'armadura': dict(limite=0.015, orcamento=12000),
    'cabelo': dict(limite=0.025, orcamento=12000),
    'rosto': dict(limite=0.012, orcamento=12000),
    'cenario': dict(limite=0.015, orcamento=6000),
}

LOTE = [
    # id, tipo, fonte, tarefa do Meshy, pedido
    ('kael_espada', 'arma', 'assets/armas/eclipse/kael_espada.glb',
     '01a1b1d5-da26-7240-abf8-32528e21416a', 'triângulos, 3.000'),
    ('kael_n6', 'armadura', 'assets/modelos/armaduras/kael/kael_n6.glb',
     '01a1b1d5-de4c-7603-b6a6-ad3cb0c25546', 'quads, 11.000'),
    ('cabelo_1', 'cabelo', 'assets/Criar_Personagem/Cabelo/cabelo_1.glb',
     '01a1b1d5-e249-70bd-a067-5f8ef280ae1c', 'triângulos, 12.000'),
    ('rosto_3', 'rosto', 'assets/Criar_Personagem/Rosto/rosto_3.glb',
     '01a1b1d5-ea4e-728e-bc6c-376ba82d3d85', 'quads, 11.000'),
    ('item_ambiente_md_1', 'cenario', 'assets/estruturas_ambiente/Estruturas_Superficie/item_ambiente_md_1.glb',
     '01a1b1d5-edb0-7597-9b04-256d5e58632a', 'triângulos, 5.000'),
]

AMOSTRAS = 60000


def alinhar(nova, fonte):
    """Leva a malha nova ao centro e à escala da fonte (pela caixa envolvente).
    Devolve a malha alinhada, a escala e a translação (v' = s·v + t)."""
    cf, cn = fonte.bounds.mean(0), nova.bounds.mean(0)
    s = (fonte.extents.max() / nova.extents.max()) if nova.extents.max() > 0 else 1.0
    nova = nova.copy()
    nova.vertices = (nova.vertices - cn) * s + cf
    return nova, float(s), (cf - s * cn)


def gravar_alinhado(origem, destino, s, t):
    """Copia o GLB pondo as raízes da cena sob um nó novo com a escala s e a translação t."""
    raw = open(origem, 'rb').read()
    _, ver, _ = struct.unpack_from('<4sII', raw, 0)
    off, partes = 12, []
    while off < len(raw):
        n, tipo = struct.unpack_from('<I4s', raw, off)
        partes.append([tipo, raw[off + 8: off + 8 + n]])
        off += 8 + n
    js = json.loads(partes[0][1].decode('utf-8'))
    cena = js['scenes'][js.get('scene', 0)]
    js['nodes'].append(dict(name='alinhado_a_fonte', scale=[s, s, s], translation=[float(x) for x in t],
                            children=list(cena['nodes'])))
    cena['nodes'] = [len(js['nodes']) - 1]
    b = json.dumps(js, separators=(',', ':')).encode('utf-8')
    partes[0][1] = b + b' ' * ((4 - len(b) % 4) % 4)
    corpo = b''.join(struct.pack('<I4s', len(d), tp) + d for tp, d in partes)
    with open(destino, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', ver, 12 + len(corpo)) + corpo)


def desvio(fonte, nova):
    """Distância de pontos da superfície da fonte até a superfície da malha nova, em fração da diagonal."""
    diag = float(np.linalg.norm(fonte.extents))
    pts, _ = trimesh.sample.sample_surface(fonte, AMOSTRAS, seed=7)
    _, d, _ = trimesh.proximity.closest_point(nova, pts)
    d = d / diag
    return dict(media=float(d.mean()), p95=float(np.percentile(d, 95)), diagonal=diag)


def quads(m):
    """Fração da malha em pares de triângulos coplanares (quads) — uma estimativa, o GLB guarda triângulos."""
    adj = m.face_adjacency_angles
    return float(min(1.0, 2 * np.count_nonzero(adj < 1e-3) / max(1, len(m.faces)))) if len(adj) else 0.0


def mapas_do_glb(caminho):
    """Mapas de textura que o GLB traz embutidos (cor, metal/aspereza, normais, emissão)."""
    raw = open(caminho, 'rb').read()
    n, _ = struct.unpack_from('<I4s', raw, 12)
    js = json.loads(raw[20:20 + n].decode('utf-8'))
    tem = set()
    for m in js.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        for k, nome in (('baseColorTexture', 'cor'), ('metallicRoughnessTexture', 'metal_aspereza')):
            if k in pbr:
                tem.add(nome)
        for k, nome in (('normalTexture', 'normais'), ('emissiveTexture', 'emissao')):
            if k in m:
                tem.add(nome)
    return sorted(tem)


def main():
    res = []
    for pid, tipo, fonte_rel, tarefa, pedido in LOTE:
        Rg = REGRAS[tipo]
        fonte = trimesh.load(os.path.join(RAIZ, fonte_rel), force='mesh')
        bruta = trimesh.load(os.path.join(SAIDA, pid + '.glb'), force='mesh')
        nova, escala, transl = alinhar(bruta, fonte)
        gravar_alinhado(os.path.join(SAIDA, pid + '.glb'), os.path.join(SAIDA, pid + '_alinhado.glb'), escala, transl)
        dist = desvio(fonte, nova)
        falhas = []
        if dist['p95'] > Rg['limite']:
            falhas.append(f"desvio de 95% {dist['p95'] * 100:.2f}% acima de {Rg['limite'] * 100:.1f}%")
        if len(nova.faces) > Rg['orcamento']:
            falhas.append(f"{len(nova.faces):,} triângulos acima do orçamento {Rg['orcamento']:,}")
        texturas = mapas_do_glb(os.path.join(SAIDA, pid + '.glb'))
        r = dict(id=pid, tipo=tipo, fonte=fonte_rel, tarefa_meshy=tarefa, pedido=pedido,
                 triangulos_antes=int(len(fonte.faces)), triangulos_depois=int(len(nova.faces)),
                 quads_estimado=quads(nova), escala_para_fonte=escala,
                 desvio_medio=dist['media'], desvio_p95=dist['p95'], texturas=texturas,
                 aprovada=not falhas, falhas=falhas)
        res.append(r)
        print(f"{pid:20s} {r['triangulos_antes']:>9,} → {r['triangulos_depois']:>6,}  p95 {dist['p95'] * 100:.2f}%  "
              f"{'aprovada' if r['aprovada'] else 'reprovada: ' + '; '.join(falhas)}")

    with open(os.path.join(SAIDA, 'lote.json'), 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=2)

    ok = sum(r['aprovada'] for r in res)
    L = ['# Lote de teste do Meshy — remesh validado peça a peça', '',
         f'Gerado por `tools/topologia/validar_meshy.py`. {len(res)} peças processadas no remesh do Meshy '
         f'(5 créditos cada, 25 no total), **{ok} aprovadas**. As fontes não foram alteradas; as saídas estão em '
         '`assets/_retopo/meshy/`. Critérios iguais aos do lote local (`LOTE.md`), com orçamentos próprios para arma e cenário.',
         '', '| peça | tipo | pedido ao Meshy | triângulos antes → depois | desvio médio / 95% (da diagonal) | resultado |',
         '|---|---|---|---|---|---|']
    for r in res:
        L.append(f"| `{r['fonte']}` | {r['tipo']} | {r['pedido']} | {r['triangulos_antes']:,} → {r['triangulos_depois']:,} | "
                 f"{r['desvio_medio'] * 100:.2f}% / {r['desvio_p95'] * 100:.2f}% | "
                 f"{'aprovada' if r['aprovada'] else 'reprovada: ' + '; '.join(r['falhas'])} |")
    L += ['', '## Critérios', '']
    for t, Rg in REGRAS.items():
        L.append(f"- **{t}**: desvio de 95% até {Rg['limite'] * 100:.1f}% da diagonal, até {Rg['orcamento']:,} triângulos.")
    L += ['', '## Observações', '',
          '- O Meshy devolve a malha reescalada para caber em [-1, 1]; o validador e a integração a levam de volta à escala da fonte.',
          '- Com `topology: quad`, a meta do Meshy conta quads: 11.000 quads viram cerca de 21 mil triângulos no GLB.',
          '- Texturas embutidas em cada GLB: ' + '; '.join(f"`{r['id']}` {', '.join(r['texturas']) or 'nenhuma'}" for r in res) + '.',
          '- `<id>.glb` é a saída do Meshy como veio; `<id>_alinhado.glb` é a mesma malha sob um nó que a devolve à escala',
          '  e à posição da fonte (é o que os importadores do jogo leem).',
          '', '## No jogo', '',
          'Só as peças aprovadas entraram; as fontes continuam intactas e a troca se desfaz apontando de volta para elas.', '',
          '- **Arma**: a variação da espada do Kael (`kael_espada_alt`, item `espada_kael_3d`) lê `kael_espada_alinhado.glb`',
          '  (`tools/importar_arma.py` → `js/assets/armas3d.js`, 2.400 triângulos no jogo).',
          '- **Cabelo**: o Cabelo 1 do criador lê `cabelo_1_alinhado.glb` (`tools/importar_criacao.py` → `js/assets/criacao/cabelo_1.js`).',
          '  Antes saía da redução de 1,4 milhão de triângulos (reprovada no lote local); agora vem da malha do Meshy.',
          '  O remesh não traz mapa de normais, então o Cabelo 1 ficou sem ele (cor e metal/aspereza continuam).',
          '- **Cenário**: a pilha de caixotes (`caixotes`, `tools/importar_prop.py --grupo natureza` → `js/assets/natureza3d.js`)',
          '  entrou na clareira de Velmora (`js/mundo/cenario.js`, escala 0,65).',
          '- **Armadura e rosto**: reprovados só pelo orçamento (11.000 quads = cerca de 21 mil triângulos); não entraram.',
          '  Refazer com cerca de 6.000 quads (5 créditos cada) deve caber nos 12 mil triângulos.',
          '', 'Testes: `node tools/testes_navegador.mjs` (inclui a pilha de caixotes na clareira e a origem da espada); capturas:',
          '`node tools/captura_meshy.mjs saida.png` (caixotes e um personagem criado com o Cabelo 1).']
    with open(os.path.join(RAIZ, 'docs', 'topologia', 'LOTE_MESHY.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
