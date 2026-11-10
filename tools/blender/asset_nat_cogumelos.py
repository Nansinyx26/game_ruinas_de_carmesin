"""Kit de cenário medieval e natural: cogumelos (tools/blender/natureza.py, função cogumelos).

Rode: python3 tools/blender/asset_nat_cogumelos.py (ou blender -b -P tools/blender/asset_nat_cogumelos.py).
Sai em assets/models/natureza/cogumelos.glb, com a prévia em assets/models/previews/cogumelos.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('cogumelos')
