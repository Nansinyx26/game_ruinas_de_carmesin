"""Utensílios da taverna e do pub (objetos de mão e de mesa).

caneca_cerveja   caneca de madeira em aduelas, dois aros de ferro, alça e a espuma por cima
prato_sopa       tigela de cerâmica com sopa, pedaços de legumes e a colher de madeira
prato_vazio      a mesma tigela depois da refeição (restos no fundo e a colher dentro)
copo_neon        copo alto de vidro escuro com a bebida luminosa do pub cyberpunk
Cada um: um objeto, um material (texturas assadas de materiais procedurais), origem na base, metros.
Saída: assets/models/utensilios/<id>.glb (+ prévia). Depois: python3 tools/importar_arma.py caneca_cerveja …
Rode: python3 tools/blender/asset_utensilios_taverna.py [ids]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utils as U  # noqa: E402
from kit import Obj, rad  # noqa: E402

MADEIRA = dict(cor=(0.36, 0.22, 0.12), aspereza=0.78, desgaste=0.55, padrao='blocos', escala=3.0)
FERRO = dict(cor=(0.16, 0.15, 0.15), metal=0.85, aspereza=0.5, desgaste=0.6, borda_metal=True)
ESPUMA = dict(cor=(0.95, 0.9, 0.78), aspereza=0.95, desgaste=0.1)
CERAMICA = dict(cor=(0.62, 0.42, 0.28), aspereza=0.6, desgaste=0.45)
SOPA = dict(cor=(0.78, 0.45, 0.16), aspereza=0.35, desgaste=0.2, padrao='veios', cor2=(0.5, 0.62, 0.22))
COLHER = dict(cor=(0.62, 0.46, 0.28), aspereza=0.65, desgaste=0.4)
VIDRO = dict(cor=(0.06, 0.08, 0.12), metal=0.2, aspereza=0.12, desgaste=0.1)
NEON = dict(cor=(0.2, 1.0, 0.85), aspereza=0.1, emissao=(0.2, 1.0, 0.85), desgaste=0)


def caneca():
    o = Obj('caneca_cerveja')
    lados = 12
    for k in range(lados):   # aduelas: tábuas levemente separadas em volta
        a = (k + 0.5) / lados * 2 * math.pi
        o.caixa(0, 0.022, 0.012, 0.13, (math.cos(a) * 0.046, math.sin(a) * 0.046, 0), rot=(0, 0, a), chanfro=0.002)
    o.cilindro(0, 0.046, 0.012, (0, 0, 0), lados=16)   # fundo
    for z in (0.02, 0.105):
        o.anel(1, 0.0505, 0.0045, (0, 0, z), lados=24, seg=6)
    o.anel(0, 0.032, 0.008, (0.068, 0, 0.068), lados=16, seg=6, rot=(rad(90), 0, 0))   # alça
    o.cilindro(2, 0.044, 0.012, (0, 0, 0.122), lados=16)
    o.esfera(2, 0.043, (0, 0, 0.134), seg=14, aneis=6, esc=(1, 1, 0.32))   # a espuma transbordando
    for x, y in ((0.03, 0.022), (-0.02, -0.03)):
        o.esfera(2, 0.012, (x, y, 0.142), seg=8, aneis=4)
    return o.finalizar([MADEIRA, FERRO, ESPUMA], angulo=(62, 0, 30), lado=512, pasta='utensilios')


def tigela(cheia):
    o = Obj('prato_sopa' if cheia else 'prato_vazio')
    o.cilindro(0, 0.05, 0.016, (0, 0, 0), lados=20, r2=0.085)   # pé e bojo
    o.cilindro(0, 0.085, 0.034, (0, 0, 0.016), lados=20, r2=0.1)
    o.anel(0, 0.1, 0.006, (0, 0, 0.05), lados=28, seg=6)   # borda
    if cheia:
        o.cilindro(1, 0.094, 0.006, (0, 0, 0.04), lados=24)   # a sopa
        for x, y, r in ((0.03, 0.02, 0.012), (-0.035, 0.01, 0.01), (0.0, -0.04, 0.011), (0.045, -0.025, 0.009)):
            o.esfera(1, r, (x, y, 0.047), seg=8, aneis=4, esc=(1, 1, 0.5))   # legumes
    else:
        o.cilindro(1, 0.06, 0.002, (0, 0, 0.022), lados=16)   # restos no fundo
    # colher apoiada na borda
    o.caixa(2, 0.11, 0.008, 0.004, (0.035, 0.02, 0.05 if cheia else 0.045), rot=(0, rad(-18), rad(25)))
    o.esfera(2, 0.016, (-0.012, -0.002, 0.04 if cheia else 0.03), seg=10, aneis=5, esc=(1.3, 0.9, 0.35))
    return o.finalizar([CERAMICA, SOPA, COLHER], angulo=(58, 0, 30), lado=512, pasta='utensilios')


def copo_neon():
    o = Obj('copo_neon')
    o.cilindro(0, 0.034, 0.008, (0, 0, 0), lados=16)
    o.cilindro(0, 0.006, 0.06, (0, 0, 0.008), lados=8)
    o.cilindro(0, 0.026, 0.11, (0, 0, 0.068), lados=16, r2=0.038)
    o.cilindro(1, 0.024, 0.085, (0, 0, 0.072), lados=16, r2=0.034)   # a bebida acesa
    o.anel(1, 0.037, 0.0025, (0, 0, 0.172), lados=20, seg=4)
    o.caixa(0, 0.004, 0.004, 0.11, (0.012, 0.008, 0.11), rot=(rad(12), rad(8), 0))   # canudo
    return o.finalizar([VIDRO, NEON], angulo=(60, 0, 30), lado=512, pasta='utensilios')


FEITOS = {'caneca_cerveja': caneca, 'prato_sopa': lambda: tigela(True), 'prato_vazio': lambda: tigela(False), 'copo_neon': copo_neon}

if __name__ == '__main__':
    pedidos = U.args() or list(FEITOS)
    for p in pedidos:
        U.limpar_cena()
        FEITOS[p]()
