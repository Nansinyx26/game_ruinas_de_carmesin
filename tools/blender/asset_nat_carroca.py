"""Kit de cenário medieval e natural: carroca (tools/blender/natureza.py, função carroca).

Rode: python3 tools/blender/asset_nat_carroca.py (ou blender -b -P tools/blender/asset_nat_carroca.py).
Sai em assets/models/natureza/carroca.glb, com a prévia em assets/models/previews/carroca.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('carroca')
