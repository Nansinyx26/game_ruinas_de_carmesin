'use strict';
// ECLIPSE ZERO · Câmera em terceira pessoa sobre o jogo (ThirdView)
// ---------------------------------------------------------------------------
// O MESMO jogo (campanha e mundo aberto: sala, heróis com armaduras e armas, inimigos, combate,
// habilidades, HUD) visto de trás do ombro, em perspectiva. Só muda o desenho e o sentido dos
// controles: o analógico e o WASD andam em relação à câmera (screenToWorldDir).
//   V alterna isométrica / 3ª pessoa · botão direito do mouse (arrastar) gira · roda aproxima
//   Z / C giram · analógico direito gira e inclina · parado sem girar, a câmera volta para trás
//   do herói quando ele anda
// Desenho: o motor 3D (R3D.renderScene) desenha a sala (montada aqui a partir da Room: piso,
// paredes, pilares, luminárias), os modelos e as sombras numa passada só com a câmera; os
// efeitos 2D do jogo (partículas, auras, projéteis, números de dano, barras de vida) são
// desenhados com isoX/isoY trocados pela projeção da câmera, então aparecem no lugar certo.
// Movimento: a câmera segue o herói por uma mola (com antecipação do movimento), balança de
// leve com os passos, afunda na aterrissagem e abre o campo de visão na esquiva; o corpo do
// herói inclina para a frente ao correr e para dentro das curvas; poeira nos passos no campo aberto.
// Ambientação (js/terceira_ambiente.js, Ambiente3P): céu por bioma e hora, horizonte, luz e
// névoa; chão com textura e relevo no campo aberto (js/texturas.js); detalhes e partículas.
// ---------------------------------------------------------------------------
const THIRD_KEY = 'eclipse_zero_camera';
// HSL (0–1) → [r, g, b] (0–1): as cores dos temas das salas vêm em HSL
function thirdHsl(h, s, l) {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

const ThirdView = {
  on: false,
  yaw: 0, pitch: 0.33, dist: 210, tz: 44, fov: 58 * Math.PI / 180,
  curDist: 210, manualT: 9, mouseDX: 0, mouseDY: 0, drag: false, ready: false,
  eye: [0, 0, 0], tgt: [0, 0, 0], f: [1, 0, 0], s: [0, 1, 0], u: [0, 0, 1],
  mvp: new Float32Array(16), V: new Float32Array(16), Pm: new Float32Array(16), focal: 1,
  view: { mvp: null, eye: null, key: [0, 0, 1], rim: [0, 0, 1] },
  room: null, roomModel: null, roomO: { m: M3.make() }, queued: [], P: { x: 0, y: 0, w: 1, k: 1, vis: false },
  chaoModel: null, chaoO: { m: M3.make(), emi: 1 },
  // movimento da câmera e do corpo (update)
  alvo: [0, 0, 0], alvoOk: false, bobF: 0, bob: 0, quedaZ: 0, noAr: false, vzAnt: 0, fovK: 0, inclina: 0, giro: 0, faceAnt: 0, passoN: 0,

  // Preferência guardada (a última câmera usada)
  load() { try { this.on = localStorage.getItem(THIRD_KEY) === '3p' && R3D.active; } catch (e) { this.on = false; } if (this.on) this.init(); },
  set(on, quiet) {
    if (on && !R3D.active) { if (!quiet) game.hud.toast('Câmera em 3ª pessoa: precisa dos gráficos 3D (G)', '255,92,122'); on = false; }
    this.on = !!on;
    try { localStorage.setItem(THIRD_KEY, this.on ? '3p' : 'iso'); } catch (e) { /* sem armazenamento: vale só nesta sessão */ }
    if (this.on) {
      this.init();
      const p = game.player;
      if (p) this.yaw = typeof p.facing === 'number' ? p.facing : this.yaw;
      this.curDist = this.dist;
    }
    if (!quiet) game.hud.toast(this.on ? 'CÂMERA · 3ª PESSOA  (V alterna · botão direito ou Z/C giram)' : 'CÂMERA · ISOMÉTRICA', '120,200,255');
  },
  toggle() { this.set(!this.on); },
  // Mouse: arrastar com o botão direito gira; a roda aproxima e afasta
  init() {
    if (this.ready || typeof game === 'undefined' || !game.canvas) return;
    this.ready = true;
    const c = game.canvas;
    c.addEventListener('mousedown', (e) => { if (this.on && e.button === 2) { this.drag = true; e.preventDefault(); } });
    window.addEventListener('mouseup', (e) => { if (e.button === 2) this.drag = false; });
    window.addEventListener('mousemove', (e) => { if (this.on && this.drag) { this.mouseDX += e.movementX || 0; this.mouseDY += e.movementY || 0; } });
    c.addEventListener('contextmenu', (e) => { if (this.on) e.preventDefault(); });
    c.addEventListener('wheel', (e) => {
      if (!this.on || game.state !== 'playing') return;
      this.dist = clamp(this.dist * (e.deltaY > 0 ? 1.1 : 0.9), 110, 380);
      e.preventDefault();
    }, { passive: false });
  },
  active() { return this.on && R3D.active && typeof game !== 'undefined' && !!game.room && !!game.player; },

  // ------------------------------------------------------------------ controles
  update(dt, inp) {
    if (!this.active()) return;
    const p = game.player;
    let man = false;
    const lk = inp.look;
    if (Math.abs(lk.x) > 0.2) { this.yaw += lk.x * 2.8 * dt; man = true; }
    if (Math.abs(lk.y) > 0.2) { this.pitch = clamp(this.pitch + lk.y * 1.1 * dt, 0.1, 0.95); man = true; }
    if (inp.held.camLeft) { this.yaw -= 2.4 * dt; man = true; }
    if (inp.held.camRight) { this.yaw += 2.4 * dt; man = true; }
    if (this.mouseDX || this.mouseDY) {
      this.yaw += this.mouseDX * 0.006; this.pitch = clamp(this.pitch + this.mouseDY * 0.003, 0.1, 0.95);
      this.mouseDX = this.mouseDY = 0; man = true;
    }
    this.manualT = man ? 0 : this.manualT + dt;
    // sem girar à mão por um tempo, a câmera vai para trás do herói enquanto ele anda
    const sp = Math.hypot(p.vx || 0, p.vy || 0);
    if (this.manualT > 1.2 && sp > 60 && p.state === 'run') {
      const d = angleDiff(this.yaw, Math.atan2(p.vy, p.vx));
      if (Math.abs(d) < 2.3) this.yaw += clamp(d, -1, 1) * Math.min(1, sp / 220) * 1.3 * dt;
    }
    this.curDist += (this.dist - this.curDist) * Math.min(1, dt * 6);
    this.movimento(dt, p, sp);
    Ambiente3P.update(dt);
  },
  // Câmera com mola e o balanço do corpo (ver o cabeçalho)
  movimento(dt, p, sp) {
    const A = this.alvo, tx = p.x + (p.vx || 0) * 0.16, ty = p.y + (p.vy || 0) * 0.16;
    if (!this.alvoOk || dist2(A[0], A[1], p.x, p.y) > 320 * 320) { A[0] = tx; A[1] = ty; A[2] = p.z || 0; this.alvoOk = true; }   // troca de zona: sem mola
    const kf = 1 - Math.exp(-dt * 9);
    A[0] += (tx - A[0]) * kf; A[1] += (ty - A[1]) * kf;
    A[2] += ((p.z || 0) * 0.6 - A[2]) * (1 - Math.exp(-dt * 6));   // no pulo a câmera sobe só um pouco
    const corre = p.state === 'run' && sp > 40;
    if (corre) this.bobF += dt * sp / 34;
    this.bob = corre ? Math.abs(Math.sin(this.bobF)) * 1.6 * Math.min(1, sp / 200) : this.bob * Math.exp(-dt * 8);
    if (this.noAr && !p.air) this.quedaZ = -Math.min(9, 3 + Math.max(0, -this.vzAnt) * 0.02);   // aterrissagem
    this.noAr = !!p.air; this.vzAnt = p.vz || 0;
    this.quedaZ *= Math.exp(-dt * 7);
    const dash = p.state === 'dash';
    this.fovK += ((dash ? 1 : 0) - this.fovK) * (1 - Math.exp(-dt * (dash ? 14 : 5)));
    // inclinação: para a frente com a velocidade, para dentro da curva com o giro do rosto
    const f = typeof p.facing === 'number' ? p.facing : 0, w = dt > 0 ? angleDiff(this.faceAnt, f) / dt : 0;
    this.faceAnt = f;
    const inc = corre ? Math.min(1, sp / 230) * 0.12 : dash ? 0.2 : 0, giro = corre ? clamp(-w * 0.05, -0.16, 0.16) : 0;
    this.inclina += (inc - this.inclina) * (1 - Math.exp(-dt * 8));
    this.giro += (giro - this.giro) * (1 - Math.exp(-dt * 8));
    // poeira dos passos no campo aberto (na cor do chão do bioma)
    const R = game.room, n = Math.floor(this.bobF / Math.PI);
    if (corre && sp > 120 && R && R.aberto && n !== this.passoN) {
      this.passoN = n;
      const cor = { deserto: '196,160,112', neve: '222,232,246', floresta: '92,84,62', lagoa: '110,140,136', vulcao: '74,62,60' }[R.def.theme] || '90,90,96';
      game.particles.dust(p.x - Math.cos(f) * 8, p.y - Math.sin(f) * 8, 2, 7, 36, cor);
    }
  },
  // Direção no mundo para o analógico (dx, dy da tela): para cima = para onde a câmera olha
  inputDir(dx, dy, out) {
    const fx = Math.cos(this.yaw), fy = Math.sin(this.yaw);
    const wx = fx * -dy - fy * dx, wy = fy * -dy + fx * dx, l = Math.hypot(wx, wy) || 1;
    out.x = wx / l; out.y = wy / l;
    return out;
  },

  // ------------------------------------------------------------------ câmera
  camera(p, R) {
    const T = this.tgt, E = this.eye, A = this.alvo;
    if (this.alvoOk) { T[0] = A[0]; T[1] = A[1]; T[2] = A[2] + this.tz + this.bob + this.quedaZ; }
    else { T[0] = p.x; T[1] = p.y; T[2] = (p.z || 0) + this.tz; }
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch), fx = Math.cos(this.yaw), fy = Math.sin(this.yaw);
    // não atravessa as paredes: aproxima até a câmera caber na sala
    let d = this.curDist;
    for (let k = 0; k < 10; k++) {
      const ex = T[0] - fx * d * cp, ey = T[1] - fy * d * cp;
      const M = (R.margem || 0) - 16;   // campo aberto: a câmera pode sair da borda (não há parede)
      if (ex > 16 - M && ex < R.w - 16 + M && ey > 16 - M && ey < R.h - 16 + M) break;
      d *= 0.86;
    }
    E[0] = T[0] - fx * d * cp; E[1] = T[1] - fy * d * cp; E[2] = T[2] + d * sp;
    // base da câmera (espelhada como a projeção isométrica do jogo: a mão direita fica à direita)
    const f = this.f, s = this.s, u = this.u;
    f[0] = T[0] - E[0]; f[1] = T[1] - E[1]; f[2] = T[2] - E[2];
    let l = Math.hypot(f[0], f[1], f[2]) || 1; f[0] /= l; f[1] /= l; f[2] /= l;
    s[0] = -f[1]; s[1] = f[0]; s[2] = 0;
    l = Math.hypot(s[0], s[1]) || 1; s[0] /= l; s[1] /= l;
    u[0] = -f[2] * s[1]; u[1] = f[2] * s[0]; u[2] = f[0] * s[1] - f[1] * s[0];
    const V = this.V;
    V[0] = s[0]; V[4] = s[1]; V[8] = s[2]; V[12] = -(s[0] * E[0] + s[1] * E[1] + s[2] * E[2]);
    V[1] = u[0]; V[5] = u[1]; V[9] = u[2]; V[13] = -(u[0] * E[0] + u[1] * E[1] + u[2] * E[2]);
    V[2] = -f[0]; V[6] = -f[1]; V[10] = -f[2]; V[14] = f[0] * E[0] + f[1] * E[1] + f[2] * E[2];
    V[3] = 0; V[7] = 0; V[11] = 0; V[15] = 1;
    const near = 6, far = 6000, F = 1 / Math.tan((this.fov + this.fovK * 0.12) / 2), asp = VIEW_W / VIEW_H, Pm = this.Pm;   // a esquiva abre ~7°
    Pm.fill(0);
    Pm[0] = F / asp; Pm[5] = F; Pm[10] = (far + near) / (near - far); Pm[11] = -1; Pm[14] = (2 * far * near) / (near - far);
    this.focal = F;
    const M = this.mvp;
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      M[c * 4 + r] = Pm[r] * V[c * 4] + Pm[4 + r] * V[c * 4 + 1] + Pm[8 + r] * V[c * 4 + 2] + Pm[12 + r] * V[c * 4 + 3];
    }
    // luz principal do alto à esquerda da câmera; contraluz de trás
    const key = this.view.key, rim = this.view.rim;
    const comb = (o, a, b, c) => { o[0] = -f[0] * a - s[0] * b; o[1] = -f[1] * a - s[1] * b; o[2] = -f[2] * a - s[2] * b + c; const q = Math.hypot(o[0], o[1], o[2]) || 1; o[0] /= q; o[1] /= q; o[2] /= q; };
    comb(key, 0.55, 0.45, 0.75); comb(rim, -0.8, -0.45, 0.4);
    this.view.mvp = M; this.view.eye = E;
  },
  // Ponto do mundo → tela lógica (x, y), profundidade w e pixels por unidade k; vis = à frente
  proj(x, y, z) {
    const m = this.mvp, P = this.P;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw < 4) { P.vis = false; P.x = -9999; P.y = -9999; P.w = cw; P.k = 0; return P; }
    P.x = (cx / cw * 0.5 + 0.5) * VIEW_W; P.y = (0.5 - cy / cw * 0.5) * VIEW_H; P.w = cw;
    P.k = this.focal * VIEW_H * 0.5 / cw; P.vis = true;
    return P;
  },

  // ------------------------------------------------------------------ cenário em 3D
  // Piso em ladrilhos, paredes nos quatro lados (com as aberturas da porta e das passagens do
  // mundo), pilares e luminárias, nas cores do tema da sala
  buildRoom(R) {
    const th = R.theme, n = R.def.tiles, T = TILE, w = R.w, h = R.h, WH = R.wallH || 150;
    const hex = (hh, ss, ll) => { const c = thirdHsl(hh / 360, ss / 100, clamp(ll, 0, 100) / 100); return '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); };
    const rgbHex = (s) => '#' + s.split(',').map((v) => (+v).toString(16).padStart(2, '0')).join('');
    const [fh, fs, fl] = th.floor, [wh, ws] = th.wall;
    const r = mulberry32(R.seed || 1);
    const floor = new G3(), mg = R.aberto ? Math.round(R.margem / T) : 0;
    // campo aberto com textura (js/texturas.js): o piso vira um modelo à parte (chaoModel)
    const tipoAmb = Ambiente3P.tipo(R), comTextura = R.aberto && TexturasMundo.tem(tipoAmb) && (typeof Settings === 'undefined' || Settings.v.quality > 0);
    this.chaoModel = comTextura ? this.chaoTexturizado(R, tipoAmb) : null;
    if (!this.chaoModel) for (let i = -mg; i < n + mg; i++) for (let j = -mg; j < n + mg; j++) {
      // campo aberto: chão sem xadrez, escurecendo além da borda (até o horizonte)
      const fora = Math.max(0, -i, -j, i - n + 1, j - n + 1);
      const l = R.aberto ? (fl * 0.72 + Math.sin(i * 0.7 + j * 0.31) * 1.2 + r() * 0.8) * Math.max(0.3, 1 - fora * 0.17) : fl * 0.72 + ((i + j) % 2 ? 1.4 : 0) + r() * 1.2;
      floor.quad([i * T, j * T, 0], [(i + 1) * T, j * T, 0], [(i + 1) * T, (j + 1) * T, 0], [i * T, (j + 1) * T, 0], hex(fh, fs, l), 0);
    }
    // frestas acesas entre os ladrilhos (cor de destaque), uma a cada duas
    const acc = rgbHex(th.accent);
    for (let i = 2; i < n && th.deco !== 'natural'; i += 2) {   // (nos biomas, chão sem ladrilhos acesos)
      floor.quad([i * T - 0.6, 0, 0.12], [i * T + 0.6, 0, 0.12], [i * T + 0.6, h, 0.12], [i * T - 0.6, h, 0.12], hex(fh, fs, fl * 1.4), 0.08);
      floor.quad([0, i * T - 0.6, 0.12], [w, i * T - 0.6, 0.12], [w, i * T + 0.6, 0.12], [0, i * T + 0.6, 0.12], hex(fh, fs, fl * 1.4), 0.08);
    }
    const root = new N3('sala');
    if (floor.d.length) root.add(new N3('piso', floor));
    Ambiente3P.decorar(root, R);   // chão até o horizonte e detalhes do bioma (js/terceira_ambiente.js)
    if (R.cidade) Cidade.modelo3D(root, R);   // prédios dos distritos e a torre da Aurora (js/mundo/cidade.js)
    // paredes: segmentos entre as aberturas (porta da campanha no norte; passagens do mundo no meio de cada lado)
    const wallCol = hex(wh, ws, 13), trim = rgbHex(th.lamp), gaps = { N: [], S: [], W: [], E: [] };
    if (R.def.waves && R.def.waves.length && R.door) gaps.N.push([R.door.x - R.door.halfW, R.door.x + R.door.halfW]);
    if (typeof World !== 'undefined' && World.active && World.zone) {
      for (const dir of ['N', 'S', 'W', 'E']) {
        const d = WORLD_DIRS[dir], nz = worldZoneAt(World.zone.r + d[0], World.zone.c + d[1], World.zone.region);
        if (nz) gaps[dir].push(dir === 'N' || dir === 'S' ? [w / 2 - 70, w / 2 + 70] : [h / 2 - 70, h / 2 + 70]);
      }
    }
    const wall = (name, along, len, fixed, horiz) => {
      const g = new G3();
      let a = 0;
      const cuts = gaps[name].slice().sort((p, q) => p[0] - q[0]).concat([[len, len]]);
      for (const [g0, g1] of cuts) {
        if (g0 > a + 1) {
          const mid = (a + g0) / 2, L = g0 - a;
          if (horiz) { g.box(mid, fixed, WH / 2, L, 12, WH, wallCol, 0); g.box(mid, fixed, 3, L, 13, 2, trim, 0.7); g.box(mid, fixed, WH - 4, L, 13, 2, trim, 0.35); }
          else { g.box(fixed, mid, WH / 2, 12, L, WH, wallCol, 0); g.box(fixed, mid, 3, 13, L, 2, trim, 0.7); g.box(fixed, mid, WH - 4, 13, L, 2, trim, 0.35); }
        }
        a = g1;
      }
      return root.add(new N3('parede' + name, g));
    };
    if (!R.aberto) { wall('N', 'x', w, -6, true); wall('S', 'x', w, h + 6, true); wall('W', 'y', h, -6, false); wall('E', 'y', h, w + 6, false); }
    // luminárias das paredes do fundo (as mesmas tochas da vista isométrica)
    const lamps = new G3();
    for (const t of R.torches) {
      if (t.chao) { lamps.cyl(t.x, t.y, 0, 7, 2, 12, 6, trim, 1); continue; }   // lume no chão do campo aberto
      if (t.poste) { lamps.cyl(t.x, t.y, 0, 2.6, 2, 62, 6, '#24262e', 0); lamps.box(t.x, t.y, 64, 12, 12, 5, trim, 1); continue; }   // poste da cidade
      if (t.y === 0) lamps.box(t.x, 1, 104, 18, 6, 26, trim, 1);
      else lamps.box(1, t.y, 104, 6, 18, 26, trim, 1);
    }
    root.add(new N3('luzes', lamps));
    // pilares (um nó cada: o que fica entre a câmera e o herói some), com a luz do tema no topo dos inteiros
    const pc = hex(wh, ws * 0.8, 17), kind = th.pillar;
    R.pillars.forEach((q, i) => {
      if (q.cenario) return;   // colisor de um objeto de cenário (o modelo vem de js/mundo/cenario.js)
      const pil = new G3(), rr = mulberry32(q.seed || i + 1);
      if (kind === 'tree') {
        // tronco e copa em tufos (as cores das folhas vêm do tema)
        const th2 = q.broken ? q.h * 0.35 : q.h * 0.55, cr = q.r * (q.broken ? 1.9 : 2.7), L = th.speck || ['40,90,40', '20,40,18', '90,140,60'];
        pil.cyl(q.x, q.y, 0, q.r * 0.7, q.r * 0.45, th2 + cr * 0.3, 8, '#3a281b', 0);
        for (let k = 0; k < 6; k++) {
          const a = rr() * Math.PI * 2, d = rr() * cr * 0.5, s0 = cr * (0.45 + rr() * 0.25);
          pil.sphere(q.x + Math.cos(a) * d, q.y + Math.sin(a) * d, th2 + cr * 0.45 + rr() * cr * 0.3, s0, s0, s0 * 0.8, 7, 5, rgbHex(L[k % L.length]), 0);
        }
      } else if (kind === 'rock') {
        // rocha facetada (neve no topo nas montanhas, fendas de lava na cratera)
        const H = Math.min(q.h * 0.62, 96);
        pil.cyl(q.x, q.y, 0, q.r * 1.45, q.r * 0.35, H, 6, hex(wh, ws * 0.7, 22), 0, { rot: rr() * 3 });
        if (th.cap) pil.cyl(q.x, q.y, H * 0.62, q.r * 0.75, q.r * 0.3, H * 0.38 + 1, 6, rgbHex(th.cap), 0.05, { rot: rr() * 3 });
        if (th.lava) pil.cyl(q.x, q.y, 0, q.r * 1.48, q.r * 1.2, 5, 6, acc, 0.9, { caps: false });
      } else if (kind === 'crystal') {
        // cristais: prismas finos e acesos saindo do chão
        const n = q.broken ? 3 : 5;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + rr(), d = k ? q.r * 0.6 : 0, hh = q.h * (k ? 0.45 + rr() * 0.3 : 1);
          pil.cyl(q.x + Math.cos(a) * d, q.y + Math.sin(a) * d, 0, q.r * (k ? 0.28 : 0.38), 0, hh, 6, acc, 0.55);
        }
      } else {
        pil.cyl(q.x, q.y, 0, q.r, q.r * (q.broken ? 0.8 : 0.92), q.h, 10, pc, 0);
        pil.cyl(q.x, q.y, 0, q.r * 1.12, q.r * 1.08, 8, 10, hex(wh, ws, 10), 0);
        if (!q.broken) pil.cyl(q.x, q.y, q.h - 10, q.r * 1.02, q.r * 1.02, 3, 10, trim, 0.8, { caps: false });
      }
      root.add(new N3('pilar' + i, pil));
    });
    const m = new Model3(root);
    m.walls = R.aberto ? [] : ['N', 'S', 'W', 'E'].map((k) => m.nodes['parede' + k]);
    m.pillars = R.pillars.map((q, i) => [q, m.nodes['pilar' + i]]).filter(([, nd]) => nd);
    return m;
  },
  roomFor(R) {
    if (this.room !== R) {
      if (this.chaoModel && this.chaoModel.tex) R3D.freeTex(this.chaoModel.tex);   // o atlas da sala anterior
      this.room = R; this.roomModel = this.buildRoom(R);
    }
    return this.roomModel;
  },
  // Piso do campo aberto com o atlas de cor e relevo da sala (programa com textura do motor:
  // nos vértices, (u, v, 0, emissão) no lugar da cor)
  chaoTexturizado(R, tipo) {
    const P = AMB3P[tipo], atl = TexturasMundo.atlas(R, tipo, P && P.chao ? P.chao : '#202028');
    if (!atl) return null;
    const g = new G3(), m = atl.m, L = atl.L, N = 6, emi = tipo === 'lagoa' ? 0.35 : 0;
    const v = (x, y) => [x, y, 0, 0, 0, 1, (x + m) / L, (y + m) / L, 0, emi];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x0 = -m + (L * i) / N, y0 = -m + (L * j) / N, x1 = x0 + L / N, y1 = y0 + L / N;
      for (const q of [v(x0, y0), v(x1, y0), v(x1, y1), v(x0, y0), v(x1, y1), v(x0, y1)]) g.d.push(...q);
    }
    const model = new Model3(new N3('chao', g));
    model.tex = { canvas: atl.cor, mat: atl.alt, pbr: true, bump: 1.6 };
    return model;
  },

  // ------------------------------------------------------------------ desenho do quadro
  render(ctx) {
    const g = game, p = g.player, R = g.room, t = g.time;
    this.camera(p, R);
    // fundo: céu do bioma e da hora, horizonte e terra distante (ou o teto dos interiores);
    // a luz e a névoa combinam com ele (js/terceira_ambiente.js)
    // renderizador realista (js/realista/realista.js, Three.js): o céu vai para o fundo da cena dele
    const real = typeof Realista3D !== 'undefined' && Realista3D.ativo(), ctxCeu = real ? Realista3D.ceuCtx() : ctx;
    if (real) ctx.clearRect(0, 0, VIEW_W, VIEW_H);   // a cena do Three.js aparece por baixo (Realista3D.camada)
    ctxCeu.fillStyle = '#02040a'; ctxCeu.fillRect(0, 0, VIEW_W, VIEW_H);
    const C = Ambiente3P.ceu(ctxCeu, R, g.realTime);
    this.view.fog = Ambiente3P.luzes(R, C, this.view);
    if (g.world && World.zone) Clima.nevoa3P(this.view.fog);   // neblina densa, nevasca e areia fecham a visão
    g.use3D = true;
    const Q = this.queued;
    Q.length = 0;
    // sala (as paredes entre a câmera e o herói somem)
    const rm = this.roomFor(R), E = this.eye;
    const T = this.tgt;
    const hideNear = (m) => {
      const N = m.walls;
      if (N.length) { N[0].vis = E[1] > 30; N[1].vis = E[1] < R.h - 30; N[2].vis = E[0] > 30; N[3].vis = E[0] < R.w - 30; }
      // pilares cortando a linha câmera → herói (só os altos o bastante para tapar)
      const dx = T[0] - E[0], dy = T[1] - E[1], L2 = dx * dx + dy * dy || 1;
      for (const [q, nd] of m.pillars) {
        const k = clamp(((q.x - E[0]) * dx + (q.y - E[1]) * dy) / L2, 0, 1);
        const px = E[0] + dx * k - q.x, py = E[1] + dy * k - q.y;
        if (k < 0.97 && px * px + py * py < (q.r + 10) * (q.r + 10) && q.h > T[2] * 0.6) nd.vis = false;
      }
    };
    M3.trs(this.roomO.m, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    const ri = R3D.queue(rm, hideNear, null, this.roomO);
    ri.ent = null; Q.push(ri);
    if (this.chaoModel) { M3.trs(this.chaoO.m, [0, 0, 0], [0, 0, 0], [1, 1, 1]); const fi = R3D.queue(this.chaoModel, null, null, this.chaoO); fi.ent = null; Q.push(fi); }
    // modelos (as mesmas chaves e poses da vista isométrica), já no lugar do mundo
    const place = (it, e) => {
      if (!it) return null;
      const o = it.o, sc = o.scale || 1, m = o.m3 || (o.m3 = M3.make());
      M3.trs(m, [e.x, e.y, (e.z || 0) + (o.lift || 0)], [o.roll || 0, o.pitch || 0, o.yaw || 0], [sc, sc, sc]);
      o.m = m; it.ent = e;
      Q.push(it);
      return it;
    };
    const sombra = (e, r) => {
      const o = e._sh3 || (e._sh3 = { m: M3.make() });
      const k = 1 - Math.min(0.5, (e.z || 0) / 160);   // no ar (pulo, lançado), a sombra encolhe
      M3.trs(o.m, [e.x, e.y, 0.25], [0, 0, 0], [r * k, r * k, 1]);
      const si = R3D.queue(this.shadowModel(), null, null, o);
      si.ent = null; Q.push(si);
    };
    const mk = heroModelKey(p.def);
    p.mk3 = mk;
    const o3 = g.opts3(p, p.flash > 0 ? 0.9 : 0);
    o3.tint = heroArmorTint(p.def.id);
    sombra(p, 22);
    const itP = g.queue3(mk, p, o3);
    if (itP) { itP.o.pitch = (itP.o.pitch || 0) + this.inclina; itP.o.roll = (itP.o.roll || 0) + this.giro; }   // inclinação do corpo
    p.spr = place(itP, p);
    for (const e of g.enemies) {
      if ((e.state === 'spawn' && e.stateTime < e.spawnDur * 0.5) || e.oculto > 0) continue;   // enterrado: some
      sombra(e, (e.radius || 16) * 1.3);
      e.spr = place(g.queue3(e.isBoss ? 'nexus' : e.type, e, g.opts3(e, e.flash > 0 ? 0.85 : 0)), e);
    }
    for (const n of g.npcs) {
      if (n.kind) { this.queueProp(n, place); continue; }   // baús, terminais (as placas vão por cima)
      if (!n.key) continue;
      sombra(n, 16);
      n.spr = place(g.queue3(n.key, n, g.opts3(n, 0)), n);
    }
    if (g.world && World.zone) Clima.fila3P(Q);   // poças, neve no chão e fogueiras (js/mundo/clima.js)
    let cells = 0;
    for (let i = 0; i < g.pickups.count; i++) {
      const it = g.pickups.items[i];
      it.spr = null;
      const key = it.kind === 'memory' ? 'memoria' : it.kind === 'health' ? 'capsula' : (cells++ < 36 ? 'celula' : null);
      if (key) it.spr = place(g.queue3(key, it, g.opts3(it, 0)), it);
    }
    const W = Math.max(2, Math.round(VIEW_W * g.scale)), H = Math.max(2, Math.round(VIEW_H * g.scale));
    let res = null, rr = null;
    if (real) {
      try { rr = Realista3D.render(this, W, H); } catch (err) { console.error(err); Realista3D.ok = false; Realista3D.erro = String(err && err.message || err); }
    } else {
      try { res = R3D.renderScene(this.view, W, H); } catch (err) { console.error(err); }
    }
    Ambiente3P.fim();   // a luz do sol volta ao padrão (a vista isométrica usa a mesma luz)
    if (real && !rr) ctx.drawImage(Realista3D.ceuCanvas, 0, 0, VIEW_W, VIEW_H);   // sem cena neste quadro: só o céu
    if (res) {
      ctx.drawImage(R3D.canvas, 0, 0, res.w, res.h, 0, 0, VIEW_W, VIEW_H);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(R3D.canvas, 0, res.ey, res.ew, res.eh, 0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }
    Ambiente3P.desenharAr(ctx, R, g.realTime);   // pólen, poeira, cinzas, cristais de gelo, névoa baixa
    // brilhos dos modelos (espada, olhos, núcleos) pelas âncoras, projetadas
    g.glowCount = 0;
    for (const it of Q) {
      const e = it.ent;
      if (!e) continue;
      const key = e === p ? mk : e.isBoss ? 'nexus' : e.type || e.key, def = MODELS3D[key];
      if (!def || !def.glows) continue;
      def.glows(e, (name, r, rgb, a) => {
        const q = it.anchors[name];
        if (!q || q.wx === undefined) return;
        const P = this.proj(q.wx, q.wy, q.z);
        if (P.vis) g.addGlow(ctx, P.x, P.y, r * P.k, rgb, a);
      });
    }
    // os sprites do atlas não valem nesta passada (os desenhos 2D que usam R3D.blit não desenham nada)
    // (as opções dos modelos são as mesmas da vista isométrica: a matriz da raiz sai daqui)
    for (const it of Q) { it.ok = false; if (it.o && it.o.m3) it.o.m = null; }
    this.effects(ctx, t);
  },
  // Baú e terminal do mundo aberto em 3D (a placa das passagens e do portal vai nos efeitos)
  queueProp(n, place) {
    if (n.kind === 'chest') {
      if (n.data.secret && !n.used && dist(game.player.x, game.player.y, n.x, n.y) > 160) return;
      const o = n._o3p || (n._o3p = {});
      o.yaw = 0.6; o.scale = 1; o.lift = 0; o.roll = 0; o.pitch = 0; o.flash = 0; o.emi = 1; o.holo = false; o.ghost = null; o.tint = null;
      place(R3D.queue(this.propModel(n.used ? 'bauAberto' : 'bau'), null, null, o), n);
    } else if (n.kind === 'terminal') {
      const o = n._o3p || (n._o3p = {});
      o.yaw = 0; o.scale = 1; o.lift = 0; o.roll = 0; o.pitch = 0; o.flash = 0; o.emi = 1; o.holo = false; o.ghost = null; o.tint = null;
      place(R3D.queue(this.propModel('terminal'), null, null, o), n);
    } else if (n.kind === 'campanha' && !n.used) {
      // sinal e pistas da campanha do herói: cristal aceso girando (o anel e o nome vão nos efeitos)
      const o = n._o3p || (n._o3p = {});
      o.yaw = n.t * 0.8; o.scale = 1; o.lift = 0; o.roll = 0; o.pitch = 0; o.flash = 0; o.emi = 1; o.holo = false; o.ghost = null; o.tint = null;
      place(R3D.queue(this.propModel(`campanha:${n.sub}:${n.lightRgb}`), null, null, o), n);
    } else if (n.kind === 'coleta' && !n.used) {
      const o = n._o3p || (n._o3p = {});
      o.yaw = n.t * 0.4; o.scale = 1; o.lift = 0; o.roll = 0; o.pitch = 0; o.flash = 0; o.emi = 1; o.holo = false; o.ghost = null; o.tint = null;
      place(R3D.queue(this.propModel('coleta:' + n.data.rgb), null, null, o), n);
    } else if (n.modelo3D) {
      // estações, monumento e bancas da cidade (js/mundo/cidade.js): de frente para a rua
      const o = n._o3p || (n._o3p = {}), B = n.data && n.data.predio;
      o.yaw = n.cenId ? n.facing : B && B.lado === 'W' ? -Math.PI / 2 : 0; o.scale = n.escalaCen || 1; o.lift = 0; o.roll = 0; o.pitch = 0; o.flash = 0; o.emi = 1; o.holo = false; o.ghost = null; o.tint = null;
      place(R3D.queue(n.modelo3D(), null, null, o), n);
    } else if (n.kind === 'quadro' || (n.kind === 'evento' && n.sub !== 'fragmento' && !n.feito)) {
      // quadro de contratos, estandarte da incursão e carroça da caravana (js/mundo/povo.js, eventos.js)
      const o = n._o3p || (n._o3p = {});
      o.yaw = n.kind === 'quadro' ? 0.8 : 0.3; o.scale = 1; o.lift = 0; o.roll = 0; o.pitch = 0; o.flash = n.hitT > 0 ? 0.6 : 0; o.emi = 1; o.holo = false; o.ghost = null; o.tint = null;
      place(R3D.queue(this.propModel(n.kind === 'quadro' ? 'quadro' : n.sub), null, null, o), n);
    }
  },
  propModel(kind) {
    const C = this._props || (this._props = {});
    if (C[kind]) return C[kind];
    const g = new G3();
    if (kind === 'terminal') {
      g.box(0, 0, 18, 10, 10, 36, '#141a22', 0);
      g.box(0, 0, 40, 4, 22, 14, '#5ae6c8', 0.9);
    } else if (kind.startsWith('campanha:')) {
      const [, sub, rgb] = kind.split(':'), col = '#' + rgb.split(',').map((v) => (+v).toString(16).padStart(2, '0')).join(''), k = sub === 'sinal' ? 1.6 : 1;
      g.cyl(0, 0, 0, 7 * k, 7 * k, 2, 8, '#1a2030', 0);
      g.cyl(0, 0, 6 * k, 0.3, 4.5 * k, 8 * k, 4, col, 0.9);
      g.cyl(0, 0, 14 * k, 4.5 * k, 0, 16 * k, 4, col, 0.9);
    } else if (kind === 'quadro') {
      g.box(0, -14, 20, 3, 3, 40, '#2a2018', 0); g.box(0, 14, 20, 3, 3, 40, '#2a2018', 0);
      g.box(0, 0, 34, 2, 34, 22, '#3a2c20', 0);
      g.box(1.2, -8, 34, 0.5, 9, 12, '#e8dcc0', 0.15); g.box(1.2, 3, 35, 0.5, 8, 14, '#e8dcc0', 0.15); g.box(1.2, 12, 33, 0.5, 6, 9, '#e8dcc0', 0.15);
    } else if (kind === 'estandarte') {
      g.cyl(0, 0, 0, 1.6, 1.2, 70, 6, '#1a1418', 0);
      g.box(0, 9, 60, 0.6, 18, 16, '#ff785a', 0.7, { taper: 0.4 });
    } else if (kind === 'carroca') {
      g.box(0, 0, 12, 40, 22, 14, '#3a2c20', 0);
      g.cyl(-20, 0, 19, 12, 12, 40, 8, '#c8b898', 0, { axis: 'x' });
      for (const [x, y] of [[-14, -12], [14, -12], [-14, 12], [14, 12]]) g.cyl(x, y, 7, 7, 7, 3, 10, '#15110c', 0, { axis: 'y' });
    } else if (kind.startsWith('coleta:')) {
      // recurso de coleta: pontas finas e acesas na cor do bioma
      const col = '#' + kind.slice(7).split(',').map((v) => (+v).toString(16).padStart(2, '0')).join('');
      for (let k = 0; k < 5; k++) { const a = k * 1.26; g.cyl(Math.cos(a) * 3, Math.sin(a) * 3, 0, 2.2, 0, 10 + (k % 2) * 6, 5, col, 0.85); }
    } else {
      g.box(0, 0, 8, 30, 20, 16, '#3a2c22', 0);
      g.box(0, 0, 16.5, 31, 21, 1.4, '#ffbe5a', kind === 'bau' ? 0.8 : 0.1);
      if (kind === 'bau') g.box(0, 0, 21, 30, 20, 8, '#2a2018', 0, { taper: 0.85 });
      else g.box(-9, 0, 26, 4, 20, 18, '#2a2018', 0);
    }
    return (C[kind] = new Model3(new N3('prop', g)));
  },
  shadowModel() {
    if (this._sombra) return this._sombra;
    const g = new G3(), pts = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; pts.push([Math.cos(a), Math.sin(a), 0]); }
    g.poly(pts, '#030306', 0);
    return (this._sombra = new Model3(new N3('sombra', g)));
  },

  // Efeitos 2D do jogo na perspectiva: isoX/isoY passam a projetar o ponto do chão pela câmera
  effects(ctx, t) {
    const g = game, p = g.player, ix = isoX, iy = isoY, self = this;
    isoX = (x, y) => self.proj(x, y, 0).x;
    isoY = (x, y) => self.proj(x, y, 0).y;
    try {
      g.particles.drawSolid(ctx);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const e of g.enemies) {
        if (e.elite && e.state !== 'dying') GlowCache.drawFlat(ctx, '255,180,60', isoX(e.x, e.y), isoY(e.x, e.y), e.radius * 3.4, 0.4 + 0.12 * Math.sin(g.realTime * 5 + e.id));
      }
      // passagens e portal do mundo: o anel no chão e o nome
      for (const n of g.npcs) {
        const k = n.kind;
        if (k === 'gate' || k === 'portal' || k === 'campanha' || k === 'missao' || k === 'entrada' || k === 'tesouro' || (k === 'evento' && n.sub === 'fragmento')) { n.draw(ctx); n.drawEmissive(ctx); }
        else if (k === 'quadro' || k === 'evento') n.drawEmissive(ctx);   // brilho e vida da carroça (o modelo vai em 3D)
      }
      ctx.restore();
      p.drawAura(ctx, g.realTime);
      g.drawDanoDir(ctx);
      if (g.world) { Cidade.desenhar(ctx); Clima.desenharAr(ctx); }   // teletransporte; neblina, pegadas, vapor e fogueiras
      for (const e of g.enemies) {
        if (e.telegraph) drawTelegraph(ctx, e.telegraph, e.tgProgress, t);
        if (e.state === 'spawn') g.drawSpawnSigil(ctx, e);
      }
      g.hazards.draw(ctx, t);
      if (g.traps) g.traps.draw(ctx);
      g.pickups.draw(ctx, g.realTime);
      g.projectiles.draw(ctx);
      HeroObjects.draw(ctx);
      g.particles.drawEmissive(ctx);
      g.trails.draw(ctx);
      g.drawEclipseFx(ctx);
      g.arcs.draw(ctx, g.realTime);
      g.drawGlows(ctx);
      if (R3D && g.room.theme.rain) Backdrop.drawRain(ctx, g.realTime, 0.7);
      for (const e of g.enemies) if (!e.isBoss) e.drawHpBar(ctx);
      g.texts.draw(ctx);
    } finally {
      isoX = ix; isoY = iy;
    }
    // esquiva: linhas de velocidade nas bordas da tela (com o pós-processamento ligado)
    if (this.fovK > 0.08 && (typeof Settings === 'undefined' || Settings.v.postfx > 0)) {
      const r = mulberry32((Math.floor(g.realTime * 30) * 2654435761) >>> 0), cx = VIEW_W / 2, cy = VIEW_H * 0.45;
      ctx.save(); ctx.strokeStyle = `rgba(200,225,255,${(0.22 * this.fovK).toFixed(3)})`; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 26; i++) { const a = r() * TAU, d0 = VIEW_H * (0.42 + r() * 0.1), d1 = d0 + 60 + r() * 120; ctx.moveTo(cx + Math.cos(a) * d0 * 1.6, cy + Math.sin(a) * d0); ctx.lineTo(cx + Math.cos(a) * d1 * 1.6, cy + Math.sin(a) * d1); }
      ctx.stroke(); ctx.restore();
    }
  },
};
