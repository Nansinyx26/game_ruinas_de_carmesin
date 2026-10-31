"""Kit de cenário medieval e natural: arvore_seca (tools/blender/natureza.py, função arvore_seca).

Rode: python3 tools/blender/asset_nat_arvore_seca.py (ou blender -b -P tools/blender/asset_nat_arvore_seca.py).
Sai em assets/models/natureza/arvore_seca.glb, com a prévia em assets/models/previews/arvore_seca.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('arvore_seca')
