"""Armadura de nível 100 da classe Assassino (oito peças), feita no Blender.

Peças (nomes das imagens de referência em assets/Criar_Personagem/Armaduras_Level_100/Classe_Assassino_nvl100/):
  peitoral   Peitoral de Couro
  ombros     Ombreiras Leves
  capa       Capa Sombria
  capacete   Capuz do Assassino
  luvas      Luvas de Couro
  calcas     Calça do Assassino
  botas      Botas de Couro
  acessorio  Amuleto da Sombra
Cada peça sai em <Nome_da_Peça>_nivel100.glb ao lado da imagem, com a forma do corpo feminino numa
shape key, texturas assadas e a prévia em assets/models/previews/armaduras/. Detalhes em
tools/blender/armaduras.py.
Rode: python3 tools/blender/asset_armadura_assassino_n100.py [vaga ...]   (ou blender -b -P ... -- [vaga ...])
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import armaduras  # noqa: E402
import utils as U  # noqa: E402

if __name__ == '__main__':
    armaduras.gerar('assassino', 100, so=U.args() or None)
