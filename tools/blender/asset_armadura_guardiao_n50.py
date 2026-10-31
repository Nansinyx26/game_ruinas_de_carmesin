"""Armadura de nível 50 da classe Guardião Arcano (oito peças), feita no Blender.

Peças (nomes das imagens de referência em assets/Criar_Personagem/Armaduras_Level_50/Guardião_Arcano_nvl50/):
  peitoral   Peitoral de Cristal
  ombros     Ombreiras de Energia
  capa       Capa do Guardião
  capacete   Capuz Arcano
  luvas      Luvas de Energia
  calcas     Calça do Guardião
  botas      Botas de Energia
  acessorio  Amuleto do Equilíbrio
Cada peça sai em <Nome_da_Peça>_nivel50.glb ao lado da imagem, com a forma do corpo feminino numa
shape key, texturas assadas e a prévia em assets/models/previews/armaduras/. Detalhes em
tools/blender/armaduras.py.
Rode: python3 tools/blender/asset_armadura_guardiao_n50.py [vaga ...]   (ou blender -b -P ... -- [vaga ...])
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import armaduras  # noqa: E402
import utils as U  # noqa: E402

if __name__ == '__main__':
    armaduras.gerar('guardiao', 50, so=U.args() or None)
