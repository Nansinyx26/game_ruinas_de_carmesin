"""Anel de dados (objeto de cenário).

Anel de dados: portal circular de metal sobre a base, com o anel interno aceso e a esfera de dados.
Cidade: Nexus Zero. Um objeto, um material (texturas assadas de 4 materiais procedurais: obsidiana digital, metal claro, código violeta, código ciano), origem na base, metros.
Rode: python3 tools/blender/asset_anel_dados.py (ou blender -b -P tools/blender/asset_anel_dados.py).
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
    o = Obj('anel_dados', 'modular')
    o.caixa(0, 2.4, 1.0, 0.4, chanfro=0.05)
    for x in (-1.5, 1.5):
        o.caixa(0, 0.4, 0.6, 0.9, (x, 0, 0.4), chanfro=0.04)
    o.anel(1, 1.9, 0.14, (0, 0, 2.4), lados=32, seg=6, rot=(rad(90), 0, 0))
    o.anel(3, 1.68, 0.05, (0, 0, 2.4), lados=32, seg=4, rot=(rad(90), 0, 0))
    o.esfera(2, 0.28, (0, 0, 2.4), seg=10, aneis=6)
    o.finalizar(CELULAS, angulo=(60, 0, 20))


if __name__ == '__main__':
    main()
