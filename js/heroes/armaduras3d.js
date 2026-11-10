'use strict';
// ECLIPSE ZERO · Armaduras especiais vestidas em 3D (ArmorModels)
// ---------------------------------------------------------------------------
// Cada armadura especial (js/data/special_armors.js) aponta para um GLB de
// assets/modelos/armaduras/<herói>/<herói>_nN.glb: o personagem inteiro com aquela armadura.
// tools/importar_modelo.py --armadura <herói>_nN converte o GLB para o formato do motor
// (malhas com pele no esqueleto do Kael, textura assada) em js/assets/armaduras/<nome>.js,
// que só é carregado quando a armadura é equipada ou aparece na prévia do elenco (um <script>
// injetado: funciona também pelo file://). Ao carregar, o arquivo chama ArmorModels.loaded
// e o modelo vira MODELS3D['arm_<nome>'], com as mesmas poses, animações e armas do herói.
// heroModelKey (js/heroes/kit.js) passa a usar esse modelo no lugar do texturizado padrão; a
// cor (tint) da armadura deixa de ser aplicada, porque a textura já traz as cores dela.
// As armaduras de dono 'all' usam as malhas do Kael: só o Kael as veste em 3D (nos outros
// heróis continua a cor da armadura sobre o modelo de sempre).
// ---------------------------------------------------------------------------
const ArmorModels = {
  PASTA: 'js/assets/armaduras/',
  estado: {},          // nome → 'carregando' | 'ok' | 'falhou'
  prevE: {},           // entidades da prévia do elenco (uma por herói)

  // Nome do módulo da armadura deste herói ('lyra_n3'), ou null (sem GLB próprio do herói)
  modOf(heroId, aid) {
    const a = aid && typeof ARMOR_DEFS !== 'undefined' ? ARMOR_DEFS[aid] : null;
    if (!a || !a.glb) return null;
    const nome = String(a.glb).split('/').pop().replace(/\.glb$/i, '');
    return nome.indexOf(heroId + '_') === 0 ? nome : null;
  },
  // Chave do modelo 3D da armadura (equipada, se aid não vier), ou null enquanto não há
  // (pede o carregamento na primeira vez)
  keyFor(heroId, aid) {
    if (aid === undefined) aid = typeof RosterManager !== 'undefined' ? RosterManager.equippedArmor(heroId) : null;
    const nome = this.modOf(heroId, aid);
    if (!nome) return null;
    const k = 'arm_' + nome, M = MODELS3D[k];
    if (M && !M.broken) return k;
    this.ensure(nome);
    return null;
  },
  ensure(nome) {
    if (this.estado[nome] || typeof document === 'undefined') return;
    this.estado[nome] = 'carregando';
    const s = document.createElement('script');
    s.src = this.PASTA + nome + '.js';
    s.async = true;
    s.onerror = () => { this.estado[nome] = 'falhou'; console.warn('Armadura 3D indisponível:', s.src); };
    document.head.appendChild(s);
  },
  carregando(heroId, aid) {
    const nome = this.modOf(heroId, aid);
    return !!nome && this.estado[nome] === 'carregando';
  },

  // Chamado pelo js/assets/armaduras/<nome>.js ao terminar de carregar
  loaded(nome) {
    const A = typeof ARMOR3D !== 'undefined' && ARMOR3D[nome];
    if (!A || !MODELS3D.kael || typeof decodePeles3D === 'undefined') { this.estado[nome] = 'falhou'; return; }
    const heroi = A.heroi || nome.split('_')[0];
    const def = typeof CHARACTERS_BY_ID !== 'undefined' && CHARACTERS_BY_ID[heroi];
    const kael = heroi === 'kael';
    const weapon = () => (!kael && typeof HERO_WEAPONS !== 'undefined' && HERO_WEAPONS[heroi]) || null;
    // as linhas de neon dos aliados brilham na cor-tema (como em js/models/hero_tex3d.js)
    const glow = !kael && def ? [...hexToRgb(def.color).split(',').map((v) => +v / 255), 1.5] : null;
    const TEX = { src: A.tex, mat: A.mat, nrm: A.nrm, pbr: !!A.pbr, bump: A.mat && !A.nrm ? 0.5 : 0, glow };
    let GEO = null;
    MODELS3D['arm_' + nome] = {
      armadura: nome,
      build() {
        if (!GEO) GEO = decodePeles3D(A);
        const m = MODELS3D.kael.build(A.props);
        for (const k in m.nodes) if (!kael || (k !== 'blade' && k !== 'hilt')) m.nodes[k].geo = null;
        if (kael) {
          // espada: cores do rig no formato com textura; com a espada GLB, os nós ficam só de âncora
          for (const k of ['blade', 'hilt']) {
            const g = m.nodes[k] && m.nodes[k].geo;
            if (g) { const c = new Float32Array(g); for (let i = 0; i < c.length; i += 10) c[i + 8] = -1 - c[i + 8]; m.nodes[k].geo = c; }
          }
          if (typeof WeaponRig !== 'undefined' && WeaponRig.has('kael_espada') && WeaponRig.install(m, 'kael')) {
            m.nodes.blade.geo = null; m.nodes.hilt.geo = null;
          }
        } else {
          const w = weapon();
          if (w && w.add) w.add(m);
        }
        m.skins = instPeles3D(GEO, m);
        m.sec = true;
        m.tex = TEX;
        return m;
      },
      pose(m, e, o) {
        MODELS3D.kael.pose(m, e, o);
        if (kael) { if (m.wr) WeaponRig.pose(m, e); return; }
        for (const k of ['blade', 'hilt']) if (m.nodes[k]) m.nodes[k].vis = false;
        const w = weapon();
        if (w && w.pose) w.pose(m, e, o);
      },
      opts(e) { return MODELS3D.kael.opts(e); },
      glows(e, add) {
        if (kael) { MODELS3D.kael.glows(e, add); return; }
        const w = weapon();
        if (w && w.glows) w.glows(e, add);
      },
    };
    this.estado[nome] = 'ok';
  },

  // Prévia do elenco: o herói em 3D com a armadura (ou, sem malha própria, com a cor dela),
  // girando em (x, y) = pés, com altura de cerca de sz px. Devolve false se ainda não dá
  drawPreview(ctx, heroId, aid, x, y, sz, yaw, t) {
    if (typeof R3D === 'undefined' || !R3D.active || typeof game === 'undefined') return false;
    const def = typeof CHARACTERS_BY_ID !== 'undefined' && CHARACTERS_BY_ID[heroId];
    if (!def) return false;
    let key = this.keyFor(heroId, aid), tint = null;
    if (!key) {
      if (this.modOf(heroId, aid) && this.estado[this.modOf(heroId, aid)] !== 'falhou') return false;   // ainda carregando
      key = heroModelKey(def, true);
      const a = ARMOR_DEFS[aid], hx = a && a.visual && a.visual.tint;
      tint = hx ? [...hexToRgb(hx).split(',').map((v) => +v / 255), 0.72] : null;
    }
    if (!game.model3(key)) return false;
    const e = this.prevE[heroId] || (this.prevE[heroId] = { def, x: 0, y: 0, z: 0, state: 'idle', stateTime: 0, animTime: 0, facing: 0, flash: 0, moveSpeed: 0, wpnOut: false, hp: 1, maxHp: 1, fury: 0, vitrine: true });
    e.animTime = t; e.stateTime = t; e.facing = e.viewFacing = yaw;
    const o = game.opts3(e, 0);
    o.scale = e.pvS || 2.4;
    o.tint = tint;
    const it = game.queue3(key, e, o);
    R3D.flush(Math.min(3, game.scale * 1.25));
    if (!it || !it.ok) return false;
    // escala pela altura medida (o próximo quadro já sai do tamanho certo)
    if (it.h > 0) e.pvS = clamp(o.scale * (sz * 0.8) / it.h, 0.5, 8);
    R3D.blit(ctx, it, x, y);
    R3D.blitEmissive(ctx, it, x, y, 1);
    return true;
  },
};
