"""Kit de cenário medieval e natural: fardo_feno (tools/blender/natureza.py, função fardo_feno).

Rode: python3 tools/blender/asset_nat_fardo_feno.py (ou blender -b -P tools/blender/asset_nat_fardo_feno.py).
Sai em assets/models/natureza/fardo_feno.glb, com a prévia em assets/models/previews/fardo_feno.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('fardo_feno')
