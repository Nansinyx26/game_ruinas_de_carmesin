"""Kit de cenário medieval e natural: pedra_musgo (tools/blender/natureza.py, função pedra_musgo).

Rode: python3 tools/blender/asset_nat_pedra_musgo.py (ou blender -b -P tools/blender/asset_nat_pedra_musgo.py).
Sai em assets/models/natureza/pedra_musgo.glb, com a prévia em assets/models/previews/pedra_musgo.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('pedra_musgo')
