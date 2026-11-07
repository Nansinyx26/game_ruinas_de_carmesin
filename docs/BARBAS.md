# Barbas 3D: encaixe anatômico, fios e geração no Meshy

Este documento registra o estado real desta etapa: o que entrou no jogo, como funciona, os testes e o que depende de créditos do Meshy.

**Regra:** a barba se adapta ao rosto, e não o rosto à barba.

## O que já existia

- **16 barbas na criação (estilo Realista):**
  - 5 enviadas do Meshy (cacheada, curta, longa, média e viking), cascas fechadas com textura própria;
  - 11 feitas em mechas no Blender (`tools/blender/barbas.py`).
- **Bigode:** 4 bigodes separados.
- **Cor:** própria ou a do cabelo.
- **Formato do rosto:** a barba já acompanhava a deformação do rosto (mandíbula, queixo, boca...).
- **O problema:** todas eram encaixadas pelo conversor num rosto só, o de referência (o Rosto 1 em cada corpo).
  - Nos outros 7 rostos, o queixo e a mandíbula maiores atravessavam a barba.
  - A "solução" era fazer o rosto **recuar** sob a barba, até 0,35 unidade: o rosto se adaptava à barba.
  - Em rostos mais estreitos, a barba ficava como máscara, com vão entre a bochecha e a barba.

## Encaixe anatômico (`js/criacao/barba_encaixe.js`)

Roda na montagem do personagem (`Criacao3D.build`), depois de pôr o rosto, a barba e o bigode, com o formato do rosto já aplicado nos dois. Leva de 35 a 150 ms por personagem.

1. **Raios a partir de um centro dentro da cabeça** (atrás da boca).
   - Cada vértice da barba define uma direção.
   - Nessa direção, mede-se onde fica a pele no rosto de referência e no rosto escolhido: a saída mais externa do raio pelos triângulos de cada malha.
   - Os triângulos ficam numa grade de ângulos, para não testar todos.
2. **Conformação.** O vértice anda, ao longo do raio, a diferença entre as duas peles.
   - A folga de cada ponto até a pele fica a mesma do encaixe de referência.
   - Assim, a superfície interna acompanha a mandíbula, o queixo, as bochechas, o buço e as costeletas do rosto escolhido.
   - O volume externo e a silhueta dos fios ficam os da barba.
   - O deslocamento é suavizado na malha, com os vértices soldados, para não rasgar nas costuras da UV.
   - As pontas soltas abaixo do queixo herdam o deslocamento dos vizinhos.
3. **Volume e comprimento** escolhidos na criação.
   - Volume: a folga é multiplicada.
   - Comprimento: o que pende abaixo do queixo é esticado ou encolhido.
4. **Máscaras das regiões do rosto.** Nada sobe à faixa dos olhos nem ao dorso do nariz.
   - Num rosto mais estreito, o alto da barba na bochecha era puxado para dentro, até a pálpebra.
5. **Raiz das mechas.** Cada pedaço solto da malha (uma mecha das barbas do Blender) desce inteiro até a pele, pelo seu ponto mais perto dela.
   - Assim as costeletas não ficam em pé, afastadas da têmpora.
6. **Colisão e vãos.**
   - Nenhum ponto fica dentro da pele: sai até a margem.
   - Nas barbas em casca, a face de dentro que ficou afastada desce até a pele: sem barba flutuando.
7. **Validação**, por um método independente (o vértice do rosto mais perto e a normal dele):
   - atravessamentos;
   - vãos na face de dentro, na mandíbula e na bochecha;
   - vértices sobre os olhos (diante do globo, medido no próprio rosto);
   - vértices sobre o nariz.

   Uma barba reprovada é refeita com margem e suavização maiores, e fechando vãos maiores. O resultado vai para a tela de criação (categorias BARBA e FIOS: "Encaixe no rosto: aprovado") e para os testes.

O rosto não é mais deformado. `Criacao3D.OPC.rostoSobBarba` volta ao recuo antigo, só para comparar.

**Movimento:** a barba usa os pesos da cabeça e acompanha todos os movimentos dela:
- olhar;
- acenos da fala;
- golpes;
- montaria.

## Controles na criação

- **BARBA:** a barba (grade com miniaturas), o bigode e a cor (própria ou a do cabelo).
  - A paleta ganhou castanho-claro, loiro-escuro e acaju: preto, castanho, castanho-claro, loiro, ruivo, grisalho, branco e mais.
  - A tonalidade (FIOS) varia cada cor para o frio ou o quente.
- **FIOS**, cinco passos em cada controle:
  - **Comprimento:** bem curta a bem longa.
  - **Volume:** bem rente a bem cheia.
  - **Densidade:**
    - rala e falhada mostram a pele entre os fios, com manchas de ruído em duas escalas;
    - densa fecha os reflexos e as falhas da textura.
  - **Tonalidade:** bem fria a bem quente.
  - **Grisalho:** de poucos fios a quase branco. São fios brancos inteiros (traços ao longo do fio), que não somem na distância.
- Tudo aparece na hora no personagem, é salvo no perfil e volta igual ao carregar. Os perfis antigos ganham o valor padrão.

## Barbas do Meshy (texto → 3D)

- **Biblioteca:** `tools/meshy/barbas.json`, com 31 estilos, cada um com a própria descrição de forma, comprimento, densidade e direção dos fios.
  - **Curtas (6):** por fazer, curta uniforme, curta degradê, curta desenhada, boxed beard, curta com bigode.
  - **Médias (6):** média cheia, lenhador curta, arredondada, quadrada, laterais baixas, queixo alongado.
  - **Longas (6):** longa natural, viking, volumosa, trançada, longa pontiaguda, longa com tranças.
  - **Bigodes (7):** clássico, Chevron, Handlebar, fino, grosso, integrado à barba, militar.
  - **Especiais (6):** com cicatrizes, irregular, grisalha, envelhecida, com fios brancos, futurista.
- **Fila de geração:** `tools/meshy/gerar_barbas.py`.
  - **Prévia:** o modelo mais recente do Meshy, triângulos, remalha com meta de 30 mil polígonos.
  - **Refino:** texturas PBR em 4K (cor, normal, metal e aspereza), sem luz pintada.
  - **Estado de cada estilo** em `.cache_criacao/meshy_barbas/<id>.json`:
    - o que já foi gerado nunca é pago de novo;
    - uma tarefa em andamento é retomada, não recriada.
  - **Saldo:** conferido antes de cada envio; a fila para quando não há créditos.
  - **Falhas:** até 3 tentativas, com espera crescente; o erro fica registrado.
  - Nada é gasto sem `--confirmar`.
  - **Chave da API:** a sessão é a do `meshy-cli` (login pelo navegador). Nenhuma chave passa pelo código, pelo repositório ou pelo jogo; o jogo só carrega os arquivos já convertidos.
- **Separação:** `tools/meshy/separar_cabelo.py --tipo barba`.
  - Tira a cabeça de manequim: a pele clara e quente sai, e o brilho neutro dos fios fica.
  - Vira a peça de frente, pela linha dos ombros do busto.
  - Fica só o que está abaixo do nariz (as sobrancelhas do manequim saem).
  - Mede o perfil do manequim, que é o molde do encaixe, e reduz a malha.
- **Pastas:** `assets/personagens/barbas/{curtas,medias,longas,bigodes,especiais}/<id>.glb` (Git LFS) e `<id>.json`, a textura em `texturas/` e a miniatura em `previews/`.
- **No jogo:**
  - O conversor (`tools/importar_criacao.py`) registra cada barba gerada.
  - O encaixe no rosto de referência é pelo perfil do manequim.
  - A criação acrescenta as barbas às opções sozinha. Cada uma é carregada sob demanda e conformada a cada rosto pelo mesmo `BarbaEncaixe`.

**Estado:** a conta do Meshy tem **5 créditos**. A fila completa custa **930** (62 passos: prévia de 20 e refino de 10 por estilo). Nenhuma barba nova foi gerada. Assim que houver créditos:

```
python3 tools/meshy/gerar_barbas.py --confirmar
```

Depois, a separação e a conversão. A validação completa abaixo confere cada uma antes de entrar.

## Testes e validação

- **Validação completa:** `tools/validar_barbas.mjs` gera `docs/BARBAS_VALIDACAO.md` e `docs/barbas_validacao.json`.
  - Cada barba e cada bigode nos 8 rostos, nos dois corpos.
  - Mais 5 formatos extremos (fino, largo, queixo saliente, queixo recuado, boca larga) nos rostos 1, 3, 5 e 7.
- **Teste `barbasEncaixe`** (`js/testes.js`):
  - o rosto não recua nem se deforma sob a barba;
  - a barba muda com o rosto;
  - todas as barbas e bigodes aprovados num rosto que não é o de referência, no corpo feminino e com formatos extremos;
  - comprimento e volume;
  - grisalho, densidade e tonalidade na textura;
  - salvar e carregar;
  - a categoria FIOS;
  - a biblioteca de 31 estilos.

## Limites

- **Rig facial:** os rostos não têm mandíbula nem lábios com ossos. A barba segue a cabeça, e a fala move a cabeça. Mandíbula e lábios exigiriam refazer o rig dos rostos no Blender.
- **Física dos fios longos:** as barbas não têm cadeias de ossos. Os cabelos em mechas do Blender têm (`js/criacao/cabelo_fisica.js`), e é o próximo passo natural para as barbas longas.
- **Comprimento e volume** deformam a malha da barba. O Meshy não gera variantes de comprimento do mesmo modelo.
