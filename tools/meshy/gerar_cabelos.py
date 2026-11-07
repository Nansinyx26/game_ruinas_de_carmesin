"""ECLIPSE ZERO · Penteados gerados no Meshy por texto (peças soltas para a criação de personagem).

A lista fica em tools/meshy/cabelos.json (id, nome, a descrição em inglês e como separar a peça da cabeça
de manequim). A geração usa a mesma fila das barbas (tools/meshy/gerar_barbas.py): prévia e refino PBR
em 4K, registro em .cache_criacao/meshy_cabelos/ (o que já foi feito não é pago de novo; tarefas em
andamento são retomadas), saldo conferido antes de cada envio, até 3 tentativas. Nada é gasto sem
--confirmar. A sessão é a do meshy-cli (login pelo navegador): a chave não passa por aqui.
Depois: tools/meshy/separar_cabelo.py <id> e tools/importar_criacao.py --so <id>.
Uso: python3 tools/meshy/gerar_cabelos.py [--etapa previa|refino|tudo] [--ids a,b] [--confirmar]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gerar_barbas import main  # noqa: E402

if __name__ == '__main__':
    sys.exit(main(['--lista', 'cabelos'] + sys.argv[1:]))
