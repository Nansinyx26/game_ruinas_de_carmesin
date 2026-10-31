"""Converte as peças da criação de personagem (assets/Criar_Personagem/) para o formato do motor.

Os GLB vêm do Meshy, sem esqueleto e muito detalhados (o corpo tem 1,5 milhão de triângulos e
textura 4K). Cada peça vira um arquivo js/assets/criacao/<id>.js (carregado só quando o
personagem usa a peça, pelo <script>, então funciona também abrindo o index.html do disco), no
mesmo formato de malhas com pele dos heróis importados (tools/importar_modelo.py): posições,
normais, UV, até 4 ossos por vértice no esqueleto do Kael, textura, mapa de material e mapa de
normais reassados da malha original.
  Corpos (masculino e feminino): o esqueleto sai das silhuetas da própria malha (o mesmo processo
    dos heróis); a cabeça sem rosto sai (o rosto escolhido entra no lugar); a malha é separada
    em regiões (tronco, braços, mãos, pernas, pés) para o jogo esconder o que fica dentro de
    botas, luvas e calças.
  Rostos: cabeça e pescoço do busto, encaixados no pescoço de cada corpo (escala pela altura da
    cabeça, largura do pescoço igualada na emenda); pesos da cabeça e do pescoço do corpo.
  Cabelos, barbas e capuzes: ajuste por cobertura — escala e posição que cobrem o crânio (ou o
    queixo e a mandíbula, na barba) com raios saindo da superfície da cabeça, sem entrar nela e
    sem tapar os olhos; as pontas do cabelo comprido seguem o osso 'hair' (balançam).
  Armaduras (peças soltas: botas e luvas em par, peitoral, calça, capa, capuz, amuleto): cada uma
    na caixa da sua região do corpo, empurrada para fora da pele (sem atravessar) e com os pesos
    transferidos do corpo (dobra junto); a capa pende nas abas do casaco do Kael (balança).
Para cada corpo a peça tem posições e pesos próprios; textura e triângulos são os mesmos.
Também grava js/assets/criacao/catalogo.js: as peças, nomes, vagas, classe, nível, miniatura e
o arquivo de origem (o catálogo de equipamentos do jogo usa os ids daqui).

Uso (na pasta do projeto):
  python3 tools/importar_criacao.py                 # tudo (corpos primeiro)
  python3 tools/importar_criacao.py --so rosto_1 cabelo_1
  python3 tools/importar_criacao.py --listar        # só o inventário dos GLB
  python3 tools/importar_criacao.py --minis         # só as miniaturas e o catálogo
Requer o mesmo que tools/importar_modelo.py, mais o DracoPy (os GLB do Blender vêm com Draco).
"""
import argparse
import base64
import json
import os
import pickle
import sys
import time
import unicodedata
from multiprocessing import Pool
from types import SimpleNamespace

import cv2
import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importar_modelo as im  # noqa: E402
from escultor3d import RAIZ, Q, codificar_pele, esqueleto  # noqa: E402

ORIG = os.path.join(RAIZ, 'assets', 'Criar_Personagem')
DEST = os.path.join(RAIZ, 'js', 'assets', 'criacao')
CACHE = os.path.join(RAIZ, '.cache_criacao')

# ============================================================ catálogo (arquivos reais)
# tipo: corpo | rosto | cabelo | barba | peca; vaga do Arsenal (js/mundo/arsenal.js) nas peças
CORPOS = [
    dict(id='corpo_m', nome='Masculino', arq='Corpo_Masculino/Corpo_Masculino.glb', mini='Corpo_Masculino/Corpor_Mascuilino.png', altura=61.0),
    dict(id='corpo_f', nome='Feminino', arq='Corpo_Feminino/Corpo_Feminino.glb', mini='Corpo_Feminino/Corpo_Feminino.png', altura=57.5),
]
PECAS = []
for i, (a, m) in enumerate([('Rosto_1.glb', 'rosto_1.png'), ('rosto_2.glb', 'rosto_2.png'), ('rosto_3.glb', 'rosto_3.png'), ('rosto_4.glb', 'rosto_4.png'),
                            ('rosto_5.glb', 'rosto_5.png'), ('rosto_6.glb', 'rosto_6.png'), ('rosto_7.glb', 'rosto_7.png'), ('rosto_8.glb', 'rosto_8.png')]):
    PECAS.append(dict(id=f'rosto_{i + 1}', tipo='rosto', nome=f'Rosto {i + 1}', arq='Rosto/' + a, mini='Rosto/' + m, tri=9000, tex=1024))
for i, (a, m) in enumerate([('cabelo_1.glb', 'cabelo_1.png'), ('Cabelo_2.glb', 'cabelo_2.png'), ('Cabelo_3.glb', 'Cabelo_3.png'), ('Cabelo_4.glb', 'Cabelo_4.png'),
                            ('Cabelo_5.glb', 'cabelo_5.png'), ('Cabelo_6.glb', 'cabelo_6.png'), ('cabelo_7.glb', 'cabelo_7.png'), ('Cabelo_8.glb', 'cabelo_8.png')]):
    PECAS.append(dict(id=f'cabelo_{i + 1}', tipo='cabelo', nome=f'Cabelo {i + 1}', arq='Cabelo/' + a, mini='Cabelo/' + m, tri=12000, tex=512))
for b, n in [('Cacheada', 'Cacheada'), ('Curta', 'Curta'), ('Longa', 'Longa'), ('Média', 'Média'), ('Viking', 'Viking')]:
    PECAS.append(dict(id='barba_' + unicodedata.normalize('NFKD', b).encode('ascii', 'ignore').decode().lower(), tipo='barba', nome='Barba ' + n,
                      arq=f'Barbas/Barba_{b}.glb', mini=f'Barbas/Barba_{b}.png', tri=5000, tex=512))
L1 = 'Armaduras_Inicial_Level_1/'
PECAS += [
    dict(id='ini_capuz', tipo='peca', vaga='capacete', nome='Capuz do Iniciado', arq=L1 + 'Capuz_level_1.glb', mini=L1 + 'Capuz_level_1.png', nivel=1),
    dict(id='ini_peitoral', tipo='peca', vaga='peitoral', nome='Gibão do Iniciado', arq=L1 + 'Peitoral_leve_level_1.glb', mini=L1 + 'Peitoral_leve_level_1.png', nivel=1),
    dict(id='ini_armadura', tipo='peca', vaga='peitoral', nome='Couraça do Iniciado', arq=L1 + 'madura_pesada_level1.glb', mini=L1 + 'madura_pesada_level1.png', nivel=1, ombros=True),
    dict(id='ini_luvas', tipo='peca', vaga='luvas', nome='Luvas do Iniciado', arq=L1 + 'Luvas_level_1.glb', mini=L1 + 'Luvas_level_1.png', nivel=1),
    dict(id='ini_calca', tipo='peca', vaga='calcas', nome='Calças do Iniciado', arq=L1 + 'Calça_level_1.glb', mini=L1 + 'Calça_level_1.png', nivel=1),
    dict(id='ini_botas', tipo='peca', vaga='botas', nome='Botas do Iniciado', arq=L1 + 'Bota_level_1.glb', mini=L1 + 'Bota_level_1.png', nivel=1),
    dict(id='ini_capa', tipo='peca', vaga='capa', nome='Capa do Iniciado', arq=L1 + 'Capa_level_1.glb', mini=L1 + 'Capa_level_1.png', nivel=1),
]
L30 = 'Armaduras_Level_30/'
for cls, pasta, nomeC, itens in [
    ('assassino', 'Classe_Assassino_nvl30', 'do Assassino', [('peitoral', 'Amardura_Assasino', 'Amardura_Assasino', 'Peitoral e Ombreiras de Couro'), ('capa', 'capa_assasino', 'capa_Assasino', 'Capa'),
        ('luvas', 'Luvas_Assasino', 'Luvas_Assasino', 'Luvas de Couro'), ('capacete', 'Capuz_Assasino', 'Capuz_Assasino', 'Capuz'), ('calcas', 'calça_Assasino', 'calça_Assasino', 'Calças de Couro'),
        ('botas', 'Botas_Assasino', 'Botas_Assasino', 'Botas de Couro'), ('acessorio', 'amuleto_Assasino', 'amuleto_Assasino', 'Amuleto de Cristal')]),
    ('guerreiro', 'Classe_Guerreiro_nvl30', 'do Guerreiro', [('peitoral', 'Peitoral_Guerreiro', 'Peitoral_Guerreiro', 'Peitoral e Ombreiras de Placas'), ('capa', 'capa_Guerreiro', 'capa_Guerreiro', 'Capa'),
        ('luvas', 'Luva_Guerreiro', 'Luva_Guerreiro', 'Luvas de Couro'), ('capacete', 'capuz_Guerreiro', 'capuz_Guerreiro', 'Capuz'), ('calcas', 'calça_Guerreiro', 'calça_Guerreiro', 'Calças de Couro'),
        ('botas', 'Botas_Guerreiro', 'Botas_Guerreiro', 'Botas de Couro'), ('acessorio', 'Amuleto_Guerreiro', 'Amuleto_Guerreiro', 'Amuleto de Cristal')]),
    ('mago', 'Classe_Mago_nvl30', 'do Mago', [('peitoral', 'Peitoral_Mago', 'Peitoral_Mago', 'Peitoral e Ombreiras de Tecido e Cristal'), ('capa', 'capa_Mago', 'capa_Mago', 'Capa'),
        ('luvas', 'Luvas_Mago', 'Luvas_Mago', 'Luvas de Tecido'), ('capacete', 'capuz_Mago', 'capuz_Mago', 'Capuz'), ('calcas', 'calça_Mago', 'calça_Mago', 'Calças de Tecido'),
        ('botas', 'bota_Mago', 'bota_Mago', 'Botas de Couro'), ('acessorio', 'amuleto_Mago', 'amuleto_Mago', 'Amuleto de Cristal')]),
    ('patrulheiro', 'Classe_Patrulheiro_nvl30', 'do Patrulheiro', [('peitoral', 'Armadura_Patrulheiro', 'Armadura_Patrulheiro', 'Peitoral e Ombreiras de Couro'), ('capa', 'capa_patrulheiro', 'capa_patrulheiro', 'Capa'),
        ('luvas', 'luvas_patrulheiro', 'luvas_patrulheiro', 'Luvas de Couro'), ('capacete', 'capuz_patrulheiro', 'capuz_patrulheiro', 'Capuz'), ('calcas', 'calça_patrulheiro', 'calça_patrulheiro', 'Calças de Couro'),
        ('botas', 'bota_patrulheiro', 'bota_patrulheiro', 'Botas de Couro'), ('acessorio', 'amulerto_patrulheiro', 'amulerto_patrulheiro', 'Amuleto de Cristal')]),
    ('guardiao', 'Guardião_Arcano_nvl30', 'do Guardião Arcano', [('peitoral', 'Peitoral_Guardião_Arcano', 'Peitoral_Guardião_Arcano', 'Peitoral'), ('capa', 'capa_Guardião_Arcano', 'capa_Guardião_Arcano', 'Capa'),
        ('luvas', 'Luvas_Guardião_Arcano', 'Luvas_Guardião_Arcano', 'Luvas'), ('capacete', 'capuz_Guardião_Arcano', 'capuz_Guardião_Arcano', 'Capuz'), ('calcas', 'calça_Guardião_Arcano', 'calça_Guardião_Arcano', 'Calças'),
        ('botas', 'botas_Guardião_Arcano', 'botas_Guardião_Arcano', 'Botas'), ('acessorio', 'amuleto_Guardião_Arcano', 'amuleto_Guardião_Arcano', 'Amuleto')]),
]:
    for vaga, arq, mini, nome in itens:
        PECAS.append(dict(id=f'n30_{cls}_{vaga}', tipo='peca', vaga=vaga, classe=cls, nivel=30, nome=f'{nome} {nomeC}' if vaga not in ('capa', 'capacete') else f'{nome} {nomeC}',
                          arq=f'{L30}{pasta}/{arq}.glb', mini=f'{L30}{pasta}/{mini}.png'))
# Níveis 50, 75 e 100: feitos no Blender (tools/blender/asset_armadura_<classe>_n<nível>.py) já sobre
# os dois corpos do jogo (a forma do feminino numa shape key), com as texturas assadas; o GLB fica ao
# lado da imagem de referência. As ombreiras vêm em par num GLB só e viram duas peças (esquerda e
# direita, as vagas ombroE e ombroD do Arsenal).
_PALETAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'blender', 'armaduras_paletas.json')
# Peças que vêm prontas (GLB realista, como os do Meshy) no lugar das geradas no Blender:
# tools/blender/armaduras_reais.json (classe → nível → vaga → GLB na pasta da classe)
_REAIS_ARQ = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'blender', 'armaduras_reais.json')
_REAIS = json.load(open(_REAIS_ARQ, encoding='utf-8')) if os.path.exists(_REAIS_ARQ) else {}
if os.path.exists(_PALETAS):
    _NOMES_C = {'guerreiro': 'do Guerreiro', 'mago': 'do Mago', 'assassino': 'do Assassino', 'patrulheiro': 'do Patrulheiro', 'guardiao': 'do Guardião Arcano'}
    for _cls, _niveis in json.load(open(_PALETAS, encoding='utf-8')).items():
        for _nv, _d in sorted(_niveis.items(), key=lambda x: int(x[0])):
            for _vaga, _pc in _d['pecas'].items():
                _img = os.path.relpath(os.path.join(RAIZ, _pc['imagem']), ORIG).replace(os.sep, '/')
                _base = dict(tipo='peca', classe=_cls, nivel=int(_nv), arq=os.path.splitext(_img)[0] + '.glb', mini=_img, blender=True)
                _real = _REAIS.get(_cls, {}).get(_nv, {}).get(_vaga)
                if _real:
                    # GLB pronto: o caminho das peças do Meshy; o peitoral pronto já traz as ombreiras
                    if isinstance(_real, dict):
                        _base['girar'] = _real.get('girar', 0)
                        _real = _real['arq']
                    _base.update(arq=os.path.dirname(_img) + '/' + _real, blender=False, real=True)
                    if _vaga == 'peitoral' and not _REAIS[_cls][_nv].get('ombros'):
                        _base['ombros'] = True
                if _vaga == 'ombros':
                    for _lado, _v, _n in (('E', 'ombroE', 'esquerda'), ('D', 'ombroD', 'direita')):
                        PECAS.append(dict(_base, id=f'n{_nv}_{_cls}_{_v}', vaga=_v, lado=_lado, nome=f"{_pc['nome']} · {_n}"))
                else:
                    PECAS.append(dict(_base, id=f'n{_nv}_{_cls}_{_vaga}', vaga=_vaga, nome=_pc['nome']))
# triângulos e textura por vaga das peças de armadura
TRI_VAGA = {'peitoral': 8000, 'calcas': 6000, 'botas': 6000, 'luvas': 5000, 'capacete': 6000, 'capa': 6000, 'acessorio': 2500, 'ombroE': 3000, 'ombroD': 3000}
TEX_VAGA = {'acessorio': 256, 'ombroE': 256, 'ombroD': 256}
for p in PECAS:
    if p['tipo'] == 'peca':
        p.setdefault('tri', TRI_VAGA[p['vaga']])
        p.setdefault('tex', TEX_VAGA.get(p['vaga'], 512))
# regiões do corpo que somem dentro da peça (o jogo esconde para não atravessar)
ESCONDE = {'botas': ['pes'], 'luvas': ['maos'], 'calcas': ['pernas']}

# ============================================================ utilidades
R_JOGO = np.array([[0, 0, 1], [-1, 0, 0], [0, 1, 0]], float)   # linhas: frente, direita, cima do jogo no espaço do glTF (+y cima, +z frente)
ESCALA_BLENDER = 34.0                                          # as peças do Blender estão em metros


def ler_peca(arq):
    """GLB → posições no espaço do jogo (+X frente, +Y direita, +Z cima), uv, triângulos, mapas, normais."""
    V, UV, F, mapas = im.ler_glb(os.path.join(ORIG, arq))
    V = V @ R_JOGO.T
    F = F[:, [0, 2, 1]]                      # a troca de eixos espelha: desvira os triângulos
    N = mapas.get('normais')
    if N is not None:
        N = N @ R_JOGO.T
        N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
        Vs, Fs, inv0 = im.soldar(V, F)
        if np.einsum('ij,ij->i', im.normais_vertices(Vs, Fs)[inv0], N).mean() < 0:
            F = F[:, [0, 2, 1]]
    else:
        Vs, Fs, inv0 = im.soldar(V, F)
        N = im.normais_vertices(Vs, Fs)[inv0]
    return V, UV, F, mapas, N


def compacta(V, UV, N, F):
    usados, nova = np.unique(F, return_inverse=True)
    return V[usados], UV[usados], N[usados], nova.reshape(-1, 3)


def reduzir_e_assar(V, UV, F, N, mapas, alvo, lado):
    """Malha reduzida (soldada) + vértices de saída com UV nova e os mapas reassados."""
    if len(F) > alvo:
        Vr, Fr = im.reduzir(V, F, alvo)
        Nr = im.normais_vertices(Vr, Fr)
        vmap, Fo, Uo, cor, mr, nrm = im.reassar(V, F, UV, N, mapas, Vr, Fr, Nr, lado)
    else:
        Vr, Fr, vmap = im.soldar(V, F)
        Nr = im.normais_vertices(Vr, Fr)
        Fo, Uo, cor, mr, nrm = F, UV, mapas['cor'], mapas.get('mr'), mapas.get('nrm')
    return dict(Vr=Vr, Fr=Fr, Nr=Nr, vmap=vmap, Fo=Fo, Uo=Uo, cor=cor, mr=mr, nrm=nrm)


def jpg(img, lado, q=90):
    img = cv2.resize(np.clip(img, 0, 255).astype(np.uint8), (lado, lado), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, q])
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.tobytes()).decode('ascii')


def mapas_js(R, lado):
    """Textura, material (R metal, G aspereza, B relevo neutro) e normais em data URI (JPEG)."""
    out = {'tex': jpg(R['cor'], lado, 90)}
    mr = R['mr']
    if mr is not None:
        mm = np.zeros_like(mr, dtype=np.float64)
        mm[:, :, 2], mm[:, :, 1], mm[:, :, 0] = mr[:, :, 0], mr[:, :, 1], 128   # glTF: B metal, G aspereza
        out['mat'] = jpg(mm, max(128, lado // 2), 88)
    if R['nrm'] is not None:
        nn = cv2.resize(np.asarray(R['nrm'], np.float64), (max(128, lado // 2),) * 2, interpolation=cv2.INTER_AREA) / 127.5 - 1
        nn /= np.linalg.norm(nn, axis=2, keepdims=True) + 1e-9
        out['nrm'] = jpg((nn + 1) * 127.5, max(128, lado // 2), 92)
    return out


def amostras_superficie(V, F, n, rng):
    a, b, c = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    area = np.linalg.norm(np.cross(b - a, c - a), axis=1) + 1e-12
    k = rng.choice(len(F), n, p=area / area.sum())
    w = rng.dirichlet([1, 1, 1], n)
    return a[k] * w[:, :1] + b[k] * w[:, 1:2] + c[k] * w[:, 2:3]


class Grade:
    """Ocupação de uma nuvem de pontos em voxels (para os raios do ajuste por cobertura)."""
    def __init__(self, P, h):
        self.h = h
        self.o = P.min(0) - 2 * h
        dims = ((P.max(0) - self.o) / h).astype(int) + 3
        g = np.zeros(dims, bool)
        idx = ((P - self.o) / h).astype(int)
        g[idx[:, 0], idx[:, 1], idx[:, 2]] = True
        self.g = ndimage.binary_dilation(g, iterations=1)

    def ocupado(self, Qp):
        idx = np.floor((Qp - self.o) / self.h).astype(int)
        ok = np.all((idx >= 0) & (idx < np.array(self.g.shape)), axis=1)
        out = np.zeros(len(Qp), bool)
        out[ok] = self.g[idx[ok, 0], idx[ok, 1], idx[ok, 2]]
        return out


def suave(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def transferir_pesos(V, alvo, k=6):
    """Pesos de cada vértice pelos k vizinhos mais próximos da malha de referência (inverso da
    distância ao quadrado). alvo: dict com V, ordem (n,4), w (n,4), kd. Devolve matriz (n, nossos)."""
    d, j = alvo['kd'].query(V, k=k)
    wd = 1 / (d + 0.05) ** 2
    wd /= wd.sum(1, keepdims=True)
    nb = alvo['nb']
    W = np.zeros((len(V), nb))
    linhas = np.arange(len(V))
    for c in range(k):
        o, w = alvo['ordem'][j[:, c]], alvo['w'][j[:, c]]
        for q in range(4):
            np.add.at(W, (linhas, o[:, q]), w[:, q] * wd[:, c])
    return W


def empurrar_para_fora(V, alvo, margem, it=2):
    """Os vértices dentro da superfície (pela normal do vértice mais próximo) saem até a margem."""
    V = V.copy()
    for _ in range(it):
        _, j = alvo['kd'].query(V)
        off = np.einsum('ij,ij->i', V - alvo['V'][j], alvo['N'][j])
        dentro = off < margem
        V[dentro] += alvo['N'][j[dentro]] * (margem - off[dentro])[:, None]
    return V


def pele_js(V, N, Uo, Fo, W, nomes):
    """codificar_pele com os 4 maiores pesos de W (colunas = nomes); pedaços de até 65535 vértices."""
    ordem = np.argsort(-W, axis=1)[:, :4]
    w = np.take_along_axis(W, ordem, axis=1)
    w[w < 0.03] = 0
    s = w.sum(1, keepdims=True)
    w = np.where(s > 0, w / np.maximum(s, 1e-9), np.array([[1, 0, 0, 0]]))
    usados = sorted(set(np.unique(ordem[w > 0])))
    remap = np.full(len(nomes), 255, np.int64)
    remap[usados] = np.arange(len(usados))
    ossos = [nomes[i] for i in usados]
    bi = np.where(w > 0, remap[ordem], 0).astype(np.uint8)
    skins, ini = [], 0
    while ini < len(Fo):
        fim, vist = ini, {}
        while fim < len(Fo) and len(vist) + 3 <= 65535:
            for v in Fo[fim]:
                vist.setdefault(int(v), len(vist))
            fim += 1
        sel = np.array(list(vist.keys()))
        loc = np.vectorize(vist.get)(Fo[ini:fim])
        skins.append(codificar_pele(V[sel], N[sel], Uo[sel], loc, ossos, bi[sel], w[sel]))
        ini = fim
    return skins


def gravar(id_, dados, mapas):
    os.makedirs(DEST, exist_ok=True)
    k = json.dumps(id_)
    destino = os.path.join(DEST, id_ + '.js')
    with open(destino, 'w', encoding='utf-8') as f:
        f.write(f"""'use strict';
// ECLIPSE ZERO · peça da criação de personagem '{id_}' (tools/importar_criacao.py, de {dados.get('origem', '')})
// Não edite à mão: rode o conversor de novo.
""")
        f.write(f'(window.CRIA3D = window.CRIA3D || {{}})[{k}] = ' + json.dumps(dados, separators=(',', ':')) + ';\n')
        for m, v in mapas.items():
            f.write(f'CRIA3D[{k}].{m} = {json.dumps(v)};\n')
        f.write(f"if (typeof Criacao3D !== 'undefined') Criacao3D.carregado({k});\n")
    return destino


# ============================================================ corpos
def processar_corpo(c):
    t0 = time.time()
    a = SimpleNamespace(arquivo=os.path.join(ORIG, c['arq']), id=c['id'], cima='+y', frente='+z', max_tri=18000, tex=1024)
    r = im.rigar(a, c['altura'], False)
    V, F, Fo, Uo, o2r, rot, nomes, ix = r['V'], r['F'], r['Fo'], r['Uo'], r['o2r'], r['rot'], r['nomes'], r['ix']
    k, H, props, inv = r['k'], r['H'], r['props'], dict(r['inv'])
    N = im.normais_vertices(V, F)
    # abas do casaco do Kael (a capa pende nelas) e o resto dos ossos: ligação pela pose de repouso
    Wn = r['Wn']
    for nm in ['cFR', 'cSR', 'cBR', 'cBL', 'cSL', 'cFL'] + [x + '2' for x in ['cFR', 'cSR', 'cBR', 'cBL', 'cSL', 'cFL']] + ['hair']:
        if nm not in inv and nm in Wn:
            B = Wn[nm]
            Mi = np.linalg.inv(B[:, :3])
            inv[nm] = [round(float(x), 6) for x in np.hstack([Mi, (-Mi @ B[:, 3]).reshape(3, 1)]).ravel()]
    # medidas da cabeça e do pescoço (para os rostos): o pescoço é o ponto mais estreito
    Z = V[:, 2]
    topo = float(Z.max())
    zs = np.linspace(k['ombro'][1][2], topo - 0.1 * (topo - k['ombro'][1][2]), 60)
    larg = []
    for z in zs:
        s = V[np.abs(Z - z) < 0.25]
        larg.append(np.ptp(s[:, 1]) if len(s) > 10 else 1e9)
    zp = float(zs[int(np.argmin(larg))])
    fat = V[np.abs(Z - zp) < 0.3]
    cab = V[Z > zp + 0.45 * (topo - zp)]
    medida = dict(pescoco=zp, topo=topo, cx=float(np.median(fat[:, 0])), cy=float(np.median(fat[:, 1])),
                  largPescoco=float(np.ptp(fat[:, 1])), profPescoco=float(np.ptp(fat[:, 0])),
                  largCabeca=float(np.ptp(cab[:, 1])), profCabeca=float(np.ptp(cab[:, 0])),
                  ombroZ=float(k['ombro'][1][2]), quadrilZ=float(k['quadril_z']), axila=float(k['axila']),
                  tornozelo=float(np.mean([k['tornozelo'][s][2] for s in (1, -1)])))
    # nariz (o ponto mais à frente da cabeça) e o corte da cabeça do corpo, abaixo do queixo (o rosto
    # escolhido cobre dali para cima com o pescoço dele)
    cabp = V[(Z > zp - 1.0) & (np.abs(V[:, 1] - medida['cy']) < 1.2)]
    zn = float(cabp[np.argmax(cabp[:, 0]), 2])
    medida['nariz'] = zn
    medida['corte'] = zn - 0.55 * (topo - zn)
    # pesos por vértice soldado (a referência das outras peças)
    ordem, w = r['ordem'], r['w']
    # regiões: osso dominante → tronco, braços, mãos, pernas, pés; a cabeça sem rosto sai
    dom = np.array(nomes)[rot]
    reg = np.full(len(V), 'tronco', object)
    reg[np.isin(dom, ['armRu', 'armRf', 'armLu', 'armLf'])] = 'bracos'
    reg[np.isin(dom, ['handR', 'handL'])] = 'maos'
    reg[np.isin(dom, ['thighR', 'thighL', 'shinR', 'shinL'])] = 'pernas'
    reg[np.isin(dom, ['footR', 'footL'])] = 'pes'
    corte = medida['corte']
    vo_reg = reg[o2r]
    Zo = V[o2r][:, 2]
    tri_cabeca = np.all(Zo[Fo] > corte, axis=1)
    skins = []
    Vo, No = V[o2r], N[o2r]
    W = np.zeros((len(V), len(nomes)))
    for q in range(4):
        np.add.at(W, (np.arange(len(V)), ordem[:, q]), w[:, q])
    W[:, ix['head']] += W[:, ix['hair']] if 'hair' in ix else 0       # o corpo não tem cabelo
    if 'hair' in ix:
        W[:, ix['hair']] = 0
    Wo = W[o2r]
    for nome_r in ['tronco', 'bracos', 'maos', 'pernas', 'pes']:
        tri_r = (~tri_cabeca) & (np.array([max(set(x), key=list(x).count) for x in vo_reg[Fo]]) == nome_r)
        sel_f = Fo[tri_r]
        if not len(sel_f):
            continue
        us, nova = np.unique(sel_f, return_inverse=True)
        for sk in pele_js(Vo[us], No[us], Uo[us], nova.reshape(-1, 3), Wo[us], nomes):
            sk['nome'] = 'corpo_' + nome_r
            sk['regiao'] = nome_r
            skins.append(sk)
    dados = dict(v=2, tipo='corpo', q=Q, props=props, inv=inv, skins=skins, medida=medida, altura=H, origem=c['arq'], pbr=1)
    mp = mapas_js(dict(cor=r['cor'], mr=r['mr'], nrm=r['nrm']), 1024)
    destino = gravar(c['id'], dados, mp)
    print(f"{c['id']}: {len(Vo)} vértices, {len(Fo)} triângulos → {destino} ({os.path.getsize(destino) // 1024} KB, {time.time() - t0:.0f}s)", flush=True)
    # referência para encaixar as peças: malha soldada inteira (com a cabeça), normais e pesos
    ref = dict(V=V, N=N, F=F, ordem=ordem, w=w, nomes=nomes, medida=medida, k={kk: (v if not isinstance(v, dict) else {str(s): np.asarray(x) for s, x in v.items()}) for kk, v in k.items()},
               bones={kk: (np.asarray(v[0]), np.asarray(v[1])) for kk, v in r['bones'].items()}, reg=reg, props=props)
    os.makedirs(CACHE, exist_ok=True)
    with open(os.path.join(CACHE, c['id'] + '.pkl'), 'wb') as f:
        pickle.dump(ref, f)


def referencia(cid):
    with open(os.path.join(CACHE, cid + '.pkl'), 'rb') as f:
        ref = pickle.load(f)
    nomes = list(ref['nomes'])
    ref['nb'] = len(nomes)
    ref['kd'] = cKDTree(ref['V'])
    return ref


# ============================================================ rostos
def pescoco_da_malha(V):
    """Altura do pescoço (ponto mais estreito entre os ombros do busto e o queixo) e o topo."""
    Z = V[:, 2]
    z0, z1 = Z.min(), Z.max()
    zs = np.linspace(z0 + 0.12 * (z1 - z0), z0 + 0.55 * (z1 - z0), 60)
    larg = []
    for z in zs:
        s = V[np.abs(Z - z) < 0.01 * (z1 - z0)]
        larg.append(np.ptp(s[:, 1]) if len(s) > 10 else 1e9)
    return float(zs[int(np.argmin(larg))]), float(z1)


def nariz_da_malha(V, zmin):
    """Altura do nariz: o ponto mais à frente da cabeça, perto do plano do meio."""
    s = V[V[:, 2] > zmin]
    cy = (s[:, 1].min() + s[:, 1].max()) / 2
    s = s[np.abs(s[:, 1] - cy) < 0.08 * np.ptp(s[:, 2])]
    return float(s[np.argmax(s[:, 0]), 2])


def encaixe_cranio(Vf, Ff, zn, top, ref):
    """Escala e translação que levam o crânio do busto (acima do nariz) ao crânio do corpo:
    distância média entre as superfícies (nos dois sentidos), translação por ICP."""
    m = ref['medida']
    rng = np.random.default_rng(5)
    selF = Ff[np.all(Vf[Ff][:, :, 2] > zn, axis=1)]
    Fb = ref['F']
    selB = Fb[np.all(ref['V'][Fb][:, :, 2] > m['nariz'], axis=1)]
    A = amostras_superficie(Vf, selF, 5000, rng)
    B = amostras_superficie(ref['V'], selB, 5000, rng)
    kdB = cKDTree(B)
    s0 = (m['topo'] - m['nariz']) / max(top - zn, 1e-6)
    melhor = None
    for s in s0 * np.linspace(0.84, 1.16, 17):
        P0 = A * s
        t = np.array([B[:, 0].mean() - P0[:, 0].mean(), B[:, 1].mean() - P0[:, 1].mean(), m['topo'] - P0[:, 2].max()])
        for _ in range(8):
            _, j = kdB.query(P0 + t)
            t += (B[j] - (P0 + t)).mean(0)
        d1, _ = kdB.query(P0 + t)
        d2, _ = cKDTree(P0 + t).query(B)
        nota = d1.mean() + d2.mean()
        if melhor is None or nota < melhor[0]:
            melhor = (nota, s, t)
    return melhor[1], melhor[2]


def pescoco_no_corpo(P, ref, queixo):
    """Abaixo do queixo, o pescoço do rosto vai para a forma do pescoço do corpo (raio por altura e
    ângulo em volta do eixo do pescoço), por fora dele: a emenda some."""
    m = ref['medida']
    Vb = ref['V']
    z0, z1, hz = m['corte'] - 3.0, m['nariz'], 0.3
    lim = 0.75 * max(m['largCabeca'], m['profCabeca'])
    sel = (Vb[:, 2] > z0) & (Vb[:, 2] < z1) & (np.hypot(Vb[:, 0] - m['cx'], Vb[:, 1] - m['cy']) < lim)
    S = Vb[sel]
    nz, nt = int((z1 - z0) / hz) + 1, 36
    cen = np.zeros((nz, 2))
    rad = np.full((nz, nt), np.nan)
    for b in range(nz):
        q = S[np.abs(S[:, 2] - (z0 + (b + 0.5) * hz)) < hz]
        if len(q) < 12:
            cen[b] = [m['cx'], m['cy']]
            continue
        cen[b] = [(q[:, 0].min() + q[:, 0].max()) / 2, (q[:, 1].min() + q[:, 1].max()) / 2]
        th = np.arctan2(q[:, 1] - cen[b, 1], q[:, 0] - cen[b, 0])
        r = np.hypot(q[:, 1] - cen[b, 1], q[:, 0] - cen[b, 0])
        k = ((th + np.pi) / (2 * np.pi) * nt).astype(int) % nt
        for a in range(nt):
            if np.any(k == a):
                rad[b, a] = np.percentile(r[k == a], 75)
    # buracos: o vizinho mais próximo no ângulo (e na altura)
    for b in range(nz):
        ok = ~np.isnan(rad[b])
        if ok.any() and not ok.all():
            idx = np.arange(nt)
            rad[b, ~ok] = np.interp(idx[~ok], idx[ok], rad[b, ok], period=nt)
    for a in range(nt):
        ok = ~np.isnan(rad[:, a])
        if ok.any() and not ok.all():
            idx = np.arange(nz)
            rad[~ok, a] = np.interp(idx[~ok], idx[ok], rad[ok, a])
    P = P.copy()
    k = suave(queixo - 0.15, queixo - 1.3, P[:, 2])
    mv = k > 0
    b = np.clip(((P[mv, 2] - z0) / hz).astype(int), 0, nz - 1)
    c = cen[b]
    d = P[mv, :2] - c
    rf = np.hypot(d[:, 0], d[:, 1]) + 1e-9
    a = (((np.arctan2(d[:, 1], d[:, 0]) + np.pi) / (2 * np.pi)) * nt).astype(int) % nt
    rn = rf + (rad[b, a] + 0.05 - rf) * k[mv]
    P[mv, :2] = c + d / rf[:, None] * rn[:, None]
    return P


def rosto_no_corpo(Vr, Vf, Ff, zn, top, ref):
    """Cabeça do busto (Vr, já reduzida) no corpo: crânio encaixado e pescoço emendado."""
    s, t = encaixe_cranio(Vf, Ff, zn, top, ref)
    P = Vr * s + t
    nariz = zn * s + t[2]
    queixo = nariz - 0.45 * (top * s + t[2] - nariz)
    return pescoco_no_corpo(P, ref, queixo), s


def cabeca_do_busto(arq):
    """Busto → só a cabeça e um bom pedaço do pescoço; nariz e topo."""
    V, UV, F, mapas, N = ler_peca(arq)
    zp, top = pescoco_da_malha(V)
    fica = np.any(V[F][:, :, 2] > zp - 0.3 * (top - zp), axis=1)
    V, UV, N, F = compacta(V, UV, N, F[fica])
    zn = nariz_da_malha(V, zp)
    return V, UV, F, mapas, N, zn, top


def processar_rosto(p, refs):
    t0 = time.time()
    V, UV, F, mapas, N, zn, top = cabeca_do_busto(p['arq'])
    R = reduzir_e_assar(V, UV, F, N, mapas, p['tri'], p['tex'])
    porCorpo, info = {}, {}
    for cid, ref in refs.items():
        m = ref['medida']
        P, s = rosto_no_corpo(R['Vr'], V, F, zn, top, ref)
        Np = im.normais_vertices(P, R['Fr'])
        W = transferir_pesos(P, ref)
        ih = ref['nomes'].index('head')
        # do corte para cima é tudo cabeça; no pescoço, a mistura do corpo
        acima = P[:, 2] > m['corte'] + 0.6
        W[acima] = 0
        W[acima, ih] = 1
        Po = P[R['vmap']]
        # o pescoço que entrou fundo no tronco sai (fica escondido no corpo)
        Fo = R['Fo'][~np.all(Po[R['Fo']][:, :, 2] < m['corte'] - 1.2, axis=1)]
        porCorpo[cid] = pele_js(Po, Np[R['vmap']], R['Uo'], Fo, W[R['vmap']], ref['nomes'])
        info[cid] = dict(escala=round(float(s), 4))
    dados = dict(v=2, tipo='rosto', q=Q, porCorpo=porCorpo, ajuste=info, origem=p['arq'], pbr=1)
    destino = gravar(p['id'], dados, mapas_js(R, p['tex']))
    print(f"{p['id']}: {len(R['Fo'])} triângulos → {os.path.getsize(destino) // 1024} KB ({time.time() - t0:.0f}s)", flush=True)


# ============================================================ cabelo, barba, capuz: ajuste por cobertura
def cabeca_de_referencia(ref):
    """Um rosto encaixado no corpo (o 1): superfície da cabeça para os ajustes (pontos e normais)."""
    cache = os.path.join(CACHE, 'cabeca2_' + str(round(ref['medida']['topo'], 3)) + '.npz')
    if os.path.exists(cache):
        d = np.load(cache)
        return d['V'], d['N']
    V, UV, F, mapas, N, zn, top = cabeca_do_busto('Rosto/Rosto_1.glb')
    Vr, Fr = im.reduzir(V, F, 12000)
    P, _ = rosto_no_corpo(Vr, V, F, zn, top, ref)
    Np = im.normais_vertices(P, Fr)
    np.savez(cache, V=P, N=Np)
    return P, Np


def ajuste_cobertura(Vp, Fp, ref, modo):
    """Escala e posição da peça (cabelo, barba ou capuz) pela cobertura da cabeça de referência."""
    HV, HN = cabeca_de_referencia(ref)
    m = ref['medida']
    hh = m['topo'] - m['pescoco']
    cx, cy = m['cx'], m['cy']
    Z = HV[:, 2]
    frente = HV[:, 0].max()
    z_nariz = HV[np.argmax(HV[:, 0]), 2]
    olhos = (HV[:, 0] > frente - 0.22 * hh) & (Z > z_nariz + 0.07 * hh) & (Z < z_nariz + 0.24 * hh)
    rosto = (HV[:, 0] > cx + 0.12 * hh) & (Z < z_nariz + 0.3 * hh) & (Z > m['pescoco'] + 0.2 * hh)
    if modo == 'cabelo':
        alvo = (Z > z_nariz + 0.3 * hh) | ((Z > z_nariz + 0.05 * hh) & (HV[:, 0] < cx - 0.05 * hh))
        evitar = olhos
    elif modo == 'capuz':
        alvo = ((Z > z_nariz + 0.3 * hh) | (HV[:, 0] < cx - 0.02 * hh)) & (Z > m['pescoco'] - 0.1 * hh)
        evitar = olhos | (rosto & (HV[:, 0] > frente - 0.12 * hh))
    else:   # barba: queixo, mandíbula e buço, medidos do nariz (L = nariz → topo; o queixo fica ~0,42 L abaixo do nariz)
        L = m['topo'] - z_nariz
        alvo = (Z < z_nariz - 0.12 * L) & (Z > z_nariz - 0.52 * L) & (HV[:, 0] > cx + 0.05 * L)
        evitar = olhos | ((Z > z_nariz - 0.04 * L) & (HV[:, 0] > frente - 0.2 * L))
    A, AN, E, EN = HV[alvo], HN[alvo], HV[evitar], HN[evitar]
    rng = np.random.default_rng(3)
    if len(A) > 1500:
        s_ = rng.choice(len(A), 1500, replace=False)
        A, AN = A[s_], AN[s_]
    Pp = amostras_superficie(Vp, Fp, 150000, rng)
    mn, mx = Vp.min(0), Vp.max(0)
    larg_peca = np.ptp(Vp[Vp[:, 2] > mx[2] - 0.35 * (mx[2] - mn[2])][:, 1]) if modo != 'barba' else mx[1] - mn[1]
    larg_cab = m['largCabeca']
    if modo == 'barba':
        larg_cab = np.ptp(HV[alvo][:, 1])
    s0 = larg_cab / max(larg_peca, 1e-6) * (1.12 if modo == 'cabelo' else 1.2 if modo == 'capuz' else 1.0)
    h = (mx - mn).max() / 70
    G = Grade(Pp, h)
    passos = np.linspace(0.02 * hh, (0.35 if modo != 'barba' else 0.25) * hh, 22)
    kdH = cKDTree(HV)
    melhor = None
    escalas = s0 * np.array([0.82, 0.9, 0.97, 1.04, 1.12, 1.2, 1.3])
    for s in escalas:
        for dz in np.linspace(-0.1, 0.12, 6) * hh:
            for dx in np.linspace(-0.12, 0.12, 6) * hh:
                if modo == 'barba':
                    t = np.array([frente + dx - s * mx[0], cy - s * (mn[1] + mx[1]) / 2, HV[alvo][:, 2].min() + dz - s * mn[2]])
                else:
                    t = np.array([cx + dx - s * (mn[0] + mx[0]) / 2, cy - s * (mn[1] + mx[1]) / 2, m['topo'] + dz + (0.06 * hh if modo == 'cabelo' else 0.1 * hh) - s * mx[2]])
                raios = (A[:, None, :] + AN[:, None, :] * passos[None, :, None]).reshape(-1, 3)
                cob = G.ocupado((raios - t) / s).reshape(len(A), -1).any(1).mean()
                ro = (E[:, None, :] + EN[:, None, :] * passos[None, :8, None]).reshape(-1, 3)
                tapa = G.ocupado((ro - t) / s).reshape(len(E), -1).any(1).mean() if len(E) else 0
                amo = Pp[::40] * s + t
                d, j = kdH.query(amo)
                dentro = (np.einsum('ij,ij->i', amo - HV[j], HN[j]) < -0.04 * hh).mean()
                nota = cob - 2.5 * dentro - 1.2 * tapa - 0.12 * abs(s / s0 - 1)
                if melhor is None or nota > melhor[0]:
                    melhor = (nota, s, t, cob, dentro, tapa)
    nota, s, t, cob, dentro, tapa = melhor
    print(f"  ajuste {modo}: escala {s:.3f} cobertura {cob:.2f} dentro {dentro:.3f} olhos {tapa:.2f}", flush=True)
    return s, t, (HV, HN, kdH, hh)


def ajuste_peitoral(Vp, Fp, ref):
    """Escala e posição do peitoral pronto (GLB realista) pela cobertura do tronco e dos ombros do
    corpo. A caixa da região esticava a peça entre o quadril e os ombros: a gola alta ficava no meio
    do peito e as ombreiras nos braços (no corpo feminino o colo atravessava por cima da gola)."""
    m, V0, N0, reg = ref['medida'], ref['V'], ref['N'], ref['reg']
    alvo = ((reg == 'tronco') & (V0[:, 2] > m['quadrilZ'] + 1) & (V0[:, 2] < m['ombroZ'] + 1.5)) | ((reg == 'bracos') & (V0[:, 2] > m['axila'] - 3))
    A, AN = V0[alvo], N0[alvo]
    rng = np.random.default_rng(5)
    if len(A) > 2000:
        s_ = rng.choice(len(A), 2000, replace=False)
        A, AN = A[s_], AN[s_]
    peito = V0[(reg == 'tronco') & (np.abs(V0[:, 2] - (m['axila'] - 1.5)) < 1.0)]
    xc, yc = (peito[:, 0].min() + peito[:, 0].max()) / 2, (peito[:, 1].min() + peito[:, 1].max()) / 2
    Pp = amostras_superficie(Vp, Fp, 150000, rng)
    mn, mx = Vp.min(0), Vp.max(0)
    G = Grade(Pp, (mx - mn).max() / 80)
    passos = np.linspace(0.05, 2.5, 14)
    amo0 = Pp[::40]
    s0 = (m['pescoco'] - m['quadrilZ'] + 2) / (mx[2] - mn[2])
    melhor = None
    raios = (A[:, None, :] + AN[:, None, :] * passos[None, :, None]).reshape(-1, 3)
    for s in s0 * np.linspace(0.7, 1.3, 13):
        for topo in np.linspace(m['ombroZ'] - 1, m['pescoco'] + 3, 10):
            for dx in np.linspace(-3, 1.5, 7):
                t = np.array([xc + dx - s * (mn[0] + mx[0]) / 2, yc - s * (mn[1] + mx[1]) / 2, topo - s * mx[2]])
                hit = G.ocupado((raios - t) / s).reshape(len(A), -1)
                tem = hit.any(1)
                cob = tem.mean()
                folga = passos[np.argmax(hit[tem], 1)].mean() if tem.any() else passos[-1]   # distância até a peça
                amo = amo0 * s + t
                _, j = ref['kd'].query(amo)
                dentro = (np.einsum('ij,ij->i', amo - V0[j], N0[j]) < -0.4).mean()
                queixo = (amo[:, 2] > m['pescoco'] + 1.0).mean()
                nota = cob - 2.5 * dentro - 3 * queixo - 0.15 * folga
                if melhor is None or nota > melhor[0]:
                    melhor = (nota, s, t, cob, dentro, queixo, folga)
    nota, s, t, cob, dentro, queixo, folga = melhor
    print(f"  ajuste peitoral: escala {s:.2f} (caixa {s0:.2f}) topo {s * mx[2] + t[2]:.1f} (ombro {m['ombroZ']:.1f}, pescoço {m['pescoco']:.1f}) cobertura {cob:.2f} dentro {dentro:.3f} queixo {queixo:.3f} folga {folga:.2f}", flush=True)
    return s, t


def ajuste_ombreira(pares, ref):
    """Ombreiras prontas (GLB realista, o par) nos ombros do corpo: escala, inclinação (o braço do
    corpo abre em A; a do arquivo pende reta) e posição pela cobertura do alto do braço, com os
    mesmos parâmetros espelhados nos dois lados (o par fica simétrico). pares: {lado: (V, F)} com
    lado +1 = direita (+Y do jogo). Devolve {lado: função que leva os vértices daquele lado ao lugar}."""
    m, V0, N0, reg = ref['medida'], ref['V'], ref['N'], ref['reg']
    rng = np.random.default_rng(7)
    lados = {}
    for lado, (Vp, Fp) in pares.items():
        nm = 'R' if lado > 0 else 'L'
        J, E = (np.asarray(x, float) for x in ref['bones']['arm' + nm + 'u'])
        comp = np.linalg.norm(E - J)
        eixo = (E - J) / comp
        rel = V0 - J
        ao_longo = rel @ eixo
        mesmo = np.sign(V0[:, 1] - m['cy']) == lado
        braco = (reg == 'bracos') & mesmo & (ao_longo > -1) & (ao_longo < 0.55 * comp)
        alto = (reg == 'tronco') & mesmo & (np.linalg.norm(rel, axis=1) < 4) & (V0[:, 2] > J[2] - 0.5)
        A, AN = V0[braco | alto], N0[braco | alto]
        if len(A) > 700:
            s_ = rng.choice(len(A), 700, replace=False)
            A, AN = A[s_], AN[s_]
        perto = V0[(reg == 'bracos') & mesmo & (ao_longo > 0.1 * comp) & (ao_longo < 0.35 * comp)]
        c0 = (Vp.min(0) + Vp.max(0)) / 2
        org = np.array([c0[0], c0[1], Vp[:, 2].max()])   # origem no alto da ombreira, no meio
        lados[lado] = dict(J=J, eixo=eixo, comp=comp, A=A, AN=AN, prof=np.ptp(perto[:, 0]), org=org,
                           Pp=amostras_superficie(Vp - org, Fp, 40000, rng), dx=np.ptp(Vp[:, 0]), dy=np.ptp(Vp[:, 1]),
                           ang=np.arctan2(abs(eixo[1]), -eixo[2]))
    # A ombreira fina de frente para trás e larga para o lado foi modelada com a face larga virada
    # para a frente do arquivo: no corpo ela gira um quarto de volta (as duas voltas são tentadas,
    # a cobertura escolhe a face de dentro); a escala inicial cobre o braço de frente a trás com folga
    fina = all(L['dx'] < 0.6 * L['dy'] for L in lados.values())
    voltas = (np.pi / 2, -np.pi / 2) if fina else (0.0,)
    s0 = float(np.mean([1.25 * L['prof'] / max(L['dy'] if fina else L['dx'], 1e-6) for L in lados.values()]))
    ang = float(np.mean([L['ang'] for L in lados.values()]))
    passos = np.linspace(0.05, 2.0, 12)
    for lado, L in lados.items():
        L['raios'] = (L['A'][:, None, :] + L['AN'][:, None, :] * passos[None, :, None]).reshape(-1, 3)
    def giro(f, lado, vz=0.0):
        a, b = f * ang * lado, vz * lado                 # inclina em torno do X (a ponta de baixo vai para fora) depois do quarto de volta em Z
        ca, sa, cb, sb = np.cos(a), np.sin(a), np.cos(b), np.sin(b)
        return np.array([[1, 0, 0], [0, ca, -sa], [0, sa, ca]]) @ np.array([[cb, -sb, 0], [sb, cb, 0], [0, 0, 1]])
    melhor = None
    for vz, f in [(vz, f) for vz in voltas for f in (0.0, 0.5, 1.0)]:
        prep = {}
        for lado, L in lados.items():
            Pp = L['Pp'] @ giro(f, lado, vz).T
            prep[lado] = (Grade(Pp, np.ptp(Pp, 0).max() / 60), Pp[::25])
        for s in s0 * np.linspace(0.75, 1.3, 6):
            for dz in np.linspace(-1.5, 3.0, 7):
                for dy in np.linspace(-1.0, 2.5, 6):
                    for dx in np.linspace(-1.5, 1.5, 5):
                        nota_t, med = 0.0, []
                        for lado, L in lados.items():
                            Grd, amo0 = prep[lado]
                            t = L['J'] + np.array([dx, dy * lado, dz])
                            hit = Grd.ocupado((L['raios'] - t) / s).reshape(len(L['A']), -1)
                            tem = hit.any(1)
                            cob = tem.mean()
                            folga = passos[np.argmax(hit[tem], 1)].mean() if tem.any() else passos[-1]
                            amo = amo0 * s + t
                            _, j = ref['kd'].query(amo)
                            dentro = (np.einsum('ij,ij->i', amo - V0[j], N0[j]) < -0.3).mean()
                            cotovelo = (((amo - L['J']) @ L['eixo']) > 0.8 * L['comp']).mean()   # não desce até o cotovelo
                            nota_t += cob - 2.5 * dentro - 0.2 * folga - 1.5 * cotovelo
                            med.append((cob, dentro, folga, cotovelo))
                        if melhor is None or nota_t > melhor[0]:
                            melhor = (nota_t, vz, f, s, dz, dy, dx, med)
    nota, vz, f, s, dz, dy, dx, med = melhor
    cob, dentro, folga, cotovelo = np.mean(med, 0)
    print(f"  ombreiras: escala {s:.2f} (inicial {s0:.2f}) volta {np.degrees(vz):.0f}° inclinação {np.degrees(f * ang):.0f}° alto {dz:+.1f} fora {dy:+.1f} frente {dx:+.1f} · cobertura {cob:.2f} dentro {dentro:.3f} folga {folga:.2f} cotovelo {cotovelo:.2f}", flush=True)
    return {lado: (lambda V, L=L, lado=lado: ((V - L['org']) @ giro(f, lado, vz).T) * s + L['J'] + np.array([dx, dy * lado, dz])) for lado, L in lados.items()}


def processar_cobertura(p, refs, modo):
    t0 = time.time()
    V, UV, F, mapas, N = ler_peca(p['arq'])
    R = reduzir_e_assar(V, UV, F, N, mapas, p['tri'], p['tex'])
    porCorpo, info = {}, {}
    for cid, ref in refs.items():
        s, t, (HV, HN, kdH, hh) = ajuste_cobertura(R['Vr'], R['Fr'], ref, modo)
        P = R['Vr'] * s + t
        # o que ficou dentro da cabeça sai até a superfície
        cabeca = dict(V=HV, N=HN, kd=kdH)
        P = empurrar_para_fora(P, cabeca, 0.02 * hh)
        if modo != 'barba':
            P = empurrar_para_fora(P, dict(V=ref['V'], N=ref['N'], kd=ref['kd']), 0.12)
        Np = im.normais_vertices(P, R['Fr'])
        W = transferir_pesos(P, ref)
        ih = ref['nomes'].index('head')
        m = ref['medida']
        cab = P[:, 2] > m['pescoco'] + 0.15 * hh
        W[cab] = 0
        W[cab, ih] = 1
        if modo == 'cabelo' and 'hair' in ref['nomes']:
            # cabelo comprido: abaixo da orelha e afastado da cabeça, as pontas balançam (osso 'hair')
            zc = m['pescoco'] + 0.55 * hh
            r = np.hypot(P[:, 0] - m['cx'], P[:, 1] - m['cy'])
            wh = np.clip((zc - P[:, 2]) / (0.6 * hh), 0, 1) * np.clip((r - 0.25 * hh) / (0.2 * hh), 0, 1) * 0.85
            W *= (1 - wh)[:, None]
            W[:, ref['nomes'].index('hair')] += wh
        porCorpo[cid] = pele_js(P[R['vmap']], Np[R['vmap']], R['Uo'], R['Fo'], W[R['vmap']], ref['nomes'])
        info[cid] = dict(escala=round(float(s), 4))
    dados = dict(v=2, tipo=p['tipo'], vaga=p.get('vaga'), q=Q, porCorpo=porCorpo, ajuste=info, origem=p['arq'], pbr=1)
    destino = gravar(p['id'], dados, mapas_js(R, p['tex']))
    print(f"{p['id']}: {len(R['Fo'])} triângulos → {os.path.getsize(destino) // 1024} KB ({time.time() - t0:.0f}s)", flush=True)


def pesos_capa(W, P, ref):
    """A capa quase não segue os braços; da axila para baixo pende nas abas do casaco do Kael
    (frente, lados e costas, com as barras embaixo): balança e acompanha as pernas."""
    m, nomes = ref['medida'], ref['nomes']
    W = W.copy()
    it_ = nomes.index('torso')
    for nm in ['armRu', 'armLu', 'armRf', 'armLf', 'handR', 'handL']:
        if nm in nomes:
            j = nomes.index(nm)
            W[:, it_] += 0.7 * W[:, j]
            W[:, j] *= 0.3
    abas = [('cFR', 64), ('cSR', 107), ('cBR', 147), ('cFL', -64), ('cSL', -107), ('cBL', -147)]
    nomes = list(nomes) + [a for a, _ in abas] + [a + '2' for a, _ in abas]
    W = np.hstack([W, np.zeros((len(W), 2 * len(abas)))])
    ang = np.degrees(np.arctan2(P[:, 1] - m['cy'], P[:, 0] - m['cx']))
    pr = np.stack([np.clip(1 - np.abs((ang - c + 180) % 360 - 180) / 60, 0, 1) for _, c in abas], 1)
    vazio = pr.sum(1) < 1e-6
    pr[vazio, np.argmin(np.stack([np.abs((ang[vazio] - c + 180) % 360 - 180) for _, c in abas], 1), axis=1)] = 1
    pr /= pr.sum(1, keepdims=True)
    wp = np.clip((m['axila'] - P[:, 2]) / 5.0, 0, 1)
    fundo = np.clip((m['quadrilZ'] - P[:, 2]) / 8.0, 0, 1)
    W *= (1 - wp)[:, None]
    na = len(abas)
    W[:, -2 * na:-na] += (wp * (1 - fundo))[:, None] * pr
    W[:, -na:] += (wp * fundo)[:, None] * pr
    return W, nomes


def pesos_capuz(W, P, ref, nomes):
    """O capuz segue a cabeça (da altura do pescoço para cima, só o osso da cabeça)."""
    m = ref['medida']
    W = W.copy()
    ih = nomes.index('head')
    cab = P[:, 2] > m['pescoco'] + 0.1 * (m['topo'] - m['pescoco'])
    W[cab] = 0
    W[cab, ih] = 1
    return W


def processar_blender(p, refs):
    """Peça feita no Blender sobre os corpos do jogo (tools/blender/armaduras.py): já está no lugar
    (metros → unidades do jogo), a forma do corpo feminino vem na shape key; aqui só os pesos do corpo,
    um empurrão de segurança para fora da pele e as texturas assadas do próprio GLB."""
    t0 = time.time()
    V, UV, F, mapas, N = ler_peca(p['arq'])
    V = V * ESCALA_BLENDER
    alvo = mapas.get('alvo')
    Vf = V + (alvo @ R_JOGO.T) * ESCALA_BLENDER if alvo is not None else V
    if p.get('lado'):
        # ombreiras: as duas vêm no mesmo arquivo; fica a do lado pedido (direita = +Y do jogo)
        s = 1 if p['lado'] == 'D' else -1
        cy = refs['corpo_m']['medida']['cy']
        F = F[np.sign(V[F].mean(1)[:, 1] - cy) == s]
        usados, nova = np.unique(F, return_inverse=True)
        V, Vf, UV, N, F = V[usados], Vf[usados], UV[usados], N[usados], nova.reshape(-1, 3)
    Vs, Fs, inv = im.soldar(V, F)
    Vfs = np.zeros_like(Vs)
    Vfs[inv] = Vf
    vaga = p['vaga']
    porCorpo = {}
    for cid, ref in refs.items():
        m = ref['medida']
        P = (Vs if cid == 'corpo_m' else Vfs).copy()
        corpo = dict(V=ref['V'], N=ref['N'], kd=ref['kd'])
        if vaga == 'capacete':
            HV, HN = cabeca_de_referencia(ref)
            corpo = dict(V=np.concatenate([ref['V'][ref['V'][:, 2] < m['pescoco']], HV]), N=np.concatenate([ref['N'][ref['V'][:, 2] < m['pescoco']], HN]))
            corpo['kd'] = cKDTree(corpo['V'])
        P = empurrar_para_fora(P, corpo, 0.12)
        # normais: as do arquivo (as do assado, com as quinas vivas), giradas pela mudança de forma
        Nl = im.normais_vertices(P, Fs)[inv]
        Nb = im.normais_vertices(Vs, Fs)[inv]
        Np = N + (Nl - Nb)
        Np /= np.linalg.norm(Np, axis=1, keepdims=True) + 1e-9
        W = transferir_pesos(P, ref)
        nomes = ref['nomes']
        if vaga == 'capa':
            W, nomes = pesos_capa(W, P, ref)
        if vaga == 'capacete':
            W = pesos_capuz(W, P, ref, nomes)
        porCorpo[cid] = pele_js(P[inv], Np, UV, F, W[inv], nomes)
    dados = dict(v=2, tipo='peca', vaga=vaga, q=Q, porCorpo=porCorpo, esconde=ESCONDE.get(vaga, []), origem=p['arq'], pbr=1)
    destino = gravar(p['id'], dados, mapas_js(dict(cor=mapas['cor'], mr=mapas.get('mr'), nrm=mapas.get('nrm')), p['tex']))
    print(f"{p['id']}: {len(F)} triângulos (Blender) → {os.path.getsize(destino) // 1024} KB ({time.time() - t0:.0f}s)", flush=True)


# ============================================================ armaduras: caixa da região, pele por fora
def caixa_regiao(ref, vaga, lado=None):
    """Caixa-alvo (min, max) da peça no corpo de referência."""
    V, m, reg = ref['V'], ref['medida'], ref['reg']
    Y = V[:, 1]
    if vaga == 'peitoral':
        sel = (reg == 'tronco') & (V[:, 2] > m['quadrilZ'] + 0.5) & (V[:, 2] < m['pescoco'])
        bra = (reg == 'bracos') & (V[:, 2] > m['axila'] - 2.5)
        S, B = V[sel], V[bra]
        y0, y1 = min(S[:, 1].min(), B[:, 1].min() if len(B) else 0), max(S[:, 1].max(), B[:, 1].max() if len(B) else 0)
        return np.array([S[:, 0].min() - 0.5, y0 - 0.4, m['quadrilZ'] - 0.5]), np.array([S[:, 0].max() + 0.9, y1 + 0.4, m['ombroZ'] + 1.6])
    if vaga == 'calcas':
        sel = ((reg == 'pernas') | ((reg == 'tronco') & (V[:, 2] < m['quadrilZ'] + 2.5))) & (V[:, 2] > m['tornozelo'] + 0.6)
        S = V[sel]
        return np.array([S[:, 0].min() - 0.4, S[:, 1].min() - 0.4, m['tornozelo'] + 0.4]), np.array([S[:, 0].max() + 0.4, S[:, 1].max() + 0.4, m['quadrilZ'] + 3.2])
    if vaga == 'saia':
        # saiote: da cintura até acima do joelho, por fora das coxas
        joelho = float(np.mean([ref['bones'][b][1][2] for b in ('thighR', 'thighL')])) if 'thighR' in ref['bones'] else m['quadrilZ'] - 13
        sel = ((reg == 'pernas') | (reg == 'tronco')) & (V[:, 2] > joelho + 2) & (V[:, 2] < m['quadrilZ'] + 3)
        S = V[sel]
        return np.array([S[:, 0].min() - 0.7, S[:, 1].min() - 0.7, joelho + 1.0]), np.array([S[:, 0].max() + 0.7, S[:, 1].max() + 0.7, m['quadrilZ'] + 3.4])
    if vaga == 'botas':
        sel = ((reg == 'pes') | ((reg == 'pernas') & (V[:, 2] < m['tornozelo'] + 0.3 * (m['quadrilZ'] - m['tornozelo'])))) & (np.sign(Y) == lado)
        S = V[sel]
        return S.min(0) - 0.35, S.max(0) + np.array([0.35, 0.35, 0.0])
    if vaga == 'luvas':
        sel = ((reg == 'maos') | ((reg == 'bracos') & False)) & (np.sign(Y) == lado)
        S = V[sel]
        return S.min(0) - 0.25, S.max(0) + 0.25
    raise ValueError(vaga)


def separar_par(V, F):
    """Botas e luvas vêm em par lado a lado: separa pelos componentes do lado +Y e −Y."""
    cy = np.median(V[:, 1])
    lado_t = np.sign(V[F].mean(1)[:, 1] - cy)
    return [(s, F[lado_t == s]) for s in (1, -1)]


def girar_z(P, ang, c):
    ca, sa = np.cos(ang), np.sin(ang)
    Q_ = P - c
    return np.stack([Q_[:, 0] * ca - Q_[:, 1] * sa, Q_[:, 0] * sa + Q_[:, 1] * ca, Q_[:, 2]], 1) + c


def encaixar_caixa(P, alvo_min, alvo_max, banda=0.15, fixo=None):
    mn, mx = P.min(0), P.max(0)
    s = (alvo_max - alvo_min) / np.maximum(mx - mn, 1e-6)
    if fixo is not None:
        s = np.full(3, s[fixo])
    else:
        med = np.exp(np.log(s).mean())
        s = np.clip(s, med * (1 - banda), med * (1 + banda))
    return (P - (mn + mx) / 2) * s + (alvo_min + alvo_max) / 2


def processar_armadura(p, refs):
    t0 = time.time()
    V, UV, F, mapas, N = ler_peca(p['arq'])
    vaga = p['vaga']
    if vaga in ('ombroE', 'ombroD'):
        # as duas ombreiras vêm no mesmo arquivo: fica a do lado pedido (direita = +Y do jogo); o vão
        # entre as duas dá a escala inicial (o par foi modelado na largura dos ombros)
        lados = dict(separar_par(V, F))
        pares = {}
        for s_, Fs in lados.items():
            Vs_, Fs_ = im.reduzir(*compacta(V, UV, N, Fs)[::3], 3000)
            pares[s_] = (Vs_, Fs_)
        lado = 1 if p['lado'] == 'D' else -1
        V, UV, N, F = compacta(V, UV, N, lados[lado])
    R = reduzir_e_assar(V, UV, F, N, mapas, p['tri'], p['tex'])
    porCorpo = {}
    if p.get('girar'):
        # giro em torno do eixo vertical (o GLB foi gerado olhando a peça de costas)
        a = np.radians(p['girar'])
        c0 = (R['Vr'].min(0) + R['Vr'].max(0)) / 2
        R['Vr'] = girar_z(R['Vr'], a, c0)
    capacete_m = None
    for cid, ref in refs.items():
        m = ref['medida']
        Vr = R['Vr'].copy()
        P = np.zeros_like(Vr)
        if vaga in ('botas', 'luvas'):
            for s, Fs in separar_par(Vr, R['Fr']):
                idx = np.unique(Fs)
                Pi = Vr[idx]
                if vaga == 'luvas':
                    # dorso para fora e polegar para a frente (no par do arquivo, os polegares se olham)
                    Pi = girar_z(Pi, -s * np.pi / 2 * -1, Pi.mean(0))
                    # inclina como a mão do corpo (braço em A)
                    eixo = ref['bones'].get('arm' + ('R' if s > 0 else 'L') + 'f')
                    if eixo is not None:
                        d = eixo[1] - eixo[0]
                        ang = np.arctan2(abs(d[1]), -d[2]) * (1 if s > 0 else -1)
                        c0 = Pi.mean(0)
                        ca, sa = np.cos(ang), np.sin(ang)
                        Q_ = Pi - c0
                        Pi = np.stack([Q_[:, 0], Q_[:, 1] * ca + Q_[:, 2] * sa, -Q_[:, 1] * sa + Q_[:, 2] * ca], 1) + c0
                lado = 1 if s > 0 else -1
                amn, amx = caixa_regiao(ref, vaga, lado)
                if vaga == 'luvas':
                    # a luva cobre a mão e sobe pelo punho: escala pelo comprimento (z), alinhada nos dedos
                    alt = (amx[2] - amn[2]) * 1.45
                    sc = alt / max(np.ptp(Pi[:, 2]), 1e-6)
                    Pi = (Pi - Pi.mean(0)) * sc
                    Pi += np.array([(amn[0] + amx[0]) / 2, (amn[1] + amx[1]) / 2, amn[2] - Pi[:, 2].min()])
                else:
                    # bota: escala pelo comprimento do pé, sola no chão, calcanhar alinhado
                    sc = (amx[0] - amn[0]) / max(np.ptp(Pi[Pi[:, 2] < Pi[:, 2].min() + 0.2 * np.ptp(Pi[:, 2])][:, 0]), 1e-6) * 1.04
                    Pi = (Pi - np.array([Pi[:, 0].min(), Pi[:, 1].mean(), Pi[:, 2].min()])) * sc
                    Pi += np.array([amn[0] - 0.1, (amn[1] + amx[1]) / 2, ref['V'][:, 2].min() - 0.05])
                P[idx] = Pi
        elif vaga in ('ombroE', 'ombroD'):
            P = ajuste_ombreira(pares, ref)[lado](Vr)
        elif vaga == 'peitoral' and p.get('real'):
            s, t = ajuste_peitoral(Vr, R['Fr'], ref)
            P = Vr * s + t
        elif vaga in ('peitoral', 'calcas'):
            amn, amx = caixa_regiao(ref, 'saia' if p.get('saia') else vaga)
            P = encaixar_caixa(Vr, amn, amx, 0.12)
        elif vaga == 'capa':
            # o colar em volta da base do pescoço (sobre o trapézio); o pano pelos ombros, na largura
            # deles (medida a 30% do alto da capa)
            mn, mx = Vr.min(0), Vr.max(0)
            hc = mx[2] - mn[2]
            V0 = ref['V']
            fat = Vr[np.abs(Vr[:, 2] - (mx[2] - 0.3 * hc)) < 0.03 * hc]
            ombros = V0[np.abs(V0[:, 2] - m['ombroZ']) < 0.4]
            lo = np.ptp(ombros[:, 1])
            sc = lo * 1.1 / max(np.ptp(fat[:, 1]), 1e-6)
            zs = np.arange(m['ombroZ'], m['corte'], 0.2)
            larg = np.array([np.ptp(V0[np.abs(V0[:, 2] - z) < 0.15][:, 1]) for z in zs])
            zb = float(zs[int(np.argmax(larg < 0.45 * lo))])
            fb = V0[np.abs(V0[:, 2] - zb) < 0.2]
            topo = Vr[Vr[:, 2] > mx[2] - 0.05 * hc]
            P = (Vr - np.array([(topo[:, 0].min() + topo[:, 0].max()) / 2, (topo[:, 1].min() + topo[:, 1].max()) / 2, mx[2]])) * sc
            P += np.array([(fb[:, 0].min() + fb[:, 0].max()) / 2, m['cy'], zb + 0.5])
            print(f"  capa: escala {sc:.2f}, colar {np.ptp(topo[:, 1]) * sc:.1f} de largura (pescoço {np.ptp(fb[:, 1]):.1f}) em z {zb:.1f}", flush=True)
        elif vaga == 'acessorio':
            mn, mx = Vr.min(0), Vr.max(0)
            sc = 0.3 * (m['ombroZ'] - m['quadrilZ']) / max(mx[2] - mn[2], 1e-6)
            P = (Vr - np.array([(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, mx[2]])) * sc
            frente = ref['V'][(ref['reg'] == 'tronco') & (np.abs(ref['V'][:, 2] - (m['pescoco'] - 2)) < 1.0)][:, 0].max()
            P += np.array([frente + 0.2, m['cy'], m['pescoco'] - 0.2])
        elif vaga == 'capacete':
            HVc, _ = cabeca_de_referencia(ref)
            cab = HVc[HVc[:, 2] > m['pescoco']]
            caixa = (cab.min(0), cab.max(0))
            if cid != 'corpo_m' and capacete_m is not None:
                # os outros corpos partem do encaixe do masculino (o ajuste por cobertura na cabeça
                # menor do corpo feminino chegava a deixar o elmo para trás e o rosto atravessando a
                # viseira): escala pelo tamanho da cabeça, centro e topo alinhados
                (Pm, cm0, cm1) = capacete_m
                esc = float(np.mean((caixa[1] - caixa[0]) / np.maximum(cm1 - cm0, 1e-6)))
                ancora_m = np.array([(cm0[0] + cm1[0]) / 2, (cm0[1] + cm1[1]) / 2, cm1[2]])
                ancora = np.array([(caixa[0][0] + caixa[1][0]) / 2, (caixa[0][1] + caixa[1][1]) / 2, caixa[1][2]])
                P = (Pm - ancora_m) * esc + ancora
            else:
                s, t, _ = ajuste_cobertura(Vr, R['Fr'], ref, 'capuz')
                P = Vr * s + t
                capacete_m = (P.copy(), caixa[0], caixa[1])
        margem = {'peitoral': 0.3, 'calcas': 0.22, 'botas': 0.2, 'luvas': 0.12, 'capa': 0.4, 'acessorio': 0.18, 'capacete': 0.15, 'ombroE': 0.25, 'ombroD': 0.25}[vaga]
        corpo = dict(V=ref['V'], N=ref['N'], kd=ref['kd'])
        if vaga == 'capacete':
            HV, HN = cabeca_de_referencia(ref)
            corpo = dict(V=np.concatenate([ref['V'][ref['V'][:, 2] < m['pescoco']], HV]), N=np.concatenate([ref['N'][ref['V'][:, 2] < m['pescoco']], HN]))
            corpo['kd'] = cKDTree(corpo['V'])
        P = empurrar_para_fora(P, corpo, margem)
        Np = im.normais_vertices(P, R['Fr'])
        W = transferir_pesos(P, ref)
        nomes = ref['nomes']
        if vaga == 'capa':
            W, nomes = pesos_capa(W, P, ref)
        if vaga == 'capacete':
            W = pesos_capuz(W, P, ref, nomes)
        porCorpo[cid] = pele_js(P[R['vmap']], Np[R['vmap']], R['Uo'], R['Fo'], W[R['vmap']], nomes)
    dados = dict(v=2, tipo='peca', vaga=vaga, q=Q, porCorpo=porCorpo, esconde=p.get('esconde', ESCONDE.get(vaga, [])), origem=p['arq'], pbr=1)
    destino = gravar(p['id'], dados, mapas_js(R, p['tex']))
    print(f"{p['id']}: {len(R['Fo'])} triângulos → {os.path.getsize(destino) // 1024} KB ({time.time() - t0:.0f}s)", flush=True)


# ============================================================ catálogo e principal
def gravar_catalogo():
    itens = []
    for c in CORPOS:
        itens.append(dict(id=c['id'], tipo='corpo', nome=c['nome'], arq='assets/Criar_Personagem/' + c['arq'], mini='assets/Criar_Personagem/' + c['mini'], js='js/assets/criacao/' + c['id'] + '.js',
                          convertido=os.path.exists(os.path.join(DEST, c['id'] + '.js'))))
    for p in PECAS:
        it = dict(id=p['id'], tipo=p['tipo'], nome=p['nome'], arq='assets/Criar_Personagem/' + p['arq'], mini='assets/Criar_Personagem/' + p['mini'], js='js/assets/criacao/' + p['id'] + '.js')
        for k in ('vaga', 'classe', 'nivel', 'ombros', 'blender', 'real'):
            if p.get(k) is not None:
                it[k] = p[k]
        if 'esconde' in p or p.get('vaga') in ESCONDE:
            it['esconde'] = p.get('esconde', ESCONDE.get(p.get('vaga'), []))
        it['convertido'] = os.path.exists(os.path.join(DEST, p['id'] + '.js'))
        itens.append(it)
    destino = os.path.join(DEST, 'catalogo.js')
    with open(destino, 'w', encoding='utf-8') as f:
        f.write("""'use strict';
// ECLIPSE ZERO · catálogo das peças da criação de personagem (tools/importar_criacao.py)
// Cada peça: id, tipo (corpo, rosto, cabelo, barba, peca), nome, vaga, classe e nível (armaduras),
// o GLB de origem (arq), a miniatura (mini) e o arquivo convertido (js, carregado sob demanda).
// Não edite à mão: rode o conversor de novo.
""")
        f.write('const CRIA_CATALOGO = ' + json.dumps(itens, ensure_ascii=False, indent=1) + ';\n')
    print('catálogo:', destino, len(itens), 'itens')


def gravar_minis(lado=144):
    """Miniaturas da tela de criação (PNG com fundo transparente) recortadas, num quadrado, em
    data URI WebP: js/assets/criacao/minis.js. Imagens de arquivo não podem ir para o canvas do
    jogo abrindo o index.html do disco (o canvas fica 'contaminado' e a captura do salvamento falha)."""
    minis = {}
    for c in CORPOS + PECAS:
        img = cv2.imread(os.path.join(ORIG, c['mini']), cv2.IMREAD_UNCHANGED)
        if img is None:
            continue
        if img.ndim == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGRA)
        elif img.shape[2] == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        a = img[:, :, 3]
        ys, xs = np.nonzero(a > 8)
        if len(xs):
            img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        h, w = img.shape[:2]
        s = (lado - 8) / max(h, w)
        img = cv2.resize(img, (max(1, round(w * s)), max(1, round(h * s))), interpolation=cv2.INTER_AREA)
        q = np.zeros((lado, lado, 4), np.uint8)
        y0, x0 = (lado - img.shape[0]) // 2, (lado - img.shape[1]) // 2
        q[y0:y0 + img.shape[0], x0:x0 + img.shape[1]] = img
        ok, buf = cv2.imencode('.webp', q, [cv2.IMWRITE_WEBP_QUALITY, 84])
        minis[c['id']] = 'data:image/webp;base64,' + base64.b64encode(buf.tobytes()).decode('ascii')
    destino = os.path.join(DEST, 'minis.js')
    with open(destino, 'w', encoding='utf-8') as f:
        f.write("""'use strict';
// ECLIPSE ZERO · miniaturas da tela de criação (tools/importar_criacao.py, das PNG de assets/Criar_Personagem/)
// Não edite à mão: rode o conversor de novo.
""")
        f.write('window.CRIA_MINIS = ' + json.dumps(minis, separators=(',\n', ':')) + ';\n')
        f.write("if (typeof Criacao3D !== 'undefined') Criacao3D.carregado('minis');\n")
    print('miniaturas:', destino, len(minis), f'({os.path.getsize(destino) // 1024} KB)')


def _tarefa(p):
    try:
        refs = {c['id']: referencia(c['id']) for c in CORPOS}
        if p['tipo'] == 'rosto':
            processar_rosto(p, refs)
        elif p['tipo'] in ('cabelo', 'barba'):
            processar_cobertura(p, refs, p['tipo'])
        elif p.get('blender'):
            processar_blender(p, refs)
        else:
            processar_armadura(p, refs)
        return p['id'], None
    except Exception as e:   # uma peça com problema não derruba as outras
        import traceback
        traceback.print_exc()
        return p['id'], str(e)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--so', nargs='*', help='ids a converter (sem: todas)')
    ap.add_argument('--sem-corpos', action='store_true', help='usa os corpos já convertidos (.cache_criacao)')
    ap.add_argument('--listar', action='store_true')
    ap.add_argument('--minis', action='store_true', help='só as miniaturas e o catálogo')
    ap.add_argument('-j', type=int, default=2, help='processos em paralelo (cada peça usa uns 4 GB de memória)')
    a = ap.parse_args()
    if a.listar:
        for c in CORPOS + PECAS:
            ok = os.path.exists(os.path.join(ORIG, c['arq']))
            print(f"{c['id']:28s} {c.get('tipo', 'corpo'):7s} {c.get('vaga') or '':10s} {c.get('classe') or '':12s} {str(c.get('nivel') or ''):3s} {'ok' if ok else 'FALTA'} {c['arq']}")
        return
    if a.minis:
        os.makedirs(DEST, exist_ok=True)
        gravar_minis()
        gravar_catalogo()
        return
    if not a.sem_corpos and (not a.so or any(x in [c['id'] for c in CORPOS] for x in a.so)):
        for c in CORPOS:
            if not a.so or c['id'] in a.so or not os.path.exists(os.path.join(CACHE, c['id'] + '.pkl')):
                processar_corpo(c)
    lista = [p for p in PECAS if not a.so or p['id'] in a.so]
    erros = []
    if lista:
        with Pool(a.j, maxtasksperchild=1) as pool:   # processo novo por peça: a memória volta a cada uma
            for pid, err in pool.imap_unordered(_tarefa, lista):
                if err:
                    erros.append((pid, err))
    gravar_minis()
    gravar_catalogo()
    if erros:
        print('peças com erro:', erros)


if __name__ == '__main__':
    main()
