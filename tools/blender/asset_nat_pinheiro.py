"""Kit de cenário medieval e natural: pinheiro (tools/blender/natureza.py, função pinheiro).

Rode: python3 tools/blender/asset_nat_pinheiro.py (ou blender -b -P tools/blender/asset_nat_pinheiro.py).
Sai em assets/models/natureza/pinheiro.glb, com a prévia em assets/models/previews/pinheiro.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('pinheiro')
