"""Gera texturas e sistemas de Fumaça e Vapor para detalhes estéticos.

Cria puffs volumétricos de fumaça procedurais, vapor energético e névoa
térmica para Kael, Orion, armaduras e ambiente.
Gera os sprites em assets/images/fx/fumaca/ e o módulo js/assets/fumaca_fx.js embutido.

Uso: python tools/gerar_fumaca.py
Requer Pillow (pip install pillow).
"""
import base64
import io
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FX_DIR = os.path.join(RAIZ, 'assets', 'images', 'fx', 'fumaca')
JS_DEST = os.path.join(RAIZ, 'js', 'assets', 'fumaca_fx.js')

TIPOS_FUMACA = {
    'vapor_neutro': ((215, 230, 255), (140, 160, 190), 0.75),       # Vapor suave de tubulações
    'fumaca_combate': ((100, 110, 125), (45, 50, 60), 0.85),        # Fumaça densa de explosão/cinzas
    'plasma_azul': ((70, 160, 255), (20, 60, 140), 0.80),           # Exaustão energética do Kael
    'plasma_laranja': ((255, 145, 40), (140, 50, 15), 0.80),        # Exaustão de stealth do Orion
    'plasma_ciano': ((30, 230, 210), (10, 90, 85), 0.80),           # Brilho de sobreaquecimento de armadura
}

def gerar_puff_fumaca(tipo, cor_clara, cor_escura, opacidade_max, tamanho=128):
    """Gera um puff de fumaça volumétrico orgânico usando múltiplos círculos difusos."""
    im = Image.new('RGBA', (tamanho, tamanho), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    cx, cy = tamanho / 2, tamanho / 2

    random.seed(1337 + hash(tipo) % 1000)

    # Sub-bolhas aglomeradas para formato orgânico e volumétrico
    sub_bolhas = 14
    for _ in range(sub_bolhas):
        dist = random.uniform(0, tamanho * 0.22)
        ang = random.uniform(0, math.pi * 2)
        bx = cx + math.cos(ang) * dist
        by = cy + math.sin(ang) * dist
        br = random.uniform(tamanho * 0.18, tamanho * 0.32)

        # Gradiente radial suave para cada bolha
        passos = 10
        for p in range(passos, 0, -1):
            t = p / passos
            r_atual = br * t
            alfa = int((1.0 - t ** 1.5) * opacidade_max * 70)

            # Mistura cor clara (núcleo) para escura (borda)
            factor = min(1.0, (dist / (tamanho * 0.25)) * 0.7 + (1.0 - t) * 0.5)
            r = int(cor_clara[0] * (1 - factor) + cor_escura[0] * factor)
            g = int(cor_clara[1] * (1 - factor) + cor_escura[1] * factor)
            b = int(cor_clara[2] * (1 - factor) + cor_escura[2] * factor)

            draw.ellipse([bx - r_atual, by - r_atual, bx + r_atual, by + r_atual], fill=(r, g, b, alfa))

    # Suavização extrema para simular difusão gasosa
    im = im.filter(ImageFilter.GaussianBlur(radius=5.0))
    return im

def main():
    os.makedirs(FX_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(JS_DEST), exist_ok=True)

    assets_b64 = {}
    print('== Gerando Texturas de Fumaça Estéticas ==')

    for key, (cor_clara, cor_escura, opacidade) in TIPOS_FUMACA.items():
        im_smoke = gerar_puff_fumaca(key, cor_clara, cor_escura, opacidade)
        png_path = os.path.join(FX_DIR, f'{key}.png')
        im_smoke.save(png_path, 'PNG')

        buf = io.BytesIO()
        im_smoke.save(buf, 'PNG', optimize=True)
        assets_b64[key] = base64.b64encode(buf.getvalue()).decode('ascii')
        print(f' [+] Fumaça criada: {png_path}')

    # Cria módulo JavaScript com dados embutidos para execução imediata
    js_code = [
        "'use strict';",
        "// ECLIPSE ZERO · Módulo Estético de Fumaça e Vapor (gerado por tools/gerar_fumaca.py)",
        "// Fornece emissores de partículas de fumaça e exaustão para 2D e 3D.",
        "const FUMACA_ASSETS = {",
    ]
    for k, v in assets_b64.items():
        js_code.append(f"  '{k}': 'data:image/png;base64,{v}',")
    js_code.extend([
        "};",
        "",
        "const FumacaFX = {",
        "  _imgs: {},",
        "  particles: [],",
        "  get(key) {",
        "    if (this._imgs[key]) return this._imgs[key];",
        "    const src = FUMACA_ASSETS[key];",
        "    if (!src) return null;",
        "    const img = new Image();",
        "    img.src = src;",
        "    this._imgs[key] = img;",
        "    return img;",
        "  },",
        "  // Emite um puff de fumaça no mundo",
        "  spawn(x, y, options = {}) {",
        "    const type = options.type || 'vapor_neutro';",
        "    this.particles.push({",
        "      x, y,",
        "      vx: options.vx !== undefined ? options.vx : (Math.random() - 0.5) * 16,",
        "      vy: options.vy !== undefined ? options.vy : -20 - Math.random() * 25,",
        "      radius: options.radius || (12 + Math.random() * 10),",
        "      growth: options.growth !== undefined ? options.growth : 16,",
        "      rot: Math.random() * Math.PI * 2,",
        "      vrot: (Math.random() - 0.5) * 1.5,",
        "      life: 0,",
        "      maxLife: options.maxLife || (0.8 + Math.random() * 0.6),",
        "      alpha: options.alpha || 0.7,",
        "      type,",
        "      additive: !!options.additive,",
        "    });",
        "  },",
        "  update(dt) {",
        "    for (let i = this.particles.length - 1; i >= 0; i--) {",
        "      const p = this.particles[i];",
        "      p.life += dt;",
        "      if (p.life >= p.maxLife) {",
        "        this.particles.splice(i, 1);",
        "        continue;",
        "      }",
        "      p.x += p.vx * dt;",
        "      p.y += p.vy * dt;",
        "      p.rot += p.vrot * dt;",
        "      p.radius += p.growth * dt;",
        "    }",
        "  },",
        "  draw(ctx) {",
        "    if (!this.particles.length) return;",
        "    ctx.save();",
        "    for (const p of this.particles) {",
        "      const img = this.get(p.type);",
        "      if (!img || !img.complete || !img.naturalWidth) continue;",
        "      const progress = p.life / p.maxLife;",
        "      const a = (1.0 - progress) * p.alpha * Math.sin(progress * Math.PI * 0.85 + 0.15);",
        "      ctx.globalAlpha = Math.max(0, Math.min(1, a));",
        "      ctx.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';",
        "      ctx.save();",
        "      ctx.translate(p.x, p.y);",
        "      ctx.rotate(p.rot);",
        "      ctx.drawImage(img, -p.radius, -p.radius, p.radius * 2, p.radius * 2);",
        "      ctx.restore();",
        "    }",
        "    ctx.restore();",
        "  }",
        "};",
        "if (typeof window !== 'undefined') window.FumacaFX = FumacaFX;",
        ""
    ])

    with open(JS_DEST, 'w', encoding='utf-8') as f:
        f.write('\n'.join(js_code))

    print(f'Módulo JS de Fumaça gerado com sucesso em: {JS_DEST}')

if __name__ == '__main__':
    main()
