"""Kit de cenário medieval e natural: placa_estrada (tools/blender/natureza.py, função placa_estrada).

Rode: python3 tools/blender/asset_nat_placa_estrada.py (ou blender -b -P tools/blender/asset_nat_placa_estrada.py).
Sai em assets/models/natureza/placa_estrada.glb, com a prévia em assets/models/previews/placa_estrada.png.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import natureza  # noqa: E402

if __name__ == '__main__':
    natureza.gerar('placa_estrada')
