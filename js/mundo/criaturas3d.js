'use strict';
// ECLIPSE ZERO · Criaturas feitas no Blender (tools/blender/criaturas/) tocando no motor (Criaturas3D)
// ---------------------------------------------------------------------------
// Cada criatura chega convertida por tools/importar_criatura.py em js/assets/criaturas/<id>.js
// (carregado só quando a criatura aparece): esqueleto, malha com pele (até 4 LODs), texturas PBR
// (cor, metal/aspereza/emissão, normais) e as ANIMAÇÕES do Blender amostradas a 30 quadros por
// segundo (posição e quatérnio por osso).
// O tocador escolhe o clipe pelo estado da entidade (parado, andar/trotar/correr pela velocidade,
// bote do ataque dividido em preparo/golpe/volta, salto, dano, atordoado, morte, uivo de vez em
// quando no acampamento calmo), mistura os clipes em quatérnios (sem os saltos de ângulos de Euler)
// e escreve a pose nos ossos do modelo (N3) antes da pele (R3D.skin, quatérnios duplos).
// Desempenho: o LOD da malha vem da distância (3ª pessoa) ou do zoom (isométrica); fora da tela,
// a pose é reaproveitada por um quarto de segundo (R3D: o.cache).
// Sem o arquivo da criatura (ou antes de ele chegar), a entidade usa o modelo de sempre.
// ---------------------------------------------------------------------------
const Criaturas3D = {
  BASE: 'js/assets/criaturas/',
  dados: {},      // id → criatura decodificada (esqueleto, clipes, peles)
  estado: {},     // id → 'carregando' | 'falhou'
  MORTE: 1.3,     // segundos da morte de quem tem animação própria (o modelo de sempre: 0,45)
  // duração da mistura ao entrar em cada clipe (as ações entram rápido, o resto suave)
  MISTURA: { atacar: 0.07, saltar: 0.08, dano: 0.06, morte: 0.12, atordoado: 0.1, uivar: 0.35, idle: 0.25 },
  // velocidade (unidades/s) em que cada passada fica natural; acima ou abaixo, o clipe acelera
  PASSO: { andar: 55, trotar: 115, correr: 200 },
  LOD_DIST: [300, 650, 1150],   // 3ª pessoa: distância do herói para trocar de LOD (o LOD 0, ~17 mil triângulos, só de perto)

  // ------------------------------------------------------------------ carga
  carregar(id) {
    if (this.dados[id] || this.estado[id]) return;
    if (typeof CRIATURAS3D !== 'undefined' && CRIATURAS3D[id]) { this.carregado(id); return; }
    if (typeof document === 'undefined') return;
    this.estado[id] = 'carregando';
    const s = document.createElement('script');
    s.src = this.BASE + id + '.js';
    s.async = true;
    s.onerror = () => { this.estado[id] = 'falhou'; console.warn('Criaturas3D: não foi possível carregar ' + s.src); };
    document.head.appendChild(s);
  },
  pronto(id) { return !!this.dados[id]; },
  // Chamado pelo próprio js/assets/criaturas/<id>.js no fim
  carregado(id) {
    const D = typeof CRIATURAS3D !== 'undefined' && CRIATURAS3D[id];
    if (!D || this.dados[id] || typeof decodePeles3D !== 'function') return;
    // pelagem de outra criatura (D.base): o arquivo só traz as texturas; malha, esqueleto e
    // animações vêm da base (carregada uma vez e compartilhada)
    if (D.base) {
      if (!this.dados[D.base]) {
        (this.esperando[D.base] || (this.esperando[D.base] = [])).push(id);
        this.carregar(D.base);
        if (this.estado[D.base] === 'falhou') this.estado[id] = 'falhou';
        return;
      }
      try { this.registrar(id, D, this.dados[D.base]); } catch (err) { this.estado[id] = 'falhou'; console.error(err); return; }
      this.estado[id] = 'pronto';
      return;
    }
    try { this.registrar(id, D); } catch (err) { this.estado[id] = 'falhou'; console.error(err); return; }
    this.estado[id] = 'pronto';
    D.peles = null;   // (os dados brutos já viraram as malhas)
    for (const k in D.clipes) { D.clipes[k].p = null; D.clipes[k].q = null; }
    for (const v of this.esperando[id] || []) this.carregado(v);   // as pelagens que esperavam por esta base
    delete this.esperando[id];
  },
  esperando: {},

  // ------------------------------------------------------------------ decodificação
  bytes(b64) {
    const s = atob(b64), u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  },
  int16(b64) { const u = this.bytes(b64); return new Int16Array(u.buffer, 0, u.length >> 1); },
  // quatérnio [x, y, z, w] de R = Rz · Ry · Rx (a convenção do M3.trs)
  quat(r, o, k) {
    const cx = Math.cos(r[0] / 2), sx = Math.sin(r[0] / 2), cy = Math.cos(r[1] / 2), sy = Math.sin(r[1] / 2), cz = Math.cos(r[2] / 2), sz = Math.sin(r[2] / 2);
    o[k] = sx * cy * cz - cx * sy * sz;
    o[k + 1] = cx * sy * cz + sx * cy * sz;
    o[k + 2] = cx * cy * sz - sx * sy * cz;
    o[k + 3] = cx * cy * cz + sx * sy * sz;
  },
  // ângulos (rx, ry, rz) com R = Rz · Ry · Rx a partir do quatérnio
  euler(x, y, z, w, r) {
    const r20 = 2 * (x * z - w * y), r21 = 2 * (y * z + w * x), r22 = 1 - 2 * (x * x + y * y);
    const r10 = 2 * (x * y + w * z), r00 = 1 - 2 * (y * y + z * z);
    const sy = Math.max(-1, Math.min(1, -r20));
    r[1] = Math.asin(sy);
    if (Math.abs(sy) < 0.99999) { r[0] = Math.atan2(r21, r22); r[2] = Math.atan2(r10, r00); }
    else { r[0] = Math.atan2(-2 * (y * z - w * x), 1 - 2 * (x * x + z * z)); r[2] = 0; }
  },
  registrar(id, D, base) {
    if (base) {
      const C0 = base;
      const C = this.dados[id] = Object.assign({}, C0, { id, base: C0.id, tex: { src: D.tc, mat: D.tm, nrm: D.tn, pbr: true, bump: 0, emiB: true } });
      this.modelo(id, C);
      return;
    }
    const nb = D.ossos.length, idx = {};
    D.ossos.forEach((b, i) => { idx[b.n] = i; });
    const rest = new Float32Array(nb * 7);
    D.ossos.forEach((b, i) => { rest.set(b.p, i * 7); this.quat(b.r, rest, i * 7 + 3); });
    const clipes = {};
    for (const nome in D.clipes) {
      const c = D.clipes[nome];
      clipes[nome] = { n: c.n, d: c.d, ossos: Int16Array.from(c.ossos.map((o) => idx[o])), p: this.int16(c.p), q: this.int16(c.q), ip: 1 / c.pq };
    }
    // peles: uma por LOD (nome "corpo", "corpo_LOD1"…); o LOD 0 é a de nome sem sufixo
    const SK = decodePeles3D({ q: D.q, skins: D.peles, inv: D.inv });
    SK.forEach((s) => { const m = /_LOD(\d)$/.exec(s.nome || ''); s.nivel = m ? +m[1] : 0; });
    const lods = Math.max(...SK.map((s) => s.nivel)) + 1;
    const C = this.dados[id] = { id, nb, ossos: D.ossos, rest, clipes, SK, lods, fps: D.fps || 30, w: D.w, d: D.d, h: D.h, r: D.r,
      tex: { src: D.tc, mat: D.tm, nrm: D.tn, pbr: true, bump: 0, emiB: true } };
    this.modelo(id, C);
  },

  // O modelo do motor (MODELS3D['cri_' + id]) de uma criatura decodificada
  modelo(id, C) {
    const self = this;
    MODELS3D['cri_' + id] = {
      criatura: id,
      semTinta: true,   // a cor vem das texturas (a tinta das variantes não recolore)
      build() {
        const raiz = new N3('cri'), N = {};
        for (const b of C.ossos) {
          const n = new N3(b.n);
          n.p = b.p.slice(); n.r = b.r.slice(); n.s = b.s.slice();
          N[b.n] = n;
          (b.pai ? N[b.pai] : raiz).add(n);
        }
        // coleiras (acessórios dos animais de companhia, js/mundo/pets.js): presas ao pescoço
        const col = N.pescoco1 ? self.coleiras(C) : null;
        if (col) for (const k in col) { const n = new N3('coleira_' + k); n.geo = col[k]; N.pescoco1.add(n); }
        const m = new Model3(raiz);
        if (col) { m.coleiras = {}; for (const k in col) m.coleiras[k] = m.nodes['coleira_' + k]; }
        // peças da espécie que a malha base não tem (chifres, crista, cascos)
        for (const [osso, geo] of self.acessorios(C)) if (m.nodes[osso]) { const n = new N3('acess_' + osso + '_' + Math.random().toString(36).slice(2, 6)); n.geo = geo; m.nodes[osso].add(n); }
        m.skins = instPeles3D(C.SK, m);
        m.skins.forEach((s, i) => { s.nivel = C.SK[i].nivel; });
        m.ossosN = C.ossos.map((b) => m.nodes[b.n]);
        m.tex = C.tex;
        m.dqs = true;          // pele por quatérnios duplos (R3D.skin)
        m.mixProprio = true;   // a mistura entre clipes é feita aqui, em quatérnios (R3D.misturar fica de fora)
        return m;
      },
      pose(m, e, o) { self.posar(m, e, o, C); },
      opts(e) { return self.opcoes(e, C); },
    };
  },

  // ------------------------------------------------------------------ coleiras
  // Geometria das coleiras no espaço do osso do pescoço (o eixo do osso é +Z): o raio e a altura
  // vêm dos vértices da própria malha presos ao pescoço; a plaqueta vai no ponto mais baixo
  COLEIRAS: { couro: ['#4a2a14', 2, 0, '#b08840'], ferro: ['#5c6068', 1, 0, '#c8ccd2'], neon: ['#123040', 1, 0.9, '#5ff0ff'] },
  // malhas enviadas que já trazem a coleira modelada (o beagle, com a plaquinha da pata)
  COLEIRA_PROPRIA: new Set(['beagle']),
  coleiras(C) {
    if (C.coleirasGeo !== undefined) return C.coleirasGeo;
    C.coleirasGeo = null;
    if (C.ossos.some((b) => b.n === 'ombro.L')) return null;   // aves (asas): sem coleira (o osso do pescoço pega o peito todo)
    if (this.COLEIRA_PROPRIA.has(C.id) || this.COLEIRA_PROPRIA.has(C.base)) return null;   // a malha já vem com a coleira dela
    const S = C.SK.find((s) => s.nivel === 0) || C.SK[0], k = S.ossos.indexOf('pescoco1');
    if (k < 0) return null;
    // a fatia da malha ao longo do osso do pescoço (no espaço do osso, o eixo é +Z): o raio do
    // pelo em volta dele (os pesos não servem: o pescoço divide o peso com o peito e a cabeça)
    const I = S.inv.subarray(k * 12, k * 12 + 12), R = [];
    const filho = C.ossos.find((b) => b.n === 'pescoco2'), comp = filho ? Math.hypot(filho.p[0], filho.p[1], filho.p[2]) : 4;
    const z0 = comp * 0.3, z1 = comp * 0.75, nv = S.pos.length / 3;
    for (let v = 0; v < nv; v++) {
      const x = S.pos[v * 3], y = S.pos[v * 3 + 1], z = S.pos[v * 3 + 2];
      const bz = I[8] * x + I[9] * y + I[10] * z + I[11];
      if (bz < z0 || bz > z1) continue;
      R.push(Math.hypot(I[0] * x + I[1] * y + I[2] * z + I[3], I[4] * x + I[5] * y + I[6] * z + I[7]));
    }
    if (R.length < 12) return null;
    R.sort((a, b) => a - b);
    const med = R[Math.floor(R.length / 2)], Rn = R.filter((r) => r < med * 2.2);
    const raio = Rn[Math.floor(Rn.length * 0.7)], zc = (z0 + z1) / 2, alt = Math.max(0.8, comp * 0.18);
    // o ponto mais baixo do anel no modelo, para a plaqueta (a rotação do osso é ortonormal: a
    // inversa é a transposta, então o z do modelo de um ponto do osso (cos a, sin a) é I[2]·cos + I[6]·sin)
    let melhor = 0, zmin = 1e9;
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, lz = I[2] * Math.cos(a) + I[6] * Math.sin(a); if (lz < zmin) { zmin = lz; melhor = a; } }
    C.coleiraInfo = { raio, zc, alt, n: R.length };
    const out = {};
    for (const nome in this.COLEIRAS) {
      const [cor, mat, emi, metal] = this.COLEIRAS[nome], g = new G3();
      g.cyl(0, 0, zc - alt / 2, raio, raio, alt, 18, cor, emi);
      g.cyl(0, 0, zc - alt / 2, raio * 0.96, raio * 0.96, alt, 18, cor, emi);
      const nFaixa = g.d.length;
      const tx = Math.cos(melhor) * (raio + 0.35), ty = Math.sin(melhor) * (raio + 0.35);
      g.at(tx, ty, zc - alt * 0.9, 0, 0, melhor);
      g.box(0, 0, 0, 0.5, 0.9, 1.2, metal, nome === 'neon' ? 1 : 0);   // a plaqueta (ou o cristal da neon)
      g.at();
      const d = new Float32Array(g.d);
      // formato do programa com textura (vértices de cor): o material vai no canal azul; a faixa no
      // material da coleira, a plaqueta em metal
      for (let i = 0; i < d.length; i += 10) d[i + 8] = -1 - d[i + 8] - 2 * (i < nFaixa ? mat : 1);
      out[nome] = d;
    }
    C.coleirasGeo = out;
    return out;
  },

  // ------------------------------------------------------------------ peças da espécie
  // id da criatura (ou da base dela) → peças que a malha remodelada não tem: bico
  // chato (pato, ganso). Medidas na fatia da malha no espaço de cada osso, como as coleiras. (A
  // galinha enviada já traz crista e barbela modeladas; a 'crista' continua aqui para quem precisar.)
  ACESSORIOS: {
    // (a cabra real, assets/Creatures/DomesticAnimals/cabra, já traz os chifres na malha)
    pato: [['bico_chato', 'cabeca']],
    ganso: [['bico_chato', 'cabeca']],
  },
  fatia(C, osso, f0, f1) {
    const S = C.SK.find((s) => s.nivel === 0) || C.SK[0], k = S.ossos.indexOf(osso);
    if (k < 0) return null;
    const I = S.inv.subarray(k * 12, k * 12 + 12), P = [];
    const nv = S.pos.length / 3, B = (v) => { const x = S.pos[v * 3], y = S.pos[v * 3 + 1], z = S.pos[v * 3 + 2];
      return [I[0] * x + I[1] * y + I[2] * z + I[3], I[4] * x + I[5] * y + I[6] * z + I[7], I[8] * x + I[9] * y + I[10] * z + I[11]]; };
    // o comprimento do osso pelos vértices que ele comanda (o filho mais perto pode nascer na base, como a mandíbula)
    let comp = 0;
    for (let v = 0; v < nv; v++) {
      let w = 0;
      for (let j = 0; j < 4; j++) if (S.bi[v * 4 + j] === k) w += S.bw[v * 4 + j];
      if (w >= 0.5) comp = Math.max(comp, B(v)[2]);
    }
    if (comp <= 0.5) return null;
    for (let v = 0; v < nv; v++) {
      const q = B(v);
      if (q[2] < comp * f0 || q[2] > comp * f1 || Math.hypot(q[0], q[1]) > comp * 1.3) continue;
      P.push(q);
    }
    // direções do mundo no espaço do osso (a rotação é ortonormal: as colunas da inversa)
    const cima = [I[2], I[6], I[10]], frente = [I[0], I[4], I[8]];
    return { P, comp, cima, frente, lado: [cima[1] * frente[2] - cima[2] * frente[1], cima[2] * frente[0] - cima[0] * frente[2], cima[0] * frente[1] - cima[1] * frente[0]] };
  },
  // segmento de cilindro de a até b (G3.cyl é no eixo z: gira z para a direção do segmento)
  segmento(g, a, b, r0, r1, cor, mat) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / L, uy = dy / L, uz = dz / L, rx = Math.asin(Math.max(-1, Math.min(1, -uy))), ry = Math.atan2(ux, uz);
    g.at(a[0], a[1], a[2], rx, ry, 0);
    g.cyl(0, 0, 0, r0, r1, L, 8, cor);
    g.at();
  },
  acessorios(C) {
    if (C.acessGeo) return C.acessGeo;
    const L = this.ACESSORIOS[C.id] || this.ACESSORIOS[C.base] || [], out = [];
    const add = (v, k) => [v[0] * k, v[1] * k, v[2] * k], soma = (...vs) => vs.reduce((a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]], [0, 0, 0]);
    const fim = (g, mat) => { const d = new Float32Array(g.d); for (let i = 0; i < d.length; i += 10) d[i + 8] = -1 - d[i + 8] - 2 * mat; return d; };
    for (const [tipo, osso] of L) {
      const F = this.fatia(C, osso, tipo === 'casco' ? 0.0 : tipo === 'bico_chato' ? 0.6 : 0.05, tipo === 'casco' ? 1.0 : tipo === 'bico_chato' ? 1.05 : 0.5);
      if (!F || F.P.length < 8) continue;
      const proj = (p, d) => p[0] * d[0] + p[1] * d[1] + p[2] * d[2];
      const g = new G3();
      if (tipo === 'bico_chato') {
        // bico de pato: uma cunha larga e achatada, laranja, sobre o bico curvo da base (na ponta da cabeça)
        let ponta = F.P[0];
        for (const p of F.P) if (proj(p, F.frente) > proj(ponta, F.frente)) ponta = p;
        const larg = Math.max(...F.P.map((p) => Math.abs(proj(p, F.lado))));
        const base = soma(ponta, add(F.frente, -F.comp * 0.22));
        for (let i = 0; i < 4; i++) {
          const t = i / 3, c = soma(base, add(F.frente, F.comp * 0.32 * t), add(F.cima, -0.4 - 0.3 * t));
          g.at(c[0], c[1], c[2], 0, 0, Math.atan2(F.frente[1], F.frente[0]));
          g.box(0, 0, 0, F.comp * 0.14, larg * (0.62 - 0.12 * t), 0.9 - 0.2 * t, '#e08a1e', 0);
          g.at();
        }
      } else if (tipo === 'chifres' || tipo === 'crista') {
        // o alto do crânio: o vértice mais alto da fatia de trás da cabeça
        let topo = F.P[0];
        for (const p of F.P) if (proj(p, F.cima) > proj(topo, F.cima)) topo = p;
        const larg = Math.max(...F.P.map((p) => Math.abs(proj(p, F.lado))));
        if (tipo === 'chifres') {
          for (const s of [-1, 1]) {
            let a = soma(topo, add(F.lado, s * larg * 0.32), add(F.cima, -0.4));
            const Lc = F.comp * 0.55;
            for (let i = 0; i < 6; i++) {
              const t = (i + 1) / 6, b = soma(soma(topo, add(F.lado, s * larg * (0.32 + 0.15 * t))), add(F.cima, Lc * Math.sin(t * 1.7) * 0.75), add(F.frente, -Lc * (1 - Math.cos(t * 1.7)) * 0.9));
              this.segmento(g, a, b, 0.9 * (1 - (i / 6) * 0.8), 0.9 * (1 - ((i + 1) / 6) * 0.8), '#5a4632', 2);
              a = b;
            }
          }
        } else {
          // crista: 4 lóbulos vermelhos em fila no alto; barbela: 2 gotas debaixo do bico
          for (let i = 0; i < 4; i++) {
            const c = soma(topo, add(F.frente, (i - 1.2) * F.comp * 0.12), add(F.cima, 0.6 + 0.5 * Math.sin((i / 3) * Math.PI)));
            g.at(c[0], c[1], c[2]); g.box(0, 0, 0, 0.7, 0.7, 1.5 + 0.6 * Math.sin((i / 3) * Math.PI), '#c81e1e', 0); g.at();
          }
          let baixo = F.P[0];
          for (const p of F.P) if (proj(p, F.cima) < proj(baixo, F.cima) && proj(p, F.frente) > proj(baixo, F.frente) - 1) baixo = p;
          for (const s of [-1, 1]) { const c = soma(baixo, add(F.lado, s * 0.5), add(F.cima, -0.8)); g.at(c[0], c[1], c[2]); g.box(0, 0, 0, 0.6, 0.5, 1.4, '#b01818', 0); g.at(); }
        }
      } else if (tipo === 'casco') {
        // casco: um tronco de cone escuro em volta da pata (o eixo do osso)
        const R = F.P.map((p) => Math.hypot(p[0], p[1])).sort((a, b) => a - b), r = R[Math.floor(R.length * 0.75)] * 1.04;
        g.cyl(0, 0, F.comp * 0.05, r * 1.08, r * 0.95, F.comp * 0.9, 12, '#1c1712');
      }
      out.push([osso, fim(g, tipo === 'crista' || tipo === 'bico_chato' ? 0 : 2)]);
    }
    C.acessGeo = out;
    return out;
  },

  // ------------------------------------------------------------------ escolha do clipe
  dur(C, nome) { const c = C.clipes[nome]; return c ? c.d : 1; },
  escolher(e, S, C, dt, agora) {
    if (e.petClipe) return e.petClipe(S, C, dt, agora);   // animais de companhia e da vitrine (js/mundo/pets.js)
    const st = e.state, d = (n) => this.dur(C, n);
    const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    if (st === 'dying' || st === 'dead') return ['morte', Math.min(d('morte'), (e.stateTime || 0) * d('morte') / ((e.morteDur || 0.45) * 0.8))];
    if (st === 'stun') { S.fs += dt; return ['atordoado', S.fs % d('atordoado')]; }
    // o bote: preparo (abaixa), golpe (avança e morde) e volta, nas fases do clipe "atacar"
    const dA = d('atacar'), A1 = 0.29 * dA, A2 = 0.5 * dA;
    if (st === 'windup') return ['atacar', cl(typeof e.tgProgress === 'number' ? e.tgProgress : e.stateTime / 0.42) * A1];
    if (st === 'attack') return ['atacar', A1 + cl(e.stateTime / 0.12) * (A2 - A1)];
    if (st === 'recover') return ['atacar', A2 + cl(e.stateTime / 0.42) * (dA - A2)];
    if (st === 'dash' || st === 'evade' || st === 'stomp' || st === 'charge') return ['saltar', cl(e.stateTime / 0.45) * d('saltar')];
    if (e.recuoT > 0 && e.recuoDur) return ['dano', cl(1 - e.recuoT / e.recuoDur) * d('dano')];
    const v = Math.hypot(e.vx || 0, e.vy || 0);
    if (v > 14) {
      S.uivo = false;
      const nome = v < 80 ? 'andar' : v < 160 ? 'trotar' : 'correr';
      const ref = this.PASSO[nome], taxa = Math.max(0.55, Math.min(1.7, v / ref));
      S.fl = (S.fl + dt * taxa / d(nome)) % 1;   // uma fase só para as três passadas (os pés seguem em sincronia na troca)
      return [nome, S.fl * d(nome)];
    }
    // parado: de vez em quando, no acampamento calmo, um uivo
    if (S.uivo) {
      const t = agora - S.uivoIni;
      if (t < d('uivar')) return ['uivar', t];
      S.uivo = false;
    }
    if (C.clipes.uivar && e.dormant && !e.voltando) {
      S.uivoT -= dt;
      const alerta = e.camp && typeof Encontros !== 'undefined' && Encontros.fase(e.camp) === 'alerta';
      if (S.uivoT <= 0 && !alerta) { S.uivoT = 20 + Math.random() * 30; S.uivo = true; S.uivoIni = agora; return ['uivar', 0]; }
    }
    S.fi += dt;
    return ['idle', S.fi % d('idle')];
  },

  // ------------------------------------------------------------------ pose
  amostrar(c, t, out, fps) {
    const n = c.n, f = Math.max(0, Math.min(n - 1, t * fps)), i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1), a = f - i0;
    const nb = c.ossos.length, P = c.p, Q = c.q, ip = c.ip;
    for (let j = 0; j < nb; j++) {
      const k = c.ossos[j] * 7, p0 = (i0 * nb + j) * 3, p1 = (i1 * nb + j) * 3, q0 = (i0 * nb + j) * 4, q1 = (i1 * nb + j) * 4;
      out[k] = (P[p0] + (P[p1] - P[p0]) * a) * ip;
      out[k + 1] = (P[p0 + 1] + (P[p1 + 1] - P[p0 + 1]) * a) * ip;
      out[k + 2] = (P[p0 + 2] + (P[p1 + 2] - P[p0 + 2]) * a) * ip;
      let x = Q[q0] + (Q[q1] - Q[q0]) * a, y = Q[q0 + 1] + (Q[q1 + 1] - Q[q0 + 1]) * a, z = Q[q0 + 2] + (Q[q1 + 2] - Q[q0 + 2]) * a, w = Q[q0 + 3] + (Q[q1 + 3] - Q[q0 + 3]) * a;
      const l = Math.hypot(x, y, z, w) || 1;
      out[k + 3] = x / l; out[k + 4] = y / l; out[k + 5] = z / l; out[k + 6] = w / l;
    }
  },
  posar(m, e, o, C) {
    const agora = typeof e.animTime === 'number' ? e.animTime : 0;
    let S = e._cri;
    if (!S || S.id !== C.id) {
      S = e._cri = { id: C.id, clipe: null, t: agora, k: 1, dur: 0.2, fl: Math.random(), fi: Math.random() * 3, fs: 0,
        uivo: false, uivoIni: 0, uivoT: 6 + Math.random() * 24, de: new Float32Array(C.nb * 7), sai: new Float32Array(C.nb * 7) };
      S.sai.set(C.rest);
    }
    const dt = Math.min(0.1, Math.max(0, agora - S.t));
    S.t = agora;
    const [nome, t] = this.escolher(e, S, C, dt, agora);
    const c = C.clipes[nome] || C.clipes.idle;
    if (S.clipe !== nome) {
      if (S.clipe) { S.de.set(S.sai); S.k = 0; S.dur = this.MISTURA[nome] || 0.18; }
      S.clipe = nome;
    }
    const out = S.sai;
    out.set(C.rest);
    if (c) this.amostrar(c, t, out, C.fps);
    if (S.k < 1) {
      S.k = Math.min(1, S.k + dt / S.dur);
      const u = S.k * S.k * (3 - 2 * S.k), F = S.de;
      for (let k = 0; k < out.length; k += 7) {
        out[k] = F[k] + (out[k] - F[k]) * u; out[k + 1] = F[k + 1] + (out[k + 1] - F[k + 1]) * u; out[k + 2] = F[k + 2] + (out[k + 2] - F[k + 2]) * u;
        const sg = F[k + 3] * out[k + 3] + F[k + 4] * out[k + 4] + F[k + 5] * out[k + 5] + F[k + 6] * out[k + 6] < 0 ? -1 : 1;
        let x = F[k + 3] + (out[k + 3] * sg - F[k + 3]) * u, y = F[k + 4] + (out[k + 4] * sg - F[k + 4]) * u;
        let z = F[k + 5] + (out[k + 5] * sg - F[k + 5]) * u, w = F[k + 6] + (out[k + 6] * sg - F[k + 6]) * u;
        const l = Math.hypot(x, y, z, w) || 1;
        out[k + 3] = x / l; out[k + 4] = y / l; out[k + 5] = z / l; out[k + 6] = w / l;
      }
    }
    const B = m.ossosN;
    for (let i = 0; i < B.length; i++) {
      const n = B[i], k = i * 7;
      n.p[0] = out[k]; n.p[1] = out[k + 1]; n.p[2] = out[k + 2];
      this.euler(out[k + 3], out[k + 4], out[k + 5], out[k + 6], n.r);
    }
    // coleira do animal (por entidade: o modelo é compartilhado)
    if (m.coleiras) { const c = e.coleira !== undefined ? e.coleira : e.pet ? e.pet.coleira : null; for (const k in m.coleiras) m.coleiras[k].vis = c === k; }
    // LOD: só a malha do nível escolhido (o modelo é compartilhado; a escolha vale para esta pose)
    const nv = Math.min(C.lods - 1, o && o.lodCri !== undefined ? o.lodCri : 0);
    for (const s of m.skins) s.hide = s.nivel !== nv;
  },
  // Opções do desenho: LOD e pose reaproveitada fora da tela
  opcoes(e, C) {
    const O = e._oCri || (e._oCri = {});
    O.cache = 0; O.lodCri = 0; O.lift = e.alt || 0;   // (alt: a ave de companhia voando)
    const g = typeof game !== 'undefined' ? game : null;
    if (!g || !g.player) return O;
    if (typeof ThirdView !== 'undefined' && ThirdView.on) {
      const d = Math.hypot(e.x - g.player.x, e.y - g.player.y), L = this.LOD_DIST;
      O.lodCri = d < L[0] ? 0 : d < L[1] ? 1 : d < L[2] ? 2 : 3;
    } else if (g.camera) {
      const cam = g.camera, z = cam.zoom || 1, sx = isoX(e.x, e.y), sy = isoY(e.x, e.y);
      O.lodCri = z >= 1.25 ? 0 : z >= 0.8 ? 1 : 2;   // (na isométrica de sempre, o LOD 1: as pontas finas do LOD 0 só aparecem de perto)
      const fora = Math.abs(sx - cam.x) > VIEW_W / (2 * z) + 140 || Math.abs(sy - cam.y) > VIEW_H / (2 * z) + 160;
      if (fora && e.state !== 'dying') { O.cache = 0.25; O.lodCri = Math.max(O.lodCri, 2); }   // fora da tela: pose guardada e malha leve
    }
    return O;
  },

  // ------------------------------------------------------------------ inimigos
  // Chave do modelo 3D de um inimigo: a criatura da variante (ENEMY_VARIANTS[...].modelo) quando
  // já carregada; senão o modelo de sempre (e pede a criatura)
  chave(e) {
    const V = e.variante && typeof ENEMY_VARIANTS !== 'undefined' ? ENEMY_VARIANTS[e.variante] : null, id = V && V.modelo;
    if (!id) return null;
    if (this.dados[id]) { e.cri = id; return 'cri_' + id; }
    this.carregar(id);
    return null;
  },
  // Troca de zona: pede de antemão as criaturas dos inimigos que já estão nela
  aoCarregar() {
    if (typeof game === 'undefined' || !game.enemies) return;
    for (const e of game.enemies) this.chave(e);
  },
};
