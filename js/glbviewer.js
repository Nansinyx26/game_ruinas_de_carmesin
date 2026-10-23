'use strict';
// ECLIPSE ZERO · Visualizador Holográfico de Modelos 3D (glTF 2.0 Binary / GLB)
// ---------------------------------------------------------------------------
// Renderizador WebGL puro (sem bibliotecas externas) para inspeção 3D interativa
// de armaduras especiais e armas. Suporta arquivos .glb reais, órbita de câmera,
// zoom, iluminação neon, wireframe e rotação automática.
// ---------------------------------------------------------------------------

const GLBViewer = (() => {
  let modal = null;
  let canvas = null;
  let gl = null;
  let animId = null;
  let currentModel = null;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let yaw = 0.5;
  let pitch = 0.2;
  let distance = 3.5;
  let target = [0, 0, 0];
  let autoRotate = true;
  let wireframe = false;
  let currentItem = null;
  let shaderProgram = null;
  let programInfo = null;

  // Vertex Shader WebGL
  const VS_SOURCE = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aTexCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat3 uNormalMatrix;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vTexCoord;

    void main() {
      vec4 pos = uModelViewMatrix * vec4(aPosition, 1.0);
      vPosition = pos.xyz;
      vNormal = normalize(uNormalMatrix * aNormal);
      vTexCoord = aTexCoord;
      gl_Position = uProjectionMatrix * pos;
    }
  `;

  // Fragment Shader WebGL com iluminação futurista
  const FS_SOURCE = `
    precision mediump float;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vTexCoord;

    uniform vec3 uColor;
    uniform bool uUseTexture;
    uniform sampler2D uSampler;
    uniform bool uWireframe;

    void main() {
      if (uWireframe) {
        gl_FragColor = vec4(uColor * 1.5, 0.9);
        return;
      }

      vec3 N = normalize(vNormal);
      vec3 lightDir1 = normalize(vec3(0.5, 1.0, 0.8));
      vec3 lightDir2 = normalize(vec3(-0.8, -0.2, -0.5));
      vec3 viewDir = normalize(-vPosition);

      // Difusa principal
      float diff1 = max(dot(N, lightDir1), 0.0);
      float diff2 = max(dot(N, lightDir2), 0.0) * 0.4;
      float ambient = 0.25;

      // Especular neon
      vec3 halfDir = normalize(lightDir1 + viewDir);
      float spec = pow(max(dot(N, halfDir), 0.0), 32.0) * 0.6;

      // Efeito de Fresnel (borda neon futurista)
      float fresnel = pow(1.0 - max(dot(N, viewDir), 0.0), 2.5) * 0.7;

      vec4 baseColor = vec4(uColor, 1.0);
      if (uUseTexture) {
        vec4 texColor = texture2D(uSampler, vTexCoord);
        if (texColor.a > 0.1) baseColor = texColor;
      }

      vec3 lighting = (ambient + diff1 + diff2) * baseColor.rgb + (spec + fresnel) * uColor;
      gl_FragColor = vec4(lighting, baseColor.a);
    }
  `;

  // Matrizes 4x4
  function mat4Create() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }

  function mat4Perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) / (near - far); out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = (2 * far * near) / (near - far); out[15] = 0;
    return out;
  }

  function mat4LookAt(out, eye, center, up) {
    let z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
    let len = Math.hypot(z0, z1, z2);
    if (len > 0.0001) { z0 /= len; z1 /= len; z2 /= len; }
    let x0 = up[1] * z2 - up[2] * z1, x1 = up[2] * z0 - up[0] * z2, x2 = up[0] * z1 - up[1] * z0;
    len = Math.hypot(x0, x1, x2);
    if (len > 0.0001) { x0 /= len; x1 /= len; x2 /= len; }
    let y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;

    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
    out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
    out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
    out[15] = 1;
    return out;
  }

  function mat3NormalFromMat4(out, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2],
          a10 = a[4], a11 = a[5], a12 = a[6],
          a20 = a[8], a21 = a[9], a22 = a[10];
    const b01 = a22 * a11 - a12 * a21,
          b11 = -a22 * a10 + a12 * a20,
          b21 = a21 * a10 - a11 * a20;
    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) return null;
    det = 1.0 / det;
    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
  }

  // Inicializa o contexto WebGL e shaders
  function initGL() {
    if (gl) return true;
    try {
      gl = canvas.getContext('webgl', { antialias: true, alpha: true }) ||
           canvas.getContext('experimental-webgl', { antialias: true, alpha: true });
      if (!gl) return false;
      // Os .glb das armas e armaduras usam índices de 32 bits (UNSIGNED_INT, 5125): no WebGL 1
      // isso só desenha com esta extensão (sem ela, drawElements falha e sobrava a imagem 2D)
      gl.getExtension('OES_element_index_uint');

      const vertShader = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
      const fragShader = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
      shaderProgram = gl.createProgram();
      gl.attachShader(shaderProgram, vertShader);
      gl.attachShader(shaderProgram, fragShader);
      gl.linkProgram(shaderProgram);

      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Shader link error:', gl.getProgramInfoLog(shaderProgram));
        return false;
      }

      programInfo = {
        attribs: {
          position: gl.getAttribLocation(shaderProgram, 'aPosition'),
          normal: gl.getAttribLocation(shaderProgram, 'aNormal'),
          texCoord: gl.getAttribLocation(shaderProgram, 'aTexCoord'),
        },
        uniforms: {
          projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
          modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
          normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
          color: gl.getUniformLocation(shaderProgram, 'uColor'),
          useTexture: gl.getUniformLocation(shaderProgram, 'uUseTexture'),
          sampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
          wireframe: gl.getUniformLocation(shaderProgram, 'uWireframe'),
        }
      };

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      return true;
    } catch (e) {
      console.error('WebGL init error:', e);
      return false;
    }
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  // Parser de arquivo .glb binário (glTF 2.0)
  function parseGLB(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const magic = view.getUint32(0, true);
    if (magic !== 0x46546C67) throw new Error('Arquivo não é um GLB válido (magic incorreto)');

    const version = view.getUint32(4, true);
    if (version !== 2) throw new Error('Versão glTF não suportada: ' + version);

    // Chunk 0: JSON
    const jsonLen = view.getUint32(12, true);
    const jsonType = view.getUint32(16, true);
    if (jsonType !== 0x4E4F534A) throw new Error('Chunk 0 não é JSON');

    const jsonBytes = new Uint8Array(arrayBuffer, 20, jsonLen);
    const jsonStr = new TextDecoder('utf-8').decode(jsonBytes);
    const gltf = JSON.parse(jsonStr);

    // Chunk 1: BIN
    let binOffset = 20 + jsonLen;
    // Padding para alinhamento de 4 bytes
    if (binOffset % 4 !== 0) binOffset += 4 - (binOffset % 4);

    let binBuffer = null;
    if (binOffset < arrayBuffer.byteLength) {
      const binLen = view.getUint32(binOffset, true);
      binBuffer = arrayBuffer.slice(binOffset + 8, binOffset + 8 + binLen);
    }

    const primitives = [];
    let minBox = [Infinity, Infinity, Infinity];
    let maxBox = [-Infinity, -Infinity, -Infinity];

    // Helper para ler bufferView + accessor
    function getAccessorData(accIdx) {
      if (accIdx === undefined || accIdx < 0) return null;
      const acc = gltf.accessors[accIdx];
      const bv = gltf.bufferViews[acc.bufferView];
      const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
      const count = acc.count;
      const type = acc.type;
      const compType = acc.componentType;

      const numComps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type] || 1;
      let data = null;

      if (compType === 5126) { // FLOAT
        data = new Float32Array(binBuffer, byteOffset, count * numComps);
      } else if (compType === 5123) { // UNSIGNED_SHORT
        data = new Uint16Array(binBuffer, byteOffset, count * numComps);
      } else if (compType === 5125) { // UNSIGNED_INT
        data = new Uint32Array(binBuffer, byteOffset, count * numComps);
      } else if (compType === 5121) { // UNSIGNED_BYTE
        data = new Uint8Array(binBuffer, byteOffset, count * numComps);
      }
      return { data, count, numComps, compType, min: acc.min, max: acc.max };
    }

    if (gltf.meshes) {
      for (const mesh of gltf.meshes) {
        for (const prim of mesh.primitives) {
          const posAcc = getAccessorData(prim.attributes.POSITION);
          if (!posAcc) continue;

          const normAcc = getAccessorData(prim.attributes.NORMAL);
          const uvAcc = getAccessorData(prim.attributes.TEXCOORD_0);
          const idxAcc = getAccessorData(prim.indices);

          const positions = posAcc.data;
          for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i], y = positions[i + 1], z = positions[i + 2];
            minBox[0] = Math.min(minBox[0], x); maxBox[0] = Math.max(maxBox[0], x);
            minBox[1] = Math.min(minBox[1], y); maxBox[1] = Math.max(maxBox[1], y);
            minBox[2] = Math.min(minBox[2], z); maxBox[2] = Math.max(maxBox[2], z);
          }

          primitives.push({
            positions: posAcc.data,
            normals: normAcc ? normAcc.data : null,
            uvs: uvAcc ? uvAcc.data : null,
            indices: idxAcc ? idxAcc.data : null,
            vertexCount: posAcc.count,
            indexCount: idxAcc ? idxAcc.count : 0
          });
        }
      }
    }

    // Calcula centro e raio para enquadramento perfeito
    const center = [
      (minBox[0] + maxBox[0]) / 2,
      (minBox[1] + maxBox[1]) / 2,
      (minBox[2] + maxBox[2]) / 2
    ];
    const size = [
      maxBox[0] - minBox[0],
      maxBox[1] - minBox[1],
      maxBox[2] - minBox[2]
    ];
    const maxDim = Math.max(size[0], size[1], size[2]) || 1;

    return { primitives, center, size, maxDim, minBox, maxBox };
  }

  // Cria buffers WebGL para o modelo
  function createModelBuffers(parsed, targetGL) {
    const g = targetGL || gl;
    const gpuPrimitives = [];
    let totalVerts = 0;
    let totalTris = 0;

    for (const p of parsed.primitives) {
      const posBuf = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, posBuf);
      g.bufferData(g.ARRAY_BUFFER, p.positions, g.STATIC_DRAW);

      let normBuf = null;
      if (p.normals) {
        normBuf = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, normBuf);
        g.bufferData(g.ARRAY_BUFFER, p.normals, g.STATIC_DRAW);
      }

      let uvBuf = null;
      if (p.uvs) {
        uvBuf = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, uvBuf);
        g.bufferData(g.ARRAY_BUFFER, p.uvs, g.STATIC_DRAW);
      }

      let idxBuf = null;
      if (p.indices) {
        // Sem a extensão de índices de 32 bits, uma malha que cabe em 16 bits é convertida
        let ind = p.indices;
        if (ind instanceof Uint32Array && !g.getExtension('OES_element_index_uint')) {
          let mx = 0;
          for (let i = 0; i < ind.length; i++) if (ind[i] > mx) mx = ind[i];
          if (mx < 65536) ind = Uint16Array.from(ind);
        }
        p.indexType32 = ind instanceof Uint32Array;
        idxBuf = g.createBuffer();
        g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, idxBuf);
        g.bufferData(g.ELEMENT_ARRAY_BUFFER, ind, g.STATIC_DRAW);
        totalTris += p.indices.length / 3;
      } else {
        totalTris += p.vertexCount / 3;
      }
      totalVerts += p.vertexCount;

      gpuPrimitives.push({
        posBuf, normBuf, uvBuf, idxBuf,
        indexCount: p.indexCount,
        vertexCount: p.vertexCount,
        indexType: p.indexType32 ? g.UNSIGNED_INT : g.UNSIGNED_SHORT
      });
    }

    return {
      gpuPrimitives,
      center: parsed.center,
      maxDim: parsed.maxDim,
      totalVerts,
      totalTris: Math.round(totalTris)
    };
  }

  // Cria o modal na interface
  function buildModal() {
    if (modal) return;

    modal = document.createElement('div');
    modal.id = 'glb-viewer-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(2, 5, 14, 0.88);
      backdrop-filter: blur(10px);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: ${FONT_TITLE};
      color: #dfe8f5; user-select: none;
      opacity: 0; transition: opacity 0.25s ease;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      position: relative; width: 92%; max-width: 1080px; height: 86vh;
      background: linear-gradient(180deg, rgba(8, 16, 32, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%);
      border: 1px solid rgba(60, 140, 255, 0.4);
      border-radius: 12px;
      box-shadow: 0 0 50px rgba(40, 110, 255, 0.25), inset 0 0 30px rgba(20, 60, 140, 0.15);
      display: flex; flex-direction: column; overflow: hidden;
    `;

    // Cabeçalho
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 24px; border-bottom: 1px solid rgba(60, 140, 255, 0.25);
      background: rgba(4, 10, 24, 0.7);
    `;

    const titleArea = document.createElement('div');
    titleArea.innerHTML = `
      <div id="glb-title" style="font-size: 18px; font-weight: bold; letter-spacing: 2px; color: #fff;">MODELO 3D</div>
      <div id="glb-subtitle" style="font-size: 12px; letter-spacing: 1px; color: #6bb5ff; margin-top: 2px;">INSPEÇÃO HOLOGRÁFICA EM TEMPO REAL</div>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ ESC';
    closeBtn.style.cssText = `
      background: rgba(255, 60, 80, 0.15); border: 1px solid rgba(255, 60, 80, 0.5);
      color: #ff8090; padding: 6px 14px; border-radius: 6px; font-size: 12px;
      font-weight: bold; cursor: pointer; letter-spacing: 1px; transition: all 0.2s;
    `;
    closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255, 60, 80, 0.35)';
    closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(255, 60, 80, 0.15)';
    closeBtn.onclick = () => close();

    header.appendChild(titleArea);
    header.appendChild(closeBtn);
    container.appendChild(header);

    // Área do Canvas e Informações
    const body = document.createElement('div');
    body.style.cssText = `
      flex: 1; position: relative; display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle at center, rgba(16, 36, 75, 0.3) 0%, rgba(2, 5, 14, 0.8) 70%);
      cursor: grab;
    `;

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'width: 100%; height: 100%; display: block;';
    body.appendChild(canvas);

    // Painel de Status / Dica de Controles
    const infoPanel = document.createElement('div');
    infoPanel.id = 'glb-info-panel';
    infoPanel.style.cssText = `
      position: absolute; bottom: 16px; left: 20px;
      background: rgba(3, 8, 20, 0.85); border: 1px solid rgba(60, 140, 255, 0.3);
      border-radius: 8px; padding: 10px 16px; font-size: 11px; color: #a5c2e8;
      pointer-events: none; line-height: 1.6;
    `;
    infoPanel.innerHTML = `
      <div><span style="color:#fff; font-weight:bold;">Controles:</span> Arraste o mouse para girar · Roda para zoom</div>
      <div id="glb-poly-info" style="color: #6bb5ff;">Carregando geometria...</div>
    `;
    body.appendChild(infoPanel);

    // Barra de Ferramentas Inferior
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      display: flex; align-items: center; justify-content: flex-end; gap: 10px;
      padding: 10px 20px; border-top: 1px solid rgba(60, 140, 255, 0.2);
      background: rgba(4, 10, 24, 0.6);
    `;

    const btnAutoRotate = createToolBtn('Girar Auto', () => {
      autoRotate = !autoRotate;
      btnAutoRotate.style.borderColor = autoRotate ? '#3d8bff' : 'rgba(255,255,255,0.2)';
    });
    btnAutoRotate.style.borderColor = '#3d8bff';

    const btnWireframe = createToolBtn('Wireframe', () => {
      wireframe = !wireframe;
      btnWireframe.style.borderColor = wireframe ? '#3d8bff' : 'rgba(255,255,255,0.2)';
    });

    const btnReset = createToolBtn('Centralizar', () => {
      yaw = 0.5; pitch = 0.2; distance = 3.5;
    });

    // Seletor de arquivo local (caso CORS de file:// bloqueie fetch)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.glb';
    fileInput.style.display = 'none';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => loadBuffer(re.target.result);
        reader.readAsArrayBuffer(file);
      }
    };

    const btnOpenFile = createToolBtn('Abrir GLB', () => fileInput.click());

    toolbar.appendChild(fileInput);
    toolbar.appendChild(btnOpenFile);
    toolbar.appendChild(btnAutoRotate);
    toolbar.appendChild(btnWireframe);
    toolbar.appendChild(btnReset);

    container.appendChild(body);
    container.appendChild(toolbar);
    modal.appendChild(container);
    document.body.appendChild(modal);

    // Eventos de mouse para rotação orbital e zoom
    body.onmousedown = (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      body.style.cursor = 'grabbing';
    };

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      yaw += dx * 0.008;
      pitch = Math.max(-1.4, Math.min(1.4, pitch + dy * 0.008));
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      if (body) body.style.cursor = 'grab';
    });

    body.onwheel = (e) => {
      e.preventDefault();
      distance = Math.max(1.2, Math.min(12.0, distance + e.deltaY * 0.004));
    };

    window.addEventListener('keydown', (e) => {
      if (modal && modal.style.display !== 'none' && e.key === 'Escape') {
        close();
      }
    });
  }

  function createToolBtn(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      background: rgba(15, 30, 60, 0.7); border: 1px solid rgba(60, 140, 255, 0.35);
      color: #c5dcfa; padding: 6px 14px; border-radius: 6px; font-size: 11px;
      font-weight: bold; cursor: pointer; letter-spacing: 1px; transition: all 0.2s;
    `;
    btn.onmouseenter = () => btn.style.background = 'rgba(30, 65, 130, 0.8)';
    btn.onmouseleave = () => btn.style.background = 'rgba(15, 30, 60, 0.7)';
    btn.onclick = onClick;
    return btn;
  }

  // Loop de renderização 3D
  function renderLoop(time) {
    if (!modal || modal.style.display === 'none') return;

    if (autoRotate && !isDragging) {
      yaw += 0.012;
    }

    render();
    animId = requestAnimationFrame(renderLoop);
  }

  function render() {
    if (!gl || !currentModel) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }

    gl.clearColor(0.01, 0.02, 0.05, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projMatrix = mat4Create();
    mat4Perspective(projMatrix, 45 * Math.PI / 180, w / h, 0.1, 100.0);

    const camX = Math.sin(yaw) * Math.cos(pitch) * distance;
    const camY = Math.sin(pitch) * distance;
    const camZ = Math.cos(yaw) * Math.cos(pitch) * distance;

    const viewMatrix = mat4Create();
    mat4LookAt(viewMatrix, [camX, camY, camZ], [0, 0, 0], [0, 1, 0]);

    // Escala para ajustar ao tamanho padrão
    const scale = 2.0 / (currentModel.maxDim || 1);
    const modelViewMatrix = mat4Create();
    // Aplica translação para centralizar e escala
    for (let i = 0; i < 16; i++) modelViewMatrix[i] = viewMatrix[i];

    // Desloca pelo centro do modelo para rotação em torno do centro de massa e escala uniforme
    if (currentModel.center) {
      const cx = currentModel.center[0], cy = currentModel.center[1], cz = currentModel.center[2];
      modelViewMatrix[12] += (viewMatrix[0] * -cx + viewMatrix[4] * -cy + viewMatrix[8] * -cz) * scale;
      modelViewMatrix[13] += (viewMatrix[1] * -cx + viewMatrix[5] * -cy + viewMatrix[9] * -cz) * scale;
      modelViewMatrix[14] += (viewMatrix[2] * -cx + viewMatrix[6] * -cy + viewMatrix[10] * -cz) * scale;
    }
    modelViewMatrix[0] *= scale; modelViewMatrix[1] *= scale; modelViewMatrix[2] *= scale;
    modelViewMatrix[4] *= scale; modelViewMatrix[5] *= scale; modelViewMatrix[6] *= scale;
    modelViewMatrix[8] *= scale; modelViewMatrix[9] *= scale; modelViewMatrix[10] *= scale;

    const normMatrix = new Float32Array(9);
    mat3NormalFromMat4(normMatrix, modelViewMatrix);

    gl.useProgram(shaderProgram);
    gl.uniformMatrix4fv(programInfo.uniforms.projectionMatrix, false, projMatrix);
    gl.uniformMatrix4fv(programInfo.uniforms.modelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix3fv(programInfo.uniforms.normalMatrix, false, normMatrix);

    // Cor-tema do personagem
    let colorRGB = [0.25, 0.6, 1.0];
    if (currentItem && currentItem.owner) {
      const charDef = typeof CHARACTERS_BY_ID !== 'undefined' ? CHARACTERS_BY_ID[currentItem.owner] : null;
      if (charDef && charDef.color) {
        const hex = charDef.color.replace('#', '');
        colorRGB = [
          parseInt(hex.substr(0, 2), 16) / 255,
          parseInt(hex.substr(2, 2), 16) / 255,
          parseInt(hex.substr(4, 2), 16) / 255
        ];
      }
    }

    gl.uniform3fv(programInfo.uniforms.color, colorRGB);
    gl.uniform1i(programInfo.uniforms.useTexture, 0);
    gl.uniform1i(programInfo.uniforms.wireframe, wireframe ? 1 : 0);

    // Desenha cada primitiva da malha
    for (const p of currentModel.gpuPrimitives) {
      gl.bindBuffer(gl.ARRAY_BUFFER, p.posBuf);
      gl.vertexAttribPointer(programInfo.attribs.position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(programInfo.attribs.position);

      if (p.normBuf) {
        gl.bindBuffer(gl.ARRAY_BUFFER, p.normBuf);
        gl.vertexAttribPointer(programInfo.attribs.normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribs.normal);
      } else {
        gl.disableVertexAttribArray(programInfo.attribs.normal);
      }

      const drawMode = wireframe ? gl.LINES : gl.TRIANGLES;
      if (p.idxBuf) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.idxBuf);
        gl.drawElements(drawMode, p.indexCount, p.indexType, 0);
      } else {
        gl.drawArrays(drawMode, 0, p.vertexCount);
      }
    }
  }

  function loadBuffer(arrayBuffer) {
    try {
      const parsed = parseGLB(arrayBuffer);
      currentModel = createModelBuffers(parsed);

      const info = document.getElementById('glb-poly-info');
      if (info) {
        info.innerHTML = `Vértices: <span style="color:#fff;">${currentModel.totalVerts.toLocaleString()}</span> · Triângulos: <span style="color:#fff;">${currentModel.totalTris.toLocaleString()}</span> · Enquadramento: OK`;
      }
    } catch (err) {
      console.warn('Erro ao processar buffer GLB:', err);
      const info = document.getElementById('glb-poly-info');
      if (info) {
        info.innerHTML = `<span style="color:#ff8080;">Aviso:</span> ${err.message}. Use o botão "Abrir GLB" para carregar direto do disco.`;
      }
    }
  }

  // Carrega arquivo GLB a partir de um caminho
  async function loadGLB(path) {
    const info = document.getElementById('glb-poly-info');
    if (info) info.textContent = 'Carregando arquivo 3D...';

    try {
      const response = await fetch(encodeURI(path));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      loadBuffer(buffer);
    } catch (e) {
      console.warn('Fetch GLB não acessível diretamente (CORS/file://):', e.message);
      if (info) {
        info.innerHTML = `
          <span style="color:#ffb366;">Modo Local:</span> Política de segurança do navegador bloqueou leitura direta de arquivo local.<br>
          Clique em <span style="color:#fff; font-weight:bold;">"Abrir GLB"</span> abaixo e selecione o arquivo correspondente para renderizar em 3D.
        `;
      }
    }
  }

  // =========================================================================
  // MINI-RENDERIZADOR WEBGL DE PRÉVIA EM 360° (OFFSCREEN)
  // =========================================================================
  let prevCanvas = null;
  let prevGL = null;
  let prevProgramInfo = null;
  let prevShaderProg = null;
  const previewModelCache = new Map();
  const previewLoading = new Set();
  const previewSmokeParticles = [];

  function initPreviewGL() {
    if (prevGL) return true;
    try {
      prevCanvas = document.createElement('canvas');
      prevCanvas.width = 256;
      prevCanvas.height = 256;
      prevGL = prevCanvas.getContext('webgl', { antialias: true, alpha: true, preserveDrawingBuffer: true });
      if (!prevGL) return false;
      prevGL.getExtension('OES_element_index_uint');   // índices de 32 bits dos .glb (ver initGL)

      const vs = createShader(prevGL, prevGL.VERTEX_SHADER, VS_SOURCE);
      const fs = createShader(prevGL, prevGL.FRAGMENT_SHADER, FS_SOURCE);
      if (!vs || !fs) return false;

      prevShaderProg = prevGL.createProgram();
      prevGL.attachShader(prevShaderProg, vs);
      prevGL.attachShader(prevShaderProg, fs);
      prevGL.linkProgram(prevShaderProg);
      if (!prevGL.getProgramParameter(prevShaderProg, prevGL.LINK_STATUS)) return false;

      prevProgramInfo = {
        program: prevShaderProg,
        attribs: {
          position: prevGL.getAttribLocation(prevShaderProg, 'aPosition'),
          normal: prevGL.getAttribLocation(prevShaderProg, 'aNormal'),
          texCoord: prevGL.getAttribLocation(prevShaderProg, 'aTexCoord'),
        },
        uniforms: {
          projectionMatrix: prevGL.getUniformLocation(prevShaderProg, 'uProjectionMatrix'),
          modelViewMatrix: prevGL.getUniformLocation(prevShaderProg, 'uModelViewMatrix'),
          normalMatrix: prevGL.getUniformLocation(prevShaderProg, 'uNormalMatrix'),
          color: prevGL.getUniformLocation(prevShaderProg, 'uColor'),
          useTexture: prevGL.getUniformLocation(prevShaderProg, 'uUseTexture'),
          sampler: prevGL.getUniformLocation(prevShaderProg, 'uSampler'),
          wireframe: prevGL.getUniformLocation(prevShaderProg, 'uWireframe'),
        }
      };

      prevGL.enable(prevGL.DEPTH_TEST);
      prevGL.depthFunc(prevGL.LEQUAL);
      prevGL.enable(prevGL.BLEND);
      prevGL.blendFunc(prevGL.SRC_ALPHA, prevGL.ONE_MINUS_SRC_ALPHA);
      return true;
    } catch (e) {
      console.warn('Offscreen WebGL failed:', e);
      return false;
    }
  }

  function loadPreviewGLB(path) {
    if (!path || previewModelCache.has(path) || previewLoading.has(path)) return;
    previewLoading.add(path);
    fetch(encodeURI(path))
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then(buffer => {
        const parsed = parseGLB(buffer);
        if (initPreviewGL()) {
          const gpu = createModelBuffers(parsed, prevGL);
          previewModelCache.set(path, gpu);
        }
        previewLoading.delete(path);
      })
      .catch(err => {
        console.warn('Falha ao carregar preview GLB:', path, err);
        previewLoading.delete(path);
      });
  }

  function renderPreview3D(gpuModel, yaw, pitch, colorRGB) {
    if (!initPreviewGL() || !gpuModel) return false;
    const g = prevGL;
    g.viewport(0, 0, 256, 256);
    g.clearColor(0.0, 0.0, 0.0, 0.0);
    g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);

    const projMatrix = mat4Create();
    mat4Perspective(projMatrix, 42 * Math.PI / 180, 1.0, 0.1, 100.0);

    const dist = 3.2;
    const camX = Math.sin(yaw) * Math.cos(pitch) * dist;
    const camY = Math.sin(pitch) * dist;
    const camZ = Math.cos(yaw) * Math.cos(pitch) * dist;

    const viewMatrix = mat4Create();
    mat4LookAt(viewMatrix, [camX, camY, camZ], [0, 0, 0], [0, 1, 0]);

    const scale = 2.0 / (gpuModel.maxDim || 1);
    const modelViewMatrix = mat4Create();
    for (let i = 0; i < 16; i++) modelViewMatrix[i] = viewMatrix[i];

    // Desloca para o centro do modelo e aplica escala uniforme
    if (gpuModel.center) {
      const cx = gpuModel.center[0], cy = gpuModel.center[1], cz = gpuModel.center[2];
      modelViewMatrix[12] += (viewMatrix[0] * -cx + viewMatrix[4] * -cy + viewMatrix[8] * -cz) * scale;
      modelViewMatrix[13] += (viewMatrix[1] * -cx + viewMatrix[5] * -cy + viewMatrix[9] * -cz) * scale;
      modelViewMatrix[14] += (viewMatrix[2] * -cx + viewMatrix[6] * -cy + viewMatrix[10] * -cz) * scale;
    }
    modelViewMatrix[0] *= scale; modelViewMatrix[1] *= scale; modelViewMatrix[2] *= scale;
    modelViewMatrix[4] *= scale; modelViewMatrix[5] *= scale; modelViewMatrix[6] *= scale;
    modelViewMatrix[8] *= scale; modelViewMatrix[9] *= scale; modelViewMatrix[10] *= scale;

    const normMatrix = new Float32Array(9);
    mat3NormalFromMat4(normMatrix, modelViewMatrix);

    g.useProgram(prevProgramInfo.program);
    g.uniformMatrix4fv(prevProgramInfo.uniforms.projectionMatrix, false, projMatrix);
    g.uniformMatrix4fv(prevProgramInfo.uniforms.modelViewMatrix, false, modelViewMatrix);
    g.uniformMatrix3fv(prevProgramInfo.uniforms.normalMatrix, false, normMatrix);
    g.uniform3fv(prevProgramInfo.uniforms.color, colorRGB);
    g.uniform1i(prevProgramInfo.uniforms.useTexture, 0);
    g.uniform1i(prevProgramInfo.uniforms.wireframe, 0);

    for (const p of gpuModel.gpuPrimitives) {
      g.bindBuffer(g.ARRAY_BUFFER, p.posBuf);
      g.vertexAttribPointer(prevProgramInfo.attribs.position, 3, g.FLOAT, false, 0, 0);
      g.enableVertexAttribArray(prevProgramInfo.attribs.position);

      if (p.normBuf) {
        g.bindBuffer(g.ARRAY_BUFFER, p.normBuf);
        g.vertexAttribPointer(prevProgramInfo.attribs.normal, 3, g.FLOAT, false, 0, 0);
        g.enableVertexAttribArray(prevProgramInfo.attribs.normal);
      } else {
        g.disableVertexAttribArray(prevProgramInfo.attribs.normal);
      }

      if (p.idxBuf) {
        g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, p.idxBuf);
        g.drawElements(g.TRIANGLES, p.indexCount, p.indexType, 0);
      } else {
        g.drawArrays(g.TRIANGLES, 0, p.vertexCount);
      }
    }
    return true;
  }

  return {
    open(item) {
      buildModal();
      if (!initGL()) {
        alert('WebGL não disponível neste navegador.');
        return;
      }

      currentItem = item;
      currentModel = null;
      yaw = 0.5;
      pitch = 0.2;
      distance = 3.5;

      const titleEl = document.getElementById('glb-title');
      const subEl = document.getElementById('glb-subtitle');
      if (titleEl) titleEl.textContent = (item.name || 'MODELO 3D').toUpperCase();
      if (subEl) {
        const ownerName = item.owner ? (typeof CHARACTERS_BY_ID !== 'undefined' && CHARACTERS_BY_ID[item.owner] ? CHARACTERS_BY_ID[item.owner].name : item.owner) : '';
        const reqLvl = item.unlock ? item.unlock.value : (item.unlockLevel || 1);
        subEl.textContent = `${ownerName.toUpperCase()} · REQUER NÍVEL ${reqLvl} · INSPEÇÃO HOLOGRÁFICA`;
      }

      modal.style.display = 'flex';
      setTimeout(() => modal.style.opacity = '1', 10);

      if (item.glb) {
        loadGLB(item.glb);
      } else {
        const info = document.getElementById('glb-poly-info');
        if (info) info.innerHTML = '<span style="color:#ffb366;">Este item utiliza renderização 2D de alta fidelidade exclusiva.</span>';
      }

      if (animId) cancelAnimationFrame(animId);
      animId = requestAnimationFrame(renderLoop);
    },

    close() {
      if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
          modal.style.display = 'none';
          if (animId) cancelAnimationFrame(animId);
        }, 250);
      }
    },

    drawTurntablePreview(ctx, item, box, now, interactive) {
      if (!item || !box) return;
      ctx.save();

      // Cor tema do item / personagem
      let colorRGB = [0.28, 0.65, 1.0];
      let rgbStr = '70, 160, 255';
      let tintHex = (item.visual && item.visual.tint) || (item.owner && typeof CHARACTERS_BY_ID !== 'undefined' && CHARACTERS_BY_ID[item.owner] && CHARACTERS_BY_ID[item.owner].color);
      if (tintHex) {
        if (typeof hexToRgb !== 'undefined') rgbStr = hexToRgb(tintHex);
        const hex = tintHex.replace('#', '');
        if (hex.length >= 6) {
          colorRGB = [
            parseInt(hex.substr(0, 2), 16) / 255,
            parseInt(hex.substr(2, 2), 16) / 255,
            parseInt(hex.substr(4, 2), 16) / 255
          ];
        }
      }

      // Painel holográfico de fundo
      ctx.fillStyle = 'rgba(3, 8, 20, 0.92)';
      if (typeof techPanelPath !== 'undefined') techPanelPath(ctx, box.x, box.y, box.w, box.h, 8);
      else ctx.rect(box.x, box.y, box.w, box.h);
      ctx.fill();

      // Borda futurista com brilho
      ctx.strokeStyle = `rgba(${rgbStr}, 0.55)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Cantos tecnológicos
      const c = 8;
      ctx.strokeStyle = `rgba(${rgbStr}, 0.95)`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(box.x, box.y + c); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + c, box.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(box.x + box.w - c, box.y); ctx.lineTo(box.x + box.w, box.y); ctx.lineTo(box.x + box.w, box.y + c); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(box.x, box.y + box.h - c); ctx.lineTo(box.x, box.y + box.h); ctx.lineTo(box.x + c, box.y + box.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(box.x + box.w - c, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h - c); ctx.stroke();

      const cx = box.x + box.w / 2;
      const cyBase = box.y + box.h - 26;
      const rx = box.w * 0.38;
      const ry = 13;

      // Aura luminosa no chão (base giratória)
      if (typeof GlowCache !== 'undefined') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        GlowCache.drawFlat(ctx, rgbStr, cx, cyBase, rx * 1.5, 0.32 + 0.1 * Math.sin(now * 3.2));
        ctx.restore();
      }

      // Plataforma elíptica
      ctx.strokeStyle = `rgba(${rgbStr}, 0.8)`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(cx, cyBase, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(${rgbStr}, 0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cyBase, rx * 0.65, ry * 0.65, 0, 0, Math.PI * 2); ctx.stroke();

      // Marcadores radiais em 360° girando
      const yaw = (interactive && interactive.yaw !== undefined) ? interactive.yaw : (now * 1.5);
      const pitch = (interactive && interactive.pitch !== undefined) ? interactive.pitch : (0.2 + 0.04 * Math.sin(now * 2.2));
      ctx.strokeStyle = `rgba(${rgbStr}, 0.85)`;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 12; i++) {
        const ang = i * (Math.PI * 2 / 12) + yaw;
        const px1 = cx + Math.cos(ang) * (rx * 0.82);
        const py1 = cyBase + Math.sin(ang) * (ry * 0.82);
        const px2 = cx + Math.cos(ang) * rx;
        const py2 = cyBase + Math.sin(ang) * ry;
        ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
      }

      // Fumaça / vapor energético saindo da base da armadura
      if (previewSmokeParticles.length < 22 && Math.random() < 0.65) {
        previewSmokeParticles.push({
          x: cx + (Math.random() - 0.5) * rx * 1.2,
          y: cyBase + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 14,
          vy: -22 - Math.random() * 26,
          r: 2.5 + Math.random() * 2.5,
          life: 1.0,
          maxLife: 1.0 + Math.random() * 0.7,
          ph: Math.random() * Math.PI * 2
        });
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = previewSmokeParticles.length - 1; i >= 0; i--) {
        const p = previewSmokeParticles[i];
        p.life -= 0.016;
        if (p.life <= 0) { previewSmokeParticles.splice(i, 1); continue; }
        p.y += p.vy * 0.016;
        p.x += (p.vx + Math.sin(now * 3 + p.ph) * 12) * 0.016;
        p.r += 0.12;
        const alpha = (p.life / p.maxLife) * 0.28;
        ctx.fillStyle = `rgba(${rgbStr}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Renderização 3D do modelo
      let rendered3D = false;
      if (item.glb) {
        const gpu = previewModelCache.get(item.glb);
        if (gpu) {
          renderPreview3D(gpu, yaw, pitch, colorRGB);
          const sz = Math.min(box.w - 14, box.h - 32);
          ctx.drawImage(prevCanvas, cx - sz / 2, cyBase - sz * 0.88, sz, sz);
          rendered3D = true;
        } else {
          loadPreviewGLB(item.glb);
        }
      }

      // Fallback em 3D giratório via sprite com iluminação e perspectiva
      if (!rendered3D) {
        const img = item.png ? (typeof SpecialAssets !== 'undefined' ? SpecialAssets.getImg(item.png) : null) : null;
        if (img && img.complete && img.naturalWidth) {
          const is = Math.min((box.w - 24) / img.naturalWidth, (box.h - 48) / img.naturalHeight);
          const iw = img.naturalWidth * is;
          const ih = img.naturalHeight * is;
          const cosY = Math.cos(yaw);
          ctx.save();
          ctx.translate(cx, cyBase - ih * 0.55);
          ctx.scale(cosY, 1); // Rotação 360 graus completa!
          ctx.globalAlpha = 0.4 + 0.6 * Math.abs(cosY);
          ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
          ctx.restore();
        } else if (item.kind && typeof RosterArt !== 'undefined' && RosterArt.weaponIcon) {
          const cosY = Math.cos(yaw);
          ctx.save();
          ctx.translate(cx, cyBase - 42);
          ctx.scale(cosY, 1);
          RosterArt.weaponIcon(ctx, item.kind, 0, 0, Math.min(46, box.w * 0.35), rgbStr, item.implemented);
          ctx.restore();
        }
      }

      // Selos HUD holográficos
      ctx.font = `bold 9px ${typeof FONT_TITLE !== 'undefined' ? FONT_TITLE : 'sans-serif'}`;
      ctx.letterSpacing = '1px';
      ctx.fillStyle = '#00ffd5';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('● 360° 3D', box.x + 8, box.y + 8);

      const hoverBtn = interactive && interactive.hover;
      ctx.fillStyle = hoverBtn ? '#ffffff' : `rgba(${rgbStr}, 0.85)`;
      ctx.textAlign = 'right';
      ctx.fillText(item.glb ? 'AMPLIAR [V]' : 'VISÃO 360°', box.x + box.w - 8, box.y + 8);

      const deg = Math.round((((yaw % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2)) * 180 / Math.PI);
      ctx.font = `bold 8.5px ${typeof FONT_TITLE !== 'undefined' ? FONT_TITLE : 'sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(${rgbStr}, 0.75)`;
      ctx.fillText(`ROT: ${deg}° · ARRASTE P/ GIRAR`, cx, box.y + box.h - 8);
      ctx.letterSpacing = '0px';

      ctx.restore();
    }
  };
})();
