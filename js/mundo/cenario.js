'use strict';
// ECLIPSE ZERO · Cenário 3D das cidades, modelado no Blender (Cenario)
// ---------------------------------------------------------------------------
// Os objetos vêm de js/assets/props3d.js (PROPS3D): cada um é um script do Blender
// (tools/blender/asset_*.py → assets/models/cenario/<id>.glb, com texturas assadas: cor com
// oclusão, metal/aspereza, normais e emissão) convertido por tools/importar_prop.py para o
// formato do motor (posição, normal e UV, e as texturas embutidas). Aqui cada objeto vira um modelo do motor
// (MODELS3D['cen_<id>']) e é posto nas zonas das cidades: na vista isométrica ele é um sprite do
// motor 3D como os moradores (Game: n.spr = queue3(n.key)), na 3ª pessoa entra pela mesma fila
// das estações da cidade (ThirdView.queueProp → modelo3D). Cada um tem um colisor redondo na base
// (um "pilar" marcado cenario, que não é desenhado): o herói e os inimigos desviam e a linha de
// visão considera. Sem o motor 3D (gráficos 2D), um desenho simples no lugar.
// ---------------------------------------------------------------------------
const Cenario = (function () {
  const OK = typeof PROPS3D !== 'undefined';
  const EMI = 1.2, EMI_TEX = 0.75;   // ganho da emissão (cor por canto; mapa assado, que já vem cheio)
  // Onde fica cada objeto: [id, x, y (fração da sala), giro (rad), escala]
  const ZONAS = {
    // Metrópole Tecnológica: torres de vidro nas bordas, postes e quiosques na praça
    metro_centro: [['torre_neon', 0.1, 0.12, 0, 1], ['torre_neon', 0.9, 0.12, 1.57, 0.9], ['torre_neon', 0.1, 0.9, 3.14, 1.1], ['poste_holo', 0.3, 0.3, 0, 1], ['poste_holo', 0.7, 0.3, 0, 1],
      ['poste_holo', 0.3, 0.72, 0, 1], ['poste_holo', 0.7, 0.72, 0, 1], ['quiosque_neon', 0.86, 0.82, -0.8, 1], ['barreira_neon', 0.5, 0.92, 0, 1]],
    metro_porto: [['torre_neon', 0.12, 0.15, 0.3, 1], ['torre_neon', 0.88, 0.85, 2, 1.1], ['poste_holo', 0.4, 0.6, 0, 1], ['barreira_neon', 0.6, 0.35, 1.57, 1], ['quiosque_neon', 0.2, 0.8, 0.5, 1]],
    metro_torres: [['torre_neon', 0.15, 0.15, 0, 1.2], ['torre_neon', 0.85, 0.15, 1, 1.15], ['torre_neon', 0.15, 0.85, 2, 1.1], ['torre_neon', 0.85, 0.85, 3, 1.25], ['poste_holo', 0.5, 0.25, 0, 1]],
    metro_trilhos: [['barreira_neon', 0.3, 0.5, 0, 1], ['barreira_neon', 0.7, 0.5, 0, 1], ['poste_holo', 0.5, 0.15, 0, 1], ['torre_neon', 0.9, 0.9, 0.4, 1]],
    metro_mercado: [['quiosque_neon', 0.3, 0.3, 0.4, 1], ['quiosque_neon', 0.7, 0.3, -0.4, 1], ['quiosque_neon', 0.3, 0.62, 2.7, 1], ['poste_holo', 0.5, 0.45, 0, 1]],
    // Cidade das Ruínas Carmesins: arcos partidos, colunas e a estátua do rei na cidadela
    rc_cidadela: [['estatua_rei', 0.5, 0.18, 0, 1.1], ['arco_partido', 0.12, 0.5, 1.57, 1], ['arco_partido', 0.88, 0.5, -1.57, 1], ['braseiro_rubro', 0.32, 0.3, 0, 1], ['braseiro_rubro', 0.68, 0.3, 0, 1],
      ['braseiro_rubro', 0.32, 0.74, 0, 1], ['braseiro_rubro', 0.68, 0.74, 0, 1], ['coluna_rachada', 0.12, 0.12, 0.3, 1], ['coluna_rachada', 0.88, 0.88, 1.2, 1]],
    rc_portao: [['arco_partido', 0.5, 0.12, 0, 1.2], ['coluna_rachada', 0.2, 0.3, 0.5, 1], ['coluna_rachada', 0.8, 0.3, 2, 1], ['braseiro_rubro', 0.35, 0.8, 0, 1]],
    rc_mercado: [['coluna_rachada', 0.15, 0.15, 0, 1], ['coluna_rachada', 0.85, 0.2, 1, 0.9], ['braseiro_rubro', 0.5, 0.5, 0, 1], ['arco_partido', 0.5, 0.88, 0, 1]],
    rc_jardins: [['estatua_rei', 0.5, 0.12, 3.14, 0.9], ['coluna_rachada', 0.2, 0.5, 0.2, 1], ['coluna_rachada', 0.8, 0.5, 2.2, 1], ['braseiro_rubro', 0.5, 0.75, 0, 1]],
    rc_trono: [['coluna_rachada', 0.2, 0.2, 0, 1.2], ['coluna_rachada', 0.8, 0.2, 0, 1.2], ['coluna_rachada', 0.2, 0.8, 0, 1.2], ['coluna_rachada', 0.8, 0.8, 0, 1.2], ['braseiro_rubro', 0.5, 0.12, 0, 1.2]],
    // Floresta de Velmora (kit medieval e natural, tools/blender/natureza.py): a vila de estrada da
    // clareira (carroça, feno, poço, cerca e placa) e o que sobrou pelas trilhas
    velmora_clareira: [['carroca', 0.26, 0.3, 0.5, 1], ['fardo_feno', 0.16, 0.38, 0.2, 1], ['fardo_feno', 0.2, 0.22, 1.4, 0.9], ['poco', 0.72, 0.28, 0, 1],
      ['placa_estrada', 0.6, 0.76, 0.8, 1], ['cerca', 0.22, 0.72, 0, 1], ['cerca', 0.33, 0.72, 0, 1], ['cerca', 0.78, 0.66, 1.57, 1], ['tronco_caido', 0.82, 0.82, 0.6, 1]],
    velmora_trilha: [['placa_estrada', 0.42, 0.2, 2.2, 1], ['tronco_caido', 0.7, 0.35, 1.1, 1.1], ['cerca', 0.25, 0.8, 0.4, 1], ['fardo_feno', 0.78, 0.78, 0.3, 0.9]],
    velmora_ruinas: [['tronco_caido', 0.3, 0.7, 2.4, 1], ['carroca', 0.75, 0.25, 2.6, 0.95], ['placa_estrada', 0.2, 0.25, 0.5, 1]],
    velmora_raizes: [['tronco_caido', 0.25, 0.3, 0.9, 1.2], ['tronco_caido', 0.75, 0.7, 2.0, 1.1]],
    velmora_lago: [['poco', 0.2, 0.75, 0, 1], ['cerca', 0.7, 0.2, 0.3, 1], ['cerca', 0.81, 0.2, 0.3, 1]],
    // Nexus Zero: monólitos de dados, servidores, anéis e cristais de código
    nz_santuario: [['anel_dados', 0.5, 0.15, 0, 1.1], ['monolito_dados', 0.12, 0.15, 0.4, 1], ['monolito_dados', 0.88, 0.15, -0.4, 1], ['cristal_codigo', 0.2, 0.82, 0, 1], ['cristal_codigo', 0.8, 0.82, 1, 1],
      ['rack_servidor', 0.1, 0.5, 1.57, 1], ['rack_servidor', 0.9, 0.5, -1.57, 1]],
    nz_borda: [['monolito_dados', 0.2, 0.2, 0, 1.1], ['cristal_codigo', 0.8, 0.3, 0.5, 1.2], ['anel_dados', 0.5, 0.85, 3.14, 1]],
    nz_arquivo: [['rack_servidor', 0.15, 0.3, 1.57, 1], ['rack_servidor', 0.15, 0.6, 1.57, 1], ['rack_servidor', 0.85, 0.3, -1.57, 1], ['rack_servidor', 0.85, 0.6, -1.57, 1], ['monolito_dados', 0.5, 0.15, 0, 1]],
    nz_servidores: [['rack_servidor', 0.3, 0.25, 0, 1], ['rack_servidor', 0.5, 0.25, 0, 1], ['rack_servidor', 0.7, 0.25, 0, 1], ['rack_servidor', 0.3, 0.7, 3.14, 1], ['rack_servidor', 0.7, 0.7, 3.14, 1]],
    nz_nucleo: [['monolito_dados', 0.15, 0.15, 0.8, 1.3], ['monolito_dados', 0.85, 0.15, -0.8, 1.3], ['cristal_codigo', 0.15, 0.85, 0, 1.3], ['cristal_codigo', 0.85, 0.85, 0, 1.3]],
  };

  // ------------------------------------------------------------ malhas
  // Com texturas (W.uv): 14 bytes por canto (posição, normal, UV) e as texturas assadas no Blender
  // (W.tc cor, W.tm material: R metal, G aspereza, B emissão; W.tn normais), desenhadas pelo
  // programa com textura do motor (como os heróis). Sem elas: a cor por canto no lugar da UV (como as armas).
  const GEO = {};
  function geo(id) {
    if (GEO[id]) return GEO[id];
    const W = PROPS3D[id], s = atob(W.a), T = !!W.uv, P = 14, n = s.length / P, raw = new Float32Array(n * 10), u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    const D = new DataView(u.buffer), q = 1 / W.q;
    for (let v = 0; v < n; v++) {
      const k = v * P, o = v * 10;
      raw[o] = D.getInt16(k, true) * q; raw[o + 1] = D.getInt16(k + 2, true) * q; raw[o + 2] = D.getInt16(k + 4, true) * q;
      raw[o + 3] = D.getInt8(k + 6) / 127; raw[o + 4] = D.getInt8(k + 7) / 127; raw[o + 5] = D.getInt8(k + 8) / 127;
      if (T) {
        raw[o + 6] = D.getUint16(k + 10, true) / 65535; raw[o + 7] = D.getUint16(k + 12, true) / 65535; raw[o + 8] = 0; raw[o + 9] = EMI_TEX;
      } else {
        raw[o + 6] = D.getUint8(k + 9) / 255; raw[o + 7] = D.getUint8(k + 10) / 255; raw[o + 8] = D.getUint8(k + 11) / 255;
        raw[o + 9] = D.getUint8(k + 13) / 255 * EMI;
      }
    }
    return (GEO[id] = raw);
  }
  // Um modelo do motor por objeto (a geometria e as texturas são compartilhadas)
  const TEX = {};
  if (OK) {
    for (const id in PROPS3D) {
      MODELS3D['cen_' + id] = {
        build() {
          const W = PROPS3D[id], nd = new N3('cen_' + id);
          nd.geo = geo(id);
          const m = new Model3(nd);
          if (W.uv) m.tex = TEX[id] || (TEX[id] = { src: W.tc, mat: W.tm, nrm: W.tn, pbr: true, bump: 0, emiB: true, glow: null });
          return m;
        },
        opts(e) { return e && e.escalaCen ? { scale: e.escalaCen } : null; },
      };
    }
  }

  // ------------------------------------------------------------ o objeto na zona
  class Objeto extends NPC {
    constructor(id, x, y, giro, escala) {
      super({ model: null, name: '', lines: ['…'] }, x, y);
      const W = PROPS3D[id];
      this.cenId = id; this.key = 'cen_' + id; this.facing = this.viewFacing = giro; this.escalaCen = escala;
      this.radius = W.r * escala; this.height = W.h * escala;
      this.lightRgb = W.glow || null; this.t = rand(0, 10);
      this.name = '';
    }
    canTalk() { return false; }
    update(dt) { this.t += dt; }
    drawShadow(ctx) {
      const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(sx, sy, this.radius * 1.2, this.radius * 0.6, 0, 0, TAU); ctx.fill();
    }
    draw(ctx) {
      const sx = isoX(this.x, this.y), sy = isoY(this.x, this.y);
      if (game.use3D && this.spr && this.spr.ok) { R3D.blit(ctx, this.spr, sx, sy); return; }
      // sem o motor 3D: um bloco com a cor do brilho
      ctx.fillStyle = 'rgba(40,40,56,0.95)'; ctx.fillRect(sx - this.radius * 0.7, sy - this.height, this.radius * 1.4, this.height);
      if (this.lightRgb) { ctx.fillStyle = rgba(this.lightRgb, 0.8); ctx.fillRect(sx - 2, sy - this.height * 0.9, 4, this.height * 0.7); }
    }
    drawEmissive(ctx) {
      if (!game.use3D || !this.spr || !this.spr.ok) return;
      R3D.blitEmissive(ctx, this.spr, isoX(this.x, this.y), isoY(this.x, this.y), 1);
      if (this.lightRgb) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; GlowCache.draw(ctx, this.lightRgb, isoX(this.x, this.y), isoY(this.x, this.y) - this.height * 0.6, this.radius * 1.6, 0.18 + 0.05 * Math.sin(this.t * 2)); ctx.restore(); }
    }
    headPoint() { return { x: isoX(this.x, this.y), y: isoY(this.x, this.y) - this.height }; }
    // 3ª pessoa (ThirdView.queueProp): o mesmo modelo, com o giro do objeto
    modelo3D() { return game.model3(this.key); }
  }

  // Põe os objetos da zona que carregou (longe das passagens, do portal e dos moradores) e o
  // colisor de cada um
  function aoCarregar(z) {
    const L = ZONAS[z.id];
    if (!OK || !L) return 0;
    const g = game, R = g.room;
    let n = 0;
    for (const [id, fx, fy, giro, esc] of L) {
      if (!PROPS3D[id]) continue;
      const W = PROPS3D[id], r = W.r * esc;
      // o lugar pedido ou o mais perto livre em volta (passagens, portal, moradores, baús, obstáculos)
      const livre = (x, y) => R.canStand(x, y, r) && !g.npcs.some((q) => dist(q.x, q.y, x, y) < r + 70);
      let x = R.w * fx, y = R.h * fy;
      if (!livre(x, y)) {
        let achou = false;
        for (let d = 50; d <= 200 && !achou; d += 50) for (let k = 0; k < 8 && !achou; k++) { const a = k * Math.PI / 4, nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d; if (livre(nx, ny)) { x = nx; y = ny; achou = true; } }
        if (!achou) continue;
      }
      const o = new Objeto(id, x, y, giro, esc);
      g.npcs.push(o);
      R.pillars.push({ x, y, r: r * 0.85, h: W.h * esc, cenario: true, sprite: null });
      for (let i = R.pillars.length - 1; i >= 0; i--) { const q = R.pillars[i]; if (q.enfeite && dist(q.x, q.y, x, y) < r + 24) R.pillars.splice(i, 1); }   // sem enfeite do chão por baixo
      n++;
    }
    return n;
  }

  return { OK, ZONAS, aoCarregar, geo, Objeto };
})();
