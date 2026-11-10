// ECLIPSE ZERO · Renderizador realista da 3ª pessoa (Three.js) — Realista3D
// ---------------------------------------------------------------------------
// O jogo continua o mesmo (lógica, combate, poses, sala, peças): a 3ª pessoa (js/terceira.js)
// enfileira os modelos no R3D como sempre, e aqui a cena é desenhada pelo Three.js (WebGL 2) em vez
// do motor clássico, com luz física: sol com sombras projetadas, luz do céu e do chão, reflexo do
// ambiente, materiais PBR (as texturas de cor, metal/aspereza, normais e emissão de cada modelo),
// névoa, tone mapping ACES e, conforme a qualidade, oclusão ambiente (GTAO), brilho (bloom) e
// antisserrilhado por multiamostragem.
//
// Como os dados chegam: o R3D.poseAll de sempre posa todos os itens e escreve os triângulos já no
// mundo em R3D.data (10 floats por vértice: posição, normal, cor/UV e emissão). Esse mesmo
// Float32Array vira um InterleavedBuffer do Three.js; cada item (e cada trecho dele com ou sem
// textura) é um grupo da geometria com o material do modelo. Nada é copiado em JavaScript.
// O mundo do jogo é espelhado (+Y à direita de quem olha para +X, como a projeção isométrica): a
// cena fica num grupo com escala (1, −1, 1), e a câmera do Three.js é a da 3ª pessoa nesse espaço.
//
// Carrega como módulo (importmap no index.html): só funciona por http (GitHub Pages ou servidor
// local). Abrindo o index.html do disco o módulo não carrega e a 3ª pessoa usa o motor clássico.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Perfis de qualidade (Configurações → Vídeo → Qualidade realista)
const QUAL = [
  { nome: 'Baixo', sombra: 1024, ao: false, bloom: false, escala: 0.7, amostras: 0 },
  { nome: 'Médio', sombra: 2048, ao: false, bloom: true, escala: 1, amostras: 4 },
  { nome: 'Alto', sombra: 2048, ao: true, bloom: true, escala: 1, amostras: 4 },
  { nome: 'Ultra', sombra: 4096, ao: true, bloom: true, escala: 1, amostras: 4 },
  { nome: 'Cinematográfico', sombra: 4096, ao: true, bloom: true, escala: 1.25, amostras: 8 },
];
const DEG = 180 / Math.PI;

// ------------------------------------------------------------ materiais
// Normal nula (vértices degenerados da pele): vira NaN no shader, e o bloom espalharia o NaN pela
// imagem inteira. Todo material do renderizador passa por aqui.
const NORMAL_SEGURA = `#include <beginnormal_vertex>
  if (dot(objectNormal, objectNormal) < 1e-12) objectNormal = vec3(0.0, 0.0, 1.0);`;
function protegerNormais(m, chave) {
  const antes = m.onBeforeCompile;
  m.onBeforeCompile = (sh, rd) => {
    if (antes) antes(sh, rd);
    sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', NORMAL_SEGURA);
  };
  m.customProgramCacheKey = () => chave;
  return m;
}
// Cor por vértice (modelos procedurais) e cor codificada com o tipo de material (as partes sem
// textura dos modelos texturizados: armas, detalhes). Mesma decodificação do shader do R3D.
function materialCor(fantasma) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0, side: THREE.DoubleSide });
  m.userData.emiK = { value: 2.2 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uEmiK = m.userData.emiK;
    sh.vertexShader = 'attribute vec4 aCol;\nvarying vec4 vCol;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vCol = aCol;');
    sh.fragmentShader = 'varying vec4 vCol;\nuniform float uEmiK;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  float rqMat = 0.0; vec3 rqCor = vCol.rgb;
  if (vCol.z < -0.5) { float q = -vCol.z - 1.0; rqMat = floor((q + 0.5) * 0.5); rqCor = vec3(vCol.x, vCol.y, q - 2.0 * rqMat); }
  rqCor = pow(clamp(rqCor, 0.0, 1.0), vec3(2.2));
  diffuseColor.rgb *= rqCor;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  if (rqMat > 0.5) roughnessFactor = rqMat < 1.5 ? 0.3 : rqMat < 2.5 ? 0.5 : rqMat < 3.5 ? 0.88 : rqMat < 4.5 ? 0.42 : 0.62;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
  if (rqMat > 0.5) metalnessFactor = rqMat < 1.5 ? 1.0 : rqMat < 2.5 ? 0.15 : 0.0;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += rqCor * vCol.w * uEmiK;`);
  };
  return protegerNormais(m, 'rq-cor' + (fantasma ? '-f' : ''));
}

// Imagem de uma textura do R3D (canvas pronto ou data URL carregando)
function imagemDe(src) {
  if (!src) return null;
  if (typeof src !== 'string') return src;
  const im = new Image();
  im.src = src;
  return im;
}
const pronta = (im) => im && (im instanceof HTMLCanvasElement || (im.complete && im.naturalWidth > 0));
function pixels(im) {
  const c = document.createElement('canvas');
  c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0);
  return { c, g, d: g.getImageData(0, 0, c.width, c.height) };
}

// ------------------------------------------------------------ o renderizador
const R = {
  ok: false, erro: null, canvas: null, renderer: null, cena: null, raiz: null, camera: null,
  geo: null, malha: null, dados: null, mats: [], porModelo: new WeakMap(), texs: new Map(),
  qualAtual: -1, w: 0, h: 0, ceuCanvas: null, ceuG: null, ceuTex: null,

  iniciar() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });   // preserva: o canvas 2D do jogo copia a imagem depois
      if (!gl) throw new Error('sem WebGL 2');
      // placa de vídeo emulada por software (SwiftShader, llvmpipe): o realista ficaria a segundos por
      // quadro; fica o clássico (dá para forçar: localStorage 'eclipse_zero_realista' = 'forcar')
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      this.gpu = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      let forcar = false;
      try { forcar = localStorage.getItem('eclipse_zero_realista') === 'forcar'; } catch (e) { /* sem armazenamento */ }
      if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(this.gpu) && !forcar) throw new Error(`placa de vídeo por software (${this.gpu})`);
      const rd = new THREE.WebGLRenderer({ canvas: c, context: gl });
      rd.toneMapping = THREE.ACESFilmicToneMapping;
      rd.toneMappingExposure = 1.05;
      rd.outputColorSpace = THREE.SRGBColorSpace;
      rd.shadowMap.enabled = true;
      rd.shadowMap.type = THREE.PCFSoftShadowMap;
      this.canvas = c; this.renderer = rd;
      this.cena = new THREE.Scene();
      this.raiz = new THREE.Group();
      this.raiz.scale.set(1, -1, 1);                      // o mundo do jogo é espelhado
      this.cena.add(this.raiz);
      this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 6, 6000);
      this.camera.up.set(0, 0, 1);
      // luzes: sol com sombra, céu e chão, e o reflexo de ambiente (sala neutra pré-filtrada)
      this.sol = new THREE.DirectionalLight(0xffffff, 2.6);
      this.sol.castShadow = true;
      const sc = this.sol.shadow.camera;
      sc.left = -520; sc.right = 520; sc.top = 520; sc.bottom = -520; sc.near = 10; sc.far = 3000;
      this.sol.shadow.bias = -0.0004;
      this.sol.shadow.normalBias = 1.2;
      this.raiz.add(this.sol, this.sol.target);
      this.hemi = new THREE.HemisphereLight(0xbcd0ff, 0x3a3428, 0.9);
      this.hemi.position.set(0, 0, 1);
      this.raiz.add(this.hemi);
      const pm = new THREE.PMREMGenerator(rd);
      this.cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.cena.environmentIntensity = 0.32;
      pm.dispose();
      this.cena.fog = new THREE.Fog(0x202428, 400, 1400);
      // o céu do bioma e da hora (o mesmo desenho do motor clássico) num canvas pequeno, de fundo
      this.ceuCanvas = document.createElement('canvas');
      this.ceuG = this.ceuCanvas.getContext('2d');
      this.ceuTex = new THREE.CanvasTexture(this.ceuCanvas);
      this.ceuTex.colorSpace = THREE.SRGBColorSpace;
      this.cena.background = this.ceuTex;
      this.matCor = materialCor(false);
      this.fantasmas = new Map();
      this.flashes = [1, 2, 3, 4].map((k) => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 * k, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      // as texturas que o motor clássico manda subir de novo (atlas do personagem repintado)
      if (typeof R3D !== 'undefined' && !R3D._freeTexRealista) {
        const orig = R3D.freeTex.bind(R3D);
        R3D.freeTex = (tex) => { orig(tex); this.texSuja(tex); };
        R3D._freeTexRealista = true;
      }
      c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ok = false; this.erro = 'contexto perdido'; });
      this.ok = true;
    } catch (e) {
      console.warn('Renderizador realista indisponível, usando o clássico:', e);
      this.ok = false; this.erro = String(e && e.message || e);
    }
    return this.ok;
  },

  // Ligado nas configurações, disponível e com o motor 3D ativo
  ativo() {
    if (typeof Settings === 'undefined' || Settings.v.render3d !== 'realista') return false;
    if (!this.ok && !this.erro) this.iniciar();
    return this.ok && typeof R3D !== 'undefined' && R3D.active;
  },
  qualidade() { return QUAL[Math.max(0, Math.min(QUAL.length - 1, typeof Settings !== 'undefined' ? Settings.v.realQual | 0 : 2))]; },

  // Contexto 2D do céu (coordenadas lógicas VIEW_W × VIEW_H, desenhado em resolução menor)
  ceuCtx() {
    const k = Math.min(1, 1280 / VIEW_W), w = Math.round(VIEW_W * k), h = Math.round(VIEW_H * k);
    if (this.ceuCanvas.width !== w || this.ceuCanvas.height !== h) { this.ceuCanvas.width = w; this.ceuCanvas.height = h; this.ceuTex.dispose(); }
    const g = this.ceuG;
    g.setTransform(k, 0, 0, k, 0, 0);
    return g;
  },

  // ------------------------------------------------------------ texturas e materiais por modelo
  texSuja(tex) {
    const T = tex && this.texs.get(tex);
    if (!T) return;
    for (const t of [T.cor, T.nrm]) if (t) t.needsUpdate = true;
    T.mrFeito = false;                                   // refaz o metal/aspereza e a emissão
  },
  textura(im, cor) {
    const t = im instanceof HTMLCanvasElement ? new THREE.CanvasTexture(im) : new THREE.Texture(im);
    t.flipY = false;
    t.colorSpace = cor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    t.needsUpdate = true;
    return t;
  },
  // Material do modelo com textura: cor, normais, metal/aspereza (o mapa do R3D tem R metal,
  // G aspereza, B relevo ou emissão; o do Three.js lê G aspereza e B metal) e a emissão
  materialTex(model) {
    const tex = model.tex;
    let T = this.texs.get(tex);
    if (!T) {
      T = { imCor: imagemDe(tex.canvas || tex.src), imMat: imagemDe(tex.mat), imNrm: imagemDe(tex.nrm), cor: null, nrm: null, mr: null, emi: null, mrFeito: false };
      T.mat = protegerNormais(new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide, emissive: 0x000000 }), 'rq-tex');
      this.texs.set(tex, T);
    }
    const M = T.mat;
    if (tex.versao !== T.versao) { T.versao = tex.versao; this.texSuja(tex); }   // atlas repintado (peças trocadas)
    if (!T.cor && pronta(T.imCor)) { T.cor = this.textura(T.imCor, true); M.map = T.cor; M.needsUpdate = true; }
    if (!T.nrm && T.imNrm && pronta(T.imNrm)) { T.nrm = this.textura(T.imNrm, false); M.normalMap = T.nrm; M.normalScale.set(1, -1); M.needsUpdate = true; }
    if (!T.mrFeito && T.imMat && pronta(T.imMat) && T.cor) {
      try {
        const P = pixels(T.imMat), d = P.d.data;
        let E = null;
        if (tex.emiB && pronta(T.imCor)) {
          const C = pixels(T.imCor);
          if (C.c.width !== P.c.width) { C.g.drawImage(T.imCor, 0, 0, P.c.width, P.c.height); }
          const cd = C.g.getImageData(0, 0, P.c.width, P.c.height).data;
          E = new ImageData(P.c.width, P.c.height);
          for (let i = 0; i < d.length; i += 4) { const k = d[i + 2] / 255; E.data[i] = cd[i] * k; E.data[i + 1] = cd[i + 1] * k; E.data[i + 2] = cd[i + 2] * k; E.data[i + 3] = 255; }
        }
        for (let i = 0; i < d.length; i += 4) { const metal = d[i]; d[i + 2] = metal; d[i] = 255; }
        P.g.putImageData(P.d, 0, 0);
        if (T.mr) T.mr.dispose();
        T.mr = this.textura(P.c, false);
        M.roughnessMap = T.mr; M.metalnessMap = T.mr; M.roughness = 1; M.metalness = 1;
        if (E) {
          const ce = document.createElement('canvas'); ce.width = E.width; ce.height = E.height; ce.getContext('2d').putImageData(E, 0, 0);
          if (T.emi) T.emi.dispose();
          T.emi = this.textura(ce, true);
          M.emissiveMap = T.emi; M.emissive.set(0xffffff); M.emissiveIntensity = 2.5;
        }
        M.needsUpdate = true;
      } catch (e) { /* imagem de outra origem (sem permissão de leitura): fica sem o mapa */ }
      T.mrFeito = true;
    }
    return M;
  },
  indice(mat) {
    let i = this.mats.indexOf(mat);
    if (i < 0) { i = this.mats.length; this.mats.push(mat); }
    return i;
  },
  fantasma(rgb) {
    const k = rgb.join(',');
    let m = this.fantasmas.get(k);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      m.color.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
      this.fantasmas.set(k, m);
    }
    return m;
  },

  // ------------------------------------------------------------ geometria: o buffer do R3D
  buffer() {
    const D = R3D.data;
    if (this.dados !== D) {
      if (this.geo) this.geo.dispose();
      const ib = new THREE.InterleavedBuffer(D, 10);
      ib.setUsage(THREE.DynamicDrawUsage);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.InterleavedBufferAttribute(ib, 3, 0));
      g.setAttribute('normal', new THREE.InterleavedBufferAttribute(ib, 3, 3));
      g.setAttribute('uv', new THREE.InterleavedBufferAttribute(ib, 2, 6));
      g.setAttribute('aCol', new THREE.InterleavedBufferAttribute(ib, 4, 6));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
      g.boundingBox = new THREE.Box3(new THREE.Vector3(-1e7, -1e7, -1e7), new THREE.Vector3(1e7, 1e7, 1e7));
      if (!this.malha) {
        this.malha = new THREE.Mesh(g, this.mats);
        this.malha.frustumCulled = false;
        this.malha.castShadow = true; this.malha.receiveShadow = true;
        this.raiz.add(this.malha);
      } else this.malha.geometry = g;
      this.geo = g; this.ib = ib; this.dados = D;
    }
    return this.ib;
  },

  // ------------------------------------------------------------ o quadro
  // tv: ThirdView (câmera, alvo, luz e névoa); W × H: pixels da tela. Devolve { canvas, w, h } ou null
  render(tv, W, H) {
    const n = R3D.used;
    R3D.used = 0;
    if (!n) return null;
    const vo = R3D.poseAll(n, 4);
    const Q = this.qualidade(), rd = this.renderer;
    const w = Math.max(2, Math.round(W * Q.escala)), h = Math.max(2, Math.round(H * Q.escala));
    if (w !== this.w || h !== this.h || this.qualAtual !== Q) this.montarPos(w, h, Q);
    // geometria e grupos (um por item e por trecho com/sem textura)
    const ib = this.buffer(), D = R3D.data, g = this.geo, sombra = tv._sombra;
    ib.clearUpdateRanges(); ib.addUpdateRange(0, vo); ib.needsUpdate = true;
    g.clearGroups();
    const fl = this.flashes;
    for (let i = 0; i < n; i++) {
      const it = R3D.items[i], m = it.model, o = it.o;
      if (!it.vn) continue;
      it.ok = true;
      if (sombra && m === sombra) continue;                // a sombra de mancha: agora há sombra de verdade
      if (o.ghost || o.holo) { g.addGroup(it.v0, it.vn, this.indice(this.fantasma(o.ghost || [0.5, 0.8, 1]))); continue; }
      if (m.tex) {
        const mt = this.indice(this.materialTex(m)), mc = this.indice(this.matCor);
        // trechos pintados (UV) e com cor codificada (armas e detalhes do modelo): por triângulo
        let ini = it.v0, pint = D[it.v0 * 10 + 8] > -0.5;
        const fim = it.v0 + it.vn;
        for (let v = it.v0 + 3; v < fim; v += 3) {
          const p = D[v * 10 + 8] > -0.5;
          if (p !== pint) { g.addGroup(ini, v - ini, pint ? mt : mc); ini = v; pint = p; }
        }
        g.addGroup(ini, fim - ini, pint ? mt : mc);
      } else g.addGroup(it.v0, it.vn, this.indice(this.matCor));
      if (o.flash > 0.05) g.addGroup(it.v0, it.vn, this.indice(fl[Math.min(3, Math.floor(o.flash * 4))]));
    }
    g.setDrawRange(0, vo / 10);
    this.malha.material = this.mats;
    this.luz(tv);
    // câmera da 3ª pessoa no espaço espelhado
    const E = tv.eye, T = tv.tgt, cam = this.camera;
    cam.position.set(E[0], -E[1], E[2]);
    cam.fov = (tv.fov + tv.fovK * 0.12) * DEG;
    cam.aspect = VIEW_W / VIEW_H;
    cam.lookAt(T[0], -T[1], T[2]);
    cam.updateProjectionMatrix();
    this.ceuTex.needsUpdate = true;
    if (this.composer) this.composer.render(); else rd.render(this.cena, cam);
    this.camada(true);
    return { canvas: this.canvas, w, h };
  },
  // A imagem não é copiada para o canvas 2D do jogo: o canvas do Three.js fica por baixo dele, no
  // retângulo da vista (o jogo deixa esse retângulo transparente na 3ª pessoa realista e desenha
  // por cima os efeitos, o HUD e os menus). Copiar um canvas WebGL 2 para um canvas 2D a cada
  // quadro custa uma cópia inteira e, em alguns navegadores, chega atrasada (quadro vazio).
  camada(mostrar) {
    const c = this.canvas;
    if (!c) return;
    const G = typeof game !== 'undefined' ? game : null;
    if (!c.isConnected && G && G.canvas) {
      c.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:0;display:none';
      G.canvas.style.position = 'relative';
      G.canvas.style.zIndex = '1';
      document.body.appendChild(c);
    }
    if (!mostrar || !G) { if (c.style.display !== 'none') c.style.display = 'none'; return; }
    const r = G.canvas.getBoundingClientRect(), k = r.width / G.canvas.width;
    const css = `${(r.left + G.offX * k).toFixed(1)}|${(r.top + G.offY * k).toFixed(1)}|${(VIEW_W * G.scale * k).toFixed(1)}|${(VIEW_H * G.scale * k).toFixed(1)}`;
    if (css !== this._css) {
      const [x, y, w, h] = css.split('|');
      Object.assign(c.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      this._css = css;
    }
    if (c.style.filter !== G.canvas.style.filter) c.style.filter = G.canvas.style.filter;   // brilho das configurações
    if (c.style.display !== 'block') c.style.display = 'block';
  },
  // Sol, céu e névoa a partir da luz da cena do jogo (Ambiente3P: bioma, hora, clima)
  luz(tv) {
    const L = R3D.light, k = tv.view.key, T = tv.tgt;
    const sol = this.sol, d = 1400;
    sol.color.setRGB(L.key[0], L.key[1], L.key[2], THREE.SRGBColorSpace);
    sol.intensity = 2.8;
    sol.target.position.set(T[0], T[1], 0);
    sol.position.set(T[0] + k[0] * d, T[1] + k[1] * d, Math.max(80, k[2] * d));
    this.hemi.color.setRGB(Math.min(1, L.amb[0] * 1.1), Math.min(1, L.amb[1] * 1.1), Math.min(1, L.amb[2] * 1.1), THREE.SRGBColorSpace);
    const f = tv.view.fog;
    if (f) {
      this.hemi.groundColor.setRGB(f[0] * 0.8, f[1] * 0.8, f[2] * 0.8, THREE.SRGBColorSpace);
      this.cena.fog.color.setRGB(f[0], f[1], f[2], THREE.SRGBColorSpace);
      this.cena.fog.near = f[3]; this.cena.fog.far = f[3] * 3.5;
    }
  },
  montarPos(w, h, Q) {
    const rd = this.renderer;
    rd.setPixelRatio(1);
    rd.setSize(w, h, false);
    if (this.qualAtual !== Q) {
      this.sol.shadow.mapSize.set(Q.sombra, Q.sombra);
      if (this.sol.shadow.map) { this.sol.shadow.map.dispose(); this.sol.shadow.map = null; }
    }
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    const alvo = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: Q.amostras });
    const cp = new EffectComposer(rd, alvo);
    cp.setPixelRatio(1);
    cp.setSize(w, h);
    cp.addPass(new RenderPass(this.cena, this.camera));
    if (Q.ao) {
      const ao = new GTAOPass(this.cena, this.camera, w, h);
      ao.updateGtaoMaterial({ radius: 14, distanceExponent: 1.4, thickness: 6, scale: 1.0, samples: 12 });
      ao.blendIntensity = 0.85;
      cp.addPass(ao);
    }
    if (Q.bloom) cp.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.45, 0.92));
    cp.addPass(new OutputPass());
    this.composer = cp;
    this.w = w; this.h = h; this.qualAtual = Q;
  },
  // Para os testes: quantos triângulos e grupos foram ao último quadro
  info() { const r = this.renderer && this.renderer.info.render; return { ok: this.ok, erro: this.erro, gpu: this.gpu, grupos: this.geo ? this.geo.groups.length : 0, tris: r ? r.triangles : 0, chamadas: r ? r.calls : 0, materiais: this.mats.length }; },
  QUAL,
};

window.Realista3D = R;
window.dispatchEvent(new Event('realista3d'));
