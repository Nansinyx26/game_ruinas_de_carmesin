'use strict';
// ECLIPSE ZERO · Motor 3D WebGL próprio (G3, N3, Model3, R3D) e registro MODELS3D
// ---------------------------------------------------------------------------
// MOTOR 3D: renderizador WebGL mínimo para personagens, inimigos e armas
// Modelos low-poly montados por código (hierarquia de nós rígidos), posados a
// cada quadro na CPU e desenhados num atlas; cada entidade vira um "sprite 3D"
// encaixado na pipeline 2D (ordenação por profundidade, escuridão e brilhos).
// Projeção idêntica à do jogo: tela = (x − y, (x + y)/2 − z); a câmera olha
// na direção −(1, 1, 1). Referencial local dos modelos: +X = frente,
// +Y = lado DIREITO do personagem (a projeção do jogo é espelhada), +Z = cima.
// ---------------------------------------------------------------------------
function hex3(c) {
  if (Array.isArray(c)) return c;
  const h = c.charAt(0) === '#' ? c.slice(1) : c;
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Matrizes afins 3x4 (linha a linha): [a b c tx, d e f ty, g h i tz]
const M3 = {
  make() { const m = new Float32Array(12); m[0] = m[5] = m[10] = 1; return m; },
  // Translação · Rz(yaw) · Ry(pitch) · Rx(roll) · Escala
  trs(o, p, r, s) {
    const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
    o[0] = cz * cy * s[0]; o[1] = (cz * sy * sx - sz * cx) * s[1]; o[2] = (cz * sy * cx + sz * sx) * s[2]; o[3] = p[0];
    o[4] = sz * cy * s[0]; o[5] = (sz * sy * sx + cz * cx) * s[1]; o[6] = (sz * sy * cx - cz * sx) * s[2]; o[7] = p[1];
    o[8] = -sy * s[0]; o[9] = cy * sx * s[1]; o[10] = cy * cx * s[2]; o[11] = p[2];
    return o;
  },
  mul(o, a, b) {
    const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7], a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11];
    const b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11];
    o[0] = a0 * b0 + a1 * b4 + a2 * b8; o[1] = a0 * b1 + a1 * b5 + a2 * b9; o[2] = a0 * b2 + a1 * b6 + a2 * b10; o[3] = a0 * b3 + a1 * b7 + a2 * b11 + a3;
    o[4] = a4 * b0 + a5 * b4 + a6 * b8; o[5] = a4 * b1 + a5 * b5 + a6 * b9; o[6] = a4 * b2 + a5 * b6 + a6 * b10; o[7] = a4 * b3 + a5 * b7 + a6 * b11 + a7;
    o[8] = a8 * b0 + a9 * b4 + a10 * b8; o[9] = a8 * b1 + a9 * b5 + a10 * b9; o[10] = a8 * b2 + a9 * b6 + a10 * b10; o[11] = a8 * b3 + a9 * b7 + a10 * b11 + a11;
    return o;
  },
};

// Construtor de geometria: triângulos com posição, normal (facetada), cor e emissão.
// Todas as formas aceitam cor ('#rrggbb' ou [r,g,b]) e emissão e (0 = fosco,
// 1 = brilha com a própria cor). g.at(...) define um deslocamento/rotação
// aplicado às próximas formas (g.at() sem argumentos zera).
class G3 {
  constructor() { this.d = []; this.m = null; }
  at(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    this.m = (x || y || z || rx || ry || rz || sx !== 1 || sy !== 1 || sz !== 1) ? M3.trs(M3.make(), [x, y, z], [rx, ry, rz], [sx, sy, sz]) : null;
    return this;
  }
  _p(v) {
    const m = this.m;
    if (!m) return v;
    return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3], m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7], m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11]];
  }
  tri(a, b, c, col, e = 0) {
    a = this._p(a); b = this._p(b); c = this._p(c);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const k = hex3(col), d = this.d;
    for (const p of [a, b, c]) d.push(p[0], p[1], p[2], nx, ny, nz, k[0], k[1], k[2], e);
    return this;
  }
  quad(a, b, c, d, col, e = 0) { this.tri(a, b, c, col, e); return this.tri(a, c, d, col, e); }
  // Polígono convexo (lista de pontos 3D em ordem)
  poly(pts, col, e = 0) { for (let i = 1; i < pts.length - 1; i++) this.tri(pts[0], pts[i], pts[i + 1], col, e); return this; }
  // Caixa centrada em (x, y, z) com dimensões (sx, sy, sz).
  // o.taper: escala do topo (+Z) em X/Y; o.taperX / o.taperY separados; o.shift: [dx, dy] do topo
  box(x, y, z, sx, sy, sz, col, e = 0, o = {}) {
    const tx = o.taperX !== undefined ? o.taperX : (o.taper !== undefined ? o.taper : 1);
    const ty = o.taperY !== undefined ? o.taperY : (o.taper !== undefined ? o.taper : 1);
    const sh = o.shift || [0, 0];
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const b = [[x - hx, y - hy, z - hz], [x + hx, y - hy, z - hz], [x + hx, y + hy, z - hz], [x - hx, y + hy, z - hz]];
    const t = [[x - hx * tx + sh[0], y - hy * ty + sh[1], z + hz], [x + hx * tx + sh[0], y - hy * ty + sh[1], z + hz],
      [x + hx * tx + sh[0], y + hy * ty + sh[1], z + hz], [x - hx * tx + sh[0], y + hy * ty + sh[1], z + hz]];
    this.quad(b[0], b[3], b[2], b[1], col, e);   // base
    this.quad(t[0], t[1], t[2], t[3], o.top || col, o.topE !== undefined ? o.topE : e);   // topo
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; this.quad(b[i], b[j], t[j], t[i], col, e); }
    return this;
  }
  // Cilindro/cone: base centrada em (x, y, z), altura h ao longo do eixo (o.axis 'z' | 'x' | 'y'),
  // raios r0 (base) e r1 (topo), seg lados. o.caps=false remove as tampas
  cyl(x, y, z, r0, r1, h, seg, col, e = 0, o = {}) {
    const ax = o.axis || 'z';
    const P = (r, a, hh) => {
      const c = Math.cos(a) * r, s = Math.sin(a) * r;
      if (ax === 'z') return [x + c, y + s, z + hh];
      if (ax === 'x') return [x + hh, y + c, z + s];
      return [x + c, y + hh, z + s];
    };
    const ring0 = [], ring1 = [];
    for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2 + (o.rot || 0); ring0.push(P(r0, a, 0)); ring1.push(P(r1, a, h)); }
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      if (r1 > 0.001) this.quad(ring0[i], ring0[j], ring1[j], ring1[i], col, e);
      else this.tri(ring0[i], ring0[j], ring1[i], col, e);
    }
    if (o.caps !== false) {
      if (r0 > 0.001) this.poly(ring0.slice().reverse(), o.capCol || col, e);
      if (r1 > 0.001) this.poly(ring1, o.capCol || col, o.capE !== undefined ? o.capE : e);
    }
    return this;
  }
  // Esfera/elipsoide facetada
  sphere(x, y, z, rx, ry, rz, seg, rings, col, e = 0) {
    const P = (i, j) => {
      const th = (j / rings) * Math.PI, ph = (i / seg) * Math.PI * 2;
      return [x + Math.sin(th) * Math.cos(ph) * rx, y + Math.sin(th) * Math.sin(ph) * ry, z + Math.cos(th) * rz];
    };
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < seg; i++) {
        const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
        if (j === 0) this.tri(a, c, d, col, e);
        else if (j === rings - 1) this.tri(a, b, c, col, e);
        else this.quad(a, b, c, d, col, e);
      }
    }
    return this;
  }
  // Prisma: polígono 2D (u, v) num plano, extrudado com espessura t (simétrica).
  // plane 'xz' (u = x, v = z, espessura em y), 'yz' (u = y, v = z, espessura em x), 'xy' (espessura em z)
  extrude(pts, t, col, e = 0, o = {}) {
    const pl = o.plane || 'xz', h = t / 2;
    const M = (u, v, w) => (pl === 'xz' ? [u, w, v] : pl === 'yz' ? [w, u, v] : [u, v, w]);
    const n = pts.length;
    const A = pts.map((p) => M(p[0], p[1], -h)), B = pts.map((p) => M(p[0], p[1], h));
    const fan = (arr, c, ee) => { for (let i = 1; i < n - 1; i++) this.tri(arr[0], arr[i], arr[i + 1], c, ee); };
    fan(A, o.faceCol || col, o.faceE !== undefined ? o.faceE : e);
    fan(B, o.faceCol || col, o.faceE !== undefined ? o.faceE : e);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.quad(A[i], A[j], B[j], B[i], o.edgeCol || col, o.edgeE !== undefined ? o.edgeE : e); }
    return this;
  }
  // Tubo ao longo de uma polilinha (para cabos, veias e braços finos)
  tube(pts, r, seg, col, e = 0) {
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1;
      const ux = dx / L, uy = dy / L, uz = dz / L;
      // Base ortonormal perpendicular ao segmento
      let px = -uy, py = ux, pz = 0;
      if (Math.abs(uz) > 0.9) { px = 1; py = 0; pz = 0; }
      let pl = Math.hypot(px, py, pz); px /= pl; py /= pl; pz /= pl;
      const qx = uy * pz - uz * py, qy = uz * px - ux * pz, qz = ux * py - uy * px;
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const o0 = [Math.cos(a0) * px + Math.sin(a0) * qx, Math.cos(a0) * py + Math.sin(a0) * qy, Math.cos(a0) * pz + Math.sin(a0) * qz];
        const o1 = [Math.cos(a1) * px + Math.sin(a1) * qx, Math.cos(a1) * py + Math.sin(a1) * qy, Math.cos(a1) * pz + Math.sin(a1) * qz];
        this.quad([a[0] + o0[0] * r, a[1] + o0[1] * r, a[2] + o0[2] * r], [a[0] + o1[0] * r, a[1] + o1[1] * r, a[2] + o1[2] * r],
          [b[0] + o1[0] * r, b[1] + o1[1] * r, b[2] + o1[2] * r], [b[0] + o0[0] * r, b[1] + o0[1] * r, b[2] + o0[2] * r], col, e);
      }
    }
    return this;
  }
  get count() { return this.d.length / 10; }
}

// Nó da hierarquia: p = posição (relativa ao pai), r = [roll X, pitch Y, yaw Z], s = escala.
// emi multiplica a emissão da sua geometria (e dos filhos); vis = false esconde a subárvore
class N3 {
  constructor(name, geo = null) {
    this.name = name; this.geo = geo ? new Float32Array(geo.d) : null;
    this.kids = []; this.p = [0, 0, 0]; this.r = [0, 0, 0]; this.s = [1, 1, 1];
    this.emi = 1; this.vis = true; this.w = M3.make(); this.l = M3.make();
  }
  add(n) { this.kids.push(n); return n; }
}

// skins: malhas com pele (skinning): cada vértice segue até 4 ossos (nós) com pesos; ver R3D.skin()
class Model3 {
  constructor(root) {
    this.root = root; this.nodes = {}; this.anchors = {}; this.skins = null;
    const walk = (n) => { this.nodes[n.name] = n; n.kids.forEach(walk); };
    walk(root);
    this.rest = {};
    for (const k in this.nodes) { const n = this.nodes[k]; this.rest[k] = { p: n.p.slice(), r: n.r.slice(), s: n.s.slice() }; }
  }
  // Ponto de referência (para brilhos e efeitos): posição local num nó
  anchor(name, node, p) { this.anchors[name] = { node: this.nodes[node], p }; return this; }
  // Volta todos os nós à pose de repouso (chamar no início de cada pose)
  reset() {
    for (const k in this.rest) {
      const n = this.nodes[k], r = this.rest[k];
      n.p[0] = r.p[0]; n.p[1] = r.p[1]; n.p[2] = r.p[2];
      n.r[0] = r.r[0]; n.r[1] = r.r[1]; n.r[2] = r.r[2];
      n.s[0] = r.s[0]; n.s[1] = r.s[1]; n.s[2] = r.s[2];
      n.emi = 1; n.vis = true;
    }
  }
}

const R3D_VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec4 aCol;
uniform vec4 uRect; uniform float uDepth;
varying vec3 vNor; varying vec4 vCol; varying vec3 vPos;
void main() {
  float sx = aPos.x - aPos.y, sy = (aPos.x + aPos.y) * 0.5 - aPos.z;
  gl_Position = vec4((sx - uRect.x) / uRect.z * 2.0 - 1.0, 1.0 - (sy - uRect.y) / uRect.w * 2.0, -(aPos.x + aPos.y + aPos.z) * uDepth, 1.0);
  vNor = aNor; vCol = aCol; vPos = aPos;
}`;
// Perspectiva (câmera em terceira pessoa, js/terceira.js): posições já no mundo, matriz da câmera
const R3D_VS_P = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec4 aCol;
uniform mat4 uMVP;
varying vec3 vNor; varying vec4 vCol; varying vec3 vPos;
void main() {
  gl_Position = uMVP * vec4(aPos, 1.0);
  vNor = aNor; vCol = aCol; vPos = aPos;
}`;
const R3D_FS = `
precision mediump float;
varying vec3 vNor; varying vec4 vCol; varying vec3 vPos;
uniform float uPass; uniform float uFlash; uniform vec4 uGhost; uniform float uEmi;
uniform vec3 uAmb; uniform vec3 uKeyDir; uniform vec3 uKeyCol; uniform vec3 uRimDir; uniform vec3 uRimCol; uniform float uHolo;
uniform vec3 uView; uniform float uPersp; uniform vec4 uFog; uniform vec4 uVar;
// névoa da câmera em perspectiva (cor do tema; uFog.w = distância onde começa)
float fogK() {
  if (uPersp < 0.5) return 0.0;
  return clamp((length(uView - vPos) - uFog.w) / (uFog.w * 2.5), 0.0, 0.96);
}
void main() {
  vec3 V = uPersp > 0.5 ? normalize(uView - vPos) : vec3(0.57735);
  vec3 n = normalize(vNor);
  if (dot(n, V) < 0.0) n = -n;
  vec3 col = vCol.rgb; float e = vCol.a;
  if (uVar.w > 0.0 && e < 0.05) {
    // variantes dos inimigos do mundo aberto (uVar = cor, intensidade): recolore a carcaça
    // (o que é pouco saturado e não brilha), clareando junto quando a cor pedida é clara
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float sat = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
    float tk = uVar.w * (1.0 - smoothstep(0.12, 0.3, sat));
    float tl = max(dot(uVar.rgb, vec3(0.299, 0.587, 0.114)), 0.25);
    col = mix(col, clamp(uVar.rgb * (0.35 + 1.3 * lum / tl), 0.0, 1.0), tk);
  }
  float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 2.0);
  if (uHolo > 0.5) {
    // Holograma: só existe na passada emissiva (somado à cena)
    if (uPass < 0.5) discard;
    gl_FragColor = vec4(col * (0.25 + 0.9 * fres + e) * uEmi, 1.0);
    return;
  }
  if (uGhost.a > 0.5) {
    if (uPass < 0.5) { gl_FragColor = vec4(uGhost.rgb * (0.35 + 0.9 * fres), 1.0); } else { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); }
    return;
  }
  if (uPass > 0.5) { gl_FragColor = vec4(col * e * uEmi * (1.0 - fogK()), 1.0); return; }
  float key = max(dot(n, uKeyDir), 0.0);
  float wrap = max(dot(n, uKeyDir) * 0.5 + 0.5, 0.0);
  float rim = max(dot(n, uRimDir), 0.0);
  float up = n.z * 0.5 + 0.5;
  vec3 lit = col * (uAmb * (0.55 + 0.45 * up) + uKeyCol * (key * 0.85 + wrap * 0.2)) + uRimCol * (rim * 0.55 + fres * 0.35);
  lit += col * e * uEmi;
  lit = mix(lit, vec3(1.0), uFlash);
  lit = mix(lit, uFog.rgb, fogK());
  gl_FragColor = vec4(lit, 1.0);
}`;

// Variante com textura (modelo com model.tex): nos vértices pintados, vCol = (u, v, sombra ≥ 0, emissão);
// nos vértices de cor (espada, marca, peças de detalhe), vCol = (r, g, −1 − b − 2·material, emissão).
// A arte já vem com luz e sombra pintadas: a luz da cena só modula, e as partes azuis saturadas
// da arte brilham na passada emissiva.
// Materiais (vértices de cor): 0 fosco (o de sempre), 1 metal, 2 couro/placa, 3 tecido, 4 cabelo, 5 pele.
// Mapa de material (model.tex.mat, opcional) para os vértices pintados: R = metal, G = aspereza,
// B = relevo (0,5 = plano). Com ele, brilho especular e relevo (bump pelas derivadas de tela,
// sem tangentes: OES_standard_derivatives; sem a extensão, só o especular). model.tex.nrm:
// mapa de normais no espaço tangente (x ao longo de u, y = −v), também pelas derivadas de tela.
// model.tex.pbr: a textura é cor pura (modelo importado), não arte com luz pintada.
const R3D_FS_TEX = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vNor; varying vec4 vCol; varying vec3 vPos;
uniform sampler2D uTex; uniform sampler2D uMat; uniform float uMatOn; uniform float uBump;
uniform sampler2D uNrm; uniform float uNrmOn; uniform float uPbr;
uniform float uPass; uniform float uFlash; uniform vec4 uGhost; uniform float uEmi;
uniform vec3 uAmb; uniform vec3 uKeyDir; uniform vec3 uKeyCol; uniform vec3 uRimDir; uniform vec3 uRimCol; uniform float uHolo;
uniform vec4 uGlow; uniform vec4 uTint;
uniform vec3 uView; uniform float uPersp; uniform vec4 uFog;
// névoa da câmera em perspectiva (cor do tema; uFog.w = distância onde começa)
float fogK() {
  if (uPersp < 0.5) return 0.0;
  return clamp((length(uView - vPos) - uFog.w) / (uFog.w * 2.5), 0.0, 0.96);
}
void main() {
  vec3 V = uPersp > 0.5 ? normalize(uView - vPos) : vec3(0.57735);
  vec3 n = normalize(vNor);
  if (dot(n, V) < 0.0) n = -n;
  float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 2.0);
  bool painted = vCol.z > -0.5;
  vec3 col; float e;
  float mat = 0.0, metal = 0.0, rough = 1.0, specK = 0.0;
  if (painted) {
    col = texture2D(uTex, vCol.xy).rgb;
    if (uGlow.w > 0.0) {
      // brilho na cor-tema do personagem: só o que é vivo, claro e da mesma matiz (as linhas de neon)
      vec3 c0 = col - vec3(dot(col, vec3(0.3333)));
      vec3 g0 = uGlow.xyz - vec3(dot(uGlow.xyz, vec3(0.3333)));
      float cl = length(c0);
      float sim = cl > 0.02 ? dot(c0 / cl, normalize(g0)) : 0.0;
      float mx = max(col.r, max(col.g, col.b));
      e = smoothstep(0.82, 0.97, sim) * smoothstep(0.12, 0.28, cl) * smoothstep(0.4, 0.75, mx) * vCol.w * uGlow.w;
    } else {
      float b = col.b - max(col.r, col.g);
      e = smoothstep(0.08, 0.26, b) * smoothstep(0.28, 0.55, col.b) * vCol.w * 1.8;
    }
    if (uTint.w > 0.0) {
      // armadura equipada (uTint = cor, intensidade): recolore o que é escuro e pouco saturado
      // (placas, tecido, couro) mantendo a luminância; pele, cabelo colorido e neon ficam como estão
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      float sat = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
      float tk = uTint.w * (1.0 - smoothstep(0.08, 0.22, sat)) * (1.0 - smoothstep(0.55, 0.85, lum));
      float tl = max(dot(uTint.rgb, vec3(0.299, 0.587, 0.114)), 0.06);
      col = mix(col, clamp(uTint.rgb * (lum / tl) * 1.15, 0.0, 1.0), tk);
    }
    if (uMatOn > 0.5) {
      vec3 mm = texture2D(uMat, vCol.xy).rgb;
      metal = mm.r; rough = mm.g; specK = uPbr > 0.5 ? 1.0 : 0.6;   // arte com reflexos pintados: especular discreto
#ifdef BUMP
      vec2 uv = vCol.xy, du = dFdx(uv), dv = dFdy(uv);
      float h0 = mm.b;
      float hx = texture2D(uMat, uv + du).b - h0, hy = texture2D(uMat, uv + dv).b - h0;
      vec3 px = dFdx(vPos), py = dFdy(vPos);
      vec3 r1 = cross(py, n), r2 = cross(n, px);
      float det = dot(px, r1);
      vec3 grad = sign(det) * (hx * r1 + hy * r2);
      n = normalize(abs(det) * n - uBump * grad);
#endif
    }
#ifdef BUMP
    if (uNrmOn > 0.5) {
      // mapa de normais no espaço tangente, com o referencial montado pelas derivadas de tela
      // (sem atributo de tangente): x ao longo de u, y para cima na imagem (−v), z na normal
      vec2 uv = vCol.xy;
      vec3 tn = texture2D(uNrm, uv).xyz * 2.0 - 1.0;
      vec3 dp1 = dFdx(vPos), dp2 = dFdy(vPos);
      vec2 duv1 = dFdx(uv), duv2 = dFdy(uv);
      vec3 dp2perp = cross(dp2, n), dp1perp = cross(n, dp1);
      vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
      vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
      float lt = length(T), lb = length(B);
      if (lt > 1e-10 && lb > 1e-10) n = normalize(T / lt * tn.x - B / lb * tn.y + n * tn.z);
    }
#endif
  } else {
    float q = -vCol.z - 1.0;
    mat = floor((q + 0.5) * 0.5);
    col = vec3(vCol.x, vCol.y, q - 2.0 * mat); e = vCol.w;
    if (mat > 0.5) {
      specK = 1.0;
      if (mat < 1.5) { metal = 1.0; rough = 0.3; }
      else if (mat < 2.5) { metal = 0.15; rough = 0.5; }
      else if (mat < 3.5) { rough = 0.88; }
      else if (mat < 4.5) { rough = 0.42; }
      else { rough = 0.62; }
    }
  }
  if (uHolo > 0.5) {
    if (uPass < 0.5) discard;
    gl_FragColor = vec4(col * (0.25 + 0.9 * fres + e) * uEmi, 1.0);
    return;
  }
  if (uGhost.a > 0.5) {
    if (uPass < 0.5) { gl_FragColor = vec4(uGhost.rgb * (0.35 + 0.9 * fres), 1.0); } else { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); }
    return;
  }
  if (uPass > 0.5) { gl_FragColor = vec4(col * e * uEmi * (1.0 - fogK()), 1.0); return; }
  float key = max(dot(n, uKeyDir), 0.0);
  float wrap = max(dot(n, uKeyDir) * 0.5 + 0.5, 0.0);
  float rim = max(dot(n, uRimDir), 0.0);
  float up = n.z * 0.5 + 0.5;
  vec3 light = uAmb * (0.55 + 0.45 * up) + uKeyCol * (key * 0.85 + wrap * 0.2);
  // pintado: a arte já tem luz; peças de detalhe (material > 0): luz da cena com contraluz discreta;
  // cores do modelo procedural (material 0, a espada): o contraluz forte de sempre
  vec3 lit = painted ? (uPbr > 0.5 ? col * (0.1 + 1.0 * light) * (1.0 - 0.4 * metal) + uRimCol * (rim * 0.08 + fres * 0.05)
                                   : col * (0.55 + 0.75 * light) + uRimCol * (rim * 0.16 + fres * 0.1))
           : mat > 0.5 ? col * light * (1.0 - 0.5 * metal) + uRimCol * (rim * 0.12 + fres * 0.08)
                       : col * light + uRimCol * (rim * 0.55 + fres * 0.35);
  if (specK > 0.0) {
    // especular (Blinn-Phong normalizado): metal reflete na própria cor; o resto, em branco fraco
    vec3 H = normalize(uKeyDir + V);
    float shin = mix(96.0, 6.0, rough);
    float sp = pow(max(dot(n, H), 0.0), shin) * (shin + 2.0) * 0.045 * key;
    vec3 sc = mix(vec3(0.05), col * 1.6 + 0.12, metal);
    if (mat > 3.5 && mat < 4.5) sc = vec3(0.07, 0.09, 0.14);         // cabelo: reflexo azulado
    lit += (uKeyCol * sc * sp + uRimCol * metal * fres * 0.25) * specK;
  }
  lit += col * e * uEmi;
  lit = mix(lit, vec3(1.0), uFlash);
  lit = mix(lit, uFog.rgb, fogK());
  gl_FragColor = vec4(lit, 1.0);
}`;

const R3D = {
  ok: false, enabled: true, W: 2048, H: 2048, lodForce: 0,
  canvas: null, gl: null, prog: null, buf: null, data: new Float32Array(1 << 18),
  items: [], used: 0, scale: 1,
  light: { amb: [0.42, 0.46, 0.58], key: [1.0, 0.97, 0.92], rim: [0.35, 0.6, 1.0] },
  _m: M3.make(),

  init() {
    try {
      const c = document.createElement('canvas');
      c.width = this.W; c.height = this.H;
      const gl = c.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
      if (!gl) return false;
      const sh = (type, src) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const link = (fs, vs = R3D_VS) => {
        const p = gl.createProgram();
        // relevo do mapa de material: precisa das derivadas de tela (WebGL 1: extensão)
        if (fs === R3D_FS_TEX) fs = (gl.getExtension('OES_standard_derivatives') ? '#extension GL_OES_standard_derivatives : enable\n#define BUMP 1\n' : '') + fs;
        gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        const loc = {};
        for (const a of ['aPos', 'aNor', 'aCol']) loc[a] = gl.getAttribLocation(p, a);
        for (const u of ['uRect', 'uDepth', 'uPass', 'uFlash', 'uGhost', 'uEmi', 'uAmb', 'uKeyDir', 'uKeyCol', 'uRimDir', 'uRimCol', 'uHolo', 'uTex', 'uGlow', 'uTint', 'uVar', 'uMat', 'uMatOn', 'uBump', 'uNrm', 'uNrmOn', 'uPbr', 'uMVP', 'uView', 'uPersp', 'uFog']) loc[u] = gl.getUniformLocation(p, u);
        return { p, loc };
      };
      const P0 = link(R3D_FS);
      this.canvas = c; this.gl = gl; this.prog = P0.p; this.loc = P0.loc;
      this.progs = [P0];
      // Programa com textura: se falhar, os modelos texturizados não são desenhados (o resto segue igual)
      try { this.progs.push(link(R3D_FS_TEX)); } catch (e) { console.warn('Textura 3D indisponível:', e); }
      // os mesmos materiais com a câmera em perspectiva (terceira pessoa)
      try { this.progsP = [link(R3D_FS, R3D_VS_P)]; this.progsP.push(link(R3D_FS_TEX, R3D_VS_P)); } catch (e) { console.warn('Perspectiva 3D indisponível:', e); }
      this.buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
      // Textura provisória (1×1 escura) enquanto a imagem de um modelo carrega
      this.blankTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.blankTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([16, 16, 22]));
      // Direções de luz no mundo: chave vindo de cima/esquerda da câmera, contraluz atrás à direita
      const V = [0.57735, 0.57735, 0.57735], left = [-0.7071, 0.7071, 0], up = [-0.4082, -0.4082, 0.8165];
      const comb = (a, b, c, ka, kb, kc) => { const v = [a[0] * ka + b[0] * kb + c[0] * kc, a[1] * ka + b[1] * kb + c[1] * kc, a[2] * ka + b[2] * kb + c[2] * kc]; const l = Math.hypot(v[0], v[1], v[2]); return v.map((q) => q / l); };
      this.keyDir = comb(V, left, up, 0.55, 0.45, 0.75);
      this.rimDir = comb(V, left, up, -0.8, -0.45, 0.4);
      this.ok = true;
    } catch (e) {
      console.warn('Motor 3D indisponível, usando gráficos 2D:', e);
      this.ok = false;
    }
    return this.ok;
  },

  get active() { return this.ok && this.enabled; },

  // Enfileira um modelo para este quadro. pose(model, arg) posiciona os nós.
  // o: { yaw, roll, pitch, scale, flash, ghost: 'r,g,b' | null, emi, holo, lift, m: matriz da raiz (opcional),
  //      tint: [r, g, b, intensidade] da armadura equipada (modelos com textura) }
  queue(model, pose, arg, o = {}) {
    let it = this.items[this.used];
    if (!it) it = this.items[this.used] = { model: null, pose: null, arg: null, o: null, ok: false, cx: 0, cy: 0, cw: 0, ch: 0, minX: 0, minY: 0, w: 0, h: 0, v0: 0, vn: 0, anchors: {} };
    this.used++;
    it.model = model; it.pose = pose; it.arg = arg; it.o = o; it.ok = false;
    return it;
  },

  // Posa, transforma e desenha todos os modelos enfileirados no atlas
  flush(scale) {
    const n = this.used;
    this.used = 0;
    if (!this.active || !n) return;
    const vo = this.poseAll(n, scale);
    this.pack(n, scale);
    this.drawAtlas(n, vo);
  },
  // 1) Pose + transformação na CPU, calculando a caixa de cada sprite na tela; devolve o fim dos dados
  poseAll(n, scale) {
    let vo = 0;
    for (let i = 0; i < n; i++) {
      const it = this.items[i], m = it.model, o = it.o;
      m.reset();
      // Um erro numa pose nunca deve derrubar o quadro: o modelo fica na pose de repouso
      if (it.pose) { try { it.pose(m, it.arg, o); } catch (err) { if (!m.err) { m.err = true; console.error(err); } } }
      // o.m: matriz da raiz pronta (3×4), usada pelo inspetor 3D para as vistas ortográficas
      let root = this._m;
      if (o.m) root = o.m;
      else { const sc = o.scale || 1; M3.trs(root, [0, 0, o.lift || 0], [o.roll || 0, o.pitch || 0, o.yaw || 0], [sc, sc, sc]); }
      it.v0 = vo / 10;
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      // Nível de detalhe: peças com lod > pixels por unidade deste modelo ficam de fora (lodForce: 1 tudo, 2 só o básico)
      const det = this.lodForce === 1 ? 1e9 : this.lodForce === 2 ? 0 : scale * (o.scale || 1);
      const stack = [[m.root, root, 1]];
      while (stack.length) {
        const [nd, parent, pe] = stack.pop();
        if (!nd.vis) continue;
        M3.trs(nd.l, nd.p, nd.r, nd.s);
        M3.mul(nd.w, parent, nd.l);
        const em = pe * nd.emi;
        nd.em = em;
        const g = nd.lod && nd.lod > det ? null : nd.geo;
        if (g) {
          const w = nd.w, cnt = g.length;
          if (vo + cnt > this.data.length) { const nd2 = new Float32Array(Math.max(this.data.length * 2, vo + cnt + 1024)); nd2.set(this.data.subarray(0, vo)); this.data = nd2; }
          const D = this.data;
          for (let k = 0; k < cnt; k += 10) {
            const x = g[k], y = g[k + 1], z = g[k + 2], nx = g[k + 3], ny = g[k + 4], nz = g[k + 5];
            const X = w[0] * x + w[1] * y + w[2] * z + w[3], Y = w[4] * x + w[5] * y + w[6] * z + w[7], Z = w[8] * x + w[9] * y + w[10] * z + w[11];
            D[vo] = X; D[vo + 1] = Y; D[vo + 2] = Z;
            D[vo + 3] = w[0] * nx + w[1] * ny + w[2] * nz; D[vo + 4] = w[4] * nx + w[5] * ny + w[6] * nz; D[vo + 5] = w[8] * nx + w[9] * ny + w[10] * nz;
            D[vo + 6] = g[k + 6]; D[vo + 7] = g[k + 7]; D[vo + 8] = g[k + 8]; D[vo + 9] = g[k + 9] * em;
            vo += 10;
            const sx = X - Y, sy = (X + Y) * 0.5 - Z;
            if (sx < minX) minX = sx; if (sx > maxX) maxX = sx; if (sy < minY) minY = sy; if (sy > maxY) maxY = sy;
          }
        }
        for (let k = nd.kids.length - 1; k >= 0; k--) stack.push([nd.kids[k], nd.w, em]);
      }
      // Malhas com pele: cada vértice é levado pela soma ponderada das matrizes dos seus ossos
      if (m.skins) {
        for (const sk of m.skins) {
          if (sk.hide || (sk.lod && sk.lod > det) || (sk.owner && !sk.owner.vis)) continue;
          vo = this.skin(sk, vo);
          const B = sk.box;
          if (B[0] < minX) minX = B[0]; if (B[1] > maxX) maxX = B[1]; if (B[2] < minY) minY = B[2]; if (B[3] > maxY) maxY = B[3];
        }
      }
      it.vn = vo / 10 - it.v0;
      if (!it.vn) continue;
      it.minX = minX - 2; it.minY = minY - 2; it.w = maxX - minX + 4; it.h = maxY - minY + 4;
      // Pontos de referência projetados (relativos aos pés, em unidades de tela do mundo)
      for (const k in m.anchors) {
        const a = m.anchors[k], w = a.node.w, p = a.p;
        const X = w[0] * p[0] + w[1] * p[1] + w[2] * p[2] + w[3], Y = w[4] * p[0] + w[5] * p[1] + w[6] * p[2] + w[7], Z = w[8] * p[0] + w[9] * p[1] + w[10] * p[2] + w[11];
        const q = it.anchors[k] || (it.anchors[k] = { x: 0, y: 0, z: 0 });
        q.x = X - Y; q.y = (X + Y) * 0.5 - Z; q.z = Z;
        q.wx = X; q.wy = Y;
      }
    }
    return vo;
  },
  // 2) Empacota as células no atlas (prateleiras); reduz a escala se não couber
  pack(n, scale) {
    let s = scale;
    for (let tries = 0; tries < 6; tries++) {
      let x = 0, y = 0, rowH = 0, fit = true;
      for (let i = 0; i < n; i++) {
        const it = this.items[i];
        if (!it.vn) { it.ok = false; continue; }
        const cw = Math.ceil(it.w * s), ch = Math.ceil(it.h * s);
        if (x + cw > this.W) { x = 0; y += rowH + 2; rowH = 0; }
        if (y + ch > this.H / 2) { fit = false; break; }
        it.cx = x; it.cy = y; it.cw = cw; it.ch = ch; it.ok = true;
        x += cw + 2; rowH = Math.max(rowH, ch);
      }
      if (fit) break;
      s *= 0.75;
    }
    this.scale = s;
  },
  // 3) Desenho: passada de cor (metade de cima) e emissiva (metade de baixo)
  drawAtlas(n, vo) {
    const s = this.scale, gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    if (this.data.byteLength > this.bufBytes || !this.bufBytes) { gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW); this.bufBytes = this.data.byteLength; }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, vo));
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, this.W, this.H);
    gl.clearColor(0, 0, 0, 0); gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    gl.enable(gl.SCISSOR_TEST);
    const lt = this.light;
    // Ativa um dos programas (0 = cores por vértice, 1 = textura) com os atributos e a luz do quadro
    const use = (k, pass) => {
      const P = this.progs[k], L = P.loc;
      gl.useProgram(P.p);
      gl.enableVertexAttribArray(L.aPos); gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 40, 0);
      gl.enableVertexAttribArray(L.aNor); gl.vertexAttribPointer(L.aNor, 3, gl.FLOAT, false, 40, 12);
      gl.enableVertexAttribArray(L.aCol); gl.vertexAttribPointer(L.aCol, 4, gl.FLOAT, false, 40, 24);
      gl.uniform3fv(L.uKeyDir, this.keyDir); gl.uniform3fv(L.uRimDir, this.rimDir);
      gl.uniform3fv(L.uAmb, lt.amb); gl.uniform3fv(L.uKeyCol, lt.key);
      gl.uniform1f(L.uDepth, 1 / 1200);
      gl.uniform1f(L.uPass, pass);
      if (L.uTex) gl.uniform1i(L.uTex, 0);
      if (L.uMat) gl.uniform1i(L.uMat, 1);
      if (L.uNrm) gl.uniform1i(L.uNrm, 2);
      return L;
    };
    for (let pass = 0; pass < 2; pass++) {
      let cur = -1, L = null;
      for (let i = 0; i < n; i++) {
        const it = this.items[i];
        if (!it.ok) continue;
        const tex = it.model.tex;
        if (tex && this.progs.length < 2) continue;   // sem o programa de textura, o modelo não aparece
        const want = tex ? 1 : 0;
        if (want !== cur) { cur = want; L = use(want, pass); }
        const o = it.o;
        const vy = this.H - (it.cy + (pass ? this.H / 2 : 0)) - it.ch;
        gl.viewport(it.cx, vy, it.cw, it.ch);
        gl.scissor(it.cx, vy, it.cw, it.ch);
        gl.uniform4f(L.uRect, it.minX, it.minY, it.cw / s, it.ch / s);
        this.itemUniforms(L, it);
        gl.drawArrays(gl.TRIANGLES, it.v0, it.vn);
      }
      gl.disable(gl.SCISSOR_TEST);
      if (!pass) { gl.viewport(0, 0, this.W, this.H); gl.clear(gl.DEPTH_BUFFER_BIT); }
      gl.enable(gl.SCISSOR_TEST);
    }
    gl.disable(gl.SCISSOR_TEST);
  },
  // Textura do modelo e efeitos do item (piscar, emissão, holograma, contraluz, fantasma, armadura)
  itemUniforms(L, it) {
    const gl = this.gl, tex = it.model.tex, lt = this.light;
    if (tex) {
      // mapa de material (metal, aspereza, relevo), se o modelo tiver um; texOf cria na unidade ativa,
      // então as duas texturas são resolvidas antes de ligar cada uma na sua unidade
      const mt = tex.mat ? (tex.matTex || (tex.matTex = typeof tex.mat === 'string' ? { src: tex.mat } : { canvas: tex.mat })) : null;
      const nt = tex.nrm ? (tex.nrmTex || (tex.nrmTex = { src: tex.nrm })) : null;
      const tg = this.texOf(tex), mg = mt ? this.texOf(mt) : null, ng = nt ? this.texOf(nt) : null;
      const matOn = mg && mg !== this.blankTex, nrmOn = ng && ng !== this.blankTex;
      if (matOn) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mg); }
      if (nrmOn) { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ng); }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tg);
      gl.uniform1f(L.uMatOn, matOn ? 1 : 0); gl.uniform1f(L.uBump, matOn ? tex.bump || 0 : 0);
      gl.uniform1f(L.uNrmOn, nrmOn ? 1 : 0); gl.uniform1f(L.uPbr, tex.pbr ? 1 : 0);
      // tex.glow = [r, g, b, ganho]: brilho na cor-tema (sem ele, o azul do Kael)
      const gw = tex.glow;
      if (gw) gl.uniform4f(L.uGlow, gw[0], gw[1], gw[2], gw[3]); else gl.uniform4f(L.uGlow, 0, 0, 0, 0);
    }
    const o = it.o;
    gl.uniform1f(L.uFlash, o.flash || 0);
    gl.uniform1f(L.uEmi, o.emi !== undefined ? o.emi : 1);
    gl.uniform1f(L.uHolo, o.holo ? 1 : 0);
    const rc = o.rim ? hex3(o.rim) : lt.rim;
    gl.uniform3f(L.uRimCol, rc[0], rc[1], rc[2]);
    if (o.ghost) { const gc = o.ghost; gl.uniform4f(L.uGhost, gc[0], gc[1], gc[2], 1); } else gl.uniform4f(L.uGhost, 0, 0, 0, 0);
    if (o.tint) { const tc = o.tint; gl.uniform4f(L.uTint, tc[0], tc[1], tc[2], tc[3]); } else gl.uniform4f(L.uTint, 0, 0, 0, 0);
    // cor das variantes de inimigos (só no programa de cores por vértice; js/mundo/variantes.js)
    if (L.uVar) { const vc = o.vart; if (vc) gl.uniform4f(L.uVar, vc[0], vc[1], vc[2], vc[3]); else gl.uniform4f(L.uVar, 0, 0, 0, 0); }
  },

  // Cena inteira em perspectiva (câmera em terceira pessoa): os itens enfileirados já trazem a
  // posição no mundo na matriz da raiz (o.m). view = { mvp: Float32Array(16) (coluna a coluna),
  // eye: [x, y, z], key/rim: direções da luz }. Desenha a cor em [0, w]×[0, h] e a emissão logo
  // abaixo (y de H/2) no canvas do motor; devolve { w, h } (a resolução usada) ou null
  renderScene(view, W, H) {
    const n = this.used;
    this.used = 0;
    if (!this.active || !n || !this.progsP) return null;
    const vo = this.poseAll(n, 4);
    const k = Math.min(1, this.W / W, (this.H / 2) / H), w = Math.floor(W * k), h = Math.floor(H * k);
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    if (this.data.byteLength > this.bufBytes || !this.bufBytes) { gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW); this.bufBytes = this.data.byteLength; }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, vo));
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, this.W, this.H);
    gl.clearColor(0, 0, 0, 0); gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    const lt = this.light, key = view.key || this.keyDir, rim = view.rim || this.rimDir;
    const use = (kk, pass) => {
      const P = this.progsP[kk], L = P.loc;
      gl.useProgram(P.p);
      gl.enableVertexAttribArray(L.aPos); gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 40, 0);
      gl.enableVertexAttribArray(L.aNor); gl.vertexAttribPointer(L.aNor, 3, gl.FLOAT, false, 40, 12);
      gl.enableVertexAttribArray(L.aCol); gl.vertexAttribPointer(L.aCol, 4, gl.FLOAT, false, 40, 24);
      gl.uniform3fv(L.uKeyDir, key); gl.uniform3fv(L.uRimDir, rim);
      gl.uniform3fv(L.uAmb, lt.amb); gl.uniform3fv(L.uKeyCol, lt.key);
      gl.uniformMatrix4fv(L.uMVP, false, view.mvp);
      gl.uniform3f(L.uView, view.eye[0], view.eye[1], view.eye[2]);
      gl.uniform1f(L.uPersp, 1);
      const fg = view.fog || [0, 0, 0, 400];
      gl.uniform4f(L.uFog, fg[0], fg[1], fg[2], fg[3]);
      gl.uniform1f(L.uPass, pass);
      if (L.uTex) gl.uniform1i(L.uTex, 0);
      if (L.uMat) gl.uniform1i(L.uMat, 1);
      if (L.uNrm) gl.uniform1i(L.uNrm, 2);
      return L;
    };
    for (let pass = 0; pass < 2; pass++) {
      // cor em cima (y do canvas 0..h), emissão a partir da metade (H/2..H/2 + h)
      gl.viewport(0, this.H - h - (pass ? this.H / 2 : 0), w, h);
      let cur = -1, L = null;
      for (let i = 0; i < n; i++) {
        const it = this.items[i];
        if (!it.vn) continue;
        const tex = it.model.tex;
        if (tex && this.progsP.length < 2) continue;
        const want = tex ? 1 : 0;
        if (want !== cur) { cur = want; L = use(want, pass); }
        this.itemUniforms(L, it);
        gl.drawArrays(gl.TRIANGLES, it.v0, it.vn);
        it.ok = true;
      }
      if (!pass) gl.clear(gl.DEPTH_BUFFER_BIT);
    }
    return { w, h };
  },

  // Pele (skinning linear na CPU). sk = { bones: [N3], inv: Float32Array(12·ossos) (inversa da
  // matriz de ligação: espaço da malha → espaço do osso), pos/nor: Float32Array(3·v), att:
  // Float32Array(4·v) (os 4 últimos campos do vértice do motor), bi: Uint8Array(4·v), bw:
  // Float32Array(4·v) (pesos somando 1), idx: índices dos triângulos }. Escreve os triângulos
  // a partir de vo e devolve o novo vo; sk.box recebe a caixa na tela.
  skin(sk, vo) {
    const nb = sk.bones.length, S = sk.S || (sk.S = new Float32Array(nb * 12)), E = sk.E || (sk.E = new Float32Array(nb));
    const nv = sk.pos.length / 3, P = sk.P || (sk.P = new Float32Array(nv * 3)), N = sk.N || (sk.N = new Float32Array(nv * 3));
    const tmp = this._m2 || (this._m2 = M3.make()), inv = sk.inv;
    for (let b = 0; b < nb; b++) {
      const bn = sk.bones[b];
      for (let k = 0; k < 12; k++) tmp[k] = inv[b * 12 + k];
      const o = b * 12, w = bn.w;
      // S = W · inv (3×4 por 3×4, última linha implícita 0 0 0 1)
      for (let r = 0; r < 3; r++) {
        const a0 = w[r * 4], a1 = w[r * 4 + 1], a2 = w[r * 4 + 2];
        S[o + r * 4] = a0 * tmp[0] + a1 * tmp[4] + a2 * tmp[8];
        S[o + r * 4 + 1] = a0 * tmp[1] + a1 * tmp[5] + a2 * tmp[9];
        S[o + r * 4 + 2] = a0 * tmp[2] + a1 * tmp[6] + a2 * tmp[10];
        S[o + r * 4 + 3] = a0 * tmp[3] + a1 * tmp[7] + a2 * tmp[11] + w[r * 4 + 3];
      }
      E[b] = bn.em === undefined ? 1 : bn.em;
    }
    const pos = sk.pos, nor = sk.nor, bi = sk.bi, bw = sk.bw;
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (let v = 0; v < nv; v++) {
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], nx = nor[v * 3], ny = nor[v * 3 + 1], nz = nor[v * 3 + 2];
      let X = 0, Y = 0, Z = 0, NX = 0, NY = 0, NZ = 0;
      for (let j = 0; j < 4; j++) {
        const wt = bw[v * 4 + j];
        if (wt <= 0) continue;
        const o = bi[v * 4 + j] * 12;
        X += wt * (S[o] * x + S[o + 1] * y + S[o + 2] * z + S[o + 3]);
        Y += wt * (S[o + 4] * x + S[o + 5] * y + S[o + 6] * z + S[o + 7]);
        Z += wt * (S[o + 8] * x + S[o + 9] * y + S[o + 10] * z + S[o + 11]);
        NX += wt * (S[o] * nx + S[o + 1] * ny + S[o + 2] * nz);
        NY += wt * (S[o + 4] * nx + S[o + 5] * ny + S[o + 6] * nz);
        NZ += wt * (S[o + 8] * nx + S[o + 9] * ny + S[o + 10] * nz);
      }
      P[v * 3] = X; P[v * 3 + 1] = Y; P[v * 3 + 2] = Z; N[v * 3] = NX; N[v * 3 + 1] = NY; N[v * 3 + 2] = NZ;
      const sx = X - Y, sy = (X + Y) * 0.5 - Z;
      if (sx < minX) minX = sx; if (sx > maxX) maxX = sx; if (sy < minY) minY = sy; if (sy > maxY) maxY = sy;
    }
    const B = sk.box || (sk.box = [0, 0, 0, 0]);
    B[0] = minX; B[1] = maxX; B[2] = minY; B[3] = maxY;
    const idx = sk.idx, ni = idx.length, att = sk.att;
    if (vo + ni * 10 > this.data.length) { const d2 = new Float32Array(Math.max(this.data.length * 2, vo + ni * 10 + 1024)); d2.set(this.data.subarray(0, vo)); this.data = d2; }
    const D = this.data;
    for (let i = 0; i < ni; i++) {
      const v = idx[i], v3 = v * 3, v4 = v * 4;
      D[vo] = P[v3]; D[vo + 1] = P[v3 + 1]; D[vo + 2] = P[v3 + 2];
      D[vo + 3] = N[v3]; D[vo + 4] = N[v3 + 1]; D[vo + 5] = N[v3 + 2];
      D[vo + 6] = att[v4]; D[vo + 7] = att[v4 + 1]; D[vo + 8] = att[v4 + 2]; D[vo + 9] = att[v4 + 3] * E[bi[v4]];
      vo += 10;
    }
    return vo;
  },

  // Textura WebGL de um modelo ({ src } com data URI, ou { canvas } já pintado, como o atlas do
  // chão da 3ª pessoa); a provisória vale até a imagem carregar
  texOf(tex) {
    if (tex.gl) return tex.gl;
    if (tex.canvas) tex.img = tex.canvas;
    else if (!tex.img) { tex.img = new Image(); tex.img.src = tex.src; }
    const iw = tex.img.naturalWidth || tex.img.width, ih = tex.img.naturalHeight || tex.img.height;
    if (!tex.canvas && (!tex.img.complete || !tex.img.naturalWidth)) return this.blankTex;
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex.img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Lados potência de 2: mipmaps (o Kael pequeno na tela não cintila)
    const pot = !(iw & (iw - 1)) && !(ih & (ih - 1));
    if (pot) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, pot ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    // Filtragem anisotrópica: a câmera isométrica vê as roupas e placas de viés, e só o mipmap
    // borra esses detalhes (até 8×, quando a placa de vídeo oferece)
    if (pot) {
      if (this.aniso === undefined) this.aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') || null;
      const A = this.aniso;
      if (A) gl.texParameterf(gl.TEXTURE_2D, A.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1));
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    tex.gl = t;
    return t;
  },
  // Libera as texturas WebGL de um modelo que não vai mais ser usado (o atlas da sala anterior)
  freeTex(tex) {
    if (!tex || !this.gl) return;
    for (const t of [tex, tex.matTex, tex.nrmTex]) if (t && t.gl) { this.gl.deleteTexture(t.gl); t.gl = null; }
  },

  // Desenha a passada de cor do sprite com os pés em (sx, sy) (coordenadas do mundo isométrico)
  blit(ctx, it, sx, sy) {
    if (!it || !it.ok) return false;
    const s = this.scale;
    ctx.drawImage(this.canvas, it.cx, it.cy, it.cw, it.ch, sx + it.minX, sy + it.minY, it.cw / s, it.ch / s);
    return true;
  },
  // Partes luminosas (somadas à cena depois da escuridão)
  blitEmissive(ctx, it, sx, sy, alpha = 1) {
    if (!it || !it.ok) return false;
    const s = this.scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.canvas, it.cx, it.cy + this.H / 2, it.cw, it.ch, sx + it.minX, sy + it.minY, it.cw / s, it.ch / s);
    ctx.restore();
    return true;
  },
};

// Registro dos modelos 3D: MODELS3D.chave = { build(), pose(model, entidade, opções), demos }
const MODELS3D = {};

// Os modelos ficam em js/models/<chave>.js (um arquivo por modelo), carregados pelo index.html

