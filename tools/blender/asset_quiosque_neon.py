"""Quiosque neon (objeto de cenário).

Quiosque neon: banca de rua com tela acesa, balcão e toldo com filete.
Cidade: Metrópole Tecnológica. Um objeto, um material (texturas assadas de 4 materiais procedurais: vidro escuro, metal grafite, neon magenta, neon ciano), origem na base, metros.
Rode: python3 tools/blender/asset_quiosque_neon.py (ou blender -b -P tools/blender/asset_quiosque_neon.py).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utils as U  # noqa: E402
from kit import Obj, rad  # noqa: E402

CELULAS = [dict(cor=(0.07, 0.11, 0.19), metal=0.7, aspereza=0.15, desgaste=0.15),   # vidro escuro
           dict(cor=(0.15, 0.16, 0.19), metal=0.9, aspereza=0.4, desgaste=0.3, padrao='paineis', borda_metal=True),    # metal grafite
           dict(cor=(1.0, 0.25, 0.85), aspereza=0.3, emissao=(1.0, 0.25, 0.85), desgaste=0),   # neon magenta
           dict(cor=(0.25, 0.9, 1.0), aspereza=0.3, emissao=(0.25, 0.9, 1.0), desgaste=0)]     # neon ciano


def main():
    U.limpar_cena()
    o = Obj('quiosque_neon')
    o.caixa(1, 2.0, 1.4, 2.0, chanfro=0.04)
    o.caixa(0, 2.1, 0.5, 1.0, (0, -0.9, 0))
    for x in (-1.15, 1.15):
        o.cilindro(1, 0.05, 2.3, (x, -1.1, 0), lados=6)
    o.caixa(1, 2.6, 2.0, 0.12, (0, -0.25, 2.3))
    o.caixa(2, 1.2, 0.05, 0.7, (0, -0.72, 1.15))
    o.caixa(3, 2.62, 0.05, 0.05, (0, -1.27, 2.27))
    o.caixa(3, 2.12, 0.04, 0.04, (0, -1.16, 0.98))
    o.finalizar(CELULAS, angulo=(60, 0, 25))


if __name__ == '__main__':
    main()
