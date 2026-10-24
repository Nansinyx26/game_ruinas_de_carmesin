'use strict';
// ECLIPSE ZERO · Confere as botas dos modelos 3D importados (tools/importar_modelo.py)
// ---------------------------------------------------------------------------
// Mede, em cada modelo, a quais ossos estão presos os vértices da bota (abaixo do meio da canela
// e perto do eixo da perna). Presos à aba ou à barra do casaco, eles balançam com o pano e a
// bota vira uma cunha no chão ao andar. Acima de 15% numa malha, o modelo é listado como
// suspeito (confira no inspetor 3D: a borda da frente do casaco em cima da canela também conta).
// Uso (na pasta do projeto): node tools/conferir_botas.js
// ---------------------------------------------------------------------------
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = path.join(__dirname, '..', 'js', 'assets') + '/';
const arquivos = ['kael3d.js', 'lyra3d.js', 'sera3d.js', 'orion3d.js', 'drakos3d.js', ...fs.readdirSync(raiz + 'armaduras').sort().map((f) => 'armaduras/' + f)];
const bytes = (b64) => new Uint8Array(Buffer.from(b64, 'base64'));
const suspeitos = [];
for (const f of arquivos) {
  const ctx = { ArmorModels: { loaded() {} } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(raiz + f, 'utf8').replace(/const KAEL3D/, 'var KAEL3D'), ctx);
  const D = ctx.KAEL3D || (ctx.HERO3D && Object.values(ctx.HERO3D)[0]) || (ctx.ARMOR3D && Object.values(ctx.ARMOR3D)[0]);
  if (!D || !D.skins) { console.log(`${f.padEnd(24)} sem malha com pele (formato antigo)`); continue; }
  const q = 1 / D.q, vs = [];
  let zmax = 0;
  for (const S of D.skins) {
    const A = new DataView(bytes(S.a).buffer), Wb = bytes(S.w), nv = A.byteLength / 16;
    for (let v = 0; v < nv; v++) {
      const p = [0, 1, 2].map((j) => A.getInt16(v * 16 + j * 2, true) * q);
      zmax = Math.max(zmax, p[2]);
      const ws = [];
      for (let j = 0; j < 4; j++) ws.push([S.ossos[Wb[v * 8 + j]], Wb[v * 8 + 4 + j] / 255]);
      vs.push([p, ws]);
    }
  }
  const H = zmax, perna = (o) => /^(shin|foot|toe|thigh)/.test(o);
  // eixo de cada perna perto do tornozelo: média dos vértices presos ao pé
  const eixo = {};
  for (const lado of ['R', 'L']) {
    let sx = 0, sy = 0, n = 0;
    for (const [p, ws] of vs) if (p[2] < 0.12 * H && ws.some(([o, w]) => o === 'foot' + lado && w > 0.6)) { sx += p[0]; sy += p[1]; n++; }
    eixo[lado] = n ? [sx / n, sy / n] : null;
  }
  const outros = {};
  let bota = 0, solta = 0;
  for (const [p, ws] of vs) {
    if (p[2] > 0.17 * H) continue;
    const perto = ['R', 'L'].some((l) => eixo[l] && Math.hypot(p[0] - eixo[l][0], p[1] - eixo[l][1]) < 0.06 * H);
    if (!perto) continue;
    bota++;
    let c = 0;
    for (const [o, w] of ws) if (!perna(o) && w > 0) { c += w; outros[o] = (outros[o] || 0) + w; }
    if (c > 0.5) solta++;
  }
  if (solta / Math.max(bota, 1) > 0.15) suspeitos.push(f);
  const quais = Object.entries(outros).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([o, w]) => `${o}:${w.toFixed(0)}`).join(' ');
  console.log(`${f.padEnd(24)} bota ${String(bota).padStart(5)} vért. · presos fora da perna: ${String(solta).padStart(4)} (${(100 * solta / Math.max(bota, 1)).toFixed(1)}%) ${quais}`);
}
console.log(suspeitos.length ? `SUSPEITOS: ${suspeitos.join(', ')}` : 'Botas presas às pernas em todos os modelos.');
process.exitCode = suspeitos.length ? 1 : 0;
