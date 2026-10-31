"""Kit de cenário medieval e natural: betula (tools/blender/natureza.py, função betula).

Rode: python3 tools/blender/asset_nat_betula.py (ou blender -b -P tools/blender/asset_nat_betula.py).
Sai em assets/models/natureza/betula.glb, com a prévia em assets/models/previews/betula.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('betula')
