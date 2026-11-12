#!/usr/bin/env python3
"""ECLIPSE ZERO · Ícones das bênçãos do Guardião do Mundo (HUD de buffs)

Gera um PNG de 512×512 por bênção em assets/icons/buffs/ (um desenho próprio para cada uma:
medalhão escuro com aro na cor da bênção e o símbolo dela no centro). Arte 2D feita fora do jogo;
o jogo só carrega os PNG (js/mundo/guardiao.js).

Uso: python3 tools/icones_buffs.py
"""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = 1024   # desenha no dobro e reduz (bordas lisas)
SAIDA = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons', 'buffs')
CORES = {'xp': (170, 130, 255), 'ataque': (255, 90, 70), 'defesa': (90, 160, 255), 'velocidade': (110, 235, 200), 'regen': (110, 230, 120),
         'mana': (80, 200, 255), 'sorte': (255, 205, 70), 'recuperacao': (255, 150, 60), 'evento': (255, 120, 220)}


def pol(cx, cy, pts, ang=0, k=1):
    c, s = math.cos(ang), math.sin(ang)
    return [(cx + (x * c - y * s) * k, cy + (x * s + y * c) * k) for x, y in pts]


def estrela(cx, cy, r, r2, n=5, ang=-math.pi / 2):
    return [(cx + (r if i % 2 == 0 else r2) * math.cos(ang + i * math.pi / n), cy + (r if i % 2 == 0 else r2) * math.sin(ang + i * math.pi / n)) for i in range(2 * n)]


def fonte(t):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, t)
    return ImageFont.load_default()


def simbolo(d, nome, claro, sombra):
    c = S / 2
    if nome in ('xp', 'evento'):
        if nome == 'evento':   # raios de sol atrás da estrela: o evento vale para o mundo todo
            for i in range(12):
                a = i * math.pi / 6
                d.polygon(pol(c, c, [(250, -16), (372, 0), (250, 16)], a), fill=sombra)
        d.polygon(estrela(c, c - 10, 300 if nome == 'xp' else 250, 128 if nome == 'xp' else 108), fill=claro)
        f = fonte(150 if nome == 'xp' else 128)
        d.text((c, c + 8), 'XP', font=f, fill=sombra, anchor='mm')
    elif nome == 'ataque':   # duas espadas cruzadas
        esp = [(-22, -330), (0, -372), (22, -330), (22, 120), (104, 120), (104, 160), (26, 160), (26, 300), (-26, 300), (-26, 160), (-104, 160), (-104, 120), (-22, 120)]
        for a in (-0.72, 0.72):
            d.polygon(pol(c, c + 20, esp, a, 0.9), fill=claro)
            d.line(pol(c, c + 20, [(0, -330), (0, 110)], a, 0.9), fill=sombra, width=8)
    elif nome == 'defesa':   # escudo com cruz
        esc = [(0, -310), (250, -230), (250, 20), (190, 190), (0, 330), (-190, 190), (-250, 20), (-250, -230)]
        d.polygon(pol(c, c, esc), fill=claro)
        d.polygon(pol(c, c, esc, 0, 0.78), fill=sombra)
        d.rectangle([c - 28, c - 190, c + 28, c + 170], fill=claro); d.rectangle([c - 140, c - 70, c + 140, c - 14], fill=claro)
    elif nome == 'velocidade':   # bota alada
        bota = [(-150, -230), (-10, -230), (-10, 60), (190, 110), (250, 170), (250, 240), (-150, 240)]
        d.polygon(pol(c + 40, c + 20, bota), fill=claro)
        d.rectangle([c - 110, c + 232, c + 290, c + 268], fill=sombra)
        for i, (ax, ay, k) in enumerate([(-120, -150, 1.0), (-120, -60, 0.82), (-120, 20, 0.64)]):   # penas da asa
            d.polygon(pol(c + ax, c + ay, [(0, -30), (-250, -110), (-200, -20), (-250, 40), (0, 40)], 0, k), fill=claro)
    elif nome == 'regen':   # coração com cruz
        d.ellipse([c - 300, c - 270, c + 10, c + 40], fill=claro); d.ellipse([c - 10, c - 270, c + 300, c + 40], fill=claro)
        d.polygon([(c - 290, c - 60), (c + 290, c - 60), (c, c + 320)], fill=claro)
        d.rectangle([c - 34, c - 170, c + 34, c + 110], fill=sombra); d.rectangle([c - 140, c - 64, c + 140, c + 4], fill=sombra)
    elif nome == 'mana':   # gota com centelha
        d.ellipse([c - 220, c - 80, c + 220, c + 340], fill=claro)
        d.polygon([(c, c - 350), (c + 196, c + 60), (c - 196, c + 60)], fill=claro)
        d.polygon(estrela(c, c + 130, 150, 44, 4), fill=sombra)
    elif nome == 'sorte':   # trevo de quatro folhas
        for a in range(4):
            x, y = c + 150 * math.cos(a * math.pi / 2 + math.pi / 4), c - 40 + 150 * math.sin(a * math.pi / 2 + math.pi / 4)
            d.ellipse([x - 150, y - 150, x + 150, y + 150], fill=claro)
        d.polygon([(c - 18, c + 30), (c + 18, c + 30), (c + 90, c + 350), (c + 40, c + 360)], fill=claro)
        d.ellipse([c - 46, c - 86, c + 46, c + 6], fill=sombra)
    elif nome == 'recuperacao':   # ampulheta dentro de setas que giram
        d.polygon([(c - 170, c - 250), (c + 170, c - 250), (c + 26, c), (c + 170, c + 250), (c - 170, c + 250), (c - 26, c)], fill=claro)
        d.rectangle([c - 200, c - 286, c + 200, c - 246], fill=claro); d.rectangle([c - 200, c + 246, c + 200, c + 286], fill=claro)
        d.polygon([(c - 100, c + 236), (c + 100, c + 236), (c, c + 100)], fill=sombra)
        d.polygon([(c - 110, c - 236), (c + 110, c - 236), (c, c - 110)], fill=sombra)
        for a in (0.5, 0.5 + math.pi):
            d.arc([c - 372, c - 372, c + 372, c + 372], math.degrees(a), math.degrees(a + 1.1), fill=claro, width=34)
            x, y = c + 372 * math.cos(a + 1.1), c + 372 * math.sin(a + 1.1)
            d.polygon(pol(x, y, [(-56, -10), (56, -10), (0, 74)], a + 1.1), fill=claro)


def icone(nome):
    r, g, b = CORES[nome]
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # medalhão: fundo escuro em degradê radial, aro na cor da bênção
    for i in range(60, 0, -1):
        k = i / 60
        raio = 470 * k
        d.ellipse([S / 2 - raio, S / 2 - raio, S / 2 + raio, S / 2 + raio], fill=(int(10 + r * 0.42 * (1 - k)), int(12 + g * 0.42 * (1 - k)), int(22 + b * 0.42 * (1 - k)), 255))
    d.ellipse([S / 2 - 486, S / 2 - 486, S / 2 + 486, S / 2 + 486], outline=(r, g, b, 255), width=34)
    d.ellipse([S / 2 - 440, S / 2 - 440, S / 2 + 440, S / 2 + 440], outline=(min(255, r + 70), min(255, g + 70), min(255, b + 70), 150), width=6)
    for i in range(24):   # marcas do aro (runas)
        a = i * math.pi / 12
        d.line([S / 2 + 408 * math.cos(a), S / 2 + 408 * math.sin(a), S / 2 + 432 * math.cos(a), S / 2 + 432 * math.sin(a)], fill=(r, g, b, 200), width=10 if i % 6 == 0 else 5)
    # símbolo: brilho por baixo, depois o desenho claro com miolo escuro
    cam = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    claro = (min(255, r + 110), min(255, g + 110), min(255, b + 110), 255)
    sombra = (int(r * 0.22), int(g * 0.22), int(b * 0.26), 255)
    simbolo(ImageDraw.Draw(cam), nome, claro, sombra)
    red = cam.resize((S * 3 // 4, S * 3 // 4), Image.LANCZOS)   # o símbolo cabe dentro do aro
    cam = Image.new('RGBA', (S, S), (0, 0, 0, 0)); cam.paste(red, (S // 8, S // 8), red)
    halo = Image.new('RGBA', (S, S), (r, g, b, 0)); halo.putalpha(cam.getchannel('A').filter(ImageFilter.GaussianBlur(34)))
    im = Image.alpha_composite(im, halo); im = Image.alpha_composite(im, cam)
    im.resize((512, 512), Image.LANCZOS).save(os.path.join(SAIDA, nome + '.png'), optimize=True)


if __name__ == '__main__':
    os.makedirs(SAIDA, exist_ok=True)
    for n in CORES:
        icone(n)
    print('ícones:', ', '.join(sorted(CORES)), '→', os.path.relpath(SAIDA))
