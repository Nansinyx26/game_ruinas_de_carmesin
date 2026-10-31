"""Kit de cenário medieval e natural: toco (tools/blender/natureza.py, função toco).

Rode: python3 tools/blender/asset_nat_toco.py (ou blender -b -P tools/blender/asset_nat_toco.py).
Sai em assets/models/natureza/toco.glb, com a prévia em assets/models/previews/toco.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('toco')
