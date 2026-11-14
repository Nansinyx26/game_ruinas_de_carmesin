# ECLIPSE ZERO — Pedidos: o que já foi feito e o que falta

Memória do projeto (atualizada a cada etapa). Cada item é um pedido feito no chat. **Feito** = está no
jogo, testado e enviado ao GitHub. **Parcial** = parte pronta, o resto listado. **Falta** = ainda não
começado. Ao terminar algo, mova o item e registre o commit.

Última atualização: 14/11/2026.

---

## 1. Já feito (no jogo, testado, enviado)

| Pedido | O que existe | Onde |
|---|---|---|
| Moinho na beira do rio (não jogado no mapa) | Moinho, cais, cachoeira, palmeiras e salgueiros postos na margem real da água, virados para ela | `js/mundo/estruturas.js` (BEIRA), `js/mundo/agua.js` |
| Baús por raridade (5 GLB) | Tampa que abre, 5 raridades com cores, saque por faixa de nível, reaparecimento, janela de recompensas, modo administrador | `js/mundo/baus.js`, `tools/blender/cenario/baus.py` |
| Cidade abandonada com zumbis | Região Cidade Morta (9 zonas) com os prédios e os 6 zumbis dos GLB, 3 missões, 3 secundárias, masmorra do hospital, 2 tesouros, 2 sobreviventes | `js/mundo/cidade_morta.js`, `js/mundo/corpos_inimigos.js` |
| Bardo | Corpo do Bardo.glb, alaúde GLB nas costas e nas mãos (pose de tocar), música inteira uma vez (sem laço), letra real no tempo do áudio com entrada/saída suave, para ao sair da taverna | `js/mundo/rotina.js`, `js/mundo/npc3d.js`, `js/models/kael.js` |
| Guardião do Mundo (GM) — bênçãos | 8 bênçãos (XP 2x–10x, ataque, defesa, velocidade, regeneração, energia, sorte, recuperação), 15 min a 24 h pelo relógio real, evento de XP do mundo com avisos, painel do administrador, barra na HUD com 9 ícones 512×512 próprios, registro | `js/mundo/guardiao.js`, `assets/icons/buffs/` |
| GM — corpo e armas | Corpo GM_parado.glb, fuzil novo (Solar Viper) nas costas, coldre tático GLB na coxa com a pistola dentro, braços soltos | `js/mundo/npc3d.js` |
| Espada do Kael pela ponta | Variante 3D da Tempestade Nula reconvertida com o cabo na mão | `tools/importar_arma.py` |
| Chuva/neve em lugar fechado | Interiores, masmorras, laboratórios e cavernas: sem chuva, neve, vento, areia ou cinza | `js/mundo/clima.js`, `js/mundo/tempo.js` |
| Altar de cristal no lugar da Chama da Aurora | GLB do Altar de Cristal Dourado com fogo, fumaça e brilho do cristal | `js/mundo/cidade.js`, `js/fogo.js` |
| Estações da cidade em GLB (não canvas) | Forja, armaria, laboratório, engenharia, guilda, missões, armazém e as 3 bancas do mercado usam GLB do projeto | `js/mundo/cidade.js` (CIDADE_GLB) |
| Texturas na qualidade máxima | Opção "Texturas": Padrão (1K), Alta (2K), Máxima (4K). 104 estruturas com a textura original do GLB (2048/4096) nas peças mais perto, com orçamento de memória de vídeo | `js/mundo/texturas_hd.js`, `tools/texturas_hd.py`, `assets/tex_hd/` |
| Dublagem dos NPCs (ElevenLabs) — base | Gerador com elenco de vozes por sexo/idade/temperamento, manifesto, tocador no jogo, sem painel para o jogador | `tools/dublagem/`, `js/mundo/vozes.js` |
| Chat global + Game Master | Servidor WebSocket (contas, OWNER/GM/MODERADOR decididos no servidor, 50 comandos, confirmação, desfazer, registro), janela de chat com 5 abas, painel GM com autocompletar e Modo Deus do Mundo; 60 testes do servidor + 13 com dois navegadores | `servidor/`, `js/rede/chat.js`, `tools/teste_chat.mjs` |
| Paisagens procedurais por semente | Biomas por altitude/umidade/temperatura, espécies com regras, Poisson, trilhas por A*, pontos de interesse, validação com correção; mesma semente = mesmo mapa | `js/mundo/paisagem.js` |
| Relevo (altura real do chão) | Colinas, dunas, encostas e picos com altura na geometria; contínuo entre zonas vizinhas; água no baixo; patamar sob construções; todos os corpos, objetos e a câmera seguem o chão | `js/mundo/relevo.js` |
| Árvores novas | `Arvore_1.glb` (28 mil triângulos, na topologia enviada) no lugar da antiga (backup em `assets/_backup/arvores/`) e `Arvore_9.glb` nova, ambas com textura HD; vento a partir do pé da árvore (no relevo, o tronco fica firme) e tremor próprio da folhagem nas pontas | `tools/blender/cenario/estruturas.py`, `js/engine3d.js` |
| Grama 3D, flores e juncos (1ª etapa da vegetação) | Lâminas 3D em tufos por setor de 384 u, com semente; densidade pelos campos da paisagem; flores (tremoço, margarida, papoula, botão-de-ouro); juncos na margem rasa; nada na água, construções, trilhas, passagens e pontos de interação; vento em ondas e o herói abrindo a grama (andar < correr < golpe); LOD por distância e 5 níveis (Baixa → Cinematográfica); InstancedMesh no realista e buffer estático no clássico | `js/mundo/vegetacao.js` |
| Skills de 3D instaladas | three-best-practices, r3f-best-practices, 3d-modeling, blender, modeling, rigging, texturing, animation, asset-optimization, unity, omniverse, vroid + 7 agentes 3D (só neste contêiner) | `~/.claude/skills`, `~/.claude/agents` |
| Sol dinâmico, ciclo de 24 h e sombras | Sol na posição física pela hora (nasce a leste 06:00, ~71° ao meio-dia, se põe a oeste), cor pela atmosfera (branco → dourado → laranja), lua com fases e luar; os 8 horários pedidos no HUD; duração do dia configurável. Luz direcional presa ao mundo (não à câmera) e o disco do sol no mesmo lugar da luz. Mapa de sombras em 2 cascatas no motor clássico (penumbra suave, viés por inclinação, centro preso à grade de texels, vento movendo a sombra das copas), raios de sol no ar (Alta/Ultra), sombra de contato translúcida nos pés; resposta por material (pele, cabelo, tecido, metal, vidro, folhas com contraluz); lugares fechados e o subsolo com luz artificial do teto; opção "Sombras do sol" (Desligadas → Ultra). Realista: a mesma direção, penumbra e força | `js/mundo/sol.js`, `js/engine3d.js`, `js/terceira_ambiente.js`, `js/realista/realista.js` |
| Gibão novo | `Peitoral_leve_level_1.glb` enviado no lugar do antigo, reconvertido nos 4 corpos | `assets/Criar_Personagem/Armaduras_Inicial_Level_1/`, `js/assets/criacao/ini_peitoral.js` |
| Diário de missões redesenhado | Seletor de categorias com contagem, lista com ícone por tipo (secundária, contrato, região, campanha), nível e "rastreada", motivo do bloqueio; ficha com etiquetas, quem pede e onde, objetivos com barra de progresso, recompensas em cartões, histórico e botões no rodapé | `js/mundo/aventuras.js` |
| Habilidade do Guerreiro: erupção de cristais | Golpes no chão do Guerreiro/Drakos: dois anéis, rachaduras de lava em 3 levas, dezenas de cristais 3D facetados rompendo o chão (carga → manifestação → desintegração), brasas, fumaça, clarões e luz vermelha no chão; nas duas câmeras; dano e área iguais | `js/heroes/poderes.js` |
| Cabra e ovelha reais | `cabra_de_verdade.glb` e a ovelha real (assets/Creatures/DomesticAnimals) no lugar das feitas da malha do lobo: retopologia, esqueleto de quadrúpede, 15 animações, texturas assadas; chifres da própria malha; escala de ~0,9 m | `tools/blender/criaturas/meshy.py`, `js/assets/criaturas/cabra.js`, `ovelha.js` |
| Cache do app (erro `aplicarConjuntos`) | O service worker servia scripts antigos misturados com novos; agora o código vem da rede primeiro | `sw.js` |

---

## 2. Parcial (falta terminar)

### 2.1 Dublagem dos NPCs
- [x] Todas as 311 falas gravadas (cumprimentos, respostas e rumores de 84 moradores; 164 com voz masculina e 147 com feminina), em `dublagem/npcs/` e no manifesto `js/assets/vozes_npcs.js`.
- [ ] Com plano pago: trocar as vozes padrão por vozes brasileiras da biblioteca (o elenco já está separado por sexo/idade).
- [ ] Emoções/tags por fala e legendas sincronizadas.

### 2.1b Efeitos sonoros dos ataques e poderes (ElevenLabs)
- [x] Gerador `tools/sfx/gerar_sfx.py` (19 efeitos: cortes, estocada, impactos, crítico, golpe no chão, ERUPÇÃO DE CRISTAIS e a carga dela, raio, esquiva, escudo, explosão, bola de fogo, especial, flecha; variações sorteadas) e o jogo já toca as gravações no lugar do som sintetizado (`js/audio.js`, `js/assets/sfx_gerados.js`).
- [x] **Arquivos gerados**: os 19 efeitos (24 gravações com as variações) estão em `assets/sfx/gerados/` e no manifesto `js/assets/sfx_gerados.js`; todas decodificam no Web Audio do Chromium.
- [ ] `arrow.mp3` saiu quase mudo (pico 0,09; a variação `arrow_2.mp3` tem 0,46): apagar e gerar de novo com `python3 tools/sfx/gerar_sfx.py arrow`.
- [ ] Ouvir os efeitos no jogo e ajustar volume ou descrição dos que não combinarem.

### 2.2 Guardião do Mundo
- [ ] Animações do GM_VARIOS MOVIMENTOS.glb (andar, atirar) no corpo do morador.
- [ ] Efeito visual próprio por bênção no corpo do herói além do anel no chão.

### 2.3 Cidade Morta
- [ ] **Desmembramento** real (malha separada por membro, pedaços com física, IA reagindo, opção nas configurações).
- [ ] Interiores dos prédios abandonados.

### 2.4 Chat e GM
- [ ] **Hospedar o servidor** (`servidor/`) num serviço com Node (o GitHub Pages só serve arquivos) e pôr o endereço em `js/rede/config.js`.
- [ ] Sincronizar a posição dos outros jogadores no mundo (hoje o servidor conhece mapa/nível de cada um, mas o jogo não desenha os outros heróis).

### 2.5 Paisagem / mundo
- [ ] **Mundo contínuo por setores** (sem troca de zona): hoje as zonas são carregadas uma a uma, com a altura já contínua entre elas.
- [ ] Rios gerados seguindo o relevo (hoje os rios e lagos são os desenhados à mão de `js/mundo/agua.js`).
- [ ] Cavernas e entradas subterrâneas no relevo; pontes e rampas automáticas.
- [ ] Inclinação dos pés no chão (IK) — hoje o corpo inclina um pouco, os pés não.

### 2.6 GLB novos do GitHub
- [x] Baús, GM, Bardo, alaúde, prédios e zumbis de `assets/extra`, altar.
- [ ] 12 cabelos de `assets/cabelos`, 4 elmos/armaduras de `assets/Criar_Personagem`.
- [ ] Inimigos e chefes: fantasma, sentinelas de bronze e ferrugem, robô de manutenção, astronauta, feiticeiro, bruxo carmesim, Templário, Paladino de Ferro, Guardião de Ferro, Colosso, Golem, Dragão.
- [ ] Documento `docs/AUDITORIA_GLB.md` e carregador de GLB em tempo de execução.

---

## 3. Falta fazer (pedidos ainda não começados)

1. **Vegetação AAA — resto** (a grama, as flores e os juncos já estão feitos): samambaias, cogumelos, musgo, raízes, galhos caídos, folhas secas, trepadeiras nas ruínas, rochas cobertas de mato; conferir a grama no renderizador realista numa placa de vídeo de verdade (aqui só há emulação por software).
2. **Sol — o que falta**: sombras de cada luz pontual (fogo, neon) no subsolo; cascatas de sombra (CSM) também no renderizador realista (hoje 1 mapa adaptativo); conferir o realista numa placa de vídeo de verdade.
2b. **Estabelecimentos sociais vivos** (pedido de 13/11) — TAVERNA: mesas e cadeiras com reserva de assento, balcão, bartender, cozinha, lareira, prateleiras, palco, quartos; os NPCs escolhem o que fazer (entrar, procurar mesa vazia, sentar, pedir comida ou bebida, conversar, comer, beber, levantar, trocar de mesa, ir embora); a caneca e o prato/tigela são objetos de verdade (na mesa ou na mão, a comida diminui), sem atravessar mão nem mesa. HORÁRIO DO BARDO (20h–23h): o Bardo sobe ao palco, a cidade manda mais gente, a sala enche respeitando cadeiras, espaço, colisão e limite; palmas, dança, gente em pé no balcão e perto do palco; ao acabar, saem aos poucos. PUB CYBERPUNK nas cidades futuristas: neon, hologramas, telas, mesas de metal, balcão tecnológico, vapor; DJ com cabine e animação de mixagem; CYBER NIGHT (22h–03h) com luz pulsando na música; pista de dança com vários estilos e tempos diferentes. ÁUDIO espacial (conversa, copos, talheres, passos, música que diminui ao sair). ROTINA por hora, lugar, lotação, evento e tipo de cidade. JOGADOR: sentar, comprar comida e bebida, rumores, missões exclusivas. OTIMIZAÇÃO: pool de NPCs, LOD, limite de ativos, aparecer/sumir fora da vista.
2c. **Gráficos de nova geração no PC (Desktop)** (pedido de 13/11) — três perfis (Web, Mobile, Desktop); 1440p/4K e escala de renderização; antisserrilhado; iluminação global simulada, raios de sol, oclusão ambiente, sombras de contato, cascatas; personagens PBR (pele, olhos, cabelo, tecido, metal); reflexos (SSR, probes; ray tracing só se houver suporte real — avaliar WebGPU); pós-processamento (HDR, bloom, tone mapping, color grading, profundidade de campo, desfoque de movimento, grão e vinheta opcionais, nitidez); níveis Baixo → Extreme PC com opções independentes; otimização (instancing, LOD, culling, streaming de textura, VRAM, resolução dinâmica); medidor de FPS/CPU/GPU/memória; benchmark e perfil automático na primeira vez; **página web para jogar + opção de baixar e instalar no PC, as duas recebendo as mesmas atualizações**.
2e. **Grandes regiões contínuas (estilo The Witcher 3)** — cada região um território grande sem salas nem portais entre lugares vizinhos (cidade → estrada → floresta → planície → ruína sem carregamento); cidades integradas ao mapa; carregamento só entre regiões e masmorras; Mapa do Mundo; duas câmeras (3ª pessoa e isométrica 3D com rotação e zoom) sobre o mesmo mundo; streaming, LOD, culling; persistência. (Soma-se ao item "mundo contínuo por setores" de 2.5.)
2f. **Lojas** — Chama da Aurora com construções de mais qualidade (modelos, texturas, luz); botões/abas visíveis (Itens, Equipamentos, Pets, Montarias; "PETS & MONTARIAS" com Pets | Montarias); Loja de Aves vendendo ave como MONTARIA (card com nome, modelo 3D, raridade, preço, descrição, velocidade, tipo, nível; botão COMPRAR MONTARIA / SALDO INSUFICIENTE; desconta, salva, confirma); tela MINHAS MONTARIAS (desbloqueadas, bloqueadas, equipar/desequipar, modelo 3D, atributos); realce ao passar o mouse, animação das abas, sons, destaque de novos e de já comprados.
2g. **Habilidades por classe com identidade própria** (o Guerreiro já tem a erupção de cristais; faltam Arqueira, Sacerdote e Arcano, a coreografia de corpo e os combos) (2 imagens de referência) — GUERREIRO vermelho: dois anéis, rachaduras de lava no chão, dezenas de cristais 3D facetados emergindo (carregamento → manifestação → desintegração), brasas, fumaça, luz no chão e no herói; ARQUEIRA roxo: flechas espectrais, rastro, rajada, flecha carregada, chuva de flechas; SACERDOTE azul-claro: halo, feixe de luz, glifos, cura em área, escudo; ARCANO azul: runas, esfera, fractais, portal, prisão. Coreografia de corpo (preparação, carregamento, lançamento da mão/arma, trajetória, impacto, recuperação), combos encadeados, pool de partículas, LOD. Não é o mesmo efeito com outra cor.
3. **Céu realista AAA** — dispersão atmosférica, nuvens volumétricas (cúmulos, cirros, estratos, tempestade), sol com raios, lua com fases, estrelas, Via Láctea, ciclo de 24 h com as horas pedidas, relâmpagos.
4. **Eventos celestes** — auroras, eclipse solar e lunar, chuva de meteoros com crateras e meteoritos por raridade (branco a dourado), cometas, estrelas cadentes, constelações, Céu Carmesim, Chuva de Energia NEXUS, Eclipse do Último Céu; gerenciador central com probabilidade, duração, hora, clima, região, espera e prioridade; ferramentas de teste.
5. **Interiores exploráveis** de todos os prédios (portas, cômodos, andares) sem tela de carregamento.
6. **Móveis e decoração procedurais** por tipo de cômodo e estilo, com semente.
7. **Casas vivas** — moradores com rotina, 4 missões residenciais (morador desaparecido, segredo no porão, suprimentos, cientista exilado), loot por tipo de casa, segredos, segurança/alarme, reputação, eventos, persistência.
8. **Ruínas e masmorras** procedurais (piloto primeiro): salas, chefes com fases, armadilhas, quebra-cabeças, loot, HUD.
9. **Arte real dos itens** — ícones de verdade (relíquias, células, experiência, materiais, consumíveis) na coleta, nas lojas e no inventário, em alta resolução.
10. **Personagens 3D** — encaixe de armaduras por âncoras do esqueleto, dedos (abrir, fechar, segurar arma, apontar, punho), barba e cabelo no crânio, área de teste de personagens (frente/costas/perfil, poses, esqueleto), validação para Lyra, Sera, Drako e Orion. (Meshy: usar `include_fingers` no rig para ganhar ossos dos dedos.)
11. **Gráficos reais no celular**.
12. **Unreal 5.8** — adiado a pedido ("ignorar por enquanto").

---

## 4. Regras que valem sempre
- Usar os GLB do projeto; nada de primitivas, cubos ou canvas no lugar de uma peça que tem GLB.
- Não recriar em Python o que já existe como GLB (Python só para processar fora do jogo).
- Chaves de API nunca no código, no repositório nem no navegador.
- Responder em português; enviar imagens em `capturas_armaduras/`.
- Antes de cada push: rodar `node tools/testes_navegador.mjs` e analisar as falhas.
- Empurrar para o ramo de trabalho e para o `main`.
