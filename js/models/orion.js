'use strict';
// ---------------------------------------------------------------------------
// ORION (3D) e as LÂMINAS DUPLAS DE PLASMA
// Assassino furtivo da Unidade Sombra: silhueta ágil e esguia, capuz e máscara
// com visor holográfico em âmbar/laranja (#FF8A1F), blindagem em fibra de carbono,
// coldres magnéticos e par de lâminas duplas de corte ultrarrápido.
// Suporta variações de armadura: Padrão, Tático, Urbana e Ancestral (Aurora).
// ---------------------------------------------------------------------------

function buildLaminasOrion(g, k, part, lod) {
  k = k || 1;
  lod = lod === undefined ? 1 : lod;
  const BL = '#15161c', BL2 = '#1c1e26', EDGE = '#6b7280', BEV = '#374151';
  const VEIN = '#ff8a1f', VEIN2 = '#ffb366', GUARD = '#1f222b', GRIP = '#111216';
  const doBlade = !part || part === 'blade', doHilt = !part || part === 'hilt';

  g.at(0, 0, 0, 0, 0, 0, k, k, k);
  if (doBlade) {
    // Estações da lâmina curva em formato de cimitarra sci-fi
    const st = lod ? [[0, 2.0], [4, 2.8], [12, 3.2], [22, 2.9], [30, 2.2], [36, 1.2], [40, 0]]
                   : [[0, 1.8], [8, 2.6], [22, 2.4], [34, 1.4], [40, 0]];
    const T = 0.5;
    const th = (w) => T * Math.min(1, w / 2.0);

    for (const s of [1, -1]) {
      for (const f of [1, -1]) {
        for (let i = 0; i < st.length - 1; i++) {
          const a = st[i], b = st[i + 1];
          const ia = Math.max(0, a[1] - 0.6), ib = Math.max(0, b[1] - 0.6);
          const Ra = [a[0], f * th(a[1]), 0], Rb = [b[0], f * th(b[1]), 0];
          const Ia = [a[0], f * th(a[1]) * 0.35, s * ia], Ib = [b[0], f * th(b[1]) * 0.35, s * ib];
          const Ea = [a[0], 0, s * a[1]], Eb = [b[0], 0, s * b[1]];
          g.quad(Ra, Rb, Ib, Ia, (i + (s > 0 ? 0 : 1)) % 2 ? BL2 : BL, 0);
          g.quad(Ia, Ib, Eb, Ea, i < 2 ? BEV : EDGE, 0);
        }
      }
    }
    // Veia de energia de plasma laranja
    for (const f of [1, -1]) {
      g.quad([1, f * 0.28, 0.4], [34, f * 0.15, 0.2], [34, f * 0.15, -0.2], [1, f * 0.28, -0.4], VEIN, 1);
      g.quad([2, f * 0.30, 0.2], [28, f * 0.18, 0.1], [28, f * 0.18, -0.1], [2, f * 0.30, -0.2], VEIN2, 1.2);
    }
  }
  if (doHilt) {
    // Guarda angular compacta
    g.box(0, 0, 0, 2.2, 5.0, 1.8, GUARD, 0);
    g.box(0.5, 0, 0, 1.4, 2.4, 2.2, '#ff8a1f', 0.85); // emissor de plasma
    // Cabo ergonômico texturizado
    g.cyl(-7.0, 0, 0, 0.9, 0.85, 7.0, 6, GRIP, 0, { axis: 'x' });
    g.cyl(-7.0, 0, 0, 1.1, 1.1, 1.2, 6, '#282d38', 0, { axis: 'x' });
    // Pomo pontiagudo de contra-peso
    g.cyl(-11.5, 0, 0, 0.4, 1.1, 2.2, 4, GUARD, 0, { axis: 'x', rot: Math.PI / 4 });
  }
  g.at();
  return g;
}

(function () {
  const PI = Math.PI, TWO = PI * 2;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;
  const set3 = (o, x, y, z) => { o[0] = x; o[1] = y; o[2] = z; return o; };
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);

  const C = {
    suit: '#14151b', suitHi: '#252936', suitDark: '#0b0c10',
    plate: '#1e212b', plateHi: '#3d4457',
    orange: '#ff8a1f', orangeHi: '#ffa84d', orangeGlow: '#ffb866',
    strap: '#1c1e24', buckle: '#8f96a3', visor: '#ff9024',
    skin: '#a67d65', skinShade: '#785642',
  };

  const ORION_PROPS = { HZ0: 0, NECK: 12.8, HAIR: 5.6, AUP: 10.2, AFO: 10.0, LTH: 14.6, LSH: 14.0 };

  function gHips(armId) {
    const g = new G3();
    g.box(0, 0, -0.6, 6.8, 9.4, 4.4, C.suit, 0);
    // Coldres laterais das lâminas
    g.box(0.2, -5.2, -1.0, 3.2, 1.4, 8.0, C.plate, 0);
    g.box(0.2, 5.2, -1.0, 3.2, 1.4, 8.0, C.plate, 0);
    g.box(0.3, -5.2, -1.0, 1.6, 1.5, 1.2, C.orange, 0.8);
    g.box(0.3, 5.2, -1.0, 1.6, 1.5, 1.2, C.orange, 0.8);
    return g;
  }

  function gTorso(armId) {
    const g = new G3();
    // Colete ágil em fibra de carbono
    g.box(0, 0, 5.8, 7.2, 9.8, 12.0, C.suit, 0, { taperZ: 0.9 });
    // Placas peitorais reforçadas angulares
    g.box(1.8, -2.4, 7.4, 3.8, 3.6, 5.6, C.plate, 0);
    g.box(1.8, 2.4, 7.4, 3.8, 3.6, 5.6, C.plate, 0);
    // Linha de energia central em V
    g.quad([3.8, -1.6, 10.2], [3.8, 1.6, 10.2], [3.8, 0.8, 5.0], [3.8, -0.8, 5.0], C.orange, 0.9);
    // Tiras táticas e fivelas
    g.box(1.9, 0, 1.4, 3.9, 8.2, 1.2, C.strap, 0);
    g.box(3.9, 0, 1.4, 1.6, 1.6, 1.4, C.buckle, 0);
    // Capuz/gola dobrada na nuca
    g.box(-2.4, 0, 11.8, 4.4, 7.2, 3.8, C.suitDark, 0);
    // Variação de Armadura Ancestral/Urbana: ombreiras especiais
    if (armId === 'orion_ancestral' || armId === 'orion_tatico') {
      g.box(0, -6.2, 11.4, 4.6, 2.6, 3.2, C.plateHi, 0);
      g.box(0, 6.2, 11.4, 4.6, 2.6, 3.2, C.plateHi, 0);
      g.box(0.5, -6.2, 11.4, 1.2, 2.7, 1.2, C.orangeHi, 1.2);
      g.box(0.5, 6.2, 11.4, 1.2, 2.7, 1.2, C.orangeHi, 1.2);
    }
    return g;
  }

  function gHead(armId) {
    const g = new G3();
    // Máscara e capuz cobrindo a cabeça
    g.box(-0.4, 0, 5.2, 7.0, 6.6, 8.0, C.suitDark, 0, { taperZ: 0.85 });
    // Visor futurista âmbar neon no formato de fenda angular
    g.box(3.3, 0, 5.4, 1.2, 5.4, 1.6, C.visor, 1.2);
    g.box(3.2, -1.8, 5.4, 1.4, 1.2, 1.8, C.orangeGlow, 1.4);
    g.box(3.2, 1.8, 5.4, 1.4, 1.2, 1.8, C.orangeGlow, 1.4);
    // Respirador/filtro tático na mandíbula
    g.box(2.8, 0, 2.2, 2.4, 3.2, 2.2, C.plate, 0);
    return g;
  }

  function gUpper(s) {
    const g = new G3();
    g.cyl(0, 0, -5.1, 1.8, 1.6, 10.2, 6, C.suit, 0);
    g.box(0.4, s * 0.4, -2.5, 2.2, 2.0, 3.8, C.plate, 0);
    return g;
  }

  function gFore(s) {
    const g = new G3();
    g.cyl(0, 0, -5.0, 1.6, 1.4, 10.0, 6, C.suit, 0);
    // Braçadeira com sensor emissor
    g.box(0.4, s * 0.2, -5.0, 2.4, 2.4, 5.6, C.plate, 0);
    g.box(1.6, s * 0.2, -5.0, 0.4, 0.8, 4.0, C.orange, 0.95);
    return g;
  }

  function gThigh(s) {
    const g = new G3();
    g.cyl(0, 0, -7.3, 2.4, 2.0, 14.6, 6, C.suit, 0);
    g.box(1.2, s * 0.2, -7.0, 2.4, 2.8, 6.0, C.plate, 0);
    return g;
  }

  function gShin(s) {
    const g = new G3();
    g.cyl(0, 0, -7.0, 1.9, 1.6, 14.0, 6, C.suit, 0);
    // Caneleira reforçada
    g.box(1.0, 0, -6.5, 2.2, 2.4, 8.0, C.plate, 0);
    g.box(2.1, 0, -6.5, 0.4, 0.8, 6.0, C.orange, 0.85);
    return g;
  }

  function gFoot(s) {
    const g = new G3();
    g.box(2.0, 0, -1.4, 6.8, 2.6, 2.8, C.suitDark, 0);
    g.box(1.8, 0, -0.6, 4.4, 2.8, 1.6, C.plate, 0);
    return g;
  }

  // Hook global de armas do herói (usado também pelo modelo texturizado orionTex)
  window.HERO_WEAPONS = window.HERO_WEAPONS || {};
  window.HERO_WEAPONS.orion = {
    add(m) {
      if (m.nodes.handR && !m.nodes.bladeR) {
        const wr = m.nodes.handR.add(new N3('bladeR'));
        wr.add(new N3('orionBladeR', buildLaminasOrion(new G3(), 1, null, 0)));
        wr.p = [2.0, 0, -1.0];
        wr.r = [0, 0, 0];
      }
      if (m.nodes.handL && !m.nodes.bladeL) {
        const wl = m.nodes.handL.add(new N3('bladeL'));
        wl.add(new N3('orionBladeL', buildLaminasOrion(new G3(), 1, null, 0)));
        wl.p = [2.0, 0, -1.0];
        wl.r = [0, 0, 0];
      }
    },
    pose(m, e, o) {
      const n = m.nodes;
      if (!n.bladeR || !n.bladeL) return;
      const t = num(e && e.animTime);
      const st = e ? e.state : 'idle';
      if (st === 'attack') {
        n.bladeR.r = [0, 0.4 * Math.sin(t * 18), 0.2];
        n.bladeL.r = [0, -0.4 * Math.cos(t * 18), -0.2];
      } else {
        n.bladeR.r = [0, 0.2, 0];
        n.bladeL.r = [0, -0.2, 0];
      }
    },
    glows(e, add) {
      if (!e) return;
      const t = num(e.animTime);
      const atk = e.state === 'attack';
      const power = atk ? 1.0 : (0.5 + 0.3 * Math.sin(t * 5));
      add('bladeRTip', 12, '255,138,31', 0.45 * power);
      add('bladeLTip', 12, '255,138,31', 0.45 * power);
      add('visor', 8, '255,160,50', 0.55);
    }
  };

  MODELS3D.orion = {
    build(props) {
      const K = props || ORION_PROPS;
      const armId = (props && props.armorId) || 'orion_padrao';
      const root = new N3('root');
      const fall = root.add(new N3('fall'));
      const body = fall.add(new N3('body'));
      const hips = body.add(new N3('hips', gHips(armId)));
      hips.p = [0, 0, 25.5 + K.HZ0];

      const torso = body.add(new N3('torso', gTorso(armId)));
      torso.p = [0, 0, 26.0 + K.HZ0];
      const head = torso.add(new N3('head', gHead(armId)));
      head.p = [0.1, 0, K.NECK];

      const mkArm = (s, nm) => {
        const u = body.add(new N3('arm' + nm + 'u', gUpper(s)));
        const f = u.add(new N3('arm' + nm + 'f', gFore(s)));
        f.p = [0, 0, -K.AUP];
        const h = f.add(new N3('hand' + nm));
        h.p = [0, 0, -K.AFO];
        return h;
      };

      const hL = mkArm(-1, 'L');
      const hR = mkArm(1, 'R');

      // Lâminas duplas
      const wr = hR.add(new N3('bladeR', buildLaminasOrion(new G3(), 0.95, null, 0)));
      wr.p = [2.2, 0.4, -1.2];
      wr.r = [0, 0.2, 0];

      const wl = hL.add(new N3('bladeL', buildLaminasOrion(new G3(), 0.95, null, 0)));
      wl.p = [2.2, -0.4, -1.2];
      wl.r = [0, -0.2, 0];

      const mkLeg = (s, nm) => {
        const th = body.add(new N3('thigh' + nm, gThigh(s)));
        const sh = th.add(new N3('shin' + nm, gShin(s)));
        sh.p = [0, 0, -K.LTH];
        const ft = sh.add(new N3('foot' + nm, gFoot(s)));
        ft.p = [0, 0, -K.LSH];
      };
      mkLeg(-1, 'L');
      mkLeg(1, 'R');

      const m = new Model3(root);
      m.anchor('visor', 'head', [3.3, 0, 5.4]);
      m.anchor('bladeRTip', 'bladeR', [38, 0, 0]);
      m.anchor('bladeLTip', 'bladeL', [38, 0, 0]);
      m.anchor('chest', 'torso', [3.8, 0, 8.0]);
      return m;
    },

    pose(m, e, o) {
      if (!e) return;
      const n = m.nodes;
      const t = num(e.animTime);
      const st = e.state;

      // Movimentos dinâmicos com suporte a variações de Idle
      if (st === 'run') {
        const k = cl(num(e.moveSpeed, 200) / 240, 0, 1.2);
        const ph = t * 14;
        const s = Math.sin(ph);
        n.torso.r = [0, 0.28, -s * 0.12];
        n.head.r = [0, -0.15, s * 0.08];
        n.armRu.r = [s * 0.7 * k, 0, 0.3];
        n.armLu.r = [-s * 0.7 * k, 0, -0.3];
        n.thighR.r = [-s * 0.8 * k, 0, 0];
        n.thighL.r = [s * 0.8 * k, 0, 0];
        n.shinR.r = [Math.max(0, s) * 0.8 * k, 0, 0];
        n.shinL.r = [Math.max(0, -s) * 0.8 * k, 0, 0];
      } else if (st === 'attack') {
        const sw = Math.sin(num(e.stateTime) * 16);
        n.torso.r = [0, 0.18, sw * 0.4];
        n.head.r = [0, -0.08, -sw * 0.2];
        n.armRu.r = [-0.6 + sw * 1.1, 0.4, 0.5];
        n.armLu.r = [-0.6 - sw * 1.1, -0.4, -0.5];
        n.bladeR.r = [sw * 0.5, 0.4, 0];
        n.bladeL.r = [-sw * 0.5, -0.4, 0];
      } else if (st === 'dash') {
        n.torso.r = [0, 0.5, 0];
        n.head.r = [0, -0.3, 0];
        n.armRu.r = [0.8, 0.3, 0.2];
        n.armLu.r = [0.8, -0.3, -0.2];
      } else {
        // IDLE com 8 variações
        const br = Math.sin(t * 2.6);
        const variant = e.idleVariant || 'idle_breathing';
        const b = num(e.idleBlend, variant === 'idle_breathing' ? 0 : 1);

        n.torso.r = [0, 0.06 + br * 0.015, 0];
        n.head.r = [0, -0.04, 0];
        n.armRu.r = [0.1, 0, 0.15];
        n.armLu.r = [0.1, 0, -0.15];
        n.thighR.r = [0, 0, 0.05];
        n.thighL.r = [0, 0, -0.05];

        if (b > 0.001) {
          if (variant === 'idle_look_around') {
            const look = Math.sin(t * 1.5) * 0.45;
            n.head.r[2] = look * b;
            n.torso.r[2] = look * 0.2 * b;
          } else if (variant === 'idle_weapon_inspect') {
            n.armRu.r[0] = -0.5 * b;
            n.armRu.r[1] = 0.4 * b;
            n.head.r[0] = 0.2 * b;
            n.head.r[2] = 0.25 * b;
          } else if (variant === 'idle_combat_ready') {
            n.torso.r[1] = 0.18 * b;
            n.armRu.r[0] = -0.35 * b;
            n.armLu.r[0] = -0.35 * b;
          } else if (variant === 'idle_fidget') {
            const fid = Math.sin(t * 4.5);
            n.bladeR.r[0] = fid * 0.35 * b;
            n.head.r[0] = fid * 0.08 * b;
          } else if (variant === 'idle_weight_shift') {
            const shift = Math.sin(t * 1.8) * 0.12;
            n.torso.r[0] = shift * b;
          } else if (variant === 'idle_stretch') {
            n.torso.r[1] = -0.12 * b;
            n.head.r[1] = 0.15 * b;
          } else if (variant === 'idle_alert') {
            n.head.r[2] = -0.35 * b;
            n.head.r[1] = -0.1 * b;
          }
        }
      }
    },

    opts(e) {
      if (!e) return { emi: 0 };
      if (num(e.flash) > 0) return { emi: 1, flash: 0.9 };
      if (e.stealthActive) return { alpha: 0.35, emi: 0.8 };
      return { emi: 0 };
    },

    glows(e, add) {
      if (window.HERO_WEAPONS.orion && window.HERO_WEAPONS.orion.glows) {
        window.HERO_WEAPONS.orion.glows(e, add);
      }
    },

    demos: [
      { label: 'idle', e: (f) => ({ state: 'idle', animTime: 0.4, moveSpeed: 0, facing: f }) },
      { label: 'run', e: (f) => ({ state: 'run', animTime: 0.2, moveSpeed: 265, facing: f }) },
      { label: 'attack', e: (f) => ({ state: 'attack', animTime: 0.3, stateTime: 0.15, facing: f }) },
      { label: 'dash', e: (f) => ({ state: 'dash', animTime: 0.1, stateTime: 0.05, facing: f }) },
    ]
  };
})();
