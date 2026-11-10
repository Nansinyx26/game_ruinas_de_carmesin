"""Gera texturas e predefinições de Aura Energética para detalhes estéticos.

Cria camadas procedurais de auras luminosas (anéis de pulso, coroa de plasma,
brilho radial e faíscas) para Kael, Orion e armaduras especiais.
Gera os sprites em assets/images/fx/aura/ e o módulo js/assets/aura_fx.js embutido.

Uso: python tools/gerar_aura.py
Requer Pillow (pip install pillow).
"""
import base64
import io
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FX_DIR = os.path.join(RAIZ, 'assets', 'images', 'fx', 'aura')
JS_DEST = os.path.join(RAIZ, 'js', 'assets', 'aura_fx.js')

PALETAS = {
    'kael': ((47, 140, 255), (100, 200, 255), (200, 240, 255)),     # Azul ciano elétrico
    'orion': ((255, 138, 31), (255, 190, 60), (255, 235, 170)),     # Âmbar fogo furtivo
    'drakos': ((255, 46, 61), (255, 120, 90), (255, 220, 200)),     # Carmesim impacto
    'sera': ((25, 230, 210), (120, 255, 240), (210, 255, 250)),     # Turquesa biocelular
    'lyra': ((166, 77, 255), (210, 140, 255), (245, 220, 255)),     # Púrpura vácuo
    'dourado': ((255, 215, 0), (255, 238, 120), (255, 255, 220)),   # Dourado lendário
}

def gerar_textura_aura(nome, cor_base, cor_brilho, cor_centro, tamanho=256):
    """Gera uma textura radial de aura cósmica/energética suave."""
    im = Image.new('RGBA', (tamanho, tamanho), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    cx, cy = tamanho / 2, tamanho / 2
    max_r = tamanho * 0.46

    # Camadas concêntricas com variação senoidal para anéis de ressonância
    for i in range(int(max_r), 0, -2):
        t = i / max_r
        # Curva de opacidade com pico intermediário (halo) e centro brilhante
        alfa_halo = math.sin(t * math.pi) ** 1.8 * 0.55
        alfa_core = math.exp(-3.5 * (t ** 2)) * 0.95
        alfa = min(1.0, alfa_halo + alfa_core)

        # Interpolação cromática
        if t > 0.5:
            f = (t - 0.5) * 2.0
            r = int(cor_base[0] * (1 - f) + cor_brilho[0] * f)
            g = int(cor_base[1] * (1 - f) + cor_brilho[1] * f)
            b = int(cor_base[2] * (1 - f) + cor_brilho[2] * f)
        else:
            f = t * 2.0
            r = int(cor_centro[0] * (1 - f) + cor_base[0] * f)
            g = int(cor_centro[1] * (1 - f) + cor_base[1] * f)
            b = int(cor_centro[2] * (1 - f) + cor_base[2] * f)

        a_byte = int(alfa * 255 * (1.0 - t * 0.35))
        draw.ellipse([cx - i, cy - i, cx + i, cy + i], fill=(r, g, b, a_byte))

    # Raios e filamentos de energia
    random.seed(42 + hash(nome) % 1000)
    for _ in range(36):
        ang = random.uniform(0, math.pi * 2)
        comprimento = random.uniform(max_r * 0.5, max_r * 0.95)
        largura = random.uniform(1.5, 3.5)
        px = cx + math.cos(ang) * comprimento
        py = cy + math.sin(ang) * comprimento
        draw.line([(cx, cy), (px, py)], fill=(cor_brilho[0], cor_brilho[1], cor_brilho[2], 65), width=int(largura))

    # Filtro suave para efeito bloom
    im = im.filter(ImageFilter.GaussianBlur(radius=3.5))
    return im

def gerar_anel_pulso(tamanho=256, cor=(100, 200, 255)):
    """Gera um anel de onda de choque / pulso circular."""
    im = Image.new('RGBA', (tamanho, tamanho), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    cx, cy = tamanho / 2, tamanho / 2
    r_anel = tamanho * 0.40
    espessura = 14

    for i in range(espessura):
        d = abs(i - espessura / 2) / (espessura / 2)
        alfa = int((1.0 - d ** 2) * 220)
        r = r_anel - espessura / 2 + i
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(cor[0], cor[1], cor[2], alfa), width=2)

    return im.filter(ImageFilter.GaussianBlur(radius=2.5))

def main():
    os.makedirs(FX_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(JS_DEST), exist_ok=True)

    assets_b64 = {}
    print('== Gerando Texturas de Aura Estéticas ==')

    for key, (c_base, c_brilho, c_centro) in PALETAS.items():
        im_aura = gerar_textura_aura(key, c_base, c_brilho, c_centro)
        png_path = os.path.join(FX_DIR, f'aura_{key}.png')
        im_aura.save(png_path, 'PNG')

        buf = io.BytesIO()
        im_aura.save(buf, 'PNG', optimize=True)
        assets_b64[f'aura_{key}'] = base64.b64encode(buf.getvalue()).decode('ascii')
        print(f' [+] Aura criada: {png_path}')

    im_anel = gerar_anel_pulso()
    anel_path = os.path.join(FX_DIR, 'anel_pulso.png')
    im_anel.save(anel_path, 'PNG')
    buf_anel = io.BytesIO()
    im_anel.save(buf_anel, 'PNG', optimize=True)
    assets_b64['anel_pulso'] = base64.b64encode(buf_anel.getvalue()).decode('ascii')
    print(f' [+] Anel de pulso criado: {anel_path}')

    # Cria módulo JavaScript com dados embutidos para execução offline imediata
    js_code = [
        "'use strict';",
        "// ECLIPSE ZERO · Módulo Estético de Auras Energéticas (gerado por tools/gerar_aura.py)",
        "// Fornece auras prontas para Kael, Orion e armaduras especiais (2D e 3D).",
        "const AURA_ASSETS = {",
    ]
    for k, v in assets_b64.items():
        js_code.append(f"  '{k}': 'data:image/png;base64,{v}',")
    js_code.extend([
        "};",
        "",
        "const AuraFX = {",
        "  _imgs: {},",
        "  get(key) {",
        "    if (this._imgs[key]) return this._imgs[key];",
        "    const src = AURA_ASSETS[key];",
        "    if (!src) return null;",
        "    const img = new Image();",
        "    img.src = src;",
        "    this._imgs[key] = img;",
        "    return img;",
        "  },",
        "  // Desenha uma aura giratória e pulsante no chão ou ao redor do personagem",
        "  draw(ctx, key, x, y, radius, time, alpha = 0.85) {",
        "    const img = this.get(key.startsWith('aura_') ? key : ('aura_' + key));",
        "    if (!img || !img.complete || !img.naturalWidth) return;",
        "    const pulse = 1.0 + 0.08 * Math.sin(time * 3.6);",
        "    const r = radius * pulse;",
        "    ctx.save();",
        "    ctx.globalAlpha = Math.min(1.0, alpha * (0.85 + 0.15 * Math.sin(time * 4.2)));",
        "    ctx.globalCompositeOperation = 'lighter';",
        "    ctx.translate(x, y);",
        "    ctx.rotate(time * 0.8);",
        "    ctx.drawImage(img, -r, -r, r * 2, r * 2);",
        "    ctx.rotate(-time * 1.6);",
        "    ctx.globalAlpha *= 0.5;",
        "    ctx.drawImage(img, -r * 0.75, -r * 0.75, r * 1.5, r * 1.5);",
        "    ctx.restore();",
        "  }",
        "};",
        "if (typeof window !== 'undefined') window.AuraFX = AuraFX;",
        ""
    ])

    with open(JS_DEST, 'w', encoding='utf-8') as f:
        f.write('\n'.join(js_code))

    print(f'Módulo JS de Auras gerado com sucesso em: {JS_DEST}')

if __name__ == '__main__':
    main()
