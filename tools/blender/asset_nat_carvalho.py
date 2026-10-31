"""Kit de cenário medieval e natural: carvalho (tools/blender/natureza.py, função carvalho).

Rode: python3 tools/blender/asset_nat_carvalho.py (ou blender -b -P tools/blender/asset_nat_carvalho.py).
Sai em assets/models/natureza/carvalho.glb, com a prévia em assets/models/previews/carvalho.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('carvalho')
