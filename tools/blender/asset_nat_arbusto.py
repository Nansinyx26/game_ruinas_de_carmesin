"""Kit de cenário medieval e natural: arbusto (tools/blender/natureza.py, função arbusto).

Rode: python3 tools/blender/asset_nat_arbusto.py (ou blender -b -P tools/blender/asset_nat_arbusto.py).
Sai em assets/models/natureza/arbusto.glb, com a prévia em assets/models/previews/arbusto.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('arbusto')
