"""Armadura de nível 100 da classe Patrulheiro (oito peças), feita no Blender.

Peças (nomes das imagens de referência em assets/Criar_Personagem/Armaduras_Level_100/Classe_Patrulheiro_nvl100/):
  peitoral   Peitoral de Couro
  ombros     Ombreiras de Couro
  capa       Capa do Explorador
  capacete   Capuz do Patrulheiro
  luvas      Luvas de Couro
  calcas     Calça do Patrulheiro
  botas      Botas de Couro
  acessorio  Amuleto da Natureza
Cada peça sai em <Nome_da_Peça>_nivel100.glb ao lado da imagem, com a forma do corpo feminino numa
shape key, texturas assadas e a prévia em assets/models/previews/armaduras/. Detalhes em
tools/blender/armaduras.py.
Rode: python3 tools/blender/asset_armadura_patrulheiro_n100.py [vaga ...]   (ou blender -b -P ... -- [vaga ...])
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import armaduras  # noqa: E402
import utils as U  # noqa: E402

if __name__ == '__main__':
    armaduras.gerar('patrulheiro', 100, so=U.args() or None)
