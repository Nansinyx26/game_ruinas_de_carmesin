"""Kit de cenário medieval e natural: rochedo (tools/blender/natureza.py, função rochedo).

Rode: python3 tools/blender/asset_nat_rochedo.py (ou blender -b -P tools/blender/asset_nat_rochedo.py).
Sai em assets/models/natureza/rochedo.glb, com a prévia em assets/models/previews/rochedo.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('rochedo')
