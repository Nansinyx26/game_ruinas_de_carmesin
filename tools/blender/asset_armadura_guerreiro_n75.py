"""Armadura de nível 75 da classe Guerreiro (oito peças), feita no Blender.

Peças (nomes das imagens de referência em assets/Criar_Personagem/Armaduras_Level_75/Classe_Guerreiro_nvl75/):
  peitoral   Peitoral de Placas
  ombros     Ombreiras de Placas
  capa       Capa de Batalha
  capacete   Capuz do Guerreiro
  luvas      Luvas de Placas
  calcas     Calça de Placas
  botas      Botas de Placas
  acessorio  Amuleto de Rubi de Batalha
Cada peça sai em <Nome_da_Peça>_nivel75.glb ao lado da imagem, com a forma do corpo feminino numa
shape key, texturas assadas e a prévia em assets/models/previews/armaduras/. Detalhes em
tools/blender/armaduras.py.
Rode: python3 tools/blender/asset_armadura_guerreiro_n75.py [vaga ...]   (ou blender -b -P ... -- [vaga ...])
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import armaduras  # noqa: E402
import utils as U  # noqa: E402

if __name__ == '__main__':
    armaduras.gerar('guerreiro', 75, so=U.args() or None)
