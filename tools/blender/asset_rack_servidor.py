"""Rack de servidores (objeto de cenário).

Rack de servidores: armário de metal com oito servidores e luzes piscando.
Cidade: Nexus Zero. Um objeto, um material (texturas assadas de 4 materiais procedurais: obsidiana digital, metal claro, código violeta, código ciano), origem na base, metros.
Rode: python3 tools/blender/asset_rack_servidor.py (ou blender -b -P tools/blender/asset_rack_servidor.py).
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
    o = Obj('rack_servidor')
    o.caixa(0, 0.9, 0.75, 2.3, chanfro=0.03)
    o.caixa(1, 0.96, 0.8, 0.08, (0, 0, 2.3))
    for i in range(8):
        z = 0.15 + i * 0.26
        o.caixa(1, 0.8, 0.06, 0.2, (0, -0.38, z))
        o.caixa(3 if i % 2 else 2, 0.05, 0.02, 0.05, (0.3, -0.42, z + 0.07))
        o.caixa(3, 0.05, 0.02, 0.05, (0.2, -0.42, z + 0.07))
        o.caixa(2, 0.25, 0.02, 0.02, (-0.2, -0.42, z + 0.09))
    o.finalizar(CELULAS, angulo=(60, 0, 25))


if __name__ == '__main__':
    main()
