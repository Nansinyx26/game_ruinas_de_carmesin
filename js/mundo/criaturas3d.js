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
  LOD_DIST: [380, 760, 1250],   // 3ª pessoa: distância do herói para trocar de LOD

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
    try { this.registrar(id, D); } catch (err) { this.estado[id] = 'falhou'; console.error(err); return; }
    this.estado[id] = 'pronto';
    D.peles = null;   // (os dados brutos já viraram as malhas)
    for (const k in D.clipes) { D.clipes[k].p = null; D.clipes[k].q = null; }
  },

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
  registrar(id, D) {
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
        const m = new Model3(raiz);
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

  // ------------------------------------------------------------------ escolha do clipe
  dur(C, nome) { const c = C.clipes[nome]; return c ? c.d : 1; },
  escolher(e, S, C, dt, agora) {
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
    // LOD: só a malha do nível escolhido (o modelo é compartilhado; a escolha vale para esta pose)
    const nv = Math.min(C.lods - 1, o && o.lodCri !== undefined ? o.lodCri : 0);
    for (const s of m.skins) s.hide = s.nivel !== nv;
  },
  // Opções do desenho: LOD e pose reaproveitada fora da tela
  opcoes(e, C) {
    const O = e._oCri || (e._oCri = {});
    O.cache = 0; O.lodCri = 0;
    const g = typeof game !== 'undefined' ? game : null;
    if (!g || !g.player) return O;
    if (typeof ThirdView !== 'undefined' && ThirdView.on) {
      const d = Math.hypot(e.x - g.player.x, e.y - g.player.y), L = this.LOD_DIST;
      O.lodCri = d < L[0] ? 0 : d < L[1] ? 1 : d < L[2] ? 2 : 3;
    } else if (g.camera) {
      const cam = g.camera, z = cam.zoom || 1, sx = isoX(e.x, e.y), sy = isoY(e.x, e.y);
      O.lodCri = z >= 0.9 ? 0 : z >= 0.6 ? 1 : 2;
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
