'use strict';
// ECLIPSE ZERO · Kael desenhado com a arte oficial (sprites 2.5D recortados da folha de sprites)
// ---------------------------------------------------------------------------
// KaelArt: carrega o atlas de js/assets/kael_sprites.js, escolhe o quadro de cada
// estado do jogador (parado nas 4 vistas, caminhada, corrida, golpes, dano, morte,
// Eclipse) e desenha com o pé no ponto do mundo. As partes luminosas (lâmina,
// rastros, marca Ø) vêm da metade de baixo do atlas e são somadas à cena depois
// da escuridão. VÍDEO → "Visual do Kael" troca entre estes sprites e o modelo 3D
// texturizado (padrão); sem WebGL (ou com o 3D desligado na tecla G) os sprites são usados.
// ---------------------------------------------------------------------------
const KAEL_ART_H = 64;            // altura do corpo em unidades do mundo (a mesma do modelo 3D)
const KAEL_WALK_FPS = 9, KAEL_RUN_FPS = 12;

const KaelArt = {
  img: null, ok: false, white: null, ghost: null,
  sel: { anim: 'front', i: 0, flip: false },
  tmp: { x: 0, y: 0 },

  init() {
    if (this.img || typeof KAEL_SPRITES === 'undefined') return;
    const im = new Image();
    im.onload = () => {
      this.white = this.tinted('#ffffff');
      this.ghost = this.tinted('#2f7dff');
      this.ok = true;
    };
    im.src = KAEL_SPRITES.src;
    this.img = im;
  },
  // Cópia da metade de cor pintada de uma cor sólida (clarão do dano e fantasmas da esquiva)
  tinted(color) {
    const c = document.createElement('canvas');
    c.width = this.img.naturalWidth; c.height = KAEL_SPRITES.emiY;
    const g = c.getContext('2d');
    g.drawImage(this.img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  },
  // Os sprites estão em uso? (escolhidos nas configurações, ou sem 3D disponível/ligado)
  active() { return this.ok && (Settings.v.kaelLook === 'art' || !R3D.active); },
  get scale() { return KAEL_ART_H / KAEL_SPRITES.refH; },

  // Quadro do estado atual: animação, índice e se espelha (a arte olha para a direita)
  pick(p) {
    const s = this.sel, A = KAEL_SPRITES.anims;
    const dirX = (ang) => worldAngleToScreen(ang, this.tmp).x;
    const n = (a) => A[a].length;
    let flip = dirX(p.facing) < 0;
    let anim = 'run', i = 0;
    switch (p.state) {
      case 'run': {
        const sp = p.moveSpeed || 0;
        if (sp < 25) { anim = null; break; }
        const walk = sp < p.baseSpeed * 0.55;
        anim = walk ? 'walk' : 'run';
        i = Math.floor(p.animTime * (walk ? KAEL_WALK_FPS : KAEL_RUN_FPS)) % n(anim);
        flip = dirX(Math.atan2(p.vy, p.vx)) < 0;
        break;
      }
      case 'attack': {
        const a = p.attack, d = a && a.def;
        if (!d) { anim = 'light'; break; }
        anim = d.light ? 'light' : 'heavy';
        const total = d.windup + d.active + d.recovery;
        i = Math.min(n(anim) - 1, Math.floor(clamp(a.t / total, 0, 0.999) * n(anim)));
        flip = dirX(a.dir) < 0;
        break;
      }
      case 'charge': anim = 'heavy'; i = 0; break;
      case 'dash': anim = 'run'; i = 2; flip = dirX(Math.atan2(p.dashDirY, p.dashDirX)) < 0; break;
      case 'hurt': anim = 'hurt'; i = Math.min(n('hurt') - 1, Math.floor(p.stateTime / 0.07)); break;
      case 'dead': anim = 'death'; i = Math.min(n('death') - 1, Math.floor(p.stateTime / 0.16)); break;
      case 'special':
        if (p.stateTime < 0.5) { anim = 'jump'; i = Math.min(n('jump') - 1, Math.floor(p.stateTime / 0.1)); }
        else { anim = 'heavy'; i = Math.min(n('heavy') - 1, 3 + Math.floor((p.stateTime - 0.5) / 0.12)); }
        break;
      default: anim = null;
    }
    if (!anim) {
      // Parado: uma das 4 vistas, de acordo com para onde Kael olha na tela
      const f = worldAngleToScreen(p.facing, this.tmp);
      anim = Math.abs(f.y) > Math.abs(f.x) * 1.15 ? (f.y > 0 ? 'front' : 'back') : (f.x >= 0 ? 'right' : 'left');
      i = 0; flip = false;
    }
    s.anim = anim; s.i = i; s.flip = flip;
    return s;
  },

  // Desenha o quadro com o pé em (sx, sy). layer: 'color' | 'emi' | 'white' | 'ghost'
  drawFrame(ctx, sel, sx, sy, layer = 'color', alpha = 1, breathe = 0) {
    const f = KAEL_SPRITES.anims[sel.anim][sel.i];
    if (!f) return;
    const k = this.scale, [fx, fy, fw, fh, ax, ay] = f;
    const src = layer === 'white' ? this.white : layer === 'ghost' ? this.ghost : this.img;
    const oy = layer === 'emi' ? KAEL_SPRITES.emiY : 0;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (layer === 'emi' || layer === 'ghost') ctx.globalCompositeOperation = 'lighter';
    ctx.translate(sx, sy);
    ctx.scale(sel.flip ? -k : k, k * (1 + breathe));
    ctx.drawImage(src, fx, fy + oy, fw, fh, -ax, -ay, fw, fh);
    ctx.restore();
  },

  // Jogador completo: fantasmas da esquiva, corpo e clarão do dano
  drawPlayer(ctx, p, sx, sy) {
    const gs = { anim: 'run', i: 2, flip: false };
    for (const g of p.ghosts) {
      if (g.life <= 0) continue;
      gs.flip = worldAngleToScreen(g.f, this.tmp).x < 0;
      this.drawFrame(ctx, gs, isoX(g.x, g.y), isoY(g.x, g.y), 'ghost', (g.life / 0.22) * 0.32);
    }
    const sel = this.pick(p);
    const breathe = sel.anim === 'front' || sel.anim === 'back' || sel.anim === 'left' || sel.anim === 'right' ? Math.sin(p.animTime * 2.2) * 0.008 : 0;
    const a = p.blinking() ? 0.55 : 1;
    this.drawFrame(ctx, sel, sx, sy, 'color', a, breathe);
    if (p.flash > 0) this.drawFrame(ctx, sel, sx, sy, 'white', Math.min(1, p.flash * 5) * 0.5, breathe);
  },
  // Partes luminosas (depois da escuridão do cenário)
  drawEmissive(ctx, p, sx, sy) {
    const sel = this.pick(p);
    const pulse = 0.85 + 0.15 * Math.sin(p.animTime * 5) + (p.state === 'attack' || p.state === 'special' ? 0.35 : 0);
    this.drawFrame(ctx, sel, sx, sy, 'emi', (p.blinking() ? 0.55 : 1) * Math.min(1.4, pulse));
  },
};

// Arte de corpo inteiro e rosto da ficha (seleção de personagem), de js/assets/kael_arte.js
const KAEL_PORTRAIT = { body: null, face: null };
function loadKaelPortraits() {
  if (typeof KAEL_ARTE === 'undefined' || KAEL_PORTRAIT.body) return;
  for (const k of ['body', 'face']) { const im = new Image(); im.src = KAEL_ARTE[k]; KAEL_PORTRAIT[k] = im; }
}
function kaelPortraitReady(k) { const im = KAEL_PORTRAIT[k]; return !!(im && im.complete && im.naturalWidth); }
