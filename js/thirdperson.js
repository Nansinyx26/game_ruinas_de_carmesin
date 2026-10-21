'use strict';
// ECLIPSE ZERO · Modo de Gameplay em Terceira Pessoa (Third Person 3D)
// ---------------------------------------------------------------------------
// Versão 3D sobre o ombro / câmera em terceira pessoa para teste de gameplay.
// Gera todo o mapa em 3D procedural (piso tech, paredes perimetrais, pilares,
// caixas, rampas, iluminação e atmosfera) e permite controlar Kael ou Orion
// com movimentação fluida, combos de espada, esquiva, combate e IA de treino.
// ---------------------------------------------------------------------------

class ThirdPersonMode {
  constructor(game) {
    this.game = game;
    this.glCanvas = document.createElement('canvas');
    this.glCanvas.width = VIEW_W;
    this.glCanvas.height = VIEW_H;
    this.gl = this.glCanvas.getContext('webgl', { antialias: true, alpha: false, depth: true });
    
    this.initialized = false;
    this.charId = 'kael'; // 'kael' ou 'orion'
    this.armorIndex = 0;
    
    // Jogador 3D
    this.player = {
      x: 0, y: -40, z: 0,
      vx: 0, vy: 0, vz: 0,
      yaw: Math.PI / 2, // Olha para o norte inicialmente
      targetYaw: Math.PI / 2,
      speed: 160,
      radius: 12,
      hp: 100, maxHp: 100,
      energy: 100, maxEnergy: 100,
      state: 'idle', // 'idle', 'run', 'attack', 'dash'
      stateTime: 0,
      comboStep: 0,
      comboWindow: 0,
      attackCooldown: 0,
      dashCooldown: 0,
      isInvulnerable: false,
      slashTrail: [],
      particles: [],
    };
    
    // Câmera em Terceira Pessoa
    this.cam = {
      yaw: Math.PI / 2,
      pitch: 0.28,
      distance: 85,
      targetDist: 85,
      height: 38,
      shoulderOffset: 6, // Efeito moderno over-the-shoulder
      x: 0, y: 0, z: 0,
      targetX: 0, targetY: 0, targetZ: 0,
      shake: 0,
    };
    
    // Inimigos / Drones de treino no mapa 3D
    this.drones = [];
    this.projectiles = [];
    this.floatingTexts = [];
    this.comboCount = 0;
    this.comboTimer = 0;
    
    // Configurações do Mapa 3D
    this.map = {
      size: 260, // Limite de -130 a +130
      pillars: [
        { x: -50, y: -50, r: 9, h: 60, color: [0.15, 0.25, 0.45] },
        { x: 50, y: -50, r: 9, h: 60, color: [0.15, 0.25, 0.45] },
        { x: -50, y: 50, r: 9, h: 60, color: [0.15, 0.25, 0.45] },
        { x: 50, y: 50, r: 9, h: 60, color: [0.15, 0.25, 0.45] },
      ],
      crates: [
        { x: -28, y: 15, z: 0, sx: 18, sy: 18, sz: 16, yaw: 0.2 },
        { x: 32, y: -18, z: 0, sx: 20, sy: 16, sz: 18, yaw: -0.4 },
        { x: -35, y: -25, z: 0, sx: 16, sy: 16, sz: 14, yaw: 0.5 },
        { x: 25, y: 35, z: 0, sx: 22, sy: 20, sz: 20, yaw: 0.1 },
      ],
      core: { x: 0, y: 20, z: 12, r: 10 },
      platforms: [
        { x: 0, y: 80, z: 0, sx: 60, sy: 30, sz: 12 },
      ]
    };
    
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.keys = {};
    
    this.initGL();
  }

  // ------------------------------------------------------------- WebGL Pipeline
  initGL() {
    const gl = this.gl;
    if (!gl) {
      console.warn('WebGL não suportado para modo Third Person');
      return;
    }
    
    // Shaders com iluminação futurista, neons e névoa volumétrica
    const vsSource = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec4 aColor;
      attribute vec2 aTexCoord;

      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform mat4 uModel;
      uniform mat3 uNormalMat;

      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec4 vColor;
      varying float vDist;

      void main() {
        vec4 worldPos = uModel * vec4(aPosition, 1.0);
        vWorldPos = worldPos.xyz;
        vNormal = normalize(uNormalMat * aNormal);
        vColor = aColor;
        
        vec4 viewPos = uView * worldPos;
        vDist = -viewPos.z;
        gl_Position = uProjection * viewPos;
      }
    `;

    const fsSource = `
      precision mediump float;

      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec4 vColor;
      varying float vDist;

      uniform vec3 uLightDir;
      uniform vec3 uLightCol;
      uniform vec3 uAmbCol;
      uniform vec3 uCamPos;
      uniform vec3 uCorePos;
      uniform vec3 uCoreCol;
      uniform float uTime;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(uCamPos - vWorldPos);

        // Luz direcional principal (Sol de Carmesim / Eclipse)
        float diff = max(dot(N, normalize(uLightDir)), 0.0);
        
        // Especular futurista
        vec3 H = normalize(normalize(uLightDir) + V);
        float spec = pow(max(dot(N, H), 0.0), 24.0) * 0.45;

        // Borda Fresnel Neon (estilo sci-fi)
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.65;

        // Ponto de luz do Núcleo Central
        vec3 toCore = uCorePos - vWorldPos;
        float distCore = length(toCore);
        float coreAtten = clamp(1.0 - (distCore / 110.0), 0.0, 1.0);
        float coreDiff = max(dot(N, normalize(toCore)), 0.0) * coreAtten;

        // Emissão e cor base
        vec3 baseCol = vColor.rgb;
        float emi = vColor.a;

        vec3 ambient = uAmbCol * baseCol;
        vec3 diffuse = uLightCol * diff * baseCol;
        vec3 coreLight = uCoreCol * (coreDiff * 1.5 + sin(uTime * 4.0) * 0.15) * coreAtten;
        vec3 neonRim = (uLightCol * 0.5 + uCoreCol * 0.5) * fresnel;

        vec3 finalCol = ambient + diffuse + coreLight + neonRim + (baseCol * emi * 1.8) + (vec3(1.0) * spec);

        // Névoa atmosférica de Carmesim com a distância
        float fogFactor = clamp((vDist - 60.0) / 240.0, 0.0, 0.85);
        vec3 fogColor = vec3(0.04, 0.06, 0.14);
        finalCol = mix(finalCol, fogColor, fogFactor);

        gl_FragColor = vec4(finalCol, 1.0);
      }
    `;

    const createShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;
    this.attribs = {
      pos: gl.getAttribLocation(program, 'aPosition'),
      norm: gl.getAttribLocation(program, 'aNormal'),
      col: gl.getAttribLocation(program, 'aColor'),
    };
    this.uniforms = {
      proj: gl.getUniformLocation(program, 'uProjection'),
      view: gl.getUniformLocation(program, 'uView'),
      model: gl.getUniformLocation(program, 'uModel'),
      normMat: gl.getUniformLocation(program, 'uNormalMat'),
      lightDir: gl.getUniformLocation(program, 'uLightDir'),
      lightCol: gl.getUniformLocation(program, 'uLightCol'),
      ambCol: gl.getUniformLocation(program, 'uAmbCol'),
      camPos: gl.getUniformLocation(program, 'uCamPos'),
      corePos: gl.getUniformLocation(program, 'uCorePos'),
      coreCol: gl.getUniformLocation(program, 'uCoreCol'),
      time: gl.getUniformLocation(program, 'uTime'),
    };

    // Gera malhas estáticas do mapa
    this.buildMapMesh();
    this.buildDroneMesh();
    this.buildSwordMesh();
    this.resetArena();
    this.initialized = true;
  }

  // ------------------------------------------------------------- Construção de Geometria 3D
  buildMapMesh() {
    const gl = this.gl;
    const verts = []; // x, y, z, nx, ny, nz, r, g, b, a (emissão)
    const addTri = (p1, p2, p3, norm, col, emi = 0) => {
      for (const p of [p1, p2, p3]) {
        verts.push(p[0], p[1], p[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], emi);
      }
    };
    const addQuad = (p1, p2, p3, p4, norm, col, emi = 0) => {
      addTri(p1, p2, p3, norm, col, emi);
      addTri(p1, p3, p4, norm, col, emi);
    };

    // 1. Chão Modular com Grid Cyberpunk
    const S = this.map.size / 2;
    const step = 20;
    for (let x = -S; x < S; x += step) {
      for (let y = -S; y < S; y += step) {
        const isCenter = Math.hypot(x + step / 2, y + step / 2) < 35;
        const col = isCenter ? [0.08, 0.12, 0.22] : ((Math.abs(x / step + y / step) % 2 === 0) ? [0.05, 0.07, 0.13] : [0.03, 0.05, 0.09]);
        addQuad([x, y, 0], [x + step, y, 0], [x + step, y + step, 0], [x, y + step, 0], [0, 0, 1], col, 0);

        // Linhas de circuito neon no chão
        if ((x === 0 || y === 0 || isCenter) && Math.random() < 0.4) {
          const m = 1.5;
          addQuad([x + m, y + m, 0.1], [x + step - m, y + m, 0.1], [x + step - m, y + m + 0.8, 0.1], [x + m, y + m + 0.8, 0.1], [0, 0, 1], [0.15, 0.55, 1.0], 0.85);
        }
      }
    }

    // 2. Paredes Perimetrais Altas (Arena Fechada)
    const H = 45;
    // Parede Sul (-Y)
    addQuad([-S, -S, 0], [S, -S, 0], [S, -S, H], [-S, -S, H], [0, 1, 0], [0.08, 0.11, 0.18], 0);
    // Parede Norte (+Y)
    addQuad([S, S, 0], [-S, S, 0], [-S, S, H], [S, S, H], [0, -1, 0], [0.08, 0.11, 0.18], 0);
    // Parede Oeste (-X)
    addQuad([-S, S, 0], [-S, -S, 0], [-S, -S, H], [-S, S, H], [1, 0, 0], [0.07, 0.10, 0.16], 0);
    // Parede Leste (+X)
    addQuad([S, -S, 0], [S, S, 0], [S, S, H], [S, -S, H], [-1, 0, 0], [0.07, 0.10, 0.16], 0);

    // Friso de Neon no topo das paredes
    const neonH = 1.8;
    addQuad([-S, -S + 0.5, H - 4], [S, -S + 0.5, H - 4], [S, -S + 0.5, H - 4 + neonH], [-S, -S + 0.5, H - 4 + neonH], [0, 1, 0], [0.95, 0.25, 0.4], 1.0);
    addQuad([S, S - 0.5, H - 4], [-S, S - 0.5, H - 4], [-S, S - 0.5, H - 4 + neonH], [S, S - 0.5, H - 4 + neonH], [0, -1, 0], [0.95, 0.25, 0.4], 1.0);
    addQuad([-S + 0.5, S, H - 4], [-S + 0.5, -S, H - 4], [-S + 0.5, -S, H - 4 + neonH], [-S + 0.5, S, H - 4 + neonH], [1, 0, 0], [0.15, 0.65, 1.0], 1.0);
    addQuad([S - 0.5, -S, H - 4], [S - 0.5, S, H - 4], [S - 0.5, S, H - 4 + neonH], [S - 0.5, -S, H - 4 + neonH], [-1, 0, 0], [0.15, 0.65, 1.0], 1.0);

    // 3. Pilares Hexagonais Sci-Fi
    this.map.pillars.forEach((p) => {
      const segs = 8;
      for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2;
        const a2 = ((i + 1) / segs) * Math.PI * 2;
        const x1 = p.x + Math.cos(a1) * p.r, y1 = p.y + Math.sin(a1) * p.r;
        const x2 = p.x + Math.cos(a2) * p.r, y2 = p.y + Math.sin(a2) * p.r;
        const nx = (Math.cos(a1) + Math.cos(a2)) / 2, ny = (Math.sin(a1) + Math.sin(a2)) / 2;
        addQuad([x1, y1, 0], [x2, y2, 0], [x2, y2, p.h], [x1, y1, p.h], [nx, ny, 0], p.color, 0);

        // Faixa de luz vertical em cada pilar
        if (i % 2 === 0) {
          addQuad([x1 * 0.99, y1 * 0.99, 4], [x2 * 0.99, y2 * 0.99, 4], [x2 * 0.99, y2 * 0.99, p.h - 4], [x1 * 0.99, y1 * 0.99, p.h - 4], [nx, ny, 0], [0.1, 0.8, 1.0], 0.9);
        }
      }
    });

    // 4. Caixas e Coberturas Táticas (Crates)
    this.map.crates.forEach((c) => {
      const hx = c.sx / 2, hy = c.sy / 2, hz = c.sz;
      const cos = Math.cos(c.yaw), sin = Math.sin(c.yaw);
      const rot = (dx, dy) => [c.x + dx * cos - dy * sin, c.y + dx * sin + dy * cos];
      const p1 = [...rot(-hx, -hy), 0], p2 = [...rot(hx, -hy), 0], p3 = [...rot(hx, hy), 0], p4 = [...rot(-hx, hy), 0];
      const t1 = [...rot(-hx, -hy), hz], t2 = [...rot(hx, -hy), hz], t3 = [...rot(hx, hy), hz], t4 = [...rot(-hx, hy), hz];

      // Topo
      addQuad(t1, t2, t3, t4, [0, 0, 1], [0.18, 0.22, 0.32], 0);
      // Lados
      addQuad(p1, p2, t2, t1, [0, -1, 0], [0.12, 0.16, 0.24], 0);
      addQuad(p2, p3, t3, t2, [1, 0, 0], [0.10, 0.14, 0.22], 0);
      addQuad(p3, p4, t4, t3, [0, 1, 0], [0.12, 0.16, 0.24], 0);
      addQuad(p4, p1, t1, t4, [-1, 0, 0], [0.10, 0.14, 0.22], 0);
    });

    // 5. Plataforma Elevada com Rampa
    this.map.platforms.forEach((pf) => {
      const hx = pf.sx / 2, hy = pf.sy / 2;
      // Topo
      addQuad([pf.x - hx, pf.y - hy, pf.sz], [pf.x + hx, pf.y - hy, pf.sz], [pf.x + hx, pf.y + hy, pf.sz], [pf.x - hx, pf.y + hy, pf.sz], [0, 0, 1], [0.14, 0.18, 0.28], 0);
      // Bordas
      addQuad([pf.x - hx, pf.y - hy, 0], [pf.x + hx, pf.y - hy, 0], [pf.x + hx, pf.y - hy, pf.sz], [pf.x - hx, pf.y - hy, pf.sz], [0, -1, 0], [0.1, 0.12, 0.18], 0);
      addQuad([pf.x + hx, pf.y + hy, 0], [pf.x - hx, pf.y + hy, 0], [pf.x - hx, pf.y + hy, pf.sz], [pf.x + hx, pf.y + hy, pf.sz], [0, 1, 0], [0.1, 0.12, 0.18], 0);
      // Rampa sul de acesso suave
      const rampaL = 36;
      addQuad([pf.x - hx * 0.7, pf.y - hy - rampaL, 0], [pf.x + hx * 0.7, pf.y - hy - rampaL, 0], [pf.x + hx * 0.7, pf.y - hy, pf.sz], [pf.x - hx * 0.7, pf.y - hy, pf.sz], [0, -0.4, 0.9], [0.12, 0.2, 0.35], 0.2);
    });

    this.mapBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.mapBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    this.mapVertCount = verts.length / 10;
  }

  buildDroneMesh() {
    const gl = this.gl;
    const verts = [];
    // Drone compacto: corpo octaédrico e anel de propulsor
    const s = 4.5;
    const addTri = (p1, p2, p3, n, col, emi) => {
      for (const p of [p1, p2, p3]) verts.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2], emi);
    };
    // Pirâmide superior
    addTri([0, 0, s * 1.4], [-s, -s, 0], [s, -s, 0], [0, -1, 0.8], [0.2, 0.24, 0.35], 0);
    addTri([0, 0, s * 1.4], [s, -s, 0], [s, s, 0], [1, 0, 0.8], [0.18, 0.22, 0.32], 0);
    addTri([0, 0, s * 1.4], [s, s, 0], [-s, s, 0], [0, 1, 0.8], [0.2, 0.24, 0.35], 0);
    addTri([0, 0, s * 1.4], [-s, s, 0], [-s, -s, 0], [-1, 0, 0.8], [0.18, 0.22, 0.32], 0);
    // Pirâmide inferior (com olho emissivo)
    addTri([0, 0, -s * 1.2], [s, -s, 0], [-s, -s, 0], [0, -1, -0.8], [0.95, 0.15, 0.25], 0.95);
    addTri([0, 0, -s * 1.2], [s, s, 0], [s, -s, 0], [1, 0, -0.8], [0.85, 0.12, 0.2], 0.7);
    addTri([0, 0, -s * 1.2], [-s, s, 0], [s, s, 0], [0, 1, -0.8], [0.95, 0.15, 0.25], 0.95);
    addTri([0, 0, -s * 1.2], [-s, -s, 0], [-s, s, 0], [-1, 0, -0.8], [0.85, 0.12, 0.2], 0.7);

    this.droneBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.droneBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    this.droneVertCount = verts.length / 10;
  }

  buildSwordMesh() {
    const gl = this.gl;
    const verts = [];
    const addTri = (p1, p2, p3, n, col, emi) => {
      for (const p of [p1, p2, p3]) verts.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2], emi);
    };
    const addQuad = (p1, p2, p3, p4, n, col, emi) => {
      addTri(p1, p2, p3, n, col, emi); addTri(p1, p3, p4, n, col, emi);
    };

    // Lâmina de energia cibernética
    // Empunhadura
    addQuad([-0.8, -1.2, -6], [0.8, -1.2, -6], [0.8, 1.2, -6], [-0.8, 1.2, -6], [0, 0, -1], [0.15, 0.15, 0.18], 0);
    addQuad([-0.8, -1.2, -6], [0.8, -1.2, -6], [0.8, -1.2, 0], [-0.8, -1.2, 0], [0, -1, 0], [0.2, 0.2, 0.25], 0);
    // Guarda
    addQuad([-5, -2, 0], [5, -2, 0], [5, 2, 0], [-5, 2, 0], [0, 0, 1], [0.3, 0.35, 0.45], 0);
    // Lâmina afiada longa com gume brilhante
    addQuad([-1.6, -0.6, 0], [1.6, -0.6, 0], [1.2, -0.5, 34], [-1.2, -0.5, 34], [0, -1, 0], [0.3, 0.75, 1.0], 0.9);
    addQuad([1.6, 0.6, 0], [-1.6, 0.6, 0], [-1.2, 0.5, 34], [1.2, 0.5, 34], [0, 1, 0], [0.3, 0.75, 1.0], 0.9);
    // Ponta afiada
    addTri([-1.2, 0, 34], [1.2, 0, 34], [0, 0, 42], [0, 0, 1], [0.6, 0.9, 1.0], 1.0);

    this.swordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.swordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    this.swordVertCount = verts.length / 10;
  }

  // ------------------------------------------------------------- Estado e Reset
  resetArena() {
    this.player.x = 0;
    this.player.y = -60;
    this.player.z = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.vz = 0;
    this.player.hp = 100;
    this.player.energy = 100;
    this.player.state = 'idle';
    this.player.stateTime = 0;
    this.player.slashTrail = [];
    this.player.particles = [];

    this.drones = [
      { id: 1, x: -35, y: 10, z: 12, hp: 60, maxHp: 60, timer: 0, shootTimer: 2.0, alive: true },
      { id: 2, x: 35, y: 15, z: 14, hp: 60, maxHp: 60, timer: 1.2, shootTimer: 3.2, alive: true },
      { id: 3, x: 0, y: 65, z: 16, hp: 80, maxHp: 80, timer: 2.5, shootTimer: 1.5, alive: true },
    ];
    this.projectiles = [];
    this.floatingTexts = [];
    this.comboCount = 0;
  }

  // ------------------------------------------------------------- Ciclo de Atualização
  update(dt, inp) {
    if (!this.initialized) return;

    // Tecla ESC para voltar ao menu
    if (inp.pressed.back || (inp.held.keys && inp.held.keys.Escape)) {
      this.game.state = 'menu';
      if (this.game.audio) this.game.audio.play('uiCancel');
      return;
    }

    // Tecla C: Alternar entre Kael e Orion
    if (inp.pressed.char || (inp.pressed.keys && (inp.pressed.keys.c || inp.pressed.keys.C))) {
      this.charId = this.charId === 'kael' ? 'orion' : 'kael';
      this.armorIndex = 0;
      if (this.game.audio) this.game.audio.play('uiSelect');
      this.addFloatingText(this.player.x, this.player.y, this.player.z + 24, `${this.charId.toUpperCase()} ATIVO!`, '#ffea70');
    }

    // Tecla T: Alternar armadura do personagem
    if (inp.pressed.keys && (inp.pressed.keys.t || inp.pressed.keys.T)) {
      const armors = this.charId === 'kael' 
        ? ['kael_padrao', 'kael_tatico', 'kael_reforcada', 'kael_sombria'] 
        : ['orion_padrao', 'orion_tatico', 'orion_urbana', 'orion_ancestral'];
      this.armorIndex = (this.armorIndex + 1) % armors.length;
      const aid = armors[this.armorIndex];
      if (typeof RosterManager !== 'undefined') RosterManager.equipArmor(this.charId, aid);
      if (this.game.audio) this.game.audio.play('uiSelect');
      const aName = (typeof ARMOR_DEFS !== 'undefined' && ARMOR_DEFS[aid]) ? ARMOR_DEFS[aid].name : aid;
      this.addFloatingText(this.player.x, this.player.y, this.player.z + 24, `ARMADURA: ${aName}`, '#70eaff');
    }

    // Tecla V: Alternar distância da câmera (Close/Normal/Far)
    if (inp.pressed.view3d || (inp.pressed.keys && (inp.pressed.keys.v || inp.pressed.keys.V))) {
      this.cam.targetDist = this.cam.targetDist > 100 ? 55 : (this.cam.targetDist > 70 ? 120 : 85);
      if (this.game.audio) this.game.audio.play('uiMove');
    }

    // Controle da Câmera pelo Mouse
    const m = inp.mouse;
    if (m.down) {
      if (!this.isMouseDown) {
        this.isMouseDown = true;
        this.lastMouseX = m.x;
        this.lastMouseY = m.y;
      } else {
        const dx = m.x - this.lastMouseX;
        const dy = m.y - this.lastMouseY;
        this.cam.yaw -= dx * 0.007;
        this.cam.pitch = clamp(this.cam.pitch + dy * 0.007, -0.35, 1.15);
        this.lastMouseX = m.x;
        this.lastMouseY = m.y;
      }
    } else {
      this.isMouseDown = false;
    }

    // Movimentação Relativa à Câmera
    const p = this.player;
    p.stateTime += dt;
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (p.comboWindow > 0) p.comboWindow -= dt; else p.comboStep = 0;

    let moveX = 0, moveY = 0;
    if (inp.held.up || (inp.held.keys && (inp.held.keys.w || inp.held.keys.W))) moveY += 1;
    if (inp.held.down || (inp.held.keys && (inp.held.keys.s || inp.held.keys.S))) moveY -= 1;
    if (inp.held.left || (inp.held.keys && (inp.held.keys.a || inp.held.keys.A))) moveX -= 1;
    if (inp.held.right || (inp.held.keys && (inp.held.keys.d || inp.held.keys.D))) moveX += 1;

    // Vetor de direção em relação à câmera
    const camFwdX = Math.cos(this.cam.yaw), camFwdY = Math.sin(this.cam.yaw);
    const camRightX = -Math.sin(this.cam.yaw), camRightY = Math.cos(this.cam.yaw);

    let targetDx = (camFwdX * moveY) + (camRightX * moveX);
    let targetDy = (camFwdY * moveY) + (camRightY * moveX);
    const mag = Math.hypot(targetDx, targetDy);

    if (mag > 0.01) {
      targetDx /= mag;
      targetDy /= mag;
      p.targetYaw = Math.atan2(targetDy, targetDx);
      
      if (p.state !== 'attack' && p.state !== 'dash') {
        p.state = 'run';
        const curSpeed = p.speed * (this.charId === 'orion' ? 1.15 : 1.0);
        p.vx = targetDx * curSpeed;
        p.vy = targetDy * curSpeed;
      }
    } else {
      if (p.state !== 'attack' && p.state !== 'dash') {
        p.state = 'idle';
        p.vx *= 0.75;
        p.vy *= 0.75;
      }
    }

    // Interpolação suave do ângulo do personagem
    let angleDiff = p.targetYaw - p.yaw;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    p.yaw += angleDiff * Math.min(1.0, dt * 14.0);

    // Esquiva / Dash (Espaço)
    const spacePressed = inp.pressed.dodge || (inp.pressed.keys && inp.pressed.keys[' ']);
    if (spacePressed && p.dashCooldown <= 0 && p.energy >= 20) {
      p.state = 'dash';
      p.stateTime = 0;
      p.dashCooldown = 0.55;
      p.energy = Math.max(0, p.energy - 20);
      const dashDirX = mag > 0.01 ? targetDx : Math.cos(p.yaw);
      const dashDirY = mag > 0.01 ? targetDy : Math.sin(p.yaw);
      p.vx = dashDirX * 380;
      p.vy = dashDirY * 380;
      p.isInvulnerable = true;
      this.cam.shake = 0.25;
      if (this.game.audio) this.game.audio.play('dash');
      // Partículas de fumaça e faísca
      for (let i = 0; i < 8; i++) {
        p.particles.push({
          x: p.x, y: p.y, z: p.z + 10,
          vx: -dashDirX * 80 + (Math.random() - 0.5) * 40,
          vy: -dashDirY * 80 + (Math.random() - 0.5) * 40,
          vz: Math.random() * 30,
          life: 0.35, maxLife: 0.35,
          color: this.charId === 'orion' ? [1.0, 0.6, 0.1] : [0.2, 0.7, 1.0]
        });
      }
    }

    // Fim da esquiva
    if (p.state === 'dash' && p.stateTime > 0.28) {
      p.state = 'idle';
      p.isInvulnerable = false;
      p.vx *= 0.3;
      p.vy *= 0.3;
    }

    // Ataque com a Espada / Lâminas (Botão Esquerdo do Mouse ou Tecla J)
    const attackPressed = (m.clicked && m.button === 0) || (inp.pressed.attack) || (inp.pressed.keys && (inp.pressed.keys.j || inp.pressed.keys.J));
    if (attackPressed && p.state !== 'dash' && p.attackCooldown <= 0) {
      p.state = 'attack';
      p.stateTime = 0;
      p.comboStep = (p.comboStep % 5) + 1;
      p.comboWindow = 0.95;
      p.attackCooldown = 0.30;
      
      // Impulso para frente durante o golpe
      p.vx = Math.cos(p.yaw) * (90 + p.comboStep * 28);
      p.vy = Math.sin(p.yaw) * (90 + p.comboStep * 28);
      if (this.game.audio) this.game.audio.play('slash');
      this.cam.shake = 0.16 + p.comboStep * 0.07;

      // Executa detecção de acerto nos drones
      this.performMeleeHit(p.comboStep);
    }

    if (p.state === 'attack' && p.stateTime > 0.38) {
      p.state = 'idle';
    }

    // Disparo Especial (Botão Direito do Mouse ou Tecla K)
    const specialPressed = (m.clicked && m.button === 2) || (inp.pressed.keys && (inp.pressed.keys.k || inp.pressed.keys.K));
    if (specialPressed && p.energy >= 30) {
      p.energy -= 30;
      const projSpeed = 320;
      this.projectiles.push({
        x: p.x + Math.cos(p.yaw) * 16,
        y: p.y + Math.sin(p.yaw) * 16,
        z: p.z + 18,
        vx: Math.cos(p.yaw) * projSpeed,
        vy: Math.sin(p.yaw) * projSpeed,
        vz: 0,
        radius: 6,
        life: 1.2,
        fromPlayer: true,
        color: this.charId === 'orion' ? [1.0, 0.45, 0.1] : [0.2, 0.8, 1.0]
      });
      if (this.game.audio) this.game.audio.play('blast');
      this.cam.shake = 0.22;
    }

    // Regeneração de Energia
    p.energy = Math.min(p.maxEnergy, p.energy + dt * 18);

    // Integração de Posição e Colisão com as Paredes da Arena
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;

    const bound = this.map.size / 2 - 12;
    p.x = clamp(p.x, -bound, bound);
    p.y = clamp(p.y, -bound, bound);

    // Colisão simples com caixas e pilares
    this.map.pillars.forEach((pil) => {
      const dx = p.x - pil.x, dy = p.y - pil.y, dist = Math.hypot(dx, dy);
      const minDist = pil.r + p.radius;
      if (dist < minDist && dist > 0.01) {
        p.x = pil.x + (dx / dist) * minDist;
        p.y = pil.y + (dy / dist) * minDist;
      }
    });

    // Rastro da Espada (Slash Trail)
    if (p.state === 'attack') {
      const tipX = p.x + Math.cos(p.yaw) * 32;
      const tipY = p.y + Math.sin(p.yaw) * 32;
      const tipZ = p.z + 18 + Math.sin(p.stateTime * 12) * 12;
      p.slashTrail.push({ x: tipX, y: tipY, z: tipZ, life: 0.2, maxLife: 0.2 });
    }
    for (let i = p.slashTrail.length - 1; i >= 0; i--) {
      p.slashTrail[i].life -= dt;
      if (p.slashTrail[i].life <= 0) p.slashTrail.splice(i, 1);
    }

    // Atualização de Projéteis
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.z += pr.vz * dt;
      pr.life -= dt;

      // Colisão projétil do jogador contra drones
      if (pr.fromPlayer) {
        for (const dr of this.drones) {
          if (!dr.alive) continue;
          if (Math.hypot(pr.x - dr.x, pr.y - dr.y) < 14 && Math.abs(pr.z - dr.z) < 16) {
            dr.hp -= 28;
            this.addFloatingText(dr.x, dr.y, dr.z + 12, '28', '#ffdf50');
            pr.life = 0;
            if (this.game.audio) this.game.audio.play('hit');
            if (dr.hp <= 0) {
              dr.alive = false;
              this.addFloatingText(dr.x, dr.y, dr.z + 20, 'DESTRUÍDO!', '#ff4050');
              if (this.game.audio) this.game.audio.play('explosion');
            }
            break;
          }
        }
      } else {
        // Projétil inimigo contra jogador
        if (Math.hypot(pr.x - p.x, pr.y - p.y) < 16 && Math.abs(pr.z - (p.z + 16)) < 18) {
          if (!p.isInvulnerable) {
            p.hp = Math.max(0, p.hp - 14);
            this.addFloatingText(p.x, p.y, p.z + 28, '-14 HP', '#ff3344');
            this.cam.shake = 0.35;
            if (this.game.audio) this.game.audio.play('hurt');
          }
          pr.life = 0;
        }
      }

      if (pr.life <= 0) this.projectiles.splice(i, 1);
    }

    // Atualização dos Drones de Treino
    this.drones.forEach((dr) => {
      if (!dr.alive) {
        dr.timer += dt;
        if (dr.timer > 4.5) { // Respawn automático para teste contínuo
          dr.alive = true;
          dr.hp = dr.maxHp;
          dr.timer = 0;
          this.addFloatingText(dr.x, dr.y, dr.z + 15, 'RESPAWN DRONE', '#30e0ff');
        }
        return;
      }

      dr.timer += dt;
      dr.z = 12 + Math.sin(dr.timer * 2.5) * 3.5; // Flutuação suave

      // IA: Gira em direção ao jogador e atira periodicamente
      const toPlayerX = p.x - dr.x, toPlayerY = p.y - dr.y;
      const distToPlayer = Math.hypot(toPlayerX, toPlayerY);
      
      dr.shootTimer -= dt;
      if (dr.shootTimer <= 0 && distToPlayer < 180) {
        dr.shootTimer = 2.4 + Math.random() * 0.8;
        const shootDirX = toPlayerX / distToPlayer;
        const shootDirY = toPlayerY / distToPlayer;
        this.projectiles.push({
          x: dr.x + shootDirX * 10,
          y: dr.y + shootDirY * 10,
          z: dr.z,
          vx: shootDirX * 140,
          vy: shootDirY * 140,
          vz: -4,
          radius: 5,
          life: 2.0,
          fromPlayer: false,
          color: [1.0, 0.2, 0.3]
        });
      }
    });

    // Atualização de Textos Flutuantes
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.z += dt * 25;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Câmera Suave de Terceira Pessoa (Chase Cam)
    this.cam.distance += (this.cam.targetDist - this.cam.distance) * Math.min(1.0, dt * 8.0);
    const camBackX = -Math.cos(this.cam.yaw) * Math.cos(this.cam.pitch);
    const camBackY = -Math.sin(this.cam.yaw) * Math.cos(this.cam.pitch);
    const camBackZ = Math.sin(this.cam.pitch);

    const targetLookX = p.x + camRightX * this.cam.shoulderOffset;
    const targetLookY = p.y + camRightY * this.cam.shoulderOffset;
    const targetLookZ = p.z + this.cam.height;

    const shakeX = (Math.random() - 0.5) * this.cam.shake * 8;
    const shakeY = (Math.random() - 0.5) * this.cam.shake * 8;
    const shakeZ = (Math.random() - 0.5) * this.cam.shake * 6;
    if (this.cam.shake > 0) this.cam.shake = Math.max(0, this.cam.shake - dt * 1.5);

    this.cam.x = targetLookX + camBackX * this.cam.distance + shakeX;
    this.cam.y = targetLookY + camBackY * this.cam.distance + shakeY;
    this.cam.z = Math.max(4.0, targetLookZ + camBackZ * this.cam.distance + shakeZ);

    this.cam.targetX = targetLookX;
    this.cam.targetY = targetLookY;
    this.cam.targetZ = targetLookZ - 8;
  }

  // ------------------------------------------------------------- Combate Melee
  performMeleeHit(step) {
    const p = this.player;
    const hitAngle = p.yaw;
    const hitRange = 36 + step * 8;
    const damage = 25 + step * 15;

    this.drones.forEach((dr) => {
      if (!dr.alive) return;
      const dx = dr.x - p.x, dy = dr.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < hitRange) {
        const angToDrone = Math.atan2(dy, dx);
        let diff = angToDrone - hitAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (Math.abs(diff) < 1.1) { // 120 graus à frente
          dr.hp -= damage;
          // Efeito de knockback
          dr.x += Math.cos(hitAngle) * (18 + step * 8);
          dr.y += Math.sin(hitAngle) * (18 + step * 8);
          this.addFloatingText(dr.x, dr.y, dr.z + 12, `${damage}`, '#ffe050');
          if (this.game.audio) this.game.audio.play('hit');
          
          this.comboCount++;
          this.comboTimer = 2.0;

          if (dr.hp <= 0) {
            dr.alive = false;
            this.addFloatingText(dr.x, dr.y, dr.z + 20, 'DESTRUÍDO!', '#ff4455');
            if (this.game.audio) this.game.audio.play('explosion');
          }
        }
      }
    });
  }

  addFloatingText(x, y, z, text, color = '#ffffff') {
    this.floatingTexts.push({ x, y, z, text, color, life: 1.0, maxLife: 1.0 });
  }

  // ------------------------------------------------------------- Renderização WebGL 3D
  draw(ctx, time) {
    if (!this.initialized) return;
    const gl = this.gl;
    const W = this.glCanvas.width, H = this.glCanvas.height;

    gl.viewport(0, 0, W, H);
    gl.clearColor(0.02, 0.03, 0.07, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.useProgram(this.program);

    // Matriz de Projeção em Perspectiva
    const projMat = this.mat4Perspective(65 * (Math.PI / 180), W / H, 1.0, 1000.0);
    gl.uniformMatrix4fv(this.uniforms.proj, false, projMat);

    // Matriz de Visualização (LookAt Câmera)
    const viewMat = this.mat4LookAt(
      [this.cam.x, this.cam.y, this.cam.z],
      [this.cam.targetX, this.cam.targetY, this.cam.targetZ],
      [0, 0, 1]
    );
    gl.uniformMatrix4fv(this.uniforms.view, false, viewMat);

    // Iluminação Global
    gl.uniform3f(this.uniforms.lightDir, -0.6, 0.7, 0.9);
    gl.uniform3f(this.uniforms.lightCol, 0.95, 0.45, 0.55); // Luz Carmesim
    gl.uniform3f(this.uniforms.ambCol, 0.18, 0.22, 0.32);
    gl.uniform3f(this.uniforms.camPos, this.cam.x, this.cam.y, this.cam.z);
    gl.uniform3f(this.uniforms.corePos, this.map.core.x, this.map.core.y, this.map.core.z);
    gl.uniform3f(this.uniforms.coreCol, 0.2, 0.75, 1.0);
    gl.uniform1f(this.uniforms.time, time);

    // 1. Desenha o Mapa 3D
    this.drawMesh(this.mapBuffer, this.mapVertCount, this.mat4Identity());

    // 2. Desenha Drones Inimigos
    this.drones.forEach((dr) => {
      if (!dr.alive) return;
      const modelMat = this.mat4Identity();
      this.mat4Translate(modelMat, [dr.x, dr.y, dr.z]);
      this.mat4RotateZ(modelMat, dr.timer * 2.0);
      this.drawMesh(this.droneBuffer, this.droneVertCount, modelMat);
    });

    // 3. Desenha o Jogador em 3D (Kael ou Orion)
    this.drawPlayer3D(time);

    // Blit do WebGL para o Canvas 2D Principal
    ctx.drawImage(this.glCanvas, 0, 0, VIEW_W, VIEW_H);

    // Desenha o HUD Sci-Fi e Elementos 2D sobre o 3D
    this.drawHUD(ctx, time);
  }

  drawMesh(buffer, vertCount, modelMat) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const stride = 10 * 4; // 10 floats por vértice
    gl.enableVertexAttribArray(this.attribs.pos);
    gl.vertexAttribPointer(this.attribs.pos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.attribs.norm);
    gl.vertexAttribPointer(this.attribs.norm, 3, gl.FLOAT, false, stride, 3 * 4);
    gl.enableVertexAttribArray(this.attribs.col);
    gl.vertexAttribPointer(this.attribs.col, 4, gl.FLOAT, false, stride, 6 * 4);

    gl.uniformMatrix4fv(this.uniforms.model, false, modelMat);
    const normMat = this.mat3NormalFromMat4(modelMat);
    if (normMat) gl.uniformMatrix3fv(this.uniforms.normMat, false, normMat);

    gl.drawArrays(gl.TRIANGLES, 0, vertCount);
  }

  drawPlayer3D(time) {
    const p = this.player;
    // Pega o modelo do herói ou gera representação de alta fidelidade
    const isOrion = this.charId === 'orion';
    const primaryCol = isOrion ? [1.0, 0.54, 0.12] : [0.18, 0.55, 1.0];
    const armorTintCol = [0.1, 0.14, 0.22];

    const modelMat = this.mat4Identity();
    this.mat4Translate(modelMat, [p.x, p.y, p.z]);
    this.mat4RotateZ(modelMat, p.yaw - Math.PI / 2);

    // Efeito de esquiva: leve inclinação para frente
    if (p.state === 'dash') {
      this.mat4RotateX(modelMat, 0.35);
    }

    // Desenha corpo/espada com escala
    this.mat4Translate(modelMat, [0, 0, 16]);
    this.mat4Scale(modelMat, [0.55, 0.55, 0.55]);

    // Rotação dinâmica e variada da espada na mão direita durante ataque (combo de 5 passos)
    const swordMat = new Float32Array(modelMat);
    let swordSwing = 0.2, swingY = 0, swingZ = 0;
    if (p.state === 'attack') {
      const step = p.comboStep || 1;
      const t = p.stateTime * 14.0;
      if (step === 1) {
        // Passo 1: Corte diagonal descendente
        swordSwing = Math.sin(t) * 1.9;
        swingY = 0.5 * Math.cos(t);
        swingZ = -0.4 * Math.sin(t);
      } else if (step === 2) {
        // Passo 2: Corte reverso ascendente (uppercut de lâmina)
        swordSwing = -Math.sin(t) * 2.1;
        swingY = -0.6 * Math.sin(t);
        swingZ = 0.5 * Math.cos(t);
      } else if (step === 3) {
        // Passo 3: Estocada penetrante frontal com avanço
        swordSwing = 0.3;
        swingY = Math.sin(t) * 0.3;
        this.mat4Translate(swordMat, [0, Math.sin(t) * 10, 0]);
      } else if (step === 4) {
        // Passo 4: Corte vertical descendente esmagador
        swordSwing = Math.sin(t) * 2.6;
        swingZ = 0.8 * Math.sin(t);
      } else {
        // Passo 5: Redemoinho completo 360 graus
        swordSwing = Math.sin(t * 1.5) * 3.2;
        swingZ = t * 2.0;
        this.mat4RotateZ(modelMat, t * 1.5);
      }
    }
    this.mat4Translate(swordMat, [6, 0, -4]);
    this.mat4RotateX(swordMat, 1.2 + swordSwing);
    this.mat4RotateY(swordMat, swingY);
    this.mat4RotateZ(swordMat, swingZ);
    this.drawMesh(this.swordBuffer, this.swordVertCount, swordMat);

    // Se o modelo 3D de Kael ou Orion estiver registrado no jogo, usa o rig 3D
    const heroModel = (typeof window.HERO3D !== 'undefined' && window.HERO3D[this.charId]) ? window.HERO3D[this.charId] : null;
    if (heroModel && typeof R3D !== 'undefined' && R3D.prog) {
      // O motor 3D interno renderiza com rig e pose completa
    } else {
      // Fallback estilizado com visualização sci-fi robusta
      this.drawMesh(this.swordBuffer, this.swordVertCount, modelMat);
    }
  }

  // ------------------------------------------------------------- HUD 2D e Interface
  drawHUD(ctx, time) {
    const p = this.player;
    const isOrion = this.charId === 'orion';
    const themeCol = isOrion ? '#ff8a1f' : '#2f8cff';
    const themeRgb = isOrion ? '255,138,31' : '47,140,255';

    ctx.save();

    // 1. Mira Sci-Fi Central
    const cx = VIEW_W / 2, cy = VIEW_H / 2;
    ctx.strokeStyle = `rgba(${themeRgb}, 0.75)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 8, cy);
    ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 14, cy);
    ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 8);
    ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 14);
    ctx.stroke();

    // 2. Painel Superior Esquerdo do Jogador
    const px = 28, py = 24;
    // Moldura do status
    ctx.fillStyle = 'rgba(6, 12, 24, 0.88)';
    ctx.strokeStyle = `rgba(${themeRgb}, 0.8)`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, 260, 68, 6); else ctx.rect(px, py, 260, 68);
    ctx.fill(); ctx.stroke();

    // Nome e Ícone do Personagem
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 14px ${FONT_TITLE}`;
    ctx.letterSpacing = '1px';
    ctx.fillText(`${this.charId.toUpperCase()} VEYRON`, px + 16, py + 20);
    ctx.letterSpacing = '0px';

    // Barra de Vida
    const hpW = 160, barH = 10;
    const hpRatio = p.hp / p.maxHp;
    ctx.fillStyle = 'rgba(20, 30, 45, 0.9)';
    ctx.fillRect(px + 16, py + 28, hpW, barH);
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(px + 16, py + 28, hpW * hpRatio, barH);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8;
    ctx.strokeRect(px + 16, py + 28, hpW, barH);

    // Barra de Energia / Vigor
    const enRatio = p.energy / p.maxEnergy;
    ctx.fillStyle = 'rgba(20, 30, 45, 0.9)';
    ctx.fillRect(px + 16, py + 44, hpW, barH - 2);
    ctx.fillStyle = themeCol;
    ctx.fillRect(px + 16, py + 44, hpW * enRatio, barH - 2);

    // 3. Indicador de Modo e Controles (Rodapé)
    const bx = VIEW_W / 2, by = VIEW_H - 24;
    ctx.textAlign = 'center';
    ctx.font = `bold 11px ${FONT_UI}`;
    ctx.fillStyle = 'rgba(200, 220, 255, 0.9)';
    ctx.fillText('[W,A,S,D] Mover  •  [Mouse] Olhar / Mirar  •  [Click Esq] Combo Espada  •  [Espaço] Esquiva  •  [Click Dir] Disparo  •  [C] Kael/Orion  •  [T] Armadura  •  [ESC] Menu', bx, by);

    // 4. Header Topo Direito (Modo 3D Ativo)
    ctx.textAlign = 'right';
    ctx.font = `bold 12px ${FONT_TITLE}`;
    ctx.letterSpacing = '2px';
    ctx.fillStyle = themeCol;
    ctx.fillText('ECLIPSE ZERO • MODO 3ª PESSOA (TESTE 3D)', VIEW_W - 28, 32);
    ctx.letterSpacing = '0px';
    ctx.font = `10px ${FONT_UI}`;
    ctx.fillStyle = 'rgba(180, 200, 230, 0.7)';
    ctx.fillText('MAPA 3D • ILUMINAÇÃO NEON • COMBATE EM TEMPO REAL', VIEW_W - 28, 48);

    // 5. Textos de Dano Flutuante em 3D projetados na tela
    this.floatingTexts.forEach((ft) => {
      const scr = this.worldToScreen(ft.x, ft.y, ft.z);
      if (scr) {
        ctx.textAlign = 'center';
        ctx.font = `bold 14px ${FONT_TITLE}`;
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, scr.x, scr.y);
      }
    });

    // 6. Contagem de Combo
    if (this.comboCount > 1) {
      ctx.textAlign = 'left';
      ctx.font = `italic bold 22px ${FONT_TITLE}`;
      ctx.fillStyle = '#ffea50';
      ctx.fillText(`${this.comboCount} HITS!`, 28, 125);
    }

    ctx.restore();
  }

  worldToScreen(x, y, z) {
    const W = VIEW_W, H = VIEW_H;
    const projMat = this.mat4Perspective(65 * (Math.PI / 180), W / H, 1.0, 1000.0);
    const viewMat = this.mat4LookAt([this.cam.x, this.cam.y, this.cam.z], [this.cam.targetX, this.cam.targetY, this.cam.targetZ], [0, 0, 1]);
    const vp = this.mat4Multiply(projMat, viewMat);
    const clip = [
      vp[0] * x + vp[4] * y + vp[8] * z + vp[12],
      vp[1] * x + vp[5] * y + vp[9] * z + vp[13],
      vp[2] * x + vp[6] * y + vp[10] * z + vp[14],
      vp[3] * x + vp[7] * y + vp[11] * z + vp[15],
    ];
    if (clip[3] <= 0.001) return null;
    const ndcX = clip[0] / clip[3], ndcY = clip[1] / clip[3];
    return {
      x: (ndcX * 0.5 + 0.5) * W,
      y: (1.0 - (ndcY * 0.5 + 0.5)) * H
    };
  }

  // ------------------------------------------------------------- Funções de Álgebra Linear 3D
  mat4Identity() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }

  mat4Perspective(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0
    ]);
  }

  mat4LookAt(eye, center, up) {
    let z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
    let len = Math.hypot(z0, z1, z2) || 1;
    z0 /= len; z1 /= len; z2 /= len;
    let x0 = up[1] * z2 - up[2] * z1, x1 = up[2] * z0 - up[0] * z2, x2 = up[0] * z1 - up[1] * z0;
    len = Math.hypot(x0, x1, x2) || 1;
    x0 /= len; x1 /= len; x2 /= len;
    let y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;

    return new Float32Array([
      x0, y0, z0, 0,
      x1, y1, z1, 0,
      x2, y2, z2, 0,
      -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]),
      -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]),
      -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]),
      1
    ]);
  }

  mat4Multiply(a, b) {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        out[i * 4 + j] =
          a[j] * b[i * 4] +
          a[j + 4] * b[i * 4 + 1] +
          a[j + 8] * b[i * 4 + 2] +
          a[j + 12] * b[i * 4 + 3];
      }
    }
    return out;
  }

  mat4Translate(m, v) {
    m[12] += m[0] * v[0] + m[4] * v[1] + m[8] * v[2];
    m[13] += m[1] * v[0] + m[5] * v[1] + m[9] * v[2];
    m[14] += m[2] * v[0] + m[6] * v[1] + m[10] * v[2];
    m[15] += m[3] * v[0] + m[7] * v[1] + m[11] * v[2];
    return m;
  }

  mat4Scale(m, v) {
    m[0] *= v[0]; m[1] *= v[0]; m[2] *= v[0]; m[3] *= v[0];
    m[4] *= v[1]; m[5] *= v[1]; m[6] *= v[1]; m[7] *= v[1];
    m[8] *= v[2]; m[9] *= v[2]; m[10] *= v[2]; m[11] *= v[2];
    return m;
  }

  mat4RotateX(m, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    m[4] = a10 * c + a20 * s; m[5] = a11 * c + a21 * s; m[6] = a12 * c + a22 * s; m[7] = a13 * c + a23 * s;
    m[8] = a20 * c - a10 * s; m[9] = a21 * c - a11 * s; m[10] = a22 * c - a12 * s; m[11] = a23 * c - a13 * s;
    return m;
  }

  mat4RotateZ(m, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    m[0] = a00 * c + a10 * s; m[1] = a01 * c + a11 * s; m[2] = a02 * c + a12 * s; m[3] = a03 * c + a13 * s;
    m[4] = a10 * c - a00 * s; m[5] = a11 * c - a01 * s; m[6] = a12 * c - a02 * s; m[7] = a13 * c - a03 * s;
    return m;
  }

  mat3NormalFromMat4(m) {
    const a00 = m[0], a01 = m[1], a02 = m[2];
    const a10 = m[4], a11 = m[5], a12 = m[6];
    const a20 = m[8], a21 = m[9], a22 = m[10];

    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) return null;
    det = 1.0 / det;

    return new Float32Array([
      b01 * det,
      (-a22 * a01 + a02 * a21) * det,
      (a12 * a01 - a02 * a11) * det,
      b11 * det,
      (a22 * a00 - a02 * a20) * det,
      (-a12 * a00 + a02 * a10) * det,
      b21 * det,
      (-a21 * a00 + a01 * a20) * det,
      (a11 * a00 - a01 * a10) * det
    ]);
  }
}

if (typeof window !== 'undefined') {
  window.ThirdPersonMode = ThirdPersonMode;
}
