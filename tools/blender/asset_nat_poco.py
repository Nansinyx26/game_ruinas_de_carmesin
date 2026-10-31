"""Kit de cenário medieval e natural: poco (tools/blender/natureza.py, função poco).

Rode: python3 tools/blender/asset_nat_poco.py (ou blender -b -P tools/blender/asset_nat_poco.py).
Sai em assets/models/natureza/poco.glb, com a prévia em assets/models/previews/poco.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('poco')
