"""Torre Neon (objeto de cenário).

Torre Neon: bloco de torre de vidro com recuos, arestas acesas, letreiro e antena.
Cidade: Metrópole Tecnológica. Um objeto, um material (texturas assadas: vidro escuro com janelas acesas, chapas de metal grafite, neon magenta, neon ciano), origem na base, metros.
Rode: python3 tools/blender/asset_torre_neon.py (ou blender -b -P tools/blender/asset_torre_neon.py).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utils as U  # noqa: E402
from kit import Obj, rad  # noqa: E402

CELULAS = [dict(cor=(0.07, 0.11, 0.19), metal=0.7, aspereza=0.15, desgaste=0.15, padrao='janelas', escala=0.6, cor2=(0.62, 0.86, 1.0)),   # vidro escuro com janelas acesas
           dict(cor=(0.15, 0.16, 0.19), metal=0.9, aspereza=0.4, desgaste=0.3, padrao='paineis', borda_metal=True),    # metal grafite
           dict(cor=(1.0, 0.25, 0.85), aspereza=0.3, emissao=(1.0, 0.25, 0.85), desgaste=0),   # neon magenta
           dict(cor=(0.25, 0.9, 1.0), aspereza=0.3, emissao=(0.25, 0.9, 1.0), desgaste=0)]     # neon ciano


def main():
    U.limpar_cena()
    o = Obj('torre_neon', 'modular')
    o.caixa(1, 3.0, 3.0, 0.4)
    blocos = [(2.6, 0.4, 3.0), (2.2, 3.4, 2.4), (1.6, 5.8, 1.4)]
    for lado, z, h in blocos:
        o.caixa(0, lado, lado, h, (0, 0, z))
        for sx in (-1, 1):
            for sy in (-1, 1):
                o.caixa(3, 0.07, 0.07, h, (sx * lado / 2, sy * lado / 2, z))
        o.caixa(1, lado + 0.08, lado + 0.08, 0.12, (0, 0, z + h - 0.06))
        for k in range(1, 3):
            o.caixa(3, lado + 0.02, 0.05, 0.05, (0, -lado / 2, z + h * k / 3))
    o.caixa(2, 1.3, 0.08, 0.55, (0, -1.32, 2.4))
    o.cilindro(1, 0.05, 1.3, (0.3, 0.3, 7.2), lados=8)
    o.esfera(2, 0.1, (0.3, 0.3, 8.55), seg=8, aneis=4)
    o.finalizar(CELULAS, angulo=(65, 0, 35))


if __name__ == '__main__':
    main()
