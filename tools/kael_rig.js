// Exporta o esqueleto do Kael (js/models/kael.js) na pose de repouso, em JSON:
// matriz de mundo de cada nó e as pontas dos ossos. Usado por tools/gerar_kael3d.py.
// Uso: node tools/kael_rig.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = path.join(__dirname, '..');
const ctx = { console, Math, Float32Array, Array, Object, Number, String, JSON, Set, Map, WeakMap, isFinite, parseInt };
ctx.window = ctx; ctx.Player = function () { this.facing = 0; this.state = 'idle'; this.attack = null; this.ghosts = []; };
vm.createContext(ctx);
for (const f of ['js/engine3d.js', 'js/models/kael.js']) vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8') + '\n;this.MODELS3D = MODELS3D; this.M3 = M3;', ctx, { filename: f });
const { MODELS3D, M3 } = ctx;
const m = MODELS3D.kael.build();
MODELS3D.kael.pose(m, null);
const out = { nodes: {} };
(function walk(nd, parent, depth) {
  const w = M3.mul(M3.make(), parent, M3.trs(M3.make(), nd.p, nd.r, nd.s));
  out.nodes[nd.name] = { parent: depth ? null : null, w: Array.from(w), geo: nd.geo ? nd.geo.length / 10 : 0, kids: nd.kids.map((k) => k.name) };
  for (const k of nd.kids) walk(k, w, depth + 1);
})(m.root, M3.make(), 0);
// Altura do modelo (sem a espada) na pose de repouso
let zmin = 1e9, zmax = -1e9;
for (const name in out.nodes) {
  if (['blade', 'hilt', 'sword'].includes(name)) continue;
  const nd = m.nodes[name]; if (!nd.geo) continue;
  const w = out.nodes[name].w, g = nd.geo;
  for (let i = 0; i < g.length; i += 10) { const z = w[8] * g[i] + w[9] * g[i + 1] + w[10] * g[i + 2] + w[11]; if (z < zmin) zmin = z; if (z > zmax) zmax = z; }
}
out.zmin = zmin; out.zmax = zmax;
process.stdout.write(JSON.stringify(out));
