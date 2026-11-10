"""Poste holográfico (objeto de cenário).

Poste holográfico: luminária de rua com dois anéis de holograma acesos.
Cidade: Metrópole Tecnológica. Um objeto, um material (texturas assadas de 4 materiais procedurais: vidro escuro, metal grafite, neon magenta, neon ciano), origem na base, metros.
Rode: python3 tools/blender/asset_poste_holo.py (ou blender -b -P tools/blender/asset_poste_holo.py).
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
    o = Obj('poste_holo')
    o.caixa(1, 0.5, 0.5, 0.25, chanfro=0.04)
    o.cilindro(1, 0.08, 3.6, (0, 0, 0.25), lados=8)
    o.caixa(1, 0.95, 0.12, 0.1, (0.42, 0, 3.75))
    o.caixa(1, 0.38, 0.26, 0.12, (0.86, 0, 3.66))
    o.caixa(3, 0.32, 0.2, 0.03, (0.86, 0, 3.64))
    o.anel(3, 0.45, 0.025, (0, 0, 2.6), lados=20, seg=4)
    o.anel(2, 0.34, 0.02, (0, 0, 2.95), lados=20, seg=4)
    o.finalizar(CELULAS, angulo=(65, 0, 30))


if __name__ == '__main__':
    main()
