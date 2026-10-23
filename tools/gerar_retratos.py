"""Gera js/assets/retratos.js: os retratos do elenco usados na seleção de personagem e no HUD.

Origem: assets/images/retratos_elenco.webp (folha com os 5 retratos em molduras neon,
1536x1024: Kael, Lyra e Orion em cima; Sera e Drakos embaixo). Cada retrato é recortado
por dentro da moldura (sem a borda colorida nem os cantos chanfrados), num quadrado
alinhado pelo alto (o rosto fica em cima), reduzido para 288x288 e embutido como WebP
(data URI: o jogo roda por file:// e não carrega imagens soltas no canvas).
Uso (na pasta do projeto):  python3 tools/gerar_retratos.py
Requer Pillow (pip install pillow).
"""
import base64
import io
import os

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEM = os.path.join(RAIZ, 'assets', 'images', 'retratos_elenco.webp')
DESTINO = os.path.join(RAIZ, 'js', 'assets', 'retratos.js')
LADO = 288
# Moldura de cada retrato na folha (x0, y0, x1, y1), medida nas linhas de neon
MOLDURAS = {
    'kael': (15, 16, 503, 509),
    'lyra': (522, 16, 1013, 509),
    'orion': (1032, 16, 1520, 509),
    'sera': (208, 526, 758, 998),
    'drakos': (777, 526, 1326, 998),
}
MARGEM = 17          # por dentro da borda e dos cantos chanfrados
MARGEM_BAIXO = 6     # embaixo, a moldura de baixo já fica fora do quadrado


def recorte(im, caixa):
    x0, y0, x1, y1 = caixa
    x0, y0, x1, y1 = x0 + MARGEM, y0 + MARGEM, x1 - MARGEM, y1 - MARGEM_BAIXO
    lado = min(x1 - x0, y1 - y0)
    cx = (x0 + x1) // 2
    return im.crop((cx - lado // 2, y0, cx - lado // 2 + lado, y0 + lado)).resize((LADO, LADO), Image.LANCZOS)


def main():
    im = Image.open(ORIGEM).convert('RGB')
    linhas = []
    for nome, caixa in MOLDURAS.items():
        buf = io.BytesIO()
        recorte(im, caixa).save(buf, 'WEBP', quality=86, method=6)
        linhas.append(f'  {nome}: "data:image/webp;base64,{base64.b64encode(buf.getvalue()).decode()}",')
    with open(DESTINO, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n")
        f.write('// ECLIPSE ZERO · Retratos do elenco (gerado por tools/gerar_retratos.py a partir de\n')
        f.write('// assets/images/retratos_elenco.webp): cartões da seleção de personagem e HUD\n')
        f.write('const RETRATOS = {\n' + '\n'.join(linhas) + '\n};\n')
    print('gerado', DESTINO, os.path.getsize(DESTINO), 'bytes')


if __name__ == '__main__':
    main()
