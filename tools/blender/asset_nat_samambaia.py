"""Kit de cenário medieval e natural: samambaia (tools/blender/natureza.py, função samambaia).

Rode: python3 tools/blender/asset_nat_samambaia.py (ou blender -b -P tools/blender/asset_nat_samambaia.py).
Sai em assets/models/natureza/samambaia.glb, com a prévia em assets/models/previews/samambaia.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('samambaia')
