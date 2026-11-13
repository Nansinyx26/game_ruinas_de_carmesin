'use strict';
// ECLIPSE ZERO · Pisos e terrenos (Terreno)
// ---------------------------------------------------------------------------
// O chão de cada sala (cidades, regiões, túneis, interiores e a campanha) é um ATLAS próprio,
// pintado ao carregar a zona a partir de uma biblioteca de materiais gerados por código (nada de
// imagens nem bibliotecas):
//   - MATERIAIS (MAT): cada um é uma textura que se repete sem emenda, com cor (a oclusão das
//     frestas já vem nela), relevo, aspereza, metal e, nos que brilham, emissão. Natureza: grama,
//     terra, folhiço, rocha, areia, deserto rachado, solo contaminado, neve, gelo, basalto com
//     lava, cinza, destroços, lama, leito de lago e cascalho. Cidade: paralelepípedo, lajes,
//     madeira, mármore, asfalto, concreto tecnológico, calçada, chapa de metal, grade, plataforma
//     com neon, vidro reforçado, circuito, pedra carmim, cristal do Nulo e azulejo.
//   - RECEITAS: cada tema (e algumas zonas) combina vários materiais por máscaras — manchas de
//     ruído com borda irregular (transição natural), ruas, calçadas, praças, trilhos, canaletas —,
//     cada camada com giro, escala e deslocamento sorteados (sem padrão repetido), e por cima os
//     detalhes: sujeira, rachaduras, poças, marcas de pneu e de passos, faixas, setas
//     holográficas, painéis de luz, a luz dos postes e as sombras de contato.
//   - Na 3ª pessoa (js/terceira.js) o atlas vai para o programa com textura do motor: cor, mapa de
//     material (metal, aspereza, relevo), EMISSÃO e o DETALHE DE PERTO — uma textura de relevo
//     repetida pela posição no mundo, com parallax, que some com a distância (js/engine3d.js) —
//     e a geometria de detalhe: meio-fio, trilhos, molduras das canaletas, painéis de luz,
//     tubulações e passarelas. Na isométrica (Room.drawFloor) o mesmo atlas, com o relevo
//     sombreado e a emissão, entra na imagem pré-renderizada da sala.
// Desempenho: cada material é gerado uma vez por sessão (256 ou 512 px) e as camadas são
// compostas pelo canvas (GPU); o atlas tem 2048 px (1024 na qualidade média) e mipmaps; o
// detalhe é uma textura de 256 px repetida; nada disso roda a cada quadro. Na qualidade baixa,
// o chão volta às placas de cor.
// ---------------------------------------------------------------------------
const Terreno = (function () {
  const { hash } = TexturasMundo.ruido;
  const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const sm = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };   // (a > b: decrescente)
  const lerp3 = (A, B, k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k];
  const qual = () => (typeof Settings !== 'undefined' ? Settings.v.quality : 2);
  const dom = () => typeof document !== 'undefined';
  const novo = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ------------------------------------------------------------ ruído periódico
  // valor com períodos separados em x e y (fios de capim, veios de madeira, metal escovado)
  function vn(x, y, px, py, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
    const a = hash(x0, y0, s), b = hash(x1, y0, s), c = hash(x0, y1, s), d = hash(x1, y1, s);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fb(u, v, bx, by, oct, s) {
    let t = 0, amp = 0.5, n = 0, fx = bx, fy = by;
    for (let o = 0; o < oct; o++) { t += vn(u * fx, v * fy, fx, fy, s + o * 17) * amp; n += amp; amp *= 0.5; fx *= 2; fy *= 2; }
    return t / n;
  }
  const F = (u, v, b, oct, s) => fb(u, v, b, b, oct, s);
  // linhas finas onde o ruído cruza o meio (fissuras, fios, veios)
  const crista = (u, v, b, oct, s, w) => sm(1 - w, 1, 1 - Math.abs(F(u, v, b, oct, s) - 0.5) * 2);
  // células (Worley) periódicas: distâncias ao ponto mais perto e ao segundo, e o sorteio da célula
  const CEL = { d1: 0, d2: 0, id: 0 };
  function cel(u, v, n, s) {
    const x = u * n, y = v * n, xi = Math.floor(x), yi = Math.floor(y);
    let d1 = 9, d2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = xi + i, cy = yi + j, wx = ((cx % n) + n) % n, wy = ((cy % n) + n) % n;
      const px = cx + hash(wx, wy, s), py = cy + hash(wx, wy, s + 9), d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < d1) { d2 = d1; d1 = d; id = hash(wx, wy, s + 5); } else if (d < d2) d2 = d;
    }
    CEL.d1 = Math.sqrt(d1); CEL.d2 = Math.sqrt(d2); CEL.id = id;
    return CEL;
  }
  // blocos (lajes, placas, tábuas): nx × ny por repetição, fileiras deslocadas; e = distância à junta
  const BLO = { lx: 0, ly: 0, id: 0, e: 0 };
  function bloco(u, v, nx, ny, desl, s) {
    const y = v * ny, iy = Math.floor(y), x = u * nx + (((iy % 2) + 2) % 2) * desl, ix = Math.floor(x);
    BLO.lx = x - ix; BLO.ly = y - iy;
    BLO.id = hash(((ix % nx) + nx) % nx, ((iy % ny) + ny) % ny, s);
    BLO.e = Math.min(Math.min(BLO.lx, 1 - BLO.lx) / nx, Math.min(BLO.ly, 1 - BLO.ly) / ny);
    return BLO;
  }
  // saída de um pixel: o = [r, g, b, altura, aspereza, metal, er, eg, eb]; ak = quanto a altura
  // escurece as partes baixas (oclusão das frestas, já na cor)
  function fim(o, c, h, ro, me, ak) {
    h = cl(h); const ao = 1 - ak * (1 - h);
    o[0] = c[0] * ao; o[1] = c[1] * ao; o[2] = c[2] * ao; o[3] = h; o[4] = cl(ro); o[5] = cl(me); o[6] = o[7] = o[8] = 0;
  }
  const luz = (o, c, k) => { o[6] = c[0] * k; o[7] = c[1] * k; o[8] = c[2] * k; };
  const NEON = { ciano: [40, 230, 255], azul: [70, 120, 255], magenta: [255, 60, 220], ambar: [255, 170, 60], verde: [90, 255, 150], vermelho: [255, 50, 60], violeta: [170, 110, 255] };

  // ------------------------------------------------------------ materiais
  // escala: unidades do mundo por repetição; det: família do detalhe de perto; S: lado em pixels
  // (512 nos que têm linhas finas); P.cor: cor da emissão (neon)
  const MAT = {
    grama: { nome: 'Grama', escala: 200, det: 'grama', px(u, v, r, o) {
      const n = F(u, v, 4, 5, 11), m = F(u, v, 2, 3, 13), seco = F(u, v, 3, 4, 19);
      const fio = Math.max(fb(u, v, 128, 32, 2, 31), fb(u, v, 32, 128, 2, 37));
      let c = lerp3([40, 70, 32], [92, 128, 52], n * 0.65 + m * 0.35);
      c = lerp3(c, [118, 116, 58], sm(0.58, 0.78, seco) * 0.55);                 // capim seco
      c = lerp3(c, [24, 44, 20], (1 - fio) * 0.45);                               // sombra entre os fios
      const terra = sm(0.7, 0.82, F(u, v, 5, 3, 17));
      c = lerp3(c, [92, 72, 48], terra * 0.75);
      if (r < 0.0012) c = r < 0.0005 ? [220, 214, 120] : r < 0.0009 ? [210, 130, 160] : [170, 200, 250];   // florzinhas
      fim(o, c, 0.35 + fio * 0.45 + n * 0.2 - terra * 0.3, 0.88, 0, 0.3);
    } },
    terra: { nome: 'Terra batida', escala: 160, det: 'solo', px(u, v, r, o) {
      const n = F(u, v, 4, 5, 41), g = F(u, v, 16, 3, 43), C = cel(u, v, 28, 47);
      let c = lerp3([74, 56, 40], [122, 94, 64], n);
      c = lerp3(c, [58, 44, 32], sm(0.55, 0.75, g) * 0.5);
      const seixo = C.id > 0.55 ? 1 - sm(0.16, 0.24, C.d1) : 0;
      c = lerp3(c, lerp3([110, 104, 96], [150, 142, 130], C.id), seixo);
      const fis = crista(u, v, 6, 4, 49, 0.05) * 0.6;
      c = lerp3(c, [40, 30, 22], fis);
      fim(o, c, 0.45 + n * 0.2 + seixo * 0.35 * (1 - C.d1 * 3) - fis * 0.3, 0.9 - seixo * 0.2, 0, 0.35);
    } },
    folhas: { nome: 'Folhiço e musgo', escala: 140, det: 'solo', px(u, v, r, o) {
      const n = F(u, v, 4, 4, 101), C = cel(u, v, 46, 103), folha = 1 - sm(0.22, 0.34, C.d1), id = C.id;
      const P = [[96, 62, 30], [130, 90, 36], [70, 84, 34], [150, 110, 50], [80, 50, 28]];
      let c = lerp3([44, 36, 26], [70, 58, 40], n);
      c = lerp3(c, P[Math.floor(id * 5) % 5], folha * 0.9);
      const musgo = sm(0.62, 0.74, F(u, v, 4, 3, 107));
      c = lerp3(c, [58, 92, 40], musgo * 0.7);
      fim(o, c, 0.4 + folha * 0.35 + musgo * 0.15 + n * 0.1, 0.86, 0, 0.45);
    } },
    rocha: { nome: 'Rocha', escala: 220, det: 'pedra', px(u, v, r, o) {
      const C = cel(u, v, 6, 61), fenda = 1 - sm(0, 0.05, C.d2 - C.d1), id = C.id, n = F(u, v, 5, 5, 63);
      const est = Math.sin((v * 7 + n * 2.5) * Math.PI * 2) * 0.5 + 0.5;
      let c = lerp3([88, 84, 80], [142, 136, 128], cl(n * 0.7 + est * 0.3 + (id - 0.5) * 0.25));
      c = lerp3(c, [104, 112, 66], sm(0.72, 0.82, F(u, v, 8, 3, 67)) * 0.5);       // líquen
      c = lerp3(c, [26, 24, 22], fenda * 0.85);
      fim(o, c, 0.5 + n * 0.35 - fenda * 0.5, 0.78, 0, 0.35);
    } },
    areia: { nome: 'Areia', escala: 200, det: 'areia', px(u, v, r, o) {
      const w = F(u, v, 3, 3, 71), onda = Math.sin((v * 9 + w * 2.4 + u * 2) * Math.PI * 2);
      const grao = vn(u * 256, v * 256, 256, 256, 73), n = F(u, v, 4, 4, 77);
      let c = lerp3([168, 128, 84], [214, 180, 128], n);
      c = lerp3(c, onda > 0 ? [232, 202, 150] : [150, 112, 70], Math.abs(onda) * 0.3);
      if (grao > 0.85) c = lerp3(c, [120, 92, 60], 0.4);
      if (r < 0.0015) c = [96, 80, 64];
      fim(o, c, 0.5 + onda * 0.28 + grao * 0.08, 0.95, 0, 0.3);
    } },
    rachado: { nome: 'Deserto rachado', escala: 210, det: 'areia', px(u, v, r, o) {
      const C = cel(u, v, 9, 81), gap = C.d2 - C.d1, fenda = 1 - sm(0, 0.045, gap), id = C.id, n = F(u, v, 4, 4, 83);
      let c = lerp3([170, 128, 86], [208, 172, 124], n * 0.6 + id * 0.4);
      c = lerp3(c, [196, 176, 150], sm(0.6, 0.8, F(u, v, 6, 3, 87)) * 0.4);       // poeira clara
      c = lerp3(c, [92, 62, 40], fenda * 0.9);
      fim(o, c, 0.62 - fenda * 0.55 + (1 - sm(0, 0.12, gap)) * 0.1, 0.96, 0, 0.35);
    } },
    contaminado: { nome: 'Solo contaminado', escala: 190, det: 'solo', emite: true, px(u, v, r, o) {
      const n = F(u, v, 4, 5, 91), q = F(u, v, 3, 4, 93), tox = sm(0.74, 0.78, F(u, v, 6, 4, 97)), C = cel(u, v, 12, 99);
      const fenda = 1 - sm(0, 0.04, C.d2 - C.d1);
      let c = lerp3([44, 40, 34], [80, 72, 56], n);
      c = lerp3(c, [22, 20, 18], sm(0.6, 0.75, q) * 0.7);                           // queimado
      c = lerp3(c, [16, 14, 12], fenda * 0.7);
      c = lerp3(c, [66, 92, 42], tox * 0.8);                                         // poças tóxicas
      c = lerp3(c, [92, 88, 40], (1 - tox) * sm(0.66, 0.74, F(u, v, 6, 4, 97)) * 0.5);   // borda amarelada
      fim(o, c, 0.45 + n * 0.25 - tox * 0.3 - fenda * 0.3, 0.92 - tox * 0.78, 0, 0.35);
      if (tox > 0) luz(o, [60, 190, 60], tox * (0.22 + 0.2 * n));
    } },
    neve: { nome: 'Neve', escala: 220, det: 'neve', px(u, v, r, o) {
      const n = F(u, v, 3, 5, 111), g = F(u, v, 6, 3, 113), vento = Math.sin((u * 5 + n * 1.8 + v * 2) * Math.PI * 2) * 0.5 + 0.5;
      let c = lerp3([176, 192, 216], [240, 244, 250], n * 0.7 + vento * 0.3);
      c = lerp3(c, [150, 168, 200], sm(0.62, 0.8, g) * 0.35);                       // sombras azuladas
      const brilho = hash(Math.floor(u * 512), Math.floor(v * 512), 117) > 0.996;
      fim(o, brilho ? [255, 255, 255] : c, 0.35 + n * 0.45 + vento * 0.15, brilho ? 0.15 : 0.62, 0, 0.18);
    } },
    gelo: { nome: 'Gelo', escala: 240, det: 'vidro', px(u, v, r, o) {
      const n = F(u, v, 3, 5, 121), C = cel(u, v, 7, 123), trinca = 1 - sm(0, 0.02, C.d2 - C.d1), id = C.id, bolha = vn(u * 128, v * 128, 128, 128, 127);
      let c = lerp3([96, 150, 196], [168, 206, 236], n * 0.6 + id * 0.4);
      c = lerp3(c, [228, 240, 252], trinca * 0.8);
      if (bolha > 0.86) c = lerp3(c, [210, 230, 245], 0.4);
      fim(o, c, 0.5 + n * 0.1 - trinca * 0.15, 0.1 + trinca * 0.4, 0, 0.1);
    } },
    basalto: { nome: 'Basalto com lava', escala: 200, det: 'pedra', emite: true, px(u, v, r, o) {
      const C = cel(u, v, 7, 131), fenda = 1 - sm(0, 0.07, C.d2 - C.d1), id = C.id, n = F(u, v, 4, 5, 133);
      let c = lerp3([38, 28, 26], [74, 54, 46], n * 0.7 + id * 0.3);
      c = lerp3(c, [92, 86, 84], sm(0.62, 0.76, F(u, v, 3, 3, 137)) * 0.5);
      c = lerp3(c, [12, 6, 6], fenda * 0.85);
      fim(o, c, 0.55 + n * 0.25 - fenda * 0.5, 0.82, 0, 0.35);
      if (fenda > 0.8 && id > 0.35) luz(o, [255, 96, 24], (fenda - 0.8) * 5 * (0.7 + 0.3 * n));
    } },
    cinza: { nome: 'Cinza vulcânica', escala: 170, det: 'solo', emite: true, px(u, v, r, o) {
      const n = F(u, v, 4, 5, 141), g = vn(u * 128, v * 128, 128, 128, 143), d = F(u, v, 12, 3, 145), C = cel(u, v, 22, 147);
      let c = lerp3([70, 66, 64], [118, 112, 108], n * 0.7 + g * 0.15 + d * 0.15);
      const pedra = C.id > 0.7 ? 1 - sm(0.12, 0.2, C.d1) : 0;                       // pedras-pomes soltas
      c = lerp3(c, [44, 38, 36], pedra * 0.8);
      c = lerp3(c, [52, 48, 46], crista(u, v, 7, 3, 149, 0.04) * 0.5);              // marcas do vento
      fim(o, c, 0.4 + n * 0.3 + g * 0.1 + pedra * 0.3, 0.97, 0, 0.3);
      if (r < 0.0008) luz(o, [255, 120, 40], 0.9);                                  // brasas
    } },
    destrocos: { nome: 'Destroços tecnológicos', escala: 180, det: 'metal', px(u, v, r, o) {
      const n = F(u, v, 4, 4, 151), B = bloco(u, v, 8, 9, 0.37, 153), lim = B.id, t = 0.1 + hash(Math.floor(lim * 997), 1, 155) * 0.25;
      let c = lerp3([58, 56, 54], [96, 92, 88], n), me = 0, ro = 0.92, h = 0.4 + n * 0.2;
      c = lerp3(c, [40, 38, 36], crista(u, v, 9, 3, 158, 0.05) * 0.5);
      if (lim > 0.55 && B.lx > t && B.lx < 1 - t * 0.6 && B.ly > t * 1.4 && B.ly < 1 - t) {   // placa solta (tamanho sorteado)
        const fer = sm(0.55, 0.7, F(u, v, 10, 3, 157));
        c = lerp3(lerp3([110, 114, 120], [70, 72, 78], lim), [120, 64, 36], fer * 0.8);
        me = 0.85 - fer * 0.6; ro = 0.45 + fer * 0.4; h = 0.75;
      }
      const fio = crista(u, v, 5, 3, 159, 0.015);
      if (fio > 0) { c = lerp3(c, lim > 0.5 ? [160, 60, 40] : [40, 90, 160], fio); me = Math.max(me, 0.3); h = Math.max(h, 0.6 * fio); }
      fim(o, c, h, ro, me, 0.35);
    } },
    lama: { nome: 'Lama e musgo', escala: 160, det: 'solo', px(u, v, r, o) {
      const n = F(u, v, 6, 5, 161), poca = sm(0.68, 0.72, F(u, v, 9, 3, 163)), pegada = crista(u, v, 10, 2, 165, 0.03);
      let c = lerp3([50, 42, 32], [86, 72, 54], n);
      c = lerp3(c, [40, 32, 24], pegada * 0.5);
      c = lerp3(c, [56, 96, 54], sm(0.64, 0.74, F(u, v, 8, 3, 167)) * 0.7);
      c = lerp3(c, [30, 34, 34], poca * 0.8);
      fim(o, c, 0.45 + n * 0.25 - poca * 0.3, 0.55 - poca * 0.45 - n * 0.1, 0, 0.35);
    } },
    leito: { nome: 'Leito do lago', escala: 150, det: 'solo', px(u, v, r, o) {
      const n = F(u, v, 4, 4, 171), C = cel(u, v, 30, 173), seixo = C.id > 0.4 ? 1 - sm(0.18, 0.28, C.d1) : 0;
      let c = lerp3([60, 66, 54], [96, 98, 78], n);
      c = lerp3(c, lerp3([100, 104, 96], [140, 138, 124], C.id), seixo * 0.9);
      fim(o, c, 0.4 + seixo * 0.4 + n * 0.15, 0.5, 0, 0.4);
    } },
    cascalho: { nome: 'Cascalho', escala: 90, det: 'solo', px(u, v, r, o) {
      const C = cel(u, v, 36, 331), pedra = 1 - sm(0.3, 0.45, C.d1);
      const c = lerp3([30, 28, 26], lerp3([64, 62, 60], [124, 118, 112], C.id), pedra);
      fim(o, c, 0.3 + pedra * 0.5 * (1 - C.d1 * 2), 0.9, 0, 0.5);
    } },
    // ---- cidade medieval e interiores
    paralelepipedo: { nome: 'Paralelepípedo', escala: 150, det: 'pedra', S: 512, px(u, v, r, o) {
      const C = cel(u, v, 18, 181), gap = C.d2 - C.d1, id = C.id, pedra = sm(0.04, 0.12, gap), n = F(u, v, 8, 4, 183);
      let c = lerp3([88, 84, 80], [128, 120, 110], id);
      c = lerp3(c, [104, 92, 76], hash(Math.floor(id * 1000), 3, 185) * 0.4);
      c = lerp3(c, [150, 144, 136], sm(0.1, 0.3, gap) * 0.25);                      // topo gasto
      c = lerp3(c, [60, 56, 50], n * 0.25);
      c = lerp3([40, 36, 32], c, pedra);                                             // terra entre as pedras
      c = lerp3(c, [54, 78, 40], (1 - pedra) * sm(0.6, 0.75, F(u, v, 6, 3, 187)) * 0.7);
      fim(o, c, 0.2 + sm(0.04, 0.3, gap) * 0.7 + n * 0.1, 0.62 + (1 - pedra) * 0.3, 0, 0.45);
    } },
    lajes: { nome: 'Lajes de pedra', escala: 230, det: 'pedra', S: 512, px(u, v, r, o) {
      const B = bloco(u, v, 4, 6, 0.5, 191), j = 1 - sm(0.004, 0.009, B.e), id = B.id, n = F(u, v, 6, 4, 193);
      const C = cel(u, v, 5, 195), racha = id > 0.7 ? 1 - sm(0, 0.03, C.d2 - C.d1) : 0;
      let c = lerp3([92, 88, 84], [138, 130, 120], id * 0.6 + n * 0.4);
      const gasto = sm(0.5, 0.8, F(u, v, 3, 3, 197));
      c = lerp3(c, [152, 146, 138], gasto * 0.15);
      c = lerp3(c, [40, 36, 32], Math.max(j, racha * 0.8));
      fim(o, c, 0.6 - j * 0.45 - racha * 0.25 + n * 0.1, 0.7 - gasto * 0.1, 0, 0.4);
    } },
    madeira: { nome: 'Assoalho de madeira', escala: 120, det: 'madeira', S: 512, px(u, v, r, o) {
      const B = bloco(u, v, 2, 10, 0.5, 201), id = B.id, lx = B.lx, ly = B.ly, e = B.e, g = fb(u, v, 4, 64, 3, 203);
      let c = lerp3([70, 44, 26], [128, 86, 50], id * 0.5 + g * 0.5);
      const junta = 1 - sm(0.002, 0.005, e);
      const prego = (Math.abs(lx - 0.05) < 0.012 || Math.abs(lx - 0.95) < 0.012) && Math.abs(ly - 0.5) < 0.14;
      c = lerp3(c, [26, 16, 10], junta);
      if (prego) c = [60, 60, 64];
      fim(o, c, 0.55 + g * 0.2 - junta * 0.5, 0.68, prego ? 0.8 : 0, 0.35);
    } },
    marmore: { nome: 'Mármore da catedral', escala: 200, det: 'pedra', S: 512, px(u, v, r, o) {
      const B = bloco(u, v, 6, 6, 0, 211), e = B.e, chk = (Math.floor(u * 6) + Math.floor(v * 6)) % 2;
      const veio = Math.abs(Math.sin((u * 3 + v * 2 + F(u, v, 4, 5, 213) * 3) * Math.PI * 2));
      let c = chk ? lerp3([46, 40, 58], [70, 62, 84], veio) : lerp3([150, 144, 156], [196, 190, 200], veio);
      c = lerp3(c, chk ? [120, 100, 160] : [96, 90, 104], sm(0.96, 1, veio) * 0.5);
      const j = 1 - sm(0.002, 0.005, e);
      c = lerp3(c, [24, 22, 28], j);
      fim(o, c, 0.6 - j * 0.4, 0.22 + j * 0.5, 0, 0.3);
    } },
    // ---- cidade futurista
    asfalto: { nome: 'Asfalto', escala: 180, det: 'concreto', px(u, v, r, o) {
      const n = F(u, v, 5, 5, 221), ag = vn(u * 256, v * 256, 256, 256, 223), C = cel(u, v, 5, 225), m = F(u, v, 3, 3, 227);
      let c = lerp3([30, 30, 34], [50, 50, 54], n);
      if (ag > 0.78) c = lerp3(c, [92, 92, 96], (ag - 0.78) * 3);                    // agregado
      const remendo = sm(0.7, 0.72, m);
      c = lerp3(c, [22, 22, 25], remendo * 0.8);
      const racha = C.id > 0.45 ? 1 - sm(0, 0.022, C.d2 - C.d1) : 0;
      c = lerp3(c, [12, 12, 14], racha * 0.9);
      c = lerp3(c, [64, 64, 66], sm(0.45, 0.75, F(u, v, 2, 3, 229)) * 0.25);         // gasto
      fim(o, c, 0.5 + ag * 0.15 - racha * 0.45, 0.82 - remendo * 0.1, 0, 0.3);
    } },
    concreto: { nome: 'Concreto tecnológico', escala: 220, det: 'concreto', S: 512, px(u, v, r, o) {
      const B = bloco(u, v, 3, 3, 0, 231), id = B.id, lx = B.lx, ly = B.ly, e = B.e, n = F(u, v, 6, 5, 233), poro = vn(u * 256, v * 256, 256, 256, 235);
      let c = lerp3([70, 74, 80], [104, 108, 114], id * 0.4 + n * 0.6);
      if (Math.abs(lx - 0.5) < 0.004 || Math.abs(ly - 0.5) < 0.004) c = lerp3(c, [40, 44, 50], 0.25);   // frisos
      if (poro > 0.9) c = lerp3(c, [50, 52, 56], 0.5);
      c = lerp3(c, [48, 46, 44], sm(0.6, 0.85, F(u, v, 3, 4, 237)) * 0.4);          // manchas
      const j = 1 - sm(0.003, 0.006, e);
      c = lerp3(c, [30, 34, 40], j * 0.9);
      const paraf = Math.hypot(Math.min(lx, 1 - lx) - 0.06, Math.min(ly, 1 - ly) - 0.06) < 0.018;
      if (paraf) c = [140, 146, 154];
      fim(o, c, 0.6 - j * 0.4 + (paraf ? 0.3 : 0) + n * 0.1, paraf ? 0.35 : 0.72, paraf ? 0.9 : j * 0.6, 0.35);
    } },
    calcada: { nome: 'Calçada modular', escala: 140, det: 'concreto', S: 512, px(u, v, r, o) {
      const B = bloco(u, v, 4, 8, 0.5, 241), id = B.id, j = 1 - sm(0.003, 0.007, B.e), n = F(u, v, 6, 4, 243);
      let c = lerp3([88, 88, 92], [124, 124, 128], id * 0.5 + n * 0.5);
      c = lerp3(c, [44, 44, 48], j * 0.8);
      c = lerp3(c, [56, 70, 44], j * sm(0.6, 0.8, F(u, v, 5, 3, 245)) * 0.8);       // mato nas juntas
      if (r < 0.002) c = lerp3(c, [40, 40, 44], 0.7);
      fim(o, c, 0.62 - j * 0.5 + n * 0.08, 0.84, 0, 0.35);
    } },
    metal: { nome: 'Chapa de metal industrial', escala: 120, det: 'metal', S: 512, px(u, v, r, o) {
      const N = 24, a = (u + v) * N, b = (u - v) * N, fa = a - Math.floor(a), fbb = b - Math.floor(b);
      const alt = (Math.floor(a) + Math.floor(b)) % 2 === 0;
      const d = alt ? Math.abs(fa - 0.5) * 3 + Math.abs(fbb - 0.5) : Math.abs(fa - 0.5) + Math.abs(fbb - 0.5) * 3;
      const rel = 1 - sm(0.55, 0.75, d);                                              // relevo em losango
      const P = bloco(u, v, 2, 2, 0, 251), id = P.id, j = 1 - sm(0.002, 0.004, P.e);
      const suj = F(u, v, 4, 4, 253), fer = sm(0.66, 0.78, F(u, v, 5, 4, 257));
      let c = lerp3([92, 96, 102], [132, 136, 142], cl(id * 0.3 + rel * 0.4 + suj * 0.3));
      c = lerp3(c, [50, 48, 44], sm(0.5, 0.8, suj) * 0.5);
      c = lerp3(c, [112, 62, 34], fer * 0.85);                                        // ferrugem
      c = lerp3(c, [20, 20, 22], j);
      fim(o, c, 0.4 + rel * 0.35 - j * 0.3, 0.38 + suj * 0.2 + fer * 0.45, 0.92 - fer * 0.7 - j * 0.5, 0.3);
    } },
    grade: { nome: 'Grade de metal', escala: 90, det: 'metal', S: 512, px(u, v, r, o) {
      const fx = (u * 32) % 1, fy = (v * 8) % 1, barra = fx < 0.28 || fy < 0.12;
      const n = F(u, v, 4, 3, 261), fer = sm(0.62, 0.75, F(u, v, 5, 3, 263));
      let c = barra ? lerp3([78, 82, 88], [118, 122, 128], n) : [10, 11, 13];
      if (barra) c = lerp3(c, [106, 60, 34], fer * 0.7);
      fim(o, c, barra ? 0.7 : 0.05, barra ? 0.45 + fer * 0.4 : 0.9, barra ? 0.85 - fer * 0.6 : 0, 0.2);
    } },
    plataforma: { nome: 'Plataforma com neon', escala: 160, det: 'metal', S: 512, emite: true, px(u, v, r, o, P) {
      const B = bloco(u, v, 2, 2, 0, 271), id = B.id, lx = B.lx, ly = B.ly, e = Math.min(Math.min(lx, 1 - lx), Math.min(ly, 1 - ly)), n = F(u, v, 6, 4, 273);
      const chanfro = 1 - sm(0.01, 0.03, e), faixa = Math.abs(e - 0.06) < 0.008;
      const C = cel(u, v, 20, 275), favo = 1 - sm(0, 0.03, C.d2 - C.d1);
      // miolo: quatro placas menores, uma grelha de ventilação e parafusos
      const sub = Math.min(Math.abs(lx - 0.5), Math.abs(ly - 0.5)) < 0.006 && e > 0.1;
      const vent = id > 0.5 && Math.abs(lx - 0.5) < 0.16 && Math.abs(ly - 0.5) < 0.16 && ((ly * 40) % 1) < 0.45;
      const paraf = Math.hypot(Math.min(lx, 1 - lx) - 0.11, Math.min(ly, 1 - ly) - 0.11) < 0.012;
      let c = lerp3([34, 38, 48], [56, 62, 76], n * 0.6 + id * 0.4);
      c = lerp3(c, [24, 28, 36], favo * 0.55);
      if (sub) c = [22, 26, 32];
      if (vent) c = [12, 14, 18];
      if (paraf) c = [120, 128, 140];
      c = lerp3(c, [80, 88, 104], chanfro * 0.6);
      if (faixa) c = lerp3(P.cor, [255, 255, 255], 0.25);
      fim(o, c, 0.6 + chanfro * 0.2 - (faixa ? 0.1 : 0) - (sub ? 0.2 : 0) - (vent ? 0.35 : 0) + (paraf ? 0.2 : 0), 0.36, 0.65, 0.25);
      if (faixa) luz(o, P.cor, 0.9);
    } },
    vidro: { nome: 'Vidro reforçado', escala: 140, det: 'vidro', S: 512, emite: true, px(u, v, r, o, P) {
      const B = bloco(u, v, 2, 2, 0, 281), e = Math.min(Math.min(B.lx, 1 - B.lx), Math.min(B.ly, 1 - B.ly));
      const moldura = e < 0.025, fio = (u * 16) % 1 < 0.04 || (v * 16) % 1 < 0.04;
      const n = F(u, v, 3, 4, 283), fundo = sm(0.3, 0.9, F(u, v, 2, 3, 287));
      let c = lerp3([10, 14, 22], [18, 26, 40], n);
      if (fio) c = [40, 46, 56];
      if (moldura) c = [70, 76, 86];
      fim(o, c, moldura ? 0.75 : 0.5, moldura ? 0.4 : fio ? 0.35 : 0.05, moldura || fio ? 0.8 : 0.1, 0);
      if (!moldura && !fio) luz(o, P.cor, 0.1 + 0.18 * fundo);                       // a luz que vem de baixo
    } },
    circuito: { nome: 'Circuito luminoso', escala: 130, det: 'metal', S: 512, emite: true, px(u, v, r, o, P) {
      const N = 24, x = u * N, y = v * N, ix = Math.floor(x) % N, iy = Math.floor(y) % N, fx = x - Math.floor(x), fy = y - Math.floor(y);
      const hh = hash(ix, iy, 291), hv = hash(ix, iy, 293);
      const tr = (hh > 0.45 && Math.abs(fy - 0.5) < 0.09) || (hv > 0.55 && Math.abs(fx - 0.5) < 0.09);
      const pad = hh > 0.85 && Math.hypot(fx - 0.5, fy - 0.5) < 0.22;
      let c = lerp3([14, 18, 26], [24, 30, 40], F(u, v, 6, 4, 297));
      if (tr || pad) c = [70, 76, 84];
      fim(o, c, tr || pad ? 0.62 : 0.45, tr || pad ? 0.35 : 0.6, tr || pad ? 0.8 : 0.1, 0.2);
      if (tr || pad) luz(o, P.cor, (pad ? 1 : 0.65) * (0.6 + 0.4 * hash(ix, iy, 299)));
    } },
    carmim: { nome: 'Pedra carmim em ruínas', escala: 210, det: 'pedra', S: 512, emite: true, px(u, v, r, o) {
      const B = bloco(u, v, 4, 6, 0.5, 301), id = B.id, j = 1 - sm(0.004, 0.01, B.e), n = F(u, v, 6, 4, 303);
      const C = cel(u, v, 6, 305), fenda = 1 - sm(0, 0.05, C.d2 - C.d1), cid = C.id;
      let c = lerp3([70, 34, 34], [118, 64, 58], id * 0.5 + n * 0.5);
      if (id < 0.12) c = lerp3([50, 36, 30], [70, 52, 44], n);                      // laje que caiu: terra
      c = lerp3(c, [36, 18, 18], Math.max(j, fenda * 0.85));
      fim(o, c, (id < 0.12 ? 0.3 : 0.6) - j * 0.4 - fenda * 0.3 + n * 0.1, 0.8, 0, 0.4);
      if (fenda > 0.85 && cid > 0.7) luz(o, [255, 60, 40], (fenda - 0.85) * 4);      // brasas nas frestas
    } },
    nulo: { nome: 'Cristal do Nulo', escala: 180, det: 'pedra', S: 512, emite: true, px(u, v, r, o, P) {
      const C = cel(u, v, 8, 311), veio = 1 - sm(0, 0.035, C.d2 - C.d1), id = C.id, d1 = C.d1, n = F(u, v, 5, 4, 313);
      let c = lerp3([22, 16, 38], [52, 40, 82], id * 0.6 + n * 0.4);
      c = lerp3(c, [96, 80, 150], (1 - sm(0, 0.5, d1)) * 0.25);                      // faceta mais clara no meio
      fim(o, c, 0.5 + (0.5 - d1) * 0.4 - veio * 0.3, 0.28, 0.2, 0.2);
      if (veio > 0.3) luz(o, P.cor, veio * (0.45 + 0.55 * id));
    } },
    azulejo: { nome: 'Azulejo do laboratório', escala: 120, det: 'concreto', S: 512, px(u, v, r, o) {
      const B = bloco(u, v, 8, 8, 0, 321), id = B.id, j = 1 - sm(0.002, 0.004, B.e), n = F(u, v, 4, 4, 323), suj = sm(0.55, 0.85, F(u, v, 3, 4, 327));
      let c = lerp3([150, 156, 162], [184, 190, 196], id * 0.5 + n * 0.5);
      c = lerp3(c, [92, 90, 84], suj * 0.5);
      if (id < 0.06) c = [70, 74, 80];                                                  // azulejo quebrado
      c = lerp3(c, [50, 54, 60], j);
      fim(o, c, 0.6 - j * 0.45 - (id < 0.06 ? 0.2 : 0), 0.3 + suj * 0.4 + j * 0.4, 0, 0.3);
    } },
  };

  // Gera (uma vez) as texturas de um material: cor (com a oclusão), material (R metal, G aspereza,
  // B relevo) e, nos que brilham, a emissão
  const CACHE = {};
  function material(id, corNeon) {
    const M = MAT[id];
    if (!M) throw new Error(`Terreno: material desconhecido ${id}`);
    const q = qual(), S = q >= 2 ? M.S || 256 : 256, key = `${id}:${corNeon || ''}:${S}`;
    if (CACHE[key]) return CACHE[key];
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const P = { cor: NEON[corNeon] || NEON.ciano };
    const cor = novo(S), mat = novo(S), som = novo(S), emi = M.emite ? novo(S) : null;
    const ic = cor.getContext('2d').createImageData(S, S), im = mat.getContext('2d').createImageData(S, S), is = som.getContext('2d').createImageData(S, S), ie = emi ? emi.getContext('2d').createImageData(S, S) : null;
    const rnd = mulberry32(id.length * 7919 + (corNeon ? corNeon.length * 31 : 0) + 11), o = [0, 0, 0, 0, 0, 0, 0, 0, 0], H = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      M.px(x / S, y / S, rnd(), o, P);
      const i = (y * S + x) * 4;
      H[y * S + x] = o[3];
      ic.data[i] = o[0]; ic.data[i + 1] = o[1]; ic.data[i + 2] = o[2]; ic.data[i + 3] = 255;
      im.data[i] = o[5] * 255; im.data[i + 1] = o[4] * 255; im.data[i + 2] = o[3] * 255; im.data[i + 3] = 255;
      if (ie) { ie.data[i] = o[6]; ie.data[i + 1] = o[7]; ie.data[i + 2] = o[8]; ie.data[i + 3] = 255; }
    }
    // relevo sombreado (vista isométrica: luz de cima da tela, de −x, −y): cinza 128 = neutro
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const a = H[((y + S - 1) % S) * S + ((x + S - 1) % S)], b = H[((y + 1) % S) * S + ((x + 1) % S)], v = 128 + Math.max(-1, Math.min(1, (a - b) * 4)) * 110, i = (y * S + x) * 4;
      is.data[i] = is.data[i + 1] = is.data[i + 2] = v; is.data[i + 3] = 255;
    }
    cor.getContext('2d').putImageData(ic, 0, 0); mat.getContext('2d').putImageData(im, 0, 0); som.getContext('2d').putImageData(is, 0, 0);
    if (emi) emi.getContext('2d').putImageData(ie, 0, 0);
    return (CACHE[key] = { id, cor, mat, som, emi, S, ms: (typeof performance !== 'undefined' ? performance.now() : 0) - t0 });
  }

  // ------------------------------------------------------------ detalhe de perto
  // Relevo fino repetido pela posição no mundo (R, G = normal; B = altura), por família
  const DET = {
    solo: { escala: 44, forca: 0.55, h: (u, v) => F(u, v, 8, 3, 401) * 0.5 + vn(u * 64, v * 64, 64, 64, 403) * 0.3 + (1 - sm(0.15, 0.3, cel(u, v, 10, 405).d1)) * 0.3 },
    grama: { escala: 36, forca: 0.6, h: (u, v) => Math.max(fb(u, v, 96, 24, 2, 411), fb(u, v, 24, 96, 2, 413)) * 0.8 + F(u, v, 8, 2, 415) * 0.2 },
    areia: { escala: 40, forca: 0.45, h: (u, v) => vn(u * 128, v * 128, 128, 128, 421) * 0.4 + (Math.sin((v * 6 + F(u, v, 4, 2, 423) * 1.5) * Math.PI * 2) * 0.5 + 0.5) * 0.6 },
    neve: { escala: 60, forca: 0.35, h: (u, v) => F(u, v, 8, 3, 431) },
    pedra: { escala: 48, forca: 0.6, h: (u, v) => F(u, v, 8, 4, 441) * 0.6 - (vn(u * 128, v * 128, 128, 128, 443) > 0.8 ? 0.2 : 0) - crista(u, v, 6, 3, 445, 0.04) * 0.3 + 0.3 },
    concreto: { escala: 42, forca: 0.5, h: (u, v) => F(u, v, 16, 3, 451) * 0.6 + (vn(u * 96, v * 96, 96, 96, 453) > 0.82 ? -0.25 : 0) + 0.2 },
    metal: { escala: 34, forca: 0.3, h: (u, v) => fb(u, v, 4, 128, 2, 461) * 0.6 + (1 - sm(0, 0.3, cel(u, v, 6, 463).d1)) * 0.25 },
    madeira: { escala: 40, forca: 0.4, h: (u, v) => fb(u, v, 4, 96, 3, 471) },
    vidro: { escala: 50, forca: 0.15, h: (u, v) => 0.5 - crista(u, v, 5, 2, 481, 0.01) * 0.4 },
  };
  const DCACHE = {};
  function detalhe(fam) {
    const D = DET[fam] || DET.solo;
    if (DCACHE[fam]) return DCACHE[fam];
    const S = 256, c = novo(S), img = c.getContext('2d').createImageData(S, S), H = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) H[y * S + x] = cl(D.h(x / S, y / S));
    const k = 6;   // inclinação → normal
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (H[y * S + ((x + 1) % S)] - H[y * S + ((x + S - 1) % S)]) * k, dy = (H[((y + 1) % S) * S + x] - H[((y + S - 1) % S) * S + x]) * k;
      const l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
      img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = H[y * S + x] * 255; img.data[i + 3] = 255;
    }
    c.getContext('2d').putImageData(img, 0, 0);
    return (DCACHE[fam] = c);
  }

  // ------------------------------------------------------------ o pintor do atlas
  // Coordenadas: as funções de forma desenham em unidades do mundo; o atlas cobre [−m, L − m]²
  class Pintor {
    constructor(R, A, m, L, seed) {
      this.R = R; this.A = A; this.A2 = A >> 1; this.m = m; this.L = L; this.rnd = mulberry32(seed);
      this.cor = novo(A); this.mat = novo(this.A2); this.emi = novo(this.A2); this.som = novo(this.A2);
      this.tA = novo(A); this.tB = novo(this.A2);
      const ge = this.emi.getContext('2d'); ge.fillStyle = '#000'; ge.fillRect(0, 0, this.A2, this.A2);
      const gs = this.som.getContext('2d'); gs.fillStyle = 'rgb(128,128,128)'; gs.fillRect(0, 0, this.A2, this.A2);
      const gm = this.mat.getContext('2d'); gm.fillStyle = 'rgb(0,230,128)'; gm.fillRect(0, 0, this.A2, this.A2);
      this.geo = []; this.usados = new Set(); this.temEmi = false;
    }
    // transforma um contexto para desenhar em unidades do mundo num canvas de lado S
    mundo(g, S) { const k = S / this.L; g.setTransform(k, 0, 0, k, this.m * k, this.m * k); return k; }
    // Uma camada de material através de uma máscara (null: a sala toda). op: { rot, esc, cor (neon),
    // alt (relevo somado, −1 a 1), alfa }
    camada(id, mask, op = {}) {
      const D = MAT[id], M = material(id, D && D.emite ? op.cor : undefined);
      this.usados.add(id);
      const rot = op.rot !== undefined ? op.rot : this.rnd() * 360, esc = (op.esc || 1) * (0.88 + this.rnd() * 0.24);
      const ox = this.rnd() * 997, oy = this.rnd() * 997;
      const pinta = (dst, src, S, tmp) => {
        const g = tmp.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'copy'; g.globalAlpha = 1;
        if (src) {
          const p = g.createPattern(src, 'repeat'), s = D.escala * esc * (S / this.L) / M.S;
          if (p.setTransform) p.setTransform(new DOMMatrix().translate(ox, oy).rotate(rot).scale(s));
          g.fillStyle = p;
        } else g.fillStyle = '#000';
        g.fillRect(0, 0, S, S);
        if (mask) { g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0, S, S); }
        const d = dst.getContext('2d');
        d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-over'; d.globalAlpha = op.alfa !== undefined ? op.alfa : 1;
        d.drawImage(tmp, 0, 0); d.globalAlpha = 1;
      };
      pinta(this.cor, M.cor, this.A, this.tA);
      pinta(this.mat, M.mat, this.A2, this.tB);
      pinta(this.som, M.som, this.A2, this.tB);
      if (M.emi) { pinta(this.emi, M.emi, this.A2, this.tB); this.temEmi = true; } else pinta(this.emi, null, this.A2, this.tB);
      if (op.alt) this.relevo(mask, op.alt);
      return this;
    }
    // A base da sala: o material duas vezes, com giro e escala diferentes, misturados por manchas
    // grandes (a repetição da textura some)
    base(id, op = {}) {
      this.camada(id, null, op);
      return this.camada(id, this.manchas(0.5, MAT[id].escala * 3.1, 900 + this.usados.size, 0.06), Object.assign({}, op, { esc: (op.esc || 1) * 1.37 }));
    }
    // soma (alt > 0) ou tira relevo no canal B do mapa de material
    relevo(mask, alt) {
      const S = this.A2, g = this.tB.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'copy';
      g.fillStyle = alt > 0 ? `rgb(0,0,${Math.round(alt * 255)})` : `rgb(255,255,${Math.round(255 * (1 + alt))})`;
      g.fillRect(0, 0, S, S);
      if (mask) { g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0, S, S); }
      const d = this.mat.getContext('2d');
      d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = alt > 0 ? 'lighter' : 'multiply'; d.drawImage(this.tB, 0, 0); d.globalCompositeOperation = 'source-over';
    }
    // Máscara natural: manchas de ruído cobrindo ~cob da área, borda irregular e suave (largura bd
    // no valor do ruído); onde(x, y) (mundo) pondera
    manchas(cob, escala, seed, bd = 0.03, onde = null) {
      const N = 256, c = novo(N), g = c.getContext('2d'), img = g.createImageData(N, N), V = new Float32Array(N * N);
      const b = Math.max(1, Math.round(this.L / escala));
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) V[j * N + i] = F(i / N, j / N, b, 4, seed) * 0.85 + vn(i / N * b * 8, j / N * b * 8, b * 8, b * 8, seed + 3) * 0.15;
      const ord = Float32Array.from(V).sort(), t = ord[Math.min(N * N - 1, Math.floor((1 - cob) * N * N))];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        let a = sm(t - bd, t + bd, V[j * N + i]);
        if (onde && a > 0) a *= onde((i + 0.5) / N * this.L - this.m, (j + 0.5) / N * this.L - this.m);
        const k = (j * N + i) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = a * 255;
      }
      g.putImageData(img, 0, 0);
      return c;
    }
    // Máscara de forma (ruas, praças, trilhas) desenhada em unidades do mundo por desenha(g);
    // borda: desfoque (unidades); irregular: a borda vira terra/mato (0 a 1, ruído)
    forma(desenha, op = {}) {
      const S = op.irregular ? 512 : this.A2, c = novo(S), g = c.getContext('2d', op.irregular ? { willReadFrequently: true } : undefined), k = this.mundo(g, S);
      g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
      if (op.borda && 'filter' in g) g.filter = `blur(${Math.max(0.5, op.borda * k).toFixed(2)}px)`;
      desenha(g, k);
      g.filter = 'none';
      if (op.irregular) {
        const img = g.getImageData(0, 0, S, S), b = Math.max(2, Math.round(this.L / 90)), s = 700 + this.usados.size;
        for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
          const q = (j * S + i) * 4 + 3, a = img.data[q] / 255;
          if (a <= 0 || a >= 1) continue;
          const n = F(i / S, j / S, b, 3, s);
          img.data[q] = sm(0.5 - op.irregular * 0.5, 0.5 + op.irregular * 0.5, a + (n - 0.5) * op.irregular) * 255;
        }
        g.putImageData(img, 0, 0);
      }
      return c;
    }
    // desenha direto num dos canvases (cor, mat, emi) em unidades do mundo
    no(qual, fn) {
      const c = this[qual], g = c.getContext('2d');
      g.save(); const k = this.mundo(g, c.width); fn(g, k); g.restore();
    }
    // ---------------- detalhes por cima
    sujeira(n, cores, r0, r1, a0, a1) {
      const R = this.R, rnd = this.rnd;
      this.no('cor', (g) => {
        for (let i = 0; i < n; i++) {
          const x = rnd() * R.w, y = rnd() * R.h, rr = r0 + rnd() * (r1 - r0), c = cores[(rnd() * cores.length) | 0];
          const gr = g.createRadialGradient(x, y, 0, x, y, rr);
          gr.addColorStop(0, `rgba(${c},${(a0 + rnd() * (a1 - a0)).toFixed(3)})`); gr.addColorStop(1, `rgba(${c},0)`);
          g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr, rr * (0.5 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); g.fill();
        }
      });
    }
    // poças: escuras e lisas (aspereza baixa no mapa de material), refletem o ambiente
    pocas(n, r0, r1, cor = '24,30,38', onde = null) {
      const R = this.R, rnd = this.rnd, L = [];
      for (let i = 0; i < n * 4 && L.length < n; i++) { const x = rnd() * R.w, y = rnd() * R.h; if (!onde || onde(x, y)) L.push([x, y, r0 + rnd() * (r1 - r0), rnd() * 3]); }
      const blob = (g, x, y, rr, a) => { g.beginPath(); for (let k = 0; k <= 14; k++) { const t = (k / 14) * Math.PI * 2, q = rr * (0.75 + 0.25 * Math.sin(t * 3 + a) + 0.1 * Math.sin(t * 7 + a * 2)); const px = x + Math.cos(t) * q, py = y + Math.sin(t) * q * 0.7; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fill(); };
      this.no('cor', (g) => { for (const [x, y, rr, a] of L) { g.fillStyle = `rgba(${cor},0.55)`; blob(g, x, y, rr, a); } });
      this.no('mat', (g) => { for (const [x, y, rr, a] of L) { g.fillStyle = 'rgba(0,18,70,0.85)'; blob(g, x, y, rr * 0.92, a); } });
    }
    // rachaduras: caminhos tortos e finos (escuros, com o relevo baixo)
    rachaduras(n, comp, onde = null) {
      const R = this.R, rnd = this.rnd, L = [];
      for (let i = 0; i < n; i++) {
        let x = rnd() * R.w, y = rnd() * R.h;
        if (onde && !onde(x, y)) continue;
        const p = [[x, y]]; let a = rnd() * Math.PI * 2;
        for (let k = 0; k < 6 + rnd() * 6; k++) { a += (rnd() - 0.5) * 1.2; const d = comp / 8 * (0.5 + rnd()); x += Math.cos(a) * d; y += Math.sin(a) * d; p.push([x, y]); }
        L.push(p);
      }
      const traca = (g, cor, w) => { g.strokeStyle = cor; g.lineWidth = w; for (const p of L) { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); } };
      this.no('cor', (g, k) => { traca(g, 'rgba(10,10,12,0.75)', 1.6 / k + 0.8); });
      this.no('mat', (g, k) => { traca(g, 'rgb(0,240,20)', 1.6 / k + 0.8); });
    }
    // marcas de pneu numa faixa (x0,y0)→(x1,y1)
    pneus(x0, y0, x1, y1, larg) {
      const rnd = this.rnd, dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      this.no('cor', (g) => {
        g.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const off = (rnd() - 0.5) * larg * 0.7, a = 0.06 + rnd() * 0.06;
          for (const s of [-8, 8]) {
            g.strokeStyle = `rgba(8,8,10,${a.toFixed(3)})`; g.lineWidth = 5;
            g.beginPath(); g.moveTo(x0 + nx * (off + s), y0 + ny * (off + s));
            g.bezierCurveTo(x0 + dx * 0.33 + nx * (off + s + (rnd() - 0.5) * 30), y0 + dy * 0.33 + ny * (off + s + (rnd() - 0.5) * 30), x0 + dx * 0.66 + nx * (off + s + (rnd() - 0.5) * 30), y0 + dy * 0.66 + ny * (off + s + (rnd() - 0.5) * 30), x1 + nx * (off + s), y1 + ny * (off + s));
            g.stroke();
          }
        }
      });
    }
    // marcas de circulação: o caminho mais usado fica mais claro e mais liso
    desgaste(pts, larg, cor = '255,250,240', a = 0.07) {
      const traco = (g, estilo) => { g.strokeStyle = estilo; g.lineWidth = larg; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
      this.no('cor', (g) => { if ('filter' in g) g.filter = 'blur(6px)'; traco(g, `rgba(${cor},${a})`); });
      this.no('mat', (g) => { if ('filter' in g) g.filter = 'blur(4px)'; traco(g, 'rgba(0,120,128,0.18)'); });
    }
    // faixa pintada (tinta gasta) e, se brilha, também na emissão
    faixa(x0, y0, x1, y1, larg, cor, op = {}) {
      const tr = (g, a) => { g.strokeStyle = `rgba(${cor},${a})`; g.lineWidth = larg; g.lineCap = 'butt'; if (op.traco) g.setLineDash(op.traco); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]); };
      this.no('cor', (g) => tr(g, op.a || 0.5));
      if (op.brilha) { this.no('emi', (g) => tr(g, op.brilha)); this.temEmi = true; }
    }
    // retângulo/disco aceso (painel embutido, lâmpada no chão)
    painel(x, y, w, h, cor, k = 0.9) {
      this.no('cor', (g) => { g.fillStyle = `rgb(${cor})`; g.globalAlpha = 0.9; g.fillRect(x - w / 2, y - h / 2, w, h); });
      this.no('emi', (g) => { g.fillStyle = `rgba(${cor},${k})`; g.fillRect(x - w / 2, y - h / 2, w, h); });
      this.no('mat', (g) => { g.fillStyle = 'rgb(30,40,150)'; g.fillRect(x - w / 2, y - h / 2, w, h); });
      this.temEmi = true;
    }
    // setas holográficas (chevrons) ao longo de uma faixa
    setas(x0, y0, x1, y1, passo, tam, cor) {
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
      const desenha = (g, a) => {
        g.strokeStyle = `rgba(${cor},${a})`; g.lineWidth = tam * 0.22; g.lineJoin = 'miter';
        for (let s = passo / 2; s < l; s += passo) {
          const cx = x0 + ux * s, cy = y0 + uy * s;
          g.beginPath(); g.moveTo(cx - ux * tam * 0.5 + nx * tam * 0.6, cy - uy * tam * 0.5 + ny * tam * 0.6); g.lineTo(cx + ux * tam * 0.4, cy + uy * tam * 0.4); g.lineTo(cx - ux * tam * 0.5 - nx * tam * 0.6, cy - uy * tam * 0.5 - ny * tam * 0.6); g.stroke();
        }
      };
      this.no('cor', (g) => desenha(g, 0.22)); this.no('emi', (g) => desenha(g, 0.42)); this.temEmi = true;
    }
    // luz dos postes, tochas e lumes no chão (emissão suave em volta)
    luzes(raio = 90, k = 0.22) {
      const R = this.R;
      this.no('emi', (g) => {
        g.globalCompositeOperation = 'lighter';
        for (const t of R.torches || []) {
          const c = t.cor || R.theme.lamp, rr = t.poste ? raio * 1.4 : t.chao ? raio * 0.8 : raio;
          const gr = g.createRadialGradient(t.x, t.y, 0, t.x, t.y, rr);
          gr.addColorStop(0, `rgba(${c},${k})`); gr.addColorStop(1, `rgba(${c},0)`);
          g.fillStyle = gr; g.fillRect(t.x - rr, t.y - rr, rr * 2, rr * 2);
        }
      });
      if ((R.torches || []).length) this.temEmi = true;
    }
    // sombras de contato: pé das árvores, rochas, pilares, estruturas e a base das paredes
    sombras(paredes) {
      const R = this.R;
      this.no('cor', (g) => {
        for (const q of R.pillars || []) {
          const r0 = (q.r || 16) * 0.7, r1 = (q.r || 16) * (q.enfeite ? 1.4 : 1.9);
          const gr = g.createRadialGradient(q.x, q.y, r0, q.x, q.y, r1);
          gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(q.x - r1, q.y - r1, r1 * 2, r1 * 2);
        }
        if (paredes) {
          const w = R.w, h = R.h, d = 46;
          for (const [x0, y0, x1, y1, w0, h0] of [[0, 0, 0, d, w, d], [0, h, 0, h - d, w, d], [0, 0, d, 0, d, h], [w, 0, w - d, 0, d, h]]) {
            const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.fillRect(Math.min(x0, x1), Math.min(y0, y1), w0, h0);
          }
        }
      });
    }
    // variação grande de luz e de tom (sem duas áreas iguais)
    variacao(forca = 0.22, tons = null) {
      const N = 48, c = novo(N), g = c.getContext('2d'), img = g.createImageData(N, N), s = 960 + ((this.R.seed || 1) % 97);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const n = F(i / N, j / N, 4, 3, s), k = (j * N + i) * 4, v = n > 0.5 ? 255 : 0;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = Math.abs(n - 0.5) * 2 * forca * 255;
      }
      g.putImageData(img, 0, 0);
      const d = this.cor.getContext('2d');
      d.setTransform(1, 0, 0, 1, 0, 0); d.imageSmoothingEnabled = true; d.globalCompositeOperation = 'soft-light';
      d.drawImage(c, 0, 0, this.A, this.A);
      if (tons) {
        const rnd = this.rnd, k = this.A / this.L;
        d.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 40; i++) {
          const x = rnd() * this.A, y = rnd() * this.A, rr = (160 + rnd() * 300) * k, t = tons[(rnd() * tons.length) | 0];
          const gr = d.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${t},${(0.06 + rnd() * 0.08).toFixed(3)})`); gr.addColorStop(1, `rgba(${t},0)`);
          d.fillStyle = gr; d.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        }
      }
      d.globalCompositeOperation = 'source-over';
    }
    // borda do campo aberto: some na cor do chão distante
    bordaLonge(cor) {
      const d = this.cor.getContext('2d'), A = this.A, bw = this.m * (A / this.L) * 0.9;
      d.setTransform(1, 0, 0, 1, 0, 0);
      const lado = (x0, y0, x1, y1, rx, ry, rw, rh) => { const gr = d.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, cor); gr.addColorStop(1, cor + '00'); d.fillStyle = gr; d.fillRect(rx, ry, rw, rh); };
      lado(0, 0, bw, 0, 0, 0, bw, A); lado(A, 0, A - bw, 0, A - bw, 0, bw, A); lado(0, 0, 0, bw, 0, 0, A, bw); lado(0, A, 0, A - bw, 0, A - bw, A, bw);
    }
    // água da zona (js/mundo/agua.js): leito no fundo e margem molhada (lisa e escura)
    agua(zid, leito = 'leito', margem = 'lama') {
      if (typeof Agua === 'undefined' || !Agua.formas) return false;
      const d = Agua.formas(zid, this.R);
      if (!d) return false;
      const N = 384, mk = (f) => { const c = novo(N), g = c.getContext('2d'), img = g.createImageData(N, N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = f(d((i + 0.5) / N * this.L - this.m, (j + 0.5) / N * this.L - this.m)), k = (j * N + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = a * 255; } g.putImageData(img, 0, 0); return c; };
      const molhado = mk((q) => sm(-70, -30, q) * (1 - sm(-6, 4, q)));
      this.camada(margem, molhado, { alt: -0.05 });
      // margem molhada: lisa (aspereza baixa) — reflete o céu
      const tmp = this.tB.getContext('2d'); tmp.setTransform(1, 0, 0, 1, 0, 0); tmp.globalCompositeOperation = 'copy'; tmp.fillStyle = 'rgb(0,40,90)'; tmp.fillRect(0, 0, this.A2, this.A2);
      tmp.globalCompositeOperation = 'destination-in'; tmp.drawImage(molhado, 0, 0, this.A2, this.A2);
      const mm = this.mat.getContext('2d'); mm.setTransform(1, 0, 0, 1, 0, 0); mm.globalCompositeOperation = 'source-over'; mm.globalAlpha = 0.6; mm.drawImage(this.tB, 0, 0); mm.globalAlpha = 1;
      this.camada(leito, mk((q) => sm(-8, 6, q)), { alt: -0.15 });
      return true;
    }
  }

  // medição (Terreno.PERF.on = true): tempo de cada etapa do pintor, para achar o que pesa
  const PERF = { on: false, t: {} };
  for (const k of Object.getOwnPropertyNames(Pintor.prototype)) {
    if (k === 'constructor') continue;
    const f = Pintor.prototype[k];
    Pintor.prototype[k] = function (...a) { if (!PERF.on) return f.apply(this, a); const t0 = performance.now(); try { return f.apply(this, a); } finally { PERF.t[k] = (PERF.t[k] || 0) + performance.now() - t0; } };
  }

  // ------------------------------------------------------------ receitas
  // Ajudantes de traçado (unidades do mundo)
  const caminho = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  // trilhas do campo aberto: do centro ao meio de cada borda, com curva (as passagens)
  function trilhas(T) {
    const R = T.R, w = R.w, h = R.h, rnd = mulberry32((R.seed || 1) * 7 + 3), L = [];
    for (const [x, y] of [[w / 2, 0], [w / 2, h], [0, h / 2], [w, h / 2]]) {
      const mx = (w / 2 + x) / 2 + (rnd() - 0.5) * 220, my = (h / 2 + y) / 2 + (rnd() - 0.5) * 220, p = [];
      for (let i = 0; i <= 16; i++) { const t = i / 16, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; p.push([a * w / 2 + b * mx + c * x, a * h / 2 + b * my + c * y]); }
      L.push(p);
    }
    return L;
  }
  // campo aberto: base, manchas de outros materiais, folhiço e terra no pé das árvores, trilhas,
  // água, detalhes, sombras e a borda que some
  function natural(T, R, c) {
    T.base(c.base);
    c.manchas.forEach(([id, cob, esc, op], i) => T.camada(id, T.manchas(cob, esc, 31 + i * 13, 0.035, op && op.onde), op));
    if (c.pe) {
      const arv = (R.pillars || []).filter((q) => !q.cenario && !q.deco);
      if (arv.length) T.camada(c.pe, T.forma((g) => { for (const q of arv) { g.beginPath(); g.arc(q.x, q.y, (q.r || 16) * 2.4, 0, Math.PI * 2); g.fill(); } }, { borda: 14, irregular: 0.7 }));
    }
    const tr = trilhas(T);
    T.camada(c.trilha, T.forma((g) => { g.lineWidth = 50; for (const p of tr) caminho(g, p); }, { borda: 10, irregular: 0.8 }), { alt: -0.05, alfa: c.trilhaAlfa || 1 });
    for (const p of tr) T.desgaste(p, 26);
    if (R.def && R.def.id) T.agua(R.def.id, c.leito || 'leito', c.margem || 'lama');
    if (c.sujeira) T.sujeira(...c.sujeira);
    if (c.rachas) T.rachaduras(c.rachas, 180);
    T.luzes(70, 0.18);
    T.sombras(false);
    T.variacao(0.24, c.tons);
  }
  // ruas e calçadas em grade (cidades futuristas). ruas: [['h', y], ['v', x]] em frações da sala
  function ruas(T, R, c) {
    const w = R.w, h = R.h, W = c.larg || 150, Cw = c.calcada || 46, L = (c.ruas || []).map(([d, f]) => [d, d === 'h' ? f * h : f * w]);
    if (!L.length) return;
    const cor1 = NEON[c.neon || 'ciano'].join(','), cor2 = NEON[c.neon2 || 'magenta'].join(',');
    // calçadas (com o meio-fio) e o asfalto
    T.camada(c.calcadaMat || 'calcada', T.forma((g) => { for (const [d, p] of L) { if (d === 'h') g.fillRect(-T.m, p - W / 2 - Cw, w + 2 * T.m, W + 2 * Cw); else g.fillRect(p - W / 2 - Cw, -T.m, W + 2 * Cw, h + 2 * T.m); } }), { alt: 0.06 });
    T.camada('asfalto', T.forma((g) => { for (const [d, p] of L) { if (d === 'h') g.fillRect(-T.m, p - W / 2, w + 2 * T.m, W); else g.fillRect(p - W / 2, -T.m, W, h + 2 * T.m); } }), { alt: -0.04 });
    // canaletas na beira do asfalto (grade escura e funda)
    T.camada('grade', T.forma((g) => { for (const [d, p] of L) for (const s of [-1, 1]) { const q = p + s * (W / 2 - 9); if (d === 'h') g.fillRect(-T.m, q - 6, w + 2 * T.m, 12); else g.fillRect(q - 6, -T.m, 12, h + 2 * T.m); } }), { alt: -0.2 });
    // circuito aceso na borda de fora da calçada
    if (c.circuito !== false) T.camada('circuito', T.forma((g) => { for (const [d, p] of L) for (const s of [-1, 1]) { const q = p + s * (W / 2 + Cw - 6); if (d === 'h') g.fillRect(-T.m, q - 4, w + 2 * T.m, 8); else g.fillRect(q - 4, -T.m, 8, h + 2 * T.m); } }), { cor: c.neon || 'ciano' });
    // faixas, faixa de pedestre nos cruzamentos, setas holográficas, marcas de pneu e manchas de óleo
    const cruz = [];
    for (const [d, p] of L) for (const [d2, p2] of L) if (d === 'h' && d2 === 'v') cruz.push([p2, p]);
    const fora = (x, y) => !cruz.some(([cx, cy]) => Math.abs(x - cx) < W / 2 + Cw && Math.abs(y - cy) < W / 2 + Cw);
    for (const [d, p] of L) {
      if (d === 'h') {
        T.faixa(0, p, w, p, 3, '230,200,90', { traco: [34, 30], a: 0.5 });
        for (const s of [-1, 1]) T.setas(s > 0 ? 0 : w, p + s * W / 4, s > 0 ? w : 0, p + s * W / 4, 320, 20, s > 0 ? cor1 : cor2);
        T.pneus(0, p - W / 4, w, p - W / 4, 40); T.pneus(w, p + W / 4, 0, p + W / 4, 40);
      } else {
        T.faixa(p, 0, p, h, 3, '230,200,90', { traco: [34, 30], a: 0.5 });
        for (const s of [-1, 1]) T.setas(p + s * W / 4, s > 0 ? 0 : h, p + s * W / 4, s > 0 ? h : 0, 320, 20, s > 0 ? cor1 : cor2);
        T.pneus(p - W / 4, 0, p - W / 4, h, 40); T.pneus(p + W / 4, h, p + W / 4, 0, 40);
      }
    }
    // faixas de pedestre logo depois de cada cruzamento (listras no sentido do tráfego)
    for (const [cx, cy] of cruz) {
      const a0 = W / 2 + Cw + 8, a1 = a0 + 34;
      for (let x = cx - W / 2 + 10; x < cx + W / 2 - 6; x += 18) for (const s of [-1, 1]) T.faixa(x, cy + s * a0, x, cy + s * a1, 9, '220,220,220', { a: 0.45 });
      for (let y = cy - W / 2 + 10; y < cy + W / 2 - 6; y += 18) for (const s of [-1, 1]) T.faixa(cx + s * a0, y, cx + s * a1, y, 9, '220,220,220', { a: 0.45 });
    }
    T.sujeira(14, ['10,10,12', '30,24,40'], 14, 34, 0.25, 0.5);   // óleo
    // painéis de luz embutidos na calçada, alternando as duas cores
    let i = 0;
    for (const [d, p] of L) for (const s of [-1, 1]) {
      const q = p + s * (W / 2 + Cw / 2);
      for (let t = 70; t < (d === 'h' ? w : h) - 40; t += 150) {
        const x = d === 'h' ? t : q, y = d === 'h' ? q : t;
        if (!fora(x, y)) continue;
        T.painel(x, y, d === 'h' ? 34 : 7, d === 'h' ? 7 : 34, i++ % 2 ? cor2 : cor1, 0.85);
      }
    }
    // geometria: meio-fio nos dois lados de cada rua (interrompido nos cruzamentos)
    for (const [d, p] of L) for (const s of [-1, 1]) {
      const q = p + s * (W / 2), ate = d === 'h' ? w : h, cortes = L.filter(([d2]) => d2 !== d).map(([, p2]) => [p2 - W / 2 - Cw, p2 + W / 2 + Cw]).sort((a, b) => a[0] - b[0]);
      let a = 0;
      for (const [c0, c1] of cortes.concat([[ate, ate]])) {
        if (c0 > a + 4) T.geo.push(d === 'h' ? { t: 'meiofio', x0: a, y0: q, x1: c0, y1: q } : { t: 'meiofio', x0: q, y0: a, x1: q, y1: c0 });
        a = c1;
      }
    }
    T.pocas(10, 16, 40, '18,22,30', (x, y) => L.some(([d, p]) => Math.abs((d === 'h' ? y : x) - p) < W / 2 + 4));
  }
  // cidade futurista subterrânea (Metrópole, Nexus): base por zona, ruas, praça, detalhes e passarelas
  function tecno(T, R, c) {
    T.base(c.base || 'concreto', { cor: c.neon });
    if (c.manchas) c.manchas.forEach(([id, cob, esc, op], i) => T.camada(id, T.manchas(cob, esc, 51 + i * 11, 0.03), Object.assign({ cor: c.neon }, op)));
    const w = R.w, h = R.h;
    if (c.vidros) {   // painéis de vidro com a luz por baixo, num corredor
      T.camada('vidro', T.forma((g) => { for (const [x, y, ww, hh] of c.vidros) g.fillRect(x * w - ww / 2, y * h - hh / 2, ww, hh); }), { cor: c.neon2 || 'azul', rot: 0, esc: 1 });
    }
    if (c.praca) {
      const [px, py, pr] = c.praca;
      T.camada('plataforma', T.forma((g) => { g.beginPath(); g.arc(px * w, py * h, pr, 0, Math.PI * 2); g.fill(); }), { cor: c.neon || 'ciano', alt: 0.05 });
      T.no('emi', (g) => { g.strokeStyle = `rgba(${NEON[c.neon2 || 'magenta']},0.8)`; g.lineWidth = 5; g.beginPath(); g.arc(px * w, py * h, pr - 6, 0, Math.PI * 2); g.stroke(); });
      T.no('cor', (g) => { g.strokeStyle = `rgba(${NEON[c.neon2 || 'magenta']},0.6)`; g.lineWidth = 5; g.beginPath(); g.arc(px * w, py * h, pr - 6, 0, Math.PI * 2); g.stroke(); });
      T.temEmi = true;
      T.geo.push({ t: 'anel', x: px * w, y: py * h, r: pr - 6, cor: NEON[c.neon2 || 'magenta'] });
    }
    if (c.trilhos) {
      for (const f of c.trilhos) {
        const y = f * h;
        T.camada('cascalho', T.forma((g) => g.fillRect(-T.m, y - 56, w + 2 * T.m, 112)), { alt: -0.08 });
        T.no('cor', (g) => { g.fillStyle = 'rgba(40,30,24,0.9)'; for (let x = 8; x < w; x += 24) g.fillRect(x, y - 44, 9, 88); g.fillStyle = 'rgba(150,154,162,0.95)'; g.fillRect(0, y - 31, w, 4); g.fillRect(0, y + 27, w, 4); });
        T.no('mat', (g) => { g.fillStyle = 'rgb(230,90,200)'; g.fillRect(0, y - 31, w, 4); g.fillRect(0, y + 27, w, 4); });
        T.geo.push({ t: 'trilho', x0: 0, y0: y, x1: w, y1: y, bitola: 58 });
        T.faixa(0, y - 74, w, y - 74, 8, '230,200,40', { a: 0.75 });
        T.faixa(0, y + 74, w, y + 74, 8, '230,200,40', { a: 0.75 });
      }
    }
    if (c.canais) {   // canaletas de água abertas (grade por cima)
      for (const f of c.canais) {
        const x = f * w;
        T.camada('grade', T.forma((g) => g.fillRect(x - 16, -T.m, 32, h + 2 * T.m)), { alt: -0.3, rot: 90 });
        T.geo.push({ t: 'canaleta', x0: x, y0: 0, x1: x, y1: h, larg: 32 });
      }
    }
    if (c.perigo) {   // faixas zebradas de segurança (amarelo e preto)
      for (const [x0, y0, x1, y1] of c.perigo) {
        T.no('cor', (g) => {
          g.save(); g.beginPath(); g.rect(Math.min(x0, x1) * w, Math.min(y0, y1) * h, Math.abs(x1 - x0) * w || 16, Math.abs(y1 - y0) * h || 16); g.clip();
          g.fillStyle = 'rgba(210,170,30,0.8)'; g.fillRect(0, 0, w, h);
          g.strokeStyle = 'rgba(20,18,16,0.85)'; g.lineWidth = 9;
          for (let s = -h; s < w + h; s += 24) { g.beginPath(); g.moveTo(s, 0); g.lineTo(s + h, h); g.stroke(); }
          g.restore();
        });
      }
    }
    ruas(T, R, c);
    if (c.destrocos) T.camada('destrocos', T.manchas(c.destrocos, 260, 77, 0.04));
    if (c.toxico) T.camada('contaminado', T.manchas(c.toxico, 200, 79, 0.03));
    T.rachaduras(c.rachas !== undefined ? c.rachas : 16, 160);
    T.sujeira(30, ['12,12,14', '40,36,30', '20,24,34'], 20, 70, 0.12, 0.3);
    T.pocas(c.pocas !== undefined ? c.pocas : 6, 18, 46);
    if (R.def && R.def.id) T.agua(R.def.id, 'leito', 'lama');
    T.luzes(90, 0.25);
    T.sombras(!R.aberto);
    T.variacao(0.2, ['40,60,90', '70,40,80']);
    if (!R.aberto && c.passarelas !== false) T.geo.push({ t: 'passarela', lado: 'N', cor: NEON[c.neon || 'ciano'] }, { t: 'passarela', lado: 'W', cor: NEON[c.neon2 || 'magenta'] });
    if (c.tubos) T.geo.push({ t: 'tubos', lados: c.tubos });
  }

  const RECEITAS = {
    // ---- regiões do mundo aberto
    floresta: { det: 'grama', pintar: (T, R) => natural(T, R, { base: 'grama', manchas: [['terra', 0.14, 420], ['folhas', 0.16, 300], ['rocha', 0.035, 240]], pe: 'folhas', trilha: 'terra', sujeira: [16, ['30,24,16'], 30, 80, 0.12, 0.22], tons: ['120,140,60', '40,70,40'] }) },
    deserto: { det: 'areia', pintar: (T, R) => natural(T, R, { base: 'areia', manchas: [['rachado', 0.3, 640], ['rocha', 0.06, 300], ['destrocos', 0.07, 280]], trilha: 'rachado', trilhaAlfa: 0.85, leito: 'leito', margem: 'lama', rachas: 10, tons: ['230,190,130', '150,100,60'] }) },
    neve: { det: 'neve', pintar: (T, R) => natural(T, R, { base: 'neve', manchas: [['gelo', 0.14, 520], ['rocha', 0.1, 260]], trilha: 'terra', trilhaAlfa: 0.45, leito: 'gelo', margem: 'gelo', tons: ['200,220,255', '150,160,200'] }) },
    lagoa: { det: 'solo', pintar: (T, R) => natural(T, R, { base: 'grama', manchas: [['lama', 0.3, 380], ['folhas', 0.08, 260], ['cascalho', 0.05, 200]], pe: 'lama', trilha: 'terra', leito: 'leito', margem: 'lama', tons: ['60,120,120', '90,110,70'] }) },
    vulcao: { det: 'pedra', pintar: (T, R) => natural(T, R, { base: 'basalto', manchas: [['cinza', 0.34, 420], ['contaminado', 0.08, 300], ['destrocos', 0.05, 260], ['rocha', 0.08, 220]], trilha: 'cinza', rachas: 18, tons: ['120,40,20', '40,30,30'] }) },
    // ---- cidade medieval
    aurora: { det: 'pedra', pintar(T, R) {
      const w = R.w, h = R.h, cx = w * 0.42, cy = h * 0.42, rec = typeof CIDADE_RECUO !== 'undefined' ? CIDADE_RECUO : 160;
      T.base('lajes');
      T.camada('terra', T.manchas(0.12, 300, 61, 0.04, (x, y) => sm(260, 80, Math.min(x, y, w - x, h - y))));   // terra e mato perto dos muros
      T.camada('grama', T.manchas(0.06, 220, 63, 0.04, (x, y) => sm(200, 60, Math.min(x, y, w - x, h - y))));
      const vias = [[cx, cy, w * 0.5, h], [cx, cy, w, h * 0.55], [cx, cy, w * 0.6, rec], [cx, cy, rec, h * 0.55]];
      T.camada('paralelepipedo', T.forma((g) => { g.lineWidth = 92; g.lineCap = 'butt'; for (const [a, b, c2, d] of vias) caminho(g, [[a, b], [c2, d]]); }, { borda: 4 }), { alt: -0.04 });
      for (let k = 5; k >= 1; k--) {   // praça: anéis alternados em volta da Chama
        const r = 46 + k * 34;
        T.camada(k % 2 ? 'paralelepipedo' : 'lajes', T.forma((g) => { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); }, { borda: 2 }), { rot: k * 40 });
      }
      T.camada('marmore', T.forma((g) => { g.beginPath(); g.arc(cx, cy, 52, 0, Math.PI * 2); g.fill(); }), { alt: 0.05 });
      for (const [a, b, c2, d] of vias) T.desgaste([[a, b], [c2, d]], 40, '255,240,220', 0.06);
      T.pocas(9, 14, 34, '26,26,30');
      T.sujeira(26, ['30,24,18', '20,20,20'], 18, 60, 0.12, 0.26);
      T.rachaduras(10, 120);
      T.luzes(110, 0.24);
      T.sombras(true);
      T.variacao(0.22, ['120,100,80', '70,70,90']);
    } },
    bairro: { det: 'pedra', pintar(T, R) {
      const w = R.w, h = R.h, RX = typeof BAIRRO_RECUO !== 'undefined' ? BAIRRO_RECUO : 140, cx = w * 0.6, cy = h * 0.48;
      T.base('terra');
      T.camada('grama', T.manchas(0.22, 260, 71, 0.04));
      T.camada('cascalho', T.manchas(0.08, 180, 73, 0.04));
      T.camada('lajes', T.forma((g) => { g.fillRect(RX, RX, w - RX, 120); g.fillRect(RX, RX + 120, 120, h - RX - 120); }, { borda: 3 }), { alt: 0.05 });
      const vias = [[cx, cy, w * 0.3, h], [cx, cy, w * 0.84, h * 0.8], [cx, cy, w * 0.565, RX]];
      T.camada('paralelepipedo', T.forma((g) => { g.lineWidth = 84; for (const [a, b, c2, d] of vias) caminho(g, [[a, b], [c2, d]]); }, { borda: 6, irregular: 0.35 }), { alt: -0.03 });
      for (let k = 4; k >= 1; k--) { const r = 40 + k * 30; T.camada(k % 2 ? 'paralelepipedo' : 'lajes', T.forma((g) => { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); }, { borda: 2 }), { rot: k * 50 }); }
      for (const [a, b, c2, d] of vias) T.desgaste([[a, b], [c2, d]], 36, '255,240,220', 0.07);
      T.pocas(8, 14, 30, '30,28,26');
      T.sujeira(30, ['40,30,20', '24,20,16'], 18, 50, 0.14, 0.28);
      T.luzes(100, 0.24);
      T.sombras(true);
      T.variacao(0.22, ['120,100,70', '60,80,50']);
    } },
    interior: { det: 'madeira', pintar(T, R) {
      T.base('madeira', { rot: 0, esc: 1 });
      const w = R.w, h = R.h;
      T.no('cor', (g) => {   // tapete no meio
        const x0 = w * 0.3, y0 = h * 0.32, ww = w * 0.4, hh = h * 0.36;
        g.fillStyle = 'rgba(110,34,30,0.85)'; g.fillRect(x0, y0, ww, hh);
        g.strokeStyle = 'rgba(210,160,70,0.7)'; g.lineWidth = 6; g.strokeRect(x0 + 10, y0 + 10, ww - 20, hh - 20);
        g.strokeStyle = 'rgba(40,20,20,0.6)'; g.lineWidth = 3; g.strokeRect(x0 + 22, y0 + 22, ww - 44, hh - 44);
      });
      T.sujeira(18, ['30,20,10'], 14, 40, 0.12, 0.25);
      T.luzes(90, 0.2); T.sombras(true); T.variacao(0.16);
    } },
    interior_pedra: { det: 'pedra', pintar(T, R) { T.base('lajes'); T.sujeira(20, ['30,26,20'], 14, 44, 0.12, 0.26); T.rachaduras(6, 100); T.luzes(90, 0.2); T.sombras(true); T.variacao(0.18); } },
    // ---- campanha e regiões urbanas
    city: { det: 'concreto', pintar(T, R) {
      T.base('concreto');
      T.camada('calcada', T.manchas(0.3, 260, 81, 0.03));
      tecnoRuina(T, R, { ruas: [['v', 0.5]], larg: 220, calcada: 50 });
    } },
    tunnel: { det: 'concreto', pintar(T, R) {
      const w = R.w, h = R.h;
      T.base('concreto');
      T.camada('grade', T.forma((g) => g.fillRect(w / 2 - 70, -10, 140, h + 20)), { rot: 90, alt: 0.04 });
      for (const s of [-1, 1]) { T.camada('lama', T.forma((g) => g.fillRect(w / 2 + s * 130 - 18, -10, 36, h + 20)), { alt: -0.25 }); T.geo.push({ t: 'canaleta', x0: w / 2 + s * 130, y0: 0, x1: w / 2 + s * 130, y1: h, larg: 36 }); }
      T.camada('destrocos', T.manchas(0.08, 200, 83, 0.04));
      for (const s of [-1, 1]) T.faixa(w / 2 + s * 74, 0, w / 2 + s * 74, h, 4, NEON.ambar.join(','), { a: 0.6, brilha: 0.6, traco: [40, 20] });
      T.sujeira(30, ['30,34,28', '20,20,22'], 20, 80, 0.15, 0.32);
      T.pocas(8, 16, 40, '20,26,22');
      T.rachaduras(14, 140);
      T.luzes(100, 0.24); T.sombras(true); T.variacao(0.2);
      T.geo.push({ t: 'tubos', lados: ['W', 'E'] });
    } },
    lab: { det: 'concreto', pintar(T, R) {
      const w = R.w, h = R.h;
      T.base('azulejo', { rot: 0, esc: 1 });
      T.camada('concreto', T.manchas(0.1, 220, 131, 0.03));   // azulejos arrancados: o contrapiso aparece
      T.camada('metal', T.forma((g) => { g.fillRect(w * 0.18, h * 0.18, w * 0.22, h * 0.2); g.fillRect(w * 0.6, h * 0.62, w * 0.24, h * 0.2); }), { rot: 0 });
      T.camada('grade', T.forma((g) => { for (const f of [0.3, 0.7]) { g.fillRect(f * w - 40, 28, 80, 26); g.fillRect(f * w - 40, h - 54, 80, 26); } }), { rot: 90, alt: -0.15 });   // grelhas de ventilação
      T.no('cor', (g) => { g.strokeStyle = 'rgba(210,170,30,0.7)'; g.lineWidth = 12; g.setLineDash([22, 18]); g.strokeRect(w * 0.25, h * 0.25, w * 0.5, h * 0.5); g.setLineDash([]); });
      for (const [x0, y0, x1, y1] of [[30, 30, w - 30, 30], [30, h - 30, w - 30, h - 30], [30, 30, 30, h - 30], [w - 30, 30, w - 30, h - 30]]) T.faixa(x0, y0, x1, y1, 5, NEON.vermelho.join(','), { a: 0.6, brilha: 0.7, traco: [60, 30] });
      T.sujeira(26, ['60,50,40', '30,30,30'], 16, 60, 0.12, 0.3);
      T.rachaduras(8, 110); T.pocas(3, 14, 30);
      T.luzes(90, 0.2); T.sombras(true); T.variacao(0.16);
    } },
    tower: { det: 'metal', pintar(T, R) {
      const w = R.w, h = R.h, cx = w / 2, cy = h / 2;
      T.base('plataforma', { cor: 'ciano', rot: 0, esc: 1 });
      T.camada('circuito', T.forma((g) => { g.lineWidth = 26; for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; caminho(g, [[cx + Math.cos(t) * 120, cy + Math.sin(t) * 120], [cx + Math.cos(t) * w, cy + Math.sin(t) * w]]); } }), { cor: 'ciano', rot: 0 });
      T.camada('vidro', T.forma((g) => { g.beginPath(); g.arc(cx, cy, 110, 0, Math.PI * 2); g.fill(); }), { cor: 'azul', rot: 0, esc: 1 });
      T.no('emi', (g) => { g.strokeStyle = 'rgba(120,255,240,0.9)'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 112, 0, Math.PI * 2); g.stroke(); });
      T.geo.push({ t: 'anel', x: cx, y: cy, r: 112, cor: [120, 255, 240] });
      T.temEmi = true;
      T.sujeira(16, ['10,14,20'], 16, 60, 0.12, 0.3); T.rachaduras(6, 100);
      T.luzes(90, 0.22); T.sombras(true); T.variacao(0.16, ['40,80,120']);
    } },
    cathedral: { det: 'pedra', pintar(T, R) {
      const w = R.w, h = R.h;
      T.base('marmore', { rot: 0, esc: 1 });
      T.camada('lajes', T.forma((g) => g.fillRect(w / 2 - 100, -10, 200, h + 20)), { rot: 90 });   // a nave
      T.desgaste([[w / 2, 0], [w / 2, h]], 110, '230,220,255', 0.08);
      T.camada('destrocos', T.manchas(0.06, 200, 91, 0.04));
      T.sujeira(24, ['30,24,40', '20,20,20'], 16, 60, 0.12, 0.28); T.rachaduras(14, 150);
      T.luzes(110, 0.24); T.sombras(true); T.variacao(0.18, ['120,90,180']);
    } },
    refuge: { det: 'concreto', pintar(T, R) {
      const w = R.w, h = R.h;
      T.base('concreto');
      T.camada('terra', T.manchas(0.18, 220, 95, 0.04));
      T.camada('madeira', T.forma((g) => { g.fillRect(w * 0.12, h * 0.6, w * 0.28, h * 0.24); g.fillRect(w * 0.62, h * 0.14, w * 0.24, h * 0.22); }), { rot: 0, alt: 0.05 });
      T.sujeira(30, ['40,30,20', '24,20,16'], 18, 60, 0.14, 0.3); T.rachaduras(12, 130); T.pocas(4, 14, 30);
      T.luzes(100, 0.26); T.sombras(true); T.variacao(0.2, ['140,90,40']);
    } },
    carmim: { det: 'pedra', pintar(T, R) {
      T.base('carmim');
      T.camada('destrocos', T.manchas(0.18, 240, 97, 0.04));
      T.camada('cinza', T.manchas(0.14, 260, 99, 0.04));
      T.camada('asfalto', T.manchas(0.12, 320, 101, 0.03));
      T.rachaduras(26, 200); T.sujeira(30, ['20,8,8', '40,20,16'], 20, 80, 0.15, 0.32); T.pocas(5, 16, 40, '30,10,12');
      T.luzes(100, 0.26); T.sombras(true); T.variacao(0.22, ['160,40,40', '40,20,20']);
    } },
    nulo: { det: 'pedra', pintar(T, R) {
      const w = R.w, h = R.h;
      T.base('nulo', { cor: 'violeta' });
      T.camada('circuito', T.forma((g) => { g.lineWidth = 22; for (const f of [0.25, 0.5, 0.75]) { caminho(g, [[f * w, -20], [f * w, h + 20]]); caminho(g, [[-20, f * h], [w + 20, f * h]]); } }), { cor: 'ciano', rot: 0 });
      T.camada('vidro', T.manchas(0.12, 220, 103, 0.03), { cor: 'violeta' });
      T.rachaduras(10, 140); T.sujeira(16, ['10,6,20'], 18, 60, 0.12, 0.28);
      T.luzes(100, 0.24); T.sombras(true); T.variacao(0.18, ['120,80,200', '40,160,200']);
    } },
    metropole: { det: 'concreto', pintar: (T, R) => tecno(T, R, ZONAS_TEC[R.def && R.def.id] || ZONAS_TEC._) },
    // Cidade Morta (js/mundo/cidade_morta.js): asfalto rachado, calçada quebrada, entulho e o mato voltando
    abandonada: { det: 'concreto', pintar(T, R) {
      T.base('asfalto');
      T.camada('concreto', T.manchas(0.22, 300, 131, 0.04));
      T.camada('destrocos', T.manchas(0.16, 220, 133, 0.04));
      T.camada('grama', T.manchas(0.2, 180, 137, 0.05));
      T.camada('terra', T.manchas(0.1, 240, 139, 0.04));
      T.rachaduras(34, 260); T.sujeira(36, ['18,20,18', '40,44,36'], 20, 90, 0.16, 0.34); T.pocas(9, 18, 60, '22,28,30');
      T.luzes(100, 0.2); T.sombras(true); T.variacao(0.24, ['70,90,60', '90,90,96']);
    } },
    // ---- masmorras (por nome da zona)
    caverna: { det: 'pedra', pintar(T, R) {
      T.base('rocha');
      T.camada('cascalho', T.manchas(0.26, 220, 111, 0.04));
      T.camada('terra', T.manchas(0.14, 260, 113, 0.04));
      T.camada('lama', T.manchas(0.12, 200, 115, 0.03));
      T.pocas(10, 18, 50, '16,22,26'); T.rachaduras(16, 160); T.sujeira(24, ['20,18,16'], 20, 70, 0.14, 0.3);
      T.luzes(90, 0.22); T.sombras(true); T.variacao(0.24, ['60,70,90', '90,80,60']);
    } },
    cripta: { det: 'pedra', pintar(T, R) {
      const w = R.w, h = R.h;
      T.base('lajes');
      T.camada('terra', T.manchas(0.14, 240, 117, 0.04));
      T.camada('cascalho', T.manchas(0.1, 180, 119, 0.04));
      T.desgaste([[w / 2, 0], [w / 2, h]], 90, '230,220,200', 0.06);
      T.rachaduras(22, 170); T.sujeira(30, ['30,26,22', '16,14,12'], 18, 60, 0.14, 0.3); T.pocas(3, 14, 30);
      T.luzes(100, 0.22); T.sombras(true); T.variacao(0.22, ['90,80,60']);
    } },
    raizes: { det: 'solo', pintar(T, R) {
      T.base('terra');
      T.camada('folhas', T.manchas(0.3, 240, 121, 0.04));
      T.camada('rocha', T.manchas(0.14, 260, 123, 0.04));
      T.camada('lama', T.manchas(0.1, 200, 125, 0.03));
      T.rachaduras(10, 150); T.sujeira(20, ['30,24,16'], 20, 70, 0.14, 0.28); T.pocas(5, 16, 36, '20,26,20');
      T.luzes(90, 0.22); T.sombras(true); T.variacao(0.22, ['60,90,40']);
    } },
    forja: { det: 'pedra', pintar(T, R) {
      T.base('basalto');
      T.camada('metal', T.manchas(0.22, 260, 127, 0.03));
      T.camada('cinza', T.manchas(0.2, 220, 129, 0.04));
      T.rachaduras(18, 170); T.sujeira(24, ['20,10,6'], 20, 70, 0.14, 0.3);
      T.luzes(100, 0.26); T.sombras(true); T.variacao(0.2, ['160,60,20']);
    } },
  };
  // Masmorras pelo nome da zona (o tema delas é o de túneis, catedrais e laboratórios da campanha)
  const POR_NOME = [[/^(gruta|eco|asterion_caverna)/, 'caverna'], [/^(catacumbas|tumba|cripta_real)/, 'cripta'], [/^raiz_profunda/, 'raizes'], [/^primeiro_fogo/, 'forja']];
  // ruas antigas da campanha (Ruínas de Carmesin): a avenida rachada, calçadas, entulho e poças
  function tecnoRuina(T, R, c) {
    ruas(T, R, Object.assign({ circuito: false, calcadaMat: 'calcada' }, c));
    T.camada('destrocos', T.manchas(0.14, 220, 89, 0.04));
    T.rachaduras(30, 220);
    T.pocas(12, 16, 50, '16,20,30');
    T.sujeira(30, ['14,14,16', '40,34,30'], 20, 80, 0.14, 0.32);
    T.luzes(110, 0.26); T.sombras(true); T.variacao(0.22, ['60,70,110', '120,60,120']);
  }
  // Zonas da Metrópole e de Nexus (megacidades subterrâneas): cada uma com o seu chão
  const ZONAS_TEC = {
    _: { base: 'concreto', ruas: [['h', 0.5], ['v', 0.5]], neon: 'ciano', neon2: 'magenta' },
    metro_centro: { base: 'concreto', manchas: [['calcada', 0.25, 240]], ruas: [['h', 0.8]], praca: [0.5, 0.45, 150], neon: 'ciano', neon2: 'magenta' },
    metro_mercado: { base: 'calcada', manchas: [['concreto', 0.2, 260]], ruas: [['h', 0.86]], vidros: [[0.5, 0.45, 220, 120], [0.25, 0.5, 120, 90], [0.75, 0.5, 120, 90]], neon: 'magenta', neon2: 'ambar', larg: 120 },
    metro_industrial: { base: 'metal', manchas: [['grade', 0.18, 220], ['concreto', 0.2, 300]], ruas: [], trilhos: [0.5], perigo: [[0.08, 0.36, 0.92, 0.38], [0.08, 0.62, 0.92, 0.64]], destrocos: 0.08, rachas: 10, neon: 'ambar', neon2: 'ciano', tubos: ['N', 'W'] },
    metro_trilhos: { base: 'concreto', manchas: [['metal', 0.12, 260]], ruas: [], trilhos: [0.4, 0.62], neon: 'ciano', neon2: 'azul', pocas: 4, tubos: ['N'] },
    metro_porto: { base: 'concreto', manchas: [['metal', 0.22, 300], ['grade', 0.08, 200]], ruas: [['h', 0.72]], canais: [0.2, 0.8], pocas: 14, neon: 'azul', neon2: 'ciano' },
    metro_torres: { base: 'plataforma', manchas: [['vidro', 0.22, 280], ['circuito', 0.1, 220]], ruas: [['v', 0.5]], neon: 'ciano', neon2: 'violeta' },
    metro_subnivel: { base: 'concreto', manchas: [['grade', 0.16, 220], ['lama', 0.14, 240]], ruas: [], canais: [0.32, 0.68], destrocos: 0.15, toxico: 0.05, rachas: 30, pocas: 12, neon: 'verde', neon2: 'ambar', tubos: ['N', 'W'] },
    metro_arcologia: { base: 'grama', manchas: [['folhas', 0.12, 240]], ruas: [['v', 0.62]], calcadaMat: 'calcada', praca: [0.62, 0.22, 110], circuito: false, neon: 'verde', neon2: 'ciano', passarelas: false, rachas: 4, pocas: 2 },
    nexus_portao: { base: 'plataforma', manchas: [['concreto', 0.3, 280]], ruas: [['v', 0.5]], praca: [0.5, 0.25, 130], neon: 'magenta', neon2: 'ciano' },
    nexus_avenida: { base: 'concreto', manchas: [['calcada', 0.2, 240]], ruas: [['h', 0.5], ['v', 0.5]], neon: 'magenta', neon2: 'ciano', larg: 170 },
    nexus_mercado: { base: 'calcada', manchas: [['vidro', 0.1, 220]], ruas: [['h', 0.82]], vidros: [[0.5, 0.45, 200, 110]], neon: 'magenta', neon2: 'ambar', larg: 120 },
  };

  // Receita da sala: pela zona e pelo tema
  function receita(R) {
    if (!R || !R.def) return null;
    const th = R.def.theme, id = R.def.id;
    if (R.bairro || th === 'bairro') return RECEITAS.bairro;
    if (R.cidade || th === 'aurora') return RECEITAS.aurora;
    if (id && ZONAS_TEC[id]) return RECEITAS.metropole;
    if (id) for (const [re, k] of POR_NOME) if (re.test(id)) return RECEITAS[k];
    return RECEITAS[th] || null;
  }

  // ------------------------------------------------------------ montagem
  function montar(R) {
    if (!R || !dom() || qual() <= 0) return null;   // (qualidade baixa: as placas de cor de antes)
    if (R._terreno !== undefined) return R._terreno;
    const rec = receita(R);
    if (!rec) return (R._terreno = null);
    const t0 = performance.now(), q = qual(), A = q >= 2 ? 2048 : 1024, m = R.margem || 0, L = Math.max(R.w, R.h) + 2 * m;
    const T = new Pintor(R, A, m, L, (R.seed || 1) * 131 + 7);
    rec.pintar(T, R);
    if (R.aberto && typeof AMB3P !== 'undefined') { const P = AMB3P[R.def.theme]; if (P && P.chao) T.bordaLonge(P.chao); }
    const D = DET[rec.det] || DET.solo;
    return (R._terreno = { cor: T.cor, mat: T.mat, som: T.som, emi: T.temEmi ? T.emi : null, det: detalhe(rec.det), detP: [1 / D.escala, D.forca, 2.2, 760], m, L, geo: T.geo, usados: [...T.usados], ms: Math.round(performance.now() - t0), iso: null });
  }

  // Isométrica: o atlas (cor, relevo sombreado e emissão) no plano do chão da imagem da sala
  function iso(ctx, R) {
    const A = montar(R);
    if (!A) return false;
    A.iso = true;
    ctx.save();
    ctx.transform(1, 0.5, -1, 0.5, 0, 0);   // plano do chão (isoX = x − y, isoY = (x + y) / 2)
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(A.cor, -A.m, -A.m, A.L, A.L);
    ctx.globalCompositeOperation = 'soft-light'; ctx.drawImage(A.som, -A.m, -A.m, A.L, A.L);
    if (A.emi) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; ctx.drawImage(A.emi, -A.m, -A.m, A.L, A.L); }
    ctx.restore();
    return true;
  }

  // 3ª pessoa: o piso (programa com textura, emissão e detalhe de perto)
  function modelo(R) {
    const A = montar(R);
    if (!A || typeof G3 === 'undefined') return null;
    const g = new G3(), m = A.m, L = A.L, N = 6;
    const v = (x, y) => [x, y, 0, 0, 0, 1, (x + m) / L, (y + m) / L, 0, 0];
    if (typeof Relevo !== 'undefined' && Relevo.ativo(R)) Relevo.malha(g, m, L, 0);   // chão com altura de verdade (js/mundo/relevo.js)
    else for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x0 = -m + (L * i) / N, y0 = -m + (L * j) / N, x1 = x0 + L / N, y1 = y0 + L / N;
      for (const q of [v(x0, y0), v(x1, y0), v(x1, y1), v(x0, y0), v(x1, y1), v(x0, y1)]) g.d.push(...q);
    }
    const model = new Model3(new N3('chao', g));
    model.tex = { canvas: A.cor, mat: A.mat, emis: A.emi || undefined, det: A.det, detP: A.detP, pbr: true, bump: 1.6 };
    model.terreno = true;
    return model;
  }

  // 3ª pessoa: a geometria de detalhe (cores por vértice; o neon brilha na passada emissiva)
  function geometria(root, R) {
    const A = montar(R);
    if (!A || !A.geo.length || typeof G3 === 'undefined') return 0;
    const g = new G3(), rgb = (c) => '#' + c.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
    const w = R.w, h = R.h, porParede = {};
    const naParede = (lado) => porParede[lado] || (porParede[lado] = new G3());
    let n = 0;
    for (const q of A.geo) {
      if (q.t === 'meiofio') {
        const hz = q.y0 === q.y1, L = hz ? Math.abs(q.x1 - q.x0) : Math.abs(q.y1 - q.y0);
        g.box(hz ? (q.x0 + q.x1) / 2 : q.x0, hz ? q.y0 : (q.y0 + q.y1) / 2, 1.75, hz ? L : 7, hz ? 7 : L, 3.5, '#8c8f96', 0, { top: '#a9acb2' });
        n++;
      } else if (q.t === 'trilho') {
        for (let x = q.x0 + 12; x < q.x1; x += 24) g.box(x, q.y0, 0.9, 9, q.bitola + 30, 1.8, '#3a2c22', 0);
        for (const s of [-1, 1]) g.box((q.x0 + q.x1) / 2, q.y0 + s * q.bitola / 2, 2.6, q.x1 - q.x0, 3, 2.4, '#9aa0a8', 0, { top: '#d4d8de' });
        n++;
      } else if (q.t === 'canaleta') {
        for (const s of [-1, 1]) g.box(q.x0 + s * q.larg / 2, (q.y0 + q.y1) / 2, 0.8, 3, q.y1 - q.y0, 1.6, '#5c6068', 0);
        n++;
      } else if (q.t === 'anel') {
        g.cyl(q.x, q.y, 0, q.r + 3, q.r + 3, 1.2, 48, rgb(q.cor), 0.9, { caps: false });
        g.cyl(q.x, q.y, 0, q.r - 3, q.r - 3, 1.2, 48, rgb(q.cor), 0.9, { caps: false });
        n++;
      } else if (q.t === 'passarela') {
        // passarela elevada junto à parede do fundo (anda com a parede: some com ela)
        const P = naParede(q.lado), z = 78, d = 44, col = '#3a3f4a', luz = rgb(q.cor);
        if (q.lado === 'N') {
          P.box(w / 2, d / 2, z, w, d, 5, col, 0, { top: '#4a505c' });
          P.box(w / 2, d, z - 3.5, w, 2, 2, luz, 1);
          for (let x = 30; x < w; x += 90) P.box(x, d - 2, z + 14, 2.5, 2.5, 24, '#6a707c', 0);
          P.box(w / 2, d - 2, z + 26, w, 2.5, 2.5, '#8a909c', 0);
          for (let x = 140; x < w; x += 280) P.box(x, d / 2, z / 2, 8, 8, z, '#2a2e36', 0);
        } else {
          P.box(d / 2, h / 2, z, d, h, 5, col, 0, { top: '#4a505c' });
          P.box(d, h / 2, z - 3.5, 2, h, 2, luz, 1);
          for (let y = 30; y < h; y += 90) P.box(d - 2, y, z + 14, 2.5, 2.5, 24, '#6a707c', 0);
          P.box(d - 2, h / 2, z + 26, 2.5, h, 2.5, '#8a909c', 0);
          for (let y = 140; y < h; y += 280) P.box(d / 2, y, z / 2, 8, 8, z, '#2a2e36', 0);
        }
        n++;
      } else if (q.t === 'tubos') {
        for (const lado of q.lados) {
          const P = naParede(lado), hz = lado === 'N' || lado === 'S', pos = lado === 'N' || lado === 'W' ? 10 : (hz ? h : w) - 10;
          for (const [z, r, c] of [[22, 6, '#5a6068'], [36, 4, '#7a5a3a'], [46, 3, '#3a4a5a']]) {
            if (hz) P.cyl(0, pos, z, r, r, w, 8, c, 0, { axis: 'x' }); else P.cyl(pos, 0, z, r, r, h, 8, c, 0, { axis: 'y' });
          }
          n++;
        }
      }
    }
    if (g.d.length) root.add(new N3('terreno', g));
    for (const lado in porParede) {
      const pai = root.kids.find((k) => k.name === 'parede' + lado);
      (pai || root).add(new N3('terreno' + lado, porParede[lado]));
    }
    return n;
  }

  // Carregamento por proximidade: gera antes (no tempo livre) os materiais da zona vizinha
  function aquecer(def) {
    if (!dom() || qual() <= 0 || !def) return;
    const R = { def, theme: THEMES && THEMES[def.theme], w: 1000, h: 1000 }, rec = receita(R);
    if (!rec) return;
    const ids = new Set();
    const base = { floresta: ['grama', 'terra', 'folhas', 'rocha'], deserto: ['areia', 'rachado', 'rocha', 'destrocos'], neve: ['neve', 'gelo', 'rocha', 'terra'], lagoa: ['grama', 'lama', 'folhas', 'cascalho', 'leito'], vulcao: ['basalto', 'cinza', 'contaminado', 'destrocos', 'rocha'], metropole: ['concreto', 'calcada', 'asfalto', 'grade', 'circuito', 'plataforma'], abandonada: ['asfalto', 'concreto', 'destrocos', 'grama', 'terra'] }[def.theme] || [];
    base.forEach((id) => ids.add(id));
    detalhe(rec.det);
    const fila = [...ids], vez = () => { const id = fila.shift(); if (!id) return; material(id, def.theme === 'metropole' ? 'ciano' : undefined); agenda(vez); };
    const agenda = (f) => (typeof requestIdleCallback !== 'undefined' ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 30));
    agenda(vez);
  }

  // Folha de amostras (todos os materiais lado a lado, para a documentação e as capturas)
  function amostras(lado = 160) {
    const ids = Object.keys(MAT), col = 6, c = novo(col * lado, Math.ceil(ids.length / col) * (lado + 18)), g = c.getContext('2d');
    g.fillStyle = '#0c0e14'; g.fillRect(0, 0, c.width, c.height);
    ids.forEach((id, i) => {
      const M = material(id, 'ciano'), x = (i % col) * lado, y = Math.floor(i / col) * (lado + 18);
      g.drawImage(M.cor, x + 2, y + 2, lado - 4, lado - 4);
      if (M.emi) { g.globalCompositeOperation = 'lighter'; g.drawImage(M.emi, x + 2, y + 2, lado - 4, lado - 4); g.globalCompositeOperation = 'source-over'; }
      g.fillStyle = '#dfe6f0'; g.font = '12px sans-serif'; g.fillText(MAT[id].nome, x + 4, y + lado + 12);
    });
    return c;
  }

  return { PERF, MAT, DET, RECEITAS, ZONAS_TEC, NEON, material, detalhe, receita, montar, iso, modelo, geometria, aquecer, amostras };
})();
