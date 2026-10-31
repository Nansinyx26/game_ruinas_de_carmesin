"""Kit de cenário medieval e natural: cerca (tools/blender/natureza.py, função cerca).

Rode: python3 tools/blender/asset_nat_cerca.py (ou blender -b -P tools/blender/asset_nat_cerca.py).
Sai em assets/models/natureza/cerca.glb, com a prévia em assets/models/previews/cerca.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('cerca')
