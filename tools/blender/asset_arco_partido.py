"""Arco partido (objeto de cenário).

Arco partido: portal de pedra da capital, uma coluna quebrada, escombros e cristais carmesins.
Cidade: Cidade das Ruínas Carmesins. Um objeto, um material (texturas assadas de 4 materiais procedurais: pedra clara, pedra escura, bronze velho, cristal carmesim), origem na base, metros.
Rode: python3 tools/blender/asset_arco_partido.py (ou blender -b -P tools/blender/asset_arco_partido.py).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utils as U  # noqa: E402
from kit import Obj, rad  # noqa: E402

CELULAS = [dict(cor=(0.42, 0.36, 0.34), aspereza=0.88, desgaste=0.6, padrao='blocos'),   # pedra clara gasta
           dict(cor=(0.2, 0.16, 0.16), aspereza=0.9, desgaste=0.5),     # pedra escura
           dict(cor=(0.42, 0.27, 0.14), metal=0.8, aspereza=0.55, desgaste=0.7, borda_metal=True),   # bronze velho
           dict(cor=(1.0, 0.12, 0.25), aspereza=0.2, emissao=(1.0, 0.12, 0.25), desgaste=0, padrao='veios')]   # cristal carmesim


def main():
    U.limpar_cena()
    o = Obj('arco_partido', 'modular')
    o.caixa(1, 1.0, 1.0, 0.4, (-1.8, 0, 0), chanfro=0.05)
    o.caixa(1, 1.0, 1.0, 0.4, (1.8, 0, 0), chanfro=0.05)
    o.caixa(0, 0.8, 0.8, 3.8, (-1.8, 0, 0.4), chanfro=0.04)
    o.caixa(0, 0.8, 0.8, 2.2, (1.8, 0, 0.4), chanfro=0.04)
    o.caixa(0, 0.75, 0.75, 0.5, (1.85, 0.05, 2.62), rot=(rad(8), rad(-12), rad(10)))
    o.caixa(0, 2.6, 0.85, 0.7, (-1.0, 0, 4.2), chanfro=0.04)
    o.caixa(1, 0.45, 0.9, 0.55, (0.15, 0, 4.2), rot=(0, rad(-6), 0))
    for x, y, s, a in [(0.6, 0.6, 0.5, 20), (1.2, -0.7, 0.4, 50), (0.9, 0.9, 0.3, 75)]:
        o.caixa(1, s, s * 0.8, s * 0.6, (x, y, 0), rot=(0, 0, rad(a)))
    o.prisma(3, 0.12, 0.9, (1.1, 0.45, 0.1), rot=(rad(-18), rad(10), 0))
    o.prisma(3, 0.08, 0.6, (1.4, 0.2, 0.1), rot=(rad(14), rad(-16), 0))
    o.finalizar(CELULAS, angulo=(60, 0, 25))


if __name__ == '__main__':
    main()
