# Auditoria do motor gráfico — Fase A (só leitura, nada foi alterado)

Pedido: "Evolução do motor gráfico para qualidade AAA no PC — apresentar a auditoria e o plano baseado no
código real antes de qualquer alteração". Levantamento feito no código; caminhos relativos à raiz.

## 1. Arquitetura atual

```
game.loop (game.js:173) ─ Graficos.ini/fim (medidor) ─ update ─ render (game.js:1240)
 ├─ ISO clássica (Canvas 2D): renderWorld (game.js:1454)
 │    prepare3D → R3D.queue … R3D.flush (game.js:1376)
 │      └ R3D (WebGL1, atlas 2048→4096): pose na CPU → empacota → desenha no atlas (cor + emissão)
 │    sala pré-renderizada Room.render (rooms.js:346, ≤ 12 Mpx) + sprites via drawImage(R3D.canvas)
 │    sombras em mancha (game.js:1469-1472) + Lighting em meia resolução (lighting.js)
 ├─ 3ª pessoa / ISO 3D: ThirdView.render (terceira.js:381)
 │    fila: sala, chão, Vizinhos, Natureza3D, Bairro, Estruturas, heróis, inimigos, água, clima
 │    ├ Realista3D.ativo() → Realista3D.render (realista.js:310) [Three r186, WebGL2, canvas por baixo]
 │    └ senão → R3D.renderScene (engine3d.js:1149) + drawImage para o 2D (terceira.js:496-498)
 └─ ThirdPersonMode (thirdperson.js): modo de teste com contexto WebGL1 próprio
```

- Isométrica clássica: o 2D com sprites 3D do R3D (`Settings.v.gfx3d` liga/desliga o R3D).
- 3ª pessoa e isométrica 3D: `Settings.v.camModo` (`iso`/`iso3d`/`3p`), exigem `R3D.active`.
- Realista: `Settings.v.render3d === 'realista'` (padrão), módulo carregado (só por http, importmap em
  jogar.html), WebGL2 e placa não emulada. Vigia de tela preta lê pixels e volta ao clássico (realista.js:368-388).
- Three r186 em `js/vendor/three/` (com addons); **não há** `three.webgpu.js` nem `three.tsl.js`.
- Perfis `QUAL` (Baixo → Extreme PC, realista.js:30-37): sombra 1024–4096, GTAO, bloom, escala 0,7–1,5,
  MSAA ≤ 4. `js/graficos.js`: 4 perfis, detecção do aparelho, benchmark (mediana), medidor F4.

## 2. Shaders

- **R3D (GLSL ES 1.0, engine3d.js):** `R3D_VS` (isométrica), `R3D_VS_P` (perspectiva, água, vento, grama
  empurrada), `R3D_FS_PROF` (profundidade em RGBA), `R3D_SOMBRA_FS` (PCF com disco de Vogel, 2 cascatas, raios de
  sol), `R3D_FS` (cor por vértice e materiais no vértice, água com Fresnel, 4 luzes, névoa), `R3D_FS_TEX` (cor,
  MR, normal por derivadas, emissão, parallax do chão, tint, glow, clima). Variantes por `#define`.
- **Three:** `onBeforeCompile` em `protegerNormais` e `materialCor` (realista.js) e na grama (vegetacao.js);
  `ShaderPass(CINEMA)`; GTAOPass, UnrealBloomPass, OutputPass. `ShaderMaterial`/`RawShaderMaterial` próprios: nenhum.

## 3. Materiais, luz e pós

- Realista: `MeshStandardMaterial` (PBR). O mapa MR do R3D é convertido na CPU pixel a pixel
  (realista.js:239-264). Ambiente: `RoomEnvironment` + PMREM.
- Chão: atlas por sala gerado por código (terreno.js, 2048/1024 px); texturas de bioma 512 px; TexHD troca para
  2K/4K só perto da câmera com orçamento de 700/1400 MB (texturas_hd.js).
- Sol físico (mundo/sol.js). Clássico: 2 cascatas de sombra. Realista: 1 `DirectionalLight` PCFSoft seguindo o
  herói (o addon CSM existe mas não é usado). 2D: manchas de sombra.
- Pós: GTAO, bloom, MSAA HalfFloat, ACES, CINEMA (realista); vinheta e efeitos (2D).

## 4. Personagens

Hierarquia `N3`/`Model3`; **pele na CPU** a cada quadro (`R3D.skin`, linear ou quatérnios duplos); poses
procedurais com IK; criaturas com clipes do Blender a 30 fps; peças modulares presas aos ossos; criação de
personagem com peças GLB com pele no esqueleto do Kael; física Verlet do cabelo; barba conformada por raios.
NPCs de 50–65 mil triângulos com cache de pose.

## 5. Carregamento e memória

Nenhum loader GLB no jogo: 870 GLB (8,9 GB em `assets/`) viram JS base64 pelos scripts de `tools/` (447 MB em
`js/assets`) e entram por `<script>` injetado. GLTFLoader/DRACO/KTX2 estão no projeto mas não são usados.
Streaming: Estruturas (índice + pré-carga da vizinha, fotos LRU 48) e Vizinhos (LRU 26, tempo livre).

## 6. Otimizações que já existem

`o.fixo` (vértices de objetos parados guardados), `o.cache` (pose reaproveitada), LOD por pixels **só na
isométrica**, impostores `R3D.foto`, corte por distância nas filas da 3ª pessoa, grama em setores com LOD e
orçamento de 3 ms (`InstancedMesh` no realista), corte por cascata, escala de resolução, `fpsLimit`, medidor
(FPS, 1% pior, CPU, heap, triângulos e chamadas no realista).

**Não existe:** frustum culling real (realista usa esfera de 1e7 e `frustumCulled=false`), occlusion culling,
resolução dinâmica, tempo de GPU, Workers/OffscreenCanvas, compressão de textura.

## 7. Gargalos

1. **O realista reenvia toda a geometria a cada quadro** (40 B/vértice, `addUpdateRange(0, vo)`): uma árvore de
   28 mil triângulos ≈ 3,4 MB; com as vizinhas, dezenas de MB por quadro. É o maior gargalo.
2. Muitas chamadas (um grupo por item e trecho), a sombra redesenha tudo, GTAO + bloom + MSAA a 150 % no Extreme.
3. Clássico na 3ª pessoa: até 4 passes por item e ~50 uniforms por item, em WebGL1.
4. Pele na CPU de heróis, moradores e criaturas.
5. Canvases grandes e cópias entre eles (DPR 200 %, atlas 4096², sala 12 Mpx, `drawImage` do WebGL para o 2D).
6. `preserveDrawingBuffer: true` sem necessidade.
7. Travadas: conversão MR pixel a pixel e parse de JS base64 grandes.
8. Vazamentos: `R.texs`/`R.mats` nunca podados; geometria clonada da grama não descartada; `ThirdPersonMode`
   abre um contexto WebGL a mais sempre.
9. O realista ainda não tem tint, clima, glow, luzes pontuais, água com ondas, vento e detalhe do chão.

## 8. WebGPU

Quebra com `WebGPURenderer`: todo `onBeforeCompile` (3 materiais + grama → NodeMaterial/TSL), EffectComposer e
passes (→ pós em TSL), contexto WebGL2 passado pronto, `readPixels` do vigia, `WebGLRenderTarget` com
`samples`. Funciona sem mudança: `InstancedMesh`, `MeshStandardMaterial`, PMREM. Falta adicionar
`three.webgpu.js`/`three.tsl.js`. **O R3D (GLSL ES 1.0) deve ficar como fallback WebGL, não ser portado.**

## 9. App de PC

Electron 45; abre a URL publicada; `force_high_performance_gpu`, `ignore-gpu-blocklist`,
`backgroundThrottling: false`. Sem `getGPUInfo`, sem flags de WebGPU/Vulkan.

## 10. Plano por etapas (aguarda autorização)

| Etapa | O que faz | Arquivos | Risco |
|---|---|---|---|
| A. Linha de base | Medidor também no clássico (chamadas, MB enviados), tempo de GPU (`EXT_disjoint_timer_query_webgl2`), cena fixa de benchmark | graficos.js, realista.js, engine3d.js, tools/testes_navegador.mjs | Baixo |
| B. Memória | Podar `texs`/`mats` por zona, `dispose` da grama, `ThirdPersonMode` só quando usado, `preserveDrawingBuffer:false` | realista.js, vegetacao.js, game.js, thirdperson.js | Tela preta em algumas placas |
| C. Geometria estática persistente | Objetos `o.fixo` viram `Mesh` próprias com esfera real (**frustum culling**); só o que se mexe vai no buffer por quadro | realista.js, engine3d.js, estruturas.js, natureza3d.js, bairro.js, vizinhos.js, paisagem.js | Grupos espelhados, sombras |
| D. Instancing e LOD na 3ª pessoa | `InstancedMesh` para peças repetidas, **LOD** por distância, impostores no longe; **occlusion culling** por setor | engine3d.js, realista.js, natureza3d.js, paisagem.js | Vento por instância |
| E. Paridade de materiais | Tint, clima, glow, luzes pontuais, água e vento no realista (já em forma de nós) | realista.js, terceira.js, agua.js, fogo.js | Custo de shader |
| F. Pele na GPU | `SkinnedMesh` com DQS; física do cabelo na CPU | engine3d.js, kael_tex3d.js, hero_tex3d.js, criacao/montagem.js, npc3d.js, criaturas3d.js | Alto |
| G. Texturas | KTX2/Basis (**compressão e streaming**), MR pré-assado em tools/Worker, orçamento de VRAM único | tools/, texturas_hd.js, realista.js | Pipeline de conversão |
| H. Sombras e pós | CSM, SMAA/TAA, **resolução dinâmica**, profundidade de campo, desfoque de movimento | realista.js, graficos.js, settings.js | Custo de GPU |
| I. WebGPU | `three.webgpu.js`, materiais e pós em TSL, opção `render3d:'webgpu'` com fallback | js/realista, js/vendor/three, jogar.html, settings.js | Alto |
| J. Clássico e PC | R3D congelado como fallback (ou WebGL2), `getGPUInfo` no benchmark, flags de GPU no app | engine3d.js, game.js, desktop/main.js | Regressões no celular |

Ordem sugerida: **A → B → C** (maior ganho, menor risco); WebGPU (I) só depois de E e H escritos em nós.
