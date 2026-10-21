'use strict';
// ---------------------------------------------------------------------------
// LYRA KAEDE (3D) e o ARCO DE FÓTON
// Sobrevivente e atiradora de precisão: postura ágil e esguia, arco recurvo
// composto com corda de plasma neon (#A64DFF), aljava magnética com flechas
// de fótons nas costas e monóculo de mira holográfica.
// Suporta variações de armadura: Padrão, Leve, Camuflagem e Assalto (Valkíria).
// ---------------------------------------------------------------------------

function buildArcoLyra(g, k, part, lod) {
  k = k || 1;
  lod = lod === undefined ? 1 : lod;
  const BL = '#17141f', BL2 = '#231e30', EDGE = '#7c6d94', PURPLE = '#a64dff', PURPLE2 = '#d070ff';
  const GRIP = '#0f0d14', STRING_COL = '#c285ff';

  g.at(0, 0, 0, 0, 0, 0, k, k, k);

  // Punho central do arco
  g.cyl(0, 0, 0, 1.3, 1.2, 7.0, 6, GRIP, 0);
  g.box(1.2, 0, 0, 1.6, 2.2, 4.0, BL, 0);
  // Cristal de foco fotônico central
  g.box(1.8, 0, 0, 1.2, 1.2, 2.0, PURPLE2, 1.4);

  // Lâmina superior recurva
  const limbs = lod ? [
    [0, 0, 3.5], [1.5, 0, 9.0], [3.2, 0, 15.0], [3.8, 0, 21.0], [2.2, 0, 26.0], [0.5, 0, 30.0]
  ] : [
    [0, 0, 3.5], [2.0, 0, 12.0], [3.6, 0, 20.0], [0.5, 0, 30.0]
  ];

  for (const s of [1, -1]) {
    for (let i = 0; i < limbs.length - 1; i++) {
      const a = limbs[i], b = limbs[i + 1];
      const z0 = s * a[2], z1 = s * b[2];
      g.quad([a[0] - 1.0, -0.6, z0], [b[0] - 0.8, -0.5, z1], [b[0] + 0.8, -0.5, z1], [a[0] + 1.0, -0.6, z0], BL2);
      g.quad([a[0] + 1.0, 0.6, z0], [b[0] + 0.8, 0.5, z1], [b[0] - 0.8, 0.5, z1], [a[0] - 1.0, 0.6, z0], BL);
      // Filete de neon nos membros
      g.quad([a[0] + 1.05, -0.2, z0], [b[0] + 0.85, -0.15, z1], [b[0] + 0.85, 0.15, z1], [a[0] + 1.05, 0.2, z0], PURPLE, 1.2);
    }
    // Ponteiras do arco
    const tip = limbs[limbs.length - 1];
    g.box(tip[0], 0, s * tip[2], 1.4, 1.4, 2.2, EDGE, 0);
    g.box(tip[0] + 0.5, 0, s * tip[2], 0.8, 0.8, 1.2, PURPLE2, 1.5);
  }

  // Corda de plasma neon esticada entre as duas pontas
  const tipZ = limbs[limbs.length - 1][2];
  const tipX = limbs[limbs.length - 1][0];
  g.cyl(tipX - 1.5, 0, 0, 0.35, 0.35, tipZ * 2, 4, STRING_COL, 1.5);

  g.at();
  return g;
}

(function () {
  const PI = Math.PI;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;
  const set3 = (o, x, y, z) => { o[0] = x; o[1] = y; o[2] = z; return o; };
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);

  const C = {
    suit: '#17151e', suitHi: '#2c2538', suitDark: '#0e0c13',
    purple: '#a64dff', purpleHi: '#c678ff', purpleGlow: '#d894ff',
    leather: '#272230', strap: '#1f1b26', buckle: '#8d8799',
    hair: '#1f1828', hairHi: '#7b3db8', skin: '#baa193', optic: '#e066ff'
  };

  const LYRA_PROPS = { HZ0: 0, NECK: 12.6, HAIR: 5.8, AUP: 10.0, AFO: 9.8, LTH: 14.4, LSH: 13.8 };

  function gHips(armId) {
    const g = new G3();
    g.box(0, 0, -0.6, 6.6, 9.0, 4.2, C.suit, 0);
    g.box(0, 0, 1.2, 6.9, 9.4, 1.2, C.leather, 0);
    // Coldre de bateria / módulo na cintura
    g.box(0.2, -5.0, -0.8, 2.6, 1.8, 4.4, C.leather, 0);
    g.box(0.4, -5.0, -0.8, 1.2, 1.9, 2.2, C.purple, 0.8);
    return g;
  }

  function gTorso(armId) {
    const g = new G3();
    // Túnica de arqueira estilizada
    g.box(0, 0, 5.8, 6.8, 9.2, 11.8, C.suit, 0, { taperZ: 0.88 });
    // Protetor de peito diagonal de arquearia
    g.box(1.8, -1.6, 7.8, 3.6, 4.6, 5.0, C.leather, 0);
    g.quad([3.6, -3.2, 9.8], [3.6, 0.6, 9.8], [3.6, 0.2, 6.0], [3.6, -2.8, 6.0], C.purple, 0.95);
    // Aljava com flechas holográficas nas costas
    g.cyl(-3.6, -1.2, 8.0, 1.8, 1.4, 11.0, 6, C.leather, 0, { rot: -0.2 });
    g.box(-3.6, -1.2, 13.8, 1.8, 1.8, 3.0, C.purpleGlow, 1.3);
    // Variação de Armadura Assalto/Leve: ombreiras protetoras
    if (armId === 'lyra_assalto' || armId === 'lyra_leve') {
      g.box(0, -5.8, 11.2, 4.2, 2.4, 2.8, C.suitHi, 0);
      g.box(0, 5.8, 11.2, 4.2, 2.4, 2.8, C.suitHi, 0);
      g.box(0.3, -5.8, 11.2, 1.2, 2.5, 1.2, C.purpleHi, 1.2);
    }
    return g;
  }

  function gHead(armId) {
    const g = new G3();
    g.box(0, 0, 4.8, 6.2, 5.8, 7.2, C.skin, 0);
    // Cabelo repicado com mecha roxa
    g.box(-0.6, 0, 6.8, 6.8, 6.4, 4.4, C.hair, 0);
    g.box(1.2, -2.2, 6.2, 2.2, 2.0, 3.6, C.hairHi, 0);
    // Monóculo de mira holográfica sobre o olho esquerdo
    g.box(3.2, -1.6, 5.0, 0.8, 2.2, 1.8, C.optic, 1.5);
    return g;
  }

  function gUpper(s) {
    const g = new G3();
    g.cyl(0, 0, -5.0, 1.6, 1.4, 10.0, 6, C.suit, 0);
    return g;
  }

  function gFore(s) {
    const g = new G3();
    g.cyl(0, 0, -4.9, 1.5, 1.3, 9.8, 6, C.suit, 0);
    // Vambrace reforçado no braço do arco
    if (s < 0) {
      g.box(0.6, 0, -4.8, 2.2, 2.2, 5.8, C.leather, 0);
      g.box(1.8, 0, -4.8, 0.4, 0.8, 4.2, C.purple, 0.9);
    }
    return g;
  }

  function gThigh(s) {
    const g = new G3();
    g.cyl(0, 0, -7.2, 2.2, 1.8, 14.4, 6, C.suit, 0);
    return g;
  }

  function gShin(s) {
    const g = new G3();
    g.cyl(0, 0, -6.9, 1.8, 1.5, 13.8, 6, C.suit, 0);
    g.box(1.0, 0, -7.0, 2.0, 2.2, 7.6, C.leather, 0);
    return g;
  }

  function gFoot(s) {
    const g = new G3();
    g.box(1.8, 0, -1.3, 6.2, 2.4, 2.6, C.leather, 0);
    return g;
  }

  window.HERO_WEAPONS = window.HERO_WEAPONS || {};
  window.HERO_WEAPONS.lyra = {
    add(m) {
      if (m.nodes.handL && !m.nodes.bowNode) {
        const b = m.nodes.handL.add(new N3('bowNode'));
        b.add(new N3('arcoLyra', buildArcoLyra(new G3(), 0.95, null, 0)));
        b.p = [1.5, 0, 0];
        b.r = [0, 0, 0];
      }
    },
    pose(m, e, o) {
      const n = m.nodes;
      if (!n.bowNode) return;
      const t = num(e && e.animTime);
      const st = e ? e.state : 'idle';
      if (st === 'attack') {
        n.bowNode.r = [0, -0.3, 0];
      } else {
        n.bowNode.r = [0, 0.2, 0.1];
      }
    },
    glows(e, add) {
      if (!e) return;
      add('bowUpperTip', 14, '166,77,255', 0.5);
      add('bowLowerTip', 14, '166,77,255', 0.5);
      add('optic', 8, '224,102,255', 0.6);
    }
  };

  MODELS3D.lyra = {
    build(props) {
      const K = props || LYRA_PROPS;
      const armId = (props && props.armorId) || 'lyra_padrao';
      const root = new N3('root');
      const fall = root.add(new N3('fall'));
      const body = fall.add(new N3('body'));
      const hips = body.add(new N3('hips', gHips(armId)));
      hips.p = [0, 0, 25.0 + K.HZ0];

      const torso = body.add(new N3('torso', gTorso(armId)));
      torso.p = [0, 0, 25.5 + K.HZ0];
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

      // Arco montado na mão esquerda
      const bw = hL.add(new N3('bowNode', buildArcoLyra(new G3(), 0.95, null, 0)));
      bw.p = [2.0, 0, 0];
      bw.r = [0, 0.15, 0];

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
      m.anchor('optic', 'head', [3.2, -1.6, 5.0]);
      m.anchor('bowUpperTip', 'bowNode', [0.5, 0, 29]);
      m.anchor('bowLowerTip', 'bowNode', [0.5, 0, -29]);
      return m;
    },

    pose(m, e, o) {
      if (!e) return;
      const n = m.nodes;
      const t = num(e.animTime);
      const st = e.state;

      if (st === 'run') {
        const k = cl(num(e.moveSpeed, 200) / 240, 0, 1.2);
        const s = Math.sin(t * 13);
        n.torso.r = [0, 0.22, -s * 0.1];
        n.head.r = [0, -0.1, s * 0.06];
        n.armLu.r = [s * 0.6 * k, 0, -0.2];
        n.armRu.r = [-s * 0.6 * k, 0, 0.2];
        n.thighR.r = [-s * 0.75 * k, 0, 0];
        n.thighL.r = [s * 0.75 * k, 0, 0];
      } else if (st === 'attack') {
        // Postura clássica de arqueiro puxando corda
        const dr = cl(num(e.stateTime) * 8, 0, 1);
        n.torso.r = [0, 0.1, 0.75]; // corpo de lado
        n.head.r = [0, -0.05, -0.7]; // cabeça olhando para o alvo
        n.armLu.r = [-1.4, 0, -0.4]; // braço esquerdo estendido segurando o arco
        n.armRu.r = [-1.3 + dr * 0.2, 0.4, 0.8]; // braço direito puxando corda até o queixo
        n.bowNode.r = [0, -0.4, 0];
      } else {
        // Idle com 8 variações
        const br = Math.sin(t * 2.4);
        const variant = e.idleVariant || 'idle_breathing';
        const b = num(e.idleBlend, variant === 'idle_breathing' ? 0 : 1);

        n.torso.r = [0, 0.05 + br * 0.012, 0];
        n.head.r = [0, -0.02, 0];
        n.armLu.r = [0.1, 0, -0.18];
        n.armRu.r = [0.1, 0, 0.18];
        n.bowNode.r = [0, 0.15, 0.05];

        if (b > 0.001) {
          if (variant === 'idle_look_around') {
            const look = Math.sin(t * 1.3) * 0.5;
            n.head.r[2] = look * b;
            n.torso.r[2] = look * 0.2 * b;
          } else if (variant === 'idle_stretch') {
            n.armRu.r[0] = -0.8 * b;
            n.torso.r[1] = -0.1 * b;
          } else if (variant === 'idle_weapon_inspect') {
            n.armLu.r[0] = -0.5 * b;
            n.head.r[2] = -0.3 * b;
          } else if (variant === 'idle_alert') {
            n.head.r[1] = -0.15 * b;
            n.torso.r[0] = 0.08 * b;
          }
        }
      }
    },

    opts(e) {
      if (!e) return { emi: 0 };
      if (num(e.flash) > 0) return { emi: 1, flash: 0.9 };
      return { emi: 0 };
    },

    glows(e, add) {
      if (window.HERO_WEAPONS.lyra && window.HERO_WEAPONS.lyra.glows) {
        window.HERO_WEAPONS.lyra.glows(e, add);
      }
    },

    demos: [
      { label: 'idle', e: (f) => ({ state: 'idle', animTime: 0.4, moveSpeed: 0, facing: f }) },
      { label: 'run', e: (f) => ({ state: 'run', animTime: 0.2, moveSpeed: 245, facing: f }) },
      { label: 'attack', e: (f) => ({ state: 'attack', animTime: 0.3, stateTime: 0.2, facing: f }) },
    ]
  };
})();
