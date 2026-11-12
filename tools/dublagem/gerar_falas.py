#!/usr/bin/env python3
"""ECLIPSE ZERO · Dublagem dos moradores com o ElevenLabs (geração fora do jogo)

Lê tools/dublagem/falas.json (node tools/dublagem/extrair_falas.mjs), escolhe a voz de cada morador
pelo ELENCO abaixo (sexo, idade e temperamento de cada um, decididos pelo nome, pelo papel e pela
personalidade que o jogo dá a ele) e gera um MP3 por fala em dublagem/npcs/<morador>/<código>.mp3.
O <código> é o FNV-1a de 32 bits do texto da fala: o jogo (js/mundo/vozes.js) calcula o mesmo
código da fala que vai mostrar e toca o arquivo se ele existir. No fim, regrava o manifesto
js/assets/vozes_npcs.js com o que há em disco.

A CHAVE fica só no ambiente (variável ELEVENLABS_API_KEY): nunca vai para o código, para o
repositório nem para o navegador. O jogo só toca os MP3 prontos.

Uso:
  python3 tools/dublagem/gerar_falas.py              # gera o que falta (pode parar e continuar depois)
  python3 tools/dublagem/gerar_falas.py --simular    # só lista o que geraria e quanto custa
  python3 tools/dublagem/gerar_falas.py --so rui,ancia --limite 20
  python3 tools/dublagem/gerar_falas.py --manifesto  # só regrava o manifesto

Ordem: primeiro os cumprimentos de TODOS (todo morador ganha voz), depois as respostas, depois os
rumores. Se a cota da conta acabar no meio, o que já saiu fica valendo e o resto é gerado na
próxima vez (arquivos existentes não são refeitos nem cobrados de novo).
"""
import argparse, json, os, re, subprocess, sys, time, urllib.error, urllib.request

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FALAS = os.path.join(RAIZ, 'tools', 'dublagem', 'falas.json')
SAIDA = os.path.join(RAIZ, 'dublagem', 'npcs')
MANIFESTO = os.path.join(RAIZ, 'js', 'assets', 'vozes_npcs.js')
MODELO = 'eleven_turbo_v2_5'   # português pelo código do idioma; meio crédito por caractere
FORMATO = 'mp3_44100_64'

# Vozes padrão da conta (as únicas que a API aceita no plano gratuito; num plano pago, troque o id
# por uma voz brasileira da biblioteca): nome → (id, sexo, o que ela tem)
VOZES = {
    'brian': ('nPczCjzI2devNBz1zQrb', 'm', 'grave, firme e acolhedora'),
    'bill': ('pqHfZKP75CvOlQylNhV4', 'm', 'idoso, sábio'),
    'george': ('JBFqnCBsd6RMkjVDRZzb', 'm', 'contador de histórias, madura'),
    'callum': ('N2lVS1w4EtoT3dr4eOWO', 'm', 'rouca, malandra'),
    'harry': ('SOYHLrjzK2X1ezoPC6cr', 'm', 'jovem guerreiro, áspera'),
    'adam': ('pNInz6obpgDQGcFmaJgB', 'm', 'dominante, firme'),
    'daniel': ('onwK4e9ZLuTAKqWW03F9', 'm', 'formal, de locutor'),
    'roger': ('CwhRBWXzGAHq8TQ4Fs17', 'm', 'tranquila, casual'),
    'charlie': ('IKne3meq5aSn9XLyUdCD', 'm', 'jovem, confiante'),
    'liam': ('TX3LPaxmHKxFdv7VOQHJ', 'm', 'jovem, enérgica'),
    'will': ('bIHbv24MWmeRgasZH58o', 'm', 'jovem, otimista'),
    'eric': ('cjVigY5qzO86Huf0OWal', 'm', 'suave, de confiança'),
    'chris': ('iP95p4xoKVk53GoZ742B', 'm', 'simpática, pé no chão'),
    'sarah': ('EXAVITQu4vr4xnSDxMaL', 'f', 'segura, madura'),
    'laura': ('FGY2WhTYpPnrIDTdsKH5', 'f', 'jovem, atrevida'),
    'matilda': ('XrExE9yKIg1WjnnlVkGX', 'f', 'entendida, profissional'),
    'jessica': ('cgSgspJ2msm6clMCkdW9', 'f', 'jovem, alegre e calorosa'),
    'lily': ('pFZP5JQG7iQjIQuC4Bku', 'f', 'aveludada, de atriz'),
    'alice': ('Xb7hH8MSUJpSbSDYk0k2', 'f', 'clara, de professora'),
    'bella': ('hpp4J3VqNfWAUOO0d1Us', 'f', 'luminosa, calorosa'),
}

# ELENCO: morador → (voz, velocidade, estabilidade, estilo). Velocidade < 1: fala pausada (idosos,
# sábios, cansados); > 1: fala ligeira (jovens, apressados). Estabilidade baixa: mais emoção.
ELENCO = {
    # Mercado das Cinzas (o primeiro lugar do mundo aberto)
    'comerciante': ('eric', 1.04, 0.45, 0.35), 'ancia': ('lily', 0.88, 0.6, 0.2), 'vanda': ('sarah', 1.0, 0.5, 0.25), 'tomas': ('will', 1.03, 0.45, 0.3),
    'helena': ('alice', 0.94, 0.6, 0.15), 'rui': ('brian', 0.98, 0.55, 0.2), 'marta': ('bella', 1.0, 0.5, 0.25), 'nina': ('jessica', 1.05, 0.4, 0.4),
    'ivo': ('daniel', 0.95, 0.7, 0.1),
    # Floresta de Velmora e Lagoa
    'guarda': ('sarah', 0.94, 0.6, 0.2), 'bento': ('chris', 0.98, 0.5, 0.25), 'maira': ('lily', 0.9, 0.6, 0.2), 'italo': ('roger', 0.97, 0.55, 0.2),
    'pescadora': ('bella', 0.97, 0.45, 0.35), 'ze': ('bill', 0.92, 0.5, 0.3), 'iara': ('alice', 0.9, 0.6, 0.2), 'decio': ('will', 1.0, 0.5, 0.25),
    # Zona NEXUS, deserto, montanha e vulcão
    'desertor': ('callum', 0.95, 0.4, 0.35), 'kira': ('sarah', 1.02, 0.5, 0.3), 'teca': ('laura', 1.04, 0.45, 0.35), 'moura': ('callum', 1.02, 0.4, 0.45),
    'otto': ('brian', 1.0, 0.55, 0.2), 'luz': ('jessica', 1.03, 0.45, 0.3), 'bruno': ('liam', 1.04, 0.45, 0.35), 'nomade': ('lily', 0.9, 0.65, 0.15),
    'salma': ('matilda', 1.0, 0.5, 0.3), 'abel': ('bill', 0.93, 0.55, 0.25), 'alpinista': ('charlie', 1.05, 0.4, 0.45), 'bram': ('adam', 1.0, 0.6, 0.2),
    'sofia': ('jessica', 0.97, 0.45, 0.3), 'gunnar': ('brian', 0.96, 0.6, 0.2), 'neva': ('alice', 0.92, 0.6, 0.2), 'forjador': ('adam', 0.96, 0.5, 0.35),
    'ignea': ('matilda', 0.98, 0.5, 0.3), 'cinza': ('lily', 0.93, 0.55, 0.25),
    # Refúgio da Aurora (cidade principal)
    'aur_brasa': ('matilda', 0.98, 0.5, 0.3), 'aur_dante': ('chris', 1.0, 0.5, 0.25), 'aur_iris': ('laura', 1.02, 0.5, 0.3), 'aur_otto': ('george', 1.02, 0.4, 0.4),
    'aur_veridiana': ('lily', 0.98, 0.6, 0.2), 'aur_caio': ('charlie', 1.0, 0.5, 0.25), 'aur_berta': ('bella', 1.0, 0.5, 0.25), 'aur_lia': ('jessica', 1.0, 0.5, 0.3),
    'aur_salvio': ('eric', 1.02, 0.45, 0.35), 'aur_mae_ana': ('alice', 0.9, 0.6, 0.2), 'aur_teo': ('liam', 1.02, 0.45, 0.3), 'aur_tobias': ('chris', 1.0, 0.5, 0.3),
    'aur_cora': ('bella', 1.0, 0.5, 0.3), 'aur_davi': ('liam', 1.06, 0.4, 0.4), 'aur_rui': ('harry', 0.96, 0.55, 0.25), 'aur_marta': ('sarah', 0.97, 0.55, 0.2),
    'aur_nina': ('jessica', 1.03, 0.45, 0.35), 'aur_jorge': ('roger', 1.0, 0.45, 0.35), 'aur_bento': ('roger', 0.96, 0.5, 0.3), 'aur_cosme': ('george', 1.0, 0.4, 0.5),
    'aur_rosa': ('bella', 0.98, 0.5, 0.3), 'aur_viajante': ('callum', 0.9, 0.55, 0.3), 'aur_helena': ('lily', 0.94, 0.65, 0.15), 'aur_didimo': ('daniel', 0.98, 0.55, 0.2),
    'aur_irene': ('sarah', 1.0, 0.6, 0.2), 'aur_pedro': ('harry', 1.03, 0.5, 0.3),
    # Metrópole, Ruínas Carmesins e NEXUS Zero
    'met_vega': ('matilda', 1.05, 0.55, 0.2), 'met_lia': ('alice', 1.0, 0.55, 0.2), 'met_kai': ('charlie', 1.05, 0.45, 0.35), 'met_brutus': ('adam', 0.98, 0.5, 0.35),
    'met_ines': ('bella', 0.94, 0.5, 0.3), 'ruc_tor': ('brian', 0.95, 0.6, 0.2), 'ruc_saba': ('lily', 0.92, 0.6, 0.2), 'ruc_milo': ('will', 1.0, 0.5, 0.25),
    'ruc_iara': ('sarah', 1.0, 0.6, 0.2), 'nz_ada': ('matilda', 1.02, 0.6, 0.15), 'nz_eco': ('alice', 0.9, 0.7, 0.1), 'nz_bit': ('liam', 1.04, 0.45, 0.3),
    'nz_oren': ('adam', 0.96, 0.6, 0.2), 'met_raia': ('sarah', 1.0, 0.55, 0.25), 'ruc_guardia': ('lily', 0.94, 0.65, 0.15), 'nz_engenheiro': ('daniel', 0.92, 0.6, 0.2),
    # Moradores com o corpo dos GLB enviados
    'mes_ferreiro': ('chris', 0.96, 0.55, 0.2), 'mes_camponesa': ('jessica', 1.0, 0.45, 0.35), 'mes_guarda': ('harry', 0.98, 0.55, 0.25), 'mes_hacker': ('laura', 1.06, 0.4, 0.45),
    'mes_operario': ('roger', 0.98, 0.5, 0.25), 'mes_comerciante': ('eric', 1.05, 0.45, 0.35), 'mes_gm': ('brian', 0.94, 0.65, 0.2),
}


def codigo(txt):
    """FNV-1a de 32 bits sobre as unidades UTF-16 do texto (o mesmo cálculo de js/mundo/vozes.js)"""
    h = 0x811c9dc5
    b = txt.encode('utf-16-le')
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = (h * 0x01000193) & 0xffffffff
    return f'{h:08x}'


def para_voz(txt):
    """O texto que a voz lê: aspas e travessões viram pausas naturais"""
    t = txt.replace('—', ', ').replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', t).strip()


def fila(povo, so):
    F = []
    for tipo in ('ola', 'temas', 'rumores'):   # cumprimentos de todos primeiro
        for P in povo:
            if so and P['id'] not in so:
                continue
            for txt in P.get(tipo) or []:
                if isinstance(txt, str) and txt.strip():
                    F.append((P['id'], tipo, txt))
    return F


def gerar(pid, txt, destino, chave):
    voz, vel, estab, estilo = ELENCO[pid]
    corpo = {'text': para_voz(txt), 'model_id': MODELO, 'language_code': 'pt',
             'voice_settings': {'stability': estab, 'similarity_boost': 0.8, 'style': estilo, 'use_speaker_boost': True, 'speed': vel}}
    rq = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOZES[voz][0]}?output_format={FORMATO}', data=json.dumps(corpo).encode(),
                                headers={'xi-api-key': chave, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(rq, timeout=180) as r:
        dados = r.read()
        custo = int(r.headers.get('character-cost') or 0)
    if len(dados) < 2000:
        raise RuntimeError('áudio vazio')
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino + '.parte', 'wb') as f:
        f.write(dados)
    os.replace(destino + '.parte', destino)
    return custo


def duracao(arq):
    try:
        return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq], capture_output=True, text=True).stdout.strip())
    except Exception:
        return 0.0


def manifesto(povo):
    """js/assets/vozes_npcs.js: morador → { voz, falas: { código: segundos } } (só o que existe em disco)"""
    M = {}
    for P in povo:
        pasta = os.path.join(SAIDA, P['id'])
        if not os.path.isdir(pasta) or P['id'] not in ELENCO:
            continue
        validos = {codigo(t) for tipo in ('ola', 'temas', 'rumores') for t in (P.get(tipo) or []) if isinstance(t, str)}
        falas = {}
        for arq in sorted(os.listdir(pasta)):
            c = arq[:-4]
            if arq.endswith('.mp3') and c in validos:
                falas[c] = round(duracao(os.path.join(pasta, arq)), 2)
        if falas:
            M[P['id']] = {'voz': ELENCO[P['id']][0], 'falas': falas}
    n = sum(len(v['falas']) for v in M.values())
    with open(MANIFESTO, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n// ECLIPSE ZERO · Manifesto da dublagem dos moradores (GERADO por tools/dublagem/gerar_falas.py — não editar)\n"
                "// morador → { voz, falas: { código da fala (FNV-1a do texto): duração em segundos } }; os áudios ficam em\n"
                "// dublagem/npcs/<morador>/<código>.mp3 e quem toca é o js/mundo/vozes.js\n"
                f"const VOZES_NPC = {json.dumps(M, ensure_ascii=False, separators=(',', ':'), sort_keys=True)};\n")
    return len(M), n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--simular', action='store_true'); ap.add_argument('--manifesto', action='store_true')
    ap.add_argument('--so', default=''); ap.add_argument('--limite', type=int, default=0)
    a = ap.parse_args()
    povo = json.load(open(FALAS, encoding='utf-8'))['povo']
    sem = [P['id'] for P in povo if P['id'] not in ELENCO and (P.get('ola') or P.get('temas'))]
    if sem:
        print('sem voz no ELENCO:', ', '.join(sem))
    so = set(x for x in a.so.split(',') if x)
    F = [q for q in fila(povo, so) if q[0] in ELENCO]
    falta = [(p, t, x) for p, t, x in F if not os.path.exists(os.path.join(SAIDA, p, codigo(x) + '.mp3'))]
    chars = sum(len(para_voz(x)) for _, _, x in falta)
    print(f'{len(F)} falas, {len(F) - len(falta)} prontas, {len(falta)} por gerar ({chars} caracteres ≈ {chars // 2} créditos no {MODELO})')
    if a.manifesto or a.simular:
        if a.manifesto:
            print('manifesto: %d moradores, %d falas' % manifesto(povo))
        return 0
    chave = os.environ.get('ELEVENLABS_API_KEY')
    if not chave:
        print('defina ELEVENLABS_API_KEY no ambiente (a chave não vai para o código)'); return 2
    feitas = gasto = 0
    for pid, tipo, txt in falta:
        if a.limite and feitas >= a.limite:
            break
        try:
            gasto += gerar(pid, txt, os.path.join(SAIDA, pid, codigo(txt) + '.mp3'), chave); feitas += 1
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'replace')[:240]
            print(f'parou em {pid}/{tipo}: HTTP {e.code} {msg}')
            if e.code == 429:
                time.sleep(20); continue
            break   # cota, pagamento ou permissão: o que já saiu fica valendo
        except Exception as e:   # rede: tenta a próxima
            print(f'falhou {pid}/{tipo}: {e}'); time.sleep(3)
        if feitas % 20 == 0:
            print(f'  {feitas}/{len(falta)} · {gasto} créditos'); sys.stdout.flush()
        time.sleep(0.35)
    print(f'geradas {feitas} falas, {gasto} créditos')
    print('manifesto: %d moradores, %d falas' % manifesto(povo))
    return 0


if __name__ == '__main__':
    sys.exit(main())
