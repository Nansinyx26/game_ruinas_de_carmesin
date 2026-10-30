"""Monólito de dados (objeto de cenário).

Monólito de dados: placa de obsidiana com linhas de código acesas e cacos flutuando.
Cidade: Nexus Zero. Um objeto, um material (texturas assadas de 4 materiais procedurais: obsidiana digital, metal claro, código violeta, código ciano), origem na base, metros.
Rode: python3 tools/blender/asset_monolito_dados.py (ou blender -b -P tools/blender/asset_monolito_dados.py).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utils as U  # noqa: E402
from kit import Obj, rad  # noqa: E402

CELULAS = [dict(cor=(0.06, 0.05, 0.11), metal=0.5, aspereza=0.18, desgaste=0.2, padrao='paineis', escala=0.7),   # obsidiana digital
           dict(cor=(0.55, 0.58, 0.66), metal=1.0, aspereza=0.35, desgaste=0.25, padrao='paineis', escala=0.5),  # metal claro
           dict(cor=(0.65, 0.45, 1.0), aspereza=0.3, emissao=(0.65, 0.45, 1.0), desgaste=0, padrao='veios', escala=0.6),   # código violeta
           dict(cor=(0.4, 1.0, 0.95), aspereza=0.3, emissao=(0.4, 1.0, 0.95), desgaste=0)]     # código ciano


def main():
    U.limpar_cena()
    import random
    rnd = random.Random(7)
    o = Obj('monolito_dados')
    o.cilindro(1, 1.2, 0.12, lados=16)
    o.caixa(0, 1.3, 0.6, 4.6, (0, 0, 0.12), chanfro=0.04)
    for i in range(11):
        w = rnd.uniform(0.25, 1.0)
        o.caixa(3 if i % 3 else 2, w, 0.03, 0.05, (rnd.uniform(-0.6 + w / 2, 0.6 - w / 2), -0.31, 0.6 + i * 0.34))
    for k, (x, y, z) in enumerate([(0.95, 0.2, 2.6), (-0.9, -0.3, 3.4), (0.7, -0.5, 4.3)]):
        o.prisma(2, 0.1, 0.4, (x, y, z), lados=4, ponta=0.5, rot=(rad(20 * k), rad(30), 0))
    o.finalizar(CELULAS, angulo=(60, 0, 25))


if __name__ == '__main__':
    main()
