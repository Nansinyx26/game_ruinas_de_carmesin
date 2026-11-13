'use strict';
// ECLIPSE ZERO · Texturas em alta resolução das estruturas GLB (TexHD)
// ---------------------------------------------------------------------------
// As estruturas convertidas trazem as texturas embutidas em 512–1024 px (rodam em qualquer aparelho).
// Com a opção "Texturas" em Alta (2K) ou Máxima (4K), as peças MAIS PERTO da câmera trocam essas
// texturas pelas do GLB original, na resolução de origem (assets/tex_hd/<id>_{cor,mat,nrm}.webp,
// gravadas por tools/texturas_hd.py; a UV é a mesma, a malha não muda). As de longe ficam na versão
// leve: uma textura de 4096 px ocupa ~90 MB de memória de vídeo, e uma zona inteira em 4K não cabe
// em placa nenhuma. O orçamento (MB) é por nível; trocar de zona devolve tudo à versão leve.
// Vale nos dois renderizadores da 3ª pessoa (o clássico e o realista) e precisa do jogo aberto por
// http (do disco, file://, o navegador não deixa o WebGL usar imagens soltas).
// ---------------------------------------------------------------------------
const TexHD = {
  NIVEIS: [{ nome: 'Padrão', lado: 0, mb: 0 }, { nome: 'Alta (2K)', lado: 2048, mb: 700 }, { nome: 'Máxima (4K)', lado: 4096, mb: 1400 }],
  RAIO: 1300,   // só as peças até esta distância da câmera (unidades) sobem de resolução
  ativas: new Map(),   // id → { lado, mb, imgs, tex }
  pedidas: new Set(), _t: 0, _zona: null,
  disponivel() { return typeof ESTRUTURAS_HD !== 'undefined' && typeof location !== 'undefined' && /^https?:/.test(location.protocol); },
  nivel() { const v = typeof Settings !== 'undefined' && Settings.v ? Settings.v.texHD : 0; return this.NIVEIS[v] ? v : 0; },
  custo(lado) { return (lado * lado * 4 * 1.34 * 2 + (lado / 2) * (lado / 2) * 4 * 1.34) / 1048576; },   // cor e normais no lado; material na metade
  // Chamado a cada quadro da 3ª pessoa com a lista das estruturas da zona e o olho da câmera
  atualizar(lugares, olho) {
    const agora = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (agora < this._t) return;
    this._t = agora + 400;   // a cada 0,4 s (pelo relógio, não por quadro)
    const N = this.NIVEIS[this.nivel()], zona = typeof World !== 'undefined' && World.zone ? World.zone.id : null;
    if (zona !== this._zona) { this.soltarTudo(); this._zona = zona; }
    if (!N.lado || !this.disponivel() || !lugares) { if (this.ativas.size) this.soltarTudo(); return; }
    // as peças com versão HD, por distância (a mais perto primeiro), sem repetir o mesmo modelo
    const vistos = new Map();
    for (const L of lugares) {
      const lado = ESTRUTURAS_HD[L.id]; if (!lado) continue;
      const d = Math.hypot(L.x - olho[0], L.y - olho[1]);
      if (d > this.RAIO) continue;
      if (!vistos.has(L.id) || vistos.get(L.id) > d) vistos.set(L.id, d);
    }
    const ordem = [...vistos].sort((a, b) => a[1] - b[1]);
    let gasto = 0; const querem = new Map();
    for (const [id] of ordem) { const lado = Math.min(N.lado, ESTRUTURAS_HD[id]), c = this.custo(lado); if (gasto + c > N.mb) continue; gasto += c; querem.set(id, lado); }
    for (const [id, A] of this.ativas) if (!querem.has(id) || querem.get(id) !== A.lado) this.soltar(id);
    for (const [id, lado] of querem) if (!this.ativas.has(id) && !this.pedidas.has(id)) this.pedir(id, lado);
  },
  modeloTex(id) { const m = typeof game !== 'undefined' && game.model3 ? game.model3('cen_' + id) : null; return m && m.tex; },
  pedir(id, lado) {
    const tex = this.modeloTex(id); if (!tex) return;
    this.pedidas.add(id);
    const base = `assets/tex_hd/${id}_`, ks = ['cor', 'mat', 'nrm'], imgs = {};
    let falta = 3, falhou = false;
    for (const k of ks) {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { if (--falta === 0) this.aplicar(id, lado, tex, imgs, falhou); };
      im.onerror = () => { falhou = true; if (--falta === 0) this.aplicar(id, lado, tex, imgs, true); };
      im.src = base + k + '.webp'; imgs[k] = im;
    }
  },
  // a 2K com fonte 4K: reduz uma vez num canvas (o 4K inteiro não vai para a placa)
  reduzir(im, lado) {
    if (!lado || (im.naturalWidth || im.width) <= lado) return im;
    const c = document.createElement('canvas'); c.width = c.height = lado;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, lado, lado);
    return c;
  },
  aplicar(id, lado, tex, imgs, falhou) {
    this.pedidas.delete(id);
    if (falhou || this.nivel() === 0 || this.modeloTex(id) !== tex) return;
    const cor = this.reduzir(imgs.cor, lado), nrm = this.reduzir(imgs.nrm, lado), mat = this.reduzir(imgs.mat, lado / 2);
    const A = { lado, mb: this.custo(lado), tex, guarda: { img: tex.img, mat: tex.matTex && tex.matTex.img, nrm: tex.nrmTex && tex.nrmTex.img } };
    this.trocar(tex, cor, mat, nrm);
    this.ativas.set(id, A);
  },
  // Troca as imagens do modelo nos dois renderizadores (as texturas de vídeo antigas são liberadas)
  trocar(tex, cor, mat, nrm) {
    if (typeof R3D !== 'undefined' && R3D.freeTex) R3D.freeTex(tex);
    const pega = (alvo, im, chave) => { if (!im) return; if (!tex[chave]) tex[chave] = {}; tex[chave].img = im; tex[chave].canvas = im instanceof HTMLCanvasElement ? im : undefined; };
    tex.img = cor; tex.canvas = cor instanceof HTMLCanvasElement ? cor : undefined;
    pega(tex, mat, 'matTex'); pega(tex, nrm, 'nrmTex');
    const RL = typeof Realista3D !== 'undefined' ? Realista3D : null, T = RL && RL.texs && RL.texs.get(tex);
    if (T) {
      for (const k of ['cor', 'nrm', 'mr', 'emi']) if (T[k]) { T[k].dispose(); T[k] = null; }
      T.imCor = cor; T.imMat = mat || T.imMat; T.imNrm = nrm || T.imNrm; T.mrFeito = false;
      const M = T.mat; if (M) { M.map = null; M.normalMap = null; M.roughnessMap = null; M.metalnessMap = null; M.emissiveMap = null; M.needsUpdate = true; }
    }
    tex.versaoHD = (tex.versaoHD || 0) + 1;
  },
  soltar(id) {
    const A = this.ativas.get(id); if (!A) return;
    this.ativas.delete(id);
    const tex = A.tex, img = new Image(); img.src = tex.src;   // volta para a versão embutida (já decodificada pelo navegador)
    const mat = typeof tex.mat === 'string' ? Object.assign(new Image(), { src: tex.mat }) : A.guarda.mat;
    const nrm = typeof tex.nrm === 'string' ? Object.assign(new Image(), { src: tex.nrm }) : A.guarda.nrm;
    this.trocar(tex, img, mat, nrm);
  },
  soltarTudo() { for (const id of [...this.ativas.keys()]) this.soltar(id); this.pedidas.clear(); },
  estado() { let mb = 0; for (const A of this.ativas.values()) mb += A.mb; return { nivel: this.NIVEIS[this.nivel()].nome, ativas: [...this.ativas].map(([id, A]) => `${id}:${A.lado}`), mb: Math.round(mb), disponivel: this.disponivel() }; },
};
if (typeof window !== 'undefined') window.TexHD = TexHD;
