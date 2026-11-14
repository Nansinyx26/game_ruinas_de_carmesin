#!/usr/bin/env python3
"""ECLIPSE ZERO · Voz dos heróis perguntando na conversa (ElevenLabs, geração fora do jogo)

Lê as perguntas de tools/dublagem/falas.json (node tools/dublagem/extrair_falas.mjs: os assuntos
de todos os moradores e as opções fixas, como "Quem é você?") e grava cada uma na voz de cada herói
em dublagem/herois/<herói>/<código>.mp3 (o mesmo código FNV-1a do gerar_falas.py). No fim regrava o
manifesto js/assets/vozes_herois.js. O jogo (js/mundo/vozes.js) toca a pergunta do herói ativo quando
o jogador a escolhe e só depois a resposta do morador; personagens criados usam a voz do herói da
classe deles, ou do Kael ou da Lyra pelo corpo (masculino ou feminino).

A CHAVE fica só no ambiente (ELEVENLABS_API_KEY). Retomável: o que existe não é gerado de novo.
Uso: python3 tools/dublagem/gerar_perguntas.py [--simular] [--manifesto] [--so kael,lyra]
"""
import argparse, json, os, sys, time, urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gerar_falas import VOZES, MODELO, FORMATO, FALAS, RAIZ, codigo, para_voz, duracao   # noqa: E402
import gerar_falas   # noqa: E402

SAIDA = os.path.join(RAIZ, 'dublagem', 'herois')
MANIFESTO = os.path.join(RAIZ, 'js', 'assets', 'vozes_herois.js')

# herói → (voz, velocidade, estabilidade, estilo, sexo); as vozes padrão da conta (VOZES do gerar_falas.py)
HEROIS = {
    'kael': ('charlie', 1.0, 0.5, 0.3, 'm'),     # jovem, confiante: a Unidade Zero procurando quem é
    'lyra': ('laura', 1.02, 0.45, 0.35, 'f'),    # jovem, atrevida: sobrevivente de arco na mão
    'drakos': ('adam', 0.95, 0.6, 0.25, 'm'),    # dominante, firme: o ex-soldado da Legião
    'sera': ('matilda', 1.0, 0.55, 0.2, 'f'),    # entendida, profissional: a cientista
    'orion': ('callum', 0.98, 0.45, 0.35, 'm'),  # rouca, malandra: o ex-agente clandestino
}


def manifesto():
    M = {}
    for h, (voz, *_r, sexo) in HEROIS.items():
        pasta = os.path.join(SAIDA, h)
        falas = {}
        if os.path.isdir(pasta):
            for arq in sorted(os.listdir(pasta)):
                if arq.endswith('.mp3'):
                    falas[arq[:-4]] = round(duracao(os.path.join(pasta, arq)), 2)
        if falas:
            M[h] = {'voz': voz, 'sexo': sexo, 'falas': falas}
    with open(MANIFESTO, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n// ECLIPSE ZERO · Manifesto da voz dos heróis perguntando (GERADO por tools/dublagem/gerar_perguntas.py — não editar)\n"
                "// herói → { voz, sexo, falas: { código da pergunta (FNV-1a do texto): duração em segundos } }; os áudios ficam em\n"
                "// dublagem/herois/<herói>/<código>.mp3 e quem toca é o js/mundo/vozes.js\n"
                f"const VOZES_HEROI = {json.dumps(M, ensure_ascii=False, separators=(',', ':'), sort_keys=True)};\n")
    return len(M), sum(len(v['falas']) for v in M.values())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--simular', action='store_true'); ap.add_argument('--manifesto', action='store_true'); ap.add_argument('--so', default='')
    a = ap.parse_args()
    perg = json.load(open(FALAS, encoding='utf-8')).get('perguntas') or []
    so = [h for h in a.so.split(',') if h] or list(HEROIS)
    falta = [(h, q) for h in so for q in perg if not os.path.exists(os.path.join(SAIDA, h, codigo(q) + '.mp3'))]
    chars = sum(len(para_voz(q)) for _, q in falta)
    print(f'{len(perg)} perguntas × {len(so)} heróis, {len(falta)} por gerar ({chars} caracteres ≈ {chars // 2} créditos no {MODELO})')
    if a.simular or a.manifesto:
        if a.manifesto:
            print('manifesto: %d heróis, %d perguntas' % manifesto())
        return 0
    chave = os.environ.get('ELEVENLABS_API_KEY')
    if not chave:
        print('defina ELEVENLABS_API_KEY no ambiente (a chave não vai para o código)'); return 2
    feitas = gasto = 0
    for h, q in falta:
        voz, vel, estab, estilo, _ = HEROIS[h]
        gerar_falas.ELENCO['__heroi'] = (voz, vel, estab, estilo)   # (o gerador de falas lê a voz pelo ELENCO)
        try:
            gasto += gerar_falas.gerar('__heroi', q, os.path.join(SAIDA, h, codigo(q) + '.mp3'), chave); feitas += 1
        except urllib.error.HTTPError as e:
            print(f'parou em {h}: HTTP {e.code} {e.read().decode("utf-8", "replace")[:240]}')
            if e.code == 429:
                time.sleep(20); continue
            break
        except Exception as e:
            print(f'falhou {h}: {e}'); time.sleep(3)
        if feitas % 50 == 0:
            print(f'  {feitas}/{len(falta)} · {gasto} créditos', flush=True)
        time.sleep(0.3)
    print(f'geradas {feitas} perguntas, {gasto} créditos')
    print('manifesto: %d heróis, %d perguntas' % manifesto())
    return 0


if __name__ == '__main__':
    sys.exit(main())
