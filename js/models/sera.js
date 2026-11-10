'use strict';
// ---------------------------------------------------------------------------
// SERA VYNE (3D) e o BASTÃO NEURAL COM DRONE ORBITAL
// Cientista e especialista em IA de combate: postura elegante, sobretudo
// tecnológico com circuitos holográficos ciano (#19E6D2), tiara com interface
// neural, bastão com núcleo focal giratório e drone autônomo flutuante.
// Suporta variações de armadura: Padrão, Científica, Operacional e Elite.
// ---------------------------------------------------------------------------

function buildBastaoSera(g, k, part, lod) {
  k = k || 1;
  lod = lod === undefined ? 1 : lod;
  const CHROME = '#20242e', CHROME2 = '#3a4254', METAL = '#161920';
  const CYAN = '#19e6d2', CYAN_HI = '#5efff0', CORE = '#a6fffa';

  g.at(0, 0, 0, 0, 0, 0, k, k, k);

  // Haste longa de liga leve
  g.cyl(0, 0, 0, 1.1, 0.95, 46.0, 8, CHROME, 0);
  g.cyl(0, 0, -14.0, 1.3, 1.3, 8.0, 8, METAL, 0); // empunhadura
  g.cyl(0, 0, 2.0, 1.3, 1.3, 7.0, 8, METAL, 0);   // empunhadura superior

  // Cabeça focal com anéis giroscópicos
  g.cyl(0, 0, 24.0, 1.8, 1.8, 2.6, 8, CHROME2, 0);
  g.cyl(0, 0, 25.5, 0.4, 0.4, 6.0, 6, CHROME, 0); // suporte central do cristal

  // Cristal de plasma/dados de alta energia no topo
  g.cyl(0, 0, 27.5, 1.4, 0.2, 4.4, 6, CORE, 1.6);
  g.cyl(0, 0, 24.5, 0.2, 1.4, 4.4, 6, CYAN_HI, 1.5);

  // Anel orbital holográfico ao redor do cristal
  g.cyl(0, 0, 26.0, 2.8, 2.8, 0.6, lod ? 12 : 8, CYAN, 1.3, { caps: false });

  // Ponteira inferior do bastão
  g.cyl(0, 0, -24.0, 0.9, 0.2, 3.2, 6, CHROME2, 0);

  g.at();
  return g;
}

function buildDroneSera(g, k, lod) {
  k = k || 1;
  lod = lod === undefined ? 1 : lod;
  const CHROME = '#20242e', METAL = '#13161c', CYAN = '#19e6d2', CYAN_HI = '#5efff0';

  g.at(0, 0, 0, 0, 0, 0, k, k, k);

  // Chassi central arredondado do drone
  g.box(0, 0, 0, 4.4, 4.4, 2.8, CHROME, 0, { taperZ: 0.8 });
  // Núcleo óptico / sensor frontal
  g.cyl(2.2, 0, 0, 1.0, 1.0, 0.8, 8, CYAN_HI, 1.6, { axis: 'x' });
  // Micro-propulsores de levitação laterais
  for (const s of [1, -1]) {
    g.cyl(0, s * 2.8, 0, 1.1, 0.9, 2.4, 6, METAL, 0);
    g.box(0, s * 2.8, -1.2, 1.2, 1.2, 0.4, CYAN, 1.3);
  }
  // Antena de comunicação de dados
  g.cyl(-1.6, 0, 1.8, 0.2, 0.1, 2.4, 4, CHROME, 0);

  g.at();
  return g;
}

(function () {
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);

  const C = {
    coat: '#181b24', coatHi: '#2b3142', coatDark: '#0e1017',
    cyan: '#19e6d2', cyanHi: '#5efff0', cyanGlow: '#a6fffa',
    white: '#d6deeb', whiteHi: '#eef4ff',
    strap: '#1c202a', hair: '#12141a', hairHi: '#273445',
    skin: '#b89988'
  };

  const SERA_PROPS = { HZ0: 0, NECK: 12.8, HAIR: 5.8, AUP: 10.0, AFO: 9.8, LTH: 14.4, LSH: 13.8 };

  function gHips(armId) {
    const g = new G3();
    g.box(0, 0, -0.6, 6.8, 9.2, 4.2, C.coat, 0);
    // Abas do sobretudo de cientista
    g.box(0.2, -4.8, -3.2, 3.2, 1.4, 8.4, C.coatHi, 0, { rotZ: -0.1 });
    g.box(0.2, 4.8, -3.2, 3.2, 1.4, 8.4, C.coatHi, 0, { rotZ: 0.1 });
    g.box(0.3, -4.8, -3.2, 1.2, 1.5, 7.0, C.cyan, 0.85);
    g.box(0.3, 4.8, -3.2, 1.2, 1.5, 7.0, C.cyan, 0.85);
    return g;
  }

  function gTorso(armId) {
    const g = new G3();
    // Sobretudo cibernético com corte de jaleco de laboratório
    g.box(0, 0, 5.8, 7.0, 9.4, 12.0, C.coat, 0, { taperZ: 0.88 });
    g.box(1.8, 0, 6.0, 3.6, 7.8, 10.2, C.white, 0);
    // Linha de dados holográficos ciano no peitoral
    g.quad([3.7, -1.8, 9.6], [3.7, 1.8, 9.6], [3.7, 1.2, 4.8], [3.7, -1.2, 4.8], C.cyan, 1.0);
    // Gola alta científica
    g.box(-0.8, 0, 12.2, 4.2, 6.4, 2.6, C.coatHi, 0);
    return g;
  }

  function gHead(armId) {
    const g = new G3();
    g.box(0, 0, 4.8, 6.2, 5.8, 7.2, C.skin, 0);
    // Cabelo preto com franja estilizada
    g.box(-0.6, 0, 6.8, 6.8, 6.4, 4.6, C.hair, 0);
    g.box(1.2, 0, 7.0, 3.2, 5.8, 2.4, C.hairHi, 0);
    // Tiara com interface neural na testa
    g.box(3.2, 0, 6.0, 0.8, 5.6, 1.2, C.cyanHi, 1.4);
    return g;
  }

  function gUpper(s) {
    const g = new G3();
    g.cyl(0, 0, -5.0, 1.6, 1.4, 10.0, 6, C.coat, 0);
    return g;
  }

  function gFore(s) {
    const g = new G3();
    g.cyl(0, 0, -4.9, 1.5, 1.3, 9.8, 6, C.coat, 0);
    // Datapad de comando holográfico no antebraço esquerdo
    if (s < 0) {
      g.box(0.6, 0, -4.6, 2.4, 2.2, 4.8, C.coatHi, 0);
      g.box(1.8, 0, -4.6, 0.4, 1.4, 3.4, C.cyan, 1.2);
    }
    return g;
  }

  function gThigh(s) {
    const g = new G3();
    g.cyl(0, 0, -7.2, 2.2, 1.8, 14.4, 6, C.coat, 0);
    return g;
  }

  function gShin(s) {
    const g = new G3();
    g.cyl(0, 0, -6.9, 1.8, 1.5, 13.8, 6, C.coat, 0);
    g.box(1.0, 0, -7.0, 2.0, 2.2, 7.4, C.coatHi, 0);
    return g;
  }

  function gFoot(s) {
    const g = new G3();
    g.box(1.8, 0, -1.3, 6.2, 2.4, 2.6, C.coatDark, 0);
    return g;
  }

  window.HERO_WEAPONS = window.HERO_WEAPONS || {};
  window.HERO_WEAPONS.sera = {
    add(m) {
      if (m.nodes.handR && !m.nodes.staffNode) {
        const st = m.nodes.handR.add(new N3('staffNode'));
        st.add(new N3('bastaoSera', buildBastaoSera(new G3(), 0.95, null, 0)));
        st.p = [2.0, 0, -2.0];
        st.r = [0, 0, 0];
      }
      if (m.nodes.body && !m.nodes.droneCompanion) {
        const dr = m.nodes.body.add(new N3('droneCompanion'));
        dr.add(new N3('droneMesh', buildDroneSera(new G3(), 0.9, 0)));
        dr.p = [-6.0, -8.0, 36.0]; // Flutuando sobre o ombro esquerdo
      }
    },
    pose(m, e, o) {
      const n = m.nodes;
      const t = num(e && e.animTime);
      const st = e ? e.state : 'idle';
      if (n.droneCompanion) {
        // Órbita e flutuação suave do drone companheiro
        n.droneCompanion.p[2] = 36.0 + Math.sin(t * 3.0) * 2.5;
        n.droneCompanion.r = [0, Math.sin(t * 2.0) * 0.15, t * 1.5];
      }
      if (n.staffNode) {
        if (st === 'attack') {
          n.staffNode.r = [0, -0.4, 0.3];
        } else {
          n.staffNode.r = [0, 0.1, 0];
        }
      }
    },
    glows(e, add) {
      if (!e) return;
      add('staffCrystal', 16, '25,230,210', 0.65);
      add('circlet', 10, '25,230,210', 0.5);
      add('droneCore', 12, '94,255,240', 0.6);
    }
  };

  MODELS3D.sera = {
    build(props) {
      const K = props || SERA_PROPS;
      const armId = (props && props.armorId) || 'sera_padrao';
      const root = new N3('root');
      const fall = root.add(new N3('fall'));
      const body = fall.add(new N3('body'));
      const hips = body.add(new N3('hips', gHips(armId)));
      hips.p = [0, 0, 25.0 + K.HZ0];

      const torso = body.add(new N3('torso', gTorso(armId)));
      torso.p = [0, 0, 25.5 + K.HZ0];
      const head = torso.add(new N3('head', gHead(armId)));
      head.p = [0.1, 0, K.NECK];

      // Drone orbital companheiro
      const dr = body.add(new N3('droneCompanion', buildDroneSera(new G3(), 0.9, 0)));
      dr.p = [-6.0, -8.0, 36.0];

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

      // Bastão neural na mão direita
      const st = hR.add(new N3('staffNode', buildBastaoSera(new G3(), 0.95, null, 0)));
      st.p = [2.0, 0, -2.0];
      st.r = [0, 0.1, 0];

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
      m.anchor('circlet', 'head', [3.2, 0, 6.0]);
      m.anchor('staffCrystal', 'staffNode', [0, 0, 26]);
      m.anchor('droneCore', 'droneCompanion', [2.2, 0, 0]);
      return m;
    },

    pose(m, e, o) {
      if (!e) return;
      const n = m.nodes;
      const t = num(e.animTime);
      const st = e.state;

      // Animação flutuante do drone
      if (n.droneCompanion) {
        n.droneCompanion.p[2] = 36.0 + Math.sin(t * 3.2) * 2.5;
        n.droneCompanion.r = [0, Math.sin(t * 2.2) * 0.15, t * 1.6];
      }

      if (st === 'run') {
        const k = cl(num(e.moveSpeed, 200) / 230, 0, 1.2);
        const s = Math.sin(t * 12.5);
        n.torso.r = [0, 0.18, -s * 0.1];
        n.head.r = [0, -0.08, s * 0.05];
        n.armRu.r = [s * 0.55 * k, 0, 0.2];
        n.armLu.r = [-s * 0.55 * k, 0, -0.2];
        n.thighR.r = [-s * 0.7 * k, 0, 0];
        n.thighL.r = [s * 0.7 * k, 0, 0];
      } else if (st === 'attack') {
        // Postura de conjuração tecnológica à frente
        const sw = Math.sin(num(e.stateTime) * 14);
        n.torso.r = [0, 0.12, sw * 0.3];
        n.armRu.r = [-1.2 + sw * 0.4, 0.2, 0.1]; // bastão projetado à frente emitindo raio
        n.armLu.r = [-0.6, -0.4, -0.5];          // mão esquerda manipulando datapad
        n.staffNode.r = [0, -0.4, 0.2];
      } else {
        // Idle com 8 variações
        const br = Math.sin(t * 2.3);
        const variant = e.idleVariant || 'idle_breathing';
        const b = num(e.idleBlend, variant === 'idle_breathing' ? 0 : 1);

        n.torso.r = [0, 0.05 + br * 0.012, 0];
        n.head.r = [0, -0.02, 0];
        n.armRu.r = [0.1, 0, 0.18];
        n.armLu.r = [0.1, 0, -0.18];

        if (b > 0.001) {
          if (variant === 'idle_look_around') {
            const look = Math.sin(t * 1.3) * 0.45;
            n.head.r[2] = look * b;
            n.torso.r[2] = look * 0.18 * b;
          } else if (variant === 'idle_fidget') {
            // Manipula datapad no antebraço
            n.armLu.r[0] = -0.6 * b;
            n.head.r[0] = 0.2 * b;
            n.head.r[2] = -0.3 * b;
          } else if (variant === 'idle_weapon_inspect') {
            n.staffNode.r[1] = Math.sin(t * 2.5) * 0.3 * b;
          } else if (variant === 'idle_stretch') {
            n.torso.r[1] = -0.1 * b;
            n.head.r[1] = 0.12 * b;
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
      if (window.HERO_WEAPONS.sera && window.HERO_WEAPONS.sera.glows) {
        window.HERO_WEAPONS.sera.glows(e, add);
      }
    },

    demos: [
      { label: 'idle', e: (f) => ({ state: 'idle', animTime: 0.4, moveSpeed: 0, facing: f }) },
      { label: 'run', e: (f) => ({ state: 'run', animTime: 0.2, moveSpeed: 230, facing: f }) },
      { label: 'attack', e: (f) => ({ state: 'attack', animTime: 0.3, stateTime: 0.18, facing: f }) },
    ]
  };
})();
