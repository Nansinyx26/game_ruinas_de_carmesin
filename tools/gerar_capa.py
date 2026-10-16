"""Gera js/assets/capa.js a partir de assets/images/capa.jpg.

A arte da capa fica embutida no JavaScript (data URI) para o jogo funcionar
abrindo o index.html direto do disco (file://) sem "sujar" o canvas: assim as
miniaturas dos salvamentos (canvas.toDataURL) continuam funcionando.

Uso (na pasta do projeto):  python3 tools/gerar_capa.py
Requer Pillow (pip install pillow).
"""
import base64
import io
import os

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEM = os.path.join(RAIZ, 'assets', 'images', 'capa.jpg')
DESTINO = os.path.join(RAIZ, 'js', 'assets', 'capa.js')

CABECALHO = """'use strict';
// ECLIPSE ZERO · Arte da capa embutida (gerado a partir de assets/images/capa.jpg, 1024x1024, JPEG)
// ---------------------------------------------------------------------------
// A imagem fica dentro do JavaScript (data URI) para o jogo funcionar abrindo
// o index.html direto do disco (file://) sem "sujar" o canvas: assim as
// miniaturas dos salvamentos (canvas.toDataURL) continuam funcionando.
// Para trocar a capa, substitua assets/images/capa.jpg e rode
// python3 tools/gerar_capa.py (veja o README, seção "Onde mexer").
// ---------------------------------------------------------------------------
"""

im = Image.open(ORIGEM).convert('RGB').resize((1024, 1024), Image.LANCZOS)
buf = io.BytesIO()
im.save(buf, 'JPEG', quality=80, optimize=True, progressive=True)
dados = base64.b64encode(buf.getvalue()).decode('ascii')
os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
with open(DESTINO, 'w', encoding='utf-8') as f:
    f.write(CABECALHO + "const CAPA_SRC = 'data:image/jpeg;base64," + dados + "';\n")
print('Gerado', DESTINO, f'({len(dados) // 1024} KB)')
