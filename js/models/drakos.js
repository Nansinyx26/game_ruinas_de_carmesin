'use strict';
// ---------------------------------------------------------------------------
// DRAKOS (3D) e o MACHADO DE PLASMA DA LEGIÃO DE FERRO
// Tanque colossal da Legião de Ferro: postura imponente, peitoral blindado
// com reator térmico, ombreiras reforçadas, elmo com fenda em brasa (#FF2E3D)
// e machado pesado de combate com lâminas de plasma incandescente.
// Suporta variações de armadura: Padrão, Pesada, Fogo e Cerimonial (Colosso).
// ---------------------------------------------------------------------------

function buildMachadoDrakos(g, k, part, lod) {
  k = k || 1;
  lod = lod === undefined ? 1 : lod;
  const IRON = '#1c1b21', IRON2 = '#2b2933', EDGE = '#78738a';
  const RED = '#ff2e3d', RED_HOT = '#ff6e40', GOLD = '#d49b42';

  g.at(0, 0, 0, 0, 0, 0, k, k, k);

  // Haste / cabo longo reforçado
  g.cyl(0, 0, 0, 1.6, 1.4, 48.0, 8, IRON, 0);
  g.cyl(0, 0, -18.0, 1.8, 1.8, 9.0, 8, '#141318', 0); // empunhadura inferior
  g.cyl(0, 0, 2.0, 1.8, 1.8, 8.0, 8, '#141318', 0);  // empunhadura superior
  g.box(0, 0, 24.0, 2.8, 2.8, 4.0, GOLD, 0);         // anel de reforço

  // Cabeça do machado colossal de batalha (lado frontal)
  const bladeSt = lod ? [
    [0, 1.4, 18.0], [6, 2.2, 19.5], [14, 2.8, 22.0], [22, 1.8, 26.0], [28, 0, 31.0]
  ] : [
    [0, 1.4, 18.0], [10, 2.4, 20.0], [24, 1.0, 28.0]
  ];

  for (const s of [1, -1]) {
    for (let i = 0; i < bladeSt.length - 1; i++) {
      const a = bladeSt[i], b = bladeSt[i + 1];
      g.quad([a[0], s * a[1], a[2]], [b[0], s * b[1], b[2]], [b[0], 0, b[2] + 4], [a[0], 0, a[2] + 4], (i % 2) ? IRON2 : IRON);
      g.quad([a[0], s * a[1], a[2]], [b[0], s * b[1], b[2]], [b[0], 0, b[2] - 12], [a[0], 0, a[2] - 12], (i % 2) ? IRON : IRON2);
    }
    // Fio cortante em brasa (vermelho térmico incandescente)
    g.quad([1, s * 0.4, 21.0], [27, s * 0.2, 30.5], [27, -s * 0.2, 30.5], [1, -s * 0.4, 21.0], RED, 1.2);
    g.quad([2, s * 0.3, 20.0], [25, s * 0.1, 28.5], [25, -s * 0.1, 28.5], [2, -s * 0.3, 20.0], RED_HOT, 1.4);
  }

  // Contra-espigão perfurante na parte de trás
  g.box(-9.0, 0, 22.0, 14.0, 2.4, 4.2, IRON2, 0, { taperX: 0.3 });
  g.box(-16.0, 0, 22.0, 4.0, 1.2, 2.0, RED, 1.0);

  // Espigão de topo
  g.cyl(0, 0, 28.0, 1.4, 0.4, 7.0, 4, EDGE, 0, { rot: Math.PI / 4 });

  g.at();
  return g;
}

(function () {
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);

  const C = {
    armor: '#1b1a20', armorHi: '#2f2c38', armorDark: '#100f13',
    plate: '#25232d', plateHi: '#423d50',
    red: '#ff2e3d', redGlow: '#ff5e4d', magma: '#ffa033',
    strap: '#19171d', buckle: '#887f94',
    skin: '#8a6858', skinDark: '#5c4236'
  };

  const DRAKOS_PROPS = { HZ0: 1.2, NECK: 13.8, HAIR: 6.2, AUP: 11.4, AFO: 11.0, LTH: 15.6, LSH: 15.0 };

  function gHips(armId) {
    const g = new G3();
    g.box(0, 0, -0.8, 8.4, 11.8, 5.2, C.armor, 0);
    // Placas de saia blindada (tassets) pesadas
    g.box(2.2, -6.4, -2.4, 3.8, 1.8, 7.8, C.plate, 0, { rotZ: -0.15 });
    g.box(2.2, 6.4, -2.4, 3.8, 1.8, 7.8, C.plate, 0, { rotZ: 0.15 });
    return g;
  }

  function gTorso(armId) {
    const g = new G3();
    // Torso largo e massivo de tanque
    g.box(0, 0, 6.8, 9.4, 13.2, 13.6, C.armor, 0, { taperZ: 0.94 });
    // Reator térmico central incandescente
    g.cyl(4.8, 0, 7.6, 2.2, 2.2, 1.2, 8, C.red, 1.4, { axis: 'x' });
    g.cyl(5.0, 0, 7.6, 1.2, 1.2, 1.2, 8, C.magma, 1.6, { axis: 'x' });
    // Peitorais reforçados de aço forjado
    g.box(3.2, -3.4, 8.4, 4.4, 4.8, 6.2, C.plate, 0);
    g.box(3.2, 3.4, 8.4, 4.4, 4.8, 6.2, C.plate, 0);

    // Gigantescas ombreiras mecânicas blindadas
    g.box(0, -8.2, 13.2, 6.4, 4.8, 5.4, C.plateHi, 0);
    g.box(0, 8.2, 13.2, 6.4, 4.8, 5.4, C.plateHi, 0);
    g.box(1.0, -8.2, 13.2, 1.6, 4.9, 1.4, C.red, 1.1);
    g.box(1.0, 8.2, 13.2, 1.6, 4.9, 1.4, C.red, 1.1);

    // Escapamentos térmicos nas costas
    g.cyl(-5.0, -3.2, 13.0, 1.4, 1.4, 6.0, 6, C.armorDark, 0, { rotX: 0.2 });
    g.cyl(-5.0, 3.2, 13.0, 1.4, 1.4, 6.0, 6, C.armorDark, 0, { rotX: -0.2 });
    g.box(-5.0, -3.2, 16.2, 1.6, 1.6, 1.2, C.red, 1.2);
    g.box(-5.0, 3.2, 16.2, 1.6, 1.6, 1.2, C.red, 1.2);
    return g;
  }

  function gHead(armId) {
    const g = new G3();
    // Elmo fechado de gladiador da Legião
    g.box(0, 0, 5.4, 7.6, 7.4, 8.4, C.armor, 0, { taperZ: 0.85 });
    // Fenda do visor em brasa (linha horizontal incandescente)
    g.box(3.8, 0, 5.8, 0.8, 6.0, 1.4, C.red, 1.5);
    // Crista superior blindada
    g.box(0, 0, 9.8, 6.4, 2.0, 2.6, C.plateHi, 0);
    return g;
  }

  function gUpper(s) {
    const g = new G3();
    g.cyl(0, 0, -5.6, 2.4, 2.1, 11.2, 6, C.armor, 0);
    g.box(0.6, s * 0.4, -3.0, 3.0, 2.8, 4.4, C.plate, 0);
    return g;
  }

  function gFore(s) {
    const g = new G3();
    g.cyl(0, 0, -5.4, 2.2, 1.9, 10.8, 6, C.armor, 0);
    // Braçadeira pesada
    g.box(0.8, s * 0.3, -5.2, 3.2, 3.0, 6.2, C.plateHi, 0);
    return g;
  }

  function gThigh(s) {
    const g = new G3();
    g.cyl(0, 0, -7.8, 2.9, 2.5, 15.6, 6, C.armor, 0);
    return g;
  }

  function gShin(s) {
    const g = new G3();
    g.cyl(0, 0, -7.5, 2.5, 2.2, 15.0, 6, C.armor, 0);
    g.box(1.4, 0, -7.2, 3.2, 3.4, 8.8, C.plate, 0);
    return g;
  }

  function gFoot(s) {
    const g = new G3();
    g.box(2.2, 0, -1.6, 7.8, 3.4, 3.4, C.armorDark, 0);
    g.box(2.4, 0, -0.6, 5.2, 3.6, 2.0, C.plateHi, 0);
    return g;
  }

  window.HERO_WEAPONS = window.HERO_WEAPONS || {};
  window.HERO_WEAPONS.drakos = {
    add(m) {
      if (m.nodes.handR && !m.nodes.machadoNode) {
        const ax = m.nodes.handR.add(new N3('machadoNode'));
        ax.add(new N3('machadoDrakos', buildMachadoDrakos(new G3(), 0.95, null, 0)));
        ax.p = [2.2, 0, -2.0];
        ax.r = [0, 0, 0];
      }
    },
    pose(m, e, o) {
      const n = m.nodes;
      if (!n.machadoNode) return;
      const t = num(e && e.animTime);
      const st = e ? e.state : 'idle';
      if (st === 'attack') {
        n.machadoNode.r = [0, 0.4 * Math.sin(t * 14), 0.2];
      } else {
        n.machadoNode.r = [0, 0.15, 0];
      }
    },
    glows(e, add) {
      if (!e) return;
      add('axeBlade', 18, '255,46,61', 0.6);
      add('chestReactor', 16, '255,110,48', 0.7);
      add('visor', 10, '255,46,61', 0.6);
    }
  };

  MODELS3D.drakos = {
    build(props) {
      const K = props || DRAKOS_PROPS;
      const armId = (props && props.armorId) || 'drakos_padrao';
      const root = new N3('root');
      const fall = root.add(new N3('fall'));
      const body = fall.add(new N3('body'));
      const hips = body.add(new N3('hips', gHips(armId)));
      hips.p = [0, 0, 27.0 + K.HZ0];

      const torso = body.add(new N3('torso', gTorso(armId)));
      torso.p = [0, 0, 28.0 + K.HZ0];
      const head = torso.add(new N3('head', gHead(armId)));
      head.p = [0.2, 0, K.NECK];

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

      // Machado de plasma montado na mão direita
      const ax = hR.add(new N3('machadoNode', buildMachadoDrakos(new G3(), 0.95, null, 0)));
      ax.p = [2.2, 0, -2.0];
      ax.r = [0, 0.2, 0];

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
      m.anchor('visor', 'head', [3.8, 0, 5.8]);
      m.anchor('chestReactor', 'torso', [4.8, 0, 7.6]);
      m.anchor('axeBlade', 'machadoNode', [20, 0, 26]);
      return m;
    },

    pose(m, e, o) {
      if (!e) return;
      const n = m.nodes;
      const t = num(e.animTime);
      const st = e.state;

      if (st === 'run') {
        const k = cl(num(e.moveSpeed, 180) / 220, 0, 1.2);
        const s = Math.sin(t * 11);
        n.torso.r = [0, 0.2, -s * 0.12];
        n.head.r = [0, -0.08, s * 0.05];
        n.armRu.r = [s * 0.55 * k, 0, 0.3];
        n.armLu.r = [-s * 0.55 * k, 0, -0.3];
        n.thighR.r = [-s * 0.65 * k, 0, 0];
        n.thighL.r = [s * 0.65 * k, 0, 0];
      } else if (st === 'attack') {
        const sw = Math.sin(num(e.stateTime) * 12);
        n.torso.r = [0, 0.25, sw * 0.5];
        n.head.r = [0, -0.1, -sw * 0.25];
        n.armRu.r = [-0.8 + sw * 1.4, 0.3, 0.4];
        n.armLu.r = [-0.6 + sw * 1.0, -0.2, -0.2]; // mão esquerda apoia golpe bimanual
        n.machadoNode.r = [sw * 0.6, 0.3, 0];
      } else {
        // Idle com 8 variações
        const br = Math.sin(t * 2.0);
        const variant = e.idleVariant || 'idle_breathing';
        const b = num(e.idleBlend, variant === 'idle_breathing' ? 0 : 1);

        n.torso.r = [0, 0.04 + br * 0.018, 0];
        n.head.r = [0, -0.02, 0];
        n.armRu.r = [0.1, 0, 0.2];
        n.armLu.r = [0.1, 0, -0.2];

        if (b > 0.001) {
          if (variant === 'idle_weight_shift') {
            const shift = Math.sin(t * 1.6) * 0.14;
            n.torso.r[0] = shift * b;
          } else if (variant === 'idle_combat_ready') {
            n.torso.r[1] = 0.15 * b;
            n.armRu.r[0] = -0.3 * b;
            n.armLu.r[0] = -0.25 * b;
          } else if (variant === 'idle_stretch') {
            n.torso.r[1] = -0.1 * b;
            n.head.r[1] = 0.12 * b;
          } else if (variant === 'idle_weapon_inspect') {
            n.armRu.r[0] = -0.4 * b;
            n.head.r[2] = 0.3 * b;
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
      if (window.HERO_WEAPONS.drakos && window.HERO_WEAPONS.drakos.glows) {
        window.HERO_WEAPONS.drakos.glows(e, add);
      }
    },

    demos: [
      { label: 'idle', e: (f) => ({ state: 'idle', animTime: 0.4, moveSpeed: 0, facing: f }) },
      { label: 'run', e: (f) => ({ state: 'run', animTime: 0.2, moveSpeed: 205, facing: f }) },
      { label: 'attack', e: (f) => ({ state: 'attack', animTime: 0.3, stateTime: 0.2, facing: f }) },
    ]
  };
})();
