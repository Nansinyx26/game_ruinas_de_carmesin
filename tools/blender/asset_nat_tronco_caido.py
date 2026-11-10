"""Kit de cenário medieval e natural: tronco_caido (tools/blender/natureza.py, função tronco_caido).

Rode: python3 tools/blender/asset_nat_tronco_caido.py (ou blender -b -P tools/blender/asset_nat_tronco_caido.py).
Sai em assets/models/natureza/tronco_caido.glb, com a prévia em assets/models/previews/tronco_caido.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('tronco_caido')
