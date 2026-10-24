'use strict';
// ECLIPSE ZERO · Inspetor 3D (só em modo dev)
// ---------------------------------------------------------------------------
// Abre pelo console de desenvolvimento (` → inspect), por dev.inspect() no console do
// navegador ou com ?dev=1&inspect=1 no endereço. Mostra um modelo 3D do jogo (padrão: o Kael
// com a arte oficial, MODELS3D.kaelTex) com o mesmo motor (R3D) e as mesmas poses do jogo:
//   FRENTE, COSTAS, PERFIL ESQUERDO e PERFIL DIREITO: vistas ortográficas, sem a distorção
//     horizontal da projeção isométrica, na mesma escala da arte de referência
//   PERSPECTIVA: a vista do jogo (isométrica), girando com Q/E
//   POSE NEUTRA DO RIG: pose de repouso em raio-x com os ossos e as juntas
// A arte de referência (js/assets/<id>_ref.js, gerada pelos tools/gerar_*3d.py) é carregada
// só quando o inspetor abre e aparece ao lado (F) ou sobreposta ao modelo (O).
// Teclas: 1–6 vista · 0 as 6 vistas lado a lado · ←/→ animação · ↑/↓ modelo · espaço pausa
//   · R ossos · F referência ao lado · O referência sobreposta · +/− zoom · W/S sobe e desce · Q/E gira
//   · L nível de detalhe · D liga/desliga as peças de detalhe · Esc ou ` fecha.
// Controle: direcional (animação/modelo), A/✕ pausa, B/○ fecha.
// ---------------------------------------------------------------------------
const Inspector3D = (() => {
  // Direções da câmera isométrica no mundo: para o observador (V), para cima na tela (U), para a esquerda (L)
  const ISO_V = [0.57735, 0.57735, 0.57735], ISO_U = [-0.40825, -0.40825, 0.8165], ISO_L = [-0.70711, 0.70711, 0];
  const SY_U = 1.22474;         // pixels por unidade na vertical da vista ortográfica (e 1,414 na horizontal)
  const ASPECTO = SY_U / 1.41421;
  const VIEWS = [
    { id: 'front', nome: 'FRENTE', f: [1, 0, 0] },
    { id: 'back', nome: 'COSTAS', f: [-1, 0, 0] },
    { id: 'sideL', nome: 'PERFIL ESQUERDO', f: [0, -1, 0] },
    { id: 'sideR', nome: 'PERFIL DIREITO', f: [0, 1, 0] },
    { id: 'persp', nome: 'PERSPECTIVA (JOGO)' },
    { id: 'rig', nome: 'POSE NEUTRA DO RIG', f: [0.866, 0.5, 0], rig: true },
  ];
  const MODELOS = ['kaelTex', 'kael', 'orion', 'orionTex', 'lyra', 'lyraTex', 'drakos', 'drakosTex', 'sera', 'seraTex'];
  const REF_ARQ = { kaelTex: ['kael', 'js/assets/kael_ref.js'], kael: ['kael', 'js/assets/kael_ref.js'] };
  // Animações do jogo: cada uma prepara o jogador de mostra no tempo t
  const atk = (id) => (p, t) => {
    const d = ATTACKS[id], tot = d.windup + d.active + d.recovery, tt = t % (tot + 0.35);
    p.state = 'attack'; p.stateTime = tt; p.animTime = t; p.fury = 60;
    if (!p.attack || p.attack.id !== id) p.attack = { id, def: d, t: 0, dir: p.facing, hits: new Map(), counts: new Map(), charge: 0, mult: 1 };
    p.attack.t = Math.min(tt, tot - 0.001); p.attack.dir = p.facing;
  };
  const ANIMS = [
    ['repouso', (p, t) => { p.state = 'idle'; p.animTime = t; p.stateTime = t; }],
    ['caminhada', (p, t) => { p.state = 'run'; p.animTime = t; p.moveSpeed = 110; }],
    ['corrida', (p, t) => { p.state = 'run'; p.animTime = t; p.moveSpeed = 235; }],
    ['salto (golpe especial)', (p, t) => { const s = t % 1.4; p.state = 'special'; p.stateTime = s; p.animTime = t; p.z = Math.max(0, Math.sin(Math.min(1, s / 0.9) * Math.PI)) * 26; }],
    ['esquiva', (p, t) => { p.state = 'dash'; p.stateTime = (t % 0.5) * 0.5; p.animTime = t; p.moveSpeed = 800; }],
    // pulo, queda e aterrissagem (js/heroes/pulo_defesa.js): a física do pulo em ciclo
    ['pulo, queda e aterrissagem', (p, t) => {
      const s = t % 1.1, T = 2 * PULO.V0 / PULO.G;
      p.state = 'idle'; p.animTime = t; p.stateTime = t;
      if (s < T) { p.z = Math.max(0, PULO.V0 * s - PULO.G * s * s / 2); p.vz = PULO.V0 - PULO.G * s; }
      else p.landT = Math.max(0, PULO.ATERRA - (s - T));
    }],
    ['mergulho', (p, t) => { const s = t % 0.7; p.wpnOut = true; p.state = 'plunge'; p.stateTime = s; p.animTime = t; p.z = Math.max(0, 40 - s * 90); p.vz = -PULO.MERGULHO; }],
    ['defesa (golpe a cada 1 s)', (p, t) => { p.wpnOut = true; p.state = 'block'; p.stateTime = t % 3; p.animTime = t; p.flash = t % 1 < 0.08 ? 0.06 : 0; }],
    ['ataque leve 1', atk('light1')], ['ataque leve 2', atk('light2')], ['ataque leve 3', atk('light3')],
    ['ataque pesado', atk('heavy')], ['giro', atk('spin')], ['estocada', atk('thrust')], ['impacto', atk('slam')],
    ['gancho', atk('uppercut')], ['carregado', atk('charged')], ['investida', atk('lunge')],
    ['habilidade: onda', atk('wave')], ['habilidade: volt', atk('volt')], ['habilidade: raio', atk('zap')],
    ['habilidade: plasma', atk('plasma')], ['habilidade: tempestade', atk('storm')],
    ['carga', (p, t) => { p.state = 'charge'; p.chargeLevel = Math.min(2, (t % 2.4) * 1.1); p.animTime = t; p.stateTime = t % 2.4; }],
    ['dano', (p, t) => { p.state = 'hurt'; p.stateTime = (t % 0.8) * 0.3; p.animTime = t; }],
    ['morte', (p, t) => { p.state = 'dead'; p.stateTime = Math.min(t % 2.6, 1.6); p.animTime = t; }],
  ];
  // Ossos: ponta dos ossos-folha (no espaço do nó) para desenhar o último segmento
  const PONTAS = { head: [0, 0, 11], footL: [4, 0, -3], footR: [4, 0, -3], blade: [50, 0, 0] };
  const SEM_OSSO = new Set(['root', 'fall']);

  const I = {
    open: false, view: 0, grid: true, anim: 0, model: 0, t: 0, paused: false,
    bones: true, side: true, onion: false, zoom: 1, yaw: 0.35, lod: 0, keys: [],
    inst: {}, ent: null, refs: {}, imgs: {}, mats: [], loading: {},

    init() {
      if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;
      window.addEventListener('keydown', (e) => this.onKey(e), true);
      try { if (/[?&]inspect=1(&|$)/.test(location.search)) setTimeout(() => this.toggle(true), 0); } catch (e) { /* sem endereço */ }
    },
    toggle(on) {
      this.open = !!on; this.keys.length = 0;
      if (typeof R3D !== 'undefined') R3D.lodForce = this.open ? this.lod : 0;
      if (this.open) this.loadRef(this.key());
      return this.open;
    },
    key() { return this.models()[this.model] || 'kael'; },
    models() { return MODELOS.concat(Object.keys(MODELS3D).filter((k) => k.indexOf('arm_') === 0)).filter((k) => MODELS3D[k]); },   // e as armaduras já carregadas

    // Referência da arte: script de dados carregado sob demanda (data URI: não suja o canvas)
    loadRef(key) {
      const r = REF_ARQ[key];
      if (!r || (window.REF3D && REF3D[r[0]]) || this.loading[r[1]]) return;
      this.loading[r[1]] = true;
      const s = document.createElement('script');
      s.src = r[1];
      s.onerror = () => console.warn('[inspetor] referência indisponível:', r[1]);
      document.head.appendChild(s);
    },
    ref(key, v) {
      const r = REF_ARQ[key], R = r && window.REF3D && REF3D[r[0]];
      const d = R && R.vistas[v];
      if (!d) return null;
      const id = r[0] + ':' + v;
      let im = this.imgs[id];
      if (!im) { im = this.imgs[id] = new Image(); im.src = d.src; }
      return im.complete && im.naturalWidth ? { d, im, altura: R.altura } : null;
    },
    // Uma instância do modelo por vista (os ossos são lidos de cada uma depois do desenho)
    instance(key, i) {
      const a = this.inst[key] || (this.inst[key] = []);
      if (!a[i]) { try { a[i] = MODELS3D[key].build(); } catch (e) { console.error(e); return null; } }
      return a[i];
    },
    altura(key) {
      if (key.endsWith('Tex') && key !== 'kaelTex' && window.HERO3D) { const h = HERO3D[key.slice(0, -3)]; if (h) return h.altura; }
      return 62.1;
    },

    onKey(e) {
      if (!this.open) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.repeat && !/^Arrow/.test(e.key)) return;
      const k = e.key, map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Escape: 'close', '`': 'close', ' ': 'pause' };
      if (e.code === 'Backquote') { this.keys.push('close'); return; }
      if (map[k]) { this.keys.push(map[k]); return; }
      if (k >= '1' && k <= '6') { this.keys.push('v' + k); return; }
      if (k === '0') { this.keys.push('grid'); return; }
      const low = k.toLowerCase();
      if ('rfoqelwsd'.includes(low) && low.length === 1) this.keys.push(low);
      else if (k === '+' || k === '=') this.keys.push('zin');
      else if (k === '-' || k === '_') this.keys.push('zout');
    },
    update(dt, inp) {
      if (!this.open) return false;
      if (!this.paused) this.t += dt;
      const ev = this.keys.splice(0);
      if (inp.pressed.left) ev.push('left');
      if (inp.pressed.right) ev.push('right');
      if (inp.pressed.up) ev.push('up');
      if (inp.pressed.down) ev.push('down');
      if (inp.pressed.confirm) ev.push('pause');
      if (inp.pressed.back || inp.pressed.pause) ev.push('close');
      const nm = this.models().length;
      for (const k of ev) {
        if (k === 'close') { this.toggle(false); return true; }
        if (k === 'left') this.anim = (this.anim + ANIMS.length - 1) % ANIMS.length;
        else if (k === 'right') this.anim = (this.anim + 1) % ANIMS.length;
        else if (k === 'up' || k === 'down') { this.model = (this.model + (k === 'up' ? nm - 1 : 1)) % nm; this.loadRef(this.key()); }
        else if (k === 'pause') this.paused = !this.paused;
        else if (k === 'grid') this.grid = true;
        else if (k[0] === 'v') { this.view = +k[1] - 1; this.grid = false; }
        else if (k === 'r') this.bones = !this.bones;
        else if (k === 'f') this.side = !this.side;
        else if (k === 'o') this.onion = !this.onion;
        else if (k === 'q') this.yaw -= 0.39;
        else if (k === 'e') this.yaw += 0.39;
        else if (k === 'l') { this.lod = (this.lod + 1) % 3; R3D.lodForce = this.lod; }
        else if (k === 'zin') this.zoom = Math.min(3, this.zoom * 1.2);
        else if (k === 'zout') this.zoom = Math.max(0.4, this.zoom / 1.2);
        else if (k === 'd') this.det = this.det === false;
        else if (k === 'w') this.pan = Math.min(0.95, (this.pan || 0) + 0.08);
        else if (k === 's') this.pan = Math.max(-0.2, (this.pan || 0) - 0.08);
      }
      return true;
    },

    // Matriz da raiz de uma vista ortográfica: f (eixo do modelo voltado ao observador) → V,
    // +Z → U e o lado (Z × f) → L; lift sobe o modelo
    matrix(i, f, lift) {
      const M = this.mats[i] || (this.mats[i] = new Float32Array(12));
      const s0 = -f[1], s1 = f[0];
      for (let r = 0; r < 3; r++) {
        M[r * 4] = ISO_V[r] * f[0] + ISO_L[r] * s0;
        M[r * 4 + 1] = ISO_V[r] * f[1] + ISO_L[r] * s1;
        M[r * 4 + 2] = ISO_U[r];
        M[r * 4 + 3] = ISO_U[r] * lift;
      }
      return M;
    },
    entity() {
      const p = this.ent || (this.ent = new Player(0, 0));
      p.vitrine = true;   // modelo no lugar (a animação de caminhada não sai do lugar): sem trava dos pés
      p.facing = Math.PI / 4; p.vx = p.vy = 0; p.z = 0; p.vz = 0; p.landT = 0; p.flash = 0; p.fury = 40; p.moveSpeed = 0; p.chargeLevel = 0;
      if (p.state !== 'attack') p.attack = null;
      ANIMS[this.anim][1](p, this.t);
      if (p.state !== 'attack') p.attack = null;
      return p;
    },

    draw(ctx) {
      if (!this.open) return;
      const key = this.key(), def = MODELS3D[key];
      ctx.save();
      ctx.fillStyle = '#07090d'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      const top = 52, bottom = VIEW_H - 64;
      const cells = [];
      if (this.grid) {
        const w = VIEW_W / VIEWS.length, H = Math.min(bottom - top - 40, w * 2.1) * this.zoom;
        VIEWS.forEach((v, i) => cells.push({ i, v, x: w * (i + 0.5), y: bottom - 6 + (this.pan || 0) * H, H, ref: false }));
      } else {
        const v = VIEWS[this.view], hasRef = !!this.ref(key, v.id), H = (bottom - top - 30) * this.zoom;
        cells.push({ i: this.view, v, x: this.side && hasRef ? VIEW_W * 0.32 : VIEW_W * 0.5, y: bottom - 6 + (this.pan || 0) * H, H, ref: this.side && hasRef });
      }
      // chão de referência
      ctx.strokeStyle = 'rgba(90,140,220,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(20, bottom - 6); ctx.lineTo(VIEW_W - 20, bottom - 6); ctx.stroke();
      const ok = typeof R3D !== 'undefined' && R3D.active && def;
      const e = this.entity(), alt = this.altura(key);
      let info = '';
      if (ok) {
        // 1) enfileira e desenha todas as vistas no atlas
        let maxZ = 0;
        for (const c of cells) {
          const m = this.instance(key, c.i);
          if (!m) continue;
          const ortho = !!c.v.f;
          c.z = c.H / (alt * (ortho ? SY_U : 1.08));
          maxZ = Math.max(maxZ, c.z);
          const o = c.o || (c.o = {});
          o.flash = 0; o.emi = undefined; o.holo = false; o.lift = 0; o.roll = 0; o.pitch = 0; o.scale = 1;
          o.ghost = c.v.rig ? [0.22, 0.42, 0.75] : null;
          if (def.opts && !c.v.rig) Object.assign(o, def.opts(e));
          o.m = ortho ? this.matrix(c.i, c.v.f, c.v.rig ? 0 : (e.z || 0)) : null;
          o.yaw = this.yaw; o.lift = ortho ? 0 : (e.z || 0);
          const pose = c.v.rig ? (mm) => def.pose(mm, null) : def.pose;
          if (m.skins) for (const sk of m.skins) sk.hide = this.det === false && /^det_/.test(sk.nome || '');
          c.m = m; c.ortho = ortho;
          c.it = R3D.queue(m, pose, e, o);
        }
        R3D.flush(Math.min(12, game.scale * maxZ));
        // 2) desenha cada vista na tela
        for (const c of cells) {
          if (!c.it || !c.it.ok) continue;
          const sx = c.ortho ? c.z * ASPECTO : c.z;
          if (c.ref) this.drawRef(ctx, key, c, VIEW_W * 0.7, false);
          ctx.save();
          ctx.translate(c.x, c.y); ctx.scale(sx, c.z);
          R3D.blit(ctx, c.it, 0, 0);
          R3D.blitEmissive(ctx, c.it, 0, 0, 1);
          if (def.glows && !c.v.rig) {
            ctx.globalCompositeOperation = 'lighter';
            def.glows(e, (name, r, rgb, a) => { const q = c.it.anchors[name]; if (q) GlowCache.draw(ctx, rgb, q.x, q.y, r, a); });
            ctx.globalCompositeOperation = 'source-over';
          }
          if (this.bones || c.v.rig) this.drawBones(ctx, c.m, c.z);
          ctx.restore();
          if (this.onion && c.v.f && !c.v.rig) this.drawRef(ctx, key, c, c.x, true);
          // rótulo da vista
          ctx.font = `bold ${this.grid ? 12 : 14}px ${FONT_UI}`; ctx.textAlign = 'center';
          ctx.fillStyle = c.i === this.view && this.grid ? 'rgba(120,200,255,0.95)' : 'rgba(170,190,220,0.85)';
          ctx.fillText(`${c.i + 1} · ${c.v.nome}`, c.x, bottom + 18);
        }
        info = this.stats(key);
      } else {
        ctx.font = `16px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,150,150,0.9)';
        ctx.fillText('Motor 3D indisponível (WebGL desligado ou modo 2D)', VIEW_W / 2, VIEW_H / 2);
      }
      // cabeçalho e ajuda
      ctx.textAlign = 'left';
      ctx.font = `bold 16px ${FONT_UI}`; ctx.fillStyle = 'rgba(255,190,90,0.95)';
      ctx.fillText('INSPETOR 3D', 20, 30);
      ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = 'rgba(200,215,235,0.95)';
      const lodTxt = ['automático', 'alto', 'baixo'][this.lod];
      ctx.fillText(`modelo: ${key}   ·   animação: ${ANIMS[this.anim][0]}${this.paused ? ' (pausa)' : ''}   ·   detalhe: ${lodTxt}`, 140, 30);
      ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(150,170,200,0.85)';
      ctx.fillText(info, 20, 46);
      ctx.fillText('1–6 vista · 0 todas · ←/→ animação · ↑/↓ modelo · espaço pausa · R ossos · F referência ao lado · O sobreposta · +/− zoom · W/S sobe e desce · Q/E gira · L nível de detalhe · D peças de detalhe · Esc fecha', 20, VIEW_H - 14);
      ctx.restore();
    },

    // Arte de referência na mesma escala do modelo (pés na linha do chão, altura = altura do modelo)
    drawRef(ctx, key, c, x, onion) {
      const r = this.ref(key, c.v.id);
      if (!r) return;
      const d = r.d, k = c.H / (d.bot - d.top);
      ctx.save();
      ctx.globalAlpha = onion ? 0.45 : 1;
      ctx.drawImage(r.im, x - d.c * k, c.y - d.bot * k, d.w * k, d.h * k);
      ctx.restore();
      if (!onion) {
        ctx.font = `12px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(170,190,220,0.85)';
        ctx.fillText('ARTE DE REFERÊNCIA', x, VIEW_H - 46);
      }
    },

    // Ossos: linha de cada junta até a do filho, pontos nas juntas (depois do flush, n.w = mundo)
    drawBones(ctx, m, z) {
      const P = (w, p) => {
        const X = w[0] * p[0] + w[1] * p[1] + w[2] * p[2] + w[3], Y = w[4] * p[0] + w[5] * p[1] + w[6] * p[2] + w[7], Z = w[8] * p[0] + w[9] * p[1] + w[10] * p[2] + w[11];
        return [X - Y, (X + Y) * 0.5 - Z];
      };
      const O = [0, 0, 0];
      ctx.lineWidth = 1.6 / z; ctx.strokeStyle = 'rgba(255,200,90,0.9)'; ctx.fillStyle = 'rgba(255,120,60,0.95)';
      const walk = (n, parent) => {
        if (!n.vis) return;
        const a = P(n.w, O);
        if (parent && !SEM_OSSO.has(parent.name) && parent.name !== 'body') {
          const b = P(parent.w, O);
          ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.stroke();
        }
        if (!n.kids.length && PONTAS[n.name]) {
          const b = P(n.w, PONTAS[n.name]);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
        if (!SEM_OSSO.has(n.name)) { ctx.beginPath(); ctx.arc(a[0], a[1], 2.2 / z, 0, Math.PI * 2); ctx.fill(); }
        for (const k of n.kids) walk(k, n);
      };
      walk(m.root, null);
    },

    stats(key) {
      const m = this.instance(key, 0);
      if (!m) return '';
      let tri = 0, nos = 0;
      for (const k in m.nodes) { nos++; const g = m.nodes[k].geo; if (g) tri += g.length / 30; }
      if (m.skins) for (const s of m.skins) tri += s.idx.length / 3;
      const pele = m.skins ? m.skins.reduce((a, s) => a + s.bones.length, 0) : 0;
      return `${Math.round(tri)} triângulos · ${nos} nós · ${pele ? pele + ' ossos com pele (skinning)' : 'peças rígidas por osso'}${m.tex ? (m.tex.nrm ? ' · textura, metal/aspereza e mapa de normais' : ' · textura assada da arte') : ''}`;
    },
  };
  return I;
})();
