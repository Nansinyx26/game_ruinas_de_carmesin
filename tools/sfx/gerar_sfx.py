"""Efeitos sonoros dos ataques e poderes gerados na ElevenLabs (Sound Effects).

Cada efeito vira assets/sfx/gerados/<nome>.mp3 e entra no jogo por js/assets/sfx_gerados.js
(SFX_GERADOS: nome do som do jogo → arquivos e volume). O jogo toca a gravação no lugar do som
sintetizado quando ela existe (js/audio.js); sem ela (ou abrindo do disco), fica o sintetizado.

SEGURANÇA: a chave vem SÓ da variável de ambiente ELEVENLABS_API_KEY (nunca no código, no
repositório nem no navegador). Não imprime a chave.
Retomável: o que já foi gravado não é gerado de novo (não gasta crédito duas vezes).

Uso: python3 tools/sfx/gerar_sfx.py [nome ...]      (sem nomes: todos os que faltam)
     python3 tools/sfx/gerar_sfx.py --listar
"""
import json
import os
import sys
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEST = os.path.join(RAIZ, 'assets', 'sfx', 'gerados')
MANIFESTO = os.path.join(RAIZ, 'js', 'assets', 'sfx_gerados.js')
API = 'https://api.elevenlabs.io/v1/sound-generation'

# nome no jogo (js/audio.js: audio.play(nome)) → [descrição em inglês para o modelo, duração (s), volume no jogo, variações]
EFEITOS = {
    'swing': ['fast energy sword slash whoosh, sharp electric crackle on the blade, short, game sound effect, no music', 0.6, 0.8, 2],
    'swingHeavy': ['heavy two-handed energy blade swing, deep whoosh with electric hum, powerful, game sound effect, no music', 0.9, 0.85, 2],
    'thrust': ['quick piercing energy sword thrust, sharp zip and spark, game sound effect, no music', 0.6, 0.8, 1],
    'hit': ['sword impact hitting armored creature, metallic thud with sparks, short punchy game hit, no music', 0.5, 0.85, 2],
    'hitHeavy': ['brutal heavy weapon impact on armored enemy, crunch and metal clang with bass thump, game sound effect, no music', 0.7, 0.9, 1],
    'crit': ['critical hit impact, sharp metallic ring with energy burst, satisfying, game sound effect, no music', 0.7, 0.85, 1],
    'stomp': ['massive ground slam, rocks cracking and debris, deep bass boom, game sound effect, no music', 1.2, 0.95, 1],
    'cristais': ['red energy crystals erupting from cracked ground, shattering glass-like crystal growth, crackling magma, deep rumble, fantasy spell, no music', 2.0, 0.9, 1],
    'cristaisCarga': ['rising magical energy charging up, low rumble building with red crackling sparks, fantasy spell charge, no music', 1.0, 0.75, 1],
    'thunder': ['electric lightning strike discharge, sharp crack and sizzling, game sound effect, no music', 1.2, 0.8, 1],
    'zap': ['short electric zap spell, crisp sci-fi energy crackle, game sound effect, no music', 0.5, 0.7, 2],
    'dash': ['quick dodge dash whoosh with soft energy trail, game sound effect, no music', 0.5, 0.75, 1],
    'deflect': ['energy shield deflects a blow, bright metallic ping with force field hum, game sound effect, no music', 0.7, 0.8, 1],
    'explosion': ['punchy fantasy explosion, fiery burst with debris, game sound effect, no music', 1.5, 0.9, 1],
    'fireball': ['fireball spell cast, whooshing flame launch, game sound effect, no music', 0.9, 0.8, 1],
    'special': ['ultimate power release, huge cosmic energy blast with bass impact and shimmering tail, game sound effect, no music', 2.0, 0.95, 1],
    'specialCharge': ['powerful energy charging up, rising synth hum and crackling electricity, game sound effect, no music', 1.6, 0.75, 1],
    'chargeTier': ['short magical power-up chime with energy pulse, game sound effect, no music', 0.6, 0.7, 1],
    'arrow': ['bow string release and arrow whoosh, crisp, game sound effect, no music', 0.6, 0.8, 2],
}


def gerar(nome, texto, dur, var):
    chave = os.environ.get('ELEVENLABS_API_KEY')
    if not chave:
        sys.exit('ELEVENLABS_API_KEY não está no ambiente')
    os.makedirs(DEST, exist_ok=True)
    feitos = []
    for k in range(var):
        arq = os.path.join(DEST, f'{nome}{"" if k == 0 else "_" + str(k + 1)}.mp3')
        if os.path.exists(arq) and os.path.getsize(arq) > 1000:
            feitos.append(arq); continue
        corpo = json.dumps({'text': texto, 'duration_seconds': dur, 'prompt_influence': 0.55}).encode()
        req = urllib.request.Request(API + '?output_format=mp3_44100_128', data=corpo, method='POST',
                                     headers={'xi-api-key': chave, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
        try:
            dados = urllib.request.urlopen(req, timeout=120).read()
        except urllib.error.HTTPError as e:
            msg = e.read()[:300].decode('utf-8', 'replace')
            print(f'{nome}: erro {e.code} {msg}')
            return feitos, e.code
        with open(arq, 'wb') as f:
            f.write(dados)
        print(f'{nome}: {os.path.relpath(arq, RAIZ)} ({len(dados) // 1024} KB)', flush=True)
        feitos.append(arq)
    return feitos, None


def manifesto():
    M = {}
    for nome, (_, _, vol, var) in EFEITOS.items():
        arqs = [f'assets/sfx/gerados/{nome}{"" if k == 0 else "_" + str(k + 1)}.mp3' for k in range(var)]
        arqs = [a for a in arqs if os.path.exists(os.path.join(RAIZ, a))]
        if arqs:
            M[nome] = {'src': arqs, 'vol': vol}
    with open(MANIFESTO, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n// ECLIPSE ZERO · Efeitos sonoros gerados na ElevenLabs (tools/sfx/gerar_sfx.py); não edite à mão.\n"
                "// nome do som do jogo → gravações (uma é sorteada a cada vez) e volume\n")
        f.write('const SFX_GERADOS = ' + json.dumps(M, ensure_ascii=False, indent=1) + ';\n')
    print(f'manifesto: {len(M)} efeitos → {os.path.relpath(MANIFESTO, RAIZ)}')


if __name__ == '__main__':
    args = sys.argv[1:]
    if '--listar' in args:
        for n, e in EFEITOS.items():
            print(f'{n:14s} {e[1]:.1f}s ×{e[3]}  {e[0]}')
        sys.exit()
    for n in args:
        if n not in EFEITOS:
            sys.exit(f'efeito desconhecido: {n}')
    for nome in args or list(EFEITOS):
        texto, dur, _, var = EFEITOS[nome]
        _, erro = gerar(nome, texto, dur, var)
        if erro in (401, 402, 403, 429):
            print('parando: sem permissão ou sem crédito na conta')
            break
    manifesto()
