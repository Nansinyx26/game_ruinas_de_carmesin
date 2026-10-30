"""Cristais de código (objeto de cenário).

Cristais de código: aglomerado de cristais violeta e ciano saindo de uma rocha escura.
Cidade: Nexus Zero. Um objeto, um material (texturas assadas de 4 materiais procedurais: obsidiana digital, metal claro, código violeta, código ciano), origem na base, metros.
Rode: python3 tools/blender/asset_cristal_codigo.py (ou blender -b -P tools/blender/asset_cristal_codigo.py).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utils as U  # noqa: E402
from kit import Obj, rad  # noqa: E402

CELULAS = [dict(cor=(0.06, 0.05, 0.11), metal=0.5, aspereza=0.18, desgaste=0.2),   # obsidiana digital
           dict(cor=(0.55, 0.58, 0.66), metal=1.0, aspereza=0.35, desgaste=0.25, padrao='paineis', escala=0.5),  # metal claro
           dict(cor=(0.65, 0.45, 1.0), aspereza=0.3, emissao=(0.65, 0.45, 1.0), desgaste=0, padrao='veios', escala=0.6),   # código violeta
           dict(cor=(0.4, 1.0, 0.95), aspereza=0.3, emissao=(0.4, 1.0, 0.95), desgaste=0, padrao='veios', escala=0.5)]     # código ciano


def main():
    U.limpar_cena()
    o = Obj('cristal_codigo')
    o.caixa(0, 1.4, 1.2, 0.3, chanfro=0.08)
    for k, (x, y, r, h, tx, ty) in enumerate([(0, 0, 0.22, 2.0, 0, 0), (0.35, 0.15, 0.15, 1.3, 18, 8), (-0.3, 0.2, 0.16, 1.4, -14, 10),
                                              (0.2, -0.3, 0.12, 0.9, 10, -16), (-0.25, -0.25, 0.11, 0.8, -12, -14), (0.45, -0.1, 0.09, 0.6, 24, 0)]):
        o.prisma(2 if k % 2 else 3, r, h, (x, y, 0.2), lados=6, ponta=0.3, rot=(rad(ty), rad(tx), 0))
    o.finalizar(CELULAS, angulo=(55, 0, 30))


if __name__ == '__main__':
    main()
