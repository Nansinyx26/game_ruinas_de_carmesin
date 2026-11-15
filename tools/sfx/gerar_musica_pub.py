"""Música do Pulso Neon (o pub cyberpunk do Mercado Neon) gerada na ElevenLabs.

A API de música da ElevenLabs só existe nos planos pagos; aqui a música sai da API de efeitos
sonoros em LOOPS de 22 s sem emenda (loop: true), um por seção do set. O DJ VOLTA (js/mundo/pub_neon.js,
Batida) toca as seções da Cyber Night em sequência, cada uma repetida algumas vezes e trocada com
uma passagem cruzada; fora da Cyber Night, os loops calmos do lounge. Sem os arquivos (ou abrindo do
disco), fica a batida sintetizada de antes.

Cada loop vira assets/musica/pub/<nome>.mp3 e entra pelo manifesto js/assets/musica_pub.js.
SEGURANÇA: a chave vem SÓ da variável de ambiente ELEVENLABS_API_KEY. Retomável: o que existe não é
gerado de novo (cada loop custa ~220 créditos).

Uso: python3 tools/sfx/gerar_musica_pub.py [nome ...]   |   --listar   |   --manifesto
"""
import json, os, sys, urllib.error, urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEST = os.path.join(RAIZ, 'assets', 'musica', 'pub')
MANIFESTO = os.path.join(RAIZ, 'js', 'assets', 'musica_pub.js')
API = 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128'
BASE = 'instrumental, no vocals, no voice, seamless loop'

# nome → (modo, ordem no set, descrição). Noite: 124 BPM, lá menor (a batida sintetizada de antes)
LOOPS = {
    'noite_aquecimento': ('noite', 0, f'cyberpunk club music loop warm-up, 124 BPM, filtered four on the floor kick, soft rolling synth bass, rising neon pads, A minor, {BASE}'),
    'noite_groove': ('noite', 1, f'cyberpunk club music loop, 124 BPM four on the floor, punchy kick, rolling synth bass, neon arpeggio, {BASE}'),
    'noite_drop': ('noite', 2, f'cyberpunk club music drop loop, 124 BPM, heavy pumping sidechained bass, big kick, bright saw lead stabs, energetic, A minor, {BASE}'),
    'noite_pausa': ('noite', 3, f'cyberpunk club music breakdown loop, 124 BPM, kick removed, atmospheric pads, pulsing bass filter sweep, glitchy hi-hats, A minor, {BASE}'),
    'noite_pico': ('noite', 4, f'cyberpunk club music peak-time loop, 124 BPM, driving four on the floor, aggressive acid bassline, layered neon synth arpeggios, euphoric, {BASE}'),
    'noite_tarde': ('noite', 5, f'cyberpunk club music late-night loop, 124 BPM, deep hypnotic techno groove, dark rolling bass, metallic percussion, A minor, {BASE}'),
    'lounge_neon': ('lounge', 0, f'cyberpunk lounge bar music loop, 90 BPM, mellow downtempo beat, warm electric piano chords, soft synth bass, rain-soaked neon mood, {BASE}'),
    'lounge_jazz': ('lounge', 1, f'futuristic jazzy lounge music loop, 90 BPM, brushed drums, smooth synth bass, dreamy pads, relaxed bar atmosphere, {BASE}'),
    'lounge_chuva': ('lounge', 2, f'chill synthwave lounge loop, 90 BPM, slow laid-back beat, vintage analog pads, gentle arpeggio, late night city calm, {BASE}'),
}


def gerar(nome, texto, chave):
    arq = os.path.join(DEST, nome + '.mp3')
    if os.path.exists(arq) and os.path.getsize(arq) > 50000:
        return 0
    os.makedirs(DEST, exist_ok=True)
    corpo = json.dumps({'text': texto, 'duration_seconds': 22, 'loop': True, 'prompt_influence': 0.5, 'model_id': 'eleven_text_to_sound_v2'}).encode()
    rq = urllib.request.Request(API, data=corpo, method='POST', headers={'xi-api-key': chave, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    with urllib.request.urlopen(rq, timeout=300) as r:
        dados = r.read(); custo = int(r.headers.get('character-cost') or 0)
    with open(arq + '.parte', 'wb') as f:
        f.write(dados)
    os.replace(arq + '.parte', arq)
    print(f'{nome}: {os.path.relpath(arq, RAIZ)} ({len(dados) // 1024} KB, {custo} créditos)', flush=True)
    return custo


def ganho(arq):
    """Ganho que leva o loop ao mesmo volume médio dos outros (RMS alvo 0,2), pelo ffmpeg; sem ele, 1"""
    try:
        import subprocess, numpy as np
        raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', arq, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        x = np.frombuffer(raw, dtype=np.float32)
        return round(float(min(1.6, max(0.5, 0.2 / max(1e-4, float(np.sqrt(np.mean(x ** 2))))))), 2)
    except Exception:
        return 1


def manifesto():
    M = {'noite': [], 'lounge': []}
    for nome, (modo, ordem, _) in sorted(LOOPS.items(), key=lambda kv: (kv[1][0], kv[1][1])):
        arq = os.path.join(DEST, nome + '.mp3')
        if os.path.exists(arq):
            M[modo].append({'src': f'assets/musica/pub/{nome}.mp3', 'ganho': ganho(arq)})
    with open(MANIFESTO, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n// ECLIPSE ZERO · Música do Pulso Neon (tools/sfx/gerar_musica_pub.py); não edite à mão.\n"
                "// modo → loops de 22 s na ordem do set, com o ganho que iguala o volume (noite: a Cyber Night do DJ VOLTA, ~122 BPM; lounge: fora dela)\n")
        f.write('const MUSICA_PUB = ' + json.dumps(M, ensure_ascii=False, indent=1) + ';\n')
    print(f'manifesto: {len(M["noite"])} loops da noite, {len(M["lounge"])} do lounge → {os.path.relpath(MANIFESTO, RAIZ)}')


if __name__ == '__main__':
    args = sys.argv[1:]
    if '--listar' in args:
        for n, (m, o, t) in LOOPS.items(): print(f'{n:18s} {m:6s} {o}  {t}')
        sys.exit()
    if '--manifesto' not in args:
        chave = os.environ.get('ELEVENLABS_API_KEY')
        if not chave: sys.exit('ELEVENLABS_API_KEY não está no ambiente')
        gasto = 0
        for nome in [a for a in args if not a.startswith('--')] or list(LOOPS):
            try:
                gasto += gerar(nome, LOOPS[nome][2], chave)
            except urllib.error.HTTPError as e:
                print(f'{nome}: erro {e.code} {e.read()[:240].decode("utf-8", "replace")}'); break
        print(f'{gasto} créditos')
    manifesto()
