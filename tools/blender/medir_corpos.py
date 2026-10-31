"""Mede os dois corpos da criação em anéis (o "molde" que o alfaiate do Blender veste).

As armaduras feitas no Blender (tools/blender/armaduras.py) são montadas sobre o corpo do jogo:
cada peça é um tubo de anéis em volta de um eixo (tronco, braço, mão, perna, pé) ou uma casca em
volta da cabeça, com o raio de cada anel medido na própria malha do corpo, em vários ângulos, mais
a folga da peça. Os anéis são os mesmos (mesma quantidade, mesmos ângulos) no corpo masculino e no
feminino: a peça sai com a mesma malha nos dois, só muda a forma, e vai num GLB só (a forma do
corpo feminino numa shape key, 'corpo_f').

Lê os corpos já convertidos por tools/importar_criacao.py (.cache_criacao/corpo_m.pkl e
corpo_f.pkl: malha soldada, regiões, juntas e ossos; a cabeça encaixada cabeca2_<topo>.npz) e
grava tools/blender/moldes_corpo.json, já nos eixos e na escala do Blender (metros, a frente do
personagem para −Y, o lado direito dele para −X: o glTF exportado com +Y para cima volta aos eixos
do jogo no conversor). Rode com o python3 do sistema (numpy e scipy), não precisa do Blender:
  python3 tools/importar_criacao.py --so corpo_m corpo_f     # (se ainda não houver o cache)
  python3 tools/blender/medir_corpos.py
"""
import json
import os
import pickle
import sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
CACHE = os.path.join(RAIZ, '.cache_criacao')
SAIDA = os.path.join(AQUI, 'moldes_corpo.json')
ESCALA = 34.0          # unidades do jogo por metro
NA = 32                # ângulos por anel


def amostras(V, F, n, rng):
    a, b, c = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    area = np.linalg.norm(np.cross(b - a, c - a), axis=1) + 1e-12
    k = rng.choice(len(F), n, p=area / area.sum())
    w = rng.dirichlet([1, 1, 1], n)
    return a[k] * w[:, :1] + b[k] * w[:, 1:2] + c[k] * w[:, 2:3], k


def base_ortonormal(t):
    """Dois vetores perpendiculares ao eixo t: u aponta o mais possível para a frente (+X do jogo)
    ou, num eixo quase horizontal para a frente (o pé), para cima."""
    t = t / np.linalg.norm(t)
    ref = np.array([1.0, 0, 0]) if abs(t[0]) < 0.8 else np.array([0, 0, 1.0])
    u = ref - t * np.dot(ref, t)
    u /= np.linalg.norm(u)
    return u, np.cross(t, u)


def perfil(P, c, t, u, v, banda, rmin):
    """Raio em NA ângulos (a partir de u, girando para v) dos pontos P na fatia do anel."""
    d = P - c
    s = d @ t
    sel = np.abs(s) < banda
    q = d[sel]
    x, y = q @ u, q @ v
    r = np.hypot(x, y)
    a = (np.arctan2(y, x) % (2 * np.pi)) / (2 * np.pi) * NA
    out = np.full(NA, np.nan)
    for j in range(NA):
        m = (np.abs(((a - j + NA / 2) % NA) - NA / 2) < 0.75) & (r > rmin)
        if m.any():
            out[j] = np.percentile(r[m], 96)
    # buracos: interpola em volta; nada: um círculo pequeno
    if np.isnan(out).all():
        return np.full(NA, max(rmin, 0.3))
    ok = ~np.isnan(out)
    xs = np.arange(NA)
    out = np.interp(xs, np.concatenate([xs[ok] - NA, xs[ok], xs[ok] + NA]), np.tile(out[ok], 3))
    # suaviza (média circular de 3)
    return (np.roll(out, 1) + 2 * out + np.roll(out, -1)) / 4


def tubo(P, pontos, n, banda, rmin=0.0):
    """n anéis ao longo de uma polilinha (pontos do jogo): centros, eixos, bases e perfis. O número
    de anéis é fixo por tubo (o mesmo nos dois corpos: a peça tem a mesma malha); o centro de cada
    anel é o meio da fatia do corpo (suavizado ao longo do tubo), não o osso."""
    pontos = [np.asarray(p, float) for p in pontos]
    seg = [np.linalg.norm(b - a) for a, b in zip(pontos, pontos[1:])]
    L = sum(seg)
    base = []
    for i in range(n):
        s = L * i / (n - 1)
        k, acc = 0, 0.0
        while k < len(seg) - 1 and acc + seg[k] < s:
            acc += seg[k]
            k += 1
        f = (s - acc) / max(seg[k], 1e-9)
        c = pontos[k] + (pontos[k + 1] - pontos[k]) * f
        t = pontos[k + 1] - pontos[k]
        # nas juntas, o eixo é a média dos dois segmentos (o anel não dobra de repente)
        if f < 0.15 and k > 0:
            t = t / np.linalg.norm(t) + (pontos[k] - pontos[k - 1]) / seg[k - 1]
        elif f > 0.85 and k < len(seg) - 1:
            t = t / np.linalg.norm(t) + (pontos[k + 2] - pontos[k + 1]) / seg[k + 1]
        t = t / np.linalg.norm(t)
        u, v = base_ortonormal(t)
        d = P - c
        q = d[np.abs(d @ t) < banda]
        if len(q) > 20:
            x, y = q @ u, q @ v
            dc = u * (np.percentile(x, 2) + np.percentile(x, 98)) / 2 + v * (np.percentile(y, 2) + np.percentile(y, 98)) / 2
        else:
            dc = np.zeros(3)
        base.append([c, t, u, v, dc])
    # o deslocamento do centro, suavizado ao longo do tubo
    D = np.array([b[4] for b in base])
    Ds = D.copy()
    for i in range(n):
        Ds[i] = D[max(0, i - 2): i + 3].mean(0)
    aneis = []
    for (c, t, u, v, _), dc in zip(base, Ds):
        c = c + dc
        aneis.append(dict(c=c, t=t, u=u, v=v, r=perfil(P, c, t, u, v, banda, rmin)))
    return aneis


def para_blender(p):
    """Ponto do jogo (+X frente, +Y direita, +Z cima; unidades) → Blender (metros)."""
    p = np.asarray(p, float)
    return [round(float(-p[1] / ESCALA), 5), round(float(-p[0] / ESCALA), 5), round(float(p[2] / ESCALA), 5)]


def vet_blender(v):
    v = np.asarray(v, float)
    return [round(float(-v[1]), 5), round(float(-v[0]), 5), round(float(v[2]), 5)]


def exportar_tubo(aneis):
    return [dict(c=para_blender(a['c']), t=vet_blender(a['t']), u=vet_blender(a['u']), v=vet_blender(a['v']),
                 r=[round(float(x / ESCALA), 5) for x in a['r']]) for a in aneis]


def medir(cid):
    ref = pickle.load(open(os.path.join(CACHE, cid + '.pkl'), 'rb'))
    V, F, reg, m, k, B = ref['V'], ref['F'], ref['reg'], ref['medida'], ref['k'], ref['bones']
    rng = np.random.default_rng(7)
    P, tri = amostras(V, F, 400000, rng)
    # região de cada amostra: a da maioria dos vértices do triângulo
    rt = reg[F]
    regt = np.where((rt[:, 0] == rt[:, 1]) | (rt[:, 0] == rt[:, 2]), rt[:, 0], rt[:, 1])
    rp = regt[tri]
    cab = np.load(os.path.join(CACHE, f"cabeca2_{round(m['topo'], 3)}.npz"))
    H = cab['V']
    cx, cy = m['cx'], m['cy']
    out = dict(id=cid, altura=round(float(m['topo'] / ESCALA), 4), medida={kk: round(float(vv / ESCALA), 5) for kk, vv in m.items() if kk not in ('cx', 'cy')})
    out['medida']['centro'] = para_blender([cx, cy, 0])[:2]
    tronco = P[(rp == 'tronco') & (P[:, 2] < m['pescoco'] + 0.6)]
    # tronco: da virilha ao pescoço
    zmin = float(np.percentile(tronco[:, 2], 0.5))
    out['tronco'] = exportar_tubo(tubo(tronco, [[cx, cy, zmin + 0.4], [cx, cy, m['pescoco'] + 0.4]], 30, 0.55))
    # pescoço e base da cabeça (para o capuz e o colar)
    out['juntas'] = {nm: para_blender(v) for nm, v in [('ombroR', k['ombro']['1']), ('ombroL', k['ombro']['-1']), ('maoR', k['mao']['1']), ('maoL', k['mao']['-1']),
                                                       ('punhoR', k['punho']['R']), ('punhoL', k['punho']['L']), ('tornozeloR', k['tornozelo']['1']), ('tornozeloL', k['tornozelo']['-1'])]}
    out['ossos'] = {nm: [para_blender(a), para_blender(b)] for nm, (a, b) in B.items()}
    for lado, s in (('R', 1), ('L', -1)):
        Pb = P[(rp == 'bracos') & (np.sign(P[:, 1] - cy) == s)]
        ombro, cot, pun = B['arm' + lado + 'u'][0], B['arm' + lado + 'u'][1], np.asarray(k['punho'][lado], float)
        out['braco' + lado] = exportar_tubo(tubo(Pb, [ombro + (cot - ombro) * 0.12, cot, pun], 20, 0.5))
        Pm = P[(rp == 'maos') & (np.sign(P[:, 1] - cy) == s)]
        d = pun - cot
        d /= np.linalg.norm(d)
        alc = float(((Pm - pun) @ d).max())
        out['mao' + lado] = exportar_tubo(tubo(Pm, [pun - d * 0.3, pun + d * alc * 0.97], 13, 0.4))
        Pl = P[(rp == 'pernas') & (np.sign(P[:, 1] - cy) == s)]
        coxa, joelho, tornoz = B['thigh' + lado][0], B['thigh' + lado][1], B['shin' + lado][1]
        zt = float(np.percentile(Pl[:, 2], 99.5))
        topo = np.array([coxa[0], coxa[1], zt - 0.3])
        out['perna' + lado] = exportar_tubo(tubo(Pl, [topo, joelho, tornoz + np.array([0, 0, 0.6])], 36, 0.55))
        # pé: eixo do calcanhar à ponta, na meia altura do pé
        Pp = P[(rp == 'pes') & (np.sign(P[:, 1] - cy) == s)]
        x0, x1 = float(np.percentile(Pp[:, 0], 0.5)), float(np.percentile(Pp[:, 0], 99.5))
        yc = float(np.median(Pp[:, 1]))
        zc = float(np.percentile(Pp[:, 2], 50)) * 0.8
        out['pe' + lado] = exportar_tubo(tubo(Pp, [[x0 + 0.15, yc, zc], [x1 - 0.1, yc, zc]], 18, 0.35))
    # cabeça: raio em direções (latitude × longitude) a partir do centro do crânio
    zc = (m['nariz'] + m['topo']) / 2 - 0.4
    centro = np.array([float(np.median(H[H[:, 2] > m['nariz']][:, 0])) - 0.3, cy, zc])
    d = H - centro
    rh = np.linalg.norm(d, axis=1)
    lat = np.degrees(np.arcsin(np.clip(d[:, 2] / np.maximum(rh, 1e-9), -1, 1)))
    lon = np.degrees(np.arctan2(d[:, 1], d[:, 0]))
    LAT = list(range(-60, 91, 10))
    LON = list(range(-180, 180, 15))
    grade = []
    for la in LAT:
        linha = []
        for lo in LON:
            sel = (np.abs(lat - la) < 7) & (np.abs((lon - lo + 180) % 360 - 180) < 10 + 6 * abs(la) / 90)
            linha.append(float(np.percentile(rh[sel], 95)) if sel.sum() > 3 else np.nan)
        grade.append(linha)
    G = np.array(grade)
    for i in range(len(LAT)):
        ok = ~np.isnan(G[i])
        if ok.any():
            xs = np.arange(len(LON))
            G[i] = np.interp(xs, np.concatenate([xs[ok] - len(LON), xs[ok], xs[ok] + len(LON)]), np.tile(G[i][ok], 3))
    for j in range(len(LON)):
        ok = ~np.isnan(G[:, j])
        G[:, j] = np.interp(np.arange(len(LAT)), np.arange(len(LAT))[ok], G[ok, j])
    # longitude 0 = frente do jogo (+X); no Blender a frente é −Y (o conversor de eixos cuida)
    out['cabeca'] = dict(centro=para_blender(centro), lat=LAT, lon=LON, r=(G / ESCALA).round(5).tolist(),
                         queixo=round(float((m['nariz'] - 0.55 * (m['topo'] - m['nariz'])) / ESCALA), 5))
    print(f"{cid}: tronco {len(out['tronco'])} anéis, braço {len(out['bracoR'])}, mão {len(out['maoR'])}, perna {len(out['pernaR'])}, pé {len(out['peR'])}, "
          f"altura {out['altura']} m")
    return out


def main():
    faltam = [c for c in ('corpo_m', 'corpo_f') if not os.path.exists(os.path.join(CACHE, c + '.pkl'))]
    if faltam:
        print('Falta o cache dos corpos: rode antes  python3 tools/importar_criacao.py --so corpo_m corpo_f')
        return 1
    moldes = {c: medir(c) for c in ('corpo_m', 'corpo_f')}
    for nome in ('tronco', 'bracoR', 'maoR', 'pernaR', 'peR'):
        assert len(moldes['corpo_m'][nome]) == len(moldes['corpo_f'][nome]), nome   # a mesma malha nos dois corpos
    with open(SAIDA, 'w', encoding='utf-8') as f:
        json.dump(moldes, f, separators=(',', ':'))
    print('gravado', os.path.relpath(SAIDA, RAIZ), os.path.getsize(SAIDA) // 1024, 'KB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
