"""Barreira neon (objeto de cenário).

Barreira neon: mureta de concreto da corporação com faixa acesa no topo.
Cidade: Metrópole Tecnológica. Um objeto, um material (texturas assadas de 4 materiais procedurais: vidro escuro, metal grafite, neon magenta, neon ciano), origem na base, metros.
Rode: python3 tools/blender/asset_barreira_neon.py (ou blender -b -P tools/blender/asset_barreira_neon.py).
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
    o = Obj('barreira_neon')
    o.caixa(1, 2.4, 0.7, 0.35, chanfro=0.03)
    o.caixa(1, 2.4, 0.36, 0.62, (0, 0, 0.35), chanfro=0.03)
    o.caixa(3, 2.42, 0.38, 0.05, (0, 0, 0.95))
    for x in (-0.8, 0, 0.8):
        o.caixa(2, 0.28, 0.72, 0.06, (x, 0, 0.18))
    o.finalizar(CELULAS, angulo=(60, 0, 30))


if __name__ == '__main__':
    main()
