"""Gera js/assets/kael_sprites.js e js/assets/kael_arte.js a partir da arte do Kael.

Origem: assets/images/kael_sprites_ref.jpg (folha "KAEL VEYRON · SPRITES 2.5D",
1536x1024, fundo claro). Cada quadro é recortado pelos componentes conexos da
imagem, o fundo claro vira transparência (preservando o brilho azul da espada
como cor semitransparente) e as partes luminosas (azul saturado) vão para uma
segunda camada desenhada depois da escuridão do cenário.

Saída: um atlas WebP embutido (data URI) + a tabela de quadros KAEL_SPRITES; e,
de assets/images/kael_ficha.jpg, a ilustração de corpo inteiro e o rosto usados na
seleção de personagem (KAEL_ARTE).
Uso (na pasta do projeto):  python3 tools/gerar_sprites_kael.py
Requer Pillow, numpy e scipy (pip install pillow numpy scipy).
"""
import base64
import io
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEM = os.path.join(RAIZ, 'assets', 'images', 'kael_sprites_ref.jpg')
DESTINO = os.path.join(RAIZ, 'js', 'assets', 'kael_sprites.js')
FICHA = os.path.join(RAIZ, 'assets', 'images', 'kael_ficha.jpg')
DESTINO_ARTE = os.path.join(RAIZ, 'js', 'assets', 'kael_arte.js')

# Quadros de cada animação: caixas (x0, y0, x1, y1) na folha. Cada caixa usa só os
# componentes conexos cujo centro cai dentro dela (os rastros de um quadro não
# invadem o vizinho). 'face': para onde o quadro olha na arte ('r' direita).
ANIMS = {
    'front': [(797, 375, 853, 499)],                  # vistas paradas (FRENTE, DIREITA, TRÁS, ESQUERDA)
    'right': [(877, 375, 931, 499)],
    'back': [(968, 375, 1029, 499)],
    'left': [(1049, 375, 1109, 499)],
    'walk': [(682, 41, 733, 165), (743, 41, 801, 165), (806, 39, 864, 165), (872, 39, 925, 165),
             (934, 39, 989, 165), (995, 38, 1040, 165), (1047, 39, 1107, 166)],
    'run': [(1118, 49, 1181, 160), (1179, 49, 1242, 160), (1241, 49, 1311, 160), (1300, 49, 1373, 160),
            (1374, 46, 1449, 160), (1450, 43, 1520, 160)],
    'jump': [(226, 200, 280, 334), (287, 199, 340, 308), (344, 205, 409, 305), (411, 197, 465, 300), (461, 203, 535, 308)],
    'light': [(560, 205, 625, 312), (630, 210, 716, 328), (706, 210, 832, 328), (778, 203, 893, 306), (892, 214, 988, 318)],
    'heavy': [(996, 213, 1055, 327), (1060, 215, 1158, 330), (1150, 215, 1262, 330), (1234, 209, 1340, 313),
              (1319, 209, 1445, 325), (1414, 217, 1526, 295)],
    'hurt': [(15, 385, 75, 503), (78, 394, 153, 502), (164, 398, 229, 501), (234, 401, 312, 495)],
    'death': [(346, 399, 403, 499), (410, 414, 478, 496), (491, 421, 557, 494), (557, 435, 636, 485),
              (638, 436, 717, 494), (716, 438, 772, 494)],
}
FACE = {'front': 'f', 'back': 'b', 'left': 'l'}   # o resto olha para a direita na arte
# Quadros colados na arte (um rastro liga dois quadros): usam tudo que está dentro da caixa
CLIP = {('heavy', 1), ('heavy', 2)}

im = np.asarray(Image.open(ORIGEM).convert('RGB')).astype(np.float32) / 255
H, W, _ = im.shape
mn = im.min(axis=2); mx = im.max(axis=2); sat = mx - mn
lum = im @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

# Componentes conexos do conteúdo (personagem escuro ou brilho saturado)
content = (mn < 0.72) | (sat > 0.16)
content = ndimage.binary_opening(content, iterations=1)
lab, _ = ndimage.label(ndimage.binary_dilation(content, iterations=3))
centers = ndimage.center_of_mass(np.ones_like(lab), lab, range(1, lab.max() + 1))


def matte(x0, y0, x1, y1, clip=False):
    """Recorta a caixa e devolve RGBA (cor + transparência) e a camada luminosa."""
    sl = (slice(y0, y1), slice(x0, x1))
    labs = set()
    if clip:
        labs = set(np.unique(lab[sl])) - {0}
    for i, (cy, cx) in enumerate(centers):
        if x0 <= cx < x1 and y0 <= cy < y1:
            labs.add(i + 1)
    mask = np.isin(lab[sl], list(labs))
    p = im[sl]
    # Cor do fundo: mediana dos pixels claros e pouco saturados da caixa
    bgsel = (mn[sl] > 0.8) & (sat[sl] < 0.06)
    bg = np.median(p[bgsel], axis=0) if bgsel.sum() > 20 else np.array([0.95, 0.96, 0.97], np.float32)
    # Quanto o pixel escureceu em relação ao fundo (no canal que mais escureceu)
    d = np.max((bg - p) / np.maximum(bg, 1e-3), axis=2)
    a = np.clip(d / 0.5, 0, 1)
    # Sombra no chão e ruído do JPEG (cinza claro, sem cor) somem
    s = sat[sl]
    a = np.where((d < 0.3) & (s < 0.08), 0, a)
    a = a * mask
    # Remove pedaços de quadros vizinhos cortados pela caixa: fica a maior região
    # (corpo + espada) e as regiões menores que não encostam nas bordas da caixa
    reg, nreg = ndimage.label(a > 0.08)
    if nreg > 1:
        sizes = ndimage.sum(np.ones_like(a), reg, range(1, nreg + 1))
        keep = np.zeros(nreg + 1, bool)
        keep[int(np.argmax(sizes)) + 1] = True
        for j, sl2 in enumerate(ndimage.find_objects(reg)):
            touches = sl2[1].start == 0 or sl2[1].stop == a.shape[1] or sl2[0].start == 0 or sl2[0].stop == a.shape[0]
            if not touches and sizes[j] >= 6:
                keep[j + 1] = True
        a = a * keep[reg]
    a = ndimage.gaussian_filter(a, 0.35)
    # Cor sem o fundo misturado (fundo conhecido): f = (p - (1 - a) * bg) / a
    aa = np.maximum(a, 1e-3)[..., None]
    f = np.clip((p - (1 - aa) * bg) / aa, 0, 1)
    rgba = np.concatenate([f, a[..., None]], axis=2)
    # Partes luminosas: azul saturado e claro (lâmina, rastros, marca Ø, brilhos)
    blue = (f[..., 2] - np.maximum(f[..., 0], f[..., 1] * 0.8))
    e = np.clip((blue - 0.18) / 0.35, 0, 1) * np.clip((f[..., 2] - 0.45) / 0.3, 0, 1) * a
    emi = np.concatenate([f, e[..., None]], axis=2)
    # Pés: ponto mais baixo dos pixels escuros (corpo), não dos rastros
    body = (a > 0.6) & (lum[sl] < 0.35)
    ys, xs = np.nonzero(body if body.sum() > 30 else a > 0.5)
    foot_y = int(np.percentile(ys, 99.5)) if len(ys) else y1 - y0
    low = ys > foot_y - 10
    foot_x = float(np.median(xs[low])) if low.sum() else (x1 - x0) / 2
    body_h = foot_y - (int(np.percentile(ys, 0.5)) if len(ys) else 0)
    return rgba, emi, foot_x, foot_y, body_h


frames = []
for name, boxes in ANIMS.items():
    for k, b in enumerate(boxes):
        rgba, emi, fx, fy, bh = matte(*b, clip=(name, k) in CLIP)
        alpha = rgba[..., 3]
        ys, xs = np.nonzero(alpha > 0.02)
        if not len(ys):
            raise SystemExit(f'quadro vazio: {name} {k}')
        cy0, cy1, cx0, cx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        frames.append({'anim': name, 'i': k, 'rgba': rgba[cy0:cy1, cx0:cx1], 'emi': emi[cy0:cy1, cx0:cx1],
                       'ax': fx - cx0, 'ay': fy - cy0, 'bh': bh})

# Empacota em prateleiras: metade de cima = cor, metade de baixo = partes luminosas
PAD = 2
AW = 1024
x = y = rowh = 0
for fr in frames:
    h, w = fr['rgba'].shape[:2]
    if x + w + PAD > AW:
        x = 0; y += rowh + PAD; rowh = 0
    fr['x'], fr['y'], fr['w'], fr['h'] = x, y, w, h
    x += w + PAD; rowh = max(rowh, h)
HH = y + rowh + PAD
atlas = np.zeros((HH * 2, AW, 4), np.float32)
for fr in frames:
    atlas[fr['y']:fr['y'] + fr['h'], fr['x']:fr['x'] + fr['w']] = fr['rgba']
    atlas[HH + fr['y']:HH + fr['y'] + fr['h'], fr['x']:fr['x'] + fr['w']] = fr['emi']
img = Image.fromarray((atlas * 255 + 0.5).astype(np.uint8), 'RGBA')
buf = io.BytesIO()
img.save(buf, 'WEBP', quality=92, method=6)
dados = base64.b64encode(buf.getvalue()).decode('ascii')

# Altura de referência: o corpo na vista de frente
ref_h = next(fr['bh'] for fr in frames if fr['anim'] == 'front')
tabela = {}
for fr in frames:
    tabela.setdefault(fr['anim'], []).append([int(fr['x']), int(fr['y']), int(fr['w']), int(fr['h']), round(float(fr['ax']), 1), round(float(fr['ay']), 1)])
meta = {'emiY': int(HH), 'refH': int(ref_h), 'face': {k: FACE.get(k, 'r') for k in ANIMS}, 'anims': tabela}

CABECALHO = """'use strict';
// ECLIPSE ZERO · Sprites do Kael recortados da arte (gerado por tools/gerar_sprites_kael.py)
// ---------------------------------------------------------------------------
// Atlas WebP embutido (data URI) para funcionar abrindo o index.html direto do
// disco. Metade de cima: cor com transparência; metade de baixo (a partir de
// emiY): só as partes luminosas (lâmina, rastros, marca Ø), somadas à cena
// depois da escuridão. anims: [x, y, largura, altura, pé x, pé y] por quadro.
// Não edite à mão: troque assets/images/kael_sprites_ref.jpg e gere de novo.
// ---------------------------------------------------------------------------
"""
os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
with open(DESTINO, 'w', encoding='utf-8') as f:
    f.write(CABECALHO)
    f.write('const KAEL_SPRITES = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
    f.write("KAEL_SPRITES.src = 'data:image/webp;base64," + dados + "';\n")
img.save(os.path.join(os.path.dirname(DESTINO), '..', '..', 'assets', 'images', 'kael_sprites_atlas.png')) if os.environ.get('SALVAR_PNG') else None
print('Gerado', DESTINO, f'({len(dados) // 1024} KB, {len(frames)} quadros, atlas {AW}x{HH * 2})')


# Ficha: corpo inteiro (sem o título "KAEL VEYRON / UNIDADE ZERO" do canto) e rosto
ficha = Image.open(FICHA).convert('RGB')
corpo = ficha.crop((12, 44, 322, 628))
fundo = corpo.crop((0, 40, 110, 60)).resize((1, 1), Image.LANCZOS).getpixel((0, 0))
corpo.paste(Image.new('RGB', (118, 22), fundo), (0, 0))
rosto = ficha.crop((884, 32, 1152, 368))
partes = {}
for nome, img_ in (('body', corpo), ('face', rosto)):
    b = io.BytesIO()
    img_.save(b, 'JPEG', quality=86, optimize=True, progressive=True)
    partes[nome] = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode('ascii')
with open(DESTINO_ARTE, 'w', encoding='utf-8') as f:
    f.write("""'use strict';
// ECLIPSE ZERO · Ilustração do Kael da ficha oficial (gerado por tools/gerar_sprites_kael.py)
// body: corpo inteiro com a Tempestade Nula · face: rosto (seleção de personagem)
""")
    f.write('const KAEL_ARTE = ' + json.dumps(partes) + ';\n')
print('Gerado', DESTINO_ARTE, f'({sum(len(v) for v in partes.values()) // 1024} KB)')
