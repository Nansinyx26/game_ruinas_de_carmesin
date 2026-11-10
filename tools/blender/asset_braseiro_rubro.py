"""Braseiro rubro (objeto de cenário).

Braseiro rubro: tripé de bronze com a bacia de brasas e chamas carmesins.
Cidade: Cidade das Ruínas Carmesins. Um objeto, um material (texturas assadas de 4 materiais procedurais: pedra clara, pedra escura, bronze velho, cristal carmesim), origem na base, metros.
Rode: python3 tools/blender/asset_braseiro_rubro.py (ou blender -b -P tools/blender/asset_braseiro_rubro.py).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utils as U  # noqa: E402
from kit import Obj, rad  # noqa: E402

CELULAS = [dict(cor=(0.42, 0.36, 0.34), aspereza=0.88, desgaste=0.6),   # pedra clara gasta
           dict(cor=(0.2, 0.16, 0.16), aspereza=0.9, desgaste=0.5, padrao='blocos', escala=1.3),     # pedra escura
           dict(cor=(0.42, 0.27, 0.14), metal=0.8, aspereza=0.55, desgaste=0.7, borda_metal=True),   # bronze velho
           dict(cor=(1.0, 0.12, 0.25), aspereza=0.2, emissao=(1.0, 0.12, 0.25), desgaste=0, padrao='veios')]   # cristal carmesim


def main():
    U.limpar_cena()
    o = Obj('braseiro_rubro')
    for k in range(3):
        a = rad(k * 120)
        o.cilindro(2, 0.04, 1.0, (0.35 * __import__('math').cos(a), 0.35 * __import__('math').sin(a), 0), lados=6,
                   rot=(rad(14) * __import__('math').sin(a), -rad(14) * __import__('math').cos(a), 0))
    o.cilindro(2, 0.42, 0.32, (0, 0, 0.9), lados=14, r2=0.56)
    o.cilindro(1, 0.4, 0.06, (0, 0, 1.12), lados=14)
    for x, y, h, t in [(0, 0, 0.75, 0), (0.18, 0.08, 0.5, 12), (-0.16, 0.1, 0.55, -10), (0.02, -0.18, 0.45, 8)]:
        o.prisma(3, 0.13, h, (x, y, 1.1), lados=5, ponta=0.6, rot=(rad(t), rad(-t * 0.6), 0))
    o.finalizar(CELULAS, angulo=(55, 0, 30))


if __name__ == '__main__':
    main()
