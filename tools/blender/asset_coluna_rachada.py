"""Coluna rachada (objeto de cenário).

Coluna rachada: coluna da capital partida no topo, com o tambor caído e um cristal na fenda.
Cidade: Cidade das Ruínas Carmesins. Um objeto, um material (texturas assadas de 4 materiais procedurais: pedra clara, pedra escura, bronze velho, cristal carmesim), origem na base, metros.
Rode: python3 tools/blender/asset_coluna_rachada.py (ou blender -b -P tools/blender/asset_coluna_rachada.py).
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
    o = Obj('coluna_rachada')
    o.caixa(1, 1.4, 1.4, 0.35, chanfro=0.05)
    o.cilindro(0, 0.5, 3.2, (0, 0, 0.35), lados=14, r2=0.46)
    o.cilindro(0, 0.46, 0.35, (0.04, 0, 3.52), lados=14, r2=0.28, rot=(rad(9), rad(-7), 0))
    o.cilindro(0, 0.48, 0.9, (1.3, 0.5, 0.48), lados=14, rot=(rad(90), 0, rad(30)))
    o.prisma(3, 0.1, 0.75, (0.25, -0.3, 2.9), rot=(rad(-25), rad(20), 0))
    o.prisma(3, 0.07, 0.5, (1.0, 0.1, 0.0), rot=(rad(10), rad(15), 0))
    o.finalizar(CELULAS, angulo=(60, 0, 30))


if __name__ == '__main__':
    main()
