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
    # impacto por material (js/audio.js, impacto): máquinas e criaturas; e o herói levando o golpe
    'hitMetal': ['energy blade striking a metal robot chassis, sharp metallic clang with electric spark crackle, punchy and short, game hit sound effect, no music', 0.5, 0.85, 2],
    'hitCarne': ['heavy sword slash hitting a creature, meaty flesh impact with wet thud and deep punch, short, game hit sound effect, no music', 0.5, 0.85, 2],
    'playerHurt': ['armored hero takes a heavy hit, body blow thud with armor rattle and energy shield crackle, short, game damage sound effect, no voice, no music', 0.6, 0.8, 2],
    # ---- poderes por classe (js/audio.js, poder): a gravação do poder no lugar dos sons genéricos de carga
    # ARCANO (Kael): eletricidade azul, runas e espaço
    'poder_arco_voltaico': ['arcane electric sword arc slash, crackling blue lightning along the blade with a rune hum, sharp and fast, game sound effect, no music, no voice', 0.8, 0.85, 1],
    'poder_corrente_relampago': ['chain lightning spell jumping between targets, rapid electric zaps linked in sequence with arcane shimmer, game sound effect, no music, no voice', 1.2, 0.85, 1],
    'poder_campo_magnetico': ['magnetic field activating around the hero, loud deep electromagnetic hum rising with strong crackles and spinning arcane runes, game sound effect, no music, no voice', 1.4, 1.0, 1],
    'poder_ruptura_plasma': ['plasma rupture blast, compressed blue energy bursting outward with a deep thump and crackle, game sound effect, no music, no voice', 1.0, 0.85, 1],
    'poder_investida_sombria': ['arcane dash strike, fast whoosh through space with a sharp electric impact at the end, game sound effect, no music, no voice', 0.8, 0.85, 1],
    'poder_salto_dimensional': ['dimensional teleport blink, space folding with a reversed whoosh, glassy shimmer and a soft pop, game sound effect, no music, no voice', 0.9, 0.85, 1],
    'poder_tempestade_laminas': ['storm of spinning energy blades, many fast metallic whooshes swirling with electric crackle, game sound effect, no music, no voice', 1.6, 0.85, 1],
    'poder_sobrecarga': ['power overload activating, rising electric surge and generator whine climbing to a bright peak, game sound effect, no music, no voice', 1.4, 0.85, 1],
    'poder_escudo_energia': ['energy shield forming, bright resonant force field hum with a crystalline ring, game sound effect, no music, no voice', 1.0, 0.85, 1],
    'poder_sincronizacao': ['arcane synchronization, layered harmonic chimes aligning into one pure tone with rune pulses, game sound effect, no music, no voice', 1.3, 0.85, 1],
    # ARQUEIRA (Lyra): flechas espectrais violeta, precisão
    'poder_lyra_tiro': ['precise energy bow shot, taut bowstring snap and a focused spectral arrow zip, clean and crisp, game sound effect, no music, no voice', 0.7, 0.85, 1],
    'poder_lyra_armadilha': ['plasma trap being set on the ground, mechanical click and a humming violet energy arming, game sound effect, no music, no voice', 1.0, 0.85, 1],
    'poder_lyra_flecha': ['explosive spectral arrow released, heavy bow draw and twang with a hissing charged arrow, game sound effect, no music, no voice', 0.9, 0.85, 1],
    'poder_lyra_foco': ['archer battle focus, time slowing, deep whoosh with a high spectral ring and a heartbeat thump, game sound effect, no music, no voice', 1.5, 0.85, 1],
    'poder_lyra_rajada': ['volley of several energy arrows fired in quick succession, rapid bowstring snaps and arrow whooshes, game sound effect, no music, no voice', 1.0, 0.85, 1],
    'poder_lyra_chuva_fotons': ['rain of spectral photon arrows falling from the sky, many descending whistles and violet shimmering impacts, game sound effect, no music, no voice', 2.0, 0.85, 1],
    # TANQUE (Drakos): peso, ferro e terra
    'poder_drakos_golpe': ['massive heavy hammer swing from an armored giant, deep whoosh and crushing metal impact with rumble, game sound effect, no music, no voice', 1.0, 0.85, 1],
    'poder_drakos_escudo': ['heavy tower shield raised with an energy barrier, thick metal clank and low force field hum, game sound effect, no music, no voice', 1.0, 0.85, 1],
    'poder_drakos_investida': ['armored tank charging forward, heavy stomping footsteps accelerating into a crashing shoulder impact, game sound effect, no music, no voice', 1.2, 0.85, 1],
    'poder_drakos_zona': ['impact zone ground pound, enormous slam shaking the earth with rocks cracking and a deep shockwave boom, game sound effect, no music, no voice', 1.6, 0.85, 1],
    'poder_drakos_terremoto': ['earthquake spell, rolling deep rumble with ground splitting and heavy debris falling, game sound effect, no music, no voice', 2.0, 0.85, 1],
    # SACERDOTE (Sera): luz, cura e tecnologia
    'poder_sera_drone': ['support drone deploying, small rotor spin-up with friendly electronic beeps and soft hover hum, game sound effect, no music, no voice', 1.2, 0.85, 1],
    'poder_sera_campo': ['holy force field dome rising, warm shimmering light swell with soft hexagon chimes, game sound effect, no music, no voice', 1.5, 0.85, 1],
    'poder_sera_hack': ['system hack spell, digital glitch burst with data chirps and electronic stutter, game sound effect, no music, no voice', 1.1, 0.85, 1],
    'poder_sera_cura': ['healing light spell, gentle rising sparkles, warm bell tones and a soft radiant swell, game sound effect, no music, no voice', 1.6, 0.85, 1],
    # ASSASSINO (Orion): sombra e lâminas
    'poder_orion_furtividade': ['assassin vanishing into shadow, soft dark whoosh with a muffled reverse swell and fading air, game sound effect, no music, no voice', 1.0, 0.85, 1],
    'poder_orion_duplo': ['twin daggers double slash, two very fast sharp blade swishes in quick succession with a metallic glint, game sound effect, no music, no voice', 0.7, 0.85, 1],
    'poder_orion_lamina': ['energy blade thrown spinning through the air, fast whirring blade with a hot energy hiss, game sound effect, no music, no voice', 0.9, 0.85, 1],
    'poder_orion_furia': ['shadow fury, rapid flurry of dark teleport strikes, many quick blade hits with shadowy whooshes, game sound effect, no music, no voice', 1.8, 0.85, 1],
    # ativas novas das árvores (Drakos, Sera, Orion)
    'poder_drakos_muralha': ['living wall of energy shields rising from the ground, heavy stone and metal plates locking together with a deep barrier hum, game sound effect, no music, no voice', 1.4, 0.85, 1],
    'poder_drakos_canhao': ['hammer shockwave cannon, massive hammer slamming down launching a roaring wave of force across the ground, game sound effect, no music, no voice', 1.4, 0.85, 1],
    'poder_drakos_grito': ['war cry power-up, huge rallying energy burst with a deep resonant war horn and armor rattle, no voice, game sound effect, no music, no voice', 1.4, 0.85, 1],
    'poder_sera_sentinela': ['stationary sentry turret deploying, mechanical unfolding, servo whirs and a targeting lock-on beep, game sound effect, no music, no voice', 1.4, 0.85, 1],
    'poder_sera_pulso': ['repulsor pulse, sharp expanding energy wave pushing outward with a deep whump and bright shimmer, game sound effect, no music, no voice', 1.0, 0.85, 1],
    'poder_sera_apagao': ['electronic blackout, power shutting down with a descending electric whine, crackle and sudden silence, game sound effect, no music, no voice', 1.3, 0.85, 1],
    'poder_sera_injecao': ['nano injection boost, quick hydraulic hiss and bright rising digital tones, game sound effect, no music, no voice', 1.0, 0.85, 1],
    'poder_orion_fumaca': ['smoke bomb thrown, small pop and a thick hissing burst of smoke spreading, game sound effect, no music, no voice', 1.2, 0.85, 1],
    'poder_orion_leque': ['fan of throwing knives released at once, several blades whooshing out in a spread with metallic glints, game sound effect, no music, no voice', 0.9, 0.85, 1],
    # ESPECIAL de cada herói (a suprema)
    'especial_kael': ['ultimate arcane eclipse release, huge blue lightning storm discharge with rune circles collapsing into a deep bass impact, game sound effect, no music, no voice', 2.0, 0.85, 1],
    'especial_lyra': ['ultimate archer power, time slows with a deep spectral warp, violet energy bow fully charged and ringing, game sound effect, no music, no voice', 2.0, 0.85, 1],
    'especial_drakos': ['ultimate tank rage, colossal armored engine surge and an earth-shattering slam, game sound effect, no music, no voice', 2.0, 0.85, 1],
    'especial_sera': ['ultimate holy light burst, radiant explosion of light with shimmering bells and a warm bass swell, game sound effect, no music, no voice', 2.0, 0.85, 1],
    'especial_orion': ['ultimate shadow assassination, darkness swallowing all sound then a single devastating blade strike with echo, game sound effect, no music, no voice', 2.0, 0.85, 1],
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
