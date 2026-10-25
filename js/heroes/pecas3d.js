'use strict';
// ECLIPSE ZERO · Peças da armadura modular em 3D (PecasRig)
// ---------------------------------------------------------------------------
// Cada peça vestida (js/mundo/arsenal.js) vira geometria presa ao osso certo do esqueleto que
// todos os heróis usam: capacete na cabeça, peitoral no tronco, ombreiras no alto dos braços,
// luvas nos antebraços e no dorso das mãos, calças nas coxas e no quadril, botas nas canelas e
// nos pés, capa nas costas (balança com o passo e o vento) e o acessório onde ele fica (peito,
// cinto, costas, punho). O tamanho vem da própria malha do herói (os vértices de cada osso na
// pose de montagem, incluindo cabelo e capuz para o capacete), então a peça encosta no corpo
// em vez de flutuar ou atravessar; sem malha com pele, valem as proporções do esqueleto.
// Cada família tem o seu desenho (capuz de pano, elmo com nasal, visor aceso de cristal, coroa
// Eclipse…) e materiais (pano, couro, metal, cristal e filetes acesos), nas duas versões do
// motor: cores por vértice (modelo procedural) e o código de material do programa com textura.
// Sem peças no modo campanha, com uma armadura especial inteira vestida (ela cobre o corpo) e
// nas vagas ocultas. Ganchos: WeaponRig.install / WeaponRig.pose (js/heroes/armas3d.js).
// ---------------------------------------------------------------------------
const PecasRig = (function () {
  const OSSOS = ['head', 'torso', 'hips', 'armLu', 'armRu', 'armLf', 'armRf', 'handL', 'handR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'];
  // código de material do programa com textura (js/engine3d.js): metal 1, semimetal 2, pano 3, couro 5; luz acesa 0
  const MAT = { pano: 3, couro: 5, metal: 1, cristal: 2, luz: 0 };
  const TEC_GRUPO = { tecido: 'pano', leve: 'pano', la: 'pano', couro: 'couro', metal: 'metal', cristal: 'cristal', eclipse: 'metal' };

  // ------------------------------------------------------------ medidas da malha
  // Limites (percentis 4 e 96) dos vértices de cada osso no espaço do osso; cabelo e capuz
  // entram na cabeça (o capacete cobre os dois)
  const MED = new WeakMap();
  function pct(a, q) { if (!a.length) return 0; return a[Math.min(a.length - 1, Math.max(0, Math.floor(a.length * q)))]; }
  function medidas(m) {
    const S0 = m.skins && m.skins[0];
    if (!S0) return null;
    if (MED.has(S0.pos)) return MED.get(S0.pos);
    const A = {};
    for (const S of m.skins) {
      const idx = {};
      S.bones.forEach((bn, b) => { if (bn) idx[bn.name] = b; });
      S.bones.forEach((bn, b) => {
        let nome = bn && bn.name;
        if (!nome) return;
        if (nome === 'hair' || nome === 'hood') nome = 'head';
        if (!OSSOS.includes(nome) || idx[nome] === undefined) return;
        const M = S.inv.subarray(idx[nome] * 12, idx[nome] * 12 + 12), L = A[nome] || (A[nome] = { x: [], y: [], z: [] });
        for (let v = 0, n = S.pos.length / 3; v < n; v++) {
          let w = 0;
          for (let j = 0; j < 4; j++) if (S.bi[v * 4 + j] === b) w += S.bw[v * 4 + j];
          if (w < 0.55) continue;
          const x = S.pos[v * 3], y = S.pos[v * 3 + 1], z = S.pos[v * 3 + 2];
          L.x.push(M[0] * x + M[1] * y + M[2] * z + M[3]); L.y.push(M[4] * x + M[5] * y + M[6] * z + M[7]); L.z.push(M[8] * x + M[9] * y + M[10] * z + M[11]);
        }
      });
    }
    const R = {};
    for (const k in A) {
      const L = A[k];
      if (L.x.length < 12) continue;
      for (const c of ['x', 'y', 'z']) L[c].sort((a, b) => a - b);
      R[k] = { x0: pct(L.x, 0.04), x1: pct(L.x, 0.96), y0: pct(L.y, 0.04), y1: pct(L.y, 0.96), z0: pct(L.z, 0.03), z1: pct(L.z, 0.97) };
    }
    MED.set(S0.pos, R);
    return R;
  }
  // Medidas finais de um osso: as da malha ou as do esqueleto procedural (pelas proporções K)
  function caixa(R, osso, K) {
    if (R && R[osso]) return R[osso];
    const AUP = K.AUP || 9.8, AFO = K.AFO || 9.6, LTH = K.LTH || 12.8, LSH = K.LSH || 12.2, SHZ = K.SHZ || 10.6, SHY = K.SHY || 6.7, HIPY = K.HIPY || 3.5;
    const lado = (r, L) => ({ x0: -r, x1: r, y0: -r, y1: r, z0: -L, z1: 0 });
    switch (osso) {
      case 'head': return { x0: -5.2, x1: 4.4, y0: -4.5, y1: 4.5, z0: 1.5, z1: 13.4 };
      case 'torso': return { x0: -3.7, x1: 3.9, y0: -SHY, y1: SHY, z0: 0, z1: SHZ + 1.4 };
      case 'hips': return { x0: -3.5, x1: 3.5, y0: -HIPY - 1.2, y1: HIPY + 1.2, z0: -3, z1: 2 };
      case 'armLu': case 'armRu': return lado(2.2, AUP);
      case 'armLf': case 'armRf': return lado(1.9, AFO);
      case 'handL': case 'handR': return { x0: -1.2, x1: 1.4, y0: -1.6, y1: 1.6, z0: -4, z1: 0 };
      case 'thighL': case 'thighR': return lado(3.2, LTH);
      case 'shinL': case 'shinR': return lado(2.6, LSH);
      default: return { x0: -3.5, x1: 6.3, y0: -2.8, y1: 2.8, z0: -3.7, z1: 0 };   // pés
    }
  }

  // ------------------------------------------------------------ geometria
  // Casca de elipsoide entre as longitudes a0..a1 (0 = frente, +y à esquerda) e latitudes b0..b1
  function casca(g, cx, cy, cz, rx, ry, rz, a0, a1, b0, b1, na, nb, col, e = 0) {
    const P = (a, b) => [cx + Math.cos(b) * Math.cos(a) * rx, cy + Math.cos(b) * Math.sin(a) * ry, cz + Math.sin(b) * rz];
    for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) {
      const A0 = a0 + (a1 - a0) * i / na, A1 = a0 + (a1 - a0) * (i + 1) / na, B0 = b0 + (b1 - b0) * j / nb, B1 = b0 + (b1 - b0) * (j + 1) / nb;
      g.quad(P(A0, B0), P(A1, B0), P(A1, B1), P(A0, B1), col, e);
    }
  }
  // Tubo elíptico aberto ao longo de z (de z0 a z1), raios por ponta, deslocado em x
  function tubo(g, cx, cy, z0, z1, rx0, ry0, rx1, ry1, seg, col, e = 0, a0 = 0, a1 = TAU) {
    for (let i = 0; i < seg; i++) {
      const A0 = a0 + (a1 - a0) * i / seg, A1 = a0 + (a1 - a0) * (i + 1) / seg;
      const p = (a, z, rx, ry) => [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, z];
      g.quad(p(A0, z0, rx0, ry0), p(A1, z0, rx0, ry0), p(A1, z1, rx1, ry1), p(A0, z1, rx1, ry1), col, e);
    }
  }
  // Grupos de material de uma peça; mk junta as duas versões (cores e textura)
  function grupos() { return { pano: new G3(), couro: new G3(), metal: new G3(), cristal: new G3(), luz: new G3() }; }
  function mk(G) {
    const raws = [], texs = [];
    for (const k in G) {
      const d = G[k].d;
      if (!d.length) continue;
      const raw = new Float32Array(d), tex = new Float32Array(d);
      for (let i = 0; i < tex.length; i += 10) tex[i + 8] = -1 - raw[i + 8] - 2 * MAT[k];
      raws.push(raw); texs.push(tex);
    }
    const junta = (L) => { let n = 0; for (const a of L) n += a.length; const o = new Float32Array(n); let off = 0; for (const a of L) { o.set(a, off); off += a.length; } return o; };
    return raws.length ? { raw: junta(raws), tex: junta(texs) } : null;
  }

  // Cada vaga: as partes (osso → construtor). F = família, C = [base, escura, detalhe], q = grupo do tecido
  const PARTES = {
    capacete: { head: (G, F, B, K) => {
      const C = F.cor, q = TEC_GRUPO[F.tec], cx = (B.x0 + B.x1) / 2 - 0.2, cz = (B.z0 + B.z1) / 2 + 0.6;
      const rx = (B.x1 - B.x0) / 2 + 0.9, ry = (B.y1 - B.y0) / 2 + 0.9, rz = (B.z1 - B.z0) / 2 + 0.7;
      const a = F.nomes.capacete;
      if (/Capuz|Turbante|Gorro/.test(a)) {
        // capuz/turbante/gorro: cobre o alto, as costas e os lados; o rosto livre
        casca(G[q], cx, 0, cz, rx, ry, rz, 0.95, TAU - 0.95, -0.55, 1.45, 10, 4, C[0]);
        casca(G[q], cx, 0, cz + rz * 0.15, rx * 1.03, ry * 1.03, rz * 0.9, -0.95, 0.95, 0.35, 1.45, 4, 2, C[0]);   // aba da testa
        if (/Gorro/.test(a)) tubo(G.pano, cx, 0, cz - rz * 0.05, cz + rz * 0.22, rx * 1.12, ry * 1.12, rx * 1.12, ry * 1.12, 12, C[2]);   // pele
        if (/Turbante/.test(a)) for (let k = 0; k < 3; k++) tubo(G.pano, cx, 0, cz + rz * (0.1 + k * 0.22), cz + rz * (0.24 + k * 0.22), rx * (1.08 - k * 0.08), ry * (1.08 - k * 0.08), rx * (1.04 - k * 0.08), ry * (1.04 - k * 0.08), 12, k % 2 ? C[1] : C[0]);
        return;
      }
      // elmos: calota, nuca, laterais até a mandíbula e a viseira sobre os olhos
      casca(G[q], cx, 0, cz, rx, ry, rz, 0.75, TAU - 0.75, -0.75, 1.5, 10, 4, C[0]);
      casca(G[q], cx, 0, cz, rx * 1.02, ry * 1.02, rz, -0.8, 0.8, 0.3, 1.5, 4, 2, C[0]);
      const ez = cz + rz * 0.12, fx = cx + rx * 0.95;
      if (F.luz) G.luz.box(fx, 0, ez, 0.5, ry * 1.25, 0.9, F.luz, 1);   // visor aceso
      else G[q].box(fx, 0, ez + 0.9, 0.7, ry * 1.4, 0.8, C[1]);
      if (q === 'metal' && !F.luz) G.metal.box(fx + 0.1, 0, ez - 1.0, 0.6, 0.9, 3.0, C[2]);   // nasal
      if (F.tier >= 5) for (let k = -2; k <= 2; k++) G[F.luz ? 'luz' : 'metal'].box(cx - 0.4 + Math.abs(k) * -0.6, k * 1.1, cz + rz * 0.98, 0.7, 0.5, 2.2 - Math.abs(k) * 0.5, F.luz && k === 0 ? F.luz : C[2], F.luz && k === 0 ? 1 : 0);   // crista / coroa
    } },
    peitoral: { torso: (G, F, B, K) => {
      const C = F.cor, q = TEC_GRUPO[F.tec], SHZ = K.SHZ || 10.6, fr = B.x1 + 0.35, tr = B.x0 - 0.35, ry = Math.max(Math.abs(B.y0), B.y1) * 0.82 + 0.4;
      const z0 = SHZ * 0.02, z1 = SHZ * 0.93, cx = (fr + tr) / 2, rx = (fr - tr) / 2;
      if (q === 'pano' || q === 'couro') {
        tubo(G[q], cx, 0, z0, z1, rx * 1.02, ry, rx * 0.96, ry * 0.92, 14, C[0]);
        tubo(G.couro, cx, 0, z0 - 0.2, z0 + 1.1, rx * 1.06, ry * 1.04, rx * 1.06, ry * 1.04, 14, C[1]);   // cinto
        G.metal.box(fr + 0.25, 0, z0 + 0.45, 0.4, 1.6, 1.0, C[2]);   // fivela
        if (q === 'couro') for (const s of [-1, 1]) G.couro.box(fr * 0.6, s * ry * 0.45, (z0 + z1) / 2, rx * 1.2, 0.5, (z1 - z0) * 0.95, C[1]);   // correias
        return;
      }
      // placas curvas, no contorno do tronco: peito em duas lâminas, costas, laterais, bordas e o colarinho
      const zm = z0 + (z1 - z0) * 0.42;
      tubo(G[q], cx, 0, zm, z1, rx * 1.06, ry * 1.04, rx * 0.98, ry * 0.92, 8, C[0], 0, -1.15, 1.15);            // peito
      tubo(G[q], cx, 0, z0, zm + 0.3, rx * 1.02, ry * 0.98, rx * 1.07, ry * 1.04, 8, C[0], 0, -1.0, 1.0);       // abdome
      tubo(G[q], cx, 0, z0 + 0.4, z1 - 0.4, rx * 1.04, ry * 1.0, rx * 1.0, ry * 0.94, 8, C[1], 0, Math.PI - 1.2, Math.PI + 1.2);   // costas
      for (const s of [-1, 1]) tubo(G[q], cx, 0, z0 + 0.8, zm + 1.2, rx * 1.02, ry * 1.02, rx * 1.0, ry * 1.0, 3, C[1], 0, s * Math.PI / 2 - 0.45, s * Math.PI / 2 + 0.45);   // laterais
      tubo(G[q], cx, 0, zm - 0.25, zm + 0.25, rx * 1.1, ry * 1.08, rx * 1.1, ry * 1.08, 8, C[2], 0, -1.15, 1.15);   // borda entre as lâminas
      tubo(G[q], cx, 0, z1 - 0.6, z1 + 0.9, rx * 0.8, ry * 0.55, rx * 0.7, ry * 0.45, 12, C[2]);
      if (F.luz) { G.luz.box(fr + 0.65, 0, z0 + (z1 - z0) * 0.62, 0.2, 0.7, (z1 - z0) * 0.45, F.luz, 1); for (const s of [-1, 1]) G.luz.box(fr + 0.62, s * ry * 0.5, z0 + (z1 - z0) * 0.5, 0.2, ry * 0.5, 0.3, F.luz, 1); }
    } },
    ombroE: { armLu: (G, F, B) => ombreira(G, F, B, -1) },
    ombroD: { armRu: (G, F, B) => ombreira(G, F, B, 1) },
    luvas: {
      armLf: (G, F, B) => braco(G, F, B, -1), armRf: (G, F, B) => braco(G, F, B, 1),
      handL: (G, F, B) => mao(G, F, B), handR: (G, F, B) => mao(G, F, B),
    },
    calcas: {
      thighL: (G, F, B) => coxa(G, F, B, -1), thighR: (G, F, B) => coxa(G, F, B, 1),
      hips: (G, F, B) => {
        const C = F.cor, q = TEC_GRUPO[F.tec], rx = Math.max(Math.abs(B.x0), B.x1) + 0.45, ry = Math.max(Math.abs(B.y0), B.y1) + 0.45;
        tubo(G[q === 'pano' ? 'couro' : q], 0, 0, B.z1 - 1.4, B.z1 + 0.2, rx, ry, rx, ry, 14, C[1]);
        if (q === 'metal' || q === 'cristal') for (const s of [-1, 0, 1]) G[q].box(rx * 0.95, s * ry * 0.55, B.z1 - 3.2, 0.7, ry * 0.5, 3.6, C[0], 0, { taperY: 0.8 });   // escarcelas
      },
    },
    botas: {
      shinL: (G, F, B) => canela(G, F, B, -1), shinR: (G, F, B) => canela(G, F, B, 1),
      footL: (G, F, B) => pe(G, F, B), footR: (G, F, B) => pe(G, F, B),
    },
    capa: { capa: (G, F, B, K) => {
      // pendurada no nó 'capaN' (nas costas, na altura dos ombros): painel que desce até os joelhos
      const C = F.cor, q = TEC_GRUPO[F.tec] === 'metal' ? 'pano' : TEC_GRUPO[F.tec] === 'cristal' ? 'pano' : TEC_GRUPO[F.tec];
      const SHY = K.SHY || 6.7, L = (K.SHZ || 10.6) + 14, w0 = SHY * 0.95, w1 = SHY * 1.35, n = 5;
      for (let i = 0; i < n; i++) {
        const u0 = i / n, u1 = (i + 1) / n, y0 = -w0 + 2 * w0 * u0, y1 = -w0 + 2 * w0 * u1, Y0 = -w1 + 2 * w1 * u0, Y1 = -w1 + 2 * w1 * u1;
        const cv = (u) => -Math.sin(u * Math.PI) * 1.2;   // curva para trás
        G[q].quad([cv(u0), y0, 0], [cv(u1), y1, 0], [cv(u1) - 1.5, Y1, -L], [cv(u0) - 1.5, Y0, -L], C[0]);
      }
      G[q].quad([0.2, -w0, 0.2], [0.2, w0, 0.2], [-0.4, w0, -1.6], [-0.4, -w0, -1.6], C[1]);   // gola
      if (F.luz) G.luz.box(-1.6, 0, -L + 0.8, 0.2, w1 * 1.7, 0.35, F.luz, 1);
      else G[q].box(-1.55, 0, -L + 0.5, 0.3, w1 * 2, 0.7, C[2]);   // barra
    } },
    acessorio: {
      torso: (G, F, B, K) => {
        const C = F.cor, SHZ = K.SHZ || 10.6, fr = B.x1 + 0.45, tr = B.x0 - 0.45, acc = F.acc;
        if (acc === 'amuleto' || acc === 'nucleo') {
          G.couro.box(fr - 0.1, 0, SHZ * 0.82, 0.25, 0.25, SHZ * 0.25, '#2a2018');
          G.metal.box(fr + 0.1, 0, SHZ * 0.66, 0.6, 1.5, 1.7, C[2]);
          G.luz.box(fr + 0.45, 0, SHZ * 0.66, 0.3, 0.9, 1.0, F.luz || '#ffd47a', 1);
          if (acc === 'nucleo') tubo(G.luz, fr + 0.45, 0, SHZ * 0.66 - 0.2, SHZ * 0.66 + 0.2, 0.3, 1.6, 0.3, 1.6, 10, F.luz, 1);
        } else if (acc === 'cachecol') {
          tubo(G.pano, (fr + tr) / 2, 0, SHZ * 0.95, SHZ * 1.15, (fr - tr) * 0.42, 2.8, (fr - tr) * 0.38, 2.4, 12, C[2]);
          G.pano.box(fr * 0.8, 1.2, SHZ * 0.7, 0.4, 1.3, SHZ * 0.4, C[2]);
        } else if (acc === 'mochila' || acc === 'braseiro') {
          G.couro.box(tr - 1.6, 0, SHZ * 0.55, 3.0, 6.0, SHZ * 0.6, acc === 'mochila' ? '#3f4652' : C[0]);
          G.metal.box(tr - 3.2, 0, SHZ * 0.55, 0.4, 4.6, SHZ * 0.45, C[2]);
          if (acc === 'braseiro') G.luz.box(tr - 3.45, 0, SHZ * 0.55, 0.2, 3.4, SHZ * 0.3, F.luz, 1);
        }
      },
      hips: (G, F, B) => {
        const acc = F.acc, C = F.cor, rx = Math.max(Math.abs(B.x0), B.x1) + 0.6, ry = Math.max(Math.abs(B.y0), B.y1) + 0.6;
        if (acc === 'cinto') { tubo(G.couro, 0, 0, B.z1 - 1.0, B.z1 + 0.3, rx, ry, rx, ry, 14, C[1]); for (const s of [-1, 1]) G.couro.box(rx * 0.6, s * ry * 0.9, B.z1 - 1.6, 2.0, 1.4, 2.0, C[0]); G.metal.box(rx + 0.1, 0, B.z1 - 0.4, 0.3, 1.4, 1.0, C[2]); }
        else if (acc === 'cantil') { G.couro.box(0, ry + 0.8, B.z1 - 2.2, 2.0, 1.6, 3.0, C[1]); G.metal.box(0, ry + 0.8, B.z1 - 0.4, 0.8, 0.8, 0.6, '#9aa4b2'); }
      },
      armLf: (G, F, B) => { if (F.acc === 'modulo') { const r = Math.max(Math.abs(B.x0), B.x1) + 0.5; G.metal.box(r * 0.3, -r * 0.2, -(B.z1 - B.z0) * 0.62, 2.6, 2.4, 2.6, F.cor[0]); G.luz.box(r * 0.3 + 1.35, -r * 0.2, -(B.z1 - B.z0) * 0.62, 0.2, 1.6, 1.6, F.luz, 1); } },
    },
  };
  function ombreira(G, F, B, s) {
    const C = F.cor, q = TEC_GRUPO[F.tec], r = Math.max(Math.abs(B.x0), B.x1, Math.abs(B.y0), B.y1) + 0.8;
    const camadas = q === 'pano' ? 1 : q === 'couro' ? 2 : 3, sd = s;
    for (let k = 0; k < camadas; k++) {
      const z = -0.6 - k * 1.7, rr = r * (1.05 - k * 0.08);
      casca(G[q], 0, sd * 0.6, z, rr * 1.1, rr, rr * 0.75, sd * Math.PI / 2 - 1.25, sd * Math.PI / 2 + 1.25, 0, 1.4, 6, 3, k ? C[1] : C[0]);
    }
    if (F.luz) G.luz.box(0, sd * (r + 0.4), -1.2, 0.5, 0.2, 1.8, F.luz, 1);
    if (F.tier >= 5) G.metal.box(0, sd * (r * 0.7), r * 0.55, 0.6, 0.6, 1.8, C[2]);   // espinho
  }
  function braco(G, F, B, s) {
    const C = F.cor, q = TEC_GRUPO[F.tec], L = B.z1 - B.z0, rx = Math.max(Math.abs(B.x0), B.x1) + 0.35, ry = Math.max(Math.abs(B.y0), B.y1) + 0.35;
    tubo(G[q], 0, 0, -L * 0.96, -L * 0.42, rx * 1.08, ry * 1.08, rx, ry, 12, C[0]);
    tubo(G[q === 'pano' ? 'couro' : q], 0, 0, -L * 0.98, -L * 0.88, rx * 1.15, ry * 1.15, rx * 1.15, ry * 1.15, 12, C[1]);
    if (q === 'metal' || q === 'cristal') G[q].box(0, s * (ry + 0.3), -L * 0.68, rx * 1.2, 0.6, L * 0.45, C[2]);
    if (F.luz) G.luz.box(rx + 0.15, 0, -L * 0.7, 0.2, 0.5, L * 0.35, F.luz, 1);
  }
  function mao(G, F, B) {
    const q = TEC_GRUPO[F.tec];
    if (q === 'pano') return;
    G[q].box((B.x0 + B.x1) / 2 + 0.2, 0, -1.6, (B.x1 - B.x0) * 0.7, (B.y1 - B.y0) * 1.05, 2.4, F.cor[1]);   // dorso da mão
  }
  function coxa(G, F, B, s) {
    const C = F.cor, q = TEC_GRUPO[F.tec], L = B.z1 - B.z0, rx = Math.max(Math.abs(B.x0), B.x1) + 0.4, ry = Math.max(Math.abs(B.y0), B.y1) + 0.4;
    tubo(G[q === 'metal' || q === 'cristal' ? 'couro' : q], 0, 0, -L * 0.92, -0.2, rx * 0.95, ry * 0.95, rx * 1.08, ry * 1.08, 12, q === 'metal' || q === 'cristal' ? C[1] : C[0]);
    if (q === 'metal' || q === 'cristal') {
      casca(G[q], 0, 0, -L * 0.42, rx * 1.2, ry * 1.2, L * 0.4, -1.2 + (s < 0 ? -0.6 : 0.6) * 0.3, 1.2 + (s < 0 ? -0.6 : 0.6) * 0.3, -1.2, 1.2, 6, 4, C[0]);   // coxote
      if (F.luz) G.luz.box(rx * 1.22, 0, -L * 0.42, 0.2, 0.4, L * 0.5, F.luz, 1);
    }
  }
  function canela(G, F, B, s) {
    const C = F.cor, q = TEC_GRUPO[F.tec], L = B.z1 - B.z0, rx = Math.max(Math.abs(B.x0), B.x1) + 0.45, ry = Math.max(Math.abs(B.y0), B.y1) + 0.45;
    tubo(G[q === 'pano' ? 'pano' : q === 'cristal' ? 'metal' : q], 0, 0, -L * 1.0, -L * 0.45, rx * 1.05, ry * 1.05, rx, ry, 12, C[0]);
    tubo(G[q === 'pano' ? 'couro' : q], 0, 0, -L * 0.5, -L * 0.42, rx * 1.12, ry * 1.12, rx * 1.12, ry * 1.12, 12, C[1]);   // borda do cano
    if (q === 'metal' || q === 'cristal') casca(G[q], 0, 0, -L * 0.62, rx * 1.15, ry * 1.1, L * 0.25, -1.1, 1.1, -1.3, 1.3, 5, 3, C[2]);   // joelheira/grevas
    if (F.luz) G.luz.box(rx * 1.16, 0, -L * 0.7, 0.2, 0.4, L * 0.3, F.luz, 1);
  }
  function pe(G, F, B) {
    const C = F.cor, q = TEC_GRUPO[F.tec], cx = (B.x0 + B.x1) / 2, w = (B.y1 - B.y0) + 0.9, l = (B.x1 - B.x0) + 0.9, h = (B.z1 - B.z0) * 0.75 + 0.6;
    G[q === 'pano' ? 'couro' : q === 'cristal' ? 'metal' : q].box(cx, 0, B.z0 + h / 2 - 0.1, l, w, h, C[0], 0, { taperX: 0.8, taperY: 0.92 });
    G.couro.box(cx + 0.2, 0, B.z0 - 0.15, l * 1.03, w * 1.02, 0.6, '#1a1612');   // sola
    if (F.luz) G.luz.box(B.x1 + 0.4, 0, B.z0 + h * 0.4, 0.2, w * 0.5, 0.3, F.luz, 1);
  }

  // ------------------------------------------------------------ montagem
  const CACHE = {};
  function geo(m, slot, osso, fam) {
    const K = m.props || {}, R = medidas(m), B = caixa(R, osso === 'capa' ? 'torso' : osso, K), F = ARS_FAMILIAS[fam];
    const key = `${slot}|${osso}|${fam}|${[B.x0, B.x1, B.y0, B.y1, B.z0, B.z1, K.SHZ, K.SHY].map((v) => (+v || 0).toFixed(1)).join(',')}`;
    if (key in CACHE) return CACHE[key];
    const G = grupos(), f = PARTES[slot] && PARTES[slot][osso];
    if (f) f(G, F, B, K);
    return (CACHE[key] = mk(G));
  }
  // Um nó-filho por osso e vaga (escondido até a peça ser vestida); a capa num nó próprio
  function install(m) {
    if (!m || m.pecas) return;
    m.pecas = [];
    const add = (pai, nome, slot, osso) => {
      const p = m.nodes[pai];
      if (!p || m.nodes[nome]) return null;
      const nd = p.add(new N3(nome));
      nd.vis = false; nd._slot = slot; nd._osso = osso;
      m.nodes[nome] = nd; m.rest[nome] = { p: nd.p.slice(), r: nd.r.slice(), s: nd.s.slice() };
      m.pecas.push(nd);
      return nd;
    };
    for (const slot in PARTES) for (const osso in PARTES[slot]) {
      if (osso === 'capa') continue;
      add(osso, `pc_${slot}_${osso}`, slot, osso);
    }
    // capa: presa nas costas, na altura dos ombros (o balanço gira este nó)
    const K = m.props || {}, R = medidas(m), T = caixa(R, 'torso', K), cap = add('torso', 'pc_capa', 'capa', 'capa');
    if (cap) { cap.p = [T.x0 - 0.6, 0, (K.SHZ || 10.6) * 0.93]; m.rest.pc_capa.p = cap.p.slice(); }
  }
  // Peças deste herói agora: a prévia da tela de equipamento ou o que ele veste no mundo aberto
  function pecasDe(e, charId) {
    if (e && e.pecasPrevia) return e.pecasPrevia;
    if (!game.world || typeof Arsenal === 'undefined' || !World.state) return null;
    return Arsenal.vestidos(charId);
  }
  function pose(m, e, charId) {
    if (!m || !m.pecas) return;
    const V = pecasDe(e, charId), esp = typeof SPECIAL_ARMOR_DEFS !== 'undefined' && typeof RosterManager !== 'undefined' && SPECIAL_ARMOR_DEFS[RosterManager.equippedArmor(charId)];
    const oc = V && typeof Arsenal !== 'undefined' && World.state ? Arsenal.S.ocultar : {}, tx = !!m.tex;
    for (const nd of m.pecas) {
      const it = V && !esp && !oc[nd._slot] ? V[nd._slot] : null;
      if (!it) { nd.vis = false; continue; }
      const G = geo(m, nd._slot, nd._osso, it.fam);
      if (!G) { nd.vis = false; continue; }
      nd.geo = tx ? G.tex : G.raw; nd.vis = true;
      nd.emi = 0.8 + 0.12 * (it.r || 0);
    }
    // capa: vai para trás com a velocidade, balança com o passo e com o vento do clima
    const cap = m.nodes.pc_capa;
    if (cap && cap.vis && e) {
      const v = Math.min(1, (+e.moveSpeed || 0) / 300), t = +e.animTime || 0, vento = typeof Clima !== 'undefined' && game.world ? Clima.vento() : 0;
      cap.r[1] = 0.08 + 0.55 * v + 0.12 * vento + Math.sin(t * (4 + 6 * v)) * (0.03 + 0.05 * v + 0.05 * vento);   // > 0: a barra vai para trás
      cap.r[0] = Math.sin(t * 1.3) * 0.04 * (1 + vento);
    }
  }
  return { install, pose, medidas, caixa };
})();
