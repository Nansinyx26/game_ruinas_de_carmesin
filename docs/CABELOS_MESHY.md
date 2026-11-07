# Cabelos gerados no Meshy por texto

Dois cabelos novos na criação de personagem, no estilo Realista, gerados no Meshy a partir de uma descrição em inglês:

| Opção | Nome | Peça | Origem |
|---|---|---|---|
| 24 | Longo liso | `cabelo_meshy_longo` | prévia + refino (textura PBR do Meshy) |
| 25 | Cyber espetado | `cabelo_meshy_cyber` | só a prévia (sem textura; recebe uma textura de fios) |

As opções novas vieram **depois** das 24 que já existiam. Assim, os personagens salvos continuam com o mesmo cabelo.

## Etapas

1. **Gerar** (`tools/meshy/gerar_cabelos.py`)
   - A lista e as descrições ficam em `tools/meshy/cabelos.json`.
   - São duas etapas, para não gastar créditos à toa:
     - `--etapa previa`: a malha, 20 créditos;
     - `--etapa refino`: a textura, 10 créditos, só nos ids pedidos.
   - Nada é gasto sem `--confirmar`. Uma tarefa já feita não é paga de novo.
   - O login é a sessão do `meshy-cli`, feita pelo navegador: **nenhuma chave passa pelo código nem pelo repositório.**
   - O GLB baixado fica em `.cache_criacao/meshy_cabelos/fonte/`, fora do Git. Ele passa de 50 MB e vem preso a uma cabeça de manequim.

2. **Separar** (`tools/meshy/separar_cabelo.py`, com o Blender como módulo Python)
   - Mesmo pedindo "só o cabelo", o Meshy devolve a peça numa malha só com uma cabeça de manequim (às vezes um busto).
   - **Modo `cor`** (peça com textura): sai a pele do manequim, clara e quente (vermelho > verde > azul). O brilho das mechas é claro, mas neutro, e fica. Cortar todo o claro abria buracos no cabelo.
   - **Modo `altura`** (prévia sem textura): fica o que está acima da linha do couro cabeludo. A peça ganha UV e uma textura de fios, e a criação a tinge.
   - **Giro:** o manequim às vezes vem olhando na diagonal (−44° no longo, −27° no cyber). A frente é a perpendicular à linha dos ombros do busto, e a peça é virada de frente.
   - **Molde:** do maior pedaço contínuo de pele, sai o perfil do manequim, com o raio e o centro de cada fatia horizontal. Ele vai para `<id>.json`.
   - A malha é reduzida a uns 60 mil triângulos (Decimate). A miniatura é renderizada em Cycles a partir da peça já separada.
   - A saída fica em `assets/Criar_Personagem/Cabelo_Meshy/`: `<id>.glb` (Git LFS, 3,5 e 7,9 MB), `<id>.json` e `<id>.png`.

3. **Converter** (`tools/importar_criacao.py --so cabelo_meshy_longo cabelo_meshy_cyber`)
   - A peça entra como os outros cabelos: redução a 16 mil triângulos, textura reassada, pesos na cabeça e as pontas longas no osso `hair`.
   - **Encaixe pelo molde** (`ajuste_molde`): o perfil do manequim é encaixado no perfil da cabeça de cada corpo, do queixo aos olhos. A escala e a altura saem da forma da mandíbula e do crânio. A posição na horizontal sai dos centros das fatias.
   - O que ainda ficar dentro da cabeça é empurrado para fora.

## Por que não o encaixe por cobertura

O encaixe que os outros cabelos usam procura a escala e a posição que cobrem a cabeça sem tapar os olhos. Nestas peças, ele errava:
- o cyber ficava grande demais no corpo masculino, cobrindo o rosto;
- o longo, girado e com franja e cortina na frente do peito, caía sobre o rosto.

Também foi testado levar o nariz e o pescoço do manequim para os do corpo, mas não deu certo:
- mechas claras soltas passavam por nariz;
- o pescoço comprido do manequim não marca uma altura.

O perfil da cabeça inteira resolve as duas coisas.

## Testes

Em `criacaoGLB` (`js/testes.js`):
- o catálogo tem 25 cabelos, e a criação, 26 opções;
- as duas peças estão convertidas, com miniatura, e as opções 24 e 25 levam a elas;
- a escala nos dois corpos tem a mesma ordem de grandeza.

## Limites

- O cyber veio da prévia, sem textura do Meshy. A textura de fios é gerada.
- As peças não têm a física em mechas dos cortes do Blender. Só as pontas do longo balançam, pelo osso `hair`, como nos outros cabelos do Meshy.
- Restam 5 créditos na conta do Meshy, que não bastam para outra prévia (20).
