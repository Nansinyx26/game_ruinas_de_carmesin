"""Estátua do Rei (objeto de cenário).

Estátua do Rei: o engenheiro coroado, sem cabeça, segurando a espada; a coroa caída no pedestal.
Cidade: Cidade das Ruínas Carmesins. Um objeto, um material (texturas assadas de 4 materiais procedurais: pedra clara, pedra escura, bronze velho, cristal carmesim), origem na base, metros.
Rode: python3 tools/blender/asset_estatua_rei.py (ou blender -b -P tools/blender/asset_estatua_rei.py).
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
    o = Obj('estatua_rei')
    o.caixa(1, 1.6, 1.6, 1.1, chanfro=0.06)
    o.caixa(1, 1.8, 1.8, 0.2, chanfro=0.04)
    o.caixa(2, 0.8, 0.05, 0.3, (0, -0.81, 0.45))
    o.cilindro(0, 0.55, 1.8, (0, 0, 1.1), lados=12, r2=0.32)
    o.caixa(0, 0.72, 0.42, 0.62, (0, 0, 2.9), chanfro=0.04)
    o.esfera(0, 0.2, (-0.42, 0, 3.42), seg=8, aneis=5)
    o.esfera(0, 0.2, (0.42, 0, 3.42), seg=8, aneis=5)
    o.cilindro(0, 0.09, 0.85, (-0.45, -0.12, 2.6), lados=8, rot=(rad(-25), 0, 0))
    o.cilindro(0, 0.09, 0.85, (0.45, -0.12, 2.6), lados=8, rot=(rad(-25), 0, 0))
    o.cilindro(0, 0.12, 0.14, (0, 0, 3.52), lados=8)
    o.caixa(2, 0.09, 0.05, 1.5, (0, -0.48, 1.25))
    o.caixa(2, 0.42, 0.08, 0.08, (0, -0.48, 2.55))
    o.esfera(3, 0.1, (0, -0.22, 3.15), seg=8, aneis=4)
    o.anel(2, 0.18, 0.045, (0.5, -0.55, 1.34), lados=12, seg=4, rot=(rad(70), 0, rad(20)))
    o.finalizar(CELULAS, angulo=(60, 0, 20))


if __name__ == '__main__':
    main()
